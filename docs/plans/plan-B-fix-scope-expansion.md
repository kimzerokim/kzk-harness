# Plan B — Fix Scope Expansion (fix-start hook + Gate 4.5) — rev2

> Spec: `docs/plans/regression-memory-and-fix-quality-spec.md` (rev7, frozen — Axis B).
> Branch: `feature/memory`. Order: A → D → **B (this)** → C → E (5 plan).
> Sister plans: A (frozen), D (frozen), C (rev2 frozen).
> Status: **Frozen** — codex CLI cycle 1 verdict REVISE 12 항목 모두 답 통합. `kzk-spec-and-review §Cost/cadence` "1 plan = 1 round" 룰 적용 — cycle 2 skip.
> Cycle 1 review: `docs/plans/plan-B-fix-scope-expansion-critic-review.md`.
> rev1 → rev2 변경: hook-shared.mjs 공용 lib 신규 (D consumer hard-dependency 차단), D 의 regression-recall.mjs retroactive 정정 task 추가, CRG 시그니처 Step 0 단일 SoT lock + `--symbol` 모순 제거, cache 포맷 `.json` → `.jsonl` + lockdir atomicity wrapper, Gate 4.5 escape env-var + append/list 재설계, kzk-pre-merge-sync 수정 task 신규, fix-verify hook 단독 task (manual self-check 룰), DI command-runner 주입 test 강화, harness-share §3.5 SoT 통일 + gate count 7 반영, rollback 5→6 level (global install cleanup 추가), skill count 15→16 sync 4-point.

## Goal

신규 skill `kzk-fix-scope-expansion` + fix-start hook 인프라 구축. AI 자율실행 cycle 의 5 메타갭 중 **Fix scope 누수** 차단. 사용자 prompt 가 fix intent 일 때 (또는 직전 Bash 가 non-zero exit / 에러 페이스트 detect 시) 함수/심볼 callsite 를 `code-review-graph` 로 전수 조회 → Plan D 의 recall 결과 다음 슬롯에 system-reminder 로 inject. Pre-commit Gate 4.5 가 callsite grep 결과 vs `git diff --name-only` 매칭 sanity check 로 누락 callsite 차단.

핵심 메커니즘:
- **공용 lib** (`install/lib/hook-shared.mjs`) — `FIX_KEYWORDS`, `SELF_IMPROVE_VERBPHRASES`, `shouldSkip()`, `detectFixIntent()` export. `regression-recall.mjs` + `fix-scope-trigger.mjs` 둘 다 import. D 의 regression-recall.mjs 도 이 lib 으로 retroactively 마이그레이션 (D 독자 정의 drift 차단).
- **cache atomicity lib** (`install/lib/cache-write.mjs`) — `writeSingleEntryWithLock(path, key, value)`. lockdir 기반 race 차단. fix-scope-trigger 의 JSONL 쓰기는 반드시 이 wrapper 경유.
- **fix-start hook** (`install/hooks/fix-scope-trigger.mjs`) — UserPromptSubmit, Plan D recall hook 다음 슬롯에 등록 (consumer 관계). hook-shared import. CRG 시그니처 = Step 0 확정본 단일. fallback `grep -rn --include='*.{ts,tsx,js,mjs,sh,py}' --exclude-dir={node_modules,.git,docs}`. 결과 list 를 `.kzk-harness/fix-scope-cache.jsonl` 에 append (key=cycle commit SHA, value=callsite list). system-reminder inject. **default DISABLED** (settings.json 등록은 `--fix-scope-trigger` flag 호출 시만).
- **Gate 4.5** (Pre-commit Gate, Gate 4 ↔ commit 사이) — escape 입력 = environment variable (commit body 아님). cache = JSONL append/list (last-fix-wins 포기). callsite list vs `git diff --cached --name-only` 매칭. 미스매치 → BLOCK.
- **자동 enable** — `kzk-pre-merge-sync` step 3 명령에 `--fix-scope-trigger` 추가. checklist `--enable-hooks --regression-recall --fix-scope-trigger`.
- CRG 미설치 → stderr WARN + `_warn:"crg-not-installed-grep-fallback"` + grep fallback (docs 제외).

## Acceptance Criteria

