// Behavioural evidence for milestone 77 / story 01 — the hook wiring.
//
//   tasks/00_an-unmarked-twin-of-a-managed-hook-is-reported.feature
//   tasks/01_the-rule-refuses-to-claim-an-operators-hook-and-writes-nothing.feature
//
// The census rows of both features — no route to a settings write, no import of the merge, no
// import of the module declaring the marker — are the control's, and live in
// `acd-hook-rule-detects-never-writes.test.mjs`.
//
// EVERY FIXTURE IS A SETTINGS OBJECT, because that is what the lane is handed. This repository
// cannot produce the distinctions the refusals turn on — its own session entries all share the
// empty matcher, and it carries zero duplicate pairs since 72/03 deleted the three RESEARCH
// measured — so the refusals are written from the installed case and driven from fixtures. That is
// also what makes this a RATCHET rather than a repaired defect: the red is a twin PLANTED into a
// fixture.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { readFinding } from "../../../src/work-audit/reads.mjs";
import { HOOK_WIRING_SWEEPS, resolvedInvocation, runHookWiring } from "../../../src/work-audit/hook-wiring.mjs";

const MARKER = "aofManaged";
const SETTINGS_PATH = "/audited/project/.claude/settings.json";

// ── FIXTURES ─────────────────────────────────────────────────────────────────────────────────

// A settings object built from `[event, matcher, entries]` rows, in the shape the harness reads.
function settingsOf(...groups) {
  const hooks = {};
  for (const [event, matcher, entries] of groups) {
    hooks[event] ??= [];
    hooks[event].push({ matcher, hooks: entries });
  }
  return { hooks };
}

const managed = (id, entry) => ({ type: "command", ...entry, [MARKER]: id });
const operator = (entry) => ({ type: "command", ...entry });

const PING = { command: "aof session ping" };
const ENQUEUE = { command: "node", args: ["${CLAUDE_PROJECT_DIR}/.claude/hooks/aof/artifact-sync-enqueue.mjs"] };

// This repository's own unmanaged entry: the guard that stops an unisolated test run writing into
// the real global home. It pairs with no managed entry, and a rule that reported it would be
// arguing for the deletion two milestones have refused.
const GUARD = operator({ command: "node", args: ["${CLAUDE_PROJECT_DIR}/.claude/hooks/aof/guard-test-isolation.mjs"] });

const run = (settings, options = {}) => runHookWiring({ settings, markerKey: MARKER, settingsPath: SETTINGS_PATH, ...options });
const duplicated = (result) => result.findings.filter((finding) => finding.code === "audit-hook-duplicated");

// The pair every "reformatting" row varies: one managed entry and one unmarked twin of it, under
// one event and one matcher.
const pairOf = (twin) => settingsOf(["PostToolUse", "Write|Edit", [managed("claude-artifact-sync", ENQUEUE), operator(twin)]]);

// This repository as measured at HEAD: six entries, five marked and one unmarked, zero pairs.
const REPO_TODAY = settingsOf(
  ["SessionStart", "", [managed("claude-session-start", { command: "aof session start" })]],
  ["UserPromptSubmit", "", [managed("claude-session-prompt-ping", PING)]],
  ["SessionEnd", "", [managed("claude-session-end", { command: "aof session end" })]],
  ["PostToolUse", "Write|Edit|NotebookEdit", [managed("claude-artifact-sync", ENQUEUE)]],
  ["PostToolUse", ".*", [managed("claude-run-heartbeat", { command: "node", args: ["${CLAUDE_PROJECT_DIR}/.claude/hooks/aof/run-heartbeat-enqueue.mjs"] })]],
  ["PreToolUse", "Bash|PowerShell", [GUARD]],
);

