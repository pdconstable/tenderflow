# Tender OS

Development foundation. The engineering constitution and mandatory standards live
in [CLAUDE.md](CLAUDE.md) and [docs/engineering/](docs/engineering/) — read the
relevant documents before starting work.

This repository currently contains the application scaffold, canonical
environment validation, Supabase client boundaries, static safety guards and CI
enforcement. **No customer-facing product features are implemented yet.**

## Requirements

- Node.js 20.9+ (CI pins Node 24)
- pnpm 11.18.0 (via Corepack)

## Setup

```bash
corepack use pnpm@11.18.0
pnpm install
cp .env.example .env.local   # then fill in local values (never commit .env.local)
```

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Local dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm typecheck` | TypeScript, no emit |
| `pnpm lint` | ESLint |
| `pnpm test:unit` | Vitest unit tests |
| `pnpm test:guards` | Guard self-tests (fixtures) |
| `pnpm check:guards` | Run the static guards over `src/` |
| `pnpm check` | typecheck + lint + unit + guards + guard scan |
| `pnpm test:e2e` | Playwright (Chromium) |
