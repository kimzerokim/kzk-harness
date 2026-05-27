---
name: kzk-spec-and-review
version: 2.14.0
description: "Spec/plan/major design authoring with mandatory cross-vendor codex review. Iterative loop until PASS: Draft → codex consult → synthesize 🔴 BLOCKER / 🟡 NIT / ⚪ push-back → Gate (PASS = BLOCKER 0 AND no structural change, CONTINUE = next cycle, HALT = cycle ≥ 5 + BLOCKER 잔존). Brainstorming default ON (Step -1 after Step 0 survey). Skip only when EITHER explicit `brainstorming 스킵` command standalone OR ALL-of (trivial + pre-specified + no-new-capability). Step 0 survey precondition + freshness check. Triggers: 'spec 잡자', 'plan draft', 'plan 만들어', 'codex review', 'brainstorm', 'brainstorm default ON'. References harness-share.md §22 + §22.5 + §30."
---

> Authoritative source: `harness-share.md` §22 + §22.5 (Step 0 survey precondition references §26). On conflict, that wins.

# kzk-spec-and-review

## Step -1 — Brainstorming (default ON)

> **Order**: Step 0 (survey) runs first, then Step -1 (brainstorming) runs, then the 3-pass Pattern loop. The name "Step -1" is preserved for backward-compat with cross-refs; execution order is Step 0 → Step -1 → Pattern.

**Default**: ON. Upon entering spec-and-review, after Step 0 survey completes, `Skill("superpowers:brainstorming")` must be called once. Even if the keyword-detector does not inject a `(brainstorm mode)` system-reminder marker, Step -1 still executes — the marker is informational; its absence does not mean skip.

**Skip conditions** — brainstorming skips when EITHER (A) or (B) holds:

**(A) Explicit-skip command** — User typed `brainstorming 스킵` / `skip brainstorming` / `skip Step -1` in this session. Standalone — no other condition needed.

**(B) Trivial-change bundle** — ALL of the following hold simultaneously:
1. Trivial change scope: typo / single-line wording / sub-5-LoC patch.
2. User pre-specified ALL change details (every section / line / decision named in user prompt this session — see Evidence below).
3. No new capability addition (existing-pattern fix only — no new feature / new entry / new module / new halt code / new policy clause).

If neither (A) nor (B) → brainstorming runs (default ON).

**Skip evidence (mandatory when invoking (B))**: When skipping under (B), main MUST record the following in the commit message footer OR the cycle entry in `docs/harness/user-queue.md`:
- `Brainstorm skip evidence: user prompt quote = "<≤2-sentence quote from user>"; files = <list>; sections = <list>`
- Absence of evidence → skip is invalid, brainstorming MUST run.

**Mandatory invoke triggers** (any one of these forces Step -1 even when (B) above would otherwise allow skip):

- New feature / new entry / new module addition (new capability, not just extension of existing pattern)
- User decision required (multiple design paths revealed during Step 0 survey, ambiguous spec, missing user input)
- Explicit brainstorm keyword ('brainstorm', '아이디어', '어떻게 해야 할까', '뭐가 좋을까')

**Behavior**:
1. `Skill("superpowers:brainstorming")` called
2. Brainstorming completes → collect design doc path (`docs/plans/YYYY-MM-DD-<topic>-design.md`). Brainstorming skill output is saved directly to `docs/plans/` (SoT: `harness-share.md §5`). If output lands elsewhere, main immediately runs `git mv` to `docs/plans/` and passes that path to Step 1. (SoT: `harness-share.md` §5 path consolidation 2026-05-12)
3. Include the design doc path in Step 1 Draft's CONTEXT as `Required reading: <path>`
4. Include brainstorming decisions in Step 2 codex consult's `LOCKED PRIOR DECISIONS`

**CRG spec reference validation**: After brainstorming completes, run `crg-utils.extractDocRefs(designDocPath)` + `crg-utils.validateLineRefs(designDocPath)` on the generated design doc. Warn on stale references.

## Step 0 — Codebase survey precondition (mandatory before drafting)

> Freshness check: before entering Step 0, `kzk-freshness-guard` is auto-called (recursion guard applies). Cross-ref: `kzk-freshness-guard` §Auto-call points.

