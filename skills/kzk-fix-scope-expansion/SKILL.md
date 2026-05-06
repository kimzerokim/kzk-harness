---
name: kzk-fix-scope-expansion
version: 1.4.0
description: "Fix scope expansion and Gate 4.5 sanity check — make sure to use this skill when a fix-start flow detects callsite mismatch or triggers Gate 4.5 (fix-scope-specific keywords). Note: 'fix 시작' and '버그 수정' direct triggers are owned by kzk-codebase-survey (the hub); this skill is cross-ref invoked from codebase-survey during fix-start flows. Direct triggers for this skill are callsite-mismatch-specific: 'callsite 전수', 'Gate 4.5', 'fix-scope-cache', 'KZK_GATE45_SKIP', 'callsite 누락'. Runs fix-scope-trigger.mjs hook (CRG detect-changes → grep fallback), writes .kzk-harness/fix-scope-cache.jsonl, and defines the pre-commit Gate 4.5 BLOCK. Default DISABLED until kzk-pre-merge-sync step 3. References harness-share.md §3.5."
---

> Authoritative source: harness-share.md §3.5. On conflict, that wins.

# kzk-fix-scope-expansion

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

## Fix layer pivot (Phase 2)

> Authoritative source: 현재 self-authoritative. harness-share.md §N 신설 시 그것이 우선.

### Operational definitions (added cycle 47)

- **"같은 방향 (same direction)"**: 두 연속 fix attempt 가 같은 root-cause label 을 공유한 경우. label 형식 = `<layer>:<symptom-key>` (예: `L1:tailscale-mtu-fragmentation`). label 충돌 시 = same direction.
- **"실패 (failure)"**: 다음 중 하나 — (a) 추가한 test 가 red 상태로 남음, (b) 사용자 보고 증상이 fix 후 동일 (변화 없음), (c) fix 후 30 초 내 동일 stack trace 재발. (a)(b)(c) 모두 검증 가능 신호.
- **레이어 라벨 사전** (L3 표 의미 = 본체 코드, 예시 텍스트 충돌 수정):
  - L0 = 외부 설정 / OS / 네트워크 / 인프라 (kubelet config, /etc/, route table)
  - L1 = wrapper / IaC / 배포 스크립트
  - L2 = SW 내부 설정 (config file, env var consumed by app)
  - L3 = 본체 application 소스 코드

### When to escalate

**Same-layer consecutive fail rule**: 동일 레이어에서 같은 방향 fix 가 2회 연속 실패 시 → 한 레이어 바깥으로 escalate.

Layer 계층 (바깥 → 안):

| 레이어 | 범위 예시 |
|---|---|
| **L0** | OS / 외부 환경 — route, DNS, firewall, env var, 시스템 권한 |
| **L1** | wrapper / middleware config — proxy, reverse-proxy, load balancer |
| **L2** | SW internal config — app config, feature flag, 설정 파일 |
| **L3** | SW core logic — 소스 코드, 알고리즘, 데이터 구조 |

탐색 순서: 문제가 발생한 레이어 → L0 방향으로 escalate.

**예시 (Tailscale 케이스)**: Claude 가 L3 (본체 소스 코드) 에서 2회 실패 → L2 (SW 내부 설정) 확인 → L1 (wrapper) 확인 → L0 (route add) 에서 1줄 fix 성공.

### Fix-verify hook 확장

Fix-verify hook (§Fix-verify hook 참조) 실행 후, 동일 레이어에서 2회 연속 실패 감지 시:

1. 현재 레이어 기록 (L0/L1/L2/L3)
2. 한 레이어 바깥으로 이동, 해당 레이어에서 원인 재조사
3. L0 도달 후에도 미해결 → `Q-FIX-PIVOT-FAIL` entry 를 `docs/harness/user-queue.md` `## OPEN` 섹션에 추가 후 halt

### Q-FIX-PIVOT-FAIL entry 형식

~~~markdown
- [ ] YYYY-MM-DD HH:MM — Q-FIX-PIVOT-FAIL — <함수명/증상> 모든 레이어 escalate 후 미해결 (cycle N)
~~~

상세 항목은 entry 아래 sub-list:
~~~markdown
  - Context: <증상 + 레이어별 시도 내역 (L3→L2→L1→L0)>
  - Tentative default: 사용자 직접 L0 환경 확인
  - Impact: 자율실행 halt — 레이어 전환 없이 진행 불가
~~~

### Anti-patterns (G1/G2/G4)

- G1: L3 단독 집중, L0 미검토 → layer 계층 순서대로 바깥부터 확인
- G2: 실패 후 동일 방향으로 variation 반복 2회 → 즉시 레이어 전환
- G4: "왜 안 되는지" 설명만 제공, 1줄 fix 미제공 → 진단은 sub-bullet, 첫 줄은 항상 실행 가능한 fix

## 자가-skip guard

> `hook-shared.shouldSkip(prompt, env)` 재사용. 패턴 단일 SoT: `install/lib/hook-shared.mjs` §SELF_IMPROVE_VERBPHRASES. Cross-ref: `kzk-regression-memory` §자가-skip guard.

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
- **kzk-freshness-guard**: fix 시 변경 심볼의 impact radius 확장 — `crg-utils.reverseRefs()` 결과에서 메타 문서 자동 감지. 영향받는 메타 문서를 fix scope 에 포함.
