---
name: kzk-pre-merge-sync
version: 1.9.0
description: "Pre-merge / milestone checklist before gh pr create (PR-flow) or direct-main milestone commits. Enforces: CLAUDE.md sync, deepinit run, regression-recall + fix-scope hook auto-enable, full freshness sweep, stub sweep, prod-build user-persona smoke, SoT alignment. Triggers: 'merge', 'feature branch', 'CLAUDE.md sync', 'deepinit'. References harness-share.md §14.5 + §15."
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
- [ ] Stub sweep: `git log main..HEAD --format="%H %s%n%b" | grep "STUB:"` → 0 user-visible unresolved stubs (or noted as `Stub accepted:` in PR body)
- [ ] Experiment complete + user merge approval received (PR-flow), OR milestone marker reached + user notified (direct-main / direct-no-PR flow). Skip if PR target is a non-main feature branch.
- [ ] regression-recall hook enabled via step 3 (or user-declined per spec rev6 §Default DISABLED, fail-closed verified)
```

## 4. Freshness sweep

> See `kzk-freshness-guard` §Detection Logic — branch-wide stale sweep (getChangedFiles('base') → findStaleMetaDocs → auto-fix dispatch → PASS). Cross-ref: `kzk-freshness-guard` §Six auto-invocation points 'kzk-pre-merge-sync' row.

## 5. Stub sweep

Before merge / milestone commit, scan `git log` for unresolved `STUB:` commit body markers introduced since the branch diverged from `main`:

```bash
git log main..HEAD --format="%H %s%n%b" | grep "STUB:" | head -20
```

- Any line matching `STUB:` → surface to user as "unresolved stub" warning.
- **BLOCK** merge if a `STUB:` entry exists AND the stub's feature area is user-visible (i.e., the stub appears in a component rendered in the happy path).
- **WARN only** (non-blocking) if the stub is in a Phase 2+ code path behind a feature flag or an unused import — note in PR description as `Stub accepted: <description>`.
- For direct-main flow: same check, run against `git log HEAD~5..HEAD` (last 5 commits).

**Convention for introducing stubs** (enforce at commit time):
Commit body must include:
```
STUB: <one-line description>
Unblocked when: <phase or condition>
```

Example:
```
STUB: TopToolbar lock button disabled (Phase 2 wiring).
Unblocked when: useGridLock hook + backend REST endpoint both ready.
```

**Automatic detection hook** (Phase 2+ — not implemented yet):
When `kzk-pre-commit-gate` Gate 1 (ai-slop-cleaner) runs, also grep changed files for `// STUB:` / `{/* STUB:` JSX comment patterns and echo them to stdout as advisory.

**Rationale**: Intentional stubs (disabled features, deferred work) can silently persist through cycle exits unless explicitly tracked. The cycle-exit fresh-agent verifier (per `kzk-autonomous-boundary` §Autonomous completion fresh-agent verifier) runs this sweep to surface unresolved stubs before user-visible release.

## 6. Prod-build user-persona smoke

Trigger: cycle-exit fresh-agent verifier sub-check 1 (G1 + G3).

- **App project**: `npm run build && node dist/main` (NestJS) or `vite preview` (Vite) or project-specific dist serve command. Start the prod-like server; do NOT rely solely on the dev watch process.
- **kzk-harness self**: render `docs/site/skill-flow.html` + `docs/site/skill-flow.ko.html` in a real browser via Playwright MCP, verify fingerprint match (`node .claude/hooks/check-skill-flow-fresh.mjs --status` → FRESH), navigate `docs/site/index.html`.
- **Persona scenario**: read `docs/sot/persona-scenarios.md` if it exists; otherwise infer the first 3 user actions from `CLAUDE.md` or `README.md`.
- Playwright MCP: navigate 3+ pages, one `page.reload({ bypassCache: true })`, full-page screenshot.
- **PASS condition**: 3+ screenshots captured, console errors = 0, network 4xx/5xx = 0.
- Failure → cycle-exit BLOCK continues until resolved.

## 7. SoT alignment

Trigger: cycle-exit fresh-agent verifier sub-check 3 (G5).

- Locate SoT file: try `docs/sot/feature-list.md` → `docs/PRD.md` → README `## Features` section. For kzk-harness self: use `harness-share.md` ↔ `skills/*/SKILL.md` ↔ `docs/site/skill-flow.html` 3-way alignment.
- Cross-ref staged code's new feature symbols vs SoT marker (`wip` / `tbd` / `todo` / `mvp` / `done`).
- CRG `semantic_search_nodes(name=<feature_symbol>)` preferred; grep fallback if CRG unavailable.
- Mismatch items: attempt auto-fix → user confirm before BLOCK is released.

