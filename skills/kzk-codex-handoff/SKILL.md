---
name: kzk-codex-handoff
version: 1.1.0
description: "Codex CLI 호출 안정화 single source of truth — stdin pipe + --ephemeral + read-only + NDJSON file→jq + Preflight + 4 에러 fallback 사다리. Top triggers: 'codex CLI 호출', 'codex handoff', 'codex 안정화'. Body §Triggers for full list."
---

> Authoritative source: This skill is self-authoritative for codex CLI invocation discipline. Will migrate to `harness-share.md §32` in Phase 2.

# kzk-codex-handoff

## Triggers

`codex CLI 호출`, `codex handoff`, `codex 안정화`, `codex 호출 보정`, `codex stdin pipe`, `codex --ephemeral`, `codex NDJSON`, `codex preflight`, `codex fallback`, `codex E0`, `codex E1`, `codex E2`, `codex E3`, `codex E4`, `Q-CODEX-DISPATCH-FAIL`.

Meta-skill — 사용자 직접 trigger 거의 없음. 다른 스킬이 cross-ref 시 자동 로드.

## Codex CLI 호출 패턴

### Plain text mode (review / consult 기본)

```bash
# 1. Write prompt to file (from §Codex prompt skeleton above)
cat > /tmp/<topic>-review-prompt.txt << 'EOF'
<prompt content>
EOF

# 2. Pipe stdin → codex exec, redirect stdout to file
#    MUST use `-` arg so codex reads prompt from stdin (not shell $VAR expansion)
#    MUST use --ephemeral to avoid session file clutter
cat /tmp/<topic>-review-prompt.txt \
  | codex exec \
    -s read-only --ephemeral \
    -C <repo-root> \
    -c 'model_reasoning_effort="high"' \
    - \
    2>/tmp/codex-err.txt \
    > /tmp/codex-out.txt
CODEX_EXIT=$?

# 3. Check exit + non-empty output
if [ $CODEX_EXIT -ne 0 ] || [ ! -s /tmp/codex-out.txt ]; then
  # → §Fallback 사다리 진입
fi
```

### JSON mode (구조화 파싱 필요 시)

```bash
cat /tmp/<topic>-review-prompt.txt \
  | codex exec \
    -s read-only --ephemeral \
    -C <repo-root> \
    --json \
    - \
    2>/tmp/codex-err.txt \
    > /tmp/codex-out.json

# --json produces NDJSON (one JSON object per line), NOT a single JSON object.
# NEVER pipe --json directly to jq — always redirect to file first.
jq -r 'select(.type == "item.completed" and .item.type == "agent_message") | .item.text' \
  /tmp/codex-out.json > /tmp/codex-out.txt
```

## Hard rules (5종)

1. **Prompt via stdin pipe** (`cat file | codex exec ... -`). Never pass multi-line prompt as `codex exec "$VAR"` — shell escaping breaks on newlines, quotes, backticks.
2. **`--json` output → file → jq**. Never `--json | jq` direct pipe — codex emits NDJSON (one JSON object per line), jq expects single JSON by default and chokes.
3. **`--ephemeral`** always — prevents session file accumulation from automated runs.
4. **Short single-line prompt exception**: `codex exec "short prompt" < /dev/null` is safe. Multi-line → always use stdin pipe.
5. **Plain text mode preferred** for review use cases — simpler, no NDJSON parsing needed. Use JSON mode only when you need structured fields (token counts, thread IDs).

## Timeout + stuck detection

- `timeout: 300000` (5 min). Background-monitor per `kzk-background-monitoring` (sister skill — codex exec stuck 감지 + 소유권 규칙 담당).
- No first token in **60s** → kill + retry once.
- No output in **5 min total** → stuck, kill + fallback to critic agent.
- Empty stdout or non-zero exit: save error stub to verdict file ("codex exit <N>, stderr: <first 200 chars>") then fall back to `Agent(subagent_type="oh-my-claudecode:critic" (omc 플러그인 Opus subagent — read-only 리뷰 전문, Write/Edit 불허), prompt=<same review prompt>)` (model 생략 → 메인 opus 버전 상속).

## Preflight (codex 호출 직전 환경 점검)

자가-점검 (self-check, Phase 2 영역) 과 구분 — 본 preflight 는 codex CLI 자체 환경 sanity check.

3 항목 점검 (1초 안에 완료):
1. `which codex` — CLI 미설치 시 즉시 fail
2. `codex --version` — 0.128.0+ 확인 (이하 버전은 stdin pipe / NDJSON 동작 차이)
3. sandbox 권한 확인 — `-s read-only` flag 사용 가능 검증 (실패 시 권한 상승 필요 안내)

