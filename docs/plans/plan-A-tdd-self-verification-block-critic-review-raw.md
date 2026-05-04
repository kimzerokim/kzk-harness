OpenAI Codex v0.120.0 (research preview)
--------
workdir: /Users/kimzerokim/work/personal/kzk-harness
model: gpt-5.4
provider: openai
approval: never
sandbox: read-only
reasoning effort: high
reasoning summaries: none
session id: 019df224-7755-7f83-a9fa-8c58ff1755a6
--------
user
Plan A draft 검토. brutally honest, 한국어, no compliments.

## Read 의무

`/Users/kimzerokim/work/personal/kzk-harness/docs/plans/regression-memory-and-fix-quality-spec.md` (spec rev6, frozen)
`/Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-A-tdd-self-verification-block.md` (plan A draft)

## Context

1인 사이드 프로젝트 kzk-harness — Claude Code 워크플로 스킬 레이어. spec rev5 가 5 cycle 후 SHIP. rev6 는 Axis E 추가만. Plan A 가 가장 작은 plan (TDD 자기검증 차단).

Plan A 의 Layer (a) = sonnet executor dispatch boilerplate. Layer (b) = 자율 mode 메인 직접 TDD 금지.

## LOCKED PRIOR DECISIONS (재질문 금지)

- Backend = `/learn` + sidecar
- Plan 순서 A→D→B→C→E
- Plan A 의 Layer (a) + Layer (b) 결정
- 자율 mode 판별 우선순위 (KZK_AUTONOMOUS 우선, 키워드 동사구만)
- Test 전략 한계 (룰 기록 검증, behavioral 은 manual)
- Branch / PR / merge 정책

## YOUR JOB

다음 카테고리로 numbered list:

1. **Acceptance criteria 충실성** — spec rev6 Axis A 의 acceptance 8개 모두 plan A task 1-6 에서 cover 하는가? 누락 있나?

2. **Task detail 충실성** — sonnet executor 가 dispatch 받았을 때 ambiguous 없이 진행 가능한가? 특히 Task 1 의 Anti-pattern 섹션 본문이 정확한가? Task 2 의 boilerplate inject 위치가 명확한가?

3. **Layer (b) 자율 mode 룰 정확성** — KZK_AUTONOMOUS 우선순위 + 동사구 키워드 룰이 본문에 정확히 옮겨졌나? false positive 차단 강도?

4. **Test 전략** — skill-text-checks.sh 의 grep 룰이 실제로 실패 케이스 catch 가능한가? 누락된 grep 룰?

5. **Rollback** — 단일 plan revert / DISABLE_OMC / 수동 restore — 충분?

6. **Cross-skill 영향** — Plan A 변경이 다른 kzk-* skill (특히 kzk-large-task-delegation) 에 silent breakage 일으킬 가능성?

7. **놓친 함정** — Plan A 단계에서 spec 단계에 흡수되지 않은 회색지대.

각 항목: 짧은 진단 + 구체 권고. fine 이면 "none". 마지막에 "Bottom-line: SHIP" 또는 "REVISE".

500단어 이내.

codex
spec rev6와 Plan A draft를 먼저 대조해서 acceptance, task 디테일, 자율 mode 규칙, grep 테스트, rollback, cross-skill 영향 순으로 체크하겠습니다. 문서 기준으로만 보겠고, 막히는 부분은 누락이나 애매함으로 바로 지적하겠습니다.
exec
/bin/zsh -lc "sed -n '1,260p' /Users/kimzerokim/work/personal/kzk-harness/docs/plans/regression-memory-and-fix-quality-spec.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
# Spec — Regression Memory + Fix Quality + Production-Code-First 통합 (rev6)

> Date: 2026-05-04. Branch: `feature/memory` (already created on this session).
> Codex/critic reviews: `docs/research/codex-reviews/regression-memory-hypothesis.md`,
> `regression-memory-and-fix-quality-spec-critic-review.md` (cycle 1, REVISE),
> `regression-memory-and-fix-quality-spec-critic-review-2.md` (cycle 2, REVISE),
> `regression-memory-and-fix-quality-spec-critic-review-3.md` (cycle 3, REVISE),
> `regression-memory-and-fix-quality-spec-critic-review-4.md` (cycle 4, REVISE → rev5 SHIP 도달 가능, 7/7 cycle 3 답 충분).
> rev5 = cycle 4 의 3 MAJOR (pre-merge-sync 의무, 자율 키워드 좁힘, orphan cleanup) lock.

## Problem

자율실행 메타갭. AI 에이전트가 자율 실행 / 자가개선 cycle 중 같은 실수를 5 패턴으로 반복:

1. **TDD 가짜 통과** — implementation 본 후 거기에 맞춘 test 작성 (자기검증 루프)
2. **Fix scope 누수** — 한 callsite 만 수정, 호출자/복붙 패턴 누락
3. **자기검증** — 메인이 자기 fix 자기 review pass 선언
4. **Regression 망각** — 과거 fix 기록 있어도 fix 시작 시점 조회 안 됨
5. **Production 직접 변경** — DB / IAM / infra 를 직접 (psql / aws cli / SSM) 건드려 마이그레이션·IaC drift 발생. 트래킹 불가 + 비-멱등.

## Locked decisions (rev3)

