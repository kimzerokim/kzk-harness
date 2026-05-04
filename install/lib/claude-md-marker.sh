#!/usr/bin/env bash
# claude-md-marker.sh — idempotent BEGIN/END marker helpers for ~/.claude/CLAUDE.md.
# Source-only: do not invoke directly.
# Authoritative spec: docs/superpowers/specs/2026-05-04-kzk-global-install-design.md §6.4
# Authoritative plan: docs/plans/2026-05-04-kzk-global-install.md Task A

[ "${BASH_SOURCE[0]}" = "$0" ] && {
  printf 'do not invoke directly\n' >&2
  exit 1
}

export KZK_MARKER_BEGIN='<!-- BEGIN kzk-harness skills -->'
export KZK_MARKER_END='<!-- END kzk-harness skills -->'

# claude_md_block_present <file>
# Returns 0 if the BEGIN/END marker pair exists in <file>, 1 otherwise.
claude_md_block_present() {
  grep -qF "$KZK_MARKER_BEGIN" "$1" && grep -qF "$KZK_MARKER_END" "$1"
}

# claude_md_backup <file>
# Copies <file> to <file>.kzk-bak-<epoch>. Uses counter suffix on collision.
claude_md_backup() {
  local src="$1"
  local ts
  ts=$(date +%s)
  local dest="${src}.kzk-bak-${ts}"
  if [ -f "$dest" ]; then
    local n=1
    while [ -f "${dest}.$(printf '%03d' "$n")" ]; do
      n=$((n + 1))
    done
    dest="${dest}.$(printf '%03d' "$n")"
  fi
  cp -p "$src" "$dest"
  printf '%s\n' "$dest"
}

# claude_md_extract_block <file>
# Stdout: contents between markers (exclusive). Empty if absent.
claude_md_extract_block() {
  awk -v b="$KZK_MARKER_BEGIN" -v e="$KZK_MARKER_END" \
    '$0==b{f=1;next} $0==e{f=0;next} f' "$1"
}

# claude_md_strip_block <file> <dest>
# Removes the marker block (inclusive) from <file> AND a single blank line
# immediately preceding the BEGIN marker, mirroring the separator that
# claude_md_inject_block always adds. This is what makes install+uninstall
# byte-identity-preserving (verify-install.sh AC6).
claude_md_strip_block() {
  awk -v b="$KZK_MARKER_BEGIN" -v e="$KZK_MARKER_END" '
    BEGIN { skip = 0; prev_set = 0 }
    {
      if (skip) {
        if ($0 == e) skip = 0
        next
      }
      if ($0 == b) {
        # Drop the buffered prev line if it is the blank separator inject added
        if (prev_set && prev == "") prev_set = 0
        skip = 1
        next
      }
      if (prev_set) print prev
      prev = $0
      prev_set = 1
    }
    END { if (prev_set) print prev }
  ' "$1" >"$2"
}

# claude_md_inject_block <stripped-file> <new-block-content-file> <dest>
# Appends the marker-wrapped block from <new-block-content-file> to <stripped-file>
# and writes the result atomically to <dest>.
# Returns 0 on success, 1 on error.
claude_md_inject_block() {
  local src="$1"
  local block_file="$2"
  local dest="$3"
  local tmp
  tmp=$(mktemp)
  cat "$src" >"$tmp"
  # Ensure there is a trailing newline before the marker
  if [ -s "$tmp" ]; then
    # Always add a blank line separator before the marker block
    printf '\n' >>"$tmp"
  fi
  {
    printf '%s\n' "$KZK_MARKER_BEGIN"
    cat "$block_file"
    printf '%s\n' "$KZK_MARKER_END"
  } >>"$tmp"
  mv "$tmp" "$dest"
}
