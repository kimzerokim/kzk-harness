---
name: kzk-test-coverage
version: 1.4.0
description: "TDD-strict and 100% coverage on changed files — make sure to use this skill for any new feature or bugfix requiring TDD discipline, coverage gap reporting, or when 'test first', '테스트 먼저', 'red-green', or 'coverage exemption' appear. Enforces Red→Green→Refactor→Commit sequence: failing test written before implementation read. Anti-self-verification rule: in autonomous mode, main context cannot enter TDD red stage directly — must dispatch via fresh sonnet (halt entry Q-TDD-MAIN if violated). 100% line+branch coverage on touched files; legacy code in touched files counts. Exemptions (boot files, .d.ts, decorator-only) must be declared in PR description. References harness-share.md §11."
---

> Authoritative source: `harness-share.md` §11. On conflict, that wins.

# kzk-test-coverage

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
- **kzk-autonomous-boundary**: 자율 mode 판별 키워드 / 환경변수 룰을 본 skill §Anti-pattern Layer b 에서 정의. autonomous-boundary 의 halt 룰과 통합 (`Q-TDD-MAIN` 큐 entry). **본 Plan A 는 contract only — kzk-autonomous-boundary skill 본문 수정은 Plan A 범위 밖. autonomous-boundary skill 의 halt 룰 표 / Q-TDD-MAIN cross-ref update 는 별도 follow-up 작업 (Plan C 통합 또는 fast-follow). split-brain 위험 인지 — Plan A frozen 시 follow-up issue 등록 의무.**
