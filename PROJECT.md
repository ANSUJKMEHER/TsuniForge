# Project: TsuniForge Security Audit & Full-Stack Remediation

## Architecture
TsuniForge is a high-concurrency coding contest, online judge, and hiring assessment platform composed of:
1. **Frontend (`apps/frontend`)**: Next.js 16 (App Router), React 19, Tailwind CSS, Monaco Editor, Zustand state store, TanStack React Query, Socket.IO client.
2. **Backend API (`apps/api`)**: NestJS 11, TypeORM, PostgreSQL, Redis, Socket.IO gateway, MinIO (S3 compatible), MongoDB (audit logging).
3. **Judge Engine (`apps/judge`)**: Go 1.23+ high-performance worker consuming evaluation jobs from Redis and executing compiled C++, Java, and Python solutions inside isolated Docker sandbox containers.
4. **Infrastructure & Deployment (`deploy/`, `docker-compose.yml`)**: Production Docker Compose configurations with network isolation, persistent volumes, and PostgreSQL/Redis/MinIO containers.

```
+-----------------------------------------------------------------------------------------+
|                                    Client Tier                                          |
|  Next.js 16 App Router (Monaco Editor, Zustand Auth, Socket.IO Client, React Query)    |
+-----------------------------------------------------------------------------------------+
                                    │                           ▲ (WebSocket / Submissions)
                   HTTPS REST API   │                           │
                                    ▼                           │
+-----------------------------------------------------------------------------------------+
|                                    Backend Tier                                         |
|  NestJS API Gateway & Controllers (JWT / RBAC Guards, BullMQ Queue, Socket.IO Gateway)  |
+-----------------------------------------------------------------------------------------+
       │                     │                           │                         │
       ▼                     ▼                           ▼                         ▼
+-------------+       +---------------+          +---------------+         +---------------+
| PostgreSQL  |       | Redis         |          | MinIO (S3)    |         | MongoDB       |
| (Relational |       | (Queues, Pub- |          | (Code Source, |         | (Audit Logs)  |
|  Data Store)|       |  Sub, State)  |          |  Test Cases)  |         +---------------+
+-------------+       +---------------+          +---------------+
                             │
                             ▼ (Job Queue: submission_queue)
+-----------------------------------------------------------------------------------------+
|                                  Execution Tier                                         |
|  Go Judge Engine (Worker Pool, Semaphore Throttling, cgroup/tmpfs/seccomp enforcement)  |
|                                    │                                                    |
|                                    ▼ (Docker CLI / OCI API)                             |
|  +-----------------------------------------------------------------------------------+  |
|  | Isolated Ephemeral Sandboxes (no-network, read-only root, 50m tmpfs, pids-limit)  |  |
|  +-----------------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------------+
```

## Feature Inventory
Every audited vulnerability, architectural flaw, and resilience gap mapped to its remediation milestone:

