---
name: kzk-background-monitoring
version: 1.1.0
description: "Agent owns every background task it spawns — active monitoring until completion, stuck detection, never waits for user to ask. Top triggers: 'background', 'run_in_background', 'stuck', 'is it done', 'background task hung'. Body §Triggers for full list."
---

> Authoritative source: `harness-share.md` §23. On conflict, that wins.

# kzk-background-monitoring

## Triggers

`background`, `monitor`, `long-running`, `stuck`, `codex consult`, `is it done`, `background task hung`, `run_in_background`, `Monitor tool`.

Once you spawn a background task, you own it until it terminates (success, failure, or kill). The user asking "어떻게 됐어?" is a violation, not a check-in.

## Scope

- `Bash run_in_background: true`
- `Monitor` tool
- `codex exec` and any external CLI invoked as long-running
- Subagent dispatch (notifications arrive but stuck is still possible)
- `npm install`, `docker build`, `pnpm test`, full-suite `vitest`, anything ≥ 5s

## Action contract

1. **At spawn**: state expected duration in one sentence ("codex consult ~2-3 min"). Move on to other productive work.
2. **Active polling**: choose by duration:
   - ≤ 5 min: `Bash run_in_background` + auto completion notification
   - longer / uncertain: `Monitor` with stdout filter that catches success AND every failure signature (`grep -E "Error|FAIL|Traceback|tokens used|exit code"`)
   - manual loop: `until <terminal-condition>; do sleep N; done` — `terminal-condition` covers both success and failure
3. **Stuck detection** — declare stuck on any of:
   - Output file size has not grown (thresholds: subagent ≥ 5 min; Bash background ≥ 3 min; codex / streaming tools: no first token within 60s, or no new output within 5 min total)
   - Process CPU usage 0
   - stderr shows hang signals like `Reading additional input from stdin...`
   - Wall time exceeds 2× the expected duration
4. **Stuck handling — kill + diagnose + retry. Do not wait for user input.**
   - `pkill -f <command-pattern>` to free the slot
   - Inspect stderr / output file / process state for root cause
   - Change the call shape (prompt as arg vs stdin, heredoc escape, env var, smaller prompt)
   - One retry. Second failure → user report + alternative proposal. Do not silently re-spawn forever.
5. **Error detection**: stderr or non-zero exit → immediate user report. Silent failure is forbidden.
6. **Completion**: process the result and proceed. Autonomous = next task. Interactive = user-facing report.

## Anti-patterns

- ❌ "Background에 띄웠어요. 알림 받으면 처리할게요" → silence until user re-asks
- ❌ Waiting for the OS / harness timeout when stuck is already obvious
- ❌ Output file 0 byte for 5+ min and no action
- ❌ Ignoring `Reading additional input from stdin...` and similar hang signals
- ❌ `Monitor` filter that only matches the success path (failure is silent)
- ❌ Refusing to kill+retry; instead asking the user "should I cancel?"
- ❌ Polite-stop ("Background task is still running. Should I wait?") — that's the violation

## Stuck-diagnosis quick set

```bash
ls -la <output-file>                     # size + mtime
ps -p <pid> -o lstart,etime,pcpu,state    # process state
cat <stderr-file>                         # error / hang signal
```

## Codex consult special case

For Codex specifically, see `kzk-spec-and-review` §Codex execution shape (60s-to-first-token rule, 5 min total stuck threshold, mitigation steps).

## Subagent completion verification

When an `Agent()` call returns, output a receipt line BEFORE processing results:

```
Subagent [name] returned — [N chars / result summary]. Processing result...
```

Then verify:
1. Result is non-empty and matches expected return format (e.g. evaluator should have a numbered issue list)
2. If result is empty or clearly truncated (ends mid-sentence, no conclusion): treat as BLOCKED → append `Q-SUBAGENT-EMPTY-[name]` to `docs/harness/user-queue.md` and continue to next task
3. Do NOT silently assume a completed-looking state is actual completion — always read and confirm the result before marking the task done

**Session resume after ScheduleWakeup / rate-limit:** At the first turn after a wakeup, before any new dispatch, read `harness-flow-progress.md` and output one-line state restatement: `"Resuming: Cycle N, last: [issue], queue: [N remaining], next action: [X]"`. This makes the resume point visible to both the user and the next tool call chain.

## Narration mandate (cross-link with kzk-playwright-verification)

Every Playwright tool result AND every long-running tool with response time ≥ 2s requires 1-3 sentence interpretation + named next action BEFORE the next call. Silence between tool calls = stuck appearance. See `kzk-playwright-verification` for the per-tool narration shape table; this skill enforces that the same discipline applies to non-Playwright long-running tools (Bash long-running, Agent dispatch, build, test).

## Interaction with other kzk-*

- **kzk-tool-retry** governs single-call retry policy. This skill governs spawn-time-to-terminal lifecycle.
- **kzk-autonomous-loop** uses this skill's polling discipline for rate-limit windows and context-budget polling.
- **kzk-playwright-verification** narration table is referenced from here for non-Playwright long-running tools.
