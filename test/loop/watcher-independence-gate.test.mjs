import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loopsValidateCommand } from "../../src/commands/loops-validate.mjs";
import {
  CHECK_FINDING_CODES,
  GATING_CODES,
  checkPairing,
} from "../../src/work/loops-checks.mjs";
import { withLoopRegistry } from "../support/loop-registry-fixture.mjs";
import { examplesTables, scenarioTitles } from "../support/feature-parse.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = path.join(root, "test", "fixtures-that-do-not-exist", "loops");
const taskDir = path.join(root, "wiki", "work", "archive", "57_milestone_paired-loops", "stories", "01_story_independence-and-the-gate", "tasks");
const nodePath = (id) => path.join(source, `${id.replaceAll(":", "-")}.md`);
const endpoint = (raw) => ({ raw, scheme: raw.slice(0, raw.indexOf(":")), operand: raw.slice(raw.indexOf(":") + 1), resolved: true });

function authority(raw) {
  if (raw.startsWith("prose:")) return { key: "measurement", raw, kind: "prose", path: raw.slice(6) };
  const colon = raw.indexOf(":");
  return {
    key: "measurement",
    raw,
    kind: "pointer",
    pointer: { scheme: raw.slice(0, colon), operand: raw.slice(colon + 1) },
  };
}

function loopNode(id, options = {}) {
  return {
    id,
    kind: "loop",
    title: id,
    path: nodePath(id),
    fields: {
      controlled: { key: "controlled", raw: options.controlled ?? "scenarios green", kind: "phrase" },
      measurement: (options.measurement ?? ["module:src/work.mjs#validateWork"]).map(authority),
      actuator: (options.actuator ?? ["prose:src/bundle/agents/aof-developer.md"]).map(authority),
      optimizing: { key: "optimizing", raw: String(options.optimizing ?? true), kind: "flag", value: options.optimizing ?? true },
    },
    edges: options.edges ?? {},
  };
}

function watcherNode(id, options = {}) {
  return {
    id,
    kind: "watcher",
    title: id,
    path: nodePath(id),
    fields: {
      counter: { key: "counter", raw: options.counter ?? "contract shrink events", kind: "phrase" },
      determinism: { key: "determinism", raw: options.determinism ?? "counter", kind: "enum", value: options.determinism ?? "counter" },
      measurement: (options.measurement ?? ["command:work:ratchet"]).map(authority),
    },
    edges: { monitoring: (options.watches ?? []).map(endpoint) },
  };
}

const model = (nodes) => ({ source, present: true, findings: [], nodes });
const withCode = (findings, code) => findings.filter((finding) => finding.code === code);

function loopRecord(stem, { optimizing = true, layer = "management" } = {}) {
  return `---
id: loop:${stem}
kind: loop
title: ${stem}
controlled: scenarios green
reference: [module:src/work.mjs#validateWork]
measurement: [module:src/work.mjs#validateWork]
actuator: [prose:src/bundle/agents/aof-developer.md]
cadence: event:per-item
ceiling: none
owner: actor:product-owner
optimizing: ${String(optimizing)}
layer: ${layer}
---
# ${stem}
`;
}

/** The admissible reference source 58/ADR-001 §1 requires — an actor, and this one is grounded. */
function ownerRecord(stem, target) {
  return `---
id: actor:${stem}
kind: actor
title: ${stem}
ground: exogenous
target-setting: [loop:${target}]
---
# ${stem}
`;
}

function watcherRecord(stem, target) {
  return `---
id: watcher:${stem}
kind: watcher
title: ${stem}
counter: contract shrink events
determinism: counter
measurement: [command:work:ratchet]
monitoring: [loop:${target}]
---
# ${stem}
`;
}

// ————— MILESTONE 58 / STORY 02: THE SUPERVISION TRACEABILITY LEG —————————————————————————————
//
// 57's leg above binds four task features to four task-numbered suites by counting. 58/02's six
// features are spread across FIVE authorities — this suite, two arch gates, and the checks suite —
// because ADR-005 §3 deliberately lands the milestone's new behaviour inside the SIX existing
// checks rather than in a seventh, and ADR-007 §3 assigns the reddened suites by name. A count
// alone would therefore not say who decides what, so each Examples block names its authority by
// TEST NAME and every name is RESOLVED against the array that exports it: a pointer at a test that
// no longer exists is exactly how a coverage claim quietly becomes fiction (52/05's ledger rule).
const TASKS_5802 = path.join(
  root, "wiki", "work", "archive", "58_milestone_supervising-loops",
  "stories", "02_story_layer-separation-and-the-gate", "tasks",
);

