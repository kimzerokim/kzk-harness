---
title: "Superpowers Migration Survey — docs/superpowers → docs/plans"
date: 2026-05-12
status: complete
---

# Superpowers Migration Survey (2026-05-12)

Comprehensive audit for migrating `docs/superpowers/specs/*.md` and `docs/superpowers/plans/*.md` to `docs/plans/`, including all citation updates, HTML flow diagram conversions, skill content translations, and hook infrastructure documentation expansion.

---

## 1. Files to Move

### 1.1 Files under `docs/superpowers/specs/`

| Current Path | New Path | Rationale |
|---|---|---|
| `docs/superpowers/specs/2026-05-03-kzk-web-loop-design.md` | `docs/plans/2026-05-03-kzk-web-loop-design.md` | Design doc, no suffix change needed |
| `docs/superpowers/specs/2026-05-04-kzk-codebase-survey-design.md` | `docs/plans/2026-05-04-kzk-codebase-survey-design.md` | Design doc, no suffix change needed |
| `docs/superpowers/specs/2026-05-04-kzk-global-install-design.md` | `docs/plans/2026-05-04-kzk-global-install-design.md` | Design doc, no suffix change needed |
| `docs/superpowers/specs/2026-05-05-brainstorm-flow-freshness-guard-design.md` | `docs/plans/2026-05-05-brainstorm-flow-freshness-guard-design.md` | Design doc, no suffix change needed |
| `docs/superpowers/specs/2026-05-06-codex-handoff-and-fix-layer-pivot-design.md` | `docs/plans/2026-05-06-codex-handoff-and-fix-layer-pivot-design.md` | Design doc, no suffix change needed |
| `docs/superpowers/specs/2026-05-07-cycle-47-b2-c1-queue-design.md` | `docs/plans/2026-05-07-cycle-47-b2-c1-queue-design.md` | Design doc, no suffix change needed |

**Total specs files: 6**

### 1.2 Files under `docs/superpowers/plans/`

| Current Path | New Path | Rationale |
|---|---|---|
| `docs/superpowers/plans/2026-05-03-kzk-web-loop.md` | `docs/plans/2026-05-03-kzk-web-loop-plan.md` | Implementation plan, add `-plan` suffix |
| `docs/superpowers/plans/2026-05-04-kzk-codebase-survey.md` | `docs/plans/2026-05-04-kzk-codebase-survey-plan.md` | Implementation plan, add `-plan` suffix |

**Total plans files: 2**

**Grand total: 8 files to move**

---

## 2. Citation Locations & Updates

### 2.1 Citation Summary

Total citations found: **36 unique locations** across 13 distinct files.

### 2.2 Citations Grouped by File

#### File: `/Users/kimzerokim/work/personal/kzk-harness/harness-share.md`

**Lines with citations:**

| Line | Old String | New String | Notes |
|---|---|---|---|
| 360 | `docs/superpowers/specs/` | `docs/superpowers/specs/` | Path consolidation note (keep as historical reference) |
| 374 | `docs/superpowers/specs/` | `docs/superpowers/specs/` | Path consolidation note (keep as historical reference, explicitly states "archival") |
| 956 | `docs/superpowers/specs/2026-05-03-kzk-web-loop-design.md` | `docs/plans/2026-05-03-kzk-web-loop-design.md` | Spec pointer in §25 |
| 1005 | `docs/superpowers/specs/2026-05-04-kzk-codebase-survey-design.md` | `docs/plans/2026-05-04-kzk-codebase-survey-design.md` | Spec pointer in §26 |

**Replacements needed: 2** (lines 956, 1005)

#### File: `/Users/kimzerokim/work/personal/kzk-harness/CLAUDE.md`

| Line | Old String | New String | Notes |
|---|---|---|---|
| 51 | `docs/plans/*-design.md` (canonical path per harness-share.md §5; historical drafts at `docs/superpowers/specs/` remain valid pointers but no new files land there) | No change | This is already correct — mentions historical path as valid but notes new path is canonical |

**Replacements needed: 0**

#### File: `/Users/kimzerokim/work/personal/kzk-harness/docs/skill-flow.html`

| Line | Old String | New String | Notes |
|---|---|---|---|
| 757 | `docs/superpowers/specs/` (in path notation block mentioning historical drafts) | No change | Correctly states historical path remains readable |

**Replacements needed: 0**

#### File: `/Users/kimzerokim/work/personal/kzk-harness/install/AGENTS.md`

| Line | Old String | New String | Notes |
|---|---|---|---|
| 6 | `docs/superpowers/specs/2026-05-04-kzk-global-install-design.md` | `docs/plans/2026-05-04-kzk-global-install-design.md` | Frozen design pointer |

**Replacements needed: 1** (line 6)

#### File: `/Users/kimzerokim/work/personal/kzk-harness/install/hooks/keyword-detector.mjs`

| Line | Old String | New String | Notes |
|---|---|---|---|
| 11 | `docs/superpowers/specs/2026-05-04-kzk-global-install-design.md` | `docs/plans/2026-05-04-kzk-global-install-design.md` | Authoritative spec comment |

**Replacements needed: 1** (line 11)

#### File: `/Users/kimzerokim/work/personal/kzk-harness/docs/research/codex-reviews/kzk-global-install-critic-review.md`

