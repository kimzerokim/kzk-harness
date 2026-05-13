#!/usr/bin/env node
// cycle-exit.test.mjs — test suite for check-cycle-exit.mjs
// Runner: node --test tests/hooks/cycle-exit.test.mjs
//
// Each test sends a mock stdin payload to the hook process and asserts
// the block/pass decision in the stdout JSON response.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.resolve(__dirname, "../../.claude/hooks/check-cycle-exit.mjs");
const REPO_ROOT = path.resolve(__dirname, "../..");

/**
 * Run the hook with a given command string as stdin payload.
 * Returns { decision, reason, didPass } where didPass = decision !== "block".
 */
function runHook(command, env = {}) {
  const payload = JSON.stringify({
    tool_name: "Bash",
    tool_input: { command },
  });

  const result = spawnSync(process.execPath, [HOOK], {
    input: payload,
    encoding: "utf8",
    env: { ...process.env, ...env },
    timeout: 5000,
  });

  let parsed;
  try {
    parsed = JSON.parse(result.stdout.trim());
  } catch {
    throw new Error(`Hook stdout not valid JSON: ${JSON.stringify(result.stdout)} stderr: ${result.stderr}`);
  }

  const isBlock = parsed.decision === "block";
  return {
    decision: parsed.decision ?? (parsed.continue ? "pass" : "unknown"),
    reason: parsed.reason ?? null,
    didPass: !isBlock,
    raw: parsed,
    stderr: result.stderr,
  };
}

function runHookWithTool(toolName, command, env = {}) {
  const payload = JSON.stringify({
    tool_name: toolName,
    tool_input: { command },
  });

  const result = spawnSync(process.execPath, [HOOK], {
    input: payload,
    encoding: "utf8",
    env: { ...process.env, ...env },
    timeout: 5000,
  });

  let parsed;
  try {
    parsed = JSON.parse(result.stdout.trim());
  } catch {
    throw new Error(`Hook stdout not valid JSON: ${JSON.stringify(result.stdout)}`);
  }

  return {
    didPass: parsed.decision !== "block",
    decision: parsed.decision ?? (parsed.continue ? "pass" : "unknown"),
    reason: parsed.reason ?? null,
  };
}

// ---------------------------------------------------------------------------
// Signal A — PR/push (12 cases)
// ---------------------------------------------------------------------------

test("Signal A: gh pr create → BLOCK", () => {
  const r = runHook('gh pr create --title "my feature"');
  assert.equal(r.didPass, false, "should block");
  assert.ok(r.reason?.includes("signal: A"), `reason: ${r.reason}`);
});

test("Signal A: gh pr create --draft → BLOCK", () => {
  const r = runHook('gh pr create --draft --title "wip"');
  assert.equal(r.didPass, false, "should block draft PR too");
});

test("Signal A: gh pr merge → BLOCK", () => {
  const r = runHook("gh pr merge 123 --squash");
  assert.equal(r.didPass, false, "should block pr merge");
});

test("Signal A: git push origin main → BLOCK", () => {
  const r = runHook("git push origin main");
  assert.equal(r.didPass, false, "should block push to main");
});

test("Signal A: git push -u origin main → BLOCK", () => {
  const r = runHook("git push -u origin main");
  assert.equal(r.didPass, false, "should block push with -u flag");
});

test("Signal A: git push --force origin main → BLOCK", () => {
  const r = runHook("git push --force origin main");
  assert.equal(r.didPass, false, "should block force push to main");
});

test("Signal A: git push --force-with-lease origin main → BLOCK", () => {
  const r = runHook("git push --force-with-lease origin main");
  assert.equal(r.didPass, false, "should block force-with-lease to main");
});

test("Signal A: git push origin HEAD:main → BLOCK (refspec form)", () => {
  const r = runHook("git push origin HEAD:main");
  assert.equal(r.didPass, false, "should block HEAD:main refspec");
});

test("Signal A: git push origin feature/foo:main → BLOCK (refspec form)", () => {
  const r = runHook("git push origin feature/foo:main");
  assert.equal(r.didPass, false, "should block feature/foo:main refspec");
});

test("Signal A negative: gh pr view 123 → pass", () => {
  const r = runHook("gh pr view 123");
  assert.equal(r.didPass, true, "pr view should pass");
});

test("Signal A negative: gh pr list → pass", () => {
  const r = runHook("gh pr list");
  assert.equal(r.didPass, true, "pr list should pass");
});

test("Signal A negative: git push origin feature/foo → pass", () => {
  const r = runHook("git push origin feature/foo");
  assert.equal(r.didPass, true, "push to non-main branch should pass");
});

