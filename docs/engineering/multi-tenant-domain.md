# Multi-tenant domain

**Purpose:** The definitive ownership model for Tender OS — organisations, legal entities, trading identities and bidding identities — the four data zones, how customer analysis relates to shared global data, the identity invariants every feature must respect, and a foundational first-schema proposal with its required tests and fixture.

**Read this when:** any database schema, authentication or authorisation, customer feature, company onboarding, company research, public-source matching, opportunity matching, assessment or bid, evidence, background-job, AI-processing, storage, billing, internal-administration or prospect-conversion work.

**Authority:** [CLAUDE.md](../../CLAUDE.md) is the highest-priority instruction file and always takes precedence. This document is a mandatory extension of CLAUDE.md, not optional guidance. No rule here is weaker for living in this file.

**Related:** [security.md](security.md), [data-and-files.md](data-and-files.md), [reliability-and-state.md](reliability-and-state.md), [architecture-and-platform.md](architecture-and-platform.md), [ai.md](ai.md), [data-access-and-scale.md](data-access-and-scale.md), [testing-and-release.md](testing-and-release.md).

---

## What this document owns

This document defines the domain boundaries and the ownership model: what an organisation, a legal entity, a trading identity and a bidding identity are, how they relate, and which data belongs to whom.

It does not restate enforcement mechanics. The tenancy enforcement mechanics — organisation_id on every tenant-owned table, membership records, organisation-scoped reads and mutations, server-side membership verification, RLS enabled with policies in the same migration, default deny, service-role restrictions, and cross-tenant access tests — are defined in Multi-tenant security, Deny-by-default RLS, RLS enforcement tests, Service-role restrictions and Authentication and authorisation in [security.md](security.md) and apply here in full. Do not restate or weaken them.

This document is the single source for the identity model. Where other documents mention legal entities, trading companies or bidding identities, they defer here.

## Core terminology

Use these terms consistently. Never blur them.

Organisation. The subscribing Tender OS customer account. An organisation controls memberships, subscription, entitlements, usage limits, billing, customer-owned data and access permissions. The organisation is not necessarily the legal company or the public-facing brand.

Legal entity. The incorporated or legally recognised entity that contracts, makes declarations and carries legal responsibility. For a UK company this normally includes a Companies House number, registered legal name, company status, registered office, incorporation date, SIC codes, former legal names, VAT details where relevant, and legal credentials and insurance.

Trading identity. A public-facing trading name, division or brand operated by a legal entity. A trading identity may have its own trading name, website, domain, logo, trading address, phone number, email domain, service offering, target sectors, delivery geography, customer references, case studies, accreditations, public-contract experience, tender appetite and brand-specific evidence. A trading identity has no independent legal personality unless it is also linked to a separate legal entity.

Bidding identity. The identity presented to a buyer for a specific opportunity or bid. A bidding identity must resolve to organisation, exact legal entity, selected trading identity where applicable, display name, legal contracting name, company number, relevant website, correspondence details and evidence scope. A bid must never use a trading name without retaining the underlying legal entity.

## The four data zones

Tender OS data belongs to exactly one of four zones. The zone determines ownership, duplication and access.

Global platform data. Shared public or reference data: procurement notices, buyers, lots, frameworks, CPV codes, public award notices, procurement-source records, geographic reference data and shared requirement taxonomies. Global data is stored once and must not be duplicated per customer.

Tenant-owned customer data. Private customer information: organisation profile, legal entities, trading identities, websites, services, sectors, credentials, evidence, case studies, experience, assessments, decisions, bids, drafts, colleague requests, approvals, documents, customer-specific usage and entitlements.

Tenant-specific interpretation of global data. Private customer analysis linked to shared global records: customer opportunity match, legal-entity fit, trading-identity fit, eligibility assessment, verdict, confidence, evidence coverage, blockers, effort estimate, action plan and decision history. A global tender is shared. A customer assessment is tenant-owned. A trading-identity-specific assessment is tenant-owned and must reference the selected trading identity.

- Never store customer-specific scores, recommendations, evidence state or trading-identity fit on the global opportunity record.

Internal platform operational data. Tender OS operational records: research runs, supplier matching, prospect data, writer assignments, reviewer assignments, support access, background jobs, integration events, model usage, billing events, audit records and delivery-quality records. Internal records relating to a customer must carry organisation ownership or exact resource scope where appropriate.

## Core relationships

The conceptual ownership structure:

organisation
-> organisation_memberships
-> subscriptions
-> entitlements
-> legal_entities

legal_entity
-> trading_identities
-> registered_activities
-> legal_credentials
-> legal_addresses
-> former_names

trading_identity
-> websites
-> trading_addresses
-> services
-> sectors
-> delivery_geographies
-> contact_points
-> case_studies
-> public_contract_experience
-> trading_identity_credentials
-> evidence links
-> tender_appetite

