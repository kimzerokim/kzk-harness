---
name: kzk-codex-handoff
version: 1.6.0
description: "Codex CLI invocation stabilization SoT. 5 hard rules: stdin pipe required, --json→file→jq (not pipe), --ephemeral always, short prompts via arg, plain text mode. E0 Preflight + E1-E4 fallback ladder to critic opus. Auto-loaded by spec-and-review and large-task-delegation. References harness-share.md §32."
---

> Authoritative source: This skill is self-authoritative for codex CLI invocation discipline. Will migrate to `harness-share.md §32` in Phase 2.

# kzk-codex-handoff

## Hard rules (5)

1. **Prompt via stdin pipe** (`cat file | codex exec ... -`). Never `codex exec "$VAR"` — shell escaping breaks on newlines/quotes/backticks.
2. **`--json` output → file → jq**. Never `--json | jq` direct pipe — codex emits NDJSON, jq expects single JSON and chokes.
3. **`--ephemeral`** always — prevents session file accumulation.
4. **Short single-line exception**: `codex exec "short prompt" < /dev/null` safe. Multi-line → always stdin pipe.
5. **Plain text mode preferred** for review — simpler, no NDJSON parsing. JSON mode only for structured fields (token counts, thread IDs).

## Codex CLI invocation patterns

### Plain text mode (default)

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
  # → Enter §Fallback ladder
fi
```

### JSON mode (when structured parsing is needed)

```bash
cat /tmp/<topic>-review-prompt.txt \
  | codex exec -s read-only --ephemeral -C <repo-root> --json - \
    2>/tmp/codex-err.txt > /tmp/codex-out.json

jq -r 'select(.type == "item.completed" and .item.type == "agent_message") | .item.text' \
  /tmp/codex-out.json > /tmp/codex-out.txt
```

## Preflight (E0 — environment check before invocation)

3 items (completes in ~1s): `which codex` → `codex --version` (0.128.0+) → `-s read-only` sandbox check.
Preflight fail → no retry; guide user on environment setup + critic opus fallback.

## Fallback ladder (E0-E4)

| E# | Trigger | Detection | Retry | Fallback |
|---|---|---|---|---|
| **E0** | Preflight fail | which/version/sandbox any one fails | X | Environment guidance + critic opus |
| E1 | Timeout | wall > 300s | 1 | critic opus |
| E2 | Immediate exit + no stderr | exit ≠ 0 AND **stderr ≤ 1 byte** AND **wall < 2s** | X | critic opus |
| E3 | Empty response | exit 0 AND stdout 0 bytes | 1 | critic opus |
| E4 | General failure | exit ≠ 0 AND (stderr > 1 byte OR wall ≥ 2s) | X | stub stderr first 200 chars + critic opus |

E2 vs E4: `stderr ≤ 1 byte + wall < 2s` = E2 (race/buffering). `wall ≥ 2s` = E4 even if stderr empty.

> **Common fallback rule — marginal value**: fallback critic opus responses must also be **saved to verdict file** (chat history alone is insufficient). When dispatching an Agent, **omit model → inherits main version** (never specify `model="opus"` explicitly).

## Fresh subagent invocation pattern

Default path = fresh subagent dispatch (direct main invocation causes context blocking + contamination).

```typescript
Agent({
  subagent_type: 'oh-my-claudecode:explore',
  model: 'sonnet',   // ← omit model to inherit main version. Never specify opus explicitly.
  prompt: `§Codex CLI invocation patterns + §Hard rules (5) + §Fallback ladder verbatim inject required`,
});
```

dispatch fail → reuse `kzk-large-task-delegation §Stage 3 Q-VERIFIER-DISPATCH-FAIL` pattern → `Q-CODEX-DISPATCH-FAIL` to `docs/harness/user-queue.md`.

## Prompt size guideline

- Prompt body < 500 lines, response format < 700 words.
- Required reads = review target plan/spec + cycle N-1 verdict only. No reading full sister plans.
- plan 1500+ LoC → inline only the critical excerpts.
- Trigger (reduce size then retry): prompt > 800 lines / required reads 4+ files / categories 12+.

## Cost / cadence

1 round = ~2-3 min wall, ~25-30k tokens. Skip only on explicit user OFF. No silent skip.

## Glossary

- **NDJSON**: 1 line = 1 JSON object. Why `--json | jq` fails.
- **E0–E4**: preflight fail / timeout / immediate exit no-stderr / empty response / general failure.
- **Q-CODEX-DISPATCH-FAIL**: user-queue halt entry when subagent dispatch itself fails.
- **oh-my-claudecode:critic**: OMC Opus read-only subagent. Write/Edit not permitted.


## Anti-patterns

- `--json | jq` direct pipe
- Multi-line prompt passed as `"$VAR"` (shell escaping breaks)
- Preflight skip
- `Q-CODEX-DISPATCH-FAIL` not registered, silent retry
- Fallback critic opus response kept only in chat history (verdict file save is mandatory)
- **`model="opus"` explicit** — omit model to inherit main version

## Interaction with other kzk-*

- **kzk-spec-and-review**: review-specific parts (§Codex prompt skeleton / §Verdict file convention) stay there. Invocation mechanics are SoT here.
- **kzk-large-task-delegation**: codex invocation cross-refs this skill. Q-VERIFIER-DISPATCH-FAIL pattern source.
- **kzk-background-monitoring**: stuck detection ownership (60s/5min) delegated here.
- **kzk-autonomous-boundary**: Q-CODEX-DISPATCH-FAIL halt entry registered in §Halt conditions (Phase 2).
