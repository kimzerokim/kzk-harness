---
name: kzk-spec-and-review
version: 2.13.2
description: "Spec/plan/major design authoring with mandatory cross-vendor codex review. Iterative loop until PASS: Draft → codex consult → synthesize 🔴 BLOCKER / 🟡 NIT / ⚪ push-back → Gate (PASS = BLOCKER 0 AND no structural change, CONTINUE = next cycle, HALT = cycle ≥ 5 + BLOCKER 잔존). Brainstorming default ON (Step -1 after Step 0 survey). Skip only when EITHER explicit `brainstorming 스킵` command standalone OR ALL-of (trivial + pre-specified + no-new-capability). Step 0 survey precondition + freshness check. Triggers: 'spec 잡자', 'plan draft', 'plan 만들어', 'codex review', 'brainstorm', 'brainstorm default ON'. References harness-share.md §22 + §22.5 + §31."
---

> Authoritative source: `harness-share.md` §22 + §22.5 (Step 0 survey precondition references §26). On conflict, that wins.

# kzk-spec-and-review

## Step -1 — Brainstorming (default ON)

> **Order**: Step 0 (survey) runs first, then Step -1 (brainstorming) runs, then the 3-pass Pattern loop. The name "Step -1" is preserved for backward-compat with cross-refs; execution order is Step 0 → Step -1 → Pattern.

**Default**: ON. spec-and-review 진입 시 Step 0 survey 완료 후 `Skill("superpowers:brainstorming")` 1회 호출 의무. keyword-detector 가 `(brainstorm mode)` system-reminder marker 를 inject 하지 않아도 Step -1 은 실행된다 — marker 는 informational; 부재 = skip 아님.

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

- 새 기능 / 새 entry / 새 module 추가 (new capability, not just extension of existing pattern)
- 사용자 결정 필요 발견 (multiple design paths revealed during Step 0 survey, ambiguous spec, missing user input)
- 명시적 brainstorm 키워드 ('brainstorm', '아이디어', '어떻게 해야 할까', '뭐가 좋을까')

**동작**:
1. `Skill("superpowers:brainstorming")` 호출
2. brainstorming 완료 → design doc 경로 수집 (`docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`)
3. design doc 경로를 Step 1 Draft 의 CONTEXT 에 `Required reading: <path>` 로 포함
4. brainstorming 결정사항을 Step 2 codex consult 의 `LOCKED PRIOR DECISIONS` 에 포함

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

## Pattern (Iterative review loop) — runs after Step 0

Loop on the same spec/plan/design until **PASS** (defined in §Gate decision). One cycle = Draft (or Revise) → Codex consult → Synthesize → Gate decision. "1 spec = 1 codex round" 은 **only when cycle 1 자체가 PASS gate 를 만족할 때** — BLOCKER 잔존 또는 구조 변경 발생 시 추가 cycle 의무.

**Cycle N (N ≥ 1):**

1. **Draft (cycle 1) or Revise (cycle ≥ 2)** — main orchestrates; md writing dispatches to `oh-my-claudecode:executor` (sonnet) per §Spec/plan revision dispatch. Main drafts only when ≤ 5 LoC total change (typo, single-line append).
   - Cycle 1 prompt must include survey report path from Step 0 as `Required reading: <path>` (draft must cite findings, not just list files).
   - Cycle ≥ 2 revise prompt MUST include:
     - Cycle (N−1) verdict file path (so executor can locate the BLOCKER list)
     - Categorized edit list applied since cycle (N−1): each item = section anchor + change + 🔴/🟡 tag
     - Original survey report path (unchanged from cycle 1)
   - harness-share.md §32 Code Quality Discipline boilerplate inject 의무 (DRY/YAGNI/KISS + Deletion test + Depth + obsolete test). 위반 시 spec revision 요청.

2. **Codex consult** — run `codex exec` CLI directly (see kzk-codex-handoff §Codex CLI 호출 패턴). CLI not available (`command not found`) or stuck per kzk-codex-handoff §Codex CLI 호출 패턴 (60s no first token → retry; 5 min total → kill) → fallback: `Agent(subagent_type="oh-my-claudecode:critic", prompt=<same review prompt>)` (model 생략 → 메인 opus 버전 상속). **Both paths (CLI and fallback critic) MUST save the verdict to a named file using the Verdict file convention below — chat history alone is insufficient and does not count as the artifact.**
   - Cycle ≥ 2 codex prompt MUST include cycle (N−1) verdict file content (or path with explicit re-read instruction) in `LOCKED PRIOR DECISIONS` block — prevents codex re-flagging resolved BLOCKERs.

3. **Synthesize** — main categorizes each codex point:
   - 🔴 **BLOCKER** — incorrect API contract, broken validator, missing required field, drift from upstream change, security/data-loss risk
   - 🟡 **NIT / 디테일** — wording, ordering, optional clarifications — 반영하되 cycle 이어가는 trigger X
   - ⚪ **PUSH-BACK** — cited rebuttal (scope creep, false positive, already-decided per LOCKED list)

   Then dispatch revision edits per §Spec/plan revision dispatch below. Main never directly Edit/Write the md file for 2+ edits.

4. **Gate decision** (loop control):
   - **PASS** (loop exit, proceed to implementation / plan freeze):
     - 🔴 BLOCKER count = 0, AND
     - 이번 cycle 적용된 변경이 NIT/wording-only 또는 push-back 정리만 (구조 변경 X)
   - **CONTINUE** (cycle N+1 진입):
     - 🔴 BLOCKER ≥ 1, OR
     - spec 에 구조 변경 (DTO field 추가/제거, API surface rename, validator factory 신설, contract field 변경) 가 가해진 경우 — 변경된 spec 은 아직 codex 검증 안 된 상태
   - **HALT** (autonomous mode 도 의무):
     - cycle N ≥ 5 AND BLOCKER 잔존
     - `docs/harness/user-queue.md` entry 추가 + 사용자 결정 대기. ralph 자율 무한 retry 금지.

