# Spec Critic Review — Cycle 2

> Date: 2026-05-04. Method: critic opus (codex CLI plan 단계만, spec 은 critic).
> Subject: rev2 of `docs/plans/regression-memory-and-fix-quality-spec.md`
> Cycle 1 verdict: `regression-memory-and-fix-quality-spec-critic-review.md` (REVISE)
> **Verdict cycle 2: REVISE**

## Cycle 1 12 항목 통합 매트릭스 (rev2 기준)

| # | 항목 | rev2 통합도 | 근거 |
|---|---|---|---|
| 1 | Plan 순서 (A→D→B→C) | 충분 | rev2 line 27 + 130-135 |
| 2 | Axis A enforcement | **불충분** | fresh subagent dispatch 룰만, 메인 직접 TDD 케이스 가정으로 회피 |
| 3 | Axis B fix-during 제거 | 충분 | rev2 line 29 + 94 |
| 4 | Axis C verifier 분기 | 충분 | rev2 line 30 + 107 — `git diff --shortstat` |
| 5 | Axis D dismiss + decay | **불충분** | schema 명시했지만 backend 수용 미증명 (#12.2 와 직결) |
| 6 | Cross-axis A × D 예외 | 충분 | rev2 line 49 |
| 7 | Hook deployment | **불충분** | "append OR dispatcher 통합" 양다리 |
| 8 | Stale check 비용 | 충분 | rev2 line 76-78 |
| 9 | Skill count 4 sync | 충분 | rev2 line 137-145 |
| 10 | Test 전략 | **불충분** | grep text 검증만, behavioral test 없음 |
| 11 | Rollback safety | 충분 | rev2 line 158-167 |
| 12.1 | gstack 미설치 | **불충분** | "npm 또는 brew" 미결정 |
| 12.2 | /learn 시그니처 | **불충분** | Plan D Step 0 로 검증 미룸 |
| 12.3 | Codex same-vendor | 충분 | rev2 line 175 |

**스코어: 7/13 충분, 6/13 불충분.**

## rev2 신규 결함

### #1 CRITICAL — gstack /learn schema 검증 미룸
rev2 entry schema 가 `dismiss_count`, `confidence`, `file_snapshot`, `related_cycles` 등 임의 필드 7개. `gstack learn` CLI 가 free-form metadata 를 받는지 미증명. Plan D Step 0 에서 검증 미룸 = 답 안 한 것과 동일. backend 가 schema 강제하면 Axis D 핵심 기능 (decay/auto-archive/dismiss) 전부 backend 변경 (sqlite) 필요 → spec 단계 재설계.

### #2 MAJOR — Plan 순서 자가오염
D commit 직후 자가개선 cycle 의 메인이 `regression-recall.mjs` hook 등록한 상태. B 작업 중 fix-start 키워드 ("수정", "fix") 가 prompt 에 들어가면 D hook 이 system-reminder inject → B cycle 자체 오염. spec 은 시간적 의존성 무답. D hook buggy 면 B 전체 break — rollback path 있지만 자가-진단 메커니즘 부재.

### #3 MAJOR — Axis A 메인 컨텍스트 갭
"메인이 직접 TDD 진입할 일 거의 없음" 가정 검증 안 됨. 실제 시나리오: 작은 fix 직접 처리, micro-task, kzk-tool-retry 케이스. 메인 직접 진입 시 axis A 전혀 동작 안 함 = placebo.

### #4 MAJOR — Hook 통합 양다리
"같은 배열 append OR dispatcher 통합" 두 옵션 모두 OK 라 함. spec 단계 결정 사항인데 plan 으로 떠넘김.

### #5 MAJOR — Test 전략 실효성
Plan A test = SKILL.md grep. 룰 작동 검증이 아닌 룰 *기록* 검증. 진짜 test 는 sonnet dispatch 시뮬레이션 → Read attempt → blocked 확인.

### #7 MAJOR — Cycle 회고 5W1H 무답
"kzk-web-loop / 자가개선 cycle 끝 hook" 만 적힘. 누가/언제/어떤데이터/형식/실패처리 무답. Plan D 작성자가 spec 재해석 필요.

### 추가 minor
- `install/test/run-tests.sh` 의 `*.test.mjs` / `*.test.sh` 라우팅 무답
- `feature/memory` branch 생성 주체/시점 명시 누락 (이미 생성됐으나 spec 침묵)

## Bottom-line: REVISE

핵심 결함 5개 (#3 CRITICAL, #1/#2/#4/#5/#7 MAJOR) 잔존. 특히 #3 (gstack schema 검증) 은 cycle 1 명시 지적인데 rev2 가 검증을 plan 으로 떠넘김 = 답 안 한 것.

## rev3 가 답해야 할 것

1. **CRITICAL #3** — Backend 결정 재고. 권고 옵션: `/learn` 기본 schema 만 + sidecar `.kzk-harness/regression-meta.jsonl` (decay/dismiss 분리, derived view 패턴 — H2 OK)
2. **MAJOR #1** — Plan D hook default DISABLED commit. B 진입 전 explicit enable rule. 자가개선 cycle 자체 prompt skip guard.
3. **MAJOR #2** — `kzk-test-coverage` 에 메인 컨텍스트 적용 룰 추가. fresh dispatch 외 케이스 cover.
4. **MAJOR #4** — append 채택 명시 (dispatcher 비추 — 추상화 비용 회피).
5. **MAJOR #5** — Plan A test 한계 명시. behavioral test 는 manual cycle 검증 의존. Plan D test 는 진짜 mock fixture 동작.
6. **MAJOR #7** — §Cycle 회고 통합 5W1H 보강.
7. minor — gstack auto-install 분기 패턴 명시 (npm-first → brew-fallback). branch 생성 시점 명시.
