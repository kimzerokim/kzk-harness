# kzk-harness Skill Set Audit (2026-05-06)

## Purpose

18 kzk-* SKILL.md 본문 정밀 audit. 의미 중복 + over-engineering 분석. 통합/단순화 brainstorming 지원.

---

## 1. 18 Skills — Row-by-Row Audit

| # | Skill | LoC | 역할 1줄 (actual usage 기준) | Top Triggers (3-5) | Cross-ref 대상 (§Interaction verbatim 기준) |
|---|---|---|---|---|---|
| 1 | kzk-autonomous-boundary | 101 | 자율 실행 진입 시 branch/PR 3-slot 계약 강제 + halt condition 표 소유 (Q-TDD-MAIN, Q-MAIN-DIRECT-EDIT, Q-VERIFIER-*) | `autonomous`, `ralph로 돌려`, `branch contract`, `끝까지 끝내줘`, `INVALID_VERDICT` | kzk-tool-retry (1-retry before halts); kzk-autonomous-loop (polite-stop ban / multi-Plan continuation — "this skill defines what STOPS the loop; that one defines how the loop CONTINUES"); kzk-user-queue (halt conditions append entries here); kzk-test-coverage (Q-TDD-MAIN entry); kzk-large-task-delegation / kzk-pre-commit-gate (Q-VERIFIER-* entries); kzk-codebase-survey (Q-MAIN-DIRECT-EDIT entry) |
| 2 | kzk-autonomous-loop | 76 | 자율 루프의 계속 규칙 소유 — rate-limit 폴링(ScheduleWakeup), context 80% /compact, Plan 자동 연속 | `rate limit`, `ScheduleWakeup`, `polite stop`, `context budget`, `Plan auto-continuation` | kzk-autonomous-boundary ("canonical halt-condition owner. This skill's wakeup sequence MUST honor those halts"); kzk-background-monitoring (rate-limit polling discipline); kzk-web-loop (Reviewer-FAIL override); kzk-user-queue (halts append Q-AUTOLOOP entry) |
| 3 | kzk-background-monitoring | 90 | 메인이 spawn한 모든 배경 작업의 spawn→terminal lifecycle 소유 — stuck 감지·kill·retry, 완료 narration 의무 | `background`, `run_in_background`, `stuck`, `Monitor tool`, `is it done` | kzk-tool-retry ("governs single-call retry policy. This skill governs spawn-time-to-terminal lifecycle"); kzk-autonomous-loop (rate-limit 폴링 discipline); kzk-playwright-verification (narration table 공유) |
| 4 | kzk-codebase-survey | 277 | fix·spec·plan 시작 전 EXPLORER subagent 를 통해 Step 0.5–8 전수 read → survey 리포트 저장 (CRG 우선 + grep fallback) | `codebase survey`, `before planning`, `fix 시작`, `callsite 전수`, `preparation phase delegation` | kzk-large-task-delegation §Pre-implementation plan-critic loop ("Step 0 of that loop"); kzk-web-loop P1/P2 ("Survey runs before writing-plans"); kzk-spec-and-review §Step 0 ("precondition for any spec / plan / major design draft"); kzk-background-monitoring (EXPLORER narration); kzk-tool-retry (1-retry on EXPLORER failure); kzk-fix-scope-expansion (fix-start hook → auto invoke); kzk-freshness-guard (survey 전 stale 검증) |
| 5 | kzk-codex-handoff | 169 | codex CLI 호출의 단일 SoT — stdin pipe + --ephemeral + NDJSON→file→jq + Preflight + E0-E4 fallback 사다리 + fresh subagent dispatch 패턴 | `codex CLI 호출`, `codex handoff`, `codex E0–E4`, `codex NDJSON`, `Q-CODEX-DISPATCH-FAIL` | kzk-spec-and-review ("review-specific 부분만 거기 유지. 호출 메커니즘은 본 스킬 SoT"); kzk-large-task-delegation §Pre-implementation plan-critic loop ("codex 호출 부분 본 스킬 §Codex CLI 호출 패턴 cross-ref"); kzk-background-monitoring (5min stuck detection) |
| 6 | kzk-fix-scope-expansion | 153 | fix 시작 시 함수/심볼 callsite 전수 조회 (CRG 우선 + grep fallback) + .kzk-harness/fix-scope-cache.jsonl 기록 → Gate 4.5 sanity check | `fix 시작`, `callsite 전수`, `Gate 4.5`, `KZK_GATE45_SKIP`, `fix-scope-cache` | kzk-regression-memory (D recall 결과 consumer — "fix-scope-trigger 는 D 의 regression-recall.mjs 다음 슬롯에 등록"); kzk-pre-commit-gate (Gate 4.5 정의 스킬); kzk-codebase-survey (fix 시작 시 자동 invoke); kzk-pre-merge-sync (step 3 에서 --fix-scope-trigger flag 로 자동 enable); kzk-large-task-delegation (dispatch prompt 에 callsite list inject); kzk-freshness-guard (impact radius → 메타 문서 감지) |
| 7 | kzk-freshness-guard | 96 | staged 파일의 CRG 심볼 역참조로 stale 메타 문서 자동 감지 + 종류별 auto-fix (6개 자동 호출 지점) — Gate 0.5 소유 | `stale 체크`, `freshness`, `Gate 0.5`, `KZK_GATE05_SKIP`, `doc refresh` | kzk-pre-commit-gate ("Gate 0.5 소유"); kzk-spec-and-review ("Step 0 전 freshness check, Step -1 후 spec reference 검증"); kzk-codebase-survey ("survey 시작 전 기존 리포트 stale 검증"); kzk-fix-scope-expansion (impact radius → 메타 문서 감지); kzk-large-task-delegation (CRG scope estimation); kzk-pre-merge-sync ("merge 직전 전체 freshness sweep"); kzk-tool-retry (freshness hook 실패 시 1-retry) |
| 8 | kzk-large-task-delegation | 460 | 3+ 파일 / 200+ LoC / 5+ 파일 read 작업을 메인 직접 실행 금지하고 subagent dispatch 강제 — scope estimation + model routing + 3-stage review (Stage 3 = fresh verifier) 정의 | `subagent dispatch`, `5+ file read`, `버그 전수조사`, `plan 쪼개`, `INVALID_VERDICT` | kzk-spec-and-review ("narrower version of this skill, scoped to plans that feed the sonnet executor"); kzk-codebase-survey ("Step 0 of any task ≥3 files"); kzk-test-coverage (Stage 2 coverage check); kzk-pre-commit-gate ("Gate 5 가 본 skill 의 Stage 3 결과를 cache 인용"); kzk-autonomous-boundary (Q-VERIFIER-*, Q-MAIN-DIRECT-EDIT halt entries); kzk-regression-memory (recall 결과 dispatch prompt inject, 200 char cap); kzk-freshness-guard (CRG dependency graph scope estimation) |
| 9 | kzk-playwright-verification | 121 | Playwright MCP Gate 4 루틴 소유 + OAuth click-through 프로토콜 + 모든 long-running tool 대상 result narration 의무 정의 | `Playwright`, `Gate 4`, `browser_navigate`, `OAuth 막힘`, `Result narration` | kzk-pre-commit-gate ("This skill implements Gate 4"); kzk-background-monitoring ("Reuses the narration table this skill defines for long-running browser actions"); kzk-web-loop ("Cascade-recovery override — web loop's playwright resilience rule overrides this skill's hard-stop") |
| 10 | kzk-pre-commit-gate | 256 | Gate 0–5(최대 9개 gate)를 순서대로 실행하는 commit 조건 관문 — AGENTS.md sync, freshness, slop, secrets, prod-code-first, build, test, Playwright, fix-scope, verifier | `commit`, `pre-commit`, `Gate 0–5`, `AGENTS.md sync`, `INVALID_VERDICT` | kzk-freshness-guard (Gate 0.5 owner); kzk-autonomous-boundary (consecutive FAIL halt protocol); kzk-playwright-verification (Gate 4 구현); kzk-test-coverage (Gate 3 실행); kzk-large-task-delegation (Gate 5 verifier cache 공유); kzk-web-loop (doc-only / Gate 0–4 exception override); kzk-pre-merge-sync (gate-PASS line PR footer); kzk-production-access (Gate 1.6 SoT) |
| 11 | kzk-pre-merge-sync | 109 | PR 직전 / milestone 직전 3단계 체크리스트 — CLAUDE.md sync + deepinit + regression-recall/fix-scope-trigger hook 첫 enable (fail-closed) + freshness sweep | `merge`, `PR 직전`, `deepinit`, `CLAUDE.md sync`, `milestone marker` | kzk-autonomous-boundary (PR creation allowance); kzk-pre-commit-gate (gate-PASS line 제공자); kzk-spec-and-review (deepinit_manifest refresh); kzk-regression-memory ("본 skill step 3 가 regression-recall hook 의 first-enable gate"); kzk-freshness-guard (merge 직전 전체 freshness sweep §4) |
| 12 | kzk-production-access | 99 | AWS/DB production 접근 경계 — read-only = explicit instruction 필수, state mutation = AI 직접 실행 금지 + code-first + 멱등성 의무 + forward-only drift | `AWS`, `SSM`, `migration`, `schema change`, `멱등성` | kzk-autonomous-boundary ("specializes the production-access permission model within autonomous-mode contract"); kzk-user-queue (Q-PROD entries); kzk-tool-retry (retry before destructive gates — but no retry without fresh instruction); kzk-fix-scope-expansion (production mutation keyword 매칭 시 callsite hook 발동); kzk-regression-memory (prod change → key=`prod-<change-slug>` recall); kzk-large-task-delegation (dispatch prompt 에 production-code-first boilerplate inject); kzk-pre-commit-gate (Gate 1.6 SoT) |
| 13 | kzk-regression-memory | 164 | fix 시작 시 UserPromptSubmit hook(regression-recall.mjs)이 과거 유사 fix recall + decay 필터 → system-reminder inject. dismiss CLI + sidecar JSONL 저장. default DISABLED | `fix 시작`, `regression`, `recall`, `gstack learn`, `dismiss recall` | kzk-pre-merge-sync ("마지막 step 에서 --enable-hooks --regression-recall 자동 호출"); kzk-web-loop ("cycle 끝 step 5.5 에서 Skill(learn) 호출"); kzk-large-task-delegation (recall 결과 dispatch prompt inject, 200 char cap); kzk-fix-scope-expansion (B hook 이 D 의 recall hook 다음 슬롯 등록); kzk-autonomous-boundary (자가-skip guard = 자율 cycle 오염 차단) |
| 14 | kzk-spec-and-review | 165 | spec/plan/design 초안 작성 시 Step -1(brainstorm) → Step 0(codebase survey) → 3-pass(draft→codex consult→synthesize) 3단계 루프 + verdict 파일 저장 의무 | `spec 잡자`, `plan draft`, `codex review`, `brainstorming`, `Step -1` | kzk-large-task-delegation §Pre-implementation plan-critic loop ("narrower version of this skill, scoped to plans that feed the sonnet executor"); kzk-background-monitoring (codex consult long-running); kzk-freshness-guard (Step 0 전 freshness check + Step -1 후 spec reference CRG 검증); harness-share §22.5 (End-to-End Ralph Pipeline) |
| 15 | kzk-test-coverage | 99 | 변경 파일 100% line+branch coverage 강제 + TDD red-green-refactor 순서 의무 + 자율 mode 메인 직접 TDD 진입 금지(Q-TDD-MAIN) | `TDD`, `test first`, `coverage exemption`, `자율 mode TDD`, `self-verification` | kzk-user-queue (Q-COV entries); kzk-pre-commit-gate (Gate 3 실행 / coverage threshold); kzk-large-task-delegation (Stage 2 coverage check + anti-self-verification boilerplate inject); kzk-autonomous-boundary (Q-TDD-MAIN halt entry) |
| 16 | kzk-tool-retry | 115 | Edit/Write/Bash 실패 시 1회 자동 retry 강제 + "File has not been read yet" = 즉시 Read + retry — PreToolUse edit-read-guard hook 소유 | `Edit failed`, `File has not been read yet`, `String to replace not found`, `polite-stop`, `edit-read-guard` | kzk-user-queue (retry 2회 실패 후 Q-TOOL entry); kzk-autonomous-boundary (polite-stop ban 공동 enforcement); kzk-background-monitoring ("governs single-call retry policy. This skill governs spawn-time-to-terminal lifecycle") |
| 17 | kzk-user-queue | 90 | 자율 실행 중 모호 결정 queue(docs/harness/user-queue.md) 관리 — tentative default 즉시 실행 + Stage 1/2/3 사용자 복귀 리뷰 프로토콜 | `user-queue`, `Q-COV`, `모호 결정`, `Interactive Queue Review`, `DECISION` | Queue producers: kzk-tool-retry (Q-TOOL), kzk-test-coverage (Q-COV), kzk-web-loop (Q-WEBLOOP), kzk-codebase-survey (Q-INSTALL), kzk-production-access (Q-PROD), kzk-background-monitoring (Q-SUBAGENT), kzk-autonomous-boundary (autonomous halt entries) |
| 18 | kzk-web-loop | 260 | 웹 프로젝트 자율 개선 루프 — fresh evaluator가 P0/P1/P2 이슈 생성 → planner/executor cycle 무한 반복. Playwright degraded mode + reviewer FAIL = halt 아닌 skip | `web loop`, `웹 루프`, `자율 개선`, `무한 루프`, `계속 돌려` | kzk-tool-retry (1 auto-retry before 3× fail count); kzk-pre-commit-gate (all gates in executor dispatch); kzk-autonomous-boundary ("All boundary conditions apply normally. reviewer FAIL halt overridden per harness-share §25"); kzk-user-queue (Q-WEBLOOP-N-TOPIC prefix); kzk-regression-memory (cycle 끝 step 5.5 회고 entry + sidecar atomic append) |

