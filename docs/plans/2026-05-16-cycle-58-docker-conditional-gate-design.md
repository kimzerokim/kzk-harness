# Cycle 58 — Pre-commit Gate 3.5: Conditional docker compose smoke

**Date**: 2026-05-16
**Author**: kzk-harness self-improvement cycle 58 (autonomous, user 명시)
**Status**: DRAFT v4 — codex cycle 1 (5 BLOCKER + 2 NIT + ref-fix) + cycle 2 (H1 잔존 + H10 BLOCKER + H11 NIT) + cycle 3 (H10/H12 globToRegex 정확 fix + H11 §3.2 sync + H13 import-only + H14 harness-share.md sync) 모두 reflect (pending cycle 4 codex review, HALT 한계 cycle 5)
**Plan path**: `docs/plans/2026-05-16-cycle-58-docker-conditional-gate-design.md` (canonical per harness-share.md §5)
**Branch contract**: **main 직접 commit, branch 없음, PR 없음, default propagate** (사용자 명시 2026-05-16 AskUserQuestion 답변)

---

## 0. Context

### 0.1 사용자 motivation

**원문** (이전 cycle retro 한 줄):
> "향후: pre-merge-sync 시 docker-compose up --build + smoke endpoint 핑 한 줄을 자동화하면 재발 방지 (별도 cycle 거리)."

**사용자 cycle 58 trigger** (2026-05-16):
> "이거 프리 커밋게이트에 스모크테스트전에 도커 컴포즈 업 빌드 하게 끔 해줘. stale docker 문제가 너무 많다. 자율 실행으로 개선."

**Scope clarification** (AskUserQuestion 답변):
- Q1: **pre-commit-gate (매 commit) + conditional**
- Q2: **main 직접 commit (파격적)** (no branch)
- Q3: **메인에 바로** (no branch name)

### 0.2 Problem definition

Stale docker 패턴:
1. `docker-compose.yml` 수정 후 build 안 하고 commit → image cache stale → deploy mismatch
2. `Dockerfile` dependency 추가 후 build 안 함 → CI 발견 issue
3. Backend endpoint 추가 후 smoke check 안 함 → 빌드 성공 but endpoint 500
4. `pre-merge-sync §6 Prod-build smoke` (cycle 55) 가 manual → 누락 빈번

**Solution**: cycle 57 hook pair drift 패턴 + cycle 55 cycle-exit commit-signal guard 답습.

### 0.3 Discovery (codebase survey + codex review cycle 1)

**현재 Gate 시퀀스** (`kzk-pre-commit-gate v1.12.0`):
Gate 0 → 0.5 → 1 → 1.5 → 1.6 → 2 → 3 → 4 (conditional `src/**/*.{tsx,ts,css}`) → 4.5 (conditional endpoint deletion) → 5 (autonomous-exit only)

**기존 conditional gate**:
- Gate 4 = staged files match `src/**/*.{tsx,ts,css}` → Playwright
- Gate 4.5 = staged diff deprecation regex → fix-scope sweep + `KZK_GATE45_SKIP=1` bypass

**Hook orchestration**:
- `install/hooks/dispatcher.mjs` = UserPromptSubmit
- Project-type-specific hook (`regression-recall`, `fix-scope-trigger`, `freshness-guard`) = OPT-IN flag (`install/install-global.sh` lines 17-21)
- `check-cycle-exit.mjs` 만 DEFAULT-ON (general workflow)
- `.claude/hooks/check-cycle-exit.mjs` ↔ `install/hooks/check-cycle-exit.mjs` = cycle 57 pair drift

