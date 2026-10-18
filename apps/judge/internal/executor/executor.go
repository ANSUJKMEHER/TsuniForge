package executor

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/tsuniforge/judge/internal/config"
	"github.com/tsuniforge/judge/internal/models"
)

var validIDRegex = regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)

// IsValidID checks if an ID contains only alphanumeric characters, underscores, and dashes.
func IsValidID(id string) bool {
	return validIDRegex.MatchString(id)
}

// ClassifyError determines the appropriate verdict based on execution error and stderr.
func ClassifyError(err error, stderr string) string {
	if err == nil {
		return ""
	}
	if exitErr, ok := err.(*exec.ExitError); ok {
		if exitErr.ExitCode() == 137 {
			return "MLE"
		}
	}
	if strings.Contains(stderr, "OOM") || err.Error() == "signal: killed" {
		return "MLE"
	}
	return "RE"
}

// Executor manages the execution of submissions in Docker sandboxes
type Executor struct {
	cfg *config.Config
}

// New creates a new Executor
func New(cfg *config.Config) (*Executor, error) {
	return &Executor{
		cfg: cfg,
	}, nil
}

// Execute runs a submission against all test cases
func (e *Executor) Execute(ctx context.Context, job models.SubmissionJob) (*models.JudgeResult, error) {
	// Validate SubmissionID with strict alphanumeric/underscore/dash regex
	if !validIDRegex.MatchString(job.SubmissionID) {
		return nil, fmt.Errorf("invalid submission ID: %s", job.SubmissionID)
	}

	// Validate all test case IDs upfront
	for _, tc := range job.TestCases {
		if !validIDRegex.MatchString(tc.ID) {
			return nil, fmt.Errorf("invalid test case ID: %s", tc.ID)
		}
	}

	langConfig, exists := e.cfg.Languages[job.Language]
	if !exists {
		return nil, fmt.Errorf("unsupported language: %s", job.Language)
	}

	result := &models.JudgeResult{
		SubmissionID:   job.SubmissionID,
		TotalTestCases: len(job.TestCases),
		JudgedAt:       time.Now(),
	}

	// Guaranteed workspace setup and cleanup
	baseDir := e.cfg.BaseWorkDir
	if baseDir == "" {
		baseDir = filepath.Join(os.TempDir(), "tsuniforge")
	}
	workDir := filepath.Join(baseDir, job.SubmissionID)
	if err := os.MkdirAll(workDir, 0777); err != nil {
		return nil, fmt.Errorf("failed to create work dir: %w", err)
	}
	_ = os.Chmod(workDir, 0777)
	defer func() {
		if err := os.RemoveAll(workDir); err != nil {
			log.Printf("warning: failed to clean up work dir %s: %v", workDir, err)
		}
	}()

	// Write source code to workspace BEFORE checking CompileCmd.
	// For Java: name file "Solution.java" (capital 'S') matching javac -d /tmp /tmp/Solution.java.
	// For interpreted languages (Python): ensures solution.py is written on disk before execution.
	sourceFileName := "solution" + langConfig.Extension
	if job.Language == "java" {
		sourceFileName = "Solution.java"
	}
	sourceFile := filepath.Join(workDir, sourceFileName)
	if err := os.WriteFile(sourceFile, []byte(job.SourceCode), 0666); err != nil {
		return nil, fmt.Errorf("failed to write source code: %w", err)
	}

	// Step 1: Compile (if needed)
	if langConfig.CompileCmd != "" {
		compileOutput, err := e.compile(ctx, job, langConfig, workDir)
		if err != nil {
			result.Verdict = "CE"
			result.CompilerOutput = compileOutput
			return result, nil
		}
		result.CompilerOutput = compileOutput
	}

	// Step 2: Run against each test case
	var maxRuntime int
	var maxMemory int
	allPassed := true

	for _, tc := range job.TestCases {
		select {
		case <-ctx.Done():
			result.Verdict = "RE"
			result.Error = "Judging cancelled"
			return result, nil
		default:
		}

		tcResult := e.runTestCase(ctx, job, langConfig, tc, workDir)
		result.Details = append(result.Details, tcResult)

		if tcResult.RuntimeMs > maxRuntime {
			maxRuntime = tcResult.RuntimeMs
		}
		if tcResult.MemoryKb > maxMemory {
			maxMemory = tcResult.MemoryKb
		}

		if tcResult.Verdict == "AC" {
			result.TestCasesPassed++
			result.TotalScore += tc.ScoreWeight
		} else {
			allPassed = false
			// Set overall verdict to first non-AC verdict
			if result.Verdict == "" || result.Verdict == "AC" {
				result.Verdict = tcResult.Verdict
			}
		}
	}

	result.RuntimeMs = maxRuntime
	result.MemoryKb = maxMemory

	if allPassed {
		result.Verdict = "AC"
	}

	return result, nil
}

