#!/usr/bin/env node
// cycle-exit-utils.mjs — shared utility extracted from check-cycle-exit.mjs.
//
// Exports: stripQuotedAndHeredoc, parseInlineEnv
//
// LEAF MODULE — no imports from check-cycle-exit or docker-compose-gate.
// Both check-cycle-exit.mjs and docker-compose-gate.mjs import from here
// (direct import, NOT marker-copy — single source of truth eliminates drift).

// ===== shared:start stripQuotedAndHeredoc =====
// Strip HEREDOC bodies and quoted strings before Signal A pattern matching.
// This prevents false positives when command text like "gh pr create" appears
// inside a HEREDOC body or quoted string (e.g., inside a git commit -m "$(cat <<'EOF'...)").
export function stripQuotedAndHeredoc(str) {
  // 1. Strip HEREDOC blocks: <<'LABEL'...LABEL, <<"LABEL"...LABEL, <<LABEL...LABEL
  str = str.replace(/<<\s*['"]?(\w+)['"]?\b[\s\S]*?\n\1\b/g, "");
  // 2. Strip double-quoted strings (with escape handling)
  str = str.replace(/"(?:[^"\\]|\\.)*"/g, '""');
  // 3. Strip single-quoted strings (with escape handling)
  str = str.replace(/'(?:[^'\\]|\\.)*'/g, "''");
  return str;
}
// ===== shared:end stripQuotedAndHeredoc =====

// ===== shared:start parseInlineEnv =====
// Extract leading KEY=VAL prefix env vars from a command string.
// Uses stripQuotedAndHeredoc to neutralize quoted content first,
// preventing matches inside quoted arguments (e.g., -m "KEY=VAL cmd").
// Splits on top-level && / ; / || so env prefixes on any sub-command are found.
export function parseInlineEnv(command) {
  const stripped = stripQuotedAndHeredoc(command);
  const subCmds = stripped.split(/\s*(?:&&|;|\|\|)\s*/);
  const env = {};
  const re = /^\s*((?:[A-Z_][A-Z0-9_]*=[^\s]*\s+)+)/;
  for (const sub of subCmds) {
    const m = sub.match(re);
    if (!m) continue;
    for (const a of m[1].trim().split(/\s+/)) {
      const idx = a.indexOf("=");
      if (idx > 0) env[a.slice(0, idx)] = a.slice(idx + 1);
    }
  }
  return env;
}
// ===== shared:end parseInlineEnv =====
