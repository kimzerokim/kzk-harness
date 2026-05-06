# Cycle 47 — Combined Design (B2 + C1 + Y)

> Authoritative source: this doc until plans frozen. On conflict with plan files, this spec wins until rev'd.
> Survey report: docs/harness/surveys/2026-05-07-cycle-47-b2-c1-queue-survey.md
> Date: 2026-05-07
> Branch contract: main 직접 commit, PR X

---

## §1 Context and motivation

Cycle 46 (286bd7f) 은 CRG auto-refresh 정책 (session-first / multi-plan / post-commit) 을 완성했다.
Cycle 45/44 (830c3d5) 는 §33 Autonomous SoT + Batch D (hook 안정화) + freshness-guard path resilience 를 다뤘다.
Cycle 43 (6bd0bed) 은 §32 self-application + 압축 (-119 LoC) 이었다.

이번 cycle 47 은 **phase 2 첫 번째 배포** — codex-handoff-and-fix-layer-pivot-design.md §10 Out of scope 목록에서 가장 작은 범위를 골라 인라인 배포하는 B2, 외부 스킬 심사를 완료하는 C1, 그리고 user-queue 형식 기술 부채를 해소하는 Y — 세 sub-plan 을 단일 cycle 로 묶은 이유는 세 작업이 상호 의존성을 공유하기 때문이다 (B2 가 신규 Q-FIX-PIVOT-FAIL 을 생성하면 Y 의 producer table 이 그것을 수용해야 한다).

**왜 B2 (inline) 이지 B1 (새 스킬 kzk-fix-layer-pivot) 이 아닌가**: 설계 doc §10 은 kzk-fix-layer-pivot 신규 스킬을 Phase 2 후보로 열거했으나, survey 가 insertion anchor 를 확인한 결과 (L110 바로 앞, 총 144라인 SKILL.md 안에 여유 있음 — survey L64-68) 기존 스킬에 inline 하는 것이 단순하고 추가 카운트 bump 없이 달성 가능하다. KISS 원칙 적용.

**왜 C1 에서 HIGH 만 지금인가**: mattpocock/skills 의 MEDIUM 클러스터 (setup-matt-pocock-skills + to-issues + to-prd + triage + write-a-skill) 는 GitHub issue-tracker 워크플로 채택을 전제로 한다. kzk-harness 는 현재 그 워크플로가 없다. 선행 설치하면 미사용 스킬이 CLAUDE.md trigger table 을 오염시킨다 (YAGNI). `git-guardrails-claude-code` 만 HIGH 로 지금 설치 — kzk-autonomous-boundary 의 소프트 guardrail 을 OS-level 하드 블로커로 보완하기 때문이다 (survey L167).

---

## §2 Problems being solved

### B2 — Fix layer-pivot 메타갭 (Phase 2 첫 배포)

설계 doc §1.1 은 Tailscale 케이스에서 G1 (wrong-layer fix) + G2 (same-direction loop) + G3 (knowledge trap) + G4 (explanation > fix) 네 가지 메타갭을 기록했다. Phase 1 (codex-handoff) 은 codex CLI 호출 안정화만 배포했고, G1-G4 차단 룰은 명시적으로 §10 Out of scope 로 분류했다. cycle 47 의 B2 는 그 중 **layer-pivot 규칙 (G1/G2 직접 해소)** 만 kzk-fix-scope-expansion 에 inline 배포한다. G3/G4 의 전체 모델-바이어스 차단 (FIX-LABEL + kzk-codex-consult + 계측) 은 여전히 defer.

survey L62 가 규칙을 이미 초안 형태로 제시했다: "동일 레이어에서 같은 방향 fix 가 2회 연속 실패 시 → 한 레이어 바깥으로 escalate. L0 도달 후에도 실패 → Q-FIX-PIVOT-FAIL." 이 규칙이 현재 SKILL.md 에 없는 것이 구조적 gap 이다.

### C1 — mattpocock/skills 심사 완료 (HIGH 만 배포)

kzk-autonomous-boundary 는 소프트 guardrail (explicit OK 요구) 을 갖추고 있지만 PreToolUse hook 단에서 실제로 `git push --force`, `reset --hard`, `clean -f`, `branch -D`, `checkout .` 을 차단하는 OS-level 블로커가 없다. survey L167 확인: `git-guardrails-claude-code` 가 이 gap 을 채운다. 설치 방법은 GitHub fetch + 글로벌 설치이며 settings.json PreToolUse hook entry 가 필요하다.

MEDIUM 5종은 issue-tracker 워크플로 전제 조건이 충족될 때 설치. 현 cycle 에서는 NOT_USED 섹션 기록으로 backlog 처리.

### Y — user-queue.md 형식 기술 부채

