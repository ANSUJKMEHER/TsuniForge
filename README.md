<div align="center">

# ⚡ TsuniForge

### **Enterprise-Grade Distributed Online Judge, Real-Time Contest Engine & Proctored Assessment Platform**

[![Next.js 16](https://img.shields.io/badge/Next.js-16.2.7-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.2.4-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![NestJS 11](https://img.shields.io/badge/NestJS-11.0-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Go 1.23+](https://img.shields.io/badge/Go-1.23%2B-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://go.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis 7](https://img.shields.io/badge/Redis-7.0-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Docker OCI](https://img.shields.io/badge/Docker-Sandboxed-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Security Audit](https://img.shields.io/badge/Security%20Audit-57%2F57%20Hardened-brightgreen?style=for-the-badge&logo=shield&logoColor=white)](#-security-audit--production-hardening-57-findings)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

<br/>

**TsuniForge** is a production-hardened, high-concurrency coding ecosystem engineered for competitive programming contests, enterprise hiring assessments, and distributed automated code grading. Built with a **Next.js 16 App Router** frontend, a high-throughput **NestJS 11** backend, an ultra-fast **Go 1.23+ Judge Engine**, and multi-layer **Docker sandboxing** with custom seccomp filters.

[Key Capabilities](#-key-capabilities) • [Architecture](#-platform-architecture) • [Security Audit](#-security-audit--production-hardening-57-findings) • [Quick Start](#-quick-start) • [Evaluation Pipeline](#-sandboxed-evaluation-pipeline) • [Test Suites](#-automated-testing--verification) • [Roadmap](#-architectural-roadmap)

---

</div>

## 🌟 Highlights

- **🔒 Hardened Ephemeral Sandboxing**: Isolated Linux execution environments enforcing zero network access (`--network none`), read-only container root filesystems (`--read-only`), 50MB no-exec tmpfs scratch space, cgroup v2 memory & swap limits, PID constraints (`--pids-limit 64`), and custom ARM64/x86_64 seccomp filters.
- **⚡ Atomic Real-Time Contest Engine**: High-concurrency ICPC contest leaderboards powered by Redis Sorted Sets and distributed mutex locking (`SET NX PX` + Lua scripts), delivering instantaneous $O(\log N)$ rank updates with zero lost-update race conditions.
- **🏢 Enterprise Assessment & Proctoring**: Remote candidate hiring portal featuring automated anti-cheat telemetry tracking (tab switching, window blur, copy/paste infractions, fullscreen exit) and persistent server-synchronized examination countdown timers.
- **🤖 AI Code Review & Intelligence**: Gemini-powered post-evaluation analysis providing algorithmic complexity breakdowns ($O(N)$, $O(\log N)$), anti-pattern identification, and production optimization suggestions.
- **🛡️ 100% Remediated Security Baseline**: Subject to an exhaustive 57-vulnerability multi-agent security audit eliminating container escape vectors, Broken Object-Level Authorization (BOLA), timing attacks, and memory leaks.

---

## 🏗️ Platform Architecture

TsuniForge employs an event-driven, microservices-oriented architecture designed for horizontal scalability, sub-second execution latencies, and total tenant isolation:

```
+─────────────────────────────────────────────────────────────────────────────────────────+
│                                     CLIENT TIER                                         │
│  Next.js 16 App Router (React 19, Monaco Editor, Zustand Auth Store, Socket.IO Client)  │
│  • Edge Route Protection Middleware (/company/*, /assessment/*, /admin/*)               │
│  • Strict Content Security Policy (worker-src blob:, frame-ancestors 'none')            │
│  • Dual React Error Boundaries (error.tsx, global-error.tsx)                            │
+─────────────────────────────────────────────────────────────────────────────────────────+
                                    │                           ▲ (Authenticated WebSocket)
                   HTTPS REST API   │                           │ /ws (Room-scoped events)
                   (Bearer JWT)     ▼                           │
+─────────────────────────────────────────────────────────────────────────────────────────+
│                                   GATEWAY & API TIER                                    │
│  NestJS 11 Application Gateway (Global JwtAuthGuard, Global RolesGuard, Exception Filter)│
│  • Auth Module (Argon2/Bcrypt, 30s Grace Window Refresh Rotation, OAuth Handlers)       │
│  • Problems & Contests Modules (TypeORM Transaction Boundaries, Atomic SQL Counters)    │
│  • Submissions Controller & Gateway (BOLA Ownership Checks, Private Rooms)              │
│  • Assessments Service (Anti-Cheat Event Telemetry, Server-Driven Expiration Checks)     │
+─────────────────────────────────────────────────────────────────────────────────────────+
       │                     │                           │                         │
       ▼                     ▼                           ▼                         ▼
+─────────────+       +───────────────+          +───────────────+         +───────────────+
│ PostgreSQL  │       │  Redis 7      │          │  MinIO (S3)   │         │  MongoDB 7    │
│ (Relational │       │ (BullMQ Queue,│          │ (Raw Solution │         │ (Execution    │
│  Data Store,│       │  Mutex Locks, │          │  Source Code, │         │  Audit Logs & │
│  Cascades)  │       │  Leaderboard) │          │  Test Cases)  │         │  Telemetries) │
+─────────────+       +───────────────+          +───────────────+         +───────────────+
                             │
                             ▼ (Job Queue: bull:submission_queue:waiting)
+─────────────────────────────────────────────────────────────────────────────────────────+
│                                   EXECUTION TIER                                        │
│  Go 1.23+ Judge Engine (`apps/judge`)                                                   │
│  • Worker Pool (Prefetched Semaphore Throttling, Graceful Drain Shutdown)              │
│  • Input Validator (Regex ^[a-zA-Z0-9_-]+$ on submission and testcase IDs)             │
│  • Execution Runner (Direct stdin streaming, no shell wrapping)                         │
│  • Process Killer (Deferred docker rm -f preventing orphaned zombie containers)         │
│                                    │
│                                    ▼ (Docker CLI / OCI API over /var/run/docker.sock)
│  +───────────────────────────────────────────────────────────────────────────────────+  │
│  | Isolated Ephemeral Sandboxes (no-network, read-only root, 50m tmpfs, pids-limit)  |  │
│  | • C++ (gcc 13, seccomp AARCH64+x86_64, --memory-swap equal to limit)              |  │
│  | • Java (OpenJDK 21, Solution.java capitalization, dynamic memory ceiling)         |  │
│  | • Python (Python 3.12, unbuffered stdin, guaranteed solution.py placement)        |  │
│  +───────────────────────────────────────────────────────────────────────────────────+  │
+─────────────────────────────────────────────────────────────────────────────────────────+
```

---

## 🔒 Security Audit & Production Hardening (57 Findings)

The TsuniForge platform underwent an exhaustive 5-milestone forensic security audit. All **57 identified findings** have been completely patched, re-tested, and verified against empirical test harnesses.

| Category | Total Findings | Status | Key Hardening Accomplishments |
|---|---|---|---|
| **Sandbox & Isolation (`SEC-01`–`14`)** | 14 Findings | **100% Remediation** | Removed `privileged: true`; 1:1 host bind volume path alignment; eliminated `sh -c` command injection; automated `docker rm -f` on timeout; ARM64/x86_64 seccomp filter with 10 essential thread syscalls; pre-allocated consumer semaphores; exit code 137 MLE classification. |
| **Backend & Auth (`SEC-AUTH-01`–`08`)** | 8 Findings | **100% Remediation** | Eliminated OAuth unverified email auto-linking; enforced production secret strength; 30s token rotation concurrency grace window; active user database checks in JWT strategy; global `RolesGuard` registration; strict BOLA ownership checks. |
| **Data Integrity (`DATA-INTEG-01`–`05`)** | 5 Findings | **100% Remediation** | Synchronized entity/DTO non-null columns (`Company.domain`, `Assessment.inviteCode`, `Candidate.email`, `ContestTypeEnum`); TypeORM database transactions on multi-table writes; foreign key cascades; masked internal SQL exceptions. |
| **Queues & Concurrency (`CONCUR-QUEUE-01`–`06`)** | 6 Findings | **100% Remediation** | 30s automated watchdog reconciling stuck submissions to `VerdictEnum.SE`; atomic SQL increment counters; contest penalty calculation using `submission.submittedAt` timestamp; structured S3 payload schemas. |
| **Real-Time Sockets (`WS-REALTIME-01`–`05`)** | 5 Findings | **100% Remediation** | Authenticated Socket.IO handshakes; eliminated global code broadcast; scoped private rooms; distributed Redis mutex locking on leaderboard updates; CE penalty exclusion; 14-day Redis key TTLs. |
| **Frontend & Proctoring (`FE-SEC-01`–`06`, `FE-RES-01`–`06`, `PROC-01`–`02`)| 14 Findings | **100% Remediation** | Migrated JWT storage from localStorage to secure browser cookies; Next.js Edge route protection middleware; CSP & anti-clickjacking headers; dual React error boundaries; Monaco text model disposal; live proctoring event persistence; server-synchronized exam timers. |
| **Testing & Verification (`TEST-01`–`04`, `AUDIT-DOC`)** | 5 Findings | **100% Remediation** | Established automated Go and Jest test suites (100% passing); hermetic test fixtures; delivered 1,150-line authoritative `AUDIT_REPORT.md`. |

> Detailed exploitation threat models, blast radius analyses, and before/after code diffs are available in [AUDIT_REPORT.md](AUDIT_REPORT.md).

---

## ⚙️ Sandboxed Evaluation Pipeline

When code is submitted to TsuniForge, it progresses through a multi-stage security pipeline designed to isolate untrusted user execution from the host kernel:

```
[User Code Submission]
       │
       ▼ (1. Next.js Client)
Verifies session cookies; dispatches `POST /api/v1/submissions` with Bearer JWT.
       │
       ▼ (2. NestJS Gateway)
Validates problem/contest existence, checks BOLA authorization, creates database record in `PENDING` status,
uploads source code to MinIO, and pushes `SubmissionJob` to Redis queue.
       │
       ▼ (3. Go Judge Engine)
Worker pre-acquires semaphore slot, pops job via `BLPop`, validates UUIDs with `^[a-zA-Z0-9_-]+$`,
and writes source file to host-shared bind volume (`/tmp/tsuniforge/<id>`).
       │
       ▼ (4. Ephemeral Docker Sandbox)
Launches sandboxed compilation and execution with:
  ├── `--network none` (Total egress and ingress isolation)
  ├── `--read-only` (Container root filesystem is immutable)
  ├── `--tmpfs /scratch:rw,nosuid,size=50m` (In-memory scratch disk)
  ├── `--memory <limit>m --memory-swap <limit>m` (Zero host swap thrashing)
  ├── `--pids-limit 64` (Complete fork bomb mitigation)
  ├── `--security-opt no-new-privileges` (Prevents privilege escalation)
  └── `--security-opt seccomp=...` (Blocks raw sockets, ptrace, and kernel manipulation)
Test case inputs are streamed directly into `stdin` without shell interpolation.
       │
       ▼ (5. Exit Status Harvesting)
Exit code 137 is harvested as `MLE`, wall-clock timeouts trigger `docker rm -f` and return `TLE`.
       │
       ▼ (6. Durable Result Publishing)
Evaluation result is published to Redis; API watchdog reconciles stalled runs;
Socket.IO emits verdict strictly to room `submission:<id>`.
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: `>= 20.x`
- **Docker & Docker Compose**: `>= 24.x`
- **Go**: `>= 1.23` (for local judge worker development)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/ANSUJKMEHER/TsuniForge.git
cd TsuniForge

# Install monorepo dependencies
npm install
```

### 2. Launch Supporting Infrastructure
Spin up the containerized databases, object storage, and development tools:
```bash
# Start PostgreSQL 16, Redis 7, MongoDB 7, and MinIO S3
docker-compose up -d

# Optional: Launch database management GUIs (Adminer & Redis Commander)
docker-compose --profile dev-tools up -d
```

### 3. Configure Environment Variables
```bash
# Backend API configuration
cp apps/api/.env.example apps/api/.env

# Frontend client configuration
cp apps/frontend/.env.example apps/frontend/.env
```

### 4. Build Sandbox Images (Judge Engine)
```bash
cd apps/judge
docker build -t tsuniforge-sandbox-cpp -f docker/Dockerfile.cpp .
docker build -t tsuniforge-sandbox-java -f docker/Dockerfile.java .
docker build -t tsuniforge-sandbox-python -f docker/Dockerfile.python .
cd ../..
```

### 5. Launch Development Services
```bash
# Run all services concurrently (Frontend on :3000, API on :4000)
npm run dev

# Or run individual applications:
npm run dev:web    # Next.js 16 App Router on http://localhost:3000
npm run dev:api    # NestJS 11 Gateway on http://localhost:4000

# Start the Go Judge Engine worker:
cd apps/judge
go run cmd/judge/main.go
```

---

## 🔌 Service Endpoints & Management Consoles

| Service | Protocol / Port | URL | Description |
|---|---|---|---|
| **Web Frontend** | HTTP / 3000 | `http://localhost:3000` | Problem workspace, Monaco IDE, contests, assessments |
| **API Gateway** | HTTP / 4000 | `http://localhost:4000` | Core NestJS REST API |
| **Swagger Docs** | HTTP / 4000 | `http://localhost:4000/api/docs` | Interactive OpenAPI / Swagger documentation |
| **WebSocket** | WSS / 4000 | `ws://localhost:4000/ws` | Real-time submission & leaderboard events |
| **MinIO Console**| HTTP / 9001 | `http://localhost:9001` | S3 source code and testcase bucket browser |
| **Adminer** | HTTP / 8080 | `http://localhost:8080` | PostgreSQL relational database management GUI |
| **Redis Commander** | HTTP / 8081 | `http://localhost:8081` | Redis cache, queues, and sorted set inspection |

---

## 🧪 Automated Testing & Verification

TsuniForge includes a robust, multi-tier automated test suite covering judge isolation, backend security policies, and production build pipelines:

```bash
# 1. Run Go Judge Engine unit tests (all 4 packages)
cd apps/judge
go test ./... -v -count=1

# 2. Run NestJS API Jest unit and security test suites
cd apps/api
npm test

# 3. Verify Next.js 16 production build & static export
cd apps/frontend
npm run build
```

### Test Coverage Highlights
- **Go Judge (`apps/judge`)**: Verifies container security flags (`--pids-limit`, `--read-only`, `--tmpfs`), input ID alphanumeric sanitization (`^[a-zA-Z0-9_-]+$`), exit code 137 `MLE` classification, language file capitalization (`Solution.java`), and consumer graceful shutdown draining.
- **NestJS API (`apps/api`)**: Verifies production JWT secret strength assertion, 30s refresh token rotation grace window, active/banned user checks in `JwtStrategy`, global `RolesGuard` authorization, distributed Redis mutex locking on leaderboards, ICPC CE exclusion, stuck-submission watchdog reconciliation to `VerdictEnum.SE`, and anti-cheat telemetry persistence.
- **Next.js Frontend (`apps/frontend`)**: Verifies Edge route middleware compilation, CSP header registration, Suspense boundaries, and clean static/dynamic generation across all 18 routes.

---

## 📁 Repository Structure

```
TsuniForge/
├── apps/
│   ├── frontend/                  # Next.js 16 App Router (React 19, Tailwind, Monaco)
│   │   ├── src/
│   │   │   ├── app/               # Routes (/problems, /contests, /assessment, /company)
│   │   │   │   ├── error.tsx      # Route-level React error boundary
│   │   │   │   └── global-error.tsx # Root layout error boundary
│   │   │   ├── middleware.ts      # Next.js Edge route protection middleware
│   │   │   ├── stores/            # Zustand stores (secure cookie auth store)
│   │   │   └── lib/               # Resilient API client with 401 refresh interceptor
│   │   └── next.config.ts         # Security headers, Content Security Policy
│   │
│   ├── api/                       # NestJS 11 Application Gateway (TypeScript)
│   │   ├── src/
│   │   │   ├── database/          # TypeORM entities, PostgreSQL data sources
│   │   │   ├── modules/
│   │   │   │   ├── auth/          # JWT, 30s grace rotation, OAuth, RolesGuard
│   │   │   │   ├── submissions/   # BullMQ queue, WebSocket gateway, watchdog
│   │   │   │   ├── contests/      # Distributed mutex leaderboard, plagiarism
│   │   │   │   └── assessments/   # Company portal, candidate anti-cheat telemetry
│   │   │   └── common/            # Sanitized AllExceptionsFilter, S3 MinIO service
│   │   └── test/                  # Automated Jest unit & regression test suites
│   │
│   └── judge/                     # Go 1.23+ High-Performance Online Judge Engine
│       ├── cmd/judge/             # Main worker daemon with graceful signal drain
│       ├── internal/
│       │   ├── config/            # Config parsing, default limits, environment mapping
│       │   ├── executor/          # Ephemeral Docker OCI sandbox runner & killer
│       │   ├── models/            # SubmissionJob & JudgeResult payloads
│       │   └── queue/             # Semaphore-throttled Redis queue consumer
│       ├── configs/security/      # Custom seccomp filter (AARCH64 + x86_64)
│       └── docker/                # Hardened Dockerfiles (C++, Java, Python)
│
├── deploy/                        # Production orchestration & VM provisioning
│   ├── docker-compose.prod.yml    # Hardened production Compose (unprivileged judge)
│   └── setup-server.sh            # Oracle Cloud ARM64 / Ubuntu initialization script
│
├── packages/
│   └── common/                    # Shared TypeScript interfaces, enums, contracts
│
├── AUDIT_REPORT.md                # 1,150-line authoritative security audit report
├── PROJECT.md                     # Monorepo technical specification & milestone ledger
├── docker-compose.yml             # Local development multi-container stack
└── turbo.json                     # Turborepo task orchestration pipeline
```

---

## 🗺️ Architectural Roadmap

- [ ] **gVisor (`runsc`) MicroVM Runtime**: Transition sandboxed code execution from sibling Docker containers to Google's gVisor user-space kernel for hyper-isolated execution.
- [ ] **PostgreSQL Row-Level Security (RLS)**: Enforce database-level multi-tenant isolation across hiring assessment entities.
- [ ] **Redis Streams Consumer Groups**: Migrate judge queue from Redis lists to distributed consumer groups with cross-region auto-scaling and persistent DLQ replays.
- [ ] **Kernel cgroup v2 Direct Polling**: Integrate `/sys/fs/cgroup` controller polling in Go to report microsecond-exact CPU runtimes and peak memory attribution.
- [ ] **Asynchronous Plagiarism Workers**: Offload pairwise winnowing scans to background BullMQ queues using MinHash locality-sensitive hashing.

---

## 📜 License & Acknowledgments

This project is open-source software licensed under the **[MIT License](LICENSE)**.

Designed and engineered for resilient, fair, and secure competitive programming and technical hiring worldwide.
