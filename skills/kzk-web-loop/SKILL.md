---
name: kzk-web-loop
version: 1.0.1
description: "Autonomous web page improvement loop — runs indefinitely, self-generates tasks via a fresh evaluator agent every cycle. Required triggers: 'web loop', '웹 루프', '12시간', '자율 개선', 'loop forever', '무한 개선'."
---

> Authoritative source: repo `docs/superpowers/specs/2026-05-03-kzk-web-loop-design.md` + `harness-share.md §25`. On conflict, those win.

# kzk-web-loop

Runs a self-directed improvement cycle on a web project until the user explicitly stops it. Solves two problems: (1) Claude lacks a self-directed task source and stops to ask for direction, (2) Playwright MCP calls frequently hang and stall the loop. This skill generates its own task queue from a built-in evaluation checklist and treats Playwright as an optional enhancement with cascade recovery.

## Entry

Say a trigger keyword, optionally with a one-line goal:

```
웹 루프 시작해줘 [optional one-line goal]
```

If no goal is given, infer from the existing codebase on the first cycle (read `CLAUDE.md`, `README.md`, and the main entry file: `package.json` `main` field → fallback to `src/index.*` → fallback to `src/main.*`).

If `harness-flow-progress.md` does not exist at repo root, create it with a single header line: `# harness-flow-progress` before the first cycle begins.

If `.web-loop/` and `.web-loop/plans/` directories do not exist, create them before the first cycle begins. These are gitignored — ephemeral per-cycle report and plan artifacts.

## Loop Structure

Each cycle executes these steps in order:

**1a. TOOL RUNNER** (`oh-my-claudecode:executor`, `model=sonnet`) — fresh subagent. Runs `npm test` (or project test command), Playwright screenshots + snapshots (if available, per §Playwright Resilience), counts console errors. Saves raw output to `.web-loop/cycle-N-report.md`. Returns immediately after saving — does not interpret results.

**1b. EVALUATOR AGENT** (`oh-my-claudecode:critic`, `model=opus`) — fresh subagent with zero memory of previous cycles. Reads `.web-loop/cycle-N-report.md` + the built-in checklist (see §Evaluation Criteria). Outputs a prioritized issue list: P0 / P1 / P2.

**2. Pick top-priority issue** — take the highest-severity issue from the list that is NOT already recorded in `harness-flow-progress.md` as "Cycle N: completed" or "Cycle N: skipped" for the **current cycle number**. Each cycle is independent — an issue fixed in Cycle 3 may recur and be picked again in Cycle 9.

**3. Ambiguous?** — If any decision is unclear, append an entry to `docs/harness/user-queue.md` (per `kzk-user-queue` skill) with a tentative default and continue immediately. Never stop to ask the user.

**4a. P0 fast path** — If the issue is P0, dispatch `oh-my-claudecode:executor` (`model=sonnet`) directly with the evaluator's issue description verbatim (passed as a quoted string, not re-interpreted) + file scope + branch name + pre-commit gate rules. Implements via TDD, passes `kzk-pre-commit-gate` (5 gates: 0–4 if AGENTS.md hierarchy present; 4 gates otherwise), commits.

**4b. P1/P2 plan gate** (per `kzk-large-task-delegation` plan-critic loop requirement) — If the issue is P1 or P2:
  1. PLANNER (`oh-my-claudecode:planner`, `model=opus`) authors a frozen plan for the issue → saved to `.web-loop/plans/cycle-N-plan.md` with a `## Frozen` header line.
  2. CRITIC (`oh-my-claudecode:critic`, `model=opus`) reviews the frozen plan. FAIL → planner revises once. Second consecutive FAIL → skip issue, append to `docs/harness/user-queue.md`, pick next issue.
  3. EXECUTOR (`oh-my-claudecode:executor`, `model=sonnet`) receives the evaluator's issue description verbatim + frozen plan path + file scope + branch name + pre-commit gate rules. Implements via TDD, passes `kzk-pre-commit-gate` (5 gates: 0–4 if AGENTS.md hierarchy present; 4 gates otherwise), commits.

**5. Update `harness-flow-progress.md`** — one-line entry: `Cycle N: completed — [P-level] [issue one-liner]` or `Cycle N: skipped — [reason]`.

**6. Back to step 1a.**

**Result narration:** Per `kzk-background-monitoring` + `kzk-playwright-verification` §Result-narration mandate, narrate 1-3 sentences after each subagent dispatch (tool runner / evaluator / planner / critic / executor): file count / commit / phase / latest output snippet. Silence between dispatches is forbidden.

The loop runs until the user explicitly stops it. No automatic termination.