A spec / plan / design draft built without codebase context has the same root cause that `kzk-codebase-survey` exists to fix. Before the 3-pass loop runs, locate or generate a survey report for the topic.

**Lookup order:**
1. **In-session reference** — the current conversation already cites a survey report path (e.g. user pasted it, or this skill was triggered after `kzk-codebase-survey` ran in the same session). Use that path.
2. **Recent on-disk report** — glob `docs/harness/surveys/*-<topic>-survey.md`. Accept the latest if its mtime is ≤ 7 days old AND no commits have changed the surveyed file scope since the report was written (`git log --since=<report-mtime> -- <files-in-scope>` returns empty). Otherwise treat as stale.
3. **Web-loop survey** — if running under `kzk-web-loop`, check `.web-loop/surveys/cycle-<N>-survey.md` for the current cycle.

**If none found:** trigger `kzk-codebase-survey` first, capture the saved report path, then proceed to Step 1 (Draft) with the report path included in the draft prompt as `Required reading: <survey-report-path>`. Survey running cascades through `Skill("kzk-codebase-survey")` — do not draft and survey in parallel.

**Exempt from precondition** (matches the §Exempt list): typo / wording, harness-flow-progress append, retro, session-local notes. Survey adds no value to artifacts that don't touch code logic.

**Survey skip OFF** — only on explicit user "survey 빼고" / "survey skip". No silent skip. Log the skip reason in the verdict file header.

## Pattern (Iterative review loop) — runs after Step 0

Loop on the same spec/plan/design until **PASS** (defined in §Gate decision). One cycle = Draft (or Revise) → Codex consult → Synthesize → Gate decision. "1 spec = 1 codex round" applies **only when cycle 1 itself satisfies the PASS gate** — if BLOCKERs remain or a structural change occurs, additional cycles are mandatory.

**Cycle N (N ≥ 1):**

1. **Draft (cycle 1) or Revise (cycle ≥ 2)** — main orchestrates; md writing dispatches to `oh-my-claudecode:executor` (sonnet) per §Spec/plan revision dispatch. Main drafts only when ≤ 5 LoC total change (typo, single-line append).
   - Cycle 1 prompt must include survey report path from Step 0 as `Required reading: <path>` (draft must cite findings, not just list files).
   - Cycle ≥ 2 revise prompt MUST include:
     - Cycle (N−1) verdict file path (so executor can locate the BLOCKER list)
     - Categorized edit list applied since cycle (N−1): each item = section anchor + change + 🔴/🟡 tag
     - Original survey report path (unchanged from cycle 1)
   - Mandatory inject: harness-share.md §31 Code Quality Discipline boilerplate (DRY/YAGNI/KISS + Deletion test + Depth + obsolete test). Violation → spec revision requested.

2. **Codex consult** — run `codex exec` CLI directly (see kzk-codex-handoff §Codex CLI 호출 패턴). CLI not available (`command not found`) or stuck per kzk-codex-handoff §Codex CLI 호출 패턴 (60s no first token → retry; 5 min total → kill) → fallback: `Agent(subagent_type="oh-my-claudecode:critic", prompt=<same review prompt>)` (model omitted → inherits main opus version). **Both paths (CLI and fallback critic) MUST save the verdict to a named file using the Verdict file convention below — chat history alone is insufficient and does not count as the artifact.**
   - Cycle ≥ 2 codex prompt MUST include cycle (N−1) verdict file content (or path with explicit re-read instruction) in `LOCKED PRIOR DECISIONS` block — prevents codex re-flagging resolved BLOCKERs.

3. **Synthesize** — main categorizes each codex point:
   - 🔴 **BLOCKER** — incorrect API contract, broken validator, missing required field, drift from upstream change, security/data-loss risk
   - 🟡 **NIT / detail** — wording, ordering, optional clarifications — incorporate but not a cycle-continuation trigger
   - ⚪ **PUSH-BACK** — cited rebuttal (scope creep, false positive, already-decided per LOCKED list)

   Then dispatch revision edits per §Spec/plan revision dispatch below. Main never directly Edit/Write the md file for 2+ edits.

