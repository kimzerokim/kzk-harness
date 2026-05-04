#!/usr/bin/env node
// hook-shared.mjs — shared constants and helpers for kzk-harness hooks.
// Single SoT for FIX_KEYWORDS, SELF_IMPROVE_VERBPHRASES, shouldSkip, detectFixIntent.
// Both regression-recall.mjs (Plan D) and fix-scope-trigger.mjs (Plan B) import from here.
// Drift between the two hooks is prevented by this shared definition.
// Authoritative spec: docs/plans/regression-memory-and-fix-quality-spec.md (rev7).

// Fix-intent keywords — word-boundary matched in detectFixIntent
export const FIX_KEYWORDS = [
  "fix", "fixes", "fixed", "fixing",
  "bug", "bugs", "bugfix",
  "error", "errors", "issue", "issues",
  "regression", "revert",
  // Korean
  "수정", "고쳐", "버그", "에러", "오류", "고침",
  // Additional from regression-recall (rev2)
  "재발", "같은 버그", "또 났", "이거 또", "broken", "안 됨", "안된다",
];

// Self-improvement verb phrases — 동사구만, 명사 단독 금지 (spec rev5 §Axis A Layer b)
export const SELF_IMPROVE_VERBPHRASES = [
  "harness 개선 루프 시작",
  "스킬 개선해줘",
  "harness loop 진입",
  "자가개선 cycle 진입",
  "자가개선 돌려줘",
  "메타 cycle 진입",
  "ralph 로 돌려",
];

/**
 * shouldSkip — returns a non-null skip reason string if this hook should self-skip.
 * Matches env vars first (most reliable), then SELF_IMPROVE_VERBPHRASES (verb-phrases only).
 *
 * @param {string} prompt — raw user prompt text
 * @param {object} env — process.env or equivalent
 * @returns {string|null} skip reason, or null if hook should proceed
 */
export function shouldSkip(prompt, env = process.env) {
  if (env.KZK_HARNESS_SELF_IMPROVEMENT === "1") return "env:KZK_HARNESS_SELF_IMPROVEMENT";
  if (env.KZK_AUTONOMOUS === "1") return "env:KZK_AUTONOMOUS";
  for (const phrase of SELF_IMPROVE_VERBPHRASES) {
    if (prompt.includes(phrase)) return `verbphrase:${phrase}`;
  }
  return null;
}

/**
 * detectFixIntent — returns true if prompt contains a fix-intent signal.
 * Matches FIX_KEYWORDS at word boundary (simple substring match for Korean compatibility).
 *
 * @param {string} prompt
 * @returns {boolean}
 */
export function detectFixIntent(prompt) {
  return FIX_KEYWORDS.some((k) => prompt.includes(k));
}

/**
 * normalizeQuery — extract a short keyword-focused query from prompt for /learn search.
 * Truncates to 200-char window, prefers FIX_KEYWORDS tokens.
 *
 * @param {string} prompt
 * @returns {string}
 */
export function normalizeQuery(prompt) {
  const QUERY_WINDOW = 200;
  const window = prompt.slice(0, QUERY_WINDOW);
  const tokens = window.split(/\s+/).filter((t) => t.length >= 3);
  const matches = tokens.filter((t) => FIX_KEYWORDS.some((k) => t.includes(k)));
  return matches.length > 0 ? matches.join(" ") : window;
}