## Evaluation Criteria

The evaluator agent checks these in strict priority order. When no P0/P1 issues remain, deepen automatically: `P2 → refactor opportunities → performance → documentation gaps`. There is always something to improve.

### P0 — Fix immediately (block everything else)
- Console errors > 0
- Test suite failures (vitest or e2e)
- Build errors / TypeScript compile errors
- Layout visually broken (elements overlapping, invisible content, clipped UI)

### P1 — Fix this cycle
- Accessibility: unlabeled `<button>` or `<input>`, color contrast failing WCAG AA
- Responsive layout broken at 375 px or 768 px breakpoints
- Primary interaction with > 300 ms feedback delay (no loading indicator)
- Missing error state for form submission or async operation

### P2 — Improvement opportunities
- Cyclomatic complexity > 10 per function
- Same logic duplicated in 3+ places
- `any` types or unsafe type casts
- Spacing / color values not from the project design system tokens
- Touched files with no test coverage
- Non-obvious logic without an inline explanation

## Playwright Resilience

Playwright is an **optional enhancement**. The loop continues without it.

```
① Pre-flight: ToolSearch("+browser navigate")
   → tool NOT in catalog → DEGRADED MODE immediately (skip steps ②-③)

② Call mcp__playwright__browser_navigate(url)
   → response received → proceed with screenshot + snapshot → done

   → no response / error → cascade recovery:
      Attempt 1: `claude mcp list` → if unregistered: `claude mcp add playwright npx '@playwright/mcp@latest'`
      Attempt 2: wait 10 s → retry mcp__playwright__browser_navigate once
      Attempt 3: still failing → DEGRADED MODE

DEGRADED MODE:
  • Skip visual check this cycle
  • Log "visual check unavailable, cycle N" to user-queue
  • Continue with test + code analysis only
  • Auto-retry Playwright pre-flight on next cycle
```

Playwright drop never halts the loop.

## Failure Handling

Every failure skips the current issue and picks the next one. All skipped issues are recorded in `docs/harness/user-queue.md`.

| Scenario | Recovery | True halt? |
|---|---|---|
| Build fails 3× on same issue | Skip → next issue | Only if every issue in queue fails 3× |
| Reviewer FAIL 2× on same task | Skip → next issue (overrides kzk-autonomous-loop's halt-on-reviewer-FAIL — intentional: keep the cycle moving across tasks) | No |
| Playwright MCP hangs | Cascade recovery → degraded mode | No |
| Playwright auth expired | Skip visual this cycle → continue | No |
| Rate limit (5 h window) | `ScheduleWakeup(delaySeconds=600)` → resume | No |
| Context ≥ 80 % | `/compact` → one-line restate → continue | No |
| Subagent returns BLOCKED | Skip → next issue | No |
| Git conflict | `git fetch && git rebase` → skip file if fails | No |
| Missing npm package | `npm install <pkg>` → retry | No |
| Evaluator finds no issues | Deepen criteria level → always find something | No |
| Every issue in queue blocked | Halt + user-queue summary | Yes |
| System-level failure (disk full, network down) | Cleanup temp files → retry; halt if unrecoverable | Yes (last resort) |
| User explicit stop | Immediate halt | Yes |

## State Persistence

After every cycle, append to `harness-flow-progress.md`:

```
Cycle N (YYYY-MM-DD HH:MM) — [P-level] [issue one-liner] — queue: N remaining — PW: ok|degraded
```

After `/compact`, restate in one line before the next tool call:
"Cycle N, last: [issue], queue: [N remaining], PW: [ok/degraded]"

This allows the loop to resume correctly after rate-limit wakeups and context resets.

## Subagent Dispatch Requirements

Every tool runner, evaluator, planner, critic, and executor dispatch prompt must include (per `kzk-large-task-delegation`):

- Scope: file paths + line ranges
- Branch name (never `main` — per `kzk-autonomous-boundary`)
- Required reading: `CLAUDE.md`, spec doc path, harness-share.md §25
- Rules: TDD strict, context7 mandate, `kzk-pre-commit-gate` (5 gates: 0–4 if AGENTS.md hierarchy present; 4 gates otherwise), DO-NOT-MODIFY paths
- Commit convention: English conventional commits, no Co-Authored-By
- Working directory absolute path
- Return format on success
- Halt condition: BLOCKED → user-queue entry

## Halt Conditions

Halt and append user-queue summary only when:
- User explicitly stops the loop
- Every issue in the current queue has failed 3× (nothing left to try)
- System-level failure that prevents any progress (disk full, etc.)

Anything else → keep going.
