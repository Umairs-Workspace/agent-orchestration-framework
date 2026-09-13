// Fitness function: acd-managed-hook-not-duplicated (milestone 72 / story 03, FF-7206;
// ADR-005 §3, §4).
//
//   "aof recognises its own, and ONLY its own."
//
// Three events in this repository's settings each carried TWO command-equivalent blocks — one
// written by hand, one aof manages — so `aof session ping` shelled twice on every prompt an
// operator typed. Each of those is a cold process, and the second one buys nothing.
//
// ── THE TEMPTING FIX IS THE MERGE, AND IT IS WRONG ───────────────────────────────────────────
//
// `spliceSettings` carries through every entry it cannot prove is its own, and that is the
// 55/ADR-004 escape hatch protecting an operator's hooks from a framework that would otherwise
// quietly delete them. In THIS very file it is what protects the test-isolation guard — which aof
// does not manage, and which exists because unisolated test runs corrupt the real global home. A
// merge that deleted unmarked entries would have deleted that one.
//
// So this is REPOSITORY HYGIENE held by a REPOSITORY control, and the merge is not touched. It does
// not travel: `.claude/settings.json` is a tracked file of this repo, and the rule is true of an
// operator's DELIBERATE hook and false only of an accidental copy.
//
// ── THE CONVERSE MATTERS AS MUCH AS THE CLAIM, AND IS DRIVEN ─────────────────────────────────
//
// A genuinely distinct unmanaged entry must be ADMITTED. A control that reds on an operator's own
// hook is arguing for the framework change this milestone refuses, and it would be found only by
// whoever it broke. So the guard entry is planted-and-required-green, twice: once as it stands, and
// once with a managed entry planted in its own event and matcher.
//
// ── AND THIS CONTROL DOES NOT REACH THE MERGE ────────────────────────────────────────────────
//
// It imports NOTHING from `src/claude-settings.mjs` — asserted over its own source — and it reads
// the settings file without writing it. The marker key is therefore spelled locally, which is a
// second spelling and is the deliberate price of the isolation: a control that imported the module
// it is meant not to reach would be asserting its own independence through a dependency.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stripComments } from "../../support/source-slice.mjs";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const selfPath = fileURLToPath(import.meta.url);
const settingsPath = path.join(repoRoot, ".claude", "settings.json");

// Spelled here rather than imported — see the header. The module that owns it is the one this
// control asserts it does not reach.
const MARKER = "aofManaged";
const MERGE_MODULE = "claude-settings.mjs";

// ── THE RESOLVED INVOCATION ──────────────────────────────────────────────────────────────────
//
// The command PLUS its arguments, written either as one command string or as a command and an args
// list, with the project-directory variable left EXACTLY as written. Both spellings resolve to the
// same token vector, because two blocks that differ only in which of them they use are still the
// same process fired twice. Object identity would call them distinct and pass.

// A command string as a shell would split it, honouring double quotes so a quoted path carrying a
// space stays one token. Nothing is expanded: `${CLAUDE_PROJECT_DIR}` is a token character-for-
// character, which is why an entry spelling the variable and one spelling its expansion are
// correctly DISTINCT.
export function tokenise(commandString) {
  const tokens = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/gu;
  for (const match of String(commandString).matchAll(pattern)) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }
  return tokens;
}

export function resolvedInvocation(entry) {
  const command = typeof entry?.command === "string" ? tokenise(entry.command) : [];
  const args = Array.isArray(entry?.args) ? entry.args.map((arg) => String(arg)) : [];
  return [...command, ...args];
}

export const sameInvocation = (a, b) => JSON.stringify(resolvedInvocation(a)) === JSON.stringify(resolvedInvocation(b));

// ── THE CENSUS ───────────────────────────────────────────────────────────────────────────────

// Every entry in the file, carrying the event and matcher it fires under. The matcher is PART of
// the pairing, not context around it: where aof manages an entry whose command matches an
// operator's hand-authored one under a DIFFERENT matcher, the two are different rules that happen
// to run the same program, and reddening on the operator's is exactly what ADR-005 §3 refuses.
export function settingsEntries(settings) {
  const rows = [];
  for (const [event, groups] of Object.entries(settings?.hooks ?? {})) {
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
      const matcher = typeof group?.matcher === "string" ? group.matcher : "";
      for (const entry of Array.isArray(group?.hooks) ? group.hooks : []) {
        rows.push({ event, matcher, entry, managed: entry?.[MARKER] ?? null });
      }
    }
  }
  return rows;
}

// PURE — the settings document in, the unmanaged entries that duplicate a managed one out.
export function duplicateProblems(settings) {
  const rows = settingsEntries(settings);
  const problems = [];
  for (const unmanaged of rows.filter((row) => row.managed == null)) {
    for (const managed of rows.filter((row) => row.managed != null)) {
      if (managed.event !== unmanaged.event || managed.matcher !== unmanaged.matcher) continue;
      if (!sameInvocation(managed.entry, unmanaged.entry)) continue;
      problems.push(`${unmanaged.event} (matcher ${JSON.stringify(unmanaged.matcher)}): an unmanaged entry resolves to the same invocation as the managed \`${managed.managed}\` — ${JSON.stringify(resolvedInvocation(unmanaged.entry).join(" "))}. It is the HAND-AUTHORED block that goes: delete the marked one instead and the next \`aof work update\` restores it beside the survivor, and the duplication is back.`);
    }
  }
  return problems;
}

