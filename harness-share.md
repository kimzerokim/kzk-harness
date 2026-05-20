# Harness Workflow — Portable Guide

다른 Claude Code 프로젝트에서 그대로 채택 가능한 **AI-driven autonomous workflow** 정리. 본 가이드는 brainstorming → spec → plan → subagent-driven implementation → verification 까지의 전 cycle 을 다룬다.

> **Plugin 의존성** (둘 다 설치 가정):
> - `superpowers` — brainstorming, writing-plans, subagent-driven-development, executing-plans, systematic-debugging, verification-before-completion, dispatching-parallel-agents
> - `oh-my-claudecode` (OMC) — ralph autonomous loop, ai-slop-cleaner, executor / architect / critic agents, deepinit, hud
>
> 두 plugin 의 skill 을 자유롭게 mix. 본 가이드 는 둘 다 활용 전제.

---

## 1. 핵심 흐름

```
사용자 요청
   ↓
[brainstorming]   — Q&A 로 spec 결정 (HARD GATE: design 승인 전 implementation 금지)
   ↓
spec 작성 → docs/prd/YYYY-MM-DD-<topic>.md
   ↓
[writing-plans]   — atomic TDD task 분할
   ↓
plan 작성 → docs/plans/YYYY-MM-DD-<topic>.md
   ↓
[subagent-driven-development]  ◀──┐
   ↓                              │
fresh subagent per task           │ verification reviewer 2-fail → halt
   ↓                              │
verify (build / test / Gate 4)    │
   ↓                              │
commit + push (atomic)            │
   ↓                              │
다음 task ──────────────────────┘
   ↓
모든 task 완료 → final docs (harness-flow-progress + user-queue) → cancel
```

skill 호출 형식:
- `Skill("superpowers:brainstorming")` — design 단계
- `Skill("superpowers:writing-plans")` — plan 단계
- `Skill("superpowers:subagent-driven-development")` — execution 단계
- `Skill("oh-my-claudecode:ralph")` — autonomous loop with stop hook (사용자가 명시 시 진입)

---

## 2. Autonomous Execution Boundary

사용자가 명시적으로 autonomous 모드 허가 (예: "ralph로 돌려", "자는 동안 진행", "끝까지 끝내줘") 한 경우에만 진입.

### 허용 동작

- Pre-commit Gate (아래 §3) 통과 시 자동 commit
- TDD test 통과 시 다음 task 진행
- worktree 병렬 실행
- Subagent dispatch 로 대화형 skill 대체
- 문서 작성, plan 상세화, review 실행

### 금지 동작 (강제)

- **Branch / PR contract: ASK FIRST 후 진입.** autonomous 시작 시 사용자에게 (a) 별 branch vs 직접 commit (b) branch 이름 (예: `feature/<topic>`, `harness-test`, `feature/web-loop-<slug>`) (c) PR 필요 여부 — 3 슬롯 명시 답 받고 그 contract 를 세션 끝까지 유지. 직접 `main` commit 은 사용자가 그 세션에서 명시 인가 ("main에 바로 커밋", "main 직접") 한 경우만 허용. silent default X. PR auto-merge 는 어떤 contract 에서도 사용자 "merge it" 필수. `git push --force` / `git reset --hard` on pushed branch 는 contract 무관 별도 OK 사인 필요
- 사용자 PRD / 설계 문서 자동 override
- Pre-commit Gate 실패 시 force commit
- verification reviewer 2회 연속 FAIL 시 loop 지속 (halt + user-queue 적재)

### Production / 외부 인프라 Access (조건부 허용)

기본 금지. 사용자가 **명시적으로 지시** 한 경우 ("AWS 에 접속해서 ...", "이 자격증명으로 production X 변경") 한정해 인증된 자격증명으로 read/write 가능. **destructive 작업 (DB drop, snapshot 삭제, IAM 변경, 파일 삭제 등) 포함** — 사용자 명시는 허락 + 실행 의무 둘 다. AI 가 명령어 직접 실행한다 (사용자 SSH 손으로 치는 X 패턴 회피).

multi-step sequence (cutover, migration) 이면 단계별 OK 사인: AI propose → 사용자 OK → AI 실행 → 결과 보고 → 다음 propose. step skip / merge X.

명시 없이는 read-only 호출도 X. 명시 범위 = 지시된 task / sequence 완료 시점까지 — 그 이상은 새 명시 필요.

> *Plan E rev2 (state mutation)*: 위 직접 실행 의무는 read-only inspection / runtime-only 환경 설정 / multi-step 배포 의 step 실행에 한정. **production state mutation (DB schema, IaC-managed config 등) 은 §Production state changes 의 code-first 룰이 우선**.

### Production state changes — code-first + 멱등성 (Plan E rev2)

`### Production / 외부 인프라 Access` 의 destructive direct-execution 룰을 좁힌다 — production **state mutation** 한정.

- **코드 우선**: migration / IaC / shell script. git tracked.
- **AI 직접 호출 금지** (state mutation): explicit instruction 있어도 AI 실행 X. script 작성 → 사용자 review → 사용자/CI 실행.
- **read-only inspection** (`aws s3 ls`, `describe-*`, `\dt`) 도 explicit instruction 필요 — instruction 있으면 AI 직접 실행 OK.
- **멱등성 의무**: `IF NOT EXISTS` / `--if-not-exists` / `ON CONFLICT DO NOTHING`.
- **Drift forward-only (state 기준)**: production state rollback 금지. code commit `git revert` 는 OK.
- **Environment exceptions**: IaC-managed env → code-first. runtime-only (콘솔 수동 갱신, secret 회전, OAuth refresh) → 기존 §Production / 외부 인프라 Access 룰만 적용.

**룰 SoT**: `kzk-production-access` §Production state changes.

**Cross-axis**:
- **Axis B** (`kzk-fix-scope-expansion`): production state mutation 의 impacted schema / query / ORM model / API contract artifact 전수.
- **Axis D** (`kzk-regression-memory`): production change 회고 entry key=`prod-<change-slug>`, recall hook 매칭.

**Enforcement**:
- (a) `kzk-large-task-delegation` §Production-code-first boilerplate (Plan E) — sonnet/opus dispatch Rules block 자동 inject.
- (b) `kzk-pre-commit-gate` Gate 1.6 — staged path 기반 trigger, direct-execution 흔적 FAIL / 멱등성 WARN.

### Credential Handling

사용자가 채팅에 인프라 자격증명 (AWS / GCP / DB 등) 을 붙여 넣은 경우:

- **만료 시간 있는 임시 자격** (AWS STS — `Expiration` 필드 존재, `ASIA` prefix, `SessionToken` 동반) — 만료 안에서 사용자 명시 동의 시 한시적 사용 허용. 사용 후 다음 turn 부터 잊고 재사용 X (재사용 = 사용자 재명시 필수)
- **만료 없는 영구 자격** (AWS `AKIA` prefix permanent IAM key, 평문 DB 비밀번호 등) — 사용 거부. 사용자에게 revoke 절차 + 안전 위생 (`aws-vault`, `aws sso`, 1Password CLI) 권고. 노출 자체가 사고 신호

두 경우 모두 memory / metadata 저장 X. conversation 종료 시 자동 폐기.

### Rollback / revert policy

autonomous loop 이 commit 한 코드가 이후 잘못된 것으로 판명 된 경우:

1. `git revert <sha>` 선호 — reset 보다 history 보존
2. pushed branch 에서 `git reset --hard` 는 사용자 명시 ("hard reset 해줘") 없으면 금지
3. user-queue 에 entry 추가: 어느 commit, 왜 revert, 올바른 접근 방향
4. 같은 issue 를 바로 재시도 하지 말고 다음 issue 로 resume

### Polite-stop 금지

- 사용자가 autonomous 지시 한 범위 안에선 모든 task 완료 또는 halt 조건 도달 시까지 정지 X
- 매 task 끝 = 즉시 다음 task dispatch (사용자 prompt 기다리지 X)
- "다음 plan 은 사용자 승인 후" 같은 anti-pattern 금지

> Dispatch anatomy canonical reference: §4 kzk-large-task-delegation §Task-level dispatch shape.

---

## 3. Pre-commit Gate (10 단계)

매 commit 직전 순차 통과. 하나라도 실패 시 commit 금지.

### Gate 0 — Touched-files AGENTS.md sync (repo with AGENTS.md hierarchy 만 해당)

레포가 hierarchical AGENTS.md 를 사용하면 (`AGENTS.md`, `<dir>/AGENTS.md`, ...): commit 이 새 source 파일을 추가하거나 새 디렉토리를 만들면, 해당 `AGENTS.md` 의 Key Files / Components 표를 같은 commit 에 갱신.

- 새 파일 `path/to/dir/<file>` → `path/to/dir/AGENTS.md` 행 추가
- 새 디렉토리 → 신규 `AGENTS.md` (parent 참조 태그 포함) + 부모 Subdirectories 표에 link 추가
- 파일 삭제 → 해당 행 제거
- 기존 파일 수정만 (rename/add/delete 없음) → skip
- 1줄 typo / 변수 rename 수준의 trivial 변경 → skip
- 테스트 파일 (`*.test.{ts,tsx}`) 동시 추가 → 구현 파일 row 와 합쳐 한 줄로 표기 가능, 별도 행 선택사항

이유: pre-merge 시점에 `/deepinit` 한 번에 일괄 갱신하려고 미루면 (a) deepinit 호출이 token-burn skill load 로 약식 처리되거나 (b) 풀 hierarchical regen 에 비례 안 맞는 시간/비용이 들거나 (c) 갱신이 누락되는 패턴이 반복됨. AGENTS.md 갱신을 매 commit 에 강제 → manifest 가 한 commit 단위로 정직.

레포에 AGENTS.md hierarchy 가 없으면 Gate 0 N/A.

Gate 0 통과 후, kzk-pre-commit-gate skill 은 추가로 `deepinit_manifest` tool (OMC plugin) 을 `action=save` 로 호출해 manifest baseline 을 저장한다. Tool 미설치 시 skip (Gate 0 자체는 AGENTS.md 편집만으로 PASS). 이 호출은 §3 게이트 요건 외의 skill-level extension 이다.

### Gate 0.5 — Freshness guard

**Gate 0.5 — Freshness guard**: staged 코드 파일 → `crg-utils.findStaleMetaDocs()` → stale 메타 문서 감지. stale → BLOCK + auto-fix + restage. partial failure → WARN + user-queue. skip: `KZK_GATE05_SKIP=1`. Cross-ref: `kzk-freshness-guard`.

### Gate 1 — ai-slop-cleaner

변경 파일 의 dead code / duplicate / needless abstraction / boundary leak 제거.

```
Skill("oh-my-claudecode:ai-slop-cleaner")
```

trivial 변경 (1줄 옵션 flag) 인 경우 skip 가능 — commit body 에 "ai-slop-cleaner skipped (trivial)" 명시.

### Gate 1.5 — secrets scan

staged diff 에서 자격증명 패턴 검색:

```bash
git diff --cached | grep -iE "(password|secret|api_key|aws_secret|private_key|token)\s*[:=]\s*['\"]?[A-Za-z0-9+/]{8,}" || true
```

`AKIA`/`ASIA` prefix (AWS key 패턴) 도 추가 확인. match 발견 시 → unstage + secret 제거 + re-stage. test fixture 내 명백한 fake string 은 false positive — commit body 에 `secrets-scan: false positive — <reason>` 명시.

### Gate 2 — build green

```bash
npm run build  # your build command
```

dist artifact 존재 확인 (e.g. `dist/main.js`). exit 0.

### Gate 3 — module test pass

변경 영역 한정:
```bash
npm test -- --testPathPatterns=<changed-area>
```

전체 회귀는 PR 시점에.

### Gate 3.5 — Conditional docker compose smoke

**Trigger**: `git commit` / `gh pr create|merge` / `git push origin main` (commit-signal guard — other Bash commands silent passthrough). Staged files match `/(^|\/)Dockerfile(\..+)?$/`, `/(^|\/)(docker-)?compose(\..+)?\.ya?ml$/`, `/(^|\/)backend\//`, or custom `triggers.includes` glob (`.kzk/docker-smoke.json`). Doc-only commit → skip (N/A).

**Docker command**: `docker compose up --build -d` (default timeout 600000ms).

**Optional smoke endpoint**: `.kzk/docker-smoke.json` `endpoint` field → GET/HEAD → non-2xx BLOCK.

**Bypass env** (precedence DISABLE > SKIP > CI): `KZK_GATE35_DISABLE=1` (`Q-GATE35-DISABLED`) / `KZK_GATE35_SKIP=1` (`Q-GATE35-SKIPPED`) / `CI=true` (`Q-GATE35-CI-SKIP`). Inline prefix: `KZK_GATE35_SKIP=1 git commit ...`.

**OPT-IN**: `install-global.sh --docker-gate`. Hook pair: `.claude/hooks/docker-compose-gate.mjs` ↔ `install/hooks/docker-compose-gate.mjs`.

### Gate 4 — UI/CSS visual verification (Playwright MCP)