assessment
-> organisation
-> legal_entity
-> trading_identity where applicable
-> global opportunity

bid
-> organisation
-> legal_entity
-> trading_identity where applicable
-> global opportunity

- Do not use the organisation record itself as the Companies House company.
- Do not use a trading identity as the legal contracting party.

## Organisation model

- An organisation represents the subscribing account.
- It may own one or more legal entities.
- Initial customer UI may focus on one legal entity, but the schema must support more without migration or identity redesign.
- Users relate to organisations through organisation_memberships.
- Do not use a permanent organisation_id on the user profile as the sole relationship.

The one-organisation-per-account launch model is defined in the Single-organisation launch model in [data-and-files.md](data-and-files.md) and the Confirmed launch stack in [architecture-and-platform.md](architecture-and-platform.md). Multiple legal entities and trading identities under a single organisation are in scope from launch; multi-organisation customer accounts remain the deferred decision recorded in [architecture-and-platform.md](architecture-and-platform.md).

## Legal-entity model

Each legal entity must support id, organisation_id, jurisdiction, entity_type, legal_name, registration_number, registration_authority, company_status, incorporation_date, registered_address, primary_contact details where appropriate, VAT registration details where appropriate, is_primary, created_at, updated_at and archived_at.

For Companies House entities:

- registration_number must be normalised.
- jurisdiction and registration authority must be explicit.
- source provenance must be retained.
- official data must remain distinct from customer corrections or interpretations.
- registration-number uniqueness is scoped by jurisdiction and authority, not global.

- Do not assume Companies House numbers are the only legal identifiers the platform will ever hold.

Company-identity, company-name and company-number normalisation are single-source canonical concerns; see Duplicate logic is prohibited and Canonical normalisation in [reliability-and-state.md](reliability-and-state.md).

## Trading-identity model

Trading identities are mandatory first-class records from the first schema. They must never be collapsed into the organisation, the legal entity, a free-text field, an alias array, JSON metadata or the website record.

Each trading identity must support id, organisation_id, legal_entity_id, trading_name, normalised_trading_name, identity_type, description, is_primary, active status, launch or start date where known, end date where historic, main website, main trading address, public contact details, created_at, updated_at and archived_at.

Identity types may include primary trading name, secondary trading name, division, brand and historic trading name.

- A legal entity may have multiple active trading identities.
- Do not treat a dormant or historic trading identity as currently bid-capable.
- A trading name is not assumed unique across the whole platform.
- Trading-name uniqueness is scoped within the correct legal-entity or organisation scope.

## Trading-name provenance and verification

Each trading identity must retain evidence showing why Tender OS believes it belongs to the legal entity. This is a narrow relationship-proof concern, not the general evidence library.

Potential sources include a website legal footer, terms and conditions, privacy policy, Companies House filings, invoices, certificates, contracts, customer confirmation, public contract awards and official scheme records.

Record source, source URL or document, supporting passage, retrieved date, confidence, relationship interpretation, customer confirmation, confirmed by and confirmed at.

- Do not mark a trading identity as legally connected based only on similar names or branding.

Where the relationship is uncertain, use a status such as proposed, requires confirmation, confirmed, disputed, historic or rejected.

## Websites and domains

Websites are separate records, never a field on an identity. A legal entity or trading identity may have multiple websites, redirected domains, historic domains, and campaign or product domains.

- Every website has organisation_id and is tenant-owned.
- A website may optionally represent a legal entity generally.
- A website does not have to belong to a trading identity.
- One website may relate to multiple trading identities through website_identity_links.
- Every website-identity link carries relationship type, verification state and provenance.
- A website may represent the legal entity generally, one specific trading identity, multiple trading identities, a group brand, or an unrelated or uncertain entity.
- Website-identity links may not cross organisation boundaries.
- A trading-identity link must be consistent with the trading identity's owning legal entity.
- Services discovered on one website are not automatically assigned to every linked identity.

## Services, sectors and geography scope

Services, sectors and delivery geographies carry explicit scope. Every service or sector relationship states whether it applies organisation-wide, to a specific legal entity, or to a specific trading identity.

- Prefer specific scope over duplicated free-text records.
- Do not copy all services and sectors automatically to every trading identity.
- Allow inheritance only through defined rules.

Examples:

- Electrical installation may apply to the legal entity generally.
- Domestic EV charging may apply to Trading Identity A.
- Commercial fleet charging may apply to Trading Identity B.
- A public-sector case study may be usable by both identities but require legal-entity disclosure.

## Evidence ownership and applicability

Evidence distinguishes ownership from applicability.

Ownership records who legally or operationally owns the evidence: organisation, legal entity or trading identity.

