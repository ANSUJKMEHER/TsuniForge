package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/tsuniforge/judge/internal/config"
	"github.com/tsuniforge/judge/internal/executor"
	"github.com/tsuniforge/judge/internal/models"
)

const (
	submissionQueue = "bull:submission_queue:waiting"
	resultChannel   = "submission_results"
)

// Consumer listens for submission jobs from the Redis queue
type Consumer struct {
	cfg      *config.Config
	executor *executor.Executor
	redis    *redis.Client
	wg       sync.WaitGroup
	sem      chan struct{} // semaphore for limiting concurrency
	stopOnce sync.Once
	stopChan chan struct{} // signaled when Stop() is called
}

// NewConsumer creates a new queue consumer
func NewConsumer(cfg *config.Config) (*Consumer, error) {
	exec, err := executor.New(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create executor: %w", err)
	}

	rdb := redis.NewClient(&redis.Options{
		Addr: fmt.Sprintf("%s:%d", cfg.RedisHost, cfg.RedisPort),
	})

	maxJudges := cfg.MaxConcurrentJudges
	if maxJudges <= 0 {
		maxJudges = 4
	}

	return &Consumer{
		cfg:      cfg,
		executor: exec,
		redis:    rdb,
		sem:      make(chan struct{}, maxJudges),
		stopChan: make(chan struct{}),
	}, nil
}

// Start begins consuming jobs from the submission queue.
// Guarantees no in-memory job loss by acquiring a semaphore slot BEFORE popping from Redis.
func (c *Consumer) Start(ctx context.Context) error {
	log.Printf("Starting queue consumer with %d max concurrent judges", c.cfg.MaxConcurrentJudges)

	for {
		// Acquire semaphore slot BEFORE popping from Redis.
		// If all worker slots are active, we wait here without dequeuing from Redis.
		// Also listen on c.stopChan to cease accepting new jobs immediately when Stop() is called.
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-c.stopChan:
			log.Println("Queue consumer stopped receiving new jobs")
			return nil
		case c.sem <- struct{}{}:
		}

		// Verify stop condition before blocking on Redis
		select {
		case <-c.stopChan:
			<-c.sem
			return nil
		default:
		}

		// BLPOP from bullmq/redis queue (Wait for up to 2 seconds to allow context/stop checks)
		result, err := c.redis.BLPop(ctx, 2*time.Second, submissionQueue).Result()
		if err != nil {
			// Release pre-acquired slot since no job was retrieved
			<-c.sem

			select {
			case <-c.stopChan:
				return nil
			default:
			}

			if err == redis.Nil {
				// Timeout, just loop again
				continue
			}
			if ctx.Err() != nil {
				return ctx.Err()
			}
			// Other Redis error
			log.Printf("Redis error: %v", err)
			time.Sleep(1 * time.Second)
			continue
		}

		if len(result) < 2 {
			<-c.sem
			continue
		}

		jobData := result[1]
		var job models.SubmissionJob
		if err := json.Unmarshal([]byte(jobData), &job); err != nil {
			log.Printf("Failed to unmarshal job: %v", err)
			<-c.sem
			continue
		}

		// Dispatch job with worker slot already acquired.
		// Decouple worker execution context from the consumer loop context so
		// in-flight jobs are allowed to complete and publish results during graceful shutdown.
		c.wg.Add(1)
		go func(j models.SubmissionJob) {
			defer c.wg.Done()
			defer func() { <-c.sem }()

			jobTimeout := time.Duration(j.TimeLimitMs*len(j.TestCases)*2)*time.Millisecond + 20*time.Second
			if jobTimeout < 30*time.Second {
				jobTimeout = 30 * time.Second
			}
			jobCtx, jobCancel := context.WithTimeout(context.Background(), jobTimeout)
			defer jobCancel()

			c.processJob(jobCtx, j)
		}(job)
	}
}

// Stop gracefully stops the consumer, waiting for in-progress judges to finish and closing resources
func (c *Consumer) Stop() error {
	log.Println("Stopping queue consumer and waiting for in-progress judges to complete...")

	// Signal Start() loop to stop accepting new jobs
	c.stopOnce.Do(func() {
		close(c.stopChan)
	})

	// Wait for all in-flight jobs to finish execution and publish results
	c.wg.Wait()

	var closeErr error
	if c.redis != nil {
		if err := c.redis.Close(); err != nil {
			log.Printf("Error closing Redis client: %v", err)
			closeErr = err
		}
	}

	log.Println("All judges completed and Redis connection closed cleanly")
	return closeErr
}

// processJob handles a single submission job
func (c *Consumer) processJob(ctx context.Context, job models.SubmissionJob) {
	log.Printf("Processing submission %s [%s] for problem %s",
		job.SubmissionID, job.Language, job.ProblemID)

	result, err := c.executor.Execute(ctx, job)
	if err != nil {
		log.Printf("Execution error for submission %s: %v", job.SubmissionID, err)
		result = &models.JudgeResult{
			SubmissionID: job.SubmissionID,
			Verdict:      "RE",
			Error:        err.Error(),
		}
	}

	// Publish result to Node.js backend
	resultJSON, _ := json.Marshal(result)
	log.Printf("Publishing result for submission %s to channel %s", job.SubmissionID, resultChannel)

	// Use dedicated timeout context so delivery succeeds even if main context was cancelled during graceful shutdown
	pubCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := c.redis.Publish(pubCtx, resultChannel, resultJSON).Err(); err != nil {
		log.Printf("Failed to publish result: %v", err)
	}
}
