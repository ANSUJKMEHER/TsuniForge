package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/tsuniforge/judge/internal/config"
	"github.com/tsuniforge/judge/internal/queue"
)

func main() {
	log.Println("⚡ TsuniForge Judge Engine starting...")

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	log.Printf("📋 Configuration loaded: %d languages supported", len(cfg.Languages))

	// Create context with cancellation
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Create queue consumer
	consumer, err := queue.NewConsumer(cfg)
	if err != nil {
		log.Fatalf("Failed to create queue consumer: %v", err)
	}

	// Start consuming submission jobs
	go func() {
		if err := consumer.Start(ctx); err != nil {
			log.Printf("Consumer error: %v", err)
			cancel()
		}
	}()

	log.Printf("🚀 Judge engine running, listening for submissions on Redis queue")
	log.Printf("   Redis: %s:%d", cfg.RedisHost, cfg.RedisPort)

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit

	fmt.Printf("\n🛑 Received signal %s, shutting down gracefully...\n", sig)

	// Call consumer.Stop() FIRST to wait for in-flight jobs to complete and publish results
	if err := consumer.Stop(); err != nil {
		log.Printf("Error stopping consumer: %v", err)
	}

	// Cancel root context after consumer has stopped cleanly
	cancel()

	log.Println("✅ Judge engine stopped")
}
