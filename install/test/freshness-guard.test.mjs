#!/usr/bin/env node
// freshness-guard.test.mjs — unit tests for freshness-guard.mjs.
// Uses node:test + node:assert. No external dependencies.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  detectFreshnessIntent,
  buildFreshnessReminder,
  FRESHNESS_KEYWORDS,
} from "../hooks/freshness-guard.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOOK_PATH = path.join(__dirname, "../hooks/freshness-guard.mjs");

// ---------------------------------------------------------------------------
// T1: detectFreshnessIntent — "commit" keyword
// ---------------------------------------------------------------------------
test("detectFreshnessIntent returns true for 'commit'", () => {
  assert.equal(detectFreshnessIntent("please commit the changes"), true);
});

// ---------------------------------------------------------------------------
// T2: detectFreshnessIntent — "stale 체크" keyword
// ---------------------------------------------------------------------------
test("detectFreshnessIntent returns true for 'stale 체크'", () => {
  assert.equal(detectFreshnessIntent("stale 체크 해줘"), true);
});

// ---------------------------------------------------------------------------
// T3: detectFreshnessIntent — unrelated prompt
// ---------------------------------------------------------------------------
test("detectFreshnessIntent returns false for unrelated prompt", () => {
  assert.equal(detectFreshnessIntent("안녕하세요, 오늘 날씨가 좋네요"), false);
});

// ---------------------------------------------------------------------------
// T4: buildFreshnessReminder — formats stale docs correctly
// ---------------------------------------------------------------------------
test("buildFreshnessReminder formats stale docs correctly", () => {
  const staleDocs = [
    { path: "AGENTS.md", severity: "BLOCK", reason: "references changed file: src/foo.mjs", symbols: [] },
    { path: "docs/plan.md", severity: "WARN", reason: "references changed symbol: myFunc", symbols: ["myFunc"] },
  ];
  const result = buildFreshnessReminder(staleDocs, true);
  assert.ok(result.includes("FRESHNESS GUARD"), "should include header");
  assert.ok(result.includes("2건의 stale 메타 문서 감지"), "should show count");
  assert.ok(result.includes("AGENTS.md (BLOCK)"), "should include AGENTS.md with severity");
  assert.ok(result.includes("docs/plan.md (WARN)"), "should include plan.md with severity");
  assert.ok(result.includes("Gate 0.5"), "should include Gate 0.5 instruction");
  assert.ok(result.includes("AGENTS.md: 행 단위 직접 갱신"), "should include update strategy");
});

// ---------------------------------------------------------------------------
// T5: buildFreshnessReminder — includes CRG WARN when crgAvailable=false
// ---------------------------------------------------------------------------
test("buildFreshnessReminder includes CRG WARN when crgAvailable=false", () => {
  const staleDocs = [
    { path: "CLAUDE.md", severity: "BLOCK", reason: "references changed file: lib/foo.mjs", symbols: [] },
  ];
  const result = buildFreshnessReminder(staleDocs, false);
  assert.ok(result.includes("code-review-graph not installed"), "should warn about missing CRG");
  assert.ok(result.includes("grep-only"), "should mention grep-only fallback");
  assert.ok(result.includes("CLAUDE.md"), "should still include stale doc");
});

// ---------------------------------------------------------------------------
// T6: buildFreshnessReminder — empty staleDocs with CRG available returns empty string
// ---------------------------------------------------------------------------
test("buildFreshnessReminder returns empty string for empty staleDocs with CRG available", () => {
  const result = buildFreshnessReminder([], true);
  assert.equal(result, "", "should return empty string");
});

// ---------------------------------------------------------------------------
// T7: buildFreshnessReminder — empty staleDocs with CRG unavailable returns WARN only
// ---------------------------------------------------------------------------
test("buildFreshnessReminder returns CRG WARN only when staleDocs empty and crgAvailable=false", () => {
  const result = buildFreshnessReminder([], false);
  assert.ok(result.includes("code-review-graph not installed"), "should warn about missing CRG");
  assert.ok(!result.includes("stale 메타 문서 감지"), "should not show stale doc section");
});