---

## 2. Cluster 그룹화 (본문 근거)

### Cluster A — Autonomous Mode Runtime (루프 실행 규칙)

스킬 3개가 자율 실행의 "언제 멈추는가", "어떻게 계속하는가", "배경 작업 관리" 를 각각 분담.

| Skill | 역할 분담 |
|---|---|
| kzk-autonomous-boundary | 멈추는 조건 소유 (halt table) + branch contract |
| kzk-autonomous-loop | 계속하는 방법 소유 (rate-limit, /compact, Plan 연속) |
| kzk-background-monitoring | 배경 작업 lifecycle 소유 (spawn→terminal) |

**Cluster 내 cross-ref 그래프**: boundary ←→ loop (상호 참조, boundary 가 halt 소유, loop 가 wakeup 소유) → background-monitoring (loop 의 rate-limit polling 이 background 규칙 사용).

---

### Cluster B — Pre-Edit Discipline (편집 전 필수 단계)

코드를 건드리기 전 필요한 scope 파악·확장·freshness 검증을 담당.

| Skill | 역할 분담 |
|---|---|
| kzk-codebase-survey | EXPLORER subagent 통해 전수 read → 리포트 저장 |
| kzk-fix-scope-expansion | fix 특화 callsite 전수 조회 + Gate 4.5 소유 |
| kzk-freshness-guard | 메타 문서 stale 감지 + auto-fix (Gate 0.5 소유) |

