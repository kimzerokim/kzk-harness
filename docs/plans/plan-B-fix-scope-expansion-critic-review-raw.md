OpenAI Codex v0.120.0 (research preview)
--------
workdir: /Users/kimzerokim/work/personal/kzk-harness
model: gpt-5.4
provider: openai
approval: never
sandbox: read-only
reasoning effort: high
reasoning summaries: none
session id: 019df2c2-ef88-70d2-b078-61f47c0a34a9
--------
user
Plan B draft (rev1, 1167 LoC, 14 tasks) 검토. brutally honest, 한국어, no compliments.

## Read 의무

`/Users/kimzerokim/work/personal/kzk-harness/docs/plans/regression-memory-and-fix-quality-spec.md` (spec rev7, frozen)
`/Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-B-fix-scope-expansion.md` (rev1)
`/Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-D-regression-memory.md` (consumer 관계 — recall hook 다음 슬롯)
`/Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-A-tdd-self-verification-block.md` (format reference)

## Context

Plan B = `kzk-fix-scope-expansion` 신규 skill (16th) + fix-start hook (UserPromptSubmit, D 의 recall hook 다음 슬롯) + Gate 4.5 (callsite vs git diff sanity) + cross-skill 변경 5개. ~1167 LoC plan markdown.

## LOCKED PRIOR DECISIONS (재질문 금지)

- Plan B = D 의 consumer (recall hook 다음 슬롯)
- Default DISABLED at B commit, 자동 enable on main 머지 via kzk-pre-merge-sync
- 자율 mode 판별: KZK_AUTONOMOUS=1 우선, env unset 시 동사구만, 명사 단독 금지
- Backend = `/learn` + sidecar 7필드 (D 가 정의)
- Hook deployment: append + dependency
- gstack 미설치 silent skip 금지 (B 는 CRG 의존, gstack 의존 X)

## YOUR JOB — 12 카테고리

1. **spec rev7 Axis B acceptance cover?** — 모든 Axis B acceptance 가 Plan B task 1-14 에 매핑?
2. **D 와 consumer 관계 명확?** — fix-start hook 이 recall hook 다음 슬롯 발동, 결과 합쳐 inject. drift-prevention import (FIX_KEYWORDS, SELF_IMPROVE_VERBPHRASES, shouldSkip, detectFixIntent) 정확?
3. **CRG status oracle** — Plan B 가 CRG 의존 강한데, status oracle 룰 (Step 0.5) 적용? 미설치 fallback grep 명확?
4. **Cache atomicity** — `.kzk-harness/fix-scope-cache.json` 의 atomic write 가 D 의 sidecar-write.mjs 재사용? race 차단?
5. **Gate 4.5 sanity** — callsite vs git diff 매칭. fix-scope-skip escape 룰 명확? 자율 mode `Q-GATE-4.5-FAIL` halt?
6. **Default DISABLED + 자동 enable** — `--fix-scope-trigger` flag, `--regression-recall` sibling, fail-closed?
7. **Fix-verify hook** — PostToolUse hook? install-global.sh 가 미지원 — manual self-check 룰 명확?
8. **Test 전략** — fix-scope-trigger.test.mjs 의 mock prompt → expected grep 동작 + 한계 명시?
9. **Cross-skill 영향** — kzk-codebase-survey, kzk-pre-commit-gate, kzk-regression-memory, kzk-large-task-delegation 변경 silent breakage 위험?
10. **Rollback 5-7 level** — 충실?
11. **Skill count 동기화 (15→16)** — 4 sync points?
12. **놓친 함정** — Plan B 단계에서 spec 단계 흡수 안 된 회색지대.

각 항목: 짧은 진단 + 구체 권고. fine 이면 "none". 마지막 줄 반드시 "Bottom-line: SHIP" 또는 "REVISE".

700단어 이내.

codex
검토 기준을 고정한 뒤 문서 4개를 직접 읽고, Plan B의 14개 태스크가 spec rev7 Axis B와 D consumer 제약을 실제로 덮는지부터 대조하겠습니다.
exec
/bin/zsh -lc 'wc -l docs/plans/regression-memory-and-fix-quality-spec.md docs/plans/plan-B-fix-scope-expansion.md docs/plans/plan-D-regression-memory.md docs/plans/plan-A-tdd-self-verification-block.md' in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
     289 docs/plans/regression-memory-and-fix-quality-spec.md
    1167 docs/plans/plan-B-fix-scope-expansion.md
    1448 docs/plans/plan-D-regression-memory.md
     309 docs/plans/plan-A-tdd-self-verification-block.md
    3213 total

exec
/bin/zsh -lc 'rg -n "''^#|''^##|''^###|Axis B|acceptance|Task [0-9]+|Gate 4'"\\.5|fix-start|fix-verify|fix-scope|regression-recall|skill count|15|16|rollback|Step 0\\.5|CRG|oracle|grep|atomic|sidecar|UserPromptSubmit|recall hook|FIX_KEYWORDS|SELF_IMPROVE_VERBPHRASES|shouldSkip|detectFixIntent\" docs/plans/regression-memory-and-fix-quality-spec.md docs/plans/plan-B-fix-scope-expansion.md docs/plans/plan-D-regression-memory.md docs/plans/plan-A-tdd-self-verification-block.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
docs/plans/regression-memory-and-fix-quality-spec.md:1:# Spec — Regression Memory + Fix Quality + Production-Code-First 통합 (rev7)
docs/plans/regression-memory-and-fix-quality-spec.md:11:## Problem
docs/plans/regression-memory-and-fix-quality-spec.md:21:## Locked decisions (rev3)
docs/plans/regression-memory-and-fix-quality-spec.md:25:| Regression backend = gstack `/learn` 기본 schema **+ sidecar** `.kzk-harness/regression-meta.jsonl` (metadata extension with own SoT for dismiss state — derived view 아님) | hypothesis H1, cycle 3 #1 — sidecar 의 dismiss_count 는 사용자 액션 source, /learn 에서 재구성 불가. sidecar 도 git tracked. |
docs/plans/regression-memory-and-fix-quality-spec.md:27:| sidecar 만 사용하는 필드 (7필드): `key` (FK), `dismiss_count`, `last_dismissed_at`, `file_snapshot` (file:line@SHA), `related_cycles`, `archived`, `stale` (Plan D rev2 와 sync — stale flag in-disk persistence) | cycle 1 blind spots, cycle 2 #5, Plan D codex cycle 1 #1/#12 |
docs/plans/regression-memory-and-fix-quality-spec.md:28:| Recall 룰 = `/learn search` keyword + sidecar dismiss_count + decay (`confidence * 0.85^dismiss`) | cycle 1 §H3 + cycle 2 #5 |
docs/plans/regression-memory-and-fix-quality-spec.md:30:| Hook deployment = `install-global.sh enable_hooks()` 의 같은 settings.json `UserPromptSubmit` 배열에 append (dispatcher 통합 비추). **`--regression-recall` flag 호출 시 keyword-detector 도 자동 enable (explicit dependency)** | cycle 2 #4 + cycle 3 #4 — keyword-detector 누락 silent breakage 차단 |
docs/plans/regression-memory-and-fix-quality-spec.md:31:| Plan D hook = **default DISABLED at D commit**, **자동 enable on main 머지** (`kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 호출) | cycle 2 #1 + cycle 3 #2 — B cycle 자가오염 차단 + first-enable 망각 방지. 사용자가 머지 단계 거치면 자동 활성. |
docs/plans/regression-memory-and-fix-quality-spec.md:32:| D hook 자가-skip guard: 자가개선 cycle 의 메인 prompt 면 inject 안 함 (system prompt 의 self-improvement marker grep) | cycle 2 #1 |
docs/plans/regression-memory-and-fix-quality-spec.md:35:| Axis B fix-during 제거 → fix-start + fix-verify + Gate 4.5 만 | cycle 1 §3 |
docs/plans/regression-memory-and-fix-quality-spec.md:42:## Non-goals
docs/plans/regression-memory-and-fix-quality-spec.md:52:## 4 Axis (요약)
docs/plans/regression-memory-and-fix-quality-spec.md:54:### Axis A — TDD 자기검증 차단
docs/plans/regression-memory-and-fix-quality-spec.md:63:- spec / acceptance criteria / 사용자 prompt 만 read 허용
docs/plans/regression-memory-and-fix-quality-spec.md:67:- hook/install 인프라 코드 (예: regression-recall.mjs) read 는 항상 허용 (TDD red 가 아닌 디버깅 목적)
docs/plans/regression-memory-and-fix-quality-spec.md:80:### Axis D — Regression memory
docs/plans/regression-memory-and-fix-quality-spec.md:82:신규 skill `kzk-regression-memory` + `install/hooks/regression-recall.mjs` + `install/scripts/regression-stale-check.sh`.
docs/plans/regression-memory-and-fix-quality-spec.md:94:sidecar (project-local, .kzk-harness/regression-meta.jsonl):
docs/plans/regression-memory-and-fix-quality-spec.md:104:**Sidecar = metadata extension with own SoT for dismiss state** — `/learn` 는 fix knowledge 의 source of truth. Sidecar 는 dismiss/cycle binding metadata 의 own SoT (derived view 아님 — dismiss_count 가 사용자 액션 source 라 /learn 에서 재구성 불가). Sidecar 도 git tracked. 손실 시 dismiss/decay 만 reset, /learn 데이터는 보존. cycle 1 §H2 위험: dual-write 가 아닌 *split SoT* 패턴 — `/learn` key 가 FK 라 sync 1 방향 (sidecar 는 /learn 에 없는 key 가지면 invalid).
docs/plans/regression-memory-and-fix-quality-spec.md:106:**Orphan cleanup 룰**: recall hook 발동 시 sidecar entry 의 key 가 `/learn` 에 부재이면 sidecar 그 entry 삭제 (자동, 사용자 silent loss 방지 위해 deletion 로그 stderr 출력). 추가로 `regression-stale-check.sh` 가 cron/cycle-end 실행 시 동일 검사. 자동 GC 만 — 수동 path 없음 (영구 누수 차단).
docs/plans/regression-memory-and-fix-quality-spec.md:108:**Recall hook** (`install/hooks/regression-recall.mjs`):
docs/plans/regression-memory-and-fix-quality-spec.md:109:- Trigger: UserPromptSubmit. (PostToolUse 미사용 — install-global.sh 가 미지원 + cycle 2 #3)
docs/plans/regression-memory-and-fix-quality-spec.md:112:- sidecar JSONL grep → dismiss_count/archived 적용
docs/plans/regression-memory-and-fix-quality-spec.md:122:- Hook 발동 시 user prompt 에서 self-improvement marker grep — 매칭되면 inject skip
docs/plans/regression-memory-and-fix-quality-spec.md:128:- 5 plan 모두 끝나고 `kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 받은 후)
docs/plans/regression-memory-and-fix-quality-spec.md:129:- `--regression-recall` 호출 시 keyword-detector 도 dependency 자동 enable
docs/plans/regression-memory-and-fix-quality-spec.md:135:- hook path 에서는 sidecar 의 캐시된 stale flag 만 read. 라이브 git blame 안 함
docs/plans/regression-memory-and-fix-quality-spec.md:145:| How | `gstack learn add --key ... --type ... --insight ... --confidence ... --source retro` (Plan D Step 0 에서 정확 시그니처 확정). sidecar 는 동시에 `key`, `related_cycles=[N]` 만 append |
docs/plans/regression-memory-and-fix-quality-spec.md:149:### Axis B — Fix scope 누수 차단
docs/plans/regression-memory-and-fix-quality-spec.md:151:신규 skill `kzk-fix-scope-expansion`. 진입점 2개 (fix-start + fix-verify), Pre-commit Gate 4.5 보조. 디테일은 Plan B 에 위임.
docs/plans/regression-memory-and-fix-quality-spec.md:154:- fix-start hook 이 D 의 regression-recall 결과 inject 다음에 발동 (consumer)
docs/plans/regression-memory-and-fix-quality-spec.md:155:- callsite 전수: `code-review-graph` 우선, fallback grep
docs/plans/regression-memory-and-fix-quality-spec.md:156:- Gate 4.5 = sanity check (callsite grep 결과 vs git diff 매칭)
docs/plans/regression-memory-and-fix-quality-spec.md:158:### Axis C — Fresh-agent verification
docs/plans/regression-memory-and-fix-quality-spec.md:165:- Verifier prompt 에 **spec/plan 의 acceptance criteria 발췌만 inline copy** (전체 600줄 read 금지). 토큰/cache 부담 차단
docs/plans/regression-memory-and-fix-quality-spec.md:167:### Axis E — Production code-first + 멱등성
docs/plans/regression-memory-and-fix-quality-spec.md:180:- Axis B (fix scope) — production fix 의 callsite 전수 = migration 의 영향 schema/표/index 전수. fix-scope-expansion hook 이 production access trigger 시에도 발동.
docs/plans/regression-memory-and-fix-quality-spec.md:185:## Plan 분할
docs/plans/regression-memory-and-fix-quality-spec.md:190:| **D** | `docs/plans/plan-D-regression-memory.md` | 신규 `kzk-regression-memory` + recall hook (default DISABLED) + sidecar + stale check + cycle 회고 통합 + gstack auto-install + **`kzk-pre-merge-sync/SKILL.md` 마지막 step `--regression-recall` 자동 호출 추가** | ~570 | A 후 |
docs/plans/regression-memory-and-fix-quality-spec.md:191:| **B** | `docs/plans/plan-B-fix-scope-expansion.md` | 신규 `kzk-fix-scope-expansion` + D recall consumer + Gate 4.5 | ~250 | D 후 |
docs/plans/regression-memory-and-fix-quality-spec.md:193:| **E** | `docs/plans/plan-E-production-code-first.md` | `kzk-production-access` 강화 — code-first 룰 + 멱등성 의무 + 직접 호출 금지 boilerplate. CLAUDE.md 의 production access 섹션 업데이트. | ~150 | A/B/C/D 후 (마지막) |
docs/plans/regression-memory-and-fix-quality-spec.md:199:## Skill count 동기화 (14→16)
docs/plans/regression-memory-and-fix-quality-spec.md:201:신규 2개 (B `kzk-fix-scope-expansion` + D `kzk-regression-memory`). 4 동기화 지점:
docs/plans/regression-memory-and-fix-quality-spec.md:205:4. `README.md` install command 의 skill count
docs/plans/regression-memory-and-fix-quality-spec.md:209:## Test 전략 (cycle 2 #5 한계 명시)
docs/plans/regression-memory-and-fix-quality-spec.md:213:| A | `install/test/skill-text-checks.sh` — `kzk-test-coverage` SKILL.md 의 anti-pattern 섹션 grep + dispatch prompt boilerplate 의 sonnet executor SKILL.md 등록 grep | 룰 *기록* 검증만. 실제 sonnet 이 룰 위반 차단 여부는 manual cycle 검증 의존 |
docs/plans/regression-memory-and-fix-quality-spec.md:214:| B | `install/test/fix-scope-trigger.test.mjs` — fix-start hook simulator (mock prompt → expected grep call) | hook 자체 동작 test. 실제 fix workflow 통합은 manual |
docs/plans/regression-memory-and-fix-quality-spec.md:216:| D | `install/test/regression-recall.test.mjs` — mock /learn JSONL fixture + sidecar fixture → recall hook 매칭 + decay + dismiss 시뮬 | 진짜 mock 동작 test (코드 단위) |
docs/plans/regression-memory-and-fix-quality-spec.md:224:## Rollback
docs/plans/regression-memory-and-fix-quality-spec.md:229:| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=regression-recall` |
docs/plans/regression-memory-and-fix-quality-spec.md:235:## 메타 룰
docs/plans/regression-memory-and-fix-quality-spec.md:237:- 각 plan commit = atomic. 메시지 prefix `feat(skill):` / `feat(harness):` / `feat(install):`
docs/plans/regression-memory-and-fix-quality-spec.md:243:## Critic 매트릭스 (rev5 반영)
docs/plans/regression-memory-and-fix-quality-spec.md:249:| 3 (Axis B fix-during) | Locked + Axis B 요약 |
docs/plans/regression-memory-and-fix-quality-spec.md:251:| 5 (Axis D dismiss/decay) | §Storage 모델 sidecar + Recall 룰 |
docs/plans/regression-memory-and-fix-quality-spec.md:259:| 12.2 (/learn 시그니처) | §Storage 모델 (sidecar 채택으로 schema 확장 회피) |
docs/plans/regression-memory-and-fix-quality-spec.md:264:| #1 CRITICAL (gstack schema) | §Storage 모델 sidecar — 임의 필드 회피 |
docs/plans/regression-memory-and-fix-quality-spec.md:275:| #1 CRITICAL (sidecar derived view 명명 거짓) | Locked + §Sidecar = metadata extension with own SoT — wording 정정 |
docs/plans/regression-memory-and-fix-quality-spec.md:278:| #4 MAJOR (Hook append dependency) | Locked — `--regression-recall` 시 keyword-detector 자동 enable |
docs/plans/regression-memory-and-fix-quality-spec.md:281:| #7 MINOR (verifier 인용 범위) | Axis C — acceptance criteria 발췌 inline copy 만 |
docs/plans/regression-memory-and-fix-quality-spec.md:287:| #3 MAJOR (orphan cleanup) | §Storage 모델 sidecar — recall hook + stale-check 자동 GC 명시 |
docs/plans/regression-memory-and-fix-quality-spec.md:289:| #5 MINOR (acceptance 발췌 주체) | Plan C 위임 (`## Acceptance Criteria` 헤더 grep 추출) |
docs/plans/plan-A-tdd-self-verification-block.md:1:# Plan A — TDD 자기검증 차단 (Layer a + b) — rev2
docs/plans/plan-A-tdd-self-verification-block.md:8:## Goal
docs/plans/plan-A-tdd-self-verification-block.md:15:## Acceptance Criteria
docs/plans/plan-A-tdd-self-verification-block.md:20:4. `install/test/skill-text-checks.sh` 신규 — kzk-test-coverage SKILL.md 의 Anti-pattern 섹션 grep + kzk-large-task-delegation SKILL.md 의 boilerplate 룰 grep 확인
docs/plans/plan-A-tdd-self-verification-block.md:22:6. **CLAUDE.md / README.md skill count 검증 — Plan A 변경 없음 확인** (Plan A 는 신규 skill 없음. `git diff CLAUDE.md README.md` 결과에 skill count line / "All N skills" line 포함 안 됨을 명시 점검. 신규 skill 추가는 Plan B/D 책임)
docs/plans/plan-A-tdd-self-verification-block.md:24:8. atomic commit 메시지: `feat(skill): kzk-test-coverage v1.3 — anti-self-verification (Plan A)`
docs/plans/plan-A-tdd-self-verification-block.md:26:## Variables
docs/plans/plan-A-tdd-self-verification-block.md:34:## Tasks
docs/plans/plan-A-tdd-self-verification-block.md:36:### Task 1 — `kzk-test-coverage/SKILL.md` v1.3 (frontmatter + Anti-pattern + Layer b)
docs/plans/plan-A-tdd-self-verification-block.md:52:## Anti-pattern — Test-from-implementation
docs/plans/plan-A-tdd-self-verification-block.md:57:- spec / acceptance criteria / 사용자 prompt / 이슈 본문
docs/plans/plan-A-tdd-self-verification-block.md:59:- hook/install 인프라 코드 (예: `install/hooks/regression-recall.mjs`) — red 단계 중에도 harness/hook debugging 필요 시 예외 허용. 단 *디버깅 목적 한정* — 그 코드의 인터페이스를 test 의 가정으로 베끼는 행위 여전히 금지
docs/plans/plan-A-tdd-self-verification-block.md:67:> "이 test 가 검증할 동작이 spec / acceptance criteria 에 명시되어 있는가? implementation 의 현재 모양에서 추론한 것이 아닌가?"
docs/plans/plan-A-tdd-self-verification-block.md:69:### 자율 mode 메인 직접 TDD 금지 (Layer b)
docs/plans/plan-A-tdd-self-verification-block.md:98:### Task 2 — `kzk-large-task-delegation/SKILL.md` boilerplate
docs/plans/plan-A-tdd-self-verification-block.md:113:### Anti-self-verification boilerplate (Plan A)
docs/plans/plan-A-tdd-self-verification-block.md:120:- 허용 read: spec / acceptance criteria / 사용자 prompt / public API 시그니처 / hook·install 인프라 코드
docs/plans/plan-A-tdd-self-verification-block.md:129:### Task 3 — `harness-share.md` §11.1 신규
docs/plans/plan-A-tdd-self-verification-block.md:136:### 11.1 Anti-Self-Verification (TDD)
docs/plans/plan-A-tdd-self-verification-block.md:145:### Task 4 — `install/test/skill-text-checks.sh` 신규
docs/plans/plan-A-tdd-self-verification-block.md:150:#!/usr/bin/env bash
docs/plans/plan-A-tdd-self-verification-block.md:151:# install/test/skill-text-checks.sh — Plan A test (룰 *기록* 검증)
docs/plans/plan-A-tdd-self-verification-block.md:152:#
docs/plans/plan-A-tdd-self-verification-block.md:153:# kzk-test-coverage SKILL.md 의 Anti-pattern 섹션 + Layer b 룰 grep
docs/plans/plan-A-tdd-self-verification-block.md:154:# kzk-large-task-delegation SKILL.md 의 anti-self-verification boilerplate 룰 grep
docs/plans/plan-A-tdd-self-verification-block.md:155:# harness-share.md §11.1 cross-ref grep
docs/plans/plan-A-tdd-self-verification-block.md:156:#
docs/plans/plan-A-tdd-self-verification-block.md:157:# 한계: behavioral test 아님. 룰이 *기록* 됐는지만 확인.
docs/plans/plan-A-tdd-self-verification-block.md:158:# 실제 sonnet 이 룰 위반 차단하는지는 manual cycle 검증 의존.
docs/plans/plan-A-tdd-self-verification-block.md:167:assert_grep() {
docs/plans/plan-A-tdd-self-verification-block.md:169:  if grep -qF "$pattern" "$file"; then
docs/plans/plan-A-tdd-self-verification-block.md:179:assert_no_grep() {
docs/plans/plan-A-tdd-self-verification-block.md:181:  if grep -qF "$pattern" "$file"; then
docs/plans/plan-A-tdd-self-verification-block.md:197:# kzk-test-coverage v1.3 — positive grep
docs/plans/plan-A-tdd-self-verification-block.md:198:assert_grep "kzk-test-coverage version 1.3.0" "version: 1.3.0" "$TC"
docs/plans/plan-A-tdd-self-verification-block.md:199:assert_grep "kzk-test-coverage Anti-pattern 섹션" "Anti-pattern — Test-from-implementation" "$TC"
docs/plans/plan-A-tdd-self-verification-block.md:200:assert_grep "kzk-test-coverage Layer b 자율 mode" "자율 mode 메인 직접 TDD 금지" "$TC"
docs/plans/plan-A-tdd-self-verification-block.md:201:assert_grep "kzk-test-coverage KZK_AUTONOMOUS=1 우선" "KZK_AUTONOMOUS=1" "$TC"
docs/plans/plan-A-tdd-self-verification-block.md:202:assert_grep "kzk-test-coverage env unset 동사구 매칭" "환경변수 unset 시" "$TC"
docs/plans/plan-A-tdd-self-verification-block.md:203:assert_grep "kzk-test-coverage 명사 단독 금지" "명사 단독" "$TC"
docs/plans/plan-A-tdd-self-verification-block.md:204:assert_grep "kzk-test-coverage fresh sonnet dispatch 강제" "fresh sonnet dispatch" "$TC"
docs/plans/plan-A-tdd-self-verification-block.md:205:assert_grep "kzk-test-coverage Q-TDD-MAIN queue entry" "Q-TDD-MAIN" "$TC"
docs/plans/plan-A-tdd-self-verification-block.md:206:assert_grep "kzk-test-coverage hook 인프라 예외" "hook/install 인프라" "$TC"
docs/plans/plan-A-tdd-self-verification-block.md:207:assert_grep "kzk-test-coverage ACK 문구 예시" "test-from-spec 준수 확인했음" "$TC"
docs/plans/plan-A-tdd-self-verification-block.md:209:# kzk-test-coverage — negative grep (=0 override 금지)
docs/plans/plan-A-tdd-self-verification-block.md:210:assert_no_grep "kzk-test-coverage no =0 override" "KZK_AUTONOMOUS=0" "$TC"
docs/plans/plan-A-tdd-self-verification-block.md:212:# kzk-large-task-delegation boilerplate — positive
docs/plans/plan-A-tdd-self-verification-block.md:213:assert_grep "kzk-large-task-delegation Anti-self-verification boilerplate 섹션" "Anti-self-verification boilerplate" "$LTD"
docs/plans/plan-A-tdd-self-verification-block.md:214:assert_grep "kzk-large-task-delegation literal block 명시" "literal boilerplate" "$LTD"
docs/plans/plan-A-tdd-self-verification-block.md:215:assert_grep "kzk-large-task-delegation BLOCKED 반환" "BLOCKED 반환" "$LTD"
docs/plans/plan-A-tdd-self-verification-block.md:217:# harness-share §11.1 — positive
docs/plans/plan-A-tdd-self-verification-block.md:218:assert_grep "harness-share §11.1 Anti-Self-Verification" "11.1 Anti-Self-Verification" "$SHARE"
docs/plans/plan-A-tdd-self-verification-block.md:219:assert_grep "harness-share Layer (a) cross-ref" "Layer (a)" "$SHARE"
docs/plans/plan-A-tdd-self-verification-block.md:220:assert_grep "harness-share Layer (b) cross-ref" "Layer (b)" "$SHARE"
docs/plans/plan-A-tdd-self-verification-block.md:221:assert_grep "harness-share KZK_AUTONOMOUS=1" "KZK_AUTONOMOUS=1" "$SHARE"
docs/plans/plan-A-tdd-self-verification-block.md:223:# harness-share — negative grep
docs/plans/plan-A-tdd-self-verification-block.md:224:assert_no_grep "harness-share no =0 override" "KZK_AUTONOMOUS=0" "$SHARE"
docs/plans/plan-A-tdd-self-verification-block.md:239:### Task 5 — `install/test/run-tests.sh` 갱신
docs/plans/plan-A-tdd-self-verification-block.md:246:# Plan A — skill-text-checks
docs/plans/plan-A-tdd-self-verification-block.md:259:### Task 6 — atomic commit
docs/plans/plan-A-tdd-self-verification-block.md:277:install/test/skill-text-checks.sh 신규 — 룰 기록 검증 (positive + negative grep).
docs/plans/plan-A-tdd-self-verification-block.md:284:## Test 전략 (한계 명시)
docs/plans/plan-A-tdd-self-verification-block.md:290:## Rollback
docs/plans/plan-A-tdd-self-verification-block.md:298:## Out of scope (다음 Plan 으로 위임)
docs/plans/plan-A-tdd-self-verification-block.md:300:- Plan D — regression memory hook + sidecar + cycle 회고
docs/plans/plan-A-tdd-self-verification-block.md:301:- Plan B — fix-scope-expansion
docs/plans/plan-A-tdd-self-verification-block.md:305:## Codex review 의무
docs/plans/plan-B-fix-scope-expansion.md:1:# Plan B — Fix Scope Expansion (fix-start hook + Gate 4.5) — rev1
docs/plans/plan-B-fix-scope-expansion.md:3:> Spec: `docs/plans/regression-memory-and-fix-quality-spec.md` (rev7, frozen — Axis B).
docs/plans/plan-B-fix-scope-expansion.md:6:> Format reference: Plan A rev2 (TDD task, acceptance grep), Plan D rev2 (consumer hook integration, fail-modes).
docs/plans/plan-B-fix-scope-expansion.md:8:## Goal
docs/plans/plan-B-fix-scope-expansion.md:10:신규 skill `kzk-fix-scope-expansion` + fix-start hook 인프라 구축. AI 자율실행 cycle 의 5 메타갭 중 **Fix scope 누수** 차단. 사용자 prompt 가 fix intent 일 때 (또는 직전 Bash 가 non-zero exit / 에러 페이스트 detect 시) 함수/심볼 callsite 를 `code-review-graph` 로 전수 조회 → Plan D 의 recall 결과 다음 슬롯에 system-reminder 로 inject. Pre-commit Gate 4.5 가 callsite grep 결과 vs `git diff --name-only` 매칭 sanity check 로 누락 callsite 차단.
docs/plans/plan-B-fix-scope-expansion.md:13:- **fix-start hook** (`install/hooks/fix-scope-trigger.mjs`) — UserPromptSubmit, Plan D recall hook 다음 슬롯에 등록 (consumer 관계). 키워드/페이스트 매칭 → `code-review-graph` 우선 (`callers_of`, `imports_of`), fallback `grep -rn`. 결과 list 를 system-reminder inject.
docs/plans/plan-B-fix-scope-expansion.md:14:- **Gate 4.5** (Pre-commit Gate, 기존 Gate 4 ↔ commit 사이) — fix-start hook 이 캐시한 callsite list (`.kzk-harness/fix-scope-cache.json`) vs `git diff --cached --name-only` 매칭. 미스매치 → "callsite N 곳 중 M 곳만 변경됨. 누락 의도 명시 (commit body) 또는 다른 callsite 도 수정"
docs/plans/plan-B-fix-scope-expansion.md:15:- **Default DISABLED at B commit, 자동 enable on main 머지** — Plan D 와 같은 enablement gate 통과. `--fix-scope-trigger` flag 가 `--regression-recall` 의 sibling (둘 다 `--enable-hooks` dependency).
docs/plans/plan-B-fix-scope-expansion.md:16:- gstack 미설치 환경 — D 와 동일 silent skip 금지 (stderr WARN + structured `_warn` reason). 단, B 의 hook 은 gstack 의존 X — `code-review-graph` 의존. CRG 미설치 → grep fallback.
docs/plans/plan-B-fix-scope-expansion.md:18:## Acceptance Criteria
docs/plans/plan-B-fix-scope-expansion.md:20:1. `skills/kzk-fix-scope-expansion/SKILL.md` 신규 — frontmatter (name=`kzk-fix-scope-expansion`, version=`1.0.0`, description with triggers), §Triggers, §Why, §Fix-start hook (trigger 룰 + CRG 우선 + grep fallback + cache 위치 + recall consumer 룰), §Fix-verify hook (manual self-check inject), §Gate 4.5 (sanity check 룰), §자가-skip guard (D 와 동일 동사구만), §Default DISABLED 정책, §Rollback (5 level), §Interaction with other kzk-* (특히 D consumer + Gate 4.5 of pre-commit-gate)
docs/plans/plan-B-fix-scope-expansion.md:21:2. `install/hooks/fix-scope-trigger.mjs` 신규 — UserPromptSubmit hook. 자가-skip → fix intent detect (FIX_KEYWORDS reuse from Plan D 구현, **import** from `regression-recall.mjs` to avoid drift) → 심볼 추출 (prompt 의 backtick / camelCase / snake_case / func() 패턴) → CRG `query_graph` 또는 CLI `code-review-graph query/blast-radius` 우선 → grep fallback → result truncation (200 char cap, **D recall reminder size cap 룰과 sibling**) → `.kzk-harness/fix-scope-cache.json` atomic write (via `install/lib/sidecar-write.mjs` 의 `writeAtomic` 재사용) → system-reminder inject. CRG 미설치 시 stderr WARN + `_warn:"crg-not-installed-grep-fallback"`. **default DISABLED at commit** (settings.json 등록은 `--fix-scope-trigger` flag 호출 시만)
docs/plans/plan-B-fix-scope-expansion.md:22:3. `install/test/fix-scope-trigger.test.mjs` 신규 — mock prompt → expected callsite grep call 검증. 최소 12 case (자가-skip env / verbphrase / fix intent detect / 심볼 추출 / CRG path mock / grep fallback / truncation cap / cache 파일 atomic write / D recall consumer 순서 simulating / Gate 4.5 sanity check pass-fail / non-fix prompt → silent pass / cache 파일 schema validation)
docs/plans/plan-B-fix-scope-expansion.md:23:4. `install/test/fixtures/fix-scope-callsites.sample.json` 신규 — mock CRG response + grep response sample. fixture 헤더 comment: `# illustrative only — Plan B Step 0 actual code-review-graph output wins on drift`
docs/plans/plan-B-fix-scope-expansion.md:25:6. `install/install-global.sh` `enable_hooks()` 확장 — `--fix-scope-trigger` flag 추가, default off (`DO_FIX_SCOPE_TRIGGER=0`). hook 파일 copy + idempotent jq append (D 의 `--regression-recall` 패턴 그대로). `--fix-scope-trigger` 도 `--enable-hooks` 의 explicit dependency. **fail-closed**: jq 부재 / exit non-zero / duplicate entry → return 1
docs/plans/plan-B-fix-scope-expansion.md:26:7. `install/dependencies.sh` 갱신 — `code-review-graph` dependency 강화 (B 의 callsite 전수 grep 에 사용). 기존 entry 가 이미 있으면 SUMMARY message 만 강화 ("Plan B kzk-fix-scope-expansion uses code-review-graph for callsite expansion. Without CRG, fallback = grep."). 없으면 신규 entry 추가 (pip --user → pipx fallback, dependencies.md 와 sync)
docs/plans/plan-B-fix-scope-expansion.md:27:8. `skills/kzk-pre-commit-gate/SKILL.md` 갱신 — `## Gate 4.5 — Fix Scope Sanity Check (Plan B)` 신규 section, 기존 Gate 4 다음, `## Doc-only commit exception` 직전 위치. 룰: cache 파일 (`.kzk-harness/fix-scope-cache.json`) 존재하면 callsite list vs `git diff --cached --name-only` 매칭. 미스매치 → BLOCK (commit body 에 의도 명시 의무). cache 부재 시 N/A (fix-scope-trigger hook 비활성 또는 fix intent 아닌 commit). frontmatter version `1.2.0` → `1.3.0`. description 에 `Gate 4.5` trigger 추가. Triggers list 에 `Gate 4.5`, `fix-scope-cache`, `callsite mismatch` 추가
docs/plans/plan-B-fix-scope-expansion.md:28:9. `skills/kzk-codebase-survey/SKILL.md` 갱신 — Triggers list 에 fix-time trigger phrase 추가: `fix 시작`, `버그 수정`, `에러 fix`, `regression fix`, `callsite 전수`, `함수 수정 영향`. frontmatter version `1.5.0` → `1.6.0`. description 에 `fix-time callsite expansion` 추가. §Interaction with other kzk-* 끝에 `kzk-fix-scope-expansion (Plan B)` cross-ref 추가
docs/plans/plan-B-fix-scope-expansion.md:29:10. `skills/kzk-regression-memory/SKILL.md` 갱신 — §Interaction with other kzk-* 의 `kzk-fix-scope-expansion (Plan B)` 항목 보강 (현재 1줄 → 3줄): "D recall hook 다음 슬롯에서 발동", "callsite cache (.kzk-harness/fix-scope-cache.json) 가 D recall reminder 와 함께 inject 되는 사용자 prompt context", "Gate 4.5 의 cache 입력자". 본문 변경 없음 (skill version bump X — Interaction-only patch)
docs/plans/plan-B-fix-scope-expansion.md:30:11. `skills/kzk-large-task-delegation/SKILL.md` 갱신 — 기존 §Subagent prompt requirements 의 Recall 결과 inject 룰 옆에 **fix-scope cache inject 룰** 추가: subagent dispatch 시점에 `.kzk-harness/fix-scope-cache.json` 존재하면 cache 의 callsite list 도 dispatch prompt 에 verbatim inject (size cap 200 char — D recall 과 동일 룰, callsite 우선순위 = file 변경 빈도 high → low). §Interaction with other kzk-* 끝에 `kzk-fix-scope-expansion (Plan B)` 항목 추가
docs/plans/plan-B-fix-scope-expansion.md:31:12. `harness-share.md` §3.5 신규 (또는 §29 다음 §30 신규 — 기존 §29 = Plan D Regression Memory) — 본 plan 은 §3.5 (Pre-commit Gate 와 sibling) 채택. Title: `## 3.5 Fix Scope Expansion (kzk-fix-scope-expansion, Plan B)`. 본문: Fix-start hook 룰 + CRG 우선 + grep fallback + Gate 4.5 sanity check + Default DISABLED + cross-ref to §29 (Plan D consumer 관계)
docs/plans/plan-B-fix-scope-expansion.md:32:13. `CLAUDE.md` line 3 + "All N skills" line + `README.md` line 3 + install command skill count — **15 → 16** (Plan B 신규 skill 1개. Plan D 가 14→15, Plan B 가 15→16). 4 sync points 모두 변경
docs/plans/plan-B-fix-scope-expansion.md:33:14. `bash install/test/run-tests.sh` PASS (`test_fix_scope_trigger` 포함 전체 통과. CLAUDE.md / README.md skill count assertion 도 16 으로 업데이트 — 기존 `assert "marker block has 14 kzk- rows"` 형태가 있으면 Plan D 가 15 로, Plan B 가 16 으로 업데이트)
docs/plans/plan-B-fix-scope-expansion.md:34:15. atomic commit 메시지: `feat(skill): kzk-fix-scope-expansion + Gate 4.5 — fix scope expansion (Plan B)`
docs/plans/plan-B-fix-scope-expansion.md:36:## Variables
docs/plans/plan-B-fix-scope-expansion.md:38:- `SKILL_FSE = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-fix-scope-expansion/SKILL.md`
docs/plans/plan-B-fix-scope-expansion.md:43:- `HOOK_FIXSCOPE = /Users/kimzerokim/work/personal/kzk-harness/install/hooks/fix-scope-trigger.mjs`
docs/plans/plan-B-fix-scope-expansion.md:44:- `HOOK_RECALL = /Users/kimzerokim/work/personal/kzk-harness/install/hooks/regression-recall.mjs` (import source)
docs/plans/plan-B-fix-scope-expansion.md:45:- `LIB_SIDECAR = /Users/kimzerokim/work/personal/kzk-harness/install/lib/sidecar-write.mjs` (`writeAtomic` reuse)
docs/plans/plan-B-fix-scope-expansion.md:46:- `TEST_FIXSCOPE = /Users/kimzerokim/work/personal/kzk-harness/install/test/fix-scope-trigger.test.mjs`
docs/plans/plan-B-fix-scope-expansion.md:47:- `FIXTURE_CALLSITES = /Users/kimzerokim/work/personal/kzk-harness/install/test/fixtures/fix-scope-callsites.sample.json`
docs/plans/plan-B-fix-scope-expansion.md:55:## Tasks
docs/plans/plan-B-fix-scope-expansion.md:57:### Task 0 — `code-review-graph` backend probe (CRITICAL)
docs/plans/plan-B-fix-scope-expansion.md:63:1. `code-review-graph --version` 시도. 명령 unavailable → **fix-scope hook 의 CRG path OFF** (hook 발동 시 grep fallback 으로 silent degradation, 단 stderr WARN 의무 + `_warn:"crg-not-installed-grep-fallback"` structured reason). Plan B 본 plan 자체 commit 진행 OK (hook default DISABLED 라 즉시 위협 X). 사용자에게 `dependencies.sh` 실행 권고.
docs/plans/plan-B-fix-scope-expansion.md:65:2. CRG 가용 시:
docs/plans/plan-B-fix-scope-expansion.md:70:   query CLI 시그니처 캡처 — Plan B 본문의 `## Fix-start hook` 의 §CRG 호출 형식 행에 정확 시그니처 박음. 현재 가정 (kzk-codebase-survey SKILL.md §Step 1 인용): `code-review-graph query --file <target>`, `code-review-graph blast-radius --file <target>`. MCP path 는 `query_graph(pattern="callers_of"|"imports_of", target=<file or symbol>)`. 차이 있으면 plan 수정.
docs/plans/plan-B-fix-scope-expansion.md:72:3. CRG status 의 `Files / Nodes / Edges / Last updated` 캡처. Nodes < 50 OR Last updated SHA 가 HEAD 와 > 10 commit drift → **build 의무**: `code-review-graph build` 후 재확인.
docs/plans/plan-B-fix-scope-expansion.md:74:4. 실제 query 1회 실행 (sample 함수: 본 repo 의 `install/hooks/regression-recall.mjs::shouldSkip`):
docs/plans/plan-B-fix-scope-expansion.md:76:   code-review-graph query --file install/hooks/regression-recall.mjs 2>&1 | tee /tmp/crg-query.log
docs/plans/plan-B-fix-scope-expansion.md:77:   code-review-graph blast-radius --file install/hooks/regression-recall.mjs 2>&1 | tee /tmp/crg-blast.log
docs/plans/plan-B-fix-scope-expansion.md:82:6. grep fallback path 도 1회 실행:
docs/plans/plan-B-fix-scope-expansion.md:84:   grep -rn "shouldSkip\b" --include="*.mjs" --include="*.ts" /Users/kimzerokim/work/personal/kzk-harness 2>&1 | head -50 | tee /tmp/grep-fallback.log
docs/plans/plan-B-fix-scope-expansion.md:86:   출력을 fixture 의 `grep_response_sample` field 로 복사.
docs/plans/plan-B-fix-scope-expansion.md:88:7. 실패 시 user-queue entry: `Q-PLAN-B-STEP0 — code-review-graph 미설치 또는 query 시그니처 캡처 실패, grep-only fallback 검토 필요`
docs/plans/plan-B-fix-scope-expansion.md:92:### Task 1 — `kzk-fix-scope-expansion/SKILL.md` 신규 (~180 lines)
docs/plans/plan-B-fix-scope-expansion.md:96:`mkdir -p skills/kzk-fix-scope-expansion`.
docs/plans/plan-B-fix-scope-expansion.md:102:name: kzk-fix-scope-expansion
docs/plans/plan-B-fix-scope-expansion.md:104:description: "Fix scope 누수 차단 — fix-start 시점 callsite 전수 조회 (code-review-graph 우선, grep fallback) + Pre-commit Gate 4.5 sanity check. Plan D recall consumer. Top triggers: 'fix 시작', '버그 수정', '에러 fix', 'callsite 전수', 'Gate 4.5', 'fix-scope-cache'. Body §Triggers for full list."
docs/plans/plan-B-fix-scope-expansion.md:113:# kzk-fix-scope-expansion
docs/plans/plan-B-fix-scope-expansion.md:115:## Triggers
docs/plans/plan-B-fix-scope-expansion.md:119:`Gate 4.5`, `fix-scope-cache`, `code-review-graph callsite`,
docs/plans/plan-B-fix-scope-expansion.md:122:## Why
docs/plans/plan-B-fix-scope-expansion.md:125:본 skill 은 fix-start 시점 prompt 매칭 → callsite 전수 조회 → system-reminder inject + cache.
docs/plans/plan-B-fix-scope-expansion.md:126:Pre-commit Gate 4.5 는 cache 와 git diff 매칭 sanity check 로 commit 시점 누락 차단.
docs/plans/plan-B-fix-scope-expansion.md:128:## Fix-start hook (consumer 관계 with Plan D recall)
docs/plans/plan-B-fix-scope-expansion.md:130:**진입점**: `install/hooks/fix-scope-trigger.mjs` (UserPromptSubmit hook).
docs/plans/plan-B-fix-scope-expansion.md:131:**발동 슬롯**: `regression-recall.mjs` 다음 (D recall 결과가 system-reminder 로 inject 된 후 본 hook 이 callsite list 를 추가 inject — 둘이 같은 prompt 의 시스템-reminder 두 개 슬롯).
docs/plans/plan-B-fix-scope-expansion.md:134:1. 사용자 prompt 에 fix intent 키워드 매칭 (Plan D `regression-recall.mjs` 의 `FIX_KEYWORDS` 재사용 — drift 차단 위해 **import**)
docs/plans/plan-B-fix-scope-expansion.md:135:2. 직전 Bash tool 결과가 non-zero exit (PreToolUse hook 미지원 → 본 path 는 manual recall — fix-verify hook 이 self-check inject)
docs/plans/plan-B-fix-scope-expansion.md:140:- self-improvement 동사구 grep (D 의 `SELF_IMPROVE_VERBPHRASES` import 재사용) → skip
docs/plans/plan-B-fix-scope-expansion.md:149:**Callsite 조회 (CRG 우선)**:
docs/plans/plan-B-fix-scope-expansion.md:150:1. `code-review-graph` 가용 시 → MCP path 시도: `query_graph(pattern="callers_of", target=<symbol>)` + `query_graph(pattern="imports_of", target=<file>)`. MCP unavailable → CLI: `code-review-graph query --file <inferred-file>` + `code-review-graph blast-radius --file <inferred-file>`. inferred-file 없으면 (심볼만 있고 file 모름) → semantic_search_nodes 또는 grep fallback
docs/plans/plan-B-fix-scope-expansion.md:151:2. CRG status 가 stale (Last updated SHA 가 HEAD 와 > 10 commit drift) OR Nodes < 50 → **재 build 의무**: `code-review-graph build` 후 query 재시도
docs/plans/plan-B-fix-scope-expansion.md:152:3. CRG 미설치 OR build 실패 → grep fallback: `grep -rn "<symbol>\b" --include="*.{ts,tsx,mjs,js,py,sh,md}"` (limit 50 line)
docs/plans/plan-B-fix-scope-expansion.md:156:**Cache 위치**: `.kzk-harness/fix-scope-cache.json`. atomic write via `install/lib/sidecar-write.mjs::writeAtomic`. schema:
docs/plans/plan-B-fix-scope-expansion.md:163:    {"file": "src/foo.ts", "line": 42, "symbol": "shouldSkip", "source": "crg|grep"}
docs/plans/plan-B-fix-scope-expansion.md:170:cache 는 hook commit 시점에 새 fix-start 마다 overwrite (1 file = current fix scope only — multi-fix 같은 commit 은 last fix wins, 사용자가 의도 시 Gate 4.5 가 commit body 의도 명시 요구).
docs/plans/plan-B-fix-scope-expansion.md:175:- <file>:<line> <symbol> [crg|grep]
docs/plans/plan-B-fix-scope-expansion.md:177:[truncated: <M> more callsites — see .kzk-harness/fix-scope-cache.json]
docs/plans/plan-B-fix-scope-expansion.md:182:## Fix-verify hook (manual self-check inject)
docs/plans/plan-B-fix-scope-expansion.md:184:**Trigger**: test 통과 직후 (PostToolUse hook 가능 시 — install-global.sh 가 PostToolUse 미지원이면 manual). 본 plan B 는 PostToolUse 등록 *시도* 하되 미지원이면 fallback path: 사용자 prompt 가 "test 통과", "all green", "PR 직전" 매칭 시 UserPromptSubmit hook (fix-scope-trigger 의 sub-mode) 으로 발동.
docs/plans/plan-B-fix-scope-expansion.md:189:- test 가 fix-scope-cache.json 의 callsite N 곳 모두 커버하는가?
docs/plans/plan-B-fix-scope-expansion.md:190:- 누락 callsite 가 있다면 commit body 에 의도 명시했는가? (Gate 4.5 sanity check)
docs/plans/plan-B-fix-scope-expansion.md:195:## Gate 4.5 — Fix Scope Sanity Check (kzk-pre-commit-gate 위임)
docs/plans/plan-B-fix-scope-expansion.md:200:1. `.kzk-harness/fix-scope-cache.json` 존재 검사. 부재 → N/A (fix-scope-trigger 비활성 또는 fix intent 아닌 commit). PASS.
docs/plans/plan-B-fix-scope-expansion.md:204:   ❌ Gate 4.5 FAIL: callsite N 곳 중 M 곳만 변경됨 (누락: <file1>, <file2>).
docs/plans/plan-B-fix-scope-expansion.md:206:            (b) commit body 에 누락 의도 명시 (예: "fix-scope-skip: <file1> 은 deprecated path, fix 무관")
docs/plans/plan-B-fix-scope-expansion.md:208:4. (b) escape 룰: commit body 에 `fix-scope-skip:` line 발견 → 누락 callsite list 와 매칭. 모든 누락 callsite 가 명시되었으면 PASS.
docs/plans/plan-B-fix-scope-expansion.md:210:**구현**: kzk-pre-commit-gate skill SKILL.md 의 `## Gate 4.5` 섹션이 본 룰 명시. 본 skill 은 cache 입력자 + 룰 정의자.
docs/plans/plan-B-fix-scope-expansion.md:215:- 명시 escape (`fix-scope-skip:` line in commit body) → 누락 callsite 모두 cover 시 PASS
docs/plans/plan-B-fix-scope-expansion.md:217:## 자가-skip guard
docs/plans/plan-B-fix-scope-expansion.md:219:D 의 `SELF_IMPROVE_VERBPHRASES` 재사용 (drift 차단 위해 import). 환경변수 우선 (`KZK_HARNESS_SELF_IMPROVEMENT=1` / `KZK_AUTONOMOUS=1`). 명사 단독 매칭 금지.
docs/plans/plan-B-fix-scope-expansion.md:221:## Default DISABLED 정책
docs/plans/plan-B-fix-scope-expansion.md:223:**B commit 시점**: hook 파일 추가, settings.json 등록 X. `--fix-scope-trigger` flag 호출 안 한 상태.
docs/plans/plan-B-fix-scope-expansion.md:225:**자동 enable on main 머지**: 5 plan (A→D→B→C→E) 모두 끝나고 `kzk-pre-merge-sync` step 3 (또는 신규 step 3.5) 가 `install-global.sh --enable-hooks --regression-recall --fix-scope-trigger` 자동 호출 (사용자 confirm 게이트). `--fix-scope-trigger` 도 `--enable-hooks` 의 explicit dependency.
docs/plans/plan-B-fix-scope-expansion.md:227:**fail-closed**: install-global.sh exit non-zero / duplicate UserPromptSubmit append 발견 / jq 부재 → merge block.
docs/plans/plan-B-fix-scope-expansion.md:231:## Rollback (5 level)
docs/plans/plan-B-fix-scope-expansion.md:236:| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=fix-scope-trigger` |
docs/plans/plan-B-fix-scope-expansion.md:237:| Skill 즉시 비활성 | `DISABLE_OMC=kzk-fix-scope-expansion` |
docs/plans/plan-B-fix-scope-expansion.md:238:| Gate 4.5 만 비활성 (cache 입력 유지) | `kzk-pre-commit-gate` 본문 의 Gate 4.5 섹션 manual skip — commit body 에 `fix-scope-skip: gate-4.5-disabled` 명시. 또는 Pre-commit Gate skill version downgrade |
docs/plans/plan-B-fix-scope-expansion.md:239:| Cache 손실 / 오염 | `rm -f .kzk-harness/fix-scope-cache.json` — 다음 fix-start hook 이 새로 작성 |
docs/plans/plan-B-fix-scope-expansion.md:241:## Interaction with other kzk-*
docs/plans/plan-B-fix-scope-expansion.md:243:- **kzk-regression-memory** (Plan D): D recall hook 다음 슬롯에서 발동 (consumer). 같은 prompt 에 두 system-reminder slot — D 가 과거 fix 기억, B 가 현재 fix 의 callsite 영향. fix-scope-cache 가 D recall reminder 와 함께 inject 되는 사용자 prompt context. **순서 의존**: settings.json `UserPromptSubmit` 배열에서 regression-recall.mjs 가 fix-scope-trigger.mjs 보다 앞 — install-global.sh 의 `enable_hooks()` 호출 순서가 sibling append 라 자동 보장 (D 가 먼저 enable, B 가 나중).
docs/plans/plan-B-fix-scope-expansion.md:244:- **kzk-pre-commit-gate**: Gate 4.5 의 룰 정의자 (본 skill) + 적용자 (pre-commit-gate skill). cache 가 입력. 둘 사이 contract = `.kzk-harness/fix-scope-cache.json` schema (본 skill §Cache 위치 행 참조).
docs/plans/plan-B-fix-scope-expansion.md:245:- **kzk-codebase-survey**: fix-time trigger 를 본 skill 이 활성. survey skill 의 Step 1 (Scope Expansion) 과 동일 CRG 우선 + grep fallback 패턴 (룰 sync). 본 skill 은 hook path (자동), survey 는 EXPLORER subagent path (수동).
docs/plans/plan-B-fix-scope-expansion.md:247:- **kzk-autonomous-boundary**: 자가-skip guard 가 자율 mode 동사구 grep + `KZK_AUTONOMOUS=1` env — 자율 cycle 메인 prompt 자가오염 차단 (D 와 동일 룰).
docs/plans/plan-B-fix-scope-expansion.md:248:- **kzk-pre-merge-sync**: step 3 의 `--enable-hooks --regression-recall` 호출에 `--fix-scope-trigger` 추가 (sibling enable). fail-closed 검증도 sibling.
docs/plans/plan-B-fix-scope-expansion.md:251:### Task 2 — `install/hooks/fix-scope-trigger.mjs` 신규 (~230 LoC)
docs/plans/plan-B-fix-scope-expansion.md:255:**Pattern**: `regression-recall.mjs` 와 동일한 stdin/stdout 모양 (UserPromptSubmit hookSpecificOutput). FIX_KEYWORDS 와 SELF_IMPROVE_VERBPHRASES 는 `regression-recall.mjs` 에서 import — drift 차단.
docs/plans/plan-B-fix-scope-expansion.md:260:#!/usr/bin/env node
docs/plans/plan-B-fix-scope-expansion.md:261:// fix-scope-trigger.mjs — UserPromptSubmit hook for kzk-fix-scope-expansion (Plan B).
docs/plans/plan-B-fix-scope-expansion.md:262:// Spec: docs/plans/regression-memory-and-fix-quality-spec.md (rev7, Axis B).
docs/plans/plan-B-fix-scope-expansion.md:264:// Slot order: regression-recall.mjs (Plan D) → fix-scope-trigger.mjs (Plan B) — D consumer.
docs/plans/plan-B-fix-scope-expansion.md:269:import { writeAtomic } from "../lib/sidecar-write.mjs";
docs/plans/plan-B-fix-scope-expansion.md:271:  shouldSkip as recallShouldSkip,
docs/plans/plan-B-fix-scope-expansion.md:272:  detectFixIntent as recallDetectFixIntent,
docs/plans/plan-B-fix-scope-expansion.md:273:  FIX_KEYWORDS,
docs/plans/plan-B-fix-scope-expansion.md:274:  SELF_IMPROVE_VERBPHRASES,
docs/plans/plan-B-fix-scope-expansion.md:275:} from "./regression-recall.mjs";
docs/plans/plan-B-fix-scope-expansion.md:294:const CRG_TIMEOUT_MS = 5000;
docs/plans/plan-B-fix-scope-expansion.md:295:const CRG_STALE_DRIFT = 10;
docs/plans/plan-B-fix-scope-expansion.md:320:    execSync("code-review-graph --version", { stdio: "ignore", timeout: CRG_TIMEOUT_MS });
docs/plans/plan-B-fix-scope-expansion.md:332:      timeout: CRG_TIMEOUT_MS,
docs/plans/plan-B-fix-scope-expansion.md:348:      encoding: "utf8", timeout: CRG_TIMEOUT_MS,
docs/plans/plan-B-fix-scope-expansion.md:350:    return drift > CRG_STALE_DRIFT;
docs/plans/plan-B-fix-scope-expansion.md:368:      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: CRG_TIMEOUT_MS,
docs/plans/plan-B-fix-scope-expansion.md:377:function grepFallback(symbol, repoRoot) {
docs/plans/plan-B-fix-scope-expansion.md:380:      `grep -rn "${symbol}\\b" --include="*.ts" --include="*.tsx" --include="*.mjs" --include="*.js" --include="*.py" --include="*.sh" --include="*.md" ${JSON.stringify(repoRoot)} 2>/dev/null | head -${CALLSITE_CAP}`,
docs/plans/plan-B-fix-scope-expansion.md:381:      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: CRG_TIMEOUT_MS },
docs/plans/plan-B-fix-scope-expansion.md:385:      return m ? { file: path.relative(repoRoot, m[1]), line: parseInt(m[2], 10), symbol, source: "grep" } : null;
docs/plans/plan-B-fix-scope-expansion.md:395:      encoding: "utf8", cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"], timeout: CRG_TIMEOUT_MS,
docs/plans/plan-B-fix-scope-expansion.md:420:  const truncatedFooter = truncated > 0 ? `[truncated: ${truncated} more callsites — see .kzk-harness/fix-scope-cache.json]` : "";
docs/plans/plan-B-fix-scope-expansion.md:428:  writeAtomic(cachePath, [payload]);  // single-entry JSONL — using writeAtomic from sidecar-write.mjs (reuse, drift 차단)
docs/plans/plan-B-fix-scope-expansion.md:433:  crgQuerySymbol, grepFallback, rankByChangeFrequency, buildReminder, writeCache,
docs/plans/plan-B-fix-scope-expansion.md:446:    const cachePath = path.join(repoRoot, ".kzk-harness", "fix-scope-cache.json");
docs/plans/plan-B-fix-scope-expansion.md:468:    // CRG path with stale auto-rebuild
docs/plans/plan-B-fix-scope-expansion.md:471:    if (!status.available) crgWarn = "crg-not-installed-grep-fallback";
docs/plans/plan-B-fix-scope-expansion.md:475:      else crgWarn = "crg-stale-rebuild-failed-grep-fallback";
docs/plans/plan-B-fix-scope-expansion.md:485:        hits = grepFallback(sym, repoRoot);
docs/plans/plan-B-fix-scope-expansion.md:499:    // Cache write (atomic)
docs/plans/plan-B-fix-scope-expansion.md:510:      process.stderr.write(`[fix-scope-trigger] ${crgWarn}\n`);
docs/plans/plan-B-fix-scope-expansion.md:517:          hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: reminder },
docs/plans/plan-B-fix-scope-expansion.md:529:- exports 필수: test 가 import. signature `{ detectErrorPaste, extractSymbols, crgAvailable, crgStatus, isStale, crgQuerySymbol, grepFallback, rankByChangeFrequency, buildReminder, writeCache, RESULT_CAP_CHARS, SYMBOL_CAP, CALLSITE_CAP }`
docs/plans/plan-B-fix-scope-expansion.md:530:- D 의 `shouldSkip / detectFixIntent / FIX_KEYWORDS / SELF_IMPROVE_VERBPHRASES` 를 **import** — copy/paste 금지 (drift 차단)
docs/plans/plan-B-fix-scope-expansion.md:531:- `writeAtomic` 도 D 의 sidecar-write.mjs 에서 import — 자체 atomic write 코드 작성 금지
docs/plans/plan-B-fix-scope-expansion.md:532:- timeout 5s — CRG hang 방지
docs/plans/plan-B-fix-scope-expansion.md:533:- CRG stale auto-rebuild — Step 0 의 status oracle 룰 따름
docs/plans/plan-B-fix-scope-expansion.md:534:- single-entry JSONL via writeAtomic 은 cache file 이 진짜 JSON object 한 줄 — Gate 4.5 가 jq 로 read 가능 (`jq '.callsites' .kzk-harness/fix-scope-cache.json`)
docs/plans/plan-B-fix-scope-expansion.md:539:### Task 3 — `install/test/fix-scope-trigger.test.mjs` 신규 (~250 LoC)
docs/plans/plan-B-fix-scope-expansion.md:543:mock fixture 기반 unit test. 실 CRG 호출 없음 — test 는 fixture file read 로 시뮬.
docs/plans/plan-B-fix-scope-expansion.md:546:#!/usr/bin/env node
docs/plans/plan-B-fix-scope-expansion.md:547:// fix-scope-trigger.test.mjs — Plan B unit tests.
docs/plans/plan-B-fix-scope-expansion.md:550://        CRG path (mock) / grep fallback / truncation cap / cache write atomic /
docs/plans/plan-B-fix-scope-expansion.md:551://        D recall consumer slot order / Gate 4.5 sanity check pass-fail / non-fix prompt.
docs/plans/plan-B-fix-scope-expansion.md:560:} from "../hooks/fix-scope-trigger.mjs";
docs/plans/plan-B-fix-scope-expansion.md:561:import { shouldSkip, detectFixIntent } from "../hooks/regression-recall.mjs";
docs/plans/plan-B-fix-scope-expansion.md:562:import { readSidecar } from "../lib/sidecar-write.mjs";
docs/plans/plan-B-fix-scope-expansion.md:565:const FIXTURE_CALLSITES = path.join(__dirname, "fixtures/fix-scope-callsites.sample.json");
docs/plans/plan-B-fix-scope-expansion.md:581:  const dir = mkdtempSync(path.join(os.tmpdir(), "fix-scope-test-"));
docs/plans/plan-B-fix-scope-expansion.md:587:assert("shouldSkip env KZK_AUTONOMOUS=1 (D import)", shouldSkip("any prompt", { KZK_AUTONOMOUS: "1" }) !== null);
docs/plans/plan-B-fix-scope-expansion.md:588:assert("shouldSkip noun-only NOT skipped (D import)", shouldSkip("자가개선 관련 버그 수정", {}) === null);
docs/plans/plan-B-fix-scope-expansion.md:591:assert("detectFixIntent matches '버그' (D import)", detectFixIntent("이 버그 또 났네"));
docs/plans/plan-B-fix-scope-expansion.md:592:assert("detectFixIntent no-match on greeting", !detectFixIntent("안녕하세요"));
docs/plans/plan-B-fix-scope-expansion.md:601:const syms1 = extractSymbols("`shouldSkip` returns null when not autonomous");
docs/plans/plan-B-fix-scope-expansion.md:602:assert("extractSymbols backtick 'shouldSkip'", syms1.includes("shouldSkip"));
docs/plans/plan-B-fix-scope-expansion.md:613:  { file: "src/foo.ts", line: 10, symbol: "shouldSkip", source: "crg" },
docs/plans/plan-B-fix-scope-expansion.md:614:  { file: "src/bar.ts", line: 20, symbol: "shouldSkip", source: "grep" },
docs/plans/plan-B-fix-scope-expansion.md:618:assert("buildReminder shows source [crg|grep]", rem1.includes("[crg]") && rem1.includes("[grep]"));
docs/plans/plan-B-fix-scope-expansion.md:623:  ({ file: `src/file${i}.ts`, line: i, symbol: "x", source: "grep" }));
docs/plans/plan-B-fix-scope-expansion.md:628:// T7: writeCache via writeAtomic — atomic + readable
docs/plans/plan-B-fix-scope-expansion.md:632:    const cachePath = path.join(dir, ".kzk-harness", "fix-scope-cache.json");
docs/plans/plan-B-fix-scope-expansion.md:637:      callsites: [{ file: "src/a.ts", line: 1, symbol: "foo", source: "grep" }],
docs/plans/plan-B-fix-scope-expansion.md:652:    const cachePath = path.join(dir, ".kzk-harness", "fix-scope-cache.json");
docs/plans/plan-B-fix-scope-expansion.md:667:assert("FIX_KEYWORDS imported from D (drift sentinel)", detectFixIntent("fix bug"));
docs/plans/plan-B-fix-scope-expansion.md:674:  return "crg_response_sample" in parsed && "grep_response_sample" in parsed;
docs/plans/plan-B-fix-scope-expansion.md:677:// T11: Gate 4.5 sanity check — cache callsites vs git diff list (mock)
docs/plans/plan-B-fix-scope-expansion.md:684:  const skipMatch = (commitBody || "").match(/fix-scope-skip:\s*(.+)/);
docs/plans/plan-B-fix-scope-expansion.md:693:assert("Gate 4.5 PASS when all callsites in diff", g1.pass);
docs/plans/plan-B-fix-scope-expansion.md:695:assert("Gate 4.5 FAIL when callsite missing without skip", !g2.pass && g2.missing.includes("b.ts"));
docs/plans/plan-B-fix-scope-expansion.md:696:const g3 = gate45SanityCheck(["a.ts", "b.ts"], ["a.ts"], "fix-scope-skip: b.ts deprecated");
docs/plans/plan-B-fix-scope-expansion.md:697:assert("Gate 4.5 PASS when missing covered by fix-scope-skip", g3.pass);
docs/plans/plan-B-fix-scope-expansion.md:713:- `execSync(code-review-graph ...)` 미실행 — `crgQuerySymbol()` 와 `crgStatus()` 의 mock 화 안 함. 실 CRG 통합은 manual cycle 검증.
docs/plans/plan-B-fix-scope-expansion.md:714:- settings.json 실제 등록은 `enable_hooks` test (Task 5) 가 별도 책임.
docs/plans/plan-B-fix-scope-expansion.md:715:- Gate 4.5 sanity check 는 *룰 시뮬* (T11) — 실 pre-commit-gate hook 통합은 manual cycle 검증.
docs/plans/plan-B-fix-scope-expansion.md:720:### Task 4 — fixture 파일 신규
docs/plans/plan-B-fix-scope-expansion.md:724:`mkdir -p install/test/fixtures` (이미 존재 — Plan D Task 7).
docs/plans/plan-B-fix-scope-expansion.md:727:# illustrative only — Plan B Step 0 actual code-review-graph output wins on drift.
docs/plans/plan-B-fix-scope-expansion.md:728:# Re-capture rule (좁힘): CRG schema, CLI signature, fixture format 변경 시만 재캡처.
docs/plans/plan-B-fix-scope-expansion.md:731:    {"file": "install/hooks/regression-recall.mjs", "line": 32, "symbol": "shouldSkip", "source": "crg"},
docs/plans/plan-B-fix-scope-expansion.md:732:    {"file": "install/test/regression-recall.test.mjs", "line": 765, "symbol": "shouldSkip", "source": "crg"}
docs/plans/plan-B-fix-scope-expansion.md:734:  "grep_response_sample": [
docs/plans/plan-B-fix-scope-expansion.md:735:    "install/hooks/regression-recall.mjs:32:function shouldSkip(prompt, env) {",
docs/plans/plan-B-fix-scope-expansion.md:736:    "install/hooks/fix-scope-trigger.mjs:185:    const skip = recallShouldSkip(prompt, process.env);",
docs/plans/plan-B-fix-scope-expansion.md:737:    "install/test/regression-recall.test.mjs:765:assert(\"shouldSkip env KZK_HARNESS_SELF_IMPROVEMENT=1\","
docs/plans/plan-B-fix-scope-expansion.md:740:  "expected_top_symbol": "shouldSkip"
docs/plans/plan-B-fix-scope-expansion.md:746:### Task 5 — `install/test/run-tests.sh` 갱신 (~15 LoC)
docs/plans/plan-B-fix-scope-expansion.md:753:# ---------------------------------------------------------------------------
docs/plans/plan-B-fix-scope-expansion.md:754:# Plan B — fix-scope-trigger.test.mjs
docs/plans/plan-B-fix-scope-expansion.md:755:# ---------------------------------------------------------------------------
docs/plans/plan-B-fix-scope-expansion.md:758:  if node "$REPO_ROOT/install/test/fix-scope-trigger.test.mjs"; then
docs/plans/plan-B-fix-scope-expansion.md:759:    printf '  PASS: fix-scope-trigger.test.mjs\n'
docs/plans/plan-B-fix-scope-expansion.md:762:    printf '  FAIL: fix-scope-trigger.test.mjs\n'
docs/plans/plan-B-fix-scope-expansion.md:775:**기존 skill count assertion 갱신** — 기존 `test_skill_files_landed` 내 `for skill in <list>` 루프 또는 marker block row count assertion 이 14/15 가 박혀있으면 16 으로 update. 또한 `test_claude_md_marker` 에서 row count 검증 시 16 row 확인 (Plan D 가 15 로 update 했을 것 → Plan B 가 16 으로).
docs/plans/plan-B-fix-scope-expansion.md:777:**구체적 갱신 위치 식별 의무**: executor 는 commit 전에 `grep -n "14 kzk-\|15 kzk-\|All 14\|All 15\|16 kzk-\|All 16" install/test/run-tests.sh` 실행 → 모든 hit 16 으로 update. 누락 시 test FAIL.
docs/plans/plan-B-fix-scope-expansion.md:779:### Task 6 — `install/install-global.sh` `enable_hooks()` 확장 (~50 LoC) — D 의 `--regression-recall` 패턴 그대로
docs/plans/plan-B-fix-scope-expansion.md:783:**변경 1 — `parse_flags()` 의 `DO_REGRESSION_RECALL=0` 옆에 `DO_FIX_SCOPE_TRIGGER=0` 추가** (line 59 근처). usage block 에 한 줄 추가 (line 82 근처): `--fix-scope-trigger              Also wire fix-scope-trigger.mjs (implies --enable-hooks)`. arg parse case 에 분기 추가 (line 122 `--regression-recall)` 다음):
docs/plans/plan-B-fix-scope-expansion.md:786:      --fix-scope-trigger)
docs/plans/plan-B-fix-scope-expansion.md:791:**변경 2 — `enable_hooks()` 본문 확장** (line 627 부근. D 의 `--regression-recall` 블록 다음에 sibling 블록 추가):
docs/plans/plan-B-fix-scope-expansion.md:794:  # Plan B: fix-scope-trigger hook + cache via sidecar-write.mjs (이미 D 가 copy)
docs/plans/plan-B-fix-scope-expansion.md:796:    cp "$src/install/hooks/fix-scope-trigger.mjs" \
docs/plans/plan-B-fix-scope-expansion.md:798:    # sidecar-write.mjs 는 D 가 이미 copy — `--fix-scope-trigger` 단독 enable 시도면 D 의존
docs/plans/plan-B-fix-scope-expansion.md:799:    if [ ! -f "$HOME/.claude/skills/.kzk-harness-shared/lib/sidecar-write.mjs" ]; then
docs/plans/plan-B-fix-scope-expansion.md:800:      cp "$src/install/lib/sidecar-write.mjs" \
docs/plans/plan-B-fix-scope-expansion.md:806:**변경 3 — settings.json idempotent jq append 블록 추가** (D 의 `regression-recall` 블록 다음):
docs/plans/plan-B-fix-scope-expansion.md:809:  # Plan B: fix-scope-trigger idempotent append (slot order: D first, B second — sibling order matters)
docs/plans/plan-B-fix-scope-expansion.md:811:    local fst_cmd="node $HOME/.claude/skills/.kzk-harness-shared/hooks/fix-scope-trigger.mjs"
docs/plans/plan-B-fix-scope-expansion.md:813:    fst_already=$(jq --arg cmd "$fst_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
docs/plans/plan-B-fix-scope-expansion.md:815:      emit "  hooks: fix-scope-trigger.mjs already registered — skip"
docs/plans/plan-B-fix-scope-expansion.md:816:      record "hooks: fix-scope-trigger skip (already registered)"
docs/plans/plan-B-fix-scope-expansion.md:820:        .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
docs/plans/plan-B-fix-scope-expansion.md:822:      emit "  hooks: fix-scope-trigger.mjs registered (--fix-scope-trigger)"
docs/plans/plan-B-fix-scope-expansion.md:823:      record "hooks: fix-scope-trigger hook registered (--fix-scope-trigger, depends on --enable-hooks)"
docs/plans/plan-B-fix-scope-expansion.md:828:**변경 4 — `--fix-scope-trigger` 가 `--enable-hooks` 자동 enable** (line 762 부근의 D 패턴 옆):
docs/plans/plan-B-fix-scope-expansion.md:831:  # Plan B: --fix-scope-trigger 는 --enable-hooks 의 explicit dependency
docs/plans/plan-B-fix-scope-expansion.md:833:    emit "  --fix-scope-trigger implies --enable-hooks (explicit dependency)"
docs/plans/plan-B-fix-scope-expansion.md:840:### Task 7 — `install/dependencies.sh` 강화 (~15 LoC)
docs/plans/plan-B-fix-scope-expansion.md:847:# ---------------------------------------------------------------------------
docs/plans/plan-B-fix-scope-expansion.md:848:# 1.5. code-review-graph — used by kzk-codebase-survey + kzk-fix-scope-expansion (Plan B)
docs/plans/plan-B-fix-scope-expansion.md:849:# ---------------------------------------------------------------------------
docs/plans/plan-B-fix-scope-expansion.md:850:# (기존 entry 가 있으면 record line 만 강화)
docs/plans/plan-B-fix-scope-expansion.md:852:  record "code-review-graph: already installed. Used by kzk-codebase-survey Step 1 + kzk-fix-scope-expansion fix-start hook (Plan B)."
docs/plans/plan-B-fix-scope-expansion.md:869:    printf 'WARN: code-review-graph install failed — kzk-fix-scope-expansion will fall back to grep, kzk-codebase-survey Step 1 will use grep fallback.\n' >&2
docs/plans/plan-B-fix-scope-expansion.md:870:    record "code-review-graph: NOT INSTALLED. kzk-fix-scope-expansion + kzk-codebase-survey will use grep fallback."
docs/plans/plan-B-fix-scope-expansion.md:877:**`install/dependencies.md` sync**: 기존 entry 의 "Used by" 행에 `kzk-fix-scope-expansion (Plan B fix-start hook + Gate 4.5 callsite expansion)` 추가.
docs/plans/plan-B-fix-scope-expansion.md:879:### Task 8 — `kzk-pre-commit-gate/SKILL.md` Gate 4.5 추가 (~50 LoC)
docs/plans/plan-B-fix-scope-expansion.md:883:**Frontmatter 갱신**: `version: 1.2.0` → `version: 1.3.0`. description 끝에 추가: `, 'Gate 4.5', 'fix-scope-cache', 'callsite mismatch'`.
docs/plans/plan-B-fix-scope-expansion.md:887:`Gate 4.5`, `fix-scope-cache`, `callsite mismatch`, `fix-scope-skip`.
docs/plans/plan-B-fix-scope-expansion.md:893:## Gate 4.5 — Fix Scope Sanity Check (Plan B)
docs/plans/plan-B-fix-scope-expansion.md:895:`.kzk-harness/fix-scope-cache.json` (kzk-fix-scope-expansion fix-start hook 이 작성) 가 존재하면 callsite list 와 `git diff --cached --name-only` 매칭 검사. cache 부재 → N/A (fix-scope-trigger 비활성 또는 fix intent 아닌 commit).
docs/plans/plan-B-fix-scope-expansion.md:898:1. `cache_files = jq -r '.callsites[].file' .kzk-harness/fix-scope-cache.json | sort -u`
docs/plans/plan-B-fix-scope-expansion.md:903:   - body 에 `fix-scope-skip:` line 발견 + 모든 missing callsite 가 그 line 에 명시 → PASS
docs/plans/plan-B-fix-scope-expansion.md:906:     ❌ Gate 4.5 FAIL: callsite N 곳 중 M 곳만 변경됨.
docs/plans/plan-B-fix-scope-expansion.md:909:              (b) commit body 에 의도 명시: "fix-scope-skip: <file1>,<file2> reason"
docs/plans/plan-B-fix-scope-expansion.md:914:**자율 mode 추가 룰**: 자율 cycle 의 BLOCK 발생 → 즉시 halt + user-queue entry: `Q-GATE-4.5-FAIL — fix-scope cache vs diff 미스매치, 사용자 결정 필요`.
docs/plans/plan-B-fix-scope-expansion.md:916:본 Gate 의 룰 정의자: `kzk-fix-scope-expansion` skill (Plan B). 본 skill 은 적용자.
docs/plans/plan-B-fix-scope-expansion.md:922:- Gate 4.5 BLOCK 시 자율 mode → user-queue entry `Q-GATE-4.5-FAIL`. interactive mode → 사용자에게 surface, halt X.
docs/plans/plan-B-fix-scope-expansion.md:928:- **kzk-fix-scope-expansion** (Plan B): Gate 4.5 의 룰 정의자. cache 파일 (`.kzk-harness/fix-scope-cache.json`) 의 schema 와 sanity check 룰 정의. 본 skill 은 cache 입력자 + Gate 4.5 의 적용자.
docs/plans/plan-B-fix-scope-expansion.md:931:### Task 9 — `kzk-codebase-survey/SKILL.md` fix-time trigger 추가 (~10 LoC)
docs/plans/plan-B-fix-scope-expansion.md:945:, fix-time callsite audit (kzk-fix-scope-expansion 의 manual path — hook 비활성 환경 또는 hook 결과 보강 필요 시)
docs/plans/plan-B-fix-scope-expansion.md:951:- **kzk-fix-scope-expansion** (Plan B): hook path 는 fix-scope-trigger.mjs 가 자동 (UserPromptSubmit 시점), survey 는 EXPLORER subagent path (수동, fix-start 시 보강용). CRG 우선 + grep fallback 패턴은 Step 1 과 동일 룰 — drift 차단 위해 본 skill 의 룰이 source of truth.
docs/plans/plan-B-fix-scope-expansion.md:954:### Task 10 — `kzk-regression-memory/SKILL.md` cross-ref 보강 (~5 LoC) — Interaction-only patch (version bump X)
docs/plans/plan-B-fix-scope-expansion.md:960:**§Interaction with other kzk-* 갱신** — 기존 `kzk-fix-scope-expansion (Plan B): D recall 결과를 consumer 로 read — fix-start hook 이 D 다음에 발동.` 항목 (line 163) 을:
docs/plans/plan-B-fix-scope-expansion.md:963:- **kzk-fix-scope-expansion** (Plan B): D recall 결과를 consumer 로 read — fix-start hook 이 D 다음 슬롯에 발동 (settings.json `UserPromptSubmit` 배열에서 regression-recall.mjs → fix-scope-trigger.mjs 순). 같은 prompt 의 두 system-reminder 슬롯 — D 가 과거 fix 기억, B 가 현재 fix 의 callsite 영향 list. fix-scope-cache (`.kzk-harness/fix-scope-cache.json`) 가 D recall reminder 와 함께 inject 되는 사용자 prompt context. Pre-commit Gate 4.5 의 cache 입력자.
docs/plans/plan-B-fix-scope-expansion.md:966:### Task 11 — `kzk-large-task-delegation/SKILL.md` cache inject 룰 추가 (~10 LoC)
docs/plans/plan-B-fix-scope-expansion.md:970:**§Subagent prompt requirements 의 Recall 결과 inject 룰** (Plan D Task 13 가 추가한 항목) 다음 줄에 추가:
docs/plans/plan-B-fix-scope-expansion.md:973:- **fix-scope cache inject** (Plan B): subagent dispatch 시점에 `.kzk-harness/fix-scope-cache.json` 존재하면 cache 의 callsites list 도 dispatch prompt 에 verbatim inject. **size cap 200 char** — D recall reminder 와 sibling 룰. callsite 우선순위 = file 변경 빈도 high → low (cache 의 ranking 그대로). 200 char 초과 시 truncate + warning footer (`[truncated: <N> more callsites — see .kzk-harness/fix-scope-cache.json]`). subagent 가 fix 작업 시 callsite list read.
docs/plans/plan-B-fix-scope-expansion.md:979:- **kzk-fix-scope-expansion** (Plan B): cache 파일 의 callsites list 를 subagent dispatch prompt 에 inject (size cap 200 char, D recall reminder 와 sibling). fix subagent 도 callsite list read.
docs/plans/plan-B-fix-scope-expansion.md:982:### Task 12 — `harness-share.md` §3.5 신규 (~80 LoC)
docs/plans/plan-B-fix-scope-expansion.md:993:## 3.5 Fix Scope Expansion (kzk-fix-scope-expansion, Plan B)
docs/plans/plan-B-fix-scope-expansion.md:995:자율실행 cycle 의 5 메타갭 중 *Fix scope 누수* 차단. fix-start 시점 prompt 매칭 → callsite 전수 조회 → system-reminder inject + cache. Pre-commit Gate 4.5 가 cache vs git diff 매칭 sanity check.
docs/plans/plan-B-fix-scope-expansion.md:997:### Fix-start hook (consumer 관계 with §29 Plan D regression-recall)
docs/plans/plan-B-fix-scope-expansion.md:999:- 진입점: `install/hooks/fix-scope-trigger.mjs` (UserPromptSubmit hook)
docs/plans/plan-B-fix-scope-expansion.md:1000:- 발동 슬롯: `regression-recall.mjs` 다음 (D recall 결과 system-reminder inject 후 본 hook 이 callsite list 추가 inject — 같은 prompt 의 두 reminder 슬롯)
docs/plans/plan-B-fix-scope-expansion.md:1001:- Trigger: fix intent 키워드 (D 의 `FIX_KEYWORDS` import) OR 에러 페이스트 detect (`Error:`, JS stack frame, Python traceback) OR 직전 Bash non-zero exit (manual)
docs/plans/plan-B-fix-scope-expansion.md:1004:- Callsite 조회: **CRG 우선** (`code-review-graph` `query_graph(callers_of)` / CLI `query` + `blast-radius`) → CRG 미설치 OR stale (Nodes < 50 OR drift > 10 commit) → grep fallback (`grep -rn "<symbol>\b"`). CRG stale 시 자동 `code-review-graph build` 시도, 실패 시 grep
docs/plans/plan-B-fix-scope-expansion.md:1006:- Cache: `.kzk-harness/fix-scope-cache.json`. atomic write via `install/lib/sidecar-write.mjs::writeAtomic` (D utility 재사용 — drift 차단). schema = `{session_id, user_prompt_first200, symbols, callsites[], captured_at, crg_status}`. 1 entry/fix (overwrite, last fix wins)
docs/plans/plan-B-fix-scope-expansion.md:1007:- inject format: `🔧 [FIX SCOPE EXPANSION] 영향 받을 수 있는 파일/심볼 N건 (Plan D recall 결과 다음 슬롯): - <file>:<line> <symbol> [crg|grep] ⚠ 한 callsite 만 고치고 끝나지 말고 전수 검토.`
docs/plans/plan-B-fix-scope-expansion.md:1009:### Fix-verify hook (manual self-check)
docs/plans/plan-B-fix-scope-expansion.md:1011:- Trigger: PostToolUse hook 가능 시 (test 통과 직후) — install-global.sh PostToolUse 미지원 환경 → manual fallback path (사용자 prompt 의 "test 통과", "all green", "PR 직전" 매칭 시 UserPromptSubmit hook 의 sub-mode)
docs/plans/plan-B-fix-scope-expansion.md:1012:- 동작: `🔍 [FIX VERIFY] 자가 점검: test 가 callsite N 곳 모두 커버하는가? 누락 시 commit body 에 의도 명시했는가? (Gate 4.5)`
docs/plans/plan-B-fix-scope-expansion.md:1015:### Pre-commit Gate 4.5 — Fix Scope Sanity Check
docs/plans/plan-B-fix-scope-expansion.md:1021:  3. 미스매치 → BLOCK. commit body 에 `fix-scope-skip: <file> reason` 명시 시 PASS escape
docs/plans/plan-B-fix-scope-expansion.md:1023:- 적용자: `kzk-pre-commit-gate` skill §Gate 4.5
docs/plans/plan-B-fix-scope-expansion.md:1025:### CRG dependency
docs/plans/plan-B-fix-scope-expansion.md:1028:- 미설치 / build 실패 → grep fallback (silent degradation 금지 — stderr WARN + `_warn:"crg-not-installed-grep-fallback"` structured reason)
docs/plans/plan-B-fix-scope-expansion.md:1029:- CRG status oracle 룰 (kzk-codebase-survey §Step 0.5 와 sync) — `Files / Nodes / Edges / Last updated` 가 진실. build log alone 신뢰 X
docs/plans/plan-B-fix-scope-expansion.md:1031:### Default DISABLED at B commit, 자동 enable on main 머지 (5 plan 후, fail-closed)
docs/plans/plan-B-fix-scope-expansion.md:1034:- 5 plan (A→D→B→C→E) 끝나고 `kzk-pre-merge-sync` step 3 가 `install-global.sh --enable-hooks --regression-recall --fix-scope-trigger` 자동 호출 (사용자 confirm 게이트). `--fix-scope-trigger` 도 `--enable-hooks` 의 explicit dependency
docs/plans/plan-B-fix-scope-expansion.md:1037:### Rollback (5 level)
docs/plans/plan-B-fix-scope-expansion.md:1042:| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=fix-scope-trigger` |
docs/plans/plan-B-fix-scope-expansion.md:1043:| Skill 즉시 비활성 | `DISABLE_OMC=kzk-fix-scope-expansion` |
docs/plans/plan-B-fix-scope-expansion.md:1044:| Gate 4.5 만 비활성 | commit body 에 `fix-scope-skip: gate-4.5-disabled` 명시 (per-commit escape) |
docs/plans/plan-B-fix-scope-expansion.md:1045:| Cache 손실 / 오염 | `rm -f .kzk-harness/fix-scope-cache.json` — 다음 fix-start 가 새로 작성 |
docs/plans/plan-B-fix-scope-expansion.md:1047:### Cross-reference
docs/plans/plan-B-fix-scope-expansion.md:1049:- §3 Pre-commit Gate — Gate 4.5 적용 위치
docs/plans/plan-B-fix-scope-expansion.md:1051:- §26 kzk-codebase-survey — fix-time trigger 룰 sync (CRG 우선 + grep fallback)
docs/plans/plan-B-fix-scope-expansion.md:1054:### Task 13 — `CLAUDE.md` + `README.md` skill count sync (~8 LoC, 4 sync points)
docs/plans/plan-B-fix-scope-expansion.md:1058:Plan D 가 14→15 로 update 했을 것 (D commit 직후 상태). Plan B 가 15→16 으로 update.
docs/plans/plan-B-fix-scope-expansion.md:1061:1. **Line 3**: `It contains 15 \`kzk-*\` skills` → `It contains 16 \`kzk-*\` skills`
docs/plans/plan-B-fix-scope-expansion.md:1062:2. **"All N skills" line** (현재 `All 15 skills are active`): `All 15 skills are active` → `All 16 skills are active`
docs/plans/plan-B-fix-scope-expansion.md:1065:   | `kzk-fix-scope-expansion` | fix 시작, 버그 수정, 에러 fix, callsite 전수, Gate 4.5, fix-scope-cache, callsite mismatch |
docs/plans/plan-B-fix-scope-expansion.md:1069:1. **Line 3**: `Installs 15 \`kzk-*\` skills` → `Installs 16 \`kzk-*\` skills`
docs/plans/plan-B-fix-scope-expansion.md:1070:2. **Install command skill count** (`README.md` 의 install command 본문 또는 verify 단계 — Plan D 가 15 로 update 했으면 16 으로): grep `15 kzk-\|All 15` → 16 으로
docs/plans/plan-B-fix-scope-expansion.md:1072:**executor 의무**: 갱신 전 `grep -n "14 kzk-\|15 kzk-\|All 14\|All 15\|16 kzk-\|All 16" CLAUDE.md README.md install/test/run-tests.sh` 로 모든 skill count 위치 식별. 누락 시 run-tests.sh PASS 안 함.
docs/plans/plan-B-fix-scope-expansion.md:1074:### Task 14 — atomic commit
docs/plans/plan-B-fix-scope-expansion.md:1076:`kzk-pre-commit-gate` 통과 (Gate 0 / 1 / 1.5 / 2 N/A / 3 / 4 N/A. Gate 4.5 — 본 plan 이 도입 — 본 commit 자체는 cache 부재라 N/A):
docs/plans/plan-B-fix-scope-expansion.md:1078:- Gate 0: 신규 skill 디렉토리 (`skills/kzk-fix-scope-expansion/`) → AGENTS.md hierarchy 가 본 repo 에 없으면 N/A. 있으면 의무 update
docs/plans/plan-B-fix-scope-expansion.md:1084:- Gate 4.5: cache 부재 → N/A
docs/plans/plan-B-fix-scope-expansion.md:1088:feat(skill): kzk-fix-scope-expansion + Gate 4.5 — fix scope expansion (Plan B)
docs/plans/plan-B-fix-scope-expansion.md:1090:Fix-start hook (UserPromptSubmit, Plan D recall consumer slot):
docs/plans/plan-B-fix-scope-expansion.md:1091:  - FIX_KEYWORDS / SELF_IMPROVE_VERBPHRASES import from regression-recall.mjs (drift 차단)
docs/plans/plan-B-fix-scope-expansion.md:1092:  - 심볼 추출 + CRG 우선 (callers_of, blast-radius) → grep fallback
docs/plans/plan-B-fix-scope-expansion.md:1093:  - cache .kzk-harness/fix-scope-cache.json (atomic via writeAtomic)
docs/plans/plan-B-fix-scope-expansion.md:1094:  - CRG stale 자동 build, 미설치 시 stderr WARN + _warn structured reason
docs/plans/plan-B-fix-scope-expansion.md:1096:Gate 4.5 (kzk-pre-commit-gate v1.3):
docs/plans/plan-B-fix-scope-expansion.md:1098:  - 미스매치 → BLOCK (fix-scope-skip: escape)
docs/plans/plan-B-fix-scope-expansion.md:1105:install/test/fix-scope-trigger.test.mjs (12 cases) + fixture.
docs/plans/plan-B-fix-scope-expansion.md:1106:install/install-global.sh: --fix-scope-trigger flag (D --regression-recall sibling).
docs/plans/plan-B-fix-scope-expansion.md:1108:CLAUDE.md / README.md: 15→16 skill count (4 sync points).
docs/plans/plan-B-fix-scope-expansion.md:1110:Spec: docs/plans/regression-memory-and-fix-quality-spec.md (rev7, Axis B).
docs/plans/plan-B-fix-scope-expansion.md:1111:Plan: docs/plans/plan-B-fix-scope-expansion.md (rev1, frozen).
docs/plans/plan-B-fix-scope-expansion.md:1115:## Test 전략 (한계 명시)
docs/plans/plan-B-fix-scope-expansion.md:1119:| Self-skip guard (D import) | `shouldSkip` 호출 result | D import drift 만 검증. 동사구 grep 자체는 D test 가 검증 |
docs/plans/plan-B-fix-scope-expansion.md:1120:| Fix-intent detect | `detectFixIntent` 호출 result | D import drift 만 |
docs/plans/plan-B-fix-scope-expansion.md:1123:| CRG path | mock fixture | execSync(code-review-graph) 실행 안 함. 실 통합은 manual cycle |
docs/plans/plan-B-fix-scope-expansion.md:1124:| Grep fallback | mock fixture | execSync(grep) 실행 안 함. shell escape edge case 검증 부족 |
docs/plans/plan-B-fix-scope-expansion.md:1126:| Cache atomic write | tempdir + writeAtomic + readSidecar | 동시성 검증은 D 의 atomic write test 가 보강 |
docs/plans/plan-B-fix-scope-expansion.md:1128:| Gate 4.5 sanity check | mock function `gate45SanityCheck` | 룰 *시뮬* 만. 실 pre-commit-gate hook 통합은 manual cycle 검증 |
docs/plans/plan-B-fix-scope-expansion.md:1130:| CLAUDE.md / README.md count sync | grep assertion (executor 책임) | 4 sync points 누락 시 run-tests.sh FAIL |
docs/plans/plan-B-fix-scope-expansion.md:1132:**전반 한계**: behavioral test 아님. 룰 *기록* + mock fixture 검증. 실제 사용자 prompt 흐름 (UserPromptSubmit 트리거 + system-reminder inject + subagent dispatch 의 cache read + Gate 4.5 BLOCK behavior) 은 manual cycle 검증 의존. spec rev7 §Test 전략 한계 명시 룰 따름.
docs/plans/plan-B-fix-scope-expansion.md:1134:## Rollback (5 level — Plan B 본문 §Rollback 와 sibling)
docs/plans/plan-B-fix-scope-expansion.md:1139:| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=fix-scope-trigger` |
docs/plans/plan-B-fix-scope-expansion.md:1140:| Skill 즉시 비활성 | `DISABLE_OMC=kzk-fix-scope-expansion` |
docs/plans/plan-B-fix-scope-expansion.md:1141:| Gate 4.5 만 비활성 | commit body 에 `fix-scope-skip: gate-4.5-disabled` 명시 (per-commit escape) — kzk-pre-commit-gate skill version downgrade 도 옵션 |
docs/plans/plan-B-fix-scope-expansion.md:1142:| Cache 손실 / 오염 | `rm -f .kzk-harness/fix-scope-cache.json` — 다음 fix-start 가 새로 작성 |
docs/plans/plan-B-fix-scope-expansion.md:1144:## Out of scope (다음 Plan 으로 위임)
docs/plans/plan-B-fix-scope-expansion.md:1146:- **Plan C** — fresh-agent verifier Stage 3 + Pre-commit Gate 5. Gate 4.5 와 Gate 5 는 sibling — Gate 4.5 가 callsite scope 검증, Gate 5 가 verifier subagent 검증
docs/plans/plan-B-fix-scope-expansion.md:1147:- **Plan E** — production code-first + 멱등성. fix-scope hook 이 production access trigger 시에도 발동하는 cross-axis 통합은 Plan E 의 책임 (spec rev7 Axis E §Cross-axis 통합 참조)
docs/plans/plan-B-fix-scope-expansion.md:1151:## Codex review 의무
docs/plans/plan-B-fix-scope-expansion.md:1156:printf '%s' "$(cat docs/plans/plan-B-fix-scope-expansion.md)" | codex exec - -s read-only -c '...' --json | jq ...
docs/plans/plan-B-fix-scope-expansion.md:1161:verdict file 저장: `docs/research/codex-reviews/plan-B-fix-scope-expansion-codex-review.md` 또는 `.../plan-B-fix-scope-expansion-critic-review.md`. REVISE / SHIP 분기. SHIP → frozen. REVISE → cycle 1 답 통합 → rev2 (1 plan = 1 round 룰 적용 — `kzk-spec-and-review §Cost/cadence`).
docs/plans/plan-B-fix-scope-expansion.md:1163:## Open questions (executor 진행 중 발견 시 user-queue append)
docs/plans/plan-B-fix-scope-expansion.md:1165:- `Q-PLAN-B-PCG-VERSION` — kzk-pre-commit-gate v1.3 으로 bump 시 기존 harness-share.md §3 의 "6 단계" wording 이 "7 단계 (Gate 0/1/1.5/2/3/4/4.5)" 로 update 필요한가? 본 plan 은 §3.5 신규 section 으로 분리 → §3 wording 그대로 유지 채택. executor 가 §3 본문에 Gate 4.5 행 추가 여부 결정 시 user-queue 등록.
docs/plans/plan-B-fix-scope-expansion.md:1166:- `Q-PLAN-B-FIX-VERIFY-POSTTOOLUSE` — install-global.sh 가 PostToolUse hook event 지원하는지 Step 0 에서 확인. 미지원 → fix-verify hook 은 manual fallback 만. 지원 → 별도 task 추가 검토 (out of scope, 별 plan).
docs/plans/plan-B-fix-scope-expansion.md:1167:- `Q-PLAN-B-CACHE-MULTI-FIX` — same commit 에 multi-fix 수행 시 cache 가 last fix only overwrite — Gate 4.5 가 마지막 fix 만 검사. multi-fix list 보존 (append) 룰 추가 검토 필요? 본 plan rev1 은 last fix wins 채택 (단순성 우선). REVISE 시 검토.
docs/plans/plan-D-regression-memory.md:1:# Plan D — Regression Memory + Auto-Recall Hook (rev2)
docs/plans/plan-D-regression-memory.md:7:> rev1 → rev2 변경: dismiss CLI mutation task 신규, sidecar schema 7필드 승격 (stale flag),
docs/plans/plan-D-regression-memory.md:9:> 자가-skip guard 동사구만, sidecar atomic write 공용 utility, gstack 미설치 stderr WARN 의무,
docs/plans/plan-D-regression-memory.md:10:> rollback 7-level, "5 plan" wording 정정.
docs/plans/plan-D-regression-memory.md:12:## Goal
docs/plans/plan-D-regression-memory.md:14:신규 skill `kzk-regression-memory` + recall hook 인프라 구축. AI 자율실행 cycle 이 과거 fix 기록을 fix 시작 시점에 자동 조회 (recall), regression 망각 차단. 본 plan 의 hook 은 **commit 시점에 default DISABLED** — keyword-detector 와의 dependency 충돌 + B/C cycle 자가오염 차단. **5 plan (A→D→B→C→E) 모두 끝나고 main 머지 시점**에 `kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 후) 되어 활성.
docs/plans/plan-D-regression-memory.md:17:- Backend = gstack `/learn` (5필드 표준 schema) + sidecar `.kzk-harness/regression-meta.jsonl` (own SoT for dismiss state, 7필드 — stale flag 포함)
docs/plans/plan-D-regression-memory.md:18:- Recall = UserPromptSubmit hook → `/learn` keyword search + sidecar dismiss/decay → system-reminder inject
docs/plans/plan-D-regression-memory.md:21:- Stale check = `regression-stale-check.sh` cron/cycle-end 단발 — sidecar 의 `stale` 7번째 필드 update
docs/plans/plan-D-regression-memory.md:22:- Atomic write = 모든 sidecar writer 가 공용 `install/lib/sidecar-write.mjs` 사용 (lockdir + tmp + atomic mv)
docs/plans/plan-D-regression-memory.md:25:## Acceptance Criteria
docs/plans/plan-D-regression-memory.md:27:1. `skills/kzk-regression-memory/SKILL.md` 신규 — frontmatter (name/version/description with triggers), §Triggers, §Storage 모델 (5필드 + sidecar **7필드**), §Recall 룰 (decay 공식 + archived 룰 + dismiss CLI), §자가-skip guard (동사구만), §Cycle 회고 5W1H 표, §Stale check, §Rollback (7 level), §Interaction with other kzk-*
docs/plans/plan-D-regression-memory.md:28:2. `install/hooks/regression-recall.mjs` 신규 — UserPromptSubmit hook, 자가-skip guard 구현, /learn search + sidecar JSONL grep + decay + archived 필터링, system-reminder inject, gstack 미설치 시 stderr WARN + `_warn` reason, orphan cleanup 은 `allLearnKeys` snapshot 기준만. **default DISABLED** (settings.json 등록 안 함)
docs/plans/plan-D-regression-memory.md:29:3. `install/lib/sidecar-write.mjs` 신규 — 공용 atomic writer utility (`acquireLock` + `writeAtomic`). hook + stale-check + dismiss CLI 모두 본 utility 사용
docs/plans/plan-D-regression-memory.md:30:4. `install/scripts/regression-stale-check.sh` 신규 — sidecar 의 file_snapshot SHA vs HEAD 비교, archived 자동 X, 결과 stderr/stdout 출력. sidecar-write utility 통해 atomic update
docs/plans/plan-D-regression-memory.md:31:5. `install/bin/kzk-regression-memory.mjs` 신규 — `dismiss <key>` subcommand (mutation path). `dismiss_count++`, `last_dismissed_at=ISO`, `archived=true if dismiss_count>=3`. atomic write 의무
docs/plans/plan-D-regression-memory.md:32:6. `install/test/regression-recall.test.mjs` 신규 — mock fixture 기반 test (recall 매칭 + decay + dismiss + 자가-skip + orphan cleanup 시뮬 + dismiss CLI mutation + atomic write 동시성)
docs/plans/plan-D-regression-memory.md:34:8. `install/test/fixtures/regression-meta.sample.jsonl` 신규 — sidecar fixture (key/file_snapshot/related_cycles/dismiss_count/last_dismissed_at/archived/stale **7필드**)
docs/plans/plan-D-regression-memory.md:35:9. `install/install-global.sh` `enable_hooks()` 확장 — `--regression-recall` flag 추가, regression-recall.mjs 등록 + keyword-detector 자동 enable (explicit dependency). **idempotent append** (jq 로 중복 entry 검사 후 append). 실패 시 exit non-zero
docs/plans/plan-D-regression-memory.md:37:11. `install/test/run-tests.sh` 갱신 — `regression-recall.test.mjs` 호출 등록
docs/plans/plan-D-regression-memory.md:38:12. `skills/kzk-pre-merge-sync/SKILL.md` 갱신 — 마지막 step `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트). **fail-closed**: 등록 실패 (jq 부재 / duplicate / exit non-zero) → merge block
docs/plans/plan-D-regression-memory.md:41:15. `harness-share.md` §28 신규 — Regression Memory protocol (Storage 모델 7필드 / Recall 룰 / dismiss CLI / 자가-skip guard / Stale check / Cycle 회고 / Rollback 7-level)
docs/plans/plan-D-regression-memory.md:42:16. `CLAUDE.md` line 3 + "All N skills" line + `README.md` line 3 + install command skill count — 14→15 (Plan D 신규 skill 1개)
docs/plans/plan-D-regression-memory.md:43:17. `bash install/test/run-tests.sh` PASS (regression-recall.test.mjs 포함 전체 통과)
docs/plans/plan-D-regression-memory.md:45:## Variables
docs/plans/plan-D-regression-memory.md:51:- `HOOK_RECALL = /Users/kimzerokim/work/personal/kzk-harness/install/hooks/regression-recall.mjs`
docs/plans/plan-D-regression-memory.md:52:- `LIB_SIDECAR = /Users/kimzerokim/work/personal/kzk-harness/install/lib/sidecar-write.mjs`
docs/plans/plan-D-regression-memory.md:55:- `TEST_RECALL = /Users/kimzerokim/work/personal/kzk-harness/install/test/regression-recall.test.mjs`
docs/plans/plan-D-regression-memory.md:65:## Tasks
docs/plans/plan-D-regression-memory.md:67:### Task 0 — gstack backend probe (CRITICAL — backend drift 차단)
docs/plans/plan-D-regression-memory.md:76:   - **gstack 미설치 → recall feature OFF**: hook 발동 시 `querylearn()` 가 null 반환 → `_warn:"gstack-not-installed"` structured reason + stderr WARN. inject 결과 0건. `kzk-pre-merge-sync` step 3 의 `--regression-recall` enable 도 사용자에게 명시 (확인 후 거부 가능)
docs/plans/plan-D-regression-memory.md:96:7. `$FIXTURE_META` 는 spec §Storage 모델 sidecar schema (**7필드 — stale 포함**) 따라 hand-write 3 entries:
docs/plans/plan-D-regression-memory.md:98:   {"key":"plan-d-step-0-test","file_snapshot":"install/hooks/regression-recall.mjs:42@abc1234","related_cycles":[31],"dismiss_count":0,"last_dismissed_at":null,"archived":false,"stale":false}
docs/plans/plan-D-regression-memory.md:99:   {"key":"hypothetical-stale-bug","file_snapshot":"deleted/file.ts:10@old5678","related_cycles":[28],"dismiss_count":2,"last_dismissed_at":"2026-04-15T10:00:00Z","archived":false,"stale":true}
docs/plans/plan-D-regression-memory.md:103:8. 실패 시 user-queue entry: `Q-PLAN-D-STEP0 — gstack 미설치 또는 시그니처 캡처 실패, sidecar-only fallback 검토 필요`
docs/plans/plan-D-regression-memory.md:107:### Task 1 — `kzk-regression-memory/SKILL.md` 신규 (~280 lines)
docs/plans/plan-D-regression-memory.md:117:description: "Regression memory + auto-recall — fix 시작 시 과거 유사 fix 자동 조회 (gstack /learn + sidecar). dismiss CLI mutation 포함. Top triggers: 'regression memory', '재발 방지', 'fix 시작', 'recall', '과거 fix 조회', 'dismiss recall'. Body §Triggers for full list."
docs/plans/plan-D-regression-memory.md:126:# kzk-regression-memory
docs/plans/plan-D-regression-memory.md:128:## Triggers
docs/plans/plan-D-regression-memory.md:135:## Why
docs/plans/plan-D-regression-memory.md:137:자율실행 / 자가개선 cycle 의 5 메타갭 중 하나 — *Regression 망각*. 과거 fix 기록 존재해도 fix 시작 시점에 조회 안 됨. 본 skill 은 fix-start 시점 prompt 매칭 → 자동 recall + 사용자 dismiss 액션 → archive.
docs/plans/plan-D-regression-memory.md:139:## Storage 모델
docs/plans/plan-D-regression-memory.md:145:| `key` | string | bug-slug (FK to sidecar) |
docs/plans/plan-D-regression-memory.md:161:| `stale` | bool | true → file_snapshot SHA mismatch (regression-stale-check.sh 가 update). 7번째 필드로 schema 승격 (rev1 의 in-memory only 룰 폐기 — disk 저장 OK, sidecar 가 own SoT) |
docs/plans/plan-D-regression-memory.md:165:**FK 룰**: sidecar entry 의 `key` 는 `/learn` 에 반드시 존재. 부재 시 invalid → orphan cleanup 룰 적용 (아래).
docs/plans/plan-D-regression-memory.md:167:## Recall 룰
docs/plans/plan-D-regression-memory.md:169:UserPromptSubmit hook (`install/hooks/regression-recall.mjs`) 발동 시:
docs/plans/plan-D-regression-memory.md:172:2. user prompt **normalization**: `prompt.slice(0, 200)` + 공백 split + FIX_KEYWORDS / 정규식 기반 키워드 추출. raw prompt 전체 사용 X (codex #4 답)
docs/plans/plan-D-regression-memory.md:173:3. `gstack learn search --query <kw>` (또는 `~/.gstack/projects/<slug>/learnings.jsonl` 직접 grep — Plan D Step 0 에서 시그니처 확정)
docs/plans/plan-D-regression-memory.md:175:5. sidecar JSONL grep — 각 hit 의 dismiss_count, archived, last_dismissed_at, stale 조회
docs/plans/plan-D-regression-memory.md:183:   - cleanup 은 `allLearnKeys` snapshot 기준만 — sidecar entry 의 key 가 `allLearnKeys` 에 부재 → 자동 삭제 + stderr 로그 (`[regression-recall] orphan key removed: <key>`). 현재 query 에 안 걸린 정상 entry 보존
docs/plans/plan-D-regression-memory.md:189:   dismiss: kzk-regression-memory dismiss <key>  (sidecar dismiss_count++)
docs/plans/plan-D-regression-memory.md:194:## Dismiss/Archive CLI mutation path (codex #1 답)
docs/plans/plan-D-regression-memory.md:204:1. sidecar (`.kzk-harness/regression-meta.jsonl`) 에서 `key` 매칭 entry 찾기
docs/plans/plan-D-regression-memory.md:210:4. **공용 atomic writer** (`install/lib/sidecar-write.mjs`) 사용 — lockdir + tmp + atomic mv (codex #6 답)
docs/plans/plan-D-regression-memory.md:215:## 자가-skip guard (codex #5 답 — 동사구만)
docs/plans/plan-D-regression-memory.md:221:- user prompt 에서 **self-improvement 동사구** grep — 매칭되면 skip:
docs/plans/plan-D-regression-memory.md:231:이유: D recall hook 이 자가개선 cycle 에서 발동하면 자기 자신의 진행을 inject 로 오염. 자율 cycle 진행 차단.
docs/plans/plan-D-regression-memory.md:233:## Cycle 회고 통합 (5W1H)
docs/plans/plan-D-regression-memory.md:240:| How | `gstack learn add --key ... --type ... --insight ... --confidence ... --source retro` (Plan D Step 0 에서 정확 시그니처 확정). sidecar 는 동시에 `key`, `file_snapshot=<path>:<line>@<git rev-parse HEAD:path>`, `related_cycles=[N]`, 나머지 default 로 append. **sidecar atomic writer** 통해 (codex #9 답) |
docs/plans/plan-D-regression-memory.md:244:## Stale check
docs/plans/plan-D-regression-memory.md:250:- 변경 감지 시: stderr 로 stale flag 출력, sidecar 의 `stale` 7번째 필드 update (lib/sidecar-write 통해 atomic). archived 자동 X (사용자 결정)
docs/plans/plan-D-regression-memory.md:251:- recall hook 은 sidecar 의 `stale` 필드 read — hook path 에서 라이브 git blame 금지 (성능)
docs/plans/plan-D-regression-memory.md:253:## Default DISABLED 정책
docs/plans/plan-D-regression-memory.md:255:**D commit 시점**: hook 파일은 추가하지만 settings.json 등록 안 함. `--regression-recall` flag 호출 안 한 상태.
docs/plans/plan-D-regression-memory.md:257:**자동 enable on main 머지**: **5 plan (A→D→B→C→E)** 모두 끝나고 `kzk-pre-merge-sync` 의 마지막 step 에서 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트). `--regression-recall` 호출 시 keyword-detector 도 explicit dependency 자동 enable.
docs/plans/plan-D-regression-memory.md:259:**fail-closed** (codex #3 답): settings.json 등록 성공 + duplicate UserPromptSubmit append 없음 검증 실패 → merge block (exit non-zero). jq 부재 시 merge block.
docs/plans/plan-D-regression-memory.md:263:## Rollback (7 level — codex #10 답)
docs/plans/plan-D-regression-memory.md:268:| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=regression-recall` |
docs/plans/plan-D-regression-memory.md:272:| Plan D 자가오염 시 | hook default DISABLED 라 즉시 위협 없음. enable 후 발견 시 `OMC_SKIP_HOOKS=regression-recall` 즉시 비활성 |
docs/plans/plan-D-regression-memory.md:273:| **Global install 산출물 cleanup** | `~/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs` 제거 + 중복 settings.json `UserPromptSubmit` entry 정리 (`uninstall-global.sh --regression-recall` reverse path. 또는 jq 명령: `jq '.hooks.UserPromptSubmit \|= map(select(.hooks[0].command \| test("regression-recall") \| not))' ~/.claude/settings.json`) |
docs/plans/plan-D-regression-memory.md:275:## Interaction with other kzk-*
docs/plans/plan-D-regression-memory.md:277:- **kzk-pre-merge-sync**: 마지막 step 에서 `--enable-hooks --regression-recall` 자동 호출 (사용자 confirm). first-enable 망각 차단. fail-closed.
docs/plans/plan-D-regression-memory.md:279:- **kzk-large-task-delegation**: subagent dispatch prompt 에 recall 결과 inject 룰. fix-start 시점 recall = subagent 도 recall 결과 read. **size cap 200 char** — 초과 시 truncate + warning.
docs/plans/plan-D-regression-memory.md:280:- **kzk-fix-scope-expansion** (Plan B): D recall 결과를 consumer 로 read — fix-start hook 이 D 다음에 발동.
docs/plans/plan-D-regression-memory.md:281:- **kzk-autonomous-boundary**: 자가-skip guard 가 자율 mode 동사구 grep + `KZK_AUTONOMOUS=1` env — 자율 cycle 메인 prompt 자가오염 차단.
docs/plans/plan-D-regression-memory.md:284:### Task 2 — `install/lib/sidecar-write.mjs` 신규 (~80 LoC) — codex #6 답
docs/plans/plan-D-regression-memory.md:291:#!/usr/bin/env node
docs/plans/plan-D-regression-memory.md:292:// sidecar-write.mjs — 공용 atomic writer for .kzk-harness/regression-meta.jsonl.
docs/plans/plan-D-regression-memory.md:294:// 모든 sidecar mutation (recall hook orphan cleanup / stale-check / dismiss CLI / cycle 회고 append)
docs/plans/plan-D-regression-memory.md:295:// 이 utility 통과 의무. 패턴: lockdir (mkdir <sidecar>.lock — macOS 호환) + write to temp + atomic mv.
docs/plans/plan-D-regression-memory.md:304:export async function acquireLock(sidecarPath) {
docs/plans/plan-D-regression-memory.md:305:  const lockDir = `${sidecarPath}.lock`;
docs/plans/plan-D-regression-memory.md:309:      mkdirSync(lockDir);  // atomic — fails if exists
docs/plans/plan-D-regression-memory.md:316:  throw new Error(`sidecar-write: lock timeout on ${lockDir}`);
docs/plans/plan-D-regression-memory.md:319:export function writeAtomic(sidecarPath, entries) {
docs/plans/plan-D-regression-memory.md:320:  const tmpPath = `${sidecarPath}.tmp.${process.pid}`;
docs/plans/plan-D-regression-memory.md:323:  renameSync(tmpPath, sidecarPath);
docs/plans/plan-D-regression-memory.md:326:export function readSidecar(sidecarPath) {
docs/plans/plan-D-regression-memory.md:327:  if (!existsSync(sidecarPath)) return [];
docs/plans/plan-D-regression-memory.md:328:  const lines = readFileSync(sidecarPath, "utf8").split("\n").filter(Boolean);
docs/plans/plan-D-regression-memory.md:335:export async function mutateSidecar(sidecarPath, mutator) {
docs/plans/plan-D-regression-memory.md:336:  const release = await acquireLock(sidecarPath);
docs/plans/plan-D-regression-memory.md:338:    const entries = readSidecar(sidecarPath);
docs/plans/plan-D-regression-memory.md:340:    writeAtomic(sidecarPath, updated);
docs/plans/plan-D-regression-memory.md:350:### Task 3 — `install/hooks/regression-recall.mjs` 신규 (~210 LoC)
docs/plans/plan-D-regression-memory.md:354:**Pattern**: `keyword-detector.mjs` 와 동일한 stdin/stdout 모양 (UserPromptSubmit hookSpecificOutput).
docs/plans/plan-D-regression-memory.md:359:#!/usr/bin/env node
docs/plans/plan-D-regression-memory.md:360:// regression-recall.mjs — UserPromptSubmit hook for kzk-regression-memory.
docs/plans/plan-D-regression-memory.md:361:// rev2 — codex #4 (orphan cleanup 분리), #5 (자가-skip 동사구), #6 (atomic write),
docs/plans/plan-D-regression-memory.md:368:import { mutateSidecar, readSidecar } from "../lib/sidecar-write.mjs";
docs/plans/plan-D-regression-memory.md:370:const FIX_KEYWORDS = [
docs/plans/plan-D-regression-memory.md:376:const SELF_IMPROVE_VERBPHRASES = [
docs/plans/plan-D-regression-memory.md:390:function shouldSkip(prompt, env) {
docs/plans/plan-D-regression-memory.md:393:  for (const m of SELF_IMPROVE_VERBPHRASES) {
docs/plans/plan-D-regression-memory.md:399:function detectFixIntent(prompt) {
docs/plans/plan-D-regression-memory.md:400:  return FIX_KEYWORDS.some((k) => prompt.includes(k));
docs/plans/plan-D-regression-memory.md:407:  // intersection with FIX_KEYWORDS for keyword extraction
docs/plans/plan-D-regression-memory.md:408:  const matches = tokens.filter((t) => FIX_KEYWORDS.some((k) => t.includes(k)));
docs/plans/plan-D-regression-memory.md:422:    process.stderr.write(`[regression-recall] gstack search failed: ${e.message}\n`);
docs/plans/plan-D-regression-memory.md:446:async function orphanCleanup(sidecarPath, allLearnKeys) {
docs/plans/plan-D-regression-memory.md:450:  await mutateSidecar(sidecarPath, (entries) => {
docs/plans/plan-D-regression-memory.md:456:    process.stderr.write(`[regression-recall] orphan keys removed: ${removedCount}\n`);
docs/plans/plan-D-regression-memory.md:476:  shouldSkip, detectFixIntent, normalizeQuery, decay, orphanCleanup,
docs/plans/plan-D-regression-memory.md:477:  buildReminder, FIX_KEYWORDS, SELF_IMPROVE_VERBPHRASES,
docs/plans/plan-D-regression-memory.md:489:    const sidecarPath = path.join(repoRoot, ".kzk-harness", "regression-meta.jsonl");
docs/plans/plan-D-regression-memory.md:491:    const skip = shouldSkip(prompt, process.env);
docs/plans/plan-D-regression-memory.md:496:    if (!detectFixIntent(prompt)) {
docs/plans/plan-D-regression-memory.md:512:    await orphanCleanup(sidecarPath, allKeys);
docs/plans/plan-D-regression-memory.md:514:    // re-read sidecar after potential cleanup
docs/plans/plan-D-regression-memory.md:515:    const sidecarEntries = readSidecar(sidecarPath);
docs/plans/plan-D-regression-memory.md:516:    const sidecarByKey = new Map(sidecarEntries.map((e) => [e.key, e]));
docs/plans/plan-D-regression-memory.md:520:      const meta = sidecarByKey.get(learnEntry.key);
docs/plans/plan-D-regression-memory.md:521:      if (!meta) continue;  // sidecar 미존재 = invalid (FK 룰)
docs/plans/plan-D-regression-memory.md:538:          hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: reminder },
docs/plans/plan-D-regression-memory.md:549:- exports 필수: `shouldSkip`, `detectFixIntent`, `normalizeQuery`, `decay`, `orphanCleanup`, `buildReminder` — test 가 import
docs/plans/plan-D-regression-memory.md:552:- sidecar mutation 은 `mutateSidecar()` 통해 atomic (codex #6)
docs/plans/plan-D-regression-memory.md:557:### Task 4 — `install/bin/kzk-regression-memory.mjs` 신규 (~70 LoC) — codex #1 답
docs/plans/plan-D-regression-memory.md:564:#!/usr/bin/env node
docs/plans/plan-D-regression-memory.md:567:// All writes via install/lib/sidecar-write.mjs (atomic).
docs/plans/plan-D-regression-memory.md:570:import { mutateSidecar } from "../lib/sidecar-write.mjs";
docs/plans/plan-D-regression-memory.md:575:  const sidecarPath = path.join(repoRoot, ".kzk-harness", "regression-meta.jsonl");
docs/plans/plan-D-regression-memory.md:577:  await mutateSidecar(sidecarPath, (entries) => {
docs/plans/plan-D-regression-memory.md:592:    process.stderr.write(`kzk-regression-memory: key not found in sidecar: ${key}\n`);
docs/plans/plan-D-regression-memory.md:615:### Task 5 — `install/scripts/regression-stale-check.sh` 신규 (~85 LoC)
docs/plans/plan-D-regression-memory.md:621:`stale` 7번째 필드 update 의무. atomic write 는 sidecar-write.mjs 의 sibling node script 호출 또는 jq + mv. 본 plan 은 jq path 사용:
docs/plans/plan-D-regression-memory.md:624:#!/usr/bin/env bash
docs/plans/plan-D-regression-memory.md:625:# regression-stale-check.sh — Plan D 단발 stale check.
docs/plans/plan-D-regression-memory.md:626:#
docs/plans/plan-D-regression-memory.md:627:# sidecar (.kzk-harness/regression-meta.jsonl) 의 file_snapshot SHA 와 HEAD 비교.
docs/plans/plan-D-regression-memory.md:628:# 변경 감지 시 sidecar 의 7번째 필드 stale=true update + stderr 로그.
docs/plans/plan-D-regression-memory.md:629:# archived 자동 X — 사용자 결정.
docs/plans/plan-D-regression-memory.md:630:# atomic: mktemp + mv (lockdir 동시성은 hook 과 같은 utility 에 위임 — 본 script 는 단발 cron/cycle-end 용)
docs/plans/plan-D-regression-memory.md:631:#
docs/plans/plan-D-regression-memory.md:632:# 실행 시점: cron (사용자 선택) 또는 cycle 끝 단발 (kzk-web-loop 등에서 hook).
docs/plans/plan-D-regression-memory.md:641:  printf '[regression-stale-check] sidecar not found: %s — skipping\n' "$SIDECAR" >&2
docs/plans/plan-D-regression-memory.md:655:# acquire lock (lockdir pattern — same as install/lib/sidecar-write.mjs)
docs/plans/plan-D-regression-memory.md:706:### Task 6 — `install/test/regression-recall.test.mjs` 신규 (~200 LoC)
docs/plans/plan-D-regression-memory.md:710:mock fixture 기반 unit test. 실 gstack CLI 호출 없음 — test 는 fixture file read 로 시뮬. dismiss CLI mutation + atomic write 동시성 추가.
docs/plans/plan-D-regression-memory.md:713:#!/usr/bin/env node
docs/plans/plan-D-regression-memory.md:714:// regression-recall.test.mjs — Plan D unit tests (rev2).
docs/plans/plan-D-regression-memory.md:718://        archived/threshold filtering, dismiss CLI mutation, sidecar atomic write.
docs/plans/plan-D-regression-memory.md:725:  shouldSkip, detectFixIntent, normalizeQuery, decay, orphanCleanup, buildReminder,
docs/plans/plan-D-regression-memory.md:726:  FIX_KEYWORDS, SELF_IMPROVE_VERBPHRASES,
docs/plans/plan-D-regression-memory.md:727:} from "../hooks/regression-recall.mjs";
docs/plans/plan-D-regression-memory.md:729:import { mutateSidecar, readSidecar, writeAtomic } from "../lib/sidecar-write.mjs";
docs/plans/plan-D-regression-memory.md:763:// T1: shouldSkip — env var
docs/plans/plan-D-regression-memory.md:764:assert("shouldSkip env KZK_HARNESS_SELF_IMPROVEMENT=1",
docs/plans/plan-D-regression-memory.md:765:  shouldSkip("any prompt", { KZK_HARNESS_SELF_IMPROVEMENT: "1" }) !== null);
docs/plans/plan-D-regression-memory.md:766:assert("shouldSkip env KZK_AUTONOMOUS=1",
docs/plans/plan-D-regression-memory.md:767:  shouldSkip("any prompt", { KZK_AUTONOMOUS: "1" }) !== null);
docs/plans/plan-D-regression-memory.md:769:// T2: shouldSkip — verbphrase only (codex #5)
docs/plans/plan-D-regression-memory.md:770:assert("shouldSkip verbphrase '자가개선 cycle 진입'",
docs/plans/plan-D-regression-memory.md:771:  shouldSkip("자가개선 cycle 진입 시작합니다", {}) !== null);
docs/plans/plan-D-regression-memory.md:772:assert("shouldSkip verbphrase 'ralph 로 돌려'",
docs/plans/plan-D-regression-memory.md:773:  shouldSkip("ralph 로 돌려 주세요", {}) !== null);
docs/plans/plan-D-regression-memory.md:775:// T3: shouldSkip — noun-only NOT skipped (false positive 차단)
docs/plans/plan-D-regression-memory.md:776:assert("shouldSkip noun-only '자가개선' NOT skipped",
docs/plans/plan-D-regression-memory.md:777:  shouldSkip("자가개선 관련 버그 수정", {}) === null);
docs/plans/plan-D-regression-memory.md:778:assert("shouldSkip noun-only 'ralph' NOT skipped",
docs/plans/plan-D-regression-memory.md:779:  shouldSkip("ralph 의 보석", {}) === null);
docs/plans/plan-D-regression-memory.md:781:// T4: shouldSkip — pass-through
docs/plans/plan-D-regression-memory.md:782:assert("shouldSkip ordinary prompt returns null",
docs/plans/plan-D-regression-memory.md:783:  shouldSkip("이 버그 수정해줘", {}) === null);
docs/plans/plan-D-regression-memory.md:785:// T5: detectFixIntent
docs/plans/plan-D-regression-memory.md:786:assert("detectFixIntent matches '버그'", detectFixIntent("이 버그 또 났네"));
docs/plans/plan-D-regression-memory.md:787:assert("detectFixIntent matches 'fix'", detectFixIntent("please fix this"));
docs/plans/plan-D-regression-memory.md:788:assert("detectFixIntent no-match on greeting", !detectFixIntent("안녕하세요"));
docs/plans/plan-D-regression-memory.md:846:    // dismiss expects sidecar at <repoRoot>/.kzk-harness/regression-meta.jsonl
docs/plans/plan-D-regression-memory.md:878:// T14: atomic write under concurrent mutations (codex #6)
docs/plans/plan-D-regression-memory.md:895:// T15: buildReminder — empty hits → null
docs/plans/plan-D-regression-memory.md:898:// T16: buildReminder — populated
docs/plans/plan-D-regression-memory.md:917:- settings.json 실제 등록은 `enable_hooks` test 가 별도 책임 (Task 9).
docs/plans/plan-D-regression-memory.md:920:### Task 7 — fixture 파일 신규
docs/plans/plan-D-regression-memory.md:928:# illustrative only — Plan D Step 0 actual gstack output wins on drift (codex #8)
docs/plans/plan-D-regression-memory.md:934:`$FIXTURE_META` (sidecar **7필드 — stale 포함**):
docs/plans/plan-D-regression-memory.md:936:{"key":"plan-d-step-0-test","file_snapshot":"install/hooks/regression-recall.mjs:42@abc1234","related_cycles":[31],"dismiss_count":0,"last_dismissed_at":null,"archived":false,"stale":false}
docs/plans/plan-D-regression-memory.md:937:{"key":"hypothetical-stale-bug","file_snapshot":"deleted/file.ts:10@old5678","related_cycles":[28],"dismiss_count":2,"last_dismissed_at":"2026-04-15T10:00:00Z","archived":false,"stale":true}
docs/plans/plan-D-regression-memory.md:943:### Task 8 — `install/install-global.sh` `enable_hooks()` 확장 (~70 LoC 변경) — codex #3, #9 답
docs/plans/plan-D-regression-memory.md:947:**변경 1 — `parse_flags()` 에 `--regression-recall` 추가**: 기존 `--enable-hooks` 옆에 `--regression-recall` flag 추가, default off (`DO_REGRESSION_RECALL=0`).
docs/plans/plan-D-regression-memory.md:961:  # Plan D: regression-recall hook + sidecar-write lib + dismiss bin
docs/plans/plan-D-regression-memory.md:963:    cp "$src/install/hooks/regression-recall.mjs" \
docs/plans/plan-D-regression-memory.md:965:    cp "$src/install/lib/sidecar-write.mjs" \
docs/plans/plan-D-regression-memory.md:986:  kd_already=$(jq --arg cmd "$kd_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
docs/plans/plan-D-regression-memory.md:994:      .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
docs/plans/plan-D-regression-memory.md:997:    record "hooks: UserPromptSubmit hook registered (--enable-hooks)"
docs/plans/plan-D-regression-memory.md:1000:  # Plan D: regression-recall idempotent append
docs/plans/plan-D-regression-memory.md:1002:    local rr_cmd="node $HOME/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs"
docs/plans/plan-D-regression-memory.md:1004:    rr_already=$(jq --arg cmd "$rr_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
docs/plans/plan-D-regression-memory.md:1006:      emit "  hooks: regression-recall.mjs already registered — skip"
docs/plans/plan-D-regression-memory.md:1007:      record "hooks: regression-recall skip (already registered)"
docs/plans/plan-D-regression-memory.md:1011:        .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
docs/plans/plan-D-regression-memory.md:1013:      emit "  hooks: regression-recall.mjs registered (--regression-recall)"
docs/plans/plan-D-regression-memory.md:1014:      record "hooks: regression-recall hook registered (--regression-recall, depends on --enable-hooks)"
docs/plans/plan-D-regression-memory.md:1021:**변경 3 — `--regression-recall` 가 `--enable-hooks` 자동 enable**: `parse_flags()` 끝 또는 `main()` 진입부에:
docs/plans/plan-D-regression-memory.md:1024:# Plan D: --regression-recall 는 --enable-hooks 의 dependency
docs/plans/plan-D-regression-memory.md:1026:  emit "  --regression-recall implies --enable-hooks (explicit dependency)"
docs/plans/plan-D-regression-memory.md:1042:### Task 9 — `install/dependencies.sh` gstack auto-install (~30 LoC 추가)
docs/plans/plan-D-regression-memory.md:1049:# ---------------------------------------------------------------------------
docs/plans/plan-D-regression-memory.md:1050:# 2.5. gstack CLI — used by kzk-regression-memory (Plan D)
docs/plans/plan-D-regression-memory.md:1051:# ---------------------------------------------------------------------------
docs/plans/plan-D-regression-memory.md:1074:    printf 'WARN: gstack CLI install failed — kzk-regression-memory recall will be limited to sidecar only. Manual install: npm i -g gstack OR brew install gstack.\n' >&2
docs/plans/plan-D-regression-memory.md:1075:    record "gstack CLI: NOT INSTALLED (npm & brew both failed). kzk-regression-memory will run in sidecar-only mode. cycle commits will WARN until installed."
docs/plans/plan-D-regression-memory.md:1084:### Task 10 — `install/test/run-tests.sh` 갱신 (~10 LoC)
docs/plans/plan-D-regression-memory.md:1093:# ---------------------------------------------------------------------------
docs/plans/plan-D-regression-memory.md:1094:# Plan D — regression-recall.test.mjs
docs/plans/plan-D-regression-memory.md:1095:# ---------------------------------------------------------------------------
docs/plans/plan-D-regression-memory.md:1098:  if node "$REPO_ROOT/install/test/regression-recall.test.mjs"; then
docs/plans/plan-D-regression-memory.md:1099:    printf '  PASS: regression-recall.test.mjs\n'
docs/plans/plan-D-regression-memory.md:1102:    printf '  FAIL: regression-recall.test.mjs\n'
docs/plans/plan-D-regression-memory.md:1115:### Task 11 — `kzk-pre-merge-sync/SKILL.md` 마지막 step 추가 (~35 LoC) — codex #3 답
docs/plans/plan-D-regression-memory.md:1122:## 3. Regression-recall hook auto-enable (Plan D, fail-closed)
docs/plans/plan-D-regression-memory.md:1124:**5 plan (A→D→B→C→E)** 모두 끝나고 `feature/memory` → `main` 머지 직전, regression-recall hook 의 default DISABLED 를 ENABLED 로 전환:
docs/plans/plan-D-regression-memory.md:1127:bash install/install-global.sh --enable-hooks --regression-recall
docs/plans/plan-D-regression-memory.md:1130:`--regression-recall` 는 explicit dependency 로 `--enable-hooks` (keyword-detector) 도 자동 enable.
docs/plans/plan-D-regression-memory.md:1133:- 거부 → 후속 enable 은 사용자가 직접 위 command 실행. PR description 또는 milestone commit message 에 "regression-recall hook left disabled by user request" 명시 의무
docs/plans/plan-D-regression-memory.md:1137:1. `install-global.sh --enable-hooks --regression-recall` exit code 검사 — non-zero → merge block (`exit 1`)
docs/plans/plan-D-regression-memory.md:1138:2. settings.json 의 `UserPromptSubmit` 배열에 `regression-recall.mjs` entry 1개만 존재 검증 (jq 로 count). 0개 또는 2개+ → merge block
docs/plans/plan-D-regression-memory.md:1145:Skip = block merge. 단, 사용자가 명시적으로 "regression-recall 비활성 유지" 선언한 경우만 skip 허용 (PR description 또는 milestone commit message 에 명시).
docs/plans/plan-D-regression-memory.md:1148:- ENABLED: `regression-recall hook enabled via kzk-pre-merge-sync step 3`
docs/plans/plan-D-regression-memory.md:1149:- 사용자 명시 거부: `regression-recall hook left disabled by user request`
docs/plans/plan-D-regression-memory.md:1155:- [ ] regression-recall hook enabled via step 3 (or user-declined per spec rev6 §Default DISABLED, fail-closed verified)
docs/plans/plan-D-regression-memory.md:1161:- **kzk-regression-memory**: 본 skill step 3 가 regression-recall hook 의 first-enable gate. spec rev6 §Default DISABLED 의 자동 enable 진입점. fail-closed (jq 부재 / install-global.sh non-zero / duplicate entry → merge block).
docs/plans/plan-D-regression-memory.md:1164:### Task 12 — `kzk-web-loop/SKILL.md` cycle 회고 hook (~25 LoC) — codex #9 답
docs/plans/plan-D-regression-memory.md:1184:동시에 sidecar (`.kzk-harness/regression-meta.jsonl`) 에 append. **file_snapshot canonical source** = cycle 끝 evaluator 가 cycle 내 첫 변경 파일에 대해 `git rev-parse HEAD:<file>` 로 sentinel SHA 캡처:
docs/plans/plan-D-regression-memory.md:1190:sidecar append 는 `install/lib/sidecar-write.mjs` 의 `mutateSidecar()` 통과 의무 (atomic write).
docs/plans/plan-D-regression-memory.md:1200:- **kzk-regression-memory**: cycle 끝 step 5.5 에서 `gstack learn add` 호출 + sidecar atomic append. file_snapshot = `git rev-parse HEAD:<file>` (canonical, evaluator 가 cycle 끝에 캡처). 회고 entry 자동 작성.
docs/plans/plan-D-regression-memory.md:1203:### Task 13 — `kzk-large-task-delegation/SKILL.md` recall inject 룰 (~20 LoC) — codex #9 답
docs/plans/plan-D-regression-memory.md:1219:### Task 14 — `harness-share.md` §28 신규 (~100 LoC) — codex #10, #12 답 (rollback 7-level + dismiss CLI)
docs/plans/plan-D-regression-memory.md:1228:## 28. Regression Memory Protocol (kzk-regression-memory, Plan D)
docs/plans/plan-D-regression-memory.md:1230:자율실행 cycle 의 regression 망각 차단. fix-start 시점 prompt 매칭 → 자동 recall + dismiss CLI mutation path.
docs/plans/plan-D-regression-memory.md:1232:### Storage 모델 (5필드 + 7필드)
docs/plans/plan-D-regression-memory.md:1237:- FK: sidecar `key` 는 `/learn` 에 반드시 존재. 부재 시 orphan cleanup
docs/plans/plan-D-regression-memory.md:1240:### Recall 룰
docs/plans/plan-D-regression-memory.md:1242:- Trigger: `UserPromptSubmit` hook (`install/hooks/regression-recall.mjs`)
docs/plans/plan-D-regression-memory.md:1250:### Dismiss/Archive CLI (mutation path)
docs/plans/plan-D-regression-memory.md:1259:- atomic write via `install/lib/sidecar-write.mjs`
docs/plans/plan-D-regression-memory.md:1261:### 자가-skip guard (동사구만)
docs/plans/plan-D-regression-memory.md:1265:- self-improvement **동사구** grep — 명사 단독 금지:
docs/plans/plan-D-regression-memory.md:1268:### Stale check
docs/plans/plan-D-regression-memory.md:1273:- sidecar 의 `stale` 7번째 필드 update (atomic via lockdir)
docs/plans/plan-D-regression-memory.md:1274:- recall hook 은 cached `stale` 필드 read (라이브 git blame X)
docs/plans/plan-D-regression-memory.md:1276:### Atomic sidecar writer (공용 utility)
docs/plans/plan-D-regression-memory.md:1278:`install/lib/sidecar-write.mjs` — lockdir + tmp + atomic mv. hook + stale-check + dismiss CLI + cycle 회고 append 모두 본 utility 사용. 동시 실행 시 직렬화.
docs/plans/plan-D-regression-memory.md:1280:### Cycle 회고 5W1H (kzk-web-loop step 5.5 진입)
docs/plans/plan-D-regression-memory.md:1287:| How | `gstack learn add ...` + sidecar atomic append (file_snapshot = `git rev-parse HEAD:<file>`) |
docs/plans/plan-D-regression-memory.md:1291:### Default DISABLED at D commit, 자동 enable on main 머지 (5 plan 후, fail-closed)
docs/plans/plan-D-regression-memory.md:1294:- **5 plan (A→D→B→C→E)** 끝나고 `kzk-pre-merge-sync` step 3 가 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트)
docs/plans/plan-D-regression-memory.md:1295:- `--regression-recall` 는 keyword-detector 도 explicit dependency 로 자동 enable
docs/plans/plan-D-regression-memory.md:1298:### Rollback (7 level — codex #10 답)
docs/plans/plan-D-regression-memory.md:1303:| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=regression-recall` |
docs/plans/plan-D-regression-memory.md:1308:| **Global install 산출물 cleanup** | `~/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs` + `lib/sidecar-write.mjs` + `bin/kzk-regression-memory.mjs` 제거 + 중복 settings.json `UserPromptSubmit` entry 정리 (`uninstall-global.sh --regression-recall` 또는 jq: `jq '.hooks.UserPromptSubmit \|= map(select(.hooks[0].command \| test("regression-recall") \| not))' ~/.claude/settings.json`) |
docs/plans/plan-D-regression-memory.md:1311:### Task 15 — Skill count 동기화 14→15 (~6 LoC 변경)
docs/plans/plan-D-regression-memory.md:1315:**`$CLAUDE_MD` line 3** — 14→15:
docs/plans/plan-D-regression-memory.md:1317:- 변경: `... It contains 15 \`kzk-*\` skills ...`
docs/plans/plan-D-regression-memory.md:1319:**`$CLAUDE_MD` "All N skills" line** — 검색 후 14→15.
docs/plans/plan-D-regression-memory.md:1323:**`$README` line 3** — 14→15.
docs/plans/plan-D-regression-memory.md:1325:**`$README` install command 의 skill count** — `--n 14` 또는 유사 표기 검색 후 15 로 변경.
docs/plans/plan-D-regression-memory.md:1327:**`install/install-global.sh` line 602-609** — 14→15:
docs/plans/plan-D-regression-memory.md:1329:if [ "${row_count:-0}" -ne 15 ]; then
docs/plans/plan-D-regression-memory.md:1330:  emit "VERIFY FAIL: expected 15 '| kzk-' rows in marker block, found ${row_count:-0}" >&2
docs/plans/plan-D-regression-memory.md:1333:**`install/test/run-tests.sh`** — 기존 `assert_eq "14 SKILL.md files landed" "14"` 을 `"15"` 로, `"14 kzk- rows in marker block" "14"` 을 `"15"` 로.
docs/plans/plan-D-regression-memory.md:1335:**Plan B 가 16→ 추가로 늘림 — Plan D 책임 아님. Plan B 가 별도 동기화.**
docs/plans/plan-D-regression-memory.md:1337:### Task 16 — Pre-commit Gate + atomic commit
docs/plans/plan-D-regression-memory.md:1342:- Gate 1.5: secrets scan (sidecar fixture / hook 코드)
docs/plans/plan-D-regression-memory.md:1344:- Gate 3: test — `bash install/test/run-tests.sh` PASS (regression-recall.test.mjs 포함)
docs/plans/plan-D-regression-memory.md:1349:feat(skill): kzk-regression-memory v1.0 + recall hook + dismiss CLI (Plan D rev2)
docs/plans/plan-D-regression-memory.md:1351:신규 skill (15 skills): regression memory + auto-recall + dismiss/archive mutation.
docs/plans/plan-D-regression-memory.md:1352:Backend = gstack /learn + sidecar (.kzk-harness/regression-meta.jsonl, 7 fields incl. stale).
docs/plans/plan-D-regression-memory.md:1357:- install/hooks/regression-recall.mjs (신규, default DISABLED, allLearnKeys 기반 orphan cleanup)
docs/plans/plan-D-regression-memory.md:1358:- install/lib/sidecar-write.mjs (신규, atomic write 공용 utility)
docs/plans/plan-D-regression-memory.md:1361:- install/test/regression-recall.test.mjs + fixtures/ (신규, 7-field schema)
docs/plans/plan-D-regression-memory.md:1362:- install/install-global.sh: --regression-recall flag + idempotent append + fail-closed
docs/plans/plan-D-regression-memory.md:1365:- skills/kzk-web-loop: cycle 회고 → gstack learn add (step 5.5, atomic sidecar append)
docs/plans/plan-D-regression-memory.md:1367:- harness-share.md §28 신규 (5필드+7필드 + dismiss CLI + 7-level rollback)
docs/plans/plan-D-regression-memory.md:1368:- CLAUDE.md / README.md skill count 14→15
docs/plans/plan-D-regression-memory.md:1375:## Test 전략 (한계 명시)
docs/plans/plan-D-regression-memory.md:1379:| `regression-recall.mjs` exports (shouldSkip / detectFixIntent / normalizeQuery / decay / orphanCleanup / buildReminder) | `regression-recall.test.mjs` unit | 함수 단위 검증만. settings.json 통합은 manual |
docs/plans/plan-D-regression-memory.md:1380:| `sidecar-write.mjs` (mutateSidecar / writeAtomic / acquireLock) | `regression-recall.test.mjs` T14 — 동시성 5 ops | lockdir + atomic mv 검증. flock (Linux) 미지원 환경에서도 lockdir 패턴 동작 |
docs/plans/plan-D-regression-memory.md:1381:| `kzk-regression-memory dismiss` CLI | `regression-recall.test.mjs` T12, T13 | dismiss_count++ + archived threshold 검증 |
docs/plans/plan-D-regression-memory.md:1382:| sidecar fixture schema (7필드) | `regression-recall.test.mjs` T9 | jsonl parse + stale 필드 존재 확인 |
docs/plans/plan-D-regression-memory.md:1384:| `install-global.sh --regression-recall` flag | (별도 test 없음 — 본 plan 책임 X) | settings.json 수정은 manual cycle 확인. fail-closed exit code 는 kzk-pre-merge-sync 에서 검증 |
docs/plans/plan-D-regression-memory.md:1385:| `regression-stale-check.sh` | (본 plan 책임 X — 통합 cycle test 의존) | sidecar 의 stale flag update behavioral 검증 manual |
docs/plans/plan-D-regression-memory.md:1386:| Cycle 회고 통합 | (manual cycle 검증) | cycle 끝 step 5.5 의 실제 gstack 호출 + sidecar append behavioral test 부재 |
docs/plans/plan-D-regression-memory.md:1388:**Mock fixture 갱신 의무** (codex #8 답): `/learn` schema, CLI signature, fixture 포맷 변경 시만 재캡처. Plan D 사소 변경은 의무 X. Task 7 fixture 헤더에 `# illustrative only — Plan D Step 0 actual gstack output wins on drift` 명시.
docs/plans/plan-D-regression-memory.md:1392:## Rollback (7 level — spec rev6 + codex #10)
docs/plans/plan-D-regression-memory.md:1397:| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=regression-recall` |
docs/plans/plan-D-regression-memory.md:1401:| Plan D 자가오염 | hook default DISABLED 라 즉시 위협 X. enable 후 발견 시 `OMC_SKIP_HOOKS=regression-recall` 즉시 비활성. 영구 차단 시 `git revert` |
docs/plans/plan-D-regression-memory.md:1402:| **Global install 산출물 cleanup** | `~/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs` + `lib/sidecar-write.mjs` + `bin/kzk-regression-memory.mjs` 제거 + 중복 settings.json `UserPromptSubmit` entry 정리 (`uninstall-global.sh --regression-recall` reverse path 호출 — 또는 jq: `jq '.hooks.UserPromptSubmit \|= map(select(.hooks[0].command \| test("regression-recall") \| not))' ~/.claude/settings.json > tmp && mv tmp ~/.claude/settings.json`) |
docs/plans/plan-D-regression-memory.md:1404:## Out of scope (다음 Plan 으로 위임)
docs/plans/plan-D-regression-memory.md:1406:- **Plan B**: `kzk-fix-scope-expansion` 신규 skill (D recall consumer + Gate 4.5). skill count 15→16
docs/plans/plan-D-regression-memory.md:1413:- `flock` (Linux) 기반 sidecar lock — 본 rev2 는 lockdir 만 (macOS 호환). flock 분기는 fast-follow
docs/plans/plan-D-regression-memory.md:1415:## Codex review 의무
docs/plans/plan-D-regression-memory.md:1425:## 메타 룰 (spec rev6 인용)
docs/plans/plan-D-regression-memory.md:1427:- Plan commit = atomic. 메시지 prefix `feat(skill):`
docs/plans/plan-D-regression-memory.md:1433:## Critic 매트릭스 (codex cycle 1 12 항목 답 위치 매핑)
docs/plans/plan-D-regression-memory.md:1437:| #1 dismiss/archive mutation 부재 + stale 7th 필드 | Task 1 §Storage 모델 7필드 + §Dismiss CLI / Task 4 신규 dismiss CLI + Task 6 T12/T13 / Task 14 §28 dismiss CLI |
docs/plans/plan-D-regression-memory.md:1438:| #2 Step 0 내부 모순 (정지 vs degraded) | Task 0 분기 명시 — backend lock=recall OFF, retro WARN 만 degraded |
docs/plans/plan-D-regression-memory.md:1439:| #3 fail-closed + 5 plan wording | Header rev2 표기 (5 plan) / Goal `5 plan` / Task 11 fail-closed (jq 부재 / non-zero / duplicate → merge block) / Task 8 enable_hooks return 1 |
docs/plans/plan-D-regression-memory.md:1440:| #4 Recall hook orphan cleanup `searchHits` vs `allLearnKeys` 분리 + query normalization | Task 1 §Recall 룰 step 2 (normalizeQuery) + step 8 (allLearnKeys 기준만) / Task 3 `listAllLearnKeys()` + `normalizeQuery()` / Task 6 T6 + T10 |
docs/plans/plan-D-regression-memory.md:1441:| #5 자가-skip 동사구만 + KZK_AUTONOMOUS=1 | Task 1 §자가-skip guard 동사구 list + env 우선 / Task 3 `SELF_IMPROVE_VERBPHRASES` 동사구만 + KZK_AUTONOMOUS / Task 6 T2/T3 verbphrase + noun-only 검증 |
docs/plans/plan-D-regression-memory.md:1442:| #6 Atomic sidecar writer 공용 규약 | Task 2 신규 `install/lib/sidecar-write.mjs` (lockdir + tmp + atomic mv) / Task 3 hook 이 mutateSidecar 사용 / Task 5 stale-check lockdir / Task 4 dismiss CLI mutateSidecar / Task 6 T14 동시성 |
docs/plans/plan-D-regression-memory.md:1443:| #7 gstack 미설치 stderr WARN 의무 | Task 1 §Recall 룰 step 4 / Task 3 `querylearn()` stderr WARN + `_warn` reason / Task 9 dependencies.sh stderr WARN + record |
docs/plans/plan-D-regression-memory.md:1444:| #8 Fixture drift 룰 좁힘 | Task 7 fixture 헤더 `# illustrative only` + 재캡처 룰 좁힘 (schema/CLI/format 변경 시만) / Test 전략 표 |
docs/plans/plan-D-regression-memory.md:1445:| #9 Cross-skill silent breakage (idempotent append + reminder size cap + retro snapshot) | Task 8 idempotent jq 검사 / Task 12 file_snapshot canonical = `git rev-parse HEAD:<file>` / Task 13 size cap 200 char + truncate warning |
docs/plans/plan-D-regression-memory.md:1446:| #10 Rollback 7-level | Task 1 §Rollback 7 level / Task 14 §28 Rollback 7 level / 본 plan §Rollback 7-level |
docs/plans/plan-D-regression-memory.md:1447:| #11 Skill count | Task 15 — 정확 (변경 없음) |
docs/plans/plan-D-regression-memory.md:1448:| #12 dismiss 경로 부재 + stale 7th | #1 답으로 통합. Task 1 §Storage 모델 + §Dismiss CLI / Task 4 신규 / Task 6 T9/T12/T13 |

codex
지금은 Plan B 본문과 spec/D의 고정 규칙을 줄단위로 맞대는 중입니다. 특히 Axis B acceptance 누락, D import drift, hook enable fail-closed, cache atomicity를 우선 확인합니다.
exec
/bin/zsh -lc "sed -n '18,120p' docs/plans/plan-B-fix-scope-expansion.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
## Acceptance Criteria

1. `skills/kzk-fix-scope-expansion/SKILL.md` 신규 — frontmatter (name=`kzk-fix-scope-expansion`, version=`1.0.0`, description with triggers), §Triggers, §Why, §Fix-start hook (trigger 룰 + CRG 우선 + grep fallback + cache 위치 + recall consumer 룰), §Fix-verify hook (manual self-check inject), §Gate 4.5 (sanity check 룰), §자가-skip guard (D 와 동일 동사구만), §Default DISABLED 정책, §Rollback (5 level), §Interaction with other kzk-* (특히 D consumer + Gate 4.5 of pre-commit-gate)
2. `install/hooks/fix-scope-trigger.mjs` 신규 — UserPromptSubmit hook. 자가-skip → fix intent detect (FIX_KEYWORDS reuse from Plan D 구현, **import** from `regression-recall.mjs` to avoid drift) → 심볼 추출 (prompt 의 backtick / camelCase / snake_case / func() 패턴) → CRG `query_graph` 또는 CLI `code-review-graph query/blast-radius` 우선 → grep fallback → result truncation (200 char cap, **D recall reminder size cap 룰과 sibling**) → `.kzk-harness/fix-scope-cache.json` atomic write (via `install/lib/sidecar-write.mjs` 의 `writeAtomic` 재사용) → system-reminder inject. CRG 미설치 시 stderr WARN + `_warn:"crg-not-installed-grep-fallback"`. **default DISABLED at commit** (settings.json 등록은 `--fix-scope-trigger` flag 호출 시만)
3. `install/test/fix-scope-trigger.test.mjs` 신규 — mock prompt → expected callsite grep call 검증. 최소 12 case (자가-skip env / verbphrase / fix intent detect / 심볼 추출 / CRG path mock / grep fallback / truncation cap / cache 파일 atomic write / D recall consumer 순서 simulating / Gate 4.5 sanity check pass-fail / non-fix prompt → silent pass / cache 파일 schema validation)
4. `install/test/fixtures/fix-scope-callsites.sample.json` 신규 — mock CRG response + grep response sample. fixture 헤더 comment: `# illustrative only — Plan B Step 0 actual code-review-graph output wins on drift`
5. `install/test/run-tests.sh` 갱신 — `test_fix_scope_trigger` 함수 추가 (Plan D 의 `test_regression_recall` 다음 호출 슬롯 등록). 실행 호출 line 도 추가
6. `install/install-global.sh` `enable_hooks()` 확장 — `--fix-scope-trigger` flag 추가, default off (`DO_FIX_SCOPE_TRIGGER=0`). hook 파일 copy + idempotent jq append (D 의 `--regression-recall` 패턴 그대로). `--fix-scope-trigger` 도 `--enable-hooks` 의 explicit dependency. **fail-closed**: jq 부재 / exit non-zero / duplicate entry → return 1
7. `install/dependencies.sh` 갱신 — `code-review-graph` dependency 강화 (B 의 callsite 전수 grep 에 사용). 기존 entry 가 이미 있으면 SUMMARY message 만 강화 ("Plan B kzk-fix-scope-expansion uses code-review-graph for callsite expansion. Without CRG, fallback = grep."). 없으면 신규 entry 추가 (pip --user → pipx fallback, dependencies.md 와 sync)
8. `skills/kzk-pre-commit-gate/SKILL.md` 갱신 — `## Gate 4.5 — Fix Scope Sanity Check (Plan B)` 신규 section, 기존 Gate 4 다음, `## Doc-only commit exception` 직전 위치. 룰: cache 파일 (`.kzk-harness/fix-scope-cache.json`) 존재하면 callsite list vs `git diff --cached --name-only` 매칭. 미스매치 → BLOCK (commit body 에 의도 명시 의무). cache 부재 시 N/A (fix-scope-trigger hook 비활성 또는 fix intent 아닌 commit). frontmatter version `1.2.0` → `1.3.0`. description 에 `Gate 4.5` trigger 추가. Triggers list 에 `Gate 4.5`, `fix-scope-cache`, `callsite mismatch` 추가
9. `skills/kzk-codebase-survey/SKILL.md` 갱신 — Triggers list 에 fix-time trigger phrase 추가: `fix 시작`, `버그 수정`, `에러 fix`, `regression fix`, `callsite 전수`, `함수 수정 영향`. frontmatter version `1.5.0` → `1.6.0`. description 에 `fix-time callsite expansion` 추가. §Interaction with other kzk-* 끝에 `kzk-fix-scope-expansion (Plan B)` cross-ref 추가
10. `skills/kzk-regression-memory/SKILL.md` 갱신 — §Interaction with other kzk-* 의 `kzk-fix-scope-expansion (Plan B)` 항목 보강 (현재 1줄 → 3줄): "D recall hook 다음 슬롯에서 발동", "callsite cache (.kzk-harness/fix-scope-cache.json) 가 D recall reminder 와 함께 inject 되는 사용자 prompt context", "Gate 4.5 의 cache 입력자". 본문 변경 없음 (skill version bump X — Interaction-only patch)
11. `skills/kzk-large-task-delegation/SKILL.md` 갱신 — 기존 §Subagent prompt requirements 의 Recall 결과 inject 룰 옆에 **fix-scope cache inject 룰** 추가: subagent dispatch 시점에 `.kzk-harness/fix-scope-cache.json` 존재하면 cache 의 callsite list 도 dispatch prompt 에 verbatim inject (size cap 200 char — D recall 과 동일 룰, callsite 우선순위 = file 변경 빈도 high → low). §Interaction with other kzk-* 끝에 `kzk-fix-scope-expansion (Plan B)` 항목 추가
12. `harness-share.md` §3.5 신규 (또는 §29 다음 §30 신규 — 기존 §29 = Plan D Regression Memory) — 본 plan 은 §3.5 (Pre-commit Gate 와 sibling) 채택. Title: `## 3.5 Fix Scope Expansion (kzk-fix-scope-expansion, Plan B)`. 본문: Fix-start hook 룰 + CRG 우선 + grep fallback + Gate 4.5 sanity check + Default DISABLED + cross-ref to §29 (Plan D consumer 관계)
13. `CLAUDE.md` line 3 + "All N skills" line + `README.md` line 3 + install command skill count — **15 → 16** (Plan B 신규 skill 1개. Plan D 가 14→15, Plan B 가 15→16). 4 sync points 모두 변경
14. `bash install/test/run-tests.sh` PASS (`test_fix_scope_trigger` 포함 전체 통과. CLAUDE.md / README.md skill count assertion 도 16 으로 업데이트 — 기존 `assert "marker block has 14 kzk- rows"` 형태가 있으면 Plan D 가 15 로, Plan B 가 16 으로 업데이트)
15. atomic commit 메시지: `feat(skill): kzk-fix-scope-expansion + Gate 4.5 — fix scope expansion (Plan B)`

## Variables

- `SKILL_FSE = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-fix-scope-expansion/SKILL.md`
- `SKILL_PCG = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-pre-commit-gate/SKILL.md`
- `SKILL_CS = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-codebase-survey/SKILL.md`
- `SKILL_RM = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-regression-memory/SKILL.md`
- `SKILL_LTD = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-large-task-delegation/SKILL.md`
- `HOOK_FIXSCOPE = /Users/kimzerokim/work/personal/kzk-harness/install/hooks/fix-scope-trigger.mjs`
- `HOOK_RECALL = /Users/kimzerokim/work/personal/kzk-harness/install/hooks/regression-recall.mjs` (import source)
- `LIB_SIDECAR = /Users/kimzerokim/work/personal/kzk-harness/install/lib/sidecar-write.mjs` (`writeAtomic` reuse)
- `TEST_FIXSCOPE = /Users/kimzerokim/work/personal/kzk-harness/install/test/fix-scope-trigger.test.mjs`
- `FIXTURE_CALLSITES = /Users/kimzerokim/work/personal/kzk-harness/install/test/fixtures/fix-scope-callsites.sample.json`
- `TEST_RUN = /Users/kimzerokim/work/personal/kzk-harness/install/test/run-tests.sh`
- `INSTALL_GLOBAL = /Users/kimzerokim/work/personal/kzk-harness/install/install-global.sh`
- `DEPS = /Users/kimzerokim/work/personal/kzk-harness/install/dependencies.sh`
- `SHARE = /Users/kimzerokim/work/personal/kzk-harness/harness-share.md`
- `CLAUDE_MD = /Users/kimzerokim/work/personal/kzk-harness/CLAUDE.md`
- `README = /Users/kimzerokim/work/personal/kzk-harness/README.md`

## Tasks

### Task 0 — `code-review-graph` backend probe (CRITICAL)

**Plan D Step 0 와 sibling.** 이 step 의 출력이 모든 fixture / CLI 시그니처 가정의 single source of truth.

진입 의존: `code-review-graph` 설치되어 있어야 함. 미설치 환경 분기:

1. `code-review-graph --version` 시도. 명령 unavailable → **fix-scope hook 의 CRG path OFF** (hook 발동 시 grep fallback 으로 silent degradation, 단 stderr WARN 의무 + `_warn:"crg-not-installed-grep-fallback"` structured reason). Plan B 본 plan 자체 commit 진행 OK (hook default DISABLED 라 즉시 위협 X). 사용자에게 `dependencies.sh` 실행 권고.

2. CRG 가용 시:
   ```bash
   code-review-graph status 2>&1 | tee /tmp/crg-status.log
   code-review-graph --help 2>&1 | tee /tmp/crg-help.log
   ```
   query CLI 시그니처 캡처 — Plan B 본문의 `## Fix-start hook` 의 §CRG 호출 형식 행에 정확 시그니처 박음. 현재 가정 (kzk-codebase-survey SKILL.md §Step 1 인용): `code-review-graph query --file <target>`, `code-review-graph blast-radius --file <target>`. MCP path 는 `query_graph(pattern="callers_of"|"imports_of", target=<file or symbol>)`. 차이 있으면 plan 수정.

3. CRG status 의 `Files / Nodes / Edges / Last updated` 캡처. Nodes < 50 OR Last updated SHA 가 HEAD 와 > 10 commit drift → **build 의무**: `code-review-graph build` 후 재확인.

4. 실제 query 1회 실행 (sample 함수: 본 repo 의 `install/hooks/regression-recall.mjs::shouldSkip`):
   ```bash
   code-review-graph query --file install/hooks/regression-recall.mjs 2>&1 | tee /tmp/crg-query.log
   code-review-graph blast-radius --file install/hooks/regression-recall.mjs 2>&1 | tee /tmp/crg-blast.log
   ```

5. 출력 캡처본을 fixture (`$FIXTURE_CALLSITES`) 의 `crg_response_sample` field 로 복사. fixture 헤더 comment 에 "actual command output wins on drift" 명시.

6. grep fallback path 도 1회 실행:
   ```bash
   grep -rn "shouldSkip\b" --include="*.mjs" --include="*.ts" /Users/kimzerokim/work/personal/kzk-harness 2>&1 | head -50 | tee /tmp/grep-fallback.log
   ```
   출력을 fixture 의 `grep_response_sample` field 로 복사.

7. 실패 시 user-queue entry: `Q-PLAN-B-STEP0 — code-review-graph 미설치 또는 query 시그니처 캡처 실패, grep-only fallback 검토 필요`

**완료 게이트**: `$FIXTURE_CALLSITES` git-tracked + JSON valid (jq parse OK) + 두 sample 둘 다 캡처.

### Task 1 — `kzk-fix-scope-expansion/SKILL.md` 신규 (~180 lines)

**File**: `$SKILL_FSE`

`mkdir -p skills/kzk-fix-scope-expansion`.

**Frontmatter**:

```yaml
---
name: kzk-fix-scope-expansion
version: 1.0.0
description: "Fix scope 누수 차단 — fix-start 시점 callsite 전수 조회 (code-review-graph 우선, grep fallback) + Pre-commit Gate 4.5 sanity check. Plan D recall consumer. Top triggers: 'fix 시작', '버그 수정', '에러 fix', 'callsite 전수', 'Gate 4.5', 'fix-scope-cache'. Body §Triggers for full list."
---
```

**Body 구조**:

```markdown
> Authoritative source: `harness-share.md` §3.5. On conflict, that wins.

# kzk-fix-scope-expansion

## Triggers

`fix 시작`, `버그 수정`, `에러 fix`, `regression fix`, `callsite 전수`,
`callsite mismatch`, `함수 수정 영향`, `심볼 영향 분석`,
`Gate 4.5`, `fix-scope-cache`, `code-review-graph callsite`,
`fix scope expansion`, `한 곳만 고치고 끝나지 말고`.

exec
/bin/zsh -lc "sed -n '120,280p' docs/plans/plan-B-fix-scope-expansion.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
`fix scope expansion`, `한 곳만 고치고 끝나지 말고`.

## Why

자율실행 cycle 의 5 메타갭 중 *Fix scope 누수* — 한 callsite 만 수정, 호출자/복붙 패턴 누락.
본 skill 은 fix-start 시점 prompt 매칭 → callsite 전수 조회 → system-reminder inject + cache.
Pre-commit Gate 4.5 는 cache 와 git diff 매칭 sanity check 로 commit 시점 누락 차단.

## Fix-start hook (consumer 관계 with Plan D recall)

**진입점**: `install/hooks/fix-scope-trigger.mjs` (UserPromptSubmit hook).
**발동 슬롯**: `regression-recall.mjs` 다음 (D recall 결과가 system-reminder 로 inject 된 후 본 hook 이 callsite list 를 추가 inject — 둘이 같은 prompt 의 시스템-reminder 두 개 슬롯).

**Trigger 룰** (셋 중 하나):
1. 사용자 prompt 에 fix intent 키워드 매칭 (Plan D `regression-recall.mjs` 의 `FIX_KEYWORDS` 재사용 — drift 차단 위해 **import**)
2. 직전 Bash tool 결과가 non-zero exit (PreToolUse hook 미지원 → 본 path 는 manual recall — fix-verify hook 이 self-check inject)
3. 사용자 prompt 에 에러 페이스트 detect (stack trace pattern: `Error:`, `at \w+\.<anonymous>`, `Traceback (most recent call last):`)

**자가-skip guard** (D 와 동일 동사구만):
- 환경변수 `KZK_HARNESS_SELF_IMPROVEMENT=1` OR `KZK_AUTONOMOUS=1` → 즉시 skip
- self-improvement 동사구 grep (D 의 `SELF_IMPROVE_VERBPHRASES` import 재사용) → skip
- 명사 단독 금지 — 일반 prompt false positive 차단

**심볼 추출**:
- backtick code (`\`<symbol>\``)
- camelCase / snake_case 식별자 (4 char+)
- function call pattern (`\w+\(`)
- 여러 매칭 시 빈도 high → low order

**Callsite 조회 (CRG 우선)**:
1. `code-review-graph` 가용 시 → MCP path 시도: `query_graph(pattern="callers_of", target=<symbol>)` + `query_graph(pattern="imports_of", target=<file>)`. MCP unavailable → CLI: `code-review-graph query --file <inferred-file>` + `code-review-graph blast-radius --file <inferred-file>`. inferred-file 없으면 (심볼만 있고 file 모름) → semantic_search_nodes 또는 grep fallback
2. CRG status 가 stale (Last updated SHA 가 HEAD 와 > 10 commit drift) OR Nodes < 50 → **재 build 의무**: `code-review-graph build` 후 query 재시도
3. CRG 미설치 OR build 실패 → grep fallback: `grep -rn "<symbol>\b" --include="*.{ts,tsx,mjs,js,py,sh,md}"` (limit 50 line)

**Result truncation**: 결과 list 200 char cap (D recall reminder size cap 과 sibling). 우선순위 = file 변경 빈도 high (`git log --pretty=format: --name-only -50 | sort | uniq -c | sort -rn`) → low.

**Cache 위치**: `.kzk-harness/fix-scope-cache.json`. atomic write via `install/lib/sidecar-write.mjs::writeAtomic`. schema:
```json
{
  "session_id": "<UUID or timestamp>",
  "user_prompt_first200": "<truncated prompt>",
  "symbols": ["<sym1>", "<sym2>"],
  "callsites": [
    {"file": "src/foo.ts", "line": 42, "symbol": "shouldSkip", "source": "crg|grep"}
  ],
  "captured_at": "<ISO8601>",
  "crg_status": {"available": true|false, "files": <N>, "nodes": <N>, "stale": false}
}
```

cache 는 hook commit 시점에 새 fix-start 마다 overwrite (1 file = current fix scope only — multi-fix 같은 commit 은 last fix wins, 사용자가 의도 시 Gate 4.5 가 commit body 의도 명시 요구).

**inject format**:
```
🔧 [FIX SCOPE EXPANSION] 영향 받을 수 있는 파일/심볼 N건 (Plan D recall 결과 다음 슬롯):
- <file>:<line> <symbol> [crg|grep]
⚠ 한 callsite 만 고치고 끝나지 말고 전수 검토. 누락 의도 시 commit body 에 명시.
[truncated: <M> more callsites — see .kzk-harness/fix-scope-cache.json]
```

매칭 0건 → `{"continue":true, "_info":"no-callsites-detected"}` (silent pass-through).

## Fix-verify hook (manual self-check inject)

**Trigger**: test 통과 직후 (PostToolUse hook 가능 시 — install-global.sh 가 PostToolUse 미지원이면 manual). 본 plan B 는 PostToolUse 등록 *시도* 하되 미지원이면 fallback path: 사용자 prompt 가 "test 통과", "all green", "PR 직전" 매칭 시 UserPromptSubmit hook (fix-scope-trigger 의 sub-mode) 으로 발동.

**동작**: 다음 system-reminder inject:
```
🔍 [FIX VERIFY] 자가 점검:
- test 가 fix-scope-cache.json 의 callsite N 곳 모두 커버하는가?
- 누락 callsite 가 있다면 commit body 에 의도 명시했는가? (Gate 4.5 sanity check)
```

**한계**: PostToolUse 미지원 환경 → manual self-check 의존. behavioral test X.

## Gate 4.5 — Fix Scope Sanity Check (kzk-pre-commit-gate 위임)

위치: 기존 Gate 4 (Playwright) 다음, commit 직전.

**룰**:
1. `.kzk-harness/fix-scope-cache.json` 존재 검사. 부재 → N/A (fix-scope-trigger 비활성 또는 fix intent 아닌 commit). PASS.
2. cache 의 `callsites` list 의 unique file set vs `git diff --cached --name-only` 매칭
3. 미스매치 (cache callsite N 곳 중 git diff 에 M 곳만 포함, M < N) → BLOCK:
   ```
   ❌ Gate 4.5 FAIL: callsite N 곳 중 M 곳만 변경됨 (누락: <file1>, <file2>).
      해결: (a) 누락 callsite 도 수정 후 re-stage, OR
            (b) commit body 에 누락 의도 명시 (예: "fix-scope-skip: <file1> 은 deprecated path, fix 무관")
   ```
4. (b) escape 룰: commit body 에 `fix-scope-skip:` line 발견 → 누락 callsite list 와 매칭. 모든 누락 callsite 가 명시되었으면 PASS.

**구현**: kzk-pre-commit-gate skill SKILL.md 의 `## Gate 4.5` 섹션이 본 룰 명시. 본 skill 은 cache 입력자 + 룰 정의자.

**스킵 조건**:
- doc-only commit (Pre-commit Gate Doc-only 예외와 동일) → N/A
- cache 부재 → N/A
- 명시 escape (`fix-scope-skip:` line in commit body) → 누락 callsite 모두 cover 시 PASS

## 자가-skip guard

D 의 `SELF_IMPROVE_VERBPHRASES` 재사용 (drift 차단 위해 import). 환경변수 우선 (`KZK_HARNESS_SELF_IMPROVEMENT=1` / `KZK_AUTONOMOUS=1`). 명사 단독 매칭 금지.

## Default DISABLED 정책

**B commit 시점**: hook 파일 추가, settings.json 등록 X. `--fix-scope-trigger` flag 호출 안 한 상태.

**자동 enable on main 머지**: 5 plan (A→D→B→C→E) 모두 끝나고 `kzk-pre-merge-sync` step 3 (또는 신규 step 3.5) 가 `install-global.sh --enable-hooks --regression-recall --fix-scope-trigger` 자동 호출 (사용자 confirm 게이트). `--fix-scope-trigger` 도 `--enable-hooks` 의 explicit dependency.

**fail-closed**: install-global.sh exit non-zero / duplicate UserPromptSubmit append 발견 / jq 부재 → merge block.

거부 path: 사용자 confirm 거부 → manual enable 안내. cycle 진행 자체는 영향 X. PR description / milestone commit message 에 명시 의무.

## Rollback (5 level)

| Level | 메커니즘 |
|---|---|
| 단일 plan revert | `git revert <Plan-B-commit-sha>` |
| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=fix-scope-trigger` |
| Skill 즉시 비활성 | `DISABLE_OMC=kzk-fix-scope-expansion` |
| Gate 4.5 만 비활성 (cache 입력 유지) | `kzk-pre-commit-gate` 본문 의 Gate 4.5 섹션 manual skip — commit body 에 `fix-scope-skip: gate-4.5-disabled` 명시. 또는 Pre-commit Gate skill version downgrade |
| Cache 손실 / 오염 | `rm -f .kzk-harness/fix-scope-cache.json` — 다음 fix-start hook 이 새로 작성 |

## Interaction with other kzk-*

- **kzk-regression-memory** (Plan D): D recall hook 다음 슬롯에서 발동 (consumer). 같은 prompt 에 두 system-reminder slot — D 가 과거 fix 기억, B 가 현재 fix 의 callsite 영향. fix-scope-cache 가 D recall reminder 와 함께 inject 되는 사용자 prompt context. **순서 의존**: settings.json `UserPromptSubmit` 배열에서 regression-recall.mjs 가 fix-scope-trigger.mjs 보다 앞 — install-global.sh 의 `enable_hooks()` 호출 순서가 sibling append 라 자동 보장 (D 가 먼저 enable, B 가 나중).
- **kzk-pre-commit-gate**: Gate 4.5 의 룰 정의자 (본 skill) + 적용자 (pre-commit-gate skill). cache 가 입력. 둘 사이 contract = `.kzk-harness/fix-scope-cache.json` schema (본 skill §Cache 위치 행 참조).
- **kzk-codebase-survey**: fix-time trigger 를 본 skill 이 활성. survey skill 의 Step 1 (Scope Expansion) 과 동일 CRG 우선 + grep fallback 패턴 (룰 sync). 본 skill 은 hook path (자동), survey 는 EXPLORER subagent path (수동).
- **kzk-large-task-delegation**: subagent dispatch prompt 에 cache 의 callsite list 도 verbatim inject (size cap 200 char, D recall 과 sibling 룰).
- **kzk-autonomous-boundary**: 자가-skip guard 가 자율 mode 동사구 grep + `KZK_AUTONOMOUS=1` env — 자율 cycle 메인 prompt 자가오염 차단 (D 와 동일 룰).
- **kzk-pre-merge-sync**: step 3 의 `--enable-hooks --regression-recall` 호출에 `--fix-scope-trigger` 추가 (sibling enable). fail-closed 검증도 sibling.
```

### Task 2 — `install/hooks/fix-scope-trigger.mjs` 신규 (~230 LoC)

**File**: `$HOOK_FIXSCOPE`

**Pattern**: `regression-recall.mjs` 와 동일한 stdin/stdout 모양 (UserPromptSubmit hookSpecificOutput). FIX_KEYWORDS 와 SELF_IMPROVE_VERBPHRASES 는 `regression-recall.mjs` 에서 import — drift 차단.

**구조**:

```js
#!/usr/bin/env node
// fix-scope-trigger.mjs — UserPromptSubmit hook for kzk-fix-scope-expansion (Plan B).
// Spec: docs/plans/regression-memory-and-fix-quality-spec.md (rev7, Axis B).
// Default DISABLED at Plan B commit. Auto-enabled by kzk-pre-merge-sync step 3.
// Slot order: regression-recall.mjs (Plan D) → fix-scope-trigger.mjs (Plan B) — D consumer.

import { execSync } from "node:child_process";
import path from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { writeAtomic } from "../lib/sidecar-write.mjs";
import {
  shouldSkip as recallShouldSkip,
  detectFixIntent as recallDetectFixIntent,
  FIX_KEYWORDS,
  SELF_IMPROVE_VERBPHRASES,
} from "./regression-recall.mjs";

const SYMBOL_PATTERNS = [
  /`([A-Za-z_][A-Za-z0-9_]{3,})`/g,                  // backtick
  /\b([a-z][a-zA-Z0-9]{3,})\b/g,                     // camelCase 4+
  /\b([a-z][a-z0-9]+(?:_[a-z0-9]+)+)\b/g,            // snake_case 4+

exec
/bin/zsh -lc 'rg -n "''^## Acceptance Criteria|''^### Task|''^## Rollback|''^## Test 전략|''^## Goal|''^## Variables|''^## Codex review 의무|''^## Out of scope|''^## 메타 룰|''^## Critic" docs/plans/plan-B-fix-scope-expansion.md' in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
8:## Goal
18:## Acceptance Criteria
36:## Variables
57:### Task 0 — `code-review-graph` backend probe (CRITICAL)
92:### Task 1 — `kzk-fix-scope-expansion/SKILL.md` 신규 (~180 lines)
231:## Rollback (5 level)
251:### Task 2 — `install/hooks/fix-scope-trigger.mjs` 신규 (~230 LoC)
539:### Task 3 — `install/test/fix-scope-trigger.test.mjs` 신규 (~250 LoC)
720:### Task 4 — fixture 파일 신규
746:### Task 5 — `install/test/run-tests.sh` 갱신 (~15 LoC)
779:### Task 6 — `install/install-global.sh` `enable_hooks()` 확장 (~50 LoC) — D 의 `--regression-recall` 패턴 그대로
840:### Task 7 — `install/dependencies.sh` 강화 (~15 LoC)
879:### Task 8 — `kzk-pre-commit-gate/SKILL.md` Gate 4.5 추가 (~50 LoC)
931:### Task 9 — `kzk-codebase-survey/SKILL.md` fix-time trigger 추가 (~10 LoC)
954:### Task 10 — `kzk-regression-memory/SKILL.md` cross-ref 보강 (~5 LoC) — Interaction-only patch (version bump X)
966:### Task 11 — `kzk-large-task-delegation/SKILL.md` cache inject 룰 추가 (~10 LoC)
982:### Task 12 — `harness-share.md` §3.5 신규 (~80 LoC)
1054:### Task 13 — `CLAUDE.md` + `README.md` skill count sync (~8 LoC, 4 sync points)
1074:### Task 14 — atomic commit
1115:## Test 전략 (한계 명시)
1134:## Rollback (5 level — Plan B 본문 §Rollback 와 sibling)
1144:## Out of scope (다음 Plan 으로 위임)
1151:## Codex review 의무

exec
/bin/zsh -lc "sed -n '460,620p' docs/plans/plan-B-fix-scope-expansion.md" in /Users/kimzerokim/work/personal/kzk-harness
exec
/bin/zsh -lc "sed -n '280,460p' docs/plans/plan-B-fix-scope-expansion.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
  /\b([a-z][a-z0-9]+(?:_[a-z0-9]+)+)\b/g,            // snake_case 4+
  /\b([A-Za-z_][A-Za-z0-9_]{3,})\s*\(/g,             // function call
];

const ERROR_PASTE_PATTERNS = [
  /\bError:/i,
  /\bat \w+(?:\.<anonymous>)?\s*\(/,
  /Traceback \(most recent call last\):/,
  /^\s+File ".+", line \d+/m,
];

const RESULT_CAP_CHARS = 200;
const SYMBOL_CAP = 5;
const CALLSITE_CAP = 50;
const CRG_TIMEOUT_MS = 5000;
const CRG_STALE_DRIFT = 10;

function detectErrorPaste(prompt) {
  return ERROR_PASTE_PATTERNS.some((p) => p.test(prompt));
}

function extractSymbols(prompt) {
  const seen = new Set();
  const out = [];
  for (const re of SYMBOL_PATTERNS) {
    let m;
    while ((m = re.exec(prompt)) !== null) {
      const sym = m[1];
      if (!seen.has(sym) && sym.length >= 4) {
        seen.add(sym);
        out.push(sym);
      }
      if (out.length >= SYMBOL_CAP) return out;
    }
  }
  return out;
}

function crgAvailable() {
  try {
    execSync("code-review-graph --version", { stdio: "ignore", timeout: CRG_TIMEOUT_MS });
    return true;
  } catch {
    return false;
  }
}

function crgStatus() {
  try {
    const out = execSync("code-review-graph status", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: CRG_TIMEOUT_MS,
    });
    const files = parseInt((out.match(/Files:\s*(\d+)/) || [])[1] || "0", 10);
    const nodes = parseInt((out.match(/Nodes:\s*(\d+)/) || [])[1] || "0", 10);
    const sha = (out.match(/Built at commit:\s*([a-f0-9]+)/) || [])[1] || null;
    return { available: true, files, nodes, sha };
  } catch {
    return { available: false, files: 0, nodes: 0, sha: null };
  }
}

function isStale(status) {
  if (!status.available || !status.sha) return true;
  if (status.nodes < 50) return true;
  try {
    const drift = parseInt(execSync(`git rev-list --count ${status.sha}..HEAD 2>/dev/null || echo 0`, {
      encoding: "utf8", timeout: CRG_TIMEOUT_MS,
    }).trim() || "0", 10);
    return drift > CRG_STALE_DRIFT;
  } catch {
    return false;
  }
}

function tryCrgBuild() {
  try {
    execSync("code-review-graph build", { stdio: "ignore", timeout: 60000 });
    return true;
  } catch {
    return false;
  }
}

function crgQuerySymbol(symbol) {
  try {
    const out = execSync(`code-review-graph blast-radius --symbol ${JSON.stringify(symbol)} --json 2>/dev/null || code-review-graph query --symbol ${JSON.stringify(symbol)} --json`, {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: CRG_TIMEOUT_MS,
    });
    const parsed = JSON.parse(out.trim());
    return Array.isArray(parsed) ? parsed : (parsed.callsites || parsed.results || []);
  } catch {
    return null;
  }
}

function grepFallback(symbol, repoRoot) {
  try {
    const out = execSync(
      `grep -rn "${symbol}\\b" --include="*.ts" --include="*.tsx" --include="*.mjs" --include="*.js" --include="*.py" --include="*.sh" --include="*.md" ${JSON.stringify(repoRoot)} 2>/dev/null | head -${CALLSITE_CAP}`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: CRG_TIMEOUT_MS },
    );
    return out.split("\n").filter(Boolean).map((line) => {
      const m = line.match(/^([^:]+):(\d+):/);
      return m ? { file: path.relative(repoRoot, m[1]), line: parseInt(m[2], 10), symbol, source: "grep" } : null;
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function rankByChangeFrequency(callsites, repoRoot) {
  try {
    const out = execSync("git log --pretty=format: --name-only -50 | sort | uniq -c | sort -rn", {
      encoding: "utf8", cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"], timeout: CRG_TIMEOUT_MS,
    });
    const freq = new Map();
    for (const line of out.split("\n").filter(Boolean)) {
      const m = line.trim().match(/^(\d+)\s+(.+)$/);
      if (m) freq.set(m[2], parseInt(m[1], 10));
    }
    return [...callsites].sort((a, b) => (freq.get(b.file) || 0) - (freq.get(a.file) || 0));
  } catch {
    return callsites;
  }
}

function buildReminder(callsites, totalCount) {
  if (callsites.length === 0) return null;
  let cumChar = 0;
  const lines = [];
  let truncated = 0;
  for (const c of callsites) {
    const line = `- ${c.file}:${c.line} ${c.symbol} [${c.source}]`;
    if (cumChar + line.length > RESULT_CAP_CHARS) { truncated = callsites.length - lines.length; break; }
    lines.push(line);
    cumChar += line.length;
  }
  const header = `🔧 [FIX SCOPE EXPANSION] 영향 받을 수 있는 파일/심볼 ${totalCount}건 (Plan D recall 결과 다음 슬롯):`;
  const truncatedFooter = truncated > 0 ? `[truncated: ${truncated} more callsites — see .kzk-harness/fix-scope-cache.json]` : "";
  const warn = `⚠ 한 callsite 만 고치고 끝나지 말고 전수 검토. 누락 의도 시 commit body 에 명시.`;
  return [header, ...lines, warn, truncatedFooter].filter(Boolean).join("\n");
}

function writeCache(cachePath, payload) {
  const dir = path.dirname(cachePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeAtomic(cachePath, [payload]);  // single-entry JSONL — using writeAtomic from sidecar-write.mjs (reuse, drift 차단)
}

export {
  detectErrorPaste, extractSymbols, crgAvailable, crgStatus, isStale,
  crgQuerySymbol, grepFallback, rankByChangeFrequency, buildReminder, writeCache,
  RESULT_CAP_CHARS, SYMBOL_CAP, CALLSITE_CAP,
};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { raw += chunk; });
  process.stdin.on("end", async () => {
    let payload;
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }
    const prompt = String(payload.prompt ?? payload.user_prompt ?? "");
    const repoRoot = process.cwd();
    const cachePath = path.join(repoRoot, ".kzk-harness", "fix-scope-cache.json");

    // Self-skip guard (D 와 동일)
    const skip = recallShouldSkip(prompt, process.env);
    if (skip) {
      process.stdout.write(JSON.stringify({ continue: true, _skip: skip }) + "\n");
      return;
    }

    // Trigger: fix intent OR error paste
    const isFix = recallDetectFixIntent(prompt) || detectErrorPaste(prompt);
    if (!isFix) {
      process.stdout.write(JSON.stringify({ continue: true }) + "\n");
      return;
    }

 succeeded in 0ms:
    }

    const symbols = extractSymbols(prompt);
    if (symbols.length === 0) {
      process.stdout.write(JSON.stringify({ continue: true, _info: "no-symbols-detected" }) + "\n");
      return;
    }

    // CRG path with stale auto-rebuild
    let crgWarn = null;
    let status = crgStatus();
    if (!status.available) crgWarn = "crg-not-installed-grep-fallback";
    else if (isStale(status)) {
      const built = tryCrgBuild();
      if (built) status = crgStatus();
      else crgWarn = "crg-stale-rebuild-failed-grep-fallback";
    }

    let allCallsites = [];
    for (const sym of symbols) {
      let hits = null;
      if (status.available && !crgWarn) {
        hits = crgQuerySymbol(sym);
      }
      if (!hits || hits.length === 0) {
        hits = grepFallback(sym, repoRoot);
      }
      allCallsites = allCallsites.concat(hits);
    }

    // dedupe by file:line:symbol
    const seen = new Set();
    const deduped = [];
    for (const c of allCallsites) {
      const k = `${c.file}:${c.line}:${c.symbol}`;
      if (!seen.has(k)) { seen.add(k); deduped.push(c); }
    }
    const ranked = rankByChangeFrequency(deduped, repoRoot).slice(0, CALLSITE_CAP);

    // Cache write (atomic)
    writeCache(cachePath, {
      session_id: process.env.CLAUDE_SESSION_ID || `${Date.now()}`,
      user_prompt_first200: prompt.slice(0, 200),
      symbols,
      callsites: ranked,
      captured_at: new Date().toISOString(),
      crg_status: { available: status.available, files: status.files, nodes: status.nodes, stale: !!crgWarn },
    });

    if (crgWarn) {
      process.stderr.write(`[fix-scope-trigger] ${crgWarn}\n`);
    }

    const reminder = buildReminder(ranked, ranked.length);
    if (reminder) {
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: reminder },
          ...(crgWarn ? { _warn: crgWarn } : {}),
        }) + "\n",
      );
    } else {
      process.stdout.write(JSON.stringify({ continue: true, _info: "no-callsites-detected" }) + "\n");
    }
  });
}
```

**핵심 설계 노트** (executor 가 빠뜨리지 말 것):
- exports 필수: test 가 import. signature `{ detectErrorPaste, extractSymbols, crgAvailable, crgStatus, isStale, crgQuerySymbol, grepFallback, rankByChangeFrequency, buildReminder, writeCache, RESULT_CAP_CHARS, SYMBOL_CAP, CALLSITE_CAP }`
- D 의 `shouldSkip / detectFixIntent / FIX_KEYWORDS / SELF_IMPROVE_VERBPHRASES` 를 **import** — copy/paste 금지 (drift 차단)
- `writeAtomic` 도 D 의 sidecar-write.mjs 에서 import — 자체 atomic write 코드 작성 금지
- timeout 5s — CRG hang 방지
- CRG stale auto-rebuild — Step 0 의 status oracle 룰 따름
- single-entry JSONL via writeAtomic 은 cache file 이 진짜 JSON object 한 줄 — Gate 4.5 가 jq 로 read 가능 (`jq '.callsites' .kzk-harness/fix-scope-cache.json`)
- `chmod +x` 의무

`mkdir -p install/hooks` (이미 존재).

### Task 3 — `install/test/fix-scope-trigger.test.mjs` 신규 (~250 LoC)

**File**: `$TEST_FIXSCOPE`

mock fixture 기반 unit test. 실 CRG 호출 없음 — test 는 fixture file read 로 시뮬.

```js
#!/usr/bin/env node
// fix-scope-trigger.test.mjs — Plan B unit tests.
//
// Tests: self-skip / fix-intent detect / error-paste detect / symbol extract /
//        CRG path (mock) / grep fallback / truncation cap / cache write atomic /
//        D recall consumer slot order / Gate 4.5 sanity check pass-fail / non-fix prompt.

import { readFileSync, writeFileSync, existsSync, rmSync, mkdtempSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import {
  detectErrorPaste, extractSymbols, buildReminder, writeCache,
  RESULT_CAP_CHARS, SYMBOL_CAP, CALLSITE_CAP,
} from "../hooks/fix-scope-trigger.mjs";
import { shouldSkip, detectFixIntent } from "../hooks/regression-recall.mjs";
import { readSidecar } from "../lib/sidecar-write.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_CALLSITES = path.join(__dirname, "fixtures/fix-scope-callsites.sample.json");

let pass = 0, fail = 0;
const errors = [];

function assert(desc, cond) {
  if (cond) { console.log(`  PASS: ${desc}`); pass++; }
  else { console.log(`  FAIL: ${desc}`); fail++; errors.push(desc); }
}

async function assertAsync(desc, fn) {
  try { const ok = await fn(); assert(desc, ok); }
  catch (e) { assert(desc + ` (threw: ${e.message})`, false); }
}

function tempCacheDir() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "fix-scope-test-"));
  mkdirSync(path.join(dir, ".kzk-harness"), { recursive: true });
  return dir;
}

// T1: self-skip reuses Plan D verbphrase guard (drift check)
assert("shouldSkip env KZK_AUTONOMOUS=1 (D import)", shouldSkip("any prompt", { KZK_AUTONOMOUS: "1" }) !== null);
assert("shouldSkip noun-only NOT skipped (D import)", shouldSkip("자가개선 관련 버그 수정", {}) === null);

// T2: fix-intent detect (D import drift check)
assert("detectFixIntent matches '버그' (D import)", detectFixIntent("이 버그 또 났네"));
assert("detectFixIntent no-match on greeting", !detectFixIntent("안녕하세요"));

// T3: error-paste detect (B specific)
assert("detectErrorPaste matches 'Error:'", detectErrorPaste("TypeError: foo is not a function"));
assert("detectErrorPaste matches Python traceback", detectErrorPaste("Traceback (most recent call last):\n  File \"a.py\", line 5"));
assert("detectErrorPaste matches JS stack frame", detectErrorPaste("at Object.<anonymous> (foo.js:42:13)"));
assert("detectErrorPaste no-match on plain text", !detectErrorPaste("just a regular sentence"));

// T4: symbol extract
const syms1 = extractSymbols("`shouldSkip` returns null when not autonomous");
assert("extractSymbols backtick 'shouldSkip'", syms1.includes("shouldSkip"));
const syms2 = extractSymbols("call doSomething() and another_function() in src");
assert("extractSymbols function call 'doSomething'", syms2.includes("doSomething"));
assert("extractSymbols snake_case 'another_function'", syms2.includes("another_function"));
const syms3 = extractSymbols("a b cd ef");  // all <4 char
assert("extractSymbols rejects <4 char", syms3.length === 0);
const syms4 = extractSymbols("foo1 foo2 foo3 foo4 foo5 foo6 foo7");
assert("extractSymbols caps at SYMBOL_CAP=5", syms4.length <= SYMBOL_CAP);

// T5: buildReminder format
const rem1 = buildReminder([
  { file: "src/foo.ts", line: 10, symbol: "shouldSkip", source: "crg" },
  { file: "src/bar.ts", line: 20, symbol: "shouldSkip", source: "grep" },
], 2);
assert("buildReminder header present", rem1.includes("FIX SCOPE EXPANSION"));
assert("buildReminder includes file:line", rem1.includes("src/foo.ts:10"));
assert("buildReminder shows source [crg|grep]", rem1.includes("[crg]") && rem1.includes("[grep]"));
assert("buildReminder empty returns null", buildReminder([], 0) === null);


exec
/bin/zsh -lc "sed -n '620,920p' docs/plans/plan-B-fix-scope-expansion.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:

// T6: truncation cap
const manyCallsites = Array.from({ length: 30 }, (_, i) =>
  ({ file: `src/file${i}.ts`, line: i, symbol: "x", source: "grep" }));
const remTrunc = buildReminder(manyCallsites, 30);
assert("buildReminder truncates beyond RESULT_CAP_CHARS", remTrunc.includes("truncated:"));
assert("buildReminder cumulative length respects cap", remTrunc.length < 1000);

// T7: writeCache via writeAtomic — atomic + readable
await assertAsync("writeCache produces JSONL via writeAtomic", async () => {
  const dir = tempCacheDir();
  try {
    const cachePath = path.join(dir, ".kzk-harness", "fix-scope-cache.json");
    writeCache(cachePath, {
      session_id: "test-1",
      user_prompt_first200: "fix bug in foo",
      symbols: ["foo"],
      callsites: [{ file: "src/a.ts", line: 1, symbol: "foo", source: "grep" }],
      captured_at: new Date().toISOString(),
      crg_status: { available: false, files: 0, nodes: 0, stale: true },
    });
    const lines = readSidecar(cachePath);
    return lines.length === 1 && lines[0].symbols[0] === "foo" && lines[0].callsites.length === 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// T8: cache schema validation (required fields)
await assertAsync("cache JSONL has required schema fields", async () => {
  const dir = tempCacheDir();
  try {
    const cachePath = path.join(dir, ".kzk-harness", "fix-scope-cache.json");
    writeCache(cachePath, {
      session_id: "test-2", user_prompt_first200: "p", symbols: ["x"],
      callsites: [], captured_at: "2026-05-04T00:00:00Z",
      crg_status: { available: true, files: 100, nodes: 500, stale: false },
    });
    const entry = readSidecar(cachePath)[0];
    return ["session_id", "user_prompt_first200", "symbols", "callsites", "captured_at", "crg_status"].every((k) => k in entry);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// T9: D recall consumer slot order — settings.json append order
//     (룰 검증만 — 실 install-global.sh 호출은 별 test_install 책임)
assert("FIX_KEYWORDS imported from D (drift sentinel)", detectFixIntent("fix bug"));

// T10: fixture file exists with expected sample
await assertAsync("fixture file is valid JSON with samples", async () => {
  if (!existsSync(FIXTURE_CALLSITES)) return false;
  const txt = readFileSync(FIXTURE_CALLSITES, "utf8");
  const parsed = JSON.parse(txt.split("\n").filter((l) => !l.startsWith("#")).join("\n"));
  return "crg_response_sample" in parsed && "grep_response_sample" in parsed;
});

// T11: Gate 4.5 sanity check — cache callsites vs git diff list (mock)
//     (룰 *기록* 검증 — 실 git diff 통합은 manual cycle 검증)
function gate45SanityCheck(cacheFiles, gitDiffFiles, commitBody) {
  const cacheSet = new Set(cacheFiles);
  const diffSet = new Set(gitDiffFiles);
  const missing = [...cacheSet].filter((f) => !diffSet.has(f));
  if (missing.length === 0) return { pass: true };
  const skipMatch = (commitBody || "").match(/fix-scope-skip:\s*(.+)/);
  if (skipMatch) {
    const skipped = skipMatch[1].split(/[\s,]+/).filter(Boolean);
    const stillMissing = missing.filter((f) => !skipped.some((s) => f.includes(s)));
    return { pass: stillMissing.length === 0, missing: stillMissing };
  }
  return { pass: false, missing };
}
const g1 = gate45SanityCheck(["a.ts", "b.ts"], ["a.ts", "b.ts"], "");
assert("Gate 4.5 PASS when all callsites in diff", g1.pass);
const g2 = gate45SanityCheck(["a.ts", "b.ts"], ["a.ts"], "");
assert("Gate 4.5 FAIL when callsite missing without skip", !g2.pass && g2.missing.includes("b.ts"));
const g3 = gate45SanityCheck(["a.ts", "b.ts"], ["a.ts"], "fix-scope-skip: b.ts deprecated");
assert("Gate 4.5 PASS when missing covered by fix-scope-skip", g3.pass);

// T12: non-fix prompt → no symbols extracted needed
const symsNoFix = extractSymbols("hello world how are you today");
assert("non-fix prompt extracts no useful symbols (or filtered)", symsNoFix.length <= 3);

console.log(`\n${pass} pass, ${fail} fail`);
if (fail > 0) {
  console.log("Errors:");
  errors.forEach((e) => console.log(`  - ${e}`));
  process.exit(1);
}
process.exit(0);
```

**Test 한계** (Plan B 본문에 명시):
- `execSync(code-review-graph ...)` 미실행 — `crgQuerySymbol()` 와 `crgStatus()` 의 mock 화 안 함. 실 CRG 통합은 manual cycle 검증.
- settings.json 실제 등록은 `enable_hooks` test (Task 5) 가 별도 책임.
- Gate 4.5 sanity check 는 *룰 시뮬* (T11) — 실 pre-commit-gate hook 통합은 manual cycle 검증.
- behavioral test 아님 (사용자 prompt 흐름 시뮬은 stdout/stdin 직접 호출 X).

`chmod +x` 의무.

### Task 4 — fixture 파일 신규

**File**: `$FIXTURE_CALLSITES`

`mkdir -p install/test/fixtures` (이미 존재 — Plan D Task 7).

```json
# illustrative only — Plan B Step 0 actual code-review-graph output wins on drift.
# Re-capture rule (좁힘): CRG schema, CLI signature, fixture format 변경 시만 재캡처.
{
  "crg_response_sample": [
    {"file": "install/hooks/regression-recall.mjs", "line": 32, "symbol": "shouldSkip", "source": "crg"},
    {"file": "install/test/regression-recall.test.mjs", "line": 765, "symbol": "shouldSkip", "source": "crg"}
  ],
  "grep_response_sample": [
    "install/hooks/regression-recall.mjs:32:function shouldSkip(prompt, env) {",
    "install/hooks/fix-scope-trigger.mjs:185:    const skip = recallShouldSkip(prompt, process.env);",
    "install/test/regression-recall.test.mjs:765:assert(\"shouldSkip env KZK_HARNESS_SELF_IMPROVEMENT=1\","
  ],
  "expected_dedup_count": 3,
  "expected_top_symbol": "shouldSkip"
}
```

JSON 비표준 (`#` comment line). test 가 read 시 comment line 제거 후 parse — T10 처리 명시. git tracked.

### Task 5 — `install/test/run-tests.sh` 갱신 (~15 LoC)

**File**: `$TEST_RUN`

**신규 함수 정의** (Plan D 의 `test_regression_recall` 다음, `# Run all tests` 직전):

```bash
# ---------------------------------------------------------------------------
# Plan B — fix-scope-trigger.test.mjs
# ---------------------------------------------------------------------------
test_fix_scope_trigger() {
  printf '\n[test_fix_scope_trigger]\n'
  if node "$REPO_ROOT/install/test/fix-scope-trigger.test.mjs"; then
    printf '  PASS: fix-scope-trigger.test.mjs\n'
    PASS=$((PASS + 1))
  else
    printf '  FAIL: fix-scope-trigger.test.mjs\n'
    FAIL=$((FAIL + 1))
    ERRORS+=("test_fix_scope_trigger")
  fi
}
```

**호출 추가** (`test_regression_recall` 다음 줄):

```bash
test_fix_scope_trigger
```

**기존 skill count assertion 갱신** — 기존 `test_skill_files_landed` 내 `for skill in <list>` 루프 또는 marker block row count assertion 이 14/15 가 박혀있으면 16 으로 update. 또한 `test_claude_md_marker` 에서 row count 검증 시 16 row 확인 (Plan D 가 15 로 update 했을 것 → Plan B 가 16 으로).

**구체적 갱신 위치 식별 의무**: executor 는 commit 전에 `grep -n "14 kzk-\|15 kzk-\|All 14\|All 15\|16 kzk-\|All 16" install/test/run-tests.sh` 실행 → 모든 hit 16 으로 update. 누락 시 test FAIL.

### Task 6 — `install/install-global.sh` `enable_hooks()` 확장 (~50 LoC) — D 의 `--regression-recall` 패턴 그대로

**File**: `$INSTALL_GLOBAL`

**변경 1 — `parse_flags()` 의 `DO_REGRESSION_RECALL=0` 옆에 `DO_FIX_SCOPE_TRIGGER=0` 추가** (line 59 근처). usage block 에 한 줄 추가 (line 82 근처): `--fix-scope-trigger              Also wire fix-scope-trigger.mjs (implies --enable-hooks)`. arg parse case 에 분기 추가 (line 122 `--regression-recall)` 다음):

```bash
      --fix-scope-trigger)
        DO_FIX_SCOPE_TRIGGER=1
        shift ;;
```

**변경 2 — `enable_hooks()` 본문 확장** (line 627 부근. D 의 `--regression-recall` 블록 다음에 sibling 블록 추가):

```bash
  # Plan B: fix-scope-trigger hook + cache via sidecar-write.mjs (이미 D 가 copy)
  if [ "${DO_FIX_SCOPE_TRIGGER:-0}" -eq 1 ]; then
    cp "$src/install/hooks/fix-scope-trigger.mjs" \
      "$HOME/.claude/skills/.kzk-harness-shared/hooks/"
    # sidecar-write.mjs 는 D 가 이미 copy — `--fix-scope-trigger` 단독 enable 시도면 D 의존
    if [ ! -f "$HOME/.claude/skills/.kzk-harness-shared/lib/sidecar-write.mjs" ]; then
      cp "$src/install/lib/sidecar-write.mjs" \
        "$HOME/.claude/skills/.kzk-harness-shared/lib/"
    fi
  fi
```

**변경 3 — settings.json idempotent jq append 블록 추가** (D 의 `regression-recall` 블록 다음):

```bash
  # Plan B: fix-scope-trigger idempotent append (slot order: D first, B second — sibling order matters)
  if [ "${DO_FIX_SCOPE_TRIGGER:-0}" -eq 1 ]; then
    local fst_cmd="node $HOME/.claude/skills/.kzk-harness-shared/hooks/fix-scope-trigger.mjs"
    local fst_already
    fst_already=$(jq --arg cmd "$fst_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
    if [ "${fst_already:-0}" -gt 0 ]; then
      emit "  hooks: fix-scope-trigger.mjs already registered — skip"
      record "hooks: fix-scope-trigger skip (already registered)"
    else
      tmp=$(mktemp)
      jq --arg cmd "$fst_cmd" '
        .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
      ' "$settings" >"$tmp" && mv "$tmp" "$settings" || return 1
      emit "  hooks: fix-scope-trigger.mjs registered (--fix-scope-trigger)"
      record "hooks: fix-scope-trigger hook registered (--fix-scope-trigger, depends on --enable-hooks)"
    fi
  fi
```

**변경 4 — `--fix-scope-trigger` 가 `--enable-hooks` 자동 enable** (line 762 부근의 D 패턴 옆):

```bash
  # Plan B: --fix-scope-trigger 는 --enable-hooks 의 explicit dependency
  if [ "${DO_FIX_SCOPE_TRIGGER:-0}" -eq 1 ] && [ "${ENABLE_HOOKS:-0}" -eq 0 ]; then
    emit "  --fix-scope-trigger implies --enable-hooks (explicit dependency)"
    ENABLE_HOOKS=1
  fi
```

**변경 5 — fail-closed 검증 통합** — 기존 D 의 fail-closed 호출 (line 769 부근) 이 이미 `enable_hooks` 의 return code 검사. Plan B 의 sibling 블록도 같은 return 1 path → 자동 통합. 별도 변경 X.

### Task 7 — `install/dependencies.sh` 강화 (~15 LoC)

**File**: `$DEPS`

기존 `code-review-graph` entry (있으면) 의 SUMMARY message 강화. 없으면 신규 entry 추가. `install/dependencies.md` 와 sync 의무 (사용자 보이는 dependencies 표 갱신):

```bash
# ---------------------------------------------------------------------------
# 1.5. code-review-graph — used by kzk-codebase-survey + kzk-fix-scope-expansion (Plan B)
# ---------------------------------------------------------------------------
# (기존 entry 가 있으면 record line 만 강화)
if command -v code-review-graph >/dev/null 2>&1; then
  record "code-review-graph: already installed. Used by kzk-codebase-survey Step 1 + kzk-fix-scope-expansion fix-start hook (Plan B)."
else
  emit "[1.5] code-review-graph not found — attempting install..."
  installed=0
  if command -v python3 >/dev/null 2>&1 && python3 -m pip --version >/dev/null 2>&1; then
    if python3 -m pip install --user code-review-graph 2>/tmp/kzk-crg-pip.log; then
      installed=1
      record "code-review-graph: installed via 'pip install --user'"
    fi
  fi
  if [ "$installed" -eq 0 ] && command -v pipx >/dev/null 2>&1; then
    if pipx install code-review-graph 2>/tmp/kzk-crg-pipx.log; then
      installed=1
      record "code-review-graph: installed via 'pipx install'"
    fi
  fi
  if [ "$installed" -eq 0 ]; then
    printf 'WARN: code-review-graph install failed — kzk-fix-scope-expansion will fall back to grep, kzk-codebase-survey Step 1 will use grep fallback.\n' >&2
    record "code-review-graph: NOT INSTALLED. kzk-fix-scope-expansion + kzk-codebase-survey will use grep fallback."
  fi
fi
```

**actual package name 검증**: Plan B Step 0 에서 `python3 -m pip search code-review-graph` (또는 `pip show code-review-graph`) 로 확인. 실 package 가 다른 이름이면 수정.

**`install/dependencies.md` sync**: 기존 entry 의 "Used by" 행에 `kzk-fix-scope-expansion (Plan B fix-start hook + Gate 4.5 callsite expansion)` 추가.

### Task 8 — `kzk-pre-commit-gate/SKILL.md` Gate 4.5 추가 (~50 LoC)

**File**: `$SKILL_PCG`

**Frontmatter 갱신**: `version: 1.2.0` → `version: 1.3.0`. description 끝에 추가: `, 'Gate 4.5', 'fix-scope-cache', 'callsite mismatch'`.

**Triggers 갱신** (line 13): 끝에 추가:
```
`Gate 4.5`, `fix-scope-cache`, `callsite mismatch`, `fix-scope-skip`.
```

**신규 section 추가** — 기존 `## Gate 4 — UI/CSS visual verification (Playwright MCP)` 다음 (line 65 직후), `## Doc-only commit exception` 직전:

```markdown
## Gate 4.5 — Fix Scope Sanity Check (Plan B)

`.kzk-harness/fix-scope-cache.json` (kzk-fix-scope-expansion fix-start hook 이 작성) 가 존재하면 callsite list 와 `git diff --cached --name-only` 매칭 검사. cache 부재 → N/A (fix-scope-trigger 비활성 또는 fix intent 아닌 commit).

룰:
1. `cache_files = jq -r '.callsites[].file' .kzk-harness/fix-scope-cache.json | sort -u`
2. `diff_files = git diff --cached --name-only | sort -u`
3. `missing = cache_files \ diff_files`
4. `missing` 가 0건 → PASS
5. `missing` 가 1건 이상 → commit body 검사:
   - body 에 `fix-scope-skip:` line 발견 + 모든 missing callsite 가 그 line 에 명시 → PASS
   - 그 외 → BLOCK (commit fails):
     ```
     ❌ Gate 4.5 FAIL: callsite N 곳 중 M 곳만 변경됨.
        누락: <missing-files>
        해결: (a) 누락 callsite 수정 후 re-stage, OR
              (b) commit body 에 의도 명시: "fix-scope-skip: <file1>,<file2> reason"
     ```

**스킵 조건**: doc-only commit (Doc-only commit exception 룰과 동일) → cache 무관 자동 N/A.

**자율 mode 추가 룰**: 자율 cycle 의 BLOCK 발생 → 즉시 halt + user-queue entry: `Q-GATE-4.5-FAIL — fix-scope cache vs diff 미스매치, 사용자 결정 필요`.

본 Gate 의 룰 정의자: `kzk-fix-scope-expansion` skill (Plan B). 본 skill 은 적용자.
```

**§Failure protocol 갱신** — 끝에 추가:


codex
핵심 문제 몇 개가 이미 보입니다. Plan B는 방향은 맞는데, 구현 계약이 몇 군데 모호하거나 자기모순이라 그대로 가면 D와 엮일 때 깨질 가능성이 있습니다.
exec
/bin/zsh -lc "sed -n '920,1167p' docs/plans/plan-B-fix-scope-expansion.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:

```
- Gate 4.5 BLOCK 시 자율 mode → user-queue entry `Q-GATE-4.5-FAIL`. interactive mode → 사용자에게 surface, halt X.
```

**§Interaction with other kzk-* 갱신** — 끝에 추가:

```
- **kzk-fix-scope-expansion** (Plan B): Gate 4.5 의 룰 정의자. cache 파일 (`.kzk-harness/fix-scope-cache.json`) 의 schema 와 sanity check 룰 정의. 본 skill 은 cache 입력자 + Gate 4.5 의 적용자.
```

### Task 9 — `kzk-codebase-survey/SKILL.md` fix-time trigger 추가 (~10 LoC)

**File**: `$SKILL_CS`

**Frontmatter 갱신**: `version: 1.5.0` → `version: 1.6.0`. description 끝에 추가: `, 'fix 시작', 'fix-time callsite expansion'`.

**Triggers 갱신** (line 13): 끝에 추가 (현재 마지막 항목 `ralph로 체크` 다음):
```
, `fix 시작`, `버그 수정`, `에러 fix`, `regression fix`, `callsite 전수`, `함수 수정 영향`, `심볼 영향 분석`.
```

**§Run before 갱신** — 기존 list 끝에 추가:

```
, fix-time callsite audit (kzk-fix-scope-expansion 의 manual path — hook 비활성 환경 또는 hook 결과 보강 필요 시)
```

**§Interaction with other kzk-* 갱신** — 끝에 추가:

```
- **kzk-fix-scope-expansion** (Plan B): hook path 는 fix-scope-trigger.mjs 가 자동 (UserPromptSubmit 시점), survey 는 EXPLORER subagent path (수동, fix-start 시 보강용). CRG 우선 + grep fallback 패턴은 Step 1 과 동일 룰 — drift 차단 위해 본 skill 의 룰이 source of truth.
```

### Task 10 — `kzk-regression-memory/SKILL.md` cross-ref 보강 (~5 LoC) — Interaction-only patch (version bump X)

**File**: `$SKILL_RM`

**Frontmatter 변경 없음** — 본 변경은 cross-ref 한 항목의 1줄 → 3줄 보강만. 기능 변경 X (cosmetic doc patch).

**§Interaction with other kzk-* 갱신** — 기존 `kzk-fix-scope-expansion (Plan B): D recall 결과를 consumer 로 read — fix-start hook 이 D 다음에 발동.` 항목 (line 163) 을:

```
- **kzk-fix-scope-expansion** (Plan B): D recall 결과를 consumer 로 read — fix-start hook 이 D 다음 슬롯에 발동 (settings.json `UserPromptSubmit` 배열에서 regression-recall.mjs → fix-scope-trigger.mjs 순). 같은 prompt 의 두 system-reminder 슬롯 — D 가 과거 fix 기억, B 가 현재 fix 의 callsite 영향 list. fix-scope-cache (`.kzk-harness/fix-scope-cache.json`) 가 D recall reminder 와 함께 inject 되는 사용자 prompt context. Pre-commit Gate 4.5 의 cache 입력자.
```

### Task 11 — `kzk-large-task-delegation/SKILL.md` cache inject 룰 추가 (~10 LoC)

**File**: `$SKILL_LTD`

**§Subagent prompt requirements 의 Recall 결과 inject 룰** (Plan D Task 13 가 추가한 항목) 다음 줄에 추가:

```
- **fix-scope cache inject** (Plan B): subagent dispatch 시점에 `.kzk-harness/fix-scope-cache.json` 존재하면 cache 의 callsites list 도 dispatch prompt 에 verbatim inject. **size cap 200 char** — D recall reminder 와 sibling 룰. callsite 우선순위 = file 변경 빈도 high → low (cache 의 ranking 그대로). 200 char 초과 시 truncate + warning footer (`[truncated: <N> more callsites — see .kzk-harness/fix-scope-cache.json]`). subagent 가 fix 작업 시 callsite list read.
```

**§Interaction with other kzk-* 갱신** — 끝에 추가:

```
- **kzk-fix-scope-expansion** (Plan B): cache 파일 의 callsites list 를 subagent dispatch prompt 에 inject (size cap 200 char, D recall reminder 와 sibling). fix subagent 도 callsite list read.
```

### Task 12 — `harness-share.md` §3.5 신규 (~80 LoC)

**File**: `$SHARE`

**위치 결정**: 기존 §3 (Pre-commit Gate) 와 §4 (Subagent-Driven Dispatch) 사이에 §3.5 삽입 (Pre-commit Gate 와 sibling 의미). 또는 §29 다음 §30 으로 추가 (D 와 sibling). **본 plan 채택**: §3.5 (Pre-commit Gate 룰 가까이).

기존 §3 끝의 마지막 `### Token migration — shadcn + Tailwind v4 bridge requirement` (line 212) 다음, `## 4. Subagent-Driven Dispatch` (line 229) 직전에 신규 section 삽입:

```markdown
---

## 3.5 Fix Scope Expansion (kzk-fix-scope-expansion, Plan B)

자율실행 cycle 의 5 메타갭 중 *Fix scope 누수* 차단. fix-start 시점 prompt 매칭 → callsite 전수 조회 → system-reminder inject + cache. Pre-commit Gate 4.5 가 cache vs git diff 매칭 sanity check.

### Fix-start hook (consumer 관계 with §29 Plan D regression-recall)

- 진입점: `install/hooks/fix-scope-trigger.mjs` (UserPromptSubmit hook)
- 발동 슬롯: `regression-recall.mjs` 다음 (D recall 결과 system-reminder inject 후 본 hook 이 callsite list 추가 inject — 같은 prompt 의 두 reminder 슬롯)
- Trigger: fix intent 키워드 (D 의 `FIX_KEYWORDS` import) OR 에러 페이스트 detect (`Error:`, JS stack frame, Python traceback) OR 직전 Bash non-zero exit (manual)
- 자가-skip guard: D 와 동일 동사구만 (환경변수 우선, 명사 단독 매칭 금지)
- 심볼 추출: backtick / camelCase / snake_case / func() pattern. 4 char+ filter. SYMBOL_CAP=5
- Callsite 조회: **CRG 우선** (`code-review-graph` `query_graph(callers_of)` / CLI `query` + `blast-radius`) → CRG 미설치 OR stale (Nodes < 50 OR drift > 10 commit) → grep fallback (`grep -rn "<symbol>\b"`). CRG stale 시 자동 `code-review-graph build` 시도, 실패 시 grep
- Result truncation: 200 char cap (D recall reminder size cap 과 sibling). 우선순위 = file 변경 빈도 high (`git log --name-only` count) → low
- Cache: `.kzk-harness/fix-scope-cache.json`. atomic write via `install/lib/sidecar-write.mjs::writeAtomic` (D utility 재사용 — drift 차단). schema = `{session_id, user_prompt_first200, symbols, callsites[], captured_at, crg_status}`. 1 entry/fix (overwrite, last fix wins)
- inject format: `🔧 [FIX SCOPE EXPANSION] 영향 받을 수 있는 파일/심볼 N건 (Plan D recall 결과 다음 슬롯): - <file>:<line> <symbol> [crg|grep] ⚠ 한 callsite 만 고치고 끝나지 말고 전수 검토.`

### Fix-verify hook (manual self-check)

- Trigger: PostToolUse hook 가능 시 (test 통과 직후) — install-global.sh PostToolUse 미지원 환경 → manual fallback path (사용자 prompt 의 "test 통과", "all green", "PR 직전" 매칭 시 UserPromptSubmit hook 의 sub-mode)
- 동작: `🔍 [FIX VERIFY] 자가 점검: test 가 callsite N 곳 모두 커버하는가? 누락 시 commit body 에 의도 명시했는가? (Gate 4.5)`
- 한계: behavioral test X. PostToolUse 미지원 환경 = manual self-check 의존

### Pre-commit Gate 4.5 — Fix Scope Sanity Check

- 위치: 기존 Gate 4 (Playwright) 다음, commit 직전
- 룰:
  1. cache 부재 → N/A (PASS)
  2. cache 의 callsite files vs `git diff --cached --name-only` 매칭
  3. 미스매치 → BLOCK. commit body 에 `fix-scope-skip: <file> reason` 명시 시 PASS escape
- 자율 mode BLOCK → halt + `Q-GATE-4.5-FAIL` user-queue entry. interactive mode → surface to user, halt X
- 적용자: `kzk-pre-commit-gate` skill §Gate 4.5

### CRG dependency

- `code-review-graph` 우선 (`install/dependencies.sh` 가 pip --user → pipx fallback 으로 auto-install)
- 미설치 / build 실패 → grep fallback (silent degradation 금지 — stderr WARN + `_warn:"crg-not-installed-grep-fallback"` structured reason)
- CRG status oracle 룰 (kzk-codebase-survey §Step 0.5 와 sync) — `Files / Nodes / Edges / Last updated` 가 진실. build log alone 신뢰 X

### Default DISABLED at B commit, 자동 enable on main 머지 (5 plan 후, fail-closed)

- B plan commit 시점: hook 파일 추가 but settings.json 등록 X
- 5 plan (A→D→B→C→E) 끝나고 `kzk-pre-merge-sync` step 3 가 `install-global.sh --enable-hooks --regression-recall --fix-scope-trigger` 자동 호출 (사용자 confirm 게이트). `--fix-scope-trigger` 도 `--enable-hooks` 의 explicit dependency
- fail-closed: install-global.sh exit non-zero / duplicate entry / jq 부재 → merge block (D 의 fail-closed 와 sibling)

### Rollback (5 level)

| Level | 메커니즘 |
|---|---|
| 단일 plan revert | `git revert <Plan-B-commit-sha>` |
| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=fix-scope-trigger` |
| Skill 즉시 비활성 | `DISABLE_OMC=kzk-fix-scope-expansion` |
| Gate 4.5 만 비활성 | commit body 에 `fix-scope-skip: gate-4.5-disabled` 명시 (per-commit escape) |
| Cache 손실 / 오염 | `rm -f .kzk-harness/fix-scope-cache.json` — 다음 fix-start 가 새로 작성 |

### Cross-reference

- §3 Pre-commit Gate — Gate 4.5 적용 위치
- §29 Plan D Regression Memory — 본 hook 의 producer (recall 결과 → callsite expansion consumer)
- §26 kzk-codebase-survey — fix-time trigger 룰 sync (CRG 우선 + grep fallback)
```

### Task 13 — `CLAUDE.md` + `README.md` skill count sync (~8 LoC, 4 sync points)

**Files**: `$CLAUDE_MD`, `$README`

Plan D 가 14→15 로 update 했을 것 (D commit 직후 상태). Plan B 가 15→16 으로 update.

**`$CLAUDE_MD` 변경**:
1. **Line 3**: `It contains 15 \`kzk-*\` skills` → `It contains 16 \`kzk-*\` skills`
2. **"All N skills" line** (현재 `All 15 skills are active`): `All 15 skills are active` → `All 16 skills are active`
3. **Skills table** (line 9 부근, 표 마지막 행에 추가):
   ```
   | `kzk-fix-scope-expansion` | fix 시작, 버그 수정, 에러 fix, callsite 전수, Gate 4.5, fix-scope-cache, callsite mismatch |
   ```

**`$README` 변경**:
1. **Line 3**: `Installs 15 \`kzk-*\` skills` → `Installs 16 \`kzk-*\` skills`
2. **Install command skill count** (`README.md` 의 install command 본문 또는 verify 단계 — Plan D 가 15 로 update 했으면 16 으로): grep `15 kzk-\|All 15` → 16 으로

**executor 의무**: 갱신 전 `grep -n "14 kzk-\|15 kzk-\|All 14\|All 15\|16 kzk-\|All 16" CLAUDE.md README.md install/test/run-tests.sh` 로 모든 skill count 위치 식별. 누락 시 run-tests.sh PASS 안 함.

### Task 14 — atomic commit

`kzk-pre-commit-gate` 통과 (Gate 0 / 1 / 1.5 / 2 N/A / 3 / 4 N/A. Gate 4.5 — 본 plan 이 도입 — 본 commit 자체는 cache 부재라 N/A):

- Gate 0: 신규 skill 디렉토리 (`skills/kzk-fix-scope-expansion/`) → AGENTS.md hierarchy 가 본 repo 에 없으면 N/A. 있으면 의무 update
- Gate 1: ai-slop scan
- Gate 1.5: secrets scan
- Gate 2: build N/A (markdown + mjs only — npm run build 가 본 repo 에 정의되어 있으면 실행, 없으면 N/A)
- Gate 3: `bash install/test/run-tests.sh` PASS 의무
- Gate 4: N/A (non-UI)
- Gate 4.5: cache 부재 → N/A

commit message:
```
feat(skill): kzk-fix-scope-expansion + Gate 4.5 — fix scope expansion (Plan B)

Fix-start hook (UserPromptSubmit, Plan D recall consumer slot):
  - FIX_KEYWORDS / SELF_IMPROVE_VERBPHRASES import from regression-recall.mjs (drift 차단)
  - 심볼 추출 + CRG 우선 (callers_of, blast-radius) → grep fallback
  - cache .kzk-harness/fix-scope-cache.json (atomic via writeAtomic)
  - CRG stale 자동 build, 미설치 시 stderr WARN + _warn structured reason

Gate 4.5 (kzk-pre-commit-gate v1.3):
  - cache callsite files vs git diff --cached --name-only 매칭
  - 미스매치 → BLOCK (fix-scope-skip: escape)
  - 자율 mode BLOCK → Q-GATE-4.5-FAIL user-queue

kzk-codebase-survey v1.6: fix-time trigger phrases 추가.
kzk-regression-memory: Interaction cross-ref 보강 (cosmetic, version bump X).
kzk-large-task-delegation: subagent dispatch cache inject 룰 (200 char cap, D sibling).
harness-share.md §3.5 신규.
install/test/fix-scope-trigger.test.mjs (12 cases) + fixture.
install/install-global.sh: --fix-scope-trigger flag (D --regression-recall sibling).
install/dependencies.sh: code-review-graph entry 강화.
CLAUDE.md / README.md: 15→16 skill count (4 sync points).

Spec: docs/plans/regression-memory-and-fix-quality-spec.md (rev7, Axis B).
Plan: docs/plans/plan-B-fix-scope-expansion.md (rev1, frozen).
Default DISABLED — auto-enabled by kzk-pre-merge-sync step 3 after 5 plan.
```

## Test 전략 (한계 명시)

| 항목 | 검증 방식 | 한계 |
|---|---|---|
| Self-skip guard (D import) | `shouldSkip` 호출 result | D import drift 만 검증. 동사구 grep 자체는 D test 가 검증 |
| Fix-intent detect | `detectFixIntent` 호출 result | D import drift 만 |
| Error-paste detect (B 신규) | regex pattern test | 4 sample (Error/traceback/JS frame/plain) — 실 stack trace 다양성 부족 |
| Symbol extract | `extractSymbols` 호출 | regex 기반. AST parsing 아님 — false positive 가능 (영문 주석 등) |
| CRG path | mock fixture | execSync(code-review-graph) 실행 안 함. 실 통합은 manual cycle |
| Grep fallback | mock fixture | execSync(grep) 실행 안 함. shell escape edge case 검증 부족 |
| Truncation cap | `buildReminder(many)` | 룰 검증만. 실 사용 시 cumulative length 정확성 manual |
| Cache atomic write | tempdir + writeAtomic + readSidecar | 동시성 검증은 D 의 atomic write test 가 보강 |
| D recall consumer 슬롯 순서 | 룰 *기록* 검증 (settings.json append 순서는 install-global.sh 책임) | 실 hook 실행 순서는 manual cycle 검증 |
| Gate 4.5 sanity check | mock function `gate45SanityCheck` | 룰 *시뮬* 만. 실 pre-commit-gate hook 통합은 manual cycle 검증 |
| Non-fix prompt → no symbols | `extractSymbols` empty | edge case 일부만 |
| CLAUDE.md / README.md count sync | grep assertion (executor 책임) | 4 sync points 누락 시 run-tests.sh FAIL |

**전반 한계**: behavioral test 아님. 룰 *기록* + mock fixture 검증. 실제 사용자 prompt 흐름 (UserPromptSubmit 트리거 + system-reminder inject + subagent dispatch 의 cache read + Gate 4.5 BLOCK behavior) 은 manual cycle 검증 의존. spec rev7 §Test 전략 한계 명시 룰 따름.

## Rollback (5 level — Plan B 본문 §Rollback 와 sibling)

| Level | 메커니즘 |
|---|---|
| 단일 plan revert | `git revert <Plan-B-commit-sha>` |
| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=fix-scope-trigger` |
| Skill 즉시 비활성 | `DISABLE_OMC=kzk-fix-scope-expansion` |
| Gate 4.5 만 비활성 | commit body 에 `fix-scope-skip: gate-4.5-disabled` 명시 (per-commit escape) — kzk-pre-commit-gate skill version downgrade 도 옵션 |
| Cache 손실 / 오염 | `rm -f .kzk-harness/fix-scope-cache.json` — 다음 fix-start 가 새로 작성 |

## Out of scope (다음 Plan 으로 위임)

- **Plan C** — fresh-agent verifier Stage 3 + Pre-commit Gate 5. Gate 4.5 와 Gate 5 는 sibling — Gate 4.5 가 callsite scope 검증, Gate 5 가 verifier subagent 검증
- **Plan E** — production code-first + 멱등성. fix-scope hook 이 production access trigger 시에도 발동하는 cross-axis 통합은 Plan E 의 책임 (spec rev7 Axis E §Cross-axis 통합 참조)
- **Behavioral test** (실 hook 실행 + system-reminder inject 검증) — spec rev7 Non-goals (manual cycle 검증 의존)
- **Fix-verify hook 의 PostToolUse 등록** — install-global.sh 가 PostToolUse 미지원이면 본 plan 은 manual fallback 만. 실 PostToolUse 지원 추가는 별도 plan

## Codex review 의무

본 plan draft 는 frozen 전 codex CLI consult (stdin path) → critic opus fallback. spec rev7 §메타 룰 따름.

```bash
printf '%s' "$(cat docs/plans/plan-B-fix-scope-expansion.md)" | codex exec - -s read-only -c '...' --json | jq ...
```

2회 실패 시 critic opus fallback. 5 plan 중 최소 2개 codex CLI 성공 목표. Plan D 가 codex 성공이면 Plan B 는 critic opus 도 OK — but codex 시도 의무.

verdict file 저장: `docs/research/codex-reviews/plan-B-fix-scope-expansion-codex-review.md` 또는 `.../plan-B-fix-scope-expansion-critic-review.md`. REVISE / SHIP 분기. SHIP → frozen. REVISE → cycle 1 답 통합 → rev2 (1 plan = 1 round 룰 적용 — `kzk-spec-and-review §Cost/cadence`).

## Open questions (executor 진행 중 발견 시 user-queue append)

- `Q-PLAN-B-PCG-VERSION` — kzk-pre-commit-gate v1.3 으로 bump 시 기존 harness-share.md §3 의 "6 단계" wording 이 "7 단계 (Gate 0/1/1.5/2/3/4/4.5)" 로 update 필요한가? 본 plan 은 §3.5 신규 section 으로 분리 → §3 wording 그대로 유지 채택. executor 가 §3 본문에 Gate 4.5 행 추가 여부 결정 시 user-queue 등록.
- `Q-PLAN-B-FIX-VERIFY-POSTTOOLUSE` — install-global.sh 가 PostToolUse hook event 지원하는지 Step 0 에서 확인. 미지원 → fix-verify hook 은 manual fallback 만. 지원 → 별도 task 추가 검토 (out of scope, 별 plan).
- `Q-PLAN-B-CACHE-MULTI-FIX` — same commit 에 multi-fix 수행 시 cache 가 last fix only overwrite — Gate 4.5 가 마지막 fix 만 검사. multi-fix list 보존 (append) 룰 추가 검토 필요? 본 plan rev1 은 last fix wins 채택 (단순성 우선). REVISE 시 검토.

exec
/bin/zsh -lc "sed -n '149,230p' docs/plans/regression-memory-and-fix-quality-spec.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
### Axis B — Fix scope 누수 차단

신규 skill `kzk-fix-scope-expansion`. 진입점 2개 (fix-start + fix-verify), Pre-commit Gate 4.5 보조. 디테일은 Plan B 에 위임.

핵심 룰:
- fix-start hook 이 D 의 regression-recall 결과 inject 다음에 발동 (consumer)
- callsite 전수: `code-review-graph` 우선, fallback grep
- Gate 4.5 = sanity check (callsite grep 결과 vs git diff 매칭)

### Axis C — Fresh-agent verification

`kzk-large-task-delegation` Stage 3 + Pre-commit Gate 5. 디테일은 Plan C 에 위임.

핵심 룰:
- `git diff --shortstat` 분기: 3 파일 미만 + 100 LoC 미만 → sonnet, 그 외 → opus
- PASS / FAIL / PARTIAL 강제. 2 consecutive FAIL → halt + user-queue
- Verifier prompt 에 **spec/plan 의 acceptance criteria 발췌만 inline copy** (전체 600줄 read 금지). 토큰/cache 부담 차단

### Axis E — Production code-first + 멱등성

`kzk-production-access` skill 강화. 디테일은 Plan E 에 위임.

**핵심 룰**:
- Production state 변경 (DB schema, IAM policy, S3 lifecycle, Lambda env, CloudFront origin 등) = **코드 우선** (migration / IaC / script). 직접 호출 (psql `ALTER TABLE`, `aws iam`, `aws s3` 즉시 실행) 금지.
- **멱등성 의무**: 작성하는 script 는 두 번 실행해도 안전 (`IF NOT EXISTS`, `--if-not-exists`, conditional skip). 1회용 ad-hoc 명령 금지.
- **트래킹**: script 파일 git tracked. `migrations/`, `infra/`, `scripts/prod/` 등 프로젝트 컨벤션 따름. ad-hoc 실행 후 사후 기록 금지.
- **환경 설정 예외**: 환경변수, 비밀 secret 회전, OAuth credential 갱신 — 코드 외 unavoidable. `kzk-production-access` 의 기존 explicit-instruction rule 적용.
- **AI 가 production access 받은 경우**: script 작성 → 사용자 review/승인 → 사용자 또는 CI 가 실행. AI 가 직접 production 호출 금지 (read-only inspection 만 허용).
- **Drift 발견 시**: drift 자체를 fix 대상 — `git revert + 재적용` 가 아니라 *현 상태를 반영하는 새 migration 추가* (forward-only).

**Cross-axis 통합**:
- Axis B (fix scope) — production fix 의 callsite 전수 = migration 의 영향 schema/표/index 전수. fix-scope-expansion hook 이 production access trigger 시에도 발동.
- Axis D (regression memory) — production change 회고 entry 의 type=`pattern`, key=`prod-<change-slug>`. 같은 곳 재변경 시 recall.

---

## Plan 분할

| Plan | 파일 | 주요 변경 | 예상 LoC | 의존성 |
|---|---|---|---|---|
| **A** | `docs/plans/plan-A-tdd-self-verification-block.md` | `kzk-test-coverage` v1.3 — Layer (a) dispatch prompt + Layer (b) 메인 self-check | ~60 | 독립 |
| **D** | `docs/plans/plan-D-regression-memory.md` | 신규 `kzk-regression-memory` + recall hook (default DISABLED) + sidecar + stale check + cycle 회고 통합 + gstack auto-install + **`kzk-pre-merge-sync/SKILL.md` 마지막 step `--regression-recall` 자동 호출 추가** | ~570 | A 후 |
| **B** | `docs/plans/plan-B-fix-scope-expansion.md` | 신규 `kzk-fix-scope-expansion` + D recall consumer + Gate 4.5 | ~250 | D 후 |
| **C** | `docs/plans/plan-C-fresh-agent-verification.md` | `kzk-large-task-delegation` Stage 3 + Gate 5 | ~120 | A/B/D 후 |
| **E** | `docs/plans/plan-E-production-code-first.md` | `kzk-production-access` 강화 — code-first 룰 + 멱등성 의무 + 직접 호출 금지 boilerplate. CLAUDE.md 의 production access 섹션 업데이트. | ~150 | A/B/C/D 후 (마지막) |

**진행 순서 합리화**: A 독립 / D 인프라 source / B 는 D consumer / C 는 안전망.

**자가오염 차단**: D commit 시점에 hook DISABLED. B/C cycle 동안 D hook 비활성. 모든 plan 끝나고 main 머지 시점 사용자 explicit enable.

## Skill count 동기화 (14→16)

신규 2개 (B `kzk-fix-scope-expansion` + D `kzk-regression-memory`). 4 동기화 지점:
1. `CLAUDE.md` line 3
2. `CLAUDE.md` "All N skills" line
3. `README.md` line 3
4. `README.md` install command 의 skill count

각 plan B/D §구현 변경 에 4 sync points 명시 의무.

## Test 전략 (cycle 2 #5 한계 명시)

| Plan | Test 유형 | 한계 |
|---|---|---|
| A | `install/test/skill-text-checks.sh` — `kzk-test-coverage` SKILL.md 의 anti-pattern 섹션 grep + dispatch prompt boilerplate 의 sonnet executor SKILL.md 등록 grep | 룰 *기록* 검증만. 실제 sonnet 이 룰 위반 차단 여부는 manual cycle 검증 의존 |
| B | `install/test/fix-scope-trigger.test.mjs` — fix-start hook simulator (mock prompt → expected grep call) | hook 자체 동작 test. 실제 fix workflow 통합은 manual |
| C | `install/test/verifier-routing.test.sh` — `git diff --shortstat` mock → 분기 결과 echo 확인 | dispatch path 만. verifier subagent 응답 품질은 manual |
| D | `install/test/regression-recall.test.mjs` — mock /learn JSONL fixture + sidecar fixture → recall hook 매칭 + decay + dismiss 시뮬 | 진짜 mock 동작 test (코드 단위) |

`install/test/run-tests.sh` 의 라우팅: `*.test.mjs` → `node`, `*.test.sh` → `bash`, `*.checks.sh` → `bash`. Plan D 가 run-tests.sh 를 명시적으로 update.

`install/test/fixtures/` 디렉토리 신규 — Plan B/D 의 mock fixture 위치. git tracked.

**Fixture-backend drift 방지** (cycle 3 #6): Plan D Step 0 에 의무 — 실제 `gstack learn add` 1회 실행 → 출력 JSONL 캡처 → fixture 로 복사 (`fixtures/gstack-learnings.sample.jsonl`). 매 Plan D 변경 시 재캡처. fixture 가 backend 가정의 single point — drift 시 test 가 통과해도 실 운영 break.

## Rollback

| Level | 메커니즘 |
|---|---|
| 단일 plan revert | `git revert <plan-commit-sha>` |
| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=regression-recall` |
| Skill 즉시 비활성 | `DISABLE_OMC=kzk-regression-memory` |

exec
/bin/zsh -lc "sed -n '1120,1170p' docs/plans/plan-D-regression-memory.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:

```markdown
## 3. Regression-recall hook auto-enable (Plan D, fail-closed)

**5 plan (A→D→B→C→E)** 모두 끝나고 `feature/memory` → `main` 머지 직전, regression-recall hook 의 default DISABLED 를 ENABLED 로 전환:

```bash
bash install/install-global.sh --enable-hooks --regression-recall
```

`--regression-recall` 는 explicit dependency 로 `--enable-hooks` (keyword-detector) 도 자동 enable.

**사용자 confirm 게이트 의무** — 자동 호출 전 user 명시 confirm 받음. 거부 시 manual enable path 안내:
- 거부 → 후속 enable 은 사용자가 직접 위 command 실행. PR description 또는 milestone commit message 에 "regression-recall hook left disabled by user request" 명시 의무
- ACK → install-global.sh 자동 호출, 결과 stdout 로 사용자에게 보고

**fail-closed 검증** (codex #3):
1. `install-global.sh --enable-hooks --regression-recall` exit code 검사 — non-zero → merge block (`exit 1`)
2. settings.json 의 `UserPromptSubmit` 배열에 `regression-recall.mjs` entry 1개만 존재 검증 (jq 로 count). 0개 또는 2개+ → merge block
3. `jq` 미설치 시 사전 검사 → 사용자에게 `brew install jq` 안내 + merge block

위 3 검증 모두 PASS 시만 머지 진행.

**왜**: Plan D commit 시점에는 default DISABLED — 다음 cycle 의 자가오염 차단. 5 plan 끝나고 머지 단계가 first-enable 의 자연 게이트 (망각 차단). fail-closed 라 silent install 실패가 사용자 모르게 머지되는 패턴 차단.

Skip = block merge. 단, 사용자가 명시적으로 "regression-recall 비활성 유지" 선언한 경우만 skip 허용 (PR description 또는 milestone commit message 에 명시).

Checkpoint: PR description (PR-flow) 또는 milestone commit message (direct-main flow) 에 다음 줄 의무:
- ENABLED: `regression-recall hook enabled via kzk-pre-merge-sync step 3`
- 사용자 명시 거부: `regression-recall hook left disabled by user request`
```

**§`## Combined PR description footer` 갱신** — 체크리스트에 1줄 추가:

```
- [ ] regression-recall hook enabled via step 3 (or user-declined per spec rev6 §Default DISABLED, fail-closed verified)
```

**§`## Interaction with other kzk-*` 갱신** — 끝에 추가:

```
- **kzk-regression-memory**: 본 skill step 3 가 regression-recall hook 의 first-enable gate. spec rev6 §Default DISABLED 의 자동 enable 진입점. fail-closed (jq 부재 / install-global.sh non-zero / duplicate entry → merge block).
```

### Task 12 — `kzk-web-loop/SKILL.md` cycle 회고 hook (~25 LoC) — codex #9 답

**File**: `$SKILL_WL`

§`## Loop Structure` 의 Step 5 직후, Step 6 직전에 신규 step 5.5 추가:

```markdown

web search: 
web search: time: {"utc_offset":"+09:00"}
codex
이제 D의 공용 writer 계약과 B의 캐시 포맷이 실제로 맞물리는지 확인합니다. 여기 틀리면 atomicity 서술이 형식만 남고 구현은 깨집니다.
exec
/bin/zsh -lc "sed -n '300,420p' docs/plans/plan-D-regression-memory.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:

const LOCK_TIMEOUT_MS = 5000;
const LOCK_RETRY_MS = 100;

export async function acquireLock(sidecarPath) {
  const lockDir = `${sidecarPath}.lock`;
  const start = Date.now();
  while (Date.now() - start < LOCK_TIMEOUT_MS) {
    try {
      mkdirSync(lockDir);  // atomic — fails if exists
      return () => { try { rmSync(lockDir, { recursive: true }); } catch {} };
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      await new Promise((r) => setTimeout(r, LOCK_RETRY_MS));
    }
  }
  throw new Error(`sidecar-write: lock timeout on ${lockDir}`);
}

export function writeAtomic(sidecarPath, entries) {
  const tmpPath = `${sidecarPath}.tmp.${process.pid}`;
  const content = entries.map((e) => JSON.stringify(e)).join("\n") + (entries.length > 0 ? "\n" : "");
  writeFileSync(tmpPath, content);
  renameSync(tmpPath, sidecarPath);
}

export function readSidecar(sidecarPath) {
  if (!existsSync(sidecarPath)) return [];
  const lines = readFileSync(sidecarPath, "utf8").split("\n").filter(Boolean);
  return lines.map((l) => {
    try { return JSON.parse(l); }
    catch { return null; }  // invalid line skip — don't fail whole read
  }).filter(Boolean);
}

export async function mutateSidecar(sidecarPath, mutator) {
  const release = await acquireLock(sidecarPath);
  try {
    const entries = readSidecar(sidecarPath);
    const updated = mutator(entries);
    writeAtomic(sidecarPath, updated);
    return updated;
  } finally {
    release();
  }
}
```

**핵심**: hook + stale-check + dismiss CLI + cycle 회고 append 가 모두 `mutateSidecar()` 호출. 동시 실행 시 lockdir 기반 직렬화 → 유실 차단.

### Task 3 — `install/hooks/regression-recall.mjs` 신규 (~210 LoC)

**File**: `$HOOK_RECALL`

**Pattern**: `keyword-detector.mjs` 와 동일한 stdin/stdout 모양 (UserPromptSubmit hookSpecificOutput).

**구조**:

```js
#!/usr/bin/env node
// regression-recall.mjs — UserPromptSubmit hook for kzk-regression-memory.
// rev2 — codex #4 (orphan cleanup 분리), #5 (자가-skip 동사구), #6 (atomic write),
//        #7 (gstack 미설치 stderr WARN).
// Authoritative spec: docs/plans/regression-memory-and-fix-quality-spec.md (rev6).
// Default DISABLED at Plan D commit. Auto-enabled by kzk-pre-merge-sync last step.

import { execSync } from "node:child_process";
import path from "node:path";
import { mutateSidecar, readSidecar } from "../lib/sidecar-write.mjs";

const FIX_KEYWORDS = [
  "fix", "수정", "버그", "에러", "error", "regression", "재발",
  "같은 버그", "또 났", "이거 또", "broken", "안 됨", "안된다",
];

// rev2 codex #5 — 동사구만, 명사 단독 금지
const SELF_IMPROVE_VERBPHRASES = [
  "harness 개선 루프 시작",
  "스킬 개선해줘",
  "harness loop 진입",
  "자가개선 cycle 진입",
  "자가개선 돌려줘",
  "메타 cycle 진입",
  "ralph 로 돌려",
];

const DECAY_BASE = 0.85;
const CONFIDENCE_THRESHOLD = 4;
const QUERY_WINDOW = 200;  // first 200 chars

function shouldSkip(prompt, env) {
  if (env.KZK_HARNESS_SELF_IMPROVEMENT === "1") return "env:KZK_HARNESS_SELF_IMPROVEMENT";
  if (env.KZK_AUTONOMOUS === "1") return "env:KZK_AUTONOMOUS";
  for (const m of SELF_IMPROVE_VERBPHRASES) {
    if (prompt.includes(m)) return `verbphrase:${m}`;
  }
  return null;
}

function detectFixIntent(prompt) {
  return FIX_KEYWORDS.some((k) => prompt.includes(k));
}

// rev2 codex #4 — query normalization (raw prompt 전체 X)
function normalizeQuery(prompt) {
  const window = prompt.slice(0, QUERY_WINDOW);
  const tokens = window.split(/\s+/).filter((t) => t.length >= 3);
  // intersection with FIX_KEYWORDS for keyword extraction
  const matches = tokens.filter((t) => FIX_KEYWORDS.some((k) => t.includes(k)));
  return matches.length > 0 ? matches.join(" ") : window;
}

// rev2 codex #7 — gstack 미설치 시 stderr WARN + structured _warn
function querylearn(query) {
  try {
    const out = execSync(`gstack learn search --query ${JSON.stringify(query)} --format jsonl`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 5000,
    });
    return { entries: out.split("\n").filter(Boolean).map((l) => JSON.parse(l)), warn: null };

exec
/bin/zsh -lc "rg -n \"writeAtomic\\(|readSidecar\\(|mutateSidecar\\(|export .*writeAtomic|function writeAtomic|const writeAtomic\" docs/plans/plan-D-regression-memory.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
319:export function writeAtomic(sidecarPath, entries) {
326:export function readSidecar(sidecarPath) {
335:export async function mutateSidecar(sidecarPath, mutator) {
338:    const entries = readSidecar(sidecarPath);
340:    writeAtomic(sidecarPath, updated);
348:**핵심**: hook + stale-check + dismiss CLI + cycle 회고 append 가 모두 `mutateSidecar()` 호출. 동시 실행 시 lockdir 기반 직렬화 → 유실 차단.
450:  await mutateSidecar(sidecarPath, (entries) => {
515:    const sidecarEntries = readSidecar(sidecarPath);
552:- sidecar mutation 은 `mutateSidecar()` 통해 atomic (codex #6)
577:  await mutateSidecar(sidecarPath, (entries) => {
759:  writeAtomic(p, entries);
818:    const after = readSidecar(tmp.path);
832:    const after = readSidecar(tmp.path);
861:    await mutateSidecar(tmp.path, (entries) => entries.map((e) => {
871:    const after = readSidecar(tmp.path);
885:      mutateSidecar(tmp.path, (entries) => entries.map((e) => ({ ...e, dismiss_count: e.dismiss_count + 1 })))
888:    const after = readSidecar(tmp.path);
1190:sidecar append 는 `install/lib/sidecar-write.mjs` 의 `mutateSidecar()` 통과 의무 (atomic write).

exec
/bin/zsh -lc "sed -n '420,520p' docs/plans/plan-D-regression-memory.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
    return { entries: out.split("\n").filter(Boolean).map((l) => JSON.parse(l)), warn: null };
  } catch (e) {
    process.stderr.write(`[regression-recall] gstack search failed: ${e.message}\n`);
    return { entries: null, warn: "gstack-not-installed-or-search-failed" };
  }
}

// rev2 codex #4 — full /learn snapshot for orphan cleanup
function listAllLearnKeys() {
  try {
    const out = execSync(`gstack learn list --keys-only`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 5000,
    });
    return out.split("\n").map((s) => s.trim()).filter(Boolean);
  } catch {
    return null;  // gstack 미설치 → orphan cleanup skip (false-positive 삭제 차단)
  }
}

function decay(confidence, dismissCount) {
  return confidence * Math.pow(DECAY_BASE, dismissCount);
}

// rev2 codex #4 — cleanup 은 allLearnKeys 기준 (searchHits 아님)
async function orphanCleanup(sidecarPath, allLearnKeys) {
  if (allLearnKeys === null) return null;  // gstack 미가용 → skip
  const keepKeys = new Set(allLearnKeys);
  let removedCount = 0;
  await mutateSidecar(sidecarPath, (entries) => {
    const survivors = entries.filter((e) => keepKeys.has(e.key));
    removedCount = entries.length - survivors.length;
    return survivors;
  });
  if (removedCount > 0) {
    process.stderr.write(`[regression-recall] orphan keys removed: ${removedCount}\n`);
  }
  return removedCount;
}

function buildReminder(hits) {
  if (hits.length === 0) return null;
  const lines = hits.map((h) => {
    const stale = h.staleFlag ? " [⚠ stale]" : "";
    return `- ${h.key}: ${h.insight} (cycle ${h.cycles.join(",")}, confidence_decayed ${h.confidenceDecayed.toFixed(2)})${stale}`;
  });
  return [
    `🚨 [REGRESSION RECALL] 과거 유사 fix ${hits.length}건:`,
    ...lines,
    `⚠ 자동 적용 금지. 매칭 정확성 검토 후 채택.`,
    `dismiss: kzk-regression-memory dismiss <key>`,
  ].join("\n");
}

export {
  shouldSkip, detectFixIntent, normalizeQuery, decay, orphanCleanup,
  buildReminder, FIX_KEYWORDS, SELF_IMPROVE_VERBPHRASES,
};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { raw += chunk; });
  process.stdin.on("end", async () => {
    let payload;
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }
    const prompt = String(payload.prompt ?? payload.user_prompt ?? "");
    const repoRoot = process.cwd();
    const sidecarPath = path.join(repoRoot, ".kzk-harness", "regression-meta.jsonl");

    const skip = shouldSkip(prompt, process.env);
    if (skip) {
      process.stdout.write(JSON.stringify({ continue: true, _skip: skip }) + "\n");
      return;
    }
    if (!detectFixIntent(prompt)) {
      process.stdout.write(JSON.stringify({ continue: true }) + "\n");
      return;
    }

    const query = normalizeQuery(prompt);
    const { entries: learnEntries, warn } = querylearn(query);

    if (learnEntries === null) {
      // gstack 미설치 — silent skip 금지 (codex #7)
      process.stdout.write(JSON.stringify({ continue: true, _warn: warn }) + "\n");
      return;
    }

    // rev2 codex #4 — orphan cleanup 은 allLearnKeys 기준만
    const allKeys = listAllLearnKeys();
    await orphanCleanup(sidecarPath, allKeys);

    // re-read sidecar after potential cleanup
    const sidecarEntries = readSidecar(sidecarPath);
    const sidecarByKey = new Map(sidecarEntries.map((e) => [e.key, e]));

    const hits = [];
    for (const learnEntry of learnEntries) {
      const meta = sidecarByKey.get(learnEntry.key);

exec
/bin/zsh -lc "sed -n '1,220p' skills/kzk-codebase-survey/SKILL.md" in /Users/kimzerokim/work/personal/kzk-harness
exec
/bin/zsh -lc "rg -n \"Step 0\\.5|status oracle|code-review-graph status|Files / Nodes / Edges / Last updated|stale|build 의무\" skills/kzk-codebase-survey/SKILL.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
23:Run all steps in order (Step 0.5 + Step 1–8). Save report before returning.
25:### Step 0.5 — Tool Availability + Index Verification
27:`code-review-graph --version` only confirms the binary exists. The build log is not a reliable success signal — it shows the last incremental pass and may report `8 files, 5 edges` even when the full graph holds 2000+ nodes. **`code-review-graph status` is the oracle.** Always verify the index before trusting any query.
44:code-review-graph status 2>&1
48:**(c) Build if empty or stale.**
52:**(d) Verify after build.** Re-run `code-review-graph status` and confirm `Files > 0` AND `Nodes > 0`. If still empty after a build → set `CRG_AVAILABLE=false`, queue `Q-CRG-EMPTY-INDEX — build produced 0 nodes, investigate`, proceed to grep fallback.
60:If Step 0.5 ran and set `CRG_AVAILABLE=true`, trust the cache and proceed directly to the "If MCP / CLI available" paths below. If `CRG_AVAILABLE=false`, jump to the grep Fallback path.
62:If Step 0.5 was skipped entirely (interactive mode without prior survey call this session), run a fast verification before any CRG call: `command -v code-review-graph >/dev/null && code-review-graph status 2>&1 | grep -E "^Files: " ` — if missing or `Files: 0`, fall back to grep without trying to build (interactive mode rule).
212:Run all steps from kzk-codebase-survey SKILL.md in order (Step 0.5 + Step 1–8).
224:- Skipping Step 4 (library loading) → plan uses stale or hallucinated API patterns
226:- Reusing a survey report from a previous cycle without re-running → stale context

 succeeded in 0ms:
---
name: kzk-codebase-survey
version: 1.5.0
description: "Mandatory pre-planning deep codebase read — full import scope, context7 docs, TypeScript contracts. Top triggers: 'codebase survey', '코드베이스 탐색', 'spec 검증', '하나하나 확인', 'before planning'. Body §Triggers for full list."
---

> Authoritative source: `harness-share.md` §26. On conflict, that wins.

# kzk-codebase-survey

## Triggers

`codebase survey`, `코드베이스 탐색`, `deep explore`, `survey first`, `before planning`, `spec 검증`, `spec verification`, `구현 확인`, `구현 검증`, `버그 전수조사`, `implementation audit`, `spec vs implementation`, `spec 체크`, `스펙 체크`, `하나하나 확인`, `ralph로 체크`.

Mandatory pre-brainstorming and pre-planning deep read. Solves the root cause of feature gaps in plans: the planner only sees a short file list, not the full codebase context, external library APIs, or TypeScript type contracts.

**Run before:** `superpowers:brainstorming`, `kzk-spec-and-review` (spec / plan / major design draft — Step 0 precondition), `kzk-large-task-delegation` planner dispatch, `kzk-web-loop` P1/P2 `writing-plans` step, implementation verification (spec ↔ code matching, bug sweep, existing-system audit — main context dispatches here instead of reading directly).

## EXPLORER Agent

**Agent dispatch:** `oh-my-claudecode:explore` (`model=sonnet`) for file discovery + parallel `Read` in main context for full reads.

Run all steps in order (Step 0.5 + Step 1–8). Save report before returning.

### Step 0.5 — Tool Availability + Index Verification

`code-review-graph --version` only confirms the binary exists. The build log is not a reliable success signal — it shows the last incremental pass and may report `8 files, 5 edges` even when the full graph holds 2000+ nodes. **`code-review-graph status` is the oracle.** Always verify the index before trusting any query.

Sequence:

**(a) Binary check.**
```bash
export PATH="$HOME/.local/bin:$PATH"
command -v code-review-graph >/dev/null 2>&1
```
If missing AND running in autonomous mode AND `python3 -m pip --version` succeeds:
```bash
python3 -m pip install --user code-review-graph && code-review-graph install
```
PEP 668 fallback: `pipx install code-review-graph`. Both fail → set `CRG_AVAILABLE=false`, queue `Q-INSTALL-CRG-MANUAL`, proceed to grep fallback. Interactive mode without auto-install: log the install command and set `CRG_AVAILABLE=false`. Never halt.

**(b) Index status (oracle).**
```bash
code-review-graph status 2>&1
```
Parse for `Files: <N>`, `Nodes: <N>`, `Edges: <N>`, `Last updated: <ISO>`, `Built at commit: <sha>`. If status command fails OR `Files: 0` OR `Nodes: 0` → index empty/missing.

**(c) Build if empty or stale.**
- Empty: run `code-review-graph build` (foreground — block on it).
- Stale: if `Built at commit: <sha>` differs from `git rev-parse HEAD` AND `git rev-list --count <sha>..HEAD` > 10 → run `code-review-graph build` to refresh. Single-commit drift is fine; trust the existing index.

**(d) Verify after build.** Re-run `code-review-graph status` and confirm `Files > 0` AND `Nodes > 0`. If still empty after a build → set `CRG_AVAILABLE=false`, queue `Q-CRG-EMPTY-INDEX — build produced 0 nodes, investigate`, proceed to grep fallback.

**(e) Cache for session.** Set `CRG_AVAILABLE=true`, `CRG_FILES=<N>`, `CRG_NODES=<N>`, `CRG_LAST_BUILT_SHA=<sha>`. Subsequent survey calls within the same session trust this cache; only re-run `status` if > 30 minutes elapsed OR new commits detected since `CRG_LAST_BUILT_SHA`.

**Anti-pattern**: trusting build log output alone. The build log shows the most recent incremental pass — it can read tiny numbers even when the full graph is healthy. Only `status` is authoritative.

### Step 1 — Scope Expansion

If Step 0.5 ran and set `CRG_AVAILABLE=true`, trust the cache and proceed directly to the "If MCP / CLI available" paths below. If `CRG_AVAILABLE=false`, jump to the grep Fallback path.

If Step 0.5 was skipped entirely (interactive mode without prior survey call this session), run a fast verification before any CRG call: `command -v code-review-graph >/dev/null && code-review-graph status 2>&1 | grep -E "^Files: " ` — if missing or `Files: 0`, fall back to grep without trying to build (interactive mode rule).

**Path priority: MCP tools → CLI → grep.** When `code-review-graph install` runs it auto-registers as an MCP server (in `.mcp.json`, `.claude/`, `.cursor/`, etc.). Probe with `ToolSearch(query="+code-review-graph")` once per session — if MCP tools surface, use them in preference to the CLI form below. See `## MCP tool surface` near the bottom of this file for the tool→use-case mapping.

**If MCP tools available (preferred):**
1. `semantic_search_nodes` — find related symbols by name/keyword
2. `query_graph(pattern="callers_of"|"callees_of"|"imports_of"|"tests_for", target=<file or symbol>)` — replaces `code-review-graph query/blast-radius`
3. `get_impact_radius(target=<file>)` — blast-radius scoring
4. Same feature-dir + test-file inclusion rules as below

**If CLI available (exit 0) but no MCP:**
1. `code-review-graph query --file <target>` — forward dependency graph
2. `code-review-graph blast-radius --file <target>` — reverse deps (who imports target)
3. Include all files in the same feature directory (closest named folder boundary — defined as the nearest ancestor directory whose name is not a generic structural folder such as `src/`, `lib/`, `app/`, `components/`, `pages/`)
4. Include all co-located test files (`*.test.*`, `*.spec.*`)

**Fallback (not installed):**
1. Parse all `import`/`require`/`from` statements in the target files
2. Trace one transitive hop: `grep -r "from '.*<module-name>'" --include="*.ts" --include="*.tsx" -l`
3. Include all files in the same feature directory (same definition as above — nearest non-generic ancestor)
4. Include all co-located test files (`*.test.*`, `*.spec.*`)

If code-review-graph is not installed, note "code-review-graph not available — using grep fallback" in report header.

Output: complete file list for Step 2.

### Step 2 — Deep Read (parallel)

Read every file in the scope list using parallel `Read` calls. Full file — no excerpts, no line limits.

Also collect recent history per file:
```bash
git log --oneline -5 -- <file>
```

### Step 3 — Library Detection

Parse all import statements from deep-read files. Filter to external packages (non-relative paths). Cross-reference `package.json` `dependencies` + `devDependencies` (or `requirements.txt`, `go.mod`). Keep only packages directly referenced in the files being changed.

### Step 4 — Library Knowledge Loading

For each relevant external library, in priority order:

1. `mcp__plugin_context7_context7__resolve-library-id("<library>")` → then `mcp__plugin_context7_context7__query-docs`
2. Check for a matching `kzk-*`, `superpowers:*`, or `gstack:*` skill → `Skill("<skill-name>")` if found
3. Fallback: `WebSearch("<library> <version> API reference")`

Output: per-library "current correct API patterns" block in the report.

### Step 5 — Pattern Extraction

From the deep-read internal files, extract and record:
- Naming conventions (PascalCase components, camelCase hooks, SCREAMING_SNAKE constants)
- Error handling approach: throw / return error / Result type / error boundary / toast
- Async: async/await / Promise chains / SWR / React Query / tRPC
- State management: useState / Zustand / Redux / Context
- Existing library call patterns already in use

### Step 6 — TypeScript Type/Interface Contracts

For TypeScript projects, scan every file in scope for:
- All `export type`, `export interface`, `export enum` declarations
- For each exported type: name, fields/members, and which files import it
- Flag any type imported by files OUTSIDE the current scope with ⚠ (breaking-change risk)

For non-TypeScript projects: skip this step, note "N/A" in report.

### Step 7 — Env Vars / Config

Scan all files in scope for:
- `process.env.<VAR>` (Node.js)
- `os.getenv()` / `os.environ["VAR"]` (Python)
- `import.meta.env.<VAR>` (Vite)
- `config.<key>` / `getConfig("<key>")` patterns

Cross-reference `.env.example`, `config/default.json`, or equivalent if present.

Output table: var name | type/format | default | file where used.

### Step 8 — Report Generation

Compile all step outputs into one structured report. Save to:
- **Manual session:** `docs/harness/surveys/YYYY-MM-DD-<topic>-survey.md`
- **Autonomous loop:** `.web-loop/surveys/cycle-N-survey.md`

Report format:

```
# Codebase Survey: <topic> (YYYY-MM-DD HH:MM)

## Scope
### Directly affected files
- path/to/file.ts — [one-line purpose]
### Transitively affected files
- path/to/dep.ts — imported by [which file]
### Test files
- path/to/file.test.ts

## Dependency Map
### <filename>
- Exports: [list of exported symbols]
- Imports from: [internal deps]
- Imported by: [reverse deps]

## Type / Interface Contracts
### <TypeName> (path/to/file.ts)
- Fields: [...]
- Imported by (outside scope): ⚠ [breaking-change risk]

## Features to Preserve
- [Feature name]: [file, what it does, why it must not break]

## Integration Points
- [External caller file] → [function/endpoint it calls]

## Library APIs (context7 current docs)
### <library@version>
[Relevant API patterns for this change only]

## Env Vars
| Var | Type | Default | File |
|---|---|---|---|

## Internal Patterns
- Naming: [...]
- Error handling: [...]
- Async: [...]
- State: [...]

## Edge Cases (from existing tests)
- [test name]: [what edge case it guards]
```

## Autonomous Dispatch Shape

When called from kzk-web-loop or harness loop (non-interactive):

```typescript
// dispatch shape pseudocode — not literal TypeScript; use Agent tool with JSON params
Agent({
  subagent_type: 'oh-my-claudecode:explore',
  model: 'sonnet',
  prompt: `You are running kzk-codebase-survey for this issue: "<issue description verbatim>".

Target files (starting scope): <list of files>
Working directory: <absolute path>
Report save path: .web-loop/surveys/cycle-<N>-survey.md

Required reading before starting: CLAUDE.md, harness-share.md §26.

Run all steps from kzk-codebase-survey SKILL.md in order (Step 0.5 + Step 1–8).
Save the completed report to the path above.
Return: the absolute path to the saved report file.
If any step is blocked, note the reason in the report and continue.`,
  run_in_background: false,
});
```

## Anti-patterns

exec
/bin/zsh -lc 'rg -n "''^version:|Interaction with other kzk|Run before|Triggers|Gate 4|Recall 결과 inject|Subagent prompt requirements|regression-recall|fix-scope|cache" skills/kzk-pre-commit-gate/SKILL.md skills/kzk-large-task-delegation/SKILL.md skills/kzk-regression-memory/SKILL.md skills/kzk-codebase-survey/SKILL.md install/test/run-tests.sh CLAUDE.md README.md' in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
skills/kzk-large-task-delegation/SKILL.md:3:version: 1.6.0
skills/kzk-large-task-delegation/SKILL.md:4:description: "Large tasks (3+ files / 200+ LoC / 5+ file read / multi-stage) dispatch to fresh subagents — main never executes. Top triggers: '큰 작업', '버그 전수조사', '사이클 자율', 'plan 쪼개', 'subagent dispatch'. Body §Triggers for full list."
skills/kzk-large-task-delegation/SKILL.md:11:## Triggers
skills/kzk-large-task-delegation/SKILL.md:217:## Subagent prompt requirements (fresh subagent has zero memory)
skills/kzk-large-task-delegation/SKILL.md:230:- **Recall 결과 inject** (Plan D): subagent dispatch prompt 의 Rules block 에 메인이 받은 [REGRESSION RECALL] system-reminder 가 있으면, 해당 텍스트를 verbatim 으로 dispatch prompt 에 inject. **size cap 200 char** — reminder 가 200 char 초과 시 truncate (hits 우선순위 high → low confidence_decayed 로 정렬 후 cumulative length 200 도달까지) + warning footer (`[truncated: <N> more hits]`). subagent 가 fix 작업 시 recall 결과 read. 매칭 정확성은 subagent 가 검토.
skills/kzk-large-task-delegation/SKILL.md:310:## Interaction with other kzk-*
CLAUDE.md:13:| `kzk-playwright-verification` | Playwright, Gate 4, browser_navigate, screenshot, MCP drop |
CLAUDE.md:29:Autonomous mode = explicit user permission only. Triggers: "ralph로 돌려", "자는 동안 진행해", "끝까지 끝내줘".
CLAUDE.md:92:- Claude Code plugins (`/plugin` inside a session): `oh-my-claudecode` (subagents, deepinit_manifest), `playwright-mcp` (Gate 4 + web-loop browser MCP).
install/test/run-tests.sh:226:  local fake_dir="$test_home/.claude/plugins/cache/omc-fake/oh-my-claudecode/0.0.0/scripts"
install/test/run-tests.sh:601:# Plan D — regression-recall.test.mjs
install/test/run-tests.sh:605:  if node "$REPO_ROOT/install/test/regression-recall.test.mjs"; then
install/test/run-tests.sh:606:    printf '  PASS: regression-recall.test.mjs\n'
install/test/run-tests.sh:609:    printf '  FAIL: regression-recall.test.mjs\n'
skills/kzk-pre-commit-gate/SKILL.md:3:version: 1.2.0
skills/kzk-pre-commit-gate/SKILL.md:4:description: "Up-to-6-step Pre-commit Gate (AGENTS.md sync / ai-slop / secrets / build / test / Playwright). Top triggers: 'commit', 'pre-commit', 'Gate 0', 'AGENTS.md sync', 'doc-only'. Body §Triggers for full list."
skills/kzk-pre-commit-gate/SKILL.md:11:## Triggers
skills/kzk-pre-commit-gate/SKILL.md:13:`commit`, `pre-commit`, `Gate 0`, `Gate 1`, `Gate 1.5`, `Gate 2`, `Gate 3`, `Gate 4`, `AGENTS.md sync`, `ai-slop-cleaner`, `secrets scan`, `autonomous commit`, `doc-only exception`.
skills/kzk-pre-commit-gate/SKILL.md:19:If the commit adds or removes a source file (`git diff --cached --name-status` status `A` or `D`), or creates a new directory under any tracked source root (configure the list in your CLAUDE.md), the corresponding `AGENTS.md` file(s) in those directories MUST be updated in the SAME commit. Reason: `deepinit` was historically deferred to "pre-merge" and routinely degenerated into a token-burn skill load with no real regen. Forcing AGENTS.md to ride along with the file change keeps the manifest honest one commit at a time.
skills/kzk-pre-commit-gate/SKILL.md:45:git diff --cached | grep -iE "(password|secret|api_key|aws_secret|private_key|token)\s*[:=]\s*['\"]?[A-Za-z0-9+/]{8,}" || true
skills/kzk-pre-commit-gate/SKILL.md:60:## Gate 4 — UI/CSS visual verification (Playwright MCP)
skills/kzk-pre-commit-gate/SKILL.md:62:If any changed file matches `src/**/*.{tsx,ts,css}` (or your repo's equivalent frontend source glob), Gate 4 is mandatory. See `kzk-playwright-verification` skill for the full routine. Skipping / deferring / "do it later in the final sweep" is forbidden.
skills/kzk-pre-commit-gate/SKILL.md:64:Exception: change is solely under `src/**/*.test.{tsx,ts}` — Gate 4 may be skipped.
skills/kzk-pre-commit-gate/SKILL.md:74:- Gate 4 N/A
skills/kzk-pre-commit-gate/SKILL.md:121:- Critic / verifier / Gate 4 visual reviewer 2 consecutive FAIL on the same change (Gate 4 Playwright visual review, plan reviewer, verifier agent) → halt + user-queue entry. See `kzk-autonomous-boundary` for the full halt condition list. Exception: `kzk-web-loop` overrides consecutive-FAIL halts with skip+next-issue (see `kzk-web-loop` §Failure Handling).
skills/kzk-pre-commit-gate/SKILL.md:124:## Interaction with other kzk-*
skills/kzk-pre-commit-gate/SKILL.md:127:- **kzk-playwright-verification**: Implements Gate 4 (browser smoke + screenshot drop).
skills/kzk-codebase-survey/SKILL.md:3:version: 1.5.0
skills/kzk-codebase-survey/SKILL.md:4:description: "Mandatory pre-planning deep codebase read — full import scope, context7 docs, TypeScript contracts. Top triggers: 'codebase survey', '코드베이스 탐색', 'spec 검증', '하나하나 확인', 'before planning'. Body §Triggers for full list."
skills/kzk-codebase-survey/SKILL.md:11:## Triggers
skills/kzk-codebase-survey/SKILL.md:17:**Run before:** `superpowers:brainstorming`, `kzk-spec-and-review` (spec / plan / major design draft — Step 0 precondition), `kzk-large-task-delegation` planner dispatch, `kzk-web-loop` P1/P2 `writing-plans` step, implementation verification (spec ↔ code matching, bug sweep, existing-system audit — main context dispatches here instead of reading directly).
skills/kzk-codebase-survey/SKILL.md:54:**(e) Cache for session.** Set `CRG_AVAILABLE=true`, `CRG_FILES=<N>`, `CRG_NODES=<N>`, `CRG_LAST_BUILT_SHA=<sha>`. Subsequent survey calls within the same session trust this cache; only re-run `status` if > 30 minutes elapsed OR new commits detected since `CRG_LAST_BUILT_SHA`.
skills/kzk-codebase-survey/SKILL.md:60:If Step 0.5 ran and set `CRG_AVAILABLE=true`, trust the cache and proceed directly to the "If MCP / CLI available" paths below. If `CRG_AVAILABLE=false`, jump to the grep Fallback path.
skills/kzk-codebase-survey/SKILL.md:238:| `detect_changes` | kzk-pre-commit-gate Gate 4 / kzk-spec-and-review — risk-scored diff analysis |
skills/kzk-codebase-survey/SKILL.md:245:## Interaction with other kzk-*
README.md:71:5. **Commit.** Saying "commit" loads `kzk-pre-commit-gate`. The skill runs up to 6 gates per commit batch — Gate 0 (AGENTS.md sync, conditional), Gate 1 (ai-slop-cleaner), Gate 1.5 (secrets scan), Gate 2 (build), Gate 3 (tests), Gate 4 (Playwright UI smoke if UI changed via `kzk-playwright-verification`). Each commit message ends with the gate-PASS line consumed by `kzk-pre-merge-sync`.
README.md:83:| `kzk-playwright-verification` | Playwright, Gate 4, browser_navigate, screenshot, MCP drop |
README.md:105:- **Claude Code 자체 skill discovery** — `~/.claude/skills/kzk-*/SKILL.md` description + body §Triggers 매칭
README.md:118:(추가 phrase 는 각 skill 본문의 `## Triggers` 섹션 참조 — description Top triggers 는 시스템 리마인더 노출용 부분 집합.)
README.md:196:- **doc-only 아닌 일반 commit**: Gate 0 (AGENTS.md sync, hierarchy 있으면) → Gate 1 ai-slop-cleaner → Gate 1.5 secrets → Gate 2 build → Gate 3 test → Gate 4 Playwright (UI 변경 시).
README.md:204:#### 12. UI / Playwright Gate 4 / OAuth 로그인
README.md:206:- **자동 로드**: 변경이 `web/src/**/*.{tsx,ts,css}` 포함 시 `kzk-pre-commit-gate` Gate 4 가 `kzk-playwright-verification` 호출 강제
README.md:208:- **메인 역할**: 앱 내 "Sign in with Google" 버튼은 메인이 직접 클릭 (사용자 대기 X). Google 계정 picker 까지 cached 계정 자동 클릭. password / MFA prompt 만 halt + user-queue.
skills/kzk-regression-memory/SKILL.md:3:version: 1.0.0
skills/kzk-regression-memory/SKILL.md:4:description: "Regression memory + auto-recall — fix 시작 시 과거 유사 fix 자동 조회 (gstack /learn + sidecar). dismiss CLI mutation 포함. Top triggers: 'regression memory', '재발 방지', 'fix 시작', 'recall', '과거 fix 조회', 'dismiss recall'. Body §Triggers for full list."
skills/kzk-regression-memory/SKILL.md:11:## Triggers
skills/kzk-regression-memory/SKILL.md:52:UserPromptSubmit hook (`install/hooks/regression-recall.mjs`) 발동 시:
skills/kzk-regression-memory/SKILL.md:66:   - cleanup 은 `allLearnKeys` snapshot 기준만 — sidecar entry 의 key 가 `allLearnKeys` 에 부재 → 자동 삭제 + stderr 로그 (`[regression-recall] orphan key removed: <key>`). 현재 query 에 안 걸린 정상 entry 보존
skills/kzk-regression-memory/SKILL.md:138:**D commit 시점**: hook 파일은 추가하지만 settings.json 등록 안 함. `--regression-recall` flag 호출 안 한 상태.
skills/kzk-regression-memory/SKILL.md:140:**자동 enable on main 머지**: **5 plan (A→D→B→C→E)** 모두 끝나고 `kzk-pre-merge-sync` 의 마지막 step 에서 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트). `--regression-recall` 호출 시 keyword-detector 도 explicit dependency 자동 enable.
skills/kzk-regression-memory/SKILL.md:151:| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=regression-recall` |
skills/kzk-regression-memory/SKILL.md:155:| Plan D 자가오염 시 | hook default DISABLED 라 즉시 위협 없음. enable 후 발견 시 `OMC_SKIP_HOOKS=regression-recall` 즉시 비활성 |
skills/kzk-regression-memory/SKILL.md:156:| **Global install 산출물 cleanup** | `~/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs` 제거 + 중복 settings.json `UserPromptSubmit` entry 정리 (`uninstall-global.sh --regression-recall` reverse path. 또는 jq 명령: `jq '.hooks.UserPromptSubmit \|= map(select(.hooks[0].command \| test("regression-recall") \| not))' ~/.claude/settings.json`) |
skills/kzk-regression-memory/SKILL.md:158:## Interaction with other kzk-*
skills/kzk-regression-memory/SKILL.md:160:- **kzk-pre-merge-sync**: 마지막 step 에서 `--enable-hooks --regression-recall` 자동 호출 (사용자 confirm). first-enable 망각 차단. fail-closed.
skills/kzk-regression-memory/SKILL.md:163:- **kzk-fix-scope-expansion** (Plan B): D recall 결과를 consumer 로 read — fix-start hook 이 D 다음에 발동.

exec
/bin/zsh -lc 'rg -n "14|15|16|SKILL.md files landed|kzk- rows|All 14|All 15|All 16|marker block" install/test/run-tests.sh CLAUDE.md README.md' in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
README.md:3:Workflow skill layer for [Claude Code](https://claude.ai/code). Installs 15 `kzk-*` skills into any project — commit gates, autonomous mode boundaries, Playwright verification, large task delegation, and more.
README.md:32:**Why global is recommended** — install once, every Claude Code session in any directory auto-activates. No per-project migration. Update with one command. No config files accumulate inside project trees. The 15 skill `.md` files live in `~/.claude/skills/kzk-*` (auto-loaded), the umbrella `harness-share.md` lives in `~/.claude/skills/.kzk-harness-shared/` (dot-prefix prevents Claude from treating it as an invocable skill), and a clearly-marked block in `~/.claude/CLAUDE.md` carries the routing table. Outside that block, your existing `~/.claude/CLAUDE.md` is left byte-for-byte identical.
README.md:55:Removes the marker block from `~/.claude/CLAUDE.md`, deletes `~/.claude/skills/kzk-*` and `~/.claude/skills/.kzk-harness-shared/`. Per-project artifacts (`harness-flow-progress.md`, `.web-loop/`, etc.) are left untouched — pass `--purge-project-artifacts <path>` to opt-in clean a specific repo.
README.md:102:설치만 해도 15개 kzk-* 스킬이 자동 로드되지만, **어떤 phrase 로 prompt 를 시작하느냐** 에 따라 자동 활성화되는 skill 묶음이 달라집니다. 매칭은 두 경로로:
install/test/run-tests.sh:78:# All 14 ~/.claude/skills/kzk-*/SKILL.md must exist after install
install/test/run-tests.sh:91:  assert_eq "15 SKILL.md files landed" "15" "$count"
install/test/run-tests.sh:129:# ~/.claude/CLAUDE.md must have BEGIN/END markers and 14 kzk- rows inside
install/test/run-tests.sh:161:  assert_eq "15 kzk- rows in marker block" "15" "$row_count"
install/test/run-tests.sh:168:# Running install twice produces no change to the marker block
install/test/run-tests.sh:178:  # Snapshot the marker block after first run
install/test/run-tests.sh:196:    printf '  PASS: marker block unchanged after second install\n'
install/test/run-tests.sh:199:    printf '  FAIL: marker block changed between runs (not idempotent)\n'
install/test/run-tests.sh:201:    ERRORS+=("test_idempotent: marker block changed")
install/test/run-tests.sh:280:  # Pre-populate CLAUDE.md with a stub OMC marker block
CLAUDE.md:3:This is the kzk-harness repository — a workflow skill layer for Claude Code. It contains 15 `kzk-*` skills installed into any project via the one-liner in `README.md`.
CLAUDE.md:7:All 15 skills are active in this repo. Load one by mentioning its trigger keyword.
CLAUDE.md:77:- §1–§14.5: Core workflow (gates, autonomous mode, rate limit, context, plan continuation)
CLAUDE.md:78:- §15–§24: Supporting protocols (deepinit, production access, visibility, MCP reconnect, codex review)

exec
/bin/zsh -lc 'rg -n "regression-recall|fix-scope-trigger|step 3|enable-hooks|pre-merge-sync" skills/kzk-pre-merge-sync/SKILL.md docs/plans/plan-B-fix-scope-expansion.md docs/plans/plan-D-regression-memory.md' in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
docs/plans/plan-D-regression-memory.md:14:신규 skill `kzk-regression-memory` + recall hook 인프라 구축. AI 자율실행 cycle 이 과거 fix 기록을 fix 시작 시점에 자동 조회 (recall), regression 망각 차단. 본 plan 의 hook 은 **commit 시점에 default DISABLED** — keyword-detector 와의 dependency 충돌 + B/C cycle 자가오염 차단. **5 plan (A→D→B→C→E) 모두 끝나고 main 머지 시점**에 `kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 후) 되어 활성.
docs/plans/plan-D-regression-memory.md:28:2. `install/hooks/regression-recall.mjs` 신규 — UserPromptSubmit hook, 자가-skip guard 구현, /learn search + sidecar JSONL grep + decay + archived 필터링, system-reminder inject, gstack 미설치 시 stderr WARN + `_warn` reason, orphan cleanup 은 `allLearnKeys` snapshot 기준만. **default DISABLED** (settings.json 등록 안 함)
docs/plans/plan-D-regression-memory.md:32:6. `install/test/regression-recall.test.mjs` 신규 — mock fixture 기반 test (recall 매칭 + decay + dismiss + 자가-skip + orphan cleanup 시뮬 + dismiss CLI mutation + atomic write 동시성)
docs/plans/plan-D-regression-memory.md:35:9. `install/install-global.sh` `enable_hooks()` 확장 — `--regression-recall` flag 추가, regression-recall.mjs 등록 + keyword-detector 자동 enable (explicit dependency). **idempotent append** (jq 로 중복 entry 검사 후 append). 실패 시 exit non-zero
docs/plans/plan-D-regression-memory.md:37:11. `install/test/run-tests.sh` 갱신 — `regression-recall.test.mjs` 호출 등록
docs/plans/plan-D-regression-memory.md:38:12. `skills/kzk-pre-merge-sync/SKILL.md` 갱신 — 마지막 step `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트). **fail-closed**: 등록 실패 (jq 부재 / duplicate / exit non-zero) → merge block
docs/plans/plan-D-regression-memory.md:43:17. `bash install/test/run-tests.sh` PASS (regression-recall.test.mjs 포함 전체 통과)
docs/plans/plan-D-regression-memory.md:48:- `SKILL_PMS = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-pre-merge-sync/SKILL.md`
docs/plans/plan-D-regression-memory.md:51:- `HOOK_RECALL = /Users/kimzerokim/work/personal/kzk-harness/install/hooks/regression-recall.mjs`
docs/plans/plan-D-regression-memory.md:55:- `TEST_RECALL = /Users/kimzerokim/work/personal/kzk-harness/install/test/regression-recall.test.mjs`
docs/plans/plan-D-regression-memory.md:76:   - **gstack 미설치 → recall feature OFF**: hook 발동 시 `querylearn()` 가 null 반환 → `_warn:"gstack-not-installed"` structured reason + stderr WARN. inject 결과 0건. `kzk-pre-merge-sync` step 3 의 `--regression-recall` enable 도 사용자에게 명시 (확인 후 거부 가능)
docs/plans/plan-D-regression-memory.md:98:   {"key":"plan-d-step-0-test","file_snapshot":"install/hooks/regression-recall.mjs:42@abc1234","related_cycles":[31],"dismiss_count":0,"last_dismissed_at":null,"archived":false,"stale":false}
docs/plans/plan-D-regression-memory.md:169:UserPromptSubmit hook (`install/hooks/regression-recall.mjs`) 발동 시:
docs/plans/plan-D-regression-memory.md:183:   - cleanup 은 `allLearnKeys` snapshot 기준만 — sidecar entry 의 key 가 `allLearnKeys` 에 부재 → 자동 삭제 + stderr 로그 (`[regression-recall] orphan key removed: <key>`). 현재 query 에 안 걸린 정상 entry 보존
docs/plans/plan-D-regression-memory.md:255:**D commit 시점**: hook 파일은 추가하지만 settings.json 등록 안 함. `--regression-recall` flag 호출 안 한 상태.
docs/plans/plan-D-regression-memory.md:257:**자동 enable on main 머지**: **5 plan (A→D→B→C→E)** 모두 끝나고 `kzk-pre-merge-sync` 의 마지막 step 에서 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트). `--regression-recall` 호출 시 keyword-detector 도 explicit dependency 자동 enable.
docs/plans/plan-D-regression-memory.md:268:| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=regression-recall` |
docs/plans/plan-D-regression-memory.md:272:| Plan D 자가오염 시 | hook default DISABLED 라 즉시 위협 없음. enable 후 발견 시 `OMC_SKIP_HOOKS=regression-recall` 즉시 비활성 |
docs/plans/plan-D-regression-memory.md:273:| **Global install 산출물 cleanup** | `~/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs` 제거 + 중복 settings.json `UserPromptSubmit` entry 정리 (`uninstall-global.sh --regression-recall` reverse path. 또는 jq 명령: `jq '.hooks.UserPromptSubmit \|= map(select(.hooks[0].command \| test("regression-recall") \| not))' ~/.claude/settings.json`) |
docs/plans/plan-D-regression-memory.md:277:- **kzk-pre-merge-sync**: 마지막 step 에서 `--enable-hooks --regression-recall` 자동 호출 (사용자 confirm). first-enable 망각 차단. fail-closed.
docs/plans/plan-D-regression-memory.md:350:### Task 3 — `install/hooks/regression-recall.mjs` 신규 (~210 LoC)
docs/plans/plan-D-regression-memory.md:360:// regression-recall.mjs — UserPromptSubmit hook for kzk-regression-memory.
docs/plans/plan-D-regression-memory.md:364:// Default DISABLED at Plan D commit. Auto-enabled by kzk-pre-merge-sync last step.
docs/plans/plan-D-regression-memory.md:422:    process.stderr.write(`[regression-recall] gstack search failed: ${e.message}\n`);
docs/plans/plan-D-regression-memory.md:456:    process.stderr.write(`[regression-recall] orphan keys removed: ${removedCount}\n`);
docs/plans/plan-D-regression-memory.md:706:### Task 6 — `install/test/regression-recall.test.mjs` 신규 (~200 LoC)
docs/plans/plan-D-regression-memory.md:714:// regression-recall.test.mjs — Plan D unit tests (rev2).
docs/plans/plan-D-regression-memory.md:727:} from "../hooks/regression-recall.mjs";
docs/plans/plan-D-regression-memory.md:936:{"key":"plan-d-step-0-test","file_snapshot":"install/hooks/regression-recall.mjs:42@abc1234","related_cycles":[31],"dismiss_count":0,"last_dismissed_at":null,"archived":false,"stale":false}
docs/plans/plan-D-regression-memory.md:947:**변경 1 — `parse_flags()` 에 `--regression-recall` 추가**: 기존 `--enable-hooks` 옆에 `--regression-recall` flag 추가, default off (`DO_REGRESSION_RECALL=0`).
docs/plans/plan-D-regression-memory.md:961:  # Plan D: regression-recall hook + sidecar-write lib + dismiss bin
docs/plans/plan-D-regression-memory.md:963:    cp "$src/install/hooks/regression-recall.mjs" \
docs/plans/plan-D-regression-memory.md:977:    emit "  hooks: jq not found — cannot update settings.json. Install jq and re-run with --enable-hooks." >&2
docs/plans/plan-D-regression-memory.md:979:    # rev2 codex #3 — fail-closed: jq 부재 시 enable 실패 → exit non-zero (called from kzk-pre-merge-sync step 3)
docs/plans/plan-D-regression-memory.md:997:    record "hooks: UserPromptSubmit hook registered (--enable-hooks)"
docs/plans/plan-D-regression-memory.md:1000:  # Plan D: regression-recall idempotent append
docs/plans/plan-D-regression-memory.md:1002:    local rr_cmd="node $HOME/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs"
docs/plans/plan-D-regression-memory.md:1006:      emit "  hooks: regression-recall.mjs already registered — skip"
docs/plans/plan-D-regression-memory.md:1007:      record "hooks: regression-recall skip (already registered)"
docs/plans/plan-D-regression-memory.md:1013:      emit "  hooks: regression-recall.mjs registered (--regression-recall)"
docs/plans/plan-D-regression-memory.md:1014:      record "hooks: regression-recall hook registered (--regression-recall, depends on --enable-hooks)"
docs/plans/plan-D-regression-memory.md:1021:**변경 3 — `--regression-recall` 가 `--enable-hooks` 자동 enable**: `parse_flags()` 끝 또는 `main()` 진입부에:
docs/plans/plan-D-regression-memory.md:1024:# Plan D: --regression-recall 는 --enable-hooks 의 dependency
docs/plans/plan-D-regression-memory.md:1026:  emit "  --regression-recall implies --enable-hooks (explicit dependency)"
docs/plans/plan-D-regression-memory.md:1036:    emit "  ERROR: enable_hooks failed — aborting (fail-closed for kzk-pre-merge-sync step 3)" >&2
docs/plans/plan-D-regression-memory.md:1094:# Plan D — regression-recall.test.mjs
docs/plans/plan-D-regression-memory.md:1098:  if node "$REPO_ROOT/install/test/regression-recall.test.mjs"; then
docs/plans/plan-D-regression-memory.md:1099:    printf '  PASS: regression-recall.test.mjs\n'
docs/plans/plan-D-regression-memory.md:1102:    printf '  FAIL: regression-recall.test.mjs\n'
docs/plans/plan-D-regression-memory.md:1115:### Task 11 — `kzk-pre-merge-sync/SKILL.md` 마지막 step 추가 (~35 LoC) — codex #3 답
docs/plans/plan-D-regression-memory.md:1124:**5 plan (A→D→B→C→E)** 모두 끝나고 `feature/memory` → `main` 머지 직전, regression-recall hook 의 default DISABLED 를 ENABLED 로 전환:
docs/plans/plan-D-regression-memory.md:1127:bash install/install-global.sh --enable-hooks --regression-recall
docs/plans/plan-D-regression-memory.md:1130:`--regression-recall` 는 explicit dependency 로 `--enable-hooks` (keyword-detector) 도 자동 enable.
docs/plans/plan-D-regression-memory.md:1133:- 거부 → 후속 enable 은 사용자가 직접 위 command 실행. PR description 또는 milestone commit message 에 "regression-recall hook left disabled by user request" 명시 의무
docs/plans/plan-D-regression-memory.md:1137:1. `install-global.sh --enable-hooks --regression-recall` exit code 검사 — non-zero → merge block (`exit 1`)
docs/plans/plan-D-regression-memory.md:1138:2. settings.json 의 `UserPromptSubmit` 배열에 `regression-recall.mjs` entry 1개만 존재 검증 (jq 로 count). 0개 또는 2개+ → merge block
docs/plans/plan-D-regression-memory.md:1145:Skip = block merge. 단, 사용자가 명시적으로 "regression-recall 비활성 유지" 선언한 경우만 skip 허용 (PR description 또는 milestone commit message 에 명시).
docs/plans/plan-D-regression-memory.md:1148:- ENABLED: `regression-recall hook enabled via kzk-pre-merge-sync step 3`
docs/plans/plan-D-regression-memory.md:1149:- 사용자 명시 거부: `regression-recall hook left disabled by user request`
docs/plans/plan-D-regression-memory.md:1155:- [ ] regression-recall hook enabled via step 3 (or user-declined per spec rev6 §Default DISABLED, fail-closed verified)
docs/plans/plan-D-regression-memory.md:1161:- **kzk-regression-memory**: 본 skill step 3 가 regression-recall hook 의 first-enable gate. spec rev6 §Default DISABLED 의 자동 enable 진입점. fail-closed (jq 부재 / install-global.sh non-zero / duplicate entry → merge block).
docs/plans/plan-D-regression-memory.md:1242:- Trigger: `UserPromptSubmit` hook (`install/hooks/regression-recall.mjs`)
docs/plans/plan-D-regression-memory.md:1294:- **5 plan (A→D→B→C→E)** 끝나고 `kzk-pre-merge-sync` step 3 가 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트)
docs/plans/plan-D-regression-memory.md:1295:- `--regression-recall` 는 keyword-detector 도 explicit dependency 로 자동 enable
docs/plans/plan-D-regression-memory.md:1303:| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=regression-recall` |
docs/plans/plan-D-regression-memory.md:1308:| **Global install 산출물 cleanup** | `~/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs` + `lib/sidecar-write.mjs` + `bin/kzk-regression-memory.mjs` 제거 + 중복 settings.json `UserPromptSubmit` entry 정리 (`uninstall-global.sh --regression-recall` 또는 jq: `jq '.hooks.UserPromptSubmit \|= map(select(.hooks[0].command \| test("regression-recall") \| not))' ~/.claude/settings.json`) |
docs/plans/plan-D-regression-memory.md:1344:- Gate 3: test — `bash install/test/run-tests.sh` PASS (regression-recall.test.mjs 포함)
docs/plans/plan-D-regression-memory.md:1353:Hook default DISABLED at commit — kzk-pre-merge-sync step 3 auto-enables (fail-closed).
docs/plans/plan-D-regression-memory.md:1357:- install/hooks/regression-recall.mjs (신규, default DISABLED, allLearnKeys 기반 orphan cleanup)
docs/plans/plan-D-regression-memory.md:1361:- install/test/regression-recall.test.mjs + fixtures/ (신규, 7-field schema)
docs/plans/plan-D-regression-memory.md:1362:- install/install-global.sh: --regression-recall flag + idempotent append + fail-closed
docs/plans/plan-D-regression-memory.md:1364:- skills/kzk-pre-merge-sync: step 3 auto-enable hook (fail-closed) on main 머지
docs/plans/plan-D-regression-memory.md:1379:| `regression-recall.mjs` exports (shouldSkip / detectFixIntent / normalizeQuery / decay / orphanCleanup / buildReminder) | `regression-recall.test.mjs` unit | 함수 단위 검증만. settings.json 통합은 manual |
docs/plans/plan-D-regression-memory.md:1380:| `sidecar-write.mjs` (mutateSidecar / writeAtomic / acquireLock) | `regression-recall.test.mjs` T14 — 동시성 5 ops | lockdir + atomic mv 검증. flock (Linux) 미지원 환경에서도 lockdir 패턴 동작 |
docs/plans/plan-D-regression-memory.md:1381:| `kzk-regression-memory dismiss` CLI | `regression-recall.test.mjs` T12, T13 | dismiss_count++ + archived threshold 검증 |
docs/plans/plan-D-regression-memory.md:1382:| sidecar fixture schema (7필드) | `regression-recall.test.mjs` T9 | jsonl parse + stale 필드 존재 확인 |
docs/plans/plan-D-regression-memory.md:1384:| `install-global.sh --regression-recall` flag | (별도 test 없음 — 본 plan 책임 X) | settings.json 수정은 manual cycle 확인. fail-closed exit code 는 kzk-pre-merge-sync 에서 검증 |
docs/plans/plan-D-regression-memory.md:1397:| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=regression-recall` |
docs/plans/plan-D-regression-memory.md:1401:| Plan D 자가오염 | hook default DISABLED 라 즉시 위협 X. enable 후 발견 시 `OMC_SKIP_HOOKS=regression-recall` 즉시 비활성. 영구 차단 시 `git revert` |
docs/plans/plan-D-regression-memory.md:1402:| **Global install 산출물 cleanup** | `~/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs` + `lib/sidecar-write.mjs` + `bin/kzk-regression-memory.mjs` 제거 + 중복 settings.json `UserPromptSubmit` entry 정리 (`uninstall-global.sh --regression-recall` reverse path 호출 — 또는 jq: `jq '.hooks.UserPromptSubmit \|= map(select(.hooks[0].command \| test("regression-recall") \| not))' ~/.claude/settings.json > tmp && mv tmp ~/.claude/settings.json`) |
docs/plans/plan-D-regression-memory.md:1429:- **5 plan 모두 완료 후** (`feature/memory` → `main` 머지 직전): `kzk-pre-merge-sync` (CLAUDE.md sync, deepinit, **step 3 hook auto-enable, fail-closed**) → `git merge --no-ff`
skills/kzk-pre-merge-sync/SKILL.md:2:name: kzk-pre-merge-sync
skills/kzk-pre-merge-sync/SKILL.md:9:# kzk-pre-merge-sync
skills/kzk-pre-merge-sync/SKILL.md:52:**5 plan (A→D→B→C→E)** 모두 끝나고 `feature/memory` → `main` 머지 직전, regression-recall hook 의 default DISABLED 를 ENABLED 로 전환:
skills/kzk-pre-merge-sync/SKILL.md:55:bash install/install-global.sh --enable-hooks --regression-recall
skills/kzk-pre-merge-sync/SKILL.md:58:`--regression-recall` 는 explicit dependency 로 `--enable-hooks` (keyword-detector) 도 자동 enable.
skills/kzk-pre-merge-sync/SKILL.md:61:- 거부 → 후속 enable 은 사용자가 직접 위 command 실행. PR description 또는 milestone commit message 에 "regression-recall hook left disabled by user request" 명시 의무
skills/kzk-pre-merge-sync/SKILL.md:65:1. `install-global.sh --enable-hooks --regression-recall` exit code 검사 — non-zero → merge block (`exit 1`)
skills/kzk-pre-merge-sync/SKILL.md:66:2. settings.json 의 `UserPromptSubmit` 배열에 `regression-recall.mjs` entry 1개만 존재 검증 (jq 로 count). 0개 또는 2개+ → merge block
skills/kzk-pre-merge-sync/SKILL.md:73:Skip = block merge. 단, 사용자가 명시적으로 "regression-recall 비활성 유지" 선언한 경우만 skip 허용 (PR description 또는 milestone commit message 에 명시).
skills/kzk-pre-merge-sync/SKILL.md:76:- ENABLED: `regression-recall hook enabled via kzk-pre-merge-sync step 3`
skills/kzk-pre-merge-sync/SKILL.md:77:- 사용자 명시 거부: `regression-recall hook left disabled by user request`
skills/kzk-pre-merge-sync/SKILL.md:88:- [ ] regression-recall hook enabled via step 3 (or user-declined per spec rev6 §Default DISABLED, fail-closed verified)
skills/kzk-pre-merge-sync/SKILL.md:96:- **kzk-regression-memory**: 본 skill step 3 가 regression-recall hook 의 first-enable gate. spec rev6 §Default DISABLED 의 자동 enable 진입점. fail-closed (jq 부재 / install-global.sh non-zero / duplicate entry → merge block).
docs/plans/plan-B-fix-scope-expansion.md:13:- **fix-start hook** (`install/hooks/fix-scope-trigger.mjs`) — UserPromptSubmit, Plan D recall hook 다음 슬롯에 등록 (consumer 관계). 키워드/페이스트 매칭 → `code-review-graph` 우선 (`callers_of`, `imports_of`), fallback `grep -rn`. 결과 list 를 system-reminder inject.
docs/plans/plan-B-fix-scope-expansion.md:15:- **Default DISABLED at B commit, 자동 enable on main 머지** — Plan D 와 같은 enablement gate 통과. `--fix-scope-trigger` flag 가 `--regression-recall` 의 sibling (둘 다 `--enable-hooks` dependency).
docs/plans/plan-B-fix-scope-expansion.md:21:2. `install/hooks/fix-scope-trigger.mjs` 신규 — UserPromptSubmit hook. 자가-skip → fix intent detect (FIX_KEYWORDS reuse from Plan D 구현, **import** from `regression-recall.mjs` to avoid drift) → 심볼 추출 (prompt 의 backtick / camelCase / snake_case / func() 패턴) → CRG `query_graph` 또는 CLI `code-review-graph query/blast-radius` 우선 → grep fallback → result truncation (200 char cap, **D recall reminder size cap 룰과 sibling**) → `.kzk-harness/fix-scope-cache.json` atomic write (via `install/lib/sidecar-write.mjs` 의 `writeAtomic` 재사용) → system-reminder inject. CRG 미설치 시 stderr WARN + `_warn:"crg-not-installed-grep-fallback"`. **default DISABLED at commit** (settings.json 등록은 `--fix-scope-trigger` flag 호출 시만)
docs/plans/plan-B-fix-scope-expansion.md:22:3. `install/test/fix-scope-trigger.test.mjs` 신규 — mock prompt → expected callsite grep call 검증. 최소 12 case (자가-skip env / verbphrase / fix intent detect / 심볼 추출 / CRG path mock / grep fallback / truncation cap / cache 파일 atomic write / D recall consumer 순서 simulating / Gate 4.5 sanity check pass-fail / non-fix prompt → silent pass / cache 파일 schema validation)
docs/plans/plan-B-fix-scope-expansion.md:25:6. `install/install-global.sh` `enable_hooks()` 확장 — `--fix-scope-trigger` flag 추가, default off (`DO_FIX_SCOPE_TRIGGER=0`). hook 파일 copy + idempotent jq append (D 의 `--regression-recall` 패턴 그대로). `--fix-scope-trigger` 도 `--enable-hooks` 의 explicit dependency. **fail-closed**: jq 부재 / exit non-zero / duplicate entry → return 1
docs/plans/plan-B-fix-scope-expansion.md:27:8. `skills/kzk-pre-commit-gate/SKILL.md` 갱신 — `## Gate 4.5 — Fix Scope Sanity Check (Plan B)` 신규 section, 기존 Gate 4 다음, `## Doc-only commit exception` 직전 위치. 룰: cache 파일 (`.kzk-harness/fix-scope-cache.json`) 존재하면 callsite list vs `git diff --cached --name-only` 매칭. 미스매치 → BLOCK (commit body 에 의도 명시 의무). cache 부재 시 N/A (fix-scope-trigger hook 비활성 또는 fix intent 아닌 commit). frontmatter version `1.2.0` → `1.3.0`. description 에 `Gate 4.5` trigger 추가. Triggers list 에 `Gate 4.5`, `fix-scope-cache`, `callsite mismatch` 추가
docs/plans/plan-B-fix-scope-expansion.md:43:- `HOOK_FIXSCOPE = /Users/kimzerokim/work/personal/kzk-harness/install/hooks/fix-scope-trigger.mjs`
docs/plans/plan-B-fix-scope-expansion.md:44:- `HOOK_RECALL = /Users/kimzerokim/work/personal/kzk-harness/install/hooks/regression-recall.mjs` (import source)
docs/plans/plan-B-fix-scope-expansion.md:46:- `TEST_FIXSCOPE = /Users/kimzerokim/work/personal/kzk-harness/install/test/fix-scope-trigger.test.mjs`
docs/plans/plan-B-fix-scope-expansion.md:74:4. 실제 query 1회 실행 (sample 함수: 본 repo 의 `install/hooks/regression-recall.mjs::shouldSkip`):
docs/plans/plan-B-fix-scope-expansion.md:76:   code-review-graph query --file install/hooks/regression-recall.mjs 2>&1 | tee /tmp/crg-query.log
docs/plans/plan-B-fix-scope-expansion.md:77:   code-review-graph blast-radius --file install/hooks/regression-recall.mjs 2>&1 | tee /tmp/crg-blast.log
docs/plans/plan-B-fix-scope-expansion.md:130:**진입점**: `install/hooks/fix-scope-trigger.mjs` (UserPromptSubmit hook).
docs/plans/plan-B-fix-scope-expansion.md:131:**발동 슬롯**: `regression-recall.mjs` 다음 (D recall 결과가 system-reminder 로 inject 된 후 본 hook 이 callsite list 를 추가 inject — 둘이 같은 prompt 의 시스템-reminder 두 개 슬롯).
docs/plans/plan-B-fix-scope-expansion.md:134:1. 사용자 prompt 에 fix intent 키워드 매칭 (Plan D `regression-recall.mjs` 의 `FIX_KEYWORDS` 재사용 — drift 차단 위해 **import**)
docs/plans/plan-B-fix-scope-expansion.md:184:**Trigger**: test 통과 직후 (PostToolUse hook 가능 시 — install-global.sh 가 PostToolUse 미지원이면 manual). 본 plan B 는 PostToolUse 등록 *시도* 하되 미지원이면 fallback path: 사용자 prompt 가 "test 통과", "all green", "PR 직전" 매칭 시 UserPromptSubmit hook (fix-scope-trigger 의 sub-mode) 으로 발동.
docs/plans/plan-B-fix-scope-expansion.md:200:1. `.kzk-harness/fix-scope-cache.json` 존재 검사. 부재 → N/A (fix-scope-trigger 비활성 또는 fix intent 아닌 commit). PASS.
docs/plans/plan-B-fix-scope-expansion.md:223:**B commit 시점**: hook 파일 추가, settings.json 등록 X. `--fix-scope-trigger` flag 호출 안 한 상태.
docs/plans/plan-B-fix-scope-expansion.md:225:**자동 enable on main 머지**: 5 plan (A→D→B→C→E) 모두 끝나고 `kzk-pre-merge-sync` step 3 (또는 신규 step 3.5) 가 `install-global.sh --enable-hooks --regression-recall --fix-scope-trigger` 자동 호출 (사용자 confirm 게이트). `--fix-scope-trigger` 도 `--enable-hooks` 의 explicit dependency.
docs/plans/plan-B-fix-scope-expansion.md:236:| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=fix-scope-trigger` |
docs/plans/plan-B-fix-scope-expansion.md:243:- **kzk-regression-memory** (Plan D): D recall hook 다음 슬롯에서 발동 (consumer). 같은 prompt 에 두 system-reminder slot — D 가 과거 fix 기억, B 가 현재 fix 의 callsite 영향. fix-scope-cache 가 D recall reminder 와 함께 inject 되는 사용자 prompt context. **순서 의존**: settings.json `UserPromptSubmit` 배열에서 regression-recall.mjs 가 fix-scope-trigger.mjs 보다 앞 — install-global.sh 의 `enable_hooks()` 호출 순서가 sibling append 라 자동 보장 (D 가 먼저 enable, B 가 나중).
docs/plans/plan-B-fix-scope-expansion.md:248:- **kzk-pre-merge-sync**: step 3 의 `--enable-hooks --regression-recall` 호출에 `--fix-scope-trigger` 추가 (sibling enable). fail-closed 검증도 sibling.
docs/plans/plan-B-fix-scope-expansion.md:251:### Task 2 — `install/hooks/fix-scope-trigger.mjs` 신규 (~230 LoC)
docs/plans/plan-B-fix-scope-expansion.md:255:**Pattern**: `regression-recall.mjs` 와 동일한 stdin/stdout 모양 (UserPromptSubmit hookSpecificOutput). FIX_KEYWORDS 와 SELF_IMPROVE_VERBPHRASES 는 `regression-recall.mjs` 에서 import — drift 차단.
docs/plans/plan-B-fix-scope-expansion.md:261:// fix-scope-trigger.mjs — UserPromptSubmit hook for kzk-fix-scope-expansion (Plan B).
docs/plans/plan-B-fix-scope-expansion.md:263:// Default DISABLED at Plan B commit. Auto-enabled by kzk-pre-merge-sync step 3.
docs/plans/plan-B-fix-scope-expansion.md:264:// Slot order: regression-recall.mjs (Plan D) → fix-scope-trigger.mjs (Plan B) — D consumer.
docs/plans/plan-B-fix-scope-expansion.md:275:} from "./regression-recall.mjs";
docs/plans/plan-B-fix-scope-expansion.md:510:      process.stderr.write(`[fix-scope-trigger] ${crgWarn}\n`);
docs/plans/plan-B-fix-scope-expansion.md:539:### Task 3 — `install/test/fix-scope-trigger.test.mjs` 신규 (~250 LoC)
docs/plans/plan-B-fix-scope-expansion.md:547:// fix-scope-trigger.test.mjs — Plan B unit tests.
docs/plans/plan-B-fix-scope-expansion.md:560:} from "../hooks/fix-scope-trigger.mjs";
docs/plans/plan-B-fix-scope-expansion.md:561:import { shouldSkip, detectFixIntent } from "../hooks/regression-recall.mjs";
docs/plans/plan-B-fix-scope-expansion.md:731:    {"file": "install/hooks/regression-recall.mjs", "line": 32, "symbol": "shouldSkip", "source": "crg"},
docs/plans/plan-B-fix-scope-expansion.md:732:    {"file": "install/test/regression-recall.test.mjs", "line": 765, "symbol": "shouldSkip", "source": "crg"}
docs/plans/plan-B-fix-scope-expansion.md:735:    "install/hooks/regression-recall.mjs:32:function shouldSkip(prompt, env) {",
docs/plans/plan-B-fix-scope-expansion.md:736:    "install/hooks/fix-scope-trigger.mjs:185:    const skip = recallShouldSkip(prompt, process.env);",
docs/plans/plan-B-fix-scope-expansion.md:737:    "install/test/regression-recall.test.mjs:765:assert(\"shouldSkip env KZK_HARNESS_SELF_IMPROVEMENT=1\","
docs/plans/plan-B-fix-scope-expansion.md:754:# Plan B — fix-scope-trigger.test.mjs
docs/plans/plan-B-fix-scope-expansion.md:758:  if node "$REPO_ROOT/install/test/fix-scope-trigger.test.mjs"; then
docs/plans/plan-B-fix-scope-expansion.md:759:    printf '  PASS: fix-scope-trigger.test.mjs\n'
docs/plans/plan-B-fix-scope-expansion.md:762:    printf '  FAIL: fix-scope-trigger.test.mjs\n'
docs/plans/plan-B-fix-scope-expansion.md:779:### Task 6 — `install/install-global.sh` `enable_hooks()` 확장 (~50 LoC) — D 의 `--regression-recall` 패턴 그대로
docs/plans/plan-B-fix-scope-expansion.md:783:**변경 1 — `parse_flags()` 의 `DO_REGRESSION_RECALL=0` 옆에 `DO_FIX_SCOPE_TRIGGER=0` 추가** (line 59 근처). usage block 에 한 줄 추가 (line 82 근처): `--fix-scope-trigger              Also wire fix-scope-trigger.mjs (implies --enable-hooks)`. arg parse case 에 분기 추가 (line 122 `--regression-recall)` 다음):
docs/plans/plan-B-fix-scope-expansion.md:786:      --fix-scope-trigger)
docs/plans/plan-B-fix-scope-expansion.md:791:**변경 2 — `enable_hooks()` 본문 확장** (line 627 부근. D 의 `--regression-recall` 블록 다음에 sibling 블록 추가):
docs/plans/plan-B-fix-scope-expansion.md:794:  # Plan B: fix-scope-trigger hook + cache via sidecar-write.mjs (이미 D 가 copy)
docs/plans/plan-B-fix-scope-expansion.md:796:    cp "$src/install/hooks/fix-scope-trigger.mjs" \
docs/plans/plan-B-fix-scope-expansion.md:798:    # sidecar-write.mjs 는 D 가 이미 copy — `--fix-scope-trigger` 단독 enable 시도면 D 의존
docs/plans/plan-B-fix-scope-expansion.md:806:**변경 3 — settings.json idempotent jq append 블록 추가** (D 의 `regression-recall` 블록 다음):
docs/plans/plan-B-fix-scope-expansion.md:809:  # Plan B: fix-scope-trigger idempotent append (slot order: D first, B second — sibling order matters)
docs/plans/plan-B-fix-scope-expansion.md:811:    local fst_cmd="node $HOME/.claude/skills/.kzk-harness-shared/hooks/fix-scope-trigger.mjs"
docs/plans/plan-B-fix-scope-expansion.md:815:      emit "  hooks: fix-scope-trigger.mjs already registered — skip"
docs/plans/plan-B-fix-scope-expansion.md:816:      record "hooks: fix-scope-trigger skip (already registered)"
docs/plans/plan-B-fix-scope-expansion.md:822:      emit "  hooks: fix-scope-trigger.mjs registered (--fix-scope-trigger)"
docs/plans/plan-B-fix-scope-expansion.md:823:      record "hooks: fix-scope-trigger hook registered (--fix-scope-trigger, depends on --enable-hooks)"
docs/plans/plan-B-fix-scope-expansion.md:828:**변경 4 — `--fix-scope-trigger` 가 `--enable-hooks` 자동 enable** (line 762 부근의 D 패턴 옆):
docs/plans/plan-B-fix-scope-expansion.md:831:  # Plan B: --fix-scope-trigger 는 --enable-hooks 의 explicit dependency
docs/plans/plan-B-fix-scope-expansion.md:833:    emit "  --fix-scope-trigger implies --enable-hooks (explicit dependency)"
docs/plans/plan-B-fix-scope-expansion.md:895:`.kzk-harness/fix-scope-cache.json` (kzk-fix-scope-expansion fix-start hook 이 작성) 가 존재하면 callsite list 와 `git diff --cached --name-only` 매칭 검사. cache 부재 → N/A (fix-scope-trigger 비활성 또는 fix intent 아닌 commit).
docs/plans/plan-B-fix-scope-expansion.md:951:- **kzk-fix-scope-expansion** (Plan B): hook path 는 fix-scope-trigger.mjs 가 자동 (UserPromptSubmit 시점), survey 는 EXPLORER subagent path (수동, fix-start 시 보강용). CRG 우선 + grep fallback 패턴은 Step 1 과 동일 룰 — drift 차단 위해 본 skill 의 룰이 source of truth.
docs/plans/plan-B-fix-scope-expansion.md:963:- **kzk-fix-scope-expansion** (Plan B): D recall 결과를 consumer 로 read — fix-start hook 이 D 다음 슬롯에 발동 (settings.json `UserPromptSubmit` 배열에서 regression-recall.mjs → fix-scope-trigger.mjs 순). 같은 prompt 의 두 system-reminder 슬롯 — D 가 과거 fix 기억, B 가 현재 fix 의 callsite 영향 list. fix-scope-cache (`.kzk-harness/fix-scope-cache.json`) 가 D recall reminder 와 함께 inject 되는 사용자 prompt context. Pre-commit Gate 4.5 의 cache 입력자.
docs/plans/plan-B-fix-scope-expansion.md:997:### Fix-start hook (consumer 관계 with §29 Plan D regression-recall)
docs/plans/plan-B-fix-scope-expansion.md:999:- 진입점: `install/hooks/fix-scope-trigger.mjs` (UserPromptSubmit hook)
docs/plans/plan-B-fix-scope-expansion.md:1000:- 발동 슬롯: `regression-recall.mjs` 다음 (D recall 결과 system-reminder inject 후 본 hook 이 callsite list 추가 inject — 같은 prompt 의 두 reminder 슬롯)
docs/plans/plan-B-fix-scope-expansion.md:1034:- 5 plan (A→D→B→C→E) 끝나고 `kzk-pre-merge-sync` step 3 가 `install-global.sh --enable-hooks --regression-recall --fix-scope-trigger` 자동 호출 (사용자 confirm 게이트). `--fix-scope-trigger` 도 `--enable-hooks` 의 explicit dependency
docs/plans/plan-B-fix-scope-expansion.md:1042:| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=fix-scope-trigger` |
docs/plans/plan-B-fix-scope-expansion.md:1091:  - FIX_KEYWORDS / SELF_IMPROVE_VERBPHRASES import from regression-recall.mjs (drift 차단)
docs/plans/plan-B-fix-scope-expansion.md:1105:install/test/fix-scope-trigger.test.mjs (12 cases) + fixture.
docs/plans/plan-B-fix-scope-expansion.md:1106:install/install-global.sh: --fix-scope-trigger flag (D --regression-recall sibling).
docs/plans/plan-B-fix-scope-expansion.md:1112:Default DISABLED — auto-enabled by kzk-pre-merge-sync step 3 after 5 plan.
docs/plans/plan-B-fix-scope-expansion.md:1139:| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=fix-scope-trigger` |

exec
/bin/zsh -lc 'rg -n "commit body|body 에|git commit|message" skills/kzk-pre-commit-gate/SKILL.md harness-share.md README.md' in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
harness-share.md:129:trivial 변경 (1줄 옵션 flag) 인 경우 skip 가능 — commit body 에 "ai-slop-cleaner skipped (trivial)" 명시.
harness-share.md:139:`AKIA`/`ASIA` prefix (AWS key 패턴) 도 추가 확인. match 발견 시 → unstage + secret 제거 + re-stage. test fixture 내 명백한 fake string 은 false positive — commit body 에 `secrets-scan: false positive — <reason>` 명시.
harness-share.md:165:3. `browser_console_messages level=error` 결과 0 error 확인
harness-share.md:167:5. commit message 본문에 `Playwright: <screenshot_paths> + snapshot captured (console 0 err) + visual verified` 라인
harness-share.md:181:| `browser_console_messages` | error/warning 개수 + 핵심 메시지 1줄 + 신규 vs pre-existing 판정 |
harness-share.md:256:- Commit message convention
harness-share.md:415:- 절대 `Co-Authored-By` 줄 commit message 에 **금지**
harness-share.md:417:- HEREDOC 으로 multi-line message 작성 (heredoc EOF 'EOF' quoted to disable variable expansion)
harness-share.md:420:git commit -m "$(cat <<'EOF'
harness-share.md:447:4. commit message 또는 PR description 에 "context7 referenced `/org/project` for <concept>" 라인 포함
harness-share.md:548:- 체크포인트: PR description 또는 milestone commit body 에 "deepinit ran" 라인 포함
harness-share.md:957:- **Edit/Write "File has not been read yet" / "modified since read"**: Prevention-first. Treat these events as read-tracker invalidators and re-Read before the next Edit on the affected file: any new user message, `<system-reminder>` flagging a file change, your own `sed -i` / `Write` / formatter run, an Agent dispatch return, `/compact` or session restore. Recovery if it still fails: call `Read` once → re-issue the Edit (adjust `old_string` if "modified since read" — the on-disk content moved). Do NOT ask the user.
README.md:71:5. **Commit.** Saying "commit" loads `kzk-pre-commit-gate`. The skill runs up to 6 gates per commit batch — Gate 0 (AGENTS.md sync, conditional), Gate 1 (ai-slop-cleaner), Gate 1.5 (secrets scan), Gate 2 (build), Gate 3 (tests), Gate 4 (Playwright UI smoke if UI changed via `kzk-playwright-verification`). Each commit message ends with the gate-PASS line consumed by `kzk-pre-merge-sync`.
skills/kzk-pre-commit-gate/SKILL.md:32:**Optional skill-level extension (NOT a Gate 0 gate requirement). Gate 0 alone passes on the AGENTS.md edit.** After that pass, load the deepinit_manifest tool schema — `ToolSearch(query="select:mcp__plugin_oh-my-claudecode_t__deepinit_manifest")` — then call with `action=save`. After `ToolSearch` resolves the tool, **read the loaded schema before calling** — do not hardcode `action="save"` as the full call shape if other params appear as required. If the schema requires more than `action`, log the extra params + values used in the commit body. Current OMC shape: `mcp__plugin_oh-my-claudecode_t__deepinit_manifest(action="save")`. Run once at the END of the commit batch (autonomous run) or at PR-creation time (interactive). If ToolSearch returns no result, search by keyword `ToolSearch(query="+deepinit_manifest")` and call the resolved name. If neither search finds the tool (OMC plugin not installed or not surfaced), skip — log `deepinit_manifest tool unavailable, manifest baseline skipped this commit` in the commit body and continue. Manifest baseline file is gitignored (`.omc/deepinit-manifest.json`); it lets the next session's `action=diff` produce a real signal.
skills/kzk-pre-commit-gate/SKILL.md:38:Trivial 1-line flag changes may skip → commit body must say `ai-slop-cleaner skipped (trivial)`.
skills/kzk-pre-commit-gate/SKILL.md:50:Trivial false positives (e.g. test fixture strings that are obviously fake) → commit body must say `secrets-scan: false positive — <reason>`.
skills/kzk-pre-commit-gate/SKILL.md:109:## Commit message
skills/kzk-pre-commit-gate/SKILL.md:122:- Never `git commit --amend` after a hook failure (the commit didn't happen — amending hits the previous commit)

exec
/bin/zsh -lc "sed -n '100,130p' skills/kzk-pre-commit-gate/SKILL.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:

User explicitly entered autonomous mode ("ralph로 돌려", "자는 동안 진행", "끝까지 끝내줘"):

- All applicable gates pass (6 if AGENTS.md hierarchy present; 5 otherwise) → commit without user confirmation
- Push respects the session **branch contract** locked at autonomous-mode entry (`kzk-autonomous-boundary`). Direct-`main` push is allowed only if the user explicitly authorized direct-main flow this session — never as a silent default.
- PR creation is allowed if the contract specifies PR-flow; final merge always waits for explicit user "merge it" regardless of contract

Non-autonomous (default): every commit waits for user OK after gates pass. No auto-commit.

## Commit message

- English, conventional commits (`feat(scope): ...`, `refactor(scope): ...`)
- HEREDOC for multi-line bodies, EOF quoted (`<<'EOF'`) to disable variable expansion
- **NEVER** include `Co-Authored-By:` lines
- pre-commit hook bypass (`--no-verify`) forbidden unless user explicitly orders it
- Gate-4 commits must include `Playwright: <screenshot_paths> + snapshot captured (console 0 err) + visual verified`

## Failure protocol

- 1st failure: fix root cause, re-stage, new commit
- **Autonomous mode:** 3 consecutive build/test failures on the same area → halt, append user-queue entry (see `kzk-autonomous-boundary`). **Interactive mode:** surface failures to user, do not auto-halt.
- Critic / verifier / Gate 4 visual reviewer 2 consecutive FAIL on the same change (Gate 4 Playwright visual review, plan reviewer, verifier agent) → halt + user-queue entry. See `kzk-autonomous-boundary` for the full halt condition list. Exception: `kzk-web-loop` overrides consecutive-FAIL halts with skip+next-issue (see `kzk-web-loop` §Failure Handling).
- Never `git commit --amend` after a hook failure (the commit didn't happen — amending hits the previous commit)

## Interaction with other kzk-*

- **kzk-autonomous-boundary**: Owns the halt protocol invoked when ≥2 consecutive reviewer/critic FAILs (or ≥3 consecutive build/test FAILs) occur during gate runs.
- **kzk-playwright-verification**: Implements Gate 4 (browser smoke + screenshot drop).
- **kzk-test-coverage**: Gate 3 runs the same test command this skill owns at session close.
- **kzk-large-task-delegation**: Subagent prompts must echo the gate sequence so delegated executors commit with full gate awareness.
- **kzk-web-loop**: Owns the override exception that lets the loop bypass full Gate 0–4 in indefinite-loop mode (see kzk-web-loop §Failure Handling).

codex
1. **Axis B acceptance cover?**  
진단: 불완전. spec 의 `fix-start + fix-verify + Gate 4.5 + default disabled/auto-enable` 중 `fix-verify`는 구현 task가 없고, auto-enable도 문서 서술만 있고 실제 `kzk-pre-merge-sync` 수정 task가 없다. task count도 사용자 기준 `1-14`가 아니라 문서상 `0-14` + acceptance `15`라 관리가 흐린다.  
권고: `fix-verify` 구현 task와 `kzk-pre-merge-sync` 수정 task를 명시적으로 추가하고, numbering을 하나로 정리.

2. **D 와 consumer 관계 명확?**  
진단: 반쯤만 명확. 슬롯 순서와 import 의도는 맞다. 문제는 `fix-scope-trigger.mjs`가 `regression-recall.mjs`를 runtime import 하는데, `--fix-scope-trigger` 단독 enable 시 그 파일 존재 보장이 없다. 지금 설계는 “consumer”가 아니라 숨은 hard dependency다.  
권고: 공용 로직을 `install/lib/*`로 분리해서 둘 다 import하게 하거나, `--fix-scope-trigger`가 `regression-recall.mjs` copy 존재를 fail-closed로 강제.

3. **CRG status oracle**  
진단: Step 0은 맞는데 Task 2 구현이 oracle을 깨뜨린다. Step 0은 `status`로 실제 CLI 시그니처를 확정하라고 해놓고, Task 2 코드는 검증되지 않은 `--symbol` 경로를 쓴다. build 후 재검증 실패 시도 silent fallback 된다.  
권고: Step 0에서 확정한 CRG 호출 형태 하나만 SoT로 고정하고, build 후 `Files/Nodes` 재검증 실패 시 `_warn` + grep fallback 명시.

4. **Cache atomicity**  
진단: 실패. `writeAtomic` 재사용은 “원자적 파일 교체”일 뿐, race 차단이 아니다. D 가 race 차단하는 건 `mutateSidecar()`의 lockdir이지 `writeAtomic()`이 아니다.  
권고: cache도 lockdir 경유로 쓰게 하라. 최소한 `writeSingleEntryWithLock()` 같은 wrapper를 추가.

5. **Gate 4.5 sanity**  
진단: 설계 구멍이 크다. pre-commit gate에서 `commit body` escape를 읽겠다는 건 타이밍이 애매하다. 그리고 cache가 `last fix wins`라 multi-fix commit이면 Gate 4.5가 마지막 fix만 본다.  
권고: escape 입력을 commit body가 아니라 gate 실행 전 명시값으로 받거나, 검사를 pre-merge/commit-message 작성 단계로 옮겨라. multi-fix policy도 append/list로 재설계.

6. **Default DISABLED + 자동 enable**  
진단: 미완성. 문서 본문은 `--fix-scope-trigger` auto-enable을 말하지만, 실제 task 목록에 `skills/kzk-pre-merge-sync/SKILL.md` 수정이 없다. D는 했고 B는 안 했다.  
권고: 별도 task 추가해서 step 3 명령과 checklist를 `--enable-hooks --regression-recall --fix-scope-trigger`로 바꿔라.

7. **Fix-verify hook**  
진단: 거의 허상. acceptance와 설명에는 있는데, 구현 task/파일/install/test가 없다. Task 2 코드에도 없다.  
권고: 빼든가 만들든가 둘 중 하나로 정리. 유지할 거면 explicit trigger, payload, test를 추가.

8. **Test 전략**  
진단: 약하다. “mock prompt → expected grep 동작”을 검증한다더니 실제로는 `execSync` 호출 자체를 검증하지 않는다. stdin/stdout hook 플로우도 안 돈다. T12는 무의미하다.  
권고: command-runner 주입으로 CRG/grep 선택을 assert하고, hook JSON input/output까지 통합 테스트하라.

9. **Cross-skill 영향**  
진단: silent breakage 위험 높다. Task 1은 `harness-share`를 authoritative source라 하고, Task 9는 `kzk-codebase-survey`를 source of truth라 한다. 둘 중 하나는 거짓말이다. README도 아직 “up to 6 gates”다.  
권고: SoT를 하나로 통일하고, gate count 설명도 전부 4.5 반영.

10. **Rollback 5-7 level**  
진단: 얕다. D는 global install 산출물 cleanup까지 있는데 B는 없다. settings.json entry 제거, shared hook 파일 제거, auto-enable reversal이 빠졌다.  
권고: 최소 6번째로 global cleanup/uninstall 경로를 넣어라.

11. **Skill count 동기화 (15→16)**  
진단: 4 sync point는 잡았다. 추가로 `run-tests.sh`까지 건드리게 한 점은 맞다.  
권고: `none` 단, 숫자 말고 “6 gates” 같은 주변 문구까지 동기화 범위에 포함시켜라.

12. **놓친 함정**  
진단: 세 개. `fix-scope-cache.json`은 이름은 JSON인데 실제는 JSONL 단일행이다. grep fallback이 `.md`까지 포함해 docs 언급을 callsite로 오염시킨다. CRG Task 0은 `--file`, Task 2는 `--symbol`이라 내부 모순이다.  
권고: 포맷명/확장자 정리, grep 대상에서 docs 제외, CRG 계약 단일화.

Bottom-line: REVISE
tokens used
96,397
1. **Axis B acceptance cover?**  
진단: 불완전. spec 의 `fix-start + fix-verify + Gate 4.5 + default disabled/auto-enable` 중 `fix-verify`는 구현 task가 없고, auto-enable도 문서 서술만 있고 실제 `kzk-pre-merge-sync` 수정 task가 없다. task count도 사용자 기준 `1-14`가 아니라 문서상 `0-14` + acceptance `15`라 관리가 흐린다.  
권고: `fix-verify` 구현 task와 `kzk-pre-merge-sync` 수정 task를 명시적으로 추가하고, numbering을 하나로 정리.

2. **D 와 consumer 관계 명확?**  
진단: 반쯤만 명확. 슬롯 순서와 import 의도는 맞다. 문제는 `fix-scope-trigger.mjs`가 `regression-recall.mjs`를 runtime import 하는데, `--fix-scope-trigger` 단독 enable 시 그 파일 존재 보장이 없다. 지금 설계는 “consumer”가 아니라 숨은 hard dependency다.  
권고: 공용 로직을 `install/lib/*`로 분리해서 둘 다 import하게 하거나, `--fix-scope-trigger`가 `regression-recall.mjs` copy 존재를 fail-closed로 강제.

3. **CRG status oracle**  
진단: Step 0은 맞는데 Task 2 구현이 oracle을 깨뜨린다. Step 0은 `status`로 실제 CLI 시그니처를 확정하라고 해놓고, Task 2 코드는 검증되지 않은 `--symbol` 경로를 쓴다. build 후 재검증 실패 시도 silent fallback 된다.  
권고: Step 0에서 확정한 CRG 호출 형태 하나만 SoT로 고정하고, build 후 `Files/Nodes` 재검증 실패 시 `_warn` + grep fallback 명시.

4. **Cache atomicity**  
진단: 실패. `writeAtomic` 재사용은 “원자적 파일 교체”일 뿐, race 차단이 아니다. D 가 race 차단하는 건 `mutateSidecar()`의 lockdir이지 `writeAtomic()`이 아니다.  
권고: cache도 lockdir 경유로 쓰게 하라. 최소한 `writeSingleEntryWithLock()` 같은 wrapper를 추가.

5. **Gate 4.5 sanity**  
진단: 설계 구멍이 크다. pre-commit gate에서 `commit body` escape를 읽겠다는 건 타이밍이 애매하다. 그리고 cache가 `last fix wins`라 multi-fix commit이면 Gate 4.5가 마지막 fix만 본다.  
권고: escape 입력을 commit body가 아니라 gate 실행 전 명시값으로 받거나, 검사를 pre-merge/commit-message 작성 단계로 옮겨라. multi-fix policy도 append/list로 재설계.

6. **Default DISABLED + 자동 enable**  
진단: 미완성. 문서 본문은 `--fix-scope-trigger` auto-enable을 말하지만, 실제 task 목록에 `skills/kzk-pre-merge-sync/SKILL.md` 수정이 없다. D는 했고 B는 안 했다.  
권고: 별도 task 추가해서 step 3 명령과 checklist를 `--enable-hooks --regression-recall --fix-scope-trigger`로 바꿔라.

7. **Fix-verify hook**  
진단: 거의 허상. acceptance와 설명에는 있는데, 구현 task/파일/install/test가 없다. Task 2 코드에도 없다.  
권고: 빼든가 만들든가 둘 중 하나로 정리. 유지할 거면 explicit trigger, payload, test를 추가.

8. **Test 전략**  
진단: 약하다. “mock prompt → expected grep 동작”을 검증한다더니 실제로는 `execSync` 호출 자체를 검증하지 않는다. stdin/stdout hook 플로우도 안 돈다. T12는 무의미하다.  
권고: command-runner 주입으로 CRG/grep 선택을 assert하고, hook JSON input/output까지 통합 테스트하라.

9. **Cross-skill 영향**  
진단: silent breakage 위험 높다. Task 1은 `harness-share`를 authoritative source라 하고, Task 9는 `kzk-codebase-survey`를 source of truth라 한다. 둘 중 하나는 거짓말이다. README도 아직 “up to 6 gates”다.  
권고: SoT를 하나로 통일하고, gate count 설명도 전부 4.5 반영.

10. **Rollback 5-7 level**  
진단: 얕다. D는 global install 산출물 cleanup까지 있는데 B는 없다. settings.json entry 제거, shared hook 파일 제거, auto-enable reversal이 빠졌다.  
권고: 최소 6번째로 global cleanup/uninstall 경로를 넣어라.

11. **Skill count 동기화 (15→16)**  
진단: 4 sync point는 잡았다. 추가로 `run-tests.sh`까지 건드리게 한 점은 맞다.  
권고: `none` 단, 숫자 말고 “6 gates” 같은 주변 문구까지 동기화 범위에 포함시켜라.

12. **놓친 함정**  
진단: 세 개. `fix-scope-cache.json`은 이름은 JSON인데 실제는 JSONL 단일행이다. grep fallback이 `.md`까지 포함해 docs 언급을 callsite로 오염시킨다. CRG Task 0은 `--file`, Task 2는 `--symbol`이라 내부 모순이다.  
권고: 포맷명/확장자 정리, grep 대상에서 docs 제외, CRG 계약 단일화.

Bottom-line: REVISE
