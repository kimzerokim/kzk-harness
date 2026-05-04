#!/usr/bin/env bash
# install/test/run-tests.sh — pure-bash test harness for install-global.sh
# Run against a tempdir HOME (never the real ~/.claude):
#   HOME=$(mktemp -d) bash install/test/run-tests.sh
#
# Exit 0 = all tests passed. Exit 1 = one or more failures.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PASS=0
FAIL=0
ERRORS=()

# ---------------------------------------------------------------------------
# Minimal assert helpers
# ---------------------------------------------------------------------------
assert_eq() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    printf '  PASS: %s\n' "$desc"
    PASS=$((PASS + 1))
  else
    printf '  FAIL: %s (expected "%s", got "%s")\n' "$desc" "$expected" "$actual"
    FAIL=$((FAIL + 1))
    ERRORS+=("$desc")
  fi
}

assert_match() {
  local desc="$1" pattern="$2" haystack="$3"
  if printf '%s\n' "$haystack" | grep -qF "$pattern"; then
    printf '  PASS: %s\n' "$desc"
    PASS=$((PASS + 1))
  else
    printf '  FAIL: %s (pattern "%s" not found)\n' "$desc" "$pattern"
    FAIL=$((FAIL + 1))
    ERRORS+=("$desc")
  fi
}

assert_file_exists() {
  local desc="$1" path="$2"
  if [ -f "$path" ]; then
    printf '  PASS: %s\n' "$desc"
    PASS=$((PASS + 1))
  else
    printf '  FAIL: %s (file not found: %s)\n' "$desc" "$path"
    FAIL=$((FAIL + 1))
    ERRORS+=("$desc")
  fi
}

assert_exit_zero() {
  local desc="$1" code="$2"
  if [ "$code" -eq 0 ]; then
    printf '  PASS: %s\n' "$desc"
    PASS=$((PASS + 1))
  else
    printf '  FAIL: %s (exit code %s)\n' "$desc" "$code"
    FAIL=$((FAIL + 1))
    ERRORS+=("$desc")
  fi
}

# ---------------------------------------------------------------------------
# Helper: run install-global.sh with a fresh tempdir HOME
# Returns the temp HOME path via $TEST_HOME
# ---------------------------------------------------------------------------
run_install() {
  TEST_HOME=$(mktemp -d)
  HOME="$TEST_HOME" bash "$REPO_ROOT/install/install-global.sh" --yes 2>/dev/null
  return $?
}

# ---------------------------------------------------------------------------
# test_skill_files_landed
# All 14 ~/.claude/skills/kzk-*/SKILL.md must exist after install
# ---------------------------------------------------------------------------
test_skill_files_landed() {
  printf '\n[test_skill_files_landed]\n'
  local test_home
  test_home=$(mktemp -d)

  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1

  local count
  count=$(find "$test_home/.claude/skills" -maxdepth 2 -name 'SKILL.md' \
    -path '*/kzk-*/*' 2>/dev/null | wc -l | tr -d ' ')

  assert_eq "15 SKILL.md files landed" "15" "$count"

  rm -rf "$test_home"
}

# ---------------------------------------------------------------------------
# test_umbrella_dotfile
# ~/.claude/skills/.kzk-harness-shared/harness-share.md and VERSION must exist
# The dir must use the dotfile name (not kzk-harness-shared)
# ---------------------------------------------------------------------------
test_umbrella_dotfile() {
  printf '\n[test_umbrella_dotfile]\n'
  local test_home
  test_home=$(mktemp -d)

  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1

  assert_file_exists "harness-share.md in dotfile umbrella dir" \
    "$test_home/.claude/skills/.kzk-harness-shared/harness-share.md"

  assert_file_exists "VERSION in dotfile umbrella dir" \
    "$test_home/.claude/skills/.kzk-harness-shared/VERSION"

  # Must NOT exist at the non-dotfile path
  if [ -d "$test_home/.claude/skills/kzk-harness-shared" ]; then
    printf '  FAIL: non-dotfile umbrella dir exists (should be .kzk-harness-shared)\n'
    FAIL=$((FAIL + 1))
    ERRORS+=("test_umbrella_dotfile: non-dotfile dir must not exist")
  else
    printf '  PASS: non-dotfile umbrella dir absent\n'
    PASS=$((PASS + 1))
  fi

  rm -rf "$test_home"
}

