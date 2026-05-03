# kzk-web-loop Design Spec

**Date:** 2026-05-03  
**Status:** Draft — pending user review  
**Scope:** New harness skill `kzk-web-loop` — autonomous web page improvement loop

---

## 1. Problem

The current harness stops mid-run to ask the user two types of questions:

- **Direction questions** ("What should I do next?") — Claude lacks a self-directed task source
- **Implementation decisions** ("How should I handle this case?") — Claude defers ambiguous choices to the user

Additionally, Playwright MCP calls frequently hang without response, causing the loop to stall. The user runs in bypass-permissions mode, so tool approval prompts are not a concern.

**Goal:** A loop that runs for 12+ hours without user intervention, self-generates its own improvement tasks, and recovers gracefully from failures.

---

## 2. Solution Overview

A new skill `kzk-web-loop` that sits on top of the existing 12 `kzk-*` skills and introduces:

1. **A+B hybrid loop** — built-in evaluation criteria (A) + fresh evaluator agent every cycle (B)
2. **Self-directed task generation** — evaluator agent produces a prioritized issue list each cycle
3. **Playwright as optional enhancement** — cascade recovery; loop continues in degraded mode if unavailable
4. **No halt except system failure** — every failure skips the current issue and picks the next one

---

## 3. Loop Architecture

```
START
  │
  ▼
┌─────────────────────────────────────────────────────────┐
│  ② EVALUATOR AGENT  (fresh subagent every cycle)        │
│  • Playwright screenshots + snapshots (if available)    │
│  • vitest + e2e test run                                │
│  • Console error count                                  │
│  • Built-in checklist (see §5)                          │
│  Output: prioritized issue list  P0 / P1 / P2           │
└─────────────────────────────────────────────────────────┘
  │
  ├─ Ambiguous decision? ──► user-queue (tentative default) ──► continue
  │
  ▼
┌─────────────────────────────────────────────────────────┐
│  ③ EXECUTOR AGENT  (sonnet, per kzk-large-task-delegation)│
│  • Takes top-priority issue                             │
│  • TDD → implement → kzk-pre-commit-gate (4 gates)     │
│  • Commits on PASS                                      │
└─────────────────────────────────────────────────────────┘
  │
  ▼
④ Update harness-flow-progress.md
  │
  └──────────────────────────────────────────► back to ②
```

The loop runs until the user explicitly stops it. There is no automatic termination.

---

## 4. Failure Handling (no halt policy)

Every failure skips the current issue and picks the next one from the queue. Failures are recorded in `docs/harness/user-queue.md` but never stop the loop.

| Scenario | Recovery action | True halt? |
|---|---|---|
| Build fails 3× on same issue | Skip issue → next P1 | Only if every issue in queue fails 3× (nothing left to try) |
| Reviewer FAIL 2× on same task | Move to user-queue → next issue | No |
| Playwright MCP hangs | Cascade recovery (§6) → degraded mode | No |
| Playwright auth expired | Skip visual check this cycle → continue | No |
| Rate limit (5h window) | `ScheduleWakeup(600s)` → resume | No |
| Context 80% | `/compact` → restate state → continue | No |
| Subagent returns BLOCKED | user-queue → next issue | No |
| Git conflict | Auto-rebase → skip file if fails | No |
| Missing package | Auto-install → retry | No |
| Evaluator finds no issues | Deepen criteria (P2 → refactor → docs) | No |
| System-level failure (disk full) | Cleanup temp files → retry | Yes (last resort) |
| User explicit stop | Immediate halt | Yes |

---

## 5. Built-in Evaluation Criteria

The evaluator agent checks these criteria every cycle, in priority order.

### P0 — Must fix before anything else
- Console errors > 0
- Test suite failures (vitest or e2e)
- Build errors / TypeScript compile errors
- Layout visually broken (elements overlapping, invisible, clipped)

### P1 — Fix in current or next cycle
- Accessibility: unlabeled buttons/inputs, insufficient color contrast (WCAG AA)
- Responsive layout broken at mobile (375px) or tablet (768px) breakpoints
- Perceived loading delay on primary interactions (> 300ms feedback)
- Missing error states for form submissions or async operations

### P2 — Improvement opportunities
- Code complexity (cyclomatic complexity > 10 per function)
- Duplication (same logic in 3+ places)
- Type safety gaps (`any`, unsafe casts)
- Design inconsistency (spacing, color tokens not from design system)
- Missing test coverage for touched files
- Inline documentation absent for non-obvious logic

When the evaluator finds no P0/P1 issues, it deepens the search:  
`P2 → refactor opportunities → performance → documentation gaps`  
There is always something to improve; the loop never runs out of tasks.

---

## 6. Playwright Resilience

Playwright is treated as an **optional enhancement**, not a requirement.

```
Playwright needed
  │
  ├─ Pre-flight: ToolSearch("+browser navigate") ──► not found?
  │                                                    └─► skip to degraded mode
  ▼
browser_navigate called
  │
  ├─ Response received ──► screenshot + snapshot → continue normally
  │
  └─ No response / error
       ├─ Attempt 1: claude mcp list → re-register if missing
       ├─ Attempt 2: 10s wait → retry browser_navigate once
       └─ Attempt 3: still failing → DEGRADED MODE
                       • Skip visual check this cycle
                       • Log "visual check unavailable" to user-queue
                       • Continue with test + code analysis only
                       • Auto-retry Playwright on next cycle
```

Playwright drop never halts the loop. Visual verification resumes automatically when the MCP connection recovers.

---

## 7. State Persistence

Across rate limits, context resets, and `/compact` calls, the loop maintains continuity via `harness-flow-progress.md`:

- Current cycle number
- Last completed issue (P-level + description)
- Remaining issue queue snapshot
- Playwright availability status
- Rate-limit wait count and cumulative wait time
- user-queue entry count

After `/compact`, the loop restates in one line: "Cycle N, last completed: [issue], queue: [N remaining], Playwright: [ok/degraded]"

---

## 8. Integration with Existing Skills

`kzk-web-loop` reuses existing skills and does not duplicate their logic:

| Dependency | What it provides |
|---|---|
| `kzk-autonomous-loop` | Rate-limit polling, context budget /compact, multi-plan continuation |
| `kzk-autonomous-boundary` | Branch policy (feature branch only, main off-limits) |
| `kzk-playwright-verification` | Playwright debug cheatsheet, result narration mandate |
| `kzk-user-queue` | Append-during-autonomous protocol, tentative defaults |
| `kzk-large-task-delegation` | Subagent dispatch rules, model routing (sonnet executor, opus evaluator) |
| `kzk-pre-commit-gate` | 4-gate commit validation |
| `kzk-background-monitoring` | Background agent result narration |

---

## 9. Skill Trigger

`kzk-web-loop` activates on keywords (same pattern as other `kzk-*` skills — loaded by Claude when a keyword appears in conversation):  
`"web loop"`, `"웹 루프"`, `"12시간"`, `"자율 개선"`, `"loop forever"`, `"무한 개선"`

Entry — say one of the trigger keywords, optionally followed by a one-line goal:
```
웹 루프 시작해줘 [optional one-line goal]
```
If no goal is provided, the evaluator infers the goal from the existing codebase on the first cycle.

---

## 10. Out of Scope

- Non-web projects (backend-only, CLI tools)
- Batch merge to `main` (user must approve merges explicitly)
- Modifying PRD / design docs without user direction
- Token cost optimization (nice-to-have, not a priority for v1)
