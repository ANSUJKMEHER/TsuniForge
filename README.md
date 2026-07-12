# 🔥TsuniForge

> **AI-Powered Distributed Coding Assessment Platform**

TsuniForge is a scalable online coding platform where users can solve programming problems, participate in real-time contests, and receive AI-powered feedback through secure sandboxed code execution.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)
![Go](https://img.shields.io/badge/Go-00ADD8?logo=go&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)

---

## ✨ Key Features

- **🏗️ Microservices Architecture** — NestJS API, Go Judge Engine, Next.js Frontend
- **🔒 Secure Code Execution** — Docker sandboxes with seccomp, cgroups, and network isolation
- **⚡ Real-Time Contests** — WebSocket-powered live leaderboards with O(log N) rank updates
- **🤖 AI Code Review** — Gemini-powered analysis of time/space complexity and optimization suggestions
- **🏢 Company Portal** — Assessment creation, proctoring, and candidate evaluation
- **📊 Analytics Dashboard** — Skill radar charts, submission heatmaps, and rating history
- **🛡️ Plagiarism Detection** — Winnowing algorithm and AST comparison for rated contests

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Next.js   │────▶│   NestJS API    │────▶│  Go Judge    │
│  Frontend   │     │  (TypeScript)   │     │   Engine     │
└─────────────┘     └─────────────────┘     └──────────────┘
                           │                       │
                    ┌──────┴──────┐         ┌──────┴──────┐
                    │             │         │             │
              ┌─────▼─┐   ┌──────▼┐   ┌────▼───┐  ┌─────▼─┐
              │ Postgres│   │ Redis │   │ Docker │  │MongoDB│
              │  (SQL)  │   │(Cache)│   │Sandbox │  │(Logs) │
              └─────────┘   └───────┘   └────────┘  └───────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- Docker & Docker Compose
- Go 1.22+ (for judge engine)

### 1. Clone and Install

```bash
git clone https://github.com/ANSUJKMEHER/TsuniForge.git
cd TsuniForge
npm install
```

### 2. Start Infrastructure

```bash
# Start PostgreSQL, Redis, MongoDB, MinIO
docker-compose up -d

# With dev tools (Adminer, Redis Commander)
docker-compose --profile dev-tools up -d
```

### 3. Configure Environment

```bash
# Copy and edit the API environment file
cp apps/api/.env.example apps/api/.env
# Edit with your credentials
```

### 4. Run Development Servers

```bash
# Run all services
npm run dev

# Or run individually
npm run dev:api    # NestJS on :4000
npm run dev:web    # Next.js on :3000
```

### 5. Access

- **Frontend**: http://localhost:3000
- **API**: http://localhost:4000
- **API Docs (Swagger)**: http://localhost:4000/api/docs
- **Adminer (DB)**: http://localhost:8080
- **Redis Commander**: http://localhost:8081
- **MinIO Console**: http://localhost:9001

## 📁 Project Structure

```
tsuniforge/
├── apps/
│   ├── api/          # NestJS Backend (TypeScript)
│   ├── frontend/     # Next.js Frontend (TypeScript)
│   └── judge/        # Go Judge Engine
├── packages/
│   └── common/       # Shared types, constants, utils
├── docker-compose.yml
├── turbo.json
└── package.json
```

## 🗄️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Monaco Editor |
| API | NestJS, TypeScript, TypeORM, Passport.js |
| Judge | Go, Docker SDK |
| Database | PostgreSQL, Redis, MongoDB |
| Storage | MinIO (S3-compatible) |
| Queue | BullMQ (Redis-backed) |
| Real-time | Socket.IO |
| AI | Gemini API |
| DevOps | Docker, Docker Compose, GitHub Actions |

## 🔑 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login |
| GET | `/api/v1/problems` | List problems |
| POST | `/api/v1/submissions` | Submit code |
| GET | `/api/v1/contests` | List contests |
| POST | `/api/v1/company/assessments` | Create assessment |

Full API documentation available at `/api/docs` (Swagger).

## 📝 License

MIT License — see [LICENSE](LICENSE) for details.