Applicability records where the evidence may legitimately be used: one legal entity, one trading identity, multiple selected trading identities, organisation-wide or opportunity-specific.

Evidence examples include insurance, accreditations, policies, certificates, case studies, references, KPIs, accounts, staff CVs, method statements and delivery statistics.

- Do not assume legal-entity evidence automatically proves brand-specific experience.
- Do not assume a trading-identity case study represents experience of another trading identity without an explicit supported relationship.
- Model evidence applicability rather than duplicating the same document for every identity.

Storage, file-safety states and retention for evidence documents are defined in File processing in [data-and-files.md](data-and-files.md).

## Credentials

Credentials may be held by the legal entity, a trading identity, an individual or a delivery partner.

- Preserve the actual credential holder.
- Opportunity qualification checks whether the holder is acceptable for the tender and the selected bidding identity.
- Do not flatten every accreditation onto the organisation.

## Public-contract experience and awards

Public awards and experience are matched to the exact legal entity where possible, the trading identity where evidenced, the buyer, the contract, the award date, the source and a confidence.

A contract awarded to the legal entity may support a trading identity only when the identity was involved, the service relevance is supported, and the relationship is explained accurately.

- Do not infer that every legal-entity award belongs to every trading identity.

## Bidding-identity selection

Every assessment and bid selects organisation_id, legal_entity_id, trading_identity_id where the company bids under a trading name, display_name and legal_contracting_name.

- At launch, default to the organisation's primary legal entity and primary trading identity.
- The user must be able to change the selected trading identity before final qualification or production.

Changing the bidding identity triggers re-evaluation of service fit, sector fit, geographic fit, evidence coverage, case studies, credentials, public-contract experience, claim wording, buyer-facing identity, and website and contact details.

- Do not allow the selected identity to change silently after customer approval.

Material identity changes require an audit event, an assessment refresh, invalidation of affected approvals and revalidation before submission. Assessment, qualification, bid and approval lifecycles run through the canonical state machines in State-machine enforcement in [reliability-and-state.md](reliability-and-state.md).

## Buyer-facing presentation

Tender OS clearly distinguishes the trading or display name, the legal contracting entity and the company registration number.

Conceptual buyer-facing wording: Pro EV is a trading name of Pro EV Group Ltd, registered in England and Wales under company number XXXXXXXX.

- Do not invent the exact legal wording automatically.
- Generate proposed disclosure text from confirmed records and require customer approval.

## Company onboarding

The onboarding flow supports:

1. Select or create organisation.
2. Find and confirm legal entity.
3. Research websites and public identity.
4. Detect possible trading names.
5. Ask the customer to confirm each trading identity.
6. Select primary trading identity.
7. Assign websites.
8. Assign services.
9. Assign sectors.
10. Assign geographies.
11. Map credentials and evidence.
12. Review legal and trading relationships.

For the initial setup the flow must model one legal entity, two active trading identities, potentially different websites, potentially overlapping services, potentially different sectors, and shared and identity-specific evidence.

- Do not force a customer to repeat organisation-wide information separately for both trading identities.

## Matching architecture

Opportunity matching assesses at multiple levels.

Organisation level: subscription and entitlement, overall capacity, financial appetite and account-wide exclusions.

Legal-entity level: legal status, turnover and accounts, insurance, mandatory certifications, legal geography and contract eligibility.

Trading-identity level: services, sectors, experience, website evidence, delivery geography, case studies and brand-specific appetite.

The result identifies the strongest bidding identity and may produce a best-fit trading identity, an alternative trading identity, no suitable trading identity, a legal-entity eligibility issue or an organisation-level capacity issue.

- Do not create one undifferentiated company-fit score.

## Role and access model

Organisation membership grants access to the customer account. Fine-grained permissions may later limit access by legal entity, trading identity, bid, document or function.

- The first schema does not need full per-trading-identity permissions for ordinary customer users unless justified.
- Internal writers, reviewers and scoped external collaborators must only access the identities and bids assigned to them.
- Do not encode future identity-level permissions in a way that requires duplicating user accounts.

Authentication, authorisation, capability checks and reviewer-access limits are defined in Authentication and authorisation and Professional user roles in [security.md](security.md) and apply here in full. Do not restate or weaken them.

## Platform roles versus customer roles

Customer roles and Tender OS platform roles are separate taxonomies stored separately.

Customer roles: organisation_owner, organisation_admin, organisation_contributor, organisation_viewer.

Platform roles: platform_admin, platform_operations, platform_researcher, platform_writer, platform_reviewer, platform_support.

- A platform role does not automatically grant customer access.
- Internal customer access must be explicitly scoped, time-bound where appropriate, auditable and revocable.
- Customer access for a platform user requires a separate scoped_platform_customer_access record; a platform role assignment alone never grants it.