preflight fail (E0) → retry X, 사용자에게 환경 안내 + critic opus fallback. 호출 자체 차단.

## Fallback 사다리 (E0-E4)

| E# | Trigger | Detection | Retry | Fallback |
|---|---|---|---|---|
| **E0** | Preflight fail | which/version/sandbox 어느 하나 fail | retry X | 사용자 환경 안내 + critic opus |
| E1 | timeout | wall > 300s | 1 retry | critic opus |
| E2 | 즉시 종료 + 무 stderr | exit ≠ 0 AND stderr ≤ 1 byte AND wall < 2s | retry X | critic opus |
| E3 | 빈 응답 | exit 0 AND stdout 0 byte | 1 retry | critic opus |
| E4 | 일반 실패 | exit ≠ 0 AND (stderr > 1 byte OR wall ≥ 2s) | 0 retry | stub stderr 첫 200 char + critic opus |

E2 detection 강화: `stderr ≤ 1 byte` + `wall < 2s` 조합 — race condition / buffering 회피 (구 기준 `stderr 0 byte` 는 newline 1바이트로 E4 오분류 위험).
E4 detection 강화: E2 와 OR 분기로 stderr 0 byte 라도 wall ≥ 2s 면 E4 분류.

**공통 fallback 규칙**: fallback critic opus 응답도 verdict file 에 저장 (chat history 만으로는 불충분). model 생략 → 메인 opus 버전 상속.

## Fresh subagent 호출 패턴

메인이 직접 codex exec 호출 시 메인 컨텍스트 블로킹 + 오염. 기본 경로 = **fresh subagent dispatch**.

```typescript
// 기본 — explore sonnet 안에서 codex 실행
Agent({
  subagent_type: 'oh-my-claudecode:explore' /* omc 플러그인 Haiku subagent — read-only 파일/패턴 탐색 전문 */,
  model: 'sonnet',
  prompt: `
    §Codex CLI 호출 패턴 룰을 따라 codex exec 실행:
    - prompt file: /tmp/<topic>-review-prompt.txt (내용 inline)
    - repo root: <path>
    - fallback: §Fallback 사다리 E1-E4 적용
    - verdict 저장: <verdict-file-path>
  `,
});
```

| | 메인 직접 호출 | Fresh subagent (기본) |
|---|---|---|
| 메인 컨텍스트 | 블로킹 + 오염 | 보호 |
| 허용 조건 | 5min 이내 단순 단발 review, 사용자 명시 | 기본 경로 |

**Dispatch prompt 의무**: subagent dispatch prompt 안에 `§Codex CLI 호출 패턴` + `§Hard rules 5종` + `§Fallback 사다리` 룰 verbatim inject 의무 — fresh subagent 는 SKILL.md 를 자동으로 읽지 않음.

**Subagent dispatch 자체 실패 처리**:

dispatch fail (no response / timeout / subagent type unavailable) → `kzk-large-task-delegation` (sister skill — 3+ 파일 위임 + Q-VERIFIER-DISPATCH-FAIL 패턴 출처) `§Stage 3 Q-VERIFIER-DISPATCH-FAIL` 패턴 재사용. fallback path: 메인 직접 codex 호출 (subagent 한 layer 우회 — 메인 컨텍스트 보호 가치 < dispatch 실패 frequency 일 때만). 그것도 실패 시 critic opus fallback. `kzk-user-queue` (sister skill — 자율 실행 중 모호 결정을 user-queue.md 에 등록) 를 통해 user-queue entry `Q-CODEX-DISPATCH-FAIL` 등록.

## Prompt size guideline

큰 prompt = codex stdin 대기 또는 5min stuck 위험. timeout 빈도 줄이는 룰:

- **Read 의무 = 검토 대상 plan/spec 본문 + cycle N-1 verdict 정제 file 만**. sister plan / spec 다른 본문은 *context only* (인용 / locked decision 만 prompt 안에 박음, full read 안 시킴).
- **prompt 본문 < 500 lines**. 12 카테고리 → 6-8 max.
- **응답 형식 < 700 단어**. "각 항목 짧은 진단 + 권고" 명시.
- **plan 본문 자체가 1500+ LoC** 면 codex 가 read 만 5+ 분 → 미리 핵심 변경 부분만 발췌해서 prompt 에 inline. plan 전체 read 시키지 않음.
- timeout (60s no first token, 5min total) 발생 시 fallback critic opus.

지표: codex prompt 가 다음 중 하나 trigger 면 size 줄임 후 재시도:
- prompt 자체 > 800 lines
- "Read 의무" 가 4+ 파일
- 검증 카테고리 12+

## Cost / cadence

1 round = ~2-3 min wall, ~25-30k tokens. 사용자 explicit OFF ("이번엔 codex 빼고") 만 skip. No silent skip.

