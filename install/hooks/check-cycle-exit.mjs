#!/usr/bin/env node
// check-cycle-exit.mjs — kzk-harness PreToolUse hook (propagation copy).
//
// Purpose: enforce cycle-exit fresh-agent verifier dispatch + 4 sub-check
// before `git commit` (Signal B) / `gh pr create|merge` / `git push origin main`
// (Signal A) that indicate cycle exit.
//
// This file is deployed by install-global.sh to:
//   ~/.claude/skills/.kzk-harness-shared/hooks/check-cycle-exit.mjs
//
// REPO_ROOT is resolved from CWD / PWD (the user's project root at hook fire time),
// with git rev-parse fallback — same pattern as other install/hooks/*.mjs files.
//
// Bypass env vars:
//   KZK_CYCLE_EXIT_VERIFIED=1  — verifier dispatched + 4 sub-check PASS → pass through
//   KZK_CYCLE_EXIT_SKIP=1     — emergency bypass, leaves Q-CYCLE-EXIT-STALE in user-queue
//   KZK_CYCLE_EXIT_DISABLE=1  — hard disable, loud stderr + Q-CYCLE-EXIT-DISABLED in user-queue
//
// Conflict: VERIFIED + SKIP both set → BLOCK with "conflicting trust states" message.
//
// CLI modes:
//   --status          : print current signal detection state
//   --dry-run "<cmd>" : test signal match without real commit

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// ---------------------------------------------------------------------------
// REPO_ROOT resolution (CWD-based + git rev-parse fallback)
// Mirrors pattern from regression-recall.mjs / freshness-guard.mjs install hooks.
// ---------------------------------------------------------------------------

function resolveRepoRoot() {
  // Primary: git rev-parse --show-toplevel from CWD
  try {
    const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    if (result.status === 0 && result.stdout.trim()) {
      return result.stdout.trim();
    }
  } catch {
    /* fall through */
  }

  // Fallback: use CWD directly
  return process.cwd();
}

const REPO_ROOT = resolveRepoRoot();

// ---------------------------------------------------------------------------
// Signal patterns (per plan §3.3)
// ---------------------------------------------------------------------------

// Signal A: PR/push to main
const SIGNAL_A_GH_PR = /\bgh\s+pr\s+(create|merge)\b/;
const SIGNAL_A_GIT_PUSH = /\bgit\s+push\b.*\borigin\s+(?:[^\s:]+:)?main\b/;

// Signal B: commit message markers (multiline mode applied after extraction)
const SIGNAL_B_MARKER = /^(MILESTONE:|CYCLE-EXIT:|STUB-CLEAR:)/m;

// Signal B: git commit command
const GIT_COMMIT_RE = /(^|\s|;|&&|\|\|)git\s+commit\b/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pass() {
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
  process.exit(0);
}

function block(reason) {
  process.stdout.write(JSON.stringify({ decision: "block", reason }) + "\n");
  process.exit(0);
}

function appendUserQueue(entryType, context) {
  try {
    const queue = path.join(REPO_ROOT, "docs", "harness", "user-queue.md");
    const ts = new Date().toISOString();
    let note;
    if (entryType === "Q-CYCLE-EXIT-STALE") {
      note =
        `\n\n## Pending — Q-CYCLE-EXIT-STALE (${ts})\n` +
        `- Context: \`git commit\`/\`gh pr\`/\`git push\` bypass via \`KZK_CYCLE_EXIT_SKIP=1\`.\n` +
        `- Command: \`${context}\`\n` +
        `- Action required: dispatch oh-my-claudecode:verifier with cycle-exit mandate, run 4 sub-checks, then retry with \`KZK_CYCLE_EXIT_VERIFIED=1\`.\n` +
        `- Tentative default: defer to next cycle entry.\n`;
    } else if (entryType === "Q-CYCLE-EXIT-DISABLED") {
      note =
        `\n\n## Pending — Q-CYCLE-EXIT-DISABLED (${ts})\n` +
        `- Context: cycle-exit hook suppressed via \`KZK_CYCLE_EXIT_DISABLE=1\`.\n` +
        `- Command: \`${context}\`\n` +
        `- Action required: re-enable hook or manually run 4 sub-checks before next release.\n` +
        `- Tentative default: defer to next merge gate review.\n`;
    }
    if (note) fs.appendFileSync(queue, note);
  } catch {
    /* best-effort — don't block on queue write failure */
  }
}

