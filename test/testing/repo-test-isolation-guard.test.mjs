// Story 87 / task 02 — the lab keeps its own hygiene rule, hand-owned.
//
// THE HAZARD IS REAL AND IT IS THIS REPOSITORY'S. An unisolated suite invocation here falls
// back to the real global store — shared by every project and every live daemon on this
// machine — and a passing run can write fixture node descriptors, presence records and
// config into it. Withdrawing the shipped member must not withdraw the protection here.
//
// THE COVERAGE MOVES WITH THE CODE. The predicate's cases used to live in
// `frozen-set-compiled.test.mjs`, imported by name from the bundle path. It left the
// bundle, so its cases are re-homed HERE, onto the file this repository actually executes.
// Re-homing the guard without its tests would ship the one thing worse than the old guard:
// an untested one, guarding the store that has already been polluted.
//
// THE KNOWN SIDE DOOR IS NOT CLOSED HERE, AND IS NOT PRETENDED CLOSED. An aggregate entry
// point that chains the suite is not a suite invocation by any spelling; the last outline
// row asserts that it is allowed, so the gap is recorded rather than implied.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluate, unisolatedTestInvocation } from "../../.claude/hooks/aof/guard-test-isolation.mjs";
import { AOF_HOOK_MARKER, applyClaudeSettingsMerge, claudeSettingsPath, isAofEntry } from "../../src/claude-settings.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SETTINGS = path.join(repoRoot, ".claude", "settings.json");
const GUARD = path.join(repoRoot, ".claude", "hooks", "aof", "guard-test-isolation.mjs");
const LEDGERS = [
  [path.join(repoRoot, "wiki", "work", "archive", "55_milestone_anchors-and-frozen-set", "OUTCOME.md"), "This repository still runs the pre-55 hand-wired isolation hook"],
  [path.join(repoRoot, "wiki", "work", "archive", "55_milestone_anchors-and-frozen-set", "stories", "04_story_the-frozen-set-compiled", "OUTCOME.md"), "This repository's own installed guard hook"],
];

const blocked = (command) => evaluate({ tool_input: { command } }).blocked;

// The entry this repository's settings invoke for the guard — found by what it runs, not by
// a marker, because the whole point is that it carries none.
async function guardEntry() {
  const settings = JSON.parse(await readFile(SETTINGS, "utf8"));
  const entries = (settings?.hooks?.PreToolUse ?? []).flatMap((group) => group?.hooks ?? []);
  return entries.find((entry) => JSON.stringify(entry).includes("guard-test-isolation.mjs")) ?? null;
}

function ledgerSection(document, heading) {
  const start = document.indexOf(`### ${heading}`);
  if (start < 0) return null;
  const rest = document.slice(start + heading.length);
  const end = rest.indexOf("\n### ");
  return end < 0 ? rest : rest.slice(0, end);
}

// The pre-55 predicate, re-created for the red probe: its subject is a text match on the raw
// command, so it cannot tell running a file from naming one.
function weakenedToRawText(command) {
  const isTestRun = /scripts[\\/]+test\.mjs/i.test(command)
    || /\bnode\b[^\n]*\s--test\b/i.test(command)
    || /\bnpm\b\s+(?:run\s+)?test\b/i.test(command);
  return isTestRun && !/AOF_GLOBAL_HOME\s*=/.test(command);
}

