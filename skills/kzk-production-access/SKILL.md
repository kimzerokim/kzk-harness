---
name: kzk-production-access
version: 1.2.0
description: "Production/external-infra access boundary + credential-handling — explicit-instruction rule, destructive-op guardrails, AWS STS triage, code-first production state mutation, 멱등성 의무. Top triggers: 'AWS', 'SSM', 'production', 'aws-vault', 'credential', 'migration', 'IaC', 'schema change', 'code-first', '멱등성', 'idempotent', 'drift', 'forward-only'. Body §Triggers for full list."
---

> Authoritative source: `harness-share.md` §2 (and §2 하위 subsection `§Production state changes — code-first + 멱등성`). On conflict, that wins.

# kzk-production-access

## Triggers

`AWS`, `AWS 접속`, `SSM`, `SSM Session Manager`, `production`, `destructive`, `DB drop`, `snapshot`, `credential`, `ASIA prefix`, `AKIA prefix`, `aws-vault`, `migration`, `schema change`, `IaC`, `Terraform`, `CloudFormation`, `Pulumi`, `code-first`, `멱등성`, `idempotent`, `IF NOT EXISTS`, `drift`, `forward-only migration`.

Default = forbidden. Read-only included.

## Permission model (rev2 — Plan E)

Production access 는 두 카테고리.

**(a) Read-only inspection** (예: `aws s3 ls`, `aws rds describe-*`, `psql -c '\dt'`, `\d users`):
- 사용자 explicit instruction 필수 (default 금지 그대로). instruction 없이 read-only 호출 X.
- explicit instruction 있으면 AI 직접 실행 OK.

**(b) State mutation** (DB schema, IAM, S3 lifecycle, Lambda env IaC-managed, CloudFront origin 등):
- 사용자 explicit instruction 있어도 **AI 직접 실행 금지**.
- AI 는 migration / IaC / shell script 작성만. 실행은 사용자 또는 CI.
- 예외 = §Environment exceptions (runtime-only) 의 항목만.

기존 SKILL.md (v1.1) 의 "explicit = permission AND execution mandate" 룰은 (a) read-only 와 multi-step 배포 propose/OK/execute 흐름에만 적용. (b) state mutation 은 AI execution mandate 제거.

Three-stage review (Plan C — fresh-agent verifier Stage 3) 통합: production state mutation script 는 Stage 3 fresh agent 가 검토 후 사용자 review.

## Multi-step sequence (cutover, migration, etc.)

Pattern: agent proposes step → user "OK" → agent executes → agent reports → next propose. Per step.

Forbidden: skipping / merging steps on agent's own judgment. Each step needs its own user OK.

Destructive operations (DB drop, snapshot delete, IAM change, file delete, force-push, ECR image purge) are included in this protocol — they are NOT a separate harder gate. Explicit instruction is sufficient. The agent must execute them, not refuse.

**Note**: For state mutation (§Permission model (b)), the "execute" step means the agent authors a script/migration/IaC and the user executes it. Not AI direct execution.

## Production state changes — code-first + 멱등성

