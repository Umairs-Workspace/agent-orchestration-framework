import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { registrationSurface, suiteFilesBelow } from "../../support/registration/registration-surface.mjs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

import { LOADER_FINDING_CODES, loadLoops } from "../../../src/work/loops.mjs";
import {
  CHECK_FINDING_CODES, CHECK_IDS, GATING_CODES, checkActuatorArbitration, checkAnchorGrounding, checkGrounding, checkPairing,
  checkReferenceOwnership, checkTimescale,
} from "../../../src/work/loops-checks.mjs";
import { loopsValidateCommand } from "../../../src/commands/loops-validate.mjs";

const runFile = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CHECK_NAMES = Object.freeze({
  grounding: "checkGrounding",
  "anchor-grounding": "checkAnchorGrounding",
  pairing: "checkPairing",
  "reference-ownership": "checkReferenceOwnership",
  "actuator-arbitration": "checkActuatorArbitration",
  timescale: "checkTimescale",
});
const checks = { checkGrounding, checkAnchorGrounding, checkPairing, checkReferenceOwnership, checkActuatorArbitration, checkTimescale };
const CODE_TABLE = Object.freeze([
  ["loop-record-unparseable", "error", "loader"],
  ["loop-missing-field", "error", "loader"],
  ["loop-bad-value", "error", "loader"],
  ["loop-expected-list", "error", "loader"],
  ["loop-expected-scalar", "error", "loader"],
  ["loop-empty-list", "error", "loader"],
  ["loop-unknown-key", "error", "loader"],
  ["loop-key-not-admitted-for-kind", "error", "loader"],
  ["loop-malformed-frontmatter-line", "error", "loader"],
  ["loop-id-mismatch", "error", "loader"],
  ["loop-graph-dangling-endpoint", "error", "loader"],
  ["loop-owner-unknown", "warn", "loader"],
  ["loop-cadence-unknown", "warn", "loader"],
  ["loop-ceiling-unknown", "warn", "loader"],
  ["loop-ceiling-uncapped", "warn", "loader"],
  ["loop-ceiling-pointer-unresolved", "error", "loader"],
  ["loop-field-prose-only", "warn", "loader"],
  ["loop-graph-ungrounded-component", "warn", "check"],
  ["loop-graph-grounded-exogenous-only", "warn", "check"],
  ["loop-anchor-absent", "warn", "check"],
  ["loop-anchor-stale", "warn", "check"],
  ["loop-counter-equals-controlled", "error", "check"],
  ["loop-counter-not-deterministic", "error", "check"],
  ["loop-unpaired-optimizer", "error", "check"],
  ["loop-unowned-reference", "error", "check"],
  ["loop-target-setting-not-admitted", "error", "check"],
  ["loop-layer-undeclared", "error", "check"],
  ["loop-layer-contradicts-cadence", "error", "check"],
  ["loop-self-referential-edge", "warn", "check"],
  ["loop-shared-actuator-unarbitrated", "error", "check"],
  ["loop-arbiter-priority-incomplete", "error", "check"],
  ["loop-timescale-inversion", "error", "check"],
  ["loop-timescale-not-comparable", "warn", "check"],
  ["loop-layer-inversion", "error", "check"],
  ["loop-layer-skipped", "warn", "check"],
  ["loop-watcher-is-judge", "warn", "check"],
  ["loop-watcher-shares-actuator", "error", "check"],
  ["loop-watcher-shares-measurement", "error", "check"],
]);
const endpoint = (raw, resolved = true) => ({ raw, scheme: raw.split(":")[0], operand: raw.slice(raw.indexOf(":") + 1), resolved });
const SCOPE_RANK = Object.freeze({ "per-run-start": 0, "per-phase": 0, "per-item": 1, "per-milestone": 2 });
const LAYER_RANK = Object.freeze({ operational: 0, management: 1, governance: 2 });
const cadence = (kind, value) => kind === "periodic"
  ? { kind, ms: value, raw: `periodic:${value}ms` }
  : { kind, trigger: value, raw: kind === "event" ? `event:${value}` : "unknown", ...(kind === "event" ? { scopeRank: SCOPE_RANK[value] } : {}) };
const layer = (value) => ({ key: "layer", raw: value, kind: "enum", value, rank: LAYER_RANK[value] });

function graphNode(id, kind = "loop", options = {}) {
  return {
    id, kind, title: id, path: path.join(root, `${id.replace(/[^A-Za-z0-9]/g, "-")}.md`),
    fields: {
      cadence: options.cadence ?? cadence("event", "per-item"),
      optimizing: { kind: "flag", value: options.optimizing ?? false },
      actuator: [{ kind: "pointer", raw: options.actuator ?? `command:${id}` }],
      ...(options.ground ? { ground: { kind: "enum", value: "exogenous" } } : {}),
      ...(options.fields ?? {}),
    },
    edges: options.edges ?? {},
  };
}

