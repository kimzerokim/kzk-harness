1. **Architecture rationale 검증**
1. First-class decision으로 분류하는 건 타당하다. 이유는 메커니즘이 “재시도”가 아니라 `strategy-level model switch`로 정의돼 있고, SoT도 별도 skill로 분리했기 때문 (§4.2, §4.5, §9).
2. 다만 정당화 증거는 약하다. 핵심 근거가 사실상 Tailscale 단일 사례+사용자 관찰이라 일반화 리스크가 크다; 실패 클래스별 반증 기준이 없다 (§1.1, §9).
3. “ad-hoc 아님” 주장 자체는 구조로는 성립하지만, 운영 SLI/SLO 없이 선언형이다. 최소한 위임 트리거율, fallback율, halt율 목표치가 빠져 있다 (§9, §11).

2. **Trigger 충돌 회피**
1. `layer pivot`, `wrong-layer fix`, `같은 방향 또 실패`, `codex fallback`, `2회 fail`, `삽질 반복`은 기존 RULES와 literal 충돌이 없다 (survey §Section 1, design §4.1, §8.1).
2. `codex consult`는 disjoint 아님. 기존 `kzk-spec-and-review` RULES에 이미 동일 trigger가 있다; 새 `kzk-codex-consult` 추가 시 동시 매칭된다 (`install/hooks/keyword-detector.mjs`, design §5.1, §8.1).
3. 문서가 “중복 발동 처리”를 정의하긴 했지만, 그건 충돌 회피가 아니라 충돌 후 처리다. 질문 조건(기존 17과 disjoint) 기준으로는 실패다 (§5.5).

3. **FIX-LABEL 메커니즘 robustness**
1. 현재 설계는 컨텍스트 압축/장문 세션에서 깨지기 쉽다. 카운트 저장이 “메인 머릿속 in-memory map”이라 강제 위임 규칙의 실행 신뢰도가 낮다 (§4.3, §12).
2. `same label 2 fail`의 핵심 취약점은 라벨 drift다. 라벨만 바꿔도 카운트 회피 가능하고, 문서에 drift 방지 검증 규칙이 없다 (§4.3, §4.5, §4.6).
3. §12로 미룬 건 이해되지만, 이 항목은 core control-plane이라 out-of-scope로 두면 설계 목적(G2 차단) 자체가 약해진다 (§1.3, §12).

4. **Codex 호출 fallback 사다리 완전성**
1. 사용자 보고 3패턴을 직접 코드형 탐지로 명시한 점은 좋다. 특히 stdin pipe/`-`/`--ephemeral`/NDJSON 규칙은 “인자 전달 부정확” 원인군을 상당 부분 차단한다 (§3.2, §3.3, §3.5).
2. 누락: `non-zero exit + non-empty stderr` 일반 케이스 분기가 표에 없다. 인자 오류/옵션 오류는 보통 stderr가 비지 않으므로 E2 조건에서 빠질 수 있다 (§3.5).
3. 누락: “실행 전 인자 self-check”가 없다. 실제 실행 직전에 `-` 포함, `--ephemeral` 포함, redirect 존재를 정규식 검증하면 miswire를 더 강하게 차단 가능하다 (§3.2, §3.3).

5. **Fresh subagent 패턴 trade-off**
1. 기본 전략으로는 정당하다. 메인 컨텍스트 오염 방지와 장시간 blocking 분리가 명확한 이득이다 (§3.6).
2. 단, 실패 지점이 하나 늘어난 건 사실이고, 현재 표준 fallback은 codex 실행 실패 중심이다. `subagent dispatch 실패/지연` 전용 분기가 부족하다 (§3.5, §3.6).
3. 메인 직접 호출 옵션은 이미 handoff 표에 제한적으로 존재한다. 다만 새 2개 스킬에서 그 예외를 쓰는 조건이 명문화되지 않아 운영상은 사실상 “항상 subagent”다 (§3.6, §4.5, §5.3).

6. **spec 분리 + Q-FIX-PIVOT-FAIL halt resume**
1. SoT 단순화 효과는 실제로 있다. codex 호출 규칙을 한 파일로 모아 drift 면적을 줄인다; large-task-delegation 경유 의존도도 낮춘다 (§6, §7, §3.9).
2. cross-ref hopping 비용은 증가한다. 특히 실행자가 여러 스킬을 왕복해야 하고, anchor가 길어 유지보수 피로가 생긴다; 그래도 중복 본문보다 낫다 (§6.3, §3.9).
3. `Q-FIX-PIVOT-FAIL` resume 조건은 느슨하다. “plan revision”이 라벨 변경만으로 통과될 수 있어 재루프 위험이 남는다; 새 접근 증거(레이어 변화/새 검증) 조건이 필요하다 (§4.6).
