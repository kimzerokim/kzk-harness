---
topic: kzk-global-install
status: frozen
authors: planner-opus
date: 2026-05-04
reviewers: [codex, critic-opus]
revision: codex-timeout-critic-opus-fallback-applied
related:
  - docs/plans/2026-05-03-kzk-web-loop-design.md
  - docs/plans/2026-05-04-kzk-codebase-survey-design.md
---

# kzk-harness Global Install Design

## 1. Background

### 1.1 The defect (verbatim user report — 2026-05-04)

> 다른 레포에서 "스펙파일들 ralph로 하나하나 체크하면서 제대로 구현되었나 + 버그 전수조사" 같은 요청을 했더니 메인 에이전트가 비싼 opus로 직접 코드를 광범위하게 read 하면서 진행했다. → kzk-* 스킬이 하나도 트리거되지 않은 것이 문제. 그리고 "kzk 설치 스크립트를 사용자 글로벌로 설치하게 바꿔줘. gstack, superpowers, omc 등의 설치 스크립트를 면밀하게 리서치하고, 얘네들처럼 잘 트리거될 수 있게 해줘. 그리고 docs/harness 등 프로젝트 진행상황 문서 만드는건 지금처럼 프로젝트 루트 아래에 만들어주게."

### 1.2 Trigger gap analysis (research result A)

- **(a) 발언 ↔ 스킬 매칭** — "ralph로" 일부만 약하게 매칭. "스펙파일 체크 / 구현 검증 / 버그 전수조사 / 마무리 해줘" 는 Cycle 21/23 keyword 추가 이전에는 매칭 0 이었음.
- **(b) 글로벌 설치 상태** — `~/.claude/CLAUDE.md` 에 kzk-* 표 없음, `~/.claude/skills/` 아래 kzk-* 디렉토리 없음. 인용 발언 시점 다른 레포에서 kzk 스킬 자체가 비활성.
- **(c) Claude Code skill discovery 경로** — `~/.claude/skills/<name>/SKILL.md` (user-global), `<project>/.claude/skills/<name>/SKILL.md` (project), 그리고 plugin scope (`~/.claude/plugins/cache/<plugin>/<ver>/skills/`). 현재 install flow 는 마지막 2개 layer 만 채움.
- **(d) Cycle 21/23 후 키워드 커버리지** — README/CLAUDE.md 의 새 trigger 가 "버그 전수조사 / 구현 검증 / ralph로 체크" 등을 커버. 단 다른 레포에 install 안 되어 있으면 의미 없음.
- **(e) 핵심 결론** — 인용 발언이 kzk-* 를 트리거 못 한 1차 원인은 **stub 자체가 다른 레포 컨텍스트에 존재하지 않은 것**. 키워드 미매칭은 부차적.

### 1.3 Install + trigger mechanism comparison (research result B)

| 항목 | gstack | superpowers | omc |
|---|---|---|---|
| 설치 방식 | `git clone` + `./setup` | `/plugin install superpowers@claude-plugins-official` | `/plugin marketplace add` + `/plugin install` |
| 설치 위치 | `~/.claude/skills/gstack/` | `~/.claude/plugins/cache/.../superpowers/<ver>/` | `~/.claude/plugins/cache/.../oh-my-claudecode/<ver>/` |
| Claude 진입점 | SKILL.md 자동 스캔 + `~/.claude/CLAUDE.md` 의 `## Skill routing` 섹션 자동 주입 | SessionStart 훅 (`startup`/`clear`/`compact`) → `using-superpowers/SKILL.md` 전체를 시스템 컨텍스트에 주입 | UserPromptSubmit 훅 (`*`) → `keyword-detector.mjs` (ralph/autopilot/ulw/ccg) + `skill-injector.mjs` |
| Hooks 사용 | 없음 | SessionStart 1개 | SessionStart / UserPromptSubmit / PreToolUse / PostToolUse / Stop / PreCompact / SessionEnd 전체 |
| CLI 진입점 | `gstack-config`, `gstack-slug`, `$B` 다수 | 없음 | `omc`, `oh-my-claudecode`, `omc-cli` |
| Per-project artifact | 없음 (글로벌만) | 없음 (글로벌만) | `.omc/` 디렉토리 (state / sessions / notepad / project-memory / plans / research / logs) |
| Per-session 비용 | 0 (CLAUDE.md 라우팅만) | SessionStart 마다 SKILL.md 인라인 (~kb 단위) | SessionStart + UserPromptSubmit hook latency 매 prompt |

**Recommendation (research B 가 인용한 결론):** gstack 방식 (git clone → `~/.claude/skills/kzk-harness/` 또는 per-skill dir + `~/.claude/CLAUDE.md` 라우팅 주입) 베이스. UserPromptSubmit keyword hook 은 후속 옵션 (Section 7.5).

이유: plugin marketplace 가입 없이 동작 / 사용자 이미 이해하는 구조 / `~/.claude/skills/` 자동 스캔 / per-project state 분리 / omc SessionStart 같은 매-세션 컨텍스트 비용 회피.

위험: `~/.claude/CLAUDE.md` 충돌 (omc / gstack 라우팅과 공존), UserPromptSubmit hook latency, `~/.claude/skills/` 가 Anthropic 공식 사양이 아닌 관례 경로 (Section 11 risk 항).

