# kzk-codebase-survey Design Spec

**Date:** 2026-05-04
**Status:** Approved
**Scope:** New harness skill `kzk-codebase-survey` — mandatory deep codebase exploration before brainstorming and planning

---

## 1. Problem

Plans made by the harness regularly miss 1-2 features because:

- **A. Planner doesn't read enough** — only sees the spec + a short file list; transitive dependencies, reverse imports, and integration points are invisible.
- **B. Spec is insufficient** — edge cases, existing feature maintenance requirements, and type/interface contracts are not captured before planning starts.

Even when `superpowers:brainstorming` is used before planning, the brainstorming session does not systematically traverse the codebase. The result: plans that look correct on paper but break existing functionality or omit integration points at implementation time.

---

## 2. Solution

A new standalone skill `kzk-codebase-survey` that:

1. Runs an EXPLORER agent before any brainstorming or planning phase
2. Systematically reads the full codebase scope (internal files + external library docs)
3. Extracts TypeScript type/interface contracts, env vars, and patterns
4. Produces a structured "codebase intelligence report"
5. Injects that report into brainstorming context, planner prompts, and critic review

---

## 3. Architecture

```
Task / Issue Description
         ↓
  kzk-codebase-survey (EXPLORER agent)
         ↓
  Codebase Intelligence Report
    ┌────┴────┐
    ↓         ↓
brainstorm  planner
    ↓         ↓
   spec  →→→ plan
              ↓
           critic
    (plan + spec + report — all three)
              ↓
           executor
```

**Mandatory call sites:**
- `kzk-large-task-delegation` — Step 0, before any planner dispatch
- Before `superpowers:brainstorming` — report injected into brainstorming context
- `kzk-web-loop` P1/P2 plan gate — survey → writing-plans
- Critic review — receives plan + spec + survey report

---

## 4. EXPLORER Agent — 8 Steps

**Agent:** `oh-my-claudecode:explore` (haiku) for file discovery + parallel `Read` in main context for deep reads.

### Step 1 — Scope Expansion

Given the task description and initial file list:

1. Parse all `import`/`require`/`from` statements in the target files
2. Trace one transitive hop: find all files that import FROM the target files (`grep -r "from '.*<module>'"`)
3. Include all files in the same feature directory (same folder or closest named folder)
4. Include all co-located test files (`*.test.*`, `*.spec.*`)

Output: complete file list for deep read.

### Step 2 — Deep Read (parallel)

Read every file in the scope list in parallel (`Read` tool). No excerpts — full file content.

Also collect for each file:
```bash
git log --oneline -5 -- <file>   # recent change history
```

### Step 3 — Library Detection

Parse all import statements from the deep-read files. Filter to external packages (not relative paths). Cross-reference against `package.json` / `requirements.txt` / `go.mod`. Keep only packages directly referenced in the files being changed.

### Step 4 — Library Knowledge Loading

For each relevant external library, in priority order:

1. `mcp__plugin_context7_context7__resolve-library-id("<library>")` → then `query-docs`
2. Check for a matching `kzk-*`, `superpowers:*`, or `gstack:*` skill → `Skill("<skill-name>")` if found
3. Fallback: `WebSearch("<library> <version> API reference")` for current docs

Output: per-library "current correct API patterns" block.

### Step 5 — Pattern Extraction

From the deep-read internal files, extract:
- Naming conventions (component names, function names, file names)
- Error handling pattern (throw / return / Result type / error boundary)
- State management approach (useState, Zustand, Redux, etc.)
- How async operations are handled (async/await, Promise chains, SWR, React Query)
- Existing conventions for the feature area being changed

### Step 6 — TypeScript Type / Interface Contracts

For TypeScript projects, for every file in scope:
- Extract all `export type`, `export interface`, `export enum` declarations
- For each: name, fields, which other files import it
- Flag any type that is imported by files OUTSIDE the current scope (breaking-change risk)

Output: "type contract map" — what's exported, who depends on it.

