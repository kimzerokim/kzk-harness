#!/usr/bin/env bash
# kzk-harness global install entrypoint.
# Authoritative spec: docs/plans/2026-05-04-kzk-global-install-design.md
# Authoritative plan: docs/plans/2026-05-04-kzk-global-install.md
#
# Hook propagation policy (two tiers):
#
#   DEFAULT-ON hooks (propagated by --enable-hooks without extra flags):
#     edit-read-guard.mjs, dispatcher.mjs, edit-failure-retry.mjs,
#     autonomous-stop-guard.mjs, check-cycle-exit.mjs
#     These generalize across all adopting projects. check-cycle-exit.mjs
#     enforces the cycle-exit fresh-agent verifier gate (harness-share.md §3
#     Gate 6) in any project that uses kzk-harness globally.
#     Runtime opt-out: KZK_CYCLE_EXIT_DISABLE=1 (leaves Q-CYCLE-EXIT-DISABLED
#     entry in docs/harness/user-queue.md). Install-time opt-out: --no-cycle-exit-hook.
#
#   OPT-IN hooks (require an explicit extra flag):
#     regression-recall.mjs  (--regression-recall)
#     fix-scope-trigger.mjs  (--fix-scope-trigger)
#     freshness-guard.mjs    (--freshness-guard)
#     These are project-type-specific and off by default.
#
#   NOT propagated (project-local only, never copied to ~/.claude/):
#     check-skill-flow-fresh.mjs — kzk-harness self-maintenance SoT-HTML
#     drift gate. Wired only in this repo's .claude/settings.json. End users
#     who install kzk-harness globally never get this gate.
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
#                     (test: git config --get remote.origin.url matches
#                     /(github.com[/:]kimzerokim\/kzk-harness)/).
#   --symlink-mode-force
#                     Skip the multi-checkout refusal check for --symlink-mode.
#   --enable-hooks    Install ~/.claude/skills/.kzk-harness-shared/hooks/
#                     keyword-detector.mjs scaffold + register UserPromptSubmit
#                     in ~/.claude/settings.json. Default OFF (N3). The
#                     scaffold file ships always; this flag is the only thing
#                     that wires it into settings.json.
#   --no-cycle-exit-hook
#                     When --enable-hooks is active, skip registering
#                     check-cycle-exit.mjs in settings.json. The file is still
#                     copied to ~/.claude/skills/.kzk-harness-shared/hooks/ so
#                     it can be re-enabled later without a full re-install.
#                     Runtime alternative: KZK_CYCLE_EXIT_DISABLE=1 env var.
#   --yes             Skip the "preview marker replacement, proceed?" prompt
#                     (still emits the diff to stdout). Ralph cycles use this.
#   --ac8-attested-by-user "<DATE> probe-attested"
#                     Manual attestation when AC8 cannot run (CI sandbox /
#                     claude not in PATH). Writes Q-AC8-MANUAL to
#                     docs/harness/user-queue.md and proceeds. Requires
#                     literal date-string match (prevents silent fallthrough).
#   -h | --help       Print usage and exit 0.
set -u
set -o pipefail
umask 077

# ---------------------------------------------------------------------------
# Lock guard (R-PLAN-3): prevent concurrent installs corrupting CLAUDE.md
# Uses mkdir-based locking (atomic on macOS + Linux; no util-linux flock needed)
# ---------------------------------------------------------------------------
LOCK_DIR=/tmp/kzk-install-global.lock
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  printf 'another install-global.sh is running — wait or rm -rf %s\n' "$LOCK_DIR" >&2
  exit 2
fi
trap 'rm -rf "$LOCK_DIR"' EXIT

# ---------------------------------------------------------------------------
# Globals
# ---------------------------------------------------------------------------
DO_PROBE=0
DO_UNINSTALL=0
DO_UPDATE=0
SYMLINK_MODE=0
SYMLINK_MODE_FORCE=0
ENABLE_HOOKS=0
DO_REGRESSION_RECALL=0
DO_FRESHNESS_GUARD=0
DO_DOCKER_GATE=0
NO_DOCKER_GATE=0
NO_CYCLE_EXIT_HOOK=0
AUTO_YES=0
AC8_ATTESTED=""
SOURCE_REPO_DIR=""
BACKUP_PATH=""
SUMMARY=()

emit() { printf '%s\n' "$*"; }
record() { SUMMARY+=("$1"); }

usage() {
  cat <<'USAGE'
kzk-harness global install

Usage: bash install/install-global.sh [flags]

Flags:
  --update                         Re-sync skills + umbrella + CLAUDE.md marker
  --probe                          Run AC8 precedence probe only
  --uninstall                      Delegate to install/uninstall-global.sh
  --symlink-mode                   Dev mode: symlink harness-share.md only
  --symlink-mode-force             Skip multi-checkout refusal for --symlink-mode
  --enable-hooks                   Wire keyword-detector.mjs into settings.json (N3)
  --no-cycle-exit-hook             Skip registering check-cycle-exit.mjs (default ON when --enable-hooks)
  --regression-recall              Also wire regression-recall.mjs (implies --enable-hooks)
  --fix-scope-trigger              Also wire fix-scope-trigger.mjs (Plan B, implies --enable-hooks)
  --freshness-guard                Also wire freshness-guard.mjs (implies --enable-hooks)
  --docker-gate                    Also wire docker-compose-gate.mjs (OPT-IN, implies --enable-hooks)
  --no-docker-gate                 Install-time opt-out: skip docker-compose-gate.mjs even if --enable-hooks
  --yes                            Skip interactive marker-replace prompt
  --ac8-attested-by-user "<DATE>"  Manual AC8 attestation (CI / no claude CLI)
  -h, --help                       Show this help

Exit codes: 0=success 1=verify-fail 2=preflight/marker-corruption 3=user-aborted 4=symlink-mode-multi-checkout
USAGE
}

