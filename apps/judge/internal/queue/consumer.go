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

	return &Consumer{
		cfg:      cfg,
		executor: exec,
		redis:    rdb,
		sem:      make(chan struct{}, cfg.MaxConcurrentJudges),
	}, nil
}

// Start begins consuming jobs from the submission queue
func (c *Consumer) Start(ctx context.Context) error {
	log.Printf("Starting queue consumer with %d max concurrent judges", c.cfg.MaxConcurrentJudges)

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			// BLPOP from bullmq/redis queue (Wait for up to 2 seconds to allow context cancellation checks)
			result, err := c.redis.BLPop(ctx, 2*time.Second, submissionQueue).Result()
			if err != nil {
				if err == redis.Nil {
					// Timeout, just loop again
					continue
				}
				// Other error
				log.Printf("Redis error: %v", err)
				time.Sleep(1 * time.Second)
				continue
			}

			if len(result) < 2 {
				continue
			}

			jobData := result[1]
			var job models.SubmissionJob
			if err := json.Unmarshal([]byte(jobData), &job); err != nil {
				log.Printf("Failed to unmarshal job: %v", err)
				continue
			}

			c.processJob(ctx, job)
		}
	}
}

// Stop gracefully stops the consumer, waiting for in-progress judges to finish
func (c *Consumer) Stop() error {
	log.Println("Waiting for in-progress judges to complete...")
	c.wg.Wait()
	return nil
}

// processJob handles a single submission job
func (c *Consumer) processJob(ctx context.Context, job models.SubmissionJob) {
	c.wg.Add(1)
	c.sem <- struct{}{} // acquire semaphore

	go func() {
		defer c.wg.Done()
		defer func() { <-c.sem }() // release semaphore

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
		if err := c.redis.Publish(ctx, resultChannel, resultJSON).Err(); err != nil {
			log.Printf("Failed to publish result: %v", err)
		}
	}()
}
