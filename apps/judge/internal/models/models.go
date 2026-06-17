package models

import "time"

// SubmissionJob represents a submission to be judged
type SubmissionJob struct {
	SubmissionID string     `json:"submission_id"`
	UserID       string     `json:"user_id"`
	ProblemID    string     `json:"problem_id"`
	ContestID    string     `json:"contest_id,omitempty"`
	Language     string     `json:"language"`
	SourceCode   string     `json:"source_code"`
	TimeLimitMs  int        `json:"time_limit_ms"`
	MemoryLimitMB int       `json:"memory_limit_mb"`
	TestCases    []TestCase `json:"test_cases"`
}

// TestCase represents a single test case
type TestCase struct {
	ID             string  `json:"id"`
	Input          string  `json:"input"`
	ExpectedOutput string  `json:"expected_output"`
	ScoreWeight    float64 `json:"score_weight"`
}

// JudgeResult is the final result of judging a submission
type JudgeResult struct {
	SubmissionID    string             `json:"submission_id"`
	Verdict         string             `json:"verdict"`
	TotalScore      float64            `json:"total_score"`
	RuntimeMs       int                `json:"runtime_ms"`
	MemoryKb        int                `json:"memory_kb"`
	TestCasesPassed int                `json:"test_cases_passed"`
	TotalTestCases  int                `json:"total_test_cases"`
	Details         []TestCaseResult   `json:"details"`
	CompilerOutput  string             `json:"compiler_output,omitempty"`
	Error           string             `json:"error,omitempty"`
	JudgedAt        time.Time          `json:"judged_at"`
}

// TestCaseResult is the result of a single test case execution
type TestCaseResult struct {
	TestCaseID     string `json:"test_case_id"`
	Verdict        string `json:"verdict"`
	RuntimeMs      int    `json:"runtime_ms"`
	MemoryKb       int    `json:"memory_kb"`
	ActualOutput   string `json:"actual_output"`
	ExpectedOutput string `json:"expected_output"`
	Stderr         string `json:"stderr,omitempty"`
}