**Cycle 57 marker syntax (실제 form, codex H2 fix)**:
- `// ===== shared:start <name> =====` ... `// ===== shared:end <name> =====`
- Test file = `install/test/check-hook-pair-sync.mjs` (NOT `cycle-exit.test.mjs` which doesn't exist)
- Current PAIR_LIST = hardcoded single-pair → cycle 58 refactor 필요

**Cycle-exit commit signal** (`check-cycle-exit.mjs` lines 171-191):
- Inline env-prefix parsing
- Quoted/heredoc strip
- `detectSignalA` (PR-flow) + `detectSignalB` (commit message marker)

---

## 1. Goal

### 1.1 One-line

Pre-commit-gate 에 **Gate 3.5** (test 후, Playwright 전) 추가 — `git commit` (또는 `gh pr create/merge`) Bash invocation 감지 시점에 staged 파일에 docker-related glob 매치 있고 doc-only 변경 아닐 때 `docker compose up --build -d` + optional smoke endpoint health check 자동 실행. 실패 시 BLOCK.

### 1.2 Success criteria

1. **Commit-signal guard**: Gate 3.5 hook 은 `git commit` / `gh pr create/merge` / `git push origin main` Bash 일 때만 docker invocation. 다른 명령 silent passthrough.
2. **Conditional trigger**: staged 파일에 docker-related glob 매치 AND doc-only 예외 아닐 때만 mandatory.
3. **Docker compose up**: `docker compose up --build -d` 가 `dockerTimeoutMs` (default 600000ms) 안에 success. 실패 시 BLOCK + stderr 출력.
4. **Optional smoke endpoint**: `.kzk/docker-smoke.json.endpoint` 있으면 GET (default) 또는 HEAD → 2xx PASS, 그 외 BLOCK.
5. **Opt-in propagation**: `install-global.sh --docker-gate` flag (OPT-IN tier, regression-recall / fix-scope-trigger / freshness-guard 와 동일). Runtime opt-out `KZK_GATE35_DISABLE=1`.
6. **Bypass env precedence**: `KZK_GATE35_DISABLE` > `KZK_GATE35_SKIP` > `CI=true`. 별도 queue code.
7. **Test isolation**: `KZK_QUEUE_DIR_OVERRIDE` 사용 (cycle 57 패턴).
8. **Hook pair drift detection**: project-local ↔ global marker region byte-equal. `check-hook-pair-sync.mjs` 를 PAIR_LIST iteration 으로 refactor (cycle 57 single-hardcoded → multi-pair).
9. **Codex cross-vendor review PASS** (BLOCKER 0).
10. **Self-acceptance = silent-skip validated**: 본 cycle 58 final commit 에 docker file staged 없음 → Gate 3.5 silent skip 검증. 실제 trigger 발동 dogfood 은 별도 cycle.

---

## 2. Scope

### 2.1 In-scope (cycle 58)

**A. SKILL.md update** (`skills/kzk-pre-commit-gate/SKILL.md`):
- frontmatter version 1.12.0 → 1.13.0
- description gate list 갱신
- Gate 3.5 본문: trigger / commit-signal guard / docker / smoke / bypass / failure

**B. New hook file pair**:
- `.claude/hooks/docker-compose-gate.mjs` (project-local)
- `install/hooks/docker-compose-gate.mjs` (글로벌 propagate)
- 9 marker regions (`shared:start/end <name>`) byte-equal

**C. Test file**:
- `install/test/docker-compose-gate.test.mjs` (~23 test case)
- `install/test/run-tests.sh` 에 entry 추가

**D. check-hook-pair-sync.mjs refactor** (필수, H2 BLOCKER):
- Current = hardcoded single pair → `PAIR_LIST` iteration
- Marker parse: `shared:start <name>` / `shared:end <name>` (cycle 57 실제 form)
- 2 pair 검증 (cycle-exit + docker-compose-gate)

**E. harness-share.md update** (§3):
- Gate 시퀀스에 Gate 3.5 추가
- Doc-only commit 예외 표 Gate 3.5 N/A 명시

**F. install-global.sh update**:
- OPT-IN tier 에 `docker-compose-gate.mjs` 추가
- `--docker-gate` flag 신설 (OPT-IN)
- `--no-docker-gate` flag (install-time opt-out)

**G. settings.json (`.claude/settings.json`) update**:
- PreToolUse Bash matcher 에 `docker-compose-gate.mjs` 엔트리
- Hook 자체에 commit-signal guard 있어 silent passthrough on non-commit

**H. docs/site/skill-flow.html + `.ko.html`** update:
- Gate 3.5 카드 추가
- `node .claude/hooks/check-skill-flow-fresh.mjs --regen` fingerprint regen

**I. harness-flow-progress.md update**:
- Cycle 58 entry (cycle 57 format)

### 2.2 Out-of-scope (cycle 58)

- Smoke endpoint 자동 검출 (Docker HEALTHCHECK 파싱) — v2
- Multi-compose file 동시 지원 — v2
- `docker compose down -v` 후 새 build — v2 (`--force-rebuild` flag)
- Kubernetes / Helm / Podman / Compose v1 — v1 = Docker Compose v2 only
- CI 환경의 docker build — `CI=true` skip
- Pre-merge-sync §6 자동화 — 별도 cycle
- Language-specific backend dir 자동 추정 — v1 = explicit pattern + config override
- Self-trigger dogfood (실제 docker file staged 으로 trigger 발동) — v1 = silent-skip validated only

### 2.3 Brainstorm step justification (per kzk-spec-and-review §22.5)

1. Prior cycle retro: 사용자 future cycle reservation quote
2. Cycle 58 trigger: autonomous + scope clarification (pre-merge-sync → pre-commit)
3. 3-question AskUserQuestion: scope / branch / name
4. Codebase survey (oh-my-claudecode:explore)
5. Codex review cycle 1: 5 BLOCKER + 2 NIT + 1 PUSH-BACK + 1 ref-fix → 모두 v2 reflect

→ goal-space + tradeoff + 대안 + prior art + cross-vendor review → brainstorming-equivalent.

---

## 3. Design

### 3.1 Gate 3.5 placement (Gate 3 ↔ Gate 4)

Test 후, Playwright 전 (codex H8 PUSH-BACK 동의):
- build + test 통과 후 docker → 빠른 신호 먼저, 무거운 infra 나중
- frontend visual (Gate 4) 와 layer 분리

### 3.2 Trigger detection (codex H3 BLOCKER fix)

**Step 1 — Doc-only commit exception 우선**:

```javascript
const DOC_ONLY_PATTERNS = [
  // Doc extensions (codex H11 NIT fix — added .mdx/.rst/.adoc/.txt)
  /\.md$/i, /\.mdx$/i, /\.rst$/i, /\.adoc$/i, /\.txt$/i,
  // Doc directories + special files
  /^docs\//,
  /^harness-flow-progress\.md$/,
  /^CLAUDE\.md$/,
  /^DESIGN\.md$/,
  /^skills\/.+\.md$/,
  /^\.claude\/skills\/.+\.md$/,
  /^docs\/screenshots\//,
  /^docs\/site\//,
  /^harness-share\.md$/,
  /^README\.md$/i,
  /^AGENTS\.md$/,
  /^LICENSE$/,
  /^CHANGELOG\.md$/i,
];

export function isDocOnly(stagedFiles) {
  if (stagedFiles.length === 0) return false;
  return stagedFiles.every(f => DOC_ONLY_PATTERNS.some(p => p.test(f)));
}
```

`isDocOnly === true` → Gate 3.5 skip.

**Step 2 — Path-aware docker pattern** (NOT root-anchored, monorepo 친화):

```javascript
const DOCKER_PATTERNS = [
  /(^|\/)Dockerfile(\..+)?$/,
  /(^|\/)(docker-)?compose(\..+)?\.ya?ml$/,
  /(^|\/)backend\//,
];
```

`services/api/Dockerfile`, `apps/web/Dockerfile.dev`, `services/db/docker-compose.prod.yml` 모두 매치.

**Step 3 — Custom config override** (`.kzk/docker-smoke.json`):

```json
{
  "endpoint": "http://localhost:3000/health",
  "method": "GET",
  "dockerTimeoutMs": 600000,
  "smokeTimeoutMs": 30000,
  "triggers": {
    "includes": ["custom/api/**/*.ts"],
    "excludes": ["backend/**/*.test.ts"]
  }
}
```

`triggers.includes` (additive), `triggers.excludes` (subtractive).

### 3.3 Hook implementation (codex H1 + H2 BLOCKER fix)

**File**: `install/hooks/docker-compose-gate.mjs` (+ project-local mirror)

**Key changes from v1**:
- Commit-signal guard 추가 (H1): cycle-exit 의 `detectSignalA/B` 답습
- Marker syntax 정정 (H2): `shared:start <name>` / `shared:end <name>` (cycle 57 실제 form)
- Inline env-prefix parsing: `KZK_GATE35_SKIP=1 git commit ...`

```javascript
#!/usr/bin/env node
// kzk-harness Gate 3.5 — Conditional docker compose smoke
// Pair: .claude/hooks/docker-compose-gate.mjs ↔ install/hooks/docker-compose-gate.mjs
// Cycle 57 marker form: shared:start/end <name>

import { execSync, spawnSync } from "child_process";
import { existsSync, readFileSync, appendFileSync, mkdirSync } from "fs";
import path from "path";

// ===== shared:start env-defaults =====
const DEFAULT_DOCKER_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_SMOKE_TIMEOUT_MS = 30 * 1000;
const SMOKE_CONFIG_PATH = ".kzk/docker-smoke.json";
const QUEUE_FILE = process.env.KZK_QUEUE_DIR_OVERRIDE
  ? path.join(process.env.KZK_QUEUE_DIR_OVERRIDE, "user-queue.md")
  : "docs/harness/user-queue.md";
// ===== shared:end env-defaults =====

// ===== shared:start commit-signal-detect =====
export function detectCommitSignal(bashCommand) {
  const stripped = stripQuotedAndHeredoc(bashCommand);
  if (/\bgit\s+commit\b/.test(stripped)) return { signal: "git-commit" };
  if (/\bgh\s+pr\s+create\b/.test(stripped)) return { signal: "gh-pr-create" };
  if (/\bgh\s+pr\s+merge\b/.test(stripped)) return { signal: "gh-pr-merge" };
  if (/\bgit\s+push\b.*\borigin\s+(?:[^\s:]+:)?main\b/.test(stripped))
    return { signal: "git-push-main" };
  return { signal: null };
}

function stripQuotedAndHeredoc(text) {
  // CRITICAL (codex H1+H13 BLOCKER fix): This sketch is a MINIMAL illustrative
  // stub — NOT implementation-ready. Phase B MUST extract the actual function
  // from install/hooks/check-cycle-exit.mjs into a shared util
  // (e.g., `install/hooks/lib/cycle-exit-utils.mjs`) and `import` it from BOTH
  // check-cycle-exit AND docker-compose-gate (direct import, NOT marker-copy —
  // marker-copy creates byte-equal drift risk on either-side fix). The
  // cycle-exit version handles: `&&`/`;`/`||` compound command splits, multi-
  // line quote/heredoc spans crossing newlines, mid-token expansion. The 6
  // lines below DO NOT cover these — they are spec-illustration only.
  let r = text;
  r = r.replace(/'[^']*'/g, "");
  r = r.replace(/"[^"]*"/g, "");
  r = r.replace(/`[^`]*`/g, "");
  r = r.replace(/<<\s*'?(\w+)'?[\s\S]*?\n\1\b/g, "");
  return r;
}
// ===== shared:end commit-signal-detect =====