### Step 7 — Env Vars / Config

Scan all files in scope for:
- `process.env.<VAR>` references
- `os.getenv()` / `os.environ` (Python)
- `config.<key>` / `getConfig()` patterns

Cross-reference against `.env.example`, `config/default.json`, or equivalent. List: current vars used, required type/default, and any new vars the plan might need.

### Step 8 — Report Generation

Compile all outputs into one structured report. Save to:
- **Manual session:** `docs/harness/surveys/YYYY-MM-DD-<topic>-survey.md`
- **Autonomous mode:** `.web-loop/surveys/cycle-N-survey.md`

---

## 5. Report Structure

```markdown
# Codebase Survey: <topic> (YYYY-MM-DD HH:MM)

## Scope
### Directly affected files
- path/to/file.ts — [one-line summary]

### Transitively affected files
- path/to/dependent.ts — [one-line summary, imported by X]

### Test files
- path/to/file.test.ts

## Dependency Map
### <filename>
- Exports: [list of exported symbols]
- Imports from: [internal deps]
- Imported by: [reverse deps — who calls this]

## Type / Interface Contracts
### <TypeName> (path/to/file.ts)
- Fields: [...]
- Imported by: [files outside scope — breaking-change risk]

## Features to Preserve
- [Feature name]: [where it lives, what it does]

## Integration Points
- [External caller] → [function/endpoint it calls]

## Library APIs (context7 current docs)
### <library@version>
[Relevant API patterns for this change]

## Env Vars
| Var | Type | Default | Used in |
|---|---|---|---|
| EXAMPLE_VAR | string | — | path/to/file.ts |

## Internal Patterns
- Naming: [...]
- Error handling: [...]
- Async: [...]

## Edge Cases (from existing tests)
- [test name]: [what edge case it covers]
```

---

## 6. Integration with Existing Skills

### 6.1 kzk-large-task-delegation

Add **Step 0** to the pre-implementation plan-critic loop:

```
0. kzk-codebase-survey — EXPLORER runs, report saved
1. Codex CLI consult on plan draft (receives report)
2. Planner (opus) writes plan — prompt includes report
3. Critic (opus) reviews — receives plan + spec + report
4. Frozen plan
5. Executor (sonnet)
```

The planner prompt must include the full report path and a "Required reading" instruction.

The critic prompt must include: "Check the plan covers every item in the Features to Preserve and Integration Points sections of the survey report. Any gap = FAIL."

### 6.2 superpowers:brainstorming

Before invoking `Skill("superpowers:brainstorming")`, run `kzk-codebase-survey` and append the report summary (Scope + Features to Preserve + Integration Points sections) to the brainstorming context. The brainstorming session uses this as its starting codebase understanding rather than ad-hoc file reads.

### 6.3 kzk-web-loop P1/P2

Replace P1/P2 plan gate step order:

**Before:** writing-plans → subagent-driven-development
**After:** kzk-codebase-survey → writing-plans → subagent-driven-development

The survey report path is passed to writing-plans as required reading.

---

## 7. Skill Frontmatter

```yaml
name: kzk-codebase-survey
version: 1.0.0
description: "Mandatory deep codebase explorer — runs before brainstorming and planning. 
  Reads full file scope (direct + transitive imports), loads external library docs via 
  context7, extracts TypeScript type contracts and env vars. Produces a codebase 
  intelligence report used by planner + critic. Required triggers: 'codebase survey', 
  '코드베이스 탐색', 'deep explore', 'survey first', 'before planning'."
```

Authoritative source: `harness-share.md §26`. On conflict, that wins.

---

## 8. Out of Scope

- Reading files outside the one-transitive-hop boundary (avoids over-reading on large codebases)
- Generating the plan (survey only produces the report)
- Modifying any existing file (read-only operation)
- Running tests (that is the tool runner's job in kzk-web-loop)
- Language-specific deep analysis beyond TypeScript types and env vars (v1 scope)
