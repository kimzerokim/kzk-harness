#!/usr/bin/env node
// docker-compose-gate.mjs — kzk-harness Gate 3.5 (project-local copy).
//
// Purpose: conditional docker compose up --build -d + optional smoke endpoint
// ping before git commit / gh pr create|merge / git push origin main.
//
// Scope: THIS REPO + propagated globally by install-global.sh (OPT-IN: --docker-gate).
// Registered in .claude/settings.json (PreToolUse Bash matcher).
//
// Bypass env vars (precedence: DISABLE > SKIP > CI):
//   KZK_GATE35_DISABLE=1  — persistent disable, leaves Q-GATE35-DISABLED in user-queue
//   KZK_GATE35_SKIP=1     — one-shot skip, leaves Q-GATE35-SKIPPED in user-queue
//   CI=true / CI=1        — CI auto-skip, leaves Q-GATE35-CI-SKIP in user-queue
//
// Inline env-prefix form: KZK_GATE35_SKIP=1 git commit -m "..."

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseInlineEnv, stripQuotedAndHeredoc } from './lib/cycle-exit-utils.mjs';

// ---------------------------------------------------------------------------
// REPO_ROOT resolution (project-local: resolved from __dirname)
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pass() {
  process.stdout.write(JSON.stringify({ continue: true }) + '\n');
  process.exit(0);
}

