---
name: kzk-background-monitoring
version: 1.0.1
description: "Background process active monitoring mandate — agent owns every long-running task it spawns and never lets the user have to ask 'is it done?'. Applies to Bash run_in_background, Monitor, codex exec, npm install, docker build, subagent dispatch, anything ≥ 5s. Required triggers: 'background', 'monitor', 'long-running', 'stuck', 'codex consult', 'is it done', 'background task hung'."
---

> Authoritative source: `harness-share.md` §23. On conflict, that wins. Originated from `gridless` repo §2.5; portable to all projects.

# kzk-background-monitoring

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
   - Output file size has not grown for X minutes (codex / streaming tools must produce a token within 30-60s)
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

For Codex specifically, see `kzk-codex-cross-verification` §Codex execution shape (30s-to-first-token rule, 5 min 0-byte = stuck threshold, mitigation steps).

## Narration mandate (cross-link with kzk-playwright-verification)

Every Playwright tool result AND every long-running tool with response time ≥ 2s requires 1-3 sentence interpretation + named next action BEFORE the next call. Silence between tool calls = stuck appearance. See `kzk-playwright-verification` for the per-tool narration shape table; this skill enforces that the same discipline applies to non-Playwright long-running tools (Bash long-running, Agent dispatch, build, test).

## Interaction with other kzk-*

- **kzk-tool-retry** governs single-call retry policy. This skill governs spawn-time-to-terminal lifecycle.
- **kzk-autonomous-loop** uses this skill's polling discipline for rate-limit windows and context-budget polling.
- **kzk-playwright-verification** narration table is referenced from here for non-Playwright long-running tools.