**변경 파일에 `src/**/*.{tsx,ts,css}` 1개라도 포함되면 의무** (your repo's frontend glob). skip 금지.

순서:
0. **Dev server health 사전 검수** (frontend 변경 시 의무) — `ps aux | grep -E "vite|next|nest" | grep -v grep` 으로 dev server alive 확인 + dev log tail 50줄 error 패턴 grep (`vite:css`, `Module build failed`, `error during build`, `HMR ERROR`, `parse error`, `compilation error`). 1개라도 발견 시 페이지가 stale 빌드를 보여주는 상태 — Playwright 검증 무의미. root cause fix 후 dev rebuild success 확인 → 1번 진입. **production build PASS 만으로 verification 종료 금지** — dev/prod 격차 트랩 (e.g. Tailwind v4 `@import 'tailwindcss';` inline expand 뒤 오는 `@import url(...)` 가 dev (esbuild) fail / prod (rollup) pass). 본문: `kzk-playwright-verification §Dev/prod build divergence trap`.
1. `mcp__playwright__browser_navigate` 로 변경 영역 포함 3+ 페이지 방문. 첫 navigate 후 `page.reload({ bypassCache: true })` 또는 동등 1회 강제 (stale browser cache 제거)
2. 각 페이지 `browser_snapshot` + `browser_take_screenshot fullPage=true` (저장: `docs/screenshots/<session>/`)
3. `browser_console_messages level=error` 결과 0 error + `level=warning` 1회 확인 (HMR 실패가 warning 으로 뜨는 경우: `[vite] hmr update failed`, `[next] hmr error`)
4. **시각 검수** — screenshot 실 시각 확인. shadcn primitive default brittle (unstyled anchor / 무padding badge / border-only card) 가 보이면 FAIL. build/test green ≠ visual PASS
5. commit message 본문에 `Playwright: <screenshot_paths> + snapshot captured (console 0 err, dev log clean) + visual verified` 라인

예외: 변경이 오직 `src/**/*.test.{tsx,ts}` 면 Gate 4 skip 허용.

**Subagent 진행 시 Playwright MCP drop 또는 실행 불가 시 즉시 halt** → user-queue 적재. 자동 defer X.

**Result narration 의무**: 매 Playwright tool result 직후 1-3문장으로 결과 해석 + 다음 행동 명시한 뒤 next tool 호출로 넘어간다. 침묵 next call / 사용자 응답 대기 멈춤 모두 금지. (응답 시간 2초+ 모든 long-running tool 동일 — Bash long-running, Agent dispatch, build, test 포함)

| Tool | 보고 형식 |
|---|---|
| `browser_navigate` | "도달 URL = ..., console N errors" + 다음 행동 |
| `browser_snapshot` | 발견 element ref 또는 구조 핵심 + 다음 click target |
| `browser_click` | 클릭 결과 (modal 열림 / nav / console 변화) + 다음 action |
| `browser_take_screenshot` | 시각 인상 (스타일 PASS / 깨짐 / partial) + 다음 action |
| `browser_console_messages` | error/warning 개수 + 핵심 메시지 1줄 + 신규 vs pre-existing 판정 |
| Last tool of routine | PASS/FAIL verdict + commit/halt/추가수정 결정 |

**Playwright MCP debugging cheatsheet**:

- `Target page, context or browser has been closed` — MCP 세션 drop. 사용자에게 `/mcp` reconnect 요청 → 재연결 후 navigate 재시도
- Login 후 빈 페이지 / `/your-protected-route` 가 `/login` 으로 redirect — JWT 만료 (24h) 또는 cookie drop. `browser_navigate <your-app-login-url>` 후 §OAuth click-through protocol 절차 (agent-driven) 적용. 사용자 대기 X. Halt 는 §OAuth click-through protocol 본문의 6 entries (NEW-ACCOUNT / MULTI-ACCOUNT / CONSENT-LOOP / STUCK / CHALLENGE / PROVIDER-ERROR) 만.
- `Cannot GET <path>` — backend redirect mismatch 또는 SPA fallback 미설정. auth controller redirect 경로 또는 frontend route 확인
- `--no-sandbox` / Chromium launch error — `/mcp` reconnect 로 대부분 해결. 반복 시 사용자 env MCP config browser args 점검
- Screenshot이 repo root에 저장됨 — filename 절대/상대 경로 없이 전달한 결과. commit 전 `ls *.png` 점검 후 `.playwright-mcp/` 또는 `docs/screenshots/` 로 이동
- `prose` markdown styling 안 먹음 — `src/styles/globals.css` 에 `@plugin "@tailwindcss/typography";` 등록 필요 (Tailwind v4 plugin import). dep 설치만으론 부족
- Modal 열린 후 console 1 `Function components cannot be given refs` warning — Radix Dialog 내부 SlotClone forwardRef issue. **pre-existing 라이브러리 warning**, 차단 사유 X
- 사용자가 본 페이지가 stale (어제 빌드 그대로) / 새 컴포넌트 안 보임 — dev server 죽었거나 dev build fail (e.g. Tailwind v4 @import order = dev fail / prod pass 격차). `ps aux | grep -E "vite\|next\|nest"` + `tail -50 <dev log>` error 패턴 grep → root cause fix → dev 재시작 → log success 확인. production build PASS 만으로 결론 금지. 본문: `kzk-playwright-verification §Dev/prod build divergence trap`
- Multi-account profile / OAuth chain stuck — agent 가 picker / consent 페이지에서 polite-stop. 단일 계정 캐시 = 자동 클릭, 2+ 캐시 = halt + Q-PW-OAUTH-MULTI-ACCOUNT (사용자에게 어느 계정), 0 캐시 = halt + Q-PW-OAUTH-NEW-ACCOUNT, consent 4페이지 초과 = halt + Q-PW-OAUTH-CONSENT-LOOP, reCAPTCHA/challenge = halt + Q-PW-OAUTH-CHALLENGE, 30s 무변화 = halt + Q-PW-OAUTH-STUCK, 또는 sign-in click verification 2회 fail = Q-PW-OAUTH-STUCK. 본문: `kzk-playwright-verification §OAuth click-through protocol`

### Doc-only commit 예외

source code 변경 없이 문서/설정/screenshot 만 수정 (예: `*.md`, `*.mdx`, `*.rst`, `*.adoc`, `*.txt`, `docs/**`, `harness-flow-progress.md`, `CLAUDE.md`, `DESIGN.md`, `skills/**/*.md`, `.claude/skills/**/*.md`, `docs/screenshots/**`):
- Gate 2 (build) + Gate 3 (test) skip
- Gate 1 (ai-slop-cleaner) 변경 md 에 한해 필요시
- Gate 3.5 N/A (doc-only commit exception — no docker trigger)
- Gate 4 N/A
- autonomous 모드 = 사용자 확인 없이 commit 허용. 평소 = 사용자 확인

코드 변경 1줄이라도 섞이면 full 10-gate 수행 (AGENTS.md hierarchy 가 없는 레포는 Gate 0 N/A, 9-gate).

**AGENTS.md / README.md 분류 기준**: 이 파일들은 `*.md` glob 에 해당하지만 상황에 따라 다름.
- 단독 수정 (파일 구조 변경 없는 routine 갱신) → doc-only 적용 O. Gate 0 트리거 안 됨 (source file add/delete 없음).
- Gate 0 트리거 commit 에 동승 (source 파일 추가/삭제와 같은 commit) → doc-only 적용 X. source 변경이 예외 자동 해제.

### Doc-only fast path

Staged diff = only `*.md`, `*.mdx`, `*.rst`, `*.adoc`, `*.txt` (skills / harness-share / CLAUDE / README / progress / docs/) + no source file → run only Gate 1.5 (secrets) + verify-install AC2 (marker row count). Full gate set runs once at cycle close. See `kzk-pre-commit-gate §Doc-only patch policy`.

## 3.5. CRG Auto-refresh Policy

code-review-graph 인덱스를 항상 최신 상태로 유지하는 정책. fix-scope-expansion (Gate 4.5) 의 정확성 보장 — stale CRG = false-positive callsite mismatch 또는 누락 위험.

### session 처음 CRG call 시

`kzk-codebase-survey §Step 0.5 (f)` 적용:
1. `code-review-graph status` 로 `Built at commit: <sha>` vs `git rev-parse HEAD` 비교
2. drift > 0 시 `code-review-graph update` (incremental) 실행. 실패 시 `code-review-graph build` (full) fallback.
3. session cache update — `CRG_LAST_BUILT_SHA`, `CRG_FILES`, `CRG_NODES`
4. 이후 동일 session 안 추가 CRG call 은 cache 신뢰 (반복 build X)

### multi-Plan continuation 시작 + 각 plan 사이

`kzk-autonomous-loop §Multi-plan CRG refresh` 적용:
- Plan A 직전: `code-review-graph build` full rebuild
- 각 plan 사이: `code-review-graph update` incremental (실패 시 full build fallback)

### commit 직후

`kzk-pre-commit-gate §Post-commit CRG refresh` 적용 (incremental update + session cache invalidate — `CRG_LAST_BUILT_SHA` reset).

### Skip 조건

`KZK_CRG_NO_REFRESH=1` env (CI / debug 용).

### Gate 5 — Fresh-agent verifier (Plan C rev2)

자율실행 mode / large-task delegation 끝 / **메인 직접 commit 모든 case** / high-risk tag (auth/payment/migration/public API) / 3+ 파일 multi-file 의 commit 직전:
- `oh-my-claudecode:verifier` (fallback `oh-my-claudecode:code-reviewer`) dispatch
- model 분기: `git diff --cached --shortstat` → < 3 files && < 100 LoC → `model="sonnet"` 명시, 그 외 → model 생략 (메인 opus 상속). high-risk / 메인 직접 commit → model 생략 (opus 상속)
- VERDICT enforcement: 첫 줄 `VERDICT: PASS|FAIL|PARTIAL` 강제. 정규식 위반 → INVALID_VERDICT → fail-closed BLOCK + Q-VERIFIER-INVALID
- 메인 self-approve 금지. PASS 받기 전 commit BLOCK
- 2 consecutive FAIL on same thread `(plan_path, acceptance_id, verification_round)` → halt + Q-VERIFIER-FAIL
- Stage 3 cache 같은 turn 내 hit 이면 인용 (key = staged_diff_hash + acceptance_hash + verifier_model)
- Plan C self-bootstrap commit 1회만 N/A

룰 본문: `kzk-pre-commit-gate` §Gate 5, `kzk-large-task-delegation` §Three-stage review §Stage 3.

**자율실행 exit verifier (별개 trigger)**: 자율실행 loop (`ralph` / `ulw` / `web-loop` / `autopilot` / harness self-improvement / "끝까지 끝내줘" / "자는 동안 진행해") 의 마지막 commit 후 다음 cycle 진입 또는 종료 보고 직전 의무. 단일 cycle 도 동일. Gate 5 (per-commit code-level lens) 와는 다른 lens — exit verifier = run-level **user-persona lens** (dev server health + Playwright user navigate + browser console + HMR error + 변경 의도 vs 화면 일치). main self-declared "다 됐다" / "verification PASS" 금지 → halt entry `Q-COMPLETION-SELF-VERIFY`. 절차 본문: `kzk-autonomous-boundary §Autonomous completion — fresh-agent verifier`.

### Token migration — shadcn + Tailwind v4 bridge requirement

Official shadcn new-york blocks use prefix-less tokens (`--background`, `--primary`, `--sidebar`). When the host project uses Tailwind v4 `@theme { --color-* }`, a bridge is required:

```css
@theme inline {
  --color-background: var(--background);
  --color-primary: var(--primary);
  --color-sidebar: var(--sidebar);
  /* ... */
}
```

Renaming variables but moving values does NOT make shadcn utility classes work. Always confirm against `/shadcn-ui/ui` via context7 (§9) before migrating tokens. Session-6 ui-migration-shadcn lesson.

### Gate 6 — Cycle-exit verifier (조건부 발동, hook-enforced)

- **Trigger**: hook `check-cycle-exit.mjs` 가 Signal A (PR/push) 또는 Signal B (commit message marker) 매칭
- **Signal A**: `gh pr create|merge` / `git push origin main` (모든 refspec 형식 포함 — `HEAD:main`, `<sha>:main`, `feature/foo:main`)
- **Markers (Signal B)**: `^MILESTONE:` / `^CYCLE-EXIT:` / `^STUB-CLEAR:` (3개, multiline mode, case-sensitive)
- **Action**: fresh-agent verifier dispatch (`oh-my-claudecode:verifier`) 의무. 메인 self-execute 금지 (`Q-COMPLETION-SELF-VERIFY`). 4 sub-check mandate: (1) prod-build user-persona smoke, (2) stub sweep, (3) SoT alignment, (4) spec-freeze re-check. 상세: `kzk-pre-merge-sync §5/§6/§7`, `kzk-autonomous-boundary §Cycle-exit mandate`.
- **Pass condition**: 4 sub-check 모두 PASS + `KZK_CYCLE_EXIT_VERIFIED=1` env var 로 원래 명령 재시도
- **Bypass**: `KZK_CYCLE_EXIT_SKIP=1` (Q-CYCLE-EXIT-STALE queue entry 자동 등록)
- **Disable** (installed env): `KZK_CYCLE_EXIT_DISABLE=1` (loud stderr warning + Q-CYCLE-EXIT-DISABLED)
- **Conflict**: VERIFIED + SKIP 둘 다 set → BLOCK (fail-closed, 명시 메시지 "conflicting trust states")
- **Short-circuit**: `check-skill-flow-fresh.mjs` 가 먼저 BLOCK 하면 cycle-exit 실행 안 됨 — 두 hook 다 PASS 해야 commit 진행 (AND condition, race 없음). skill-flow-fresh → cycle-exit 순서.

### STUB / STUB-CLEAR commit message convention

Commit message body 에 다음 형식으로 stub 도입 / 해소를 표시:

```
# Stub 도입 commit (hook BLOCK 대상 아님)
STUB: <one-line description>
Unblocked when: <phase or condition>

# Stub 해소 commit (STUB-CLEAR: → Signal B → hook BLOCK 대상)
STUB-CLEAR: <stub-id or one-line>
```

- `STUB:` 만 있는 commit → hook BLOCK 안 함 (stub 도입은 cycle-exit 아님)
- `STUB-CLEAR:` → Signal B 매칭 → Gate 6 발동, 4 sub-check 의무
- `MILESTONE:` / `CYCLE-EXIT:` 도 동일하게 Signal B. See `kzk-pre-merge-sync §5`.

---

## 4. Subagent-Driven Dispatch

### Large Task = subagent 의무

다음 중 하나라도 해당 시 **메인 컨텍스트 직접 작업 금지**, subagent 필수:
- 3개 이상 파일 동시 편집 (refactor, migration, component rewrite)
- 단일 commit 200 라인 이상 변경 예상
- design system / token 전면 재작성 (CSS, tokens)
- 단일 plan scope 전체
- 빌드·테스트·Playwright·code-reviewer 여러 단계 동반
- 5개 이상 파일 read 가 필요한 검증·audit (스펙 ↔ 구현 매칭, 버그 전수조사, 기존 시스템 review) — read-only 도 메인 직접 read 금지, EXPLORER subagent 가 담당

### 메인 컨텍스트 허용 영역

trivial, fast, safe:
- 설정 파일 1줄 수정 (MCP args, tsconfig 단일 옵션)
- 단일 rule 추가 (CLAUDE.md / 가이드 항목 1개)
- 단일 파일 5라인 이하 fix (typo, import 1줄, variable 이름 교체)
- subagent 결과 review · gate 확인 · commit · push

### Subagent prompt 작성 의무

매번 fresh subagent — 이전 대화 기억 없음. prompt 자체 충분 필수:
- 작업 scope (file paths, line ranges)
- Plan 파일 경로 (해당 task 명시)
- Required reading list (CLAUDE.md, spec, sister file)
- Rules (TDD strict / context7 mandate / Pre-commit Gate / DO NOT MODIFY list / branch boundary)
- Commit message convention
- Working directory (절대 경로)
- Race condition awareness (parallel subagent 와의 file 영역 분리)
- Return format (성공 시 보고 구조)
- Halt 조건 (blocked 시 user-queue 적재)

prompt 길이 보통 60~150 lines. terse prompt = shallow work.

### Parallel dispatch

CLAUDE.md priority: "Fire independent agent calls simultaneously". file 영역 분리된 task 들은 동시 dispatch:
- 한 응답에 multiple `Agent` tool calls
- `run_in_background: true` 옵션 = 메인이 다른 일 진행 가능, 자동 알림

Race condition 회피:
- 같은 file 영역 = sequential 강제 (예: same controller 의 두 endpoint = 한 agent 가 처리)
- git push race 발생 시 fetch + rebase + push (subagent 가 자동 처리)

### Two-stage review (subagent-driven-development skill 의무)

각 task 끝나면 메인이:
1. Trust-but-verify — git log + diff + dist 직접 확인
2. Build / test / Playwright (해당 시) 결과 검증
3. spec 의 acceptance criteria 충족 확인

agent summary 만 신뢰 X — implementation 차원 검증 의무.

4. **Stage 3 — Fresh-agent verification (Plan C rev2)** — 자율실행 cycle 끝 / large-task delegation 끝 / 메인 직접 commit 모든 case / high-risk tag / 3+ 파일 multi-file 의 commit 직전 fresh `oh-my-claudecode:verifier` dispatch. VERDICT 첫 줄 강제. 메인 self-approve 금지. 2 consecutive FAIL on same thread → halt + `Q-VERIFIER-FAIL`. INVALID_VERDICT → fail-closed BLOCK + `Q-VERIFIER-INVALID`. 룰 본문: `kzk-large-task-delegation` §Three-stage review §Stage 3.

## §Task-level dispatch shape

### Plan reference policy

- Dispatch prompt 안에 plan 파일 path 만 references 로 넘김.
- Full plan 본문 인라인 금지 (3k 라인 plan 도 path 1줄로 끝).
- Required reading 형식:
  ```
  Required reading:
  - /abs/path/plan.md §Group A.1 (lines 64–150)
  - /abs/path/spec.md §<section> (if relevant)
  ```

### Dispatch prompt anatomy

(sonnet executor 기준 — must include all existing Subagent prompt requirements from SKILL.md:220-235 plus the literal boilerplate text)

**Literal block extraction rule** (cycle 3 N1 fix): when the template below references "literal block from §X", copy ONLY the fenced code block content from that section. Do NOT include the surrounding meta-prose (e.g., "auto-inject..." explanations). The fenced rule body is the contract; the prose is documentation.

```
You are oh-my-claudecode:executor for kzk-harness <project>.

## Task
Execute task <task-id> from plan.

## Required reading
- /abs/path/to/plan.md §<section> (lines N1–N2)
- /abs/path/to/spec.md §<section> (if relevant)
- /abs/path/to/<touched-file>.ts

## Scope
Files you may touch: <explicit list, no glob>
Files you may read but not edit: <list>
DO-NOT-MODIFY paths: <list per kzk convention>

## Branch contract verification
Before any edit, run `git branch --show-current` and verify the branch matches
the session contract (locked by kzk-autonomous-boundary). If branch is `main`,
direct-main flow must have been explicitly authorized this session.

## Task body (inlined excerpt from plan §<section>)
<task body, ≤120 lines soft cap; hard trigger if exceeded — see §Plan size policy>

## Rules block — kzk-required boilerplate (LITERAL, all inlined every dispatch)

### Anti-self-verification (from §Anti-self-verification boilerplate)
<literal block from skills/kzk-large-task-delegation/SKILL.md §Anti-self-verification boilerplate>

### Production-code-first (from §Production-code-first boilerplate)
<literal block from skills/kzk-large-task-delegation/SKILL.md §Production-code-first boilerplate>

### Code-quality-discipline (from §Code-quality-discipline boilerplate)
<literal block from skills/kzk-large-task-delegation/SKILL.md §Code-quality-discipline boilerplate>

### TDD strict
- Red→Green→Refactor mandatory (per kzk-test-coverage).
- Failing test BEFORE implementation is non-negotiable in autonomous mode.
- Touched-file 100% line+branch coverage (per kzk-test-coverage).

### Plan reference policy (task scope discipline)
- Execute ONLY the task body above. Do not touch adjacent tasks even if they
  look related. If you find scope ambiguity, STOP and return findings.

### Halt conditions
- If blocked / scope creep needed / plan ambiguous → STOP and return findings;
  do not improvise.

### External library / API usage
- context7 mandate: before implementing with any external library/framework/SDK,
  fetch current docs via context7 MCP. Don't rely on training data.

### Pre-commit gate
- Final commit must pass kzk-pre-commit-gate (Gate 0 AGENTS.md sync if applicable,
  Gate 0.5 freshness, Gate 1.5 secrets, etc. per skill body).

### Race-condition awareness
- File scopes vs other parallel subagents in this wave: <list of sibling wave tasks>

### Regression-recall (cycle 4 B2'' fix — invocation aligned to gstack/learn SoT)
- If this dispatch is a fix-start (per kzk-regression-memory trigger keywords),
  recall prior regression entries before drafting the test/impl. Use the
  `gstack:learn` skill via `Skill("gstack:learn")` and follow its `search`
  flow (per `~/.claude/skills/gstack/learn/SKILL.md:690-692`), or run the
  CLI binary `gstack-learnings-search --query "<query>"` if available (per
  SoT `~/.claude/skills/gstack/learn/SKILL.md:718` — `--query` flag 의무).
  Inline any non-dismissed entries with confidence ≥ 0.6 here as context.
  Cite recall result file paths.

### CRG refresh (cycle 4 P1'' fix — relaxed to session-level + Gate 0.5 gating)
- Per-dispatch CRG refresh is NOT required. Default is session-level: main
  refreshes CRG once per session before the first plan-touching dispatch
  (via `code-review-graph update`, build fallback if `update` unavailable).
- If kzk-pre-commit-gate Gate 0.5 freshness check is gating the commit at
  cycle end, executor's wave-completion subagent (not per-task executor)
  runs `code-review-graph update` before re-attempting commit.
- **Mid-cycle re-refresh (cycle 5 N2''' fix)**: 새 commit 이 cycle 중간에
  들어가고 그 후에 plan-touching CRG usage 가 더 있으면 (예: 다음 wave 가
  같은 영역 read), 그 사용 시점에 main 이 `code-review-graph update` 1회
  추가 호출. 즉 "session-level 1회" 는 floor, "code-touch 후 cache-invalidation
  필요 시점" 은 추가 refresh trigger. 이는 kzk-codebase-survey 의 cache-
  invalidation 의미와 일관.
- See `~/.claude/skills/kzk-codebase-survey/SKILL.md:55-67` for the SoT
  refresh contract.

### Commit convention (cycle 3 B2' fix)
- DO NOT add Co-Authored-By trailers (global ~/.claude/CLAUDE.md mandate).
- Use HEREDOC for commit messages with multiple lines.
- Pass commit message via `git commit -m "$(cat <<'EOF' ... EOF)"`.

## Output contract
Concise execution summary <100 words: what changed, files touched,
verification status (test ran? coverage met?), blockers. No long logs inline.
```

### Per-task line guide

- **Soft trigger**: task body ≤120 라인 권장 (cycle 3 B1' fix — was 150; lowered so anatomy total + body stays within sonnet 100–220 prompt budget). 초과 시 writer 의 자가검토 trigger. codex Step 2 review NIT 지적 가능.
- **Hard trigger**: task body > 120 라인 시 plan 작성자는 그 task 안에 `## Split rationale` 단락 명시 + reviewer subagent (opus) ACK before dispatch. Reviewer ACK 없으면 dispatch 금지.
- **Hotfix bypass (cycle 3 P2' fix; cycle 4 N2'' format pinned)**: `HOTFIX_ACK_DEFER=1` env var + 사용자 explicit approval (this session) = reviewer ACK defer 가능. 단, post-fix reviewer backfill 의무 (다음 cycle 안에 dispatched task 의 retroactive review) + `docs/harness/user-queue.md` 에 `Q-HOTFIX-ACK-DEFER` entry 의무. **Queue 삽입 형식**: 새 `## Pending — Q-HOTFIX-ACK-DEFER (<ISO timestamp>)` heading 으로 append (기존 `## Pending — Q-TOOL-EDIT-RETRY-EXHAUSTED` 패턴 동일). 본문 필드: `- Task id: <id>`, `- Defer time: <timestamp>`, `- Backfill deadline: <within next cycle>`, `- User approval quote: "<≤1 sentence>"`.
- Atomic deliverable 의무 변동 없음 (PR-sized commit + 단일 RED→GREEN→REFACTOR).

## §Multi-dispatch wave shape

### Wave 식별 정책

(cycle 2 정정 — dependency declaration mandatory)

- Plan 본문에 parallel wave 가 있으면 **`## Dependencies` 섹션 의무** (canonical heading). `## Execution waves` 는 optional supplement (visualization 용도).
- 누락된 plan = **legacy fallback**: conservative sequential 만 (자동 parallelism 금지). file-disjoint heuristic 은 적용하지 않음.
- 새 plan 작성 시 `## Dependencies` 형식 의무 — writer 가 의존성 명시.

### 권장 plan 본문 형식 (필수)

```markdown
## Dependencies

- Group A (DTOs) → Group B (Service) — B reads A.
- Group B (Service) → Group C (Controller) — C reads B.
- Group D (cleanup) ∥ Group A, B, C — independent.

## Execution waves

- Wave 1: Group A.1, A.2, D.1, D.2 (parallel-safe per `## Dependencies`)
- Wave 2: Group B.1, B.2, B.3 (depends on Wave 1)
- Wave 3: Group C.1, C.2 (depends on Wave 2)
```

**Semantic-dependency note**: file-disjoint != semantic-disjoint. Shared types, contracts, test fixtures may produce races even when file lists are disjoint. Writer must reason about these and declare in `## Dependencies`.

### Wave dispatch 절차

1. Main 이 plan 전체 read (한 번).
2. Wave 1 의 모든 task 를 fresh subagent 로 병렬 dispatch (`Agent()` calls in single message, `run_in_background: true` per existing SKILL.md:291 + harness-share.md:381 parallel-dispatch rule).
3. 모든 wave 1 task 완료 알림 자동 수신 (harness 가 background completion notification 보냄 — sleep 금지).
4. Wave 1 결과를 fresh reviewer subagent 로 합류 검토 (`oh-my-claudecode:code-reviewer` 또는 `verifier`, opus).
5. Reviewer PASS → wave 2 dispatch / FAIL → 해당 task 재 dispatch (다른 fresh subagent).
6. 모든 wave 완료까지 반복.

### Wave 사이즈 가이드

- 한 wave 에 최대 5 parallel task 권장 (kzk operational empirical: 5 초과 시 wave 합류 검토 단계의 reviewer subagent context 부담 + rate limit 변동성 증가 관찰).
- 5 초과 시 자동으로 다음 wave 로 split (task drop 아님).
- Hard cap 아님 — 충분한 reviewer context budget 이 있고 wave 의 task 들이 의미적으로 같은 deliverable 이면 5 초과 OK.

### Three-stage review 와의 관계

- 기존 §Three-stage review (executor → critic → verifier) 는 task-단위 적용 유지.
- §Multi-dispatch wave shape 의 "wave 결과 합류 검토" 는 wave-단위 추가 합류 검토 — task 단위 critic/verifier 위 단계.
- 즉 task 단위 검토 PASS → wave 단위 합류 검토 PASS → 다음 wave.

## §Plan size policy

### Plan file 자체 크기

- Line cap 없음 (gridless `grid-lock-phase-2-plan.md` 3,031 라인 정상).
- Plan 은 phase 단위 분리 가능 (`grid-lock phase 1–4` 처럼 `2026-05-12-grid-lock-phase-{1,2,3,4}-plan.md`).

### Per-task atomicity (의무 + hard trigger)

- 한 task = 한 PR-sized commit.
- 한 task = 단일 RED→GREEN→REFACTOR.
- Task body soft cap = ≤120 라인 (cycle 3 B1' fix — was 150). 초과 시 hard trigger: `## Split rationale` 단락 + reviewer subagent (opus) ACK before dispatch (§Task-level dispatch shape per-task line guide 참조).

### Phase split 권장 threshold

- 50+ task / 5,000+ 라인 / 9+ Group 단위 → phase 분리 권장 (gridless 패턴).
- Phase 간 의존 plan 상단에 명시:
  ```markdown
  ## Phase dependencies
  - Phase 2 depends on Phase 1 §Group H (RDG-WS contract frozen).
  - Phase 3 depends on Phase 2 §Group I (acceptance verification).
  ```

### Cross-phase dependency 표기 (gridless reference)

- `2026-05-12-grid-lock-phase-2-plan.md` 의 phase-1 reference: "Phase 2 picks up after Phase 1 §Group H freezes the RDG-WS contract."
- 본 정책 적용 시 plan 작성자가 이 형식 사용 권장 (의무 X — cross-phase 는 plan 외부 의존).

### Migration 정책

- 기존 plan retro 적용 X (grandfather).
- 새 plan 부터 §Multi-dispatch wave shape 의 `## Dependencies` 섹션 의무 (parallel wave 가 있는 모든 plan).
- 기존 plan dispatch 시: `## Dependencies` 부재 → conservative sequential 만 (auto-parallelism 금지). 작성자가 후속 update 시 `## Dependencies` 추가 권장.

### Dependency addendum sidecar (cycle 3 P1' fix)

기존 frozen plan 본문은 spec-and-review Step 3 PASS 후 immutable 이라 직접 `## Dependencies` 추가가 어려움. 대안: sidecar artifact:

- 위치: `docs/plans/<plan-basename>-dependencies.md` (e.g., `2026-05-12-grid-lock-phase-2-plan-dependencies.md`)
- 본문: 동일 `## Dependencies` + `## Execution waves` 형식 (5.2 권장 형식)
- Frozen plan 자체 unchanged. Sidecar 는 plan owner 가 작성 + reviewer subagent ACK 1회 필요.
- Main dispatch 시: plan path 와 sidecar path 양쪽을 Required reading 에 inclusion.
- Plan 본문에 직접 `## Dependencies` 가 있으면 sidecar 우선순위 X (plan 자체가 source of truth).
- **Conflict 처리 (cycle 4 N1'' fix)**: plan body 와 sidecar body 모두에 `## Dependencies` 가 존재하고 disagree 할 때, main 은 sidecar 를 무시하고 plan 본문만 사용. 동시에 `docs/harness/user-queue.md` 에 `Q-SIDECAR-DRIFT` Pending entry 등록 — plan owner 가 cleanup (sidecar 삭제 또는 plan body update) 결정 필요. Sidecar drift 상태에서는 parallel wave 인가 X (보수적 sequential).

---

## 5. Documentation Storage Rules

모든 AI tool 이 생성하는 design 문서는 다음 경로에 통일 저장. 각 도구의 default 경로 (`~/.gstack/projects/...`, `.omc/plans/`, `docs/superpowers/specs/`, `docs/superpowers/plans/`, etc.) 는 본 가이드로 override.

| 종류 | 위치 | 형식 |
|---|---|---|
| PRD | `docs/prd/` | `YYYY-MM-DD-<topic>.md` |
| Design docs / spec drafts (brainstorming 산출물) | `docs/plans/` | `YYYY-MM-DD-<topic>-design.md` |
| Implementation plans | `docs/plans/` | `YYYY-MM-DD-<topic>-plan.md` (또는 `YYYY-MM-DD-<topic>.md`) |
| Harness experiment metadata | `docs/harness/` | `<topic>.md` |
| Research notes | `docs/research/` | `<topic>.md` |
| Retrospectives | `docs/retro/` | `<topic>.md` |
| Screenshots (PR 첨부용) | `docs/screenshots/<session>/` | `<topic>-NN.png` |

이 규칙은 도구 간 문서 난립 방지 + git 버전 관리 + 팀 공유 보장 목적.

**Path consolidation note** (2026-05-12): superpowers brainstorming 의 design doc 출력은 historically `docs/superpowers/specs/` 였지만, 이제 `docs/plans/` 하나로 합친다. `-design.md` 접미사로 design / `-plan.md` (또는 접미사 없음) 으로 implementation plan 을 구분한다. 기존 `docs/superpowers/*` 파일들은 2026-05-12 자율 cycle 에서 모두 `docs/plans/` 로 마이그레이션 완료 (8 files; `-plan.md` 접미사 추가됨). 더 이상 `docs/superpowers/` 디렉토리는 존재하지 않음.

---

## 6. user-queue.md — Autonomous 모호 결정 기록

위치: `docs/harness/user-queue.md`

### 운용

- 파일 위치: `docs/harness/user-queue.md`. 시간 역순 — 최신 entry 위.
- autonomous 중 모호 결정 발생 → queue 에 entry append + **잠정 default 선택으로 진행**
- 사용자가 복귀 후 queue 읽고 방향 확정 → 별도 commit 으로 entry 에 `**DECISION (YYYY-MM-DD):**` line 추가
- Resolved entries → `## RESOLVED` 섹션 이동

### Easy override 요구

- 모호한 결정을 hardcode 말고 **flag / config / param** 으로 노출
- subagent 호출 시 prompt 에 "이 결정은 user-queue entry #N 기준 잠정. 사용자가 뒤집을 수 있게 parametrize 해서 구현해라" 명시

### Entry 형식

```markdown
### Q-<TOPIC> — <한 줄 요약>

- **Context**: <상황 + 결정 필요 사유>
- **Options**:
  1. <option 1>
  2. <option 2>
  3. <option 3>
- **Tentative default**: <option N> — <사유>
- **Override 방법**: 이 entry 하단 `**DECISION (YYYY-MM-DD):** Option N`
- **Impact**: <forward-only? rollback 비용? 영향 범위?>
```

### 섹션 구조

- `## OPEN` — 해결 대기 중인 entry. 최신 entry 위 (시간 역순).
- `## RESOLVED` — 완료된 entry (`- [x]` 체크). 시간 역순.
- `## 사용하지 않음 (NOT_USED)` — 미채택/defer backlog.

Simple one-liner (체크박스 형식):
```markdown
- [ ] YYYY-MM-DD HH:MM — Q-<TOPIC> — <한 줄 요약> (cycle N)
```
완료 시 `- [x]` 로 변경.

### Interactive Review Protocol (사용자 복귀 시)

1. Pending entries 를 3 그룹 분류:
   - GROUP A — default 이미 코드 적용됨 (override = rollback)
   - GROUP B — 실제 pending (현재 영향 없음)
   - GROUP C — 후속 plan 시점 gate
2. GROUP A 부터 영향도 높은 순으로 AskUserQuestion 1개씩 묻기
3. accept / override / 상세 설명 / skip 옵션
4. accept 묶음 → bulk Resolved 이동
5. override 발생 → rollback/forward task 추가 user-queue entry

### Stage 3 — User Queue Resolution Loop

After Stage 1 + 2 finish and the user appends DECISIONs:

- Apply Resolved decisions to affected artifacts (PRD / plan / code)
- Max **3 iterations** (infinite-loop guard)
- Same entry processed twice OR DECISIONs conflict → move to `## Escalated` section + separate user session
- Full Stage 3 state machine: three phases (classify → GROUP A interactive review → resolution apply), max 3 iterations, conflict moves to `## Escalated`

### Halt when crossing un-applied policy areas

If autonomous run reaches code / plan that pre-dates a current rule (e.g. plan written before PRD v1.13), halt + append a user-queue entry. Do NOT retroactively rewrite policy via subagent guess. The user resolves direction; the loop resumes only after a DECISION line is appended.

---

## 7. harness-flow-progress.md — Timeline 추적

위치: repo root `harness-flow-progress.md` (git tracked).

목적: 재현 가능성 + 팀원 onboarding + 자동화 재료.

### 기록 시점 (필수)

- 새 skill 호출 시작/종료
- subagent dispatch (모델 + scope)
- 주요 문서 산출 (PRD version bump, plan 신규 저장)
- 사용자 결정 (AskUserQuestion 결과) — 갈림길만
- 사용자 정정 (이전 결정 뒤집기 + 이유)

### Session 별 형식

```markdown
## Session N — <Topic> (YYYY-MM-DD)

### Context
<trigger + mode + architecture>

### Skill Chain Timeline
| # | Phase | Action | Output |
| ... |

### 체크포인트 Log
| Item | Status | Note |
| ... |

### Architecture impact (post-Plan X)
- DB / API / Web / Skills 영역 별 변경

### MANUAL handoff (사용자 복귀 시)
1. <Q-PLAN-X-Y reference>
2. ...

### Session N 종결 상태 (YYYY-MM-DD)
**Commits on `<branch>`** (M total):
1. SHA1 ...
2. SHA2 ...

### 다음 세션 (Session N+1 후보)
- ...
```

### 원칙

- git tracked (gitignore X)
- 세션 종료 시 "세션 종결 상태" 블록 작성
- 다음 세션 시작 시 "Session N+1" 헤더 추가하고 continue
- skill/agent 호출 이름 정확히 (예: `superpowers:brainstorming`, `oh-my-claudecode:executor`)

---

## 8. Commit Rules

- 절대 `Co-Authored-By` 줄 commit message 에 **금지**
- 영어 conventional commits (`feat(scope): ...`, `refactor(scope): ...`, `docs(scope): ...`, `fix(scope): ...`)
- HEREDOC 으로 multi-line message 작성 (heredoc EOF 'EOF' quoted to disable variable expansion)

```bash
git commit -m "$(cat <<'EOF'
feat(scope): one-line summary

- Detail 1
- Detail 2

Pre-commit Gate: build PASS, test 30/30, Playwright 4 pages 0 err.
EOF
)"
```

- 평상시 commit = 사용자 확인 후. autonomous 모드 = doc-only OR Pre-commit Gate 통과 시 자동
- push / merge 는 §2 의 세션 branch contract 따름. 직접 `main` push 는 그 contract 가 direct-main flow 인 경우만. silent default X
- pre-commit hook (--no-verify) skip 금지

---

## 9. External Library API Lookup (context7 MCP)

외부 library / framework / SDK (shadcn, lucide-react, radix-ui, react-markdown, NestJS, TypeORM, zod 등) 의 API / 구현 패턴 / best practice 가 필요한 작업:

**경험·추측 금지. `mcp__plugin_context7_context7__*` MCP tool 로 실 문서 확인.**

순서:
1. `resolve-library-id` 로 Context7 library ID 조회 (`/shadcn-ui/ui`, `/vercel/next.js` 등)
2. `query-docs` 로 specific 질문 (예: "sidebar collapse animation transition duration CSS")
3. 답 본 후에만 CSS/TS 구현 결정
4. commit message 또는 PR description 에 "context7 referenced `/org/project` for <concept>" 라인 포함
5. subagent (executor, designer, debugger) prompt 에 "라이브러리 pattern 확인 시 반드시 context7 query-docs 사용" 명시 의무

작은 이슈 (typo, spacing) 제외. animation / auth flow / cache / SDK usage 같은 **library-semantic 결정**이 대상.

미사용 시 code-review 지적 사유.

---

## 10. UI Component Standard (선택, React 프로젝트 시)

신규 React component:

- **Radix primitives** (`@radix-ui/react-*`) — accessibility / keyboard / focus trap / portal
- **shadcn/ui** styled layer — `npx shadcn@latest add <component>`
- **Tailwind CSS** utility — grid / flex / spacing / responsive
- 직접 CSS 쌓는 custom component **금지** (특히 Sidebar / Dialog / Popover / Tooltip / Tabs / Command / Form / DataTable)

기존 globals.css 토큰 시스템과 Tailwind theme 매핑. Code review 차단 사유 = composite component (Dialog / Sidebar / Tabs / Form 등) 를 shadcn/Radix 없이 scratch 작성.

---

## 11. Test Coverage 100% on Changed Code

autonomous 세션 = 변경한 파일의 라인·브랜치 커버리지 100%.

- legacy 도 touched 되면 같이 올림
- 미커버 영역 = 추가 unit/integration/e2e 테스트로 커버
- 시간 제약 시 명시적 user-queue entry + 이유 기록
- 경계: boot 파일 (main.ts), pure type declaration, ORM entity decorator-only file 은 논리 없음으로 coverage 공식 대상 외 (PR description 명시)

### 11.1 Anti-Self-Verification (TDD)

TDD red 단계에서 implementation 본 후 거기에 맞춘 test 작성하는 자기검증 루프 차단.

- **Layer (a)** — sonnet executor dispatch prompt 에 anti-self-verification boilerplate 자동 inject. 룰 본문: `kzk-large-task-delegation` §Sonnet executor — Anti-self-verification boilerplate.
- **Layer (b)** — 자율 mode (`KZK_AUTONOMOUS=1` 또는 동사구 키워드 매칭) 에서 메인 직접 TDD 진입 금지 — 반드시 fresh sonnet dispatch. 메인 직접 진입 시 halt + `Q-TDD-MAIN` user-queue entry. 룰 본문: `kzk-test-coverage` §Anti-pattern — Test-from-implementation.
- 비-자율 mode 의 메인 self-check + user ACK 게이트 — 사용자 명시 confirm 받은 후 red 진입.

> Dispatch anatomy canonical reference: §4 kzk-large-task-delegation §Task-level dispatch shape.

### 11.2 자율실행 mode 자동 TDD 적용 (auto-trigger)

자율실행 mode + code-file change → TDD strict 자동 적용. explicit 'tdd' 키워드 불필요.

- **정의**: 자율 mode 활성 (Category A 동사구 OR `KZK_AUTONOMOUS=1`, §33 참조) AND staged/in-progress diff 에 code-file 변경 포함 (doc-only 제외 — `*.md`, `*.mdx`, `*.rst`, `*.adoc`, `*.txt`, `docs/**`, `skills/**/*.md`, `harness-share.md`, `CLAUDE.md`, `AGENTS.md` 는 doc-only; SoT: `kzk-pre-commit-gate §doc-only fast path`).
- **절차 본문**: `kzk-test-coverage §Autonomous mode TDD enforcement` (code-file 정의 + enforcement + skip 조건 + TDD evidence contract + infra-missing fallback 포함).
- **Halt entry**: `Q-TDD-AUTO-MISSING` — 자율 mode + code-file 변경 감지 후 해당 cycle 에 failing→passing test 없이 commit 시도 시 halt. 등록: `kzk-autonomous-boundary §Halt conditions`.
- **Evidence contract**: commit-message footer 필수 — `TDD evidence: test_files=…, covers_code=…, runner=…, runner_exit=0`. 3-artifact 요건 미충족 시 `Q-TDD-AUTO-MISSING`. 본문: `kzk-test-coverage §Autonomous mode TDD enforcement §TDD evidence per cycle`.
- **Skip**: 사용자 명시 "TDD 빼고" / "skip TDD" 1회만.

---

## 12. Rate Limit Polling (Anthropic 5h window)

autonomous 세션 중 5h rate-limit 도달 시:

1. 중단 선언 금지. `ScheduleWakeup(delaySeconds=600)` 으로 10분 대기 스케줄
2. 대기 prompt = "계속 autonomous plan 이어서 진행 (rate limit 해제 확인)"
3. 10분 후 재개 시도 → 여전히 block 이면 다시 `ScheduleWakeup` 반복
4. 해제되면 남은 작업 목록 (harness-flow-progress.md Session N) 에서 바로 이어감
5. 총 경과는 harness-flow-progress.md 에 "rate-limit wait N회, 누적 대기 Xh" 기록

실 사용자 메시지 (신규 주제) 들어오면 그 메시지 우선.

---

## 13. Context Budget — Auto-/compact at 50%

Context token 사용률 ≥ 50% 시 다음 작업 시작 직전 `/compact` 실행. (이전 임계값 80% 는 너무 늦었음 — main agent 가 자주 인식 실패 + compact 직전 burst tool 사용으로 가용 context 추가 소모.)

### 호출 패턴 — `/compact` 에 작업 요약 인자 전달 의무

```
/compact 남은 작업: <one-line summary of remaining tasks>. 진행 중: <current task>. 다음 단계: <next planned action>.
```

빈 `/compact` 금지. Claude Code 의 `/compact` 는 인자를 "compact summary instruction" 으로 사용하므로, 인자 없이 호출하면 compact 가 무관한 부분을 보존할 수 있음. 인자에 남은 작업 + 진행 중 + 다음 단계를 명시하면 compact 가 그 focus 로 압축한다.

### Pre-compact 절차

1. 현재 plan 의 미완료 step 열거 (TodoWrite / Task list 참조)
2. 진행 중인 single task (executor dispatch / verifier 대기 / 테스트 실행 등)
3. 다음 cycle 또는 다음 action 의 이름
4. 위 셋을 한 줄로 묶어 `/compact <line>` 호출

### Post-compact 절차

compact 직후 1줄 restate 의무:
```
Cycle N, last: [issue], queue: [N remaining], PW: [ok/degraded]
```
restate 후 즉시 next tool call 진행 (polite-stop 금지).

### Autonomous mode 룰

- "polite stop" 금지: autonomous 범위 안에선 작업 완료까지 멈추지 않고 필요 시 여러 번 `/compact` 반복
- 한 cycle 안에서 2번 이상 50% 도달 시 cycle 자체가 너무 큼 — `kzk-large-task-delegation` 으로 추가 분할 dispatch
- 50% 도달 후 polite stop ("작업이 많아서 일단 여기까지...") 검출 시 즉시 `Q-COMPACT-EVASION` halt 항목 추가 — 직접 polite stop 대신 `/compact` 호출이 정답

---

## 14. Plan Auto-Continuation (multi-plan autonomous session)

여러 Plan (A~N) 순차 실행 autonomous 세션 = 중간 stop 금지:

- 한 Plan 완료 = (a) PR push (또는 별 branch 직결) + (b) 체크포인트 commit + (c) harness-flow-progress.md 갱신. 이 3단계 끝나면 **사용자 prompt 없이 즉시** 다음 Plan dispatch
- 각 Plan 사이에 다음 process 주입:
  - `superpowers:subagent-driven-development` — fresh subagent per task + two-stage review
  - `superpowers:verification-before-completion` — commit 전 evidence 필수
- 일회성 독립 작업 (2+) 병렬화 = `superpowers:dispatching-parallel-agents` 절차
- 중간 보고 없음. 모든 Plan 완료 또는 halt 조건 도달 시에만 최종 요약
- Halt 허용 조건: reviewer 2연속 FAIL / build-test 3연속 FAIL / `main` 접근 요구 / user-queue 결정 필수. 그 외 전부 continue

---

## 14.5. Pre-Merge CLAUDE.md Update

PR target branch merge 직전 CLAUDE.md 의 다음 영역이 코드 현 상태와 일치하는지 확인 + 필요 시 정정 의무:

- **Tech Stack** — ORM / framework / library 변경 반영
- **Project Structure** — 새 module / directory / file 추가 시 반영
- **API Endpoints** — controller endpoint 변경/신설 시 반영
- **Database** — schema 변경 시 반영
- **Key Rules** — 룰 변경 시
- **Environment Variables** — 신 env var 추가 시

체크포인트: PR description 에 "CLAUDE.md updated to match current state" 라인 포함. 미반영 = reviewer 차단 사유.

자동화 가능 — fresh subagent dispatch ("compare CLAUDE.md vs current code, list outdated, propose patch in single Edit").

### Cycle-exit gate (hook-driven — cross-ref)

`kzk-pre-merge-sync` 의 trigger 는 conversational keyword 가 아니라 hook 으로 enforce.
구현: `.claude/hooks/check-cycle-exit.mjs` (repo-local) + `~/.claude/skills/.kzk-harness-shared/hooks/check-cycle-exit.mjs` (글로벌, install-global default propagate).

**Normative body 는 §3 Gate 6**. 본 §14.5 는 cross-reference + 다른 자율 mode 메커니즘 (rate-limit, auto-compact) 와의 관계만 기술.

- Rate-limit 중 cycle-exit hook 발동 → hook 은 BLOCK 유지, rate-limit 해소 후 verifier dispatch + 4 sub-check 수행 후 bypass 재시도.
- auto-compact (context 50%) 중 cycle-exit BLOCK 상태라면 compact 후 재개 시 BLOCK 상태 복원 — verifier dispatch 의무 유지.
- `kzk-autonomous-loop §Multi-plan CRG refresh` 와 독립 동작: cycle-exit gate 는 CRG refresh 전/후 무관하게 Signal A/B 매칭 시 발동.

## 15. Pre-Merge `/deepinit`

branch merge 전 1회 실행해 프로젝트 manifest + skill/tool inventory + memory 재생성.

- 대상 — **PR-flow**: 모든 feature branch → `main` merge 직전 (local 1회). **direct-main / direct-no-PR flow**: 사용자 visible milestone commit (topic 마무리, release-급 상태) 직전 1회. 매 direct-main commit 직전 X (noise).
- 이유: PRD / plan / skill md 변경을 OMC memory 에 반영하지 않으면 다음 세션 agent 가 stale context 로 시작
- 실패 시 로그 확인 후 해결. skip 허용 X (contract 가 direct-main 이라도 milestone 직전 deepinit 의무)
- 체크포인트: PR description 또는 milestone commit body 에 "deepinit ran" 라인 포함

```
Skill("oh-my-claudecode:deepinit")
```

---

## 16. Other-project Setup Checklist

다른 Claude Code 프로젝트에 본 workflow 적용 시:

### 1회 setup

- [ ] `superpowers` plugin 설치 — `/plugin install superpowers`
- [ ] `oh-my-claudecode` plugin 설치 — `/plugin install oh-my-claudecode`
- [ ] OMC setup — `/oh-my-claudecode:omc-setup` (CLAUDE.md OMC 블록 자동 추가)
- [ ] OMC HUD setup — `/oh-my-claudecode:hud setup`
- [ ] 프로젝트 root 에 `CLAUDE.md` 생성 — 본 가이드의 §2~§14 룰 + 프로젝트 specific (port, build cmd, branch 이름 등) 추가
- [ ] `docs/{prd,plans,harness,research,retro,screenshots}/` 디렉토리 생성
- [ ] `docs/harness/user-queue.md` 빈 file 생성 (with `## Pending` + `## Resolved` headers)
- [ ] `harness-flow-progress.md` 빈 file 생성 (root)
- [ ] `.gitignore` 에 `.playwright-mcp/` 추가 (Playwright MCP 사용 시)
- [ ] (Playwright 사용 시) Playwright MCP 설치 + Chromium for Testing
- [ ] 자기 프로젝트의 Pre-commit Gate 명령 결정 (build / test 명령)
- [ ] feature branch 이름 결정 (예: `feature/<topic>`. kzk-harness 레포 내부에서만 `harness-test`라는 이름을 별도 컨벤션으로 사용)

### 첫 세션 시작 시

1. 사용자가 ambitious 한 task 던짐
2. 메인이 즉시 `Skill("superpowers:brainstorming")` 호출 (HARD GATE 명시)
3. brainstorming 가이드 따라 Q&A 진행 (one question at a time)
4. spec 합의 → `docs/prd/YYYY-MM-DD-<topic>.md` 작성 + commit
5. 사용자 spec review → approve
6. `Skill("superpowers:writing-plans")` → `docs/plans/YYYY-MM-DD-<topic>.md` 작성 + commit
7. 사용자 execution 결정 — subagent-driven-development OR ralph autonomous (OMC 사용 시)
8. 매 task 끝 = atomic commit + push (Pre-commit Gate)
9. 모든 task 끝 = harness-flow-progress.md 종결 record + user-queue Q-* entries 적재 + final commit + (OMC) ralph cancel
10. 다음 session = 새 Plan, 같은 흐름

### 학습된 anti-patterns (이 워크플로우의 dogfood 결과)

- **Spec brainstorming 부족 = dogfood 후 plan reverse**. 큰 architectural 결정은 brainstorming 없이 plan 직진 X.
- **메인 컨텍스트 직접 large task 작업** = token 부담 + linter race + 품질 저하. subagent 필수.
- **agent 의 spec pseudocode 맹신**. agent 가 spec 의 잘못된 가정 발견 시 grep + AGENTS.md fact-check 후 정정.
- **autonomous 모드의 polite-stop**. 사용자가 ralph 명시했으면 매 task 끝 즉시 다음 dispatch. "다음은 사용자 승인 후" anti-pattern.
- **Pre-commit Gate 4 (Playwright) skip / defer**. UI 변경 시 시각 회귀 = build/test green 으론 안 잡힘. screenshot 시각 검수 의무.
- **Spec 의 placeholder ("TBD", "implementation 시 결정")** = plan 단계의 detail 부족. spec brainstorming 단계에서 다 결정.
- **단일 subagent 한 응답 직접 수행 = 메인 context 비대**. background dispatch + 자동 알림 활용.

---

## 17. References

이 가이드의 영감 + 적용 사례:
- `superpowers:brainstorming` skill — design 단계 의무 HARD GATE
- `superpowers:writing-plans` skill — atomic TDD task 분할 형식
- `superpowers:subagent-driven-development` skill — fresh subagent + two-stage review
- `superpowers:executing-plans` skill — inline batch execution 대안
- `superpowers:verification-before-completion` skill — commit 전 evidence 의무
- `superpowers:systematic-debugging` skill — bug fix 전 root cause 의무
- `oh-my-claudecode:ralph` skill — autonomous loop with stop hook
- `oh-my-claudecode:executor` agent — opus / sonnet / haiku tier 선택
- `oh-my-claudecode:ai-slop-cleaner` skill — Pre-commit Gate 1 자동화
- `oh-my-claudecode:hud` — Claude Code statusline (5h / weekly rate limit / context bar / agent count)
- `oh-my-claudecode:deepinit` — Pre-Merge manifest 재생성
- `oh-my-claudecode:cancel` — ralph mode cleanup
- Playwright MCP — Pre-commit Gate 4 시각 검증
- context7 MCP — external library API 실 문서 lookup

---

## 18. Visibility & Communication (autonomous 모드 사용자 가시성)

Autonomous 모드의 가장 큰 함정 = 메인 컨텍스트가 background 작업 대기하며 매 turn "대기" / "진행 중" 한 줄만 답하는 패턴. 사용자 화면에는 ralph iteration counter만 올라가 — 무한 루프로 의심됨. **시각적 무한 루프 == 신뢰 손상**.

### 룰 (강제)

1. **첫 background dispatch 직후**: ETA + 진척 보고 의무. "subagent dispatched, ETA 5-10분, ralph iteration 별로 결과 통보" 식 명시.
2. **"대기" 한 줄 답 금지**: 매 turn 끝에 적어도 다음 중 하나 포함:
   - 진척 update (file count / commit / phase)
   - background agent 의 latest text snippet (1줄, 의역 OK)
   - 명시적 "next signal: <X 완료 통보>" 라인
3. **Background 에이전트 반복 폴링 금지**: 통보가 자동으로 옴. ScheduleWakeup 도 boulder hook fire 에 영향 없으므로 사용 minimal.
4. **사용자 답답함 표명 ("멈췄어?" / "왜 또?")**: 즉시 status snapshot + ETA 재공시 + 비효율 자가 진단 이행.
5. **Batch over Stop-Each-Step**: Playwright 6 페이지 검증 같은 sequence — 한 turn 에 batch tool call (parallel where 가능) + 마지막에 summary. "1/6 캡처 후 답변 멈추고 사용자 확인" 패턴 금지.

### 신호 — 사용자가 답답함 = "큰 작업 dispatch 시 communication 가시성 0" 의 lagging indicator

매 큰 작업 (subagent + multi-step + bg) 후 사용자 답답함 표명 빈도 = communication score lagging metric. 4번 이상 = 통신 룰 위반.

---

## 19. MCP Reconnection Protocol

Playwright MCP / context7 MCP / 기타 MCP 의 connection drop 발생 시 — 메인이 자체 reconnect 시도하거나 우회 우횔 시도하지 않는다.

### Drop 신호 (즉시 halt)

- `browserBackend.callTool: Target page, context or browser has been closed`
- `no-sandbox` / `context closed`
- `Failed to connect to MCP server`
- 도구 호출 silent fail / timeout

### Recovery 절차

1. **즉시 사용자에게 명시 메시지**: "MCP connection drop. `/mcp` 명령어로 reconnect 필요합니다. 완료 통보 부탁드립니다."
2. **메인 우회 시도 금지**: dev-token backdoor, alternative endpoint, 직접 curl 등.
3. **사용자 reconnect 통보 후 작업 재개**: 통보 받은 직후 동일 도구 호출 재시도.

**Why**: 사용자가 직접 `/mcp` 실행 = 1초. 메인이 우회 시도 = 분 단위 낭비 + 사용자 시야 차단 + 잠재적 코드 회귀.

---

## 20. Session Self-Critique (Russian Judge Pattern)

Plan / 큰 작업 종결 시점에서 자기비판 의무. 메모리에 누적되어 다음 세션 patterning 영향.

### 형식

```
Russian Judge Verdict:
- Technical: N.N / 10 — <한 줄 근거>
- Communication: N.N / 10 — <한 줄 근거>
- Average: N.N / 10
- Lesson learned: <feedback memory 가 새로 생성될 만한 패턴이 있으면 짧게 명시>
```

### 점수 기준

- **9.0+**: complete success — 0 회귀, 사용자 답답함 0회, all gates green, evidence 명시적
- **7.0-8.9**: success with minor friction — 1-2회 정정, 통신 부족 < 5 turns
- **5.0-6.9**: success with significant communication issues OR partial scope — 사용자 답답함 표명 ≥ 3, 또는 spec scope drift 1+
- **< 5.0**: failure / abort / human escalation 필수

### 점수 후 의무

- Average < 7.0: 새 `feedback_*.md` memory 생성 + MEMORY.md index 업데이트
- 사용자 명시 지시 ("이거 하지마" / "/mcp 필요할 땐 말해" / "한 번에 끝내라") = 즉시 feedback memory 의무 (점수 무관)

### 자기비판 antipattern

- "잘 됐어요" 형식 self-pat — 점수 기준 명시 안 됨, lessons-learned 0
- 사용자 답답함 표명을 점수 차감 사유로 인식하지 않음 — 통신 score 자가 무시
- Technical green = 자동 전체 success — 통신 / scope drift / spec calibration 무시

---

## 21. Memory Feedback Inheritance

세션 시작 시 MEMORY.md 인덱스 자동 로드 — feedback memory 의 룰 적용 의무. 메모리는 **점수가 아니라 룰**.

### 사용 패턴

1. **세션 시작**: MEMORY.md 의 모든 feedback_*.md 룰 mental model 에 로드
2. **결정 시점**: 결정 = (a) 메모리 룰 적용 OR (b) 메모리 룰 충돌 시 사용자 확인
3. **메모리 충돌**: 새 사용자 지시가 기존 feedback과 충돌 → 새 지시 우선 + 기존 메모리 update / 삭제

### 본 repo 누적 feedback (예시)

| File | 룰 |
|---|---|
| `feedback_pipeline_trigger.md` | Push 트리거로 충분할 때 custom pipeline 수동 트리거 X |
| `feedback_typeorm_sync.md` | Production 에서 typeorm `synchronize: true` 사용 금지. 반드시 migration |
| `feedback_mcp_reconnect.md` | MCP drop 시 사용자에게 `/mcp` reconnect 요청 (§19 와 일치) |

### 신규 feedback 작성 룰

- 파일명: `feedback_<short-topic>.md`
- frontmatter: `name`, `description`, `type: feedback`, `originSessionId` (선택)
- 본문 구조: rule → **Why:** → **How to apply:**
- MEMORY.md 인덱스 라인 추가 의무 (`- [name](file.md) — 한 줄 hook`)
- 200 character 이내 hook (truncation 방지)

### 누적 룰의 의의

다음 세션에 같은 실수 반복 방지 + 사용자 신뢰 보존. memory 0 → autonomous 무용. memory 누적 → 세션마다 점진 개선.

---

## 22. Codex Cross-Review for Plans

작성된 모든 plan file (`docs/plans/*.md`) 은 ralph autonomous 진입 직전 **codex 에 교차 review 의무**. main controller 의 자체 review = bias risk.

### 룰

- 절차:
  1. `/writing-plans` skill 로 plan draft 작성
  2. `codex exec` CLI 직접 호출 (full command: see `kzk-spec-and-review` §Codex execution shape (CLI best practice)) — codex가 fresh 시각 으로 review
  3. **codex CLI parse fail 시 fallback** = `Agent(subagent_type="oh-my-claudecode:critic", prompt=...)` (model 생략 → 메인 opus 버전 상속)
  4. codex/critic feedback 수신 → critical issues 반영 (architecture / acceptance criteria gap / scope drift / risk 미고려)
  5. revised plan 으로 ralph autonomous 진입
- codex/critic prompt 필수 포함:
  - plan file 전체 경로
  - spec file 경로 (있으면)
  - "Identify: (a) acceptance criteria gaps, (b) scope drift risk, (c) optimal alternative approach, (d) reviewable evidence requirements per phase"
  - "Assume autonomous ralph mode under the session branch contract recorded by `kzk-autonomous-boundary` (could be `feature/<topic>`, repo-specific like `harness-test`, or direct-main if user explicitly authorized)"
- **Iterative loop until PASS** (kzk-spec-and-review §Pattern Gate decision): single-pass codex review 가 아니라 BLOCKER 0 + 구조 변경 없음 (PASS) 까지 cycle 반복. **Default cycle budget = 5** (soft cap). Cycle ≥ 5 AND BLOCKER 잔존 시 halt + `docs/harness/user-queue.md` entry. brainstorming 단계 후퇴는 사용자가 결정 — 자율 후퇴 금지.
- **spec-and-review §Step -1 brainstorming = default ON** (see `kzk-spec-and-review §Step -1`). Step 0 survey 완료 후 brainstorming 항상 호출. Brainstorm skip = EITHER (A) 사용자 explicit `brainstorming 스킵` 명령 (standalone) OR (B) ALL of {trivial 변경 + 사용자가 모든 변경 detail 명시 + 새 capability 추가 X}. 절차 본문 + evidence 의무: `kzk-spec-and-review §Step -1`.
- **CONTINUE 트리거**: 🔴 BLOCKER ≥ 1 OR cycle 내 spec 에 구조 변경 (DTO field, API surface, validator factory, contract) 가 가해진 경우 — 변경된 spec 은 아직 codex 검증 안 된 상태이므로 cycle N+1 의무.
- **PASS 조건 (ralph 진입 OK)**: 🔴 BLOCKER 0 AND 이번 cycle 적용 변경이 NIT/wording-only 또는 push-back 정리만. 🟡 NIT / ⚪ push-back 만 남은 상태.

### Critic verdict file 저장 의무

- **모든 critic agent verdict 는 명시적 file 로 저장**: `docs/plans/<plan-name>-critic-review.md` (cycle 1), `<plan-name>-critic-review-2.md` (cycle 2). chat history 만 의존 X.
- **codex CLI 실패 (exit 2 등) 시**: codex error stub 가 file 에 저장되더라도, fallback critic agent verdict 를 같은 file 에 overwrite 또는 별도 명시 file 로 저장 의무.
- **이유**: cycle counter source-of-truth = file artifact. chat history 는 ephemeral — 다음 세션 reproducibility X.
- **How to apply**:
  - critic agent dispatch 후 응답 chat 에 노출 시, 즉시 `Write` tool 로 markdown file 작성 (verdict + findings + 처리 mapping)
  - cycle 2 진행 전 cycle 1 file 존재 + 정상 verdict 확인
  - 파일명 convention: `<plan-name>-critic-review.md` / `-critic-review-2.md`
  - cycle 2 시 cycle 1 file 의 verdict 가 cycle 2 review prompt 에 reference 로 전달

### Why

Plan I/J/K 모두 spec scope drift 발생 — main controller drafting 시 자체 blindspot. codex = different model (cross-vendor) + fresh context. 사용자 답답함 표명의 lagging metric 줄임.

### How to apply

- 새 plan = `/writing-plans` 직후 codex review. 기존 plan revision = 변경 영역만 review.
- codex 결과는 plan 파일 끝 또는 `docs/plans/<plan>-codex-review.md` 에 첨부.
- ralph dispatch 시 codex review 통과 evidence 포함.

---

## 22.5. End-to-End Ralph Pipeline (Spec → Plan → Critic → Implementation)

ralph autonomous 진입 시 spec drafting + plan drafting + critic review + implementation 모두 단일 ralph loop 안에서 처리 — 사용자 결정 요청 최소화.

### 룰

- 사용자가 idea / brainstorming 결과 (high-level goal) 만 제공 → ralph 가 다음 모두 자동 처리:
  0. **Codebase survey** — `kzk-codebase-survey` 호출, report 저장 (`docs/harness/surveys/<topic>-survey.md` 또는 `.web-loop/surveys/cycle-N-survey.md`). PRD/spec drafting 및 모든 critic review 의 Required reading. `kzk-spec-and-review` Step 0 precondition.
  1. **PRD/spec drafting** — `docs/prd/<plan>.md` 작성 (사용자 high-level goal + survey report 기반). draft prompt 의 CONTEXT block 에 survey report path 명시.
  2. **Plan drafting** — `docs/plans/<plan>.md` 작성 (`/writing-plans` skill). 동일 survey report 인용.
  3. **Critic review** (cycle 1) — codex 또는 critic agent dispatch + verdict file 저장
  4. **Plan revision** (REJECT 시) — cycle 2 max
  5. **prd.json setup** — story breakdown + acceptance criteria
  6. **Implementation** — subagent dispatch per task + Pre-commit Gate + commit
  7. **Final architect verification** + ralph cancel

- **사용자 개입 없이 진행**. 단 다음 시점에만 사용자 결정 요청:
  - critic max 2 cycle REJECT 도달 시 (§22 strict halt)
  - main merge 결정 시 (autonomous boundary)
  - destructive operation 검출 시 (production DB drop 등)

### Why

매 cycle 마다 사용자 결정 요청 → 통신 score 저하. ralph 의 본 목적 = "사용자가 가만히 있어도 작업이 끝남". cycle/revision 관리도 자동화 영역.

### How to apply

- ralph dispatch 시 skill prompt 에 "spec + plan + critic + implementation 모두 1 loop" 명시
- prd.json 의 stories 에 spec drafting / plan drafting / critic dispatch / impl tasks 모두 포함
- critic verdict file 저장 의무 (§22 file 저장 룰 준수)
- 매 task 완료 시 main controller 가 commit verify + 다음 dispatch (사용자 visibility 보고)
- cycle 1/2 REJECT 시 ralph 자체적으로 revision 작성 — 사용자 escalation 불필요
- cycle 2 도달 + REJECT 시만 §22 strict halt + user-queue entry

---

## 23. Background Process Stuck Recovery

Background subagent 또는 Bash long-running process 가 hang 상태 (stuck) 시 — 일정 시간 응답 없으면 kill + 재실행.

### 룰

- **Stuck 판정 기준**:
  - subagent: `output_file` line count 또는 mtime 변화 없음 ≥ 5 분
  - Bash background: `ps -p <PID> -o time,state` CPU time 정체 + state `S+` (sleep) ≥ 3 분
  - npm/build/test: 일반적인 max duration 초과 (build 5분 / jest 3분 / vitest 2분)
- **Recovery 절차**:
  1. process 죽이기 (`kill -9 <PID>` 또는 `TaskStop <task_id>`)
  2. 환경 정리 (포트 충돌 시 다른 PID 도 cleanup)
  3. 같은 작업 재 dispatch (subagent 의 경우 prompt 동일하게 재 dispatch)
  4. 2 회 연속 stuck 시 halt + user-queue entry (root cause 사용자 결정)
- **Stuck 의심 시 안전 액션 우선**:
  - kill 전 간단한 health check (port listening / file write 등)
  - log file tail 로 마지막 의미있는 출력 확인 — 느린 진행이면 wait, 진짜 hang이면 kill
  - 진단 결과 user-queue 또는 progress.txt 에 기록
- **재실행 시 prompt 강화**:
  - "stuck recovery: <what was last seen>, retry with shorter scope or skipping <X>"
  - 2 회 연속 stuck 시 root cause 추정 (Read 25K limit / EISDIR / DB connection / port 충돌 등)

### Why

Background 프로세스가 hang 상태일 때 main controller 가 직접 작업으로 우회 → 시간 낭비 + visibility 차단. stuck recovery 룰 있으면 빠른 정정.

### How to apply

- Background dispatch 직후 expected duration 명시 — "ETA 10-15 분, 5 분 후 첫 progress probe"
- 5 분 단위로 progress probe — 변화 없으면 stuck 판정. 변화 있으면 다음 5 분 wait.
- TaskStop / `kill -9` 두 path 둘 다 시도 (TaskStop 이 안 먹으면 OS 레벨 kill).

---

## 24. License / Reuse

이 문서는 internal harness workflow 기록을 정리한 것. 다른 프로젝트에 자유 reuse / fork / 수정. 사항 명시 필요 X.

본 가이드 의 학습 = **Plan H/I/J/K 의 dogfood 흐름**.
- Plan H 가 §13.1 결정 며칠 만에 Plan I 에서 reversed = brainstorming 부족 사례 + 정정.
- Plan J 의 agent 자율 정정 (spec pseudocode vs codebase fact 불일치 회피 사례).
- Plan K (대규모 migration) = visibility/communication 통신 5.0/10 — "대기" 응답 25-30 turn + 사용자 답답함 4번 표명 → §18 visibility 룰 + §19 MCP reconnect 룰 + §20 self-critique 룰 + §21 memory inheritance 룰 도출.

---

## 25. kzk-web-loop — Autonomous Web Improvement Loop

Full spec: `docs/plans/2026-05-03-kzk-web-loop-design.md`. Skill: `skills/kzk-web-loop/SKILL.md`.

### Purpose

Run a self-directed improvement cycle on a web project until the user explicitly stops it. Never asks for direction — generates tasks from a built-in P0/P1/P2 checklist every cycle. At start: asks for branch name, runs plugin pre-flight (superpowers / gstack / OMC — installs if missing), then optionally uses `superpowers:brainstorming` or `gstack:office-hours` for goal clarification.

### Loop (one sentence each)

1a. Tool runner (`oh-my-claudecode:executor`, sonnet) runs tests + Playwright screenshots → saves raw output to `.web-loop/cycle-N-report.md`.
1b. Evaluator (`oh-my-claudecode:critic`, opus) reads report + built-in checklist → outputs P0 / P1 / P2 issue list.
2. Main picks top issue NOT recorded as "Cycle N: completed/skipped" for the current cycle (cycle-scoped, not session-scoped); ambiguous decisions → `docs/harness/user-queue.md` entry with tentative default, never stop.
3a. P0: executor (sonnet) implements directly via TDD → kzk-pre-commit-gate (10 gates: 0, 0.5, 1, 1.5, 1.6, 2, 3, 4, 4.5, 5 if AGENTS.md hierarchy present; Gate 0 N/A without hierarchy) → commit.
3b. P1/P2: kzk-codebase-survey (EXPLORER) → survey report → writing-plans/planner (opus) → critic (opus) reviews → executor (sonnet) implements → commit.
4. Update `harness-flow-progress.md` one-liner → back to step 1a.

### Evaluation Priority

- **P0** (block all): console errors, test failures, build errors, broken layout.
- **P1** (this cycle): accessibility (WCAG AA), responsive (375 px / 768 px), missing error states, slow feedback (> 300 ms).
- **P2** (improvement): complexity > 10, duplication ≥ 3 places, `any` types, off-token design values, coverage gaps, docs.
- **Deepen**: when no P0/P1 found, shift to P2 → refactor → performance → docs. Loop never runs out.

### No-halt Policy

Every failure skips the current issue and picks the next. Halt only when: (a) user stops explicitly, (b) every queue item failed 3×, (c) system-level failure. Rate limit → `ScheduleWakeup(delaySeconds=600)`. Context 50% → `/compact <remaining-tasks summary>` + one-line restate. Playwright drop → cascade recovery (pre-flight ToolSearch → 3-attempt retry → degraded mode), auto-retry next cycle.

### Playwright as Optional Enhancement

Pre-flight: `ToolSearch("+browser navigate")` — if not found, DEGRADED MODE immediately. If found but call hangs: 3-attempt cascade (`claude mcp list` re-register → 10s retry → DEGRADED). Degraded = test + code analysis only, visual check skipped, auto-retry next cycle.

### State

One-liner per cycle in `harness-flow-progress.md`:
`Cycle N (YYYY-MM-DD HH:MM) — [P-level] [issue] — queue: N remaining — PW: ok|degraded`

Before `/compact`, pre-compute the remaining-tasks summary (see §13 호출 패턴). After `/compact`, restate: "Cycle N, last: [issue], queue: [N remaining], PW: [ok/degraded]"

### Reviewer FAIL override

`kzk-web-loop` intentionally overrides `kzk-autonomous-loop`'s halt-on-reviewer-FAIL: instead of halting, skip the failing task and pick the next issue. This keeps the cycle moving across tasks.

### Branch boundary

`kzk-autonomous-boundary` applies in full — executor agent dispatches respect the session branch contract recorded at autonomous-mode entry. Default = feature branch (e.g., `feature/web-loop-<goal-slug>`). Direct-`main` dispatches are allowed only if the user explicitly authorized direct-main flow this session. PR-flow `main` merge always requires explicit user "merge it" outside the loop.

---

## 26. kzk-codebase-survey — Mandatory Deep Codebase Explorer

Full spec: `docs/plans/2026-05-04-kzk-codebase-survey-design.md`. Skill: `skills/kzk-codebase-survey/SKILL.md`.

### Purpose

Run before any brainstorming or planning phase. Reads the full codebase scope (direct + transitive imports), loads external library docs via context7, extracts TypeScript type contracts and env vars. Produces a "codebase intelligence report" that feeds planner + critic, preventing plans that miss features or integration points.

### When mandatory

- Before `superpowers:brainstorming` — report injected into brainstorming context
- `kzk-large-task-delegation` Step 0 — before any planner dispatch
- `kzk-web-loop` P1/P2 — survey → writing-plans order
- Implementation verification (spec ↔ 코드 매칭, 버그 전수조사, 기존 시스템 audit) — 메인 컨텍스트는 dispatch + synthesize 만, EXPLORER 가 광범위 read 담당

### code-review-graph (optional, recommended)

If available (`code-review-graph --version` exits 0), use for scope expansion via MCP tools (preferred) or index health checks:
- **MCP (preferred):** `code-review-graph install` registers an MCP server; use `query_graph`, `get_impact_radius`, `semantic_search_nodes` tools.
- **CLI callsite query no longer supported** — `query` and `blast-radius` subcommands were removed. CLI only: `code-review-graph status` (index health), `code-review-graph serve` (spawn MCP over stdio).
- Install: `pip install code-review-graph && code-review-graph install && code-review-graph build` (run once per project)
- Fallback: MCP unavailable → grep-based scope expansion (see SKILL.md step 2.5 for template-literal variant).

### EXPLORER steps (Step 0.5 + Step 1–8)

1a. Scope expansion (target files → transitive imports → feature dir → tests). **If code-review-graph MCP available:** use `query_graph` + `get_impact_radius` tools. **Fallback:** `grep -r "from '.*<module-name>'" --include="*.ts" -l`; for template-literal callsites also grep by path prefix or binding name (see SKILL.md step 2.5).
1b. Deep read all files in parallel (full file, no excerpts) + `git log -5 <file>`
2. Library detection (parse imports → external packages only)
3. Library knowledge: context7 docs → kzk/superpowers skill → web_search fallback
4. Pattern extraction (naming, error handling, async, state management)
5. TypeScript type/interface contracts (exports + reverse deps, ⚠ breaking-change flags)
6. Env vars / config (`process.env.*`, `.env.example`)
7. Report generation → `docs/harness/surveys/YYYY-MM-DD-<topic>-survey.md` (manual) or `.web-loop/surveys/cycle-N-survey.md` (autonomous)

### Critic gate

Critic prompt must include: "Check the plan covers every item in Features to Preserve and Integration Points in the survey report. Any gap = FAIL."

### No-halt

Survey failure (file unreadable, library docs unavailable) → note in report, continue with available data. Never halts the planning pipeline.

---

## 27. kzk-tool-retry — Tool Failure Auto-Retry Discipline

Full skill: `skills/kzk-tool-retry/SKILL.md`.

### Default policy

Every tool failure = 1 automatic retry, no user prompt in between. Polite-stop after a single failure in autonomous mode is a hard violation.

### Key failure modes

- **Edit "String to replace not found"**: `Read` the file (±10 lines or `grep -n`) → re-issue Edit with corrected `old_string`. Two consecutive failures → `Write` whole file or queue.
- **Edit/Write "File has not been read yet" / "modified since read"**: Prevention-first. Treat these events as read-tracker invalidators and re-Read before the next Edit on the affected file: any new user message, `<system-reminder>` flagging a file change, your own `sed -i` / `Write` / formatter run, an Agent dispatch return, `/compact` or session restore. Recovery if it still fails: call `Read` once → re-issue the Edit (adjust `old_string` if "modified since read" — the on-disk content moved). Do NOT ask the user.
- **Bash transient**: 1 retry OK. Persistent failure (compile error, type error) → root-cause fix, no blind retry.

### Queue-on-double-failure

After auto-retry also fails: append Q-* entry to `docs/harness/user-queue.md` with failing tool shape + error + recommended fix, then continue to next task.

### Forbidden

Asking "어떻게 할까요?" between attempts in autonomous mode.

### 27.1 PreToolUse Edit/Write Read-Guard (Plan F rev2)

OS-level hook 으로 "Read 없이 Edit" 차단. 본문: `kzk-tool-retry` §PreToolUse guard.

- `~/.claude/skills/.kzk-harness-shared/hooks/edit-read-guard.mjs` (PreToolUse Edit|Write `--mode=pre` + PostToolUse Read `--mode=post-read` 단일 파일).
- Turn state: `~/.cache/kzk-harness/{current-turn.json (atomic), read-log.jsonl (O_APPEND atomic, flock 폐기)}`.
- Bypass: `touch ~/.cache/kzk-harness/bypass-token` (one-shot, **PreToolUse 단독 소비**).
- Kill switch: `OMC_SKIP_HOOKS=edit-read-guard`.
- Hook 등록 = `dispatcher.mjs` 1개 (UserPromptSubmit). 활성 sub-hook = `enabled.json` manifest.
- Disable: `bash uninstall-global.sh` (PreToolUse + PostToolUse + UserPromptSubmit + manifest 셋 다 cleanup, **managed 파일명 whitelist**).

---

## 28. Skill-load chain (메타 갭 방지)

Cycle 28 학습: `kzk-codebase-survey` 가 트리거됐는데 `kzk-large-task-delegation` 이 같이 로드되지 않으면, 메인이 survey 결과만 받고 그 후 read-heavy audit + 직접 edit 을 수행하는 패턴이 발생. (Session-28 worked example: external-project 그리드 버그 batch fix — 메인이 11+ 파일 직접 read + 4 source 파일 직접 edit + Playwright + docker rebuild 전부 메인에서 실행.)

룰:

1. `kzk-codebase-survey` 가 로드되었으면 (트리거 또는 명시 호출), 같은 turn 안에 `kzk-large-task-delegation` 도 로드 의무.
2. 메인 turn 시작 전 점검 — 사용자 prompt 가 다음 phrase 포함 시 large-task hop 강제: '플랜 쪼개', '사이클 자율', '버그들 모두', '모두 개선', '사용성 버그', '구현 검증', '전수조사', '마무리'.
3. 점검 자동화: `install/hooks/keyword-detector.mjs` UserPromptSubmit hook (`install-global.sh --enable-hooks`). 매칭 시 system-reminder 로 강제 skill-load 명시.
4. Survey 단독 로드 + 메인 직접 large execute = §Session-28 anti-pattern. `kzk-large-task-delegation §Operational checks 1–4` 으로 매 turn 점검.
5. **메인이 reference collection 목적으로 Bash(ls) / Read 를 연속 호출** = 메타 갭 = 즉시 EXPLORER subagent 로 전환 (`kzk-codebase-survey §Preparation phase delegation`).
6. **메인이 multi-file 라이브러리 변경 / 5+ 파일 edit** = `kzk-large-task-delegation §Model routing` (executor sonnet) 으로 위임, 메인 직접 Edit 금지 (`kzk-autonomous-boundary §Q-MAIN-DIRECT-EDIT`).

---

## 29. Regression Memory Protocol (kzk-regression-memory, Plan D)

자율실행 cycle 의 regression 망각 차단. fix-start 시점 prompt 매칭 → 자동 recall + dismiss CLI mutation path.

### Storage 모델 (5필드 + 7필드)

- **Backend**: gstack `/learn` JSONL (project-scoped). 5필드: `key`, `type`, `insight`, `confidence`, `source`
- **Sidecar**: `.kzk-harness/regression-meta.jsonl`. **7필드**: `key`, `file_snapshot`, `related_cycles`, `dismiss_count`, `last_dismissed_at`, `archived`, **`stale`**
- Sidecar = metadata extension with **own SoT for dismiss + stale state** (derived view 아님 — dismiss_count 와 stale 둘 다 사용자/하드웨어 액션 source)
- FK: sidecar `key` 는 `/learn` 에 반드시 존재. 부재 시 orphan cleanup
- file_snapshot canonical source = `git rev-parse HEAD:<file>` (cycle 끝 evaluator 가 sentinel SHA 캡처)

### Recall 룰

- Trigger: `UserPromptSubmit` hook (`install/hooks/regression-recall.mjs`)
- Query normalization: `prompt.slice(0, 200)` + 키워드 추출 (raw prompt 전체 X)
- Decay: `confidence_decayed = confidence * (0.85 ** dismiss_count)`
- Filter: `archived: true` OR `confidence_decayed < 4` → 제외
- Orphan cleanup: `allLearnKeys` (direct JSONL read from ~/.gstack/projects/*/learnings.jsonl) snapshot 기준만. `searchHits` 기준 X
- Output: system-reminder inject (`🚨 [REGRESSION RECALL]`)
- gstack 미설치 시: stderr WARN + `_warn` structured reason. silent skip 금지

### Dismiss/Archive CLI (mutation path)

```bash
node install/bin/kzk-regression-memory.mjs dismiss <key>
```

- `dismiss_count++`
- `last_dismissed_at = ISO8601`
- `archived = (dismiss_count >= 3)` (spec lock)
- atomic write via `install/lib/sidecar-write.mjs`

### 자가-skip guard (동사구만)

자가개선 cycle 메인 prompt 자가오염 차단:
- 환경변수 `KZK_HARNESS_SELF_IMPROVEMENT=1` 또는 `KZK_AUTONOMOUS=1` 우선
- self-improvement **동사구** grep — 명사 단독 금지:
  - `harness 개선 루프 시작`, `자가개선 cycle 진입`, `메타 cycle 진입`, `ralph 로 돌려` 등

### Stale check

`install/scripts/regression-stale-check.sh`:
- cron 또는 cycle-end 단발
- file_snapshot SHA vs HEAD 비교
- sidecar 의 `stale` 7번째 필드 update (atomic via lockdir)
- recall hook 은 cached `stale` 필드 read (라이브 git blame X)

### Atomic sidecar writer (공용 utility)

`install/lib/sidecar-write.mjs` — lockdir + tmp + atomic mv. hook + stale-check + dismiss CLI + cycle 회고 append 모두 본 utility 사용. 동시 실행 시 직렬화.

### Cycle 회고 5W1H (kzk-web-loop step 5.5 진입)

| W | Detail |
|---|---|
| Who | cycle entry 작성 주체 (메인 또는 evaluator subagent) |
| When | cycle commit 직후, harness-flow-progress 갱신 다음 |
| What | 1 entry/cycle. key=`cycle-<N>-<axis>`, type=`pattern`, source=`retro` |
| How | `Skill("learn") invocation (gstack /learn skill)` + sidecar atomic append (file_snapshot = `git rev-parse HEAD:<file>`) |
| 실패시 | gstack 미설치 → stderr WARN + cycle entry 본문 표기 의무. silent skip 금지 |
| Where | kzk-web-loop cycle 끝 evaluator paragraph |

### Default DISABLED at D commit, 자동 enable on main 머지 (5 plan 후, fail-closed)

- D plan commit 시점: hook 파일 추가 but settings.json 등록 X
- **5 plan (A→D→B→C→E)** 끝나고 `kzk-pre-merge-sync` step 3 가 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트)
- `--regression-recall` 는 keyword-detector 도 explicit dependency 로 자동 enable
- **fail-closed**: install-global.sh exit non-zero / duplicate entry / jq 부재 → merge block

### Rollback (7 level — codex #10 답)

| Level | 메커니즘 |
|---|---|
| 단일 plan revert | `git revert <Plan-D-sha>` |
| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=regression-recall` |
| Skill 즉시 비활성 | `DISABLE_OMC=kzk-regression-memory` |
| settings.json 수동 | hook entry 수동 제거 |
| Sidecar 손실 | dismiss_count + stale reset 만 — /learn 보존 |
| Plan D 자가오염 | default DISABLED 라 즉시 위협 X. enable 후 발견 시 OMC_SKIP_HOOKS |
| **Global install 산출물 cleanup** | `~/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs` + `lib/sidecar-write.mjs` + `bin/kzk-regression-memory.mjs` 제거 + 중복 settings.json `UserPromptSubmit` entry 정리 (`uninstall-global.sh --regression-recall` 또는 jq: `jq '.hooks.UserPromptSubmit \|= map(select(.hooks[0].command \| test("regression-recall") \| not))' ~/.claude/settings.json`) |

---

## §30 kzk-freshness-guard (Stale 메타 문서 자동 감지)

코드 변경 시 메타 문서(CLAUDE.md, AGENTS.md, spec, survey, memory) stale 자동 감지 + CRG 기반 심볼 역참조 + auto-fix.

- **CRG canonical contract**: `install/lib/crg-utils.mjs` = 단일 진입점. 직접 CLI 호출 금지.
- **자동 호출 6곳**: spec-and-review Step 0 전, codebase-survey 시작 전, plan execution 직전, Gate 0.5, pre-merge-sync, 수동 트리거.
- **Edge case**: no-git skip, unborn HEAD skip, shallow fallback, recursion guard (depth=1).
- **Auto-fix**: AGENTS.md 행단위, CLAUDE.md executor(sonnet), spec/survey executor(sonnet), memory 메인 판단, plan WARN only.
- **Rollback**: `OMC_SKIP_HOOKS=freshness-guard`, `DISABLE_OMC=kzk-freshness-guard`, `KZK_GATE05_SKIP=1`.

---

## §31 Brainstorming 자동 체이닝 (kzk-spec-and-review Step -1)

spec-and-review 진입 시 Step 0 survey 완료 후 `superpowers:brainstorming` **default ON** → design doc 생성 → Pattern 3-pass loop 진입. Full rule body: `kzk-spec-and-review §Step -1`.

**Default**: ON. keyword-detector `(brainstorm mode)` marker 부재 = skip 아님.

**Skip conditions** — EITHER (A) or (B) holds:
- **(A) Explicit-skip command**: 사용자 명시 "brainstorming 스킵" / "skip brainstorming" / "skip Step -1" — standalone, no other condition needed.
- **(B) Trivial-change bundle**: ALL 3 hold: (1) trivial change scope (typo/single-line/sub-5-LoC), (2) 사용자가 모든 변경 내용 명시, (3) 신규 capability 추가 없음.

**Skip evidence contract (mandatory when invoking (B))**: When skipping under condition (B), main MUST record in the commit message footer OR the cycle entry in `docs/harness/user-queue.md`: `Brainstorm skip evidence: user prompt quote = "<≤2-sentence quote>"; files = <list>; sections = <list>`. Absence of evidence → skip is invalid, brainstorming MUST run. Full rule body: `kzk-spec-and-review §Step -1`.

**Mandatory invoke triggers** (any one forces Step -1):
- 새 기능 / 새 entry / 새 module 추가 (new capability)
- 사용자 결정 필요 발견 (다중 design path, 모호한 spec, missing input)
- 명시적 brainstorm 키워드 ('brainstorm', '아이디어', '어떻게 해야 할까', '뭐가 좋을까')

**결과 연결**: design doc → Step 1 Required reading + Step 2 LOCKED PRIOR DECISIONS.
**CRG 검증**: brainstorming 완료 후 `crg-utils.extractDocRefs()` + `validateLineRefs()` 로 검증.

---

## §32 Code Quality Discipline (DRY/YAGNI/KISS + 모듈 깊이 + 베스트 프랙티스)

모든 코드 작업 (executor sonnet dispatch / spec-and-review Step 1 draft / 메인 직접 1-2 LoC fix) default 룰. dispatch prompt boilerplate 자동 inject. mattpocock improve-codebase-architecture (LANGUAGE.md / DEEPENING.md / INTERFACE-DESIGN.md) 의 핵심 패턴 통합.

### 1. 코드 작성 *전* — 3 self-question (DRY/YAGNI/KISS)

코드 작성 시작 전 다음 3 질문에 *명시적 답*:

1. **DRY**: 같은 코드 codebase 안 이미 있나? `grep -rn` + CRG `semantic_search_nodes` 검증
2. **YAGNI**: 진짜 *지금* 필요? 사용자 요청 deduce minimum 만
3. **KISS**: 가장 단순? 동일 의도 더 짧은 표현 가능?

### 2. 모듈 신규 — Deletion test 통과 시만 OK

새 file / module / helper 만들기 *전*:
- 기존 sister module interface (export type / function 시그니처) 확인 — grep + 본문 read
- 기존 안 추가 가능 → 거기 추가 (default)
- 새 module **정당화 (Deletion test)** — mattpocock improve-codebase-architecture DEEPENING.md:
  > "If complexity reappears across N callers after deletion, the module justified its existence through depth."
- 호출자 N ≥ 2 + 호출자 file 인용 시만 OK. N < 2 = "hypothetical seam" — 만들지 X

### 3. Depth before width — interface 우선

새 module 만든다면:
- **Depth = interface 속성** (mattpocock LANGUAGE.md): "Depth is a property of the interface, not the implementation"
- shallow module 신호 (interface ↔ 구현 1:1) — 호출자 N < 2 시 deepening 여지 없음. 만들지 X
- **Design It Twice** — 큰 구조 변경 시만: 3+ 인터페이스 안 병렬 검토 (executor sonnet 다중 dispatch). 작은 helper 는 1 안 OK

### 4. 베스트 프랙티스 확인 의무

코드 작성 *전*:
- 외부 lib 사용 시 — `mcp__plugin_context7_context7__resolve-library-id` + `query-docs` 의무 (kzk-codebase-survey §Step 4 패턴)
- 외부 lib **의존성 분류** (Dependency 4-tier — mattpocock DEEPENING.md): in-process / local-substitutable / remote-owned / true-external 중 어느 것? 분류에 따라 seam 정당화 다름
- 내부 codebase pattern — 같은 파일/디렉토리 *similar pattern* read (kzk-codebase-survey §Step 5 Pattern Extraction 인용)

### 5. 코드 작성 *후* — self-review checklist

commit / 다음 단계 전:

- [ ] 책임 중복 X (DRY)
- [ ] 사용자 요청 외 추가 X (YAGNI)
- [ ] 더 짧은 표현 검토 (KISS)
- [ ] 새 모듈 신설 = Deletion test 통과 (N ≥ 2 호출자 명시)
- [ ] Depth = interface 속성 검증 (shallow 1:1 X)
- [ ] 외부 lib context7 / 내부 pattern 인용
- [ ] **deepened module 추가 시** 이전 shallow module 의 obsolete unit test 삭제 (mattpocock DEEPENING.md "Once tests exist at the deepened module's interface, old shallow-module unit tests become obsolete and should be deleted." — kzk-test-coverage cross-ref)

### 6. dispatch prompt boilerplate (executor sonnet 자동 inject)

다음 boilerplate 를 모든 코드 작성 dispatch prompt 의 Rules block 에 inject. kzk-large-task-delegation §Anti-self-verification boilerplate 패턴 재사용.

```
[CODE QUALITY DISCIPLINE — harness-share.md §32]
코드 작성 시:
- 전: DRY/YAGNI/KISS 3 self-question 명시
- 전: 모듈 신규 — Deletion test (N ≥ 2 호출자 인용) 통과 시만 OK. 그 외 기존 interface 추가
- 전: 외부 lib context7 + 의존성 4-tier 분류 / 내부 codebase same pattern 인용
- 큰 구조 변경: 3+ 인터페이스 안 (Design It Twice) 병렬 검토
- 후: self-review checklist 7 항목 (Deletion test + Depth + obsolete test 포함)
위반 시 task BLOCKED 반환 + plan revision 요청.
```

### 7. Cross-ref

- **kzk-large-task-delegation §Subagent prompt requirements**: 모든 executor dispatch prompt 안 본 §32 boilerplate inject 의무
- **kzk-spec-and-review Step 1 (Draft)**: draft prompt 안 본 §32 boilerplate inject 의무
- **kzk-codebase-survey §Step 4-5**: 베스트 프랙티스 확인의 구체 절차 출처
- **kzk-test-coverage**: deepened module 후 obsolete unit test 삭제 의무 출처

> Dispatch anatomy canonical reference: §4 kzk-large-task-delegation §Task-level dispatch shape.

---

## §33 Autonomous-mode Detection SoT

> Single source of truth for all autonomous-mode detection logic. All skills that gate on
> autonomous mode (kzk-test-coverage, kzk-regression-memory, kzk-autonomous-boundary, etc.)
> MUST cross-ref this section. Do not maintain a local keyword list — drift risk.

### 우선순위 (높음 → 낮음)

#### 1. 환경변수 (가장 신뢰 — hook + subagent 양쪽 공통)

| 변수 | 값 | 의미 |
|---|---|---|
| `KZK_AUTONOMOUS` | `1` | 자율 실행 mode 진입 (Category A + B 모두 skip) |
| `KZK_HARNESS_SELF_IMPROVEMENT` | `1` | 자가개선 cycle 전용 진입 (Category B skip — regression recall hook 차단) |

환경변수가 set 된 경우 아래 동사구 grep 생략. 환경변수 우선.

#### 2. Category A — 명시 trigger 동사구 (사용자 → 자율 mode 진입 선언)

user prompt 에서 아래 동사구 중 하나 이상 매칭 시 → 자율 mode 진입 판단.

1. `ralph로 돌려`
2. `끝까지 끝내줘`
3. `자는 동안 진행해`
4. `자율실행해줘`
5. `자율로 돌려`
6. `web-loop 진입`
7. `autonomous-loop 시작`
8. `실행해놔야 queue 보지`

#### 3. Category B — 자가-skip 동사구 (자가개선 cycle → recall hook inject 차단)

user prompt 에서 아래 동사구 중 하나 이상 매칭 시 → self-improvement cycle 판단.
regression-memory 의 UserPromptSubmit hook 이 inject 를 skip.

1. `harness 개선 루프 시작`
2. `harness loop 진입`
3. `스킬 개선해줘`
4. `자가개선 cycle 진입`
5. `자가개선 돌려줘`
6. `메타 cycle 진입`

### 명사 단독 매칭 금지

아래 단독 명사는 false positive 차단을 위해 매칭 금지:

- `자가개선` 단독
- `ralph` 단독
- `메타 cycle` 단독
- `자율` 단독
- `autopilot` 단독

동사구 + 목적격 결합 시에만 매칭. "ralph로 돌려" OK, "ralph" 단독 X.

### 사용처 (cross-ref 의무)

Categories A and B exhaust the trigger universe; no Category C.

| Skill | 섹션 | 적용 Category |
|---|---|---|
| kzk-test-coverage | §Anti-pattern §자율 mode 메인 직접 TDD 금지 (자율 mode 판별) | A |
| kzk-regression-memory | §자가-skip guard | B |
| kzk-autonomous-boundary | frontmatter description + §Branch contract ASK FIRST | A |

### Cross-ref

- **kzk-test-coverage §자율 mode 메인 직접 TDD 금지**: Category A 매칭 시 메인 직접 TDD red 차단
- **kzk-regression-memory §자가-skip guard**: Category B 매칭 시 hook inject skip
- **kzk-autonomous-boundary §Branch contract ASK FIRST**: Category A 매칭 시 ASK FIRST 의무 진입
