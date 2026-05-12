---
name: kzk-autonomous-loop
version: 1.10.0
description: "Autonomous loop continuation — anti-polite-stop contract. Governs rate-limit polling (ScheduleWakeup 600s), extra-usage/overage tier override (no halt), auto /compact at 80% context, Plan A→N auto-continuation. Polite stops forbidden inside autonomous scope (9 canonical examples in body). References harness-share.md §12/§13/§14."
---

> Authoritative source: `harness-share.md` §12 / §13 / §14. On conflict, that wins.

# kzk-autonomous-loop

## Rate-limit polling (Anthropic 5h window)

Hitting the 5h limit during autonomous run:

1. Do NOT declare stop. Schedule `ScheduleWakeup(delaySeconds=600)` (10 min)
2. Wakeup prompt = "계속 autonomous plan 이어서 진행 (rate limit 해제 확인)"
3. Still blocked at wakeup → re-schedule `ScheduleWakeup(delaySeconds=600)` again
4. Released → read `harness-flow-progress.md`, output one-line state restatement before any dispatch: `"Resuming: Cycle N, last: [issue], queue: [N remaining], next action: [X]"`. Then resume.
5. Total elapsed → `harness-flow-progress.md` records "rate-limit wait N회, 누적 대기 Xh"

**Anti-pattern: silent resume.** A wakeup that immediately dispatches a subagent without restating position = the user cannot tell if the session is actually running or stuck from a failed prior Agent call. Always restate first.

A real new-topic message from the user takes priority over a scheduled wakeup.

### Extra-usage / overage tier — DO NOT halt (Cycle 51)

When the session is on Anthropic's extra-usage / overage / pay-per-use tier (not the strict 5h block), requests **continue** at higher cost — they don't truly stop. Signals:

- HUD or status banner showing "extra usage", "overage", "additional usage", or "pay-as-you-go"
- Cost-warning indicators that don't actually block requests
- User's session settings explicitly enable overage (`maxUsageTier`, `allowOverage`, etc.)

In overage mode, the agent MUST continue. Do NOT:
- Schedule `ScheduleWakeup` (no rate-limit reset to wait for — requests already work)
- Halt and ask the user "should I continue spending?" — user already authorized the autonomous run
- Slow down the loop or drop to lighter models without explicit user instruction

The 5h-window polling rule (above) applies ONLY when requests actually fail with the strict rate-limit error. Cost-only signals never halt — that's user's billing concern, not the agent's halt condition.

**Anti-pattern: cost-driven polite stop.** "extra usage 중이라 일단 멈추고 사용자 확인" 은 polite-stop 위반. cross-ref: §Polite-stop ban examples #9.

## Context budget — auto `/compact` at 80%

Per turn, internally estimate context-token usage from system reminder hints. At ≥ 80% usage:

1. Do NOT stop. Run `/compact` just before starting the next task
2. Immediately after `/compact`, restate in one line: current Plan / in-progress task / remaining tasks. Preserves continuity
3. Allowed to call `/compact` multiple times in one autonomous run if context refills

Polite-stop here is forbidden too — completion within the user-granted autonomous scope means run until done, even across multiple compacts.

## Plan auto-continuation (multi-Plan run)

Sequence Plan A → Plan B → ... → Plan N in one autonomous session:

- Plan complete = (a) PR pushed (or branch direct push) + (b) checkpoint commit + (c) `harness-flow-progress.md` updated. After these 3 steps, **immediately dispatch the next Plan with no user prompt**.
- **Open PR conflict guard**: if Plan B touches files that are also in Plan A's open PR, detect overlap by intersecting: `git diff --name-only origin/main...<plan-a-branch>` (files Plan A changed) ∩ Plan B's expected file scope. If intersection is non-empty → append to user-queue and defer Plan B until Plan A merges.
- Anti-pattern: "I'll wait for user approval before Plan B." Forbidden inside autonomous scope.
- Between Plans, inject:
  - `superpowers:subagent-driven-development` — fresh subagent per task + two-stage review
  - `superpowers:verification-before-completion` — commit-time evidence required
- Independent 2+ tasks → `superpowers:dispatching-parallel-agents`
- No mid-run progress reports. Final summary only when all Plans finish OR a halt condition fires.

### Polite-stop ban examples (canonical list — Cycle 48)

The following turn-ending patterns are all polite-stop violations under autonomous scope, even though no FAIL occurred:

