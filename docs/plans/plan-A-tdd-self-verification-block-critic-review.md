# Plan A Critic Review — Cycle 1 (codex CLI 성공)

> Date: 2026-05-04. Method: codex CLI stdin path (exit 0). 30k tokens raw output.
> Subject: `docs/plans/plan-A-tdd-self-verification-block.md` (draft).
> Spec: rev6 (frozen).
> Raw output: `plan-A-tdd-self-verification-block-critic-review-raw.md`.
> **Verdict: REVISE**

## 7항목 진단

### #1 Acceptance criteria 충실성
1-5, 7, 8 task 매핑 OK. **Acceptance 6 = "no-op 확인" 불가** (검증 불가능). 문서 헤더 `spec rev5` + 순서 `A→D→B→C` 그대로 — rev6 미반영.

권고: Plan A 헤더 + commit body 의 spec ref `rev6` 로 정정. 순서 `A→D→B→C→E` 로. Acceptance 6 = 명시적 점검 항목 ("Plan A 는 신규 skill 없음 → CLAUDE.md / README.md 변경 없음 검증").

### #2 Task detail 충실성
Task 2 의 "자동 inject" = 섹션 참조? literal block 복붙? 불명확. fresh agent 상대로 참조만 적으면 실패. Task 1 Anti-pattern 의 "hook/install 인프라 read 는 항상 허용 (TDD red 가 아닌 디버깅 목적)" 자기모순.

권고:
- Task 2: "Rules block 에 아래 literal boilerplate 를 그대로 포함" 명시 + boilerplate 텍스트 그대로 박음
- Task 1 Anti-pattern 예외: "red 단계 중에도 harness/hook debugging 필요 시 예외 허용" 으로 정정

### #3 Layer (b) 자율 mode 룰 — spec lock 이탈
spec rev6 lock = `(1) KZK_AUTONOMOUS=1 우선, (2) unset 시 동사구 키워드`. Plan A 는 `KZK_AUTONOMOUS=0 override` 추가 — **prior decision 이탈**. Task 3 요약도 "`=1` 또는 동사구" 만 있고 `unset 시만` 조건 누락.

권고: `=0 override` 전부 삭제. spec rev6 wording 그대로 통일.

### #4 Test 전략 — grep 약함
현재 grep 은 문자열 존재만 확인. 잘못된 우선순위, `env unset` 누락, 명사 단독 금지 누락, literal inject 미실시, unwanted `KZK_AUTONOMOUS=0` 추가 — 모두 못 잡음.

권고:
- positive grep 추가: `환경변수 unset 시`, `명사 단독`, `fresh sonnet dispatch`, `BLOCKED 반환`
- negative grep 추가: `KZK_AUTONOMOUS=0`
- section anchor 범위 grep (가능하면)

### #5 Rollback 불충분
`DISABLE_OMC=kzk-test-coverage` 는 Layer (b) 만 끄고 Layer (a) boilerplate 는 `kzk-large-task-delegation` 에 잔존.

권고: Plan A 전용 disable path 명시 또는 `DISABLE_OMC=kzk-large-task-delegation` 영향까지 문서화.

### #6 Cross-skill 영향 — split-brain
Q-TDD-MAIN queue entry + "autonomous-boundary halt 룰과 통합" 적어놓고 `kzk-autonomous-boundary` skill / queue contract 문서 안 건드림.

권고: Plan A 범위 밖이면 "contract only, implementation in boundary skill later" 명시. 또는 관련 skill cross-ref 같이 수정.

### #7 놓친 함정
- 비-자율 mode "user ACK 게이트" 추상적 — ACK 문구 정의 없음
- trigger / description 에 `KZK_AUTONOMOUS` 넣는 건 env var 와 user trigger 혼동

권고:
- ACK 허용 문구 예시 고정 (예: "이 task TDD 직접 진입 OK", "test-from-spec 준수 확인했음")
- trigger 목록에서 env var 이름 제거

## Bottom-line: REVISE

7항목 모두 실질 결함. codex 첫 시도 성공 (same-vendor blind spot 회피 효과 확인). Plan A rev2 가 SHIP 가능 — wording + Test grep 강화 + cross-skill scope 명시.
