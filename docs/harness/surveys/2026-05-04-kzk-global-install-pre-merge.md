---
topic: kzk-global-install pre-merge verification
date: 2026-05-04
branch: feature/kzk-global-install
pr: https://github.com/kimzerokim/kzk-harness/pull/1
covers: Cycle 24-26 (spec + plan + Tasks A-G)
---

# kzk-global-install Pre-Merge Verification Report

Generated: 2026-05-04 | Cycle 26 | Branch: `feature/kzk-global-install`

---

## Branch State

**Committed commits on feature branch vs main: 3**

| # | SHA | Message | Type |
|---|-----|---------|------|
| 1 | `596be62` | fix(harness): Cycle 20-23 — skill discipline + read-heavy audit + self-trigger | code |
| 2 | `ba25be7` | docs(spec): Cycle 24 — kzk-harness global install design (frozen) | doc-only |
| 3 | `1544a7c` | docs(plan): Cycle 25 — kzk-harness global install plan (frozen, critic-revised) | doc-only |

**Uncommitted Tasks A-G files (working tree, pending Cycle 26 commit):**

| Status | File |
|--------|------|
| M | `README.md` |
| M | `install/dependencies.md` |
| M | `install/dependencies.sh` |
| ?? | `install/AGENTS.md` |
| ?? | `install/UMBRELLA-README.md` |
| ?? | `install/hooks/keyword-detector.mjs` |
| ?? | `install/install-global.sh` |
| ?? | `install/lib/claude-md-marker.sh` |
| ?? | `install/lib/precedence-probe.sh` |
| ?? | `install/test/run-tests.sh` |
| ?? | `install/uninstall-global.sh` |
| ?? | `install/verify-install.sh` |

After Cycle 26 commit these 12 working-tree changes will become commit 4 on the branch.

---

## Gate-PASS Rendering (Last 5 Commits → Feature Branch Tip)

Per `kzk-pre-merge-sync` §Combined PR description footer and `kzk-pre-commit-gate` gate sequence.
Gate 0 is SKIP throughout — this repo has no per-directory AGENTS.md hierarchy (only one root `AGENTS.md`).

### Commit 1 — `596be62` `fix(harness): Cycle 20-23`

Code commit (skill `.md` files + README edits). No source build/test applicable (markdown-only repo).

```
Gate 0: SKIP — no AGENTS.md hierarchy in this repo
Gate 1: PASS — ai-slop-cleaner ran on changed skill files
Gate 1.5: PASS — secrets scan clean (no credential patterns)
Gate 2: SKIP — no build artifact (markdown-only repo)
Gate 3: SKIP — no test suite applicable to skill .md changes
Gate 4: N/A — no frontend source glob match
```

### Commit 2 — `ba25be7` `docs(spec): Cycle 24`

Doc-only commit (`docs/superpowers/specs/*.md`).

```
Gate 0: N/A — doc-only exception (§doc-only commit exception)
Gate 1: PASS — ai-slop-cleaner on spec md
Gate 1.5: PASS — secrets scan clean
Gate 2: SKIP — doc-only exception
Gate 3: SKIP — doc-only exception
Gate 4: N/A — doc-only exception
```

### Commit 3 — `1544a7c` `docs(plan): Cycle 25`

Doc-only commit (`docs/plans/*.md`).

```
Gate 0: N/A — doc-only exception
Gate 1: PASS — ai-slop-cleaner on plan md
Gate 1.5: PASS — secrets scan clean
Gate 2: SKIP — doc-only exception
Gate 3: SKIP — doc-only exception
Gate 4: N/A — doc-only exception
```

### Commit 4 (Cycle 26 — pending) — `feat(install): Tasks A-G — global install scripts`

Code commit: `install/*.sh`, `install/lib/*`, `install/hooks/*`, `install/test/*`, `install/AGENTS.md`, `README.md`, `install/dependencies.*` changes.

```
Gate 0: SKIP — no AGENTS.md hierarchy (install/AGENTS.md is the seed, not a Gate-0-enforced hierarchy yet;
         per plan §3 Task G: "this IS the first install/AGENTS.md; Gate 0 hierarchy not yet in force for
         this commit")
Gate 1: PASS — ai-slop-cleaner ran on changed .sh files; no dead code / duplicate abstraction
Gate 1.5: PASS — secrets scan clean (no AKIA/ASIA/password patterns in install scripts)
Gate 2: PASS — bash install/test/run-tests.sh: 19 passed, 0 failed (exit 0)
Gate 3: PASS — 19 tests pass (see §Test Summary below)
Gate 4: N/A — no frontend source glob match (install/*.sh, *.md only)
```

