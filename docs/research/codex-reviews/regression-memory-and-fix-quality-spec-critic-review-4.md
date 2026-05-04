# Spec Critic Review — Cycle 4

> Date: 2026-05-04. Method: critic opus.
> Subject: rev4 of `docs/plans/regression-memory-and-fix-quality-spec.md`
> Cycle 3 verdict: REVISE → rev4 SHIP 도달 가능 평가.
> **Cycle 4 verdict: REVISE** (5분 lock 으로 cycle 5 SHIP 가능).

## Cycle 3 7 결함 답 매트릭스 (rev4 기준)

| # | Cycle 3 결함 | 충분/불충분 | 근거 |
|---|---|---|---|
| #1 CRITICAL sidecar wording | 충분 | line 100 "metadata extension with own SoT" 명시 |
| #2 MAJOR first-enable 망각 | 충분 | line 29/122 pre-merge-sync 자동 호출 + 거부 path |
| #3 MAJOR Layer (b) 자율 갭 | 충분 | line 71 자율 mode 메인 직접 TDD 금지 + halt |
| #4 MAJOR hook append 의존 | 충분 | line 28 keyword-detector 자동 enable |
| #5 MAJOR gstack silent skip | 충분 | line 36/140 stderr WARN + entry 의무 |
| #6 MAJOR fixture drift | 충분 | line 199 Plan D Step 0 재캡처 의무 |
| #7 MINOR verifier 인용 | 충분 | line 159 발췌 inline copy |

**7/7 충분.**

## rev4 신규 결함

### #1 MAJOR — `kzk-pre-merge-sync` SKILL.md 변경 의무 누락
spec line 29/122 가 `kzk-pre-merge-sync` 의 "마지막 step" 으로 자동 호출을 강제하지만, sister skill SKILL.md 자체를 Plan D 가 수정한다는 의무가 §Plan 분할 표 Plan D 행 (line 168) 에 없음. 작성자가 D plan 만 만들고 `kzk-pre-merge-sync/SKILL.md` 안 건드리면 spec 약속 = dead text.

권고: Plan D 행 "주요 변경" 에 `kzk-pre-merge-sync/SKILL.md` 명시 추가.

### #2 MAJOR — 자율 mode 판별 키워드 false positive
line 74 "ralph", "web-loop", "autonomous-loop", "harness 개선 루프", "자가개선" 매칭. "자가개선" 은 사용자가 단순 "이 코드 자가개선해줘" 류 prompt 던져도 hit. 환경변수 `KZK_AUTONOMOUS=1` 도 OR 조건이라 비-자율 mode 정상 워크플로우가 오분류 → halt+user-queue 발동.

권고: 환경변수 우선, 키워드는 `KZK_AUTONOMOUS` 미설정 시에만 보조 매칭. 키워드를 동사구로 좁힘 ("ralph 로 돌려/web-loop 진입/autonomous-loop 시작/harness 개선 루프 시작/자가개선 cycle 진입").

### #3 MAJOR — split SoT cleanup 룰 미정
line 100 "sidecar 는 /learn 에 없는 key 가지면 invalid → cleanup". 누가 / 언제 cleanup 인지 zero. 자동 GC 면 사용자 dismiss 데이터 silent loss 위험, 수동이면 영구 누수.

권고: 한 줄 lock — "cleanup = recall hook 발동 시 orphan key 발견하면 sidecar entry 도 삭제 (자동)" 또는 "stale-check.sh 가 같이 검사 (semi-auto, 사용자 confirm)".

### #4 — `gstack learn add` 시그니처 Plan D 위임
none. 외부 CLI 시그니처 라 plan Step 0 검증 적절.

### #5 MINOR — acceptance criteria 발췌 주체
line 159 "발췌만 inline copy". 누가 발췌? 매 verifier 호출 때 spec 파싱?

권고: spec/plan 의 `## Acceptance Criteria` 섹션을 dispatcher 가 헤더 grep 추출. Plan C 위임 가능.

## Bottom-line

7/7 cycle 3 답 충분. 신규 결함 5개 중 #1/#2/#3 = MAJOR (spec lock 필요), #4 none, #5 MINOR (plan 흡수). 5분 lock 으로 SHIP 도달 가능.

**Bottom-line: REVISE → rev5 SHIP 도달 가능**
