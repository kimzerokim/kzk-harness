# Plan B — Fix Scope Expansion (fix-start hook + Gate 4.5) — rev1

> Spec: `docs/plans/regression-memory-and-fix-quality-spec.md` (rev7, frozen — Axis B).
> Branch: `feature/memory`. Order: A → D → **B (this)** → C → E (5 plan).
> Status: **Draft** (codex review 의무 — frozen 전).
> Format reference: Plan A rev2 (TDD task, acceptance grep), Plan D rev2 (consumer hook integration, fail-modes).

## Goal

신규 skill `kzk-fix-scope-expansion` + fix-start hook 인프라 구축. AI 자율실행 cycle 의 5 메타갭 중 **Fix scope 누수** 차단. 사용자 prompt 가 fix intent 일 때 (또는 직전 Bash 가 non-zero exit / 에러 페이스트 detect 시) 함수/심볼 callsite 를 `code-review-graph` 로 전수 조회 → Plan D 의 recall 결과 다음 슬롯에 system-reminder 로 inject. Pre-commit Gate 4.5 가 callsite grep 결과 vs `git diff --name-only` 매칭 sanity check 로 누락 callsite 차단.

핵심 메커니즘:
- **fix-start hook** (`install/hooks/fix-scope-trigger.mjs`) — UserPromptSubmit, Plan D recall hook 다음 슬롯에 등록 (consumer 관계). 키워드/페이스트 매칭 → `code-review-graph` 우선 (`callers_of`, `imports_of`), fallback `grep -rn`. 결과 list 를 system-reminder inject.
- **Gate 4.5** (Pre-commit Gate, 기존 Gate 4 ↔ commit 사이) — fix-start hook 이 캐시한 callsite list (`.kzk-harness/fix-scope-cache.json`) vs `git diff --cached --name-only` 매칭. 미스매치 → "callsite N 곳 중 M 곳만 변경됨. 누락 의도 명시 (commit body) 또는 다른 callsite 도 수정"
- **Default DISABLED at B commit, 자동 enable on main 머지** — Plan D 와 같은 enablement gate 통과. `--fix-scope-trigger` flag 가 `--regression-recall` 의 sibling (둘 다 `--enable-hooks` dependency).
- gstack 미설치 환경 — D 와 동일 silent skip 금지 (stderr WARN + structured `_warn` reason). 단, B 의 hook 은 gstack 의존 X — `code-review-graph` 의존. CRG 미설치 → grep fallback.

## Acceptance Criteria

1. `skills/kzk-fix-scope-expansion/SKILL.md` 신규 — frontmatter (name=`kzk-fix-scope-expansion`, version=`1.0.0`, description with triggers), §Triggers, §Why, §Fix-start hook (trigger 룰 + CRG 우선 + grep fallback + cache 위치 + recall consumer 룰), §Fix-verify hook (manual self-check inject), §Gate 4.5 (sanity check 룰), §자가-skip guard (D 와 동일 동사구만), §Default DISABLED 정책, §Rollback (5 level), §Interaction with other kzk-* (특히 D consumer + Gate 4.5 of pre-commit-gate)
2. `install/hooks/fix-scope-trigger.mjs` 신규 — UserPromptSubmit hook. 자가-skip → fix intent detect (FIX_KEYWORDS reuse from Plan D 구현, **import** from `regression-recall.mjs` to avoid drift) → 심볼 추출 (prompt 의 backtick / camelCase / snake_case / func() 패턴) → CRG `query_graph` 또는 CLI `code-review-graph query/blast-radius` 우선 → grep fallback → result truncation (200 char cap, **D recall reminder size cap 룰과 sibling**) → `.kzk-harness/fix-scope-cache.json` atomic write (via `install/lib/sidecar-write.mjs` 의 `writeAtomic` 재사용) → system-reminder inject. CRG 미설치 시 stderr WARN + `_warn:"crg-not-installed-grep-fallback"`. **default DISABLED at commit** (settings.json 등록은 `--fix-scope-trigger` flag 호출 시만)
3. `install/test/fix-scope-trigger.test.mjs` 신규 — mock prompt → expected callsite grep call 검증. 최소 12 case (자가-skip env / verbphrase / fix intent detect / 심볼 추출 / CRG path mock / grep fallback / truncation cap / cache 파일 atomic write / D recall consumer 순서 simulating / Gate 4.5 sanity check pass-fail / non-fix prompt → silent pass / cache 파일 schema validation)
4. `install/test/fixtures/fix-scope-callsites.sample.json` 신규 — mock CRG response + grep response sample. fixture 헤더 comment: `# illustrative only — Plan B Step 0 actual code-review-graph output wins on drift`
5. `install/test/run-tests.sh` 갱신 — `test_fix_scope_trigger` 함수 추가 (Plan D 의 `test_regression_recall` 다음 호출 슬롯 등록). 실행 호출 line 도 추가
6. `install/install-global.sh` `enable_hooks()` 확장 — `--fix-scope-trigger` flag 추가, default off (`DO_FIX_SCOPE_TRIGGER=0`). hook 파일 copy + idempotent jq append (D 의 `--regression-recall` 패턴 그대로). `--fix-scope-trigger` 도 `--enable-hooks` 의 explicit dependency. **fail-closed**: jq 부재 / exit non-zero / duplicate entry → return 1
7. `install/dependencies.sh` 갱신 — `code-review-graph` dependency 강화 (B 의 callsite 전수 grep 에 사용). 기존 entry 가 이미 있으면 SUMMARY message 만 강화 ("Plan B kzk-fix-scope-expansion uses code-review-graph for callsite expansion. Without CRG, fallback = grep."). 없으면 신규 entry 추가 (pip --user → pipx fallback, dependencies.md 와 sync)
8. `skills/kzk-pre-commit-gate/SKILL.md` 갱신 — `## Gate 4.5 — Fix Scope Sanity Check (Plan B)` 신규 section, 기존 Gate 4 다음, `## Doc-only commit exception` 직전 위치. 룰: cache 파일 (`.kzk-harness/fix-scope-cache.json`) 존재하면 callsite list vs `git diff --cached --name-only` 매칭. 미스매치 → BLOCK (commit body 에 의도 명시 의무). cache 부재 시 N/A (fix-scope-trigger hook 비활성 또는 fix intent 아닌 commit). frontmatter version `1.2.0` → `1.3.0`. description 에 `Gate 4.5` trigger 추가. Triggers list 에 `Gate 4.5`, `fix-scope-cache`, `callsite mismatch` 추가
9. `skills/kzk-codebase-survey/SKILL.md` 갱신 — Triggers list 에 fix-time trigger phrase 추가: `fix 시작`, `버그 수정`, `에러 fix`, `regression fix`, `callsite 전수`, `함수 수정 영향`. frontmatter version `1.5.0` → `1.6.0`. description 에 `fix-time callsite expansion` 추가. §Interaction with other kzk-* 끝에 `kzk-fix-scope-expansion (Plan B)` cross-ref 추가
10. `skills/kzk-regression-memory/SKILL.md` 갱신 — §Interaction with other kzk-* 의 `kzk-fix-scope-expansion (Plan B)` 항목 보강 (현재 1줄 → 3줄): "D recall hook 다음 슬롯에서 발동", "callsite cache (.kzk-harness/fix-scope-cache.json) 가 D recall reminder 와 함께 inject 되는 사용자 prompt context", "Gate 4.5 의 cache 입력자". 본문 변경 없음 (skill version bump X — Interaction-only patch)
11. `skills/kzk-large-task-delegation/SKILL.md` 갱신 — 기존 §Subagent prompt requirements 의 Recall 결과 inject 룰 옆에 **fix-scope cache inject 룰** 추가: subagent dispatch 시점에 `.kzk-harness/fix-scope-cache.json` 존재하면 cache 의 callsite list 도 dispatch prompt 에 verbatim inject (size cap 200 char — D recall 과 동일 룰, callsite 우선순위 = file 변경 빈도 high → low). §Interaction with other kzk-* 끝에 `kzk-fix-scope-expansion (Plan B)` 항목 추가
12. `harness-share.md` §3.5 신규 (또는 §29 다음 §30 신규 — 기존 §29 = Plan D Regression Memory) — 본 plan 은 §3.5 (Pre-commit Gate 와 sibling) 채택. Title: `## 3.5 Fix Scope Expansion (kzk-fix-scope-expansion, Plan B)`. 본문: Fix-start hook 룰 + CRG 우선 + grep fallback + Gate 4.5 sanity check + Default DISABLED + cross-ref to §29 (Plan D consumer 관계)
13. `CLAUDE.md` line 3 + "All N skills" line + `README.md` line 3 + install command skill count — **15 → 16** (Plan B 신규 skill 1개. Plan D 가 14→15, Plan B 가 15→16). 4 sync points 모두 변경
14. `bash install/test/run-tests.sh` PASS (`test_fix_scope_trigger` 포함 전체 통과. CLAUDE.md / README.md skill count assertion 도 16 으로 업데이트 — 기존 `assert "marker block has 14 kzk- rows"` 형태가 있으면 Plan D 가 15 로, Plan B 가 16 으로 업데이트)
15. atomic commit 메시지: `feat(skill): kzk-fix-scope-expansion + Gate 4.5 — fix scope expansion (Plan B)`

## Variables

