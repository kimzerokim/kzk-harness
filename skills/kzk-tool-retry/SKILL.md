---
name: kzk-tool-retry
version: 1.3.0
description: "One automatic retry on every Edit/Write/Bash failure before user prompt — 'File has not been read yet' always fixed by re-read + retry. Top triggers: 'Edit failed', 'File has not been read yet', 'String to replace not found', 'Write failed', 'polite-stop', 'PreToolUse guard', 'edit-read-guard', 'Read first'. Body §Triggers for full list."
---

> Authoritative source: `harness-share.md` §27. On conflict, that wins.

# kzk-tool-retry

## Triggers

`tool retry`, `auto-retry`, `retry`, `File has not been read yet`, `String to replace not found`, `Edit failed`, `Write failed`, `polite-stop`.

Tool failure is data, not a stop signal. One automatic retry is the default. Polite-stop after a single failure — especially in autonomous / sleep / coffee mode — is a rule violation.

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

**Default — Re-Read on doubt**: 위 표 어느 row 라도 hit 모호 시, 무조건 1-line Re-Read 먼저. cost = 1 tool call vs. failed Edit 의 round-trip (1 error reminder + 1 retry Edit + 메인 컨텍스트 흐름 끊김). 모든 Edit / Write 직전 다음 self-check 의무:

> "이 파일 마지막 Read 가 *이번 turn 안에* 일어났는가? 그 사이 invalidator (위 표) 발생했는가?"

답이 "확실히 yes" 이 아니면 → 1-line Re-Read 먼저. Edit 호출 직전 매 cycle.

**자율실행 cycle 진입 시 강제**: subagent dispatch 끝나고 메인이 Edit 시작할 때 — 그 turn 의 첫 Edit 은 *반드시* 1-line Read 선행. agent return 이 row 4 invalidator 라 추정만 하지 말고 즉시 Re-Read.

**Recovery if the protocol slipped (failure already occurred)**:
1. Same path → call `Read` once.
2. If the failure was "modified since read", inspect the diff between your previous mental model and the on-disk content (the system reminder usually shows the new content). Adjust `old_string` if the surrounding text changed.
3. Re-issue the Edit. Do NOT ask the user.

**Forbidden**: asking the user "재시도할까요?" or "다시 읽고 진행할까요?". The user already saw the error in the system reminder; what they want is the next Edit to land, not a permission prompt.

## PreToolUse guard (edit-read-guard hook)

Plan F 부터 PreToolUse `Edit`/`Write` 시스템 hook 으로 차단 강제. 메인 self-discipline 가 아닌 OS-level guard.

- **Read 인정 범위**: Claude Code `Read` tool 호출만 — turn 단위 read-log 에 file_path 의 realpath 가 기록될 때.
- **인정 안 됨**: shell `cat`, `grep`, `sed`, `awk`, `head`, `tail` — Bash tool 안에서 실행되더라도 hook tracker 가 못 잡음. Edit 직전 반드시 별도 `Read` tool 호출.
- **bypass**: `touch ~/.cache/kzk-harness/bypass-token` — 단발성 (1회 Edit/Write 후 자동 unlink, **PreToolUse 단독 소비**). 사용자 explicit 의도 표명용.
- **kill switch**: `OMC_SKIP_HOOKS=edit-read-guard` env — 세션 단위 비활성.
- **turn 단위**: 매 사용자 prompt 마다 turn-id 회전 + read-log truncate. 이전 turn 의 Read 는 이번 turn 에 인정 안 됨.

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

## Interaction with other kzk-*

- **kzk-user-queue**: queue destination after the retry also fails.
- **kzk-autonomous-boundary**: polite-stop ban is enforced jointly. This skill specifies the auto-retry; that one specifies the broader "do not stop politely".
- **kzk-background-monitoring**: long-running task stuck detection is parallel. This skill = single tool call retry; that one = process lifecycle.
