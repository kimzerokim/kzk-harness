---
name: kzk-spec-and-review
version: 2.8.0
description: "Spec, plan, and major design authoring with mandatory cross-vendor codex review — make sure to use this skill whenever the user says 'spec 잡자', 'plan draft', 'plan 만들어', 'codex review', 'brainstorm', or 'architecture review'. Step -1 (brainstorming via superpowers:brainstorming) runs on exploratory keywords; Step 0 (kzk-codebase-survey precondition + kzk-freshness-guard check) is mandatory before drafting; Steps 1-3 (draft via executor sonnet → codex CLI consult via kzk-codex-handoff → synthesize + categorize 🔴/🟡/⚪) complete the loop. Verdict file saved to docs/research/codex-reviews/ or docs/plans/. Chat-history-only verdict does not count. References harness-share.md §22 + §22.5."
---

> Authoritative source: `harness-share.md` §22 + §22.5 (Step 0 survey precondition references §26). On conflict, that wins.

# kzk-spec-and-review

## Step -1 — Brainstorming (conditional)

> 탐색적 키워드 감지 시에만 진입. "spec 잡자", "plan 만들어" 등 명확 키워드는 Step 0 직행.

**진입 조건**: keyword-detector 가 `(brainstorm mode)` marker 를 system-reminder 에 inject 한 경우.

**동작**:
1. `Skill("superpowers:brainstorming")` 호출
2. brainstorming 완료 → design doc 경로 수집 (`docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`)
3. design doc 경로를 Step 1 Draft 의 CONTEXT 에 `Required reading: <path>` 로 포함
4. brainstorming 결정사항을 Step 2 codex consult 의 `LOCKED PRIOR DECISIONS` 에 포함

**Skip**: 사용자가 "brainstorming 스킵" / "skip brainstorming" 입력 시 Step 0 으로 즉시 이동.

**CRG spec reference 검증**: brainstorming 완료 후, 생성된 design doc 에 대해 `crg-utils.extractDocRefs(designDocPath)` + `crg-utils.validateLineRefs(designDocPath)` 실행. stale reference 발견 시 WARN.

## Step 0 — Codebase survey precondition (mandatory before drafting)

> Freshness check: Step 0 진입 전 `kzk-freshness-guard` 자동 호출 (recursion guard 적용). Cross-ref: `kzk-freshness-guard` §자동 호출 지점.

A spec / plan / design draft built without codebase context is the same root cause that `kzk-codebase-survey` exists to fix. Before the 3-pass loop runs, locate or generate a survey report for the topic.

**Lookup order:**
1. **In-session reference** — the current conversation already cites a survey report path (e.g. user pasted it, or this skill was triggered after `kzk-codebase-survey` ran in the same session). Use that path.
2. **Recent on-disk report** — glob `docs/harness/surveys/*-<topic>-survey.md`. Accept the latest if its mtime is ≤ 7 days old AND no commits have changed the surveyed file scope since the report was written (`git log --since=<report-mtime> -- <files-in-scope>` returns empty). Otherwise treat as stale.
3. **Web-loop survey** — if running under `kzk-web-loop`, check `.web-loop/surveys/cycle-<N>-survey.md` for the current cycle.

**If none found:** trigger `kzk-codebase-survey` first, capture the saved report path, then proceed to Step 1 (Draft) with the report path included in the draft prompt as `Required reading: <survey-report-path>`. Survey running cascades through `Skill("kzk-codebase-survey")` — do not draft and survey in parallel.

**Exempt from precondition** (matches the §Exempt list): typo / wording, harness-flow-progress append, retro, session-local notes. Survey adds no value to artifacts that don't touch code logic.

**Survey skip OFF** — only on explicit user "survey 빼고" / "survey skip". No silent skip. Log the skip reason in the verdict file header.

## Pattern (3-pass) — runs after Step 0