- `SKILL_FSE = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-fix-scope-expansion/SKILL.md`
- `SKILL_PCG = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-pre-commit-gate/SKILL.md`
- `SKILL_CS = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-codebase-survey/SKILL.md`
- `SKILL_RM = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-regression-memory/SKILL.md`
- `SKILL_LTD = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-large-task-delegation/SKILL.md`
- `HOOK_FIXSCOPE = /Users/kimzerokim/work/personal/kzk-harness/install/hooks/fix-scope-trigger.mjs`
- `HOOK_RECALL = /Users/kimzerokim/work/personal/kzk-harness/install/hooks/regression-recall.mjs` (import source)
- `LIB_SIDECAR = /Users/kimzerokim/work/personal/kzk-harness/install/lib/sidecar-write.mjs` (`writeAtomic` reuse)
- `TEST_FIXSCOPE = /Users/kimzerokim/work/personal/kzk-harness/install/test/fix-scope-trigger.test.mjs`
- `FIXTURE_CALLSITES = /Users/kimzerokim/work/personal/kzk-harness/install/test/fixtures/fix-scope-callsites.sample.json`
- `TEST_RUN = /Users/kimzerokim/work/personal/kzk-harness/install/test/run-tests.sh`
- `INSTALL_GLOBAL = /Users/kimzerokim/work/personal/kzk-harness/install/install-global.sh`
- `DEPS = /Users/kimzerokim/work/personal/kzk-harness/install/dependencies.sh`
- `SHARE = /Users/kimzerokim/work/personal/kzk-harness/harness-share.md`
- `CLAUDE_MD = /Users/kimzerokim/work/personal/kzk-harness/CLAUDE.md`
- `README = /Users/kimzerokim/work/personal/kzk-harness/README.md`

## Tasks

### Task 0 — `code-review-graph` backend probe (CRITICAL)

**Plan D Step 0 와 sibling.** 이 step 의 출력이 모든 fixture / CLI 시그니처 가정의 single source of truth.

진입 의존: `code-review-graph` 설치되어 있어야 함. 미설치 환경 분기:

1. `code-review-graph --version` 시도. 명령 unavailable → **fix-scope hook 의 CRG path OFF** (hook 발동 시 grep fallback 으로 silent degradation, 단 stderr WARN 의무 + `_warn:"crg-not-installed-grep-fallback"` structured reason). Plan B 본 plan 자체 commit 진행 OK (hook default DISABLED 라 즉시 위협 X). 사용자에게 `dependencies.sh` 실행 권고.

2. CRG 가용 시:
   ```bash
   code-review-graph status 2>&1 | tee /tmp/crg-status.log
   code-review-graph --help 2>&1 | tee /tmp/crg-help.log
   ```
   query CLI 시그니처 캡처 — Plan B 본문의 `## Fix-start hook` 의 §CRG 호출 형식 행에 정확 시그니처 박음. 현재 가정 (kzk-codebase-survey SKILL.md §Step 1 인용): `code-review-graph query --file <target>`, `code-review-graph blast-radius --file <target>`. MCP path 는 `query_graph(pattern="callers_of"|"imports_of", target=<file or symbol>)`. 차이 있으면 plan 수정.

3. CRG status 의 `Files / Nodes / Edges / Last updated` 캡처. Nodes < 50 OR Last updated SHA 가 HEAD 와 > 10 commit drift → **build 의무**: `code-review-graph build` 후 재확인.

4. 실제 query 1회 실행 (sample 함수: 본 repo 의 `install/hooks/regression-recall.mjs::shouldSkip`):
   ```bash
   code-review-graph query --file install/hooks/regression-recall.mjs 2>&1 | tee /tmp/crg-query.log
   code-review-graph blast-radius --file install/hooks/regression-recall.mjs 2>&1 | tee /tmp/crg-blast.log
   ```

5. 출력 캡처본을 fixture (`$FIXTURE_CALLSITES`) 의 `crg_response_sample` field 로 복사. fixture 헤더 comment 에 "actual command output wins on drift" 명시.

6. grep fallback path 도 1회 실행:
   ```bash
   grep -rn "shouldSkip\b" --include="*.mjs" --include="*.ts" /Users/kimzerokim/work/personal/kzk-harness 2>&1 | head -50 | tee /tmp/grep-fallback.log
   ```
   출력을 fixture 의 `grep_response_sample` field 로 복사.

7. 실패 시 user-queue entry: `Q-PLAN-B-STEP0 — code-review-graph 미설치 또는 query 시그니처 캡처 실패, grep-only fallback 검토 필요`

**완료 게이트**: `$FIXTURE_CALLSITES` git-tracked + JSON valid (jq parse OK) + 두 sample 둘 다 캡처.

### Task 1 — `kzk-fix-scope-expansion/SKILL.md` 신규 (~180 lines)

**File**: `$SKILL_FSE`

`mkdir -p skills/kzk-fix-scope-expansion`.

**Frontmatter**:

```yaml
---
name: kzk-fix-scope-expansion
version: 1.0.0
description: "Fix scope 누수 차단 — fix-start 시점 callsite 전수 조회 (code-review-graph 우선, grep fallback) + Pre-commit Gate 4.5 sanity check. Plan D recall consumer. Top triggers: 'fix 시작', '버그 수정', '에러 fix', 'callsite 전수', 'Gate 4.5', 'fix-scope-cache'. Body §Triggers for full list."
---
```

**Body 구조**:

```markdown
> Authoritative source: `harness-share.md` §3.5. On conflict, that wins.

# kzk-fix-scope-expansion

## Triggers

`fix 시작`, `버그 수정`, `에러 fix`, `regression fix`, `callsite 전수`,
`callsite mismatch`, `함수 수정 영향`, `심볼 영향 분석`,
`Gate 4.5`, `fix-scope-cache`, `code-review-graph callsite`,
`fix scope expansion`, `한 곳만 고치고 끝나지 말고`.

## Why

자율실행 cycle 의 5 메타갭 중 *Fix scope 누수* — 한 callsite 만 수정, 호출자/복붙 패턴 누락.
본 skill 은 fix-start 시점 prompt 매칭 → callsite 전수 조회 → system-reminder inject + cache.
Pre-commit Gate 4.5 는 cache 와 git diff 매칭 sanity check 로 commit 시점 누락 차단.

## Fix-start hook (consumer 관계 with Plan D recall)

**진입점**: `install/hooks/fix-scope-trigger.mjs` (UserPromptSubmit hook).
**발동 슬롯**: `regression-recall.mjs` 다음 (D recall 결과가 system-reminder 로 inject 된 후 본 hook 이 callsite list 를 추가 inject — 둘이 같은 prompt 의 시스템-reminder 두 개 슬롯).

**Trigger 룰** (셋 중 하나):
1. 사용자 prompt 에 fix intent 키워드 매칭 (Plan D `regression-recall.mjs` 의 `FIX_KEYWORDS` 재사용 — drift 차단 위해 **import**)
2. 직전 Bash tool 결과가 non-zero exit (PreToolUse hook 미지원 → 본 path 는 manual recall — fix-verify hook 이 self-check inject)
3. 사용자 prompt 에 에러 페이스트 detect (stack trace pattern: `Error:`, `at \w+\.<anonymous>`, `Traceback (most recent call last):`)

**자가-skip guard** (D 와 동일 동사구만):
- 환경변수 `KZK_HARNESS_SELF_IMPROVEMENT=1` OR `KZK_AUTONOMOUS=1` → 즉시 skip
- self-improvement 동사구 grep (D 의 `SELF_IMPROVE_VERBPHRASES` import 재사용) → skip
- 명사 단독 금지 — 일반 prompt false positive 차단

**심볼 추출**:
- backtick code (`\`<symbol>\``)
- camelCase / snake_case 식별자 (4 char+)
- function call pattern (`\w+\(`)
- 여러 매칭 시 빈도 high → low order

**Callsite 조회 (CRG 우선)**:
1. `code-review-graph` 가용 시 → MCP path 시도: `query_graph(pattern="callers_of", target=<symbol>)` + `query_graph(pattern="imports_of", target=<file>)`. MCP unavailable → CLI: `code-review-graph query --file <inferred-file>` + `code-review-graph blast-radius --file <inferred-file>`. inferred-file 없으면 (심볼만 있고 file 모름) → semantic_search_nodes 또는 grep fallback
2. CRG status 가 stale (Last updated SHA 가 HEAD 와 > 10 commit drift) OR Nodes < 50 → **재 build 의무**: `code-review-graph build` 후 query 재시도
3. CRG 미설치 OR build 실패 → grep fallback: `grep -rn "<symbol>\b" --include="*.{ts,tsx,mjs,js,py,sh,md}"` (limit 50 line)

**Result truncation**: 결과 list 200 char cap (D recall reminder size cap 과 sibling). 우선순위 = file 변경 빈도 high (`git log --pretty=format: --name-only -50 | sort | uniq -c | sort -rn`) → low.

**Cache 위치**: `.kzk-harness/fix-scope-cache.json`. atomic write via `install/lib/sidecar-write.mjs::writeAtomic`. schema:
```json
{
  "session_id": "<UUID or timestamp>",
  "user_prompt_first200": "<truncated prompt>",
  "symbols": ["<sym1>", "<sym2>"],
  "callsites": [
    {"file": "src/foo.ts", "line": 42, "symbol": "shouldSkip", "source": "crg|grep"}
  ],
  "captured_at": "<ISO8601>",
  "crg_status": {"available": true|false, "files": <N>, "nodes": <N>, "stale": false}
}
```

cache 는 hook commit 시점에 새 fix-start 마다 overwrite (1 file = current fix scope only — multi-fix 같은 commit 은 last fix wins, 사용자가 의도 시 Gate 4.5 가 commit body 의도 명시 요구).

**inject format**:
```
🔧 [FIX SCOPE EXPANSION] 영향 받을 수 있는 파일/심볼 N건 (Plan D recall 결과 다음 슬롯):
- <file>:<line> <symbol> [crg|grep]
⚠ 한 callsite 만 고치고 끝나지 말고 전수 검토. 누락 의도 시 commit body 에 명시.
[truncated: <M> more callsites — see .kzk-harness/fix-scope-cache.json]
```