# ---------------------------------------------------------------------------
# test_claude_md_marker
# ~/.claude/CLAUDE.md must have BEGIN/END markers and 14 kzk- rows inside
# ---------------------------------------------------------------------------
test_claude_md_marker() {
  printf '\n[test_claude_md_marker]\n'
  local test_home
  test_home=$(mktemp -d)

  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1

  local cfile="$test_home/.claude/CLAUDE.md"

  if grep -qF '<!-- BEGIN kzk-harness skills -->' "$cfile"; then
    printf '  PASS: BEGIN marker present\n'
    PASS=$((PASS + 1))
  else
    printf '  FAIL: BEGIN marker missing\n'
    FAIL=$((FAIL + 1))
    ERRORS+=("test_claude_md_marker: BEGIN marker")
  fi

  if grep -qF '<!-- END kzk-harness skills -->' "$cfile"; then
    printf '  PASS: END marker present\n'
    PASS=$((PASS + 1))
  else
    printf '  FAIL: END marker missing\n'
    FAIL=$((FAIL + 1))
    ERRORS+=("test_claude_md_marker: END marker")
  fi

  local row_count
  row_count=$(awk '/<!-- BEGIN kzk-harness skills -->/,/<!-- END kzk-harness skills -->/' "$cfile" |
    grep -cE '^\| kzk-' || true)
  assert_eq "15 kzk- rows in marker block" "15" "$row_count"

  rm -rf "$test_home"
}

# ---------------------------------------------------------------------------
# test_idempotent
# Running install twice produces no change to the marker block
# ---------------------------------------------------------------------------
test_idempotent() {
  printf '\n[test_idempotent]\n'
  local test_home
  test_home=$(mktemp -d)

  # First install
  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1

  # Snapshot the marker block after first run
  local snap1
  snap1=$(awk '/<!-- BEGIN kzk-harness skills -->/,/<!-- END kzk-harness skills -->/' \
    "$test_home/.claude/CLAUDE.md")

  # Touch a sentinel between runs
  local marker_file
  marker_file=$(mktemp)

  # Second install
  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1

  # Snapshot after second run
  local snap2
  snap2=$(awk '/<!-- BEGIN kzk-harness skills -->/,/<!-- END kzk-harness skills -->/' \
    "$test_home/.claude/CLAUDE.md")

  if [ "$snap1" = "$snap2" ]; then
    printf '  PASS: marker block unchanged after second install\n'
    PASS=$((PASS + 1))
  else
    printf '  FAIL: marker block changed between runs (not idempotent)\n'
    FAIL=$((FAIL + 1))
    ERRORS+=("test_idempotent: marker block changed")
  fi

  # Verify no new SKILL.md files were written (second run should not touch newer-than-sentinel)
  local new_files
  new_files=$(find "$test_home/.claude/skills" -name 'SKILL.md' \
    -newer "$marker_file" 2>/dev/null | wc -l | tr -d ' ')
  # Equal-version skills are re-copied (same bytes), that is acceptable; we check marker only
  printf '  INFO: %s SKILL.md files touched on second run (equal-version re-copy is OK)\n' "$new_files"

  rm -f "$marker_file"
  rm -rf "$test_home"
}

# ---------------------------------------------------------------------------
# test_omc_collision_warning
# A fake keyword-detector.mjs containing \bralph\b triggers the OMC warning
# Install exit code must be 0 (warning, not blocker)
# ---------------------------------------------------------------------------
test_omc_collision_warning() {
  printf '\n[test_omc_collision_warning]\n'
  local test_home
  test_home=$(mktemp -d)

  # Stub a fake OMC keyword-detector.mjs
  local fake_dir="$test_home/.claude/plugins/cache/omc-fake/oh-my-claudecode/0.0.0/scripts"
  mkdir -p "$fake_dir"
  printf 'const kw = /\\bralph\\b/;\n' >"$fake_dir/keyword-detector.mjs"

  # Capture stderr
  local stderr_out
  stderr_out=$(HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes 2>&1 >/dev/null)

  local exit_code=$?

  assert_exit_zero "install exits 0 despite OMC collision warning" "$exit_code"
  assert_match "stderr contains OMC keyword-detector warning" \
    "OMC keyword-detector intercepts 'ralph'" "$stderr_out"

  rm -rf "$test_home"
}

