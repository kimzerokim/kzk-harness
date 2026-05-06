# Design — kzk-codex-handoff (Phase 1)

> Date: 2026-05-06
> Scope: 1차 — codex CLI 호출 안정화 SoT 새 스킬 + spec-and-review / large-task-delegation 분리. 메타-갭 차단 룰은 2차 cycle.
> Branch contract: main 직접 commit, PR X
> Status: FROZEN

---

## §1 Background — S5 분리 배포 합리성

### §1.1 4 메타-갭 (사용자 직접 관찰, N=1)

Tailscale 케이스: Claude = tailscale SW 내부 설정 3회 반복 실패, Codex = OS `route add` 1줄 즉시 해결.

| 갭 | 이름 | 요약 |
|---|---|---|
| G1 | wrong-layer fix | SW 내부에서만 해결 시도 — 외부 환경(route/DNS) 먼저 보지 않음 |
| G2 | same-direction loop | 1회 실패 후 같은 방향으로 variation 반복 |
| G3 | knowledge trap | 복잡한 솔루션 먼저, 더 단순한 외부 fix 간과 |
| G4 | explanation > fix | "왜 안 되는지" 설명 집중, 1줄 fix 미제공 |

**N=1 한계**: G1/G3 는 같은 현상의 다른 해석일 수 있고, 권한/안전 제약으로 Claude 가 L0 제안을 보수적으로 회피했을 가능성도 있음 (codex meta-direction review S5 지적).

### §1.2 S5 추천 (codex meta-direction review 인용)

> "S5 정의: (A) codex 호출 안정화 전용(SoT+fallback+preflight+self-check) 먼저 출시, (B) 메타갭 차단은 계측 후 2차. 핵심은 두 문제를 분리 배포해 실패 원인을 분해 가능하게 만드는 것이다."

본 design 은 **(A) 1차만** 다룬다. G1-G4 차단 룰은 사례 누적 + 계측 후 2차 cycle.

---

## §2 LOCKED Decisions (11)

모두 재논의 불가 (사용자 확정).

| # | 결정 | 본문 위치 |
|---|---|---|
| 1 | **S5 분리 배포** — 1차 = codex 호출 안정화, 2차 = 메타-갭 차단 | §1 |
| 2 | **새 스킬 1장: `kzk-codex-handoff`** — codex CLI 호출 SoT | §3 |
| 3 | **kzk-spec-and-review `§Codex execution shape` + `§Prompt size guideline` 본문 떼어내 새 스킬로 이전** — spec-and-review 에는 cross-ref 한 줄만 남김 | §5 |
| 4 | **kzk-large-task-delegation `§Pre-implementation plan-critic loop`** — codex 호출 줄을 새 스킬 cross-ref 로 update | §6 |
| 5 | **사용자 보고 codex 에러 4종 (E1-E4)** — 새 스킬 §Fallback 사다리 본문 | §4.6 |
| 6 | **Fresh subagent 호출 패턴** — `oh-my-claudecode:explore` sonnet 안 codex 실행 = 메인 컨텍스트 보호 | §4.7 |
| 7 | **메타-갭 차단 룰 (FIX-LABEL / Q-FIX-PIVOT-FAIL / 자가-점검 ladder / 자동 위임 / kzk-fix-layer-pivot / kzk-codex-consult)** — 모두 §10 Out of scope | §10 |
| 8 | **Trigger 충돌 1차** — 새 스킬 trigger 는 meta-skill (cross-ref 자동 로드). keyword-detector.mjs 추가 X. spec-and-review 의 codex 관련 trigger 그대로 유지 | §4.2 |
| 9 | **반증 계측** — 1차에 포함 X | §10 |
| 10 | **카운트 17 → 18** — README.md (line 3 + install command), CLAUDE.md (line 3 + "All N skills"), install-global.sh, verify-install.sh 4곳 update | §7.4 / §7.5 |
| 11 | **Branch contract** — main 직접 commit, PR X | header |

---

## §3 1차 Scope — kzk-codex-handoff

### §3.1 새 스킬 정체성

`kzk-codex-handoff` = **codex CLI 호출 single source of truth**.

