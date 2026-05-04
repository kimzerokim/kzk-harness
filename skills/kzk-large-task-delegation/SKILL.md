---
name: kzk-large-task-delegation
version: 1.9.0
description: "Large tasks (3+ files / 200+ LoC / 5+ file read / multi-stage) dispatch to fresh subagents — main never executes. Top triggers: '큰 작업', '버그 전수조사', '사이클 자율', 'plan 쪼개', 'subagent dispatch', 'Stage 3', 'fresh-agent verifier', 'verifier dispatch', 'INVALID_VERDICT', 'Body §Anti-pattern Main direct-edit'. Body §Triggers for full list."
---

> Authoritative source: `harness-share.md` §4. On conflict, that wins.

# kzk-large-task-delegation

## Triggers

`large task`, `subagent dispatch`, `3+ file edits`, `200+ LoC`, `opus/sonnet routing`, `subagent-driven`, `큰 작업`, `fresh subagent`, `메인 컨텍스트`, `여러 파일 동시 편집`, `Plan scope 전체`, `read-heavy audit`, `spec verification`, `구현 검증`, `버그 전수조사`, `implementation audit`, `5+ file read`, `마무리 해줘`, `전수 검토`, `끝내줘`, `사용성 버그`, `사용성 회귀`, `QA scan`, `여러 plan 으로 쪼개`, `플랜 여러개로 쪼개`, `plan 쪼개`, `사이클 자율`, `사이클로 자율`, `사이클 돌면서`, `버그들 모두`, `모두 잡아줘`, `Stage 3`, `fresh-agent verifier`, `verifier dispatch`, `verifier model routing`, `PASS FAIL PARTIAL`, `Q-VERIFIER-FAIL`, `Q-VERIFIER-INVALID`, `INVALID_VERDICT`, `verification thread`.

Large work runs in fresh subagents via `/superpowers:subagent-driven-development`. Main context = dispatch + review + commit. Main never holds the implementation.

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

`model` MUST be specified explicitly on every dispatch. Omitted = Opus default = cost blowup.

### Code examples (mandatory `model` param)

`model` MUST be specified explicitly on every dispatch. Omitted = Opus default = cost blowup + slow.

```typescript
// ✅ Implementation — sonnet
Agent({
  subagent_type: 'oh-my-claudecode:executor',
  model: 'sonnet',
  prompt: 'Add useViews hook ...',
});

// ✅ Plan / design — opus
Agent({
  subagent_type: 'oh-my-claudecode:planner',
  model: 'opus',
  prompt: 'Design merge conflict detection algorithm ...',
});

// ✅ Critic / verify — opus
Agent({
  subagent_type: 'oh-my-claudecode:code-reviewer',
  model: 'opus',
  prompt: 'Review diff for SQL safety + RBAC ...',
});

// ✅ Quick lookup — haiku or default
Agent({
  subagent_type: 'oh-my-claudecode:explore',
  prompt: 'Locate every reference to <symbol> ...',
});
```

**Forbidden**: omitting `model`. Implicit Opus is expensive and slow.

## Pre-implementation plan-critic loop (opus + codex)

Before dispatching the sonnet executor, the plan must clear this gate exactly once per Plan or per discrete task:

0. **`kzk-codebase-survey`** — EXPLORER agent runs all steps (Step 0.5 + Step 1–8), saves report to `docs/harness/surveys/YYYY-MM-DD-<topic>-survey.md`. Report path passed to planner and critic as required reading. Survey failure → note in report, continue.
1. main authors the plan or dispatches `planner` (opus) — **prompt must include survey report path as required reading**
2. Codex CLI consult on the plan draft (`codex exec` per `kzk-spec-and-review`) → returns concerns; CLI unavailable → `oh-my-claudecode:critic` opus
3. main edits plan (or dispatches `oh-my-claudecode:critic` opus) to address concerns — **critic prompt must include:** "Check the plan covers every item in Features to Preserve and Integration Points in the survey report. Any gap = FAIL."
4. on agreement, plan is frozen — written to `docs/plans/<file>.md` with a `## Frozen` header line
5. only frozen plans may feed a sonnet executor dispatch

2 consecutive critic / codex FAILs on the plan → halt + user-queue, no code is written. This is the autonomous-loop halt condition mirroring `kzk-autonomous-boundary`.