| Line | Old String | New String | Notes |
|---|---|---|---|
| 6 | `docs/superpowers/specs/2026-05-04-kzk-global-install-design.md` | `docs/plans/2026-05-04-kzk-global-install-design.md` | Spec reference in review header |

**Replacements needed: 1** (line 6)

#### File: `/Users/kimzerokim/work/personal/kzk-harness/docs/research/codex-reviews/cycle-47-spec-critic-review.md`

| Line | Old String | New String | Notes |
|---|---|---|---|
| 3 | `docs/superpowers/specs/2026-05-07-cycle-47-b2-c1-queue-design.md` | `docs/plans/2026-05-07-cycle-47-b2-c1-queue-design.md` | Spec under review header |

**Replacements needed: 1** (line 3)

#### File: `/Users/kimzerokim/work/personal/kzk-harness/docs/plans/cycle-47-plan-C1-git-guardrails-install.md`

| Line | Old String | New String | Notes |
|---|---|---|---|
| 6 | `docs/superpowers/specs/2026-05-07-cycle-47-b2-c1-queue-design.md` | `docs/plans/2026-05-07-cycle-47-b2-c1-queue-design.md` | Spec source reference |
| 197 | `docs/superpowers/specs/2026-05-07-cycle-47-b2-c1-queue-design.md` | `docs/plans/2026-05-07-cycle-47-b2-c1-queue-design.md` | Spec reference in instructions |

**Replacements needed: 2** (lines 6, 197)

#### File: `/Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-F-edit-read-guard-critic-review-raw.md`

| Line | Old String | New String | Notes |
|---|---|---|---|
| 591 | `docs/superpowers/specs/2026-05-04-kzk-global-install-design.md` | `docs/plans/2026-05-04-kzk-global-install-design.md` | Authoritative spec comment |

**Replacements needed: 1** (line 591)

#### File: `/Users/kimzerokim/work/personal/kzk-harness/docs/plans/2026-05-04-kzk-global-install.md`

| Line | Old String | New String | Notes |
|---|---|---|---|
| 6 | `docs/superpowers/specs/2026-05-04-kzk-global-install-design.md` | `docs/plans/2026-05-04-kzk-global-install-design.md` | Spec source frontmatter |
| 15 | `docs/superpowers/specs/2026-05-04-kzk-global-install-design.md` | `docs/plans/2026-05-04-kzk-global-install-design.md` | Plan description paragraph |
| 68 | `docs/superpowers/specs/2026-05-04-kzk-global-install-design.md` | `docs/plans/2026-05-04-kzk-global-install-design.md` | Authoritative spec comment |
| 766 | `docs/superpowers/specs/2026-05-04-kzk-global-install-design.md` | `docs/plans/2026-05-04-kzk-global-install-design.md` | Pointer in AGENTS.md note |

**Replacements needed: 4** (lines 6, 15, 68, 766)

#### File: `/Users/kimzerokim/work/personal/kzk-harness/docs/plans/cycle-47-plan-Y-user-queue-format.md`

| Line | Old String | New String | Notes |
|---|---|---|---|
| 6 | `docs/superpowers/specs/2026-05-07-cycle-47-b2-c1-queue-design.md` | `docs/plans/2026-05-07-cycle-47-b2-c1-queue-design.md` | Spec reference |

**Replacements needed: 1** (line 6)

#### File: `/Users/kimzerokim/work/personal/kzk-harness/docs/plans/2026-05-05-brainstorm-freshness-plan.md`

| Line | Old String | New String | Notes |
|---|---|---|---|
| 3 | `docs/superpowers/specs/2026-05-05-brainstorm-flow-freshness-guard-design.md` | `docs/plans/2026-05-05-brainstorm-flow-freshness-guard-design.md` | Spec reference in frontmatter |

**Replacements needed: 1** (line 3)

#### File: `/Users/kimzerokim/work/personal/kzk-harness/docs/plans/cycle-47-plan-B2-fix-layer-pivot-inline.md`

| Line | Old String | New String | Notes |
|---|---|---|---|
| 5 | `docs/superpowers/specs/2026-05-07-cycle-47-b2-c1-queue-design.md` | `docs/plans/2026-05-07-cycle-47-b2-c1-queue-design.md` | Spec reference in metadata |
| 138 | `docs/superpowers/specs/2026-05-07-cycle-47-b2-c1-queue-design.md` | `docs/plans/2026-05-07-cycle-47-b2-c1-queue-design.md` | Spec reference in section |
| 172 | `docs/superpowers/specs/2026-05-07-cycle-47-b2-c1-queue-design.md` | `docs/plans/2026-05-07-cycle-47-b2-c1-queue-design.md` | Spec reference in section |

**Replacements needed: 3** (lines 5, 138, 172)

#### File: `/Users/kimzerokim/work/personal/kzk-harness/docs/superpowers/plans/2026-05-04-kzk-codebase-survey.md`

| Line | Old String | New String | Notes |
|---|---|---|---|
| 11 | `docs/superpowers/specs/2026-05-04-kzk-codebase-survey-design.md` | `docs/plans/2026-05-04-kzk-codebase-survey-design.md` | Spec reference (will be moved to docs/plans/) |
| 247 | `docs/superpowers/specs/2026-05-04-kzk-codebase-survey-design.md` | `docs/plans/2026-05-04-kzk-codebase-survey-design.md` | Spec reference (will be moved to docs/plans/) |