// Extract commit message from git commit command string
function extractCommitMessage(command) {
  // Try -m "..." or -m '...' (multiple -m args concatenated with newline)
  const mMatches = [];
  const mRe = /-m\s+(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;
  let mMatch;
  while ((mMatch = mRe.exec(command)) !== null) {
    mMatches.push(mMatch[1] ?? mMatch[2] ?? "");
  }
  if (mMatches.length > 0) {
    return mMatches.join("\n");
  }

  // Try -F <path>
  const fMatch = command.match(/-F\s+(?:"([^"]+)"|'([^']+)'|(\S+))/);
  if (fMatch) {
    const filePath = fMatch[1] ?? fMatch[2] ?? fMatch[3];
    try {
      const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
      return fs.readFileSync(abs, "utf8");
    } catch {
      return null; // file read fail → fail-open (pass)
    }
  }

  // Fall back to .git/COMMIT_EDITMSG (interactive commit)
  try {
    const editmsg = path.join(REPO_ROOT, ".git", "COMMIT_EDITMSG");
    if (fs.existsSync(editmsg)) {
      return fs.readFileSync(editmsg, "utf8");
    }
  } catch {
    /* ignore */
  }

  return null; // nothing found → fail-open
}

// Strip HEREDOC bodies and quoted strings before Signal A pattern matching.
// This prevents false positives when command text like "gh pr create" appears
// inside a HEREDOC body or quoted string (e.g., inside a git commit -m "$(cat <<'EOF'...)").
function stripQuotedAndHeredoc(str) {
  // 1. Strip HEREDOC blocks: <<'LABEL'...LABEL, <<"LABEL"...LABEL, <<LABEL...LABEL
  str = str.replace(/<<\s*['"]?(\w+)['"]?\b[\s\S]*?\n\1\b/g, "");
  // 2. Strip double-quoted strings (with escape handling)
  str = str.replace(/"(?:[^"\\]|\\.)*"/g, '""');
  // 3. Strip single-quoted strings (with escape handling)
  str = str.replace(/'(?:[^'\\]|\\.)*'/g, "''");
  return str;
}

function detectSignalA(command) {
  const stripped = stripQuotedAndHeredoc(command);
  if (SIGNAL_A_GH_PR.test(stripped)) return { signal: "A", pattern: "gh pr create|merge" };
  if (SIGNAL_A_GIT_PUSH.test(stripped)) return { signal: "A", pattern: "git push origin main" };
  return null;
}

function detectSignalB(command) {
  if (!GIT_COMMIT_RE.test(command)) return null;

  const msg = extractCommitMessage(command);
  if (msg === null) return null; // fail-open: can't read message

  if (msg === "") return null; // empty body → pass

  const markerMatch = msg.match(SIGNAL_B_MARKER);
  if (!markerMatch) return null;

  return { signal: "B", pattern: markerMatch[0].trim() };
}

const BLOCK_MESSAGE = (signalLabel, pattern) =>
  `🛑 Cycle-exit detected (signal: ${signalLabel} / pattern: ${pattern}).

kzk-pre-merge-sync §5–§7 의 4 sub-check 를 fresh agent 로 dispatch 하세요:
  1. Prod-build user-persona smoke (npm run build && node dist/main + Playwright)
     kzk-harness self: docs/site/skill-flow.html + .ko.html render, fingerprint match, index.html nav
  2. Stub sweep (git log --grep='STUB:' + UI text + JSX comment patterns)
  3. SoT alignment (docs/sot/feature-list.md ↔ staged code, or harness-share.md ↔ skills ↔ HTML)
  4. Spec-freeze re-check (spec visual/layout modifier absorbed into implementation)

Dispatch: oh-my-claudecode:verifier opus with cycle-exit mandate (see kzk-autonomous-boundary §Mandate).
Verifier PASS 후 재시도: KZK_CYCLE_EXIT_VERIFIED=1 <원래 command>

Emergency bypass: KZK_CYCLE_EXIT_SKIP=1 <원래 command>
  → docs/harness/user-queue.md 에 Q-CYCLE-EXIT-STALE 자동 등록

References: harness-share.md §3 Gate 6, kzk-pre-merge-sync §5/§6/§7, kzk-autonomous-boundary §Mandate`;

// ---------------------------------------------------------------------------
// CLI modes (no stdin)
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);