### 1.4 Why this matters now

- 사용자는 다중 레포 워크플로우. kzk-harness 의 자가개선 레포 외부 (예: 외부 프로덕션 레포) 에서 spec 검증·버그 전수조사 작업이 자주 일어남.
- 그런 작업이 메인 컨텍스트가 직접 opus 로 광범위 read 하는 패턴으로 새는 이유가 모두 (b) — 설치 부재 — 에서 옴.
- 메타 갭 (kzk-harness 자가개선 루프 자체에서 자체 스킬을 안 부른 패턴) 은 Cycle 22 fix 로 일부만 메움. spec 단계에서 self-trigger 가이드 정식 편입 필요 (Section 10).

## 2. Goals

| # | Goal | 측정 기준 |
|---|---|---|
| G1 | 글로벌 설치 — 다른 레포에서도 kzk-* 가 메인 컨텍스트에 자동 로드 | 새 디렉토리에서 `claude` 시작 → `~/.claude/CLAUDE.md` 의 kzk routing 섹션이 in-context 보이고 trigger 발화 시 SKILL.md 매칭 |
| G2 | 프로젝트 진행 문서는 프로젝트 루트 유지 | `harness-flow-progress.md`, `docs/harness/`, `.web-loop/`, `.omc/`, `docs/research/codex-reviews/` 가 글로벌 설치 후에도 `$PWD` 기준으로 작성됨 |
| G3 | 자연 발화 트리거 가능 | gstack/superpowers/omc 와 동등한 trigger 정확도 — 사용자가 설치된 레포 안에서 "spec 잡자", "ralph로 체크", "버그 전수조사" 등 발화 시 해당 스킬이 메인 컨텍스트에 활성 |
| G4 | 자가개선 루프 self-trigger | spec 자체에 "메타 갭 방지" self-trigger 매트릭스 (Cycle 22 reminder) 정식 편입. README + CLAUDE.md 와 1:1 일치 |
| G5 | Idempotent install / update / uninstall | 동일 명령 재실행 시 부작용 없음. uninstall 시 `~/.claude/CLAUDE.md` 의 kzk 섹션만 제거하고 다른 도구 (omc/gstack) 라우팅 유지 |
| G6 | Existing per-project install 호환 | 기존에 `.claude/skills/kzk-*/` 가진 레포는 그대로 동작. 글로벌과 충돌 시 프로젝트 우선 |

## 3. Non-goals

- **N1**: Claude Code plugin marketplace 등록 (`/plugin install kzk-harness`). future work — Section 14.
- **N2**: kzk-harness CLI 추가 (예: `kzk init`). 스킬 호출은 Claude 발화로만.
- **N3**: omc 처럼 매 prompt UserPromptSubmit hook 로 키워드 매칭. Section 7.5 에서 옵션으로 두되 default OFF.
- **N4**: harness-share.md 를 글로벌·프로젝트 양쪽에 두는 설계. Section 6.3 결정대로 단일 source.
- **N5**: 자동 update (cron / SessionStart) — 사용자가 의도적으로 trigger 해야 함.

## 4. Mechanism comparison (full)

(요약은 Section 1.3. 상세 트레이드오프 — 결정 근거.)

### 4.1 Adoption matrix

| Criteria | gstack base | superpowers base | omc base |
|---|---|---|---|
| Plugin marketplace 의존 | X | O | O |
| Hook 의존 | X | SessionStart 1 | UserPromptSubmit 등 다수 |
| Per-session 컨텍스트 비용 | ~0 | SKILL.md 인라인 (1-2k token) | SessionStart 인라인 + 매 prompt hook latency |
| 사용자 이해도 | 높음 (git clone + 마크다운만) | 중간 (plugin manifest) | 낮음 (manifest + JS hook) |
| 디버깅 난이도 | 낮음 (마크다운) | 중간 | 높음 (JS hook) |
| Self-update 용이성 | git pull + 재실행 | `/plugin update` | `/plugin update` |
| `~/.claude/CLAUDE.md` 충돌 위험 | 중간 (라우팅 섹션 주입) | 낮음 (hook 통한 컨텍스트 주입) | 낮음 |
| 트리거 정확도 (자연 발화) | 라우팅 섹션 + SKILL.md description 으로 충분 | 동일 | 키워드 hook 으로 가장 정확하지만 SKILL.md description 만으로도 거의 동등 |

### 4.2 Decision drivers

- D1: kzk-harness 는 마크다운만 14개. JS hook 추가 = 새 의존성 + 새 보안 surface.
- D2: 다른 레포에서 사용자가 omc / superpowers 와 함께 쓸 가능성 높음. `~/.claude/CLAUDE.md` 충돌 회피 필요.
- D3: SKILL.md description 의 trigger keywords 가 Cycle 21/23 후 충분히 자세함. 추가 hook 없이도 매칭 가능.
- D4: 사용자가 "git clone + 한 번 실행" 멘탈 모델 이미 보유 (현재 install). 글로벌 도 같은 멘탈 모델 유지.

## 5. Adoption decision

**Decision (final, reversible):** gstack 방식 베이스 + idempotent `~/.claude/CLAUDE.md` 라우팅 섹션 주입. UserPromptSubmit hook 은 Section 7.5 옵션으로만 두되 default OFF.

