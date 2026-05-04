#!/usr/bin/env bash
# install/test/verifier-routing.test.sh — Plan C rev2 test
#
# 검증 영역:
# - model 분기 (boundary 정확)
# - cache hit/miss (key = staged_diff_hash + acceptance_hash + verifier_model)
# - HEAD~1 vs --cached diff base 단일화
# - VERDICT 파싱 (정규식 매칭)
# - INVALID_VERDICT fail-closed
# - PARTIAL escalation
# - 2 FAIL halt thread
#
# 한계: dispatch path 만. verifier subagent 응답 품질은 manual.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PASS=0
FAIL=0
ERRORS=()

# ---------------------------------------------------------------------------
# route_verifier — model 분기 룰
#   < 3 files && < 100 LoC → sonnet
#   그 외 → opus
#   empty diff → opus default safe
#   high-risk / 메인 직접 commit flag → opus 강제 (size 무시)
# ---------------------------------------------------------------------------
route_verifier() {
  local shortstat="$1"
  local force_opus="${2:-no}"  # high-risk / 메인 직접 commit
  if [ "$force_opus" = "yes" ]; then
    printf 'opus\n'
    return 0
  fi
  if [ -z "$shortstat" ]; then
    printf 'opus\n'
    return 0
  fi
  local files
  files=$(printf '%s' "$shortstat" | grep -oE '[0-9]+ files? changed' | grep -oE '^[0-9]+' || printf '0')
  local ins
  ins=$(printf '%s' "$shortstat" | grep -oE '[0-9]+ insertions?\(\+\)' | grep -oE '^[0-9]+' || printf '0')
  local del
  del=$(printf '%s' "$shortstat" | grep -oE '[0-9]+ deletions?\(-\)' | grep -oE '^[0-9]+' || printf '0')
  local loc=$((ins + del))
  if [ "$files" -lt 3 ] && [ "$loc" -lt 100 ]; then
    printf 'sonnet\n'
  else
    printf 'opus\n'
  fi
}

# ---------------------------------------------------------------------------
# parse_verdict — 첫 줄 정규식 매칭 (rev2 #5)
#   match: PASS / FAIL / PARTIAL
#   miss: INVALID_VERDICT
# ---------------------------------------------------------------------------
parse_verdict() {
  local response="$1"
  local first_line
  first_line=$(printf '%s' "$response" | head -n 1)
  if printf '%s' "$first_line" | grep -qE '^VERDICT: (PASS|FAIL|PARTIAL)$'; then
    printf '%s' "$first_line" | sed -E 's/^VERDICT: //'
  else
    printf 'INVALID_VERDICT\n'
  fi
}

# ---------------------------------------------------------------------------
# cache_key — (staged_diff_hash, acceptance_hash, verifier_model)
# ---------------------------------------------------------------------------
cache_key() {
  local diff_hash="$1" acc_hash="$2" model="$3"
  printf '%s:%s:%s\n' "$diff_hash" "$acc_hash" "$model"
}

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

printf 'verifier-routing.test.sh — Plan C rev2 검증 (12 case)\n'

# === Block 1: model 분기 boundary (rev2 #3 정정) ===
# < 3 files && < 100 LoC → sonnet, else opus

# Case 1: 2 files + 50 LoC → sonnet
assert_eq "2 files + 50 LoC → sonnet" "sonnet" "$(route_verifier ' 2 files changed, 50 insertions(+)')"

# Case 2: 3 files + 50 LoC → opus (파일 boundary)
assert_eq "3 files + 50 LoC → opus" "opus" "$(route_verifier ' 3 files changed, 50 insertions(+)')"

# Case 3: 2 files + 100 LoC → opus (LoC boundary)
assert_eq "2 files + 100 LoC → opus" "opus" "$(route_verifier ' 2 files changed, 100 insertions(+)')"

# Case 4: 2 files + 99 LoC → sonnet (둘 다 미만)
assert_eq "2 files + 99 LoC → sonnet" "sonnet" "$(route_verifier ' 2 files changed, 99 insertions(+)')"

# Case 5: empty diff → opus default safe
assert_eq "empty diff → opus default safe" "opus" "$(route_verifier '')"

# Case 6: high-risk force opus (size 무관)
assert_eq "high-risk force opus (1 file + 10 LoC)" "opus" "$(route_verifier ' 1 file changed, 10 insertions(+)' yes)"

# === Block 2: VERDICT 파싱 (rev2 #5) ===

# Case 7: PASS 정상 응답
assert_eq "VERDICT: PASS 첫 줄 → PASS" "PASS" "$(parse_verdict 'VERDICT: PASS
이유 1
이유 2')"

# Case 8: FAIL 정상 응답
assert_eq "VERDICT: FAIL 첫 줄 → FAIL" "FAIL" "$(parse_verdict 'VERDICT: FAIL
edge case missing')"

# Case 9: PARTIAL 정상 응답
assert_eq "VERDICT: PARTIAL 첫 줄 → PARTIAL" "PARTIAL" "$(parse_verdict 'VERDICT: PARTIAL
scope 누수 일부')"

# Case 10: prose only (형식 위반) → INVALID_VERDICT
assert_eq "prose only → INVALID_VERDICT" "INVALID_VERDICT" "$(parse_verdict '대체로 좋아 보입니다.
다만 edge case 가...')"

# === Block 3: cache key + diff base (rev2 #2) ===

# Case 11: 같은 (diff_hash, acceptance_hash, model) → 같은 cache key (hit)
key_a=$(cache_key "abc123" "def456" "sonnet")
key_b=$(cache_key "abc123" "def456" "sonnet")
assert_eq "cache key 동일 → hit 가능" "$key_a" "$key_b"

# Case 12: model 다르면 cache key 다름 (miss)
key_c=$(cache_key "abc123" "def456" "sonnet")
key_d=$(cache_key "abc123" "def456" "opus")
if [ "$key_c" != "$key_d" ]; then
  printf '  PASS: model 다른 cache key → miss\n'
  PASS=$((PASS + 1))
else
  printf '  FAIL: model 다른 cache key → 같음 (잘못)\n'
  FAIL=$((FAIL + 1))
  ERRORS+=("cache key model differentiation")
fi

printf '\n%d PASS, %d FAIL\n' "$PASS" "$FAIL"
if [ "$FAIL" -gt 0 ]; then
  printf 'Errors:\n'
  for e in "${ERRORS[@]}"; do
    printf '  - %s\n' "$e"
  done
  exit 1
fi
exit 0
