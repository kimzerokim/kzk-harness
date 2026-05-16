#!/usr/bin/env node
// check-hook-pair-sync.mjs — Cycle 57 Goal A, Cycle 58 Phase D.
//
// Verifies that the `// ===== shared:<name> =====` regions in each hook pair
// are byte-identical. Code outside shared markers is allowed to diverge
// (header, REPO_ROOT setup, CLI boilerplate).
//
// Hook pairs (PAIR_LIST):
//   .claude/hooks/check-cycle-exit.mjs    ↔ install/hooks/check-cycle-exit.mjs
//   .claude/hooks/docker-compose-gate.mjs ↔ install/hooks/docker-compose-gate.mjs
//
// Runner: node --test install/test/check-hook-pair-sync.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

// ---------------------------------------------------------------------------
// Hook pair list (Cycle 58: expanded from single-pair to multi-pair)
// ---------------------------------------------------------------------------

const PAIR_LIST = [
  {
    name: 'check-cycle-exit.mjs',
    projectLocal: path.join(REPO_ROOT, '.claude', 'hooks', 'check-cycle-exit.mjs'),
    global: path.join(REPO_ROOT, 'install', 'hooks', 'check-cycle-exit.mjs'),
  },
  {
    name: 'docker-compose-gate.mjs',
    projectLocal: path.join(REPO_ROOT, '.claude', 'hooks', 'docker-compose-gate.mjs'),
    global: path.join(REPO_ROOT, 'install', 'hooks', 'docker-compose-gate.mjs'),
  },
];

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
// Per-pair validation
// ---------------------------------------------------------------------------

function validatePair(pair) {
  const { name, projectLocal, global: installPath } = pair;

  test(`[${name}] both hook files exist and are readable`, () => {
    assert.ok(fs.existsSync(projectLocal), `local hook missing: ${projectLocal}`);
    assert.ok(fs.existsSync(installPath), `install hook missing: ${installPath}`);
    const localText = fs.readFileSync(projectLocal, 'utf8');
    const installText = fs.readFileSync(installPath, 'utf8');
    assert.ok(localText.length > 0, 'local hook is empty');
    assert.ok(installText.length > 0, 'install hook is empty');
  });

  test(`[${name}] both files have at least one shared region`, () => {
    const localRegions = extractRegions(fs.readFileSync(projectLocal, 'utf8'), projectLocal);
    const installRegions = extractRegions(fs.readFileSync(installPath, 'utf8'), installPath);
    assert.ok(localRegions.size > 0, `local hook has no shared regions: ${projectLocal}`);
    assert.ok(installRegions.size > 0, `install hook has no shared regions: ${installPath}`);
  });

  test(`[${name}] both files have the same set of shared region names`, () => {
    const localRegions = extractRegions(fs.readFileSync(projectLocal, 'utf8'), projectLocal);
    const installRegions = extractRegions(fs.readFileSync(installPath, 'utf8'), installPath);

    const localNames = new Set(localRegions.keys());
    const installNames = new Set(installRegions.keys());

    const onlyInLocal = [...localNames].filter(n => !installNames.has(n));
    const onlyInInstall = [...installNames].filter(n => !localNames.has(n));

    assert.deepEqual(onlyInLocal, [], `Regions in local but not install: ${onlyInLocal.join(', ')}`);
    assert.deepEqual(onlyInInstall, [], `Regions in install but not local: ${onlyInInstall.join(', ')}`);
  });

  // Per-region byte-equality tests (read files once outside the loop)
  const localRegionsForTests = extractRegions(fs.readFileSync(projectLocal, 'utf8'), projectLocal);
  const installRegionsForTests = extractRegions(fs.readFileSync(installPath, 'utf8'), installPath);

  for (const [regionName, localContent] of localRegionsForTests) {
    test(`[${name}] shared region "${regionName}" is byte-identical in both files`, () => {
      assert.ok(
        installRegionsForTests.has(regionName),
        `Region "${regionName}" exists in local but is missing from install hook`,
      );
      const installContent = installRegionsForTests.get(regionName);
      if (localContent !== installContent) {
        const localLines = localContent.split('\n');
        const installLines = installContent.split('\n');
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
            : '\n  (length differs but no line-level diff found — possible trailing whitespace)';

        assert.fail(
          `Region "${regionName}" differs between hook files.${diffMsg}\n` +
          `Fix: ensure the content inside\n` +
          `  // ===== shared:start ${regionName} =====\n` +
          `  // ===== shared:end ${regionName} =====\n` +
          `is byte-identical in both files.`,
        );
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Run validation for all pairs
// ---------------------------------------------------------------------------

for (const pair of PAIR_LIST) {
  validatePair(pair);
}