| # | Feature / Issue ID | Description | Severity | Milestone | Source |
|---|---|---|---|---|---|
| 1 | `SEC-01` | Privileged Flag & Docker Socket Exposure on Judge Container (`deploy/docker-compose.prod.yml`) | CRITICAL | M1 | explorer_survey_1 |
| 2 | `SEC-02` | DooD Volume Path Mismatch Architecture Failure (`apps/judge/internal/executor/executor.go`) | CRITICAL | M1 | explorer_survey_1 |
| 3 | `SEC-03` | Shell Command Injection via Unsanitized Test Case ID in `sh -c` (`apps/judge/internal/executor/executor.go`) | HIGH | M1 | explorer_survey_1 |
| 4 | `SEC-04` | Permanent Host Disk Exhaustion via Uncleaned Submission Workdirs (`apps/judge/internal/executor/executor.go`) | HIGH | M1 | explorer_survey_1 |
| 5 | `SEC-05` | Orphaned Zombie Containers & CPU Saturation on Execution Timeout (`apps/judge/internal/executor/executor.go`) | HIGH | M1 | explorer_survey_1 |
| 6 | `SEC-06` | Missing Compiler PID Limits Permitting Fork Bomb Starvation (`apps/judge/internal/executor/executor.go`) | HIGH | M1 | explorer_survey_1 |
| 7 | `SEC-07` | Non-Functional Seccomp Profile Missing ARM64 & Thread Syscalls (`apps/judge/configs/security/seccomp.json`) | HIGH | M1 | explorer_survey_1 |
| 8 | `SEC-08` | Unreliable Queue Consumption with In-Memory Job Loss (`apps/judge/internal/queue/consumer.go`) | HIGH | M1 | explorer_survey_1 |
| 9 | `SEC-09` | Missing Swap Limits Permitting Host Disk Thrashing (`apps/judge/internal/executor/executor.go`) | MEDIUM | M1 | explorer_survey_1 |
| 10 | `SEC-10` | Missing Read-Only Root Filesystem & Unenforced Tmpfs Size (`apps/judge/internal/executor/executor.go`) | MEDIUM | M1 | explorer_survey_1 |
| 11 | `SEC-11` | Non-Root Sandbox User Permission Denial on Mounted Directory (`apps/judge/docker/Dockerfile.*`) | MEDIUM | M1 | explorer_survey_1 |
| 12 | `SEC-12` | Fire-and-Forget Pub/Sub Result Delivery Causing Stuck Submissions (`apps/judge/internal/queue/consumer.go`) | MEDIUM | M1 | explorer_survey_1 |
| 13 | `SEC-13` | Hardcoded Memory Metrics (5120KB) & Ignored Job Limits (`apps/judge/internal/executor/executor.go`) | MEDIUM | M1 | explorer_survey_1 |
| 14 | `SEC-14` | Flawed OOM Exit Status 137 Detection Misclassifying MLE as RE (`apps/judge/internal/executor/executor.go`) | MEDIUM | M1 | explorer_survey_1 |
| 15 | `SEC-AUTH-01` | Dangling OAuth Auto-Linking with Unverified Email (`apps/api/src/modules/auth/auth.service.ts`) | CRITICAL | M2 | explorer_survey_2 |
| 16 | `DATA-INTEG-01` | Entity / DTO Schema Discrepancies Causing Fatal DB Constraint Crashes (`Company.domain`, `Assessment.inviteCode`, `Candidate.email`, `ContestTypeEnum`) | CRITICAL | M2 | explorer_survey_2 |
| 17 | `CONCUR-QUEUE-01` | Raw Redis Pub/Sub Worker Result Listener Causes Permanent Job Loss & Starvation (`apps/api/src/modules/submissions/judge-queue.service.ts`) | CRITICAL | M2 | explorer_survey_2 |
| 18 | `WS-REALTIME-01` | Unauthenticated Gateway with Global Broadcast of Code & Evaluation Data (`apps/api/src/modules/submissions/submissions.gateway.ts`) | CRITICAL | M2 | explorer_survey_2 |
| 19 | `WS-REALTIME-02` | Redis Read-Modify-Write Race Condition in Contest Leaderboard Calculation (`apps/api/src/modules/contests/leaderboard.service.ts`) | CRITICAL | M2 | explorer_survey_2 |
| 20 | `SEC-AUTH-02` | Hardcoded JWT Fallback Secrets in Production Boot Path (`apps/api/src/modules/auth/auth.module.ts`) | HIGH | M2 | explorer_survey_2 |
| 21 | `SEC-AUTH-03` | Refresh Token Rotation Concurrency Flaw Causing False Session Invalidation (`apps/api/src/modules/auth/auth.service.ts`) | HIGH | M2 | explorer_survey_2 |
| 22 | `SEC-AUTH-04` | Missing Database Status & Role Validation in `JwtStrategy` (`apps/api/src/modules/auth/strategies/jwt.strategy.ts`) | HIGH | M2 | explorer_survey_2 |
| 23 | `SEC-AUTH-05` | Missing Global `RolesGuard` Registration Permitting RBAC Bypass (`apps/api/src/app.module.ts`) | HIGH | M2 | explorer_survey_2 |
| 24 | `SEC-AUTH-06` | Broken Object-Level Authorization (BOLA) in Assessments & Plagiarism (`apps/api/src/modules/assessments/assessments.controller.ts`) | HIGH | M2 | explorer_survey_2 |
| 25 | `DATA-INTEG-02` | Absence of Database Migrations & Unsafe Production Synchronize (`apps/api/src/database/data-source.ts`) | HIGH | M2 | explorer_survey_2 |
| 26 | `DATA-INTEG-03` | Missing Database Transaction Boundaries on Multi-Table Writes (`apps/api/src/modules/problems/problems.service.ts`) | HIGH | M2 | explorer_survey_2 |
| 27 | `DATA-INTEG-04` | Missing Foreign Key Deletion Cascades on `Submission.problem` (`apps/api/src/database/entities/submission.entity.ts`) | HIGH | M2 | explorer_survey_2 |
| 28 | `CONCUR-QUEUE-02` | Pseudo-BullMQ Implementation with Unmanaged `LPUSH` Bypassing Queuing Guarantees (`apps/api/src/modules/submissions/judge-queue.service.ts`) | HIGH | M2 | explorer_survey_2 |
| 29 | `CONCUR-QUEUE-03` | Non-Atomic Read-Modify-Write on Problem Acceptance Statistics (`apps/api/src/modules/problems/problems.service.ts`) | HIGH | M2 | explorer_survey_2 |
| 30 | `CONCUR-QUEUE-04` | In-Memory `pendingCustomRuns` Map Breaking Multi-Replica Horizontal Scaling (`apps/api/src/modules/submissions/judge-queue.service.ts`) | HIGH | M2 | explorer_survey_2 |
| 31 | `WS-REALTIME-03` | Out-of-Order Worker Results Dropping ICPC Wrong Attempt Penalty Points (`apps/api/src/modules/contests/leaderboard.service.ts`) | HIGH | M2 | explorer_survey_2 |
| 32 | `SEC-AUTH-07` | Missing Rate Limiting & Brute-Force Throttling Across Endpoints (`apps/api/src/main.ts`) | MEDIUM | M2 | explorer_survey_2 |
| 33 | `SEC-AUTH-08` | User Enumeration via Timing Discrepancies in Auth Flow (`apps/api/src/modules/auth/auth.service.ts`) | MEDIUM | M2 | explorer_survey_2 |
| 34 | `DATA-INTEG-05` | Information Disclosure of Internal SQL/Schema Exceptions via `AllExceptionsFilter` (`apps/api/src/common/filters/all-exceptions.filter.ts`) | MEDIUM | M2 | explorer_survey_2 |
| 35 | `CONCUR-QUEUE-05` | Massive Unbounded Test Case Payload Injected into Redis Queue (`apps/api/src/modules/submissions/judge-queue.service.ts`) | MEDIUM | M2 | explorer_survey_2 |
| 36 | `CONCUR-QUEUE-06` | Contest Penalty Time Calculated Using Worker Completion Timestamp Instead of Submission Timestamp (`apps/api/src/modules/submissions/judge-queue.service.ts`) | MEDIUM | M2 | explorer_survey_2 |
| 37 | `WS-REALTIME-04` | Unbounded Redis Key Growth & Memory Leak in Leaderboard Storage (`apps/api/src/modules/contests/leaderboard.service.ts`) | MEDIUM | M2 | explorer_survey_2 |
| 38 | `WS-REALTIME-05` | Synchronous O(N^2) Winnowing Plagiarism Algorithm Blocking Event Loop (`apps/api/src/modules/contests/plagiarism.service.ts`) | MEDIUM | M2 | explorer_survey_2 |
| 39 | `FE-SEC-01` | LocalStorage Token Storage in Zustand Persist Vulnerable to XSS (`apps/frontend/src/stores/auth.store.ts`) | CRITICAL | M3 | explorer_survey_3 |
| 40 | `FE-SEC-02` | Total Absence of Next.js Route Protection Middleware (`apps/frontend/src/middleware.ts`) | HIGH | M3 | explorer_survey_3 |
| 41 | `FE-SEC-03` | Missing Content Security Policy (CSP) & Frame Protection Headers (`apps/frontend/next.config.ts`) | HIGH | M3 | explorer_survey_3 |
| 42 | `FE-SEC-04` | Hardcoded `"dummy_token"` in Contest Registration Causing 401 Unauthorized (`apps/frontend/src/app/contests/[id]/page.tsx`) | HIGH | M3 | explorer_survey_3 |
| 43 | `FE-SEC-05` | Dropped Private Contest Passwords During Registration (`apps/frontend/src/app/contests/[id]/page.tsx`) | MEDIUM | M3 | explorer_survey_3 |
| 44 | `FE-SEC-06` | Dead OAuth Buttons and Broken Navigation Links (`apps/frontend/src/app/login/page.tsx`) | MEDIUM | M3 | explorer_survey_3 |
| 45 | `FE-RES-01` | Total Absence of React Error Boundaries (`error.tsx`, `global-error.tsx`) (`apps/frontend/src/app/`) | HIGH | M3 | explorer_survey_3 |
| 46 | `FE-RES-02` | Monaco Editor Memory Leaks & Full Component Re-renders on Keystroke (`apps/frontend/src/app/problems/[slug]/page.tsx`) | MEDIUM | M3 | explorer_survey_3 |
| 47 | `FE-RES-03` | Submission Polling `setInterval` Unmount Memory Leak (`apps/frontend/src/app/problems/[slug]/page.tsx`) | HIGH | M3 | explorer_survey_3 |
| 48 | `FE-RES-04` | Language Switching Silently Overwrites User Code Without Confirmation (`apps/frontend/src/app/problems/[slug]/page.tsx`) | MEDIUM | M3 | explorer_survey_3 |
| 49 | `FE-RES-05` | WebSocket Transport Lockout (`transports: ["websocket"]`) & Stale Leaderboard State (`apps/frontend/src/app/contests/[id]/leaderboard/page.tsx`) | HIGH | M3 | explorer_survey_3 |
| 50 | `FE-RES-06` | Unhandled 204/HTML Response Parsing & Missing 401 Auto-Refresh Interceptor (`apps/frontend/src/lib/api.ts`) | MEDIUM | M3 | explorer_survey_3 |
| 51 | `PROC-01` | Assessment Anti-Cheat Proctoring Purely Client-Side Mocked Without API Persistence (`apps/frontend/src/app/assessment/[id]/page.tsx`) | CRITICAL | M3 | explorer_survey_3 |
| 52 | `PROC-02` | Assessment Timer Client-Controlled Resetting to 90m on Reload (`apps/frontend/src/app/assessment/[id]/page.tsx`) | HIGH | M3 | explorer_survey_3 |
| 53 | `TEST-01` | 0.0% Automated Test Coverage Across Entire Repository (`apps/api`, `apps/judge`, `apps/frontend`) | CRITICAL | M4 | explorer_survey_3 |
| 54 | `TEST-02` | Untested Judge Queue Failures & Worker Crash Recovery | CRITICAL | M4 | explorer_survey_3 |
| 55 | `TEST-03` | Untested Contest ICPC Scoring & Tie-Breaker Logic | HIGH | M4 | explorer_survey_3 |
| 56 | `TEST-04` | Absence of Test Fixtures, Mock Factories, and Integration Harnesses | HIGH | M4 | explorer_survey_3 |
| 57 | `AUDIT-DOC` | Comprehensive Audit Document with Severity Classification, File/Line Citations & Threat Models | CRITICAL | M5 | original_request |

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Sandbox Isolation & Judge Engine Security Remediation | `apps/judge`, `deploy/docker-compose.prod.yml`, `apps/judge/docker/*`, `apps/judge/configs/security/seccomp.json` | None | DONE (All SEC-01 through SEC-14 remediated and verified with tests) |
| M2 | Backend API, Auth, Database & Concurrency Remediation | `apps/api` (Auth, Database, Submissions, Contests, Assessments, Common) | None | DONE (All 21 backend flaws remediated, 6 test suites with 27 unit tests passing, build passes) |
| M3 | Frontend Resilience, Client Security & Proctoring Remediation | `apps/frontend` (Auth store, Next.js middleware, Error boundaries, Monaco, Leaderboard, Assessments) | M2 (API contracts) | DONE (All 14 frontend & proctoring flaws remediated, Next.js 16 build passing with 0 errors) |
| M4 | Automated Test Suite, Verification Fixtures & Reproduction Harness | `apps/api/test/`, `apps/judge/*_test.go`, `apps/frontend`, reproduction test scripts | M1, M2, M3 | DONE (Go Judge unit tests 100% pass across 4 packages, NestJS 8 test suites / 42 tests pass, hermetic mock fixtures) |
| M5 | Final Verification, Consolidated Audit Document & E2E Validation | `AUDIT_REPORT.md`, end-to-end test execution across all 3 apps, final verification against user acceptance criteria | M1, M2, M3, M4 | DONE (Authoritative AUDIT_REPORT.md compiled at project root with all 57 findings, threat models, remediations, and verification attestation) |

