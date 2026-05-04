OpenAI Codex v0.120.0 (research preview)
--------
workdir: /Users/kimzerokim/work/personal/kzk-harness
model: gpt-5.4
provider: openai
approval: never
sandbox: read-only
reasoning effort: high
reasoning summaries: none
session id: 019df2c8-8621-7283-bf5e-80a5bb14d766
--------
user
Plan C draft (rev1) 검토. brutally honest, 한국어, no compliments.

## Read 의무

`/Users/kimzerokim/work/personal/kzk-harness/docs/plans/regression-memory-and-fix-quality-spec.md` (spec rev7, frozen)
`/Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-C-fresh-agent-verification.md` (rev1)
`/Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-A-tdd-self-verification-block.md`
`/Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-D-regression-memory.md`
`/Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-B-fix-scope-expansion.md`

## Context

Plan C = `kzk-large-task-delegation §Three-stage review` (Stage 3 추가) + `kzk-pre-commit-gate` Gate 5. 신규 skill 없음. 메인 self-approve 차단 의무. verifier model 분기 (`git diff --shortstat`).

## LOCKED PRIOR DECISIONS

- Verifier model 분기 = `git diff --shortstat` 3 파일 미만 + 100 LoC 미만 → sonnet, 그 외 → opus
- PASS / FAIL / PARTIAL 강제. 2 consecutive FAIL → halt + Q-VERIFIER-FAIL
- Stage 3 (cycle 단위) ↔ Gate 5 (commit 단위) 분리. 캐시 활용 중복 호출 차단
- Plan A follow-up Q-TDD-MAIN cross-ref 흡수
- 비-자율 mode 의 user ACK 게이트는 Plan A 책임 (Plan C 는 자율 mode 의 verifier 만)
- Verifier prompt 에 acceptance criteria 발췌 inline copy 만 (전체 600줄 read 금지)
- Branch / PR / merge 정책

## YOUR JOB — 12 카테고리

1. **Axis C acceptance cover?** Stage 3 + Gate 5 + verifier 분기 모두 task 1-7 매핑?
2. **Stage 3 ↔ Gate 5 분리** — cycle 단위 vs commit 단위. 메모리 cache 로 중복 호출 차단 룰 정확? cache TTL?
3. **Verifier model 분기** — `git diff --shortstat` mock 으로 분기 결정 명확? 3 파일 / 100 LoC 임계 정확?
4. **Verifier prompt 구조** — acceptance criteria 발췌 추출 룰 (Plan B 의 issue 9 - SoT 거짓말 회피)?
5. **PASS / FAIL / PARTIAL 강제** — verifier subagent 가 다른 형식 응답 시 처리? PARTIAL 의 정확 판별?
6. **Q-VERIFIER-FAIL halt** — 2 consecutive FAIL 정의 (cycle 간 vs cycle 내)?
7. **Q-TDD-MAIN cross-ref** — Plan A 가 위임한 follow-up. Task 3 에서 어떻게 흡수?
8. **kzk-autonomous-boundary 변경** — halt 룰 표 update. 위 두 Q-* entry 추가만? 또는 더 큰 변경?
9. **Test 전략** — verifier-routing.test.sh mock 의 한계?
10. **Rollback 7-level**?
11. **Skill count** — Plan C 는 신규 skill 없음. 14→16 sync 안 함?
12. **놓친 함정**

각 항목 짧은 진단 + 권고. fine "none". 마지막 줄 "Bottom-line: SHIP" 또는 "REVISE".

500단어 이내.

codex
요청한 5개 문서를 먼저 읽고, Plan C rev1이 spec rev7과 A/B/D의 잠금 결정에 실제로 맞는지 기준부터 맞추겠습니다. 그 다음 12개 항목을 짧게 잘라서, 빈 구멍과 수정 필요 지점만 남기겠습니다.
exec
/bin/zsh -lc "sed -n '1,260p' docs/plans/plan-C-fresh-agent-verification.md" in /Users/kimzerokim/work/personal/kzk-harness
exec
/bin/zsh -lc "sed -n '1,220p' docs/plans/plan-B-fix-scope-expansion.md" in /Users/kimzerokim/work/personal/kzk-harness
exec
/bin/zsh -lc "sed -n '1,220p' docs/plans/plan-A-tdd-self-verification-block.md" in /Users/kimzerokim/work/personal/kzk-harness
exec
/bin/zsh -lc "sed -n '1,260p' docs/plans/regression-memory-and-fix-quality-spec.md" in /Users/kimzerokim/work/personal/kzk-harness
exec
/bin/zsh -lc "sed -n '1,220p' docs/plans/plan-D-regression-memory.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
# Plan C — Fresh-agent Verification (Stage 3 + Pre-commit Gate 5) — rev1

> Spec: `docs/plans/regression-memory-and-fix-quality-spec.md` (rev7, frozen) — Axis C.
> Branch: `feature/memory`. Order: A → D → B → **C (this)** → E.
> Sister plans: A (frozen), D (frozen), B (rev1).
> Status: **Draft** (codex review 의무 — `kzk-spec-and-review §Cost/cadence` "1 plan = 1 round").

## Goal

`kzk-large-task-delegation` 의 §Two-stage review 를 **§Three-stage review** 로 확장 + `kzk-pre-commit-gate` 에 **Gate 5** 추가. AI 자율실행 cycle 의 5 메타갭 중 *자기검증* 차단 — 메인이 자기 fix 를 자기 review pass 선언하는 패턴을 fresh-agent verifier 로 격리한다.

핵심 메커니즘:
- **Stage 3** — cycle 끝 / large-task delegation 끝의 multi-file fix (3+ 파일) 직후 fresh `oh-my-claudecode:verifier` (또는 `oh-my-claudecode:code-reviewer`) dispatch. 메인 self-approve 금지.
- **Model 분기**: `git diff --shortstat HEAD~1` → 3 파일 미만 + 100 LoC 미만 → sonnet, 그 외 → opus.
- **Verifier prompt**: 변경 파일 list + acceptance criteria 발췌 inline copy (전체 spec read 금지). 토큰/cache 부담 차단.
- **PASS / FAIL / PARTIAL 강제**. PARTIAL → 추가 fix cycle. **2 consecutive FAIL → halt + user-queue (Q-VERIFIER-FAIL)**.
- **Gate 5** — commit 직전 final check. Stage 3 결과 PASS 인용 (already 호출됐으면) 또는 호출 후 PASS 대기. Stage 3 (cycle 단위) 와 Gate 5 (commit 단위) 분리. 대부분 cycle 끝 commit 에서 동시 발동 → 한 번 verifier 호출 + 두 단계 모두 결과 인용.
- **kzk-autonomous-boundary halt 룰**: Plan A 의 **Q-TDD-MAIN** (메인 직접 TDD 시도) cross-ref 흡수 + **Q-VERIFIER-FAIL** (Plan C — verifier 2 consecutive FAIL) 추가.

## Acceptance Criteria

1. `skills/kzk-large-task-delegation/SKILL.md` v1.6.0 → v1.7.0 — 기존 §Two-stage review 를 §Three-stage review 로 rename + Stage 3 신규 (조건 + verifier dispatch + model 분기 + prompt 구조 + PASS/FAIL/PARTIAL + halt 룰). Plan D 의 recall inject 룰 + Plan B 의 fix-scope cache inject 룰 보존
2. `skills/kzk-pre-commit-gate/SKILL.md` v1.3.0 → v1.4.0 — `## Gate 5 — Fresh-agent verifier (Plan C)` 신규 section. 위치: Plan B 의 Gate 4.5 다음, `## Doc-only commit exception` 직전. frontmatter description 에 `Gate 5` trigger 추가. Triggers list 에 `Gate 5`, `verifier`, `fresh-agent verification`, `Q-VERIFIER-FAIL` 추가
3. `skills/kzk-autonomous-boundary/SKILL.md` v1.2.0 → v1.3.0 — §Halt conditions 표 (또는 bullet list) 에 `Q-TDD-MAIN` (Plan A follow-up cross-ref) + `Q-VERIFIER-FAIL` (Plan C — verifier 2 consecutive FAIL) 두 entry 추가. Triggers list 에 `Q-TDD-MAIN`, `Q-VERIFIER-FAIL`, `verifier 2 FAIL` 추가. Plan A frozen 시 follow-up 으로 위임된 Q-TDD-MAIN cross-ref 본 plan 에서 처리
4. `harness-share.md` 갱신 — §3 Pre-commit Gate 끝에 Gate 5 룰 cross-ref + §4 Subagent-Driven Dispatch 끝에 Stage 3 룰 cross-ref. Plan A 의 §11.1 Anti-Self-Verification 보존, Plan B 의 §3.5 Fix Scope Expansion 보존, Plan D 의 §29 Regression Memory 보존
5. `install/test/verifier-routing.test.sh` 신규 — `git diff --shortstat` mock 입력 → 분기 결과 (sonnet vs opus echo) 검증. 최소 6 case (3 파일 + 50 LoC → sonnet / 2 파일 + 99 LoC → sonnet / 3 파일 + 100 LoC → opus / 4 파일 + 50 LoC → opus / 1 파일 + 200 LoC → opus / 0 파일 = empty diff → opus default safe). bash 단독 (`*.test.sh` → bash 라우팅 per spec rev7 §Test 전략)
6. `install/test/run-tests.sh` 갱신 — `verifier-routing.test.sh` 호출 등록. 위치: 종합 result 출력 직전, Plan A 의 `skill-text-checks.sh` block 다음
7. **CLAUDE.md / README.md skill count 검증 — Plan C 변경 없음 확인**. Plan C 는 신규 skill 없음 (kzk-large-task-delegation / kzk-pre-commit-gate / kzk-autonomous-boundary 셋 다 기존 skill). `git diff CLAUDE.md README.md` 결과에 skill count line / "All N skills" line 포함 안 됨 명시 점검. Skill count = Plan D + B 합산값 (14→16) 그대로 유지
8. Stage 3 와 Gate 5 의 분리 룰 명시 — Stage 3 = "이 cycle 결과가 spec 만족하는가" (cycle 단위), Gate 5 = "이 commit 의 diff 가 verifier PASS 받았는가" (commit 단위). 같은 cycle 끝 commit 에서 동시 발동 시 한 번 verifier 호출 + 두 단계 모두 결과 인용 (중복 호출 차단)
9. Verifier prompt 의 acceptance criteria inline copy 룰 명시 — `## Acceptance Criteria` 헤더 다음 `## Variables` 또는 다음 `## ` 헤더 직전까지 grep 추출. spec rev7 cycle 4 #5 답 (acceptance 발췌 주체 = Plan C 책임)
10. `bash install/test/run-tests.sh` PASS (verifier-routing.test.sh 포함 전체 통과)
11. atomic commit 메시지: `feat(skill): kzk-large-task-delegation Stage 3 + Gate 5 — fresh-agent verifier (Plan C)`

## Variables

- `SKILL_LTD = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-large-task-delegation/SKILL.md`
- `SKILL_PCG = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-pre-commit-gate/SKILL.md`
- `SKILL_AB = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-autonomous-boundary/SKILL.md`
- `SHARE = /Users/kimzerokim/work/personal/kzk-harness/harness-share.md`
- `TEST_VERIFIER = /Users/kimzerokim/work/personal/kzk-harness/install/test/verifier-routing.test.sh`
- `TEST_RUN = /Users/kimzerokim/work/personal/kzk-harness/install/test/run-tests.sh`
- `CLAUDE_MD = /Users/kimzerokim/work/personal/kzk-harness/CLAUDE.md`
- `README = /Users/kimzerokim/work/personal/kzk-harness/README.md`

## Tasks

### Task 1 — `kzk-large-task-delegation/SKILL.md` v1.7.0 (§Two-stage → §Three-stage)

**File**: `$SKILL_LTD`

**Frontmatter 변경**:
- `version: 1.6.0` → `version: 1.7.0`
- description 끝에 trigger 추가: `'Stage 3'`, `'fresh-agent verifier'`, `'verifier dispatch'`

**Triggers section 갱신** (line 13): 끝에 추가
```
'Stage 3', 'fresh-agent verifier', 'verifier dispatch', 'verifier model routing', 'PASS FAIL PARTIAL', 'Q-VERIFIER-FAIL'.
```

**§Two-stage review 변경 — 섹션 rename + Stage 3 추가**:

기존 `## Two-stage review (mandatory after each subagent finishes)` 섹션 (line 273 부근) 을 `## Three-stage review (mandatory after each subagent finishes)` 로 rename. 기존 1-4 항목 (trust-but-verify / build·test / spec acceptance / coverage) 모두 보존 — Stage 1 (trust-but-verify), Stage 2 (build/test/Playwright + spec acceptance + coverage 통합) 으로 묶고, **Stage 3 신규** 추가:

```markdown
## Three-stage review (mandatory after each subagent finishes)

### Stage 1 — Trust-but-verify

`git log` + `git diff` + dist artifact 직접 확인. agent summary 만 신뢰 X — implementation 차원 검증 의무.

### Stage 2 — Gate 통합 (build/test/Playwright + spec acceptance + coverage)

1. Build / test / Playwright (if applicable) result
2. Spec acceptance criteria 충족 확인
3. Coverage on touched files (per `kzk-test-coverage` — 100% line + branch on changed files; exemption only with explicit Q-COV-* entry in `docs/harness/user-queue.md`)

### Stage 3 — Fresh-agent verification (Plan C)

조건 (셋 다 만족 시 의무):
- 자율실행 cycle 끝 (`kzk-autonomous-boundary` 진입한 mode) 또는 large-task delegation 끝
- multi-file fix (`git diff --name-only HEAD~1` 결과 3+ 파일)
- 메인이 직접 author 한 commit 아니라 subagent dispatch 결과

**메인 self-approve 금지** — Stage 1/2 만으로 commit 진행 X. Stage 3 PASS 받기 전에는 commit 금지 (Gate 5 와 동시 enforcement).

#### Verifier dispatch

```typescript
// model 분기 — git diff --shortstat HEAD~1 결과 기준
// 3 파일 미만 + 100 LoC 미만 → sonnet
// 그 외 → opus
// empty diff (HEAD~1 부재 등) → opus default safe