if (argv.includes("--status")) {
  console.log("check-cycle-exit.mjs — signal detection state");
  console.log("");
  console.log("Signal A patterns:");
  console.log(`  gh pr (create|merge)   : ${SIGNAL_A_GH_PR}`);
  console.log(`  git push origin main   : ${SIGNAL_A_GIT_PUSH}`);
  console.log("");
  console.log("Signal B markers (multiline, git commit only):");
  console.log(`  ${SIGNAL_B_MARKER}`);
  console.log("");
  console.log("Bypass env vars:");
  console.log(`  KZK_CYCLE_EXIT_VERIFIED=${process.env.KZK_CYCLE_EXIT_VERIFIED ?? "(unset)"}`);
  console.log(`  KZK_CYCLE_EXIT_SKIP    =${process.env.KZK_CYCLE_EXIT_SKIP ?? "(unset)"}`);
  console.log(`  KZK_CYCLE_EXIT_DISABLE =${process.env.KZK_CYCLE_EXIT_DISABLE ?? "(unset)"}`);
  console.log("");
  console.log(`REPO_ROOT resolved to: ${REPO_ROOT}`);
  console.log("Status: READY — hook will intercept matching Bash tool calls.");
  process.exit(0);
}

const dryRunIdx = argv.indexOf("--dry-run");
if (dryRunIdx !== -1) {
  const testCmd = argv[dryRunIdx + 1] ?? "";
  const sigA = detectSignalA(testCmd);
  const sigB = detectSignalB(testCmd);
  const hit = sigA ?? sigB;
  if (hit) {
    console.log(`MATCH: Signal ${hit.signal} — pattern: ${hit.pattern}`);
    console.log("Result: BLOCK (unless KZK_CYCLE_EXIT_VERIFIED=1 or KZK_CYCLE_EXIT_SKIP=1)");
  } else {
    console.log("NO MATCH: command would pass through.");
  }
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Hook mode (stdin JSON)
// ---------------------------------------------------------------------------

let payload;
try {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  payload = JSON.parse(raw || "{}");
} catch {
  process.stderr.write("[cycle-exit] WARN: stdin parse error — passing through.\n");
  pass();
}

const toolName = payload?.tool_name ?? "";
const command = payload?.tool_input?.command ?? "";

// Only intercept Bash tool
if (toolName !== "Bash") pass();
if (!command) pass();

// Detect signal
const signalHit = detectSignalA(command) ?? detectSignalB(command);
if (!signalHit) pass();

// Signal matched — check bypass env vars
const verified = process.env.KZK_CYCLE_EXIT_VERIFIED === "1";
const skip = process.env.KZK_CYCLE_EXIT_SKIP === "1";
const disable = process.env.KZK_CYCLE_EXIT_DISABLE === "1";

// Conflict: VERIFIED + SKIP both set → BLOCK (fail-closed)
if (verified && skip) {
  block(
    `🛑 Cycle-exit hook: conflicting trust states detected.\n` +
    `Both KZK_CYCLE_EXIT_VERIFIED=1 and KZK_CYCLE_EXIT_SKIP=1 are set simultaneously.\n` +
    `This is abnormal. Unset one:\n` +
    `  - KZK_CYCLE_EXIT_VERIFIED=1 means verifier dispatched + 4 sub-check PASS.\n` +
    `  - KZK_CYCLE_EXIT_SKIP=1 means emergency bypass (queue entry auto-registered).\n` +
    `Only one may be set at a time.`,
  );
}

// DISABLE: loud warning + queue entry + pass
if (disable) {
  process.stderr.write(
    `[cycle-exit] WARNING: KZK_CYCLE_EXIT_DISABLE=1 is set — cycle-exit hook suppressed.\n` +
    `Signal ${signalHit.signal} (${signalHit.pattern}) would have blocked this command.\n` +
    `Q-CYCLE-EXIT-DISABLED registered in docs/harness/user-queue.md.\n`,
  );
  appendUserQueue("Q-CYCLE-EXIT-DISABLED", command);
  pass();
}

// VERIFIED: verifier dispatched + 4 sub-checks passed → allow
if (verified) pass();

// SKIP: emergency bypass + queue entry
if (skip) {
  process.stderr.write(
    `[cycle-exit] WARNING: KZK_CYCLE_EXIT_SKIP=1 — emergency bypass. Q-CYCLE-EXIT-STALE registered.\n`,
  );
  appendUserQueue("Q-CYCLE-EXIT-STALE", command);
  pass();
}

// BLOCK
block(BLOCK_MESSAGE(signalHit.signal, signalHit.pattern));