매칭 0건 → `{"continue":true, "_info":"no-callsites-detected"}` (silent pass-through).

## Fix-verify hook (manual self-check inject)

**Trigger**: test 통과 직후 (PostToolUse hook 가능 시 — install-global.sh 가 PostToolUse 미지원이면 manual). 본 plan B 는 PostToolUse 등록 *시도* 하되 미지원이면 fallback path: 사용자 prompt 가 "test 통과", "all green", "PR 직전" 매칭 시 UserPromptSubmit hook (fix-scope-trigger 의 sub-mode) 으로 발동.

**동작**: 다음 system-reminder inject:
```
🔍 [FIX VERIFY] 자가 점검:
- test 가 fix-scope-cache.json 의 callsite N 곳 모두 커버하는가?
- 누락 callsite 가 있다면 commit body 에 의도 명시했는가? (Gate 4.5 sanity check)
```

**한계**: PostToolUse 미지원 환경 → manual self-check 의존. behavioral test X.

## Gate 4.5 — Fix Scope Sanity Check (kzk-pre-commit-gate 위임)

위치: 기존 Gate 4 (Playwright) 다음, commit 직전.

**룰**:
1. `.kzk-harness/fix-scope-cache.json` 존재 검사. 부재 → N/A (fix-scope-trigger 비활성 또는 fix intent 아닌 commit). PASS.
2. cache 의 `callsites` list 의 unique file set vs `git diff --cached --name-only` 매칭
3. 미스매치 (cache callsite N 곳 중 git diff 에 M 곳만 포함, M < N) → BLOCK:
   ```
   ❌ Gate 4.5 FAIL: callsite N 곳 중 M 곳만 변경됨 (누락: <file1>, <file2>).
      해결: (a) 누락 callsite 도 수정 후 re-stage, OR
            (b) commit body 에 누락 의도 명시 (예: "fix-scope-skip: <file1> 은 deprecated path, fix 무관")
   ```
4. (b) escape 룰: commit body 에 `fix-scope-skip:` line 발견 → 누락 callsite list 와 매칭. 모든 누락 callsite 가 명시되었으면 PASS.

**구현**: kzk-pre-commit-gate skill SKILL.md 의 `## Gate 4.5` 섹션이 본 룰 명시. 본 skill 은 cache 입력자 + 룰 정의자.

**스킵 조건**:
- doc-only commit (Pre-commit Gate Doc-only 예외와 동일) → N/A
- cache 부재 → N/A
- 명시 escape (`fix-scope-skip:` line in commit body) → 누락 callsite 모두 cover 시 PASS

## 자가-skip guard

D 의 `SELF_IMPROVE_VERBPHRASES` 재사용 (drift 차단 위해 import). 환경변수 우선 (`KZK_HARNESS_SELF_IMPROVEMENT=1` / `KZK_AUTONOMOUS=1`). 명사 단독 매칭 금지.

## Default DISABLED 정책

**B commit 시점**: hook 파일 추가, settings.json 등록 X. `--fix-scope-trigger` flag 호출 안 한 상태.

**자동 enable on main 머지**: 5 plan (A→D→B→C→E) 모두 끝나고 `kzk-pre-merge-sync` step 3 (또는 신규 step 3.5) 가 `install-global.sh --enable-hooks --regression-recall --fix-scope-trigger` 자동 호출 (사용자 confirm 게이트). `--fix-scope-trigger` 도 `--enable-hooks` 의 explicit dependency.

**fail-closed**: install-global.sh exit non-zero / duplicate UserPromptSubmit append 발견 / jq 부재 → merge block.

거부 path: 사용자 confirm 거부 → manual enable 안내. cycle 진행 자체는 영향 X. PR description / milestone commit message 에 명시 의무.

## Rollback (5 level)

| Level | 메커니즘 |
|---|---|
| 단일 plan revert | `git revert <Plan-B-commit-sha>` |
| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=fix-scope-trigger` |
| Skill 즉시 비활성 | `DISABLE_OMC=kzk-fix-scope-expansion` |
| Gate 4.5 만 비활성 (cache 입력 유지) | `kzk-pre-commit-gate` 본문 의 Gate 4.5 섹션 manual skip — commit body 에 `fix-scope-skip: gate-4.5-disabled` 명시. 또는 Pre-commit Gate skill version downgrade |
| Cache 손실 / 오염 | `rm -f .kzk-harness/fix-scope-cache.json` — 다음 fix-start hook 이 새로 작성 |

## Interaction with other kzk-*

- **kzk-regression-memory** (Plan D): D recall hook 다음 슬롯에서 발동 (consumer). 같은 prompt 에 두 system-reminder slot — D 가 과거 fix 기억, B 가 현재 fix 의 callsite 영향. fix-scope-cache 가 D recall reminder 와 함께 inject 되는 사용자 prompt context. **순서 의존**: settings.json `UserPromptSubmit` 배열에서 regression-recall.mjs 가 fix-scope-trigger.mjs 보다 앞 — install-global.sh 의 `enable_hooks()` 호출 순서가 sibling append 라 자동 보장 (D 가 먼저 enable, B 가 나중).
- **kzk-pre-commit-gate**: Gate 4.5 의 룰 정의자 (본 skill) + 적용자 (pre-commit-gate skill). cache 가 입력. 둘 사이 contract = `.kzk-harness/fix-scope-cache.json` schema (본 skill §Cache 위치 행 참조).
- **kzk-codebase-survey**: fix-time trigger 를 본 skill 이 활성. survey skill 의 Step 1 (Scope Expansion) 과 동일 CRG 우선 + grep fallback 패턴 (룰 sync). 본 skill 은 hook path (자동), survey 는 EXPLORER subagent path (수동).
- **kzk-large-task-delegation**: subagent dispatch prompt 에 cache 의 callsite list 도 verbatim inject (size cap 200 char, D recall 과 sibling 룰).
- **kzk-autonomous-boundary**: 자가-skip guard 가 자율 mode 동사구 grep + `KZK_AUTONOMOUS=1` env — 자율 cycle 메인 prompt 자가오염 차단 (D 와 동일 룰).
- **kzk-pre-merge-sync**: step 3 의 `--enable-hooks --regression-recall` 호출에 `--fix-scope-trigger` 추가 (sibling enable). fail-closed 검증도 sibling.
```

### Task 2 — `install/hooks/fix-scope-trigger.mjs` 신규 (~230 LoC)

**File**: `$HOOK_FIXSCOPE`

**Pattern**: `regression-recall.mjs` 와 동일한 stdin/stdout 모양 (UserPromptSubmit hookSpecificOutput). FIX_KEYWORDS 와 SELF_IMPROVE_VERBPHRASES 는 `regression-recall.mjs` 에서 import — drift 차단.

**구조**:

```js
#!/usr/bin/env node
// fix-scope-trigger.mjs — UserPromptSubmit hook for kzk-fix-scope-expansion (Plan B).
// Spec: docs/plans/regression-memory-and-fix-quality-spec.md (rev7, Axis B).
// Default DISABLED at Plan B commit. Auto-enabled by kzk-pre-merge-sync step 3.
// Slot order: regression-recall.mjs (Plan D) → fix-scope-trigger.mjs (Plan B) — D consumer.

import { execSync } from "node:child_process";
import path from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { writeAtomic } from "../lib/sidecar-write.mjs";
import {
  shouldSkip as recallShouldSkip,
  detectFixIntent as recallDetectFixIntent,
  FIX_KEYWORDS,
  SELF_IMPROVE_VERBPHRASES,
} from "./regression-recall.mjs";

const SYMBOL_PATTERNS = [
  /`([A-Za-z_][A-Za-z0-9_]{3,})`/g,                  // backtick
  /\b([a-z][a-zA-Z0-9]{3,})\b/g,                     // camelCase 4+
  /\b([a-z][a-z0-9]+(?:_[a-z0-9]+)+)\b/g,            // snake_case 4+
  /\b([A-Za-z_][A-Za-z0-9_]{3,})\s*\(/g,             // function call
];

const ERROR_PASTE_PATTERNS = [
  /\bError:/i,
  /\bat \w+(?:\.<anonymous>)?\s*\(/,
  /Traceback \(most recent call last\):/,
  /^\s+File ".+", line \d+/m,
];

const RESULT_CAP_CHARS = 200;
const SYMBOL_CAP = 5;
const CALLSITE_CAP = 50;
const CRG_TIMEOUT_MS = 5000;
const CRG_STALE_DRIFT = 10;

function detectErrorPaste(prompt) {
  return ERROR_PASTE_PATTERNS.some((p) => p.test(prompt));
}

function extractSymbols(prompt) {
  const seen = new Set();
  const out = [];
  for (const re of SYMBOL_PATTERNS) {
    let m;
    while ((m = re.exec(prompt)) !== null) {
      const sym = m[1];
      if (!seen.has(sym) && sym.length >= 4) {
        seen.add(sym);
        out.push(sym);
      }
      if (out.length >= SYMBOL_CAP) return out;
    }
  }
  return out;
}

function crgAvailable() {
  try {
    execSync("code-review-graph --version", { stdio: "ignore", timeout: CRG_TIMEOUT_MS });
    return true;
  } catch {
    return false;
  }
}

function crgStatus() {
  try {
    const out = execSync("code-review-graph status", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: CRG_TIMEOUT_MS,
    });
    const files = parseInt((out.match(/Files:\s*(\d+)/) || [])[1] || "0", 10);
    const nodes = parseInt((out.match(/Nodes:\s*(\d+)/) || [])[1] || "0", 10);
    const sha = (out.match(/Built at commit:\s*([a-f0-9]+)/) || [])[1] || null;
    return { available: true, files, nodes, sha };
  } catch {
    return { available: false, files: 0, nodes: 0, sha: null };
  }
}

function isStale(status) {
  if (!status.available || !status.sha) return true;
  if (status.nodes < 50) return true;
  try {
    const drift = parseInt(execSync(`git rev-list --count ${status.sha}..HEAD 2>/dev/null || echo 0`, {
      encoding: "utf8", timeout: CRG_TIMEOUT_MS,
    }).trim() || "0", 10);
    return drift > CRG_STALE_DRIFT;
  } catch {
    return false;
  }
}

function tryCrgBuild() {
  try {
    execSync("code-review-graph build", { stdio: "ignore", timeout: 60000 });
    return true;
  } catch {
    return false;
  }
}

function crgQuerySymbol(symbol) {
  try {
    const out = execSync(`code-review-graph blast-radius --symbol ${JSON.stringify(symbol)} --json 2>/dev/null || code-review-graph query --symbol ${JSON.stringify(symbol)} --json`, {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: CRG_TIMEOUT_MS,
    });
    const parsed = JSON.parse(out.trim());
    return Array.isArray(parsed) ? parsed : (parsed.callsites || parsed.results || []);
  } catch {
    return null;
  }
}

function grepFallback(symbol, repoRoot) {
  try {
    const out = execSync(
      `grep -rn "${symbol}\\b" --include="*.ts" --include="*.tsx" --include="*.mjs" --include="*.js" --include="*.py" --include="*.sh" --include="*.md" ${JSON.stringify(repoRoot)} 2>/dev/null | head -${CALLSITE_CAP}`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: CRG_TIMEOUT_MS },
    );
    return out.split("\n").filter(Boolean).map((line) => {
      const m = line.match(/^([^:]+):(\d+):/);
      return m ? { file: path.relative(repoRoot, m[1]), line: parseInt(m[2], 10), symbol, source: "grep" } : null;
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function rankByChangeFrequency(callsites, repoRoot) {
  try {
    const out = execSync("git log --pretty=format: --name-only -50 | sort | uniq -c | sort -rn", {
      encoding: "utf8", cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"], timeout: CRG_TIMEOUT_MS,
    });
    const freq = new Map();
    for (const line of out.split("\n").filter(Boolean)) {
      const m = line.trim().match(/^(\d+)\s+(.+)$/);
      if (m) freq.set(m[2], parseInt(m[1], 10));
    }
    return [...callsites].sort((a, b) => (freq.get(b.file) || 0) - (freq.get(a.file) || 0));
  } catch {
    return callsites;
  }
}

function buildReminder(callsites, totalCount) {
  if (callsites.length === 0) return null;
  let cumChar = 0;
  const lines = [];
  let truncated = 0;
  for (const c of callsites) {
    const line = `- ${c.file}:${c.line} ${c.symbol} [${c.source}]`;
    if (cumChar + line.length > RESULT_CAP_CHARS) { truncated = callsites.length - lines.length; break; }
    lines.push(line);
    cumChar += line.length;
  }
  const header = `🔧 [FIX SCOPE EXPANSION] 영향 받을 수 있는 파일/심볼 ${totalCount}건 (Plan D recall 결과 다음 슬롯):`;
  const truncatedFooter = truncated > 0 ? `[truncated: ${truncated} more callsites — see .kzk-harness/fix-scope-cache.json]` : "";
  const warn = `⚠ 한 callsite 만 고치고 끝나지 말고 전수 검토. 누락 의도 시 commit body 에 명시.`;
  return [header, ...lines, warn, truncatedFooter].filter(Boolean).join("\n");
}

function writeCache(cachePath, payload) {
  const dir = path.dirname(cachePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeAtomic(cachePath, [payload]);  // single-entry JSONL — using writeAtomic from sidecar-write.mjs (reuse, drift 차단)
}

export {
  detectErrorPaste, extractSymbols, crgAvailable, crgStatus, isStale,
  crgQuerySymbol, grepFallback, rankByChangeFrequency, buildReminder, writeCache,
  RESULT_CAP_CHARS, SYMBOL_CAP, CALLSITE_CAP,
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
    const cachePath = path.join(repoRoot, ".kzk-harness", "fix-scope-cache.json");

    // Self-skip guard (D 와 동일)
    const skip = recallShouldSkip(prompt, process.env);
    if (skip) {
      process.stdout.write(JSON.stringify({ continue: true, _skip: skip }) + "\n");
      return;
    }

    // Trigger: fix intent OR error paste
    const isFix = recallDetectFixIntent(prompt) || detectErrorPaste(prompt);
    if (!isFix) {
      process.stdout.write(JSON.stringify({ continue: true }) + "\n");
      return;
    }

    const symbols = extractSymbols(prompt);
    if (symbols.length === 0) {
      process.stdout.write(JSON.stringify({ continue: true, _info: "no-symbols-detected" }) + "\n");
      return;
    }

    // CRG path with stale auto-rebuild
    let crgWarn = null;
    let status = crgStatus();
    if (!status.available) crgWarn = "crg-not-installed-grep-fallback";
    else if (isStale(status)) {
      const built = tryCrgBuild();
      if (built) status = crgStatus();
      else crgWarn = "crg-stale-rebuild-failed-grep-fallback";
    }

    let allCallsites = [];
    for (const sym of symbols) {
      let hits = null;
      if (status.available && !crgWarn) {
        hits = crgQuerySymbol(sym);
      }
      if (!hits || hits.length === 0) {
        hits = grepFallback(sym, repoRoot);
      }
      allCallsites = allCallsites.concat(hits);
    }

    // dedupe by file:line:symbol
    const seen = new Set();
    const deduped = [];
    for (const c of allCallsites) {
      const k = `${c.file}:${c.line}:${c.symbol}`;
      if (!seen.has(k)) { seen.add(k); deduped.push(c); }
    }
    const ranked = rankByChangeFrequency(deduped, repoRoot).slice(0, CALLSITE_CAP);

    // Cache write (atomic)
    writeCache(cachePath, {
      session_id: process.env.CLAUDE_SESSION_ID || `${Date.now()}`,
      user_prompt_first200: prompt.slice(0, 200),
      symbols,
      callsites: ranked,
      captured_at: new Date().toISOString(),
      crg_status: { available: status.available, files: status.files, nodes: status.nodes, stale: !!crgWarn },
    });

    if (crgWarn) {
      process.stderr.write(`[fix-scope-trigger] ${crgWarn}\n`);
    }

    const reminder = buildReminder(ranked, ranked.length);
    if (reminder) {
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: reminder },
          ...(crgWarn ? { _warn: crgWarn } : {}),
        }) + "\n",
      );
    } else {
      process.stdout.write(JSON.stringify({ continue: true, _info: "no-callsites-detected" }) + "\n");
    }
  });
}
```

**핵심 설계 노트** (executor 가 빠뜨리지 말 것):
- exports 필수: test 가 import. signature `{ detectErrorPaste, extractSymbols, crgAvailable, crgStatus, isStale, crgQuerySymbol, grepFallback, rankByChangeFrequency, buildReminder, writeCache, RESULT_CAP_CHARS, SYMBOL_CAP, CALLSITE_CAP }`
- D 의 `shouldSkip / detectFixIntent / FIX_KEYWORDS / SELF_IMPROVE_VERBPHRASES` 를 **import** — copy/paste 금지 (drift 차단)
- `writeAtomic` 도 D 의 sidecar-write.mjs 에서 import — 자체 atomic write 코드 작성 금지
- timeout 5s — CRG hang 방지
- CRG stale auto-rebuild — Step 0 의 status oracle 룰 따름
- single-entry JSONL via writeAtomic 은 cache file 이 진짜 JSON object 한 줄 — Gate 4.5 가 jq 로 read 가능 (`jq '.callsites' .kzk-harness/fix-scope-cache.json`)
- `chmod +x` 의무

`mkdir -p install/hooks` (이미 존재).

### Task 3 — `install/test/fix-scope-trigger.test.mjs` 신규 (~250 LoC)

**File**: `$TEST_FIXSCOPE`

mock fixture 기반 unit test. 실 CRG 호출 없음 — test 는 fixture file read 로 시뮬.

