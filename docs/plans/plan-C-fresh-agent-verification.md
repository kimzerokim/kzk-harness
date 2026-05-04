# Plan C — Fresh-agent Verification (Stage 3 + Pre-commit Gate 5) — rev2

> Spec: `docs/plans/regression-memory-and-fix-quality-spec.md` (rev7, frozen) — Axis C.
> Branch: `feature/memory`. Order: A → D → B → **C (this)** → E.
> Sister plans: A (frozen), D (frozen), B (rev1).
> Status: **Frozen** — codex CLI cycle 1 verdict **REVISE** 12 항목 모두 답 통합. `kzk-spec-and-review §Cost/cadence` "1 plan = 1 round" 룰 적용 — cycle 2 skip.
> Cycle 1 review: `docs/plans/plan-C-fresh-agent-verification-critic-review.md`.

## Goal

`kzk-large-task-delegation` 의 §Two-stage review 를 **§Three-stage review** 로 확장 + `kzk-pre-commit-gate` 에 **Gate 5** 추가. AI 자율실행 cycle 의 5 메타갭 중 *자기검증* 차단 — 메인이 자기 fix 를 자기 review pass 선언하는 패턴을 fresh-agent verifier 로 격리한다.

핵심 메커니즘 (rev2 핵심 변경 — codex cycle 1 verdict 반영):

