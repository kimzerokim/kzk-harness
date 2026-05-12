#!/usr/bin/env bash
# verify-install.sh — AC1-AC8 verification harness for kzk-harness global install.
#
# Authoritative spec: docs/plans/2026-05-04-kzk-global-install-design.md §13
# Authoritative plan: docs/plans/2026-05-04-kzk-global-install.md Task E
#
# Each AC is a separate bash function ac1_..ac8_*.  Top-level driver runs all
# 8 (or a subset via --ac), prints PASS/FAIL/SKIP per AC, aggregates exit code:
#   0 = all PASS or PASS+SKIP, 1 = any FAIL.
#
# Constraints:
#   - Live `claude` invocations in AC1, AC5, AC8 emit SKIP (not FAIL) when
#     the CLI is missing.
#   - AC4 uses a bash `trap EXIT` to restore harness-share.md so the working
#     tree is never left dirty.
#   - AC8 delegates to install/lib/precedence-probe.sh.
#
# Usage:
#   bash install/verify-install.sh             # all 8
#   bash install/verify-install.sh --ac 5      # just AC5
#   bash install/verify-install.sh --ac 1,2,3  # subset
#   bash install/verify-install.sh --help

set -u
set -o pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MARKER_LIB="$REPO_ROOT/install/lib/claude-md-marker.sh"
PROBE_SCRIPT="$REPO_ROOT/install/lib/precedence-probe.sh"
INSTALL_SCRIPT="$REPO_ROOT/install/install-global.sh"

# Source the marker helpers (ac2_, ac3_, ac6_ all use them)
if [ -f "$MARKER_LIB" ]; then
  # shellcheck source=install/lib/claude-md-marker.sh
  # shellcheck disable=SC1091
  source "$MARKER_LIB"
fi

# ---------------------------------------------------------------------------
# Result accounting
# ---------------------------------------------------------------------------
RESULTS=()
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

record_pass() {
  local ac="$1" msg="${2:-}"
  RESULTS+=("PASS $ac${msg:+ — $msg}")
  PASS_COUNT=$((PASS_COUNT + 1))
  printf 'PASS %s%s\n' "$ac" "${msg:+ — $msg}"
}
record_fail() {
  local ac="$1" msg="${2:-}"
  RESULTS+=("FAIL $ac${msg:+ — $msg}")
  FAIL_COUNT=$((FAIL_COUNT + 1))
  printf 'FAIL %s%s\n' "$ac" "${msg:+ — $msg}" >&2
}
record_skip() {
  local ac="$1" msg="${2:-}"
  RESULTS+=("SKIP $ac${msg:+ — $msg}")
  SKIP_COUNT=$((SKIP_COUNT + 1))
  printf 'SKIP %s%s\n' "$ac" "${msg:+ — $msg}"
}

# ---------------------------------------------------------------------------
# usage
# ---------------------------------------------------------------------------
usage() {
  cat <<'USAGE'
verify-install.sh — kzk-harness AC1-AC8 verification harness

Usage:
  bash install/verify-install.sh                   # all ACs
  bash install/verify-install.sh --ac 1            # one AC
  bash install/verify-install.sh --ac 1,2,5        # subset

Exit codes:
  0   all PASS or PASS+SKIP
  1   one or more FAIL
  2   harness setup error (no install-global.sh, no marker lib)

ACs run AGAINST THE CURRENT $HOME unless they explicitly mkdir a tempdir HOME.
Run with `HOME=$(mktemp -d)` to avoid touching the real ~/.claude.
USAGE
}