## Interface Contracts

### 1. Judge Engine ↔ Backend API Queue Protocol (`apps/judge` ↔ `apps/api`)
- **Submission Queue Name**: `bull:submission_queue:waiting` (or Redis Stream `stream:submissions`)
- **Result Queue / Channel**: Persistent Redis Stream `stream:submission_results` (with consumer groups) or durable List `queue:submission_results` to guarantee at-least-once delivery with message acknowledgments.
- **Job Payload (`SubmissionJob`)**:
  - `submission_id`: UUID string (validated: `^[a-zA-Z0-9_-]+$`)
  - `language`: `"cpp"` \| `"java"` \| `"python"`
  - `source_code`: Code string or S3/MinIO presigned URI
  - `time_limit_ms`: Integer (milliseconds, e.g. 1000 to 5000)
  - `memory_limit_mb`: Integer (MB, e.g. 64 to 512)
  - `test_cases`: Array of `{ id: string, input: string, expected_output: string, score_weight: number }`
- **Result Payload (`JudgeResult`)**:
  - `submission_id`: UUID string
  - `verdict`: `"AC"` \| `"WA"` \| `"TLE"` \| `"MLE"` \| `"CE"` \| `"RE"` \| `"SE"`
  - `score`: Float (0.0 to 100.0)
  - `runtime_ms`: Integer
  - `memory_kb`: Integer
  - `compile_error`: String (truncated/sanitized)
  - `test_case_results`: Array of `{ test_case_id: string, verdict: string, runtime_ms: number, memory_kb: number, stderr?: string }`

