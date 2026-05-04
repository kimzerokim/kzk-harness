#!/usr/bin/env node
// kzk-regression-memory.mjs — dismiss CLI mutation path.
// rev2 codex #1 — dismiss_count++, last_dismissed_at, archived if dismiss_count>=3.
// All writes via install/lib/sidecar-write.mjs (atomic).

import path from "node:path";
import { mutateSidecar } from "../lib/sidecar-write.mjs";

const ARCHIVE_THRESHOLD = 3;

async function dismiss(key, repoRoot) {
  const sidecarPath = path.join(repoRoot, ".kzk-harness", "regression-meta.jsonl");
  let foundEntry = null;
  await mutateSidecar(sidecarPath, (entries) => {
    return entries.map((e) => {
      if (e.key !== key) return e;
      const newCount = (e.dismiss_count ?? 0) + 1;
      const updated = {
        ...e,
        dismiss_count: newCount,
        last_dismissed_at: new Date().toISOString(),
        archived: newCount >= ARCHIVE_THRESHOLD ? true : (e.archived ?? false),
      };
      foundEntry = updated;
      return updated;
    });
  });
  if (!foundEntry) {
    process.stderr.write(`kzk-regression-memory: key not found in sidecar: ${key}\n`);
    process.exit(1);
  }
  process.stdout.write(`dismissed: ${foundEntry.key} (count=${foundEntry.dismiss_count}, archived=${foundEntry.archived})\n`);
}

export { dismiss, ARCHIVE_THRESHOLD };

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const [cmd, key] = process.argv.slice(2);
  if (cmd !== "dismiss" || !key) {
    process.stderr.write("usage: kzk-regression-memory dismiss <key>\n");
    process.exit(2);
  }
  dismiss(key, process.cwd()).catch((e) => {
    process.stderr.write(`kzk-regression-memory: ${e.message}\n`);
    process.exit(1);
  });
}
