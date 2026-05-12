OpenAI Codex v0.120.0 (research preview)
--------
workdir: /Users/kimzerokim/work/personal/kzk-harness
model: gpt-5.4
provider: openai
approval: never
sandbox: read-only
reasoning effort: high
reasoning summaries: none
session id: 019df30a-e7d5-73d2-86f0-ddfabdbeec95
--------
user
Plan F draft 검토. brutally honest, 한국어, no compliments.

## Read

- `/Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-F-edit-read-guard.md` (~350 lines)
- `/Users/kimzerokim/work/personal/kzk-harness/docs/plans/edit-read-guard-spec.md` (rev2 frozen, ~200 lines)

## Context

신규 PreToolUse hook + install lib copy fix + dispatcher 통합. spec rev2 (codex cycle 1 답 통합) 기반. branch feature/edit-read-guard, no PR, main merge.

## YOUR JOB — 7 카테고리

1. **spec rev2 12 AC cover?** — Plan F task 1-10 매핑?
2. **dispatcher 통합** — keyword-detector + regression-recall + fix-scope-trigger + read-log clear 4개 통합. 기존 hook 들의 stand-alone 유지 vs dispatcher 만 등록? 사용자 non-kzk hook 보존?
3. **PreToolUse + PostToolUse 단일 파일 + --mode 분기** — 패턴 적정? 코드 분리가 더 깔끔할 가능성?
4. **canonical 재구성 jq** — `.command contains ".kzk-harness-shared/hooks/"` 식별자로 strip + 사용자 hook 보존. 정확?
5. **KZK_STATE_DIR env override** — test fixture 격리용. production 에선 ENV 누수 위험?
6. **Bypass token 동작** — UserPromptSubmit dispatcher 가 token 검사 + 삭제. PreToolUse 가 same-turn token 검사. 어떻게 dispatcher 와 PreToolUse 가 token 정보 share?
7. **놓친 함정** — Plan F 단계에서 spec 흡수 안 된 회색지대.

각 항목: 짧은 진단 + 권고. fine "none". 마지막 줄 "Bottom-line: SHIP" 또는 "REVISE".

500단어 이내.

codex
Plan F 초안과 rev2 spec를 대조해서 7개 항목 기준으로 빠르게 매핑과 함정을 보겠습니다. 먼저 두 문서를 읽고, AC 12개와 Plan F task 1-10이 실제로 어떻게 연결되는지부터 확인하겠습니다.
exec
/bin/zsh -lc "sed -n '1,420p' /Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-F-edit-read-guard.md" in /Users/kimzerokim/work/personal/kzk-harness
exec
/bin/zsh -lc "sed -n '1,260p' /Users/kimzerokim/work/personal/kzk-harness/docs/plans/edit-read-guard-spec.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
# Spec — PreToolUse Edit/Write Read-Guard + install lib copy fix (rev2)