**Replacements needed: 2** (lines 11, 247) — **This file itself is moving to docs/plans/, so update before moving**

#### File: `/Users/kimzerokim/work/personal/kzk-harness/docs/superpowers/plans/2026-05-03-kzk-web-loop.md`

| Line | Old String | New String | Notes |
|---|---|---|---|
| 45 | `docs/superpowers/specs/2026-05-03-kzk-web-loop-design.md` | `docs/plans/2026-05-03-kzk-web-loop-design.md` | Spec reference in authoritative source |
| 258 | `docs/superpowers/specs/2026-05-03-kzk-web-loop-design.md` | `docs/plans/2026-05-03-kzk-web-loop-design.md` | Full spec reference |

**Replacements needed: 2** (lines 45, 258) — **This file itself is moving to docs/plans/, so update before moving**

#### File: `/Users/kimzerokim/work/personal/kzk-harness/docs/superpowers/specs/2026-05-04-kzk-global-install-design.md`

| Line | Old String | New String | Notes |
|---|---|---|---|
| 9 | `docs/superpowers/specs/2026-05-03-kzk-web-loop-design.md` | `docs/plans/2026-05-03-kzk-web-loop-design.md` | Cross-reference in frontmatter |
| 10 | `docs/superpowers/specs/2026-05-04-kzk-codebase-survey-design.md` | `docs/plans/2026-05-04-kzk-codebase-survey-design.md` | Cross-reference in frontmatter |

**Replacements needed: 2** (lines 9, 10) — **This file itself is moving to docs/plans/, so update before moving**

#### File: `/Users/kimzerokim/work/personal/kzk-harness/docs/superpowers/specs/2026-05-05-brainstorm-flow-freshness-guard-design.md`

| Line | Old String | New String | Notes |
|---|---|---|---|
| 40 | `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` | `docs/plans/YYYY-MM-DD-<topic>-design.md` | Output path reference in procedure |

**Replacements needed: 1** (line 40) — **This file itself is moving to docs/plans/, so update before moving**

#### File: `/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-spec-and-review/SKILL.md`

| Line | Old String | New String | Notes |
|---|---|---|---|
| 40 | `docs/superpowers/specs/` (in brainstorming completion step) | `docs/plans/` | Brainstorming output path |

**Replacements needed: 1** (line 40)

#### File: `/Users/kimzerokim/work/personal/kzk-harness/harness-flow-progress.md`

| Lines | Old String | New String | Notes |
|---|---|---|---|
| 38 (5 occurrences within Cycle 24 entry) | `docs/superpowers/specs/2026-05-04-kzk-global-install-design.md` | `docs/plans/2026-05-04-kzk-global-install-design.md` | Historical progress log entries |

**Replacements needed: 5** (all within Cycle 24 entry) — These reference frozen design docs. Update for consistency but note these are historical entries.

#### File: `/Users/kimzerokim/work/personal/kzk-harness/docs/harness/surveys/2026-05-04-kzk-global-install-pre-merge.md`

| Line | Old String | New String | Notes |
|---|---|---|---|
| 66 | `docs/superpowers/specs/*.md` | `docs/plans/*-design.md` | Pre-merge survey note (general reference) |
| 274 | `docs/superpowers/specs/2026-05-04-kzk-global-install-design.md` | `docs/plans/2026-05-04-kzk-global-install-design.md` | Spec pointer |

**Replacements needed: 2** (lines 66, 274)

#### File: `/Users/kimzerokim/work/personal/kzk-harness/docs/harness/surveys/2026-05-06-fix-layer-pivot-codex-fallback-survey.md`

| Line | Old String | New String | Notes |
|---|---|---|---|
| 286 | `docs/superpowers/specs/` | `docs/plans/` | Path verification note |
| 299 | `docs/superpowers/specs/2026-05-06-fix-layer-pivot-codex-fallback-design.md` | `docs/plans/2026-05-06-codex-handoff-and-fix-layer-pivot-design.md` | New skill design doc path |

**Replacements needed: 2** (lines 286, 299) — **Note: Line 299 references a file that doesn't match exactly; verify mapping**

#### File: `/Users/kimzerokim/work/personal/kzk-harness/docs/harness/surveys/2026-05-07-cycle-47-b2-c1-queue-survey.md`

| Lines | Old String | New String | Notes |
|---|---|---|---|
| 39 | `docs/superpowers/specs/2026-05-06-codex-handoff-and-fix-layer-pivot-design.md` | `docs/plans/2026-05-06-codex-handoff-and-fix-layer-pivot-design.md` | Survey reference |
| 126 | `docs/superpowers/specs/2026-05-06-codex-handoff-and-fix-layer-pivot-design.md` | `docs/plans/2026-05-06-codex-handoff-and-fix-layer-pivot-design.md` | Table reference |

**Replacements needed: 2** (lines 39, 126)

### 2.3 Files Requiring Edit Operations

**Total files requiring updates: 18**

