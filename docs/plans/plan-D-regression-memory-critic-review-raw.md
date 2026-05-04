OpenAI Codex v0.120.0 (research preview)
--------
workdir: /Users/kimzerokim/work/personal/kzk-harness
model: gpt-5.4
provider: openai
approval: never
sandbox: read-only
reasoning effort: high
reasoning summaries: none
session id: 019df22c-370c-7a43-96e8-f886f3fcfb91
--------
user
Plan D draft 검토. brutally honest, 한국어, no compliments.

## Read 의무

`/Users/kimzerokim/work/personal/kzk-harness/docs/plans/regression-memory-and-fix-quality-spec.md` (spec rev6, frozen)
`/Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-D-regression-memory.md` (Plan D draft, 1010 LoC, 15 tasks)
`/Users/kimzerokim/work/personal/kzk-harness/docs/plans/plan-A-tdd-self-verification-block.md` (Plan A rev2 reference — format 통일성)

## Context

Plan D 가 4 plan 중 가장 큼. 신규 8 파일 + 수정 7 파일. spec rev6 Axis D 전체 책임. Step 0 = gstack `/learn` 시그니처 캡처 (backend drift 차단 critical).

## LOCKED PRIOR DECISIONS (재질문 금지)

- Backend = `/learn` (5필드) + sidecar (6필드, metadata extension with own SoT)
- Recall: `confidence_decayed = confidence * 0.85^dismiss_count`, archived 또는 < 4 → 제외
- Default DISABLED at D commit, 자동 enable on main 머지 via kzk-pre-merge-sync
- Hook deployment: append + keyword-detector 자동 enable dependency
- gstack 미설치 → stderr WARN + entry 의무 (silent skip 금지)
- Orphan cleanup: 자동 GC, 수동 path 없음
- 자율 mode 판별: KZK_AUTONOMOUS=1 우선, env unset 시 동사구만, 명사 단독 금지
- 자가-skip guard: self-improvement marker grep
- Plan A 의 Layer (a)/(b) 룰

## YOUR JOB — 12 카테고리

1. **spec rev6 acceptance cover?** — Plan D 가 spec Axis D 의 모든 acceptance 를 task 1-14 에 매핑하는가? 누락?
2. **Step 0 (gstack 시그니처 캡처)** — fixture drift 차단 효과적? gstack 미설치 시 fallback (sidecar-only mode) 룰 적정?
3. **Default DISABLED + 자동 enable** — kzk-pre-merge-sync step 3 자동 호출 룰 정확? 사용자 confirm path 명확?
4. **Recall hook detail** — UserPromptSubmit + 키워드 매칭 + sidecar 적용 + system-reminder inject — sonnet executor 가 ambiguous 없이 구현 가능?
5. **자가-skip guard** — self-improvement marker grep 룰 정확? false positive 위험?
6. **Orphan cleanup race** — recall hook 자동 GC + stale-check 동시 실행 시 JSONL race 방지 (file lock or atomic rename)?
7. **gstack 미설치 stderr WARN** — silent skip 금지 enforcement?
8. **Test fixture drift 룰** — Plan D 변경 시 재캡처 의무 정확?
9. **Cross-skill 영향** — kzk-pre-merge-sync / kzk-web-loop / kzk-large-task-delegation 변경이 silent breakage 일으킬 가능성?
10. **Rollback 6-level 충실?**
11. **Skill count 동기화 (14→15)** — 4 sync 지점 명시?
12. **놓친 함정** — Plan D 단계에서 spec 단계에 흡수되지 않은 회색지대.

각 항목: 짧은 진단 + 구체 권고. fine 이면 "none". 마지막 줄 반드시 "Bottom-line: SHIP" 또는 "REVISE".

700단어 이내.

codex
요청한 세 문서를 먼저 읽고, spec Axis D acceptance와 Plan D task 매핑부터 확인하겠습니다. 그다음 Step 0, recall hook, race/rollback, cross-skill breakage까지 항목별로 바로 깎아서 보겠습니다.
exec
/bin/zsh -lc 'wc -l docs/plans/regression-memory-and-fix-quality-spec.md docs/plans/plan-D-regression-memory.md docs/plans/plan-A-tdd-self-verification-block.md' in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
     288 docs/plans/regression-memory-and-fix-quality-spec.md
    1010 docs/plans/plan-D-regression-memory.md
     309 docs/plans/plan-A-tdd-self-verification-block.md
    1607 total

exec
/bin/zsh -lc 'rg -n "''^(#|##|###|####) " docs/plans/regression-memory-and-fix-quality-spec.md docs/plans/plan-D-regression-memory.md docs/plans/plan-A-tdd-self-verification-block.md' in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
docs/plans/regression-memory-and-fix-quality-spec.md:1:# Spec — Regression Memory + Fix Quality + Production-Code-First 통합 (rev6)
docs/plans/regression-memory-and-fix-quality-spec.md:11:## Problem
docs/plans/regression-memory-and-fix-quality-spec.md:21:## Locked decisions (rev3)
docs/plans/regression-memory-and-fix-quality-spec.md:42:## Non-goals
docs/plans/regression-memory-and-fix-quality-spec.md:52:## 4 Axis (요약)
docs/plans/regression-memory-and-fix-quality-spec.md:54:### Axis A — TDD 자기검증 차단
docs/plans/regression-memory-and-fix-quality-spec.md:80:### Axis D — Regression memory
docs/plans/regression-memory-and-fix-quality-spec.md:148:### Axis B — Fix scope 누수 차단
docs/plans/regression-memory-and-fix-quality-spec.md:157:### Axis C — Fresh-agent verification
docs/plans/regression-memory-and-fix-quality-spec.md:166:### Axis E — Production code-first + 멱등성
docs/plans/regression-memory-and-fix-quality-spec.md:184:## Plan 분할
docs/plans/regression-memory-and-fix-quality-spec.md:198:## Skill count 동기화 (14→16)
docs/plans/regression-memory-and-fix-quality-spec.md:208:## Test 전략 (cycle 2 #5 한계 명시)
docs/plans/regression-memory-and-fix-quality-spec.md:223:## Rollback
docs/plans/regression-memory-and-fix-quality-spec.md:234:## 메타 룰
docs/plans/regression-memory-and-fix-quality-spec.md:242:## Critic 매트릭스 (rev5 반영)
docs/plans/plan-A-tdd-self-verification-block.md:1:# Plan A — TDD 자기검증 차단 (Layer a + b) — rev2
docs/plans/plan-A-tdd-self-verification-block.md:8:## Goal
docs/plans/plan-A-tdd-self-verification-block.md:15:## Acceptance Criteria
docs/plans/plan-A-tdd-self-verification-block.md:26:## Variables
docs/plans/plan-A-tdd-self-verification-block.md:34:## Tasks
docs/plans/plan-A-tdd-self-verification-block.md:36:### Task 1 — `kzk-test-coverage/SKILL.md` v1.3 (frontmatter + Anti-pattern + Layer b)
docs/plans/plan-A-tdd-self-verification-block.md:52:## Anti-pattern — Test-from-implementation
docs/plans/plan-A-tdd-self-verification-block.md:69:### 자율 mode 메인 직접 TDD 금지 (Layer b)
docs/plans/plan-A-tdd-self-verification-block.md:98:### Task 2 — `kzk-large-task-delegation/SKILL.md` boilerplate
docs/plans/plan-A-tdd-self-verification-block.md:113:### Anti-self-verification boilerplate (Plan A)
docs/plans/plan-A-tdd-self-verification-block.md:129:### Task 3 — `harness-share.md` §11.1 신규
docs/plans/plan-A-tdd-self-verification-block.md:136:### 11.1 Anti-Self-Verification (TDD)
docs/plans/plan-A-tdd-self-verification-block.md:145:### Task 4 — `install/test/skill-text-checks.sh` 신규
docs/plans/plan-A-tdd-self-verification-block.md:151:# install/test/skill-text-checks.sh — Plan A test (룰 *기록* 검증)
docs/plans/plan-A-tdd-self-verification-block.md:153:# kzk-test-coverage SKILL.md 의 Anti-pattern 섹션 + Layer b 룰 grep
docs/plans/plan-A-tdd-self-verification-block.md:154:# kzk-large-task-delegation SKILL.md 의 anti-self-verification boilerplate 룰 grep
docs/plans/plan-A-tdd-self-verification-block.md:155:# harness-share.md §11.1 cross-ref grep
docs/plans/plan-A-tdd-self-verification-block.md:157:# 한계: behavioral test 아님. 룰이 *기록* 됐는지만 확인.
docs/plans/plan-A-tdd-self-verification-block.md:158:# 실제 sonnet 이 룰 위반 차단하는지는 manual cycle 검증 의존.
docs/plans/plan-A-tdd-self-verification-block.md:197:# kzk-test-coverage v1.3 — positive grep
docs/plans/plan-A-tdd-self-verification-block.md:209:# kzk-test-coverage — negative grep (=0 override 금지)
docs/plans/plan-A-tdd-self-verification-block.md:212:# kzk-large-task-delegation boilerplate — positive
docs/plans/plan-A-tdd-self-verification-block.md:217:# harness-share §11.1 — positive
docs/plans/plan-A-tdd-self-verification-block.md:223:# harness-share — negative grep
docs/plans/plan-A-tdd-self-verification-block.md:239:### Task 5 — `install/test/run-tests.sh` 갱신
docs/plans/plan-A-tdd-self-verification-block.md:246:# Plan A — skill-text-checks
docs/plans/plan-A-tdd-self-verification-block.md:259:### Task 6 — atomic commit
docs/plans/plan-A-tdd-self-verification-block.md:284:## Test 전략 (한계 명시)
docs/plans/plan-A-tdd-self-verification-block.md:290:## Rollback
docs/plans/plan-A-tdd-self-verification-block.md:298:## Out of scope (다음 Plan 으로 위임)
docs/plans/plan-A-tdd-self-verification-block.md:305:## Codex review 의무
docs/plans/plan-D-regression-memory.md:1:# Plan D — Regression Memory + Auto-Recall Hook
docs/plans/plan-D-regression-memory.md:7:## Goal
docs/plans/plan-D-regression-memory.md:17:## Acceptance Criteria
docs/plans/plan-D-regression-memory.md:35:## Variables
docs/plans/plan-D-regression-memory.md:53:## Tasks
docs/plans/plan-D-regression-memory.md:55:### Task 0 — gstack backend probe (CRITICAL — backend drift 차단)
docs/plans/plan-D-regression-memory.md:84:### Task 1 — `kzk-regression-memory/SKILL.md` 신규 (~250 lines)
docs/plans/plan-D-regression-memory.md:103:# kzk-regression-memory
docs/plans/plan-D-regression-memory.md:105:## Triggers
docs/plans/plan-D-regression-memory.md:111:## Why
docs/plans/plan-D-regression-memory.md:115:## Storage 모델
docs/plans/plan-D-regression-memory.md:142:## Recall 룰
docs/plans/plan-D-regression-memory.md:165:## 자가-skip guard
docs/plans/plan-D-regression-memory.md:175:## Cycle 회고 통합 (5W1H)
docs/plans/plan-D-regression-memory.md:186:## Stale check
docs/plans/plan-D-regression-memory.md:195:## Default DISABLED 정책
docs/plans/plan-D-regression-memory.md:203:## Rollback
docs/plans/plan-D-regression-memory.md:214:## Interaction with other kzk-*
docs/plans/plan-D-regression-memory.md:223:### Task 2 — `install/hooks/regression-recall.mjs` 신규 (~180 LoC)
docs/plans/plan-D-regression-memory.md:387:### Task 3 — `install/scripts/regression-stale-check.sh` 신규 (~80 LoC)
docs/plans/plan-D-regression-memory.md:395:# regression-stale-check.sh — Plan D 단발 stale check.
docs/plans/plan-D-regression-memory.md:397:# sidecar (.kzk-harness/regression-meta.jsonl) 의 file_snapshot SHA 와 HEAD 비교.
docs/plans/plan-D-regression-memory.md:398:# 변경 감지 시 sidecar 의 cached stale flag update + stderr 로그.
docs/plans/plan-D-regression-memory.md:399:# archived 자동 X — 사용자 결정.
docs/plans/plan-D-regression-memory.md:401:# 실행 시점: cron (사용자 선택) 또는 cycle 끝 단발 (kzk-web-loop 등에서 hook).
docs/plans/plan-D-regression-memory.md:463:### Task 4 — `install/test/regression-recall.test.mjs` 신규 (~150 LoC)
docs/plans/plan-D-regression-memory.md:574:### Task 5 — fixture 파일 신규
docs/plans/plan-D-regression-memory.md:596:### Task 6 — `install/install-global.sh` `enable_hooks()` 확장 (~50 LoC 변경)
docs/plans/plan-D-regression-memory.md:650:# Plan D: --regression-recall 는 --enable-hooks 의 dependency
docs/plans/plan-D-regression-memory.md:657:### Task 7 — `install/dependencies.sh` gstack auto-install (~30 LoC 추가)
docs/plans/plan-D-regression-memory.md:664:# ---------------------------------------------------------------------------
docs/plans/plan-D-regression-memory.md:665:# 2.5. gstack CLI — used by kzk-regression-memory (Plan D)
docs/plans/plan-D-regression-memory.md:666:# ---------------------------------------------------------------------------
docs/plans/plan-D-regression-memory.md:699:### Task 8 — `install/test/run-tests.sh` 갱신 (~10 LoC)
docs/plans/plan-D-regression-memory.md:708:# ---------------------------------------------------------------------------
docs/plans/plan-D-regression-memory.md:709:# Plan D — regression-recall.test.mjs
docs/plans/plan-D-regression-memory.md:710:# ---------------------------------------------------------------------------
docs/plans/plan-D-regression-memory.md:730:### Task 9 — `kzk-pre-merge-sync/SKILL.md` 마지막 step 추가 (~30 LoC)
docs/plans/plan-D-regression-memory.md:737:## 3. Regression-recall hook auto-enable (Plan D)
docs/plans/plan-D-regression-memory.md:772:### Task 10 — `kzk-web-loop/SKILL.md` cycle 회고 hook (~20 LoC)
docs/plans/plan-D-regression-memory.md:808:### Task 11 — `kzk-large-task-delegation/SKILL.md` recall inject 룰 (~15 LoC)
docs/plans/plan-D-regression-memory.md:824:### Task 12 — `harness-share.md` §28 신규 (~80 LoC)
docs/plans/plan-D-regression-memory.md:833:## 28. Regression Memory Protocol (kzk-regression-memory, Plan D)
docs/plans/plan-D-regression-memory.md:837:### Storage 모델
docs/plans/plan-D-regression-memory.md:844:### Recall 룰
docs/plans/plan-D-regression-memory.md:852:### 자가-skip guard
docs/plans/plan-D-regression-memory.md:858:### Stale check
docs/plans/plan-D-regression-memory.md:866:### Cycle 회고 5W1H (kzk-web-loop step 5.5 진입)
docs/plans/plan-D-regression-memory.md:877:### Default DISABLED at D commit, 자동 enable on main 머지
docs/plans/plan-D-regression-memory.md:883:### Rollback (6 level)
docs/plans/plan-D-regression-memory.md:895:### Task 13 — Skill count 동기화 14→15 (~6 LoC 변경)
docs/plans/plan-D-regression-memory.md:921:### Task 14 — Pre-commit Gate + atomic commit
docs/plans/plan-D-regression-memory.md:956:## Test 전략 (한계 명시)
docs/plans/plan-D-regression-memory.md:971:## Rollback (6 level — spec rev6)
docs/plans/plan-D-regression-memory.md:982:## Out of scope (다음 Plan 으로 위임)
docs/plans/plan-D-regression-memory.md:992:## Codex review 의무
docs/plans/plan-D-regression-memory.md:1004:## 메타 룰 (spec rev6 인용)

codex
섹션 구조는 확인했습니다. 이제 spec Axis D 본문, Plan D acceptance/task 0-14, Plan A 형식 레퍼런스를 나눠 읽어서 실제 누락과 애매한 문구를 잡겠습니다.
exec
/bin/zsh -lc "sed -n '80,147p' docs/plans/regression-memory-and-fix-quality-spec.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
### Axis D — Regression memory

신규 skill `kzk-regression-memory` + `install/hooks/regression-recall.mjs` + `install/scripts/regression-stale-check.sh`.