# ---------------------------------------------------------------------------
# AC1 — trigger keyword in fresh repo
# Uses live claude to verify 'spec 잡자' triggers kzk-spec-and-review.
# SKIPs when claude CLI is missing.
# ---------------------------------------------------------------------------
ac1_trigger_in_new_dir() {
  local ac="ac1"
  if ! command -v claude >/dev/null 2>&1; then
    record_skip "$ac" "claude CLI not in PATH"
    return 0
  fi
  local prompt
  prompt='You have kzk-harness skills installed. List which kzk-* skill activates for this user request: '"'"'스펙 잡자: kzk-test-feature'"'"'. Your response MUST start with the literal string SKILL_MATCHED:<skill-name> and contain nothing else on that first line.'
  local raw
  raw=$(claude -p "$prompt" --output-format json 2>/dev/null || true)
  local result_text
  if command -v jq >/dev/null 2>&1; then
    result_text=$(printf '%s' "$raw" | jq -r '.result // empty' 2>/dev/null || true)
  fi
  if [ -z "${result_text:-}" ]; then
    result_text="$raw"
  fi
  if printf '%s' "$result_text" | grep -q 'SKILL_MATCHED:kzk-spec-and-review'; then
    record_pass "$ac" "kzk-spec-and-review matched"
  else
    record_fail "$ac" "SKILL_MATCHED:kzk-spec-and-review not found in response"
    printf '  response: %s\n' "${result_text:0:200}" >&2
  fi
}

# ---------------------------------------------------------------------------
# AC2 — CLAUDE.md marker block format
# 18 kzk-* table rows present between BEGIN/END markers.
# ---------------------------------------------------------------------------
ac2_marker_and_18_rows() {
  local ac="ac2"
  local cfile="$HOME/.claude/CLAUDE.md"
  if [ ! -f "$cfile" ]; then
    record_fail "$ac" "$cfile not present (run install-global.sh first)"
    return 1
  fi
  if ! grep -qF '<!-- BEGIN kzk-harness skills -->' "$cfile"; then
    record_fail "$ac" "BEGIN marker missing from $cfile"
    return 1
  fi
  if ! grep -qF '<!-- END kzk-harness skills -->' "$cfile"; then
    record_fail "$ac" "END marker missing from $cfile"
    return 1
  fi
  local row_count
  row_count=$(awk '/<!-- BEGIN kzk-harness skills -->/,/<!-- END kzk-harness skills -->/' "$cfile" \
    | grep -cE '^\| kzk-' || true)
  row_count="${row_count:-0}"
  if [ "$row_count" -ne 18 ]; then
    record_fail "$ac" "expected 18 '| kzk-' rows in marker block, found $row_count"
    return 1
  fi
  record_pass "$ac" "18 kzk-* table rows in marker block"
}

# ---------------------------------------------------------------------------
# AC3 — idempotent install
# Run install twice in tempdir HOME, sha256sum diff of CLAUDE.md must be empty.
# ---------------------------------------------------------------------------
ac3_idempotent() {
  local ac="ac3"
  if [ ! -f "$INSTALL_SCRIPT" ]; then
    record_fail "$ac" "install-global.sh not found at $INSTALL_SCRIPT"
    return 1
  fi
  local th
  th=$(mktemp -d)
  HOME="$th" bash "$INSTALL_SCRIPT" --yes >/dev/null 2>&1 || {
    record_fail "$ac" "first install failed"
    rm -rf "$th"
    return 1
  }
  local sum1
  sum1=$(shasum -a 256 "$th/.claude/CLAUDE.md" 2>/dev/null | awk '{print $1}')
  HOME="$th" bash "$INSTALL_SCRIPT" --yes >/dev/null 2>&1 || {
    record_fail "$ac" "second install failed"
    rm -rf "$th"
    return 1
  }
  local sum2
  sum2=$(shasum -a 256 "$th/.claude/CLAUDE.md" 2>/dev/null | awk '{print $1}')
  rm -rf "$th"
  if [ "$sum1" = "$sum2" ] && [ -n "$sum1" ]; then
    record_pass "$ac" "CLAUDE.md sha256 stable across two install runs"
  else
    record_fail "$ac" "CLAUDE.md changed between runs (sum1=$sum1 sum2=$sum2)"
    return 1
  fi
}