4. **Gate decision** (loop control):
   - **PASS** (loop exit, proceed to implementation / plan freeze):
     - 🔴 BLOCKER count = 0, AND
     - Changes applied this cycle are NIT/wording-only or push-back cleanup (no structural change)
   - **CONTINUE** (enter cycle N+1):
     - 🔴 BLOCKER ≥ 1, OR
     - A structural change was applied to the spec (DTO field added/removed, API surface renamed, validator factory added, contract field changed) — the changed spec has not yet been codex-verified
   - **HALT** (mandatory even in autonomous mode):
     - cycle N ≥ 5 AND BLOCKERs remain
     - Add entry to `docs/harness/user-queue.md` + wait for user decision. Autonomous unlimited retry is forbidden.

Drafts of ≤ 5 LoC bypass Step 1 executor dispatch (main direct Edit OK) but **still must pass through Steps 2–4** — even a single-line append cannot skip codex consult.

## Spec/plan revision dispatch (post-critic edits)

Main = orchestrator (categorize, decide). Subagent = executor (apply edits to md file).

| Revision scope | Dispatch |
|---|---|
| 1 edit, ≤ 5 LoC | Main direct OK |
| 2+ edits or 5+ LoC | `Agent(subagent_type="oh-my-claudecode:executor", model="sonnet")` |

**Executor dispatch prompt must include:**
- Full path to the md file to edit
- Critic verdict file path (for reference)
- Categorized edit list: each item = section anchor + exact change description + 🔴/🟡 tag
- "Read the target file first. Apply edits precisely at the cited sections. Do not rewrite uninvolved sections."

**Why sonnet (not haiku writer):** post-critic spec revision requires understanding technical context from the critic feedback — lock semantics, cascade logic, API contracts. Haiku lacks the depth for precise technical edits. Writer (haiku) is appropriate for standalone documentation, not spec revision.

**Anti-pattern (external-project cycle 7 incident):** main directly applied 7+ Edit operations to a spec file after critic review. Correct flow: main categorizes → builds edit list → dispatches single executor with all edits bundled.

## When mandatory

- New or major edit of `docs/prd/*.md` or `docs/plans/*.md`
- Architecture: data model, API surface, auth, realtime, migration, backup, infra
- Tech stack / ORM / framework / library swap
- Large refactor plan
- Security / permission model change
- DB schema change (before migration write)

## Exempt

- Typo / small wording
- Recording an already-decided fact (e.g., `harness-flow-progress.md` timeline append)
- Pure operational doc (retro). Runbooks for disaster recovery still mandatory.
- Session-local progress notes

## Verdict file convention

Path depends on the topic type. Cycle N (N = cycle counter from §Pattern):
- **Plan review**:
  - N=1: `docs/plans/<plan-name>-critic-review.md`
  - N=2: `docs/plans/<plan-name>-critic-review-2.md`
  - N≥3: `docs/plans/<plan-name>-critic-review-N.md`
- **Non-plan review** (spec / architecture / design / DB schema / tech-stack):
  - N=1: `docs/research/codex-reviews/<topic>-critic-review.md`
  - N=2: `docs/research/codex-reviews/<topic>-critic-review-2.md`
  - N≥3: `docs/research/codex-reviews/<topic>-critic-review-N.md`

- Cycle counter source-of-truth = file artifact count (glob `*-critic-review*.md` for the topic). Reproducible after session crash. Before entering cycle N, main computes the next cycle number as glob result + 1.
- Cycle N (N≥2) verdict file body header must state `Cycle: N` + `Previous: <path to cycle N-1 verdict>` + `BLOCKERs resolved since N-1: <count>`.
- Cycle N (N≥2) codex/critic prompt MUST reference cycle (N−1) verdict file content as `LOCKED PRIOR DECISIONS` (§Pattern Cycle N step 2).
- CLI fail + fallback critic in same cycle → fallback verdict OVERWRITES CLI error stub in the same cycle N file.
- CLI error stub preserved alone only when fallback is also disabled (user turned off critic).

## Codex prompt skeleton

