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
- structured website extraction
- document extraction
- classification
- service normalisation
- company identity matching
- procurement-award matching
- summarisation
- tender translation
- requirement extraction
- eligibility reasoning
- evidence matching
- grounded drafting
- claim verification
- commitment checking
- complex reasoning
- image or document analysis

Each task class must define:

- task name
- preferred model
- permitted fallback models
- required capabilities
- maximum input size
- maximum output tokens
- timeout
- structured schema
- temperature or reasoning configuration
- retry policy
- data-sensitivity classification
- evaluation dataset
- cost limits where appropriate

Do not allow components or server actions to choose arbitrary model names.

Model names and routing rules must be centralised.

Do not change production models without recording the change and running relevant evaluations.

When implementing a new AI capability:

1. Assess the current suitable model options.
2. Recommend the preferred model and permitted fallbacks.
3. Explain the cost, accuracy and privacy implications.
4. Create or update the evaluation set.
5. Obtain approval before introducing a major new provider dependency.

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
- Do not optimise cost by reducing correctness for eligibility, evidence, claim, commitment or final-bid-assurance checks.
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
- research findings
- document metadata
- billing-state mirrors
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

- the trigger
- why Vercel is unsuitable
- expected execution duration
- memory requirements
- CPU requirements
- database-region considerations
- the security boundary
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
- public-procurement award searches
- Companies House enrichment
- document extraction
- certificate processing
- tender parsing
- profile refresh
- evidence indexing
- embeddings
- large bid generation
- outcome-feedback extraction
- expiry and reminder processing

These must use a durable job pattern.

A background job must:

- create a durable job record before processing
- use a unique idempotency key
- record organisation ownership
- record its current step
- record status and progress
- store partial results
- cap retry attempts
- distinguish retryable and terminal errors
- support manual retry
- support cancellation where practical
- preserve approved customer data
- avoid duplicate findings
- expose progress to the customer where relevant
- record start, completion and failure timestamps

Do not use:

- fire-and-forget promises as the only execution mechanism
- client-side timers as orchestration
- one long HTTP request for a multi-page crawl
- an untracked background promise after returning a response
- infinite automatic retries

Do not assume a serverless function will always remain alive after sending a response.

Select the final queue and worker mechanism explicitly before building high-volume research processing.

## Queue and orchestration decision

Vercel Workflow is the preferred durable orchestration layer for multi-step
background work, subject to confirming its suitability when each feature is
implemented. If Vercel Workflow is not yet configured when a background feature
is built, stop, recommend the exact setup, identify any alternative, explain the
trade-offs, and obtain approval before choosing a different durable-job platform.
Keep background-job application logic portable: workflow definitions orchestrate
application services rather than contain all extraction and business logic.

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
- Record uploader, organisation, upload time, document type, size and content hash.
- Large processing tasks must run asynchronously.
- Temporary copies must be deleted when no longer needed.
- Extracted text must retain document and page provenance.
- Do not log document contents.
- Support customer export and deletion.
- Define retention rules before production launch.

Expected sensitive uploads include previous tender submissions, contracts,
references, certificates, insurance schedules, policies, accounts, KPI reports,
case studies, mobilisation plans, pricing support documents, buyer feedback and
commercially sensitive internal material. Plan for these from the beginning.

Malware scanning uses an adapter boundary; the exact provider is intentionally
deferred (see Deferred decisions). Until scanning is implemented, files requiring
automated processing must carry a clear safety state:

- uploaded
- pending scan
- safe for processing
- quarantined
- rejected

Do not claim files are scanned unless a real scanner has run. When automated file
processing is about to be enabled for production, stop and recommend a scanning
provider.

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
- Users belong to organisations through membership records; do not rely only on a user row containing a single organisation ID.
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
- Visible focus states on every interactive element.
- Semantic headings and properly labelled inputs.
- Sufficient contrast; colour is never the only status indicator.
- Accessible dialogs and drawers with focus trapping where appropriate.
- Focus restoration after a dialog or drawer closes.
- Meaningful button labels and accessible loading and error feedback.
- Screen-reader-friendly tables and pagination.
- Reduced-motion support.
- Touch targets suitable for mobile.

