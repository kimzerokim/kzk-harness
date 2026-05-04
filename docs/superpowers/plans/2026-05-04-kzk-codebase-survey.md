# kzk-codebase-survey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `kzk-codebase-survey` skill and wire it into all planning entry points so every plan is preceded by a full codebase intelligence report.

**Architecture:** New skill at `skills/kzk-codebase-survey/SKILL.md` defines an 8-step EXPLORER agent. Four existing files are updated to call the survey as Step 0: `kzk-large-task-delegation`, `kzk-web-loop`, `harness-share.md` (new §26), and the three registry files (`CLAUDE.md`, `README.md`). Install one-liner is already dynamic — no change needed there.

**Tech Stack:** Markdown skill files. Verification via `grep`. No compilation. Branch: `feature/kzk-codebase-survey`.

**Spec:** `docs/superpowers/specs/2026-05-04-kzk-codebase-survey-design.md`

---

### Task 1: Create `skills/kzk-codebase-survey/SKILL.md`

**Files:**
- Create: `skills/kzk-codebase-survey/SKILL.md`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p skills/kzk-codebase-survey
```

- [ ] **Step 2: Write SKILL.md**

Create `skills/kzk-codebase-survey/SKILL.md` with this exact content:

```markdown
---
name: kzk-codebase-survey
version: 1.0.0
description: "Mandatory deep codebase explorer — runs before brainstorming and planning. Reads full file scope (direct + transitive imports), loads external library docs via context7, extracts TypeScript type contracts and env vars. Produces a codebase intelligence report used by planner + critic. Required triggers: 'codebase survey', '코드베이스 탐색', 'deep explore', 'survey first', 'before planning'."
---

> Authoritative source: `harness-share.md §26`. On conflict, that wins.

# kzk-codebase-survey

Mandatory pre-brainstorming and pre-planning deep read. Solves the root cause of feature gaps in plans: the planner only sees a short file list, not the full codebase context, external library APIs, or TypeScript type contracts.

**Run before:** `superpowers:brainstorming`, `kzk-large-task-delegation` planner dispatch, `kzk-web-loop` P1/P2 `writing-plans` step.

## EXPLORER Agent

**Agent dispatch:** `oh-my-claudecode:explore` (`model=sonnet`) for file discovery + parallel `Read` in main context for full reads.

Run all 8 steps in order. Save report before returning.

### Step 1 — Scope Expansion

Parse all `import`/`require`/`from` statements in the target files. Then:
1. Trace one transitive hop: find files that import FROM the targets via `grep -r "from '.*<module-name>'" --include="*.ts" --include="*.tsx" -l`
2. Include all files in the same feature directory (closest named folder boundary)
3. Include all co-located test files (`*.test.*`, `*.spec.*`)

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
3. Fallback: `WebSearch("<library> <version> API reference site:docs.<library>.dev OR site:npmjs.com")`

Output: per-library "current correct API patterns" block in the report.

### Step 5 — Pattern Extraction

From the deep-read internal files, extract and record:
- Naming conventions (PascalCase components, camelCase hooks, SCREAMING_SNAKE constants)
- Error handling approach: throw / return error / Result type / error boundary / toast
- Async: async/await / Promise chains / SWR / React Query / tRPC
- State management: useState / Zustand / Redux / Context
- Existing library call patterns already in use (e.g., how `prisma.find()` is called)

### Step 6 — TypeScript Type/Interface Contracts

For TypeScript projects, scan every file in scope for:
- All `export type`, `export interface`, `export enum` declarations
- For each exported type: name, fields/members, and which files import it
- Flag any type imported by files OUTSIDE the current scope with ⚠ (breaking-change risk if type is modified)

For non-TypeScript projects: skip this step, note "N/A — not a TypeScript project" in report.

### Step 7 — Env Vars / Config