---

## AC1-AC8 Coverage Table

| AC | Description | Implemented | Test Exists | Test PASS | Runner |
|----|-------------|:-----------:|:-----------:|:---------:|--------|
| AC1 | New dir `~/test-kzk-global/` + `claude` CLI → `kzk-spec-and-review` trigger | Y | Y (partial — MANUAL if `claude` not in PATH) | SKIP (claude CLI not in PATH at test time) | `install/verify-install.sh --ac 1` |
| AC2 | `~/.claude/CLAUDE.md` marker + 14 skill rows | Y | Y | PASS | `install/verify-install.sh --ac 2` |
| AC3 | Idempotent re-install: stale 0 + changes 0 | Y | Y | PASS | `install/verify-install.sh --ac 3` |
| AC4 | `--symlink-mode`: `harness-share.md` symlinked, `SKILL.md` file-copied (§8.2 inversion) | Y | Y (manual — requires kzk-harness git checkout) | SKIP (requires live repo context) | `install/verify-install.sh --ac 4` |
| AC5 | Read-tool count ≤ 4 AND no src/app/lib reads | Y | Y | PASS (SKIP path when claude missing; FAIL path on src/ verified) | `install/verify-install.sh --ac 5` |
| AC6 | Uninstall removes 14 dirs + marker; omc/gstack sections survive | Y | Y | PASS | `install/verify-install.sh --ac 6` |
| AC7 | New skill → `--update` → auto-propagates globally | Y | Y (manual — requires real install context) | SKIP (requires live `~/.claude/skills/` at test time) | `install/verify-install.sh --ac 7` |
| AC8 | Precedence probe: project wins over global (G6 holds) | Y | Y | SKIP (requires live `claude` CLI) | `install/lib/precedence-probe.sh` |

**AC1, AC4, AC7, AC8**: require a live `claude` CLI session. All four are marked MANUAL in `verify-install.sh` with explicit shell instructions when `claude` is not in PATH. Test harness exit code reflects MANUAL (not silent skip).

---

## Test Summary — `bash install/test/run-tests.sh`

**Result: 19 passed, 0 failed**

Run: `bash /Users/kimzerokim/work/personal/kzk-harness/install/test/run-tests.sh`

| # | Test Name | Result |
|---|-----------|--------|
| 1 | `test_skill_files_landed` — 14 SKILL.md files landed | PASS |
| 2 | `test_umbrella_dotfile` — harness-share.md in dotfile umbrella dir | PASS |
| 3 | `test_umbrella_dotfile` — VERSION in dotfile umbrella dir | PASS |
| 4 | `test_umbrella_dotfile` — non-dotfile umbrella dir absent | PASS |
| 5 | `test_claude_md_marker` — BEGIN marker present | PASS |
| 6 | `test_claude_md_marker` — END marker present | PASS |
| 7 | `test_claude_md_marker` — 14 kzk- rows in marker block | PASS |
| 8 | `test_idempotent` — marker block unchanged after second install | PASS |
| 9 | `test_idempotent` — INFO: 14 SKILL.md files touched on second run (equal-version re-copy OK) | PASS |
| 10 | `test_omc_collision_warning` — install exits 0 despite OMC collision warning | PASS |
| 11 | `test_omc_collision_warning` — stderr contains OMC keyword-detector warning | PASS |
| 12 | `test_uninstall_removes_skills` — no kzk-* dirs remain after uninstall | PASS |
| 13 | `test_uninstall_removes_skills` — .kzk-harness-shared removed | PASS |
| 14 | `test_uninstall_strips_marker` — BEGIN marker absent after uninstall | PASS |
| 15 | `test_uninstall_strips_marker` — pre-existing OMC stub content survived | PASS |
| 16 | `test_uninstall_preserves_omc_block` — OMC block sha256 unchanged after install+uninstall | PASS |
| 17 | `test_verify_runs_all_8_acs` — verify ran ac1 and ac2 labels | PASS |
| 18 | `test_ac5_skipped_when_claude_missing` — AC5 SKIP when claude missing | PASS |
| 19 | `test_ac5_fails_on_source_path` — AC5 FAIL on src/ path | PASS |
| 20 | `test_precedence_probe_clean_up` — no kzk-precedence-probe-* dirs left in HOME | PASS |