## Subagent prompt requirements (fresh subagent has zero memory)

Every dispatch prompt must include:

- Scope (file paths, line ranges)
- Plan file path (which task within) — **frozen plan only when dispatching to sonnet**
- Required reading list (CLAUDE.md, the spec doc, sister files)
- Rules block: TDD sequence (red-green-refactor — see kzk-test-coverage §TDD sequence; failing test BEFORE impl is non-negotiable in autonomous mode) + **§Sonnet executor — Anti-self-verification boilerplate 의 literal boilerplate 텍스트를 dispatch prompt 의 Rules block 에 그대로 포함 (참조만 X — fresh agent 는 SKILL.md 를 자동으로 읽지 않음)** + context7 mandate + `kzk-pre-commit-gate` (incl. **Gate 0 AGENTS.md sync** — touched-files AGENTS.md goes in the SAME commit) + DO-NOT-MODIFY paths + branch boundary (the session **branch contract** locked by `kzk-autonomous-boundary` — verify the current branch matches the contract via `git branch --show-current` before dispatch; `main` is allowed only if the contract authorized direct-main flow this session)
- Commit message convention (English conventional commits, no Co-Authored-By)
- Working directory absolute path
- Race-condition awareness (file scopes vs other parallel subagents)
- Return format on success
- Halt condition (blocked → user-queue entry)
- **Recall 결과 inject** (Plan D): subagent dispatch prompt 의 Rules block 에 메인이 받은 [REGRESSION RECALL] system-reminder 가 있으면, 해당 텍스트를 verbatim 으로 dispatch prompt 에 inject. **size cap 200 char** — reminder 가 200 char 초과 시 truncate (hits 우선순위 high → low confidence_decayed 로 정렬 후 cumulative length 200 도달까지) + warning footer (`[truncated: <N> more hits]`). subagent 가 fix 작업 시 recall 결과 read. 매칭 정확성은 subagent 가 검토.

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

Sonnet/opus dispatch prompt 의 Rules block 에 다음 boilerplate 자동 inject (production state mutation 차단):

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

**Trigger 키워드** (메인이 dispatch prompt 작성 시 자동 inject 대상):
`production`, `prod`, `migration`, `schema change`, `ALTER TABLE`, `IaC`, `Terraform`, `CloudFormation`, `IAM`, `S3 lifecycle`, `Lambda env`, `RDS`, `aws-vault`.

본 boilerplate 누락 = §Three-stage review (Plan C) FAIL.

### Anti-self-verification boilerplate (Plan A)

Sonnet executor dispatch prompt 에 다음 boilerplate 자동 inject (TDD red 단계 진입 시 implementation read 차단):

```
[ANTI-SELF-VERIFICATION RULE — kzk-test-coverage §Anti-pattern]
TDD red 단계 (failing test 작성) 진입 시점:
- 허용 read: spec / acceptance criteria / 사용자 prompt / public API 시그니처 / hook·install 인프라 코드
- 금지 read: 지금 작성하려는 함수 본문, 같은 파일 sibling 함수 본문, 기존 test 파일
- 자가 점검: "이 test 가 spec 에서 도출됐는가? implementation 의 현재 모양에서 추론한 것 아닌가?"
위반 시 task BLOCKED 반환 + plan revision 요청.
```

이 boilerplate 는 sonnet dispatch prompt 의 Rules block 에 의무 inject. 메인이 dispatch prompt 작성 시 boilerplate 누락 = §Three-stage review FAIL.

## Parallel dispatch

File-scope-disjoint tasks fire simultaneously: multiple `Agent` tool calls in one response, `run_in_background: true` so main can continue work and gets auto-notified.

Race avoidance:

- Same file region = sequential (one subagent owns it)
- git push race → subagent auto-handles with `git fetch && rebase && push`

## Three-stage review (mandatory after each subagent finishes)

### Stage 1 — Trust-but-verify

`git log` + `git diff` + dist artifact 직접 확인. agent summary 만 신뢰 X.

### Stage 2 — Gate 통합 (build/test/Playwright + spec acceptance + coverage)

1. Build / test / Playwright (if applicable) result
2. Spec acceptance criteria 충족 확인
3. Coverage on touched files (per `kzk-test-coverage` — 100% line + branch on changed files; exemption only with explicit Q-COV-* entry in `docs/harness/user-queue.md`)