## Resource ownership and immutability

- Every tenant-owned resource has immutable organisation ownership.
- Where identity matters, records also reference the relevant legal_entity_id, trading_identity_id, assessment_id, bid_id, document_id or opportunity_id.
- Do not infer the trading identity solely from the currently selected organisation default.
- Normal application updates must not move records between organisations or legal entities.
- Changing identity association uses an explicit audited process, not an ordinary update.

## Primary identities

- At most one active primary legal entity per organisation.
- At most one active primary trading identity per legal entity.
- A primary identity cannot be archived, rejected or historic.
- Archiving a primary record requires a replacement primary or an explicit no-primary state.
- Partial unique indexes or equivalent database constraints enforce primary uniqueness.
- Changing the default primary identity never silently changes an already approved assessment or bid.

## Prospect model and conversion

Prospects are not customer tenants. A prospect may include a suspected legal entity, suspected trading names, possible websites, public services and sectors, public award evidence and source-backed identity relationships, all remaining proposed until confirmed.

Prospect-versus-customer separation, prospect tables and the rule that prospect data must not be exposed through ordinary customer RLS are defined in Reverse-matching prospect data in [data-and-files.md](data-and-files.md) and apply here in full. Do not restate or weaken them.

When a prospect converts:

1. Create organisation.
2. Create confirmed legal entity.
3. Create owner membership.
4. Create confirmed or proposed trading identities.
5. Link websites to the correct identity.
6. Copy only relevant sourced findings.
7. Preserve source and conversion history.
8. Mark unsupported relationships as requiring confirmation.
9. Do not mutate the prospect into the customer tenant.

## Background-job tenancy and identity context

Every customer-related job records directly organisation_id, legal_entity_id where applicable, trading_identity_id where applicable, job_type, subject_type, subject_id, requested_by, idempotency_key, deployment_environment, status, attempt_count, current_step and timestamps.

Examples: a website crawl for Trading Identity A, a Companies House refresh for Legal Entity 1, evidence extraction shared across selected identities, an opportunity assessment for Trading Identity B.

- Every step revalidates ownership and identity scope before writing.
- Global procurement jobs are explicitly classified as platform-global.

Background-work durability, idempotency and orchestration rules are defined in Background work and Idempotency for money and communications in [reliability-and-state.md](reliability-and-state.md).

## AI context and cost attribution

Every customer-related AI execution records organisation_id, legal_entity_id where relevant, trading_identity_id where relevant, task type, related subject, research run or bid, model alias, provider, usage, estimated cost, status, prompt version, schema version, correlation ID and timestamps.

- AI prompts use only the identity-relevant information required for the task.
- Do not send all trading identities' private evidence when analysing one identity.

AI provenance, model routing, customer approval and failure behaviour are defined in [ai.md](ai.md).

## Storage ownership

Use private tenant-scoped storage paths conceptually similar to:

organisations/{organisation_id}/legal-entities/{legal_entity_id}/documents/{document_id}/{safe_filename}

- Where a document is trading-identity specific, retain that relationship in database metadata.
- Do not depend on path secrecy.

Access validates the authenticated user, active organisation membership or scoped platform access, organisation ownership, the legal-entity relationship, trading-identity applicability where required, document status and the exact object. Private storage, signed URLs and file-safety states are defined in File processing in [data-and-files.md](data-and-files.md).

## Tenant-aware resource limits

Design organisation-level limits for concurrent jobs, crawl concurrency, AI usage, AI spend, storage, document size, email rate, active bids, assessments and API requests.

- Where appropriate, also meter by trading identity for analytics and commercial visibility.
- Default commercial quotas apply to the organisation, not independently to every trading identity.
- Do not allow a customer with multiple trading identities to multiply its quota accidentally unless its plan explicitly permits this.

## Audit model

Maintain mutable current state plus append-only history for important changes.

Audit legal-entity confirmation, trading-identity creation, trading-identity relationship confirmation, website assignment, primary identity changes, bidding-identity selection, evidence-applicability changes, service and sector scope changes, bid identity changes, customer approvals, and membership and platform-access changes.

Audit events carry organisation_id, legal_entity_id where relevant, trading_identity_id where relevant, actor, action, subject, prior state where safe, resulting state where safe, source, correlation ID and timestamp.

## Data-modelling rules

Use typed relational tables and join tables for organisations, legal entities, trading identities, websites, addresses, contact points, services, sectors, geographies, credentials, evidence applicability, bidding identities, memberships, permissions and lifecycle state.

- Do not store trading identities as a JSON array on the legal entity.
- Do not store services or sectors as unqueryable JSON blobs.

JSON remains appropriate for raw source responses, versioned extraction payloads, model metadata and source snapshots.

