---
name: kzk-autonomous-boundary
version: 1.0.12
description: "Autonomous-mode boundary — what the agent may and may NOT do without per-step user confirmation. Covers main-branch ban, halt conditions, and when autonomous mode is even allowed. Required triggers: 'autonomous', 'ralph로 돌려', 'ralph로 체크', 'ralph로 확인', '자는 동안 진행', '실행해놔야 queue 보지', '끝까지 끝내줘', 'feature branch boundary', 'main 직접 접근', 'reviewer FAIL'."
---

> Authoritative source: repo `CLAUDE.md` "Autonomous Execution Boundary" + `harness-share.md` §2. On conflict, those win.

# kzk-autonomous-boundary

Autonomous mode = explicit user permission only. Triggers: "ralph로 돌려", "자는 동안 진행해", "실행해놔야 queue 보지", "끝까지 끝내줘". No autonomous mode = no auto-commits, no agent dispatch chains.

## Allowed actions (autonomous mode ON)

- Auto-commit after `kzk-pre-commit-gate` full PASS (6 gates if AGENTS.md hierarchy present, otherwise 5; Gate 0 N/A without hierarchy; see that skill)
- Move to next task after TDD test passes
- Worktree parallel execution (`/superpowers:using-git-worktrees`)
- Subagent dispatch (`oh-my-claudecode:code-reviewer`, `oh-my-claudecode:critic`, `oh-my-claudecode:verifier`) replacing interactive review skills
- Document writing, plan elaboration, review execution

## Forbidden actions

- **`main` branch is off-limits.** All work happens on `feature/<topic>`. PR target = same. `main` merge requires explicit user "merge it" after experiment ends.
- Auto-overriding user PRD / design docs (must follow Documentation Storage Rules in repo CLAUDE.md)
- Force-commit when a Pre-commit Gate fails
- Adding files outside the declared source root (see CLAUDE.md for your repo's rootDir constraints)
- Continuing the loop after `ralph` reviewer FAILs **2 times in a row** → halt + user-queue entry
  Exception: `kzk-web-loop` intentionally overrides this — skip the failing issue, pick the next one (see `kzk-web-loop` §Failure Handling and `harness-share.md` §25 "Reviewer FAIL override").

## Halt conditions (entire autonomous run)

Halt and append a user-queue entry when:

- reviewer/critic 2 consecutive FAIL
- build / test 3 consecutive FAIL
- `main` access required for the next step
- A user-queue decision is required to proceed
- Crossing into a code/plan area pre-dating a current rule (e.g. plan written before PRD v1.13) — halt, do NOT retroactively rewrite policy via subagent guess

Anything else → keep going (see `kzk-autonomous-loop` for polite-stop ban).

## Rollback / revert policy

If the autonomous loop committed code that is later found to be wrong (reviewer FAIL after commit, or test regression discovered in a later cycle):

1. `git revert <sha>` — prefer revert over reset; preserves history
2. Never `git reset --hard` on a pushed branch without explicit user "hard reset it"
3. Append a user-queue entry with: which commit, why reverted, what the correct approach should be
4. Resume the loop from the next issue — do not re-attempt the same issue immediately after revert

## Branch policy

- Default feature branch: `feature/<topic>`.
- One Plan = one PR (no batch). First plan-direction error → others stay protected
- PR description must include "CLAUDE.md updated to match current state" + "deepinit ran" lines (see `kzk-pre-merge-sync`)

## Interaction with other kzk-*

- **kzk-tool-retry**: When any Edit/Write/Bash fails during autonomous execution, apply 1-retry before halting or queuing. This skill defines halt conditions; kzk-tool-retry defines the single-call retry discipline that runs before those conditions are evaluated.
- **kzk-autonomous-loop**: polite-stop ban and multi-Plan continuation rules. This skill defines what STOPS the loop; that one defines how the loop CONTINUES.
- **kzk-user-queue**: halt conditions that require a user decision append entries here and await a DECISION line before resuming.