Do not claim design work is complete until accessibility checks pass for the affected flow.

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

# Tender OS launch decisions and product-stack rules

These are concrete product and stack decisions for the current build. They layer
on top of the architecture and engineering standards above and never override
the safety rules at the top of this file.

## Confirmed launch stack

Tender OS will initially use:

- Next.js App Router, subject to confirming this from the repository
- Vercel for hosting and the primary server-side runtime
- Vercel server actions and route handlers
- Vercel AI SDK
- Vercel AI Gateway for production AI model access
- Vercel Workflow for durable asynchronous orchestration where available and appropriate
- Supabase Postgres
- Supabase Auth
- Supabase Storage
- Supabase Row Level Security
- Resend for transactional email
- React Email for templates
- Stripe Checkout
- Stripe Billing
- Stripe Customer Portal
- One customer organisation per account at initial launch
- One live Supabase project during the current solo-development phase
- Support for commercially sensitive customer-document uploads from the beginning

Before adding framework-specific rules, verify whether this repository uses Next.js App Router.

If it does not, stop and report the difference rather than silently applying unsuitable architecture.

## One live Supabase environment during development

There is currently one live Supabase project.

This is the explicit, documented approval that `Environment separation` refers
to: during the solo-development phase local and Vercel preview deployments may
therefore connect to live data. It does not relax any safety rule — the
prohibited actions below still apply, and destructive or bulk mutations remain
governed by the `Database` and `Change discipline` rules above.

Apply these safeguards:

- Preview deployments must not send email to real customers.
- Preview deployments must not initiate live Stripe payments.
- Preview deployments must not run scheduled research jobs.
- Preview deployments must not run bulk outreach.
- Preview deployments must not process live documents automatically.
- Preview deployments must not perform destructive or bulk data mutations.
- Preview deployments must not execute production webhooks as if they were production.
- Any preview mutation of live customer data requires explicit approval.
- Use Stripe test mode outside production.
- Use an email sink or strict recipient allowlist outside production.
- Show a visible non-production banner on preview deployments.
- Use an explicit deployment-environment helper.

Supported deployment environments should include:

- local
- preview
- production

Do not rely only on NODE_ENV.

Before real external customers are onboarded, stop and recommend creating a separate development or staging Supabase project.

## Single-organisation launch model

Initial launch supports one customer organisation per account. Still design
tenancy so future multi-organisation support does not require a rebuild.

The tenancy enforcement mechanics — organisation_id on every tenant-owned table,
membership records, organisation-scoped reads and mutations, server-side
membership verification, RLS enabled with policies in the same migration, default
deny, and cross-tenant access tests — are defined in `Multi tenant security` and
`Authentication and authorisation` and apply here in full. Do not restate or
weaken them.

Launch-specific decisions:

- Do not build group-company account switching at launch unless requested.

The data model may still record:

- bidding legal entity
- trading company
- holding company
- delivery entity
- related company
- former name

## Professional user roles

Professional bid writers and reviewers may be added later.

Prepare the permission model for:

- bid_lead
- reviewer
- bid_operations
- colleague_request_recipient

Do not build their complete user experiences merely because the roles exist.

Feature-gate future professional workspaces.

Reviewer access must always be limited to:

- assigned bids
- authorised questions
- approved evidence required for the review
- relevant customer confirmations

Reviewers must not receive automatic access to the full customer evidence library.

When development reaches the first professionally delivered bid, stop and ask whether:

- writers will be employees or subcontractors
- they need direct platform accounts
- reviewer independence is required
- conflict declarations are required
- time tracking is required
- customer communication occurs through Tender OS

## Transactional email

Use Resend for application email and React Email for templates.

Email must be built as part of the product.

Likely messages include:

- account and sign-in messages not handled by Supabase
- company research complete
- colleague information request
- evidence request
- task reminder
- credential expiry warning
- tender deadline warning
- qualification confirmation
- payment confirmation
- subscription-status messages
- bid draft ready
- professional review complete
- final response pack ready
- support acknowledgement

Use a dedicated sending subdomain, for example:

- notify.tenderos.co.uk
- mail.tenderos.co.uk

