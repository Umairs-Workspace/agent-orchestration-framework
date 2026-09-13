// Traceability wiring for milestone 63 / story 05 — the trigger's face.
//
// One test object per @executable scenario across the five task features (Scenario-Outline rows
// folded into one entry), each name tracing to feature + scenario, exercising the REAL registered
// command against temp fixture repos and planted declarations:
//
//   00_the-face-resolves-and-launches-nothing        — byte-level read proof from the OUTSIDE,
//        run twice, no config move, nothing started or scheduled, the option surface
//   01_the-resolution-is-a-loop-input-and-its-argv   — the loop's own route + input, the argv as
//        tokens, one object under two renderings, four sources one shape, narrowing, signals
//   02_the-gate-facts-are-obtained-through-the-registry — the two readings through `invoke`, the
//        unavailabilities told apart, no fallback verdict, one reading set per run
//   03_a-refusal-is-reported-and-exits-clean         — every outcome by code, the two-sided exit
//        rule, the resolved/refused accounting, stable codes
//   04_the-shipped-declaration-actually-resolves     — this repository's own `.aof/triggers.jsonc`
//        resolving something, and a gap named rather than counted
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, readdir, readFile, writeFile, cp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { spawnCliSync } from "../support/cli-spawn.mjs";
import { cleanL3Gate } from "../support/l3-gate-fixture.mjs";
import { getCommand, invoke, listCommands } from "../../src/command-core.mjs";
import { loadWorkspace } from "../../src/work.mjs";
import { buildTriggerReport, triggerCommand, RESOLVED_TRIGGER_KEYS, LOOP_INPUT_KEYS as LOOP_INPUT_KEYS_UNDER_TEST } from "../../src/commands/trigger.mjs";
import { TRIGGER_SOURCES, compileTriggerDeclaration } from "../../src/work-trigger/declaration.mjs";
import { resolveTriggerLevel } from "../../src/work-trigger/level.mjs";
import { LOOP_LEVELS, LOOP_REFUSALS, decideLoopScope } from "../../src/work/loop.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "bin", "aof.mjs");
const BUNDLED_DECLARATION = path.join(repoRoot, "src", "bundle", "triggers.jsonc");

const LOOP_ID = "work:loop";
const DOCTOR_ID = "work:doctor";
const GROUNDEDNESS_ID = "work:loops-groundedness";

// --- fixtures ---------------------------------------------------------------

const member = (over = {}) => ({
  id: "cron-wake",
  protects: "an open driver from stalling unattended",
  source: "cron",
  scope: "63",
  level: "L1",
  ...over,
});

const declarationOf = (members) => ({ version: 1, members });

// One member per declared source, so a run over it exercises the four-sources-one-shape claim
// and the per-source accounting at once.
const everySource = () => [
  member({ id: "cron-wake", source: "cron" }),
  member({ id: "mesh-wake", source: "mesh-assignment" }),
  member({ id: "ci-wake", source: "ci-signal" }),
  member({ id: "finding-wake", source: "feedback-finding" }),
];

// The registry, RECORDED. `resolveCommand` is a lookup and `invoke` is a call, and the difference
// is the whole "it launches nothing" proof: the face looks `work:loop` up for its route and never
// invokes it, so no probe is entered and no launcher is reached.
function recordingRegistry({ answers = {}, unregistered = [] } = {}) {
  const looked = [];
  const invoked = [];
  return {
    looked,
    invoked,
    resolveCommand(id) {
      looked.push(id);
      if (unregistered.includes(id)) return undefined;
      return id === LOOP_ID ? getCommand(LOOP_ID) : { id };
    },
    async invoke(id, input) {
      invoked.push({ id, input });
      if (!Object.prototype.hasOwnProperty.call(answers, id)) {
        throw new Error(`the recording registry was asked for ${id} and has no answer`);
      }
      const answer = answers[id];
      if (typeof answer === "function") return answer();
      return answer;
    },
  };
}

const passingGate = () => ({
  [DOCTOR_ID]: { findings: [], loopReady: cleanL3Gate().loopReady },
  [GROUNDEDNESS_ID]: cleanL3Gate().groundedness,
});

const failingGate = () => ({
  [DOCTOR_ID]: { findings: [], loopReady: { score: 40, clears: "L2", blocking: ["anchors"], checks: [] } },
  [GROUNDEDNESS_ID]: { present: false, state: "absent", components: [], authorities: [], error: null },
});

// A doctor that ANSWERED and carried no reading — the case that must not be told as "you did not
// give me the readings", and must not be told as a gate that passed either.
const unreadableGate = () => ({
  [DOCTOR_ID]: { findings: [] },
  [GROUNDEDNESS_ID]: cleanL3Gate().groundedness,
});

const workspaceFor = (root) => ({
  projectRoot: root,
  workDir: path.join(root, "wiki", "work"),
  aofDir: path.join(root, ".aof"),
  config: {},
});

const PLANTED_ROOT = path.join(os.tmpdir(), "aof-trigger-planted");

async function run(input, deps = {}, root = PLANTED_ROOT) {
  return await buildTriggerReport(input, { workspace: workspaceFor(root), trigger: deps });
}

// A run over a planted declaration with a registry that answers nothing, for the paths that never
// reach the gate at all.
const silentRegistry = () => recordingRegistry({ answers: {} });

// --- a real workspace on disk, for the proofs that must be taken from the outside -------------

async function makeRepo({ members = everySource(), withGitIgnored = true } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-trigger-"));
  const workDir = path.join(root, "wiki", "work");
  await mkdir(path.join(root, ".aof"), { recursive: true });
  const milestoneDir = path.join(workDir, "63_milestone_event-driven-triggers");
  await mkdir(milestoneDir, { recursive: true });
  await writeFile(
    path.join(root, ".aof", "aof.config.json"),
    `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" } }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(milestoneDir, "SPEC.md"),
    "---\ntype: milestone\nnumber: 63\nslug: event-driven-triggers\nstatus: in-progress\ntitle: \"Triggers\"\ncreated: 2026-09-01\nupdated: 2026-09-01\n---\n# 63\n",
    "utf8",
  );
  await writeFile(
    path.join(root, ".aof", "triggers.jsonc"),
    `// a planted declaration\n${JSON.stringify(declarationOf(members), null, 2)}\n`,
    "utf8",
  );
  if (withGitIgnored) await writeFile(path.join(root, "README.md"), "fixture\n", "utf8");
  return root;
}

async function snapshot(root) {
  const files = new Map();
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile()) files.set(path.relative(root, absolute), await readFile(absolute));
    }
  }
  await walk(root);
  return files;
}

function sameTree(before, after, what) {
  assert.deepEqual([...after.keys()].sort(), [...before.keys()].sort(), `${what}: no file created or removed`);
  for (const [file, bytes] of before) {
    assert.deepEqual(after.get(file), bytes, `${file} is byte-identical after ${what}`);
  }
}

