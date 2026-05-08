#!/usr/bin/env node
// autonomous-stop-guard.test.mjs — 7-case unit test for autonomous-stop-guard hook (Cycle 52).
//
// Runs with: node --test install/test/autonomous-stop-guard.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const HOOK = path.resolve(REPO_ROOT, "install/hooks/autonomous-stop-guard.mjs");

// ---------------------------------------------------------------------------
// callHook — spawn node autonomous-stop-guard.mjs with given payload + env
// ---------------------------------------------------------------------------
function callHook({ payload = {}, env = {} }) {
  return spawnSync("node", [HOOK], {
    input: JSON.stringify(payload),
    env: {
      ...process.env,
      OMC_SKIP_HOOKS: "",
      ...env,
    },
    encoding: "utf8",
    timeout: 10000,
  });
}

// ---------------------------------------------------------------------------
// Helper: create a temp marker dir + write marker file
// ---------------------------------------------------------------------------
function makeTempMarkerDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "kzk-test-marker-"));
}

function writeMarker(dir, tsOffset = 0) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "autonomous-active"),
    JSON.stringify({ ts: Date.now() + tsOffset }),
    "utf8"
  );
}

// ---------------------------------------------------------------------------
// Helper: create a minimal transcript file with TodoWrite entries
// ---------------------------------------------------------------------------
function makeTranscriptWithTodos(dir, todos) {
  const transcriptPath = path.join(dir, "transcript.jsonl");
  const line = JSON.stringify({
    message: {
      content: [
        {
          type: "tool_use",
          name: "TodoWrite",
          input: { todos },
        },
      ],
    },
  });
  fs.writeFileSync(transcriptPath, line + "\n", "utf8");
  return transcriptPath;
}

// ---------------------------------------------------------------------------
// Helper: create a user-queue.md with pending entries
// ---------------------------------------------------------------------------
function makeUserQueue(dir, pendingCount) {
  const queueDir = path.join(dir, "docs", "harness");
  fs.mkdirSync(queueDir, { recursive: true });
  const queueFile = path.join(queueDir, "user-queue.md");
  let content = "# User Queue\n\n";
  for (let i = 0; i < pendingCount; i++) {
    content += `### Q-TOOL-${i + 1} (Pending)\n\nContext: test\n\n`;
  }
  fs.writeFileSync(queueFile, content, "utf8");
  return queueFile;
}

