---
name: kzk-freshness-guard
version: 1.4.0
description: "Stale meta-doc detection via CRG symbol reverseRefs + auto-fix per doc type (AGENTS row, CLAUDE section, spec line-ref). Runs at Gate 0.5, spec-and-review Step 0, pre-merge §4. Triggers: 'stale 체크', 'freshness guard', 'Gate 0.5', 'KZK_GATE05_SKIP'. References harness-share.md §30."
---

> Authoritative source: `harness-share.md` §30. On conflict, that wins.

# kzk-freshness-guard

## Why

Stale meta-documents (CLAUDE.md, AGENTS.md, spec, survey, memory) after code changes are one of five major meta-gaps. This skill uses CRG symbol reverseRefs to automatically detect which meta-docs are affected by a code change and updates them. Works in any project ($PWD-based).

## Detection Logic

```
1. Collect changed file list (staged diff / recent commits / manual scan)
2. CRG query (required; WARN + degraded grep mode if not installed):
   a. crg-utils.getChangedSymbols(files) → exported symbols from changed files
   b. crg-utils.reverseRefs(symbols) → list of files referencing those symbols
3. Meta-doc scan (crg-utils.findStaleMetaDocs):
   a. grep changed file paths → CLAUDE.md, AGENTS.md, docs/**, memory/**
   b. grep changed symbols/function names → same scope
   c. line number references: file:line pattern → stale confirmed if file changed
4. Result: list of stale docs + stale reason for each + severity (BLOCK/WARN)
```

## CRG not installed — behavior

- Emit WARN: `⚠️ [freshness-guard] CRG not installed — degraded mode (grep only). Precise symbol reverseRefs unavailable.`
- Fallback: filename grep + extract function names from `git diff --cached -U0` hunk headers
- Silent skip forbidden

## Six auto-invocation points

| Timing | Trigger | Action |
|---|---|---|
| Before kzk-spec-and-review Step 0 | Immediately before survey/spec authoring | Update stale docs then proceed + recursion guard |
| Before kzk-codebase-survey start | On survey entry | CRG validity check of line references + recursion guard |
| Immediately before plan execution | When reading a frozen plan | Detect code changes after plan was authored |
| Pre-commit Gate 0.5 | Based on staged diff | BLOCK + auto-fix + re-stage |
| kzk-pre-merge-sync | Immediately before merge | Final sweep of CLAUDE.md + AGENTS.md + all docs |
| Manual trigger | "stale 체크" etc. | Full scan |

## Edge case guards

- No-git repo: skip entirely + WARN if `.git` absent
- Unborn HEAD: skip + WARN if `git rev-parse HEAD` fails
- Shallow history: fall back to `git diff --cached` if `git diff HEAD~5` fails
- Renamed/deleted files: detect with `--diff-filter=R/D`; reference to deleted file = stale confirmed
- Recursion guard: global flag `_FRESHNESS_GUARD_RUNNING=true`, depth=1 cap

## Auto-fix strategy by document type

| Document type | Update strategy | Executor |
|---|---|---|
| AGENTS.md | Gate 0 pattern: row-level | Main directly |
| CLAUDE.md | Rewrite only changed section | executor (sonnet) |
| spec/survey | Update line refs + reflect code description | executor (sonnet) |
| auto-memory | CRG fact verification → delete/update | Main judgment then Write |
| plan | frozen → no update allowed, WARN only | WARN only |

## File path reference resilience (fallback path lookup)

When a stale meta-doc reference's file path is *not found*:

### 1. Missing explicit path — do not halt immediately

If an explicit path is absent, do NOT immediately error or prompt the user. Alternative paths must be searched — file rename / directory move are possibilities.

### 2. Fallback lookup procedure

a. **Extract file basename** — last segment of path (e.g. `TextCellEditor.test.tsx`)
b. **Lookup starts from repo root only** — `git rev-parse --show-toplevel`. No other repos or system-wide paths. (User intent: no searching from "weird places")
c. **Search commands (in priority order)**:
   1. `git ls-files | grep -F "<basename>"` — git-tracked files (primary)
   2. `find <repo-root> -name "<basename>" -type f -not -path '*/node_modules/*' -not -path '*/.git/*'` — includes gitignored files (e.g. untracked new files)
d. **Handle results**:
   - **1 hit**: update reference to that path + WARN (`path moved: <old> → <new>`)
   - **Multiple hits**: pick the closest path (shortest depth / same directory as staged file). WARN + state chosen path
   - **0 hits**: file itself is absent (rename probability 0) → ERROR + recommend removing reference + register `Q-FILE-MISSING-<basename>` in user-queue

### 3. Anti-patterns

- ❌ Explicit path not found → immediately ask user "이 path 없는데 어떻게 할까요?" — perform fallback first, then report
- ❌ Start from explicit path → absent → halt — search other paths before halting
- ❌ System-wide find / other repos (`~/web/...`, `~/Library/...`) — always start from current repo root

### 4. Trigger points

This procedure fires at:
- §Detection Logic staged file ↔ meta-doc reference path comparison
- Gate 0.5 pre-commit stale check (kzk-pre-commit-gate cross-ref)
- Pre-merge sweep (kzk-pre-merge-sync §4 cross-ref)
- User-explicit stale check trigger

## Pre-commit Gate 0.5

- Inserted between Gate 0 (AGENTS.md sync) and Gate 1 (ai-slop)
- Staged files → CRG symbol reverseRefs → stale detection
- Stale found: BLOCK + display list + dispatch auto-fix + re-stage
- Partial failure: stage only successful fixes, WARN + user-queue for failures
- No stale: PASS

## CRG Canonical Contract

- `install/lib/crg-utils.mjs` = single entry point for all CRG usage
- Other skills must not call `code-review-graph` CLI directly — always go through crg-utils

## Interaction with other kzk-*

- **kzk-pre-commit-gate**: owns Gate 0.5
- **kzk-spec-and-review**: freshness check before Step 0, spec reference validation after Step -1 brainstorming
- **kzk-codebase-survey**: validates existing report for staleness before survey starts
- **kzk-fix-scope-expansion**: impact radius → meta-doc detection
- **kzk-large-task-delegation**: CRG scope estimation
- **kzk-pre-merge-sync**: full freshness sweep immediately before merge
- **kzk-tool-retry**: 1-retry on freshness hook failure

## Rollback

- Immediate hook disable: `OMC_SKIP_HOOKS=freshness-guard`
- Skill disable: `DISABLE_OMC=kzk-freshness-guard`
- Gate 0.5 skip: `KZK_GATE05_SKIP=1` env flag
