#!/usr/bin/env node
// edit-read-guard.test.mjs — 6-case unit test for edit-read-guard hook (Plan F rev2).
//
// Isolation: each case uses a fresh tmp dir as KZK_TEST_STATE_DIR (NODE_ENV=test).
// Turn rotate via turn-state.mjs direct import (no hidden hook API — Plan F #3).

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const HOOK = path.resolve(REPO_ROOT, "install/hooks/edit-read-guard.mjs");
const TURN_LIB = path.resolve(REPO_ROOT, "install/lib/turn-state.mjs");

// ---------------------------------------------------------------------------
// rotateTurnDirect — import turn-state.mjs directly, bypass-cache with ?t=
// ---------------------------------------------------------------------------
async function rotateTurnDirect(stateDir) {
  process.env.NODE_ENV = "test";
  process.env.KZK_TEST_STATE_DIR = stateDir;
  const mod = await import(`${TURN_LIB}?t=${Date.now()}`);
  mod.rotateTurn();
}

// ---------------------------------------------------------------------------
// withFixture — creates isolated tmp dir, awaits async fn, cleans up
// ---------------------------------------------------------------------------
async function withFixture(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "guardf-"));
  const stateDir = path.join(dir, "state");
  fs.mkdirSync(stateDir, { recursive: true });
  const file = path.join(dir, "target.txt");
  fs.writeFileSync(file, "hello");
  try {
    return await fn({ dir, stateDir, file });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// callHook — spawn node edit-read-guard.mjs with fixture env
// ---------------------------------------------------------------------------
function callHook({ stateDir, mode, payload }) {
  const args = ["--mode=" + (mode ?? "pre")];
  return spawnSync("node", [HOOK, ...args], {
    input: JSON.stringify(payload),
    env: {
      ...process.env,
      NODE_ENV: "test",
      KZK_TEST_STATE_DIR: stateDir,
      OMC_SKIP_HOOKS: "",
    },
    encoding: "utf8",
  });
}

// ---------------------------------------------------------------------------
// Case 1 — read → edit allow
// ---------------------------------------------------------------------------
test("read → edit allow", async () => {
  await withFixture(async ({ stateDir, file }) => {
    await rotateTurnDirect(stateDir);

    // Record the Read
    callHook({
      stateDir,
      mode: "post-read",
      payload: { tool_name: "Read", tool_input: { file_path: file } },
    });

    // Now Edit should be allowed
    const r = callHook({
      stateDir,
      payload: { tool_name: "Edit", tool_input: { file_path: file } },
    });
    const out = JSON.parse(r.stdout);
    assert.equal(out.continue ?? (out.decision !== "block"), true);
  });
});

// ---------------------------------------------------------------------------
// Case 2 — edit without read deny
// ---------------------------------------------------------------------------
test("edit without read deny", async () => {
  await withFixture(async ({ stateDir, file }) => {
    await rotateTurnDirect(stateDir);

    const r = callHook({
      stateDir,
      payload: { tool_name: "Edit", tool_input: { file_path: file } },
    });
    const out = JSON.parse(r.stdout);
    assert.equal(out.decision, "block");
    assert.match(out.reason, /edit-read-guard/);
  });
});

// ---------------------------------------------------------------------------
// Case 3 — Write ENOENT allow (new file)
// ---------------------------------------------------------------------------
test("Write ENOENT allow", async () => {
  await withFixture(async ({ stateDir, dir }) => {
    await rotateTurnDirect(stateDir);

    const r = callHook({
      stateDir,
      payload: {
        tool_name: "Write",
        tool_input: { file_path: path.join(dir, "newfile.txt") },
      },
    });
    const out = JSON.parse(r.stdout);
    assert.equal(out.continue, true);
  });
});

// ---------------------------------------------------------------------------
// Case 4 — bypass token single-use
// ---------------------------------------------------------------------------
test("bypass token single-use", async () => {
  await withFixture(async ({ stateDir, file }) => {
    await rotateTurnDirect(stateDir);

    // Place bypass token in stateDir (hook resolves BYPASS_FILE from STATE_DIR)
    fs.writeFileSync(path.join(stateDir, "bypass-token"), "");

    // First call: token consumed → allow
    const r1 = callHook({
      stateDir,
      payload: { tool_name: "Edit", tool_input: { file_path: file } },
    });
    assert.equal(JSON.parse(r1.stdout).continue, true);

    // Second call: token gone → deny
    const r2 = callHook({
      stateDir,
      payload: { tool_name: "Edit", tool_input: { file_path: file } },
    });
    assert.equal(JSON.parse(r2.stdout).decision, "block");
  });
});

// ---------------------------------------------------------------------------
// Case 5 — cross-turn allow (reads persist across turns within session)
// ---------------------------------------------------------------------------
test("cross-turn allow", async () => {
  await withFixture(async ({ stateDir, file }) => {
    await rotateTurnDirect(stateDir);

    // Record Read in turn 1
    callHook({
      stateDir,
      mode: "post-read",
      payload: { tool_name: "Read", tool_input: { file_path: file } },
    });

    // Rotate to turn 2 — read-log is pruned by age, NOT truncated
    await rotateTurnDirect(stateDir);

    // Edit in turn 2 — should be allowed (read persists across turns)
    const r = callHook({
      stateDir,
      payload: { tool_name: "Edit", tool_input: { file_path: file } },
    });
    assert.equal(JSON.parse(r.stdout).continue, true);
  });
});

// ---------------------------------------------------------------------------
// Case 6 — symlink realpath normalize
// ---------------------------------------------------------------------------
test("symlink realpath normalize", async () => {
  await withFixture(async ({ stateDir, file, dir }) => {
    const link = path.join(dir, "link.txt");
    fs.symlinkSync(file, link);

    await rotateTurnDirect(stateDir);

    // Read via real path
    callHook({
      stateDir,
      mode: "post-read",
      payload: { tool_name: "Read", tool_input: { file_path: file } },
    });

    // Edit via symlink — realpath normalises both sides → same file → allow
    const r = callHook({
      stateDir,
      payload: { tool_name: "Edit", tool_input: { file_path: link } },
    });
    const out = JSON.parse(r.stdout);
    assert.equal(out.continue ?? (out.decision !== "block"), true);
  });
});