Do not casually send application mail from the main company mailbox domain.

All sends run server-side.

Create a central email service and typed template registry.

Record:

- organisation_id
- recipient
- template
- related entity
- idempotency key
- provider message ID
- delivery status
- sent time
- failure category

Rules:

- Preview deployments cannot send to real customers.
- Non-production uses a sink address or allowlist.
- Every send has an idempotency key.
- Verify webhook signatures.
- Store webhook events.
- Process webhook events idempotently.
- Do not include sensitive tender or evidence content when a secure link is sufficient.
- Magic-link URLs must be scoped, expiring and revocable.
- Separate transactional email from future marketing outreach.
- Do not use transactional infrastructure for bulk prospect campaigns without a separate decision.

Expected environment variables include:

- RESEND_API_KEY
- RESEND_WEBHOOK_SECRET
- EMAIL_FROM_ADDRESS
- EMAIL_REPLY_TO
- NON_PRODUCTION_EMAIL_RECIPIENT

When email implementation begins, stop and provide:

1. Resend account setup steps.
2. Sending-domain DNS records.
3. Exact environment variables.
4. Which Vercel environments need them.
5. Webhook setup instructions.
6. How to verify sending safely.
7. Whether a redeployment is required.

Do not request or print secret values.

## Stripe billing

Billing is required at launch.

Use:

- Stripe Checkout
- Stripe Billing
- Stripe Customer Portal
- verified Stripe webhooks

Initial products may include:

- Tender OS Guided monthly subscription
- Tender OS Guided annual subscription later
- Full Tender Qualification
- AI Draft Pack
- Professionally Reviewed Bid Pack
- Evidence Builder
- Complex Bid deposit or scoped payment later
- Managed Bid Desk subscriptions later
- Additional bid credits later

Use Stripe-hosted Checkout initially.

Do not build custom card-entry forms unless explicitly approved.

Stripe is authoritative for:

- successful payment
- invoice status
- subscription status
- cancellation
- refund status

Tender OS is authoritative for:

- product entitlement
- fulfilment
- qualification delivery
- bid-production status
- credit allocation

Never trust prices, product IDs, entitlement claims or completion states supplied by the browser.

Use centrally configured Stripe product and price IDs.

Money must use integer minor units or fixed-precision database types, never floating point.

Required webhook handling should cover relevant events such as:

- checkout session completed
- invoice paid
- invoice payment failed
- customer subscription created
- customer subscription updated
- customer subscription deleted
- refund or charge reversal where applicable

Webhook requirements:

- Verify Stripe signatures.
- Persist the Stripe event ID.
- Process idempotently.
- Support replay.
- Do not assume webhook delivery order.
- Do not grant access based only on the successful Checkout return URL.
- Reconcile local billing state periodically.
- Return webhook success only after durable receipt.
- Keep Stripe test and live configuration separate.
- Preview and local environments use Stripe test mode.
- Live billing requires explicit approval before activation.

Expected environment variables include:

- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY where required
- STRIPE_PRICE_GUIDED_MONTHLY
- price IDs for transactional products
- NEXT_PUBLIC_APP_URL

When billing implementation begins, stop and provide:

1. Stripe account setup steps.
2. Products and prices to create.
3. Exact environment variables.
4. Webhook URL and events.
5. Test-mode verification steps.
6. Customer Portal configuration.
7. Live-mode activation checklist.
8. Whether a redeployment is required.

Do not request or print secret values.

## Product entitlements

Create one central entitlement service.

Do not scatter subscription checks and product-name comparisons across UI components.

Potential entitlements include:

- company profile
- opportunity matching
- number of opportunity assessments
- evidence-library access
- qualification workflow
- AI Draft access
- professional-review access
- active-bid workspace
- Managed Bid Desk
- bid credits
- internal research tools

The server must enforce entitlements.

Hiding a button is not enforcement.

Entitlement changes must be:

- auditable
- linked to a Stripe event or authorised internal action
- safe to replay
- reversible
- consistent across all screens

## Reverse-matching prospect data

Keep reverse-matching prospect data in the same Supabase project initially, but separate it clearly from customer tenant data.

Use separate tables and access rules for:

- tenders selected for acquisition
- supplier fingerprints
- candidate companies
- prospect findings
- prospect contacts
- outreach approvals
- outreach events
- opt-outs
- suppression records
- private preview tokens
- conversion events

A prospect is not a customer organisation.

Do not create full customer tenant records until:

- the prospect claims the preview
- creates an account
- or an authorised internal process converts the prospect

Prospect data must not be exposed through ordinary customer RLS policies.

Maintain permanent direct-marketing suppression where required.

Do not automatically use Companies House officers as marketing contacts.

## Deferred decisions

The following decisions remain intentionally deferred:

- exact model selected for each AI task
- malware-scanning provider
- whether writers are employees or subcontractors
- whether writers and reviewers are included in the first commercial launch
- creation of a separate staging Supabase project
- inbound email processing
- Managed Bid Desk billing
- multi-organisation customer accounts
- advanced marketing-email platform

When one becomes necessary:

1. Stop.
2. Inspect the current implementation and requirements.
3. Compare suitable options.
4. Recommend one.
5. Explain cost, complexity and lock-in.
6. Obtain approval before adding the dependency.

## Manual setup rule

This is the umbrella version of the stop-and-tell discipline in `Environment
variables` and `Environment separation`. Whenever implementation requires any of
the following:

- a Vercel project setting
- Vercel Workflow setup
- AI Gateway configuration
- a Supabase setting or extension
- a new environment variable
- a Resend API key
- email-domain DNS
- a Stripe product or price
- a Stripe webhook
- a Companies House key
- a procurement-data credential
- a scheduled job
- another external service

Stop before claiming completion and state:

1. What the user must create.
2. Where to create it.
3. Exact environment-variable names.
4. Which environments require them.
5. Whether a deployment or redeployment is needed.
6. How to verify it safely.
7. What functionality remains unavailable until complete.

Never paste, print or request secrets in the conversation.

# Tender OS enforceable quality, security and scale rules

These rules make the standards above enforceable. They add design, security,
scale, correctness and reliability requirements and, where noted, extend an
existing section rather than replace it. They never override the safety rules at
the top of this file.

## Product design quality

Tender OS must not look like a generic AI-generated SaaS application.

The product must feel:

- calm
- premium
- decisive
- trustworthy
- commercially serious
- evidence-led
- exceptionally easy to understand

Avoid:

- generic KPI strips
- excessive cards
- heavy borders
- bright blue default actions
- decorative gradients
- neon colours
- AI sparkle icons
- random status pills
- huge empty hero areas
- generic analytics charts
- procurement database tables
- inconsistent spacing
- one-off component styling
- arbitrary colour usage
- desktop layouts simply stacked on mobile
- placeholder copy that survives into production
- dashboards where every element has equal visual weight

Use:

- the established Tender OS design tokens
- CSS variables for brand colours
- one typography system
- one spacing scale
- one radius system
- one elevation system
- one icon library
- one set of status patterns
- one set of action patterns
- one component library
- one responsive breakpoint strategy

Do not introduce a new visual pattern when an existing component can be extended.

Before creating a new component:

1. Search for an existing equivalent.
2. Check whether the design system already supports the use case.
3. Extend the existing component where appropriate.
4. Avoid near-duplicate components with slightly different styling.

## Design-system enforcement

Maintain canonical reusable components for:

- page header
- primary action
- secondary action
- destructive action
- status badge
- verdict state
- confidence state
- source provenance
- empty state
- error state
- loading state
- list row
- detail drawer
- confirmation card
- action queue item
- evidence row
- bid status
- form field
- mobile bottom action bar
- modal and drawer
- table and paginated list

Do not hardcode:

- colours
- spacing
- radii
- shadows
- status styles
- button variants
- arbitrary widths

Use tokens and component variants.

Create a visual-regression or screenshot-testing strategy for critical screens.

Critical visual screens include:

- company setup
- company profile
- home decision queue
- opportunity Decision Pack
- missing-information flow
- evidence map
- bid workspace
- approvals
- final submission gate
- internal research dashboard

Any large visual change must be checked at:

- 1440px desktop
- 1280px laptop
- tablet
- approximately 390px mobile