| 결정 | 근거 |
|---|---|
| Regression backend = gstack `/learn` 기본 schema **+ sidecar** `.kzk-harness/regression-meta.jsonl` (metadata extension with own SoT for dismiss state — derived view 아님) | hypothesis H1, cycle 3 #1 — sidecar 의 dismiss_count 는 사용자 액션 source, /learn 에서 재구성 불가. sidecar 도 git tracked. |
| `/learn` 만 사용하는 필드: `key`, `type`, `insight`, `confidence`, `source` | 가설검증 §gstack /learn 데이터모델 |
| sidecar 만 사용하는 필드: `key` (FK), `dismiss_count`, `last_dismissed_at`, `file_snapshot` (file:line@SHA), `related_cycles` | cycle 1 blind spots, cycle 2 #5 |
| Recall 룰 = `/learn search` keyword + sidecar dismiss_count + decay (`confidence * 0.85^dismiss`) | cycle 1 §H3 + cycle 2 #5 |
| dismiss_count ≥ 3 → archived (recall 결과 제외) | cycle 1 §H3 |
| Hook deployment = `install-global.sh enable_hooks()` 의 같은 settings.json `UserPromptSubmit` 배열에 append (dispatcher 통합 비추). **`--regression-recall` flag 호출 시 keyword-detector 도 자동 enable (explicit dependency)** | cycle 2 #4 + cycle 3 #4 — keyword-detector 누락 silent breakage 차단 |
| Plan D hook = **default DISABLED at D commit**, **자동 enable on main 머지** (`kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 호출) | cycle 2 #1 + cycle 3 #2 — B cycle 자가오염 차단 + first-enable 망각 방지. 사용자가 머지 단계 거치면 자동 활성. |
| D hook 자가-skip guard: 자가개선 cycle 의 메인 prompt 면 inject 안 함 (system prompt 의 self-improvement marker grep) | cycle 2 #1 |
| Axis A enforcement: (a) sonnet dispatch prompt 룰 (fresh agent) + (b) **자율실행 mode 의 메인 직접 TDD 진입 금지 — 반드시 fresh sonnet dispatch**. 메인 직접 진입 시 halt + user-queue entry. 비-자율 mode (사용자 직접 prompt) 에서는 메인 self-check + user ACK 게이트 | cycle 2 #2 + cycle 3 #3 — 자율 mode 에서 user ACK 통로 없음 → 직접 진입 자체 금지로 강화 |
| Axis A 룰 적용 범위 좁힘 — TDD red 단계만. hook/install 인프라 read 항상 허용 | cycle 1 §6 |
| Axis B fix-during 제거 → fix-start + fix-verify + Gate 4.5 만 | cycle 1 §3 |
| Axis C verifier 분기 = `git diff --shortstat`: 3 파일 미만 + 100 LoC 미만 → sonnet, 그 외 → opus | cycle 1 §4 |
| Plan 순서 A→D→B→C→**E** (E 마지막 — 다른 plan 의 production access 패턴 흡수 후) | cycle 1 §1 + cycle 2 #1 + 사용자 명시 (Plan E 추가) |
| Axis E (production code-first + 멱등성): production state 변경은 코드 (script/migration/IaC) 우선. 직접 호출 (psql/aws cli/SSM 즉시 실행) 금지. 멱등성 의무 (`IF NOT EXISTS`, idempotent script). git tracked 트래킹. | 사용자 명시 — DB 직접 변경 시 마이그레이션 drift 빈번 |
| gstack auto-install = dependencies.sh 기존 분기 패턴 (npm-first → brew-fallback) 따름. **미설치 환경 → cycle commit 시 stderr WARN + harness-flow-progress entry 에 "gstack 미설치, regression memory 비활성" 의무 표기**. silent skip 금지 | cycle 2 #12.1 + cycle 3 #5 — 침묵 실패 = 메타갭 자체 |
| Branch: `feature/memory` (이미 생성). PR 없음. 끝나면 `git merge --no-ff` to main. | 사용자 명시 |

## Non-goals

- 새 vector DB / basic-memory 도입 (6개월 유예)
- LLM 기반 cycle 회고 자동 요약 (Plan D fast-follow)
- Cross-project regression memory
- Codex CLI 로 fix-time review
- Behavioral test (sonnet dispatch 시뮬레이션) — 본 spec 은 룰 *기록* test 만. behavioral 은 manual cycle 검증 의존 (cycle 2 #5 한계 인정)

---

## 4 Axis (요약)

### Axis A — TDD 자기검증 차단

`kzk-test-coverage/SKILL.md` v1.3:

**Layer (a) Fresh dispatch 룰** — `kzk-large-task-delegation` 의 sonnet executor dispatch prompt 에 다음 boilerplate 자동 주입:

```
[TDD anti-self-verification rule]
이 task 가 red-green TDD 단계라면, red 단계 진입 시점에:
- spec / acceptance criteria / 사용자 prompt 만 read 허용
- 지금 작성하려는 함수의 implementation file 본문 read 금지
- 같은 파일의 sibling 함수 본문 read 금지 (public 인터페이스 시그니처는 OK)
- 기존 test 파일 read 금지 (기존 가정 복사 차단)
- hook/install 인프라 코드 (예: regression-recall.mjs) read 는 항상 허용 (TDD red 가 아닌 디버깅 목적)
```

**Layer (b) 자율실행 mode — 메인 직접 TDD 금지** — `kzk-test-coverage/SKILL.md` 본문에 추가:

```
자율실행 mode (kzk-autonomous-boundary 진입, kzk-web-loop, kzk-autonomous-loop) 에서:
- 메인 컨텍스트가 직접 TDD red 단계 진입 금지 — 반드시 fresh sonnet dispatch (kzk-large-task-delegation)
- 메인이 직접 진입 시도 시 halt + user-queue entry ("자율 cycle 의 메인 직접 TDD 시도, dispatch 재시작 필요")
- 비-자율 mode (사용자가 직접 prompt 로 TDD task 부여) 에서는 메인 self-check + user ACK 게이트
- 자율 mode 인지 판별 우선순위: (1) 환경변수 `KZK_AUTONOMOUS=1` 우선 (가장 신뢰), (2) 환경변수 미설정 시 보조 키워드 — **동사구로 좁힘**: "ralph 로 돌려", "web-loop 진입", "autonomous-loop 시작", "harness 개선 루프 시작", "자가개선 cycle 진입", "끝까지 끝내줘". 명사 단독 ("자가개선" 만) 매칭 금지 — 일반 prompt false positive 차단
```

### Axis D — Regression memory

신규 skill `kzk-regression-memory` + `install/hooks/regression-recall.mjs` + `install/scripts/regression-stale-check.sh`.

**Storage 모델** (cycle 2 #3 답):

```
gstack /learn JSONL (project-scoped, ~/.gstack/projects/{slug}/learnings.jsonl):
  key: <bug-slug>
  type: pitfall | pattern | architecture
  insight: <한 줄 요약 + 원인 + 수정 위치>
  confidence: 0-10
  source: fix | review | retro

sidecar (project-local, .kzk-harness/regression-meta.jsonl):
  key: <bug-slug>  # /learn key 와 1:1 FK
  file_snapshot: "<path>:<line>@<commit-SHA>"
  related_cycles: [<cycle-number>]
  dismiss_count: 0
  last_dismissed_at: null | <ISO>
  archived: false | true
```

**Sidecar = metadata extension with own SoT for dismiss state** — `/learn` 는 fix knowledge 의 source of truth. Sidecar 는 dismiss/cycle binding metadata 의 own SoT (derived view 아님 — dismiss_count 가 사용자 액션 source 라 /learn 에서 재구성 불가). Sidecar 도 git tracked. 손실 시 dismiss/decay 만 reset, /learn 데이터는 보존. cycle 1 §H2 위험: dual-write 가 아닌 *split SoT* 패턴 — `/learn` key 가 FK 라 sync 1 방향 (sidecar 는 /learn 에 없는 key 가지면 invalid).

**Orphan cleanup 룰**: recall hook 발동 시 sidecar entry 의 key 가 `/learn` 에 부재이면 sidecar 그 entry 삭제 (자동, 사용자 silent loss 방지 위해 deletion 로그 stderr 출력). 추가로 `regression-stale-check.sh` 가 cron/cycle-end 실행 시 동일 검사. 자동 GC 만 — 수동 path 없음 (영구 누수 차단).

**Recall hook** (`install/hooks/regression-recall.mjs`):
- Trigger: UserPromptSubmit. (PostToolUse 미사용 — install-global.sh 가 미지원 + cycle 2 #3)
- 키워드 매칭 (사용자 prompt 의 에러/버그/fix/수정 등)
- `gstack-learnings-search --query <kw>` (또는 gstack 의 실제 CLI — Plan D Step 0 에 검증)
- sidecar JSONL grep → dismiss_count/archived 적용
- decay: `confidence_decayed = confidence * (0.85 ** dismiss_count)`. archived 또는 confidence_decayed < 4 → 결과 제외
- system-reminder inject:
  ```
  [REGRESSION RECALL] 과거 유사 fix N건:
  - <key>: <insight> (cycle <N>, confidence_decayed <X>) [⚠ stale if SHA mismatch]
  ⚠ 자동 적용 금지. 매칭 정확성 검토 후 채택. dismiss: kzk-regression-memory dismiss <key>
  ```

**자가-skip guard** (cycle 2 #1):
- Hook 발동 시 user prompt 에서 self-improvement marker grep — 매칭되면 inject skip
- 매칭 패턴: "harness 개선 루프", "스킬 개선해줘", "harness loop", "자가개선", "메타 cycle"
- 추가: 환경변수 `KZK_HARNESS_SELF_IMPROVEMENT=1` 시 inject skip

**Default DISABLED at D commit, 자동 enable on main 머지** (cycle 2 #1 + cycle 3 #2):
- D plan commit 시점에 hook 파일은 추가하지만 settings.json 등록 안 함
- 4 plan 모두 끝나고 `kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 받은 후)
- `--regression-recall` 호출 시 keyword-detector 도 dependency 자동 enable
- merge 직전에 사용자가 enable 명시 거부 가능 — 거부 시 manual enable path 안내 (uninstall-global.sh 의 reverse 항목)