// ===== shared:start inline-env =====
export function parseInlineEnv(bashCommand) {
  // CRITICAL (codex H1+H13 BLOCKER fix): This sketch uses `indexOf("=")+slice`
  // (correct for values with embedded `=`) but its leading regex only matches a
  // SINGLE leading prefix block — does NOT handle compound commands
  // (`KZK_X=1 git commit ... ; KZK_Y=1 git push ...`). Phase B MUST extract
  // `parseInlineEnv` into shared util (`install/hooks/lib/cycle-exit-utils.mjs`)
  // and `import` from BOTH check-cycle-exit AND docker-compose-gate (direct
  // import, NOT marker-copy — single source of truth eliminates drift).
  // The cycle-exit reference impl handles `;`/`&&`/`||` separators.
  const result = {};
  const m = bashCommand.match(/^\s*((?:[A-Z_][A-Z0-9_]*=\S+\s+)+)/);
  if (!m) return result;
  const pairs = m[1].match(/[A-Z_][A-Z0-9_]*=\S+/g) || [];
  for (const p of pairs) {
    const eq = p.indexOf("=");
    if (eq < 0) continue;
    result[p.slice(0, eq)] = p.slice(eq + 1);
  }
  return result;
}
// ===== shared:end inline-env =====

// ===== shared:start trigger-detection =====
const DOC_ONLY_PATTERNS = [
  // Doc extensions (codex H11 NIT fix — added .mdx/.rst/.adoc/.txt)
  /\.md$/i, /\.mdx$/i, /\.rst$/i, /\.adoc$/i, /\.txt$/i,
  // Doc directories
  /^docs\//, /^harness-flow-progress\.md$/, /^CLAUDE\.md$/,
  /^DESIGN\.md$/, /^skills\/.+\.md$/, /^\.claude\/skills\/.+\.md$/,
  /^docs\/screenshots\//, /^docs\/site\//, /^harness-share\.md$/,
  /^README\.md$/i, /^AGENTS\.md$/, /^LICENSE$/, /^CHANGELOG\.md$/i,
];

