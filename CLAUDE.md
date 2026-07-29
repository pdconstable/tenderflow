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

# Tender OS production architecture and engineering standards

The sections below define the production stack and engineering standards for
Tender OS. They extend — and never override — the safety rules above.

## Production platform architecture

Tender OS uses:

- Next.js deployed on Vercel
- Vercel Functions and server actions for the primary application runtime
- Vercel AI SDK for AI application integration
- Vercel AI Gateway for production model access
- Supabase Postgres for primary application data
- Supabase Auth for user identity
- Supabase Storage for private customer documents
- Supabase Row Level Security for tenant isolation
- Supabase Realtime only where it adds genuine customer value
- Supabase database extensions, queues or scheduled jobs where appropriate

The default execution boundary is:

Browser
-> Next.js application on Vercel
-> server actions or route handlers
-> application services
-> Supabase repositories or external integrations

Do not spread the same business workflow across Vercel Functions and Supabase Edge Functions without a documented reason.

Vercel is the default server-side compute layer.

Supabase is the default data, authentication, storage and tenant-security layer.

## Vercel runtime rules

- Customer-facing server actions and route handlers run on Vercel unless there is a specific documented reason otherwise.
- Prefer the Node.js runtime for database-heavy, file-processing and external-integration work.
- Use the Edge runtime only when low latency materially benefits the workflow and all required dependencies support it.
- Do not select Edge runtime merely because a function is called an edge function.
- Keep business logic outside route handlers and server actions.
- Route handlers and server actions orchestrate application services.
- Long-running tasks must not block normal customer page requests.
- Every function must have an explicit timeout expectation and failure path.
- Functions must be idempotent where retries are possible.
- Never rely on local filesystem persistence between Vercel invocations.
- Temporary files must be treated as ephemeral.
- External calls require explicit timeouts, validation and controlled retries.
- Streaming responses must handle client cancellation safely.
- Do not expose server-only environment variables through NEXT_PUBLIC variables.

## Vercel AI Gateway

Use Vercel AI Gateway as the default production gateway for generative AI model calls.

Reasons include:

- Central model access
- Unified authentication
- Usage visibility
- Spend controls
- Model switching
- Provider routing
- Provider fallback
- Reduced provider lock-in

Use the Vercel AI SDK where it provides typed structured-output, tool-calling or streaming support.

All production AI calls must:

- Run server-side
- Use AI Gateway unless an exception is documented
- Use an approved model alias or central model configuration
- Use structured schema output
- Validate output with Zod
- Record model, provider, prompt version and schema version
- Record latency and token or usage metadata where available
- Set maximum token and timeout limits
- Avoid passing unnecessary customer data
- Avoid sending full document sets where selected passages are sufficient
- Preserve source provenance
- Return unknown rather than guess
- Support safe retry only where the request is idempotent
- Avoid automatically falling back to a materially weaker model for high-risk decisions

Do not call OpenAI, Anthropic, Google or another model provider directly from arbitrary application modules.

Create one central AI client and model-routing module.

Suggested conceptual boundary:

lib/ai/client.ts
lib/ai/models.ts
lib/ai/prompts/
lib/ai/schemas/
lib/ai/evaluations/

Actual placement should follow the repository's existing architecture.

## AI model routing

Create explicit task classes rather than one default model for all work.

Examples:

- extraction
- classification
- summarisation
- tender translation
- evidence matching
- grounded drafting
- claim verification
- complex reasoning
- image or document analysis

Each task class must define:

- preferred model
- permitted fallback models
- maximum output tokens
- timeout
- structured schema
- temperature or reasoning configuration
- retry policy
- data-sensitivity classification
- evaluation dataset

Do not allow components or server actions to choose arbitrary model names.

Model names and routing rules must be centralised.

Do not change production models without recording the change and running relevant evaluations.

## AI Gateway failure behaviour

- Provider failure must not silently produce fabricated results.
- If all approved providers fail, return a clear retryable or non-retryable error.
- Record the attempted providers and final failure category.
- Fallbacks must preserve required capabilities such as structured output, context length and image support.
- Never fall back from a high-assurance reasoning task to a low-cost model solely to complete the request.
- Customer-facing workflows must distinguish unavailable from no findings.
- AI outage must not corrupt or overwrite approved customer data.

## AI cost controls

- Set Vercel AI Gateway budgets and usage alerts in production.
- Record AI usage by organisation, research run, bid and task type where practical.
- Cache deterministic or source-stable extraction results.
- Do not reprocess unchanged content hashes.
- Filter and chunk documents before model calls.
- Use the smallest model that passes the task evaluation threshold.
- Do not optimise cost by reducing correctness for eligibility, evidence, claim or commitment checks.
- Add organisation-level abuse and usage limits.
- Surface unexpected cost increases before scaling traffic.