## UX consistency

Extends `Canonical state`. Every screen must have:

- one clear purpose
- one dominant action
- no more than two visible secondary actions
- plain-English explanation before technical detail
- consistent terminology
- consistent status names
- consistent action labels
- consistent error behaviour
- consistent source presentation
- consistent confirmation behaviour

Do not use multiple terms for the same concept.

Examples:

- use opportunity matching, not a mix of Tender Watch, monitoring and scanning
- use Confirmed, Found, Requires confirmation, Missing and Expired or conflicting consistently
- use Bid, Investigate, Prepare and No bid consistently
- use one canonical label for each bid stage
- use one canonical label for each customer action state

All customer-facing copy must use concise UK English.

Do not allow contradictory states such as:

- Investigate verdict with a recommendation saying Bid
- one page showing High confidence and another Medium confidence
- one screen showing three unresolved items and another showing four
- different deadlines or requirement counts for the same tender

Every customer-facing value must come from one canonical state source.

(Accessibility requirements are defined in `Accessibility and UX` above.)

## Security is a build-time requirement

Security must be implemented with the first version of a feature.

Do not create insecure temporary implementations with the intention of securing them later.

Every feature design must include:

- authentication
- authorisation
- tenant isolation
- RLS
- input validation
- output validation
- audit history
- rate limiting where appropriate
- idempotency where appropriate
- error handling
- secrets handling
- environment isolation
- abuse prevention
- data retention
- logging and observability

Security requirements are acceptance criteria, not post-launch enhancements.

## Deny-by-default RLS

Extends `Multi tenant security`. Every tenant-owned table must:

- enable RLS
- include organisation_id
- have explicit policies
- restrict policies to explicit roles
- use deny-by-default behaviour
- be covered by tenant-isolation tests

Prohibited policy patterns:

- USING true
- WITH CHECK true
- policies with no explicit TO clause
- policies applying to PUBLIC unless explicitly justified
- policies checking only that a token exists
- policies such as share_token IS NOT NULL
- policies trusting organisation_id supplied by the client
- policies relying only on hidden UI

Token-based access must compare the supplied token securely to the exact scoped record.

Example of prohibited logic:

- USING share_token IS NOT NULL

Required conceptual logic:

- supplied token matches the record token
- token is not expired
- token has not been revoked
- token is scoped to the exact record and action

## RLS enforcement tests

Extends `Testing requirements`. Documentation is not sufficient.

Add mandatory automated checks that fail when:

- a tenant-owned table has RLS disabled
- a policy contains USING true
- a policy contains WITH CHECK true
- a policy has no explicit TO clause
- a customer table exposes anon access unexpectedly
- a token policy checks token existence rather than equality
- a new tenant-owned table lacks policies
- a service-role path lacks independent authorisation checks

The RLS security test must run in CI and before push where practical.

Every new table migration must include:

- RLS enablement
- policies
- indexes
- tenant isolation test
- authorised-access test
- unauthorised-access test

## Service-role restrictions

Extends the service-role rules in `Multi tenant security`. The Supabase service role must not be used as a convenience bypass.

Rules:

- no service-role client in browser code
- no service-role client in ordinary customer request paths
- every service-role operation validates user identity and organisation access separately
- service-role functions must be small and explicitly named
- service-role use must be documented in the code
- service-role operations require tests for cross-tenant denial
- service-role keys must never be logged

## Silent failure is prohibited

Extends the error-handling rules in `Code rules`. Every write operation must:

- check the returned error
- check the expected affected-row count where relevant
- return failure when any required step fails
- avoid returning success prematurely
- record enough context for diagnosis
- preserve transactional consistency

Prohibited patterns:

- empty catch blocks
- catch with no action
- catch returning success
- .catch(() => {})
- ignoring Supabase errors
- delete then insert without checking both operations
- defaulting failed numeric queries to zero
- using nullish fallback to hide query failure
- returning success when child writes failed

Examples of dangerous fallbacks:

- count ?? 0 after a failed query
- rows ?? [] when the query errored
- return success true after partial failure

Differentiate:

- zero results
- no data
- unavailable
- failed query
- unauthorised
- validation failure

