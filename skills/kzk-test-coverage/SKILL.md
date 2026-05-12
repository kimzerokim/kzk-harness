---
name: kzk-test-coverage
version: 1.9.0
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

Reading implementation during the Red phase (writing the failing test) is forbidden. This creates a self-verification loop.

**Allowed reads during Red phase**:
- spec / acceptance criteria / user prompt / issue body
- External interface (public API signature only)
- hook/install infrastructure code (e.g. `install/hooks/regression-recall.mjs`) — allowed even during Red phase when harness/hook debugging is needed. However, *copying that code's interface as test assumptions* is still forbidden.

**Forbidden reads during Red phase**:
- Implementation body of the function being written
- Sibling function bodies in the same file (public interface signatures are OK)
- Existing test files (blocks copying existing test assumptions)

**Self-check** (immediately before entering Red):
> "Is the behavior this test verifies stated in the spec / acceptance criteria? Or is it inferred from the current shape of the implementation?"

### Autonomous mode — main direct TDD forbidden (Layer b)

In autonomous execution mode (`kzk-autonomous-boundary` entered, `kzk-web-loop`, `kzk-autonomous-loop`, harness self-improvement cycle):

- Main context is forbidden from entering TDD red phase directly — must always fresh-dispatch sonnet (`kzk-large-task-delegation`)
- If main attempts direct entry: halt + user-queue entry: `Q-TDD-MAIN — autonomous cycle main direct TDD attempt, fresh dispatch restart required`
- Non-autonomous mode (user gives TDD task directly via prompt): main self-check + user ACK gate (proceed only after explicit user confirm). **Accepted ACK phrases (other wording is ambiguous → re-request)**:
  - "이 task TDD 직접 진입 OK"
  - "test-from-spec 준수 확인했음"
  - "메인 직접 TDD 허락"
  - "anti-self-verification 룰 인지하고 진행"

**Autonomous mode detection**:
> See harness-share.md §33 Autonomous-mode Detection SoT (Category A).
> TDD prohibition scope: applies on Category A verb phrase match OR `KZK_AUTONOMOUS=1`.

**Enforcement layers**:
- Layer (a) sonnet dispatch prompt rule — auto-injected into the Rules block of `kzk-large-task-delegation` §Subagent prompt requirements (boilerplate text in this SKILL.md)
- Layer (b) main self-check — autonomous mode detection + halt rule in this section

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
> `Q-TDD-AUTO-MISSING — autonomous mode code-file change detected but no failing→passing test in the same cycle. TDD procedure not followed.`

Cross-ref: `kzk-autonomous-boundary §Halt conditions` — the `Q-TDD-AUTO-MISSING` row is registered there.

**Skip**: explicit user "TDD 빼고" / "skip TDD" in the current session only. One-time override per session; does NOT carry forward to subsequent cycles automatically.

## Q-COV-SETUP — test framework absent (halt entry)

**Trigger**: no test framework installed or configured in the repo — detected by absence of all of: `package.json` test script, `pytest.ini` / `pyproject.toml [tool.pytest.ini_options]`, `go test` setup, or equivalent for the repo's primary language.

**Action**: halt auto-TDD enforcement + append entry to `docs/harness/user-queue.md`:
> `Q-COV-SETUP — test framework not installed/configured. auto-TDD unavailable. Resume after bootstrapping the framework.`

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
- **kzk-autonomous-boundary**: autonomous mode detection keywords / env var rules are defined in this skill's §Anti-pattern Layer b. Integrated with autonomous-boundary's halt rules (`Q-TDD-MAIN` queue entry). The auto-trigger rule for autonomous mode + code-file change is defined in this skill's `§Autonomous mode TDD enforcement`, and its halt entry (`Q-TDD-AUTO-MISSING`) is registered in `kzk-autonomous-boundary §Halt conditions` table.
