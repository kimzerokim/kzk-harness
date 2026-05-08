#!/usr/bin/env node
// edit-failure-retry.test.mjs — 6-case unit test for edit-failure-retry hook (Cycle 50).
//
// Runs with: node --test install/test/edit-failure-retry.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const HOOK = path.resolve(REPO_ROOT, "install/hooks/edit-failure-retry.mjs");

// ---------------------------------------------------------------------------
// callHook — spawn node edit-failure-retry.mjs with given payload + env
// ---------------------------------------------------------------------------
function callHook({ payload, env = {} }) {
  return spawnSync("node", [HOOK], {
    input: JSON.stringify(payload),
    env: {
      ...process.env,
      OMC_SKIP_HOOKS: "",
      ...env,
    },
    encoding: "utf8",
  });
}

// ---------------------------------------------------------------------------
// Test 1 — non-Edit/Write tool (Read) → no-op continue:true
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
  assert.equal(out.hookSpecificOutput, undefined);
});

// ---------------------------------------------------------------------------
// Test 2 — Edit with is_error=true → hookSpecificOutput with 🚨
// ---------------------------------------------------------------------------
test("tool_name=Edit, is_error=true → hookSpecificOutput with 🚨", () => {
  const r = callHook({
    payload: {
      tool_name: "Edit",
      tool_response: { is_error: true, content: "something went wrong" },
    },
  });
  const out = JSON.parse(r.stdout);
  assert.ok(out.hookSpecificOutput, "expected hookSpecificOutput");
  assert.equal(out.hookSpecificOutput.hookEventName, "PostToolUse");
  assert.match(out.hookSpecificOutput.additionalContext, /🚨/);
  assert.match(out.hookSpecificOutput.additionalContext, /kzk-tool-retry/);
});

// ---------------------------------------------------------------------------
// Test 3 — Edit with "String to replace not found" in content → hookSpecificOutput
// ---------------------------------------------------------------------------
test("tool_name=Edit, content='String to replace not found' → hookSpecificOutput", () => {
  const r = callHook({
    payload: {
      tool_name: "Edit",
      tool_response: {
        is_error: false,
        content: "String to replace not found in file /path/to/file.ts",
      },
    },
  });
  const out = JSON.parse(r.stdout);
  assert.ok(out.hookSpecificOutput, "expected hookSpecificOutput");
  assert.match(out.hookSpecificOutput.additionalContext, /🚨/);
});

// ---------------------------------------------------------------------------
// Test 4 — Write with is_error=false (success) → continue:true
// ---------------------------------------------------------------------------
test("tool_name=Write, is_error=false (success) → continue:true", () => {
  const r = callHook({
    payload: {
      tool_name: "Write",
      tool_response: { is_error: false, content: "File written successfully" },
    },
  });
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
  assert.equal(out.hookSpecificOutput, undefined);
});

// ---------------------------------------------------------------------------
// Test 5 — malformed JSON stdin → fail-open continue:true
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
// Test 6 — OMC_SKIP_HOOKS=edit-failure-retry → continue:true (bypass)
// ---------------------------------------------------------------------------
test("OMC_SKIP_HOOKS=edit-failure-retry → continue:true (kill switch)", () => {
  const r = callHook({
    payload: {
      tool_name: "Edit",
      tool_response: { is_error: true, content: "Error editing file" },
    },
    env: { OMC_SKIP_HOOKS: "edit-failure-retry" },
  });
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
  assert.equal(out.hookSpecificOutput, undefined);
});
