#!/usr/bin/env bash
# kzk-harness global uninstall.
# Authoritative spec: docs/superpowers/specs/2026-05-04-kzk-global-install-design.md
# Authoritative plan: docs/plans/2026-05-04-kzk-global-install.md Task B
#
# Flags:
#   --restore-backup          Restore most recent ~/.claude/CLAUDE.md.kzk-bak-*
#                             instead of just stripping the marker block.
#   --purge-project-artifacts List AND delete (after typed confirm) per-project
#                             kzk artifacts under $HOME; default is list-only.
#   --yes                     Skip all confirmations (for CI / ralph cycles).
#   -h | --help               Print usage and exit 0.
#
# Exit codes:
#   0 — success
#   1 — nothing to uninstall (no kzk-* dirs found)
#   2 — ~/.claude/CLAUDE.md write blocked or marker corruption
#   3 — user aborted
set -u
set -o pipefail
umask 077

# ---------------------------------------------------------------------------
# Lock guard: prevent concurrent installs/uninstalls corrupting CLAUDE.md
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
RESTORE_BACKUP=0
PURGE_PROJECT_ARTIFACTS=0
AUTO_YES=0
SUMMARY=()

emit() { printf '%s\n' "$*"; }
record() { SUMMARY+=("$1"); }

usage() {
  cat <<'USAGE'
kzk-harness global uninstall

Usage: bash install/uninstall-global.sh [flags]

Flags:
  --restore-backup          Restore most recent .kzk-bak-* instead of just
                            stripping the marker block
  --purge-project-artifacts List and delete (after typed confirm) per-project
                            kzk artifacts; default is list-only
  --yes                     Skip all confirmations (CI / ralph)
  -h, --help                Show this help

Exit codes: 0=success 1=nothing-to-uninstall 2=write-blocked/marker-corruption 3=user-aborted
USAGE
}

# ---------------------------------------------------------------------------
# parse_flags
# ---------------------------------------------------------------------------
parse_flags() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --restore-backup)
        RESTORE_BACKUP=1
        shift
        ;;
      --purge-project-artifacts)
        PURGE_PROJECT_ARTIFACTS=1
        shift
        ;;
      --yes)
        AUTO_YES=1
        shift
        ;;
      -h | --help)
        usage
        exit 0
        ;;
      *)
        shift
        ;;
    esac
  done
}

# ---------------------------------------------------------------------------
# Source the marker helpers (same as install-global.sh)
# ---------------------------------------------------------------------------
_source_marker_lib() {
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local lib="$script_dir/lib/claude-md-marker.sh"
  if [ ! -f "$lib" ]; then
    emit "ERROR: marker helper not found at $lib" >&2
    exit 2
  fi
  # shellcheck source=install/lib/claude-md-marker.sh
  # shellcheck disable=SC1091
  source "$lib"
}

# ---------------------------------------------------------------------------
# _find_most_recent_backup <claude_md_path>
# Prints the path of the most recent .kzk-bak-* file, or empty string.
# ---------------------------------------------------------------------------
_find_most_recent_backup() {
  local base="$1"
  # List candidates, sort descending, take first
  local best=""
  for f in "${base}".kzk-bak-*; do
    [ -f "$f" ] || continue
    if [ -z "$best" ] || [[ "$f" > "$best" ]]; then
      best="$f"
    fi
  done
  printf '%s\n' "$best"
}

