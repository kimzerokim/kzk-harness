#!/usr/bin/env node
// edit-failure-retry.mjs — PostToolUse hook for Edit|Write failure detection.
// v2 (kzk-tool-retry 1.8.0):
//   (A) decision:"block" enforcement on 1st failure — replaces previous advisory additionalContext.
//   (B) error-pattern-specific reason text — main agent gets exact remediation per error class.
//   (C) per-path retry counter — 2nd consecutive failure within 60s window appends Q-TOOL-EDIT-RETRY-EXHAUSTED and passes through.
//
// Usage (set in ~/.claude/settings.json by install-global.sh):
//   PostToolUse matcher "Edit|Write" : node edit-failure-retry.mjs
//
// Kill switch: OMC_SKIP_HOOKS=edit-failure-retry
// Fail-open: malformed payload → {"continue": true} (never blocks)

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// ---------------------------------------------------------------------------
// Kill switch
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
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Only act on Edit / Write
// ---------------------------------------------------------------------------
const toolName = payload?.tool_name ?? "";
if (toolName !== "Edit" && toolName !== "Write") {
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Per-path retry counter (cache)
// ---------------------------------------------------------------------------
const STATE_DIR =
  process.env.NODE_ENV === "test" && process.env.KZK_TEST_STATE_DIR
    ? process.env.KZK_TEST_STATE_DIR
    : path.join(os.homedir(), ".cache", "kzk-harness");
const STATE_FILE = path.join(STATE_DIR, "edit-retry-state.json");
const WINDOW_MS = 60 * 1000; // 60s consecutive-failure window
const GC_MS = 10 * WINDOW_MS;

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}
function writeState(state) {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch {
    /* best-effort */
  }
}

// ---------------------------------------------------------------------------
// Failure detection
// ---------------------------------------------------------------------------
const FAILURE_PATTERNS =
  /String to replace not found|File has not been read yet|File has been modified since|Error editing file|File does not exist/i;

function extractErrorText(response) {
  if (!response) return "";
  if (response.is_error === true) {
    const c = response.content;
    if (typeof c === "string") return c;
    if (Array.isArray(c)) {
      return c.map((i) => (typeof i === "string" ? i : i?.text ?? "")).join(" ");
    }
  }
  const c = response.content;
  if (typeof c === "string" && FAILURE_PATTERNS.test(c)) return c;
  if (Array.isArray(c)) {
    for (const item of c) {
      const t = typeof item === "string" ? item : item?.text ?? "";
      if (FAILURE_PATTERNS.test(t)) return t;
    }
  }
  if (typeof response === "string" && FAILURE_PATTERNS.test(response)) return response;
  return "";
}

function classifyError(text) {
  if (!text) return null;
  if (/File has not been read yet/i.test(text)) return "not-read";
  if (/File has been modified since/i.test(text)) return "modified-since";
  if (/String to replace not found/i.test(text)) return "string-not-found";
  if (/File does not exist/i.test(text)) return "no-such-file";
  if (/Error editing file/i.test(text)) return "generic-edit";
  return "other";
}

const toolResponse = payload?.tool_response ?? payload?.response ?? null;
const errorText = extractErrorText(toolResponse);
const filePath = payload?.tool_input?.file_path ?? "(unknown)";
const stateKey = path.resolve(filePath);

