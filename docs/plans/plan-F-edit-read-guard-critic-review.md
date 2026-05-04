# Plan F Critic Review — Cycle 1 (codex CLI)

> Date: 2026-05-04. Method: codex CLI stdin path (exit 0).
> Subject: `docs/plans/plan-F-edit-read-guard.md` (rev1, ~350 lines)
> **Verdict: REVISE**

## 7 항목 진단

### #1 AC2 + AC5 — spec lock 정합성
- AC2: spec `flock` 명시했지만 Plan F = `O_APPEND` 단일 write 후퇴
- AC5: AC `canonical 재구성` vs 본문 `marker` vs jq `contains` — 3가지 갈림

권고:
- spec → `O_APPEND atomic write` (< PIPE_BUF JSONL entry, flock 불필요)
- AC5 = "managed file 명 whitelist" 단일 표현

### #2 dispatcher 통합 — 등록은 dispatcher only, 파일은 유지
settings.json 에 dispatcher 만 등록. keyword-detector / regression-recall / fix-scope-trigger 파일은 유지 (test/local exec/dispatcher import 용). 비-kzk hook 보존.

### #3 PreToolUse + PostToolUse 단일 파일 + --mode
패턴 OK. `__rotate` test 전용 hidden API 제거 — `turn-state.mjs` 직접 호출로 격리.

### #4 canonical 재구성 jq — directory substring X
`.command contains ".kzk-harness-shared/hooks/"` 너무 거칠음 (사용자 커스텀 hook 도 strip 위험).

권고: **managed 파일명 whitelist**:
- `dispatcher.mjs`
- `edit-read-guard.mjs --mode=post-read`
- `keyword-detector.mjs` (legacy)
- `regression-recall.mjs` (legacy)
- `fix-scope-trigger.mjs` (legacy)

### #5 KZK_STATE_DIR 운영 누수 위험
권고: `KZK_TEST_STATE_DIR` 로 rename, OR `NODE_ENV=test` 게이트.

### #6 Bypass token 소비 주체 — spec/Plan 갈림 — CRITICAL
- spec rev2: dispatcher 가 검사 + 삭제
- Plan F: PreToolUse 가 검사 + 삭제
- 둘 다 하면 prompt 시점 사라져 Edit 에서 못 씀

권고: **PreToolUse 만 consume. dispatcher 손 안 댐.** spec rev3 wording 정정.

### #7 dispatcher enabled set — 파일 존재 X, manifest
파일 존재로 활성 판단 = stale file 위험 (예전 `regression-recall.mjs` 남아있으면 flag 꺼도 실행).

권고: install 시 생성하는 **manifest/config** (예: `~/.claude/skills/.kzk-harness-shared/hooks/enabled.json`). flag 변경 시 manifest 갱신.

## Bottom-line: REVISE → rev2 SHIP 도달 가능 (spec rev3 wording 정정 + Plan F rev2)