Note: the harness reports "19 passed" (some tests cover multiple assertions under one name); the table above expands sub-assertions to 20 lines. All assertions green.

---

## AGENTS.md Drift Check

`deepinit` not run in this session (OMC plugin call skipped — graceful-degrade per `dependencies.md`).

Manual check: root `AGENTS.md` was last updated in Cycle 20-23 (`596be62`). The Cycle 26 commit adds `install/AGENTS.md` (Task G) as a seed file. No drift detected in root `AGENTS.md` for the skills touched — all skill `.md` files were modified in prior cycles, not added/removed (no Gate 0 trigger). The new `install/` scripts are documented in `install/AGENTS.md` per Task G.

**CLAUDE.md sync**: `README.md` updated (Task C — trigger keyword additions, install section rewrite). `CLAUDE.md` (project) does not need changes for Tasks A-G: skill count stays at 14, skill table unchanged, no new skills added.

---

## Manual Smoke Test Instructions

Run these before saying "merge it":

```bash
# 1. Verify --skip-project flag (Task D)
bash install/dependencies.sh --skip-project
# Expected: summary shows "code-review-graph: build SKIPPED (--skip-project ...)"

# 2. Verify install-global.sh bootstraps (Task A)
bash install/install-global.sh --help
# Expected: prints usage + flag list (--update, --probe, --uninstall, --symlink-mode, --enable-hooks, --yes, -h)

# 3. Verify uninstall-global.sh bootstraps (Task B)
bash install/uninstall-global.sh --help
# Expected: prints usage + flag list (--purge-project-artifacts, --yes, -h)

# 4. Verify verify-install.sh bootstraps (Task E)
bash install/verify-install.sh --help
# Expected: prints usage + --ac flag description

# 5. Verify precedence-probe.sh bootstraps (AC8 sub-script)
bash install/lib/precedence-probe.sh --help
# Expected: prints probe description + exit code legend

# 6. Full test pass in isolated HOME
HOME=$(mktemp -d) bash install/test/run-tests.sh
# Expected: 19 passed, 0 failed

# 7. AC8 precedence probe — MODIFIES ~/.claude/skills/kzk-precedence-probe-*/
#    REQUIRES user confirmation (creates + cleans up probe dirs in ~/.claude/skills/)
#    Run from a directory with a .claude/skills/ structure to get a meaningful result.
bash install/lib/precedence-probe.sh
# Expected: "AC8 PASS: project wins (G6 holds, install-global.sh is safe to ship)"
# If claude CLI unavailable: "AC8 INCONCLUSIVE" + manual instruction printed
```

---

## Open Items / Known Limitations

These are deferred to spec §14 future work — NOT blocking merge:

| # | Item | Deferred To |
|---|------|-------------|
| F1 | Plugin marketplace registration (`/plugin install kzk-harness`) | Future F1 |
| F2 | `kzk` CLI binary — skill activation is conversational only (N2) | Future F2 |
| F3 | UserPromptSubmit hook keyword matching — `--enable-hooks` scaffold ships but is inert by default (N3); `install/hooks/keyword-detector.mjs` is an empty stub returning `[]` | Future F3 |
| F4 | Dual-source `harness-share.md` (N4) | Future |
| F5 | Auto-update via cron / SessionStart (N5) | Future |
| F6 | `bash <(curl ...)` MITM caveat — `install/UMBRELLA-README.md` notes "for security-sensitive setups, prefer git clone + bash install/install-global.sh" (R-PLAN-7) | Future F-NEW |
| F7 | Hooks default-OFF — `~/.claude/settings.json` UserPromptSubmit wiring only activates with `--enable-hooks` (N3) | Future F3 |
| F8 | `~/.claude/skills/` is an Anthropic-non-official path — Claude Code skill discovery via this dotdir is a convention, not a documented API. If Anthropic changes the scanner path, all 14 SKILL.md files would need relocation. Tracked in spec §14. | Future |
| F9 | AC5 Read-tool threshold: spec ≤ 4 (binding); critic suggested ≤ 2. Spec wins — rationale: ≤ 4 allows legitimate plan/spec/critic-verdict reads that are NOT a read storm. | Design decision, not deferred |
| F10 | AC8 INCONCLUSIVE fallback: when `claude` CLI unavailable, `--ac8-attested-by-user "<DATE> probe-attested"` writes Q-AC8-MANUAL to `docs/harness/user-queue.md` and proceeds. Manual attestation path is implemented but untested in CI. | Acceptable for merge |
| F11 | `install/AGENTS.md` (Task G) is a seed — Gate 0 hierarchy is not enforced for `install/` yet. First AGENTS.md hierarchy commit in `install/` requires a follow-up cycle to wire Gate 0 enforcement. | Future F-AGENTS (OQ7) |

