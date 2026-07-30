# CLAUDE.md — Tender OS engineering constitution

This file is the first and highest-priority instruction file. It holds the
project hard stops, the safety rules and the priority order, and it routes you to
the focused engineering documents under [docs/engineering/](docs/engineering/).
Those documents are mandatory extensions of this file, not optional guidance. No
rule is optional merely because it lives in another file. Safety rules always
outrank implementation preferences, and the project hard stops below override
everything.

## Project identity and hard stops (override everything)

- Supabase project ref for this repo is vrngjoorzwcgagwpzzyt (Tender flow).
  NEVER touch wcxxhzenwqlukhtphjyc (V5 JMS Direct), a different live
  business system in a sibling folder. If any command would target it, STOP.
- ALWAYS prefix Supabase CLI commands with `source .env.local &&` so they
  authenticate as this project's account. Never run `supabase login`.
- Never read, reference, or modify files outside this repo. Sibling folders
  (especially ~/dev/v5-jms-rebuild) are off limits.
- GitHub remote is github-new (pdconstable/tenderflow). Never push to
  Pro-EV-Main-Organisation.
- This repo is PUBLIC. Never commit secrets, tokens, or .env files.
- DESTRUCTIVE SCRIPT SAFETY: No script that deletes, seeds, resets, truncates,
  or otherwise mutates/destroys data may be written or run without calling the
  safety guard FIRST, before any DB access. Make this the literal first line:
    source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/supabase_guard.sh"
  (adjust the relative path to reach scripts/lib/supabase_guard.sh). The guard
  selects the connection from one deterministic repo-scoped source, verifies the
  whole destination and project identity, and aborts non-zero unless it is
  vrngjoorzwcgagwpzzyt; it hard-refuses wcxxhzenwqlukhtphjyc by name. Ambient
  DATABASE_URL/SUPABASE_DB_URL are prohibited; TENDERFLOW_DATABASE_URL is the
  only permitted override. Full connection contract: docs/engineering/security.md
  (Database connection guard contract).

## Priority order

When two instructions appear to conflict, the earlier category here takes
precedence. Project hard stops above override every category.

1. Wrong-project and destructive-operation safety
2. Tenant isolation and RLS
3. No silent writes
4. State-machine integrity
5. Environment and communication safety
6. Data scale and query correctness
7. Canonical product state
8. AI provenance and customer approval
9. Design consistency and accessibility
10. General coding preferences

## Git workflow

- Commit and push directly to `main`. No branches, no PRs.
- When I say "push", commit any pending work with a sensible message and push
  to main.
- Always `git add <specific/paths>`. Never `git add -A` or `git add -u <dir>` —
  it sweeps in files deliberately left out and can commit a tree that
  references uncommitted modules.
- Never force push.
- tsc/tests verify the WORKING tree; the deploy builds the COMMITTED tree.
  Untracked files make the two disagree, so local green proves nothing.
- Never commit .env files or secrets. This repo is PUBLIC.
- No branches or pull requests are required during solo development. Every push
  must pass the required checks (see [testing-and-release.md](docs/engineering/testing-and-release.md)).
  Before production launch or adding developers, review whether to introduce
  protected branches and pull requests.

## Change discipline

1. Scope before refactor — read-only "blast radius" report first, pause for
   confirmation before editing.
2. Verify against the live system before claiming "done" — run the actual
   query/column read-only. Don't trust types or assumptions.
3. Flag, don't silently fix — if something unexpected surfaces, STOP and
   surface it. Never quietly change what's "valid" to make a refactor compile.
4. Isolated commits + full suite before push — unrelated fixes get their own
   commit; run tests + tsc before pushing.
5. Prove a new guard works — plant a bogus value, confirm it fails, then
   revert. Never `git checkout -- <file>` to revert a temp tweak on a file
   with uncommitted work.

## When asked for an audit

Read-only investigation first, report findings, get confirmation, then build.

## Core database rules

- Apply migrations with `supabase db push --linked` so they're recorded in the
  migration ledger. Do NOT use `db query -f` to apply — it runs the SQL without
  recording it and causes drift. `db query` is for read-only verification only.
- Verify by OUTCOME after any migration — run a read-only query showing the
  new column/row count.
- Additive changes (ADD COLUMN, CREATE TABLE, ADD INDEX) can run autonomously.
- NEVER run DROP TABLE, DROP COLUMN, TRUNCATE, or DELETE without WHERE without
  flagging it in plain English first and waiting for confirmation.
