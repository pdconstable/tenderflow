# Data access and scale

**Purpose:** Pagination, ordering, counts, limits, batching, filtering/search, indexes, N+1 prevention, data-volume testing and performance budgets.

**Read this when:** building any list, table, filter, search, report, export, bulk read/process, or query that can grow.

**Authority:** [CLAUDE.md](../../CLAUDE.md) is the highest-priority instruction file and always takes precedence. This document is a mandatory extension of CLAUDE.md, not optional guidance. No rule here is weaker for living in this file.

**Related:** [reliability-and-state.md](reliability-and-state.md), [security.md](security.md), [testing-and-release.md](testing-and-release.md), [architecture-and-platform.md](architecture-and-platform.md).

---

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

Extends the `.limit()` rule in the non-negotiable code rules in [CLAUDE.md](../../CLAUDE.md). All list queries must use explicit limits.

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

Extends the core database rules in [CLAUDE.md](../../CLAUDE.md). Every migration adding a common:

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

All seed and scale scripts must use the existing Supabase safety guard (see DESTRUCTIVE SCRIPT SAFETY at the top of [CLAUDE.md](../../CLAUDE.md)).

Performance acceptance should be based on realistic volumes, not empty databases.

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
