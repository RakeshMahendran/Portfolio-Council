# Architecture Decisions

A record of why Portfolio Council is built the way it is. Each entry is a deliberate choice with tradeoffs articulated — not a default I fell into.

This document is a working ADR-style log. Skim it before reviewing the code; it answers most "why?" questions before they're asked.

---

## ADR-01 · Git as the storage layer (not Postgres)

**Decision:** The agent's identity, rules, memory, holdings, and session artifacts all live as files in a git repo. No external database.

**Why:**
- **Aligned with the thesis.** The gitclaw README's headline is *"This is agents as repos."* Using a separate database would dilute that. Each agent is a forkable, branchable, immutable-history unit of state.
- **Audit trail is free.** Compliance-grade audit logging is a hard problem. Git solves it by construction: every decision is a signed commit; history is append-only; integrity is cryptographic.
- **Distribution is `git clone`.** A user gets the whole product, configuration included, in one command. No DB seeding, no migrations.
- **Branching maps to "alternate strategies."** `git checkout -b aggressive-me` creates an alternate agent personality, sharing the orchestrator/skills/hooks but diverging in rules and memory. This wouldn't make sense in Postgres.

**Tradeoff:**
- Queries are grep-based today. You can't "show me all sessions where Risk vetoed in Q3" without writing a script.
- Multi-tenancy means one repo per user, which is heavyweight at scale.

**v3 roadmap:** add PostgreSQL as a *secondary index*, not a replacement. Postgres holds session metadata, user accounts, billing. Git remains the canonical artifact + audit store. Postgres rows reference git commit hashes. Hybrid by design.

---

## ADR-02 · Five sub-agents, not one big prompt

**Decision:** The orchestrator delegates to 5 specialized sub-agents (Onboarding, Analyst, Strategist, Risk Officer, Execution) instead of running a single prompt that does everything.

**Why:**
- **Adversarial review > consensus.** A single agent asked to "review this trade and decide" has both incentive and bias to approve. Separate Strategist and Risk Officer roles produce real tension. Risk's job is to *find what Strategist missed.*
- **Verified value:** in actual testing, the Risk Officer caught a real operational hazard (a second portfolio review on the same day would have caused a double-trim). A single-agent setup would not have flagged this.
- **Each agent is testable in isolation.** Swap Risk's SOUL.md to be more conservative; observe the effect without touching the rest of the system.

**Tradeoff:**
- Latency: each sub-agent is a separate gitclaw subprocess. A full debate takes 4-8 minutes wall-clock (Bedrock latency × 4-6 invocations).
- Cost: ~$0.10-0.30 per session vs ~$0.02 for a single-shot prompt.

