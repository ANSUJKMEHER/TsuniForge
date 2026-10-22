# Contributing to TsuniForge

Thanks for your interest! Here's how to get set up.

## Development setup

1. Fork and clone the repo
2. Run `npm install` at the root
3. Start infrastructure: `docker-compose up -d`
4. Copy env files: `cp apps/api/.env.example apps/api/.env`
5. Run `npm run dev`

## Code structure

- `apps/frontend` — Next.js 16 with App Router
- `apps/api` — NestJS 11 REST + WebSocket API
- `apps/judge` — Go judge engine
- `packages/common` — Shared TypeScript types

## Before submitting a PR

- Run `npm run lint` and fix any warnings
- Run `npm run check-types` for TypeScript errors
- Make sure `apps/frontend` builds cleanly: `cd apps/frontend && npm run build`
- If you touched the judge, run `cd apps/judge && go test ./...`
- Write clear commit messages

## Branching

- `main` — stable branch
- Feature branches: `feat/<description>`
- Bug fixes: `fix/<description>`

## Questions?

Open an issue — happy to help.
