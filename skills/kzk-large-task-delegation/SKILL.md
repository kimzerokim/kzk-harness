---
name: kzk-large-task-delegation
version: 1.21.0
description: "Large task delegation for 3+ file edits, 200+ LoC, 5+ file reads, or multi-stage workflows. Main = dispatch+review only. Routes to executor (sonnet), critic+verifier (opus). Triggers: '큰 작업', '버그 전수조사', '마무리 해줘', '사이클 자율', 'plan 쪼개', 'Stage 3', 'ralph로 돌려', '끝까지 끝내줘'. References harness-share.md §4."
---

> Authoritative source: `harness-share.md` §4. On conflict, that wins.

# kzk-large-task-delegation

## "Large" — main is forbidden, subagent required

Any one of:

- 3+ files edited simultaneously (refactor, token migration, component rewrite)
- Single commit ≥ 200 LoC change expected
- `@theme` / token / CSS rewrite (`src/styles/**`) or 5+ component simultaneous migration
- Single Plan (any of A-N in `docs/plans/*.md`) full scope
- Build · test · Playwright · code-reviewer multi-stage workflow
- 5+ files needing full read for **verification or audit** (spec ↔ implementation match, bug sweep, existing-system review) — read-only does NOT exempt main from delegation

## Main-context-allowed (trivial / fast / safe)

- Single config-line edit (`~/.claude.json` MCP args, `.mcp.json`, `tsconfig.json` single option)
- Single rule add (CLAUDE.md / DESIGN.md / `harness-flow-progress.md` 1-item)
- Single file ≤ 5 LoC fix (typo, single import line, single variable rename)
- Subagent result review · gate check · commit · push

## Scope estimation (mandatory entry step on non-trivial requests)

The user is often agentic-only — they describe outcomes, not file counts. Threshold rules ("3+ files", "200+ LoC", "5+ file read") are main-context decisions, but main can't decide if it never estimates. **Run a 30-second scope estimate as the first action on any non-trivial request** before any Edit / Write / multi-file Read.

Trivial requests (skip estimation, go direct):

- Single-line config flag (`tsconfig.json` option, env var add)
- Single typo / variable rename in one known file
- Pure question (no edit) about a single file
- Single 1-line README / CLAUDE.md edit the user dictated verbatim

Non-trivial = anything else. Estimate procedure:

1. **`git status --short`** — see what's already in the working tree
2. **Target dir scan** — `find <target-dirs> -type f -name '*.<ext>' | wc -l` for likely-touched modules (use the user's phrasing to guess scope: "auth flow" → `auth/`, `users/`, `sessions/`; "grid bug" → `grid/`, `cell/`, etc.)
3. **CRG quick query if available** — `code-review-graph status` (1s) confirms index exists; if so, `query_graph(pattern="callers_of"|"imports_of", target=<symbol>)` widens scope without re-reading files
4. **LoC rough projection** — likely-touched file count × average LoC change × 0.1-0.3 multiplier (most edits don't rewrite whole files)

Output to user (1-line preamble before first Read/Edit):

```
[scope] est. <N> files / <M> LoC → <main-direct | executor-haiku | executor-sonnet | spec-and-review-first>
```

Routing decision tree:

| Estimate | Route |
|---|---|
| 0-1 file, ≤ 30 LoC, no spec | main-direct (no skill chain needed) |
| 2-3 files, ≤ 200 LoC, mechanical (rename/version/config) | executor-haiku |
| 2-3 files, ≤ 200 LoC, substantive (logic, types, error paths) | executor-sonnet |
| 3+ files OR 200+ LoC OR ambiguous (estimate uncertain by ≥ 2x) | spec-and-review-first → executor dispatch per plan |
| Architecture / security / public-API change | opus plan + codex consult mandatory regardless of size |

User can override the route with one line ("그냥 메인이 직접 해", "haiku 로 진행", "spec 먼저 잡자"). Without override, the agent proceeds per the estimate.

Hard rules even after estimation:

- Estimate says ≤ 30 LoC, but mid-execution main reads 5+ files → halt, restart with EXPLORER subagent (estimate was wrong; respect §Read-heavy audit dispatch shape).
- Estimate says 1-file, but mid-execution scope expands to 3+ files → halt, restart with executor dispatch.
- Re-estimate after every halt; do not silently widen scope under main.

## Read-heavy audit dispatch shape

For verification / audit scenarios (user says "스펙파일 체크해줘", "구현 확인", "버그 전수조사", "spec vs code 매칭", "이거 제대로 구현됐나"):

- Main context **MUST NOT** read 5+ files directly with `Read` — context saturation degrades conclusion quality (the "main reads code weirdly" failure mode).
- Dispatch shape:
  1. `oh-my-claudecode:explore` (`model=sonnet` for survey-style deep reads, `model=haiku` for quick targeted file lookups) — file discovery + Read in subagent context.
  2. `code-review-graph` MCP/CLI (per `kzk-codebase-survey §MCP tool surface`) — `semantic_search_nodes`, `query_graph`, `get_impact_radius` for spec ↔ implementation matching without re-reading every file.
  3. Main synthesizes the EXPLORER report + CRG output into the verification verdict.
- For multi-spec verification (e.g. user asks to check N spec files in a row), each spec is one EXPLORER dispatch — parallel where file scopes are disjoint, sequential where they share files.
- The verdict file goes in `docs/harness/surveys/YYYY-MM-DD-<topic>-verification.md` (per `kzk-codebase-survey §Step 7` report path convention).

This is the read-only counterpart to the implementation dispatch above — same delegation rule, different output (verdict instead of diff).

### Pre-dispatch survey requirement (autonomous mode)

When this skill is invoked inside autonomous mode AND scope estimate indicates multi-file / 5+ file read / 200+ LoC work:

1. Check if a `kzk-codebase-survey` report path is already in the same-turn dispatch context.
2. If not present → dispatch `kzk-codebase-survey` FIRST; halt this skill pending survey completion.
3. After survey saves the report path → proceed to scope estimation + executor dispatch with the report path included as `Required reading:` in the executor prompt.

**Halt entry**: `Q-SURVEY-MISSING` (full text: `kzk-autonomous-boundary §Pre-dispatch survey rule`). Append to `docs/harness/user-queue.md` if survey is absent and skipping would mean main reads 5+ files directly.

**Rationale**: SoT = `kzk-autonomous-boundary §Pre-dispatch survey rule (autonomous mode)`. This subsection mirrors that rule from the delegation side so the dispatch flow naturally enforces it.

## Model routing (mandatory split for subagent dispatch)

Three tiers. Pick by the cost-of-bad-output × token-cost trade-off, not by topic.

| Phase | Subagent type | Model | Cross-check |
|---|---|---|---|
| Plan authoring | `oh-my-claudecode:planner` / `oh-my-claudecode:architect` | **opus** | Mandatory Codex CLI consult on draft plan before freezing (see `kzk-spec-and-review`). For deep requirements elicitation, use `Skill("oh-my-claudecode:deep-interview")` (Skill, not Agent). |
| Critic / code review | `oh-my-claudecode:critic` / `oh-my-claudecode:code-reviewer` | **opus** | Codex CLI parallel review (see `kzk-spec-and-review`) |
| Semantic verify | `oh-my-claudecode:verifier` | **opus** | Codex CLI consult on uncertain assertions |
| Implementation (substantive) | `oh-my-claudecode:executor` | **sonnet** | none — plan must be detailed enough |
| Mechanical implementation | `oh-my-claudecode:executor` | **haiku** | none |
| Quick research / file search | `oh-my-claudecode:explore` | **sonnet** (deep reads) / **haiku** (targeted lookups) | none |

### Tier triggers — when to drop to haiku

Haiku tier (new — Cycle 29) for mechanical work where the change is pattern-application with zero design judgment:

- Version bump (`version: X.Y.Z` → `X.Y+1.0`)
- Frontmatter description rewrite to a frozen template
- Single-line config flag toggle (e.g., `tsconfig.json` single option, env var add)
- Lint / formatter follow-up (typed by linter — 1-line fix)
- Progress log entry append (frozen one-line format)
- Atomic file rename across N files (rename + import path update only, no logic change)
- Trivial test scaffolding when the assertion list is fully spec'd

- Git ops (mechanical): `git status`, `git log`, `git diff`, `git show`, `git stash list`, `git branch`, `git fetch`, `git rev-parse`, `git tag`, `git add <specific-file>`, `git restore <file>`, `git commit -m` (with simple message), fast-forward `git merge`, non-conflict `git cherry-pick <sha>`, `git push` (when contract = PR-flow and no force flag).

Anything where the executor must *infer* what to write (variable name, error message wording, conditional branch logic, type definition shape) → sonnet, not haiku.

**Git ops EXCLUDED from haiku tier (escalate to sonnet/opus):**

- `git rebase -i` (interactive) — semantic decisions on commit history
- Conflict resolution during merge / rebase / cherry-pick
- `git reset --hard` on a pushed branch — destructive, opus + explicit user OK
- `git push --force` / `--force-with-lease` — destructive, opus + explicit user OK
- `git filter-branch` / `git filter-repo` / history rewrite
- Multi-commit message authoring with substance (commit body explanation, breaking-change note)
- `git blame` interpretation (semantic — "why was this written this way") → sonnet
- Branch contract decisions (which branch to commit to, whether to PR) → main, not haiku

Rule of thumb: read-only git inspection + atomic commit/stage/push under PR-flow contract = haiku. Anything that reshapes history, resolves conflicts, or makes a routing decision = sonnet/opus.

### Tier triggers — when to escalate to opus

Default = sonnet. Escalate to opus only when:

- Plan authoring (always)
- Critic on plan / on substantive code diff (always)
- Architecture-changing refactor (DI container, ORM swap, schema migration, public API contract)
- Security / auth / payment / IAM / credential handling code
- Data migration with non-reversible destination
- Spec ambiguity discovered mid-execution (sonnet returns BLOCKED — re-dispatch with opus, root-cause whether plan was insufficient)

Codex CLI consult is mandatory on opus-tier plans + critic. Sonnet-tier dispatches: codex optional. Haiku-tier dispatches: skip codex.

### Opus thinking-level (effort) guidance

Opus dispatches default to **xhigh** effort. Drop to **high** when:

- Plan authoring on a well-scoped extension (≤ 3 known modules, no architecture decision)
- Critic on a small / mechanical diff (≤ 200 LoC, no architecture / security / auth / payment / data-migration implications)
- Verify on pre-spec'd assertions (build green, test list, screenshot count) — not semantic intent

Stay **xhigh** when:

- Plan authoring with ambiguous requirements or new sub-system
- Critic on architecture-changing or security-sensitive code
- Verify on non-trivial spec compliance ("does this actually achieve what the user asked")
- Any time `oh-my-claudecode:critic` returned REVISE on the previous round (signal that more thought is needed, not less)

Session-level effort is set via the Claude Code CLI banner (`Opus 4.7 with xhigh effort`). Drop the banner to `high` for cycles consisting mostly of mechanical work; bump back to `xhigh` before opening a plan / critic dispatch. Sonnet executor and haiku mechanical: thinking is implicit in session default; do not tune separately.

### Default split — target distribution

Typical session: 50% sonnet (executor) + 30% haiku (mechanical) + 20% opus (plan / critic / opus-trigger). Pre-Cycle-29 default was 80% sonnet 20% opus; the haiku tier reclaims the mechanical share.

`model` MUST be specified for **downgrade** dispatches (sonnet, haiku). **Opus-tier dispatches MUST omit `model`** — this inherits the parent (main) agent's exact version, avoiding version mismatch (e.g. main=4.6 but subagent=4.7).

### Code examples (model inheritance rule)

```typescript
// ✅ Implementation — sonnet (explicit downgrade)
Agent({
  subagent_type: 'oh-my-claudecode:executor',
  model: 'sonnet',
  prompt: 'Add useViews hook ...',
});

// ✅ Plan / design — opus (omit model → inherits main's version)
Agent({
  subagent_type: 'oh-my-claudecode:planner',
  prompt: 'Design merge conflict detection algorithm ...',
});

// ✅ Critic / verify — opus (omit model → inherits main's version)
Agent({
  subagent_type: 'oh-my-claudecode:code-reviewer',
  prompt: 'Review diff for SQL safety + RBAC ...',
});

// ✅ Quick lookup — haiku (explicit downgrade)
Agent({
  subagent_type: 'oh-my-claudecode:explore',
  model: 'haiku',
  prompt: 'Locate every reference to <symbol> ...',
});
```

**Rule**: `model="opus"` must NOT be specified — it resolves to the latest opus and causes a version mismatch with main + increased cost. Omitting inherits the parent version.

## Pre-implementation plan-critic loop (opus + codex)

Before dispatching the sonnet executor, the plan must clear this gate exactly once per Plan or per discrete task:

0. **`kzk-codebase-survey`** — EXPLORER agent runs all steps (Step 0.5 + Step 1–8), saves report to `docs/harness/surveys/YYYY-MM-DD-<topic>-survey.md`. Report path passed to planner and critic as required reading. Survey failure → note in report, continue.
1. main authors the plan or dispatches `planner` (opus) — **prompt must include survey report path as required reading**
2. Codex CLI consult on the plan draft (per `kzk-codex-handoff` §Codex CLI 호출 패턴) → returns concerns; CLI unavailable → `oh-my-claudecode:critic` opus
3. main edits plan (or dispatches `oh-my-claudecode:critic` opus) to address concerns — **critic prompt must include:** "Check the plan covers every item in Features to Preserve and Integration Points in the survey report. Any gap = FAIL."
4. on agreement, plan is frozen — written to `docs/plans/<file>.md` with a `## Frozen` header line
5. only frozen plans may feed a sonnet executor dispatch

2 consecutive critic / codex FAILs on the plan → halt + user-queue, no code is written. This is the autonomous-loop halt condition mirroring `kzk-autonomous-boundary`.

## Subagent prompt requirements (fresh subagent has zero memory)

Every dispatch prompt must include:

- Scope (file paths, line ranges)
- Plan file path (which task within) — **frozen plan only when dispatching to sonnet**
- Required reading list (CLAUDE.md, the spec doc, sister files)
- Rules block: TDD sequence (red-green-refactor — see kzk-test-coverage §TDD sequence; failing test BEFORE impl is non-negotiable in autonomous mode) + **include the literal boilerplate text from §Sonnet executor — Anti-self-verification boilerplate verbatim in the Rules block of the dispatch prompt (reference alone is not sufficient — fresh agents do not auto-read SKILL.md)** + context7 mandate + `kzk-pre-commit-gate` (incl. **Gate 0 AGENTS.md sync** — touched-files AGENTS.md goes in the SAME commit) + DO-NOT-MODIFY paths + branch boundary (the session **branch contract** locked by `kzk-autonomous-boundary` — verify the current branch matches the contract via `git branch --show-current` before dispatch; `main` is allowed only if the contract authorized direct-main flow this session)
- Commit message convention (English conventional commits, no Co-Authored-By)
- Working directory absolute path
- Race-condition awareness (file scopes vs other parallel subagents)
- Return format on success
- Halt condition (blocked → user-queue entry)
- **§Code-quality-discipline boilerplate (Plan F)**: auto-inject the dispatch prompt boilerplate from harness-share.md §31 (DRY/YAGNI/KISS + Deletion test + Depth + obsolete test) into the Rules block. Missing = §Three-stage review FAIL.
- **§CRG refresh boilerplate**: at the start of multi-Plan continuation and between each plan, `code-review-graph build`/`update` is mandatory (kzk-autonomous-loop §Multi-plan CRG refresh + kzk-codebase-survey §Step 0.5 (f) cross-ref). Missing = stale CRG risk.

### Sonnet executor — extra plan-detail requirements

When the target dispatch is `model=sonnet`, the plan must spell out — sonnet does not back-fill ambiguity, it either loops or fabricates:

- Exact file paths AND, where the change is mid-file, the anchor line content or stable nearby symbol
- Full function/component signatures with all parameter and return types written out
- Imports list (which symbol comes from which module)
- Edge cases enumerated as a bullet list, each with the expected behavior
- Test names + assertion shape (one bullet per test) — not "write tests for X" but "test name: should disable submit when slug fails regex; assert: button has [disabled]"
- Lint / formatting rules that apply (e.g. "no `any`, narrow with `unknown` + `instanceof Error`")
- "DO NOT" deltas — what changes are NOT permitted in this task
- AGENTS.md row text (since Gate 0 will demand it) — sonnet should land the AGENTS.md edit alongside the new file rather than skipping it

If the plan cannot be made this detailed, the task is not yet ready for sonnet — escalate to opus or run another plan-critic loop.

Typical task dispatch prompt = 60-150 lines for opus, 100-220 lines for sonnet (per §Task-level dispatch shape per-task line guide). This is the prompt sent per task, not the plan file itself — plan files can be thousands of lines (see §Plan size policy). Terse prompt = shallow work.

## §Task-level dispatch shape

### Plan reference policy

- Dispatch prompt 안에 plan 파일 path 만 references 로 넘김.
- Full plan 본문 인라인 금지 (3k 라인 plan 도 path 1줄로 끝).
- Required reading 형식:
  ```
  Required reading:
  - /abs/path/plan.md §Group A.1 (lines 64–150)
  - /abs/path/spec.md §<section> (if relevant)
  ```

### Dispatch prompt anatomy

(sonnet executor 기준 — must include all existing Subagent prompt requirements from SKILL.md:220-235 plus the literal boilerplate text)

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

### Per-task line guide

- **Soft trigger**: task body ≤120 라인 권장 (cycle 3 B1' fix — was 150; lowered so anatomy total + body stays within sonnet 100–220 prompt budget). 초과 시 writer 의 자가검토 trigger. codex Step 2 review NIT 지적 가능.
- **Hard trigger**: task body > 120 라인 시 plan 작성자는 그 task 안에 `## Split rationale` 단락 명시 + reviewer subagent (opus) ACK before dispatch. Reviewer ACK 없으면 dispatch 금지.
- **Hotfix bypass (cycle 3 P2' fix; cycle 4 N2'' format pinned)**: `HOTFIX_ACK_DEFER=1` env var + 사용자 explicit approval (this session) = reviewer ACK defer 가능. 단, post-fix reviewer backfill 의무 (다음 cycle 안에 dispatched task 의 retroactive review) + `docs/harness/user-queue.md` 에 `Q-HOTFIX-ACK-DEFER` entry 의무. **Queue 삽입 형식**: 새 `## Pending — Q-HOTFIX-ACK-DEFER (<ISO timestamp>)` heading 으로 append (기존 `## Pending — Q-TOOL-EDIT-RETRY-EXHAUSTED` 패턴 동일). 본문 필드: `- Task id: <id>`, `- Defer time: <timestamp>`, `- Backfill deadline: <within next cycle>`, `- User approval quote: "<≤1 sentence>"`.
- Atomic deliverable 의무 변동 없음 (PR-sized commit + 단일 RED→GREEN→REFACTOR).

## §Multi-dispatch wave shape

### Wave 식별 정책

(cycle 2 정정 — dependency declaration mandatory)

- Plan 본문에 parallel wave 가 있으면 **`## Dependencies` 섹션 의무** (canonical heading). `## Execution waves` 는 optional supplement (visualization 용도).
- 누락된 plan = **legacy fallback**: conservative sequential 만 (자동 parallelism 금지). file-disjoint heuristic 은 적용하지 않음.
- 새 plan 작성 시 `## Dependencies` 형식 의무 — writer 가 의존성 명시.

### 권장 plan 본문 형식 (필수)

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

### Wave dispatch 절차

1. Main 이 plan 전체 read (한 번).
2. Wave 1 의 모든 task 를 fresh subagent 로 병렬 dispatch (`Agent()` calls in single message, `run_in_background: true` per existing SKILL.md:291 + harness-share.md:381 parallel-dispatch rule).
3. 모든 wave 1 task 완료 알림 자동 수신 (harness 가 background completion notification 보냄 — sleep 금지).
4. Wave 1 결과를 fresh reviewer subagent 로 합류 검토 (`oh-my-claudecode:code-reviewer` 또는 `verifier`, opus).
5. Reviewer PASS → wave 2 dispatch / FAIL → 해당 task 재 dispatch (다른 fresh subagent).
6. 모든 wave 완료까지 반복.

### Wave 사이즈 가이드

- 한 wave 에 최대 5 parallel task 권장 (kzk operational empirical: 5 초과 시 wave 합류 검토 단계의 reviewer subagent context 부담 + rate limit 변동성 증가 관찰).
- 5 초과 시 자동으로 다음 wave 로 split (task drop 아님).
- Hard cap 아님 — 충분한 reviewer context budget 이 있고 wave 의 task 들이 의미적으로 같은 deliverable 이면 5 초과 OK.

### Three-stage review 와의 관계

- 기존 §Three-stage review (executor → critic → verifier) 는 task-단위 적용 유지.
- §Multi-dispatch wave shape 의 "wave 결과 합류 검토" 는 wave-단위 추가 합류 검토 — task 단위 critic/verifier 위 단계.
- 즉 task 단위 검토 PASS → wave 단위 합류 검토 PASS → 다음 wave.

## §Plan size policy

### Plan file 자체 크기

- Line cap 없음 (gridless `grid-lock-phase-2-plan.md` 3,031 라인 정상).
- Plan 은 phase 단위 분리 가능 (`grid-lock phase 1–4` 처럼 `2026-05-12-grid-lock-phase-{1,2,3,4}-plan.md`).

### Per-task atomicity (의무 + hard trigger)

- 한 task = 한 PR-sized commit.
- 한 task = 단일 RED→GREEN→REFACTOR.
- Task body soft cap = ≤120 라인 (cycle 3 B1' fix — was 150). 초과 시 hard trigger: `## Split rationale` 단락 + reviewer subagent (opus) ACK before dispatch (§Task-level dispatch shape per-task line guide 참조).

### Phase split 권장 threshold

- 50+ task / 5,000+ 라인 / 9+ Group 단위 → phase 분리 권장 (gridless 패턴).
- Phase 간 의존 plan 상단에 명시:
  ```markdown
  ## Phase dependencies
  - Phase 2 depends on Phase 1 §Group H (RDG-WS contract frozen).
  - Phase 3 depends on Phase 2 §Group I (acceptance verification).
  ```

### Cross-phase dependency 표기 (gridless reference)

- `2026-05-12-grid-lock-phase-2-plan.md` 의 phase-1 reference: "Phase 2 picks up after Phase 1 §Group H freezes the RDG-WS contract."
- 본 정책 적용 시 plan 작성자가 이 형식 사용 권장 (의무 X — cross-phase 는 plan 외부 의존).

### Migration 정책

- 기존 plan retro 적용 X (grandfather).
- 새 plan 부터 §Multi-dispatch wave shape 의 `## Dependencies` 섹션 의무 (parallel wave 가 있는 모든 plan).
- 기존 plan dispatch 시: `## Dependencies` 부재 → conservative sequential 만 (auto-parallelism 금지). 작성자가 후속 update 시 `## Dependencies` 추가 권장.

### Dependency addendum sidecar (cycle 3 P1' fix)

기존 frozen plan 본문은 spec-and-review Step 3 PASS 후 immutable 이라 직접 `## Dependencies` 추가가 어려움. 대안: sidecar artifact:

- 위치: `docs/plans/<plan-basename>-dependencies.md` (e.g., `2026-05-12-grid-lock-phase-2-plan-dependencies.md`)
- 본문: 동일 `## Dependencies` + `## Execution waves` 형식 (5.2 권장 형식)
- Frozen plan 자체 unchanged. Sidecar 는 plan owner 가 작성 + reviewer subagent ACK 1회 필요.
- Main dispatch 시: plan path 와 sidecar path 양쪽을 Required reading 에 inclusion.
- Plan 본문에 직접 `## Dependencies` 가 있으면 sidecar 우선순위 X (plan 자체가 source of truth).
- **Conflict 처리 (cycle 4 N1'' fix)**: plan body 와 sidecar body 모두에 `## Dependencies` 가 존재하고 disagree 할 때, main 은 sidecar 를 무시하고 plan 본문만 사용. 동시에 `docs/harness/user-queue.md` 에 `Q-SIDECAR-DRIFT` Pending entry 등록 — plan owner 가 cleanup (sidecar 삭제 또는 plan body update) 결정 필요. Sidecar drift 상태에서는 parallel wave 인가 X (보수적 sequential).

### Production-code-first boilerplate (Plan E)

Auto-inject the following boilerplate into the Rules block of sonnet/opus dispatch prompts (blocks production state mutation):

```
[PRODUCTION-CODE-FIRST RULE — kzk-production-access §Production state changes (rev2)]
이 task 가 production state mutation (DB schema / IAM policy / S3 lifecycle / IaC-managed Lambda env / CloudFront 등) 을 포함한다면:
- AI 직접 실행 금지 (사용자 explicit instruction 있어도). script (migration / IaC) 작성 → 사용자 review (Three-stage review, Plan C) → 사용자/CI 실행
- read-only inspection (aws s3 ls, describe-*, \dt) 만 AI 직접 실행 OK — 단 사용자 explicit instruction 필요
- 멱등성 의무: IF NOT EXISTS / ON CONFLICT DO NOTHING / --if-not-exists
- Drift 발견 시 forward-only migration (production state rollback X. code commit git revert 는 OK)
- 환경 설정 예외 (runtime-only) 만 기존 explicit-instruction rule 적용. IaC-managed 는 code-first 의무
위반 시 task BLOCKED 반환 + plan revision 요청.
```

**Trigger keywords** (auto-inject when main writes the dispatch prompt):
`production`, `prod`, `migration`, `schema change`, `ALTER TABLE`, `IaC`, `Terraform`, `CloudFormation`, `IAM`, `S3 lifecycle`, `Lambda env`, `RDS`, `aws-vault`.

Missing boilerplate = §Three-stage review (Plan C) FAIL.

### Anti-self-verification boilerplate (Plan A)

Auto-inject the following boilerplate into sonnet executor dispatch prompts (blocks implementation reads during TDD red phase):

```
[ANTI-SELF-VERIFICATION RULE — kzk-test-coverage §Anti-pattern]
TDD red 단계 (failing test 작성) 진입 시점:
- 허용 read: spec / acceptance criteria / 사용자 prompt / public API 시그니처 / hook·install 인프라 코드
- 금지 read: 지금 작성하려는 함수 본문, 같은 파일 sibling 함수 본문, 기존 test 파일
- 자가 점검: "이 test 가 spec 에서 도출됐는가? implementation 의 현재 모양에서 추론한 것 아닌가?"
위반 시 task BLOCKED 반환 + plan revision 요청.
```

This boilerplate is mandatory in the Rules block of every sonnet dispatch prompt. Missing boilerplate = §Three-stage review FAIL.

## Parallel dispatch

File-scope-disjoint tasks fire simultaneously: multiple `Agent` tool calls in one response, `run_in_background: true` so main can continue work and gets auto-notified.

Race avoidance:

- Same file region = sequential (one subagent owns it)
- git push race → subagent auto-handles with `git fetch && rebase && push`

## Three-stage review (mandatory after each subagent finishes)

### Stage 1 — Trust-but-Verify

`git log` + `git diff` + dist artifact direct inspection. Do not trust agent summary alone.

### Stage 2 — Gate integration (build/test/Playwright + spec acceptance + coverage)

1. Build / test / Playwright (if applicable) result
2. Spec acceptance criteria verified
3. Coverage on touched files (per `kzk-test-coverage` — 100% line + branch on changed files; exemption only with explicit Q-COV-* entry in `docs/harness/user-queue.md`)

### Stage 3 — Fresh-agent verification (Plan C rev2)

#### Trigger — ANY of:

(a) `git diff --name-only HEAD~1` (post-commit) or `git diff --cached --name-only` (pre-commit) shows **3+ files**
(b) **High-risk tag**: spec/plan task touches auth / payment / migration / public API (stated in plan body or commit message body high-risk marker)
(c) **All main-authored commits** regardless of file count — blocks the main self-approve hole

Condition (a) alone: apply §Verifier dispatch §Model branching
Condition (b) or (c): force opus (ignore file-size branching)

**Main self-approve forbidden** — Stage 1/2 alone is not enough to proceed to commit. Commit blocked until Stage 3 PASS.

#### Verifier dispatch

```typescript
// Model branching — based on git diff --shortstat
//   < 3 files && < 100 LoC → sonnet
//   otherwise → opus
//   empty diff (no HEAD~1, etc.) → opus default safe
//   high-risk tag or main-authored commit → force opus (ignore size)

Agent({
  subagent_type: 'oh-my-claudecode:verifier',  // preferred
  // fallback: 'oh-my-claudecode:code-reviewer'
  model: '<branch result>',
  prompt: '<Verifier prompt — structure below>',
});
```

#### Verifier prompt structure (SoT — Plan §Acceptance Criteria first)

Three blocks required, nothing else inline:

1. **Changed file list** — Stage 3 = `git diff --name-only HEAD~1` verbatim. Gate 5 = `git diff --cached --name-only` verbatim.
2. **Acceptance criteria SoT excerpt**:
   - **Priority 1**: text following the `## Acceptance Criteria` header in the current plan — grep up to `## Variables` or the next `## ` header, then inline verbatim. No full spec read.
   - **Priority 2** (only when plan is absent or §Acceptance Criteria header is absent): raw user request criteria.
   - **No mixing**: use priority 1 or 2 exclusively — mixing blurs the SoT.
3. **Question block + VERDICT enforcement** — verbatim:
   ```
   1. 이 diff 가 acceptance criteria 를 만족하는가?
   2. missing edge case 있는가?
   3. regression 가능성 있는가? (인접 callsite, 인접 모듈, 같은 패턴 재사용)
   4. scope 누수 있는가? (acceptance 에 없는 추가 변경)

   응답 형식 (강제):
   - 첫 줄 = `VERDICT: PASS` 또는 `VERDICT: FAIL` 또는 `VERDICT: PARTIAL`
   - 둘째 줄 이후 = 이유 3-5 줄
   - 첫 줄이 위 정확 형식 아니면 INVALID_VERDICT 처리됨
   ```

#### VERDICT parsing (rev2 #5)

Immediately after main receives the verifier response:
- Match first line with regex `^VERDICT: (PASS|FAIL|PARTIAL)$`
- Failure (prose only, format violation, empty, etc.) → treat as `INVALID_VERDICT`
- `INVALID_VERDICT` → **fail-closed BLOCK** + user-queue entry `Q-VERIFIER-INVALID — verifier response format violation (no PASS/FAIL/PARTIAL first line), user decision required (manual verify / retry / plan revision)`

#### PASS / FAIL / PARTIAL handling

| Verdict | Handling |
|---|---|
| PASS | Stage 3 cleared → Gate 5 may cite cache. OK to commit |
| PARTIAL | One additional fix cycle (main incorporates verifier feedback → additional subagent dispatch → new diff → Stage 3 re-call). 2 consecutive PARTIALs on the same thread → escalate to FAIL |
| FAIL | Main incorporates verifier feedback → fix dispatch → re-call. **2 consecutive FAILs on same thread** → halt + `Q-VERIFIER-FAIL` user-queue entry |
| INVALID_VERDICT | fail-closed BLOCK + `Q-VERIFIER-INVALID` user-queue entry. retry / manual verify / plan revision — user decides |
| Dispatch fail (no response / timeout) | BLOCK + `Q-VERIFIER-DISPATCH-FAIL` user-queue entry. fallback path: `oh-my-claudecode:code-reviewer` → if that also fails, user direct review |

#### 2 consecutive FAIL halt thread definition (rev2 #6)

thread = `(plan_path, acceptance_id, verification_round)` triple.
- `plan_path` = current plan's file path (e.g. `docs/plans/plan-C-fresh-agent-verification.md`)
- `acceptance_id` = item number in §Acceptance Criteria (e.g. `4`)
- `verification_round` = verifier call counter for the same acceptance item

2 consecutive FAILs within the same thread (= same plan + same acceptance + same round) → halt.

Reset conditions — **one of**:
- PASS — thread counter resets to 0
- User-approved plan revision (explicit rev bump — e.g. rev1 → rev2 frozen) — thread counter resets to 0, round increments by 1

Diff change alone does NOT reset (core of rev2 #6 — plain diff hash comparison can be gamed to bypass halt).

#### Stage 3 ↔ Gate 5 cache contract (rev2 #2)

cache key = `(staged_diff_hash, acceptance_hash, verifier_model)` triple.
- `staged_diff_hash`:
  - Stage 3 = `git diff HEAD~1 | sha256sum` (per cycle, post-commit)
  - Gate 5 = `git diff --cached | sha256sum` (per commit, pre-commit)
- `acceptance_hash` = sha256 of the §Acceptance Criteria excerpt from the current plan
- `verifier_model` = `sonnet` or `opus`

Cache hit rules:
- Same key within the same turn (main context still alive) = hit → cite the existing PASS
- Different turn (context reset after user response) = miss → re-verify

**Memory only** — no sidecar persistence. Plan E fast-follow candidate (register as a separate issue).

**Unified diff base**: Stage 3 = HEAD~1, Gate 5 = --cached. If the two SHAs differ, two calls are needed — normally in a cycle-end commit flow (commit-then-Stage-3), the SHAs are the same (HEAD~1 = previous commit, --cached = staged = diff about to be committed).

**Skill-load chain rule:** if `kzk-codebase-survey` is triggered for any task that will lead to edits (i.e., not a pure question), `kzk-large-task-delegation` MUST be loaded in the same turn. Survey alone defines *what to read*; delegation defines *who reads it and who writes back*. Loading survey without delegation = main has read context + no dispatch contract = anti-pattern by construction.

**Operational checks before any Edit/Write in main:**
1. Did the user phrase trigger any of: 'plan 쪼개', '사이클', '버그들 모두', '사용성', '전수조사', '구현 검증'? → load this skill (`kzk-large-task-delegation`).
2. Will main read ≥ 5 files this turn? → §Read-heavy audit dispatch shape mandates EXPLORER subagent.
3. Will main edit ≥ 3 files OR ≥ 200 LoC this turn? → §Model routing mandates fresh executor sonnet (opus only for plan/critic/verify).
4. If 1, 2, or 3 → re-route through subagent dispatch. Main keeps orchestration + verification + commit.

## Anti-pattern — Main direct-edit during multi-file work

Main directly using Edit/Write/Read/Bash(ls) on multi-file changes / 5+ file reads / 200+ LoC work is a meta-gap. This is especially blocked when the user explicitly said "run a subagent", "improve library", "improve harness", etc.

### Signals — switch to dispatch immediately on any of these

- Main calling Bash(ls)/Read in a reference-collection pattern (2+ consecutive Reads in one response, or Bash(ls/find) → Read pattern)
- Main attempting to read 3+ files in a single response
- Main reading reference code directly during the preparation phase of spec authoring / library changes

### Response

Switch to EXPLORER subagent dispatch immediately. Main receives only a 200-word summary. Raw file contents flowing into main context is itself the gap — it causes context saturation and the "main reads code weirdly" failure mode.

Cross-ref: `kzk-codebase-survey §Preparation phase delegation`, `kzk-autonomous-boundary §Q-MAIN-DIRECT-EDIT`.

## Interaction with other kzk-*

- **kzk-spec-and-review**: This skill's "Pre-implementation plan-critic loop" is the narrower, in-skill version of `kzk-spec-and-review`'s broader spec/plan/architecture authoring + cross-vendor review. Use this skill's plan-critic when a single executor task needs a plan critic inline; use `kzk-spec-and-review` when the artifact is a standalone spec/plan/architecture doc that needs Step 0 codebase survey + 3-pass review.
- **kzk-codebase-survey**: Step 0 of any task ≥3 files / ≥200 LoC. Survey runs BEFORE this skill's planner dispatch.
- **kzk-test-coverage**: Stage 2 of Three-stage review runs the same coverage check that test-coverage owns at session close.
- **kzk-pre-commit-gate**: Subagent prompt MUST echo the gate sequence so the executor commits with full Gate 0–5 awareness. Gate 5 cites the Stage 3 result from this skill (key = staged_diff_hash + acceptance_hash + verifier_model, same turn only). Same diff = one verifier call only.
- **kzk-autonomous-boundary**: Stage 3 verifier 2 consecutive FAILs on same thread → `Q-VERIFIER-FAIL`. INVALID_VERDICT → `Q-VERIFIER-INVALID`. dispatch fail → `Q-VERIFIER-DISPATCH-FAIL`. All registered in autonomous-boundary §Halt conditions table.
- **kzk-test-coverage**: Plan A Q-TDD-MAIN absorption complete — registered as a halt table entry in kzk-autonomous-boundary in this Plan C task 3. No separate follow-up.
- **kzk-freshness-guard**: CRG dependency graph auto-computes change impact radius → improves scope estimation precision. `crg-utils.getChangedSymbols()` + `crg-utils.reverseRefs()` compute changed file count + affected file count.
