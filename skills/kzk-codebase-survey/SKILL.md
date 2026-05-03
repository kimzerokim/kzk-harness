---
name: kzk-codebase-survey
version: 1.2.5
description: "Mandatory deep codebase explorer — runs before brainstorming and planning. Reads full file scope (direct + transitive imports), loads external library docs via context7, extracts TypeScript type contracts and env vars. Produces a codebase intelligence report used by planner + critic. Required triggers: 'codebase survey', '코드베이스 탐색', 'deep explore', 'survey first', 'before planning'."
---

> Authoritative source: `harness-share.md §26`. On conflict, that wins.

# kzk-codebase-survey

Mandatory pre-brainstorming and pre-planning deep read. Solves the root cause of feature gaps in plans: the planner only sees a short file list, not the full codebase context, external library APIs, or TypeScript type contracts.

**Run before:** `superpowers:brainstorming`, `kzk-large-task-delegation` planner dispatch, `kzk-web-loop` P1/P2 `writing-plans` step.

## EXPLORER Agent

**Agent dispatch:** `oh-my-claudecode:explore` (`model=sonnet`) for file discovery + parallel `Read` in main context for full reads.

Run all steps in order (Step 0.5 + Step 1–8). Save report before returning.

### Step 0.5 — Tool Availability Self-Heal

```bash
code-review-graph --version 2>/dev/null
```

If exit non-zero AND `pip --version` succeeds AND running in autonomous mode, first append a user-queue entry: `Q-INSTALL-CRG — autonomous mode auto-installing code-review-graph (pip)`. Then:
```bash
python3 -m pip install --user code-review-graph && code-review-graph install && code-review-graph build
```

In interactive (non-autonomous) mode: log "code-review-graph not installed — run: python3 -m pip install --user code-review-graph && code-review-graph install && code-review-graph build" and proceed with grep fallback without auto-installing.

Cache result for this session as `CRG_AVAILABLE=true/false`. If install fails with PEP 668 error (externally-managed-environment) → skip `--user`, queue `Q-INSTALL-CRG-MANUAL — use pipx install code-review-graph` and proceed with grep fallback. Any other failure → log "code-review-graph install failed: <error>" to `docs/harness/user-queue.md` and proceed with grep fallback. Never halt on tool availability.

### Step 1 — Scope Expansion

If Step 0.5 ran and set `CRG_AVAILABLE=true`, skip the version check and proceed directly to the "If available" path. If Step 0.5 ran and set `CRG_AVAILABLE=false`, skip the version check and go to the Fallback path. If Step 0.5 was skipped (interactive mode), check: first add `$HOME/.local/bin` to PATH then run `code-review-graph --version 2>/dev/null`.

**If available (exit 0):**
1. `code-review-graph query --file <target>` — forward dependency graph
2. `code-review-graph blast-radius --file <target>` — reverse deps (who imports target)
3. Include all files in the same feature directory (closest named folder boundary — defined as the nearest ancestor directory whose name is not a generic structural folder such as `src/`, `lib/`, `app/`, `components/`, `pages/`)
4. Include all co-located test files (`*.test.*`, `*.spec.*`)

**Fallback (not installed):**
1. Parse all `import`/`require`/`from` statements in the target files
2. Trace one transitive hop: `grep -r "from '.*<module-name>'" --include="*.ts" --include="*.tsx" -l`
3. Include all files in the same feature directory (same definition as above — nearest non-generic ancestor)
4. Include all co-located test files (`*.test.*`, `*.spec.*`)

If code-review-graph is not installed, note "code-review-graph not available — using grep fallback" in report header.

Output: complete file list for Step 2.

### Step 2 — Deep Read (parallel)

Read every file in the scope list using parallel `Read` calls. Full file — no excerpts, no line limits.

Also collect recent history per file:
```bash
git log --oneline -5 -- <file>
```

### Step 3 — Library Detection

Parse all import statements from deep-read files. Filter to external packages (non-relative paths). Cross-reference `package.json` `dependencies` + `devDependencies` (or `requirements.txt`, `go.mod`). Keep only packages directly referenced in the files being changed.

### Step 4 — Library Knowledge Loading

For each relevant external library, in priority order:

1. `mcp__plugin_context7_context7__resolve-library-id("<library>")` → then `mcp__plugin_context7_context7__query-docs`
2. Check for a matching `kzk-*`, `superpowers:*`, or `gstack:*` skill → `Skill("<skill-name>")` if found
3. Fallback: `WebSearch("<library> <version> API reference")`

