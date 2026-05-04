#!/usr/bin/env node
// sidecar-write.mjs — 공용 atomic writer for .kzk-harness/regression-meta.jsonl.
//
// 모든 sidecar mutation (recall hook orphan cleanup / stale-check / dismiss CLI / cycle 회고 append)
// 이 utility 통과 의무. 패턴: lockdir (mkdir <sidecar>.lock — macOS 호환) + write to temp + atomic mv.
// rev2 codex #6 답.

import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import path from "node:path";

const LOCK_TIMEOUT_MS = 5000;
const LOCK_RETRY_MS = 100;

export async function acquireLock(sidecarPath) {
  const lockDir = `${sidecarPath}.lock`;
  const start = Date.now();
  while (Date.now() - start < LOCK_TIMEOUT_MS) {
    try {
      mkdirSync(lockDir);  // atomic — fails if exists
      return () => { try { rmSync(lockDir, { recursive: true }); } catch {} };
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      await new Promise((r) => setTimeout(r, LOCK_RETRY_MS));
    }
  }
  throw new Error(`sidecar-write: lock timeout on ${lockDir}`);
}

export function writeAtomic(sidecarPath, entries) {
  const tmpPath = `${sidecarPath}.tmp.${process.pid}`;
  const content = entries.map((e) => JSON.stringify(e)).join("\n") + (entries.length > 0 ? "\n" : "");
  writeFileSync(tmpPath, content);
  renameSync(tmpPath, sidecarPath);
}

export function readSidecar(sidecarPath) {
  if (!existsSync(sidecarPath)) return [];
  const lines = readFileSync(sidecarPath, "utf8").split("\n").filter(Boolean);
  return lines.map((l) => {
    try { return JSON.parse(l); }
    catch { return null; }  // invalid line skip — don't fail whole read
  }).filter(Boolean);
}

export async function mutateSidecar(sidecarPath, mutator) {
  const release = await acquireLock(sidecarPath);
  try {
    const entries = readSidecar(sidecarPath);
    const updated = mutator(entries);
    writeAtomic(sidecarPath, updated);
    return updated;
  } finally {
    release();
  }
}
