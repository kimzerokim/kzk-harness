---
name: kzk-pre-merge-sync
version: 1.8.0
description: "Pre-merge / milestone checklist before gh pr create (PR-flow) or direct-main milestone commits. Enforces: CLAUDE.md sync, deepinit run, regression-recall + fix-scope hook auto-enable, full freshness sweep. Triggers: 'merge', 'feature branch', 'CLAUDE.md sync', 'deepinit'. References harness-share.md §14.5 + §15."
---

> Authoritative source: `harness-share.md` §14.5 + §15. On conflict, that wins.

# kzk-pre-merge-sync

Two checks before any user-visible milestone, regardless of branch contract (see `kzk-autonomous-boundary` §Branch contract):

- **PR-flow**: run before `gh pr create` on the feature-branch tip (target = `feature/<topic>` in adopting projects, or repo-specific like `harness-test` for kzk-harness self-test).
- **Direct-main / direct-no-PR flow**: run before each user-visible milestone commit — typically a topic's final/closing commit, a release-equivalent state, or any commit the user is likely to call out as "this is the version to use." Don't run before every direct-main commit; that's noise. Run when the milestone matters.

## 1. CLAUDE.md sync (mandatory)

Verify the following sections in repo root `CLAUDE.md` match the current code state. Fix mismatches before merge:

- **Tech Stack** — `package.json` deps + ORM / framework / library changes
- **Project Structure** — new modules / directories / files
- **API Endpoints** — controller endpoint additions / removals / path changes
- **Database** — schema changes (table add/remove, column add/remove)
- **Key Rules** — any rule change
- **Environment Variables** — new env var

Checkpoint: PR description includes the literal line `CLAUDE.md updated to match current state`. Reviewer blocks merge if missing.

Automation: dispatch a fresh subagent with prompt "compare CLAUDE.md vs current code (Tech Stack / Project Structure / API Endpoints / Database / Key Rules / Env Vars), list outdated sections, propose patch in single Edit". OMC `/document-release` is broader-scope (whole docs/) — direct dispatch is preferred for CLAUDE.md alone.

## 2. `/oh-my-claudecode:deepinit` (mandatory)

Regenerates project manifest + skill/tool inventory + memory.

```
Skill("oh-my-claudecode:deepinit")
```

- Target — **PR-flow**: every feature branch → `main` merge, exactly once locally before `gh pr create`. **Direct-main / direct-no-PR flow**: once before each user-visible milestone commit (see opening section above for what counts as a milestone).
- **In autonomous mode under PR-flow**: deepinit runs at PR-creation time on the feature-branch tip, regardless of prior local deepinit in the same session. Merge is gated by explicit user "merge it" — the deepinit refresh happens on the feature branch, not at merge time.
- **In autonomous mode under direct-main / direct-no-PR flow**: deepinit runs before the milestone-marker commit. Skipping deepinit just because there is no PR boundary is a violation — the contract changed, not the discipline.
- Why: PRD / plan / skill md changes that aren't reflected in OMC memory cause the next session's agent to start with stale context
- Failure → check log, fix, do not skip. Skip = block merge.
- Checkpoint: PR description includes the literal line `deepinit ran`

## 3. Hook auto-enable (Plan D + Plan B, fail-closed)

After all **5 plans (A→D→B→C→E)** complete, immediately before merging `feature/memory` → `main`, switch `regression-recall` + `fix-scope-trigger` hooks from default DISABLED to ENABLED:

```bash
bash install/install-global.sh --enable-hooks --regression-recall --fix-scope-trigger
```

`--regression-recall` + `--fix-scope-trigger` are explicit dependencies, so `--enable-hooks` (keyword-detector) is also auto-enabled.

**Mandatory user confirm gate** — obtain explicit user confirmation before auto-invoking. If declined, guide the manual enable path:
- Declined → user runs the command above directly. Must state "regression-recall hook left disabled by user request" in PR description or milestone commit message.
- Confirmed → auto-invoke install-global.sh, report stdout result to user.

**Fail-closed verification** (codex answer #3):
1. Check `install-global.sh --enable-hooks --regression-recall --fix-scope-trigger` exit code — non-zero → block merge (`exit 1`)
2. Verify exactly 1 `regression-recall.mjs` entry exists in the `UserPromptSubmit` array in settings.json (count with jq). 0 or 2+ → block merge
3. If `jq` is not installed, check first → guide user to `brew install jq` + block merge

All 3 verifications must PASS to proceed with merge.

**Why**: Plans D + B commits default DISABLED — prevents self-contamination during the next cycle. The 5-plan milestone merge is the natural first-enable gate (prevents amnesia). Fail-closed means a silent install failure cannot slip through to merge undetected.

Skip = block merge. Exception: user has explicitly declared "regression-recall keep disabled" (must be stated in PR description or milestone commit message).

Checkpoint: PR description (PR-flow) or milestone commit message (direct-main flow) must include:
- ENABLED: `regression-recall hook enabled via kzk-pre-merge-sync step 3`
- ENABLED: `fix-scope-trigger hook enabled via kzk-pre-merge-sync step 3`
- User-declined: `regression-recall hook left disabled by user request`

## Combined PR description footer

```
## Pre-merge checklist

- [x] CLAUDE.md updated to match current state
- [x] deepinit ran
- [x] kzk-pre-commit-gate full gate PASS (Gate 0 N/A if no AGENTS.md hierarchy; otherwise all of 0, 1, 1.5, 2, 3, 4) on final commit
- [ ] Experiment complete + user merge approval received (PR-flow), OR milestone marker reached + user notified (direct-main / direct-no-PR flow). Skip if PR target is a non-main feature branch.
- [ ] regression-recall hook enabled via step 3 (or user-declined per spec rev6 §Default DISABLED, fail-closed verified)
```

## 4. Freshness sweep

> See `kzk-freshness-guard` §Detection Logic — branch-wide stale sweep (getChangedFiles('base') → findStaleMetaDocs → auto-fix dispatch → PASS). Cross-ref: `kzk-freshness-guard` §Six auto-invocation points 'kzk-pre-merge-sync' row.

## Interaction with other kzk-*

- **kzk-autonomous-boundary**: Defines when autonomous PR creation is allowed (post-review explicit user merge approval is the sole exception).
- **kzk-pre-commit-gate**: Provides the gate-PASS line this skill writes into the PR footer.
- **kzk-spec-and-review**: Pre-PR `deepinit_manifest` refresh updates the AGENTS.md memory that codex review reads.
- **kzk-regression-memory**: This skill's step 3 is the first-enable gate for the regression-recall hook. spec rev6 §Default DISABLED auto-enable entry point. Fail-closed (jq absent / install-global.sh non-zero / duplicate entry → merge block).
- **kzk-freshness-guard**: Full freshness sweep immediately before merge (§4)