# ---------------------------------------------------------------------------
# parse_flags
# ---------------------------------------------------------------------------
REMAINING_FLAGS=()
parse_flags() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --update)
        DO_UPDATE=1
        shift
        ;;
      --probe)
        DO_PROBE=1
        shift
        ;;
      --uninstall)
        DO_UNINSTALL=1
        shift
        ;;
      --symlink-mode)
        SYMLINK_MODE=1
        shift
        ;;
      --symlink-mode-force)
        SYMLINK_MODE_FORCE=1
        shift
        ;;
      --enable-hooks)
        ENABLE_HOOKS=1
        shift
        ;;
      --regression-recall)
        DO_REGRESSION_RECALL=1
        shift
        ;;
      --fix-scope-trigger)
        DO_FIX_SCOPE_TRIGGER=1
        shift
        ;;
      --freshness-guard)
        DO_FRESHNESS_GUARD=1
        shift
        ;;
      --docker-gate)
        DO_DOCKER_GATE=1
        shift
        ;;
      --no-docker-gate)
        NO_DOCKER_GATE=1
        shift
        ;;
      --no-cycle-exit-hook)
        NO_CYCLE_EXIT_HOOK=1
        shift
        ;;
      --yes)
        AUTO_YES=1
        shift
        ;;
      --ac8-attested-by-user)
        shift
        AC8_ATTESTED="${1:-}"
        shift
        ;;
      -h | --help)
        usage
        exit 0
        ;;
      *)
        REMAINING_FLAGS+=("$1")
        shift
        ;;
    esac
  done
}

# ---------------------------------------------------------------------------
# run_precedence_probe — delegates to lib/precedence-probe.sh when it exists
# ---------------------------------------------------------------------------
run_precedence_probe() {
  local probe_script="${SOURCE_REPO_DIR}/install/lib/precedence-probe.sh"
  if [ -f "$probe_script" ]; then
    bash "$probe_script"
    return $?
  else
    emit "AC8 probe script not found at $probe_script — run Task E first." >&2
    return 2
  fi
}

# ---------------------------------------------------------------------------
# Step 1 — Pre-flight
# ---------------------------------------------------------------------------
preflight() {
  # Detect SOURCE_REPO_DIR from the script's own location
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local git_top
  git_top="$(git -C "$script_dir" rev-parse --show-toplevel 2>/dev/null || true)"

  if [ -z "$git_top" ]; then
    emit "install-global.sh must run from a kzk-harness git checkout" >&2
    exit 1
  fi

  # Verify it is actually a kzk-harness repo
  local origin_url
  origin_url="$(git -C "$git_top" config --get remote.origin.url 2>/dev/null || true)"
  if ! printf '%s\n' "$origin_url" | grep -qE '(github\.com[/:]kimzerokim/kzk-harness)'; then
    # Also accept local-only repos that have a skills/kzk-* dir (for test harness)
    if [ ! -d "$git_top/skills/kzk-pre-commit-gate" ]; then
      emit "install-global.sh must run from a kzk-harness git checkout (origin: ${origin_url:-<none>})" >&2
      exit 1
    fi
  fi

  SOURCE_REPO_DIR="$git_top"

  # Symlink-mode multi-checkout guard (R-PLAN-4)
  if [ "$SYMLINK_MODE" -eq 1 ] && [ "$SYMLINK_MODE_FORCE" -eq 0 ]; then
    local checkout_count
    checkout_count=$(find "$HOME" -maxdepth 6 -type d -name .git \
      -path '*/kzk-harness/.git' 2>/dev/null | wc -l | tr -d ' ')
    if [ "${checkout_count:-0}" -gt 1 ]; then
      emit "ERROR: $checkout_count kzk-harness checkouts found. --symlink-mode refused (ambiguous source)." >&2
      emit "Use --symlink-mode-force to override, or remove extra checkouts." >&2
      exit 4
    fi
  fi

  # Ensure ~/.claude/skills/ exists
  mkdir -p "$HOME/.claude/skills"
  chmod 700 "$HOME/.claude/skills" 2>/dev/null || true

  # Touch CLAUDE.md if missing
  if [ ! -f "$HOME/.claude/CLAUDE.md" ]; then
    touch "$HOME/.claude/CLAUDE.md"
    chmod 600 "$HOME/.claude/CLAUDE.md" 2>/dev/null || true
    emit "Created empty ~/.claude/CLAUDE.md"
  fi

  # Verify CLAUDE.md is writable
  if [ ! -w "$HOME/.claude/CLAUDE.md" ]; then
    emit "$HOME/.claude/CLAUDE.md is read-only — fix permissions before install" >&2
    exit 2
  fi

  # Handle AC8 manual attestation
  if [ -n "$AC8_ATTESTED" ]; then
    if ! printf '%s\n' "$AC8_ATTESTED" | grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2} probe-attested$'; then
      emit "ERROR: --ac8-attested-by-user requires format '<YYYY-MM-DD> probe-attested'" >&2
      exit 2
    fi
    local queue_dir="$SOURCE_REPO_DIR/docs/harness"
    mkdir -p "$queue_dir"
    local queue_file="$queue_dir/user-queue.md"
    printf '\n## Q-AC8-MANUAL\n\nAC8 precedence probe attested manually by user on %s.\nAttestation string: "%s"\n' \
      "$(date +%Y-%m-%d)" "$AC8_ATTESTED" >>"$queue_file"
    emit "AC8 manual attestation recorded in $queue_file"
  fi
}

