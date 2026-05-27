---
name: kzk-codebase-survey
version: 1.17.0
description: "Mandatory pre-planning deep codebase explorer via oh-my-claudecode:explore subagent. Hub for fix-start ('fix 시작', '버그 수정', 'callsite 전수'), spec/plan drafts, and detailed analysis ('상세하게 봐줘', '상세히 봐줘'). 8-step survey: CRG verify, scope expansion, deep read, library detect. 5+ main reads forbidden. References harness-share.md §26."
---

> Authoritative source: `harness-share.md` §26. On conflict, that wins.

# kzk-codebase-survey

## EXPLORER Agent

**Agent dispatch:** `oh-my-claudecode:explore` (`model=sonnet`) for file discovery + parallel `Read` in main context for full reads.

Run all steps in order (Step 0.5 + Step 1–8). Save report before returning.

### Step 0.5 — Tool Availability + Index Verification

`code-review-graph --version` only confirms the binary exists. The build log is not a reliable success signal — it shows the last incremental pass and may report `8 files, 5 edges` even when the full graph holds 2000+ nodes. **`code-review-graph status` is the oracle.** Always verify the index before trusting any query.

> **CRG is mandatory (v1.17.0+).** The survey MUST use CRG. The grep fallback is a last-resort path only when CRG genuinely cannot be made available on the host (binary missing AND auto-install impossible). Empty index + skill silently switching to grep = bug; the skill MUST instead halt with an explicit error so the user knows the survey ran without graph data.

Sequence:

**(a) Binary check.**
```bash
export PATH="$HOME/.local/bin:$PATH"
command -v code-review-graph >/dev/null 2>&1
```
If missing AND `python3 -m pip --version` succeeds (both autonomous and interactive):
```bash
python3 -m pip install --user code-review-graph && code-review-graph install
```
PEP 668 fallback: `pipx install code-review-graph`.

- **Install succeeds** → proceed to (b).
- **Both install paths fail** → HALT with `Q-CRG-INSTALL-FAIL` appended to `docs/harness/user-queue.md`. The entry must record: OS, python version, pip error message, suggested manual command. Survey body MUST NOT run; downstream skills (`kzk-spec-and-review`, `kzk-large-task-delegation`) treat this as a Stage-0 blocker. Grep fallback is forbidden when CRG could plausibly be installed.
- **Interactive sandbox without `pip --version`** → HALT with `Q-CRG-INSTALL-MANUAL` and a one-line install command the user can run. Do not silently degrade to grep.

**(b) Index status (oracle).**
```bash
code-review-graph status 2>&1
```
Parse for `Files: <N>`, `Nodes: <N>`, `Edges: <N>`, `Last updated: <ISO>`, `Built at commit: <sha>`. If status command fails OR `Files: 0` OR `Nodes: 0` → index empty/missing.

**(c) Build if empty or stale.**
- Empty: run `code-review-graph build` (foreground — block on it). Must complete; do not background.
- Stale: if `Built at commit: <sha>` differs from `git rev-parse HEAD` AND `git rev-list --count <sha>..HEAD` > 0 AND this is the **first CRG call this session** → run `code-review-graph update` (incremental). If `update` fails or drift is very large (> 50 commits) → fall back to `code-review-graph build` (full).

**(d) Verify after build (HARD FAIL on empty).** Re-run `code-review-graph status` and confirm `Files > 0` AND `Nodes > 0`. If still empty after a build:
- HALT with `Q-CRG-EMPTY-INDEX` in `docs/harness/user-queue.md`. Entry must include: full `code-review-graph status` output, full `code-review-graph build` stderr/stdout tail, project file count from `git ls-files | wc -l`, suggested root causes (unsupported language, `.gitignore` over-excluding, missing tree-sitter grammar).
- Grep fallback is **forbidden** here. The user must see that the survey could not run against the graph and decide explicitly (fix CRG / extend grammars / approve grep for this single run).
- Override (single-use, requires explicit user instruction): `KZK_CRG_GREP_FALLBACK=1` env var. Setting this records the override in the user-queue entry and proceeds with grep, but the survey report MUST flag itself as `degraded: grep-only` in its header so callers know the result lacks call-site accuracy.

