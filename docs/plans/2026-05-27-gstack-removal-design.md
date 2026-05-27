# 2026-05-27 Spec: gstack Complete Removal + kzk-regression-memory Skill Deletion

> **STATUS: FROZEN** — kzk-spec-and-review §22 Step 3 PASS verdict 2026-05-27 after Cycle 4 codex review (0 BLOCKER, 0 NIT after AC1 polish). All structural decisions are final. Subsequent changes go to §8 amendment table only.

---

## 1. Goal

Remove all gstack dependency from the kzk-harness skill layer and the global Claude Code environment. Delete `kzk-regression-memory` skill entirely (not disable). Ensure `install-global.sh --update --yes` leaves a deterministic, idempotent state for existing users in a single run.

---

## 2. Scope

### A. Global environment (~/.claude/, ~/.gstack/)
- `~/.claude/CLAUDE.md` lines 88-126: delete `# gstack` header + full 32-skill list block
- `~/.claude/skills/gstack/` and 32 sub-skill directories: delete all 33 directories
  - Full list: autoplan, benchmark, canary, careful, codex, cso, design-consultation, design-html, design-shotgun, devex-review, document-release, freeze, gstack-upgrade, guard, health, investigate, land-and-deploy, learn, office-hours, open-gstack-browser, plan-ceo-review, plan-design-review, plan-devex-review, plan-eng-review, plan-tune, qa, qa-only, retro, review, setup-browser-cookies, setup-deploy (+ `gstack/` parent)
- `~/.gstack/` (92KB, 3 project caches): delete entire directory

### B. Repo SoT changes
- `skills/kzk-regression-memory/` — delete entire directory
- `skills/kzk-large-task-delegation/SKILL.md` lines 478-484 — remove regression-recall section
- `skills/kzk-web-loop/SKILL.md` — remove 8 gstack-referencing lines (plugin pre-flight, office-hours alternative, learn call, restart skip rule); replace with inline notes or built-in alternatives
- `harness-share.md` §29 (regression-memory section) — delete entire section; renumber §30→§29, §31→§30, §32→§31, §33→§32 throughout all SKILL.md files and harness-share.md itself
- `CLAUDE.md` (repo) line 25 — remove kzk-regression-memory row from skill table
- `README.md` line 95 — remove kzk-regression-memory row
- Skill count 18 → 17: update in `README.md` line 3, `CLAUDE.md` line 3, install command skill count, all `harness-share.md` occurrences of "18"
- `docs/site/skill-flow.html` + `skill-flow.ko.html` — remove kzk-regression-memory card; run `--regen` fingerprint

### C. Install/Uninstall idempotency
- `install/install-global.sh`:
  - Remove `--regression-recall` flag and all `DO_REGRESSION_RECALL` branches
  - Remove `rr` parameter from `update_hook_manifest` (keep: `keyword_detector`, `fix_scope_trigger`, `freshness_guard`, `docker_compose_gate`)
  - Remove `regression-recall.mjs` copy step from `enable_hooks`
  - Add `cleanup_gstack` function with 4 sub-steps (see §3)
  - Call order in `main()`: `backup_claude_md → cleanup_stray_legacy_catalog → cleanup_gstack → sync_skills → ...`
- `install/uninstall-global.sh`: add equivalent `cleanup_gstack` step (Step U1.6)
- `install/hooks/regression-recall.mjs` — delete file
- `install/bin/kzk-regression-memory.mjs` — delete file
- `install/test/regression-recall.test.mjs` — delete file
- `install/lib/regression-recall*` — delete if present (verify with `find install/lib -name 'regression-recall*'`)

### D. Out-of-scope
- Plugin marketplace uninstall (gstack registration): detection is automated (sub-D WARN), but the uninstall action itself is user-executed (`/plugin uninstall gstack` in a Claude Code session)
- `~/.claude/skills/` directories from non-gstack sources: untouched
- Any other project's `.claude/` or `.omc/` directories

---

## 3. Implementation Order

