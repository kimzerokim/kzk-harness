---
name: kzk-codex-handoff
version: 1.5.0
description: "Codex CLI invocation stabilization SoT. 5 hard rules: stdin pipe required, --json→file→jq (not pipe), --ephemeral always, short prompts via arg, plain text mode. E0 Preflight + E1-E4 fallback ladder to critic opus. Auto-loaded by spec-and-review and large-task-delegation. References harness-share.md §32."
---

> Authoritative source: This skill is self-authoritative for codex CLI invocation discipline. Will migrate to `harness-share.md §32` in Phase 2.

# kzk-codex-handoff

## Hard rules (5종)

1. **Prompt via stdin pipe** (`cat file | codex exec ... -`). Never `codex exec "$VAR"` — shell escaping breaks on newlines/quotes/backticks.
2. **`--json` output → file → jq**. Never `--json | jq` direct pipe — codex emits NDJSON, jq expects single JSON and chokes.
3. **`--ephemeral`** always — prevents session file accumulation.
4. **Short single-line exception**: `codex exec "short prompt" < /dev/null` safe. Multi-line → always stdin pipe.
5. **Plain text mode preferred** for review — simpler, no NDJSON parsing. JSON mode only for structured fields (token counts, thread IDs).

## Codex CLI 호출 패턴

### Plain text mode (기본)

```bash
cat > /tmp/<topic>-review-prompt.txt << 'EOF'
<prompt content>
EOF

cat /tmp/<topic>-review-prompt.txt \
  | codex exec -s read-only --ephemeral -C <repo-root> \
    -c 'model_reasoning_effort="high"' - \
    2>/tmp/codex-err.txt > /tmp/codex-out.txt
CODEX_EXIT=$?

if [ $CODEX_EXIT -ne 0 ] || [ ! -s /tmp/codex-out.txt ]; then
  # → §Fallback 사다리 진입
fi
```

### JSON mode (구조화 파싱 필요 시)

```bash
cat /tmp/<topic>-review-prompt.txt \
  | codex exec -s read-only --ephemeral -C <repo-root> --json - \
    2>/tmp/codex-err.txt > /tmp/codex-out.json

jq -r 'select(.type == "item.completed" and .item.type == "agent_message") | .item.text' \
  /tmp/codex-out.json > /tmp/codex-out.txt
```

## Preflight (E0 — 호출 직전 환경 점검)

3 항목 (1초 완료): `which codex` → `codex --version` (0.128.0+) → `-s read-only` sandbox 확인.
Preflight fail → retry X, 사용자 환경 안내 + critic opus fallback.

## Fallback 사다리 (E0-E4)

| E# | Trigger | Detection | Retry | Fallback |
|---|---|---|---|---|
| **E0** | Preflight fail | which/version/sandbox 어느 하나 fail | X | 환경 안내 + critic opus |
| E1 | timeout | wall > 300s | 1 | critic opus |
| E2 | 즉시 종료 + 무 stderr | exit ≠ 0 AND **stderr ≤ 1 byte** AND **wall < 2s** | X | critic opus |
| E3 | 빈 응답 | exit 0 AND stdout 0 byte | 1 | critic opus |
| E4 | 일반 실패 | exit ≠ 0 AND (stderr > 1 byte OR wall ≥ 2s) | X | stub stderr 첫 200 char + critic opus |

E2 vs E4: `stderr ≤ 1 byte + wall < 2s` = E2 (race/buffering). `wall ≥ 2s` = E4 even if stderr empty.

> **공통 fallback 규칙 — marginal value**: fallback critic opus 응답도 **verdict file 에 저장** (chat history 만으로는 불충분). Agent dispatch 시 **model 생략 → 메인 버전 상속** (model="opus" 명시 금지).

## Fresh subagent 호출 패턴

기본 경로 = fresh subagent dispatch (메인 직접 호출 시 컨텍스트 블로킹 + 오염).

```typescript
Agent({
  subagent_type: 'oh-my-claudecode:explore',
  model: 'sonnet',   // ← model 생략하면 메인 버전 상속. opus 명시 금지.
  prompt: `§Codex CLI 호출 패턴 + §Hard rules 5종 + §Fallback 사다리 verbatim inject 의무`,
});
```

dispatch fail → `kzk-large-task-delegation §Stage 3 Q-VERIFIER-DISPATCH-FAIL` 패턴 재사용 → `Q-CODEX-DISPATCH-FAIL` to `docs/harness/user-queue.md`.

## Prompt size guideline

- prompt 본문 < 500 lines, 응답 형식 < 700 단어.
- Read 의무 = 검토 대상 plan/spec + cycle N-1 verdict 만. sister plan full read 금지.
- plan 1500+ LoC → 핵심 부분만 발췌해서 inline.
- Trigger (size 줄임 후 재시도): prompt > 800 lines / Read 의무 4+ 파일 / 카테고리 12+.

## Cost / cadence

1 round = ~2-3 min wall, ~25-30k tokens. 사용자 explicit OFF 만 skip. No silent skip.

## Glossary

- **NDJSON**: 한 줄 = JSON 객체 하나. `--json | jq` 불가 이유.
- **E0–E4**: preflight fail / timeout / 즉시 종료 무stderr / 빈 응답 / 일반 실패.
- **Q-CODEX-DISPATCH-FAIL**: subagent dispatch 자체 실패 시 user-queue halt entry.
- **oh-my-claudecode:critic**: omc Opus read-only subagent. Write/Edit 불허.


## Anti-patterns

- `--json | jq` direct pipe
- multi-line prompt `"$VAR"` 로 전달 (shell escaping 깨짐)
- preflight skip
- `Q-CODEX-DISPATCH-FAIL` 미등록 silent retry
- fallback critic opus 응답 chat history 에만 남김 (verdict file 저장 의무)
- **`model="opus"` 명시** — model 생략으로 메인 버전 상속해야 함

## Interaction with other kzk-*

- **kzk-spec-and-review**: review-specific 부분 (§Codex prompt skeleton / §Verdict file convention) 거기 유지. 호출 메커니즘은 본 스킬 SoT.
- **kzk-large-task-delegation**: codex 호출 부분 본 스킬 cross-ref. Q-VERIFIER-DISPATCH-FAIL 패턴 출처.
- **kzk-background-monitoring**: stuck detection (60s/5min) 소유권 위임.
- **kzk-autonomous-boundary**: Q-CODEX-DISPATCH-FAIL halt entry §Halt conditions 등록 (Phase 2).
