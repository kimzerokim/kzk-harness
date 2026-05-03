---
name: kzk-autonomous-loop
version: 1.0.3
description: "The autonomous loop never stops politely. Combines rate-limit polling (Anthropic 5h), context-budget /compact at 80%, and multi-Plan auto-continuation. Required triggers: 'rate limit', '5h window', 'ScheduleWakeup', '/compact', 'context budget', 'polite stop', 'next Plan', 'Plan auto-continuation'."
---

> Authoritative source: `harness-share.md` §12 / §13 / §14. On conflict, that wins.

# kzk-autonomous-loop

The autonomous loop continues until all tasks done OR a halt condition fires (see `kzk-autonomous-boundary`). Polite stops are forbidden.

## Rate-limit polling (Anthropic 5h window)

Hitting the 5h limit during autonomous run:

1. Do NOT declare stop. Schedule `ScheduleWakeup(delaySeconds=600)` (10 min)
2. Wakeup prompt = "계속 autonomous plan 이어서 진행 (rate limit 해제 확인)"
3. Still blocked at wakeup → re-schedule `ScheduleWakeup(delaySeconds=600)` again
4. Released → resume from the in-progress task list (`harness-flow-progress.md` Session N)
5. Total elapsed → `harness-flow-progress.md` records "rate-limit wait N회, 누적 대기 Xh"

A real new-topic message from the user takes priority over a scheduled wakeup.

## Context budget — auto `/compact` at 80%

Per turn, internally estimate context-token usage from system reminder hints. At ≥ 80% usage:

1. Do NOT stop. Run `/compact` just before starting the next task
2. Immediately after `/compact`, restate in one line: current Plan / in-progress task / remaining tasks. Preserves continuity
3. Allowed to call `/compact` multiple times in one autonomous run if context refills

Polite-stop here is forbidden too — completion within the user-granted autonomous scope means run until done, even across multiple compacts.

## Plan auto-continuation (multi-Plan run)

Sequence Plan A → Plan B → ... → Plan N in one autonomous session:

- Plan complete = (a) PR pushed (or branch direct push) + (b) checkpoint commit + (c) `harness-flow-progress.md` updated. After these 3 steps, **immediately dispatch the next Plan with no user prompt**.
- **Open PR conflict guard**: if Plan B touches files that are also in Plan A's open PR, check for conflict via `git merge-base HEAD <plan-a-branch>` before dispatching Plan B executor. If same-file overlap found → append to user-queue and defer Plan B until Plan A merges.
- Anti-pattern: "I'll wait for user approval before Plan B." Forbidden inside autonomous scope.
- Between Plans, inject:
  - `superpowers:subagent-driven-development` — fresh subagent per task + two-stage review
  - `superpowers:verification-before-completion` — commit-time evidence required
- Independent 2+ tasks → `superpowers:dispatching-parallel-agents`
- No mid-run progress reports. Final summary only when all Plans finish OR a halt condition fires.

## Plan-boundary checkpoints

Each Plan boundary records pass/fail in `harness-flow-progress.md` Session N "체크포인트 Log". Plan-by-Plan PRs (no batch merge) — first plan-direction error → others stay protected. Ambiguous decisions go to `docs/harness/user-queue.md` (see `kzk-user-queue`). Crossing un-applied policy areas (e.g. plan written before PRD v1.13) → halt + user-queue entry; do NOT silently rewrite policy.

## Halt conditions (re-stated; canonical source: `kzk-autonomous-boundary`)

- reviewer/critic 2 consecutive FAIL (Exception: `kzk-web-loop` overrides this — skip issue, pick next; see `harness-share.md` §25 "Reviewer FAIL override")
- build/test 3 consecutive FAIL
- `main` access required next step
- user-queue decision required
- pre-PR `/deepinit` failed at PR-creation time (runs on feature branch tip before `gh pr create`; see `kzk-pre-merge-sync`)

Anything else → continue.

## Visibility (Session-12 lesson)

If a turn ends without progress narration, the user perceives stuck-state. Always include at least one of: progress update (file count / commit / phase) | latest background-agent text snippet | explicit "next signal: <X complete notification>" line. See `kzk-playwright-verification` "Result narration" section — same rule.
