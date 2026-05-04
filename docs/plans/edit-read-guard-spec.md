# Spec — PreToolUse Edit/Write Read-Guard + install lib copy fix (rev3)

> Date: 2026-05-04. Branch: `feature/edit-read-guard`. Author: kimzerokim + Claude.
> Spec cycle 1 verdict: `docs/research/codex-reviews/edit-read-guard-spec-critic-review.md` (REVISE → rev2).
> Plan F cycle 1 verdict: `docs/plans/plan-F-edit-read-guard-critic-review.md` (REVISE → spec rev3 + Plan F rev2).
> Status: **Frozen** — codex spec/Plan F cycle 1 답 모두 통합 (flock 폐기, bypass token PreToolUse 단독 소비, manifest 기반 enabled set, managed 파일명 whitelist).

## Problem

1. **Hook ESM resolve fail** — `install-global.sh --regression-recall --fix-scope-trigger` 후 매 prompt `node:internal/modules/esm/resolve:275`. `~/.claude/skills/.kzk-harness-shared/lib/` 에 `sidecar-write.mjs` 만, `hook-shared.mjs`/`cache-write.mjs` 누락.
2. **Edit-before-Read 메타갭** — 메인이 `kzk-tool-retry §Pre-emptive Read protocol` 룰 self-discipline 안 함. 사용자 명시 — "이거 좀 막아줘" (시스템적 차단).

## Locked decisions (rev2 — codex cycle 1 답 통합)

