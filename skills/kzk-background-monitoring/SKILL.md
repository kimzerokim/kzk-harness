---
name: kzk-background-monitoring
version: 1.5.0
description: "Background task ownership discipline. Spawning agent owns task until terminal state. Stuck thresholds: subagent ≥5min, Bash ≥3min, codex no-first-token 60s. Kill+diagnose+retry, subagent completion verification, session-resume restate-before-dispatch. Triggers: run_in_background, Monitor, long-running. References harness-share.md §23."
---

> Authoritative source: `harness-share.md` §23. On conflict, that wins.

# kzk-background-monitoring

## Stuck detection thresholds

| Task type | Stuck threshold |
|---|---|
| **Bash background** | **≥ 3 min** no output growth |
| Subagent dispatch | ≥ 5 min no completion |
| codex / streaming | No first token in **60s**, or no new output in 5 min total |

Additional signals: CPU 0%, stderr shows `Reading additional input from stdin...`, wall time ≥ 2× expected.

## Narration mandate

**After every tool with response time ≥ 2s: output 1-3 sentences of interpretation + named next action BEFORE the next call.**

Examples: what the result means, whether it succeeded, what happens next. See `kzk-playwright-verification` for per-tool narration shape table.

## Action contract

1. **At spawn**: state expected duration in one sentence. Move on to other work.
2. **Active polling**: ≤ 5 min → `Bash run_in_background`; longer/uncertain → `Monitor` with filter catching both success AND failure signatures (`grep -E "Error|FAIL|Traceback|tokens used|exit code"`).
3. **Stuck handling — kill + diagnose + retry. No user input.**
   - `pkill -f <command-pattern>` → inspect stderr/output/process state → change call shape → one retry.
   - Second failure → user report + alternative proposal. No silent re-spawn.
4. **Error detection**: stderr or non-zero exit → immediate user report. Silent failure forbidden.

## Stuck-diagnosis quick set

```bash
ls -la <output-file>                      # size + mtime
ps -p <pid> -o lstart,etime,pcpu,state    # process state
cat <stderr-file>                          # error / hang signal
```

## Subagent completion verification

When `Agent()` returns, output receipt line BEFORE processing:
```
Subagent [name] returned — [N chars / result summary]. Processing result...
```
If result is empty or truncated → `Q-SUBAGENT-EMPTY-[name]` to `docs/harness/user-queue.md`, continue.

**Session resume**: after ScheduleWakeup / rate-limit wakeup, read `harness-flow-progress.md` and output: `"Resuming: Cycle N, last: [issue], queue: [N remaining], next action: [X]"`.

## Anti-patterns

- ❌ Silence until user re-asks ("알림 받으면 처리할게요")
- ❌ Output file 0 byte for 3+ min (Bash) / 5+ min (subagent) and no action
- ❌ `Monitor` filter matching only the success path
- ❌ Asking user "should I cancel?" instead of autonomous kill+retry
- ❌ No narration between long-running tool calls

## Interaction with other kzk-*

- **kzk-tool-retry**: single-call retry policy. This skill: spawn-to-terminal lifecycle.
- **kzk-autonomous-loop**: uses this skill's polling discipline for rate-limit windows.
- **kzk-playwright-verification**: narration shape table (Playwright tools) — same discipline applies here.