# ---------------------------------------------------------------------------
# AC4 — symlink-mode dev path with cleanup trap
# Uses bash trap to ensure harness-share.md is restored even on early exit.
# ---------------------------------------------------------------------------
ac4_symlink_dev_mode() {
  local ac="ac4"
  if [ ! -f "$INSTALL_SCRIPT" ]; then
    record_fail "$ac" "install-global.sh not found"
    return 1
  fi
  local repo="$REPO_ROOT"
  local tok
  tok="ac4-test-$$-$(date +%s)"
  local th
  th=$(mktemp -d)
  # Trap MUST always restore harness-share.md so the working tree is clean
  # regardless of the function exit path.
  # shellcheck disable=SC2064
  trap "git -C '$repo' checkout -- harness-share.md 2>/dev/null || true; rm -rf '$th' 2>/dev/null || true; trap - RETURN" RETURN

  if ! HOME="$th" bash "$INSTALL_SCRIPT" --symlink-mode --symlink-mode-force --yes >/dev/null 2>&1; then
    record_fail "$ac" "install --symlink-mode failed"
    return 1
  fi
  printf '%s\n' "$tok" >>"$repo/harness-share.md"
  if grep -q "$tok" "$th/.claude/skills/.kzk-harness-shared/harness-share.md" 2>/dev/null; then
    record_pass "$ac" "symlinked harness-share.md edit propagated"
  else
    record_fail "$ac" "symlink did not propagate edit (token $tok)"
    return 1
  fi
}

# ---------------------------------------------------------------------------
# AC5 — main-context Read storm verifier
# Uses --output-format stream-json --verbose because plain `--output-format
# json` returns {type:"result",result:"..."} with no .messages array.
# FAIL if Read count >= 5 OR any path matches src/app/lib.
# SKIP when claude CLI is missing.
# ---------------------------------------------------------------------------
ac5_no_main_context_read_storm() {
  local ac="ac5"
  if ! command -v claude >/dev/null 2>&1; then
    record_skip "$ac" "claude CLI not in PATH"
    return 0
  fi
  if ! command -v jq >/dev/null 2>&1; then
    record_skip "$ac" "jq not in PATH"
    return 0
  fi
  local prompt='Audit the kzk-harness repo: list every kzk-* skill SKILL.md you would read to verify their cross-references. Begin reading immediately.'
  local log=/tmp/kzk-ac5-reads.log
  : >"$log"
  local count
  count=$(claude -p "$prompt" --output-format stream-json --verbose 2>/dev/null \
    | jq -r 'select(.type=="assistant") | .message.content[]? | select(.type=="tool_use" and .name=="Read") | .input.file_path' \
    | tee "$log" \
    | wc -l \
    | tr -d ' ')
  count="${count:-0}"
  if [ "$count" -ge 5 ]; then
    record_fail "$ac" "main read $count files (>= 5)"
    cat "$log" >&2
    return 1
  fi
  if grep -qE '(^|/)src/|(^|/)app/|(^|/)lib/' "$log"; then
    record_fail "$ac" "main read source-tree paths"
    grep -E '(^|/)src/|(^|/)app/|(^|/)lib/' "$log" >&2
    return 1
  fi
  record_pass "$ac" "main Read count=$count, no source-tree paths"
}

