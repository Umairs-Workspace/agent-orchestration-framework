// Fitness function: acd-hook-rule-detects-never-writes (milestone 77 / story 01, FF-7703;
// ADR-005 §1, §2, §3).
//
//   "The hook rule DETECTS and never writes, and it cannot claim an operator's hook."
//
// ── A RATCHET, GREEN ON ARRIVAL — SO ITS RED IS A PLANT, NOT A REPAIR ────────────────────────
//
// Measured at HEAD, 2026-09-03: this repository's settings carry six hook entries, five marked and
// one deliberately unmarked, and ZERO duplicate pairs — 72/03 deleted the three RESEARCH measured,
// by hand, mid-session. So the evidence base for changing the merge is n = 0 observed instances in
// the only repository anyone has looked at, and this control's red probe PLANTS an unmarked twin of
// a managed entry into a fixture object rather than repairing a defect.
//
// ── WHY THE REFUSALS ARE THE LOAD-BEARING HALF ───────────────────────────────────────────────
//
// A duplicate detector that OVER-claims points at a hook its operator wrote on purpose, and the
// person who finds out is whoever it broke. That is the exact shape `72/ADR-005 §3` refused when it
// declined to change the merge — and the hook that makes it concrete is in this repository: an
// unmarked pre-tool entry invoking the test-isolation guard, the thing that stops an unisolated
// test run writing into the real global home. It pairs with no managed entry. A rule that reported
// it would be arguing for the deletion two milestones have now refused.
//
// Every refusal below is therefore driven POSITIVELY — planted, and required to come back clean —
// and then driven BACK THE OTHER WAY, because a table of things that must not happen passes just as
// happily when nothing is wired at all.
//
// ── THE SUBJECT IS THE FAMILY, DERIVED — NEVER A LIST OF THIS STORY'S FILES ──────────────────
//
// The settings-write, merge-import and marker-import legs are asserted over EVERY module under
// `src/work-audit/**`, walked recursively. That claim is true of the modules that were already
// there and is strictly stronger than a claim about the two this milestone has added so far — and,
// unlike a ledger of story files, a module 77/03, 77/04 or 77/05 adds is covered on arrival rather
// than needing this file edited to see it.
//
// The CHILD-PROCESS leg is the one exception, and it is not weakened: `59/FF-5904` already walks
// this family's whole import closure and asserts that `node:child_process` is imported by
// `spawn.mjs` and by nothing else, with no other process API named anywhere. 77's lane modules are
// INSIDE that closure, so they are covered on arrival and this file declares no copy. What it does
// instead is prove the DETECTOR has teeth on a planted child process, which is the half a control
// asserting an absence can never get from the absence itself.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stripComments } from "../../support/source-slice.mjs";
import { resolvedInvocation, runHookWiring } from "../../../src/work-audit/hook-wiring.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const FAMILY_ROOT = "src/work-audit";
const FAMILY_FLOOR = 6;

// The one child-process seam the family is allowed, named by PATH rather than by basename so a
// nested `lanes/spawn.mjs` could not inherit the exemption. Its own boundedness is 59/FF-5904's
// claim and is not restated here.
const SPAWN_SEAM = "src/work-audit/spawn.mjs";

// Spelled locally rather than imported — a control that imported the module it asserts the family
// does not reach would be proving the isolation through a dependency. That second spelling is the
// deliberate price, and it is the same move `72/FF-7206` makes for the same reason.
const MARKER = "aofManaged";

// ── THE ROUTE DETECTOR ───────────────────────────────────────────────────────────────────────
//
// PURE — (rel, comment-stripped source) in, the routes to a settings write out. A pure function so
// the same detector that sweeps the real family can be driven against PLANTED sources: an absence
// claim over real code proves nothing until the thing making the claim is shown to have teeth.
export function settingsWriteRoutes(rel, code) {
  const problems = [];
  const has = (pattern) => new RegExp(pattern, "u").test(code);

  if (has("writeFileSync\\s*\\(")) problems.push(`${rel} names a synchronous file write`);
  else if (has("writeFile\\s*\\(")) problems.push(`${rel} names a file write`);
  if (has("claude-settings")) problems.push(`${rel} names the module that merges settings`);
  if (has("mergeClaudeSettings|spliceSettings")) problems.push(`${rel} calls the settings merge or its splice`);
  if (has("frozen-set")) problems.push(`${rel} names the module that declares the marker key`);
  // The process APIs are 59/FF-5904's list verbatim, and a BARE `exec` is deliberately not on it —
  // `RegExp.prototype.exec` is how the family reads its own recorded results, and a detector that
  // could not tell `LEADING_RESULT.exec(text)` from a child process would red `evidence.mjs` with a
  // message about hooks. Measured here on the first run of this control.
  if (has("node:child_process|(?<![.\\w])(?:execFile|execFileSync|execSync|spawnSync|fork)\\s*\\(")) {
    problems.push(`${rel} starts a child process`);
  }
  return problems;
}