# ---------------------------------------------------------------------------
# Step U1 — Remove marker block from ~/.claude/CLAUDE.md
# ---------------------------------------------------------------------------
remove_marker_block() {
  local claude_md="$HOME/.claude/CLAUDE.md"

  if [ ! -f "$claude_md" ]; then
    emit "no ~/.claude/CLAUDE.md found — nothing to strip"
    record "CLAUDE.md: not found, skipped"
    return 0
  fi

  if [ ! -w "$claude_md" ]; then
    emit "ERROR: $claude_md is not writable — fix permissions" >&2
    exit 2
  fi

  # Check for malformed marker (BEGIN present, END missing)
  if grep -qF "$KZK_MARKER_BEGIN" "$claude_md" &&
    ! grep -qF "$KZK_MARKER_END" "$claude_md"; then
    emit "ERROR: marker corruption (BEGIN found, END missing) — restore from backup manually:" >&2
    emit "  ls $claude_md.kzk-bak-*" >&2
    exit 2
  fi

  # --restore-backup: restore most recent backup instead of stripping
  if [ "$RESTORE_BACKUP" -eq 1 ]; then
    local backup
    backup="$(_find_most_recent_backup "$claude_md")"
    if [ -z "$backup" ]; then
      emit "WARNING: --restore-backup requested but no .kzk-bak-* found; stripping marker instead" >&2
      record "CLAUDE.md: no backup found, fell back to strip"
    else
      cp -p "$backup" "$claude_md"
      emit "  Restored from backup: $backup"
      record "CLAUDE.md: restored from $backup"
      return 0
    fi
  fi

  # Check if markers are present
  if ! grep -qF "$KZK_MARKER_BEGIN" "$claude_md"; then
    emit "  no kzk marker found, nothing to strip"
    record "CLAUDE.md: no marker present (already clean)"
    return 0
  fi

  # Assert OMC/gstack blocks survive (byte-diff assertion before/after)
  local omc_before="" gstack_before=""
  omc_before=$(awk '/<!-- OMC:START -->/,/<!-- OMC:END -->/' "$claude_md" 2>/dev/null || true)
  gstack_before=$(awk '/<!-- GSTACK:START -->/,/<!-- GSTACK:END -->/' "$claude_md" 2>/dev/null || true)

  # Strip the kzk marker block (atomic via mktemp + mv inside helper)
  local stripped
  stripped=$(mktemp)
  claude_md_strip_block "$claude_md" "$stripped"
  mv "$stripped" "$claude_md"

  emit "  kzk-harness marker block removed from $claude_md"
  record "CLAUDE.md: marker block stripped"

  # Post-strip OMC/gstack byte-diff assertion
  local omc_after="" gstack_after=""
  omc_after=$(awk '/<!-- OMC:START -->/,/<!-- OMC:END -->/' "$claude_md" 2>/dev/null || true)
  gstack_after=$(awk '/<!-- GSTACK:START -->/,/<!-- GSTACK:END -->/' "$claude_md" 2>/dev/null || true)

  if [ -n "$omc_before" ] && [ "$omc_before" != "$omc_after" ]; then
    emit "WARNING: OMC block changed during strip — check $claude_md manually" >&2
    record "CLAUDE.md: WARNING — OMC block diff detected after strip"
  fi
  if [ -n "$gstack_before" ] && [ "$gstack_before" != "$gstack_after" ]; then
    emit "WARNING: gstack block changed during strip — check $claude_md manually" >&2
    record "CLAUDE.md: WARNING — gstack block diff detected after strip"
  fi
}

# ---------------------------------------------------------------------------
# Step U2 — Remove skill dirs
# ---------------------------------------------------------------------------
remove_skill_dirs() {
  local skills_dst="$HOME/.claude/skills"
  local removed=0
  local nothing=1

  # Check for any kzk-* dirs first
  for d in "$skills_dst"/kzk-*/; do
    [ -d "$d" ] || [ -L "$d" ] || continue
    nothing=0
    break
  done

  if [ "$nothing" -eq 1 ] && [ ! -d "$skills_dst/.kzk-harness-shared" ]; then
    emit "  no kzk-* skill dirs found under $skills_dst"
    record "skill dirs: none found"
    # Return special code to signal nothing to uninstall
    return 1
  fi

  # Remove kzk-* dirs (glob; symlinks get rm not rm -rf per plan)
  for d in "$skills_dst"/kzk-*/; do
    local name
    name="$(basename "$d")"
    if [ -L "$d" ]; then
      rm "$d"
      emit "  Removed symlink: $name"
    elif [ -d "$d" ]; then
      rm -rf "$d"
      emit "  Removed dir: $name"
    fi
    removed=$((removed + 1))
  done

  # Remove umbrella dotfile
  if [ -d "$skills_dst/.kzk-harness-shared" ]; then
    rm -rf "$skills_dst/.kzk-harness-shared"
    emit "  Removed umbrella: .kzk-harness-shared"
    removed=$((removed + 1))
  elif [ -L "$skills_dst/.kzk-harness-shared" ]; then
    rm "$skills_dst/.kzk-harness-shared"
    emit "  Removed symlink: .kzk-harness-shared"
    removed=$((removed + 1))
  fi

  # Remove hook entry from ~/.claude/settings.json if present
  local settings="$HOME/.claude/settings.json"
  if [ -f "$settings" ] && command -v jq >/dev/null 2>&1; then
    local hook_marker=".kzk-harness-shared/hooks/keyword-detector.mjs"
    if grep -qF "$hook_marker" "$settings" 2>/dev/null; then
      local tmp
      tmp=$(mktemp)
      if jq 'del(.hooks.UserPromptSubmit[]? | select(.hooks[]?.command? | strings | test("kzk-harness-shared")))' \
        "$settings" >"$tmp" 2>/dev/null; then
        mv "$tmp" "$settings"
      else
        rm -f "$tmp"
      fi
      emit "  Removed kzk-harness hook entry from ~/.claude/settings.json"
      record "hooks: UserPromptSubmit entry removed"
    fi
  fi

  emit "  Removed $removed kzk-harness path(s)"
  record "skill dirs: $removed path(s) removed"
  return 0
}