// ---------------------------------------------------------------------------
// Success path — reset counter for this path
// ---------------------------------------------------------------------------
if (!errorText) {
  const state = readState();
  if (state[stateKey]) {
    delete state[stateKey];
    writeState(state);
  }
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Failure — update counter
// ---------------------------------------------------------------------------
const state = readState();
const now = Date.now();
const prev = state[stateKey];

let retryCount;
if (prev && now - prev.ts < WINDOW_MS) {
  retryCount = (prev.count ?? 0) + 1;
} else {
  retryCount = 1;
}
state[stateKey] = { count: retryCount, ts: now };

// Garbage collect old entries
for (const k of Object.keys(state)) {
  if (state[k]?.ts && now - state[k].ts > GC_MS) delete state[k];
}
writeState(state);

const errClass = classifyError(errorText);

// ---------------------------------------------------------------------------
// Error-class-specific reason text
// ---------------------------------------------------------------------------
const REASONS = {
  "not-read":
    `🚨 [kzk-tool-retry] Edit/Write 실패 — File has not been read yet.\n` +
    `Path: ${filePath}\n` +
    `Required action (auto-retry, same turn): (1) Read("${filePath}") 호출 (2) 동일 Edit 재시도.\n` +
    `사용자에게 묻지 않음. 멈추지 않음. SoT: kzk-tool-retry §Auto-retry.`,
  "modified-since":
    `🚨 [kzk-tool-retry] Edit/Write 실패 — File has been modified since read (외부 변경 감지).\n` +
    `Path: ${filePath}\n` +
    `Required action: (1) Re-Read 의무 — on-disk content 가 바뀜, 이전 read-log 신뢰 금지 ` +
    `(2) old_string 이 새 file content 와 매치하는지 확인 (3) Edit 재시도.\n` +
    `단순 동일 Edit 재시도 금지 — 외부 변경 반영 안 한 채 재시도하면 또 같은 에러. ` +
    `사용자에게 묻지 않음. 멈추지 않음. SoT: kzk-tool-retry §Auto-retry (modified-since branch).`,
  "string-not-found":
    `🚨 [kzk-tool-retry] Edit/Write 실패 — String to replace not found.\n` +
    `Path: ${filePath}\n` +
    `Possible causes: (a) 공백 / 줄바꿈 / 따옴표 변형 (b) Read 이후 외부 변경 (c) old_string 에 invisible char 포함.\n` +
    `Required action: (1) Re-Read (2) 새 file 에서 정확한 substring 찾기 — 필요하면 grep / sed 로 확인 ` +
    `(3) 갱신된 old_string 으로 Edit 재시도. 동일 old_string 단순 재시도 금지 — 두 번째도 실패함. ` +
    `사용자에게 묻지 않음. 멈추지 않음. SoT: kzk-tool-retry §Auto-retry (string-not-found branch).`,
  "no-such-file":
    `🚨 [kzk-tool-retry] Edit/Write 실패 — File does not exist.\n` +
    `Path: ${filePath}\n` +
    `Required action: (1) 경로 확인 (ls / find) (2) 새 파일 생성 의도였으면 Write 사용 ` +
    `(3) 경로 typo 면 정정 후 재시도. 사용자에게 묻지 않음. SoT: kzk-tool-retry §Auto-retry.`,
  "generic-edit":
    `🚨 [kzk-tool-retry] Edit/Write 실패 — Error editing file.\n` +
    `Path: ${filePath}\n` +
    `Required action: Re-Read 후 동일 Edit 재시도. 두 번째도 실패 시 Q-TOOL 자동 append (이번 hook 가 처리). ` +
    `SoT: kzk-tool-retry §Auto-retry.`,
  other:
    `🚨 [kzk-tool-retry] Edit/Write 실패 (분류 안 됨).\n` +
    `Path: ${filePath}\n` +
    `Tool response (truncated): ${errorText.slice(0, 200)}\n` +
    `Required action: 에러 분석 후 적절한 재시도 또는 Q-TOOL append. SoT: kzk-tool-retry §Auto-retry.`,
};

const reason = REASONS[errClass] ?? REASONS.other;

// ---------------------------------------------------------------------------
// 2nd consecutive failure within window → Q-TOOL queue + pass through
// ---------------------------------------------------------------------------
if (retryCount >= 2) {
  try {
    const queueDir = process.env.KZK_QUEUE_DIR_OVERRIDE
      ?? path.join(process.env.CLAUDE_PROJECT_DIR ?? process.cwd(), "docs", "harness");
    const queueFile = path.join(queueDir, "user-queue.md");
    if (fs.existsSync(queueFile)) {
      const ts = new Date().toISOString();
      const entry =
        `\n\n## Pending — Q-TOOL-EDIT-RETRY-EXHAUSTED (${ts})\n` +
        `- Path: \`${filePath}\`\n` +
        `- Error class: ${errClass ?? "other"}\n` +
        `- Tool response (truncated): ${errorText.slice(0, 300)}\n` +
        `- Retry count: ${retryCount} consecutive failures within ${WINDOW_MS / 1000}s window.\n` +
        `- Tentative default: skip this file, continue with next task.\n`;
      fs.appendFileSync(queueFile, entry);
    }
  } catch {
    /* best-effort */
  }
  // Reset counter for this path so next genuine failure starts fresh
  delete state[stateKey];
  writeState(state);
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext:
          `⚠️ [kzk-tool-retry] 2회 연속 Edit/Write 실패 (${errClass ?? "other"}) — ` +
          `Q-TOOL-EDIT-RETRY-EXHAUSTED 가 docs/harness/user-queue.md 에 append 됨. ` +
          `이 파일은 건너뛰고 다음 task 로 진행. 사용자 복귀 시 queue 확인. ` +
          `Path: ${filePath}`,
      },
    }) + "\n",
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
// 1st failure → decision:block + error-specific reason
// ---------------------------------------------------------------------------
process.stdout.write(
  JSON.stringify({
    decision: "block",
    reason,
  }) + "\n",
);
process.exit(0);
