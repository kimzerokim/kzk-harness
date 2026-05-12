---
name: kzk-tool-retry
version: 1.7.0
description: "Edit/Write/Bash auto-retry discipline. Single automatic retry on first failure (no user prompt); double-failure → Q-TOOL queue entry. Pre-emptive Read on 7 read-tracker invalidator events. Triggers: 'Edit fail', 'File has not been read yet', 'String to replace not found'. References harness-share.md §27."
---

> Authoritative source: `harness-share.md` §27. On conflict, that wins.

# kzk-tool-retry

## Default policy

**Every tool failure = 1 automatic retry, no user prompt in between.** Only after the retry also fails do you log to `docs/harness/user-queue.md` (or repo equivalent) and proceed to the next task. Asking the user "should I retry?" between attempts breaks autonomous discipline.

## Failure modes

### Edit — "String to replace not found"

1. Immediately call `Read` on the file (the affected ±10 lines is enough) or `grep -n <substring>` to recover the exact text.
2. Re-issue `Edit` with the corrected `old_string`.
3. Two consecutive failures → `Write` the whole file as fallback OR queue.

### Edit / Write — "File has not been read yet" / "File has been modified since read"

The most common failure class. Two distinct triggers, same fix:

- **"not been read yet"**: read-tracker reset between Read and Edit. Resets happen across `UserPromptSubmit`, hook events, session restore, `/compact`, agent dispatch return, and any system-reminder injection. A single user message between Read and Edit can reset the tracker.
- **"modified since read"**: an external tool (sed, formatter, linter, the user, another agent) wrote to the file between your Read and your Edit. The on-disk content moved past your snapshot.

**Pre-emptive Read protocol — MANDATORY** (prevention is cheaper than recovery):

The Edit tool requires a Read of the file in the *same effective session window* before it will write. Treat the following events as **read-tracker invalidators** — the next Edit on any affected file MUST be preceded by a fresh Read:

| Invalidator | Affected files | Required action |
|---|---|---|
| User sends a new message | All files you intended to edit | Read each before next Edit |
| `<system-reminder>` mentions a file was modified by user/linter | The cited file (and any open editor target) | Re-Read before next Edit |
| You ran `sed -i`, `Write`, formatter, or any non-Edit modifier | All files modified | Re-Read before next Edit |
| You called an Agent that returned (subagent_type=executor etc.) | All files the agent might have touched | Re-Read before next Edit |
| `/compact`, session restore, hook event with file edits | All files you'll edit next | Re-Read before next Edit |
| > 5 turns since last Read of a frequently-edited file | That file | Re-Read before next Edit |

A 1-line `Read` (offset=1, limit=5) is enough to refresh the tracker — cost is trivial vs. the round-trip cost of a failed Edit.

**Default — Re-Read on doubt**: if any row in the table above might apply, run a 1-line Re-Read first. Cost = 1 tool call vs. failed Edit's round-trip (1 error reminder + 1 retry Edit + broken flow). Mandatory self-check before every Edit / Write:

> "Did the last Read of this file happen *within this turn*? Did any invalidator (table above) occur since then?"

If the answer is not a confident "yes" → do a 1-line Re-Read first. Every cycle, immediately before each Edit call.

**Forced on autonomous cycle entry**: when the main resumes editing after a subagent dispatch — the very first Edit of that turn *must* be preceded by a 1-line Read. Agent return is a row-4 invalidator; don't assume, Re-Read immediately.

**Recovery if the protocol slipped (failure already occurred)**:
1. Same path → call `Read` once.
2. If the failure was "modified since read", inspect the diff between your previous mental model and the on-disk content (the system reminder usually shows the new content). Adjust `old_string` if the surrounding text changed.
3. Re-issue the Edit. Do NOT ask the user.

**Forbidden**: asking the user "재시도할까요?" or "다시 읽고 진행할까요?". The user already saw the error in the system reminder; what they want is the next Edit to land, not a permission prompt.

## PreToolUse guard (edit-read-guard hook)

Starting from Plan F, a PreToolUse `Edit`/`Write` system hook enforces this at the OS level — not just agent self-discipline.