Drafts of ≤ 5 LoC bypass Step 1 executor dispatch (main direct Edit OK) but **still must pass through Steps 2–4** — single-line append 도 codex consult skip 금지.

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

Path depends on the topic type. Cycle N (N = cycle counter from §Pattern):
- **Plan review**:
  - N=1: `docs/plans/<plan-name>-critic-review.md`
  - N=2: `docs/plans/<plan-name>-critic-review-2.md`
  - N≥3: `docs/plans/<plan-name>-critic-review-N.md`
- **Non-plan review** (spec / architecture / design / DB schema / tech-stack):
  - N=1: `docs/research/codex-reviews/<topic>-critic-review.md`
  - N=2: `docs/research/codex-reviews/<topic>-critic-review-2.md`
  - N≥3: `docs/research/codex-reviews/<topic>-critic-review-N.md`

- Cycle counter source-of-truth = file artifact count (glob `*-critic-review*.md` for the topic). Session crash 후에도 재현 가능. Cycle 진입 직전 main 은 글롭 결과 + 1 로 다음 cycle N 계산.
- Cycle N (N≥2) verdict file 본문 헤더에 `Cycle: N` + `Previous: <path to cycle N-1 verdict>` + `BLOCKERs resolved since N-1: <count>` 명시 의무.
- Cycle N (N≥2) codex/critic prompt MUST reference cycle (N−1) verdict file content as `LOCKED PRIOR DECISIONS` (§Pattern Cycle N step 2).
- CLI fail + fallback critic 같은 cycle 내 실행 → fallback verdict OVERWRITES CLI error stub in the same cycle N file.
- CLI error stub 단독 보존은 fallback 도 disable 된 경우만 (사용자가 critic OFF).

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

- Per cycle: ~2-3 min wall, ~25-30k tokens
- **Default cycle budget: 5.** Soft cap — cycle ≤ 5 까지 사용자 결정 없이 자율 진행. Cycle ≥ 5 + BLOCKER 잔존 → §Pattern Gate decision HALT path (user-queue).
- "1 spec = 1 cycle" / "1 major plan = 1 cycle" 은 **cycle 1 이 PASS gate (BLOCKER 0 + 구조 변경 없음) 를 만족한 경우만**. BLOCKER 잔존 또는 cycle 1 synthesize 가 spec 구조를 변경한 경우 cycle 2 의무.
- Cycle 2+ 는 비싼 게 아니라 검증 갭을 메우는 비용 — 변경된 spec 을 검증하지 않고 implementation 진입 시 implementation 단계 rework 가 더 비쌈 (cycle 평균 25k tokens vs implementation 단계 1 BLOCKER fix 평균 80–200k tokens).
- **User explicit OFF only** ("이번엔 codex 빼고") skips the loop entirely. No silent skip. Partial skip ("cycle 2 만 빼고") 도 동일 — explicit user OFF 만 인정.

## Prompt size guideline

> See kzk-codex-handoff §Prompt size guideline.

## Artifact retention

Persist all codex/critic output to the verdict file (§Verdict file convention) — chat-history-only verdict does not count.

## Anti-patterns

- "Self-review로 충분" — different classes of bug; both are needed.
- "Codex가 나보다 못하다" — the value is the angle change, not the absolute IQ. Push-back is a valid bucket.
- Apply codex output verbatim — must pass through synthesize, with explicit category.
- "이번 한 번만 스킵" — only on explicit user OFF. Inconsistency erodes the rule.
- Verdict only in chat history — must land in a file for cross-session reproducibility.
- **"Cycle 1 verdict 받고 fix 한 다음 바로 implementation"** — cycle 1 에 🔴 BLOCKER 가 있었거나 fix 적용 과정에서 spec 구조 (DTO/API/validator/contract) 가 바뀌었으면 cycle 2 의무. 변경된 spec 은 codex 검증 안 된 상태. PASS gate (§Pattern §Gate decision) 미충족이면 implementation 진입 금지.
- **"BLOCKER 1개 정도는 implementation 가면서 해결"** — 🔴 BLOCKER 0 이 PASS gate. 1개 있으면 무조건 cycle 추가. ralph / autonomous 모드도 예외 없음 — autonomous 의 "polite stop 금지" 가 "BLOCKER 무시" 를 의미하지 않음.
- **"Cycle 무한 진행"** — cycle ≥ 5 + BLOCKER 잔존 시 HALT to `docs/harness/user-queue.md`. 자율 무한 retry 금지 (rate limit / context exhaustion 위험).

## Interaction with other kzk-*

- **kzk-large-task-delegation §"Pre-implementation plan-critic loop (opus + codex)"** is a *narrower* version of this skill, scoped to plans that feed the sonnet executor. This skill is broader — covers spec / architecture / design too. Cross-reference, do not duplicate.
- **kzk-background-monitoring** governs the codex consult call itself (long-running CLI).
- **harness-share.md §22.5**: End-to-End Ralph Pipeline (spec → plan → critic → implementation in one ralph loop). This skill covers the critic step; §22.5 covers the full pipeline integration including PRD drafting and user-intervention gates.
- **kzk-freshness-guard**: Step 0 전 freshness check + Step -1 후 spec reference CRG 검증