export const repoTestIsolationGuardTests = [
  {
    name: "87/02 the guard this repository runs is the compiled predicate, not a match on the raw command text",
    run: async () => {
      const entry = await guardEntry();
      assert.ok(entry != null, "this repository's settings still invoke a test-isolation guard");
      const code = await readFile(GUARD, "utf8");

      // It judges what the command INVOKES rather than what text it contains.
      assert.equal(blocked("node scripts/test.mjs"), true, "an invocation is judged an invocation");
      assert.equal(blocked("rg 'scripts/test.mjs' src test"), false, "…and naming the path is not");
      assert.ok(/function\s+segments\s*\(/.test(code) && /function\s+tokens\s*\(/.test(code), "the predicate segments and tokenises rather than regexing the raw string");

      // It reads its payload from standard input.
      assert.ok(/readFileSync\(\s*0\s*,/.test(code), "the guard reads its payload from stdin (fd 0)");
      assert.ok(/\btool_input\b/.test(code), "…and reads the measured `tool_input` field");

      // It blocks by exiting unsuccessfully with a reason naming the prefix to re-run with.
      const child = spawnSync(process.execPath, [GUARD], {
        input: JSON.stringify({ tool_input: { command: "npm test" } }),
        encoding: "utf8",
      });
      assert.equal(child.status, 2, "a blocked call exits unsuccessfully");
      assert.match(child.stderr, /AOF_GLOBAL_HOME=/, "…naming the isolation prefix to re-run with");
      assert.match(child.stderr, /npm test/, "…quoting the command it refused");

      // It gets out of the way on every input it cannot decide.
      assert.equal(spawnSync(process.execPath, [GUARD], { input: "not-json", encoding: "utf8" }).status, 0, "unparseable input proceeds");
      assert.equal(spawnSync(process.execPath, [GUARD], { input: "", encoding: "utf8" }).status, 0, "an empty payload proceeds");
      assert.equal(evaluate({ tool_input: { command: null } }).blocked, false, "a null command proceeds");
      assert.equal(evaluate({}).blocked, false, "a payload with no tool_input proceeds");
      assert.equal(unisolatedTestInvocation(""), null, "an empty command proceeds");
    },
  },
  {
    name: "87/02 the framework has no opinion about this entry — unmarked is the sanctioned exit",
    run: async () => {
      const entry = await guardEntry();
      assert.equal(Object.hasOwn(entry, AOF_HOOK_MARKER), false, "the entry carries no ownership marker");
      assert.equal(isAofEntry(entry), false, "…so aof does not recognise it as its own");

      // Install/update against a COPY of this repository's real settings — never the tree.
      const dir = await mkdtemp(path.join(os.tmpdir(), "aof-87-repo-"));
      try {
        await mkdir(path.join(dir, ".claude"), { recursive: true });
        const before = await readFile(SETTINGS, "utf8");
        await writeFile(claudeSettingsPath(dir), before, "utf8");

        const result = await applyClaudeSettingsMerge(dir, { name: "aof" });
        const after = JSON.parse(await readFile(claudeSettingsPath(dir), "utf8"));

        assert.deepEqual(after.hooks.PreToolUse, JSON.parse(before).hooks.PreToolUse, "the entry is left exactly as it is");
        assert.deepEqual(result.drift.filter((row) => row.event === "PreToolUse"), [], "it is reported as neither drift…");
        assert.deepEqual(result.tamper, [], "…nor tamper");
        assert.deepEqual(
          (after.hooks.PreToolUse ?? []).flatMap((group) => (group?.hooks ?? []).filter(isAofEntry)),
          [],
          "and no framework-authored entry is added beside it",
        );
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "87/02 the gap 55 left open is closed on its substance, and records the route actually taken",
    run: async () => {
      for (const [file, heading] of LEDGERS) {
        const section = ledgerSection(await readFile(file, "utf8"), heading);
        assert.ok(section != null, `${path.relative(repoRoot, file)} still carries the ledger entry "${heading}"`);
        assert.match(section, /\*\*Status:\*\*\s*discharged/, `${heading}: the ledger entry is discharged`);
        assert.match(section, /by hand/i, `${heading}: the recorded discharge names the route actually taken`);
        assert.match(section, /withdraw/i, `${heading}: …and says the route the condition named was withdrawn`);
      }
    },
  },
  {
    name: "87/02 red probe — a regression to a raw-text match is caught here, naming a read-only command it would block",
    run: () => {
      const readOnly = "rg 'scripts/test.mjs' src test";
      assert.equal(blocked(readOnly), false, "the guard this repository runs lets the reader through");
      assert.equal(weakenedToRawText(readOnly), true, "…and the weakened predicate blocks it, which is the regression");

      const stillBlocked = "node scripts/test.mjs";
      assert.equal(blocked(stillBlocked), true, "both agree on a real invocation…");
      assert.equal(weakenedToRawText(stillBlocked), true, "…so the probe is not just a broader predicate");

      const heredoc = "cat <<'EOF' > RESEARCH.md\nnode scripts/test.mjs\nEOF";
      assert.equal(blocked(heredoc), false);
      assert.equal(weakenedToRawText(heredoc), true, "the weakened predicate also blocks the document that quotes the path");
    },
  },
  {
    name: "87/02 the guard blocks a run and lets a reader through — the cases re-homed from the bundle module",
    run: () => {
      const rows = [
        ["an unisolated invocation of this repository's suite script", "node scripts/test.mjs", true],
        ["an unisolated package-manager test script", "npm test", true],
        ["an unisolated runner invocation over a single test file", "node --test test/bundle/frozen-set-compiled.test.mjs", true],
        ["a nested shell invocation of the suite, unisolated", 'pwsh -Command "npm test"', true],
        ["the same invocation carrying a throwaway global home", "AOF_GLOBAL_HOME=tmp node scripts/test.mjs", false],
        ["an invocation whose isolation was exported earlier in the command", "export AOF_GLOBAL_HOME=tmp; npm test", false],
        ["a search whose pattern quotes the suite path", "rg 'scripts/test.mjs' src test", false],
        ["a document being written whose prose quotes the suite path", "@'\nnode scripts/test.mjs\n'@ | Set-Content RESEARCH.md", false],
        ["a here-document whose body names the suite path", "cat <<'EOF' > RESEARCH.md\nnode scripts/test.mjs\nEOF", false],
        ["an aggregate entry point that chains the suite", "npm run verify", false],
      ];
      for (const [label, command, expected] of rows) {
        assert.equal(blocked(command), expected, `${label}: expected ${expected ? "blocked" : "allowed"}`);
      }
      // Every block names the prefix to re-run with — a refusal with no way forward is what
      // the operator pays for, every time.
      for (const [label, command] of rows.filter(([, , expected]) => expected)) {
        assert.match(evaluate({ tool_input: { command } }).reason, /AOF_GLOBAL_HOME=/, `${label}: names the prefix`);
      }
    },
  },
];
