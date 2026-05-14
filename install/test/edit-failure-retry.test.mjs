#!/usr/bin/env node
// edit-failure-retry.test.mjs — unit test for edit-failure-retry hook v2 (kzk-tool-retry 1.8.0).
//
// Runs with: node --test install/test/edit-failure-retry.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const HOOK = path.resolve(REPO_ROOT, "install/hooks/edit-failure-retry.mjs");

// Isolate per-test state dir
function freshStateDir() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "kzk-retry-test-"));
  return d;
}

function callHook({ payload, env = {} }) {
  return spawnSync("node", [HOOK], {
    input: JSON.stringify(payload),
    env: {
      ...process.env,
      OMC_SKIP_HOOKS: "",
      NODE_ENV: "test",
      ...env,
    },
    encoding: "utf8",
  });
}

// ---------------------------------------------------------------------------
// T1 — Read tool → no-op continue
// ---------------------------------------------------------------------------
test("tool_name=Read → continue:true (no-op)", () => {
  const r = callHook({
    payload: {
      tool_name: "Read",
      tool_response: { is_error: true, content: "Error editing file" },
    },
  });
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
});

// ---------------------------------------------------------------------------
// T2 — Edit 1st failure (is_error generic) → decision:block + 🚨 reason
// ---------------------------------------------------------------------------
test("Edit 1st failure is_error=true → decision:block with 🚨", () => {
  const stateDir = freshStateDir();
  const r = callHook({
    payload: {
      tool_name: "Edit",
      tool_input: { file_path: "/tmp/test-t2.txt" },
      tool_response: { is_error: true, content: "Error editing file" },
    },
    env: { KZK_TEST_STATE_DIR: stateDir },
  });
  const out = JSON.parse(r.stdout);
  assert.equal(out.decision, "block");
  assert.match(out.reason, /🚨/);
  assert.match(out.reason, /kzk-tool-retry/);
});

// ---------------------------------------------------------------------------
// T3 — Edit 1st failure "String to replace not found" → string-not-found reason
// ---------------------------------------------------------------------------
test("Edit 1st 'String to replace not found' → string-not-found reason", () => {
  const stateDir = freshStateDir();
  const r = callHook({
    payload: {
      tool_name: "Edit",
      tool_input: { file_path: "/tmp/test-t3.txt" },
      tool_response: {
        is_error: false,
        content: "String to replace not found in file /tmp/test-t3.txt",
      },
    },
    env: { KZK_TEST_STATE_DIR: stateDir },
  });
  const out = JSON.parse(r.stdout);
  assert.equal(out.decision, "block");
  assert.match(out.reason, /String to replace not found/);
  assert.match(out.reason, /Re-Read/);
  assert.match(out.reason, /동일 old_string 단순 재시도 금지/);
});

// ---------------------------------------------------------------------------
// T4 — Edit 1st failure "File has been modified since" → modified-since reason
// ---------------------------------------------------------------------------
test("Edit 1st 'modified since' → modified-since reason mentioning Re-Read mandatory", () => {
  const stateDir = freshStateDir();
  const r = callHook({
    payload: {
      tool_name: "Edit",
      tool_input: { file_path: "/tmp/test-t4.txt" },
      tool_response: {
        is_error: true,
        content: "File has been modified since read",
      },
    },
    env: { KZK_TEST_STATE_DIR: stateDir },
  });
  const out = JSON.parse(r.stdout);
  assert.equal(out.decision, "block");
  assert.match(out.reason, /modified since read/);
  assert.match(out.reason, /Re-Read 의무/);
});