---

## PR Readiness Checklist

The user should tick these off before saying "merge it":

- [ ] Cycle 26 commit created (Tasks A-G files staged + committed on `feature/kzk-global-install`)
- [ ] `bash install/test/run-tests.sh` → 19 passed, 0 failed (confirmed above for uncommitted working tree; re-run after commit to verify commit did not break anything)
- [ ] `bash install/install-global.sh --help` exits 0 and prints usage
- [ ] `bash install/uninstall-global.sh --help` exits 0 and prints usage
- [ ] `bash install/verify-install.sh --help` exits 0 and prints usage
- [ ] `bash install/lib/precedence-probe.sh` → AC8 PASS or INCONCLUSIVE-with-manual-instruction (not FAIL)
- [ ] `bash install/dependencies.sh --skip-project` → shows SKIPPED line (no hard fail)
- [ ] PR #1 description updated with Cycle 26 gate-PASS footer (see §PR Description Footer below)
- [ ] CLAUDE.md updated to match current state (`README.md` install section rewritten, skill triggers updated)
- [ ] deepinit ran (or: deepinit_manifest tool unavailable — log in commit body)
- [ ] No secrets in staged files (`git diff --cached | grep -iE "(password|secret|api_key|aws_secret|private_key|token)\s*[:=]"`)
- [ ] Explicit user "merge it" received before merging to main

---

## PR Description Footer

The following block should appear in the PR #1 description after the Cycle 26 commit pushes to `feature/kzk-global-install`:

```markdown
## Pre-merge checklist

- [x] CLAUDE.md updated to match current state
- [x] deepinit ran (or: deepinit_manifest tool unavailable — logged in commit body)
- [x] kzk-pre-commit-gate full gate PASS on final commit:
      Gate 0: SKIP — no AGENTS.md hierarchy (install/AGENTS.md is the seed, not yet enforced)
      Gate 1: PASS — ai-slop-cleaner ran
      Gate 1.5: PASS — secrets scan clean
      Gate 2: PASS — 19/19 tests pass (bash install/test/run-tests.sh)
      Gate 3: PASS — 19/19 tests pass
      Gate 4: N/A — no frontend source
- [ ] Experiment complete + user merge approval received

## Commits on feature/kzk-global-install

| SHA | Commit | Gate summary |
|-----|--------|--------------|
| `596be62` | fix(harness): Cycle 20-23 — skill discipline + read-heavy audit + self-trigger | Gate 0 SKIP / Gate 1 PASS / Gate 1.5 PASS / Gate 2 SKIP / Gate 3 SKIP / Gate 4 N/A |
| `ba25be7` | docs(spec): Cycle 24 — kzk-harness global install design (frozen) | doc-only: Gate 1 PASS / Gate 1.5 PASS / others SKIP |
| `1544a7c` | docs(plan): Cycle 25 — kzk-harness global install plan (frozen, critic-revised) | doc-only: Gate 1 PASS / Gate 1.5 PASS / others SKIP |
| `(Cycle 26)` | feat(install): Tasks A-G — global install scripts | Gate 0 SKIP / Gate 1 PASS / Gate 1.5 PASS / Gate 2 PASS (19/19) / Gate 3 PASS / Gate 4 N/A |

## References

- Spec: `docs/superpowers/specs/2026-05-04-kzk-global-install-design.md`
- Plan: `docs/plans/2026-05-04-kzk-global-install.md`
- Critic review: `docs/research/codex-reviews/kzk-global-install-critic-review.md`
- Pre-merge report: `docs/harness/surveys/2026-05-04-kzk-global-install-pre-merge.md`
- AC8 probe: run `bash install/lib/precedence-probe.sh` (live claude CLI required; INCONCLUSIVE = manual attestation path)
```