### Stage 3 — Fresh-agent verification (Plan C rev2)

#### Trigger — ANY of:

(a) `git diff --name-only HEAD~1` (post-commit) 또는 `git diff --cached --name-only` (pre-commit) 결과 **3+ 파일**
(b) **High-risk tag**: spec/plan task 가 auth / payment / migration / public API 영역 변경 (plan 본문 명시 또는 commit message body 의 high-risk marker)
(c) **메인 직접 commit 모든 case** (메인이 author 한 commit 인 경우, 파일 수와 무관 — 메인 self-approve hole 차단)

조건 (a) 단독 충족 시: §Verifier dispatch §Model 분기 적용
조건 (b) 또는 (c): opus 강제 (file size 기반 분기 무시)

**메인 self-approve 금지** — Stage 1/2 만으로 commit 진행 X. Stage 3 PASS 받기 전 commit 금지 (Gate 5 와 동시 enforcement).

#### Verifier dispatch

```typescript
// model 분기 — git diff --shortstat 결과 기준
//   < 3 files && < 100 LoC → sonnet
//   그 외 → opus
//   empty diff (HEAD~1 부재 등) → opus default safe
//   high-risk tag 또는 메인 직접 commit → opus 강제 (size 무시)

Agent({
  subagent_type: 'oh-my-claudecode:verifier',  // 선호
  // fallback: 'oh-my-claudecode:code-reviewer'
  model: '<branch result>',
  prompt: '<Verifier prompt — 아래 구조>',
});
```

#### Verifier prompt 구조 (SoT — Plan §Acceptance Criteria 우선)

세 블록 필수, 그 외 inline 금지:

1. **변경 파일 목록** — Stage 3 = `git diff --name-only HEAD~1` verbatim. Gate 5 = `git diff --cached --name-only` verbatim.
2. **Acceptance criteria SoT 발췌**:
   - **우선순위 1**: current plan 의 `## Acceptance Criteria` 헤더 다음 텍스트 — `## Variables` 또는 다음 `## ` 헤더 직전까지 grep 추출 후 verbatim inline. 전체 spec read 금지.
   - **우선순위 2** (plan 부재 또는 §Acceptance Criteria 헤더 부재 시만): raw user request criteria.
   - **혼합 금지**: 우선순위 1 또는 2 단독 — 섞으면 SoT 흐려짐.
3. **질문 블록 + VERDICT enforcement** — verbatim:
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

#### VERDICT 파싱 (rev2 #5)

메인이 verifier 응답 받은 직후:
- 정규식 `^VERDICT: (PASS|FAIL|PARTIAL)$` 으로 첫 줄 매칭
- 실패 (prose only, 형식 위반, empty 등) → `INVALID_VERDICT` 처리
- `INVALID_VERDICT` → **fail-closed BLOCK** + user-queue entry `Q-VERIFIER-INVALID — verifier 응답 형식 위반 (PASS/FAIL/PARTIAL 첫 줄 부재), 사용자 결정 필요 (manual verify / retry / plan revision)`

#### PASS / FAIL / PARTIAL 처리

| Verdict | 처리 |
|---|---|
| PASS | Stage 3 통과 → Gate 5 가 cache 인용. commit 진행 OK |
| PARTIAL | 추가 fix cycle 1회 (메인이 verifier 지적사항 수렴 → 추가 subagent dispatch → 새 diff → Stage 3 재호출). PARTIAL 2 consecutive (같은 thread) → FAIL 로 escalate |
| FAIL | 메인이 verifier 지적사항 수렴 → fix dispatch → 재호출. **2 consecutive FAIL on same thread** → halt + `Q-VERIFIER-FAIL` user-queue entry |
| INVALID_VERDICT | fail-closed BLOCK + `Q-VERIFIER-INVALID` user-queue entry. retry / manual verify / plan revision 사용자 결정 |
| Dispatch fail (no response / timeout) | BLOCK + `Q-VERIFIER-DISPATCH-FAIL` user-queue entry. fallback path: `oh-my-claudecode:code-reviewer` → 그것도 실패 시 사용자 직접 review |

#### 2 consecutive FAIL halt thread 정의 (rev2 #6)