// The five authorities, each a module exporting an array of `{ name, run }`.
const AUTHORITIES_5802 = Object.freeze({
  checks: "./work-loops-checks.test.mjs",
  // 119/03 — `test/arch/` has subject directories now and all three of these gates live under
  // `test/arch/loop/`. The specifiers were `./arch/...`, which resolved from this suite's own
  // directory to `test/loop/arch/` — a directory that has never existed. It failed at import
  // rather than silently, which is what a traceability map naming its authorities by path buys.
  arbiter: "../arch/loop/acd-arbiter-records-the-tradeoff.test.mjs",
  envelope: "../arch/loop/acd-loop-finding-envelope.test.mjs",
  timescale: "../arch/loop/acd-loop-timescale-comparability.test.mjs",
  gate: null, // this module
});

const CHECKS_AXIS = "loops-checks table 58/02 00_a-supervisor-runs-at-a-slower-layer[0,1,2]: which axis decides a supervising edge";
const CHECKS_CORROBORATION = "loops-checks table 58/02 00_a-supervisor-runs-at-a-slower-layer[3,4]: a declared layer read against the cadence that would corroborate it";
const CHECKS_CROSSING = "loops-checks table 58/02 01_one-boundary-per-edge[0,1,2]: which crossings the rule admits, which ends it needs, and which edge key it governs";
const CHECKS_ENTITLEMENT = "loops-checks table 58/02 02_only-an-arbiter-arbitrates[0]: who may clear a shared actuator, and on what coverage";
const CHECKS_SOURCES = "loops-checks table 58/02 03_an-inadmissible-owner-is-refused[0]: which sources may set a reference";
const ARBITER_PRIORITY = "arch/58 FF-5805: an arbiter's priority is a permutation of its own veto set, and no arbiter declares target-setting";
const ARBITER_MEMBERSHIP = "arch/58 FF-5805: isGraphNode accepts every member of NODE_KINDS, so no declared kind is filtered out of the traversals";
const ENVELOPE_GATING = "arch/57 FF-5703: the frozen gating set alone controls check severity and only the face owns exit";
const ENVELOPE_CODE_TABLE = "arch/52 FF-5209: the literal lane/severity table is reachable with exact anchors and ordering";

/**
 * Every scenario and every Examples row of 58/02's six task features, bound to the authority that
 * decides it. `scenarios` and each block's `rows` are parsed from the feature on disk, so a
 * scenario or a row added, deleted or moved reddens this leg instead of silently going undriven.
 */
const TRACED_5802 = [
  {
    file: "00_a-supervisor-runs-at-a-slower-layer.feature",
    scenarios: 11,
    blocks: [
      { rows: 12, by: CHECKS_AXIS, in: "checks" },
      { rows: 6, by: CHECKS_AXIS, in: "checks" },
      { rows: 5, by: CHECKS_AXIS, in: "checks" },
      { rows: 12, by: CHECKS_CORROBORATION, in: "checks" },
      { rows: 5, by: CHECKS_CORROBORATION, in: "checks" },
    ],
  },
  {
    file: "01_one-boundary-per-edge.feature",
    scenarios: 10,
    blocks: [
      { rows: 9, by: CHECKS_CROSSING, in: "checks" },
      { rows: 3, by: CHECKS_CROSSING, in: "checks" },
      { rows: 5, by: CHECKS_CROSSING, in: "checks" },
    ],
  },
  {
    file: "02_only-an-arbiter-arbitrates.feature",
    scenarios: 11,
    blocks: [
      { rows: 15, by: CHECKS_ENTITLEMENT, in: "checks" },
      { rows: 7, by: ARBITER_PRIORITY, in: "arbiter" },
    ],
  },
  {
    file: "03_an-inadmissible-owner-is-refused.feature",
    scenarios: 12,
    blocks: [
      { rows: 11, by: CHECKS_SOURCES, in: "checks" },
    ],
  },
  {
    file: "04_the-structural-codes-stop-the-run.feature",
    scenarios: 9,
    blocks: [
      { rows: 8, by: ENVELOPE_GATING, in: "envelope" },
      { rows: 3, by: ENVELOPE_GATING, in: "envelope" },
      { rows: 10, by: ENVELOPE_CODE_TABLE, in: "envelope" },
      { rows: 6, by: ENVELOPE_CODE_TABLE, in: "envelope" },
    ],
  },
  {
    file: "05_an-arbiter-is-a-node-the-checks-can-see.feature",
    scenarios: 8,
    blocks: [
      { rows: 4, by: ARBITER_MEMBERSHIP, in: "arbiter" },
      { rows: 2, by: ARBITER_MEMBERSHIP, in: "arbiter" },
      { rows: 5, by: ARBITER_MEMBERSHIP, in: "arbiter" },
    ],
  },
];