**(e) Cache for session.** Set `CRG_AVAILABLE=true`, `CRG_FILES=<N>`, `CRG_NODES=<N>`, `CRG_LAST_BUILT_SHA=<sha>`. Subsequent survey calls within the same session trust this cache; only re-run `status` if > 30 minutes elapsed OR new commits detected since `CRG_LAST_BUILT_SHA`.

**Cache invalidate triggers** (`CRG_LAST_BUILT_SHA` reset → next CRG call re-triggers `(f)`):
- Immediately after a successful commit (`kzk-pre-commit-gate §Post-commit CRG refresh` applies)
- Between plans during multi-Plan continuation (`kzk-autonomous-loop §Multi-plan CRG refresh` applies)
- 30 minutes elapsed (existing rule)
- New commits detected since `CRG_LAST_BUILT_SHA`

**(f) Auto-refresh on first CRG call (session-scoped)**

On the first CRG call this session (Step 0.5 cache not set or expired), auto-refresh:
1. Compare `Built at commit: <sha>` from `code-review-graph status` vs `git rev-parse HEAD`
2. If drift > 0 commits (`git rev-list --count <sha>..HEAD`) → incremental update — run `code-review-graph update` (CLI `update` subcommand — incremental, changed files only). If `update` fails → full `code-review-graph build` fallback.
3. Update session cache — `CRG_LAST_BUILT_SHA=<new sha>`, `CRG_FILES=<N>`, `CRG_NODES=<N>`
4. Subsequent CRG calls this session trust the cache (no repeated builds)

**Anti-pattern** — drift > 0 but "skip because small drift" (the old ">10 commit drift" rule was too conservative — deleted). Always refresh on the first CRG call of any work session.

**Skip condition**: `KZK_CRG_NO_REFRESH=1` env (CI / debug).

**Anti-pattern**: trusting build log output alone. The build log shows the most recent incremental pass — it can read tiny numbers even when the full graph is healthy. Only `status` is authoritative.

**Anti-pattern (v1.17.0)**: EXPLORER subagent silently uses grep when CRG is available but the index is empty. The subagent dispatch report MUST include a verbatim `code-review-graph status` block (Files / Nodes / Edges / Last updated / Built at commit) before any scope-expansion results. If that block is missing from the report, the main agent MUST re-dispatch the survey with an explicit "run Step 0.5 first and quote `code-review-graph status` output in the report header" instruction — and append `Q-SURVEY-CRG-SKIPPED` to the user-queue so the lapse is visible.

### Step 1 — Scope Expansion

If Step 0.5 ran and set `CRG_AVAILABLE=true`, trust the cache and proceed directly to the "If MCP / CLI available" paths below. If `CRG_AVAILABLE=false`, jump to the grep Fallback path.

If Step 0.5 was skipped entirely (interactive mode without prior survey call this session), run a fast verification before any CRG call: `command -v code-review-graph >/dev/null && code-review-graph status 2>&1 | grep -E "^Files: " ` — if missing or `Files: 0`, fall back to grep without trying to build (interactive mode rule).

**Path priority: MCP tools → CLI → grep.** When `code-review-graph install` runs it auto-registers as an MCP server (in `.mcp.json`, `.claude/`, `.cursor/`, etc.). Probe with `ToolSearch(query="+code-review-graph")` once per session — if MCP tools surface, use them in preference to the CLI form below. See `## MCP tool surface` near the bottom of this file for the tool→use-case mapping.

**If MCP tools available (preferred):**
1. `semantic_search_nodes` — find related symbols by name/keyword
2. `query_graph(pattern="callers_of"|"callees_of"|"imports_of"|"tests_for", target=<file or symbol>)` — replaces `code-review-graph query/blast-radius`
3. `get_impact_radius(target=<file>)` — blast-radius scoring
4. Same feature-dir + test-file inclusion rules as below

