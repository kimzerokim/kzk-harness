# Plan F — PreToolUse Edit/Write Read-Guard + install lib copy fix (rev2)

> Spec: `docs/plans/edit-read-guard-spec.md` (rev3, frozen).
> Branch: `feature/edit-read-guard`. No PR. Direct merge to main.
> Status: **Frozen (rev2)** — codex Plan F cycle 1 verdict 7 답 통합. spec rev3 wording 정정 sync.
> Cycle 1 verdict: `docs/plans/plan-F-edit-read-guard-critic-review.md` (REVISE → rev2 SHIP 도달).

## Goal

PreToolUse `Edit`/`Write` hook 으로 "implementation 본문을 Read 하기 전 Edit 시도" 를 시스템적으로 차단한다. 부수적으로 `install-global.sh enable_hooks()` 의 `install/lib/*.mjs` copy 누락 (regression-recall 의 hook-shared.mjs / cache-write.mjs ESM resolve fail) 을 같이 수리하고, hook 등록 순서를 dispatcher 1개로 통합한다.

- **본질**: PreToolUse Edit/Write matcher → file_path realpath 정규화 → 현재 turn 의 read-log 매칭 → 0건이면 deny.
- **부수**: install lib copy idempotent + UserPromptSubmit canonical dispatcher 통합 + uninstall 확장.

## Cycle 1 verdict 인용 (REVISE 답 7 항목)

| # | Cycle 1 결함 | rev2 답 |
|---|---|---|
| 1 | AC2 + AC5 — spec lock 정합성 (flock 잔존 / canonical 표현 갈림) | spec rev3 = `O_APPEND atomic` 단일. AC5 = managed 파일명 whitelist (5개) 단일 표현 |
| 2 | dispatcher 통합 등록 — settings.json + 파일 보존 | settings.json 에 dispatcher 만 등록. stand-alone hook 파일은 유지 (test/local/import 용). 비-kzk hook 보존 |
| 3 | PreToolUse + PostToolUse 단일 파일 + `--mode` | mode = `pre` / `post-read` 두 개. `__rotate` test 전용 hidden API 제거 — test 는 turn-state.mjs 직접 호출 |
| 4 | canonical 재구성 jq — directory substring 위험 | managed 파일명 whitelist (`dispatcher.mjs`, `edit-read-guard.mjs`, `keyword-detector.mjs`, `regression-recall.mjs`, `fix-scope-trigger.mjs`) — 사용자 커스텀 hook 보존 |
| 5 | `KZK_STATE_DIR` 운영 누수 위험 | `KZK_TEST_STATE_DIR` rename (production 무시). default = `~/.cache/kzk-harness/` |
| 6 | Bypass token 소비 주체 갈림 — CRITICAL | PreToolUse 단독 검사+삭제. dispatcher 손 안 댐. spec rev3 sync |
| 7 | dispatcher enabled set — 파일 존재 = stale 위험 | manifest 기반 (`~/.claude/skills/.kzk-harness-shared/hooks/enabled.json`). install 시 생성, flag 변경 시 갱신 |

## Acceptance Criteria

