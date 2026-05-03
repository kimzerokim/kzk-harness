---
name: kzk-tool-retry
version: 1.0.3
description: "Tool failure auto-retry mandate — every Edit/Write/Bash failure gets exactly one automatic retry before any user prompt. 'File has not been read yet' is always solved by re-reading the same path then retrying — never by asking the user. Polite-stop after 1 failure is a rule violation in autonomous mode. Required triggers: 'tool retry', 'auto-retry', 'retry', 'File has not been read yet', 'String to replace not found', 'Edit failed', 'Write failed', 'polite-stop'."
---

> Authoritative source: `harness-share.md` §27. On conflict, that wins.

# kzk-tool-retry

Tool failure is data, not a stop signal. One automatic retry is the default. Polite-stop after a single failure — especially in autonomous / sleep / coffee mode — is a rule violation.

## Default policy

**Every tool failure = 1 automatic retry, no user prompt in between.** Only after the retry also fails do you log to `docs/harness/user-queue.md` (or repo equivalent) and proceed to the next task. Asking the user "should I retry?" between attempts breaks autonomous discipline.

## Failure modes

### Edit — "String to replace not found"

1. Immediately call `Read` on the file (the affected ±10 lines is enough) or `grep -n <substring>` to recover the exact text.
2. Re-issue `Edit` with the corrected `old_string`.
3. Two consecutive failures → `Write` the whole file as fallback OR queue.

### Edit / Write — "File has not been read yet"

This is the most common one. Observed behavior (Claude Code 2025–2026): the read-tracker resets across `UserPromptSubmit`, hook events, session restore, and `/compact`. A single user message between Read and Write can reset the tracker even if the file was read just before. Even if the underlying mechanism changes, the 1-line pre-Read pattern is cheap and never wrong.

**Mandatory recovery (autonomous mode = polite-stop forbidden)**:
1. Same path → call `Read` once (1 line is fine — cost is trivial).
2. Re-issue the original Write/Edit. Content intent is unchanged; only the read tracker is refreshed.
3. Do NOT ask the user. The user noticing and asking "왜 또 실패했어?" = trust loss.

**Pre-emptive avoidance**: right after every user message, the first Edit/Write on a file should be preceded by a 1-line `Read` of that file. For frequently edited files, always Read-then-Edit pattern.

### Bash — transient failure

Network blip / race / lock collision → 1 retry OK. Persistent failure (compile error, missing dep, type error) → root-cause fix, no blind retry.

## Forbidden anti-pattern

> Tool fails once → ask user "어떻게 할까요?" → wait.

In autonomous (sleep / coffee / "끝까지 끝내줘") this is a hard violation. After 1 auto-retry the agent either succeeds, queues, or moves on — but never stops to ask.

## Queue-on-double-failure

When the auto-retry also fails:
1. Append a Q-* entry to `docs/harness/user-queue.md` (or `kzk-user-queue` skill's location)
2. Include the failing tool call shape, error message, suspected cause, and recommended manual fix
3. Continue to the next task in the autonomous run

## Interaction with other kzk-*

- **kzk-user-queue**: queue destination after the retry also fails.
- **kzk-autonomous-boundary**: polite-stop ban is enforced jointly. This skill specifies the auto-retry; that one specifies the broader "do not stop politely".
- **kzk-background-monitoring**: long-running task stuck detection is parallel. This skill = single tool call retry; that one = process lifecycle.
