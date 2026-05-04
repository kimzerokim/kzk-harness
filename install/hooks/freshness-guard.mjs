#!/usr/bin/env node
// freshness-guard.mjs — UserPromptSubmit hook for kzk-freshness-guard.
// Detects stale meta-documents when commit-related keywords appear in the user prompt.
// Runs through dispatcher.mjs (same as regression-recall.mjs and keyword-detector.mjs).
// Authoritative source: harness-share.md §Gate 0.5.

import { shouldSkip } from "../lib/hook-shared.mjs";

export const FRESHNESS_KEYWORDS = [
  "commit", "커밋", "stale 체크", "freshness", "문서 신선도",
  "stale check", "freshness guard", "freshness scan",
  "문서 갱신", "doc refresh",
];

const GUARD_ENV = "_FRESHNESS_GUARD_RUNNING";

/**
 * detectFreshnessIntent — returns true if prompt contains a freshness-related keyword.
 *
 * @param {string} prompt
 * @returns {boolean}
 */
export function detectFreshnessIntent(prompt) {
  const lower = prompt.toLowerCase();
  return FRESHNESS_KEYWORDS.some((k) => lower.includes(k.toLowerCase()));
}

/**
 * buildFreshnessReminder — format stale-doc findings into a system-reminder string.
 *
 * @param {import('../lib/crg-utils.mjs').StaleDoc[]} staleDocs
 * @param {boolean} crgAvailable
 * @returns {string}
 */
export function buildFreshnessReminder(staleDocs, crgAvailable) {
  const lines = [];

  if (!crgAvailable) {
    lines.push("⚠️ [FRESHNESS GUARD] WARN: code-review-graph not installed. Stale-doc detection is grep-only (reduced accuracy).");
  }

  if (staleDocs.length === 0) {
    return lines.join("\n");
  }

  lines.push(`⚠️ [FRESHNESS GUARD] ${staleDocs.length}건의 stale 메타 문서 감지:`);
  for (const d of staleDocs) {
    lines.push(`- ${d.path} (${d.severity}): ${d.reason}`);
  }
  lines.push("");
  lines.push("Gate 0.5 auto-fix 필요. 문서 종류별 갱신 전략:");
  lines.push("- AGENTS.md: 행 단위 직접 갱신");
  lines.push("- CLAUDE.md: executor(sonnet) 위임");
  lines.push("- spec/survey: executor(sonnet) 위임");
  lines.push("- memory: 메인 판단 후 갱신");
  lines.push("- plan: WARN only (frozen)");

  return lines.join("\n");
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  // Recursion guard
  if (process.env[GUARD_ENV] === "1") {
    process.stdout.write(JSON.stringify({ continue: true, _skip: "recursion-guard" }) + "\n");
    process.exit(0);
  }

  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { raw += chunk; });
  process.stdin.on("end", async () => {
    let payload;
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }
    const prompt = String(payload.prompt ?? payload.user_prompt ?? "");

    const skip = shouldSkip(prompt, process.env);
    if (skip) {
      process.stdout.write(JSON.stringify({ continue: true, _skip: skip }) + "\n");
      return;
    }

    if (!detectFreshnessIntent(prompt)) {
      process.stdout.write(JSON.stringify({ continue: true }) + "\n");
      return;
    }

    process.env[GUARD_ENV] = "1";
    try {
      const { getChangedFiles, findStaleMetaDocs, ensureCRG } = await import("../lib/crg-utils.mjs");

      const stagedFiles = getChangedFiles("staged", process.cwd());
      const crgAvailable = ensureCRG();

      if (stagedFiles.length === 0 && !crgAvailable) {
        // No staged files and no CRG — emit CRG WARN only
        const reminderText = buildFreshnessReminder([], false);
        if (reminderText) {
          process.stdout.write(
            JSON.stringify({
              hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: reminderText },
            }) + "\n",
          );
        } else {
          process.stdout.write(JSON.stringify({ continue: true }) + "\n");
        }
        return;
      }

      if (stagedFiles.length === 0) {
        process.stdout.write(JSON.stringify({ continue: true }) + "\n");
        return;
      }

      const staleDocs = findStaleMetaDocs(stagedFiles, undefined, process.cwd());

      if (staleDocs.length === 0 && crgAvailable) {
        process.stdout.write(JSON.stringify({ continue: true }) + "\n");
        return;
      }

      const reminderText = buildFreshnessReminder(staleDocs, crgAvailable);

      if (reminderText) {
        process.stdout.write(
          JSON.stringify({
            hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: reminderText },
          }) + "\n",
        );
      } else {
        process.stdout.write(JSON.stringify({ continue: true }) + "\n");
      }
    } finally {
      delete process.env[GUARD_ENV];
    }
  });
}
