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
자율 mode 판별: KZK_AUTONOMOUS=1 우선, env unset 시 동사구 키워드 (명사 단독 금지).
harness-share.md §11.1 cross-ref.
install/test/skill-text-checks.sh 신규 — 룰 기록 검증 (positive + negative grep).

Spec: docs/plans/regression-memory-and-fix-quality-spec.md (rev6).
Plan: docs/plans/plan-A-tdd-self-verification-block.md (rev2, frozen).
Follow-up: kzk-autonomous-boundary skill 의 Q-TDD-MAIN cross-ref update (Plan C 또는 fast-follow).
```

## Test 전략 (한계 명시)

- `skill-text-checks.sh` 는 룰이 *기록* 됐는지만 확인. behavioral test 아님.
- 실제 sonnet executor 가 anti-self-verification 룰을 따르는지는 다음 cycle (Plan D/B/C) 의 자율 dispatch 에서 manual 검증.
- 한계: 메인 직접 TDD 진입의 self-check + user ACK 게이트는 자동 enforcement 없음 — 사용자 신뢰 의존.

## Rollback

- **단일 plan revert**: `git revert <Plan-A-commit-sha>` — kzk-test-coverage v1.3 → v1.2 + kzk-large-task-delegation boilerplate 제거 + harness-share §11.1 제거 모두 한 commit 복원
- **Layer (b) 만 비활성**: `DISABLE_OMC=kzk-test-coverage` — Layer (b) 메인 self-check + 자율 mode 룰 OFF. 단 **Layer (a) boilerplate 는 `kzk-large-task-delegation` 의 Sonnet executor 섹션에 잔존** — Layer (a) 도 끄려면 추가 `DISABLE_OMC=kzk-test-coverage,kzk-large-task-delegation` 또는 boilerplate 섹션만 수동 git restore
- **Layer (a) 만 비활성**: kzk-large-task-delegation 의 §Sonnet executor — Anti-self-verification boilerplate 섹션 수동 제거 (sonnet dispatch prompt 가 boilerplate inject 안 함)
- **harness-share §11.1 만 revert**: `git restore -p harness-share.md` (cross-ref 제거, skill 본문은 보존)
- **Plan A 전체 비활성 (실험)**: 위 두 DISABLE_OMC 조합

## Out of scope (다음 Plan 으로 위임)

- Plan D — regression memory hook + sidecar + cycle 회고
- Plan B — fix-scope-expansion
- Plan C — fresh-agent verifier Stage 3 + Pre-commit Gate 5
- behavioral TDD test (sonnet dispatch 시뮬레이션) — 본 spec Non-goals (Plan A 책임 아님)

## Codex review 의무

본 plan draft 는 frozen 전 codex CLI consult (stdin path) → critic opus fallback. spec rev5 의 §메타 룰 대로 4 plan 중 최소 2개 codex CLI 성공 목표.

Plan A 가 가장 작고 markdown 변경 위주 — codex 시도 + critic 대기. 결과 후 frozen 표기.