1. `skills/kzk-fix-scope-expansion/SKILL.md` 신규 — frontmatter (name=`kzk-fix-scope-expansion`, version=`1.0.0`, description with triggers), §Triggers, §Why, §Fix-start hook (trigger 룰 + hook-shared import + CRG 우선 + grep fallback docs 제외 + cache 위치 JSONL + recall consumer 룰 + fix-verify manual self-check 룰), §Gate 4.5 (env-var escape + append/list cache policy + sanity check 룰), §자가-skip guard (D 와 동일 동사구만 — hook-shared.shouldSkip 재사용), §Default DISABLED 정책, §Rollback (6 level), §Interaction with other kzk-* (D consumer + Gate 4.5 of pre-commit-gate + hook-shared dependency)
2. `install/lib/hook-shared.mjs` 신규 — exports: `FIX_KEYWORDS` (array), `SELF_IMPROVE_VERBPHRASES` (array), `shouldSkip(input)`, `detectFixIntent(prompt)`. regression-recall.mjs + fix-scope-trigger.mjs 둘 다 이 파일을 import 해야 함 (drift 차단 SoT).
3. `install/lib/cache-write.mjs` 신규 (또는 `install/lib/sidecar-write.mjs` 확장) — `writeSingleEntryWithLock(path, key, value)` API. lockdir 기반 atomic write. JSONL append 의미론: 같은 key 중복 허용 (cycle별 append/list policy).
4. `install/hooks/fix-scope-trigger.mjs` 신규 — UserPromptSubmit hook. hook-shared.mjs import (자가-skip, fix intent). Step 0 확정 CRG 시그니처 단일 사용 (`--symbol` 제거). grep fallback `--include='*.{ts,tsx,js,mjs,sh,py}' --exclude-dir={node_modules,.git,docs}`. cache-write.mjs 의 `writeSingleEntryWithLock` 경유 JSONL append. escape 판단 = `process.env.KZK_GATE45_SKIP` (commit body 아님). system-reminder inject. CRG 미설치 시 stderr WARN + `_warn:"crg-not-installed-grep-fallback"`. **default DISABLED** (settings.json 등록은 `--fix-scope-trigger` flag 호출 시만).
5. **[D retroactive fix]** `install/hooks/regression-recall.mjs` 갱신 — 기존 자체 정의 `FIX_KEYWORDS` / `SELF_IMPROVE_VERBPHRASES` / `shouldSkip` / `detectFixIntent` → `hook-shared.mjs` import 로 교체. 로직 동일, 정의 위치만 이동. (D commit 53885de 의 독자 정의 drift 차단)
6. `install/hooks/fix-scope-trigger.mjs` 내 fix-verify 룰 — SKILL.md 본문에 fix-verify manual self-check 룰 명시: Edit + test 완료 후 hook-shared.detectFixIntent 와 같은 callsite 전수 확인 self-check 의무. `PostToolUse` hook 미지원 환경이므로 수동 rule 형태. 단독 task 분리 (Task 16).
7. `install/test/fix-scope-trigger.test.mjs` 신규 — **DI command-runner 주입** 방식: `runCRG(cmd, runner=execSync)`, `runGrep(pattern, runner=execSync)` 형태로 runner 주입 가능. CRG path vs grep path 분기 assert. hook JSON input (`{hook_event_name, prompt}`) / output (`{system_reminder}`) 통합 test. 최소 12 case: 자가-skip env / SELF_IMPROVE_VERBPHRASES hit / FIX_KEYWORDS hit / 심볼 추출 (backtick/camelCase/snake_case/func()) / CRG path mock (runner assert) / grep fallback mock (runner assert) / truncation 200-char cap / cache JSONL append (lockdir mock) / D recall consumer 슬롯 순서 simulating / Gate 4.5 sanity check pass/fail / non-fix prompt silent pass / cache JSONL schema validation (key=SHA, value=callsite list).
8. `install/test/fixtures/fix-scope-callsites.sample.jsonl` 신규 — mock CRG response + grep response sample. fixture 헤더 comment: `# illustrative only — Plan B Step 0 actual code-review-graph output wins on drift`. CRG 필드와 grep line 모두 예시 포함.
9. `install/test/run-tests.sh` 갱신 — `test_fix_scope_trigger` 함수 추가 (Plan D 의 `test_regression_recall` 다음 슬롯). 실행 호출 line 추가.
10. `install/install-global.sh` `enable_hooks()` 확장 — `--fix-scope-trigger` flag 추가, `DO_FIX_SCOPE_TRIGGER=0` default. hook 파일 copy + idempotent jq append (D 의 `--regression-recall` 패턴 동일). `--fix-scope-trigger` 도 `--enable-hooks` explicit dependency. **fail-closed**: jq 부재 / exit non-zero / duplicate entry → return 1.
11. `install/dependencies.sh` 갱신 — `code-review-graph` entry 강화: SUMMARY message "Plan B kzk-fix-scope-expansion uses code-review-graph for callsite expansion. Without CRG, fallback = grep (docs excluded).". 기존 entry 없으면 신규 추가 (pip --user → pipx fallback).
12. `skills/kzk-pre-commit-gate/SKILL.md` 갱신 — `## Gate 4.5 — Fix Scope Sanity Check (Plan B)` 신규 section, Gate 4 다음 / Doc-only commit exception 직전. escape = `KZK_GATE45_SKIP=1` env var 설정. cache policy = JSONL append/list (현재 cycle commit SHA key 항목들 모두 체크, last-fix-wins 아님). callsite list vs `git diff --cached --name-only` 매칭. 미스매치 → BLOCK (사유 명시 commit body 또는 미수정 callsite 수정). cache 부재 시 N/A. frontmatter version `1.2.0` → `1.3.0`. description + Triggers list 에 `Gate 4.5`, `fix-scope-cache`, `callsite mismatch`, `KZK_GATE45_SKIP` 추가.
13. `skills/kzk-codebase-survey/SKILL.md` 갱신 — Triggers list 에 fix-time trigger phrase 추가: `fix 시작`, `버그 수정`, `에러 fix`, `regression fix`, `callsite 전수`, `함수 수정 영향`. frontmatter version `1.5.0` → `1.6.0`. §Interaction with other kzk-* 에 `kzk-fix-scope-expansion (Plan B)` cross-ref 추가. **SoT 참조 = harness-share §3.5** (kzk-pre-commit-gate §3.5 cross-ref 동일).
14. `skills/kzk-pre-merge-sync/SKILL.md` 갱신 — step 3 명령에 `--fix-scope-trigger` 추가: `install-global.sh --enable-hooks --regression-recall --fix-scope-trigger`. checklist 항목도 동일 3-flag 형태로 갱신. **fail-closed**: 등록 실패 → merge block (D 와 동일 정책).
15. `skills/kzk-large-task-delegation/SKILL.md` 갱신 — §Subagent prompt requirements 의 Recall 결과 inject 룰 옆에 **fix-scope cache inject 룰** 추가: dispatch 시점 `.kzk-harness/fix-scope-cache.jsonl` 존재 시 callsite list dispatch prompt 에 verbatim inject (size cap 200 char — D recall 동일 룰). §Interaction with other kzk-* 에 `kzk-fix-scope-expansion (Plan B)` 항목 추가.
16. `harness-share.md` §3.5 신규 — **Fix Scope Expansion (kzk-fix-scope-expansion, Plan B) single SoT**. 본문: Fix-start hook 룰 + hook-shared import 의무 + CRG Step 0 확정 시그니처 + grep fallback (docs 제외) + Gate 4.5 (env-var escape + JSONL append/list) + Default DISABLED + cache 위치 (`fix-scope-cache.jsonl`) + cross-ref §28 (Plan D consumer 관계). kzk-codebase-survey / kzk-pre-commit-gate / kzk-fix-scope-expansion 모두 §3.5 cross-ref. README "up to 6 gates" → "up to 7 gates" (Gate 4.5 추가). §3.5 가 canonical SoT — 스킬 본문과 충돌 시 §3.5 우선.
17. `CLAUDE.md` + `README.md` skill count 15→16 (4 sync points): CLAUDE.md line 3 (`15` → `16`), CLAUDE.md "All N skills" line, README.md line 3, README.md install command skill count. 추가로 "up to 6 gates" → "up to 7 gates" 동기화 (해당 문구 존재 시).
18. **[신규] fix-verify manual self-check 룰** — `skills/kzk-fix-scope-expansion/SKILL.md` §Fix-verify hook section: "Edit + test 완료 후 `hook-shared.detectFixIntent` 와 동일 FIX_KEYWORDS 목록으로 수정한 함수의 callsite 전수 self-check. PostToolUse hook 미지원 환경 → SKILL.md 본문 수동 rule 형태. 누락 callsite 발견 시 Gate 4.5 에서 BLOCK 됨 — 사전 self-check 로 차단".
19. `bash install/test/run-tests.sh` PASS — `test_fix_scope_trigger` 포함 전체 통과. regression-recall.test.mjs 도 hook-shared 마이그레이션 후 여전히 통과.
20. atomic commit 메시지: `feat(skill): kzk-fix-scope-expansion + Gate 4.5 — fix scope expansion (Plan B)`

