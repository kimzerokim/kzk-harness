---
name: kzk-codebase-survey
version: 1.11.0
description: "Mandatory pre-planning deep codebase explorer — make sure to use this skill before any spec, plan, major design draft, or fix. This is the hub for fix-start flows: when the user says 'fix 시작', '버그 수정', or 'callsite 전수', invoke this skill first; it then lazy-invokes kzk-fix-scope-expansion (CRG callsite query) and kzk-freshness-guard (stale report check). Runs 8 steps via oh-my-claudecode:explore subagent: CRG index verify, scope expansion, deep parallel Read, library detection, context7 docs load, pattern extraction, TypeScript contracts, report save. 5+ file reads are forbidden in main context — always delegate here. References harness-share.md §26."
---

> Authoritative source: `harness-share.md` §26. On conflict, that wins.

# kzk-codebase-survey

## EXPLORER Agent

**Agent dispatch:** `oh-my-claudecode:explore` (`model=sonnet`) for file discovery + parallel `Read` in main context for full reads.

Run all steps in order (Step 0.5 + Step 1–8). Save report before returning.

### Step 0.5 — Tool Availability + Index Verification

`code-review-graph --version` only confirms the binary exists. The build log is not a reliable success signal — it shows the last incremental pass and may report `8 files, 5 edges` even when the full graph holds 2000+ nodes. **`code-review-graph status` is the oracle.** Always verify the index before trusting any query.

Sequence:

**(a) Binary check.**
```bash
export PATH="$HOME/.local/bin:$PATH"
command -v code-review-graph >/dev/null 2>&1
```
If missing AND running in autonomous mode AND `python3 -m pip --version` succeeds:
```bash
python3 -m pip install --user code-review-graph && code-review-graph install
```
PEP 668 fallback: `pipx install code-review-graph`. Both fail → set `CRG_AVAILABLE=false`, queue `Q-INSTALL-CRG-MANUAL`, proceed to grep fallback. Interactive mode without auto-install: log the install command and set `CRG_AVAILABLE=false`. Never halt.

**(b) Index status (oracle).**
```bash
code-review-graph status 2>&1
```
Parse for `Files: <N>`, `Nodes: <N>`, `Edges: <N>`, `Last updated: <ISO>`, `Built at commit: <sha>`. If status command fails OR `Files: 0` OR `Nodes: 0` → index empty/missing.

**(c) Build if empty or stale.**
- Empty: run `code-review-graph build` (foreground — block on it).
- Stale: if `Built at commit: <sha>` differs from `git rev-parse HEAD` AND `git rev-list --count <sha>..HEAD` > 10 → run `code-review-graph build` to refresh. Single-commit drift is fine; trust the existing index.

**(d) Verify after build.** Re-run `code-review-graph status` and confirm `Files > 0` AND `Nodes > 0`. If still empty after a build → set `CRG_AVAILABLE=false`, queue `Q-CRG-EMPTY-INDEX — build produced 0 nodes, investigate`, proceed to grep fallback.

**(e) Cache for session.** Set `CRG_AVAILABLE=true`, `CRG_FILES=<N>`, `CRG_NODES=<N>`, `CRG_LAST_BUILT_SHA=<sha>`. Subsequent survey calls within the same session trust this cache; only re-run `status` if > 30 minutes elapsed OR new commits detected since `CRG_LAST_BUILT_SHA`.

**Anti-pattern**: trusting build log output alone. The build log shows the most recent incremental pass — it can read tiny numbers even when the full graph is healthy. Only `status` is authoritative.

### Step 1 — Scope Expansion

If Step 0.5 ran and set `CRG_AVAILABLE=true`, trust the cache and proceed directly to the "If MCP / CLI available" paths below. If `CRG_AVAILABLE=false`, jump to the grep Fallback path.

