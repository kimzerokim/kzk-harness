#!/usr/bin/env node
// check-hook-pair-sync.mjs — Cycle 57 Goal A.
//
// Verifies that the `// ===== shared:<name> =====` regions in the hook pair
// are byte-identical. Code outside shared markers is allowed to diverge
// (header, REPO_ROOT setup, CLI boilerplate).
//
// Hook pair:
//   .claude/hooks/check-cycle-exit.mjs   (repo-local dogfood copy)
//   install/hooks/check-cycle-exit.mjs   (propagation copy)
//
// Runner: node --test install/test/check-hook-pair-sync.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

const LOCAL_HOOK = path.join(REPO_ROOT, ".claude", "hooks", "check-cycle-exit.mjs");
const INSTALL_HOOK = path.join(REPO_ROOT, "install", "hooks", "check-cycle-exit.mjs");

// ---------------------------------------------------------------------------
// Region extraction
// ---------------------------------------------------------------------------

/**
 * Extract all shared regions from a file's text.
 * Returns a Map of { name -> content } where content is the text
 * between the start and end markers (exclusive of the marker lines).
 *
 * @param {string} text
 * @param {string} filePath  — used in error messages only
 * @returns {Map<string, string>}
 */
function extractRegions(text, filePath) {
  const regions = new Map();
  const startRe = /\/\/ ===== shared:start (\S+) =====/g;
  let m;
  while ((m = startRe.exec(text)) !== null) {
    const name = m[1];
    const contentStart = m.index + m[0].length;
    const endMarker = `// ===== shared:end ${name} =====`;
    const endIdx = text.indexOf(endMarker, contentStart);
    if (endIdx === -1) {
      throw new Error(`${filePath}: shared:start ${name} has no matching shared:end marker`);
    }
    if (regions.has(name)) {
      throw new Error(`${filePath}: duplicate shared region name: ${name}`);
    }
    regions.set(name, text.slice(contentStart, endIdx));
  }
  return regions;
}

// ---------------------------------------------------------------------------
// Load both files
// ---------------------------------------------------------------------------

let localText, installText;

test("both hook files exist and are readable", () => {
  assert.ok(fs.existsSync(LOCAL_HOOK), `local hook missing: ${LOCAL_HOOK}`);
  assert.ok(fs.existsSync(INSTALL_HOOK), `install hook missing: ${INSTALL_HOOK}`);
  localText = fs.readFileSync(LOCAL_HOOK, "utf8");
  installText = fs.readFileSync(INSTALL_HOOK, "utf8");
  assert.ok(localText.length > 0, "local hook is empty");
  assert.ok(installText.length > 0, "install hook is empty");
});

// ---------------------------------------------------------------------------
// Region presence and symmetry
// ---------------------------------------------------------------------------

let localRegions, installRegions;

test("both files have at least one shared region", () => {
  localRegions = extractRegions(localText, LOCAL_HOOK);
  installRegions = extractRegions(installText, INSTALL_HOOK);
  assert.ok(localRegions.size > 0, "local hook has no shared regions");
  assert.ok(installRegions.size > 0, "install hook has no shared regions");
});

test("both files have the same set of shared region names", () => {
  // Ensure previous test populated the maps (node:test runs sequentially)
  if (!localRegions) localRegions = extractRegions(localText ?? fs.readFileSync(LOCAL_HOOK, "utf8"), LOCAL_HOOK);
  if (!installRegions) installRegions = extractRegions(installText ?? fs.readFileSync(INSTALL_HOOK, "utf8"), INSTALL_HOOK);

  const localNames = new Set(localRegions.keys());
  const installNames = new Set(installRegions.keys());

  const onlyInLocal = [...localNames].filter((n) => !installNames.has(n));
  const onlyInInstall = [...installNames].filter((n) => !localNames.has(n));

  assert.deepEqual(
    onlyInLocal,
    [],
    `Regions in local but not install: ${onlyInLocal.join(", ")}`,
  );
  assert.deepEqual(
    onlyInInstall,
    [],
    `Regions in install but not local: ${onlyInInstall.join(", ")}`,
  );
});

// ---------------------------------------------------------------------------
// Per-region content comparison
// ---------------------------------------------------------------------------

// Dynamically generate one test per shared region so failures name the region.
// We read the files directly here to avoid test-ordering dependency.
const localRegionsForTests = extractRegions(fs.readFileSync(LOCAL_HOOK, "utf8"), LOCAL_HOOK);
const installRegionsForTests = extractRegions(fs.readFileSync(INSTALL_HOOK, "utf8"), INSTALL_HOOK);

for (const [name, localContent] of localRegionsForTests) {
  test(`shared region "${name}" is byte-identical in both files`, () => {
    assert.ok(
      installRegionsForTests.has(name),
      `Region "${name}" exists in local but is missing from install hook`,
    );
    const installContent = installRegionsForTests.get(name);
    if (localContent !== installContent) {
      // Build a helpful diff summary (first differing line)
      const localLines = localContent.split("\n");
      const installLines = installContent.split("\n");
      const maxLen = Math.max(localLines.length, installLines.length);
      let firstDiff = -1;
      for (let i = 0; i < maxLen; i++) {
        if (localLines[i] !== installLines[i]) {
          firstDiff = i + 1;
          break;
        }
      }
      const diffMsg =
        firstDiff >= 0
          ? `\n  First diff at line ${firstDiff} of the region:\n` +
            `    local  : ${JSON.stringify(localLines[firstDiff - 1])}\n` +
            `    install: ${JSON.stringify(installLines[firstDiff - 1])}`
          : "\n  (length differs but no line-level diff found — possible trailing whitespace)";

      assert.fail(
        `Region "${name}" differs between hook files.${diffMsg}\n` +
        `Fix: ensure the content inside\n` +
        `  // ===== shared:start ${name} =====\n` +
        `  // ===== shared:end ${name} =====\n` +
        `is byte-identical in both files.`,
      );
    }
  });
}
