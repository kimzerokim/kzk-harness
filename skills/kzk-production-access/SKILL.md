---
name: kzk-production-access
version: 1.5.0
description: "Production and external infrastructure access boundary — make sure to use this skill whenever the user mentions AWS, SSM, production DB, migration, IaC (Terraform / CloudFormation / Pulumi), schema change, or credential handling. Default is forbidden including read-only. Two permission categories: (a) read-only inspection requires explicit user instruction; (b) state mutation (DB schema, IAM, S3, Lambda env) — AI authors script only, user or CI executes. Idempotency mandatory on all production scripts (IF NOT EXISTS, ON CONFLICT DO NOTHING, describe-* conditional). Drift resolution = forward-only migration, never production state rollback. STS credentials (ASIA prefix) single-use only; permanent IAM keys (AKIA prefix) refuse + advise revocation. References harness-share.md §2."
---

> Authoritative source: `harness-share.md` §2. On conflict, that wins.

# kzk-production-access

## Permission model

**(a) Read-only inspection** (`aws s3 ls`, `aws rds describe-*`, `psql -c '\dt'`): explicit user instruction 필수. instruction 없으면 read-only도 금지.

**(b) State mutation** (DB schema, IAM, S3 lifecycle, Lambda env IaC-managed): explicit instruction 있어도 **AI 직접 실행 금지**. AI는 script/migration/IaC 작성만. 실행 = 사용자 또는 CI.

## 자가 점검 (state mutation 직전 — 5 questions)

> "이 변경이 production state를 바꾸는가? Yes면:"
>
> 1. **Script 작성됐는가?** (`migrations/` / IaC / `scripts/prod/`, git tracked)
> 2. **멱등성인가?** (`IF NOT EXISTS` / `ON CONFLICT DO NOTHING` / `describe-*` 선행)
> 3. **git tracked인가?** (프로젝트 컨벤션 따름)
> 4. **Three-stage review (Plan C) 거쳤는가?** (fresh-agent verifier Stage 3)
> 5. **실행 주체가 사용자/CI인가?** (AI 직접 실행 X)
>
> 5개 모두 Yes가 아니면 halt + `Q-PROD-CODE-FIRST-<TOPIC>` to `docs/harness/user-queue.md`.

## Production state changes — code-first + 멱등성

- **코드 우선**: `migrations/` / IaC / `scripts/prod/` 로 작성, git tracked.
- **AI 직접 호출 금지**: `psql ... ALTER TABLE` / `aws iam create-policy` / `aws s3api put-bucket-lifecycle-configuration` / `aws lambda update-function-configuration` (IaC-managed) 즉시 실행 X.
- **멱등성**: SQL `IF NOT EXISTS` / `ON CONFLICT DO NOTHING`, AWS `describe-*` 선행 conditional skip.
- **Drift → forward-only**: production state rollback 금지. `git revert` (code) 는 OK — production state는 시간 역행 X. drift 발견 시 현 state 반영하는 새 migration 추가.

## Multi-step sequence

agent proposes → user "OK" → agent executes → reports → next propose. Per step, no merging.
Destructive operations (DB drop, IAM change, force-push, ECR purge): explicit instruction sufficient. Agent executes, not refuses. State mutation = agent authors script, user runs it.

## Environment exceptions

| 카테고리 | code-first 적용? |
|---|---|
| **IaC-managed** (Terraform / CloudFormation / cdk / serverless.yml) | 적용 |
| **runtime-only** (콘솔 수동 갱신, Secrets Manager 비-자동 회전, OAuth refresh, 긴급 hotfix env) | 면제 |

runtime-only 판단 = 사용자 명시 필수. AI 자기 판단 "runtime-only니까 직접 실행" 금지.

## Credential handling

| Type | Recognize by | Action |
|---|---|---|
| **Temporary STS** | `ASIA` prefix, `SessionToken` present | Allowed within expiry, explicit consent. Single-use, then forget. |
| **Permanent IAM / plaintext password** | `AKIA` prefix, no `SessionToken` | **Refuse.** Revoke + use `aws-vault` / `aws sso login`. Pasting = security incident. |

Never store in memory / notepad / wiki. Conversation ends → discard.

## Anti-patterns

- `aws s3 ls` without explicit instruction (read-only IS forbidden)
- Merging multi-step "2-4번은 같이 해도 되죠" — one OK per step
- `psql -c "ALTER TABLE ..."` 직접 실행 — `migrations/` + `IF NOT EXISTS`
- `aws iam create-policy` 직접 실행 — IaC 작성 의무
- `INSERT INTO migrations VALUES (1, ...)` PK 충돌 — `ON CONFLICT DO NOTHING`
- Drift를 production state rollback으로 해결 — forward-only migration

## Interaction with other kzk-*

- **kzk-autonomous-boundary**: autonomous mode does NOT override explicit-instruction requirement.
- **kzk-user-queue**: ambiguous scope/credential → `Q-PROD-<TOPIC>` + halt.
- **kzk-tool-retry**: retry before destructive gate OK, but re-running destructive command without new explicit instruction is forbidden.
- **kzk-pre-commit-gate**: Gate 1.6 — direct-execution shell 흔적 grep, FAIL 시 commit halt.
