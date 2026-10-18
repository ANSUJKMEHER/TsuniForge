package config

import (
	"os"
	"testing"
)

func TestLoadDefaults(t *testing.T) {
	// Temporarily clear environment variables to test pure defaults hermetically
	envVars := []string{
		"REDIS_HOST", "REDIS_PORT", "DOCKER_SOCKET",
		"DEFAULT_TIME_LIMIT_MS", "DEFAULT_MEMORY_LIMIT_MB",
		"MAX_PIDS", "COMPILE_PIDS", "TMPFS_SIZE",
		"SUBMISSIONS_DIR", "SECCOMP_PROFILE", "MAX_CONCURRENT_JUDGES",
	}
	for _, env := range envVars {
		if val, exists := os.LookupEnv(env); exists {
			key, orig := env, val
			os.Unsetenv(key)
			defer os.Setenv(key, orig)
		}
	}

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() unexpected error: %v", err)
	}

	if cfg.RedisHost != "localhost" {
		t.Errorf("expected default RedisHost 'localhost', got %q", cfg.RedisHost)
	}
	if cfg.RedisPort != 6379 {
		t.Errorf("expected default RedisPort 6379, got %d", cfg.RedisPort)
	}
	if cfg.DefaultTimeLimitMs != 2000 {
		t.Errorf("expected default TimeLimit 2000, got %d", cfg.DefaultTimeLimitMs)
	}
	if cfg.DefaultMemoryLimitMB != 256 {
		t.Errorf("expected default MemoryLimit 256, got %d", cfg.DefaultMemoryLimitMB)
	}
	if cfg.MaxPids != 64 {
		t.Errorf("expected default MaxPids 64, got %d", cfg.MaxPids)
	}
	if cfg.CompilePids != 128 {
		t.Errorf("expected default CompilePids 128, got %d", cfg.CompilePids)
	}
	if cfg.TmpfsSize != "50m" {
		t.Errorf("expected default TmpfsSize '50m', got %q", cfg.TmpfsSize)
	}
	if cfg.MaxConcurrentJudges != 4 {
		t.Errorf("expected default MaxConcurrentJudges 4, got %d", cfg.MaxConcurrentJudges)
	}
	if !cfg.NetworkDisabled {
		t.Errorf("expected default NetworkDisabled true, got false")
	}

	// Verify supported languages
	expectedLangs := []string{"cpp", "java", "python"}
	for _, lang := range expectedLangs {
		lcfg, exists := cfg.Languages[lang]
		if !exists {
			t.Errorf("expected language %s in config, but not found", lang)
			continue
		}
		if lcfg.RunCmd == "" {
			t.Errorf("language %s has empty RunCmd", lang)
		}
	}

	// Verify Java casing in config
	javaCfg := cfg.Languages["java"]
	if javaCfg.CompileCmd != "javac -d /tmp /tmp/Solution.java" {
		t.Errorf("expected Java CompileCmd to target /tmp/Solution.java, got %q", javaCfg.CompileCmd)
	}
	if javaCfg.RunCmd != "java -Xmx256m -cp /tmp Solution" {
		t.Errorf("expected Java RunCmd to target Solution, got %q", javaCfg.RunCmd)
	}

	// Verify Python interpreted config
	pyCfg := cfg.Languages["python"]
	if pyCfg.CompileCmd != "" {
		t.Errorf("expected Python CompileCmd to be empty (interpreted), got %q", pyCfg.CompileCmd)
	}
	if pyCfg.RunCmd != "python3 /tmp/solution.py" {
		t.Errorf("expected Python RunCmd to target /tmp/solution.py, got %q", pyCfg.RunCmd)
	}
}

func TestLoadEnvOverrides(t *testing.T) {
	os.Setenv("REDIS_HOST", "custom-redis")
	os.Setenv("REDIS_PORT", "6380")
	os.Setenv("SECCOMP_PROFILE", "/app/configs/security/seccomp.json")
	os.Setenv("MAX_CONCURRENT_JUDGES", "8")
	defer func() {
		os.Unsetenv("REDIS_HOST")
		os.Unsetenv("REDIS_PORT")
		os.Unsetenv("SECCOMP_PROFILE")
		os.Unsetenv("MAX_CONCURRENT_JUDGES")
	}()

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() unexpected error: %v", err)
	}

	if cfg.RedisHost != "custom-redis" {
		t.Errorf("expected RedisHost 'custom-redis', got %q", cfg.RedisHost)
	}
	if cfg.RedisPort != 6380 {
		t.Errorf("expected RedisPort 6380, got %d", cfg.RedisPort)
	}
	if cfg.SeccompProfile != "/app/configs/security/seccomp.json" {
		t.Errorf("expected SeccompProfile '/app/configs/security/seccomp.json', got %q", cfg.SeccompProfile)
	}
	if cfg.MaxConcurrentJudges != 8 {
		t.Errorf("expected MaxConcurrentJudges 8, got %d", cfg.MaxConcurrentJudges)
	}
}