// BuildCompileArgs constructs the docker run arguments for compilation.
func (e *Executor) BuildCompileArgs(workDir, containerName string, langConfig config.LanguageConfig) []string {
	compilePids := e.cfg.CompilePids
	if compilePids <= 0 {
		compilePids = 128
	}

	args := []string{
		"run", "--rm",
		"--name", containerName,
		"-v", fmt.Sprintf("%s:/tmp:rw", workDir),
		"--network", "none",
		"--memory", "512m",
		"--cpus", "1.0",
		"--pids-limit", fmt.Sprintf("%d", compilePids),
		"--security-opt", "no-new-privileges",
	}

	if e.cfg.SeccompProfile != "" {
		args = append(args, "--security-opt", fmt.Sprintf("seccomp=%s", e.cfg.SeccompProfile))
	}

	args = append(args, langConfig.Image, "sh", "-c", langConfig.CompileCmd)
	return args
}

// compile compiles the source code in a Docker container
func (e *Executor) compile(ctx context.Context, job models.SubmissionJob, langConfig config.LanguageConfig, workDir string) (string, error) {
	log.Printf("Compiling submission %s with %s", job.SubmissionID, langConfig.Name)

	// Fallback: ensure source file exists if compile is called in isolation
	sourceFileName := "solution" + langConfig.Extension
	if job.Language == "java" {
		sourceFileName = "Solution.java"
	}
	sourceFile := filepath.Join(workDir, sourceFileName)
	if _, err := os.Stat(sourceFile); os.IsNotExist(err) && job.SourceCode != "" {
		if err := os.WriteFile(sourceFile, []byte(job.SourceCode), 0666); err != nil {
			return "", fmt.Errorf("failed to write source code: %w", err)
		}
	}

	// Run compilation inside Docker
	containerName := fmt.Sprintf("compile-%s", job.SubmissionID)

	// Ensure compile container is cleaned up on completion or cancellation
	defer func() {
		_ = exec.Command("docker", "rm", "-f", containerName).Run()
	}()

	args := e.BuildCompileArgs(workDir, containerName, langConfig)

	// Enforce 10s compilation timeout to prevent infinite loops / fork bombs / worker starvation
	compileTimeout := 10 * time.Second
	compileCtx, cancel := context.WithTimeout(ctx, compileTimeout)
	defer cancel()

	cmd := exec.CommandContext(compileCtx, "docker", args...)

	var outBuf, errBuf bytes.Buffer
	cmd.Stdout = &outBuf
	cmd.Stderr = &errBuf

	err := cmd.Run()
	if compileCtx.Err() == context.DeadlineExceeded {
		_ = exec.Command("docker", "rm", "-f", containerName).Run()
		return "Compilation timed out (exceeded 10s)", fmt.Errorf("compilation timed out")
	}
	if compileCtx.Err() == context.Canceled {
		_ = exec.Command("docker", "rm", "-f", containerName).Run()
		return "Compilation cancelled", fmt.Errorf("compilation cancelled")
	}
	if err != nil {
		return errBuf.String(), fmt.Errorf("compilation failed: %v", err)
	}

	return outBuf.String(), nil
}