# ---------------------------------------------------------------------------
# Step U3 — List orphaned per-project artifacts
# ---------------------------------------------------------------------------
list_orphaned_artifacts() {
  emit ""
  emit "Scanning for per-project kzk artifacts (capped at depth 5)..."

  local found_paths=()

  # Search patterns for per-project kzk artifacts
  while IFS= read -r p; do
    found_paths+=("$p")
  done < <(find "$HOME" -maxdepth 5 \( \
    -name "harness-flow-progress.md" -o \
    -name ".web-loop" -type d -o \
    -path "*/docs/harness" -type d -o \
    -path "*/docs/research/codex-reviews" -type d \
    \) 2>/dev/null | sort)

  if [ ${#found_paths[@]} -eq 0 ]; then
    emit "  No per-project kzk artifacts found."
    record "project artifacts: none found"
    return 0
  fi

  emit "  Found per-project kzk artifacts:"
  for p in "${found_paths[@]}"; do
    emit "    $p"
  done

  if [ "$PURGE_PROJECT_ARTIFACTS" -eq 0 ]; then
    emit ""
    emit "  (Pass --purge-project-artifacts to delete these. Default is list-only.)"
    record "project artifacts: ${#found_paths[@]} found (list-only, not deleted)"
    return 0
  fi

  # --purge-project-artifacts: confirm before deleting
  local answer="y"
  if [ "$AUTO_YES" -eq 0 ]; then
    emit ""
    printf 'Delete all %d per-project kzk artifact(s) listed above? Type "yes" to confirm: ' \
      "${#found_paths[@]}"
    read -r answer
    if [ "$answer" != "yes" ]; then
      emit "Aborted — no project artifacts deleted."
      record "project artifacts: purge aborted by user"
      exit 3
    fi
  fi

  local deleted=0
  for p in "${found_paths[@]}"; do
    if [ -d "$p" ]; then
      rm -rf "$p"
    elif [ -f "$p" ]; then
      rm -f "$p"
    fi
    emit "  Deleted: $p"
    deleted=$((deleted + 1))
  done
  record "project artifacts: $deleted deleted (--purge-project-artifacts)"
}

# ---------------------------------------------------------------------------
# Step U4 — Print summary
# ---------------------------------------------------------------------------
print_summary() {
  local claude_md="$HOME/.claude/CLAUDE.md"
  local backup_hint=""

  # Show any remaining backups
  for f in "${claude_md}".kzk-bak-*; do
    [ -f "$f" ] || continue
    backup_hint="$f"
    break
  done

  emit ""
  emit "=== kzk-harness uninstall summary ==="
  for line in "${SUMMARY[@]}"; do
    emit "  $line"
  done
  emit ""
  if [ -n "$backup_hint" ]; then
    emit "  CLAUDE.md backup(s) left in place for safety:"
    for f in "${claude_md}".kzk-bak-*; do
      [ -f "$f" ] && emit "    $f"
    done
    emit "  Remove manually when you are confident: rm ${claude_md}.kzk-bak-*"
  fi
  emit ""
  emit "  External dependencies (not auto-removed — other tools may use them):"
  emit "    pip uninstall code-review-graph"
  emit "    npm uninstall -g @openai/codex"
}

# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------
main() {
  parse_flags "$@"
  _source_marker_lib

  emit "kzk-harness: global uninstall starting..."
  emit ""

  # U1 — Strip marker block (or restore backup)
  remove_marker_block

  # U2 — Remove skill dirs; if nothing found, exit 1
  if ! remove_skill_dirs; then
    # Also check if marker was absent (fully clean state)
    if [ ${#SUMMARY[@]} -eq 0 ] || printf '%s\n' "${SUMMARY[@]}" | grep -q "no marker"; then
      emit "Nothing to uninstall."
      exit 1
    fi
  fi

  # U3 — List (and optionally purge) per-project artifacts
  list_orphaned_artifacts

  # U4 — Summary
  print_summary
}

main "$@"