### 2. Frontend ↔ Backend Socket.IO Protocol (`apps/frontend` ↔ `apps/api`)
- **Connection Handshake**:
  - Requires JWT `Authorization: Bearer <accessToken>` or query param `?token=<accessToken>`. Unauthenticated sockets are rejected immediately with `401 Unauthorized`.
- **Rooms**:
  - `submission:<submissionId>`: Only accessible to the submission owner or admin users.
  - `contest:<contestId>:leaderboard`: Public or restricted to registered contest participants.
- **Events**:
  - Client -> Server: `join_submission { submissionId }`, `leave_submission { submissionId }`, `join_contest { contestId }`.
  - Server -> Client: `submission_progress { submissionId, testCaseIndex, totalTestCases, verdict }` emitted ONLY to `submission:<submissionId>`.
  - Global `submission_update` broadcast is REMOVED to protect confidentiality and prevent network flooding.

### 3. Frontend ↔ Backend Anti-Cheat Assessment Protocol (`apps/frontend` ↔ `apps/api`)
- **Report Cheat Event**: `POST /api/v1/assessments/:id/cheat-event`
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ candidateId: string, eventType: 'tab_switch' | 'blur' | 'copy_paste' | 'fullscreen_exit', timestamp: string, metadata?: any }`
- **Assessment Submission**: `POST /api/v1/assessments/:id/submit`
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ candidateId: string, answers: Array<{ questionId: string, code: string, language: string }> }`

