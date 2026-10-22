<div align="center">

# ⚡ TsuniForge

**A full-stack competitive programming platform with sandboxed code execution, real-time contests, and enterprise hiring assessments.**

[![Next.js](https://img.shields.io/badge/Next.js_16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS_11-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Go](https://img.shields.io/badge/Go_Judge-00ADD8?style=flat-square&logo=go&logoColor=white)](https://go.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis_7-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![CI](https://github.com/ANSUJKMEHER/TsuniForge/actions/workflows/ci.yml/badge.svg)](https://github.com/ANSUJKMEHER/TsuniForge/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

</div>

---

Think LeetCode meets HackerRank — but self-hosted, open-source, and built from scratch.

TsuniForge is a monorepo containing three independently deployable services: a **Next.js 16** frontend with an embedded Monaco code editor, a **NestJS 11** REST + WebSocket API backed by PostgreSQL and Redis, and a **Go judge engine** that compiles and executes user-submitted code inside ephemeral Docker containers with strict sandboxing (no network, read-only root, memory caps, seccomp filters).

Beyond the code grading engine, it supports **live ICPC-style contests** with real-time leaderboards, a **company hiring portal** with proctored assessments and anti-cheat telemetry, **admin problem authoring** with markdown editors and test case management, and an optional **Gemini AI code review** pipeline.

## Why I built this

I wanted a project that touched every layer of the stack — frontend rendering, backend auth, queue-based async processing, container orchestration, and systems-level security. Competitive programming platforms are interesting because they're deceptively complex: you need to safely run arbitrary untrusted code, handle concurrent contest submissions without race conditions, and make the whole thing feel responsive enough that users don't notice the compilation happening.

This started as a way to learn NestJS and Go concurrently, and grew into something I'm genuinely proud of.

---

## What's inside

### The Judge Engine (Go)

The heart of the system. When someone submits code, it gets pushed to a Redis queue. The Go worker picks it up, writes the source file to a host bind mount, and launches an ephemeral Docker container with these constraints:

- `--network none` — zero internet access
- `--read-only` — immutable container filesystem
- `--tmpfs /scratch:rw,nosuid,size=50m` — small in-memory scratch space
- `--memory <limit>m --memory-swap <limit>m` — hard memory caps, no swap
- `--pids-limit 64` — fork bomb protection
- Custom seccomp profile blocking raw sockets, ptrace, and kernel manipulation

Test case inputs are streamed directly into `stdin` — no shell wrapping, no command injection surface. Exit code 137 gets classified as MLE, wall-clock timeouts trigger `docker rm -f` and return TLE.

Currently supports **C++ 17** (GCC 13), **Java 17** (OpenJDK), and **Python 3.11**.

### The API (NestJS)

Standard REST API with some interesting bits:

- **JWT auth with refresh token rotation** — 30-second grace window so concurrent requests don't invalidate each other
- **WebSocket gateway** — real-time verdict delivery scoped to private rooms (`submission:<id>`), no global broadcasts
- **ICPC leaderboard scoring** — Redis sorted sets with distributed mutex locking for atomic rank updates
- **BullMQ job queue** — submission processing with a stuck-job watchdog that auto-reconciles pending submissions to System Error after 30 seconds
- **BOLA protection** — ownership checks on submissions, assessments, and company resources
- **Proctoring telemetry** — tracks tab switches, window blur, copy/paste, and fullscreen exits during assessments

### The Frontend (Next.js 16)

App Router with React 19, Tailwind CSS 4, and a dark OLED theme:

- **Monaco Editor** — full IDE experience with syntax highlighting, language switching, and code persistence per language
- **Problem workspace** — split-pane layout with problem description, constraints, examples, and an integrated console with custom test case input
- **Contest hub** — live tournament browsing with status filtering (active/upcoming/past)
- **Leaderboard** — top-3 podium showcase with rating tiers
- **Admin studio** — full problem authoring with markdown preview, tag management, difficulty selectors, and dynamic test case editors
- **Company dashboard** — candidate evaluation pipeline with proctoring event streams
- **Edge middleware** — route protection for `/admin/*`, `/company/*`, `/assessment/*`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CLIENT — Next.js 16 (React 19, Monaco, Zustand, Socket.IO Client)    │
│  Edge middleware • CSP headers • Error boundaries                      │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTPS + JWT
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  API — NestJS 11 (TypeORM, BullMQ, Socket.IO Server)                   │
│  Auth module • Problems/Contests • Submissions gateway • Assessments   │
└────────┬──────────┬──────────┬──────────────────────────────────────────┘
         │          │          │
         ▼          ▼          ▼
   ┌──────────┐ ┌────────┐ ┌────────┐
   │PostgreSQL│ │ Redis  │ │ MinIO  │
   │   16     │ │   7    │ │  (S3)  │
   └──────────┘ └───┬────┘ └────────┘
                    │
                    ▼  BullMQ job queue
┌─────────────────────────────────────────────────────────────────────────┐
│  JUDGE — Go 1.23+ Worker                                               │
│  Semaphore pool • Input validation • Docker sandbox launcher           │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Ephemeral Container (per submission)                             │  │
│  │  no-network • read-only root • 50MB tmpfs • pids-limit 64       │  │
│  │  seccomp filter • memory-swap capped • no-new-privileges        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Getting started

### Prerequisites

- Node.js >= 20
- Docker & Docker Compose >= 24
- Go >= 1.23 (only for judge development)

### Clone and install

```bash
git clone https://github.com/ANSUJKMEHER/TsuniForge.git
cd TsuniForge
npm install
```

### Start the infrastructure

```bash
# PostgreSQL, Redis, MinIO
docker-compose up -d

# (Optional) Adminer + Redis Commander for debugging
docker-compose --profile dev-tools up -d
```

### Set up environment variables

```bash
cp apps/api/.env.example apps/api/.env
cp apps/frontend/.env.example apps/frontend/.env
```

The defaults work out of the box for local development. Key variables you might want to change:

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `dev-secret` | Access token signing key |
| `JWT_REFRESH_SECRET` | `dev-refresh-secret` | Refresh token signing key |
| `DATABASE_URL` | `postgres://...localhost:5432` | PostgreSQL connection |
| `REDIS_HOST` | `localhost` | Redis host |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | API base URL for frontend |

### Build sandbox images

```bash
cd apps/judge
docker build -t tsuniforge-sandbox-cpp -f docker/Dockerfile.cpp .
docker build -t tsuniforge-sandbox-java -f docker/Dockerfile.java .
docker build -t tsuniforge-sandbox-python -f docker/Dockerfile.python .
cd ../..
```

### Run everything

```bash
# All services via Turborepo
npm run dev

# Or individually:
npm run dev:web    # Frontend → http://localhost:3000
npm run dev:api    # API      → http://localhost:4000

# Judge engine (separate terminal):
cd apps/judge && go run cmd/judge/main.go
```

### Seed demo data

The API auto-seeds on first boot with sample problems (Two Sum, Reverse String, etc.) and demo accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@tsuniforge.com` | `Admin123!` |
| User | `user@tsuniforge.com` | `User123!` |
| Company | `company@tsuniforge.com` | `Company123!` |

The login page also has **1-click demo buttons** for each role — no typing required.

---

## Service endpoints

| Service | URL | Notes |
|---------|-----|-------|
| Frontend | `http://localhost:3000` | Problem workspace, contests, leaderboard |
| API | `http://localhost:4000` | REST endpoints |
| Swagger | `http://localhost:4000/api/docs` | Interactive API documentation |
| WebSocket | `ws://localhost:4000/ws` | Real-time submission verdicts |
| MinIO | `http://localhost:9001` | S3 bucket browser |
| Adminer | `http://localhost:8080` | PostgreSQL GUI |
| Redis Commander | `http://localhost:8081` | Queue and cache inspection |

---

## Production deployment

There's a production Docker Compose setup in `deploy/`:

```bash
cd deploy
docker-compose -f docker-compose.prod.yml up -d
```

This runs everything (API, judge, Nginx with SSL via Certbot, PostgreSQL, Redis) in a single stack. The judge runs as an unprivileged user with no `privileged: true` flag — it communicates with Docker via a socket mount.

See [`deploy/setup-server.sh`](deploy/setup-server.sh) for a one-shot Ubuntu server provisioning script (Docker, Node.js, Go, firewall rules).

---

## Project structure

```
TsuniForge/
├── apps/
│   ├── frontend/              # Next.js 16 — React 19, Tailwind 4, Monaco
│   │   ├── src/app/           # App Router pages
│   │   │   ├── problems/      # Problem list + workspace with code editor
│   │   │   ├── contests/      # Contest hub + per-contest leaderboard
│   │   │   ├── admin/         # Problem authoring studio
│   │   │   ├── company/       # Recruiter dashboard
│   │   │   ├── assessment/    # Proctored candidate assessment
│   │   │   ├── playground/    # Standalone code sandbox
│   │   │   └── leaderboard/   # Global rankings
│   │   ├── src/stores/        # Zustand auth store (cookie-based)
│   │   ├── src/lib/           # API client with 401 interceptor
│   │   └── middleware.ts      # Edge route protection
│   │
│   ├── api/                   # NestJS 11 — TypeORM, BullMQ, Socket.IO
│   │   ├── src/modules/
│   │   │   ├── auth/          # JWT rotation, OAuth, roles guard
│   │   │   ├── problems/      # CRUD + admin filtering
│   │   │   ├── submissions/   # Queue dispatch, WebSocket verdicts, watchdog
│   │   │   ├── contests/      # ICPC scoring, mutex leaderboard
│   │   │   └── assessments/   # Proctoring telemetry, timed exams
│   │   └── src/database/      # Entities, migrations, seed script
│   │
│   └── judge/                 # Go 1.23+ — Docker sandbox executor
│       ├── cmd/judge/         # Worker entry point
│       ├── internal/
│       │   ├── executor/      # Container lifecycle management
│       │   ├── queue/         # Redis consumer with semaphore throttling
│       │   ├── config/        # Environment + defaults
│       │   └── models/        # Job/result payloads
│       ├── configs/security/  # seccomp filter (ARM64 + x86_64)
│       └── docker/            # Sandbox Dockerfiles (C++, Java, Python)
│
├── deploy/
│   ├── docker-compose.prod.yml   # Production stack
│   └── setup-server.sh           # Server provisioning script
│
├── packages/common/           # Shared TypeScript types
├── .github/workflows/ci.yml   # CI pipeline
├── docker-compose.yml         # Local dev infrastructure
├── turbo.json                 # Turborepo task config
└── AUDIT_REPORT.md            # Security audit findings (57 items)
```

---

## Testing

```bash
# Go judge — unit tests for executor, config, models, consumer
cd apps/judge && go test ./... -v -count=1

# NestJS API — Jest tests for auth, submissions, contests, assessments
cd apps/api && npm test

# Frontend — production build verification (0 errors across 18 routes)
cd apps/frontend && npm run build
```

The Go tests verify sandbox container flags, input ID sanitization, exit code classification, and graceful shutdown. The API tests cover JWT secret enforcement, refresh token grace windows, BOLA guards, leaderboard mutex behavior, and watchdog reconciliation.

---

## Security audit

The platform went through a pretty thorough security review — 57 findings across 5 categories, all patched:

| Area | Findings | What got fixed |
|------|----------|----------------|
| Sandbox isolation | 14 | Removed `privileged: true`, added seccomp, fixed command injection via `sh -c`, zombie container cleanup |
| Backend auth | 8 | OAuth email linking, JWT secret strength check, token rotation race condition, BOLA checks |
| Data integrity | 5 | Non-null constraints, TypeORM transactions, cascading deletes, masked SQL errors |
| Queue concurrency | 6 | Stuck submission watchdog, atomic counters, penalty timestamp fix |
| WebSocket + Frontend | 14 | Authenticated sockets, private rooms, cookie-based auth, CSP headers, error boundaries, Monaco disposal |
| Test coverage | 5 | Go + Jest test suites, hermetic fixtures |

Full details with threat models and before/after diffs are in [`AUDIT_REPORT.md`](AUDIT_REPORT.md).

---

## Roadmap

Some things I'd like to add when I get the time:

- [ ] **gVisor runtime** — swap Docker containers for gVisor sandboxes for even stronger isolation
- [ ] **Row-Level Security** — PostgreSQL RLS for multi-tenant assessment data
- [ ] **Redis Streams** — replace list-based queue with consumer groups for better scaling
- [ ] **cgroup v2 direct polling** — microsecond-precise CPU/memory stats from `/sys/fs/cgroup`
- [ ] **Plagiarism detection** — winnowing + MinHash LSH for detecting copied submissions

---

## Tech stack at a glance

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js (App Router) | 16.2 |
| UI | React, Tailwind CSS | 19, 4 |
| Editor | Monaco Editor | latest |
| State | Zustand, TanStack Query | 5, 5 |
| API | NestJS, TypeORM | 11, latest |
| Database | PostgreSQL | 16 |
| Cache/Queue | Redis, BullMQ | 7, latest |
| Object Storage | MinIO (S3-compatible) | latest |
| Judge | Go | 1.23+ |
| Containers | Docker (OCI) | 24+ |
| Monorepo | Turborepo | 2.9 |
| CI | GitHub Actions | — |

---

## License

MIT — see [`LICENSE`](LICENSE) for details.

---

<div align="center">

Built by [Ansuj Kumar Meher](https://github.com/ANSUJKMEHER)

</div>