## Caching

Customer-specific cache keys include organisation_id, legal_entity_id where relevant, trading_identity_id where relevant, subject and version.

Prohibited:

- assessment:{opportunity_id}

Required conceptual pattern:

- assessment:{organisation_id}:{legal_entity_id}:{trading_identity_id}:{opportunity_id}:{assessment_version}

- Do not reuse a legal-entity-level result as trading-identity-specific without an explicit derivation rule.

## Scaling strategy

Do not introduce partitioning prematurely. Start with stable UUID ownership keys, legal-entity and trading-identity foreign keys, appropriate composite indexes, keyset pagination, bounded queries, durable jobs, usage metering, resumable processing and realistic volume tests.

Likely high-volume tables include procurement notices, source documents, extracted requirements, candidate matches, customer opportunity matches, identity-specific assessments, research findings, evidence applicability, audit events, AI usage, job events and email events. Pagination, index and count rules are defined in [data-access-and-scale.md](data-access-and-scale.md).

## Architecture invariants

1. Organisation is the subscribing account.
2. Legal entity is separate from organisation.
3. Trading identity is a first-class record.
4. One legal entity may have multiple active trading identities.
5. Every bid resolves to an exact legal entity and trading identity where applicable.
6. Trading names never obscure the legal contracting entity.
7. Global procurement data is stored once.
8. Customer analysis is never stored on global procurement records.
9. Services, sectors, experience and evidence retain their identity scope.
10. Organisation-wide evidence is not duplicated unnecessarily.
11. Identity-specific evidence is not automatically shared.
12. Websites are separate records and mapped to identities.
13. Public-source identity relationships require provenance.
14. Users access customer data through organisation membership.
15. Platform roles do not automatically grant customer access.
16. Jobs carry direct organisation, legal-entity and identity context.
17. AI processing uses only relevant identity-scoped data.
18. Quotas default to organisation level, not per trading identity.
19. Customer-specific cache keys include identity context.
20. Material bidding-identity changes invalidate affected approvals.
21. Launch must support one legal entity with two trading identities.
22. Launch simplicity must not require a future identity-model rebuild.
23. At most one active primary legal entity per organisation.
24. At most one active primary trading identity per legal entity.
25. An address or contact point carries at most one of legal_entity_id or trading_identity_id; neither set means organisation-level scope.

## Foundational schema proposal

This proposes, but does not implement, the first schema batch. No migration, SQL or database command is created from this document. The proposal covers identity, membership, roles, provenance, websites and minimal audit only.

Deliberately excluded from batch one: opportunities, assessments, evidence library, bids, AI findings, billing, email and full product features.

RLS approach for every table below defers to Deny-by-default RLS and RLS enforcement tests in [security.md](security.md): RLS enabled, explicit policies with an explicit TO clause in the same migration, deny-by-default, no USING true, no WITH CHECK true, scoped by verified organisation membership, covered by tenant-isolation tests. Policy SQL is not restated here.

### organisations

- Purpose: the subscribing customer account and tenant root.
- Ownership zone: tenant-owned customer data; this is the tenant root.
- Key columns: id, name, status, created_at, updated_at, archived_at.
- Foreign keys: none upward; referenced by every tenant-owned table.
- Uniqueness: id primary key.
- Immutability: id is immutable and is the tenant owner for all descendants.
- RLS approach: readable and writable only through verified membership; defers to security.md.
- Indexes: primary key; status where listed.
- Lifecycle states: active, suspended, archived.
- Audit requirements: creation and status changes recorded in audit_events.
- Expected future relationships: subscriptions, entitlements, usage limits, billing.

### organisation_memberships

- Purpose: relate users to organisations and carry the approved customer role.
- Ownership zone: tenant-owned customer data.
- Key columns: id, organisation_id, user_id, customer_role_key, status, invited_by, created_at, updated_at, revoked_at.
- Foreign keys: organisation_id -> organisations.id; user_id -> auth.users.id; customer_role_key -> customer_role_definitions.role_key.
- Uniqueness: one membership per (organisation_id, user_id).
- Immutability: organisation_id and user_id immutable; role and status change through audited actions.
- RLS approach: a user reads their own memberships; organisation admins manage memberships within their organisation; defers to security.md.
- Indexes: (organisation_id, user_id) unique; (user_id); (organisation_id, status).
- Lifecycle states: invited, active, suspended, revoked.
- Audit requirements: membership and role changes recorded in audit_events.
- Expected future relationships: fine-grained per-identity and per-bid permissions.

### customer_role_definitions

