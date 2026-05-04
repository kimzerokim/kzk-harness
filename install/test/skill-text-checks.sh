#!/usr/bin/env bash
# install/test/skill-text-checks.sh — Plan A test (룰 *기록* 검증)
#
# kzk-test-coverage SKILL.md 의 Anti-pattern 섹션 + Layer b 룰 grep
# kzk-large-task-delegation SKILL.md 의 anti-self-verification boilerplate 룰 grep
# harness-share.md §11.1 cross-ref grep
#
# 한계: behavioral test 아님. 룰이 *기록* 됐는지만 확인.
# 실제 sonnet 이 룰 위반 차단하는지는 manual cycle 검증 의존.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PASS=0
FAIL=0
ERRORS=()

assert_grep() {
  local desc="$1" pattern="$2" file="$3"
  if grep -qF "$pattern" "$file"; then
    printf '  PASS: %s\n' "$desc"
    PASS=$((PASS + 1))
  else
    printf '  FAIL: %s (pattern "%s" not in %s)\n' "$desc" "$pattern" "$file"
    FAIL=$((FAIL + 1))
    ERRORS+=("$desc")
  fi
}

assert_no_grep() {
  local desc="$1" pattern="$2" file="$3"
  if grep -qF "$pattern" "$file"; then
    printf '  FAIL: %s (pattern "%s" SHOULD NOT be in %s)\n' "$desc" "$pattern" "$file"
    FAIL=$((FAIL + 1))
    ERRORS+=("$desc")
  else
    printf '  PASS: %s\n' "$desc"
    PASS=$((PASS + 1))
  fi
}

printf 'skill-text-checks.sh — Plan A 룰 기록 검증\n'

TC="$REPO_ROOT/skills/kzk-test-coverage/SKILL.md"
LTD="$REPO_ROOT/skills/kzk-large-task-delegation/SKILL.md"
SHARE="$REPO_ROOT/harness-share.md"

# kzk-test-coverage v1.3 — positive grep
assert_grep "kzk-test-coverage version 1.3.0" "version: 1.3.0" "$TC"
assert_grep "kzk-test-coverage Anti-pattern 섹션" "Anti-pattern — Test-from-implementation" "$TC"
assert_grep "kzk-test-coverage Layer b 자율 mode" "자율 mode 메인 직접 TDD 금지" "$TC"
assert_grep "kzk-test-coverage KZK_AUTONOMOUS=1 우선" "KZK_AUTONOMOUS=1" "$TC"
assert_grep "kzk-test-coverage env unset 동사구 매칭" "환경변수 unset 시" "$TC"
assert_grep "kzk-test-coverage 명사 단독 금지" "명사 단독" "$TC"
assert_grep "kzk-test-coverage fresh sonnet dispatch 강제" "fresh sonnet dispatch" "$TC"
assert_grep "kzk-test-coverage Q-TDD-MAIN queue entry" "Q-TDD-MAIN" "$TC"
assert_grep "kzk-test-coverage hook 인프라 예외" "hook/install 인프라" "$TC"
assert_grep "kzk-test-coverage ACK 문구 예시" "test-from-spec 준수 확인했음" "$TC"

# kzk-test-coverage — negative grep (=0 override 금지)
assert_no_grep "kzk-test-coverage no =0 override" "KZK_AUTONOMOUS=0" "$TC"

# kzk-large-task-delegation boilerplate — positive
assert_grep "kzk-large-task-delegation Anti-self-verification boilerplate 섹션" "Anti-self-verification boilerplate" "$LTD"
assert_grep "kzk-large-task-delegation literal block 명시" "literal boilerplate" "$LTD"
assert_grep "kzk-large-task-delegation BLOCKED 반환" "BLOCKED 반환" "$LTD"

# harness-share §11.1 — positive
assert_grep "harness-share §11.1 Anti-Self-Verification" "11.1 Anti-Self-Verification" "$SHARE"
assert_grep "harness-share Layer (a) cross-ref" "Layer (a)" "$SHARE"
assert_grep "harness-share Layer (b) cross-ref" "Layer (b)" "$SHARE"
assert_grep "harness-share KZK_AUTONOMOUS=1" "KZK_AUTONOMOUS=1" "$SHARE"

# harness-share — negative grep
assert_no_grep "harness-share no =0 override" "KZK_AUTONOMOUS=0" "$SHARE"

printf '\n%d PASS, %d FAIL\n' "$PASS" "$FAIL"
if [ "$FAIL" -gt 0 ]; then
  printf 'Errors:\n'
  for e in "${ERRORS[@]}"; do
    printf '  - %s\n' "$e"
  done
  exit 1
fi
exit 0