# ---------------------------------------------------------------------------
# Step 2 — Backup
# ---------------------------------------------------------------------------
backup_claude_md() {
  local claude_md="$HOME/.claude/CLAUDE.md"
  if [ ! -f "$claude_md" ] || [ ! -s "$claude_md" ]; then
    emit "no existing CLAUDE.md to back up"
    BACKUP_PATH=""
    return 0
  fi

  local ts
  ts=$(date +%Y%m%d-%H%M%S)
  local dest="${claude_md}.kzk-bak-${ts}"
  local n=1
  while [ -f "$dest" ]; do
    dest="${claude_md}.kzk-bak-${ts}.$(printf '%03d' "$n")"
    n=$((n + 1))
  done
  cp -p "$claude_md" "$dest"
  BACKUP_PATH="$dest"
  emit "Backup: $dest"
}

# ---------------------------------------------------------------------------
# Step 3 — Skill sync
# ---------------------------------------------------------------------------
sync_skills() {
  local skills_src="$SOURCE_REPO_DIR/skills"
  local skills_dst="$HOME/.claude/skills"
  local synced=0
  local skipped=0

  for src_dir in "$skills_src"/kzk-*/; do
    [ -d "$src_dir" ] || continue
    local name
    name="$(basename "$src_dir")"
    local tgt_dir="$skills_dst/$name"
    mkdir -p "$tgt_dir"

    local src_skill="$src_dir/SKILL.md"
    [ -f "$src_skill" ] || continue

    local src_version
    src_version="$(grep -m1 '^version:' "$src_skill" | awk '{print $2}' || true)"
    src_version="${src_version:-0.0.0}"

    local tgt_skill="$tgt_dir/SKILL.md"
    local tgt_version="0.0.0"
    if [ -f "$tgt_skill" ]; then
      tgt_version="$(grep -m1 '^version:' "$tgt_skill" | awk '{print $2}' || true)"
      tgt_version="${tgt_version:-0.0.0}"
    fi

    # Version compare: if tgt_version is strictly higher, preserve
    local higher
    higher="$(printf '%s\n%s\n' "$tgt_version" "$src_version" | sort -V | tail -1)"
    if [ "$tgt_version" != "0.0.0" ] &&
      [ "$higher" = "$tgt_version" ] &&
      [ "$tgt_version" != "$src_version" ]; then
      emit "  skipped $name — local v$tgt_version > source v$src_version"
      record "  $name: skipped (local v$tgt_version > source v$src_version)"
      skipped=$((skipped + 1))
      continue
    fi

    # Copy SKILL.md (always file-copy, even in --symlink-mode per §8.2 inversion)
    cp "$src_skill" "$tgt_dir/SKILL.md"

    # Copy any auxiliary files (future-safe, leave user-added files alone)
    for aux in "$src_dir"/*; do
      [ -f "$aux" ] || continue
      local aux_name
      aux_name="$(basename "$aux")"
      [ "$aux_name" = "SKILL.md" ] && continue
      cp "$aux" "$tgt_dir/$aux_name"
    done

    synced=$((synced + 1))
  done

  emit "  Skills synced: $synced, skipped (local-higher): $skipped"
  record "skill sync: $synced updated, $skipped preserved (local-higher version)"
}

# ---------------------------------------------------------------------------
# Step 4 — Umbrella sync
# ---------------------------------------------------------------------------
sync_umbrella() {
  local umbrella="$HOME/.claude/skills/.kzk-harness-shared"
  mkdir -p "$umbrella"

  if [ "$SYMLINK_MODE" -eq 1 ]; then
    # Symlink harness-share.md (only this file is symlinked per §8.2 inversion)
    local target_hs="$SOURCE_REPO_DIR/harness-share.md"
    local link_hs="$umbrella/harness-share.md"
    if [ -L "$link_hs" ]; then
      rm "$link_hs"
    elif [ -f "$link_hs" ]; then
      rm "$link_hs"
    fi
    ln -sfn "$target_hs" "$link_hs"
    emit "  Symlinked harness-share.md → $target_hs"
    record "umbrella: harness-share.md symlinked (--symlink-mode)"
  else
    cp "$SOURCE_REPO_DIR/harness-share.md" "$umbrella/harness-share.md"
    record "umbrella: harness-share.md copied"
  fi

  # VERSION file
  local ver
  ver="$(git -C "$SOURCE_REPO_DIR" describe --tags --always --dirty 2>/dev/null || true)"
  ver="${ver:-$(date +%Y-%m-%d-cycle-unknown)}"
  printf '%s\n' "$ver" >"$umbrella/VERSION"

  # UMBRELLA-README.md → README.md
  if [ -f "$SOURCE_REPO_DIR/install/UMBRELLA-README.md" ]; then
    cp "$SOURCE_REPO_DIR/install/UMBRELLA-README.md" "$umbrella/README.md"
  fi

  record "umbrella: version=$ver"
}

# ---------------------------------------------------------------------------
# Step 5 — CLAUDE.md routing block
# ---------------------------------------------------------------------------
update_claude_md_routing() {
  # Source the marker helpers
  # shellcheck source=install/lib/claude-md-marker.sh
  source "$SOURCE_REPO_DIR/install/lib/claude-md-marker.sh"

  local claude_md="$HOME/.claude/CLAUDE.md"

  # Check for malformed marker (BEGIN without END)
  if grep -qF "$KZK_MARKER_BEGIN" "$claude_md" &&
    ! grep -qF "$KZK_MARKER_END" "$claude_md"; then
    emit "marker corruption — restore from $BACKUP_PATH manually" >&2
    exit 2
  fi

  # Build routing block content
  local block_file
  block_file=$(mktemp)
  _build_routing_block >"$block_file"

  # Compare new vs existing block
  local old_block
  old_block=$(mktemp)
  if claude_md_block_present "$claude_md"; then
    claude_md_extract_block "$claude_md" >"$old_block"
  fi

  local diff_out
  diff_out=$(diff -u "$old_block" "$block_file" || true)
  rm -f "$old_block"

  if [ -z "$diff_out" ]; then
    emit "  CLAUDE.md marker block unchanged (idempotent)"
    record "CLAUDE.md: no change (already up to date)"
    rm -f "$block_file"
    return 0
  fi

  # Show diff
  emit "  CLAUDE.md routing block diff:"
  printf '%s\n' "$diff_out" | head -40

  if [ "$AUTO_YES" -eq 0 ]; then
    printf 'Replace this region of ~/.claude/CLAUDE.md? (y/N) '
    read -r answer
    if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
      emit "Aborted by user."
      rm -f "$block_file"
      exit 3
    fi
  fi

  # Strip existing block, inject new one (atomic)
  local stripped
  stripped=$(mktemp)
  if claude_md_block_present "$claude_md"; then
    claude_md_strip_block "$claude_md" "$stripped"
  else
    cp "$claude_md" "$stripped"
  fi
  claude_md_inject_block "$stripped" "$block_file" "$claude_md"
  rm -f "$stripped" "$block_file"

  emit "  CLAUDE.md routing block updated"
  record "CLAUDE.md: routing block updated"
}

# _build_routing_block — writes routing block content to stdout (no markers)
_build_routing_block() {
  local skills_src="$SOURCE_REPO_DIR/skills"
  local ver
  ver="$(git -C "$SOURCE_REPO_DIR" describe --tags --always --dirty 2>/dev/null || true)"
  ver="${ver:-$(date +%Y-%m-%d-cycle-unknown)}"
  local install_date
  install_date="$(date +%Y-%m-%d)"

  cat <<EOF
## kzk-harness skills (${ver} installed ${install_date})

> Workflow skill layer. 18 markdown skills auto-load from ~/.claude/skills/kzk-*.
> Project artifacts (\`harness-flow-progress.md\`, \`docs/harness/\`, \`docs/plans/\`,
> \`.web-loop/\`, \`.omc/\`, \`docs/research/codex-reviews/\`) stay in \`\$PWD\`.

| Skill | Trigger keywords |
|---|---|
EOF

  # Emit one row per skill directory
  for skill_dir in "$skills_src"/kzk-*/; do
    [ -d "$skill_dir" ] || continue
    local skill_name
    skill_name="$(basename "$skill_dir")"
    local skill_md="$skill_dir/SKILL.md"
    local triggers=""
    if [ -f "$skill_md" ]; then
      # Extract description line which contains trigger keywords
      triggers="$(grep -m1 '^description:' "$skill_md" | sed 's/^description:[[:space:]]*//' | sed 's/^"//;s/"$//' || true)"
    fi
    printf '| %s | %s |\n' "$skill_name" "$triggers"
  done

  # Self-trigger matrix (verbatim from CLAUDE.md §Self-Improvement Loop)
  cat <<'MATRIX'

### Self-trigger matrix (메타 갭 방지)

- 메인이 5+ 파일 read 가 필요한 검증 → kzk-codebase-survey → kzk-large-task-delegation §Read-heavy audit
- 새 spec / plan / 큰 구조 변경 → kzk-spec-and-review Step 0 → 1–3
- 자가개선 cycle → kzk-large-task-delegation + kzk-pre-commit-gate + kzk-autonomous-loop
- Multi-file 코드 변경 (3+ 파일 / 200+ LoC) → kzk-large-task-delegation §Model routing
- Cycle 끝에서 commit → kzk-pre-commit-gate (Gate 0–4) + kzk-pre-merge-sync
- 다중 cycle 자율 실행 → kzk-autonomous-loop + kzk-autonomous-boundary
- Production / DB / IAM 작업 → kzk-production-access
- UI 변경 commit → kzk-playwright-verification (Gate 4)
MATRIX
}

