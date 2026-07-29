# AI

**Purpose:** Vercel AI Gateway and SDK usage, central model routing, task-specific model selection, schemas and Zod validation, provenance, customer approval, cost controls, provider fallback and failure behaviour.

**Read this when:** any AI, research, extraction, drafting, classification, matching, or model-integration work.

**Authority:** [CLAUDE.md](../../CLAUDE.md) is the highest-priority instruction file and always takes precedence. This document is a mandatory extension of CLAUDE.md, not optional guidance. No rule here is weaker for living in this file.

**Related:** [architecture-and-platform.md](architecture-and-platform.md), [data-and-files.md](data-and-files.md), [testing-and-release.md](testing-and-release.md), [reliability-and-state.md](reliability-and-state.md).

---

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

## AI evaluation tests

AI evaluation datasets and the fixed evaluation examples every AI workflow must cover (expected extraction, missing information, conflicting sources, entity mismatch, unsupported claims, malformed model output, provider failure, fallback behaviour) are defined in [testing-and-release.md](testing-and-release.md). Do not change a production prompt, model or schema without running the relevant evaluation set.
