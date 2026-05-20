# Task-Level Dispatch Shape & Plan Size Policy — Design

> Status: **FROZEN** (Cycle 5 codex review PASS, 0 BLOCKER + final NIT resolved). Awaiting user review gate.
> Date: 2026-05-20
> Topic: sonnet executor plan-fidelity gap → task-level dispatch shape + plan size policy
> Authoritative source after freeze: `harness-share.md §4` (mirrors the kzk-large-task-delegation skill update). On conflict, `harness-share.md` wins.
> Related skills: `kzk-large-task-delegation` (target), `kzk-spec-and-review` (procedure), `kzk-autonomous-boundary` (ralph trigger), `kzk-test-coverage` (boilerplate touch), `kzk-codebase-survey` (Step 0 done)
> Branch contract: main 직접 commit, PR 불요 (사용자 명시 2026-05-20)
> Pending user-queue entries (autonomous cycle 2 retreats): `Q-DESIGN-BOILERPLATE`, `Q-DESIGN-WAVE`

## 1. Background — Problem statement

**Symptom (user-reported)**: sonnet executor 가 large plan 을 dispatch 받은 후, plan 의 task 경계를 그대로 따르지 않고 즉흥 판단으로 인접 코드 정리 / 추가 task 수행 / scope 확장하는 사례.

**Hypothesis (initially user)**: plan 파일이 너무 커서 sonnet context 압박 + dispatch prompt 가 plan 의 어느 부분이 이 task 인지 못 짚게 한다.

**Goal**: sonnet executor 가 dispatch 받은 task 만 atomic 하게 수행하고, 인접 즉흥 X. 큰 plan 도 task 단위 wave dispatch 로 안정.

## 2. Audit findings

두 차례 EXPLORER subagent dispatch (kzk-codebase-survey 패턴) 로 다음 확인:

### 2.1 OMC autopilot prior art (`oh-my-claudecode:autopilot`)

- Plan 파일 자체는 큼 (635 ~ 3,031 라인 정상).
- **Dispatch 패턴**: main (sonnet orchestrator) 가 plan file 한 번 read → independent task 식별 → 각 task 를 separate executor 에 task-specific prompt 로 dispatch (`prompts.ts:223-230`).
- Plan 전체 인라인 X — file path reference 만 (`prompts.ts:212-217`).
- Multi-dispatch 방식: 전체 plan 을 wave 로 안 쪼갬. 대신 task-level parallelism (independent task 들을 한 `Agent()` 묶음에서 병렬 dispatch). Wave 단위는 main 의 자율 판단.

### 2.2 OMC executor.md (의존성 검증 — Cycle 1 codex finding)

- `agents/executor.md:21-30 Success_Criteria, :55-70 Tool_Usage, :95-104 Failure_Modes_To_Avoid` 본문 확인.
- **확인된 사실**: OMC executor.md 는 **kzk-required boilerplate 를 보유하지 않음**. 구체적으로 다음이 부재:
  - kzk-test-coverage TDD strict (Layer b, Q-TDD-MAIN 등)
  - production-code-first (Plan E) literal rule
  - code-quality-discipline literal rule (harness-share.md §32)
  - anti-self-verification literal block (Q-COMPLETION-SELF-VERIFY)
- 결과: "OMC agent 정의에서 guardrail 상속" 정책은 적용 불가. **모든 kzk-required boilerplate 는 dispatch prompt 에 인라인 의무** (Cycle 2 retreat — Q-DESIGN-BOILERPLATE).

### 2.3 우리 kzk-large-task-delegation 의 현 상태

- `SKILL.md:103`: "Plan authoring | oh-my-claudecode:planner / architect | opus" — planner 존재.
- `SKILL.md:220-235`: dispatch 시 required 9개 element 명시 (scope, plan path, required reading, Rules block, TDD, boilerplate, context7, branch-contract check, pre-commit gate, DO-NOT-MODIFY paths 등). 이 본문은 본 design 의 §Task-level dispatch shape 가 **확장**하며, 기존 9개 element 의무는 그대로 유지.
- `SKILL.md:252`: "Typical prompt = 60–150 lines for opus, 100–220 lines for sonnet." — 표현 모호. 본 design 에서 "task dispatch prompt 길이" 임을 명확화.
- `SKILL.md:291`: parallel dispatch 시 `run_in_background: true` 명시. 본 design §Multi-dispatch wave shape 가 이 패턴을 그대로 따름 (background dispatch + 자동 notification → wave 합류).

### 2.4 gridless plan 파일 크기 분포 (현실 사례)

| Plan | Lines | KB | Tasks |
|---|---|---|---|
| `2026-05-12-grid-lock-phase-2-plan.md` | 3,031 | 125 | 20 (Groups A–I) |
| `2026-05-12-grid-lock-phase-1-plan.md` | 2,596 | 101 | multi-group |
| `2026-05-07-csv-roundtrip-plan.md` | 2,485 | 92 | multi-stage |
| `2026-05-08-import-on-gridlist-plan.md` | 2,366 | 83 | multi-task |
| `2026-05-12-grid-lock-phase-4-plan.md` | 2,096 | 90 | — |

`SKILL.md:252` 의 "100–220 라인" budget 대비 phase-2 = **150배 초과**. 단일 task A-1 만 인라인해도 87줄 (test) + 63줄 (DTO) = 150라인 → boilerplate / scope 들어가기 전 이미 budget 초과.

### 2.5 갭 진단 (재해석)

- "100–220 라인" 의 실제 의미: **task dispatch prompt 길이 한계**, plan 전체 길이가 아님. 본문 표현이 모호해서 main 이 plan 전체를 prompt 에 욱여넣는 실수 가능.
- Plan 자체 크기는 문제 아님 (autopilot 도 3k 라인 plan 받음). 본질은 **dispatch shape** = task body 만 인라인 + plan path reference + kzk-required boilerplate 전부 인라인 (cycle 2 정정).

## 3. Design decisions (clarifying Q&A + cycle 2 retreats)

