#!/usr/bin/env node
// crg-utils.mjs — shared CRG (code-review-graph) utilities for kzk-harness.
// All skills and hooks should import from here instead of calling CRG CLI directly.
// Authoritative spec: harness-share.md §26 (kzk-codebase-survey).

import { execSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative, extname } from "node:path";
import os from "node:os";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Run a shell command, return stdout string or null on error. */
function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], ...opts }).trim();
  } catch {
    return null;
  }
}

/**
 * Recursively collect all files under dir that match predicate.
 * @param {string} dir
 * @param {(f: string) => boolean} predicate
 * @returns {string[]}
 */
function walkDir(dir, predicate) {
  if (!existsSync(dir)) return [];
  const results = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...walkDir(full, predicate));
      } else if (entry.isFile() && predicate(full)) {
        results.push(full);
      }
    }
  } catch {
    // ignore unreadable dirs
  }
  return results;
}

/**
 * Expand a simple glob pattern (supports ** and *) to matching files.
 * Relative patterns are resolved against rootDir.
 * @param {string} pattern
 * @param {string} rootDir
 * @returns {string[]}
 */
function expandGlob(pattern, rootDir) {
  const absPattern = pattern.startsWith("~")
    ? pattern.replace("~", os.homedir())
    : pattern.startsWith("/")
    ? pattern
    : join(rootDir, pattern);

  // If no wildcards, return as-is if it exists
  if (!absPattern.includes("*")) {
    return existsSync(absPattern) ? [absPattern] : [];
  }

  // Split into base dir (up to first wildcard segment) and suffix pattern
  const parts = absPattern.split("/");
  let baseIdx = parts.findIndex((p) => p.includes("*"));
  const baseDir = parts.slice(0, baseIdx).join("/") || "/";
  const remainParts = parts.slice(baseIdx);

  // Build a regex from the pattern
  const regexStr = remainParts
    .map((p) => {
      if (p === "**") return "(.+/)?";
      return p.replace(/\./g, "\\.").replace(/\*\*/g, ".+").replace(/\*/g, "[^/]*") + "/";
    })
    .join("")
    .replace(/\/$/, "");

  const regex = new RegExp("^" + regexStr + "$");

  return walkDir(baseDir, (f) => {
    const rel = f.slice(baseDir.length + 1);
    return regex.test(rel);
  });
}

// ---------------------------------------------------------------------------
// Exported types (JSDoc only)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} SymbolInfo
 * @property {string} name
 * @property {string} file
 * @property {number} line
 * @property {string} kind  — 'function' | 'method' | 'class' | 'unknown'
 */

/**
 * @typedef {Object} ReverseRef
 * @property {string} symbol
 * @property {string} referencedIn
 * @property {number} line
 * @property {string} kind  — 'call' | 'import' | 'mention'
 */

/**
 * @typedef {Object} StaleDoc
 * @property {string} path
 * @property {string} reason
 * @property {'BLOCK'|'WARN'} severity
 * @property {string[]} symbols
 */

/**
 * @typedef {Object} LineRef
 * @property {string} docPath
 * @property {string} targetFile
 * @property {number} line
 * @property {boolean} valid
 * @property {number|null} currentLine
 */

// ---------------------------------------------------------------------------
// 1. ensureCRG
// ---------------------------------------------------------------------------

/**
 * Check if code-review-graph CLI is installed.
 * Prints a WARN to stderr if not found.
 *
 * @returns {boolean}
 */
