# Plan E — Production Code-First + 멱등성 (kzk-production-access 강화) — rev2

> Spec: `docs/plans/regression-memory-and-fix-quality-spec.md` (rev8, frozen — §Axis E + codex prompt size cap).
> Branch: `feature/memory`. Order: A → D → B → C → **E (last)**.
> Status: **Frozen** — codex CLI cycle 1 verdict REVISE 11 항목 답 통합. `kzk-spec-and-review §Cost/cadence` "1 plan = 1 round" 룰 적용 — cycle 2 skip. (`plan-E-production-code-first-critic-review.md`)
> 파일 정책: rev1 overwrite (단일 파일 유지).

## Cycle 1 verdict 인용 + rev2 답 매핑

| # | Cycle 1 진단 | rev2 반영 위치 |
|---|---|---|
| 1 | AC 빠진 항목 (SoT 재배선, read-only 경계 정의) | §Acceptance Criteria #1, #4, #11 |
| 2 | 권한 모델 충돌 (현 SKILL.md = AI 직접 실행) + Two-stage → Three-stage | §Goal · §Task 1 §Permission model rewrite · §Task 2 boilerplate, Three-stage review (Plan C) 참조 |
| 3 | Gate 1.6 grep — 직접 실행 흔적만 FAIL, 멱등성 WARN | §Task 3 grep 표 + WARN/FAIL 분리 |
| 4 | 환경 설정 예외 IaC vs runtime 이분법 | §Task 1 §Environment exceptions (IaC-managed / runtime-only) |
| 5 | Drift forward-only — production state rollback 금지 (git revert OK) | §Task 1 §Drift |
| 6 | AI access 흐름 lock — read 도 explicit 필요, write 는 explicit 있어도 AI 실행 금지 | §Task 1 §Permission model rewrite (잠금 두 줄) |
| 7 | Cross-axis B 표현 변경 — "callsite" → "impacted schema/query/ORM/API artifact" | §Task 1 §Interaction · §Task 4 §17/§2 본문 · §AC #5 |
| 8 | SoT 재배선 — `harness-share §17.X` 잘못. §2 하위 subsection. SKILL.md authoritative source 도 update | §Task 4 (§2 subsection 으로 이동) · §Task 1 frontmatter authoritative source 보강 |
| 9 | Test 전략 — Gate 1.6 fixture-based shell test 1개 추가 | §Task 5 §fixture test + §AC #9 |
| 10 | Rollback 6 → 2-3 level | §Rollback (revert + Gate 1.6 disable 2 level) |
| 12 | Trigger 좁힘 — staged path + shell diff 중심. commit-message X. §2 본문도 sync | §Task 3 trigger 정의 + §Task 4 §2 본문 patch |

