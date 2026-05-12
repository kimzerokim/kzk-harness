---
name: kzk-production-access
version: 1.7.0
description: "Production / external infrastructure access boundary. Default forbidden (incl. read-only). Read-only requires explicit user request; state mutation = AI authors script only, user/CI executes. Idempotency mandatory. STS (ASIA) single-use; permanent (AKIA) refused. Triggers: AWS, SSM, production DB, IaC, credential. References harness-share.md §2."
---

> Authoritative source: `harness-share.md` §2. On conflict, that wins.

# kzk-production-access

## Permission model

**(a) Read-only inspection** (`aws s3 ls`, `aws rds describe-*`, `psql -c '\dt'`): explicit user instruction required. Without instruction, read-only access is also forbidden.

**(b) State mutation** (DB schema, IAM, S3 lifecycle, Lambda env IaC-managed): even with explicit instruction, **AI must not execute directly**. AI writes script/migration/IaC only. Execution = user or CI.

## Self-check before state mutation (5 questions)

> "Does this change production state? If yes:"
>
> 1. **Is the script written?** (`migrations/` / IaC / `scripts/prod/`, git tracked)
> 2. **Is it idempotent?** (`IF NOT EXISTS` / `ON CONFLICT DO NOTHING` / `describe-*` precondition)
> 3. **Is it git-tracked?** (follows project conventions)
> 4. **Has it passed three-stage review (Plan C)?** (fresh-agent verifier Stage 3)
> 5. **Is the executor user/CI?** (AI must not execute directly)
>
> If any of the 5 is not Yes → halt + `Q-PROD-CODE-FIRST-<TOPIC>` to `docs/harness/user-queue.md`.

## Production state changes — code-first + idempotency

- **Code first**: write to `migrations/` / IaC / `scripts/prod/`, git tracked.
- **AI direct execution forbidden**: `psql ... ALTER TABLE` / `aws iam create-policy` / `aws s3api put-bucket-lifecycle-configuration` / `aws lambda update-function-configuration` (IaC-managed) — never execute directly.
- **Idempotency**: SQL `IF NOT EXISTS` / `ON CONFLICT DO NOTHING`, AWS `describe-*` precondition with conditional skip.
- **Drift → forward-only**: production state rollback forbidden. `git revert` (code) is OK — production state does not travel backwards in time. On drift detected, add a new migration reflecting current state.

## Multi-step sequence

agent proposes → user "OK" → agent executes → reports → next propose. Per step, no merging.
Destructive operations (DB drop, IAM change, force-push, ECR purge): explicit instruction sufficient. Agent executes, not refuses. State mutation = agent authors script, user runs it.

## Environment exceptions

| Category | Code-first applies? |
|---|---|
| **IaC-managed** (Terraform / CloudFormation / cdk / serverless.yml) | Yes |
| **Runtime-only** (console manual update, Secrets Manager non-auto rotation, OAuth refresh, emergency hotfix env) | Exempt |

runtime-only judgment requires explicit user statement. AI self-deciding "this is runtime-only so I can execute directly" is forbidden.

## Credential handling

| Type | Recognized by | Action |
|---|---|---|
| **Temporary STS** | `ASIA` prefix, `SessionToken` present | Allowed within expiry, explicit consent. Single-use, then forget. |
| **Permanent IAM / plaintext password** | `AKIA` prefix, no `SessionToken` | **Refuse.** Revoke + use `aws-vault` / `aws sso login`. Pasting = security incident. |

Never store in memory / notepad / wiki. Conversation ends → discard.

## Anti-patterns

- `aws s3 ls` without explicit instruction (read-only IS forbidden)
- Merging multi-step "2-4번은 같이 해도 되죠" — one OK per step
- `psql -c "ALTER TABLE ..."` direct execution — use `migrations/` + `IF NOT EXISTS`
- `aws iam create-policy` direct execution — IaC authoring required
- `INSERT INTO migrations VALUES (1, ...)` PK collision — use `ON CONFLICT DO NOTHING`
- Resolving drift via production state rollback — forward-only migration only

## Interaction with other kzk-*

- **kzk-autonomous-boundary**: autonomous mode does NOT override explicit-instruction requirement.
- **kzk-user-queue**: ambiguous scope/credential → `Q-PROD-<TOPIC>` + halt.
- **kzk-tool-retry**: retry before destructive gate OK, but re-running destructive command without new explicit instruction is forbidden.
- **kzk-pre-commit-gate**: Gate 1.6 — direct-execution shell trace grep, FAIL blocks commit.
