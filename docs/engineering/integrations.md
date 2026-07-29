# Integrations

**Purpose:** Third-party integrations — Resend/React Email, Stripe, Companies House and other external APIs — including webhook verification, idempotency, billing-vs-fulfilment authority, environment restrictions, setup checklists and required environment variables.

**Read this when:** any email, billing/payments, Companies House, procurement-data, or external-API integration work.

**Authority:** [CLAUDE.md](../../CLAUDE.md) is the highest-priority instruction file and always takes precedence. This document is a mandatory extension of CLAUDE.md, not optional guidance. No rule here is weaker for living in this file.

**Related:** [security.md](security.md), [reliability-and-state.md](reliability-and-state.md), [architecture-and-platform.md](architecture-and-platform.md), [testing-and-release.md](testing-and-release.md).

---

Cross-cutting rules that these integrations depend on:

- Idempotency for money and communications, Atomicity, Environment-safe communications and Communication cutover safety are defined in [reliability-and-state.md](reliability-and-state.md).
- Webhook signature verification and secret handling relate to [security.md](security.md).
- The manual-setup stop rule, environment separation and required-secret disclosure live in [architecture-and-platform.md](architecture-and-platform.md); fail-fast environment validation lives in [reliability-and-state.md](reliability-and-state.md).

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

## Companies House and other external API adapters

- Companies House and procurement-data providers are external API adapters accessed with a key held in environment variables (Companies House API key, procurement API credentials); never read live provider keys from customer-accessible database tables.
- Enrichment and award searches run as durable background jobs — see Background work in [reliability-and-state.md](reliability-and-state.md).
- Do not automatically use Companies House officers as marketing contacts (see prospect-data separation in [data-and-files.md](data-and-files.md)).
- External calls require explicit timeouts, validation and controlled retries (see Vercel runtime rules in [architecture-and-platform.md](architecture-and-platform.md)).
- Follow the manual-setup stop rule in [architecture-and-platform.md](architecture-and-platform.md) whenever a new key, credential or webhook is required, and verify the integration with a real safe request after deployment (production verification) rather than treating variable presence as proof.