These must not collapse into the same value.

## Silent-write enforcement

Add automated checks or lint rules that fail on:

- empty catch blocks
- .catch(() => {})
- ignored Supabase mutation errors
- server actions returning success without checking mutation results
- unsafe fallback patterns in critical financial or operational queries

Where static enforcement is difficult, create targeted tests for high-risk mutations.

Every server mutation test must cover:

- valid success
- invalid input
- database failure
- partial child-write failure
- unauthorised access
- cross-tenant access
- retry behaviour where applicable

## State-machine enforcement

Any entity with controlled lifecycle states must have one canonical transition function.

Examples:

- opportunity
- qualification
- bid
- evidence item
- research run
- document processing
- payment
- subscription
- invoice
- email
- colleague request
- approval
- commitment
- submission

Prohibited:

- raw update status calls outside the state-machine module
- direct status mutation from UI code
- webhook handlers setting status without transition validation
- migrations or scripts bypassing lifecycle rules unless explicitly approved
- multiple implementations of the same transition logic

Each state machine must define:

- valid states
- valid transitions
- actor permissions
- transition prerequisites
- side effects
- audit event
- idempotency behaviour
- terminal states

## State-machine enforcement tests

Create a static or AST-based check that fails if controlled status fields are updated outside approved transition modules.

A grep-based test may be used initially, but prefer a structured rule where practical.

Tests must cover:

- every valid transition
- invalid transitions
- repeated transition
- unauthorised transition
- concurrent transition
- transition side effects
- history creation
- rollback on failure

## Scale-first data access

Design every list and query for growth from the first implementation.

Assume:

- many organisations
- many opportunities
- many documents
- many findings
- many evidence records
- many bid questions
- high-volume procurement data
- large audit histories
- large notification volumes
- long-running research jobs

Do not write data access that only works for demo volumes.

## Pagination

Every unbounded list must use pagination.

Do not rely on hidden default row limits.

Do not fetch all rows and paginate in the browser.

Use server-side pagination.

Prefer cursor or keyset pagination for large or frequently changing datasets.

Offset pagination may be used only when:

- datasets are modest
- stable ordering is guaranteed
- deep-page performance is acceptable
- the trade-off is documented

Every paginated query must include a stable deterministic order.

Example:

- created_at descending
- id descending as a tie-breaker

Do not use range pagination without an explicit stable order.

Avoid pagination that can duplicate or omit rows when new records are inserted.

## Count correctness

Do not derive total counts from the length of a paginated or truncated result set.

Use:

- exact count where genuinely required and affordable
- planned count where appropriate
- estimated count where exact is unnecessary
- separate count query
- no total count when infinite scrolling is more suitable

The UI must not display a plausible but false total.

Document whether each count is:

- exact
- estimated
- page count only
- currently loaded count

## Query limits

Extends the `.limit()` rule in `Code rules`. All list queries must use explicit limits.

Do not use an arbitrary universal limit such as 1000 and assume the data is complete.

A query returning the first 1000 rows must not be treated as the full dataset.

When full-dataset processing is required:

- process in deterministic batches
- continue until completion
- record cursor state
- support retry
- avoid duplicates
- verify processed counts

## Batch sizing

Do not use oversized .in() arrays or URL query strings.

For UUID arrays, default batch sizes should normally remain around 200 to 300 unless measured otherwise.

When using an .in() batch:

- document the approximate request-size calculation
- account for URL encoding
- stay below provider and proxy limits
- test realistic worst-case values
- use server-side joins or temporary tables where better

Do not set a global batchSize without considering data shape.

## Filtering and search

Every filterable list must be designed around indexed server-side filters.

Do not:

- load all rows and filter in the browser
- use ILIKE percent term percent on large tables without a plan
- concatenate arbitrary filter SQL
- apply inconsistent filters between count and data queries

For search at scale, consider:

- trigram indexes
- full-text search
- dedicated search vectors
- external search only when justified

All search inputs must be validated and bounded.

Debounce customer-facing search where appropriate.

## Database indexes

Extends `Database`. Every migration adding a common:

- filter
- sort
- join
- foreign key
- tenant scope
- status
- date range
- lookup field

