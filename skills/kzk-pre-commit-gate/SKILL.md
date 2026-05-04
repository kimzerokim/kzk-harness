---
name: kzk-pre-commit-gate
version: 1.3.0
description: "Up-to-7-step Pre-commit Gate (AGENTS.md sync / ai-slop / secrets / build / test / Playwright / fix-scope sanity). Top triggers: 'commit', 'pre-commit', 'Gate 0', 'AGENTS.md sync', 'Gate 4.5', 'fix-scope-cache', 'callsite mismatch', 'KZK_GATE45_SKIP', 'doc-only'. Body §Triggers for full list."
---

> Authoritative source: `harness-share.md` §3. On conflict, that wins.

# kzk-pre-commit-gate

## Triggers

`commit`, `pre-commit`, `Gate 0`, `Gate 1`, `Gate 1.5`, `Gate 2`, `Gate 3`, `Gate 4`, `Gate 4.5`, `AGENTS.md sync`, `ai-slop-cleaner`, `secrets scan`, `autonomous commit`, `doc-only exception`, `fix-scope-cache`, `callsite mismatch`, `KZK_GATE45_SKIP`.

Every commit passes up to 7 gates in order (0, 1, 1.5, 2, 3, 4, 4.5 — Gate 0 only when AGENTS.md hierarchy present, so 6 gates otherwise). One failure → commit blocked.

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

**Optional skill-level extension (NOT a Gate 0 gate requirement). Gate 0 alone passes on the AGENTS.md edit.** After that pass, load the deepinit_manifest tool schema — `ToolSearch(query="select:mcp__plugin_oh-my-claudecode_t__deepinit_manifest")` — then call with `action=save`. After `ToolSearch` resolves the tool, **read the loaded schema before calling** — do not hardcode `action="save"` as the full call shape if other params appear as required. If the schema requires more than `action`, log the extra params + values used in the commit body. Current OMC shape: `mcp__plugin_oh-my-claudecode_t__deepinit_manifest(action="save")`. Run once at the END of the commit batch (autonomous run) or at PR-creation time (interactive). If ToolSearch returns no result, search by keyword `ToolSearch(query="+deepinit_manifest")` and call the resolved name. If neither search finds the tool (OMC plugin not installed or not surfaced), skip — log `deepinit_manifest tool unavailable, manifest baseline skipped this commit` in the commit body and continue. Manifest baseline file is gitignored (`.omc/deepinit-manifest.json`); it lets the next session's `action=diff` produce a real signal.

## Gate 1 — ai-slop-cleaner

`Skill("oh-my-claudecode:ai-slop-cleaner")` on changed files. Removes dead code / duplicate / needless abstraction / boundary leak.

Trivial 1-line flag changes may skip → commit body must say `ai-slop-cleaner skipped (trivial)`.

## Gate 1.5 — secrets scan

Before committing, scan staged files for accidental secrets:

```bash
git diff --cached | grep -iE "(password|secret|api_key|aws_secret|private_key|token)\s*[:=]\s*['\"]?[A-Za-z0-9+/]{8,}" || true
```

Also check for `AKIA`/`ASIA` prefixes (AWS key patterns) per `kzk-production-access`. If any match found → unstage the file, remove the secret, re-stage. Never commit secrets even in test fixtures.

Trivial false positives (e.g. test fixture strings that are obviously fake) → commit body must say `secrets-scan: false positive — <reason>`.

## Gate 2 — build green

Run the repo's build command (e.g. `npm run build`). Verify dist artifact exists (e.g. `dist/main.js`, `dist/index.html`). Exit code 0.

## Gate 3 — module test pass

`npm test` scoped to changed area is acceptable mid-work. Full regression at PR time.

## Gate 4 — UI/CSS visual verification (Playwright MCP)