1. **코드 우선**: migration (`migrations/`) / IaC (Terraform / CloudFormation / Pulumi) / shell script (`scripts/prod/`) 로 작성. git tracked. 프로젝트 컨벤션 따름.
2. **AI 직접 호출 금지** (state mutation): `psql ... ALTER TABLE` / `aws iam create-policy` / `aws s3api put-bucket-lifecycle-configuration` / `aws lambda update-function-configuration` (IaC-managed Lambda) 즉시 실행 X.
3. **멱등성 의무**: SQL `CREATE/ALTER ... IF NOT EXISTS` / `INSERT ... ON CONFLICT DO NOTHING`, AWS CLI `--if-not-exists` 또는 `describe-*` 선행 conditional skip, Terraform plan idempotent 확인.
4. **AI access 흐름 lock**:
   - read-only inspection 도 explicit instruction 필요 (cycle 1 #6).
   - write/state mutation 은 explicit instruction 있어도 AI 실행 X — script 작성 → 사용자 review/승인 → 사용자 또는 CI 실행 (cycle 1 #6).
5. **Drift 발견 시 forward-only (state 기준)**: production state rollback 금지. code commit `git revert` 는 OK — state semantics 기준 (cycle 1 #5). 누가 production 에서 직접 schema 변경 → drift 발견 시 → 현 state 반영하는 새 migration 추가 (idempotent). 기존 코드 revert 가능하지만 production 은 "시간 역행" X.

### 자가 점검 (state mutation 직전)

> "이 변경이 production state 를 바꾸는가? Yes 면 — script 작성됐는가? script 가 멱등성인가? git tracked 인가? Three-stage review (Plan C) 거쳤는가? 실행 주체가 사용자/CI 인가?"
> 5개 모두 Yes 가 아니면 halt + user-queue entry `Q-PROD-CODE-FIRST-<TOPIC>`.

## Environment exceptions

| 카테고리 | 정의 | code-first 적용? |
|---|---|---|
| **IaC-managed** | env / config 가 Terraform / CloudFormation / serverless.yml / cdk 등으로 관리 | 적용 — script/IaC 변경 의무 |
| **runtime-only** | 콘솔 수동 갱신, AWS Secrets Manager 비-자동 회전, OAuth refresh token manual 발급, 일회성 env override (긴급 hotfix) | 면제 — 기존 §Permission model (a) read-only / multi-step OK 사인 흐름만 적용 |

런타임 카테고리 진입 판단은 사용자 명시 필수. AI 자기 판단으로 "이건 runtime-only 니까 직접 실행" 금지.

## Credential handling

User pasted infra credentials (AWS / GCP / DB / SSH / API key) into chat:

| Type | Recognize by | Action |
|---|---|---|
| **Temporary STS** | `Expiration` field present, `AccessKeyId` starts with `ASIA`, `SessionToken` accompanies | Allowed within expiry window with explicit user consent. After single use, forget; reuse requires fresh user instruction |
| **Permanent IAM / plaintext DB password** | `AccessKeyId` starts with `AKIA`, no `SessionToken`; or plaintext password text in chat | **Refuse to use.** Tell user: revoke + use `aws-vault exec` / `aws sso login` / 1Password CLI / equivalent. Pasting permanent credentials in chat is itself a security incident |

Both cases: never store in memory / metadata / notepad / wiki. Conversation ends → discard.

## Anti-patterns

- "I'll just `aws s3 ls` to check" without explicit user instruction — read-only IS forbidden
- Multi-step shortcut: "I'll do steps 2-4 since they're related" — one OK per step
- Storing STS keys for later — single-use only
- Bypass dev-token / backdoor when MCP drops — see `harness-share.md` §19 (escalate to user, do not bypass)
- **Ad-hoc DB schema**: `psql -c "ALTER TABLE ..."` 직접 실행 — 대신 idempotent migration (`migrations/` 파일, `IF NOT EXISTS`).
- **Ad-hoc IAM**: `aws iam create-policy --policy-document '{...}'` 직접 실행 — 대신 IaC (Terraform / CloudFormation).
- **Ad-hoc S3 lifecycle / Lambda env IaC-managed**: `aws s3api put-bucket-lifecycle-configuration` / `aws lambda update-function-configuration` 직접 실행 — 대신 IaC.
- **Drift 를 production state rollback 으로 해결**: production 은 시간 역행 X. 대신 forward-only migration. (code commit `git revert` 는 가능 — state semantics 가 기준.)
- **비-멱등 1회용 script**: `INSERT INTO migrations VALUES (1, ...)` PK 충돌 — 대신 `ON CONFLICT DO NOTHING`.

## Interaction with other kzk-*

- **kzk-autonomous-boundary**: this skill specializes the production-access permission model within the autonomous-mode contract defined there. Autonomous mode does NOT override the explicit-instruction requirement for production access.
- **kzk-user-queue**: when production access is ambiguous (scope unclear, credential type unclear), append `Q-PROD-<TOPIC>` entry and halt. Do not proceed with guessed credentials.
- **kzk-tool-retry**: Bash retry policy applies before destructive operation gates — but retrying a destructive command without new user explicit instruction is forbidden, regardless of retry count.
- **kzk-fix-scope-expansion** (Axis B): production state mutation 의 cross-cutting 영향 = **impacted schema / query / ORM model / API contract artifact 전수**. fix-scope-expansion hook 이 production access trigger keyword (`migration`, `schema change`, `IaC`, `Terraform`) 매칭 시 발동.
- **kzk-regression-memory** (Axis D): production change 회고 entry type=`pattern`, key=`prod-<change-slug>`. 같은 schema/path 재변경 시 recall hook 이 과거 fix inject. file_snapshot = migration 파일 path:line@SHA.
- **kzk-large-task-delegation**: production access task 의 sonnet/opus dispatch prompt Rules block 에 Production-code-first boilerplate 자동 inject (Plan A anti-self-verification boilerplate 와 동일 패턴).
- **kzk-pre-commit-gate**: Gate 1.6 (staged path-based) — direct-execution shell 흔적 grep, FAIL 시 commit halt.