**Reversibility:** Section 14 future work 에서 plugin marketplace 등록 / hook 도입 가능. 현재 결정이 그것을 막지 않음.

**Trade-offs accepted:**

- 플러스: 의존성 0, 디버깅 쉬움, omc/gstack 와 공존 가능, per-session 비용 0.
- 마이너스: SessionStart hook 처럼 강제 인라인 컨텍스트 주입 안 됨 → 사용자가 새 세션 시작할 때 `~/.claude/CLAUDE.md` 가 in-context 인지 확신 어려움 (Anthropic 가 자동 로드한다는 사양 자체는 있음).
- 미티게이션: install 후 verification 단계에서 `cat ~/.claude/CLAUDE.md | grep '## kzk-harness skills'` 로 마커 확인 + 사용자에게 "다음 새 세션에서 trigger keyword 한 번 발화 후 SKILL.md 매칭되는지 보고 부탁" 안내.

## 6. Architecture

### 6.1 Global install layout

```
~/.claude/
├── CLAUDE.md                              # 사용자 글로벌 (omc / gstack 와 공존)
│   ├── ## kzk-harness skills              # 신규 라우팅 섹션 (idempotent marker)
│   │   - 14개 skill table + trigger 키워드
│   │   - "Project artifacts stay in $PWD" 룰 명시
│   │   - Self-trigger 매트릭스 (메타 갭 방지)
│   └── ## (omc / gstack 의 기존 섹션 유지)
└── skills/
    ├── kzk-pre-commit-gate/SKILL.md       # 글로벌 — Claude 자동 스캔 경로
    ├── kzk-large-task-delegation/SKILL.md
    ├── kzk-playwright-verification/SKILL.md
    ├── kzk-autonomous-boundary/SKILL.md
    ├── kzk-autonomous-loop/SKILL.md
    ├── kzk-background-monitoring/SKILL.md
    ├── kzk-spec-and-review/SKILL.md
    ├── kzk-pre-merge-sync/SKILL.md
    ├── kzk-production-access/SKILL.md
    ├── kzk-test-coverage/SKILL.md
    ├── kzk-tool-retry/SKILL.md
    ├── kzk-user-queue/SKILL.md
    ├── kzk-web-loop/SKILL.md
    ├── kzk-codebase-survey/SKILL.md
    └── .kzk-harness-shared/               # umbrella dir for shared assets (dotfile — excluded from skill auto-scan)
        ├── harness-share.md               # 단일 글로벌 source (Section 6.3 결정)
        ├── VERSION                        # release tag (e.g., "2026-05-04-cycle-24")
        └── README.md                      # 글로벌 설치 안내 (uninstall 포함)
```

**Why dotfile umbrella dir:** kzk-harness umbrella (`~/.claude/skills/.kzk-harness-shared/`) is purely shared assets (`harness-share.md`, `VERSION`, `README.md`) — it is NOT an invocable skill. Using a dotfile name excludes it from Claude Code's `~/.claude/skills/<name>/SKILL.md` auto-scan. The alternative (adding a stub `SKILL.md` with a dead trigger) would pollute Claude's skill list with an un-invocable entry. gstack avoids this by making its umbrella dir itself a real skill (`~/.claude/skills/gstack/SKILL.md`) — kzk-harness has no equivalent "umbrella skill", so dotfile is the cleaner path.

**Why per-skill dir at top of `~/.claude/skills/`:** Claude Code skill discovery 는 `~/.claude/skills/<name>/SKILL.md` 패턴을 자동 스캔. `~/.claude/skills/.kzk-harness-shared/` 한 디렉토리 안에 14개 SKILL.md 를 모두 넣으면 1개 스킬로만 인식됨 (확인 필요 — Section 12 open Q1).

**Trade-off — 14개 디렉토리가 `~/.claude/skills/` 를 어지럽힘:** 사용자가 `ls ~/.claude/skills/` 했을 때 kzk-* 14개 + omc/gstack/superpowers 가 섞여 보임. 이는 omc/superpowers 도 마찬가지 이므로 표준 관례로 수용.

### 6.2 Project-local layout (G2 — 변경 없음)

```
<project-root>/
├── CLAUDE.md                              # 프로젝트 별. 글로벌과 별도.
├── harness-flow-progress.md               # 진행 timeline (§7)
├── docs/
│   ├── harness/
│   │   ├── user-queue.md                  # autonomous 모호 결정 (§6)
│   │   └── surveys/                       # codebase survey 보고서 (§26)
│   ├── plans/                             # frozen plans + critic verdict (§22)
│   ├── prd/                               # PRD/spec
│   ├── research/codex-reviews/            # non-plan codex 리뷰 (§22 verdict)
│   └── superpowers/specs/                 # 본 spec 같은 design doc
├── .web-loop/                             # kzk-web-loop cycle state (§25)
├── .omc/                                  # OMC state (per worktree)
└── .claude/skills/                        # (선택) per-project override (Section 8)
```

