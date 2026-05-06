#!/usr/bin/env node
// keyword-detector.mjs — UserPromptSubmit hook for kzk-harness skill auto-load.
//
// Detects user-prompt phrases that should trigger specific kzk-* skill loads
// and emits a system-reminder pointing the main context at the right skills
// BEFORE it can read/edit files. Closes the meta-gap pattern where main loads
// only kzk-codebase-survey for a multi-bug task and skips kzk-large-task-delegation.
//
// Authoritative spec: docs/superpowers/specs/2026-05-04-kzk-global-install-design.md §7.5
// Wired into ~/.claude/settings.json by `install-global.sh --enable-hooks` (N3 opt-in).

const RULES = [
  {
    skills: ["kzk-large-task-delegation"],
    why: "3+ file edits / 5+ file read / multi-plan execution mandates fresh-subagent dispatch — main never executes",
    triggers: [
      "큰 작업", "버그 전수조사", "구현 검증", "마무리 해줘", "전수 검토", "끝내줘",
      "large task", "subagent dispatch", "3+ file edits", "200+ LoC", "5+ file read",
      "read-heavy audit", "spec verification", "implementation audit",
      "사용성 버그", "사용성 회귀", "qa scan", "QA scan",
      "여러 plan 으로 쪼개", "여러 plan으로 쪼개", "플랜 여러개로 쪼개", "플랜 쪼개", "plan 쪼개", "plan 여러개",
      "사이클 자율", "사이클로 자율", "사이클 돌면서", "자율로 돌면서",
      "버그들 모두", "버그 모두 개선", "모두 잡아줘", "모두 개선",
      "리팩토링", "refactor", "정리해줘", "cleanup", "개선해줘", "전반적으로", "통째로", "scope estimate",
    ],
  },
  {
    skills: ["kzk-codebase-survey", "kzk-large-task-delegation"],
    why: "codebase survey precedes any large-scope edit; large-task-delegation is the mandatory next hop",
    triggers: [
      "codebase survey", "코드베이스 탐색", "deep explore", "survey first", "before planning",
      "구현 확인", "spec vs implementation", "spec 체크", "스펙 체크", "하나하나 확인", "ralph로 체크",
    ],
  },
  {
    skills: ["kzk-codebase-survey"],
    why: "단순 survey 요청 (자연 발화) — large-task-delegation 동반 X (사용자 결정 2026-05-06: 단순 survey 만)",
    triggers: [
      "코드 서베이", "코드서베이", "서베이 해줘", "서베이해줘", "code survey", "코드베이스 서베이", "코드 survey",
    ],
  },
  {
    skills: ["kzk-codebase-survey"],
    why: "fix-start hub — codebase-survey lazy-invokes fix-scope-expansion + freshness-guard internally",
    triggers: [
      "fix 시작", "버그 수정", "에러 fix", "regression fix", "버그 수정 시작",
    ],
  },
  {
    skills: ["kzk-spec-and-review"],
    why: "spec / plan / major-design authoring requires Step 0 survey + Steps 1-3 codex review",
    triggers: [
      "spec 잡자", "spec 작성", "spec draft", "plan draft", "plan 작성",
      "design draft", "major design", "architecture review", "codex review", "codex consult", "cross-verify",
      "플랜 만들", "plan 만들", "여러 plan", "플랜 여러개", "메타 plan", "meta plan", "spec 만들",
    ],
  },
  {
    skills: ["kzk-autonomous-boundary"],
    why: "autonomous-mode entry requires the ASK-FIRST 3-slot branch contract (kzk-autonomous-boundary §Branch contract)",
    triggers: [
      "ralph로 돌려", "ralph로 체크", "ralph로 확인", "자는 동안 진행",
      "실행해놔야 queue 보지", "끝까지 끝내줘", "autonomous mode",
      "자율실행", "자율 실행", "자율로 돌려",
    ],
  },
  {
    skills: ["kzk-spec-and-review", "kzk-large-task-delegation", "kzk-pre-commit-gate", "kzk-autonomous-loop"],
    why: "self-improvement loop entry — load the full meta-stack to avoid recursive meta-gap",
    triggers: ["harness 개선 루프", "스킬 개선해줘", "harness loop", "자가개선", "자가개선 루프", "재발 방지", "메타 갭"],
  },
  {
    skills: ["kzk-test-coverage"],
    why: "TDD discipline — failing test (red) BEFORE impl (green) BEFORE refactor BEFORE commit; coverage gate gates the result",
    triggers: [
      "tdd", "TDD", "test first", "테스트 먼저", "테스트부터", "failing test", "red-green",
      "테스트 추가", "테스트 추가해줘", "test 추가", "coverage 추가",
    ],
  },
  {
    skills: ["kzk-spec-and-review"],
    why: "brainstorm-mode: 탐색적 키워드 감지 → Step -1 brainstorming 자동 호출",
    triggers: [
      "어떻게 하면",
      "방법 찾자",
      "아이디어",
      "설계하자",
      "브레인스토밍",
      "고민해",
      "어떤 방향",
      "how should we",
      "brainstorm",
      "let's design",
    ],
  },
];

function detect(input) {
  const matched = new Map();
  for (const rule of RULES) {
    for (const trig of rule.triggers) {
      if (input.includes(trig)) {
        for (const skill of rule.skills) {
          if (!matched.has(skill)) matched.set(skill, { triggers: new Set(), whys: new Set() });
          matched.get(skill).triggers.add(trig);
          matched.get(skill).whys.add(rule.why);
        }
      }
    }
  }
  return Array.from(matched.entries()).map(([skill, info]) => ({
    skill,
    triggers: Array.from(info.triggers),
    whys: Array.from(info.whys),
  }));
}

function buildReminder(matches) {
  if (matches.length === 0) return null;
  // Group skills into clusters by shared trigger phrases
  const skillNames = matches.map((m) => m.skill).join(", ");
  const allTriggers = [...new Set(matches.flatMap((m) => m.triggers))];
  const triggersStr = allTriggers.map((t) => `'${t}'`).join(", ");
  const parts = [`🚨 [kzk] LOAD before edit: ${skillNames} (matched: ${triggersStr})`];
  // If brainstorm mode, add marker
  const brainstormRule = RULES.find((rule) => rule.why.startsWith("brainstorm-mode:"));
  const isBrainstorm = brainstormRule && matches.some((m) => brainstormRule.skills.includes(m.skill) &&
    m.triggers.some((t) => brainstormRule.triggers.includes(t)));
  if (isBrainstorm) {
    parts.push("Mode: brainstorm — Step -1 brainstorming 자동 호출 후 spec-and-review 진입");
  }
  return parts.join("\n");
}

export { detect, buildReminder, RULES };

if (process.argv[1] === new URL(import.meta.url).pathname) {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { raw += chunk; });
  process.stdin.on("end", () => {
    let payload;
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }
    const prompt = String(payload.prompt ?? payload.user_prompt ?? "");
    const matches = detect(prompt);
    const reminder = buildReminder(matches);
    if (reminder) {
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "UserPromptSubmit",
            additionalContext: reminder,
          },
        }) + "\n",
      );
    } else {
      process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    }
  });
}
