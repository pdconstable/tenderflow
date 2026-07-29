# Reliability and state

**Purpose:** No silent writes, error classification, state-machine integrity, idempotency, atomicity, background jobs, automation reliability, environment-safe communications and fail-fast environment validation.

**Read this when:** any write/mutation, status change, payment or communication, background job, scheduled automation, or environment-variable handling.

**Authority:** [CLAUDE.md](../../CLAUDE.md) is the highest-priority instruction file and always takes precedence. This document is a mandatory extension of CLAUDE.md, not optional guidance. No rule here is weaker for living in this file.

**Related:** [security.md](security.md), [data-access-and-scale.md](data-access-and-scale.md), [integrations.md](integrations.md), [architecture-and-platform.md](architecture-and-platform.md), [testing-and-release.md](testing-and-release.md).

---

## Silent failure is prohibited

Extends the error-handling rules in the non-negotiable code rules in [CLAUDE.md](../../CLAUDE.md). Every write operation must:

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

## Environment-safe communications

Applies with `One live Supabase environment during development` and `Vercel deployments` in [architecture-and-platform.md](architecture-and-platform.md), and with `Transactional email` and `Stripe billing` in [integrations.md](integrations.md). Provider credentials must come from environment variables or approved secret management.

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

Applies with `Background work` above and `Observability` in [architecture-and-platform.md](architecture-and-platform.md). Every scheduled or recurring automation requires:

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

Applies with `Environment variables` and `Environment separation` in [architecture-and-platform.md](architecture-and-platform.md) and the `Manual setup rule` there. Create one canonical environment schema.

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

Extends the non-negotiable code rules in [CLAUDE.md](../../CLAUDE.md) and Canonical state in [design-system.md](design-system.md). Do not duplicate domain functions.

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
