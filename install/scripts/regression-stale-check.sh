#!/usr/bin/env bash
# regression-stale-check.sh — Plan D 단발 stale check.
#
# sidecar (.kzk-harness/regression-meta.jsonl) 의 file_snapshot SHA 와 HEAD 비교.
# 변경 감지 시 sidecar 의 7번째 필드 stale=true update + stderr 로그.
# archived 자동 X — 사용자 결정.
# atomic: mktemp + mv (lockdir 동시성은 hook 과 같은 utility 에 위임 — 본 script 는 단발 cron/cycle-end 용)
#
# 실행 시점: cron (사용자 선택) 또는 cycle 끝 단발 (kzk-web-loop 등에서 hook).

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SIDECAR="$REPO_ROOT/.kzk-harness/regression-meta.jsonl"
LOCK_DIR="$SIDECAR.lock"

if [ ! -f "$SIDECAR" ]; then
  printf '[regression-stale-check] sidecar not found: %s — skipping\n' "$SIDECAR" >&2
  exit 0
fi

if ! command -v jq >/dev/null 2>&1; then
  printf '[regression-stale-check] jq not found — install jq to enable stale check\n' >&2
  exit 0
fi

if ! command -v git >/dev/null 2>&1; then
  printf '[regression-stale-check] git not found — abort\n' >&2
  exit 1
fi

# acquire lock (lockdir pattern — same as install/lib/sidecar-write.mjs)
deadline=$(($(date +%s) + 5))
while ! mkdir "$LOCK_DIR" 2>/dev/null; do
  if [ "$(date +%s)" -ge "$deadline" ]; then
    printf '[regression-stale-check] lock timeout: %s\n' "$LOCK_DIR" >&2
    exit 1
  fi
  sleep 0.1
done
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

stale_count=0
ok_count=0
tmp_out=$(mktemp)

while IFS= read -r line; do
  [ -z "$line" ] && continue
  key=$(printf '%s' "$line" | jq -r '.key')
  snapshot=$(printf '%s' "$line" | jq -r '.file_snapshot')

  # parse "<path>:<line>@<commit-SHA>"
  rest="${snapshot%@*}"
  sha="${snapshot##*@}"
  file_path="${rest%:*}"

  # current SHA of file at HEAD
  if [ -f "$REPO_ROOT/$file_path" ]; then
    current_sha=$(cd "$REPO_ROOT" && git rev-parse "HEAD:$file_path" 2>/dev/null || echo "deleted")
  else
    current_sha="deleted"
  fi

  if [ "$current_sha" != "$sha" ]; then
    stale_count=$((stale_count + 1))
    printf '[regression-stale-check] stale: %s (was %s, now %s)\n' "$key" "$sha" "$current_sha" >&2
    updated=$(printf '%s' "$line" | jq --argjson stale true '. + {stale: $stale}')
    printf '%s\n' "$updated" >> "$tmp_out"
  else
    ok_count=$((ok_count + 1))
    cleared=$(printf '%s' "$line" | jq --argjson stale false '. + {stale: $stale}')
    printf '%s\n' "$cleared" >> "$tmp_out"
  fi
done < "$SIDECAR"

mv "$tmp_out" "$SIDECAR"
printf '[regression-stale-check] done — %d stale, %d ok\n' "$stale_count" "$ok_count" >&2
exit 0