- **Valid Read**: only a Claude Code `Read` tool call counts — the file_path realpath must be recorded in the read-log.
- **Not valid**: shell `cat`, `grep`, `sed`, `awk`, `head`, `tail` — even when run via the Bash tool, the hook tracker cannot see them. Always issue a separate `Read` tool call before Edit.
- **Cross-turn within session**: the read-log is not cleared each turn. It expires by time (2 hours). A file Read in a previous turn is still valid for Edit in later turns of the same session.
- **Bypass**: `touch ~/.cache/kzk-harness/bypass-token` — single-use (auto-unlinked after 1 Edit/Write, **consumed by PreToolUse only**). For explicit user-authorized edge cases.
- **Kill switch**: `OMC_SKIP_HOOKS=edit-read-guard` env — disables for the entire session.

### Automatic unblocked recovery on edit-read-guard block (MANDATORY)

When the hook blocks, the error message includes an `AUTO-RETRY` directive. **This block is not a reason to pause the flow**:

1. **Immediately** call `Read(file_path)` (1-line Read is enough: `offset=1, limit=5`)
2. **Immediately** retry the same Edit/Write
3. **Never ask the user** — "다시 읽을까요?", "어떻게 할까요?" are forbidden
4. A halt caused by this block in autonomous / autonomous mode = **rule violation**

Unlike the general retry in kzk-tool-retry, this pattern has a **100% success guarantee** (Read resolves it). A second failure is impossible here, so no queue entry is needed.

cross-ref: `harness-share.md` §27.1.

### Bash — transient failure

Network blip / race / lock collision → 1 retry OK. Persistent failure (compile error, missing dep, type error) → root-cause fix, no blind retry.

## Forbidden anti-pattern

> Tool fails once → ask user "어떻게 할까요?" → wait.

In autonomous (sleep / coffee / "끝까지 끝내줘") this is a hard violation. After 1 auto-retry the agent either succeeds, queues, or moves on — but never stops to ask.

## Queue-on-double-failure

When the auto-retry also fails, append a `Q-TOOL-<FILE>` entry to `docs/harness/user-queue.md` using the `kzk-user-queue` template:

- **Context**: `<tool type> failed twice on <file path>: <error message>`
- **Options**: 1. Manual fix per recommended action  2. Skip this file this session
- **Tentative default**: Option 1 — recommended fix: `<suspected cause + one-line fix>`
- **Override mechanism**: append DECISION line
- **Impact**: file edit blocked; next task proceeds

Continue to the next task without waiting for user input.

## Forcing mechanism (PostToolUse hook — Cycle 50)

Doc-only enforcement of the auto-retry rule has historically failed when the agent doesn't have this skill loaded at the moment of Edit/Write failure (regression observed 2026-05-08, gridless session). Cycle 50 added `install/hooks/edit-failure-retry.mjs` which fires on every Edit/Write tool call. On failure detection (any of: `is_error`, "String to replace not found", "File has not been read yet", "File has been modified since", "Error editing file", "File does not exist"), the hook emits a `PostToolUse` system-reminder forcing the agent to retry within the same turn. Agent cannot ignore — system-reminder is injected into the next-turn context.

Canonical error patterns covered:
- `String to replace not found` → re-read file first, then Edit again
- `File has not been read yet` → Read first, then Edit
- `File has been modified since read` → Re-read, then Edit (file changed)
- `Error editing file` (generic) → re-read first as defensive default
- `File does not exist` → check the path; if typo, correct path; if intentional new file, use Write tool

Skip conditions:
- `OMC_SKIP_HOOKS=edit-failure-retry` env → bypass (debug only)
- Hook fail-open on malformed payload — never blocks; agent retains full control if hook breaks

After 2 consecutive failures on same file: append Q-TOOL entry to `docs/harness/user-queue.md` with: file path, error pattern, retry attempts, next-task continuation marker. Then proceed to next task. Do NOT halt the entire run.

## Interaction with other kzk-*

- **kzk-user-queue**: queue destination after the retry also fails.
- **kzk-autonomous-boundary**: polite-stop ban is enforced jointly. This skill specifies the auto-retry; that one specifies the broader "do not stop politely".
- **kzk-background-monitoring**: long-running task stuck detection is parallel. This skill = single tool call retry; that one = process lifecycle.