test("Signal A negative: git push origin develop → pass", () => {
  const r = runHook("git push origin develop");
  assert.equal(r.didPass, true, "push to develop should pass");
});

// ---------------------------------------------------------------------------
// Signal B — commit markers (13 cases)
// ---------------------------------------------------------------------------

test("Signal B: MILESTONE: in -m → BLOCK", () => {
  const r = runHook('git commit -m "MILESTONE: cycle 56 done"');
  assert.equal(r.didPass, false, "MILESTONE: should block");
  assert.ok(r.reason?.includes("signal: B"), `reason: ${r.reason}`);
});

test("Signal B: CYCLE-EXIT: in -m → BLOCK", () => {
  const r = runHook('git commit -m "CYCLE-EXIT: cycle 25 final"');
  assert.equal(r.didPass, false, "CYCLE-EXIT: should block");
});

test("Signal B: STUB-CLEAR: in -m → BLOCK", () => {
  const r = runHook('git commit -m "STUB-CLEAR: lock button"');
  assert.equal(r.didPass, false, "STUB-CLEAR: should block");
});

test("Signal B: MILESTONE: in second -m arg (body) → BLOCK", () => {
  const r = runHook('git commit -m "feat(x): some feature" -m "MILESTONE: cycle 56"');
  assert.equal(r.didPass, false, "MILESTONE: in second -m should block");
});

test("Signal B: MILESTONE: in multiline body (middle line) → BLOCK", () => {
  // Use three -m args: subject, preamble, then MILESTONE: on its own line
  const r = runHook('git commit -m "feat: something" -m "some details" -m "MILESTONE: cycle done"');
  assert.equal(r.didPass, false, "MILESTONE: in multiline body should block");
});

test("Signal B: -F file with CYCLE-EXIT: → BLOCK", (t, done) => {
  const tmpFile = path.join(REPO_ROOT, ".git", "TEST_COMMIT_MSG_CYCLE_EXIT");
  fs.writeFileSync(tmpFile, "feat: wire button\n\nCYCLE-EXIT: cycle 25 final\n");
  try {
    const r = runHook(`git commit -F ${tmpFile}`);
    assert.equal(r.didPass, false, "should block on file with CYCLE-EXIT:");
  } finally {
    fs.unlinkSync(tmpFile);
  }
  done?.();
});

test("Signal B: -F nonexistent file → pass (fail-open)", () => {
  const r = runHook("git commit -F /nonexistent-file-kzk-test-12345.txt");
  assert.equal(r.didPass, true, "nonexistent -F file should pass (fail-open)");
});

test("Signal B negative: plain fix commit → pass", () => {
  const r = runHook('git commit -m "fix(foo): correct null check"');
  assert.equal(r.didPass, true, "plain fix commit should pass");
});

test("Signal B negative: lowercase milestone → pass (case-sensitive)", () => {
  const r = runHook('git commit -m "Milestone: lowercase does not match"');
  assert.equal(r.didPass, true, "lowercase Milestone: should not match (case-sensitive)");
});

test("Signal B negative: cycle keyword without marker → pass", () => {
  const r = runHook('git commit -m "c25 final — wrap up cycle"');
  assert.equal(r.didPass, true, "cycle keyword without marker should pass");
});

test("Signal B negative: STUB: only (not STUB-CLEAR) → pass", () => {
  const r = runHook('git commit -m "feat: add lock button\\n\\nSTUB: lock button disabled (Phase 2 wiring)\\nUnblocked when: useGridLock ready"');
  assert.equal(r.didPass, true, "STUB: alone (no STUB-CLEAR) should pass");
});

test("Signal B negative: empty -m body → pass", () => {
  const r = runHook('git commit -m ""');
  assert.equal(r.didPass, true, "empty commit message body should pass");
});

test("Signal B: conventional commit subject + CYCLE-EXIT in body → BLOCK", () => {
  const r = runHook('git commit -m "feat(hooks): add cycle-exit gate" -m "CYCLE-EXIT: cycle 56 final"');
  assert.equal(r.didPass, false, "CYCLE-EXIT: in body of conventional commit should block");
});

// ---------------------------------------------------------------------------
// Bypass env vars (5 cases)
// ---------------------------------------------------------------------------

test("Bypass: KZK_CYCLE_EXIT_VERIFIED=1 → pass", () => {
  const r = runHook('git commit -m "MILESTONE: cycle 56 done"', {
    KZK_CYCLE_EXIT_VERIFIED: "1",
  });
  assert.equal(r.didPass, true, "VERIFIED=1 should allow through");
});