harness-share.md §6 (L370-424) 는 entry 형식을 정의하고 "Resolved entries → `## Resolved` 섹션 이동" 이라고 명시한다. 그러나 실제 `docs/harness/user-queue.md` 는 8줄에 불과하고 OPEN/RESOLVED/NOT_USED 섹션이 없으며 Q-AUTONOMOUS-SOT 항목이 섹션 없이 인라인으로 기재되어 있다 (survey L199-214). 또한 kzk-user-queue SKILL.md producer table 이 7개 producer 만 기재하고 kzk-autonomous-boundary (5종 Q-entry), kzk-pre-commit-gate, kzk-codex-handoff 가 누락되어 있다 (survey L271-276 — P1 deficiency). kzk-web-loop 안에 5개의 raw `echo "Q-..." >>` 패턴이 있어 형식 변경 후 잘못된 섹션에 기록될 위험이 있다 (survey L289, L342).

---

## §3 Plan B2 — Fix layer pivot inline

### §3.1 Scope

- `skills/kzk-fix-scope-expansion/SKILL.md` — `## Fix layer pivot (Phase 2)` 섹션 추가 (L109 와 L110 사이)
- `~/.claude/skills/kzk-fix-scope-expansion/SKILL.md` — 동일 (install-global.sh cp 동기화)
- version 1.3.0 → 1.4.0
- cross-ref 파일 3종: kzk-autonomous-boundary (halt table), kzk-user-queue (producer table), harness-share.md §3.5 (언급 추가)

### §3.2 Insertion anchor

survey report L64-68: "After `## Gate 4.5` section (L88-L108), before `## 자가-skip guard` (L110). Rationale: Gate 4.5 is the post-fix sanity check. The new `## Fix layer pivot` section belongs between fix verification (Gate 4.5) and the skip/disable housekeeping sections."

SKILL.md section map (per survey L20-35):
```
## Gate 4.5      (L88–L108)
                  ← 삽입 지점 (L109 직전 빈 줄 뒤)
## 자가-skip guard (L110)
```

### §3.3 New section content (삽입할 마크다운 전문)

```markdown
## Fix layer pivot (Phase 2)

> Authoritative source: 현재 self-authoritative. harness-share.md §N 신설 시 그것이 우선.

### Operational definitions (added cycle 47)

- **"같은 방향 (same direction)"**: 두 연속 fix attempt 가 같은 root-cause label 을 공유한 경우. label 형식 = `<layer>:<symptom-key>` (예: `L1:tailscale-mtu-fragmentation`). label 충돌 시 = same direction.
- **"실패 (failure)"**: 다음 중 하나 — (a) 추가한 test 가 red 상태로 남음, (b) 사용자 보고 증상이 fix 후 동일 (변화 없음), (c) fix 후 30 초 내 동일 stack trace 재발. (a)(b)(c) 모두 검증 가능 신호.
- **레이어 라벨 사전** (L3 표 의미 = 본체 코드, 예시 텍스트 충돌 수정):
  - L0 = 외부 설정 / OS / 네트워크 / 인프라 (kubelet config, /etc/, route table)
  - L1 = wrapper / IaC / 배포 스크립트
  - L2 = SW 내부 설정 (config file, env var consumed by app)
  - L3 = 본체 application 소스 코드

### When to escalate

**Same-layer consecutive fail rule**: 동일 레이어에서 같은 방향 fix 가 2회 연속 실패 시 → 한 레이어 바깥으로 escalate.

Layer 계층 (바깥 → 안):

| 레이어 | 범위 예시 |
|---|---|
| **L0** | OS / 외부 환경 — route, DNS, firewall, env var, 시스템 권한 |
| **L1** | wrapper / middleware config — proxy, reverse-proxy, load balancer |
| **L2** | SW internal config — app config, feature flag, 설정 파일 |
| **L3** | SW core logic — 소스 코드, 알고리즘, 데이터 구조 |

탐색 순서: 문제가 발생한 레이어 → L0 방향으로 escalate.

**예시 (Tailscale 케이스)**: Claude 가 L3 (본체 소스 코드) 에서 2회 실패 → L2 (SW 내부 설정) 확인 → L1 (wrapper) 확인 → L0 (route add) 에서 1줄 fix 성공.

### Fix-verify hook 확장

Fix-verify hook (§Fix-verify hook 참조) 실행 후, 동일 레이어에서 2회 연속 실패 감지 시:

1. 현재 레이어 기록 (L0/L1/L2/L3)
2. 한 레이어 바깥으로 이동, 해당 레이어에서 원인 재조사
3. L0 도달 후에도 미해결 → `Q-FIX-PIVOT-FAIL` entry 를 `docs/harness/user-queue.md` `## OPEN` 섹션에 추가 후 halt

### Q-FIX-PIVOT-FAIL entry 형식

```markdown
- [ ] YYYY-MM-DD HH:MM — Q-FIX-PIVOT-FAIL — <함수명/증상> 모든 레이어 escalate 후 미해결 (cycle N)
```

상세 항목은 entry 아래 sub-list:
```markdown
  - Context: <증상 + 레이어별 시도 내역 (L3→L2→L1→L0)>
  - Tentative default: 사용자 직접 L0 환경 확인
  - Impact: 자율실행 halt — 레이어 전환 없이 진행 불가
```