**Cluster 내 cross-ref 그래프**: codebase-survey → fix-scope-expansion (fix-start 시 자동 invoke). fix-scope-expansion → freshness-guard (impact radius → 메타 문서 감지). freshness-guard → codebase-survey (survey 전 stale 검증, recursion guard 적용).

---

### Cluster C — Pre-Commit / Pre-Merge Gates (커밋·머지 관문)

| Skill | 역할 분담 |
|---|---|
| kzk-pre-commit-gate | Gate 0–5 순서 실행자 (9개 gate 최대) |
| kzk-pre-merge-sync | PR/milestone 직전 3단계 체크리스트 |
| kzk-playwright-verification | Gate 4 구현체 (UI visual + OAuth) |
| kzk-test-coverage | Gate 3 coverage 임계값 소유 + TDD 순서 규칙 |

**Cluster 내 cross-ref 그래프**: pre-commit-gate → playwright-verification (Gate 4) → test-coverage (Gate 3) → pre-merge-sync (gate-PASS line 소비). pre-commit-gate → freshness-guard (Gate 0.5). pre-commit-gate → large-task-delegation (Gate 5 verifier cache 공유).

---

### Cluster D — Authoring / Review (설계 문서 작성 + 검토)

| Skill | 역할 분담 |
|---|---|
| kzk-spec-and-review | spec/plan 3-pass 루프 (brainstorm → survey → codex review) |
| kzk-codex-handoff | codex CLI 호출 메커니즘 SoT (stdin pipe + fallback 사다리) |
| kzk-large-task-delegation | subagent dispatch + model routing + 3-stage review + scope estimation |

