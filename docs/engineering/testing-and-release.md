# Testing and release

**Purpose:** Required test categories, build and pre-push checks, the security-and-scale acceptance checklist, the mandatory automated guards, and the development-order rule.

**Read this when:** writing tests, preparing to push, verifying a migration or deployment, or finishing any feature.

**Authority:** [CLAUDE.md](../../CLAUDE.md) is the highest-priority instruction file and always takes precedence. This document is a mandatory extension of CLAUDE.md, not optional guidance. No rule here is weaker for living in this file. The Git workflow and pre-push discipline in CLAUDE.md remain authoritative (direct-to-main solo development; no branches or pull requests).

**Related:** [security.md](security.md), [reliability-and-state.md](reliability-and-state.md), [data-access-and-scale.md](data-access-and-scale.md), [ai.md](ai.md), [architecture-and-platform.md](architecture-and-platform.md), [design-system.md](design-system.md).

---

## Build checks

- Verify with `npx tsc --noEmit` by default.
- tsc does NOT catch SWC/Next compile errors. For changes touching "use server" files, run one build before pushing.

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

Detailed enforcement tests live with their subject: RLS enforcement tests in [security.md](security.md); silent-write and state-machine enforcement tests in [reliability-and-state.md](reliability-and-state.md); AI evaluation datasets in [ai.md](ai.md).

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

Extends `Required checks before push` above. The following issues have previously recurred in related systems and must be enforced mechanically.

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