## Glossary

- **SoT** (Source of Truth): 어떤 규칙/데이터의 단일 출처 문서. 충돌 시 SoT 가 우선.
- **NDJSON** (Newline-Delimited JSON): 한 줄 = JSON 객체 하나인 스트림 포맷. `--json | jq` 직접 파이프 불가 이유.
- **Preflight**: codex CLI 호출 직전 환경 점검 3항목 (which/version/sandbox). 실패 = E0.
- **E0–E4**: codex 호출 실패 분류 코드. E0=preflight fail, E1=timeout 5분 stuck, E2=즉시 종료 + 무 stderr, E3=빈 응답 stdout 0 byte, E4=일반 실패 exit ≠ 0 + stderr 있음.
- **oh-my-claudecode:critic**: omc 플러그인 Opus 모델 read-only subagent — 코드/플랜 리뷰 전문. Write/Edit 불허.
- **oh-my-claudecode:explore**: omc 플러그인 Haiku 모델 read-only subagent — 파일/패턴 탐색 전문. Write/Edit 불허.
- **Q-CODEX-DISPATCH-FAIL**: codex subagent dispatch 자체 실패 (no response / timeout / subagent type unavailable) 시 `docs/harness/user-queue.md` 에 등록하는 halt entry. 본 SKILL 정의.
- **Q-VERIFIER-DISPATCH-FAIL**: kzk-large-task-delegation §Stage 3 / kzk-pre-commit-gate Gate 5 의 verifier subagent dispatch 실패 시 등록되는 halt entry — 본 SKILL 이 재사용하는 기존 패턴.
- **kzk-large-task-delegation**: 3+ 파일 / 200+ LoC 작업을 fresh subagent 로 위임하는 sister skill. `§Stage 3 Q-VERIFIER-DISPATCH-FAIL` 패턴 출처.
- **kzk-background-monitoring**: codex exec 등 long-running task 의 stuck 감지 + 소유권 규칙 sister skill.
- **kzk-spec-and-review**: spec/plan/design 작성 시 codex CLI cross-vendor review 수행하는 sister skill — 본 SKILL 의 호출 메커니즘 소비자.
- **harness-share.md**: 모든 kzk-* 스킬의 공통 SoT 문서. 충돌 시 §N 이 개별 SKILL.md 보다 우선.

## Changelog

본 SKILL 의 운영 규칙은 본문에 현재 상태만 기술. 과거 변경 이력은 본 §Changelog 에 격리.

- **2026-05-06 (Phase 1 / Cycle 36)**: 신설. kzk-spec-and-review §Codex execution shape + §Prompt size guideline 본문을 본 SKILL 로 이전. Codex review 13 issues + 4 critical fix 모두 inline 적용 — E4 분기 (`exit ≠ 0 AND stderr ≥ 1 byte OR wall ≥ 2s`) 추가, E0 Preflight 신설, Q-CODEX-DISPATCH-FAIL halt entry 신설.
- **2026-05-06 (Cycle 38)**: §Glossary + §Changelog 신설. inline gloss 7 위치 추가. TBD → self-authoritative (Phase 2 §32 migrate 명시). version 1.0.0 → 1.1.0.

## Anti-patterns

- `--json | jq` direct pipe (NDJSON parse fail)
- multi-line prompt 를 `"$VAR"` 로 넘김 (shell escaping 깨짐)
- preflight skip — 환경 미점검 후 E2/E4 로 뭉개짐
- subagent dispatch 실패 시 silent retry — `Q-CODEX-DISPATCH-FAIL` 등록 의무
- E2 vs E4 detection 시 stderr 0 byte 만 체크 — wall time 보조 신호 누락
- fallback critic opus 응답을 chat history 에만 남김 — verdict file 저장 의무

## Interaction with other kzk-*

- **kzk-spec-and-review** (sister skill — spec/plan codex cross-vendor review 담당): review-specific 부분 (§Codex prompt skeleton / §Verdict file convention / §Cost/cadence / §Artifact retention / §Anti-patterns) 만 거기 유지. 호출 메커니즘은 본 스킬 SoT (SoT = Source of Truth, 단일 출처 문서).
- **kzk-large-task-delegation §Pre-implementation plan-critic loop** — codex 호출 부분 본 스킬 §Codex CLI 호출 패턴 cross-ref.
- **kzk-background-monitoring** — 5min stuck detection 시 background-monitor 호출.
- **kzk-autonomous-boundary** (sister skill — branch contract / halt conditions / autonomous mode boundaries 정의): Q-CODEX-DISPATCH-FAIL halt entry 를 §Halt conditions 표에 등록 의무 (Phase 2 작업).