**Cluster 내 cross-ref 그래프**: spec-and-review → codex-handoff (호출 메커니즘 위임). large-task-delegation → codex-handoff (plan-critic loop codex 호출). spec-and-review ↔ large-task-delegation (spec-and-review = broader, large-task = narrower plan-critic).

---

### Cluster E — Regression / Memory (재발 방지 메모리)

| Skill | 역할 분담 |
|---|---|
| kzk-regression-memory | gstack /learn + sidecar JSONL 저장 + recall hook (default DISABLED) |
| kzk-fix-scope-expansion | callsite 전수 조회 (Plan B, B hook 이 D recall 다음 슬롯) |

**Cluster 내 cross-ref 그래프**: regression-memory → fix-scope-expansion (recall 결과가 fix-scope hook 의 consumer). fix-scope-expansion → regression-memory (hook slot 순서: D recall 먼저, B callsite 두 번째).

---

### Cluster F — Tool Infra / Housekeeping

| Skill | 역할 분담 |
|---|---|
| kzk-tool-retry | Edit/Write/Bash 1회 자동 retry + read-guard hook |
| kzk-user-queue | ambiguous decision queue 관리 (tentative default + Stage 1/2/3) |

**Cluster 내 cross-ref 그래프**: tool-retry → user-queue (retry 2회 실패 → Q-TOOL 등록). user-queue ← 7개 스킬이 Q-* entry 등록 (tool-retry, test-coverage, web-loop, codebase-survey, production-access, background-monitoring, autonomous-boundary).