**Verifier dispatch prompt template** (inject when dispatching `oh-my-claudecode:verifier` for cycle-exit):

```text
Role: fresh-agent verifier per kzk-autonomous-boundary §Autonomous completion fresh-agent verifier.

Trigger: cycle-exit hook (check-cycle-exit.mjs) BLOCKED a commit/push.
Marker matched: <CYCLE-EXIT: ... | MILESTONE: ... | STUB-CLEAR: ...>
Cycle scope: <base ref> .. HEAD  (or last N commits if no base ref)
Project context: <app project | kzk-harness self-improvement>

Execute 4 sub-checks. Each FAIL → BLOCK verdict.

1. Prod-build user-persona smoke (§kzk-pre-merge-sync §6)
   - App project: `npm run build` then start prod-mode (`node dist/main` / `vite preview` / project-specific)
   - kzk-harness self: render docs/site/skill-flow.html + .ko.html in real browser via Playwright MCP,
     verify fingerprint match (check-skill-flow-fresh.mjs --status), navigate docs/site/index.html
   - Persona scenario: read docs/sot/persona-scenarios.md if exists, else infer first 3 user actions from CLAUDE.md or README
   - PASS condition: 3+ screenshots, console errors 0, network 4xx/5xx 0

2. Stub sweep (§kzk-pre-merge-sync §5)
   - `git log <base>..HEAD --format='%H %s%n%b' | grep 'STUB:'`
   - `grep -rE '// STUB:|\{/\* STUB:|Phase \d+ 에서 활성화|coming soon|TODO' <src dirs>`
   - Classify: user-visible (BLOCK) vs behind-flag/unused (WARN)

3. SoT alignment (§kzk-pre-merge-sync §7)
   - Locate SoT file: try `docs/sot/feature-list.md` → `docs/PRD.md` → README "## Features" section
   - Cross-ref staged code's new feature symbols vs SoT marker (`wip` / `mvp` / `done`)
   - CRG `semantic_search_nodes(name=<symbol>)` preferred, grep fallback

4. Spec-freeze re-check (§kzk-autonomous-boundary §Mandate)
   - Locate spec: `docs/plans/<date>-*-design.md` referenced in cycle commits
   - For each visual/layout modifier in spec (`Gridly 스타일`, `nice spacing`, `proper hierarchy`,
     `clean look`, `split-pane`, `tab UI`, `responsive layout`):
     - Check: spec has frozen artifact (ASCII wireframe / layout token / approved screenshot / component name)?
     - No → BLOCK with "spec ambiguity: <modifier> needs frozen artifact"
     - Yes → compare to implementation screenshots from sub-check 1
   - Visual diff > threshold → flag

VERDICT format (first line MANDATORY):
  VERDICT: <PASS | BLOCK>

Sub-check outcomes:
  1. Prod-build smoke: <PASS|FAIL — reason>
  2. Stub sweep: <PASS|FAIL — list>
  3. SoT alignment: <PASS|FAIL — list>
  4. Spec-freeze re-check: <PASS|FAIL — list>

Evidence: <paths to screenshots / log excerpts / git refs>
```

## Interaction with other kzk-*

- **kzk-autonomous-boundary**: Defines when autonomous PR creation is allowed (post-review explicit user merge approval is the sole exception). Also see §Autonomous completion fresh-agent verifier — the cycle-exit verifier dispatched per that rule runs this skill's §5 stub sweep, §6 prod-build smoke, and §7 SoT alignment as pre-merge gates.
- **kzk-pre-commit-gate**: Provides the gate-PASS line this skill writes into the PR footer.
- **kzk-spec-and-review**: Pre-PR `deepinit_manifest` refresh updates the AGENTS.md memory that codex review reads.
- **kzk-regression-memory**: This skill's step 3 is the first-enable gate for the regression-recall hook. spec rev6 §Default DISABLED auto-enable entry point. Fail-closed (jq absent / install-global.sh non-zero / duplicate entry → merge block).
- **kzk-freshness-guard**: Full freshness sweep immediately before merge (§4)
- **check-cycle-exit.mjs hook**: When Signal A (gh pr create/merge / git push origin main) or Signal B (MILESTONE: / CYCLE-EXIT: / STUB-CLEAR: commit marker) is detected, the hook BLOCKs and instructs dispatch of the cycle-exit verifier which runs §5/§6/§7 + spec-freeze re-check. See `harness-share.md §3 Gate 6`.