- Every destructive/seed/reset script calls the Supabase guard as its first line.
- Index assessment, query shape and data-scale rules: see
  [data-access-and-scale.md](docs/engineering/data-access-and-scale.md). Every
  new tenant-owned table must enable RLS with explicit policies in the same
  migration: see [security.md](docs/engineering/security.md).

## Non-negotiable code rules

- No `as any`, no @ts-ignore / @ts-nocheck.
- A "use server" file may only export async functions — a sync export passes
  tsc but fails the Next build. Pure helpers go in a plain module.
- File size: server actions ≤400 lines, components ≤500. Split before
  exceeding; never duplicate a function across files, move it.
- Every server action: try/catch, return { success, data?, error? }, validate
  input with Zod. Never `.catch(() => {})`.
- Mutations are server actions only — no client-side DB writes.
- All list queries need `.limit()`.
- Brand colours via CSS variables, never hardcoded hex.

## Mandatory engineering principles

These are hard requirements, summarised here and specified in full in the
engineering documents. They are not suggestions.

- **Deny-by-default tenant isolation.** Every customer read and mutation is
  tenant-scoped; never trust an organisation ID from the browser. → [security.md](docs/engineering/security.md)
- **Organisation, legal entity and trading identity are distinct first-class
  records.** Every bid resolves to an exact legal entity and trading identity;
  trading names never obscure the legal contracting party; customer analysis is
  never stored on global procurement records. → [multi-tenant-domain.md](docs/engineering/multi-tenant-domain.md)
- **RLS enabled on every tenant-owned table**, with explicit policies in the
  same migration, and mechanically tested. Documentation alone is insufficient. → [security.md](docs/engineering/security.md)
- **No `USING true` and no `WITH CHECK true`.** → [security.md](docs/engineering/security.md)
- **No policy without an explicit `TO` clause.** → [security.md](docs/engineering/security.md)
- **No unsafe token-existence policies** such as `share_token IS NOT NULL`; a
  token must match the exact scoped record, unexpired and unrevoked. → [security.md](docs/engineering/security.md)
- **No silent writes.** Check every error and affected-row count; never
  `.catch(() => {})`, never mask a failed query with `count ?? 0` or `rows ?? []`.
  Distinguish zero / no-data / unavailable / failed / unauthorised. → [reliability-and-state.md](docs/engineering/reliability-and-state.md)
- **No raw status updates outside the canonical state machine.** → [reliability-and-state.md](docs/engineering/reliability-and-state.md)
- **Idempotency for payments and communications.** A retry must never duplicate
  a payment, invoice, credit, email, job or audit event. → [reliability-and-state.md](docs/engineering/reliability-and-state.md)
- **Non-production communication blocking.** Outside production, refuse real
  recipients, block live Stripe, and never process the historical back-catalogue
  before a deliberate cutover. → [reliability-and-state.md](docs/engineering/reliability-and-state.md)
- **Stable, server-side pagination** with a deterministic order; never paginate
  a complete dataset in the browser. → [data-access-and-scale.md](docs/engineering/data-access-and-scale.md)
- **Never treat a limited result set as complete.** A first-1000-row query is not
  the full dataset; do not derive totals from truncated arrays; justify `.in()`
  batch sizes. → [data-access-and-scale.md](docs/engineering/data-access-and-scale.md)
- **AI output is proposed, sourced data.** No source passage means no saved
  finding; return unknown rather than guess. → [ai.md](docs/engineering/ai.md)
- **Customer-approved data is never overwritten automatically;** a refresh
  creates proposed updates and material changes require reapproval. → [ai.md](docs/engineering/ai.md)
- **Canonical product state.** Each business fact has one source; verdicts,
  counts and labels must never contradict across screens. → [design-system.md](docs/engineering/design-system.md)
- **Security is implemented with the first version of a feature,** never
  retrofitted. → [security.md](docs/engineering/security.md)
- **World-class design uses the shared design system** — tokens, canonical
  components and WCAG 2.2 AA; no generic AI-generated styling. → [design-system.md](docs/engineering/design-system.md)

## Required reading — engineering documents

Before starting work, read the engineering documents relevant to the task. These
documents are mandatory extensions of CLAUDE.md, not optional guidance. When a
task spans multiple areas, read all applicable files.

