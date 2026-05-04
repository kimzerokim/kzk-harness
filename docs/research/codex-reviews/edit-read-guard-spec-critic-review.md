# Edit-Read-Guard Spec Critic Review — Cycle 1 (codex CLI)

> Date: 2026-05-04. Method: codex CLI stdin path (exit 0).
> Subject: `docs/plans/edit-read-guard-spec.md` (rev1, ~200 lines)
> **Verdict: REVISE**

## 6 항목 진단

### #1 AC 불충분
- `uninstall-global.sh` 역경로 / `settings.json` 재정렬 보장 / path normalization / hook 공존 idempotency 누락
- AC11 (atomic commit + main merge) = release 절차, spec AC 아님

권고: AC11 제거. 대신 uninstall cleanup / hook order enforcement / realpath normalization / settings merge idempotency 추가.

### #2 Read tracker — env 전파 가정 약함
- hook = 프로세스 분리. UserPromptSubmit 의 env 가 PostToolUse/PreToolUse 에 자동 전파 X
- JSONL append/grep = 동시 append / partial write / stale line 위험

권고:
- env 버리고 `~/.cache/kzk-harness/current-turn.json` (atomic write)
- read-log 는 O_APPEND + flock, 조회는 turn file 기준

### #3 Bypass single-use semantics 부재
env 는 session/process scope. one-prompt reset 불가능.

권고: **single-use bypass token file** — `~/.cache/kzk-harness/bypass-token`. UserPromptSubmit 가 token 소비 + 삭제. PreToolUse 는 same-turn token 만 1회 허용.

### #4 신규 파일 Write 분기 — TOCTOU + tool_name 미구분
- `fs.existsSync` TOCTOU
- Edit 는 존재 안 하는 파일에 allow 예외 X — 오류 경로

권고:
- tool_name 별 분기 — `Write` 만 lstat ENOENT allow, `Edit` 는 read-required
- path = realpath/resolve 정규화

### #5 Hook 등록 순서 — append 만으론 보장 X
재설치 / 수동 편집 / uninstall/reinstall 후 순서 흔들림.

권고: installer 가 전체 `UserPromptSubmit` 배열을 canonical order 로 재구성. 또는 **dispatcher hook 1개로 합침** (clear → keyword-detector → regression-recall → fix-scope-trigger).

### #6 놓친 함정
- Read/Edit path 형식 불일치 (absolute/relative/symlink)
- uninstall 이 UserPromptSubmit 만 지움 — PreToolUse/PostToolUse 누락
- shell `grep/cat` 읽기는 tracker 안 잡힘

권고:
- skill 본문 — "guard 는 `Read` tool 만 인정" 명시
- uninstall 을 PreToolUse/PostToolUse 까지 확장
- path canonicalization spec 고정

## Bottom-line: REVISE → rev2 SHIP 도달 가능