test("Bypass: KZK_CYCLE_EXIT_SKIP=1 → pass + queue entry written", () => {
  const queuePath = path.join(REPO_ROOT, "docs", "harness", "user-queue.md");
  const beforeContent = fs.existsSync(queuePath)
    ? fs.readFileSync(queuePath, "utf8")
    : "";

  const r = runHook('git commit -m "MILESTONE: skip test"', {
    KZK_CYCLE_EXIT_SKIP: "1",
  });
  assert.equal(r.didPass, true, "SKIP=1 should pass through");
  assert.ok(r.stderr.includes("Q-CYCLE-EXIT-STALE"), "stderr should warn about queue entry");

  // Verify queue entry was appended
  if (fs.existsSync(queuePath)) {
    const afterContent = fs.readFileSync(queuePath, "utf8");
    assert.ok(
      afterContent.includes("Q-CYCLE-EXIT-STALE"),
      "user-queue.md should contain Q-CYCLE-EXIT-STALE entry",
    );
    // Restore original content
    fs.writeFileSync(queuePath, beforeContent);
  }
});

test("Bypass conflict: VERIFIED=1 + SKIP=1 → BLOCK with conflicting trust states", () => {
  const r = runHook('git commit -m "MILESTONE: conflict test"', {
    KZK_CYCLE_EXIT_VERIFIED: "1",
    KZK_CYCLE_EXIT_SKIP: "1",
  });
  assert.equal(r.didPass, false, "both VERIFIED and SKIP should block");
  assert.ok(
    r.reason?.includes("conflicting trust states"),
    `reason should mention conflicting trust states: ${r.reason}`,
  );
});

test("Bypass: KZK_CYCLE_EXIT_DISABLE=1 → pass + loud stderr + queue entry", () => {
  const queuePath = path.join(REPO_ROOT, "docs", "harness", "user-queue.md");
  const beforeContent = fs.existsSync(queuePath)
    ? fs.readFileSync(queuePath, "utf8")
    : "";

  const r = runHook('git commit -m "MILESTONE: disable test"', {
    KZK_CYCLE_EXIT_DISABLE: "1",
  });
  assert.equal(r.didPass, true, "DISABLE=1 should pass through");
  assert.ok(r.stderr.includes("WARNING"), "stderr should contain WARNING");
  assert.ok(r.stderr.includes("KZK_CYCLE_EXIT_DISABLE"), "stderr should mention env var");

  if (fs.existsSync(queuePath)) {
    const afterContent = fs.readFileSync(queuePath, "utf8");
    assert.ok(
      afterContent.includes("Q-CYCLE-EXIT-DISABLED"),
      "user-queue.md should contain Q-CYCLE-EXIT-DISABLED entry",
    );
    // Restore original content
    fs.writeFileSync(queuePath, beforeContent);
  }
});

test("Bypass: KZK_CYCLE_EXIT_VERIFIED=1 with Signal A (push) → pass", () => {
  const r = runHook("git push origin main", {
    KZK_CYCLE_EXIT_VERIFIED: "1",
  });
  assert.equal(r.didPass, true, "VERIFIED=1 should allow Signal A through");
});

// ---------------------------------------------------------------------------
// Inline env var prefix bypass (6 cases)
// ---------------------------------------------------------------------------

test("Inline env: KZK_CYCLE_EXIT_VERIFIED=1 git commit -m CYCLE-EXIT → pass", () => {
  const r = runHook('KZK_CYCLE_EXIT_VERIFIED=1 git commit -m "CYCLE-EXIT: cycle 55"');
  assert.equal(r.didPass, true, "inline VERIFIED=1 prefix should allow through");
});

test("Inline env: KZK_CYCLE_EXIT_SKIP=1 git commit -m CYCLE-EXIT → pass", () => {
  const r = runHook('KZK_CYCLE_EXIT_SKIP=1 git commit -m "CYCLE-EXIT: cycle 55"');
  assert.equal(r.didPass, true, "inline SKIP=1 prefix should allow through");
});

test("Inline env: KZK_CYCLE_EXIT_DISABLE=1 git commit -m CYCLE-EXIT → pass", () => {
  const r = runHook('KZK_CYCLE_EXIT_DISABLE=1 git commit -m "CYCLE-EXIT: cycle 55"');
  assert.equal(r.didPass, true, "inline DISABLE=1 prefix should allow through");
});

test("Inline env conflict: KZK_CYCLE_EXIT_VERIFIED=1 KZK_CYCLE_EXIT_SKIP=1 → BLOCK", () => {
  const r = runHook('KZK_CYCLE_EXIT_VERIFIED=1 KZK_CYCLE_EXIT_SKIP=1 git commit -m "CYCLE-EXIT: x"');
  assert.equal(r.didPass, false, "inline VERIFIED+SKIP conflict should block");
  assert.ok(
    r.reason?.includes("conflicting trust states"),
    `reason should mention conflicting trust states: ${r.reason}`,
  );
});

