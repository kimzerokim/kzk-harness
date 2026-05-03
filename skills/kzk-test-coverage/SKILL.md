---
name: kzk-test-coverage
version: 1.0.4
description: "Autonomous-mode test coverage goal: 100% line + branch on changed files. Touched legacy raised too. Best-effort excuses forbidden. Required triggers: 'test coverage', 'test:cov', '100% coverage', '변경 파일 cov', 'coverage exemption'."
---

> Authoritative source: `harness-share.md` §11. On conflict, that wins.

# kzk-test-coverage

Autonomous session = 100% line + branch coverage on the files the session changed. Legacy code in those files counts too — touched = raised.

## Workflow

- Run `npm run test:cov` (or repo equivalent) before session close
- Uncovered region in a touched file → add unit / integration / e2e until covered
- Hard time constraint → append explicit user-queue entry stating which files + why; do not silently leave gaps

## Exemptions (declare in PR description)

- Boot files (`main.ts`)
- Pure type declarations (`*.d.ts`, type-only files)
- ORM entity decorator-only files (no logic)

These count as "no logic — coverage non-goal". Anything with a branch or expression must be covered.

## Anti-patterns

- "Best-effort coverage" without specific exemption call-out
- Coverage-pad tests (calling a function with no assertion) — counted as 0
- Skipping coverage for files outside the changed area — only allowed when truly untouched
- Coverage script (`test:cov`) not found → silently declaring 100%. Forbidden. Add a coverage script (e.g. `vitest run --coverage`) or queue `Q-COV-SETUP — missing coverage script`; do not declare 100% by omission.
- Coverage report generated but exit code non-zero (e.g. coverage threshold guard): counts as FAIL. Must be exit 0 AND every touched file present in the report.

## Interaction with other kzk-*

- **kzk-user-queue**: when a coverage gap is queued due to time constraint, use the entry template from that skill (`Q-COV-<FILE>` prefix).