기존: codex 호출 룰이 `kzk-spec-and-review §Codex execution shape` 에 단독 정의 → 여러 스킬이 spec-and-review 를 경유하는 비효율.
1차 해결: handoff 신설 → spec-and-review + large-task-delegation 이 handoff cross-ref.

### §3.2 본문 outline — 6 §section

1. `§Codex CLI 호출 패턴` — Plain text + JSON mode bash skeleton (kzk-spec-and-review 에서 verbatim 이전)
2. `§Hard rules 5종` — stdin pipe / NDJSON / --ephemeral / short-prompt exception / plain text preferred (verbatim 이전)
3. `§Timeout + stuck detection` — 60s / 5min 규칙 (verbatim 이전)
4. `§Fallback 사다리 (E1-E4)` — 4행 표
5. `§Fresh subagent 호출 패턴` — explore sonnet dispatch, 메인 직접 vs subagent 차이
6. `§Prompt size guideline` — prompt < 500 lines, 응답 < 700 단어 등 (kzk-spec-and-review 에서 verbatim 이전)

---

## §4 새 스킬 본문 (SKILL.md draft)

### §4.1 Frontmatter

```yaml
---
name: kzk-codex-handoff
version: 1.0.0
description: "codex CLI 호출 SoT — 호출 패턴, Hard rules, Timeout, Fallback 사다리(E1-E4), Fresh subagent 패턴, Prompt size guideline. 모든 스킬이 codex 실행 시 본 스킬 cross-ref. Top triggers: 'codex CLI 호출', 'codex handoff', 'codex 안정화', 'codex exec'."
---

> Authoritative source: harness-share.md TBD. On conflict, that wins.
```

### §4.2 Triggers

meta-skill — 사용자 직접 trigger 보다 다른 스킬에서 cross-ref 로 자동 로드가 주 사용 경로.

사용자 직접 trigger 키워드 (소수): `codex CLI 호출`, `codex handoff`, `codex 안정화`, `codex exec`.

spec-and-review 의 기존 trigger (`codex review`, `cross-verify`, `codex consult`) 는 그대로 유지 — 본 스킬 trigger 와 중복 X (LOCKED 8).

### §4.3 §Codex CLI 호출 패턴

**Plain text mode (reviews 권장)**

```bash
# 1. Write prompt to file
cat > /tmp/<topic>-review-prompt.txt << 'EOF'
<prompt content>
EOF

# 2. Pipe stdin → codex exec, redirect stdout to file
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

**JSON mode (structured parsing 필요 시)**

```bash
cat /tmp/<topic>-review-prompt.txt \
  | codex exec \
    -s read-only --ephemeral \
    -C <repo-root> \
    --json \
    - \
    2>/tmp/codex-err.txt \
    > /tmp/codex-out.json

# NDJSON → jq (file redirect 필수, direct pipe 금지)
jq -r 'select(.type == "item.completed" and .item.type == "agent_message") | .item.text' \
  /tmp/codex-out.json > /tmp/codex-out.txt