| 결정 변수 | 최종 (cycle 2) | 원래 (cycle 1) | Cycle 2 변경 사유 |
|---|---|---|---|
| Scope | Dispatch + plan size policy | 동일 | — |
| Atomicity | Soft ≤150 라인 + atomic deliverable + **hard trigger: >150 lines 시 writer must include explicit `## Split rationale` + reviewer ACK before dispatch** | Soft 라인만 (≤150) + atomic deliverable | Codex P1: advisory only 는 행동 변화 부족 |
| Wave 식별 | **Plan `## Dependencies` 의무 (parallel wave 가 있는 모든 plan)** + 누락 시 file-disjoint heuristic fallback 은 legacy plan 전용, 불확실 시 conservative sequential | Hybrid (권장 + main fallback 자율) | Codex P2: file-disjoint 가 semantic dependency race 무시 |
| Boilerplate inlining | **Defensive: all kzk-required boilerplate inlined per dispatch.** Agent 정의 의존은 OMC executor.md 자체 Tool_Usage / Failure_Modes_To_Avoid (일반 도구 사용법) 만 | Hybrid (agent 정의 의존 + kzk-specific 인라인) | Codex B1: OMC executor.md 가 kzk-required boilerplate 부재 — 자동 의존 불가 |
| Migration | 기존 plan grandfather (retro 적용 X) + 새 plan 부터 `## Dependencies` 의무 (parallel wave 시) | 동일 | — |
| Plan size policy | 자체 cap 없음 + 50+ task / 5k+ 라인 / 9+ Group 시 phase split 권장 | 동일 | — |

**Cycle 2 retreats are recorded in `docs/harness/user-queue.md` as Pending entries** (Q-DESIGN-BOILERPLATE, Q-DESIGN-WAVE) — user post-hoc decision 가능.

Brainstorm Step -1 evidence: clarifying 4단계 Q&A (scope / atomicity / wave / boilerplate) + approach 선택 + cycle 2 codex retreat. Skip 조건 (trivial + pre-specified + no-new-capability) 미충족 — capability 추가 → brainstorming 정상 수행.

## 4. Architecture — 변경 대상

| 파일 | 변경 종류 | 추정 라인 추가 |
|---|---|---|
| `skills/kzk-large-task-delegation/SKILL.md` | 신설 섹션 3개 + 기존 §Anti-self-verification / §Code-quality-discipline / §Production-code-first boilerplate 본문 보존 + 표현 수정 1줄 + frontmatter version bump | ~170 |
| `harness-share.md` §4 | SKILL.md 본문 mirror | ~170 |
| `harness-share.md` §2 (Plan E production code-first) | "kzk-large-task-delegation §Task-level dispatch shape 가 dispatch prompt anatomy 의 정식 위치" cross-ref 1줄 추가 | ~2 |
| `harness-share.md` §32 (Code Quality Discipline) | "kzk-large-task-delegation §Task-level dispatch shape 가 dispatch anatomy 의 canonical reference" cross-ref 1줄 추가 | ~2 |
| `harness-share.md` §11.1 (Anti-Self-Verification) | dispatch anatomy 의 §Task-level dispatch shape 인용 1줄 | ~2 |
| `docs/site/skill-flow.html` | 카드 update + workflow 다이어그램 wave 노드 + fingerprint regen | ~40 |
| `docs/site/skill-flow.ko.html` | 한글판 동기화 (convention-only, no fingerprint hook) | ~40 |
| `CLAUDE.md` (this repo) | Self-trigger matrix 1줄 추가 ("Plan 큰 경우 = task-level wave dispatch") | ~2 |
| `install/test/skill-text-checks.sh` | grep expectations update (boilerplate 섹션 이름 / 본문 안정성 확인) | ~10 |
| `README.md` | skills count 동일, 본문 변경 없음 예상 | 0 |
| `~/.claude/CLAUDE.md` (global mirror) | manual 편집 X — install 시점 propagate | 0 |

### SKILL.md / harness-share.md §4 본문 추가 layout

```
§Model routing (기존, 유지)
§Read-heavy audit dispatch shape (기존, 유지)
§Subagent prompt requirements (기존 SKILL.md:220-235, 유지 — 9개 mandatory element 보존)

§Task-level dispatch shape (신설) ← NEW
   ├ Plan reference policy (path only, no full inline)
   ├ Dispatch prompt anatomy (full 9-element checklist + task body + all boilerplate inlined)
   ├ Per-task line guide (≤120 soft + hard trigger over)
   └ Example dispatch prompt (전체 인라인 sample)

§Multi-dispatch wave shape (신설) ← NEW
   ├ Plan `## Dependencies` 의무 (parallel wave 있는 모든 plan)
   ├ Legacy plan fallback (conservative sequential)
   ├ Wave dispatch (parallel within via `run_in_background: true`, sequential across)
   └ Wave 결과 합류 + reviewer subagent 검토 후 다음 wave

§Plan size policy (신설) ← NEW
   ├ Plan file 자체 line cap 없음
   ├ Per-task atomicity 의무 + hard trigger
   ├ Phase split 권장 threshold (50+ task / 5k+ 라인 / 9+ Group)
   └ Migration: 기존 grandfather, 새 plan 부터 `## Dependencies` 의무 (parallel wave 시)

§Anti-self-verification boilerplate (보존, 본문 유지)
§Code-quality-discipline boilerplate (보존, 본문 유지)
§Production-code-first boilerplate (보존, 본문 유지)

SKILL.md:252 표현 수정 ← CHANGE
   └ "100–220 라인" = task dispatch prompt 길이 임을 명시 (plan 전체 X)