Agent({
  subagent_type: 'oh-my-claudecode:verifier',  // 선호
  // 또는 'oh-my-claudecode:code-reviewer'  // verifier 부재 환경 fallback
  model: <branch result>,
  prompt: <Verifier prompt — 아래 구조>,
});
```

#### Verifier prompt 구조

세 블록 필수, 그 외 inline 금지:

1. **변경 파일 목록** — `git diff --name-only HEAD~1` 결과 verbatim
2. **Acceptance criteria 발췌 (inline copy)** — 원본 user request 또는 spec/plan 의 `## Acceptance Criteria` 헤더 다음 `## Variables` (또는 다음 `## ` 헤더) 직전까지의 텍스트 grep 추출 후 prompt 에 verbatim inline. **전체 spec read 금지** (토큰/cache 부담 차단). spec/plan 파일 경로 reference 만 추가 — verifier 가 필요 시 spot read
3. **질문 블록** — 다음 4 질문 verbatim:
   ```
   1. 이 diff 가 acceptance criteria 를 만족하는가?
   2. missing edge case 있는가?
   3. regression 가능성 있는가? (인접 callsite, 인접 모듈, 같은 패턴 재사용)
   4. scope 누수 있는가? (acceptance 에 없는 추가 변경)
   응답: PASS / FAIL / PARTIAL 강제. 이유 3-5 줄.
   ```

#### PASS / FAIL / PARTIAL 처리

| Verdict | 처리 |
|---|---|
| PASS | Stage 3 통과 → Gate 5 가 인용. commit 진행 OK |
| PARTIAL | 추가 fix cycle 1회 (메인이 verifier 지적사항 수렴 → 추가 subagent dispatch → 새 diff → Stage 3 재호출). PARTIAL 2 consecutive → FAIL 로 escalate |
| FAIL | 메인이 verifier 지적사항 수렴 → fix dispatch → 재호출. **2 consecutive FAIL** → halt + user-queue entry `Q-VERIFIER-FAIL — verifier 2회 연속 FAIL, 사용자 결정 필요 (verifier 지적 무시 / 추가 fix / plan revision)` |

PARTIAL 의 escalate 룰: 같은 diff 또는 동일 verifier 지적사항이 2회 연속 PARTIAL 이면 FAIL 로 카운트. 다른 지적사항으로 PARTIAL → counter reset.

#### Stage 3 와 Gate 5 분리 (중복 호출 차단)

- **Stage 3** = "이 cycle 결과가 spec 만족하는가" — cycle 단위, large-task delegation 끝에서 호출
- **Gate 5** = "이 commit 의 diff 가 verifier PASS 받았는가" — commit 단위, `kzk-pre-commit-gate` Gate 5 가 호출

대부분 cycle 끝 commit 에서 두 단계 동시 발동. 룰:
1. 메인이 cycle 끝 commit 진행 → Stage 3 호출 → PASS 받음 → cache 결과 (`.kzk-harness/verifier-cache.json` 같은 sidecar — 본 plan 은 메모리 only, file persistence 는 Plan E fast-follow 후보)
2. Pre-commit Gate 5 진입 시 Stage 3 cache PASS 인용 → 추가 호출 X
3. Stage 3 cache 부재 시 Gate 5 가 verifier 새로 호출

**중복 차단의 단순 규칙**: 같은 commit 의 같은 diff (`git diff --cached` SHA) 에 대해 verifier 1회만 호출. 메인이 호출 시점 (Stage 3 vs Gate 5) 만 다를 뿐.

본 plan 의 cache 는 메모리 only — 대화 turn 내 메인이 Stage 3 결과를 보유하면 Gate 5 가 그대로 인용. 새 turn (사용자 응답 후) 면 Gate 5 가 verifier 재호출. Plan E fast-follow 에서 sidecar persistence 검토.
```

**§Subagent prompt requirements 의 Recall 결과 inject 룰 보존** (line 230 부근, Plan D 가 추가한 룰): 변경 없음. Plan D rev2 frozen 룰 그대로 잔존.

**§Subagent prompt requirements 의 fix-scope cache inject 룰 보존** (Plan B 가 line 230 부근에 추가한 룰): 변경 없음. Plan B rev1 룰 그대로 잔존.

**§Sonnet executor — Anti-self-verification boilerplate 보존** (line 249 부근, Plan A 가 추가): 변경 없음. Plan A rev2 frozen 룰 그대로 잔존.

**§Interaction with other kzk-* 갱신** — 끝에 추가:
```
- **kzk-pre-commit-gate**: Gate 5 가 본 skill 의 Stage 3 결과를 인용. 같은 diff 에 verifier 중복 호출 차단 (메모리 cache).
- **kzk-autonomous-boundary**: Stage 3 verifier 2 consecutive FAIL → `Q-VERIFIER-FAIL` user-queue entry. autonomous-boundary 의 halt 룰 표가 본 entry 를 포함.
```

### Task 2 — `kzk-pre-commit-gate/SKILL.md` v1.4.0 (Gate 5 신규)

**File**: `$SKILL_PCG`

**Frontmatter 변경**:
- `version: 1.3.0` → `version: 1.4.0` (Plan B 가 1.2 → 1.3 한 다음 본 plan 이 1.3 → 1.4. Plan B frozen 후 base 가 1.3.0 임을 확인)
- description 끝에 trigger 추가: `'Gate 5'`, `'verifier'`, `'fresh-agent verification'`

**Triggers section 갱신** (line 13): 끝에 추가
```
`Gate 5`, `verifier`, `fresh-agent verification`, `Stage 3 cite`, `Q-VERIFIER-FAIL`.
```

**§Gate 5 신규 section 추가** — 위치: Plan B 가 추가한 `## Gate 4.5 — Fix Scope Sanity Check (Plan B)` 다음, `## Doc-only commit exception` 직전:

```markdown
## Gate 5 — Fresh-agent verifier (Plan C)

Commit 직전 final check. `kzk-large-task-delegation` §Three-stage review 의 Stage 3 결과 PASS 확인.

**적용 조건** (Gate 4.5 통과 후 evaluate, 셋 중 하나라도 false → Gate 5 N/A):
- 자율실행 mode (`kzk-autonomous-boundary` 진입) 또는 large-task delegation 끝의 commit
- `git diff --cached --name-only` 결과 3+ 파일
- 변경이 subagent dispatch 결과 (메인 직접 author 아님)

조건 만족 시:
1. **Stage 3 cache 있는가** — 같은 diff 에 대해 메인이 Stage 3 verifier 를 이미 호출했고 PASS 받았는가? cache hit → 그 PASS 인용 + commit body 에 `Gate 5: Stage 3 cite (verifier <subagent_type> <model>) PASS — <verifier 인용 1줄>` 라인. PASS.
2. cache 부재 → Gate 5 가 verifier 새로 호출. dispatch 룰은 §Three-stage review §Verifier dispatch 와 동일 (model 분기 = `git diff --cached --shortstat` 결과). 응답:
   - PASS → commit 진행
   - PARTIAL → commit BLOCK + 메인이 추가 fix cycle. 같은 PARTIAL 2회 → FAIL escalate
   - FAIL → commit BLOCK + 메인이 fix cycle. **2 consecutive FAIL → halt + `Q-VERIFIER-FAIL` user-queue entry**. `kzk-autonomous-boundary` 의 halt 룰과 통합
3. Verifier 호출 자체가 unavailable (subagent dispatch 실패, 환경 문제) → Gate 5 BLOCK + 사용자 prompt: "verifier dispatch 실패. fallback codex CLI consult 또는 사용자 직접 review 결정 필요"

**Stage 3 vs Gate 5 의 분리** (중복 호출 차단):
- Stage 3 = cycle 단위 ("이 cycle 결과가 spec 만족하는가")
- Gate 5 = commit 단위 ("이 commit 의 diff 가 verifier PASS 받았는가")

같은 cycle 끝 commit 에서 두 단계 동시 발동 시 verifier 1회만 호출 + 두 단계 모두 결과 인용. cache 룰은 §Three-stage review §중복 차단의 단순 규칙 따름 (메모리 only, 대화 turn 내 cache).

**Doc-only commit 예외**: source code 변경 없는 doc-only commit 은 Gate 5 N/A (Gate 0–4 의 doc-only 예외와 동일 룰).

**Autonomous mode**: Gate 5 PASS 시 사용자 confirm 없이 commit 허용 (다른 gate 와 동일 정책). FAIL 또는 BLOCK 시 halt + user-queue.
```

**§Failure protocol 갱신** (line 119 부근) — 기존 bullet 끝에 추가:
```
- Gate 5 verifier 2 consecutive FAIL on the same diff → halt + `Q-VERIFIER-FAIL` user-queue entry. See `kzk-autonomous-boundary` for the halt condition table.
```

**§Interaction with other kzk-* 갱신** — 끝에 추가:
```
- **kzk-large-task-delegation**: Gate 5 의 verifier dispatch 룰은 본 skill 의 §Three-stage review §Stage 3 와 sibling. 같은 diff 의 verifier 호출 1회만 (cache hit citation 우선).
```

### Task 3 — `kzk-autonomous-boundary/SKILL.md` v1.3.0 (Q-TDD-MAIN + Q-VERIFIER-FAIL)

**File**: `$SKILL_AB`

**Frontmatter 변경**:
- `version: 1.2.0` → `version: 1.3.0`
- description 변경 없음 (트리거는 본문 §Triggers 에서 확장)

**Triggers section 갱신** (line 13): 끝에 추가
```
, `Q-TDD-MAIN`, `Q-VERIFIER-FAIL`, `verifier 2 FAIL`, `메인 직접 TDD halt`, `verifier consecutive FAIL halt`.
```

**§Halt conditions 갱신** (line 49 부근) — 기존 bullet list 끝에 추가:

```markdown
- **Q-TDD-MAIN** — 자율실행 mode 에서 메인 컨텍스트가 직접 TDD red 단계 진입 시도 (Plan A Layer b cross-ref). 룰 본문 = `kzk-test-coverage` §Anti-pattern — Test-from-implementation 의 §자율 mode 메인 직접 TDD 금지. halt + user-queue entry: `Q-TDD-MAIN — 자율 cycle 의 메인 직접 TDD 시도, fresh sonnet dispatch 재시작 필요`. cross-ref: `kzk-test-coverage`, `kzk-large-task-delegation` §Anti-self-verification boilerplate
- **Q-VERIFIER-FAIL** — `kzk-large-task-delegation` Stage 3 / `kzk-pre-commit-gate` Gate 5 의 verifier (`oh-my-claudecode:verifier` 또는 `oh-my-claudecode:code-reviewer`) 가 같은 diff 에 대해 2 consecutive FAIL (PARTIAL 2회 도 같은 지적사항이면 FAIL 로 escalate). halt + user-queue entry: `Q-VERIFIER-FAIL — verifier 2회 연속 FAIL, 사용자 결정 필요 (verifier 지적 무시 / 추가 fix / plan revision)`. cross-ref: `kzk-large-task-delegation` §Three-stage review §Stage 3, `kzk-pre-commit-gate` §Gate 5
```

**§Interaction with other kzk-* 갱신** — 끝에 추가:
```
- **kzk-test-coverage**: Plan A Layer (b) 자율 mode 메인 직접 TDD 금지 룰의 halt entry (`Q-TDD-MAIN`) 가 본 skill 의 §Halt conditions 표에 등록됨.
- **kzk-large-task-delegation / kzk-pre-commit-gate**: Plan C Stage 3 / Gate 5 verifier 2 consecutive FAIL 의 halt entry (`Q-VERIFIER-FAIL`) 가 본 skill 의 §Halt conditions 표에 등록됨.
```

### Task 4 — `harness-share.md` cross-ref 갱신 (§3 + §4)

**File**: `$SHARE`

**§3 Pre-commit Gate (6 단계) 끝 추가** — 위치: `### Token migration — shadcn + Tailwind v4 bridge requirement` 직전:

```markdown
### Gate 5 — Fresh-agent verifier (Plan C)

자율실행 mode 또는 large-task delegation 끝의 multi-file fix (3+ 파일, subagent dispatch 결과) 의 commit 직전:
- `oh-my-claudecode:verifier` (또는 `oh-my-claudecode:code-reviewer`) dispatch
- model 분기: `git diff --cached --shortstat` → 3 파일 미만 + 100 LoC 미만 → sonnet, 그 외 → opus
- 메인 self-approve 금지. PASS 받기 전 commit BLOCK
- PASS / FAIL / PARTIAL 강제. 2 consecutive FAIL → halt + `Q-VERIFIER-FAIL` user-queue entry (`kzk-autonomous-boundary` §Halt conditions)
- Stage 3 cache 있으면 인용 (중복 호출 차단)

룰 본문: `kzk-pre-commit-gate` §Gate 5, `kzk-large-task-delegation` §Three-stage review §Stage 3.
```

**§4 Subagent-Driven Dispatch 끝 추가** — 위치: `### Two-stage review (subagent-driven-development skill 의무)` 다음, `## 5. Documentation Storage Rules` 직전:

기존 `### Two-stage review` 섹션 제목을 `### Three-stage review (subagent-driven-development skill 의무)` 로 rename 하지 않는다 (harness-share.md 본문은 cross-ref level 만 — skill 본문 우선). 대신 Two-stage review 섹션 끝에 새 항목 추가:

```markdown
4. **Stage 3 — Fresh-agent verification (Plan C)** — 자율실행 cycle 끝 또는 large-task delegation 끝의 multi-file fix (3+ 파일) commit 직전 fresh `oh-my-claudecode:verifier` dispatch. 메인 self-approve 금지. PASS / FAIL / PARTIAL. 2 consecutive FAIL → halt + `Q-VERIFIER-FAIL` user-queue. 룰 본문: `kzk-large-task-delegation` §Three-stage review §Stage 3.
```


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
# Plan D — Regression Memory + Auto-Recall Hook (rev2)

