# kzk-web-loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `kzk-web-loop` skill to the harness that runs an autonomous, self-directed web page improvement loop indefinitely without asking the user for direction.

**Architecture:** Three files change — a new skill SKILL.md (the core protocol), a new §25 in harness-share.md (the authoritative reference section), and an updated README.md. The skill reuses all 12 existing kzk-* skills and adds only the web-loop-specific logic.

**Tech Stack:** Markdown (skill files), existing kzk-harness skill pattern.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `skills/kzk-web-loop/SKILL.md` | Core skill protocol — loop structure, evaluation criteria, Playwright resilience, failure handling |
| Modify | `harness-share.md` | Append §25 — authoritative summary referenced by the skill |
| Modify | `README.md` | Add kzk-web-loop to skills table; update "12 kzk-* skills" → "13 kzk-* skills" |

---

## Task 1: Create `skills/kzk-web-loop/SKILL.md`

**Files:**
- Create: `skills/kzk-web-loop/SKILL.md`

- [ ] **Step 1: Create the skill directory and file**

```bash
mkdir -p skills/kzk-web-loop
```

- [ ] **Step 2: Write the complete SKILL.md**

Write the following content exactly to `skills/kzk-web-loop/SKILL.md`:

```markdown
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
```

- [ ] **Step 3: Verify frontmatter format**

```bash
head -6 skills/kzk-web-loop/SKILL.md
```

Expected output — first line must be `---`, fifth line `---`:
```
---
name: kzk-web-loop
version: 1.0.0
description: "Autonomous web page improvement loop ...
---
```

- [ ] **Step 4: Verify trigger keywords are in description**

```bash
grep -c "web loop\|웹 루프\|12시간\|자율 개선\|loop forever\|무한 개선" skills/kzk-web-loop/SKILL.md
```

Expected: `6` (all six trigger phrases present)

- [ ] **Step 5: Verify evaluation criteria coverage**

```bash
grep -c "P0\|P1\|P2" skills/kzk-web-loop/SKILL.md
```

Expected: ≥ `6` (at least two occurrences per level)

- [ ] **Step 6: Verify failure recovery patterns**

```bash
grep -c "ScheduleWakeup\|/compact\|user-queue\|DEGRADED" skills/kzk-web-loop/SKILL.md
```

Expected: ≥ `4`

- [ ] **Step 7: Commit**

```bash
git add skills/kzk-web-loop/SKILL.md
git commit -m "feat: add kzk-web-loop skill

Autonomous web page improvement loop — A+B hybrid with
fresh evaluator agent per cycle, no-halt failure recovery,
and Playwright cascade resilience."
```

---

## Task 2: Add §25 to `harness-share.md`

**Files:**
- Modify: `harness-share.md` (append after §24)

- [ ] **Step 1: Verify current last section**

```bash
grep -n "^## 24" harness-share.md
```

Expected: one match. Confirms §25 is the correct next number.

- [ ] **Step 2: Append §25 to harness-share.md**

Append the following block at the very end of `harness-share.md` (after the existing §24 content):

```markdown

---

## 25. kzk-web-loop — Autonomous Web Improvement Loop

Full spec: `docs/superpowers/specs/2026-05-03-kzk-web-loop-design.md`. Skill: `skills/kzk-web-loop/SKILL.md`.

### Purpose

Run a self-directed improvement cycle on a web project until the user explicitly stops it. Never asks for direction — generates tasks from a built-in P0/P1/P2 checklist every cycle.

### Loop (one sentence each)

1. Fresh evaluator agent (opus) runs the built-in checklist → outputs prioritized issue list.
2. Main picks top issue; ambiguous decisions → user-queue entry with tentative default, never stop.
3. Executor agent (sonnet) implements via TDD → pre-commit gate → commit.
4. Update `harness-flow-progress.md` one-liner → back to step 1.

### Evaluation Priority

- **P0** (block all): console errors, test failures, build errors, broken layout.
- **P1** (this cycle): accessibility, responsive breakpoints, missing error states, slow feedback.
- **P2** (improvement): complexity, duplication, type gaps, design inconsistency, coverage, docs.
- **Deepen**: when no P0/P1 found, shift to P2 → refactor → performance → docs. Loop never runs out.

### No-halt Policy

Every failure skips the current issue and picks the next. Halt only when: (a) user stops explicitly, (b) every queue item failed 3×, (c) system-level failure. Rate limit → `ScheduleWakeup(600s)`. Context 80% → `/compact` + one-line restate. Playwright drop → cascade recovery → degraded mode (test-only), auto-retry next cycle.

### State

One-liner per cycle in `harness-flow-progress.md`:
`Cycle N (YYYY-MM-DD HH:MM) — [P-level] [issue] — queue: N remaining — PW: ok|degraded`

After `/compact`, restate: "Cycle N, last: [issue], queue: [N remaining], PW: [ok/degraded]"
```

- [ ] **Step 3: Verify §25 was appended correctly**

```bash
grep -n "^## 25" harness-share.md
```

Expected: one match showing the new section.

- [ ] **Step 4: Commit**

```bash
git add harness-share.md
git commit -m "docs: add §25 kzk-web-loop reference to harness-share"
```

---

## Task 3: Update `README.md`

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add kzk-web-loop to the skills table**

In `README.md`, find the line:
```
| `kzk-user-queue` | ambiguous decision, user returns, queue review |
```

Add the following line immediately after it:
```
| `kzk-web-loop` | web loop, 웹 루프, 12시간, 자율 개선, loop forever, 무한 개선 |
```

- [ ] **Step 2: Update the skill count references**

In `README.md`, find:
```
Installs 12 `kzk-*` skills into any project
```
Replace with:
```
Installs 13 `kzk-*` skills into any project
```

Find:
```
listing all 12 kzk-* skills with their trigger keywords
```
Replace with:
```
listing all 13 kzk-* skills with their trigger keywords
```

- [ ] **Step 3: Verify table has 13 rows**

```bash
grep -c "^| \`kzk-" README.md
```

Expected: `13`

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add kzk-web-loop to README skills table (13 skills)"
```

---

## Self-Review Checklist

- [x] **Spec §1 (Problem)** — covered in SKILL.md preamble + §Failure Handling no-halt policy
- [x] **Spec §3 (Loop Architecture)** — covered in SKILL.md §Loop Structure (steps 1-6)
- [x] **Spec §4 (Failure Handling)** — covered in SKILL.md §Failure Handling table (12 rows)
- [x] **Spec §5 (Evaluation Criteria)** — covered in SKILL.md §Evaluation Criteria (P0/P1/P2 + deepen rule)
- [x] **Spec §6 (Playwright Resilience)** — covered in SKILL.md §Playwright Resilience (3-attempt cascade)
- [x] **Spec §7 (State Persistence)** — covered in SKILL.md §State Persistence + harness-share.md §25
- [x] **Spec §8 (Integration)** — covered in SKILL.md §Subagent Dispatch Requirements
- [x] **Spec §9 (Trigger)** — covered in SKILL.md frontmatter description + §Entry
- [x] **Spec §10 (Out of Scope)** — no tasks touch main branch, PRD docs, or backend-only projects
- [x] **No placeholders** — all steps have complete content, commands, and expected output
- [x] **Type consistency** — `oh-my-claudecode:critic` / `oh-my-claudecode:executor` used consistently
- [x] **harness-share.md §25** reference added to SKILL.md authoritative source line