async function familyModules() {
  const out = [];
  async function walk(dir, prefix) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const rel = `${prefix}/${entry.name}`;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full, rel);
      else if (entry.name.endsWith(".mjs")) out.push({ rel, code: stripComments(await readFile(full, "utf8")) });
    }
  }
  await walk(path.join(repoRoot, FAMILY_ROOT), FAMILY_ROOT);
  return out;
}

// ── FIXTURES ─────────────────────────────────────────────────────────────────────────────────

const settingsOf = (...groups) => ({
  hooks: groups.reduce((hooks, [event, matcher, entries]) => {
    hooks[event] ??= [];
    hooks[event].push({ matcher, hooks: entries });
    return hooks;
  }, {}),
});

const managed = (id, entry) => ({ type: "command", ...entry, [MARKER]: id });
const operator = (entry) => ({ type: "command", ...entry });

const ENQUEUE = { command: "node", args: ["${CLAUDE_PROJECT_DIR}/.claude/hooks/aof/artifact-sync-enqueue.mjs"] };
const GUARD = operator({ command: "node", args: ["${CLAUDE_PROJECT_DIR}/.claude/hooks/aof/guard-test-isolation.mjs"] });

const findingsFor = (settings, markerKey = MARKER) =>
  runHookWiring({ settings, markerKey, settingsPath: "/audited/.claude/settings.json" })
    .findings.filter((finding) => finding.code === "audit-hook-duplicated");

