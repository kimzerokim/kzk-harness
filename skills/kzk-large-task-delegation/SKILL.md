---
name: kzk-large-task-delegation
version: 1.20.0
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
- **Regression recall inject** (Plan D): if the main context received a [REGRESSION RECALL] system-reminder, inject that text verbatim into the Rules block of the subagent dispatch prompt. **Size cap 200 chars** — if the reminder exceeds 200 chars, truncate (sort hits high → low confidence_decayed, accumulate until 200 chars reached) + warning footer (`[truncated: <N> more hits]`). Subagent reads the recall results when doing fix work; accuracy verification is the subagent's responsibility.
- **§Code-quality-discipline boilerplate (Plan F)**: auto-inject the dispatch prompt boilerplate from harness-share.md §32 (DRY/YAGNI/KISS + Deletion test + Depth + obsolete test) into the Rules block. Missing = §Three-stage review FAIL.
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

Typical prompt = 60-150 lines for opus, 100-220 lines for sonnet. Terse prompt = shallow work.

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
- **kzk-regression-memory**: Inject the [REGRESSION RECALL] reminder received by main into the subagent dispatch prompt (200 char size cap, truncate + warning). Fix subagent also reads recall results.
- **kzk-test-coverage**: Plan A Q-TDD-MAIN absorption complete — registered as a halt table entry in kzk-autonomous-boundary in this Plan C task 3. No separate follow-up.
- **kzk-freshness-guard**: CRG dependency graph auto-computes change impact radius → improves scope estimation precision. `crg-utils.getChangedSymbols()` + `crg-utils.reverseRefs()` compute changed file count + affected file count.