**룰:** 글로벌 SKILL.md 에 인용된 모든 출력 경로 (`docs/plans/...`, `harness-flow-progress.md`, `.web-loop/...`) 는 절대 경로가 아닌 **`$PWD` 기준 상대 경로** 로 해석. 글로벌 스킬 코드가 `~/.claude/skills/...` 로 자기 자신을 참조하는 일은 없음 — 자기 정의는 SKILL.md 자체에 인라인.

### 6.3 harness-share.md 위치 결정

**결정:** 글로벌 single source — `~/.claude/skills/.kzk-harness-shared/harness-share.md`.

**대안 1 (글로벌 + 프로젝트 양쪽):** install 시 프로젝트 루트에도 복사. 장점: 프로젝트 안에서 `cat harness-share.md` 가능. 단점: 두 source 가 drift, 어느 쪽이 진실인지 모호.

**대안 2 (프로젝트 only — 현재 방식):** install 마다 프로젝트 루트에 복사. 장점: 자기완결. 단점: 14 레포 = 14 copy. update 시 모두 갱신 필요. G1 위배.

**채택 이유:** 단일 source 가 drift 위험 제거. SKILL.md 의 `> Authoritative source: harness-share.md §N` 라인은 글로벌 경로 (`~/.claude/skills/.kzk-harness-shared/harness-share.md`) 로 이중 해석. 사용자가 프로젝트 안에서 빠르게 참조하고 싶다면 `cat ~/.claude/skills/.kzk-harness-shared/harness-share.md` 또는 글로벌 README 에 안내된 경로.

**예외:** kzk-harness 레포 자체 (이 레포) 는 dev 용으로 `harness-share.md` 를 repo root 에 유지 (Section 8 — local dev link).

### 6.4 `~/.claude/CLAUDE.md` 라우팅 섹션

**Marker convention (idempotent):**

```markdown
<!-- BEGIN kzk-harness skills -->
## kzk-harness skills (vX.Y.Z installed YYYY-MM-DD)

> Workflow skill layer. 14 markdown skills auto-load from ~/.claude/skills/kzk-*.
> Project artifacts (`harness-flow-progress.md`, `docs/harness/`, `docs/plans/`,
> `.web-loop/`, `.omc/`, `docs/research/codex-reviews/`) stay in `$PWD`.

| Skill | Trigger keywords |
|---|---|
| kzk-pre-commit-gate | commit, pre-commit, Gate 0/1/1.5/2/3/4, ... |
| ... (14 rows) ... |

### Self-trigger matrix (메타 갭 방지)
- 메인이 5+ 파일 read 가 필요한 검증 → kzk-large-task-delegation §Read-heavy audit
- 새 spec / plan / 큰 구조 변경 → kzk-spec-and-review Step 0 → 1–3
- 자가개선 cycle → kzk-large-task-delegation + kzk-pre-commit-gate + kzk-autonomous-loop
- ... (Section 10)

<!-- END kzk-harness skills -->
```

**Idempotent rule:** `<!-- BEGIN kzk-harness skills -->` 와 `<!-- END kzk-harness skills -->` 사이만 install/update 시 교체. 그 외 `~/.claude/CLAUDE.md` 영역은 read-only. omc 의 `## Skill routing` / gstack 의 자기 섹션과 공존.

**Failure mode:** 사용자가 마커 안에 자기 노트를 직접 추가했다면 update 시 그 노트가 사라짐. 미티게이션: install 시 `~/.claude/CLAUDE.md.kzk-bak-<timestamp>` 백업 1개 자동 생성 + 사용자에게 "교체될 영역 미리보기 / 진행?" 확인.

### 6.5 SKILL.md frontmatter discipline (변경 없음)

기존 룰 유지 (CLAUDE.md "Skill Development Rules" 섹션):
- frontmatter `name`, `version`, `description` (트리거 포함)
- `> Authoritative source: harness-share.md §N`
- 절대 경로 또는 repo-root relative
- 글로벌 install 의 SKILL.md 는 trigger keyword 만 의존, 코드는 자기 자신 inline.

**신규 룰:** 글로벌 SKILL.md 가 다른 SKILL.md 를 참조할 때는 이름으로만 (`kzk-spec-and-review`), 경로 참조 금지. install 위치가 다양 (글로벌 vs 프로젝트) 하므로.

## 7. Install entry point

### 7.1 New entrypoint: `install/install-global.sh`

(`install/dependencies.sh` 는 그대로 — external CLI tools 담당.)

**Public flow:**

```
$ bash <(curl -sSL https://raw.githubusercontent.com/kimzerokim/kzk-harness/main/install/install-global.sh)
```

또는 git clone 한 사용자:

```
$ bash /path/to/kzk-harness/install/install-global.sh
```

### 7.2 Steps

