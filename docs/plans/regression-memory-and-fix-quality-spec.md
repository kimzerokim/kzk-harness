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

| Cycle 2 # | rev3 답 위치 |
|---|---|
| #1 CRITICAL (gstack schema) | §Storage 모델 sidecar — 임의 필드 회피 |
| #1 MAJOR (Plan D 자가오염) | Locked (default DISABLED) + Axis D 자가-skip guard |
| #2 MAJOR (메인 TDD 갭) | Axis A Layer (b) 메인 self-check |
| #4 MAJOR (Hook 양다리) | Locked (append 채택, dispatcher 비추) |
| #5 MAJOR (Test 실효성) | §Test 전략 한계 명시 + Non-goals |
| #7 MAJOR (회고 5W1H) | Axis D §Cycle 회고 통합 5W1H 표 |
| minor (run-tests.sh 라우팅) | §Test 전략 라우팅 명시 |
| minor (branch 시점) | rev3 헤더 — 이미 생성됨 |

| Cycle 3 # | rev4 답 위치 |
|---|---|
| #1 CRITICAL (sidecar derived view 명명 거짓) | Locked + §Sidecar = metadata extension with own SoT — wording 정정 |
| #2 MAJOR (Default DISABLED first-enable 망각) | Locked + §Default DISABLED — main 머지 자동 enable via kzk-pre-merge-sync |
| #3 MAJOR (Layer b 메인 TDD 갭 미해결) | Locked + Axis A Layer (b) — 자율 mode 메인 직접 TDD 금지 (강화) |
| #4 MAJOR (Hook append dependency) | Locked — `--regression-recall` 시 keyword-detector 자동 enable |
| #5 MAJOR (gstack silent skip 메타갭) | Locked + §Cycle 회고 5W1H 실패시 — stderr WARN + 표기 의무 |
| #6 MAJOR (fixture backend drift) | §Test 전략 — Plan D Step 0 fixture 재캡처 의무 |
| #7 MINOR (verifier 인용 범위) | Axis C — acceptance criteria 발췌 inline copy 만 |

| Cycle 4 # | rev5 답 위치 |
|---|---|
| #1 MAJOR (pre-merge-sync SKILL.md 의무) | §Plan 분할 Plan D 행 — 주요 변경에 명시 추가 |
| #2 MAJOR (자율 키워드 false positive) | Axis A Layer (b) — 환경변수 우선, 키워드 동사구로 좁힘 |
| #3 MAJOR (orphan cleanup) | §Storage 모델 sidecar — recall hook + stale-check 자동 GC 명시 |
| #4 (gstack 시그니처) | none — Plan D Step 0 위임 OK |
| #5 MINOR (acceptance 발췌 주체) | Plan C 위임 (`## Acceptance Criteria` 헤더 grep 추출) |