const checkModels = {
  grounding: { source: path.join(root, "loops"), nodes: [
    graphNode("actor:root", "actor", { ground: true, edges: { "target-setting": [endpoint("loop:grounded")] } }),
    graphNode("loop:grounded"), graphNode("loop:isolated"),
  ] },
  "anchor-grounding": { source: path.join(root, "loops"), nodes: [
    {
      ...graphNode("anchor:stale", "anchor"),
      fields: {
        ground: { kind: "enum", value: "frozen-rule" },
        observes: { kind: "pointer", raw: "config:missing.rule", resolved: false },
      },
      edges: { "data-feed": [endpoint("loop:stale")] },
    },
    graphNode("loop:stale", "loop", { edges: { monitoring: [endpoint("anchor:stale")] } }),
    graphNode("loop:free"),
  ] },
  pairing: { source: path.join(root, "loops"), nodes: [
    graphNode("loop:pair", "loop", { optimizing: true, edges: { monitoring: [endpoint("loop:pair")] } }),
    graphNode("loop:watched", "loop", { fields: {
      controlled: { kind: "phrase", raw: "scenarios green" },
      measurement: [{ kind: "prose", raw: "prose:agent.md" }],
      actuator: [{ kind: "prose", raw: "prose:agent.md" }],
    } }),
    graphNode("watcher:counter", "watcher", { fields: {
      counter: { kind: "phrase", raw: "contract shrink events" },
      determinism: { kind: "enum", value: "counter" },
      measurement: [{ kind: "pointer", raw: "config:metric.key", pointer: { scheme: "config", operand: "metric.key" } }],
    }, edges: { monitoring: [endpoint("loop:watched")] } }),
    graphNode("watcher:judge", "watcher", { fields: {
      counter: { kind: "phrase", raw: "SCENARIOS   GREEN" },
      determinism: { kind: "enum", value: "judge" },
      measurement: [{ kind: "prose", raw: "prose:agent.md" }],
    }, edges: { monitoring: [endpoint("loop:watched")] } }),
  ] },
  "reference-ownership": { source: path.join(root, "loops"), nodes: [
    graphNode("loop:owner", "loop", { edges: { "target-setting": [endpoint("loop:owner")] } }),
    graphNode("loop:fabricated", "loop", { cadence: cadence("event", "per-phase"), fields: { layer: layer("governance") } }),
    graphNode("watcher:setter", "watcher", { edges: { "target-setting": [endpoint("loop:owner")] } }),
  ] },
  "actuator-arbitration": { source: path.join(root, "loops"), nodes: [
    graphNode("loop:a", "loop", { actuator: "command:shared" }),
    graphNode("loop:b", "loop", { actuator: "command:shared" }),
    graphNode("arbiter:partial", "arbiter", { fields: { priority: [{ key: "priority", raw: "loop:b", kind: "ref" }] }, edges: { veto: [endpoint("loop:a")] } }),
  ] },
  timescale: { source: path.join(root, "loops"), nodes: [
    graphNode("loop:fast", "loop", { cadence: cadence("periodic", 10_000), edges: { "target-setting": [endpoint("loop:faster"), endpoint("loop:event")] } }),
    graphNode("loop:faster", "loop", { cadence: cadence("periodic", 5_000) }),
    graphNode("loop:event", "loop", { cadence: cadence("event", "per-item") }),
    graphNode("loop:governor", "loop", { cadence: cadence("event", "per-milestone"), fields: { layer: layer("governance") }, edges: { "target-setting": [endpoint("loop:worker")] } }),
    graphNode("loop:peer", "loop", { cadence: cadence("event", "per-phase"), fields: { layer: layer("operational") }, edges: { "target-setting": [endpoint("loop:worker")] } }),
    graphNode("loop:worker", "loop", { cadence: cadence("event", "per-phase"), fields: { layer: layer("operational") } }),
  ] },
};