thread = `(plan_path, acceptance_id, verification_round)` triple.
- `plan_path` = current plan 의 파일 경로 (예: `docs/plans/plan-C-fresh-agent-verification.md`)
- `acceptance_id` = §Acceptance Criteria 의 항목 번호 (예: `4`)
- `verification_round` = 같은 acceptance 에 대한 verifier 호출 횟수 카운터

같은 thread (= 같은 plan + 같은 acceptance + 같은 round) 안에서 2 consecutive FAIL → halt.

reset 조건 — **둘 중 하나만**:
- PASS — thread counter 0 reset
- user-approved plan revision (rev bump 명시 — 예: rev1 → rev2 frozen) — thread counter 0 reset, round 1 증가

fix 후 diff 변경만으로는 reset X (rev2 #6 의 핵심 — 단순 diff hash 비교는 halt 우회 위험).

#### Stage 3 ↔ Gate 5 cache 규약 (rev2 #2)

cache key = `(staged_diff_hash, acceptance_hash, verifier_model)` triple.
- `staged_diff_hash`:
  - Stage 3 = `git diff HEAD~1 | sha256sum` (cycle 단위, post-commit)
  - Gate 5 = `git diff --cached | sha256sum` (commit 단위, pre-commit)
- `acceptance_hash` = current plan 의 §Acceptance Criteria 발췌 텍스트 sha256
- `verifier_model` = `sonnet` 또는 `opus`

cache hit 룰:
- 같은 turn (대화 내 메인 컨텍스트 살아있음) 안에서 같은 key 면 hit → 기존 PASS 인용
- 다른 turn (사용자 응답 후 컨텍스트 reset) = miss → re-verify

**메모리 only** — sidecar persistence 부재. Plan E fast-follow 후보 (별도 issue 등록 의무).

**diff base 단일화**: Stage 3 = HEAD~1, Gate 5 = --cached. 두 시점 SHA 가 다르면 두 호출 — 보통 cycle 끝 commit 의 commit-then-Stage-3 흐름이면 동일 (HEAD~1 = 직전 commit, --cached = staged = 곧 commit 될 diff).

#### Plan C self-bootstrap N/A 예외 (rev2 #1)

Plan C 자체를 적용한 첫 commit (= 본 plan 의 task 7 commit) 은 Stage 3 / Gate 5 가 *적용되기 전* commit 이라 self-reference paradox. 1회만 N/A 허용:
- commit body 에 명시: `Gate 5 N/A — Plan C self-bootstrap commit, applies from next commit.`
- 사용자 명시 OK 받은 1회만 — 그 후 모든 commit 은 trigger 충족 시 의무 적용

## Session-6 lesson (do not repeat)

(2026-04-20, ui-migration-shadcn M7 HALT recovery): main context directly ran Edit + Bash + Playwright for M2/M4/M6 cleanup. Result: (1) main-context token bloat, (2) linter timestamp race → repeated Edit failures, (3) quality regressions — token gaps, `a` rule override, accent collisions all missed.

Re-prevention:

1. Detect "large" → immediately invoke `/superpowers:subagent-driven-development`
2. Skill demands `docs/plans/<name>.md` first (2-5 task TDD format)
3. Fresh subagent dispatch = `Agent` tool + `subagent_type="oh-my-claudecode:executor"` + `model="sonnet"` (default for implementation; see Model routing table) + frozen plan path + context7 mandate + Pre-commit Gates 0, 1, 1.5, 2, 3, 4 all in prompt
4. Main reviews subagent return → gate check → commit+push, OR re-dispatch fresh subagent on failure
5. 2 consecutive subagent failures → halt + user-queue entry. Main does NOT take over.

## Session-28 lesson (skill-load chain)

(2026-05-04, gridless grid bug bash): user said "이외에 스프레드 시트 기능 버그들 모두 개선해줘. 플랜 여러개로 쪼개고, 사이클 자율로 돌면서 사용성 버그 모두 잡아줘." Main loaded `kzk-codebase-survey` + `kzk-autonomous-boundary` correctly, dispatched the codebase survey to `oh-my-claudecode:explore` correctly — then proceeded to read 11+ files, edit 4 source files, run Playwright + docker rebuild **all directly in main**, never loading `kzk-large-task-delegation` and never dispatching an executor subagent for the actual fix. Token bloat + uncatchable regressions risk back.

Root cause: trigger keyword gap — '사용성 버그', '여러 plan 으로 쪼개', '사이클 자율' did not match this skill's description. Fixed in v1.2.0 (description trigger expansion) + `install/hooks/keyword-detector.mjs` activation (Cycle 28).

**Skill-load chain rule:** if `kzk-codebase-survey` is triggered for any task that will lead to edits (i.e., not a pure question), `kzk-large-task-delegation` MUST be loaded in the same turn. Survey alone defines *what to read*; delegation defines *who reads it and who writes back*. Loading survey without delegation = main has read context + no dispatch contract = anti-pattern by construction.

**Operational checks before any Edit/Write in main:**
1. Did the user phrase trigger any of: 'plan 쪼개', '사이클', '버그들 모두', '사용성', '전수조사', '구현 검증'? → load this skill (`kzk-large-task-delegation`).
2. Will main read ≥ 5 files this turn? → §Read-heavy audit dispatch shape mandates EXPLORER subagent.
3. Will main edit ≥ 3 files OR ≥ 200 LoC this turn? → §Model routing mandates fresh executor sonnet (opus only for plan/critic/verify).
4. If 1, 2, or 3 → re-route through subagent dispatch. Main keeps orchestration + verification + commit.

## Anti-pattern — Main direct-edit during multi-file work

메인이 multi-file 변경 / 5+ 파일 read / 200+ LoC 작업에서 직접 Edit/Write/Read/Bash(ls) 로 빠지는 것은 메타 갭이다. 사용자가 "서브에이전트 돌리고", "라이브러리 개선", "harness 개선" 등 subagent 위임을 명시했을 때 특히 차단.

### 신호 — 이 중 하나라도 잡히면 즉시 dispatch 전환

- 메인이 Bash(ls)/Read 를 reference collection 목적으로 연속 호출 (같은 응답 내 2+ 연속 Read, 또는 Bash(ls/find) → Read 패턴)
- 메인이 같은 응답에서 3+ 파일 read 시도
- 메인이 spec 작성 / library 변경의 preparation phase 에서 reference 코드 직접 read

### 대응

즉시 EXPLORER subagent dispatch 로 전환. 메인은 200-word summary 만 받는다. raw 파일 내용이 메인 컨텍스트로 직접 유입되는 것 자체가 갭 — context saturation 과 "main reads code weirdly" failure mode 의 원인.

Cross-ref: `kzk-codebase-survey §Preparation phase delegation`, `kzk-autonomous-boundary §Q-MAIN-DIRECT-EDIT`.

## Interaction with other kzk-*

- **kzk-spec-and-review**: This skill's "Pre-implementation plan-critic loop" is the narrower, in-skill version of `kzk-spec-and-review`'s broader spec/plan/architecture authoring + cross-vendor review. Use this skill's plan-critic when a single executor task needs a plan critic inline; use `kzk-spec-and-review` when the artifact is a standalone spec/plan/architecture doc that needs Step 0 codebase survey + 3-pass review.
- **kzk-codebase-survey**: Step 0 of any task ≥3 files / ≥200 LoC. Survey runs BEFORE this skill's planner dispatch.
- **kzk-test-coverage**: Stage 2 of Three-stage review runs the same coverage check that test-coverage owns at session close.
- **kzk-pre-commit-gate**: Subagent prompt MUST echo the gate sequence so the executor commits with full Gate 0–5 awareness. Gate 5 가 본 skill 의 Stage 3 결과를 cache 인용 (key = staged_diff_hash + acceptance_hash + verifier_model, same turn only). 같은 diff 의 verifier 호출 1회만.
- **kzk-autonomous-boundary**: Stage 3 verifier 2 consecutive FAIL on same thread → `Q-VERIFIER-FAIL`. INVALID_VERDICT → `Q-VERIFIER-INVALID`. dispatch fail → `Q-VERIFIER-DISPATCH-FAIL`. autonomous-boundary §Halt conditions 표가 모두 등록.
- **kzk-regression-memory**: 메인이 받은 [REGRESSION RECALL] reminder 를 subagent dispatch prompt 에 inject (size cap 200 char, truncate + warning). fix subagent 도 recall 결과 read.
- **kzk-test-coverage**: Plan A 의 Q-TDD-MAIN 흡수 종료 — 본 Plan C task 3 에서 kzk-autonomous-boundary 의 halt 표에 entry 추가 완료. 별도 follow-up 없음.
