# Plan E Critic Review — Cycle 1 (codex CLI 성공)

> Date: 2026-05-04. Method: codex CLI stdin path (exit 0).
> Subject: `docs/plans/plan-E-production-code-first.md` (rev1, 8 tasks, 12 AC)
> Spec: rev7 frozen.
> **Verdict: REVISE**

## 12 항목 진단

### #1 Axis E acceptance cover — 부분 미달
12 AC 중 비어있는 2개:
- `harness-share` authoritative source 정합성 수정 AC 없음
- read-only inspection 경계 정의 검증 항목 아님

권고: AC 에 "SoT 재배선" + "read-only 허용/금지 예시 고정" 추가.

### #2 Code-first boilerplate — 권한 모델 충돌
- 현재 `kzk-production-access` = "명시 지시 → AI 직접 실행" 모델
- Plan E = "AI 직접 write 금지" — 정면 reverse
- `Two-stage review FAIL` 표기 현재 `Three-stage review` (Plan C) 와 충돌

권고: 권한 모델 rewrite 명시. 리뷰 참조명 `Three-stage review` 로 update.

### #3 Gate 1.6 grep 패턴 허술
- `psql .* ALTER` → multiline / heredoc / `-f migration.sql` 놓침
- `aws s3api put-` → docs/예시/test 과탐지
- 비-멱등 SQL regex 무리

권고: "직접 실행 shell 흔적" 만 FAIL. 멱등성은 WARN + human review.

### #4 환경 설정 예외 — IaC vs runtime 이분법
IaC-managed env var → 예외 X, code-first 적용. 런타임 콘솔 수동 갱신만 예외.

권고: `IaC-managed` / `runtime-only` 이분법으로 boundary fix.

### #5 Drift forward-only — 의미 좁힘
"revert 금지" 너무 넓음. **production state rollback 금지**, code commit `git revert` 는 OK.

권고: "state semantics" 기준.

### #6 AI access 흐름 — read-only / explicit instruction 관계 잠금
- read 도 explicit instruction 필요
- write 는 explicit instruction 있어도 AI 실행 금지 (예외만 허용)

권고: 위 두 줄 spec lock.

### #7 Cross-axis B "callsite 전수" 표현
production 에선 어색. "impacted schema/query/ORM/API artifact 전수" 로 변경.

### #8 `harness-share.md §17.X` — SoT 재배선 — CRITICAL
- 현재 §17 = References (production access 아님)
- `kzk-production-access` authoritative source = `harness-share.md §2`
- Plan E 가 §17.X 추가 = 잘못된 위치

권고: §2 하위 subsection 으로. `kzk-production-access/SKILL.md` 의 authoritative source line 도 업데이트.

### #9 Test 전략 — skill-text-checks.sh 만으론 부족
존재 확인 = 룰 *기록* 검증. 동작 검증 X.

권고: Gate 1.6 fixture-based shell test 1개 추가.

### #10 Rollback — 6-level 과함
Plan E 는 신규 skill/hook 없음. D 의 rollback 복잡도 끌고 오면 over.

권고: "revert Plan E commit" + "Gate 1.6 disable" = 2-3 level 충분.

### #11 Skill count — none. 16 유지.

### #12 놓친 함정
- commit-message trigger (`production|prod|migration|IaC`) → 문서 커밋도 게이트 발동
- `harness-share §2` 가 여전히 destructive direct execution 허용 — Plan E 와 충돌
- Plan E 커밋은 `.sh` 수정 — doc-only fast path 도 아님

권고: trigger = staged path + shell diff 중심 좁힘. §2 본문도 Plan E 와 sync.

## Bottom-line: REVISE → rev2 SHIP 도달 가능