1. **Pre-flight** — `~/.claude/skills/` 가 디렉토리인지, mkdir -p, `~/.claude/CLAUDE.md` 존재 여부.
2. **Backup** — `cp ~/.claude/CLAUDE.md ~/.claude/CLAUDE.md.kzk-bak-$(date +%Y%m%d-%H%M%S)` (있으면).
3. **Skill sync** — 14개 skills/* 디렉토리를 `~/.claude/skills/<name>/` 로 복사. 기존 디렉토리 = version-aware overwrite (현재 install command 와 동일 룰).
4. **Umbrella sync** — `harness-share.md`, `VERSION`, `README.md` 를 `~/.claude/skills/.kzk-harness-shared/` 에 복사.
5. **CLAUDE.md routing** — `~/.claude/CLAUDE.md` 의 `<!-- BEGIN kzk-harness skills -->` 마커 영역 교체 (없으면 H1 다음에 추가).
5.5. **OMC UserPromptSubmit collision check.** If `~/.claude/plugins/cache/*/oh-my-claudecode/*/scripts/keyword-detector.mjs` exists, grep its keyword table for any kzk-harness trigger ("ralph", "ralph로 체크", "ralph로 확인"). On match, emit a warning: "OMC keyword-detector intercepts 'ralph' before SKILL.md matching — kzk-autonomous-boundary may not activate via that keyword. Consider adding kzk-specific phrase 'ralph로 체크' as the disambiguator (already in v1.0.12) and confirm by triggering in a fresh session." Do not block install.
6. **Stale skill cleanup** — `~/.claude/skills/` 의 kzk-* 중 source 에 없는 것을 사용자에게 일괄 확인 후 삭제 (현재 README install 의 step 2 후반부와 동일).
7. **Dependencies** — `bash install/dependencies.sh "$(pwd)"` 호출. 단 `$(pwd)` 의미가 글로벌 install 에선 모호 (프로젝트 root 가 아님). 옵션:
   - 7a: 글로벌 install 에선 dependencies.sh 의 `code-review-graph build` 단계만 skip (project root 인자 없음). 다른 dep (codex / gh / aws-vault / plugin detect) 는 그대로 실행.
   - 7b: 사용자가 첫 프로젝트 진입 시 별도로 `bash ~/.claude/skills/kzk-harness/install/dependencies.sh "$(pwd)"` 실행.
   - **결정**: 7a 채택. dependencies.sh 에 `--skip-project` 플래그 신설.
8. **Verification** — 14개 SKILL.md 존재 확인 + `~/.claude/CLAUDE.md` 마커 확인 + 사용자에게 새 세션에서 trigger 발화 1회 권고.
9. **Summary print** — install 위치, version tag, 다음 step.

### 7.3 README rewrite

현재 README "Install" 섹션은 프로젝트 단위 install 명령 (1 paragraph). 새 섹션:

```markdown
## Install

### Recommended: global install

Inside any Claude Code session, run:

\`\`\`
글로벌 kzk-harness 설치: 다음 명령을 실행해라.
1. git clone --depth 1 https://github.com/kimzerokim/kzk-harness.git /tmp/kzk-harness
2. bash /tmp/kzk-harness/install/install-global.sh
3. rm -rf /tmp/kzk-harness
설치 후 다른 모든 Claude Code 레포에서 kzk-* 스킬이 자동 로드된다.
프로젝트 진행 문서 (`harness-flow-progress.md`, `docs/harness/`, `.web-loop/`, `.omc/`) 는
계속 프로젝트 루트 아래에 작성된다.
\`\`\`

### Project-only install (legacy / fallback)

(현 README 의 install 명령 그대로 — 사용자가 글로벌 설치를 원치 않거나 한 레포에만 적용하려는 경우)
```

### 7.4 Update flow

- `bash ~/.claude/skills/kzk-harness/install/install-global.sh --update` (또는 cd kzk-harness && git pull && 재실행).
- 동작: skill version-aware overwrite + harness-share 강제 overwrite + CLAUDE.md 마커 영역 교체. dependencies.sh 재실행은 이미 idempotent.

### 7.5 Optional: UserPromptSubmit keyword hook (default OFF)

omc 패턴 차용한 옵션. `~/.claude/skills/kzk-harness/hooks/keyword-detector.mjs` 에 키워드 매핑. 활성화: `install-global.sh --enable-hooks`.

장점: SKILL.md description 매칭이 약한 발화 (예: 사용자가 trigger keyword 정확히 안 씀) 도 잡음.

단점: 매 prompt latency + JS 의존 + omc 의 hook 와 충돌 가능 (둘 다 UserPromptSubmit `*` 매처 등록 시 어느 쪽이 먼저 fire 할지 불확정).

**Default OFF.** 사용자가 명시 활성화. Section 14 future work 로 일단 두는 것이 reversible 한 결정.

## 8. Migration / backward compat

### 8.1 Existing per-project installs

- 현재 일부 레포에 `.claude/skills/kzk-*/` 가진 사용자가 있음 (kzk-harness 자체 + 기존 README install 따른 레포).
- **결정 (G6):** 글로벌 + 프로젝트 둘 다 둘 수 있음. Claude Code skill discovery 의 우선순위는 프로젝트 → 글로벌 (확인 필요 — Section 12 Q2). 따라서 프로젝트 로컬 SKILL.md 가 글로벌 보다 새 version 인 경우 프로젝트가 win. Precedence behavior is asserted from `gstack` reading patterns; AC8 verifies before ship. If precedence inverts, §8.1 changes to `global wins` and §8.2 dev workflow uses an explicit `--project-override` flag.
- **Migration tip in install-global.sh:** 사용자에게 "이미 프로젝트 단위 install 한 레포가 있으면 .claude/skills/kzk-*/ 디렉토리를 삭제해서 글로벌과 충돌 방지 권장" 안내. 강제 삭제 X.

### 8.2 kzk-harness repo 자체 (dev mode)

**§8.2 dev mode (kzk-harness contributors only):** Symlink ONLY `harness-share.md` (release-frozen, drift-sensitive). File-copy each `skills/*/SKILL.md` into `~/.claude/skills/kzk-*/SKILL.md` with an explicit `bash install/install-global.sh --update` step. Reason: WIP SKILL.md drafts on `feature/*` branches must NOT leak globally — global skills must reflect a deliberate sync gesture. The author's own Q5 raised this; resolution is invert: shared assets symlink (one source of truth), per-skill files copy (explicit gesture).

### 8.3 Uninstall

```
bash ~/.claude/skills/kzk-harness/install/uninstall-global.sh
```

동작:
1. `~/.claude/CLAUDE.md` 의 `<!-- BEGIN/END kzk-harness skills -->` 마커 영역 제거.
2. `~/.claude/skills/kzk-*` 14개 디렉토리 + `~/.claude/skills/.kzk-harness-shared/` 삭제.
3. `~/.claude/CLAUDE.md.kzk-bak-*` 백업은 유지 (사용자 수동 삭제).
4. dependencies.sh 가 install 한 codex / code-review-graph 는 다른 도구가 쓸 수도 있어 자동 uninstall X. 사용자에게 명령 안내만.

## 9. Update / uninstall summary

| Action | Command | 부작용 |
|---|---|---|
| Install (global) | `bash install/install-global.sh` | `~/.claude/skills/kzk-*/` 14개 + `~/.claude/skills/.kzk-harness-shared/` + `~/.claude/CLAUDE.md` 마커 추가 + `dependencies.sh --skip-project` |
| Update (global) | `bash ~/.claude/skills/.kzk-harness-shared/install/install-global.sh --update` | 위와 동일하나 stale skill prompt + version-aware overwrite |
| Symlink dev mode | `bash install/install-global.sh --symlink-mode` (kzk-harness repo 안에서) | `~/.claude/skills/kzk-*` → `<repo>/skills/kzk-*` symlink |
| Uninstall | `bash ~/.claude/skills/.kzk-harness-shared/install/uninstall-global.sh` | 마커 + 14개 디렉토리 + umbrella 삭제. 백업 유지. |
| Per-project install (legacy) | 기존 README 명령 | `<project>/.claude/skills/kzk-*` + `<project>/harness-share.md` + `<project>/CLAUDE.md` 의 Active Skills 섹션 |

## 10. Self-trigger guidance (Section 1.4 메타 갭 정식 편입)

자가개선 루프 / 외부 레포에서 메인 컨텍스트가 자체 kzk-* 스킬을 호출해야 하는 상황 매트릭스. CLAUDE.md `## Self-Improvement Loop` 의 "Self-trigger reminder" 와 1:1 동일. 글로벌 `~/.claude/CLAUDE.md` 의 라우팅 섹션 끝에 동일 표 주입 (Section 6.4).

