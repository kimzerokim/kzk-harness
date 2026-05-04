#!/usr/bin/env node
// regression-recall.mjs — UserPromptSubmit hook for kzk-regression-memory.
// rev2 — codex #4 (orphan cleanup 분리), #5 (자가-skip 동사구), #6 (atomic write),
//        #7 (gstack 미설치 stderr WARN).
// Authoritative spec: docs/plans/regression-memory-and-fix-quality-spec.md (rev7).
// Default DISABLED at Plan D commit. Auto-enabled by kzk-pre-merge-sync last step.

import fs from "node:fs";
import path from "node:path";
import { mutateSidecar, readSidecar } from "../lib/sidecar-write.mjs";
import { FIX_KEYWORDS, SELF_IMPROVE_VERBPHRASES, shouldSkip, detectFixIntent, normalizeQuery } from "../lib/hook-shared.mjs";

// rev2 codex #5 — 동사구만, 명사 단독 금지 (now sourced from hook-shared.mjs — single SoT)
// FIX_KEYWORDS, SELF_IMPROVE_VERBPHRASES, shouldSkip, detectFixIntent, normalizeQuery
// all imported above. Local definitions removed to prevent drift.

const DECAY_BASE = 0.85;
const CONFIDENCE_THRESHOLD = 4;

// rev3 — direct JSONL read from ~/.gstack/projects/*/learnings.jsonl (no CLI)
function loadAllLearnEntries() {
  const projectsDir = path.join(process.env.HOME ?? "", ".gstack", "projects");
  if (!fs.existsSync(projectsDir)) return null;
  let subdirs;
  try {
    subdirs = fs.readdirSync(projectsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return null;
  }
  const entries = [];
  for (const slug of subdirs) {
    const jsonlPath = path.join(projectsDir, slug, "learnings.jsonl");
    if (!fs.existsSync(jsonlPath)) continue;
    try {
      const lines = fs.readFileSync(jsonlPath, "utf8").split("\n").filter(Boolean);
      for (const line of lines) {
        try { entries.push(JSON.parse(line)); } catch { /* skip malformed line */ }
      }
    } catch { /* skip unreadable file */ }
  }
  return entries.length > 0 ? entries : null;
}

// rev3 — filter entries by query words against insight + key fields
function querylearn(query) {
  const allEntries = loadAllLearnEntries();
  if (allEntries === null) {
    return { entries: null, warn: "gstack-learnings-not-found" };
  }
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matched = allEntries.filter((e) => {
    const haystack = `${e.insight ?? ""} ${e.key ?? ""}`.toLowerCase();
    return words.some((w) => haystack.includes(w));
  });
  return { entries: matched, warn: null };
}

// rev3 — collect all key fields from all projects
function listAllLearnKeys() {
  const allEntries = loadAllLearnEntries();
  if (allEntries === null) return null;  // no files → orphan cleanup skip (false-positive 삭제 차단)
  return allEntries.map((e) => e.key).filter(Boolean);
}

function decay(confidence, dismissCount) {
  return confidence * Math.pow(DECAY_BASE, dismissCount);
}

// rev2 codex #4 — cleanup 은 allLearnKeys 기준 (searchHits 아님)
async function orphanCleanup(sidecarPath, allLearnKeys) {
  if (allLearnKeys === null) return null;  // gstack 미가용 → skip
  const keepKeys = new Set(allLearnKeys);
  let removedCount = 0;
  await mutateSidecar(sidecarPath, (entries) => {
    const survivors = entries.filter((e) => keepKeys.has(e.key));
    removedCount = entries.length - survivors.length;
    return survivors;
  });
  if (removedCount > 0) {
    process.stderr.write(`[regression-recall] orphan keys removed: ${removedCount}\n`);
  }
  return removedCount;
}

function buildReminder(hits) {
  if (hits.length === 0) return null;
  const lines = hits.map((h) => {
    const stale = h.staleFlag ? " [⚠ stale]" : "";
    return `- ${h.key}: ${h.insight} (cycle ${h.cycles.join(",")}, confidence_decayed ${h.confidenceDecayed.toFixed(2)})${stale}`;
  });
  return [
    `🚨 [REGRESSION RECALL] 과거 유사 fix ${hits.length}건:`,
    ...lines,
    `⚠ 자동 적용 금지. 매칭 정확성 검토 후 채택.`,
    `dismiss: kzk-regression-memory dismiss <key>`,
  ].join("\n");
}

export {
  shouldSkip, detectFixIntent, normalizeQuery, decay, orphanCleanup,
  buildReminder, FIX_KEYWORDS, SELF_IMPROVE_VERBPHRASES,
};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { raw += chunk; });
  process.stdin.on("end", async () => {
    let payload;
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }
    const prompt = String(payload.prompt ?? payload.user_prompt ?? "");
    const repoRoot = process.cwd();
    const sidecarPath = path.join(repoRoot, ".kzk-harness", "regression-meta.jsonl");

    const skip = shouldSkip(prompt, process.env);
    if (skip) {
      process.stdout.write(JSON.stringify({ continue: true, _skip: skip }) + "\n");
      return;
    }
    if (!detectFixIntent(prompt)) {
      process.stdout.write(JSON.stringify({ continue: true }) + "\n");
      return;
    }

    const query = normalizeQuery(prompt);
    const { entries: learnEntries, warn } = querylearn(query);

    if (learnEntries === null) {
      // gstack 미설치 — silent skip 금지 (codex #7)
      process.stdout.write(JSON.stringify({ continue: true, _warn: warn }) + "\n");
      return;
    }

    // rev2 codex #4 — orphan cleanup 은 allLearnKeys 기준만
    const allKeys = listAllLearnKeys();
    await orphanCleanup(sidecarPath, allKeys);

    // re-read sidecar after potential cleanup
    const sidecarEntries = readSidecar(sidecarPath);
    const sidecarByKey = new Map(sidecarEntries.map((e) => [e.key, e]));

    const hits = [];
    for (const learnEntry of learnEntries) {
      const meta = sidecarByKey.get(learnEntry.key);
      if (!meta) continue;  // sidecar 미존재 = invalid (FK 룰)
      if (meta.archived) continue;
      const dec = decay(learnEntry.confidence, meta.dismiss_count);
      if (dec < CONFIDENCE_THRESHOLD) continue;
      hits.push({
        key: learnEntry.key,
        insight: learnEntry.insight,
        cycles: meta.related_cycles,
        confidenceDecayed: dec,
        staleFlag: meta.stale ?? false,
      });
    }

    const reminder = buildReminder(hits);
    if (reminder) {
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: reminder },
        }) + "\n",
      );
    } else {
      process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    }
  });
}