---

### Cluster G — Specialized Domain Loops

| Skill | 역할 분담 |
|---|---|
| kzk-web-loop | 웹 개선 무한 루프 (Playwright degraded, reviewer-FAIL = skip not halt) |
| kzk-production-access | AWS/DB 접근 경계 + code-first + 멱등성 |

**Cluster 내 cross-ref**: web-loop → production-access (dispatch prompt 에 production boilerplate via large-task-delegation). 두 스킬은 서로 직접 참조 없음 — G 는 "도메인 특화" 공통점으로 묶였으나 실제 관계는 희박.

---

## 3. Cluster 내 Cross-ref 그래프 요약 (per cluster 1줄)

| Cluster | 1줄 그래프 요약 |
|---|---|
| A (Autonomous Runtime) | boundary ←halt→ loop ←rate-limit→ background-monitoring (선형 + 상호 참조) |
| B (Pre-Edit Discipline) | survey ←fix-start→ fix-scope-expansion ←impact-radius→ freshness-guard ←stale-check→ survey (삼각 순환) |
| C (Pre-Commit/Merge) | pre-commit → playwright(G4) + test-coverage(G3) + freshness(G0.5) + large-task(G5 cache) → pre-merge (선형 파이프라인) |
| D (Authoring/Review) | spec-and-review → codex-handoff ← large-task-delegation (codex 공유 허브) |
| E (Regression/Memory) | regression-memory → fix-scope-expansion (hook slot 순서 dependency) |
| F (Tool Infra) | tool-retry → user-queue ← 7 producers (star topology, user-queue 가 hub) |
| G (Domain Loops) | web-loop + production-access (도메인 특화, 직접 cross-ref 없음) |

---

## 4. Over-Engineering 의심 후보