| Situation | Skill chain | Why this skill |
|---|---|---|
| 메인이 5+ 파일 read 필요한 검증 / spec ↔ 구현 매칭 / 버그 전수조사 | `kzk-codebase-survey` (Step 0.5 + 1–8) → `kzk-large-task-delegation` §Read-heavy audit dispatch shape (EXPLORER subagent) | 메인 직접 read = opus token waste + context bloat. Survey 선행으로 scope 확정 후 EXPLORER subagent 위임 (harness-share.md §26 "When mandatory" 순서) |
| 새 spec / plan / 글로벌 install 같은 메타 작업 | `kzk-spec-and-review` Step 0 → 1–3 | codebase survey 선행 + 코덱스 cross-review 의무 |
| Multi-file 코드 변경 (3+ 파일 / 200+ LoC) | `kzk-large-task-delegation` §Model routing (opus planner / sonnet executor) | 메인 컨텍스트 직접 large 작업 = race + 토큰 부담 |
| Cycle 끝에서 commit | `kzk-pre-commit-gate` (Gate 0–4) + `kzk-pre-merge-sync` (PR / merge) | gate skip = 회귀 위험 |
| 다중 cycle 자율 실행 | `kzk-autonomous-loop` + `kzk-autonomous-boundary` | rate limit / context 80% / halt 조건 |
| Production / DB / IAM 작업 | `kzk-production-access` | credential / destructive op 룰 |
| UI 변경 commit | `kzk-playwright-verification` (Gate 4) | 시각 검수 의무 |

**자가개선 anti-pattern:** 자기 스킬을 안 쓰는 cycle = 메타 갭. 다음 cycle 의 P0 로 처리 (CLAUDE.md `## Self-Improvement Loop` 명시).

**외부 레포 anti-pattern:** "ralph로 스펙 체크 + 버그 전수조사" 같은 발화 = `kzk-codebase-survey` + `kzk-large-task-delegation` §Read-heavy audit + (필요 시) `kzk-autonomous-loop`. 메인 직접 5+ 파일 opus read = 글로벌 install 가 막아야 할 정확한 패턴.

## 11. Risks + mitigations

