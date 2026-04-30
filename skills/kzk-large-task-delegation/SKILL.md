---
name: kzk-large-task-delegation
version: 1.0.0
description: "Large tasks dispatch to fresh subagents — main context never executes. Defines what counts as 'large', what main may do, fresh-subagent prompt requirements, and Session-6 anti-patterns. Required triggers: 'subagent-driven', '큰 작업', 'fresh subagent', '메인 컨텍스트', '여러 파일 동시 편집', 'Plan scope 전체'."
---

> Authoritative source: repo `CLAUDE.md` "Large Task Delegation" + `harness-share.md` §4. On conflict, those win.

# kzk-large-task-delegation

Large work runs in fresh subagents via `/superpowers:subagent-driven-development`. Main context = dispatch + review + commit. Main never holds the implementation.

## "Large" — main is forbidden, subagent required

Any one of:

- 3+ files edited simultaneously (refactor, token migration, component rewrite)
- Single commit ≥ 200 LoC change expected
- `@theme` / token / CSS rewrite (`src/styles/**`) or 5+ component simultaneous migration
- Single Plan (any of A-N in `docs/plans/*.md`) full scope
- Build · test · Playwright · code-reviewer multi-stage workflow

## Main-context-allowed (trivial / fast / safe)

- Single config-line edit (`~/.claude.json` MCP args, `.mcp.json`, `tsconfig.json` single option)
- Single rule add (CLAUDE.md / DESIGN.md / `harness-flow-progress.md` 1-item)
- Single file ≤ 5 LoC fix (typo, single import line, single variable rename)
- Subagent result review · gate check · commit · push

## Model routing (mandatory split for subagent dispatch)

Subagent dispatches are split by phase, not by topic. Reasoning-heavy phases get the strong model + a second-opinion consult; mechanical phases get the fast model.

| Phase | Subagent type | Model | Cross-check |
|---|---|---|---|
| Plan authoring | `oh-my-claudecode:planner` / `oh-my-claudecode:architect` / `oh-my-claudecode:deep-interview` | **opus** | Mandatory `oh-my-claudecode:codex` consult on the draft plan before freezing |
| Critic / review | `oh-my-claudecode:critic` / `oh-my-claudecode:code-reviewer` | **opus** | `codex review` parallel pass |
| Verify | `oh-my-claudecode:verifier` | **opus** | `codex` consult on uncertain assertions |
| Implementation | `oh-my-claudecode:executor` | **sonnet** | none — plan must already be detailed enough |
| Quick research / file search | `Explore` / `oh-my-claudecode:explore` | **haiku** or default | none |

Reason: heavy reasoning where it changes the outcome, cheap execution where the plan already determined every move. Override: if sonnet returns BLOCKED or main reviews the diff and finds plan-vs-code drift, re-dispatch the same task with `model="opus"` and root-cause whether the plan was insufficient (fix the plan policy) or the model failed (record once, do not generalize from a single failure).

Codex is invoked via `oh-my-claudecode:codex` (consult mode for plan, review mode for diff). Codex disagreement on plan ≠ veto — main reconciles; persistent disagreement → user-queue entry, do not silently override one model with the other.

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
  subagent_type: 'Explore',
  prompt: 'Locate every reference to <symbol> ...',
});
```

**Forbidden**: omitting `model`. Implicit Opus is expensive and slow.

## Pre-implementation plan-critic loop (opus + codex)

Before dispatching the sonnet executor, the plan must clear this gate exactly once per Plan or per discrete task:

1. main authors the plan or dispatches `planner` (opus)
2. `oh-my-claudecode:codex` consult on the plan draft → returns concerns
3. main edits plan (or dispatches `oh-my-claudecode:critic` opus) to address concerns
4. on agreement, plan is frozen — written to `docs/plans/<file>.md` with a `## Frozen` header line
5. only frozen plans may feed a sonnet executor dispatch

2 consecutive critic / codex FAILs on the plan → halt + user-queue, no code is written. This is the autonomous-loop halt condition mirroring `kzk-autonomous-boundary`.

## Subagent prompt requirements (fresh subagent has zero memory)

Every dispatch prompt must include:

- Scope (file paths, line ranges)
- Plan file path (which task within) — **frozen plan only when dispatching to sonnet**
- Required reading list (CLAUDE.md, the spec doc, sister files)
- Rules block: TDD strict + context7 mandate + `kzk-pre-commit-gate` (incl. **Gate 0 AGENTS.md sync** — touched-files AGENTS.md goes in the SAME commit) + DO-NOT-MODIFY paths + branch boundary (your-feature-branch)
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

Trusting only the agent's summary text = forbidden.

## Session-6 lesson (do not repeat)

(2026-04-20, ui-migration-shadcn M7 HALT recovery): main context directly ran Edit + Bash + Playwright for M2/M4/M6 cleanup. Result: (1) main-context token bloat, (2) linter timestamp race → repeated Edit failures, (3) quality regressions — token gaps, `a` rule override, accent collisions all missed.

Re-prevention:

1. Detect "large" → immediately invoke `/superpowers:subagent-driven-development`
2. Skill demands `docs/plans/<name>.md` first (2-5 task TDD format)
3. Fresh subagent dispatch = `Agent` tool + `subagent_type="oh-my-claudecode:executor"` + `model="sonnet"` (default for implementation; see Model routing table) + frozen plan path + context7 mandate + Pre-commit Gate 0-4 all in prompt
4. Main reviews subagent return → gate check → commit+push, OR re-dispatch fresh subagent on failure
5. 2 consecutive subagent failures → halt + user-queue entry. Main does NOT take over.
