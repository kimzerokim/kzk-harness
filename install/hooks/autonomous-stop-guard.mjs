#!/usr/bin/env node
// autonomous-stop-guard.mjs — Stop event hook for kzk-harness (Cycle 52).
//
// Intercepts polite-stops during autonomous mode. If the autonomous-active marker
// file is present and within TTL, checks completion signals (open TODOs, pending
// user-queue entries) before deciding whether to block or allow the stop.
//
// Kill switch: OMC_SKIP_HOOKS=autonomous-stop-guard
// Fail-open: any internal error → allow stop (never block on hook bug)
//
// Wired as Stop hook by install-global.sh --enable-hooks.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// ---------------------------------------------------------------------------
// Kill switch check (early — before stdin read)
// ---------------------------------------------------------------------------
const skipHooks = (process.env.OMC_SKIP_HOOKS ?? "").split(",").map((s) => s.trim());
if (skipHooks.includes("autonomous-stop-guard")) {
  process.stdout.write(JSON.stringify({}) + "\n");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const MARKER_DIR = process.env.KZK_MARKER_DIR_OVERRIDE || path.join(os.homedir(), '.cache', 'kzk-harness');
const MARKER_FILE = path.join(MARKER_DIR, 'autonomous-active');
const BLOCK_COUNT_FILE = path.join(MARKER_DIR, 'stop-block-count');
const TTL_SEC = parseInt(process.env.KZK_AUTONOMOUS_TTL_SEC || '3600', 10);
const MAX_BLOCKS_PER_TURN = 3;

function allowStop() {
  // Reset block counter on allow
  try { fs.unlinkSync(BLOCK_COUNT_FILE); } catch { /* ENOENT OK */ }
  process.stdout.write(JSON.stringify({}) + "\n");
  process.exit(0);
}

function blockStop(reason) {
  process.stdout.write(
    JSON.stringify({ decision: "block", reason }) + "\n"
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Read stdin JSON payload
// ---------------------------------------------------------------------------
let payload;
try {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  payload = raw.trim() ? JSON.parse(raw) : {};
} catch {
  // Malformed payload — fail open
  process.stderr.write("[autonomous-stop-guard] WARN: malformed stdin, allowing stop\n");
  process.stdout.write(JSON.stringify({}) + "\n");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Marker check
// ---------------------------------------------------------------------------
let marker;
try {
  const markerRaw = fs.readFileSync(MARKER_FILE, 'utf8');
  marker = JSON.parse(markerRaw);
  if (Date.now() - marker.ts > TTL_SEC * 1000) {
    process.stderr.write("[autonomous-stop-guard] marker expired, allowing stop\n");
    try { fs.unlinkSync(MARKER_FILE); } catch {}
    allowStop();
  }
} catch {
  // No marker — not in autonomous mode
  process.stderr.write("[autonomous-stop-guard] no marker, allowing stop\n");
  allowStop();
}

// ---------------------------------------------------------------------------
// Per-turn max-block guard (escape hatch from runaway block loop)
// ---------------------------------------------------------------------------
const stopHookActive = payload.stop_hook_active === true;
if (stopHookActive) {
  let blockCount = 0;
  try {
    blockCount = parseInt(fs.readFileSync(BLOCK_COUNT_FILE, 'utf8').trim(), 10) || 0;
  } catch { /* ENOENT = 0 */ }

  if (blockCount >= MAX_BLOCKS_PER_TURN) {
    process.stderr.write(`[autonomous-stop-guard] max-block escape hatch (count=${blockCount}), allowing stop\n`);
    allowStop();
  }
}

// ---------------------------------------------------------------------------
// Completion signal 1: TodoWrite open count from transcript
// ---------------------------------------------------------------------------
let openTodos = 0;
try {
  const transcriptPath = payload.transcript_path;
  if (transcriptPath && fs.existsSync(transcriptPath)) {
    const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
    // Find latest TodoWrite tool_use by scanning all lines
    let latestTodos = null;
    for (const line of lines) {
      if (!line.trim()) continue;
      let entry;
      try { entry = JSON.parse(line); } catch { continue; }
      // Walk the message structure to find TodoWrite tool_use inputs
      const content = entry?.message?.content ?? entry?.content ?? [];
      if (!Array.isArray(content)) continue;
      for (const item of content) {
        if (item?.type === 'tool_use' && item?.name === 'TodoWrite') {
          const todos = item?.input?.todos;
          if (Array.isArray(todos)) {
            latestTodos = todos;
          }
        }
      }
    }
    if (latestTodos) {
      openTodos = latestTodos.filter(
        (t) => t.status === 'pending' || t.status === 'in_progress'
      ).length;
    }
  }
} catch (e) {
  process.stderr.write(`[autonomous-stop-guard] WARN: transcript parse error: ${e.message}\n`);
}

// ---------------------------------------------------------------------------
// Completion signal 2: user-queue.md Pending count
// ---------------------------------------------------------------------------
let openPending = 0;
try {
  // Resolve repo root from cwd or git
  let repoRoot = process.cwd();
  try {
    const { spawnSync } = await import('node:child_process');
    const r = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim()) {
      repoRoot = r.stdout.trim();
    }
  } catch { /* fall back to cwd */ }

  const queueFile = path.join(repoRoot, 'docs', 'harness', 'user-queue.md');
  if (fs.existsSync(queueFile)) {
    const queueContent = fs.readFileSync(queueFile, 'utf8');
    const lines = queueContent.split('\n');
    for (const line of lines) {
      // Match: ### <anything>(Pending) but NOT RESOLVED
      if (/^###\s+.*\(Pending\)/.test(line) && !/RESOLVED/.test(line)) {
        openPending++;
      }
    }
  }
} catch (e) {
  process.stderr.write(`[autonomous-stop-guard] WARN: user-queue parse error: ${e.message}\n`);
}

// ---------------------------------------------------------------------------
// Decision
// ---------------------------------------------------------------------------
const ttlRemainingMin = Math.round((TTL_SEC * 1000 - (Date.now() - marker.ts)) / 60000);

if (openTodos > 0 || openPending > 0) {
  // Increment block counter
  let blockCount = 0;
  try {
    blockCount = parseInt(fs.readFileSync(BLOCK_COUNT_FILE, 'utf8').trim(), 10) || 0;
  } catch { /* ENOENT = 0 */ }
  blockCount++;
  try {
    fs.mkdirSync(MARKER_DIR, { recursive: true });
    fs.writeFileSync(BLOCK_COUNT_FILE, String(blockCount), 'utf8');
  } catch (e) {
    process.stderr.write(`[autonomous-stop-guard] WARN: block-count write: ${e.message}\n`);
  }

  process.stderr.write(`[autonomous-stop-guard] blocking stop (todos=${openTodos}, pending=${openPending}, block#${blockCount})\n`);

  blockStop(
    `🚨 [kzk-autonomous-stop-guard] Autonomous mode active (TTL ${ttlRemainingMin} minutes remaining). ` +
    `Detected: ${openTodos} open todos, ${openPending} Pending queue entries. ` +
    `Per kzk-autonomous-loop §Polite-stop ban examples, do NOT halt mid-flow. ` +
    `Continue: dispatch next task or finish remaining work. ` +
    `To genuinely halt: type '그만' / 'stop autonomous' / 'halt autonomous'. ` +
    `Marker auto-expires after TTL.`
  );
} else {
  // All clear — allow stop and clean up
  process.stderr.write(`[autonomous-stop-guard] all clear (todos=0, pending=0), allowing stop and clearing marker\n`);
  try { fs.unlinkSync(MARKER_FILE); } catch {}
  allowStop();
}