Scan all files in scope for:
- `process.env.<VAR>` (Node.js)
- `os.getenv()` / `os.environ["VAR"]` (Python)
- `config.<key>` / `getConfig("<key>")` patterns
- `import.meta.env.<VAR>` (Vite)

Cross-reference `.env.example`, `config/default.json`, or equivalent config file if it exists.

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
- Imported by: [reverse deps — who calls this]

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

Run all 8 steps from kzk-codebase-survey SKILL.md in order.
Save the completed report to the path above.
Return: the absolute path to the saved report file.
If any step is blocked, note the reason in the report and continue.`,
  run_in_background: false,
});
```

## Anti-patterns

- Running planner without a survey report → produces incomplete plans (the root problem this skill solves)
- Sampling files instead of reading them fully → misses integration points
- Skipping Step 4 (library loading) → plan uses stale or hallucinated API patterns
- Reading beyond one transitive hop → over-reading on large codebases (v1 scope limit; document as limitation)
- Reusing a survey report from a previous cycle without re-running → stale context

## Interaction with other kzk-*

- **kzk-large-task-delegation**: This skill is Step 0 of the plan-critic loop. Report path must be in planner + critic prompts.
- **kzk-web-loop P1/P2**: Survey runs before `writing-plans`. Report path passed to writing-plans as "Required reading".
- **kzk-spec-and-review**: Survey report should be included in the Codex CLI prompt context (append to DESIGN UNDER REVIEW section).
- **kzk-background-monitoring**: EXPLORER dispatch is a long-running subagent; narrate after completion per result-narration mandate.
```

- [ ] **Step 3: Verify frontmatter is present**

```bash
head -6 skills/kzk-codebase-survey/SKILL.md
```

Expected output: shows `---`, `name:`, `version:`, `description:`, `---` lines.

- [ ] **Step 4: Commit**

```bash
git add skills/kzk-codebase-survey/SKILL.md
git commit -m "feat(kzk-codebase-survey): add v1.0.0 SKILL.md — 8-step deep codebase explorer"
```

---

### Task 2: Add §26 to `harness-share.md`

**Files:**
- Modify: `harness-share.md` (append after §25, before end of file)

- [ ] **Step 1: Verify current end of harness-share.md**

```bash
tail -10 harness-share.md
```

Expected: shows §25 kzk-web-loop Branch boundary section as last content.

- [ ] **Step 2: Append §26**

Add the following after the last line of harness-share.md (after the `kzk-autonomous-boundary` applies line):

```markdown

---

## 26. kzk-codebase-survey — Mandatory Deep Codebase Explorer

Full spec: `docs/superpowers/specs/2026-05-04-kzk-codebase-survey-design.md`. Skill: `skills/kzk-codebase-survey/SKILL.md`.

### Purpose

Run before any brainstorming or planning phase. Reads the full codebase scope (direct + transitive imports), loads external library docs via context7, extracts TypeScript type contracts and env vars. Produces a "codebase intelligence report" that feeds planner + critic, preventing plans that miss features or integration points.

### When mandatory

- Before `superpowers:brainstorming` — report injected into brainstorming context
- `kzk-large-task-delegation` Step 0 — before any planner dispatch
- `kzk-web-loop` P1/P2 — survey → writing-plans order

### 8-step EXPLORER

1a. Scope expansion (target files → transitive imports → feature dir → tests)
1b. Deep read all files in parallel (full file, no excerpts) + `git log -5 <file>`
2. Library detection (parse imports → external packages only)
3. Library knowledge: context7 docs → kzk/superpowers skill → web_search fallback
4. Pattern extraction (naming, error handling, async, state management)
5. TypeScript type/interface contracts (exports + reverse deps, ⚠ breaking-change flags)
6. Env vars / config (`process.env.*`, `.env.example`)
7. Report generation → `docs/harness/surveys/YYYY-MM-DD-<topic>-survey.md` (manual) or `.web-loop/surveys/cycle-N-survey.md` (autonomous)

### Critic gate