| Task | Read |
| --- | --- |
| Database schema work, RLS, permissions, authentication or authorisation | [multi-tenant-domain.md](docs/engineering/multi-tenant-domain.md), [security.md](docs/engineering/security.md) and [data-access-and-scale.md](docs/engineering/data-access-and-scale.md) |
| New customer-facing feature | [multi-tenant-domain.md](docs/engineering/multi-tenant-domain.md), [design-system.md](docs/engineering/design-system.md), [security.md](docs/engineering/security.md), [reliability-and-state.md](docs/engineering/reliability-and-state.md) and [testing-and-release.md](docs/engineering/testing-and-release.md) |
| Company onboarding, company research or prospect conversion | [multi-tenant-domain.md](docs/engineering/multi-tenant-domain.md), [security.md](docs/engineering/security.md) and [data-and-files.md](docs/engineering/data-and-files.md) |
| Public-source matching, opportunity matching, assessments or bids | [multi-tenant-domain.md](docs/engineering/multi-tenant-domain.md), [ai.md](docs/engineering/ai.md), [data-access-and-scale.md](docs/engineering/data-access-and-scale.md) and [reliability-and-state.md](docs/engineering/reliability-and-state.md) |
| Evidence, storage or document upload/processing | [multi-tenant-domain.md](docs/engineering/multi-tenant-domain.md), [data-and-files.md](docs/engineering/data-and-files.md), [security.md](docs/engineering/security.md) and [ai.md](docs/engineering/ai.md) |
| AI or research work | [multi-tenant-domain.md](docs/engineering/multi-tenant-domain.md), [ai.md](docs/engineering/ai.md), [architecture-and-platform.md](docs/engineering/architecture-and-platform.md), [data-and-files.md](docs/engineering/data-and-files.md) and [testing-and-release.md](docs/engineering/testing-and-release.md) |
| Background jobs or automation | [multi-tenant-domain.md](docs/engineering/multi-tenant-domain.md), [reliability-and-state.md](docs/engineering/reliability-and-state.md) and [architecture-and-platform.md](docs/engineering/architecture-and-platform.md) |
| Billing, Stripe, email or third-party integrations | [multi-tenant-domain.md](docs/engineering/multi-tenant-domain.md), [integrations.md](docs/engineering/integrations.md), [security.md](docs/engineering/security.md) and [reliability-and-state.md](docs/engineering/reliability-and-state.md) |
| Internal administration or platform roles | [multi-tenant-domain.md](docs/engineering/multi-tenant-domain.md) and [security.md](docs/engineering/security.md) |
| Lists, filtering, search or reporting | [data-access-and-scale.md](docs/engineering/data-access-and-scale.md) |
| Deployment or environment changes | [architecture-and-platform.md](docs/engineering/architecture-and-platform.md), [integrations.md](docs/engineering/integrations.md) and [testing-and-release.md](docs/engineering/testing-and-release.md) |
| Design or UI changes | [design-system.md](docs/engineering/design-system.md) |
| Audit work | apply the read-only investigation rule above first |

All ten engineering documents:

- [multi-tenant-domain.md](docs/engineering/multi-tenant-domain.md) — the ownership model (organisation, legal entity, trading identity, bidding identity), the four data zones, identity provenance, evidence ownership versus applicability, multi-level matching, platform-versus-customer roles, identity invariants, and the foundational first-schema proposal with its required tests and fixture.
- [architecture-and-platform.md](docs/engineering/architecture-and-platform.md) — stack, Vercel/Supabase responsibilities, Edge policy, environments, deployment, observability, launch stack, one-live-project constraint, manual-setup rule, deferred decisions.
- [security.md](docs/engineering/security.md) — auth, authorisation, multi-tenant isolation, deny-by-default RLS, RLS enforcement tests, service-role limits, roles, SSRF/crawling.
- [reliability-and-state.md](docs/engineering/reliability-and-state.md) — silent-write prevention, state machines, idempotency, atomicity, background jobs, automation reliability, environment-safe communications, cutover, environment validation, canonical logic.
- [data-access-and-scale.md](docs/engineering/data-access-and-scale.md) — pagination, counts, limits, batching, filtering/search, indexes, N+1, data-volume testing, performance budgets.
- [ai.md](docs/engineering/ai.md) — AI Gateway/SDK, model routing, provenance, customer approval, cost controls, failure behaviour.
- [design-system.md](docs/engineering/design-system.md) — visual character, design tokens, canonical components, UX consistency, canonical state, accessibility.
- [testing-and-release.md](docs/engineering/testing-and-release.md) — test categories, build and pre-push checks, acceptance checklist, mandatory automated guards, development order.
- [integrations.md](docs/engineering/integrations.md) — Resend/React Email, Stripe, Companies House, webhooks, entitlements, setup checklists, environment variables.
- [data-and-files.md](docs/engineering/data-and-files.md) — private storage, file safety states, malware-scan boundary, retention, single-org launch model, prospect-data separation.