```js
#!/usr/bin/env node
// fix-scope-trigger.test.mjs — Plan B unit tests.
//
// Tests: self-skip / fix-intent detect / error-paste detect / symbol extract /
//        CRG path (mock) / grep fallback / truncation cap / cache write atomic /
//        D recall consumer slot order / Gate 4.5 sanity check pass-fail / non-fix prompt.

import { readFileSync, writeFileSync, existsSync, rmSync, mkdtempSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import {
  detectErrorPaste, extractSymbols, buildReminder, writeCache,
  RESULT_CAP_CHARS, SYMBOL_CAP, CALLSITE_CAP,
} from "../hooks/fix-scope-trigger.mjs";
import { shouldSkip, detectFixIntent } from "../hooks/regression-recall.mjs";
import { readSidecar } from "../lib/sidecar-write.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_CALLSITES = path.join(__dirname, "fixtures/fix-scope-callsites.sample.json");

let pass = 0, fail = 0;
const errors = [];

function assert(desc, cond) {
  if (cond) { console.log(`  PASS: ${desc}`); pass++; }
  else { console.log(`  FAIL: ${desc}`); fail++; errors.push(desc); }
}

async function assertAsync(desc, fn) {
  try { const ok = await fn(); assert(desc, ok); }
  catch (e) { assert(desc + ` (threw: ${e.message})`, false); }
}

function tempCacheDir() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "fix-scope-test-"));
  mkdirSync(path.join(dir, ".kzk-harness"), { recursive: true });
  return dir;
}

// T1: self-skip reuses Plan D verbphrase guard (drift check)
assert("shouldSkip env KZK_AUTONOMOUS=1 (D import)", shouldSkip("any prompt", { KZK_AUTONOMOUS: "1" }) !== null);
assert("shouldSkip noun-only NOT skipped (D import)", shouldSkip("자가개선 관련 버그 수정", {}) === null);

// T2: fix-intent detect (D import drift check)
assert("detectFixIntent matches '버그' (D import)", detectFixIntent("이 버그 또 났네"));
assert("detectFixIntent no-match on greeting", !detectFixIntent("안녕하세요"));

// T3: error-paste detect (B specific)
assert("detectErrorPaste matches 'Error:'", detectErrorPaste("TypeError: foo is not a function"));
assert("detectErrorPaste matches Python traceback", detectErrorPaste("Traceback (most recent call last):\n  File \"a.py\", line 5"));
assert("detectErrorPaste matches JS stack frame", detectErrorPaste("at Object.<anonymous> (foo.js:42:13)"));
assert("detectErrorPaste no-match on plain text", !detectErrorPaste("just a regular sentence"));

// T4: symbol extract
const syms1 = extractSymbols("`shouldSkip` returns null when not autonomous");
assert("extractSymbols backtick 'shouldSkip'", syms1.includes("shouldSkip"));
const syms2 = extractSymbols("call doSomething() and another_function() in src");
assert("extractSymbols function call 'doSomething'", syms2.includes("doSomething"));
assert("extractSymbols snake_case 'another_function'", syms2.includes("another_function"));
const syms3 = extractSymbols("a b cd ef");  // all <4 char
assert("extractSymbols rejects <4 char", syms3.length === 0);
const syms4 = extractSymbols("foo1 foo2 foo3 foo4 foo5 foo6 foo7");
assert("extractSymbols caps at SYMBOL_CAP=5", syms4.length <= SYMBOL_CAP);

// T5: buildReminder format
const rem1 = buildReminder([
  { file: "src/foo.ts", line: 10, symbol: "shouldSkip", source: "crg" },
  { file: "src/bar.ts", line: 20, symbol: "shouldSkip", source: "grep" },
], 2);
assert("buildReminder header present", rem1.includes("FIX SCOPE EXPANSION"));
assert("buildReminder includes file:line", rem1.includes("src/foo.ts:10"));
assert("buildReminder shows source [crg|grep]", rem1.includes("[crg]") && rem1.includes("[grep]"));
assert("buildReminder empty returns null", buildReminder([], 0) === null);

// T6: truncation cap
const manyCallsites = Array.from({ length: 30 }, (_, i) =>
  ({ file: `src/file${i}.ts`, line: i, symbol: "x", source: "grep" }));
const remTrunc = buildReminder(manyCallsites, 30);
assert("buildReminder truncates beyond RESULT_CAP_CHARS", remTrunc.includes("truncated:"));
assert("buildReminder cumulative length respects cap", remTrunc.length < 1000);

// T7: writeCache via writeAtomic — atomic + readable
await assertAsync("writeCache produces JSONL via writeAtomic", async () => {
  const dir = tempCacheDir();
  try {
    const cachePath = path.join(dir, ".kzk-harness", "fix-scope-cache.json");
    writeCache(cachePath, {
      session_id: "test-1",
      user_prompt_first200: "fix bug in foo",
      symbols: ["foo"],
      callsites: [{ file: "src/a.ts", line: 1, symbol: "foo", source: "grep" }],
      captured_at: new Date().toISOString(),
      crg_status: { available: false, files: 0, nodes: 0, stale: true },
    });
    const lines = readSidecar(cachePath);
    return lines.length === 1 && lines[0].symbols[0] === "foo" && lines[0].callsites.length === 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// T8: cache schema validation (required fields)
await assertAsync("cache JSONL has required schema fields", async () => {
  const dir = tempCacheDir();
  try {
    const cachePath = path.join(dir, ".kzk-harness", "fix-scope-cache.json");
    writeCache(cachePath, {
      session_id: "test-2", user_prompt_first200: "p", symbols: ["x"],
      callsites: [], captured_at: "2026-05-04T00:00:00Z",
      crg_status: { available: true, files: 100, nodes: 500, stale: false },
    });
    const entry = readSidecar(cachePath)[0];
    return ["session_id", "user_prompt_first200", "symbols", "callsites", "captured_at", "crg_status"].every((k) => k in entry);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// T9: D recall consumer slot order — settings.json append order
//     (룰 검증만 — 실 install-global.sh 호출은 별 test_install 책임)
assert("FIX_KEYWORDS imported from D (drift sentinel)", detectFixIntent("fix bug"));

// T10: fixture file exists with expected sample
await assertAsync("fixture file is valid JSON with samples", async () => {
  if (!existsSync(FIXTURE_CALLSITES)) return false;
  const txt = readFileSync(FIXTURE_CALLSITES, "utf8");
  const parsed = JSON.parse(txt.split("\n").filter((l) => !l.startsWith("#")).join("\n"));
  return "crg_response_sample" in parsed && "grep_response_sample" in parsed;
});

// T11: Gate 4.5 sanity check — cache callsites vs git diff list (mock)
//     (룰 *기록* 검증 — 실 git diff 통합은 manual cycle 검증)
function gate45SanityCheck(cacheFiles, gitDiffFiles, commitBody) {
  const cacheSet = new Set(cacheFiles);
  const diffSet = new Set(gitDiffFiles);
  const missing = [...cacheSet].filter((f) => !diffSet.has(f));
  if (missing.length === 0) return { pass: true };
  const skipMatch = (commitBody || "").match(/fix-scope-skip:\s*(.+)/);
  if (skipMatch) {
    const skipped = skipMatch[1].split(/[\s,]+/).filter(Boolean);
    const stillMissing = missing.filter((f) => !skipped.some((s) => f.includes(s)));
    return { pass: stillMissing.length === 0, missing: stillMissing };
  }
  return { pass: false, missing };
}
const g1 = gate45SanityCheck(["a.ts", "b.ts"], ["a.ts", "b.ts"], "");
assert("Gate 4.5 PASS when all callsites in diff", g1.pass);
const g2 = gate45SanityCheck(["a.ts", "b.ts"], ["a.ts"], "");
assert("Gate 4.5 FAIL when callsite missing without skip", !g2.pass && g2.missing.includes("b.ts"));
const g3 = gate45SanityCheck(["a.ts", "b.ts"], ["a.ts"], "fix-scope-skip: b.ts deprecated");
assert("Gate 4.5 PASS when missing covered by fix-scope-skip", g3.pass);

// T12: non-fix prompt → no symbols extracted needed
const symsNoFix = extractSymbols("hello world how are you today");
assert("non-fix prompt extracts no useful symbols (or filtered)", symsNoFix.length <= 3);

console.log(`\n${pass} pass, ${fail} fail`);
if (fail > 0) {
  console.log("Errors:");
  errors.forEach((e) => console.log(`  - ${e}`));
  process.exit(1);
}
process.exit(0);
```

**Test 한계** (Plan B 본문에 명시):
- `execSync(code-review-graph ...)` 미실행 — `crgQuerySymbol()` 와 `crgStatus()` 의 mock 화 안 함. 실 CRG 통합은 manual cycle 검증.
- settings.json 실제 등록은 `enable_hooks` test (Task 5) 가 별도 책임.
- Gate 4.5 sanity check 는 *룰 시뮬* (T11) — 실 pre-commit-gate hook 통합은 manual cycle 검증.
- behavioral test 아님 (사용자 prompt 흐름 시뮬은 stdout/stdin 직접 호출 X).

`chmod +x` 의무.

### Task 4 — fixture 파일 신규

**File**: `$FIXTURE_CALLSITES`

`mkdir -p install/test/fixtures` (이미 존재 — Plan D Task 7).

```json
# illustrative only — Plan B Step 0 actual code-review-graph output wins on drift.
# Re-capture rule (좁힘): CRG schema, CLI signature, fixture format 변경 시만 재캡처.
{
  "crg_response_sample": [
    {"file": "install/hooks/regression-recall.mjs", "line": 32, "symbol": "shouldSkip", "source": "crg"},
    {"file": "install/test/regression-recall.test.mjs", "line": 765, "symbol": "shouldSkip", "source": "crg"}
  ],
  "grep_response_sample": [
    "install/hooks/regression-recall.mjs:32:function shouldSkip(prompt, env) {",
    "install/hooks/fix-scope-trigger.mjs:185:    const skip = recallShouldSkip(prompt, process.env);",
    "install/test/regression-recall.test.mjs:765:assert(\"shouldSkip env KZK_HARNESS_SELF_IMPROVEMENT=1\","
  ],
  "expected_dedup_count": 3,
  "expected_top_symbol": "shouldSkip"
}
```

JSON 비표준 (`#` comment line). test 가 read 시 comment line 제거 후 parse — T10 처리 명시. git tracked.

### Task 5 — `install/test/run-tests.sh` 갱신 (~15 LoC)

**File**: `$TEST_RUN`

**신규 함수 정의** (Plan D 의 `test_regression_recall` 다음, `# Run all tests` 직전):

