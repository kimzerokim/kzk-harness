#!/usr/bin/env node
// dispatcher.mjs — UserPromptSubmit canonical dispatcher (Plan F rev2).
//
// Canonical order:
//   1. rotateTurn()         — new turn-id + read-log truncate
//   2. keyword-detector     — if manifest.keyword_detector === true
//   3. regression-recall    — if manifest.regression_recall === true
//   4. fix-scope-trigger    — if manifest.fix_scope_trigger === true
//
// Active set = ~/.claude/skills/.kzk-harness-shared/hooks/enabled.json manifest.
// File absence → stale-file risk → treated as all-false (safe default).
//
// bypass-token: dispatcher does NOT touch it. PreToolUse alone consumes it.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Resolve turn-state.mjs (installed layout: lib/ sibling of hooks/)
// ---------------------------------------------------------------------------
const LIB_TURN = path.join(__dirname, "..", "lib", "turn-state.mjs");
const { rotateTurn } = await import(LIB_TURN);

// ---------------------------------------------------------------------------
// Read stdin payload (pass-through to sub-hooks)
// ---------------------------------------------------------------------------
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const stdinRaw = Buffer.concat(chunks).toString("utf8");

// ---------------------------------------------------------------------------
// Read manifest
// ---------------------------------------------------------------------------
const HOOKS_DIR = path.join(
  os.homedir(),
  ".claude",
  "skills",
  ".kzk-harness-shared",
  "hooks"
);
const MANIFEST_FILE = path.join(HOOKS_DIR, "enabled.json");

let manifest = { keyword_detector: false, regression_recall: false, fix_scope_trigger: false };
try {
  const raw = fs.readFileSync(MANIFEST_FILE, "utf8");
  manifest = { ...manifest, ...JSON.parse(raw) };
} catch {
  // Manifest absent or corrupt → all-false (stale-file protection)
}

// ---------------------------------------------------------------------------
// Step 1 — rotate turn (clears read-log, sets new turn-id)
// ---------------------------------------------------------------------------
try {
  rotateTurn();
} catch (e) {
  process.stderr.write(`[dispatcher] WARN: rotateTurn failed: ${e.message}\n`);
}

// ---------------------------------------------------------------------------
// Sub-hook runner
// ---------------------------------------------------------------------------
function runSubHook(hookFile) {
  if (!fs.existsSync(hookFile)) return null;
  const result = spawnSync("node", [hookFile], {
    input: stdinRaw,
    encoding: "utf8",
    env: process.env,
  });
  if (result.error) {
    process.stderr.write(`[dispatcher] WARN: sub-hook ${hookFile} error: ${result.error.message}\n`);
    return null;
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  const out = (result.stdout ?? "").trim();
  if (!out) return null;
  try {
    return JSON.parse(out);
  } catch {
    process.stderr.write(`[dispatcher] WARN: sub-hook ${hookFile} non-JSON output: ${out}\n`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Steps 2–4 — run enabled sub-hooks in canonical order
// ---------------------------------------------------------------------------
const subHooks = [];
if (manifest.keyword_detector) subHooks.push(path.join(HOOKS_DIR, "keyword-detector.mjs"));
if (manifest.regression_recall) subHooks.push(path.join(HOOKS_DIR, "regression-recall.mjs"));
if (manifest.fix_scope_trigger) subHooks.push(path.join(HOOKS_DIR, "fix-scope-trigger.mjs"));

const additionalContextParts = [];

for (const hookFile of subHooks) {
  const res = runSubHook(hookFile);
  if (!res) continue;

  // First continue:false → immediate block
  if (res.continue === false) {
    process.stdout.write(
      JSON.stringify({ continue: false, reason: res.reason ?? "sub-hook blocked" }) + "\n"
    );
    process.exit(0);
  }

  // Collect additionalContext
  const ctx = res?.hookSpecificOutput?.additionalContext;
  if (ctx) additionalContextParts.push(ctx);
}

// ---------------------------------------------------------------------------
// Emit combined output
// ---------------------------------------------------------------------------
if (additionalContextParts.length > 0) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: additionalContextParts.join("\n\n"),
      },
    }) + "\n"
  );
} else {
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
}
process.exit(0);