**Storage 모델** (cycle 2 #3 답):

```
gstack /learn JSONL (project-scoped, ~/.gstack/projects/{slug}/learnings.jsonl):
  key: <bug-slug>
  type: pitfall | pattern | architecture
  insight: <한 줄 요약 + 원인 + 수정 위치>
  confidence: 0-10
  source: fix | review | retro

sidecar (project-local, .kzk-harness/regression-meta.jsonl):
  key: <bug-slug>  # /learn key 와 1:1 FK
  file_snapshot: "<path>:<line>@<commit-SHA>"
  related_cycles: [<cycle-number>]
  dismiss_count: 0
  last_dismissed_at: null | <ISO>
  archived: false | true
```

**Sidecar = metadata extension with own SoT for dismiss state** — `/learn` 는 fix knowledge 의 source of truth. Sidecar 는 dismiss/cycle binding metadata 의 own SoT (derived view 아님 — dismiss_count 가 사용자 액션 source 라 /learn 에서 재구성 불가). Sidecar 도 git tracked. 손실 시 dismiss/decay 만 reset, /learn 데이터는 보존. cycle 1 §H2 위험: dual-write 가 아닌 *split SoT* 패턴 — `/learn` key 가 FK 라 sync 1 방향 (sidecar 는 /learn 에 없는 key 가지면 invalid).

**Orphan cleanup 룰**: recall hook 발동 시 sidecar entry 의 key 가 `/learn` 에 부재이면 sidecar 그 entry 삭제 (자동, 사용자 silent loss 방지 위해 deletion 로그 stderr 출력). 추가로 `regression-stale-check.sh` 가 cron/cycle-end 실행 시 동일 검사. 자동 GC 만 — 수동 path 없음 (영구 누수 차단).

**Recall hook** (`install/hooks/regression-recall.mjs`):
- Trigger: UserPromptSubmit. (PostToolUse 미사용 — install-global.sh 가 미지원 + cycle 2 #3)
- 키워드 매칭 (사용자 prompt 의 에러/버그/fix/수정 등)
- `gstack-learnings-search --query <kw>` (또는 gstack 의 실제 CLI — Plan D Step 0 에 검증)
- sidecar JSONL grep → dismiss_count/archived 적용
- decay: `confidence_decayed = confidence * (0.85 ** dismiss_count)`. archived 또는 confidence_decayed < 4 → 결과 제외
- system-reminder inject:
  ```
  [REGRESSION RECALL] 과거 유사 fix N건:
  - <key>: <insight> (cycle <N>, confidence_decayed <X>) [⚠ stale if SHA mismatch]
  ⚠ 자동 적용 금지. 매칭 정확성 검토 후 채택. dismiss: kzk-regression-memory dismiss <key>
  ```

**자가-skip guard** (cycle 2 #1):
- Hook 발동 시 user prompt 에서 self-improvement marker grep — 매칭되면 inject skip
- 매칭 패턴: "harness 개선 루프", "스킬 개선해줘", "harness loop", "자가개선", "메타 cycle"
- 추가: 환경변수 `KZK_HARNESS_SELF_IMPROVEMENT=1` 시 inject skip

**Default DISABLED at D commit, 자동 enable on main 머지** (cycle 2 #1 + cycle 3 #2):
- D plan commit 시점에 hook 파일은 추가하지만 settings.json 등록 안 함
- 4 plan 모두 끝나고 `kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 받은 후)
- `--regression-recall` 호출 시 keyword-detector 도 dependency 자동 enable
- merge 직전에 사용자가 enable 명시 거부 가능 — 거부 시 manual enable path 안내 (uninstall-global.sh 의 reverse 항목)

**Stale check** (cycle 1 #8):
- `install/scripts/regression-stale-check.sh` (신규 install/scripts/ 디렉토리)
- 실행 시점: cron (사용자 선택) 또는 cycle 끝 단발 (kzk-web-loop 등에서 hook)
- hook path 에서는 sidecar 의 캐시된 stale flag 만 read. 라이브 git blame 안 함
- entry 의 file_snapshot SHA 와 HEAD 비교 → 파일 삭제/변경 감지. archived 자동 X (사용자 결정)

**Cycle 회고 통합 5W1H** (cycle 2 #7 답):

| W | Detail |
|---|---|
| Who | `harness-flow-progress.md` 에 cycle entry 작성하는 주체 (메인 컨텍스트 또는 evaluator subagent). subagent 면 dispatch prompt 에 log 호출 의무. |
| When | cycle commit 직후, harness-flow-progress 갱신 다음 step |
| What | 1 entry per cycle. key=`cycle-<N>-<axis>`, type=`pattern`, insight=`<한 줄 요약>`, confidence=`<verifier 결과>`, source=`retro` |
| How | `gstack learn add --key ... --type ... --insight ... --confidence ... --source retro` (Plan D Step 0 에서 정확 시그니처 확정). sidecar 는 동시에 `key`, `related_cycles=[N]` 만 append |
| 실패시 | gstack 미설치 → cycle commit 시 stderr WARN 출력 + cycle entry 본문에 "regression memory 비활성 (gstack 미설치)" 의무 표기. silent skip 금지. cycle 진행 자체는 계속 (회고 entry 만 누락). |
| Where (kzk-web-loop) | `kzk-web-loop` cycle 끝의 evaluator 결과 paragraph 에서 추출 |


exec
/bin/zsh -lc "sed -n '15,110p' docs/plans/plan-A-tdd-self-verification-block.md" in /Users/kimzerokim/work/personal/kzk-harness
exec
/bin/zsh -lc "sed -n '17,235p' docs/plans/plan-D-regression-memory.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
## Acceptance Criteria

1. `skills/kzk-test-coverage/SKILL.md` v1.3 — `## Anti-pattern — Test-from-implementation` 섹션 추가, Layer (b) 자율 mode 룰 포함, hook/install 인프라 read 예외 명시
2. `skills/kzk-large-task-delegation/SKILL.md` — sonnet executor dispatch 시 anti-self-verification boilerplate 가 prompt 에 자동 포함되도록 §Subagent prompt requirements 또는 §Sonnet executor 룰 갱신
3. `harness-share.md` §11.1 신규 subsection — Layer (a) + (b) cross-ref
4. `install/test/skill-text-checks.sh` 신규 — kzk-test-coverage SKILL.md 의 Anti-pattern 섹션 grep + kzk-large-task-delegation SKILL.md 의 boilerplate 룰 grep 확인
5. `install/test/run-tests.sh` 갱신 — skill-text-checks.sh 호출 등록
6. **CLAUDE.md / README.md skill count 검증 — Plan A 변경 없음 확인** (Plan A 는 신규 skill 없음. `git diff CLAUDE.md README.md` 결과에 skill count line / "All N skills" line 포함 안 됨을 명시 점검. 신규 skill 추가는 Plan B/D 책임)
7. `bash install/test/run-tests.sh` PASS
8. atomic commit 메시지: `feat(skill): kzk-test-coverage v1.3 — anti-self-verification (Plan A)`

## Variables

- `SKILL_TC = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-test-coverage/SKILL.md`
- `SKILL_LTD = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-large-task-delegation/SKILL.md`
- `SHARE = /Users/kimzerokim/work/personal/kzk-harness/harness-share.md`
- `TEST_CHECKS = /Users/kimzerokim/work/personal/kzk-harness/install/test/skill-text-checks.sh`
- `TEST_RUN = /Users/kimzerokim/work/personal/kzk-harness/install/test/run-tests.sh`

## Tasks

### Task 1 — `kzk-test-coverage/SKILL.md` v1.3 (frontmatter + Anti-pattern + Layer b)

**File**: `$SKILL_TC`

**Frontmatter 변경**:
- `version: 1.2.0` → `version: 1.3.0`
- description 끝에 trigger 추가: `'자율 mode TDD'`, `'test-from-implementation'`, `'self-verification'` (env var 이름 `KZK_AUTONOMOUS` 는 user trigger 가 아니므로 제외)

**Triggers section 갱신** (line 13): 끝에 추가 — env var 이름 제외
```
'test-from-implementation', '자율 mode TDD', 'self-verification', '자기검증 차단', 'anti-self-verification'
```

**Anti-pattern 섹션 신규** — 기존 `## TDD sequence` 다음, `## Exemptions` 직전 위치에 삽입:

```markdown
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

**자율 mode 판별** (spec rev6 wording 그대로 — `=0 override` 없음):
1. 환경변수 `KZK_AUTONOMOUS=1` → 자율 mode (가장 신뢰)
2. **환경변수 unset 시** 보조 키워드 매칭 — **동사구만**:
   - "ralph 로 돌려", "web-loop 진입", "autonomous-loop 시작"
   - "harness 개선 루프 시작", "자가개선 cycle 진입", "끝까지 끝내줘"
   - **명사 단독** ("자가개선" 만, "ralph" 만) 매칭 금지 — 일반 prompt false positive 차단

**enforcement layer**:
- Layer (a) sonnet dispatch prompt 룰 — `kzk-large-task-delegation` 의 §Subagent prompt requirements 의 Rules block 에 자동 주입 (boilerplate 텍스트 본 SKILL.md 참조)
- Layer (b) 메인 self-check — 본 섹션의 자율 mode 판별 + halt 룰
```

**§Interaction with other kzk-* 갱신** — 기존 항목 끝에 추가:
```
- **kzk-autonomous-boundary**: 자율 mode 판별 키워드 / 환경변수 룰을 본 skill §Anti-pattern Layer b 에서 정의. autonomous-boundary 의 halt 룰과 통합 (`Q-TDD-MAIN` 큐 entry). **본 Plan A 는 contract only — kzk-autonomous-boundary skill 본문 수정은 Plan A 범위 밖. autonomous-boundary skill 의 halt 룰 표 / Q-TDD-MAIN cross-ref update 는 별도 follow-up 작업 (Plan C 통합 또는 fast-follow). split-brain 위험 인지 — Plan A frozen 시 follow-up issue 등록 의무.**
```

### Task 2 — `kzk-large-task-delegation/SKILL.md` boilerplate

**File**: `$SKILL_LTD`

**§Subagent prompt requirements 갱신** (line 224 부근의 Rules block 항목):

기존:
> Rules block: TDD sequence (red-green-refactor — see kzk-test-coverage §TDD sequence; failing test BEFORE impl is non-negotiable in autonomous mode) + ...

변경 (참조만이 아니라 **literal boilerplate 를 dispatch prompt 에 그대로 포함**하도록 못박음):
> Rules block: TDD sequence (red-green-refactor — see kzk-test-coverage §TDD sequence; failing test BEFORE impl is non-negotiable in autonomous mode) + **§Sonnet executor — Anti-self-verification boilerplate 의 literal boilerplate 텍스트를 dispatch prompt 의 Rules block 에 그대로 포함 (참조만 X — fresh agent 는 SKILL.md 를 자동으로 읽지 않음)** + ...

**§Sonnet executor — extra plan-detail requirements** 끝에 신규 subsection 추가:

 succeeded in 0ms:
## Acceptance Criteria

1. `skills/kzk-regression-memory/SKILL.md` 신규 — frontmatter (name/version/description with triggers), §Triggers, §Storage 모델 (5필드 + sidecar 6필드), §Recall 룰 (decay 공식 + archived 룰), §자가-skip guard, §Cycle 회고 5W1H 표, §Stale check, §Rollback, §Interaction with other kzk-*
2. `install/hooks/regression-recall.mjs` 신규 — UserPromptSubmit hook, 자가-skip guard 구현, /learn search + sidecar JSONL grep + decay + archived 필터링, system-reminder inject. **default DISABLED** (settings.json 등록 안 함)
3. `install/scripts/regression-stale-check.sh` 신규 — sidecar 의 file_snapshot SHA vs HEAD 비교, archived 자동 X, 결과 stderr/stdout 출력
4. `install/test/regression-recall.test.mjs` 신규 — mock fixture 기반 test (recall 매칭 + decay + dismiss + 자가-skip + orphan cleanup 시뮬)
5. `install/test/fixtures/gstack-learnings.sample.jsonl` 신규 — Plan D Step 0 에서 실제 `gstack learn add` 출력 캡처본
6. `install/test/fixtures/regression-meta.sample.jsonl` 신규 — sidecar fixture (key/file_snapshot/related_cycles/dismiss_count/last_dismissed_at/archived 6필드)
7. `install/install-global.sh` `enable_hooks()` 확장 — `--regression-recall` flag 추가, regression-recall.mjs 등록 + keyword-detector 자동 enable (explicit dependency)
8. `install/dependencies.sh` 갱신 — gstack auto-install entry 추가 (npm-first → brew-fallback). 미설치 시 stderr WARN + SUMMARY 의무 표기 (silent skip 금지)
9. `install/test/run-tests.sh` 갱신 — `regression-recall.test.mjs` 호출 등록
10. `skills/kzk-pre-merge-sync/SKILL.md` 갱신 — 마지막 step `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트)
11. `skills/kzk-web-loop/SKILL.md` 갱신 — cycle 끝의 step 6 직전에 `gstack learn add` 호출 (회고 entry, gstack 미설치 시 WARN)
12. `skills/kzk-large-task-delegation/SKILL.md` 갱신 — subagent dispatch prompt 에 recall 결과 inject 룰 추가
13. `harness-share.md` §28 신규 — Regression Memory protocol (Storage 모델 / Recall 룰 / 자가-skip guard / Stale check / Cycle 회고 / Rollback)
14. `CLAUDE.md` line 3 + "All N skills" line + `README.md` line 3 + install command skill count — 14→15 (Plan D 신규 skill 1개)
15. `bash install/test/run-tests.sh` PASS (regression-recall.test.mjs 포함 전체 통과)

## Variables

- `SKILL_RM = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-regression-memory/SKILL.md`
- `SKILL_PMS = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-pre-merge-sync/SKILL.md`
- `SKILL_WL = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-web-loop/SKILL.md`
- `SKILL_LTD = /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-large-task-delegation/SKILL.md`
- `HOOK_RECALL = /Users/kimzerokim/work/personal/kzk-harness/install/hooks/regression-recall.mjs`
- `SCRIPT_STALE = /Users/kimzerokim/work/personal/kzk-harness/install/scripts/regression-stale-check.sh`
- `TEST_RECALL = /Users/kimzerokim/work/personal/kzk-harness/install/test/regression-recall.test.mjs`
- `FIXTURE_LEARN = /Users/kimzerokim/work/personal/kzk-harness/install/test/fixtures/gstack-learnings.sample.jsonl`
- `FIXTURE_META = /Users/kimzerokim/work/personal/kzk-harness/install/test/fixtures/regression-meta.sample.jsonl`
- `INSTALL_GLOBAL = /Users/kimzerokim/work/personal/kzk-harness/install/install-global.sh`
- `DEPS = /Users/kimzerokim/work/personal/kzk-harness/install/dependencies.sh`
- `TEST_RUN = /Users/kimzerokim/work/personal/kzk-harness/install/test/run-tests.sh`
- `SHARE = /Users/kimzerokim/work/personal/kzk-harness/harness-share.md`
- `CLAUDE_MD = /Users/kimzerokim/work/personal/kzk-harness/CLAUDE.md`
- `README = /Users/kimzerokim/work/personal/kzk-harness/README.md`

## Tasks

### Task 0 — gstack backend probe (CRITICAL — backend drift 차단)

**가장 먼저 실행. 이 step 의 출력이 모든 fixture / schema 가정의 single source of truth.**

진입 의존: gstack 설치되어 있어야 함. 미설치 환경 → 다음 분기:

1. `gstack --version` 또는 `gstack help` 시도. 명령 unavailable → Plan D 진행 정지, sidecar-only mode 의 fallback spec 작성으로 전환 (recall hook 은 sidecar 만 read, /learn 통합 없음 — 본 plan 의 §Out of scope 후보로 push)
2. gstack 가용 시:
   ```bash
   gstack learn --help
   ```
   출력 캡처 → plan 본문의 `## Cycle 회고` 표 §How 행에 정확 시그니처 박음 (예: `gstack learn add --key <slug> --type <pitfall|pattern|architecture> --insight "..." --confidence <0-10> --source <fix|review|retro>`)
3. 실제 entry 1회 실행:
   ```bash
   gstack learn add --key plan-d-step-0-test --type pattern --insight "Step 0 backend probe — schema 검증" --confidence 5 --source retro
   ```
4. JSONL 출력 캡처 — `~/.gstack/projects/<slug>/learnings.jsonl` 의 추가된 마지막 line read
5. `$FIXTURE_LEARN` 로 복사 (실 backend 형식 = fixture 단일 source). git tracked
6. spec rev6 §Storage 모델 의 entry schema (key/type/insight/confidence/source) 와 비교. 차이 발견 시 Plan D draft 자체를 수정 — `/learn` 의 actual schema 우선
7. `$FIXTURE_META` 는 spec §Storage 모델 sidecar schema (6필드) 따라 hand-write 2-3 entries:
   ```jsonl
   {"key":"plan-d-step-0-test","file_snapshot":"install/hooks/regression-recall.mjs:42@abc1234","related_cycles":[31],"dismiss_count":0,"last_dismissed_at":null,"archived":false}
   {"key":"hypothetical-stale-bug","file_snapshot":"deleted/file.ts:10@old5678","related_cycles":[28],"dismiss_count":2,"last_dismissed_at":"2026-04-15T10:00:00Z","archived":false}
   {"key":"hypothetical-archived","file_snapshot":"src/old.ts:5@cafe9999","related_cycles":[20,22],"dismiss_count":3,"last_dismissed_at":"2026-04-20T10:00:00Z","archived":true}
   ```
8. 실패 시 user-queue entry: `Q-PLAN-D-STEP0 — gstack 미설치 또는 시그니처 캡처 실패, sidecar-only fallback 검토 필요`

**완료 게이트**: `$FIXTURE_LEARN` 와 `$FIXTURE_META` 둘 다 git-tracked, 실제 line 포맷 검증 (jq 또는 node 로 JSONL parse 가능).

### Task 1 — `kzk-regression-memory/SKILL.md` 신규 (~250 lines)

**File**: `$SKILL_RM`

**Frontmatter**:

```yaml
---
name: kzk-regression-memory
version: 1.0.0
description: "Regression memory + auto-recall — fix 시작 시 과거 유사 fix 자동 조회 (gstack /learn + sidecar). Top triggers: 'regression memory', '재발 방지', 'fix 시작', 'recall', '과거 fix 조회'. Body §Triggers for full list."
---
```

**Body 구조** (Plan A 의 detail 수준):

```markdown
> Authoritative source: `harness-share.md` §28. On conflict, that wins.

# kzk-regression-memory

## Triggers

`regression memory`, `재발 방지`, `fix 시작`, `recall`, `과거 fix 조회`,
`같은 버그 또`, `이거 또 났네`, `regression`, `gstack learn`,
`자가개선 cycle 회고`, `cycle retro`, `dismiss recall`.

## Why

자율실행 / 자가개선 cycle 의 5 메타갭 중 하나 — *Regression 망각*. 과거 fix 기록 존재해도 fix 시작 시점에 조회 안 됨. 본 skill 은 fix-start 시점 prompt 매칭 → 자동 recall.

## Storage 모델

**Backend = gstack /learn JSONL (project-scoped, ~/.gstack/projects/{slug}/learnings.jsonl):**

| field | type | semantics |
|---|---|---|
| `key` | string | bug-slug (FK to sidecar) |
| `type` | enum | `pitfall` \| `pattern` \| `architecture` |
| `insight` | string | 한 줄 요약 + 원인 + 수정 위치 |
| `confidence` | int 0-10 | verifier 결과 |
| `source` | enum | `fix` \| `review` \| `retro` |

**Sidecar = project-local (.kzk-harness/regression-meta.jsonl):**

| field | type | semantics |
|---|---|---|
| `key` | string | `/learn` key 와 1:1 FK |
| `file_snapshot` | string | `<path>:<line>@<commit-SHA>` |
| `related_cycles` | int[] | cycle numbers |
| `dismiss_count` | int | 누적 dismiss 횟수 |
| `last_dismissed_at` | ISO8601 \| null | 마지막 dismiss 시각 |
| `archived` | bool | true → recall 결과 제외 |

**Sidecar = metadata extension with own SoT for dismiss state** — derived view 아님. dismiss_count 가 사용자 액션 source 라 `/learn` 에서 재구성 불가. Sidecar 도 git tracked. 손실 시 dismiss/decay 만 reset, /learn 데이터는 보존.

**FK 룰**: sidecar entry 의 `key` 는 `/learn` 에 반드시 존재. 부재 시 invalid → orphan cleanup 룰 적용.

## Recall 룰

UserPromptSubmit hook (`install/hooks/regression-recall.mjs`) 발동 시:

1. 자가-skip guard 평가 (아래 §자가-skip guard) — 매칭 시 즉시 skip
2. user prompt 에서 키워드 매칭 (에러/버그/fix/수정/regression/같은 버그 등)
3. `gstack learn search --query <kw>` (또는 `~/.gstack/projects/<slug>/learnings.jsonl` 직접 grep — Plan D Step 0 에서 시그니처 확정)
4. sidecar JSONL grep — 각 hit 의 dismiss_count, archived, last_dismissed_at 조회
5. **Decay 공식**: `confidence_decayed = confidence * (0.85 ** dismiss_count)`. floating point.
6. 필터:
   - `archived: true` → 제외
   - `confidence_decayed < 4` → 제외
7. **Orphan cleanup**: sidecar entry 의 key 가 /learn 에 부재 → sidecar 그 entry 자동 삭제 + stderr 로그 (`[regression-recall] orphan key removed: <key>`)
8. 잔존 hits 으로 system-reminder inject:
   ```
   🚨 [REGRESSION RECALL] 과거 유사 fix N건:
   - <key>: <insight> (cycle <N>, confidence_decayed <X.XX>) [⚠ stale if SHA mismatch]
   ⚠ 자동 적용 금지. 매칭 정확성 검토 후 채택.
   dismiss: kzk-regression-memory dismiss <key>  (sidecar dismiss_count++)
   ```

매칭 0건 → `{"continue":true}` (silent pass-through)

## 자가-skip guard

자율실행 cycle 의 메인 prompt 면 inject 안 함:

- 환경변수 `KZK_HARNESS_SELF_IMPROVEMENT=1` → 즉시 skip
- user prompt 에서 self-improvement marker grep — 매칭되면 skip:
  - `harness 개선 루프`, `스킬 개선해줘`, `harness loop`, `자가개선`, `자가개선 cycle`, `메타 cycle`

이유: D recall hook 이 자가개선 cycle 에서 발동하면 자기 자신의 진행을 inject 로 오염. 자율 cycle 진행 차단.

## Cycle 회고 통합 (5W1H)

| W | Detail |
|---|---|
| Who | `harness-flow-progress.md` 에 cycle entry 작성하는 주체 (메인 컨텍스트 또는 evaluator subagent). subagent 면 dispatch prompt 에 log 호출 의무 inject. |
| When | cycle commit 직후, harness-flow-progress 갱신 다음 step |
| What | 1 entry per cycle. `key=cycle-<N>-<axis>`, `type=pattern`, `insight=<한 줄 요약>`, `confidence=<verifier 결과>`, `source=retro` |
| How | `gstack learn add --key ... --type ... --insight ... --confidence ... --source retro` (Plan D Step 0 에서 정확 시그니처 확정). sidecar 는 동시에 `key`, `related_cycles=[N]`, 나머지 default 로 append |
| 실패시 | gstack 미설치 → cycle commit 시 stderr WARN 출력 + cycle entry 본문에 "regression memory 비활성 (gstack 미설치)" 의무 표기. silent skip 금지. cycle 진행 자체는 계속 (회고 entry 만 누락) |
| Where (kzk-web-loop) | `kzk-web-loop` cycle 끝의 evaluator 결과 paragraph 에서 추출 |

## Stale check

`install/scripts/regression-stale-check.sh`:

- 실행 시점: cron (사용자 선택) 또는 cycle 끝 단발 (kzk-web-loop 등에서 hook)
- entry 의 `file_snapshot` SHA 와 HEAD 비교 → 파일 삭제/변경 감지
- 변경 감지 시: stderr 로 stale flag 출력, sidecar 의 캐시된 stale flag 만 update (라이브 git blame 안 함). archived 자동 X (사용자 결정)
- recall hook 은 sidecar 의 cached stale flag read — hook path 에서 라이브 git blame 금지 (성능)

## Default DISABLED 정책

**D commit 시점**: hook 파일은 추가하지만 settings.json 등록 안 함. `--regression-recall` flag 호출 안 한 상태.

**자동 enable on main 머지**: 4 plan (A→D→B→C→E) 모두 끝나고 `kzk-pre-merge-sync` 의 마지막 step 에서 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트). `--regression-recall` 호출 시 keyword-detector 도 explicit dependency 자동 enable.

거부 path: 사용자 confirm 거부 → manual enable 안내 (`uninstall-global.sh` 의 reverse 참고). cycle 진행 자체는 영향 X.

## Rollback

| Level | 메커니즘 |
|---|---|
| 단일 plan revert | `git revert <Plan-D-commit-sha>` |
| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=regression-recall` |
| Skill 즉시 비활성 | `DISABLE_OMC=kzk-regression-memory` |
| Cycle 자가-회복 불가 시 | settings.json hook entry 수동 제거 |
| Sidecar 손실 | dismiss_count reset 만 — `/learn` 데이터 보존 |
| Plan D 자가오염 시 | hook default DISABLED 라 즉시 위협 없음. enable 후 발견 시 `OMC_SKIP_HOOKS=regression-recall` 즉시 비활성 |

## Interaction with other kzk-*

- **kzk-pre-merge-sync**: 마지막 step 에서 `--enable-hooks --regression-recall` 자동 호출 (사용자 confirm). first-enable 망각 차단.
- **kzk-web-loop**: cycle 끝 step 6 직전에 `gstack learn add` 호출 — 회고 entry 자동 작성. gstack 미설치 시 stderr WARN.
- **kzk-large-task-delegation**: subagent dispatch prompt 에 recall 결과 inject 룰. fix-start 시점 recall = subagent 도 recall 결과 read.
- **kzk-fix-scope-expansion** (Plan B): D recall 결과를 consumer 로 read — fix-start hook 이 D 다음에 발동.
- **kzk-autonomous-boundary**: 자가-skip guard 가 자율 mode marker grep — 자율 cycle 메인 prompt 자가오염 차단.
```

### Task 2 — `install/hooks/regression-recall.mjs` 신규 (~180 LoC)

**File**: `$HOOK_RECALL`

**Pattern**: `keyword-detector.mjs` 와 동일한 stdin/stdout 모양 (UserPromptSubmit hookSpecificOutput).

**구조**:

```js
#!/usr/bin/env node
// regression-recall.mjs — UserPromptSubmit hook for kzk-regression-memory.
// Triggers fix-start phrases, queries /learn + sidecar, injects recall results.
// Authoritative spec: docs/plans/regression-memory-and-fix-quality-spec.md (rev6).

exec
/bin/zsh -lc "sed -n '223,386p' docs/plans/plan-D-regression-memory.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
### Task 2 — `install/hooks/regression-recall.mjs` 신규 (~180 LoC)

**File**: `$HOOK_RECALL`

**Pattern**: `keyword-detector.mjs` 와 동일한 stdin/stdout 모양 (UserPromptSubmit hookSpecificOutput).

**구조**:

```js
#!/usr/bin/env node
// regression-recall.mjs — UserPromptSubmit hook for kzk-regression-memory.
// Triggers fix-start phrases, queries /learn + sidecar, injects recall results.
// Authoritative spec: docs/plans/regression-memory-and-fix-quality-spec.md (rev6).
// Default DISABLED at Plan D commit. Auto-enabled by kzk-pre-merge-sync last step.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import os from "node:os";

const FIX_KEYWORDS = [
  "fix", "수정", "버그", "에러", "error", "regression", "재발",
  "같은 버그", "또 났", "이거 또", "broken", "안 됨", "안된다",
];

const SELF_IMPROVE_MARKERS = [
  "harness 개선 루프", "스킬 개선해줘", "harness loop",
  "자가개선", "자가개선 cycle", "메타 cycle",
];

const DECAY_BASE = 0.85;
const CONFIDENCE_THRESHOLD = 4;

function shouldSkip(prompt, env) {
  if (env.KZK_HARNESS_SELF_IMPROVEMENT === "1") return "env:KZK_HARNESS_SELF_IMPROVEMENT";
  for (const m of SELF_IMPROVE_MARKERS) {
    if (prompt.includes(m)) return `marker:${m}`;
  }
  return null;
}

function detectFixIntent(prompt) {
  return FIX_KEYWORDS.some((k) => prompt.includes(k));
}

function loadSidecar(repoRoot) {
  const p = path.join(repoRoot, ".kzk-harness", "regression-meta.jsonl");
  if (!existsSync(p)) return { entries: [], path: p };
  const lines = readFileSync(p, "utf8").split("\n").filter(Boolean);
  return {
    entries: lines.map((l) => JSON.parse(l)),
    path: p,
  };
}

function querylearn(query) {
  // Plan D Step 0 에서 확정된 시그니처. 시그니처 미확정 시 sidecar-only fallback.
  try {
    const out = execSync(`gstack learn search --query ${JSON.stringify(query)} --format jsonl`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 5000,
    });
    return out.split("\n").filter(Boolean).map((l) => JSON.parse(l));
  } catch (e) {
    // gstack 미설치 또는 search command unavailable
    return null;
  }
}

function decay(confidence, dismissCount) {
  return confidence * Math.pow(DECAY_BASE, dismissCount);
}

function orphanCleanup(sidecar, learnKeys) {
  const keepKeys = new Set(learnKeys);
  const survivors = sidecar.entries.filter((e) => keepKeys.has(e.key));
  const removed = sidecar.entries.length - survivors.length;
  if (removed > 0) {
    writeFileSync(sidecar.path, survivors.map((e) => JSON.stringify(e)).join("\n") + "\n");
    process.stderr.write(`[regression-recall] orphan keys removed: ${removed}\n`);
  }
  return survivors;
}

function buildReminder(hits) {
  if (hits.length === 0) return null;
  const lines = hits.map((h) => {
    const stale = h.staleFlag ? " [⚠ stale if SHA mismatch]" : "";
    return `- ${h.key}: ${h.insight} (cycle ${h.cycles.join(",")}, confidence_decayed ${h.confidenceDecayed.toFixed(2)})${stale}`;
  });
  return [
    `🚨 [REGRESSION RECALL] 과거 유사 fix ${hits.length}건:`,
    ...lines,
    `⚠ 자동 적용 금지. 매칭 정확성 검토 후 채택.`,
    `dismiss: kzk-regression-memory dismiss <key>`,
  ].join("\n");
}

export { shouldSkip, detectFixIntent, decay, orphanCleanup, buildReminder, FIX_KEYWORDS, SELF_IMPROVE_MARKERS };

if (process.argv[1] === new URL(import.meta.url).pathname) {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { raw += chunk; });
  process.stdin.on("end", () => {
    let payload;
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }
    const prompt = String(payload.prompt ?? payload.user_prompt ?? "");
    const repoRoot = process.cwd();

    const skip = shouldSkip(prompt, process.env);
    if (skip) {
      process.stdout.write(JSON.stringify({ continue: true, _skip: skip }) + "\n");
      return;
    }
    if (!detectFixIntent(prompt)) {
      process.stdout.write(JSON.stringify({ continue: true }) + "\n");
      return;
    }

    const sidecar = loadSidecar(repoRoot);
    const learnEntries = querylearn(prompt) ?? [];
    const learnKeys = learnEntries.map((e) => e.key);

    const survivors = orphanCleanup(sidecar, learnKeys);
    const survivorsByKey = new Map(survivors.map((e) => [e.key, e]));

    const hits = [];
    for (const learnEntry of learnEntries) {
      const meta = survivorsByKey.get(learnEntry.key);
      if (!meta) continue;  // sidecar 미존재 = invalid (FK 룰)
      if (meta.archived) continue;
      const dec = decay(learnEntry.confidence, meta.dismiss_count);
      if (dec < CONFIDENCE_THRESHOLD) continue;
      hits.push({
        key: learnEntry.key,
        insight: learnEntry.insight,
        cycles: meta.related_cycles,
        confidenceDecayed: dec,
        staleFlag: meta.stale ?? false,
      });
    }

    const reminder = buildReminder(hits);
    if (reminder) {
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: reminder },
        }) + "\n",
      );
    } else {
      process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    }
  });
}
```

**핵심 설계 노트** (executor 가 빠뜨리지 말아야 할 것):
- exports 필수: `shouldSkip`, `detectFixIntent`, `decay`, `orphanCleanup`, `buildReminder` — test 가 import
- gstack 미설치 시 silent fallback (querylearn 이 null 반환) — test 에서 stub
- sidecar JSONL parse 실패 entry 1개 → 그 line 만 skip, 나머지 진행 (전체 hook 실패 X)
- timeout 5s — gstack hang 방지


exec
/bin/zsh -lc "sed -n '387,575p' docs/plans/plan-D-regression-memory.md" in /Users/kimzerokim/work/personal/kzk-harness
exec
/bin/zsh -lc "sed -n '576,955p' docs/plans/plan-D-regression-memory.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
### Task 3 — `install/scripts/regression-stale-check.sh` 신규 (~80 LoC)

**File**: `$SCRIPT_STALE`

`install/scripts/` 디렉토리 신규 — `mkdir -p install/scripts`.

```bash
#!/usr/bin/env bash
# regression-stale-check.sh — Plan D 단발 stale check.
#
# sidecar (.kzk-harness/regression-meta.jsonl) 의 file_snapshot SHA 와 HEAD 비교.
# 변경 감지 시 sidecar 의 cached stale flag update + stderr 로그.
# archived 자동 X — 사용자 결정.
#
# 실행 시점: cron (사용자 선택) 또는 cycle 끝 단발 (kzk-web-loop 등에서 hook).

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SIDECAR="$REPO_ROOT/.kzk-harness/regression-meta.jsonl"

if [ ! -f "$SIDECAR" ]; then
  printf '[regression-stale-check] sidecar not found: %s — skipping\n' "$SIDECAR" >&2
  exit 0
fi

if ! command -v jq >/dev/null 2>&1; then
  printf '[regression-stale-check] jq not found — install jq to enable stale check\n' >&2
  exit 0
fi

if ! command -v git >/dev/null 2>&1; then
  printf '[regression-stale-check] git not found — abort\n' >&2
  exit 1
fi

stale_count=0
ok_count=0
tmp_out=$(mktemp)

while IFS= read -r line; do
  [ -z "$line" ] && continue
  key=$(printf '%s' "$line" | jq -r '.key')
  snapshot=$(printf '%s' "$line" | jq -r '.file_snapshot')

  # parse "<path>:<line>@<commit-SHA>"
  rest="${snapshot%@*}"
  sha="${snapshot##*@}"
  file_path="${rest%:*}"

  # current SHA of file at HEAD
  if [ -f "$REPO_ROOT/$file_path" ]; then
    current_sha=$(cd "$REPO_ROOT" && git rev-parse "HEAD:$file_path" 2>/dev/null || echo "deleted")
  else
    current_sha="deleted"
  fi

  if [ "$current_sha" != "$sha" ]; then
    stale_count=$((stale_count + 1))
    printf '[regression-stale-check] stale: %s (was %s, now %s)\n' "$key" "$sha" "$current_sha" >&2
    updated=$(printf '%s' "$line" | jq --argjson stale true '. + {stale: $stale}')
    printf '%s\n' "$updated" >> "$tmp_out"
  else
    ok_count=$((ok_count + 1))
    cleared=$(printf '%s' "$line" | jq '. + {stale: false}')
    printf '%s\n' "$cleared" >> "$tmp_out"
  fi
done < "$SIDECAR"

mv "$tmp_out" "$SIDECAR"
printf '[regression-stale-check] done — %d stale, %d ok\n' "$stale_count" "$ok_count" >&2
exit 0
```

`chmod +x` 의무.

### Task 4 — `install/test/regression-recall.test.mjs` 신규 (~150 LoC)

**File**: `$TEST_RECALL`

mock fixture 기반 unit test. 실 gstack CLI 호출 없음 — test 는 fixture file read 로 시뮬.

```js
#!/usr/bin/env node
// regression-recall.test.mjs — Plan D unit tests.
//
// Mock gstack CLI by reading $FIXTURE_LEARN directly (skip execSync).
// Tests: detect, decay, orphan cleanup, self-skip guard, archived/threshold filtering.
//
// 한계: behavioral test (실제 settings.json 통합) 는 manual cycle 검증 의존.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  shouldSkip, detectFixIntent, decay, orphanCleanup, buildReminder,
  FIX_KEYWORDS, SELF_IMPROVE_MARKERS,
} from "../hooks/regression-recall.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_LEARN = path.join(__dirname, "fixtures/gstack-learnings.sample.jsonl");
const FIXTURE_META = path.join(__dirname, "fixtures/regression-meta.sample.jsonl");

let pass = 0, fail = 0;
const errors = [];

function assert(desc, cond) {
  if (cond) { console.log(`  PASS: ${desc}`); pass++; }
  else { console.log(`  FAIL: ${desc}`); fail++; errors.push(desc); }
}

function loadFixtureLines(p) {
  return readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

// T1: shouldSkip — env var
assert("shouldSkip env KZK_HARNESS_SELF_IMPROVEMENT=1",
  shouldSkip("any prompt", { KZK_HARNESS_SELF_IMPROVEMENT: "1" }) !== null);

// T2: shouldSkip — marker
assert("shouldSkip marker '자가개선'",
  shouldSkip("자가개선 cycle 진입", {}) !== null);

// T3: shouldSkip — pass-through
assert("shouldSkip ordinary prompt returns null",
  shouldSkip("이 버그 수정해줘", {}) === null);

// T4: detectFixIntent
assert("detectFixIntent matches '버그'", detectFixIntent("이 버그 또 났네"));
assert("detectFixIntent matches 'fix'", detectFixIntent("please fix this"));
assert("detectFixIntent no-match on greeting", !detectFixIntent("안녕하세요"));

// T5: decay
assert("decay confidence=10 dismiss=0 returns 10", decay(10, 0) === 10);
assert("decay confidence=10 dismiss=1 returns 8.5", Math.abs(decay(10, 1) - 8.5) < 1e-9);
assert("decay confidence=10 dismiss=3 < 7.3", decay(10, 3) < 7.3);

// T6: archived filter (decay >= threshold but archived → exclude)
const learnFix = loadFixtureLines(FIXTURE_LEARN);
const metaFix = loadFixtureLines(FIXTURE_META);
const archivedKey = metaFix.find((m) => m.archived)?.key;
assert("fixture has at least 1 archived entry", archivedKey !== undefined);

// T7: orphan cleanup — sidecar key not in learn → removed
const fakeSidecar = {
  entries: [
    { key: "exists-in-learn", dismiss_count: 0, archived: false, related_cycles: [1] },
    { key: "orphan-key-123", dismiss_count: 0, archived: false, related_cycles: [2] },
  ],
  path: "/tmp/regression-meta-test.jsonl",
};
// patch writeFileSync side-effect: we bypass real file write by mocking via temp path.
// Instead, test return value only (mutation ok).
const survivors = orphanCleanup(fakeSidecar, ["exists-in-learn"]);
assert("orphan cleanup removes orphan-key-123", survivors.length === 1 && survivors[0].key === "exists-in-learn");

// T8: buildReminder — empty hits → null
assert("buildReminder empty returns null", buildReminder([]) === null);

// T9: buildReminder — populated
const reminder = buildReminder([
  { key: "k1", insight: "ins1", cycles: [3], confidenceDecayed: 7.5, staleFlag: false },
]);
assert("buildReminder contains REGRESSION RECALL", reminder.includes("REGRESSION RECALL"));
assert("buildReminder contains key k1", reminder.includes("k1"));
assert("buildReminder contains confidence_decayed", reminder.includes("7.50"));

// T10: full integration sim — fix prompt + 1 learn hit + 1 sidecar match → reminder
const promptFix = "이 버그 수정해줘";
const promptSkip = "자가개선 cycle 진입";
assert("full sim: fix prompt + no skip", shouldSkip(promptFix, {}) === null && detectFixIntent(promptFix));
assert("full sim: skip prompt skipped", shouldSkip(promptSkip, {}) !== null);

console.log(`\n${pass} pass, ${fail} fail`);
if (fail > 0) {
  console.log("Errors:");
  errors.forEach((e) => console.log(`  - ${e}`));
  process.exit(1);
}
process.exit(0);
```

**Test 한계** (Plan D 본문에 명시):
- `execSync(gstack ...)` 미실행 — `querylearn()` 의 mock 화 안 함 (test 가 import 하는 함수만 검증). 실제 gstack 통합은 manual cycle 검증.
- settings.json 실제 등록은 `enable_hooks` test 가 별도 책임 (Task 8).
- `loadSidecar` 의 파일 read 도 본 test 의 직접 검증 대상 아님 — fixture 로 schema 만 검증.

### Task 5 — fixture 파일 신규


 succeeded in 0ms:
**Files**: `$FIXTURE_LEARN`, `$FIXTURE_META`

`install/test/fixtures/` 디렉토리 신규 — `mkdir -p install/test/fixtures`.

`$FIXTURE_LEARN` (Step 0 캡처 결과 — 실제 gstack 출력 형식):
```jsonl
{"key":"plan-d-step-0-test","type":"pattern","insight":"Step 0 backend probe — schema 검증","confidence":5,"source":"retro"}
{"key":"hypothetical-stale-bug","type":"pitfall","insight":"old fix — file deleted","confidence":7,"source":"fix"}
{"key":"hypothetical-archived","type":"pattern","insight":"dismissed 3 times","confidence":6,"source":"review"}
```

`$FIXTURE_META` (sidecar 6필드):
```jsonl
{"key":"plan-d-step-0-test","file_snapshot":"install/hooks/regression-recall.mjs:42@abc1234","related_cycles":[31],"dismiss_count":0,"last_dismissed_at":null,"archived":false}
{"key":"hypothetical-stale-bug","file_snapshot":"deleted/file.ts:10@old5678","related_cycles":[28],"dismiss_count":2,"last_dismissed_at":"2026-04-15T10:00:00Z","archived":false}
{"key":"hypothetical-archived","file_snapshot":"src/old.ts:5@cafe9999","related_cycles":[20,22],"dismiss_count":3,"last_dismissed_at":"2026-04-20T10:00:00Z","archived":true}
```

git tracked. Plan D 변경 시 재캡처 의무 (drift 방지).

### Task 6 — `install/install-global.sh` `enable_hooks()` 확장 (~50 LoC 변경)

**File**: `$INSTALL_GLOBAL` (line 619-644 부근)

**변경 1 — `parse_flags()` 에 `--regression-recall` 추가** (parse_flags 위치는 파일 다른 부분, executor 가 grep 찾기): 기존 `--enable-hooks` 옆에 `--regression-recall` flag 추가, default off (`DO_REGRESSION_RECALL=0`).

**변경 2 — `enable_hooks()` 본문 수정** (line 621-644):

```bash
enable_hooks() {
  local src="$SOURCE_REPO_DIR"
  mkdir -p "$HOME/.claude/skills/.kzk-harness-shared/hooks"
  cp "$src/install/hooks/keyword-detector.mjs" \
    "$HOME/.claude/skills/.kzk-harness-shared/hooks/"

  # Plan D: regression-recall hook (explicit dependency on keyword-detector)
  if [ "${DO_REGRESSION_RECALL:-0}" -eq 1 ]; then
    cp "$src/install/hooks/regression-recall.mjs" \
      "$HOME/.claude/skills/.kzk-harness-shared/hooks/"
  fi

  local settings="$HOME/.claude/settings.json"
  if [ ! -f "$settings" ]; then
    printf '{}' >"$settings"
  fi

  if command -v jq >/dev/null 2>&1; then
    local tmp
    tmp=$(mktemp)
    jq --arg cmd "node $HOME/.claude/skills/.kzk-harness-shared/hooks/keyword-detector.mjs" '
      .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
    ' "$settings" >"$tmp" && mv "$tmp" "$settings"
    emit "  hooks: keyword-detector.mjs registered in ~/.claude/settings.json"
    record "hooks: UserPromptSubmit hook registered (--enable-hooks)"

    # Plan D: append regression-recall.mjs to UserPromptSubmit array (same matcher)
    if [ "${DO_REGRESSION_RECALL:-0}" -eq 1 ]; then
      tmp=$(mktemp)
      jq --arg cmd "node $HOME/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs" '
        .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
      ' "$settings" >"$tmp" && mv "$tmp" "$settings"
      emit "  hooks: regression-recall.mjs registered (--regression-recall)"
      record "hooks: regression-recall hook registered (--regression-recall, depends on --enable-hooks)"
    fi
  else
    emit "  hooks: jq not found — cannot update settings.json. Install jq and re-run with --enable-hooks." >&2
    record "hooks: SKIPPED (jq not found)"
  fi
}
```

**변경 3 — `--regression-recall` 가 `--enable-hooks` 자동 enable**: `parse_flags()` 끝 또는 `main()` 진입부에:

```bash
# Plan D: --regression-recall 는 --enable-hooks 의 dependency
if [ "${DO_REGRESSION_RECALL:-0}" -eq 1 ] && [ "${DO_ENABLE_HOOKS:-0}" -eq 0 ]; then
  emit "  --regression-recall implies --enable-hooks (explicit dependency)"
  DO_ENABLE_HOOKS=1
fi
```

### Task 7 — `install/dependencies.sh` gstack auto-install (~30 LoC 추가)

**File**: `$DEPS`

기존 sections 사이 (예: `# 2. codex CLI` 다음, `# 3. gh CLI` 직전) 에 신규 section 삽입:

```bash
# ---------------------------------------------------------------------------
# 2.5. gstack CLI — used by kzk-regression-memory (Plan D)
# ---------------------------------------------------------------------------
if command -v gstack >/dev/null 2>&1; then
  record "gstack CLI: already installed ($(gstack --version 2>/dev/null || echo 'version unknown'))"
else
  emit "[2.5] gstack CLI not found — attempting install..."
  installed=0

  if command -v npm >/dev/null 2>&1; then
    if npm install -g gstack 2>/tmp/kzk-gstack-npm.log; then
      installed=1
      record "gstack CLI: installed via 'npm install -g gstack'"
    fi
  fi

  if [ "$installed" -eq 0 ] && command -v brew >/dev/null 2>&1; then
    if brew install gstack 2>/tmp/kzk-gstack-brew.log; then
      installed=1
      record "gstack CLI: installed via 'brew install gstack'"
    fi
  fi

  if [ "$installed" -eq 0 ]; then
    # Silent skip 금지 — stderr WARN 의무 (spec rev6 §Cycle 회고 5W1H 실패시)
    printf 'WARN: gstack CLI install failed — kzk-regression-memory recall will be limited to sidecar only. Manual install: npm i -g gstack OR brew install gstack.\n' >&2
    record "gstack CLI: NOT INSTALLED (npm & brew both failed). kzk-regression-memory will run in sidecar-only mode. cycle commits will WARN until installed."
  fi
fi
```

**핵심 룰**: 미설치 시 `record` 의 message 가 SUMMARY 에 들어감 (run summary 출력 시 사용자 보임). silent skip 금지 — 본 plan spec rev6 §Cycle 회고 5W1H 실패시 룰 따름.

**actual gstack package name 검증**: Plan D Step 0 에서 `npm info gstack` 또는 `brew info gstack` 으로 실제 package 이름 확인. 위 코드의 `gstack` literal 은 가정 — 실 package 가 `@gstack/cli` 등이면 수정.

### Task 8 — `install/test/run-tests.sh` 갱신 (~10 LoC)

**File**: `$TEST_RUN`

기존 `# Run all tests` 섹션 (line 600-642) 의 test 함수 호출 list 에 추가, 그리고 신규 함수 정의 추가:

**신규 함수 정의** (line 599 부근, `# Run all tests` 직전):

```bash
# ---------------------------------------------------------------------------
# Plan D — regression-recall.test.mjs
# ---------------------------------------------------------------------------
test_regression_recall() {
  printf '\n[test_regression_recall]\n'
  if node "$REPO_ROOT/install/test/regression-recall.test.mjs"; then
    printf '  PASS: regression-recall.test.mjs\n'
    PASS=$((PASS + 1))
  else
    printf '  FAIL: regression-recall.test.mjs\n'
    FAIL=$((FAIL + 1))
    ERRORS+=("test_regression_recall")
  fi
}
```

**호출 추가** (line 626 `test_keyword_detector_matches_test_add` 다음):

```bash
test_regression_recall
```

### Task 9 — `kzk-pre-merge-sync/SKILL.md` 마지막 step 추가 (~30 LoC)

**File**: `$SKILL_PMS`

기존 §`## 2. /oh-my-claudecode:deepinit (mandatory)` 다음 (line 49 직후), `## Combined PR description footer` 직전에 신규 section 추가:

```markdown
## 3. Regression-recall hook auto-enable (Plan D)

4 plan (A→D→B→C→E) 모두 끝나고 `feature/memory` → `main` 머지 직전, regression-recall hook 의 default DISABLED 를 ENABLED 로 전환:

```bash
bash install/install-global.sh --enable-hooks --regression-recall
```

`--regression-recall` 는 explicit dependency 로 `--enable-hooks` (keyword-detector) 도 자동 enable.

**사용자 confirm 게이트 의무** — 자동 호출 전 user 명시 confirm 받음. 거부 시 manual enable path 안내:
- 거부 → 후속 enable 은 사용자가 직접 위 command 실행
- ACK → install-global.sh 자동 호출, 결과 stdout 로 사용자에게 보고

**왜**: Plan D commit 시점에는 default DISABLED — 다음 cycle 의 자가오염 차단. 4 plan 끝나고 머지 단계가 first-enable 의 자연 게이트 (망각 차단).

Skip = block merge. 단, 사용자가 명시적으로 "regression-recall 비활성 유지" 선언한 경우만 skip 허용 (PR description 또는 milestone commit message 에 명시).

Checkpoint: PR description (PR-flow) 또는 milestone commit message (direct-main flow) 에 다음 줄 의무:
- ENABLED: `regression-recall hook enabled via kzk-pre-merge-sync step 3`
- 사용자 명시 거부: `regression-recall hook left disabled by user request`
```

**§`## Combined PR description footer` 갱신** — 체크리스트에 1줄 추가:

```
- [ ] regression-recall hook enabled via step 3 (or user-declined per spec rev6 §Default DISABLED)
```

**§`## Interaction with other kzk-*` 갱신** — 끝에 추가:

```
- **kzk-regression-memory**: 본 skill step 3 가 regression-recall hook 의 first-enable gate. spec rev6 §Default DISABLED 의 자동 enable 진입점.
```

### Task 10 — `kzk-web-loop/SKILL.md` cycle 회고 hook (~20 LoC)

**File**: `$SKILL_WL`

§`## Loop Structure` 의 Step 5 (line 70-72) 직후, Step 6 직전에 신규 step 5.5 추가:

```markdown
**5.5. Cycle 회고 → gstack learn add** (Plan D)

cycle commit 직후, harness-flow-progress 갱신 다음 step 으로 회고 entry 자동 작성:

```bash
gstack learn add \
  --key "cycle-N-<axis>" \
  --type pattern \
  --insight "<evaluator paragraph 한 줄 요약>" \
  --confidence <verifier 결과 0-10> \
  --source retro
```

동시에 sidecar (`.kzk-harness/regression-meta.jsonl`) 에 append:
```jsonl
{"key":"cycle-N-<axis>","file_snapshot":"<path>:<line>@<sha>","related_cycles":[N],"dismiss_count":0,"last_dismissed_at":null,"archived":false}
```

**gstack 미설치 시**: stderr WARN 출력 + `harness-flow-progress.md` cycle entry 본문에 `regression memory 비활성 (gstack 미설치)` 의무 표기. cycle 진행 자체는 계속 (회고 entry 만 누락).

**참조**: `kzk-regression-memory` §Cycle 회고 통합 5W1H — Where 행이 본 step.
```

§`## Interaction with other kzk-*` 갱신 — 끝에 추가:

```
- **kzk-regression-memory**: cycle 끝 step 5.5 에서 `gstack learn add` 호출 + sidecar append. 회고 entry 자동 작성.
```

### Task 11 — `kzk-large-task-delegation/SKILL.md` recall inject 룰 (~15 LoC)

**File**: `$SKILL_LTD`

§`## Subagent prompt requirements` (또는 `## Subagent dispatch requirements` — file 의 실제 헤더 확인) 의 Rules block 항목에 추가:

```
- **Recall 결과 inject** (Plan D): subagent dispatch prompt 의 Rules block 에 메인이 받은 [REGRESSION RECALL] system-reminder 가 있으면, 해당 텍스트를 verbatim 으로 dispatch prompt 에 inject. subagent 가 fix 작업 시 recall 결과 read. 매칭 정확성은 subagent 가 검토.
```

§`## Interaction with other kzk-*` 갱신 — 끝에 추가 (이미 있으면 갱신):

```
- **kzk-regression-memory**: 메인이 받은 [REGRESSION RECALL] reminder 를 subagent dispatch prompt 에 inject. fix subagent 도 recall 결과 read.
```

### Task 12 — `harness-share.md` §28 신규 (~80 LoC)

**File**: `$SHARE`

기존 마지막 section (`## 27. kzk-tool-retry`) 끝 직후, 파일 끝에 신규 section 추가:

```markdown
---

## 28. Regression Memory Protocol (kzk-regression-memory, Plan D)

자율실행 cycle 의 regression 망각 차단. fix-start 시점 prompt 매칭 → 자동 recall.

### Storage 모델

- **Backend**: gstack `/learn` JSONL (project-scoped). 5필드: `key`, `type`, `insight`, `confidence`, `source`
- **Sidecar**: `.kzk-harness/regression-meta.jsonl`. 6필드: `key`, `file_snapshot`, `related_cycles`, `dismiss_count`, `last_dismissed_at`, `archived`
- Sidecar = metadata extension with **own SoT for dismiss state** (derived view 아님 — dismiss_count 가 사용자 액션 source)
- FK: sidecar `key` 는 `/learn` 에 반드시 존재. 부재 시 orphan cleanup

### Recall 룰

- Trigger: `UserPromptSubmit` hook (`install/hooks/regression-recall.mjs`)
- Decay: `confidence_decayed = confidence * (0.85 ** dismiss_count)`
- Filter: `archived: true` OR `confidence_decayed < 4` → 제외
- Orphan cleanup: sidecar key 가 /learn 에 부재 → 자동 삭제 + stderr 로그
- Output: system-reminder inject (`🚨 [REGRESSION RECALL]`)

### 자가-skip guard

자가개선 cycle 메인 prompt 자가오염 차단:
- 환경변수 `KZK_HARNESS_SELF_IMPROVEMENT=1`
- self-improvement marker grep: `harness 개선 루프`, `자가개선`, `메타 cycle` 등

### Stale check

`install/scripts/regression-stale-check.sh`:
- cron 또는 cycle-end 단발
- file_snapshot SHA vs HEAD 비교
- sidecar 의 cached stale flag update
- recall hook 은 cached flag read (라이브 git blame X)

### Cycle 회고 5W1H (kzk-web-loop step 5.5 진입)

| W | Detail |
|---|---|
| Who | cycle entry 작성 주체 (메인 또는 evaluator subagent) |
| When | cycle commit 직후, harness-flow-progress 갱신 다음 |
| What | 1 entry/cycle. key=`cycle-<N>-<axis>`, type=`pattern`, source=`retro` |
| How | `gstack learn add ...` + sidecar append |
| 실패시 | gstack 미설치 → stderr WARN + cycle entry 본문 표기 의무. silent skip 금지 |
| Where | kzk-web-loop cycle 끝 evaluator paragraph |

### Default DISABLED at D commit, 자동 enable on main 머지

- D plan commit 시점: hook 파일 추가 but settings.json 등록 X
- 4 plan 끝나고 `kzk-pre-merge-sync` step 3 가 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트)
- `--regression-recall` 는 keyword-detector 도 explicit dependency 로 자동 enable

### Rollback (6 level)

| Level | 메커니즘 |
|---|---|
| 단일 plan revert | `git revert <Plan-D-sha>` |
| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=regression-recall` |
| Skill 즉시 비활성 | `DISABLE_OMC=kzk-regression-memory` |
| settings.json 수동 | hook entry 수동 제거 |
| Sidecar 손실 | dismiss_count reset 만 — /learn 보존 |
| Plan D 자가오염 | default DISABLED 라 즉시 위협 X. enable 후 발견 시 OMC_SKIP_HOOKS |
```

### Task 13 — Skill count 동기화 14→15 (~6 LoC 변경)

**Files**: `$CLAUDE_MD`, `$README`

**`$CLAUDE_MD` line 3** — 14→15:
- 기존: `This is the kzk-harness repository — a workflow skill layer for Claude Code. It contains 14 \`kzk-*\` skills ...`
- 변경: `... It contains 15 \`kzk-*\` skills ...`

**`$CLAUDE_MD` "All N skills" line** — 검색 후 14→15.

**`$CLAUDE_MD` skills table** — `| kzk-regression-memory | regression memory, 재발 방지, fix 시작, recall, 과거 fix 조회, gstack learn |` row 추가.

**`$README` line 3** — 14→15.

**`$README` install command 의 skill count** — `--n 14` 또는 유사 표기 검색 후 15 로 변경.

**`install/install-global.sh` line 602-609** — 14→15:
```bash
if [ "${row_count:-0}" -ne 15 ]; then
  emit "VERIFY FAIL: expected 15 '| kzk-' rows in marker block, found ${row_count:-0}" >&2
```

**`install/test/run-tests.sh`** — 기존 `assert_eq "14 SKILL.md files landed" "14"` 을 `"15"` 로, `"14 kzk- rows in marker block" "14"` 을 `"15"` 로.

**Plan B 가 16→ 추가로 늘림 — Plan D 책임 아님. Plan B 가 별도 동기화.**

### Task 14 — Pre-commit Gate + atomic commit

`kzk-pre-commit-gate` 통과 (Gate 0–4):
- Gate 0: AGENTS.md sync — 신규 skill 1개 (`kzk-regression-memory`) 추가 → AGENTS.md skill list 갱신 확인
- Gate 1: ai-slop scan
- Gate 1.5: secrets scan (sidecar fixture / hook 코드)
- Gate 2: build (n/a — markdown/shell/node only)
- Gate 3: test — `bash install/test/run-tests.sh` PASS (regression-recall.test.mjs 포함)
- Gate 4: Playwright (n/a — non-UI)

commit message:
```
feat(skill): kzk-regression-memory v1.0 + recall hook (Plan D)

신규 skill (15→ skills): regression memory + auto-recall.
Backend = gstack /learn + sidecar (.kzk-harness/regression-meta.jsonl).
Hook default DISABLED at commit — kzk-pre-merge-sync step 3 auto-enables.

Files:
- skills/kzk-regression-memory/SKILL.md (신규)
- install/hooks/regression-recall.mjs (신규, default DISABLED)
- install/scripts/regression-stale-check.sh (신규)
- install/test/regression-recall.test.mjs + fixtures/ (신규)
- install/install-global.sh: --regression-recall flag + keyword-detector dependency
- install/dependencies.sh: gstack auto-install (npm-first → brew-fallback)
- skills/kzk-pre-merge-sync: step 3 auto-enable hook on main 머지
- skills/kzk-web-loop: cycle 회고 → gstack learn add (step 5.5)
- skills/kzk-large-task-delegation: subagent dispatch recall inject 룰
- harness-share.md §28 신규
- CLAUDE.md / README.md skill count 14→15

Spec: docs/plans/regression-memory-and-fix-quality-spec.md (rev6).
Plan: docs/plans/plan-D-regression-memory.md (frozen).
```


exec
/bin/zsh -lc "sed -n '956,1010p' docs/plans/plan-D-regression-memory.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
## Test 전략 (한계 명시)

| Component | Test | 한계 |
|---|---|---|
| `regression-recall.mjs` exports (shouldSkip / detectFixIntent / decay / orphanCleanup / buildReminder) | `regression-recall.test.mjs` unit | 함수 단위 검증만. settings.json 통합은 manual |
| sidecar fixture schema | `regression-recall.test.mjs` schema parse | jsonl parse + 필수 6필드 존재 확인. behavioral 통합은 manual cycle |
| gstack /learn fixture | `gstack-learnings.sample.jsonl` Plan D Step 0 캡처 | 실제 backend 형식 single source. fixture 미갱신 = drift |
| `install-global.sh --regression-recall` flag | (별도 test 없음 — 본 plan 책임 X) | settings.json 수정은 manual cycle 확인 |
| `regression-stale-check.sh` | (본 plan 책임 X — 통합 cycle test 의존) | sidecar의 stale flag update behavioral 검증 manual |
| Cycle 회고 통합 | (manual cycle 검증) | cycle 끝 step 5.5 의 실제 gstack 호출 + sidecar append behavioral test 부재 |

**Mock fixture 갱신 의무**: Plan D 의 `regression-recall.mjs` 또는 storage schema 변경 시 fixture 재캡처. gstack actual schema drift 시 plan body 자체 수정.

**Behavioral test 부재**: spec rev6 §Test 전략 한계 명시. 본 plan 의 unit test 는 룰 *기록* 검증 중심. 자율 cycle 에서 hook 이 실제 prompt 매칭 시 expected reminder 출력하는지는 manual cycle 검증 의존.

## Rollback (6 level — spec rev6)

| Level | 메커니즘 |
|---|---|
| 단일 plan revert | `git revert <Plan-D-commit-sha>` |
| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=regression-recall` |
| Skill 즉시 비활성 | `DISABLE_OMC=kzk-regression-memory` |
| Cycle 자가-회복 불가 | settings.json hook entry 수동 제거 |
| Sidecar 손실 | dismiss_count reset 만 — /learn 데이터 보존 |
| Plan D 자가오염 | hook default DISABLED 라 즉시 위협 X. enable 후 발견 시 `OMC_SKIP_HOOKS=regression-recall` 즉시 비활성. 영구 차단 시 `git revert` |

## Out of scope (다음 Plan 으로 위임)

- **Plan B**: `kzk-fix-scope-expansion` 신규 skill (D recall consumer + Gate 4.5). skill count 15→16
- **Plan C**: `kzk-large-task-delegation` Stage 3 + Pre-commit Gate 5 (verifier 분기)
- **Plan E**: `kzk-production-access` 강화 (code-first + 멱등성)
- Behavioral test (sonnet dispatch 시뮬레이션 / hook 실 settings.json 통합 / cycle 끝 gstack add 통합) — spec rev6 Non-goals
- LLM 기반 cycle 회고 자동 요약 — spec rev6 Non-goals (Plan D fast-follow)
- Cross-project regression memory — spec rev6 Non-goals
- vector DB / basic-memory 도입 — spec rev6 Non-goals (6개월 유예)

## Codex review 의무

본 plan draft 는 frozen 전 codex CLI consult (stdin path) → critic opus fallback. spec rev6 §메타 룰:

```bash
printf '%s' "$prompt" | codex exec - -s read-only -c '...' --json | jq ...
```

2회 실패 → critic opus fallback. 4 plan 중 최소 2개 codex CLI 성공 목표.

Plan D 는 가장 큰 plan (~570 LoC) — codex 는 spec rev6 + Plan A frozen + Plan D draft 셋 다 read 후 review. 결과 후 frozen 표기.

## 메타 룰 (spec rev6 인용)

- Plan commit = atomic. 메시지 prefix `feat(skill):`
- Cycle 끝: harness-flow-progress.md entry + (Plan D 이후) gstack `learn add` 호출
- 4 plan 모두 완료 후 (`feature/memory` → `main` 머지 직전): `kzk-pre-merge-sync` (CLAUDE.md sync, deepinit, **step 3 hook auto-enable**) → `git merge --no-ff`
- 본 plan 의 codex CLI 시도 → critic opus fallback. 결과 후 frozen 표기.
- 메인이 cycle 진입 시 user-queue (`docs/harness/user-queue.md`) 에 진행 entry append

codex
핵심 구현 섹션은 다 읽었습니다. 이제 spec의 Skill count/Test/Rollback/Plan split 문구와 Plan D가 정확히 맞는지 대조하겠습니다.
exec
/bin/zsh -lc "sed -n '208,241p' docs/plans/regression-memory-and-fix-quality-spec.md" in /Users/kimzerokim/work/personal/kzk-harness
exec
/bin/zsh -lc "sed -n '184,241p' docs/plans/regression-memory-and-fix-quality-spec.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
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
| Cycle 자가-회복 불가 시 | settings.json hook entry 수동 제거 |
| Sidecar 손실 | dismiss_count reset 만 — `/learn` 데이터 보존 |
| Plan D 자가오염 시 | hook default DISABLED 라 즉시 위협 없음. enable 후 발견 시 OMC_SKIP_HOOKS 로 비활성 |

## 메타 룰

- 각 plan commit = atomic. 메시지 prefix `feat(skill):` / `feat(harness):` / `feat(install):`
- Cycle 끝: harness-flow-progress.md entry + (Plan D 이후) gstack `learn add` 호출
- 4 plan 모두 완료 후: `kzk-pre-merge-sync` (CLAUDE.md sync, deepinit) → `git checkout main && git merge feature/memory --no-ff`
- 각 plan 별 codex review 의무. **codex CLI stdin path 재시도** (cycle 1 #12.3): `printf '%s' "$prompt" | codex exec - -s read-only -c '...' --json | jq ...`. 2회 실패 → critic opus fallback. 4 plan 중 최소 2개 codex CLI 성공 목표.
- 메인이 cycle 진입 시 user-queue (`docs/harness/user-queue.md`) 에 진행 entry append. 모호한 결정은 tentative default + queue 표시.


 succeeded in 0ms:
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
| Cycle 자가-회복 불가 시 | settings.json hook entry 수동 제거 |
| Sidecar 손실 | dismiss_count reset 만 — `/learn` 데이터 보존 |
| Plan D 자가오염 시 | hook default DISABLED 라 즉시 위협 없음. enable 후 발견 시 OMC_SKIP_HOOKS 로 비활성 |

## 메타 룰

- 각 plan commit = atomic. 메시지 prefix `feat(skill):` / `feat(harness):` / `feat(install):`
- Cycle 끝: harness-flow-progress.md entry + (Plan D 이후) gstack `learn add` 호출
- 4 plan 모두 완료 후: `kzk-pre-merge-sync` (CLAUDE.md sync, deepinit) → `git checkout main && git merge feature/memory --no-ff`
- 각 plan 별 codex review 의무. **codex CLI stdin path 재시도** (cycle 1 #12.3): `printf '%s' "$prompt" | codex exec - -s read-only -c '...' --json | jq ...`. 2회 실패 → critic opus fallback. 4 plan 중 최소 2개 codex CLI 성공 목표.
- 메인이 cycle 진입 시 user-queue (`docs/harness/user-queue.md`) 에 진행 entry append. 모호한 결정은 tentative default + queue 표시.


exec
/bin/zsh -lc 'rg -n "AGENTS|skill count|15|16|regression-recall|stale|dismiss|orphan|KZK_AUTONOMOUS|KZK_HARNESS_SELF_IMPROVEMENT|UserPromptSubmit|sidecar-only|silent skip|confirm|keyword-detector|atomic|rename|lock|flock|mktemp|writeFileSync|settings.json" docs/plans/regression-memory-and-fix-quality-spec.md docs/plans/plan-D-regression-memory.md' in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
docs/plans/regression-memory-and-fix-quality-spec.md:9:> rev5 = cycle 4 의 3 MAJOR (pre-merge-sync 의무, 자율 키워드 좁힘, orphan cleanup) lock.
docs/plans/regression-memory-and-fix-quality-spec.md:25:| Regression backend = gstack `/learn` 기본 schema **+ sidecar** `.kzk-harness/regression-meta.jsonl` (metadata extension with own SoT for dismiss state — derived view 아님) | hypothesis H1, cycle 3 #1 — sidecar 의 dismiss_count 는 사용자 액션 source, /learn 에서 재구성 불가. sidecar 도 git tracked. |
docs/plans/regression-memory-and-fix-quality-spec.md:27:| sidecar 만 사용하는 필드: `key` (FK), `dismiss_count`, `last_dismissed_at`, `file_snapshot` (file:line@SHA), `related_cycles` | cycle 1 blind spots, cycle 2 #5 |
docs/plans/regression-memory-and-fix-quality-spec.md:28:| Recall 룰 = `/learn search` keyword + sidecar dismiss_count + decay (`confidence * 0.85^dismiss`) | cycle 1 §H3 + cycle 2 #5 |
docs/plans/regression-memory-and-fix-quality-spec.md:29:| dismiss_count ≥ 3 → archived (recall 결과 제외) | cycle 1 §H3 |
docs/plans/regression-memory-and-fix-quality-spec.md:30:| Hook deployment = `install-global.sh enable_hooks()` 의 같은 settings.json `UserPromptSubmit` 배열에 append (dispatcher 통합 비추). **`--regression-recall` flag 호출 시 keyword-detector 도 자동 enable (explicit dependency)** | cycle 2 #4 + cycle 3 #4 — keyword-detector 누락 silent breakage 차단 |
docs/plans/regression-memory-and-fix-quality-spec.md:31:| Plan D hook = **default DISABLED at D commit**, **자동 enable on main 머지** (`kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 호출) | cycle 2 #1 + cycle 3 #2 — B cycle 자가오염 차단 + first-enable 망각 방지. 사용자가 머지 단계 거치면 자동 활성. |
docs/plans/regression-memory-and-fix-quality-spec.md:39:| gstack auto-install = dependencies.sh 기존 분기 패턴 (npm-first → brew-fallback) 따름. **미설치 환경 → cycle commit 시 stderr WARN + harness-flow-progress entry 에 "gstack 미설치, regression memory 비활성" 의무 표기**. silent skip 금지 | cycle 2 #12.1 + cycle 3 #5 — 침묵 실패 = 메타갭 자체 |
docs/plans/regression-memory-and-fix-quality-spec.md:67:- hook/install 인프라 코드 (예: regression-recall.mjs) read 는 항상 허용 (TDD red 가 아닌 디버깅 목적)
docs/plans/regression-memory-and-fix-quality-spec.md:77:- 자율 mode 인지 판별 우선순위: (1) 환경변수 `KZK_AUTONOMOUS=1` 우선 (가장 신뢰), (2) 환경변수 미설정 시 보조 키워드 — **동사구로 좁힘**: "ralph 로 돌려", "web-loop 진입", "autonomous-loop 시작", "harness 개선 루프 시작", "자가개선 cycle 진입", "끝까지 끝내줘". 명사 단독 ("자가개선" 만) 매칭 금지 — 일반 prompt false positive 차단
docs/plans/regression-memory-and-fix-quality-spec.md:82:신규 skill `kzk-regression-memory` + `install/hooks/regression-recall.mjs` + `install/scripts/regression-stale-check.sh`.
docs/plans/regression-memory-and-fix-quality-spec.md:98:  dismiss_count: 0
docs/plans/regression-memory-and-fix-quality-spec.md:99:  last_dismissed_at: null | <ISO>
docs/plans/regression-memory-and-fix-quality-spec.md:103:**Sidecar = metadata extension with own SoT for dismiss state** — `/learn` 는 fix knowledge 의 source of truth. Sidecar 는 dismiss/cycle binding metadata 의 own SoT (derived view 아님 — dismiss_count 가 사용자 액션 source 라 /learn 에서 재구성 불가). Sidecar 도 git tracked. 손실 시 dismiss/decay 만 reset, /learn 데이터는 보존. cycle 1 §H2 위험: dual-write 가 아닌 *split SoT* 패턴 — `/learn` key 가 FK 라 sync 1 방향 (sidecar 는 /learn 에 없는 key 가지면 invalid).
docs/plans/regression-memory-and-fix-quality-spec.md:105:**Orphan cleanup 룰**: recall hook 발동 시 sidecar entry 의 key 가 `/learn` 에 부재이면 sidecar 그 entry 삭제 (자동, 사용자 silent loss 방지 위해 deletion 로그 stderr 출력). 추가로 `regression-stale-check.sh` 가 cron/cycle-end 실행 시 동일 검사. 자동 GC 만 — 수동 path 없음 (영구 누수 차단).
docs/plans/regression-memory-and-fix-quality-spec.md:107:**Recall hook** (`install/hooks/regression-recall.mjs`):
docs/plans/regression-memory-and-fix-quality-spec.md:108:- Trigger: UserPromptSubmit. (PostToolUse 미사용 — install-global.sh 가 미지원 + cycle 2 #3)
docs/plans/regression-memory-and-fix-quality-spec.md:111:- sidecar JSONL grep → dismiss_count/archived 적용
docs/plans/regression-memory-and-fix-quality-spec.md:112:- decay: `confidence_decayed = confidence * (0.85 ** dismiss_count)`. archived 또는 confidence_decayed < 4 → 결과 제외
docs/plans/regression-memory-and-fix-quality-spec.md:116:  - <key>: <insight> (cycle <N>, confidence_decayed <X>) [⚠ stale if SHA mismatch]
docs/plans/regression-memory-and-fix-quality-spec.md:117:  ⚠ 자동 적용 금지. 매칭 정확성 검토 후 채택. dismiss: kzk-regression-memory dismiss <key>
docs/plans/regression-memory-and-fix-quality-spec.md:123:- 추가: 환경변수 `KZK_HARNESS_SELF_IMPROVEMENT=1` 시 inject skip
docs/plans/regression-memory-and-fix-quality-spec.md:126:- D plan commit 시점에 hook 파일은 추가하지만 settings.json 등록 안 함
docs/plans/regression-memory-and-fix-quality-spec.md:127:- 4 plan 모두 끝나고 `kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 받은 후)
docs/plans/regression-memory-and-fix-quality-spec.md:128:- `--regression-recall` 호출 시 keyword-detector 도 dependency 자동 enable
docs/plans/regression-memory-and-fix-quality-spec.md:132:- `install/scripts/regression-stale-check.sh` (신규 install/scripts/ 디렉토리)
docs/plans/regression-memory-and-fix-quality-spec.md:134:- hook path 에서는 sidecar 의 캐시된 stale flag 만 read. 라이브 git blame 안 함
docs/plans/regression-memory-and-fix-quality-spec.md:145:| 실패시 | gstack 미설치 → cycle commit 시 stderr WARN 출력 + cycle entry 본문에 "regression memory 비활성 (gstack 미설치)" 의무 표기. silent skip 금지. cycle 진행 자체는 계속 (회고 entry 만 누락). |
docs/plans/regression-memory-and-fix-quality-spec.md:153:- fix-start hook 이 D 의 regression-recall 결과 inject 다음에 발동 (consumer)
docs/plans/regression-memory-and-fix-quality-spec.md:188:| **A** | `docs/plans/plan-A-tdd-self-verification-block.md` | `kzk-test-coverage` v1.3 — Layer (a) dispatch prompt + Layer (b) 메인 self-check | ~60 | 독립 |
docs/plans/regression-memory-and-fix-quality-spec.md:189:| **D** | `docs/plans/plan-D-regression-memory.md` | 신규 `kzk-regression-memory` + recall hook (default DISABLED) + sidecar + stale check + cycle 회고 통합 + gstack auto-install + **`kzk-pre-merge-sync/SKILL.md` 마지막 step `--regression-recall` 자동 호출 추가** | ~570 | A 후 |
docs/plans/regression-memory-and-fix-quality-spec.md:192:| **E** | `docs/plans/plan-E-production-code-first.md` | `kzk-production-access` 강화 — code-first 룰 + 멱등성 의무 + 직접 호출 금지 boilerplate. CLAUDE.md 의 production access 섹션 업데이트. | ~150 | A/B/C/D 후 (마지막) |
docs/plans/regression-memory-and-fix-quality-spec.md:198:## Skill count 동기화 (14→16)
docs/plans/regression-memory-and-fix-quality-spec.md:204:4. `README.md` install command 의 skill count
docs/plans/regression-memory-and-fix-quality-spec.md:215:| D | `install/test/regression-recall.test.mjs` — mock /learn JSONL fixture + sidecar fixture → recall hook 매칭 + decay + dismiss 시뮬 | 진짜 mock 동작 test (코드 단위) |
docs/plans/regression-memory-and-fix-quality-spec.md:228:| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=regression-recall` |
docs/plans/regression-memory-and-fix-quality-spec.md:230:| Cycle 자가-회복 불가 시 | settings.json hook entry 수동 제거 |
docs/plans/regression-memory-and-fix-quality-spec.md:231:| Sidecar 손실 | dismiss_count reset 만 — `/learn` 데이터 보존 |
docs/plans/regression-memory-and-fix-quality-spec.md:236:- 각 plan commit = atomic. 메시지 prefix `feat(skill):` / `feat(harness):` / `feat(install):`
docs/plans/regression-memory-and-fix-quality-spec.md:250:| 5 (Axis D dismiss/decay) | §Storage 모델 sidecar + Recall 룰 |
docs/plans/regression-memory-and-fix-quality-spec.md:277:| #4 MAJOR (Hook append dependency) | Locked — `--regression-recall` 시 keyword-detector 자동 enable |
docs/plans/regression-memory-and-fix-quality-spec.md:278:| #5 MAJOR (gstack silent skip 메타갭) | Locked + §Cycle 회고 5W1H 실패시 — stderr WARN + 표기 의무 |
docs/plans/regression-memory-and-fix-quality-spec.md:286:| #3 MAJOR (orphan cleanup) | §Storage 모델 sidecar — recall hook + stale-check 자동 GC 명시 |
docs/plans/plan-D-regression-memory.md:9:신규 skill `kzk-regression-memory` + recall hook 인프라 구축. AI 자율실행 cycle 이 과거 fix 기록을 fix 시작 시점에 자동 조회 (recall), regression 망각 차단. 본 plan 의 hook 은 **commit 시점에 default DISABLED** — keyword-detector 와의 dependency 충돌 + B/C cycle 자가오염 차단. 4 plan 모두 끝나고 main 머지 시점에 `kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 후) 되어 활성.
docs/plans/plan-D-regression-memory.md:12:- Backend = gstack `/learn` (5필드 표준 schema) + sidecar `.kzk-harness/regression-meta.jsonl` (own SoT for dismiss state)
docs/plans/plan-D-regression-memory.md:13:- Recall = UserPromptSubmit hook → `/learn` keyword search + sidecar dismiss/decay → system-reminder inject
docs/plans/plan-D-regression-memory.md:15:- Stale check = `regression-stale-check.sh` cron/cycle-end 단발
docs/plans/plan-D-regression-memory.md:20:2. `install/hooks/regression-recall.mjs` 신규 — UserPromptSubmit hook, 자가-skip guard 구현, /learn search + sidecar JSONL grep + decay + archived 필터링, system-reminder inject. **default DISABLED** (settings.json 등록 안 함)
docs/plans/plan-D-regression-memory.md:21:3. `install/scripts/regression-stale-check.sh` 신규 — sidecar 의 file_snapshot SHA vs HEAD 비교, archived 자동 X, 결과 stderr/stdout 출력
docs/plans/plan-D-regression-memory.md:22:4. `install/test/regression-recall.test.mjs` 신규 — mock fixture 기반 test (recall 매칭 + decay + dismiss + 자가-skip + orphan cleanup 시뮬)
docs/plans/plan-D-regression-memory.md:24:6. `install/test/fixtures/regression-meta.sample.jsonl` 신규 — sidecar fixture (key/file_snapshot/related_cycles/dismiss_count/last_dismissed_at/archived 6필드)
docs/plans/plan-D-regression-memory.md:25:7. `install/install-global.sh` `enable_hooks()` 확장 — `--regression-recall` flag 추가, regression-recall.mjs 등록 + keyword-detector 자동 enable (explicit dependency)
docs/plans/plan-D-regression-memory.md:26:8. `install/dependencies.sh` 갱신 — gstack auto-install entry 추가 (npm-first → brew-fallback). 미설치 시 stderr WARN + SUMMARY 의무 표기 (silent skip 금지)
docs/plans/plan-D-regression-memory.md:27:9. `install/test/run-tests.sh` 갱신 — `regression-recall.test.mjs` 호출 등록
docs/plans/plan-D-regression-memory.md:28:10. `skills/kzk-pre-merge-sync/SKILL.md` 갱신 — 마지막 step `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트)
docs/plans/plan-D-regression-memory.md:32:14. `CLAUDE.md` line 3 + "All N skills" line + `README.md` line 3 + install command skill count — 14→15 (Plan D 신규 skill 1개)
docs/plans/plan-D-regression-memory.md:33:15. `bash install/test/run-tests.sh` PASS (regression-recall.test.mjs 포함 전체 통과)
docs/plans/plan-D-regression-memory.md:41:- `HOOK_RECALL = /Users/kimzerokim/work/personal/kzk-harness/install/hooks/regression-recall.mjs`
docs/plans/plan-D-regression-memory.md:42:- `SCRIPT_STALE = /Users/kimzerokim/work/personal/kzk-harness/install/scripts/regression-stale-check.sh`
docs/plans/plan-D-regression-memory.md:43:- `TEST_RECALL = /Users/kimzerokim/work/personal/kzk-harness/install/test/regression-recall.test.mjs`
docs/plans/plan-D-regression-memory.md:61:1. `gstack --version` 또는 `gstack help` 시도. 명령 unavailable → Plan D 진행 정지, sidecar-only mode 의 fallback spec 작성으로 전환 (recall hook 은 sidecar 만 read, /learn 통합 없음 — 본 plan 의 §Out of scope 후보로 push)
docs/plans/plan-D-regression-memory.md:76:   {"key":"plan-d-step-0-test","file_snapshot":"install/hooks/regression-recall.mjs:42@abc1234","related_cycles":[31],"dismiss_count":0,"last_dismissed_at":null,"archived":false}
docs/plans/plan-D-regression-memory.md:77:   {"key":"hypothetical-stale-bug","file_snapshot":"deleted/file.ts:10@old5678","related_cycles":[28],"dismiss_count":2,"last_dismissed_at":"2026-04-15T10:00:00Z","archived":false}
docs/plans/plan-D-regression-memory.md:78:   {"key":"hypothetical-archived","file_snapshot":"src/old.ts:5@cafe9999","related_cycles":[20,22],"dismiss_count":3,"last_dismissed_at":"2026-04-20T10:00:00Z","archived":true}
docs/plans/plan-D-regression-memory.md:80:8. 실패 시 user-queue entry: `Q-PLAN-D-STEP0 — gstack 미설치 또는 시그니처 캡처 실패, sidecar-only fallback 검토 필요`
docs/plans/plan-D-regression-memory.md:109:`자가개선 cycle 회고`, `cycle retro`, `dismiss recall`.
docs/plans/plan-D-regression-memory.md:134:| `dismiss_count` | int | 누적 dismiss 횟수 |
docs/plans/plan-D-regression-memory.md:135:| `last_dismissed_at` | ISO8601 \| null | 마지막 dismiss 시각 |
docs/plans/plan-D-regression-memory.md:138:**Sidecar = metadata extension with own SoT for dismiss state** — derived view 아님. dismiss_count 가 사용자 액션 source 라 `/learn` 에서 재구성 불가. Sidecar 도 git tracked. 손실 시 dismiss/decay 만 reset, /learn 데이터는 보존.
docs/plans/plan-D-regression-memory.md:140:**FK 룰**: sidecar entry 의 `key` 는 `/learn` 에 반드시 존재. 부재 시 invalid → orphan cleanup 룰 적용.
docs/plans/plan-D-regression-memory.md:144:UserPromptSubmit hook (`install/hooks/regression-recall.mjs`) 발동 시:
docs/plans/plan-D-regression-memory.md:149:4. sidecar JSONL grep — 각 hit 의 dismiss_count, archived, last_dismissed_at 조회
docs/plans/plan-D-regression-memory.md:150:5. **Decay 공식**: `confidence_decayed = confidence * (0.85 ** dismiss_count)`. floating point.
docs/plans/plan-D-regression-memory.md:154:7. **Orphan cleanup**: sidecar entry 의 key 가 /learn 에 부재 → sidecar 그 entry 자동 삭제 + stderr 로그 (`[regression-recall] orphan key removed: <key>`)
docs/plans/plan-D-regression-memory.md:158:   - <key>: <insight> (cycle <N>, confidence_decayed <X.XX>) [⚠ stale if SHA mismatch]
docs/plans/plan-D-regression-memory.md:160:   dismiss: kzk-regression-memory dismiss <key>  (sidecar dismiss_count++)
docs/plans/plan-D-regression-memory.md:169:- 환경변수 `KZK_HARNESS_SELF_IMPROVEMENT=1` → 즉시 skip
docs/plans/plan-D-regression-memory.md:183:| 실패시 | gstack 미설치 → cycle commit 시 stderr WARN 출력 + cycle entry 본문에 "regression memory 비활성 (gstack 미설치)" 의무 표기. silent skip 금지. cycle 진행 자체는 계속 (회고 entry 만 누락) |
docs/plans/plan-D-regression-memory.md:188:`install/scripts/regression-stale-check.sh`:
docs/plans/plan-D-regression-memory.md:192:- 변경 감지 시: stderr 로 stale flag 출력, sidecar 의 캐시된 stale flag 만 update (라이브 git blame 안 함). archived 자동 X (사용자 결정)
docs/plans/plan-D-regression-memory.md:193:- recall hook 은 sidecar 의 cached stale flag read — hook path 에서 라이브 git blame 금지 (성능)
docs/plans/plan-D-regression-memory.md:197:**D commit 시점**: hook 파일은 추가하지만 settings.json 등록 안 함. `--regression-recall` flag 호출 안 한 상태.
docs/plans/plan-D-regression-memory.md:199:**자동 enable on main 머지**: 4 plan (A→D→B→C→E) 모두 끝나고 `kzk-pre-merge-sync` 의 마지막 step 에서 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트). `--regression-recall` 호출 시 keyword-detector 도 explicit dependency 자동 enable.
docs/plans/plan-D-regression-memory.md:201:거부 path: 사용자 confirm 거부 → manual enable 안내 (`uninstall-global.sh` 의 reverse 참고). cycle 진행 자체는 영향 X.
docs/plans/plan-D-regression-memory.md:208:| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=regression-recall` |
docs/plans/plan-D-regression-memory.md:210:| Cycle 자가-회복 불가 시 | settings.json hook entry 수동 제거 |
docs/plans/plan-D-regression-memory.md:211:| Sidecar 손실 | dismiss_count reset 만 — `/learn` 데이터 보존 |
docs/plans/plan-D-regression-memory.md:212:| Plan D 자가오염 시 | hook default DISABLED 라 즉시 위협 없음. enable 후 발견 시 `OMC_SKIP_HOOKS=regression-recall` 즉시 비활성 |
docs/plans/plan-D-regression-memory.md:216:- **kzk-pre-merge-sync**: 마지막 step 에서 `--enable-hooks --regression-recall` 자동 호출 (사용자 confirm). first-enable 망각 차단.
docs/plans/plan-D-regression-memory.md:223:### Task 2 — `install/hooks/regression-recall.mjs` 신규 (~180 LoC)
docs/plans/plan-D-regression-memory.md:227:**Pattern**: `keyword-detector.mjs` 와 동일한 stdin/stdout 모양 (UserPromptSubmit hookSpecificOutput).
docs/plans/plan-D-regression-memory.md:233:// regression-recall.mjs — UserPromptSubmit hook for kzk-regression-memory.
docs/plans/plan-D-regression-memory.md:238:import { readFileSync, writeFileSync, existsSync } from "node:fs";
docs/plans/plan-D-regression-memory.md:257:  if (env.KZK_HARNESS_SELF_IMPROVEMENT === "1") return "env:KZK_HARNESS_SELF_IMPROVEMENT";
docs/plans/plan-D-regression-memory.md:279:  // Plan D Step 0 에서 확정된 시그니처. 시그니처 미확정 시 sidecar-only fallback.
docs/plans/plan-D-regression-memory.md:293:function decay(confidence, dismissCount) {
docs/plans/plan-D-regression-memory.md:294:  return confidence * Math.pow(DECAY_BASE, dismissCount);
docs/plans/plan-D-regression-memory.md:297:function orphanCleanup(sidecar, learnKeys) {
docs/plans/plan-D-regression-memory.md:302:    writeFileSync(sidecar.path, survivors.map((e) => JSON.stringify(e)).join("\n") + "\n");
docs/plans/plan-D-regression-memory.md:303:    process.stderr.write(`[regression-recall] orphan keys removed: ${removed}\n`);
docs/plans/plan-D-regression-memory.md:311:    const stale = h.staleFlag ? " [⚠ stale if SHA mismatch]" : "";
docs/plans/plan-D-regression-memory.md:312:    return `- ${h.key}: ${h.insight} (cycle ${h.cycles.join(",")}, confidence_decayed ${h.confidenceDecayed.toFixed(2)})${stale}`;
docs/plans/plan-D-regression-memory.md:318:    `dismiss: kzk-regression-memory dismiss <key>`,
docs/plans/plan-D-regression-memory.md:322:export { shouldSkip, detectFixIntent, decay, orphanCleanup, buildReminder, FIX_KEYWORDS, SELF_IMPROVE_MARKERS };
docs/plans/plan-D-regression-memory.md:348:    const survivors = orphanCleanup(sidecar, learnKeys);
docs/plans/plan-D-regression-memory.md:356:      const dec = decay(learnEntry.confidence, meta.dismiss_count);
docs/plans/plan-D-regression-memory.md:363:        staleFlag: meta.stale ?? false,
docs/plans/plan-D-regression-memory.md:371:          hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: reminder },
docs/plans/plan-D-regression-memory.md:382:- exports 필수: `shouldSkip`, `detectFixIntent`, `decay`, `orphanCleanup`, `buildReminder` — test 가 import
docs/plans/plan-D-regression-memory.md:387:### Task 3 — `install/scripts/regression-stale-check.sh` 신규 (~80 LoC)
docs/plans/plan-D-regression-memory.md:395:# regression-stale-check.sh — Plan D 단발 stale check.
docs/plans/plan-D-regression-memory.md:398:# 변경 감지 시 sidecar 의 cached stale flag update + stderr 로그.
docs/plans/plan-D-regression-memory.md:409:  printf '[regression-stale-check] sidecar not found: %s — skipping\n' "$SIDECAR" >&2
docs/plans/plan-D-regression-memory.md:414:  printf '[regression-stale-check] jq not found — install jq to enable stale check\n' >&2
docs/plans/plan-D-regression-memory.md:419:  printf '[regression-stale-check] git not found — abort\n' >&2
docs/plans/plan-D-regression-memory.md:423:stale_count=0
docs/plans/plan-D-regression-memory.md:425:tmp_out=$(mktemp)
docs/plans/plan-D-regression-memory.md:445:    stale_count=$((stale_count + 1))
docs/plans/plan-D-regression-memory.md:446:    printf '[regression-stale-check] stale: %s (was %s, now %s)\n' "$key" "$sha" "$current_sha" >&2
docs/plans/plan-D-regression-memory.md:447:    updated=$(printf '%s' "$line" | jq --argjson stale true '. + {stale: $stale}')
docs/plans/plan-D-regression-memory.md:451:    cleared=$(printf '%s' "$line" | jq '. + {stale: false}')
docs/plans/plan-D-regression-memory.md:457:printf '[regression-stale-check] done — %d stale, %d ok\n' "$stale_count" "$ok_count" >&2
docs/plans/plan-D-regression-memory.md:463:### Task 4 — `install/test/regression-recall.test.mjs` 신규 (~150 LoC)
docs/plans/plan-D-regression-memory.md:471:// regression-recall.test.mjs — Plan D unit tests.
docs/plans/plan-D-regression-memory.md:474:// Tests: detect, decay, orphan cleanup, self-skip guard, archived/threshold filtering.
docs/plans/plan-D-regression-memory.md:476:// 한계: behavioral test (실제 settings.json 통합) 는 manual cycle 검증 의존.
docs/plans/plan-D-regression-memory.md:482:  shouldSkip, detectFixIntent, decay, orphanCleanup, buildReminder,
docs/plans/plan-D-regression-memory.md:484:} from "../hooks/regression-recall.mjs";
docs/plans/plan-D-regression-memory.md:503:assert("shouldSkip env KZK_HARNESS_SELF_IMPROVEMENT=1",
docs/plans/plan-D-regression-memory.md:504:  shouldSkip("any prompt", { KZK_HARNESS_SELF_IMPROVEMENT: "1" }) !== null);
docs/plans/plan-D-regression-memory.md:520:assert("decay confidence=10 dismiss=0 returns 10", decay(10, 0) === 10);
docs/plans/plan-D-regression-memory.md:521:assert("decay confidence=10 dismiss=1 returns 8.5", Math.abs(decay(10, 1) - 8.5) < 1e-9);
docs/plans/plan-D-regression-memory.md:522:assert("decay confidence=10 dismiss=3 < 7.3", decay(10, 3) < 7.3);
docs/plans/plan-D-regression-memory.md:530:// T7: orphan cleanup — sidecar key not in learn → removed
docs/plans/plan-D-regression-memory.md:533:    { key: "exists-in-learn", dismiss_count: 0, archived: false, related_cycles: [1] },
docs/plans/plan-D-regression-memory.md:534:    { key: "orphan-key-123", dismiss_count: 0, archived: false, related_cycles: [2] },
docs/plans/plan-D-regression-memory.md:538:// patch writeFileSync side-effect: we bypass real file write by mocking via temp path.
docs/plans/plan-D-regression-memory.md:540:const survivors = orphanCleanup(fakeSidecar, ["exists-in-learn"]);
docs/plans/plan-D-regression-memory.md:541:assert("orphan cleanup removes orphan-key-123", survivors.length === 1 && survivors[0].key === "exists-in-learn");
docs/plans/plan-D-regression-memory.md:548:  { key: "k1", insight: "ins1", cycles: [3], confidenceDecayed: 7.5, staleFlag: false },
docs/plans/plan-D-regression-memory.md:571:- settings.json 실제 등록은 `enable_hooks` test 가 별도 책임 (Task 8).
docs/plans/plan-D-regression-memory.md:583:{"key":"hypothetical-stale-bug","type":"pitfall","insight":"old fix — file deleted","confidence":7,"source":"fix"}
docs/plans/plan-D-regression-memory.md:584:{"key":"hypothetical-archived","type":"pattern","insight":"dismissed 3 times","confidence":6,"source":"review"}
docs/plans/plan-D-regression-memory.md:589:{"key":"plan-d-step-0-test","file_snapshot":"install/hooks/regression-recall.mjs:42@abc1234","related_cycles":[31],"dismiss_count":0,"last_dismissed_at":null,"archived":false}
docs/plans/plan-D-regression-memory.md:590:{"key":"hypothetical-stale-bug","file_snapshot":"deleted/file.ts:10@old5678","related_cycles":[28],"dismiss_count":2,"last_dismissed_at":"2026-04-15T10:00:00Z","archived":false}
docs/plans/plan-D-regression-memory.md:591:{"key":"hypothetical-archived","file_snapshot":"src/old.ts:5@cafe9999","related_cycles":[20,22],"dismiss_count":3,"last_dismissed_at":"2026-04-20T10:00:00Z","archived":true}
docs/plans/plan-D-regression-memory.md:600:**변경 1 — `parse_flags()` 에 `--regression-recall` 추가** (parse_flags 위치는 파일 다른 부분, executor 가 grep 찾기): 기존 `--enable-hooks` 옆에 `--regression-recall` flag 추가, default off (`DO_REGRESSION_RECALL=0`).
docs/plans/plan-D-regression-memory.md:608:  cp "$src/install/hooks/keyword-detector.mjs" \
docs/plans/plan-D-regression-memory.md:611:  # Plan D: regression-recall hook (explicit dependency on keyword-detector)
docs/plans/plan-D-regression-memory.md:613:    cp "$src/install/hooks/regression-recall.mjs" \
docs/plans/plan-D-regression-memory.md:617:  local settings="$HOME/.claude/settings.json"
docs/plans/plan-D-regression-memory.md:624:    tmp=$(mktemp)
docs/plans/plan-D-regression-memory.md:625:    jq --arg cmd "node $HOME/.claude/skills/.kzk-harness-shared/hooks/keyword-detector.mjs" '
docs/plans/plan-D-regression-memory.md:626:      .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
docs/plans/plan-D-regression-memory.md:628:    emit "  hooks: keyword-detector.mjs registered in ~/.claude/settings.json"
docs/plans/plan-D-regression-memory.md:629:    record "hooks: UserPromptSubmit hook registered (--enable-hooks)"
docs/plans/plan-D-regression-memory.md:631:    # Plan D: append regression-recall.mjs to UserPromptSubmit array (same matcher)
docs/plans/plan-D-regression-memory.md:633:      tmp=$(mktemp)
docs/plans/plan-D-regression-memory.md:634:      jq --arg cmd "node $HOME/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs" '
docs/plans/plan-D-regression-memory.md:635:        .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
docs/plans/plan-D-regression-memory.md:637:      emit "  hooks: regression-recall.mjs registered (--regression-recall)"
docs/plans/plan-D-regression-memory.md:638:      record "hooks: regression-recall hook registered (--regression-recall, depends on --enable-hooks)"
docs/plans/plan-D-regression-memory.md:641:    emit "  hooks: jq not found — cannot update settings.json. Install jq and re-run with --enable-hooks." >&2
docs/plans/plan-D-regression-memory.md:647:**변경 3 — `--regression-recall` 가 `--enable-hooks` 자동 enable**: `parse_flags()` 끝 또는 `main()` 진입부에:
docs/plans/plan-D-regression-memory.md:650:# Plan D: --regression-recall 는 --enable-hooks 의 dependency
docs/plans/plan-D-regression-memory.md:652:  emit "  --regression-recall implies --enable-hooks (explicit dependency)"
docs/plans/plan-D-regression-memory.md:690:    record "gstack CLI: NOT INSTALLED (npm & brew both failed). kzk-regression-memory will run in sidecar-only mode. cycle commits will WARN until installed."
docs/plans/plan-D-regression-memory.md:695:**핵심 룰**: 미설치 시 `record` 의 message 가 SUMMARY 에 들어감 (run summary 출력 시 사용자 보임). silent skip 금지 — 본 plan spec rev6 §Cycle 회고 5W1H 실패시 룰 따름.
docs/plans/plan-D-regression-memory.md:709:# Plan D — regression-recall.test.mjs
docs/plans/plan-D-regression-memory.md:713:  if node "$REPO_ROOT/install/test/regression-recall.test.mjs"; then
docs/plans/plan-D-regression-memory.md:714:    printf '  PASS: regression-recall.test.mjs\n'
docs/plans/plan-D-regression-memory.md:717:    printf '  FAIL: regression-recall.test.mjs\n'
docs/plans/plan-D-regression-memory.md:739:4 plan (A→D→B→C→E) 모두 끝나고 `feature/memory` → `main` 머지 직전, regression-recall hook 의 default DISABLED 를 ENABLED 로 전환:
docs/plans/plan-D-regression-memory.md:742:bash install/install-global.sh --enable-hooks --regression-recall
docs/plans/plan-D-regression-memory.md:745:`--regression-recall` 는 explicit dependency 로 `--enable-hooks` (keyword-detector) 도 자동 enable.
docs/plans/plan-D-regression-memory.md:747:**사용자 confirm 게이트 의무** — 자동 호출 전 user 명시 confirm 받음. 거부 시 manual enable path 안내:
docs/plans/plan-D-regression-memory.md:753:Skip = block merge. 단, 사용자가 명시적으로 "regression-recall 비활성 유지" 선언한 경우만 skip 허용 (PR description 또는 milestone commit message 에 명시).
docs/plans/plan-D-regression-memory.md:756:- ENABLED: `regression-recall hook enabled via kzk-pre-merge-sync step 3`
docs/plans/plan-D-regression-memory.md:757:- 사용자 명시 거부: `regression-recall hook left disabled by user request`
docs/plans/plan-D-regression-memory.md:763:- [ ] regression-recall hook enabled via step 3 (or user-declined per spec rev6 §Default DISABLED)
docs/plans/plan-D-regression-memory.md:769:- **kzk-regression-memory**: 본 skill step 3 가 regression-recall hook 의 first-enable gate. spec rev6 §Default DISABLED 의 자동 enable 진입점.
docs/plans/plan-D-regression-memory.md:794:{"key":"cycle-N-<axis>","file_snapshot":"<path>:<line>@<sha>","related_cycles":[N],"dismiss_count":0,"last_dismissed_at":null,"archived":false}
docs/plans/plan-D-regression-memory.md:808:### Task 11 — `kzk-large-task-delegation/SKILL.md` recall inject 룰 (~15 LoC)
docs/plans/plan-D-regression-memory.md:812:§`## Subagent prompt requirements` (또는 `## Subagent dispatch requirements` — file 의 실제 헤더 확인) 의 Rules block 항목에 추가:
docs/plans/plan-D-regression-memory.md:815:- **Recall 결과 inject** (Plan D): subagent dispatch prompt 의 Rules block 에 메인이 받은 [REGRESSION RECALL] system-reminder 가 있으면, 해당 텍스트를 verbatim 으로 dispatch prompt 에 inject. subagent 가 fix 작업 시 recall 결과 read. 매칭 정확성은 subagent 가 검토.
docs/plans/plan-D-regression-memory.md:840:- **Sidecar**: `.kzk-harness/regression-meta.jsonl`. 6필드: `key`, `file_snapshot`, `related_cycles`, `dismiss_count`, `last_dismissed_at`, `archived`
docs/plans/plan-D-regression-memory.md:841:- Sidecar = metadata extension with **own SoT for dismiss state** (derived view 아님 — dismiss_count 가 사용자 액션 source)
docs/plans/plan-D-regression-memory.md:842:- FK: sidecar `key` 는 `/learn` 에 반드시 존재. 부재 시 orphan cleanup
docs/plans/plan-D-regression-memory.md:846:- Trigger: `UserPromptSubmit` hook (`install/hooks/regression-recall.mjs`)
docs/plans/plan-D-regression-memory.md:847:- Decay: `confidence_decayed = confidence * (0.85 ** dismiss_count)`
docs/plans/plan-D-regression-memory.md:855:- 환경변수 `KZK_HARNESS_SELF_IMPROVEMENT=1`
docs/plans/plan-D-regression-memory.md:860:`install/scripts/regression-stale-check.sh`:
docs/plans/plan-D-regression-memory.md:863:- sidecar 의 cached stale flag update
docs/plans/plan-D-regression-memory.md:874:| 실패시 | gstack 미설치 → stderr WARN + cycle entry 본문 표기 의무. silent skip 금지 |
docs/plans/plan-D-regression-memory.md:879:- D plan commit 시점: hook 파일 추가 but settings.json 등록 X
docs/plans/plan-D-regression-memory.md:880:- 4 plan 끝나고 `kzk-pre-merge-sync` step 3 가 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트)
docs/plans/plan-D-regression-memory.md:881:- `--regression-recall` 는 keyword-detector 도 explicit dependency 로 자동 enable
docs/plans/plan-D-regression-memory.md:888:| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=regression-recall` |
docs/plans/plan-D-regression-memory.md:890:| settings.json 수동 | hook entry 수동 제거 |
docs/plans/plan-D-regression-memory.md:891:| Sidecar 손실 | dismiss_count reset 만 — /learn 보존 |
docs/plans/plan-D-regression-memory.md:895:### Task 13 — Skill count 동기화 14→15 (~6 LoC 변경)
docs/plans/plan-D-regression-memory.md:899:**`$CLAUDE_MD` line 3** — 14→15:
docs/plans/plan-D-regression-memory.md:901:- 변경: `... It contains 15 \`kzk-*\` skills ...`
docs/plans/plan-D-regression-memory.md:903:**`$CLAUDE_MD` "All N skills" line** — 검색 후 14→15.
docs/plans/plan-D-regression-memory.md:907:**`$README` line 3** — 14→15.
docs/plans/plan-D-regression-memory.md:909:**`$README` install command 의 skill count** — `--n 14` 또는 유사 표기 검색 후 15 로 변경.
docs/plans/plan-D-regression-memory.md:911:**`install/install-global.sh` line 602-609** — 14→15:
docs/plans/plan-D-regression-memory.md:913:if [ "${row_count:-0}" -ne 15 ]; then
docs/plans/plan-D-regression-memory.md:914:  emit "VERIFY FAIL: expected 15 '| kzk-' rows in marker block, found ${row_count:-0}" >&2
docs/plans/plan-D-regression-memory.md:917:**`install/test/run-tests.sh`** — 기존 `assert_eq "14 SKILL.md files landed" "14"` 을 `"15"` 로, `"14 kzk- rows in marker block" "14"` 을 `"15"` 로.
docs/plans/plan-D-regression-memory.md:919:**Plan B 가 16→ 추가로 늘림 — Plan D 책임 아님. Plan B 가 별도 동기화.**
docs/plans/plan-D-regression-memory.md:921:### Task 14 — Pre-commit Gate + atomic commit
docs/plans/plan-D-regression-memory.md:924:- Gate 0: AGENTS.md sync — 신규 skill 1개 (`kzk-regression-memory`) 추가 → AGENTS.md skill list 갱신 확인
docs/plans/plan-D-regression-memory.md:928:- Gate 3: test — `bash install/test/run-tests.sh` PASS (regression-recall.test.mjs 포함)
docs/plans/plan-D-regression-memory.md:935:신규 skill (15→ skills): regression memory + auto-recall.
docs/plans/plan-D-regression-memory.md:941:- install/hooks/regression-recall.mjs (신규, default DISABLED)
docs/plans/plan-D-regression-memory.md:942:- install/scripts/regression-stale-check.sh (신규)
docs/plans/plan-D-regression-memory.md:943:- install/test/regression-recall.test.mjs + fixtures/ (신규)
docs/plans/plan-D-regression-memory.md:944:- install/install-global.sh: --regression-recall flag + keyword-detector dependency
docs/plans/plan-D-regression-memory.md:950:- CLAUDE.md / README.md skill count 14→15
docs/plans/plan-D-regression-memory.md:960:| `regression-recall.mjs` exports (shouldSkip / detectFixIntent / decay / orphanCleanup / buildReminder) | `regression-recall.test.mjs` unit | 함수 단위 검증만. settings.json 통합은 manual |
docs/plans/plan-D-regression-memory.md:961:| sidecar fixture schema | `regression-recall.test.mjs` schema parse | jsonl parse + 필수 6필드 존재 확인. behavioral 통합은 manual cycle |
docs/plans/plan-D-regression-memory.md:963:| `install-global.sh --regression-recall` flag | (별도 test 없음 — 본 plan 책임 X) | settings.json 수정은 manual cycle 확인 |
docs/plans/plan-D-regression-memory.md:964:| `regression-stale-check.sh` | (본 plan 책임 X — 통합 cycle test 의존) | sidecar의 stale flag update behavioral 검증 manual |
docs/plans/plan-D-regression-memory.md:967:**Mock fixture 갱신 의무**: Plan D 의 `regression-recall.mjs` 또는 storage schema 변경 시 fixture 재캡처. gstack actual schema drift 시 plan body 자체 수정.
docs/plans/plan-D-regression-memory.md:976:| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=regression-recall` |
docs/plans/plan-D-regression-memory.md:978:| Cycle 자가-회복 불가 | settings.json hook entry 수동 제거 |
docs/plans/plan-D-regression-memory.md:979:| Sidecar 손실 | dismiss_count reset 만 — /learn 데이터 보존 |
docs/plans/plan-D-regression-memory.md:980:| Plan D 자가오염 | hook default DISABLED 라 즉시 위협 X. enable 후 발견 시 `OMC_SKIP_HOOKS=regression-recall` 즉시 비활성. 영구 차단 시 `git revert` |
docs/plans/plan-D-regression-memory.md:984:- **Plan B**: `kzk-fix-scope-expansion` 신규 skill (D recall consumer + Gate 4.5). skill count 15→16
docs/plans/plan-D-regression-memory.md:987:- Behavioral test (sonnet dispatch 시뮬레이션 / hook 실 settings.json 통합 / cycle 끝 gstack add 통합) — spec rev6 Non-goals
docs/plans/plan-D-regression-memory.md:1006:- Plan commit = atomic. 메시지 prefix `feat(skill):`

exec
/bin/zsh -lc "sed -n '21,40p' docs/plans/regression-memory-and-fix-quality-spec.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
## Locked decisions (rev3)

| 결정 | 근거 |
|---|---|
| Regression backend = gstack `/learn` 기본 schema **+ sidecar** `.kzk-harness/regression-meta.jsonl` (metadata extension with own SoT for dismiss state — derived view 아님) | hypothesis H1, cycle 3 #1 — sidecar 의 dismiss_count 는 사용자 액션 source, /learn 에서 재구성 불가. sidecar 도 git tracked. |
| `/learn` 만 사용하는 필드: `key`, `type`, `insight`, `confidence`, `source` | 가설검증 §gstack /learn 데이터모델 |
| sidecar 만 사용하는 필드: `key` (FK), `dismiss_count`, `last_dismissed_at`, `file_snapshot` (file:line@SHA), `related_cycles` | cycle 1 blind spots, cycle 2 #5 |
| Recall 룰 = `/learn search` keyword + sidecar dismiss_count + decay (`confidence * 0.85^dismiss`) | cycle 1 §H3 + cycle 2 #5 |
| dismiss_count ≥ 3 → archived (recall 결과 제외) | cycle 1 §H3 |
| Hook deployment = `install-global.sh enable_hooks()` 의 같은 settings.json `UserPromptSubmit` 배열에 append (dispatcher 통합 비추). **`--regression-recall` flag 호출 시 keyword-detector 도 자동 enable (explicit dependency)** | cycle 2 #4 + cycle 3 #4 — keyword-detector 누락 silent breakage 차단 |
| Plan D hook = **default DISABLED at D commit**, **자동 enable on main 머지** (`kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 호출) | cycle 2 #1 + cycle 3 #2 — B cycle 자가오염 차단 + first-enable 망각 방지. 사용자가 머지 단계 거치면 자동 활성. |
| D hook 자가-skip guard: 자가개선 cycle 의 메인 prompt 면 inject 안 함 (system prompt 의 self-improvement marker grep) | cycle 2 #1 |
| Axis A enforcement: (a) sonnet dispatch prompt 룰 (fresh agent) + (b) **자율실행 mode 의 메인 직접 TDD 진입 금지 — 반드시 fresh sonnet dispatch**. 메인 직접 진입 시 halt + user-queue entry. 비-자율 mode (사용자 직접 prompt) 에서는 메인 self-check + user ACK 게이트 | cycle 2 #2 + cycle 3 #3 — 자율 mode 에서 user ACK 통로 없음 → 직접 진입 자체 금지로 강화 |
| Axis A 룰 적용 범위 좁힘 — TDD red 단계만. hook/install 인프라 read 항상 허용 | cycle 1 §6 |
| Axis B fix-during 제거 → fix-start + fix-verify + Gate 4.5 만 | cycle 1 §3 |
| Axis C verifier 분기 = `git diff --shortstat`: 3 파일 미만 + 100 LoC 미만 → sonnet, 그 외 → opus | cycle 1 §4 |
| Plan 순서 A→D→B→C→**E** (E 마지막 — 다른 plan 의 production access 패턴 흡수 후) | cycle 1 §1 + cycle 2 #1 + 사용자 명시 (Plan E 추가) |
| Axis E (production code-first + 멱등성): production state 변경은 코드 (script/migration/IaC) 우선. 직접 호출 (psql/aws cli/SSM 즉시 실행) 금지. 멱등성 의무 (`IF NOT EXISTS`, idempotent script). git tracked 트래킹. | 사용자 명시 — DB 직접 변경 시 마이그레이션 drift 빈번 |
| gstack auto-install = dependencies.sh 기존 분기 패턴 (npm-first → brew-fallback) 따름. **미설치 환경 → cycle commit 시 stderr WARN + harness-flow-progress entry 에 "gstack 미설치, regression memory 비활성" 의무 표기**. silent skip 금지 | cycle 2 #12.1 + cycle 3 #5 — 침묵 실패 = 메타갭 자체 |
| Branch: `feature/memory` (이미 생성). PR 없음. 끝나면 `git merge --no-ff` to main. | 사용자 명시 |