### Anti-patterns (G1/G2/G4)

- G1: L3 단독 집중, L0 미검토 → layer 계층 순서대로 바깥부터 확인
- G2: 실패 후 동일 방향으로 variation 반복 2회 → 즉시 레이어 전환
- G4: "왜 안 되는지" 설명만 제공, 1줄 fix 미제공 → 진단은 sub-bullet, 첫 줄은 항상 실행 가능한 fix
```

### §3.4 Cross-refs to update

| 파일 | 변경 내용 |
|---|---|
| `~/.claude/skills/kzk-autonomous-boundary/SKILL.md` | `§Halt conditions` 표에 `Q-FIX-PIVOT-FAIL` 행 추가: Producer = `kzk-fix-scope-expansion`, Trigger = "L0 도달 후에도 fix 실패" |
| `~/.claude/skills/kzk-user-queue/SKILL.md` | Queue producers 섹션에 `kzk-fix-scope-expansion: Q-FIX-PIVOT-FAIL` 추가 (Plan Y §5.3 에서 통합 처리) |

> Note: `harness-share.md §3.5` edit deferred — see §7 Out of scope and edit #5 below.

### §3.4 Cross-ref status

| Sister skill | Current reference | Layer-pivot impact | Edit required |
|---|---|---|---|
| kzk-autonomous-boundary | halt table | Q-FIX-PIVOT-FAIL row addition | YES — add row |
| kzk-user-queue | producer table | Q-FIX-PIVOT-FAIL producer | YES — add row (handled by Plan Y, see §5.3) |
| kzk-pre-commit-gate L107 | Gate 4.5 procedure | none — Gate 4.5 unchanged | NO |
| kzk-codebase-survey L4/L280 | fix-start hub | none — pivot is internal to fix-scope | NO |
| kzk-autonomous-loop L59 | stale CRG anti-pattern | none — orthogonal | NO |
| kzk-regression-memory L141 | consumer of recall | none | NO |
| kzk-freshness-guard L116 | impact radius | none — read-only ref | NO |

Total Edit-required = 2 (autonomous-boundary halt table, user-queue producer table). Other 5 = mention-only.

### §3.5 Acceptance criteria

- **AC-B2-1**: `skills/kzk-fix-scope-expansion/SKILL.md` 와 `~/.claude/skills/kzk-fix-scope-expansion/SKILL.md` 양쪽에 `## Fix layer pivot (Phase 2)` 섹션이 존재한다 (grep 으로 확인 가능)
- **AC-B2-2**: 두 파일 모두 frontmatter `version: 1.4.0` 을 포함한다
- **AC-B2-3**: `~/.claude/skills/kzk-autonomous-boundary/SKILL.md` 에 `Q-FIX-PIVOT-FAIL` 문자열이 포함된다
- ~~**AC-B2-4**~~: harness-share.md §3.5 edit deferred to a future §N migration cycle (see §7). Removed from cycle 47 acceptance criteria.

### §3.6 Anti-patterns (이번 cycle 에서 빌드하지 않는 것)

survey L41-44, 설계 doc §10 참조:
- kzk-fix-layer-pivot 신규 스킬 — inline B2 로 대체 (B1 경로 폐기)
- kzk-codex-consult 스킬 — G3/G4 해소용, 계측 후 별도 cycle
- FIX-LABEL 자동 분류 — 계측 인프라 없으면 noise
- G2/G3/G4 full model-bias 차단 룰 — G1/G2 의 layer-pivot 만 이번 배포
- keyword-detector.mjs trigger 추가 — Phase 2 SoT 확립 후
- 반증 계측 (codex 호출 성공률 / 에러율) — 사용자 수동 기록 아직 없음

---

## §4 Plan C1 — mattpocock/skills audit + integration

### §4.1 Audit summary table (survey L139-192 요약)

| 스킬 | verdict | 이유 |
|---|---|---|
| `improve-codebase-architecture` | 이미 설치 (skip) | cycle 42 통합, `~/.claude/skills/` 존재 |
| `caveman` | 이미 설치 (skip) | symlink `~/.agents/skills/caveman` |
| `diagnose` | 이미 설치 (skip) | symlink |
| `grill-me` | 이미 설치 (skip) | symlink |
| `grill-with-docs` | 이미 설치 (skip) | symlink |
| `git-guardrails-claude-code` | **HIGH — 설치** | OS-level PreToolUse 블로커. kzk-autonomous-boundary 보완. |
| `to-issues` | MEDIUM — defer | issue-tracker 워크플로 미채택. setup-matt-pocock-skills 선제 필요 |
| `to-prd` | MEDIUM — defer | spec-and-review 와 트리거 겹침 위험. setup-matt-pocock-skills 선제 필요 |
| `triage` | MEDIUM — defer | GitHub issue workflow 필요. grill-with-docs 와 연동 |
| `write-a-skill` | MEDIUM — defer | skill-creator 이미 존재. YAGNI 경계 |
| `setup-matt-pocock-skills` | MEDIUM — defer (전제조건) | MEDIUM 클러스터 전체 선행 필요 |
| `tdd` | LOW — skip | kzk-test-coverage 와 트리거 충돌. autonomous-mode 미인식 |
| `zoom-out` | LOW — skip | kzk-codebase-survey + large-task-delegation 중복 |
| `prototype` | LOW — skip | UI/UX 전용. harness 워크플로와 무관 |
| `migrate-to-shoehorn` | LOW — skip | TS test 전용. kzk-harness TS test infra 없음 |
| `scaffold-exercises` | LOW — skip | 도메인 특수 (ai-hero course platform) |
| `setup-pre-commit` | LOW — skip | Node.js 전용. kzk-pre-commit-gate 와 계층 충돌 |
| `edit-article` | LOW — skip | 개인 문서 편집 도구. 적용 불가 |
| `obsidian-vault` | LOW — skip | 하드코딩된 vault 경로. 이식 불가 |