(#11 skill count = 16 유지 — 변경 없음.)

## Goal

`kzk-production-access` v1.1 → v1.2 으로 업그레이드. AI 가 production state (DB schema / IAM policy / S3 lifecycle / Lambda env / CloudFront origin) 를 직접 호출 (psql `ALTER TABLE` / `aws iam create-policy` / SSM 즉시 실행) 해 마이그레이션·IaC drift 만드는 메타갭 차단.

핵심 원칙 (cycle 1 #2/#5/#6 lock):
- **Code-first**: production state 변경 = migration / IaC / shell script 로 작성. git tracked.
- **AI 직접 write 금지**: 사용자 explicit instruction 있어도 AI 가 production state mutation 직접 실행 X. AI 는 script 작성만, 실행은 사용자 또는 CI. (read-only inspection 도 explicit instruction 필요)
- **권한 모델 rewrite**: 기존 SKILL.md "explicit 지시 → AI 직접 실행" 룰을 production state mutation 한정 좁힘. read-only inspection / runtime-only 환경 설정 예외 / multi-step 배포 의 경계 정의.
- **멱등성 의무**: `IF NOT EXISTS`, `--if-not-exists`, `ON CONFLICT DO NOTHING`, conditional skip — 두 번 실행해도 안전.
- **Drift 발견 시 forward-only (state 기준)**: production state rollback 금지. 현 state 반영하는 새 migration 추가. (code commit `git revert` 는 OK — state semantics 가 기준.)
- **환경 설정 예외 (IaC vs runtime 이분법)**: IaC-managed env → code-first 적용. runtime-only (콘솔 수동 갱신, secret 회전, OAuth credential refresh) → 면제 + explicit-instruction rule 만 적용.

신규 skill 없음. 기존 skill (kzk-production-access / kzk-large-task-delegation / kzk-pre-commit-gate / harness-share) 강화만. skill count 16 유지.

## Acceptance Criteria

1. `skills/kzk-production-access/SKILL.md` v1.2 — `## Production state changes — code-first + 멱등성` 섹션 신규. **권한 모델 rewrite** 포함 (AI 직접 write 금지 / read-only도 explicit 필요 / write 는 explicit 있어도 AI 실행 X). Three-stage review (Plan C) 참조.
2. `skills/kzk-production-access/SKILL.md` §Triggers 신규 키워드: `migration`, `schema change`, `IaC`, `Terraform`, `code-first`, `멱등성`, `idempotent`, `drift`, `forward-only`.
3. `skills/kzk-production-access/SKILL.md` §Anti-patterns 에 ad-hoc 실행 패턴 3개 이상 + drift state-rollback 패턴 1개 추가.
4. `skills/kzk-production-access/SKILL.md` §Environment exceptions 섹션 신규 — IaC-managed vs runtime-only 이분법, runtime-only 예시 (env console click, secret 수동 회전, OAuth refresh).
5. `skills/kzk-production-access/SKILL.md` §Interaction 갱신 — Axis B (`kzk-fix-scope-expansion`) cross-ref ("impacted schema/query/ORM/API artifact 전수") + Axis D (`kzk-regression-memory`) cross-ref.
6. `skills/kzk-production-access/SKILL.md` 의 frontmatter authoritative source line 보강 — `harness-share.md §2` 그대로 유지 (현재 정합) + `§2.X production state changes` 명시 정정 (cycle 1 #8).
7. `skills/kzk-large-task-delegation/SKILL.md` §Production-code-first boilerplate (Plan E) 신규 — sonnet/opus dispatch prompt 의 Rules block 자동 inject. **Three-stage review** (Plan C) 와 정합.
8. `skills/kzk-pre-commit-gate/SKILL.md` Gate 1.6 신규 — staged path-based trigger (commit-message trigger X). 직접 실행 흔적 = FAIL, 멱등성 부재 = WARN. 1개 fixture-based shell test 동반.
9. `harness-share.md` **§2 하위 subsection** "§Production state changes — code-first + 멱등성" 신규 (cycle 1 #8 SoT 재배선). §17 References 는 그대로 두고 §2 가 SoT. 더불어 §2 본문의 destructive direct-execution 룰을 Plan E 와 sync (state mutation 은 code-first 의무).
10. `install/test/skill-text-checks.sh` 갱신 + 신규 fixture test (`install/test/fixtures/gate-1.6-adhoc-grep.sh`) — direct-execution diff 가 Gate 1.6 FAIL 트리거 검증.
11. `bash install/test/run-tests.sh` PASS — read-only 허용 예시 (`aws s3 ls`, `\dt`, `describe-*`) 와 금지 예시 (`ALTER TABLE`, `iam create-policy`) 둘 다 fixture 로 검증.
12. CLAUDE.md / README.md skill count 변경 없음 검증 (16 유지).
13. atomic commit 메시지: `feat(skill): kzk-production-access v1.2 — code-first + 멱등성 (Plan E rev2)`.
14. Codex CLI cycle 2 review SHIP 후 frozen 표기.

## Variables

- `SKILL_PA = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-production-access/SKILL.md`
- `SKILL_LTD = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-large-task-delegation/SKILL.md`
- `SKILL_PCG = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-pre-commit-gate/SKILL.md`
- `SHARE = /Users/kimzerokim/work/personal/kzk-harness/harness-share.md`
- `TEST_CHECKS = /Users/kimzerokim/work/personal/kzk-harness/install/test/skill-text-checks.sh`
- `TEST_FIX = /Users/kimzerokim/work/personal/kzk-harness/install/test/fixtures/gate-1.6-adhoc-grep.sh`
- `TEST_RUN = /Users/kimzerokim/work/personal/kzk-harness/install/test/run-tests.sh`

## Tasks

### Task 1 — `kzk-production-access/SKILL.md` v1.2 (cycle 1 #2/#4/#5/#6/#7/#8 답)

**Frontmatter**: `version: 1.1.0` → `version: 1.2.0`. description 끝에 trigger 추가 (`migration`, `IaC`, `멱등성`, `idempotent`, `drift`, `forward-only`, `code-first`).

Authoritative source line 정정 (현재: `harness-share.md §2` — 유지하되 본문 §2.X production state changes 추가됨을 §SKILL 본문에서 cross-ref).

**§Triggers** 끝에 추가: `migration`, `schema change`, `IaC`, `Terraform`, `CloudFormation`, `Pulumi`, `code-first`, `멱등성`, `idempotent`, `IF NOT EXISTS`, `drift`, `forward-only migration`.

**§Permission model 재작성** (cycle 1 #2/#6 답 — 기존 "AI 직접 실행" 모델을 production state mutation 한정 좁힘):

```markdown
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
```

**§Production state changes — code-first + 멱등성** (Multi-step sequence 다음):

```markdown
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
```

**§Environment exceptions — IaC-managed vs runtime-only** (cycle 1 #4):

```markdown
## Environment exceptions

| 카테고리 | 정의 | code-first 적용? |
|---|---|---|
| **IaC-managed** | env / config 가 Terraform / CloudFormation / serverless.yml / cdk 등으로 관리 | 적용 — script/IaC 변경 의무 |
| **runtime-only** | 콘솔 수동 갱신, AWS Secrets Manager 비-자동 회전, OAuth refresh token manual 발급, 일회성 env override (긴급 hotfix) | 면제 — 기존 §Permission model (a) read-only / multi-step OK 사인 흐름만 적용 |

런타임 카테고리 진입 판단은 사용자 명시 필수. AI 자기 판단으로 "이건 runtime-only 니까 직접 실행" 금지.
```

**§Anti-patterns** 끝에 추가 (cycle 1 #5/#7 답):
- Ad-hoc DB schema (`psql -c "ALTER TABLE ..."` 직접 실행) — 대신 idempotent migration.
- Ad-hoc IAM (`aws iam create-policy --policy-document '{...}'` 직접 실행) — 대신 IaC.
- Ad-hoc S3 lifecycle / Lambda env IaC-managed — 대신 IaC.
- **Drift 를 production state rollback 으로 해결** — production 은 시간 역행 X. 대신 forward-only migration. (code commit `git revert` 는 가능 — state semantics 가 기준.)
- 비-멱등 1회용 script (`INSERT INTO migrations VALUES (1, ...)` PK 충돌) — 대신 `ON CONFLICT DO NOTHING`.

**§Interaction** 갱신 (cycle 1 #7 표현 변경):
- **kzk-fix-scope-expansion** (Axis B): production state mutation 의 cross-cutting 영향 = **impacted schema / query / ORM model / API contract artifact 전수**. fix-scope-expansion hook 이 production access trigger keyword (`migration`, `schema change`, `IaC`, `Terraform`) 매칭 시 발동.
- **kzk-regression-memory** (Axis D): production change 회고 entry type=`pattern`, key=`prod-<change-slug>`. 같은 schema/path 재변경 시 recall hook 이 과거 fix inject. file_snapshot = migration 파일 path:line@SHA.
- **kzk-large-task-delegation**: production access task 의 sonnet/opus dispatch prompt Rules block 에 Production-code-first boilerplate 자동 inject (Plan A anti-self-verification boilerplate 와 동일 패턴).
- **kzk-pre-commit-gate**: Gate 1.6 (staged path-based) — direct-execution shell 흔적 grep, FAIL 시 commit halt.

### Task 2 — `kzk-large-task-delegation/SKILL.md` Production-code-first boilerplate

**§Sonnet executor — extra plan-detail requirements** 끝 (Plan A `### Anti-self-verification boilerplate` 다음 위치):

```markdown
### Production-code-first boilerplate (Plan E)

Sonnet/opus dispatch prompt 의 Rules block 에 다음 boilerplate 자동 inject (production state mutation 차단):

\`\`\`
[PRODUCTION-CODE-FIRST RULE — kzk-production-access §Production state changes (rev2)]
이 task 가 production state mutation (DB schema / IAM policy / S3 lifecycle / IaC-managed Lambda env / CloudFront 등) 을 포함한다면:
- AI 직접 실행 금지 (사용자 explicit instruction 있어도). script (migration / IaC) 작성 → 사용자 review (Three-stage review, Plan C) → 사용자/CI 실행
- read-only inspection (aws s3 ls, describe-*, \dt) 만 AI 직접 실행 OK — 단 사용자 explicit instruction 필요
- 멱등성 의무: IF NOT EXISTS / ON CONFLICT DO NOTHING / --if-not-exists
- Drift 발견 시 forward-only migration (production state rollback X. code commit git revert 는 OK)
- 환경 설정 예외 (runtime-only) 만 기존 explicit-instruction rule 적용. IaC-managed 는 code-first 의무
위반 시 task BLOCKED 반환 + plan revision 요청.
\`\`\`

**Trigger 키워드** (메인이 dispatch prompt 작성 시 자동 inject 대상):
`production`, `prod`, `migration`, `schema change`, `ALTER TABLE`, `IaC`, `Terraform`, `CloudFormation`, `IAM`, `S3 lifecycle`, `Lambda env`, `RDS`, `aws-vault`.

본 boilerplate 누락 = §Three-stage review (Plan C) FAIL.
```

### Task 3 — `kzk-pre-commit-gate/SKILL.md` Gate 1.6 (cycle 1 #3/#12 답)

**위치**: Gate 1.5 secrets scan 다음, Gate 2 build 직전 (Gate 1.6).

```markdown
## Gate 1.6 — Production code-first 검증 (Plan E rev2)

> Authoritative source: `kzk-production-access` §Production state changes (rev2). On conflict, that wins.

**Trigger 조건** (cycle 1 #12 — staged path 기반, commit-message 기반 X):
staged diff 의 추가/삭제 행 (`+`/`-`) 중 다음 패턴 발견 시 진입:
- 변경 디렉토리: `migrations/`, `infra/`, `scripts/prod/`, `terraform/`, `cloudformation/`, `cdk/`, `serverless.yml`
- 또는 staged 텍스트 라인이 shell command 형태로 production CLI 호출 흔적

doc-only fast path (commit message `docs(`/`chore(`/`style(` prefix) 와 충돌 X — staged path 가 트리거.

**검증 — FAIL 패턴 (직접 실행 흔적)**:

| 패턴 | 의미 |
|---|---|
| staged diff `+` 라인의 `psql .* (ALTER TABLE\|DROP TABLE\|CREATE INDEX)` shell-command 흔적 | DB schema ad-hoc |
| `aws iam create-policy` / `aws iam put-policy` / `aws iam attach-role-policy` shell 흔적 | IAM ad-hoc |
| `aws s3api put-bucket-(lifecycle-configuration\|policy)` shell 흔적 | S3 ad-hoc |
| `aws lambda update-function-configuration` shell 흔적 (단 IaC-managed Lambda 한정) | Lambda env ad-hoc |

heredoc / `psql -f migration.sql` 같은 script-driven 호출은 **FAIL 아님** (script 화 = 의도). 정확 매칭은 fixture-based shell test (Task 5) 가 보장.

**검증 — WARN 패턴 (멱등성 부재, cycle 1 #3)**:

| 패턴 | 처리 |
|---|---|
| 새 `*.sql` 파일이 `IF NOT EXISTS` / `IF EXISTS` / `ON CONFLICT` 키워드 부재 | WARN (commit 차단 X). 사용자 review 권고. regex 한계로 false positive 다수 — human gate. |

WARN = stderr 출력 + commit 진행. FAIL = commit halt.

**FAIL 시 동작**:
- commit halt + 사용자 출력: "Gate 1.6 — direct execution trace detected. Replace with migration / IaC."
- user-queue `Q-PROD-CODE-FIRST-<COMMIT-HASH>` 자동 append.

**Skip 조건**:
- staged path 가 production-related 디렉토리 아님
- doc-only fast path 충족 (Gate 1.6 trigger 조건과 별개로 평가)
- 사용자 explicit `[env-exception]` tag commit message body 에 명시 (runtime-only 카테고리 인정)
```

**§Interaction** 끝에 추가:
- **kzk-production-access** (Axis E): Gate 1.6 룰 본문은 kzk-production-access §Production state changes 가 SoT.

### Task 4 — `harness-share.md` SoT 재배선 (cycle 1 #8 답)

**§2 하위 신규 subsection** 추가 (위치: §2 의 `### Production / 외부 인프라 Access` 와 `### Credential Handling` 사이):

```markdown
### Production state changes — code-first + 멱등성 (Plan E rev2)

`### Production / 외부 인프라 Access` 의 destructive direct-execution 룰을 좁힌다 — production **state mutation** 한정.

- **코드 우선**: migration / IaC / shell script. git tracked.
- **AI 직접 호출 금지** (state mutation): explicit instruction 있어도 AI 실행 X. script 작성 → 사용자 review → 사용자/CI 실행.
- **read-only inspection** (`aws s3 ls`, `describe-*`, `\dt`) 도 explicit instruction 필요 — instruction 있으면 AI 직접 실행 OK.
- **멱등성 의무**: `IF NOT EXISTS` / `--if-not-exists` / `ON CONFLICT DO NOTHING`.
- **Drift forward-only (state 기준)**: production state rollback 금지. code commit `git revert` 는 OK.
- **Environment exceptions**: IaC-managed env → code-first. runtime-only (콘솔 수동 갱신, secret 회전, OAuth refresh) → 기존 §Production / 외부 인프라 Access 룰만 적용.

**룰 SoT**: `kzk-production-access` §Production state changes.

**Cross-axis**:
- **Axis B** (`kzk-fix-scope-expansion`): production state mutation 의 impacted schema / query / ORM model / API contract artifact 전수.
- **Axis D** (`kzk-regression-memory`): production change 회고 entry key=`prod-<change-slug>`, recall hook 매칭.

**Enforcement**:
- (a) `kzk-large-task-delegation` §Production-code-first boilerplate (Plan E) — sonnet/opus dispatch Rules block 자동 inject.
- (b) `kzk-pre-commit-gate` Gate 1.6 — staged path 기반 trigger, direct-execution 흔적 FAIL / 멱등성 WARN.
```

**§2 본문 sync (cycle 1 #12 답)**: 기존 `### Production / 외부 인프라 Access` 의 "destructive 작업 (DB drop, ...) 포함 — 사용자 명시는 허락 + 실행 의무 둘 다. AI 가 명령어 직접 실행" 문장에 포인터 추가:

> *Plan E rev2 (state mutation)*: 위 직접 실행 의무는 read-only inspection / runtime-only 환경 설정 / multi-step 배포 의 step 실행에 한정. **production state mutation (DB schema, IaC-managed config 등) 은 §Production state changes 의 code-first 룰이 우선**.

§17 References 는 변경 없음 (cycle 1 #8 — §17 은 references 섹션이지 production access 본문 아님).

### Task 5 — `install/test/skill-text-checks.sh` 갱신 + fixture test (cycle 1 #9 답)

**(a) `skill-text-checks.sh` 확장** — Plan A 가 만든 파일의 누적 결과 직전에 Plan E grep 항목 추가 (rev1 의 grep 목록 유지 + rev2 추가 정정):

```bash
# Plan E rev2 — kzk-production-access v1.2 grep
PA="$REPO_ROOT/skills/kzk-production-access/SKILL.md"
LTD_E="$REPO_ROOT/skills/kzk-large-task-delegation/SKILL.md"
PCG="$REPO_ROOT/skills/kzk-pre-commit-gate/SKILL.md"
SHARE_E="$REPO_ROOT/harness-share.md"

assert_grep "PA v1.2"         "version: 1.2.0"               "$PA"
assert_grep "PA permission rewrite" "Permission model (rev2 — Plan E)" "$PA"
assert_grep "PA AI direct write 금지" "AI 직접 실행 금지" "$PA"
assert_grep "PA Three-stage review 참조" "Three-stage review" "$PA"
assert_grep "PA env exceptions IaC vs runtime" "IaC-managed" "$PA"
assert_grep "PA env exceptions runtime-only" "runtime-only" "$PA"
assert_grep "PA drift state semantics" "state semantics" "$PA"
assert_grep "PA Axis B impacted artifact" "impacted schema" "$PA"
assert_grep "PA trigger migration" "migration" "$PA"

assert_grep "LTD Production-code-first boilerplate" "Production-code-first boilerplate" "$LTD_E"
assert_grep "LTD PRODUCTION-CODE-FIRST RULE 본문" "PRODUCTION-CODE-FIRST RULE" "$LTD_E"
assert_grep "LTD Three-stage review 참조" "Three-stage review" "$LTD_E"

assert_grep "PCG Gate 1.6 헤더" "Gate 1.6" "$PCG"
assert_grep "PCG staged path trigger" "staged path" "$PCG"
assert_grep "PCG WARN/FAIL 분리" "FAIL 아님" "$PCG"
assert_grep "PCG kzk-production-access cross-ref" "kzk-production-access" "$PCG"

assert_grep "SHARE §2 신규 subsection" "Production state changes — code-first" "$SHARE_E"
assert_grep "SHARE Axis B impacted artifact" "impacted schema" "$SHARE_E"
assert_grep "SHARE Axis D regression-memory" "kzk-regression-memory" "$SHARE_E"
assert_grep "SHARE §2 sync 포인터" "Plan E rev2 (state mutation)" "$SHARE_E"
```

**(b) Fixture-based shell test** `install/test/fixtures/gate-1.6-adhoc-grep.sh` 신규:

```bash
#!/usr/bin/env bash
# Gate 1.6 fixture test — direct-execution diff vs script-driven diff 분리 검증
set -euo pipefail
PASS=0; FAIL=0

# (1) FAIL fixture — staged diff 에 직접 실행 흔적
DIFF_FAIL=$'+aws iam create-policy --policy-name foo --policy-document \'{...}\''
echo "$DIFF_FAIL" | grep -E '(aws iam create-policy|aws iam put-policy|aws s3api put-bucket-(lifecycle-configuration|policy)|aws lambda update-function-configuration|psql .+ ALTER TABLE|psql .+ DROP TABLE|psql .+ CREATE INDEX)' >/dev/null \
  && { echo "[fixture] FAIL pattern matched (expected)"; PASS=$((PASS+1)); } \
  || { echo "[fixture] FAIL pattern miss (BUG)"; FAIL=$((FAIL+1)); }

# (2) PASS fixture — script-driven (psql -f migration.sql)
DIFF_PASS=$'+psql -h prod -U app -f migrations/20260504-add-users-xyz.sql'
echo "$DIFF_PASS" | grep -E '(aws iam create-policy|aws iam put-policy|aws s3api put-bucket-(lifecycle-configuration|policy)|aws lambda update-function-configuration|psql .+ ALTER TABLE|psql .+ DROP TABLE|psql .+ CREATE INDEX)' >/dev/null \
  && { echo "[fixture] PASS pattern false-positive (BUG)"; FAIL=$((FAIL+1)); } \
  || { echo "[fixture] PASS pattern correctly skipped"; PASS=$((PASS+1)); }

# (3) READ-ONLY 허용 fixture
DIFF_READ=$'+aws s3 ls s3://prod-logs/'
echo "$DIFF_READ" | grep -E '(aws iam create-policy|aws iam put-policy|aws s3api put-|aws lambda update-function-configuration|psql .+ ALTER TABLE|psql .+ DROP TABLE|psql .+ CREATE INDEX)' >/dev/null \
  && { echo "[fixture] READ false-positive (BUG)"; FAIL=$((FAIL+1)); } \
  || { echo "[fixture] READ correctly allowed"; PASS=$((PASS+1)); }

echo "[Gate 1.6 fixture] PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
```

`run-tests.sh` 가 fixture 도 호출하도록 추가 1줄 (`bash $REPO_ROOT/install/test/fixtures/gate-1.6-adhoc-grep.sh`).

### Task 6 — atomic commit

`kzk-pre-commit-gate` Gate 0–4 통과:
- Gate 0 — AGENTS.md sync (skill SKILL.md 변경, 신규 skill 아님 → skill list 그대로)
- Gate 1 / 1.5 — ai-slop / secrets
- **Gate 1.6 (자기 검증)** — staged path = `skills/`, `harness-share.md`, `install/test/` (production-related 디렉토리 아님) → trigger 조건 미충족 → skip
- Gate 2 / 3 — markdown / shell (build n/a, test PASS)
- Gate 4 — n/a (non-UI)

commit message:
```
feat(skill): kzk-production-access v1.2 — code-first + 멱등성 (Plan E rev2)

- Permission model rewrite: state mutation = AI 직접 실행 금지 (read-only / runtime-only 만 explicit-instruction rule).
- Drift forward-only는 state semantics 기준 (code commit git revert OK).
- Environment exceptions = IaC-managed vs runtime-only 이분법.
- Cross-axis B = impacted schema/query/ORM/API artifact 전수 (callsite 표현 폐기).
- SoT = harness-share §2 하위 subsection (§17 잘못 → §2 재배선).
- Gate 1.6 = staged-path trigger, direct-execution FAIL / 멱등성 WARN, fixture test 동반.

Spec: docs/plans/regression-memory-and-fix-quality-spec.md (rev7 §Axis E).
Plan: docs/plans/plan-E-production-code-first.md (rev2, codex cycle 2 SHIP 후 frozen).
Order: A → D → B → C → E (마지막).
```

## Test 전략 (cycle 1 #9 답)

- `skill-text-checks.sh` = 룰 *기록* 검증 only.
- **Gate 1.6 fixture-based shell test 추가** — direct-execution 흔적 vs script-driven 흔적 vs read-only 흔적 3 fixture 로 grep 동작 검증. (cycle 1 #9 핵심.)
- behavioral test (실제 sonnet/opus dispatch 시 boilerplate 작동) 은 spec Non-goals — 다음 자율 cycle manual.
- 멱등성 WARN regex 는 false-positive/negative 위험 인정 — human gate.
- Cross-axis (Axis B/D) 통합 검증은 Plan B/D 완성 후만 가능. Plan E 는 cross-ref 만 기록.

## Rollback (cycle 1 #10 — 2 level 압축)

| Level | 메커니즘 |
|---|---|
| Plan E 단일 revert | `git revert <Plan-E-commit-sha>` — kzk-production-access v1.2→v1.1 + LTD boilerplate 제거 + PCG Gate 1.6 제거 + harness-share §2 subsection 제거 + skill-text-checks 항목 + fixture 모두 한 commit 복원 |
| Gate 1.6 만 비활성 | kzk-pre-commit-gate Gate 1.6 섹션 수동 주석 처리 — 보일러플레이트 / SKILL 본문은 살아 있음 |

## Out of scope

- Plan B 본체 (`kzk-fix-scope-expansion` hook). Plan E 는 cross-ref 만 기록.
- Plan D 본체 (`kzk-regression-memory` recall hook). Plan E 는 cross-ref 만 기록.
- Plan C 본체 (Three-stage review fresh-agent verifier). Plan E 는 참조만.
- Behavioral test (sonnet/opus dispatch 시뮬레이션) — spec Non-goals.
- 신규 lib `install/lib/prod-access-check.mjs` — codex review 필요 판단 시 follow-up plan.
- 자동 IaC drift 탐지 (terraform plan CI 통합) — 인프라 종류별 → out of scope.
- Production access 종류별 template script — 프로젝트 컨벤션 별 → out of scope.

## Codex review (cycle 2)

본 plan rev2 는 codex CLI cycle 2 consult → SHIP 시 frozen 표기. cycle 2 codex prompt 중점 검토 항목:

1. Permission model rewrite 의 read-only / state mutation 경계 — runtime-only 카테고리 escape hatch 가 너무 넓지 않은가
2. Gate 1.6 staged-path trigger 가 commit-message trigger 회피로 문서 commit false-positive 차단 — 누수 없는가
3. SoT 재배선 (§17 → §2 subsection) 후 SKILL.md authoritative source line 정합 (현 line `harness-share.md §2` 유지로 충분한가)
4. Drift forward-only (state semantics) — code commit `git revert` 와 production state rollback 의 경계가 enforcement layer (Gate 1.6) 에서 어떻게 검증되는가 (현 plan 은 grep 만)
5. Plan A boilerplate (anti-self-verification) + Plan E boilerplate (production-code-first) 동시 trigger 시 dispatch prompt 비대화 — Three-stage review (Plan C) 와 정합 검증
6. Cross-axis 통합 timing — Plan E 가 마지막 commit, Plan B/D 가 먼저 land 됨을 가정. cross-ref dead link 방지 boundary