If any changed file matches `src/**/*.{tsx,ts,css}` (or your repo's equivalent frontend source glob), Gate 4 is mandatory. See `kzk-playwright-verification` skill for the full routine. Skipping / deferring / "do it later in the final sweep" is forbidden.

Exception: change is solely under `src/**/*.test.{tsx,ts}` — Gate 4 may be skipped.

## Gate 4.5 — Fix Scope Sanity Check (Plan B)

> Authoritative source: harness-share.md §3.5. On conflict, that wins.

**Trigger**: `.kzk-harness/fix-scope-cache.jsonl` 존재 시 (fix-scope-trigger hook 이 활성이고 fix intent commit 일 때).

**Skip**: `KZK_GATE45_SKIP=1` env var 설정 시 N/A (사유 commit body 기재 권고).

**Cache policy**: JSONL append/list — 현재 cycle commit SHA (`$(git rev-parse HEAD)`) key 의 모든 항목 union 체크. `last-fix-wins` 아님.

**Sanity check**: callsite list ⊄ `git diff --cached --name-only` → BLOCK.

BLOCK 시 메시지:
```
Gate 4.5: callsite N곳 중 M곳 미수정.
누락 의도를 commit body 에 명시하거나 해당 callsite 도 수정.
```

**Cache 부재**: N/A (fix-scope-trigger hook 비활성 또는 fix intent 아닌 commit).

See `kzk-fix-scope-expansion` for the full fix-scope rules and `harness-share.md §3.5` as canonical SoT.

## Doc-only commit exception

If the commit touches **no** source code — only docs/configs/screenshots (`*.md`, `docs/**`, `CLAUDE.md`, `DESIGN.md`, `harness-flow-progress.md`, `skills/**/*.md`, `.claude/skills/**/*.md`, `docs/screenshots/**`) — then:

- Gate 0 (AGENTS.md sync) N/A unless the doc commit itself adds/removes files under a source root (rare)
- Gate 2 (build) skipped
- Gate 3 (test) skipped
- Gate 1 (ai-slop-cleaner) only on the touched md if needed
- Gate 4 N/A
- Autonomous mode: commit without user prompt
- Non-autonomous: still confirm with user

Any single source-code line in the same commit revokes this exception → run all applicable gates (6 if AGENTS.md hierarchy present; 5 otherwise).

**AGENTS.md / README.md classification**: these are `.md` files but follow this rule — standalone update (no source file add/delete in the same commit) = doc-only OK, Gate 0 not triggered. Same commit as a Gate 0 trigger (source file add/delete) = doc-only exception revoked by the source change, run all applicable gates.

Note: skill files (`skills/**/*.md`) count as doc-only ONLY when modifying an existing skill. ADDING a new skill triggers Gate 0 **only when an AGENTS.md hierarchy is present** (same conditional as §Gate 0), plus the README.md / CLAUDE.md skill-count update flow described in CLAUDE.md "Skill Development Rules". `.claude/skills/**/*.md` is the legacy OMC path — same rules apply.

## Doc-only patch policy

When the staged diff touches ONLY the following paths, gate down to a minimal verification set:

- `skills/kzk-*/SKILL.md`, `harness-share.md`, `CLAUDE.md`, `README.md`, `harness-flow-progress.md`, `docs/**/*.md`
- AND no source file (`*.ts`, `*.tsx`, `*.js`, `*.mjs`, `*.py`, `*.sh`) added or modified

Minimal set:
1. Gate 1.5 secrets scan — always required
2. `bash install/verify-install.sh --ac 2` — kzk marker block row count (≤ 5s)

Skip the install/test full suite + AC3/6/7 + Gate 2/3/4. The full suite runs once at cycle close (last commit before global update).

Doc-only commits go straight to commit after Gate 1.5 + AC2. Save token + wall-clock cost (~30s × cycle-close commits saved).

## Autonomous-mode commit policy

User explicitly entered autonomous mode ("ralph로 돌려", "자는 동안 진행", "끝까지 끝내줘"):

- All applicable gates pass (6 if AGENTS.md hierarchy present; 5 otherwise) → commit without user confirmation
- Push respects the session **branch contract** locked at autonomous-mode entry (`kzk-autonomous-boundary`). Direct-`main` push is allowed only if the user explicitly authorized direct-main flow this session — never as a silent default.
- PR creation is allowed if the contract specifies PR-flow; final merge always waits for explicit user "merge it" regardless of contract

Non-autonomous (default): every commit waits for user OK after gates pass. No auto-commit.

## Commit message

- English, conventional commits (`feat(scope): ...`, `refactor(scope): ...`)
- HEREDOC for multi-line bodies, EOF quoted (`<<'EOF'`) to disable variable expansion
- **NEVER** include `Co-Authored-By:` lines
- pre-commit hook bypass (`--no-verify`) forbidden unless user explicitly orders it
- Gate-4 commits must include `Playwright: <screenshot_paths> + snapshot captured (console 0 err) + visual verified`

## Failure protocol

- 1st failure: fix root cause, re-stage, new commit
- **Autonomous mode:** 3 consecutive build/test failures on the same area → halt, append user-queue entry (see `kzk-autonomous-boundary`). **Interactive mode:** surface failures to user, do not auto-halt.
- Critic / verifier / Gate 4 visual reviewer 2 consecutive FAIL on the same change (Gate 4 Playwright visual review, plan reviewer, verifier agent) → halt + user-queue entry. See `kzk-autonomous-boundary` for the full halt condition list. Exception: `kzk-web-loop` overrides consecutive-FAIL halts with skip+next-issue (see `kzk-web-loop` §Failure Handling).
- Never `git commit --amend` after a hook failure (the commit didn't happen — amending hits the previous commit)

## Interaction with other kzk-*

- **kzk-autonomous-boundary**: Owns the halt protocol invoked when ≥2 consecutive reviewer/critic FAILs (or ≥3 consecutive build/test FAILs) occur during gate runs.
- **kzk-playwright-verification**: Implements Gate 4 (browser smoke + screenshot drop).
- **kzk-test-coverage**: Gate 3 runs the same test command this skill owns at session close.
- **kzk-large-task-delegation**: Subagent prompts must echo the gate sequence so delegated executors commit with full gate awareness.
- **kzk-web-loop**: Owns the override exception that lets the loop bypass full Gate 0–4 in indefinite-loop mode (see kzk-web-loop §Failure Handling).
- **kzk-pre-merge-sync**: Consumes the gate-PASS line this skill emits in the PR footer.