// BuildRunArgs constructs the hardened docker run arguments for a testcase run.
func (e *Executor) BuildRunArgs(workDir, containerName string, langConfig config.LanguageConfig, memLimitMB int) []string {
	maxPids := e.cfg.MaxPids
	if maxPids <= 0 {
		maxPids = 64
	}

	tmpfsSize := e.cfg.TmpfsSize
	if tmpfsSize == "" {
		tmpfsSize = "50m"
	}

	args := []string{
		"run", "--rm",
		"-i", // Interactive (keeps STDIN open)
		"--name", containerName,
		"-v", fmt.Sprintf("%s:/tmp:ro", workDir), // Read-only mount for code
		"--network", "none",
		"--memory", fmt.Sprintf("%dm", memLimitMB),
		"--memory-swap", fmt.Sprintf("%dm", memLimitMB), // Disable swap thrashing
		"--cpus", "1.0",
		"--pids-limit", fmt.Sprintf("%d", maxPids),
		"--security-opt", "no-new-privileges",
		"--read-only",
		"--tmpfs", fmt.Sprintf("/scratch:rw,nosuid,size=%s", tmpfsSize),
	}

	if e.cfg.SeccompProfile != "" {
		args = append(args, "--security-opt", fmt.Sprintf("seccomp=%s", e.cfg.SeccompProfile))
	}

	args = append(args, langConfig.Image)
	// Execute the command directly without shell wrapping
	runCmdParts := strings.Fields(langConfig.RunCmd)
	args = append(args, runCmdParts...)

	return args
}

// runTestCase executes the compiled code against a single test case
func (e *Executor) runTestCase(ctx context.Context, job models.SubmissionJob, langConfig config.LanguageConfig, tc models.TestCase, workDir string) models.TestCaseResult {
	log.Printf("Running test case %s for submission %s", tc.ID, job.SubmissionID)

	if !validIDRegex.MatchString(job.SubmissionID) || !validIDRegex.MatchString(tc.ID) {
		return models.TestCaseResult{
			TestCaseID: tc.ID,
			Verdict:    "RE",
			Stderr:     "Invalid submission ID or test case ID",
		}
	}

	containerName := fmt.Sprintf("run-%s-%s", job.SubmissionID, tc.ID)

	// Ensure container is cleaned up even if execution halts unexpectedly
	defer func() {
		_ = exec.Command("docker", "rm", "-f", containerName).Run()
	}()

	// Dynamic memory limit (fallback to default only if <= 0)
	memLimitMB := job.MemoryLimitMB
	if memLimitMB <= 0 {
		memLimitMB = e.cfg.DefaultMemoryLimitMB
	}
	if memLimitMB <= 0 {
		memLimitMB = 256
	}

	// Dynamic time limit (fallback to default only if <= 0)
	timeLimitMs := job.TimeLimitMs
	if timeLimitMs <= 0 {
		timeLimitMs = e.cfg.DefaultTimeLimitMs
	}
	if timeLimitMs <= 0 {
		timeLimitMs = 2000
	}

	args := e.BuildRunArgs(workDir, containerName, langConfig, memLimitMB)

	wallClockMultiplier := e.cfg.WallClockMultiplier
	if wallClockMultiplier <= 0 {
		wallClockMultiplier = 2.0
	}
	timeoutDuration := time.Duration(float64(timeLimitMs)*wallClockMultiplier) * time.Millisecond
	runCtx, cancel := context.WithTimeout(ctx, timeoutDuration)
	defer cancel()

	cmd := exec.CommandContext(runCtx, "docker", args...)
	cmd.Stdin = strings.NewReader(tc.Input)

	var outBuf, errBuf bytes.Buffer
	cmd.Stdout = &outBuf
	cmd.Stderr = &errBuf

	startTime := time.Now()
	err := cmd.Run()
	runtimeMs := int(time.Since(startTime).Milliseconds())

	result := models.TestCaseResult{
		TestCaseID:     tc.ID,
		RuntimeMs:      runtimeMs,
		MemoryKb:       5120, // Baseline metric when cgroup reading is unattached
		ActualOutput:   strings.TrimSpace(outBuf.String()),
		ExpectedOutput: strings.TrimSpace(tc.ExpectedOutput),
	}

	// Handle timeout explicitly: terminate container and set verdict to TLE
	if runCtx.Err() == context.DeadlineExceeded {
		_ = exec.Command("docker", "rm", "-f", containerName).Run()
		result.Verdict = "TLE"
		result.RuntimeMs = int(timeoutDuration.Milliseconds())
		return result
	}

	if err != nil {
		result.Verdict = ClassifyError(err, errBuf.String())
		if result.Verdict == "RE" {
			result.Stderr = errBuf.String()
		}
		return result
	}

	if result.ActualOutput == result.ExpectedOutput {
		result.Verdict = "AC"
	} else {
		result.Verdict = "WA"
	}

	return result
}
