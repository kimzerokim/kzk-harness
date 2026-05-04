---
name: kzk-large-task-delegation
version: 1.2.0
description: "Large tasks dispatch to fresh subagents — main never executes. Defines what counts as 'large', what main may do, fresh-subagent prompt requirements, anti-pattern worked examples (Session-6 + Session-28), and the skill-load chain that must follow `kzk-codebase-survey`. Required triggers: 'large task', 'subagent dispatch', '3+ file edits', '200+ LoC', 'opus/sonnet routing', 'subagent-driven', '큰 작업', 'fresh subagent', '메인 컨텍스트', '여러 파일 동시 편집', 'Plan scope 전체', 'read-heavy audit', 'spec verification', '구현 검증', '버그 전수조사', 'implementation audit', '5+ file read', '마무리 해줘', '전수 검토', '끝내줘', '사용성 버그', '사용성 회귀', 'QA scan', '여러 plan 으로 쪼개', '플랜 여러개로 쪼개', 'plan 쪼개', '사이클 자율', '사이클로 자율', '사이클 돌면서', '버그들 모두', '모두 잡아줘'."
---

> Authoritative source: `harness-share.md` §4. On conflict, that wins.

# kzk-large-task-delegation

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

Subagent dispatches are split by phase, not by topic. Reasoning-heavy phases get the strong model + a second-opinion consult; mechanical phases get the fast model.

| Phase | Subagent type | Model | Cross-check |
|---|---|---|---|
| Plan authoring | `oh-my-claudecode:planner` / `oh-my-claudecode:architect` | **opus** | Mandatory Codex CLI consult on draft plan before freezing (see `kzk-spec-and-review`). For deep requirements elicitation before planning, use `Skill("oh-my-claudecode:deep-interview")` — it is a Skill invocation, not an Agent subagent_type. |
| Critic / review | `oh-my-claudecode:critic` / `oh-my-claudecode:code-reviewer` | **opus** | Codex CLI review parallel pass (see `kzk-spec-and-review`) |
| Verify | `oh-my-claudecode:verifier` | **opus** | Codex CLI consult on uncertain assertions (see `kzk-spec-and-review`) |
| Implementation | `oh-my-claudecode:executor` | **sonnet** | none — plan must already be detailed enough |
| Quick research / file search | `oh-my-claudecode:explore` | **sonnet** (survey/deep reads); **haiku** (quick targeted lookups) | none |

Reason: heavy reasoning where it changes the outcome, cheap execution where the plan already determined every move. Override: if sonnet returns BLOCKED or main reviews the diff and finds plan-vs-code drift, re-dispatch the same task with `model="opus"` and root-cause whether the plan was insufficient (fix the plan policy) or the model failed (record once, do not generalize from a single failure).

Codex is invoked via CLI: `codex exec "$PROMPT" -C <repo-root> -s read-only` (see `kzk-spec-and-review §Codex execution shape`). CLI unavailable → `Agent(subagent_type="oh-my-claudecode:critic", model="opus")`. Codex disagreement on plan ≠ veto — main reconciles; persistent disagreement → user-queue entry, do not silently override one model with the other.

### Default split — 80% sonnet

In a typical session 80%+ of subagent dispatches should be `sonnet`. Only plan / architecture / deep debug get `opus`. Main thread receives the user prompt, splits the task by phase, and chooses model. Terse → sonnet. Heavy reasoning → opus.

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
- Rules block: TDD strict + context7 mandate + `kzk-pre-commit-gate` (incl. **Gate 0 AGENTS.md sync** — touched-files AGENTS.md goes in the SAME commit) + DO-NOT-MODIFY paths + branch boundary (the session **branch contract** locked by `kzk-autonomous-boundary` — verify the current branch matches the contract via `git branch --show-current` before dispatch; `main` is allowed only if the contract authorized direct-main flow this session)
- Commit message convention (English conventional commits, no Co-Authored-By)
- Working directory absolute path
- Race-condition awareness (file scopes vs other parallel subagents)
- Return format on success
- Halt condition (blocked → user-queue entry)

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

## Parallel dispatch

File-scope-disjoint tasks fire simultaneously: multiple `Agent` tool calls in one response, `run_in_background: true` so main can continue work and gets auto-notified.

Race avoidance:

- Same file region = sequential (one subagent owns it)
- git push race → subagent auto-handles with `git fetch && rebase && push`

## Two-stage review (mandatory after each subagent finishes)

Main verifies:

1. Trust-but-verify — `git log` + `git diff` + dist artifact directly
2. Build / test / Playwright (if applicable) result
3. Spec acceptance criteria
4. Coverage on touched files (per `kzk-test-coverage` — 100% line + branch on changed files; exemption only with explicit Q-COV-* entry in `docs/harness/user-queue.md`)

Trusting only the agent's summary text = forbidden.

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

## Interaction with other kzk-*

- **kzk-spec-and-review**: This skill's "Pre-implementation plan-critic loop" is the narrower, in-skill version of `kzk-spec-and-review`'s broader spec/plan/architecture authoring + cross-vendor review. Use this skill's plan-critic when a single executor task needs a plan critic inline; use `kzk-spec-and-review` when the artifact is a standalone spec/plan/architecture doc that needs Step 0 codebase survey + 3-pass review.
- **kzk-codebase-survey**: Step 0 of any task ≥3 files / ≥200 LoC. Survey runs BEFORE this skill's planner dispatch.
- **kzk-test-coverage**: Step 4 of large-task delegation runs the same coverage check that test-coverage owns at session close.
- **kzk-pre-commit-gate**: Subagent prompt MUST echo the gate sequence so the executor commits with full Gate 0–4 awareness.
- **kzk-autonomous-boundary**: Halt protocol mirror — if a delegated subagent halts, this skill's caller must propagate to autonomous-boundary's halt rules.
