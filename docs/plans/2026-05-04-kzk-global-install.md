---
plan: kzk-global-install
status: frozen
authors: planner-opus
date: 2026-05-04
spec: docs/plans/2026-05-04-kzk-global-install-design.md
verdict: docs/research/codex-reviews/kzk-global-install-critic-review.md
related_branch: feature/kzk-global-install
---

# kzk-harness Global Install — Implementation Plan

## 1. Background

This plan implements the frozen design at `docs/plans/2026-05-04-kzk-global-install-design.md` (revision tag `codex-timeout-critic-opus-fallback-applied`, frozen 2026-05-04). Critic-opus review at `docs/research/codex-reviews/kzk-global-install-critic-review.md` was reconciled into the spec — every must-fix #1/#2/#3 + nice-to-have #1/#2/#3 surfaced by critic is already present in the spec text we are implementing here:

- §6.1 umbrella → dotfile (`~/.claude/skills/.kzk-harness-shared/`) so Claude scanner ignores it (must-fix #1)
- AC8 precedence probe added (must-fix #2)
- §10 row 1 chain corrected to `kzk-codebase-survey → kzk-large-task-delegation §Read-heavy audit` (must-fix #3)
- AC5 made verifiable via `claude --output-format json | jq` Read-tool count (nice-to-have #1)
- OMC `keyword-detector.mjs` collision check added as install Step 5.5 (nice-to-have #2)
- §8.2 symlink-mode inverted: symlink ONLY `harness-share.md`, file-copy SKILL.md files (nice-to-have #3)

The plan does **not** re-litigate any of those items. Tasks below assume the spec's revisions are the contract.

This plan was authored on `feature/kzk-global-install` (the branch declared in the frontmatter). Per `kzk-autonomous-boundary` and `kzk-large-task-delegation §Subagent prompt requirements`, every executor dispatch in this plan MUST verify the branch via `git branch --show-current` before any write.

## 2. Constraint summary (G1–G6 + N1–N5 verbatim from spec §2 + §3)

### Goals (must hold across every task)

- **G1** — Global install: kzk-* auto-loads in any repo from `~/.claude/skills/`.
- **G2** — Project artifacts (`harness-flow-progress.md`, `docs/harness/`, `.web-loop/`, `.omc/`, `docs/research/codex-reviews/`) stay under `$PWD`. No global skill ever writes outside `~/.claude/skills/kzk-*` or `~/.claude/skills/.kzk-harness-shared/` or the BEGIN/END marker block of `~/.claude/CLAUDE.md`.
- **G3** — Trigger accuracy at gstack/superpowers/omc parity. Achieved by SKILL.md description matching alone (no UserPromptSubmit hook by default — see N3).
- **G4** — Self-trigger matrix from spec §10 lands verbatim in the global `~/.claude/CLAUDE.md` routing block, 1:1 with the `## Self-Improvement Loop` table in this repo's local `CLAUDE.md`.
- **G5** — Idempotent install / update / uninstall. Re-running install with no source change must `git diff --stat` to 0 bytes against `~/.claude/skills/kzk-*` and produce a 0-line diff against the marker block of `~/.claude/CLAUDE.md`. Uninstall removes only the kzk marker block + 14 dirs + umbrella; omc / gstack sections of `~/.claude/CLAUDE.md` survive byte-for-byte.
- **G6** — Per-project install backward compat: existing `<proj>/.claude/skills/kzk-*` dirs continue to work and (per AC8 probe outcome) win over the global copy.

### Non-goals (never expand scope into these — defer to spec §14 future work)

- **N1** — Plugin marketplace registration (`/plugin install kzk-harness`). Out of scope; future F1.
- **N2** — A `kzk` CLI binary. Skill activation is conversational only.
- **N3** — UserPromptSubmit hook keyword matching. Default OFF; the hook scaffold ships in Task A but stays inert unless the user passes `--enable-hooks`. F3 future work.
- **N4** — Dual-source `harness-share.md` (one global + one project-local copy). Single global source only.
- **N5** — Auto-update via cron / SessionStart. User must manually invoke `--update`.

## 3. Task list

Six tasks, A through F. Each is one sonnet executor dispatch unless explicitly marked otherwise. Per `kzk-large-task-delegation §Sonnet executor — extra plan-detail requirements`, every task lists exact paths, function signatures, edge cases, test names + assertion shape, lint rules, and DO-NOT deltas.

A note on AGENTS.md row text — required by `kzk-pre-commit-gate` Gate 0 if and only if the touched directory has an AGENTS.md hierarchy. **This repo does not have a per-directory AGENTS.md hierarchy** (verified: only one AGENTS.md at repo root, no nested AGENTS.md in `install/`, `skills/`, `docs/`). Each task therefore documents an **AGENTS.md SKIP** with the `kzk-pre-commit-gate` gate-0-not-applicable rationale. Executor MUST echo this in the commit body so the gate marker downstream is unambiguous.

### Task A — `install/install-global.sh` (the entrypoint)

**Branch**: `feature/kzk-global-install` (verify pre-write).
**Files created**:
- `install/install-global.sh` (new, executable, `#!/usr/bin/env bash`).
- `install/lib/claude-md-marker.sh` (new helper sourced by install-global + uninstall-global; idempotent BEGIN/END marker editor).

**Files modified**:
- `install/dependencies.sh` — add `--skip-project` flag handling (D4 — see Task D for the actual edit; Task A only consumes the new flag, does not introduce it).

**Top-of-file shebang + flags**:

```bash
#!/usr/bin/env bash
# kzk-harness global install entrypoint.
# Authoritative spec: docs/plans/2026-05-04-kzk-global-install-design.md
# Authoritative plan: docs/plans/2026-05-04-kzk-global-install.md
#
# Flags:
#   --update          Re-sync from the source repo. Same as fresh install
#                     except per-skill version-aware overwrite + harness-share
#                     forced overwrite + marker block replaced.
#   --probe           Run the AC8 precedence probe (see Task E).
#                     Exits 0 if project-wins (G6 holds), 1 if global-wins
#                     (BREAKS spec §8.1 — must abort install).
#   --uninstall       Reverse Task A (delegates to install/uninstall-global.sh).
#   --symlink-mode    §8.2 dev mode: file-copy SKILL.md (frozen-to-main),
#                     symlink ONLY harness-share.md from <repo>/harness-share.md
#                     to ~/.claude/skills/.kzk-harness-shared/harness-share.md.
#                     Refuses to run unless invoked from a kzk-harness git repo
#                     (test: `git config --get remote.origin.url` matches
#                     /(github.com[/:]kimzerokim/kzk-harness)/).
#   --enable-hooks    Install ~/.claude/skills/.kzk-harness-shared/hooks/
#                     keyword-detector.mjs scaffold + register UserPromptSubmit
#                     in ~/.claude/settings.json. Default OFF (N3). The
#                     scaffold file ships always; this flag is the only thing
#                     that wires it into settings.json.
#   --yes             Skip the "preview marker replacement, proceed?" prompt
#                     (still emits the diff to stdout). Ralph cycles use this.
#   --ac8-attested-by-user "<DATE> probe-attested"
#                     Manual attestation when AC8 cannot run (CI sandbox /
#                     `claude` not in PATH). Writes Q-AC8-MANUAL to
#                     docs/harness/user-queue.md and proceeds. Requires
#                     literal date-string match (prevents silent fallthrough).
#   -h | --help       Print usage and exit 0.
set -u
set -o pipefail
umask 077
```

`set -e` is intentionally NOT set — the install is best-effort across many sub-steps and the script must surface a Summary even on partial failure (mirrors `dependencies.sh` which uses `set -u` only).

**9 steps from spec §7.2** — implemented as bash functions, executed in order in `main()`:

```bash
# Step 1 — Pre-flight
preflight() {
  # Inputs: $HOME
  # Outputs: 0 (ok) | exit 2 (CLAUDE.md write blocked, e.g., not writable)
  # Behavior:
  #   - Ensure ~/.claude/skills/ exists (mkdir -p, mode 0700)
  #   - Touch ~/.claude/CLAUDE.md if missing (mode 0600)
  #   - Verify ~/.claude/CLAUDE.md is writable; if not, exit 2 with message
  #     "~/.claude/CLAUDE.md is read-only — fix permissions before install"
  #   - Detect SOURCE_REPO_DIR = git toplevel of the script's own location
  #     (script may be sourced from /tmp clone or from a permanent checkout).
  #     If not a git repo OR not a kzk-harness repo, exit 1 with
  #     "install-global.sh must run from a kzk-harness git checkout".
}

# Step 2 — Backup
backup_claude_md() {
  # Inputs: $HOME, current epoch
  # Outputs: BACKUP_PATH (echoed to caller)
  # Behavior: cp ~/.claude/CLAUDE.md ~/.claude/CLAUDE.md.kzk-bak-$(date +%Y%m%d-%H%M%S)
  # Edge case: backup file already exists for this second-resolution timestamp.
  #   Mitigation: append a 3-digit counter (kzk-bak-20260504-132655.001).
  # Edge case: ~/.claude/CLAUDE.md does not exist (fresh user).
  #   Mitigation: skip backup, log "no existing CLAUDE.md to back up".
}

# Step 3 — Skill sync
sync_skills() {
  # Inputs: SOURCE_REPO_DIR, $HOME
  # Behavior: for each $SOURCE_REPO_DIR/skills/kzk-*:
  #   - target = ~/.claude/skills/<basename>/
  #   - mkdir -p target
  #   - read src_version = grep -m1 '^version:' source/SKILL.md | awk '{print $2}'
  #   - read tgt_version = grep -m1 '^version:' target/SKILL.md | awk '{print $2}' (default 0.0.0 if missing)
  #   - VERSION compare via `printf '%s\n%s\n' "$tgt_version" "$src_version" | sort -V | tail -1`
  #     → if src_version is greater OR target SKILL.md missing: cp src/SKILL.md target/
  #     → if tgt_version is HIGHER (locally bumped): preserve, log "skipped <name> — local v<X> > source v<Y>"
  #     → equal: cp anyway (handles non-version frontmatter changes — same rule as current README install)
  #   - Copy any auxiliary files in source skill dir (currently none, but future-safe)
  # Edge case: SKILL.md has no version frontmatter → treat as 0.0.0 (forces overwrite).
  # Edge case: target dir contains a non-SKILL.md file the user added → leave it untouched (do NOT rm -rf).
  # Edge case: --symlink-mode flag → still file-copy SKILL.md (per §8.2 inversion).
  #   Only harness-share.md gets symlinked; the dev gesture for SKILL.md change is `--update` after commit.
}

# Step 4 — Umbrella sync
sync_umbrella() {
  # Inputs: SOURCE_REPO_DIR, $HOME
  # Behavior:
  #   - mkdir -p ~/.claude/skills/.kzk-harness-shared (note dotfile name — Claude scanner ignores)
  #   - cp $SOURCE_REPO_DIR/harness-share.md ~/.claude/skills/.kzk-harness-shared/ (always overwrite)
  #     OR ln -sfn $SOURCE_REPO_DIR/harness-share.md if --symlink-mode
  #   - Compute VERSION = `git -C $SOURCE_REPO_DIR describe --tags --always --dirty 2>/dev/null || date +%Y-%m-%d-cycle-unknown`
  #     → write to ~/.claude/skills/.kzk-harness-shared/VERSION
  #   - cp $SOURCE_REPO_DIR/install/UMBRELLA-README.md → ~/.claude/skills/.kzk-harness-shared/README.md
  #     (the umbrella README is a NEW file Task A authors — see "Files created" below)
  # Edge case: --symlink-mode + symlink target is a non-symlink → unlink + relink.
}

# Step 5 — CLAUDE.md routing block
update_claude_md_routing() {
  # Inputs: $HOME, $SOURCE_REPO_DIR/skills/, $SOURCE_REPO_DIR/harness-share.md
  # Behavior:
  #   - Source install/lib/claude-md-marker.sh
  #   - Build the routing block content: H2 + version line + 14-row table +
  #     self-trigger matrix copied verbatim from $SOURCE_REPO_DIR/CLAUDE.md
  #     "## Self-Improvement Loop" subsection (for §10 G4 1:1 alignment)
  #   - Wrap in <!-- BEGIN kzk-harness skills --> ... <!-- END kzk-harness skills -->
  #   - If markers absent in CLAUDE.md → append after the first H1 (or to EOF if no H1)
  #   - If markers present → replace the slice between them (idempotent)
  #   - Diff the new vs old slice via `diff -u`. If non-empty AND --yes not passed:
  #     prompt "Replace this region of ~/.claude/CLAUDE.md? (y/N)". Abort with exit 3 on N.
  # Idempotent edge case: re-running with no source change → diff empty → no write.
  # Edge case: malformed marker (BEGIN present, END missing) → exit 2 with
  #   "marker corruption — restore from ~/.claude/CLAUDE.md.kzk-bak-* manually".
  # Concurrency: spec critic flagged a flock concern but downgraded it to P2.
  #   We acknowledge by adding `flock -n /tmp/kzk-install-global.lock` around
  #   the read-modify-write sequence; on lock fail, exit 2 with
  #   "another install-global.sh is running — wait or rm /tmp/kzk-install-global.lock".
}

# Step 5.5 — OMC keyword-detector collision check (nice-to-have #2 from critic)
omc_collision_check() {
  # Inputs: $HOME
  # Behavior:
  #   - Search for ~/.claude/plugins/cache/*/oh-my-claudecode/*/scripts/keyword-detector.mjs
  #     using `compgen -G` or shell glob (NOT `find /` — performance)
  #   - For each match, grep for the kzk-trigger regex:
  #       grep -nE '\\b(ralph|autopilot|ulw|ccg)\\b' "$f"
  #   - If matches found, emit to STDERR (not stdout — non-blocking warning):
  #       "WARNING: OMC keyword-detector intercepts 'ralph' before SKILL.md
  #        matching → kzk-autonomous-boundary may not activate via the bare
  #        keyword. Use the disambiguator phrases 'ralph로 체크' / 'ralph로
  #        확인' which are already in the SKILL.md description (v1.0.12+).
  #        Confirm by triggering in a fresh session."
  #   - Do NOT block install — the user can install OMC later and the
  #     warning re-fires on `--update`. Track in summary as "OMC collision
  #     warning EMITTED".
  # Edge case: OMC plugin not installed → silent skip.
  # Edge case: keyword-detector.mjs exists but does not contain 'ralph'
  #   (future OMC version drops the keyword) → silent skip.
}

# Step 6 — Stale skill cleanup
cleanup_stale_skills() {
  # Inputs: SOURCE_REPO_DIR/skills/, $HOME
  # Behavior:
  #   - List ~/.claude/skills/kzk-* dirs
  #   - For each, if basename not in $SOURCE_REPO_DIR/skills/ → mark stale
  #   - If any stale found, print the list and prompt
  #     "These globally-installed kzk-* skills are no longer in source
  #      (renamed or removed): <list>. Delete? (y/N)"
  #   - On y → rm -rf each stale dir. On N → leave + log.
  #   - --yes flag → auto-yes (rm without prompt) since ralph cycle re-runs install.
  # Edge case: stale dir is a symlink (from --symlink-mode) → rm the symlink only,
  #   NOT the target.
}

# Step 7 — Dependencies
run_dependencies() {
  # Inputs: SOURCE_REPO_DIR
  # Behavior: bash $SOURCE_REPO_DIR/install/dependencies.sh --skip-project
  #   (--skip-project is the new flag added in Task D — Task A is the consumer)
  # Edge case: dependencies.sh exits non-zero → log "dependencies install
  #   reported failures — see /tmp/kzk-crg-*.log /tmp/kzk-codex-*.log",
  #   continue (do NOT abort install — graceful-degrade per spec §11 R4).
}

# Step 8 — Verification
verify_install() {
  # Inputs: $HOME
  # Behavior:
  #   - Assert all 14 ~/.claude/skills/kzk-*/SKILL.md exist (count == 14)
  #   - Assert ~/.claude/skills/.kzk-harness-shared/harness-share.md exists
  #   - Assert ~/.claude/skills/.kzk-harness-shared/VERSION exists and is non-empty
  #   - Grep ~/.claude/CLAUDE.md for both BEGIN and END markers
  #   - Assert `### Self-trigger matrix` header present inside the markers (table removed 2026-05-27, see design AC2 amendment)
  # On any assertion fail → exit 1 with the specific failure line.
  # On all-pass → log "all 14 skills + umbrella + CLAUDE.md marker verified".
}

# Step 9 — Summary print
print_summary() {
  # Inputs: collected SUMMARY array (mirrors dependencies.sh pattern)
  # Behavior: print install location, version tag, next steps:
  #   "Trigger 'spec 잡자' or 'codebase survey' in a fresh Claude session
  #    inside any repo to verify the global install activates. If a kzk-*
  #    skill is not cited within the first response, see
  #    ~/.claude/skills/.kzk-harness-shared/README.md troubleshooting."
}
```

**Public flow (`main()`):**

```bash
main() {
  parse_flags "$@"
  if [ "$DO_PROBE" = 1 ]; then run_precedence_probe; exit $?; fi
  if [ "$DO_UNINSTALL" = 1 ]; then exec bash "$SOURCE_REPO_DIR/install/uninstall-global.sh" "${REMAINING_FLAGS[@]}"; fi

  preflight
  BACKUP_PATH=$(backup_claude_md)
  sync_skills
  sync_umbrella
  update_claude_md_routing
  omc_collision_check       # Step 5.5 — emits warning, never blocks
  cleanup_stale_skills
  run_dependencies
  verify_install
  if [ "$ENABLE_HOOKS" = 1 ]; then enable_hooks; fi  # N3 opt-in
  print_summary
}
```

**Helper file `install/lib/claude-md-marker.sh`** (sourced — not standalone):

```bash
# Pure functions for idempotent BEGIN/END marker editing.
# No global state. All state passed by reference via stdin/stdout strings.

readonly KZK_MARKER_BEGIN='<!-- BEGIN kzk-harness skills -->'
readonly KZK_MARKER_END='<!-- END kzk-harness skills -->'

# claude_md_extract_block <file> → stdout: contents between markers (empty if absent)
claude_md_extract_block() {
  # $1 = ~/.claude/CLAUDE.md path; stdout = block content between markers (exclusive)
  awk -v b="$KZK_MARKER_BEGIN" -v e="$KZK_MARKER_END" '$0==b{f=1;next} $0==e{f=0;next} f' "$1"
}

# claude_md_strip_block <file> <dest> → removes marker block (inclusive) from $1, writes to $2
claude_md_strip_block() {
  # $1 = source path, $2 = dest path; removes marker block (inclusive)
  awk -v b="$KZK_MARKER_BEGIN" -v e="$KZK_MARKER_END" '
    $0==b{skip=1;next}
    $0==e{skip=0;next}
    !skip{print}
  ' "$1" > "$2"
}

# claude_md_inject_block <file> <new-block-content-file> <dest> → 0 ok, 1 on malformed marker
# Behavior: replace existing block in-place; if absent, inject after first H1.
# Atomic: writes to mktemp + mv (atomic-rename).
claude_md_inject_block() {
  # $1 = source CLAUDE.md (markers stripped), $2 = new block content file, $3 = dest path
  # Append marker-wrapped block to $1; atomic via mktemp + mv
  local tmp; tmp=$(mktemp)
  cat "$1" > "$tmp"
  printf '\n%s\n' "$KZK_MARKER_BEGIN" >> "$tmp"
  cat "$2" >> "$tmp"
  printf '%s\n' "$KZK_MARKER_END" >> "$tmp"
  mv "$tmp" "$3"
}

# enable_hooks — wire keyword-detector.mjs into ~/.claude/settings.json (N3 opt-in)
enable_hooks() {
  # $1 = $SOURCE_REPO_DIR (script source location)
  local src="$1"
  mkdir -p "$HOME/.claude/skills/.kzk-harness-shared/hooks"
  cp "$src/install/hooks/keyword-detector.mjs" "$HOME/.claude/skills/.kzk-harness-shared/hooks/"
  local settings="$HOME/.claude/settings.json"
  local tmp; tmp=$(mktemp)
  jq --arg cmd "node $HOME/.claude/skills/.kzk-harness-shared/hooks/keyword-detector.mjs" '
    .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
  ' "$settings" > "$tmp" && mv "$tmp" "$settings"
}
```

**Files created (new — Task A authors all):**

- `install/install-global.sh` — entrypoint, ~250 lines.
- `install/lib/claude-md-marker.sh` — ~80 lines, sourced.
- `install/UMBRELLA-README.md` — ~60 lines, copied to `~/.claude/skills/.kzk-harness-shared/README.md` during install. Contains: install location, uninstall command, troubleshooting (where to look if a skill does not trigger), pointer back to the GitHub repo.
- `install/hooks/keyword-detector.mjs` — scaffold for N3 opt-in. **Empty stub** — exports a `detect()` function that returns `[]` (no triggers). Body is documented in spec §7.5 as "future work F3"; this file ships only so `--enable-hooks` has something to register. DO NOT implement actual keyword matching in this task — out of scope (N3).

**Test framework**: Use `bats-core` if installed, otherwise pure-bash test harness with `assert_eq` / `assert_match` helpers in `install/test/lib/assert.bash`. The plan expects executor to **detect** which is available via `command -v bats` and write tests in whichever shape works. Tests live in `install/test/test_install_global.bats` (or `.sh`).

**Tests (5 — written into `install/test/test_install_global.bats`):**

1. `test_skill_files_landed`:
   - **Setup**: create a tempdir HOME via `export HOME=$(mktemp -d)`. Run `bash install/install-global.sh --yes`.
   - **Assertion**: `find $HOME/.claude/skills -maxdepth 2 -name 'SKILL.md' -path '*/kzk-*/*' | wc -l` equals 14.
2. `test_umbrella_dotfile`:
   - **Assertion**: `[ -f $HOME/.claude/skills/.kzk-harness-shared/harness-share.md ]` AND `[ -f $HOME/.claude/skills/.kzk-harness-shared/VERSION ]`.
3. `test_claude_md_marker`:
   - **Assertion**: `grep -q '<!-- BEGIN kzk-harness skills -->' $HOME/.claude/CLAUDE.md` AND `grep -q '<!-- END kzk-harness skills -->' $HOME/.claude/CLAUDE.md`. Then `awk '/<!-- BEGIN kzk-harness skills -->/,/<!-- END kzk-harness skills -->/' $HOME/.claude/CLAUDE.md | grep -cE '^\| kzk-'` equals 14.
4. `test_idempotent`:
   - **Setup**: run install twice in a row in a clean HOME. After second run, `diff <(awk '/<!-- BEGIN/,/<!-- END/' $HOME/.claude/CLAUDE.md) <previously-snapshotted slice from first run>` must be empty. Also: `find $HOME/.claude/skills -name 'kzk-*' -newer /tmp/kzk-install-marker -type f` returns empty after the second run (where `/tmp/kzk-install-marker` was `touch`-ed between runs).
5. `test_omc_collision_warning`:
   - **Setup**: `mkdir -p $HOME/.claude/plugins/cache/omc-fake/oh-my-claudecode/0.0.0/scripts/` and write a fake `keyword-detector.mjs` containing the literal string `\bralph\b`. Run install with stderr captured.
   - **Assertion**: stderr contains the substring `OMC keyword-detector intercepts 'ralph'`. AND install exit code is 0 (warning, not blocker).

**Lint / format rules:**
- `shellcheck install/install-global.sh install/lib/claude-md-marker.sh install/UMBRELLA-README.md install/hooks/keyword-detector.mjs` — wait, shellcheck is shell-only; markdown + JS skip. Apply `shellcheck` to `.sh` files only.
- `shfmt -w -i 2 -ci install/install-global.sh install/lib/claude-md-marker.sh` — 2-space indent, switch-case indent.
- `markdownlint install/UMBRELLA-README.md` — disable MD013 (line length).
- For the JS scaffold: `node --check install/hooks/keyword-detector.mjs` only (no `eslint` config in this repo — too heavy for a 5-line stub).

**Edge cases enumerated:**
- Multiple kzk-harness checkouts on disk → script uses ITS OWN script-dir as SOURCE_REPO_DIR (Step 1 preflight).
- User has `~/.claude/CLAUDE.md` ending without trailing newline → marker injection adds one.
- User has another tool's BEGIN/END marker pattern (e.g., `<!-- BEGIN something-else -->`) — kzk markers are namespaced (`kzk-harness skills`) so they cannot collide.
- User's `~/.claude/CLAUDE.md` is a symlink → script follows the symlink, writes to the canonical file (preserve symlink semantics).
- `~/.claude/skills/` is a symlink → respected; backup applies to the realpath.
- A kzk-* skill source has malformed frontmatter (no `version:` line) → treat as 0.0.0; copy proceeds.

**DO NOT deltas:**
- DO NOT `rm -rf ~/.claude` or `~/.claude/skills/` wholesale — only kzk-* and the dotfile dir.
- DO NOT modify `~/.claude/CLAUDE.md` outside the BEGIN/END marker block.
- DO NOT install dependencies if `dependencies.sh` is missing — log + skip (graceful-degrade).
- DO NOT activate the UserPromptSubmit hook unless `--enable-hooks` is explicitly passed (N3).
- DO NOT `set -e` — the install must collect partial-failure summary like `dependencies.sh` does.
- DO NOT write to `<project>/` from this script — global install is `$HOME` only (G2).
- DO NOT echo secrets / paths containing `AKIA*` / `ASIA*` (paranoid; install does not handle creds anyway).

**AGENTS.md row text**: SKIP — this repo has no per-directory AGENTS.md hierarchy. Commit body must include: `Gate 0: AGENTS.md hierarchy not present in install/ — Gate 0 SKIP per kzk-pre-commit-gate §AGENTS.md sync conditional`.

---

### Task B — `install/uninstall-global.sh`

**Branch**: `feature/kzk-global-install`.
**Files created**: `install/uninstall-global.sh` (new, executable).
**Files modified**: none.

**Purpose**: Reverse Task A. Idempotent.

**Function signatures:**

```bash
main() {
  parse_flags "$@"
  remove_marker_block        # Step U1
  remove_skill_dirs          # Step U2
  list_orphaned_artifacts    # Step U3 (new, surfaces critic P2 #9)
  print_summary              # Step U4
}
```

**Steps:**

1. **U1 — Remove marker block from `~/.claude/CLAUDE.md`**:
   - Source `install/lib/claude-md-marker.sh` (re-uses Task A's helper).
   - Call `claude_md_strip_block ~/.claude/CLAUDE.md` → atomic write back.
   - If markers absent → log "no kzk marker found, nothing to strip" + continue (idempotent).
2. **U2 — Remove skill dirs**:
   - `rm -rf ~/.claude/skills/kzk-*` (glob expanded; matches 14 dirs).
   - `rm -rf ~/.claude/skills/.kzk-harness-shared/`.
   - If `--enable-hooks` was previously activated, remove the hook entry from `~/.claude/settings.json` (re-uses helper from Task A).
3. **U3 — List orphaned per-project artifacts** (critic nice-to-have):
   - Glob `~/**/{harness-flow-progress.md,docs/harness,.web-loop,.omc/state,docs/research/codex-reviews}` with `find $HOME -maxdepth 5 ...` (capped to avoid full-fs scan).
   - **Default behavior**: print the list as informational ("found per-project artifacts in: <list>"). DO NOT delete (G2 + spec §6.2 + uninstall preserves project work by design).
   - **Opt-in flag** `--purge-project-artifacts <path>`: only prunes the listed dirs under `<path>` (one explicit project root). Confirm prompt unless `--yes` is passed.
4. **U4 — Print summary**: which paths were removed, where backups live (`~/.claude/CLAUDE.md.kzk-bak-*` left intact), how to remove dependencies manually (`pip uninstall code-review-graph`, `npm uninstall -g @openai/codex`).

**Edge cases:**
- User ran install on a different machine and synced `~/.claude/` across machines (multi-machine R10) → uninstall removes whatever is on this machine. Idempotent.
- A `kzk-foo-local` dir exists under `~/.claude/skills/` that is NOT in source — keeps it (the `kzk-*` glob removes only kzk-prefixed; the user's renamed local copy is theirs, not ours).
- `~/.claude/CLAUDE.md` was hand-edited to remove the END marker → exit 2 with "marker corruption — manual restore needed". Same handling as Task A.

**Tests (3 — `install/test/test_uninstall_global.bats`):**

1. `test_clean_state_after_uninstall`:
   - **Setup**: install + uninstall in a tempdir HOME.
   - **Assertion**: `find $HOME/.claude/skills -maxdepth 2 -name 'kzk-*'` returns empty AND `[ ! -d $HOME/.claude/skills/.kzk-harness-shared ]` AND `! grep -q 'kzk-harness skills' $HOME/.claude/CLAUDE.md`.
2. `test_omc_gstack_sections_preserved`:
   - **Setup**: write a `~/.claude/CLAUDE.md` with `<!-- OMC:START -->...<!-- OMC:VERSION:9.9.9 -->\n# foo\n\n## office-hours\n...` AND a kzk marker block. Install (no-op since marker is already there). Uninstall.
   - **Assertion**: `diff <(grep -v 'kzk-harness' $HOME/.claude/CLAUDE.md.kzk-bak-* | head -1) $HOME/.claude/CLAUDE.md` empty (post-uninstall content matches pre-install backup minus kzk lines).
3. `test_uninstall_idempotent`:
   - **Assertion**: running uninstall twice in a row exits 0 both times. Second run prints "no kzk marker found, nothing to strip".

**Lint / format / DO NOT** — same rules as Task A.

**AGENTS.md row text**: SKIP (same rationale as Task A).

---

### Task C — `README.md` rewrite

**Branch**: `feature/kzk-global-install`.
**Files modified**: `README.md` (lines 7–32 replaced; lines 34+ preserved).
**Files created**: none.

**New `## Install` section (replaces lines 7–32):**

```markdown
## Install

### Recommended: global install

Run once to make all 14 kzk-* skills available in every Claude Code repo:

\`\`\`
git clone --depth 1 https://github.com/kimzerokim/kzk-harness.git /tmp/kzk-harness
bash /tmp/kzk-harness/install/install-global.sh
rm -rf /tmp/kzk-harness
\`\`\`

This writes:

- `~/.claude/skills/kzk-*/SKILL.md` — 14 skill files, auto-loaded by Claude Code.
- `~/.claude/skills/.kzk-harness-shared/` — `harness-share.md`, `VERSION`, `README.md` (umbrella; the dotfile prefix prevents Claude from treating it as an invocable skill).
- `~/.claude/CLAUDE.md` — adds (or refreshes) a `<!-- BEGIN kzk-harness skills --> ... <!-- END kzk-harness skills -->` block with the routing table + self-trigger matrix. Outside the marker block, your existing CLAUDE.md content is left byte-for-byte identical.

Project artifacts (`harness-flow-progress.md`, `docs/harness/`, `docs/plans/`, `.web-loop/`, `.omc/`, `docs/research/codex-reviews/`) stay in `$PWD` per spec §6.2 — the global install never writes outside `~/.claude/`.

### Project-only install (legacy / fallback)

If you do not want a global install, the per-project install still works:

[existing per-project Install instruction text — preserved verbatim from current lines 7–32, just relocated under this subheading]

## Update

Re-run the install one-liner above (`install-global.sh` is idempotent — version-aware overwrite).
Or, from a permanent checkout:

\`\`\`
cd /path/to/kzk-harness && git pull && bash install/install-global.sh --update
\`\`\`

## Uninstall

\`\`\`
bash ~/.claude/skills/.kzk-harness-shared/install/uninstall-global.sh
\`\`\`

Removes the marker block from `~/.claude/CLAUDE.md`, deletes `~/.claude/skills/kzk-*` and `~/.claude/skills/.kzk-harness-shared/`. Per-project artifacts (`harness-flow-progress.md`, `.web-loop/`, etc.) are left untouched — pass `--purge-project-artifacts <path>` to opt-in clean a specific repo.

External dependencies (codex CLI, code-review-graph) are not auto-removed since other tools may use them. Manual removal: `pip uninstall code-review-graph`, `npm uninstall -g @openai/codex`.
```

**Preserve**: `## Usage — starting a new feature` (currently lines 34–50), `## Skills` (currently lines 52–69), `## harness-share.md`, `## License`. These describe the skills, not the install path, so they are unaffected. Editor MUST verify by `git diff README.md` showing changes ONLY in the Install / Update / Uninstall sections.

**Lint:**
- `markdownlint README.md` (existing config).
- ~~Verify the `Skills` table on lines 52–69 still has 14 rows of `| kzk-` (sanity guard against accidental table churn).~~ **Amended 2026-05-27**: 이 sanity guard 는 table 제거로 무효. 대신 self-trigger matrix 헤더 존재 + sync_skills 의 SKILL.md count 가 권위적.

**Edge cases:**
- The legacy per-project install instruction is multi-step and references `/tmp/kzk-harness` — renaming the directory style would invalidate user muscle memory. Keep verbatim, just relocate under `### Project-only install`.

**DO NOT deltas:**
- DO NOT remove the legacy per-project install (G6 — backward compat).
- DO NOT modify the `## Skills` table count or order in this task — that's owned by skill-add cycles, not this plan.
- DO NOT add the install one-liner to CLAUDE.md (that's Task A's marker block job).

**AGENTS.md row text**: SKIP.

---

### Task D — `install/dependencies.sh` `--skip-project` flag

**Branch**: `feature/kzk-global-install`.
**Files modified**: `install/dependencies.sh`.
**Files created**: none.

**Behavior change**: add a `--skip-project` flag that skips the `code-review-graph build` step (lines 65–79 in current `dependencies.sh`) since global install has no single project root.

**Edit shape:**

```bash
# Add at top of script after `set -u`:
SKIP_PROJECT_BUILD=0
while [ $# -gt 0 ]; do
  case "$1" in
    --skip-project) SKIP_PROJECT_BUILD=1; shift ;;
    *) PROJECT_ROOT="$1"; shift ;;  # preserve existing first-arg-as-PROJECT_ROOT semantics
  esac
done
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"

# Wrap the existing `if command -v code-review-graph >/dev/null 2>&1 && [ -d "$PROJECT_ROOT" ]; then` block:
if [ "$SKIP_PROJECT_BUILD" -eq 1 ]; then
  record "code-review-graph: build SKIPPED (--skip-project — no single project root for global install)"
elif command -v code-review-graph >/dev/null 2>&1 && [ -d "$PROJECT_ROOT" ]; then
  # ...existing build+verify block unchanged...
fi
```

**Preserve**: every other code path in `dependencies.sh`. The flag is purely additive.

**Tests (1 — appended to `install/test/test_dependencies.bats`):**

1. `test_skip_project_flag_skips_build`:
   - **Setup**: stub a `code-review-graph` binary in `$PATH` that always fails the `build` subcommand. Run `bash install/dependencies.sh --skip-project /tmp`.
   - **Assertion**: stdout contains `code-review-graph: build SKIPPED (--skip-project ...)`. AND stdout does NOT contain `Building code-review-graph index`.

**Lint:**
- `shellcheck install/dependencies.sh`
- `shfmt -w -i 2 -ci install/dependencies.sh`

**Edge cases:**
- Existing callers that pass a single positional arg as project root (current README install command) → flag parsing must preserve this. The case loop above does (default-arm sets `PROJECT_ROOT`).
- Both `--skip-project` AND a positional arg passed → flag wins; the positional is captured but ignored for the build step.

**DO NOT deltas:**
- DO NOT change the install paths of code-review-graph / codex (lines 33–107).
- DO NOT change plugin detection (lines 132–154).
- DO NOT remove the `record()`/`SUMMARY` pattern.

**AGENTS.md row text**: SKIP.

---

### Task E — AC1–AC8 verification harness

**Branch**: `feature/kzk-global-install`.
**Files created**:
- `install/verify-install.sh` (orchestrator, runs all 8 AC checks).
- `install/lib/precedence-probe.sh` (AC8 — separate sub-script, callable independently).

**Files modified**: none.

**Public flow:**

```bash
$ bash install/verify-install.sh             # All 8 ACs
$ bash install/verify-install.sh --ac 8      # Just AC8 precedence probe
$ bash install/verify-install.sh --ac 1,5,7  # Subset
```

**AC implementations:**

```bash
ac1_trigger_in_new_dir() {
  # AC1 from spec §13: 새 디렉토리에서 'spec 잡자' 발화 → kzk-spec-and-review 매칭
  # Bash-side approximation: cannot literally drive Claude in a script.
  # Approach: launch `claude -p '"spec 잡자 — kzk-spec-and-review 트리거 되는지 짧게 1문장으로 답해라"' --output-format json`
  # in a tempdir (mkdir /tmp/kzk-test-$$).
  # Parse the JSON for any reference to 'kzk-spec-and-review' OR 'Step 0' OR 'cross-vendor'.
  # PASS if found, FAIL otherwise. Print evidence (the matched line).
  # If `claude` CLI is unavailable in PATH → mark AC1 as MANUAL with instruction.
}

ac2_marker_and_14_rows() {
  # awk + grep — verifiable as written by critic.
  awk '/<!-- BEGIN kzk-harness skills -->/,/<!-- END kzk-harness skills -->/' ~/.claude/CLAUDE.md \
    | grep -cE '^\| kzk-' \
    | grep -qx 14 || return 1
  grep -q '<!-- BEGIN kzk-harness skills -->' ~/.claude/CLAUDE.md || return 1
  grep -q '<!-- END kzk-harness skills -->' ~/.claude/CLAUDE.md || return 1
}

ac3_idempotent() {
  # Snapshot ~/.claude/skills + marker → re-run install --update --yes →
  # diff snapshot against post-run state. Empty diff → PASS.
  # Use sha256sum on each SKILL.md for the snapshot.
}

ac4_symlink_dev_mode() {
  local repo="$1" tok="ac4-test-$(date +%s)"
  # bash trap ensures harness-share.md is restored even on early exit (no dirty tree left)
  trap 'git -C "'"$repo"'" checkout -- harness-share.md 2>/dev/null || true' EXIT
  bash "$repo/install/install-global.sh" --symlink-mode --yes
  echo "$tok" >> "$repo/harness-share.md"
  grep -q "$tok" "$HOME/.claude/skills/.kzk-harness-shared/harness-share.md" || return 1
  # trap fires at function exit, restoring harness-share.md
  # NOTE: spec §8.2 inversion → only harness-share.md is symlinked; SKILL.md edit
  # would NOT propagate without --update. Test the inverted shape: harness-share.md
  # edit propagates instantly, SKILL.md edit requires --update. Both correct under §8.2.
}

ac5_no_main_context_read_storm() {
  # Spec §13 AC5 (revised): Read-tool count ≤ 4 + no src/app/lib path reads.
  # NOTE: `claude -p ... --output-format json` returns {"type":"result","result":"..."}
  # with NO .messages field — verified empirically. Use --output-format stream-json
  # --verbose which emits line-delimited events with tool_use entries.
  # Approach:
  local count
  count=$(claude -p '<read-heavy audit prompt template — see Task E §AC5 prompt template>' \
    --output-format stream-json --verbose 2>/dev/null \
    | jq -r 'select(.type=="assistant") | .message.content[]? | select(.type=="tool_use" and .name=="Read") | .input.file_path' \
    | tee /tmp/kzk-ac5-reads.log \
    | wc -l)
  # FAIL condition 1: count ≥ 5
  if [ "$count" -ge 5 ]; then
    echo "AC5 FAIL: main read $count files directly (≥5) — self-trigger matrix not delegating."
    echo "Read paths:"; cat /tmp/kzk-ac5-reads.log
    return 1
  fi
  # FAIL condition 2: any path matches src/app/lib pattern (even if count ≤ 4)
  if grep -qE '(^|/)src/|(^|/)app/|(^|/)lib/' /tmp/kzk-ac5-reads.log 2>/dev/null; then
    echo "AC5 FAIL: main read from src/app/lib path directly (read storm pattern detected)."
    grep -E '(^|/)src/|(^|/)app/|(^|/)lib/' /tmp/kzk-ac5-reads.log
    return 1
  fi
  echo "AC5 PASS: $count Read calls, none from src/app/lib."
  # If `claude` not in PATH → MANUAL.
}

ac6_uninstall_preserves_omc_gstack() {
  # Snapshot ~/.claude/CLAUDE.md → install → uninstall →
  # diff <(grep -v 'kzk-harness' snapshot) current. Empty → PASS.
}

ac7_new_skill_auto_propagation() {
  # Add a fake skill: mkdir skills/kzk-foo + write SKILL.md frontmatter.
  # Run install --update.
  # Assert ~/.claude/skills/kzk-foo/SKILL.md exists.
  # Cleanup: rm -rf skills/kzk-foo + run install --update again to remove from global.
}

ac8_precedence_probe() {
  # See install/lib/precedence-probe.sh below — separate subscript.
  bash install/lib/precedence-probe.sh
}
```

**`install/lib/precedence-probe.sh` (AC8 — runs independently before merge):**

```bash
#!/usr/bin/env bash
# AC8: Project-vs-global precedence probe.
# Spec §13 AC8: writes a stub SKILL.md globally + locally with the same name,
# triggers, observes which body activates. PASS = project wins (G6 holds).
# FAIL = global wins → spec §8.1 must change before install ships.

set -u
TEST_TRIGGER='kzk-precedence-probe-test'
GLOBAL_DIR="$HOME/.claude/skills/kzk-precedence-probe"
PROJECT_ROOT="${1:-$(mktemp -d)}"
PROJECT_DIR="$PROJECT_ROOT/.claude/skills/kzk-precedence-probe"

mkdir -p "$GLOBAL_DIR" "$PROJECT_DIR"

cat > "$GLOBAL_DIR/SKILL.md" <<'EOF'
---
name: kzk-precedence-probe
version: 1.0.0
description: "Probe stub. Trigger: kzk-precedence-probe-test."
---
# precedence-probe
RESULT_BODY: global wins
EOF

cat > "$PROJECT_DIR/SKILL.md" <<'EOF'
---
name: kzk-precedence-probe
version: 99.0.0
description: "Probe stub. Trigger: kzk-precedence-probe-test."
---
# precedence-probe
RESULT_BODY: project wins
EOF

# Run claude in PROJECT_ROOT, ask it to cite the SKILL.md body.
cd "$PROJECT_ROOT"
RESPONSE=$(claude -p "Trigger kzk-precedence-probe-test and quote the RESULT_BODY line from the SKILL.md you matched." 2>&1 || true)
cd -

if echo "$RESPONSE" | grep -q 'project wins'; then
  echo "AC8 PASS: project wins (G6 holds, install-global.sh is safe to ship)"
  RESULT=0
elif echo "$RESPONSE" | grep -q 'global wins'; then
  echo "AC8 FAIL: global wins — spec §8.1 must change before install-global.sh ships"
  RESULT=1
else
  echo "AC8 INCONCLUSIVE: response did not cite either body. Manual probe needed."
  echo "Response was:"; echo "$RESPONSE"
  RESULT=2
fi

# Cleanup
rm -rf "$GLOBAL_DIR" "$PROJECT_DIR"
exit $RESULT
```

**Tests (5 — `install/test/test_verify_install.bats`):**

1. `test_ac2_marker_count_passes_post_install` — install in tempdir, run AC2, assert PASS.
2. `test_ac3_idempotent_clean_run` — install twice, run AC3, assert PASS.
3. `test_ac6_uninstall_omc_preserved` — write a fake OMC block + kzk block, install, uninstall, run AC6, assert PASS.
4. `test_ac8_probe_when_claude_missing` — `PATH=/usr/bin bash install/lib/precedence-probe.sh` (no `claude`) → assert exit 2 (INCONCLUSIVE) + manual instruction printed.
5. `test_verify_install_subset_flag` — `bash install/verify-install.sh --ac 2,3` runs only AC2 + AC3.

**Edge cases:**
- AC1 / AC5 / AC8 require live `claude` CLI. When unavailable → mark MANUAL with explicit shell command for the user. Verifier MUST never silently skip — the harness exit code reflects whether all ACs ran (not whether they passed).
- AC8 probe happens BEFORE Task A merges. Plan dispatch order (§5 below) reflects this.
- AC5 critic-flagged JSON shape: `.messages` vs `.message`. Try both; prefer the array shape; if both fail → MANUAL.

**Lint / DO NOT** — same as Task A. JSON parsing uses `jq` only (already in `dependencies.sh` detection list).

**AGENTS.md row text**: SKIP.

---

### Task F — `kzk-pre-merge-sync` verification + PR description

**Branch**: `feature/kzk-global-install`.
**Files modified**: none (verification-only task — produces a report).
**Files created**: `docs/harness/surveys/2026-05-04-kzk-global-install-pre-merge.md` (the verification report).

**Trigger**: dispatched only **after** Tasks A–E have committed and Gates 0–4 passed (per `kzk-pre-commit-gate`).

**Steps:**

1. Run `kzk-pre-merge-sync --dry-run` (or its skill equivalent — invoke via `oh-my-claudecode:executor` model=sonnet with the skill's documented dry-run shape in `skills/kzk-pre-merge-sync/SKILL.md`).
2. Inspect the proposed PR description. Assert it contains:
   - Each commit's gate-PASS footer (`Gate 0 SKIP / Gate 1 PASS / Gate 1.5 PASS / Gate 2 PASS / Gate 3 PASS / Gate 4 N/A`).
   - A pointer to `docs/plans/2026-05-04-kzk-global-install-design.md` and `docs/plans/2026-05-04-kzk-global-install.md`.
   - A pointer to the AC8 precedence probe result (`docs/harness/surveys/2026-05-04-ac8-precedence-probe.md` if AC8 produced a saved report).
3. Run `oh-my-claudecode:deepinit` (or skip if absent — graceful-degrade per `dependencies.md`) → check whether AGENTS.md is consistent with the feature branch tip. Document any drift in the report.
4. Write `docs/harness/surveys/2026-05-04-kzk-global-install-pre-merge.md` with: (a) the PR-description preview, (b) any AGENTS.md drift, (c) any test failures from Tasks A–E that would block merge.

**No tests** — this task IS the test.

**DO NOT deltas:**
- DO NOT actually create the PR in this task — the user's explicit "PR 올려줘" + "merge it" gates merge per `harness-share.md` §main branch boundary. This task only produces the dry-run report.
- DO NOT push to `main`.
- DO NOT commit AGENTS.md edits in this task — those go in their own commit on whichever feature branch introduced the drift.

**AGENTS.md row text**: SKIP.

---

### Task G — `install/AGENTS.md` seed

**Branch**: `feature/kzk-global-install`.
**Files created**: `install/AGENTS.md`.
**Files modified**: none.

**Trigger**: After all Tasks A–F merge.

After Tasks A–F, `install/` contains 6 new files (`install-global.sh`, `uninstall-global.sh`, `verify-install.sh`, `lib/claude-md-marker.sh`, `lib/precedence-probe.sh`, `hooks/keyword-detector.mjs` scaffold) plus existing `dependencies.sh`, `dependencies.md`, and `UMBRELLA-README.md`.

**Content of `install/AGENTS.md`** — document:
- Subdirectory roles: `lib/` (sourced helpers, not standalone), `hooks/` (N3 opt-in scaffold), `test/` (bats or pure-bash test harness).
- Each script's entry point and exit codes:
  - `install-global.sh`: exits 0 (success), 1 (verification fail), 2 (preflight/marker corruption), 3 (user declined prompt).
  - `uninstall-global.sh`: exits 0 (success), 2 (marker corruption).
  - `verify-install.sh`: exits 0 (all ACs pass), 1 (one or more ACs fail), 2 (harness setup error).
  - `lib/precedence-probe.sh`: exits 0 (project wins), 1 (global wins), 2 (INCONCLUSIVE).
  - `dependencies.sh`: exits 0 (all deps ok or gracefully degraded), non-zero on hard fail.
- Test invocation: `bats install/test/` (or `bash install/test/run_all.sh` if bats unavailable).
- Future-readiness note: this `AGENTS.md` becomes the Gate 0 baseline if the repo later grows an AGENTS.md hierarchy.

**Effort**: 0.5h sonnet.

**AGENTS.md row text**: SKIP (bootstrapping — this IS the first install/AGENTS.md; Gate 0 hierarchy not yet in force for this commit).

---

## 4. Acceptance criteria (verbatim from spec §13 — revised)

- **AC1** — 새 디렉토리 `~/test-kzk-global/` 만들고 그 안에서 `claude` 시작 → "spec 잡자 — kzk-spec-and-review 트리거 되는지" 발화 → kzk-spec-and-review SKILL.md 가 인용됨. **Verifier**: `install/verify-install.sh --ac 1`.
- **AC2** — `~/.claude/CLAUDE.md` 의 `<!-- BEGIN kzk-harness skills -->` ... `<!-- END kzk-harness skills -->` 마커 존재 + `### Self-trigger matrix` 헤더 존재. ~~표 안에 14개 skill row.~~ **Amended 2026-05-27**: skill 카탈로그 table 제거 (bootstrap context 8KB+ 절감, SKILL.md frontmatter 가 트리거 매칭에 권위적이라 table 은 dead-weight reference 였음). **Verifier**: `install/verify-install.sh --ac 2`.
- **AC3** — install-global.sh 두 번째 실행 = stale 0 + 변경 0 (idempotent). 단 source version 이 달라진 skill 만 overwrite. **Verifier**: `install/verify-install.sh --ac 3`.
- **AC4** — kzk-harness repo 안에서 `--symlink-mode` 활성 후 다른 레포에서 trigger 발화 → repo 의 harness-share.md 본문 그대로 매칭. harness-share.md 한 줄 수정 후 다른 레포 새 세션에서 그 변경이 즉시 반영 (§8.2 inversion: SKILL.md is file-copy, only harness-share.md symlinks). **Verifier**: `install/verify-install.sh --ac 4`.
- **AC5** — Read-tool count ≤ 4 AND no reads from `src/`/`app/`/`lib/` paths in a read-heavy audit prompt. Verifier uses `--output-format stream-json --verbose` piped through `jq -r 'select(.type=="assistant") | .message.content[]? | select(.type=="tool_use" and .name=="Read") | .input.file_path'` — count written to `/tmp/kzk-ac5-reads.log`. FAIL if count ≥ 5 OR any log path matches `(^|/)src/|(^|/)app/|(^|/)lib/`. ≥ 5 = self-trigger matrix is failing → P0 cycle. **Verifier**: `install/verify-install.sh --ac 5`.
- **AC6** — uninstall-global.sh 후 14개 디렉토리 + 마커 삭제. omc / gstack 의 다른 섹션은 그대로. **Verifier**: `install/verify-install.sh --ac 6`.
- **AC7** — 새 skill 추가 시 `install-global.sh --update` 1번 으로 다른 레포 컨텍스트에 자동 반영. **Verifier**: `install/verify-install.sh --ac 7`.
- **AC8 (precedence probe — gate before merge)** — install a stub `kzk-precedence-probe/SKILL.md` globally + locally with the same name, trigger, observe which body activates. project wins → G6 holds, proceed. global wins or merged → spec §8.1 must change before install-global.sh ships. **INCONCLUSIVE handling**: default halt; user-attested path via `--ac8-attested-by-user "<DATE> probe-attested"` (typed-confirmation prevents silent fallthrough); writes Q-AC8-MANUAL to `docs/harness/user-queue.md`. **Verifier**: `install/lib/precedence-probe.sh`.

## 5. Dispatch order

Tasks share `install/` paths; most must be sequential. The exception is Tasks C and D — both touch different files (`README.md` vs `dependencies.sh`) and can ship in parallel.

**Recommended order:**

1. **AC8 probe (`install/lib/precedence-probe.sh`) — FIRST**. Pre-Task-A halt gate. The probe must run before Task A merges, because if global wins the spec changes shape (precedence inversion → §8.1 rewrite). Extract just `precedence-probe.sh` into a tiny pre-Task-A dispatch (sonnet, ~30 min). If FAIL → halt + user-queue (`docs/harness/user-queue.md`).
2. **Task D (`install/dependencies.sh --skip-project`)** — sequential before A; A's Step 7 invokes `dependencies.sh --skip-project`. If A ships first, `dependencies.sh:14 PROJECT_ROOT="${1:-$(pwd)}"` treats `--skip-project` as a positional arg (broken). Task D is fast (~30 LoC, ~15 min sonnet) so the A-blocking cost is minimal.
3. **Task A (`install-global.sh` + `lib/claude-md-marker.sh` + helpers)** — sequential after D.
4. **Task B (`uninstall-global.sh`)** — sequential after Task A (depends on `claude-md-marker.sh` helper).
5. **Task C (`README.md` rewrite)** — parallel-safe with A/B (different files, no shared state). Can ship anytime after Task A's design is locked.
6. **Task E (full verify harness)** — sequential after A + B + C + D land. Uses all of them. AC8 probe extracted earlier (step 1).
7. **Task F (kzk-pre-merge-sync verification)** — sequential after E. Final gate.
8. **Task G (`install/AGENTS.md` seed)** — sequential after F. Documents install/ subdirectory roles for future Gate 0 baseline.

Two consecutive critic / codex FAILs on any task → halt + user-queue (`kzk-large-task-delegation` plan-critic loop rule).

## 6. Risk register

R1–R10 from spec §11 carry over verbatim (skill discovery convention, marker corruption, omc/gstack trigger collision, dependencies.sh `--skip-project`, 14-dir clutter, stale per-project skill, symlink dev mode WIP leak, backup accumulation, UserPromptSubmit ordering, multi-machine sync). Plan-specific additions:

| # | Risk | Mitigation |
|---|---|---|
| R-PLAN-1 | AC8 probe FAILs → spec §8.1 inversion → cascading rewrite of Tasks A/B/E. | AC8 runs FIRST in dispatch order (§5 above). Halt + user-queue on FAIL. |
| R-PLAN-2 | `claude --output-format json` schema drift between Claude Code versions → AC1/AC5 silently broken. | Verifier tries both `.messages[]` AND `.message[]` shapes; on both-fail → MANUAL with explicit shell instruction. |
| R-PLAN-3 | `install/lib/claude-md-marker.sh` race between two concurrent installs (e.g., user manually runs install while ralph cycle runs `--update`). Critic flagged P2. | `flock -n /tmp/kzk-install-global.lock` around marker read-modify-write. On lock fail → exit 2 with retry instruction. |
| R-PLAN-4 | `--symlink-mode` invoked from a non-kzk-harness repo (user typo) → corrupts the umbrella with the wrong harness-share.md. | Step 1 preflight: `git config --get remote.origin.url` must match kzk-harness URL or refuse. |
| R-PLAN-5 | Test framework (bats) not installed → executor falls back to pure-bash assertions; quality drops. | Plan documents both shapes. Executor must implement whichever is available; CI / kzk-pre-commit-gate will run whichever is available. |
| R-PLAN-6 | `install-global.sh` invoked over an old install with marker absent because user previously hand-edited CLAUDE.md → exit 2 marker corruption stops install. | Provide `--force-rebuild-marker` flag (additive in Task A) that bypasses the END-marker-missing check. Document as recovery path. |
| R-PLAN-7 | `bash <(curl ...)` install path in spec §7.1 is exposed to MITM if the user is on hostile networks — spec author flagged it as the "Public flow" but did not address checksum verification. | NOT in scope for this plan (spec did not include it). Note in `install/UMBRELLA-README.md` troubleshooting: "for security-sensitive setups, prefer git clone + bash `install/install-global.sh`". Future work F-NEW. |

## 7. Open questions (for codex challenge / next critic pass)

1. **OQ1** — AC8 fail mode. If the probe is INCONCLUSIVE (claude unavailable in CI / sandbox), what is the merge gate? Plan halts. Should there be a "manually-attested" path with sign-off in `docs/harness/user-queue.md`? Default: yes — user-queue entry "Q-AC8-MANUAL: precedence probe could not run, attestation required from user before merge".
2. **OQ2** — Should `install-global.sh` have a `--dry-run` flag that prints all 9 step actions WITHOUT writing? Saves the user from running install + uninstall to test. Decision deferred to executor; plan recommends YES (additive, low risk).
3. **OQ3** — `harness-share.md` symlinking in dev mode: critic recommended it (must-fix #3) but the SOURCE_REPO_DIR detection in Task A Step 1 may resolve to a stale checkout if the user runs `--symlink-mode` from a different copy than they later edit. Mitigation? Either (a) print the resolved SOURCE_REPO_DIR loudly so the user can confirm, (b) refuse `--symlink-mode` if multiple kzk-harness checkouts exist on disk. Plan: implement (a); (b) is over-engineering.
4. **OQ4** — AC5's Read-tool threshold of ≤ 4 (spec) vs ≤ 2 (critic suggestion) — which is the binding contract? Spec wins (frozen). Document the rationale: spec ≤ 4 includes legitimate Read calls main makes for plan/spec/critic verdict files, which are NOT the "Read storm" pattern AC5 is guarding against. ≤ 2 was critic's stricter recommendation; spec relaxed it to ≤ 4 as a more realistic threshold post-survey.
5. **OQ5** — Should Task F (pre-merge sync verification) write its report to `docs/harness/surveys/` or `docs/research/codex-reviews/`? Plan currently routes to `surveys/` since this is verification, not codex review. Confirm with `kzk-codebase-survey §Step 7` report path convention — plan reads "verification reports go in `docs/harness/surveys/`" as the canonical convention.
6. **OQ6** — Should the umbrella be installed by `--symlink-mode` as a true symlink to `<repo>/install/UMBRELLA-README.md`? Currently Task A copies it. Symlinking would let dev iterate the umbrella README without `--update`. Low priority — defer.
7. **OQ7** — Critic's nice-to-have #4 (AGENTS.md row text) — this repo has no AGENTS.md hierarchy, so every task says SKIP. Should we ADD an `install/AGENTS.md` to make Gate 0 testable in future work? Out of scope this plan; track as future work F-AGENTS.

## Frozen

Plan revised 2026-05-04 after critic-opus parallel review (codex CLI consult ran in parallel; partial output captured in /tmp/codex-plan-out.jsonl). Revisions: must-fix C1 (AC5 jq → stream-json), M1+M2 (function body fills for `claude_md_extract_block`, `claude_md_strip_block`, `claude_md_inject_block`, `enable_hooks()`), Concern1 (D-before-A dispatch order); nice-to-have AC8 attestation (`--ac8-attested-by-user` flag + INCONCLUSIVE note in §4 AC8), AC4 trap (bash `trap` replaces prose cleanup), Task G `install/AGENTS.md` seed (new §3 task + §5 dispatch step 8).