```bash
# ---------------------------------------------------------------------------
# Plan B — fix-scope-trigger.test.mjs
# ---------------------------------------------------------------------------
test_fix_scope_trigger() {
  printf '\n[test_fix_scope_trigger]\n'
  if node "$REPO_ROOT/install/test/fix-scope-trigger.test.mjs"; then
    printf '  PASS: fix-scope-trigger.test.mjs\n'
    PASS=$((PASS + 1))
  else
    printf '  FAIL: fix-scope-trigger.test.mjs\n'
    FAIL=$((FAIL + 1))
    ERRORS+=("test_fix_scope_trigger")
  fi
}
```

**호출 추가** (`test_regression_recall` 다음 줄):

```bash
test_fix_scope_trigger
```

**기존 skill count assertion 갱신** — 기존 `test_skill_files_landed` 내 `for skill in <list>` 루프 또는 marker block row count assertion 이 14/15 가 박혀있으면 16 으로 update. 또한 `test_claude_md_marker` 에서 row count 검증 시 16 row 확인 (Plan D 가 15 로 update 했을 것 → Plan B 가 16 으로).

**구체적 갱신 위치 식별 의무**: executor 는 commit 전에 `grep -n "14 kzk-\|15 kzk-\|All 14\|All 15\|16 kzk-\|All 16" install/test/run-tests.sh` 실행 → 모든 hit 16 으로 update. 누락 시 test FAIL.

### Task 6 — `install/install-global.sh` `enable_hooks()` 확장 (~50 LoC) — D 의 `--regression-recall` 패턴 그대로

**File**: `$INSTALL_GLOBAL`

**변경 1 — `parse_flags()` 의 `DO_REGRESSION_RECALL=0` 옆에 `DO_FIX_SCOPE_TRIGGER=0` 추가** (line 59 근처). usage block 에 한 줄 추가 (line 82 근처): `--fix-scope-trigger              Also wire fix-scope-trigger.mjs (implies --enable-hooks)`. arg parse case 에 분기 추가 (line 122 `--regression-recall)` 다음):

```bash
      --fix-scope-trigger)
        DO_FIX_SCOPE_TRIGGER=1
        shift ;;
```

**변경 2 — `enable_hooks()` 본문 확장** (line 627 부근. D 의 `--regression-recall` 블록 다음에 sibling 블록 추가):

```bash
  # Plan B: fix-scope-trigger hook + cache via sidecar-write.mjs (이미 D 가 copy)
  if [ "${DO_FIX_SCOPE_TRIGGER:-0}" -eq 1 ]; then
    cp "$src/install/hooks/fix-scope-trigger.mjs" \
      "$HOME/.claude/skills/.kzk-harness-shared/hooks/"
    # sidecar-write.mjs 는 D 가 이미 copy — `--fix-scope-trigger` 단독 enable 시도면 D 의존
    if [ ! -f "$HOME/.claude/skills/.kzk-harness-shared/lib/sidecar-write.mjs" ]; then
      cp "$src/install/lib/sidecar-write.mjs" \
        "$HOME/.claude/skills/.kzk-harness-shared/lib/"
    fi
  fi
```

**변경 3 — settings.json idempotent jq append 블록 추가** (D 의 `regression-recall` 블록 다음):

```bash
  # Plan B: fix-scope-trigger idempotent append (slot order: D first, B second — sibling order matters)
  if [ "${DO_FIX_SCOPE_TRIGGER:-0}" -eq 1 ]; then
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
```

**변경 4 — `--fix-scope-trigger` 가 `--enable-hooks` 자동 enable** (line 762 부근의 D 패턴 옆):

```bash
  # Plan B: --fix-scope-trigger 는 --enable-hooks 의 explicit dependency
  if [ "${DO_FIX_SCOPE_TRIGGER:-0}" -eq 1 ] && [ "${ENABLE_HOOKS:-0}" -eq 0 ]; then
    emit "  --fix-scope-trigger implies --enable-hooks (explicit dependency)"
    ENABLE_HOOKS=1
  fi
```

**변경 5 — fail-closed 검증 통합** — 기존 D 의 fail-closed 호출 (line 769 부근) 이 이미 `enable_hooks` 의 return code 검사. Plan B 의 sibling 블록도 같은 return 1 path → 자동 통합. 별도 변경 X.

### Task 7 — `install/dependencies.sh` 강화 (~15 LoC)

**File**: `$DEPS`

기존 `code-review-graph` entry (있으면) 의 SUMMARY message 강화. 없으면 신규 entry 추가. `install/dependencies.md` 와 sync 의무 (사용자 보이는 dependencies 표 갱신):

```bash
# ---------------------------------------------------------------------------
# 1.5. code-review-graph — used by kzk-codebase-survey + kzk-fix-scope-expansion (Plan B)
# ---------------------------------------------------------------------------
# (기존 entry 가 있으면 record line 만 강화)
if command -v code-review-graph >/dev/null 2>&1; then
  record "code-review-graph: already installed. Used by kzk-codebase-survey Step 1 + kzk-fix-scope-expansion fix-start hook (Plan B)."
else
  emit "[1.5] code-review-graph not found — attempting install..."
  installed=0
  if command -v python3 >/dev/null 2>&1 && python3 -m pip --version >/dev/null 2>&1; then
    if python3 -m pip install --user code-review-graph 2>/tmp/kzk-crg-pip.log; then
      installed=1
      record "code-review-graph: installed via 'pip install --user'"
    fi
  fi
  if [ "$installed" -eq 0 ] && command -v pipx >/dev/null 2>&1; then
    if pipx install code-review-graph 2>/tmp/kzk-crg-pipx.log; then
      installed=1
      record "code-review-graph: installed via 'pipx install'"
    fi
  fi
  if [ "$installed" -eq 0 ]; then
    printf 'WARN: code-review-graph install failed — kzk-fix-scope-expansion will fall back to grep, kzk-codebase-survey Step 1 will use grep fallback.\n' >&2
    record "code-review-graph: NOT INSTALLED. kzk-fix-scope-expansion + kzk-codebase-survey will use grep fallback."
  fi
fi
```

**actual package name 검증**: Plan B Step 0 에서 `python3 -m pip search code-review-graph` (또는 `pip show code-review-graph`) 로 확인. 실 package 가 다른 이름이면 수정.

**`install/dependencies.md` sync**: 기존 entry 의 "Used by" 행에 `kzk-fix-scope-expansion (Plan B fix-start hook + Gate 4.5 callsite expansion)` 추가.

### Task 8 — `kzk-pre-commit-gate/SKILL.md` Gate 4.5 추가 (~50 LoC)

**File**: `$SKILL_PCG`

**Frontmatter 갱신**: `version: 1.2.0` → `version: 1.3.0`. description 끝에 추가: `, 'Gate 4.5', 'fix-scope-cache', 'callsite mismatch'`.

**Triggers 갱신** (line 13): 끝에 추가:
```
`Gate 4.5`, `fix-scope-cache`, `callsite mismatch`, `fix-scope-skip`.
```

**신규 section 추가** — 기존 `## Gate 4 — UI/CSS visual verification (Playwright MCP)` 다음 (line 65 직후), `## Doc-only commit exception` 직전:

```markdown
## Gate 4.5 — Fix Scope Sanity Check (Plan B)

`.kzk-harness/fix-scope-cache.json` (kzk-fix-scope-expansion fix-start hook 이 작성) 가 존재하면 callsite list 와 `git diff --cached --name-only` 매칭 검사. cache 부재 → N/A (fix-scope-trigger 비활성 또는 fix intent 아닌 commit).

룰:
1. `cache_files = jq -r '.callsites[].file' .kzk-harness/fix-scope-cache.json | sort -u`
2. `diff_files = git diff --cached --name-only | sort -u`
3. `missing = cache_files \ diff_files`
4. `missing` 가 0건 → PASS
5. `missing` 가 1건 이상 → commit body 검사:
   - body 에 `fix-scope-skip:` line 발견 + 모든 missing callsite 가 그 line 에 명시 → PASS
   - 그 외 → BLOCK (commit fails):
     ```
     ❌ Gate 4.5 FAIL: callsite N 곳 중 M 곳만 변경됨.
        누락: <missing-files>
        해결: (a) 누락 callsite 수정 후 re-stage, OR
              (b) commit body 에 의도 명시: "fix-scope-skip: <file1>,<file2> reason"
     ```

**스킵 조건**: doc-only commit (Doc-only commit exception 룰과 동일) → cache 무관 자동 N/A.

**자율 mode 추가 룰**: 자율 cycle 의 BLOCK 발생 → 즉시 halt + user-queue entry: `Q-GATE-4.5-FAIL — fix-scope cache vs diff 미스매치, 사용자 결정 필요`.

본 Gate 의 룰 정의자: `kzk-fix-scope-expansion` skill (Plan B). 본 skill 은 적용자.
```

**§Failure protocol 갱신** — 끝에 추가:

```
- Gate 4.5 BLOCK 시 자율 mode → user-queue entry `Q-GATE-4.5-FAIL`. interactive mode → 사용자에게 surface, halt X.
```

**§Interaction with other kzk-* 갱신** — 끝에 추가:

```
- **kzk-fix-scope-expansion** (Plan B): Gate 4.5 의 룰 정의자. cache 파일 (`.kzk-harness/fix-scope-cache.json`) 의 schema 와 sanity check 룰 정의. 본 skill 은 cache 입력자 + Gate 4.5 의 적용자.
```

### Task 9 — `kzk-codebase-survey/SKILL.md` fix-time trigger 추가 (~10 LoC)

**File**: `$SKILL_CS`

**Frontmatter 갱신**: `version: 1.5.0` → `version: 1.6.0`. description 끝에 추가: `, 'fix 시작', 'fix-time callsite expansion'`.