```

**중요**: 기존 §Anti-self-verification / §Code-quality-discipline / §Production-code-first boilerplate 섹션 **본문은 그대로 유지**. Cycle 2 정정으로 "agent 정의 의존" 정책 폐기 → 기존 인라인 의무 변동 없음. 신설 §Task-level dispatch shape 가 이 세 boilerplate 모두 dispatch prompt 안에 포함되도록 anatomy template 에 명시.

## 5. Components — 신설 섹션 본문 detail

### 5.1 §Task-level dispatch shape

**Plan reference policy**

- Dispatch prompt 안에 plan 파일 path 만 references 로 넘김.
- Full plan 본문 인라인 금지 (3k 라인 plan 도 path 1줄로 끝).
- Required reading 형식:
  ```
  Required reading:
  - /abs/path/plan.md §Group A.1 (lines 64–150)
  - /abs/path/spec.md §<section> (if relevant)
  ```

**Dispatch prompt anatomy** (sonnet executor 기준 — must include all existing Subagent prompt requirements from SKILL.md:220-235 plus the literal boilerplate text)

**Literal block extraction rule** (cycle 3 N1 fix): when the template below references "literal block from §X", copy ONLY the fenced code block content from that section. Do NOT include the surrounding meta-prose (e.g., "auto-inject..." explanations). The fenced rule body is the contract; the prose is documentation.

```
You are oh-my-claudecode:executor for kzk-harness <project>.

## Task
Execute task <task-id> from plan.

## Required reading
- /abs/path/to/plan.md §<section> (lines N1–N2)
- /abs/path/to/spec.md §<section> (if relevant)
- /abs/path/to/<touched-file>.ts

## Scope
Files you may touch: <explicit list, no glob>
Files you may read but not edit: <list>
DO-NOT-MODIFY paths: <list per kzk convention>

## Branch contract verification
Before any edit, run `git branch --show-current` and verify the branch matches
the session contract (locked by kzk-autonomous-boundary). If branch is `main`,
direct-main flow must have been explicitly authorized this session.

## Task body (inlined excerpt from plan §<section>)
<task body, ≤120 lines soft cap; hard trigger if exceeded — see §Plan size policy>

## Rules block — kzk-required boilerplate (LITERAL, all inlined every dispatch)

### Anti-self-verification (from §Anti-self-verification boilerplate)
<literal block from skills/kzk-large-task-delegation/SKILL.md §Anti-self-verification boilerplate>

### Production-code-first (from §Production-code-first boilerplate)
<literal block from skills/kzk-large-task-delegation/SKILL.md §Production-code-first boilerplate>

### Code-quality-discipline (from §Code-quality-discipline boilerplate)
<literal block from skills/kzk-large-task-delegation/SKILL.md §Code-quality-discipline boilerplate>

### TDD strict
- Red→Green→Refactor mandatory (per kzk-test-coverage).
- Failing test BEFORE implementation is non-negotiable in autonomous mode.
- Touched-file 100% line+branch coverage (per kzk-test-coverage).

### Plan reference policy (task scope discipline)
- Execute ONLY the task body above. Do not touch adjacent tasks even if they
  look related. If you find scope ambiguity, STOP and return findings.

### Halt conditions
- If blocked / scope creep needed / plan ambiguous → STOP and return findings;
  do not improvise.

### External library / API usage
- context7 mandate: before implementing with any external library/framework/SDK,
  fetch current docs via context7 MCP. Don't rely on training data.

### Pre-commit gate
- Final commit must pass kzk-pre-commit-gate (Gate 0 AGENTS.md sync if applicable,
  Gate 0.5 freshness, Gate 1.5 secrets, etc. per skill body).

### Race-condition awareness
- File scopes vs other parallel subagents in this wave: <list of sibling wave tasks>

### Regression-recall (cycle 4 B2'' fix — invocation aligned to gstack/learn SoT)
- If this dispatch is a fix-start (per kzk-regression-memory trigger keywords),
  recall prior regression entries before drafting the test/impl. Use the
  `gstack:learn` skill via `Skill("gstack:learn")` and follow its `search`
  flow (per `~/.claude/skills/gstack/learn/SKILL.md:690-692`), or run the
  CLI binary `gstack-learnings-search --query "<query>"` if available (per
  SoT `~/.claude/skills/gstack/learn/SKILL.md:718` — `--query` flag 의무).
  Inline any non-dismissed entries with confidence ≥ 0.6 here as context.
  Cite recall result file paths.

### CRG refresh (cycle 4 P1'' fix — relaxed to session-level + Gate 0.5 gating)
- Per-dispatch CRG refresh is NOT required. Default is session-level: main
  refreshes CRG once per session before the first plan-touching dispatch
  (via `code-review-graph update`, build fallback if `update` unavailable).
- If kzk-pre-commit-gate Gate 0.5 freshness check is gating the commit at
  cycle end, executor's wave-completion subagent (not per-task executor)
  runs `code-review-graph update` before re-attempting commit.