**Path priority (revised cycle 47): MCP tools → grep. Pure-CLI callsite query is no longer supported (CRG `query`/`blast-radius` subcommands removed; only `serve` mode exposes callsite data over MCP).**

**If CLI available (exit 0) but no MCP:**
1. First try `ToolSearch(query="+code-review-graph")` to surface MCP tools — they auto-register on `code-review-graph install` but may not be loaded yet.
2. If still no MCP tools, the binary's CLI does NOT expose callsite query directly. Two options:
   a. Spawn `code-review-graph serve` as a subprocess and connect via MCP (only worth it for large surveys — overhead ~5s startup).
   b. Skip CRG entirely, use grep fallback below.
3. `code-review-graph status` (always available) can still verify index health and Files/Nodes/Edges count.

**Fallback (CRG not installed or no MCP after step above):**
1. Parse all `import`/`require`/`from` statements in the target files.
2. Trace one transitive hop: `grep -r "from '.*<module-name>'" --include="*.ts" --include="*.tsx" -l`
2.5. **template-literal callsite hop** — when looking for callers of a route/endpoint or any function whose call sites use `${var}` interpolation, the literal URL/symbol won't match a static grep. Try variant patterns:
   - For URLs: grep the path prefix up to the first `${` or `:param` boundary (e.g., `api\.(post|get|put|patch|delete)\(['"\`]\/api\/grids\/`).
   - For symbols imported then template-injected: grep for the imported binding name in body files (e.g., `\bgridId\b` in API client files).
   - For backtick template literals broadly: `grep -rE "['\"\`].*\$\{" --include="*.ts" --include="*.tsx"` then narrow with the symbol name.
   Document the chosen variant in the Survey report's "Scope" section so callers can sanity-check the heuristic.