const checkOracle = {
  grounding: [
    { code: "loop-graph-grounded-exogenous-only", severity: "warn", path: checkModels.grounding.source, message: "Component [actor:root] is grounded by exogenous ground only" },
    { code: "loop-graph-grounded-exogenous-only", severity: "warn", path: checkModels.grounding.source, message: "Component [loop:grounded] is grounded by exogenous ground only" },
    { code: "loop-graph-ungrounded-component", severity: "warn", path: checkModels.grounding.source, message: "Component [loop:isolated] has no path from exogenous ground" },
  ],
  "anchor-grounding": [
    { code: "loop-anchor-absent", severity: "warn", path: graphNode("loop:free").path, message: "loop:free has no inbound data-feed edge from an anchor" },
    { code: "loop-anchor-stale", severity: "warn", path: checkModels["anchor-grounding"].source, message: "Component [anchor:stale, loop:stale] is stale because config:missing.rule no longer resolves" },
  ],
  pairing: [
    { code: "loop-self-referential-edge", severity: "warn", path: graphNode("loop:pair").path, message: "loop:pair declares a self-referential monitoring edge" },
    { code: "loop-unpaired-optimizer", severity: "error", path: graphNode("loop:pair").path, message: "loop:pair is optimizing without inbound monitoring from another node" },
    { code: "loop-counter-not-deterministic", severity: "error", path: graphNode("watcher:counter").path, message: "watcher:counter declares deterministic counting but cites config:metric.key" },
    { code: "loop-counter-equals-controlled", severity: "error", path: graphNode("watcher:judge").path, message: "watcher:judge counter equals loop:watched controlled value after normalization" },
    { code: "loop-watcher-is-judge", severity: "warn", path: graphNode("watcher:judge").path, message: "watcher:judge uses a model judge" },
    { code: "loop-watcher-shares-actuator", severity: "error", path: graphNode("watcher:judge").path, message: "watcher:judge judges loop:watched through shared actuator prose:agent.md" },
    { code: "loop-watcher-shares-measurement", severity: "error", path: graphNode("watcher:judge").path, message: "watcher:judge shares measurement prose:agent.md with loop:watched" },
  ],
  "reference-ownership": [
    { code: "loop-layer-contradicts-cadence", severity: "error", path: graphNode("loop:fabricated").path, message: "loop:fabricated declares layer governance at rank 2 against a cadence whose scope rank is 0" },
    { code: "loop-unowned-reference", severity: "error", path: graphNode("loop:fabricated").path, message: "loop:fabricated has no inbound target-setting edge from another node" },
    { code: "loop-layer-undeclared", severity: "error", path: graphNode("loop:owner").path, message: "loop:owner declares no layer" },
    { code: "loop-self-referential-edge", severity: "warn", path: graphNode("loop:owner").path, message: "loop:owner declares a self-referential target-setting edge" },
    // AN INADMISSIBLE SOURCE CONFERS NOTHING, so the watcher's edge leaves loop:owner unowned and
    // both facts are reported — they do not cancel (ADR-001 §1).
    { code: "loop-unowned-reference", severity: "error", path: graphNode("loop:owner").path, message: "loop:owner has no inbound target-setting edge from another node" },
    { code: "loop-target-setting-not-admitted", severity: "error", path: graphNode("watcher:setter", "watcher").path, message: "watcher:setter is a watcher and may not set the reference of loop:owner" },
  ],
  "actuator-arbitration": [
    { code: "loop-arbiter-priority-incomplete", severity: "error", path: graphNode("arbiter:partial", "arbiter").path, message: "arbiter:partial declares a priority that omits [loop:a], names [loop:b] it does not veto" },
    { code: "loop-shared-actuator-unarbitrated", severity: "error", path: checkModels["actuator-arbitration"].source, message: "Actuator command:shared is shared by [loop:a, loop:b] without a non-member arbiter" },
  ],
  timescale: [
    { code: "loop-timescale-inversion", severity: "error", path: graphNode("loop:fast").path, message: "loop:fast (periodic:10000ms) target-sets loop:faster (periodic:5000ms) at directed period ratio 2" },
    { code: "loop-timescale-not-comparable", severity: "warn", path: graphNode("loop:fast").path, message: "loop:fast target-sets loop:event; non-clock cadence: loop:event (event:per-item)" },
    { code: "loop-layer-skipped", severity: "warn", path: graphNode("loop:governor").path, message: "loop:governor (layer governance) target-sets loop:worker (layer operational) across 2 layer boundaries" },
    { code: "loop-layer-inversion", severity: "error", path: graphNode("loop:peer").path, message: "loop:peer (layer operational) target-sets loop:worker (layer operational) from no slower layer" },
  ],
};

function record(stem, changes = []) {
  let text = `---\nid: loop:${stem}\nkind: loop\ntitle: ${stem}\ncontrolled: state\nreference: [prose:a.md]\nmeasurement: [prose:a.md]\nactuator: [prose:a.md]\ncadence: event:per-item\nceiling: none\nowner: unknown\noptimizing: false\n---\n# ${stem}\n`;
  for (const [from, to] of changes) text = text.replace(from, to);
  return text;
}

async function materialise(temp) {
  const dir = path.join(temp, "loops"); await mkdir(dir);
  const records = {
    bad: record("bad", [["event:per-item", "event:per-eclipse"]]),
    "bad-two": record("bad-two", [["event:per-item", "event:per-eclipse"]]),
    dangling: record("dangling", [["optimizing: false\n", "optimizing: false\ndata-feed: [loop:absent]\n"]]),
    empty: record("empty", [["reference: [prose:a.md]", "reference: []"]]),
    expectedlist: record("expectedlist", [["actuator: [prose:a.md]", "actuator: command:work:next"]]),
    expectedscalar: record("expectedscalar", [["controlled: state", "controlled: [a, b]"]]),
    malformed: record("malformed", [["optimizing: false\n", "optimizing: false\nveto/constraint: [loop:x]\n"]]),
    mismatch: record("mismatch", [["id: loop:mismatch", "id: loop:other"]]),
    missing: record("missing", [["actuator: [prose:a.md]\n", ""]]),
    unknownkey: record("unknownkey", [["optimizing: false\n", "optimizing: false\ndepends: [50]\n"]]),
    wrongkind: record("wrongkind", [["optimizing: false\n", "optimizing: false\nground: exogenous\n"]]),
    cadenceunknown: record("cadenceunknown", [["event:per-item", "unknown"]]),
    ceilingunknown: record("ceilingunknown", [["ceiling: none", "ceiling: unknown"]]),
    uncapped: record("uncapped", [["ceiling: none", "ceiling: uncapped"]]),
    unresolved: record("unresolved", [["ceiling: none", "ceiling: [config:work.loop.absent]"]]),
  };
  for (const [name, text] of Object.entries(records)) await writeFile(path.join(dir, `${name}.md`), text);
  await writeFile(path.join(dir, "zz-unparseable.md"), "# no frontmatter\n");
  return dir;
}

