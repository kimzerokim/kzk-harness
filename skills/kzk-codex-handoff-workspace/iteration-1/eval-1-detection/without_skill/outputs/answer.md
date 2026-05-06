- 진단: exit code 1 + stderr 0 byte + wall time 1.2초 → **silent failure**. codex CLI가 입력 파싱 또는 모델 응답 처리 중 내부 오류로 종료했으나 에러 메시지를 출력하지 않은 경우. 주요 원인: stdin/파일 입력 포맷 오류, API 응답 파싱 실패, 또는 네트워크 타임아웃 이전 조기 종료.

- 다음 step (retry / fallback / halt):
  1. **1회 retry** — 동일 입력으로 재시도 (일시적 네트워크/API 오류 가능성)
  2. retry도 동일 결과 → **fallback**: `oh-my-claudecode:critic` (opus) 로 대체 리뷰 수행
  3. fallback도 불가 → **halt + 사용자 보고**: codex CLI 환경 점검 필요 (`codex --version`, API key 유효성)

- 출처/근거: 일반 CLI 관행 — exit 1 + empty stderr는 uncaught internal exception 패턴. wall time 1.2s는 네트워크 요청 완료 전 조기 종료 시그널.