export function ensureCRG() {
  const result = run("code-review-graph --version");
  if (result === null) {
    process.stderr.write("[crg-utils] WARN: code-review-graph not installed. CRG features disabled.\n");
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// 2. ensureCRGIndex
// ---------------------------------------------------------------------------

/**
 * Ensure the CRG graph index exists for rootDir.
 * If `code-review-graph status` fails, runs a full build.
 *
 * @param {string} rootDir — absolute path to repository root
 * @returns {void}
 */
export function ensureCRGIndex(rootDir) {
  const abs = resolve(rootDir);
  const status = run(`code-review-graph status --repo ${JSON.stringify(abs)}`);
  if (status === null) {
    process.stderr.write(`[crg-utils] CRG index missing for ${abs}. Running build...\n`);
    run(`code-review-graph build --repo ${JSON.stringify(abs)}`);
  }
}

// ---------------------------------------------------------------------------
// 3. getChangedFiles
// ---------------------------------------------------------------------------

/**
 * Get the list of changed files for a given context.
 *
 * @param {'staged'|'base'|'recent'} context
 * @param {string} rootDir — repo root (used as cwd for git commands)
 * @returns {string[]} relative file paths
 */
export function getChangedFiles(context, rootDir) {
  const cwd = resolve(rootDir);
  const opts = { cwd };

  let raw = null;

  if (context === "staged") {
    raw = run("git diff --cached --name-only", opts);
  } else if (context === "base") {
    raw = run("git diff main...HEAD --name-only", opts);
    if (raw === null) {
      // fallback: try origin/main
      raw = run("git diff origin/main...HEAD --name-only", opts);
    }
  } else if (context === "recent") {
    raw = run("git diff HEAD~5 --name-only", opts);
    if (raw === null) {
      // shallow repo fallback
      raw = run("git diff --cached --name-only", opts);
    }
  }

  if (!raw) return [];
  return raw.split("\n").map((l) => l.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// 4. getChangedSymbols
// ---------------------------------------------------------------------------

/**
 * Get changed symbols by running `code-review-graph detect-changes`.
 * Returns empty array if CRG is not available.
 *
 * @param {string[]} _files — (reserved for future use; CRG uses HEAD~1 diff internally)
 * @param {string} rootDir
 * @returns {SymbolInfo[]}
 */
export function getChangedSymbols(_files, rootDir) {
  const abs = resolve(rootDir);
  const raw = run(`code-review-graph detect-changes --base HEAD~1 --repo ${JSON.stringify(abs)}`);
  if (raw === null) return [];

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const fns = parsed.changed_functions;
  if (!Array.isArray(fns)) return [];

  return fns.map((fn) => ({
    name: typeof fn.name === "string" ? fn.name : String(fn.name ?? ""),
    file: typeof fn.file === "string" ? fn.file : String(fn.file ?? ""),
    line: typeof fn.line === "number" ? fn.line : parseInt(fn.line, 10) || 0,
    kind: inferKind(fn),
  }));
}

/** Infer symbol kind from CRG output fields. */
function inferKind(fn) {
  if (typeof fn.kind === "string") return fn.kind;
  if (typeof fn.type === "string") return fn.type;
  const name = fn.name ?? "";
  if (/^[A-Z]/.test(name)) return "class";
  return "function";
}

// ---------------------------------------------------------------------------
// 5. reverseRefs
// ---------------------------------------------------------------------------

/**
 * Find references to the given symbols in the codebase using grep.
 *
 * @param {SymbolInfo[]} symbols
 * @param {string} rootDir
 * @returns {ReverseRef[]}
 */
export function reverseRefs(symbols, rootDir) {
  const abs = resolve(rootDir);
  const results = [];

  for (const sym of symbols) {
    const name = sym.name;
    if (!name) continue;

    const raw = run(
      `grep -rn ${JSON.stringify(name)} --include="*.md" --include="*.mjs" --include="*.ts" --include="*.js" ${JSON.stringify(abs)}`
    );
    if (!raw) continue;

    for (const line of raw.split("\n")) {
      const match = line.match(/^(.+?):(\d+):(.*)$/);
      if (!match) continue;
      const [, filePath, lineNum, content] = match;

      // Filter out the definition file itself
      if (filePath === sym.file || resolve(filePath) === resolve(sym.file)) continue;

      results.push({
        symbol: name,
        referencedIn: filePath,
        line: parseInt(lineNum, 10),
        kind: classifyRef(content, name),
      });
    }
  }

  return results;
}

/** Classify a grep match line into a reference kind. */
function classifyRef(content, name) {
  if (/import/.test(content)) return "import";
  if (new RegExp(`${name}\\s*\\(`).test(content)) return "call";
  return "mention";
}

// ---------------------------------------------------------------------------
// 6. findStaleMetaDocs
// ---------------------------------------------------------------------------

const DEFAULT_META_GLOBS = ["CLAUDE.md", "AGENTS.md", "docs/**/*.md"];
const BLOCK_PATTERNS = ["CLAUDE.md", "AGENTS.md"];

/**
 * Detect meta docs that may be stale given a set of changed files.
 *
 * @param {string[]} changedFiles — relative paths of changed files
 * @param {string[]} [metaGlobs] — glob patterns for meta docs to check
 * @param {string} rootDir
 * @returns {StaleDoc[]}
 */
export function findStaleMetaDocs(changedFiles, metaGlobs = DEFAULT_META_GLOBS, rootDir) {
  const abs = resolve(rootDir);

  // Expand globs → absolute paths of meta docs
  const metaDocs = [];
  for (const glob of metaGlobs) {
    metaDocs.push(...expandGlob(glob, abs));
  }

  // Also check ~/.claude/projects/*/memory/**/*.md
  const memoryGlob = "~/.claude/projects/*/memory/**/*.md";
  metaDocs.push(...expandGlob(memoryGlob, abs));

  // Deduplicate
  const uniqueDocs = [...new Set(metaDocs)];

  // Get changed symbols for symbol-name matching
  const symbols = getChangedSymbols(changedFiles, abs);
  const symbolNames = symbols.map((s) => s.name).filter(Boolean);

  const stale = [];

  for (const docPath of uniqueDocs) {
    if (!existsSync(docPath)) continue;
    let content;
    try {
      content = readFileSync(docPath, "utf8");
    } catch {
      continue;
    }

    const matchedSymbols = [];
    const reasons = [];

    // Check if any changed file path appears in the doc
    for (const cf of changedFiles) {
      if (content.includes(cf)) {
        reasons.push(`references changed file: ${cf}`);
      }
    }

    // Check if any changed symbol name appears in the doc
    for (const sym of symbolNames) {
      if (content.includes(sym)) {
        matchedSymbols.push(sym);
        reasons.push(`references changed symbol: ${sym}`);
      }
    }

    if (reasons.length === 0) continue;

    const basename = docPath.split("/").pop() ?? "";
    const severity = BLOCK_PATTERNS.some((p) => basename === p || docPath.endsWith("/" + p))
      ? "BLOCK"
      : "WARN";

    stale.push({
      path: docPath,
      reason: reasons.join("; "),
      severity,
      symbols: matchedSymbols,
    });
  }

  return stale;
}

// ---------------------------------------------------------------------------
// 7. validateLineRefs
// ---------------------------------------------------------------------------

/**
 * Validate file:line references found in a doc file.
 *
 * @param {string} docPath — absolute path to doc file
 * @returns {LineRef[]}
 */
export function validateLineRefs(docPath) {
  if (!existsSync(docPath)) return [];

  let content;
  try {
    content = readFileSync(docPath, "utf8");
  } catch {
    return [];
  }

  const results = [];
  const docDir = docPath.split("/").slice(0, -1).join("/");

  // Match patterns like: path/to/file.ext:123
  const lineRefRegex = /([^\s`'"()\[\]]+\.[a-zA-Z]{1,10}):(\d+)/g;
  let match;

  while ((match = lineRefRegex.exec(content)) !== null) {
    const [, filePart, linePart] = match;
    const lineNum = parseInt(linePart, 10);

    // Resolve relative to doc dir or absolute
    const targetFile = filePart.startsWith("/")
      ? filePart
      : join(docDir, filePart);

    if (!existsSync(targetFile)) {
      results.push({ docPath, targetFile, line: lineNum, valid: false, currentLine: null });
      continue;
    }

    let fileContent;
    try {
      fileContent = readFileSync(targetFile, "utf8");
    } catch {
      results.push({ docPath, targetFile, line: lineNum, valid: false, currentLine: null });
      continue;
    }

    const lineCount = fileContent.split("\n").length;
    const valid = lineNum <= lineCount;
    results.push({ docPath, targetFile, line: lineNum, valid, currentLine: valid ? lineNum : lineCount });
  }

  return results;
}

// ---------------------------------------------------------------------------
// 8. extractDocRefs
// ---------------------------------------------------------------------------

/**
 * Extract all code references from a doc file.
 *
 * @param {string} docPath — absolute path to doc file
 * @returns {{ files: string[], symbols: string[], lineRefs: LineRef[] }}
 */
export function extractDocRefs(docPath) {
  if (!existsSync(docPath)) return { files: [], symbols: [], lineRefs: [] };

  let content;
  try {
    content = readFileSync(docPath, "utf8");
  } catch {
    return { files: [], symbols: [], lineRefs: [] };
  }

  // File paths: anything path-like with an extension
  const fileRegex = /(?:^|[\s`'"()\[\]])([./~][^\s`'"()\[\]]*\.[a-zA-Z]{1,10})/g;
  const files = [];
  let m;
  while ((m = fileRegex.exec(content)) !== null) {
    files.push(m[1]);
  }

  // Symbol names: backtick-wrapped identifiers
  const symbolRegex = /`([A-Za-z_$][A-Za-z0-9_$]*)`/g;
  const symbols = [];
  while ((m = symbolRegex.exec(content)) !== null) {
    symbols.push(m[1]);
  }

  // Line references
  const lineRefs = validateLineRefs(docPath);

  return {
    files: [...new Set(files)],
    symbols: [...new Set(symbols)],
    lineRefs,
  };
}
