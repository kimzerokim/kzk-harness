---
name: kzk-web-loop
version: 1.0.0
description: "Autonomous web page improvement loop — runs indefinitely, self-generates tasks via a fresh evaluator agent every cycle. Required triggers: 'web loop', '웹 루프', '12시간', '자율 개선', 'loop forever', '무한 개선'."
---

> Authoritative source: repo `docs/superpowers/specs/2026-05-03-kzk-web-loop-design.md` + `harness-share.md §25`. On conflict, those win.

# kzk-web-loop

Runs a self-directed improvement cycle on a web project until the user explicitly stops it. Never asks the user for direction — generates its own task queue from a built-in evaluation checklist every cycle.

## Entry

Say a trigger keyword, optionally with a one-line goal:

```
웹 루프 시작해줘 [optional one-line goal]
```

If no goal is given, infer from the existing codebase on the first cycle (read `CLAUDE.md`, `README.md`, and main entry file).

## Loop Structure

Each cycle executes these steps in order:

1. **EVALUATOR AGENT** (`oh-my-claudecode:critic`, `model=opus`) — fresh subagent with zero memory of previous cycles. Runs the built-in checklist (see §Evaluation Criteria). Outputs a prioritized issue list: P0 / P1 / P2.

2. **Pick top-priority issue** — take the highest-severity unclaimed issue from the list.

3. **Ambiguous?** — If any decision is unclear, append a `kzk-user-queue` entry with a tentative default and continue immediately. Never stop to ask the user.

4. **EXECUTOR AGENT** (`oh-my-claudecode:executor`, `model=sonnet`) — receives the frozen issue description + file scope + branch name + pre-commit gate rules. Implements via TDD, passes `kzk-pre-commit-gate` (all 4 gates), commits.

5. **Update `harness-flow-progress.md`** — one-line entry: cycle number, issue completed, queue length, Playwright status.

6. **Back to step 1.**

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
   → not found → skip to DEGRADED MODE immediately

② Call browser_navigate(url)
   → response received → proceed with screenshot + snapshot

   → no response / error:
      Attempt 1: `claude mcp list` → re-register if missing (`claude mcp add playwright npx '@playwright/mcp@latest'`)
      Attempt 2: wait 10 s → retry browser_navigate once
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
| Reviewer FAIL 2× on same task | Skip → next issue | No |
| Playwright MCP hangs | Cascade recovery → degraded mode | No |
| Playwright auth expired | Skip visual this cycle → continue | No |
| Rate limit (5 h window) | `ScheduleWakeup(delaySeconds=600)` → resume | No |
| Context ≥ 80 % | `/compact` → one-line restate → continue | No |
| Subagent returns BLOCKED | Skip → next issue | No |
| Git conflict | `git fetch && git rebase` → skip file if fails | No |
| Missing npm package | `npm install <pkg>` → retry | No |
| Evaluator finds no issues | Deepen criteria level → always find something | No |
| Every issue in queue blocked | Halt + user-queue summary | Yes |
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

Every evaluator and executor dispatch prompt must include (per `kzk-large-task-delegation`):

- Scope: file paths + line ranges
- Branch name (never `main`)
- Required reading: `CLAUDE.md`, spec doc path, harness-share.md §25
- Rules: TDD strict, context7 mandate, `kzk-pre-commit-gate` gates 0-4, DO-NOT-MODIFY paths
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