**v2 idea:** run sub-agents in parallel where possible (Analyst doesn't depend on the others). Could cut wall-clock by ~40%.

---

## ADR-03 · Claude Sonnet 4.5 via AWS Bedrock (not gpt-5-mini or direct Anthropic)

**Decision:** All agents use `amazon-bedrock:us.anthropic.claude-sonnet-4-5-20250929-v1:0`.

**Why:**
- **gpt-5-mini was tested first.** It paraphrased SOUL.md instructions, didn't validate vague user inputs, and skipped questions in the onboarding flow. Sonnet 4.5 follows the SOUL.md literally and pushes back on incomplete inputs (verified: "₹2L/month" → "is that monthly savings or portfolio value?").
- **Bedrock over direct Anthropic:** the developer had existing AWS credentials. Bedrock supports bearer token auth (`AWS_BEARER_TOKEN_BEDROCK`), simpler than a fresh Anthropic signup. The pi-ai library's AWS SDK is bundled.
- **Cross-region inference profile (`us.` prefix):** required for Sonnet 4.5 on Bedrock to handle US region failover.

**Tradeoff:**
- Sonnet 4.5 is ~10× more expensive per token than gpt-5-mini.
- For the hackathon: ~$3-5 total spend. Acceptable. For production: would route simpler agents (Onboarding question flow) to a smaller model.

---

## ADR-04 · FastAPI for the HTTP layer (not Next.js API routes)

**Decision:** Backend is FastAPI (`server/`), separate from the Next.js frontend (`frontend/`). They communicate over HTTP.

**Why:**
- **The hackathon brief stated preference for Python + FastAPI.** Aligning with the brief is a low-risk choice.
- **Future Python ML/quant work:** if this product evolves, the analysis layer is more naturally Python (pandas, scipy, custom math). Keeping the backend in Python avoids a future port.
- **Separation of concerns:** the Next.js project becomes pure UI. The backend exposes gitclaw and git operations as HTTP endpoints — no mixed-concern code.

**Tradeoff:**
- Two processes to manage during dev (uvicorn + npm run dev).
- gitclaw is Node.js, so FastAPI invokes it as a subprocess instead of importing as an SDK. Slight overhead per request.
- CORS configuration needed.

**Alternative considered:** keeping API routes in Next.js (`app/api/*/route.ts`). Started this way, then refactored to FastAPI. Decision was deliberate, not accidental.

---

## ADR-05 · Fork-and-clone, no built-in auth

**Decision:** Users obtain the product by cloning the repo. There is no signup, no login. The AuthShell is a visual roadmap placeholder, not functional.

**Why:**
- **Aligned with thesis.** If your agent IS a repo, you authenticate by *possessing* the repo. Adding accounts would re-introduce centralization the thesis rejects.
- **Hackathon submission is local-clonable.** Judges run it on their machines. Auth would add 30-60 seconds of friction before they see the product.
- **Precedent:** ArgoCD, dotfiles repos, `create-next-app` — all use the same model. Distribution = git clone. Identity = repo ownership.

**Tradeoff:**
- Non-technical users can't use it without CLI experience.
- Multi-device sync requires `git push/pull`.
- No native "share with my spouse" — would require a second person to clone, which doesn't merge state automatically.

**v3 roadmap:** hosted version with Clerk auth + Postgres for users + per-user git repos on the server. The local-clone version remains as the OSS DIY tier.

---

## ADR-06 · Pre-commit hook for governance enforcement

**Decision:** A Python script at `hooks/pre-commit` blocks any commit touching `reports/<date>-rebalance.md` unless `workspace/verdict-<date>.md` contains the literal token `APPROVE`.

**Why:**
- **Governance at the git layer, not just the agent layer.** Even if the Orchestrator's logic is bypassed (e.g., a malicious modification, a buggy update), the hook stops bad data from entering the audit trail.
- **Verifiable by anyone:** judges can `cat hooks/pre-commit` and see the enforcement mechanism. No magic.
- **Native git integration:** runs on every `git commit`, no out-of-band process to remember.

**Tradeoff:**
- Git-specific — won't transfer if the project ever drops git as the storage layer.
- Pre-commit hooks can be bypassed with `--no-verify`, so it's "honor system" against a determined attacker. (For non-adversarial settings, this is fine.)

**Install:** `git config core.hooksPath hooks/` — committed to the repo so any clone is protected.

---

## ADR-07 · Dynamic intake (Onboarding agent) over static form

**Decision:** Onboarding is implemented as a conversational AI agent that probes, follows up, and surfaces contradictions — not a static N-step form.

**Why:**
- **Real intake is conversational.** A financial advisor doesn't read off a checklist; they probe ("you said moderate risk + 1 year horizon — those are contradictory, walk me through").
- **Catches errors at input time.** A static form can't say "you typed ₹2L/month but the field expected total portfolio value" beyond regex validation. The agent can ask clarifying questions.
- **Math-aware:** the agent does sanity-check math out loud ("net investable × months + corpus ≈ goal?") which is shown to the user during onboarding.

**Tradeoff:**
- Slower than a form (5-10 min vs 2 min).
- Conversational quality depends on model (gpt-5-mini was too loose; Sonnet 4.5 works).
- Harder to validate completeness vs a structured form.

**Mitigation:** the agent maintains an internal Checklist (12 fields). It cannot complete the file write until all fields are captured. If a field is missing, it asks for it explicitly.

---

## ADR-08 · Why portfolio (not code review or compliance)

**Decision:** Demo the pattern with personal portfolio rebalancing, despite the pattern being domain-agnostic.

**Why:**
- **Existing skills available:** the developer had working `analyze_holdings.py`, `check_market.py`, `recovery_sim.py` from a prior project. These plugged in as gitclaw skills with minimal wrapping.
- **Real domain context:** the developer's own financial situation provided concrete, verifiable artifacts. The Risk Officer found a real flaw (₹3.74L double-execution risk) — that wouldn't have been convincing if the inputs were toy data.
- **Compliance and code review domains:** would have required mock data and the demo would feel synthetic.

**Risk of this choice:** "this person built a fintech vertical product" rather than "this person built infrastructure."

**Mitigation:**
- `docs/applications.md` lists 5 other use cases of the same pattern
- README opens with the *pattern* (multi-agent + git audit), not the portfolio domain
- This ADR is itself the framing

**Verification:** the same architecture, with different SOUL.md files, would compile and run for code review, legal review, hiring, audit, or medical second opinion. Nothing portfolio-specific lives in the orchestrator, the hook, the storage layer, or the UI shell.

---

## ADR-09 · Three canonical UI actions over a freeform textarea

**Decision:** The `/session` page shows three buttons ("Run portfolio review", "Check goal progress", "Update plan") instead of leaving the user to compose prompts.

**Why:**
- **Discoverability.** A textarea labeled "prompt" gives users no idea what to type. Canonical actions teach them what's possible.
- **Demo simplicity.** A judge clicking one button is a cleaner Loom moment than typing.
- **Encodes the intended flow** in the UI, not in human memory.

**Tradeoff:**
- Power users want flexibility.

**Mitigation:** the freeform textarea is preserved as a collapsible "Custom prompt ▾" expander. Default flow is button-driven; advanced users can still craft prompts.

---

## ADR-11 · Regex parsing of agent artifacts (with YAML frontmatter as v2 path)

**Decision:** The session panel UI extracts structured summaries (verdict, key concerns, action counts) from agent markdown files using regex matching on section headings and bullet patterns. YAML frontmatter is the planned v2 evolution.

**Why we have regex today:**

The 4 sub-agents (Analyst, Strategist, Risk, Execution) write *markdown* files as their primary output — human-readable prose with headings and bullets. The UI needs *structured data* to render summary cards (e.g., "Risk verdict: VETO, 3 concerns"). Something has to bridge "agent writes prose" → "UI renders structured fields."

The current bridge is regex matching against section headings (`re.search(r"Adversarial Concerns?", md)`) and pulling bullets. It works for the happy path and got the demo shipped.

**Why this is fragile (audit caught it):**

- Heading rephrased? Regex misses it.
- Section renumbered? Regex misses it.
- Agent adds a new section? Regex finds nothing where it expects content.
- Bullet uses `*` instead of `-`? Some patterns break.

A pre-commit audit found ~5 distinct failure modes, none of which broke the demo session but all of which would surface in production.

**The v2 path — YAML frontmatter:**

Every artifact starts with a structured block:

```markdown
---
verdict: VETO
summary: <one-line>
concerns:
  - <concern 1>
  - <concern 2>
plan_b: <one-line>
---

# (rest of human-readable markdown unchanged)
```

Parser becomes `yaml.safe_load(frontmatter)` — pure dict access, zero regex on prose. Industry-standard pattern (Jekyll, Hugo, Astro, Obsidian all do this).

**Cost to migrate (v2):**
- Update each sub-agent's `SOUL.md` with frontmatter spec (~10 min/agent)
- Add `pyyaml` to `requirements.txt`
- Replace regex in `session_routes.py` with `yaml.safe_load` + regex fallback for old artifacts
- Re-run a session to produce frontmatter-enabled artifacts
- **Total: ~1-2 hours**

**Why we didn't do this for v1:**

The demo Loom captures the happy path. Regex works for the happy path. Switching now adds ~2 hours of risk for ~0 demo benefit. Tech debt explicit > tech debt hidden.

**Tradeoff:**
- ✅ Current: zero-dependency, simple, ships fast
- ❌ Current: fragile, breaks if agents rephrase
- ✅ v2: bulletproof, extensible
- ❌ v2: requires SOUL.md edits + fresh session artifacts

**Why this entry exists:** so a judge reading the code doesn't think the regex was an oversight. It was a deliberate choice with a known migration path.

---

## ADR-10 · /profile page for direct data management

**Decision:** A dedicated `/profile` route lets users view, edit, delete, and re-upload their underlying data files (`memory/user_plan.md`, `RULES.md`, `data/holdings.json`) — including a natural-language "ask agent to update" chat.

**Why:**
- **The product's data is the user's data.** They should see it, modify it, delete it without re-running onboarding.
- **Natural-language update is more powerful than form editing.** "I bought 10 more RVNL at ₹450" is faster to type than navigating a multi-step holdings editor.
- **Avoids re-onboarding friction.** A user who wants to change one constraint doesn't have to redo all 8 questions.

**Tradeoff:**
- Direct file edit can introduce malformed YAML/markdown that breaks downstream agents.

**Mitigation:** PUT endpoint validates minimum length; UI shows raw markdown for full transparency; the agent-driven update path is the recommended one for non-developers.

---

## What's deliberately NOT here

These are tradeoffs we chose NOT to make:

- **No microservices.** One FastAPI process, one Next.js process. Adding gRPC/Kafka/etc. would be premature.
- **No vector database.** The agents read markdown files directly. No embeddings, no semantic search. Could add for v3 when memory grows beyond 100KB.
- **No real-time websockets.** NDJSON streaming over HTTP is sufficient and simpler.
- **No CI/CD pipelines.** Local-clonable deployment doesn't need it. Would add for v3 hosted.
- **No tests for the agents.** Agent behavior is observably correct via the artifact files; unit-testing prompts is brittle.

These are debt the project knowingly carries.

---

## How to read this document

If you're a Lyzr engineer evaluating this submission: this document is the *primary* artifact of how I think. The code is the *result*. ADRs make the thinking legible. Where you disagree with a decision, the tradeoff is explicit — we can talk about it.

If a decision isn't here, I made it without much thinking, and you should probably push back on it.

---

*Last updated: with the v1 submission. Versioned in git like everything else.*