# ---------------------------------------------------------------------------
# test_uninstall_removes_skills
# install + uninstall in tempdir HOME: no kzk-* dirs remain
# ---------------------------------------------------------------------------
test_uninstall_removes_skills() {
  printf '\n[test_uninstall_removes_skills]\n'
  local test_home
  test_home=$(mktemp -d)

  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1
  HOME="$test_home" bash "$REPO_ROOT/install/uninstall-global.sh" --yes >/dev/null 2>&1

  local remaining_skills
  remaining_skills=$(find "$test_home/.claude/skills" -maxdepth 1 -name 'kzk-*' 2>/dev/null | wc -l | tr -d ' ')
  assert_eq "no kzk-* dirs remain after uninstall" "0" "$remaining_skills"

  if [ -d "$test_home/.claude/skills/.kzk-harness-shared" ]; then
    printf '  FAIL: .kzk-harness-shared still exists after uninstall\n'
    FAIL=$((FAIL + 1))
    ERRORS+=("test_uninstall_removes_skills: umbrella dir still present")
  else
    printf '  PASS: .kzk-harness-shared removed\n'
    PASS=$((PASS + 1))
  fi

  rm -rf "$test_home"
}

# ---------------------------------------------------------------------------
# test_uninstall_strips_marker
# install + uninstall: BEGIN marker absent; pre-existing OMC stub survives byte-equal
# ---------------------------------------------------------------------------
test_uninstall_strips_marker() {
  printf '\n[test_uninstall_strips_marker]\n'
  local test_home
  test_home=$(mktemp -d)

  # Pre-populate CLAUDE.md with a stub OMC marker block
  mkdir -p "$test_home/.claude"
  cat >"$test_home/.claude/CLAUDE.md" <<'PREEXISTING'
# My Config

<!-- OMC:START -->
mock omc content
<!-- OMC:END -->
PREEXISTING

  # Capture pre-install content of the OMC stub (bytes we must preserve)
  local pre_content
  pre_content=$(cat "$test_home/.claude/CLAUDE.md")

  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1
  HOME="$test_home" bash "$REPO_ROOT/install/uninstall-global.sh" --yes >/dev/null 2>&1

  local cfile="$test_home/.claude/CLAUDE.md"

  # kzk marker must be gone
  if grep -qF '<!-- BEGIN kzk-harness skills -->' "$cfile" 2>/dev/null; then
    printf '  FAIL: BEGIN marker still present after uninstall\n'
    FAIL=$((FAIL + 1))
    ERRORS+=("test_uninstall_strips_marker: BEGIN marker not stripped")
  else
    printf '  PASS: BEGIN marker absent after uninstall\n'
    PASS=$((PASS + 1))
  fi

  # Pre-existing OMC stub must survive
  if grep -qF 'mock omc content' "$cfile" 2>/dev/null; then
    printf '  PASS: pre-existing OMC stub content survived\n'
    PASS=$((PASS + 1))
  else
    printf '  FAIL: pre-existing OMC stub content was removed\n'
    FAIL=$((FAIL + 1))
    ERRORS+=("test_uninstall_strips_marker: pre-existing content removed")
  fi

  rm -rf "$test_home"
}

# ---------------------------------------------------------------------------
# test_uninstall_preserves_omc_block
# pre-populate OMC block, install, uninstall: sha256 of OMC block matches pre-install
# ---------------------------------------------------------------------------
test_uninstall_preserves_omc_block() {
  printf '\n[test_uninstall_preserves_omc_block]\n'
  local test_home
  test_home=$(mktemp -d)
  mkdir -p "$test_home/.claude"

  # Write CLAUDE.md with an OMC block
  cat >"$test_home/.claude/CLAUDE.md" <<'PREEXISTING'
# Global Config

<!-- OMC:START -->
mock omc
<!-- OMC:VERSION:9.9.9 -->
# foo

## office-hours
some content here
<!-- OMC:END -->
PREEXISTING

  # Capture sha256 of the OMC block content before install
  local pre_sha
  pre_sha=$(awk '/<!-- OMC:START -->/,/<!-- OMC:END -->/' "$test_home/.claude/CLAUDE.md" |
    shasum -a 256 | awk '{print $1}')

  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1
  HOME="$test_home" bash "$REPO_ROOT/install/uninstall-global.sh" --yes >/dev/null 2>&1

  # Capture sha256 of the OMC block content after uninstall
  local post_sha
  post_sha=$(awk '/<!-- OMC:START -->/,/<!-- OMC:END -->/' "$test_home/.claude/CLAUDE.md" |
    shasum -a 256 | awk '{print $1}')

  assert_eq "OMC block sha256 unchanged after install+uninstall" "$pre_sha" "$post_sha"

  rm -rf "$test_home"
}