> Date: 2026-05-04. Branch: `feature/edit-read-guard`. Author: kimzerokim + Claude.
> Cycle 1 verdict: `docs/research/codex-reviews/edit-read-guard-spec-critic-review.md` (REVISE).
> Status: **Frozen** — codex 6 항목 답 통합. `kzk-spec-and-review §Cost/cadence` "1 spec = 1 round" 적용.

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
| Read log: `~/.cache/kzk-harness/read-log.jsonl` — `O_APPEND` + `flock` 동시 append. 조회 = turn file 기준 line filter | codex #2 |
| Path canonicalization = `realpath`/`fs.realpathSync` 정규화 (Read 와 Edit 모두 동일 정규화) | codex #6 — symlink/absolute/relative 불일치 차단 |
| **tool_name 별 분기** — `Write` 만 `lstat` ENOENT 시 allow, `Edit` 는 read-required (존재 안 하면 오류 경로) | codex #4 — TOCTOU 회피 + Edit semantics |
| **Bypass = single-use token file** (env 폐기, codex #3) — `~/.cache/kzk-harness/bypass-token`. UserPromptSubmit 가 token 검사 + 삭제 (one-shot). 사용자 explicit 생성 의무. | codex #3 |
| Hook 등록 = **dispatcher 1개로 통합** (codex #5) — `~/.claude/skills/.kzk-harness-shared/hooks/dispatcher.mjs`. canonical order: (1) read-log clear, (2) keyword-detector, (3) regression-recall, (4) fix-scope-trigger | codex #5 — append 만으론 순서 보장 X |
| `install-global.sh` 가 dispatcher 의 전체 hook 배열 canonical 재구성 (단순 append X) | codex #5 idempotency |
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

 succeeded in 0ms:
# Plan F — PreToolUse Edit/Write Read-Guard + install lib copy fix

> Spec: `docs/plans/edit-read-guard-spec.md` (rev2, frozen).
> Branch: `feature/edit-read-guard`. No PR. Direct merge to main.
> Status: **Draft** — codex review 의무 (size cap 4 파일 OK). frozen 후 cycle F 자율실행.
> Critic review verdict: pending.

## Goal

PreToolUse `Edit`/`Write` hook 으로 "implementation 본문을 Read 하기 전 Edit 시도" 를 시스템적으로 차단한다. 부수적으로 `install-global.sh enable_hooks()` 의 `install/lib/*.mjs` copy 누락 (regression-recall 의 hook-shared.mjs / cache-write.mjs ESM resolve fail) 을 같이 수리하고, hook 등록 순서를 dispatcher 1개로 통합한다.

- **본질**: PreToolUse Edit/Write matcher → file_path realpath 정규화 → 현재 turn 의 read-log 매칭 → 0건이면 deny.
- **부수**: install lib copy idempotent + UserPromptSubmit canonical dispatcher 통합 + uninstall 확장.

## Acceptance Criteria

1. `install/hooks/edit-read-guard.mjs` 신규 — PreToolUse hook (Edit + Write matcher), realpath 정규화 + tool_name 별 분기 + bypass-token 단발성 처리.
2. `install/lib/turn-state.mjs` 신규 — `~/.cache/kzk-harness/current-turn.json` atomic write (tmp+rename) + `~/.cache/kzk-harness/read-log.jsonl` `O_APPEND` + `flock` 동시 append 안전성.
3. `install/hooks/dispatcher.mjs` 신규 — UserPromptSubmit canonical order: (1) read-log clear + turn-id rotate, (2) keyword-detector, (3) regression-recall, (4) fix-scope-trigger.
4. `install-global.sh enable_hooks()` 갱신 — `install/lib/*.mjs` 전부 `~/.claude/skills/.kzk-harness-shared/lib/` 로 copy. **idempotent**: 동일 byte 면 skip, 차이면 overwrite. `lib/` mkdir 보장.
5. `install-global.sh enable_hooks()` 갱신 — settings.json 의 PreToolUse + PostToolUse + UserPromptSubmit hook 배열을 **canonical 재구성** (단순 append 폐기). `kzk-harness-canonical-v1` marker 로 기존 kzk hook 식별 후 일괄 교체.
6. `uninstall-global.sh` 갱신 — PreToolUse + PostToolUse + UserPromptSubmit 셋 다 cleanup (현재는 UserPromptSubmit 만).
7. Path canonicalization — `fs.realpathSync` 정규화. Read PostToolUse / Edit·Write PreToolUse 동일 form 으로 일치.
8. tool_name 별 분기 — `Write` 만 `lstat` ENOENT 시 allow (신규 파일 의도), `Edit` 는 read-required (존재 안 하면 deny + ENOENT 메시지).
9. Single-use bypass — `~/.cache/kzk-harness/bypass-token` 파일 존재 시 `unlink` + 1회 allow. env 변수 (`OMC_SKIP_HOOKS=edit-read-guard`) 는 별개 kill switch.
10. `install/test/edit-read-guard.test.mjs` 신규 — 6 case (read 후 edit allow / read 없이 edit deny / Write ENOENT allow / bypass token 1회 + 두번째 deny / cross-turn deny / symlink realpath 정규화 일치).
11. `skills/kzk-tool-retry/SKILL.md` v1.2 → v1.3 — `## PreToolUse guard` subsection 신규. "guard 는 `Read` tool 호출만 인정. shell `grep`/`cat` tracker 안 잡힘" 명시.
12. `harness-share.md` §27 끝에 PreToolUse guard cross-ref.
13. `install/test/run-tests.sh` 갱신 — `edit-read-guard.test.mjs` 호출 등록.
14. `bash install/test/run-tests.sh` PASS.
15. **Skill count 변경 없음** — 16 skill 그대로. `git diff CLAUDE.md README.md` 결과에 skill count line 미포함 확인 (Plan F 신규 skill 0개).
16. atomic commit: `feat(hooks): edit-read-guard PreToolUse + install lib copy fix (Plan F)`.

## Variables

- `HOOK_GUARD = /Users/kimzerokim/work/personal/kzk-harness/install/hooks/edit-read-guard.mjs`
- `HOOK_DISP = /Users/kimzerokim/work/personal/kzk-harness/install/hooks/dispatcher.mjs`
- `LIB_TURN = /Users/kimzerokim/work/personal/kzk-harness/install/lib/turn-state.mjs`
- `INSTALL_SH = /Users/kimzerokim/work/personal/kzk-harness/install/install-global.sh`
- `UNINSTALL_SH = /Users/kimzerokim/work/personal/kzk-harness/install/uninstall-global.sh`
- `TEST_GUARD = /Users/kimzerokim/work/personal/kzk-harness/install/test/edit-read-guard.test.mjs`
- `TEST_RUN = /Users/kimzerokim/work/personal/kzk-harness/install/test/run-tests.sh`
- `SKILL_TR = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-tool-retry/SKILL.md`
- `SHARE = /Users/kimzerokim/work/personal/kzk-harness/harness-share.md`
- `STATE_DIR = ~/.cache/kzk-harness/`
- `TURN_FILE = ~/.cache/kzk-harness/current-turn.json`
- `READ_LOG = ~/.cache/kzk-harness/read-log.jsonl`
- `BYPASS_FILE = ~/.cache/kzk-harness/bypass-token`

## Tasks

### Task 1 — `install/lib/turn-state.mjs` 신규

**File**: `$LIB_TURN`

State file 관리 단일 SoT. `current-turn.json` 은 atomic write (tmp 작성 → `fs.renameSync`). `read-log.jsonl` 은 `fs.openSync(..., "a")` + `fcntl` flock (Node 23 `--experimental-permission` 외 fallback: `proper-lockfile` 미사용, `O_APPEND` semantics + 단일 line `JSON.stringify` 보장으로 atomic append).

**API export**:
- `getStateDir()` → `~/.cache/kzk-harness/` (mkdir recursive 보장)
- `rotateTurn()` → 새 uuid-v4 turn-id 생성, `current-turn.json` atomic write, `read-log.jsonl` truncate (`fs.writeFileSync(path, "")`).
- `currentTurnId()` → `current-turn.json` 읽고 `turn_id` 반환. 없으면 `null`.
- `appendRead(realpath)` → `{"turn":"<id>","file":"<realpath>","ts":"<ISO>"}\n` 한 줄 `O_APPEND` open + 단일 `writeSync` (atomic, ≤4KB POSIX 보장 가정).
- `hasReadInTurn(realpath, turnId)` → `read-log.jsonl` 라인 stream + JSON.parse + `turn === turnId && file === realpath` 매칭.

**구현 룰**:
- 모든 path 는 `fs.realpathSync` 정규화 후 비교 (caller 책임 + 본 lib 내부 한 번 더 호출 OK — idempotent).
- `read-log.jsonl` 파싱 실패 라인 (corrupt) 은 silent skip + stderr WARN.
- `flock` POSIX-only — Linux/macOS 둘 다 OK. Windows 미지원 (이 repo 는 macOS/Linux 전제).

### Task 2 — `install/hooks/edit-read-guard.mjs` 신규

**File**: `$HOOK_GUARD`

PreToolUse hook entry. stdin JSON payload: `{tool_name, tool_input: {file_path, ...}}` (Claude Code hook spec).

**알고리즘**:
1. `tool_name` 이 `Edit` / `Write` 가 아니면 `{continue: true}` 즉시 반환.
2. `OMC_SKIP_HOOKS` 환경변수에 `edit-read-guard` 포함되면 `{continue: true}` (kill switch).
3. `BYPASS_FILE` 존재 시 `fs.unlinkSync` (single-use) + `{continue: true}` 반환 (stderr 에 bypass used 로그).
4. `tool_input.file_path` 추출 → `fs.realpathSync` 시도.
   - 정규화 실패 (ENOENT) 시:
     - `tool_name === "Write"` → allow (신규 파일 작성 의도).
     - `tool_name === "Edit"` → deny + 메시지 "File does not exist; cannot Edit. Use Write to create.".
5. `currentTurnId()` 호출. `null` (turn rotate 안 됨) 시 → fallback: 첫 prompt 전이라 무조건 deny 위험. 사용자 첫 prompt 전 메인이 Edit 호출하는 경우는 거의 없음 → deny + 메시지 "Turn state missing — restart session or run dispatcher."
6. `hasReadInTurn(realpath, turnId)` →
   - true → `{continue: true}`.
   - false → `{decision: "block", reason: <DENY_MSG>}` 반환 (Claude Code hook deny convention).

**Deny 메시지 형식** (spec rev2 §Deny 메시지 그대로):
```
[edit-read-guard] Read this file first within the current turn.
File: <realpath>
Bypass: touch ~/.cache/kzk-harness/bypass-token (one-shot)
Disable: OMC_SKIP_HOOKS=edit-read-guard
```

**Note**: PostToolUse `Read` hook 등록은 **dispatcher 가 아닌 별도 PostToolUse hook 으로 분리**. 본 task 의 PreToolUse 와 짝이 되는 PostToolUse hook 은 `install/hooks/edit-read-guard.mjs` 에서 같은 파일 내 `--mode=post-read` 분기로 처리 (단일 파일 내 두 모드).

- `--mode=post-read` 호출 시: `tool_name === "Read"` 매칭 → `tool_input.file_path` realpath 정규화 → `appendRead(realpath)` 호출 → `{continue: true}`.

### Task 3 — `install/hooks/dispatcher.mjs` 신규

**File**: `$HOOK_DISP`

UserPromptSubmit canonical dispatcher. stdin payload pass-through.

**순서** (spec rev2 §Hook 등록):
1. `rotateTurn()` (turn-state.mjs) — 새 turn-id 생성 + read-log truncate.
2. `keyword-detector.mjs` 호출 (child_process.spawnSync, stdin pass + stdout collect).
3. `regression-recall.mjs` 호출 (DO_REGRESSION_RECALL 활성 시만 — 없으면 skip).
4. `fix-scope-trigger.mjs` 호출 (DO_FIX_SCOPE_TRIGGER 활성 시만).

**stdout 합치기 룰**:
- 각 sub-hook 의 stdout JSON line 들을 collect.
- `hookSpecificOutput.additionalContext` 가 있으면 concat (`\n\n` 구분).
- `continue: false` 가 한 번이라도 나오면 즉시 `{continue: false, reason: <첫 reason>}` 반환.
- 모두 OK 면 통합 `{hookSpecificOutput: {hookEventName: "UserPromptSubmit", additionalContext: <합본>}}`.

**활성 플래그 감지**: `~/.claude/skills/.kzk-harness-shared/hooks/<hook>.mjs` 파일 존재 여부로 판단 (install-global.sh 가 활성 hook 만 copy 하는 컨벤션 활용).

### Task 4 — `install/install-global.sh enable_hooks()` 갱신

**File**: `$INSTALL_SH` (line 632–720)

#### 4-1. lib 복사 idempotent

기존 `mkdir -p .../lib` + `cp sidecar-write.mjs` 만 → 변경: `install/lib/` 디렉토리 전체를 loop 으로 copy.

```bash
mkdir -p "$HOME/.claude/skills/.kzk-harness-shared/lib"
for libfile in "$src/install/lib"/*.mjs; do
  [ -f "$libfile" ] || continue
  local base="$(basename "$libfile")"
  local dest="$HOME/.claude/skills/.kzk-harness-shared/lib/$base"
  if [ -f "$dest" ] && cmp -s "$libfile" "$dest"; then
    emit "  hooks: lib/$base unchanged — skip"
  else
    cp "$libfile" "$dest"
    emit "  hooks: lib/$base copied"
    record "hooks: lib/$base copied"
  fi
done
```

이로써 `hook-shared.mjs`, `cache-write.mjs`, `sidecar-write.mjs`, `turn-state.mjs` 전부 자동 sync.

#### 4-2. PreToolUse + PostToolUse hook 등록 (canonical 재구성)

기존 UserPromptSubmit 단순 append 패턴 폐기. 새 `update_hooks_canonical()` helper 추가:

```bash
update_hooks_canonical() {
  local settings="$1"
  local pre_cmd="node $HOME/.claude/skills/.kzk-harness-shared/hooks/edit-read-guard.mjs"
  local post_cmd="node $HOME/.claude/skills/.kzk-harness-shared/hooks/edit-read-guard.mjs --mode=post-read"
  local disp_cmd="node $HOME/.claude/skills/.kzk-harness-shared/hooks/dispatcher.mjs"

  local tmp; tmp=$(mktemp)

  # canonical reconstruct — PreToolUse Edit|Write, PostToolUse Read, UserPromptSubmit *
  jq --arg pre "$pre_cmd" --arg post "$post_cmd" --arg disp "$disp_cmd" '
    # strip existing kzk hooks (식별: command 가 .kzk-harness-shared 경로 포함)
    .hooks.PreToolUse = (((.hooks.PreToolUse // []) | map(
        .hooks |= map(select((.command // "") | contains(".kzk-harness-shared/hooks/") | not))
      ) | map(select((.hooks // []) | length > 0))) +
      [{matcher:"Edit|Write", hooks:[{type:"command", command:$pre}]}])
    | .hooks.PostToolUse = (((.hooks.PostToolUse // []) | map(
        .hooks |= map(select((.command // "") | contains(".kzk-harness-shared/hooks/") | not))
      ) | map(select((.hooks // []) | length > 0))) +
      [{matcher:"Read", hooks:[{type:"command", command:$post}]}])
    | .hooks.UserPromptSubmit = (((.hooks.UserPromptSubmit // []) | map(
        .hooks |= map(select((.command // "") | contains(".kzk-harness-shared/hooks/") | not))
      ) | map(select((.hooks // []) | length > 0))) +
      [{matcher:"*", hooks:[{type:"command", command:$disp}]}])
  ' "$settings" >"$tmp" && mv "$tmp" "$settings" || return 1
}
```

기존 keyword-detector / regression-recall / fix-scope-trigger 의 개별 append 블럭은 폐기 (dispatcher 가 활성 플래그 보고 위임). install-global.sh 의 `--regression-recall` / `--fix-scope-trigger` 플래그는 *.mjs 파일 copy 만 담당. settings.json 등록은 `update_hooks_canonical()` 일괄 처리.

#### 4-3. Edit-read-guard 무조건 활성

`--enable-hooks` 가 ON 이면 edit-read-guard 자동 활성 (별 flag 없음, spec rev2 lock).

```bash
cp "$src/install/hooks/edit-read-guard.mjs" \
  "$HOOK_DEST/" || return 1
cp "$src/install/hooks/dispatcher.mjs" \
  "$HOOK_DEST/" || return 1
```

호출: `enable_hooks()` 함수 끝에서 `update_hooks_canonical "$settings" || return 1`.

### Task 5 — `install/uninstall-global.sh` 갱신

**File**: `$UNINSTALL_SH`

기존 UserPromptSubmit 만 cleanup → PreToolUse + PostToolUse + UserPromptSubmit 모두 cleanup 으로 확장. jq 표현식:

```bash
jq '
  .hooks.PreToolUse = ((.hooks.PreToolUse // []) | map(
    .hooks |= map(select((.command // "") | contains(".kzk-harness-shared/hooks/") | not))
  ) | map(select((.hooks // []) | length > 0)))
  | .hooks.PostToolUse = ((.hooks.PostToolUse // []) | map(
    .hooks |= map(select((.command // "") | contains(".kzk-harness-shared/hooks/") | not))
  ) | map(select((.hooks // []) | length > 0)))
  | .hooks.UserPromptSubmit = ((.hooks.UserPromptSubmit // []) | map(
    .hooks |= map(select((.command // "") | contains(".kzk-harness-shared/hooks/") | not))
  ) | map(select((.hooks // []) | length > 0)))
' "$settings" >"$tmp" && mv "$tmp" "$settings"
```

빈 배열은 그대로 두지 말고 키 자체 삭제 (선택적). 기존 동작 유지하려면 빈 배열 OK.

### Task 6 — `install/test/edit-read-guard.test.mjs` 신규

**File**: `$TEST_GUARD`

Node test runner (`node --test`) 6 case. 각 case 는 fixture state dir 격리 (`KZK_STATE_DIR` env 로 turn-state.mjs 가 override 받게 turn-state.mjs 에 ENV check 추가).

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const HOOK = path.resolve("install/hooks/edit-read-guard.mjs");

function withFixture(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "guardf-"));
  const stateDir = path.join(dir, "state");
  fs.mkdirSync(stateDir, { recursive: true });
  const file = path.join(dir, "target.txt");
  fs.writeFileSync(file, "hello");
  try { return fn({ dir, stateDir, file }); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

function callHook({ stateDir, mode, payload }) {
  const args = mode ? ["--mode=" + mode] : [];
  return spawnSync("node", [HOOK, ...args], {
    input: JSON.stringify(payload),
    env: { ...process.env, KZK_STATE_DIR: stateDir, OMC_SKIP_HOOKS: "" },
    encoding: "utf8",
  });
}

test("read → edit allow", () => withFixture(({ stateDir, file }) => {
  // rotate turn first (simulate dispatcher)
  callHook({ stateDir, payload: { __rotate: true } });  // helper mode in impl
  callHook({ stateDir, mode: "post-read", payload: { tool_name: "Read", tool_input: { file_path: file } } });
  const r = callHook({ stateDir, payload: { tool_name: "Edit", tool_input: { file_path: file } } });
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue ?? !out.decision, true);
}));

test("edit without read deny", () => withFixture(({ stateDir, file }) => {
  callHook({ stateDir, payload: { __rotate: true } });
  const r = callHook({ stateDir, payload: { tool_name: "Edit", tool_input: { file_path: file } } });
  const out = JSON.parse(r.stdout);
  assert.equal(out.decision, "block");
  assert.match(out.reason, /Read this file first/);
}));

test("Write ENOENT allow", () => withFixture(({ stateDir, dir }) => {
  callHook({ stateDir, payload: { __rotate: true } });
  const r = callHook({ stateDir, payload: { tool_name: "Write", tool_input: { file_path: path.join(dir, "newfile.txt") } } });
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
}));

test("bypass token single-use", () => withFixture(({ stateDir, file }) => {
  callHook({ stateDir, payload: { __rotate: true } });
  fs.writeFileSync(path.join(stateDir, "bypass-token"), "");
  const r1 = callHook({ stateDir, payload: { tool_name: "Edit", tool_input: { file_path: file } } });
  assert.equal(JSON.parse(r1.stdout).continue, true);
  const r2 = callHook({ stateDir, payload: { tool_name: "Edit", tool_input: { file_path: file } } });
  assert.equal(JSON.parse(r2.stdout).decision, "block");
}));

test("cross-turn deny", () => withFixture(({ stateDir, file }) => {
  callHook({ stateDir, payload: { __rotate: true } });
  callHook({ stateDir, mode: "post-read", payload: { tool_name: "Read", tool_input: { file_path: file } } });
  callHook({ stateDir, payload: { __rotate: true } });  // new turn
  const r = callHook({ stateDir, payload: { tool_name: "Edit", tool_input: { file_path: file } } });
  assert.equal(JSON.parse(r.stdout).decision, "block");
}));

test("symlink realpath normalize", () => withFixture(({ stateDir, file, dir }) => {
  const link = path.join(dir, "link.txt");
  fs.symlinkSync(file, link);
  callHook({ stateDir, payload: { __rotate: true } });
  // Read via real path
  callHook({ stateDir, mode: "post-read", payload: { tool_name: "Read", tool_input: { file_path: file } } });
  // Edit via symlink — realpath 정규화 후 같은 파일 → allow
  const r = callHook({ stateDir, payload: { tool_name: "Edit", tool_input: { file_path: link } } });
  assert.equal(JSON.parse(r.stdout).continue ?? !JSON.parse(r.stdout).decision, true);
}));
```

**구현 보조**: turn-state.mjs 가 `KZK_STATE_DIR` 환경변수 인식 (test fixture 격리용). edit-read-guard.mjs 에 `__rotate: true` 페이로드 helper 모드 (test 한정 — 실제로는 dispatcher 가 rotate 호출).

### Task 7 — `skills/kzk-tool-retry/SKILL.md` v1.2 → v1.3

**File**: `$SKILL_TR`

**Frontmatter**:
- `version: 1.2.0` → `version: 1.3.0`
- description trigger 끝에 추가: `'PreToolUse guard'`, `'edit-read-guard'`, `'Read first'`

**§PreToolUse guard subsection 신규** (기존 §Pre-emptive Read protocol 다음 위치):

```markdown
## PreToolUse guard (edit-read-guard hook)

Plan F 부터 PreToolUse `Edit`/`Write` 시스템 hook 으로 차단 강제. 메인 self-discipline 가 아닌 OS-level guard.

- **Read 인정 범위**: Claude Code `Read` tool 호출만 — turn 단위 read-log 에 file_path 의 realpath 가 기록될 때.
- **인정 안 됨**: shell `cat`, `grep`, `sed`, `awk`, `head`, `tail` — Bash tool 안에서 실행되더라도 hook tracker 가 못 잡음. Edit 직전 반드시 별도 `Read` tool 호출.
- **bypass**: `touch ~/.cache/kzk-harness/bypass-token` — 단발성 (1회 Edit/Write 후 자동 unlink). 사용자 explicit 의도 표명용.
- **kill switch**: `OMC_SKIP_HOOKS=edit-read-guard` env — 세션 단위 비활성.
- **turn 단위**: 매 사용자 prompt 마다 turn-id 회전 + read-log truncate. 이전 turn 의 Read 는 이번 turn 에 인정 안 됨.

cross-ref: `harness-share.md` §27.
```

### Task 8 — `harness-share.md` §27 cross-ref

**File**: `$SHARE`

기존 §27 (kzk-tool-retry tool-failure auto-retry discipline) 끝에 추가:

```markdown
### 27.1 PreToolUse Edit/Write Read-Guard (Plan F)

OS-level hook 으로 "Read 없이 Edit" 차단. 본문: `kzk-tool-retry` §PreToolUse guard.

- `~/.claude/skills/.kzk-harness-shared/hooks/edit-read-guard.mjs` (PreToolUse Edit|Write + PostToolUse Read).
- Turn state: `~/.cache/kzk-harness/{current-turn.json, read-log.jsonl}` (atomic + flock).
- Bypass: `touch ~/.cache/kzk-harness/bypass-token` (one-shot).
- Kill switch: `OMC_SKIP_HOOKS=edit-read-guard`.
- Disable: `bash uninstall-global.sh` (PreToolUse + PostToolUse + UserPromptSubmit 셋 다 cleanup).
```

### Task 9 — `install/test/run-tests.sh` 갱신

**File**: `$TEST_RUN`

종합 result 직전 (skill-text-checks 다음) 에 추가:

```bash
# Plan F — edit-read-guard
printf '\n--- edit-read-guard.test.mjs (Plan F) ---\n'
if node --test "$REPO_ROOT/install/test/edit-read-guard.test.mjs"; then
  PASS=$((PASS + 1))
  printf '  PASS: edit-read-guard.test.mjs\n'
else
  FAIL=$((FAIL + 1))
  ERRORS+=("edit-read-guard.test.mjs")
fi
```

### Task 10 — atomic commit

`kzk-pre-commit-gate` 통과 (Gate 0–4):
- Gate 0: AGENTS.md sync — Plan F 신규 skill 0개 → AGENTS.md 변경 없음 확인 (`git diff AGENTS.md` empty).
- Gate 1: ai-slop scan
- Gate 1.5: secrets scan — state file path 는 `~/.cache/kzk-harness/` 만, 비밀 없음.
- Gate 2: build (n/a — JS / shell only)
- Gate 3: test — `bash install/test/run-tests.sh` PASS (skill-text-checks + edit-read-guard 둘 다).
- Gate 4: Playwright (n/a — non-UI).

commit message:

```
feat(hooks): edit-read-guard PreToolUse + install lib copy fix (Plan F)

PreToolUse Edit|Write hook — realpath 정규화 + tool_name 별 분기 (Write ENOENT allow / Edit read-required) + single-use bypass token.
Turn state on-disk: ~/.cache/kzk-harness/current-turn.json (atomic) + read-log.jsonl (O_APPEND + flock).
UserPromptSubmit dispatcher 1개로 통합 (canonical order: read-log clear → keyword-detector → regression-recall → fix-scope-trigger).
install-global.sh enable_hooks() — install/lib/*.mjs idempotent copy (cmp -s skip / overwrite). hook 배열 canonical 재구성.
uninstall-global.sh — PreToolUse + PostToolUse + UserPromptSubmit 셋 다 cleanup.
kzk-tool-retry v1.3 — §PreToolUse guard subsection (shell grep/cat tracker 안 잡힘 명시).
harness-share.md §27.1 cross-ref.
edit-read-guard.test.mjs — 6 case (read→edit allow / read 없이 deny / Write ENOENT / bypass single-use / cross-turn deny / symlink realpath).

Spec: docs/plans/edit-read-guard-spec.md (rev2, frozen).
Plan: docs/plans/plan-F-edit-read-guard.md (frozen).
Skill count 변경 없음 (16).
```

## Test 전략

- `edit-read-guard.test.mjs` 6 case — fixture-격리 (KZK_STATE_DIR env override) 단위 검증. behavioral test 는 manual cycle (다음 session 의 실제 Edit 시도 차단 확인).
- 한계: dispatcher 의 sub-hook 합본 stdout 통합 테스트 미포함 — manual `--enable-hooks` 후 prompt 수동 검증 의존.
- regression-recall 의 ESM resolve fail 수리 검증: install 후 `node ~/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs <<< '{}'` 직접 실행 → no `node:internal/modules/esm/resolve` error.

## Rollback

| Level | 메커니즘 |
|---|---|
| Plan revert | `git revert <Plan-F-sha>` — hook 파일/lib/skill v1.3/share §27.1/test 모두 한 commit 복원 |
| Hook 전체 비활성 | `bash install/uninstall-global.sh` — PreToolUse + PostToolUse + UserPromptSubmit 셋 다 settings.json 에서 제거 |
| edit-read-guard 만 비활성 | `OMC_SKIP_HOOKS=edit-read-guard` env (세션 단위) |
| 단발 bypass | `touch ~/.cache/kzk-harness/bypass-token` (1회 Edit 후 자동 unlink) |
| settings.json 수동 복구 | `~/.claude/settings.json` 의 PreToolUse/PostToolUse 배열 직접 편집 |

## Out of scope

- behavioral 자동 test (실제 Claude Code 세션 시뮬레이션) — manual cycle 검증 의존.
- Windows 지원 — POSIX flock 의존, 본 repo 범위 밖.
- 다른 PreToolUse matcher (Bash 등) 확장 — 본 spec rev2 는 Edit + Write 만.
- Read tracker 를 Bash `cat`/`grep` 까지 확장 — 본 spec rev2 §함정 6 명시 거부 (false positive 위험).

## Codex review 의무

본 plan draft 는 frozen 전 codex CLI consult (stdin path) → critic opus fallback. spec rev2 §메타 룰 "1 spec = 1 round" 적용 — codex review 1회 후 결과 보고 frozen 처리.

codex
문서만으로도 큰 방향은 보이는데, dispatcher 통합과 jq 재구성이 실제 기존 hook 구조와 맞물리는지 보려면 현재 설치 스크립트와 hook 파일 naming을 확인해야 합니다. 지금은 등록 방식과 기존 hook의 독립 실행 가정을 짧게 대조하겠습니다.
exec
/bin/zsh -lc "sed -n '1,260p' install/hooks/keyword-detector.mjs" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
#!/usr/bin/env node
// keyword-detector.mjs — UserPromptSubmit hook for kzk-harness skill auto-load.
//
// Detects user-prompt phrases that should trigger specific kzk-* skill loads
// and emits a system-reminder pointing the main context at the right skills
// BEFORE it can read/edit files. Closes the meta-gap pattern where main loads
// only kzk-codebase-survey for a multi-bug task and skips kzk-large-task-delegation.
//
// Authoritative spec: docs/plans/2026-05-04-kzk-global-install-design.md §7.5
// Wired into ~/.claude/settings.json by `install-global.sh --enable-hooks` (N3 opt-in).

const RULES = [
  {
    skills: ["kzk-large-task-delegation"],
    why: "3+ file edits / 5+ file read / multi-plan execution mandates fresh-subagent dispatch — main never executes",
    triggers: [
      "큰 작업", "버그 전수조사", "구현 검증", "마무리 해줘", "전수 검토", "끝내줘",
      "large task", "subagent dispatch", "3+ file edits", "200+ LoC", "5+ file read",
      "read-heavy audit", "spec verification", "implementation audit",
      "사용성 버그", "사용성 회귀", "qa scan", "QA scan",
      "여러 plan 으로 쪼개", "여러 plan으로 쪼개", "플랜 여러개로 쪼개", "플랜 쪼개", "plan 쪼개", "plan 여러개",
      "사이클 자율", "사이클로 자율", "사이클 돌면서", "자율로 돌면서",
      "버그들 모두", "버그 모두 개선", "모두 잡아줘", "모두 개선",
      "리팩토링", "refactor", "정리해줘", "cleanup", "개선해줘", "전반적으로", "통째로", "scope estimate",
    ],
  },
  {
    skills: ["kzk-codebase-survey", "kzk-large-task-delegation"],
    why: "codebase survey precedes any large-scope edit; large-task-delegation is the mandatory next hop",
    triggers: [
      "codebase survey", "코드베이스 탐색", "deep explore", "survey first", "before planning",
      "구현 확인", "spec vs implementation", "spec 체크", "스펙 체크", "하나하나 확인", "ralph로 체크",
    ],
  },
  {
    skills: ["kzk-spec-and-review"],
    why: "spec / plan / major-design authoring requires Step 0 survey + Steps 1-3 codex review",
    triggers: [
      "spec 잡자", "spec 작성", "spec draft", "plan draft", "plan 작성",
      "design draft", "major design", "architecture review", "codex review", "codex consult", "cross-verify",
      "플랜 만들", "plan 만들", "여러 plan", "플랜 여러개", "메타 plan", "meta plan", "spec 만들",
    ],
  },
  {
    skills: ["kzk-autonomous-boundary"],
    why: "autonomous-mode entry requires the ASK-FIRST 3-slot branch contract (kzk-autonomous-boundary §Branch contract)",
    triggers: [
      "ralph로 돌려", "ralph로 체크", "ralph로 확인", "자는 동안 진행",
      "실행해놔야 queue 보지", "끝까지 끝내줘", "autonomous mode",
      "자율실행", "자율 실행", "자율로 돌려",
    ],
  },
  {
    skills: ["kzk-spec-and-review", "kzk-large-task-delegation", "kzk-pre-commit-gate", "kzk-autonomous-loop"],
    why: "self-improvement loop entry — load the full meta-stack to avoid recursive meta-gap",
    triggers: ["harness 개선 루프", "스킬 개선해줘", "harness loop", "자가개선", "자가개선 루프", "재발 방지", "메타 갭"],
  },
  {
    skills: ["kzk-test-coverage"],
    why: "TDD discipline — failing test (red) BEFORE impl (green) BEFORE refactor BEFORE commit; coverage gate gates the result",
    triggers: [
      "tdd", "TDD", "test first", "테스트 먼저", "테스트부터", "failing test", "red-green",
      "테스트 추가", "테스트 추가해줘", "test 추가", "coverage 추가",
    ],
  },
];

function detect(input) {
  const matched = new Map();
  for (const rule of RULES) {
    for (const trig of rule.triggers) {
      if (input.includes(trig)) {
        for (const skill of rule.skills) {
          if (!matched.has(skill)) matched.set(skill, { triggers: new Set(), whys: new Set() });
          matched.get(skill).triggers.add(trig);
          matched.get(skill).whys.add(rule.why);
        }
      }
    }
  }
  return Array.from(matched.entries()).map(([skill, info]) => ({
    skill,
    triggers: Array.from(info.triggers),
    whys: Array.from(info.whys),
  }));
}

function buildReminder(matches) {
  if (matches.length === 0) return null;
  // Group skills into clusters by shared trigger phrases
  const skillNames = matches.map((m) => m.skill).join(", ");
  const allTriggers = [...new Set(matches.flatMap((m) => m.triggers))];
  const triggersStr = allTriggers.map((t) => `'${t}'`).join(", ");
  return `🚨 [kzk] LOAD before edit: ${skillNames} (matched: ${triggersStr})`;
}

export { detect, buildReminder, RULES };

if (process.argv[1] === new URL(import.meta.url).pathname) {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { raw += chunk; });
  process.stdin.on("end", () => {
    let payload;
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }
    const prompt = String(payload.prompt ?? payload.user_prompt ?? "");
    const matches = detect(prompt);
    const reminder = buildReminder(matches);
    if (reminder) {
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "UserPromptSubmit",
            additionalContext: reminder,
          },
        }) + "\n",
      );
    } else {
      process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    }
  });
}

exec
/bin/zsh -lc "sed -n '1,260p' install/hooks/regression-recall.mjs" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
#!/usr/bin/env node
// regression-recall.mjs — UserPromptSubmit hook for kzk-regression-memory.
// rev2 — codex #4 (orphan cleanup 분리), #5 (자가-skip 동사구), #6 (atomic write),
//        #7 (gstack 미설치 stderr WARN).
// Authoritative spec: docs/plans/regression-memory-and-fix-quality-spec.md (rev7).
// Default DISABLED at Plan D commit. Auto-enabled by kzk-pre-merge-sync last step.

import { execSync } from "node:child_process";
import path from "node:path";
import { mutateSidecar, readSidecar } from "../lib/sidecar-write.mjs";
import { FIX_KEYWORDS, SELF_IMPROVE_VERBPHRASES, shouldSkip, detectFixIntent, normalizeQuery } from "../lib/hook-shared.mjs";

// rev2 codex #5 — 동사구만, 명사 단독 금지 (now sourced from hook-shared.mjs — single SoT)
// FIX_KEYWORDS, SELF_IMPROVE_VERBPHRASES, shouldSkip, detectFixIntent, normalizeQuery
// all imported above. Local definitions removed to prevent drift.

const DECAY_BASE = 0.85;
const CONFIDENCE_THRESHOLD = 4;

// rev2 codex #7 — gstack 미설치 시 stderr WARN + structured _warn
function querylearn(query) {
  try {
    const out = execSync(`gstack learn search --query ${JSON.stringify(query)} --format jsonl`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 5000,
    });
    return { entries: out.split("\n").filter(Boolean).map((l) => JSON.parse(l)), warn: null };
  } catch (e) {
    process.stderr.write(`[regression-recall] gstack search failed: ${e.message}\n`);
    return { entries: null, warn: "gstack-not-installed-or-search-failed" };
  }
}

// rev2 codex #4 — full /learn snapshot for orphan cleanup
function listAllLearnKeys() {
  try {
    const out = execSync(`gstack learn list --keys-only`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 5000,
    });
    return out.split("\n").map((s) => s.trim()).filter(Boolean);
  } catch {
    return null;  // gstack 미설치 → orphan cleanup skip (false-positive 삭제 차단)
  }
}

function decay(confidence, dismissCount) {
  return confidence * Math.pow(DECAY_BASE, dismissCount);
}

// rev2 codex #4 — cleanup 은 allLearnKeys 기준 (searchHits 아님)
async function orphanCleanup(sidecarPath, allLearnKeys) {
  if (allLearnKeys === null) return null;  // gstack 미가용 → skip
  const keepKeys = new Set(allLearnKeys);
  let removedCount = 0;
  await mutateSidecar(sidecarPath, (entries) => {
    const survivors = entries.filter((e) => keepKeys.has(e.key));
    removedCount = entries.length - survivors.length;
    return survivors;
  });
  if (removedCount > 0) {
    process.stderr.write(`[regression-recall] orphan keys removed: ${removedCount}\n`);
  }
  return removedCount;
}

function buildReminder(hits) {
  if (hits.length === 0) return null;
  const lines = hits.map((h) => {
    const stale = h.staleFlag ? " [⚠ stale]" : "";
    return `- ${h.key}: ${h.insight} (cycle ${h.cycles.join(",")}, confidence_decayed ${h.confidenceDecayed.toFixed(2)})${stale}`;
  });
  return [
    `🚨 [REGRESSION RECALL] 과거 유사 fix ${hits.length}건:`,
    ...lines,
    `⚠ 자동 적용 금지. 매칭 정확성 검토 후 채택.`,
    `dismiss: kzk-regression-memory dismiss <key>`,
  ].join("\n");
}

export {
  shouldSkip, detectFixIntent, normalizeQuery, decay, orphanCleanup,
  buildReminder, FIX_KEYWORDS, SELF_IMPROVE_VERBPHRASES,
};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { raw += chunk; });
  process.stdin.on("end", async () => {
    let payload;
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }
    const prompt = String(payload.prompt ?? payload.user_prompt ?? "");
    const repoRoot = process.cwd();
    const sidecarPath = path.join(repoRoot, ".kzk-harness", "regression-meta.jsonl");

    const skip = shouldSkip(prompt, process.env);
    if (skip) {
      process.stdout.write(JSON.stringify({ continue: true, _skip: skip }) + "\n");
      return;
    }
    if (!detectFixIntent(prompt)) {
      process.stdout.write(JSON.stringify({ continue: true }) + "\n");
      return;
    }

    const query = normalizeQuery(prompt);
    const { entries: learnEntries, warn } = querylearn(query);

    if (learnEntries === null) {
      // gstack 미설치 — silent skip 금지 (codex #7)
      process.stdout.write(JSON.stringify({ continue: true, _warn: warn }) + "\n");
      return;
    }

    // rev2 codex #4 — orphan cleanup 은 allLearnKeys 기준만
    const allKeys = listAllLearnKeys();
    await orphanCleanup(sidecarPath, allKeys);

    // re-read sidecar after potential cleanup
    const sidecarEntries = readSidecar(sidecarPath);
    const sidecarByKey = new Map(sidecarEntries.map((e) => [e.key, e]));

    const hits = [];
    for (const learnEntry of learnEntries) {
      const meta = sidecarByKey.get(learnEntry.key);
      if (!meta) continue;  // sidecar 미존재 = invalid (FK 룰)
      if (meta.archived) continue;
      const dec = decay(learnEntry.confidence, meta.dismiss_count);
      if (dec < CONFIDENCE_THRESHOLD) continue;
      hits.push({
        key: learnEntry.key,
        insight: learnEntry.insight,
        cycles: meta.related_cycles,
        confidenceDecayed: dec,
        staleFlag: meta.stale ?? false,
      });
    }

    const reminder = buildReminder(hits);
    if (reminder) {
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: reminder },
        }) + "\n",
      );
    } else {
      process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    }
  });
}

exec
/bin/zsh -lc 'rg -n "enable_hooks|UserPromptSubmit|PreToolUse|PostToolUse|kzk-harness-shared/hooks|keyword-detector|regression-recall|fix-scope-trigger" install/install-global.sh install/uninstall-global.sh install/hooks -S' in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
install/hooks/keyword-detector.mjs:2:// keyword-detector.mjs — UserPromptSubmit hook for kzk-harness skill auto-load.
install/hooks/keyword-detector.mjs:113:            hookEventName: "UserPromptSubmit",
install/uninstall-global.sh:251:    local hook_marker=".kzk-harness-shared/hooks/keyword-detector.mjs"
install/uninstall-global.sh:255:      if jq 'del(.hooks.UserPromptSubmit[]? | select(.hooks[]?.command? | strings | test("kzk-harness-shared")))' \
install/uninstall-global.sh:262:      record "hooks: UserPromptSubmit entry removed"
install/install-global.sh:22:#   --enable-hooks    Install ~/.claude/skills/.kzk-harness-shared/hooks/
install/install-global.sh:23:#                     keyword-detector.mjs scaffold + register UserPromptSubmit
install/install-global.sh:81:  --enable-hooks                   Wire keyword-detector.mjs into settings.json (N3)
install/install-global.sh:82:  --regression-recall              Also wire regression-recall.mjs (implies --enable-hooks)
install/install-global.sh:83:  --fix-scope-trigger              Also wire fix-scope-trigger.mjs (Plan B, implies --enable-hooks)
install/install-global.sh:123:      --regression-recall)
install/install-global.sh:127:      --fix-scope-trigger)
install/install-global.sh:481:# Step 5.5 — OMC keyword-detector collision check
install/install-global.sh:487:  for f in "$pattern"/*/oh-my-claudecode/*/scripts/keyword-detector.mjs; do
install/install-global.sh:491:      printf 'WARNING: OMC keyword-detector intercepts '\''ralph'\'' before SKILL.md matching → kzk-autonomous-boundary may not activate via the bare keyword. Use the disambiguator phrases '\''ralph로 체크'\'' / '\''ralph로 확인'\'' which are already in the SKILL.md description (v1.0.12+). Confirm by triggering in a fresh session.\n' >&2
install/install-global.sh:630:# N3 opt-in: enable_hooks
install/install-global.sh:632:enable_hooks() {
install/install-global.sh:634:  mkdir -p "$HOME/.claude/skills/.kzk-harness-shared/hooks"
install/install-global.sh:638:  cp "$src/install/hooks/keyword-detector.mjs" \
install/install-global.sh:639:    "$HOME/.claude/skills/.kzk-harness-shared/hooks/"
install/install-global.sh:641:  # Plan D: regression-recall hook + sidecar-write lib + dismiss bin
install/install-global.sh:643:    cp "$src/install/hooks/regression-recall.mjs" \
install/install-global.sh:644:      "$HOME/.claude/skills/.kzk-harness-shared/hooks/"
install/install-global.sh:663:  # Idempotent append: keyword-detector
install/install-global.sh:664:  local kd_cmd="node $HOME/.claude/skills/.kzk-harness-shared/hooks/keyword-detector.mjs"
install/install-global.sh:666:  kd_already=$(jq --arg cmd "$kd_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
install/install-global.sh:668:    emit "  hooks: keyword-detector.mjs already registered — skip"
install/install-global.sh:669:    record "hooks: keyword-detector skip (already registered)"
install/install-global.sh:674:      .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
install/install-global.sh:676:    emit "  hooks: keyword-detector.mjs registered in ~/.claude/settings.json"
install/install-global.sh:677:    record "hooks: UserPromptSubmit hook registered (--enable-hooks)"
install/install-global.sh:680:  # Plan D: regression-recall idempotent append
install/install-global.sh:682:    cp "$src/install/hooks/regression-recall.mjs" \
install/install-global.sh:683:      "$HOME/.claude/skills/.kzk-harness-shared/hooks/" 2>/dev/null || true
install/install-global.sh:684:    local rr_cmd="node $HOME/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs"
install/install-global.sh:686:    rr_already=$(jq --arg cmd "$rr_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
install/install-global.sh:688:      emit "  hooks: regression-recall.mjs already registered — skip"
install/install-global.sh:689:      record "hooks: regression-recall skip (already registered)"
install/install-global.sh:693:        .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
install/install-global.sh:695:      emit "  hooks: regression-recall.mjs registered (--regression-recall)"
install/install-global.sh:696:      record "hooks: regression-recall hook registered (--regression-recall, depends on --enable-hooks)"
install/install-global.sh:700:  # Plan B: fix-scope-trigger idempotent append
install/install-global.sh:702:    cp "$src/install/hooks/fix-scope-trigger.mjs" \
install/install-global.sh:703:      "$HOME/.claude/skills/.kzk-harness-shared/hooks/" 2>/dev/null || true
install/install-global.sh:704:    local fst_cmd="node $HOME/.claude/skills/.kzk-harness-shared/hooks/fix-scope-trigger.mjs"
install/install-global.sh:706:    fst_already=$(jq --arg cmd "$fst_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
install/install-global.sh:708:      emit "  hooks: fix-scope-trigger.mjs already registered — skip"
install/install-global.sh:709:      record "hooks: fix-scope-trigger skip (already registered)"
install/install-global.sh:713:        .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
install/install-global.sh:715:      emit "  hooks: fix-scope-trigger.mjs registered (--fix-scope-trigger)"
install/install-global.sh:716:      record "hooks: fix-scope-trigger hook registered (--fix-scope-trigger, depends on --enable-hooks)"
install/install-global.sh:789:  # Plan D: --regression-recall 는 --enable-hooks 의 explicit dependency
install/install-global.sh:791:    emit "  --regression-recall implies --enable-hooks (explicit dependency)"
install/install-global.sh:795:  # Plan B: --fix-scope-trigger 는 --enable-hooks 의 explicit dependency
install/install-global.sh:797:    emit "  --fix-scope-trigger implies --enable-hooks (explicit dependency)"
install/install-global.sh:802:    if ! enable_hooks; then
install/install-global.sh:803:      emit "  ERROR: enable_hooks failed — aborting (fail-closed for kzk-pre-merge-sync step 3)" >&2
install/hooks/regression-recall.mjs:2:// regression-recall.mjs — UserPromptSubmit hook for kzk-regression-memory.
install/hooks/regression-recall.mjs:30:    process.stderr.write(`[regression-recall] gstack search failed: ${e.message}\n`);
install/hooks/regression-recall.mjs:64:    process.stderr.write(`[regression-recall] orphan keys removed: ${removedCount}\n`);
install/hooks/regression-recall.mjs:146:          hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: reminder },
install/hooks/fix-scope-trigger.mjs:2:// fix-scope-trigger.mjs — UserPromptSubmit hook for kzk-fix-scope-expansion (Plan B).
install/hooks/fix-scope-trigger.mjs:170:      process.stderr.write(`[fix-scope-trigger] CRG failed: ${e.message} — grep fallback\n`);
install/hooks/fix-scope-trigger.mjs:176:    process.stderr.write(`[fix-scope-trigger] WARN: code-review-graph not installed or failed. grep fallback.\n`);
install/hooks/fix-scope-trigger.mjs:187:          process.stderr.write(`[fix-scope-trigger] grep failed: ${e.message}\n`);
install/hooks/fix-scope-trigger.mjs:209:    process.stderr.write(`[fix-scope-trigger] cache write failed: ${e.message}\n`);
install/hooks/fix-scope-trigger.mjs:223:      hookEventName: "UserPromptSubmit",

exec
/bin/zsh -lc "sed -n '1,260p' install/hooks/fix-scope-trigger.mjs" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
#!/usr/bin/env node
// fix-scope-trigger.mjs — UserPromptSubmit hook for kzk-fix-scope-expansion (Plan B).
// Detects fix intent, expands callsite scope via CRG or grep, injects system-reminder.
// Default DISABLED at Plan B commit. Auto-enabled by kzk-pre-merge-sync step 3.
// Authoritative spec: docs/plans/plan-B-fix-scope-expansion.md (rev2).

import { execSync } from "node:child_process";
import path from "node:path";
import { shouldSkip, detectFixIntent, FIX_KEYWORDS } from "../lib/hook-shared.mjs";
import { writeSingleEntryWithLock } from "../lib/cache-write.mjs";

// Max chars for system-reminder callsite list
const TRUNCATION_CAP = 200;

/**
 * extractSymbols — extract candidate symbol names from a prompt.
 * Patterns: backtick `name`, camelCase, snake_case, funcName()
 */
function extractSymbols(prompt) {
  const symbols = new Set();

  // backtick pattern: `symbolName`
  const backtickRe = /`([A-Za-z_][A-Za-z0-9_]{2,})`/g;
  let m;
  while ((m = backtickRe.exec(prompt)) !== null) {
    symbols.add(m[1]);
  }

  // func() pattern: word followed by ()
  const funcCallRe = /\b([A-Za-z_][A-Za-z0-9_]{2,})\s*\(\)/g;
  while ((m = funcCallRe.exec(prompt)) !== null) {
    symbols.add(m[1]);
  }

  // camelCase: contains at least one uppercase not at start
  const camelRe = /\b([a-z][a-zA-Z0-9]{3,}[A-Z][a-zA-Z0-9]*)\b/g;
  while ((m = camelRe.exec(prompt)) !== null) {
    symbols.add(m[1]);
  }

  // snake_case: word_with_underscores (min 2 parts)
  const snakeRe = /\b([a-z][a-z0-9]+(?:_[a-z0-9]+)+)\b/g;
  while ((m = snakeRe.exec(prompt)) !== null) {
    symbols.add(m[1]);
  }

  return [...symbols].slice(0, 3);  // limit to first 3 symbols
}

/**
 * runCRG — run code-review-graph detect-changes and return raw output.
 * DI-injectable runner for testing.
 * CRG signature (Task 0 confirmed): code-review-graph detect-changes --base HEAD~1
 * No --symbol, --file, query, or blast-radius subcommands exist.
 */
export function runCRG(cmd, runner = execSync) {
  return runner(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 10000 });
}

