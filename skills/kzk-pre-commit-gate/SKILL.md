---
name: kzk-pre-commit-gate
version: 1.0.1
description: "5-step Pre-commit Gate (AGENTS.md sync / ai-slop-cleaner / build / test / Playwright Gate 4) plus autonomous-mode and doc-only commit policies. Use this skill before every commit, before claiming a task complete, when deciding whether to skip a gate, or when a gate fails. Required triggers: 'commit', 'pre-commit', 'Gate 0/1/2/3/4', 'AGENTS.md sync', 'ai-slop-cleaner', 'autonomous commit', 'doc-only exception'."
---

> Authoritative source: `harness-share.md` §3. On conflict, that wins.

# kzk-pre-commit-gate

Every commit passes 5 gates in order. One failure → commit blocked.

## Gate 0 — Touched-files AGENTS.md sync

If the commit adds or removes a source file (`git diff --cached --name-status` status `A` or `D`), or creates a new directory under any tracked source root (configure the list in your CLAUDE.md), the corresponding `AGENTS.md` file(s) in those directories MUST be updated in the SAME commit. Reason: `deepinit` was historically deferred to "pre-merge" and routinely degenerated into a token-burn skill load with no real regen. Forcing AGENTS.md to ride along with the file change keeps the manifest honest one commit at a time.

Concrete rule:

- New file `path/to/dir/<file>` → `path/to/dir/AGENTS.md` Key Files / Components table updated to include it.
- New directory under a tracked source root → new `AGENTS.md` file authored, parent's Subdirectories table updated, parent reference tag (`<!-- Parent: ../AGENTS.md -->`) set.
- File deletion → corresponding row removed from the AGENTS.md table.
- Pure modification of an existing file (no rename, no add, no delete) → no AGENTS.md change needed; skip.
- Trivial 1-line typo / variable rename in an existing file → skip.
- Test-only adds (`*.test.{ts,tsx}` co-located with the implementation) → may share one row with the implementation file; explicit AGENTS.md row optional.

Failure → fix the AGENTS.md, re-stage, new commit. NEVER amend.

After Gate 0 passes, run the OMC "deepinit manifest save" tool (current name: `mcp__plugin_oh-my-claudecode_t__deepinit_manifest`, `action=save`) once at the END of the commit batch (autonomous run) or at PR-creation time (interactive). If the call fails, verify the tool name via `ToolSearch(query="+deepinit_manifest")` and retry with the resolved name. Manifest baseline file is gitignored (`.omc/deepinit-manifest.json`); it just lets the next session's `action=diff` produce a real signal.

## Gate 1 — ai-slop-cleaner

`Skill("oh-my-claudecode:ai-slop-cleaner")` on changed files. Removes dead code / duplicate / needless abstraction / boundary leak.

Trivial 1-line flag changes may skip → commit body must say `ai-slop-cleaner skipped (trivial)`.

## Gate 2 — build green

Run the repo's build command (e.g. `npm run build`). Verify dist artifact exists (e.g. `dist/main.js`, `dist/index.html`). Exit code 0.

## Gate 3 — module test pass

`npm test` scoped to changed area is acceptable mid-work. Full regression at PR time.

## Gate 4 — UI/CSS visual verification (Playwright MCP)

If any changed file matches `src/**/*.{tsx,ts,css}` (or your repo's equivalent frontend source glob), Gate 4 is mandatory. See `kzk-playwright-verification` skill for the full routine. Skipping / deferring / "do it later in the final sweep" is forbidden.

Exception: change is solely under `src/**/*.test.{tsx,ts}` — Gate 4 may be skipped.

## Doc-only commit exception

If the commit touches **no** source code — only docs/configs/screenshots (`*.md`, `docs/**`, `CLAUDE.md`, `DESIGN.md`, `harness-flow-progress.md`, `skills/**/*.md`, `.claude/skills/**/*.md`, `docs/screenshots/**`) — then:

- Gate 0 (AGENTS.md sync) N/A unless the doc commit itself adds/removes files under a source root (rare)
- Gate 2 (build) skipped
- Gate 3 (test) skipped
- Gate 1 (ai-slop-cleaner) only on the touched md if needed
- Gate 4 N/A
- Autonomous mode: commit without user prompt
- Non-autonomous: still confirm with user

Any single source-code line in the same commit revokes this exception → run full 5 gates.

Note: skill files (`skills/**/*.md`) count as doc-only. `.claude/skills/**/*.md` is the legacy OMC path — both patterns qualify.

## Autonomous-mode commit policy

User explicitly entered autonomous mode ("ralph로 돌려", "자는 동안 진행", "끝까지 끝내줘"):

- 4 gates pass → commit without user confirmation
- Push to feature branch only. **Never push to / auto-merge to `main`.**
- PR creation is allowed; final merge waits for explicit user approval

Non-autonomous (default): every commit waits for user OK after gates pass. No auto-commit.

## Commit message

- English, conventional commits (`feat(scope): ...`, `refactor(scope): ...`)
- HEREDOC for multi-line bodies, EOF quoted (`<<'EOF'`) to disable variable expansion
- **NEVER** include `Co-Authored-By:` lines
- pre-commit hook bypass (`--no-verify`) forbidden unless user explicitly orders it
- Gate-4 commits must include `Playwright: <screenshot_paths> + snapshot captured (console 0 err) + visual verified`

## Failure protocol

- 1st failure: fix root cause, re-stage, new commit
- 3 build/test failures consecutively → halt, append user-queue entry (this is the autonomous-loop halt condition; see `kzk-autonomous-boundary`)
- Never `git commit --amend` after a hook failure (the commit didn't happen — amending hits the previous commit)