3. Include all files in the same feature directory (same definition as above — nearest non-generic ancestor).
4. Include all co-located test files (`*.test.*`, `*.spec.*`).

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
2. Check for a matching `kzk-*` or `superpowers:*` skill → `Skill("<skill-name>")` if found
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
// dispatch shape pseudocode — not literal TypeScript; use Agent tool with JSON params
Agent({
  subagent_type: 'oh-my-claudecode:explore',
  model: 'sonnet',
  prompt: `You are running kzk-codebase-survey for this issue: "<issue description verbatim>".

Target files (starting scope): <list of files>
Working directory: <absolute path>
Report save path: .web-loop/surveys/cycle-<N>-survey.md

Required reading before starting: CLAUDE.md, harness-share.md §26, the kzk-codebase-survey SKILL.md (Step 0.5 in particular).

Run all steps in order (Step 0.5 + Step 1–8). CRG is MANDATORY per v1.17.0+ — Step 0.5 must run, the index must be non-empty, and your survey report header MUST include a verbatim 'code-review-graph status' block (Files / Nodes / Edges / Last updated / Built at commit). If the index is empty after a build attempt, do NOT silently switch to grep — halt and append Q-CRG-EMPTY-INDEX to docs/harness/user-queue.md with the diagnostic data the skill spec calls for.

Save the completed report to the path above.
Return: the absolute path to the saved report file.
If any step is blocked, note the reason in the report and continue — except for the Q-CRG-* halts above, which must short-circuit the survey.`,
  run_in_background: false,
});
```

## Anti-patterns

- Running planner without a survey report → produces incomplete plans (root problem this skill solves)
- Sampling files instead of reading them fully → misses integration points
- Skipping Step 4 (library loading) → plan uses stale or hallucinated API patterns
- Reading beyond one transitive hop → over-reading on large codebases (v1 scope limit)
- Reusing a survey report from a previous cycle without re-running → stale context

## MCP tool surface (preferred when registered)

When `code-review-graph install` ran (per `install/dependencies.sh`), the tool registers itself as an MCP server in the project (`.mcp.json` and editor-specific files). Detect via `ToolSearch(query="+code-review-graph")` once per session and load the surfaced tool names with `select:`.

| MCP tool | Use for |
|---|---|
| `semantic_search_nodes` | Step 1 — find functions/classes/files by name or keyword (faster + more semantic than grep) |
| `query_graph` (patterns: `callers_of`, `callees_of`, `imports_of`, `tests_for`) | Step 1 — trace deps in either direction; replaces `code-review-graph query` / `blast-radius` |
| `get_impact_radius` | Step 1 — blast-radius scoring for a target file or symbol |
| `get_affected_flows` | Step 1 — which execution paths a change touches |
| `detect_changes` | kzk-pre-commit-gate Gate 4 / kzk-spec-and-review — risk-scored diff analysis |
| `get_review_context` | Step 2 alt — token-efficient source snippets when scope is too large for full Read |
| `get_architecture_overview` | Step 1 alt — high-level structure pass before deep read |
| `refactor_tool` | Out-of-scope of this skill (planning renames / dead-code detection) |

Fallback order: MCP → CLI → grep. Skill never halts on missing MCP server. Adopting projects who don't want the MCP registration can delete the per-editor artifacts and `.mcp.json` after install — the CLI form in Step 1 still works.

## Preparation phase delegation

During the preparation phase of spec authoring / plan authoring / library changes, reference file collection is also mandatory to delegate to an EXPLORER subagent.

### 5+ file reads = EXPLORER subagent, unconditionally

Main must not directly read 5+ files for preparation purposes. Context saturation degrades conclusion quality (the "main reads code weirdly" failure mode), leading to gaps in the resulting plan or spec.

- **5+ file reads** → dispatch `oh-my-claudecode:explore` (model=sonnet). Main receives only a 200-word evidence summary.
- **Raw file contents flowing directly into main context is itself the gap** — even summaries are capped at 200 words.
- 3-4 file reads for preparation purposes should prefer EXPLORER (not mandatory, but 5+ is mandatory).

### Anti-pattern — Main direct-read during preparation

If main calls Bash(ls/find) → Read in sequence, or attempts 3+ file reads in a single response, switch immediately to EXPLORER subagent dispatch.

> Full signal list + response: `kzk-large-task-delegation` §Anti-pattern §Main direct-edit. `kzk-autonomous-boundary` §Q-MAIN-DIRECT-EDIT.

## Interaction with other kzk-*

- **kzk-large-task-delegation §"Pre-implementation plan-critic loop (opus + codex)"**: This skill is Step 0 of that loop. Report path must be in planner + critic prompts.
- **kzk-web-loop P1/P2**: Survey runs before `writing-plans`. Report path passed as "Required reading".
- **kzk-spec-and-review §"Step 0 — Codebase survey precondition"**: This skill is the precondition for any spec / plan / major design draft. The codex review skill blocks Step 1 (Draft) until a survey report exists. Survey report path is then cited in the draft prompt's CONTEXT block as "Required reading", and the same path is appended to the Codex CLI prompt's DESIGN UNDER REVIEW section.
- **kzk-background-monitoring**: EXPLORER dispatch is a long-running subagent; narrate after completion per result-narration mandate.
- **kzk-tool-retry**: If any EXPLORER Edit/Write/Bash call fails mid-survey, apply the 1-retry policy before halting — do not abort the entire survey on a single tool failure.
- **kzk-fix-scope-expansion (Plan B)**: Triggers CRG callsite sweep on fix start ('fix 시작', '버그 수정', 'callsite 전수', etc.). SoT = harness-share §3.5. Auto-invoked when the fix-start hook fires.
- **kzk-freshness-guard**: Verify staleness of any existing report before starting a new survey. `crg-utils.validateLineRefs()` checks line reference validity via CRG. Recursion guard applies.