### §4.2 HIGH: git-guardrails-claude-code install

**설치 경로**: `~/.claude/skills/git-guardrails-claude-code/` (GitHub fetch, SKILL.md copy)

survey L167: "Sets up PreToolUse hook blocking `git push`, `reset --hard`, `clean -f`, `branch -D`, `checkout .`. Project or global scope."

**settings.json hook entry** (survey L320-327 기반):
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/block-dangerous-git.sh"
          }
        ]
      }
    ]
  }
}
```

`~/.claude/hooks/block-dangerous-git.sh` — 스크립트 내용:
```bash
#!/usr/bin/env bash
# git-guardrails-claude-code: block destructive git ops
INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

BLOCKED_PATTERNS=(
  "git push --force"
  "git push -f"
  "git reset --hard"
  "git clean -f"
  "git branch -D"
  "git checkout \."
  "git checkout -- \."
)

for PATTERN in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$CMD" | grep -qE "$PATTERN"; then
    echo "{\"decision\": \"block\", \"reason\": \"[git-guardrails] destructive git op blocked: $PATTERN. Explicit user OK required per kzk-autonomous-boundary.\"}"
    exit 0
  fi
done

echo "{\"decision\": \"approve\"}"
```

**hook 등록 위치**: `~/.claude/settings.json` 의 기존 `hooks.PreToolUse` 배열에 Bash matcher entry 추가. 기존 entry 가 있으면 배열에 append.

**중요 검증 — 정상 push 미차단**: `git push` (flags 없음), `git push origin main` 은 패턴 매칭 불통과 → approve. 자율 모드의 일반 push 흐름에 영향 없음.

### §4.3 MEDIUM cluster (defer)

5종 (`setup-matt-pocock-skills`, `to-issues`, `to-prd`, `triage`, `write-a-skill`) — 이번 cycle 에서 설치하지 않는다.

**이유**: issue-tracker 워크플로 미채택 + `setup-matt-pocock-skills` 가 `docs/agents/` 신규 디렉토리 + CLAUDE.md `## Agent skills` 블록을 생성하는데 이것은 현재 kzk-harness scope 외부.

처리: Plan Y `## 사용하지 않음 (NOT_USED)` 섹션에 기록 (§5 참조).

### §4.4 LOW (영구 skip)

8종 (`tdd`, `zoom-out`, `prototype`, `migrate-to-shoehorn`, `scaffold-exercises`, `setup-pre-commit`, `edit-article`, `obsidian-vault`) — 영구 skip. NOT_USED 섹션에 한 줄씩 이유 기록.

### §4.5 Acceptance criteria

- **AC-C1-1**: `~/.claude/skills/git-guardrails-claude-code/SKILL.md` 가 존재한다
- **AC-C1-2**: `~/.claude/settings.json` 의 `hooks.PreToolUse` 에 `block-dangerous-git.sh` 를 참조하는 Bash matcher entry 가 존재한다
- **AC-C1-3**: `bash -c 'echo "{\"tool_input\":{\"command\":\"git push --force\"}}" | bash ~/.claude/hooks/block-dangerous-git.sh'` 실행 시 `"decision": "block"` 이 출력된다
- **AC-C1-4**: `docs/harness/user-queue.md` `## 사용하지 않음 (NOT_USED)` 섹션에 MEDIUM 5종 + LOW 8종 (총 13개) 항목이 이유와 함께 기록된다

---

## §5 Plan Y — user-queue.md format strengthening

### §5.1 New file format (전문 template)

