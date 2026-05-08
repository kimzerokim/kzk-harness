#!/usr/bin/env node
// edit-failure-retry.mjs — PostToolUse hook for Edit|Write failure detection (Cycle 50).
//
// Usage (set in ~/.claude/settings.json by install-global.sh):
//   PostToolUse matcher "Edit|Write" : node edit-failure-retry.mjs
//
// On failure: emits a PostToolUse system-reminder forcing the agent to retry
// within the same turn without stopping. Agent cannot ignore system-reminder.
//
// Kill switch: OMC_SKIP_HOOKS=edit-failure-retry
// Fail-open: malformed payload → {"continue": true} (never blocks)

// ---------------------------------------------------------------------------
// Kill switch check (early — before stdin read)
// ---------------------------------------------------------------------------
const skipHooks = (process.env.OMC_SKIP_HOOKS ?? "").split(",").map((s) => s.trim());
if (skipHooks.includes("edit-failure-retry")) {
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Read stdin JSON payload
// ---------------------------------------------------------------------------
let payload;
try {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
} catch {
  // Malformed payload — fail open (never block)
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Only act on Edit or Write tool calls
// ---------------------------------------------------------------------------
const toolName = payload?.tool_name ?? "";
if (toolName !== "Edit" && toolName !== "Write") {
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Failure detection
// ---------------------------------------------------------------------------
const FAILURE_PATTERNS =
  /String to replace not found|File has not been read yet|File has been modified since|Error editing file|File does not exist/i;

function isFailure(response) {
  if (!response) return false;

  // Explicit error flag
  if (response.is_error === true) return true;

  // Check content field (may be string or array)
  const content = response.content;
  if (typeof content === "string" && FAILURE_PATTERNS.test(content)) return true;
  if (Array.isArray(content)) {
    for (const item of content) {
      const text = typeof item === "string" ? item : (item?.text ?? "");
      if (FAILURE_PATTERNS.test(text)) return true;
    }
  }

  // Check top-level string representation
  if (typeof response === "string" && FAILURE_PATTERNS.test(response)) return true;

  return false;
}

const toolResponse = payload?.tool_response ?? payload?.response ?? null;

if (!isFailure(toolResponse)) {
  // Success — no action needed
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Failure detected — emit forcing system-reminder
// ---------------------------------------------------------------------------
const reminder =
  "🚨 [kzk-tool-retry] Edit/Write 실패 감지 — kzk-tool-retry skill §Auto-retry 룰: " +
  "(1) 같은 turn 안에서 즉시 1회 자동 재시도, 사용자에게 묻지 않음. " +
  "(2) String not found / not read yet 류 에러는 Read 먼저 다시 호출 후 Edit 재시도. " +
  "(3) 2회 연속 실패 시에만 user-queue Q-TOOL 추가하고 다음 task 로 진행. 멈추지 않음. " +
  "cross-ref: kzk-autonomous-loop §Polite-stop ban examples #8.";

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: reminder,
    },
  }) + "\n"
);
process.exit(0);