const DOCKER_PATTERNS = [
  /(^|\/)Dockerfile(\..+)?$/,
  /(^|\/)(docker-)?compose(\..+)?\.ya?ml$/,
  /(^|\/)backend\//,
];

export function isDocOnly(stagedFiles) {
  if (stagedFiles.length === 0) return false;
  return stagedFiles.every(f => DOC_ONLY_PATTERNS.some(p => p.test(f)));
}

export function shouldTrigger(stagedFiles, customConfig = {}) {
  if (isDocOnly(stagedFiles)) return false;
  const includes = (customConfig.triggers?.includes || []).map(g => globToRegex(g));
  const excludes = (customConfig.triggers?.excludes || []).map(g => globToRegex(g));
  const all = [...DOCKER_PATTERNS, ...includes];
  return stagedFiles.some(f => {
    if (excludes.some(p => p.test(f))) return false;
    return all.some(p => p.test(f));
  });
}

function globToRegex(glob) {
  // codex H10/H12 BLOCKER fix v3: tokenize-then-substitute (sequential replace
  // contaminates inserted fragments — final `*`→`[^/]*` rewrites `*` quantifiers
  // inside `(?:[^/]+/)*` and `.*` from earlier steps).
  // Algorithm: escape regex meta → swap glob tokens for NUL placeholders that
  // can't occur in paths → substitute placeholders with regex fragments at end.
  let pattern = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  pattern = pattern.replace(/\*\*\//g, "\x00A\x00"); // zero+ dir segments
  pattern = pattern.replace(/\*\*/g, "\x00B\x00");    // cross-dir any-chars
  pattern = pattern.replace(/\*/g, "\x00C\x00");      // in-segment any-chars
  pattern = pattern
    .replace(/\x00A\x00/g, "(?:[^/]+/)*")
    .replace(/\x00B\x00/g, ".*")
    .replace(/\x00C\x00/g, "[^/]*");
  return new RegExp("^" + pattern + "$");
}
// Verification (codex cycle 4 fix targets):
//   custom/api/**/*.ts → ^custom\/api\/(?:[^/]+/)*[^/]*\.ts$
//     matches: custom/api/foo.ts (zero dirs), custom/api/a/b/foo.ts (two dirs) ✓
//   **.test.ts → ^.*\.test\.ts$
//     matches: foo.test.ts, dir/foo.test.ts, a/b/foo.test.ts ✓
// Reference (richer alternative if Phase B opts in): minimatch v9 or picomatch.
// v1 sticks to hand-rolled regex for zero-dependency.
// ===== shared:end trigger-detection =====

// ===== shared:start bypass-check =====
// Precedence: DISABLE > SKIP > CI=true
export function checkBypass(envOverlay = {}) {
  const env = { ...process.env, ...envOverlay };
  if (env.KZK_GATE35_DISABLE === "1") {
    return { bypass: true, reason: "KZK_GATE35_DISABLE=1", queueCode: "Q-GATE35-DISABLED" };
  }
  if (env.KZK_GATE35_SKIP === "1") {
    return { bypass: true, reason: "KZK_GATE35_SKIP=1", queueCode: "Q-GATE35-SKIPPED" };
  }
  if (env.CI === "true" || env.CI === "1") {
    return { bypass: true, reason: "CI=true (CI self-build)", queueCode: "Q-GATE35-CI-SKIP" };
  }
  return { bypass: false };
}
// ===== shared:end bypass-check =====

// ===== shared:start smoke-config-read =====
export function readSmokeConfig(repoRoot) {
  const p = path.join(repoRoot, SMOKE_CONFIG_PATH);
  if (!existsSync(p)) {
    return { endpoint: null, method: "GET",
             dockerTimeoutMs: DEFAULT_DOCKER_TIMEOUT_MS,
             smokeTimeoutMs: DEFAULT_SMOKE_TIMEOUT_MS,
             triggers: {} };
  }
  let cfg;
  try { cfg = JSON.parse(readFileSync(p, "utf-8")); }
  catch { return { malformed: true, error: "JSON parse failed" }; }
  const endpoint = typeof cfg.endpoint === "string" ? cfg.endpoint : null;
  const method = (cfg.method === "HEAD" || cfg.method === "GET") ? cfg.method : "GET";
  const dockerTimeoutMs = Number.isFinite(cfg.dockerTimeoutMs) && cfg.dockerTimeoutMs > 0 && cfg.dockerTimeoutMs <= 3600000
    ? cfg.dockerTimeoutMs : DEFAULT_DOCKER_TIMEOUT_MS;
  const smokeTimeoutMs = Number.isFinite(cfg.smokeTimeoutMs) && cfg.smokeTimeoutMs > 0 && cfg.smokeTimeoutMs <= 300000
    ? cfg.smokeTimeoutMs : DEFAULT_SMOKE_TIMEOUT_MS;
  return { endpoint, method, dockerTimeoutMs, smokeTimeoutMs, triggers: cfg.triggers || {} };
}
// ===== shared:end smoke-config-read =====

// ===== shared:start docker-up =====
export function runDockerUp(timeoutMs, cwd) {
  const result = spawnSync("docker", ["compose", "up", "--build", "-d"], {
    encoding: "utf-8", timeout: timeoutMs, shell: false, cwd,
  });
  return {
    ok: result.status === 0,
    stdout: (result.stdout || "").slice(0, 4000),
    stderr: (result.stderr || "").slice(0, 4000),
    timedOut: result.signal === "SIGTERM",
  };
}
// ===== shared:end docker-up =====

// ===== shared:start smoke-ping =====
export async function pingSmoke(endpoint, method, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint, { method, signal: controller.signal });
    return { ok: res.status >= 200 && res.status < 300, status: res.status };
  } catch (err) {
    return { ok: false, error: String(err) };
  } finally {
    clearTimeout(timer);
  }
}
// ===== shared:end smoke-ping =====