### 4a. kzk-codex-handoff (169 LoC)
- **자체 인프라**: E0-E4 fallback 사다리, Preflight 3단계, NDJSON→file→jq 파이프 규칙, fresh subagent dispatch 패턴 — 모두 "codex CLI 하나를 안정적으로 호출하기 위한" 인프라.
- **rare trigger**: 사용자 직접 trigger 거의 없음 ("Meta-skill — 사용자 직접 trigger 거의 없음. 다른 스킬이 cross-ref 시 자동 로드" — 본문 §Triggers 명시).
- **신호**: kzk-spec-and-review 와 kzk-large-task-delegation 두 스킬만 실제 사용. codex CLI 자체가 불안정할 때만 가치 — CLI 안정화 시 스킬 전체 가치 하락.

### 4b. kzk-regression-memory (164 LoC)
- **자체 인프라**: gstack /learn JSONL backend + sidecar .kzk-harness/regression-meta.jsonl + dismiss CLI (install/bin/kzk-regression-memory.mjs) + stale-check.sh + atomic writer (lib/sidecar-write.mjs) + orphan cleanup 로직.
- **default DISABLED 정책**: 본문 §Default DISABLED 명시 — "5 plan (A→D→B→C→E) 모두 끝나고 kzk-pre-merge-sync 의 마지막 step 에서 자동 호출". 즉 아직 활성화된 적 없는 스킬.
- **신호**: gstack 플러그인 미설치 환경 WARN + silent skip → 의존성이 외부에 있어 독립 실행 불가.

### 4c. kzk-fix-scope-expansion (153 LoC)
- **자체 인프라**: fix-scope-trigger.mjs hook, fix-scope-cache.jsonl, hook-shared.mjs + cache-write.mjs import 의무, Gate 4.5 소유, 6-level rollback 표.
- **rare trigger + default DISABLED**: "fix-scope-trigger.mjs 는 commit 시점에 settings.json 에 등록되지 않음" (§Default DISABLED 정책). kzk-regression-memory 와 동일하게 5 plan 완료 후에야 활성화.
- **신호**: kzk-codebase-survey 와 기능 중복 영역 존재 (fix 시작 시 callsite 전수 조회). CRG 미설치 시 grep fallback 으로 동일 결과 도달 가능.

### 4d. kzk-large-task-delegation (460 LoC — 최대 LoC)
- **600+ LoC 기준 초과 없음(460)이지만**: scope estimation, model routing 3-tier, haiku tier triggers 목록, opus effort 가이드, 3-stage review (Stage 1/2/3), verifier VERDICT 파싱, 2 consecutive FAIL thread 정의, Stage 3 ↔ Gate 5 cache 규약, production-code-first boilerplate, anti-self-verification boilerplate, Session-6/28 lesson — 하나의 스킬 안에 독립 설계 의사결정 7+ 개가 내재.
- **신호**: kzk-pre-commit-gate (Gate 5), kzk-spec-and-review (plan-critic), kzk-test-coverage (anti-self-verification), kzk-autonomous-boundary (verifier halt entries) 에 걸쳐 "파편화된 SoT" 현상 — 본문이 4곳에 걸쳐 cross-ref 로 분산됨.

### 4e. kzk-pre-commit-gate (256 LoC)
- **9-gate 파이프라인 소유**: Gate 0~5(0, 0.5, 1, 1.5, 2, 3, 4, 4.5, 5)를 단일 스킬이 orchestrate. 각 gate 가 다른 스킬을 call.
- **신호**: gate 추가 시 본 스킬 + 해당 gate 소유 스킬 2곳 동기화 필요 — 현재 Gate 0.5는 kzk-freshness-guard, Gate 4는 kzk-playwright-verification, Gate 4.5는 kzk-fix-scope-expansion, Gate 5는 kzk-large-task-delegation 이 SoT. "gate runner" 와 "gate owner" 이중 유지 부담.

---

## 5. 통합/단순화 후보

### 5a. kzk-codex-handoff → kzk-spec-and-review 흡수

**근거**: kzk-codex-handoff §Interaction: "kzk-spec-and-review — review-specific 부분만 거기 유지. 호출 메커니즘은 본 스킬 SoT". 실 사용처 = spec-and-review + large-task-delegation 2곳. codex CLI 호출 패턴(hard rules 5종 + fallback 사다리)은 spec-and-review 의 §Codex consult 섹션에 직접 병합 가능. large-task-delegation 은 cross-ref 만 유지.