const readSettings = async () => JSON.parse(await readFile(settingsPath, "utf8"));

// The operator's own hook, which this control exists to ADMIT. Named by what it invokes rather than
// by position, so a reformat does not turn the converse row into a false green.
const GUARD_SCRIPT = "guard-test-isolation.mjs";

const SESSION_EVENTS = Object.freeze([
  { event: "SessionStart", invocation: "aof session start", marker: "claude-session-start" },
  { event: "UserPromptSubmit", invocation: "aof session ping", marker: "claude-session-prompt-ping" },
  { event: "SessionEnd", invocation: "aof session end", marker: "claude-session-end" },
]);

export const archTests = [
  {
    name: "arch/72 FF-7206 (acd-managed-hook-not-duplicated): no unmanaged entry in this repo's settings duplicates a managed one, and a planted duplicate reds",
    async run() {
      const settings = await readSettings();
      const rows = settingsEntries(settings);
      assert.ok(rows.length >= 6, `the settings file was actually read (non-vacuous): ${rows.length} entries`);
      assert.ok(rows.some((row) => row.managed != null), "…and it carries managed entries, so the pairing has both sides");
      assert.ok(rows.some((row) => row.managed == null), "…and unmanaged ones, so the claim is not vacuously true");

      const problems = duplicateProblems(settings);
      assert.deepEqual(problems, [], `no hand-authored entry duplicates one aof manages:\n  ${problems.join("\n  ")}`);

      // A PLANTED DUPLICATE REDS — the hand-authored block restored beside the managed one, which
      // is exactly the state this story removed and exactly what the next accidental copy looks
      // like.
      const planted = JSON.parse(JSON.stringify(settings));
      planted.hooks.SessionStart.push({ matcher: "", hooks: [{ type: "command", command: "aof session start" }] });
      const caught = duplicateProblems(planted);
      assert.equal(caught.length, 1, "a planted hand-authored duplicate is caught");
      assert.ok(caught[0].includes("SessionStart"), `…naming the event: ${caught[0]}`);
      assert.ok(caught[0].includes("aof session start"), `…and the invocation the two share: ${caught[0]}`);
    },
  },

  {
    name: "arch/72 FF-7206 (acd-managed-hook-not-duplicated): what counts as the same invocation, and what the control must admit as distinct",
    async run() {
      const managed = { type: "command", command: "node", args: ["${CLAUDE_PROJECT_DIR}/hooks/x.mjs"], [MARKER]: "m" };

      // EQUIVALENT — five spellings of one invocation, each of them still a copy.
      const equivalent = [
        { label: "identical in every character", entry: { type: "command", command: "node", args: ["${CLAUDE_PROJECT_DIR}/hooks/x.mjs"] } },
        { label: "differing only in the order of their keys", entry: { args: ["${CLAUDE_PROJECT_DIR}/hooks/x.mjs"], command: "node", type: "command" } },
        { label: "differing only in whitespace and indentation", entry: JSON.parse('{\n\t"command"  :  "node",\n        "args": [ "${CLAUDE_PROJECT_DIR}/hooks/x.mjs" ]\n}') },
        { label: "one spelling the command alone, the other command plus args", entry: { type: "command", command: 'node "${CLAUDE_PROJECT_DIR}/hooks/x.mjs"' } },
        { label: "differing only in a key that is neither command nor args", entry: { type: "shell", timeout: 30, command: "node", args: ["${CLAUDE_PROJECT_DIR}/hooks/x.mjs"] } },
      ];
      for (const row of equivalent) {
        assert.equal(sameInvocation(managed, row.entry), true, `${row.label}: the same invocation`);
      }

      // DISTINCT — entries the control must ADMIT.
      const distinct = [
        { label: "naming a different program", entry: { command: "python", args: ["${CLAUDE_PROJECT_DIR}/hooks/x.mjs"] } },
        { label: "naming the same program with a different script argument", entry: { command: "node", args: ["${CLAUDE_PROJECT_DIR}/hooks/y.mjs"] } },
        { label: "one spelling the project-dir variable, the other its expansion", entry: { command: "node", args: ["/home/me/repo/hooks/x.mjs"] } },
      ];
      for (const row of distinct) {
        assert.equal(sameInvocation(managed, row.entry), false, `${row.label}: a different invocation`);
      }

      // The remaining two distinctions are PAIRING, not resolution: the same invocation under a
      // different matcher, or a different event, is a different rule that happens to run the same
      // program — and reddening on it is precisely what ADR-005 §3 refuses.
      const copy = { type: "command", command: "node", args: ["${CLAUDE_PROJECT_DIR}/hooks/x.mjs"] };
      const byMatcher = { hooks: { PostToolUse: [
        { matcher: "Write", hooks: [managed] },
        { matcher: "Edit", hooks: [copy] },
      ] } };
      assert.deepEqual(duplicateProblems(byMatcher), [], "fired under a different matcher within the same event: distinct");
      const byEvent = { hooks: {
        PostToolUse: [{ matcher: "", hooks: [managed] }],
        PreToolUse: [{ matcher: "", hooks: [copy] }],
      } };
      assert.deepEqual(duplicateProblems(byEvent), [], "fired by a different event: distinct");

      // …and the same pair under ONE event and matcher is caught, so the two rows above are
      // admitting for the right reason rather than because nothing is ever caught.
      const sameKey = { hooks: { PostToolUse: [{ matcher: "Write", hooks: [managed, copy] }] } };
      assert.equal(duplicateProblems(sameKey).length, 1, "…and under one event AND matcher, the same pair IS a duplicate");
    },
  },

  {
    name: "arch/72 FF-7206 (acd-managed-hook-not-duplicated): the operator's own guard is admitted, still present character for character, and a managed neighbour does not implicate it",
    async run() {
      const text = await readFile(settingsPath, "utf8");
      const settings = JSON.parse(text);
      const rows = settingsEntries(settings);

      const guard = rows.find((row) => row.managed == null && JSON.stringify(resolvedInvocation(row.entry)).includes(GUARD_SCRIPT));
      assert.ok(guard != null, `the file carries an UNMANAGED entry invoking ${GUARD_SCRIPT} — the hook aof does not manage, and the reason the merge's escape hatch exists`);
      assert.equal(guard.event, "PreToolUse", "…under its own event");
      assert.ok(guard.matcher.length > 0, `…and its own matcher (${JSON.stringify(guard.matcher)}), which is part of the pairing`);
      assert.equal(rows.some((row) => row.managed != null && row.event === guard.event && row.matcher === guard.matcher && sameInvocation(row.entry, guard.entry)), false, "no managed entry resolves to that invocation");

      const problems = duplicateProblems(settings);
      assert.deepEqual(problems, [], "the control passes with the operator's guard in place");
      assert.equal(problems.some((problem) => problem.includes(GUARD_SCRIPT)), false, "…and reports no finding against that entry");
      // Character for character means as the FILE spells it: the guard quotes its script path, so
      // the tracked bytes carry the JSON-escaped form and a comparison against the parsed value
      // would be looking for a string the file does not contain.
      assert.ok(text.includes(JSON.stringify(guard.entry.command)), "…and the entry is still present, character for character");

      // A MANAGED ENTRY IN THE GUARD'S OWN EVENT AND MATCHER, invoking a different script, does not
      // implicate it. This is the row that would fail if the pairing compared programs rather than
      // whole invocations.
      const planted = JSON.parse(text);
      planted.hooks.PreToolUse.push({ matcher: guard.matcher, hooks: [{ type: "command", command: "node", args: ["${CLAUDE_PROJECT_DIR}/.claude/hooks/aof/something-else.mjs"], [MARKER]: "planted-neighbour" }] });
      const withNeighbour = duplicateProblems(planted);
      assert.deepEqual(withNeighbour, [], `a managed entry beside the guard does not implicate it:\n  ${withNeighbour.join("\n  ")}`);
      assert.ok(settingsEntries(planted).some((row) => row.managed == null && JSON.stringify(resolvedInvocation(row.entry)).includes(GUARD_SCRIPT)), "…and the guard is still admitted");
    },
  },

  {
    name: "arch/72 FF-7206 (acd-managed-hook-not-duplicated): one session entry per event, the survivor is the one aof manages, and this control does not reach the merge",
    async run() {
      const settings = await readSettings();
      const rows = settingsEntries(settings);

      for (const row of SESSION_EVENTS) {
        const matching = rows.filter((entry) => entry.event === row.event && resolvedInvocation(entry.entry).join(" ") === row.invocation);
        assert.equal(matching.length, 1, `exactly one ${row.event} entry invokes \`${row.invocation}\` — it fired twice on every prompt before this story`);
        assert.equal(matching[0].managed, row.marker, `…and the survivor is the one aof manages (\`${row.marker}\`): deleting the marked one instead would let the next \`aof work update\` restore it beside the survivor`);
      }

      // THE CONTROL DOES NOT REACH THE MERGE. Asserted over its own source, because a control that
      // imported the module it is meant not to reach would be asserting its own independence
      // through a dependency.
      const own = stripComments(await readFile(selfPath, "utf8"));
      assert.equal(new RegExp(`from\\s+["'][^"']*${MERGE_MODULE}["']`, "u").test(own), false, `this control imports nothing from ${MERGE_MODULE}`);
      assert.equal(/\bapplyClaudeSettingsMerge\b|\bspliceSettings\b/u.test(own), false, "…and names none of its merge entry points");
      assert.equal(/\bwriteFile\b|\bwriteFileSync\b/u.test(own), false, "…and it reads the settings file without writing it");
      assert.ok(/readFile\s*\(\s*settingsPath/u.test(own), "…which it does read, so the claim above is about a control that has a subject");
    },
  },
];