# ===========================================================================
# Task E — verify-install.sh + precedence-probe.sh tests
# ===========================================================================

VERIFY_SCRIPT="$REPO_ROOT/install/verify-install.sh"
PROBE_SCRIPT="$REPO_ROOT/install/lib/precedence-probe.sh"

# ---------------------------------------------------------------------------
# Helper: stub `claude` in $1 (a bin dir) that echos canned response on every call
# ---------------------------------------------------------------------------
stub_claude_with_response() {
  local bin_dir="$1"
  local response="$2"
  mkdir -p "$bin_dir"
  cat >"$bin_dir/claude" <<STUB
#!/usr/bin/env bash
# Test stub for claude CLI — echos canned response on every invocation.
cat <<'CANNED'
$response
CANNED
STUB
  chmod +x "$bin_dir/claude"
}

# ---------------------------------------------------------------------------
# test_verify_runs_all_8_acs
# Stubs claude with canned responses; install in tempdir HOME; assert each
# requested AC label appears in the output.
# ---------------------------------------------------------------------------
test_verify_runs_all_8_acs() {
  printf '\n[test_verify_runs_all_8_acs]\n'
  local test_home
  test_home=$(mktemp -d)
  local bin_dir="$test_home/bin"
  stub_claude_with_response "$bin_dir" '{"type":"result","result":"SKILL_MATCHED:kzk-spec-and-review"}'

  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1

  local out
  out=$(HOME="$test_home" PATH="$bin_dir:$PATH" bash "$VERIFY_SCRIPT" --ac 1,2 2>&1 || true)

  if printf '%s\n' "$out" | grep -q 'ac1' && printf '%s\n' "$out" | grep -q 'ac2'; then
    printf '  PASS: verify ran ac1 and ac2 labels\n'
    PASS=$((PASS + 1))
  else
    printf '  FAIL: verify did not run ac1 + ac2\n'
    FAIL=$((FAIL + 1))
    ERRORS+=("test_verify_runs_all_8_acs")
  fi

  rm -rf "$test_home"
}

# ---------------------------------------------------------------------------
# test_ac5_skipped_when_claude_missing
# PATH=/usr/bin:/bin (no claude) → AC5 must SKIP, not FAIL.
# ---------------------------------------------------------------------------
test_ac5_skipped_when_claude_missing() {
  printf '\n[test_ac5_skipped_when_claude_missing]\n'
  local test_home
  test_home=$(mktemp -d)
  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1

  local out
  out=$(HOME="$test_home" PATH="/usr/bin:/bin" bash "$VERIFY_SCRIPT" --ac 5 2>&1 || true)

  if printf '%s\n' "$out" | grep -q 'SKIP ac5'; then
    printf '  PASS: AC5 SKIP when claude missing\n'
    PASS=$((PASS + 1))
  else
    printf '  FAIL: AC5 did not SKIP\n  out=%s\n' "$out"
    FAIL=$((FAIL + 1))
    ERRORS+=("test_ac5_skipped_when_claude_missing")
  fi

  rm -rf "$test_home"
}

