#!/usr/bin/env bash
# Gate 1.6 fixture test — direct-execution diff vs script-driven diff 분리 검증
set -euo pipefail
PASS=0; FAIL=0

# (1) FAIL fixture — staged diff 에 직접 실행 흔적
DIFF_FAIL=$'+aws iam create-policy --policy-name foo --policy-document \'{...}\''
echo "$DIFF_FAIL" | grep -E '(aws iam create-policy|aws iam put-policy|aws s3api put-bucket-(lifecycle-configuration|policy)|aws lambda update-function-configuration|psql .+ ALTER TABLE|psql .+ DROP TABLE|psql .+ CREATE INDEX)' >/dev/null \
  && { echo "[fixture] FAIL pattern matched (expected)"; PASS=$((PASS+1)); } \
  || { echo "[fixture] FAIL pattern miss (BUG)"; FAIL=$((FAIL+1)); }

# (2) PASS fixture — script-driven (psql -f migration.sql)
DIFF_PASS=$'+psql -h prod -U app -f migrations/20260504-add-users-xyz.sql'
echo "$DIFF_PASS" | grep -E '(aws iam create-policy|aws iam put-policy|aws s3api put-bucket-(lifecycle-configuration|policy)|aws lambda update-function-configuration|psql .+ ALTER TABLE|psql .+ DROP TABLE|psql .+ CREATE INDEX)' >/dev/null \
  && { echo "[fixture] PASS pattern false-positive (BUG)"; FAIL=$((FAIL+1)); } \
  || { echo "[fixture] PASS pattern correctly skipped"; PASS=$((PASS+1)); }

# (3) READ-ONLY 허용 fixture
DIFF_READ=$'+aws s3 ls s3://prod-logs/'
echo "$DIFF_READ" | grep -E '(aws iam create-policy|aws iam put-policy|aws s3api put-|aws lambda update-function-configuration|psql .+ ALTER TABLE|psql .+ DROP TABLE|psql .+ CREATE INDEX)' >/dev/null \
  && { echo "[fixture] READ false-positive (BUG)"; FAIL=$((FAIL+1)); } \
  || { echo "[fixture] READ correctly allowed"; PASS=$((PASS+1)); }

echo "[Gate 1.6 fixture] PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