1. **Delete repo skill files** — `skills/kzk-regression-memory/`, `install/hooks/regression-recall.mjs`, `install/bin/kzk-regression-memory.mjs`, `install/test/regression-recall.test.mjs`, `install/lib/regression-recall*`
2. **Patch harness-share.md** — remove §29, renumber §30-§33 → §29-§32
3. **Grep all cross-refs** — `grep -rnE "§(29|30|31|32|33)" skills/ harness-share.md CLAUDE.md README.md` — update every stale reference to new numbers
4. **Patch SKILL.md files** — kzk-large-task-delegation (regression-recall section), kzk-web-loop (gstack lines)
5. **Patch CLAUDE.md + README.md** — remove skill row, update count 18→17
6. **Patch install-global.sh** — remove regression-recall branches, add `cleanup_gstack` function
7. **Patch uninstall-global.sh** — add `cleanup_gstack` step
8. **Update docs/site HTML** — remove card, regen fingerprint
9. **Run `install/test/run-tests.sh`** — all pass

### cleanup_gstack function (4 sub-steps)

**sub-A** (CLAUDE.md gstack block removal — exact-match anchor, safe):
- Exact prefix anchor: `# gstack\n\nUse the \`/browse\` skill from gstack for all web browsing. Never use \`mcp__claude-in-chrome__*\` tools.\n\nAvailable gstack skills:`
- **Validation range vs deletion range** (clarified):
  - **Validation range** (every line MUST match `^- \`/[a-z][a-z0-9-]*\`$` exactly): from the line *immediately after* the last line of the exact-match preamble anchor, *up to but NOT including* the first blank line. The blank line is the terminator and is **excluded** from validation.
  - **Deletion range** (removed from the file if validation passes): from the first line of the preamble anchor (`^# gstack$`), *through and including* the terminating blank line. Everything inside the gstack block + the trailing separator is removed.
  - If ANY line in the validation range fails the pattern, sub-A aborts with a WARN (`"gstack block contains unexpected content at line N — manual cleanup required"`) and makes no file modification. The guard runs BEFORE any deletion.
- Idempotent: no-op if anchor absent

**sub-B** (skills directory cleanup):
- Iterate explicit whitelist of 33 directory names
- For each: `if [ -d ~/.claude/skills/$dir ]; then rm -rf ...; fi`
- Idempotent: no-op if already removed; report "0 gstack dirs to remove" on second run

**sub-C** (~/.gstack/ removal):
- `if [ -d ~/.gstack ]; then rm -rf ~/.gstack; fi`
- Idempotent: prints "~/.gstack not found, skip" on second run

**sub-D** (marketplace registration detection — read-only):
- Read `~/.claude/plugins/installed_plugins.json` and scan `~/.claude/plugins/marketplaces/` for any entry containing `"gstack"`
- If detected: print high-signal WARN: `"gstack plugin still registered in marketplace. Run \`/plugin uninstall gstack\` in a Claude Code session to fully remove."`
- No destructive action — detection only

---

## 4. Idempotency Contract

- Every cleanup sub-step checks existence before acting; absent targets produce a no-op log line, not an error
- Two consecutive `bash install/install-global.sh --update --yes` runs must produce identical `sha256sum ~/.claude/CLAUDE.md` output
- `~/.gstack/` deletion: second run exits 0 with skip message
- 33-directory cleanup: second run reports "0 gstack dirs to remove"
- Hook manifest: second run produces same manifest file sha

**Conditional manual path**: If a user has edited the `~/.claude/CLAUDE.md` gstack block (added custom comments, reformatted lines, mixed user notes inside the skill list), sub-A intentionally no-ops with a WARN message. AC1 (`grep -c "^# gstack$" == 0`) will fail post-install in that case. This is **documented behavior, not a bug** — the spec prioritizes data preservation over automated removal. The user must manually edit the block, then re-run `install --update --yes` for AC1 to pass.

### Invariants script

`install/test/gstack-removal-invariants.sh` is the single authoritative check script for this spec (written during the execute phase). It:

- Checks AC1–AC14 all invariants in one invocation
- **Pass**: exits 0 and prints `ALL INVARIANTS HOLD`
- **Fail**: exits 1 and lists exactly which AC(s) failed with their observed vs expected values
- Invocation: `bash install/test/gstack-removal-invariants.sh`
- Idempotency proof: run once post-install → PASS; run `bash install/install-global.sh --update --yes` a second time → run the script again → must still PASS (AC14)

---

## 5. Risks