```
IMPORTANT: Do NOT navigate into ~/.claude/skills/, .claude/skills/ (relative to repo root),
or any directory whose path contains a skills/ segment with skill agent prompts —
limit your file reads to the repo under review. Content already inlined
in this prompt (e.g. survey reports that cite skill paths) is safe to reference.
Exception: when the design under review IS a skill (e.g. kzk-harness self-improvement loop),
the repo's own skills/ directory is the subject — read those files as needed.

Brutally honest <topic> reviewer. No compliments. Numbered list. Terse. Cite sections.

CONTEXT:
<project + stack + user count + constraints>

LOCKED PRIOR DECISIONS (don't re-flag):
<already decided — do not re-question>

DESIGN UNDER REVIEW:
<full or changed portion — number each section>

YOUR JOB. Numbered list:
1. <category 1>
2. <category 2>
...

Cite sections. Terse. No compliments. If category fine, say "none".
```

## Codex consult — invocation mechanism

> See kzk-codex-handoff §Codex CLI 호출 패턴.

## Cost / cadence

- Per cycle: ~2-3 min wall, ~25-30k tokens
- **Default cycle budget: 5.** Soft cap — up to cycle 5 proceeds autonomously without user decision. Cycle ≥ 5 + BLOCKERs remain → §Pattern Gate decision HALT path (user-queue).
- "1 spec = 1 cycle" / "1 major plan = 1 cycle" applies **only when cycle 1 satisfies the PASS gate (BLOCKER 0 + no structural change)**. If BLOCKERs remain or cycle 1 synthesize changed the spec structure, cycle 2 is mandatory.
- Cycle 2+ is not expensive — it fills a verification gap. Entering implementation with an unverified spec produces more rework than additional cycles (average cycle ~25k tokens vs average 1 BLOCKER fix at implementation stage ~80–200k tokens).
- **User explicit OFF only** ("이번엔 codex 빼고") skips the loop entirely. No silent skip. Partial skip ("cycle 2 만 빼고") follows the same rule — explicit user OFF only.

## Prompt size guideline

> See kzk-codex-handoff §Prompt size guideline.

## Artifact retention

Persist all codex/critic output to the verdict file (§Verdict file convention) — chat-history-only verdict does not count.

## Anti-patterns

- "Self-review is enough" — different classes of bug; both are needed.
- "Codex is worse than me" — the value is the angle change, not the absolute IQ. Push-back is a valid bucket.
- Apply codex output verbatim — must pass through synthesize, with explicit category.
- "Skip just this once" — only on explicit user OFF. Inconsistency erodes the rule.
- Verdict only in chat history — must land in a file for cross-session reproducibility.
- **"Got cycle 1 verdict, applied the fix, went straight to implementation"** — if cycle 1 had 🔴 BLOCKERs or the fix changed the spec structure (DTO/API/validator/contract), cycle 2 is mandatory. The changed spec has not been codex-verified. Do not enter implementation without clearing the PASS gate (§Pattern §Gate decision).
- **"1 BLOCKER is fine to resolve during implementation"** — 🔴 BLOCKER 0 is the PASS gate. 1 remaining means another cycle, no exceptions. Even in ralph / autonomous mode — "no polite stops" does not mean "ignore BLOCKERs".
- **"Keep cycling indefinitely"** — cycle ≥ 5 + BLOCKERs remaining → HALT to `docs/harness/user-queue.md`. Autonomous unlimited retry is forbidden (rate limit / context exhaustion risk).

## Interaction with other kzk-*

- **kzk-large-task-delegation §"Pre-implementation plan-critic loop (opus + codex)"** is a *narrower* version of this skill, scoped to plans that feed the sonnet executor. This skill is broader — covers spec / architecture / design too. Cross-reference, do not duplicate.
- **kzk-background-monitoring** governs the codex consult call itself (long-running CLI).
- **harness-share.md §22.5**: End-to-End Ralph Pipeline (spec → plan → critic → implementation in one ralph loop). This skill covers the critic step; §22.5 covers the full pipeline integration including PRD drafting and user-intervention gates.
- **kzk-freshness-guard**: Freshness check before Step 0 + CRG spec reference validation after Step -1