export const hookWiringTests = [
  // ── TASK 00 — THE TWIN IS REPORTED ─────────────────────────────────────────────────────────
  {
    name: "hook-wiring: an unmarked twin under one event and one matcher is reported",
    run() {
      const result = run(pairOf(ENQUEUE));
      const found = duplicated(result);
      assert.equal(found.length, 1, "one audit-hook-duplicated finding is returned");
      assert.equal(found[0].severity, "error", "…at error");
      assert.match(found[0].message, /^PostToolUse /u, "the finding names the event");
      assert.match(found[0].message, /matcher "Write\|Edit"/u, "…the matcher");
      assert.match(found[0].message, /node \$\{CLAUDE_PROJECT_DIR\}\/\.claude\/hooks\/aof\/artifact-sync-enqueue\.mjs/u, "…and the resolved command the two share");
      assert.equal(result.findings.length, 1, "and it returns no other finding");
    },
  },
  {
    name: "hook-wiring: one pair is one finding, not one per entry",
    run() {
      const found = duplicated(run(pairOf(ENQUEUE)));
      assert.equal(found.length, 1, "exactly one finding is returned for exactly one pair");

      // The converse: two marked entries and one unmarked twin is still ONE pair by command, so the
      // number the debt register is waiting on is not doubled from the other entry's side.
      const twoManaged = settingsOf(["PostToolUse", "Write|Edit", [
        managed("claude-artifact-sync", ENQUEUE),
        managed("claude-artifact-sync-again", ENQUEUE),
        operator(ENQUEUE),
      ]]);
      assert.equal(duplicated(run(twoManaged)).length, 1, "no second finding names the same event, matcher and command from the other entry's side");
    },
  },
  {
    name: "hook-wiring: the matcher a finding names is the matcher as written, empty or not",
    run() {
      const empty = settingsOf(["UserPromptSubmit", "", [managed("claude-session-prompt-ping", PING), operator(PING)]]);
      const found = duplicated(run(empty));
      assert.equal(found.length, 1, "a pair under the empty matcher is reported");
      assert.match(found[0].message, /the empty matcher/u, "the finding names that matcher as the empty one rather than leaving it unsaid");
      assert.match(found[0].message, /^UserPromptSubmit /u, "and the finding still names the event");
      assert.match(found[0].message, /aof session ping/u, "…and the resolved command");
    },
  },
  {
    name: "hook-wiring: a reformatted copy is still a copy, and a different invocation is a different rule",
    run() {
      const copies = [
        [ENQUEUE, "identical in every key and every value"],
        [{ args: ENQUEUE.args, command: ENQUEUE.command }, "differing only in the order of their keys"],
        [{ ...ENQUEUE, timeout: 30 }, "an extra key that is neither command nor args"],
        [{ command: "node", args: ["${CLAUDE_PROJECT_DIR}\\.claude\\hooks\\aof\\artifact-sync-enqueue.mjs"] }, "one argument path spelled with backslashes"],
        [{ command: "node", args: ["./${CLAUDE_PROJECT_DIR}/.claude/hooks/aof/artifact-sync-enqueue.mjs"] }, "one argument path spelled with a leading dot-slash"],
      ];
      for (const [twin, why] of copies) {
        assert.equal(duplicated(run(pairOf(twin))).length, 1, `${why}: one process fired twice, so it is one finding`);
      }

      const distinct = [
        [{ command: "python", args: ENQUEUE.args }, "a different program"],
        [{ command: "node", args: ["${CLAUDE_PROJECT_DIR}/.claude/hooks/aof/run-heartbeat-enqueue.mjs"] }, "a different script argument"],
        [{ command: "node", args: [...ENQUEUE.args, "--verbose"] }, "the same arguments and one more"],
        [{ command: "node" }, "no arguments at all"],
        [{ command: "node", args: ["/audited/project/.claude/hooks/aof/artifact-sync-enqueue.mjs"] }, "the project directory spelled expanded"],
      ];
      for (const [twin, why] of distinct) {
        assert.equal(duplicated(run(pairOf(twin))).length, 0, `${why}: two rules that happen to run one program`);
      }
    },
  },
  {
    name: "hook-wiring: the marker key is injected, so one object gives two answers",
    run() {
      const object = pairOf(ENQUEUE);
      assert.equal(duplicated(run(object)).length, 1, "judged under the key the pair uses, the twin is found");
      assert.equal(duplicated(runHookWiring({ settings: object, markerKey: "someOtherMarker", settingsPath: SETTINGS_PATH })).length, 0, "judged under a key no entry carries, nothing is");
    },
  },
  {
    name: "hook-wiring: no marker key of the lane's own decides the answer",
    run() {
      const object = pairOf(ENQUEUE);
      const first = runHookWiring({ settings: object, markerKey: MARKER, settingsPath: SETTINGS_PATH });
      const second = runHookWiring({ settings: object, markerKey: "notAKeyAnyEntryCarries", settingsPath: SETTINGS_PATH });
      assert.equal(duplicated(first).length, 1, "the first run returns a finding");
      assert.deepEqual(duplicated(second), [], "and the second returns none");
    },
  },
  {
    name: "hook-wiring: a settings object with no duplicate pair is clean, which is this repository today",
    run() {
      const result = run(REPO_TODAY);
      assert.deepEqual(duplicated(result), [], "no audit-hook-duplicated finding is returned");
      assert.equal(result.reads[0].count, 6, "and it reports having swept all six entries");
    },
  },
  {
    name: "hook-wiring: the lane says what it swept, so found-nothing is never mistaken for looked-at-nothing",
    run() {
      const rows = [
        [REPO_TODAY, 6, "six"],
        [settingsOf(["SessionStart", "", [managed("claude-session-start", { command: "aof session start" })]]), 1, "one"],
        [settingsOf(), 0, "none"],
      ];
      for (const [settings, count, why] of rows) {
        const { reads } = run(settings);
        assert.equal(reads.length, 1, `${why}: the lane returns its read record`);
        assert.match(reads[0].what, /hook entr/u, "the read record names the hook entries as its population");
        assert.equal(Number.isFinite(reads[0].floor) && reads[0].floor > 0, true, "the record declares a floor greater than zero");
        assert.equal(reads[0].count, count, `${why}: the count it reports is ${count}`);
      }
    },
  },
  {
    name: "hook-wiring: an object carrying no hook entry at all reports a count below its own floor",
    run() {
      const { reads } = run({ hooks: {} });
      assert.equal(reads[0].count < reads[0].floor, true, "the count it reports is below the floor it declares");
      const shortfall = readFinding(reads[0]);
      assert.notEqual(shortfall, null, "…and the shared floor rule turns that into a shortfall");
      assert.equal(shortfall.code, "audit-ran-on-nothing", "it does not report clean over a population it never had");
    },
  },

  // ── TASK 01 — THE REFUSALS, AND THE WRITES THAT DO NOT HAPPEN ──────────────────────────────
  {
    name: "hook-wiring: the entries the lane must not claim, each planted and each required clean",
    run() {
      const rows = [
        [REPO_TODAY, "guard-test-isolation", "the operator's unmarked pre-tool guard entry, under its own matcher, pairing with no marked entry"],
        [settingsOf(["PostToolUse", "Write|Edit", [managed("claude-artifact-sync", ENQUEUE)]], ["PostToolUse", ".*", [operator(ENQUEUE)]]), "artifact-sync-enqueue", "an unmarked entry equivalent to a marked one in the same event but under a different matcher"],
        [settingsOf(["PostToolUse", "Write|Edit", [managed("claude-artifact-sync", ENQUEUE)]], ["PreToolUse", "Write|Edit", [operator(ENQUEUE)]]), "artifact-sync-enqueue", "an unmarked entry equivalent to a marked one under the same matcher but in a different event"],
        [settingsOf(["PostToolUse", "Write|Edit", [managed("claude-artifact-sync", ENQUEUE), managed("claude-artifact-sync-twin", ENQUEUE)]]), "artifact-sync-enqueue", "two marked entries equivalent to each other under one event and one matcher"],
      ];
      for (const [settings, named, why] of rows) {
        const result = run(settings);
        assert.deepEqual(duplicated(result), [], `${why}: no audit-hook-duplicated finding`);
        assert.equal(result.findings.some((finding) => finding.message.includes(named)), false, `${why}: it names that entry in no finding of any kind`);
        assert.deepEqual(result.findings, [], `${why}: the lane's result is clean`);
      }
    },
  },
  {
    name: "hook-wiring: the same fixtures, driven the other way, so the refusals are not vacuous",
    run() {
      // A table of things that must not happen passes just as happily when nothing is wired at all.
      const rows = [
        [settingsOf(["PostToolUse", "Write|Edit", [managed("claude-artifact-sync", ENQUEUE), operator(ENQUEUE)]]), "Write|Edit", "the unmarked entry that sat under a different matcher, moved under the marked entry's own"],
        [settingsOf(["PostToolUse", "Write|Edit", [managed("claude-artifact-sync", ENQUEUE)]], ["PostToolUse", "Write|Edit", [operator(ENQUEUE)]]), "Write|Edit", "the unmarked entry that sat in a different event, moved into the marked entry's own"],
      ];
      for (const [settings, matcher, why] of rows) {
        const found = duplicated(run(settings));
        assert.equal(found.length, 1, `${why}: one finding is returned`);
        assert.match(found[0].message, /^PostToolUse /u, "it names that event");
        assert.equal(found[0].message.includes(`matcher ${JSON.stringify(matcher)}`), true, "…that matcher");
        assert.match(found[0].message, /artifact-sync-enqueue\.mjs/u, "…and the resolved command");
      }
    },
  },
  {
    name: "hook-wiring: a marked entry planted beside the operator's guard does not implicate it",
    run() {
      const planted = settingsOf(
        ["PreToolUse", "Bash|PowerShell", [GUARD, managed("claude-something-else", { command: "aof session ping" })]],
      );
      const result = run(planted);
      assert.deepEqual(duplicated(result), [], "no audit-hook-duplicated finding is returned");
      assert.equal(result.findings.some((finding) => finding.message.includes("guard-test-isolation")), false, "and the guard entry is reported in nothing");
    },
  },
  {
    name: "hook-wiring: the injected settings object comes back exactly as it went in",
    run() {
      const object = pairOf(ENQUEUE);
      const before = JSON.parse(JSON.stringify(object));
      const keyOrderBefore = object.hooks.PostToolUse[0].hooks.map((entry) => Object.keys(entry).join(","));

      const found = duplicated(run(object));
      assert.deepEqual(object, before, "the object is deep-equal to the record taken before the run");
      assert.deepEqual(object.hooks.PostToolUse[0].hooks.map((entry) => Object.keys(entry).join(",")), keyOrderBefore, "every entry's keys are in the order they were in before the run");
      assert.equal(found.length, 1, "and the run still returned the finding for that pair, so it read the object it left alone");
    },
  },
  {
    name: "hook-wiring: nothing is adopted and nothing is disowned",
    run() {
      const object = settingsOf(
        ["PostToolUse", "Write|Edit", [managed("claude-artifact-sync", ENQUEUE), operator(ENQUEUE)]],
        ["PreToolUse", "Bash|PowerShell", [GUARD]],
        ["SessionStart", "", [managed("claude-session-start", { command: "aof session start" })]],
      );
      const snapshot = JSON.parse(JSON.stringify(object));
      assert.equal(duplicated(run(object)).length, 1, "the pair is found");

      const walk = (settings) => settings.hooks && Object.values(settings.hooks).flat().flatMap((group) => group.hooks);
      const after = walk(object);
      const before = walk(snapshot);
      for (const [index, entry] of after.entries()) {
        assert.equal(Object.hasOwn(entry, MARKER), Object.hasOwn(before[index], MARKER), "every entry that carried the marker key still carries it, and every entry that lacked it still lacks it");
        assert.equal(entry[MARKER], before[index][MARKER], "…with the value it had");
        assert.deepEqual(resolvedInvocation(entry), resolvedInvocation(before[index]), "and no entry gained, lost or changed a command or an argument");
      }
    },
  },
  {
    name: "hook-wiring: the lane leaves no trace on disk",
    run() {
      const root = mkdtempSync(path.join(os.tmpdir(), "aof-hooks-"));
      try {
        const file = path.join(root, "settings.json");
        writeFileSync(file, JSON.stringify(pairOf(ENQUEUE), null, 2));
        const bytes = readFileSync(file);
        const mtime = statSync(file).mtimeMs;
        const before = readdirSync(root);

        const found = duplicated(runHookWiring({ settings: JSON.parse(readFileSync(file, "utf8")), markerKey: MARKER, settingsPath: file }));
        assert.equal(found.length, 1, "the lane ran and found the pair");
        assert.deepEqual(readFileSync(file), bytes, "the file's bytes are unchanged");
        assert.equal(statSync(file).mtimeMs, mtime, "its modification time is unchanged");
        assert.deepEqual(readdirSync(root), before, "and no file is created beside it");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "hook-wiring: two runs over one object give one answer, and neither writes",
    run() {
      const root = mkdtempSync(path.join(os.tmpdir(), "aof-hooks2-"));
      try {
        const file = path.join(root, "settings.json");
        const object = pairOf(ENQUEUE);
        writeFileSync(file, JSON.stringify(object, null, 2));
        const bytes = readFileSync(file);

        const first = runHookWiring({ settings: object, markerKey: MARKER, settingsPath: file });
        const between = runHookWiring({ settings: REPO_TODAY, markerKey: MARKER, settingsPath: file });
        const third = runHookWiring({ settings: object, markerKey: MARKER, settingsPath: file });

        assert.deepEqual(third.findings, first.findings, "the two results carry the same findings");
        assert.deepEqual(third.reads, first.reads, "…the same read record");
        assert.deepEqual(third.limits, first.limits, "…and the same limits");
        assert.deepEqual(duplicated(between), [], "a run over a second object carrying no duplicate pair, made between the two, returns no finding");
        assert.equal(duplicated(third).length, 1, "and the third run over the first object returns that same finding again");
        assert.deepEqual(readFileSync(file), bytes, "no settings file was written by either run");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "hook-wiring: the lane reaches no merge and proposes no repair",
    run() {
      const result = run(pairOf(ENQUEUE));
      const found = duplicated(result);
      assert.equal(found.length, 1, "the finding it returns says which pair was found");
      assert.match(found[0].message, /artifact-sync-enqueue\.mjs/u, "…by naming the invocation the two share");

      for (const verb of ["delete", "collapse", "adopt", "suppress"]) {
        assert.equal(new RegExp(`\\b${verb}`, "iu").test(found[0].message), false, `it carries no instruction to ${verb} an entry`);
      }

      // No result the lane returns is a settings object to be written.
      assert.deepEqual(Object.keys(result).sort(), ["findings", "limits", "reads"], "the result carries findings, reads and limits and nothing else");
      for (const finding of result.findings) {
        assert.deepEqual(Object.keys(finding).sort(), ["code", "message", "path", "severity"], "and a finding is a finding, never a patch");
      }
    },
  },
  {
    name: "hook-wiring: the lane states what it could not see, on a clean run and on a dirty one",
    run() {
      for (const [why, settings, expected] of [["clean", REPO_TODAY, 0], ["dirty", pairOf(ENQUEUE), 1]]) {
        const result = run(settings);
        assert.equal(duplicated(result).length, expected, `the ${why} run found what it should`);
        assert.equal(result.limits.length, HOOK_WIRING_SWEEPS.length, `the ${why} run returns a limit for each sweep`);
        for (const limit of result.limits) {
          assert.equal(typeof limit.question === "string" && limit.question.length > 0, true, "the limit carries a non-empty question");
          assert.equal(typeof limit.consequence === "string" && limit.consequence.length > 0, true, "…and a non-empty consequence");
        }
        assert.match(result.limits.map((limit) => limit.consequence).join(" "), /REPORTS ONLY/u, "…and it says the merge that produces these pairs is unchanged");
      }
    },
  },
];