| Risk | Mitigation |
|---|---|
| §29 removal shifts §30-§33 → §29-§32; stale cross-refs break skill routing | Step 3 grep sweep covers all SKILL.md + harness-share.md; spec lists grep command in AC7 |
| gstack plugin still registered in marketplace; `/browse` invocations in chat silently fail | sub-D detects and emits high-signal WARN; uninstall action is user-executed per §2D |
| kzk-web-loop loses `learn` call after gstack removal | SKILL.md patch (Step 4) replaces with inline note or built-in alternative; AC tested via harness test suite |
| `~/.claude/CLAUDE.md` block detection removes user-added content adjacent to gstack section | sub-A uses exact-match anchor + per-line pattern validation; any unexpected line inside the block triggers abort + WARN + no file modification (AC13) |

---

## 6. Acceptance Criteria

| AC | Criterion | Verification command |
|---|---|---|
| AC1 (conditional) | gstack section header absent from `~/.claude/CLAUDE.md` — **precondition**: gstack block in standard (unmodified) format so sub-A completes. If sub-A aborts due to user edits (§4 conditional manual path), AC1 deferred until manual cleanup, then re-evaluated. | `grep -c "^# gstack$" ~/.claude/CLAUDE.md` returns 0 |
| AC2 | All 33 gstack skill dirs removed | See shell block below |
| AC3 | ~/.gstack/ deleted | `test ! -d ~/.gstack` exits 0 |
| AC4 | kzk-regression-memory absent from installed skills | `test ! -d ~/.claude/skills/kzk-regression-memory` exits 0 |
| AC5 | Idempotent double-run | Run `bash install/install-global.sh --update --yes` twice; `sha256sum ~/.claude/CLAUDE.md` identical both times |
| AC6 | Test suite passes | `bash install/test/run-tests.sh` exits 0 |
| AC7 | No `regression-memory`/`regression-recall` tokens in SoT body (post-renumber) | See shell block below |
| AC8 | Skill count updated to 17 everywhere | `grep -E "(18 markdown skills\|18 \`kzk-\|All 18 skills\|18 skills are active)" README.md CLAUDE.md harness-share.md` returns 0 lines |
| AC9 | No `gstack`/`office-hours`/`/learn` tokens outside cleanup files | See shell block below |
| AC10 | Cleanup files use `# GSTACK_INTENT_KEEP` marker convention | Each of the 3 cleanup files (`install-global.sh`, `uninstall-global.sh`, `gstack-removal-invariants.sh`) contains at least one `# GSTACK_INTENT_KEEP` comment on lines that intentionally reference gstack tokens |
| AC11 | No regression-recall files remain in repo | `find install -name 'regression-recall*' \| wc -l` == 0 |
| AC12 | kzk-regression-memory skill dir absent from repo | `test ! -d skills/kzk-regression-memory` exits 0 |
| AC13 | sub-A aborts on unexpected content | Insert artificial non-list line inside gstack block in a test copy; run cleanup_gstack sub-A against it; verify file unchanged and WARN printed |
| AC14 (conditional) | Invariants script passes twice (idempotency proof) — **precondition**: gstack block in `~/.claude/CLAUDE.md` is in standard (unmodified) format so that sub-A completes successfully. If sub-A aborts due to user edits (per §4 conditional manual path), AC14 is deferred until manual cleanup is done, then re-evaluated. | `bash install/test/gstack-removal-invariants.sh` (run twice; both exit 0) |

---

## 7. Verification Commands (run after implementation)