1. **Draft** — main orchestrates; actual md file writing dispatches to `oh-my-claudecode:executor` (sonnet). Prompt must include survey report path from Step 0 as "Required reading: <path>" (not just file-listed — the draft must actually cite findings from the survey). Main drafts only when ≤ 5 LoC total change (typo, single-line append).
2. **Codex consult** — run `codex exec` CLI directly (see kzk-codex-handoff §Codex CLI 호출 패턴). CLI not available (`command not found`) or stuck per kzk-codex-handoff §Codex CLI 호출 패턴 (60s no first token → retry; 5 min total → kill) → fallback: `Agent(subagent_type="oh-my-claudecode:critic", prompt=<same review prompt>)` (model 생략 → 메인 opus 버전 상속). **Both paths (CLI and fallback critic) MUST save the verdict to a named file using the Verdict file convention below — chat history alone is insufficient and does not count as the artifact.**
3. **Synthesize** — main categorizes each codex point as 🔴 즉시 fix / 🟡 spec 단계 디테일 / ⚪ push-back (cite reasons per bucket). Then dispatch revision edits per §Spec/plan revision dispatch below. Main never directly Edit/Write the md file for 2+ edits.

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

**Anti-pattern (gridless cycle 7 incident):** main directly applied 7+ Edit operations to a spec file after critic review. Correct flow: main categorizes → builds edit list → dispatches single executor with all edits bundled.

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

Path depends on the topic type:
- **Plan review**: `docs/plans/<plan-name>-critic-review.md` (cycle 1); `docs/plans/<plan-name>-critic-review-2.md` (cycle 2)
- **Non-plan review** (spec / architecture / design / DB schema / tech-stack): `docs/research/codex-reviews/<topic>-critic-review.md` (cycle 1); `docs/research/codex-reviews/<topic>-critic-review-2.md` (cycle 2)

- The cycle counter source-of-truth = the file artifact. Reproducibility across sessions.
- Cycle 2 prompt must reference the cycle 1 file verdict.
- If CLI fails and fallback critic runs in the same cycle, the fallback verdict OVERWRITES the CLI error stub in the same file. Only retain the CLI error stub when no fallback was attempted (e.g. user explicitly disabled critic too).

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

## Codex consult — 호출 메커니즘

> See kzk-codex-handoff §Codex CLI 호출 패턴.

## Cost / cadence

- Per round: ~2-3 min wall, ~25-30k tokens
- 1 spec = 1 round. 1 major plan = 1 round.
- **User explicit OFF only** ("이번엔 codex 빼고") skips the loop. No silent skip.

## Prompt size guideline

> See kzk-codex-handoff §Prompt size guideline.

## Artifact retention

- Codex output appears verbatim in main context during brainstorm / spec phase
- Persist meaningful reasoning to the verdict file path defined in §Verdict file convention (`docs/research/codex-reviews/<topic>-critic-review.md` for non-plan reviews; plan reviews land alongside the plan)
- Future "왜 이렇게 결정했나" questions fall back on these files

## Anti-patterns

- "Self-review로 충분" — different classes of bug; both are needed.
- "Codex가 나보다 못하다" — the value is the angle change, not the absolute IQ. Push-back is a valid bucket.
- Apply codex output verbatim — must pass through synthesize, with explicit category.
- "이번 한 번만 스킵" — only on explicit user OFF. Inconsistency erodes the rule.
- Verdict only in chat history — must land in a file for cross-session reproducibility.

## Interaction with other kzk-*

- **kzk-large-task-delegation §"Pre-implementation plan-critic loop (opus + codex)"** is a *narrower* version of this skill, scoped to plans that feed the sonnet executor. This skill is broader — covers spec / architecture / design too. Cross-reference, do not duplicate.
- **kzk-background-monitoring** governs the codex consult call itself (long-running CLI).
- **harness-share.md §22.5**: End-to-End Ralph Pipeline (spec → plan → critic → implementation in one ralph loop). This skill covers the critic step; §22.5 covers the full pipeline integration including PRD drafting and user-intervention gates.
- **kzk-freshness-guard**: Step 0 전 freshness check + Step -1 후 spec reference CRG 검증