## Supabase responsibility

Use Supabase for:

- Postgres
- Auth
- Storage
- RLS
- tenant-owned data
- audit history
- job state
- source records
- document metadata
- database constraints
- database-side consistency
- queues and schedules where justified

Do not move ordinary business logic into database functions merely to reduce application code.

Use database functions for:

- atomic data operations
- well-defined database-side invariants
- secure queries that benefit from database execution
- carefully reviewed permission-sensitive operations

Database functions must not become a hidden parallel application layer.

## Supabase Edge Functions policy

Supabase Edge Functions are not the default application runtime.

Use them only when there is a clear documented benefit, such as:

- Supabase-native webhooks
- storage events
- auth events
- database-adjacent asynchronous tasks
- scheduled jobs invoked from Supabase
- functionality that must remain operational independently of the Vercel deployment
- tightly scoped low-latency operations close to the Supabase project region

Do not use Supabase Edge Functions merely because Supabase hosts the database.

Before creating one, document:

- why Vercel is unsuitable
- expected execution duration
- memory requirements
- CPU requirements
- database-region considerations
- retry model
- timeout behaviour
- deployment and monitoring ownership

Do not duplicate the same integration logic in Vercel and Supabase.

Shared domain logic must live in portable modules where technically practical.

## Background work

Long-running tasks include:

- company website research
- website crawling
- procurement-data ingestion
- document extraction
- tender parsing
- profile refresh
- evidence indexing
- embeddings
- large bid generation
- outcome-feedback extraction

These must use a durable job pattern.

A background job must:

- create a durable job record before processing
- use a unique idempotency key
- record organisation ownership
- record status and progress
- store partial results
- cap retry attempts
- distinguish retryable and terminal errors
- support manual retry
- preserve approved customer data
- avoid duplicate findings
- expose progress to the customer where relevant
- record start, completion and failure timestamps

Do not use an untracked fire-and-forget promise as the only execution mechanism.

Do not assume a serverless function will always remain alive after sending a response.

Select the final queue and worker mechanism explicitly before building high-volume research processing.

## Queue and orchestration decision

Until a durable production queue is selected:

- Keep background-job interfaces provider-neutral
- Persist all jobs in Supabase
- Do not couple domain logic directly to one scheduler
- Use a job dispatcher abstraction
- Make workers idempotent
- Allow jobs to be invoked safely by Vercel, Supabase scheduling or another future worker platform

Before production launch, explicitly choose and document the durable execution mechanism for:

- immediate asynchronous jobs
- scheduled refresh jobs
- high-volume crawl jobs
- retry and dead-letter handling

Do not present a prototype delay or client-side timer as a background job.

## Website crawling

Website crawling must not run as one unbounded request.

- Validate the domain first.
- Respect robots and access restrictions.
- Limit pages, redirects, bytes and execution time.
- Store source URLs and selected snapshots.
- Cache content hashes.
- Process only same-domain public pages unless explicitly approved.
- Reject internal, private and link-local destinations.
- Protect against SSRF.
- Resolve and validate redirects before fetching.
- Block localhost, metadata endpoints and private IP ranges.
- Use an explicit user agent.
- Add rate limiting per target domain.
- Do not bypass authentication or technical controls.
- Stop cleanly on source restrictions.
- One page failure must not fail the entire crawl.

## File processing

- Uploaded files are private by default.
- Use signed access URLs.
- Verify MIME type and file signature.
- Enforce size limits.
- Sanitize filenames.
- Scan or quarantine files where appropriate.
- Do not execute uploaded content.
- Do not trust file extensions.
- Record uploader, organisation and upload time.
- Large processing tasks must run asynchronously.
- Temporary copies must be deleted when no longer needed.
- Extracted text must retain document and page provenance.

## Environment separation

Maintain separate environments for:

- local development
- Vercel preview
- production

Where practical, use separate Supabase projects or a clearly documented safe preview-data strategy.

Never connect Vercel preview deployments to live production data unless explicitly approved.

Environment variables must be documented by environment.

Whenever a feature requires a new secret or manual Vercel configuration, stop and tell the user:

- exact variable name
- where to create it
- where to add it in Vercel
- whether it applies to development preview production or all
- how to verify it
- whether a redeployment is required

Expected production secrets may include:

- Supabase URL and publishable key
- Supabase server secret key where strictly required
- Vercel AI Gateway API key
- Companies House API key
- procurement API credentials
- email provider credentials
- webhook signing secrets