| # | Risk | Mitigation |
|---|---|---|
| R1 | `~/.claude/skills/` 가 Anthropic 공식 사양이 아닌 관례 경로 — Claude Code update 시 discovery 가 깨질 수 있음 | install 후 verification 단계에서 SKILL.md 가 in-context 매칭되는지 사용자가 1회 발화로 확인. 깨지면 plugin marketplace (Section 14) 로 swap |
| R2 | `~/.claude/CLAUDE.md` 마커 안에 사용자 수기 노트 추가 후 update → 노트 사라짐 | 백업 자동 생성 + update 시 "교체될 영역 preview" 확인 prompt |
| R3 | omc / gstack 와의 trigger 충돌 (예: "ralph" 키워드는 omc 가 먼저 잡을 수 있음) | omc 의 ralph 와 kzk-autonomous-boundary 는 서로 보완적 (omc ralph = autonomous 엔진, kzk-autonomous-boundary = boundary 룰). description 명확화로 사용자가 어느 쪽인지 발화 시 구분 가능. 충돌 발견 시 next cycle P0 |
| R4 | dependencies.sh 의 `code-review-graph build` 가 글로벌 install 에선 의미 없음 (프로젝트 root 무관) | `--skip-project` 플래그 추가 (Section 7.2 step 7) |
| R5 | 14개 skill 디렉토리가 `~/.claude/skills/` 어지럽힘 | omc / superpowers 도 동일 패턴. 표준 관례 수용. 향후 plugin 화 시 자연 해결 |
| R6 | 프로젝트 단위 install 사용자가 글로벌 install 후 stale per-project skill 사용 | install 시 사용자에게 안내. 강제 X (G6 — backward compat) |
| R7 | symlink dev mode 에서 사용자가 다른 레포 작업 중 무심코 kzk-harness repo SKILL.md 편집 → 글로벌 영향 즉시 | dev mode 활성 시 install 결과에 명시. branch protect 룰 (현재 main 보호) 으로 main 직접 edit 차단 |
| R8 | uninstall 후 `~/.claude/CLAUDE.md.kzk-bak-*` 누적 | 사용자 수동 삭제 안내. 자동 cleanup 은 다른 도구 백업 까지 손댈 위험 |
| R9 | omc 의 UserPromptSubmit hook 가 kzk routing 마커보다 먼저 매칭 → kzk skill 호출 안 됨 | Section 7.5 의 옵션 hook 도입 시 omc 와 ordering 정책 필요. default OFF 로 일단 회피 |
| R10 | 글로벌 install 후 사용자가 multi-machine 환경 (laptop + remote dev) — `~/.claude/` 동기화 안 됨 | 각 머신에서 별도 install. dotfile manager (chezmoi, stow) 로 사용자 자체 동기화 가능. README 에 hint |

## 12. Open questions (codex 가 challenge 할 항목)

1. **Q1 — Skill discovery 사양 검증:** Claude Code 가 `~/.claude/skills/<dir>/SKILL.md` 패턴을 자동 스캔한다는 것이 공식 사양인가, 관례인가? 만약 관례면 향후 Anthropic update 시 깨질 수 있는데, plugin marketplace (Section 14) 가 더 안전한 long-term 결정 아닌가?
2. **Q2 — 우선순위 사양 검증:** 같은 이름의 SKILL.md 가 프로젝트 (`<proj>/.claude/skills/kzk-X/`) 와 글로벌 (`~/.claude/skills/kzk-X/`) 양쪽에 있을 때 어느 쪽이 win 하는지 — 본 spec 은 "프로젝트 우선" 가정 (Section 8.1). 실제 Claude Code 동작이 다르면 G6 무너짐.
3. **Q3 — `~/.claude/CLAUDE.md` 인라인 컨텍스트 사양:** 본 spec 은 "Claude Code 가 새 세션 시작 시 `~/.claude/CLAUDE.md` 를 자동 in-context 로드" 가정 (Section 5 trade-off). 만약 일부 사양 (project-only mode 등) 에서 글로벌 CLAUDE.md 가 무시되면 G1 미달.
4. **Q4 — omc / gstack hook 충돌:** Section 11 R3, R9. omc 의 UserPromptSubmit hook 가 kzk trigger keyword 를 먼저 잡아 다른 동작 (예: omc ralph) 을 호출하면 kzk-autonomous-boundary 가 안 깨어남. 이를 install 시 자동 detect 가능한가? 가능하면 install-global.sh 에 경고 필요.
5. **Q5 — Symlink dev mode 의 의도하지 않은 효과:** Section 8.2. kzk-harness repo 작업 중 작성한 SKILL.md draft (예: 새 스킬 추가 PR 진행 중) 가 다른 레포 컨텍스트에 즉시 노출되어 기대 안 한 트리거 → 작업 흐름 방해. dev mode 는 결국 explicit "install global = release tag" 와 분리하는 게 맞나?

## 13. Acceptance criteria

본 spec 으로 도출되는 plan 의 acceptance test (executor 가 verify 해야 할 것):