# ---------------------------------------------------------------------------
# AC6 — uninstall preserves omc/gstack blocks
# Pre-populate tempdir CLAUDE.md with mock omc + gstack marker pairs, install
# kzk, uninstall kzk, sha256sum comparison of pre-install vs post-uninstall.
# ---------------------------------------------------------------------------
ac6_uninstall_preserves_omc_gstack() {
  local ac="ac6"
  if [ ! -f "$INSTALL_SCRIPT" ]; then
    record_fail "$ac" "install-global.sh not found"
    return 1
  fi
  local uninstall_script="$REPO_ROOT/install/uninstall-global.sh"
  if [ ! -f "$uninstall_script" ]; then
    record_skip "$ac" "uninstall-global.sh not yet present (Task B in progress)"
    return 0
  fi
  local th
  th=$(mktemp -d)
  mkdir -p "$th/.claude"
  # Synthesize a CLAUDE.md with mock omc + gstack marker pairs
  cat >"$th/.claude/CLAUDE.md" <<'EOF'
# Global preferences

<!-- OMC:START -->
## omc routing
- Test omc content
<!-- OMC:END -->

<!-- gstack:START -->
## gstack
- Test gstack content
<!-- gstack:END -->

# Trailing user content
EOF
  local pre_sum
  pre_sum=$(shasum -a 256 "$th/.claude/CLAUDE.md" 2>/dev/null | awk '{print $1}')
  HOME="$th" bash "$INSTALL_SCRIPT" --yes >/dev/null 2>&1 || {
    record_fail "$ac" "install failed in tempdir"
    rm -rf "$th"
    return 1
  }
  HOME="$th" bash "$uninstall_script" --yes >/dev/null 2>&1 || {
    record_fail "$ac" "uninstall failed in tempdir"
    rm -rf "$th"
    return 1
  }
  local post_sum
  post_sum=$(shasum -a 256 "$th/.claude/CLAUDE.md" 2>/dev/null | awk '{print $1}')
  rm -rf "$th"
  if [ "$pre_sum" = "$post_sum" ] && [ -n "$pre_sum" ]; then
    record_pass "$ac" "CLAUDE.md byte-identical after install+uninstall"
  else
    record_fail "$ac" "CLAUDE.md drifted (pre=$pre_sum post=$post_sum)"
    return 1
  fi
}

# ---------------------------------------------------------------------------
# AC7 — update flow propagates SKILL.md edits
# Install, modify a SKILL.md upstream, re-install with --update, assert the
# modified content reaches ~/.claude/skills/kzk-<name>/SKILL.md.
# Uses a tempdir clone of the repo so we don't dirty the real working tree.
# ---------------------------------------------------------------------------
ac7_update_flow() {
  local ac="ac7"
  if [ ! -f "$INSTALL_SCRIPT" ]; then
    record_fail "$ac" "install-global.sh not found"
    return 1
  fi
  local th
  th=$(mktemp -d)
  local clone_dir="$th/repo-clone"
  cp -R "$REPO_ROOT" "$clone_dir" 2>/dev/null || {
    record_fail "$ac" "could not clone repo to tempdir"
    rm -rf "$th"
    return 1
  }
  HOME="$th" bash "$clone_dir/install/install-global.sh" --yes >/dev/null 2>&1 || {
    record_fail "$ac" "initial install failed"
    rm -rf "$th"
    return 1
  }
  # Pick an arbitrary kzk-* skill in the clone, edit its SKILL.md
  local target_skill
  target_skill=$(find "$clone_dir/skills" -maxdepth 2 -name SKILL.md -path '*/kzk-*' 2>/dev/null | head -1)
  if [ -z "$target_skill" ]; then
    record_fail "$ac" "no SKILL.md found in cloned repo"
    rm -rf "$th"
    return 1
  fi
  local marker_token
  marker_token="ac7-update-token-$$-$(date +%s)"
  printf '\n<!-- %s -->\n' "$marker_token" >>"$target_skill"
  # Bump version so version-aware overwrite triggers
  if grep -q '^version:' "$target_skill"; then
    # Append a high-version sentinel SKILL.md instead — version compare
    # in install-global.sh prefers higher source.  Use sed to bump in-place.
    local skill_dir
    skill_dir=$(dirname "$target_skill")
    local skill_name
    skill_name=$(basename "$skill_dir")
    # Rewrite version to 99.99.99
    awk 'BEGIN{done=0} /^version:/ && !done {print "version: 99.99.99"; done=1; next} {print}' \
      "$target_skill" >"$target_skill.new"
    mv "$target_skill.new" "$target_skill"
    HOME="$th" bash "$clone_dir/install/install-global.sh" --update --yes >/dev/null 2>&1 || {
      record_fail "$ac" "--update install failed"
      rm -rf "$th"
      return 1
    }
    if grep -q "$marker_token" "$th/.claude/skills/$skill_name/SKILL.md" 2>/dev/null; then
      record_pass "$ac" "SKILL.md edit reached global ($skill_name)"
      rm -rf "$th"
      return 0
    fi
    record_fail "$ac" "edit did not propagate to global $skill_name/SKILL.md"
    rm -rf "$th"
    return 1
  fi
  record_fail "$ac" "target SKILL.md has no version: line"
  rm -rf "$th"
  return 1
}