/**
 * runGrep — run grep to find callsites for a symbol.
 * DI-injectable runner for testing.
 * docs/ excluded to prevent documentation mention pollution.
 */
export function runGrep(pattern, runner = execSync) {
  const cmd = `grep -rn ${JSON.stringify(pattern)} --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' --include='*.sh' --include='*.py' --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs`;
  return runner(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 10000 });
}

/**
 * parseCRGOutput — extract file:line references from CRG detect-changes output.
 */
function parseCRGOutput(raw) {
  const lines = raw.split("\n").filter(Boolean);
  const callsites = [];
  for (const line of lines) {
    // detect-changes outputs lines like "path/to/file.mjs: function_name (line N)"
    // or just file paths with impact info
    const fileMatch = line.match(/^([^\s:]+\.[a-z]+)(?::(\d+))?/);
    if (fileMatch && !line.startsWith("[") && !line.startsWith("INFO")) {
      const ref = fileMatch[2] ? `${fileMatch[1]}:${fileMatch[2]}` : fileMatch[1];
      callsites.push(ref);
    }
  }
  return [...new Set(callsites)].slice(0, 20);
}

/**
 * parseGrepOutput — extract file:line references from grep output.
 */
function parseGrepOutput(raw) {
  const lines = raw.split("\n").filter(Boolean);
  const callsites = [];
  for (const line of lines) {
    const m = line.match(/^([^:]+):(\d+):/);
    if (m) {
      callsites.push(`${m[1]}:${m[2]}`);
    }
  }
  return [...new Set(callsites)].slice(0, 20);
}