**By replacement count:**
- 1 replacement: 9 files (CLAUDE.md, install/AGENTS.md, keyword-detector.mjs, kzk-global-install-critic-review.md, cycle-47-spec-critic-review.md, plan-F-edit-read-guard-critic-review-raw.md, cycle-47-plan-Y-user-queue-format.md, 2026-05-05-brainstorm-freshness-plan.md, kzk-spec-and-review/SKILL.md)
- 2 replacements: 6 files (kzk-codebase-survey.md, kzk-web-loop.md, 2026-05-04-kzk-global-install-design.md, 2026-05-04-kzk-global-install-pre-merge.md, 2026-05-06-fix-layer-pivot-codex-fallback-survey.md, 2026-05-07-cycle-47-b2-c1-queue-survey.md)
- 3 replacements: 1 file (cycle-47-plan-B2-fix-layer-pivot-inline.md)
- 4 replacements: 1 file (2026-05-04-kzk-global-install.md)
- 5 replacements: 1 file (harness-flow-progress.md — all in single Cycle 24 entry)

**Recommended edit strategy:**
- Use `replace_all=true` for same-string replacements within a file
- Group by old-new string pair to minimize edit operations
- Prioritize mission-critical files (CLAUDE.md, SKILL.md, AGENTS.md, keyword-detector.mjs) first

---

## 3. HTML Flowchart LR → TD Audit

### 3.1 All Flowchart Blocks in `docs/skill-flow.html`

| Block # | First Line | Anchor ID | Current Direction | Target |
|---|---|---|---|---|
| 1 | `flowchart TD` (Line 381) | `#flow-fix` (5.1 fix-start) | **TD** | Keep |
| 2 | `flowchart LR` (Line 423) | `#flow-spec` (5.2 spec / plan draft) | **LR** | Change to TD |
| 3 | `flowchart TD` (Line 448) | `#flow-auto` (5.3 autonomous execution) | **TD** | Keep |
| 4 | `flowchart TD` (Line 472) | `#flow-web` (5.4 web-loop) | **TD** | Keep |
| 5 | `flowchart LR` (Line 504) | `#flow-commit` (5.5 commit — Gate 0~5) | **LR** | Change to TD |
| 6 | `flowchart TD` (Line 530) | (Section 5.6, unnamed) | **TD** | Keep |

### 3.2 Blocks Requiring Change

**Total blocks to convert: 2**

1. **Block 2 (Line 423)** — Section #flow-spec (5.2 spec / plan draft)
   - Change: `flowchart LR` → `flowchart TD`
   - Context: Shows spec authoring flow (brainstorm → draft → codex → gate)
   
2. **Block 5 (Line 504)** — Section #flow-commit (5.5 commit — Gate 0~5 sequence)
   - Change: `flowchart LR` → `flowchart TD`
   - Context: Shows sequential gate progression; TD more natural for linear sequence

---

## 4. Autonomous-Boundary Survey-First Rule Insertion

### 4.1 kzk-autonomous-boundary SKILL.md Best Insertion Point

**Recommendation: Add new section after §Interaction with other kzk-* (end of file, line 171)**

**Current context (lines 161–167):**
```markdown
## Interaction with other kzk-*

- **kzk-tool-retry**: When any Edit/Write/Bash fails during autonomous execution, apply 1-retry before halting or queuing. This skill defines halt conditions; kzk-tool-retry defines the single-call retry discipline that runs before those conditions are evaluated.
- **kzk-autonomous-loop**: polite-stop ban and multi-Plan continuation rules. This skill defines what STOPS the loop; that one defines how the loop CONTINUES.
- **kzk-user-queue**: halt conditions that require a user decision append entries here and await a DECISION line before resuming.
- **kzk-test-coverage**: Plan A Layer (b) 자율 mode 메인 직접 TDD 금지 룰의 halt entry (`Q-TDD-MAIN`) 가 본 skill 의 §Halt conditions 표에 등록됨. ...
```

**Proposed insertion (new section after interactions):**

```markdown
## Pre-dispatch survey rule (kzk-large-task-delegation + kzk-codebase-survey)

**Inside autonomous mode, every `kzk-large-task-delegation` dispatch must run `kzk-codebase-survey` first if survey is not already in the dispatch context.**

- **Rationale**: Multi-file / 5+ file read / 200+ LoC scope estimation is inherently a read-heavy audit (per `kzk-large-task-delegation §Read-heavy audit dispatch shape`). Autonomous mode forbids main from reading 5+ files directly; survey must precede delegation.
- **Exception**: If the task originates from a prior `kzk-codebase-survey` dispatch (same turn, carry-forward prompt context), skip re-survey and dispatch executor directly.
- **Halt on skip**: If `kzk-large-task-delegation` detects multi-file scope but survey context is absent, append `Q-SURVEY-MISSING` to user-queue and halt. Resume only after survey completes.

**Cross-ref:**
- `kzk-large-task-delegation §Scope estimation` — estimation is the pre-dispatch gate
- `kzk-codebase-survey §8-step` — survey as the hub for read-heavy audit
- `harness-share.md §4` — large-task routing rules
```

### 4.2 kzk-large-task-delegation SKILL.md Alternative Insertion Point

**Alternative (if preferred within large-task-delegation file): Add subsection after §Read-heavy audit dispatch shape (line 83)**

**Current context (lines 71–82):**
```markdown
## Read-heavy audit dispatch shape

For verification / audit scenarios (user says "스펙파일 체크해줘", "구현 확인", "버그 전수조사", "spec vs code 매칭", "이거 제대로 구현됐나"):

- Main context **MUST NOT** read 5+ files directly with `Read` — context saturation degrades conclusion quality (the "main reads code weirdly" failure mode).
- Dispatch shape:
  1. `oh-my-claudecode:explore` ...
```