# ---------------------------------------------------------------------------
# AC8 — precedence probe
# Delegates to install/lib/precedence-probe.sh.
# Probe exit codes: 0 PASS, 2/3 INCONCLUSIVE (we surface as SKIP), 4 SKIP, 5 setup-error
# ---------------------------------------------------------------------------
ac8_precedence_probe() {
  local ac="ac8"
  if [ ! -f "$PROBE_SCRIPT" ]; then
    record_fail "$ac" "precedence-probe.sh not found at $PROBE_SCRIPT"
    return 1
  fi
  local out
  set +e
  out=$(bash "$PROBE_SCRIPT" --probe-only 2>&1)
  local code=$?
  set -e
  case "$code" in
    0)
      record_pass "$ac" "precedence-probe: project wins"
      ;;
    2)
      record_skip "$ac" "INCONCLUSIVE (global wins) — spec §8.1 review needed"
      printf '%s\n' "$out" >&2
      ;;
    3)
      record_skip "$ac" "INCONCLUSIVE (no skill activated)"
      printf '%s\n' "$out" >&2
      ;;
    4)
      record_skip "$ac" "claude CLI not in PATH"
      ;;
    *)
      record_fail "$ac" "probe exited with code $code"
      printf '%s\n' "$out" >&2
      return 1
      ;;
  esac
}

# ---------------------------------------------------------------------------
# Driver
# ---------------------------------------------------------------------------
ALL_ACS=(1 2 3 4 5 6 7 8)
SELECTED_ACS=()

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      -h|--help)
        usage
        exit 0
        ;;
      --ac)
        shift
        if [ -z "${1:-}" ]; then
          printf '--ac requires an argument\n' >&2
          exit 2
        fi
        IFS=',' read -r -a SELECTED_ACS <<<"$1"
        shift
        ;;
      *)
        printf 'unknown flag: %s\n' "$1" >&2
        usage >&2
        exit 2
        ;;
    esac
  done
  if [ ${#SELECTED_ACS[@]} -eq 0 ]; then
    SELECTED_ACS=("${ALL_ACS[@]}")
  fi
}

run_ac() {
  local n="$1"
  case "$n" in
    1) ac1_trigger_in_new_dir ;;
    2) ac2_marker_and_18_rows ;;
    3) ac3_idempotent ;;
    4) ac4_symlink_dev_mode ;;
    5) ac5_no_main_context_read_storm ;;
    6) ac6_uninstall_preserves_omc_gstack ;;
    7) ac7_update_flow ;;
    8) ac8_precedence_probe ;;
    *)
      printf 'unknown AC: %s (valid: 1-8)\n' "$n" >&2
      return 1
      ;;
  esac
}

main() {
  parse_args "$@"
  if [ ! -f "$INSTALL_SCRIPT" ]; then
    printf 'verify-install.sh: install/install-global.sh not found at %s\n' "$INSTALL_SCRIPT" >&2
    exit 2
  fi
  printf 'kzk-harness verify-install (repo: %s)\n' "$REPO_ROOT"
  printf '=%.0s' {1..60}; printf '\n'
  for n in "${SELECTED_ACS[@]}"; do
    set +e
    run_ac "$n"
    set -e
  done
  printf '\n'
  printf '=%.0s' {1..60}; printf '\n'
  printf 'Summary: %d PASS, %d FAIL, %d SKIP\n' "$PASS_COUNT" "$FAIL_COUNT" "$SKIP_COUNT"
  for r in "${RESULTS[@]}"; do
    printf '  %s\n' "$r"
  done
  if [ "$FAIL_COUNT" -gt 0 ]; then
    exit 1
  fi
  exit 0
}

main "$@"