- **Stage 3** — cycle 끝 / large-task delegation 끝 직후 fresh `oh-my-claudecode:verifier` (또는 `oh-my-claudecode:code-reviewer`) dispatch. 메인 self-approve 금지.
- **Trigger 확장** (rev2 #12 self-approve hole 차단): trigger = ANY(file count ≥ 3, high-risk tag, **메인 직접 commit 모든 case**). 단순 case 는 sonnet 빠른 verify, 그 외 opus.
- **Model 분기** (rev2 #3 boundary 정정): `< 3 files && < 100 LoC → sonnet`, **그 외 → opus**. 경계값 정확.
- **Verifier prompt SoT** (rev2 #4): current plan §Acceptance Criteria 우선 (grep 추출), 없을 때만 raw user criteria. 혼합 금지.
- **VERDICT enforcement** (rev2 #5): 응답 첫 줄 `VERDICT: PASS|FAIL|PARTIAL` 강제. 정규식 `^VERDICT: (PASS|FAIL|PARTIAL)$` 매칭. 실패 시 `INVALID_VERDICT` → fail-closed BLOCK + Q-VERIFIER-INVALID entry.
- **Cache 규약** (rev2 #2): TTL 제거 → key `(staged_diff_hash, acceptance_hash, verifier_model)`. 메모리 only, **same turn only**. 다른 turn = re-verify. Stage 3 diff base = `HEAD~1` (cycle 단위, post-commit), Gate 5 diff base = `--cached` (commit 단위, pre-commit) — 단일화.
- **Halt 기준** (rev2 #6): "same task / same acceptance target verification thread" 기준. thread = `(plan_path, acceptance_id, verification_round)`. 같은 thread 안 2 consecutive FAIL → halt + `Q-VERIFIER-FAIL`. PASS 또는 user-approved plan revision (rev bump) 에서만 thread reset.
- **Verifier dispatch 실패 BLOCK** (rev2 #1): subagent 응답 없음, timeout, INVALID_VERDICT 모두 BLOCK + user-queue entry. fail-closed.
- **Plan C self-bootstrap N/A 예외** (rev2 #1): Plan C 자체 cycle (자기 commit) 에서 Stage 3 = N/A 1회만 — commit body 명시 의무.
- **Q-TDD-MAIN 흡수 종료** (rev2 #7): Plan A follow-up 의 Q-TDD-MAIN 은 본 Plan C task 3 에서 흡수 완료. 별도 follow-up 없음. split-brain 차단.
- **kzk-autonomous-boundary halt 표 schema** (rev2 #8): 기존 표의 `reason / action / resume` 열 모두 채움 — Q-TDD-MAIN, Q-VERIFIER-FAIL, Q-VERIFIER-INVALID 셋 entry 등록.

## Acceptance Criteria

1. `skills/kzk-large-task-delegation/SKILL.md` v1.6.0 → v1.7.0 — 기존 §Two-stage review 를 §Three-stage review 로 rename + Stage 3 신규. Plan D 의 recall inject 룰 + Plan B 의 fix-scope cache inject 룰 + Plan A 의 Anti-Self-Verification boilerplate 모두 보존
2. `skills/kzk-pre-commit-gate/SKILL.md` v1.3.0 → v1.4.0 — `## Gate 5 — Fresh-agent verifier (Plan C)` 신규 section. 위치: Plan B Gate 4.5 다음, `## Doc-only commit exception` 직전. frontmatter description 에 `Gate 5` trigger 추가. Triggers list 에 `Gate 5`, `verifier`, `fresh-agent verification`, `Q-VERIFIER-FAIL`, `Q-VERIFIER-INVALID` 추가
3. `skills/kzk-autonomous-boundary/SKILL.md` v1.2.0 → v1.3.0 — §Halt conditions 표 (`reason / action / resume` 3 열 schema 그대로) 에 `Q-TDD-MAIN`, `Q-VERIFIER-FAIL`, `Q-VERIFIER-INVALID` 세 entry 추가. 모든 열 채움. Triggers list 갱신. Plan A 의 Q-TDD-MAIN follow-up 흡수 종료 문구 본 plan 본문 + skill cross-ref 모두 명시 (rev2 #7)
4. `harness-share.md` 갱신 — §3 Pre-commit Gate 끝에 Gate 5 룰 cross-ref + §4 Subagent-Driven Dispatch 끝에 Stage 3 룰 cross-ref. Plan A 의 §11.1 / Plan B 의 §3.5 / Plan D 의 §29 모두 보존
5. `install/test/verifier-routing.test.sh` 신규 — model 분기 + cache + diff base + invalid verdict + PARTIAL escalate + 2 FAIL halt thread 검증. 최소 12 case (rev2 #9 강화)
6. `install/test/run-tests.sh` 갱신 — `verifier-routing.test.sh` 호출 등록
7. **CLAUDE.md / README.md skill count 검증 — Plan C 변경 없음 확인**. Plan C 는 신규 skill 없음. Skill count = Plan D + B 합산값 (16) 그대로 유지 (rev2 #11)
8. Stage 3 / Gate 5 분리 룰 명시 — Stage 3 diff base = `HEAD~1` (cycle 단위, post-commit), Gate 5 diff base = `--cached` (commit 단위, pre-commit). cache key `(staged_diff_hash, acceptance_hash, verifier_model)`. 메모리 only + **same turn only** (rev2 #2)
9. Verifier prompt SoT 룰 명시 — current plan §Acceptance Criteria 헤더 grep 추출 우선, 없을 때만 raw user criteria. 혼합 금지 (rev2 #4)
10. VERDICT enforcement — verifier prompt 끝에 `응답 첫 줄 = VERDICT: PASS|FAIL|PARTIAL` 강제. 파싱 정규식 `^VERDICT: (PASS|FAIL|PARTIAL)$`. 실패 → `INVALID_VERDICT` → fail-closed BLOCK + Q-VERIFIER-INVALID (rev2 #5)
11. Halt 기준 = thread `(plan_path, acceptance_id, verification_round)`. 같은 thread 안 2 consecutive FAIL → Q-VERIFIER-FAIL halt. PASS 또는 user-approved rev bump 에서만 reset (rev2 #6)
12. Trigger 확장 — Stage 3 / Gate 5 trigger = ANY(file count ≥ 3, high-risk tag = auth/payment/migration/public API, **메인 직접 commit 모든 case**). 메인 self-approve hole 차단 (rev2 #12)
13. Verifier dispatch 실패 BLOCK — subagent 응답 없음 / timeout / INVALID_VERDICT → BLOCK + user-queue entry (rev2 #1)
14. Plan C self-bootstrap N/A 예외 — Plan C 자체 cycle commit 에서 Stage 3 / Gate 5 = N/A 1회만 (rev2 #1). commit body 에 명시
15. `bash install/test/run-tests.sh` PASS (verifier-routing.test.sh 12 case 포함 전체 통과)
16. atomic commit 메시지: `feat(skill): kzk-large-task-delegation Stage 3 + Gate 5 — fresh-agent verifier (Plan C rev2)`

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
- description 끝에 trigger 추가: `'Stage 3'`, `'fresh-agent verifier'`, `'verifier dispatch'`, `'INVALID_VERDICT'`

**Triggers section 갱신** (line 13): 끝에 추가
```
'Stage 3', 'fresh-agent verifier', 'verifier dispatch', 'verifier model routing', 'PASS FAIL PARTIAL', 'Q-VERIFIER-FAIL', 'Q-VERIFIER-INVALID', 'INVALID_VERDICT', 'verification thread'.
```

**§Two-stage review → §Three-stage review rename + Stage 3 신규**:

기존 `## Two-stage review (mandatory after each subagent finishes)` 섹션 (line 273 부근) 을 `## Three-stage review (mandatory after each subagent finishes)` 로 rename. 기존 1-4 항목 (trust-but-verify / build·test / spec acceptance / coverage) 을 Stage 1 (trust-but-verify), Stage 2 (build/test/Playwright + spec acceptance + coverage 통합) 으로 묶고, **Stage 3 신규** 추가:

```markdown
## Three-stage review (mandatory after each subagent finishes)

### Stage 1 — Trust-but-verify

`git log` + `git diff` + dist artifact 직접 확인. agent summary 만 신뢰 X.

### Stage 2 — Gate 통합 (build/test/Playwright + spec acceptance + coverage)

1. Build / test / Playwright (if applicable) result
2. Spec acceptance criteria 충족 확인
3. Coverage on touched files (per `kzk-test-coverage` — 100% line + branch on changed files; exemption only with explicit Q-COV-* entry in `docs/harness/user-queue.md`)

### Stage 3 — Fresh-agent verification (Plan C rev2)

#### Trigger — ANY of:

(a) `git diff --name-only HEAD~1` (post-commit) 또는 `git diff --cached --name-only` (pre-commit) 결과 **3+ 파일**
(b) **High-risk tag**: spec/plan task 가 auth / payment / migration / public API 영역 변경 (plan 본문 명시 또는 commit message body 의 high-risk marker)
(c) **메인 직접 commit 모든 case** (메인이 author 한 commit 인 경우, 파일 수와 무관 — 메인 self-approve hole 차단)

조건 (a) 단독 충족 시: §Verifier dispatch §Model 분기 적용
조건 (b) 또는 (c): opus 강제 (file size 기반 분기 무시)

**메인 self-approve 금지** — Stage 1/2 만으로 commit 진행 X. Stage 3 PASS 받기 전 commit 금지 (Gate 5 와 동시 enforcement).

#### Verifier dispatch

```typescript
// model 분기 — git diff --shortstat 결과 기준
//   < 3 files && < 100 LoC → sonnet
//   그 외 → opus
//   empty diff (HEAD~1 부재 등) → opus default safe
//   high-risk tag 또는 메인 직접 commit → opus 강제 (size 무시)

Agent({
  subagent_type: 'oh-my-claudecode:verifier',  // 선호
  // fallback: 'oh-my-claudecode:code-reviewer'
  model: <branch result>,
  prompt: <Verifier prompt — 아래 구조>,
});
```

#### Verifier prompt 구조 (SoT — Plan §Acceptance Criteria 우선)

세 블록 필수, 그 외 inline 금지:

1. **변경 파일 목록** — Stage 3 = `git diff --name-only HEAD~1` verbatim. Gate 5 = `git diff --cached --name-only` verbatim.
2. **Acceptance criteria SoT 발췌**:
   - **우선순위 1**: current plan 의 `## Acceptance Criteria` 헤더 다음 텍스트 — `## Variables` 또는 다음 `## ` 헤더 직전까지 grep 추출 후 verbatim inline. 전체 spec read 금지.
   - **우선순위 2** (plan 부재 또는 §Acceptance Criteria 헤더 부재 시만): raw user request criteria.
   - **혼합 금지**: 우선순위 1 또는 2 단독 — 섞으면 SoT 흐려짐.
3. **질문 블록 + VERDICT enforcement** — verbatim:
   ```
   1. 이 diff 가 acceptance criteria 를 만족하는가?
   2. missing edge case 있는가?
   3. regression 가능성 있는가? (인접 callsite, 인접 모듈, 같은 패턴 재사용)
   4. scope 누수 있는가? (acceptance 에 없는 추가 변경)

   응답 형식 (강제):
   - 첫 줄 = `VERDICT: PASS` 또는 `VERDICT: FAIL` 또는 `VERDICT: PARTIAL`
   - 둘째 줄 이후 = 이유 3-5 줄
   - 첫 줄이 위 정확 형식 아니면 INVALID_VERDICT 처리됨
   ```

#### VERDICT 파싱 (rev2 #5)

메인이 verifier 응답 받은 직후:
- 정규식 `^VERDICT: (PASS|FAIL|PARTIAL)$` 으로 첫 줄 매칭
- 실패 (prose only, 형식 위반, empty 등) → `INVALID_VERDICT` 처리
- `INVALID_VERDICT` → **fail-closed BLOCK** + user-queue entry `Q-VERIFIER-INVALID — verifier 응답 형식 위반 (PASS/FAIL/PARTIAL 첫 줄 부재), 사용자 결정 필요 (manual verify / retry / plan revision)`

#### PASS / FAIL / PARTIAL 처리

| Verdict | 처리 |
|---|---|
| PASS | Stage 3 통과 → Gate 5 가 cache 인용. commit 진행 OK |
| PARTIAL | 추가 fix cycle 1회 (메인이 verifier 지적사항 수렴 → 추가 subagent dispatch → 새 diff → Stage 3 재호출). PARTIAL 2 consecutive (같은 thread) → FAIL 로 escalate |
| FAIL | 메인이 verifier 지적사항 수렴 → fix dispatch → 재호출. **2 consecutive FAIL on same thread** → halt + `Q-VERIFIER-FAIL` user-queue entry |
| INVALID_VERDICT | fail-closed BLOCK + `Q-VERIFIER-INVALID` user-queue entry. retry / manual verify / plan revision 사용자 결정 |
| Dispatch fail (no response / timeout) | BLOCK + `Q-VERIFIER-DISPATCH-FAIL` user-queue entry. fallback path: `oh-my-claudecode:code-reviewer` → 그것도 실패 시 사용자 직접 review |

#### 2 consecutive FAIL halt thread 정의 (rev2 #6)

thread = `(plan_path, acceptance_id, verification_round)` triple.
- `plan_path` = current plan 의 파일 경로 (예: `docs/plans/plan-C-fresh-agent-verification.md`)
- `acceptance_id` = §Acceptance Criteria 의 항목 번호 (예: `4`)
- `verification_round` = 같은 acceptance 에 대한 verifier 호출 횟수 카운터

같은 thread (= 같은 plan + 같은 acceptance + 같은 round) 안에서 2 consecutive FAIL → halt.

reset 조건 — **둘 중 하나만**:
- PASS — thread counter 0 reset
- user-approved plan revision (rev bump 명시 — 예: rev1 → rev2 frozen) — thread counter 0 reset, round 1 증가

fix 후 diff 변경만으로는 reset X (rev2 #6 의 핵심 — 단순 diff hash 비교는 halt 우회 위험).

#### Stage 3 ↔ Gate 5 cache 규약 (rev2 #2)

cache key = `(staged_diff_hash, acceptance_hash, verifier_model)` triple.
- `staged_diff_hash`:
  - Stage 3 = `git diff HEAD~1 | sha256sum` (cycle 단위, post-commit)
  - Gate 5 = `git diff --cached | sha256sum` (commit 단위, pre-commit)
- `acceptance_hash` = current plan 의 §Acceptance Criteria 발췌 텍스트 sha256
- `verifier_model` = `sonnet` 또는 `opus`

cache hit 룰:
- 같은 turn (대화 내 메인 컨텍스트 살아있음) 안에서 같은 key 면 hit → 기존 PASS 인용
- 다른 turn (사용자 응답 후 컨텍스트 reset) = miss → re-verify

**메모리 only** — sidecar persistence 부재. Plan E fast-follow 후보 (별도 issue 등록 의무).

**diff base 단일화**: Stage 3 = HEAD~1, Gate 5 = --cached. 두 시점 SHA 가 다르면 두 호출 — 보통 cycle 끝 commit 의 commit-then-Stage-3 흐름이면 동일 (HEAD~1 = 직전 commit, --cached = staged = 곧 commit 될 diff).

#### Plan C self-bootstrap N/A 예외 (rev2 #1)

Plan C 자체를 적용한 첫 commit (= 본 plan 의 task 7 commit) 은 Stage 3 / Gate 5 가 *적용되기 전* commit 이라 self-reference paradox. 1회만 N/A 허용:
- commit body 에 명시: `Gate 5 N/A — Plan C self-bootstrap commit, applies from next commit.`
- 사용자 명시 OK 받은 1회만 — 그 후 모든 commit 은 trigger 충족 시 의무 적용
```

**§Subagent prompt requirements 의 Recall 결과 inject 룰 보존** (line 230 부근, Plan D rev2 frozen): 변경 없음.

**§Subagent prompt requirements 의 fix-scope cache inject 룰 보존** (Plan B rev1, line 230 부근): 변경 없음.

**§Sonnet executor — Anti-self-verification boilerplate 보존** (line 249 부근, Plan A rev2 frozen): 변경 없음.

**§Interaction with other kzk-* 갱신** — 끝에 추가:
```
- **kzk-pre-commit-gate**: Gate 5 가 본 skill 의 Stage 3 결과를 cache 인용 (key = staged_diff_hash + acceptance_hash + verifier_model, same turn only). 같은 diff 의 verifier 호출 1회만.
- **kzk-autonomous-boundary**: Stage 3 verifier 2 consecutive FAIL on same thread → `Q-VERIFIER-FAIL`. INVALID_VERDICT → `Q-VERIFIER-INVALID`. dispatch fail → `Q-VERIFIER-DISPATCH-FAIL`. autonomous-boundary §Halt conditions 표가 모두 등록.
- **kzk-test-coverage**: Plan A 의 Q-TDD-MAIN 흡수 종료 — 본 Plan C task 3 에서 kzk-autonomous-boundary 의 halt 표에 entry 추가 완료. 별도 follow-up 없음.
```

### Task 2 — `kzk-pre-commit-gate/SKILL.md` v1.4.0 (Gate 5 신규)

**File**: `$SKILL_PCG`

**Frontmatter 변경**:
- `version: 1.3.0` → `version: 1.4.0`
- description 끝에 trigger 추가: `'Gate 5'`, `'verifier'`, `'fresh-agent verification'`, `'INVALID_VERDICT'`

**Triggers section 갱신** (line 13): 끝에 추가
```
`Gate 5`, `verifier`, `fresh-agent verification`, `Stage 3 cite`, `Q-VERIFIER-FAIL`, `Q-VERIFIER-INVALID`, `Q-VERIFIER-DISPATCH-FAIL`, `INVALID_VERDICT`.
```

**§Gate 5 신규 section** — 위치: Plan B `## Gate 4.5 — Fix Scope Sanity Check (Plan B)` 다음, `## Doc-only commit exception` 직전:

```markdown
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
```

**§Failure protocol 갱신** (line 119 부근) — 기존 bullet 끝에 추가:
```
- Gate 5 verifier 2 consecutive FAIL on same thread → halt + `Q-VERIFIER-FAIL`. INVALID_VERDICT → `Q-VERIFIER-INVALID`. dispatch fail → `Q-VERIFIER-DISPATCH-FAIL`. See `kzk-autonomous-boundary` §Halt conditions 표 (reason / action / resume schema).
```

**§Interaction with other kzk-* 갱신** — 끝에 추가:
```
- **kzk-large-task-delegation**: Gate 5 verifier dispatch 는 본 skill 의 §Three-stage review §Stage 3 와 sibling. 같은 thread / 같은 cache key → verifier 호출 1회만 (cache hit citation 우선).
```

### Task 3 — `kzk-autonomous-boundary/SKILL.md` v1.3.0 (halt 표 schema 채움 + Q-TDD-MAIN 흡수)

**File**: `$SKILL_AB`

**Frontmatter 변경**:
- `version: 1.2.0` → `version: 1.3.0`
- description 변경 없음

**Triggers section 갱신** (line 13): 끝에 추가
```
, `Q-TDD-MAIN`, `Q-VERIFIER-FAIL`, `Q-VERIFIER-INVALID`, `Q-VERIFIER-DISPATCH-FAIL`, `verifier 2 FAIL`, `verifier consecutive FAIL halt`, `verification thread halt`, `INVALID_VERDICT halt`.
```

**§Halt conditions 갱신** (line 49 부근) — 기존 표/list 의 `reason / action / resume` 3 열 schema 그대로 따름. 다음 entry 추가 (모든 열 채움):

```markdown
| Trigger | Reason | Action | Resume |
|---|---|---|---|
| ... (기존 entry 보존) ... | | | |
| `Q-TDD-MAIN` | 자율 mode 의 메인 컨텍스트가 직접 TDD red 단계 진입 시도 (Plan A Layer b cross-ref) | halt + user-queue entry `Q-TDD-MAIN — 자율 cycle 의 메인 직접 TDD 시도, fresh sonnet dispatch 재시작 필요`. 메인 직접 test 작성 즉시 중단. cross-ref: `kzk-test-coverage` §Anti-pattern §자율 mode 메인 직접 TDD 금지 / `kzk-large-task-delegation` §Anti-self-verification boilerplate | fresh sonnet dispatch PASS (test 작성을 subagent 가 수행) 또는 사용자 명시 override (1회만, queue 에 OK 기록) |
| `Q-VERIFIER-FAIL` | `kzk-large-task-delegation` §Stage 3 / `kzk-pre-commit-gate` §Gate 5 의 verifier 가 같은 thread = `(plan_path, acceptance_id, verification_round)` 안에서 2 consecutive FAIL (PARTIAL 2회 같은 지적사항이면 FAIL escalate 포함) | halt + user-queue entry `Q-VERIFIER-FAIL — verifier 2 consecutive FAIL on thread (<plan>:<acceptance_id>:<round>), 사용자 결정 필요 (verifier 지적 무시 / 추가 fix / plan revision)`. commit BLOCK 유지 | PASS 또는 user-approved plan revision (rev bump 명시) — 둘 중 하나만 thread reset |
| `Q-VERIFIER-INVALID` | verifier 응답 첫 줄이 `VERDICT: PASS|FAIL|PARTIAL` 정규식 매칭 실패 (prose only, 형식 위반, empty 등) | fail-closed BLOCK + user-queue entry `Q-VERIFIER-INVALID — verifier 응답 형식 위반, 사용자 결정 필요 (manual verify / retry with stricter prompt / plan revision)` | retry verifier (stricter prompt) PASS 또는 사용자 manual verify OK 또는 plan revision |
| `Q-VERIFIER-DISPATCH-FAIL` | verifier subagent dispatch 자체 실패 (no response / timeout / subagent type unavailable) | BLOCK + user-queue entry `Q-VERIFIER-DISPATCH-FAIL — verifier dispatch 실패, fallback path 또는 사용자 직접 review 결정 필요`. fallback: `oh-my-claudecode:code-reviewer` 시도 | fallback PASS 또는 사용자 manual review OK |
```

**§Q-TDD-MAIN 흡수 종료 문구** — 표 다음 본문 1 단락 추가 (rev2 #7):

```markdown
### Q-TDD-MAIN 흡수 종료 (Plan A → Plan C cross-ref)

Plan A rev2 frozen 의 follow-up 로 위임된 `Q-TDD-MAIN` cross-ref 등록은 본 Plan C task 3 에서 흡수 완료. **별도 follow-up 없음**. 이후 어떤 plan 도 Q-TDD-MAIN 의 halt 표 등록을 새로 건드리지 않는다 — split-brain 차단. 룰 본문 수정은 `kzk-test-coverage` §Anti-pattern 영역 한정.
```

**§Interaction with other kzk-* 갱신** — 끝에 추가:
```
- **kzk-test-coverage**: Plan A Layer (b) 자율 mode 메인 직접 TDD 금지 룰의 halt entry (`Q-TDD-MAIN`) 가 본 skill 의 §Halt conditions 표에 등록됨 (Plan C task 3, 흡수 종료).
- **kzk-large-task-delegation / kzk-pre-commit-gate**: Plan C Stage 3 / Gate 5 verifier 관련 halt entry (`Q-VERIFIER-FAIL`, `Q-VERIFIER-INVALID`, `Q-VERIFIER-DISPATCH-FAIL`) 가 본 skill §Halt conditions 표에 등록됨.
```

### Task 4 — `harness-share.md` cross-ref 갱신 (§3 + §4)

**File**: `$SHARE`

**§3 Pre-commit Gate 끝 추가** — 위치: `### Token migration — shadcn + Tailwind v4 bridge requirement` 직전:

```markdown
### Gate 5 — Fresh-agent verifier (Plan C rev2)

자율실행 mode / large-task delegation 끝 / **메인 직접 commit 모든 case** / high-risk tag (auth/payment/migration/public API) / 3+ 파일 multi-file 의 commit 직전:
- `oh-my-claudecode:verifier` (fallback `oh-my-claudecode:code-reviewer`) dispatch
- model 분기: `git diff --cached --shortstat` → < 3 files && < 100 LoC → sonnet, 그 외 → opus. high-risk / 메인 직접 commit → opus 강제
- VERDICT enforcement: 첫 줄 `VERDICT: PASS|FAIL|PARTIAL` 강제. 정규식 위반 → INVALID_VERDICT → fail-closed BLOCK + Q-VERIFIER-INVALID
- 메인 self-approve 금지. PASS 받기 전 commit BLOCK
- 2 consecutive FAIL on same thread `(plan_path, acceptance_id, verification_round)` → halt + Q-VERIFIER-FAIL
- Stage 3 cache 같은 turn 내 hit 이면 인용 (key = staged_diff_hash + acceptance_hash + verifier_model)
- Plan C self-bootstrap commit 1회만 N/A

룰 본문: `kzk-pre-commit-gate` §Gate 5, `kzk-large-task-delegation` §Three-stage review §Stage 3.
```

**§4 Subagent-Driven Dispatch 끝 추가** — 위치: `### Two-stage review (subagent-driven-development skill 의무)` 다음, `## 5. Documentation Storage Rules` 직전.

기존 Two-stage review 섹션 끝에 새 항목 추가:

```markdown
4. **Stage 3 — Fresh-agent verification (Plan C rev2)** — 자율실행 cycle 끝 / large-task delegation 끝 / 메인 직접 commit 모든 case / high-risk tag / 3+ 파일 multi-file 의 commit 직전 fresh `oh-my-claudecode:verifier` dispatch. VERDICT 첫 줄 강제. 메인 self-approve 금지. 2 consecutive FAIL on same thread → halt + `Q-VERIFIER-FAIL`. INVALID_VERDICT → fail-closed BLOCK + `Q-VERIFIER-INVALID`. 룰 본문: `kzk-large-task-delegation` §Three-stage review §Stage 3.
```

**Plan A 의 §11.1 보존** — 변경 없음.
**Plan B 의 §3.5 보존** — 변경 없음.
**Plan D 의 §29 보존** — 변경 없음.

### Task 5 — `install/test/verifier-routing.test.sh` 신규 (rev2 강화 — 12 case)

**File**: `$TEST_VERIFIER`

`*.test.sh` → bash 라우팅 (spec rev7 §Test 전략).

```bash
#!/usr/bin/env bash
# install/test/verifier-routing.test.sh — Plan C rev2 test
#
# 검증 영역:
# - model 분기 (boundary 정확)
# - cache hit/miss (key = staged_diff_hash + acceptance_hash + verifier_model)
# - HEAD~1 vs --cached diff base 단일화
# - VERDICT 파싱 (정규식 매칭)
# - INVALID_VERDICT fail-closed
# - PARTIAL escalation
# - 2 FAIL halt thread
#
# 한계: dispatch path 만. verifier subagent 응답 품질은 manual.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PASS=0
FAIL=0
ERRORS=()

# ---------------------------------------------------------------------------
# route_verifier — model 분기 룰
#   < 3 files && < 100 LoC → sonnet
#   그 외 → opus
#   empty diff → opus default safe
#   high-risk / 메인 직접 commit flag → opus 강제 (size 무시)
# ---------------------------------------------------------------------------
route_verifier() {
  local shortstat="$1"
  local force_opus="${2:-no}"  # high-risk / 메인 직접 commit
  if [ "$force_opus" = "yes" ]; then
    printf 'opus\n'
    return 0
  fi
  if [ -z "$shortstat" ]; then
    printf 'opus\n'
    return 0
  fi
  local files
  files=$(printf '%s' "$shortstat" | grep -oE '[0-9]+ files? changed' | grep -oE '^[0-9]+' || printf '0')
  local ins
  ins=$(printf '%s' "$shortstat" | grep -oE '[0-9]+ insertions?\(\+\)' | grep -oE '^[0-9]+' || printf '0')
  local del
  del=$(printf '%s' "$shortstat" | grep -oE '[0-9]+ deletions?\(-\)' | grep -oE '^[0-9]+' || printf '0')
  local loc=$((ins + del))
  if [ "$files" -lt 3 ] && [ "$loc" -lt 100 ]; then
    printf 'sonnet\n'
  else
    printf 'opus\n'
  fi
}

# ---------------------------------------------------------------------------
# parse_verdict — 첫 줄 정규식 매칭 (rev2 #5)
#   match: PASS / FAIL / PARTIAL
#   miss: INVALID_VERDICT
# ---------------------------------------------------------------------------
parse_verdict() {
  local response="$1"
  local first_line
  first_line=$(printf '%s' "$response" | head -n 1)
  if printf '%s' "$first_line" | grep -qE '^VERDICT: (PASS|FAIL|PARTIAL)$'; then
    printf '%s' "$first_line" | sed -E 's/^VERDICT: //'
  else
    printf 'INVALID_VERDICT\n'
  fi
}

# ---------------------------------------------------------------------------
# cache_key — (staged_diff_hash, acceptance_hash, verifier_model)
# ---------------------------------------------------------------------------
cache_key() {
  local diff_hash="$1" acc_hash="$2" model="$3"
  printf '%s:%s:%s\n' "$diff_hash" "$acc_hash" "$model"
}

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

printf 'verifier-routing.test.sh — Plan C rev2 검증 (12 case)\n'

# === Block 1: model 분기 boundary (rev2 #3 정정) ===
# < 3 files && < 100 LoC → sonnet, else opus

# Case 1: 2 files + 50 LoC → sonnet
assert_eq "2 files + 50 LoC → sonnet" "sonnet" "$(route_verifier ' 2 files changed, 50 insertions(+)')"

# Case 2: 3 files + 50 LoC → opus (파일 boundary)
assert_eq "3 files + 50 LoC → opus" "opus" "$(route_verifier ' 3 files changed, 50 insertions(+)')"

# Case 3: 2 files + 100 LoC → opus (LoC boundary)
assert_eq "2 files + 100 LoC → opus" "opus" "$(route_verifier ' 2 files changed, 100 insertions(+)')"

# Case 4: 2 files + 99 LoC → sonnet (둘 다 미만)
assert_eq "2 files + 99 LoC → sonnet" "sonnet" "$(route_verifier ' 2 files changed, 99 insertions(+)')"

# Case 5: empty diff → opus default safe
assert_eq "empty diff → opus default safe" "opus" "$(route_verifier '')"

# Case 6: high-risk force opus (size 무관)
assert_eq "high-risk force opus (1 file + 10 LoC)" "opus" "$(route_verifier ' 1 file changed, 10 insertions(+)' yes)"

# === Block 2: VERDICT 파싱 (rev2 #5) ===

# Case 7: PASS 정상 응답
assert_eq "VERDICT: PASS 첫 줄 → PASS" "PASS" "$(parse_verdict 'VERDICT: PASS
이유 1
이유 2')"

# Case 8: FAIL 정상 응답
assert_eq "VERDICT: FAIL 첫 줄 → FAIL" "FAIL" "$(parse_verdict 'VERDICT: FAIL
edge case missing')"

# Case 9: PARTIAL 정상 응답
assert_eq "VERDICT: PARTIAL 첫 줄 → PARTIAL" "PARTIAL" "$(parse_verdict 'VERDICT: PARTIAL
scope 누수 일부')"

# Case 10: prose only (형식 위반) → INVALID_VERDICT
assert_eq "prose only → INVALID_VERDICT" "INVALID_VERDICT" "$(parse_verdict '대체로 좋아 보입니다.
다만 edge case 가...')"

# === Block 3: cache key + diff base (rev2 #2) ===

# Case 11: 같은 (diff_hash, acceptance_hash, model) → 같은 cache key (hit)
key_a=$(cache_key "abc123" "def456" "sonnet")
key_b=$(cache_key "abc123" "def456" "sonnet")
assert_eq "cache key 동일 → hit 가능" "$key_a" "$key_b"

# Case 12: model 다르면 cache key 다름 (miss)
key_c=$(cache_key "abc123" "def456" "sonnet")
key_d=$(cache_key "abc123" "def456" "opus")
if [ "$key_c" != "$key_d" ]; then
  printf '  PASS: model 다른 cache key → miss\n'
  PASS=$((PASS + 1))
else
  printf '  FAIL: model 다른 cache key → 같음 (잘못)\n'
  FAIL=$((FAIL + 1))
  ERRORS+=("cache key model differentiation")
fi

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

**Test 한계** (rev2 #9):
- model 분기 boundary 검증 (case 1-6)
- VERDICT 정규식 파싱 + INVALID_VERDICT (case 7-10)
- cache key triple 동일성 + model differentiation (case 11-12)
- **2 FAIL halt thread / PARTIAL escalation 의 *행동 검증* 은 manual** — bash test 로 자율실행 cycle 시뮬레이션 불가. 룰 *기록* 은 `skill-text-checks.sh` 가 grep 으로 검증 (Plan A 패턴 — 본 plan rev2 후보).

### Task 6 — `install/test/run-tests.sh` 갱신

**File**: `$TEST_RUN`

위치: 종합 result 출력 직전, Plan A `skill-text-checks` block 다음:

```bash
# Plan C — verifier-routing
printf '\n--- verifier-routing (Plan C rev2) ---\n'
if bash "$REPO_ROOT/install/test/verifier-routing.test.sh"; then
  PASS=$((PASS + 1))
  printf '  PASS: verifier-routing.test.sh\n'
else
  FAIL=$((FAIL + 1))
  ERRORS+=("verifier-routing.test.sh")
fi
```

### Task 7 — atomic commit

`kzk-pre-commit-gate` 통과 (Gate 0–5):
- Gate 0: AGENTS.md sync — Plan C 는 신규 source 파일 없음. markdown skill 변경 + sh test 1개 → AGENTS.md hierarchy 가 `install/test/` 에 있을 시 row append
- Gate 1: ai-slop scan
- Gate 1.5: secrets scan
- Gate 2: build (n/a — markdown + sh test only)
- Gate 3: test — `bash install/test/run-tests.sh` PASS (verifier-routing.test.sh 12 case 포함)
- Gate 4: Playwright (n/a — non-UI)
- Gate 4.5 (Plan B): N/A (fix-scope-cache 부재)
- **Gate 5 (본 plan 추가): self-bootstrap N/A** — commit body 명시 의무 (rev2 #1 / #14)

commit message:
```
feat(skill): kzk-large-task-delegation Stage 3 + Gate 5 — fresh-agent verifier (Plan C rev2)

Stage 3: cycle 끝 / large-task delegation 끝 / 메인 직접 commit 모든 case /
high-risk tag / 3+ 파일 multi-file 직후 fresh verifier dispatch. model 분기:
< 3 files && < 100 LoC → sonnet, 그 외 → opus. high-risk / 메인 직접 commit → opus 강제.
VERDICT 첫 줄 정규식 강제 (^VERDICT: (PASS|FAIL|PARTIAL)$). 위반 → INVALID_VERDICT
fail-closed BLOCK. 2 consecutive FAIL on same thread (plan_path, acceptance_id,
verification_round) → halt + Q-VERIFIER-FAIL. PASS 또는 user-approved rev bump
에서만 thread reset.

Gate 5: commit 직전 final check. cache key (staged_diff_hash, acceptance_hash,
verifier_model) — same turn only memory cache. Stage 3 cache hit 인용 또는 새 호출.
diff base 단일화: Stage 3 = HEAD~1, Gate 5 = --cached.

kzk-autonomous-boundary halt 표 schema (reason / action / resume) 채움:
- Q-TDD-MAIN (Plan A 흡수 종료 — 별도 follow-up 없음)
- Q-VERIFIER-FAIL (verifier 2 consecutive FAIL on thread)
- Q-VERIFIER-INVALID (VERDICT 형식 위반)
- Q-VERIFIER-DISPATCH-FAIL (subagent dispatch 실패)

harness-share.md §3 Gate 5 + §4 Stage 3 cross-ref. Plan A §11.1 / Plan B §3.5 /
Plan D §29 보존. install/test/verifier-routing.test.sh 12 case (boundary / VERDICT
정규식 / cache key triple).

Spec: docs/plans/regression-memory-and-fix-quality-spec.md (rev7).
Plan: docs/plans/plan-C-fresh-agent-verification.md (rev2, frozen).
Cycle 1 critic: docs/plans/plan-C-fresh-agent-verification-critic-review.md.

Gate 5 N/A — Plan C self-bootstrap commit, applies from next commit.
```

## Test 전략 (한계 명시 — rev2 강화)

- `verifier-routing.test.sh` 12 case = model 분기 boundary (6) + VERDICT 정규식 + INVALID (4) + cache key triple (2). 룰 *기록* 검증.
- **자율실행 행동 검증** (2 FAIL halt thread, PARTIAL → FAIL escalate, dispatch fail fallback) = bash test 시뮬레이션 불가 → manual cycle 검증 의존. spec rev7 §Non-goals 와 일치.
- Stage 3 ↔ Gate 5 cache 메커니즘 (메모리 only, same turn only) = 대화 turn 내 메인 책임 → automated test 부재. Plan E fast-follow 후보 (sidecar persistence + automated test).
- Q-VERIFIER-FAIL / Q-VERIFIER-INVALID / Q-VERIFIER-DISPATCH-FAIL halt 표 entry 의 텍스트 *기록* 만 검증 (`skill-text-checks.sh` 가 grep — Plan A 패턴 본 plan 또는 Plan E 후보).

## Rollback (rev2 #10 — 5-level)

| Level | 메커니즘 |
|---|---|
| 1. 단일 plan revert | `git revert <Plan-C-commit-sha>` — Stage 3 + Gate 5 + halt 표 + test 모두 한 commit 복원 |
| 2. Stage 3 + Gate 5 비활성 (소프트) | `DISABLE_OMC=kzk-large-task-delegation,kzk-pre-commit-gate` (Stage 3 / Gate 5 둘 다 OFF — 단 다른 gate 의 Plan A/B/D 룰도 함께 비활성, 영향 큼) |
| 3. Gate 5 만 manual skip | commit body 에 `Gate 5 skip — manual user override <reason>` 명시. Stage 3 는 잔존 |
| 4. verifier subagent unavailable 일시 우회 | Stage 3 / Gate 5 의 fallback path = `oh-my-claudecode:code-reviewer` → 그것도 실패 시 사용자 manual review (Q-VERIFIER-DISPATCH-FAIL queue) |
| 5. halt 표 entry 만 revert | `kzk-autonomous-boundary` SKILL.md 의 Q-TDD-MAIN / Q-VERIFIER-FAIL / Q-VERIFIER-INVALID / Q-VERIFIER-DISPATCH-FAIL 4 entry 수동 제거 (loop forever 위험 — 신중) |

(spec baseline 6-level 보다 1 적은 5-level — Plan C 신규 skill 없어 simpler. rev2 #10 의 권고 반영.)

## Out of scope (Plan E 또는 follow-up 위임)

- **Stage 3 / Gate 5 cache sidecar persistence** — 대화 turn 간 cache 보존 (`.kzk-harness/verifier-cache.json` 같은 sidecar). 본 plan rev2 는 메모리 only + same turn only. Plan E fast-follow 후보 (production code-first 영역 아니므로 별도 follow-up issue 등록 의무).
- **Verifier prompt 의 acceptance criteria 자동 추출 helper** — `## Acceptance Criteria` 헤더 grep + verbatim copy 룰 *기록* 만. 자동 추출 script (`install/scripts/extract-acceptance.sh`) 는 Plan E fast-follow.
- **Behavioral verifier test** — verifier subagent 응답 시뮬레이션 (mock fixture 기반 PASS/FAIL/PARTIAL/INVALID classification). spec rev7 §Non-goals.
- **PARTIAL escalate 의 정밀 지적사항 매칭** — 본 plan 은 "같은 thread 안 2 consecutive PARTIAL" 룰만. 정밀 지적사항 hash 기반 matching 은 LLM 회고 영역 — spec rev7 §Non-goals.
- **Plan E (production code-first + 멱등성)** — 마지막 plan. Plan C Stage 3 / Gate 5 는 Plan E 변경에도 적용 (3+ 파일 multi-file 또는 메인 직접 commit 또는 high-risk tag).

## Critic 매트릭스

본 표는 codex CLI cycle 1 verdict (REVISE) 의 12 항목이 본 plan rev2 어디에서 흡수됐는지 cross-ref. 다음 cycle critic 의 검증 단축용.

| # | Critic 지적 | Rev2 흡수 위치 |
|---|---|---|
| #1 | AC cover — verifier dispatch fail BLOCK / Plan C self-bootstrap N/A | AC #13, #14 / Goal §"Verifier dispatch 실패 BLOCK" + §"Plan C self-bootstrap N/A 예외" / Task 1 §Verifier dispatch §처리 표 / Task 2 §절차 §Verdict 처리 / Task 7 commit body |
| #2 | Stage 3 ↔ Gate 5 cache 규약 (TTL → diff hash + acceptance hash, same turn only, HEAD~1 vs --cached 단일화) | AC #8 / Goal §"Cache 규약" / Task 1 §Stage 3 ↔ Gate 5 cache 규약 / Task 2 §Stage 3 vs Gate 5 분리 / Task 5 case 11-12 |
| #3 | Verifier model 분기 boundary 정정 (`< 3 && < 100 → sonnet`, test case 정정) | Goal §"Model 분기" / Task 1 §Verifier dispatch / Task 5 case 1-4 (boundary 정확) |
| #4 | Verifier prompt SoT (current plan §Acceptance 우선, raw user 폴백, 혼합 금지) | AC #9 / Goal §"Verifier prompt SoT" / Task 1 §Verifier prompt 구조 §우선순위 1/2 / Task 2 §절차 #2 |
| #5 | PASS/FAIL/PARTIAL enforcement (첫 줄 정규식, INVALID_VERDICT fail-closed) | AC #10 / Goal §"VERDICT enforcement" / Task 1 §VERDICT 파싱 + §처리 표 / Task 2 §절차 §Verdict 처리 / Task 5 case 7-10 |
| #6 | Q-VERIFIER-FAIL halt 기준 = thread `(plan_path, acceptance_id, verification_round)`, PASS / rev bump 만 reset | AC #11 / Goal §"Halt 기준" / Task 1 §2 consecutive FAIL halt thread 정의 / Task 3 halt 표 Q-VERIFIER-FAIL row |
| #7 | Q-TDD-MAIN 흡수 종료 문구 명시 (split-brain 차단) | AC #3 / Goal §"Q-TDD-MAIN 흡수 종료" / Task 3 §Q-TDD-MAIN 흡수 종료 단락 + §Interaction with other kzk-* / Task 1 §Interaction with other kzk-* |
| #8 | kzk-autonomous-boundary halt 표 schema 모든 열 (`reason / action / resume`) 채움 | AC #3 / Task 3 halt 표 — 4 entry 모두 3 열 채움 |
| #9 | Test 전략 강화 (cache hit/miss, HEAD~1 vs --cached, invalid verdict, PARTIAL escalation, 2 FAIL halt) | AC #5 / Task 5 12 case (boundary 6 + VERDICT 4 + cache 2). 행동 검증 manual 한계는 §Test 전략 한계 명시 |
| #10 | Rollback 7-level → 5-level (spec baseline 6 보다 1 적게) | §Rollback table 5 row |
| #11 | Skill count — none (Plan C 신규 skill 없음) | AC #7 / Goal 본문 + Task 1-3 frontmatter version bump 만 (skill 추가 없음) |
| #12 | CRITICAL Self-approve hole — trigger 확장 (file count + high-risk tag + 메인 직접 commit ANY) | AC #12 / Goal §"Trigger 확장" / Task 1 §Trigger ANY of (a)(b)(c) / Task 2 §Trigger ANY of (a)(b)(c) / Task 5 case 6 (high-risk force opus) |

---

## 메타

- 본 plan rev2 분량 ~330 LoC markdown — Plan A (~310) / Plan B (~280) / rev1 (~250) 대비 expansion. cycle 1 verdict 12 항목 흡수 비용.
- 각 task detail 은 sonnet executor 가 ambiguous 없이 진행 가능 수준.
- Plan A / D / B frozen 룰 모두 보존.
- Plan A 의 Q-TDD-MAIN follow-up 은 본 plan task 3 에서 흡수 종료 (split-brain 차단).
- Plan E 가 마지막 plan — 본 plan Stage 3 / Gate 5 는 Plan E 변경에도 적용 (3+ 파일 multi-file 또는 메인 직접 commit 또는 high-risk tag).
- 다음 cycle critic 검증: §Critic 매트릭스 12 row cross-ref 확인 + 새 갭 (있다면) 만 지적.
