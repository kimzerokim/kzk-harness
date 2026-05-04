#!/usr/bin/env node
// fix-scope-trigger.mjs — UserPromptSubmit hook for kzk-fix-scope-expansion (Plan B).
// Detects fix intent, expands callsite scope via CRG or grep, injects system-reminder.
// Default DISABLED at Plan B commit. Auto-enabled by kzk-pre-merge-sync step 3.
// Authoritative spec: docs/plans/plan-B-fix-scope-expansion.md (rev2).

import { execSync } from "node:child_process";
import path from "node:path";
import { shouldSkip, detectFixIntent, FIX_KEYWORDS } from "../lib/hook-shared.mjs";
import { writeSingleEntryWithLock } from "../lib/cache-write.mjs";

// Max chars for system-reminder callsite list
const TRUNCATION_CAP = 200;

/**
 * extractSymbols — extract candidate symbol names from a prompt.
 * Patterns: backtick `name`, camelCase, snake_case, funcName()
 */
function extractSymbols(prompt) {
  const symbols = new Set();

  // backtick pattern: `symbolName`
  const backtickRe = /`([A-Za-z_][A-Za-z0-9_]{2,})`/g;
  let m;
  while ((m = backtickRe.exec(prompt)) !== null) {
    symbols.add(m[1]);
  }

  // func() pattern: word followed by ()
  const funcCallRe = /\b([A-Za-z_][A-Za-z0-9_]{2,})\s*\(\)/g;
  while ((m = funcCallRe.exec(prompt)) !== null) {
    symbols.add(m[1]);
  }

  // camelCase: contains at least one uppercase not at start
  const camelRe = /\b([a-z][a-zA-Z0-9]{3,}[A-Z][a-zA-Z0-9]*)\b/g;
  while ((m = camelRe.exec(prompt)) !== null) {
    symbols.add(m[1]);
  }

  // snake_case: word_with_underscores (min 2 parts)
  const snakeRe = /\b([a-z][a-z0-9]+(?:_[a-z0-9]+)+)\b/g;
  while ((m = snakeRe.exec(prompt)) !== null) {
    symbols.add(m[1]);
  }

  return [...symbols].slice(0, 3);  // limit to first 3 symbols
}

/**
 * runCRG — run code-review-graph detect-changes and return raw output.
 * DI-injectable runner for testing.
 * CRG signature (Task 0 confirmed): code-review-graph detect-changes --base HEAD~1
 * No --symbol, --file, query, or blast-radius subcommands exist.
 */
export function runCRG(cmd, runner = execSync) {
  return runner(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 10000 });
}

/**
 * runGrep — run grep to find callsites for a symbol.
 * DI-injectable runner for testing.
 * docs/ excluded to prevent documentation mention pollution.
 */
export function runGrep(pattern, runner = execSync) {
  const cmd = `grep -rn ${JSON.stringify(pattern)} --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' --include='*.sh' --include='*.py' --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs`;
  return runner(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 10000 });
}

/**
 * parseCRGOutput — extract file:line references from CRG detect-changes output.
 */
function parseCRGOutput(raw) {
  const lines = raw.split("\n").filter(Boolean);
  const callsites = [];
  for (const line of lines) {
    // detect-changes outputs lines like "path/to/file.mjs: function_name (line N)"
    // or just file paths with impact info
    const fileMatch = line.match(/^([^\s:]+\.[a-z]+)(?::(\d+))?/);
    if (fileMatch && !line.startsWith("[") && !line.startsWith("INFO")) {
      const ref = fileMatch[2] ? `${fileMatch[1]}:${fileMatch[2]}` : fileMatch[1];
      callsites.push(ref);
    }
  }
  return [...new Set(callsites)].slice(0, 20);
}

/**
 * parseGrepOutput — extract file:line references from grep output.
 */
function parseGrepOutput(raw) {
  const lines = raw.split("\n").filter(Boolean);
  const callsites = [];
  for (const line of lines) {
    const m = line.match(/^([^:]+):(\d+):/);
    if (m) {
      callsites.push(`${m[1]}:${m[2]}`);
    }
  }
  return [...new Set(callsites)].slice(0, 20);
}

/**
 * truncateCallsites — join callsites to a string, cap at TRUNCATION_CAP chars.
 */
function truncateCallsites(callsites) {
  const joined = callsites.join(", ");
  if (joined.length <= TRUNCATION_CAP) return joined;
  return joined.slice(0, TRUNCATION_CAP - 3) + "...";
}