> Spec: `docs/plans/regression-memory-and-fix-quality-spec.md` (rev6, frozen — 5 plan wording).
> Branch: `feature/memory`. Order: A → **D (this)** → B → C → E (5 plan).
> Status: **Frozen** (codex CLI cycle 1 REVISE 12 항목 답 통합. `kzk-spec-and-review §Cost/cadence` "1 plan = 1 round" 룰 적용 — cycle 2 skip).
> Critic review verdict: `plan-D-regression-memory-critic-review.md` (cycle 1, REVISE).
> rev1 → rev2 변경: dismiss CLI mutation task 신규, sidecar schema 7필드 승격 (stale flag),
> Step 0 분기 정정, fail-closed 의무, orphan cleanup `searchHits` vs `allLearnKeys` 분리,
> 자가-skip guard 동사구만, sidecar atomic write 공용 utility, gstack 미설치 stderr WARN 의무,
> rollback 7-level, "5 plan" wording 정정.

## Goal

신규 skill `kzk-regression-memory` + recall hook 인프라 구축. AI 자율실행 cycle 이 과거 fix 기록을 fix 시작 시점에 자동 조회 (recall), regression 망각 차단. 본 plan 의 hook 은 **commit 시점에 default DISABLED** — keyword-detector 와의 dependency 충돌 + B/C cycle 자가오염 차단. **5 plan (A→D→B→C→E) 모두 끝나고 main 머지 시점**에 `kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 후) 되어 활성.

핵심 메커니즘:
- Backend = gstack `/learn` (5필드 표준 schema) + sidecar `.kzk-harness/regression-meta.jsonl` (own SoT for dismiss state, 7필드 — stale flag 포함)
- Recall = UserPromptSubmit hook → `/learn` keyword search + sidecar dismiss/decay → system-reminder inject
- Dismiss/Archive = `kzk-regression-memory dismiss <key>` CLI mutation path (`dismiss_count++`, `archived=true if dismiss_count>=3`)
- Cycle 회고 = cycle commit 직후 `gstack learn add` 호출 의무 (5W1H 표 따름)
- Stale check = `regression-stale-check.sh` cron/cycle-end 단발 — sidecar 의 `stale` 7번째 필드 update
- Atomic write = 모든 sidecar writer 가 공용 `install/lib/sidecar-write.mjs` 사용 (lockdir + tmp + atomic mv)
- gstack 미설치 시 = stderr WARN 의무 + structured `_warn` reason. silent skip 금지 (spec rev6 lock)

## Acceptance Criteria

1. `skills/kzk-regression-memory/SKILL.md` 신규 — frontmatter (name/version/description with triggers), §Triggers, §Storage 모델 (5필드 + sidecar **7필드**), §Recall 룰 (decay 공식 + archived 룰 + dismiss CLI), §자가-skip guard (동사구만), §Cycle 회고 5W1H 표, §Stale check, §Rollback (7 level), §Interaction with other kzk-*
2. `install/hooks/regression-recall.mjs` 신규 — UserPromptSubmit hook, 자가-skip guard 구현, /learn search + sidecar JSONL grep + decay + archived 필터링, system-reminder inject, gstack 미설치 시 stderr WARN + `_warn` reason, orphan cleanup 은 `allLearnKeys` snapshot 기준만. **default DISABLED** (settings.json 등록 안 함)
3. `install/lib/sidecar-write.mjs` 신규 — 공용 atomic writer utility (`acquireLock` + `writeAtomic`). hook + stale-check + dismiss CLI 모두 본 utility 사용
4. `install/scripts/regression-stale-check.sh` 신규 — sidecar 의 file_snapshot SHA vs HEAD 비교, archived 자동 X, 결과 stderr/stdout 출력. sidecar-write utility 통해 atomic update
5. `install/bin/kzk-regression-memory.mjs` 신규 — `dismiss <key>` subcommand (mutation path). `dismiss_count++`, `last_dismissed_at=ISO`, `archived=true if dismiss_count>=3`. atomic write 의무
6. `install/test/regression-recall.test.mjs` 신규 — mock fixture 기반 test (recall 매칭 + decay + dismiss + 자가-skip + orphan cleanup 시뮬 + dismiss CLI mutation + atomic write 동시성)
7. `install/test/fixtures/gstack-learnings.sample.jsonl` 신규 — Plan D Step 0 에서 실제 `gstack learn add` 출력 캡처본 (illustrative only, Step 0 actual wins)
8. `install/test/fixtures/regression-meta.sample.jsonl` 신규 — sidecar fixture (key/file_snapshot/related_cycles/dismiss_count/last_dismissed_at/archived/stale **7필드**)
9. `install/install-global.sh` `enable_hooks()` 확장 — `--regression-recall` flag 추가, regression-recall.mjs 등록 + keyword-detector 자동 enable (explicit dependency). **idempotent append** (jq 로 중복 entry 검사 후 append). 실패 시 exit non-zero
10. `install/dependencies.sh` 갱신 — gstack auto-install entry 추가 (npm-first → brew-fallback). 미설치 시 stderr WARN + SUMMARY 의무 표기 (silent skip 금지)
11. `install/test/run-tests.sh` 갱신 — `regression-recall.test.mjs` 호출 등록
12. `skills/kzk-pre-merge-sync/SKILL.md` 갱신 — 마지막 step `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트). **fail-closed**: 등록 실패 (jq 부재 / duplicate / exit non-zero) → merge block
13. `skills/kzk-web-loop/SKILL.md` 갱신 — cycle 끝의 step 6 직전에 `gstack learn add` 호출 (회고 entry, gstack 미설치 시 WARN). `file_snapshot` canonical source = `git rev-parse HEAD:<file>` (cycle 끝 evaluator)
14. `skills/kzk-large-task-delegation/SKILL.md` 갱신 — subagent dispatch prompt 에 recall 결과 inject 룰 추가. **size cap 200 char** (truncate + warning)
15. `harness-share.md` §28 신규 — Regression Memory protocol (Storage 모델 7필드 / Recall 룰 / dismiss CLI / 자가-skip guard / Stale check / Cycle 회고 / Rollback 7-level)
16. `CLAUDE.md` line 3 + "All N skills" line + `README.md` line 3 + install command skill count — 14→15 (Plan D 신규 skill 1개)
17. `bash install/test/run-tests.sh` PASS (regression-recall.test.mjs 포함 전체 통과)

## Variables

- `SKILL_RM = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-regression-memory/SKILL.md`
- `SKILL_PMS = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-pre-merge-sync/SKILL.md`
- `SKILL_WL = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-web-loop/SKILL.md`
- `SKILL_LTD = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-large-task-delegation/SKILL.md`
- `HOOK_RECALL = /Users/kimzerokim/work/personal/kzk-harness/install/hooks/regression-recall.mjs`
- `LIB_SIDECAR = /Users/kimzerokim/work/personal/kzk-harness/install/lib/sidecar-write.mjs`
- `SCRIPT_STALE = /Users/kimzerokim/work/personal/kzk-harness/install/scripts/regression-stale-check.sh`
- `BIN_DISMISS = /Users/kimzerokim/work/personal/kzk-harness/install/bin/kzk-regression-memory.mjs`
- `TEST_RECALL = /Users/kimzerokim/work/personal/kzk-harness/install/test/regression-recall.test.mjs`
- `FIXTURE_LEARN = /Users/kimzerokim/work/personal/kzk-harness/install/test/fixtures/gstack-learnings.sample.jsonl`
- `FIXTURE_META = /Users/kimzerokim/work/personal/kzk-harness/install/test/fixtures/regression-meta.sample.jsonl`
- `INSTALL_GLOBAL = /Users/kimzerokim/work/personal/kzk-harness/install/install-global.sh`
- `DEPS = /Users/kimzerokim/work/personal/kzk-harness/install/dependencies.sh`
- `TEST_RUN = /Users/kimzerokim/work/personal/kzk-harness/install/test/run-tests.sh`
- `SHARE = /Users/kimzerokim/work/personal/kzk-harness/harness-share.md`
- `CLAUDE_MD = /Users/kimzerokim/work/personal/kzk-harness/CLAUDE.md`
- `README = /Users/kimzerokim/work/personal/kzk-harness/README.md`

## Tasks

### Task 0 — gstack backend probe (CRITICAL — backend drift 차단)

**가장 먼저 실행. 이 step 의 출력이 모든 fixture / schema 가정의 single source of truth.**