## Code Layout
- `apps/judge/`:
  - `cmd/judge/main.go`
  - `internal/config/config.go`, `config_test.go`
  - `internal/executor/executor.go`, `executor_test.go`
  - `internal/models/models.go`, `models_test.go`
  - `internal/queue/consumer.go`, `consumer_test.go`
  - `configs/security/seccomp.json`
  - `docker/Dockerfile.*`
- `apps/api/`:
  - `src/database/entities/*.entity.ts`
  - `src/modules/auth/` (`auth.service.ts`, `auth.module.ts`, `strategies/jwt.strategy.ts`, `guards/roles.guard.ts`)
  - `src/modules/submissions/` (`submissions.service.ts`, `judge-queue.service.ts`, `submissions.gateway.ts`)
  - `src/modules/contests/` (`contests.service.ts`, `leaderboard.service.ts`, `plagiarism.service.ts`)
  - `src/modules/assessments/` (`assessments.service.ts`, `assessments.controller.ts`, `dto/`)
  - `src/common/filters/all-exceptions.filter.ts`
  - `src/app.module.ts`, `main.ts`
  - `test/` (e2e and unit test suites, mock fixtures)
- `apps/frontend/`:
  - `src/middleware.ts` (Next.js route protection)
  - `src/app/error.tsx`, `src/app/global-error.tsx` (Error boundaries)
  - `src/stores/auth.store.ts` (Session & token management)
  - `src/lib/api.ts` (HTTP client with 401 refresh interceptor)
  - `src/app/problems/[slug]/page.tsx` (Monaco lifecycle cleanup, polling cleanup)
  - `src/app/contests/[id]/page.tsx` (Contest registration auth & password)
  - `src/app/contests/[id]/leaderboard/page.tsx` (WebSocket reconnect & state resync)
  - `src/app/assessment/[id]/page.tsx` (Proctoring events & server submission)
  - `next.config.ts` (Security headers, CSP)
- `deploy/`:
  - `docker-compose.prod.yml` (Hardened container configs, no privileged flag, shared volumes)
- `AUDIT_REPORT.md` (Project root: Consolidated comprehensive audit deliverable)
