#!/usr/bin/env node
// edit-read-guard.mjs — PreToolUse + PostToolUse hook (Plan F rev2).
//
// Usage (set in ~/.claude/settings.json by install-global.sh):
//   PreToolUse  matcher "Edit|Write" : node edit-read-guard.mjs --mode=pre
//   PostToolUse matcher "Read"       : node edit-read-guard.mjs --mode=post-read
//
// --mode=pre  : block Edit/Write if the file was not Read in the current turn.
// --mode=post-read : record the Read into the turn's read-log.
//
// Bypass (single-use): touch ~/.cache/kzk-harness/bypass-token
//   PreToolUse alone unlinks it (one-shot). dispatcher never touches bypass-token.
// Kill switch: OMC_SKIP_HOOKS=edit-read-guard

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Resolve turn-state.mjs relative to this hook file (works both from repo and
// installed location — the installer copies lib/ next to hooks/).
// ---------------------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIB_TURN = path.join(__dirname, "..", "lib", "turn-state.mjs");

const { currentTurnId, appendRead, hasReadInTurn } = await import(LIB_TURN);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const STATE_DIR =
  process.env.NODE_ENV === "test" && process.env.KZK_TEST_STATE_DIR
    ? process.env.KZK_TEST_STATE_DIR
    : path.join(os.homedir(), ".cache", "kzk-harness");

const BYPASS_FILE = path.join(STATE_DIR, "bypass-token");

const DENY_MSG_TEMPLATE = (realpath) =>
  `[edit-read-guard] Read this file first within the current turn.\n` +
  `File: ${realpath}\n` +
  `Bypass: touch ~/.cache/kzk-harness/bypass-token (one-shot)\n` +
  `Disable: OMC_SKIP_HOOKS=edit-read-guard`;

// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const modeArg = args.find((a) => a.startsWith("--mode="));
const mode = modeArg ? modeArg.split("=")[1] : "pre";

// ---------------------------------------------------------------------------
// Read stdin JSON payload
// ---------------------------------------------------------------------------
let payload;
try {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
} catch {
  // Malformed payload — allow (don't block on parse failure)
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
  process.exit(0);
}

const toolName = payload?.tool_name ?? "";
const filePath = payload?.tool_input?.file_path ?? "";

// ---------------------------------------------------------------------------
// mode=post-read: record the Read into read-log
// ---------------------------------------------------------------------------
if (mode === "post-read") {
  if (toolName === "Read" && filePath) {
    let realpath;
    try {
      realpath = fs.realpathSync(filePath);
    } catch {
      // File disappeared between Read and PostToolUse — silent skip
      process.stdout.write(JSON.stringify({ continue: true }) + "\n");
      process.exit(0);
    }
    try {
      appendRead(realpath);
    } catch (e) {
      process.stderr.write(`[edit-read-guard] WARN: appendRead failed: ${e.message}\n`);
    }
  }
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// mode=pre: guard Edit / Write
// ---------------------------------------------------------------------------

// Step 1 — only guard Edit and Write
if (toolName !== "Edit" && toolName !== "Write") {
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
  process.exit(0);
}

// Step 2 — kill switch
const skipHooks = (process.env.OMC_SKIP_HOOKS ?? "").split(",").map((s) => s.trim());
if (skipHooks.includes("edit-read-guard")) {
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
  process.exit(0);
}

// Step 3 — single-use bypass token (PreToolUse alone consumes it)
try {
  fs.lstatSync(BYPASS_FILE);
  // Token exists — consume it and allow
  try {
    fs.unlinkSync(BYPASS_FILE);
    process.stderr.write(`[edit-read-guard] bypass token consumed (one-shot)\n`);
  } catch {
    // Token disappeared between lstat and unlink — still allow this call
  }
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
  process.exit(0);
} catch (e) {
  if (e.code !== "ENOENT") {
    // Unexpected lstat error — fail open with warning
    process.stderr.write(`[edit-read-guard] WARN: lstat bypass-token error: ${e.message}\n`);
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    process.exit(0);
  }
  // ENOENT — no bypass token, continue to guard
}

// Step 4 — realpath normalisation
let realpath;
try {
  realpath = fs.realpathSync(filePath);
} catch (e) {
  if (e.code === "ENOENT") {
    if (toolName === "Write") {
      // New file — allow
      process.stdout.write(JSON.stringify({ continue: true }) + "\n");
      process.exit(0);
    } else {
      // Edit on non-existent file — deny
      process.stdout.write(
        JSON.stringify({
          decision: "block",
          reason: `[edit-read-guard] File does not exist; cannot Edit. Use Write to create.\nFile: ${filePath}`,
        }) + "\n"
      );
      process.exit(0);
    }
  }
  // Other realpath error — fail open
  process.stderr.write(`[edit-read-guard] WARN: realpathSync error: ${e.message}\n`);
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
  process.exit(0);
}

// Step 5 — turn state check
const turnId = currentTurnId();
if (turnId === null) {
  process.stdout.write(
    JSON.stringify({
      decision: "block",
      reason: `[edit-read-guard] Turn state missing — restart session or run dispatcher.\nFile: ${realpath}`,
    }) + "\n"
  );
  process.exit(0);
}

// Step 6 — read-log check
let alreadyRead;
try {
  alreadyRead = hasReadInTurn(realpath, turnId);
} catch (e) {
  process.stderr.write(`[edit-read-guard] WARN: hasReadInTurn error: ${e.message}\n`);
  // Fail open on read-log errors
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
  process.exit(0);
}

if (alreadyRead) {
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
} else {
  process.stdout.write(
    JSON.stringify({
      decision: "block",
      reason: DENY_MSG_TEMPLATE(realpath),
    }) + "\n"
  );
}
process.exit(0);