Output: per-library "current correct API patterns" block in the report.

### Step 5 — Pattern Extraction

From the deep-read internal files, extract and record:
- Naming conventions (PascalCase components, camelCase hooks, SCREAMING_SNAKE constants)
- Error handling approach: throw / return error / Result type / error boundary / toast
- Async: async/await / Promise chains / SWR / React Query / tRPC
- State management: useState / Zustand / Redux / Context
- Existing library call patterns already in use

### Step 6 — TypeScript Type/Interface Contracts

For TypeScript projects, scan every file in scope for:
- All `export type`, `export interface`, `export enum` declarations
- For each exported type: name, fields/members, and which files import it
- Flag any type imported by files OUTSIDE the current scope with ⚠ (breaking-change risk)

For non-TypeScript projects: skip this step, note "N/A" in report.

### Step 7 — Env Vars / Config

Scan all files in scope for:
- `process.env.<VAR>` (Node.js)
- `os.getenv()` / `os.environ["VAR"]` (Python)
- `import.meta.env.<VAR>` (Vite)
- `config.<key>` / `getConfig("<key>")` patterns

Cross-reference `.env.example`, `config/default.json`, or equivalent if present.

Output table: var name | type/format | default | file where used.

### Step 8 — Report Generation

Compile all step outputs into one structured report. Save to:
- **Manual session:** `docs/harness/surveys/YYYY-MM-DD-<topic>-survey.md`
- **Autonomous loop:** `.web-loop/surveys/cycle-N-survey.md`

Report format:

```
# Codebase Survey: <topic> (YYYY-MM-DD HH:MM)

## Scope
### Directly affected files
- path/to/file.ts — [one-line purpose]
### Transitively affected files
- path/to/dep.ts — imported by [which file]
### Test files
- path/to/file.test.ts

## Dependency Map
### <filename>
- Exports: [list of exported symbols]
- Imports from: [internal deps]
- Imported by: [reverse deps]

## Type / Interface Contracts
### <TypeName> (path/to/file.ts)
- Fields: [...]
- Imported by (outside scope): ⚠ [breaking-change risk]

## Features to Preserve
- [Feature name]: [file, what it does, why it must not break]

## Integration Points
- [External caller file] → [function/endpoint it calls]

## Library APIs (context7 current docs)
### <library@version>
[Relevant API patterns for this change only]

## Env Vars
| Var | Type | Default | File |
|---|---|---|---|

## Internal Patterns
- Naming: [...]
- Error handling: [...]
- Async: [...]
- State: [...]

## Edge Cases (from existing tests)
- [test name]: [what edge case it guards]
```

## Autonomous Dispatch Shape

When called from kzk-web-loop or harness loop (non-interactive):

```typescript
Agent({
  subagent_type: 'oh-my-claudecode:explore',
  model: 'sonnet',
  prompt: `You are running kzk-codebase-survey for this issue: "<issue description verbatim>".

Target files (starting scope): <list of files>
Working directory: <absolute path>
Report save path: .web-loop/surveys/cycle-<N>-survey.md

Required reading before starting: CLAUDE.md, harness-share.md §26.

Run all steps from kzk-codebase-survey SKILL.md in order (Step 0.5 + Step 1–8).
Save the completed report to the path above.
Return: the absolute path to the saved report file.
If any step is blocked, note the reason in the report and continue.`,
  run_in_background: false,
});
```

## Anti-patterns

- Running planner without a survey report → produces incomplete plans (root problem this skill solves)
- Sampling files instead of reading them fully → misses integration points
- Skipping Step 4 (library loading) → plan uses stale or hallucinated API patterns
- Reading beyond one transitive hop → over-reading on large codebases (v1 scope limit)
- Reusing a survey report from a previous cycle without re-running → stale context

## Interaction with other kzk-*

- **kzk-large-task-delegation**: This skill is Step 0 of the plan-critic loop. Report path must be in planner + critic prompts.
- **kzk-web-loop P1/P2**: Survey runs before `writing-plans`. Report path passed as "Required reading".
- **kzk-codex-cross-verification**: Survey report appended to Codex CLI prompt DESIGN UNDER REVIEW section.
- **kzk-background-monitoring**: EXPLORER dispatch is a long-running subagent; narrate after completion per result-narration mandate.