codex
이제 라인 기준으로 치명적인 부분만 찍겠습니다. orphan cleanup, dismiss/archived 경로, stale field, auto-enable, self-skip marker 쪽이 핵심 문제입니다.
exec
/bin/zsh -lc "nl -ba docs/plans/plan-D-regression-memory.md | sed -n '233,365p'" in /Users/kimzerokim/work/personal/kzk-harness
exec
/bin/zsh -lc "nl -ba docs/plans/plan-D-regression-memory.md | sed -n '140,170p'" in /Users/kimzerokim/work/personal/kzk-harness
exec
/bin/zsh -lc "nl -ba docs/plans/plan-D-regression-memory.md | sed -n '55,90p'" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
   140	**FK 룰**: sidecar entry 의 `key` 는 `/learn` 에 반드시 존재. 부재 시 invalid → orphan cleanup 룰 적용.
   141	
   142	## Recall 룰
   143	
   144	UserPromptSubmit hook (`install/hooks/regression-recall.mjs`) 발동 시:
   145	
   146	1. 자가-skip guard 평가 (아래 §자가-skip guard) — 매칭 시 즉시 skip
   147	2. user prompt 에서 키워드 매칭 (에러/버그/fix/수정/regression/같은 버그 등)
   148	3. `gstack learn search --query <kw>` (또는 `~/.gstack/projects/<slug>/learnings.jsonl` 직접 grep — Plan D Step 0 에서 시그니처 확정)
   149	4. sidecar JSONL grep — 각 hit 의 dismiss_count, archived, last_dismissed_at 조회
   150	5. **Decay 공식**: `confidence_decayed = confidence * (0.85 ** dismiss_count)`. floating point.
   151	6. 필터:
   152	   - `archived: true` → 제외
   153	   - `confidence_decayed < 4` → 제외
   154	7. **Orphan cleanup**: sidecar entry 의 key 가 /learn 에 부재 → sidecar 그 entry 자동 삭제 + stderr 로그 (`[regression-recall] orphan key removed: <key>`)
   155	8. 잔존 hits 으로 system-reminder inject:
   156	   ```
   157	   🚨 [REGRESSION RECALL] 과거 유사 fix N건:
   158	   - <key>: <insight> (cycle <N>, confidence_decayed <X.XX>) [⚠ stale if SHA mismatch]
   159	   ⚠ 자동 적용 금지. 매칭 정확성 검토 후 채택.
   160	   dismiss: kzk-regression-memory dismiss <key>  (sidecar dismiss_count++)
   161	   ```
   162	
   163	매칭 0건 → `{"continue":true}` (silent pass-through)
   164	
   165	## 자가-skip guard
   166	
   167	자율실행 cycle 의 메인 prompt 면 inject 안 함:
   168	
   169	- 환경변수 `KZK_HARNESS_SELF_IMPROVEMENT=1` → 즉시 skip
   170	- user prompt 에서 self-improvement marker grep — 매칭되면 skip:

 succeeded in 0ms:
   233	// regression-recall.mjs — UserPromptSubmit hook for kzk-regression-memory.
   234	// Triggers fix-start phrases, queries /learn + sidecar, injects recall results.
   235	// Authoritative spec: docs/plans/regression-memory-and-fix-quality-spec.md (rev6).
   236	// Default DISABLED at Plan D commit. Auto-enabled by kzk-pre-merge-sync last step.
   237	
   238	import { readFileSync, writeFileSync, existsSync } from "node:fs";
   239	import { execSync } from "node:child_process";
   240	import path from "node:path";
   241	import os from "node:os";
   242	
   243	const FIX_KEYWORDS = [
   244	  "fix", "수정", "버그", "에러", "error", "regression", "재발",
   245	  "같은 버그", "또 났", "이거 또", "broken", "안 됨", "안된다",
   246	];
   247	
   248	const SELF_IMPROVE_MARKERS = [
   249	  "harness 개선 루프", "스킬 개선해줘", "harness loop",
   250	  "자가개선", "자가개선 cycle", "메타 cycle",
   251	];
   252	
   253	const DECAY_BASE = 0.85;
   254	const CONFIDENCE_THRESHOLD = 4;
   255	
   256	function shouldSkip(prompt, env) {
   257	  if (env.KZK_HARNESS_SELF_IMPROVEMENT === "1") return "env:KZK_HARNESS_SELF_IMPROVEMENT";
   258	  for (const m of SELF_IMPROVE_MARKERS) {
   259	    if (prompt.includes(m)) return `marker:${m}`;
   260	  }
   261	  return null;
   262	}
   263	
   264	function detectFixIntent(prompt) {
   265	  return FIX_KEYWORDS.some((k) => prompt.includes(k));
   266	}
   267	
   268	function loadSidecar(repoRoot) {
   269	  const p = path.join(repoRoot, ".kzk-harness", "regression-meta.jsonl");
   270	  if (!existsSync(p)) return { entries: [], path: p };
   271	  const lines = readFileSync(p, "utf8").split("\n").filter(Boolean);
   272	  return {
   273	    entries: lines.map((l) => JSON.parse(l)),
   274	    path: p,
   275	  };
   276	}
   277	
   278	function querylearn(query) {
   279	  // Plan D Step 0 에서 확정된 시그니처. 시그니처 미확정 시 sidecar-only fallback.
   280	  try {
   281	    const out = execSync(`gstack learn search --query ${JSON.stringify(query)} --format jsonl`, {
   282	      encoding: "utf8",
   283	      stdio: ["ignore", "pipe", "pipe"],
   284	      timeout: 5000,
   285	    });
   286	    return out.split("\n").filter(Boolean).map((l) => JSON.parse(l));
   287	  } catch (e) {
   288	    // gstack 미설치 또는 search command unavailable
   289	    return null;
   290	  }
   291	}
   292	
   293	function decay(confidence, dismissCount) {
   294	  return confidence * Math.pow(DECAY_BASE, dismissCount);
   295	}
   296	
   297	function orphanCleanup(sidecar, learnKeys) {
   298	  const keepKeys = new Set(learnKeys);
   299	  const survivors = sidecar.entries.filter((e) => keepKeys.has(e.key));
   300	  const removed = sidecar.entries.length - survivors.length;
   301	  if (removed > 0) {
   302	    writeFileSync(sidecar.path, survivors.map((e) => JSON.stringify(e)).join("\n") + "\n");
   303	    process.stderr.write(`[regression-recall] orphan keys removed: ${removed}\n`);
   304	  }
   305	  return survivors;
   306	}
   307	
   308	function buildReminder(hits) {
   309	  if (hits.length === 0) return null;
   310	  const lines = hits.map((h) => {
   311	    const stale = h.staleFlag ? " [⚠ stale if SHA mismatch]" : "";
   312	    return `- ${h.key}: ${h.insight} (cycle ${h.cycles.join(",")}, confidence_decayed ${h.confidenceDecayed.toFixed(2)})${stale}`;
   313	  });
   314	  return [
   315	    `🚨 [REGRESSION RECALL] 과거 유사 fix ${hits.length}건:`,
   316	    ...lines,
   317	    `⚠ 자동 적용 금지. 매칭 정확성 검토 후 채택.`,
   318	    `dismiss: kzk-regression-memory dismiss <key>`,
   319	  ].join("\n");
   320	}
   321	
   322	export { shouldSkip, detectFixIntent, decay, orphanCleanup, buildReminder, FIX_KEYWORDS, SELF_IMPROVE_MARKERS };
   323	
   324	if (process.argv[1] === new URL(import.meta.url).pathname) {
   325	  let raw = "";
   326	  process.stdin.setEncoding("utf8");
   327	  process.stdin.on("data", (chunk) => { raw += chunk; });
   328	  process.stdin.on("end", () => {
   329	    let payload;
   330	    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }
   331	    const prompt = String(payload.prompt ?? payload.user_prompt ?? "");
   332	    const repoRoot = process.cwd();
   333	
   334	    const skip = shouldSkip(prompt, process.env);
   335	    if (skip) {
   336	      process.stdout.write(JSON.stringify({ continue: true, _skip: skip }) + "\n");
   337	      return;
   338	    }
   339	    if (!detectFixIntent(prompt)) {
   340	      process.stdout.write(JSON.stringify({ continue: true }) + "\n");
   341	      return;
   342	    }
   343	
   344	    const sidecar = loadSidecar(repoRoot);
   345	    const learnEntries = querylearn(prompt) ?? [];
   346	    const learnKeys = learnEntries.map((e) => e.key);
   347	
   348	    const survivors = orphanCleanup(sidecar, learnKeys);
   349	    const survivorsByKey = new Map(survivors.map((e) => [e.key, e]));
   350	
   351	    const hits = [];
   352	    for (const learnEntry of learnEntries) {
   353	      const meta = survivorsByKey.get(learnEntry.key);
   354	      if (!meta) continue;  // sidecar 미존재 = invalid (FK 룰)
   355	      if (meta.archived) continue;
   356	      const dec = decay(learnEntry.confidence, meta.dismiss_count);
   357	      if (dec < CONFIDENCE_THRESHOLD) continue;
   358	      hits.push({
   359	        key: learnEntry.key,
   360	        insight: learnEntry.insight,
   361	        cycles: meta.related_cycles,
   362	        confidenceDecayed: dec,
   363	        staleFlag: meta.stale ?? false,
   364	      });
   365	    }

 succeeded in 0ms:
    55	### Task 0 — gstack backend probe (CRITICAL — backend drift 차단)
    56	
    57	**가장 먼저 실행. 이 step 의 출력이 모든 fixture / schema 가정의 single source of truth.**
    58	
    59	진입 의존: gstack 설치되어 있어야 함. 미설치 환경 → 다음 분기:
    60	
    61	1. `gstack --version` 또는 `gstack help` 시도. 명령 unavailable → Plan D 진행 정지, sidecar-only mode 의 fallback spec 작성으로 전환 (recall hook 은 sidecar 만 read, /learn 통합 없음 — 본 plan 의 §Out of scope 후보로 push)
    62	2. gstack 가용 시:
    63	   ```bash
    64	   gstack learn --help
    65	   ```
    66	   출력 캡처 → plan 본문의 `## Cycle 회고` 표 §How 행에 정확 시그니처 박음 (예: `gstack learn add --key <slug> --type <pitfall|pattern|architecture> --insight "..." --confidence <0-10> --source <fix|review|retro>`)
    67	3. 실제 entry 1회 실행:
    68	   ```bash
    69	   gstack learn add --key plan-d-step-0-test --type pattern --insight "Step 0 backend probe — schema 검증" --confidence 5 --source retro
    70	   ```
    71	4. JSONL 출력 캡처 — `~/.gstack/projects/<slug>/learnings.jsonl` 의 추가된 마지막 line read
    72	5. `$FIXTURE_LEARN` 로 복사 (실 backend 형식 = fixture 단일 source). git tracked
    73	6. spec rev6 §Storage 모델 의 entry schema (key/type/insight/confidence/source) 와 비교. 차이 발견 시 Plan D draft 자체를 수정 — `/learn` 의 actual schema 우선
    74	7. `$FIXTURE_META` 는 spec §Storage 모델 sidecar schema (6필드) 따라 hand-write 2-3 entries:
    75	   ```jsonl
    76	   {"key":"plan-d-step-0-test","file_snapshot":"install/hooks/regression-recall.mjs:42@abc1234","related_cycles":[31],"dismiss_count":0,"last_dismissed_at":null,"archived":false}
    77	   {"key":"hypothetical-stale-bug","file_snapshot":"deleted/file.ts:10@old5678","related_cycles":[28],"dismiss_count":2,"last_dismissed_at":"2026-04-15T10:00:00Z","archived":false}
    78	   {"key":"hypothetical-archived","file_snapshot":"src/old.ts:5@cafe9999","related_cycles":[20,22],"dismiss_count":3,"last_dismissed_at":"2026-04-20T10:00:00Z","archived":true}
    79	   ```
    80	8. 실패 시 user-queue entry: `Q-PLAN-D-STEP0 — gstack 미설치 또는 시그니처 캡처 실패, sidecar-only fallback 검토 필요`
    81	
    82	**완료 게이트**: `$FIXTURE_LEARN` 와 `$FIXTURE_META` 둘 다 git-tracked, 실제 line 포맷 검증 (jq 또는 node 로 JSONL parse 가능).
    83	
    84	### Task 1 — `kzk-regression-memory/SKILL.md` 신규 (~250 lines)
    85	
    86	**File**: `$SKILL_RM`
    87	
    88	**Frontmatter**:
    89	
    90	```yaml

exec
/bin/zsh -lc "nl -ba docs/plans/plan-D-regression-memory.md | sed -n '395,457p'" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
   395	# regression-stale-check.sh — Plan D 단발 stale check.
   396	#
   397	# sidecar (.kzk-harness/regression-meta.jsonl) 의 file_snapshot SHA 와 HEAD 비교.
   398	# 변경 감지 시 sidecar 의 cached stale flag update + stderr 로그.
   399	# archived 자동 X — 사용자 결정.
   400	#
   401	# 실행 시점: cron (사용자 선택) 또는 cycle 끝 단발 (kzk-web-loop 등에서 hook).
   402	
   403	set -u
   404	
   405	REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
   406	SIDECAR="$REPO_ROOT/.kzk-harness/regression-meta.jsonl"
   407	
   408	if [ ! -f "$SIDECAR" ]; then
   409	  printf '[regression-stale-check] sidecar not found: %s — skipping\n' "$SIDECAR" >&2
   410	  exit 0
   411	fi
   412	
   413	if ! command -v jq >/dev/null 2>&1; then
   414	  printf '[regression-stale-check] jq not found — install jq to enable stale check\n' >&2
   415	  exit 0
   416	fi
   417	
   418	if ! command -v git >/dev/null 2>&1; then
   419	  printf '[regression-stale-check] git not found — abort\n' >&2
   420	  exit 1
   421	fi
   422	
   423	stale_count=0
   424	ok_count=0
   425	tmp_out=$(mktemp)
   426	
   427	while IFS= read -r line; do
   428	  [ -z "$line" ] && continue
   429	  key=$(printf '%s' "$line" | jq -r '.key')
   430	  snapshot=$(printf '%s' "$line" | jq -r '.file_snapshot')
   431	
   432	  # parse "<path>:<line>@<commit-SHA>"
   433	  rest="${snapshot%@*}"
   434	  sha="${snapshot##*@}"
   435	  file_path="${rest%:*}"
   436	
   437	  # current SHA of file at HEAD
   438	  if [ -f "$REPO_ROOT/$file_path" ]; then
   439	    current_sha=$(cd "$REPO_ROOT" && git rev-parse "HEAD:$file_path" 2>/dev/null || echo "deleted")
   440	  else
   441	    current_sha="deleted"
   442	  fi
   443	
   444	  if [ "$current_sha" != "$sha" ]; then
   445	    stale_count=$((stale_count + 1))
   446	    printf '[regression-stale-check] stale: %s (was %s, now %s)\n' "$key" "$sha" "$current_sha" >&2
   447	    updated=$(printf '%s' "$line" | jq --argjson stale true '. + {stale: $stale}')
   448	    printf '%s\n' "$updated" >> "$tmp_out"
   449	  else
   450	    ok_count=$((ok_count + 1))
   451	    cleared=$(printf '%s' "$line" | jq '. + {stale: false}')
   452	    printf '%s\n' "$cleared" >> "$tmp_out"
   453	  fi
   454	done < "$SIDECAR"
   455	
   456	mv "$tmp_out" "$SIDECAR"
   457	printf '[regression-stale-check] done — %d stale, %d ok\n' "$stale_count" "$ok_count" >&2

exec
/bin/zsh -lc "nl -ba docs/plans/plan-D-regression-memory.md | sed -n '739,757p'" in /Users/kimzerokim/work/personal/kzk-harness
exec
/bin/zsh -lc "nl -ba docs/plans/regression-memory-and-fix-quality-spec.md | sed -n '21,31p'" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
   739	4 plan (A→D→B→C→E) 모두 끝나고 `feature/memory` → `main` 머지 직전, regression-recall hook 의 default DISABLED 를 ENABLED 로 전환:
   740	
   741	```bash
   742	bash install/install-global.sh --enable-hooks --regression-recall
   743	```
   744	
   745	`--regression-recall` 는 explicit dependency 로 `--enable-hooks` (keyword-detector) 도 자동 enable.
   746	
   747	**사용자 confirm 게이트 의무** — 자동 호출 전 user 명시 confirm 받음. 거부 시 manual enable path 안내:
   748	- 거부 → 후속 enable 은 사용자가 직접 위 command 실행
   749	- ACK → install-global.sh 자동 호출, 결과 stdout 로 사용자에게 보고
   750	
   751	**왜**: Plan D commit 시점에는 default DISABLED — 다음 cycle 의 자가오염 차단. 4 plan 끝나고 머지 단계가 first-enable 의 자연 게이트 (망각 차단).
   752	
   753	Skip = block merge. 단, 사용자가 명시적으로 "regression-recall 비활성 유지" 선언한 경우만 skip 허용 (PR description 또는 milestone commit message 에 명시).
   754	
   755	Checkpoint: PR description (PR-flow) 또는 milestone commit message (direct-main flow) 에 다음 줄 의무:
   756	- ENABLED: `regression-recall hook enabled via kzk-pre-merge-sync step 3`
   757	- 사용자 명시 거부: `regression-recall hook left disabled by user request`

 succeeded in 0ms:
    21	## Locked decisions (rev3)
    22	
    23	| 결정 | 근거 |
    24	|---|---|
    25	| Regression backend = gstack `/learn` 기본 schema **+ sidecar** `.kzk-harness/regression-meta.jsonl` (metadata extension with own SoT for dismiss state — derived view 아님) | hypothesis H1, cycle 3 #1 — sidecar 의 dismiss_count 는 사용자 액션 source, /learn 에서 재구성 불가. sidecar 도 git tracked. |
    26	| `/learn` 만 사용하는 필드: `key`, `type`, `insight`, `confidence`, `source` | 가설검증 §gstack /learn 데이터모델 |
    27	| sidecar 만 사용하는 필드: `key` (FK), `dismiss_count`, `last_dismissed_at`, `file_snapshot` (file:line@SHA), `related_cycles` | cycle 1 blind spots, cycle 2 #5 |
    28	| Recall 룰 = `/learn search` keyword + sidecar dismiss_count + decay (`confidence * 0.85^dismiss`) | cycle 1 §H3 + cycle 2 #5 |
    29	| dismiss_count ≥ 3 → archived (recall 결과 제외) | cycle 1 §H3 |
    30	| Hook deployment = `install-global.sh enable_hooks()` 의 같은 settings.json `UserPromptSubmit` 배열에 append (dispatcher 통합 비추). **`--regression-recall` flag 호출 시 keyword-detector 도 자동 enable (explicit dependency)** | cycle 2 #4 + cycle 3 #4 — keyword-detector 누락 silent breakage 차단 |
    31	| Plan D hook = **default DISABLED at D commit**, **자동 enable on main 머지** (`kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 호출) | cycle 2 #1 + cycle 3 #2 — B cycle 자가오염 차단 + first-enable 망각 방지. 사용자가 머지 단계 거치면 자동 활성. |

codex
1. **spec rev6 acceptance cover?** 부분 미달. `dismiss_count ≥ 3 → archived`는 spec에 lock됐는데(`regression-memory-and-fix-quality-spec.md:29`) Plan D task에는 이를 발생시키는 write path가 없고, 오히려 `dismiss` 명령만 언급합니다(`plan-D-regression-memory.md:160`, `318`). `stale`도 sidecar 6필드 spec 밖인데 구현안은 7번째 필드로 덧씁니다(`395-456`). 권고: dismiss/archive mutation task를 추가하고, sidecar schema를 6필드 유지할지 7필드로 승격할지 명시하세요.

2. **Step 0 (gstack 시그니처 캡처)** 내부 모순입니다. Task 0은 gstack 없으면 Plan D 진행 정지라 하고(`61`), Task 7/10은 sidecar-only degraded mode를 전제로 계속 갑니다(`690`, `794`). 권고: 둘 중 하나로 고정하세요. 내 판단은 `/learn`가 backend lock이면 recall 기능은 stop, cycle retro WARN만 degraded 허용이 맞습니다.

3. **Default DISABLED + 자동 enable** 방향은 맞는데 fail-closed가 아닙니다. `4 plan`이라고 써놓고 실제 순서는 5개입니다(`739`, `751`). 또 `install-global.sh`가 `jq` 부재나 중복 append로 실패해도 merge blocker가 아닙니다. 권고: “5 plans”로 고치고, settings 등록 성공 + duplicate 없음 확인 실패 시 merge block으로 못박으세요.

4. **Recall hook detail** 그대로 넘기면 구현자 사고 납니다. 가장 큰 문제는 orphan cleanup이 search hit key만 기준으로 돌아서(`345-348`) 현재 query에 안 걸린 정상 sidecar entry까지 orphan으로 삭제합니다. 권고: `searchHits`와 `allLearnKeys`를 분리하고, cleanup은 전체 `/learn` snapshot 기준으로만 하세요. query normalization도 “raw prompt 전체”가 아니라 추출 keyword 규칙을 명시해야 합니다.

5. **자가-skip guard** false positive 높습니다. marker에 `자가개선`, `메타 cycle` 같은 명사 단독이 들어가 있는데(`248-250`), lock은 동사구만 허용입니다. 권고: `KZK_AUTONOMOUS=1` 우선 + 동사구만으로 통일하세요. 지금 상태면 정상 bugfix prompt도 skip될 수 있습니다.

6. **Orphan cleanup race** race 이전에 atomicity도 없습니다. hook은 즉시 `writeFileSync`(`297-303`), stale-check는 별도 tmp+mv(`425-456`)라 동시 실행 시 유실됩니다. 권고: sidecar writer를 하나로 통일하고 `flock`/lockdir + temp file + atomic rename을 공용 규약으로 박으세요.

7. **gstack 미설치 stderr WARN** enforcement 부족합니다. 실제 recall path의 `querylearn()`는 실패 시 그냥 `null` 반환하고 끝입니다(`278-289`). silent skip 금지 위반입니다. 권고: hook 자체가 stderr WARN을 반드시 내고, 가능하면 `_warn` 같은 structured reason도 남기세요.

8. **Test fixture drift 룰** 취지는 맞지만 문구가 조잡합니다. “Plan D 변경 시 재캡처 의무”는 과합니다. 권고: `/learn` actual schema, CLI signature, fixture 포맷이 바뀔 때만 재캡처로 좁히고, Task 5 예시는 “illustrative only, Step 0 actual wins”로 명시하세요.

9. **Cross-skill 영향** silent breakage 가능성 큽니다. pre-merge-sync auto-enable은 rerun 시 hook 중복 append 위험이 있고, large-task-delegation은 reminder verbatim inject라 prompt bloating 통제가 없고, web-loop의 cycle retro entry는 `file_snapshot`의 canonical source가 없습니다. 권고: install idempotency, reminder size cap, retro snapshot sentinel 규칙을 추가하세요.

10. **Rollback 6-level 충실?** 반쪽입니다. 표는 spec을 베꼈지만 실제 설치 산출물인 `~/.claude/.../regression-recall.mjs`와 중복 settings entry 정리는 없습니다. 권고: uninstall/cleanup 절차를 rollback 표에 추가하세요.

11. **Skill count 동기화 (14→15)** none.

12. **놓친 함정** `dismiss` 경로 부재가 가장 큽니다. 이게 없으면 `dismiss_count`, `last_dismissed_at`, `archived`가 전부 죽은 필드입니다. 그다음은 stale flag가 sidecar schema를 몰래 확장하는 점입니다. 둘 다 frozen 전에 정리 안 하면 구현 단계에서 spec split-brain 납니다.

Bottom-line: REVISE
tokens used
110,273
1. **spec rev6 acceptance cover?** 부분 미달. `dismiss_count ≥ 3 → archived`는 spec에 lock됐는데(`regression-memory-and-fix-quality-spec.md:29`) Plan D task에는 이를 발생시키는 write path가 없고, 오히려 `dismiss` 명령만 언급합니다(`plan-D-regression-memory.md:160`, `318`). `stale`도 sidecar 6필드 spec 밖인데 구현안은 7번째 필드로 덧씁니다(`395-456`). 권고: dismiss/archive mutation task를 추가하고, sidecar schema를 6필드 유지할지 7필드로 승격할지 명시하세요.

2. **Step 0 (gstack 시그니처 캡처)** 내부 모순입니다. Task 0은 gstack 없으면 Plan D 진행 정지라 하고(`61`), Task 7/10은 sidecar-only degraded mode를 전제로 계속 갑니다(`690`, `794`). 권고: 둘 중 하나로 고정하세요. 내 판단은 `/learn`가 backend lock이면 recall 기능은 stop, cycle retro WARN만 degraded 허용이 맞습니다.

3. **Default DISABLED + 자동 enable** 방향은 맞는데 fail-closed가 아닙니다. `4 plan`이라고 써놓고 실제 순서는 5개입니다(`739`, `751`). 또 `install-global.sh`가 `jq` 부재나 중복 append로 실패해도 merge blocker가 아닙니다. 권고: “5 plans”로 고치고, settings 등록 성공 + duplicate 없음 확인 실패 시 merge block으로 못박으세요.

4. **Recall hook detail** 그대로 넘기면 구현자 사고 납니다. 가장 큰 문제는 orphan cleanup이 search hit key만 기준으로 돌아서(`345-348`) 현재 query에 안 걸린 정상 sidecar entry까지 orphan으로 삭제합니다. 권고: `searchHits`와 `allLearnKeys`를 분리하고, cleanup은 전체 `/learn` snapshot 기준으로만 하세요. query normalization도 “raw prompt 전체”가 아니라 추출 keyword 규칙을 명시해야 합니다.

5. **자가-skip guard** false positive 높습니다. marker에 `자가개선`, `메타 cycle` 같은 명사 단독이 들어가 있는데(`248-250`), lock은 동사구만 허용입니다. 권고: `KZK_AUTONOMOUS=1` 우선 + 동사구만으로 통일하세요. 지금 상태면 정상 bugfix prompt도 skip될 수 있습니다.

6. **Orphan cleanup race** race 이전에 atomicity도 없습니다. hook은 즉시 `writeFileSync`(`297-303`), stale-check는 별도 tmp+mv(`425-456`)라 동시 실행 시 유실됩니다. 권고: sidecar writer를 하나로 통일하고 `flock`/lockdir + temp file + atomic rename을 공용 규약으로 박으세요.

7. **gstack 미설치 stderr WARN** enforcement 부족합니다. 실제 recall path의 `querylearn()`는 실패 시 그냥 `null` 반환하고 끝입니다(`278-289`). silent skip 금지 위반입니다. 권고: hook 자체가 stderr WARN을 반드시 내고, 가능하면 `_warn` 같은 structured reason도 남기세요.

8. **Test fixture drift 룰** 취지는 맞지만 문구가 조잡합니다. “Plan D 변경 시 재캡처 의무”는 과합니다. 권고: `/learn` actual schema, CLI signature, fixture 포맷이 바뀔 때만 재캡처로 좁히고, Task 5 예시는 “illustrative only, Step 0 actual wins”로 명시하세요.

9. **Cross-skill 영향** silent breakage 가능성 큽니다. pre-merge-sync auto-enable은 rerun 시 hook 중복 append 위험이 있고, large-task-delegation은 reminder verbatim inject라 prompt bloating 통제가 없고, web-loop의 cycle retro entry는 `file_snapshot`의 canonical source가 없습니다. 권고: install idempotency, reminder size cap, retro snapshot sentinel 규칙을 추가하세요.

10. **Rollback 6-level 충실?** 반쪽입니다. 표는 spec을 베꼈지만 실제 설치 산출물인 `~/.claude/.../regression-recall.mjs`와 중복 settings entry 정리는 없습니다. 권고: uninstall/cleanup 절차를 rollback 표에 추가하세요.

11. **Skill count 동기화 (14→15)** none.

12. **놓친 함정** `dismiss` 경로 부재가 가장 큽니다. 이게 없으면 `dismiss_count`, `last_dismissed_at`, `archived`가 전부 죽은 필드입니다. 그다음은 stale flag가 sidecar schema를 몰래 확장하는 점입니다. 둘 다 frozen 전에 정리 안 하면 구현 단계에서 spec split-brain 납니다.

Bottom-line: REVISE