Critic prompt must include: "Check the plan covers every item in Features to Preserve and Integration Points in the survey report. Any gap = FAIL."

### No-halt

Survey failure (file unreadable, library docs unavailable) → note in report, continue with available data. Never halts the planning pipeline.
```

- [ ] **Step 3: Verify §26 was added**

```bash
grep -n "^## 26\." harness-share.md
```

Expected: one line showing `## 26. kzk-codebase-survey — Mandatory Deep Codebase Explorer`

- [ ] **Step 4: Commit**

```bash
git add harness-share.md
git commit -m "docs(harness-share): add §26 kzk-codebase-survey reference"
```

---

### Task 3: Update `CLAUDE.md` registry and `README.md`

**Files:**
- Modify: `CLAUDE.md` (add row to skill table, update count 13→14)
- Modify: `README.md` (add row to skills table, update "13" → "14" in two places, update install command count)

- [ ] **Step 1: Add kzk-codebase-survey to CLAUDE.md skill table**

In `CLAUDE.md`, find the skills table row for `kzk-web-loop` (last row) and add a new row after it:

Find:
```
| `kzk-web-loop` | web loop, 웹 루프, 12시간, 자율 개선, loop forever, 무한 개선 |
```

Add after it:
```
| `kzk-codebase-survey` | codebase survey, 코드베이스 탐색, deep explore, survey first, before planning |
```

- [ ] **Step 2: Update skill count in CLAUDE.md**

Find: `All 13 skills are active in this repo.`
Replace with: `All 14 skills are active in this repo.`

- [ ] **Step 3: Verify CLAUDE.md changes**

```bash
grep -c "^| \`kzk-" CLAUDE.md
```

Expected: `14`

- [ ] **Step 4: Add kzk-codebase-survey to README.md skills table**

In `README.md`, find the row:
```
| `kzk-web-loop` | web loop, 웹 루프, 12시간, 자율 개선, loop forever, 무한 개선 |
```

Add after it:
```
| `kzk-codebase-survey` | codebase survey, 코드베이스 탐색, deep explore, survey first, before planning |
```

- [ ] **Step 5: Update "13" count references in README.md**

Find: `Installs 13 \`kzk-\*\` skills`
Replace with: `Installs 14 \`kzk-\*\` skills`

Find in install command: `listing all 13 kzk-* skills`
Replace with: `listing all 14 kzk-* skills`

- [ ] **Step 6: Verify README.md**

```bash
grep -c "^| \`kzk-" README.md
```

Expected: `14`

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "feat: register kzk-codebase-survey in CLAUDE.md + README.md (14th skill)"
```

---

### Task 4: Update `kzk-large-task-delegation/SKILL.md` — Add Step 0

**Files:**
- Modify: `skills/kzk-large-task-delegation/SKILL.md`

- [ ] **Step 1: Read the pre-implementation plan-critic loop section**

Read `skills/kzk-large-task-delegation/SKILL.md` lines 86–96 (the plan-critic loop steps).

Expected content starts with:
```
## Pre-implementation plan-critic loop (opus + codex)

Before dispatching the sonnet executor, the plan must clear this gate exactly once per Plan or per discrete task:

1. main authors the plan or dispatches `planner` (opus)
2. Codex CLI consult...
```

- [ ] **Step 2: Add Step 0 to the plan-critic loop**

Find the exact text:
```
1. main authors the plan or dispatches `planner` (opus)
2. Codex CLI consult on the plan draft (`codex exec` per `kzk-spec-and-review`) → returns concerns; CLI unavailable → `oh-my-claudecode:critic` opus
3. main edits plan (or dispatches `oh-my-claudecode:critic` opus) to address concerns
4. on agreement, plan is frozen — written to `docs/plans/<file>.md` with a `## Frozen` header line
5. only frozen plans may feed a sonnet executor dispatch
```

Replace with:
```
0. **kzk-codebase-survey** — dispatch EXPLORER agent (see that skill). Report saved to `docs/harness/surveys/YYYY-MM-DD-<topic>-survey.md`. Report path is passed to every subsequent step as "Required reading".
1. main authors the plan or dispatches `planner` (opus) — prompt must include survey report path
2. Codex CLI consult on the plan draft (`codex exec` per `kzk-spec-and-review`) — include survey report in DESIGN UNDER REVIEW section; CLI unavailable → `oh-my-claudecode:critic` opus
3. main edits plan (or dispatches `oh-my-claudecode:critic` opus) to address concerns — critic must check plan covers all "Features to Preserve" and "Integration Points" from survey report; any gap = FAIL
4. on agreement, plan is frozen — written to `docs/plans/<file>.md` with a `## Frozen` header line
5. only frozen plans may feed a sonnet executor dispatch
```

- [ ] **Step 3: Bump version in frontmatter**

Find: `version: 1.0.1`
Replace with: `version: 1.0.2`

- [ ] **Step 4: Verify**

```bash
grep -n "kzk-codebase-survey\|version:" skills/kzk-large-task-delegation/SKILL.md | head -5
```

Expected: shows `version: 1.0.2` and `kzk-codebase-survey` in the plan-critic loop section.

- [ ] **Step 5: Commit**

```bash
git add skills/kzk-large-task-delegation/SKILL.md
git commit -m "feat(kzk-large-task-delegation): v1.0.2 — add Step 0 kzk-codebase-survey gate"
```

---

### Task 5: Update `kzk-web-loop/SKILL.md` — Survey before writing-plans

**Files:**
- Modify: `skills/kzk-web-loop/SKILL.md`

- [ ] **Step 1: Read the P1/P2 plan gate section**

Read `skills/kzk-web-loop/SKILL.md` and find the step 4b section.

Expected to start with: `**4b. P1/P2 plan gate**`

- [ ] **Step 2: Add survey step to superpowers path in 4b**

Find the exact text in the superpowers path of step 4b:
```
  **superpowers available:**
  1. `Skill("superpowers:writing-plans")` — creates a frozen plan at `.web-loop/plans/cycle-N-plan.md`.
```

Replace with:
```
  **superpowers available:**
  1. `kzk-codebase-survey` — dispatch EXPLORER agent; report saved to `.web-loop/surveys/cycle-N-survey.md`. Pass report path to writing-plans as "Required reading".
  2. `Skill("superpowers:writing-plans")` — creates a frozen plan at `.web-loop/plans/cycle-N-plan.md`.
```

And renumber subsequent steps 2→3 in the superpowers path:
```
  3. `Skill("superpowers:subagent-driven-development")` — reads frozen plan, dispatches implementer subagent, 2-stage spec + quality review. gstack available → append `Skill("gstack:review")` as the final code review pass.
  4. Second consecutive FAIL from any reviewer → skip issue, append to `docs/harness/user-queue.md`, pick next issue.
```

- [ ] **Step 3: Add survey step to fallback path in 4b**

Find:
```
  **superpowers unavailable (fallback):**
  1. PLANNER (`oh-my-claudecode:planner`, `model=opus`) authors frozen plan → `.web-loop/plans/cycle-N-plan.md` with `## Frozen` header.
```

Replace with:
```
  **superpowers unavailable (fallback):**
  1. `kzk-codebase-survey` — dispatch EXPLORER agent; report saved to `.web-loop/surveys/cycle-N-survey.md`. Pass to planner as "Required reading".
  2. PLANNER (`oh-my-claudecode:planner`, `model=opus`) authors frozen plan → `.web-loop/plans/cycle-N-plan.md` with `## Frozen` header.
