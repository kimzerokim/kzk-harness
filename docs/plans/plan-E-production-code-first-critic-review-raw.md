OpenAI Codex v0.120.0 (research preview)
--------
workdir: /Users/kimzerokim/work/personal/kzk-harness
model: gpt-5.4
provider: openai
approval: never
sandbox: read-only
reasoning effort: high
reasoning summaries: none
session id: 019df2e6-7b6d-74b1-92b7-46d5d7031679
--------
user
Plan E draft (rev1) 검토. brutally honest, 한국어, no compliments.

## Read 의무

`/Users/kimzerokim/work/personal/kzk-harness/docs/plans/regression-memory-and-fix-quality-spec.md` (spec rev7, frozen)
`/Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-E-production-code-first.md` (rev1)
`/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-production-access/SKILL.md` (강화 대상)

## Context

Plan E = 마지막 plan (5/5). `kzk-production-access` v1.1 → v1.2 강화만 (신규 skill 없음). production state 변경 = 코드 우선 + 멱등성 + 트래킹. AI 직접 호출 금지.

## LOCKED PRIOR DECISIONS

- Plan 순서 A→D→B→C→E. Plan E 마지막
- 신규 skill 없음 — production-access 강화만
- spec rev7 Axis E lock — code-first / 멱등성 / trackable / 환경 설정 예외 / forward-only drift

## Plan E open questions (사용자 / codex 결정)

1. Gate 1.6 grep 패턴 — false positive/negative 균형
2. 환경 설정 예외 boundary — IaC-managed env var 면 code-first 적용?
3. Plan A boilerplate 와 동시 trigger 시 prompt 비대화 위험
4. Drift forward-only — revert commit 차단?
5. Cross-axis timing — Plan B/D rollback 시 dead link?

## YOUR JOB — 12 카테고리

1. **Axis E acceptance cover?** — task 1-8 매핑, 12 AC?
2. **Code-first boilerplate** — kzk-large-task-delegation §inject 룰 정확? Plan A boilerplate 와 충돌 없음?
3. **Gate 1.6 grep 패턴** — false positive/negative? `psql ... ALTER` / `aws iam create-policy` / `aws s3api put-` / 비-멱등 SQL — 정확?
4. **환경 설정 예외** — env var rotation / OAuth credential — boundary 명확? IaC-managed env var 분기?
5. **Drift forward-only** — revert commit 차단 또는 허용?
6. **AI access 흐름** — script 작성 → 사용자 review → 사용자/CI 실행. AI 직접 호출 금지 — read-only inspection 정의 명확?
7. **Cross-axis (B 의 fix-scope, D 의 cycle 회고)** — production change 통합 룰 정확?
8. **harness-share.md §17.X 추가** — single SoT? Plan A §11.1 + Plan B §3.5 + Plan C §3 Gate 5 + Plan E §17.X 통합 일관성?
9. **Test 전략** — skill-text-checks.sh 확장 적정?
10. **Rollback 6-level** — 신규 skill 없으니 더 simpler 일 수도?
11. **Skill count** — 16 유지 (Plan E 신규 skill 없음). sync 안 함 — 정확?
12. **놓친 함정** — Plan E 단계에서 spec 흡수 안 된 회색지대.

각 항목: 짧은 진단 + 권고. fine 이면 "none". 마지막 줄 "Bottom-line: SHIP" 또는 "REVISE".

500단어 이내.

codex
요청한 Plan E rev1을 spec rev7과 `kzk-production-access` 강화안 기준으로 대조해 보겠습니다. 먼저 지정한 3개 문서를 읽고, Axis E 수용 범위와 충돌 지점을 항목별로 압축해서 정리하겠습니다.
exec
/bin/zsh -lc "sed -n '1,260p' /Users/kimzerokim/work/personal/kzk-harness/docs/plans/regression-memory-and-fix-quality-spec.md" in /Users/kimzerokim/work/personal/kzk-harness
exec
/bin/zsh -lc "sed -n '1,320p' /Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-E-production-code-first.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
# Spec — Regression Memory + Fix Quality + Production-Code-First 통합 (rev7)

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
| sidecar 만 사용하는 필드 (7필드): `key` (FK), `dismiss_count`, `last_dismissed_at`, `file_snapshot` (file:line@SHA), `related_cycles`, `archived`, `stale` (Plan D rev2 와 sync — stale flag in-disk persistence) | cycle 1 blind spots, cycle 2 #5, Plan D codex cycle 1 #1/#12 |
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
  stale: false | true  # Plan D rev2 — file_snapshot SHA mismatch 시 stale-check 가 set
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
- 5 plan 모두 끝나고 `kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 받은 후)
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
- 5 plan 모두 완료 후: `kzk-pre-merge-sync` (CLAUDE.md sync, deepinit) → `git checkout main && git merge feature/memory --no-ff`
- 각 plan 별 codex review 의무. **codex CLI stdin path 재시도** (cycle 1 #12.3): `printf '%s' "$prompt" | codex exec - -s read-only -c '...' --json | jq ...`. 2회 실패 → critic opus fallback. 5 plan 중 최소 2개 codex CLI 성공 목표.
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

 succeeded in 0ms:
# Plan E — Production Code-First + 멱등성 (kzk-production-access 강화) — rev1 draft

> Spec: `docs/plans/regression-memory-and-fix-quality-spec.md` (rev7, frozen — §Axis E).
> Branch: `feature/memory`. Order: A → D → B → C → **E (last)**.
> Status: **Draft** (codex review pending. spec §메타 룰 — 4 plan 중 최소 2개 codex CLI 성공 목표 포함).
> Critic review verdict: TBD (`plan-E-production-code-first-critic-review.md`).

## Goal

`kzk-production-access` 스킬을 v1.1 → v1.2 으로 업그레이드. AI 가 production state (DB schema / IAM policy / S3 lifecycle / Lambda env / CloudFront origin 등) 를 직접 호출 (psql `ALTER TABLE` / `aws iam create-policy` / SSM 즉시 실행) 해 마이그레이션·IaC drift 를 만드는 메타갭을 차단한다.

핵심 원칙:
- **Code-first**: production state 변경 = migration / IaC / shell script 로 작성. git tracked.
- **직접 호출 금지**: ad-hoc 실행 X. read-only inspection 만 OK.
- **멱등성 의무**: `IF NOT EXISTS`, `--if-not-exists`, conditional skip — 두 번 실행해도 안전.
- **Drift 발견 시 forward-only**: 현 상태 반영하는 새 migration 추가 (revert 금지).
- **환경 설정 예외 명시**: env var, secret 회전, OAuth credential 갱신 — code 외 unavoidable. 기존 explicit-instruction rule 적용.

신규 skill 없음. 기존 16th skill `kzk-production-access` 강화만 (Plan B/D 가 14→16 했으므로 skill count 그대로).

## Acceptance Criteria

1. `skills/kzk-production-access/SKILL.md` v1.2 — `## Production state changes — code-first + 멱등성` 섹션 신규. code-first 룰 + 직접 호출 금지 + 멱등성 의무 + drift forward-only + 환경 설정 예외 + AI access 시 script 작성 → 사용자 review 흐름 명시
2. `skills/kzk-production-access/SKILL.md` 의 §Triggers 섹션에 신규 키워드 추가 — `migration`, `schema change`, `IaC`, `Terraform`, `code-first`, `멱등성`, `idempotent`, `drift`, `forward-only`
3. `skills/kzk-production-access/SKILL.md` §Anti-patterns 섹션에 ad-hoc 실행 패턴 3개 이상 추가 (예: `psql ... ALTER TABLE`, `aws iam create-policy` 즉시 실행, `aws s3 lifecycle-configuration` 즉시 실행)
4. `skills/kzk-production-access/SKILL.md` §Interaction with other kzk-* 섹션 갱신 — Axis B (`kzk-fix-scope-expansion`) cross-ref + Axis D (`kzk-regression-memory`) cross-ref 추가
5. `harness-share.md` §17 (또는 production access 해당 섹션) 신규 subsection — code-first + 멱등성 + drift forward-only 룰 본문 + Axis B/D cross-ref
6. `skills/kzk-large-task-delegation/SKILL.md` — production access task 시 sonnet/opus dispatch prompt 의 Rules block 에 production-code-first boilerplate 자동 inject 룰 추가 (Plan A 의 anti-self-verification boilerplate 와 동일 패턴)
7. `skills/kzk-pre-commit-gate/SKILL.md` — production-touching commit 시 code-first 검증 step 추가 (예: `git diff` 에서 `psql ... ALTER`, `aws iam create-policy`, `aws s3api put-` 같은 ad-hoc 실행 흔적 grep — 발견 시 commit halt + script 변환 요청). 기존 Gate 0–4 흐름에 Gate 4.6 또는 Gate 1.6 으로 삽입 (위치는 Task 5 에서 확정)
8. `install/test/skill-text-checks.sh` 갱신 (Plan A 가 만든 파일) — kzk-production-access SKILL.md v1.2 의 §Production state changes 섹션 grep + boilerplate 키워드 grep + harness-share §17 cross-ref grep + kzk-large-task-delegation production-code-first boilerplate grep + kzk-pre-commit-gate code-first 검증 grep
9. `bash install/test/run-tests.sh` PASS
10. **CLAUDE.md / README.md skill count 검증 — Plan E 변경 없음 확인**: `git diff CLAUDE.md README.md` 결과에 skill count line / "All N skills" line 포함 안 됨 명시 점검 (Plan E 는 신규 skill 없음 — count 16 유지)
11. atomic commit 메시지: `feat(skill): kzk-production-access v1.2 — code-first + 멱등성 (Plan E)`
12. Codex CLI review (또는 fallback critic opus) 통과 후 frozen 표기

## Variables

- `SKILL_PA = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-production-access/SKILL.md`
- `SKILL_LTD = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-large-task-delegation/SKILL.md`
- `SKILL_PCG = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-pre-commit-gate/SKILL.md`
- `SHARE = /Users/kimzerokim/work/personal/kzk-harness/harness-share.md`
- `TEST_CHECKS = /Users/kimzerokim/work/personal/kzk-harness/install/test/skill-text-checks.sh`
- `TEST_RUN = /Users/kimzerokim/work/personal/kzk-harness/install/test/run-tests.sh`
- `CLAUDE_MD = /Users/kimzerokim/work/personal/kzk-harness/CLAUDE.md`
- `README = /Users/kimzerokim/work/personal/kzk-harness/README.md`

## Tasks

### Task 1 — `kzk-production-access/SKILL.md` v1.2

**File**: `$SKILL_PA`

**Frontmatter 변경**:
- `version: 1.1.0` → `version: 1.2.0`
- description 끝에 trigger 추가: `'migration'`, `'IaC'`, `'멱등성'`, `'idempotent'`, `'drift'`, `'forward-only'`, `'code-first'`

**§Triggers 갱신** — 끝에 추가:
```
`migration`, `schema change`, `IaC`, `Terraform`, `CloudFormation`, `Pulumi`,
`code-first`, `멱등성`, `idempotent`, `IF NOT EXISTS`, `drift`, `forward-only migration`.
```

**신규 섹션** — 기존 `## Multi-step sequence` 다음, `## Credential handling` 직전에 삽입:

```markdown
## Production state changes — code-first + 멱등성

Production state 변경 (DB schema / IAM policy / S3 lifecycle / Lambda env / CloudFront origin 등) 시:

1. **코드 우선**: migration 파일 (`migrations/`) / IaC (Terraform / CloudFormation / Pulumi) / shell script (`scripts/prod/`) 로 작성. git tracked. 프로젝트 컨벤션 따름.
2. **직접 호출 금지**: `psql ... ALTER TABLE` / `aws iam create-policy` / `aws s3api put-bucket-lifecycle-configuration` / `aws lambda update-function-configuration` 즉시 실행 X. ad-hoc 실행 후 사후 기록 금지.
3. **멱등성 의무**: 작성하는 script 는 두 번 실행해도 안전.
   - SQL: `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
   - AWS CLI: `--if-not-exists` 또는 `describe-*` 선행 후 conditional skip
   - Terraform: `terraform plan` 결과 idempotent 확인
   - 1회용 ad-hoc 명령 금지
