# Architecture and platform

**Purpose:** The production stack, Vercel/Supabase responsibilities, Edge-Function policy, layering, environment separation, deployment verification, observability, the confirmed launch stack, the one-live-project development constraint, the manual-setup stop rule and deferred decisions.

**Read this when:** any architecture, runtime, deployment, environment, observability, or platform-configuration work.

**Authority:** [CLAUDE.md](../../CLAUDE.md) is the highest-priority instruction file and always takes precedence. This document is a mandatory extension of CLAUDE.md, not optional guidance. No rule here is weaker for living in this file. It extends — and never overrides — the safety rules in CLAUDE.md.

**Related:** [reliability-and-state.md](reliability-and-state.md), [integrations.md](integrations.md), [ai.md](ai.md), [testing-and-release.md](testing-and-release.md), [data-and-files.md](data-and-files.md).

---

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

Layering: Browser → Next.js application → server actions / route handlers (orchestration only) → application and domain services → repository adapters and external integrations. Durable background orchestration (Vercel Workflow preference) and background-job rules live in [reliability-and-state.md](reliability-and-state.md).

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

## Environment separation

Maintain separate environments for:

- local development
- Vercel preview
- production

Where practical, use separate Supabase projects or a clearly documented safe preview-data strategy.

Never connect Vercel preview deployments to live production data unless explicitly approved.

Environment variables must be documented by environment.

`.env.local` is gitignored and NOT synced to the host. Whenever a change adds an env var or an external integration, STOP and tell the user in plain English exactly what manual steps are needed before it works in production (this is the Manual setup rule below).

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

Fail-fast environment-variable validation (one canonical schema; refuse to start when required variables are missing) is defined in Environment validation in [reliability-and-state.md](reliability-and-state.md).

## One live Supabase environment during development

There is currently one live Supabase project.

This is the explicit, documented approval that `Environment separation` refers
to: during the solo-development phase local and Vercel preview deployments may
therefore connect to live data. It does not relax any safety rule — the
prohibited actions below still apply, and destructive or bulk mutations remain
governed by the `Database` and `Change discipline` rules in [CLAUDE.md](../../CLAUDE.md).

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

## Manual setup rule

This is the umbrella version of the stop-and-tell discipline in `Environment separation` above and `Environment variables` in [CLAUDE.md](../../CLAUDE.md). Whenever implementation requires any of the following:

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