- Purpose: the controlled catalogue of customer roles for batch one.
- Ownership zone: internal platform reference data (shared catalogue, not per tenant).
- Key columns: role_key, display_name, description, capability_summary.
- Foreign keys: none.
- Uniqueness: role_key primary key.
- Immutability: catalogue is fixed in batch one; no arbitrary customer-created roles.
- RLS approach: readable by authenticated users; not customer-writable.
- Indexes: primary key.
- Lifecycle states: none; the batch-one set is organisation_owner, organisation_admin, organisation_contributor, organisation_viewer.
- Audit requirements: catalogue changes are migrations, not customer actions.
- Expected future relationships: capability definitions and per-capability checks.

### legal_entities

- Purpose: the incorporated or legally recognised contracting entity owned by an organisation.
- Ownership zone: tenant-owned customer data.
- Key columns: id, organisation_id, jurisdiction, entity_type, legal_name, registration_number, normalised_registration_number, registration_authority, company_status, incorporation_date, vat_details where relevant, is_primary, source_provenance, created_at, updated_at, archived_at.
- Foreign keys: organisation_id -> organisations.id.
- Uniqueness: registration scoped by (jurisdiction, registration_authority, normalised_registration_number) where a registration number exists; not a global assumption.
- Immutability: organisation_id immutable; official Companies House data kept distinct from customer corrections.
- RLS approach: organisation-scoped; defers to security.md.
- Indexes: (organisation_id); partial unique index enforcing one active primary legal entity per organisation; (jurisdiction, registration_authority, normalised_registration_number).
- Lifecycle states: active, archived; is_primary constrained so a primary is never archived.
- Audit requirements: confirmation, correction and primary changes recorded in audit_events.
- Expected future relationships: registered_activities, legal_credentials, former_names, accounts, insurance.

### trading_identities

- Purpose: a first-class public-facing trading name, division or brand operated by a legal entity.
- Ownership zone: tenant-owned customer data.
- Key columns: id, organisation_id, legal_entity_id, trading_name, normalised_trading_name, identity_type, description, is_primary, active_status, start_date, end_date, main_website_id, created_at, updated_at, archived_at.
- Foreign keys: organisation_id -> organisations.id; legal_entity_id -> legal_entities.id; main_website_id -> websites.id where set.
- Uniqueness: trading-name uniqueness scoped within legal entity or organisation, not global.
- Immutability: organisation_id and legal_entity_id immutable; re-association is an explicit audited process. A trading identity may never reference a legal entity in another organisation.
- RLS approach: organisation-scoped; defers to security.md.
- Indexes: (legal_entity_id); (organisation_id); partial unique index enforcing one active primary trading identity per legal entity; (organisation_id, normalised_trading_name).
- Lifecycle states: primary trading name, secondary trading name, division, brand, historic trading name; active or historic. A primary identity is never archived, rejected or historic.
- Audit requirements: creation, relationship confirmation and primary changes recorded in audit_events.
- Expected future relationships: services, sectors, delivery geographies, case studies, credentials, evidence applicability, tender appetite.

### trading_identity_legal_entity_evidence

- Purpose: narrowly prove that a specific trading identity is operated by a specific legal entity. This is not the general customer evidence library.
- Ownership zone: tenant-owned customer data (provenance for the identity relationship).
- Key columns: id, organisation_id, legal_entity_id, trading_identity_id, source_type, source_url or future document reference, supporting_passage, relationship_status, confidence, retrieved_at, confirmed_by, confirmed_at, superseded_at.
- Foreign keys: organisation_id -> organisations.id; legal_entity_id -> legal_entities.id; trading_identity_id -> trading_identities.id; confirmed_by -> auth.users.id where set.
- Uniqueness: no global uniqueness; multiple evidence rows may support one relationship over time.
- Immutability: organisation_id immutable; superseded rows retained, not deleted. All three of organisation_id, legal_entity_id and trading_identity_id must belong to the same organisation, and the trading identity must belong to the referenced legal entity.
- RLS approach: organisation-scoped; defers to security.md.
- Indexes: (trading_identity_id); (legal_entity_id); (organisation_id, relationship_status).
- Lifecycle states via relationship_status: proposed, requires confirmation, confirmed, disputed, historic, rejected.
- Audit requirements: status transitions and customer confirmation recorded in audit_events.
- Expected future relationships: links to stored source documents once document metadata exists.

### websites

- Purpose: a website or domain owned by an organisation, optionally representing a legal entity generally.
- Ownership zone: tenant-owned customer data.
- Key columns: id, organisation_id, legal_entity_id where the site represents the legal entity generally, url, normalised_domain, relationship_type, status, verification_state, source, first_seen_at, last_verified_at, created_at, updated_at, archived_at.
- Foreign keys: organisation_id -> organisations.id; legal_entity_id -> legal_entities.id where set.
- Uniqueness: normalised_domain unique within organisation where appropriate; historic and redirected domains permitted.
- Immutability: organisation_id immutable. A website's legal_entity_id, where set, must belong to the same organisation.
- RLS approach: organisation-scoped; defers to security.md.
- Indexes: (organisation_id); (organisation_id, normalised_domain); (legal_entity_id).
- Lifecycle states: active, redirected, historic, campaign, uncertain, archived.
- Audit requirements: assignment and verification changes recorded in audit_events.
- Expected future relationships: crawl runs, page snapshots, extracted services.