4. **AI 가 production access 받은 경우**:
   - script 작성 → 사용자 review/승인 → 사용자 또는 CI 가 실행
   - AI 가 직접 production 호출 금지 (read-only inspection 예: `aws s3 ls`, `aws rds describe-db-instances`, `psql -c '\dt'` 만 OK)
5. **Drift 발견 시 forward-only**:
   - 현 상태 반영하는 새 migration 추가 (revert 금지)
   - `git revert + 재적용` 패턴 금지 — production 은 시간 역행 X
   - 예: 누가 production 에서 `ALTER TABLE users ADD COLUMN xyz INT` 직접 실행 → drift 발견 시 → `migrations/20XX-add-users-xyz-column.sql` 추가 (idempotent: `IF NOT EXISTS`). 기존 코드 revert X.

### 환경 설정 예외 (code-first 면제)

다음은 code-first 룰 면제 — code 외 unavoidable. 기존 §Permission model 의 explicit-instruction rule 만 적용:

- 환경변수 갱신 (production env, AWS Lambda env update — 단 IaC 가 env 관리하면 code-first 적용)
- secret 회전 (rotation — AWS Secrets Manager / Vault 의 자동 rotation 외 manual 회전)
- OAuth credential 갱신 (refresh token expire 시 manual 발급)

위 면제 항목도 사용자 explicit instruction 의무. AI 가 자기 판단으로 회전·갱신 X.

### 자가 점검 (production state 변경 직전)

> "이 변경이 production state 를 바꾸는가? Yes 면 — script 작성했는가? script 가 멱등성인가? git tracked 인가? 사용자 review 받았는가?"
> 4개 모두 Yes 가 아니면 halt + user-queue entry `Q-PROD-CODE-FIRST-<TOPIC>`.
```

**§Anti-patterns 섹션 갱신** — 기존 항목 끝에 추가:

```markdown
- **Ad-hoc DB schema 변경**: `psql -c "ALTER TABLE users ADD COLUMN xyz"` 직접 실행 — 마이그레이션 drift, 트래킹 불가. 대신 `migrations/<timestamp>-add-users-xyz.sql` (idempotent) 작성 → 사용자 review → CI/사용자 실행.
- **Ad-hoc IAM 변경**: `aws iam create-policy --policy-document '{...}'` 직접 실행 — IaC drift. 대신 Terraform / CloudFormation 으로 작성 → plan 검토 → apply.
- **Ad-hoc S3 lifecycle 변경**: `aws s3api put-bucket-lifecycle-configuration` 직접 실행 — drift. 대신 IaC 또는 git tracked script.
- **Drift 를 revert 로 해결**: production 에 누가 직접 변경한 것을 발견하고 `git revert <원래 코드>` 시도 — production 은 시간 역행 X. 대신 forward-only migration 추가.
- **비-멱등 1회용 script**: `INSERT INTO migrations VALUES (1, ...)` (PK 충돌 시 두 번 실행 fail) — `INSERT ... ON CONFLICT DO NOTHING` 으로 변경.
```

**§Interaction with other kzk-* 갱신** — 기존 항목 끝에 추가:

```markdown
- **kzk-fix-scope-expansion** (Axis B): production fix 의 callsite 전수 = migration 의 영향 schema/표/index 전수. fix-scope-expansion hook 이 production access keyword (`migration`, `schema change`, `IaC`, `Terraform`) trigger 시에도 발동 — production 변경의 cross-cutting 영향 (예: `users` 표 schema 변경 → 영향 받는 query / ORM model / API contract 전수) 검사.
- **kzk-regression-memory** (Axis D): production change 회고 entry 의 type=`pattern`, key=`prod-<change-slug>` (예: `prod-users-add-xyz-column`). 같은 location 재변경 시 recall hook 이 과거 fix 정보 inject. 회고 entry 의 file_snapshot 은 migration 파일 path:line@SHA.
- **kzk-large-task-delegation**: production access task 의 sonnet/opus dispatch prompt 의 Rules block 에 production-code-first boilerplate 자동 inject (Plan A 의 anti-self-verification boilerplate 와 동일 패턴 — fresh agent 는 SKILL.md 자동 read X 라 literal boilerplate 의무).
- **kzk-pre-commit-gate**: production-touching commit 의 Gate 단계에서 ad-hoc 실행 흔적 (`psql ... ALTER`, `aws iam create-policy`, `aws s3api put-`, `aws lambda update-function-configuration` 등) grep 검증. 발견 시 commit halt + script 변환 요청.
```

### Task 2 — `kzk-large-task-delegation/SKILL.md` boilerplate

**File**: `$SKILL_LTD`

**§Sonnet executor — extra plan-detail requirements** 끝에 신규 subsection 추가 (Plan A 의 `### Anti-self-verification boilerplate (Plan A)` 다음 위치):

```markdown
### Production-code-first boilerplate (Plan E)

Sonnet/opus executor dispatch prompt 의 Rules block 에 다음 boilerplate 자동 inject (production state 변경 시 ad-hoc 실행 차단):

\`\`\`
[PRODUCTION-CODE-FIRST RULE — kzk-production-access §Production state changes]
이 task 가 production state 변경 (DB schema / IAM policy / S3 lifecycle / Lambda env / IaC 등) 을 포함한다면:
- 변경은 코드 (migration / IaC / git tracked script) 로 작성. ad-hoc 실행 (psql ALTER, aws iam create-policy, aws s3api put-, aws lambda update-function-configuration) 금지
- 멱등성 의무: IF NOT EXISTS / --if-not-exists / conditional skip. 두 번 실행해도 안전
- AI 가 직접 production 호출 금지 — script 작성 → 사용자 review → 사용자/CI 실행. read-only inspection (aws s3 ls, describe-*, \dt) 만 OK
- Drift 발견 시 forward-only migration 추가. revert 금지
- 환경 설정 예외 (env var / secret 회전 / OAuth) 는 explicit-instruction rule 만 적용
위반 시 task BLOCKED 반환 + plan revision 요청.
\`\`\`

이 boilerplate 는 sonnet/opus dispatch prompt 의 Rules block 에 의무 inject (production access trigger keyword 매칭 시). 메인이 dispatch prompt 작성 시 boilerplate 누락 = §Two-stage review FAIL.

**Trigger 매칭 키워드** (메인이 dispatch prompt 작성 시 본 boilerplate 자동 inject 대상):
- `production`, `prod`, `migration`, `schema change`, `ALTER TABLE`, `IaC`, `Terraform`, `CloudFormation`, `IAM`, `S3 lifecycle`, `Lambda env`, `RDS`, `aws-vault`
- 사용자 prompt 가 위 키워드 포함 시 메인은 dispatch prompt 작성 시 본 boilerplate 의무 inject
```

### Task 3 — `kzk-pre-commit-gate/SKILL.md` ad-hoc 실행 흔적 검증

**File**: `$SKILL_PCG`

**Position**: Plan E commit 시점에 정확 위치는 executor 가 SKILL.md read 후 결정 (kzk-pre-commit-gate 의 Gate 0–4 흐름 본문 읽고 가장 자연스러운 위치 — 권장 위치 Gate 1.6 (Gate 1.5 secrets scan 다음, Gate 2 build 직전) 또는 별도 Gate 4.6).

**신규 섹션** (위치 executor 결정 — 권장 Gate 1.6 또는 Gate 4.6):