function orderedRecord(id) {
  return `---\nid: ${id}\nkind: loop\ntitle: ${id}\ncontrolled: state\nreference: [prose:a.md]\nmeasurement: [prose:a.md]\nactuator: [prose:a.md]\ncadence: event:per-item\nceiling: none\nowner: unknown\noptimizing: false\n---\n# ${id}\n`;
}

function upperOrderRecord() {
  return `---\nid: loop:A\nkind: loop\ntitle: upper\ncontrolled: state\nreference: [bad:first, bad:second]\nmeasurement: [prose:a.md]\nactuator: [prose:a.md]\ncadence: event:per-item\nceiling: none\nowner: unknown\noptimizing: false\nbad first\nbad second\nzeta: x\nalpha: y\n---\n# upper\n`;
}

async function materialiseOrder(temp, reverse = false) {
  const dir = path.join(temp, "loops"); await mkdir(dir);
  const files = [
    ["z-unparseable.md", "# absent\n"], ["a-unparseable.md", "# absent\n"],
    ["upper.md", upperOrderRecord()], ["lower.md", orderedRecord("loop:a")],
    ["dash.md", orderedRecord("loop:a-b")], ["dot.md", orderedRecord("loop:a.b")],
  ];
  for (const [name, text] of reverse ? files.reverse() : files) await writeFile(path.join(dir, name), text);
  return dir;
}

function publicFinding(code, severity, findingPath, message) { return { code, severity, path: findingPath, message }; }

function ordinaryNodeOracle(file, id) {
  const p = path.join(file, `${id === "loop:a" ? "lower" : id === "loop:a-b" ? "dash" : "dot"}.md`);
  return [
    publicFinding("loop-id-mismatch", "error", p, `id ${id} must equal loop:${path.basename(p, ".md")}`),
    publicFinding("loop-field-prose-only", "warn", p, "reference is backed only by prose: prose:a.md"),
    publicFinding("loop-field-prose-only", "warn", p, "measurement is backed only by prose: prose:a.md"),
    publicFinding("loop-field-prose-only", "warn", p, "actuator is backed only by prose: prose:a.md"),
    publicFinding("loop-owner-unknown", "warn", p, "owner is declared unknown"),
  ];
}

function orderOracle(dir) {
  const upper = path.join(dir, "upper.md");
  return [
    publicFinding("loop-record-unparseable", "error", path.join(dir, "a-unparseable.md"), "Loop record must start with a frontmatter block"),
    publicFinding("loop-record-unparseable", "error", path.join(dir, "z-unparseable.md"), "Loop record must start with a frontmatter block"),
    publicFinding("loop-malformed-frontmatter-line", "error", upper, "Malformed frontmatter line 13: bad first"),
    publicFinding("loop-malformed-frontmatter-line", "error", upper, "Malformed frontmatter line 14: bad second"),
    publicFinding("loop-id-mismatch", "error", upper, "id loop:A must equal loop:upper"),
    publicFinding("loop-bad-value", "error", upper, "Invalid value for reference: bad:first"),
    publicFinding("loop-bad-value", "error", upper, "Invalid value for reference: bad:second"),
    publicFinding("loop-field-prose-only", "warn", upper, "measurement is backed only by prose: prose:a.md"),
    publicFinding("loop-field-prose-only", "warn", upper, "actuator is backed only by prose: prose:a.md"),
    publicFinding("loop-owner-unknown", "warn", upper, "owner is declared unknown"),
    publicFinding("loop-unknown-key", "error", upper, "Unknown loop-record key: alpha"),
    publicFinding("loop-unknown-key", "error", upper, "Unknown loop-record key: zeta"),
    ...ordinaryNodeOracle(dir, "loop:a"),
    ...ordinaryNodeOracle(dir, "loop:a-b"),
    ...ordinaryNodeOracle(dir, "loop:a.b"),
  ];
}

function assertEnvelope(findings) {
  assert.ok(findings.length > 0);
  for (const finding of findings) {
    assert.deepEqual(Object.keys(finding).sort(), ["code", "message", "path", "severity"]);
    assert.ok(path.isAbsolute(finding.path));
    assert.equal(typeof finding.message, "string"); assert.ok(finding.message.length > 0);
  }
}