function block(reason) {
  process.stdout.write(JSON.stringify({ decision: 'block', reason }) + '\n');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Shared marker regions (9 total — byte-equal with install/hooks copy)
// ---------------------------------------------------------------------------

// ===== shared:start env-defaults =====
const DEFAULT_DOCKER_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_SMOKE_TIMEOUT_MS = 30 * 1000;
const SMOKE_CONFIG_PATH = '.kzk/docker-smoke.json';
const QUEUE_FILE = process.env.KZK_QUEUE_DIR_OVERRIDE
  ? path.join(process.env.KZK_QUEUE_DIR_OVERRIDE, 'user-queue.md')
  : path.join(REPO_ROOT, 'docs', 'harness', 'user-queue.md');
// ===== shared:end env-defaults =====

// ===== shared:start commit-signal-detect =====
export function detectCommitSignal(bashCommand) {
  const stripped = stripQuotedAndHeredoc(bashCommand);
  if (/\bgit\s+commit\b/.test(stripped)) return { signal: 'git-commit' };
  if (/\bgh\s+pr\s+create\b/.test(stripped)) return { signal: 'gh-pr-create' };
  if (/\bgh\s+pr\s+merge\b/.test(stripped)) return { signal: 'gh-pr-merge' };
  if (/\bgit\s+push\b.*\borigin\s+(?:[^\s:]+:)?main\b/.test(stripped))
    return { signal: 'git-push-main' };
  return { signal: null };
}
// ===== shared:end commit-signal-detect =====

// ===== shared:start inline-env =====
export function getInlineEnv(bashCommand) {
  return parseInlineEnv(bashCommand);
}
// ===== shared:end inline-env =====

// ===== shared:start trigger-detection =====
const DOC_ONLY_PATTERNS = [
  /\.md$/i, /\.mdx$/i, /\.rst$/i, /\.adoc$/i, /\.txt$/i,
  /^docs\//, /^harness-flow-progress\.md$/, /^CLAUDE\.md$/,
  /^DESIGN\.md$/, /^skills\/.+\.md$/, /^\.claude\/skills\/.+\.md$/,
  /^docs\/screenshots\//, /^docs\/site\//, /^harness-share\.md$/,
  /^README\.md$/i, /^AGENTS\.md$/, /^LICENSE$/, /^CHANGELOG\.md$/i,
];

const DOCKER_PATTERNS = [
  /(^|\/)Dockerfile(\..+)?$/,
  /(^|\/)(docker-)?compose(\..+)?\.ya?ml$/,
  /(^|\/)backend\//,
];

export function isDocOnly(stagedFiles) {
  if (stagedFiles.length === 0) return false;
  return stagedFiles.every(f => DOC_ONLY_PATTERNS.some(p => p.test(f)));
}

export function globToRegex(glob) {
  // Tokenize-then-substitute to avoid sequential replace contaminating
  // inserted regex fragments.
  let pattern = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  pattern = pattern.replace(/\*\*\//g, '\x00A\x00');
  pattern = pattern.replace(/\*\*/g, '\x00B\x00');
  pattern = pattern.replace(/\*/g, '\x00C\x00');
  pattern = pattern
    .replace(/\x00A\x00/g, '(?:[^/]+/)*')
    .replace(/\x00B\x00/g, '.*')
    .replace(/\x00C\x00/g, '[^/]*');
  return new RegExp('^' + pattern + '$');
}

export function shouldTrigger(stagedFiles, customConfig) {
  if (isDocOnly(stagedFiles)) return false;
  const cfg = customConfig || {};
  const includes = (cfg.triggers?.includes || []).map(g => globToRegex(g));
  const excludes = (cfg.triggers?.excludes || []).map(g => globToRegex(g));
  const all = [...DOCKER_PATTERNS, ...includes];
  return stagedFiles.some(f => {
    if (excludes.some(p => p.test(f))) return false;
    return all.some(p => p.test(f));
  });
}
// ===== shared:end trigger-detection =====

// ===== shared:start bypass-check =====
// Precedence: DISABLE > SKIP > CI=true
export function checkBypass(envOverlay) {
  const env = Object.assign({}, process.env, envOverlay || {});
  if (env.KZK_GATE35_DISABLE === '1') {
    return { bypass: true, reason: 'KZK_GATE35_DISABLE=1', queueCode: 'Q-GATE35-DISABLED' };
  }
  if (env.KZK_GATE35_SKIP === '1') {
    return { bypass: true, reason: 'KZK_GATE35_SKIP=1', queueCode: 'Q-GATE35-SKIPPED' };
  }
  if (env.CI === 'true' || env.CI === '1') {
    return { bypass: true, reason: 'CI=true (CI self-build)', queueCode: 'Q-GATE35-CI-SKIP' };
  }
  return { bypass: false };
}
// ===== shared:end bypass-check =====

// ===== shared:start smoke-config-read =====
export function readSmokeConfig(repoRoot) {
  const p = path.join(repoRoot, SMOKE_CONFIG_PATH);
  if (!existsSync(p)) {
    return {
      endpoint: null,
      method: 'GET',
      dockerTimeoutMs: DEFAULT_DOCKER_TIMEOUT_MS,
      smokeTimeoutMs: DEFAULT_SMOKE_TIMEOUT_MS,
      triggers: {},
    };
  }
  let cfg;
  try {
    cfg = JSON.parse(readFileSync(p, 'utf-8'));
  } catch {
    return { malformed: true, error: 'JSON parse failed' };
  }
  const endpoint = typeof cfg.endpoint === 'string' ? cfg.endpoint : null;
  const method = (cfg.method === 'HEAD' || cfg.method === 'GET') ? cfg.method : 'GET';
  const dockerTimeoutMs =
    Number.isFinite(cfg.dockerTimeoutMs) && cfg.dockerTimeoutMs > 0 && cfg.dockerTimeoutMs <= 3600000
      ? cfg.dockerTimeoutMs
      : DEFAULT_DOCKER_TIMEOUT_MS;
  const smokeTimeoutMs =
    Number.isFinite(cfg.smokeTimeoutMs) && cfg.smokeTimeoutMs > 0 && cfg.smokeTimeoutMs <= 300000
      ? cfg.smokeTimeoutMs
      : DEFAULT_SMOKE_TIMEOUT_MS;
  return {
    endpoint,
    method,
    dockerTimeoutMs,
    smokeTimeoutMs,
    triggers: cfg.triggers || {},
  };
}
// ===== shared:end smoke-config-read =====

// ===== shared:start docker-up =====
export function runDockerUp(timeoutMs, cwd) {
  const result = spawnSync('docker', ['compose', 'up', '--build', '-d'], {
    encoding: 'utf-8',
    timeout: timeoutMs,
    shell: false,
    cwd,
  });
  return {
    ok: result.status === 0,
    stdout: (result.stdout || '').slice(0, 4000),
    stderr: (result.stderr || '').slice(0, 4000),
    timedOut: result.signal === 'SIGTERM',
  };
}
// ===== shared:end docker-up =====

// ===== shared:start smoke-ping =====
export async function pingSmoke(endpoint, method, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint, { method, signal: controller.signal });
    return { ok: res.status >= 200 && res.status < 300, status: res.status };
  } catch (err) {
    return { ok: false, error: String(err) };
  } finally {
    clearTimeout(timer);
  }
}
// ===== shared:end smoke-ping =====