must assess whether an index is required.

Composite indexes should reflect real query order.

Do not add indexes blindly.

For significant queries:

- inspect the query plan
- confirm index usage
- record expected cardinality
- test realistic data volumes

## N plus one prevention

Do not perform one database query per row in a list.

Use:

- joins
- aggregated queries
- batched lookups
- precomputed summaries where justified
- repository methods designed for list views

Add performance tests for critical high-volume views.

## Data-volume testing

Create seeded scale-test datasets or generators for non-production use.

Test representative volumes such as:

- hundreds of organisations
- hundreds of thousands of opportunities
- millions of findings or source records where relevant
- tens of thousands of evidence items
- large audit histories
- high notification volume

Do not run destructive scale seeding against production.

All seed and scale scripts must use the existing Supabase safety guard (see DESTRUCTIVE SCRIPT SAFETY at the top of this file).

Performance acceptance should be based on realistic volumes, not empty databases.

## Idempotency for money and communications

Every financial or communication-producing operation requires deterministic idempotency.

This includes:

- Stripe webhook processing
- invoice creation
- refund or credit actions
- bid-credit allocation
- payment fulfilment
- email sending
- reminders
- colleague invitations
- profile-complete notifications
- scheduled alerts
- document-processing jobs
- outreach
- final-pack notifications

Use:

- deterministic idempotency keys
- unique database constraints
- durable event records
- safe replay
- atomic claim or lock operations

Idempotency must not rely only on application memory.

A retry must not create:

- duplicate payment fulfilment
- duplicate invoice
- duplicate credit
- duplicate email
- duplicate job
- duplicate audit event

## Atomicity

Avoid time-of-check to time-of-use races.

Do not:

- check whether an email was sent and then separately insert the send record
- check credit availability and then separately allocate without a transaction
- check webhook existence and then process without an atomic claim

Use database uniqueness, transactions or atomic procedures.

## Environment-safe communications

Extends `One live Supabase environment during development`, `Transactional email` and `Stripe billing`. Provider credentials must come from environment variables or approved secret management.

Do not read live provider keys from customer-accessible database tables.

Outside production:

- refuse to send to real recipients
- use a strict allowlist or sink recipient
- label messages as non-production where appropriate
- prevent live Stripe mode
- prevent bulk outreach
- prevent historical automation
- log blocked sends clearly

The send function itself must enforce the environment rule.

Do not rely only on callers behaving correctly.

## Communication cutover safety

Add a configurable automation cutover date.

All automated customer communications must check:

- environment
- cutover date
- organisation eligibility
- record creation date
- suppression status
- idempotency key

The cutover date must default to a future date or disabled state.

Automation must require a deliberate production action to become armed.

Do not allow first deployment to process historical back-catalogue automatically.

## Automation reliability

Extends `Background work` and `Observability`. Every scheduled or recurring automation requires:

- registry entry
- owner
- expected frequency
- last successful run
- next expected run
- heartbeat
- failure state
- retry policy
- manual retry
- alert threshold

Add a heartbeat table or equivalent durable record from the first automation.

Add a watchdog that identifies:

- missed runs
- repeated failures
- stale heartbeats
- disabled schedules
- authentication redirects
- deployment failures
- queue backlog

The schedule configuration and automation registry must be tested for consistency.

A test must fail when:

- a configured cron lacks a registry entry
- a registry entry lacks a schedule
- a protected route intercepts the automation
- the automation endpoint cannot authenticate
- a required environment variable is missing

Do not assume a successful deployment means automation is running.

## Environment validation

Extends `Environment variables`, `Environment separation` and `Manual setup rule`. Create one canonical environment schema.

Use fail-fast validation.

The application must refuse to start or deploy critical functionality when required variables are missing.

Do not allow features to silently disable because a variable is absent.

Environment validation must distinguish:

- local
- preview
- production

Each variable must define:

- required environments
- secret or public
- expected format
- purpose
- validation rule

Critical examples include:

- Supabase URL
- Supabase publishable key
- Supabase server secret where permitted
- AI Gateway key
- Companies House key
- Resend key
- Resend webhook secret
- Stripe keys
- Stripe webhook secret
- Stripe price IDs
- application URL
- workflow secrets
- automation cutover date