Never print secret values.

## Vercel deployments

- Preview deployments must not mutate production data by default.
- Production deploys must originate from committed main.
- Verify required environment variables before claiming a deployment is functional.
- Treat successful deployment as separate from successful functionality.
- After deployment, run a production smoke test for affected critical paths.
- Do not claim an integration works until the deployed function has made a real safe request.
- Record any required Vercel project setting changes.
- Never disable deployment protection or security controls without explicit approval.

## Observability

Use structured application logs.

Production AI and integration logs must include where appropriate:

- request or correlation ID
- organisation ID
- user ID where appropriate
- job ID
- task type
- model alias
- provider
- duration
- outcome
- retry count
- error category

Do not log:

- secrets
- raw access tokens
- full tender documents
- full uploaded files
- unnecessary personal data
- complete AI prompts containing sensitive customer information

Use Vercel observability for application and function behaviour.

Use Supabase logs for database, auth and storage behaviour.

Make errors traceable across both systems with a shared correlation ID.

## Multi tenant security

- Every tenant-owned table must contain organisation_id or account_id.
- Every customer read and mutation must be tenant-scoped.
- RLS must be enabled for every tenant-owned table.
- Every new tenant-owned table requires policies in the same migration.
- Never trust an organisation ID supplied by the browser.
- Verify membership and permission server-side.
- Never use a Supabase secret or service-role client in customer-facing paths without explicit justification.
- Any service-role operation must independently validate authorisation.
- Add tests proving cross-tenant reads, writes and deletes fail.
- Prospect, colleague and reviewer links must expose only exact authorised records.

## Authentication and authorisation

- Authentication and authorisation are separate.
- Use central capability checks.
- Default deny.
- Never rely on hidden UI controls for security.
- Recheck permissions on every sensitive mutation.
- Magic links must be single-purpose, scoped, time-limited and revocable.
- Log access to sensitive evidence, submissions, financial fields and approvals.

## Canonical state

- Each business fact has one canonical data source.
- Do not hardcode business facts in multiple components.
- Use shared selectors or domain functions for derived labels.
- Verdict and recommendation text must never contradict.
- Unknown is not failed.
- Found is not confirmed.
- Expired evidence cannot satisfy a current requirement.
- Completing an action must update every affected view.
- Customer-facing counts must be derived from underlying records.
- Do not maintain duplicate independent progress counters.

## AI provenance and customer approval

- AI output is proposed data.
- Every material finding needs source provenance.
- No source passage means no saved finding.
- Facts, interpretations, recommendations and confirmations are separate concepts.
- Customer-approved values are never overwritten automatically.
- A refresh creates proposed updates.
- Material changes after approval require reapproval.
- Unsupported claims must not enter bid drafts.
- Submitted bid versions are immutable.

## Testing requirements

Every new feature must include appropriate tests.

Required categories:

- domain unit tests
- input-schema tests
- server action tests
- authorisation tests
- RLS and tenant-isolation tests
- integration adapter tests
- AI schema-validation tests
- background-job idempotency tests
- critical end-to-end journey tests

Every bug fix requires a regression test where practical.

AI workflows require fixed evaluation examples covering:

- expected extraction
- missing information
- conflicting sources
- entity mismatch
- unsupported claims
- malformed model output
- provider failure
- fallback behaviour

Do not change a production prompt, model or schema without running the relevant evaluation set.

## Accessibility and UX

- Customer-facing screens target WCAG 2 point 2 AA.
- All controls must be keyboard accessible.
- Do not communicate status using colour alone.
- Loading states prevent duplicate actions.
- Mutations provide clear success and failure feedback.
- Mobile layouts must be deliberately designed.
- Use plain-English operational states rather than meaningless completion percentages.
- Source, interpretation and customer decision must be visually distinct.

## Git workflow during solo development

Extends the `Git workflow` rules above; it does not replace them. Direct-to-main
solo development, no branches or pull requests, and staging specific paths only
all remain as defined there.

- Never force push.
- Every push must pass the required checks below.
- Before production launch or adding developers, review whether to introduce protected branches and pull requests.

## Required checks before push

Run all applicable checks against the working and committed state:

1. git status --short
2. inspect staged files
3. npx tsc --noEmit
4. lint
5. unit tests
6. affected integration tests
7. production build for framework server or deployment changes
8. migration verification for database changes
9. secret scan
10. confirm no required untracked files are missing from the commit

Do not claim done while:

- tests fail
- build fails
- migrations are unapplied
- required environment variables are missing
- a live integration has not been verified
- the committed tree differs materially from the tested implementation