FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy go mod and download dependencies
COPY go.mod ./
RUN go mod download

# Copy the source code
COPY . .

# Build the Go app
RUN CGO_ENABLED=0 GOOS=linux go build -o /judge-engine ./cmd/judge/main.go

# Final lightweight image
FROM docker:dind

WORKDIR /app

# Copy the compiled binary from the builder stage
COPY --from=builder /judge-engine /app/judge-engine

# Expose no ports (it's a worker)
CMD ["/app/judge-engine"]