### website_identity_links

- Purpose: relate one website to one or more trading identities with provenance.
- Ownership zone: tenant-owned customer data (join table).
- Key columns: id, organisation_id, website_id, trading_identity_id, relationship_type, verification_state, source, supporting_passage, created_at, updated_at.
- Foreign keys: organisation_id -> organisations.id; website_id -> websites.id; trading_identity_id -> trading_identities.id.
- Uniqueness: one link per (website_id, trading_identity_id).
- Immutability: organisation_id immutable; a link may not cross organisation boundaries and the trading identity must be consistent with the website's owning legal entity where the website is legal-entity scoped.
- RLS approach: organisation-scoped; defers to security.md.
- Indexes: (website_id); (trading_identity_id); (website_id, trading_identity_id) unique.
- Lifecycle states via verification_state: proposed, confirmed, disputed, rejected.
- Audit requirements: link creation and verification changes recorded in audit_events.
- Expected future relationships: per-identity service and sector discovery.

### addresses

- Purpose: postal addresses scoped to organisation, legal entity or trading identity.
- Ownership zone: tenant-owned customer data.
- Key columns: id, organisation_id, legal_entity_id, trading_identity_id, address_type, lines, locality, region, postal_code, country, source, created_at, updated_at, archived_at.
- Foreign keys: organisation_id -> organisations.id; legal_entity_id -> legal_entities.id where set; trading_identity_id -> trading_identities.id where set.
- Uniqueness: no global uniqueness; a legal entity has at most one active registered-office address.
- Immutability: organisation_id immutable. At most one of legal_entity_id or trading_identity_id may be set; neither set means organisation-level scope. A registered-office address must be legal-entity scoped. All set identity references must belong to the same organisation, and a trading_identity_id must resolve to its owning legal entity. A check constraint enforces the permitted combinations; the trading identity already resolves its legal entity, so legal_entity_id is not required alongside trading_identity_id.
- RLS approach: organisation-scoped via organisation_id; defers to security.md.
- Indexes: (organisation_id); (legal_entity_id); (trading_identity_id); partial index for registered-office lookups.
- Lifecycle states: active, archived.
- Audit requirements: registered-office changes recorded in audit_events.
- Expected future relationships: delivery geographies and site-level records.

### contact_points

- Purpose: phone, email and web contact details scoped to organisation, legal entity or trading identity.
- Ownership zone: tenant-owned customer data.
- Key columns: id, organisation_id, legal_entity_id, trading_identity_id, contact_type, value, normalised_value, source, created_at, updated_at, archived_at.
- Foreign keys: organisation_id -> organisations.id; legal_entity_id -> legal_entities.id where set; trading_identity_id -> trading_identities.id where set.
- Uniqueness: no global uniqueness.
- Immutability: organisation_id immutable. At most one of legal_entity_id or trading_identity_id may be set; neither set means organisation-level scope. All set identity references belong to the same organisation, and a trading_identity_id resolves to its owning legal entity. A check constraint enforces the permitted combinations.
- RLS approach: organisation-scoped via organisation_id; defers to security.md.
- Indexes: (organisation_id); (legal_entity_id); (trading_identity_id).
- Lifecycle states: active, archived.
- Audit requirements: material contact changes recorded in audit_events.
- Expected future relationships: buyer-facing correspondence details on a bid.

### platform_role_definitions

- Purpose: the controlled catalogue of Tender OS platform roles.
- Ownership zone: internal platform reference data.
- Key columns: role_key, display_name, description, capability_summary.
- Foreign keys: none.
- Uniqueness: role_key primary key.
- Immutability: fixed catalogue; changes are migrations.
- RLS approach: readable by platform users; not customer-visible or customer-writable.
- Indexes: primary key.
- Lifecycle states: none; the set is platform_admin, platform_operations, platform_researcher, platform_writer, platform_reviewer, platform_support.
- Audit requirements: catalogue changes are migrations.
- Expected future relationships: platform capability definitions.

### platform_role_assignments

