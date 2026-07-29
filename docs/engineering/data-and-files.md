# Data and files

**Purpose:** Private document storage and processing, file safety states and malware-scanning boundary, sensitive-document handling and retention, the single-organisation launch model with future multi-organisation readiness, and prospect-versus-customer data separation.

**Read this when:** any document upload/processing, storage, retention, tenancy-modelling, or prospect-data work.

**Authority:** [CLAUDE.md](../../CLAUDE.md) is the highest-priority instruction file and always takes precedence. This document is a mandatory extension of CLAUDE.md, not optional guidance. No rule here is weaker for living in this file.

**Related:** [security.md](security.md), [ai.md](ai.md), [reliability-and-state.md](reliability-and-state.md), [architecture-and-platform.md](architecture-and-platform.md).

---

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

Store files in private Supabase Storage buckets accessed only through short-lived signed URLs, scoped to the owning organisation. Do not pass full documents to AI when relevant passages are sufficient (see [ai.md](ai.md)).

Expected sensitive uploads include previous tender submissions, contracts,
references, certificates, insurance schedules, policies, accounts, KPI reports,
case studies, mobilisation plans, pricing support documents, buyer feedback and
commercially sensitive internal material. Plan for these from the beginning.

Malware scanning uses an adapter boundary; the exact provider is intentionally
deferred (see Deferred decisions in [architecture-and-platform.md](architecture-and-platform.md)). Until scanning is implemented, files requiring
automated processing must carry a clear safety state:

- uploaded
- pending scan
- safe for processing
- quarantined
- rejected

Do not claim files are scanned unless a real scanner has run. When automated file
processing is about to be enabled for production, stop and recommend a scanning
provider.

## Single-organisation launch model

Initial launch supports one customer organisation per account. Still design
tenancy so future multi-organisation support does not require a rebuild.

The tenancy enforcement mechanics — organisation_id on every tenant-owned table,
membership records, organisation-scoped reads and mutations, server-side
membership verification, RLS enabled with policies in the same migration, default
deny, and cross-tenant access tests — are defined in Multi-tenant security and
Authentication and authorisation in [security.md](security.md) and apply here in
full. Do not restate or weaken them.

Launch-specific decisions:

- Do not build group-company account switching at launch unless requested.

The data model may still record:

- bidding legal entity
- trading company
- holding company
- delivery entity
- related company
- former name

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