## Variables

- `SKILL_FSE = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-fix-scope-expansion/SKILL.md`
- `SKILL_PCG = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-pre-commit-gate/SKILL.md`
- `SKILL_CS = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-codebase-survey/SKILL.md`
- `SKILL_RM = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-regression-memory/SKILL.md`
- `SKILL_LTD = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-large-task-delegation/SKILL.md`
- `SKILL_PMS = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-pre-merge-sync/SKILL.md`
- `HOOK_FIXSCOPE = /Users/kimzerokim/work/personal/kzk-harness/install/hooks/fix-scope-trigger.mjs`
- `HOOK_RECALL = /Users/kimzerokim/work/personal/kzk-harness/install/hooks/regression-recall.mjs` (D retroactive fix 대상)
- `LIB_SHARED = /Users/kimzerokim/work/personal/kzk-harness/install/lib/hook-shared.mjs` (신규 — #2 D import drift 차단)
- `LIB_CACHE = /Users/kimzerokim/work/personal/kzk-harness/install/lib/cache-write.mjs` (신규 — #4 lockdir atomicity)
- `LIB_SIDECAR = /Users/kimzerokim/work/personal/kzk-harness/install/lib/sidecar-write.mjs` (D 기존 — B 에서 cache-write 로 wrapping)
- `TEST_FIXSCOPE = /Users/kimzerokim/work/personal/kzk-harness/install/test/fix-scope-trigger.test.mjs`
- `FIXTURE_CALLSITES = /Users/kimzerokim/work/personal/kzk-harness/install/test/fixtures/fix-scope-callsites.sample.jsonl`
- `TEST_RUN = /Users/kimzerokim/work/personal/kzk-harness/install/test/run-tests.sh`
- `INSTALL_GLOBAL = /Users/kimzerokim/work/personal/kzk-harness/install/install-global.sh`
- `DEPS = /Users/kimzerokim/work/personal/kzk-harness/install/dependencies.sh`
- `SHARE = /Users/kimzerokim/work/personal/kzk-harness/harness-share.md`
- `CLAUDE_MD = /Users/kimzerokim/work/personal/kzk-harness/CLAUDE.md`
- `README = /Users/kimzerokim/work/personal/kzk-harness/README.md`

## Tasks 0–17

### Task 0 — `code-review-graph` backend probe (CRITICAL — CRG 시그니처 SoT 확정)

**Plan D Step 0 와 sibling. 이 step 의 출력이 모든 CRG 호출 형식의 단일 SoT. Task 4 의 fix-scope-trigger.mjs 는 이 확정 시그니처만 사용.**

진입 의존: `code-review-graph` 설치되어 있어야 함. 미설치 환경 분기:

1. `code-review-graph --version` 시도. 명령 unavailable → **CRG path OFF** (grep fallback 전용 동작). stderr WARN 의무 + `_warn:"crg-not-installed-grep-fallback"`. Plan B 본 plan commit OK (default DISABLED). `dependencies.sh` 실행 권고.

2. CRG 가용 시:
   ```bash
   code-review-graph status 2>&1 | tee /tmp/crg-status.log
   code-review-graph --help 2>&1 | tee /tmp/crg-help.log
   ```
   `status` 출력에서 `Files / Nodes / Edges / Last updated` 캡처. `--help` 에서 query 서브커맨드 정확 시그니처 확정 (현재 가정: `code-review-graph query --file <target>`, `code-review-graph blast-radius --file <target>`). **`--symbol` 플래그 존재 여부 확인 — 없으면 Task 4 에서 절대 사용 금지**.

3. Nodes < 50 OR Last updated SHA 가 HEAD 와 > 10 commit drift → build 의무:
   ```bash
   code-review-graph build
   code-review-graph status 2>&1
   ```
   재검증 실패 시 → `_warn:"crg-stale-grep-fallback"` + grep fallback으로 격하 (silent fallback 금지).

4. 확정 시그니처로 실제 query 1회 실행:
   ```bash
   code-review-graph query --file install/hooks/regression-recall.mjs 2>&1 | tee /tmp/crg-query.log
   ```
   (--symbol 등 추가 flag 는 `--help` 확인 후에만 사용)

5. 출력 캡처본을 `$FIXTURE_CALLSITES` 의 `crg_response_sample` field 로 복사. fixture 헤더 comment: `# illustrative only — Plan B Step 0 actual code-review-graph output wins on drift`.

6. **Task 0 완료 게이트**: `$FIXTURE_CALLSITES` git-tracked, 확정 CRG 시그니처를 이 plan 본문 + Task 4 에 반영 완료.

실패 시 user-queue entry: `Q-PLAN-B-STEP0 — CRG 미설치 또는 시그니처 캡처 실패, grep-only fallback 모드로 Task 4 진행`.

---

### Task 1 — `install/lib/hook-shared.mjs` 신규 (~60 lines)

**File**: `$LIB_SHARED`

**목적**: D 의 `regression-recall.mjs` 와 B 의 `fix-scope-trigger.mjs` 가 독자 FIX_KEYWORDS 정의를 유지하면 drift 발생. 공용 lib 에 단일 정의.

**exports**:
```js
export const FIX_KEYWORDS = [
  'fix', 'fixes', 'fixed', 'fixing',
  'bug', 'bugs', 'bugfix',
  'error', 'errors', 'issue', 'issues',
  'regression', 'revert',
  '수정', '고쳐', '버그', '에러', '오류', '고침'
];

export const SELF_IMPROVE_VERBPHRASES = [
  '개선', '리팩터', 'refactor', 'improve', 'cleanup', 'cleanup',
  '자가개선', 'self-improve', 'self improve'
];

export function shouldSkip(input) {
  // Returns true if this hook should self-skip (자가-skip guard)
  // Matches SELF_IMPROVE_VERBPHRASES AND harness/skill file targets
}

export function detectFixIntent(prompt) {
  // Returns true if prompt contains fix-intent signal
  // Matches FIX_KEYWORDS at word boundary
}
```

**test**: 기존 `regression-recall.test.mjs` 의 shouldSkip + FIX_KEYWORDS 케이스가 이 lib import 후에도 통과해야 함 (Task 5 에서 검증).

---

### Task 2 — `install/lib/cache-write.mjs` 신규 (~80 lines)

**File**: `$LIB_CACHE`

**목적**: fix-scope-trigger 의 JSONL cache 쓰기를 atomic + lockdir 보호. D 의 `sidecar-write.mjs` 의 `acquireLock` + `writeAtomic` 재사용하거나 동일 패턴 적용.

**API**:
```js
export async function writeSingleEntryWithLock(path, key, value) {
  // Acquires lockdir at path + '.lock'
  // Reads existing JSONL, appends {key, value, ts: ISO}
  // Atomic write via tmp + rename
  // Releases lock on success or error
}
```

**JSONL schema**:
```jsonl
{"key":"<cycle-commit-SHA>","value":["path/to/callsite1.ts:42","path/to/callsite2.mjs:7"],"ts":"2026-05-04T10:00:00Z"}
```

**특이사항**: 같은 key 중복 append 허용 (cycle 내 여러 번 호출 시 list 로 누적). `last-fix-wins` 포기 — Gate 4.5 는 현재 cycle SHA key 의 모든 value 항목을 union 으로 체크.

---

### Task 3 — `skills/kzk-fix-scope-expansion/SKILL.md` 신규 (~320 lines)

**File**: `$SKILL_FSE`

**Frontmatter**:
```yaml
---
name: kzk-fix-scope-expansion
version: 1.0.0
description: "Fix scope expansion — fix 시작 시 함수/심볼 callsite 전수 조회 (CRG 우선 + grep fallback) + Gate 4.5 sanity check. Top triggers: 'fix 시작', 'callsite 전수', 'Gate 4.5', 'fix-scope-cache', 'callsite mismatch', 'KZK_GATE45_SKIP'. Body §Triggers for full list."
---
```

**Authoritative source line**:
`> Authoritative source: harness-share.md §3.5. On conflict, that wins.`

**필수 sections**:
- §Triggers (fix intent 키워드 + callsite 전수 + Gate 4.5 관련)
- §Why (Fix scope 누수 메타갭 설명)
- §Fix-start hook (trigger 룰, hook-shared import, CRG 시그니처 = Task 0 확정본, grep fallback docs 제외, cache JSONL 위치, recall consumer 관계)
- §Fix-verify hook (manual self-check 룰 — Task 16 내용)
- §Gate 4.5 (`KZK_GATE45_SKIP` env var, JSONL append/list policy, callsite vs diff 매칭 룰, BLOCK 조건)
- §자가-skip guard (`hook-shared.shouldSkip` 재사용 — 동사구만, 자가개선 루프 자기오염 차단)
- §Default DISABLED 정책 (5 plan 완료 + main 머지 시 자동 enable)
- §Rollback (6 level)
- §Interaction with other kzk-* (D consumer, Gate 4.5 of pre-commit-gate, hook-shared dependency, kzk-pre-merge-sync auto-enable)

---

### Task 4 — `install/hooks/fix-scope-trigger.mjs` 신규 (~180 lines)

**File**: `$HOOK_FIXSCOPE`

**구조**:
```js
import { shouldSkip, detectFixIntent, FIX_KEYWORDS } from '../lib/hook-shared.mjs';
import { writeSingleEntryWithLock } from '../lib/cache-write.mjs';

// DI 주입 가능 runner (test 에서 mock 주입)
export async function runCRG(cmd, runner = execSync) { ... }
export async function runGrep(pattern, runner = execSync) { ... }

export async function handler(input, { runner = null } = {}) {
  // input: { hook_event_name, prompt }
  // 1. shouldSkip → return null
  // 2. detectFixIntent → if false return null
  // 3. 심볼 추출 (backtick / camelCase / snake_case / func() 패턴)
  // 4. CRG 가용 시 Task 0 확정 시그니처 호출, 실패/미설치 → grep fallback
  //    grep: --include='*.{ts,tsx,js,mjs,sh,py}' --exclude-dir={node_modules,.git,docs}
  // 5. truncation 200 char cap
  // 6. writeSingleEntryWithLock('.kzk-harness/fix-scope-cache.jsonl', commitSHA, callsiteList)
  // 7. return { system_reminder: "..." }
}
```

**CRG 미설치 처리**:
```
process.stderr.write('[fix-scope-trigger] WARN: code-review-graph not installed. grep fallback.\n');
// structured warn in output:
_warn: "crg-not-installed-grep-fallback"
```

**Gate 4.5 escape**: `process.env.KZK_GATE45_SKIP === '1'` → hook 발동은 하되 Gate 4.5 에서 skip. hook 자체와 Gate 는 별도 (hook 은 항상 callsite 수집, gate 만 skip).

**default DISABLED**: 이 파일을 settings.json 에 등록하지 않음. `install-global.sh --fix-scope-trigger` 호출 시만 등록.

---

### Task 5 — `install/hooks/regression-recall.mjs` 갱신 (D retroactive fix)

**File**: `$HOOK_RECALL`

**변경 내용**:
- 기존 파일 내 `FIX_KEYWORDS`, `SELF_IMPROVE_VERBPHRASES`, `shouldSkip`, `detectFixIntent` 독자 정의 → 제거
- 상단에 import 추가:
  ```js
  import { FIX_KEYWORDS, SELF_IMPROVE_VERBPHRASES, shouldSkip, detectFixIntent } from '../lib/hook-shared.mjs';
  ```
- 로직 자체는 변경 없음. 정의 위치만 hook-shared 로 이동.

**검증**: 기존 `regression-recall.test.mjs` 그대로 PASS 해야 함 (로직 동일, import 소스만 변경).

---

### Task 6 — `install/test/fix-scope-trigger.test.mjs` 신규 (~200 lines)

**File**: `$TEST_FIXSCOPE`

**패턴**: Plan D 의 `regression-recall.test.mjs` 구조 동일. ESM, Node test runner.

**DI 구조**:
```js
import { handler, runCRG, runGrep } from '../../hooks/fix-scope-trigger.mjs';

// runner mock
const mockRunner = (output) => () => output;
```

**12 케이스**:
1. 자가-skip env (`KZK_SELF_IMPROVE=1` 또는 SELF_IMPROVE_VERBPHRASES hit) → null 반환
2. FIX_KEYWORDS hit → detectFixIntent true
3. FIX_KEYWORDS 없는 prompt → detectFixIntent false → null 반환 (non-fix silent pass)
4. 심볼 추출 backtick 패턴 (`\`functionName\``)
5. 심볼 추출 camelCase 패턴
6. 심볼 추출 func() 패턴
7. CRG path mock — runner 가 CRG output 반환 → callsite list 파싱 assert
8. grep fallback mock — CRG 미설치 시 runner 가 grep output 반환 → callsite list 파싱 assert
9. truncation cap — 200 char 초과 시 truncation 확인
10. cache JSONL append — `writeSingleEntryWithLock` mock 으로 key/value 구조 assert
11. Gate 4.5 sanity check pass — callsite list ⊆ diff files
12. Gate 4.5 sanity check fail — callsite list ⊄ diff files → BLOCK message 포함

**cache schema validation** (케이스 10 extension): `{key: string (SHA), value: string[], ts: ISO}` 구조 assert.

---

### Task 7 — `install/test/fixtures/fix-scope-callsites.sample.jsonl` 신규

**File**: `$FIXTURE_CALLSITES`

**헤더 comment**: `# illustrative only — Plan B Step 0 actual code-review-graph output wins on drift`

**내용**:
```jsonl
{"type":"crg_response_sample","source":"code-review-graph query --file install/hooks/regression-recall.mjs","callsites":["install/test/fix-scope-trigger.test.mjs:42","install/install-global.sh:88"]}
{"type":"grep_response_sample","source":"grep -rn shouldSkip --include='*.{mjs,js}' --exclude-dir={node_modules,.git,docs}","callsites":["install/hooks/fix-scope-trigger.mjs:15","install/test/regression-recall.test.mjs:33"]}
```

Step 0 에서 실제 캡처본으로 교체 (실제 출력이 이 illustrative fixture 를 override).

---

### Task 8 — `install/test/run-tests.sh` 갱신

**File**: `$TEST_RUN`

**변경**:
- `test_fix_scope_trigger()` 함수 추가 — `$TEST_FIXSCOPE` 실행
- `test_regression_recall` 다음 슬롯에 `test_fix_scope_trigger` 호출 line 추가
- regression-recall 도 hook-shared 마이그레이션 후 통과 확인 (별도 assert 없음, 기존 케이스가 통과하면 충분)

---

### Task 9 — `install/install-global.sh` 갱신

**File**: `$INSTALL_GLOBAL`

**변경**:
- `DO_FIX_SCOPE_TRIGGER=0` 변수 추가
- `--fix-scope-trigger` flag 파싱: `DO_FIX_SCOPE_TRIGGER=1`
- `enable_hooks()` 내:
  ```bash
  if [ "$DO_FIX_SCOPE_TRIGGER" = "1" ]; then
    # copy fix-scope-trigger.mjs to shared hooks dir
    # jq idempotent append to settings.json (D 의 regression-recall 패턴 동일)
    # fail-closed: exit non-zero on jq absence / duplicate / error
  fi
  ```
- `--enable-hooks` dependency: `--fix-scope-trigger` 는 `--enable-hooks` 없이 단독 사용 불가 (OR fail-closed)
- checklist 출력에 `--enable-hooks --regression-recall --fix-scope-trigger` 3-flag 형태 표기

---

### Task 10 — `install/dependencies.sh` 갱신

**File**: `$DEPS`

**변경**:
- `code-review-graph` entry 탐색. 기존 entry 있으면 SUMMARY message 강화:
  ```
  "Plan B kzk-fix-scope-expansion uses code-review-graph for callsite expansion. Without CRG, fallback = grep (docs excluded)."
  ```
- 없으면 신규 entry (pip --user → pipx fallback, silent skip 금지, stderr WARN).

---

### Task 11 — `skills/kzk-pre-commit-gate/SKILL.md` 갱신

**File**: `$SKILL_PCG`

**변경**:
- `## Gate 4.5 — Fix Scope Sanity Check (Plan B)` 신규 section (Gate 4 다음, Doc-only commit exception 직전):
  ```markdown
  ## Gate 4.5 — Fix Scope Sanity Check (Plan B)

  > Authoritative source: harness-share.md §3.5. On conflict, that wins.

  **Trigger**: `.kzk-harness/fix-scope-cache.jsonl` 존재 시.
  **Skip**: `KZK_GATE45_SKIP=1` env var 설정 시 N/A (사유 commit body 기재 권고).
  **Cache policy**: JSONL append/list — 현재 cycle commit SHA (`$(git rev-parse HEAD)`) key 의 모든 항목 union 체크. last-fix-wins 아님.
  **Sanity check**: callsite list ⊄ `git diff --cached --name-only` → BLOCK.
  BLOCK 시 메시지: "Gate 4.5: callsite N곳 중 M곳 미수정. 누락 의도를 commit body 에 명시하거나 해당 callsite 도 수정."
  **Cache 부재**: N/A (fix-scope-trigger hook 비활성 또는 fix intent 아닌 commit).
  ```
- frontmatter version `1.2.0` → `1.3.0`
- description + Triggers list: `Gate 4.5`, `fix-scope-cache`, `callsite mismatch`, `KZK_GATE45_SKIP` 추가

---

### Task 12 — `skills/kzk-codebase-survey/SKILL.md` 갱신

**File**: `$SKILL_CS`

**변경**:
- frontmatter version `1.5.0` → `1.6.0`
- Triggers list 에 추가: `fix 시작`, `버그 수정`, `에러 fix`, `regression fix`, `callsite 전수`, `함수 수정 영향`
- description 에 `fix-time callsite expansion` 추가
- §Interaction with other kzk-* 끝에:
  ```
  - kzk-fix-scope-expansion (Plan B): fix 시작 시 CRG callsite 전수 조회 트리거. SoT = harness-share §3.5.
  ```

---

### Task 13 — `skills/kzk-pre-merge-sync/SKILL.md` 갱신

**File**: `$SKILL_PMS`

**변경**:
- step 3 명령 갱신:
  ```
  install-global.sh --enable-hooks --regression-recall --fix-scope-trigger
  ```
- checklist 항목 동일 3-flag 형태
- **fail-closed**: 등록 실패 → merge block (D 와 동일 정책 명시)

---

### Task 14 — `skills/kzk-large-task-delegation/SKILL.md` 갱신

**File**: `$SKILL_LTD`

**변경**:
- §Subagent prompt requirements (또는 §Recall inject 룰) 에:
  ```
  fix-scope cache inject: dispatch 시점 `.kzk-harness/fix-scope-cache.jsonl` 존재 시
  → 현재 cycle SHA key 의 callsite list 를 dispatch prompt 에 verbatim inject.
  Size cap: 200 char (truncate + "(truncated)" 표기). 우선순위: 변경 빈도 high → low.
  ```
- §Interaction with other kzk-* 에:
  ```
  - kzk-fix-scope-expansion (Plan B): fix-scope cache callsite list inject. SoT = harness-share §3.5.
  ```

---

### Task 15 — `harness-share.md` §3.5 신규

**File**: `$SHARE`

**위치**: 기존 §3 (Pre-commit Gate) 다음, §4 이전.

**내용 구조**:
```markdown
## 3.5 Fix Scope Expansion (kzk-fix-scope-expansion, Plan B)

> Single SoT for all fix-scope-expansion rules. kzk-pre-commit-gate §Gate 4.5,
> kzk-codebase-survey §fix-time trigger, kzk-fix-scope-expansion §Fix-start hook
> — all cross-ref here. On conflict, this section wins.

### Fix-start hook rules
- hook-shared.mjs import 의무 (FIX_KEYWORDS / shouldSkip / detectFixIntent)
- CRG 시그니처: `code-review-graph query --file <target>` (Task 0 확정본 — --symbol 미확인 시 사용 금지)
- grep fallback: `grep -rn <symbol> --include='*.{ts,tsx,js,mjs,sh,py}' --exclude-dir={node_modules,.git,docs}`
- Cache: `.kzk-harness/fix-scope-cache.jsonl` (JSONL append, key=commit SHA, value=callsite list)
- Default DISABLED — 5 plan 완료 + main 머지 시 kzk-pre-merge-sync 통해 자동 enable

### Gate 4.5 rules
- escape: `KZK_GATE45_SKIP=1` env var
- cache policy: JSONL append/list (union check, last-fix-wins 아님)
- BLOCK: callsite list ⊄ diff files → "누락 의도 명시 또는 callsite 수정"

### Consumer relationship (Plan D)
- regression-recall.mjs 다음 슬롯에 등록
- hook-shared.mjs 를 D 와 B 가 동시 import (drift 차단)
- §28 cross-ref (Plan D Regression Memory)
```

---

### Task 16 — fix-verify manual self-check 룰 (SKILL.md §Fix-verify hook)

**File**: `$SKILL_FSE` (Task 3 에서 생성한 파일)

**이 task 는 Task 3 의 §Fix-verify hook section 을 확정하는 단계.**

**내용**:
```markdown
## §Fix-verify hook (manual self-check rule)

PostToolUse hook 은 install-global.sh 미지원 → 수동 rule:

1. Edit + test (기능 구현 + 테스트 통과) 완료 후
2. hook-shared.detectFixIntent 의 FIX_KEYWORDS 목록으로 수정한 함수명 callsite grep 실행:
   `grep -rn <functionName> --include='*.{ts,tsx,js,mjs,sh,py}' --exclude-dir={node_modules,.git,docs}`
3. 미수정 callsite 발견 시: 수정 or commit body 에 "intentionally skipped: <path>" 기재
4. Gate 4.5 에서 `.kzk-harness/fix-scope-cache.jsonl` 기반 BLOCK 됨 — 이 self-check 로 사전 차단 가능

이 룰은 kzk-pre-commit-gate Gate 4.5 의 사전 self-check 에 해당.
```

---

### Task 17 — `CLAUDE.md` + `README.md` skill count 갱신

**Files**: `$CLAUDE_MD`, `$README`

**변경 내용**:
- CLAUDE.md line 3: `14` (또는 `15`) → `16` 스킬 수
- CLAUDE.md "All N skills are active" 문구: 동일 → 16
- README.md line 3: 동일 → 16
- README.md install command skill count: 동일 → 16
- "up to 6 gates" → "up to 7 gates" (해당 문구 존재 시 4곳 모두 갱신)

**확인 command**:
```bash
grep -n "up to.*gates\|kzk.*skills\|14 \`kzk\|15 \`kzk\|16 \`kzk" \
  /Users/kimzerokim/work/personal/kzk-harness/CLAUDE.md \
  /Users/kimzerokim/work/personal/kzk-harness/README.md
```

---

### Task 18 — atomic commit

메시지: `feat(skill): kzk-fix-scope-expansion + Gate 4.5 — fix scope expansion (Plan B)`

포함 파일 목록 (모두 feature/memory branch):
- `install/lib/hook-shared.mjs` (신규)
- `install/lib/cache-write.mjs` (신규)
- `install/hooks/fix-scope-trigger.mjs` (신규)
- `install/hooks/regression-recall.mjs` (D retroactive fix)
- `skills/kzk-fix-scope-expansion/SKILL.md` (신규)
- `skills/kzk-pre-commit-gate/SKILL.md` (Gate 4.5 추가)
- `skills/kzk-codebase-survey/SKILL.md` (fix-time trigger 추가)
- `skills/kzk-pre-merge-sync/SKILL.md` (--fix-scope-trigger 추가)
- `skills/kzk-large-task-delegation/SKILL.md` (cache inject 룰)
- `harness-share.md` (§3.5 신규)
- `install/install-global.sh` (--fix-scope-trigger flag)
- `install/dependencies.sh` (CRG entry 강화)
- `install/test/fix-scope-trigger.test.mjs` (신규)
- `install/test/fixtures/fix-scope-callsites.sample.jsonl` (신규)
- `install/test/run-tests.sh` (갱신)
- `CLAUDE.md` (16 sync)
- `README.md` (16 sync + "up to 7 gates")

## Test 전략

| 구분 | 방법 | 한계 |
|---|---|---|
| hook 로직 (자가-skip, fix intent, 심볼 추출) | DI runner mock, unit test | 실제 CRG 바이너리 미설치 환경에서 CRG path 미테스트 |
| CRG path | runner mock으로 출력 파싱 assert | 실제 CLI 버전 drift 미검출 |
| grep fallback | runner mock + 실 grep 명령 | docs 제외 패턴은 실 filesystem 필요 |
| cache atomicity (lockdir) | mock writeSingleEntryWithLock | race condition 은 단일 프로세스 test 로 미검증 |
| Gate 4.5 sanity check | callsite fixture + git diff mock | 실 git repo state 연동 미테스트 |
| install-global --fix-scope-trigger | manual verification (bash 스크립트) | CI 없음 — 로컬 실행만 |
| hook-shared retroactive D fix | regression-recall.test.mjs 기존 케이스 재실행 | D 구현 없으면 실행 불가 |

## Rollback (6 level)

1. **Task 0 CRG probe 실패** — grep-only fallback 모드로 Task 4 진행. CRG 관련 로직 조건부로 래핑 (`if (CRG_AVAILABLE)`).
2. **hook-shared.mjs 마이그레이션으로 regression-recall.test.mjs 실패** — hook-shared 로직 수정 (regression-recall 기존 구현과 동일 보장). D commit 53885de 내용 재확인 후 export 시그니처 맞춤.
3. **cache-write.mjs lockdir race** — `writeSingleEntryWithLock` timeout (5초) + best-effort write fallback (lock 획득 실패 시 stderr WARN + lock 없이 write 강행).
4. **Gate 4.5 false positive (callsite 매칭 오류)** — `KZK_GATE45_SKIP=1 git commit` 으로 일시 bypass. 다음 session 에서 callsite grep 패턴 수정.
5. **install-global.sh --fix-scope-trigger 실패 (jq 부재)** — jq 설치 후 재시도. 수동 jq 없는 환경 → Python `json.tool` fallback (jq 미설치 WARN 출력 후).
6. **[신규] global install 산출물 cleanup** — `~/.claude/skills/.kzk-harness-shared/hooks/fix-scope-trigger.mjs` 제거 + `~/.claude/settings.json` 의 hook entry 제거 + auto-enable reversal: `install-global.sh --disable-fix-scope-trigger` (flag 신규 추가 또는 수동 jq edit 지침). regression-recall 도 함께 비활성화 필요 시 `--disable-regression-recall` 병행.

## Out of Scope (Plan E / follow-up)

- PostToolUse hook 지원 시 fix-verify 자동화 (현재 manual self-check rule 으로 대체)
- Gate 4.5 CI integration (현재 로컬 pre-commit 만)
- CRG MCP path (`query_graph` API) 직접 사용 (현재 CLI path 만)
- callsite 우선순위 알고리즘 고도화 (현재 변경 빈도 high→low 단순 정렬)
- dismiss CLI for fix-scope cache entries (Plan E scope)
- `--symbol` flag 활성화 (Task 0 에서 `--help` 확인 후 Plan E 에서 추가 가능)

## Critic 매트릭스 — Cycle 1 12 항목 답 위치

| 항목 | 내용 | rev2 반영 위치 |
|---|---|---|
| #1 Acceptance cover | fix-verify task + kzk-pre-merge-sync task 추가, numbering 0-N | Acceptance 1/14/18, Task 13/16/18 |
| #2 D consumer hidden dependency | hook-shared.mjs 공용 lib + D retroactive fix | Task 1, Task 5, AC #2/#5 |
| #3 CRG status oracle 단일화 | Step 0 확정 시그니처 SoT lock, `--symbol` 모순 제거, stale → `_warn` + grep fallback | Task 0, Task 4, AC #4 |
| #4 Cache atomicity | cache-write.mjs + `writeSingleEntryWithLock` lockdir | Task 2, AC #3 |
| #5 Gate 4.5 timing | escape = env var, cache = append/list (last-fix-wins 포기) | Task 4/Task 11, AC #12 |
| #6 kzk-pre-merge-sync 수정 task | step 3 `--fix-scope-trigger` 추가 | Task 13, AC #14 |
| #7 Fix-verify hook 구현 | manual self-check 룰 (PostToolUse 미지원 → SKILL.md 수동 rule) | Task 16, AC #6/#18 |
| #8 Test 강화 | DI runner 주입, hook JSON IO 통합 test, 12 케이스 | Task 6, AC #7 |
| #9 SoT 통일 | harness-share §3.5 single SoT + cross-ref, "up to 7 gates" | Task 15, Task 17, AC #16/#17 |
| #10 Rollback 6 level | global install cleanup 6번째 level 추가 | Rollback section |
| #11 Skill count 4 sync + gates 문구 | 15→16, "6 gates"→"7 gates" | Task 17, AC #17 |
| #12 포맷/계약 | `.jsonl` 확장자, grep docs 제외, CRG 계약 단일화 | Task 0/2/4, AC #3/#4, Variables |

---

*LoC 추정: ~1350–1500 (hook-shared ~60, cache-write ~80, fix-scope-trigger ~180, SKILL.md ~320, test ~200, fixture ~10, skill 갱신 5개 ~200, harness-share §3.5 ~60, install/deps ~40, CLAUDE.md/README.md ~10)*