# ---------------------------------------------------------------------------
# Step 5.5 — OMC keyword-detector collision check
# ---------------------------------------------------------------------------
omc_collision_check() {
  local found=0
  local pattern="$HOME/.claude/plugins/cache"
  # Use glob expansion (not find /) for performance
  for f in "$pattern"/*/oh-my-claudecode/*/scripts/keyword-detector.mjs; do
    [ -f "$f" ] || continue
    if grep -qE '(ralph|autopilot|ulw|ccg)' "$f" 2>/dev/null; then
      found=1
      printf 'WARNING: OMC keyword-detector intercepts '\''ralph'\'' before SKILL.md matching → kzk-autonomous-boundary may not activate via the bare keyword. Use the disambiguator phrases '\''ralph로 체크'\'' / '\''ralph로 확인'\'' which are already in the SKILL.md description (v1.0.12+). Confirm by triggering in a fresh session.\n' >&2
      break
    fi
  done

  if [ "$found" -eq 1 ]; then
    record "OMC collision warning EMITTED"
  fi
}

# ---------------------------------------------------------------------------
# Step 6 — Stale skill cleanup
# ---------------------------------------------------------------------------
cleanup_stale_skills() {
  local skills_src="$SOURCE_REPO_DIR/skills"
  local skills_dst="$HOME/.claude/skills"
  local stale=()

  for installed in "$skills_dst"/kzk-*/; do
    [ -d "$installed" ] || continue
    local name
    name="$(basename "$installed")"
    if [ ! -d "$skills_src/$name" ]; then
      stale+=("$name")
    fi
  done

  if [ ${#stale[@]} -eq 0 ]; then
    return 0
  fi

  emit "  Stale globally-installed kzk-* skills (no longer in source):"
  for s in "${stale[@]}"; do
    emit "    - $s"
  done

  local answer="y"
  if [ "$AUTO_YES" -eq 0 ]; then
    printf 'These kzk-* skills are no longer in source. Delete? (y/N) '
    read -r answer
  fi

  if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
    for s in "${stale[@]}"; do
      local target="$skills_dst/$s"
      if [ -L "$target" ]; then
        rm "$target"
      else
        rm -rf "$target"
      fi
      emit "  Removed stale: $s"
    done
    record "stale cleanup: removed ${#stale[@]} stale skill(s): ${stale[*]}"
  else
    record "stale cleanup: skipped (user declined)"
  fi
}

# ---------------------------------------------------------------------------
# Step 7 — Dependencies
# ---------------------------------------------------------------------------
run_dependencies() {
  local dep_script="$SOURCE_REPO_DIR/install/dependencies.sh"
  if [ ! -f "$dep_script" ]; then
    emit "  dependencies.sh not found at $dep_script — skipping (graceful-degrade)"
    record "dependencies: SKIPPED (script not found)"
    return 0
  fi

  emit "  Running dependencies.sh --skip-project ..."
  if ! bash "$dep_script" --skip-project; then
    emit "  dependencies install reported failures — see /tmp/kzk-crg-*.log /tmp/kzk-codex-*.log"
    record "dependencies: completed with warnings (see /tmp/kzk-*.log)"
  else
    record "dependencies: completed"
  fi
}

# ---------------------------------------------------------------------------
# Step 8 — Verification
# ---------------------------------------------------------------------------
verify_install() {
  local skills_dst="$HOME/.claude/skills"
  local umbrella="$skills_dst/.kzk-harness-shared"
  local claude_md="$HOME/.claude/CLAUDE.md"
  local ok=1

  # Count SKILL.md files under kzk-* dirs
  local count
  count=$(find "$skills_dst" -maxdepth 2 -name 'SKILL.md' -path '*/kzk-*/*' 2>/dev/null | wc -l | tr -d ' ')
  if [ "${count:-0}" -ne 18 ]; then
    emit "VERIFY FAIL: expected 18 kzk-*/SKILL.md, found ${count:-0}" >&2
    ok=0
  fi

  # Umbrella harness-share.md
  if [ ! -f "$umbrella/harness-share.md" ]; then
    emit "VERIFY FAIL: $umbrella/harness-share.md missing" >&2
    ok=0
  fi

  # Umbrella VERSION
  if [ ! -s "$umbrella/VERSION" ]; then
    emit "VERIFY FAIL: $umbrella/VERSION missing or empty" >&2
    ok=0
  fi

  # CLAUDE.md markers
  if ! grep -qF "$KZK_MARKER_BEGIN" "$claude_md" 2>/dev/null; then
    emit "VERIFY FAIL: BEGIN marker missing from $claude_md" >&2
    ok=0
  fi
  if ! grep -qF "$KZK_MARKER_END" "$claude_md" 2>/dev/null; then
    emit "VERIFY FAIL: END marker missing from $claude_md" >&2
    ok=0
  fi

  # Count kzk- rows in marker block
  if command -v awk >/dev/null 2>&1 && grep -qF "$KZK_MARKER_BEGIN" "$claude_md" 2>/dev/null; then
    local row_count
    row_count=$(awk -v b="$KZK_MARKER_BEGIN" -v e="$KZK_MARKER_END" \
      '$0==b{f=1;next} $0==e{f=0;next} f && /^\| kzk-/' "$claude_md" | wc -l | tr -d ' ')
    if [ "${row_count:-0}" -ne 18 ]; then
      emit "VERIFY FAIL: expected 18 '| kzk-' rows in marker block, found ${row_count:-0}" >&2
      ok=0
    fi
  fi

  if [ "$ok" -eq 1 ]; then
    emit "  all 18 skills + umbrella + CLAUDE.md marker verified"
    record "verification: PASS (18 skills, umbrella, marker)"
    return 0
  else
    record "verification: FAIL — see errors above"
    return 1
  fi
}

# ---------------------------------------------------------------------------
# N3 opt-in: enable_hooks (Plan F rev2)
# ---------------------------------------------------------------------------

# update_hooks_canonical — canonical reconstruct of PreToolUse / PostToolUse /
# UserPromptSubmit / Stop arrays in settings.json. Managed whitelist (8 filenames)
# only stripped — user custom hooks preserved. dispatcher only registered.
#
# check-cycle-exit.mjs is DEFAULT ON (registered as a PreToolUse Bash matcher
# unless NO_CYCLE_EXIT_HOOK=1 was passed at install time). All other always-on
# hooks (edit-read-guard, dispatcher, edit-failure-retry, autonomous-stop-guard)
# are also unconditional. Opt-in hooks (regression-recall, fix-scope-trigger,
# freshness-guard) are wired via the dispatcher manifest (enabled.json), not here.
update_hooks_canonical() {
  local settings="$1"
  local hook_dest="$HOME/.claude/skills/.kzk-harness-shared/hooks"
  local pre_cmd="node $hook_dest/edit-read-guard.mjs --mode=pre"
  local post_cmd="node $hook_dest/edit-read-guard.mjs --mode=post-read"
  local post_retry_cmd="node $hook_dest/edit-failure-retry.mjs"
  local disp_cmd="node $hook_dest/dispatcher.mjs"
  local stop_cmd="node $hook_dest/autonomous-stop-guard.mjs"
  local cycle_exit_cmd="node $hook_dest/check-cycle-exit.mjs"

  local tmp
  tmp=$(mktemp)

  # managed filenames whitelist: strip only these 8, preserve user custom hooks
  if [ "${NO_CYCLE_EXIT_HOOK:-0}" -eq 1 ]; then
    # --no-cycle-exit-hook: omit check-cycle-exit.mjs from PreToolUse registration
    # (still strip it from managed list so re-runs stay idempotent)
    jq --arg pre "$pre_cmd" --arg post "$post_cmd" --arg post_retry "$post_retry_cmd" --arg disp "$disp_cmd" --arg stop "$stop_cmd" '
      def is_managed: (.command // "") |
        (test("/dispatcher\\.mjs(\\s|$)") or
         test("/edit-read-guard\\.mjs(\\s|$)") or
         test("/edit-failure-retry\\.mjs(\\s|$)") or
         test("/keyword-detector\\.mjs(\\s|$)") or
         test("/regression-recall\\.mjs(\\s|$)") or
         test("/fix-scope-trigger\\.mjs(\\s|$)") or
         test("/autonomous-stop-guard\\.mjs(\\s|$)") or
         test("/check-cycle-exit\\.mjs(\\s|$)"));

      .hooks.PreToolUse = (((.hooks.PreToolUse // []) | map(
          .hooks |= map(select(is_managed | not))
        ) | map(select((.hooks // []) | length > 0))) +
        [{matcher:"Edit|Write", hooks:[{type:"command", command:$pre}]}])
      | .hooks.PostToolUse = (((.hooks.PostToolUse // []) | map(
          .hooks |= map(select(is_managed | not))
        ) | map(select((.hooks // []) | length > 0))) +
        [{matcher:"Read", hooks:[{type:"command", command:$post}]},
         {matcher:"Edit|Write", hooks:[{type:"command", command:$post_retry}]}])
      | .hooks.UserPromptSubmit = (((.hooks.UserPromptSubmit // []) | map(
          .hooks |= map(select(is_managed | not))
        ) | map(select((.hooks // []) | length > 0))) +
        [{matcher:"*", hooks:[{type:"command", command:$disp}]}])
      | .hooks.Stop = (((.hooks.Stop // []) | map(
          .hooks |= map(select(is_managed | not))
        ) | map(select((.hooks // []) | length > 0))) +
        [{matcher:"*", hooks:[{type:"command", command:$stop}]}])
    ' "$settings" >"$tmp" && mv "$tmp" "$settings" || return 1
  else
    # Default ON: register check-cycle-exit.mjs as PreToolUse Bash matcher
    jq --arg pre "$pre_cmd" --arg post "$post_cmd" --arg post_retry "$post_retry_cmd" --arg disp "$disp_cmd" --arg stop "$stop_cmd" --arg ce "$cycle_exit_cmd" '
      def is_managed: (.command // "") |
        (test("/dispatcher\\.mjs(\\s|$)") or
         test("/edit-read-guard\\.mjs(\\s|$)") or
         test("/edit-failure-retry\\.mjs(\\s|$)") or
         test("/keyword-detector\\.mjs(\\s|$)") or
         test("/regression-recall\\.mjs(\\s|$)") or
         test("/fix-scope-trigger\\.mjs(\\s|$)") or
         test("/autonomous-stop-guard\\.mjs(\\s|$)") or
         test("/check-cycle-exit\\.mjs(\\s|$)"));

      .hooks.PreToolUse = (((.hooks.PreToolUse // []) | map(
          .hooks |= map(select(is_managed | not))
        ) | map(select((.hooks // []) | length > 0))) +
        [{matcher:"Edit|Write", hooks:[{type:"command", command:$pre}]},
         {matcher:"Bash", hooks:[{type:"command", command:$ce}]}])
      | .hooks.PostToolUse = (((.hooks.PostToolUse // []) | map(
          .hooks |= map(select(is_managed | not))
        ) | map(select((.hooks // []) | length > 0))) +
        [{matcher:"Read", hooks:[{type:"command", command:$post}]},
         {matcher:"Edit|Write", hooks:[{type:"command", command:$post_retry}]}])
      | .hooks.UserPromptSubmit = (((.hooks.UserPromptSubmit // []) | map(
          .hooks |= map(select(is_managed | not))
        ) | map(select((.hooks // []) | length > 0))) +
        [{matcher:"*", hooks:[{type:"command", command:$disp}]}])
      | .hooks.Stop = (((.hooks.Stop // []) | map(
          .hooks |= map(select(is_managed | not))
        ) | map(select((.hooks // []) | length > 0))) +
        [{matcher:"*", hooks:[{type:"command", command:$stop}]}])
    ' "$settings" >"$tmp" && mv "$tmp" "$settings" || return 1
  fi
}

# update_hook_manifest — write enabled.json manifest for dispatcher
update_hook_manifest() {
  local manifest_dir="$HOME/.claude/skills/.kzk-harness-shared/hooks"
  local manifest="$manifest_dir/enabled.json"
  local kw="${1:-true}"      # keyword_detector default ON
  local rr="${2:-false}"     # regression_recall default OFF
  local fs_flag="${3:-false}" # fix_scope_trigger default OFF
  local fg_flag="${4:-false}" # freshness_guard default OFF
  local dg_flag="${5:-false}" # docker_compose_gate default OFF
  local tmp
  tmp=$(mktemp)
  jq -n \
    --argjson kw "$kw" --argjson rr "$rr" --argjson fs "$fs_flag" \
    --argjson fg "$fg_flag" --argjson dg "$dg_flag" \
    '{keyword_detector: $kw, regression_recall: $rr, fix_scope_trigger: $fs, freshness_guard: $fg, docker_compose_gate: $dg}' \
    >"$tmp" && mv "$tmp" "$manifest"
}

enable_hooks() {
  local src="$SOURCE_REPO_DIR"
  local hook_dest="$HOME/.claude/skills/.kzk-harness-shared/hooks"
  local lib_dest="$HOME/.claude/skills/.kzk-harness-shared/lib"

  mkdir -p "$hook_dest"
  mkdir -p "$lib_dest"
  mkdir -p "$HOME/.claude/skills/.kzk-harness-shared/bin"

  # Plan F: copy ALL install/lib/*.mjs idempotently (cmp -s skip / overwrite)
  for libfile in "$src/install/lib"/*.mjs; do
    [ -f "$libfile" ] || continue
    local base
    base="$(basename "$libfile")"
    local dest="$lib_dest/$base"
    if [ -f "$dest" ] && cmp -s "$libfile" "$dest"; then
      emit "  hooks: lib/$base unchanged — skip"
    else
      cp "$libfile" "$dest"
      emit "  hooks: lib/$base copied"
      record "hooks: lib/$base copied"
    fi
  done

  # Plan F: copy edit-read-guard.mjs and dispatcher.mjs (always active)
  cp "$src/install/hooks/edit-read-guard.mjs" "$hook_dest/" || return 1
  cp "$src/install/hooks/dispatcher.mjs" "$hook_dest/" || return 1
  # Cycle 50: copy edit-failure-retry.mjs (PostToolUse Edit|Write failure forcing hook)
  cp "$src/install/hooks/edit-failure-retry.mjs" "$hook_dest/" || return 1
  # Cycle 52: copy autonomous-stop-guard.mjs (Stop hook for autonomous mode)
  cp "$src/install/hooks/autonomous-stop-guard.mjs" "$hook_dest/" || return 1
  # Phase G: copy check-cycle-exit.mjs (PreToolUse Bash, default ON)
  # File is always copied regardless of --no-cycle-exit-hook; the flag only
  # controls whether settings.json registers it (opt-out = settings only).
  cp "$src/install/hooks/check-cycle-exit.mjs" "$hook_dest/" || return 1

  # Always copy keyword-detector (needed by dispatcher manifest)
  cp "$src/install/hooks/keyword-detector.mjs" "$hook_dest/"

  # Plan D: regression-recall hook + dismiss bin
  if [ "${DO_REGRESSION_RECALL:-0}" -eq 1 ]; then
    cp "$src/install/hooks/regression-recall.mjs" "$hook_dest/" 2>/dev/null || true
    cp "$src/install/bin/kzk-regression-memory.mjs" \
      "$HOME/.claude/skills/.kzk-harness-shared/bin/" 2>/dev/null || true
  fi

  # Plan B: fix-scope-trigger hook
  if [ "${DO_FIX_SCOPE_TRIGGER:-0}" -eq 1 ]; then
    cp "$src/install/hooks/fix-scope-trigger.mjs" "$hook_dest/" 2>/dev/null || true
  fi

  # freshness-guard hook
  if [ "${DO_FRESHNESS_GUARD:-0}" -eq 1 ]; then
    cp "$src/install/hooks/freshness-guard.mjs" "$hook_dest/" 2>/dev/null || true
  fi

  # docker-compose-gate hook (OPT-IN: --docker-gate; suppressed by --no-docker-gate)
  if [ "${DO_DOCKER_GATE:-0}" -eq 1 ] && [ "${NO_DOCKER_GATE:-0}" -eq 0 ]; then
    cp "$src/install/hooks/docker-compose-gate.mjs" "$hook_dest/" 2>/dev/null || true
    # Also propagate the shared lib (required by docker-compose-gate.mjs)
    mkdir -p "$hook_dest/lib"
    cp "$src/install/hooks/lib/cycle-exit-utils.mjs" "$hook_dest/lib/" 2>/dev/null || true
  fi

  local settings="$HOME/.claude/settings.json"
  if [ ! -f "$settings" ]; then
    printf '{}' >"$settings"
  fi

  if ! command -v jq >/dev/null 2>&1; then
    emit "  hooks: jq not found — cannot update settings.json. Install jq and re-run with --enable-hooks." >&2
    record "hooks: SKIPPED (jq not found)"
    # fail-closed: jq 부재 시 enable 실패 → exit non-zero (called from kzk-pre-merge-sync step 3)
    return 1
  fi

  # Plan F: canonical reconstruct — dispatcher only in settings.json
  update_hooks_canonical "$settings" || return 1
  emit "  hooks: settings.json hook arrays reconstructed (canonical, dispatcher only)"
  record "hooks: PreToolUse + PostToolUse + UserPromptSubmit canonical (dispatcher)"

  # Plan F: manifest — keyword_detector ON by default; rr/fst per flags
  local kw_flag="true"
  local rr_flag="false"
  local fst_flag="false"
  local fg_flag="false"
  local dg_flag="false"
  [ "${DO_REGRESSION_RECALL:-0}" -eq 1 ] && rr_flag="true"
  [ "${DO_FIX_SCOPE_TRIGGER:-0}" -eq 1 ] && fst_flag="true"
  [ "${DO_FRESHNESS_GUARD:-0}" -eq 1 ] && fg_flag="true"
  [ "${DO_DOCKER_GATE:-0}" -eq 1 ] && [ "${NO_DOCKER_GATE:-0}" -eq 0 ] && dg_flag="true"
  update_hook_manifest "$kw_flag" "$rr_flag" "$fst_flag" "$fg_flag" "$dg_flag" || return 1
  emit "  hooks: enabled.json manifest written (kw=$kw_flag rr=$rr_flag fst=$fst_flag fg=$fg_flag dg=$dg_flag)"
  record "hooks: enabled.json manifest written"

  return 0
}

# ---------------------------------------------------------------------------
# Step 9 — Summary
# ---------------------------------------------------------------------------
print_summary() {
  local umbrella="$HOME/.claude/skills/.kzk-harness-shared"
  local ver=""
  [ -f "$umbrella/VERSION" ] && ver="$(cat "$umbrella/VERSION")"
  local mode="install"
  [ "$DO_UPDATE" -eq 1 ] && mode="update"

  emit ""
  emit "=== kzk-harness global $mode summary ==="
  emit "  Install location : $HOME/.claude/skills/kzk-*"
  emit "  Umbrella         : $umbrella"
  emit "  Version          : ${ver:-unknown}"
  [ -n "$BACKUP_PATH" ] && emit "  CLAUDE.md backup : $BACKUP_PATH"
  emit ""
  for line in "${SUMMARY[@]}"; do
    emit "  $line"
  done
  emit ""
  emit "Next step: Trigger 'spec 잡자' or 'codebase survey' in a fresh Claude session"
  emit "inside any repo to verify the global install activates. If a kzk-* skill is"
  emit "not cited within the first response, see:"
  emit "  $umbrella/README.md (troubleshooting)"
}

# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------
main() {
  parse_flags "$@"

  if [ "$DO_PROBE" -eq 1 ]; then
    preflight
    run_precedence_probe
    exit $?
  fi

  if [ "$DO_UNINSTALL" -eq 1 ]; then
    preflight
    exec bash "$SOURCE_REPO_DIR/install/uninstall-global.sh" "${REMAINING_FLAGS[@]}"
  fi

  emit "kzk-harness: global install starting..."
  emit ""

  preflight
  backup_claude_md
  sync_skills
  sync_umbrella
  update_claude_md_routing
  omc_collision_check
  cleanup_stale_skills
  run_dependencies

  # Source marker helpers if not already sourced (needed for verify_install)
  if [ -z "${KZK_MARKER_BEGIN:-}" ]; then
    # shellcheck source=install/lib/claude-md-marker.sh
    source "$SOURCE_REPO_DIR/install/lib/claude-md-marker.sh"
  fi

  if ! verify_install; then
    print_summary
    exit 1
  fi

  # Plan D: --regression-recall 는 --enable-hooks 의 explicit dependency
  if [ "${DO_REGRESSION_RECALL:-0}" -eq 1 ] && [ "${ENABLE_HOOKS:-0}" -eq 0 ]; then
    emit "  --regression-recall implies --enable-hooks (explicit dependency)"
    ENABLE_HOOKS=1
  fi

  # Plan B: --fix-scope-trigger 는 --enable-hooks 의 explicit dependency
  if [ "${DO_FIX_SCOPE_TRIGGER:-0}" -eq 1 ] && [ "${ENABLE_HOOKS:-0}" -eq 0 ]; then
    emit "  --fix-scope-trigger implies --enable-hooks (explicit dependency)"
    ENABLE_HOOKS=1
  fi

  # --freshness-guard 는 --enable-hooks 의 explicit dependency
  if [ "${DO_FRESHNESS_GUARD:-0}" -eq 1 ] && [ "${ENABLE_HOOKS:-0}" -eq 0 ]; then
    emit "  --freshness-guard implies --enable-hooks (explicit dependency)"
    ENABLE_HOOKS=1
  fi

  # --docker-gate 는 --enable-hooks 의 explicit dependency
  if [ "${DO_DOCKER_GATE:-0}" -eq 1 ] && [ "${ENABLE_HOOKS:-0}" -eq 0 ]; then
    emit "  --docker-gate implies --enable-hooks (explicit dependency)"
    ENABLE_HOOKS=1
  fi

  if [ "$ENABLE_HOOKS" -eq 1 ]; then
    if ! enable_hooks; then
      emit "  ERROR: enable_hooks failed — aborting (fail-closed for kzk-pre-merge-sync step 3)" >&2
      exit 1
    fi
  fi

  print_summary
}

main "$@"