- **Mid-cycle re-refresh (cycle 5 N2''' fix)**: 새 commit 이 cycle 중간에
  들어가고 그 후에 plan-touching CRG usage 가 더 있으면 (예: 다음 wave 가
  같은 영역 read), 그 사용 시점에 main 이 `code-review-graph update` 1회
  추가 호출. 즉 "session-level 1회" 는 floor, "code-touch 후 cache-invalidation
  필요 시점" 은 추가 refresh trigger. 이는 kzk-codebase-survey 의 cache-
  invalidation 의미와 일관.
- See `~/.claude/skills/kzk-codebase-survey/SKILL.md:55-67` for the SoT
  refresh contract.

### Commit convention (cycle 3 B2' fix)
- DO NOT add Co-Authored-By trailers (global ~/.claude/CLAUDE.md mandate).
- Use HEREDOC for commit messages with multiple lines.
- Pass commit message via `git commit -m "$(cat <<'EOF' ... EOF)"`.

## Output contract
Concise execution summary <100 words: what changed, files touched,
verification status (test ran? coverage met?), blockers. No long logs inline.
```

**Per-task line guide (soft + hard trigger)**

- **Soft trigger**: task body ≤120 라인 권장 (cycle 3 B1' fix — was 150; lowered so anatomy total + body stays within sonnet 100–220 prompt budget). 초과 시 writer 의 자가검토 trigger. codex Step 2 review NIT 지적 가능.
- **Hard trigger**: task body > 120 라인 시 plan 작성자는 그 task 안에 `## Split rationale` 단락 명시 + reviewer subagent (opus) ACK before dispatch. Reviewer ACK 없으면 dispatch 금지.
- **Hotfix bypass (cycle 3 P2' fix; cycle 4 N2'' format pinned)**: `HOTFIX_ACK_DEFER=1` env var + 사용자 explicit approval (this session) = reviewer ACK defer 가능. 단, post-fix reviewer backfill 의무 (다음 cycle 안에 dispatched task 의 retroactive review) + `docs/harness/user-queue.md` 에 `Q-HOTFIX-ACK-DEFER` entry 의무. **Queue 삽입 형식**: 새 `## Pending — Q-HOTFIX-ACK-DEFER (<ISO timestamp>)` heading 으로 append (기존 `## Pending — Q-TOOL-EDIT-RETRY-EXHAUSTED` 패턴 동일). 본문 필드: `- Task id: <id>`, `- Defer time: <timestamp>`, `- Backfill deadline: <within next cycle>`, `- User approval quote: "<≤1 sentence>"`.
- Atomic deliverable 의무 변동 없음 (PR-sized commit + 단일 RED→GREEN→REFACTOR).

### 5.2 §Multi-dispatch wave shape

**Wave 식별 정책 (cycle 2 정정 — dependency declaration mandatory)**

- Plan 본문에 parallel wave 가 있으면 **`## Dependencies` 섹션 의무** (canonical heading). `## Execution waves` 는 optional supplement (visualization 용도).
- 누락된 plan = **legacy fallback**: conservative sequential 만 (자동 parallelism 금지). file-disjoint heuristic 은 적용하지 않음.
- 새 plan 작성 시 `## Dependencies` 형식 의무 — writer 가 의존성 명시.

**권장 plan 본문 형식 (필수)**

```markdown
## Dependencies

- Group A (DTOs) → Group B (Service) — B reads A.
- Group B (Service) → Group C (Controller) — C reads B.
- Group D (cleanup) ∥ Group A, B, C — independent.

## Execution waves

- Wave 1: Group A.1, A.2, D.1, D.2 (parallel-safe per `## Dependencies`)
- Wave 2: Group B.1, B.2, B.3 (depends on Wave 1)
- Wave 3: Group C.1, C.2 (depends on Wave 2)
```

**Semantic-dependency note**: file-disjoint != semantic-disjoint. Shared types, contracts, test fixtures may produce races even when file lists are disjoint. Writer must reason about these and declare in `## Dependencies`.

**Wave dispatch 절차**

1. Main 이 plan 전체 read (한 번).
2. Wave 1 의 모든 task 를 fresh subagent 로 병렬 dispatch (`Agent()` calls in single message, `run_in_background: true` per existing SKILL.md:291 + harness-share.md:381 parallel-dispatch rule).
3. 모든 wave 1 task 완료 알림 자동 수신 (harness 가 background completion notification 보냄 — sleep 금지).
4. Wave 1 결과를 fresh reviewer subagent 로 합류 검토 (`oh-my-claudecode:code-reviewer` 또는 `verifier`, opus).
5. Reviewer PASS → wave 2 dispatch / FAIL → 해당 task 재 dispatch (다른 fresh subagent).
6. 모든 wave 완료까지 반복.

**Wave 사이즈 가이드**

- 한 wave 에 최대 5 parallel task 권장 (kzk operational empirical: 5 초과 시 wave 합류 검토 단계의 reviewer subagent context 부담 + rate limit 변동성 증가 관찰).
- 5 초과 시 자동으로 다음 wave 로 split (task drop 아님).
- Hard cap 아님 — 충분한 reviewer context budget 이 있고 wave 의 task 들이 의미적으로 같은 deliverable 이면 5 초과 OK.

**Three-stage review 와의 관계**

- 기존 §Three-stage review (executor → critic → verifier) 는 task-단위 적용 유지.
- §Multi-dispatch wave shape 의 "wave 결과 합류 검토" 는 wave-단위 추가 합류 검토 — task 단위 critic/verifier 위 단계.
- 즉 task 단위 검토 PASS → wave 단위 합류 검토 PASS → 다음 wave.

### 5.3 §Plan size policy

**Plan file 자체 크기**

- Line cap 없음 (gridless `grid-lock-phase-2-plan.md` 3,031 라인 정상).
- Plan 은 phase 단위 분리 가능 (`grid-lock phase 1–4` 처럼 `2026-05-12-grid-lock-phase-{1,2,3,4}-plan.md`).

**Per-task atomicity (의무 + hard trigger)**

- 한 task = 한 PR-sized commit.
- 한 task = 단일 RED→GREEN→REFACTOR.
- Task body soft cap = ≤120 라인 (cycle 3 B1' fix — was 150). 초과 시 hard trigger: `## Split rationale` 단락 + reviewer subagent (opus) ACK before dispatch (§5.1 per-task line guide 참조).

**Phase split 권장 threshold**

- 50+ task / 5,000+ 라인 / 9+ Group 단위 → phase 분리 권장 (gridless 패턴).
- Phase 간 의존 plan 상단에 명시:
  ```markdown
  ## Phase dependencies
  - Phase 2 depends on Phase 1 §Group H (RDG-WS contract frozen).
  - Phase 3 depends on Phase 2 §Group I (acceptance verification).
  ```

**Cross-phase dependency 표기 (gridless reference)**

- `2026-05-12-grid-lock-phase-2-plan.md` 의 phase-1 reference: "Phase 2 picks up after Phase 1 §Group H freezes the RDG-WS contract."
- 본 정책 적용 시 plan 작성자가 이 형식 사용 권장 (의무 X — cross-phase 는 plan 외부 의존).

**Migration 정책**

- 기존 plan retro 적용 X (grandfather).
- 새 plan 부터 §Multi-dispatch wave shape 의 `## Dependencies` 섹션 의무 (parallel wave 가 있는 모든 plan).
- 기존 plan dispatch 시: `## Dependencies` 부재 → conservative sequential 만 (auto-parallelism 금지). 작성자가 후속 update 시 `## Dependencies` 추가 권장.

**Dependency addendum sidecar (cycle 3 P1' fix)**

기존 frozen plan 본문은 spec-and-review Step 3 PASS 후 immutable 이라 직접 `## Dependencies` 추가가 어려움. 대안: sidecar artifact:

- 위치: `docs/plans/<plan-basename>-dependencies.md` (e.g., `2026-05-12-grid-lock-phase-2-plan-dependencies.md`)
- 본문: 동일 `## Dependencies` + `## Execution waves` 형식 (5.2 권장 형식)
- Frozen plan 자체 unchanged. Sidecar 는 plan owner 가 작성 + reviewer subagent ACK 1회 필요.
- Main dispatch 시: plan path 와 sidecar path 양쪽을 Required reading 에 inclusion.
- Plan 본문에 직접 `## Dependencies` 가 있으면 sidecar 우선순위 X (plan 자체가 source of truth).
- **Conflict 처리 (cycle 4 N1'' fix)**: plan body 와 sidecar body 모두에 `## Dependencies` 가 존재하고 disagree 할 때, main 은 sidecar 를 무시하고 plan 본문만 사용. 동시에 `docs/harness/user-queue.md` 에 `Q-SIDECAR-DRIFT` Pending entry 등록 — plan owner 가 cleanup (sidecar 삭제 또는 plan body update) 결정 필요. Sidecar drift 상태에서는 parallel wave 인가 X (보수적 sequential).

## 6. Boilerplate inlining 정책 (cycle 2 정정 — Defensive)

| Guardrail | 위치 | 비고 |
|---|---|---|
| Tool_Usage 일반 (Bash/Read/Edit 표준 사용법) | Agent 정의 (`oh-my-claudecode:executor`) | OMC 가 보유 — 재인라인 X |
| Failure_Modes_To_Avoid 일반 (도구 사용 실수) | Agent 정의 | OMC 가 보유 — 재인라인 X |
| **TDD strict (Red→Green→Refactor + 100% coverage)** | Dispatch prompt **인라인 의무** | OMC 에 부재 (cycle 1 codex finding) — kzk-test-coverage 의 본문 |
| **Production-code-first (Plan E)** | Dispatch prompt **인라인 의무** | OMC 에 부재 — `§Production-code-first boilerplate` 본문 literal |
| **Code-quality-discipline (harness-share.md §32)** | Dispatch prompt **인라인 의무** | OMC 에 부재 — `§Code-quality-discipline boilerplate` 본문 literal |
| **Anti-self-verification (Q-COMPLETION-SELF-VERIFY)** | Dispatch prompt **인라인 의무** | OMC 에 부재 — `§Anti-self-verification boilerplate` 본문 literal |
| **Halt conditions** (scope creep / plan ambiguity → STOP) | Dispatch prompt **인라인 의무** | kzk-specific 신설 |
| **Touched-file 100% coverage** | Dispatch prompt **인라인 의무** | `kzk-test-coverage` 기준 |
| **Plan reference policy** (이 task 만, 인접 즉흥 X) | Dispatch prompt **인라인 의무** | 본 정책 신설 |
| **Branch contract verification** | Dispatch prompt **인라인 의무** | kzk-autonomous-boundary §Branch contract |
| **Context7 mandate** | Dispatch prompt **인라인 의무** | harness-share.md context7 정책 |
| **Pre-commit gate** | Dispatch prompt **인라인 의무** | kzk-pre-commit-gate cross-ref |
| **Race-condition awareness** | Dispatch prompt **인라인 의무** | parallel wave 의 sibling task 목록 |
| **Commit convention (Co-Authored-By, HEREDOC)** | Dispatch prompt **인라인 의무** | kzk-harness convention |

기존 SKILL.md `§Anti-self-verification boilerplate` / `§Code-quality-discipline boilerplate` / `§Production-code-first boilerplate` 본문은 **그대로 유지**. 신설 §Task-level dispatch shape 의 dispatch anatomy template 가 이 세 boilerplate 전체를 dispatch prompt 안에 literal 로 포함하도록 명시.

## 7. Cross-doc sync matrix (expanded — cycle 2)

| 파일 / 위치 | 변경 | 검증 |
|---|---|---|
| `skills/kzk-large-task-delegation/SKILL.md` — 신설 3 + 표현 1 + frontmatter version bump | 본 design 본문 반영 | `kzk-spec-and-review` Step 2 codex review + frontmatter version 1.x.y → 1.x+1.0 |
| `harness-share.md` §4 | SKILL.md mirror | line-by-line diff w/ SKILL.md |
| `harness-share.md` §2 (Plan E production code-first) | 1줄 cross-ref 추가 ("dispatch anatomy 의 canonical 위치는 §4 §Task-level dispatch shape") | grep verification |
| `harness-share.md` §32 (Code Quality Discipline) | 1줄 cross-ref 추가 (동일) | grep verification |
| `harness-share.md` §11.1 (Anti-Self-Verification) | 1줄 cross-ref 추가 (동일) | grep verification |
| `docs/site/skill-flow.html` | 카드 + 다이어그램 + fingerprint regen | pre-commit hook `check-skill-flow-fresh.mjs` (EN only) |
| `docs/site/skill-flow.ko.html` | 한글판 동기화 — **convention-only, no fingerprint hook** — manual parity check 의무 | manual visual diff vs EN |
| `CLAUDE.md` (this repo) | Self-trigger matrix 1줄 추가 | manual review |
| `install/test/skill-text-checks.sh` | grep expectations update (§Anti-self-verification boilerplate / Production-code-first boilerplate / Code-quality-discipline 본문 안정성 + 신설 §Task-level dispatch shape grep target 추가) | local test run: `bash install/test/skill-text-checks.sh` |
| `README.md` | 변경 X (skills count 동일) | grep "18 skills" 확인 |
| `~/.claude/CLAUDE.md` (global) | 변경 X (install propagate) | install/install-global.sh 가 처리 |

**Frontmatter version bump 의무** (CLAUDE.md "Skill Development Rules" 본문 명시): functional change 시 `skills/kzk-large-task-delegation/SKILL.md` frontmatter `version: x.y.z` 한 단계 bump. 본 design 의 신설 3 섹션은 functional change → version 의무.

## 8. Verification scenarios

본 변경 자체 검증:

1. **Skill 본문 self-coherence**: kzk-large-task-delegation 신설 섹션 ↔ 기존 §Anti-self-verification / §Code-quality-discipline / §Production-code-first 사이 contradiction 0개.
2. **Cross-skill consistency**: `kzk-autonomous-boundary`, `kzk-test-coverage`, `kzk-spec-and-review`, `kzk-pre-commit-gate` 가 reference 한 boilerplate ↔ 새 정책 충돌 X.
3. **harness-share.md §4 mirror**: skill 본문과 1:1 일치 (line-by-line diff 권장).
4. **harness-share.md §2 / §32 / §11.1 cross-ref**: 1줄씩 추가된 cross-ref 가 본 design 의 §Task-level dispatch shape 를 정확히 가리키는지 확인.
5. **skill-flow.html fingerprint regen**: pre-commit hook 통과.
6. **install/test/skill-text-checks.sh** grep 안정성 + 신설 grep target 추가 (e.g., `assert_grep "kzk-large-task-delegation Task-level dispatch shape" "Task-level dispatch shape" "$LTD"`).
7. **Codex review (kzk-spec-and-review Step 2)**: cross-vendor 관점 BLOCKER 0개 — cycle 2 codex re-review 의 PASS 조건.
8. **Smoke 시나리오**: 가상의 큰 plan (예: 3k 라인 phase plan) 받았다고 가정, dispatch shape 가 본문 가이드대로 구성 가능한지 main 이 표현 가능 확인.

## 9. Identified risks (codex review tracking)

R1. **Plan `## Dependencies` 의무 syntax 표준화 부재 (cycle 1 카운터 보강)** — 본 문서 §5.2 의 예시 형식이 plan 작성자마다 다르게 적용될 가능성. 의무로 격상되며 syntax variation 허용 명시 + 1개 권장 예시 포함 (§5.2 본문에 이미 반영).

R2. **§Three-stage review 와 §Multi-dispatch wave shape 의 wave 합류 검토 관계** — 본 design §5.2 마지막 단락에서 명시. kzk-large-task-delegation 본문에 반영 시 추가 한 단락 필요 (§5.2 마지막 단락이 이 검증).

R3. **OMC executor.md 의존성 stale (cycle 1 코덱스 finding 으로 실재 확인)** — 본 design 은 cycle 2 정정으로 OMC 의존을 거의 제거 (Tool_Usage / Failure_Modes_To_Avoid 일반만). 그 두 항목도 OMC 가 향후 release 에서 제거하면 우리 본문 stale. 완화책: 향후 OMC version bump 시 spot-check 항목으로 등록 + 본 design 의 §6 표는 OMC 가 보유한 일반 가드레일 의존성 명시.

R4. **Test-contract drift (cycle 1 codex N4)** — boilerplate 섹션 이름 변경 / 본문 변경 시 `install/test/skill-text-checks.sh` 의 grep 기대치 stale. 본 design 은 기존 boilerplate 본문 보존 정책이라 변경 최소. 다만 신설 §Task-level dispatch shape 의 grep target 은 추가 필요. §7 sync matrix 에 install/test 항목 명시. Rollout 단계에서 local test run 의무.

R5. **Hard trigger reviewer ACK 의 비용** (cycle 2 P1 fix 후속 risk) — task body > 120 라인 마다 (cycle 3 B1' fix — was 150) reviewer subagent (opus) ACK 의무화 = reviewer dispatch cost 증가. 완화책: reviewer ACK 는 task body content 만 평가 (전체 plan context 불필요) → opus context 부담 적음. Worst case = wave 당 reviewer 호출 1회 추가. Hotfix bypass 통해 `HOTFIX_ACK_DEFER=1` defer 가능.

R6. **Legacy plan conservative sequential 의 throughput 손실** (cycle 2 P2 fix 후속 risk) — `## Dependencies` 부재 plan = sequential 강제 = throughput 손실. 완화책: 기존 plan migration 시 `## Dependencies` 추가 권장. 완전 sequential 만 = grid-lock phase 2 의 20 task = 20 cycle 순차 (현실적이지 않음). Phase plan 들은 `## Dependencies` 후속 추가 의무.

## 10. Ambiguity clarifications (cycle 2 update)

| 항목 | 명확화 |
|---|---|
| "Soft cap 120 라인" (cycle 3 B1' fix — was 150) | = 작성자 자가검토 trigger + codex Step 2 review NIT 지적 가능. Soft trigger 자체는 hard reject 없음. 단 **>120 lines 시 hard trigger 발동 — `## Split rationale` + reviewer ACK 의무**. Hotfix bypass: `HOTFIX_ACK_DEFER=1` + 사용자 approval + post-fix backfill. |
| "Plan line cap 없음" vs "5k 라인 phase split 권장" | 모순 아님 — plan 파일 자체는 cap 없음, phase 분리는 자율 권장. |
| "Wave 최대 5 parallel" | 5 초과 = 자동 다음 wave 로 split (drop 아님). Hard cap 아님 — reviewer context + rate limit empirical observation 기반. |
| "Plan 본문 `## Dependencies` 섹션" | **의무** (parallel wave 가 있는 plan). 누락 = legacy fallback (conservative sequential 만). |
| "OMC executor agent 가 일반 guardrail 보유" | 검증 결과 (cycle 1 codex): Tool_Usage / Failure_Modes_To_Avoid (일반) 만. **kzk-required boilerplate (TDD strict / production-code-first / code-quality / anti-self-verification) 는 부재 — 전부 dispatch prompt 인라인 의무**. |

## 11. Internal consistency check (self-review)

- §5.1 ↔ §5.3: per-task atomicity 의무 일관 (≤120 soft + hard trigger at 120, PR-sized, 단일 RED→GREEN→REFACTOR) ✓
- §5.2 ↔ §5.3: `## Dependencies` "의무 (parallel wave 시)" 일관 ✓
- §5.1 dispatch anatomy 의 boilerplate 섹션 ↔ §6 inlining 표: 일관 (전부 dispatch 인라인 의무) ✓
- §5.1 의 "context7 mandate / branch contract / pre-commit gate / commit convention" ↔ SKILL.md:220-235 의 9개 mandatory element: 일관 (전부 포함) ✓
- §6 의 OMC 의존 항목 (Tool_Usage / Failure_Modes_To_Avoid 일반) ↔ R3 risk: 일관 (cycle 1 finding 으로 의존 범위 좁힘) ✓
- §7 cross-doc matrix 의 harness-share.md §2 / §32 / §11.1 cross-ref ↔ B2 BLOCKER fix: 일관 (cycle 1 finding 으로 추가) ✓

## 12. Out-of-scope (의도적 제외)

- 기존 plan 파일들 (gridless 3k 라인 plan) 의 `## Dependencies` 섹션 retro 추가 — grandfather (개별 plan owner 가 후속 update 시 권장).
- `superpowers:writing-plans` skill 본문 변경 — scope 결정 시 user 가 제외.
- OMC `executor.md` PR — 별 cycle (cycle 2 fix 로 OMC 의존 거의 제거 → urgency 낮음).
- `oh-my-claudecode:planner` skill 출력 형식 audit — 별 cycle.

## 13. Decisions log (clarifying Q&A trace + cycle 2 retreats)

본 design 으로 이어진 4단계 Q&A + cycle 2 codex retreat:

1. **Scope** → Dispatch + plan size policy (planner result audit 제외).
2. **Atomicity** → Soft ≤150 라인 + atomic deliverable + **cycle 2: hard trigger 추가** (P1).
3. **Wave 식별** → 원래 Hybrid → **cycle 2: dependency declaration mandatory** (P2). Q-DESIGN-WAVE pending entry.
4. **Boilerplate inlining** → 원래 Hybrid → **cycle 2: Defensive (all kzk-required inlined)** (B1). Q-DESIGN-BOILERPLATE pending entry.
5. **Approach** → Approach C (Hybrid, 신설 3 + 완화 2 + 표현 1) → **cycle 2: 완화 폐기 (기존 boilerplate 본문 보존)**.
6. **Cycle 2 codex re-review** → 본 design 의 cycle 2 본문 → 다음 cycle.

## 14. References

- `harness-share.md §4` — kzk-large-task-delegation authoritative source (변경 후 mirror)
- `harness-share.md §2` — Plan E production code-first (cross-ref 1줄 추가 대상)
- `harness-share.md §11.1` — Anti-Self-Verification (cross-ref 1줄 추가 대상)
- `harness-share.md §22` — kzk-spec-and-review iterative loop (본 design 의 절차 frame)
- `harness-share.md §32` — Code Quality Discipline (cross-ref 1줄 추가 대상) + kzk-codex-handoff (Step 2 codex consult 의 5 hard rules)
- `harness-share.md §11` — kzk-test-coverage (touched-file 100% 의무, dispatch 인라인 항목)
- `harness-share.md §2 + §33` — kzk-autonomous-boundary (ralph trigger + branch contract + verifier 의무)
- `skills/kzk-large-task-delegation/SKILL.md:103, 220-235, 252, 274, 254, 291` — 변경 대상 본문 위치
- `oh-my-claudecode:autopilot` `prompts.ts:130-160, 201-241` — prior art dispatch pattern
- `oh-my-claudecode:executor` `agents/executor.md:21-30, 55-70, 95-104` — OMC 가 보유한 가드레일 범위 (cycle 1 확인: 일반만)
- gridless: `docs/plans/2026-05-12-grid-lock-phase-{1,2,3,4}-plan.md` — phase split reference 패턴
- `install/test/skill-text-checks.sh:64,65,93,94,95` — boilerplate grep expectations (update 대상)
- `.claude/hooks/check-skill-flow-fresh.mjs:35,51` — EN HTML fingerprint only (KO 는 convention-only)
- `docs/harness/user-queue.md` Pending entries: Q-DESIGN-BOILERPLATE (2026-05-20), Q-DESIGN-WAVE (2026-05-20)

## 15. Next steps

1. **Codex review Cycle 2 (Step 2 재실행)** — 본 cycle 2 본문 codex re-review, 🔴 BLOCKER / 🟡 NIT / ⚪ push-back 분류. PASS 조건: BLOCKER 0 + no structural change.
2. **Pattern loop continuation (Step 3)** — Cycle 2 PASS 면 user review gate. FAIL 면 Cycle 3 (cycle ≥ 5 + BLOCKER 잔존 = HALT + user-queue entry).
3. **User review gate** — Pattern PASS 후 사용자 review 의무. 변경 요청 시 다시 Pattern loop.
4. **Writing-plans (Step 4)** — User approval 후 `superpowers:writing-plans` skill 호출, atomic TDD task plan → `docs/plans/2026-05-20-task-level-dispatch-plan.md`.
5. **Implementation** — kzk-large-task-delegation §Task-level dispatch shape 본 design 의 첫 dogfood. Wave dispatch 로 본 design 자신 implement (10+ file 변경이라 §Multi-dispatch wave shape 의 wave 단위 자가검증 기회).
6. **Cycle-exit 4 sub-check + fresh-agent verifier** — autonomous mode 종료 조건 (kzk-autonomous-boundary §33).

## 16. Cycle 2 changelog (versus cycle 1 draft)

| 변경 | 원인 |
|---|---|
| §3 Decisions log table: atomicity 에 hard trigger 추가 | Codex P1 |
| §3 Decisions log table: wave 식별 = "dependency declaration mandatory" | Codex P2 |
| §3 Decisions log table: boilerplate inlining = "Defensive" | Codex B1 |
| §4 Architecture matrix: harness-share.md §2, §32, §11.1 cross-ref 행 추가; install/test/skill-text-checks.sh 행 추가; frontmatter version bump 명시 | Codex B2, N2, N4 |
| §5.1 dispatch anatomy: 9개 mandatory element (context7, branch contract, pre-commit gate, commit convention 등) 본문에 포함; "Reference (inherited)" 블록 제거; boilerplate 전부 인라인 | Codex B1, B3 |
| §5.1 per-task line guide: hard trigger 본문 추가 | Codex P1 |
| §5.2 wave 식별 정책 본문 재작성: dependency declaration mandatory + legacy fallback conservative sequential | Codex P2 |
| §5.2 wave 절차: `run_in_background: true` 명시 (SKILL.md:291 / harness-share.md:381 일치) | Codex B4 |
| §5.2 wave 사이즈 가이드: `harness-share §12` citation 제거, empirical observation 으로 | Codex N1 |
| §5.3 Plan size policy: hard trigger cross-ref 추가; `## Dependencies` 의무 미러 | Codex P1, P2 |
| §6 Boilerplate inlining 표 재작성: Defensive | Codex B1 |
| §7 Cross-doc sync matrix expansion: harness-share §2, §32, §11.1 / install/test/ / frontmatter version bump / KO HTML convention-only | Codex B2, N2, N3, N4 |
| §9 Risks: R3 update + R4 (test-contract drift) + R5 (hard trigger 비용) + R6 (legacy sequential throughput) | Codex N4, P1, P2 |
| §10 Ambiguity table: Soft + hard trigger 통합; `## Dependencies` 의무 명시; OMC 의존 범위 좁힘 | Codex B1, P1, P2 |
| §13 Decisions log: cycle 2 retreats trace | Tracking |
| `docs/harness/user-queue.md` 신규 Pending entries: Q-DESIGN-BOILERPLATE, Q-DESIGN-WAVE | User post-hoc review 가능 |

## 17. Cycle 3 changelog (versus cycle 2)

| 변경 | 원인 |
|---|---|
| §5.1 task body soft cap 150 → **120**; hard trigger 도 120 으로 이동 | Codex B1' (prompt-size math: 66 scaffold + 22 boilerplate + 150 = 237 > 220 budget) |
| §5.1 anatomy commit convention: "Co-Authored-By trailer" 제거, "DO NOT add Co-Authored-By trailers" 명시 (전역 ~/.claude/CLAUDE.md mandate) | Codex B2' + user 강조 (2026-05-20) |
| §5.1 anatomy 본문 다음 추가: literal block extraction rule (fenced 본문만, prose 제외) | Codex N1' |
| §5.1 anatomy 본문 두 placeholder 추가: Regression-recall (kzk-regression-memory) + CRG refresh (kzk-codebase-survey) | Codex N2' |
| §5.1 per-task line guide: hotfix bypass (`HOTFIX_ACK_DEFER=1` + user approval + post-fix backfill + `Q-HOTFIX-ACK-DEFER` user-queue entry) | Codex P2' |
| §5.3 Migration: Dependency addendum sidecar (`<plan>-dependencies.md`) — frozen plan 본문 unchanged 채로 parallel wave 인가 가능 | Codex P1' |
| §10 Ambiguity table: 150 → 120 update + hotfix bypass 명시 | Mirror cycle 3 B1' / P2' |

## 18. Cycle 4 changelog (versus cycle 3)

| 변경 | 원인 |
|---|---|
| §5.3 per-task atomicity: 150 → 120 (mirror §5.1) | Codex B1'' (propagation incomplete in cycle 3) |
| §9 R5 risk: 150 → 120 (mirror §5.1) | Codex B1'' (propagation incomplete) |
| §11 consistency check: ≤150 → ≤120 | Codex B1'' (propagation incomplete) |
| §5.1 Regression-recall: `gstack /learn search --query=...` → `Skill("gstack:learn")` skill flow 또는 `gstack-learnings-search <query>` CLI (per SoT `~/.claude/skills/gstack/learn/SKILL.md:690-692`) | Codex B2'' (invalid command syntax) |
| §5.1 CRG refresh: per-dispatch `code-review-graph build --since=HEAD` 폐기, session-level + Gate 0.5 gating 모델로 relax (per SoT `~/.claude/skills/kzk-codebase-survey/SKILL.md:66-67`). Default: main 이 first plan dispatch 전에 `code-review-graph update` 1회. Gate 0.5 firing 시 wave-completion subagent 가 refresh | Codex B2'' (invalid `--since=HEAD` flag) + P1'' (per-dispatch 가 too strict) |
| §5.3 Sidecar conflict rule (cycle 4 N1''): plan + sidecar 모두 `## Dependencies` 있고 disagree 시 sidecar 무시 + plan 우선 + `Q-SIDECAR-DRIFT` Pending entry + conservative sequential | Codex N1'' |
| §5.1 Hotfix bypass: `Q-HOTFIX-ACK-DEFER` queue 삽입 형식 명시 (heading + 본문 필드 spec) | Codex N2'' |

## 19. Cycle 5 changelog (versus cycle 4)

| 변경 | 원인 |
|---|---|
| §4 layout sketch: `≤150 soft` → `≤120 soft` (마지막 잔재 정리) | Codex N1''' (cycle 5) |
| §5.1 Regression-recall CLI: `gstack-learnings-search <query>` → `gstack-learnings-search --query "<query>"` (per SoT `~/.claude/skills/gstack/learn/SKILL.md:718`) | Codex B1''' (cycle 5) |
| §5.1 CRG refresh: mid-cycle re-refresh trigger 추가 (새 commit 후 plan-touching CRG usage 시점에 `code-review-graph update`) | Codex N2''' (cycle 5) |