```markdown
# User Queue

> 시간 역순 — 최신 entry 위. 작업 끝 시 `- [x]` 체크.

## OPEN

_(없음)_

## RESOLVED

- [x] 2026-05-06 — Q-AUTONOMOUS-SOT — autonomous-mode detection SoT 신설, harness-share.md §33 (cycle 44)

## 사용하지 않음 (NOT_USED)

_mattpocock/skills MEDIUM cluster (cycle 47 C1 심사 결과 defer):_
- [ ] MEDIUM — setup-matt-pocock-skills — issue-tracker 워크플로 미채택 시 설치 불가 (전제조건 스킬)
- [ ] MEDIUM — to-issues — setup-matt-pocock-skills 선제 필요 + issue-tracker workflow 미채택
- [ ] MEDIUM — to-prd — kzk-spec-and-review 와 트리거 겹침, setup-matt-pocock-skills 선제 필요
- [ ] MEDIUM — triage — GitHub issue workflow 필요, grill-with-docs 연동 필요
- [ ] MEDIUM — write-a-skill — skill-creator (oh-my-claudecode) 이미 존재 (YAGNI)

_mattpocock/skills LOW cluster (cycle 47 C1 심사 결과 영구 skip):_
- [ ] LOW — tdd — kzk-test-coverage 와 트리거 충돌, autonomous-mode 미인식
- [ ] LOW — zoom-out — kzk-codebase-survey + kzk-large-task-delegation 중복
- [ ] LOW — prototype — UI/UX 전용, harness 워크플로와 무관
- [ ] LOW — migrate-to-shoehorn — TS test 전용, kzk-harness TS test infra 없음
- [ ] LOW — scaffold-exercises — ai-hero course platform 도메인 특수
- [ ] LOW — setup-pre-commit — Node.js 전용, kzk-pre-commit-gate 와 계층 충돌
- [ ] LOW — edit-article — 개인 문서 편집 도구, 적용 불가
- [ ] LOW — obsidian-vault — 하드코딩된 vault 경로, 이식 불가
```

### §5.2 Migration plan (기존 entry → 신규 섹션)

survey L218-244 가 마이그레이션 플랜을 완전히 제시했다.

| 기존 entry | 현재 상태 | 이동 대상 |
|---|---|---|
| Q-AUTONOMOUS-SOT | 인라인 resolved note (섹션 헤더 없음) | `## RESOLVED` |

기존 파일 내용 (L211) 은 완전히 대체. timestamp HH:MM 은 날짜만 알려져 있으므로 (`2026-05-06`) HH:MM 생략 형식 채택.

### §5.3 Producer table update (kzk-user-queue SKILL.md)

survey L248-276 이 현재 producer map 과 gap 을 완전히 매핑했다. 현재 기재된 7개 producer 에서 누락된 항목들을 추가한다.

**추가할 producer 행:**

| Q-entry | Producer skill | Trigger |
|---|---|---|
| `Q-TDD-MAIN` | `kzk-autonomous-boundary` (공동 — kzk-test-coverage 와 함께) | 자율 mode 에서 메인이 TDD red 직접 진입 시도 |
| `Q-MAIN-DIRECT-EDIT` | `kzk-autonomous-boundary` | 자율 mode 에서 메인 컨텍스트 직접 multi-file edit |
| `Q-VERIFIER-FAIL` | `kzk-autonomous-boundary` + `kzk-large-task-delegation` + `kzk-pre-commit-gate` | verifier 2회 연속 FAIL |
| `Q-VERIFIER-INVALID` | `kzk-autonomous-boundary` + `kzk-large-task-delegation` + `kzk-pre-commit-gate` | verifier 응답 `VERDICT:` prefix 누락 |
| `Q-VERIFIER-DISPATCH-FAIL` | `kzk-autonomous-boundary` + `kzk-large-task-delegation` + `kzk-pre-commit-gate` | verifier subagent dispatch 실패 |
| `Q-CODEX-DISPATCH-FAIL` | `kzk-codex-handoff` + `kzk-autonomous-boundary` | codex subagent dispatch 실패 |
| `Q-PROD-CODE-FIRST-<TOPIC>` | `kzk-production-access` + `kzk-pre-commit-gate` | 프로덕션 state 변경 code-first check 실패 |
| `Q-FIX-PIVOT-FAIL` | `kzk-fix-scope-expansion` | 모든 레이어 escalate 후에도 fix 실패 (cycle 47 신규) |
| `Q-FILE-MISSING-<basename>` | `kzk-freshness-guard` (SKILL.md L82) | reference 파일이 사라졌을 때 |
| `Q-PW-OAUTH-NEW-ACCOUNT` | `kzk-playwright-verification` (SKILL.md L39) | cached OAuth account 없을 때 Google sign-in 화면 |
| `Q-AUTOLOOP*` | `kzk-autonomous-loop` (SKILL.md L80) | loop 일시 정지 시 |

### §5.4 kzk-web-loop section-aware writes

survey L289, L342 확인 결과 재검증: kzk-web-loop SKILL.md 안에 raw `echo "Q-..." >> docs/harness/user-queue.md` 패턴은 **1개** 존재 (survey 의 "5개" 표기는 과다 계산 오류 — 향후 audit 시 grep 으로 직접 검증 후 수 기재).

해당 1개 패턴 (`skills/kzk-web-loop/SKILL.md` L119):
```bash
echo "Q-PLUGIN-PREFLIGHT — claude plugin subcommand unavailable ($(cat /tmp/plugin-err.txt | head -1)), pre-flight skipped" >> docs/harness/user-queue.md
```

