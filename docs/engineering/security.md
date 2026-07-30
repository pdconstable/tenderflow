# Security

**Purpose:** Authentication, authorisation, multi-tenant isolation, RLS, service-role limits, token access, roles, and safe external fetching.

**Read this when:** any database, RLS, permissions, auth, sharing/token, service-role, document-access, crawling, or customer-facing feature work.

**Authority:** [CLAUDE.md](../../CLAUDE.md) is the highest-priority instruction file and always takes precedence. This document is a mandatory extension of CLAUDE.md, not optional guidance. No rule here is weaker for living in this file. The project hard stops and priority order in CLAUDE.md override everything here.

**Related:** [reliability-and-state.md](reliability-and-state.md), [data-access-and-scale.md](data-access-and-scale.md), [testing-and-release.md](testing-and-release.md), [architecture-and-platform.md](architecture-and-platform.md), [data-and-files.md](data-and-files.md).

---

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

## Multi-tenant security

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

## Deny-by-default RLS

Builds on Multi-tenant security above. Every tenant-owned table must:

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

Documentation is not sufficient. RLS must be mechanically tested.

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

These checks are also enumerated in the mandatory automated guards in [testing-and-release.md](testing-and-release.md); write the failing test first for permissive RLS.

## Service-role restrictions

The Supabase service role must not be used as a convenience bypass.

Rules:

- no service-role client in browser code
- no service-role client in ordinary customer request paths
- every service-role operation validates user identity and organisation access separately
- service-role functions must be small and explicitly named
- service-role use must be documented in the code
- service-role operations require tests for cross-tenant denial
- service-role keys must never be logged

## Database connection guard contract

Every script or task that performs a remote database operation must run the
Supabase guard (`scripts/lib/supabase_guard.sh`) first, before any database
access. The guard enforces a deterministic, fail-closed connection contract so
behaviour never depends on the ambient shell on a machine that hosts several
projects. The contract (not the implementation) is:

- `DATABASE_URL` and `SUPABASE_DB_URL` are prohibited for Tender OS database
  operations. Their mere presence is a hard failure; they are never used as a
  connection source.
- The repository-linked `supabase/.temp/pooler-url` is the default connection
  source.
- `TENDERFLOW_DATABASE_URL` is the only permitted deliberate override.
- `SUPABASE_PROJECT_REF` is never trusted as proof. Every selected connection is
  independently verified — whole destination (Supabase pooler or direct host)
  and project identity — against the expected project, and any other project
  (including the forbidden one) is refused.
- Live-probe suppression is test-only: it requires the guard's explicit test
  mode against a fixture/temporary root and can never be used against the real
  repository link files.

The guard's exit codes, host-form rules and behaviour are documented in the
script header and covered by `tests/guards/supabase-guard.test.ts`; do not
restate the implementation here. The project hard stops and destructive-script
safety rule in [CLAUDE.md](../../CLAUDE.md) remain authoritative.

## Authentication and authorisation

- Authentication and authorisation are separate.
- Use central capability checks.
- Default deny.
- Never rely on hidden UI controls for security.
- Recheck permissions on every sensitive mutation.
- Magic links must be single-purpose, scoped, time-limited and revocable.
- Log access to sensitive evidence, submissions, financial fields and approvals.

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

## Website crawling and SSRF protection

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

## Privacy-sensitive logging and browser security

- Never log secrets, raw access tokens, full tender documents, full uploaded files, unnecessary personal data, or complete AI prompts containing sensitive customer information. The full logging structure and correlation-ID rules live in Observability in [architecture-and-platform.md](architecture-and-platform.md).
- Do not expose server-only environment variables through NEXT_PUBLIC variables (see Vercel runtime rules in [architecture-and-platform.md](architecture-and-platform.md)).
- Never disable deployment protection or security controls without explicit approval (see Vercel deployments in [architecture-and-platform.md](architecture-and-platform.md)).

## Security acceptance criteria

The security acceptance checklist a feature must pass before completion is maintained in [testing-and-release.md](testing-and-release.md) (Security and scale acceptance checklist and Mandatory automated guards).
