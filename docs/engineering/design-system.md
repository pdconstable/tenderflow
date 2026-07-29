# Design system, UX and accessibility

**Purpose:** Tender OS visual character, design tokens and canonical components, responsive/mobile behaviour, visual regression, UX consistency, canonical product state and WCAG 2.2 AA accessibility.

**Read this when:** any design, UI, component, copy, status/label, or customer-facing screen work.

**Authority:** [CLAUDE.md](../../CLAUDE.md) is the highest-priority instruction file and always takes precedence. This document is a mandatory extension of CLAUDE.md, not optional guidance. No rule here is weaker for living in this file.

**Related:** [data-access-and-scale.md](data-access-and-scale.md), [reliability-and-state.md](reliability-and-state.md), [testing-and-release.md](testing-and-release.md).

---

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

Extends Canonical state below. Every screen must have:

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
