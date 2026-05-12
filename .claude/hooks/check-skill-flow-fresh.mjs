#!/usr/bin/env node
// check-skill-flow-fresh.mjs — kzk-harness PROJECT-LOCAL PreToolUse hook.
//
// Purpose: block `git commit` when docs/skill-flow.html is stale relative to
// the Source-of-Truth files it indexes (skills/*/SKILL.md, harness-share.md,
// CLAUDE.md). Forces the maintainer to keep the index in sync.
//
// Scope: THIS REPO ONLY. Lives in .claude/ which is never copied by
// install-global.sh (it only writes to ~/.claude/...). End users who install
// kzk-harness globally never get this hook.
//
// Registered in .claude/settings.json:
//   PreToolUse matcher "Bash" : node $CLAUDE_PROJECT_DIR/.claude/hooks/check-skill-flow-fresh.mjs
//
// Hook stdin payload (Claude Code spec):
//   { tool_name: "Bash", tool_input: { command: "..." }, ... }
//
// Bypass (one-shot, autonomous emergencies only):
//   KZK_SKILL_FLOW_SKIP=1 git commit -m "..."
//   → leaves a Q-SKILL-FLOW-STALE entry in docs/harness/user-queue.md
//
// CLI mode (manual fingerprint refresh after editing docs/skill-flow.html):
//   node .claude/hooks/check-skill-flow-fresh.mjs --regen
//
// Status-only check:
//   node .claude/hooks/check-skill-flow-fresh.mjs --status

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const HTML_PATH = path.join(REPO_ROOT, "docs", "site", "skill-flow.html");
const FINGERPRINT_TAG = "KZK_SKILL_FLOW_FINGERPRINT";
const FINGERPRINT_RE = new RegExp(`<!--\\s*${FINGERPRINT_TAG}:\\s*([A-Za-z0-9]+)\\s*-->`);

function sortedSkillFiles() {
  const skillsDir = path.join(REPO_ROOT, "skills");
  if (!fs.existsSync(skillsDir)) return [];
  return fs
    .readdirSync(skillsDir)
    .filter((name) => name.startsWith("kzk-"))
    .map((name) => path.join("skills", name, "SKILL.md"))
    .filter((rel) => fs.existsSync(path.join(REPO_ROOT, rel)))
    .sort();
}

function sotFileList() {
  return [...sortedSkillFiles(), "harness-share.md", "CLAUDE.md"];
}

function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function computeFingerprint() {
  const hashes = sotFileList().map((rel) => {
    const abs = path.join(REPO_ROOT, rel);
    const content = fs.readFileSync(abs);
    return sha256Hex(Buffer.concat([Buffer.from(rel + "\0"), content]));
  });
  return sha256Hex(hashes.join("\n")).slice(0, 16);
}

function readEmbeddedFingerprint() {
  if (!fs.existsSync(HTML_PATH)) return null;
  const html = fs.readFileSync(HTML_PATH, "utf8");
  const m = html.match(FINGERPRINT_RE);
  return m ? m[1] : null;
}

function writeEmbeddedFingerprint(newFp) {
  const html = fs.readFileSync(HTML_PATH, "utf8");
  const next = html.replace(
    FINGERPRINT_RE,
    `<!-- ${FINGERPRINT_TAG}: ${newFp} -->`,
  );
  if (next === html && !FINGERPRINT_RE.test(html)) {
    throw new Error(`fingerprint tag not found in ${HTML_PATH}`);
  }
  fs.writeFileSync(HTML_PATH, next);
}

function pass() {
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
  process.exit(0);
}

function block(reason) {
  process.stdout.write(
    JSON.stringify({ decision: "block", reason }) + "\n",
  );
  process.exit(0);
}

