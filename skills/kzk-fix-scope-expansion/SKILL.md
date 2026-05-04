---
name: kzk-fix-scope-expansion
version: 1.0.0
description: "Fix scope expansion — fix 시작 시 함수/심볼 callsite 전수 조회 (CRG 우선 + grep fallback) + Gate 4.5 sanity check. Top triggers: 'fix 시작', 'callsite 전수', 'Gate 4.5', 'fix-scope-cache', 'callsite mismatch', 'KZK_GATE45_SKIP'. Body §Triggers for full list."
---

> Authoritative source: harness-share.md §3.5. On conflict, that wins.

# kzk-fix-scope-expansion

## Triggers

`fix 시작`, `callsite 전수`, `Gate 4.5`, `fix-scope-cache`, `callsite mismatch`, `KZK_GATE45_SKIP`,
`버그 수정`, `에러 fix`, `regression fix`, `함수 수정 영향`, `fix-start`, `fix scope`, `한 callsite`,
`호출자 전수`, `callsite 누락`, `fix 범위`, `fix scope 누수`.

## Why

AI 자율실행 cycle 의 **Fix scope 누수** 메타갭: 한 callsite 만 수정하고 같은 함수를 호출하는 다른 파일은 누락. Plan B (spec rev7 Axis B) 가 이를 차단.

진입점 2개:
1. **fix-start hook** — UserPromptSubmit 시 fix intent 감지 → callsite 전수 조회 → system-reminder inject
2. **fix-verify manual self-check** — Edit + test 완료 후 직접 callsite grep 실행 의무
Pre-commit **Gate 4.5** 가 최종 sanity check.

## Fix-start hook

### Trigger 룰

`install/hooks/fix-scope-trigger.mjs` (UserPromptSubmit):

1. `hook-shared.shouldSkip(prompt, env)` → skip reason 있으면 즉시 `{continue:true}` 반환
2. `hook-shared.detectFixIntent(prompt)` → false 면 즉시 `{continue:true}` 반환 (non-fix silent pass)
3. 심볼 추출 (prompt 에서):
   - backtick 패턴: `` `functionName` ``
   - camelCase 단어 (길이 ≥ 4, 대문자 포함)
   - `functionName()` 패턴
   - snake_case 단어
4. CRG 가용 시 `code-review-graph detect-changes` 실행. 실패/미설치 → grep fallback
5. callsite list 캡처 → 200 char truncation
6. `.kzk-harness/fix-scope-cache.jsonl` 에 `writeSingleEntryWithLock(path, commitSHA, callsiteList)` append
7. system-reminder inject

### hook-shared import 의무

```js
import { shouldSkip, detectFixIntent, FIX_KEYWORDS } from '../lib/hook-shared.mjs';
import { writeSingleEntryWithLock } from '../lib/cache-write.mjs';
```

독자 `FIX_KEYWORDS` / `shouldSkip` 정의 금지 — hook-shared 가 단일 SoT.

### CRG 시그니처 (Task 0 확정본)

```bash
code-review-graph detect-changes --base HEAD~1
```

`--symbol`, `--file`, `query`, `blast-radius` 서브커맨드 없음 — 사용 금지.

### grep fallback

CRG 미설치 또는 실패 시:

```bash
grep -rn <symbol> --include='*.{ts,tsx,js,mjs,sh,py}' --exclude-dir={node_modules,.git,docs}
```

`docs/` 제외 의무 — 문서 내 언급 callsite 오염 차단.

### cache 위치

`.kzk-harness/fix-scope-cache.jsonl` (JSONL append, key=commit SHA, value=callsite list array).

### recall consumer 관계 (Plan D)

fix-scope-trigger.mjs 는 regression-recall.mjs **다음 슬롯** 에 `UserPromptSubmit` 배열 등록.
Plan D recall 결과가 먼저 inject 된 후, B 의 callsite reminder 가 그 다음 슬롯에서 inject.

## Fix-verify hook (manual self-check rule)

`PostToolUse` hook 은 `install-global.sh` 미지원 → 수동 rule:

1. Edit + test (기능 구현 + 테스트 통과) 완료 후
2. `hook-shared.detectFixIntent` 의 `FIX_KEYWORDS` 목록으로 수정한 함수명 callsite grep 실행:
   ```bash
   grep -rn <functionName> --include='*.{ts,tsx,js,mjs,sh,py}' --exclude-dir={node_modules,.git,docs}
   ```
3. 미수정 callsite 발견 시: 수정 OR commit body 에 `"intentionally skipped: <path>"` 기재
4. Gate 4.5 에서 `.kzk-harness/fix-scope-cache.jsonl` 기반 BLOCK 됨 — 이 self-check 로 사전 차단 가능

