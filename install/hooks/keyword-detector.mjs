#!/usr/bin/env node
// keyword-detector.mjs — scaffold for opt-in OMC-style keyword detection.
// NOT registered with Claude Code unless install-global.sh --enable-hooks runs.
//
// Authoritative spec: docs/superpowers/specs/2026-05-04-kzk-global-install-design.md §7.5
// Authoritative plan: docs/plans/2026-05-04-kzk-global-install.md Task A (N3 non-goal)
//
// TODO: implement keyword detection for the following kzk-* trigger phrases:
//   - "ralph"             → kzk-autonomous-boundary
//   - "ralph로 체크"       → kzk-autonomous-boundary / kzk-codebase-survey
//   - "ralph로 확인"       → kzk-autonomous-boundary
//   - "버그 전수조사"       → kzk-codebase-survey
//   - "구현 검증"          → kzk-codebase-survey + kzk-large-task-delegation
//   - "spec 잡자"          → kzk-spec-and-review
//   - "harness 개선 루프"   → self-improvement loop (CLAUDE.md §Self-Improvement Loop)
//   - "codebase survey"   → kzk-codebase-survey
//   Actual detection logic deferred to future work F3 (spec §14).

/**
 * detect(input) — stub; returns empty array (no triggers).
 * When implemented, will return an array of matched kzk-* skill names.
 * @param {string} _input - the user's prompt text
 * @returns {string[]}
 */
export function detect(_input) {
  return [];
}

// When invoked as a UserPromptSubmit hook, Claude Code passes a JSON payload
// on stdin and expects a JSON response on stdout.
if (process.argv[1] === new URL(import.meta.url).pathname) {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    raw += chunk;
  });
  process.stdin.on("end", () => {
    // No-op: scaffold only. Return empty decision object so Claude proceeds normally.
    process.stdout.write(JSON.stringify({ decision: "continue" }) + "\n");
  });
}
