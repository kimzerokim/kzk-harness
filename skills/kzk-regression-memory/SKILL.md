---
name: kzk-regression-memory
version: 1.1.0
description: "Regression memory + auto-recall — fix 시작 시 과거 유사 fix 자동 조회 (gstack /learn + sidecar). dismiss CLI mutation 포함. Top triggers: 'regression memory', '재발 방지', 'fix 시작', 'recall', '과거 fix 조회', 'dismiss recall'. Body §Triggers for full list."
---

> Authoritative source: `harness-share.md` §29. On conflict, that wins.

# kzk-regression-memory

## Triggers

`regression memory`, `재발 방지`, `fix 시작`, `recall`, `과거 fix 조회`,
`같은 버그 또`, `이거 또 났네`, `regression`, `gstack learn`,
`자가개선 cycle 회고`, `cycle retro`, `dismiss recall`,
`kzk-regression-memory dismiss`, `regression archived`.

## Why

자율실행 / 자가개선 cycle 의 5 메타갭 중 하나 — *Regression 망각*. 과거 fix 기록 존재해도 fix 시작 시점에 조회 안 됨. 본 skill 은 fix-start 시점 prompt 매칭 → 자동 recall + 사용자 dismiss 액션 → archive.

## Storage 모델

**Backend = gstack /learn JSONL (project-scoped, ~/.gstack/projects/{slug}/learnings.jsonl):**

| field | type | semantics |
|---|---|---|
| `key` | string | bug-slug (FK to sidecar) |
| `type` | enum | `pitfall` \| `pattern` \| `architecture` |
| `insight` | string | 한 줄 요약 + 원인 + 수정 위치 |
| `confidence` | int 0-10 | verifier 결과 |
| `source` | enum | `fix` \| `review` \| `retro` |

**Sidecar = project-local (.kzk-harness/regression-meta.jsonl) — 7필드:**

| field | type | semantics |
|---|---|---|
| `key` | string | `/learn` key 와 1:1 FK |
| `file_snapshot` | string | `<path>:<line>@<commit-SHA>`. canonical source = cycle 끝 evaluator 의 `git rev-parse HEAD:<file>` 결과 |
| `related_cycles` | int[] | cycle numbers |
| `dismiss_count` | int | 누적 dismiss 횟수 (CLI mutation 으로만 증가) |
| `last_dismissed_at` | ISO8601 \| null | 마지막 dismiss 시각 |
| `archived` | bool | true → recall 결과 제외. `dismiss_count>=3` 시 자동 true (CLI mutation 시 책임) |
| `stale` | bool | true → file_snapshot SHA mismatch (regression-stale-check.sh 가 update). 7번째 필드로 schema 승격 (rev1 의 in-memory only 룰 폐기 — disk 저장 OK, sidecar 가 own SoT) |

**Sidecar = metadata extension with own SoT for dismiss + stale state** — derived view 아님. dismiss_count 와 stale 둘 다 사용자/하드웨어 액션 source 라 `/learn` 에서 재구성 불가. Sidecar 도 git tracked. 손실 시 dismiss/decay/stale 만 reset, /learn 데이터는 보존.

**FK 룰**: sidecar entry 의 `key` 는 `/learn` 에 반드시 존재. 부재 시 invalid → orphan cleanup 룰 적용 (아래).

## Recall 룰

UserPromptSubmit hook (`install/hooks/regression-recall.mjs`) 발동 시:

1. 자가-skip guard 평가 (아래 §자가-skip guard) — 매칭 시 즉시 skip
2. user prompt **normalization**: `prompt.slice(0, 200)` + 공백 split + FIX_KEYWORDS / 정규식 기반 키워드 추출. raw prompt 전체 사용 X (codex #4 답)
3. `direct JSONL read from ~/.gstack/projects/*/learnings.jsonl` (hook reads files directly, no CLI)
4. **gstack 미설치 시**: `querylearn()` 가 `_warn:"gstack-learnings-not-found"` structured reason 반환. stderr WARN 출력. inject 결과 0건. silent skip 금지 (codex #7 답)
5. sidecar JSONL grep — 각 hit 의 dismiss_count, archived, last_dismissed_at, stale 조회
6. **Decay 공식**: `confidence_decayed = confidence * (0.85 ** dismiss_count)`. floating point.
7. 필터:
   - `archived: true` → 제외
   - `confidence_decayed < 4` → 제외
8. **Orphan cleanup** (codex #4 답 — `searchHits` vs `allLearnKeys` 분리):
   - **searchHits** = 현재 query 결과 keys (recall hit 만)
   - **allLearnKeys** = `direct JSONL read — collect all key fields from ~/.gstack/projects/*/learnings.jsonl`
   - cleanup 은 `allLearnKeys` snapshot 기준만 — sidecar entry 의 key 가 `allLearnKeys` 에 부재 → 자동 삭제 + stderr 로그 (`[regression-recall] orphan key removed: <key>`). 현재 query 에 안 걸린 정상 entry 보존
9. 잔존 hits 으로 system-reminder inject:
   ```
   🚨 [REGRESSION RECALL] 과거 유사 fix N건:
   - <key>: <insight> (cycle <N>, confidence_decayed <X.XX>) [⚠ stale if SHA mismatch]
   ⚠ 자동 적용 금지. 매칭 정확성 검토 후 채택.
   dismiss: kzk-regression-memory dismiss <key>  (sidecar dismiss_count++)
   ```

매칭 0건 → `{"continue":true}` (silent pass-through, gstack plugin 미설치 또는 ~/.gstack/projects/ 부재 시 `_warn` 동봉)

## Dismiss/Archive CLI mutation path (codex #1 답)

신규 CLI: `install/bin/kzk-regression-memory.mjs`

**사용법**:
```bash
node install/bin/kzk-regression-memory.mjs dismiss <key>
```

**동작**:
1. sidecar (`.kzk-harness/regression-meta.jsonl`) 에서 `key` 매칭 entry 찾기
2. 부재 시 stderr error + exit 1
3. 매칭 entry mutation:
   - `dismiss_count++`
   - `last_dismissed_at = new Date().toISOString()`
   - `archived = (dismiss_count >= 3)` (spec rev6 lock — line 29)
4. **공용 atomic writer** (`install/lib/sidecar-write.mjs`) 사용 — lockdir + tmp + atomic mv (codex #6 답)
5. stdout 결과 출력: `dismissed: <key> (count=<N>, archived=<bool>)`

**왜**: rev1 은 `dismiss` 명령 언급만 (mutation 없음). dismiss_count / last_dismissed_at / archived 가 dead field → spec/plan split-brain. CLI mutation path 추가로 dead field 차단.

## 자가-skip guard (codex #5 답 — 동사구만)

자율실행 cycle 의 메인 prompt 면 inject 안 함:

- **환경변수** `KZK_HARNESS_SELF_IMPROVEMENT=1` → 즉시 skip (가장 신뢰)
- **환경변수** `KZK_AUTONOMOUS=1` → 즉시 skip (spec rev6 §자율 mode 판별 #1 우선순위와 통일)
- user prompt 에서 **self-improvement 동사구** grep — 매칭되면 skip:
  - `harness 개선 루프 시작`
  - `스킬 개선해줘`
  - `harness loop 진입`
  - `자가개선 cycle 진입`
  - `자가개선 돌려줘`
  - `메타 cycle 진입`
  - `ralph 로 돌려`
- **명사 단독 금지** (`자가개선`, `메타 cycle`, `ralph`) — 일반 prompt false positive 차단

이유: D recall hook 이 자가개선 cycle 에서 발동하면 자기 자신의 진행을 inject 로 오염. 자율 cycle 진행 차단.

## Cycle 회고 통합 (5W1H)

| W | Detail |
|---|---|
| Who | `harness-flow-progress.md` 에 cycle entry 작성하는 주체 (메인 컨텍스트 또는 evaluator subagent). subagent 면 dispatch prompt 에 log 호출 의무 inject. |
| When | cycle commit 직후, harness-flow-progress 갱신 다음 step |
| What | 1 entry per cycle. `key=cycle-<N>-<axis>`, `type=pattern`, `insight=<한 줄 요약>`, `confidence=<verifier 결과>`, `source=retro` |
| How | `Skill("learn") invocation in conversation context (gstack /learn skill — NOT CLI)`. sidecar 는 동시에 `key`, `file_snapshot=<path>:<line>@<git rev-parse HEAD:path>`, `related_cycles=[N]`, 나머지 default 로 append. **sidecar atomic writer** 통해 (codex #9 답) |
| 실패시 | gstack plugin 미설치 또는 ~/.gstack/projects/ 부재 → cycle commit 시 stderr WARN 출력 + cycle entry 본문에 "regression memory 비활성 (gstack 미설치)" 의무 표기. silent skip 금지. cycle 진행 자체는 계속 (회고 entry 만 누락) |
| Where (kzk-web-loop) | `kzk-web-loop` cycle 끝의 evaluator 결과 paragraph 에서 추출. `file_snapshot` canonical source = evaluator 가 `git rev-parse HEAD:<file>` 로 sentinel SHA 캡처 |

## Stale check

`install/scripts/regression-stale-check.sh`:

- 실행 시점: cron (사용자 선택) 또는 cycle 끝 단발 (kzk-web-loop 등에서 hook)
- entry 의 `file_snapshot` SHA 와 HEAD 비교 → 파일 삭제/변경 감지
- 변경 감지 시: stderr 로 stale flag 출력, sidecar 의 `stale` 7번째 필드 update (lib/sidecar-write 통해 atomic). archived 자동 X (사용자 결정)
- recall hook 은 sidecar 의 `stale` 필드 read — hook path 에서 라이브 git blame 금지 (성능)

## Default DISABLED 정책

**D commit 시점**: hook 파일은 추가하지만 settings.json 등록 안 함. `--regression-recall` flag 호출 안 한 상태.

**자동 enable on main 머지**: **5 plan (A→D→B→C→E)** 모두 끝나고 `kzk-pre-merge-sync` 의 마지막 step 에서 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트). `--regression-recall` 호출 시 keyword-detector 도 explicit dependency 자동 enable.

**fail-closed** (codex #3 답): settings.json 등록 성공 + duplicate UserPromptSubmit append 없음 검증 실패 → merge block (exit non-zero). jq 부재 시 merge block.

거부 path: 사용자 confirm 거부 → manual enable 안내 (`uninstall-global.sh` 의 reverse 참고). cycle 진행 자체는 영향 X. PR description 또는 milestone commit message 에 명시 의무.

## Rollback (7 level — codex #10 답)

| Level | 메커니즘 |
|---|---|
| 단일 plan revert | `git revert <Plan-D-commit-sha>` |
| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=regression-recall` |
| Skill 즉시 비활성 | `DISABLE_OMC=kzk-regression-memory` |
| Cycle 자가-회복 불가 시 | settings.json hook entry 수동 제거 |
| Sidecar 손실 | dismiss_count + stale reset 만 — `/learn` 데이터 보존 |
| Plan D 자가오염 시 | hook default DISABLED 라 즉시 위협 없음. enable 후 발견 시 `OMC_SKIP_HOOKS=regression-recall` 즉시 비활성 |
| **Global install 산출물 cleanup** | `~/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs` 제거 + 중복 settings.json `UserPromptSubmit` entry 정리 (`uninstall-global.sh --regression-recall` reverse path. 또는 jq 명령: `jq '.hooks.UserPromptSubmit \|= map(select(.hooks[0].command \| test("regression-recall") \| not))' ~/.claude/settings.json`) |

## Interaction with other kzk-*

- **kzk-pre-merge-sync**: 마지막 step 에서 `--enable-hooks --regression-recall` 자동 호출 (사용자 confirm). first-enable 망각 차단. fail-closed.
- **kzk-web-loop**: cycle 끝 step 5.5 에서 `Skill("learn") (gstack /learn skill)` 호출 — 회고 entry 자동 작성. gstack plugin 미설치 또는 ~/.gstack/projects/ 부재 시 stderr WARN. file_snapshot canonical = `git rev-parse HEAD:<file>`.
- **kzk-large-task-delegation**: subagent dispatch prompt 에 recall 결과 inject 룰. fix-start 시점 recall = subagent 도 recall 결과 read. **size cap 200 char** — 초과 시 truncate + warning.
- **kzk-fix-scope-expansion** (Plan B): D recall 결과를 consumer 로 read — fix-start hook 이 D 다음에 발동.
- **kzk-autonomous-boundary**: 자가-skip guard 가 자율 mode 동사구 grep + `KZK_AUTONOMOUS=1` env — 자율 cycle 메인 prompt 자가오염 차단.