- Purpose: assign a platform role to a Tender OS internal user. This grants no customer-organisation access on its own.
- Ownership zone: internal platform operational data.
- Key columns: id, user_id, platform_role_key, status, assigned_by, created_at, revoked_at.
- Foreign keys: user_id -> auth.users.id; platform_role_key -> platform_role_definitions.role_key.
- Uniqueness: one active assignment per (user_id, platform_role_key).
- Immutability: user_id immutable; status changes are audited.
- RLS approach: platform-scoped; never readable through customer policies.
- Indexes: (user_id); (platform_role_key, status).
- Lifecycle states: active, revoked.
- Audit requirements: assignment and revocation recorded in audit_events.
- Expected future relationships: platform capability checks; never an implicit tenant grant.

### scoped_platform_customer_access

- Purpose: the explicit, scoped, time-bound grant of a platform user to a specific customer organisation. This is the only path by which a platform user reaches customer data.
- Ownership zone: internal platform operational data carrying exact resource scope.
- Key columns: id, user_id, organisation_id, scope, reason, granted_by, granted_at, expires_at, revoked_at, status.
- Foreign keys: user_id -> auth.users.id; organisation_id -> organisations.id; granted_by -> auth.users.id.
- Uniqueness: managed per active grant; overlapping active grants avoided.
- Immutability: user_id and organisation_id immutable; expiry and revocation are audited.
- RLS approach: read within its own scope; grants access to the named organisation only, never to others; defers to security.md.
- Indexes: (user_id); (organisation_id, status); (expires_at).
- Lifecycle states: active, expired, revoked.
- Audit requirements: grant, expiry and revocation recorded in audit_events.
- Expected future relationships: narrower per-bid or per-document scoping.

### audit_events

- Purpose: minimal append-only history for important identity, membership and access changes.
- Ownership zone: internal platform operational data with organisation ownership where a customer is involved.
- Key columns: id, organisation_id where relevant, legal_entity_id where relevant, trading_identity_id where relevant, actor, action, subject_type, subject_id, prior_state where safe, resulting_state where safe, source, correlation_id, created_at.
- Foreign keys: organisation_id -> organisations.id where set; actor -> auth.users.id where set.
- Uniqueness: id primary key; append-only.
- Immutability: rows are never updated or deleted.
- RLS approach: customer-visible audit is organisation-scoped where exposed; platform audit stays internal; defers to security.md.
- Indexes: (organisation_id, created_at); (subject_type, subject_id); (correlation_id).
- Lifecycle states: none; append-only.
- Audit requirements: this table is the audit sink.
- Expected future relationships: richer per-entity audit and delivery-quality records.

## Mandatory tests for the first schema

These tests are required with the first schema implementation. They are documented here as acceptance criteria; they are not built by this document. The mandatory automated guards and acceptance checklist they extend are defined in RLS enforcement tests in [security.md](security.md) and Mandatory automated guards in [testing-and-release.md](testing-and-release.md).

- RLS enabled on every tenant-owned table.
- No USING true.
- No WITH CHECK true.
- Explicit TO clause on every policy.
- Anonymous access fails.
- Same-organisation access succeeds.
- Cross-organisation access fails.
- Revoked membership fails.
- Suspended membership fails.
- Role-capability tests for the four customer roles.
- Immutable organisation ownership.
- Immutable legal-entity ownership for trading identities.
- One legal entity can create and access two trading identities.
- One organisation cannot read another organisation's trading identities.
- A platform role alone does not grant tenant access.
- Scoped platform access is limited and expires where implemented.
- Duplicate legal-entity registration constraints hold.
- Trading-name uniqueness holds within the correct scope.
- Website-to-identity ownership validation holds.
- No trading identity may reference a legal entity from another organisation.
- Legal-entity deletion or archive cannot orphan active trading identities.
- Primary legal entity and primary trading identity rules are enforced.
- An organisation-level address and contact point are permitted (neither identity reference set).
- A registered-office address requires legal_entity_id.
- An address or contact point cannot reference both a legal entity and a trading identity.
- A website may represent the legal entity without a trading-identity link.
- One website may link to both trading identities under the same legal entity.
- A website cannot link to an identity in another organisation.
- A platform role assignment alone grants no customer access.
- Only one active primary legal entity exists per organisation.
- Only one active primary trading identity exists per legal entity.
- A primary archived or historic trading identity is rejected.
- Identity relationship evidence cannot link records from different organisations.

## Required initial test fixture

The schema test fixture must include:

Organisation A:

- Legal Entity A1.
- Trading Identity A1, primary.
- Trading Identity A2, secondary.
- User A owner.
- User A contributor.

Organisation B:

- Legal Entity B1.
- Trading Identity B1.
- User B owner.

The tests must prove:

- User A can access both A1 trading identities.
- User A cannot access B1.
- User B cannot access either A trading identity.
- Revoked User A cannot access either A identity.
- Both A identities resolve to Legal Entity A1.
- Evidence and services can later be scoped independently without changing the identity model.
- A platform role without scoped customer access cannot read A or B.
- Scoped platform access to A does not permit access to B.