/**
 * getCommitSHA — get HEAD commit SHA for cache key.
 */
function getCommitSHA() {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return `no-sha-${Date.now()}`;
  }
}

/**
 * handler — main hook handler, testable with DI.
 *
 * @param {object} input — {hook_event_name, prompt} from stdin
 * @param {object} options — {runner} for DI in tests
 * @returns {object|null} — hook output JSON or null
 */
export async function handler(input, { runner = null } = {}) {
  const prompt = String(input.prompt ?? input.user_prompt ?? "");

  // 1. Self-skip guard
  const skip = shouldSkip(prompt, process.env);
  if (skip) {
    return { continue: true, _skip: skip };
  }

  // 2. Fix intent detection
  if (!detectFixIntent(prompt)) {
    return { continue: true };
  }

  // Gate 4.5 escape check (hook still runs, Gate 4.5 itself checks this env var)
  // hook collects callsites regardless; Gate 4.5 skips the check if KZK_GATE45_SKIP=1

  // 3. Extract symbols from prompt
  const symbols = extractSymbols(prompt);
  const primarySymbol = symbols[0] ?? null;

  let callsites = [];
  let crgAvailable = false;

  // 4. CRG path (Task 0 confirmed signature: detect-changes --base HEAD~1)
  try {
    const crgCheck = execSync("command -v code-review-graph", {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 3000,
    });
    crgAvailable = crgCheck.trim().length > 0;
  } catch {
    crgAvailable = false;
  }

  if (crgAvailable) {
    try {
      const crgRunner = runner ?? ((cmd, opts) => execSync(cmd, opts));
      const crgOut = runCRG("code-review-graph detect-changes --base HEAD~1", crgRunner);
      callsites = parseCRGOutput(crgOut);
    } catch (e) {
      process.stderr.write(`[fix-scope-trigger] CRG failed: ${e.message} — grep fallback\n`);
      crgAvailable = false;
    }
  }

  if (!crgAvailable) {
    process.stderr.write(`[fix-scope-trigger] WARN: code-review-graph not installed or failed. grep fallback.\n`);
    const warnReason = "_warn:\"crg-not-installed-grep-fallback\"";

    if (primarySymbol) {
      try {
        const grepRunner = runner ?? ((cmd, opts) => execSync(cmd, opts));
        const grepOut = runGrep(primarySymbol, grepRunner);
        callsites = parseGrepOutput(grepOut);
      } catch (e) {
        // grep exit non-zero = no matches, not an error
        if (!e.message.includes("exit code 1") && e.status !== 1) {
          process.stderr.write(`[fix-scope-trigger] grep failed: ${e.message}\n`);
        }
        callsites = [];
      }
    }
  }

  if (callsites.length === 0) {
    return { continue: true };
  }

  // 5. Truncation
  const callsiteDisplay = truncateCallsites(callsites);

  // 6. Write to cache
  const repoRoot = process.cwd();
  const cachePath = path.join(repoRoot, ".kzk-harness", "fix-scope-cache.jsonl");
  const commitSHA = getCommitSHA();

  try {
    await writeSingleEntryWithLock(cachePath, commitSHA, callsites);
  } catch (e) {
    process.stderr.write(`[fix-scope-trigger] cache write failed: ${e.message}\n`);
  }

  // 7. Build system-reminder
  const symbolNote = primarySymbol ? ` (심볼: ${primarySymbol})` : "";
  const reminder = [
    `[FIX SCOPE] fix intent 감지${symbolNote}. 관련 callsite ${callsites.length}곳:`,
    callsiteDisplay,
    `⚠ 모든 callsite 수정 의무 또는 Gate 4.5 에서 BLOCK. KZK_GATE45_SKIP=1 로 우회 가능 (사유 commit body 기재).`,
    `self-check: grep -rn <functionName> --include='*.{ts,tsx,js,mjs,sh,py}' --exclude-dir={node_modules,.git,docs}`,
  ].join("\n");

  return {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: reminder,
    },
  };
}

// Main entrypoint when run as a hook process
if (process.argv[1] === new URL(import.meta.url).pathname) {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { raw += chunk; });
  process.stdin.on("end", async () => {
    let payload;
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }

    const result = await handler(payload);
    if (result) {
      process.stdout.write(JSON.stringify(result) + "\n");
    } else {
      process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    }
  });
}