**Triggers 갱신** (line 13): 끝에 추가 (현재 마지막 항목 `ralph로 체크` 다음):
```
, `fix 시작`, `버그 수정`, `에러 fix`, `regression fix`, `callsite 전수`, `함수 수정 영향`, `심볼 영향 분석`.
```

**§Run before 갱신** — 기존 list 끝에 추가:

```
, fix-time callsite audit (kzk-fix-scope-expansion 의 manual path — hook 비활성 환경 또는 hook 결과 보강 필요 시)
```

**§Interaction with other kzk-* 갱신** — 끝에 추가:

```
- **kzk-fix-scope-expansion** (Plan B): hook path 는 fix-scope-trigger.mjs 가 자동 (UserPromptSubmit 시점), survey 는 EXPLORER subagent path (수동, fix-start 시 보강용). CRG 우선 + grep fallback 패턴은 Step 1 과 동일 룰 — drift 차단 위해 본 skill 의 룰이 source of truth.
```

### Task 10 — `kzk-regression-memory/SKILL.md` cross-ref 보강 (~5 LoC) — Interaction-only patch (version bump X)

**File**: `$SKILL_RM`

**Frontmatter 변경 없음** — 본 변경은 cross-ref 한 항목의 1줄 → 3줄 보강만. 기능 변경 X (cosmetic doc patch).

**§Interaction with other kzk-* 갱신** — 기존 `kzk-fix-scope-expansion (Plan B): D recall 결과를 consumer 로 read — fix-start hook 이 D 다음에 발동.` 항목 (line 163) 을:

```
- **kzk-fix-scope-expansion** (Plan B): D recall 결과를 consumer 로 read — fix-start hook 이 D 다음 슬롯에 발동 (settings.json `UserPromptSubmit` 배열에서 regression-recall.mjs → fix-scope-trigger.mjs 순). 같은 prompt 의 두 system-reminder 슬롯 — D 가 과거 fix 기억, B 가 현재 fix 의 callsite 영향 list. fix-scope-cache (`.kzk-harness/fix-scope-cache.json`) 가 D recall reminder 와 함께 inject 되는 사용자 prompt context. Pre-commit Gate 4.5 의 cache 입력자.
```

### Task 11 — `kzk-large-task-delegation/SKILL.md` cache inject 룰 추가 (~10 LoC)

**File**: `$SKILL_LTD`

**§Subagent prompt requirements 의 Recall 결과 inject 룰** (Plan D Task 13 가 추가한 항목) 다음 줄에 추가:

```
- **fix-scope cache inject** (Plan B): subagent dispatch 시점에 `.kzk-harness/fix-scope-cache.json` 존재하면 cache 의 callsites list 도 dispatch prompt 에 verbatim inject. **size cap 200 char** — D recall reminder 와 sibling 룰. callsite 우선순위 = file 변경 빈도 high → low (cache 의 ranking 그대로). 200 char 초과 시 truncate + warning footer (`[truncated: <N> more callsites — see .kzk-harness/fix-scope-cache.json]`). subagent 가 fix 작업 시 callsite list read.
```

**§Interaction with other kzk-* 갱신** — 끝에 추가:

```
- **kzk-fix-scope-expansion** (Plan B): cache 파일 의 callsites list 를 subagent dispatch prompt 에 inject (size cap 200 char, D recall reminder 와 sibling). fix subagent 도 callsite list read.
```

### Task 12 — `harness-share.md` §3.5 신규 (~80 LoC)

**File**: `$SHARE`

**위치 결정**: 기존 §3 (Pre-commit Gate) 와 §4 (Subagent-Driven Dispatch) 사이에 §3.5 삽입 (Pre-commit Gate 와 sibling 의미). 또는 §29 다음 §30 으로 추가 (D 와 sibling). **본 plan 채택**: §3.5 (Pre-commit Gate 룰 가까이).

기존 §3 끝의 마지막 `### Token migration — shadcn + Tailwind v4 bridge requirement` (line 212) 다음, `## 4. Subagent-Driven Dispatch` (line 229) 직전에 신규 section 삽입:

```markdown
---

## 3.5 Fix Scope Expansion (kzk-fix-scope-expansion, Plan B)

자율실행 cycle 의 5 메타갭 중 *Fix scope 누수* 차단. fix-start 시점 prompt 매칭 → callsite 전수 조회 → system-reminder inject + cache. Pre-commit Gate 4.5 가 cache vs git diff 매칭 sanity check.

### Fix-start hook (consumer 관계 with §29 Plan D regression-recall)

- 진입점: `install/hooks/fix-scope-trigger.mjs` (UserPromptSubmit hook)
- 발동 슬롯: `regression-recall.mjs` 다음 (D recall 결과 system-reminder inject 후 본 hook 이 callsite list 추가 inject — 같은 prompt 의 두 reminder 슬롯)
- Trigger: fix intent 키워드 (D 의 `FIX_KEYWORDS` import) OR 에러 페이스트 detect (`Error:`, JS stack frame, Python traceback) OR 직전 Bash non-zero exit (manual)
- 자가-skip guard: D 와 동일 동사구만 (환경변수 우선, 명사 단독 매칭 금지)
- 심볼 추출: backtick / camelCase / snake_case / func() pattern. 4 char+ filter. SYMBOL_CAP=5
- Callsite 조회: **CRG 우선** (`code-review-graph` `query_graph(callers_of)` / CLI `query` + `blast-radius`) → CRG 미설치 OR stale (Nodes < 50 OR drift > 10 commit) → grep fallback (`grep -rn "<symbol>\b"`). CRG stale 시 자동 `code-review-graph build` 시도, 실패 시 grep
- Result truncation: 200 char cap (D recall reminder size cap 과 sibling). 우선순위 = file 변경 빈도 high (`git log --name-only` count) → low
- Cache: `.kzk-harness/fix-scope-cache.json`. atomic write via `install/lib/sidecar-write.mjs::writeAtomic` (D utility 재사용 — drift 차단). schema = `{session_id, user_prompt_first200, symbols, callsites[], captured_at, crg_status}`. 1 entry/fix (overwrite, last fix wins)
- inject format: `🔧 [FIX SCOPE EXPANSION] 영향 받을 수 있는 파일/심볼 N건 (Plan D recall 결과 다음 슬롯): - <file>:<line> <symbol> [crg|grep] ⚠ 한 callsite 만 고치고 끝나지 말고 전수 검토.`

### Fix-verify hook (manual self-check)

- Trigger: PostToolUse hook 가능 시 (test 통과 직후) — install-global.sh PostToolUse 미지원 환경 → manual fallback path (사용자 prompt 의 "test 통과", "all green", "PR 직전" 매칭 시 UserPromptSubmit hook 의 sub-mode)
- 동작: `🔍 [FIX VERIFY] 자가 점검: test 가 callsite N 곳 모두 커버하는가? 누락 시 commit body 에 의도 명시했는가? (Gate 4.5)`
- 한계: behavioral test X. PostToolUse 미지원 환경 = manual self-check 의존

### Pre-commit Gate 4.5 — Fix Scope Sanity Check

- 위치: 기존 Gate 4 (Playwright) 다음, commit 직전
- 룰:
  1. cache 부재 → N/A (PASS)
  2. cache 의 callsite files vs `git diff --cached --name-only` 매칭
  3. 미스매치 → BLOCK. commit body 에 `fix-scope-skip: <file> reason` 명시 시 PASS escape
- 자율 mode BLOCK → halt + `Q-GATE-4.5-FAIL` user-queue entry. interactive mode → surface to user, halt X
- 적용자: `kzk-pre-commit-gate` skill §Gate 4.5

### CRG dependency

- `code-review-graph` 우선 (`install/dependencies.sh` 가 pip --user → pipx fallback 으로 auto-install)
- 미설치 / build 실패 → grep fallback (silent degradation 금지 — stderr WARN + `_warn:"crg-not-installed-grep-fallback"` structured reason)
- CRG status oracle 룰 (kzk-codebase-survey §Step 0.5 와 sync) — `Files / Nodes / Edges / Last updated` 가 진실. build log alone 신뢰 X

### Default DISABLED at B commit, 자동 enable on main 머지 (5 plan 후, fail-closed)

- B plan commit 시점: hook 파일 추가 but settings.json 등록 X
- 5 plan (A→D→B→C→E) 끝나고 `kzk-pre-merge-sync` step 3 가 `install-global.sh --enable-hooks --regression-recall --fix-scope-trigger` 자동 호출 (사용자 confirm 게이트). `--fix-scope-trigger` 도 `--enable-hooks` 의 explicit dependency
- fail-closed: install-global.sh exit non-zero / duplicate entry / jq 부재 → merge block (D 의 fail-closed 와 sibling)

### Rollback (5 level)

| Level | 메커니즘 |
|---|---|
| 단일 plan revert | `git revert <Plan-B-commit-sha>` |
| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=fix-scope-trigger` |
| Skill 즉시 비활성 | `DISABLE_OMC=kzk-fix-scope-expansion` |
| Gate 4.5 만 비활성 | commit body 에 `fix-scope-skip: gate-4.5-disabled` 명시 (per-commit escape) |
| Cache 손실 / 오염 | `rm -f .kzk-harness/fix-scope-cache.json` — 다음 fix-start 가 새로 작성 |

### Cross-reference