- AC1: 새 디렉토리 `~/test-kzk-global/` 만들고 그 안에서 `claude` 시작 → "spec 잡자 — kzk-spec-and-review 트리거 되는지" 발화 → kzk-spec-and-review SKILL.md 가 인용됨.
- AC2: `~/.claude/CLAUDE.md` 의 `<!-- BEGIN kzk-harness skills -->` ... `<!-- END kzk-harness skills -->` 마커 존재 + 표 안에 14개 skill row.
- AC3: install-global.sh 두 번째 실행 = stale 0 + 변경 0 (idempotent). 단 source version 이 달라진 skill 만 overwrite.
- AC4: kzk-harness repo 안에서 `--symlink-mode` 활성 후 다른 레포에서 trigger 발화 → repo 의 SKILL.md 본문 그대로 매칭. SKILL.md 한 줄 수정 후 다른 레포 새 세션에서 그 변경이 즉시 반영.
- **AC5 (no main-context Read storm)**: After running `claude` in a test repo and triggering a read-heavy audit prompt, run `claude --output-format json | jq '[.messages[] | select(.tool_use.name == "Read")] | length'` against the session log. Expect ≤ 4. If ≥ 5 the self-trigger matrix is failing — escalate to a P0 cycle.
- AC6: uninstall-global.sh 후 14개 디렉토리 + 마커 삭제. omc / gstack 의 다른 섹션은 그대로.
- AC7: 새 skill 추가 (예: cycle 25 에서 `kzk-foo` 추가) 시 install-global.sh `--update` 1번 으로 다른 레포 컨텍스트에 자동 반영.
- **AC8 (precedence probe)**: Before merging the install-global.sh implementation, run a precedence probe — install a stub `kzk-precedence-probe/SKILL.md` (with frontmatter trigger `'kzk-precedence-probe-test'` and body `"global wins"`) at `~/.claude/skills/kzk-precedence-probe/`, then write the same skill name with body `"project wins"` at `<some-test-project>/.claude/skills/kzk-precedence-probe/`. In a fresh Claude session inside that test project, type the trigger and observe which body activates. If project wins → G6 holds, proceed. If global wins or merged → spec §8.1 must change before install-global.sh ships.

## 14. Future work (Non-goals 의 reversibility)

- F1 (Q1 미티게이션): plugin marketplace 등록. `/plugin install kzk-harness` 한 줄로 설치. 본 spec 의 글로벌 install 위치는 `~/.claude/plugins/cache/.../kzk-harness/<ver>/skills/` 로 자동 이동. 사용자 인지 부담 0.
- F2: omc 처럼 SessionStart hook 으로 `using-kzk-harness/SKILL.md` 인라인 주입. trigger 정확도 ↑. 단 per-session token 비용 ↑. Section 4.1 trade-off 재평가 필요.
- F3 (Section 7.5 활성화): UserPromptSubmit keyword hook. trigger 정확도 ↑. omc 와 ordering 정책 필요.
- F4: kzk-harness CLI 신설 — `kzk doctor` (글로벌 install 상태 진단), `kzk update`, `kzk skill new <name>`. dev iteration 가속.
- F5: VERSION pinning + 자동 update 알림 — `~/.claude/skills/kzk-harness/VERSION` 과 GitHub release tag 비교, 새 release 발견 시 SessionStart 1회 알림.

## 15. Decisions log (이 spec 의 reversibility 표)

| # | Decision | Reversible? | Reverse cost |
|---|---|---|---|
| D1 | gstack base + idempotent CLAUDE.md routing (Section 5) | O | Section 14 F1/F2/F3 로 swap |
| D2 | harness-share.md 글로벌 single source (Section 6.3) | O | 다음 install 에 프로젝트 복사 추가 |
| D3 | UserPromptSubmit hook default OFF (Section 7.5) | O | `--enable-hooks` 옵션 |
| D4 | `--skip-project` flag in dependencies.sh (Section 7.2 step 7) | O | flag 제거 |
| D5 | Symlink dev mode (Section 8.2) | O | install-global.sh 에서 detect 로직 제거 |
| D6 | Uninstall 가 dependencies 자동 제거 X (Section 8.3) | O | 옵트인 `--purge-deps` 추가 가능 |
| D7 | Plugin marketplace 등록 보류 (Section 3 N1) | O | F1 |

## 16. Anti-patterns to avoid (이 spec authoring 단계 자체의)

- 글로벌 install 후 사용자가 일일이 모든 레포에서 재install — G1 위배. 글로벌 sync 한 번이면 모든 레포에 즉시 적용.
- per-project install 완전 제거 — kzk-harness repo dev / 일부 사용자가 한 레포만 적용하고 싶은 경우 길 막음. G6 위배.
- `~/.claude/CLAUDE.md` 무지성 overwrite — omc / gstack 라우팅 파괴. R2.
- harness-share.md 글로벌 + 프로젝트 양쪽 — drift. Section 6.3 anti-decision.
- dev iteration 위해 글로벌 install 자체를 안 함 — 외부 레포에서 자기 dogfooding 안 됨. dev mode (symlink) 가 답.

## Frozen

Spec frozen 2026-05-04 after critic-opus revision pass (codex CLI timed out at 5 min before producing a verdict; critic-opus fallback per kzk-spec-and-review §Codex execution shape). Revisions: must-fix #1 (umbrella → dotfile), #2 (AC8 precedence probe), #3 (matrix row 1 codebase-survey precedence) + nice-to-have #1 (AC5 verifiable), #2 (OMC collision warning), #3 (symlink-mode inversion). Plan generation may proceed.