// ===== shared:start queue-append =====
export function appendUserQueue(queueCode, detail) {
  const dir = path.dirname(QUEUE_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString();
  appendFileSync(QUEUE_FILE, `\n- [${stamp}] ${queueCode}: ${detail}\n`);
}
// ===== shared:end queue-append =====
```

**Total marker = 9** (env-defaults / commit-signal-detect / inline-env / trigger-detection / bypass-check / smoke-config-read / docker-up / smoke-ping / queue-append).

**Main orchestrator** (marker 밖, project-local 과 global 이 약간 다를 수 있음):
1. Bash command 받음 (PreToolUse Bash hook input)
2. `detectCommitSignal(command)` → signal 없으면 silent passthrough exit 0
3. `parseInlineEnv(command)` + `process.env` → `checkBypass()` (precedence DISABLE > SKIP > CI)
4. Bypass true → queue append + exit 0
5. `git diff --cached --name-only` → stagedFiles
6. `isDocOnly(stagedFiles)` true → silent passthrough
7. `readSmokeConfig(repoRoot)` (malformed → BLOCK)
8. `shouldTrigger(stagedFiles, config)` false → silent passthrough
9. `runDockerUp(dockerTimeoutMs, repoRoot)` → ok false → BLOCK (stderr 출력)
10. `config.endpoint` 있으면 `pingSmoke(config.endpoint, config.method, config.smokeTimeoutMs)` → ok false → BLOCK
11. PASS → exit 0

### 3.4 Smoke endpoint configuration (codex H7 NIT fix)

**File**: `.kzk/docker-smoke.json` (optional)

**Field semantics** (explicit):
- `endpoint` (optional string): smoke ping URL. 없으면 build success 만으로 PASS
- `method` (optional, default `"GET"`): `"GET"` | `"HEAD"`. 그 외 invalid → default GET
- `dockerTimeoutMs` (optional, default 600000 = 10분): docker compose up timeout. bounds 1~3600000ms
- `smokeTimeoutMs` (optional, default 30000 = 30초): smoke ping timeout. bounds 1~300000ms
- `triggers.includes` (optional string[]): glob 추가 trigger 패턴
- `triggers.excludes` (optional string[]): glob 제외 패턴

Malformed JSON → BLOCK (사용자 의도 명시 했으므로 silent ignore 위험).

### 3.5 Bypass env precedence (codex H6 NIT fix)

| Order | Env | Effect | Queue code |
|---|---|---|---|
| 1 (highest) | `KZK_GATE35_DISABLE=1` | Persistent disable | `Q-GATE35-DISABLED` |
| 2 | `KZK_GATE35_SKIP=1` | One-shot skip | `Q-GATE35-SKIPPED` |
| 3 | `CI=true` or `CI=1` | CI auto skip | `Q-GATE35-CI-SKIP` |

Conflict: 둘 다 set → `_DISABLE` 우선.

Inline env-prefix support: `KZK_GATE35_SKIP=1 git commit -m "..."`.

### 3.6 Test strategy

**Test file**: `install/test/docker-compose-gate.test.mjs` (~23 test case)

| # | Test |
|---|---|
| 1-3 | commit-signal detect: `git commit` / quoted / irrelevant |
| 4-5 | inline-env: single var / multiple vars |
| 6-7 | doc-only detection: all-docs mix (.md + .mdx + .rst + .adoc + .txt) / mix-with-source (.md + backend/x.ts) |
| 8-12 | trigger: root Dockerfile / monorepo Dockerfile / irrelevant / custom includes / custom excludes |
| 13-14 | bypass precedence: both set / CI=true |
| 15-18 | smoke config: absent / malformed / invalid method / invalid timeout bounds |
| 19-21 | mock docker up: success / fail / timeout |
| 22 | queue uses KZK_QUEUE_DIR_OVERRIDE (production isolation) |
| 23 | hook pair drift — 9 marker regions byte-equal |

**Production state protection**: `KZK_QUEUE_DIR_OVERRIDE` + `mkdtempSync()` (cycle 57 패턴).

**run-tests.sh entry**:
```bash
node "$SCRIPT_DIR/docker-compose-gate.test.mjs" || FAIL=1
```

**`check-hook-pair-sync.mjs` refactor** (H2):
```javascript
const PAIR_LIST = [
  { name: "check-cycle-exit.mjs", projectLocal: ".claude/hooks/", global: "install/hooks/" },
  { name: "docker-compose-gate.mjs", projectLocal: ".claude/hooks/", global: "install/hooks/" },
];
for (const pair of PAIR_LIST) {
  validateMarkerSync(pair); // marker form: shared:start <name> / shared:end <name>
}
```

---

## 4. Implementation phases

### Phase A — SKILL.md update (~30 LoC)
- frontmatter 1.12.0 → 1.13.0
- description gate list 갱신
- Gate 3.5 본문

### Phase B — Hook file pair (~280 LoC × 2)
- `.claude/hooks/docker-compose-gate.mjs`
- `install/hooks/docker-compose-gate.mjs`
- 9 marker regions byte-equal

### Phase C — Test file (~220 LoC)
- `install/test/docker-compose-gate.test.mjs` (23 test)
- `install/test/run-tests.sh` entry

### Phase D — check-hook-pair-sync.mjs refactor (~40 LoC)
- PAIR_LIST iteration
- Marker parse `shared:start/end <name>`

### Phase E — install-global.sh + settings.json (~50 LoC)
- OPT-IN tier 에 추가 + `--docker-gate` flag
- `.claude/settings.json` PreToolUse Bash matcher entry

### Phase F — harness-share.md §3 + docs/site --regen (~60 LoC)
- §3 Gate 3.5 entry + doc-only 예외 N/A
- **§3 doc-only patterns sync (codex H14 NIT)**: harness-share.md §3 doc-only enumeration (lines 226, 608) 도 `.mdx/.rst/.adoc/.txt` 포함하도록 update — Gate 3.5 의 DOC_ONLY_PATTERNS 와 SoT 일치
- skill-flow.html + `.ko.html` Gate 3.5 카드 추가
- `node .claude/hooks/check-skill-flow-fresh.mjs --regen` fingerprint regen

### Phase G — Cycle entry + commit + verifier
- harness-flow-progress.md cycle 58 entry
- Pre-commit Gate 0~5 self-execute (Gate 3.5 = silent skip per Goal 10)
- Commit main 직접
- `git push origin main` (cycle 56 continuation)
- Fresh-agent verifier dispatch (oh-my-claudecode:verifier inherit-opus)

### Phase H — Global install update (사용자 manual)
- `bash install/install-global.sh --update --enable-hooks --regression-recall --fix-scope-trigger --freshness-guard --docker-gate --yes`

---

## 5. Open questions

- **Q-OQ-1**: `endpoint` 의 env templating (`${PORT}`) — v1 = literal only. v2 cycle.
- **Q-OQ-2** ✓ resolved (codex H5): **OPT-IN** (`--docker-gate` flag).
- **Q-OQ-3** ✓ resolved: Hook pair 유지 (cycle 57 일관).
- **Q-OQ-4** ✓ resolved (codex H8): Gate 3.5 placement OK.
- **Q-OQ-5**: Custom trigger glob — v1 minimal (includes/excludes). v2 richer syntax.
- **Q-OQ-6**: Docker 미설치 환경 — v1 = BLOCK (fail-loud). v2 = graceful skip option.
- **Q-OQ-7**: Running container restart — v1 = `up -d` 받아들임. v2 `--no-recreate`.
- **Q-OQ-8** ✓ resolved (codex H4): Self-acceptance = silent-skip validated only.

---

## 6. References

### 6.1 Source files (cycle 58 explorer + codex review 1 정정)
- `skills/kzk-pre-commit-gate/SKILL.md` v1.12.0
- `harness-share.md` §3 (lines 122-268)
- `install/hooks/dispatcher.mjs` (UserPromptSubmit orchestrator)
- `install/hooks/fix-scope-trigger.mjs` (Gate 4.5 conditional pattern)
- `install/hooks/freshness-guard.mjs` (Gate 0.5 reference)
- `install/hooks/check-cycle-exit.mjs` (cycle 55-57 pair + commit-signal detection + parseInlineEnv lines 171-191)
- **`install/test/check-hook-pair-sync.mjs`** (cycle 57 drift test — single-hardcoded, refactor 대상)
- `install/test/edit-failure-retry.test.mjs` (cycle 57 `KZK_QUEUE_DIR_OVERRIDE`, 21 tests)
- `install/install-global.sh` (lines 17-21 OPT-IN tier policy)
- `.claude/settings.json` (PreToolUse Bash matcher)
- `docs/site/skill-flow.html` + `.ko.html` (fingerprint regen)
- `.claude/hooks/check-skill-flow-fresh.mjs` (--regen mechanism)
- `harness-flow-progress.md` (cycle 57 entry format)

### 6.2 Cross-vendor codex review
- Tool: codex CLI v0.128.0
- Path: kzk-codex-handoff §32 E0 Preflight + plain text mode
- **Cycle 1** (~3:31s): 5 BLOCKER (H1 commit-signal / H2 marker syntax + PAIR_LIST / H3 trigger broad+narrow / H4 self-dogfood contradiction / H5 default-on policy) + 2 NIT (H6 bypass / H7 smoke config) + 1 PUSH-BACK (H8 Gate 3.5 placement OK) + 1 ref-fix (H9 check-hook-pair-sync.mjs) → all v2 reflect
- **Cycle 2** (~1:59s): H1 still broken (parseInlineEnv simplified, not cycle-exit-grade) + H10 BLOCKER (globToRegex `**` semantics — `custom/api/**/*.ts` failed to match `custom/api/foo.ts`) + H11 NIT (doc-only allowlist missing .mdx/.rst/.adoc/.txt) → all v3 reflect. H2-H7, H9 confirmed ✓ fixed.
- **Cycle 3** (~1:53s): H1 ✓ fixed (parseInlineEnv indexOf+slice + CRITICAL comment) + H10 ✗ still broken (sequential replace pipeline 가 자체 inserted fragments mutate — `custom/api/**/*.ts` 여전히 `custom/api/foo.ts` 매치 X) + H11 ✗ §3.2 Step 1 만 미갱신 (§3.3 만 갱신, inconsistent) + H12 BLOCKER (= H10 detail) + H13 PUSH-BACK (CRITICAL comment 의 "split('=')" self-contradictory + Phase B import 명시 필요) + H14 NIT (harness-share.md §3 doc-only sync) → all v4 reflect (tokenize patternFix + §3.2 sync + import-only Phase B + Phase F harness-share.md sync).
- **Cycle 4 pending**: PASS 예상 (BLOCKER 0 AND structural change minimal — comment/sync only)

### 6.3 Cycle 57 prior art
- Commit `22fa305`
- `KZK_QUEUE_DIR_OVERRIDE` test isolation
- `// ===== shared:start <name> =====` / `// ===== shared:end <name> =====` marker (cycle 57 실제 form)

---

**End of cycle 58 design doc v4 — frozen for implementation.** Codex review cycles 1-4 complete (cycle 4 BLOCKER=0, 2 NIT inline-fixed, codex-Verdict CONTINUE but spec-and-review §22 PASS = BLOCKER 0 AND no structural change → self-PASS). Next: Implementation Phase A~H → pre-commit gate (Gate 0~5 self-check) → commit + cycle entry → fresh-agent verifier (oh-my-claudecode:verifier inherit-opus, 4 sub-check) → final marker commit + push origin main.