// The additivity claim has ONE home and it is not a task table: `FF-5802` owns it, and this suite's
// own gating case owns the promoted severity set. Both are named so the traceability leg states the
// whole map rather than only the half that happens to be table-driven.
const STANDING_AUTHORITIES_5802 = [
  { name: "arch/58 FF-5802: the layer axis is additive over the frozen cadence axis, decides only where both ends declare one, and derives no duration", in: "timescale" },
  { name: "watcher-independence/03 severity is frozen by code and the face alone decides failure", in: "gate" },
];

export const watcherIndependenceGateTests = [
  {
    name: "watcher-independence/00 overlap is exact, per pair, deduplicated, and still counts as pairing",
    run: async () => {
      const shared = "module:src/optimizer.mjs#score";
      const watched = loopNode("loop:watched", { measurement: [shared, shared] });
      const other = loopNode("loop:other", { measurement: ["module:src/other.mjs#score"] });
      const watcher = watcherNode("watcher:audit", {
        measurement: [shared, shared, "command:work:ratchet"],
        watches: [watched.id, other.id],
      });
      const findings = checkPairing(model([watched, other, watcher]));
      const overlaps = withCode(findings, "loop-watcher-shares-measurement");
      assert.equal(overlaps.length, 1, "duplicates and a second disjoint loop do not duplicate the pair finding");
      assert.match(overlaps[0].message, /watcher:audit/);
      assert.match(overlaps[0].message, /loop:watched/);
      assert.match(overlaps[0].message, /module:src\/optimizer\.mjs#score/);
      assert.equal(withCode(findings, "loop-unpaired-optimizer").some((finding) => finding.path === watched.path), false,
        "an overlapping watcher is structurally paired even though its independence finding gates");

      const disjoint = watcherNode("watcher:disjoint", { watches: [other.id] });
      assert.equal(withCode(checkPairing(model([other, disjoint])), "loop-watcher-shares-measurement").length, 0);

      const missingPaths = watcherNode("watcher:missing-paths", {
        measurement: ["module:does/not/exist.mjs#score"],
        watches: [other.id],
      });
      assert.deepEqual(
        checkPairing(model([other, missingPaths])),
        checkPairing(model([other, missingPaths])),
        "pointer resolution and filesystem state are outside the pure check",
      );
    },
  },
  {
    name: "watcher-independence/01 judges are always visible and shared maker authority is checked per pair",
    run: async () => {
      const maker = "prose:src/bundle/agents/aof-developer.md";
      const first = loopNode("loop:first", { actuator: [maker] });
      const second = loopNode("loop:second", { actuator: ["prose:src/bundle/agents/aof-architect.md"] });
      const shared = watcherNode("watcher:shared", { determinism: "judge", measurement: [maker], watches: [first.id, second.id] });
      const independent = watcherNode("watcher:independent", {
        determinism: "judge",
        measurement: ["prose:src/bundle/agents/aof-qa.md"],
        watches: [first.id],
      });
      const deterministic = watcherNode("watcher:counter", { watches: [first.id] });
      const findings = checkPairing(model([first, second, shared, independent, deterministic]));
      const conflicts = withCode(findings, "loop-watcher-shares-actuator");
      assert.equal(conflicts.length, 1);
      assert.match(conflicts[0].message, /watcher:shared/);
      assert.match(conflicts[0].message, /loop:first/);
      assert.match(conflicts[0].message, /aof-developer\.md/);
      const judges = withCode(findings, "loop-watcher-is-judge");
      assert.deepEqual(judges.map((finding) => finding.path).sort(), [shared.path, independent.path].sort());
      assert.ok(judges.every((finding) => finding.severity === "warn"), "the judge census never gates");
      assert.equal(judges.some((finding) => finding.path === deterministic.path), false);
    },
  },
  {
    name: "watcher-independence/02 the counter differs after normalization and deterministic measurement is executable-only",
    run: async () => {
      const watched = loopNode("loop:watched", { controlled: "  Scenarios   Green  " });
      const equal = watcherNode("watcher:equal", { counter: "scenarios green", watches: [watched.id] });
      const different = watcherNode("watcher:different", { counter: "contract shrink events", watches: [watched.id] });
      const invalid = watcherNode("watcher:invalid", {
        measurement: ["config:work.autonomous.maxAttempts", "prose:wiki/metric.md"],
        watches: [watched.id],
      });
      const executable = watcherNode("watcher:executable", {
        measurement: ["command:work:ratchet", "module:src/work/ratchet.mjs#evaluateRatchet"],
        watches: [watched.id],
      });
      const judge = watcherNode("watcher:judge", { determinism: "judge", measurement: ["prose:wiki/metric.md"], watches: [watched.id] });
      const findings = checkPairing(model([watched, equal, different, invalid, executable, judge]));
      assert.deepEqual(withCode(findings, "loop-counter-equals-controlled").map((finding) => finding.path), [equal.path]);
      const rejected = withCode(findings, "loop-counter-not-deterministic");
      assert.equal(rejected.length, 2, "config and prose are each named as contradictory authorities");
      assert.ok(rejected.every((finding) => finding.path === invalid.path));
      assert.ok(rejected.some((finding) => finding.message.includes("config:work.autonomous.maxAttempts")));
      assert.ok(rejected.some((finding) => finding.message.includes("prose:wiki/metric.md")));
      assert.equal(rejected.some((finding) => finding.path === executable.path || finding.path === judge.path), false,
        "command/module counters hold and judge prose is outside the deterministic claim");
    },
  },
  {
    name: "watcher-independence/03 severity is frozen by code and the face alone decides failure",
    run: async () => {
      assert.deepEqual([...GATING_CODES], [
        "loop-unpaired-optimizer",
        "loop-watcher-shares-measurement",
        "loop-watcher-shares-actuator",
        "loop-counter-equals-controlled",
        "loop-counter-not-deterministic",
        "loop-unowned-reference",
        "loop-target-setting-not-admitted",
        "loop-shared-actuator-unarbitrated",
        "loop-arbiter-priority-incomplete",
        "loop-timescale-inversion",
        "loop-layer-inversion",
        "loop-layer-undeclared",
        "loop-layer-contradicts-cadence",
      ]);
      for (const code of GATING_CODES) assert.ok(CHECK_FINDING_CODES.has(code), `${code}: declared check code`);

      await withLoopRegistry({ "subject.md": loopRecord("subject") }, async (fixture) => {
        const result = await loopsValidateCommand.run({}, { workspace: { workDir: fixture.workDir, aofDir: fixture.workDir } });
        const gate = result.findings.find((finding) => finding.code === "loop-unpaired-optimizer");
        assert.equal(gate?.severity, "error");
        const beforeExit = JSON.stringify(result);
        assert.equal(loopsValidateCommand.cli.exit(result), 1);
        assert.equal(JSON.stringify(result), beforeExit, "the face's exit decision does not mutate or replace the result");

        const machine = loopsValidateCommand.cli.json(result);
        const human = loopsValidateCommand.cli.render(result);
        for (const finding of machine.findings) {
          assert.ok(human.includes(`${finding.severity} · ${finding.code}`), `${finding.code}: human and JSON faces expose the same severity`);
        }
      });

      await withLoopRegistry({
        "subject.md": loopRecord("subject"),
        "watcher.md": watcherRecord("watcher", "subject"),
        "owner.md": ownerRecord("owner", "subject"),
      }, async (fixture) => {
        const result = await loopsValidateCommand.run({}, { workspace: { workDir: fixture.workDir, aofDir: fixture.workDir } });
        assert.equal(result.summary.error, 0);
        assert.equal(loopsValidateCommand.cli.exit(result), 0);
      });
    },
  },
  {
    name: "watcher-independence/03 aof validate carries the loop registry as its own deterministic gate",
    run: async () => {
      const text = await readFile(path.join(root, "src", "bundle", "commands", "validate.md"), "utf8");
      const structural = text.indexOf("aof work validate $ARGUMENTS");
      const loops = text.indexOf("aof work loops validate");
      const doctor = text.indexOf("aof work doctor $ARGUMENTS");
      assert.ok(structural >= 0 && loops > structural && doctor > loops, "the separate deterministic steps have a fixed order");
      assert.match(text, /Loop registry gate[\s\S]*aof work loops validate[\s\S]*non-zero exit must be surfaced/);
      assert.match(text, /Run `aof work loops validate` as a separate\s+deterministic step/u,
        "the loop gate is not smuggled into work validate");
    },
  },
  {
    name: "watcher-independence/traceability all 30 scenarios and 16 example rows map to the four task suites",
    run: async () => {
      const expected = [
        ["00_a-watcher-that-reads-the-optimizers-own-number.feature", 7, 0],
        ["01_the-maker-does-not-grade-itself.feature", 7, 0],
        ["02_the-counter-is-a-different-quantity.feature", 8, 4],
        ["03_an-unpaired-optimizer-fails-the-run.feature", 8, 12],
      ];
      let scenarios = 0;
      let rows = 0;
      for (const [file, expectedScenarios, expectedRows] of expected) {
        const text = await readFile(path.join(taskDir, file), "utf8");
        assert.match(text, /^@executable\b/mu, `${file}: executable contract`);
        const ownScenarios = scenarioTitles(text).length;
        const ownRows = examplesTables(text).reduce((sum, table) => sum + table.rows.length, 0);
        assert.equal(ownScenarios, expectedScenarios, `${file}: every scenario maps to its task-numbered suite above`);
        assert.equal(ownRows, expectedRows, `${file}: every Examples row maps to the same table-driven assertions`);
        scenarios += ownScenarios;
        rows += ownRows;
      }
      assert.deepEqual({ scenarios, rows }, { scenarios: 30, rows: 16 });
    },
  },
  {
    name: "watcher-independence/traceability 58/02's six features map to five named authorities, and every one of them resolves",
    run: async () => {
      // WHAT THIS DECIDES, and what it deliberately does not: it decides that every scenario and
      // every Examples row of 58/02 is ACCOUNTED FOR by a test that exists, and that the counts on
      // both sides agree. It does not re-assert those tests' claims — duplicating an invariant is
      // the thing 52/05's acceptance forbids, and the whole reason the map is stated instead.
      const resolved = new Map();
      const namesOf = async (key) => {
        if (resolved.has(key)) return resolved.get(key);
        const suite = AUTHORITIES_5802[key] == null
          ? watcherIndependenceGateTests
          : Object.values(await import(AUTHORITIES_5802[key])).find(Array.isArray);
        assert.ok(Array.isArray(suite) && suite.length > 0, `${key}: the authority module exports a non-empty test array`);
        const names = new Set(suite.map((entry) => entry.name));
        resolved.set(key, names);
        return names;
      };

      let scenarios = 0;
      let rows = 0;
      let blocks = 0;
      for (const traced of TRACED_5802) {
        const text = await readFile(path.join(TASKS_5802, traced.file), "utf8");
        assert.match(text, /^@executable\b/mu, `${traced.file}: executable contract`);
        assert.equal(scenarioTitles(text).length, traced.scenarios, `${traced.file}: every scenario is accounted for above`);
        const parsed = examplesTables(text);
        assert.equal(parsed.length, traced.blocks.length, `${traced.file}: one bound entry per Examples block`);
        for (const [index, block] of traced.blocks.entries()) {
          assert.equal(parsed[index].rows.length, block.rows, `${traced.file}[${index}]: the block's own row count`);
          assert.ok((await namesOf(block.in)).has(block.by), `${traced.file}[${index}]: its authority resolves — ${block.by}`);
          blocks += 1;
          rows += block.rows;
        }
        scenarios += traced.scenarios;
      }
      for (const standing of STANDING_AUTHORITIES_5802) {
        assert.ok((await namesOf(standing.in)).has(standing.name), `the standing authority resolves — ${standing.name}`);
      }
      assert.deepEqual({ scenarios, blocks, rows }, { scenarios: 61, blocks: 18, rows: 128 });

      // NON-VACUITY: the map spans FIVE distinct authorities, so it cannot be satisfied by pointing
      // every block at one test, and a name that does not exist is reported rather than ignored.
      assert.equal(new Set([...TRACED_5802.flatMap((t) => t.blocks), ...STANDING_AUTHORITIES_5802].map((entry) => entry.in)).size, 5);
      assert.equal((await namesOf("checks")).has("loops-checks table 58/02 a test that does not exist"), false);
    },
  },
];