**Proposed insertion (new subsection):**

```markdown
### Pre-dispatch survey requirement (autonomous mode)

When `kzk-large-task-delegation` is invoked inside autonomous mode and the scope estimate indicates multi-file / 5+ file read / 200+ LoC work:

**Mandatory sequence:**
1. Check if `kzk-codebase-survey` report is already in the dispatch context (same turn carry-forward).
2. If not present → dispatch `kzk-codebase-survey` first; halt pending survey completion.
3. Once survey report is available → proceed to delegation scope estimation + executor dispatch.

**Rationale**: Autonomous mode forbids main from direct 5+ file read. The survey must precede delegation to unblock scope estimation in a subagent context (EXPLORER sonnet).

**Exception entry**: If survey is skipped, append `Q-SURVEY-MISSING` to user-queue and halt.
```

**Recommendation:** Insert in **kzk-autonomous-boundary** (at end) since that's where autonomous mode rules live; avoid duplicating in kzk-large-task-delegation.

---

## 5. Skill Content Audit — Korean Sentences in Skill Cards

### 5.1 18 Skill Cards Korean Sentences (from `docs/skill-flow.html` §6)

**Blurb text for each card (lines 549–1050):**

| Card # | Skill Name | Blurb (Korean) | Trigger Chips (Korean) | Count |
|---|---|---|---|---|
| 1 | kzk-using-superpowers | "트리거 키워드가 prompt 에 등장하면 본문이 메인 컨텍스트로 자동 로드. 코드 X, 마크다운 본문이 그대로 룰북." | `"kzk-* trigger"`, `"SKILL.md 자동 주입"`, `"keyword routing"` | 1 blurb + 3 triggers |
| 2 | hook infrastructure | "PreToolUse / PostToolUse / UserPromptSubmit / Stop 이벤트에 묶이는 stdin-driven 스크립트. JSON 입출력으로 메인을 가로채거나 system-reminder 주입." | `"hook 인프라"`, `"UserPromptSubmit"`, `"PreToolUse"`, `"enforcement 자동화"` | 1 blurb + 4 triggers |
| 3 | kzk-pre-commit-gate | "모든 commit 의 게이트. 6단계 시퀀스 (Gate 0/0.5/1/1.5/1.6/2/3/4/4.5/5) 가 직렬 실행. 하나라도 FAIL → commit block. doc-only 변경 시 일부 예외." | `"commit"`, `"pre-commit"`, `"Gate 0/1/1.5/2/3/4"`, `"AGENTS.md sync"`, `"secrets scan"`, `"doc-only"` | 1 blurb + 6 triggers |
| 4 | kzk-large-task-delegation | "메인은 dispatch + review 만, 실제 작업은 subagent 위임. 3+ 파일 / 200+ LoC / 5+ read 자동 감지. Model routing (opus = plan/critic/verify, sonnet = 구현/research, haiku = 기계적). 3-stage review." | `"큰 작업"`, `"버그 전수조사"`, `"마무리 해줘"`, `"사이클 자율"`, `"plan 쪼개"`, `"Stage 3"`, `"ralph로 돌려"`, `"끝까지 끝내줘"` | 1 blurb + 8 triggers |
| 5 | kzk-playwright-verification | "Gate 4 의 본체. 3+ 페이지 navigate + full-page screenshot + console error 0 가 의무. Dev 서버 health pre-check (Tailwind v4 등 dev/prod 분기 트랩 차단). OAuth 클릭스루는 agent-driven (사용자 대기 X)." | `"Playwright"`, `"Gate 4"`, `"browser_navigate"`, `"screenshot"`, `"MCP drop"`, `"OAuth multi-account"` | 1 blurb + 6 triggers |
| 6 | kzk-autonomous-boundary | "자율실행 모드 진입 즉시 3-slot 컨트랙트 (destination / branch name / PR mode) 를 ASK FIRST. 18개의 halt 항목 (Q-* prefix). 자율 완료 verifier 의무 (메인 자가-선언 금지)." | `"ralph로 돌려"`, `"끝까지 끝내줘"`, `"자율실행"`, `"ralph로 체크"`, `"ralph로 확인"`, `"autonomous TDD enforce"` | 1 blurb + 6 triggers |
| 7 | kzk-autonomous-loop | "자율 mode 진입 후 polite-stop 금지. Rate-limit polling (ScheduleWakeup 600s), context 80% 시 자동 /compact, Plan A→N 자동 continuation. 9개 canonical polite-stop 위반 예시 본문에 명시." | `"rate limit"`, `"context 80%"`, `"multi-plan continuation"` | 1 blurb + 3 triggers |
| 8 | kzk-background-monitoring | "백그라운드 task ownership 규율. Spawning agent 가 terminal state 까지 owner. Stuck threshold: Bash ≥3분, subagent ≥5분, codex 60s no-first-token. ≥2초 tool 결과는 narration 의무." | `"run_in_background"`, `"Monitor"`, `"long-running"`, `"build"`, `"install"` | 1 blurb + 5 triggers |
| 9 | kzk-spec-and-review | "spec / plan / major design 작성의 cross-vendor codex review 의무화. Step -1 brainstorming default ON, Step 0 survey 선행. Draft → codex consult → 합성 → Gate (PASS/CONTINUE/HALT) 반복." | `"spec 잡자"`, `"spec 작성"`, `"plan 작성"`, `"plan 만들어"`, `"codex review"`, `"brainstorm"`, `"major design"`, `"architecture review"` | 1 blurb + 8 triggers |
| 10 | kzk-pre-merge-sync | "PR 생성 (또는 direct-main milestone) 직전 4-step 체크리스트. CLAUDE.md sync → deepinit → hook auto-enable → freshness sweep." | `"merge"`, `"feature branch"`, `"CLAUDE.md sync"`, `"deepinit"`, `"pre-merge"`, `"milestone"` | 1 blurb + 6 triggers |
| 11 | kzk-production-access | "Production / 외부 인프라 접근 경계. Read-only 도 사용자 explicit 요청 필요. State mutation = AI 가 script 만 작성, user/CI 가 실행. Idempotency 의무. AKIA 영구키 거부." | `"AWS"`, `"SSM"`, `"production"`, `"credential"`, `"destructive"`, `"AKIA"`, `"ASIA"`, `"aws-vault"` | 1 blurb + 8 triggers |
| 12 | kzk-test-coverage | "TDD strict (Red→Green→Refactor→Commit) + 변경 파일 line+branch 100%. 자율 mode + 코드 변경 = TDD 자동 적용 (keyword 없어도). 메인 직접 red 진입 금지 — fresh sonnet dispatch 의무." | `"tdd"`, `"test first"`, `"테스트 먼저"`, `"red-green"`, `"+ autonomous + 코드 변경 = 자동"` | 1 blurb + 5 triggers |
| 13 | kzk-tool-retry | "Edit/Write/Bash 실패 시 single 자동 retry (사용자 prompt 사이에 X). 7가지 read-tracker invalidator 이벤트 시 사전 Read 의무. Double-failure → Q-TOOL queue." | `"Edit fail"`, `"Write fail"`, `"File has not been read yet"`, `"String to replace not found"`, `"File has been modified since read"` | 1 blurb + 5 triggers |
| 14 | kzk-user-queue | "자율-mode 모호 결정 기록소. Pending entry 에 잠정 default + 진행 (halt 절대 X). 사용자 복귀 시 3단계 interactive review (classify → GROUP A 해결 → 반복 max 3)." | `"ambiguous decision"`, `"user returns"`, `"queue review"`, `"DECISION line append"` | 1 blurb + 4 triggers |
| 15 | kzk-web-loop | "자율 웹 페이지 개선 루프. P0 fast-path → executor 직접 / P1·P2 → survey + writing-plans + subagent-driven-dev. Reviewer-FAIL skip override (autonomous-loop 와 차이). 5.5 회고 단계에서 /learn 호출." | `"web loop"`, `"웹 루프"`, `"자율 개선"`, `"loop forever"`, `"무한 개선"`, `"무한 루프"`, `"계속 돌려"` | 1 blurb + 7 triggers |
| 16 | kzk-codebase-survey | "사전-계획 deep 탐색의 hub. EXPLORER subagent (oh-my-claudecode:explore, sonnet) 위임. 8-step (Step 0.5 CRG verify, scope expansion, deep read, library detect, pattern extract, TS contracts, env vars, report). 메인 5+ 파일 read 금지." | `"codebase survey"`, `"코드베이스 탐색"`, `"survey first"`, `"상세하게 봐줘"`, `"상세히 봐줘"`, `"spec 체크"`, `"하나하나 확인"`, `"버그 전수조사"`, `"fix 시작"` | 1 blurb + 9 triggers |
| 17 | kzk-regression-memory | "fix-start 키워드 감지 시 gstack /learn JSONL primary + sidecar (dismiss_count, stale, archived) 자동 회수. confidence × 0.85^dismiss decay. pre-merge-sync step 3 에서 enable." | `"regression memory"`, `"재발 방지"`, `"fix recall"`, `"fix 시작"`, `"과거 fix 조회"`, `"dismiss recall"` | 1 blurb + 6 triggers |
| 18 | kzk-fix-scope-expansion | "fix-start 시 callsite 전수 → 캐시 저장. Gate 4.5 에서 staged diff 와 캐시 비교, mismatch 시 commit BLOCK. Fix layer pivot (L0→L3) on 동일 layer 2× fail." | `"callsite 전수"`, `"Gate 4.5"`, `"fix-scope-cache"`, `"callsite mismatch"`, `"KZK_GATE45_SKIP"` | 1 blurb + 5 triggers |