1. **AskUserQuestion answer → ending turn** (Cycle 48 incident). After 3-slot contract Q is answered, agent MUST dispatch the next stage in the same turn. cross-ref: `kzk-autonomous-boundary §Post-contract continuation`.
2. **Tool result → presenting findings + waiting**. e.g. survey returns → agent summarizes findings + ends turn instead of moving to plan/spec. Findings are inputs to the next stage, not a stopping point.
3. **Plan A complete → "Should I proceed to Plan B?"** Forbidden. Auto-dispatch Plan B with no prompt (Open-PR conflict guard exception only).
4. **Reviewer 1× FAIL → halt**. Halt threshold is 2 consecutive (or web-loop's per-issue skip). 1 FAIL = retry once.
5. **Build 1-2× FAIL → halt**. Halt threshold is 3 consecutive. Anything below = retry / fix / continue.
6. **Subagent dispatch return → "Done, awaiting next instruction"**. The dispatch return is the signal to start the NEXT step, not a stop.
7. **`/compact` complete → ending turn** instead of immediate restate + resume.
8. **Edit/Write 1× FAIL → halt** (Cycle 50 incident, gridless session). Tool failure does NOT trigger polite halt. Per `kzk-tool-retry §Auto-retry`, single failure = same-turn re-read + retry. Halt threshold is **2 consecutive failures on the same file**, then queue Q-TOOL and proceed to next task. PostToolUse hook `edit-failure-retry.mjs` injects a forcing system-reminder on failure detection — agent cannot silently halt. cross-ref: `kzk-tool-retry §Forcing mechanism`.
9. **Cost / extra-usage / overage signal → halt** (Cycle 51). HUD shows "extra usage", "overage", "additional usage", "pay-as-you-go", or any cost-warning that doesn't actually block requests = NOT a halt condition. The user already authorized the autonomous run; cost is their billing concern. Continue. Only the strict 5h-window rate-limit error (where requests actually fail) triggers `ScheduleWakeup`. cross-ref: `§Rate-limit polling §Extra-usage / overage tier`.

If unsure whether a stop is allowed: it's not. Continue. Halt is reserved for the explicit conditions in `kzk-autonomous-boundary §Halt conditions`.

### Stop event hook — forcing mechanism (Cycle 52)

Doc-only enforcement of polite-stop ban repeatedly fails in practice (Cycles 50, 51 incidents). Cycle 52 added `install/hooks/autonomous-stop-guard.mjs` Stop event hook with smart completion detection:

- Marker file `~/.cache/kzk-harness/autonomous-active` written by `keyword-detector.mjs` when user prompt matches autonomous trigger phrase
- Stop hook reads marker; if active and within TTL, checks 2 completion signals:
  1. TodoWrite state (from transcript_path) — pending/in_progress count
  2. `docs/harness/user-queue.md` non-RESOLVED Pending count
- Open work detected → blocks stop with reason citing this skill, includes "type '그만' to halt" escape
- All clear → allows stop and clears marker

Marker reset triggers (in keyword-detector.mjs):
- User message contains '그만' / 'stop autonomous' / 'halt autonomous' / '끝났어' / '다 끝났어' → marker deleted
- TTL expiry (default 1hr, env `KZK_AUTONOMOUS_TTL_SEC`) → auto-cleanup on next stop
- Per-turn max-block 3 → escape hatch from runaway block loop

Skip conditions:
- `OMC_SKIP_HOOKS=autonomous-stop-guard` env → bypass
- Any internal hook error → fail-open (allow stop)

### Multi-plan CRG refresh requirement

At multi-Plan continuation (Plan A→B→…→N) start and between each plan, CRG refresh is mandatory:

1. **At start (immediately before Plan A)**: `code-review-graph build` full rebuild — reflects previous cycle commits. Takes ~30s–2min.
2. **At plan end (immediately after commit)**: `code-review-graph update` incremental — apply `kzk-pre-commit-gate §Post-commit CRG refresh`. Invalidate session cache (`CRG_LAST_BUILT_SHA` reset).
3. **Immediately before next plan (before entering Plan B)**: verify cache with `code-review-graph status`. If `CRG_LAST_BUILT_SHA` is reset (cache miss), re-trigger rule `(f)` → incremental update then proceed. Cache hit → trust and proceed.
4. **Additional CRG calls within the same plan in the same session**: trust `kzk-codebase-survey §Step 0.5 (f)` session cache. No repeated builds.

**Summary**: plan end = commit → CRG update → cache invalidate. Before next plan = cache miss check → (f) re-trigger → reload. Both are mandatory to state explicitly.

**Anti-pattern**: entering a new plan without reflecting the previous plan's commit — stale CRG causes fix-scope-expansion / codebase-survey to report outdated callsites.

**Skip condition**: `KZK_CRG_NO_REFRESH=1` env (for CI / debug).

## Plan-boundary checkpoints

Each Plan boundary records pass/fail in `harness-flow-progress.md` Session N "체크포인트 Log" (see `harness-share.md` §7 for Session N template). Plan-by-Plan PRs (no batch merge) — if a plan is later found to have the wrong direction (user feedback reverses approach after merge), other plans' PRs remain independent and unaffected. Ambiguous decisions go to `docs/harness/user-queue.md` (see `kzk-user-queue`). Crossing un-applied policy areas (e.g. plan written before PRD v1.13) → halt + user-queue entry; do NOT silently rewrite policy.

## Halt conditions

> See `kzk-autonomous-boundary` §Halt conditions (canonical). Anything else → continue.

## Visibility (Session-12 lesson)

If a turn ends without progress narration, the user perceives stuck-state. Always include at least one of: progress update (file count / commit / phase) | latest background-agent text snippet | explicit "next signal: <X complete notification>" line. See `kzk-playwright-verification` "Result narration" section — same rule.

## Interaction with other kzk-*

- **kzk-autonomous-boundary**: Canonical halt-condition owner. This skill's wakeup sequence MUST honor those halts.
- **kzk-background-monitoring**: Rate-limit polling discipline — wakeup after rate-limit reset must use background-monitoring's stuck-threshold rules.
- **kzk-web-loop**: Reviewer-FAIL override — web loop overrides this skill's halt-on-3-FAILs rule per harness-share §25.
- **kzk-user-queue**: Halts that pause the loop append a Q-AUTOLOOP entry here for the user to resolve.