// ---------------------------------------------------------------------------
// T8: Recursion guard — _FRESHNESS_GUARD_RUNNING=1 causes skip
// ---------------------------------------------------------------------------
test("recursion guard: _FRESHNESS_GUARD_RUNNING=1 causes skip", (t, done) => {
  const child = spawn(
    process.execPath,
    [HOOK_PATH],
    {
      env: { ...process.env, _FRESHNESS_GUARD_RUNNING: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    }
  );

  let stdout = "";
  child.stdout.on("data", (d) => { stdout += d; });
  child.on("close", () => {
    let parsed;
    try { parsed = JSON.parse(stdout.trim()); } catch { parsed = null; }
    assert.ok(parsed !== null, "should produce valid JSON");
    assert.equal(parsed.continue, true, "should continue");
    assert.equal(parsed._skip, "recursion-guard", "should have recursion-guard skip reason");
    done();
  });

  child.stdin.end(JSON.stringify({ prompt: "commit the changes" }));
});

// ---------------------------------------------------------------------------
// T9: Self-skip guard — KZK_HARNESS_SELF_IMPROVEMENT=1 causes skip
// ---------------------------------------------------------------------------
test("self-skip guard: KZK_HARNESS_SELF_IMPROVEMENT=1 causes skip", (t, done) => {
  const child = spawn(
    process.execPath,
    [HOOK_PATH],
    {
      env: { ...process.env, KZK_HARNESS_SELF_IMPROVEMENT: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    }
  );

  let stdout = "";
  child.stdout.on("data", (d) => { stdout += d; });
  child.on("close", () => {
    let parsed;
    try { parsed = JSON.parse(stdout.trim()); } catch { parsed = null; }
    assert.ok(parsed !== null, "should produce valid JSON");
    assert.equal(parsed.continue, true, "should continue");
    assert.ok(
      typeof parsed._skip === "string" && parsed._skip.includes("KZK_HARNESS_SELF_IMPROVEMENT"),
      "should have self-improvement skip reason"
    );
    done();
  });

  child.stdin.end(JSON.stringify({ prompt: "commit 해줘" }));
});

// ---------------------------------------------------------------------------
// T10: Integration — non-matching prompt returns {continue: true}
// (No git mock needed; unrelated prompt never reaches git calls)
// ---------------------------------------------------------------------------
test("integration: non-matching prompt returns {continue: true}", (t, done) => {
  const child = spawn(
    process.execPath,
    [HOOK_PATH],
    {
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
    }
  );

  let stdout = "";
  child.stdout.on("data", (d) => { stdout += d; });
  child.on("close", () => {
    let parsed;
    try { parsed = JSON.parse(stdout.trim()); } catch { parsed = null; }
    assert.ok(parsed !== null, "should produce valid JSON");
    assert.equal(parsed.continue, true, "should continue without modification");
    done();
  });

  child.stdin.end(JSON.stringify({ prompt: "안녕하세요 오늘 뭐 할까요" }));
});

// ---------------------------------------------------------------------------
// T11: FRESHNESS_KEYWORDS exported array is non-empty and includes expected entries
// ---------------------------------------------------------------------------
test("FRESHNESS_KEYWORDS exported array is valid", () => {
  assert.ok(Array.isArray(FRESHNESS_KEYWORDS), "should be an array");
  assert.ok(FRESHNESS_KEYWORDS.length > 0, "should be non-empty");
  assert.ok(FRESHNESS_KEYWORDS.includes("commit"), "should include 'commit'");
  assert.ok(FRESHNESS_KEYWORDS.includes("커밋"), "should include '커밋'");
  assert.ok(FRESHNESS_KEYWORDS.includes("freshness"), "should include 'freshness'");
});