### 5.2 Translation Strategy

**Total Korean sentences to translate: 18 blurbs + ~120 trigger keywords**

**Approach:**
1. **Blurbs**: Preserve technical terminology (e.g., "Gate 0", "TDD", "CRG"); translate descriptive prose
2. **Trigger chips**: Keep English technical terms as-is; translate Korean descriptive triggers
3. **Cross-ref format**: Preserve link anchors + sister-skill English names
4. **Example translation (kzk-large-task-delegation blurb):**
   - **Korean**: "메인은 dispatch + review 만, 실제 작업은 subagent 위임. 3+ 파일 / 200+ LoC / 5+ read 자동 감지. Model routing (opus = plan/critic/verify, sonnet = 구현/research, haiku = 기계적). 3-stage review."
   - **English**: "Main delegates to subagents for implementation + review. Auto-detects 3+ files / 200+ LoC / 5+ reads. Model routing (opus = plan/critic/verify, sonnet = implementation/research, haiku = mechanical). 3-stage review."

---

## 6. Hook Detail Expansion — 8 Hooks + Infrastructure

### 6.1 Hook Summary Table (Current §9)

The HTML §9 table (lines 1104–1117) lists 8 global hooks + 1 project hook with brief descriptions. Expansion target: 3–5 bullets per hook.