Production smoke tests must verify the integration, not only the variable's presence.

## Duplicate logic is prohibited

Extends `Code rules` and `Canonical state`. Do not duplicate domain functions.

Examples include:

- service normalisation
- serial normalisation
- tender status labels
- verdict calculation
- evidence status
- money formatting
- entitlement checks
- environment checks
- permission checks
- company identity matching

Before creating a helper:

1. Search the repository.
2. Reuse or move the existing implementation.
3. Update imports.
4. Remove the duplicate.

Add a check that flags same-named exported functions across multiple files for review.

Where duplicate names are legitimate, explicitly allowlist them.

Do not copy and modify an existing function under a new file because import changes are inconvenient.

## Canonical normalisation

Each normalised field must have one canonical function.

Examples:

- company names
- company numbers
- postcodes
- services
- CPV codes
- emails
- URLs
- tender references
- currency
- identifiers
- file hashes

Normalisation functions require unit tests covering real edge cases.

## Performance budgets

Define practical performance targets.

Customer-facing targets should include:

- fast initial page response
- progressive loading for research and large lists
- no full-page blocking for background work
- bounded query times
- bounded server-function execution
- bounded AI task duration
- bounded document-processing time
- paginated large lists
- visible progress for long tasks

Do not optimise blindly, but do not introduce known unbounded work.

For critical routes, capture:

- database query count
- slowest query
- total response time
- payload size
- number of records returned
- AI calls
- external calls

Add performance instrumentation before high-volume launch.

## Security and scale acceptance checklist

Before a feature is marked complete, verify:

### Security

- authentication implemented
- authorisation implemented
- tenant scope implemented
- RLS enabled
- RLS policies explicit
- no USING true
- no missing TO clause
- no unsafe token policy
- no browser-trusted organisation ID
- input validated
- output validated
- secrets server-side
- audit history created
- cross-tenant tests pass

### Reliability

- write errors checked
- no silent fallback
- idempotency where required
- retry safe
- partial failure handled
- customer sees real failure
- logs contain correlation ID
- background work durable

### Scale

- list paginated
- stable order present
- explicit limit present
- count not derived from truncated data
- filters server-side
- indexes assessed
- no N plus one query
- batch size justified
- realistic volume tested

### Design

- existing design system used
- no generic AI styling
- desktop and mobile reviewed
- accessibility checked
- terminology consistent
- one dominant action
- canonical state used
- no duplicate business facts
- loading error and empty states designed

A feature is not complete unless all applicable categories pass.

## Mandatory automated guards

Extends `Required checks before push`. The following issues have previously recurred in related systems and must be enforced mechanically.

Create or require tests or static checks for:

1. RLS disabled on tenant tables
2. USING true or WITH CHECK true
3. policies with no explicit TO clause
4. unsafe token-existence policies
5. ignored mutation errors
6. empty catch blocks
7. raw status updates outside state-machine modules
8. duplicate idempotency-sensitive sends or financial writes
9. missing stable order on paginated queries
10. counts derived from truncated arrays
11. oversized .in() query batches
12. missing indexes for critical list queries
13. real communications from non-production
14. missing required environment variables
15. configured automations without heartbeats
16. back-catalogue communications before cutover
17. duplicate normalisation functions
18. cross-tenant access
19. service-role operations without explicit authorisation
20. unbounded customer-facing list queries

For the first three high-risk areas:

- permissive RLS
- silent writes
- state-machine bypass

write the failing enforcement test before implementing the next related feature.

Documentation alone is not considered sufficient.

## Development priority

When beginning new feature development:

1. Define the canonical domain object.
2. Define permissions.
3. Define tenant scope.
4. Define RLS.
5. Write security and state enforcement tests.
6. Define indexes and query shape.
7. Define pagination.
8. Define idempotency.
9. Define errors and partial failure.
10. Define observability.
11. Define design-system components.
12. Implement the feature.
13. Run security, scale, UX and accessibility checks.
14. Verify against the live connected system where safe.

Do not build the happy-path UI first and retrofit security, state integrity or scale later.