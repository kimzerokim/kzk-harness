# Plan C Critic Review — Cycle 1 (codex CLI 성공)

> Date: 2026-05-04. Method: codex CLI stdin path (exit 0).
> Subject: `docs/plans/plan-C-fresh-agent-verification.md` (rev1)
> Spec: rev7 frozen.
> **Verdict: REVISE**

## 12 항목 진단

### #1 AC cover — verifier dispatch fail BLOCK / self-bootstrap N/A
acceptance criteria 바깥 서술에만 있음. AC 로 끌어올림.

### #2 Stage 3 ↔ Gate 5 cache 규약 허술
- HEAD~1 vs --cached diff 섞임 → cache hit 판단 흔들림
- TTL 보다 **staged diff hash + acceptance hash** invalidation
- 메모리 only → "same turn only" 명시

### #3 Verifier model 분기 — 경계값 모순
locked rule = `<3 files && <100 LoC → sonnet`. test case 가 `3 files + 50 LoC → sonnet` 으로 잘못. 즉시 수정.

### #4 Verifier prompt SoT
"원본 user request 또는 spec/plan" → SoT 흐려짐. **current plan Acceptance Criteria 우선, 없을 때만 raw user criteria**. 혼합 금지.

### #5 PASS/FAIL/PARTIAL enforcement 부재
prose 응답 처리 룰 없음.
- 첫 줄 `VERDICT: PASS|FAIL|PARTIAL` 강제
- 파싱 실패 → `INVALID_VERDICT` → BLOCK / FAIL-closed

### #6 Q-VERIFIER-FAIL halt 기준 잘못
"same diff 2 FAIL" → fix 하면 diff 바뀌어 halt 안 걸림. **same task / same acceptance target verification thread** 기준. PASS 또는 user-approved plan revision 에서만 reset.

### #7 Q-TDD-MAIN 흡수 부분
follow-up 종료 문구 Plan C 에 명시 → split-brain 닫음.

### #8 kzk-autonomous-boundary halt 표
2 entry 추가만으로 부족. reason/action/resume 열 채움. resume 조건.

### #9 Test 전략 얕음
verifier-routing.test.sh = 문자열 파서 만. 비어있음:
- cache hit/miss
- HEAD~1 vs --cached mismatch
- invalid verdict
- PARTIAL escalation
- 2 FAIL halt

### #10 Rollback 7-level — 과함
spec baseline 6-level. local rollback 5-6 충분. 관리비.

### #11 Skill count — none
Plan C 신규 skill 없음. 16 유지.

### #12 CRITICAL — Self-approve hole
Stage 3 / Gate 5 가 "subagent 결과" + "3+ files" 묶음. **메인 직접 1-2 file 고위험 fix 가 verifier 없이 통과**. spec lock "메인 self-approve 차단 의무" 정면 충돌.

권고: Stage 3 / Gate 5 trigger 룰 확장 — 파일 수 기준 외 추가 trigger:
- spec/plan task 의 "high-risk" 표시 (auth / payment / migration / public API)
- 메인 직접 commit 모든 case (사용자 ACK 게이트 필수)
- 또는 "모든 commit 에 verifier 의무, 단순 case 는 sonnet 빠른 verify"

## Bottom-line: REVISE → rev2 SHIP 도달 가능