### 6.2 Hook-by-Hook Detail (from `.mjs` source analysis)

#### Hook 1: `install/hooks/keyword-detector.mjs`

**Event:** `UserPromptSubmit`

**Trigger Keywords/Patterns:**
- Autonomous mode entry: `"ralph로 돌려"`, `"끝까지 끝내줘"`, `"자율실행"`, `"자율 실행"`, `"자율로 돌려"`, `"kzk 자율실행"`, `"실행해놔야 queue 보지"`, `"autonomous mode"`
- Halt keywords: `"그만"`, `"그만해"`, `"중단"`, `"멈춰"`, `"stop autonomous"`, `"halt autonomous"`, `"자율 실행 그만"`, `"끝났어"`, `"이제 그만"`
- Rule-based keyword groups (9 rules):
  - Large-task triggers: `"큰 작업"`, `"버그 전수조사"`, `"마무리 해줘"` (8+ keywords)
  - Survey+delegation: `"codebase survey"`, `"코드베이스 탐색"`, `"spec 체크"` (8+ keywords)
  - Spec/plan authoring: `"spec 잡자"`, `"spec 작성"`, `"plan draft"` (10+ keywords)
  - TDD discipline: `"tdd"`, `"test first"`, `"테스트 먼저"` (8+ keywords)
  - Self-improvement: `"harness 개선 루프"`, `"스킬 개선해줘"` (6+ keywords)
  - Brainstorm-mode: `"어떻게 하면"`, `"방법 찾자"`, `"아이디어"` (10+ keywords)

**Action:**
- Detect matching triggers in stdin (user prompt text)
- Build system-reminder injection with matched skill names + trigger phrases + rule justification
- Set autonomous-active marker file (`~/.cache/kzk-harness/autonomous-active`) on autonomous mode trigger
- Clear marker on halt keyword detection
- Return JSON `{ "decision": "pass", "reminder": {...} }` or block if needed

**Enforcement layer:** Feeds `system-reminder` to main context; no file mutation.

#### Hook 2: `install/hooks/autonomous-stop-guard.mjs`

**Event:** `Stop`

**Trigger Pattern:**
- Monitor `autonomous-active` marker file (set by keyword-detector)
- Check for blocking conditions: `TodoWrite` tool calls pending OR user-queue entries exist

**Action:**
- If marker active + blocking conditions found → BLOCK stop (3-escape-hatch limit + TTL decay)
- Emit warning: "Autonomous mode active and queue/todos pending. Use `KZK_SKIP_STOP_GUARD=1` (3× max) to force-exit."
- Escape hatch TTL: each force-exit increments counter; resets after 4 hours idle

**Enforcement layer:** Blocks session exit; prevents mid-loop abandonment.

#### Hook 3: `install/hooks/edit-read-guard.mjs`

**Event:** `PreToolUse (Edit/Write only)`

**Trigger Pattern (Plan F):**
- Inspect Edit/Write tool calls
- Query in-memory read-log: "Has this file been Read in this session?"
- File extensions monitored: `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.md`, `.html`, `.css`, `.json`, `.yaml`, `.yml`

**Action:**
- Read-log miss → BLOCK Edit/Write call
- Inject help text: "File not read yet. Use `Read` tool first, then `Edit`."
- Bypass token support: `KZK_EDIT_BYPASS=1` allows 1 override per session (tracks bypass count)
- Success path: Re-Read before proceeding

**Enforcement layer:** 100% guarantee that main never edits unseen code; improves string-replace accuracy.

#### Hook 4: `install/hooks/edit-failure-retry.mjs`

**Event:** `PostToolUse (Edit/Write only)`

**Trigger Pattern:**
- Detect Edit/Write failure (tool returns error)
- Errors matched: `"String to replace not found"`, `"File has been modified since read"`, `"Invalid offset"`, permission errors

**Action:**
- Force single retry in **same turn** (no user prompt in between)
- Trigger automatic Re-Read of target file before retry
- Bypass 2 consecutive failures → `Q-TOOL` user-queue entry + halt
- Log retry attempt + result

**Enforcement layer:** Handles transient edit conflicts (file modified, cache stale); avoids context wasted on manual retry loops.

#### Hook 5: `install/hooks/fix-scope-trigger.mjs`

**Event:** `UserPromptSubmit`

**Trigger Keywords:**
- Fix-intent: `"fix 시작"`, `"버그 수정"`, `"에러 fix"`, `"regression fix"`, `"버그 수정 시작"`

**Action:**
- Detect fix-start keyword in user prompt
- Run CRG `detect-changes` query OR grep fallback (`git diff HEAD~1 --name-only`)
- Collect affected file list + scope (LoC change estimate)
- Append JSON entry to `.kzk-harness/fix-scope-cache.jsonl`: `{ ts, keyword, files, scope_estimate }`
- Result cached for Gate 4.5 validation (staged diff vs cache mismatch = BLOCK)

