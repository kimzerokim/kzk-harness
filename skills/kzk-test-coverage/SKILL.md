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