```

And renumber subsequent fallback steps 2→3, 3→4.

- [ ] **Step 4: Add `.web-loop/surveys/` to result narration list**

Find in the result narration line:
```
(tool runner / evaluator / brainstorming / writing-plans / subagent-driven-development / planner / critic / executor)
```

Replace with:
```
(tool runner / evaluator / survey / brainstorming / writing-plans / subagent-driven-development / planner / critic / executor)
```

- [ ] **Step 5: Bump version**

Find: `version: 1.1.0`
Replace with: `version: 1.2.0`

- [ ] **Step 6: Verify**

```bash
grep -n "kzk-codebase-survey\|version:" skills/kzk-web-loop/SKILL.md | head -5
```

Expected: `version: 1.2.0` and two `kzk-codebase-survey` references in step 4b.

- [ ] **Step 7: Commit**

```bash
git add skills/kzk-web-loop/SKILL.md
git commit -m "feat(kzk-web-loop): v1.2.0 — survey step before writing-plans in P1/P2 gate"
```

---

### Task 6: Add `.web-loop/surveys/` to `.gitignore` and verify install coverage

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add surveys dir to .gitignore**

Find in `.gitignore`:
```
.web-loop/
```

Verify it exists (the whole `.web-loop/` dir is already gitignored). If so, no change needed — the wildcard covers `.web-loop/surveys/`. Check:

```bash
grep "web-loop" .gitignore
```

Expected: `.web-loop/` — this already covers surveys. Step done.

- [ ] **Step 2: Verify install one-liner covers new skill**

The README install command reads ALL skills from `/tmp/kzk-harness/skills/` automatically. No change needed — `skills/kzk-codebase-survey/` will be picked up.

Verify the install command still says the right count:

```bash
grep "listing all" README.md
```

Expected: `listing all 14 kzk-* skills` (updated in Task 3).

- [ ] **Step 3: Final cross-reference check**

```bash
echo "=== SKILL.md trigger keywords ===" && \
grep "codebase survey\|코드베이스 탐색" CLAUDE.md README.md && \
echo "=== harness-share §26 ===" && \
grep "^## 26\." harness-share.md && \
echo "=== kzk-large-task-delegation step 0 ===" && \
grep "kzk-codebase-survey" skills/kzk-large-task-delegation/SKILL.md && \
echo "=== kzk-web-loop P1/P2 ===" && \
grep "kzk-codebase-survey" skills/kzk-web-loop/SKILL.md
```

Expected: all grep lines return matches (no empty output).

- [ ] **Step 4: Commit if .gitignore was changed; else just verify**

If `.gitignore` unchanged (no new entry needed):
```bash
git status
```

Expected: clean working tree (all changes committed in previous tasks).

---

### Task 7: Update `harness-share.md §25` — note survey in kzk-web-loop loop description

**Files:**
- Modify: `harness-share.md` (§25 loop steps 3a/3b — add survey reference)

- [ ] **Step 1: Find §25 loop description**

```bash
grep -n "3a\. P0\|3b\. P1" harness-share.md
```

- [ ] **Step 2: Update §25 loop steps to mention survey**

Find the exact text:
```
3a. P0: executor (sonnet) implements directly via TDD → kzk-pre-commit-gate (5 gates: 0–4 if AGENTS.md hierarchy present; 4 gates otherwise) → commit.
3b. P1/P2: planner (opus) writes frozen plan to `.web-loop/plans/cycle-N-plan.md` → critic (opus) reviews → executor (sonnet) implements → commit.
```

Replace with:
```
3a. P0: executor (sonnet) implements directly via TDD → kzk-pre-commit-gate (5 gates: 0–4 if AGENTS.md hierarchy present; 4 gates otherwise) → commit.
3b. P1/P2: kzk-codebase-survey (EXPLORER) → survey report → writing-plans/planner (opus) → critic (opus) reviews → executor (sonnet) implements → commit.
```

- [ ] **Step 3: Verify**

```bash
grep "kzk-codebase-survey" harness-share.md | wc -l
```

Expected: `2` (one in §25, one in §26).

- [ ] **Step 4: Commit**

```bash
git add harness-share.md
git commit -m "docs(harness-share): §25 loop references kzk-codebase-survey in P1/P2 path"
```

---

## ## Frozen
