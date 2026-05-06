1. **Phase 1 scope 정합성**  
`1차는 codex 호출 안정화만`이라는 선언은 반복적으로 명시돼 있다 (`§1.2`, `§2#1/#7`, `§3`, `§10`).  
Phase 2 항목도 `§10 Out of scope`에 분리돼 경계선 자체는 보인다.  
문제는 `§1.2`의 S5 정의에 `preflight+self-check`가 포함되는데, `§3`/`§4` 구현 스코프엔 해당 항목이 명시적으로 없다.  
즉, "무엇을 1차에 안 넣는지"는 명확하지만, "S5에서 1차에 넣기로 한 것 중 빠진 것" 경계가 흐린다.

2. **본문 분리의 정확성**  
분리 대상 heading 지정은 현재 파일과 정확히 일치한다: `## Codex execution shape (CLI best practice)`, `## Prompt size guideline (codex CLI timeout 차단)` (`§5.1`; 현행 `kzk-spec-and-review`).  
남기는 review-specific 블록 목록도 일관적이고 self-contained 구조는 유지 가능하다 (`§5.3`, `§4.9`).  
하지만 `spec-and-review` 본문 내부의 기존 참조(예: Step 2의 "see §Codex execution shape")를 전부 갱신한다는 작업 명세가 약하다; 1줄 cross-ref만으로는 내부 anchor 붕괴 위험이 남는다 (`§5.2`).  
`§6.1` after 문구는 방향은 맞지만, fallback까지 말하면서 참조는 `§Codex CLI 호출 패턴`만 찍어 `§Fallback(E1-E4)` 링크 정밀도가 떨어진다 (`§6.1`, `§4.6`).

3. **Fallback 사다리 (E1-E4) 완전성**  
사용자 보고 4패턴 자체(E1 timeout, E2 무-stderr 실패, E3 빈 stdout, E4 stderr 동반 실패)는 표로 모두 커버한다 (`§4.6`).  
누락은 "실행 전" 분기다: `codex` 미설치/버전 불일치/권한·sandbox flag 거부를 preflight로 구분하지 않아 E2/E4로 뭉개진다.  
network 계열도 `60s no token`/`5min stuck` 또는 E4로 흡수 가능하나, 원인 분해가 안 돼 재발 방지 액션이 약하다 (`§4.5`, `§4.6`).  
E2 vs E4를 `stderr 0 byte`로 가르는 기준은 실무에서 취약하다(도구/쉘/출력 경로 따라 newline 1바이트만 있어도 E4로 이동).

4. **Fresh subagent 호출 패턴 robustness**  
`메인 컨텍스트 보호` 목적과 기본 경로 지정은 명확하다 (`§4.7`).  
하지만 cycle 1의 핵심 지적이던 `subagent dispatch 실패/지연` 전용 fallback은 `§4.7`에 없다; codex 실행 실패만 다룬다 (`§4.6`, cycle1 Cat 5(1)).  
결과적으로 실패 지점이 하나 늘었는데, 그 신규 실패면에 대한 탐지/우회 규칙이 비어 있다.  
`§8`에도 dispatch 실패 분기 구현/검증 태스크가 없다; T9는 포괄 검증 문구라 결함 재발을 막기엔 약하다 (`§8`, `§9`).

PARTIAL — 구조 분리는 성립하지만, preflight/self-check 누락과 subagent-dispatch 실패 분기 공백이 Phase 1 안정화 목표를 직접 약화시킨다.
