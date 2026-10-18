package config

import (
	"os"
	"path/filepath"
	"strconv"
)

// Config holds all configuration for the judge engine
type Config struct {
	// Redis connection
	RedisHost string
	RedisPort int

	// Docker settings
	DockerSocket    string
	NetworkDisabled bool

	// Execution limits
	DefaultTimeLimitMs   int
	DefaultMemoryLimitMB int
	MaxPids              int
	CompilePids          int
	WallClockMultiplier  float64
	TmpfsSize            string
	BaseWorkDir          string
	SeccompProfile       string

	// Language configurations
	Languages map[string]LanguageConfig

	// Concurrency
	MaxConcurrentJudges int
}

// LanguageConfig defines how to compile and run a specific language
type LanguageConfig struct {
	Name       string `yaml:"name"`
	Extension  string `yaml:"extension"`
	CompileCmd string `yaml:"compile_cmd"`
	RunCmd     string `yaml:"run_cmd"`
	Image      string `yaml:"image"`
}

// Load reads configuration from environment variables with sensible defaults
func Load() (*Config, error) {
	cfg := &Config{
		RedisHost:            getEnv("REDIS_HOST", "localhost"),
		RedisPort:            getEnvInt("REDIS_PORT", 6379),
		DockerSocket:         getEnv("DOCKER_SOCKET", "/var/run/docker.sock"),
		NetworkDisabled:      true,
		DefaultTimeLimitMs:   getEnvInt("DEFAULT_TIME_LIMIT_MS", 2000),
		DefaultMemoryLimitMB: getEnvInt("DEFAULT_MEMORY_LIMIT_MB", 256),
		MaxPids:              getEnvInt("MAX_PIDS", 64),
		CompilePids:          getEnvInt("COMPILE_PIDS", 128),
		WallClockMultiplier:  2.0,
		TmpfsSize:            getEnv("TMPFS_SIZE", "50m"),
		BaseWorkDir:          getEnv("SUBMISSIONS_DIR", filepath.Join(os.TempDir(), "tsuniforge")),
		SeccompProfile:       getEnv("SECCOMP_PROFILE", ""),
		MaxConcurrentJudges:  getEnvInt("MAX_CONCURRENT_JUDGES", 4),
		Languages: map[string]LanguageConfig{
			"cpp": {
				Name:       "C++ 17",
				Extension:  ".cpp",
				CompileCmd: "g++ -std=c++17 -O2 -o /tmp/solution /tmp/solution.cpp",
				RunCmd:     "/tmp/solution",
				Image:      "tsuniforge/sandbox-cpp:latest",
			},
			"java": {
				Name:       "Java 17",
				Extension:  ".java",
				CompileCmd: "javac -d /tmp /tmp/Solution.java",
				RunCmd:     "java -Xmx256m -cp /tmp Solution",
				Image:      "tsuniforge/sandbox-java:latest",
			},
			"python": {
				Name:       "Python 3.11",
				Extension:  ".py",
				CompileCmd: "", // interpreted
				RunCmd:     "python3 /tmp/solution.py",
				Image:      "tsuniforge/sandbox-python:latest",
			},
		},
	}

	return cfg, nil
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value, exists := os.LookupEnv(key); exists {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
