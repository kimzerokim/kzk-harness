# Regression Memory Hypothesis — Critic Review

> codex CLI 호출 실패 (exit 144, stdin 대기). `oh-my-claudecode:critic` opus fallback.
> Date: 2026-05-04. Branch: `feature/memory`.

## 검증 대상 가설

H1: 1인 사이드 프로젝트 + Claude Code 환경에서 basic-memory(MCP+FastEmbed) 가 gstack `/learn`(JSONL+keyword) 대비 우위가 명확한가?

H2: 둘 다 도입해서 dual-layer (learnings 항상 + basic-memory 인덱싱) 가 합리적인가?

H3: 진짜 ROI 는 storage 가 아니라 fix 시작 시점의 자동 조회 hook 이다.

---

## H1 — basic-memory 우위 명확한가?

**Verdict: DISAGREE (NUANCED 쪽)**

Regression memory entry 는 짧고(버그 ID/패턴/회피책), keyword 가 명시적이고(오류 메시지/함수명/파일명), recall 시점이 latency-sensitive 하다. 이 모두 keyword 검색의 강점 영역. Semantic search 가 가치 내려면 entry 수천 개 + paraphrase recall 임계 — 1인 운영에서 1-2년 걸림. basic-memory 추가 비용(MCP 프로세스, FastEmbed 모델, embedding drift, 벡터 corruption 디버깅) 은 즉시 발생.

**실무 권고:** `/learn` 로 6개월 운영, entry 수와 recall miss 측정. miss 누적 전엔 basic-memory over-engineering.

## H2 — dual-layer 합리적인가?

**Verdict: DISAGREE**

Dual-write 는 1인 환경에서 거의 항상 실패. "중요한 것만 인덱싱" 게이트가 인지 부담이고, 자동화 안 하면 한쪽만 쓰게 되어 desync. Regression memory 에서 desync = 최악의 failure mode (정답이 다른 store 에 있는데 조회 store 에 없을 때 신뢰 무너짐). 진짜 dual-layer 가 필요하면 한쪽이 derived view 여야 함 (예: `/learn` JSONL → cron → basic-memory 인덱스).

**실무 권고:** 단일 source of truth 유지. backend 만 교체.

## H3 — 자동 조회 hook 이 진짜 ROI

**Verdict: STRONG AGREE**

H1/H2 가 second-order 문제임을 이 가설이 보여줌. Trigger 부터 풀어야 함. Claude fix 시작 시점 신호:
1. 사용자 prompt 에 에러 키워드
2. Bash 도구 non-zero exit
3. 같은 파일 read 후 Edit 패턴

이 셋이 PreToolUse / UserPromptSubmit hook 으로 잡힘. Hook 없으면 어떤 backend 든 "기억은 있는데 안 꺼냄" 상태. 이건 가설이 아니라 정리(theorem).

**실무 권고:** P0 = backend 선택이 아니라 `install/hooks/regression-recall.mjs` 프로토타입. `/learn` JSONL grep + 키워드 매칭 hook 부터.

---

## Blind Spots (사용자가 놓친 함정)

### 1. Recall trust decay
Regression entry 가 시간 지나면 코드베이스와 desync (함수명 변경, 파일 이동). 어떤 backend 도 자동 해결 못 함. entry 에 **commit SHA + file:line snapshot** 박고 stale 표시 로직 필요. 후보 분석에서 이 항목 빠져 있었음.

### 2. False-positive recall 비용
"지난 번 비슷한 버그" 가 사실 다른 버그였을 때, recall 이 Claude 를 **잘못된 가설로 끌고 감**. precision/recall tradeoff 가 fix 시작 시점에 그대로 전이. Keyword 검색이 오히려 false positive 적게 내는 측면 — semantic 우위 직관 의심해야.

### 3. Self-improvement loop 와의 결합
이 레포는 자가개선 cycle 이 돈다. Regression memory 의 진짜 가치는 **cycle 간 학습**. cycle N 회고가 cycle N+1 시작 hook 에서 자동 조회되는 흐름이 빠지면 library 선택은 무의미.

---

## Bottom-line

`/learn` 이든 basic-memory 든 backend 선택은 6개월 안에 의미 있는 차이를 만들지 못함. 진짜 결정 사항:

- **(a) 조회를 강제할 hook 위치**
- **(b) entry stale 검증 정책 (commit SHA + file:line)**
- **(c) cycle 회고와의 통합 지점**

Backend 비교에 한 사이클 더 쓰지 말고 `/learn` 으로 락인. H3 의 hook 부터 만든다. 6개월 후 entry 1000개 넘고 keyword miss rate 측정값 있을 때 basic-memory 재검토. 그 전엔 over-engineering.

## Spec 작성에 반영할 결정사항

| 결정 | 출처 |
|---|---|
| Backend = gstack `/learn` (basic-memory 도입 안 함) | H1 DISAGREE |
| Single source of truth, dual-layer 금지 | H2 DISAGREE |
| Auto-recall hook 이 spec 핵심 (P0) | H3 STRONG AGREE |
| Entry 에 commit SHA + file:line snapshot 의무 | Blind spot 1 |
| False-positive 처리 룰 (uncertain match 일 땐 silently inject 금지, 사용자에게 표시) | Blind spot 2 |
| Cycle 회고와의 통합 (kzk-web-loop, harness self-improvement) | Blind spot 3 |