이 룰은 `kzk-pre-commit-gate` Gate 4.5 의 사전 self-check 에 해당.

## Gate 4.5

> SoT: harness-share.md §3.5. 충돌 시 §3.5 우선.

`kzk-pre-commit-gate` Gate 4 와 commit 사이에 위치 (Gate 5 = Plan C 이전).

**Trigger**: `.kzk-harness/fix-scope-cache.jsonl` 존재 시.

**Skip**: `KZK_GATE45_SKIP=1` env var 설정 시 N/A (사유 commit body 기재 권고).

**Cache policy**: JSONL append/list — 현재 cycle commit SHA (`$(git rev-parse HEAD)`) key 의 모든 항목 union 체크. `last-fix-wins` 아님 — 여러 번 호출 시 누적.

**Sanity check**: callsite list ⊄ `git diff --cached --name-only` → BLOCK.

BLOCK 시 메시지:
```
Gate 4.5: callsite N곳 중 M곳 미수정.
누락 의도를 commit body 에 명시하거나 해당 callsite 도 수정.
```

**Cache 부재**: N/A (fix-scope-trigger hook 비활성 또는 fix intent 아닌 commit).

## 자가-skip guard

`hook-shared.shouldSkip(prompt, env)` 재사용 — 자가개선 루프 자기오염 차단.
동사구만 매칭 (명사 단독 `자가개선` 등 false positive 차단 — spec rev5 §Axis A Layer b).

자세한 패턴은 `install/lib/hook-shared.mjs` §SELF_IMPROVE_VERBPHRASES.

## Default DISABLED 정책

`fix-scope-trigger.mjs` 는 commit 시점에 `settings.json` 에 등록되지 않음.

활성화: 5 plan (A→D→B→C→E) 모두 끝나고 `kzk-pre-merge-sync` step 3:
```bash
bash install/install-global.sh --enable-hooks --regression-recall --fix-scope-trigger
```

자가오염 차단: B/C cycle 동안 hook 비활성 → 자기 fix 가 자기 recall 를 트리거하는 패턴 차단.

## Rollback (6 level)

1. **CRG probe 실패** — grep-only fallback 모드로 동작. `_warn:"crg-not-installed-grep-fallback"` stderr 출력.
2. **hook-shared 마이그레이션으로 test 실패** — hook-shared export 시그니처 재확인. D commit 53885de 내용과 동일 보장.
3. **cache-write lockdir race** — `writeSingleEntryWithLock` timeout 5초 + best-effort write fallback (stderr WARN + lock 없이 write 강행).
4. **Gate 4.5 false positive** — `KZK_GATE45_SKIP=1 git commit` 으로 일시 bypass. 다음 session 에서 callsite grep 패턴 수정.
5. **install-global.sh --fix-scope-trigger 실패 (jq 부재)** — `brew install jq` 후 재시도. jq 없는 환경 → stderr WARN.
6. **global install 산출물 cleanup** — `~/.claude/skills/.kzk-harness-shared/hooks/fix-scope-trigger.mjs` 제거 + `~/.claude/settings.json` hook entry 제거. `install-global.sh --disable-fix-scope-trigger` 또는 수동 jq edit.

즉시 비활성: `OMC_SKIP_HOOKS=fix-scope-trigger` (env var 설정).

## Interaction with other kzk-*

- **kzk-regression-memory (Plan D)**: fix-scope-trigger 는 D 의 regression-recall.mjs 다음 슬롯에 등록 (consumer). 두 hook 모두 `hook-shared.mjs` 공유 (drift 차단).
- **kzk-pre-commit-gate**: Gate 4.5 를 본 skill 이 정의. `kzk-pre-commit-gate §Gate 4.5` 는 harness-share §3.5 cross-ref.
- **kzk-codebase-survey**: fix 시작 시 자동 invoke. SoT = harness-share §3.5. `kzk-codebase-survey §fix-time trigger` cross-ref.
- **kzk-pre-merge-sync**: step 3 에서 `--fix-scope-trigger` flag 로 자동 enable. fail-closed.
- **kzk-large-task-delegation**: dispatch 시 `.kzk-harness/fix-scope-cache.jsonl` 존재 시 callsite list dispatch prompt 에 inject (200 char cap).
- **hook-shared.mjs**: `install/lib/hook-shared.mjs` — FIX_KEYWORDS / shouldSkip / detectFixIntent 단일 SoT. regression-recall.mjs + fix-scope-trigger.mjs 둘 다 import 의무.
