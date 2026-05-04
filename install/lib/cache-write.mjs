#!/usr/bin/env node
// cache-write.mjs — atomic JSONL writer for fix-scope-cache.jsonl.
// Reuses lockdir + tmp + rename pattern from sidecar-write.mjs (Plan D).
// Single export: writeSingleEntryWithLock(path, key, value)
// JSONL schema: {"key":"<commit-SHA>","value":["path:line",...],"ts":"<ISO>"}
// Duplicate keys allowed — Gate 4.5 unions all entries for the current SHA.
// Authoritative spec: docs/plans/plan-B-fix-scope-expansion.md (rev2) §Task 2.

import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync, renameSync, mkdirSync as mkdirSyncFs } from "node:fs";
import path from "node:path";

const LOCK_TIMEOUT_MS = 5000;
const LOCK_RETRY_MS = 100;

async function acquireLock(filePath) {
  const lockDir = `${filePath}.lock`;
  const start = Date.now();
  while (Date.now() - start < LOCK_TIMEOUT_MS) {
    try {
      mkdirSync(lockDir);  // atomic mkdir — fails if exists (EEXIST)
      return () => {
        try { rmSync(lockDir, { recursive: true }); } catch { /* best-effort */ }
      };
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      await new Promise((r) => setTimeout(r, LOCK_RETRY_MS));
    }
  }
  // Timeout — best-effort write without lock (spec Rollback §3)
  process.stderr.write(`[cache-write] WARN: lock timeout on ${lockDir} — writing without lock\n`);
  return () => {};  // no-op release
}

function readExistingLines(filePath) {
  if (!existsSync(filePath)) return [];
  const raw = readFileSync(filePath, "utf8");
  return raw.split("\n").filter(Boolean);
}

/**
 * writeSingleEntryWithLock — appends one JSONL entry to the cache file atomically.
 *
 * @param {string} filePath — absolute path to .jsonl cache file
 * @param {string} key — typically the current git commit SHA
 * @param {string[]} value — list of callsite strings ("path/to/file.mjs:42")
 * @returns {Promise<void>}
 */
export async function writeSingleEntryWithLock(filePath, key, value) {
  // Ensure parent dir exists
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSyncFs(dir, { recursive: true });
  }

  const release = await acquireLock(filePath);
  try {
    const existingLines = readExistingLines(filePath);
    const newEntry = JSON.stringify({ key, value, ts: new Date().toISOString() });
    const allLines = [...existingLines, newEntry];
    const content = allLines.join("\n") + "\n";

    const tmpPath = `${filePath}.tmp.${process.pid}`;
    writeFileSync(tmpPath, content, "utf8");
    renameSync(tmpPath, filePath);
  } finally {
    release();
  }
}

/**
 * readEntriesForKey — reads all JSONL entries matching the given key.
 * Used by Gate 4.5 to union callsite lists for the current cycle SHA.
 *
 * @param {string} filePath
 * @param {string} key
 * @returns {string[][]} — array of value arrays (one per matching entry)
 */
export function readEntriesForKey(filePath, key) {
  if (!existsSync(filePath)) return [];
  const lines = readFileSync(filePath, "utf8").split("\n").filter(Boolean);
  const result = [];
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.key === key && Array.isArray(entry.value)) {
        result.push(entry.value);
      }
    } catch { /* skip malformed lines */ }
  }
  return result;
}
