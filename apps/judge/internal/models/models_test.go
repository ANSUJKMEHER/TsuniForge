package models

import (
	"encoding/json"
	"testing"
	"time"
)

func TestSubmissionJobJSON(t *testing.T) {
	jobJSON := `{
		"submission_id": "sub-12345",
		"user_id": "user-999",
		"problem_id": "prob-888",
		"language": "python",
		"source_code": "print(input())",
		"time_limit_ms": 1000,
		"memory_limit_mb": 128,
		"test_cases": [
			{
				"id": "tc-1",
				"input": "hello\n",
				"expected_output": "hello",
				"score_weight": 50.0
			}
		]
	}`

	var job SubmissionJob
	if err := json.Unmarshal([]byte(jobJSON), &job); err != nil {
		t.Fatalf("Failed to unmarshal SubmissionJob: %v", err)
	}

	if job.SubmissionID != "sub-12345" {
		t.Errorf("job.SubmissionID = %q; want \"sub-12345\"", job.SubmissionID)
	}
	if job.Language != "python" {
		t.Errorf("job.Language = %q; want \"python\"", job.Language)
	}
	if len(job.TestCases) != 1 {
		t.Fatalf("len(job.TestCases) = %d; want 1", len(job.TestCases))
	}
	if job.TestCases[0].ID != "tc-1" {
		t.Errorf("test_case ID = %q; want \"tc-1\"", job.TestCases[0].ID)
	}
}

func TestJudgeResultJSON(t *testing.T) {
	now := time.Now()
	res := JudgeResult{
		SubmissionID:    "sub-abc",
		Verdict:         "AC",
		TotalScore:      100.0,
		RuntimeMs:       150,
		MemoryKb:        5120,
		TestCasesPassed: 2,
		TotalTestCases:  2,
		JudgedAt:        now,
		Details: []TestCaseResult{
			{
				TestCaseID:     "tc-1",
				Verdict:        "AC",
				RuntimeMs:      75,
				MemoryKb:       5120,
				ActualOutput:   "10",
				ExpectedOutput: "10",
			},
			{
				TestCaseID:     "tc-2",
				Verdict:        "AC",
				RuntimeMs:      75,
				MemoryKb:       5120,
				ActualOutput:   "20",
				ExpectedOutput: "20",
			},
		},
	}

	data, err := json.Marshal(res)
	if err != nil {
		t.Fatalf("Failed to marshal JudgeResult: %v", err)
	}

	var roundtrip JudgeResult
	if err := json.Unmarshal(data, &roundtrip); err != nil {
		t.Fatalf("Failed to unmarshal JudgeResult: %v", err)
	}

	if roundtrip.Verdict != "AC" {
		t.Errorf("roundtrip.Verdict = %q; want \"AC\"", roundtrip.Verdict)
	}
	if roundtrip.TotalScore != 100.0 {
		t.Errorf("roundtrip.TotalScore = %v; want 100.0", roundtrip.TotalScore)
	}
	if len(roundtrip.Details) != 2 {
		t.Errorf("len(roundtrip.Details) = %d; want 2", len(roundtrip.Details))
	}
}