// ---------------------------------------------------------------------------
// Test 1 — No marker file → returns {} (allow)
// ---------------------------------------------------------------------------
test("no marker file → returns {} (allow stop)", () => {
  const markerDir = makeTempMarkerDir();
  // Don't write any marker file
  const r = callHook({
    payload: {},
    env: { KZK_MARKER_DIR_OVERRIDE: markerDir },
  });
  assert.equal(r.status, 0, `exit code: ${r.status}, stderr: ${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out, {});
  fs.rmSync(markerDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Test 2 — Marker present, TTL expired → returns {} (allow), marker deleted
// ---------------------------------------------------------------------------
test("marker present TTL expired → returns {} (allow), marker deleted", () => {
  const markerDir = makeTempMarkerDir();
  // Write marker with ts 2 hours ago (TTL default 1hr)
  writeMarker(markerDir, -(2 * 3600 * 1000));
  const r = callHook({
    payload: {},
    env: {
      KZK_MARKER_DIR_OVERRIDE: markerDir,
      KZK_AUTONOMOUS_TTL_SEC: "3600",
    },
  });
  assert.equal(r.status, 0, `exit code: ${r.status}, stderr: ${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out, {});
  // Marker should be deleted
  assert.equal(fs.existsSync(path.join(markerDir, "autonomous-active")), false);
  fs.rmSync(markerDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Test 3 — Marker present, TTL valid, transcript empty + no user-queue.md → returns {} (allow, all clear)
// ---------------------------------------------------------------------------
test("marker valid, no todos, no user-queue → returns {} (allow, all clear)", () => {
  const markerDir = makeTempMarkerDir();
  writeMarker(markerDir);
  const transcriptDir = makeTempMarkerDir();
  const transcriptPath = path.join(transcriptDir, "empty-transcript.jsonl");
  fs.writeFileSync(transcriptPath, "", "utf8");

  const r = callHook({
    payload: { transcript_path: transcriptPath },
    env: { KZK_MARKER_DIR_OVERRIDE: markerDir },
  });
  assert.equal(r.status, 0, `exit code: ${r.status}, stderr: ${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out, {});
  fs.rmSync(markerDir, { recursive: true, force: true });
  fs.rmSync(transcriptDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Test 4 — Marker valid, transcript has 2 in_progress todos → decision: "block"
// ---------------------------------------------------------------------------
test("marker valid, 2 in_progress todos → decision: block with reason", () => {
  const markerDir = makeTempMarkerDir();
  writeMarker(markerDir);
  const transcriptDir = makeTempMarkerDir();
  const transcriptPath = makeTranscriptWithTodos(transcriptDir, [
    { id: "1", content: "Task A", status: "in_progress" },
    { id: "2", content: "Task B", status: "in_progress" },
    { id: "3", content: "Task C", status: "completed" },
  ]);

  const r = callHook({
    payload: { transcript_path: transcriptPath },
    env: { KZK_MARKER_DIR_OVERRIDE: markerDir },
  });
  assert.equal(r.status, 0, `exit code: ${r.status}, stderr: ${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert.equal(out.decision, "block");
  assert.ok(out.reason.includes("kzk-autonomous-stop-guard"), "reason must cite hook name");
  assert.ok(out.reason.includes("2 open todos"), `reason must mention 2 todos, got: ${out.reason}`);
  assert.ok(out.reason.includes("그만"), "reason must include escape keyword");
  fs.rmSync(markerDir, { recursive: true, force: true });
  fs.rmSync(transcriptDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Test 5 — Marker valid, user-queue.md has 1 Pending entry → decision: "block"
// ---------------------------------------------------------------------------
test("marker valid, user-queue has 1 Pending entry → decision: block", () => {
  const markerDir = makeTempMarkerDir();
  writeMarker(markerDir);
  const repoDir = makeTempMarkerDir();
  makeUserQueue(repoDir, 1);

  // Use empty transcript (no todos)
  const transcriptPath = path.join(repoDir, "empty.jsonl");
  fs.writeFileSync(transcriptPath, "", "utf8");

  // We need to override the git root detection — put a fake git repo marker
  fs.mkdirSync(path.join(repoDir, ".git"), { recursive: true });

  const r = spawnSync("node", [HOOK], {
    input: JSON.stringify({ transcript_path: transcriptPath }),
    env: {
      ...process.env,
      OMC_SKIP_HOOKS: "",
      KZK_MARKER_DIR_OVERRIDE: markerDir,
    },
    encoding: "utf8",
    timeout: 10000,
    cwd: repoDir,
  });
  assert.equal(r.status, 0, `exit code: ${r.status}, stderr: ${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert.equal(out.decision, "block");
  assert.ok(out.reason.includes("1 Pending queue"), `reason must mention 1 Pending, got: ${out.reason}`);
  fs.rmSync(markerDir, { recursive: true, force: true });
  fs.rmSync(repoDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Test 6 — stop_hook_active=true, block counter at MAX → escape hatch returns {}
// ---------------------------------------------------------------------------
test("stop_hook_active=true, block count at max → escape hatch returns {} (allow)", () => {
  const markerDir = makeTempMarkerDir();
  writeMarker(markerDir);
  // Write block count at MAX (3)
  fs.writeFileSync(path.join(markerDir, "stop-block-count"), "3", "utf8");

  const transcriptDir = makeTempMarkerDir();
  const transcriptPath = makeTranscriptWithTodos(transcriptDir, [
    { id: "1", content: "Task A", status: "in_progress" },
  ]);

  const r = callHook({
    payload: { stop_hook_active: true, transcript_path: transcriptPath },
    env: { KZK_MARKER_DIR_OVERRIDE: markerDir },
  });
  assert.equal(r.status, 0, `exit code: ${r.status}, stderr: ${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out, {});
  fs.rmSync(markerDir, { recursive: true, force: true });
  fs.rmSync(transcriptDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Test 7 — OMC_SKIP_HOOKS=autonomous-stop-guard → returns {} regardless
// ---------------------------------------------------------------------------
test("OMC_SKIP_HOOKS=autonomous-stop-guard → returns {} (kill switch)", () => {
  const markerDir = makeTempMarkerDir();
  writeMarker(markerDir);
  const transcriptDir = makeTempMarkerDir();
  const transcriptPath = makeTranscriptWithTodos(transcriptDir, [
    { id: "1", content: "Task A", status: "in_progress" },
    { id: "2", content: "Task B", status: "pending" },
  ]);

  const r = callHook({
    payload: { transcript_path: transcriptPath },
    env: {
      OMC_SKIP_HOOKS: "autonomous-stop-guard",
      KZK_MARKER_DIR_OVERRIDE: markerDir,
    },
  });
  assert.equal(r.status, 0, `exit code: ${r.status}, stderr: ${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out, {});
  fs.rmSync(markerDir, { recursive: true, force: true });
  fs.rmSync(transcriptDir, { recursive: true, force: true });
});