test("Inline env multi-prefix: OTHER=val KZK_CYCLE_EXIT_VERIFIED=1 → pass", () => {
  const r = runHook('OTHER=val KZK_CYCLE_EXIT_VERIFIED=1 git commit -m "CYCLE-EXIT: x"');
  assert.equal(r.didPass, true, "multi-var inline env with VERIFIED=1 should pass");
});

test("Inline env false-positive: KZK_CYCLE_EXIT_VERIFIED=1 inside quoted -m → BLOCK", () => {
  // The env var text appears inside the commit message, not as a real prefix
  const r = runHook('git commit -m "CYCLE-EXIT: x KZK_CYCLE_EXIT_VERIFIED=1"');
  assert.equal(r.didPass, false, "KZK_CYCLE_EXIT_VERIFIED=1 inside quoted message must not bypass");
});

// ---------------------------------------------------------------------------
// Edge cases (4 cases)
// ---------------------------------------------------------------------------

test("Edge: empty stdin → pass with no crash", () => {
  const result = spawnSync(process.execPath, [HOOK], {
    input: "",
    encoding: "utf8",
    env: { ...process.env },
    timeout: 5000,
  });
  let parsed;
  try {
    parsed = JSON.parse(result.stdout.trim());
  } catch {
    throw new Error(`Hook stdout not valid JSON on empty stdin: ${result.stdout}`);
  }
  assert.equal(parsed.decision !== "block", true, "empty stdin should pass (fail-open)");
});

test("Edge: malformed JSON stdin → pass (fail-open)", () => {
  const result = spawnSync(process.execPath, [HOOK], {
    input: "{ not valid json !!!",
    encoding: "utf8",
    env: { ...process.env },
    timeout: 5000,
  });
  let parsed;
  try {
    parsed = JSON.parse(result.stdout.trim());
  } catch {
    throw new Error(`Hook stdout not valid JSON: ${result.stdout}`);
  }
  assert.equal(parsed.decision !== "block", true, "malformed stdin should pass (fail-open)");
});

test("Edge: non-Bash tool name → pass", () => {
  const r = runHookWithTool("Edit", 'git commit -m "MILESTONE: should not fire on Edit tool"');
  assert.equal(r.didPass, true, "non-Bash tool should always pass");
});

test("Edge: multiline commit body with MILESTONE: in middle → BLOCK", () => {
  // Tests multiline regex mode: marker on a non-first line — use separate -m args
  const r = runHook(
    'git commit -m "feat: big cycle done" -m "Some details here" -m "MILESTONE: cycle 56" -m "More notes"',
  );
  assert.equal(r.didPass, false, "MILESTONE: anywhere in body should BLOCK (multiline mode)");
});

// ---------------------------------------------------------------------------
// Signal A false-positive protection — heredoc / quoted string stripping (4 cases)
// ---------------------------------------------------------------------------

test("Signal A false-positive: gh pr create inside HEREDOC body of git commit → pass", () => {
  // The actual command is git commit; "gh pr create" only appears in the heredoc body
  const cmd = "git commit -m \"$(cat <<'EOF'\nfeat: x\nMentions gh pr create in body\nEOF\n)\"";
  const r = runHook(cmd);
  assert.equal(r.didPass, true, "gh pr create inside HEREDOC body should not trigger Signal A");
});

test("Signal A false-positive: gh pr create inside double-quoted string → pass", () => {
  // "gh pr create" is inside the quoted -m value, not an actual gh invocation
  const r = runHook('git commit -m "feat: gh pr create test"');
  assert.equal(r.didPass, true, "gh pr create inside quoted string should not trigger Signal A");
});

test("Signal A false-positive + Signal B: MILESTONE marker + gh pr in quoted string → BLOCK Signal B only", () => {
  // Signal B fires (MILESTONE: present), but Signal A should NOT fire from the quoted gh pr text
  const r = runHook('git commit -m "MILESTONE: includes gh pr create text"');
  assert.equal(r.didPass, false, "MILESTONE: marker should block (Signal B)");
  assert.ok(r.reason?.includes("signal: B"), `expected Signal B, got: ${r.reason}`);
});

test("Signal A: actual gh pr create with heredoc in title arg → BLOCK Signal A", () => {
  // The gh pr create invocation itself is outside the heredoc — Signal A must still fire
  const cmd = "gh pr create --title \"$(cat <<'EOF'\ngit push origin main\nEOF\n)\"";
  const r = runHook(cmd);
  assert.equal(r.didPass, false, "actual gh pr create invocation should still block (Signal A)");
  assert.ok(r.reason?.includes("signal: A"), `expected Signal A, got: ${r.reason}`);
});