```

### §4.4 §Hard rules 5종 (verbatim — kzk-spec-and-review 에서 이전)

1. **Prompt via stdin pipe** (`cat file | codex exec ... -`). Never pass multi-line prompt as `codex exec "$VAR"` — shell escaping breaks on newlines, quotes, backticks.
2. **`--json` output → file → jq**. Never `--json | jq` direct pipe — codex emits NDJSON, jq expects single JSON and chokes.
3. **`--ephemeral`** always — prevents session file accumulation from automated runs.
4. **Short single-line prompt exception**: `codex exec "short prompt" < /dev/null` is safe. Multi-line → always use stdin pipe.
5. **Plain text mode preferred** for review use cases — simpler, no NDJSON parsing needed. Use JSON mode only when you need structured fields (token counts, thread IDs).

### §4.5 §Timeout + stuck detection (verbatim — kzk-spec-and-review 에서 이전)

- `timeout: 300000` (5 min). Background-monitor per `kzk-background-monitoring`.
- No first token in **60s** → kill + retry once.
- No output in **5 min total** → stuck, kill + fallback to critic agent.

### §4.5b Preflight (codex 호출 직전 환경 점검)

자가-점검 (self-check, Phase 2 영역) 과 구분 — 본 preflight 는 codex CLI 자체 환경 sanity check.

3 항목 점검 (1초 안에 완료):
1. `which codex` — CLI 미설치 시 즉시 fail
2. `codex --version` — 0.128.0+ 확인 (이하 버전은 stdin pipe / NDJSON 동작 차이)
3. sandbox 권한 확인 — `-s read-only` flag 사용 가능 검증 (실패 시 권한 상승 필요 안내)

preflight fail (E0) → retry X, 사용자에게 환경 안내 + critic opus fallback. 호출 자체 차단.

### §4.6 §Fallback 사다리 (E0-E4)

1차 codex review Cat 4 fix: E4 (일반 실패) 추가 — E2 (즉시 종료 + 무 stderr) 와 구분. Cycle 2 fix: E0 (Preflight fail) 신설 + E2/E4 detection 강화.

| E# | Trigger | Detection | Retry | Fallback |
|---|---|---|---|---|
| **E0** | **Preflight fail (NEW)** | which/version/sandbox 어느 하나 fail | retry X | 사용자 환경 안내 + critic opus |
| E1 | timeout | wall > 300s | 1 retry | critic opus |
| E2 | 즉시 종료 + 무 stderr | exit ≠ 0 AND stderr ≤ 1 byte AND wall < 2s | retry X | critic opus |
| E3 | 빈 응답 | exit 0 AND stdout 0 byte | 1 retry | critic opus |
| E4 | 일반 실패 | exit ≠ 0 AND (stderr > 1 byte OR wall ≥ 2s) | 0 retry | stub stderr 첫 200 char + critic opus |

E2 detection 강화: `stderr ≤ 1 byte` + `wall < 2s` 조합 — race condition / buffering 회피 (구 기준 `stderr 0 byte` 는 newline 1바이트로 E4 오분류 위험).
E4 detection 강화: E2 와 OR 분기로 stderr 0 byte 라도 wall ≥ 2s 면 E4 분류.

**공통 fallback 규칙**: fallback critic opus 응답도 verdict file 에 저장 (chat history 만으로는 불충분). model 생략 → 메인 opus 버전 상속.

### §4.7 §Fresh subagent 호출 패턴

메인이 직접 codex exec 호출 시 메인 컨텍스트 블로킹 + 오염. 기본 경로 = **fresh subagent dispatch**.

```typescript
// ✅ 기본 — explore sonnet 안에서 codex 실행
Agent({
  subagent_type: 'oh-my-claudecode:explore',
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

**Subagent dispatch 자체 실패 처리** (cycle 1 review Cat 5(1) fix):

dispatch fail (no response / timeout / subagent type unavailable) → `kzk-large-task-delegation §Stage 3 Q-VERIFIER-DISPATCH-FAIL` 패턴 재사용. fallback path: 메인 직접 codex 호출 (subagent 한 layer 우회 — 메인 컨텍스트 보호 가치 < dispatch 실패 frequency 일 때만). 그것도 실패 시 critic opus fallback. user-queue entry `Q-CODEX-DISPATCH-FAIL` 등록.

### §4.8 §Prompt size guideline (verbatim — kzk-spec-and-review 에서 이전)

큰 prompt = codex stdin 대기 또는 5min stuck 위험.

- **Read 의무** = 검토 대상 plan/spec 본문 + cycle N-1 verdict 정제 파일만. sister plan 본문은 context only (인용 / locked decision 만 inline, full read 금지).
- **prompt 본문 < 500 lines**. 카테고리 12개 → 6-8 max.
- **응답 형식 < 700 단어**. "각 항목 짧은 진단 + 권고" 명시.
- **plan 본문 1500+ LoC** → codex 가 read 만 5+ 분 → 미리 핵심 변경 부분만 발췌해서 prompt 에 inline. plan 전체 read 시키지 않음.

지표 (다음 중 하나 trigger 시 size 줄임 후 재시도):
- prompt > 800 lines
- "Read 의무" 4+ 파일
- 검증 카테고리 12+

### §4.9 Cross-ref

- `kzk-spec-and-review` — §Codex prompt skeleton / §Verdict file convention / §Cost/cadence / §Artifact retention / §Anti-patterns / §Interaction 은 spec-and-review 에 유지. 본 스킬은 "어떻게 실행하는가" SoT.
- `kzk-large-task-delegation §Pre-implementation plan-critic loop` — codex 호출 줄은 본 스킬 cross-ref.
- `kzk-background-monitoring` — 5min stuck 감지는 background-monitoring 위임.

---

## §5 kzk-spec-and-review 본문 분리 (LOCKED 3)

### §5.1 분리 대상 — verbatim section heading

제거 대상 (spec-and-review SKILL.md 에서 본문 삭제):

1. `## Codex execution shape (CLI best practice)` 전체 — Plain text mode bash skeleton + JSON mode bash skeleton + Hard rules 5종 + Timeout + stuck detection
2. `## Prompt size guideline (codex CLI timeout 차단)` 전체

### §5.1b 내부 anchor 전수 갱신 (T0 prerequisite)

spec-and-review SKILL.md 내부에 `Codex execution shape` 또는 `Prompt size guideline` 을 인용하는 다른 §section 이 있을 수 있음. 본문 제거 시 anchor 붕괴 위험.

T0 (Implementation plan §8 의 prerequisite task — T2 이전):
```bash
grep -n "Codex execution shape\|Prompt size guideline" /Users/kimzerokim/.claude/skills/kzk-spec-and-review/SKILL.md
```
모든 hit 을 cross-ref 로 update (`kzk-codex-handoff §<해당 section>`). T0 결과 0 hit 면 T0 NOOP 처리. T0 → T2 순서 강제.

### §5.2 spec-and-review 에 박을 cross-ref (제거 자리에 1줄 대체)

```markdown
## Codex consult — 호출 메커니즘
> See `kzk-codex-handoff` §Codex CLI 호출 패턴 / §Hard rules / §Timeout / §Prompt size guideline.
```

### §5.3 spec-and-review 에 남는 부분 (review-specific — 변경 X)

- `§Codex prompt skeleton` (IMPORTANT + 카테고리 구조)
- `§Verdict file convention` (경로 규칙, cycle counter)
- `§Cost / cadence` (~2-3 min, ~25-30k tokens)
- `§Artifact retention`
- `§Anti-patterns`
- `§Interaction with other kzk-*`

---

## §6 kzk-large-task-delegation cross-ref update (LOCKED 4)

### §6.1 §Pre-implementation plan-critic loop — codex 호출 줄 before/after

**Before** (현재 line 207):
```
Codex CLI consult on the plan draft (`codex exec` per `kzk-spec-and-review`) → returns concerns; CLI unavailable → `oh-my-claudecode:critic` opus
```

**After**:
```
Codex CLI consult on the plan draft (per `kzk-codex-handoff` §Codex CLI 호출 패턴) → returns concerns; CLI unavailable or E1-E4 fallback → `oh-my-claudecode:critic` opus
```

### §6.2 Model routing 표 — codex consult 줄 점검

`kzk-large-task-delegation §Model routing` 표 안 `see kzk-spec-and-review` cross-ref 가 있으면 `kzk-codex-handoff` 로 update.

---

## §7 파일 배치 + 카운트 update

### §7.1 keyword-detector.mjs

1차에 변경 X (LOCKED 8). 새 스킬 사용자 직접 trigger 소수라 detector 추가 불필요.

### §7.2 install/dependencies.md

`codex` CLI dep 행: owner = `kzk-spec-and-review` → `kzk-codex-handoff` 로 update.

### §7.3 AGENTS.md (skills/AGENTS.md)

새 스킬 1행 추가:
```
| kzk-codex-handoff | codex CLI 호출 SoT — 호출 패턴, fallback 사다리(E1-E4), fresh subagent 패턴 |
```

### §7.4 README.md + CLAUDE.md 카운트 17 → 18 (4곳)

| 파일 | 위치 | Before | After |
|---|---|---|---|
| `README.md` | line 3 (badge/title) | 17 | 18 |
| `README.md` | install command skill count | `17` | `18` |
| `CLAUDE.md` | line 3 (Active Skills 헤더) | `17` | `18` |
| `CLAUDE.md` | "All N skills" 문장 | `17` | `18` |

### §7.5 install-global.sh + verify-install.sh

두 파일 안 skill count assertion 17 → 18 update.

### §7.6 새 스킬 배치

`skills/kzk-codex-handoff/SKILL.md` — 글로벌 sync = install-global.sh 자동 cp 경로.

---

## §8 Implementation plan (frozen plan 시드)

| Task | 내용 | Executor |
|---|---|---|
| T0 | spec-and-review SKILL.md 내부 `Codex execution shape` / `Prompt size guideline` anchor 전수 grep + cross-ref update (sonnet executor — 정확). T2 prerequisite. | sonnet executor |
| T1 | `skills/kzk-codex-handoff/SKILL.md` 작성 — §4 draft 전체 | sonnet executor |
| T2 | `kzk-spec-and-review` SKILL.md — §Codex execution shape + §Prompt size guideline 본문 제거 + cross-ref 1줄 대체 | sonnet executor (정확한 줄 삭제 필요) |
| T3 | `kzk-large-task-delegation` SKILL.md — §Pre-implementation plan-critic loop cross-ref 1줄 update (§6.1 before/after) | haiku executor (mechanical 1-line) |
| T4 | `install/dependencies.md` — codex CLI dep owner 행 update | haiku executor |
| T5 | `skills/AGENTS.md` — 새 스킬 1행 추가 | haiku executor |
| T6 | README.md + CLAUDE.md 카운트 17 → 18 — 4곳 (§7.4) | haiku executor |
| T7 | install-global.sh + verify-install.sh 카운트 update (§7.5) | haiku executor |
| T8 | freshness-guard 통과 확인 + frontmatter parsing 검증 | sonnet |
| T9 | Stage 3 fresh-agent verification — acceptance criteria 충족 확인. Acceptance: §4.7 본문에 subagent dispatch 자체 실패 분기 명시 + Q-CODEX-DISPATCH-FAIL user-queue entry 정의 | verifier opus |
| T10 | commit — Gate 0-5 전부 통과 (main 직접) | — |
| T11 | `harness-flow-progress.md` cycle entry append | haiku executor |

---

## §9 Acceptance Criteria

- [ ] `skills/kzk-codex-handoff/SKILL.md` 존재, frontmatter 완비 (name, version=1.0.0, description, harness-share.md TBD reference)
- [ ] 6개 §section 모두 존재: §Codex CLI 호출 패턴 / §Hard rules 5종 / §Timeout + stuck detection / §Preflight + §Fallback 사다리 (E0-E4 5행 모두) / §Fresh subagent 호출 패턴 / §Prompt size guideline
- [ ] E0 (Preflight: which/version/sandbox) + E4 분기 명시 (`exit ≠ 0 AND stderr 비어있지 않음` — E2 와 구분, E2 detection 강화 `wall < 2s`)
- [ ] `kzk-spec-and-review` — `§Codex execution shape` + `§Prompt size guideline` 본문 제거 + cross-ref 1줄 존재
- [ ] `kzk-large-task-delegation §Pre-implementation plan-critic loop` — codex 호출 줄 cross-ref `kzk-codex-handoff` 로 update
- [ ] README.md + CLAUDE.md + install-global.sh + verify-install.sh 4곳 카운트 18
- [ ] `skills/AGENTS.md` 새 스킬 1행 추가 (파일 부재 시 NOOP)
- [ ] `harness-flow-progress.md` cycle entry

---

## §10 Out of scope (2차 cycle)

- 4 메타-갭 차단 룰 (FIX-LABEL / 자가-점검 ladder / 자동 위임 / Q-FIX-PIVOT-FAIL halt / kzk-fix-layer-pivot 스킬 / kzk-codex-consult 스킬)
- keyword-detector.mjs trigger 매핑 추가
- 반증 계측 (codex 호출 성공률 / 에러율 사용자 수동 기록)
- mattpocock/skills audit
- harness-share.md §N entry 신설 (1차는 새 스킬 self-authoritative. 2차 cycle 에서 update)

---

## §11 Verdict file path (codex review cycle 2 산출물)

`/Users/kimzerokim/work/personal/kzk-harness/docs/research/codex-reviews/codex-handoff-phase1-critic-review.md`