// ---------------------------------------------------------------------------
// T5 — Edit 1st failure "File has not been read yet" → not-read reason
// ---------------------------------------------------------------------------
test("Edit 1st 'not been read yet' → not-read reason", () => {
  const stateDir = freshStateDir();
  const r = callHook({
    payload: {
      tool_name: "Edit",
      tool_input: { file_path: "/tmp/test-t5.txt" },
      tool_response: {
        is_error: true,
        content: "File has not been read yet",
      },
    },
    env: { KZK_TEST_STATE_DIR: stateDir },
  });
  const out = JSON.parse(r.stdout);
  assert.equal(out.decision, "block");
  assert.match(out.reason, /not been read yet/);
  assert.match(out.reason, /Read\("/);
});

// ---------------------------------------------------------------------------
// T6 — 2nd consecutive failure within window → continue + Q-TOOL inject
// ---------------------------------------------------------------------------
test("2nd consecutive failure → continue + Q-TOOL additionalContext", () => {
  const stateDir = freshStateDir();
  const queueDir = freshStateDir();
  const filePath = "/tmp/test-t6.txt";

  // 1st failure
  const r1 = callHook({
    payload: {
      tool_name: "Edit",
      tool_input: { file_path: filePath },
      tool_response: { is_error: true, content: "Error editing file" },
    },
    env: { KZK_TEST_STATE_DIR: stateDir, KZK_QUEUE_DIR_OVERRIDE: queueDir },
  });
  const out1 = JSON.parse(r1.stdout);
  assert.equal(out1.decision, "block");

  // 2nd failure (same path, within window)
  const r2 = callHook({
    payload: {
      tool_name: "Edit",
      tool_input: { file_path: filePath },
      tool_response: { is_error: true, content: "Error editing file" },
    },
    env: { KZK_TEST_STATE_DIR: stateDir, KZK_QUEUE_DIR_OVERRIDE: queueDir },
  });
  const out2 = JSON.parse(r2.stdout);
  assert.equal(out2.decision, undefined, "2nd failure should NOT block (passes through)");
  assert.ok(out2.hookSpecificOutput, "expected hookSpecificOutput");
  assert.match(out2.hookSpecificOutput.additionalContext, /Q-TOOL-EDIT-RETRY-EXHAUSTED/);

  // Cleanup queue dir
  fs.rmSync(queueDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// T7 — Write success → continue, no state change
// ---------------------------------------------------------------------------
test("Write success → continue:true (no-op)", () => {
  const stateDir = freshStateDir();
  const r = callHook({
    payload: {
      tool_name: "Write",
      tool_input: { file_path: "/tmp/test-t7.txt" },
      tool_response: { is_error: false, content: "File written successfully" },
    },
    env: { KZK_TEST_STATE_DIR: stateDir },
  });
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
  assert.equal(out.decision, undefined);
});

// ---------------------------------------------------------------------------
// T8 — success after failure resets counter (success → 2nd failure should be block, not pass)
// ---------------------------------------------------------------------------
test("success after failure resets counter", () => {
  const stateDir = freshStateDir();
  const filePath = "/tmp/test-t8.txt";

  // failure
  callHook({
    payload: {
      tool_name: "Edit",
      tool_input: { file_path: filePath },
      tool_response: { is_error: true, content: "Error editing file" },
    },
    env: { KZK_TEST_STATE_DIR: stateDir },
  });

  // success (resets counter)
  callHook({
    payload: {
      tool_name: "Edit",
      tool_input: { file_path: filePath },
      tool_response: { is_error: false },
    },
    env: { KZK_TEST_STATE_DIR: stateDir },
  });

  // new failure → should block again (not pass through)
  const r3 = callHook({
    payload: {
      tool_name: "Edit",
      tool_input: { file_path: filePath },
      tool_response: { is_error: true, content: "Error editing file" },
    },
    env: { KZK_TEST_STATE_DIR: stateDir },
  });
  const out3 = JSON.parse(r3.stdout);
  assert.equal(out3.decision, "block", "after success reset, new failure should block again");
});

// ---------------------------------------------------------------------------
// T9 — malformed JSON stdin → fail-open continue
// ---------------------------------------------------------------------------
test("malformed JSON stdin → fail-open continue:true", () => {
  const r = spawnSync("node", [HOOK], {
    input: "not valid json {{{",
    env: { ...process.env, OMC_SKIP_HOOKS: "" },
    encoding: "utf8",
  });
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
});

// ---------------------------------------------------------------------------
// T10 — OMC_SKIP_HOOKS kill switch
// ---------------------------------------------------------------------------
test("OMC_SKIP_HOOKS=edit-failure-retry → continue:true (kill switch)", () => {
  const r = callHook({
    payload: {
      tool_name: "Edit",
      tool_input: { file_path: "/tmp/test-t10.txt" },
      tool_response: { is_error: true, content: "Error editing file" },
    },
    env: { OMC_SKIP_HOOKS: "edit-failure-retry" },
  });
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
  assert.equal(out.decision, undefined);
});