- §3 Pre-commit Gate — Gate 4.5 적용 위치
- §29 Plan D Regression Memory — 본 hook 의 producer (recall 결과 → callsite expansion consumer)
- §26 kzk-codebase-survey — fix-time trigger 룰 sync (CRG 우선 + grep fallback)
```

### Task 13 — `CLAUDE.md` + `README.md` skill count sync (~8 LoC, 4 sync points)

**Files**: `$CLAUDE_MD`, `$README`

Plan D 가 14→15 로 update 했을 것 (D commit 직후 상태). Plan B 가 15→16 으로 update.

**`$CLAUDE_MD` 변경**:
1. **Line 3**: `It contains 15 \`kzk-*\` skills` → `It contains 16 \`kzk-*\` skills`
2. **"All N skills" line** (현재 `All 15 skills are active`): `All 15 skills are active` → `All 16 skills are active`
3. **Skills table** (line 9 부근, 표 마지막 행에 추가):
   ```
   | `kzk-fix-scope-expansion` | fix 시작, 버그 수정, 에러 fix, callsite 전수, Gate 4.5, fix-scope-cache, callsite mismatch |
   ```

**`$README` 변경**:
1. **Line 3**: `Installs 15 \`kzk-*\` skills` → `Installs 16 \`kzk-*\` skills`
2. **Install command skill count** (`README.md` 의 install command 본문 또는 verify 단계 — Plan D 가 15 로 update 했으면 16 으로): grep `15 kzk-\|All 15` → 16 으로

**executor 의무**: 갱신 전 `grep -n "14 kzk-\|15 kzk-\|All 14\|All 15\|16 kzk-\|All 16" CLAUDE.md README.md install/test/run-tests.sh` 로 모든 skill count 위치 식별. 누락 시 run-tests.sh PASS 안 함.

### Task 14 — atomic commit

`kzk-pre-commit-gate` 통과 (Gate 0 / 1 / 1.5 / 2 N/A / 3 / 4 N/A. Gate 4.5 — 본 plan 이 도입 — 본 commit 자체는 cache 부재라 N/A):

- Gate 0: 신규 skill 디렉토리 (`skills/kzk-fix-scope-expansion/`) → AGENTS.md hierarchy 가 본 repo 에 없으면 N/A. 있으면 의무 update
- Gate 1: ai-slop scan
- Gate 1.5: secrets scan
- Gate 2: build N/A (markdown + mjs only — npm run build 가 본 repo 에 정의되어 있으면 실행, 없으면 N/A)
- Gate 3: `bash install/test/run-tests.sh` PASS 의무
- Gate 4: N/A (non-UI)
- Gate 4.5: cache 부재 → N/A

commit message:
```
feat(skill): kzk-fix-scope-expansion + Gate 4.5 — fix scope expansion (Plan B)

Fix-start hook (UserPromptSubmit, Plan D recall consumer slot):
  - FIX_KEYWORDS / SELF_IMPROVE_VERBPHRASES import from regression-recall.mjs (drift 차단)
  - 심볼 추출 + CRG 우선 (callers_of, blast-radius) → grep fallback
  - cache .kzk-harness/fix-scope-cache.json (atomic via writeAtomic)
  - CRG stale 자동 build, 미설치 시 stderr WARN + _warn structured reason

Gate 4.5 (kzk-pre-commit-gate v1.3):
  - cache callsite files vs git diff --cached --name-only 매칭
  - 미스매치 → BLOCK (fix-scope-skip: escape)
  - 자율 mode BLOCK → Q-GATE-4.5-FAIL user-queue

kzk-codebase-survey v1.6: fix-time trigger phrases 추가.
kzk-regression-memory: Interaction cross-ref 보강 (cosmetic, version bump X).
kzk-large-task-delegation: subagent dispatch cache inject 룰 (200 char cap, D sibling).
harness-share.md §3.5 신규.
install/test/fix-scope-trigger.test.mjs (12 cases) + fixture.
install/install-global.sh: --fix-scope-trigger flag (D --regression-recall sibling).
install/dependencies.sh: code-review-graph entry 강화.
CLAUDE.md / README.md: 15→16 skill count (4 sync points).

Spec: docs/plans/regression-memory-and-fix-quality-spec.md (rev7, Axis B).
Plan: docs/plans/plan-B-fix-scope-expansion.md (rev1, frozen).
Default DISABLED — auto-enabled by kzk-pre-merge-sync step 3 after 5 plan.
```

## Test 전략 (한계 명시)

| 항목 | 검증 방식 | 한계 |
|---|---|---|
| Self-skip guard (D import) | `shouldSkip` 호출 result | D import drift 만 검증. 동사구 grep 자체는 D test 가 검증 |
| Fix-intent detect | `detectFixIntent` 호출 result | D import drift 만 |
| Error-paste detect (B 신규) | regex pattern test | 4 sample (Error/traceback/JS frame/plain) — 실 stack trace 다양성 부족 |
| Symbol extract | `extractSymbols` 호출 | regex 기반. AST parsing 아님 — false positive 가능 (영문 주석 등) |
| CRG path | mock fixture | execSync(code-review-graph) 실행 안 함. 실 통합은 manual cycle |
| Grep fallback | mock fixture | execSync(grep) 실행 안 함. shell escape edge case 검증 부족 |
| Truncation cap | `buildReminder(many)` | 룰 검증만. 실 사용 시 cumulative length 정확성 manual |
| Cache atomic write | tempdir + writeAtomic + readSidecar | 동시성 검증은 D 의 atomic write test 가 보강 |
| D recall consumer 슬롯 순서 | 룰 *기록* 검증 (settings.json append 순서는 install-global.sh 책임) | 실 hook 실행 순서는 manual cycle 검증 |
| Gate 4.5 sanity check | mock function `gate45SanityCheck` | 룰 *시뮬* 만. 실 pre-commit-gate hook 통합은 manual cycle 검증 |
| Non-fix prompt → no symbols | `extractSymbols` empty | edge case 일부만 |
| CLAUDE.md / README.md count sync | grep assertion (executor 책임) | 4 sync points 누락 시 run-tests.sh FAIL |

**전반 한계**: behavioral test 아님. 룰 *기록* + mock fixture 검증. 실제 사용자 prompt 흐름 (UserPromptSubmit 트리거 + system-reminder inject + subagent dispatch 의 cache read + Gate 4.5 BLOCK behavior) 은 manual cycle 검증 의존. spec rev7 §Test 전략 한계 명시 룰 따름.

## Rollback (5 level — Plan B 본문 §Rollback 와 sibling)

| Level | 메커니즘 |
|---|---|
| 단일 plan revert | `git revert <Plan-B-commit-sha>` |
| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=fix-scope-trigger` |
| Skill 즉시 비활성 | `DISABLE_OMC=kzk-fix-scope-expansion` |
| Gate 4.5 만 비활성 | commit body 에 `fix-scope-skip: gate-4.5-disabled` 명시 (per-commit escape) — kzk-pre-commit-gate skill version downgrade 도 옵션 |
| Cache 손실 / 오염 | `rm -f .kzk-harness/fix-scope-cache.json` — 다음 fix-start 가 새로 작성 |

## Out of scope (다음 Plan 으로 위임)

- **Plan C** — fresh-agent verifier Stage 3 + Pre-commit Gate 5. Gate 4.5 와 Gate 5 는 sibling — Gate 4.5 가 callsite scope 검증, Gate 5 가 verifier subagent 검증
- **Plan E** — production code-first + 멱등성. fix-scope hook 이 production access trigger 시에도 발동하는 cross-axis 통합은 Plan E 의 책임 (spec rev7 Axis E §Cross-axis 통합 참조)
- **Behavioral test** (실 hook 실행 + system-reminder inject 검증) — spec rev7 Non-goals (manual cycle 검증 의존)
- **Fix-verify hook 의 PostToolUse 등록** — install-global.sh 가 PostToolUse 미지원이면 본 plan 은 manual fallback 만. 실 PostToolUse 지원 추가는 별도 plan

## Codex review 의무

본 plan draft 는 frozen 전 codex CLI consult (stdin path) → critic opus fallback. spec rev7 §메타 룰 따름.

```bash
printf '%s' "$(cat docs/plans/plan-B-fix-scope-expansion.md)" | codex exec - -s read-only -c '...' --json | jq ...
```

2회 실패 시 critic opus fallback. 5 plan 중 최소 2개 codex CLI 성공 목표. Plan D 가 codex 성공이면 Plan B 는 critic opus 도 OK — but codex 시도 의무.

verdict file 저장: `docs/research/codex-reviews/plan-B-fix-scope-expansion-codex-review.md` 또는 `.../plan-B-fix-scope-expansion-critic-review.md`. REVISE / SHIP 분기. SHIP → frozen. REVISE → cycle 1 답 통합 → rev2 (1 plan = 1 round 룰 적용 — `kzk-spec-and-review §Cost/cadence`).

## Open questions (executor 진행 중 발견 시 user-queue append)

- `Q-PLAN-B-PCG-VERSION` — kzk-pre-commit-gate v1.3 으로 bump 시 기존 harness-share.md §3 의 "6 단계" wording 이 "7 단계 (Gate 0/1/1.5/2/3/4/4.5)" 로 update 필요한가? 본 plan 은 §3.5 신규 section 으로 분리 → §3 wording 그대로 유지 채택. executor 가 §3 본문에 Gate 4.5 행 추가 여부 결정 시 user-queue 등록.
- `Q-PLAN-B-FIX-VERIFY-POSTTOOLUSE` — install-global.sh 가 PostToolUse hook event 지원하는지 Step 0 에서 확인. 미지원 → fix-verify hook 은 manual fallback 만. 지원 → 별도 task 추가 검토 (out of scope, 별 plan).
- `Q-PLAN-B-CACHE-MULTI-FIX` — same commit 에 multi-fix 수행 시 cache 가 last fix only overwrite — Gate 4.5 가 마지막 fix 만 검사. multi-fix list 보존 (append) 룰 추가 검토 필요? 본 plan rev1 은 last fix wins 채택 (단순성 우선). REVISE 시 검토.
