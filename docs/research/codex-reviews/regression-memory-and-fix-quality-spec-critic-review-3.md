# Spec Critic Review — Cycle 3

> Date: 2026-05-04. Method: critic opus.
> Subject: rev3 of `docs/plans/regression-memory-and-fix-quality-spec.md`
> Cycle 2 verdict: REVISE. Cycle 3 verdict: **REVISE** (단 cycle 4 SHIP 도달 가능 평가).

## Cycle 2 6 결함 답 통합도 (rev3 기준)

| # | Cycle 2 결함 | 충분/불충분 | 근거 |
|---|---|---|---|
| #1 CRITICAL gstack schema | 충분 | sidecar 분리로 임의필드 회피 |
| #1 MAJOR Plan D 자가오염 | 충분 | default DISABLED + self-improvement marker grep |
| #2 MAJOR 메인 TDD 갭 | **불충분** | Layer (b) user ACK 가 자율실행에서 동작 안 함 |
| #4 MAJOR Hook 양다리 | 충분 | append 채택 명시 |
| #5 MAJOR Test 실효성 | 충분 | 한계 명시 + Plan D 진짜 mock |
| #7 MAJOR 회고 5W1H | 충분 | 6칸 표 |

**5/6 충분, 1/6 잔존 (#2).**

## rev3 신규 결함

### #1 CRITICAL — Sidecar 가 진짜 derived 가 아님
`dismiss_count`/`last_dismissed_at` 는 사용자 dismiss 액션이 source. `/learn` 손실 시 재구성 불가능. spec line 96 "손실 시 dismiss/decay 만 reset, /learn 데이터는 보존" 자체가 sidecar 가 SoT 인 데이터 인정. **명명 거짓** = plan 작성자 backup/sync 정책 오설계 위험.

권고: "derived view" 제거 → "metadata extension with own SoT for dismiss state"

### #2 MAJOR — Default DISABLED first-enable 망각
사용자가 enable 잊으면 hook 영구 dead code, sidecar 영구 빈 파일. axis D 효용 0.
권고: `kzk-pre-merge-sync` 체크리스트에 entry 추가 또는 main 머지 자동 enable.

### #3 MAJOR — Layer (b) user ACK 자율실행 불가 (cycle 2 #2 미해결)
autonomous-loop / ralph 모드 메인은 사용자 prompt 없이 진행 — ACK 게이트 영원히 충족 안 됨 또는 메인 self-ACK = placebo.
권고: "자율실행 cycle 의 메인 직접 TDD 자체 금지 (반드시 fresh sonnet dispatch)" 로 강화. 또는 "Layer (b) 는 placebo, behavioral test 한계 인정" 으로 약화. 둘 중 하나 결정.

### #4 MAJOR — Hook append 순서 implicit 의존성
keyword-detector 다음 regression-recall append 가정. 신규 사용자가 `--regression-recall` 만 enable 시 keyword-detector 누락 → silent breakage.
권고: `install-global.sh` 의 `--regression-recall` flag 호출 시 keyword-detector 도 자동 enable. 또는 explicit dependency check.

### #5 MAJOR — gstack 미설치 silent skip = 메타갭 자체
gstack 미설치 → 회고 entry 0, recall 0 = axis D 전체 no-op. 침묵 실패 = 해결하려던 메타갭 재생산.
권고: cycle commit 시 stderr WARN + harness-flow-progress entry 에 "gstack 미설치, regression memory 비활성" 의무 표기.

### #6 MAJOR — fixture backend drift
`install/test/fixtures/` mock JSONL 이 실제 gstack 출력 형식과 일치 보장 메커니즘 없음.
권고: Plan D Step 0 에 "실제 `gstack learn add` 1회 실행 → 출력 JSONL 캡처 → fixture 로 복사" 의무.

### #7 MINOR — Verifier spec 인용 범위
600줄 spec read = 토큰/cache 부담. 범위 미정.
권고: acceptance criteria 발췌만 (verifier prompt 에 inline copy).

## Bottom-line

5/6 cycle 2 답 충분. 잔존 = #3 (Layer b 답 미해결) + 6개 신규 결함. 결함 흡수 가능: (a) #1 wording, (b) #3 한 줄 결정, (c) #2/#4/#5 install path 룰, (d) #6 fixture 의무, (e) #7 발췌 룰.

**Bottom-line: REVISE → rev4 가 SHIP 도달 가능**