**Enforcement layer:** Captures fix scope at intent time; enables later gate to verify scope wasn't silently expanded mid-fix.

**Status:** Default OFF — enabled via `pre-merge-sync step 3` only.

#### Hook 6: `install/hooks/freshness-guard.mjs`

**Event:** `PostToolUse (Edit/Write)`

**Trigger Pattern:**
- Monitor Edit/Write completion
- Query CRG symbol reverseRefs: "Are changed symbols mentioned in AGENTS.md / CLAUDE.md / spec line-refs?"
- Recursion guard: track in-progress auto-fixes to prevent infinite cycles

**Action:**
- Stale metadata detected → auto-dispatch fix (inline or separate turn):
  - AGENTS.md row update (function → symbol map)
  - CLAUDE.md section update (section changed → bump last-updated footer)
  - Spec line-ref update (moved function → update :N line reference)
- Log auto-fix attempts + result
- Recursion limit: 2 cycles max per original Edit/Write

**Enforcement layer:** Keeps documentation in sync with code without manual intervention; prevents broken cross-refs in freezing.

#### Hook 7: `install/hooks/regression-recall.mjs`

**Event:** `UserPromptSubmit`

**Trigger Keywords:**
- Fix-start: `"fix 시작"`, `"버그 수정"`, `"과거 fix 조회"`

**Action:**
- Detect fix-start keyword
- Query gstack `/learn` JSONL database (if available) + local sidecar `.kzk-harness/regression-meta.jsonl`
- Retrieve past fixes matching current bug class (confidence × 0.85^dismiss_count decay)
- Inject top 3–5 hits as `[REGRESSION RECALL]` system-reminder
- Sidecar tracks: `dismiss_count` (user rejected recall), `stale` (old code path), `archived` (closed issue)

**Enforcement layer:** Prevents repeated fixes to similar issues; confidence decay prevents stale recall.

**Status:** Default OFF — enabled via `install-global.sh --regression-recall` only.

#### Hook 8: `install/hooks/dispatcher.mjs`

**Event:** (Library — not a hook itself)

**Role:**
- Imported by other hooks (keyword-detector, autonomous-stop-guard, fix-scope-trigger, etc.)
- Provides utility functions:
  - `emitDecision(decision, reason)` — JSON output format for hook responses
  - `readLogQuery(file)` — check if file was Read in session
  - `getCRGStatus()` — query code-review-graph availability
  - `readJSONLFile(path)` — sidecar file R/W for cache
  - Marker file management (set/clear `autonomous-active`)

**Enforcement layer:** Shared infrastructure; no direct enforcement.

#### Hook 9 (Project-only): `.claude/hooks/check-skill-flow-fresh.mjs`

**Event:** `PreToolUse (Bash) — git commit filter`

**Trigger Pattern:**
- Monitor `git commit` command
- Compute SoT fingerprint: SHA-256 of all `skills/*/SKILL.md` + `harness-share.md` + `CLAUDE.md` (sorted order)
- Compare to HTML `<!-- KZK_SKILL_FLOW_FINGERPRINT: ... -->` comment

**Action:**
- Fingerprint match → PASS commit
- Mismatch → BLOCK with guidance: "`docs/skill-flow.html` is stale. Run `node .claude/hooks/check-skill-flow-fresh.mjs --regen` to update."
- Environment override: `KZK_SKILL_FLOW_SKIP=1` allows 1 skip + auto-logs `Q-SKILL-FLOW-STALE` to user-queue

**Enforcement layer:** Ensures HTML docs never lag behind SKILL.md / harness-share.md during merges; prevents documentation lies in the repo.

---

## 7. Summary & Recommendations

### 7.1 Migration Scope

- **Files to move: 8** (6 specs, 2 plans)
- **Files to edit for citations: 18** (36 total replacements)
- **HTML flowchart blocks to convert: 2** (LR → TD)
- **Skill content translations: 18 blurbs + ~120 triggers**
- **Hook documentation expansion: 8 hooks + 1 project hook (3–5 bullets each)**
- **Autonomous-boundary new section: 1** (pre-dispatch survey rule)

### 7.2 Execution Order

1. **Pre-move citation updates** (in source docs before moving):
   - Update 2 citations in files moving to `docs/plans/`
   - Update 1 citation in `docs/superpowers/specs/2026-05-05-brainstorm-flow-freshness-guard-design.md`

2. **File moves** (8 files):
   - `git mv docs/superpowers/specs/*.md → docs/plans/`
   - `git mv docs/superpowers/plans/*.md → docs/plans/` (with `-plan` suffix)

3. **Post-move citation updates** (18 files, ~36 replacements):
   - Prioritize: harness-share.md, CLAUDE.md, SKILL.md, keyword-detector.mjs
   - Then: survey files, plan files
   - Finally: historical progress logs

4. **HTML updates**:
   - Convert 2 flowchart blocks (LR → TD)
   - Regenerate fingerprint

5. **Skill content translation** (optional, executor-phase):
   - 18 blurbs → English
   - ~120 Korean trigger keywords → English equivalents (keep English technical terms)

6. **Hook documentation** (optional, executor-phase):
   - Expand each hook in HTML §9 with 3–5 bullets from source analysis

7. **Autonomous-boundary insertion** (optional, lifecycle-phase):
   - Add pre-dispatch survey rule section at end of kzk-autonomous-boundary/SKILL.md

---

End of survey.