진입 의존: gstack 설치되어 있어야 함. 미설치 환경 → 다음 분기 (codex #2 답 — backend lock 이면 recall 기능 stop, retro WARN 만 degraded):

1. `gstack --version` 또는 `gstack help` 시도. 명령 unavailable → **recall feature OFF** (hook silently no-op + stderr WARN), retro entry 만 degraded. Plan D 본 plan 자체 commit 진행 OK (hook default DISABLED 라 즉시 위협 X).

   **분기 명시**:
   - **gstack 미설치 → recall feature OFF**: hook 발동 시 `querylearn()` 가 null 반환 → `_warn:"gstack-not-installed"` structured reason + stderr WARN. inject 결과 0건. `kzk-pre-merge-sync` step 3 의 `--regression-recall` enable 도 사용자에게 명시 (확인 후 거부 가능)
   - **gstack 미설치 → cycle retro WARN 만 degraded 허용**: cycle commit 시 stderr WARN + harness-flow-progress entry 본문에 "regression memory 비활성 (gstack 미설치)" 의무 표기 (silent skip 금지). cycle 진행 자체는 계속

2. gstack 가용 시:
   ```bash
   gstack learn --help
   ```
   출력 캡처 → plan 본문의 `## Cycle 회고` 표 §How 행에 정확 시그니처 박음 (예: `gstack learn add --key <slug> --type <pitfall|pattern|architecture> --insight "..." --confidence <0-10> --source <fix|review|retro>`)

3. 실제 entry 1회 실행:
   ```bash
   gstack learn add --key plan-d-step-0-test --type pattern --insight "Step 0 backend probe — schema 검증" --confidence 5 --source retro
   ```

4. JSONL 출력 캡처 — `~/.gstack/projects/<slug>/learnings.jsonl` 의 추가된 마지막 line read

5. `$FIXTURE_LEARN` 로 복사 (실 backend 형식 = fixture 단일 source). git tracked. **fixture 헤더 comment**: `# illustrative only — Plan D Step 0 actual gstack output wins on drift`

6. spec rev6 §Storage 모델 의 entry schema (key/type/insight/confidence/source) 와 비교. 차이 발견 시 Plan D draft 자체를 수정 — `/learn` 의 actual schema 우선

7. `$FIXTURE_META` 는 spec §Storage 모델 sidecar schema (**7필드 — stale 포함**) 따라 hand-write 3 entries:
   ```jsonl
   {"key":"plan-d-step-0-test","file_snapshot":"install/hooks/regression-recall.mjs:42@abc1234","related_cycles":[31],"dismiss_count":0,"last_dismissed_at":null,"archived":false,"stale":false}
   {"key":"hypothetical-stale-bug","file_snapshot":"deleted/file.ts:10@old5678","related_cycles":[28],"dismiss_count":2,"last_dismissed_at":"2026-04-15T10:00:00Z","archived":false,"stale":true}
   {"key":"hypothetical-archived","file_snapshot":"src/old.ts:5@cafe9999","related_cycles":[20,22],"dismiss_count":3,"last_dismissed_at":"2026-04-20T10:00:00Z","archived":true,"stale":false}
   ```

8. 실패 시 user-queue entry: `Q-PLAN-D-STEP0 — gstack 미설치 또는 시그니처 캡처 실패, sidecar-only fallback 검토 필요`

**완료 게이트**: `$FIXTURE_LEARN` 와 `$FIXTURE_META` 둘 다 git-tracked, 실제 line 포맷 검증 (jq 또는 node 로 JSONL parse 가능).

### Task 1 — `kzk-regression-memory/SKILL.md` 신규 (~280 lines)

**File**: `$SKILL_RM`

**Frontmatter**:

```yaml
---
name: kzk-regression-memory
version: 1.0.0
description: "Regression memory + auto-recall — fix 시작 시 과거 유사 fix 자동 조회 (gstack /learn + sidecar). dismiss CLI mutation 포함. Top triggers: 'regression memory', '재발 방지', 'fix 시작', 'recall', '과거 fix 조회', 'dismiss recall'. Body §Triggers for full list."
---
```

**Body 구조** (Plan A 의 detail 수준):

```markdown
> Authoritative source: `harness-share.md` §28. On conflict, that wins.

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
3. `gstack learn search --query <kw>` (또는 `~/.gstack/projects/<slug>/learnings.jsonl` 직접 grep — Plan D Step 0 에서 시그니처 확정)
4. **gstack 미설치 시**: `querylearn()` 가 `_warn:"gstack-not-installed"` structured reason 반환. stderr WARN 출력. inject 결과 0건. silent skip 금지 (codex #7 답)
5. sidecar JSONL grep — 각 hit 의 dismiss_count, archived, last_dismissed_at, stale 조회
6. **Decay 공식**: `confidence_decayed = confidence * (0.85 ** dismiss_count)`. floating point.
7. 필터:
   - `archived: true` → 제외
   - `confidence_decayed < 4` → 제외
8. **Orphan cleanup** (codex #4 답 — `searchHits` vs `allLearnKeys` 분리):
   - **searchHits** = 현재 query 결과 keys (recall hit 만)
   - **allLearnKeys** = `gstack learn list --keys-only` 또는 전체 dump 의 keys
   - cleanup 은 `allLearnKeys` snapshot 기준만 — sidecar entry 의 key 가 `allLearnKeys` 에 부재 → 자동 삭제 + stderr 로그 (`[regression-recall] orphan key removed: <key>`). 현재 query 에 안 걸린 정상 entry 보존
9. 잔존 hits 으로 system-reminder inject:
   ```
   🚨 [REGRESSION RECALL] 과거 유사 fix N건:
   - <key>: <insight> (cycle <N>, confidence_decayed <X.XX>) [⚠ stale if SHA mismatch]
   ⚠ 자동 적용 금지. 매칭 정확성 검토 후 채택.
   dismiss: kzk-regression-memory dismiss <key>  (sidecar dismiss_count++)
   ```

매칭 0건 → `{"continue":true}` (silent pass-through, gstack 미설치 시 `_warn` 동봉)

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

 succeeded in 0ms:
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


codex
핵심 문구는 읽었습니다. 이제 line 기준으로 잠금 결정과 충돌하는 부분만 집어내서, 어느 항목이 비어 있는지 확인하겠습니다.
exec
/bin/zsh -lc 'rg -n "Stage 3|Gate 5|Q-VERIFIER-FAIL|Q-TDD-MAIN|cache|Acceptance Criteria|shortstat|PARTIAL|FAIL|skill count|rollback|TTL|empty diff|same diff|HEAD~1|git diff --cached" docs/plans/plan-C-fresh-agent-verification.md' in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
1:# Plan C — Fresh-agent Verification (Stage 3 + Pre-commit Gate 5) — rev1
10:`kzk-large-task-delegation` 의 §Two-stage review 를 **§Three-stage review** 로 확장 + `kzk-pre-commit-gate` 에 **Gate 5** 추가. AI 자율실행 cycle 의 5 메타갭 중 *자기검증* 차단 — 메인이 자기 fix 를 자기 review pass 선언하는 패턴을 fresh-agent verifier 로 격리한다.
13:- **Stage 3** — cycle 끝 / large-task delegation 끝의 multi-file fix (3+ 파일) 직후 fresh `oh-my-claudecode:verifier` (또는 `oh-my-claudecode:code-reviewer`) dispatch. 메인 self-approve 금지.
14:- **Model 분기**: `git diff --shortstat HEAD~1` → 3 파일 미만 + 100 LoC 미만 → sonnet, 그 외 → opus.
15:- **Verifier prompt**: 변경 파일 list + acceptance criteria 발췌 inline copy (전체 spec read 금지). 토큰/cache 부담 차단.
16:- **PASS / FAIL / PARTIAL 강제**. PARTIAL → 추가 fix cycle. **2 consecutive FAIL → halt + user-queue (Q-VERIFIER-FAIL)**.
17:- **Gate 5** — commit 직전 final check. Stage 3 결과 PASS 인용 (already 호출됐으면) 또는 호출 후 PASS 대기. Stage 3 (cycle 단위) 와 Gate 5 (commit 단위) 분리. 대부분 cycle 끝 commit 에서 동시 발동 → 한 번 verifier 호출 + 두 단계 모두 결과 인용.
18:- **kzk-autonomous-boundary halt 룰**: Plan A 의 **Q-TDD-MAIN** (메인 직접 TDD 시도) cross-ref 흡수 + **Q-VERIFIER-FAIL** (Plan C — verifier 2 consecutive FAIL) 추가.
20:## Acceptance Criteria
22:1. `skills/kzk-large-task-delegation/SKILL.md` v1.6.0 → v1.7.0 — 기존 §Two-stage review 를 §Three-stage review 로 rename + Stage 3 신규 (조건 + verifier dispatch + model 분기 + prompt 구조 + PASS/FAIL/PARTIAL + halt 룰). Plan D 의 recall inject 룰 + Plan B 의 fix-scope cache inject 룰 보존
23:2. `skills/kzk-pre-commit-gate/SKILL.md` v1.3.0 → v1.4.0 — `## Gate 5 — Fresh-agent verifier (Plan C)` 신규 section. 위치: Plan B 의 Gate 4.5 다음, `## Doc-only commit exception` 직전. frontmatter description 에 `Gate 5` trigger 추가. Triggers list 에 `Gate 5`, `verifier`, `fresh-agent verification`, `Q-VERIFIER-FAIL` 추가
24:3. `skills/kzk-autonomous-boundary/SKILL.md` v1.2.0 → v1.3.0 — §Halt conditions 표 (또는 bullet list) 에 `Q-TDD-MAIN` (Plan A follow-up cross-ref) + `Q-VERIFIER-FAIL` (Plan C — verifier 2 consecutive FAIL) 두 entry 추가. Triggers list 에 `Q-TDD-MAIN`, `Q-VERIFIER-FAIL`, `verifier 2 FAIL` 추가. Plan A frozen 시 follow-up 으로 위임된 Q-TDD-MAIN cross-ref 본 plan 에서 처리
25:4. `harness-share.md` 갱신 — §3 Pre-commit Gate 끝에 Gate 5 룰 cross-ref + §4 Subagent-Driven Dispatch 끝에 Stage 3 룰 cross-ref. Plan A 의 §11.1 Anti-Self-Verification 보존, Plan B 의 §3.5 Fix Scope Expansion 보존, Plan D 의 §29 Regression Memory 보존
26:5. `install/test/verifier-routing.test.sh` 신규 — `git diff --shortstat` mock 입력 → 분기 결과 (sonnet vs opus echo) 검증. 최소 6 case (3 파일 + 50 LoC → sonnet / 2 파일 + 99 LoC → sonnet / 3 파일 + 100 LoC → opus / 4 파일 + 50 LoC → opus / 1 파일 + 200 LoC → opus / 0 파일 = empty diff → opus default safe). bash 단독 (`*.test.sh` → bash 라우팅 per spec rev7 §Test 전략)
28:7. **CLAUDE.md / README.md skill count 검증 — Plan C 변경 없음 확인**. Plan C 는 신규 skill 없음 (kzk-large-task-delegation / kzk-pre-commit-gate / kzk-autonomous-boundary 셋 다 기존 skill). `git diff CLAUDE.md README.md` 결과에 skill count line / "All N skills" line 포함 안 됨 명시 점검. Skill count = Plan D + B 합산값 (14→16) 그대로 유지
29:8. Stage 3 와 Gate 5 의 분리 룰 명시 — Stage 3 = "이 cycle 결과가 spec 만족하는가" (cycle 단위), Gate 5 = "이 commit 의 diff 가 verifier PASS 받았는가" (commit 단위). 같은 cycle 끝 commit 에서 동시 발동 시 한 번 verifier 호출 + 두 단계 모두 결과 인용 (중복 호출 차단)
30:9. Verifier prompt 의 acceptance criteria inline copy 룰 명시 — `## Acceptance Criteria` 헤더 다음 `## Variables` 또는 다음 `## ` 헤더 직전까지 grep 추출. spec rev7 cycle 4 #5 답 (acceptance 발췌 주체 = Plan C 책임)
32:11. atomic commit 메시지: `feat(skill): kzk-large-task-delegation Stage 3 + Gate 5 — fresh-agent verifier (Plan C)`
53:- description 끝에 trigger 추가: `'Stage 3'`, `'fresh-agent verifier'`, `'verifier dispatch'`
57:'Stage 3', 'fresh-agent verifier', 'verifier dispatch', 'verifier model routing', 'PASS FAIL PARTIAL', 'Q-VERIFIER-FAIL'.
60:**§Two-stage review 변경 — 섹션 rename + Stage 3 추가**:
62:기존 `## Two-stage review (mandatory after each subagent finishes)` 섹션 (line 273 부근) 을 `## Three-stage review (mandatory after each subagent finishes)` 로 rename. 기존 1-4 항목 (trust-but-verify / build·test / spec acceptance / coverage) 모두 보존 — Stage 1 (trust-but-verify), Stage 2 (build/test/Playwright + spec acceptance + coverage 통합) 으로 묶고, **Stage 3 신규** 추가:
77:### Stage 3 — Fresh-agent verification (Plan C)
81:- multi-file fix (`git diff --name-only HEAD~1` 결과 3+ 파일)
84:**메인 self-approve 금지** — Stage 1/2 만으로 commit 진행 X. Stage 3 PASS 받기 전에는 commit 금지 (Gate 5 와 동시 enforcement).
89:// model 분기 — git diff --shortstat HEAD~1 결과 기준
92:// empty diff (HEAD~1 부재 등) → opus default safe
106:1. **변경 파일 목록** — `git diff --name-only HEAD~1` 결과 verbatim
107:2. **Acceptance criteria 발췌 (inline copy)** — 원본 user request 또는 spec/plan 의 `## Acceptance Criteria` 헤더 다음 `## Variables` (또는 다음 `## ` 헤더) 직전까지의 텍스트 grep 추출 후 prompt 에 verbatim inline. **전체 spec read 금지** (토큰/cache 부담 차단). spec/plan 파일 경로 reference 만 추가 — verifier 가 필요 시 spot read
114:   응답: PASS / FAIL / PARTIAL 강제. 이유 3-5 줄.
117:#### PASS / FAIL / PARTIAL 처리
121:| PASS | Stage 3 통과 → Gate 5 가 인용. commit 진행 OK |
122:| PARTIAL | 추가 fix cycle 1회 (메인이 verifier 지적사항 수렴 → 추가 subagent dispatch → 새 diff → Stage 3 재호출). PARTIAL 2 consecutive → FAIL 로 escalate |
123:| FAIL | 메인이 verifier 지적사항 수렴 → fix dispatch → 재호출. **2 consecutive FAIL** → halt + user-queue entry `Q-VERIFIER-FAIL — verifier 2회 연속 FAIL, 사용자 결정 필요 (verifier 지적 무시 / 추가 fix / plan revision)` |
125:PARTIAL 의 escalate 룰: 같은 diff 또는 동일 verifier 지적사항이 2회 연속 PARTIAL 이면 FAIL 로 카운트. 다른 지적사항으로 PARTIAL → counter reset.
127:#### Stage 3 와 Gate 5 분리 (중복 호출 차단)
129:- **Stage 3** = "이 cycle 결과가 spec 만족하는가" — cycle 단위, large-task delegation 끝에서 호출
130:- **Gate 5** = "이 commit 의 diff 가 verifier PASS 받았는가" — commit 단위, `kzk-pre-commit-gate` Gate 5 가 호출
133:1. 메인이 cycle 끝 commit 진행 → Stage 3 호출 → PASS 받음 → cache 결과 (`.kzk-harness/verifier-cache.json` 같은 sidecar — 본 plan 은 메모리 only, file persistence 는 Plan E fast-follow 후보)
134:2. Pre-commit Gate 5 진입 시 Stage 3 cache PASS 인용 → 추가 호출 X
135:3. Stage 3 cache 부재 시 Gate 5 가 verifier 새로 호출
137:**중복 차단의 단순 규칙**: 같은 commit 의 같은 diff (`git diff --cached` SHA) 에 대해 verifier 1회만 호출. 메인이 호출 시점 (Stage 3 vs Gate 5) 만 다를 뿐.
139:본 plan 의 cache 는 메모리 only — 대화 turn 내 메인이 Stage 3 결과를 보유하면 Gate 5 가 그대로 인용. 새 turn (사용자 응답 후) 면 Gate 5 가 verifier 재호출. Plan E fast-follow 에서 sidecar persistence 검토.
144:**§Subagent prompt requirements 의 fix-scope cache inject 룰 보존** (Plan B 가 line 230 부근에 추가한 룰): 변경 없음. Plan B rev1 룰 그대로 잔존.
150:- **kzk-pre-commit-gate**: Gate 5 가 본 skill 의 Stage 3 결과를 인용. 같은 diff 에 verifier 중복 호출 차단 (메모리 cache).
151:- **kzk-autonomous-boundary**: Stage 3 verifier 2 consecutive FAIL → `Q-VERIFIER-FAIL` user-queue entry. autonomous-boundary 의 halt 룰 표가 본 entry 를 포함.
154:### Task 2 — `kzk-pre-commit-gate/SKILL.md` v1.4.0 (Gate 5 신규)
160:- description 끝에 trigger 추가: `'Gate 5'`, `'verifier'`, `'fresh-agent verification'`
164:`Gate 5`, `verifier`, `fresh-agent verification`, `Stage 3 cite`, `Q-VERIFIER-FAIL`.
167:**§Gate 5 신규 section 추가** — 위치: Plan B 가 추가한 `## Gate 4.5 — Fix Scope Sanity Check (Plan B)` 다음, `## Doc-only commit exception` 직전:
170:## Gate 5 — Fresh-agent verifier (Plan C)
172:Commit 직전 final check. `kzk-large-task-delegation` §Three-stage review 의 Stage 3 결과 PASS 확인.
174:**적용 조건** (Gate 4.5 통과 후 evaluate, 셋 중 하나라도 false → Gate 5 N/A):
176:- `git diff --cached --name-only` 결과 3+ 파일
180:1. **Stage 3 cache 있는가** — 같은 diff 에 대해 메인이 Stage 3 verifier 를 이미 호출했고 PASS 받았는가? cache hit → 그 PASS 인용 + commit body 에 `Gate 5: Stage 3 cite (verifier <subagent_type> <model>) PASS — <verifier 인용 1줄>` 라인. PASS.
181:2. cache 부재 → Gate 5 가 verifier 새로 호출. dispatch 룰은 §Three-stage review §Verifier dispatch 와 동일 (model 분기 = `git diff --cached --shortstat` 결과). 응답:
183:   - PARTIAL → commit BLOCK + 메인이 추가 fix cycle. 같은 PARTIAL 2회 → FAIL escalate
184:   - FAIL → commit BLOCK + 메인이 fix cycle. **2 consecutive FAIL → halt + `Q-VERIFIER-FAIL` user-queue entry**. `kzk-autonomous-boundary` 의 halt 룰과 통합
185:3. Verifier 호출 자체가 unavailable (subagent dispatch 실패, 환경 문제) → Gate 5 BLOCK + 사용자 prompt: "verifier dispatch 실패. fallback codex CLI consult 또는 사용자 직접 review 결정 필요"
187:**Stage 3 vs Gate 5 의 분리** (중복 호출 차단):
188:- Stage 3 = cycle 단위 ("이 cycle 결과가 spec 만족하는가")
189:- Gate 5 = commit 단위 ("이 commit 의 diff 가 verifier PASS 받았는가")
191:같은 cycle 끝 commit 에서 두 단계 동시 발동 시 verifier 1회만 호출 + 두 단계 모두 결과 인용. cache 룰은 §Three-stage review §중복 차단의 단순 규칙 따름 (메모리 only, 대화 turn 내 cache).
193:**Doc-only commit 예외**: source code 변경 없는 doc-only commit 은 Gate 5 N/A (Gate 0–4 의 doc-only 예외와 동일 룰).
195:**Autonomous mode**: Gate 5 PASS 시 사용자 confirm 없이 commit 허용 (다른 gate 와 동일 정책). FAIL 또는 BLOCK 시 halt + user-queue.
200:- Gate 5 verifier 2 consecutive FAIL on the same diff → halt + `Q-VERIFIER-FAIL` user-queue entry. See `kzk-autonomous-boundary` for the halt condition table.
205:- **kzk-large-task-delegation**: Gate 5 의 verifier dispatch 룰은 본 skill 의 §Three-stage review §Stage 3 와 sibling. 같은 diff 의 verifier 호출 1회만 (cache hit citation 우선).
208:### Task 3 — `kzk-autonomous-boundary/SKILL.md` v1.3.0 (Q-TDD-MAIN + Q-VERIFIER-FAIL)
218:, `Q-TDD-MAIN`, `Q-VERIFIER-FAIL`, `verifier 2 FAIL`, `메인 직접 TDD halt`, `verifier consecutive FAIL halt`.
224:- **Q-TDD-MAIN** — 자율실행 mode 에서 메인 컨텍스트가 직접 TDD red 단계 진입 시도 (Plan A Layer b cross-ref). 룰 본문 = `kzk-test-coverage` §Anti-pattern — Test-from-implementation 의 §자율 mode 메인 직접 TDD 금지. halt + user-queue entry: `Q-TDD-MAIN — 자율 cycle 의 메인 직접 TDD 시도, fresh sonnet dispatch 재시작 필요`. cross-ref: `kzk-test-coverage`, `kzk-large-task-delegation` §Anti-self-verification boilerplate
225:- **Q-VERIFIER-FAIL** — `kzk-large-task-delegation` Stage 3 / `kzk-pre-commit-gate` Gate 5 의 verifier (`oh-my-claudecode:verifier` 또는 `oh-my-claudecode:code-reviewer`) 가 같은 diff 에 대해 2 consecutive FAIL (PARTIAL 2회 도 같은 지적사항이면 FAIL 로 escalate). halt + user-queue entry: `Q-VERIFIER-FAIL — verifier 2회 연속 FAIL, 사용자 결정 필요 (verifier 지적 무시 / 추가 fix / plan revision)`. cross-ref: `kzk-large-task-delegation` §Three-stage review §Stage 3, `kzk-pre-commit-gate` §Gate 5
230:- **kzk-test-coverage**: Plan A Layer (b) 자율 mode 메인 직접 TDD 금지 룰의 halt entry (`Q-TDD-MAIN`) 가 본 skill 의 §Halt conditions 표에 등록됨.
231:- **kzk-large-task-delegation / kzk-pre-commit-gate**: Plan C Stage 3 / Gate 5 verifier 2 consecutive FAIL 의 halt entry (`Q-VERIFIER-FAIL`) 가 본 skill 의 §Halt conditions 표에 등록됨.
241:### Gate 5 — Fresh-agent verifier (Plan C)
245:- model 분기: `git diff --cached --shortstat` → 3 파일 미만 + 100 LoC 미만 → sonnet, 그 외 → opus
247:- PASS / FAIL / PARTIAL 강제. 2 consecutive FAIL → halt + `Q-VERIFIER-FAIL` user-queue entry (`kzk-autonomous-boundary` §Halt conditions)
248:- Stage 3 cache 있으면 인용 (중복 호출 차단)
250:룰 본문: `kzk-pre-commit-gate` §Gate 5, `kzk-large-task-delegation` §Three-stage review §Stage 3.
258:4. **Stage 3 — Fresh-agent verification (Plan C)** — 자율실행 cycle 끝 또는 large-task delegation 끝의 multi-file fix (3+ 파일) commit 직전 fresh `oh-my-claudecode:verifier` dispatch. 메인 self-approve 금지. PASS / FAIL / PARTIAL. 2 consecutive FAIL → halt + `Q-VERIFIER-FAIL` user-queue. 룰 본문: `kzk-large-task-delegation` §Three-stage review §Stage 3.
275:# git diff --shortstat mock 입력 → 분기 결과 (sonnet vs opus) echo 확인
280:#   empty diff (HEAD~1 부재 등) → opus default safe
288:FAIL=0
293:# input: git diff --shortstat 형식 line (예: " 2 files changed, 50 insertions(+)")
297:  local shortstat="$1"
298:  # 빈 입력 = empty diff = opus default safe
299:  if [ -z "$shortstat" ]; then
305:  files=$(printf '%s' "$shortstat" | grep -oE '[0-9]+ files? changed' | grep -oE '^[0-9]+' || printf '0')
308:  ins=$(printf '%s' "$shortstat" | grep -oE '[0-9]+ insertions?\(\+\)' | grep -oE '^[0-9]+' || printf '0')
310:  del=$(printf '%s' "$shortstat" | grep -oE '[0-9]+ deletions?\(-\)' | grep -oE '^[0-9]+' || printf '0')
321:  local desc="$1" shortstat="$2" expected="$3"
323:  actual=$(route_verifier "$shortstat")
328:    printf '  FAIL: %s (expected "%s", got "%s")\n' "$desc" "$expected" "$actual"
329:    FAIL=$((FAIL + 1))
357:# Case 6: empty diff → opus default safe
358:assert_route "empty diff → opus default safe" \
373:printf '\n%d PASS, %d FAIL\n' "$PASS" "$FAIL"
374:if [ "$FAIL" -gt 0 ]; then
399:  FAIL=$((FAIL + 1))
413:- Gate 4.5 (Plan B): N/A (fix-scope-cache 부재 — 본 plan 은 fix-intent 아닌 skill 추가)
414:- Gate 5 (본 plan 추가): self-reference 회피. 본 plan commit 자체는 Plan C 적용 전 commit 이라 Gate 5 N/A. 다음 cycle 부터 적용 — 명시 의무 (commit body 에 "Gate 5 N/A — Plan C self-bootstrap commit, applies from next commit")
418:feat(skill): kzk-large-task-delegation Stage 3 + Gate 5 — fresh-agent verifier (Plan C)
420:Stage 3: cycle 끝 / large-task delegation 끝 multi-file fix (3+ 파일) 직후 fresh
421:verifier dispatch. model 분기: git diff --shortstat 3 파일 미만 + 100 LoC 미만 → sonnet,
422:그 외 → opus. PASS / FAIL / PARTIAL 강제. 2 consecutive FAIL → halt + Q-VERIFIER-FAIL.
424:Gate 5: commit 직전 final check. Stage 3 cache 인용 (중복 호출 차단) 또는 verifier 새 호출.
427:- Q-TDD-MAIN (Plan A Layer b cross-ref — 메인 직접 TDD 시도)
428:- Q-VERIFIER-FAIL (Plan C — verifier 2 consecutive FAIL)
430:harness-share.md §3 Gate 5 + §4 Stage 3 cross-ref. Plan A §11.1 / Plan B §3.5 / Plan D §29 보존.
436:Gate 5 N/A — Plan C self-bootstrap commit, applies from next commit.
442:- 실제 verifier subagent 응답 품질 (PASS / FAIL / PARTIAL 의 정확성, 지적사항 유효성) 은 manual cycle 검증 의존.
443:- Stage 3 cache 메커니즘 (메모리 only) 은 대화 turn 내 메인의 책임 — automated test 없음. Plan E fast-follow 에서 sidecar persistence + automated test 검토.
444:- Q-VERIFIER-FAIL halt 룰은 룰 *기록* 만 검증 (skill-text-checks.sh 가 Plan A 패턴으로 grep 가능 — 본 plan rev2 후보. rev1 은 verifier-routing 만).
450:| 단일 plan revert | `git revert <Plan-C-commit-sha>` — Stage 3 + Gate 5 + halt 룰 + test 모두 한 commit 복원 |
451:| Stage 3 만 비활성 | `kzk-large-task-delegation` SKILL.md 의 §Three-stage review 를 §Two-stage review 로 수동 rename + Stage 3 섹션 제거 (Gate 5 도 Stage 3 cache 부재 시 verifier 새 호출 — Stage 3 비활성 시 Gate 5 가 매 commit verifier 호출). 운영 부담 inflation 인지 |
452:| Gate 5 만 비활성 | `kzk-pre-commit-gate` SKILL.md 의 §Gate 5 section 수동 제거. Stage 3 는 cycle 끝 cache 만 남고 commit 시점 enforcement 없어짐 |
453:| halt 룰만 revert | `kzk-autonomous-boundary` SKILL.md 의 Q-TDD-MAIN / Q-VERIFIER-FAIL bullet 수동 제거. Stage 3 / Gate 5 는 잔존하지만 2 FAIL 시 halt 안 함 (loop forever 위험) |
455:| Verifier subagent unavailable 일시 우회 | Stage 3 / Gate 5 의 fallback path = `oh-my-claudecode:code-reviewer` 또는 codex CLI consult. 본 plan 은 verifier 우선, code-reviewer fallback 명시. 둘 다 unavailable 시 사용자 prompt → 직접 review |
456:| Plan C 전체 비활성 (실험) | 위 Stage 3 + Gate 5 + halt 룰 셋 다 수동 제거. 또는 `DISABLE_OMC=kzk-large-task-delegation,kzk-pre-commit-gate,kzk-autonomous-boundary` (단 다른 plan 의 Gate 0–4.5 / halt 룰도 함께 비활성 — 영향 큼) |
460:- **Stage 3 cache sidecar persistence** — 대화 turn 간 cache 보존 (`.kzk-harness/verifier-cache.json` 같은 sidecar). 본 plan rev1 은 메모리 only. Plan E fast-follow 후보 (Plan E 는 production code-first — verifier cache 는 "production" 영역 아니므로 별도 follow-up issue 등록 의무).
461:- **Verifier prompt 의 acceptance criteria 자동 추출 자동화** — 본 plan 은 `## Acceptance Criteria` 헤더 grep 룰 *기록* 만. 메인이 수동 grep + verbatim copy. 자동 추출 helper script (`install/scripts/extract-acceptance.sh`) 는 Plan E fast-follow.
462:- **Behavioral verifier test** — verifier subagent 응답 시뮬레이션 (mock fixture 기반 PASS/FAIL/PARTIAL classification 검증). 본 spec rev7 §Non-goals 의 "behavioral test (sonnet dispatch 시뮬레이션)" 와 같은 한계 — manual cycle 검증 의존.
463:- **PARTIAL escalate 의 정밀 지적사항 매칭** — 본 plan 은 "같은 PARTIAL 2회" 룰만. 정밀 지적사항 hash 기반 matching (verifier 가 같은 line/file/concern 을 가리키는지 판별) 은 LLM 기반 회고 영역 — spec rev7 §Non-goals.
464:- **Plan E (production code-first + 멱등성)** — 마지막 plan. 본 plan 의 Stage 3 / Gate 5 는 Plan E 의 production code-first script 변경에도 적용 (3+ 파일 multi-file change 면 verifier dispatch).
479:1. Stage 3 와 Gate 5 의 분리 룰이 중복 호출을 충분히 차단하는가? (메모리 cache only — turn 간 보존 부재 갭)
481:3. Q-TDD-MAIN / Q-VERIFIER-FAIL halt 룰이 `kzk-autonomous-boundary` 의 기존 halt list 와 contradiction 없는가?
482:4. PARTIAL escalate 룰 ("같은 PARTIAL 2회 → FAIL") 의 "같은" 판별 기준 모호 — 메인의 주관적 판단 의존 갭?
483:5. Plan A 가 follow-up 으로 위임한 Q-TDD-MAIN cross-ref 가 본 plan 에서 충분히 흡수됐는가?
484:6. acceptance criteria inline copy 룰의 grep 패턴 (`## Acceptance Criteria` 헤더 다음 `## ` 직전) 이 spec rev7 cycle 4 #5 답과 일치?
492:- Plan A / D / B frozen 룰 모두 보존 — 본 plan 변경은 Stage 3 / Gate 5 / halt 룰 추가만.
493:- Plan A 가 follow-up 위임한 `Q-TDD-MAIN` cross-ref 처리 명시 (Task 3).
494:- Plan E 가 마지막 plan — 본 plan 의 Stage 3 / Gate 5 는 Plan E 변경에도 적용.

exec
/bin/zsh -lc 'rg -n "Axis C|3 파일 미만|100 LoC|PASS / FAIL / PARTIAL|2 consecutive FAIL|Gate 5|Stage 3|Skill count|Rollback|Q-TDD-MAIN|Q-VERIFIER-FAIL" docs/plans/regression-memory-and-fix-quality-spec.md' in /Users/kimzerokim/work/personal/kzk-harness
exec
/bin/zsh -lc 'rg -n "Q-TDD-MAIN|follow-up|autonomous-boundary|split-brain|Plan C" docs/plans/plan-A-tdd-self-verification-block.md' in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
36:| Axis C verifier 분기 = `git diff --shortstat`: 3 파일 미만 + 100 LoC 미만 → sonnet, 그 외 → opus | cycle 1 §4 |
158:### Axis C — Fresh-agent verification
160:`kzk-large-task-delegation` Stage 3 + Pre-commit Gate 5. 디테일은 Plan C 에 위임.
163:- `git diff --shortstat` 분기: 3 파일 미만 + 100 LoC 미만 → sonnet, 그 외 → opus
164:- PASS / FAIL / PARTIAL 강제. 2 consecutive FAIL → halt + user-queue
192:| **C** | `docs/plans/plan-C-fresh-agent-verification.md` | `kzk-large-task-delegation` Stage 3 + Gate 5 | ~120 | A/B/D 후 |
199:## Skill count 동기화 (14→16)
224:## Rollback
250:| 4 (Axis C 분기) | Locked + Axis C 요약 |
255:| 9 (Skill count sync) | §Skill count 동기화 |
257:| 11 (Rollback) | §Rollback 6-level |
281:| #7 MINOR (verifier 인용 범위) | Axis C — acceptance criteria 발췌 inline copy 만 |

 succeeded in 0ms:
71:자율실행 mode (`kzk-autonomous-boundary` 진입, `kzk-web-loop`, `kzk-autonomous-loop`, harness 자가개선 cycle) 에서:
74:- 메인이 직접 진입 시도 시 halt + user-queue entry: `Q-TDD-MAIN — 자율 cycle 의 메인 직접 TDD 시도, fresh dispatch 재시작 필요`
95:- **kzk-autonomous-boundary**: 자율 mode 판별 키워드 / 환경변수 룰을 본 skill §Anti-pattern Layer b 에서 정의. autonomous-boundary 의 halt 룰과 통합 (`Q-TDD-MAIN` 큐 entry). **본 Plan A 는 contract only — kzk-autonomous-boundary skill 본문 수정은 Plan A 범위 밖. autonomous-boundary skill 의 halt 룰 표 / Q-TDD-MAIN cross-ref update 는 별도 follow-up 작업 (Plan C 통합 또는 fast-follow). split-brain 위험 인지 — Plan A frozen 시 follow-up issue 등록 의무.**
141:- **Layer (b)** — 자율 mode (`KZK_AUTONOMOUS=1` 또는 동사구 키워드 매칭) 에서 메인 직접 TDD 진입 금지 — 반드시 fresh sonnet dispatch. 메인 직접 진입 시 halt + `Q-TDD-MAIN` user-queue entry. 룰 본문: `kzk-test-coverage` §Anti-pattern — Test-from-implementation.
205:assert_grep "kzk-test-coverage Q-TDD-MAIN queue entry" "Q-TDD-MAIN" "$TC"
281:Follow-up: kzk-autonomous-boundary skill 의 Q-TDD-MAIN cross-ref update (Plan C 또는 fast-follow).
302:- Plan C — fresh-agent verifier Stage 3 + Pre-commit Gate 5

exec
/bin/zsh -lc 'rg -n "skill count|14→15|15→16|CLAUDE|README|Interaction with other kzk|fix-scope-cache|Gate 4.5|200 char" docs/plans/plan-B-fix-scope-expansion.md docs/plans/plan-D-regression-memory.md' in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
docs/plans/plan-B-fix-scope-expansion.md:1:# Plan B — Fix Scope Expansion (fix-start hook + Gate 4.5) — rev1
docs/plans/plan-B-fix-scope-expansion.md:10:신규 skill `kzk-fix-scope-expansion` + fix-start hook 인프라 구축. AI 자율실행 cycle 의 5 메타갭 중 **Fix scope 누수** 차단. 사용자 prompt 가 fix intent 일 때 (또는 직전 Bash 가 non-zero exit / 에러 페이스트 detect 시) 함수/심볼 callsite 를 `code-review-graph` 로 전수 조회 → Plan D 의 recall 결과 다음 슬롯에 system-reminder 로 inject. Pre-commit Gate 4.5 가 callsite grep 결과 vs `git diff --name-only` 매칭 sanity check 로 누락 callsite 차단.
docs/plans/plan-B-fix-scope-expansion.md:14:- **Gate 4.5** (Pre-commit Gate, 기존 Gate 4 ↔ commit 사이) — fix-start hook 이 캐시한 callsite list (`.kzk-harness/fix-scope-cache.json`) vs `git diff --cached --name-only` 매칭. 미스매치 → "callsite N 곳 중 M 곳만 변경됨. 누락 의도 명시 (commit body) 또는 다른 callsite 도 수정"
docs/plans/plan-B-fix-scope-expansion.md:20:1. `skills/kzk-fix-scope-expansion/SKILL.md` 신규 — frontmatter (name=`kzk-fix-scope-expansion`, version=`1.0.0`, description with triggers), §Triggers, §Why, §Fix-start hook (trigger 룰 + CRG 우선 + grep fallback + cache 위치 + recall consumer 룰), §Fix-verify hook (manual self-check inject), §Gate 4.5 (sanity check 룰), §자가-skip guard (D 와 동일 동사구만), §Default DISABLED 정책, §Rollback (5 level), §Interaction with other kzk-* (특히 D consumer + Gate 4.5 of pre-commit-gate)
docs/plans/plan-B-fix-scope-expansion.md:21:2. `install/hooks/fix-scope-trigger.mjs` 신규 — UserPromptSubmit hook. 자가-skip → fix intent detect (FIX_KEYWORDS reuse from Plan D 구현, **import** from `regression-recall.mjs` to avoid drift) → 심볼 추출 (prompt 의 backtick / camelCase / snake_case / func() 패턴) → CRG `query_graph` 또는 CLI `code-review-graph query/blast-radius` 우선 → grep fallback → result truncation (200 char cap, **D recall reminder size cap 룰과 sibling**) → `.kzk-harness/fix-scope-cache.json` atomic write (via `install/lib/sidecar-write.mjs` 의 `writeAtomic` 재사용) → system-reminder inject. CRG 미설치 시 stderr WARN + `_warn:"crg-not-installed-grep-fallback"`. **default DISABLED at commit** (settings.json 등록은 `--fix-scope-trigger` flag 호출 시만)
docs/plans/plan-B-fix-scope-expansion.md:22:3. `install/test/fix-scope-trigger.test.mjs` 신규 — mock prompt → expected callsite grep call 검증. 최소 12 case (자가-skip env / verbphrase / fix intent detect / 심볼 추출 / CRG path mock / grep fallback / truncation cap / cache 파일 atomic write / D recall consumer 순서 simulating / Gate 4.5 sanity check pass-fail / non-fix prompt → silent pass / cache 파일 schema validation)
docs/plans/plan-B-fix-scope-expansion.md:27:8. `skills/kzk-pre-commit-gate/SKILL.md` 갱신 — `## Gate 4.5 — Fix Scope Sanity Check (Plan B)` 신규 section, 기존 Gate 4 다음, `## Doc-only commit exception` 직전 위치. 룰: cache 파일 (`.kzk-harness/fix-scope-cache.json`) 존재하면 callsite list vs `git diff --cached --name-only` 매칭. 미스매치 → BLOCK (commit body 에 의도 명시 의무). cache 부재 시 N/A (fix-scope-trigger hook 비활성 또는 fix intent 아닌 commit). frontmatter version `1.2.0` → `1.3.0`. description 에 `Gate 4.5` trigger 추가. Triggers list 에 `Gate 4.5`, `fix-scope-cache`, `callsite mismatch` 추가
docs/plans/plan-B-fix-scope-expansion.md:28:9. `skills/kzk-codebase-survey/SKILL.md` 갱신 — Triggers list 에 fix-time trigger phrase 추가: `fix 시작`, `버그 수정`, `에러 fix`, `regression fix`, `callsite 전수`, `함수 수정 영향`. frontmatter version `1.5.0` → `1.6.0`. description 에 `fix-time callsite expansion` 추가. §Interaction with other kzk-* 끝에 `kzk-fix-scope-expansion (Plan B)` cross-ref 추가
docs/plans/plan-B-fix-scope-expansion.md:29:10. `skills/kzk-regression-memory/SKILL.md` 갱신 — §Interaction with other kzk-* 의 `kzk-fix-scope-expansion (Plan B)` 항목 보강 (현재 1줄 → 3줄): "D recall hook 다음 슬롯에서 발동", "callsite cache (.kzk-harness/fix-scope-cache.json) 가 D recall reminder 와 함께 inject 되는 사용자 prompt context", "Gate 4.5 의 cache 입력자". 본문 변경 없음 (skill version bump X — Interaction-only patch)
docs/plans/plan-B-fix-scope-expansion.md:30:11. `skills/kzk-large-task-delegation/SKILL.md` 갱신 — 기존 §Subagent prompt requirements 의 Recall 결과 inject 룰 옆에 **fix-scope cache inject 룰** 추가: subagent dispatch 시점에 `.kzk-harness/fix-scope-cache.json` 존재하면 cache 의 callsite list 도 dispatch prompt 에 verbatim inject (size cap 200 char — D recall 과 동일 룰, callsite 우선순위 = file 변경 빈도 high → low). §Interaction with other kzk-* 끝에 `kzk-fix-scope-expansion (Plan B)` 항목 추가
docs/plans/plan-B-fix-scope-expansion.md:31:12. `harness-share.md` §3.5 신규 (또는 §29 다음 §30 신규 — 기존 §29 = Plan D Regression Memory) — 본 plan 은 §3.5 (Pre-commit Gate 와 sibling) 채택. Title: `## 3.5 Fix Scope Expansion (kzk-fix-scope-expansion, Plan B)`. 본문: Fix-start hook 룰 + CRG 우선 + grep fallback + Gate 4.5 sanity check + Default DISABLED + cross-ref to §29 (Plan D consumer 관계)
docs/plans/plan-B-fix-scope-expansion.md:32:13. `CLAUDE.md` line 3 + "All N skills" line + `README.md` line 3 + install command skill count — **15 → 16** (Plan B 신규 skill 1개. Plan D 가 14→15, Plan B 가 15→16). 4 sync points 모두 변경
docs/plans/plan-B-fix-scope-expansion.md:33:14. `bash install/test/run-tests.sh` PASS (`test_fix_scope_trigger` 포함 전체 통과. CLAUDE.md / README.md skill count assertion 도 16 으로 업데이트 — 기존 `assert "marker block has 14 kzk- rows"` 형태가 있으면 Plan D 가 15 로, Plan B 가 16 으로 업데이트)
docs/plans/plan-B-fix-scope-expansion.md:34:15. atomic commit 메시지: `feat(skill): kzk-fix-scope-expansion + Gate 4.5 — fix scope expansion (Plan B)`
docs/plans/plan-B-fix-scope-expansion.md:52:- `CLAUDE_MD = /Users/kimzerokim/work/personal/kzk-harness/CLAUDE.md`
docs/plans/plan-B-fix-scope-expansion.md:53:- `README = /Users/kimzerokim/work/personal/kzk-harness/README.md`
docs/plans/plan-B-fix-scope-expansion.md:104:description: "Fix scope 누수 차단 — fix-start 시점 callsite 전수 조회 (code-review-graph 우선, grep fallback) + Pre-commit Gate 4.5 sanity check. Plan D recall consumer. Top triggers: 'fix 시작', '버그 수정', '에러 fix', 'callsite 전수', 'Gate 4.5', 'fix-scope-cache'. Body §Triggers for full list."
docs/plans/plan-B-fix-scope-expansion.md:119:`Gate 4.5`, `fix-scope-cache`, `code-review-graph callsite`,
docs/plans/plan-B-fix-scope-expansion.md:126:Pre-commit Gate 4.5 는 cache 와 git diff 매칭 sanity check 로 commit 시점 누락 차단.
docs/plans/plan-B-fix-scope-expansion.md:154:**Result truncation**: 결과 list 200 char cap (D recall reminder size cap 과 sibling). 우선순위 = file 변경 빈도 high (`git log --pretty=format: --name-only -50 | sort | uniq -c | sort -rn`) → low.
docs/plans/plan-B-fix-scope-expansion.md:156:**Cache 위치**: `.kzk-harness/fix-scope-cache.json`. atomic write via `install/lib/sidecar-write.mjs::writeAtomic`. schema:
docs/plans/plan-B-fix-scope-expansion.md:170:cache 는 hook commit 시점에 새 fix-start 마다 overwrite (1 file = current fix scope only — multi-fix 같은 commit 은 last fix wins, 사용자가 의도 시 Gate 4.5 가 commit body 의도 명시 요구).
docs/plans/plan-B-fix-scope-expansion.md:177:[truncated: <M> more callsites — see .kzk-harness/fix-scope-cache.json]
docs/plans/plan-B-fix-scope-expansion.md:189:- test 가 fix-scope-cache.json 의 callsite N 곳 모두 커버하는가?
docs/plans/plan-B-fix-scope-expansion.md:190:- 누락 callsite 가 있다면 commit body 에 의도 명시했는가? (Gate 4.5 sanity check)
docs/plans/plan-B-fix-scope-expansion.md:195:## Gate 4.5 — Fix Scope Sanity Check (kzk-pre-commit-gate 위임)
docs/plans/plan-B-fix-scope-expansion.md:200:1. `.kzk-harness/fix-scope-cache.json` 존재 검사. 부재 → N/A (fix-scope-trigger 비활성 또는 fix intent 아닌 commit). PASS.
docs/plans/plan-B-fix-scope-expansion.md:204:   ❌ Gate 4.5 FAIL: callsite N 곳 중 M 곳만 변경됨 (누락: <file1>, <file2>).
docs/plans/plan-B-fix-scope-expansion.md:210:**구현**: kzk-pre-commit-gate skill SKILL.md 의 `## Gate 4.5` 섹션이 본 룰 명시. 본 skill 은 cache 입력자 + 룰 정의자.
docs/plans/plan-B-fix-scope-expansion.md:238:| Gate 4.5 만 비활성 (cache 입력 유지) | `kzk-pre-commit-gate` 본문 의 Gate 4.5 섹션 manual skip — commit body 에 `fix-scope-skip: gate-4.5-disabled` 명시. 또는 Pre-commit Gate skill version downgrade |
docs/plans/plan-B-fix-scope-expansion.md:239:| Cache 손실 / 오염 | `rm -f .kzk-harness/fix-scope-cache.json` — 다음 fix-start hook 이 새로 작성 |
docs/plans/plan-B-fix-scope-expansion.md:241:## Interaction with other kzk-*
docs/plans/plan-B-fix-scope-expansion.md:243:- **kzk-regression-memory** (Plan D): D recall hook 다음 슬롯에서 발동 (consumer). 같은 prompt 에 두 system-reminder slot — D 가 과거 fix 기억, B 가 현재 fix 의 callsite 영향. fix-scope-cache 가 D recall reminder 와 함께 inject 되는 사용자 prompt context. **순서 의존**: settings.json `UserPromptSubmit` 배열에서 regression-recall.mjs 가 fix-scope-trigger.mjs 보다 앞 — install-global.sh 의 `enable_hooks()` 호출 순서가 sibling append 라 자동 보장 (D 가 먼저 enable, B 가 나중).
docs/plans/plan-B-fix-scope-expansion.md:244:- **kzk-pre-commit-gate**: Gate 4.5 의 룰 정의자 (본 skill) + 적용자 (pre-commit-gate skill). cache 가 입력. 둘 사이 contract = `.kzk-harness/fix-scope-cache.json` schema (본 skill §Cache 위치 행 참조).
docs/plans/plan-B-fix-scope-expansion.md:246:- **kzk-large-task-delegation**: subagent dispatch prompt 에 cache 의 callsite list 도 verbatim inject (size cap 200 char, D recall 과 sibling 룰).
docs/plans/plan-B-fix-scope-expansion.md:420:  const truncatedFooter = truncated > 0 ? `[truncated: ${truncated} more callsites — see .kzk-harness/fix-scope-cache.json]` : "";
docs/plans/plan-B-fix-scope-expansion.md:446:    const cachePath = path.join(repoRoot, ".kzk-harness", "fix-scope-cache.json");
docs/plans/plan-B-fix-scope-expansion.md:501:      session_id: process.env.CLAUDE_SESSION_ID || `${Date.now()}`,
docs/plans/plan-B-fix-scope-expansion.md:534:- single-entry JSONL via writeAtomic 은 cache file 이 진짜 JSON object 한 줄 — Gate 4.5 가 jq 로 read 가능 (`jq '.callsites' .kzk-harness/fix-scope-cache.json`)
docs/plans/plan-B-fix-scope-expansion.md:551://        D recall consumer slot order / Gate 4.5 sanity check pass-fail / non-fix prompt.
docs/plans/plan-B-fix-scope-expansion.md:632:    const cachePath = path.join(dir, ".kzk-harness", "fix-scope-cache.json");
docs/plans/plan-B-fix-scope-expansion.md:652:    const cachePath = path.join(dir, ".kzk-harness", "fix-scope-cache.json");
docs/plans/plan-B-fix-scope-expansion.md:677:// T11: Gate 4.5 sanity check — cache callsites vs git diff list (mock)
docs/plans/plan-B-fix-scope-expansion.md:693:assert("Gate 4.5 PASS when all callsites in diff", g1.pass);
docs/plans/plan-B-fix-scope-expansion.md:695:assert("Gate 4.5 FAIL when callsite missing without skip", !g2.pass && g2.missing.includes("b.ts"));
docs/plans/plan-B-fix-scope-expansion.md:697:assert("Gate 4.5 PASS when missing covered by fix-scope-skip", g3.pass);
docs/plans/plan-B-fix-scope-expansion.md:715:- Gate 4.5 sanity check 는 *룰 시뮬* (T11) — 실 pre-commit-gate hook 통합은 manual cycle 검증.
docs/plans/plan-B-fix-scope-expansion.md:775:**기존 skill count assertion 갱신** — 기존 `test_skill_files_landed` 내 `for skill in <list>` 루프 또는 marker block row count assertion 이 14/15 가 박혀있으면 16 으로 update. 또한 `test_claude_md_marker` 에서 row count 검증 시 16 row 확인 (Plan D 가 15 로 update 했을 것 → Plan B 가 16 으로).
docs/plans/plan-B-fix-scope-expansion.md:877:**`install/dependencies.md` sync**: 기존 entry 의 "Used by" 행에 `kzk-fix-scope-expansion (Plan B fix-start hook + Gate 4.5 callsite expansion)` 추가.
docs/plans/plan-B-fix-scope-expansion.md:879:### Task 8 — `kzk-pre-commit-gate/SKILL.md` Gate 4.5 추가 (~50 LoC)
docs/plans/plan-B-fix-scope-expansion.md:883:**Frontmatter 갱신**: `version: 1.2.0` → `version: 1.3.0`. description 끝에 추가: `, 'Gate 4.5', 'fix-scope-cache', 'callsite mismatch'`.
docs/plans/plan-B-fix-scope-expansion.md:887:`Gate 4.5`, `fix-scope-cache`, `callsite mismatch`, `fix-scope-skip`.
docs/plans/plan-B-fix-scope-expansion.md:893:## Gate 4.5 — Fix Scope Sanity Check (Plan B)
docs/plans/plan-B-fix-scope-expansion.md:895:`.kzk-harness/fix-scope-cache.json` (kzk-fix-scope-expansion fix-start hook 이 작성) 가 존재하면 callsite list 와 `git diff --cached --name-only` 매칭 검사. cache 부재 → N/A (fix-scope-trigger 비활성 또는 fix intent 아닌 commit).
docs/plans/plan-B-fix-scope-expansion.md:898:1. `cache_files = jq -r '.callsites[].file' .kzk-harness/fix-scope-cache.json | sort -u`
docs/plans/plan-B-fix-scope-expansion.md:906:     ❌ Gate 4.5 FAIL: callsite N 곳 중 M 곳만 변경됨.
docs/plans/plan-B-fix-scope-expansion.md:922:- Gate 4.5 BLOCK 시 자율 mode → user-queue entry `Q-GATE-4.5-FAIL`. interactive mode → 사용자에게 surface, halt X.
docs/plans/plan-B-fix-scope-expansion.md:925:**§Interaction with other kzk-* 갱신** — 끝에 추가:
docs/plans/plan-B-fix-scope-expansion.md:928:- **kzk-fix-scope-expansion** (Plan B): Gate 4.5 의 룰 정의자. cache 파일 (`.kzk-harness/fix-scope-cache.json`) 의 schema 와 sanity check 룰 정의. 본 skill 은 cache 입력자 + Gate 4.5 의 적용자.
docs/plans/plan-B-fix-scope-expansion.md:948:**§Interaction with other kzk-* 갱신** — 끝에 추가:
docs/plans/plan-B-fix-scope-expansion.md:960:**§Interaction with other kzk-* 갱신** — 기존 `kzk-fix-scope-expansion (Plan B): D recall 결과를 consumer 로 read — fix-start hook 이 D 다음에 발동.` 항목 (line 163) 을:
docs/plans/plan-B-fix-scope-expansion.md:963:- **kzk-fix-scope-expansion** (Plan B): D recall 결과를 consumer 로 read — fix-start hook 이 D 다음 슬롯에 발동 (settings.json `UserPromptSubmit` 배열에서 regression-recall.mjs → fix-scope-trigger.mjs 순). 같은 prompt 의 두 system-reminder 슬롯 — D 가 과거 fix 기억, B 가 현재 fix 의 callsite 영향 list. fix-scope-cache (`.kzk-harness/fix-scope-cache.json`) 가 D recall reminder 와 함께 inject 되는 사용자 prompt context. Pre-commit Gate 4.5 의 cache 입력자.
docs/plans/plan-B-fix-scope-expansion.md:973:- **fix-scope cache inject** (Plan B): subagent dispatch 시점에 `.kzk-harness/fix-scope-cache.json` 존재하면 cache 의 callsites list 도 dispatch prompt 에 verbatim inject. **size cap 200 char** — D recall reminder 와 sibling 룰. callsite 우선순위 = file 변경 빈도 high → low (cache 의 ranking 그대로). 200 char 초과 시 truncate + warning footer (`[truncated: <N> more callsites — see .kzk-harness/fix-scope-cache.json]`). subagent 가 fix 작업 시 callsite list read.
docs/plans/plan-B-fix-scope-expansion.md:976:**§Interaction with other kzk-* 갱신** — 끝에 추가:
docs/plans/plan-B-fix-scope-expansion.md:979:- **kzk-fix-scope-expansion** (Plan B): cache 파일 의 callsites list 를 subagent dispatch prompt 에 inject (size cap 200 char, D recall reminder 와 sibling). fix subagent 도 callsite list read.
docs/plans/plan-B-fix-scope-expansion.md:995:자율실행 cycle 의 5 메타갭 중 *Fix scope 누수* 차단. fix-start 시점 prompt 매칭 → callsite 전수 조회 → system-reminder inject + cache. Pre-commit Gate 4.5 가 cache vs git diff 매칭 sanity check.
docs/plans/plan-B-fix-scope-expansion.md:1005:- Result truncation: 200 char cap (D recall reminder size cap 과 sibling). 우선순위 = file 변경 빈도 high (`git log --name-only` count) → low
docs/plans/plan-B-fix-scope-expansion.md:1006:- Cache: `.kzk-harness/fix-scope-cache.json`. atomic write via `install/lib/sidecar-write.mjs::writeAtomic` (D utility 재사용 — drift 차단). schema = `{session_id, user_prompt_first200, symbols, callsites[], captured_at, crg_status}`. 1 entry/fix (overwrite, last fix wins)
docs/plans/plan-B-fix-scope-expansion.md:1012:- 동작: `🔍 [FIX VERIFY] 자가 점검: test 가 callsite N 곳 모두 커버하는가? 누락 시 commit body 에 의도 명시했는가? (Gate 4.5)`
docs/plans/plan-B-fix-scope-expansion.md:1015:### Pre-commit Gate 4.5 — Fix Scope Sanity Check
docs/plans/plan-B-fix-scope-expansion.md:1023:- 적용자: `kzk-pre-commit-gate` skill §Gate 4.5
docs/plans/plan-B-fix-scope-expansion.md:1044:| Gate 4.5 만 비활성 | commit body 에 `fix-scope-skip: gate-4.5-disabled` 명시 (per-commit escape) |
docs/plans/plan-B-fix-scope-expansion.md:1045:| Cache 손실 / 오염 | `rm -f .kzk-harness/fix-scope-cache.json` — 다음 fix-start 가 새로 작성 |
docs/plans/plan-B-fix-scope-expansion.md:1049:- §3 Pre-commit Gate — Gate 4.5 적용 위치
docs/plans/plan-B-fix-scope-expansion.md:1054:### Task 13 — `CLAUDE.md` + `README.md` skill count sync (~8 LoC, 4 sync points)
docs/plans/plan-B-fix-scope-expansion.md:1056:**Files**: `$CLAUDE_MD`, `$README`
docs/plans/plan-B-fix-scope-expansion.md:1058:Plan D 가 14→15 로 update 했을 것 (D commit 직후 상태). Plan B 가 15→16 으로 update.
docs/plans/plan-B-fix-scope-expansion.md:1060:**`$CLAUDE_MD` 변경**:
docs/plans/plan-B-fix-scope-expansion.md:1065:   | `kzk-fix-scope-expansion` | fix 시작, 버그 수정, 에러 fix, callsite 전수, Gate 4.5, fix-scope-cache, callsite mismatch |
docs/plans/plan-B-fix-scope-expansion.md:1068:**`$README` 변경**:
docs/plans/plan-B-fix-scope-expansion.md:1070:2. **Install command skill count** (`README.md` 의 install command 본문 또는 verify 단계 — Plan D 가 15 로 update 했으면 16 으로): grep `15 kzk-\|All 15` → 16 으로
docs/plans/plan-B-fix-scope-expansion.md:1072:**executor 의무**: 갱신 전 `grep -n "14 kzk-\|15 kzk-\|All 14\|All 15\|16 kzk-\|All 16" CLAUDE.md README.md install/test/run-tests.sh` 로 모든 skill count 위치 식별. 누락 시 run-tests.sh PASS 안 함.
docs/plans/plan-B-fix-scope-expansion.md:1076:`kzk-pre-commit-gate` 통과 (Gate 0 / 1 / 1.5 / 2 N/A / 3 / 4 N/A. Gate 4.5 — 본 plan 이 도입 — 본 commit 자체는 cache 부재라 N/A):
docs/plans/plan-B-fix-scope-expansion.md:1084:- Gate 4.5: cache 부재 → N/A
docs/plans/plan-B-fix-scope-expansion.md:1088:feat(skill): kzk-fix-scope-expansion + Gate 4.5 — fix scope expansion (Plan B)
docs/plans/plan-B-fix-scope-expansion.md:1093:  - cache .kzk-harness/fix-scope-cache.json (atomic via writeAtomic)
docs/plans/plan-B-fix-scope-expansion.md:1096:Gate 4.5 (kzk-pre-commit-gate v1.3):
docs/plans/plan-B-fix-scope-expansion.md:1103:kzk-large-task-delegation: subagent dispatch cache inject 룰 (200 char cap, D sibling).
docs/plans/plan-B-fix-scope-expansion.md:1108:CLAUDE.md / README.md: 15→16 skill count (4 sync points).
docs/plans/plan-B-fix-scope-expansion.md:1128:| Gate 4.5 sanity check | mock function `gate45SanityCheck` | 룰 *시뮬* 만. 실 pre-commit-gate hook 통합은 manual cycle 검증 |
docs/plans/plan-B-fix-scope-expansion.md:1130:| CLAUDE.md / README.md count sync | grep assertion (executor 책임) | 4 sync points 누락 시 run-tests.sh FAIL |
docs/plans/plan-B-fix-scope-expansion.md:1132:**전반 한계**: behavioral test 아님. 룰 *기록* + mock fixture 검증. 실제 사용자 prompt 흐름 (UserPromptSubmit 트리거 + system-reminder inject + subagent dispatch 의 cache read + Gate 4.5 BLOCK behavior) 은 manual cycle 검증 의존. spec rev7 §Test 전략 한계 명시 룰 따름.
docs/plans/plan-B-fix-scope-expansion.md:1141:| Gate 4.5 만 비활성 | commit body 에 `fix-scope-skip: gate-4.5-disabled` 명시 (per-commit escape) — kzk-pre-commit-gate skill version downgrade 도 옵션 |
docs/plans/plan-B-fix-scope-expansion.md:1142:| Cache 손실 / 오염 | `rm -f .kzk-harness/fix-scope-cache.json` — 다음 fix-start 가 새로 작성 |
docs/plans/plan-B-fix-scope-expansion.md:1146:- **Plan C** — fresh-agent verifier Stage 3 + Pre-commit Gate 5. Gate 4.5 와 Gate 5 는 sibling — Gate 4.5 가 callsite scope 검증, Gate 5 가 verifier subagent 검증
docs/plans/plan-B-fix-scope-expansion.md:1165:- `Q-PLAN-B-PCG-VERSION` — kzk-pre-commit-gate v1.3 으로 bump 시 기존 harness-share.md §3 의 "6 단계" wording 이 "7 단계 (Gate 0/1/1.5/2/3/4/4.5)" 로 update 필요한가? 본 plan 은 §3.5 신규 section 으로 분리 → §3 wording 그대로 유지 채택. executor 가 §3 본문에 Gate 4.5 행 추가 여부 결정 시 user-queue 등록.
docs/plans/plan-B-fix-scope-expansion.md:1167:- `Q-PLAN-B-CACHE-MULTI-FIX` — same commit 에 multi-fix 수행 시 cache 가 last fix only overwrite — Gate 4.5 가 마지막 fix 만 검사. multi-fix list 보존 (append) 룰 추가 검토 필요? 본 plan rev1 은 last fix wins 채택 (단순성 우선). REVISE 시 검토.
docs/plans/plan-D-regression-memory.md:27:1. `skills/kzk-regression-memory/SKILL.md` 신규 — frontmatter (name/version/description with triggers), §Triggers, §Storage 모델 (5필드 + sidecar **7필드**), §Recall 룰 (decay 공식 + archived 룰 + dismiss CLI), §자가-skip guard (동사구만), §Cycle 회고 5W1H 표, §Stale check, §Rollback (7 level), §Interaction with other kzk-*
docs/plans/plan-D-regression-memory.md:40:14. `skills/kzk-large-task-delegation/SKILL.md` 갱신 — subagent dispatch prompt 에 recall 결과 inject 룰 추가. **size cap 200 char** (truncate + warning)
docs/plans/plan-D-regression-memory.md:42:16. `CLAUDE.md` line 3 + "All N skills" line + `README.md` line 3 + install command skill count — 14→15 (Plan D 신규 skill 1개)
docs/plans/plan-D-regression-memory.md:62:- `CLAUDE_MD = /Users/kimzerokim/work/personal/kzk-harness/CLAUDE.md`
docs/plans/plan-D-regression-memory.md:63:- `README = /Users/kimzerokim/work/personal/kzk-harness/README.md`
docs/plans/plan-D-regression-memory.md:275:## Interaction with other kzk-*
docs/plans/plan-D-regression-memory.md:279:- **kzk-large-task-delegation**: subagent dispatch prompt 에 recall 결과 inject 룰. fix-start 시점 recall = subagent 도 recall 결과 read. **size cap 200 char** — 초과 시 truncate + warning.
docs/plans/plan-D-regression-memory.md:388:const QUERY_WINDOW = 200;  // first 200 chars
docs/plans/plan-D-regression-memory.md:553:- query normalization — raw prompt 전체 X, first 200 char + 키워드 추출 (codex #4)
docs/plans/plan-D-regression-memory.md:793:assert("normalizeQuery truncates to 200 char window", normalized.length <= 250);
docs/plans/plan-D-regression-memory.md:1158:**§`## Interaction with other kzk-*` 갱신** — 끝에 추가:
docs/plans/plan-D-regression-memory.md:1197:§`## Interaction with other kzk-*` 갱신 — 끝에 추가:
docs/plans/plan-D-regression-memory.md:1210:- **Recall 결과 inject** (Plan D): subagent dispatch prompt 의 Rules block 에 메인이 받은 [REGRESSION RECALL] system-reminder 가 있으면, 해당 텍스트를 verbatim 으로 dispatch prompt 에 inject. **size cap 200 char** — reminder 가 200 char 초과 시 truncate (hits 우선순위 high → low confidence_decayed 로 정렬 후 cumulative length 200 도달까지) + warning footer (`[truncated: <N> more hits]`). subagent 가 fix 작업 시 recall 결과 read. 매칭 정확성은 subagent 가 검토.
docs/plans/plan-D-regression-memory.md:1213:§`## Interaction with other kzk-*` 갱신 — 끝에 추가 (이미 있으면 갱신):
docs/plans/plan-D-regression-memory.md:1216:- **kzk-regression-memory**: 메인이 받은 [REGRESSION RECALL] reminder 를 subagent dispatch prompt 에 inject (size cap 200 char, truncate + warning). fix subagent 도 recall 결과 read.
docs/plans/plan-D-regression-memory.md:1311:### Task 15 — Skill count 동기화 14→15 (~6 LoC 변경)
docs/plans/plan-D-regression-memory.md:1313:**Files**: `$CLAUDE_MD`, `$README`
docs/plans/plan-D-regression-memory.md:1315:**`$CLAUDE_MD` line 3** — 14→15:
docs/plans/plan-D-regression-memory.md:1319:**`$CLAUDE_MD` "All N skills" line** — 검색 후 14→15.
docs/plans/plan-D-regression-memory.md:1321:**`$CLAUDE_MD` skills table** — `| kzk-regression-memory | regression memory, 재발 방지, fix 시작, recall, 과거 fix 조회, gstack learn, dismiss recall |` row 추가.
docs/plans/plan-D-regression-memory.md:1323:**`$README` line 3** — 14→15.
docs/plans/plan-D-regression-memory.md:1325:**`$README` install command 의 skill count** — `--n 14` 또는 유사 표기 검색 후 15 로 변경.
docs/plans/plan-D-regression-memory.md:1327:**`install/install-global.sh` line 602-609** — 14→15:
docs/plans/plan-D-regression-memory.md:1368:- CLAUDE.md / README.md skill count 14→15
docs/plans/plan-D-regression-memory.md:1406:- **Plan B**: `kzk-fix-scope-expansion` 신규 skill (D recall consumer + Gate 4.5). skill count 15→16
docs/plans/plan-D-regression-memory.md:1429:- **5 plan 모두 완료 후** (`feature/memory` → `main` 머지 직전): `kzk-pre-merge-sync` (CLAUDE.md sync, deepinit, **step 3 hook auto-enable, fail-closed**) → `git merge --no-ff`
docs/plans/plan-D-regression-memory.md:1445:| #9 Cross-skill silent breakage (idempotent append + reminder size cap + retro snapshot) | Task 8 idempotent jq 검사 / Task 12 file_snapshot canonical = `git rev-parse HEAD:<file>` / Task 13 size cap 200 char + truncate warning |

codex
1. Axis C cover: 대체로 맞다. 다만 verifier dispatch 실패 `BLOCK`, self-bootstrap `Gate 5 N/A`는 acceptance 바깥 서술에만 있다. AC로 끌어올려라.

2. Stage 3 ↔ Gate 5 분리: 의도는 맞다. 규약은 허술하다. `HEAD~1` 기준 diff와 `--cached` 기준 diff를 섞어서 cache hit 판단이 흔들린다. 시간 TTL보다 `staged diff hash + acceptance hash` invalidation으로 박아라. 메모리 only면 “same turn only”를 규칙으로 명시.

3. Verifier model 분기: 깨졌다. locked rule는 `<3 files && <100 LoC => sonnet`인데 test case가 `3 files + 50 LoC => sonnet`으로 적혀 있다. 경계값도 틀렸다. [Plan C](/Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-C-fresh-agent-verification.md:26) [Plan C](/Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-C-fresh-agent-verification.md:89) 이건 바로 수정.

4. Verifier prompt 구조: 방향은 맞다. 문제는 “원본 user request 또는 spec/plan”이다. SoT가 다시 흐려진다. current plan의 `Acceptance Criteria` 우선, 없을 때만 raw user criteria. 혼합 금지.

5. PASS / FAIL / PARTIAL 강제: 강제라고 써놨지 enforcement가 없다. verifier가 prose만 뱉으면 처리 규칙이 없다. 첫 줄 `VERDICT: PASS|FAIL|PARTIAL` 강제, 파싱 실패는 `INVALID_VERDICT => BLOCK/FAIL-closed`로 가라.

6. Q-VERIFIER-FAIL halt: “same diff 2 FAIL” 기준은 나쁘다. fix를 하면 diff가 바뀌니 halt가 안 걸릴 수 있다. 기준은 “same task / same acceptance target verification thread”로 바꿔라. PASS나 user-approved plan revision에서만 reset.

7. Q-TDD-MAIN cross-ref: 흡수는 했다. [Plan A](/Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-A-tdd-self-verification-block.md:95) [Plan C](/Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-C-fresh-agent-verification.md:24) 다만 follow-up 종료 문구를 Plan C에 명시해서 split-brain을 닫아라.

8. `kzk-autonomous-boundary` 변경: 두 entry 추가만으로 끝내면 부족할 가능성이 크다. 기존 halt 표 스키마가 reason/action/resume를 갖고 있으면 그 열까지 채워야 한다. resume 조건이 없다.

9. Test 전략: 얕다. `verifier-routing.test.sh`는 문자열 파서 test일 뿐이다. cache hit/miss, `HEAD~1` vs `--cached` mismatch, invalid verdict, PARTIAL escalation, 2 FAIL halt가 비어 있다.

10. Rollback 7-level: 필요 없다. spec baseline은 6-level이다. C에서 더 늘리면 관리비만 늘어난다. local rollback 5~6개면 충분하다.

11. Skill count: none. Plan C는 신규 skill이 없으니 16 유지가 맞다.

12. 놓친 함정: 가장 큰 건 self-approve hole이다. Stage 3/Gate 5가 둘 다 “subagent 결과”와 “3+ files”에 묶여 있어서, 메인이 직접 한 1~2 file 고위험 fix는 verifier 없이 통과 가능하다. [Plan C](/Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-C-fresh-agent-verification.md:81) [Plan C](/Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-C-fresh-agent-verification.md:174) 이건 “메인 self-approve 차단 의무”와 정면 충돌한다.

Bottom-line: REVISE
tokens used
69,553
1. Axis C cover: 대체로 맞다. 다만 verifier dispatch 실패 `BLOCK`, self-bootstrap `Gate 5 N/A`는 acceptance 바깥 서술에만 있다. AC로 끌어올려라.

2. Stage 3 ↔ Gate 5 분리: 의도는 맞다. 규약은 허술하다. `HEAD~1` 기준 diff와 `--cached` 기준 diff를 섞어서 cache hit 판단이 흔들린다. 시간 TTL보다 `staged diff hash + acceptance hash` invalidation으로 박아라. 메모리 only면 “same turn only”를 규칙으로 명시.

3. Verifier model 분기: 깨졌다. locked rule는 `<3 files && <100 LoC => sonnet`인데 test case가 `3 files + 50 LoC => sonnet`으로 적혀 있다. 경계값도 틀렸다. [Plan C](/Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-C-fresh-agent-verification.md:26) [Plan C](/Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-C-fresh-agent-verification.md:89) 이건 바로 수정.

4. Verifier prompt 구조: 방향은 맞다. 문제는 “원본 user request 또는 spec/plan”이다. SoT가 다시 흐려진다. current plan의 `Acceptance Criteria` 우선, 없을 때만 raw user criteria. 혼합 금지.

5. PASS / FAIL / PARTIAL 강제: 강제라고 써놨지 enforcement가 없다. verifier가 prose만 뱉으면 처리 규칙이 없다. 첫 줄 `VERDICT: PASS|FAIL|PARTIAL` 강제, 파싱 실패는 `INVALID_VERDICT => BLOCK/FAIL-closed`로 가라.

6. Q-VERIFIER-FAIL halt: “same diff 2 FAIL” 기준은 나쁘다. fix를 하면 diff가 바뀌니 halt가 안 걸릴 수 있다. 기준은 “same task / same acceptance target verification thread”로 바꿔라. PASS나 user-approved plan revision에서만 reset.

7. Q-TDD-MAIN cross-ref: 흡수는 했다. [Plan A](/Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-A-tdd-self-verification-block.md:95) [Plan C](/Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-C-fresh-agent-verification.md:24) 다만 follow-up 종료 문구를 Plan C에 명시해서 split-brain을 닫아라.

8. `kzk-autonomous-boundary` 변경: 두 entry 추가만으로 끝내면 부족할 가능성이 크다. 기존 halt 표 스키마가 reason/action/resume를 갖고 있으면 그 열까지 채워야 한다. resume 조건이 없다.

9. Test 전략: 얕다. `verifier-routing.test.sh`는 문자열 파서 test일 뿐이다. cache hit/miss, `HEAD~1` vs `--cached` mismatch, invalid verdict, PARTIAL escalation, 2 FAIL halt가 비어 있다.

10. Rollback 7-level: 필요 없다. spec baseline은 6-level이다. C에서 더 늘리면 관리비만 늘어난다. local rollback 5~6개면 충분하다.

11. Skill count: none. Plan C는 신규 skill이 없으니 16 유지가 맞다.

12. 놓친 함정: 가장 큰 건 self-approve hole이다. Stage 3/Gate 5가 둘 다 “subagent 결과”와 “3+ files”에 묶여 있어서, 메인이 직접 한 1~2 file 고위험 fix는 verifier 없이 통과 가능하다. [Plan C](/Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-C-fresh-agent-verification.md:81) [Plan C](/Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-C-fresh-agent-verification.md:174) 이건 “메인 self-approve 차단 의무”와 정면 충돌한다.

Bottom-line: REVISE