**Stale check** (cycle 1 #8):
- `install/scripts/regression-stale-check.sh` (신규 install/scripts/ 디렉토리)
- 실행 시점: cron (사용자 선택) 또는 cycle 끝 단발 (kzk-web-loop 등에서 hook)
- hook path 에서는 sidecar 의 캐시된 stale flag 만 read. 라이브 git blame 안 함
- entry 의 file_snapshot SHA 와 HEAD 비교 → 파일 삭제/변경 감지. archived 자동 X (사용자 결정)

**Cycle 회고 통합 5W1H** (cycle 2 #7 답):

| W | Detail |
|---|---|
| Who | `harness-flow-progress.md` 에 cycle entry 작성하는 주체 (메인 컨텍스트 또는 evaluator subagent). subagent 면 dispatch prompt 에 log 호출 의무. |
| When | cycle commit 직후, harness-flow-progress 갱신 다음 step |
| What | 1 entry per cycle. key=`cycle-<N>-<axis>`, type=`pattern`, insight=`<한 줄 요약>`, confidence=`<verifier 결과>`, source=`retro` |
| How | `gstack learn add --key ... --type ... --insight ... --confidence ... --source retro` (Plan D Step 0 에서 정확 시그니처 확정). sidecar 는 동시에 `key`, `related_cycles=[N]` 만 append |
| 실패시 | gstack 미설치 → cycle commit 시 stderr WARN 출력 + cycle entry 본문에 "regression memory 비활성 (gstack 미설치)" 의무 표기. silent skip 금지. cycle 진행 자체는 계속 (회고 entry 만 누락). |
| Where (kzk-web-loop) | `kzk-web-loop` cycle 끝의 evaluator 결과 paragraph 에서 추출 |

### Axis B — Fix scope 누수 차단

신규 skill `kzk-fix-scope-expansion`. 진입점 2개 (fix-start + fix-verify), Pre-commit Gate 4.5 보조. 디테일은 Plan B 에 위임.

핵심 룰:
- fix-start hook 이 D 의 regression-recall 결과 inject 다음에 발동 (consumer)
- callsite 전수: `code-review-graph` 우선, fallback grep
- Gate 4.5 = sanity check (callsite grep 결과 vs git diff 매칭)

### Axis C — Fresh-agent verification

`kzk-large-task-delegation` Stage 3 + Pre-commit Gate 5. 디테일은 Plan C 에 위임.

핵심 룰:
- `git diff --shortstat` 분기: 3 파일 미만 + 100 LoC 미만 → sonnet, 그 외 → opus
- PASS / FAIL / PARTIAL 강제. 2 consecutive FAIL → halt + user-queue
- Verifier prompt 에 **spec/plan 의 acceptance criteria 발췌만 inline copy** (전체 600줄 read 금지). 토큰/cache 부담 차단

### Axis E — Production code-first + 멱등성

`kzk-production-access` skill 강화. 디테일은 Plan E 에 위임.

**핵심 룰**:
- Production state 변경 (DB schema, IAM policy, S3 lifecycle, Lambda env, CloudFront origin 등) = **코드 우선** (migration / IaC / script). 직접 호출 (psql `ALTER TABLE`, `aws iam`, `aws s3` 즉시 실행) 금지.
- **멱등성 의무**: 작성하는 script 는 두 번 실행해도 안전 (`IF NOT EXISTS`, `--if-not-exists`, conditional skip). 1회용 ad-hoc 명령 금지.
- **트래킹**: script 파일 git tracked. `migrations/`, `infra/`, `scripts/prod/` 등 프로젝트 컨벤션 따름. ad-hoc 실행 후 사후 기록 금지.
- **환경 설정 예외**: 환경변수, 비밀 secret 회전, OAuth credential 갱신 — 코드 외 unavoidable. `kzk-production-access` 의 기존 explicit-instruction rule 적용.
- **AI 가 production access 받은 경우**: script 작성 → 사용자 review/승인 → 사용자 또는 CI 가 실행. AI 가 직접 production 호출 금지 (read-only inspection 만 허용).
- **Drift 발견 시**: drift 자체를 fix 대상 — `git revert + 재적용` 가 아니라 *현 상태를 반영하는 새 migration 추가* (forward-only).

**Cross-axis 통합**:
- Axis B (fix scope) — production fix 의 callsite 전수 = migration 의 영향 schema/표/index 전수. fix-scope-expansion hook 이 production access trigger 시에도 발동.
- Axis D (regression memory) — production change 회고 entry 의 type=`pattern`, key=`prod-<change-slug>`. 같은 곳 재변경 시 recall.

---

## Plan 분할

| Plan | 파일 | 주요 변경 | 예상 LoC | 의존성 |
|---|---|---|---|---|
| **A** | `docs/plans/plan-A-tdd-self-verification-block.md` | `kzk-test-coverage` v1.3 — Layer (a) dispatch prompt + Layer (b) 메인 self-check | ~60 | 독립 |
| **D** | `docs/plans/plan-D-regression-memory.md` | 신규 `kzk-regression-memory` + recall hook (default DISABLED) + sidecar + stale check + cycle 회고 통합 + gstack auto-install + **`kzk-pre-merge-sync/SKILL.md` 마지막 step `--regression-recall` 자동 호출 추가** | ~570 | A 후 |
| **B** | `docs/plans/plan-B-fix-scope-expansion.md` | 신규 `kzk-fix-scope-expansion` + D recall consumer + Gate 4.5 | ~250 | D 후 |
| **C** | `docs/plans/plan-C-fresh-agent-verification.md` | `kzk-large-task-delegation` Stage 3 + Gate 5 | ~120 | A/B/D 후 |
| **E** | `docs/plans/plan-E-production-code-first.md` | `kzk-production-access` 강화 — code-first 룰 + 멱등성 의무 + 직접 호출 금지 boilerplate. CLAUDE.md 의 production access 섹션 업데이트. | ~150 | A/B/C/D 후 (마지막) |

**진행 순서 합리화**: A 독립 / D 인프라 source / B 는 D consumer / C 는 안전망.

**자가오염 차단**: D commit 시점에 hook DISABLED. B/C cycle 동안 D hook 비활성. 모든 plan 끝나고 main 머지 시점 사용자 explicit enable.

## Skill count 동기화 (14→16)

신규 2개 (B `kzk-fix-scope-expansion` + D `kzk-regression-memory`). 4 동기화 지점:
1. `CLAUDE.md` line 3
2. `CLAUDE.md` "All N skills" line
3. `README.md` line 3
4. `README.md` install command 의 skill count

각 plan B/D §구현 변경 에 4 sync points 명시 의무.

## Test 전략 (cycle 2 #5 한계 명시)

| Plan | Test 유형 | 한계 |
|---|---|---|
| A | `install/test/skill-text-checks.sh` — `kzk-test-coverage` SKILL.md 의 anti-pattern 섹션 grep + dispatch prompt boilerplate 의 sonnet executor SKILL.md 등록 grep | 룰 *기록* 검증만. 실제 sonnet 이 룰 위반 차단 여부는 manual cycle 검증 의존 |
| B | `install/test/fix-scope-trigger.test.mjs` — fix-start hook simulator (mock prompt → expected grep call) | hook 자체 동작 test. 실제 fix workflow 통합은 manual |
| C | `install/test/verifier-routing.test.sh` — `git diff --shortstat` mock → 분기 결과 echo 확인 | dispatch path 만. verifier subagent 응답 품질은 manual |
| D | `install/test/regression-recall.test.mjs` — mock /learn JSONL fixture + sidecar fixture → recall hook 매칭 + decay + dismiss 시뮬 | 진짜 mock 동작 test (코드 단위) |

`install/test/run-tests.sh` 의 라우팅: `*.test.mjs` → `node`, `*.test.sh` → `bash`, `*.checks.sh` → `bash`. Plan D 가 run-tests.sh 를 명시적으로 update.

`install/test/fixtures/` 디렉토리 신규 — Plan B/D 의 mock fixture 위치. git tracked.

**Fixture-backend drift 방지** (cycle 3 #6): Plan D Step 0 에 의무 — 실제 `gstack learn add` 1회 실행 → 출력 JSONL 캡처 → fixture 로 복사 (`fixtures/gstack-learnings.sample.jsonl`). 매 Plan D 변경 시 재캡처. fixture 가 backend 가정의 single point — drift 시 test 가 통과해도 실 운영 break.

## Rollback

| Level | 메커니즘 |
|---|---|
| 단일 plan revert | `git revert <plan-commit-sha>` |
| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=regression-recall` |
| Skill 즉시 비활성 | `DISABLE_OMC=kzk-regression-memory` |
| Cycle 자가-회복 불가 시 | settings.json hook entry 수동 제거 |
| Sidecar 손실 | dismiss_count reset 만 — `/learn` 데이터 보존 |
| Plan D 자가오염 시 | hook default DISABLED 라 즉시 위협 없음. enable 후 발견 시 OMC_SKIP_HOOKS 로 비활성 |

## 메타 룰

- 각 plan commit = atomic. 메시지 prefix `feat(skill):` / `feat(harness):` / `feat(install):`
- Cycle 끝: harness-flow-progress.md entry + (Plan D 이후) gstack `learn add` 호출
- 4 plan 모두 완료 후: `kzk-pre-merge-sync` (CLAUDE.md sync, deepinit) → `git checkout main && git merge feature/memory --no-ff`
- 각 plan 별 codex review 의무. **codex CLI stdin path 재시도** (cycle 1 #12.3): `printf '%s' "$prompt" | codex exec - -s read-only -c '...' --json | jq ...`. 2회 실패 → critic opus fallback. 4 plan 중 최소 2개 codex CLI 성공 목표.
- 메인이 cycle 진입 시 user-queue (`docs/harness/user-queue.md`) 에 진행 entry append. 모호한 결정은 tentative default + queue 표시.

## Critic 매트릭스 (rev5 반영)

| Cycle 1 # | rev3 답 위치 |
|---|---|
| 1 (Plan 순서) | Locked + §Plan 분할 |
| 2 (Axis A enforcement) | Locked + Axis A Layer (a)+(b) |
| 3 (Axis B fix-during) | Locked + Axis B 요약 |
| 4 (Axis C 분기) | Locked + Axis C 요약 |
| 5 (Axis D dismiss/decay) | §Storage 모델 sidecar + Recall 룰 |
| 6 (Cross-axis A×D) | Locked (적용 범위 좁힘) |
| 7 (Hook deployment) | Locked (append 채택) |
| 8 (Stale check) | Axis D §Stale check |
| 9 (Skill count sync) | §Skill count 동기화 |
| 10 (Test 전략) | §Test 전략 + 한계 명시 |
| 11 (Rollback) | §Rollback 6-level |
| 12.1 (gstack 미설치) | Locked (npm-first → brew-fallback) |
| 12.2 (/learn 시그니처) | §Storage 모델 (sidecar 채택으로 schema 확장 회피) |
| 12.3 (Codex same-vendor) | §메타 룰 |


exec
/bin/zsh -lc "sed -n '1,260p' /Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-A-tdd-self-verification-block.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
# Plan A — TDD 자기검증 차단 (Layer a + b)

> Spec: `docs/plans/regression-memory-and-fix-quality-spec.md` (rev5, frozen).
> Branch: `feature/memory`. Order: A (first cycle) → D → B → C.
> Status: **draft** → critic review → frozen.

## Goal

`kzk-test-coverage` 스킬을 v1.2 → v1.3 으로 업그레이드. AI 가 TDD red 단계에서 implementation 본 후 거기에 맞춘 test 를 작성하는 자기검증 루프를 차단한다.

- **Layer (a)** — `kzk-large-task-delegation` 의 sonnet executor dispatch prompt 에 "TDD red 단계에서 implementation read 금지" boilerplate 자동 주입.
- **Layer (b)** — 자율 mode 의 메인 직접 TDD 진입 금지 (반드시 fresh sonnet dispatch). 메인 직접 진입 시 halt + user-queue.

## Acceptance Criteria

1. `skills/kzk-test-coverage/SKILL.md` v1.3 — `## Anti-pattern — Test-from-implementation` 섹션 추가, Layer (b) 자율 mode 룰 포함, hook/install 인프라 read 예외 명시
2. `skills/kzk-large-task-delegation/SKILL.md` — sonnet executor dispatch 시 anti-self-verification boilerplate 가 prompt 에 자동 포함되도록 §Subagent prompt requirements 또는 §Sonnet executor 룰 갱신
3. `harness-share.md` §11.1 신규 subsection — Layer (a) + (b) cross-ref
4. `install/test/skill-text-checks.sh` 신규 — kzk-test-coverage SKILL.md 의 Anti-pattern 섹션 grep + kzk-large-task-delegation SKILL.md 의 boilerplate 룰 grep 확인
5. `install/test/run-tests.sh` 갱신 — skill-text-checks.sh 호출 등록
6. CLAUDE.md / README.md skill count 동기화 (Plan A 는 신규 skill 없음 — 변경 없음. Plan B/D 가 책임)
7. `bash install/test/run-tests.sh` PASS
8. atomic commit 메시지: `feat(skill): kzk-test-coverage v1.3 — anti-self-verification (Plan A)`

## Variables

- `SKILL_TC = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-test-coverage/SKILL.md`
- `SKILL_LTD = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-large-task-delegation/SKILL.md`
- `SHARE = /Users/kimzerokim/work/personal/kzk-harness/harness-share.md`
- `TEST_CHECKS = /Users/kimzerokim/work/personal/kzk-harness/install/test/skill-text-checks.sh`
- `TEST_RUN = /Users/kimzerokim/work/personal/kzk-harness/install/test/run-tests.sh`

## Tasks

### Task 1 — `kzk-test-coverage/SKILL.md` v1.3 (frontmatter + Anti-pattern + Layer b)

**File**: `$SKILL_TC`

**Frontmatter 변경**:
- `version: 1.2.0` → `version: 1.3.0`
- description 끝에 trigger 추가: `'자율 mode TDD'`, `'test-from-implementation'`, `'KZK_AUTONOMOUS'`

**Triggers section 갱신** (line 13): 끝에 추가
```
'test-from-implementation', '자율 mode TDD', 'KZK_AUTONOMOUS', 'self-verification', '자기검증 차단'
```

**Anti-pattern 섹션 신규** — 기존 `## TDD sequence` 다음, `## Exemptions` 직전 위치에 삽입:

```markdown
## Anti-pattern — Test-from-implementation

Red 단계 (failing test 작성) 진입 시점에 implementation read 금지. 자기검증 루프 차단.

**Red 단계 허용 read**:
- spec / acceptance criteria / 사용자 prompt / 이슈 본문
- 외부 인터페이스 (public API 시그니처만)
- hook/install 인프라 코드 (예: `install/hooks/regression-recall.mjs`) — 항상 허용 (TDD red 가 아닌 디버깅 목적)

**Red 단계 금지 read**:
- 지금 작성하려는 함수의 implementation 본문
- 같은 파일의 sibling 함수 본문 (public 인터페이스 시그니처는 OK)
- 기존 test 파일 (이미 있는 테스트 가정 복사 차단)

**자가 점검** (red 진입 직전):
> "이 test 가 검증할 동작이 spec / acceptance criteria 에 명시되어 있는가? implementation 의 현재 모양에서 추론한 것이 아닌가?"

### 자율 mode 메인 직접 TDD 금지 (Layer b)

자율실행 mode (`kzk-autonomous-boundary` 진입, `kzk-web-loop`, `kzk-autonomous-loop`, harness 자가개선 cycle) 에서:

- 메인 컨텍스트가 직접 TDD red 단계 진입 금지 — 반드시 fresh sonnet dispatch (`kzk-large-task-delegation`)
- 메인이 직접 진입 시도 시 halt + user-queue entry: `Q-TDD-MAIN — 자율 cycle 의 메인 직접 TDD 시도, fresh dispatch 재시작 필요`
- 비-자율 mode (사용자가 직접 prompt 로 TDD task 부여) 에서는 메인 self-check + user ACK 게이트 (사용자 명시 confirm 받은 후 진행)

**자율 mode 판별** (우선순위):
1. 환경변수 `KZK_AUTONOMOUS=1` → 자율 mode (가장 신뢰)
2. `KZK_AUTONOMOUS=0` 명시 → 비-자율 mode 강제 (override)
3. 환경변수 unset 시 보조 키워드 매칭 — **동사구만**:
   - "ralph 로 돌려", "web-loop 진입", "autonomous-loop 시작"
   - "harness 개선 루프 시작", "자가개선 cycle 진입", "끝까지 끝내줘"
   - 명사 단독 ("자가개선" 만, "ralph" 만) 매칭 금지 — 일반 prompt false positive 차단

**enforcement layer**:
- Layer (a) sonnet dispatch prompt 룰 — `kzk-large-task-delegation` 의 §Subagent prompt requirements 의 Rules block 에 자동 주입 (boilerplate 텍스트 본 SKILL.md 참조)
- Layer (b) 메인 self-check — 본 섹션의 자율 mode 판별 + halt 룰
```

**§Interaction with other kzk-* 갱신** — 기존 항목 끝에 추가:
```
- **kzk-autonomous-boundary**: 자율 mode 판별 키워드 / 환경변수 룰을 본 skill §Anti-pattern Layer b 에서 정의. autonomous-boundary 의 halt 룰과 통합 (`Q-TDD-MAIN` 큐 entry).
```

### Task 2 — `kzk-large-task-delegation/SKILL.md` boilerplate

**File**: `$SKILL_LTD`

**§Subagent prompt requirements 갱신** (line 224 부근의 Rules block 항목):

기존:
> Rules block: TDD sequence (red-green-refactor — see kzk-test-coverage §TDD sequence; failing test BEFORE impl is non-negotiable in autonomous mode) + ...

변경:
> Rules block: TDD sequence (red-green-refactor — see kzk-test-coverage §TDD sequence; failing test BEFORE impl is non-negotiable in autonomous mode) + **anti-self-verification boilerplate** (see §Sonnet executor — Anti-self-verification boilerplate below — sonnet dispatch prompt 에 자동 inject) + ...

**§Sonnet executor — extra plan-detail requirements** 끝에 신규 subsection 추가:

```markdown
### Anti-self-verification boilerplate (Plan A)

Sonnet executor dispatch prompt 에 다음 boilerplate 자동 inject (TDD red 단계 진입 시 implementation read 차단):

\`\`\`
[ANTI-SELF-VERIFICATION RULE — kzk-test-coverage §Anti-pattern]
TDD red 단계 (failing test 작성) 진입 시점:
- 허용 read: spec / acceptance criteria / 사용자 prompt / public API 시그니처 / hook·install 인프라 코드
- 금지 read: 지금 작성하려는 함수 본문, 같은 파일 sibling 함수 본문, 기존 test 파일
- 자가 점검: "이 test 가 spec 에서 도출됐는가? implementation 의 현재 모양에서 추론한 것 아닌가?"
위반 시 task BLOCKED 반환 + plan revision 요청.
\`\`\`

이 boilerplate 는 sonnet dispatch prompt 의 Rules block 에 의무 inject. 메인이 dispatch prompt 작성 시 boilerplate 누락 = §Two-stage review FAIL.
```

### Task 3 — `harness-share.md` §11.1 신규

**File**: `$SHARE`

기존 `## 11. Test Coverage 100% on Changed Code` 섹션 끝 (line 477 직후, `---` 직전) 에 신규 subsection 추가:

```markdown
### 11.1 Anti-Self-Verification (TDD)

TDD red 단계에서 implementation 본 후 거기에 맞춘 test 작성하는 자기검증 루프 차단.

- **Layer (a)** — sonnet executor dispatch prompt 에 anti-self-verification boilerplate 자동 inject. 룰 본문: `kzk-large-task-delegation` §Sonnet executor — Anti-self-verification boilerplate.
- **Layer (b)** — 자율 mode (`KZK_AUTONOMOUS=1` 또는 동사구 키워드 매칭) 에서 메인 직접 TDD 진입 금지 — 반드시 fresh sonnet dispatch. 메인 직접 진입 시 halt + `Q-TDD-MAIN` user-queue entry. 룰 본문: `kzk-test-coverage` §Anti-pattern — Test-from-implementation.
- 비-자율 mode 의 메인 self-check + user ACK 게이트 — 사용자 명시 confirm 받은 후 red 진입.
```

### Task 4 — `install/test/skill-text-checks.sh` 신규

**File**: `$TEST_CHECKS`

```bash
#!/usr/bin/env bash
# install/test/skill-text-checks.sh — Plan A test (룰 *기록* 검증)
#
# kzk-test-coverage SKILL.md 의 Anti-pattern 섹션 + Layer b 룰 grep
# kzk-large-task-delegation SKILL.md 의 anti-self-verification boilerplate 룰 grep
# harness-share.md §11.1 cross-ref grep
#
# 한계: behavioral test 아님. 룰이 *기록* 됐는지만 확인.
# 실제 sonnet 이 룰 위반 차단하는지는 manual cycle 검증 의존.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PASS=0
FAIL=0
ERRORS=()

assert_grep() {
  local desc="$1" pattern="$2" file="$3"
  if grep -qF "$pattern" "$file"; then
    printf '  PASS: %s\n' "$desc"
    PASS=$((PASS + 1))
  else
    printf '  FAIL: %s (pattern "%s" not in %s)\n' "$desc" "$pattern" "$file"
    FAIL=$((FAIL + 1))
    ERRORS+=("$desc")
  fi
}

printf 'skill-text-checks.sh — Plan A 룰 기록 검증\n'

TC="$REPO_ROOT/skills/kzk-test-coverage/SKILL.md"
LTD="$REPO_ROOT/skills/kzk-large-task-delegation/SKILL.md"
SHARE="$REPO_ROOT/harness-share.md"

# kzk-test-coverage v1.3
assert_grep "kzk-test-coverage version 1.3.0" "version: 1.3.0" "$TC"
assert_grep "kzk-test-coverage Anti-pattern 섹션" "Anti-pattern — Test-from-implementation" "$TC"
assert_grep "kzk-test-coverage Layer b 자율 mode" "자율 mode 메인 직접 TDD 금지" "$TC"
assert_grep "kzk-test-coverage KZK_AUTONOMOUS 룰" "KZK_AUTONOMOUS=1" "$TC"
assert_grep "kzk-test-coverage Q-TDD-MAIN queue entry" "Q-TDD-MAIN" "$TC"
assert_grep "kzk-test-coverage hook 인프라 예외" "hook/install 인프라" "$TC"

# kzk-large-task-delegation boilerplate
assert_grep "kzk-large-task-delegation Anti-self-verification boilerplate" "Anti-self-verification boilerplate" "$LTD"
assert_grep "kzk-large-task-delegation boilerplate Rules block" "anti-self-verification boilerplate" "$LTD"

# harness-share §11.1
assert_grep "harness-share §11.1 Anti-Self-Verification" "11.1 Anti-Self-Verification" "$SHARE"
assert_grep "harness-share Layer (a) cross-ref" "Layer (a)" "$SHARE"
assert_grep "harness-share Layer (b) cross-ref" "Layer (b)" "$SHARE"

printf '\n%d PASS, %d FAIL\n' "$PASS" "$FAIL"
if [ "$FAIL" -gt 0 ]; then
  printf 'Errors:\n'
  for e in "${ERRORS[@]}"; do
    printf '  - %s\n' "$e"
  done
  exit 1
fi
exit 0
```

`chmod +x` 실행 의무.

### Task 5 — `install/test/run-tests.sh` 갱신

**File**: `$TEST_RUN`

기존 test harness 의 main test 실행 부분 (가장 마지막, 종합 결과 출력 직전) 에 skill-text-checks.sh 호출 추가:

```bash
# Plan A — skill-text-checks
printf '\n--- skill-text-checks (Plan A) ---\n'
if bash "$REPO_ROOT/install/test/skill-text-checks.sh"; then
  PASS=$((PASS + 1))
  printf '  PASS: skill-text-checks.sh\n'
else
  FAIL=$((FAIL + 1))
  ERRORS+=("skill-text-checks.sh")
fi
```

위치: 종합 result 출력 (`printf 'Total: %d PASS, %d FAIL\n' ...`) 직전.

### Task 6 — atomic commit

`kzk-pre-commit-gate` 통과 (Gate 0–4):
- Gate 0: AGENTS.md sync — kzk-test-coverage / kzk-large-task-delegation 둘 다 SKILL.md 변경했지만 신규 skill 아님 → AGENTS.md 변경 없음 (skill list 그대로)
- Gate 1: ai-slop scan
- Gate 1.5: secrets scan
- Gate 2: build (n/a — markdown only)
- Gate 3: test — `bash install/test/run-tests.sh` PASS
- Gate 4: Playwright (n/a — non-UI)

commit message:
```
feat(skill): kzk-test-coverage v1.3 — anti-self-verification (Plan A)

Layer (a): sonnet executor dispatch boilerplate (kzk-large-task-delegation).
Layer (b): 자율 mode 메인 직접 TDD 금지 — fresh sonnet dispatch 강제.
harness-share.md §11.1 cross-ref.
install/test/skill-text-checks.sh 신규 — 룰 기록 검증.

Spec: docs/plans/regression-memory-and-fix-quality-spec.md (rev5).
Plan: docs/plans/plan-A-tdd-self-verification-block.md (frozen).
```

## Test 전략 (한계 명시)

- `skill-text-checks.sh` 는 룰이 *기록* 됐는지만 확인. behavioral test 아님.
- 실제 sonnet executor 가 anti-self-verification 룰을 따르는지는 다음 cycle (Plan D/B/C) 의 자율 dispatch 에서 manual 검증.
- 한계: 메인 직접 TDD 진입의 self-check + user ACK 게이트는 자동 enforcement 없음 — 사용자 신뢰 의존.

## Rollback

codex
두 문서의 핵심 축은 읽었습니다. 이제 spec Axis A의 8개 acceptance와 Plan A task 1-6이 실제로 1:1로 닫히는지, 그리고 문구 차이 때문에 구현자가 오해할 지점을 추려서 보겠습니다.
exec
/bin/zsh -lc "sed -n '261,420p' /Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-A-tdd-self-verification-block.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:

- 단일 plan revert: `git revert <Plan-A-commit-sha>` — kzk-test-coverage v1.3 → v1.2 으로 복귀
- skill 비활성: `DISABLE_OMC=kzk-test-coverage` (전체 skill OFF)
- harness-share §11.1 만 revert: 수동 git restore

## Out of scope (다음 Plan 으로 위임)

- Plan D — regression memory hook + sidecar + cycle 회고
- Plan B — fix-scope-expansion
- Plan C — fresh-agent verifier Stage 3 + Pre-commit Gate 5
- behavioral TDD test (sonnet dispatch 시뮬레이션) — 본 spec Non-goals (Plan A 책임 아님)

## Codex review 의무

본 plan draft 는 frozen 전 codex CLI consult (stdin path) → critic opus fallback. spec rev5 의 §메타 룰 대로 4 plan 중 최소 2개 codex CLI 성공 목표.

Plan A 가 가장 작고 markdown 변경 위주 — codex 시도 + critic 대기. 결과 후 frozen 표기.

codex
문서만 보면 충분한 지적 몇 개가 보이지만, cross-skill breakage와 inject 위치 애매함은 실제 현재 스킬 구조를 봐야 정확합니다. 관련 SKILL.md와 테스트 harness 현재 형태만 짧게 확인하겠습니다.
exec
/bin/zsh -lc "sed -n '1,240p' skills/kzk-test-coverage/SKILL.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
---
name: kzk-test-coverage
version: 1.2.0
description: "TDD-strict + 100% line+branch coverage on changed files — failing test FIRST (red), impl (green), refactor, commit. Top triggers: 'TDD', 'test first', '테스트 먼저', 'test coverage', 'coverage exemption'. Body §Triggers for full list."
---

> Authoritative source: `harness-share.md` §11. On conflict, that wins.

# kzk-test-coverage

## Triggers

`test coverage`, `test:cov`, `100% coverage`, `변경 파일 cov`, `coverage exemption`, `tdd`, `TDD`, `test first`, `테스트 먼저`, `테스트부터`, `failing test`, `red-green`, `테스트 추가`, `테스트 추가해줘`, `test 추가`, `coverage 추가`.

Autonomous session = 100% line + branch coverage on the files the session changed. Legacy code in those files counts too — touched = raised.

## Workflow

- Run the repo's coverage command before session close (e.g. `npm run test:cov`, `pytest --cov`, `go test -cover ./...`)
- Uncovered region in a touched file → add unit / integration / e2e until covered
- Hard time constraint → append explicit user-queue entry stating which files + why; do not silently leave gaps

## TDD sequence (mandatory in autonomous mode)

For any new feature or bugfix in autonomous mode (or any large-task dispatch), the executor follows this sequence — NOT impl-first:

1. **Red** — write failing test that captures the spec'd behavior. Run; confirm it fails for the right reason (assertion mismatch, not import error).
2. **Green** — implement minimum code to pass the test. Run; confirm green.
3. **Refactor** — clean diff (de-dup, naming, error paths). Run again; still green.
4. **Commit** — Pre-commit Gate 0-4 + commit message includes test path(s) added/modified.

Skipping step 1 (going straight to impl) violates this skill in autonomous mode. Interactive mode: user may waive TDD per task with explicit "skip TDD" — log in commit body.

For bug fixes specifically: failing test reproducing the bug is the FIRST artifact. Bug-fix without a regression test = incomplete fix.

## Exemptions (declare in PR description)

- Boot files (`main.ts`)
- Pure type declarations (`*.d.ts`, type-only files)
- ORM entity decorator-only files (no logic)

These count as "no logic — coverage non-goal". Anything with a branch or expression must be covered.

Required PR description line format per exemption: `Coverage exemption: <file> — <reason>` (e.g. `Coverage exemption: src/main.ts — boot file, no logic`).

## Anti-patterns

- "Best-effort coverage" without specific exemption call-out
- Coverage-pad tests (calling a function with no assertion) — counted as 0
- Skipping coverage for files outside the changed area — only allowed when truly untouched
- Coverage script (`test:cov`) not found → silently declaring 100%. Forbidden. Add a coverage script (e.g. `vitest run --coverage`) or queue `Q-COV-SETUP — missing coverage script`; do not declare 100% by omission.
- Coverage report generated but exit code non-zero (e.g. coverage threshold guard): counts as FAIL. Must be exit 0 AND every touched file present in the report.

## Interaction with other kzk-*

- **kzk-user-queue**: when a coverage gap is queued due to time constraint, use the entry template from that skill (`Q-COV-<FILE>` prefix).
- **kzk-pre-commit-gate**: Gate 3 (module test pass) is the execution; this skill is the coverage threshold applied to that same test run on touched files.
- **kzk-large-task-delegation**: two-stage review step 4 (coverage on touched files) references this skill's exemption rules.

exec
/bin/zsh -lc "sed -n '200,320p' skills/kzk-large-task-delegation/SKILL.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
```

**Forbidden**: omitting `model`. Implicit Opus is expensive and slow.

## Pre-implementation plan-critic loop (opus + codex)

Before dispatching the sonnet executor, the plan must clear this gate exactly once per Plan or per discrete task:

0. **`kzk-codebase-survey`** — EXPLORER agent runs all steps (Step 0.5 + Step 1–8), saves report to `docs/harness/surveys/YYYY-MM-DD-<topic>-survey.md`. Report path passed to planner and critic as required reading. Survey failure → note in report, continue.
1. main authors the plan or dispatches `planner` (opus) — **prompt must include survey report path as required reading**
2. Codex CLI consult on the plan draft (`codex exec` per `kzk-spec-and-review`) → returns concerns; CLI unavailable → `oh-my-claudecode:critic` opus
3. main edits plan (or dispatches `oh-my-claudecode:critic` opus) to address concerns — **critic prompt must include:** "Check the plan covers every item in Features to Preserve and Integration Points in the survey report. Any gap = FAIL."
4. on agreement, plan is frozen — written to `docs/plans/<file>.md` with a `## Frozen` header line
5. only frozen plans may feed a sonnet executor dispatch

2 consecutive critic / codex FAILs on the plan → halt + user-queue, no code is written. This is the autonomous-loop halt condition mirroring `kzk-autonomous-boundary`.

## Subagent prompt requirements (fresh subagent has zero memory)

Every dispatch prompt must include:

- Scope (file paths, line ranges)
- Plan file path (which task within) — **frozen plan only when dispatching to sonnet**
- Required reading list (CLAUDE.md, the spec doc, sister files)
- Rules block: TDD sequence (red-green-refactor — see kzk-test-coverage §TDD sequence; failing test BEFORE impl is non-negotiable in autonomous mode) + context7 mandate + `kzk-pre-commit-gate` (incl. **Gate 0 AGENTS.md sync** — touched-files AGENTS.md goes in the SAME commit) + DO-NOT-MODIFY paths + branch boundary (the session **branch contract** locked by `kzk-autonomous-boundary` — verify the current branch matches the contract via `git branch --show-current` before dispatch; `main` is allowed only if the contract authorized direct-main flow this session)
- Commit message convention (English conventional commits, no Co-Authored-By)
- Working directory absolute path
- Race-condition awareness (file scopes vs other parallel subagents)
- Return format on success
- Halt condition (blocked → user-queue entry)

### Sonnet executor — extra plan-detail requirements

When the target dispatch is `model=sonnet`, the plan must spell out — sonnet does not back-fill ambiguity, it either loops or fabricates:

- Exact file paths AND, where the change is mid-file, the anchor line content or stable nearby symbol
- Full function/component signatures with all parameter and return types written out
- Imports list (which symbol comes from which module)
- Edge cases enumerated as a bullet list, each with the expected behavior
- Test names + assertion shape (one bullet per test) — not "write tests for X" but "test name: should disable submit when slug fails regex; assert: button has [disabled]"
- Lint / formatting rules that apply (e.g. "no `any`, narrow with `unknown` + `instanceof Error`")
- "DO NOT" deltas — what changes are NOT permitted in this task
- AGENTS.md row text (since Gate 0 will demand it) — sonnet should land the AGENTS.md edit alongside the new file rather than skipping it

If the plan cannot be made this detailed, the task is not yet ready for sonnet — escalate to opus or run another plan-critic loop.

Typical prompt = 60-150 lines for opus, 100-220 lines for sonnet. Terse prompt = shallow work.

## Parallel dispatch

File-scope-disjoint tasks fire simultaneously: multiple `Agent` tool calls in one response, `run_in_background: true` so main can continue work and gets auto-notified.

Race avoidance:

- Same file region = sequential (one subagent owns it)
- git push race → subagent auto-handles with `git fetch && rebase && push`

## Two-stage review (mandatory after each subagent finishes)

Main verifies:

1. Trust-but-verify — `git log` + `git diff` + dist artifact directly
2. Build / test / Playwright (if applicable) result
3. Spec acceptance criteria
4. Coverage on touched files (per `kzk-test-coverage` — 100% line + branch on changed files; exemption only with explicit Q-COV-* entry in `docs/harness/user-queue.md`)

Trusting only the agent's summary text = forbidden.

## Session-6 lesson (do not repeat)

(2026-04-20, ui-migration-shadcn M7 HALT recovery): main context directly ran Edit + Bash + Playwright for M2/M4/M6 cleanup. Result: (1) main-context token bloat, (2) linter timestamp race → repeated Edit failures, (3) quality regressions — token gaps, `a` rule override, accent collisions all missed.

Re-prevention:

1. Detect "large" → immediately invoke `/superpowers:subagent-driven-development`
2. Skill demands `docs/plans/<name>.md` first (2-5 task TDD format)
3. Fresh subagent dispatch = `Agent` tool + `subagent_type="oh-my-claudecode:executor"` + `model="sonnet"` (default for implementation; see Model routing table) + frozen plan path + context7 mandate + Pre-commit Gates 0, 1, 1.5, 2, 3, 4 all in prompt
4. Main reviews subagent return → gate check → commit+push, OR re-dispatch fresh subagent on failure
5. 2 consecutive subagent failures → halt + user-queue entry. Main does NOT take over.

## Session-28 lesson (skill-load chain)

(2026-05-04, gridless grid bug bash): user said "이외에 스프레드 시트 기능 버그들 모두 개선해줘. 플랜 여러개로 쪼개고, 사이클 자율로 돌면서 사용성 버그 모두 잡아줘." Main loaded `kzk-codebase-survey` + `kzk-autonomous-boundary` correctly, dispatched the codebase survey to `oh-my-claudecode:explore` correctly — then proceeded to read 11+ files, edit 4 source files, run Playwright + docker rebuild **all directly in main**, never loading `kzk-large-task-delegation` and never dispatching an executor subagent for the actual fix. Token bloat + uncatchable regressions risk back.

Root cause: trigger keyword gap — '사용성 버그', '여러 plan 으로 쪼개', '사이클 자율' did not match this skill's description. Fixed in v1.2.0 (description trigger expansion) + `install/hooks/keyword-detector.mjs` activation (Cycle 28).

**Skill-load chain rule:** if `kzk-codebase-survey` is triggered for any task that will lead to edits (i.e., not a pure question), `kzk-large-task-delegation` MUST be loaded in the same turn. Survey alone defines *what to read*; delegation defines *who reads it and who writes back*. Loading survey without delegation = main has read context + no dispatch contract = anti-pattern by construction.

**Operational checks before any Edit/Write in main:**
1. Did the user phrase trigger any of: 'plan 쪼개', '사이클', '버그들 모두', '사용성', '전수조사', '구현 검증'? → load this skill (`kzk-large-task-delegation`).
2. Will main read ≥ 5 files this turn? → §Read-heavy audit dispatch shape mandates EXPLORER subagent.
3. Will main edit ≥ 3 files OR ≥ 200 LoC this turn? → §Model routing mandates fresh executor sonnet (opus only for plan/critic/verify).
4. If 1, 2, or 3 → re-route through subagent dispatch. Main keeps orchestration + verification + commit.

## Interaction with other kzk-*

- **kzk-spec-and-review**: This skill's "Pre-implementation plan-critic loop" is the narrower, in-skill version of `kzk-spec-and-review`'s broader spec/plan/architecture authoring + cross-vendor review. Use this skill's plan-critic when a single executor task needs a plan critic inline; use `kzk-spec-and-review` when the artifact is a standalone spec/plan/architecture doc that needs Step 0 codebase survey + 3-pass review.
- **kzk-codebase-survey**: Step 0 of any task ≥3 files / ≥200 LoC. Survey runs BEFORE this skill's planner dispatch.
- **kzk-test-coverage**: Step 4 of large-task delegation runs the same coverage check that test-coverage owns at session close.
- **kzk-pre-commit-gate**: Subagent prompt MUST echo the gate sequence so the executor commits with full Gate 0–4 awareness.
- **kzk-autonomous-boundary**: Halt protocol mirror — if a delegated subagent halts, this skill's caller must propagate to autonomous-boundary's halt rules.

exec
/bin/zsh -lc "sed -n '1,220p' install/test/run-tests.sh" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
#!/usr/bin/env bash
# install/test/run-tests.sh — pure-bash test harness for install-global.sh
# Run against a tempdir HOME (never the real ~/.claude):
#   HOME=$(mktemp -d) bash install/test/run-tests.sh
#
# Exit 0 = all tests passed. Exit 1 = one or more failures.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PASS=0
FAIL=0
ERRORS=()

# ---------------------------------------------------------------------------
# Minimal assert helpers
# ---------------------------------------------------------------------------
assert_eq() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    printf '  PASS: %s\n' "$desc"
    PASS=$((PASS + 1))
  else
    printf '  FAIL: %s (expected "%s", got "%s")\n' "$desc" "$expected" "$actual"
    FAIL=$((FAIL + 1))
    ERRORS+=("$desc")
  fi
}

assert_match() {
  local desc="$1" pattern="$2" haystack="$3"
  if printf '%s\n' "$haystack" | grep -qF "$pattern"; then
    printf '  PASS: %s\n' "$desc"
    PASS=$((PASS + 1))
  else
    printf '  FAIL: %s (pattern "%s" not found)\n' "$desc" "$pattern"
    FAIL=$((FAIL + 1))
    ERRORS+=("$desc")
  fi
}

assert_file_exists() {
  local desc="$1" path="$2"
  if [ -f "$path" ]; then
    printf '  PASS: %s\n' "$desc"
    PASS=$((PASS + 1))
  else
    printf '  FAIL: %s (file not found: %s)\n' "$desc" "$path"
    FAIL=$((FAIL + 1))
    ERRORS+=("$desc")
  fi
}

assert_exit_zero() {
  local desc="$1" code="$2"
  if [ "$code" -eq 0 ]; then
    printf '  PASS: %s\n' "$desc"
    PASS=$((PASS + 1))
  else
    printf '  FAIL: %s (exit code %s)\n' "$desc" "$code"
    FAIL=$((FAIL + 1))
    ERRORS+=("$desc")
  fi
}

# ---------------------------------------------------------------------------
# Helper: run install-global.sh with a fresh tempdir HOME
# Returns the temp HOME path via $TEST_HOME
# ---------------------------------------------------------------------------
run_install() {
  TEST_HOME=$(mktemp -d)
  HOME="$TEST_HOME" bash "$REPO_ROOT/install/install-global.sh" --yes 2>/dev/null
  return $?
}

# ---------------------------------------------------------------------------
# test_skill_files_landed
# All 14 ~/.claude/skills/kzk-*/SKILL.md must exist after install
# ---------------------------------------------------------------------------
test_skill_files_landed() {
  printf '\n[test_skill_files_landed]\n'
  local test_home
  test_home=$(mktemp -d)

  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1

  local count
  count=$(find "$test_home/.claude/skills" -maxdepth 2 -name 'SKILL.md' \
    -path '*/kzk-*/*' 2>/dev/null | wc -l | tr -d ' ')

  assert_eq "14 SKILL.md files landed" "14" "$count"

  rm -rf "$test_home"
}

# ---------------------------------------------------------------------------
# test_umbrella_dotfile
# ~/.claude/skills/.kzk-harness-shared/harness-share.md and VERSION must exist
# The dir must use the dotfile name (not kzk-harness-shared)
# ---------------------------------------------------------------------------
test_umbrella_dotfile() {
  printf '\n[test_umbrella_dotfile]\n'
  local test_home
  test_home=$(mktemp -d)

  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1

  assert_file_exists "harness-share.md in dotfile umbrella dir" \
    "$test_home/.claude/skills/.kzk-harness-shared/harness-share.md"

  assert_file_exists "VERSION in dotfile umbrella dir" \
    "$test_home/.claude/skills/.kzk-harness-shared/VERSION"

  # Must NOT exist at the non-dotfile path
  if [ -d "$test_home/.claude/skills/kzk-harness-shared" ]; then
    printf '  FAIL: non-dotfile umbrella dir exists (should be .kzk-harness-shared)\n'
    FAIL=$((FAIL + 1))
    ERRORS+=("test_umbrella_dotfile: non-dotfile dir must not exist")
  else
    printf '  PASS: non-dotfile umbrella dir absent\n'
    PASS=$((PASS + 1))
  fi

  rm -rf "$test_home"
}

# ---------------------------------------------------------------------------
# test_claude_md_marker
# ~/.claude/CLAUDE.md must have BEGIN/END markers and 14 kzk- rows inside
# ---------------------------------------------------------------------------
test_claude_md_marker() {
  printf '\n[test_claude_md_marker]\n'
  local test_home
  test_home=$(mktemp -d)

  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1

  local cfile="$test_home/.claude/CLAUDE.md"

  if grep -qF '<!-- BEGIN kzk-harness skills -->' "$cfile"; then
    printf '  PASS: BEGIN marker present\n'
    PASS=$((PASS + 1))
  else
    printf '  FAIL: BEGIN marker missing\n'
    FAIL=$((FAIL + 1))
    ERRORS+=("test_claude_md_marker: BEGIN marker")
  fi

  if grep -qF '<!-- END kzk-harness skills -->' "$cfile"; then
    printf '  PASS: END marker present\n'
    PASS=$((PASS + 1))
  else
    printf '  FAIL: END marker missing\n'
    FAIL=$((FAIL + 1))
    ERRORS+=("test_claude_md_marker: END marker")
  fi

  local row_count
  row_count=$(awk '/<!-- BEGIN kzk-harness skills -->/,/<!-- END kzk-harness skills -->/' "$cfile" |
    grep -cE '^\| kzk-' || true)
  assert_eq "14 kzk- rows in marker block" "14" "$row_count"

  rm -rf "$test_home"
}

# ---------------------------------------------------------------------------
# test_idempotent
# Running install twice produces no change to the marker block
# ---------------------------------------------------------------------------
test_idempotent() {
  printf '\n[test_idempotent]\n'
  local test_home
  test_home=$(mktemp -d)

  # First install
  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1

  # Snapshot the marker block after first run
  local snap1
  snap1=$(awk '/<!-- BEGIN kzk-harness skills -->/,/<!-- END kzk-harness skills -->/' \
    "$test_home/.claude/CLAUDE.md")

  # Touch a sentinel between runs
  local marker_file
  marker_file=$(mktemp)

  # Second install
  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1

  # Snapshot after second run
  local snap2
  snap2=$(awk '/<!-- BEGIN kzk-harness skills -->/,/<!-- END kzk-harness skills -->/' \
    "$test_home/.claude/CLAUDE.md")

  if [ "$snap1" = "$snap2" ]; then
    printf '  PASS: marker block unchanged after second install\n'
    PASS=$((PASS + 1))
  else
    printf '  FAIL: marker block changed between runs (not idempotent)\n'
    FAIL=$((FAIL + 1))
    ERRORS+=("test_idempotent: marker block changed")
  fi

  # Verify no new SKILL.md files were written (second run should not touch newer-than-sentinel)
  local new_files
  new_files=$(find "$test_home/.claude/skills" -name 'SKILL.md' \
    -newer "$marker_file" 2>/dev/null | wc -l | tr -d ' ')
  # Equal-version skills are re-copied (same bytes), that is acceptable; we check marker only
  printf '  INFO: %s SKILL.md files touched on second run (equal-version re-copy is OK)\n' "$new_files"

  rm -f "$marker_file"
  rm -rf "$test_home"
}

# ---------------------------------------------------------------------------
# test_omc_collision_warning
# A fake keyword-detector.mjs containing \bralph\b triggers the OMC warning
# Install exit code must be 0 (warning, not blocker)
# ---------------------------------------------------------------------------
test_omc_collision_warning() {

exec
/bin/zsh -lc 'rg -n "Subagent prompt requirements|Sonnet executor|Two-stage review|TDD sequence|Interaction with other kzk|version:|Triggers|Exemptions|Test Coverage" skills/kzk-large-task-delegation/SKILL.md skills/kzk-test-coverage/SKILL.md harness-share.md install/test/run-tests.sh' in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
skills/kzk-large-task-delegation/SKILL.md:3:version: 1.4.0
skills/kzk-large-task-delegation/SKILL.md:4:description: "Large tasks (3+ files / 200+ LoC / 5+ file read / multi-stage) dispatch to fresh subagents — main never executes. Top triggers: '큰 작업', '버그 전수조사', '사이클 자율', 'plan 쪼개', 'subagent dispatch'. Body §Triggers for full list."
skills/kzk-large-task-delegation/SKILL.md:11:## Triggers
skills/kzk-large-task-delegation/SKILL.md:108:- Version bump (`version: X.Y.Z` → `X.Y+1.0`)
skills/kzk-large-task-delegation/SKILL.md:161:Session-level effort is set via the Claude Code CLI banner (`Opus 4.7 with xhigh effort`). Drop the banner to `high` for cycles consisting mostly of mechanical work; bump back to `xhigh` before opening a plan / critic dispatch. Sonnet executor and haiku mechanical: thinking is implicit in session default; do not tune separately.
skills/kzk-large-task-delegation/SKILL.md:217:## Subagent prompt requirements (fresh subagent has zero memory)
skills/kzk-large-task-delegation/SKILL.md:224:- Rules block: TDD sequence (red-green-refactor — see kzk-test-coverage §TDD sequence; failing test BEFORE impl is non-negotiable in autonomous mode) + context7 mandate + `kzk-pre-commit-gate` (incl. **Gate 0 AGENTS.md sync** — touched-files AGENTS.md goes in the SAME commit) + DO-NOT-MODIFY paths + branch boundary (the session **branch contract** locked by `kzk-autonomous-boundary` — verify the current branch matches the contract via `git branch --show-current` before dispatch; `main` is allowed only if the contract authorized direct-main flow this session)
skills/kzk-large-task-delegation/SKILL.md:231:### Sonnet executor — extra plan-detail requirements
skills/kzk-large-task-delegation/SKILL.md:257:## Two-stage review (mandatory after each subagent finishes)
skills/kzk-large-task-delegation/SKILL.md:294:## Interaction with other kzk-*
harness-share.md:274:### Two-stage review (subagent-driven-development skill 의무)
harness-share.md:469:## 11. Test Coverage 100% on Changed Code
skills/kzk-test-coverage/SKILL.md:3:version: 1.2.0
skills/kzk-test-coverage/SKILL.md:4:description: "TDD-strict + 100% line+branch coverage on changed files — failing test FIRST (red), impl (green), refactor, commit. Top triggers: 'TDD', 'test first', '테스트 먼저', 'test coverage', 'coverage exemption'. Body §Triggers for full list."
skills/kzk-test-coverage/SKILL.md:11:## Triggers
skills/kzk-test-coverage/SKILL.md:23:## TDD sequence (mandatory in autonomous mode)
skills/kzk-test-coverage/SKILL.md:36:## Exemptions (declare in PR description)
skills/kzk-test-coverage/SKILL.md:54:## Interaction with other kzk-*

codex
1. **Acceptance criteria 충실성**  
대체로 1-5, 7, 8은 task에 매핑된다. 문제는 6이 사실상 “아무것도 안 함”이라 검증 불가이고, 문서 헤더가 아직 `spec rev5` / 순서 `A→D→B→C`로 남아 있어 rev6 기준 문서라는 전제가 이미 깨져 있다.  
권고: Plan A 헤더와 commit body의 spec ref를 rev6로 고치고, acceptance 6은 “no-op 확인” 문장 대신 명시적 점검 항목으로 바꿔라.

2. **Task detail 충실성**  
Task 2의 inject 위치는 대략 보이지만, “자동 inject”가 “섹션 참조”인지 “프롬프트에 literal block 복붙”인지 불명확하다. fresh agent 상대로 참조만 적으면 실패한다. Task 1 Anti-pattern 본문도 “hook/install 인프라 read 는 항상 허용 (TDD red 가 아닌 디버깅 목적)” 문장이 자기모순이다.  
권고: “Rules block에 아래 literal boilerplate를 그대로 포함”으로 못 박아라. Anti-pattern 예외 문구는 “red 단계 중에도 harness/hook debugging 필요 시 예외 허용”으로 다시 써라.

3. **Layer (b) 자율 mode 룰 정확성**  
여기서 틀어졌다. spec lock은 `KZK_AUTONOMOUS=1 우선`, 없으면 동사구 키워드다. Plan A는 `KZK_AUTONOMOUS=0 override`를 새로 넣었다. 이건 prior decision 이탈이다. 게다가 Task 3 요약은 “`KZK_AUTONOMOUS=1` 또는 동사구 매칭”이라 `env unset 시만` 조건도 빠뜨렸다.  
권고: `=0 override` 삭제. 모든 문서에서 판별 규칙을 rev6 문구로 통일해라.

4. **Test 전략**  
현재 grep은 너무 약하다. 문자열 존재만 보니 핵심 실패를 거의 못 잡는다. 잘못된 우선순위, `env unset` 누락, 명사 단독 금지 누락, literal inject 미실시, unwanted `KZK_AUTONOMOUS=0` 추가를 전부 놓친다.  
권고: positive grep 추가: `환경변수 unset 시`, `명사 단독`, `fresh sonnet dispatch`, `BLOCKED 반환`. negative grep 추가: `KZK_AUTONOMOUS=0`. 가능하면 section anchor 범위 grep도 넣어라.

5. **Rollback**  
불충분하다. `DISABLE_OMC=kzk-test-coverage`는 Layer (b)만 끄고 Layer (a) boilerplate는 `kzk-large-task-delegation`에 남는다.  
권고: Plan A 전용 disable path를 적거나, 최소한 `DISABLE_OMC=kzk-large-task-delegation` 영향까지 같이 문서화해라.

6. **Cross-skill 영향**  
`Q-TDD-MAIN` 큐 엔트리와 “autonomous-boundary halt 룰과 통합”을 적어놓고 정작 `kzk-autonomous-boundary`나 queue contract 문서는 안 건드린다. split-brain 난다.  
권고: Plan A 범위 밖이면 “contract only, implementation in boundary skill later”라고 낮추든지, 아니면 관련 skill cross-ref를 같이 수정해라.

7. **놓친 함정**  
비-자율 mode의 “user ACK 게이트”가 너무 추상적이다. 어떤 문구가 ACK인지 정의가 없어서 매번 임의 해석된다. 또 trigger/description에 `KZK_AUTONOMOUS`를 넣는 건 env var와 user trigger를 혼동시킨다.  
권고: ACK 허용 문구 예시를 고정하고, trigger 목록에서 env var 이름은 빼라.

Bottom-line: **REVISE**
tokens used
45,467
1. **Acceptance criteria 충실성**  
대체로 1-5, 7, 8은 task에 매핑된다. 문제는 6이 사실상 “아무것도 안 함”이라 검증 불가이고, 문서 헤더가 아직 `spec rev5` / 순서 `A→D→B→C`로 남아 있어 rev6 기준 문서라는 전제가 이미 깨져 있다.  
권고: Plan A 헤더와 commit body의 spec ref를 rev6로 고치고, acceptance 6은 “no-op 확인” 문장 대신 명시적 점검 항목으로 바꿔라.

2. **Task detail 충실성**  
Task 2의 inject 위치는 대략 보이지만, “자동 inject”가 “섹션 참조”인지 “프롬프트에 literal block 복붙”인지 불명확하다. fresh agent 상대로 참조만 적으면 실패한다. Task 1 Anti-pattern 본문도 “hook/install 인프라 read 는 항상 허용 (TDD red 가 아닌 디버깅 목적)” 문장이 자기모순이다.  
권고: “Rules block에 아래 literal boilerplate를 그대로 포함”으로 못 박아라. Anti-pattern 예외 문구는 “red 단계 중에도 harness/hook debugging 필요 시 예외 허용”으로 다시 써라.

3. **Layer (b) 자율 mode 룰 정확성**  
여기서 틀어졌다. spec lock은 `KZK_AUTONOMOUS=1 우선`, 없으면 동사구 키워드다. Plan A는 `KZK_AUTONOMOUS=0 override`를 새로 넣었다. 이건 prior decision 이탈이다. 게다가 Task 3 요약은 “`KZK_AUTONOMOUS=1` 또는 동사구 매칭”이라 `env unset 시만` 조건도 빠뜨렸다.  
권고: `=0 override` 삭제. 모든 문서에서 판별 규칙을 rev6 문구로 통일해라.

4. **Test 전략**  
현재 grep은 너무 약하다. 문자열 존재만 보니 핵심 실패를 거의 못 잡는다. 잘못된 우선순위, `env unset` 누락, 명사 단독 금지 누락, literal inject 미실시, unwanted `KZK_AUTONOMOUS=0` 추가를 전부 놓친다.  
권고: positive grep 추가: `환경변수 unset 시`, `명사 단독`, `fresh sonnet dispatch`, `BLOCKED 반환`. negative grep 추가: `KZK_AUTONOMOUS=0`. 가능하면 section anchor 범위 grep도 넣어라.

5. **Rollback**  
불충분하다. `DISABLE_OMC=kzk-test-coverage`는 Layer (b)만 끄고 Layer (a) boilerplate는 `kzk-large-task-delegation`에 남는다.  
권고: Plan A 전용 disable path를 적거나, 최소한 `DISABLE_OMC=kzk-large-task-delegation` 영향까지 같이 문서화해라.

6. **Cross-skill 영향**  
`Q-TDD-MAIN` 큐 엔트리와 “autonomous-boundary halt 룰과 통합”을 적어놓고 정작 `kzk-autonomous-boundary`나 queue contract 문서는 안 건드린다. split-brain 난다.  
권고: Plan A 범위 밖이면 “contract only, implementation in boundary skill later”라고 낮추든지, 아니면 관련 skill cross-ref를 같이 수정해라.

7. **놓친 함정**  
비-자율 mode의 “user ACK 게이트”가 너무 추상적이다. 어떤 문구가 ACK인지 정의가 없어서 매번 임의 해석된다. 또 trigger/description에 `KZK_AUTONOMOUS`를 넣는 건 env var와 user trigger를 혼동시킨다.  
권고: ACK 허용 문구 예시를 고정하고, trigger 목록에서 env var 이름은 빼라.

Bottom-line: **REVISE**
