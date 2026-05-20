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

# kzk-large-task-delegation Task-level dispatch shape — positive
assert_grep "kzk-large-task-delegation Task-level dispatch shape 헤더" "Task-level dispatch shape" "$LTD"
assert_grep "kzk-large-task-delegation dispatch anatomy" "Dispatch prompt anatomy" "$LTD"
assert_grep "kzk-large-task-delegation ≤120 라인 soft cap" "≤120 라인" "$LTD"
assert_grep "kzk-large-task-delegation no Co-Authored-By" "DO NOT add Co-Authored-By" "$LTD"
assert_grep "kzk-large-task-delegation HOTFIX_ACK_DEFER bypass" "HOTFIX_ACK_DEFER" "$LTD"

# kzk-large-task-delegation Multi-dispatch wave shape — positive
assert_grep "kzk-large-task-delegation wave shape 헤더" "Multi-dispatch wave shape" "$LTD"
assert_grep "kzk-large-task-delegation ## Dependencies 의무" "## Dependencies" "$LTD"
assert_grep "kzk-large-task-delegation run_in_background true" "run_in_background: true" "$LTD"

# kzk-large-task-delegation Plan size policy — positive
assert_grep "kzk-large-task-delegation plan size policy 헤더" "Plan size policy" "$LTD"
assert_grep "kzk-large-task-delegation phase split threshold (task count)" "50+ task" "$LTD"
assert_grep "kzk-large-task-delegation phase split threshold (line count)" "5,000+" "$LTD"
assert_grep "kzk-large-task-delegation phase split threshold (group count)" "9+ Group" "$LTD"
assert_grep "kzk-large-task-delegation sidecar drift" "Q-SIDECAR-DRIFT" "$LTD"

# harness-share §4 mirror — positive (verify cross-ref in §2/§11.1/§32)
assert_grep "harness-share §4 dispatch canonical cross-ref presence" "Dispatch anatomy canonical reference" "$SHARE"

# harness-share cross-ref exact count (cycle 2 plan fix NIT 2; cycle 3 plan fix NIT — robust integer)
xref_count=$(grep -c "Dispatch anatomy canonical reference" "$SHARE" 2>/dev/null)
xref_count=${xref_count:-0}
if [ "$xref_count" -eq 3 ]; then
  printf "PASS: harness-share cross-ref exact count = 3\n"
  PASS=$((PASS+1))
else
  printf "FAIL: harness-share cross-ref count = %s, expected 3\n" "$xref_count"
  FAIL=$((FAIL+1))
  ERRORS+=("harness-share cross-ref count drift: got $xref_count, want 3")
fi

# harness-share §11.1 — positive
assert_grep "harness-share §11.1 Anti-Self-Verification" "11.1 Anti-Self-Verification" "$SHARE"
assert_grep "harness-share Layer (a) cross-ref" "Layer (a)" "$SHARE"
assert_grep "harness-share Layer (b) cross-ref" "Layer (b)" "$SHARE"
assert_grep "harness-share KZK_AUTONOMOUS=1" "KZK_AUTONOMOUS=1" "$SHARE"

# harness-share — negative grep
assert_no_grep "harness-share no =0 override" "KZK_AUTONOMOUS=0" "$SHARE"

# Plan E rev2 — kzk-production-access v1.2 grep
PA="$REPO_ROOT/skills/kzk-production-access/SKILL.md"
LTD_E="$REPO_ROOT/skills/kzk-large-task-delegation/SKILL.md"
PCG="$REPO_ROOT/skills/kzk-pre-commit-gate/SKILL.md"
SHARE_E="$REPO_ROOT/harness-share.md"

assert_grep "PA v1.2"                             "version: 1.2.0"                        "$PA"
assert_grep "PA permission rewrite"               "Permission model (rev2 — Plan E)"      "$PA"
assert_grep "PA AI direct write 금지"             "AI 직접 실행 금지"                     "$PA"
assert_grep "PA Three-stage review 참조"          "Three-stage review"                    "$PA"
assert_grep "PA env exceptions IaC vs runtime"    "IaC-managed"                           "$PA"
assert_grep "PA env exceptions runtime-only"      "runtime-only"                          "$PA"
assert_grep "PA drift state semantics"            "state semantics"                       "$PA"
assert_grep "PA Axis B impacted artifact"         "impacted schema"                       "$PA"
assert_grep "PA trigger migration"                "migration"                             "$PA"

assert_grep "LTD Production-code-first boilerplate" "Production-code-first boilerplate"  "$LTD_E"
assert_grep "LTD PRODUCTION-CODE-FIRST RULE 본문"   "PRODUCTION-CODE-FIRST RULE"         "$LTD_E"
assert_grep "LTD Three-stage review 참조"           "Three-stage review"                 "$LTD_E"

assert_grep "PCG Gate 1.6 헤더"                   "Gate 1.6"                             "$PCG"
assert_grep "PCG staged path trigger"             "staged path"                          "$PCG"
assert_grep "PCG WARN/FAIL 분리"                  "FAIL 아님"                             "$PCG"
assert_grep "PCG kzk-production-access cross-ref" "kzk-production-access"               "$PCG"

assert_grep "SHARE §2 신규 subsection"            "Production state changes — code-first" "$SHARE_E"
assert_grep "SHARE Axis B impacted artifact"      "impacted schema"                      "$SHARE_E"
assert_grep "SHARE Axis D regression-memory"      "kzk-regression-memory"               "$SHARE_E"
assert_grep "SHARE §2 sync 포인터"                "Plan E rev2 (state mutation)"         "$SHARE_E"

printf '\n%d PASS, %d FAIL\n' "$PASS" "$FAIL"
if [ "$FAIL" -gt 0 ]; then
  printf 'Errors:\n'
  for e in "${ERRORS[@]}"; do
    printf '  - %s\n' "$e"
  done
  exit 1
fi
exit 0