1. `install/hooks/edit-read-guard.mjs` 신규 — PreToolUse + PostToolUse 단일 파일 (`--mode=pre` / `--mode=post-read` 분기). realpath 정규화 + tool_name 별 분기 + bypass-token 단발성 처리.
2. `install/lib/turn-state.mjs` 신규 — `~/.cache/kzk-harness/current-turn.json` atomic write (tmp+rename) + `~/.cache/kzk-harness/read-log.jsonl` `O_APPEND` atomic write (< PIPE_BUF JSONL line, POSIX O_APPEND atomic guarantee, **flock 폐기 — spec rev3**). `KZK_TEST_STATE_DIR` env 가 production 에선 무시되고 `NODE_ENV=test` 일 때만 인식.
3. `install/hooks/dispatcher.mjs` 신규 — UserPromptSubmit canonical order: (1) read-log clear + turn-id rotate, (2) keyword-detector, (3) regression-recall, (4) fix-scope-trigger. 활성 set = `~/.claude/skills/.kzk-harness-shared/hooks/enabled.json` manifest 기반 (파일 존재 X — stale file 차단).
4. `install-global.sh enable_hooks()` 갱신 — `install/lib/*.mjs` 전부 `~/.claude/skills/.kzk-harness-shared/lib/` 로 copy. **idempotent**: 동일 byte 면 skip, 차이면 overwrite. `lib/` mkdir 보장.
5. `install-global.sh enable_hooks()` 갱신 — settings.json 의 PreToolUse + PostToolUse + UserPromptSubmit hook 배열을 **canonical 재구성**. **managed 파일명 whitelist (5개)** 만 strip + dispatcher only 등록. 비-kzk 사용자 hook 보존.
6. `install-global.sh enable_hooks()` 가 `enabled.json` manifest 생성/갱신 — `--regression-recall` / `--fix-scope-trigger` flag 변경 시 manifest sync.
7. `uninstall-global.sh` 갱신 — PreToolUse + PostToolUse + UserPromptSubmit 셋 다 cleanup. managed 파일명 whitelist 동일 표현 사용.
8. Path canonicalization — `fs.realpathSync` 정규화. Read PostToolUse / Edit·Write PreToolUse 동일 form 으로 일치.
9. tool_name 별 분기 — `Write` 만 `lstat` ENOENT 시 allow (신규 파일 의도), `Edit` 는 read-required (존재 안 하면 deny + ENOENT 메시지).
10. Single-use bypass — `~/.cache/kzk-harness/bypass-token` 파일 존재 시 `unlink` + 1회 allow. **PreToolUse 단독 소비 (dispatcher 손 안 댐)** — spec rev3 sync. env 변수 (`OMC_SKIP_HOOKS=edit-read-guard`) 는 별개 kill switch.
11. `install/test/edit-read-guard.test.mjs` 신규 — 6 case (read 후 edit allow / read 없이 edit deny / Write ENOENT allow / bypass token 1회 + 두번째 deny / cross-turn deny / symlink realpath 정규화 일치). turn rotate 는 `turn-state.mjs` 직접 import (hidden hook API 폐기).
12. `skills/kzk-tool-retry/SKILL.md` v1.2 → v1.3 — `## PreToolUse guard` subsection 신규. "guard 는 `Read` tool 호출만 인정. shell `grep`/`cat` tracker 안 잡힘" 명시.
13. `harness-share.md` §27 끝에 PreToolUse guard cross-ref.
14. `install/test/run-tests.sh` 갱신 — `edit-read-guard.test.mjs` 호출 등록.
15. `bash install/test/run-tests.sh` PASS.
16. **Skill count 변경 없음** — 16 skill 그대로. `git diff CLAUDE.md README.md` 결과에 skill count line 미포함 확인 (Plan F 신규 skill 0개).
17. atomic commit: `feat(hooks): edit-read-guard PreToolUse + install lib copy fix (Plan F rev2)`.

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
- `MANIFEST = ~/.claude/skills/.kzk-harness-shared/hooks/enabled.json`
- `MANAGED_HOOKS = ["dispatcher.mjs", "edit-read-guard.mjs", "keyword-detector.mjs", "regression-recall.mjs", "fix-scope-trigger.mjs"]` — managed 파일명 whitelist

## Tasks

### Task 1 — `install/lib/turn-state.mjs` 신규

**File**: `$LIB_TURN`