```bash
# AC1 — gstack section header absent from global CLAUDE.md
# Precondition: sub-A must have completed (gstack block unmodified by user); if sub-A aborted, defer AC1 until manual cleanup.
grep -c "^# gstack$" ~/.claude/CLAUDE.md
# Expected: 0

# AC2 — all 33 gstack skill dirs removed
GSTACK_DIRS=(gstack autoplan benchmark canary careful codex cso design-consultation design-html design-shotgun devex-review document-release freeze gstack-upgrade guard health investigate land-and-deploy learn office-hours open-gstack-browser plan-ceo-review plan-design-review plan-devex-review plan-eng-review plan-tune qa qa-only retro review setup-browser-cookies setup-deploy)
count=0
for d in "${GSTACK_DIRS[@]}"; do [ -e ~/.claude/skills/$d ] && count=$((count+1)); done
[ $count -eq 0 ] || { echo "FAIL: $count gstack dirs remain"; exit 1; }
echo "PASS: 0 gstack dirs remain"

# AC3
test ! -d ~/.gstack && echo PASS || echo FAIL

# AC4 — kzk-regression-memory absent from installed skills
test ! -d ~/.claude/skills/kzk-regression-memory && echo PASS || echo FAIL

# AC5 (run twice, compare)
sha256sum ~/.claude/CLAUDE.md

# AC6
bash install/test/run-tests.sh

# AC7 — regression-memory/regression-recall tokens absent from SoT body
grep -rnE "regression[- ]memory|regression-recall" \
  skills/ harness-share.md CLAUDE.md README.md \
  --include='*.md' \
  2>/dev/null | grep -vE "(amendment|Removed|strikethrough|<del>|~~)"
# Expected: 0 lines (all body references removed; amendment/strikethrough context only allowed)

# AC8 — skill-count phrase updated to 17
grep -E "(18 markdown skills|18 \`kzk-|All 18 skills|18 skills are active)" README.md CLAUDE.md harness-share.md
# Expected: 0 lines

# AC9 — gstack tokens absent outside cleanup files
grep -rnE "\bgstack\b|\boffice-hours\b|/learn\b" \
  skills/ install/ docs/site/ harness-share.md CLAUDE.md README.md \
  --include='*.md' --include='*.sh' --include='*.mjs' --include='*.html' \
  --exclude='install-global.sh' \
  --exclude='uninstall-global.sh' \
  --exclude='gstack-removal-invariants.sh' \
  2>/dev/null | grep -vE "(amendment|Removed|out-of-scope|strikethrough|<del>|~~)"
# Expected: 0 lines

# AC10 — cleanup files contain GSTACK_INTENT_KEEP marker
grep -l "# GSTACK_INTENT_KEEP" \
  install/install-global.sh install/uninstall-global.sh install/test/gstack-removal-invariants.sh
# Expected: all 3 files listed

# AC11
find install -name 'regression-recall*' | wc -l
# Expected: 0

# AC12
test ! -d skills/kzk-regression-memory && echo PASS || echo FAIL

# AC13 — sub-A aborts on unexpected content
# (manual test: insert a non-list line in gstack block of a test copy, confirm WARN + no mutation)

# AC14 — invariants script double-PASS
# Precondition: sub-A must complete (gstack block in ~/.claude/CLAUDE.md unmodified by user).
# If sub-A aborted (per §4 conditional manual path), defer until manual cleanup, then re-run.
bash install/test/gstack-removal-invariants.sh
bash install/install-global.sh --update --yes
bash install/test/gstack-removal-invariants.sh
# Both invocations must exit 0 with "ALL INVARIANTS HOLD"
```

---

## 8. Impact on Prior Frozen Specs

Amendment notes are written inline in this spec file (§8 below) — NOT in the prior frozen specs themselves. Format: `**Amended <date>**: <change>` — strikethrough preserves history where applicable. Prior frozen specs remain untouched per harness policy.

The following prior plan files contain skill-count assertions (18) that become stale:

- `docs/plans/2026-05-04-kzk-global-install-design.md` — references skill count; update inline note
- `docs/plans/2026-05-04-kzk-global-install.md` — same
- Any plan asserting `harness-share.md §29` (regression-memory) or `§30-§33` cross-refs

These are **read-only frozen specs** per harness policy. The new number mapping (`§30→§29, §31→§30, §32→§31, §33→§32`) should be logged as an amendment note here, not in those files.

**Section renumber map (post §29 removal):**
| Old | New | Title |
|---|---|---|
| §29 | (removed) | regression-memory |
| §30 | §29 | kzk-freshness-guard |
| §31 | §30 | Brainstorming 자동 체이닝 (kzk-spec-and-review Step -1) |
| §32 | §31 | Code Quality Discipline (DRY/YAGNI/KISS + 모듈 깊이 + 베스트 프랙티스) |
| §33 | §32 | Autonomous-mode Detection SoT |

### Amendment log

| Date | Section | Change | Reason |
|---|---|---|---|
| 2026-05-27 | §7 (AC7, AC9 grep -vE) | broaden to case-insensitive `Removed/removed/cleanup/sunset/deletion` and `GSTACK_INTENT_KEEP` | post-execute discovery: lowercase `removed` in inline cleanup notes false-positives AC9 |

---

## 9. Out-of-Scope

- **Plugin marketplace uninstall**: gstack may remain registered as a Claude Code plugin. `cleanup_gstack` sub-D detects this and emits a WARN; the actual uninstall (`/plugin uninstall gstack`) is a user-executed manual action.
- **Other users' environments**: only the executing user's `~/.claude/` and `~/.gstack/` are touched.
- **gstack source repository**: no actions taken against the upstream gstack repo.