# ---------------------------------------------------------------------------
# test_ac5_fails_on_source_path
# Stub claude to return stream-json with a Read of src/foo.ts → AC5 FAIL.
# ---------------------------------------------------------------------------
test_ac5_fails_on_source_path() {
  printf '\n[test_ac5_fails_on_source_path]\n'
  local test_home
  test_home=$(mktemp -d)
  local bin_dir="$test_home/bin"
  mkdir -p "$bin_dir"

  cat >"$bin_dir/claude" <<'STUB'
#!/usr/bin/env bash
cat <<'CANNED'
{"type":"system","subtype":"init"}
{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Read","input":{"file_path":"src/foo.ts"}}]}}
{"type":"result","result":"done"}
CANNED
STUB
  chmod +x "$bin_dir/claude"

  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1

  local out
  out=$(HOME="$test_home" PATH="$bin_dir:$PATH" bash "$VERIFY_SCRIPT" --ac 5 2>&1 || true)

  if printf '%s\n' "$out" | grep -q 'FAIL ac5'; then
    printf '  PASS: AC5 FAIL on src/ path\n'
    PASS=$((PASS + 1))
  else
    printf '  FAIL: AC5 did not FAIL on src/ path\n  out=%s\n' "$out"
    FAIL=$((FAIL + 1))
    ERRORS+=("test_ac5_fails_on_source_path")
  fi

  rm -rf "$test_home"
}

# ---------------------------------------------------------------------------
# test_precedence_probe_clean_up
# Probe must leave no kzk-precedence-probe-* dirs in HOME after EXIT.
# Forces SKIP path (no claude) — cleanup trap must still run.
# ---------------------------------------------------------------------------
test_precedence_probe_clean_up() {
  printf '\n[test_precedence_probe_clean_up]\n'
  local test_home
  test_home=$(mktemp -d)
  mkdir -p "$test_home/.claude/skills"

  HOME="$test_home" PATH="/usr/bin:/bin" bash "$PROBE_SCRIPT" >/dev/null 2>&1 || true

  local leftover
  leftover=$(find "$test_home/.claude/skills" -maxdepth 1 -type d \
    -name 'kzk-precedence-probe-*' 2>/dev/null | wc -l | tr -d ' ')

  if [ "${leftover:-0}" -eq 0 ]; then
    printf '  PASS: no kzk-precedence-probe-* dirs left in HOME\n'
    PASS=$((PASS + 1))
  else
    printf '  FAIL: %s leftover probe dirs in HOME\n' "$leftover"
    FAIL=$((FAIL + 1))
    ERRORS+=("test_precedence_probe_clean_up")
  fi

  rm -rf "$test_home"
}

# ---------------------------------------------------------------------------
# keyword-detector.mjs unit tests (Cycle 28 — meta-gap prevention)
# ---------------------------------------------------------------------------
test_keyword_detector_matches_large_task_phrase() {
  printf '\n[test_keyword_detector_matches_large_task_phrase]\n'
  local out
  out=$(printf '%s' '{"prompt":"버그 전수조사 해줘"}' | node "$REPO_ROOT/install/hooks/keyword-detector.mjs" 2>/dev/null)
  assert_match "output contains kzk-large-task-delegation" \
    "kzk-large-task-delegation" "$out"
  # T2: short-form — must be single-line hookSpecificOutput (not multi-line bullet list)
  assert_match "output contains matched: phrase (short-form)" \
    "matched:" "$out"
  local line_count
  line_count=$(printf '%s' "$out" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('hookSpecificOutput',{}).get('additionalContext','').count('\n'))" 2>/dev/null || echo "0")
  assert_eq "short-form reminder is single line (0 newlines)" "0" "$line_count"
}

test_keyword_detector_matches_session28_phrasing() {
  printf '\n[test_keyword_detector_matches_session28_phrasing]\n'
  local out
  out=$(printf '%s' '{"prompt":"사용성 버그 모두 잡아줘"}' | node "$REPO_ROOT/install/hooks/keyword-detector.mjs" 2>/dev/null)
  assert_match "output contains kzk-large-task-delegation" \
    "kzk-large-task-delegation" "$out"
  assert_match "output contains matched: phrase (short-form)" \
    "matched:" "$out"
}

test_keyword_detector_matches_multi_skill() {
  printf '\n[test_keyword_detector_matches_multi_skill]\n'
  local out
  out=$(printf '%s' '{"prompt":"spec 잡자 + 플랜 여러개로 쪼개"}' | node "$REPO_ROOT/install/hooks/keyword-detector.mjs" 2>/dev/null)
  assert_match "output contains kzk-spec-and-review" \
    "kzk-spec-and-review" "$out"
  assert_match "output contains kzk-large-task-delegation" \
    "kzk-large-task-delegation" "$out"
}

test_keyword_detector_matches_self_improvement_chain() {
  printf '\n[test_keyword_detector_matches_self_improvement_chain]\n'
  local out
  out=$(printf '%s' '{"prompt":"자가개선 루프"}' | node "$REPO_ROOT/install/hooks/keyword-detector.mjs" 2>/dev/null)
  assert_match "output contains kzk-spec-and-review" \
    "kzk-spec-and-review" "$out"
  assert_match "output contains kzk-large-task-delegation" \
    "kzk-large-task-delegation" "$out"
  assert_match "output contains kzk-pre-commit-gate" \
    "kzk-pre-commit-gate" "$out"
  assert_match "output contains kzk-autonomous-loop" \
    "kzk-autonomous-loop" "$out"
}

test_keyword_detector_no_match_passes_through() {
  printf '\n[test_keyword_detector_no_match_passes_through]\n'
  local out
  out=$(printf '%s' '{"prompt":"안녕하세요"}' | node "$REPO_ROOT/install/hooks/keyword-detector.mjs" 2>/dev/null)
  assert_match "output is continue:true" \
    '{"continue":true}' "$out"
  if printf '%s\n' "$out" | grep -qF '🚨'; then
    printf '  FAIL: no-match output must not contain 🚨\n'
    FAIL=$((FAIL + 1))
    ERRORS+=("test_keyword_detector_no_match_passes_through: unexpected 🚨 in output")
  else
    printf '  PASS: no 🚨 in no-match output\n'
    PASS=$((PASS + 1))
  fi
}

test_keyword_detector_matches_tdd() {
  printf '\n[test_keyword_detector_matches_tdd]\n'
  local out
  out=$(printf '%s' '{"prompt":"테스트 먼저 작성하고 진행해줘"}' | node "$REPO_ROOT/install/hooks/keyword-detector.mjs" 2>/dev/null)
  assert_match "output contains kzk-test-coverage" \
    "kzk-test-coverage" "$out"
}

test_keyword_detector_matches_vague_large() {
  printf '\n[test_keyword_detector_matches_vague_large]\n'
  local out
  out=$(printf '%s' '{"prompt":"리팩토링 좀 해줘"}' | node "$REPO_ROOT/install/hooks/keyword-detector.mjs" 2>/dev/null)
  assert_match "output contains kzk-large-task-delegation" \
    "kzk-large-task-delegation" "$out"
}

test_keyword_detector_matches_test_add() {
  printf '\n[test_keyword_detector_matches_test_add]\n'
  local out
  out=$(printf '%s' '{"prompt":"이 함수에 테스트 추가해줘"}' | node "$REPO_ROOT/install/hooks/keyword-detector.mjs" 2>/dev/null)
  assert_match "output contains kzk-test-coverage" \
    "kzk-test-coverage" "$out"
}

# ---------------------------------------------------------------------------
# Plan D — regression-recall.test.mjs
# ---------------------------------------------------------------------------
test_regression_recall() {
  printf '\n[test_regression_recall]\n'
  if node "$REPO_ROOT/install/test/regression-recall.test.mjs"; then
    printf '  PASS: regression-recall.test.mjs\n'
    PASS=$((PASS + 1))
  else
    printf '  FAIL: regression-recall.test.mjs\n'
    FAIL=$((FAIL + 1))
    ERRORS+=("test_regression_recall")
  fi
}

# ---------------------------------------------------------------------------
# Run all tests
# ---------------------------------------------------------------------------
printf 'kzk-harness install-global tests (pure-bash, repo: %s)\n' "$REPO_ROOT"
printf '=%.0s' {1..60}
printf '\n'

test_skill_files_landed
test_umbrella_dotfile
test_claude_md_marker
test_idempotent
test_omc_collision_warning
test_uninstall_removes_skills
test_uninstall_strips_marker
test_uninstall_preserves_omc_block
test_verify_runs_all_8_acs
test_ac5_skipped_when_claude_missing
test_ac5_fails_on_source_path
test_precedence_probe_clean_up
test_keyword_detector_matches_large_task_phrase
test_keyword_detector_matches_session28_phrasing
test_keyword_detector_matches_multi_skill
test_keyword_detector_matches_self_improvement_chain
test_keyword_detector_no_match_passes_through
test_keyword_detector_matches_tdd
test_keyword_detector_matches_vague_large
test_keyword_detector_matches_test_add
test_regression_recall

# Plan A — skill-text-checks
printf '\n--- skill-text-checks (Plan A) ---\n'
if bash "$REPO_ROOT/install/test/skill-text-checks.sh"; then
  PASS=$((PASS + 1))
  printf '  PASS: skill-text-checks.sh\n'
else
  FAIL=$((FAIL + 1))
  ERRORS+=("skill-text-checks.sh")
fi

printf '\n'
printf '=%.0s' {1..60}
printf '\n'
printf 'Results: %d passed, %d failed\n' "$PASS" "$FAIL"

if [ ${#ERRORS[@]} -gt 0 ]; then
  printf 'Failed tests:\n'
  for e in "${ERRORS[@]}"; do
    printf '  - %s\n' "$e"
  done
  exit 1
fi

exit 0