```markdown
## Gate 1.6 — Production code-first 검증 (Plan E)

> Authoritative source: `kzk-production-access` §Production state changes. On conflict, that wins.

production-touching commit 시 git diff 에서 ad-hoc 실행 흔적 grep — 발견 시 commit halt.

**검증 대상 패턴** (commit message body / staged diff / 새 파일 본문 grep):

| 패턴 | 의미 | 권장 대안 |
|---|---|---|
| `psql .* ALTER TABLE` 또는 `psql .* DROP TABLE` 또는 `psql .* CREATE INDEX` 직접 실행 흔적 | DB schema ad-hoc 변경 | `migrations/<timestamp>-<slug>.sql` (idempotent) |
| `aws iam create-policy` / `aws iam put-policy` / `aws iam attach-role-policy` 직접 실행 흔적 | IAM ad-hoc 변경 | Terraform / CloudFormation |
| `aws s3api put-bucket-lifecycle-configuration` / `aws s3api put-bucket-policy` 직접 실행 흔적 | S3 ad-hoc 변경 | IaC 또는 git tracked script |
| `aws lambda update-function-configuration` 직접 실행 흔적 | Lambda env ad-hoc 변경 | IaC (Lambda env 의 경우 환경 설정 예외 검토 — 본 SKILL.md §Environment exceptions 참조) |
| `INSERT INTO ... VALUES` (멱등성 X — `ON CONFLICT` 절 없음) | 비-멱등 SQL | `ON CONFLICT DO NOTHING` 또는 `MERGE` |

**Trigger 조건** (Gate 1.6 진입 조건):
- staged diff 에 production-related 파일 변경 (`migrations/`, `infra/`, `scripts/prod/`, `terraform/`, `*.tf`, `*.tfvars`, `serverless.yml`, `cloudformation/`, `cdk/`)
- 또는 commit message 에 production keyword (`production`, `prod`, `migration`, `IaC`, `Terraform`)

**검증 명령** (executor 가 실제 명령 결정 — 권장 grep + git diff):

\`\`\`bash
# Ad-hoc 실행 흔적 검증
git diff --cached | grep -E '(psql.+ALTER|psql.+DROP TABLE|psql.+CREATE INDEX|aws iam create-policy|aws iam put-policy|aws s3api put-bucket-(lifecycle-configuration|policy)|aws lambda update-function-configuration)' && echo "[Gate 1.6 FAIL] ad-hoc production 실행 흔적 발견" && exit 1

# 멱등성 검증 (SQL — ON CONFLICT 또는 IF NOT EXISTS 의무)
git diff --cached --name-only | grep -E '\.sql$' | xargs grep -L -E '(IF NOT EXISTS|ON CONFLICT|IF EXISTS)' && echo "[Gate 1.6 WARN] 멱등성 키워드 부재 SQL 파일 발견 — 의도 확인" && exit 0  # WARN only
\`\`\`

**FAIL 시 동작**:
- commit halt
- 사용자에게 출력: "Gate 1.6 — production code-first 위반. ad-hoc 실행 흔적 발견. script (`migrations/` 또는 `infra/`) 로 변환 후 재시도."
- user-queue entry `Q-PROD-CODE-FIRST-<COMMIT-HASH>` 자동 append

**Skip 조건** (Gate 1.6 미발동):
- staged diff 에 production-related 파일 없음
- commit message 가 doc-only (`docs(`, `chore(`, `style(` prefix)
- 환경 설정 예외 (env var / secret 회전 / OAuth) 명시 commit — commit message body 에 `[env-exception]` tag 포함 시 (사용자 explicit 표기)
```

**§Interaction with other kzk-* 갱신** — 기존 항목 끝에 추가:
```markdown
- **kzk-production-access** (Axis E): Gate 1.6 의 ad-hoc 실행 흔적 검증 룰의 source of truth. 본 skill 은 검증 step 만 실행, 룰 본문은 kzk-production-access §Production state changes 참조.
```

### Task 4 — `harness-share.md` §17 (또는 production access 섹션) 신규 subsection

**File**: `$SHARE`

**Position**: executor 가 read 후 production access 해당 섹션 (`§17` 또는 인접 번호 — kzk-production-access 의 frontmatter `Authoritative source: harness-share.md §2` 와 spec 본문 `§17 production access` 사이의 모순은 read 후 확인 후 정정. spec rev7 §메타 룰의 가이드 따라 정확 §번호는 read 후 결정).

**신규 subsection**:

```markdown
### §17.X Production code-first + 멱등성 (Plan E)

Production state 변경 (DB schema / IAM policy / S3 lifecycle / Lambda env / CloudFront origin) 의 메타갭 차단.

**핵심 룰**:
- **코드 우선**: migration / IaC / shell script 로 작성. git tracked.
- **직접 호출 금지**: `psql ... ALTER TABLE`, `aws iam create-policy`, `aws s3api put-bucket-lifecycle-configuration`, `aws lambda update-function-configuration` 즉시 실행 X. read-only inspection (`aws s3 ls`, `describe-*`, `\dt`) 만 OK.
- **멱등성 의무**: `IF NOT EXISTS`, `--if-not-exists`, `ON CONFLICT DO NOTHING`, conditional skip. 두 번 실행해도 안전.
- **AI 가 production access 받은 경우**: script 작성 → 사용자 review/승인 → 사용자 또는 CI 가 실행. AI 직접 production 호출 금지.
- **Drift 발견 시**: forward-only migration 추가 (revert 금지).
- **환경 설정 예외**: env var / secret 회전 / OAuth credential 갱신 — code 외 unavoidable. 기존 explicit-instruction rule 적용.

**룰 본문**: `kzk-production-access` §Production state changes — code-first + 멱등성.

**Cross-axis 통합**:
- **Axis B (`kzk-fix-scope-expansion`)**: production fix 의 callsite 전수 = migration 의 영향 schema/표/index 전수. fix-scope-expansion hook 이 production access keyword trigger 시에도 발동.
- **Axis D (`kzk-regression-memory`)**: production change 회고 entry 의 type=`pattern`, key=`prod-<change-slug>`. 같은 location 재변경 시 recall hook 이 과거 fix 정보 inject.

**Enforcement layer**:
- Layer (a) — `kzk-large-task-delegation` §Production-code-first boilerplate (Plan E) — sonnet/opus dispatch prompt 의 Rules block 에 자동 inject
- Layer (b) — `kzk-pre-commit-gate` Gate 1.6 (또는 Gate 4.6) — staged diff 에서 ad-hoc 실행 흔적 grep, FAIL 시 commit halt
```

### Task 5 — `install/test/skill-text-checks.sh` 갱신 (Plan A 가 만든 파일)

**File**: `$TEST_CHECKS`

Plan A 가 신규 작성한 `skill-text-checks.sh` 의 마지막 (printf 종합 결과 직전) 에 Plan E 검증 항목 추가:

```bash
# Plan E — kzk-production-access v1.2 grep
PA="$REPO_ROOT/skills/kzk-production-access/SKILL.md"
LTD_E="$REPO_ROOT/skills/kzk-large-task-delegation/SKILL.md"
PCG="$REPO_ROOT/skills/kzk-pre-commit-gate/SKILL.md"
SHARE_E="$REPO_ROOT/harness-share.md"

# kzk-production-access v1.2 — positive grep
assert_grep "kzk-production-access version 1.2.0" "version: 1.2.0" "$PA"
assert_grep "kzk-production-access §Production state changes" "Production state changes" "$PA"
assert_grep "kzk-production-access code-first 룰" "코드 우선" "$PA"
assert_grep "kzk-production-access 직접 호출 금지" "직접 호출 금지" "$PA"
assert_grep "kzk-production-access 멱등성 의무" "멱등성 의무" "$PA"
assert_grep "kzk-production-access IF NOT EXISTS" "IF NOT EXISTS" "$PA"
assert_grep "kzk-production-access drift forward-only" "forward-only" "$PA"
assert_grep "kzk-production-access 환경 설정 예외" "환경 설정 예외" "$PA"
assert_grep "kzk-production-access 자가 점검" "자가 점검" "$PA"
assert_grep "kzk-production-access Q-PROD-CODE-FIRST queue" "Q-PROD-CODE-FIRST" "$PA"
assert_grep "kzk-production-access ad-hoc DB anti-pattern" "Ad-hoc DB schema 변경" "$PA"
assert_grep "kzk-production-access ad-hoc IAM anti-pattern" "Ad-hoc IAM 변경" "$PA"
assert_grep "kzk-production-access kzk-fix-scope-expansion cross-ref" "kzk-fix-scope-expansion" "$PA"
assert_grep "kzk-production-access kzk-regression-memory cross-ref" "kzk-regression-memory" "$PA"
assert_grep "kzk-production-access trigger migration" "migration" "$PA"
assert_grep "kzk-production-access trigger Terraform" "Terraform" "$PA"

# kzk-large-task-delegation Production-code-first boilerplate — positive
assert_grep "kzk-large-task-delegation Production-code-first boilerplate 섹션" "Production-code-first boilerplate" "$LTD_E"
assert_grep "kzk-large-task-delegation PRODUCTION-CODE-FIRST RULE 본문" "PRODUCTION-CODE-FIRST RULE" "$LTD_E"
assert_grep "kzk-large-task-delegation production trigger 키워드 표" "Trigger 매칭 키워드" "$LTD_E"

# kzk-pre-commit-gate Gate 1.6 (또는 4.6) — positive
assert_grep "kzk-pre-commit-gate Production code-first 검증 Gate" "Production code-first 검증" "$PCG"
assert_grep "kzk-pre-commit-gate ad-hoc 실행 흔적 검증" "ad-hoc 실행 흔적" "$PCG"
assert_grep "kzk-pre-commit-gate kzk-production-access cross-ref" "kzk-production-access" "$PCG"

# harness-share §17.X (or production-section subsection) — positive
assert_grep "harness-share Production code-first subsection" "Production code-first" "$SHARE_E"
assert_grep "harness-share code-first 룰 본문" "코드 우선" "$SHARE_E"
assert_grep "harness-share Axis B cross-ref" "kzk-fix-scope-expansion" "$SHARE_E"
assert_grep "harness-share Axis D cross-ref" "kzk-regression-memory" "$SHARE_E"
```

기존 Plan A 의 PASS / FAIL 누적 결과는 자동 합산.

### Task 6 — `install/test/run-tests.sh` 변경 없음 확인

Plan A 가 이미 skill-text-checks.sh 호출 등록함. Plan E 는 skill-text-checks.sh 본문만 확장하면 자동 포함. run-tests.sh 추가 변경 X.

검증: `bash install/test/run-tests.sh` 실행 → Plan E grep 결과 PASS 확인.

### Task 7 — CLAUDE.md / README.md skill count 검증 (변경 없음)

Plan E 는 신규 skill 없음. 16th skill `kzk-production-access` 강화만 (Plan B 가 `kzk-fix-scope-expansion` 추가, Plan D 가 `kzk-regression-memory` 추가 → 14→16. Plan E 는 16 유지).

검증:
```bash
git diff CLAUDE.md README.md | grep -E '(skill count|All [0-9]+ skills|line 3)' && echo "[Plan E] CLAUDE.md/README.md skill count 변경 발견 — 의도 외 변경 의심" && exit 1 || echo "[Plan E] skill count 변경 없음 OK"
```

### Task 8 — atomic commit

`kzk-pre-commit-gate` 통과 (Gate 0–1.6):
- Gate 0: AGENTS.md sync — kzk-production-access / kzk-large-task-delegation / kzk-pre-commit-gate 모두 SKILL.md 변경했지만 신규 skill 아님 → AGENTS.md 변경 없음 (skill list 그대로)
- Gate 1: ai-slop scan
- Gate 1.5: secrets scan
- **Gate 1.6 (자기 자신 검증 — meta!)**: Plan E 가 추가하는 Gate 1.6 룰 자체로 Plan E 의 commit 검증 — Plan E commit 의 staged diff 는 SKILL.md / harness-share.md / test 파일만 (production-related 파일 변경 없음). 따라서 Gate 1.6 trigger 조건 미충족 → skip
- Gate 2: build (n/a — markdown only)
- Gate 3: test — `bash install/test/run-tests.sh` PASS
- Gate 4: Playwright (n/a — non-UI)

commit message:
```
feat(skill): kzk-production-access v1.2 — code-first + 멱등성 (Plan E)

Production state 변경 = code (migration / IaC / script). git tracked.
직접 호출 금지 (psql ALTER, aws iam, aws s3api put-, aws lambda update-).
멱등성 의무: IF NOT EXISTS / ON CONFLICT / --if-not-exists.
AI 가 production access 받은 경우: script 작성 → 사용자 review → CI/사용자 실행.
Drift 발견 시 forward-only migration (revert 금지).

exec
/bin/zsh -lc "sed -n '1,260p' /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-production-access/SKILL.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
---
name: kzk-production-access
version: 1.1.0
description: "Production/external-infra access boundary + credential-handling — explicit-instruction rule, destructive-op guardrails, AWS STS triage. Top triggers: 'AWS', 'SSM', 'production', 'aws-vault', 'credential'. Body §Triggers for full list."
---

> Authoritative source: `harness-share.md` §2. On conflict, that wins.

# kzk-production-access

## Triggers

`AWS`, `AWS 접속`, `SSM`, `SSM Session Manager`, `production`, `destructive`, `DB drop`, `snapshot`, `credential`, `ASIA prefix`, `AKIA prefix`, `aws-vault`.

Default = forbidden. Read-only included.

## Permission model

The agent may touch production / external infra only when the user issues an **explicit instruction** containing the target. Examples that count:

- "AWS에 접속해서 X 진행해"
- "이 자격증명으로 production Y 변경"
- "ECR 에 image push 해줘"

Explicit = both **permission** AND **execution mandate**. The agent runs the commands directly. The user must NOT have to SSH and type by hand. If the user says "do X on prod", do X.

Permission scope = the named task or multi-step sequence, until completion. After completion, new explicit instruction required to do anything else.

## Multi-step sequence (cutover, migration, etc.)

Pattern: agent proposes step → user "OK" → agent executes → agent reports → next propose. Per step.

Forbidden: skipping / merging steps on agent's own judgment. Each step needs its own user OK.

Destructive operations (DB drop, snapshot delete, IAM change, file delete, force-push, ECR image purge) are included in this protocol — they are NOT a separate harder gate. Explicit instruction is sufficient. The agent must execute them, not refuse.

## Credential handling

User pasted infra credentials (AWS / GCP / DB / SSH / API key) into chat:

| Type | Recognize by | Action |
|---|---|---|
| **Temporary STS** | `Expiration` field present, `AccessKeyId` starts with `ASIA`, `SessionToken` accompanies | Allowed within expiry window with explicit user consent. After single use, forget; reuse requires fresh user instruction |
| **Permanent IAM / plaintext DB password** | `AccessKeyId` starts with `AKIA`, no `SessionToken`; or plaintext password text in chat | **Refuse to use.** Tell user: revoke + use `aws-vault exec` / `aws sso login` / 1Password CLI / equivalent. Pasting permanent credentials in chat is itself a security incident |

Both cases: never store in memory / metadata / notepad / wiki. Conversation ends → discard.

## Anti-patterns

- "I'll just `aws s3 ls` to check" without explicit user instruction — read-only IS forbidden
- Multi-step shortcut: "I'll do steps 2-4 since they're related" — one OK per step
- Storing STS keys for later — single-use only
- Bypass dev-token / backdoor when MCP drops — see `harness-share.md` §19 (escalate to user, do not bypass)

## Interaction with other kzk-*

- **kzk-autonomous-boundary**: this skill specializes the production-access permission model within the autonomous-mode contract defined there. Autonomous mode does NOT override the explicit-instruction requirement for production access.
- **kzk-user-queue**: when production access is ambiguous (scope unclear, credential type unclear), append `Q-PROD-<TOPIC>` entry and halt. Do not proceed with guessed credentials.
- **kzk-tool-retry**: Bash retry policy applies before destructive operation gates — but retrying a destructive command without new user explicit instruction is forbidden, regardless of retry count.

codex
Plan E 본문은 봤고, 지금은 실제 대상 파일들의 현재 구조를 확인해 충돌 가능성을 보겠습니다. 특히 `harness-share`, `kzk-large-task-delegation`, `kzk-pre-commit-gate`, Plan A 문구와 섹션 번호 충돌을 확인하겠습니다.
exec
/bin/zsh -lc "sed -n '1,260p' /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-pre-commit-gate/SKILL.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
---
name: kzk-pre-commit-gate
version: 1.4.0
description: "Up-to-8-step Pre-commit Gate (AGENTS.md sync / ai-slop / secrets / build / test / Playwright / fix-scope sanity / fresh-agent verifier). Top triggers: 'commit', 'pre-commit', 'Gate 0', 'AGENTS.md sync', 'Gate 4.5', 'fix-scope-cache', 'callsite mismatch', 'KZK_GATE45_SKIP', 'doc-only', 'Gate 5', 'verifier', 'fresh-agent verification', 'INVALID_VERDICT'. Body §Triggers for full list."
---

> Authoritative source: `harness-share.md` §3. On conflict, that wins.

# kzk-pre-commit-gate

## Triggers

`commit`, `pre-commit`, `Gate 0`, `Gate 1`, `Gate 1.5`, `Gate 2`, `Gate 3`, `Gate 4`, `Gate 4.5`, `AGENTS.md sync`, `ai-slop-cleaner`, `secrets scan`, `autonomous commit`, `doc-only exception`, `fix-scope-cache`, `callsite mismatch`, `KZK_GATE45_SKIP`, `Gate 5`, `verifier`, `fresh-agent verification`, `Stage 3 cite`, `Q-VERIFIER-FAIL`, `Q-VERIFIER-INVALID`, `Q-VERIFIER-DISPATCH-FAIL`, `INVALID_VERDICT`.

Every commit passes up to 8 gates in order (0, 1, 1.5, 2, 3, 4, 4.5, 5 — Gate 0 only when AGENTS.md hierarchy present, so 7 gates otherwise). One failure → commit blocked.

## Gate 0 — Touched-files AGENTS.md sync

If the commit adds or removes a source file (`git diff --cached --name-status` status `A` or `D`), or creates a new directory under any tracked source root (configure the list in your CLAUDE.md), the corresponding `AGENTS.md` file(s) in those directories MUST be updated in the SAME commit. Reason: `deepinit` was historically deferred to "pre-merge" and routinely degenerated into a token-burn skill load with no real regen. Forcing AGENTS.md to ride along with the file change keeps the manifest honest one commit at a time.

Concrete rule:

- New file `path/to/dir/<file>` → `path/to/dir/AGENTS.md` Key Files / Components table updated to include it.
- New directory under a tracked source root → new `AGENTS.md` file authored, parent's Subdirectories table updated, parent reference tag (`<!-- Parent: ../AGENTS.md -->`) set.
- File deletion → corresponding row removed from the AGENTS.md table.
- Pure modification of an existing file (no rename, no add, no delete) → no AGENTS.md change needed; skip.
- Trivial 1-line typo / variable rename in an existing file → skip.
- Test-only adds (`*.test.{ts,tsx}` co-located with the implementation) → may share one row with the implementation file; explicit AGENTS.md row optional.

Failure → fix the AGENTS.md, re-stage, new commit. NEVER amend.

**Optional skill-level extension (NOT a Gate 0 gate requirement). Gate 0 alone passes on the AGENTS.md edit.** After that pass, load the deepinit_manifest tool schema — `ToolSearch(query="select:mcp__plugin_oh-my-claudecode_t__deepinit_manifest")` — then call with `action=save`. After `ToolSearch` resolves the tool, **read the loaded schema before calling** — do not hardcode `action="save"` as the full call shape if other params appear as required. If the schema requires more than `action`, log the extra params + values used in the commit body. Current OMC shape: `mcp__plugin_oh-my-claudecode_t__deepinit_manifest(action="save")`. Run once at the END of the commit batch (autonomous run) or at PR-creation time (interactive). If ToolSearch returns no result, search by keyword `ToolSearch(query="+deepinit_manifest")` and call the resolved name. If neither search finds the tool (OMC plugin not installed or not surfaced), skip — log `deepinit_manifest tool unavailable, manifest baseline skipped this commit` in the commit body and continue. Manifest baseline file is gitignored (`.omc/deepinit-manifest.json`); it lets the next session's `action=diff` produce a real signal.

## Gate 1 — ai-slop-cleaner

`Skill("oh-my-claudecode:ai-slop-cleaner")` on changed files. Removes dead code / duplicate / needless abstraction / boundary leak.

Trivial 1-line flag changes may skip → commit body must say `ai-slop-cleaner skipped (trivial)`.

## Gate 1.5 — secrets scan

Before committing, scan staged files for accidental secrets:

```bash
git diff --cached | grep -iE "(password|secret|api_key|aws_secret|private_key|token)\s*[:=]\s*['\"]?[A-Za-z0-9+/]{8,}" || true
```

Also check for `AKIA`/`ASIA` prefixes (AWS key patterns) per `kzk-production-access`. If any match found → unstage the file, remove the secret, re-stage. Never commit secrets even in test fixtures.

Trivial false positives (e.g. test fixture strings that are obviously fake) → commit body must say `secrets-scan: false positive — <reason>`.

## Gate 2 — build green

Run the repo's build command (e.g. `npm run build`). Verify dist artifact exists (e.g. `dist/main.js`, `dist/index.html`). Exit code 0.

## Gate 3 — module test pass

`npm test` scoped to changed area is acceptable mid-work. Full regression at PR time.

## Gate 4 — UI/CSS visual verification (Playwright MCP)

If any changed file matches `src/**/*.{tsx,ts,css}` (or your repo's equivalent frontend source glob), Gate 4 is mandatory. See `kzk-playwright-verification` skill for the full routine. Skipping / deferring / "do it later in the final sweep" is forbidden.

Exception: change is solely under `src/**/*.test.{tsx,ts}` — Gate 4 may be skipped.

## Gate 4.5 — Fix Scope Sanity Check (Plan B)

> Authoritative source: harness-share.md §3.5. On conflict, that wins.

**Trigger**: `.kzk-harness/fix-scope-cache.jsonl` 존재 시 (fix-scope-trigger hook 이 활성이고 fix intent commit 일 때).

**Skip**: `KZK_GATE45_SKIP=1` env var 설정 시 N/A (사유 commit body 기재 권고).

**Cache policy**: JSONL append/list — 현재 cycle commit SHA (`$(git rev-parse HEAD)`) key 의 모든 항목 union 체크. `last-fix-wins` 아님.

**Sanity check**: callsite list ⊄ `git diff --cached --name-only` → BLOCK.

BLOCK 시 메시지:
```
Gate 4.5: callsite N곳 중 M곳 미수정.
누락 의도를 commit body 에 명시하거나 해당 callsite 도 수정.
```

**Cache 부재**: N/A (fix-scope-trigger hook 비활성 또는 fix intent 아닌 commit).

See `kzk-fix-scope-expansion` for the full fix-scope rules and `harness-share.md §3.5` as canonical SoT.

## Gate 5 — Fresh-agent verifier (Plan C rev2)

Commit 직전 final check. `kzk-large-task-delegation` §Three-stage review §Stage 3 결과 PASS 확인 (cache hit) 또는 verifier 새 호출.

### Trigger — ANY of (rev2 #12):

(a) `git diff --cached --name-only` 결과 3+ 파일
(b) high-risk tag (auth / payment / migration / public API) — plan 본문 명시 또는 commit body marker
(c) **메인 직접 commit 모든 case** — 메인 self-approve hole 차단

조건 만족 시 Gate 5 의무. 셋 다 false → Gate 5 N/A.

### 절차

1. **Stage 3 cache 조회** — key = `(staged_diff_hash, acceptance_hash, verifier_model)`. same turn 안에서 hit 이면 PASS 인용 + commit body 에 `Gate 5: Stage 3 cite (verifier <subagent_type> <model>) PASS — <verifier 인용 1줄>`. PASS.
2. **Cache miss** → Gate 5 가 verifier 새 호출. dispatch 룰은 `kzk-large-task-delegation` §Three-stage review §Stage 3 §Verifier dispatch 와 동일.
   - diff base = `git diff --cached` (Gate 5 단위)
   - acceptance 발췌 = current plan §Acceptance Criteria SoT 우선 (없으면 raw user criteria)
   - VERDICT 파싱 정규식 `^VERDICT: (PASS|FAIL|PARTIAL)$`
3. **Verdict 처리**:
   - PASS → commit 진행 + commit body 에 verifier 인용
   - PARTIAL → commit BLOCK + 메인 추가 fix cycle. 같은 thread 2 consecutive PARTIAL → FAIL escalate
   - FAIL → commit BLOCK + 메인 fix cycle. **2 consecutive FAIL on same thread → halt + `Q-VERIFIER-FAIL`**
   - INVALID_VERDICT (첫 줄 형식 위반) → commit BLOCK + `Q-VERIFIER-INVALID` user-queue
   - Dispatch fail (subagent 응답 없음 / timeout) → commit BLOCK + `Q-VERIFIER-DISPATCH-FAIL` user-queue. fallback: `oh-my-claudecode:code-reviewer` → 그것도 실패 시 사용자 직접 review

### Stage 3 vs Gate 5 분리 (중복 호출 차단)

- Stage 3: cycle 단위 ("이 cycle 결과가 spec 만족하는가"), diff base = `HEAD~1`
- Gate 5: commit 단위 ("이 commit 의 diff 가 verifier PASS 받았는가"), diff base = `--cached`

같은 cycle 끝 commit 에서 두 단계 동시 발동 시 verifier 1회만 호출 + 두 단계 모두 cache 결과 인용. cache 룰: `kzk-large-task-delegation` §Three-stage review §Stage 3 ↔ Gate 5 cache 규약.

### Doc-only commit 예외

source code 변경 없는 doc-only commit 은 Gate 5 N/A (Gate 0–4 의 doc-only 예외와 동일).

### Plan C self-bootstrap N/A (rev2 #1)

Plan C 자체 적용 첫 commit 은 N/A 1회만 — commit body 에 명시 의무: `Gate 5 N/A — Plan C self-bootstrap commit, applies from next commit.`

### Autonomous mode

Gate 5 PASS 시 사용자 confirm 없이 commit 허용 (다른 gate 와 동일). FAIL / BLOCK / INVALID / dispatch fail 시 halt + user-queue.

## Doc-only commit exception

If the commit touches **no** source code — only docs/configs/screenshots (`*.md`, `docs/**`, `CLAUDE.md`, `DESIGN.md`, `harness-flow-progress.md`, `skills/**/*.md`, `.claude/skills/**/*.md`, `docs/screenshots/**`) — then:

- Gate 0 (AGENTS.md sync) N/A unless the doc commit itself adds/removes files under a source root (rare)
- Gate 2 (build) skipped
- Gate 3 (test) skipped
- Gate 1 (ai-slop-cleaner) only on the touched md if needed
- Gate 4 N/A
- Autonomous mode: commit without user prompt
- Non-autonomous: still confirm with user

Any single source-code line in the same commit revokes this exception → run all applicable gates (6 if AGENTS.md hierarchy present; 5 otherwise).

**AGENTS.md / README.md classification**: these are `.md` files but follow this rule — standalone update (no source file add/delete in the same commit) = doc-only OK, Gate 0 not triggered. Same commit as a Gate 0 trigger (source file add/delete) = doc-only exception revoked by the source change, run all applicable gates.

Note: skill files (`skills/**/*.md`) count as doc-only ONLY when modifying an existing skill. ADDING a new skill triggers Gate 0 **only when an AGENTS.md hierarchy is present** (same conditional as §Gate 0), plus the README.md / CLAUDE.md skill-count update flow described in CLAUDE.md "Skill Development Rules". `.claude/skills/**/*.md` is the legacy OMC path — same rules apply.

## Doc-only patch policy

When the staged diff touches ONLY the following paths, gate down to a minimal verification set:

- `skills/kzk-*/SKILL.md`, `harness-share.md`, `CLAUDE.md`, `README.md`, `harness-flow-progress.md`, `docs/**/*.md`
- AND no source file (`*.ts`, `*.tsx`, `*.js`, `*.mjs`, `*.py`, `*.sh`) added or modified

Minimal set:
1. Gate 1.5 secrets scan — always required
2. `bash install/verify-install.sh --ac 2` — kzk marker block row count (≤ 5s)

Skip the install/test full suite + AC3/6/7 + Gate 2/3/4. The full suite runs once at cycle close (last commit before global update).

Doc-only commits go straight to commit after Gate 1.5 + AC2. Save token + wall-clock cost (~30s × cycle-close commits saved).

## Autonomous-mode commit policy

User explicitly entered autonomous mode ("ralph로 돌려", "자는 동안 진행", "끝까지 끝내줘"):

- All applicable gates pass (6 if AGENTS.md hierarchy present; 5 otherwise) → commit without user confirmation
- Push respects the session **branch contract** locked at autonomous-mode entry (`kzk-autonomous-boundary`). Direct-`main` push is allowed only if the user explicitly authorized direct-main flow this session — never as a silent default.
- PR creation is allowed if the contract specifies PR-flow; final merge always waits for explicit user "merge it" regardless of contract

Non-autonomous (default): every commit waits for user OK after gates pass. No auto-commit.

## Commit message

- English, conventional commits (`feat(scope): ...`, `refactor(scope): ...`)
- HEREDOC for multi-line bodies, EOF quoted (`<<'EOF'`) to disable variable expansion
- **NEVER** include `Co-Authored-By:` lines
- pre-commit hook bypass (`--no-verify`) forbidden unless user explicitly orders it
- Gate-4 commits must include `Playwright: <screenshot_paths> + snapshot captured (console 0 err) + visual verified`

## Failure protocol

- 1st failure: fix root cause, re-stage, new commit
- **Autonomous mode:** 3 consecutive build/test failures on the same area → halt, append user-queue entry (see `kzk-autonomous-boundary`). **Interactive mode:** surface failures to user, do not auto-halt.
- Critic / verifier / Gate 4 visual reviewer 2 consecutive FAIL on the same change (Gate 4 Playwright visual review, plan reviewer, verifier agent) → halt + user-queue entry. See `kzk-autonomous-boundary` for the full halt condition list. Exception: `kzk-web-loop` overrides consecutive-FAIL halts with skip+next-issue (see `kzk-web-loop` §Failure Handling).
- Gate 5 verifier 2 consecutive FAIL on same thread → halt + `Q-VERIFIER-FAIL`. INVALID_VERDICT → `Q-VERIFIER-INVALID`. dispatch fail → `Q-VERIFIER-DISPATCH-FAIL`. See `kzk-autonomous-boundary` §Halt conditions 표 (reason / action / resume schema).
- Never `git commit --amend` after a hook failure (the commit didn't happen — amending hits the previous commit)

## Interaction with other kzk-*

- **kzk-autonomous-boundary**: Owns the halt protocol invoked when ≥2 consecutive reviewer/critic FAILs (or ≥3 consecutive build/test FAILs) occur during gate runs.
- **kzk-playwright-verification**: Implements Gate 4 (browser smoke + screenshot drop).
- **kzk-test-coverage**: Gate 3 runs the same test command this skill owns at session close.
- **kzk-large-task-delegation**: Gate 5 verifier dispatch 는 본 skill 의 §Three-stage review §Stage 3 와 sibling. 같은 thread / 같은 cache key → verifier 호출 1회만 (cache hit citation 우선). Subagent prompts must echo the gate sequence so delegated executors commit with full gate awareness.
- **kzk-web-loop**: Owns the override exception that lets the loop bypass full Gate 0–4 in indefinite-loop mode (see kzk-web-loop §Failure Handling).
- **kzk-pre-merge-sync**: Consumes the gate-PASS line this skill emits in the PR footer.

exec
/bin/zsh -lc 'rg -n "§17|production access|Authoritative source|kzk-production-access|explicit-instruction|credential|prod" /Users/kimzerokim/work/personal/kzk-harness/harness-share.md' in /Users/kimzerokim/work/personal/kzk-harness
exec
/bin/zsh -lc 'rg -n "Authoritative source|## Triggers|## Interaction with other kzk-|Anti-self-verification boilerplate|Production-code-first boilerplate|Rules block|Sonnet executor|Two-stage review" /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-large-task-delegation/SKILL.md' in /Users/kimzerokim/work/personal/kzk-harness
exec
/bin/zsh -lc "sed -n '1,260p' /Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-A-tdd-self-verification-block.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
7:> Authoritative source: `harness-share.md` §4. On conflict, that wins.
11:## Triggers
161:Session-level effort is set via the Claude Code CLI banner (`Opus 4.7 with xhigh effort`). Drop the banner to `high` for cycles consisting mostly of mechanical work; bump back to `xhigh` before opening a plan / critic dispatch. Sonnet executor and haiku mechanical: thinking is implicit in session default; do not tune separately.
224:- Rules block: TDD sequence (red-green-refactor — see kzk-test-coverage §TDD sequence; failing test BEFORE impl is non-negotiable in autonomous mode) + **§Sonnet executor — Anti-self-verification boilerplate 의 literal boilerplate 텍스트를 dispatch prompt 의 Rules block 에 그대로 포함 (참조만 X — fresh agent 는 SKILL.md 를 자동으로 읽지 않음)** + context7 mandate + `kzk-pre-commit-gate` (incl. **Gate 0 AGENTS.md sync** — touched-files AGENTS.md goes in the SAME commit) + DO-NOT-MODIFY paths + branch boundary (the session **branch contract** locked by `kzk-autonomous-boundary` — verify the current branch matches the contract via `git branch --show-current` before dispatch; `main` is allowed only if the contract authorized direct-main flow this session)
230:- **Recall 결과 inject** (Plan D): subagent dispatch prompt 의 Rules block 에 메인이 받은 [REGRESSION RECALL] system-reminder 가 있으면, 해당 텍스트를 verbatim 으로 dispatch prompt 에 inject. **size cap 200 char** — reminder 가 200 char 초과 시 truncate (hits 우선순위 high → low confidence_decayed 로 정렬 후 cumulative length 200 도달까지) + warning footer (`[truncated: <N> more hits]`). subagent 가 fix 작업 시 recall 결과 read. 매칭 정확성은 subagent 가 검토.
232:### Sonnet executor — extra plan-detail requirements
249:### Anti-self-verification boilerplate (Plan A)
251:Sonnet executor dispatch prompt 에 다음 boilerplate 자동 inject (TDD red 단계 진입 시 implementation read 차단):
262:이 boilerplate 는 sonnet dispatch prompt 의 Rules block 에 의무 inject. 메인이 dispatch prompt 작성 시 boilerplate 누락 = §Three-stage review FAIL.
418:## Interaction with other kzk-*

 succeeded in 0ms:
68:기본 금지. 사용자가 **명시적으로 지시** 한 경우 ("AWS 에 접속해서 ...", "이 자격증명으로 production X 변경") 한정해 인증된 자격증명으로 read/write 가능. **destructive 작업 (DB drop, snapshot 삭제, IAM 변경, 파일 삭제 등) 포함** — 사용자 명시는 허락 + 실행 의무 둘 다. AI 가 명령어 직접 실행한다 (사용자 SSH 손으로 치는 X 패턴 회피).
767:- **이유**: cycle counter source-of-truth = file artifact. chat history 는 ephemeral — 다음 세션 reproducibility X.
805:  - destructive operation 검출 시 (production DB drop 등)

 succeeded in 0ms:
# Plan A — TDD 자기검증 차단 (Layer a + b) — rev2

> Spec: `docs/plans/regression-memory-and-fix-quality-spec.md` (rev6, frozen).
> Branch: `feature/memory`. Order: A (first cycle) → D → B → C → E.
> Status: **Frozen** (codex review cycle 1 REVISE 7항목 모두 답 통합. kzk-spec-and-review §Cost/cadence "1 plan = 1 round" 룰 적용 — cycle 2 skip).
> Critic review verdict: `plan-A-tdd-self-verification-block-critic-review.md` (cycle 1).

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
6. **CLAUDE.md / README.md skill count 검증 — Plan A 변경 없음 확인** (Plan A 는 신규 skill 없음. `git diff CLAUDE.md README.md` 결과에 skill count line / "All N skills" line 포함 안 됨을 명시 점검. 신규 skill 추가는 Plan B/D 책임)
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
- description 끝에 trigger 추가: `'자율 mode TDD'`, `'test-from-implementation'`, `'self-verification'` (env var 이름 `KZK_AUTONOMOUS` 는 user trigger 가 아니므로 제외)

**Triggers section 갱신** (line 13): 끝에 추가 — env var 이름 제외
```
'test-from-implementation', '자율 mode TDD', 'self-verification', '자기검증 차단', 'anti-self-verification'
```

**Anti-pattern 섹션 신규** — 기존 `## TDD sequence` 다음, `## Exemptions` 직전 위치에 삽입:

```markdown
## Anti-pattern — Test-from-implementation

Red 단계 (failing test 작성) 진입 시점에 implementation read 금지. 자기검증 루프 차단.

**Red 단계 허용 read**:
- spec / acceptance criteria / 사용자 prompt / 이슈 본문
- 외부 인터페이스 (public API 시그니처만)
- hook/install 인프라 코드 (예: `install/hooks/regression-recall.mjs`) — red 단계 중에도 harness/hook debugging 필요 시 예외 허용. 단 *디버깅 목적 한정* — 그 코드의 인터페이스를 test 의 가정으로 베끼는 행위 여전히 금지

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
- 비-자율 mode (사용자가 직접 prompt 로 TDD task 부여) 에서는 메인 self-check + user ACK 게이트 (사용자 명시 confirm 받은 후 진행). **ACK 허용 문구 예시 (다른 표현 모호 → 재요청)**:
  - "이 task TDD 직접 진입 OK"
  - "test-from-spec 준수 확인했음"
  - "메인 직접 TDD 허락"
  - "anti-self-verification 룰 인지하고 진행"

**자율 mode 판별** (spec rev6 wording 그대로 — `=0 override` 없음):
1. 환경변수 `KZK_AUTONOMOUS=1` → 자율 mode (가장 신뢰)
2. **환경변수 unset 시** 보조 키워드 매칭 — **동사구만**:
   - "ralph 로 돌려", "web-loop 진입", "autonomous-loop 시작"
   - "harness 개선 루프 시작", "자가개선 cycle 진입", "끝까지 끝내줘"
   - **명사 단독** ("자가개선" 만, "ralph" 만) 매칭 금지 — 일반 prompt false positive 차단

**enforcement layer**:
- Layer (a) sonnet dispatch prompt 룰 — `kzk-large-task-delegation` 의 §Subagent prompt requirements 의 Rules block 에 자동 주입 (boilerplate 텍스트 본 SKILL.md 참조)
- Layer (b) 메인 self-check — 본 섹션의 자율 mode 판별 + halt 룰
```

**§Interaction with other kzk-* 갱신** — 기존 항목 끝에 추가:
```
- **kzk-autonomous-boundary**: 자율 mode 판별 키워드 / 환경변수 룰을 본 skill §Anti-pattern Layer b 에서 정의. autonomous-boundary 의 halt 룰과 통합 (`Q-TDD-MAIN` 큐 entry). **본 Plan A 는 contract only — kzk-autonomous-boundary skill 본문 수정은 Plan A 범위 밖. autonomous-boundary skill 의 halt 룰 표 / Q-TDD-MAIN cross-ref update 는 별도 follow-up 작업 (Plan C 통합 또는 fast-follow). split-brain 위험 인지 — Plan A frozen 시 follow-up issue 등록 의무.**
```

### Task 2 — `kzk-large-task-delegation/SKILL.md` boilerplate

**File**: `$SKILL_LTD`

**§Subagent prompt requirements 갱신** (line 224 부근의 Rules block 항목):

기존:
> Rules block: TDD sequence (red-green-refactor — see kzk-test-coverage §TDD sequence; failing test BEFORE impl is non-negotiable in autonomous mode) + ...

변경 (참조만이 아니라 **literal boilerplate 를 dispatch prompt 에 그대로 포함**하도록 못박음):
> Rules block: TDD sequence (red-green-refactor — see kzk-test-coverage §TDD sequence; failing test BEFORE impl is non-negotiable in autonomous mode) + **§Sonnet executor — Anti-self-verification boilerplate 의 literal boilerplate 텍스트를 dispatch prompt 의 Rules block 에 그대로 포함 (참조만 X — fresh agent 는 SKILL.md 를 자동으로 읽지 않음)** + ...

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

assert_no_grep() {
  local desc="$1" pattern="$2" file="$3"
  if grep -qF "$pattern" "$file"; then
    printf '  FAIL: %s (pattern "%s" SHOULD NOT be in %s)\n' "$desc" "$pattern" "$file"
    FAIL=$((FAIL + 1))
    ERRORS+=("$desc")
  else
    printf '  PASS: %s\n' "$desc"
    PASS=$((PASS + 1))
  fi
}

printf 'skill-text-checks.sh — Plan A 룰 기록 검증\n'

TC="$REPO_ROOT/skills/kzk-test-coverage/SKILL.md"
LTD="$REPO_ROOT/skills/kzk-large-task-delegation/SKILL.md"
SHARE="$REPO_ROOT/harness-share.md"

# kzk-test-coverage v1.3 — positive grep
assert_grep "kzk-test-coverage version 1.3.0" "version: 1.3.0" "$TC"
assert_grep "kzk-test-coverage Anti-pattern 섹션" "Anti-pattern — Test-from-implementation" "$TC"
assert_grep "kzk-test-coverage Layer b 자율 mode" "자율 mode 메인 직접 TDD 금지" "$TC"
assert_grep "kzk-test-coverage KZK_AUTONOMOUS=1 우선" "KZK_AUTONOMOUS=1" "$TC"
assert_grep "kzk-test-coverage env unset 동사구 매칭" "환경변수 unset 시" "$TC"
assert_grep "kzk-test-coverage 명사 단독 금지" "명사 단독" "$TC"
assert_grep "kzk-test-coverage fresh sonnet dispatch 강제" "fresh sonnet dispatch" "$TC"
assert_grep "kzk-test-coverage Q-TDD-MAIN queue entry" "Q-TDD-MAIN" "$TC"
assert_grep "kzk-test-coverage hook 인프라 예외" "hook/install 인프라" "$TC"
assert_grep "kzk-test-coverage ACK 문구 예시" "test-from-spec 준수 확인했음" "$TC"

# kzk-test-coverage — negative grep (=0 override 금지)
assert_no_grep "kzk-test-coverage no =0 override" "KZK_AUTONOMOUS=0" "$TC"

# kzk-large-task-delegation boilerplate — positive
assert_grep "kzk-large-task-delegation Anti-self-verification boilerplate 섹션" "Anti-self-verification boilerplate" "$LTD"
assert_grep "kzk-large-task-delegation literal block 명시" "literal boilerplate" "$LTD"
assert_grep "kzk-large-task-delegation BLOCKED 반환" "BLOCKED 반환" "$LTD"

# harness-share §11.1 — positive
assert_grep "harness-share §11.1 Anti-Self-Verification" "11.1 Anti-Self-Verification" "$SHARE"
assert_grep "harness-share Layer (a) cross-ref" "Layer (a)" "$SHARE"
assert_grep "harness-share Layer (b) cross-ref" "Layer (b)" "$SHARE"
assert_grep "harness-share KZK_AUTONOMOUS=1" "KZK_AUTONOMOUS=1" "$SHARE"

# harness-share — negative grep
assert_no_grep "harness-share no =0 override" "KZK_AUTONOMOUS=0" "$SHARE"

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


codex
핵심 충돌 후보가 보입니다. `kzk-production-access` 는 아직 `harness-share.md §2`를 authoritative source로 가리키고 있고, Plan E 는 `§17.X`를 추가하려고 해서 SoT 분산 위험이 있습니다. 섹션 실체를 조금 더 확인하겠습니다.
exec
/bin/zsh -lc "sed -n '40,100p' /Users/kimzerokim/work/personal/kzk-harness/harness-share.md" in /Users/kimzerokim/work/personal/kzk-harness
exec
/bin/zsh -lc "sed -n '460,520p' /Users/kimzerokim/work/personal/kzk-harness/harness-share.md" in /Users/kimzerokim/work/personal/kzk-harness
exec
/bin/zsh -lc "sed -n '1,120p' /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-large-task-delegation/SKILL.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
- `Skill("superpowers:brainstorming")` — design 단계
- `Skill("superpowers:writing-plans")` — plan 단계
- `Skill("superpowers:subagent-driven-development")` — execution 단계
- `Skill("oh-my-claudecode:ralph")` — autonomous loop with stop hook (사용자가 명시 시 진입)

---

## 2. Autonomous Execution Boundary

사용자가 명시적으로 autonomous 모드 허가 (예: "ralph 로 돌려", "자는 동안 진행", "끝까지 끝내줘") 한 경우에만 진입.

### 허용 동작

- Pre-commit Gate (아래 §3) 통과 시 자동 commit
- TDD test 통과 시 다음 task 진행
- worktree 병렬 실행
- Subagent dispatch 로 대화형 skill 대체
- 문서 작성, plan 상세화, review 실행

### 금지 동작 (강제)

- **Branch / PR contract: ASK FIRST 후 진입.** autonomous 시작 시 사용자에게 (a) 별 branch vs 직접 commit (b) branch 이름 (예: `feature/<topic>`, `harness-test`, `feature/web-loop-<slug>`) (c) PR 필요 여부 — 3 슬롯 명시 답 받고 그 contract 를 세션 끝까지 유지. 직접 `main` commit 은 사용자가 그 세션에서 명시 인가 ("main에 바로 커밋", "main 직접") 한 경우만 허용. silent default X. PR auto-merge 는 어떤 contract 에서도 사용자 "merge it" 필수. `git push --force` / `git reset --hard` on pushed branch 는 contract 무관 별도 OK 사인 필요
- 사용자 PRD / 설계 문서 자동 override
- Pre-commit Gate 실패 시 force commit
- verification reviewer 2회 연속 FAIL 시 loop 지속 (halt + user-queue 적재)

### Production / 외부 인프라 Access (조건부 허용)

기본 금지. 사용자가 **명시적으로 지시** 한 경우 ("AWS 에 접속해서 ...", "이 자격증명으로 production X 변경") 한정해 인증된 자격증명으로 read/write 가능. **destructive 작업 (DB drop, snapshot 삭제, IAM 변경, 파일 삭제 등) 포함** — 사용자 명시는 허락 + 실행 의무 둘 다. AI 가 명령어 직접 실행한다 (사용자 SSH 손으로 치는 X 패턴 회피).

multi-step sequence (cutover, migration) 이면 단계별 OK 사인: AI propose → 사용자 OK → AI 실행 → 결과 보고 → 다음 propose. step skip / merge X.

명시 없이는 read-only 호출도 X. 명시 범위 = 지시된 task / sequence 완료 시점까지 — 그 이상은 새 명시 필요.

### Credential Handling

사용자가 채팅에 인프라 자격증명 (AWS / GCP / DB 등) 을 붙여 넣은 경우:

- **만료 시간 있는 임시 자격** (AWS STS — `Expiration` 필드 존재, `ASIA` prefix, `SessionToken` 동반) — 만료 안에서 사용자 명시 동의 시 한시적 사용 허용. 사용 후 다음 turn 부터 잊고 재사용 X (재사용 = 사용자 재명시 필수)
- **만료 없는 영구 자격** (AWS `AKIA` prefix permanent IAM key, 평문 DB 비밀번호 등) — 사용 거부. 사용자에게 revoke 절차 + 안전 위생 (`aws-vault`, `aws sso`, 1Password CLI) 권고. 노출 자체가 사고 신호

두 경우 모두 memory / metadata 저장 X. conversation 종료 시 자동 폐기.

### Rollback / revert policy

autonomous loop 이 commit 한 코드가 이후 잘못된 것으로 판명 된 경우:

1. `git revert <sha>` 선호 — reset 보다 history 보존
2. pushed branch 에서 `git reset --hard` 는 사용자 명시 ("hard reset 해줘") 없으면 금지
3. user-queue 에 entry 추가: 어느 commit, 왜 revert, 올바른 접근 방향
4. 같은 issue 를 바로 재시도 하지 말고 다음 issue 로 resume

### Polite-stop 금지

- 사용자가 autonomous 지시 한 범위 안에선 모든 task 완료 또는 halt 조건 도달 시까지 정지 X
- 매 task 끝 = 즉시 다음 task dispatch (사용자 prompt 기다리지 X)
- "다음 plan 은 사용자 승인 후" 같은 anti-pattern 금지

---

## 3. Pre-commit Gate (6 단계)

 succeeded in 0ms:
2. `query-docs` 로 specific 질문 (예: "sidebar collapse animation transition duration CSS")
3. 답 본 후에만 CSS/TS 구현 결정
4. commit message 또는 PR description 에 "context7 referenced `/org/project` for <concept>" 라인 포함
5. subagent (executor, designer, debugger) prompt 에 "라이브러리 pattern 확인 시 반드시 context7 query-docs 사용" 명시 의무

작은 이슈 (typo, spacing) 제외. animation / auth flow / cache / SDK usage 같은 **library-semantic 결정**이 대상.

미사용 시 code-review 지적 사유.

---

## 10. UI Component Standard (선택, React 프로젝트 시)

신규 React component:

- **Radix primitives** (`@radix-ui/react-*`) — accessibility / keyboard / focus trap / portal
- **shadcn/ui** styled layer — `npx shadcn@latest add <component>`
- **Tailwind CSS** utility — grid / flex / spacing / responsive
- 직접 CSS 쌓는 custom component **금지** (특히 Sidebar / Dialog / Popover / Tooltip / Tabs / Command / Form / DataTable)

기존 globals.css 토큰 시스템과 Tailwind theme 매핑. Code review 차단 사유 = composite component (Dialog / Sidebar / Tabs / Form 등) 를 shadcn/Radix 없이 scratch 작성.

---

## 11. Test Coverage 100% on Changed Code

autonomous 세션 = 변경한 파일의 라인·브랜치 커버리지 100%.

- legacy 도 touched 되면 같이 올림
- 미커버 영역 = 추가 unit/integration/e2e 테스트로 커버
- 시간 제약 시 명시적 user-queue entry + 이유 기록
- 경계: boot 파일 (main.ts), pure type declaration, ORM entity decorator-only file 은 논리 없음으로 coverage 공식 대상 외 (PR description 명시)

### 11.1 Anti-Self-Verification (TDD)

TDD red 단계에서 implementation 본 후 거기에 맞춘 test 작성하는 자기검증 루프 차단.

- **Layer (a)** — sonnet executor dispatch prompt 에 anti-self-verification boilerplate 자동 inject. 룰 본문: `kzk-large-task-delegation` §Sonnet executor — Anti-self-verification boilerplate.
- **Layer (b)** — 자율 mode (`KZK_AUTONOMOUS=1` 또는 동사구 키워드 매칭) 에서 메인 직접 TDD 진입 금지 — 반드시 fresh sonnet dispatch. 메인 직접 진입 시 halt + `Q-TDD-MAIN` user-queue entry. 룰 본문: `kzk-test-coverage` §Anti-pattern — Test-from-implementation.
- 비-자율 mode 의 메인 self-check + user ACK 게이트 — 사용자 명시 confirm 받은 후 red 진입.

---

## 12. Rate Limit Polling (Anthropic 5h window)

autonomous 세션 중 5h rate-limit 도달 시:

1. 중단 선언 금지. `ScheduleWakeup(delaySeconds=600)` 으로 10분 대기 스케줄
2. 대기 prompt = "계속 autonomous plan 이어서 진행 (rate limit 해제 확인)"
3. 10분 후 재개 시도 → 여전히 block 이면 다시 `ScheduleWakeup` 반복
4. 해제되면 남은 작업 목록 (harness-flow-progress.md Session N) 에서 바로 이어감
5. 총 경과는 harness-flow-progress.md 에 "rate-limit wait N회, 누적 대기 Xh" 기록

실 사용자 메시지 (신규 주제) 들어오면 그 메시지 우선.

---

## 13. Context Budget — Auto-/compact at 80%

context token 사용률 ≥ 80% 시 다음 작업 시작 직전 `/compact` 실행:


 succeeded in 0ms:
---
name: kzk-large-task-delegation
version: 1.7.0
description: "Large tasks (3+ files / 200+ LoC / 5+ file read / multi-stage) dispatch to fresh subagents — main never executes. Top triggers: '큰 작업', '버그 전수조사', '사이클 자율', 'plan 쪼개', 'subagent dispatch', 'Stage 3', 'fresh-agent verifier', 'verifier dispatch', 'INVALID_VERDICT'. Body §Triggers for full list."
---

> Authoritative source: `harness-share.md` §4. On conflict, that wins.

# kzk-large-task-delegation

## Triggers

`large task`, `subagent dispatch`, `3+ file edits`, `200+ LoC`, `opus/sonnet routing`, `subagent-driven`, `큰 작업`, `fresh subagent`, `메인 컨텍스트`, `여러 파일 동시 편집`, `Plan scope 전체`, `read-heavy audit`, `spec verification`, `구현 검증`, `버그 전수조사`, `implementation audit`, `5+ file read`, `마무리 해줘`, `전수 검토`, `끝내줘`, `사용성 버그`, `사용성 회귀`, `QA scan`, `여러 plan 으로 쪼개`, `플랜 여러개로 쪼개`, `plan 쪼개`, `사이클 자율`, `사이클로 자율`, `사이클 돌면서`, `버그들 모두`, `모두 잡아줘`, `Stage 3`, `fresh-agent verifier`, `verifier dispatch`, `verifier model routing`, `PASS FAIL PARTIAL`, `Q-VERIFIER-FAIL`, `Q-VERIFIER-INVALID`, `INVALID_VERDICT`, `verification thread`.

Large work runs in fresh subagents via `/superpowers:subagent-driven-development`. Main context = dispatch + review + commit. Main never holds the implementation.

## "Large" — main is forbidden, subagent required

Any one of:

- 3+ files edited simultaneously (refactor, token migration, component rewrite)
- Single commit ≥ 200 LoC change expected
- `@theme` / token / CSS rewrite (`src/styles/**`) or 5+ component simultaneous migration
- Single Plan (any of A-N in `docs/plans/*.md`) full scope
- Build · test · Playwright · code-reviewer multi-stage workflow
- 5+ files needing full read for **verification or audit** (spec ↔ implementation match, bug sweep, existing-system review) — read-only does NOT exempt main from delegation

## Main-context-allowed (trivial / fast / safe)

- Single config-line edit (`~/.claude.json` MCP args, `.mcp.json`, `tsconfig.json` single option)
- Single rule add (CLAUDE.md / DESIGN.md / `harness-flow-progress.md` 1-item)
- Single file ≤ 5 LoC fix (typo, single import line, single variable rename)
- Subagent result review · gate check · commit · push

## Scope estimation (mandatory entry step on non-trivial requests)

The user is often agentic-only — they describe outcomes, not file counts. Threshold rules ("3+ files", "200+ LoC", "5+ file read") are main-context decisions, but main can't decide if it never estimates. **Run a 30-second scope estimate as the first action on any non-trivial request** before any Edit / Write / multi-file Read.

Trivial requests (skip estimation, go direct):

- Single-line config flag (`tsconfig.json` option, env var add)
- Single typo / variable rename in one known file
- Pure question (no edit) about a single file
- Single 1-line README / CLAUDE.md edit the user dictated verbatim

Non-trivial = anything else. Estimate procedure:

1. **`git status --short`** — see what's already in the working tree
2. **Target dir scan** — `find <target-dirs> -type f -name '*.<ext>' | wc -l` for likely-touched modules (use the user's phrasing to guess scope: "auth flow" → `auth/`, `users/`, `sessions/`; "grid bug" → `grid/`, `cell/`, etc.)
3. **CRG quick query if available** — `code-review-graph status` (1s) confirms index exists; if so, `query_graph(pattern="callers_of"|"imports_of", target=<symbol>)` widens scope without re-reading files
4. **LoC rough projection** — likely-touched file count × average LoC change × 0.1-0.3 multiplier (most edits don't rewrite whole files)

Output to user (1-line preamble before first Read/Edit):

```
[scope] est. <N> files / <M> LoC → <main-direct | executor-haiku | executor-sonnet | spec-and-review-first>
```

Routing decision tree:

| Estimate | Route |
|---|---|
| 0-1 file, ≤ 30 LoC, no spec | main-direct (no skill chain needed) |
| 2-3 files, ≤ 200 LoC, mechanical (rename/version/config) | executor-haiku |
| 2-3 files, ≤ 200 LoC, substantive (logic, types, error paths) | executor-sonnet |
| 3+ files OR 200+ LoC OR ambiguous (estimate uncertain by ≥ 2x) | spec-and-review-first → executor dispatch per plan |
| Architecture / security / public-API change | opus plan + codex consult mandatory regardless of size |

User can override the route with one line ("그냥 메인이 직접 해", "haiku 로 진행", "spec 먼저 잡자"). Without override, the agent proceeds per the estimate.

Hard rules even after estimation:

- Estimate says ≤ 30 LoC, but mid-execution main reads 5+ files → halt, restart with EXPLORER subagent (estimate was wrong; respect §Read-heavy audit dispatch shape).
- Estimate says 1-file, but mid-execution scope expands to 3+ files → halt, restart with executor dispatch.
- Re-estimate after every halt; do not silently widen scope under main.

## Read-heavy audit dispatch shape

For verification / audit scenarios (user says "스펙파일 체크해줘", "구현 확인", "버그 전수조사", "spec vs code 매칭", "이거 제대로 구현됐나"):

- Main context **MUST NOT** read 5+ files directly with `Read` — context saturation degrades conclusion quality (the "main reads code weirdly" failure mode).
- Dispatch shape:
  1. `oh-my-claudecode:explore` (`model=sonnet` for survey-style deep reads, `model=haiku` for quick targeted file lookups) — file discovery + Read in subagent context.
  2. `code-review-graph` MCP/CLI (per `kzk-codebase-survey §MCP tool surface`) — `semantic_search_nodes`, `query_graph`, `get_impact_radius` for spec ↔ implementation matching without re-reading every file.
  3. Main synthesizes the EXPLORER report + CRG output into the verification verdict.
- For multi-spec verification (e.g. user asks to check N spec files in a row), each spec is one EXPLORER dispatch — parallel where file scopes are disjoint, sequential where they share files.
- The verdict file goes in `docs/harness/surveys/YYYY-MM-DD-<topic>-verification.md` (per `kzk-codebase-survey §Step 7` report path convention).

This is the read-only counterpart to the implementation dispatch above — same delegation rule, different output (verdict instead of diff).

## Model routing (mandatory split for subagent dispatch)

Three tiers. Pick by the cost-of-bad-output × token-cost trade-off, not by topic.

| Phase | Subagent type | Model | Cross-check |
|---|---|---|---|
| Plan authoring | `oh-my-claudecode:planner` / `oh-my-claudecode:architect` | **opus** | Mandatory Codex CLI consult on draft plan before freezing (see `kzk-spec-and-review`). For deep requirements elicitation, use `Skill("oh-my-claudecode:deep-interview")` (Skill, not Agent). |
| Critic / code review | `oh-my-claudecode:critic` / `oh-my-claudecode:code-reviewer` | **opus** | Codex CLI parallel review (see `kzk-spec-and-review`) |
| Semantic verify | `oh-my-claudecode:verifier` | **opus** | Codex CLI consult on uncertain assertions |
| Implementation (substantive) | `oh-my-claudecode:executor` | **sonnet** | none — plan must be detailed enough |
| Mechanical implementation | `oh-my-claudecode:executor` | **haiku** | none |
| Quick research / file search | `oh-my-claudecode:explore` | **sonnet** (deep reads) / **haiku** (targeted lookups) | none |

### Tier triggers — when to drop to haiku

Haiku tier (new — Cycle 29) for mechanical work where the change is pattern-application with zero design judgment:

- Version bump (`version: X.Y.Z` → `X.Y+1.0`)
- Frontmatter description rewrite to a frozen template
- Single-line config flag toggle (e.g., `tsconfig.json` single option, env var add)
- Lint / formatter follow-up (typed by linter — 1-line fix)
- Progress log entry append (frozen one-line format)
- Atomic file rename across N files (rename + import path update only, no logic change)
- Trivial test scaffolding when the assertion list is fully spec'd

- Git ops (mechanical): `git status`, `git log`, `git diff`, `git show`, `git stash list`, `git branch`, `git fetch`, `git rev-parse`, `git tag`, `git add <specific-file>`, `git restore <file>`, `git commit -m` (with simple message), fast-forward `git merge`, non-conflict `git cherry-pick <sha>`, `git push` (when contract = PR-flow and no force flag).

Anything where the executor must *infer* what to write (variable name, error message wording, conditional branch logic, type definition shape) → sonnet, not haiku.

**Git ops EXCLUDED from haiku tier (escalate to sonnet/opus):**

exec
/bin/zsh -lc "sed -n '232,275p' /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-large-task-delegation/SKILL.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
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

### Anti-self-verification boilerplate (Plan A)

Sonnet executor dispatch prompt 에 다음 boilerplate 자동 inject (TDD red 단계 진입 시 implementation read 차단):

```
[ANTI-SELF-VERIFICATION RULE — kzk-test-coverage §Anti-pattern]
TDD red 단계 (failing test 작성) 진입 시점:
- 허용 read: spec / acceptance criteria / 사용자 prompt / public API 시그니처 / hook·install 인프라 코드
- 금지 read: 지금 작성하려는 함수 본문, 같은 파일 sibling 함수 본문, 기존 test 파일
- 자가 점검: "이 test 가 spec 에서 도출됐는가? implementation 의 현재 모양에서 추론한 것 아닌가?"
위반 시 task BLOCKED 반환 + plan revision 요청.
```

이 boilerplate 는 sonnet dispatch prompt 의 Rules block 에 의무 inject. 메인이 dispatch prompt 작성 시 boilerplate 누락 = §Three-stage review FAIL.

## Parallel dispatch

File-scope-disjoint tasks fire simultaneously: multiple `Agent` tool calls in one response, `run_in_background: true` so main can continue work and gets auto-notified.

Race avoidance:

- Same file region = sequential (one subagent owns it)
- git push race → subagent auto-handles with `git fetch && rebase && push`

## Three-stage review (mandatory after each subagent finishes)

### Stage 1 — Trust-but-verify

exec
/bin/zsh -lc "rg -n '"'^## |''^### '"' /Users/kimzerokim/work/personal/kzk-harness/harness-share.md | sed -n '1,120p'" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
13:## 1. 핵심 흐름
47:## 2. Autonomous Execution Boundary
51:### 허용 동작
59:### 금지 동작 (강제)
66:### Production / 외부 인프라 Access (조건부 허용)
74:### Credential Handling
83:### Rollback / revert policy
92:### Polite-stop 금지
100:## 3. Pre-commit Gate (6 단계)
104:### Gate 0 — Touched-files AGENTS.md sync (repo with AGENTS.md hierarchy 만 해당)
121:### Gate 1 — ai-slop-cleaner
131:### Gate 1.5 — secrets scan
141:### Gate 2 — build green
149:### Gate 3 — module test pass
158:### Gate 4 — UI/CSS visual verification (Playwright MCP)
194:### Doc-only commit 예외
208:### Doc-only fast path
212:### Gate 5 — Fresh-agent verifier (Plan C rev2)
225:### Token migration — shadcn + Tailwind v4 bridge requirement
242:## 4. Subagent-Driven Dispatch
244:### Large Task = subagent 의무
254:### 메인 컨텍스트 허용 영역
262:### Subagent prompt 작성 의무
277:### Parallel dispatch
287:### Two-stage review (subagent-driven-development skill 의무)
300:## 5. Documentation Storage Rules
317:## 6. user-queue.md — Autonomous 모호 결정 기록
321:### 운용
327:### Easy override 요구
332:### Entry 형식
335:### Q-<TOPIC> — <한 줄 요약>
347:### Interactive Review Protocol (사용자 복귀 시)
358:### Stage 3 — User Queue Resolution Loop
367:### Halt when crossing un-applied policy areas
373:## 7. harness-flow-progress.md — Timeline 추적
379:### 기록 시점 (필수)
387:### Session 별 형식
390:## Session N — <Topic> (YYYY-MM-DD)
392:### Context
395:### Skill Chain Timeline
399:### 체크포인트 Log
403:### Architecture impact (post-Plan X)
406:### MANUAL handoff (사용자 복귀 시)
410:### Session N 종결 상태 (YYYY-MM-DD)
415:### 다음 세션 (Session N+1 후보)
419:### 원칙
428:## 8. Commit Rules
452:## 9. External Library API Lookup (context7 MCP)
471:## 10. UI Component Standard (선택, React 프로젝트 시)
484:## 11. Test Coverage 100% on Changed Code
493:### 11.1 Anti-Self-Verification (TDD)
503:## 12. Rate Limit Polling (Anthropic 5h window)
517:## 13. Context Budget — Auto-/compact at 80%
527:## 14. Plan Auto-Continuation (multi-plan autonomous session)
541:## 14.5. Pre-Merge CLAUDE.md Update
556:## 15. Pre-Merge `/deepinit`
571:## 16. Other-project Setup Checklist
575:### 1회 setup
590:### 첫 세션 시작 시
603:### 학습된 anti-patterns (이 워크플로우의 dogfood 결과)
615:## 17. References
635:## 18. Visibility & Communication (autonomous 모드 사용자 가시성)
639:### 룰 (강제)
650:### 신호 — 사용자가 답답함 = "큰 작업 dispatch 시 communication 가시성 0" 의 lagging indicator
656:## 19. MCP Reconnection Protocol
660:### Drop 신호 (즉시 halt)
667:### Recovery 절차
677:## 20. Session Self-Critique (Russian Judge Pattern)
681:### 형식
691:### 점수 기준
698:### 점수 후 의무
703:### 자기비판 antipattern
711:## 21. Memory Feedback Inheritance
715:### 사용 패턴
721:### 본 repo 누적 feedback (예시)
729:### 신규 feedback 작성 룰
737:### 누적 룰의 의의
743:## 22. Codex Cross-Review for Plans
747:### 룰
763:### Critic verdict file 저장 의무
774:### Why
778:### How to apply
786:## 22.5. End-to-End Ralph Pipeline (Spec → Plan → Critic → Implementation)
790:### 룰
807:### Why
811:### How to apply
822:## 23. Background Process Stuck Recovery
826:### 룰
845:### Why
849:### How to apply
857:## 24. License / Reuse
868:## 25. kzk-web-loop — Autonomous Web Improvement Loop
872:### Purpose
876:### Loop (one sentence each)
885:### Evaluation Priority
892:### No-halt Policy
896:### Playwright as Optional Enhancement
900:### State
907:### Reviewer FAIL override
911:### Branch boundary
917:## 26. kzk-codebase-survey — Mandatory Deep Codebase Explorer
921:### Purpose
925:### When mandatory
932:### code-review-graph (optional, recommended)
940:### EXPLORER steps (Step 0.5 + Step 1–8)
951:### Critic gate
955:### No-halt
961:## 27. kzk-tool-retry — Tool Failure Auto-Retry Discipline
965:### Default policy
969:### Key failure modes
975:### Queue-on-double-failure
979:### Forbidden
985:## 28. Skill-load chain (메타 갭 방지)
998:## 29. Regression Memory Protocol (kzk-regression-memory, Plan D)
1002:### Storage 모델 (5필드 + 7필드)
1010:### Recall 룰
1020:### Dismiss/Archive CLI (mutation path)
1031:### 자가-skip guard (동사구만)
1038:### Stale check
1046:### Atomic sidecar writer (공용 utility)

codex
이제 충분합니다. 핵심은 Plan E가 spec Axis E를 대체로 따라가지만, SoT 위치·기존 권한 모델·게이트 패턴이 몇 군데에서 서로 부딪칩니다. 답변은 항목별로 짧게 자르겠습니다.
codex
1. Axis E acceptance cover? 진단: 대체로 맞지만 12 AC 중 실질적으로 비어 있는 건 2개다. `harness-share` authoritative source 정합성 수정이 AC에 없다. read-only inspection 경계 정의도 검증 항목이 아니다. 권고: AC에 “SoT 재배선”과 “read-only 허용/금지 예시 고정” 추가.

2. Code-first boilerplate 진단: 방향은 맞다. 그런데 현재 `kzk-production-access`는 “명시 지시가 있으면 AI가 직접 실행” 모델이고, Plan E는 “AI 직접 write 금지”로 뒤집는다. 또 `Two-stage review FAIL` 표기는 현재 `Three-stage review`와 충돌한다. 권고: 권한 모델 rewrite를 명시하고, 리뷰 참조명도 최신화.

3. Gate 1.6 grep 패턴 진단: 지금 안은 허술하다. `psql .* ALTER`는 multiline, heredoc, `-f migration.sql` 다 놓친다. `aws s3api put-`는 문서/예시/테스트까지 과탐지한다. 비-멱등 SQL을 regex로 판정하는 건 무리다. 권고: “직접 실행 shell 흔적”만 FAIL, 멱등성은 WARN+human review로 낮춰라.

4. 환경 설정 예외 진단: 경계가 아직 흐리다. IaC-managed env var면 예외가 아니라 code-first가 맞다. 런타임 콘솔 수동 갱신만 예외여야 한다. 권고: `IaC-managed` / `runtime-only` 이분법으로 고정.

5. Drift forward-only 진단: “revert 금지”를 너무 넓게 쓰면 안 된다. production state rollback 금지이지, 코드 커밋 전체의 `git revert` 금지가 아니다. 권고: “state semantics” 기준으로 써라.

6. AI access 흐름 진단: script 작성→review→user/CI 실행은 맞다. 문제는 read-only inspection 범위와 explicit instruction 관계가 불명확하다. 권고: “read도 explicit instruction 필요, write는 explicit instruction 있어도 AI 실행 금지(예외만 허용)”로 문장 잠가라.

7. Cross-axis 진단: B/D 연결은 대체로 맞다. 다만 B의 “callsite 전수”를 migration 영향 분석에 그대로 투영하면 어색하다. 권고: production은 “impacted schema/query/ORM/API artifact 전수”로 표현 변경.

8. `harness-share.md §17.X` 진단: 이건 틀렸다. 현재 §17은 References다. 게다가 `kzk-production-access` authoritative source는 아직 §2다. 권고: §2 하위 subsection으로 넣고, 모든 source reference를 한 번에 바꿔라.

9. Test 전략 진단: `skill-text-checks.sh` 확장만으로는 부족하다. 존재 확인이지 동작 검증이 아니다. 권고: Gate 1.6용 fixture-based shell test 1개는 추가.

10. Rollback 6-level 진단: Plan E는 더 단순해야 한다. 신규 skill/hook 없음인데 D의 롤백 복잡도를 끌고 오면 과하다. 권고: “revert Plan E commit” + “Gate 1.6 disable” 정도로 축소.

11. Skill count 진단: none.

12. 놓친 함정 진단: `production|prod|migration|IaC` 같은 commit-message trigger는 문서 커밋도 게이트 발동시킨다. `harness-share §2`는 여전히 destructive direct execution을 허용한다. Plan E 커밋은 `.sh` 수정이 있어 doc-only fast path도 아니다. 권고: trigger를 staged path + shell diff 중심으로 좁혀라.

Bottom-line: REVISE
tokens used
55,858
1. Axis E acceptance cover? 진단: 대체로 맞지만 12 AC 중 실질적으로 비어 있는 건 2개다. `harness-share` authoritative source 정합성 수정이 AC에 없다. read-only inspection 경계 정의도 검증 항목이 아니다. 권고: AC에 “SoT 재배선”과 “read-only 허용/금지 예시 고정” 추가.

2. Code-first boilerplate 진단: 방향은 맞다. 그런데 현재 `kzk-production-access`는 “명시 지시가 있으면 AI가 직접 실행” 모델이고, Plan E는 “AI 직접 write 금지”로 뒤집는다. 또 `Two-stage review FAIL` 표기는 현재 `Three-stage review`와 충돌한다. 권고: 권한 모델 rewrite를 명시하고, 리뷰 참조명도 최신화.

3. Gate 1.6 grep 패턴 진단: 지금 안은 허술하다. `psql .* ALTER`는 multiline, heredoc, `-f migration.sql` 다 놓친다. `aws s3api put-`는 문서/예시/테스트까지 과탐지한다. 비-멱등 SQL을 regex로 판정하는 건 무리다. 권고: “직접 실행 shell 흔적”만 FAIL, 멱등성은 WARN+human review로 낮춰라.

4. 환경 설정 예외 진단: 경계가 아직 흐리다. IaC-managed env var면 예외가 아니라 code-first가 맞다. 런타임 콘솔 수동 갱신만 예외여야 한다. 권고: `IaC-managed` / `runtime-only` 이분법으로 고정.

5. Drift forward-only 진단: “revert 금지”를 너무 넓게 쓰면 안 된다. production state rollback 금지이지, 코드 커밋 전체의 `git revert` 금지가 아니다. 권고: “state semantics” 기준으로 써라.

6. AI access 흐름 진단: script 작성→review→user/CI 실행은 맞다. 문제는 read-only inspection 범위와 explicit instruction 관계가 불명확하다. 권고: “read도 explicit instruction 필요, write는 explicit instruction 있어도 AI 실행 금지(예외만 허용)”로 문장 잠가라.

7. Cross-axis 진단: B/D 연결은 대체로 맞다. 다만 B의 “callsite 전수”를 migration 영향 분석에 그대로 투영하면 어색하다. 권고: production은 “impacted schema/query/ORM/API artifact 전수”로 표현 변경.

8. `harness-share.md §17.X` 진단: 이건 틀렸다. 현재 §17은 References다. 게다가 `kzk-production-access` authoritative source는 아직 §2다. 권고: §2 하위 subsection으로 넣고, 모든 source reference를 한 번에 바꿔라.

9. Test 전략 진단: `skill-text-checks.sh` 확장만으로는 부족하다. 존재 확인이지 동작 검증이 아니다. 권고: Gate 1.6용 fixture-based shell test 1개는 추가.

10. Rollback 6-level 진단: Plan E는 더 단순해야 한다. 신규 skill/hook 없음인데 D의 롤백 복잡도를 끌고 오면 과하다. 권고: “revert Plan E commit” + “Gate 1.6 disable” 정도로 축소.

11. Skill count 진단: none.

12. 놓친 함정 진단: `production|prod|migration|IaC` 같은 commit-message trigger는 문서 커밋도 게이트 발동시킨다. `harness-share §2`는 여전히 destructive direct execution을 허용한다. Plan E 커밋은 `.sh` 수정이 있어 doc-only fast path도 아니다. 권고: trigger를 staged path + shell diff 중심으로 좁혀라.

Bottom-line: REVISE
