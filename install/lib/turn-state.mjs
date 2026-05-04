#!/usr/bin/env node
// turn-state.mjs — Turn state SoT for edit-read-guard hook (Plan F rev2).
//
// current-turn.json: atomic write (tmp + fs.renameSync).
// read-log.jsonl:    O_APPEND atomic write — single JSON.stringify line is
//                    well under PIPE_BUF (POSIX >= 4096 bytes), so O_APPEND
//                    guarantees atomicity. flock not needed (spec rev3 lock).
//
// KZK_TEST_STATE_DIR is honoured ONLY when NODE_ENV === "test" to prevent
// production installs accidentally overriding the state directory.
//
// POSIX-only (Linux / macOS). Windows not supported.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// getStateDir — returns resolved state directory, mkdir recursive guaranteed.
// ---------------------------------------------------------------------------
export function getStateDir() {
  let dir;
  if (process.env.NODE_ENV === "test" && process.env.KZK_TEST_STATE_DIR) {
    dir = process.env.KZK_TEST_STATE_DIR;
  } else {
    dir = path.join(os.homedir(), ".cache", "kzk-harness");
  }
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
function turnFilePath(stateDir) {
  return path.join(stateDir, "current-turn.json");
}

function readLogPath(stateDir) {
  return path.join(stateDir, "read-log.jsonl");
}

// ---------------------------------------------------------------------------
// rotateTurn — generate new uuid-v4 turn-id, atomic-write current-turn.json,
//              truncate read-log.jsonl.
// ---------------------------------------------------------------------------
export function rotateTurn() {
  const stateDir = getStateDir();
  const turnId = randomUUID();
  const payload = JSON.stringify({ turn_id: turnId, started_at: new Date().toISOString() });

  // Atomic write: tmp + rename
  const turnFile = turnFilePath(stateDir);
  const tmp = `${turnFile}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, payload, "utf8");
  fs.renameSync(tmp, turnFile);

  // Truncate read-log
  fs.writeFileSync(readLogPath(stateDir), "", "utf8");

  return turnId;
}

// ---------------------------------------------------------------------------
// currentTurnId — read current-turn.json and return turn_id. null if missing.
// ---------------------------------------------------------------------------
export function currentTurnId() {
  const stateDir = getStateDir();
  const turnFile = turnFilePath(stateDir);
  try {
    const raw = fs.readFileSync(turnFile, "utf8");
    const obj = JSON.parse(raw);
    return obj.turn_id ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// appendRead — O_APPEND atomic single-write of one JSONL line.
//              realpath normalisation is idempotent — caller may normalise too.
// ---------------------------------------------------------------------------
export function appendRead(realpath) {
  const stateDir = getStateDir();
  const logFile = readLogPath(stateDir);
  const turnId = currentTurnId();
  const line = JSON.stringify({ turn: turnId, file: realpath, ts: new Date().toISOString() }) + "\n";
  const buf = Buffer.from(line, "utf8");

  // O_APPEND atomic write — single fs.writeSync call, POSIX guarantee
  const fd = fs.openSync(logFile, "a");
  try {
    fs.writeSync(fd, buf);
  } finally {
    fs.closeSync(fd);
  }
}

// ---------------------------------------------------------------------------
// hasReadInTurn — scan read-log.jsonl line-by-line for matching turn + file.
// ---------------------------------------------------------------------------
export function hasReadInTurn(realpath, turnId) {
  const stateDir = getStateDir();
  const logFile = readLogPath(stateDir);

  let raw;
  try {
    raw = fs.readFileSync(logFile, "utf8");
  } catch {
    return false;
  }

  const lines = raw.split("\n").filter(Boolean);
  for (const line of lines) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      // corrupt line — silent skip + stderr WARN
      process.stderr.write(`[turn-state] WARN: corrupt read-log line skipped: ${line}\n`);
      continue;
    }
    if (entry.turn === turnId && entry.file === realpath) {
      return true;
    }
  }
  return false;
}