새 포맷에서는 `## OPEN` 섹션 바로 아래에 삽입해야 한다.

**교체 패턴** (section-aware insert after `## OPEN` header):

```bash
# Before (raw append — 섹션 무관, L119)
echo "Q-PLUGIN-PREFLIGHT — ..." >> docs/harness/user-queue.md

# After (section-aware — ## OPEN 바로 아래 삽입)
ENTRY="- [ ] $(date '+%Y-%m-%d %H:%M') — Q-PLUGIN-PREFLIGHT — claude plugin subcommand unavailable ($(cat /tmp/plugin-err.txt | head -1)), pre-flight skipped"
# ## OPEN 헤더 다음 줄에 삽입 (awk insert-before-pattern)
awk '/^## OPEN$/{print; print ENTRY; next} 1' ENTRY="$ENTRY" docs/harness/user-queue.md > /tmp/uq.tmp && mv /tmp/uq.tmp docs/harness/user-queue.md
```

kzk-web-loop SKILL.md 에서 해당 1개 패턴을 위 section-aware write 로 교체. `_(없음)_` placeholder 처리: 첫 entry 삽입 시 placeholder 줄 제거 필요.

> **Note**: survey report (L289) 의 "5개" 수치는 과다 계산. grep 재검증 결과 1개만 확인됨. 향후 유사 audit 시 수치 기재 전 `grep -n 'echo.*Q-.*>>' skills/*/SKILL.md` 직접 실행 권장.

**전체 helper 패턴** (SKILL.md 에 inline 으로 기재):
```bash
# user-queue.md OPEN 섹션에 entry 추가하는 helper
kzk_queue_add() {
  local entry="$1"
  local qfile="docs/harness/user-queue.md"
  # placeholder 제거
  sed -i '' '/^_(없음)_$/d' "$qfile"
  # ## OPEN 다음 줄에 삽입
  sed -i '' "/^## OPEN$/a\\
$entry" "$qfile"
}
```

### §5.5 harness-share.md §6 update

harness-share.md §6 (L370-424) 는 현재 `### Entry 형식` 에서 checkbox 없는 `### Q-<TOPIC>` heading 형식을 정의한다. 새 포맷 도입 후 §6 를 업데이트:

1. `### Entry 형식` 에 인라인 체크박스 형식 추가:
   ```markdown
   - [ ] YYYY-MM-DD HH:MM — Q-<TOPIC> — <한 줄 요약> (cycle N)
   ```
2. "Resolved entries → `## Resolved` 섹션 이동" 문장을 `## RESOLVED` (대문자) 로 통일
3. `## 사용하지 않음 (NOT_USED)` 섹션 설명 추가 (미채택/defer backlog 용도)
4. 파일 위치 note: "시간 역순 — 최신 entry 위" 정책 명시

기존 `### Q-<TOPIC>` heading 형식은 상세 entry 형식 (Context/Options/Tentative default/Override/Impact) 로 존재를 유지 — 상세 내용이 필요한 complex entry 에 계속 사용. 체크박스 one-liner 는 간단한 entry 용도.

### §5.6 Acceptance criteria

- **AC-Y-1**: `docs/harness/user-queue.md` 가 `## OPEN`, `## RESOLVED`, `## 사용하지 않음 (NOT_USED)` 세 섹션을 포함하고 Q-AUTONOMOUS-SOT 가 RESOLVED 에 체크박스(`- [x]`) 형태로 있다
- **AC-Y-2**: `~/.claude/skills/kzk-user-queue/SKILL.md` 의 producer table 이 `Q-FIX-PIVOT-FAIL` 포함 위 §5.3 의 8개 신규 행을 모두 포함한다
- **AC-Y-3**: `~/.claude/skills/kzk-web-loop/SKILL.md` 안에 `echo "Q-" >>` 패턴이 0개이다 (grep 확인)
- **AC-Y-4**: `harness-share.md §6` 에 `## OPEN` / `## RESOLVED` / `## 사용하지 않음 (NOT_USED)` 섹션이 언급되고, 체크박스 entry 형식이 정의되어 있다

---

## §6 Sequencing and dependencies

```
B2 먼저
  └─ kzk-fix-scope-expansion 에 Q-FIX-PIVOT-FAIL producer 추가
      └─ Y 의 producer table update 시 Q-FIX-PIVOT-FAIL 포함 가능 (의존)

Y 두 번째
  └─ harness-share.md §6 update (authoritative source 먼저)
      └─ kzk-user-queue SKILL.md update (§6 기준으로 format 정의)
          └─ kzk-web-loop raw append 교체
              └─ docs/harness/user-queue.md 실제 migration

C1 세 번째
  └─ 독립. B2/Y 완료 여부에 관계없이 실행 가능.
     단, C1 의 NOT_USED 항목은 docs/harness/user-queue.md 신규 포맷 파일에 기록하므로
     Y의 AC-Y-1 이 먼저 충족되어야 올바른 섹션에 기록됨.
```