/**
 * truncateCallsites — join callsites to a string, cap at TRUNCATION_CAP chars.
 */
function truncateCallsites(callsites) {
  const joined = callsites.join(", ");
  if (joined.length <= TRUNCATION_CAP) return joined;
  return joined.slice(0, TRUNCATION_CAP - 3) + "...";
}

/**
 * getCommitSHA — get HEAD commit SHA for cache key.
 */
function getCommitSHA() {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return `no-sha-${Date.now()}`;
  }
}

/**
 * handler — main hook handler, testable with DI.
 *
 * @param {object} input — {hook_event_name, prompt} from stdin
 * @param {object} options — {runner} for DI in tests
 * @returns {object|null} — hook output JSON or null
 */
export async function handler(input, { runner = null } = {}) {
  const prompt = String(input.prompt ?? input.user_prompt ?? "");

  // 1. Self-skip guard
  const skip = shouldSkip(prompt, process.env);
  if (skip) {
    return { continue: true, _skip: skip };
  }

  // 2. Fix intent detection
  if (!detectFixIntent(prompt)) {
    return { continue: true };
  }

  // Gate 4.5 escape check (hook still runs, Gate 4.5 itself checks this env var)
  // hook collects callsites regardless; Gate 4.5 skips the check if KZK_GATE45_SKIP=1

  // 3. Extract symbols from prompt
  const symbols = extractSymbols(prompt);
  const primarySymbol = symbols[0] ?? null;

  let callsites = [];
  let crgAvailable = false;

  // 4. CRG path (Task 0 confirmed signature: detect-changes --base HEAD~1)
  try {
    const crgCheck = execSync("command -v code-review-graph", {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 3000,
    });
    crgAvailable = crgCheck.trim().length > 0;
  } catch {
    crgAvailable = false;
  }

  if (crgAvailable) {
    try {
      const crgRunner = runner ?? ((cmd, opts) => execSync(cmd, opts));
      const crgOut = runCRG("code-review-graph detect-changes --base HEAD~1", crgRunner);
      callsites = parseCRGOutput(crgOut);
    } catch (e) {
      process.stderr.write(`[fix-scope-trigger] CRG failed: ${e.message} — grep fallback\n`);
      crgAvailable = false;
    }
  }

  if (!crgAvailable) {
    process.stderr.write(`[fix-scope-trigger] WARN: code-review-graph not installed or failed. grep fallback.\n`);
    const warnReason = "_warn:\"crg-not-installed-grep-fallback\"";

    if (primarySymbol) {
      try {
        const grepRunner = runner ?? ((cmd, opts) => execSync(cmd, opts));
        const grepOut = runGrep(primarySymbol, grepRunner);
        callsites = parseGrepOutput(grepOut);
      } catch (e) {
        // grep exit non-zero = no matches, not an error
        if (!e.message.includes("exit code 1") && e.status !== 1) {
          process.stderr.write(`[fix-scope-trigger] grep failed: ${e.message}\n`);
        }
        callsites = [];
      }
    }
  }

  if (callsites.length === 0) {
    return { continue: true };
  }

  // 5. Truncation
  const callsiteDisplay = truncateCallsites(callsites);

  // 6. Write to cache
  const repoRoot = process.cwd();
  const cachePath = path.join(repoRoot, ".kzk-harness", "fix-scope-cache.jsonl");
  const commitSHA = getCommitSHA();

  try {
    await writeSingleEntryWithLock(cachePath, commitSHA, callsites);
  } catch (e) {
    process.stderr.write(`[fix-scope-trigger] cache write failed: ${e.message}\n`);
  }

  // 7. Build system-reminder
  const symbolNote = primarySymbol ? ` (심볼: ${primarySymbol})` : "";
  const reminder = [
    `[FIX SCOPE] fix intent 감지${symbolNote}. 관련 callsite ${callsites.length}곳:`,
    callsiteDisplay,
    `⚠ 모든 callsite 수정 의무 또는 Gate 4.5 에서 BLOCK. KZK_GATE45_SKIP=1 로 우회 가능 (사유 commit body 기재).`,
    `self-check: grep -rn <functionName> --include='*.{ts,tsx,js,mjs,sh,py}' --exclude-dir={node_modules,.git,docs}`,
  ].join("\n");

  return {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: reminder,
    },
  };
}