**위험**: kzk-large-task-delegation 의 plan-critic loop 도 codex 호출 → spec-and-review 흡수 시 large-task-delegation 도 spec-and-review 에 의존하게 됨. 현재는 역방향(spec-and-review 가 large-task-delegation 에 narrower 관계).

---

### 5b. kzk-autonomous-boundary + kzk-autonomous-loop → 단일 스킬

**근거**: kzk-autonomous-loop §Halt conditions: "re-stated; canonical source: kzk-autonomous-boundary". kzk-autonomous-boundary §Interaction: "This skill defines what STOPS the loop; that one defines how the loop CONTINUES". 두 스킬이 같은 자율 실행 루프의 양면을 각각 소유 — LoC 합산 101 + 76 = 177 LoC, 단일 스킬로 충분한 분량. 사용자 관점에서 "자율 루프 규칙" 은 하나의 개념.

**위험**: halt table (boundary) 과 wakeup sequence (loop) 의 update 빈도가 다를 경우 분리 유지 가치 있음. 현재 boundary 는 halt entry 추가로 자주 변경, loop 는 상대적으로 안정.

---

### 5c. kzk-fix-scope-expansion → kzk-codebase-survey 흡수 (fix-start 전용 섹션으로)

**근거**: kzk-codebase-survey §Interaction: "kzk-fix-scope-expansion (Plan B): fix 시작 시 CRG callsite 전수 조회 트리거". kzk-codebase-survey 의 §Triggers 에 이미 `fix 시작`, `callsite 전수` 포함. fix-scope-expansion 의 핵심 로직(CRG callsite 조회 + grep fallback) 은 survey Step 1 의 하위 케이스. Gate 4.5 정의는 kzk-pre-commit-gate 내부로 이동 가능.

**위험**: fix-scope-expansion 은 hook 인프라(fix-scope-trigger.mjs, cache-write.mjs, regression-recall.mjs 슬롯 순서) 를 소유 — 인프라 관리 섹션이 survey 에 섞이면 survey 가 과도하게 복잡해짐.

---

### 5d. kzk-regression-memory — 활성화 이후 재평가

**근거**: default DISABLED + gstack 외부 의존 + dismiss CLI 미구현 상태(spec rev1)에서 v1.1.0 으로 구현 완료된 스킬이지만, 실제 프로젝트에서 gstack 없이 동작하지 않음. gstack /learn 이 실제 사용 프로젝트에서 available 할 때 가치 발현. 지금 단순화 대상보다 "활성화 전 검증 필요" 후보.

---

### 5e. kzk-production-access → kzk-pre-commit-gate Gate 1.6 에 완전 위임

**근거**: kzk-pre-commit-gate §Gate 1.6: "Authoritative source: kzk-production-access §Production state changes (rev2). On conflict, that wins." — 이미 Gate 1.6 가 production-access 의 SoT 를 따름. production-access 스킬의 "credential handling" 과 "multi-step sequence" 는 커밋 단계가 아닌 실행 단계 규칙 → pre-commit 에 흡수 불가. 하지만 production-access 가 AWS/DB 특화 rare trigger 인 반면, 채택 프로젝트 대부분이 AWS 없음 → 기본 설치 제외 대상 후보.

---

## 6. 참고 — 스킬별 LoC 분포

| 구간 | 스킬 |
|---|---|
| 600+ LoC (고복잡도) | 없음 |
| 400–599 LoC | kzk-large-task-delegation (460) |
| 200–399 LoC | kzk-codebase-survey (277), kzk-pre-commit-gate (256), kzk-web-loop (260) |
| 100–199 LoC | kzk-spec-and-review (165), kzk-regression-memory (164), kzk-fix-scope-expansion (153), kzk-codex-handoff (169), kzk-large-task-delegation 제외 8개 |
| <100 LoC | kzk-autonomous-loop (76), kzk-user-queue (90), kzk-background-monitoring (90), kzk-production-access (99), kzk-freshness-guard (96), kzk-test-coverage (99), kzk-autonomous-boundary (101), kzk-playwright-verification (121), kzk-tool-retry (115), kzk-pre-merge-sync (109) |

---

*Generated by oh-my-claudecode:explore — 2026-05-06. 본문 verbatim 인용 기준.*