**결론**: 실행 순서 = B2 → Y → C1.

harness-share.md §6 update 가 Y 의 첫 단계 (survey L295-299 "Critical path: §6 먼저"). B2 가 생성하는 Q-FIX-PIVOT-FAIL 을 Y producer table 에 포함하므로 B2 가 Y 앞. C1 은 Y 의 user-queue.md 포맷 완성 후 NOT_USED 기록.

---

## §7 Out of scope (cycle 47 명시적 비목표)

- **Plan B1** (kzk-fix-layer-pivot 신규 스킬) — B2 inline 으로 대체 결정. 스킬 카운트 bump 없음.
- **Plan A1** (kzk-autonomous-boundary + kzk-autonomous-loop 병합) — 과공학 risk. 다음 cycle 이후.
- **C1 MEDIUM cluster 설치** — issue-tracker 워크플로 미채택. future cycle.
- **G2/G3/G4 full model-bias 차단 룰** — layer-pivot (G1/G2 부분) 만 이번 배포. G3/G4 는 계측 후.
- **FIX-LABEL 자동 분류** — 계측 인프라 없음.
- **kzk-codex-consult 스킬** — 설계 doc §10 defer.
- **harness-share.md §N 신규 섹션** (layer-pivot 전용) — 현재 self-authoritative; Phase 3 에서 신설.
- **keyword-detector.mjs layer-pivot trigger 추가** — Phase 2 SoT 확립 전 보류.

---

## §8 Risks

**R1 — B2 layer-pivot G1-G4 불완전 커버리지**
이번 배포는 G1 (wrong-layer) + G2 (same-direction loop) 만 직접 해소. G3 (knowledge trap) + G4 (explanation > fix) 는 계측 후 별도. 이 제한을 §3.6 anti-patterns 에 명시 (허용 범위 내).

**R2 — C1 git-guardrails 와 자율 모드 정상 push 충돌**
자율 모드에서 PR-flow 시 `git push origin <branch>` 가 블록되면 안 된다. §4.2 의 패턴 매칭이 `--force`/`-f` flag 포함 여부를 정확히 구분하는지 AC-C1-3 으로 검증. 추가 검증: `echo '{"tool_input":{"command":"git push origin main"}}' | bash ~/.claude/hooks/block-dangerous-git.sh` → `"decision": "approve"` 확인.

**R3 — Y format migration window 에서 kzk-web-loop raw append 충돌**
migration 을 단일 commit 으로 처리해야 한다 (survey L342: "execute Y plan in single commit"). Y executor 는 harness-share §6 update + kzk-user-queue SKILL.md + kzk-web-loop SKILL.md + docs/harness/user-queue.md 를 모두 하나의 작업 단위로 처리.

**R4 — kzk-user-queue SKILL.md producer table 중복 추가**
kzk-autonomous-boundary, kzk-pre-commit-gate 이미 partial 기재 가능성. executor 는 추가 전 grep 으로 기존 내용 확인 후 중복 없이 병합.

---

## §9 Code Quality Discipline (harness-share.md §32 mandatory inline)

### DRY
- **B2**: layer-pivot 룰이 다른 스킬에 이미 partial 기재되었는지 확인. `grep -rn "layer.pivot\|같은 방향.*실패\|레이어.*escalate" ~/.claude/skills/` → 기존 없음 (survey 확인). 단일 SoT = kzk-fix-scope-expansion `## Fix layer pivot`.
- **Y**: producer table 단일 SoT = kzk-user-queue SKILL.md. harness-share.md §6 에는 포맷 정의만, producer 목록은 SKILL.md 에만.

### YAGNI
- G3/G4 모델 바이어스 차단 룰 미포함 (§7 Out of scope 에 명시).
- write-a-skill, setup-matt-pocock-skills 설치 안 함 — issue-tracker 워크플로 미필요.
- 3섹션 포맷 (OPEN/RESOLVED/NOT_USED) — 5섹션이 아닌 이유: Escalated, Archived 는 지금 없는 entry 유형.

### KISS
- layer-pivot 은 4 레이어 (L0-L3) 단순 계층 — 7레이어 세분화 없음.
- user-queue 포맷은 3섹션 — 추가 메타 필드 없음.
- git-guardrails hook 은 단순 grep 기반 — AST 파싱, 복잡한 파서 없음.

### Deletion test
- `## Fix layer pivot (Phase 2)` 제거 시: G1/G2 안티패턴 문서화 손실, Q-FIX-PIVOT-FAIL 발생 기준 소실 → justified (2개 이상 하류 의존).
- OPEN/RESOLVED/NOT_USED 섹션 제거 시: producer 가 올바른 위치에 기록 불가, kzk-web-loop section-aware write 무의미 → justified.
- git-guardrails hook 제거 시: destructive git op 소프트 guardrail 만 남음, OS-level 차단 소실 → justified.