// Main entrypoint when run as a hook process
if (process.argv[1] === new URL(import.meta.url).pathname) {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { raw += chunk; });
  process.stdin.on("end", async () => {
    let payload;
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }

    const result = await handler(payload);
    if (result) {
      process.stdout.write(JSON.stringify(result) + "\n");
    } else {
      process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    }
  });
}

codex
기존 구현을 보니 현재 hook들은 모두 `UserPromptSubmit` 단일 파일 독립 실행 전제입니다. 이제 설치/제거 스크립트의 jq 패턴과 배열 구조를 확인해서, Plan F의 canonical 재구성이 그 구조를 안전하게 덮는지 보겠습니다.
exec
/bin/zsh -lc "sed -n '632,725p' install/install-global.sh" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
enable_hooks() {
  local src="$SOURCE_REPO_DIR"
  mkdir -p "$HOME/.claude/skills/.kzk-harness-shared/hooks"
  mkdir -p "$HOME/.claude/skills/.kzk-harness-shared/lib"
  mkdir -p "$HOME/.claude/skills/.kzk-harness-shared/bin"

  cp "$src/install/hooks/keyword-detector.mjs" \
    "$HOME/.claude/skills/.kzk-harness-shared/hooks/"

  # Plan D: regression-recall hook + sidecar-write lib + dismiss bin
  if [ "${DO_REGRESSION_RECALL:-0}" -eq 1 ]; then
    cp "$src/install/hooks/regression-recall.mjs" \
      "$HOME/.claude/skills/.kzk-harness-shared/hooks/"
    cp "$src/install/lib/sidecar-write.mjs" \
      "$HOME/.claude/skills/.kzk-harness-shared/lib/"
    cp "$src/install/bin/kzk-regression-memory.mjs" \
      "$HOME/.claude/skills/.kzk-harness-shared/bin/"
  fi

  local settings="$HOME/.claude/settings.json"
  if [ ! -f "$settings" ]; then
    printf '{}' >"$settings"
  fi

  if ! command -v jq >/dev/null 2>&1; then
    emit "  hooks: jq not found — cannot update settings.json. Install jq and re-run with --enable-hooks." >&2
    record "hooks: SKIPPED (jq not found)"
    # rev2 codex #3 — fail-closed: jq 부재 시 enable 실패 → exit non-zero (called from kzk-pre-merge-sync step 3)
    return 1
  fi

  # Idempotent append: keyword-detector
  local kd_cmd="node $HOME/.claude/skills/.kzk-harness-shared/hooks/keyword-detector.mjs"
  local kd_already
  kd_already=$(jq --arg cmd "$kd_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
  if [ "${kd_already:-0}" -gt 0 ]; then
    emit "  hooks: keyword-detector.mjs already registered — skip"
    record "hooks: keyword-detector skip (already registered)"
  else
    local tmp
    tmp=$(mktemp)
    jq --arg cmd "$kd_cmd" '
      .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
    ' "$settings" >"$tmp" && mv "$tmp" "$settings" || return 1
    emit "  hooks: keyword-detector.mjs registered in ~/.claude/settings.json"
    record "hooks: UserPromptSubmit hook registered (--enable-hooks)"
  fi

  # Plan D: regression-recall idempotent append
  if [ "${DO_REGRESSION_RECALL:-0}" -eq 1 ]; then
    cp "$src/install/hooks/regression-recall.mjs" \
      "$HOME/.claude/skills/.kzk-harness-shared/hooks/" 2>/dev/null || true
    local rr_cmd="node $HOME/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs"
    local rr_already
    rr_already=$(jq --arg cmd "$rr_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
    if [ "${rr_already:-0}" -gt 0 ]; then
      emit "  hooks: regression-recall.mjs already registered — skip"
      record "hooks: regression-recall skip (already registered)"
    else
      tmp=$(mktemp)
      jq --arg cmd "$rr_cmd" '
        .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
      ' "$settings" >"$tmp" && mv "$tmp" "$settings" || return 1
      emit "  hooks: regression-recall.mjs registered (--regression-recall)"
      record "hooks: regression-recall hook registered (--regression-recall, depends on --enable-hooks)"
    fi
  fi

  # Plan B: fix-scope-trigger idempotent append
  if [ "${DO_FIX_SCOPE_TRIGGER:-0}" -eq 1 ]; then
    cp "$src/install/hooks/fix-scope-trigger.mjs" \
      "$HOME/.claude/skills/.kzk-harness-shared/hooks/" 2>/dev/null || true
    local fst_cmd="node $HOME/.claude/skills/.kzk-harness-shared/hooks/fix-scope-trigger.mjs"
    local fst_already
    fst_already=$(jq --arg cmd "$fst_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
    if [ "${fst_already:-0}" -gt 0 ]; then
      emit "  hooks: fix-scope-trigger.mjs already registered — skip"
      record "hooks: fix-scope-trigger skip (already registered)"
    else
      tmp=$(mktemp)
      jq --arg cmd "$fst_cmd" '
        .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
      ' "$settings" >"$tmp" && mv "$tmp" "$settings" || return 1
      emit "  hooks: fix-scope-trigger.mjs registered (--fix-scope-trigger)"
      record "hooks: fix-scope-trigger hook registered (--fix-scope-trigger, depends on --enable-hooks)"
    fi
  fi
  return 0
}

# ---------------------------------------------------------------------------
# Step 9 — Summary
# ---------------------------------------------------------------------------
print_summary() {

exec
/bin/zsh -lc "sed -n '235,275p' install/uninstall-global.sh" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
  done

  # Remove umbrella dotfile
  if [ -d "$skills_dst/.kzk-harness-shared" ]; then
    rm -rf "$skills_dst/.kzk-harness-shared"
    emit "  Removed umbrella: .kzk-harness-shared"
    removed=$((removed + 1))
  elif [ -L "$skills_dst/.kzk-harness-shared" ]; then
    rm "$skills_dst/.kzk-harness-shared"
    emit "  Removed symlink: .kzk-harness-shared"
    removed=$((removed + 1))
  fi

  # Remove hook entry from ~/.claude/settings.json if present
  local settings="$HOME/.claude/settings.json"
  if [ -f "$settings" ] && command -v jq >/dev/null 2>&1; then
    local hook_marker=".kzk-harness-shared/hooks/keyword-detector.mjs"
    if grep -qF "$hook_marker" "$settings" 2>/dev/null; then
      local tmp
      tmp=$(mktemp)
      if jq 'del(.hooks.UserPromptSubmit[]? | select(.hooks[]?.command? | strings | test("kzk-harness-shared")))' \
        "$settings" >"$tmp" 2>/dev/null; then
        mv "$tmp" "$settings"
      else
        rm -f "$tmp"
      fi
      emit "  Removed kzk-harness hook entry from ~/.claude/settings.json"
      record "hooks: UserPromptSubmit entry removed"
    fi
  fi

  emit "  Removed $removed kzk-harness path(s)"
  record "skill dirs: $removed path(s) removed"
  return 0
}

# ---------------------------------------------------------------------------
# Step U3 — List orphaned per-project artifacts
# ---------------------------------------------------------------------------
list_orphaned_artifacts() {
  emit ""

exec
/bin/zsh -lc "rg -n 'kzk-harness-canonical-v1|\\.hooks\\.[A-Za-z]+' docs/plans/plan-F-edit-read-guard.md install/install-global.sh install/uninstall-global.sh -S" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
install/uninstall-global.sh:255:      if jq 'del(.hooks.UserPromptSubmit[]? | select(.hooks[]?.command? | strings | test("kzk-harness-shared")))' \
install/install-global.sh:666:  kd_already=$(jq --arg cmd "$kd_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
install/install-global.sh:674:      .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
install/install-global.sh:686:    rr_already=$(jq --arg cmd "$rr_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
install/install-global.sh:693:        .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
install/install-global.sh:706:    fst_already=$(jq --arg cmd "$fst_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
install/install-global.sh:713:        .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
docs/plans/plan-F-edit-read-guard.md:21:5. `install-global.sh enable_hooks()` 갱신 — settings.json 의 PreToolUse + PostToolUse + UserPromptSubmit hook 배열을 **canonical 재구성** (단순 append 폐기). `kzk-harness-canonical-v1` marker 로 기존 kzk hook 식별 후 일괄 교체.
docs/plans/plan-F-edit-read-guard.md:163:    .hooks.PreToolUse = (((.hooks.PreToolUse // []) | map(
docs/plans/plan-F-edit-read-guard.md:167:    | .hooks.PostToolUse = (((.hooks.PostToolUse // []) | map(
docs/plans/plan-F-edit-read-guard.md:171:    | .hooks.UserPromptSubmit = (((.hooks.UserPromptSubmit // []) | map(
docs/plans/plan-F-edit-read-guard.md:202:  .hooks.PreToolUse = ((.hooks.PreToolUse // []) | map(
docs/plans/plan-F-edit-read-guard.md:205:  | .hooks.PostToolUse = ((.hooks.PostToolUse // []) | map(
docs/plans/plan-F-edit-read-guard.md:208:  | .hooks.UserPromptSubmit = ((.hooks.UserPromptSubmit // []) | map(

codex
1. **spec rev2 12 AC cover?**  
거의 매핑되지만 완전하지 않다. AC1/3/4/6/8/9/10/11/12는 Task 1-9로 대응된다. 문제는 AC2와 AC5다: Task 1은 spec의 `flock`을 사실상 포기하고 `O_APPEND 단일 write`로 후퇴했고, AC5는 AC에선 `canonical 재구성`인데 본문은 `marker`라 해놓고 예시는 `contains(".kzk-harness-shared/hooks/")`로 구현이 갈린다.  
권고: AC2를 `flock 삭제`로 spec 수정하거나 실제 lock 구현 경로를 확정해라. AC5는 “정확히 어떤 hook을 제거할지” 한 방식으로만 고정해라.

2. **dispatcher 통합**  
`settings.json`에는 dispatcher만 등록하는 쪽이 맞다. 기존 3개 stand-alone hook을 계속 등록하면 순서 보장도 깨지고 canonical 재구성 의미도 없다. 다만 파일 자체는 유지해야 한다. 테스트, 로컬 실행, dispatcher 내부 import용 모듈로 남겨야 한다.  
권고: “등록은 dispatcher only, 파일은 유지”로 못박아라. 비-kzk hook은 preserve, kzk-managed hook만 교체.

3. **PreToolUse + PostToolUse 단일 파일 + `--mode` 분기**  
패턴 자체는 괜찮다. 문제는 거기에 `__rotate` 같은 테스트 전용 숨은 API까지 밀어넣는 순간 파일 책임이 흐려진다.  
권고: 단일 파일 유지 가능. 대신 mode는 `pre`/`post-read` 두 개만. 테스트는 hook에 숨은 명령 추가하지 말고 `turn-state.mjs`를 직접 호출해라.

4. **canonical 재구성 jq**  
현재 제안은 너무 거칠다. `.command contains ".kzk-harness-shared/hooks/"`는 umbrella 아래의 사용자 커스텀 hook까지 같이 날릴 수 있다. 게다가 AC에는 marker라 써놓고 실제 jq는 marker를 안 쓴다.  
권고: 디렉토리 substring 말고 “관리 대상 파일명 whitelist”로 제거해라. 예: `dispatcher.mjs`, `edit-read-guard.mjs --mode=post-read`, `keyword-detector.mjs`, `regression-recall.mjs`, `fix-scope-trigger.mjs`.

5. **`KZK_STATE_DIR` env override**  
테스트 격리에는 유용하다. 운영에서 전역 env가 새면 state가 엉뚱한 곳으로 가서 디버깅 지옥 된다.  
권고: 이름을 `KZK_TEST_STATE_DIR`로 바꾸거나, `NODE_ENV=test`일 때만 허용해라. 운영 경로 override는 막는 편이 안전하다.

6. **Bypass token 동작**  
여기 제일 엉켰다. spec rev2는 dispatcher가 token 검사+삭제라고 써 있고, architecture/Plan F는 PreToolUse가 검사+삭제라고 쓴다. 둘 다 하면 token은 prompt 시점에 사라져서 실제 Edit에서 못 쓴다.  
권고: 소비 주체를 하나로 정해라. 더 단순한 해법은 PreToolUse만 token consume. dispatcher는 건드리지 마라.

7. **놓친 함정**  
dispatcher가 활성 sub-hook을 “파일 존재 여부”로 판단하는 설계는 틀렸다. 예전에 복사된 `regression-recall.mjs`가 남아 있으면 다음 설치에서 flag를 꺼도 계속 실행될 수 있다. 또 Task 1의 `flock` 미구현은 spec freeze와 정면충돌이다.  
권고: enabled set은 파일 존재가 아니라 install 시 생성한 manifest/config로 판단해라. 그리고 lock 문제 정리 전엔 freeze하지 마라.

Bottom-line: REVISE
tokens used
90,016
1. **spec rev2 12 AC cover?**  
거의 매핑되지만 완전하지 않다. AC1/3/4/6/8/9/10/11/12는 Task 1-9로 대응된다. 문제는 AC2와 AC5다: Task 1은 spec의 `flock`을 사실상 포기하고 `O_APPEND 단일 write`로 후퇴했고, AC5는 AC에선 `canonical 재구성`인데 본문은 `marker`라 해놓고 예시는 `contains(".kzk-harness-shared/hooks/")`로 구현이 갈린다.  
권고: AC2를 `flock 삭제`로 spec 수정하거나 실제 lock 구현 경로를 확정해라. AC5는 “정확히 어떤 hook을 제거할지” 한 방식으로만 고정해라.

2. **dispatcher 통합**  
`settings.json`에는 dispatcher만 등록하는 쪽이 맞다. 기존 3개 stand-alone hook을 계속 등록하면 순서 보장도 깨지고 canonical 재구성 의미도 없다. 다만 파일 자체는 유지해야 한다. 테스트, 로컬 실행, dispatcher 내부 import용 모듈로 남겨야 한다.  
권고: “등록은 dispatcher only, 파일은 유지”로 못박아라. 비-kzk hook은 preserve, kzk-managed hook만 교체.

3. **PreToolUse + PostToolUse 단일 파일 + `--mode` 분기**  
패턴 자체는 괜찮다. 문제는 거기에 `__rotate` 같은 테스트 전용 숨은 API까지 밀어넣는 순간 파일 책임이 흐려진다.  
권고: 단일 파일 유지 가능. 대신 mode는 `pre`/`post-read` 두 개만. 테스트는 hook에 숨은 명령 추가하지 말고 `turn-state.mjs`를 직접 호출해라.

4. **canonical 재구성 jq**  
현재 제안은 너무 거칠다. `.command contains ".kzk-harness-shared/hooks/"`는 umbrella 아래의 사용자 커스텀 hook까지 같이 날릴 수 있다. 게다가 AC에는 marker라 써놓고 실제 jq는 marker를 안 쓴다.  
권고: 디렉토리 substring 말고 “관리 대상 파일명 whitelist”로 제거해라. 예: `dispatcher.mjs`, `edit-read-guard.mjs --mode=post-read`, `keyword-detector.mjs`, `regression-recall.mjs`, `fix-scope-trigger.mjs`.

5. **`KZK_STATE_DIR` env override**  
테스트 격리에는 유용하다. 운영에서 전역 env가 새면 state가 엉뚱한 곳으로 가서 디버깅 지옥 된다.  
권고: 이름을 `KZK_TEST_STATE_DIR`로 바꾸거나, `NODE_ENV=test`일 때만 허용해라. 운영 경로 override는 막는 편이 안전하다.

6. **Bypass token 동작**  
여기 제일 엉켰다. spec rev2는 dispatcher가 token 검사+삭제라고 써 있고, architecture/Plan F는 PreToolUse가 검사+삭제라고 쓴다. 둘 다 하면 token은 prompt 시점에 사라져서 실제 Edit에서 못 쓴다.  
권고: 소비 주체를 하나로 정해라. 더 단순한 해법은 PreToolUse만 token consume. dispatcher는 건드리지 마라.

7. **놓친 함정**  
dispatcher가 활성 sub-hook을 “파일 존재 여부”로 판단하는 설계는 틀렸다. 예전에 복사된 `regression-recall.mjs`가 남아 있으면 다음 설치에서 flag를 꺼도 계속 실행될 수 있다. 또 Task 1의 `flock` 미구현은 spec freeze와 정면충돌이다.  
권고: enabled set은 파일 존재가 아니라 install 시 생성한 manifest/config로 판단해라. 그리고 lock 문제 정리 전엔 freeze하지 마라.

Bottom-line: REVISE