export const archTests = [
  {
    name: "arch/52 FF-5209: the literal lane/severity table is reachable with exact anchors and ordering",
    run: async () => {
      assert.equal(CODE_TABLE.length, 38); assert.equal(new Set(CODE_TABLE.map(([code]) => code)).size, 38);
      assert.deepEqual(LOADER_FINDING_CODES, CODE_TABLE.filter(([, , lane]) => lane === "loader").map(([code]) => code));
      assert.deepEqual([...CHECK_FINDING_CODES].sort(), CODE_TABLE.filter(([, , lane]) => lane === "check").map(([code]) => code).sort());
      assert.deepEqual(CHECK_IDS, Object.keys(CHECK_NAMES));

      const temp = await mkdtemp(path.join(os.tmpdir(), "aof-loop-envelope-"));
      try {
        await materialise(temp);
        const model = await loadLoops(temp);
        const checkFindings = [];
        const actual = {};
        for (const id of CHECK_IDS) {
          const output = checks[CHECK_NAMES[id]](checkModels[id]);
          actual[id] = output;
          assert.deepEqual(output, checkOracle[id], `${id}: exact findings and declaring/whole-graph anchors`);
          assert.deepEqual(output, [...output].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : a.code < b.code ? -1 : a.code > b.code ? 1 : a.message < b.message ? -1 : a.message > b.message ? 1 : 0), `${id}: sorted by (path, code, message)`);
          checkFindings.push(...output);
        }
        const combined = [...model.findings, ...checkFindings];
        assertEnvelope(combined);
        // OS-NATIVE, not merely absolute (04_finding-envelope.feature:56-62). `path.isAbsolute`
        // alone is satisfied by `C:/x` on Windows, so a loader that forward-slashed every anchor
        // would pass the clause meant to catch exactly that. `path.sep` is the discriminator.
        for (const finding of model.findings) {
          assert.ok(finding.path.includes(path.sep), `${finding.code}: the loader anchors in OS-native form (${JSON.stringify(path.sep)}-separated), not forward-slashed — ${finding.path}`);
        }
        const table = new Map(CODE_TABLE.map(([code, severity, lane]) => [code, { severity, lane }]));
        const emitted = new Set();
        combined.forEach((finding, index) => {
          const expected = table.get(finding.code); assert.ok(expected, `undeclared code ${finding.code}`);
          assert.equal(finding.severity, expected.severity, `${finding.code}: exact severity`);
          assert.equal(expected.lane, index < model.findings.length ? "loader" : "check", `${finding.code}: exact lane`);
          emitted.add(finding.code);
        });
        assert.deepEqual([...emitted].sort(), CODE_TABLE.map(([code]) => code).sort(), "all 38 literal codes are reachable");

        const badValues = model.findings.filter((f) => f.code === "loop-bad-value" && ["bad.md", "bad-two.md"].includes(path.basename(f.path)));
        // Node-`id` order, code-unit lexicographic (ADR-013 §1) — `loop:bad` is a prefix of
        // `loop:bad-two`, so it sorts FIRST. Deliberately NOT the file order (`bad-two.md` <
        // `bad.md`, since `-` 0x2D < `.` 0x2E): the two disagree here on purpose, which is what
        // makes this pair evidence that the lane orders by node id and not by path.
        assert.deepEqual(badValues.map((f) => path.basename(f.path)), ["bad.md", "bad-two.md"], "same-code records retain their own declaring file anchors in node-id order");
        // The whole-graph check anchors the REGISTRY DIRECTORY of its own model (a component is a
        // fact about the graph, not about any one record), so its path is `model.source` and never
        // a `.md` — the exact contrast with the per-edge findings asserted below.
        //
        // RUN OVER `actual`, NEVER OVER THE ORACLE. The oracle's paths are written as
        // `checkModels[id].source` in this file, so the same predicate over `checkOracle` is true
        // BY CONSTRUCTION — it re-reads the expression it was built from and could not fail. ADR-011
        // §7's `path` rule is TERNARY and BOTH whole-graph scopes are named in it ("SCC, arbitration
        // sets"), so both are swept: grounding and actuator-arbitration.
        const WHOLE_GRAPH_CODES = new Set([
          "loop-graph-ungrounded-component", "loop-graph-grounded-exogenous-only", "loop-anchor-stale",
          "loop-shared-actuator-unarbitrated",
        ]);
        for (const id of ["grounding", "actuator-arbitration"]) {
          const wholeGraph = actual[id].filter((f) => WHOLE_GRAPH_CODES.has(f.code));
          assert.ok(wholeGraph.length > 0, `${id}: the whole-graph sweep fired, so the anchor claim below is non-vacuous`);
          assert.ok(
            wholeGraph.every((f) => f.path === checkModels[id].source && !f.path.endsWith(".md")),
            `${id}: every whole-graph finding anchors the loops DIRECTORY, not a member node's file (ADR-011 §7)`,
          );
          assert.ok(
            actual[id].filter((f) => !WHOLE_GRAPH_CODES.has(f.code)).every((f) => f.path.endsWith(".md")),
            `${id}: …and every per-record finding in the same lane anchors the record that carries the defect`,
          );
        }
        const perEdge = [...actual.pairing, ...actual["reference-ownership"], ...actual.timescale];
        assert.ok(perEdge.length > 0, "the per-edge sweep fired, so the declaring-file claim below is non-vacuous");
        assert.ok(perEdge.every((f) => f.path.endsWith(".md")), "per-edge self/timescale findings anchor declaring files");

        // THE ORDER IS ASSERTED AT THE SITE THAT ACTUALLY CONCATENATES. Everything above orders
        // this TEST's own `[...model.findings, ...checkFindings]`, which is a fact about this file
        // and not about the product: `04_finding-envelope.feature:110-126` says the findings are
        // concatenated "the way the command concatenates them", and that "an unordered
        // concatenation fails the gate even when the finding SET is right". Measured on this tree,
        // making `src/commands/loops-validate.mjs` iterate `[...CHECK_IDS].reverse()`, or emit the
        // check lane before the loader lane, left all nineteen gates green. So the real command is
        // driven over the SAME fixture and its `findings` compared with the frozen concatenation.
        const commandResult = await loopsValidateCommand.run({}, { workspace: { workDir: temp, aofDir: temp } });
        const commandBytes = JSON.stringify(commandResult);
        assert.equal(loopsValidateCommand.cli.exit(commandResult), 1, "the face fails when the unchanged result reports an error");
        assert.equal(JSON.stringify(commandResult), commandBytes, "reading the face exit leaves the run result byte-identical");
        const fixtureCheckLane = CHECK_IDS.flatMap((id) => checks[CHECK_NAMES[id]](model));
        assert.deepEqual(
          commandResult.findings,
          [...model.findings, ...fixtureCheckLane],
          "work:loops-validate emits the LOADER lane first, then the checks in CHECK_IDS order (ADR-012 §3/C6, completed by ADR-013 §1)",
        );
        assert.deepEqual(Object.keys(commandResult.summary.checks), CHECK_IDS, "the check lane's order IS `summary.checks` order — the same sequence the feature names");
        // "NOT RELATIVISED INSIDE THE COMMAND" (04_finding-envelope.feature:61) is a claim about the
        // command RESULT, and ADR-012 §11/D5 as ratified draws the line exactly here: "the *command
        // result* is basis-neutral raw absolute (08/ADR-002); the *face* projects every path it
        // prints — `source`, `Finding.path` and `Node.path` alike". So `cli.json`'s `displayPath()`
        // is the face doing its job, and what must be asserted is that `run()` never did it first.
        for (const finding of commandResult.findings) {
          assert.ok(path.isAbsolute(finding.path) && finding.path.includes(path.sep), `${finding.code}: work:loops-validate's RESULT carries a raw OS-native absolute — relativisation belongs to the face alone (ADR-012 §11/D5)`);
        }
        assert.ok(path.isAbsolute(commandResult.source), "the result's `source` is a raw absolute too — the same rule, not a per-field exception");
        // Non-vacuity, in the two directions the mutations took. If the fixture could not
        // distinguish them, the deepEqual above would be an expensive tautology.
        const reversedLane = [...CHECK_IDS].reverse().flatMap((id) => checks[CHECK_NAMES[id]](model));
        assert.notDeepEqual([...model.findings, ...reversedLane], commandResult.findings, "the fixture DISTINGUISHES a reversed CHECK_IDS iteration — the lane order above is measured, not assumed");
        assert.notDeepEqual([...fixtureCheckLane, ...model.findings], commandResult.findings, "the fixture DISTINGUISHES a check-lane-first emission — loader-lane-first is measured, not assumed");
        assert.ok(fixtureCheckLane.length > 0 && new Set(fixtureCheckLane.map((f) => f.code)).size > 1, "more than one check fired over the fixture, which is what makes their ORDER observable at all");

        const loaderUrl = pathToFileURL(path.join(root, "src/work/loops.mjs")).href;
        const checksUrl = pathToFileURL(path.join(root, "src/work/loops-checks.mjs")).href;
        const script = `import {loadLoops} from ${JSON.stringify(loaderUrl)}; import * as c from ${JSON.stringify(checksUrl)}; const models=${JSON.stringify(checkModels)}; const ids=${JSON.stringify(CHECK_IDS)}; const names=${JSON.stringify(CHECK_NAMES)}; const m=await loadLoops(${JSON.stringify(temp)}); console.log(JSON.stringify([...m.findings,...ids.flatMap(id=>c[names[id]](models[id]))]));`;
        const { stdout } = await runFile(process.execPath, ["--input-type=module", "--eval", script]);
        assert.equal(stdout.trim(), JSON.stringify(combined), "fresh-process bytes match the CHECK_IDS-ordered oracle");
      } finally { await rm(temp, { recursive: true, force: true }); }
    },
  },
  {
    name: "arch/57 FF-5703: the frozen gating set alone controls check severity and only the face owns exit",
    run: async () => {
      // 57's five keep their positions and 58/ADR-005 §1's eight are appended, so "nothing
      // inherited moves" is readable off the literal rather than argued for.
      const expected = [
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
      ];
      assert.deepEqual([...GATING_CODES], expected);
      assert.equal(GATING_CODES.size, 13, "eight codes joined 57's five and the set reaches thirteen");
      for (const code of GATING_CODES) assert.ok(CHECK_FINDING_CODES.has(code), `${code}: every gating code is a declared CHECK code — the loader's severities are untouched`);
      assert.equal(CHECK_FINDING_CODES.size, 21, "the check lane's vocabulary reaches 21 codes");
      for (const code of ["loop-layer-skipped", "loop-timescale-not-comparable"]) {
        assert.equal(GATING_CODES.has(code), false, `${code}: a preference and an honest cannot-decide never stop the run`);
      }
      const size = GATING_CODES.size;
      assert.equal(GATING_CODES.add("loop-self-referential-edge"), GATING_CODES);
      assert.equal(GATING_CODES.delete(expected[0]), false);
      GATING_CODES.clear();
      assert.equal(GATING_CODES.size, size, "the literal gating set resists mutation");

      for (const [code, severity, lane] of CODE_TABLE) {
        if (lane !== "check") continue;
        assert.equal(severity, GATING_CODES.has(code) ? "error" : "warn", `${code}: severity is derived only from frozen membership`);
      }

      const checksSource = await readFile(path.join(root, "src/work/loops-checks.mjs"), "utf8");
      const commandSource = await readFile(path.join(root, "src/commands/loops-validate.mjs"), "utf8");
      assert.match(checksSource, /severity:\s*GATING_CODES\.has\(code\)\s*\?\s*"error"\s*:\s*"warn"/u);
      assert.doesNotMatch(checksSource, /function finding\([^)]*\)\s*\{\s*return \{ code, severity: "warn"/u,
        "the finding constructor no longer hardcodes one severity");
      assert.match(commandSource, /exit:\s*\(result\)\s*=>\s*\(result\.summary\.error\s*>\s*0\s*\?\s*1\s*:\s*0\)/u);
      assert.doesNotMatch(checksSource, /\bexit\b/u, "the pure check module decides no process exit");
    },
  },
  {
    name: "arch/52 FF-5209: loader total order is independent of directory order and fixed by a literal oracle",
    run: async () => {
      const firstTemp = await mkdtemp(path.join(os.tmpdir(), "aof-loop-order-a-"));
      const secondTemp = await mkdtemp(path.join(os.tmpdir(), "aof-loop-order-b-"));
      try {
        const firstDir = await materialiseOrder(firstTemp, false);
        const secondDir = await materialiseOrder(secondTemp, true);
        const first = await loadLoops(firstTemp);
        const second = await loadLoops(secondTemp);
        // THE DIRECTORY-ORDER INVARIANT IS CARRIED BY THE LITERAL ORACLE ON THIS LINE, not by the
        // second fixture below: `orderOracle` fixes one total order that no read order can produce
        // by accident, and the loader is held to it.
        assert.deepEqual(first.findings, orderOracle(firstDir), "unparseable paths, code-unit node ids, malformed lines, keys and entries have one total order");
        const normalize = (values) => values.map((finding) => ({ ...finding, path: path.basename(finding.path) }));
        // THE SECOND FIXTURE PROVES WHAT IT CAN, AND ITS MESSAGE SAYS SO. Its files are WRITTEN in
        // the reverse order, but `readdir` returns names in name order regardless of creation
        // order, so this is not a shuffled DIRECTORY READ and must not claim to be one. What it
        // does prove is real and separate: a registry materialised under a different root, with a
        // different creation/mtime order, yields the same findings once the path prefix is removed
        // — so no finding, and no position, is a function of the directory it was loaded from.
        assert.deepEqual(normalize(second.findings), normalize(first.findings), "a second registry, materialised under a different root in a different creation order, yields identical findings modulo its path prefix");
        const loaderUrl = pathToFileURL(path.join(root, "src/work/loops.mjs")).href;
        const script = `import {loadLoops} from ${JSON.stringify(loaderUrl)}; console.log(JSON.stringify((await loadLoops(${JSON.stringify(firstTemp)})).findings));`;
        const { stdout } = await runFile(process.execPath, ["--input-type=module", "--eval", script]);
        assert.equal(stdout.trim(), JSON.stringify(orderOracle(firstDir)), "fresh-process loader bytes equal the literal total-order oracle");
      } finally {
        await rm(firstTemp, { recursive: true, force: true });
        await rm(secondTemp, { recursive: true, force: true });
      }
    },
  },
  {
    // SCOPE: this story's nine suites and their two labelled blocks in `scripts/test.mjs`.
    // The REPO-WIDE "every suite on disk is imported by a runner" invariant is NOT re-implemented
    // here — it has one home, `test/arch/testing/acd-test-suite-registration.test.mjs` (m43 / ADR-014 E7),
    // which owns its own shrink-only baseline. A second copy with its own hardcoded baseline would
    // mean two homes for one invariant, and would redden a LOOP gate the day somebody converts an
    // unrelated suite. `04_finding-envelope.feature:179` asks that that gate report no new orphan —
    // which it does, from its own file, and it is registered in the same runner as these nine.
    name: "arch/52 FF-5209: the isolated m52 runner blocks are exact and every suite is registered exactly once",
    run: async () => {
      const dir = path.join(root, "test/arch");
      const expectedFiles = [
        "acd-loop-registry-not-an-item-type.test.mjs", "acd-loop-module-import-boundary.test.mjs",
        "acd-loop-vocabulary-closed.test.mjs", "acd-loop-records-parse.test.mjs",
        "acd-loop-checks-pure.test.mjs", "acd-loop-timescale-comparability.test.mjs",
        "acd-loop-command-route-only.test.mjs", "acd-loop-render-deterministic.test.mjs",
        "acd-loop-finding-envelope.test.mjs",
      ];
      const expectedAliases = [
        "acdLoopRegistryNotAnItemTypeTests", "acdLoopModuleImportBoundaryTests", "acdLoopVocabularyClosedTests",
        "acdLoopRecordsParseTests", "acdLoopChecksPureTests", "acdLoopTimescaleComparabilityTests",
        "acdLoopCommandRouteOnlyTests", "acdLoopRenderDeterministicTests", "acdLoopFindingEnvelopeTests",
      ];
      // 119/03 — recursive, and matched on the LEAF: `test/arch/` has subject directories now and
      // the nine gates live under `test/arch/loop/`. A flat listing returned none of them.
      const files = (await suiteFilesBelow(dir)).filter((rel) => rel.split("/").pop().startsWith("acd-loop-")).sort();
      assert.ok(files.length >= expectedFiles.length, `the acd-loop-* sweep was non-vacuous: ${files.length} files`);
      const leaves = new Set(files.map((rel) => rel.split("/").pop()));
      for (const file of expectedFiles) assert.ok(leaves.has(file), `${file}: milestone 52's own gate remains present; later milestones may share the namespace (53/ADR-015 §8)`);
      const pathOf = (leaf) => files.find((rel) => rel.split("/").pop() === leaf);
      const runner = await readFile(path.join(root, "scripts/test.mjs"), "utf8");
      const surface = await registrationSurface(root);
      const unitRunner = await readFile(path.join(root, "scripts/test-unit.mjs"), "utf8");
      for (const file of expectedFiles) {
        const module = await import(pathToFileURL(path.join(dir, pathOf(file))).href);
        assert.ok(Array.isArray(module.archTests) && module.archTests.length > 0, file);
        for (const entry of module.archTests) {
          assert.equal(typeof entry.name, "string"); assert.ok(entry.name.length > 0);
          assert.equal(typeof entry.run, "function"); assert.equal(Object.hasOwn(entry, "fn"), false);
        }
        assert.equal(unitRunner.includes(file), false, `${file}: registration has one runner home`);
      }

      // ── 119/03 AMENDMENT: the labelled m52 block is dissolved by the subject partition ───────
      // These lines pinned the nine imports and nine spreads as one labelled, contiguous, POSITIONAL
      // block in `scripts/test.mjs`. Since 119/03 the registry names DIRECTORIES and every suite is
      // registered by the index of the directory that owns it, so there is no block to be
      // contiguous in. The claim the block carried — each of the nine registered EXACTLY ONCE, in
      // one place, in this order — is asserted here against the index that owns them, which is
      // stronger about ownership and silent about adjacency, the property that no longer exists.
      const loopIndex = await readFile(path.join(root, "test", "arch", "loop", "index.mjs"), "utf8");
      const indexLines = loopIndex.split(/\r?\n/);
      const importedOrder = indexLines
        .filter((line) => /^import \{ archTests as acdLoop/.test(line))
        .map((line) => line.match(/from "\.\/([^"]+)"/)?.[1]);
      for (const file of expectedFiles) {
        assert.equal(importedOrder.filter((name) => name === file).length, 1, `${file}: imported exactly once by its own directory's index`);
      }
      for (const alias of expectedAliases) {
        assert.equal(indexLines.filter((line) => line.trim() === `...${alias},`).length, 1, `${alias}: spread exactly once by its own directory's index`);
      }

      // EXACTLY ONCE, FILE-WIDE — not merely once inside the labelled block. The block assertions
      // above are position-local: a DUPLICATE import or a second spread anywhere else in
      // `scripts/test.mjs` leaves them green while the suite runs twice, which is the mirror of
      // m35/R4's near-miss ("bindings imported but never spread are silently-dead fitness
      // functions") — a suite counted twice is as wrong a measurement as one counted never, and a
      // gate whose failures are reported twice is read as two defects.
      const occurrences = (text, needle) => text.split(needle).length - 1;
      for (const file of expectedFiles) {
        assert.equal(occurrences(surface, `/${file}"`), 1, `${file}: imported EXACTLY once across the registration surface`);
      }
      for (const alias of expectedAliases) {
        assert.equal(occurrences(surface, `...${alias},`), 1, `${alias}: spread EXACTLY once across the registration surface`);
      }
    },
  },
];