### Depth
- layer-pivot 룰: shallow (2-fail-then-pivot + L0-L3) — depth 적절. 복잡한 상태기계 불필요.
- user-queue 포맷: 중간 depth (섹션 분류 + producer table + section-aware write) — 정당화: 현재 P1 deficiency 해소 + kzk-web-loop raw append 위험 제거.
- git-guardrails: shallow (grep 기반 차단) — depth 적절. 복잡한 git command 파서 필요 없음.

### Obsolete test detection
- `kzk-fix-scope-expansion` SKILL.md 기존 `## Rollback` 섹션 (L125): layer-pivot 추가 후 rollback 항목에 "layer-pivot 비활성: Phase 2 섹션 주석처리" 를 추가할지 검토. **판정**: 불필요 — layer-pivot 은 hook 이 아닌 문서 룰 (비활성 개념 없음).
- harness-share.md §6 기존 `### Entry 형식` `### Q-<TOPIC>` heading 형식: 신규 체크박스 one-liner 추가 후 기존 heading 형식은 "상세 entry" 로 유지. **dead section 없음**.

---

## §10 Implementation order

| # | Plan | 작업 | Executor |
|---|---|---|---|
| 1 | B2 | `skills/kzk-fix-scope-expansion/SKILL.md` — `## Fix layer pivot (Phase 2)` 섹션 삽입 (L109 뒤), version 1.3.0 → 1.4.0 | executor sonnet |
| 2 | B2 | `~/.claude/skills/kzk-fix-scope-expansion/SKILL.md` — 동일 변경 sync | executor sonnet |
| 3 | B2 | `~/.claude/skills/kzk-autonomous-boundary/SKILL.md` — halt table Q-FIX-PIVOT-FAIL 행 추가 | executor sonnet |
| 4 | Y | `harness-share.md §6` — 신규 포맷 (체크박스, 3섹션) 정의 update | executor sonnet |
| 5 | Y | `~/.claude/skills/kzk-user-queue/SKILL.md` — producer table 8개 신규 행 추가 (Q-FIX-PIVOT-FAIL 포함) | executor sonnet |
| 6 | Y | `~/.claude/skills/kzk-web-loop/SKILL.md` — raw `echo >>` 1개 (Q-PLUGIN-PREFLIGHT, L119) → section-aware write 교체 | executor sonnet |
| 7 | Y | `docs/harness/user-queue.md` — 신규 포맷으로 migration (3섹션 + C1 NOT_USED 항목 포함) | executor sonnet |
| 8 | C1 | GitHub 에서 `git-guardrails-claude-code` SKILL.md fetch + `~/.claude/skills/git-guardrails-claude-code/` 설치 | executor haiku |
| 9 | C1 | `~/.claude/hooks/block-dangerous-git.sh` 생성 (실행 권한 부여) + `~/.claude/settings.json` PreToolUse hook entry 추가 | executor haiku |
| 10 | — | kzk-pre-commit-gate full pass (Gate 0-4, Gate 2/3 = skip if no build/test) | — |
| 11 | — | AC 전체 확인 (AC-B2-1~3, AC-C1-1~4, AC-Y-1~4) | verifier |
| 12 | — | `harness-flow-progress.md` cycle 47 entry append | executor haiku |

---

## §11 Verification

### Per-plan 완료 후

**B2 완료 후**:
```bash
grep -n "Fix layer pivot" ~/.claude/skills/kzk-fix-scope-expansion/SKILL.md
grep "version:" ~/.claude/skills/kzk-fix-scope-expansion/SKILL.md | head -1  # 1.4.0
grep "Q-FIX-PIVOT-FAIL" ~/.claude/skills/kzk-autonomous-boundary/SKILL.md
grep "layer.pivot\|layer-pivot" harness-share.md
```

**Y 완료 후**:
```bash
grep -E "^## OPEN|^## RESOLVED|^## 사용하지 않음" docs/harness/user-queue.md
grep "Q-FIX-PIVOT-FAIL" ~/.claude/skills/kzk-user-queue/SKILL.md
grep 'echo.*Q-.*>>' ~/.claude/skills/kzk-web-loop/SKILL.md  # 0건이어야 함
```

**C1 완료 후**:
```bash
ls ~/.claude/skills/git-guardrails-claude-code/SKILL.md
grep "block-dangerous-git" ~/.claude/settings.json
echo '{"tool_input":{"command":"git push --force origin main"}}' | bash ~/.claude/hooks/block-dangerous-git.sh
echo '{"tool_input":{"command":"git push origin main"}}' | bash ~/.claude/hooks/block-dangerous-git.sh
```

### 전체 완료 후

- kzk-pre-commit-gate Gate 0 (AGENTS.md hierarchy 없음 → N/A), Gate 1 (ai-slop-cleaner), Gate 1.5 (secrets scan), Gate 2/3 (빌드 없음 → N/A), Gate 4 (UI 변경 없음 → N/A) 적용
- `harness-flow-progress.md` cycle 47 entry 확인
