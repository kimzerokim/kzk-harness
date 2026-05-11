---
name: kzk-test-coverage
version: 1.8.2
description: "TDD-strict (Red→Green→Refactor→Commit) + 100% line+branch coverage on touched files. Anti-self-verification: autonomous main cannot enter TDD red directly — fresh sonnet dispatch required (Q-TDD-MAIN halt). Autonomous mode + code-file change = TDD strict auto-applied (no explicit 'tdd' keyword needed). doc-only / spec / plan = N/A. Triggers: 'tdd', 'test first', '테스트 먼저', 'red-green', autonomous + code change auto-TDD, Q-TDD-AUTO-MISSING. References harness-share.md §11."
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

**자율 mode 판별**:
> See harness-share.md §33 Autonomous-mode Detection SoT (Category A).
> TDD 금지 적용 범위: Category A 동사구 또는 `KZK_AUTONOMOUS=1` 매칭 시.

**enforcement layer**:
- Layer (a) sonnet dispatch prompt 룰 — `kzk-large-task-delegation` 의 §Subagent prompt requirements 의 Rules block 에 자동 주입 (boilerplate 텍스트 본 SKILL.md 참조)
- Layer (b) 메인 self-check — 본 섹션의 자율 mode 판별 + halt 룰

## Autonomous mode TDD enforcement (auto-trigger)

> Trigger fires independently of explicit 'tdd' keyword — code-file change in autonomous mode is sufficient.

**Trigger**: BOTH of the following must be true:
1. Autonomous mode is active — Category A verb phrase match OR `KZK_AUTONOMOUS=1` env var (per `harness-share.md §33` Autonomous-mode Detection SoT).
2. The staged or in-progress diff contains at least one **code-file** change (NOT doc-only — see definition below).

**Code-file definition (auto-TDD trigger boundary)** — a file qualifies as a *code-file* when its path matches NONE of the doc-only fast-path patterns canonical in `kzk-pre-commit-gate §doc-only fast path`. That is the entire definition — no separate "source-code glob" allow-list. This means config/schema files (`.json`, `.yaml`, `.toml`, `.env.example`, etc.) ARE code-files for auto-TDD purposes when they appear outside the doc-only set. When in doubt, the doc-only fast-path glob is the source of truth — do not maintain a local allow-list.

For reference, the current doc-only patterns from `kzk-pre-commit-gate §doc-only fast path` are:
- `*.md`
- `docs/**`
- `skills/**/*.md`
- `harness-share.md`
- `CLAUDE.md`
- `AGENTS.md`
- `docs/screenshots/**`

Examples that ARE code-files (trigger enforcement): `src/**`, `app/**`, `lib/**`, `packages/**`, `**/*.ts`, `**/*.tsx`, `**/*.py`, `**/*.go`, `**/*.rs`, `**/*.mjs`, `**/*.sh` (install scripts), shell hook files under `install/hooks/`.

Test files (`**/*.test.*`, `**/*.spec.*`) are code-files but are the TDD Red-Green vehicle itself — they fulfill (not violate) this enforcement.

**Enforcement**: when trigger fires, TDD-strict (Red → Green → Refactor → Commit) is auto-applied for the cycle. Main cannot enter TDD red directly (existing `Q-TDD-MAIN` rule); fresh sonnet dispatch via `kzk-large-task-delegation` is required.

**TDD evidence per cycle (mandatory commit-message footer when auto-TDD applies)**:
- `TDD evidence: test_files=<staged test paths>, covers_code=<staged code paths>, runner=<framework>, runner_exit=0`
- Required artifacts to satisfy "failing → passing in same cycle":
  1. Staged diff includes ≥ 1 test file matching `**/*.test.*` or `**/*.spec.*` glob (or repo-specific test glob — see project AGENTS.md).
  2. Test scope (test name / describe block / module under test) overlaps with at least one staged code-file change — verify via simple grep of the test file body against staged code-file basenames or exported symbols.
  3. Test runner output captured this cycle: framework run exited 0 (i.e. all tests pass after the new test was added). The "new test exists" requirement is already satisfied by artifact #1 (staged test file change) — no test-count delta required.
- Absence of any of the 3 → `Q-TDD-AUTO-MISSING` halt.

**Infra-missing fallback**: if the repo has no test framework installed / configured (detection: no `package.json` test script, no `pytest.ini`/`pyproject.toml [tool.pytest]`, no `go test` setup, etc.), auto-TDD enforcement is BLOCKED on `Q-COV-SETUP` (existing entry — see kzk-test-coverage §Q-COV-SETUP) until the framework is bootstrapped. Q-TDD-AUTO-MISSING does NOT apply while Q-COV-SETUP is open — the two halts are mutually exclusive in this branch.

**Halt entry — `Q-TDD-AUTO-MISSING`**: if autonomous + code-file change is detected and the next commit attempt has no failing-then-passing test in the same cycle, halt with:
> `Q-TDD-AUTO-MISSING — 자율 mode 에서 code-file 변경 감지됐으나 해당 cycle 에 failing→passing test 없음. TDD 절차 미이행.`

Cross-ref: `kzk-autonomous-boundary §Halt conditions` — the `Q-TDD-AUTO-MISSING` row is registered there.

**Skip**: explicit user "TDD 빼고" / "skip TDD" in the current session only. One-time override per session; does NOT carry forward to subsequent cycles automatically.

## Q-COV-SETUP — test framework absent (halt entry)

**Trigger**: no test framework installed or configured in the repo — detected by absence of all of: `package.json` test script, `pytest.ini` / `pyproject.toml [tool.pytest.ini_options]`, `go test` setup, or equivalent for the repo's primary language.

**Action**: halt auto-TDD enforcement + append entry to `docs/harness/user-queue.md`:
> `Q-COV-SETUP — 테스트 프레임워크 미설치/미설정. auto-TDD 불가. 프레임워크 bootstrapping 후 재개 필요.`

**Resume**: once the framework is bootstrapped (package installed, config file present, `npm run test` / `pytest` / etc. exits 0 on an empty run), close the Q-COV-SETUP entry and re-trigger auto-TDD enforcement for the pending code-file change.

Note: `Q-TDD-AUTO-MISSING` and `Q-COV-SETUP` are mutually exclusive in the infra-missing branch — Q-TDD-AUTO-MISSING does NOT apply while Q-COV-SETUP is open.

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
- **kzk-autonomous-boundary**: 자율 mode 판별 키워드 / 환경변수 룰을 본 skill §Anti-pattern Layer b 에서 정의. autonomous-boundary 의 halt 룰과 통합 (`Q-TDD-MAIN` 큐 entry). 자율 mode + code-file change 의 auto-trigger 룰은 본 skill `§Autonomous mode TDD enforcement` 에 정의되고, 그 halt entry (`Q-TDD-AUTO-MISSING`) 는 `kzk-autonomous-boundary §Halt conditions` 표에 등록됨.
