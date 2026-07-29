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
  reads the ref from the live connection in use and aborts non-zero unless it
  is vrngjoorzwcgagwpzzyt; it hard-refuses wcxxhzenwqlukhtphjyc by name.

## Git workflow
- Commit and push directly to `main`. No branches, no PRs.
- When I say "push", commit any pending work with a sensible message and push
  to main.
- Always `git add <specific/paths>`. Never `git add -A` or `git add -u <dir>` —
  it sweeps in files deliberately left out and can commit a tree that
  references uncommitted modules.
- tsc/tests verify the WORKING tree; the deploy builds the COMMITTED tree.
  Untracked files make the two disagree, so local green proves nothing.
- Never commit .env files or secrets. This repo is PUBLIC.

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

## Database
- Apply migrations with `supabase db push --linked` so they're recorded in the
  migration ledger. Do NOT use `db query -f` to apply — it runs the SQL without
  recording it and causes drift. `db query` is for read-only verification only.
- Verify by OUTCOME after any migration — run a read-only query showing the
  new column/row count.
- Additive changes (ADD COLUMN, CREATE TABLE, ADD INDEX) can run autonomously.
- NEVER run DROP TABLE, DROP COLUMN, TRUNCATE, or DELETE without WHERE without
  flagging it in plain English first and waiting for confirmation.
- Every destructive/seed/reset script calls the Supabase guard as its first line.

## Code rules
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

## Build checks
- Verify with `npx tsc --noEmit` by default.
- tsc does NOT catch SWC/Next compile errors. For changes touching
  "use server" files, run one build before pushing.

## Environment variables
- `.env.local` is gitignored and NOT synced to the host. Whenever a change adds
  an env var or an external integration, STOP and tell me in plain English
  exactly what manual steps are needed before it works in production.

## When asked for an audit
Read-only investigation first, report findings, get confirmation, then build.