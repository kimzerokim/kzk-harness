---
name: kzk-pre-merge-sync
version: 1.0.6
description: "Pre-merge checklist — sync CLAUDE.md to current code state and run `/oh-my-claudecode:deepinit` before any feature-branch merge. Required triggers: 'merge 전', 'PR 직전', 'deepinit', 'Pre-Merge', 'CLAUDE.md update', 'manifest 재생성'."
---

> Authoritative source: `harness-share.md` §14.5 + §15. On conflict, that wins.

# kzk-pre-merge-sync

Two checks every PR must complete before merge to its target branch (use `feature/<topic>` in all adopting projects; `harness-test` is the kzk-harness repo's own convention only).

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

- Target: every feature branch → `main` merge, exactly once locally before merge
- **In autonomous mode**: deepinit runs at PR-creation time (immediately before `gh pr create` on the feature branch tip), regardless of any prior local deepinit run in the same session. Merge is gated by explicit user "merge it" — the deepinit refresh happens on the feature branch, not at merge time.
- Why: PRD / plan / skill md changes that aren't reflected in OMC memory cause the next session's agent to start with stale context
- Failure → check log, fix, do not skip. Skip = block merge (failure also halts the autonomous loop — see `kzk-autonomous-boundary`)
- Checkpoint: PR description includes the literal line `deepinit ran`

## Combined PR description footer

```
## Pre-merge checklist

- [x] CLAUDE.md updated to match current state
- [x] deepinit ran
- [x] kzk-pre-commit-gate full gate PASS (Gate 0 N/A if no AGENTS.md hierarchy; otherwise all of 0, 1, 1.5, 2, 3, 4) on final commit
- [ ] Experiment complete + user merge approval received (skip if PR target is feature branch, not main)
```