If Step 0.5 was skipped entirely (interactive mode without prior survey call this session), run a fast verification before any CRG call: `command -v code-review-graph >/dev/null && code-review-graph status 2>&1 | grep -E "^Files: " ` — if missing or `Files: 0`, fall back to grep without trying to build (interactive mode rule).

**Path priority: MCP tools → CLI → grep.** When `code-review-graph install` runs it auto-registers as an MCP server (in `.mcp.json`, `.claude/`, `.cursor/`, etc.). Probe with `ToolSearch(query="+code-review-graph")` once per session — if MCP tools surface, use them in preference to the CLI form below. See `## MCP tool surface` near the bottom of this file for the tool→use-case mapping.

**If MCP tools available (preferred):**
1. `semantic_search_nodes` — find related symbols by name/keyword
2. `query_graph(pattern="callers_of"|"callees_of"|"imports_of"|"tests_for", target=<file or symbol>)` — replaces `code-review-graph query/blast-radius`
3. `get_impact_radius(target=<file>)` — blast-radius scoring
4. Same feature-dir + test-file inclusion rules as below

**If CLI available (exit 0) but no MCP:**
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
// dispatch shape pseudocode — not literal TypeScript; use Agent tool with JSON params
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

spec 작성 / plan 작성 / library 변경의 preparation phase 에서 reference 파일 collection 도 EXPLORER subagent 위임 의무다.

### 5+ 파일 read = EXPLORER subagent 무조건

메인이 preparation 목적으로 5+ 파일을 직접 read 하면 안 된다. context saturation 으로 결론 품질이 저하되고 ("main reads code weirdly" failure mode), 이후 plan 이나 spec 에 갭이 생긴다.

- **5+ 파일 read** → `oh-my-claudecode:explore` (model=sonnet) dispatch. 메인은 200-word evidence summary 만 받는다.
- **raw 파일 내용이 메인 컨텍스트로 직접 유입되는 것 자체가 갭** — 축약 summary 도 200 words 상한.
- 3-4 파일 이하 read 도 preparation 목적이면 EXPLORER 우선 권장 (must 아님, 단 5+ 는 must).

### Anti-pattern — Main direct-read during preparation

메인이 Bash(ls/find) → Read 를 연속 호출하거나 같은 응답에서 3+ 파일 read 시도 시 즉시 EXPLORER subagent dispatch 로 전환.

> Full signal list + 대응: `kzk-large-task-delegation` §Anti-pattern §Main direct-edit. `kzk-autonomous-boundary` §Q-MAIN-DIRECT-EDIT.

## Interaction with other kzk-*

- **kzk-large-task-delegation §"Pre-implementation plan-critic loop (opus + codex)"**: This skill is Step 0 of that loop. Report path must be in planner + critic prompts.
- **kzk-web-loop P1/P2**: Survey runs before `writing-plans`. Report path passed as "Required reading".
- **kzk-spec-and-review §"Step 0 — Codebase survey precondition"**: This skill is the precondition for any spec / plan / major design draft. The codex review skill blocks Step 1 (Draft) until a survey report exists. Survey report path is then cited in the draft prompt's CONTEXT block as "Required reading", and the same path is appended to the Codex CLI prompt's DESIGN UNDER REVIEW section.
- **kzk-background-monitoring**: EXPLORER dispatch is a long-running subagent; narrate after completion per result-narration mandate.
- **kzk-tool-retry**: If any EXPLORER Edit/Write/Bash call fails mid-survey, apply the 1-retry policy before halting — do not abort the entire survey on a single tool failure.
- **kzk-fix-scope-expansion (Plan B)**: fix 시작 시 CRG callsite 전수 조회 트리거 (`fix 시작`, `버그 수정`, `callsite 전수` 등). SoT = harness-share §3.5. fix-start hook 발동 시 자동 invoke 관계.
- **kzk-freshness-guard**: survey 시작 전 기존 리포트의 stale 여부 검증. `crg-utils.validateLineRefs()` 로 line reference 유효성 CRG 체크. recursion guard 적용.