State file 관리 단일 SoT. `current-turn.json` 은 atomic write (tmp 작성 → `fs.renameSync`). `read-log.jsonl` 은 `O_APPEND` atomic write — 단일 JSON.stringify line 이 PIPE_BUF (POSIX 보장 4096 bytes 이상) 미만이면 atomic. flock 불필요 (codex Plan F #1 — spec rev3 lock).

**API export**:
- `getStateDir()` → `~/.cache/kzk-harness/` (mkdir recursive 보장). `process.env.NODE_ENV === "test"` 일 때만 `process.env.KZK_TEST_STATE_DIR` 우선. production 에선 무조건 default.
- `rotateTurn()` → 새 uuid-v4 turn-id 생성, `current-turn.json` atomic write, `read-log.jsonl` truncate (`fs.writeFileSync(path, "")`).
- `currentTurnId()` → `current-turn.json` 읽고 `turn_id` 반환. 없으면 `null`.
- `appendRead(realpath)` → `{"turn":"<id>","file":"<realpath>","ts":"<ISO>"}\n` 한 줄 `fs.openSync(path, "a")` + 단일 `fs.writeSync` (atomic, POSIX O_APPEND 보장).
- `hasReadInTurn(realpath, turnId)` → `read-log.jsonl` 라인 stream + JSON.parse + `turn === turnId && file === realpath` 매칭.

**구현 룰**:
- 모든 path 는 `fs.realpathSync` 정규화 후 비교 (caller 책임 + 본 lib 내부 한 번 더 호출 OK — idempotent).
- `read-log.jsonl` 파싱 실패 라인 (corrupt) 은 silent skip + stderr WARN.
- POSIX-only — Linux/macOS 전제. Windows 미지원.
- **codex #5 운영 누수 차단**: `KZK_TEST_STATE_DIR` 는 `NODE_ENV=test` 일 때만 인식. 그 외엔 무시. production install 에선 자동으로 default fallback.

### Task 2 — `install/hooks/edit-read-guard.mjs` 신규

**File**: `$HOOK_GUARD`

PreToolUse + PostToolUse 단일 파일. CLI argv `--mode=pre` (default) / `--mode=post-read` 두 분기. stdin JSON payload: `{tool_name, tool_input: {file_path, ...}}` (Claude Code hook spec). **codex #3 — `__rotate` test 전용 hidden API 제거**. test 는 turn-state.mjs 직접 import.

**`--mode=pre` 알고리즘**:
1. `tool_name` 이 `Edit` / `Write` 가 아니면 `{continue: true}` 즉시 반환.
2. `OMC_SKIP_HOOKS` 환경변수에 `edit-read-guard` 포함되면 `{continue: true}` (kill switch).
3. `BYPASS_FILE` 존재 시 `fs.unlinkSync` (single-use, **PreToolUse 단독 소비 — codex #6 / spec rev3**) + `{continue: true}` 반환 (stderr 에 bypass used 로그).
4. `tool_input.file_path` 추출 → `fs.realpathSync` 시도.
   - 정규화 실패 (ENOENT) 시:
     - `tool_name === "Write"` → allow (신규 파일 작성 의도).
     - `tool_name === "Edit"` → deny + 메시지 "File does not exist; cannot Edit. Use Write to create.".
5. `currentTurnId()` 호출. `null` (turn rotate 안 됨) 시 → fallback: 첫 prompt 전이라 무조건 deny. 메시지 "Turn state missing — restart session or run dispatcher."
6. `hasReadInTurn(realpath, turnId)` →
   - true → `{continue: true}`.
   - false → `{decision: "block", reason: <DENY_MSG>}` 반환 (Claude Code hook deny convention).

**`--mode=post-read` 알고리즘**:
1. `tool_name === "Read"` 매칭 → `tool_input.file_path` realpath 정규화 → `appendRead(realpath)` 호출 → `{continue: true}`.
2. realpath 정규화 실패 (ENOENT — Read 시점에 파일이 사라진 edge case) → silent skip + `{continue: true}`.

**Deny 메시지 형식** (spec rev3 §Deny 메시지 그대로):
```
[edit-read-guard] Read this file first within the current turn.
File: <realpath>
Bypass: touch ~/.cache/kzk-harness/bypass-token (one-shot)
Disable: OMC_SKIP_HOOKS=edit-read-guard
```

### Task 3 — `install/hooks/dispatcher.mjs` 신규

**File**: `$HOOK_DISP`

UserPromptSubmit canonical dispatcher. stdin payload pass-through.

**활성 set 결정 (codex #7 — manifest 기반)**:
- `$MANIFEST` (`~/.claude/skills/.kzk-harness-shared/hooks/enabled.json`) 읽음. 형식:
  ```json
  {"keyword_detector": true, "regression_recall": false, "fix_scope_trigger": true}
  ```
- 파일 존재 X — install-global.sh 가 `--enable-hooks` 시 무조건 생성.
- **stale file 차단**: hook 파일이 `.kzk-harness-shared/hooks/` 에 남아있어도 manifest 에서 false 면 skip.

**순서** (spec rev3 §Hook 등록):
1. `rotateTurn()` (turn-state.mjs 직접 import) — 새 turn-id 생성 + read-log truncate.
2. manifest 의 `keyword_detector === true` → `keyword-detector.mjs` 호출 (child_process.spawnSync, stdin pass + stdout collect).
3. manifest 의 `regression_recall === true` → `regression-recall.mjs` 호출.
4. manifest 의 `fix_scope_trigger === true` → `fix-scope-trigger.mjs` 호출.

**stdout 합치기 룰**:
- 각 sub-hook 의 stdout JSON line 들을 collect.
- `hookSpecificOutput.additionalContext` 가 있으면 concat (`\n\n` 구분).
- `continue: false` 가 한 번이라도 나오면 즉시 `{continue: false, reason: <첫 reason>}` 반환.
- 모두 OK 면 통합 `{hookSpecificOutput: {hookEventName: "UserPromptSubmit", additionalContext: <합본>}}`.

**bypass token 처리 — codex #6 / spec rev3 lock**: dispatcher 는 **bypass-token 손 안 댐**. PreToolUse 단독 소비.

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

#### 4-2. PreToolUse + PostToolUse hook 등록 (canonical 재구성, managed whitelist)

기존 UserPromptSubmit 단순 append 패턴 폐기. 새 `update_hooks_canonical()` helper 추가. **codex #4 — managed 파일명 whitelist** 만 strip:

```bash
update_hooks_canonical() {
  local settings="$1"
  local pre_cmd="node $HOME/.claude/skills/.kzk-harness-shared/hooks/edit-read-guard.mjs --mode=pre"
  local post_cmd="node $HOME/.claude/skills/.kzk-harness-shared/hooks/edit-read-guard.mjs --mode=post-read"
  local disp_cmd="node $HOME/.claude/skills/.kzk-harness-shared/hooks/dispatcher.mjs"

  local tmp; tmp=$(mktemp)

  # canonical reconstruct — managed 파일명 whitelist 만 strip
  # MANAGED = dispatcher.mjs | edit-read-guard.mjs | keyword-detector.mjs | regression-recall.mjs | fix-scope-trigger.mjs
  jq --arg pre "$pre_cmd" --arg post "$post_cmd" --arg disp "$disp_cmd" '
    def is_managed: (.command // "") |
      (test("/dispatcher\\.mjs(\\s|$)") or
       test("/edit-read-guard\\.mjs(\\s|$)") or
       test("/keyword-detector\\.mjs(\\s|$)") or
       test("/regression-recall\\.mjs(\\s|$)") or
       test("/fix-scope-trigger\\.mjs(\\s|$)"));

    .hooks.PreToolUse = (((.hooks.PreToolUse // []) | map(
        .hooks |= map(select(is_managed | not))
      ) | map(select((.hooks // []) | length > 0))) +
      [{matcher:"Edit|Write", hooks:[{type:"command", command:$pre}]}])
    | .hooks.PostToolUse = (((.hooks.PostToolUse // []) | map(
        .hooks |= map(select(is_managed | not))
      ) | map(select((.hooks // []) | length > 0))) +
      [{matcher:"Read", hooks:[{type:"command", command:$post}]}])
    | .hooks.UserPromptSubmit = (((.hooks.UserPromptSubmit // []) | map(
        .hooks |= map(select(is_managed | not))
      ) | map(select((.hooks // []) | length > 0))) +
      [{matcher:"*", hooks:[{type:"command", command:$disp}]}])
  ' "$settings" >"$tmp" && mv "$tmp" "$settings" || return 1
}
```

기존 keyword-detector / regression-recall / fix-scope-trigger 의 개별 append 블럭은 폐기 (dispatcher 가 manifest 보고 위임). install-global.sh 의 `--regression-recall` / `--fix-scope-trigger` 플래그는 (a) `*.mjs` 파일 copy, (b) manifest 갱신 두 가지만 담당. settings.json 등록은 `update_hooks_canonical()` 일괄 처리 (dispatcher only).

#### 4-3. Manifest 생성/갱신 (codex #7)

```bash
update_hook_manifest() {
  local manifest="$HOOK_DEST/enabled.json"
  local kw="${1:-true}"   # keyword_detector default ON
  local rr="${2:-false}"  # regression_recall default OFF
  local fs="${3:-false}"  # fix_scope_trigger default OFF
  local tmp; tmp=$(mktemp)
  jq -n \
    --argjson kw "$kw" --argjson rr "$rr" --argjson fs "$fs" \
    '{keyword_detector: $kw, regression_recall: $rr, fix_scope_trigger: $fs}' \
    >"$tmp" && mv "$tmp" "$manifest"
}
```

`--enable-hooks` 호출 시 manifest 무조건 생성 (없으면 default). `--regression-recall` flag → `rr=true` 갱신. `--no-regression-recall` → `rr=false` 갱신.

#### 4-4. Edit-read-guard 무조건 활성

`--enable-hooks` 가 ON 이면 edit-read-guard 자동 활성 (별 flag 없음, spec rev3 lock).

```bash
cp "$src/install/hooks/edit-read-guard.mjs" "$HOOK_DEST/" || return 1
cp "$src/install/hooks/dispatcher.mjs" "$HOOK_DEST/" || return 1
```

호출: `enable_hooks()` 함수 끝에서 `update_hook_manifest "$kw" "$rr" "$fs"` + `update_hooks_canonical "$settings" || return 1`.

### Task 5 — `install/uninstall-global.sh` 갱신

**File**: `$UNINSTALL_SH`

기존 UserPromptSubmit 만 cleanup → PreToolUse + PostToolUse + UserPromptSubmit 모두 cleanup 으로 확장. **managed 파일명 whitelist 동일 표현** 사용 (codex #4):

```bash
jq '
  def is_managed: (.command // "") |
    (test("/dispatcher\\.mjs(\\s|$)") or
     test("/edit-read-guard\\.mjs(\\s|$)") or
     test("/keyword-detector\\.mjs(\\s|$)") or
     test("/regression-recall\\.mjs(\\s|$)") or
     test("/fix-scope-trigger\\.mjs(\\s|$)"));

  .hooks.PreToolUse = ((.hooks.PreToolUse // []) | map(
    .hooks |= map(select(is_managed | not))
  ) | map(select((.hooks // []) | length > 0)))
  | .hooks.PostToolUse = ((.hooks.PostToolUse // []) | map(
    .hooks |= map(select(is_managed | not))
  ) | map(select((.hooks // []) | length > 0)))
  | .hooks.UserPromptSubmit = ((.hooks.UserPromptSubmit // []) | map(
    .hooks |= map(select(is_managed | not))
  ) | map(select((.hooks // []) | length > 0)))
' "$settings" >"$tmp" && mv "$tmp" "$settings"
```

추가로 `enabled.json` manifest 도 삭제: `rm -f "$HOOK_DEST/enabled.json"`.

### Task 6 — `install/test/edit-read-guard.test.mjs` 신규

**File**: `$TEST_GUARD`

Node test runner (`node --test`) 6 case. 각 case 는 fixture state dir 격리 — `NODE_ENV=test` + `KZK_TEST_STATE_DIR` 로 turn-state.mjs 가 override 받음 (production 누수 차단 — codex #5).

**중요**: turn rotate 는 `turn-state.mjs` 직접 import (codex #3 — hidden hook API 폐기).

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const HOOK = path.resolve("install/hooks/edit-read-guard.mjs");
const TURN_LIB = path.resolve("install/lib/turn-state.mjs");

async function rotateTurnDirect(stateDir) {
  // direct import — no hidden hook API
  process.env.NODE_ENV = "test";
  process.env.KZK_TEST_STATE_DIR = stateDir;
  const mod = await import(`${TURN_LIB}?t=${Date.now()}`); // fresh import per call
  mod.rotateTurn();
}

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
  const args = mode ? ["--mode=" + mode] : ["--mode=pre"];
  return spawnSync("node", [HOOK, ...args], {
    input: JSON.stringify(payload),
    env: {
      ...process.env,
      NODE_ENV: "test",
      KZK_TEST_STATE_DIR: stateDir,
      OMC_SKIP_HOOKS: "",
    },
    encoding: "utf8",
  });
}

test("read → edit allow", async () => withFixture(async ({ stateDir, file }) => {
  await rotateTurnDirect(stateDir);
  callHook({ stateDir, mode: "post-read", payload: { tool_name: "Read", tool_input: { file_path: file } } });
  const r = callHook({ stateDir, payload: { tool_name: "Edit", tool_input: { file_path: file } } });
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue ?? !out.decision, true);
}));

test("edit without read deny", async () => withFixture(async ({ stateDir, file }) => {
  await rotateTurnDirect(stateDir);
  const r = callHook({ stateDir, payload: { tool_name: "Edit", tool_input: { file_path: file } } });
  const out = JSON.parse(r.stdout);
  assert.equal(out.decision, "block");
  assert.match(out.reason, /Read this file first/);
}));

test("Write ENOENT allow", async () => withFixture(async ({ stateDir, dir }) => {
  await rotateTurnDirect(stateDir);
  const r = callHook({ stateDir, payload: { tool_name: "Write", tool_input: { file_path: path.join(dir, "newfile.txt") } } });
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
}));

test("bypass token single-use", async () => withFixture(async ({ stateDir, file }) => {
  await rotateTurnDirect(stateDir);
  fs.writeFileSync(path.join(stateDir, "bypass-token"), "");
  const r1 = callHook({ stateDir, payload: { tool_name: "Edit", tool_input: { file_path: file } } });
  assert.equal(JSON.parse(r1.stdout).continue, true);
  // PreToolUse 단독 소비 — token unlinked
  const r2 = callHook({ stateDir, payload: { tool_name: "Edit", tool_input: { file_path: file } } });
  assert.equal(JSON.parse(r2.stdout).decision, "block");
}));

test("cross-turn deny", async () => withFixture(async ({ stateDir, file }) => {
  await rotateTurnDirect(stateDir);
  callHook({ stateDir, mode: "post-read", payload: { tool_name: "Read", tool_input: { file_path: file } } });
  await rotateTurnDirect(stateDir);  // new turn
  const r = callHook({ stateDir, payload: { tool_name: "Edit", tool_input: { file_path: file } } });
  assert.equal(JSON.parse(r.stdout).decision, "block");
}));

test("symlink realpath normalize", async () => withFixture(async ({ stateDir, file, dir }) => {
  const link = path.join(dir, "link.txt");
  fs.symlinkSync(file, link);
  await rotateTurnDirect(stateDir);
  // Read via real path
  callHook({ stateDir, mode: "post-read", payload: { tool_name: "Read", tool_input: { file_path: file } } });
  // Edit via symlink — realpath 정규화 후 같은 파일 → allow
  // 양쪽 모두 fs.realpathSync 호출 후 비교 (macOS /private/var prefix 일치 보장)
  const r = callHook({ stateDir, payload: { tool_name: "Edit", tool_input: { file_path: link } } });
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue ?? !out.decision, true);
}));
```

**구현 보조**: turn-state.mjs 의 `getStateDir()` 가 `NODE_ENV === "test"` AND `KZK_TEST_STATE_DIR` 둘 다 set 일 때만 override 인식. production 에선 두 조건 동시 만족 어려워 누수 차단.

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
- **bypass**: `touch ~/.cache/kzk-harness/bypass-token` — 단발성 (1회 Edit/Write 후 자동 unlink, **PreToolUse 단독 소비**). 사용자 explicit 의도 표명용.
- **kill switch**: `OMC_SKIP_HOOKS=edit-read-guard` env — 세션 단위 비활성.
- **turn 단위**: 매 사용자 prompt 마다 turn-id 회전 + read-log truncate. 이전 turn 의 Read 는 이번 turn 에 인정 안 됨.

cross-ref: `harness-share.md` §27.1.
```

### Task 8 — `harness-share.md` §27 cross-ref

**File**: `$SHARE`

기존 §27 (kzk-tool-retry tool-failure auto-retry discipline) 끝에 추가:

```markdown
### 27.1 PreToolUse Edit/Write Read-Guard (Plan F rev2)

OS-level hook 으로 "Read 없이 Edit" 차단. 본문: `kzk-tool-retry` §PreToolUse guard.

- `~/.claude/skills/.kzk-harness-shared/hooks/edit-read-guard.mjs` (PreToolUse Edit|Write `--mode=pre` + PostToolUse Read `--mode=post-read` 단일 파일).
- Turn state: `~/.cache/kzk-harness/{current-turn.json (atomic), read-log.jsonl (O_APPEND atomic, flock 폐기)}`.
- Bypass: `touch ~/.cache/kzk-harness/bypass-token` (one-shot, **PreToolUse 단독 소비**).
- Kill switch: `OMC_SKIP_HOOKS=edit-read-guard`.
- Hook 등록 = `dispatcher.mjs` 1개 (UserPromptSubmit). 활성 sub-hook = `enabled.json` manifest.
- Disable: `bash uninstall-global.sh` (PreToolUse + PostToolUse + UserPromptSubmit + manifest 셋 다 cleanup, **managed 파일명 whitelist**).
```

### Task 9 — `install/test/run-tests.sh` 갱신

**File**: `$TEST_RUN`

종합 result 직전 (skill-text-checks 다음) 에 추가:

```bash
# Plan F — edit-read-guard
printf '\n--- edit-read-guard.test.mjs (Plan F rev2) ---\n'
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
feat(hooks): edit-read-guard PreToolUse + install lib copy fix (Plan F rev2)

PreToolUse + PostToolUse 단일 파일 (edit-read-guard.mjs --mode=pre/post-read) — realpath 정규화 + tool_name 별 분기 (Write ENOENT allow / Edit read-required) + single-use bypass token (PreToolUse 단독 소비).
Turn state on-disk: ~/.cache/kzk-harness/current-turn.json (atomic) + read-log.jsonl (O_APPEND atomic — flock 폐기).
UserPromptSubmit dispatcher 1개로 통합 (canonical order: read-log clear → keyword-detector → regression-recall → fix-scope-trigger). 활성 set = enabled.json manifest 기반 (stale file 차단).
install-global.sh enable_hooks() — install/lib/*.mjs idempotent copy (cmp -s skip / overwrite). hook 배열 canonical 재구성 (managed 파일명 whitelist 5개만 strip — 사용자 커스텀 hook 보존).
uninstall-global.sh — PreToolUse + PostToolUse + UserPromptSubmit + manifest 셋 다 cleanup.
kzk-tool-retry v1.3 — §PreToolUse guard subsection (shell grep/cat tracker 안 잡힘 명시).
harness-share.md §27.1 cross-ref.
edit-read-guard.test.mjs — 6 case (read→edit allow / read 없이 deny / Write ENOENT / bypass single-use / cross-turn deny / symlink realpath). turn rotate 는 turn-state.mjs 직접 import.

Spec: docs/plans/edit-read-guard-spec.md (rev3, frozen).
Plan: docs/plans/plan-F-edit-read-guard.md (rev2, frozen).
Cycle 1 verdict: docs/plans/plan-F-edit-read-guard-critic-review.md (REVISE → rev2 답 7 항목 통합).
Skill count 변경 없음 (16).
```

## Test 전략

- `edit-read-guard.test.mjs` 6 case — fixture-격리 (NODE_ENV=test + KZK_TEST_STATE_DIR override) 단위 검증. behavioral test 는 manual cycle (다음 session 의 실제 Edit 시도 차단 확인).
- 한계: dispatcher 의 sub-hook 합본 stdout 통합 테스트 미포함 — manual `--enable-hooks` 후 prompt 수동 검증 의존.
- regression-recall 의 ESM resolve fail 수리 검증: install 후 `node ~/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs <<< '{}'` 직접 실행 → no `node:internal/modules/esm/resolve` error.
- manifest stale file 검증: install 후 `enabled.json` 의 `regression_recall: false` 로 수동 변경 → dispatcher 가 skip 하는지 확인 (파일 존재해도 manifest false 면 안 돌아감).

## Rollback

| Level | 메커니즘 |
|---|---|
| Plan revert | `git revert <Plan-F-sha>` — hook 파일/lib/skill v1.3/share §27.1/test 모두 한 commit 복원 |
| Hook 전체 비활성 | `bash install/uninstall-global.sh` — PreToolUse + PostToolUse + UserPromptSubmit + manifest 셋 다 settings.json/disk 에서 제거 (managed whitelist 적용) |
| edit-read-guard 만 비활성 | `OMC_SKIP_HOOKS=edit-read-guard` env (세션 단위) |
| 단발 bypass | `touch ~/.cache/kzk-harness/bypass-token` (1회 Edit 후 PreToolUse 자동 unlink) |
| sub-hook 개별 비활성 | `enabled.json` manifest 직접 편집 (`regression_recall: false` 등) — dispatcher 가 다음 prompt 부터 skip |
| settings.json 수동 복구 | `~/.claude/settings.json` 의 PreToolUse/PostToolUse 배열 직접 편집 |

## Out of scope

- behavioral 자동 test (실제 Claude Code 세션 시뮬레이션) — manual cycle 검증 의존.
- Windows 지원 — POSIX `O_APPEND` atomic semantics 의존, 본 repo 범위 밖.
- 다른 PreToolUse matcher (Bash 등) 확장 — 본 spec rev3 는 Edit + Write 만.
- Read tracker 를 Bash `cat`/`grep` 까지 확장 — 본 spec rev3 §함정 6 명시 거부 (false positive 위험).
- flock 기반 동시성 — codex Plan F #1 / spec rev3 lock — `O_APPEND` POSIX atomic 만으로 충분.

## Codex review 의무

본 plan rev2 는 frozen. spec rev3 와 sync 완료 — codex Plan F cycle 1 verdict (REVISE) 의 7 항목 답 모두 통합. 추가 codex round 없이 cycle F 자율실행 진입 가능.

## Critic 매트릭스 — codex 7 항목 답 위치 매핑

| # | Cycle 1 결함 | rev2 답 위치 |
|---|---|---|
| 1 | AC2 + AC5 — spec lock 정합성 (flock / canonical 표현) | AC2 (`O_APPEND atomic`, flock 폐기 명시) + AC5 (managed 파일명 whitelist 5개 단일 표현) + Task 1 §구현 룰 + Task 4-2 jq `is_managed` 정의 + Task 5 동일 표현 + spec rev3 sync |
| 2 | dispatcher 통합 — settings.json + 파일 보존 | Task 4-2 (settings.json 에 dispatcher only 등록) + Task 4-2 본문 ("stand-alone hook 파일은 유지 — test/local exec/dispatcher import") + 비-kzk hook 보존 (managed whitelist 5개만 strip) |
| 3 | PreToolUse + PostToolUse 단일 파일 + `--mode` | AC1 (`--mode=pre` / `--mode=post-read` 분기) + Task 2 (단일 파일 두 분기) + Task 6 ("turn rotate 는 `turn-state.mjs` 직접 import — hidden hook API 폐기") |
| 4 | canonical 재구성 jq — managed 파일명 whitelist | Task 4-2 jq `is_managed` 함수 (5 파일명 substring 검사) + Task 5 동일 표현 + Variables `MANAGED_HOOKS` 명시 |
| 5 | `KZK_STATE_DIR` 운영 누수 차단 | AC2 (`KZK_TEST_STATE_DIR` rename + `NODE_ENV=test` 게이트) + Task 1 §구현 룰 (production 에선 두 조건 동시 만족 어려워 누수 차단) + Task 6 callHook env (`NODE_ENV: "test"`, `KZK_TEST_STATE_DIR`) |
| 6 | Bypass token 소비 주체 — CRITICAL | AC10 ("PreToolUse 단독 소비 — dispatcher 손 안 댐") + Task 2 §`--mode=pre` step 3 (PreToolUse 단독 unlink) + Task 3 §bypass token 처리 ("dispatcher 는 bypass-token 손 안 댐") + Task 6 bypass single-use case + spec rev3 sync |
| 7 | dispatcher enabled set — manifest 기반 | AC3 (`enabled.json` manifest) + AC6 (manifest 생성/갱신) + Variables `MANIFEST` + Task 3 §활성 set 결정 (manifest 기반, 파일 존재 X, stale file 차단) + Task 4-3 (`update_hook_manifest()` helper) + Task 5 (uninstall 시 manifest 삭제) |