function cli(root, args) {
  const result = spawnCliSync(process.execPath, [cliPath, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

const timerCount = () => process.getActiveResourcesInfo().filter((kind) => kind === "Timeout").length;

// --- the tests --------------------------------------------------------------

export const triggerCommandTests = [
  // ══════════════ 00_the-face-resolves-and-launches-nothing.feature ══════════════
  {
    name: "trigger/00 whatever the run resolves, the tree is as it was (every plausible writer path, from the outside)",
    async run() {
      // Each row is a SITUATION the run reaches, driven over a real tree whose every byte is
      // listed before and after. A path assembled from a variable resolves somewhere no reader
      // can see, so the proof is taken from outside the process, not from reading the code.
      const rows = [
        { situation: "resolved every trigger the declaration declares", args: ["work", "trigger"], members: everySource() },
        { situation: "resolved the one trigger it was named on the command line", args: ["work", "trigger", "cron-wake"], members: everySource() },
        { situation: "was given a signal and resolved it to a scope", args: ["work", "trigger", "--signal", JSON.stringify({ source: "ci-signal", ref: "63" })], members: everySource() },
        { situation: "refused a trigger asking for a level the gate would not admit", args: ["work", "trigger"], members: [member({ level: "L3" })] },
        { situation: "refused a signal naming a source that is not declared", args: ["work", "trigger", "--signal", JSON.stringify({ source: "webhook" })], members: everySource() },
        { situation: "ran over a declaration that declares no trigger at all", args: ["work", "trigger"], members: [] },
        { situation: "rendered its answer for a human reader", args: ["work", "trigger"], members: everySource() },
        { situation: "rendered its answer machine-readably", args: ["work", "trigger", "--json"], members: everySource() },
        { situation: "could not obtain a gate reading at all", args: ["work", "trigger"], members: [member({ level: "L3" })], config: { work: { dir: "./nowhere" } } },
        { situation: "ran twice in succession over the same tree", args: ["work", "trigger"], members: everySource(), twice: true },
      ];
      for (const row of rows) {
        const root = await makeRepo({ members: row.members });
        try {
          const before = await snapshot(root);
          cli(root, row.args);
          if (row.twice === true) cli(root, row.args);
          const after = await snapshot(root);
          sameTree(before, after, `a run that ${row.situation}`);
        } finally {
          await rm(root, { recursive: true, force: true });
        }
      }
    },
  },
  {
    name: "trigger/00 nothing accumulates between runs, inside the tree or outside it",
    async run() {
      const root = await makeRepo({ members: [...everySource(), member({ id: "gated", level: "L3" })] });
      try {
        const before = await snapshot(root);
        const first = cli(root, ["work", "trigger", "--json"]);
        const middle = await snapshot(root);
        const second = cli(root, ["work", "trigger", "--json"]);
        const after = await snapshot(root);
        // The same resolutions and the same refusals, stated the same way — a second run that
        // said something the first did not is a first run that wrote something down.
        assert.deepEqual(JSON.parse(second.stdout), JSON.parse(first.stdout), "the second run states the same resolutions and refusals as the first");
        assert.equal(second.status, first.status, "and exits the same way");
        sameTree(before, middle, "the first run");
        sameTree(before, after, "the second run");
        // No record left by the first run exists for the second to read.
        assert.deepEqual([...after.keys()].sort(), [...before.keys()].sort(), "no record file was left behind");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "trigger/00 no configuration moves, and nothing is recorded as having happened",
    async run() {
      const root = await makeRepo();
      try {
        const configPath = path.join(root, ".aof", "aof.config.json");
        const statePath = path.join(root, "wiki", "work", "63_milestone_event-driven-triggers", "STATE.md");
        await writeFile(statePath, "# 63 · State\n", "utf8");
        const configBefore = await readFile(configPath, "utf8");
        const stateBefore = await readFile(statePath, "utf8");
        const result = cli(root, ["work", "trigger", "--json"]);
        assert.equal(result.status, 0, `the run answers cleanly (stderr: ${result.stderr})`);
        assert.equal(await readFile(configPath, "utf8"), configBefore, "the configuration holds the values it held before the run");
        assert.equal(await readFile(statePath, "utf8"), stateBefore, "the record carries nothing the run added");
        // No event is raised for the run having happened: the effects journal the CLI face
        // sweeps is only ever CREATED by a transition, so its absence is the observable.
        const entries = await readdir(path.join(root, ".aof"));
        assert.deepEqual(entries.sort(), ["aof.config.json", "triggers.jsonc"], "nothing new was written under .aof/");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "trigger/00 the run starts nothing and schedules nothing, and returns without waiting on work it started",
    async run() {
      const registry = recordingRegistry({ answers: passingGate() });
      const timersBefore = timerCount();
      const started = Date.now();
      const report = await run({}, { declaration: declarationOf([...everySource(), member({ id: "gated", level: "L3" })]), ...registry });
      const elapsed = Date.now() - started;
      // No loop was entered by it: the loop is LOOKED UP for its route and never INVOKED, so no
      // probe runs and no launcher is reached. The only calls are the two gate readings.
      assert.ok(registry.looked.includes(LOOP_ID), "the loop's registration is looked up for its route");
      assert.deepEqual(registry.invoked.map((call) => call.id).sort(), [DOCTOR_ID, GROUNDEDNESS_ID].sort(), "the only commands invoked are the two gate readings");
      assert.equal(registry.invoked.some((call) => call.id === LOOP_ID), false, "no loop was entered by it");
      // Nothing has been scheduled to run later: no timer outlives the run.
      assert.equal(timerCount(), timersBefore, "no timer is left armed after the run");
      // The run returns its answer without waiting on work it started.
      assert.ok(elapsed < 5000, `the run returns promptly (took ${elapsed}ms)`);
      assert.equal(triggerCommand.cli.launch, undefined, "work:trigger declares no cli.launch, so no launcher body exists to enter");
      assert.equal(report.resolved.length + report.refused.length, 5, "every considered trigger is answered for");
    },
  },
  {
    name: "trigger/00 what the caller is handed is what the caller runs",
    async run() {
      const registry = silentRegistry();
      const report = await run({}, { declaration: declarationOf([member()]), ...registry });
      const [row] = report.resolved;
      assert.deepEqual([...row.argv], ["work", "loop", "63", "--level", "L1"], "the resolution carries the argv that would run the loop");
      // Running that argv is left to the caller, and nothing claims the loop has been run.
      assert.equal(registry.invoked.length, 0, "nothing was invoked; running the argv is the caller's");
      const text = JSON.stringify(report);
      assert.doesNotMatch(text, /"(?:ran|running|launched|started|pid|sessionId|loopRunId)"/u, "nothing in the report claims the loop has been run");
      assert.match(triggerCommand.cli.render(report), /running the argv above is the caller's/u, "and the human face says so");
    },
  },
  {
    name: "trigger/00 the options this face offers, and the ones it does not",
    async run() {
      const root = await makeRepo();
      try {
        const accepted = [
          { option: "machine-readable output", args: ["work", "trigger", "--json"] },
          { option: "a trigger named on the command line", args: ["work", "trigger", "cron-wake", "--json"] },
          { option: "a signal", args: ["work", "trigger", "--signal", JSON.stringify({ source: "cron", scope: "63" }), "--json"] },
        ];
        for (const row of accepted) {
          const result = cli(root, row.args);
          assert.equal(result.status, 0, `${row.option} is accepted (stderr: ${result.stderr})`);
          const parsed = JSON.parse(result.stdout);
          assert.notEqual(parsed.ok, false, `${row.option} is not a refused invocation`);
          assert.ok(Array.isArray(parsed.resolved), `${row.option} renders the object the human face renders`);
        }
        // `--json` renders the object the human face renders — one object, two renderings.
        const machine = JSON.parse(cli(root, ["work", "trigger", "--json"]).stdout);
        const human = cli(root, ["work", "trigger"]).stdout;
        assert.equal(human.trim(), triggerCommand.cli.render(machine).trim(), "the human face renders the same object");
        // Narrowing to one trigger narrows the answer to that trigger.
        const narrowed = JSON.parse(cli(root, ["work", "trigger", "cron-wake", "--json"]).stdout);
        assert.deepEqual(narrowed.considered, ["cron-wake"], "a trigger named on the command line narrows the answer to that trigger");
        // A signal is resolved against the declaration.
        const signalled = JSON.parse(cli(root, ["work", "trigger", "--signal", JSON.stringify({ source: "ci-signal", ref: "50-63" }), "--json"]).stdout);
        assert.deepEqual(signalled.resolved.map((row) => row.trigger.id), ["ci-wake"], "a signal is resolved against the declaration");
        assert.equal(signalled.resolved[0].scope, "50-63", "and the scope it points at is the one it resolved");

        const refused = [
          { option: "a dry run", args: ["work", "trigger", "--dry-run", "--json"] },
          { option: "strictness", args: ["work", "trigger", "--strict", "--json"] },
          { option: "an instruction to run what it resolved", args: ["work", "trigger", "--exec", "--json"] },
          { option: "an instruction to write the resolution down", args: ["work", "trigger", "--write", "--json"] },
        ];
        for (const row of refused) {
          const result = cli(root, row.args);
          assert.equal(result.status, 1, `${row.option} is refused as an option this command does not accept`);
          const parsed = JSON.parse(result.stdout);
          assert.equal(parsed.ok, false, `${row.option} is refused in one structured envelope`);
          assert.equal(parsed.code, "unknown-flag", `${row.option} is refused as an unknown flag`);
        }
        // And the surface itself advertises neither.
        assert.deepEqual(Object.keys(triggerCommand.cli.spec.flags), ["signal"], "the only flag this face declares is --signal");
        assert.doesNotMatch(triggerCommand.cli.spec.usage, /dry-run|strict|exec|apply|write|commit/iu, "the usage advertises no capability that does not exist");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "trigger/00 there is no dry face, because there is no wet one",
    async run() {
      const root = await makeRepo();
      try {
        const refusal = cli(root, ["work", "trigger", "--dry-run", "--json"]);
        assert.equal(refusal.status, 1, "asking this face not to write is refused");
        assert.equal(JSON.parse(refusal.stdout).code, "unknown-flag", "refused as an option this command does not accept");
        // And a run made WITHOUT that option writes nothing into the tree either.
        const before = await snapshot(root);
        assert.equal(cli(root, ["work", "trigger", "--json"]).status, 0, "the bare run answers cleanly");
        sameTree(before, await snapshot(root), "a run made without the option");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "trigger/00 no option this face accepts opens a path to running the loop",
    async run() {
      const declaration = declarationOf(everySource());
      const invocations = [
        {},
        { trigger: "cron-wake" },
        { signal: { source: "ci-signal", ref: "63" } },
      ];
      for (const input of invocations) {
        const registry = recordingRegistry({ answers: passingGate() });
        const timersBefore = timerCount();
        const report = await run(input, { declaration, ...registry });
        assert.equal(registry.invoked.some((call) => call.id === LOOP_ID), false, `${JSON.stringify(input)}: no run enters a loop`);
        assert.equal(timerCount(), timersBefore, `${JSON.stringify(input)}: no run schedules anything`);
        // Each answers with a resolution and nothing else: the report's keys are the declared
        // reading, and every resolved row's keys are the enumerated four.
        for (const row of report.resolved) {
          assert.deepEqual(Object.keys(row).sort(), [...RESOLVED_TRIGGER_KEYS].sort(), "a resolved row carries the enumerated keys and no other");
        }
      }
    },
  },

  // ══════════ 01_the-resolution-is-a-loop-input-and-its-argv.feature ══════════
  {
    name: "trigger/01 the answer names the command the loop already registers",
    async run() {
      const report = await run({}, { declaration: declarationOf([member({ scope: "50-63", level: "L2" })]), ...silentRegistry() });
      const [row] = report.resolved;
      const route = getCommand(LOOP_ID).cli.route;
      assert.deepEqual(row.argv.slice(0, route.length), [...route], "its leading tokens are the loop's own route");
      // The command those tokens name is one the registry answers for — resolved through the
      // registry rather than spelled here.
      const named = listCommands().find((command) => (command.cli?.route ?? []).join(" ") === row.argv.slice(0, route.length).join(" "));
      assert.ok(named, "the command those tokens name is one the registry answers for");
      assert.equal(named.id, LOOP_ID, "and it is work:loop");
      assert.equal(row.argv[route.length], row.scope, "the scope it carries is the one the resolution states");
      assert.equal(row.argv[row.argv.indexOf("--level") + 1], row.level, "and the level it carries is the one the resolution states");
    },
  },
  {
    name: "trigger/01 what a resolved trigger carries, and what it may not",
    async run() {
      const report = await run({}, { declaration: declarationOf([member()]), ...silentRegistry() });
      const [row] = report.resolved;
      // Present: the loop's declared input, the argv that carries it, and the identity of the
      // declaring member — its id and the source it was declared under.
      assert.equal(typeof row.scope, "string", "the scope the loop is to run over is present");
      assert.equal(typeof row.level, "string", "the level the loop is to run at is present");
      assert.ok(Array.isArray(row.argv), "the argv that carries them is present");
      assert.equal(row.trigger.id, "cron-wake", "the id of the trigger it resolved from is present");
      assert.equal(row.trigger.source, "cron", "the source that trigger declares is present");
      // Absent: every bound, directive, prompt and verdict that has an owner elsewhere.
      for (const [thing, key] of [
        ["a per-attempt cap", "cap"],
        ["a model", "model"],
        ["an effort", "effort"],
        ["review claims", "reviewClaims"],
        ["a phase to drive", "phase"],
        ["a slash command", "command"],
        ["a verdict about whether the run may proceed", "admitted"],
      ]) {
        assert.equal(Object.prototype.hasOwnProperty.call(row, key), false, `${thing} is absent`);
      }
      // …and exhaustively: any key the loop's own input does not declare, beyond the argv and the
      // one identity key, is absent.
      const loopInputKeys = Object.keys(getCommand(LOOP_ID).input.properties);
      const beyond = Object.keys(row).filter((key) => !loopInputKeys.includes(key) && key !== "argv" && key !== "trigger");
      assert.deepEqual(beyond, [], "no key the loop's own input does not declare survives, beyond the argv and one identity key");
      assert.deepEqual(Object.keys(row).sort(), [...RESOLVED_TRIGGER_KEYS].sort(), "the row's key set is the enumerated four");
    },
  },
  {
    name: "trigger/01 the argv is a list of tokens, not a line of shell",
    async run() {
      const report = await run({}, { declaration: declarationOf([member({ scope: "50-63", level: "L2" })]), ...silentRegistry() });
      const [row] = report.resolved;
      assert.ok(Array.isArray(row.argv), "it is a sequence of separate tokens");
      for (const token of row.argv) assert.equal(typeof token, "string", `every token is a string (${JSON.stringify(token)})`);
      assert.equal(row.argv.filter((token) => token === row.scope).length, 1, "the scope is one token of it");
      assert.equal(row.argv.filter((token) => token === row.level).length, 1, "and the level another");
      for (const token of row.argv) {
        assert.doesNotMatch(token, /["'\\\s]/u, `no token carries a quote, an escape or a separator a caller would have to remove (${token})`);
      }
      // Executing that sequence as it stands needs no further parsing: each token is one argv
      // element already, so joining and re-splitting is a round trip.
      assert.deepEqual(row.argv.join(" ").split(" "), [...row.argv], "executing the sequence as it stands needs no further parsing");
    },
  },
  {
    name: "trigger/01 a fact stated by one rendering is stated the same way by the other",
    async run() {
      const registry = recordingRegistry({ answers: failingGate() });
      const report = await run({}, {
        declaration: declarationOf([
          member({ id: "cron-wake" }),
          member({ id: "gated", source: "ci-signal", level: "L3" }),
        ]),
        ...registry,
      });
      const human = triggerCommand.cli.render(report);
      const machine = triggerCommand.cli.json(report);
      assert.equal(machine, report, "the machine face emits the object itself, never a second derivation");
      // Every fact below is read OUT OF THE MACHINE FACE — off the JSON a caller would parse —
      // and then looked for verbatim in the human one. A human face that derived its own figure
      // would fail here on the first edit to either side, which is the failure this scenario
      // exists to catch.
      const parsed = JSON.parse(JSON.stringify(machine));
      const resolved = parsed.resolved[0];
      const refused = parsed.refused[0];
      const facts = [
        ["the scope a trigger resolved to", resolved.scope],
        ["the level a trigger resolved at", resolved.level],
        ["the argv, token for token", resolved.argv.join(" ")],
        ["the trigger id each resolution came from", resolved.trigger.id],
        ["the code carried by each refusal", refused.code],
        ["the failing gate half named by a refused level", refused.failingHalves.join(", ")],
        ["the source each declared trigger was declared under", refused.trigger.source],
      ];
      for (const [fact, value] of facts) {
        assert.ok(human.includes(value), `${fact} reads the same in each (${value})`);
      }
      // …and neither rendering states it in a form the other does not carry: the human face is a
      // pure function of the emitted object, so rendering the PARSED machine document reproduces
      // it byte for byte — there is no second derivation for either side to drift from.
      assert.equal(triggerCommand.cli.render(parsed), human, "the human rendering is a function of the emitted object alone");
    },
  },
  {
    name: "trigger/01 four sources, one answer shape",
    async run() {
      const report = await run({}, { declaration: declarationOf(everySource()), ...silentRegistry() });
      assert.equal(report.resolved.length, 4, "every declared source resolves");
      const [first] = report.resolved;
      for (const row of report.resolved) {
        assert.deepEqual(Object.keys(row).sort(), Object.keys(first).sort(), `${row.trigger.source}: the same keys as every other resolution in the run`);
        assert.deepEqual(row.argv.slice(0, 2), first.argv.slice(0, 2), `${row.trigger.source}: the same two leading tokens as every other resolution in the run`);
      }
      assert.deepEqual(report.resolved.map((row) => row.trigger.source).sort(), [...TRIGGER_SOURCES].sort(), "a cadence, a mesh work-assignment, a build signal and an inbound finding all answer");
    },
  },
  {
    name: "trigger/01 named with no trigger, the answer is every declared trigger",
    async run() {
      const members = [...everySource(), member({ id: "unadmitted", source: "cron", level: "L3" })];
      const report = await run({}, { declaration: declarationOf(members), ...recordingRegistry({ answers: failingGate() }) });
      const answered = [...report.resolved, ...report.refused].map((row) => row.trigger.id);
      assert.deepEqual(answered.sort(), members.map((entry) => entry.id).sort(), "every declared trigger appears in the answer, resolved or refused");
      for (const row of [...report.resolved, ...report.refused]) {
        assert.ok(members.some((entry) => entry.id === row.trigger.id), `${row.trigger.id} appears with the id it is declared under`);
      }
    },
  },
  {
    name: "trigger/01 named with one trigger, the answer is that one",
    async run() {
      const declaration = declarationOf(everySource());
      const unnamed = await run({}, { declaration, ...silentRegistry() });
      const named = await run({ trigger: "ci-wake" }, { declaration, ...silentRegistry() });
      assert.deepEqual(named.resolved.map((row) => row.trigger.id), ["ci-wake"], "the answer carries that trigger and no other");
      assert.deepEqual(named.refused, [], "and refuses nothing else in passing");
      const fromUnnamed = unnamed.resolved.find((row) => row.trigger.id === "ci-wake");
      assert.deepEqual(named.resolved[0], fromUnnamed, "what it carries for that trigger reads the same as it did in the unnamed run");
    },
  },
  {
    name: "trigger/01 a signal resolves against the declaration rather than beside it",
    async run() {
      const declaration = declarationOf([member({ id: "ci-wake", source: "ci-signal", scope: "63", level: "L2" })]);
      const report = await run({ signal: { source: "ci-signal", ref: "50-63" } }, { declaration, ...silentRegistry() });
      const [row] = report.resolved;
      assert.equal(row.trigger.id, "ci-wake", "the answer names the declared trigger the signal matched");
      assert.equal(row.scope, "50-63", "the scope is the one the signal points at");
      assert.equal(row.level, "L2", "its level is the one that trigger declares, not one the signal carried");
      // A level the signal carried is not read at all.
      const carried = await run({ signal: { source: "ci-signal", ref: "50-63", level: "L3" } }, { declaration, ...silentRegistry() });
      assert.deepEqual(carried.resolved[0], row, "a level on the signal changes nothing");
      // A signal matching no declared trigger is refused by code rather than answered emptily.
      const unmatched = await run({ signal: { source: "cron", scope: "63" } }, { declaration, ...silentRegistry() });
      assert.deepEqual(unmatched.resolved, [], "no resolution is invented");
      assert.equal(unmatched.refused.length, 1, "and the answer is not empty");
      assert.equal(unmatched.refused[0].code, "trigger-signal-unmatched", "it is refused by code");
    },
  },

  // ═════ 02_the-gate-facts-are-obtained-through-the-registry.feature ═════
  {
    name: "trigger/02 how a gate reading turns out, what is named, and whose failure it was",
    async run() {
      const declaration = declarationOf([member({ id: "gated", level: "L3" })]);
      // Row 1 — the registry answers for no such command as a gate reading.
      const unreachable = await run({}, { declaration, ...recordingRegistry({ answers: {}, unregistered: [DOCTOR_ID] }) });
      assert.equal(unreachable.failure.command, DOCTOR_ID, "the report names the command it asked for");
      assert.match(unreachable.failure.message, /No registered command answers for work:doctor/u, "and that nothing answers for it");
      assert.equal(triggerCommand.cli.exit(unreachable), 1, "the run exits unsuccessfully");

      // Row 2 — obtaining a gate reading raises a failure.
      const raised = await run({}, {
        declaration,
        ...recordingRegistry({ answers: { [DOCTOR_ID]: () => { throw new Error("the doctor fell over"); } } }),
      });
      assert.match(raised.failure.message, /the doctor fell over/u, "the report names the failure raised");
      assert.equal(raised.failure.fact, "loopReady", "and which reading was being obtained");
      assert.equal(triggerCommand.cli.exit(raised), 1, "the run exits unsuccessfully");

      // Row 3 — a reading comes back with no gate half readable in it.
      const unreadable = await run({}, { declaration, ...recordingRegistry({ answers: unreadableGate() }) });
      assert.equal(unreadable.failure, undefined, "a reading that came back is not this command's machinery failing");
      assert.deepEqual(unreadable.refused[0].missing, ["loopReady"], "the report names which reading it could not read, for each trigger needing it");
      assert.equal(triggerCommand.cli.exit(unreadable), 0, "the run exits successfully");
      // …and the run states WHICH READING it could not read, on BOTH sides of the discriminator.
      // JSON has no `undefined`, so "the registry answered with nothing readable" is carried by
      // `present: false` AND by the absence of the `reading` key — never by a `null` standing in
      // for it, which would assert the registry returned null when it returned nothing at all.
      const absent = unreadable.gate.readings.find((reading) => reading.fact === "loopReady");
      const carried = unreadable.gate.readings.find((reading) => reading.fact === "groundedness");
      assert.equal(absent.answered, true, "the command that could not be read from was still asked, and answered");
      assert.equal(absent.present, false, "and the run says its answer carried no readable reading");
      assert.equal(Object.prototype.hasOwnProperty.call(absent, "reading"), false, "with no reading key at all — not a null standing in for one");
      assert.equal(carried.present, true, "while the reading that DID come back is marked present");
      assert.deepEqual(carried.reading, unreadableGate()[GROUNDEDNESS_ID], "and is carried exactly as the registry returned it");
      // The two sides survive the JSON round trip a machine caller actually reads.
      const roundTripped = JSON.parse(JSON.stringify(triggerCommand.cli.json(unreadable)));
      const parsedAbsent = roundTripped.gate.readings.find((reading) => reading.fact === "loopReady");
      assert.equal(parsedAbsent.present, false, "present: false survives the round trip");
      assert.equal(Object.prototype.hasOwnProperty.call(parsedAbsent, "reading"), false, "and no reading key appears in the document");
      // …and the human face says so in words rather than printing a value nobody returned.
      const rendered = triggerCommand.cli.render(unreadable);
      assert.match(rendered, /Gate reading loopReady from work:doctor: the answer carried no such reading/u, "the human face names the reading it could not read");
      assert.doesNotMatch(rendered, /Gate reading loopReady from work:doctor: null/u, "and never reports a null the registry did not return");

      // Row 4 — both readings come back and one half of the gate fails.
      const halfFailed = await run({}, {
        declaration,
        ...recordingRegistry({ answers: { ...passingGate(), [GROUNDEDNESS_ID]: failingGate()[GROUNDEDNESS_ID] } }),
      });
      assert.deepEqual(halfFailed.refused[0].failingHalves, ["groundedness"], "the report names the failing half");
      assert.deepEqual(halfFailed.refused[0].groundedness.state, "absent", "and the reading that failed it");
      assert.equal(triggerCommand.cli.exit(halfFailed), 0, "the run exits successfully");

      // Row 5 — both readings come back and the gate passes.
      const passed = await run({}, { declaration, ...recordingRegistry({ answers: passingGate() }) });
      assert.equal(passed.resolved[0].level, "L3", "the report names the resolution, at the level the trigger declared");
      assert.equal(triggerCommand.cli.exit(passed), 0, "the run exits successfully");
    },
  },
  {
    name: "trigger/02 what a trigger whose gate reading was not obtained may never be rendered as",
    async run() {
      const declaration = declarationOf([member({ id: "gated", level: "L3" })]);
      const report = await run({}, { declaration, ...recordingRegistry({ answers: {}, unregistered: [DOCTOR_ID] }) });
      const [line] = report.refused;
      assert.equal(report.resolved.length, 0, "it does not read as admitted at the level it declared");
      assert.equal(JSON.stringify(report.resolved), "[]", "nor as resolved at a level below the one it declared");
      assert.equal(Object.prototype.hasOwnProperty.call(line, "level"), false, "the line carries no level at all");
      assert.equal(line.code, "trigger-gate-reading-unobtained", "it does not read as a gate that passed");
      assert.equal(LOOP_REFUSALS.includes(line.code), false, "nor as refused for a reason from the gate's own vocabulary");
      // Nor as a refusal naming nothing: it names the reading it could not obtain and the
      // command nothing answered for, so it cannot be read as a gate refusal at all.
      assert.equal(line.fact, "loopReady", "the refusal names the reading");
      assert.equal(line.command, DOCTOR_ID, "and the command it asked");
      assert.equal(Object.prototype.hasOwnProperty.call(line, "failingHalves"), false, "and claims no failing half it never read");
      // Nor carrying a score or a groundedness reading this run worked out.
      assert.equal(Object.prototype.hasOwnProperty.call(line, "score"), false, "it carries no score this run worked out");
      assert.equal(Object.prototype.hasOwnProperty.call(line, "groundedness"), false, "and no groundedness reading either");
      // Nor the answer the same trigger was given on an earlier run.
      const earlier = await run({}, { declaration, ...recordingRegistry({ answers: passingGate() }) });
      assert.equal(earlier.resolved.length, 1, "an earlier run in this same process did resolve it");
      const again = await run({}, { declaration, ...recordingRegistry({ answers: {}, unregistered: [DOCTOR_ID] }) });
      assert.deepEqual(again.resolved, [], "and nothing of that answer is carried into this one");
    },
  },
  {
    name: "trigger/02 a run that cannot reach the registry says so before it says anything else",
    async run() {
      // A declaration whose OTHER trigger would resolve, so "no trigger carries a resolved level"
      // is a claim the fixture could plausibly have broken.
      const declaration = declarationOf([member({ id: "gated", level: "L3" }), member({ id: "ungated", level: "L1" })]);
      const report = await run({}, { declaration, ...recordingRegistry({ answers: {}, unregistered: [DOCTOR_ID] }) });
      const rendered = triggerCommand.cli.json(report);
      assert.equal(Object.keys(rendered)[0], "failure", "it states the failure before it states anything else");
      assert.equal(rendered.failure.command, DOCTOR_ID, "it names the command it asked for");
      assert.deepEqual(report.resolved, [], "no trigger in that run carries a resolved level");
      for (const row of report.refused) {
        assert.equal(Object.prototype.hasOwnProperty.call(row, "level"), false, `${row.trigger.id} carries no resolved level`);
      }
      assert.equal(triggerCommand.cli.exit(report), 1, "the run exits unsuccessfully");
      // …and the tree is unchanged, proven from the outside.
      const root = await makeRepo({ members: [member({ id: "gated", level: "L3" })] });
      try {
        await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify({ name: "fixture", work: { dir: "./nowhere" } }, null, 2)}\n`, "utf8");
        const before = await snapshot(root);
        cli(root, ["work", "trigger", "--json"]);
        sameTree(before, await snapshot(root), "a run that could not decide");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "trigger/02 a declaration that asks for no gated level asks the registry for no reading",
    async run() {
      const registry = recordingRegistry({ answers: {}, unregistered: [DOCTOR_ID, GROUNDEDNESS_ID] });
      const report = await run({}, { declaration: declarationOf(everySource()), ...registry });
      assert.equal(report.resolved.length, 4, "every declared trigger resolves");
      assert.equal(report.failure, undefined, "nothing is reported as having failed");
      assert.equal(triggerCommand.cli.exit(report), 0, "the run exits successfully");
      assert.deepEqual(registry.invoked, [], "the registry was asked for no reading at all");
      assert.equal(registry.looked.includes(DOCTOR_ID), false, "not even looked up");
      assert.equal(report.gate.consulted, false, "and the report says the gate was not consulted");
    },
  },
  {
    name: "trigger/02 two readings in one process give two answers, because nothing is remembered",
    async run() {
      const declaration = declarationOf([member({ id: "gated", level: "L3" })]);
      const first = await run({}, { declaration, ...recordingRegistry({ answers: passingGate() }) });
      const second = await run({}, { declaration, ...recordingRegistry({ answers: failingGate() }) });
      assert.equal(first.resolved[0].level, "L3", "the first answer is a resolution at the level declared");
      assert.deepEqual(second.resolved, [], "the second answer resolves nothing");
      assert.deepEqual(second.refused[0].failingHalves, ["score", "groundedness"], "the second answer is a refusal naming the failing half");
      assert.equal(first.refused.length, 0, "neither answer was carried over from the other");
      // …and the other way round, so the ordering is not what makes it true.
      const third = await run({}, { declaration, ...recordingRegistry({ answers: passingGate() }) });
      assert.deepEqual(third.resolved[0], first.resolved[0], "a passing reading resolves again after a failing one");
    },
  },
  {
    name: "trigger/02 every trigger in one run is decided against the same readings",
    async run() {
      const registry = recordingRegistry({ answers: failingGate() });
      const report = await run({}, {
        declaration: declarationOf([
          member({ id: "a", level: "L3" }),
          member({ id: "b", source: "ci-signal", level: "L3" }),
          member({ id: "c", source: "feedback-finding", level: "L3" }),
        ]),
        ...registry,
      });
      assert.deepEqual(registry.invoked.map((call) => call.id), [DOCTOR_ID, GROUNDEDNESS_ID], "the report states those readings once for the run");
      assert.equal(report.gate.readings.length, 2, "and carries exactly the two");
      const verdicts = new Set(report.refused.map((row) => row.code));
      assert.deepEqual([...verdicts], ["loop-level-gate"], "no two of them disagree about whether the gate passed");
      for (const row of report.refused) {
        assert.deepEqual(row.score, report.refused[0].score, `${row.trigger.id} was decided against the same score reading`);
        assert.deepEqual(row.groundedness, report.refused[0].groundedness, `${row.trigger.id} was decided against the same groundedness reading`);
      }
    },
  },
  {
    name: "trigger/02 the answer is a pre-flight, and the report says the loop decides again",
    async run() {
      const report = await run({}, { declaration: declarationOf([member({ id: "gated", level: "L3" })]), ...recordingRegistry({ answers: passingGate() }) });
      const [row] = report.resolved;
      assert.equal(Object.prototype.hasOwnProperty.call(row, "admitted"), false, "it carries no admission that the run may proceed");
      assert.deepEqual(Object.keys(row).sort(), [...RESOLVED_TRIGGER_KEYS].sort(), "and nothing beyond the loop's input, the argv and the identity");
      assert.equal(report.preflight.gatedAgainAt, LOOP_ID, "the report states that the loop resolves this gate again when it fires");
      assert.equal(report.preflight.isAdmission, false, "and that this answer is not an admission");
      assert.match(triggerCommand.cli.render(report), /resolves the level gate again when it fires/u, "the human face says so too");
      // Nothing in the resolution would let the loop skip that: the argv carries only the loop's
      // own input, so there is no token by which a gate could be waived.
      const loopInputKeys = Object.keys(getCommand(LOOP_ID).input.properties);
      for (const token of row.argv.filter((entry) => entry.startsWith("--"))) {
        const key = token.slice(2).replace(/-([a-z])/gu, (_, letter) => letter.toUpperCase());
        assert.ok(loopInputKeys.includes(key), `${token} is a key the loop's own input declares`);
      }
    },
  },
  {
    name: "trigger/02 a reading that decides the gate is used as it came back",
    async run() {
      const answers = failingGate();
      const report = await run({}, { declaration: declarationOf([member({ id: "gated", level: "L3" })]), ...recordingRegistry({ answers }) });
      const [refusal] = report.refused;
      // The failing half is named in the words the gate's own answer used.
      const gateAnswer = resolveTriggerLevel({ id: "gated", level: "L3" }, {
        loopReady: answers[DOCTOR_ID].loopReady,
        groundedness: answers[GROUNDEDNESS_ID],
      });
      assert.deepEqual(refusal.failingHalves, gateAnswer.failingHalves, "the failing half is named in the words the gate's own answer used");
      assert.equal(refusal.reason, gateAnswer.reason, "and the reason is the gate's own");
      assert.deepEqual(refusal.score, gateAnswer.score, "the reading that failed is carried as the registry returned it");
      assert.deepEqual(refusal.groundedness, gateAnswer.groundedness, "both halves alike");
      // No part of it is re-phrased, re-scored or summarised into a verdict of this command's own.
      const { triggerId: _triggerId, ...expected } = gateAnswer;
      const { trigger: _trigger, ...actual } = refusal;
      assert.deepEqual(actual, expected, "nothing was re-phrased, re-scored or summarised");
      // …and the run-level reading is the object the registry returned, unchanged.
      assert.deepEqual(report.gate.readings.find((reading) => reading.fact === "loopReady").reading, answers[DOCTOR_ID].loopReady, "the run states the reading as it came back");
    },
  },

  // ══════════ 03_a-refusal-is-reported-and-exits-clean.feature ══════════
  {
    name: "trigger/03 every outcome, what it is reported as, and what it exits",
    async run() {
      const one = (report) => ({ report, exit: triggerCommand.cli.exit(report) });
      // a declared trigger resolves
      const resolved = one(await run({}, { declaration: declarationOf([member()]), ...silentRegistry() }));
      assert.deepEqual(Object.keys(resolved.report.resolved[0]).sort(), [...RESOLVED_TRIGGER_KEYS].sort(), "its scope, its level and its argv");
      assert.equal(resolved.exit, 0, "successfully");

      // a trigger id is named that the declaration does not declare
      const unknownId = one(await run({ trigger: "nope" }, { declaration: declarationOf([member()]), ...silentRegistry() }));
      assert.equal(unknownId.report.refused[0].code, "trigger-unknown", "a code");
      assert.equal(unknownId.report.refused[0].given, "nope", "the id given");
      assert.deepEqual(unknownId.report.refused[0].declared, ["cron-wake"], "and every id that is declared");
      assert.equal(unknownId.exit, 0, "successfully");

      // a signal names a source that is not declared
      const unknownSource = one(await run({ signal: { source: "webhook" } }, { declaration: declarationOf([member()]), ...silentRegistry() }));
      assert.equal(unknownSource.report.refused[0].code, "trigger-source-unknown", "a code");
      assert.equal(unknownSource.report.refused[0].given, "webhook", "the source given");
      assert.deepEqual(unknownSource.report.refused[0].sources, [...TRIGGER_SOURCES], "and every source that exists");
      assert.equal(unknownSource.exit, 0, "successfully");

      // a declared trigger's scope matches no admitted loop scope form
      const badScope = one(await run({}, {
        compiled: { version: 1, triggers: [{ id: "story-scoped", protects: "x", source: "cron", scope: "63/01", level: "L1" }] },
        ...silentRegistry(),
      }));
      assert.equal(badScope.report.refused[0].code, "loop-scope-unsupported", "a code");
      assert.equal(badScope.report.refused[0].requestedScope, "63/01", "the scope");
      assert.deepEqual(badScope.report.refused[0].admits, [{ id: "driver", example: "53" }, { id: "range", example: "50-53" }], "and each admitted form with an example");
      assert.equal(badScope.exit, 0, "successfully");

      // a signal names a story rather than something the loop admits
      const storySignal = one(await run({ signal: { source: "ci-signal", ref: "63/01" } }, {
        declaration: declarationOf([member({ source: "ci-signal" })]),
        ...silentRegistry(),
      }));
      assert.equal(storySignal.report.refused[0].code, "loop-scope-unsupported", "a code");
      assert.equal(storySignal.report.refused[0].driver, "63", "and the driver that story belongs to");
      assert.equal(storySignal.exit, 0, "successfully");

      // a declared trigger asks for a level this workspace's gate refuses
      const gateRefused = one(await run({}, { declaration: declarationOf([member({ level: "L3" })]), ...recordingRegistry({ answers: failingGate() }) }));
      assert.equal(gateRefused.report.refused[0].code, "loop-level-gate", "a code");
      assert.equal(gateRefused.report.refused[0].requestedLevel, "L3", "the level asked for");
      assert.deepEqual(gateRefused.report.refused[0].failingHalves, ["score", "groundedness"], "and the failing half by name");
      assert.equal(gateRefused.exit, 0, "successfully");

      // a source is given a signal it cannot resolve to any scope
      const noScope = one(await run({ signal: { source: "feedback-finding", attribution: "63", captures: [] } }, {
        declaration: declarationOf([member({ source: "feedback-finding" })]),
        ...silentRegistry(),
      }));
      assert.equal(noScope.report.refused[0].code, "trigger-signal-no-capture", "a code naming the source");
      assert.equal(noScope.report.refused[0].source, "feedback-finding", "the source it names");
      assert.equal(noScope.report.refused[0].unresolved, "capture", "and what it could not resolve");
      assert.equal(noScope.exit, 0, "successfully");

      // the declaration declares no trigger at all
      const empty = one(await run({}, { declaration: declarationOf([]), ...silentRegistry() }));
      assert.match(empty.report.headline.summary, /declares no trigger/u, "that it read the declaration and it declares nothing");
      assert.ok(empty.report.declaration.path.endsWith(path.join(".aof", "triggers.jsonc")), "and names the declaration it read");
      assert.equal(empty.exit, 0, "successfully");

      // every declared trigger refuses and none resolves
      const allRefuse = one(await run({}, {
        declaration: declarationOf([member({ id: "a", level: "L3" }), member({ id: "b", source: "ci-signal", level: "L3" })]),
        ...recordingRegistry({ answers: failingGate() }),
      }));
      assert.deepEqual(allRefuse.report.resolved, [], "nothing reported as resolved");
      assert.deepEqual(allRefuse.report.refused.map((row) => row.code), ["loop-level-gate", "loop-level-gate"], "each refusal, by code");
      assert.equal(allRefuse.exit, 0, "successfully");

      // the declaration does not compile
      const wontCompile = one(await run({}, { declaration: declarationOf([member({ id: "bad", level: "L9" })]), ...silentRegistry() }));
      assert.equal(wontCompile.report.failure.code, "trigger-level-unknown", "a code");
      assert.equal(wontCompile.report.failure.member, "bad", "the member that would not compile");
      assert.match(wontCompile.report.failure.message, /the levels that exist/u, "and why");
      assert.equal(wontCompile.exit, 1, "unsuccessfully");

      // the registry cannot be reached for a gate reading
      const unreachable = one(await run({}, { declaration: declarationOf([member({ level: "L3" })]), ...recordingRegistry({ answers: {}, unregistered: [DOCTOR_ID] }) }));
      assert.equal(unreachable.report.failure.code, "trigger-gate-reading-unreachable", "a code");
      assert.equal(unreachable.report.failure.command, DOCTOR_ID, "and the command nothing answered for");
      assert.equal(unreachable.exit, 1, "unsuccessfully");

      // the invocation carries a signal this command cannot read at all
      const unreadableSignal = one(await run({ signal: "not an object" }, { declaration: declarationOf([member()]), ...silentRegistry() }));
      assert.equal(unreadableSignal.report.failure.code, "trigger-invocation-signal-unreadable", "what it could not read in the invocation");
      assert.match(unreadableSignal.report.failure.message, /a string/u, "named by kind");
      assert.equal(unreadableSignal.exit, 1, "unsuccessfully");
    },
  },
  {
    name: "trigger/03 a refusal names what exists, not only what was wrong",
    async run() {
      const declaration = declarationOf([member({ id: "cron-wake" }), member({ id: "ci-wake", source: "ci-signal" })]);
      // a trigger id is unknown → every trigger id the declaration declares
      const unknownId = await run({ trigger: "nope" }, { declaration, ...silentRegistry() });
      assert.deepEqual(unknownId.refused[0].declared, ["cron-wake", "ci-wake"], "every trigger id the declaration declares");
      // a source is unknown → every source the vocabulary declares
      const unknownSource = await run({ signal: { source: "webhook" } }, { declaration, ...silentRegistry() });
      assert.deepEqual(unknownSource.refused[0].sources, [...TRIGGER_SOURCES], "every source the vocabulary declares");
      assert.equal(unknownSource.refused[0].sources.includes("mesh-assignment"), true, "including the one this command does not resolve signals for");
      // a scope no admitted form matches → each admitted form, with an example of each
      const badScope = await run({ signal: { source: "ci-signal", ref: "sixty-three" } }, { declaration, ...silentRegistry() });
      assert.deepEqual(badScope.refused[0].admits.map((form) => form.id), ["driver", "range"], "each admitted form");
      for (const form of badScope.refused[0].admits) assert.equal(typeof form.example, "string", `${form.id} carries an example`);
      // a level the gate refuses → the half that failed and the reading that failed
      const gated = await run({}, { declaration: declarationOf([member({ level: "L3" })]), ...recordingRegistry({ answers: failingGate() }) });
      assert.deepEqual(gated.refused[0].failingHalves, ["score", "groundedness"], "the half of the gate that failed");
      assert.equal(gated.refused[0].score.score, 40, "and the reading that failed");
      // a story-shaped scope → the driver the story belongs to, and the form the loop admits
      const story = await run({ signal: { source: "ci-signal", ref: "63/01" } }, { declaration, ...silentRegistry() });
      assert.equal(story.refused[0].driver, "63", "the driver the story belongs to");
      assert.deepEqual(story.refused[0].admits.map((form) => form.id), ["driver", "range"], "and the form the loop admits");
    },
  },
  {
    name: "trigger/03 a refusal is a refusal, never an empty answer",
    async run() {
      const members = [member({ id: "a", level: "L3" }), member({ id: "b", source: "ci-signal", level: "L3" }), member({ id: "c", source: "feedback-finding", level: "L3" })];
      const report = await run({}, { declaration: declarationOf(members), ...recordingRegistry({ answers: failingGate() }) });
      assert.match(report.headline.summary, /^no declared trigger resolves/u, "it states, once for the run, that nothing resolved");
      assert.deepEqual(report.refused.map((row) => row.trigger.id).sort(), members.map((entry) => entry.id).sort(), "every declared trigger appears in it");
      for (const row of report.refused) assert.equal(typeof row.code, "string", `${row.trigger.id} carries its own refusal code`);
      assert.equal(report.refused.length, members.length, "no trigger is silently absent from the answer");
      // The run does not read as a run with nothing to do: the sentence a resolving run produces
      // is not the sentence this one produces.
      const resolving = await run({}, { declaration: declarationOf([member({ id: "a" })]), ...silentRegistry() });
      assert.notEqual(resolving.headline.summary, report.headline.summary, "the sentence differs from a run that resolved");
      assert.doesNotMatch(report.headline.summary, /nothing to do/u, "and never reads as nothing to do");
    },
  },
  {
    name: "trigger/03 the resolved and the refused together account for every declared trigger",
    async run() {
      const members = [member({ id: "a" }), member({ id: "b", source: "ci-signal", level: "L3" }), member({ id: "c", source: "feedback-finding" })];
      const report = await run({}, { declaration: declarationOf(members), ...recordingRegistry({ answers: failingGate() }) });
      const resolvedIds = report.resolved.map((row) => row.trigger.id);
      const refusedIds = report.refused.map((row) => row.trigger.id);
      assert.deepEqual([...resolvedIds, ...refusedIds].sort(), members.map((entry) => entry.id).sort(), "each declared trigger appears exactly once");
      for (const id of resolvedIds) assert.equal(refusedIds.includes(id), false, `${id} does not appear both as resolved and as refused`);
      for (const entry of members) {
        assert.ok(resolvedIds.includes(entry.id) || refusedIds.includes(entry.id), `${entry.id} appears as one or the other, never as neither`);
      }
      // And the two sides cannot be confused for one another by reading keys: a resolved row
      // answers to the loop's input and the argv, a refused row to none of them.
      for (const row of report.refused) {
        for (const key of [...LOOP_INPUT_KEYS_UNDER_TEST, "argv"]) {
          assert.equal(Object.prototype.hasOwnProperty.call(row, key), false, `a refusal answers to no ${key}`);
        }
      }
    },
  },
  {
    name: "trigger/03 a level the gate refuses is refused, never quietly run at a lower one",
    async run() {
      const report = await run({}, { declaration: declarationOf([member({ id: "gated", level: "L3" })]), ...recordingRegistry({ answers: failingGate() }) });
      assert.deepEqual(report.refused[0].failingHalves, ["score", "groundedness"], "it carries a refusal naming the failing half of the gate");
      assert.deepEqual(report.resolved, [], "no resolution for that trigger appears at any level");
      // Asserted per KEY rather than by matching a JSON blob: a substring search over the
      // serialised answer is brittle against a rename in either direction, and a refusal that
      // answered to `scope`, `level` or `argv` is precisely what a caller would read as a run.
      for (const row of report.refused) {
        for (const key of ["level", "argv", "scope"]) {
          assert.equal(Object.prototype.hasOwnProperty.call(row, key), false, `the refusal answers to no ${key} at all`);
        }
      }
      assert.equal(Object.prototype.hasOwnProperty.call(report.refused[0], "requestedLevel"), true, "it names the level that was asked for instead");
      assert.equal(triggerCommand.cli.exit(report), 0, "the run exits successfully");
    },
  },
  {
    name: "trigger/03 a declaration that will not compile arms nothing, and says so first",
    async run() {
      const report = await run({}, {
        declaration: declarationOf([member({ id: "good" }), member({ id: "bad", scope: "63/01" })]),
        ...silentRegistry(),
      });
      const rendered = triggerCommand.cli.json(report);
      assert.equal(Object.keys(rendered)[0], "failure", "it states that failure before it states anything else");
      assert.equal(report.failure.member, "bad", "it names the member");
      assert.match(report.failure.message, /matches no admitted loop scope form/u, "and why it would not compile");
      assert.deepEqual(report.resolved, [], "no trigger from that declaration is reported as resolved");
      assert.equal(triggerCommand.cli.exit(report), 1, "the run exits unsuccessfully");

      // WHY IT WOULD NOT COMPILE IS CARRIED AS FIELDS, not only inside a sentence. The reader of
      // this answer is a crontab line or a build step: "each admitted form with an example of
      // each" is unreachable from prose, and a failure that made the caller parse its own message
      // for the one thing it needs is the shape reporting BY CODE exists to refuse.
      assert.equal(report.failure.scope, "63/01", "the scope that would not compile is named as a field");
      assert.deepEqual(
        report.failure.admits,
        [{ id: "driver", example: "53" }, { id: "range", example: "50-53" }],
        "and each admitted form is named with an example of each",
      );
      // …and the human face states them beside the code, so neither rendering carries what the
      // other does not.
      const humanFailure = triggerCommand.cli.render(report);
      assert.match(humanFailure, /scope: "63\/01"/u, "the human face states the scope");
      assert.match(humanFailure, /admitted scope forms: driver \(e\.g\. 53\), range \(e\.g\. 50-53\)/u, "and the admitted forms with their examples");

      // The same for every other way a member refuses to compile: the particulars the compiler
      // already holds reach the caller rather than being summarised away.
      const carried = [
        { member: member({ id: "bad", source: "webhook" }), code: "trigger-source-unknown", key: "sources", value: [...TRIGGER_SOURCES] },
        { member: member({ id: "bad", level: "L9" }), code: "trigger-level-unknown", key: "levels", value: [...LOOP_LEVELS] },
        { member: member({ id: "bad", cadence: "every-tuesday" }), code: "trigger-cadence-invalid", key: "cadence", value: "every-tuesday" },
      ];
      for (const entry of carried) {
        const answer = await run({}, { declaration: declarationOf([entry.member]), ...silentRegistry() });
        assert.equal(answer.failure.code, entry.code, `${entry.code} is reported by code`);
        assert.deepEqual(answer.failure[entry.key], entry.value, `${entry.code} carries its ${entry.key} as a field`);
        assert.ok(
          triggerCommand.cli.render(answer).includes(Array.isArray(entry.value) ? entry.value.join(", ") : entry.value),
          `${entry.code}: the human face states them too`,
        );
      }
    },
  },
  {
    name: "trigger/03 an empty declaration is an answer rather than a failure",
    async run() {
      const report = await run({}, { declaration: declarationOf([]), ...silentRegistry() });
      assert.ok(report.declaration.path.endsWith(path.join(".aof", "triggers.jsonc")), "it names the declaration it read");
      assert.match(report.headline.summary, /declares no trigger/u, "it states that the declaration declares nothing");
      assert.equal(report.failure, undefined, "nothing is reported as having failed");
      assert.equal(triggerCommand.cli.exit(report), 0, "the run exits successfully");
    },
  },
  {
    name: "trigger/03 no option this face accepts turns a reported refusal into a gate",
    async run() {
      const declaration = declarationOf([member({ id: "gated", source: "ci-signal", level: "L3", scope: "63" })]);
      const invocations = [{}, { trigger: "gated" }, { signal: { source: "ci-signal", ref: "63" } }];
      const codes = [];
      for (const input of invocations) {
        const report = await run(input, { declaration, ...recordingRegistry({ answers: failingGate() }) });
        assert.equal(triggerCommand.cli.exit(report), 0, `${JSON.stringify(input)} exits successfully`);
        codes.push(report.refused.map((row) => row.code));
      }
      for (const set of codes) assert.deepEqual(set, codes[0], "each carries the same refusal codes as the others");
    },
  },
  {
    name: "trigger/03 the codes are stable enough to branch on",
    async run() {
      const declaration = declarationOf([member({ id: "a", level: "L3" }), member({ id: "b", source: "ci-signal", scope: "63" })]);
      const answers = failingGate();
      const first = await run({}, { declaration, ...recordingRegistry({ answers }) });
      const second = await run({}, { declaration, ...recordingRegistry({ answers }) });
      assert.deepEqual(second.refused.map((row) => row.code), first.refused.map((row) => row.code), "each refusal carries the same code in both runs");
      for (const row of first.refused) {
        assert.equal(typeof row.code, "string", "each code is carried machine-readably rather than only inside a sentence");
        assert.ok(triggerCommand.cli.render(first).includes(row.code), "and the human rendering states the same code beside its message");
      }
    },
  },

  // ══════ 04_the-shipped-declaration-actually-resolves.feature ══════
  {
    name: "trigger/04 the declaration this repository ships resolves something",
    async run() {
      const workspace = await loadWorkspace(repoRoot);
      const report = await buildTriggerReport({}, { workspace, trigger: { registry: { getCommand, invoke } } });
      assert.ok(report.resolved.length > 0, "at least one declared trigger resolves");
      for (const row of report.resolved) {
        assert.equal(typeof row.trigger.id, "string", "the answer names that trigger");
        assert.equal(typeof row.scope, "string", "its scope");
        assert.equal(typeof row.level, "string", "its level");
        assert.ok(Array.isArray(row.argv) && row.argv.length > 0, "and its argv");
      }
      assert.equal(triggerCommand.cli.exit(report), 0, "the run exits successfully");
    },
  },
  {
    name: "trigger/04 every declared source has a trigger that resolves",
    async run() {
      const workspace = await loadWorkspace(repoRoot);
      const report = await buildTriggerReport({}, { workspace, trigger: { registry: { getCommand, invoke } } });
      assert.deepEqual(report.sources.map((row) => row.source), [...TRIGGER_SOURCES], "every source the vocabulary declares is named");
      for (const row of report.sources) {
        assert.ok(row.declared.length > 0, `${row.source} has at least one declared trigger`);
        assert.ok(row.resolved.length > 0, `at least one trigger under ${row.source} resolves`);
      }
      for (const row of report.resolved) {
        assert.ok(TRIGGER_SOURCES.includes(row.trigger.source), `${row.trigger.id} is named with the source it was declared under`);
      }
    },
  },
  {
    name: "trigger/04 what every resolved trigger over the shipped declaration carries",
    async run() {
      const workspace = await loadWorkspace(repoRoot);
      const report = await buildTriggerReport({}, { workspace, trigger: { registry: { getCommand, invoke } } });
      const route = getCommand(LOOP_ID).cli.route;
      for (const row of report.resolved) {
        // its scope is one the loop's own scope forms admit
        assert.equal(decideLoopScope(row.scope).admitted, true, `${row.trigger.id}: its scope is one the loop's own scope forms admit`);
        // its argv begins with the loop's own route, and names a registered command
        assert.deepEqual(row.argv.slice(0, route.length), [...route], `${row.trigger.id}: its argv begins with the loop's own route`);
        assert.ok(getCommand(LOOP_ID) != null, `${row.trigger.id}: the command its argv names is one the registry answers for`);
        // its level is one the loop's own level vocabulary carries — read from the frozen set
        // that IS that vocabulary, never substring-matched out of a prose flag description, which
        // would keep passing on the day the ladder changed and the sentence did not.
        assert.ok(LOOP_LEVELS.includes(row.level), `${row.trigger.id}: its level is one the loop's own level vocabulary carries (${LOOP_LEVELS.join(", ")})`);
        // its level is one this workspace's gate would not refuse
        const facts = Object.fromEntries((report.gate.readings ?? []).filter((reading) => reading.present === true).map((reading) => [reading.fact, reading.reading]));
        assert.equal(resolveTriggerLevel({ id: row.trigger.id, level: row.level }, facts).resolved, true, `${row.trigger.id}: its level is one this workspace's gate would not refuse`);
        // it carries no admission that the run may proceed
        assert.deepEqual(Object.keys(row).sort(), [...RESOLVED_TRIGGER_KEYS].sort(), `${row.trigger.id}: it carries no admission that the run may proceed`);
      }
    },
  },
  {
    name: "trigger/04 every declared trigger either resolves or refuses",
    async run() {
      const workspace = await loadWorkspace(repoRoot);
      const report = await buildTriggerReport({}, { workspace, trigger: { registry: { getCommand, invoke } } });
      const answered = [...report.resolved.map((row) => row.trigger.id), ...report.refused.map((row) => row.trigger?.id)];
      assert.deepEqual(answered.sort(), [...report.declaration.declared].sort(), "every declared trigger appears in it");
      for (const row of report.refused) {
        assert.equal(typeof row.code, "string", `${row.trigger?.id}: a refusal carrying a code`);
        if (row.requestedLevel !== undefined && row.code === "loop-level-gate") {
          assert.ok(Array.isArray(row.failingHalves) && row.failingHalves.length > 0, `${row.trigger.id}: a refusal for a declared level names the failing half of its gate`);
        }
      }
      const both = report.resolved.filter((row) => report.refused.some((other) => other.trigger?.id === row.trigger.id));
      assert.deepEqual(both, [], "none of them is reported as neither, and none as both");
    },
  },
  {
    name: "trigger/04 a gap is named, never counted",
    async run() {
      // a declared source has no declared trigger → that source, by name
      const noTrigger = await run({}, { declaration: declarationOf([member({ source: "cron" })]), ...silentRegistry() });
      const undeclared = noTrigger.gaps.filter((gap) => gap.code === "trigger-source-undeclared");
      assert.deepEqual(undeclared.map((gap) => gap.source).sort(), ["ci-signal", "feedback-finding", "mesh-assignment"], "each source with no declared trigger is named");
      for (const gap of undeclared) assert.doesNotMatch(gap.message, /\d/u, "and no figure stands in place of that name");

      // a declared source's triggers all refuse → that source, and each of its triggers with its code
      const allRefuse = await run({}, {
        declaration: declarationOf([member({ id: "a", level: "L3" }), member({ id: "b", level: "L3" })]),
        ...recordingRegistry({ answers: failingGate() }),
      });
      const unresolved = allRefuse.gaps.find((gap) => gap.code === "trigger-source-unresolved");
      assert.equal(unresolved.source, "cron", "that source is named");
      assert.deepEqual(unresolved.triggers, [{ id: "a", code: "loop-level-gate" }, { id: "b", code: "loop-level-gate" }], "and each of its triggers with its code");

      // a declared trigger neither resolves nor refuses → that trigger, by id
      const accounted = await run({}, { declaration: declarationOf(everySource()), ...silentRegistry() });
      const seen = [...accounted.resolved.map((row) => row.trigger.id), ...accounted.refused.map((row) => row.trigger?.id)];
      const neither = accounted.declaration.declared.filter((id) => !seen.includes(id));
      assert.deepEqual(neither, [], "any trigger that was neither would be named by id here");

      // a resolved trigger's scope matches no admitted form → that trigger, its scope, and the forms
      const badScope = await run({}, {
        compiled: { version: 1, triggers: [{ id: "story-scoped", protects: "x", source: "cron", scope: "63/01", level: "L1" }] },
        ...silentRegistry(),
      });
      assert.deepEqual(badScope.resolved, [], "such a trigger never reaches the resolved side");
      assert.equal(badScope.refused[0].trigger.id, "story-scoped", "that trigger is named");
      assert.equal(badScope.refused[0].requestedScope, "63/01", "its scope is named");
      assert.deepEqual(badScope.refused[0].admits.map((form) => form.id), ["driver", "range"], "and the forms that are admitted");

      // a resolved trigger's argv names an unregistered command → that trigger, and the command
      const noLoop = await run({}, {
        declaration: declarationOf([member()]),
        ...recordingRegistry({ answers: {}, unregistered: [LOOP_ID] }),
      });
      assert.equal(noLoop.failure.code, "trigger-loop-command-unregistered", "an argv naming an unregistered command is never composed");
      assert.equal(noLoop.failure.command, LOOP_ID, "and the command its argv would have named is named");

      // a refusal carries no code → that trigger, and that its refusal named no code
      const codes = allRefuse.refused.map((row) => row.code);
      assert.deepEqual(codes.filter((code) => typeof code !== "string"), [], "every refusal carries a code");
    },
  },
  {
    name: "trigger/04 the answer names the declaration it read",
    async run() {
      const workspace = await loadWorkspace(repoRoot);
      const report = await buildTriggerReport({}, { workspace, trigger: { registry: { getCommand, invoke } } });
      assert.equal(report.declaration.path, path.join(repoRoot, ".aof", "triggers.jsonc"), "it names the declaration it read");
      // What it read is the INSTALLED declaration a consumer of this tool would get: the bundled
      // source and the installed copy carry the same members.
      const bundled = JSON.parse((await readFile(BUNDLED_DECLARATION, "utf8")).replace(/^\s*\/\/[^\r\n]*(?:\r?\n|$)/u, ""));
      assert.deepEqual(report.declaration.declared, bundled.members.map((entry) => entry.id), "and it is the installed copy of what this tool ships");
      assert.equal(report.declaration.version, bundled.version, "carrying the shipped version");
    },
  },
  {
    name: "trigger/04 nothing in the answer has to be updated when the declaration grows",
    async run() {
      const root = await mkdtemp(path.join(os.tmpdir(), "aof-trigger-grown-"));
      try {
        await mkdir(path.join(root, ".aof"), { recursive: true });
        await mkdir(path.join(root, "wiki", "work"), { recursive: true });
        await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" } }, null, 2)}\n`, "utf8");
        await cp(BUNDLED_DECLARATION, path.join(root, ".aof", "triggers.jsonc"));
        const workspace = await loadWorkspace(root);
        const before = await buildTriggerReport({}, { workspace, trigger: { registry: { getCommand, invoke } } });
        // …carrying one more trigger than it did.
        const grown = JSON.parse((await readFile(BUNDLED_DECLARATION, "utf8")).replace(/^\s*\/\/[^\r\n]*(?:\r?\n|$)/u, ""));
        grown.members.push(member({ id: "one-more", source: "cron", scope: "50-63" }));
        await writeFile(path.join(root, ".aof", "triggers.jsonc"), `${JSON.stringify(grown, null, 2)}\n`, "utf8");
        const after = await buildTriggerReport({}, { workspace, trigger: { registry: { getCommand, invoke } } });
        assert.ok(after.declaration.declared.includes("one-more"), "that trigger is named among what was read");
        const row = after.resolved.find((entry) => entry.trigger.id === "one-more");
        assert.ok(row != null, "and it appears as a resolution");
        assert.deepEqual(Object.keys(row).sort(), [...RESOLVED_TRIGGER_KEYS].sort(), "in the same shape as every other");
        assert.equal(after.resolved.length, before.resolved.length + 1, "no statement in the answer contradicts the declaration having grown");
        assert.deepEqual(after.gaps, before.gaps, "and no expected figure had to be changed for the answer to be right");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "trigger/04 a declaration that resolves nothing is legible as exactly that",
    async run() {
      const declaration = declarationOf([
        member({ id: "a", source: "cron", level: "L3" }),
        member({ id: "b", source: "ci-signal", level: "L3" }),
      ]);
      const report = await run({}, { declaration, ...recordingRegistry({ answers: failingGate() }) });
      assert.match(report.headline.summary, /^no declared trigger resolves/u, "it states that no declared trigger resolves");
      const unresolved = report.gaps.filter((gap) => gap.code === "trigger-source-unresolved");
      assert.deepEqual(unresolved.map((gap) => gap.source), ["cron", "ci-signal"], "it names each source for which nothing resolved");
      for (const gap of unresolved) {
        for (const entry of gap.triggers) assert.equal(entry.code, "loop-level-gate", "it names the refusal code standing in the way of each");
      }
      // The sentence it produces is not one a declaration that resolves would also produce.
      const resolving = await run({}, { declaration: declarationOf([member({ id: "a" }), member({ id: "b", source: "ci-signal" })]), ...silentRegistry() });
      assert.notEqual(report.headline.summary, resolving.headline.summary, "the sentence differs");
      assert.match(resolving.headline.summary, /^resolved /u, "a resolving run says so");
      assert.doesNotMatch(resolving.headline.summary, /no declared trigger resolves/u, "and never the other sentence");
    },
  },

  {
    name: "trigger/04 a gap is a reading of the WHOLE declaration, so a narrowed run states none",
    async run() {
      // The face suppresses gaps when a run was narrowed to one trigger or matched to one signal,
      // and nothing held that: removing the suppression left every test green while a narrowed
      // run claimed "No declared trigger names source ci-signal" about a declaration that has one.
      // A gap is what someone reads at accept to decide what to go and fix, so a gap the caller's
      // own narrowing manufactured is worse than none.
      const declaration = declarationOf([member({ id: "cron-wake", source: "cron" }), member({ id: "ci-wake", source: "ci-signal" })]);
      const whole = await run({}, { declaration, ...silentRegistry() });
      const undeclared = whole.gaps.filter((gap) => gap.code === "trigger-source-undeclared").map((gap) => gap.source);
      assert.deepEqual(undeclared.sort(), ["feedback-finding", "mesh-assignment"], "the whole-declaration run names the sources that really have no trigger");

      for (const [what, input] of [
        ["narrowed to one trigger", { trigger: "cron-wake" }],
        ["matched to one signal", { signal: { source: "ci-signal", ref: "63" } }],
      ]) {
        const narrowed = await run(input, { declaration, ...silentRegistry() });
        assert.deepEqual(narrowed.gaps, [], `a run ${what} states no gap`);
        assert.doesNotMatch(
          JSON.stringify(narrowed.gaps),
          /ci-signal|cron/u,
          `and never claims a source the caller's own narrowing left out is undeclared (${what})`,
        );
        // …while still answering for what it was asked about, so the suppression is not a silence.
        assert.equal(narrowed.resolved.length + narrowed.refused.length, 1, `a run ${what} still answers`);
      }
    },
  },

  // ═════ the registration census this story owns (63/ADR-008 §6, §7) ═════
  {
    name: "trigger/registration work:trigger ships no bundle command, and the parity guard's own scope is what exempts it",
    async run() {
      // 63/ADR-008 §6: the CLI↔bundle parity control (m41/R5) is REGISTRY-DERIVED and scoped to
      // the `work:insert-*` family, so `work:trigger` is outside its domain by construction
      // rather than by a carve-out list this story had to edit. Pinned here so the claim the
      // command-core comment makes is one a test would notice breaking.
      const { readDescriptor } = await import("../../src/work/bundle.mjs");
      assert.equal("work:trigger".startsWith("work:insert-"), false, "work:trigger is not a member of the insert family the parity guard covers");
      const commandMembers = readDescriptor().members.filter((entry) => entry.kind === "command").map((entry) => entry.id);
      assert.equal(commandMembers.includes("trigger"), false, "and it ships no /aof:trigger bundle command");
      // …which is the shape every other read/report face on this registry already takes.
      for (const sibling of ["acceptor", "audit", "grade", "counters", "ratchet", "tune"]) {
        assert.equal(commandMembers.includes(sibling), false, `work:${sibling} ships without one too`);
      }
      // Every member of the family the guard DOES cover still has its wrapper, so the exemption
      // is a scope and not a hole.
      for (const command of listCommands().filter((entry) => entry.id.startsWith("work:insert-"))) {
        assert.ok(commandMembers.includes(command.id.slice("work:".length)), `${command.id} still ships its bundle command`);
      }
    },
  },
];
