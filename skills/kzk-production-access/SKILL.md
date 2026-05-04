---
name: kzk-production-access
version: 1.1.0
description: "Production/external-infra access boundary + credential-handling — explicit-instruction rule, destructive-op guardrails, AWS STS triage. Top triggers: 'AWS', 'SSM', 'production', 'aws-vault', 'credential'. Body §Triggers for full list."
---

> Authoritative source: `harness-share.md` §2. On conflict, that wins.

# kzk-production-access

## Triggers

`AWS`, `AWS 접속`, `SSM`, `SSM Session Manager`, `production`, `destructive`, `DB drop`, `snapshot`, `credential`, `ASIA prefix`, `AKIA prefix`, `aws-vault`.

Default = forbidden. Read-only included.

## Permission model

The agent may touch production / external infra only when the user issues an **explicit instruction** containing the target. Examples that count:

- "AWS에 접속해서 X 진행해"
- "이 자격증명으로 production Y 변경"
- "ECR 에 image push 해줘"

Explicit = both **permission** AND **execution mandate**. The agent runs the commands directly. The user must NOT have to SSH and type by hand. If the user says "do X on prod", do X.

Permission scope = the named task or multi-step sequence, until completion. After completion, new explicit instruction required to do anything else.

## Multi-step sequence (cutover, migration, etc.)

Pattern: agent proposes step → user "OK" → agent executes → agent reports → next propose. Per step.

Forbidden: skipping / merging steps on agent's own judgment. Each step needs its own user OK.

Destructive operations (DB drop, snapshot delete, IAM change, file delete, force-push, ECR image purge) are included in this protocol — they are NOT a separate harder gate. Explicit instruction is sufficient. The agent must execute them, not refuse.

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

## Interaction with other kzk-*

- **kzk-autonomous-boundary**: this skill specializes the production-access permission model within the autonomous-mode contract defined there. Autonomous mode does NOT override the explicit-instruction requirement for production access.
- **kzk-user-queue**: when production access is ambiguous (scope unclear, credential type unclear), append `Q-PROD-<TOPIC>` entry and halt. Do not proceed with guessed credentials.
- **kzk-tool-retry**: Bash retry policy applies before destructive operation gates — but retrying a destructive command without new user explicit instruction is forbidden, regardless of retry count.