// ===== shared:start queue-append =====
export function appendUserQueue(queueCode, detail) {
  try {
    const dir = path.dirname(QUEUE_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString();
    appendFileSync(QUEUE_FILE, `\n- [${stamp}] ${queueCode}: ${detail}\n`);
  } catch {
    /* best-effort — don't block on queue write failure */
  }
}
// ===== shared:end queue-append =====

// ---------------------------------------------------------------------------
// Main execution guard (only runs when executed directly, not when imported)
// This allows test files to import exported helpers without triggering stdin read.
// ---------------------------------------------------------------------------

const isMain = process.argv[1] && (
  import.meta.url === new URL(process.argv[1], 'file://').href ||
  process.argv[1].endsWith('docker-compose-gate.mjs')
);

if (isMain) {

// ---------------------------------------------------------------------------
// CLI mode: --status
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
if (argv.includes('--status')) {
  console.log('docker-compose-gate.mjs — Gate 3.5 status');
  console.log('');
  console.log('Bypass env vars:');
  console.log(`  KZK_GATE35_DISABLE=${process.env.KZK_GATE35_DISABLE ?? '(unset)'}`);
  console.log(`  KZK_GATE35_SKIP   =${process.env.KZK_GATE35_SKIP ?? '(unset)'}`);
  console.log(`  CI                =${process.env.CI ?? '(unset)'}`);
  console.log('');
  console.log(`REPO_ROOT resolved to: ${REPO_ROOT}`);
  console.log('Status: READY — hook will intercept matching Bash tool calls.');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Hook mode (stdin JSON)
// ---------------------------------------------------------------------------

let payload;
try {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  payload = JSON.parse(raw || '{}');
} catch {
  process.stderr.write('[docker-compose-gate] WARN: stdin parse error — passing through.\n');
  pass();
}

const toolName = payload?.tool_name ?? '';
const command = payload?.tool_input?.command ?? '';

// Only intercept Bash tool
if (toolName !== 'Bash') pass();
if (!command) pass();

// Step 1: commit-signal guard — only act on commit-like commands
const sig = detectCommitSignal(command);
if (!sig.signal) pass();

// Step 2: parse inline env + check bypass
const inlineEnv = getInlineEnv(command);
const bypassResult = checkBypass(inlineEnv);
if (bypassResult.bypass) {
  process.stderr.write(
    `[docker-compose-gate] Gate 3.5 bypassed: ${bypassResult.reason} — ${bypassResult.queueCode}\n`,
  );
  appendUserQueue(bypassResult.queueCode, command);
  pass();
}

// Step 3: get staged files
const stagedResult = spawnSync('git', ['diff', '--cached', '--name-only'], {
  encoding: 'utf-8',
  cwd: REPO_ROOT,
});
const stagedFiles = (stagedResult.stdout || '').split('\n').map(s => s.trim()).filter(Boolean);

// Step 4: doc-only check
if (isDocOnly(stagedFiles)) pass();

// Step 5: read smoke config
const config = readSmokeConfig(REPO_ROOT);
if (config.malformed) {
  block(
    `Gate 3.5 — docker-compose-gate: malformed .kzk/docker-smoke.json.\n` +
    `Error: ${config.error}\n` +
    `Fix the JSON file or remove it to use defaults.`,
  );
}

// Step 6: trigger detection
if (!shouldTrigger(stagedFiles, config)) pass();

// Step 7: docker compose up
const dockerResult = runDockerUp(config.dockerTimeoutMs, REPO_ROOT);
if (!dockerResult.ok) {
  const reason = dockerResult.timedOut
    ? `Gate 3.5 — docker compose up timed out after ${config.dockerTimeoutMs}ms.`
    : `Gate 3.5 — docker compose up --build -d failed.\n\nstderr:\n${dockerResult.stderr}`;
  block(
    `${reason}\n\n` +
    `Fix the build error, then retry.\n` +
    `Bypass: KZK_GATE35_SKIP=1 git commit ...  (registers Q-GATE35-SKIPPED)\n` +
    `Disable: KZK_GATE35_DISABLE=1 git commit ... (registers Q-GATE35-DISABLED)`,
  );
}

// Step 8: optional smoke ping
if (config.endpoint) {
  const pingResult = await pingSmoke(config.endpoint, config.method, config.smokeTimeoutMs);
  if (!pingResult.ok) {
    const detail = pingResult.error
      ? `Error: ${pingResult.error}`
      : `HTTP ${pingResult.status}`;
    block(
      `Gate 3.5 — smoke endpoint check failed.\n` +
      `Endpoint: ${config.endpoint} (${config.method})\n` +
      `Result: ${detail}\n\n` +
      `Fix the service, then retry.\n` +
      `Bypass: KZK_GATE35_SKIP=1 git commit ...`,
    );
  }
}

// PASS
pass();

} // end if (isMain)
