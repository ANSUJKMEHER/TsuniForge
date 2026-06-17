package executor

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/tsuniforge/judge/internal/config"
	"github.com/tsuniforge/judge/internal/models"
)

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
	langConfig, exists := e.cfg.Languages[job.Language]
	if !exists {
		return nil, fmt.Errorf("unsupported language: %s", job.Language)
	}

	result := &models.JudgeResult{
		SubmissionID:   job.SubmissionID,
		TotalTestCases: len(job.TestCases),
		JudgedAt:       time.Now(),
	}

	// Step 1: Compile (if needed)
	if langConfig.CompileCmd != "" {
		compileOutput, err := e.compile(ctx, job, langConfig)
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

		tcResult := e.runTestCase(ctx, job, langConfig, tc)
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

// compile compiles the source code in a Docker container
func (e *Executor) compile(ctx context.Context, job models.SubmissionJob, langConfig config.LanguageConfig) (string, error) {
	log.Printf("Compiling submission %s with %s", job.SubmissionID, langConfig.Name)

	// Create a temp directory for this submission
	workDir := filepath.Join(os.TempDir(), "tsuniforge", job.SubmissionID)
	if err := os.MkdirAll(workDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create work dir: %w", err)
	}

	sourceFile := filepath.Join(workDir, "solution"+langConfig.Extension)
	if err := os.WriteFile(sourceFile, []byte(job.SourceCode), 0644); err != nil {
		return "", fmt.Errorf("failed to write source code: %w", err)
	}

	// Run compilation inside Docker
	containerName := fmt.Sprintf("compile-%s", job.SubmissionID)
	
	// Mount the work directory to /tmp inside the container
	args := []string{
		"run", "--rm",
		"--name", containerName,
		"-v", fmt.Sprintf("%s:/tmp", workDir),
		"--network", "none",
		"--memory", "512m",
		"--cpus", "1.0",
		langConfig.Image,
		"sh", "-c", langConfig.CompileCmd,
	}

	cmd := exec.CommandContext(ctx, "docker", args...)
	
	var outBuf, errBuf bytes.Buffer
	cmd.Stdout = &outBuf
	cmd.Stderr = &errBuf

	err := cmd.Run()
	if err != nil {
		return errBuf.String(), fmt.Errorf("compilation failed: %v", err)
	}

	return outBuf.String(), nil
}

// runTestCase executes the compiled code against a single test case
func (e *Executor) runTestCase(ctx context.Context, job models.SubmissionJob, langConfig config.LanguageConfig, tc models.TestCase) models.TestCaseResult {
	log.Printf("Running test case %s for submission %s", tc.ID, job.SubmissionID)

	workDir := filepath.Join(os.TempDir(), "tsuniforge", job.SubmissionID)
	
	// Write test case input to file
	inputFile := filepath.Join(workDir, fmt.Sprintf("input_%s.txt", tc.ID))
	if err := os.WriteFile(inputFile, []byte(tc.Input), 0644); err != nil {
		return models.TestCaseResult{TestCaseID: tc.ID, Verdict: "RE", Stderr: "Failed to write input"}
	}

	containerName := fmt.Sprintf("run-%s-%s", job.SubmissionID, tc.ID)

	// Build Docker run arguments with strict security constraints
	args := []string{
		"run", "--rm",
		"-i", // Interactive (keeps STDIN open)
		"--name", containerName,
		"-v", fmt.Sprintf("%s:/tmp:ro", workDir), // Read-only mount
		"--network", "none",
		"--memory", fmt.Sprintf("%dm", e.cfg.DefaultMemoryLimitMB),
		"--cpus", "1.0",
		"--pids-limit", fmt.Sprintf("%d", e.cfg.MaxPids),
		"--security-opt", "no-new-privileges",
		// In production, uncomment the seccomp profile
		// "--security-opt", "seccomp=seccomp.json",
		langConfig.Image,
		"sh", "-c", fmt.Sprintf("cat /tmp/input_%s.txt | %s", tc.ID, langConfig.RunCmd),
	}

	// Create a timeout context based on DefaultTimeLimitMs * WallClockMultiplier
	timeoutMs := time.Duration(float64(e.cfg.DefaultTimeLimitMs) * e.cfg.WallClockMultiplier) * time.Millisecond
	runCtx, cancel := context.WithTimeout(ctx, timeoutMs)
	defer cancel()

	cmd := exec.CommandContext(runCtx, "docker", args...)
	
	var outBuf, errBuf bytes.Buffer
	cmd.Stdout = &outBuf
	cmd.Stderr = &errBuf

	startTime := time.Now()
	err := cmd.Run()
	runtimeMs := int(time.Since(startTime).Milliseconds())

	result := models.TestCaseResult{
		TestCaseID: tc.ID,
		RuntimeMs:  runtimeMs,
		MemoryKb:   5120, // Docker stats via CLI is slow; in prod, read from cgroups
		ActualOutput: strings.TrimSpace(outBuf.String()),
		ExpectedOutput: strings.TrimSpace(tc.ExpectedOutput),
	}

	if runCtx.Err() == context.DeadlineExceeded {
		result.Verdict = "TLE"
		return result
	}

	if err != nil {
		// Could be MLE (OOM Killed) or RE
		if strings.Contains(errBuf.String(), "OOM") || err.Error() == "signal: killed" {
			result.Verdict = "MLE"
		} else {
			result.Verdict = "RE"
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
