---
name: kzk-pre-merge-sync
version: 1.2.0
description: "Pre-merge/milestone checklist — sync CLAUDE.md + run deepinit before any user-visible milestone. Top triggers: 'merge', 'PR 직전', 'deepinit', 'CLAUDE.md sync', 'milestone marker'. Body §Triggers for full list."
---

> Authoritative source: `harness-share.md` §14.5 + §15. On conflict, that wins.

# kzk-pre-merge-sync

## Triggers

`merge`, `merge 전`, `feature branch`, `PR`, `PR 직전`, `deepinit`, `Pre-Merge`, `milestone marker`, `CLAUDE.md update`, `CLAUDE.md sync`, `manifest 재생성`.

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

## Combined PR description footer

```
## Pre-merge checklist

- [x] CLAUDE.md updated to match current state
- [x] deepinit ran
- [x] kzk-pre-commit-gate full gate PASS (Gate 0 N/A if no AGENTS.md hierarchy; otherwise all of 0, 1, 1.5, 2, 3, 4) on final commit
- [ ] Experiment complete + user merge approval received (PR-flow), OR milestone marker reached + user notified (direct-main / direct-no-PR flow). Skip if PR target is a non-main feature branch.
```

## Interaction with other kzk-*

- **kzk-autonomous-boundary**: Defines when autonomous PR creation is allowed (post-review explicit user merge approval is the sole exception).
- **kzk-pre-commit-gate**: Provides the gate-PASS line this skill writes into the PR footer.
- **kzk-spec-and-review**: Pre-PR `deepinit_manifest` refresh updates the AGENTS.md memory that codex review reads.