| 결정 | 근거 |
|---|---|
| `install-global.sh enable_hooks()` 가 `install/lib/*.mjs` 전부 copy → `~/.claude/skills/.kzk-harness-shared/lib/`. **idempotent — 동일 byte 면 skip, 차이면 overwrite** | hook ESM resolve fail. codex #1 idempotency |
| 신규 `install/hooks/edit-read-guard.mjs` (PreToolUse hook, Edit + Write matcher) | spec 본질 |
| **Turn state = on-disk atomic file** (env 전파 가정 폐기, codex #2) | hook 프로세스 분리. env 자동 전파 X |
| Turn state path: `~/.cache/kzk-harness/current-turn.json` — atomic write (tmp+rename) | codex #2 |
| Read log: `~/.cache/kzk-harness/read-log.jsonl` — `O_APPEND` atomic write (< PIPE_BUF JSONL entry, POSIX atomic guarantee, flock 불필요). 조회 = turn file 기준 line filter | codex #2 + Plan F cycle 1 #1 (flock 폐기) |
| Path canonicalization = `realpath`/`fs.realpathSync` 정규화 (Read 와 Edit 모두 동일 정규화) | codex #6 — symlink/absolute/relative 불일치 차단 |
| **tool_name 별 분기** — `Write` 만 `lstat` ENOENT 시 allow, `Edit` 는 read-required (존재 안 하면 오류 경로) | codex #4 — TOCTOU 회피 + Edit semantics |
| **Bypass = single-use token file** (env 폐기, codex #3) — `~/.cache/kzk-harness/bypass-token`. **PreToolUse 만 token 검사 + 삭제 (one-shot). dispatcher 손 안 댐** — codex Plan F #6 (소비 주체 단일화). 사용자 explicit 생성 의무. | codex #3 + Plan F cycle 1 #6 |
| Hook 등록 = **dispatcher 1개로 통합** (codex #5) — `~/.claude/skills/.kzk-harness-shared/hooks/dispatcher.mjs`. canonical order: (1) read-log clear, (2) keyword-detector, (3) regression-recall, (4) fix-scope-trigger. **settings.json 등록은 dispatcher only**. stand-alone hook 파일은 유지 (test/local exec/dispatcher import 용). 비-kzk hook 보존. | codex #5 + Plan F cycle 1 #2 |
| `install-global.sh` 가 settings.json 의 hook 배열 canonical 재구성 — **managed 파일명 whitelist** (`dispatcher.mjs`, `edit-read-guard.mjs`, `keyword-detector.mjs`, `regression-recall.mjs`, `fix-scope-trigger.mjs`) 만 strip + 사용자 커스텀 hook 보존 | codex #5 + Plan F cycle 1 #4 — directory substring 위험 차단 |
| **dispatcher enabled set = manifest 기반** (`~/.claude/skills/.kzk-harness-shared/hooks/enabled.json`), 파일 존재 X. install 시 manifest 생성, flag 변경 시 manifest 갱신. stale file 차단. | Plan F cycle 1 #7 |
| `uninstall-global.sh` 가 `PreToolUse` + `PostToolUse` + `UserPromptSubmit` 모두 cleanup (현재는 UserPromptSubmit 만) | codex #6 |
| Skill 본문 (kzk-tool-retry) 에 "guard 는 `Read` tool 호출만 인정. shell `grep/cat` 은 tracker 안 잡힘" 명시 | codex #6 |
| Default ENABLED on `--enable-hooks` (별 flag 없음) | 사용자 명시 즉시 적용 |
| Branch `feature/edit-read-guard`, no PR, main merge | 사용자 명시 |

## Acceptance criteria (rev2 — codex 답 반영)

1. `install/hooks/edit-read-guard.mjs` 신규 (PreToolUse hook)
2. `install/lib/turn-state.mjs` 신규 (current-turn.json + read-log.jsonl atomic 관리, flock)
3. `install/hooks/dispatcher.mjs` 신규 (UserPromptSubmit canonical order: read-log clear → keyword-detector → regression-recall → fix-scope-trigger)
4. `install-global.sh enable_hooks()` 가 `install/lib/*.mjs` 전부 copy + idempotent (동일 byte skip, 차이면 overwrite)
5. `install-global.sh` 가 hook 배열 canonical 재구성 (PreToolUse + PostToolUse + UserPromptSubmit 셋 다)
6. `uninstall-global.sh` 가 PreToolUse + PostToolUse + UserPromptSubmit 모두 cleanup
7. Path canonicalization — `fs.realpathSync` 정규화 (Read 와 Edit 같은 form)
8. tool_name 별 분기 — Write lstat ENOENT allow, Edit read-required
9. Single-use bypass — `~/.cache/kzk-harness/bypass-token` 파일 존재 시 1회 allow + 삭제
10. `install/test/edit-read-guard.test.mjs` 신규 — read 후 edit allow / read 없이 edit deny / Write ENOENT allow / bypass token / cross-turn deny / symlink 정규화 6 case
11. `kzk-tool-retry/SKILL.md` v1.2 → v1.3 — §PreToolUse guard 신규 ("guard 는 `Read` tool 만 인정. shell grep/cat tracker 안 잡힘" 명시)
12. `harness-share.md` §27 끝에 PreToolUse guard cross-ref

## Architecture

### Turn state files

`~/.cache/kzk-harness/current-turn.json` (atomic):
```json
{"turn_id": "uuid-v4", "started_at": "ISO"}
```

`~/.cache/kzk-harness/read-log.jsonl` (O_APPEND + flock):
```jsonl
{"turn":"<uuid>","file":"/realpath","ts":"ISO"}
```

### Hook 동작

1. **dispatcher** (UserPromptSubmit) — turn-id rotate (uuid-v4 새로) + read-log truncate. 그 후 keyword-detector → regression-recall → fix-scope-trigger 순.
2. **PostToolUse** (Read) — file_path realpath 정규화 후 read-log.jsonl append (flock).
3. **PreToolUse** (Edit | Write) — 
   - bypass-token 존재 → unlink + allow
   - Write + lstat ENOENT → allow (신규 파일)
   - file_path realpath 정규화 → read-log grep (current-turn.json 의 turn-id) → 매칭 1+ allow, 0 deny

### Deny 메시지

```
[edit-read-guard] Read this file first within the current turn.
File: <realpath>
Bypass: touch ~/.cache/kzk-harness/bypass-token (one-shot)
Disable: OMC_SKIP_HOOKS=edit-read-guard
```

## Plan 분할 (1개)

| Plan | 파일 | LoC |
|---|---|---|
| **F** | `docs/plans/plan-F-edit-read-guard.md` | ~400 |

## Test 전략

`install/test/edit-read-guard.test.mjs` 6 case (mock fixture). behavioral test 는 manual cycle 검증 (다음 session).

## Rollback

| Level | 메커니즘 |
|---|---|
| Plan revert | `git revert <Plan-F-sha>` |
| Hook 비활성 | `OMC_SKIP_HOOKS=edit-read-guard` |
| One-shot bypass | `touch ~/.cache/kzk-harness/bypass-token` |
| settings.json hook 수동 제거 | `bash uninstall-global.sh` (cleanup PreToolUse + PostToolUse + UserPromptSubmit 셋 다) |

## Codex 매트릭스 (cycle 1 답)

| # | Cycle 1 결함 | rev2 답 위치 |
|---|---|---|
| 1 AC 불충분 | AC11 atomic commit 제거. uninstall/idempotency/realpath/order AC 추가 |
| 2 env 전파 약함 | Locked turn state on-disk + flock |
| 3 Bypass single-use | Locked single-use token file (env 폐기) |
| 4 TOCTOU + tool_name 미구분 | Locked tool_name 별 분기 + realpath |
| 5 Hook 순서 | Locked dispatcher 1개로 통합 + canonical 재구성 |
| 6 함정 (path/uninstall/shell read) | Locked realpath / uninstall 확장 / skill 본문 명시 |

## Next

Plan F draft → codex review (size cap) → 1 round rule → frozen → cycle F 자율실행 → main merge.