export const archTests = [
  {
    name: "acd-hook-rule-detects-never-writes: no module in the audit family writes a settings file, imports the merge, or imports the module declaring the marker",
    async run() {
      const modules = await familyModules();
      assert.equal(modules.length >= FAMILY_FLOOR, true, `the family was walked recursively and is non-vacuous: ${modules.length} module(s) under ${FAMILY_ROOT}, floor ${FAMILY_FLOOR}`);
      for (const module of modules) {
        assert.equal(module.code.length > 200, true, `${module.rel} was read and stripped to something real (${module.code.length} chars) — a stripper that ate the file would make every claim below vacuous`);
      }
      assert.equal(modules.some((module) => module.rel === "src/work-audit/hook-wiring.mjs"), true, "…and the module this story adds is among them");

      // BY IMPORT SHAPE: no static import in the family resolves to either module.
      for (const module of modules) {
        for (const { specifier } of importSpecifiers(module.code)) {
          assert.equal(/claude-settings|frozen-set/u.test(specifier), false, `${module.rel} imports \`${specifier}\` — the family reaches neither the merge nor the module that declares the marker`);
        }
      }

      // AND BY LITERAL, which is the half an import census misses: a path assembled at a call site.
      for (const module of modules) {
        const routes = settingsWriteRoutes(module.rel, module.code)
          .filter((problem) => !(module.rel === SPAWN_SEAM && problem.endsWith("starts a child process")));
        assert.deepEqual(routes, [], `${module.rel} holds no route to a settings write`);
      }
    },
  },
  {
    name: "acd-hook-rule-detects-never-writes: the route detector has teeth — every forbidden route is planted and reported, and clean source reports none",
    run() {
      const plants = [
        ['await writeFile(settingsPath, JSON.stringify(next));', "a file write naming a settings path"],
        ['writeFileSync(settingsPath, body);', "a synchronous file write naming a settings path"],
        ['import { isAofEntry } from "../claude-settings.mjs";', "an import of the module that merges settings"],
        ['const merged = mergeClaudeSettings(p, patch);', "a call to the settings merge"],
        ['const next = spliceSettings(current, patch);', "a call to its splice"],
        ['import { FROZEN_OWNERSHIP_MARKER } from "../frozen-set.mjs";', "an import of the module that declares the marker key"],
        ['import { execFile } from "node:child_process";', "a child process of any kind"],
      ];
      for (const [source, why] of plants) {
        const reported = settingsWriteRoutes("src/work-audit/planted.mjs", source);
        assert.equal(reported.length > 0, true, `${why}: the planted route is reported`);
        assert.equal(reported.every((problem) => problem.startsWith("src/work-audit/planted.mjs")), true, `${why}: …by the file that holds it`);
      }

      const clean = 'import { limitRecord, readRecord } from "./reads.mjs";\nexport function run() { return { findings: [] }; }';
      assert.deepEqual(settingsWriteRoutes("src/work-audit/clean.mjs", clean), [], "and with nothing planted no route is found");

      // …and the one shape that must NOT be read as a child process, because the family really does
      // use it: a regular expression consuming its own subject.
      assert.deepEqual(
        settingsWriteRoutes("src/work-audit/regex.mjs", "const match = LEADING_RESULT.exec(String(text));"),
        [],
        "a RegExp.prototype.exec call is not a child process — the false positive this detector was measured to have on its first run",
      );
    },
  },
  {
    name: "acd-hook-rule-detects-never-writes: the marker key is an INJECTED parameter — one object, two keys, two answers",
    run() {
      const pair = settingsOf(["PostToolUse", "Write|Edit", [managed("claude-artifact-sync", ENQUEUE), operator(ENQUEUE)]]);
      assert.equal(findingsFor(pair, MARKER).length, 1, "judged under the key the entries carry, the twin is found");
      assert.equal(findingsFor(pair, "aStructurallyDifferentMarker").length, 0, "judged under a key no entry carries, nothing is — which no import could produce");
    },
  },
  {
    name: "acd-hook-rule-detects-never-writes: equivalence is over the RESOLVED INVOCATION — a reformatted copy is reported, a differing args is not",
    run() {
      const pairWith = (twin) => settingsOf(["PostToolUse", "Write|Edit", [managed("claude-artifact-sync", ENQUEUE), operator(twin)]]);

      // The project-directory variable is left EXACTLY as written, and each token is put through the
      // merge's own portable-path rule.
      assert.deepEqual(
        resolvedInvocation(operator({ command: "node", args: ["${CLAUDE_PROJECT_DIR}\\a\\b.mjs"] })),
        ["node", "${CLAUDE_PROJECT_DIR}/a/b.mjs"],
        "the variable stays a token character for character, and separators are normalised",
      );

      assert.equal(findingsFor(pairWith({ args: ENQUEUE.args, command: ENQUEUE.command })).length, 1, "a copy differing only in KEY ORDER is still a copy — object identity would call it distinct and report nothing");
      assert.equal(findingsFor(pairWith({ ...ENQUEUE, timeout: 30 })).length, 1, "…as is one carrying an extra key that is neither command nor args");
      assert.equal(findingsFor(pairWith({ command: "node", args: ["${CLAUDE_PROJECT_DIR}\\.claude\\hooks\\aof\\artifact-sync-enqueue.mjs"] })).length, 1, "…and one spelling its path with backslashes");

      assert.equal(findingsFor(pairWith({ command: "node", args: [...ENQUEUE.args, "--verbose"] })).length, 0, "a DIFFERING args is a different rule");
      assert.equal(findingsFor(pairWith({ command: "node", args: ["/audited/.claude/hooks/aof/artifact-sync-enqueue.mjs"] })).length, 0, "…as is one spelling the project directory expanded, because nothing is expanded here");
    },
  },
  {
    name: "acd-hook-rule-detects-never-writes: the three refusals are planted and required GREEN, then driven back the other way",
    run() {
      const refusals = [
        [settingsOf(
          ["SessionStart", "", [managed("claude-session-start", { command: "aof session start" })]],
          ["PreToolUse", "Bash|PowerShell", [GUARD]],
        ), "the operator's unmanaged guard entry, which pairs with no managed entry — the escape hatch 55/ADR-004 preserved and 72/ADR-005 §3 refused to close"],
        [settingsOf(
          ["PostToolUse", "Write|Edit", [managed("claude-artifact-sync", ENQUEUE)]],
          ["PostToolUse", ".*", [operator(ENQUEUE)]],
        ), "an unmanaged entry equivalent to a managed one under a DIFFERENT matcher"],
        [settingsOf(
          ["PostToolUse", "Write|Edit", [managed("claude-artifact-sync", ENQUEUE)]],
          ["PreToolUse", "Write|Edit", [operator(ENQUEUE)]],
        ), "…and the same under a different EVENT"],
      ];
      for (const [settings, why] of refusals) {
        assert.deepEqual(findingsFor(settings), [], `${why}: the rule cannot claim it`);
      }

      // NOT VACUOUS: move the twin into the managed entry's own event and matcher and it appears.
      const paired = settingsOf(["PostToolUse", "Write|Edit", [managed("claude-artifact-sync", ENQUEUE), operator(ENQUEUE)]]);
      const found = findingsFor(paired);
      assert.equal(found.length, 1, "and where the event AND the matcher match, the pair IS reported");
      assert.equal(found[0].severity, "error", "…at error");
      assert.match(found[0].message, /matcher "Write\|Edit"/u, "…naming the matcher that is part of the pairing");

      // A managed pair is a merge defect, not an operator fact.
      assert.deepEqual(
        findingsFor(settingsOf(["PostToolUse", "Write|Edit", [managed("a", ENQUEUE), managed("b", ENQUEUE)]])),
        [],
        "and no marked/marked pair is reported — nothing an operator did produced it",
      );
    },
  },
  {
    name: "acd-hook-rule-detects-never-writes: the lane returns findings and never a settings object, and leaves the one it was handed untouched",
    run() {
      const object = settingsOf(["PostToolUse", "Write|Edit", [managed("claude-artifact-sync", ENQUEUE), operator(ENQUEUE)]]);
      const before = JSON.parse(JSON.stringify(object));
      const result = runHookWiring({ settings: object, markerKey: MARKER, settingsPath: "/audited/.claude/settings.json" });

      assert.deepEqual(object, before, "the injected object comes back exactly as it went in — nothing is adopted and nothing is disowned");
      assert.deepEqual(Object.keys(result).sort(), ["findings", "limits", "reads"], "the result is findings, reads and limits — no settings object for anyone to write");
      assert.equal(result.findings.length, 1, "and it did read the object it left alone");
    },
  },
];
