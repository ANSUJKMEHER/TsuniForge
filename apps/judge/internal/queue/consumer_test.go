package queue

import (
	"testing"
	"time"

	"github.com/tsuniforge/judge/internal/config"
)

func TestNewConsumerInitialization(t *testing.T) {
	cfg := &config.Config{
		RedisHost:           "localhost",
		RedisPort:           6379,
		MaxConcurrentJudges: 5,
		Languages:           make(map[string]config.LanguageConfig),
	}

	consumer, err := NewConsumer(cfg)
	if err != nil {
		t.Fatalf("NewConsumer failed: %v", err)
	}

	if cap(consumer.sem) != 5 {
		t.Errorf("expected semaphore capacity 5, got %d", cap(consumer.sem))
	}
	if consumer.stopChan == nil {
		t.Fatalf("expected stopChan to be initialized, got nil")
	}

	// Verify stopChan is open
	select {
	case <-consumer.stopChan:
		t.Errorf("stopChan should not be closed initially")
	default:
		// Expected
	}
}

func TestConsumerStopDrain(t *testing.T) {
	cfg := &config.Config{
		RedisHost:           "localhost",
		RedisPort:           6379,
		MaxConcurrentJudges: 2,
		Languages:           make(map[string]config.LanguageConfig),
	}

	consumer, err := NewConsumer(cfg)
	if err != nil {
		t.Fatalf("NewConsumer failed: %v", err)
	}

	// Active synchronization channels for deterministic drain testing
	workerStarted := make(chan struct{})
	releaseWorker := make(chan struct{})
	workerFinished := make(chan struct{})

	consumer.wg.Add(1)
	go func() {
		defer consumer.wg.Done()
		defer close(workerFinished)
		close(workerStarted)
		<-releaseWorker
	}()

	<-workerStarted

	// Call Stop() in a separate goroutine
	stopDone := make(chan error, 1)
	go func() {
		stopDone <- consumer.Stop()
	}()

	// Verify Stop() does not return immediately while worker is actively running
	select {
	case <-stopDone:
		t.Fatalf("Stop() returned before worker completed (c.wg.Wait() drain barrier failed)")
	case <-time.After(50 * time.Millisecond):
		// Expected: Stop() is actively blocked waiting for consumer.wg
	}

	// Release worker and wait for worker goroutine completion
	close(releaseWorker)
	<-workerFinished

	// Stop() should now complete cleanly
	select {
	case err := <-stopDone:
		if err != nil {
			t.Logf("Stop returned error (expected if Redis offline): %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatalf("Stop() timed out after worker completed")
	}

	// Verify stopChan is closed
	select {
	case <-consumer.stopChan:
		// Expected
	default:
		t.Errorf("expected stopChan to be closed after Stop()")
	}
}