// ----------------------------------------------------------------------
// CLI modes (no stdin)
// ----------------------------------------------------------------------
const argv = process.argv.slice(2);
if (argv.includes("--regen")) {
  if (!fs.existsSync(HTML_PATH)) {
    console.error(`[skill-flow] ${HTML_PATH} not found`);
    process.exit(1);
  }
  const fp = computeFingerprint();
  writeEmbeddedFingerprint(fp);
  console.log(`[skill-flow] fingerprint updated → ${fp}`);
  process.exit(0);
}
if (argv.includes("--status")) {
  const cur = computeFingerprint();
  const emb = readEmbeddedFingerprint();
  console.log(`current SoT fingerprint : ${cur}`);
  console.log(`HTML embedded fingerprint: ${emb ?? "(none)"}`);
  console.log(`status                  : ${cur === emb ? "FRESH" : "STALE"}`);
  process.exit(cur === emb ? 0 : 1);
}

// ----------------------------------------------------------------------
// Hook mode (stdin JSON)
// ----------------------------------------------------------------------
let payload;
try {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  payload = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
} catch {
  pass();
}

const toolName = payload?.tool_name ?? "";
const command = payload?.tool_input?.command ?? "";

if (toolName !== "Bash") pass();
if (!/(^|\s|;|&&|\|\|)git\s+commit\b/.test(command)) pass();

// Emergency bypass
if (process.env.KZK_SKILL_FLOW_SKIP === "1") {
  // Best-effort log to user-queue (don't block on failure)
  try {
    const queue = path.join(REPO_ROOT, "docs", "harness", "user-queue.md");
    const ts = new Date().toISOString();
    const note =
      `\n\n## Pending — Q-SKILL-FLOW-STALE (${ts})\n` +
      `- Context: \`git commit\` bypass via \`KZK_SKILL_FLOW_SKIP=1\`.\n` +
      `- Action required: re-sync docs/skill-flow.html with current SoT, run \`node .claude/hooks/check-skill-flow-fresh.mjs --regen\`.\n` +
      `- Tentative default: defer to next pre-commit gate fire.\n`;
    fs.appendFileSync(queue, note);
  } catch {
    /* ignore */
  }
  pass();
}

if (!fs.existsSync(HTML_PATH)) {
  block(
    `[skill-flow] docs/skill-flow.html is missing. It documents the 18 kzk-* skills + workflow + hooks; recreate it before committing changes that affect SoT files. See .claude/hooks/check-skill-flow-fresh.mjs for fingerprint algorithm.`,
  );
}

const current = computeFingerprint();
const embedded = readEmbeddedFingerprint();

if (embedded === current) pass();

// Stale — assemble actionable diff hint
const changed = [];
try {
  const { execSync } = await import("node:child_process");
  const out = execSync(
    `git diff --cached --name-only -- ${sotFileList().map((f) => `'${f}'`).join(" ")}`,
    { cwd: REPO_ROOT, stdio: ["ignore", "pipe", "ignore"] },
  )
    .toString()
    .trim();
  if (out) changed.push(...out.split("\n"));
} catch {
  /* ignore */
}

const diffHint = changed.length
  ? `\nStaged SoT files in this commit:\n  - ${changed.join("\n  - ")}`
  : "";

block(
  `[skill-flow] docs/skill-flow.html is STALE.\n` +
    `  current SoT fingerprint : ${current}\n` +
    `  HTML embedded fingerprint: ${embedded ?? "(none)"}` +
    diffHint +
    `\n\nTo fix:\n` +
    `  1) Update docs/skill-flow.html so its cards / tables / diagrams reflect the SoT change.\n` +
    `  2) Run: node .claude/hooks/check-skill-flow-fresh.mjs --regen\n` +
    `  3) git add docs/skill-flow.html && retry the commit.\n\n` +
    `Bypass (autonomous emergency, leaves Q-SKILL-FLOW-STALE in user-queue):\n` +
    `  KZK_SKILL_FLOW_SKIP=1 git commit ...\n\n` +
    `This hook lives in .claude/hooks/ — project-local only, never propagated by install-global.sh.`,
);
