// milestone 52 / story 05 — task 02: THE CHECKS SUITE.
//
// Mechanises all six `@executable` features of 52/01 (115 scenarios, 8 example tables, 132 rows)
// against the six exported subjects of `src/work/loops-checks.mjs`: `decomposeLoopGraph` and the
// five checks. Contract: stories/05_story_behavioural-suites/tasks/02_checks-suite.feature.
//
// THIS SUITE TOUCHES NO FILESYSTEM. Every fixture is a literal `{source, present, nodes, findings}`
// object whose `source` and `Node.path` name locations that do not exist on disk. That is what makes
// the purity claim assertable rather than nominal: the same literal driven from a different working
// directory, under a different environment, and with `present` flipped must produce identical
// findings (`the checks read the model they are handed and nothing else`).
//
// TWO DISCIPLINES RUN THROUGH EVERY CASE, both measured at refine.
//
//  1. THE VACUITY TRAP. Eighteen of the covered scenarios assert an EMPTY result, and all eighteen
//     are green over a check that returns `[]` unconditionally. Every such case therefore carries,
//     IN THE SAME TEST, the same model with one field changed that DOES fire. `VACUITY_CONTROLS`
//     below collects those pairs and drives them as a suite-wide sweep as well.
//
//  2. THE SCOPING RULE. `checkReferenceOwnership` reports `loop-unowned-reference` for EVERY
//     `kind: loop` node with no inbound `target-setting` from another node — so any second loop
//     added to a fixture as a watcher, a setter or an arbiter draws its OWN finding. Every assertion
//     here is scoped by node id or by `path`, never by the length of the findings array, and every
//     assertion that a finding fired names its CODE (a length assertion is green over a check
//     emitting the wrong one).
//
// WHAT IS ALREADY DECIDED AND IS NOT REBUILT HERE. FF-5205 owns the module's source purity, the
// transitive import disjointness, the `CHECK_IDS`-to-function mapping, the arity and byte-stability
// in-process and across processes; FF-5206 owns the exhaustive 6x6 cadence cross-product and the
// out-of-domain sweep; FF-5203 owns the frozen collections' mutation resistance; FF-5209 owns the
// four-key envelope, the 24-code lane/severity table, the five checks' literal oracles and the
// combined loader-then-checks order emitted by the real `work:loops-validate`. Twenty-seven of the
// 115 are theirs or another suite's, each a ledgered `coverage.excluded` entry naming its home.
//
// ADR-005 §2-§3, ADR-007 §3, ADR-011 §1/§8/§9/§10/§12, ADR-012 §3.
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";

import {
  CHECK_FINDING_CODES,
  checkActuatorArbitration,
  checkGrounding,
  checkPairing,
  checkReferenceOwnership,
  checkTimescale,
  decomposeLoopGraph,
} from "../../src/work/loops-checks.mjs";

// ---------------------------------------------------------------------------------------------
// Fixture builders. Literals only — nothing below reads, writes or stats a path.
// ---------------------------------------------------------------------------------------------

// A raw absolute in OS-native form that does not exist. `path.parse(process.cwd()).root` is read
// ONCE, at module load, so the constant survives the working-directory changes the purity test
// makes — a `path.resolve()` here would silently become cwd-dependent and defeat that test.
const FS_ROOT = path.parse(process.cwd()).root;
const SOURCE = path.join(FS_ROOT, "aof-loop-fixture-not-on-disk", "loops");
const filePath = (id) => path.join(SOURCE, `${id.replace(/[^A-Za-z0-9]+/g, "-")}.md`);

function endpoint(raw, resolved) {
  const colon = raw.indexOf(":");
  const scheme = raw.slice(0, colon);
  const operand = raw.slice(colon + 1);
  const intraRegistry = scheme === "loop" || scheme === "actor";
  return {
    raw,
    scheme,
    operand,
    ...(operand.includes("#") ? { symbol: operand.slice(operand.indexOf("#") + 1) } : {}),
    resolved: intraRegistry ? (resolved ?? true) : null,
  };
}

const dangling = (raw) => endpoint(raw, false);

function normaliseEdges(edges) {
  if (!edges) return {};
  const out = {};
  for (const [key, list] of Object.entries(edges)) {
    out[key] = list.map((entry) => (typeof entry === "string" ? endpoint(entry) : entry));
  }
  return out;
}

const periodic = (ms, raw) => ({ kind: "periodic", ms, raw });
// 58/ADR-002 §1 — a trigger carries the SCOPE RANK the loader computed for it, exactly as the
// loader hands it over; a clock carries none, because a clock says nothing about scope. Milestone
// 52's fixtures are unaffected by the addition: the rank is read only where a layer rank is also
// present, and none of them declares a layer.
const SCOPE_RANK = Object.freeze({ "per-run-start": 0, "per-phase": 0, "per-item": 1, "per-milestone": 2 });
const event = (trigger) => ({ kind: "event", trigger, raw: `event:${trigger}`, scopeRank: SCOPE_RANK[trigger] });
const unknownCadence = () => ({ kind: "unknown", raw: "unknown" });

// A loop node as the loader emits it. `actuator` defaults to a per-loop pointer so that adding a
// bystander loop to a fixture can never manufacture an accidental shared-actuator finding.
// 58/ADR-002 §2 — the LAYER as the loader hands it over: the declared value, and the rank a
// comparison will use. The default is UNDECLARED and deliberately so. Every milestone-52 fixture
// in this file declares no layer, which is what keeps that milestone's cadence verdicts reachable
// unchanged; a default layer would put two loops in one layer and turn every 52 timescale fixture
// into a layer inversion, quietly moving the very verdicts `FF-5802` claims are additive. Where a
// 52 case asserts an EXACT finding array over the ownership lane, that case's own subject declares
// a layer — the repair is the fixture, not the expectation (58/ADR-007 §3b).
const LAYER_RANK = Object.freeze({ operational: 0, management: 1, governance: 2 });
const layerField = (value) => ({ key: "layer", raw: value, kind: "enum", value, rank: LAYER_RANK[value] });

function loopNode(id, options = {}) {
  const fields = {
    cadence: options.cadence ?? unknownCadence(),
    optimizing: { kind: "flag", value: options.optimizing === true },
    actuator: (options.actuator ?? [`command:${id}`]).map((raw) => ({
      kind: raw.startsWith("prose:") ? "prose" : "pointer",
      raw,
    })),
  };
  if (options.layer) fields.layer = layerField(options.layer);
  if (options.owner === "unknown") fields.owner = { kind: "unknown", raw: "unknown" };
  else if (typeof options.owner === "string") fields.owner = { kind: "ref", raw: options.owner };
  if (options.ground) fields.ground = { kind: "enum", value: options.ground };
  return { id, kind: "loop", title: id, path: filePath(id), fields, edges: normaliseEdges(options.edges) };
}

/**
 * 58/ADR-003 — an arbiter as the loader emits it. It declares no actuator, no measurement, no
 * cadence and no ground: the kind has no vocabulary in which to say it acts on what it arbitrates.
 * `priority` defaults to the veto set, so a fixture that means to test the ORDER states it.
 */
function arbiterNode(id, options = {}) {
  const veto = options.veto ?? [];
  return {
    id, kind: "arbiter", title: id, path: filePath(id),
    fields: {
      resolves: { kind: "phrase", raw: options.resolves ?? "whose demand wins the shared actuator" },
      dwell: { kind: "cycles", raw: "cycles:2", cycles: 2 },
      priority: (options.priority ?? veto).map((raw) => ({ kind: "ref", raw })),
    },
    edges: normaliseEdges({ veto, ...(options.edges ?? {}) }),
  };
}

/** 55's anchor as the loader emits it — the ground is what decides whether it may own a reference. */
function anchorNode(id, options = {}) {
  return {
    id, kind: "anchor", title: id, path: filePath(id),
    fields: {
      ground: { kind: "enum", value: options.ground ?? "frozen-rule" },
      observes: { kind: "pointer", raw: options.observes ?? "module:src/run-store.mjs#isLegalTransition" },
    },
    edges: normaliseEdges(options.edges),
  };
}

/** 57's watcher, reduced to what the supervision checks read: a kind and its edges. */
function watcherNode(id, options = {}) {
  return {
    id, kind: "watcher", title: id, path: filePath(id),
    fields: {
      counter: { kind: "phrase", raw: options.counter ?? "interventions per run" },
      determinism: { kind: "enum", value: "counter" },
      measurement: [{ kind: "pointer", raw: "command:work:counters" }],
    },
    edges: normaliseEdges(options.edges),
  };
}

function actorNode(id, options = {}) {
  const fields = {};
  if (options.ground) fields.ground = { kind: "enum", value: options.ground };
  return { id, kind: "actor", title: id, path: filePath(id), fields, edges: normaliseEdges(options.edges) };
}

// A record whose `kind` is unusable — ADR-013 §2 suspends every kind-derived check for it, so it is
// not a graph node and its edges pair and own nothing. The only shape in which "an edge declared by
// an endpoint with no record" is expressible in a `Model`.
function unusableNode(id, options = {}) {
  return { id, kind: options.kind ?? "record-unusable", title: id, path: filePath(id), fields: {}, edges: normaliseEdges(options.edges) };
}

const model = (nodes, extra = {}) => ({ source: SOURCE, present: true, findings: [], nodes, ...extra });

// ---------------------------------------------------------------------------------------------
// Scoped observation helpers. Never a bare `findings.length`.
// ---------------------------------------------------------------------------------------------

const codesAt = (findings, node) => findings.filter((f) => f.path === node.path).map((f) => f.code).sort();
const findingsAt = (findings, node) => findings.filter((f) => f.path === node.path);
const hasCodeAt = (findings, code, node) => findings.some((f) => f.code === code && f.path === node.path);
const withCode = (findings, code) => findings.filter((f) => f.code === code);

function componentHolding(components, id) {
  const held = components.filter((component) => component.includes(id));
  assert.equal(held.length, 1, `${id} is a member of exactly one component`);
  return held[0];
}

const COMPONENT_MEMBERS = /^Component \[(.+?)\] /;
function verdicts(findings) {
  return findings.map((finding) => {
    const matched = COMPONENT_MEMBERS.exec(finding.message);
    assert.ok(matched, `a grounding verdict names its component's members: ${finding.message}`);
    return { members: matched[1], code: finding.code };
  });
}
const byMembers = (list) => [...list].sort((a, b) => (a.members < b.members ? -1 : a.members > b.members ? 1 : 0));

const ACTUATOR_CONTENDERS = /^Actuator (.+) is shared by \[(.+)\] without a non-member arbiter(?:; .+)?$/;
function contests(findings) {
  return findings.map((finding) => {
    assert.equal(finding.code, "loop-shared-actuator-unarbitrated");
    const matched = ACTUATOR_CONTENDERS.exec(finding.message);
    assert.ok(matched, `an arbitration finding names its actuator and every contender: ${finding.message}`);
    return { actuator: matched[1], contenders: matched[2] };
  });
}
const byActuator = (list) => [...list].sort((a, b) => (a.actuator < b.actuator ? -1 : a.actuator > b.actuator ? 1 : 0));

// `(path, code, message)` — ADR-012 §3/C6, the frozen order every check returns.
function assertFrozenOrder(findings, label) {
  const compare = (left, right) =>
    left.path < right.path ? -1 : left.path > right.path ? 1
      : left.code < right.code ? -1 : left.code > right.code ? 1
        : left.message < right.message ? -1 : left.message > right.message ? 1 : 0;
  assert.deepEqual(findings, [...findings].sort(compare), `${label}: findings are returned sorted by (path, code, message)`);
}

const CHECKS = Object.freeze([
  ["grounding", checkGrounding],
  ["pairing", checkPairing],
  ["reference-ownership", checkReferenceOwnership],
  ["actuator-arbitration", checkActuatorArbitration],
  ["timescale", checkTimescale],
]);

// Test names live in one place so the coverage ledger's `decided[].test` pointers cannot drift from
// the array; the suite's own meta-test re-checks the correspondence.
const NAME = Object.freeze({
  union: "loops-checks: the decomposition is over the union of all five edge types",
  everyComponent: "loops-checks: the decomposition returns every component, not the first it finds",
  declaredOnly: "loops-checks: only declared nodes are members",
  canonical: "loops-checks: component and member order are canonical",
  groundForward: "loops-checks: ground flows forward out of a ground-bearing actor",
  groundOffActor: "loops-checks: ground off an actor grounds nothing, and neither does an actor without ground",
  perComponent: "loops-checks: a verdict is per component, never per member, and anchors at the graph",
  pairing: "loops-checks: pairing turns on a third party's INBOUND monitoring edge and nothing else",
  ownership: "loops-checks: a named owner never clears an unowned reference",
  selfEdgeAttribution: "loops-checks: a self-edge is attributed to the check that owns its edge type",
  unrelatedSelfEdge: "loops-checks: a self-edge of an unrelated type is not a self-referential finding",
  arbitration: "loops-checks: a shared actuator is arbitrated only by a single non-member covering the whole set",
  actuatorMatching: "loops-checks: actuator matching is exact, scheme-agnostic and counted per actuator",
  timescaleAnchor: "loops-checks: a timescale finding is anchored at the declaring node and names both sides",
  perEdgeExclusion: "loops-checks: the exclusion is per EDGE, never per node",
  timescaleEdges: "loops-checks: the check runs over target-setting edges and reports each of a node's edges in frozen order",
  readsOnlyTheModel: "loops-checks: the checks read the model they are handed and nothing else",
  frozenOrderTiebreak: "loops-checks: the frozen order's `code` component decides, over a fixture where code order and message order disagree",
  controlled: "loops-checks: the suite's negatives are controlled and its subjects are the exported functions",
  tableScc: "loops-checks table 00_scc-decomposition[0]: each declared edge set decomposes to its stated partition",
  tableGrounding: "loops-checks table 01_groundedness-check[0]: each graph shape and ground placement yields its stated verdict per component",
  tableUnpaired: "loops-checks table 02_unpaired-and-unowned[0]: each optimizing/monitoring/owner/target-setting combination yields its stated findings",
  tableArbitration: "loops-checks table 03_shared-actuator-arbitration[0]: each actuator list and veto set yields its stated contests",
  tableDuration: "loops-checks table 04_timescale-comparability[0]: each resolved duration pair yields its stated ratio and outcome",
  tableCross: "loops-checks table 04_timescale-comparability[1]: the closed cadence cross-product and the out-of-domain region",
  tableCodes: "loops-checks table 05_frozen-finding-codes[0]: each check id's triggering model emits its stated code at its stated severity",
  tableRanCases: "loops-checks table 05_frozen-finding-codes[1]: each Model shape runs the five checks and yields its stated finding count",
  // ————— milestone 58 / story 02: the supervision tables —————
  axis58: "loops-checks table 58/02 00_a-supervisor-runs-at-a-slower-layer[0,1,2]: which axis decides a supervising edge",
  corroboration58: "loops-checks table 58/02 00_a-supervisor-runs-at-a-slower-layer[3,4]: a declared layer read against the cadence that would corroborate it",
  crossing58: "loops-checks table 58/02 01_one-boundary-per-edge[0,1,2]: which crossings the rule admits, which ends it needs, and which edge key it governs",
  entitlement58: "loops-checks table 58/02 02_only-an-arbiter-arbitrates[0]: who may clear a shared actuator, and on what coverage",
  admissibleSource58: "loops-checks table 58/02 03_an-inadmissible-owner-is-refused[0]: which sources may set a reference",
});

// ---------------------------------------------------------------------------------------------
// EXAMPLE-TABLE CASES. Each array below is iterated by exactly one test and is re-exported through
// `coverage.tables[].cases`, so the ledger's row count is the array the suite really drives.
// ---------------------------------------------------------------------------------------------

// 00_scc-decomposition.feature:128-141 — 12 rows.
const SCC_ROWS = Object.freeze([
  { row: "none; nodes loop:a, loop:b", nodes: () => [loopNode("loop:a"), loopNode("loop:b")], partition: [["loop:a"], ["loop:b"]] },
  { row: "a --data-feed--> b", nodes: () => [loopNode("loop:a", { edges: { "data-feed": ["loop:b"] } }), loopNode("loop:b")], partition: [["loop:a"], ["loop:b"]] },
  { row: "a --data-feed--> b, b --data-feed--> a", nodes: () => [loopNode("loop:a", { edges: { "data-feed": ["loop:b"] } }), loopNode("loop:b", { edges: { "data-feed": ["loop:a"] } })], partition: [["loop:a", "loop:b"]] },
  {
    row: "a --data-feed--> b --data-feed--> c --data-feed--> a",
    nodes: () => [
      loopNode("loop:a", { edges: { "data-feed": ["loop:b"] } }),
      loopNode("loop:b", { edges: { "data-feed": ["loop:c"] } }),
      loopNode("loop:c", { edges: { "data-feed": ["loop:a"] } }),
    ],
    partition: [["loop:a", "loop:b", "loop:c"]],
  },
  { row: "a --target-setting--> b, b --data-feed--> a", nodes: () => [loopNode("loop:a", { edges: { "target-setting": ["loop:b"] } }), loopNode("loop:b", { edges: { "data-feed": ["loop:a"] } })], partition: [["loop:a", "loop:b"]] },
  {
    row: "a --monitoring--> b, b --veto--> c, c --parameter-tuning--> a",
    nodes: () => [
      loopNode("loop:a", { edges: { monitoring: ["loop:b"] } }),
      loopNode("loop:b", { edges: { veto: ["loop:c"] } }),
      loopNode("loop:c", { edges: { "parameter-tuning": ["loop:a"] } }),
    ],
    partition: [["loop:a", "loop:b", "loop:c"]],
  },
  {
    row: "a<->b (data-feed), c<->d (monitoring), no edge between",
    nodes: () => [
      loopNode("loop:a", { edges: { "data-feed": ["loop:b"] } }), loopNode("loop:b", { edges: { "data-feed": ["loop:a"] } }),
      loopNode("loop:c", { edges: { monitoring: ["loop:d"] } }), loopNode("loop:d", { edges: { monitoring: ["loop:c"] } }),
    ],
    partition: [["loop:a", "loop:b"], ["loop:c", "loop:d"]],
  },
  { row: "a --data-feed--> a (self-loop)", nodes: () => [loopNode("loop:a", { edges: { "data-feed": ["loop:a"] } })], partition: [["loop:a"]] },
  {
    row: "actor:op --target-setting--> a, a --data-feed--> actor:op",
    nodes: () => [actorNode("actor:op", { edges: { "target-setting": ["loop:a"] } }), loopNode("loop:a", { edges: { "data-feed": ["actor:op"] } })],
    partition: [["actor:op", "loop:a"]],
  },
  { row: "a --data-feed--> loop:absent (no record)", nodes: () => [loopNode("loop:a", { edges: { "data-feed": [dangling("loop:absent")] } })], partition: [["loop:a"]] },
  { row: "a --data-feed--> command:work:next", nodes: () => [loopNode("loop:a", { edges: { "data-feed": ["command:work:next"] } })], partition: [["loop:a"]] },
  {
    row: "a --data-feed--> b, b --data-feed--> a, plus isolated loop:m",
    nodes: () => [loopNode("loop:a", { edges: { "data-feed": ["loop:b"] } }), loopNode("loop:b", { edges: { "data-feed": ["loop:a"] } }), loopNode("loop:m")],
    partition: [["loop:a", "loop:b"], ["loop:m"]],
  },
]);

// 01_groundedness-check.feature:108-118 — 9 rows.
const GROUNDED = "loop-graph-grounded-exogenous-only";
const UNGROUNDED = "loop-graph-ungrounded-component";
const GROUNDING_ROWS = Object.freeze([
  {
    row: "op --target-setting--> a; a<->b | ground on actor:op",
    nodes: () => [
      actorNode("actor:op", { ground: "exogenous", edges: { "target-setting": ["loop:a"] } }),
      loopNode("loop:a", { edges: { "data-feed": ["loop:b"] } }), loopNode("loop:b", { edges: { "data-feed": ["loop:a"] } }),
    ],
    expected: [{ members: "actor:op", code: GROUNDED }, { members: "loop:a, loop:b", code: GROUNDED }],
  },
  {
    row: "op (no edges); a<->b | ground on actor:op",
    nodes: () => [
      actorNode("actor:op", { ground: "exogenous" }),
      loopNode("loop:a", { edges: { "data-feed": ["loop:b"] } }), loopNode("loop:b", { edges: { "data-feed": ["loop:a"] } }),
    ],
    expected: [{ members: "actor:op", code: GROUNDED }, { members: "loop:a, loop:b", code: UNGROUNDED }],
  },
  {
    row: "a --data-feed--> auditor | ground on actor:auditor",
    nodes: () => [actorNode("actor:auditor", { ground: "exogenous" }), loopNode("loop:a", { edges: { "data-feed": ["actor:auditor"] } })],
    expected: [{ members: "actor:auditor", code: GROUNDED }, { members: "loop:a", code: UNGROUNDED }],
  },
  {
    row: "op --monitoring--> a | ground on actor:op",
    nodes: () => [actorNode("actor:op", { ground: "exogenous", edges: { monitoring: ["loop:a"] } }), loopNode("loop:a")],
    expected: [{ members: "actor:op", code: GROUNDED }, { members: "loop:a", code: GROUNDED }],
  },
  {
    row: "op --target-setting--> a --data-feed--> b | ground on actor:op",
    nodes: () => [
      actorNode("actor:op", { ground: "exogenous", edges: { "target-setting": ["loop:a"] } }),
      loopNode("loop:a", { edges: { "data-feed": ["loop:b"] } }), loopNode("loop:b"),
    ],
    expected: [{ members: "actor:op", code: GROUNDED }, { members: "loop:a", code: GROUNDED }, { members: "loop:b", code: GROUNDED }],
  },
  {
    row: "a --data-feed--> b | ground: exogenous on loop:a (not honoured)",
    nodes: () => [loopNode("loop:a", { ground: "exogenous", edges: { "data-feed": ["loop:b"] } }), loopNode("loop:b")],
    expected: [{ members: "loop:a", code: UNGROUNDED }, { members: "loop:b", code: UNGROUNDED }],
  },
  {
    row: "po --target-setting--> a | actor:po carries NO ground key",
    nodes: () => [actorNode("actor:po", { edges: { "target-setting": ["loop:a"] } }), loopNode("loop:a")],
    expected: [{ members: "actor:po", code: UNGROUNDED }, { members: "loop:a", code: UNGROUNDED }],
  },
  {
    row: "a<->b; c; actor:x | no ground-bearing node anywhere",
    nodes: () => [
      loopNode("loop:a", { edges: { "data-feed": ["loop:b"] } }), loopNode("loop:b", { edges: { "data-feed": ["loop:a"] } }),
      loopNode("loop:c"), actorNode("actor:x"),
    ],
    expected: [{ members: "actor:x", code: UNGROUNDED }, { members: "loop:a, loop:b", code: UNGROUNDED }, { members: "loop:c", code: UNGROUNDED }],
  },
  { row: "no nodes | n/a", nodes: () => [], expected: [] },
]);

// 02_unpaired-and-unowned.feature:184-208 — 23 rows. Tokens carry the EMITTING CHECK, because the
// self-referential finding's attribution by edge type is exactly what the table encodes.
const UP = "pairing:loop-unpaired-optimizer";
const UR = "reference-ownership:loop-unowned-reference";
const SM = "pairing:loop-self-referential-edge(monitoring)";
const ST = "reference-ownership:loop-self-referential-edge(target-setting)";
const inbound = (optimizing, monitoring, owner, targetSetting, expected) => ({
  row: `${optimizing} | ${monitoring} | ${owner} | ${targetSetting}`,
  optimizing: optimizing === "true", monitoring, owner, targetSetting, expected,
});
const UNPAIRED_ROWS = Object.freeze([
  inbound("true", "none", "unknown", "none", [UP, UR]),
  inbound("true", "none", "unknown", "present", [UP]),
  inbound("true", "none", "actor:product-owner", "none", [UP, UR]),
  inbound("true", "none", "actor:product-owner", "present", [UP]),
  inbound("true", "present", "unknown", "none", [UR]),
  inbound("true", "present", "unknown", "present", []),
  inbound("true", "present", "actor:product-owner", "none", [UR]),
  inbound("true", "present", "actor:product-owner", "present", []),
  inbound("false", "none", "unknown", "none", [UR]),
  inbound("false", "none", "unknown", "present", []),
  inbound("false", "none", "actor:product-owner", "none", [UR]),
  inbound("false", "none", "actor:product-owner", "present", []),
  inbound("false", "present", "unknown", "none", [UR]),
  inbound("false", "present", "unknown", "present", []),
  inbound("false", "present", "actor:product-owner", "none", [UR]),
  inbound("false", "present", "actor:product-owner", "present", []),
  inbound("true", "OUTBOUND only", "unknown", "OUTBOUND only", [UP, UR]),
  inbound("true", "SELF only", "unknown", "none", [UP, UR, SM]),
  inbound("true", "SELF only", "unknown", "SELF only", [UP, UR, SM, ST]),
  inbound("false", "SELF only", "unknown", "SELF only", [UR, SM, ST]),
  inbound("true", "SELF + third party", "unknown", "present", [SM]),
  inbound("false", "none", "unknown", "SELF only", [UR, ST]),
  inbound("false", "data-feed/veto/parameter-tuning SELF only", "unknown", "present", []),
]);

// 03_shared-actuator-arbitration.feature:154-171 — 16 rows. x/y/z are exact, scheme-agnostic values.
const X = "command:work:run-retry";
const Y = "command:work:run-complete";
const Z = "module:src/run-store.mjs#reclaimStaleRuns";
const PROSE = "prose:src/bundle/agents/aof-developer.md";
const ARBITRATION_ROWS = Object.freeze([
  { row: "a:[x] b:[x] | none", loops: { "loop:a": [X], "loop:b": [X] }, vetoes: {}, expected: [{ actuator: X, contenders: "loop:a, loop:b" }] },
  { row: "a:[x] b:[x] | operator veto [a,b]", loops: { "loop:a": [X], "loop:b": [X] }, vetoes: { "actor:operator": ["loop:a", "loop:b"] }, expected: [{ actuator: X, contenders: "loop:a, loop:b" }], supersededBy58: "an ACTOR is not entitled to arbitrate" },
  { row: "a:[x] b:[x] c:[x] | none", loops: { "loop:a": [X], "loop:b": [X], "loop:c": [X] }, vetoes: {}, expected: [{ actuator: X, contenders: "loop:a, loop:b, loop:c" }] },
  { row: "a:[x] b:[x] c:[x] | operator veto [a,b]", loops: { "loop:a": [X], "loop:b": [X], "loop:c": [X] }, vetoes: { "actor:operator": ["loop:a", "loop:b"] }, expected: [{ actuator: X, contenders: "loop:a, loop:b, loop:c" }] },
  { row: "a:[x] b:[x] c:[x] | operator veto [a,b] + auditor veto [c]", loops: { "loop:a": [X], "loop:b": [X], "loop:c": [X] }, vetoes: { "actor:operator": ["loop:a", "loop:b"], "actor:auditor": ["loop:c"] }, expected: [{ actuator: X, contenders: "loop:a, loop:b, loop:c" }] },
  { row: "a:[x] b:[x] c:[x] | operator veto [a,b,c]", loops: { "loop:a": [X], "loop:b": [X], "loop:c": [X] }, vetoes: { "actor:operator": ["loop:a", "loop:b", "loop:c"] }, expected: [{ actuator: X, contenders: "loop:a, loop:b, loop:c" }], supersededBy58: "an ACTOR is not entitled to arbitrate, however complete its veto" },
  { row: "a:[x] b:[x] | supervisor (a loop) veto [a,b]", loops: { "loop:a": [X], "loop:b": [X], "loop:supervisor": [] }, vetoes: { "loop:supervisor": ["loop:a", "loop:b"] }, expected: [{ actuator: X, contenders: "loop:a, loop:b" }], supersededBy58: "a LOOP is not entitled to arbitrate" },
  { row: "a:[x] b:[x] | a (a MEMBER) veto [a,b]", loops: { "loop:a": [X], "loop:b": [X] }, vetoes: { "loop:a": ["loop:a", "loop:b"] }, expected: [{ actuator: X, contenders: "loop:a, loop:b" }] },
  { row: "a:[x] b:[x] c:[x] | a (a MEMBER) veto [b,c]", loops: { "loop:a": [X], "loop:b": [X], "loop:c": [X] }, vetoes: { "loop:a": ["loop:b", "loop:c"] }, expected: [{ actuator: X, contenders: "loop:a, loop:b, loop:c" }] },
  { row: "a:[x] b:[x] c:[y] | c (member of y's set only) veto [a,b]", loops: { "loop:a": [X], "loop:b": [X], "loop:c": [Y] }, vetoes: { "loop:c": ["loop:a", "loop:b"] }, expected: [{ actuator: X, contenders: "loop:a, loop:b" }], supersededBy58: "not being a contender is necessary and no longer sufficient" },
  { row: "a:[x] b:[x] c:[x] | operator veto [a,b,c] + a veto [b]", loops: { "loop:a": [X], "loop:b": [X], "loop:c": [X] }, vetoes: { "actor:operator": ["loop:a", "loop:b", "loop:c"], "loop:a": ["loop:b"] }, expected: [{ actuator: X, contenders: "loop:a, loop:b, loop:c" }], supersededBy58: "an ACTOR is not entitled to arbitrate" },
  { row: "a:[x] b:[y] | none", loops: { "loop:a": [X], "loop:b": [Y] }, vetoes: {}, expected: [] },
  { row: "a:[x,y] b:[x,z] | none", loops: { "loop:a": [X, Y], "loop:b": [X, Z] }, vetoes: {}, expected: [{ actuator: X, contenders: "loop:a, loop:b" }] },
  { row: "a:[x,y] b:[x] c:[y] | none", loops: { "loop:a": [X, Y], "loop:b": [X], "loop:c": [Y] }, vetoes: {}, expected: [{ actuator: Y, contenders: "loop:a, loop:c" }, { actuator: X, contenders: "loop:a, loop:b" }] },
  { row: "a:[prose:p] b:[prose:p] | none", loops: { "loop:a": [PROSE], "loop:b": [PROSE] }, vetoes: {}, expected: [{ actuator: PROSE, contenders: "loop:a, loop:b" }] },
  { row: "a:[x,x] (single loop, duplicate entry) | none", loops: { "loop:a": [X, X] }, vetoes: {}, expected: [] },
]);

// 04_timescale-comparability.feature:187-201 — 13 rows. `stated` is the feature's printed ratio;
// the assertion uses the ratio the resolved durations actually produce.
const DURATION_ROWS = Object.freeze([
  { row: "periodic:15m over periodic:15s", source: periodic(900_000, "periodic:15m"), target: periodic(15_000, "periodic:15s"), stated: "60", outcome: "none" },
  { row: "periodic:1h over periodic:15m", source: periodic(3_600_000, "periodic:1h"), target: periodic(900_000, "periodic:15m"), stated: "4", outcome: "none" },
  { row: "periodic:1d over periodic:1h", source: periodic(86_400_000, "periodic:1d"), target: periodic(3_600_000, "periodic:1h"), stated: "24", outcome: "none" },
  { row: "periodic:3000ms over periodic:1000ms", source: periodic(3_000, "periodic:3000ms"), target: periodic(1_000, "periodic:1000ms"), stated: "3", outcome: "none" },
  { row: "periodic:45s over periodic:15s", source: periodic(45_000, "periodic:45s"), target: periodic(15_000, "periodic:15s"), stated: "3", outcome: "none" },
  { row: "periodic:1h over periodic:1000ms", source: periodic(3_600_000, "periodic:1h"), target: periodic(1_000, "periodic:1000ms"), stated: "3600", outcome: "none" },
  { row: "periodic:44s over periodic:15s", source: periodic(44_000, "periodic:44s"), target: periodic(15_000, "periodic:15s"), stated: "2.93", outcome: "inversion" },
  { row: "periodic:2h over periodic:1h", source: periodic(7_200_000, "periodic:2h"), target: periodic(3_600_000, "periodic:1h"), stated: "2", outcome: "inversion" },
  { row: "periodic:30s over periodic:15s", source: periodic(30_000, "periodic:30s"), target: periodic(15_000, "periodic:15s"), stated: "2", outcome: "inversion" },
  { row: "periodic:1s over periodic:500ms", source: periodic(1_000, "periodic:1s"), target: periodic(500, "periodic:500ms"), stated: "2", outcome: "inversion" },
  { row: "periodic:15s over periodic:15s", source: periodic(15_000, "periodic:15s"), target: periodic(15_000, "periodic:15s"), stated: "1", outcome: "inversion" },
  { row: "periodic:15s over periodic:15m", source: periodic(15_000, "periodic:15s"), target: periodic(900_000, "periodic:15m"), stated: "1/60", outcome: "inversion" },
  { row: "periodic:15s over SELF — same node", source: periodic(15_000, "periodic:15s"), target: null, stated: "1", outcome: "out of domain", self: true },
]);

// 04_timescale-comparability.feature:203-252 — 48 rows: the 37 in-domain cadence cells and the 11
// out-of-domain rows. The ROWS are traced here; the scenario-level cross-product claim is FF-5206's
// and is ledgered as an exclusion against it.
const NON_CLOCK_CADENCES = Object.freeze([
  ["event:per-item", event("per-item")],
  ["event:per-phase", event("per-phase")],
  ["event:per-milestone", event("per-milestone")],
  ["event:per-run-start", event("per-run-start")],
  ["unknown", unknownCadence()],
]);
const CLOCK = periodic(15_000, "periodic:15s");
const TIMESCALE_CROSS_ROWS = Object.freeze([
  { row: "periodic:* | periodic:* ratio >= 3", source: periodic(45_000, "periodic:45s"), target: CLOCK, outcome: "none" },
  { row: "periodic:* | periodic:* ratio < 3", source: periodic(30_000, "periodic:30s"), target: CLOCK, outcome: "inversion" },
  ...NON_CLOCK_CADENCES.map(([label, cadence]) => ({
    row: `periodic:* | ${label}`, source: CLOCK, target: cadence, outcome: "not-comparable", nonClock: "endpoint",
  })),
  ...NON_CLOCK_CADENCES.flatMap(([sourceLabel, sourceCadence]) => [
    { row: `${sourceLabel} | periodic:*`, source: sourceCadence, target: CLOCK, outcome: "not-comparable", nonClock: "source" },
    ...NON_CLOCK_CADENCES.map(([targetLabel, targetCadence]) => ({
      row: `${sourceLabel} | ${targetLabel}`, source: sourceCadence, target: targetCadence, outcome: "not-comparable", nonClock: "both",
    })),
  ]),
  { row: "n/a — actor source | periodic:*", sourceKind: "actor", target: CLOCK, outcome: "nothing" },
  { row: "n/a — actor source | event:per-item", sourceKind: "actor", target: event("per-item"), outcome: "nothing" },
  { row: "n/a — actor source | unknown", sourceKind: "actor", target: unknownCadence(), outcome: "nothing" },
  { row: "n/a — actor source | unresolved — no record", sourceKind: "actor", targetKind: "dangling", outcome: "nothing" },
  { row: "periodic:* | n/a — actor endpoint", source: CLOCK, targetKind: "actor", outcome: "nothing" },
  { row: "periodic:* | unresolved — no record", source: CLOCK, targetKind: "dangling", outcome: "nothing" },
  { row: "unknown | unresolved — no record", source: unknownCadence(), targetKind: "dangling", outcome: "nothing" },
  { row: "periodic:* | n/a — extra-registry", source: CLOCK, targetKind: "extra", outcome: "nothing" },
  { row: "periodic:* | n/a — SELF edge", source: CLOCK, targetKind: "self", outcome: "nothing" },
  { row: "event:per-item | n/a — SELF edge", source: event("per-item"), targetKind: "self", outcome: "nothing" },
  { row: "unknown | n/a — SELF edge", source: unknownCadence(), targetKind: "self", outcome: "nothing" },
]);

// 05_frozen-finding-codes.feature:172-181 — 8 rows.
const CODE_ROWS = Object.freeze([
  {
    row: "grounding | a component with no path from a ground-bearing node",
    checks: ["grounding"], code: UNGROUNDED, severity: "warn",
    nodes: () => [loopNode("loop:isolated")],
  },
  {
    row: "grounding | a component reachable from `ground: exogenous`",
    checks: ["grounding"], code: GROUNDED, severity: "warn",
    nodes: () => [actorNode("actor:root", { ground: "exogenous", edges: { "target-setting": ["loop:grounded"] } }), loopNode("loop:grounded")],
  },
  {
    row: "pairing | `optimizing: true`, no inbound `monitoring` edge from another node",
    checks: ["pairing"], code: "loop-unpaired-optimizer", severity: "error",
    nodes: () => [loopNode("loop:a", { optimizing: true })],
  },
  {
    row: "reference-ownership | no inbound `target-setting` edge from another node",
    checks: ["reference-ownership"], code: "loop-unowned-reference", severity: "error",
    nodes: () => [loopNode("loop:a", { layer: "management" })],
  },
  {
    row: "pairing · reference-ownership | a self-edge, attributed by type",
    checks: ["pairing", "reference-ownership"], code: "loop-self-referential-edge", severity: "warn",
    nodes: () => [loopNode("loop:a", { edges: { monitoring: ["loop:a"], "target-setting": ["loop:a"] } })],
  },
  {
    row: "actuator-arbitration | two loops, one identical `actuator` entry, no non-member `veto` over all",
    checks: ["actuator-arbitration"], code: "loop-shared-actuator-unarbitrated", severity: "error",
    nodes: () => [loopNode("loop:a", { actuator: ["command:shared"] }), loopNode("loop:b", { actuator: ["command:shared"] })],
  },
  {
    row: "timescale | `target-setting` between two registry loops, both `periodic:`, ratio < 3",
    checks: ["timescale"], code: "loop-timescale-inversion", severity: "error",
    nodes: () => [
      loopNode("loop:fast", { cadence: periodic(10_000, "periodic:10s"), edges: { "target-setting": ["loop:faster"] } }),
      loopNode("loop:faster", { cadence: periodic(5_000, "periodic:5s") }),
    ],
  },
  {
    row: "timescale | `target-setting` between two registry loops, either side `event:*`/`unknown`",
    checks: ["timescale"], code: "loop-timescale-not-comparable", severity: "warn",
    nodes: () => [
      loopNode("loop:a", { cadence: periodic(15_000, "periodic:15s"), edges: { "target-setting": ["loop:b"] } }),
      loopNode("loop:b", { cadence: event("per-item") }),
    ],
  },
]);

// 05_frozen-finding-codes.feature:183-187 — 3 rows. The CHECKS' half only: `ran` is derived outside
// this module, by `work:loops-validate`, and is task 03's to decide.
const RAN_ROWS = Object.freeze([
  { row: "present: false", present: false, nodes: () => [], expected: {} },
  { row: "present: true, nodes: []", present: true, nodes: () => [], expected: {} },
  {
    row: "present: true, nodes: [n]", present: true,
    nodes: () => [loopNode("loop:a", { optimizing: false, layer: "management" })],
    expected: { grounding: [UNGROUNDED], "reference-ownership": ["loop-unowned-reference"] },
  },
]);

// ---------------------------------------------------------------------------------------------
// THE VACUITY REGISTRY. Every case in this suite that asserts an EMPTY result appears here paired
// with the SAME model, one field changed, that DOES fire. `NAME.controlled` drives the whole
// registry; the individual tests carry the same pairing inline, where the empty leg is asserted.
// ---------------------------------------------------------------------------------------------
const VACUITY_CONTROLS = Object.freeze([
  {
    label: "grounding: `ground:` on a loop grounds nothing; moved onto an actor it does",
    check: checkGrounding, code: GROUNDED,
    empty: () => model([loopNode("loop:a", { ground: "exogenous", edges: { "data-feed": ["loop:b"] } }), loopNode("loop:b")]),
    firing: () => model([actorNode("actor:a", { ground: "exogenous", edges: { "data-feed": ["loop:b"] } }), loopNode("loop:b")]),
  },
  {
    label: "grounding: an empty node set reports nothing; one node reports a verdict",
    check: checkGrounding, code: UNGROUNDED,
    empty: () => model([]), firing: () => model([loopNode("loop:a")]),
  },
  {
    label: "pairing: a third-party loop's inbound monitoring clears unpaired; drop the edge and it fires",
    check: checkPairing, code: "loop-unpaired-optimizer",
    empty: () => model([loopNode("loop:a", { optimizing: true }), loopNode("loop:watcher", { edges: { monitoring: ["loop:a"] } })]),
    firing: () => model([loopNode("loop:a", { optimizing: true }), loopNode("loop:watcher", { edges: { monitoring: ["loop:other"] } })]),
  },
  {
    label: "pairing: an ACTOR's inbound monitoring clears unpaired; drop the edge and it fires",
    check: checkPairing, code: "loop-unpaired-optimizer",
    empty: () => model([loopNode("loop:a", { optimizing: true }), actorNode("actor:operator", { edges: { monitoring: ["loop:a"] } })]),
    firing: () => model([loopNode("loop:a", { optimizing: true }), actorNode("actor:operator", { edges: { monitoring: ["loop:other"] } })]),
  },
  {
    label: "pairing: `optimizing: false` reports nothing; the same model with the flag true fires",
    check: checkPairing, code: "loop-unpaired-optimizer",
    empty: () => model([loopNode("loop:a", { optimizing: false })]),
    firing: () => model([loopNode("loop:a", { optimizing: true })]),
  },
  {
    label: "pairing: data-feed/veto/parameter-tuning self-edges are legitimate; a monitoring self-edge is not",
    check: checkPairing, code: "loop-self-referential-edge",
    empty: () => model([loopNode("loop:a", { edges: { "data-feed": ["loop:a"], veto: ["loop:a"], "parameter-tuning": ["loop:a"] } })]),
    firing: () => model([loopNode("loop:a", { edges: { "data-feed": ["loop:a"], veto: ["loop:a"], monitoring: ["loop:a"] } })]),
  },
  {
    label: "pairing: an OUTBOUND monitoring edge does not pair; an INBOUND one does",
    check: checkPairing, code: "loop-unpaired-optimizer",
    empty: () => model([loopNode("loop:a", { optimizing: true }), loopNode("loop:b", { edges: { monitoring: ["loop:a"] } })]),
    firing: () => model([loopNode("loop:a", { optimizing: true, edges: { monitoring: ["loop:b"] } }), loopNode("loop:b")]),
  },
  {
    label: "reference-ownership: an actor's inbound target-setting clears unowned; drop the edge and it fires",
    check: checkReferenceOwnership, code: "loop-unowned-reference",
    empty: () => model([loopNode("loop:a"), actorNode("actor:operator", { edges: { "target-setting": ["loop:a"] } })]),
    firing: () => model([loopNode("loop:a"), actorNode("actor:operator", { edges: { "target-setting": ["loop:other"] } })]),
  },
  {
    label: "reference-ownership: another node's inbound target-setting clears unowned for the endpoint",
    check: checkReferenceOwnership, code: "loop-unowned-reference",
    empty: () => model([loopNode("loop:inner"), actorNode("actor:outer", { edges: { "target-setting": ["loop:inner"] } })]),
    firing: () => model([loopNode("loop:inner"), actorNode("actor:outer", { edges: { "target-setting": ["loop:elsewhere"] } })]),
  },
  {
    label: "reference-ownership: no target-setting self-edge, no self-referential finding; add one and it fires",
    check: checkReferenceOwnership, code: "loop-self-referential-edge",
    empty: () => model([loopNode("loop:a", { edges: { "target-setting": ["loop:b"] } }), loopNode("loop:b")]),
    firing: () => model([loopNode("loop:a", { edges: { "target-setting": ["loop:a"] } }), loopNode("loop:b")]),
  },
  {
    label: "reference-ownership: an ACTOR node is never unowned; the same record as a loop is",
    check: checkReferenceOwnership, code: "loop-unowned-reference",
    empty: () => model([actorNode("actor:operator")]),
    firing: () => model([{ ...actorNode("actor:operator"), kind: "loop" }]),
  },
  {
    label: "actuator-arbitration: a non-member ARBITER's veto over the whole set clears; drop one endpoint and it fires",
    check: checkActuatorArbitration, code: "loop-shared-actuator-unarbitrated",
    empty: () => model([
      loopNode("loop:a", { actuator: [X] }), loopNode("loop:b", { actuator: [X] }),
      arbiterNode("arbiter:x", { veto: ["loop:a", "loop:b"] }),
    ]),
    firing: () => model([
      loopNode("loop:a", { actuator: [X] }), loopNode("loop:b", { actuator: [X] }),
      arbiterNode("arbiter:x", { veto: ["loop:a"] }),
    ]),
  },
  {
    label: "actuator-arbitration: different actuator entries are no conflict; identical ones are",
    check: checkActuatorArbitration, code: "loop-shared-actuator-unarbitrated",
    empty: () => model([loopNode("loop:a", { actuator: [X] }), loopNode("loop:b", { actuator: [Y] })]),
    firing: () => model([loopNode("loop:a", { actuator: [X] }), loopNode("loop:b", { actuator: [X] })]),
  },
  {
    label: "actuator-arbitration: a duplicate entry within ONE loop is no conflict; a second loop declaring it is",
    check: checkActuatorArbitration, code: "loop-shared-actuator-unarbitrated",
    empty: () => model([loopNode("loop:a", { actuator: [X, X] }), loopNode("loop:b", { actuator: [Y] })]),
    firing: () => model([loopNode("loop:a", { actuator: [X, X] }), loopNode("loop:b", { actuator: [X] })]),
  },
  {
    label: "actuator-arbitration: a MEMBER is not an arbiter, so the same veto set from a non-member arbiter clears",
    check: checkActuatorArbitration, code: "loop-shared-actuator-unarbitrated",
    empty: () => model([
      loopNode("loop:a", { actuator: [X] }), loopNode("loop:b", { actuator: [X] }),
      arbiterNode("arbiter:supervisor", { veto: ["loop:a", "loop:b"] }),
    ]),
    firing: () => model([
      loopNode("loop:a", { actuator: [X], edges: { veto: ["loop:a", "loop:b"] } }), loopNode("loop:b", { actuator: [X] }),
      arbiterNode("arbiter:supervisor", { veto: [] }),
    ]),
  },
  {
    label: "timescale: a directed ratio of exactly 3 is clean; 2 is an inversion",
    check: checkTimescale, code: "loop-timescale-inversion",
    empty: () => model([
      loopNode("loop:a", { cadence: periodic(45_000, "periodic:45s"), edges: { "target-setting": ["loop:b"] } }),
      loopNode("loop:b", { cadence: periodic(15_000, "periodic:15s") }),
    ]),
    firing: () => model([
      loopNode("loop:a", { cadence: periodic(30_000, "periodic:30s"), edges: { "target-setting": ["loop:b"] } }),
      loopNode("loop:b", { cadence: periodic(15_000, "periodic:15s") }),
    ]),
  },
  {
    label: "timescale: a data-feed edge is outside the domain; the same pair joined by target-setting is not",
    check: checkTimescale, code: "loop-timescale-not-comparable",
    empty: () => model([
      loopNode("loop:a", { cadence: unknownCadence(), edges: { "data-feed": ["loop:b"] } }),
      loopNode("loop:b", { cadence: unknownCadence() }),
    ]),
    firing: () => model([
      loopNode("loop:a", { cadence: unknownCadence(), edges: { "target-setting": ["loop:b"] } }),
      loopNode("loop:b", { cadence: unknownCadence() }),
    ]),
  },
  {
    label: "timescale: a SELF target-setting edge leaves the domain; the same edge to another loop stays in it",
    check: checkTimescale, code: "loop-timescale-not-comparable",
    empty: () => model([
      loopNode("loop:a", { cadence: unknownCadence(), edges: { "target-setting": ["loop:a"] } }),
      loopNode("loop:b", { cadence: unknownCadence() }),
    ]),
    firing: () => model([
      loopNode("loop:a", { cadence: unknownCadence(), edges: { "target-setting": ["loop:b"] } }),
      loopNode("loop:b", { cadence: unknownCadence() }),
    ]),
  },
  {
    label: "timescale: an extra-registry endpoint is out of domain; the same edge to a declared loop is not",
    check: checkTimescale, code: "loop-timescale-not-comparable",
    empty: () => model([
      loopNode("loop:a", { cadence: unknownCadence(), edges: { "target-setting": ["command:work:next"] } }),
      loopNode("loop:b", { cadence: unknownCadence() }),
    ]),
    firing: () => model([
      loopNode("loop:a", { cadence: unknownCadence(), edges: { "target-setting": ["loop:b"] } }),
      loopNode("loop:b", { cadence: unknownCadence() }),
    ]),
  },
  {
    label: "timescale: a dangling endpoint is out of domain; declare the record and the edge enters it",
    check: checkTimescale, code: "loop-timescale-not-comparable",
    empty: () => model([loopNode("loop:a", { cadence: unknownCadence(), edges: { "target-setting": [dangling("loop:b")] } })]),
    firing: () => model([
      loopNode("loop:a", { cadence: unknownCadence(), edges: { "target-setting": [dangling("loop:b")] } }),
      loopNode("loop:b", { cadence: unknownCadence() }),
    ]),
  },
  {
    label: "timescale: an ACTOR source is out of domain; the same edge declared by a loop with a cadence is not",
    check: checkTimescale, code: "loop-timescale-not-comparable",
    empty: () => model([
      actorNode("actor:operator", { edges: { "target-setting": ["loop:b"] } }), loopNode("loop:b", { cadence: unknownCadence() }),
    ]),
    firing: () => model([
      loopNode("loop:operator", { cadence: unknownCadence(), edges: { "target-setting": ["loop:b"] } }),
      loopNode("loop:b", { cadence: unknownCadence() }),
    ]),
  },
]);

// ---------------------------------------------------------------------------------------------
// THE SCC DECOMPOSITION — 00_scc-decomposition.feature
// ---------------------------------------------------------------------------------------------

const DECOMPOSITION_TESTS = [
  {
    name: NAME.union,
    run: () => {
      // The mutual pair declares `data-feed: [loop:m2, loop:m2]` — a DUPLICATE endpoint entry. The
      // loader collapses such a list before any real model reaches this check (ADR-012 §3/C2), and
      // the check must not double-count one either: the pair is one component listing loop:m2 once.
      const nodes = [
        loopNode("loop:c1", { edges: { "data-feed": ["loop:c2"] } }),
        loopNode("loop:c2", { edges: { "data-feed": ["loop:c3"] } }),
        loopNode("loop:c3"),
        loopNode("loop:m1", { edges: { "data-feed": ["loop:m2", "loop:m2"] } }),
        loopNode("loop:m2", { edges: { "data-feed": ["loop:m1"] } }),
        loopNode("loop:t1", { edges: { "data-feed": ["loop:t2"] } }),
        loopNode("loop:t2", { edges: { "data-feed": ["loop:t3"] } }),
        loopNode("loop:t3", { edges: { "data-feed": ["loop:t1"] } }),
        loopNode("loop:f1", { edges: { "data-feed": ["loop:f2"] } }),
        loopNode("loop:f2", { edges: { "target-setting": ["loop:f3"] } }),
        loopNode("loop:f3", { edges: { monitoring: ["loop:f4"] } }),
        loopNode("loop:f4", { edges: { veto: ["loop:f5"] } }),
        loopNode("loop:f5", { edges: { "parameter-tuning": ["loop:f1"] } }),
        loopNode("loop:outer", { edges: { "target-setting": ["loop:inner"] } }),
        loopNode("loop:inner", { edges: { "data-feed": ["loop:outer"] } }),
      ];
      const components = decomposeLoopGraph(model(nodes));

      for (const id of ["loop:c1", "loop:c2", "loop:c3"]) {
        assert.deepEqual(componentHolding(components, id), [id], `${id}: the acyclic chain yields singletons`);
      }
      assert.deepEqual(componentHolding(components, "loop:m1"), ["loop:m1", "loop:m2"], "the mutual pair is one component");
      assert.equal(
        componentHolding(components, "loop:m1").filter((member) => member === "loop:m2").length, 1,
        "a duplicate endpoint entry does not duplicate a member",
      );
      assert.deepEqual(componentHolding(components, "loop:t1"), ["loop:t1", "loop:t2", "loop:t3"], "the three-cycle is one component");
      assert.deepEqual(
        componentHolding(components, "loop:f1"), ["loop:f1", "loop:f2", "loop:f3", "loop:f4", "loop:f5"],
        "the five-cycle spanning all five edge keys is ONE component",
      );
      assert.deepEqual(componentHolding(components, "loop:outer"), ["loop:inner", "loop:outer"], "a two-edge-type cycle is one component");

      // …and no single edge type decided it: restrict the model to one edge key at a time and the
      // five-cycle and the two-type cycle both fall apart into singletons.
      for (const key of ["data-feed", "target-setting", "monitoring", "veto", "parameter-tuning"]) {
        const restricted = nodes.map((node) => ({
          ...node,
          edges: Object.fromEntries(Object.entries(node.edges).filter(([edgeKey]) => edgeKey === key)),
        }));
        const single = decomposeLoopGraph(model(restricted));
        for (const id of ["loop:f1", "loop:f2", "loop:f3", "loop:f4", "loop:f5", "loop:outer", "loop:inner"]) {
          assert.deepEqual(componentHolding(single, id), [id], `${key} alone cannot decide ${id}'s component`);
        }
      }
    },
  },
  {
    name: NAME.everyComponent,
    run: () => {
      const nodes = [
        loopNode("loop:a", { edges: { "data-feed": ["loop:b"] } }),
        loopNode("loop:b", { edges: { "data-feed": ["loop:a"] } }),
        loopNode("loop:c", { edges: { monitoring: ["loop:d"] } }),
        loopNode("loop:d", { edges: { monitoring: ["loop:c"] } }),
        loopNode("loop:s", { edges: { "data-feed": ["loop:s"] } }),
        loopNode("loop:orphan"),
        actorNode("actor:operator", { edges: { "target-setting": ["loop:x"] } }),
        loopNode("loop:x", { edges: { "data-feed": ["actor:operator"] } }),
      ];
      const components = decomposeLoopGraph(model(nodes));

      assert.deepEqual(componentHolding(components, "loop:a"), ["loop:a", "loop:b"], "the first cycle is reported");
      assert.deepEqual(componentHolding(components, "loop:c"), ["loop:c", "loop:d"], "the second, unconnected cycle is reported TOO — not a first-cycle probe");
      assert.deepEqual(componentHolding(components, "loop:s"), ["loop:s"], "a self-loop is a singleton and raises nothing");
      assert.deepEqual(componentHolding(components, "loop:orphan"), ["loop:orphan"], "a node with no edge key of any type is its own component");
      assert.deepEqual(componentHolding(components, "actor:operator"), ["actor:operator", "loop:x"], "an actor is a member of its component like any other node");
      assert.equal(components.filter((component) => component.length > 1).length, 3, "every multi-member component is returned");

      // The in-process determinism repeat, over a graph that actually MIXES cycles, singletons and
      // self-loops — the discriminator an acyclic three-node arch fixture cannot supply.
      assert.deepEqual(decomposeLoopGraph(model(nodes)), components, "the same literal decomposes identically on a repeated invocation");
      assert.equal(JSON.stringify(decomposeLoopGraph(model(nodes))), JSON.stringify(components), "same component order, same membership order");
    },
  },
  {
    name: NAME.declaredOnly,
    run: () => {
      const extraRegistry = ["command:work:next", "module:src/run-store.mjs#isStale", "config:work.autonomous.maxAttempts", "item:50"];
      const subject = loopNode("loop:a", {
        edges: { "data-feed": [dangling("loop:absent"), ...extraRegistry] },
      });
      const components = decomposeLoopGraph(model([subject]));

      assert.deepEqual(components, [["loop:a"]], "one component holding exactly loop:a, and no error raised");
      const members = components.flat();
      for (const raw of ["loop:absent", ...extraRegistry]) {
        assert.equal(members.includes(raw), false, `${raw} is not a graph node and appears in no component`);
      }
      // The positive control for "adds no member": declare the record and the endpoint becomes one.
      const declared = decomposeLoopGraph(model([subject, loopNode("loop:absent", { edges: { "data-feed": ["loop:a"] } })]));
      assert.deepEqual(declared, [["loop:a", "loop:absent"]], "the same edge to a DECLARED record does add a member");
    },
  },
  {
    name: NAME.canonical,
    run: () => {
      const nodes = [
        loopNode("loop:z", { edges: { "data-feed": ["loop:a"] } }),
        loopNode("loop:a", { edges: { "data-feed": ["loop:z"] } }),
        loopNode("loop:m"),
        actorNode("actor:b"),
        // `loop:A` sorts BEFORE `loop:a` by code unit (0x41 < 0x61) and after it under most locale
        // collations — the discriminator that makes "ordered by node id, code unit by code unit"
        // mean something.
        loopNode("loop:A"),
      ];
      const components = decomposeLoopGraph(model(nodes));

      assert.deepEqual(components, [["actor:b"], ["loop:A"], ["loop:a", "loop:z"], ["loop:m"]], "members by node id and components by their least member, code unit by code unit");
      assert.deepEqual(components.map((component) => component[0]), [...components.map((component) => component[0])].sort(), "components are ordered by their lexicographically-least member");

      assert.deepEqual(decomposeLoopGraph(model([])), [], "an empty model yields no components and raises nothing");
    },
  },
];

// ---------------------------------------------------------------------------------------------
// THE GROUNDEDNESS CHECK — 01_groundedness-check.feature
// ---------------------------------------------------------------------------------------------

const GROUNDING_TESTS = [
  {
    name: NAME.groundForward,
    run: () => {
      // Ground enters at actor:operator and flows forward along ALL FIVE edge types, across
      // intermediate components: {operator} -target-setting-> {a,b} -monitoring-> {c} -veto-> {d}
      // -parameter-tuning-> {e}, with {a,b} itself joined by data-feed.
      const forward = model([
        actorNode("actor:operator", { ground: "exogenous", edges: { "target-setting": ["loop:a"] } }),
        loopNode("loop:a", { edges: { "data-feed": ["loop:b"] } }),
        loopNode("loop:b", { edges: { "data-feed": ["loop:a"], monitoring: ["loop:c"] } }),
        loopNode("loop:c", { edges: { veto: ["loop:d"] } }),
        loopNode("loop:d", { edges: { "parameter-tuning": ["loop:e"] } }),
        loopNode("loop:e"),
      ]);
      const findings = checkGrounding(forward);

      const pair = withCode(findings, GROUNDED).filter((f) => f.message.includes("[loop:a, loop:b]"));
      assert.equal(pair.length, 1, "the mutual pair reports one grounded verdict");
      assert.equal(pair[0].severity, "warn", "a component grounded by exogenous ground only is a warn, never a silent green");
      assert.ok(pair[0].message.includes("exogenous"), "the message names the ground class");
      assert.ok(pair[0].message.includes("loop:a") && pair[0].message.includes("loop:b"), "the message names the component's members");
      assert.equal(withCode(findings, UNGROUNDED).some((f) => f.message.includes("[loop:a, loop:b]")), false, "no ungrounded verdict for that component");

      // Every component carries a verdict, and no grounded verdict omits its ground class.
      for (const component of decomposeLoopGraph(forward)) {
        const forComponent = findings.filter((f) => f.message.includes(`[${component.join(", ")}]`));
        assert.equal(forComponent.length, 1, `[${component.join(", ")}]: exactly one verdict`);
        assert.equal(forComponent[0].code, GROUNDED, `[${component.join(", ")}]: reachable forward from ground`);
      }
      assert.ok(withCode(findings, GROUNDED).every((f) => f.message.includes("exogenous")), "no component is reported grounded without naming a ground class");
      assert.ok(findings.some((f) => f.message.includes("[actor:operator]") && f.code === GROUNDED), "the ground node's own component is grounded by itself");

      // The SAME shape with the edge REVERSED: ground does not flow backwards.
      const reversed = model([
        actorNode("actor:operator", { ground: "exogenous" }),
        loopNode("loop:a", { edges: { "data-feed": ["loop:b"], "target-setting": ["actor:operator"] } }),
        loopNode("loop:b", { edges: { "data-feed": ["loop:a"], monitoring: ["loop:c"] } }),
        loopNode("loop:c", { edges: { veto: ["loop:d"] } }),
        loopNode("loop:d", { edges: { "parameter-tuning": ["loop:e"] } }),
        loopNode("loop:e"),
      ]);
      const reversedFindings = checkGrounding(reversed);
      const reversedPair = reversedFindings.filter((f) => f.message.includes("[loop:a, loop:b]"));
      assert.deepEqual(reversedPair.map((f) => f.code), [UNGROUNDED], "a loop pointing AT the ground node is ungrounded — reachability is FORWARD only");
      assert.ok(reversedFindings.some((f) => f.message.includes("[actor:operator]") && f.code === GROUNDED), "…while the ground node itself is still grounded, so the check is not simply dead");
    },
  },
  {
    name: NAME.groundOffActor,
    run: () => {
      // (a) the only `ground:` key sits on a `kind: loop` node.
      const groundOnLoop = model([loopNode("loop:a", { ground: "exogenous", edges: { "data-feed": ["loop:b"] } }), loopNode("loop:b")]);
      // (b) an actor carrying a target-setting edge but NO `ground:` key, and no other actor.
      const actorWithoutGround = model([actorNode("actor:product-owner", { edges: { "target-setting": ["loop:a"] } }), loopNode("loop:a")]);
      // (c) no ground-bearing node at all.
      const noGround = model([
        loopNode("loop:p", { edges: { "data-feed": ["loop:q"] } }), loopNode("loop:q", { edges: { "data-feed": ["loop:p"] } }),
        loopNode("loop:r"), actorNode("actor:x"),
      ]);

      for (const [label, candidate] of [["ground on a loop", groundOnLoop], ["an actor with no ground key", actorWithoutGround], ["no ground-bearing node", noGround]]) {
        const findings = checkGrounding(candidate);
        for (const component of decomposeLoopGraph(candidate)) {
          const forComponent = findings.filter((f) => f.message.includes(`[${component.join(", ")}]`));
          assert.deepEqual(forComponent.map((f) => f.code), [UNGROUNDED], `${label}: [${component.join(", ")}] is ungrounded`);
          assert.equal(forComponent[0].severity, "warn");
        }
        assert.equal(withCode(findings, GROUNDED).length, 0, `${label}: no grounded verdict anywhere in the graph`);
      }

      const noGroundFindings = checkGrounding(noGround);
      assert.equal(withCode(noGroundFindings, UNGROUNDED).length, 3, "three components, three ungrounded verdicts");
      assert.ok(noGroundFindings.every((f) => f.path === noGround.source), "all three anchor at `source`…");
      assert.deepEqual(noGroundFindings.map((f) => f.message), [...noGroundFindings.map((f) => f.message)].sort(), "…so the trio is returned in the frozen (path, code, message) order — ordered by message");
      assertFrozenOrder(noGroundFindings, "grounding over an ungrounded graph");

      // (d) THE AGENT-ROLE CASE (01_groundedness-check.feature:76-80). It needs a ground-bearing
      // actor PRESENT — so it cannot join the three models above, whose claim is that no grounded
      // verdict appears anywhere — and it doubles as their positive control: the same check over a
      // model whose only added field is `ground:` on an actor DOES issue a grounded verdict.
      const agentRole = model([
        actorNode("actor:operator", { ground: "exogenous" }),
        actorNode("actor:product-owner", { edges: { "target-setting": ["loop:verify-triage-accept"] } }),
        loopNode("loop:verify-triage-accept"),
      ]);
      const agentFindings = checkGrounding(agentRole);
      assert.deepEqual(
        agentFindings.filter((f) => f.message.includes("[loop:verify-triage-accept]")).map((f) => f.code), [UNGROUNDED],
        "an agent-role actor does not launder ownership into ground",
      );
      assert.ok(agentFindings.some((f) => f.message.includes("[actor:operator]") && f.code === GROUNDED), "the exogenous actor's own component IS grounded — the control the three models above lack");
    },
  },
  {
    name: NAME.perComponent,
    run: () => {
      const cycle = model([
        actorNode("actor:operator", { ground: "exogenous", edges: { "target-setting": ["loop:a"] } }),
        loopNode("loop:a", { edges: { "data-feed": ["loop:b"] } }),
        loopNode("loop:b", { edges: { "data-feed": ["loop:c"] } }),
        loopNode("loop:c", { edges: { "data-feed": ["loop:a"] } }),
      ]);
      const findings = checkGrounding(cycle);

      const forCycle = findings.filter((f) => f.message.includes("[loop:a, loop:b, loop:c]"));
      assert.equal(forCycle.length, 1, "exactly one finding is reported for the three-node component");
      assert.equal(forCycle[0].code, GROUNDED);
      for (const member of ["loop:a", "loop:b", "loop:c"]) {
        assert.equal(findings.some((f) => f.message.includes(`[${member}]`)), false, `no finding is reported for ${member} on its own — the verdict is per component, never per member`);
      }

      const nodePaths = new Set(cycle.nodes.map((node) => node.path));
      assert.ok(findings.length > 0, "the sweep fired, so the anchor claim below is non-vacuous");
      for (const finding of findings) {
        assert.equal(finding.path, cycle.source, "every whole-graph verdict anchors at the model's `source` directory");
        assert.equal(nodePaths.has(finding.path), false, "no verdict's `path` is a node's own file");
        assert.equal(finding.path.endsWith(".md"), false, "the loops DIRECTORY, not a record");
        assert.ok(path.isAbsolute(finding.path) && finding.path.length > 0, "a non-empty raw absolute");
      }
    },
  },
];

// ---------------------------------------------------------------------------------------------
// THE TWO INBOUND-EDGE CHECKS — 02_unpaired-and-unowned.feature
// ---------------------------------------------------------------------------------------------

const UNPAIRED = "loop-unpaired-optimizer";
const UNOWNED = "loop-unowned-reference";
const SELF_EDGE = "loop-self-referential-edge";

const PAIRING_TESTS = [
  {
    name: NAME.pairing,
    run: () => {
      const subject = loopNode("loop:a", { optimizing: true, layer: "management" });
      // "in every case except the third-party inbound one" reads as the third-party inbound CASE —
      // an inbound `monitoring` edge from another declared node, loop or actor alike. That is what
      // 02_unpaired-and-unowned.feature:32-42 states in terms ("an inbound monitoring edge pairs the
      // loop"; "…from an ACTOR pairs the loop"), and what `checkPairing` computes: `paired` is keyed
      // on the endpoint, not on the declaring node's kind.
      const cases = [
        { label: "absent", nodes: [subject], paired: false },
        { label: "from a third-party loop", nodes: [subject, loopNode("loop:watcher", { edges: { monitoring: ["loop:a"] } })], paired: true },
        { label: "from an actor", nodes: [subject, actorNode("actor:operator", { edges: { monitoring: ["loop:a"] } })], paired: true },
        { label: "declared OUTBOUND from itself", nodes: [loopNode("loop:a", { optimizing: true, edges: { monitoring: ["loop:b"] } }), loopNode("loop:b")], paired: false },
        {
          label: "of another edge type",
          nodes: [subject, loopNode("loop:b", { edges: { "data-feed": ["loop:a"], "target-setting": ["loop:a"], veto: ["loop:a"], "parameter-tuning": ["loop:a"] } })],
          paired: false,
        },
      ];

      for (const item of cases) {
        const findings = checkPairing(model(item.nodes));
        assert.equal(
          hasCodeAt(findings, UNPAIRED, subject), !item.paired,
          `${item.label}: loop:a is ${item.paired ? "paired" : "unpaired"}`,
        );
        if (!item.paired) {
          const reported = findingsAt(findings, subject).filter((f) => f.code === UNPAIRED);
          assert.equal(reported[0].severity, "error", "milestone 57 promotes the unpaired optimizer to a gate");
          assert.equal(reported[0].path, subject.path, "anchored at loop:a's own file as a raw absolute");
          assert.ok(path.isAbsolute(reported[0].path));
          assert.ok(reported[0].message.includes("loop:a"), "the message names loop:a");
        }
      }
      // Every assertion above names loop:a, so a second loop's own findings can neither satisfy nor
      // break a case: loop:b in the OUTBOUND case is not itself reported by `pairing`.
      const outbound = checkPairing(model(cases[3].nodes));
      assert.deepEqual(codesAt(outbound, loopNode("loop:b")), [], "no pairing finding is reported for loop:b — it watches something else");

      // `optimizing: false` is never reported regardless of monitoring (02:51-55) — with its own
      // one-field control, the same two loops with the flag flipped.
      const quiet = [loopNode("loop:a", { optimizing: false }), loopNode("loop:b", { optimizing: false }), loopNode("loop:watcher", { edges: { monitoring: ["loop:b"] } })];
      const quietFindings = checkPairing(model(quiet));
      assert.deepEqual(codesAt(quietFindings, loopNode("loop:a")), [], "optimizing: false with no inbound monitoring reports nothing");
      assert.deepEqual(codesAt(quietFindings, loopNode("loop:b")), [], "optimizing: false with an inbound monitoring edge reports nothing");
      const flipped = checkPairing(model([loopNode("loop:a", { optimizing: true }), quiet[1], quiet[2]]));
      assert.deepEqual(codesAt(flipped, loopNode("loop:a")), [UNPAIRED], "…and the same model with `optimizing` flipped DOES fire");

      // An edge to loop:a declared only by a record with no usable `kind` (ADR-013 §2) pairs and
      // owns nothing — and raises nothing either.
      const ghosted = model([subject, unusableNode("loop:ghost", { edges: { monitoring: ["loop:a"], "target-setting": ["loop:a"] } })]);
      assert.deepEqual(codesAt(checkPairing(ghosted), subject), [UNPAIRED], "a monitoring edge from an unusable record does not pair loop:a");
      assert.deepEqual(codesAt(checkReferenceOwnership(ghosted), subject), [UNOWNED], "…nor does a target-setting edge from one own it");
    },
  },
  {
    name: NAME.ownership,
    run: () => {
      const shapes = [
        { label: "absent", extra: () => [], subjectEdges: {}, unowned: true },
        { label: "from an actor", extra: () => [actorNode("actor:operator", { edges: { "target-setting": ["loop:a"] } })], subjectEdges: {}, unowned: false },
        { label: "from another loop", extra: () => [loopNode("loop:outer", { edges: { "target-setting": ["loop:a"] } })], subjectEdges: {}, unowned: false },
        { label: "declared outbound from itself", extra: () => [loopNode("loop:b", { layer: "operational" })], subjectEdges: { "target-setting": ["loop:b"] }, unowned: true },
      ];
      const owners = [undefined, "actor:product-owner", "unknown"];

      for (const shape of shapes) {
        for (const owner of owners) {
          const subject = loopNode("loop:a", { owner, edges: shape.subjectEdges });
          const findings = checkReferenceOwnership(model([subject, ...shape.extra()]));
          assert.equal(
            hasCodeAt(findings, UNOWNED, subject), shape.unowned,
            `${shape.label} / owner=${owner ?? "(absent)"}: unowned turns on the INBOUND EDGE alone — a named owner field never clears it`,
          );
          if (shape.unowned) {
            const reported = findingsAt(findings, subject).filter((f) => f.code === UNOWNED)[0];
            // 58/ADR-005 §1 promotes it: a loop no admissible source owns is a structural
            // supervision failure, not a line that scrolls past. 52's claim — that a named
            // `owner:` never clears it — is what this case decides and is untouched.
            assert.equal(reported.severity, "error");
            assert.equal(reported.path, subject.path, "anchored at loop:a's own file as a raw absolute");
            assert.ok(path.isAbsolute(reported.path));
          }
          if (shape.label === "from another loop") {
            // The cascade case: the endpoint is owned, the SETTER is not — scoped by node id, so the
            // setter's own finding neither satisfies nor breaks the claim about loop:a.
            assert.ok(hasCodeAt(findings, UNOWNED, loopNode("loop:outer")), "loop:outer, which nobody target-sets, is itself unowned");
          }
          if (shape.label === "declared outbound from itself") {
            assert.deepEqual(codesAt(findings, loopNode("loop:b")), [], "no finding is reported for loop:b — an OUTBOUND edge owns the ENDPOINT, not the declarer");
          }
        }
      }

      // 02:99-104 verbatim, on the day-one record the ADR names.
      for (const owner of ["actor:product-owner", "unknown"]) {
        const vta = loopNode("loop:verify-triage-accept", { owner, layer: "management" });
        const findings = checkReferenceOwnership(model([vta, actorNode("actor:product-owner")]));
        assert.deepEqual(codesAt(findings, vta), [UNOWNED], `owner: ${owner} does not clear the unowned reference — the check is about blindness upward, not attribution`);
      }
    },
  },
  {
    name: NAME.selfEdgeAttribution,
    run: () => {
      // ONE node carrying BOTH self-edge types. FF-5209 pins pairing→monitoring and
      // reference-ownership→target-setting on two SEPARATE models, so cross-attribution is invisible
      // to it; this shape is the only one that catches it.
      const subject = loopNode("loop:a", {
        optimizing: true, cadence: unknownCadence(), layer: "management",
        edges: { monitoring: ["loop:a"], "target-setting": ["loop:a"] },
      });
      const bystander = loopNode("loop:b", { cadence: unknownCadence() });
      const both = model([subject, bystander]);

      const pairing = checkPairing(both);
      const ownership = checkReferenceOwnership(both);
      const selfEdges = [...pairing, ...ownership].filter((f) => f.code === SELF_EDGE && f.path === subject.path);
      assert.equal(selfEdges.length, 2, "exactly two loop-self-referential-edge findings — one per offending edge");

      const fromPairing = pairing.filter((f) => f.code === SELF_EDGE);
      const fromOwnership = ownership.filter((f) => f.code === SELF_EDGE);
      assert.equal(fromPairing.length, 1);
      assert.ok(fromPairing[0].message.includes("monitoring"), "`pairing` reports the MONITORING self-edge — the requirement it refused to count");
      assert.equal(fromPairing[0].message.includes("target-setting"), false, "…and not the other check's");
      assert.equal(fromPairing[0].severity, "warn");
      assert.equal(fromPairing[0].path, subject.path, "anchored at the DECLARING node's own file");
      assert.equal(fromOwnership.length, 1);
      assert.ok(fromOwnership[0].message.includes("target-setting"), "`reference-ownership` reports the TARGET-SETTING self-edge");
      assert.equal(fromOwnership[0].message.includes("monitoring"), false, "…and not the other check's");
      assert.equal(fromOwnership[0].path, subject.path);

      // Both inbound verdicts still fire: a node cannot satisfy an independence requirement with
      // itself. (loop:b draws its own unowned-reference — scoped away by path.)
      assert.deepEqual(codesAt(pairing, subject), [SELF_EDGE, UNPAIRED].sort(), "loop:a is still an unpaired optimizer");
      assert.deepEqual(codesAt(ownership, subject), [SELF_EDGE, UNOWNED].sort(), "loop:a's reference is still unowned");

      // The timescale check emits nothing for that same target-setting self-edge (ADR-012 §3/C1) —
      // and the same model with the endpoint pointed at loop:b instead DOES fire, so the empty
      // result above is a ruling and not a dead check.
      assert.deepEqual(checkTimescale(both), [], "a target-setting self-edge is outside the timescale domain");
      const redirected = model([{ ...subject, edges: { ...subject.edges, "target-setting": [endpoint("loop:b")] } }, bystander]);
      assert.deepEqual(
        checkTimescale(redirected).map((f) => f.code), ["loop-timescale-not-comparable"],
        "…while the same edge redirected at a second declared loop is in domain",
      );
    },
  },
  {
    name: NAME.unrelatedSelfEdge,
    run: () => {
      const subject = loopNode("loop:a", { layer: "management", edges: { "data-feed": ["loop:a"], veto: ["loop:a"], "parameter-tuning": ["loop:a"] } });
      const legitimate = model([subject]);
      const pairing = checkPairing(legitimate);
      const ownership = checkReferenceOwnership(legitimate);
      assert.equal(withCode(pairing, SELF_EDGE).length, 0, "data-feed, veto and parameter-tuning self-edges are legitimate for `pairing`");
      assert.equal(withCode(ownership, SELF_EDGE).length, 0, "…and for `reference-ownership`");

      // THE GIVEN COMPLETED FROM THE FEATURE'S OWN CASE TABLE. 02_unpaired-and-unowned:141-146's
      // last clause — "neither check's `summary.checks` finding count is incremented" — cannot hold
      // over the model its Given states: `checkReferenceOwnership` reports `loop-unowned-reference`
      // for EVERY `kind: loop` node with no inbound `target-setting` from another node, so loop:a
      // draws one. Row 208 of the same feature's Examples table is the same case WITH an inbound
      // target-setting edge present, and an ACTOR declaring it owns the reference without drawing a
      // finding of its own (02:86-90). Reading the feature whole; not a rewrite to match the code.
      const completed = model([subject, actorNode("actor:operator", { edges: { "target-setting": ["loop:a"] } })]);
      assert.deepEqual(checkPairing(completed), [], "`pairing`'s finding count is not incremented at all");
      assert.deepEqual(checkReferenceOwnership(completed), [], "…nor is `reference-ownership`'s — the three self-edge types are legitimate and cost nothing");

      // The positive control that makes the case above mean something: the SAME model with one
      // monitoring self-edge added.
      const cheated = model([loopNode("loop:a", { edges: { "data-feed": ["loop:a"], veto: ["loop:a"], "parameter-tuning": ["loop:a"], monitoring: ["loop:a"] } })]);
      const cheatedPairing = checkPairing(cheated);
      assert.equal(withCode(cheatedPairing, SELF_EDGE).length, 1, "a monitoring self-edge IS reported, so the hole is visible");
      assert.ok(cheatedPairing.find((f) => f.code === SELF_EDGE).message.includes("monitoring"), "and it names the edge type");
      assert.equal(withCode(checkReferenceOwnership(cheated), SELF_EDGE).length, 0, "`reference-ownership` reports no self-referential edge for that monitoring edge");

      // Attribution is by EDGE TYPE, never by node KIND (02:148-153) — the same monitoring self-edge
      // on an actor is reported by `pairing` and anchored at the actor's own file.
      const operator = actorNode("actor:operator", { edges: { monitoring: ["actor:operator"] } });
      const actorFindings = checkPairing(model([operator]));
      assert.deepEqual(codesAt(actorFindings, operator), [SELF_EDGE], "an actor's monitoring self-edge is reported like any other node's");
      assert.equal(actorFindings[0].path, operator.path, "anchored at actor:operator's own file as a raw absolute");
      assert.ok(actorFindings[0].message.includes("monitoring"));
    },
  },
];

// ---------------------------------------------------------------------------------------------
// SHARED ACTUATORS — 03_shared-actuator-arbitration.feature
// ---------------------------------------------------------------------------------------------

const UNARBITRATED = "loop-shared-actuator-unarbitrated";
const contestedFor = (findings, actuator) => findings.filter((f) => f.code === UNARBITRATED && f.message.startsWith(`Actuator ${actuator} is shared by `));

const ARBITRATION_TESTS = [
  {
    name: NAME.arbitration,
    run: () => {
      const two = () => [loopNode("loop:a", { actuator: [X] }), loopNode("loop:b", { actuator: [X] })];
      const three = () => [...two(), loopNode("loop:c", { actuator: [X] })];
      const cases = [
        { label: "absent", nodes: two(), arbitrated: false, contenders: "loop:a, loop:b" },
        { label: "from a non-member ARBITER over the whole set", nodes: [...two(), arbiterNode("arbiter:x", { veto: ["loop:a", "loop:b"] })], arbitrated: true },
        { label: "from a non-member ACTOR over the whole set", nodes: [...two(), actorNode("actor:operator", { edges: { veto: ["loop:a", "loop:b"] } })], arbitrated: false, contenders: "loop:a, loop:b" },
        { label: "from a non-member arbiter over PART of it", nodes: [...three(), arbiterNode("arbiter:x", { veto: ["loop:a", "loop:b"] })], arbitrated: false, contenders: "loop:a, loop:b, loop:c" },
        {
          label: "split across two non-members",
          nodes: [...three(), arbiterNode("arbiter:x", { veto: ["loop:a", "loop:b"] }), arbiterNode("arbiter:y", { veto: ["loop:c"] })],
          arbitrated: false, contenders: "loop:a, loop:b, loop:c",
        },
        {
          label: "from a member",
          nodes: [loopNode("loop:a", { actuator: [X], edges: { veto: ["loop:a", "loop:b"] } }), loopNode("loop:b", { actuator: [X] })],
          arbitrated: false, contenders: "loop:a, loop:b",
        },
        // 03:82-87 — a veto edge covering the SET plus unrelated loops still arbitrates. `covering`
        // is a superset test, not an equality one.
        {
          label: "from a non-member arbiter over the whole set plus an unrelated loop",
          nodes: [...two(), loopNode("loop:c", { actuator: [Y] }), arbiterNode("arbiter:x", { veto: ["loop:a", "loop:b", "loop:c"] })],
          arbitrated: true,
        },
      ];

      for (const item of cases) {
        const findings = checkActuatorArbitration(model(item.nodes));
        const contested = contestedFor(findings, X);
        if (item.arbitrated) {
          assert.equal(contested.length, 0, `${item.label}: the contention over ${X} is cleared`);
        } else {
          assert.equal(contested.length, 1, `${item.label}: ${X} is reported unarbitrated`);
          assert.equal(contested[0].severity, "error", "58/ADR-005 §1: a conflict nobody owns is a refusal, not a line that scrolls past");
          assert.ok(contested[0].message.includes(`[${item.contenders}]`), `${item.label}: the finding names every contender`);
          assert.equal(contested[0].path, model(item.nodes).source, `${item.label}: anchored at the model's source directory as a raw absolute`);
          assert.ok(path.isAbsolute(contested[0].path) && !contested[0].path.endsWith(".md"));
        }
      }
    },
  },
  {
    name: NAME.actuatorMatching,
    run: () => {
      // (1) a:[x,y] b:[x] c:[y] — one finding per contested ACTUATOR, never one per contending pair.
      const spread = model([
        loopNode("loop:a", { actuator: ["command:x", "command:y"] }),
        loopNode("loop:b", { actuator: ["command:x"] }),
        loopNode("loop:c", { actuator: ["command:y"] }),
      ]);
      const spreadFindings = checkActuatorArbitration(spread);
      assert.deepEqual(
        byActuator(contests(spreadFindings)),
        [{ actuator: "command:x", contenders: "loop:a, loop:b" }, { actuator: "command:y", contenders: "loop:a, loop:c" }],
        "two findings — one per contested actuator, each naming its own contenders",
      );
      assert.ok(spreadFindings.every((f) => f.path === spread.source), "both anchor at `source`…");
      assert.deepEqual(spreadFindings.map((f) => f.message), [...spreadFindings.map((f) => f.message)].sort(), "…so the pair is returned in the frozen (path, code, message) order — ordered by message");
      assertFrozenOrder(spreadFindings, "actuator-arbitration over two contested actuators");

      // (2) a:[x] b:[y] — different entries are no conflict, in both the coarse and the
      // one-character-apart shape (03:89-93 and 03:135-139).
      for (const [left, right, label] of [[X, Y, "wholly different commands"], ["module:src/run-store.mjs#isStale", "module:src/run-store.mjs#isRetryable", "entries differing in one symbol"]]) {
        const findings = checkActuatorArbitration(model([loopNode("loop:a", { actuator: [left] }), loopNode("loop:b", { actuator: [right] })]));
        assert.equal(withCode(findings, UNARBITRATED).length, 0, `${label}: not a conflict`);
      }
      // …and an actuator declared by only ONE loop is not a conflict either (03:95-99).
      assert.equal(
        withCode(checkActuatorArbitration(model([loopNode("loop:a", { actuator: [X, Y] }), loopNode("loop:b", { actuator: [Z] })])), UNARBITRATED).length, 0,
        "a multi-entry list sharing nothing is not a conflict",
      );

      // (3) a:[x,x] alone — a duplicate entry within ONE loop is not a conflict with itself.
      assert.equal(withCode(checkActuatorArbitration(model([loopNode("loop:a", { actuator: [X, X] })])), UNARBITRATED).length, 0, "a:[x,x] alone reports nothing");

      // (4) a `prose:` actuator shared by two loops — matching is on the RAW value, not the scheme.
      const proseFindings = checkActuatorArbitration(model([
        loopNode("loop:build-to-green", { actuator: [PROSE] }),
        loopNode("loop:review-fix-rereview", { actuator: [PROSE] }),
      ]));
      assert.deepEqual(
        byActuator(contests(proseFindings)), [{ actuator: PROSE, contenders: "loop:build-to-green, loop:review-fix-rereview" }],
        "an identical prose: entry is contested like any other — two loops pulling one lever with nobody to arbitrate",
      );
    },
  },
];

// ---------------------------------------------------------------------------------------------
// THE TIMESCALE CHECK — 04_timescale-comparability.feature
// ---------------------------------------------------------------------------------------------

const INVERSION = "loop-timescale-inversion";
const NOT_COMPARABLE = "loop-timescale-not-comparable";

const TIMESCALE_TESTS = [
  {
    name: NAME.timescaleAnchor,
    run: () => {
      const declaring = loopNode("loop:a", { cadence: periodic(15_000, "periodic:15s"), edges: { "target-setting": ["loop:b"] } });
      const unknownEndpoint = loopNode("loop:b", { cadence: unknownCadence() });
      const subject = model([declaring, unknownEndpoint]);
      const findings = checkTimescale(subject);

      assert.deepEqual(findings.map((f) => f.code), [NOT_COMPARABLE], "two loops on incomparable axes are not-comparable, never an inversion");
      assert.equal(findings[0].path, declaring.path, "the finding is anchored at loop:a's own file — the DECLARING node");
      assert.notEqual(findings[0].path, unknownEndpoint.path, "not at loop:b's file");
      assert.notEqual(findings[0].path, subject.source, "and not at the model's source directory");
      assert.ok(path.isAbsolute(findings[0].path) && findings[0].path.length > 0, "a non-empty raw absolute");
      assert.equal(findings[0].severity, "warn");

      // The message names the NON-CLOCK side and its cadence, and does not mislabel the clock side.
      assert.ok(findings[0].message.includes("loop:b (unknown)"), "the non-clock side is named with its cadence");
      assert.equal(findings[0].message.includes("loop:a ("), false, "the side that IS on a clock is not named as non-clock");

      const eventEndpoint = model([declaring, loopNode("loop:b", { cadence: event("per-item") })]);
      const eventFindings = checkTimescale(eventEndpoint);
      assert.deepEqual(eventFindings.map((f) => f.code), [NOT_COMPARABLE]);
      assert.equal(eventFindings[0].path, declaring.path);
      assert.ok(eventFindings[0].message.includes("loop:b (event:per-item)"), "an event trigger is named with its trigger, never converted to a duration");
    },
  },
  {
    name: NAME.perEdgeExclusion,
    run: () => {
      const cadences = [
        { label: "periodic", cadence: periodic(15_000, "periodic:15s"), endpoint: periodic(15_000, "periodic:15s"), code: INVERSION },
        { label: "unknown", cadence: unknownCadence(), endpoint: unknownCadence(), code: NOT_COMPARABLE },
        { label: "event", cadence: event("per-item"), endpoint: event("per-item"), code: NOT_COMPARABLE },
      ];

      for (const item of cadences) {
        // The self-edge ALONE: out of domain on identity, whatever the cadence.
        const selfOnly = model([loopNode("loop:a", { cadence: item.cadence, edges: { "target-setting": ["loop:a"] } })]);
        assert.deepEqual(checkTimescale(selfOnly), [], `${item.label}: a self-declared target-setting edge emits nothing — the cadence is never consulted`);

        // The same node declaring `target-setting: [loop:a, loop:b]` — the exclusion is per EDGE.
        const declaring = loopNode("loop:a", { cadence: item.cadence, edges: { "target-setting": ["loop:a", "loop:b"] } });
        const mixed = model([declaring, loopNode("loop:b", { cadence: item.endpoint })]);
        const findings = checkTimescale(mixed);
        assert.equal(findings.length, 1, `${item.label}: exactly one finding — the a→b edge`);
        assert.equal(findings[0].code, item.code, `${item.label}: and it is the ${item.code} on that edge`);
        assert.equal(findings[0].path, declaring.path, "anchored at the declaring node");
        assert.ok(findings[0].message.includes("target-sets loop:b"), "…for the edge to loop:b");
        assert.equal(findings[0].message.includes("loop:a target-sets loop:a"), false, `${item.label}: nothing at all is reported for the loop:a → loop:a edge`);
      }
      // The ratio-1 leg spelled out: an inversion IS what the a→b edge earns at ratio 1, so the
      // self-edge's silence above is an exclusion and not an empty check.
      const ratioOne = checkTimescale(model([
        loopNode("loop:a", { cadence: periodic(15_000, "periodic:15s"), edges: { "target-setting": ["loop:a", "loop:b"] } }),
        loopNode("loop:b", { cadence: periodic(15_000, "periodic:15s") }),
      ]));
      assert.ok(ratioOne[0].message.includes("directed period ratio 1"), "the a→b edge is an inversion at ratio 1");
    },
  },
  {
    name: NAME.timescaleEdges,
    run: () => {
      const declaring = loopNode("loop:a", { cadence: unknownCadence(), edges: { "target-setting": ["loop:b", "loop:c"] } });
      const targets = [loopNode("loop:b", { cadence: periodic(15_000, "periodic:15s") }), loopNode("loop:c", { cadence: periodic(15_000, "periodic:15s") })];
      const findings = checkTimescale(model([declaring, ...targets]));

      assert.deepEqual(findings.map((f) => f.code), [NOT_COMPARABLE, NOT_COMPARABLE], "one finding per target-setting EDGE, not per node");
      assert.ok(findings.every((f) => f.path === declaring.path), "both anchor at loop:a's own file — the node that declares both edges");
      assert.notEqual(findings[0].message, findings[1].message, "the two findings are distinguishable, so their order is observable");
      assert.deepEqual(findings.map((f) => f.message), [...findings.map((f) => f.message)].sort(), "one path, one code — so the pair is ordered by message");
      assertFrozenOrder(findings, "timescale over two edges of one node");

      // The same pair joined instead by the other three edge types reports nothing at all — with
      // the model above as its control in this same test.
      const otherTypes = model([
        loopNode("loop:a", { cadence: unknownCadence(), edges: { monitoring: ["loop:b", "loop:c"], veto: ["loop:b", "loop:c"], "parameter-tuning": ["loop:b", "loop:c"] } }),
        ...targets,
      ]);
      assert.deepEqual(checkTimescale(otherTypes), [], "a monitoring, veto or parameter-tuning edge produces nothing");

      // THE DAY-ONE SHAPE (04:178-185): a registry in which no target-setting edge joins two
      // `periodic:` loops. Zero inversions; one not-comparable per DISTINCT loop-to-loop edge;
      // nothing for the actor-declared edge and nothing for the self-edge.
      const dayOne = model([
        actorNode("actor:operator", { edges: { "target-setting": ["loop:a"] } }),
        loopNode("loop:a", { cadence: event("per-item"), edges: { "target-setting": ["loop:a", "loop:b"] } }),
        loopNode("loop:b", { cadence: unknownCadence(), edges: { "target-setting": ["loop:c"] } }),
        loopNode("loop:c", { cadence: unknownCadence() }),
      ]);
      const dayOneFindings = checkTimescale(dayOne);
      const distinctLoopEdges = 2; // a→b and b→c; a→a and operator→a are out of domain.
      assert.equal(withCode(dayOneFindings, INVERSION).length, 0, "0 inversions — no target-setting edge joins two periodic loops");
      assert.equal(withCode(dayOneFindings, NOT_COMPARABLE).length, distinctLoopEdges, "every edge between two DISTINCT registry loops yields one not-comparable");
      assert.ok(dayOneFindings.length <= distinctLoopEdges, "the count never exceeds the count of target-setting edges between two DISTINCT loops");
      assert.equal(dayOneFindings.some((f) => f.path === filePath("actor:operator")), false, "an actor-declared target-setting edge yields nothing");
      assert.equal(dayOneFindings.some((f) => f.message.includes("loop:a target-sets loop:a")), false, "a target-setting self-edge yields nothing — out of domain, and reported once by reference-ownership");
      assert.ok(
        checkReferenceOwnership(dayOne).some((f) => f.code === SELF_EDGE && f.path === filePath("loop:a")),
        "…and it IS reported there, so the timescale silence is an exclusion and not a dropped finding",
      );
    },
  },
];

// ---------------------------------------------------------------------------------------------
// THE PURE ENVELOPE — 05_frozen-finding-codes.feature
// ---------------------------------------------------------------------------------------------

// One literal model engineered so that all five checks fire and all eight codes are reachable, and
// whose `source` and node paths name locations that do not exist on disk.
const richModel = () => ({
  source: SOURCE,
  present: true,
  findings: [{ code: "loop-owner-unknown", severity: "warn", path: filePath("loop:orphan"), message: "owner is declared unknown" }],
  nodes: [
    actorNode("actor:operator", { ground: "exogenous", edges: { "target-setting": ["loop:grounded"] } }),
    loopNode("loop:grounded", {
      cadence: periodic(10_000, "periodic:10s"), actuator: ["command:shared"], optimizing: true,
      edges: { "target-setting": ["loop:fast"], monitoring: ["loop:grounded"] },
    }),
    loopNode("loop:fast", { cadence: periodic(5_000, "periodic:5s"), actuator: ["command:shared"], edges: { "target-setting": ["loop:isolated"] } }),
    loopNode("loop:isolated", { cadence: unknownCadence() }),
    loopNode("loop:orphan", { cadence: unknownCadence(), owner: "unknown" }),
  ],
});

const ENVELOPE_TESTS = [
  {
    name: NAME.readsOnlyTheModel,
    run: () => {
      const subject = richModel();
      const before = structuredClone({ nodes: subject.nodes, findings: subject.findings });
      const runAll = () => Object.fromEntries(CHECKS.map(([id, check]) => [id, check(subject)]));

      const baseline = runAll();
      assert.ok(CHECKS.every(([id]) => baseline[id].length > 0), "all five checks fired, so the identity claims below are non-vacuous");
      assert.ok(
        new Set(Object.values(baseline).flat().map((f) => f.code)).size >= 7,
        "the fixture reaches nearly the whole check lane, so an identity that held only for an empty result would not pass",
      );

      // (2) a different WORKING DIRECTORY.
      const cwd = process.cwd();
      let fromOtherCwd;
      try {
        process.chdir(os.tmpdir());
        fromOtherCwd = runAll();
      } finally {
        process.chdir(cwd);
      }

      // (3) a different ENVIRONMENT, including the locale variables a collation-aware comparison
      // would read.
      const probes = { AOF_LOOPS_FIXTURE_PROBE: "1", LANG: "tr_TR.UTF-8", LC_ALL: "tr_TR.UTF-8" };
      const saved = Object.fromEntries(Object.keys(probes).map((key) => [key, process.env[key]]));
      let fromOtherEnv;
      try {
        Object.assign(process.env, probes);
        fromOtherEnv = runAll();
      } finally {
        for (const [key, value] of Object.entries(saved)) {
          if (value === undefined) delete process.env[key];
          else process.env[key] = value;
        }
      }

      // (4) `present` flipped to false. The checks never see it — `ran` is derived outside this
      // module, by `work:loops-validate`, from `Model.present`.
      const flipped = { ...subject, present: false };
      const fromFlipped = Object.fromEntries(CHECKS.map(([id, check]) => [id, check(flipped)]));

      for (const [label, run] of [["a different working directory", fromOtherCwd], ["a different environment", fromOtherEnv], ["`present` flipped to false", fromFlipped]]) {
        assert.equal(JSON.stringify(run), JSON.stringify(baseline), `the findings are identical under ${label}`);
      }

      // The model is consumed and left untouched, and no loader-lane code comes back out.
      assert.deepEqual(subject.nodes, before.nodes, "the model's nodes are unchanged");
      assert.deepEqual(subject.findings, before.findings, "the model's findings array is unchanged");
      assert.equal(subject.findings.length, 1, "the loader-lane finding it arrived with is still the only member");
      for (const finding of Object.values(baseline).flat()) {
        assert.ok(CHECK_FINDING_CODES.has(finding.code), `${finding.code}: the returned findings hold no loader-lane code`);
      }
      // …and each check returns a `Finding[]` and nothing else — no `ran` flag, no count, no summary.
      for (const [id, findings] of Object.entries(baseline)) {
        assert.ok(Array.isArray(findings), `${id} returns an array`);
        assert.equal(Object.hasOwn(findings, "ran"), false, `${id} attaches no ran flag`);
        assert.equal(Object.hasOwn(findings, "summary"), false, `${id} attaches no summary object`);
      }
    },
  },
  {
    // THE `code` COMPONENT OF THE FROZEN ORDER, DECIDED — F-52-05-E, and it is this story's own
    // species. `assertFrozenOrder` above and FF-5209's ordering leg both write a CORRECT
    // self-consistency assertion — "the array equals itself re-sorted by (path, code, message)" —
    // but every fixture either instrument runs it over is one where code order and message order
    // AGREE, so neither of them decides `code`. Measured at review: dropping the `code` tiebreak
    // from `compareFindings` (`src/work/loops-checks.mjs`) survived all six suites AND all nine
    // gates. An exclusion whose pointer resolves by NAME while the claim is computed by nothing is
    // exactly what F-52-04-H was, one layer in.
    //
    // The discriminator is a fixture where the two orders CONFLICT. Three singleton components,
    // whose whole-graph verdicts therefore share ONE `path` (so `path` decides nothing), and the
    // grounded one's members sort LAST by message while its code sorts FIRST:
    //
    //   by (path, code, message)  [actor:zzz-ground] grounded, [actor:aaa] ungrounded, [loop:zzz] ungrounded
    //   by (path, message) alone  [actor:aaa] ungrounded, [actor:zzz-ground] grounded, [loop:zzz] ungrounded
    //
    // THE LANE HALF OF THE SCENARIO IS NOT THIS SUITE'S and is not claimed here: "the loader lane
    // first, then the five checks in id order" is the COMMAND's composition of results this module
    // returns one at a time, decided over the real `loopsValidateCommand.run()` by FF-5209 with
    // both its mutation legs. What is decidable in a module that returns one array per check is
    // the WITHIN-check order — including its `code` component — and that the order is a property
    // of the returned array rather than of a consumer's re-sorting.
    name: NAME.frozenOrderTiebreak,
    run: () => {
      const conflicting = model([
        actorNode("actor:aaa"),
        actorNode("actor:zzz-ground", { ground: "exogenous" }),
        loopNode("loop:zzz"),
      ]);
      const findings = checkGrounding(conflicting);

      assert.equal(new Set(findings.map((f) => f.path)).size, 1, "all three verdicts anchor at the one loops directory, so `path` decides nothing here");
      assert.deepEqual(
        verdicts(findings),
        [
          { members: "actor:zzz-ground", code: GROUNDED },
          { members: "actor:aaa", code: UNGROUNDED },
          { members: "loop:zzz", code: UNGROUNDED },
        ],
        "the shipped order: the grounded verdict FIRST because its code sorts first, then the two ungrounded ones by message",
      );

      // THE FIXTURE DISCRIMINATES. Without this the assertion above would also be green over a
      // comparison that never looks at `code` — which is the whole defect.
      const byMessageAlone = [...findings].sort((left, right) => (left.message < right.message ? -1 : left.message > right.message ? 1 : 0));
      assert.notDeepEqual(
        byMessageAlone.map((f) => f.message), findings.map((f) => f.message),
        "a (path, message) comparison alone returns these three in a DIFFERENT order — which is what makes this case a decision about `code` rather than a restatement of the sort",
      );
      assertFrozenOrder(findings, "grounding over the code/message conflict fixture");

      // …and every check returns its findings ALREADY ordered, over a model that makes all five
      // emit — the order is the array's property, not a consumer's.
      const rich = richModel();
      for (const [id, check] of CHECKS) {
        const returned = check(rich);
        assert.ok(returned.length > 0, `${id} emitted, so the order claim below is non-vacuous`);
        assertFrozenOrder(returned, `${id} over the rich model`);
      }
    },
  },
  {
    name: NAME.controlled,
    run: () => {
      // The subjects are the exported functions, each model-in / findings-out.
      const subjects = { decomposeLoopGraph, checkGrounding, checkPairing, checkReferenceOwnership, checkActuatorArbitration, checkTimescale };
      for (const [name, fn] of Object.entries(subjects)) {
        assert.equal(typeof fn, "function", `${name} is exported`);
        assert.equal(fn.length, 1, `${name} takes exactly one model argument`);
      }

      // EVERY case in this suite that asserts an empty result carries the same model, one field
      // changed, that DOES fire — and the deciding observation always names a CODE.
      assert.ok(VACUITY_CONTROLS.length >= 18, `at least the eighteen empty-asserting covered scenarios are controlled (${VACUITY_CONTROLS.length})`);
      for (const control of VACUITY_CONTROLS) {
        assert.ok(CHECK_FINDING_CODES.has(control.code), `${control.label}: the deciding observation names a member of the frozen code set`);
        assert.equal(
          control.check(control.empty()).filter((f) => f.code === control.code).length, 0,
          `${control.label}: the empty leg reports no ${control.code}`,
        );
        assert.ok(
          control.check(control.firing()).some((f) => f.code === control.code),
          `${control.label}: the one-field-changed leg DOES report ${control.code} — so the empty leg is a rule and not a dead check`,
        );
      }

      // The suite's own ledger is internally consistent: every `decided` pointer names a test that
      // exists here, every table's cases are the array a test really iterates, and no title is
      // claimed twice.
      const names = new Set(workLoopsChecksTests.map((test) => test.name));
      assert.equal(names.size, workLoopsChecksTests.length, "test names are unique");
      for (const entry of coverage.decided) {
        assert.ok(names.has(entry.test), `decided pointer resolves to a test in this module: ${entry.test}`);
        assert.ok(entry.scenario.length > 0 && coverage.features.includes(entry.feature));
      }
      for (const entry of coverage.excluded) {
        assert.ok(["structural-duplicate", "not-black-box", "duplicate-claim"].includes(entry.class), `${entry.scenario}: a declared exclusion class`);
        assert.ok(entry.reason.length > 0 && entry.pointer.length > 0, `${entry.scenario}: a non-empty reason and a resolving pointer`);
      }
      const claimed = [...coverage.decided, ...coverage.excluded].map((entry) => `${entry.feature}::${entry.scenario}`);
      assert.equal(new Set(claimed).size, claimed.length, "no scenario is claimed twice");
      for (const table of coverage.tables) {
        assert.ok(Array.isArray(table.cases) && table.cases.length > 0, `${table.feature}[${table.index}] carries a non-empty case array`);
        assert.equal(table.cases.length, table.rows, `${table.feature}[${table.index}]: the case array is exactly the parsed row count`);
      }
      // No case in this suite reads a file, so a fixture path that does not exist is harmless.
      assert.equal(SOURCE.includes("aof-loop-fixture-not-on-disk"), true, "every fixture path names a location that does not exist on disk");
    },
  },
];

// ---------------------------------------------------------------------------------------------
// THE EXAMPLE TABLES. One test per table; each iterates the exported case array row for row.
// ---------------------------------------------------------------------------------------------

function unpairedModel(row) {
  const subjectEdges = {};
  const extra = [];
  let needsOther = false;
  if (row.monitoring === "present") extra.push(loopNode("loop:watcher", { edges: { monitoring: ["loop:a"] } }));
  else if (row.monitoring === "OUTBOUND only") { subjectEdges.monitoring = ["loop:other"]; needsOther = true; }
  else if (row.monitoring === "SELF only") subjectEdges.monitoring = ["loop:a"];
  else if (row.monitoring === "SELF + third party") { subjectEdges.monitoring = ["loop:a"]; extra.push(loopNode("loop:watcher", { edges: { monitoring: ["loop:a"] } })); }
  else if (row.monitoring === "data-feed/veto/parameter-tuning SELF only") {
    subjectEdges["data-feed"] = ["loop:a"]; subjectEdges.veto = ["loop:a"]; subjectEdges["parameter-tuning"] = ["loop:a"];
  }
  if (row.targetSetting === "present") extra.push(loopNode("loop:setter", { edges: { "target-setting": ["loop:a"] } }));
  else if (row.targetSetting === "OUTBOUND only") { subjectEdges["target-setting"] = ["loop:other"]; needsOther = true; }
  else if (row.targetSetting === "SELF only") subjectEdges["target-setting"] = ["loop:a"];
  if (needsOther) extra.push(loopNode("loop:other"));
  // A bystander ACTOR carrying no inbound monitoring or target-setting edge rides in every row:
  // neither check ever reports it, and the 23 rows firing around it are that claim's control.
  return model([loopNode("loop:a", { optimizing: row.optimizing, owner: row.owner, layer: "management", edges: subjectEdges }), ...extra, actorNode("actor:operator")]);
}

function tokensAt(checkId, findings, node) {
  return findingsAt(findings, node).map((finding) => {
    if (finding.code !== SELF_EDGE) return `${checkId}:${finding.code}`;
    const edgeType = finding.message.includes("self-referential monitoring") ? "monitoring" : "target-setting";
    return `${checkId}:${finding.code}(${edgeType})`;
  });
}

function arbitrationModel(row) {
  const nodes = [];
  for (const [id, actuators] of Object.entries(row.loops)) {
    nodes.push(loopNode(id, {
      actuator: actuators.length > 0 ? actuators : [`command:${id}`],
      edges: row.vetoes[id] ? { veto: row.vetoes[id] } : undefined,
    }));
  }
  for (const [id, targets] of Object.entries(row.vetoes)) {
    if (id.startsWith("actor:")) nodes.push(actorNode(id, { edges: { veto: targets } }));
    if (id.startsWith("arbiter:")) nodes.push(arbiterNode(id, { veto: targets }));
  }
  return model(nodes);
}

const durationModel = (row) => (row.self
  ? model([loopNode("loop:a", { cadence: row.source, edges: { "target-setting": ["loop:a"] } })])
  : model([loopNode("loop:a", { cadence: row.source, edges: { "target-setting": ["loop:b"] } }), loopNode("loop:b", { cadence: row.target })]));

function crossModel(row) {
  const sourceKind = row.sourceKind ?? "loop";
  const targetKind = row.targetKind ?? "loop";
  const declaringId = sourceKind === "actor" ? "actor:operator" : "loop:a";
  const target = targetKind === "self" ? endpoint(declaringId)
    : targetKind === "dangling" ? dangling("loop:missing")
      : targetKind === "extra" ? endpoint("command:work:next")
        : targetKind === "actor" ? endpoint("actor:endpoint")
          : endpoint("loop:b");
  const nodes = [sourceKind === "actor"
    ? actorNode("actor:operator", { edges: { "target-setting": [target] } })
    : loopNode("loop:a", { cadence: row.source, edges: { "target-setting": [target] } })];
  if (targetKind === "loop") nodes.push(loopNode("loop:b", { cadence: row.target }));
  if (targetKind === "actor") nodes.push(actorNode("actor:endpoint"));
  return model(nodes);
}

const TABLE_TESTS = [
  {
    name: NAME.tableScc,
    run: () => {
      for (const row of SCC_ROWS) {
        assert.deepEqual(decomposeLoopGraph(model(row.nodes())), row.partition, `${row.row}: the expected component partition, in canonical order`);
      }
    },
  },
  {
    name: NAME.tableGrounding,
    run: () => {
      for (const row of GROUNDING_ROWS) {
        const subject = model(row.nodes());
        const findings = checkGrounding(subject);
        assert.deepEqual(byMembers(verdicts(findings)), byMembers(row.expected), `${row.row}: one verdict per component, with the stated code`);
        for (const finding of findings) {
          assert.equal(finding.severity, "warn", `${row.row}: verdicts are warns`);
          assert.equal(finding.path, subject.source, `${row.row}: whole-graph verdicts anchor at the loops directory`);
        }
        assertFrozenOrder(findings, row.row);
      }
      assert.ok(
        GROUNDING_ROWS.some((row) => row.expected.length === 0) && GROUNDING_ROWS.some((row) => row.expected.some((entry) => entry.code === GROUNDED)),
        "the no-nodes row's empty result sits beside rows that fire, in this same test",
      );
    },
  },
  {
    name: NAME.tableUnpaired,
    run: () => {
      const subject = loopNode("loop:a");
      const bystander = actorNode("actor:operator");
      for (const row of UNPAIRED_ROWS) {
        const candidate = unpairedModel(row);
        const pairing = checkPairing(candidate);
        const ownership = checkReferenceOwnership(candidate);
        const actual = [...tokensAt("pairing", pairing, subject), ...tokensAt("reference-ownership", ownership, subject)].sort();
        assert.deepEqual(actual, [...row.expected].sort(), `${row.row}: the stated findings for loop:a, attributed to the check that owns each edge type`);
        assert.deepEqual(codesAt(pairing, bystander), [], `${row.row}: neither check ever reports an actor node`);
        assert.deepEqual(codesAt(ownership, bystander), [], `${row.row}: …including the reference-ownership lane`);
        if (row.expected.includes(UP) && row.expected.includes(UR)) {
          const unpaired = findingsAt(pairing, subject).find((f) => f.code === UNPAIRED);
          const unowned = findingsAt(ownership, subject).find((f) => f.code === UNOWNED);
          assert.notEqual(unpaired.code, unowned.code, `${row.row}: the two findings differ in code`);
          assert.notEqual(unpaired.message, unowned.message, `${row.row}: …and in message`);
        }
        for (const finding of [...pairing, ...ownership]) {
          assert.ok(candidate.nodes.some((node) => node.path === finding.path), `${row.row}: every finding anchors at a declaring node's own file`);
        }
      }
    },
  },
  {
    name: NAME.tableArbitration,
    run: () => {
      let superseded = 0;
      for (const row of ARBITRATION_ROWS) {
        const candidate = arbitrationModel(row);
        const findings = checkActuatorArbitration(candidate);
        if (row.supersededBy58) {
          superseded += 1;
          assert.ok(row.expected.length > 0, `${row.row}: superseded rows report — ${row.supersededBy58}`);
        }
        assert.deepEqual(byActuator(contests(findings)), byActuator(row.expected), `${row.row}: one finding per contested actuator, naming every contender`);
        for (const finding of findings) {
          assert.equal(finding.severity, "error");
          assert.equal(finding.path, candidate.source, `${row.row}: arbitration findings anchor at the model's source directory`);
        }
        assertFrozenOrder(findings, row.row);
      }
      assert.equal(superseded, 5, "exactly five of the sixteen rows change verdict under 58/ADR-003 §9, and each names its reason");
      assert.equal(ARBITRATION_ROWS.length, 16, "…and the row count, which is bound to a delivered Examples table, does not move");
    },
  },
  {
    name: NAME.tableDuration,
    run: () => {
      const units = new Set();
      for (const row of DURATION_ROWS) {
        for (const cadence of [row.source, row.target]) {
          const unit = /^periodic:\d+(ms|s|m|h|d)$/.exec(cadence?.raw ?? "");
          if (unit) units.add(unit[1]);
        }
        const declaring = loopNode("loop:a");
        const findings = checkTimescale(durationModel(row));
        if (row.outcome === "inversion") {
          assert.deepEqual(findings.map((f) => f.code), [INVERSION], `${row.row}: ratio ${row.stated} is an inversion`);
          assert.equal(findings[0].severity, "error", "58/ADR-005 §1: a supervisor no slower than what it supervises stops the run");
          assert.equal(findings[0].path, declaring.path, `${row.row}: anchored at the declaring node's own file`);
          assert.ok(findings[0].message.includes(`loop:a (${row.source.raw})`) && findings[0].message.includes(`loop:b (${row.target.raw})`), `${row.row}: the message names both endpoints and both cadences`);
          assert.ok(findings[0].message.endsWith(`directed period ratio ${row.source.ms / row.target.ms}`), `${row.row}: the ratio is the target-setter's period divided by the endpoint's`);
          assert.ok(row.source.ms / row.target.ms < 3, `${row.row}: …and it is below the clean boundary of 3`);
        } else {
          assert.deepEqual(findings, [], `${row.row}: ${row.outcome}`);
          if (!row.self) assert.ok(row.source.ms / row.target.ms >= 3, `${row.row}: a separation of 3 or more is clean`);
        }
      }
      assert.deepEqual([...units].sort(), ["d", "h", "m", "ms", "s"], "durations resolve and compare across ms, s, m, h and d");
      // The comparison uses the RESOLVED durations, not the literal numbers: `periodic:15m` over
      // `periodic:15s` and `periodic:15s` over `periodic:15s` print the same two numerals and land
      // on opposite sides of the boundary.
      assert.deepEqual(checkTimescale(durationModel(DURATION_ROWS[0])), [], "periodic:15m over periodic:15s reports nothing");
      assert.deepEqual(checkTimescale(durationModel(DURATION_ROWS[10])).map((f) => f.code), [INVERSION], "periodic:15s over periodic:15s is an inversion");
    },
  },
  {
    name: NAME.tableCross,
    run: () => {
      // ROW TRACING for the 48-row cross-product. The SCENARIO-level cross-product claim is
      // FF-5206's and is ledgered as an exclusion against it; what is added here is the per-row
      // ANCHOR, which that gate does not assert.
      const declaring = { loop: loopNode("loop:a"), actor: actorNode("actor:operator") };
      for (const row of TIMESCALE_CROSS_ROWS) {
        const findings = checkTimescale(crossModel(row));
        const anchor = declaring[row.sourceKind ?? "loop"].path;
        if (row.outcome === "none" || row.outcome === "nothing") {
          assert.deepEqual(findings, [], `${row.row}: ${row.outcome}`);
          continue;
        }
        const expected = row.outcome === "inversion" ? INVERSION : NOT_COMPARABLE;
        assert.deepEqual(findings.map((f) => f.code), [expected], `${row.row}: ${row.outcome}`);
        assert.equal(findings[0].severity, expected === INVERSION ? "error" : "warn");
        assert.equal(findings[0].path, anchor, `${row.row}: anchored at the declaring node's own file`);
        if (row.outcome !== "not-comparable") continue;
        const message = findings[0].message;
        if (row.nonClock === "endpoint" || row.nonClock === "both") assert.ok(message.includes(`loop:b (${row.target.raw})`), `${row.row}: the endpoint side is named non-clock`);
        else assert.equal(message.includes("loop:b ("), false, `${row.row}: the endpoint is on a clock and is not mislabelled`);
        if (row.nonClock === "source" || row.nonClock === "both") assert.ok(message.includes(`loop:a (${row.source.raw})`), `${row.row}: the source side is named non-clock`);
        else assert.equal(message.includes("loop:a ("), false, `${row.row}: the source is on a clock and is not mislabelled`);
      }
    },
  },
  {
    name: NAME.tableCodes,
    run: () => {
      for (const row of CODE_ROWS) {
        const candidate = model(row.nodes());
        const emittedBy = CHECKS.filter(([, check]) => check(candidate).some((f) => f.code === row.code)).map(([id]) => id);
        assert.deepEqual(emittedBy, row.checks, `${row.row}: ${row.code} is emitted by exactly the stated check(s)`);
        const emitted = CHECKS.flatMap(([, check]) => check(candidate)).filter((f) => f.code === row.code);
        assert.ok(emitted.length > 0);
        for (const finding of emitted) assert.equal(finding.severity, row.severity, `${row.row}: at severity ${row.severity}`);
        assert.ok(CHECK_FINDING_CODES.has(row.code), `${row.row}: ${row.code} is a member of the exported frozen set`);
      }
      const historicalCodes = new Set(CODE_ROWS.map((row) => row.code));
      assert.equal(historicalCodes.size, 8, "the milestone-52 table still reaches its eight owned codes");
      for (const code of historicalCodes) assert.ok(CHECK_FINDING_CODES.has(code), `${code}: the historical code remains in the widened check vocabulary`);
    },
  },
  {
    name: NAME.tableRanCases,
    run: () => {
      for (const row of RAN_ROWS) {
        const candidate = model(row.nodes(), { present: row.present });
        for (const [id, check] of CHECKS) {
          const findings = check(candidate);
          assert.deepEqual([...findings.map((f) => f.code)].sort(), [...(row.expected[id] ?? [])].sort(), `${row.row}: ${id}'s own finding count and codes`);
          // No check reads `Model.present` — the flag `summary.checks` carries is derived outside
          // this module. Flipping it leaves every finding byte-identical.
          assert.equal(
            JSON.stringify(check({ ...candidate, present: !row.present })), JSON.stringify(findings),
            `${row.row}: ${id} answers identically with present flipped`,
          );
        }
      }
      const populated = model(RAN_ROWS[2].nodes());
      const codes = new Set(CHECKS.flatMap(([, check]) => check(populated)).map((f) => f.code));
      assert.deepEqual([...codes].sort(), [UNGROUNDED, UNOWNED].sort(), "a model with nodes but no edges runs every check and emits exactly those two codes");
      assert.ok(codes.size > 0, "…and the two empty rows above are therefore controlled, in this same test");
    },
  },
];

// ---------------------------------------------------------------------------------------------
// MILESTONE 58 / STORY 02 — THE SUPERVISION TABLES.
//
// One case array per Examples block of 58/02's task features that no gate already decides in
// exactly that shape. The blocks that ARE decided elsewhere are NOT re-driven here: the arbiter's
// priority permutation and the whole-vocabulary membership sweep belong to
// `acd-arbiter-records-the-tradeoff`, and the code/severity census belongs to
// `acd-loop-finding-envelope` — duplicating an invariant is the thing 52/05's acceptance forbids.
// `test/loop/watcher-independence-gate.test.mjs` carries the traceability leg that binds every one of
// the eighteen blocks to whichever authority decides it.
//
// The fixtures stay literal, so this section keeps the file's own no-filesystem discipline.
// ---------------------------------------------------------------------------------------------

const LAYER_CODES = ["loop-layer-inversion", "loop-layer-skipped", "loop-layer-undeclared", "loop-layer-contradicts-cadence"];
const CROSSING_CODES = ["loop-layer-inversion", "loop-layer-skipped"];
const NOT_ADMITTED = "loop-target-setting-not-admitted";
const layerCodesOf = (findings) => findings.map((f) => f.code).filter((code) => LAYER_CODES.includes(code));

/** The outcome column of 58/02's `00` and `01` tables, in the feature's own words. */
const TIMESCALE_OUTCOMES = Object.freeze({
  "clean": [],
  "a skipped layer": ["loop-layer-skipped"],
  "a layer inversion": ["loop-layer-inversion"],
  "a timescale inversion": ["loop-timescale-inversion"],
  "a layer inversion and a timescale inversion": ["loop-layer-inversion", "loop-timescale-inversion"],
  "not comparable": ["loop-timescale-not-comparable"],
});

const cadenceOf = (raw) => (raw.startsWith("periodic:")
  ? periodic(Number.parseInt(raw.slice("periodic:".length), 10) * 1000, raw)
  : raw === "unknown" ? unknownCadence() : event(raw.slice("event:".length)));

/** Two loops joined by ONE edge — the only shape the crossing rule governs. */
function supervisingPair(row, edgeKey = "target-setting") {
  const options = { cadence: cadenceOf(row.sourceCadence ?? "unknown"), edges: { [edgeKey]: ["loop:inner"] } };
  if (row.sourceLayer) options.layer = row.sourceLayer;
  const target = { cadence: cadenceOf(row.targetCadence ?? "unknown") };
  if (row.targetLayer) target.layer = row.targetLayer;
  return model([loopNode("loop:outer", options), loopNode("loop:inner", target)]);
}

// `00_a-supervisor-runs-at-a-slower-layer` Examples 0 — both ends carry a layer, so the layer
// decides whatever the clocks can or cannot say (12 rows).
const AXIS_BOTH_LAYERED_58 = [
  { sourceCadence: "event:per-item", sourceLayer: "management", targetCadence: "event:per-phase", targetLayer: "operational", outcome: "clean" },
  { sourceCadence: "event:per-milestone", sourceLayer: "governance", targetCadence: "event:per-item", targetLayer: "management", outcome: "clean" },
  { sourceCadence: "event:per-milestone", sourceLayer: "governance", targetCadence: "event:per-phase", targetLayer: "operational", outcome: "a skipped layer" },
  { sourceCadence: "event:per-phase", sourceLayer: "operational", targetCadence: "event:per-phase", targetLayer: "operational", outcome: "a layer inversion" },
  { sourceCadence: "event:per-phase", sourceLayer: "operational", targetCadence: "event:per-item", targetLayer: "management", outcome: "a layer inversion" },
  { sourceCadence: "periodic:60s", sourceLayer: "management", targetCadence: "periodic:15s", targetLayer: "operational", outcome: "clean" },
  { sourceCadence: "periodic:45s", sourceLayer: "management", targetCadence: "periodic:15s", targetLayer: "operational", outcome: "clean" },
  { sourceCadence: "periodic:30s", sourceLayer: "management", targetCadence: "periodic:15s", targetLayer: "operational", outcome: "a timescale inversion" },
  { sourceCadence: "periodic:30s", sourceLayer: "operational", targetCadence: "periodic:15s", targetLayer: "operational", outcome: "a layer inversion and a timescale inversion" },
  { sourceCadence: "periodic:15s", sourceLayer: "management", targetCadence: "periodic:60s", targetLayer: "operational", outcome: "a timescale inversion" },
  { sourceCadence: "periodic:60s", sourceLayer: "management", targetCadence: "event:per-phase", targetLayer: "operational", outcome: "clean" },
  { sourceCadence: "event:per-item", sourceLayer: "management", targetCadence: "periodic:15s", targetLayer: "operational", outcome: "clean" },
];

// Examples 1 — neither end carries a layer, so the clock decides alone and every verdict here is
// milestone 52's (6 rows). This block is `FF-5802`'s additivity claim restated as behaviour.
const AXIS_UNLAYERED_58 = [
  { sourceCadence: "periodic:60s", targetCadence: "periodic:15s", outcome: "clean" },
  { sourceCadence: "periodic:45s", targetCadence: "periodic:15s", outcome: "clean" },
  { sourceCadence: "periodic:30s", targetCadence: "periodic:15s", outcome: "a timescale inversion" },
  { sourceCadence: "periodic:15s", targetCadence: "event:per-phase", outcome: "not comparable" },
  { sourceCadence: "event:per-phase", targetCadence: "periodic:15s", outcome: "not comparable" },
  { sourceCadence: "event:per-item", targetCadence: "event:per-phase", outcome: "not comparable" },
];

// Examples 2 — ONE end carries a layer, which is not enough: there is no crossing to measure
// against a rank that was never declared, and the axis never guesses the other end (5 rows).
const AXIS_HALF_LAYERED_58 = [
  { sourceCadence: "event:per-item", sourceLayer: "management", targetCadence: "event:per-phase", outcome: "not comparable" },
  { sourceCadence: "event:per-item", targetCadence: "event:per-phase", targetLayer: "operational", outcome: "not comparable" },
  { sourceCadence: "periodic:30s", sourceLayer: "management", targetCadence: "periodic:15s", outcome: "a timescale inversion" },
  { sourceCadence: "periodic:60s", targetCadence: "periodic:15s", targetLayer: "operational", outcome: "clean" },
  { sourceCadence: "periodic:15s", sourceLayer: "management", targetCadence: "event:per-phase", outcome: "not comparable" },
];

// Examples 3 — the four triggers place a loop on the axis, so a declaration disagreeing with one is
// caught (12 rows).
const CORROBORATION_58 = [
  { cadence: "event:per-run-start", layer: "operational", outcome: "nothing" },
  { cadence: "event:per-run-start", layer: "management", outcome: "a contradiction with its cadence" },
  { cadence: "event:per-run-start", layer: "governance", outcome: "a contradiction with its cadence" },
  { cadence: "event:per-phase", layer: "operational", outcome: "nothing" },
  { cadence: "event:per-phase", layer: "management", outcome: "a contradiction with its cadence" },
  { cadence: "event:per-phase", layer: "governance", outcome: "a contradiction with its cadence" },
  { cadence: "event:per-item", layer: "operational", outcome: "a contradiction with its cadence" },
  { cadence: "event:per-item", layer: "management", outcome: "nothing" },
  { cadence: "event:per-item", layer: "governance", outcome: "a contradiction with its cadence" },
  { cadence: "event:per-milestone", layer: "operational", outcome: "a contradiction with its cadence" },
  { cadence: "event:per-milestone", layer: "management", outcome: "a contradiction with its cadence" },
  { cadence: "event:per-milestone", layer: "governance", outcome: "nothing" },
];

// Examples 4 — a clock implies no scope, so a layer beside one stands UNCORROBORATED rather than
// refused, and an absent layer is reported for what it is (5 rows).
const UNCORROBORATED_58 = [
  { cadence: "periodic:15s", layer: "operational", outcome: "nothing" },
  { cadence: "periodic:15s", layer: "governance", outcome: "nothing" },
  { cadence: "unknown", layer: "management", outcome: "nothing" },
  { cadence: "event:per-phase", layer: null, outcome: "that it declares no layer" },
  { cadence: "periodic:15s", layer: null, outcome: "that it declares no layer" },
];
const CORROBORATION_OUTCOMES = Object.freeze({
  "nothing": [],
  "a contradiction with its cadence": ["loop-layer-contradicts-cadence"],
  "that it declares no layer": ["loop-layer-undeclared"],
});

// `01_one-boundary-per-edge` Examples 0 — exactly one step down is the supervision relation; every
// other crossing is named (9 rows). Both cadences are `unknown`, so the clock can decide nothing
// and every verdict is attributable to the ordinal axis alone.
const CROSSING_58 = [
  { sourceLayer: "governance", targetLayer: "management", outcome: "clean" },
  { sourceLayer: "governance", targetLayer: "operational", outcome: "a skipped layer" },
  { sourceLayer: "governance", targetLayer: "governance", outcome: "a layer inversion" },
  { sourceLayer: "management", targetLayer: "operational", outcome: "clean" },
  { sourceLayer: "management", targetLayer: "management", outcome: "a layer inversion" },
  { sourceLayer: "management", targetLayer: "governance", outcome: "a layer inversion" },
  { sourceLayer: "operational", targetLayer: "operational", outcome: "a layer inversion" },
  { sourceLayer: "operational", targetLayer: "management", outcome: "a layer inversion" },
  { sourceLayer: "operational", targetLayer: "governance", outcome: "a layer inversion" },
];

// Examples 1 — the rule needs BOTH ends, and an end that declares no layer is reported for that
// instead of being guessed at (3 rows). `reports` names the loops the per-node census must name.
const HALF_DECLARED_58 = [
  { sourceLayer: "governance", targetLayer: null, reports: ["loop:inner"] },
  { sourceLayer: null, targetLayer: "operational", reports: ["loop:outer"] },
  { sourceLayer: null, targetLayer: null, reports: ["loop:inner", "loop:outer"] },
];

// Examples 2 — supervision is one of five declared relations and the only one with a layer rule
// (5 rows). The other four carry data, monitoring, vetoes and knob ownership across any distance.
const EDGE_KEY_58 = [
  { edgeKey: "target-setting", outcome: "reported as skipping a layer" },
  { edgeKey: "data-feed", outcome: "not reported" },
  { edgeKey: "monitoring", outcome: "not reported" },
  { edgeKey: "veto", outcome: "not reported" },
  { edgeKey: "parameter-tuning", outcome: "not reported" },
];

// `02_only-an-arbiter-arbitrates` Examples 0 — entitlement is a property of the KIND, and coverage
// never substitutes for it (15 rows). Exactly one of the fifteen cells clears.
const ENTITLEMENT_58 = ["arbiter", "actor", "loop", "anchor", "watcher"].flatMap((kind) => [
  { kind, coverage: "both contenders", vetoes: ["loop:a", "loop:b"], outcome: kind === "arbiter" ? "cleared" : "reported" },
  { kind, coverage: "one contender", vetoes: ["loop:a"], outcome: "reported" },
  { kind, coverage: "neither contender", vetoes: [], outcome: "reported" },
]);

// `03_an-inadmissible-owner-is-refused` Examples 0 — the hierarchy has three admissible sources,
// and the anchor branch is narrowed to ONE ground (11 rows).
const ADMISSIBLE_SOURCE_58 = [
  { kind: "loop", ground: "none admitted", outcome: "admitted as ownership" },
  { kind: "actor", ground: "exogenous", outcome: "admitted as ownership" },
  { kind: "actor", ground: "none declared", outcome: "admitted as ownership" },
  { kind: "anchor", ground: "frozen-rule", outcome: "admitted as ownership" },
  { kind: "anchor", ground: "process-exit", outcome: "reported as not admitted" },
  { kind: "anchor", ground: "build-stamp", outcome: "reported as not admitted" },
  { kind: "anchor", ground: "landed-commit", outcome: "reported as not admitted" },
  { kind: "anchor", ground: "live-soak", outcome: "reported as not admitted" },
  { kind: "anchor", ground: "exogenous", outcome: "reported as not admitted" },
  { kind: "watcher", ground: "none admitted", outcome: "reported as not admitted" },
  { kind: "arbiter", ground: "none admitted", outcome: "reported as not admitted" },
];

/** The source node of one `ADMISSIBLE_SOURCE_58` row, pointing at `loop:target`. */
function referenceSource(row) {
  const edges = { "target-setting": ["loop:target"] };
  const id = `${row.kind}:source`;
  if (row.kind === "loop") return loopNode(id, { layer: "management", edges });
  if (row.kind === "actor") return actorNode(id, { ...(row.ground === "none declared" ? {} : { ground: row.ground }), edges });
  if (row.kind === "anchor") return anchorNode(id, { ground: row.ground, edges });
  if (row.kind === "watcher") return watcherNode(id, { edges });
  return arbiterNode(id, { edges });
}

const SUPERVISION_58_TESTS = [
  {
    name: NAME.axis58,
    run: () => {
      // ONE EDGE, TWO AXES, DECIDED IN ORDER. Every row of the three blocks is driven over the same
      // two-loop shape, so what varies between a `clean` and an inversion is the declared pair and
      // nothing about the fixture.
      const blocks = [
        ["both ends layered", AXIS_BOTH_LAYERED_58],
        ["neither end layered", AXIS_UNLAYERED_58],
        ["one end layered", AXIS_HALF_LAYERED_58],
      ];
      let driven = 0;
      for (const [label, rows] of blocks) {
        for (const row of rows) {
          const stated = `${label}: ${row.sourceCadence}/${row.sourceLayer ?? "(undeclared)"} -> ${row.targetCadence}/${row.targetLayer ?? "(undeclared)"}`;
          const candidate = supervisingPair(row);
          const findings = checkTimescale(candidate);
          assert.deepEqual(findings.map((f) => f.code).sort(), [...TIMESCALE_OUTCOMES[row.outcome]].sort(), `${stated}: ${row.outcome}`);
          // The two findings of the both-axes row are two independent statements, never one
          // restated: a ratio is quoted by the clock finding alone.
          for (const finding of findings) {
            const reports = finding.code === "loop-timescale-not-comparable" || finding.code === "loop-layer-skipped";
            assert.equal(finding.severity, reports ? "warn" : "error", `${stated}: ${finding.code} severity`);
            assert.equal(finding.path, candidate.nodes[0].path, `${stated}: anchored at the node that declared the edge`);
            assert.equal(/period ratio/u.test(finding.message), finding.code === "loop-timescale-inversion", `${stated}: only the clock finding quotes a ratio`);
          }
          assert.equal(new Set(findings.map((f) => f.message)).size, findings.length, `${stated}: neither finding restates the other`);
          // EVERY ROW'S OWN DECLARATION IS INTERNALLY CORROBORATED, so no verdict above is produced
          // by a contradicts-cadence finding leaking in from the other lane.
          assert.deepEqual(
            checkReferenceOwnership(candidate).map((f) => f.code).filter((code) => code === "loop-layer-contradicts-cadence"), [],
            `${stated}: the table's own layers agree with the cadences beside them`,
          );
          driven += 1;
        }
      }
      assert.equal(driven, 23, "twelve both-layered rows, six unlayered and five half-layered");
      assert.equal(new Set([...AXIS_BOTH_LAYERED_58, ...AXIS_UNLAYERED_58, ...AXIS_HALF_LAYERED_58].map((row) => row.outcome)).size, 6,
        "all six verdicts the outcome column can take occur across the three blocks, so no row's answer is the table's constant");
    },
  },
  {
    name: NAME.corroboration58,
    run: () => {
      // THE DECLARATION IS READ AGAINST THE CADENCE THAT WOULD CORROBORATE IT — per NODE, in the
      // ownership lane (ADR-002 §1a), which is what reaches a loop carrying no supervising edge at
      // all. A lone loop is otherwise invisible to the axis entirely.
      for (const row of [...CORROBORATION_58, ...UNCORROBORATED_58]) {
        const options = { cadence: cadenceOf(row.cadence) };
        if (row.layer) options.layer = row.layer;
        const subject = loopNode("loop:solo", options);
        const stated = `${row.cadence} declared as ${row.layer ?? "(undeclared)"}`;
        const findings = checkReferenceOwnership(model([subject]));
        assert.deepEqual(layerCodesOf(findings), CORROBORATION_OUTCOMES[row.outcome], `${stated}: ${row.outcome}`);
        for (const finding of findings.filter((f) => LAYER_CODES.includes(f.code))) {
          assert.equal(finding.severity, "error", `${stated}: ${finding.code} gates`);
          assert.equal(finding.path, subject.path, `${stated}: reported at the record that declared it`);
          assert.ok(finding.message.includes(subject.id), `${stated}: and names the loop`);
        }
        // THE TWO LANES STAY SEPARATE: this per-node census emits nothing from the edge lane, which
        // is what `FF-5802` freezes and what keeps 52's cross-product untouched.
        assert.deepEqual(checkTimescale(model([subject])), [], `${stated}: a lone loop is outside the timescale domain`);
      }
      assert.equal(CORROBORATION_58.length + UNCORROBORATED_58.length, 17, "twelve trigger rows and five uncorroborated ones");
      assert.equal(new Set([...CORROBORATION_58, ...UNCORROBORATED_58].map((row) => row.outcome)).size, 3,
        "the table reaches all three of its outcomes");
    },
  },
  {
    name: NAME.crossing58,
    run: () => {
      // ONE BOUNDARY PER EDGE.
      for (const row of CROSSING_58) {
        const candidate = supervisingPair(row);
        const findings = checkTimescale(candidate);
        const stated = `${row.sourceLayer} -> ${row.targetLayer}`;
        assert.deepEqual(findings.map((f) => f.code).sort(), [...TIMESCALE_OUTCOMES[row.outcome]].sort(), `${stated}: ${row.outcome}`);
        for (const finding of findings) {
          assert.ok(finding.message.includes("loop:outer") && finding.message.includes("loop:inner"), `${stated}: the finding names both ends`);
          assert.equal(finding.path, candidate.nodes[0].path, `${stated}: reported at the loop that set the reference`);
        }
      }
      assert.equal(CROSSING_58.filter((row) => row.outcome === "clean").length, 2, "exactly two of the nine crossings are the supervision relation");
      // THE ROW COUNT IS PART OF THE CLAIM, not a by-product of it. The traceability leg in
      // `test/loop/watcher-independence-gate.test.mjs` pins the FEATURE side of this block at nine; a
      // row deleted from the array here would otherwise stop being driven with nothing red.
      assert.equal(CROSSING_58.length, 9, "…and all nine rows the feature's own table enumerates are driven");

      // THE RULE NEEDS BOTH ENDS. An undeclared end yields no crossing verdict at all — the axis
      // never guesses a rank — and is reported by the per-node census instead, on its own record.
      for (const row of HALF_DECLARED_58) {
        const candidate = supervisingPair(row);
        const stated = `${row.sourceLayer ?? "(undeclared)"} -> ${row.targetLayer ?? "(undeclared)"}`;
        assert.deepEqual(
          checkTimescale(candidate).map((f) => f.code).filter((code) => CROSSING_CODES.includes(code)), [],
          `${stated}: no crossing finding`,
        );
        const undeclared = checkReferenceOwnership(candidate)
          .filter((f) => f.code === "loop-layer-undeclared")
          .map((f) => candidate.nodes.find((node) => node.path === f.path).id);
        assert.deepEqual(undeclared.sort(), [...row.reports].sort(), `${stated}: the end(s) declaring no layer are reported for that instead`);
      }
      assert.equal(HALF_DECLARED_58.length, 3, "all three of the block's rows are driven — source-only, target-only, and neither");

      // THE RULE GOVERNS THE SUPERVISING EDGE AND NOTHING ELSE.
      for (const row of EDGE_KEY_58) {
        const skipped = checkTimescale(supervisingPair({ sourceLayer: "governance", targetLayer: "operational" }, row.edgeKey))
          .filter((f) => f.code === "loop-layer-skipped");
        assert.equal(skipped.length, row.outcome === "not reported" ? 0 : 1, `${row.edgeKey}: the crossing is ${row.outcome}`);
      }
      assert.equal(EDGE_KEY_58.length, 5, "the five declared relations, of which one carries a layer rule");
    },
  },
  {
    name: NAME.entitlement58,
    run: () => {
      // ENTITLEMENT IS A PROPERTY OF THE KIND, and coverage never substitutes for it. A vetoing node
      // of any other kind clears nothing however complete its veto, because the arbiter is the kind
      // that must RECORD the trade-off to exist at all.
      const contenders = () => [loopNode("loop:a", { actuator: [X] }), loopNode("loop:b", { actuator: [X] })];
      const judge = (kind, vetoes) => {
        if (kind === "arbiter") return arbiterNode("arbiter:judge", { veto: vetoes });
        if (kind === "actor") return actorNode("actor:judge", { edges: { veto: vetoes } });
        if (kind === "anchor") return anchorNode("anchor:judge", { edges: { veto: vetoes } });
        if (kind === "watcher") return watcherNode("watcher:judge", { edges: { veto: vetoes } });
        return loopNode("loop:judge", { actuator: [Y], edges: { veto: vetoes } });
      };
      let cleared = 0;
      for (const row of ENTITLEMENT_58) {
        const candidate = model([...contenders(), judge(row.kind, row.vetoes)]);
        const contested = checkActuatorArbitration(candidate).filter((f) => f.code === "loop-shared-actuator-unarbitrated");
        const stated = `a ${row.kind}, itself no contender, vetoing ${row.coverage}`;
        assert.equal(contested.length, row.outcome === "cleared" ? 0 : 1, `${stated}: the actuator is ${row.outcome}`);
        if (row.outcome === "cleared") { cleared += 1; continue; }
        assert.equal(contested[0].severity, "error", `${stated}: a conflict nobody owns is a refusal`);
        assert.ok(contested[0].message.includes("[loop:a, loop:b]"), `${stated}: and the finding still names every contender`);
      }
      assert.equal(cleared, 1, "exactly ONE of the fifteen cells clears — the entitled kind, at full coverage");
      assert.equal(ENTITLEMENT_58.length, 15, "five kinds against three coverages");
    },
  },
  {
    name: NAME.admissibleSource58,
    run: () => {
      // THREE ADMISSIBLE SOURCES, and the anchor branch narrowed to one ground. REFUSING A SOURCE IS
      // NOT A SUBSTITUTE FOR FINDING AN OWNER: an inadmissible edge confers nothing, so both
      // findings stand and they do not cancel.
      const target = () => loopNode("loop:target", { layer: "operational" });
      let admitted = 0;
      for (const row of ADMISSIBLE_SOURCE_58) {
        const source = referenceSource(row);
        const candidate = model([target(), source]);
        const findings = checkReferenceOwnership(candidate);
        const stated = `a ${row.kind} declaring ground ${row.ground}`;
        const refused = findings.filter((f) => f.code === NOT_ADMITTED);
        const unowned = findings.filter((f) => f.code === "loop-unowned-reference" && f.path === candidate.nodes[0].path);
        if (row.outcome === "admitted as ownership") {
          admitted += 1;
          assert.deepEqual(refused, [], `${stated}: admitted as ownership`);
          assert.deepEqual(unowned, [], `${stated}: …so loop:target is owned`);
          continue;
        }
        assert.equal(refused.length, 1, `${stated}: reported as not admitted`);
        assert.equal(refused[0].severity, "error");
        assert.equal(refused[0].path, source.path, `${stated}: reported at the record that declared the edge`);
        assert.ok(refused[0].message.includes(source.id) && refused[0].message.includes("loop:target"),
          `${stated}: naming the source and the loop whose reference it tried to set`);
        if (row.kind === "anchor") assert.ok(refused[0].message.includes(row.ground), `${stated}: …and the ground it declared`);
        assert.equal(unowned.length, 1, `${stated}: the loop is still unowned, and the two findings do not cancel`);
      }
      assert.equal(admitted, 4, "four of the eleven rows are ownership: a loop, an actor twice over, and one anchor ground");
      assert.equal(ADMISSIBLE_SOURCE_58.filter((row) => row.kind === "anchor").length, 6,
        "…and the anchor branch is driven over six grounds, of which exactly one is admitted");

      // ONE ADMISSIBLE SOURCE IS ENOUGH ALONGSIDE AN INADMISSIBLE ONE — the refusal is about the
      // EDGE, not about the loop, so ownership conferred elsewhere still stands.
      const mixed = model([
        loopNode("loop:target", { layer: "operational" }),
        actorNode("actor:owner", { edges: { "target-setting": ["loop:target"] } }),
        watcherNode("watcher:setter", { edges: { "target-setting": ["loop:target"] } }),
      ]);
      const codes = checkReferenceOwnership(mixed).map((f) => f.code);
      assert.ok(codes.includes(NOT_ADMITTED), "the watcher is still refused");
      assert.equal(codes.includes("loop-unowned-reference"), false, "…and the actor's edge still owns the loop");
    },
  },
];

export const workLoopsChecksTests = [
  ...DECOMPOSITION_TESTS,
  ...GROUNDING_TESTS,
  ...PAIRING_TESTS,
  ...ARBITRATION_TESTS,
  ...TIMESCALE_TESTS,
  ...ENVELOPE_TESTS,
  ...TABLE_TESTS,
  ...SUPERVISION_58_TESTS,
];

// ---------------------------------------------------------------------------------------------
// THE COVERAGE LEDGER. `decided` ∪ `excluded` is EXACTLY the scenario-title set of the six covered
// features (115); `tables` traces their 8 example tables and 132 rows. Task 05's checker consumes
// this shape; the suite's own `NAME.controlled` test keeps it internally honest.
// ---------------------------------------------------------------------------------------------

const TASKS = "wiki/work/52_milestone_loop-registry-and-graph/stories/01_story_structural-checks/tasks";
const F_SCC = `${TASKS}/00_scc-decomposition.feature`;
const F_GROUND = `${TASKS}/01_groundedness-check.feature`;
const F_INBOUND = `${TASKS}/02_unpaired-and-unowned.feature`;
const F_ACTUATOR = `${TASKS}/03_shared-actuator-arbitration.feature`;
const F_TIMESCALE = `${TASKS}/04_timescale-comparability.feature`;
const F_CODES = `${TASKS}/05_frozen-finding-codes.feature`;

// Gate test `name` strings, read out of the gates themselves rather than trusted.
const FF5203_VOCABULARIES = "arch/52 FF-5203: all thirteen exported vocabularies equal the governing ADR literals";
const FF5205_SOURCE_PURE = "arch/52 FF-5205: checks are source-pure, parse no declared values, and the two lanes are transitively separate";
const FF5205_DETERMINISM = "arch/52 FF-5205: every check is model-in/findings-out and deterministic in-process and in a fresh process";
const FF5206_CROSS_PRODUCT = "arch/52 FF-5206: the closed cadence cross-product compares only periodic loop-to-loop target-setting pairs";
const FF5206_OUT_OF_DOMAIN = "arch/52 FF-5206: actor, dangling, extra-registry and self edges stay outside the timescale domain";
const FF5209_CODE_TABLE = "arch/52 FF-5209: the literal lane/severity table is reachable with exact anchors and ordering";

const decide = (feature, pairs) => pairs.map(([scenario, test]) => ({ feature, scenario, test }));

export const coverage = {
  features: [F_SCC, F_GROUND, F_INBOUND, F_ACTUATOR, F_TIMESCALE, F_CODES],
  decided: [
    ...decide(F_SCC, [
      ["an acyclic graph decomposes to singleton components", NAME.union],
      ["a two-node mutual pair is one component", NAME.union],
      ["a three-node cycle is one component", NAME.union],
      ["a cycle spanning two different edge types is still one component", NAME.union],
      ["a cycle spanning all five edge types is one component", NAME.union],
      ["disconnected subgraphs decompose independently", NAME.everyComponent],
      ["two disjoint cycles are BOTH reported — the decomposition is not a first-cycle probe", NAME.everyComponent],
      ["a node with no edges at all is its own component", NAME.everyComponent],
      ["an actor node is a graph node like any other", NAME.everyComponent],
      ["a self-loop does not crash and yields a singleton component", NAME.everyComponent],
      ["an edge to an endpoint with no declaring record does not crash and adds no member", NAME.declaredOnly],
      ["an extra-registry endpoint is not a graph node", NAME.declaredOnly],
      ["a duplicate endpoint entry does not duplicate a member", NAME.union],
      ["the decomposition is deterministic across repeated invocation", NAME.everyComponent],
      ["components and their members are in a canonical order", NAME.canonical],
      ["an empty graph decomposes to nothing", NAME.canonical],
    ]),
    ...decide(F_GROUND, [
      ["a component reachable from a ground-bearing actor is reported grounded-exogenous-only", NAME.groundForward],
      ["a grounded component is never reported as a silent pass", NAME.groundForward],
      ["a component with no ground path is ungrounded", NAME.tableGrounding],
      ["reachability is FORWARD only — a loop pointing AT the ground node is ungrounded", NAME.groundForward],
      ["reachability is transitive across intermediate components", NAME.groundForward],
      ["reachability follows any of the five edge types", NAME.groundForward],
      ["the ground node's own component is grounded by itself", NAME.groundForward],
      ["`ground:` on a `kind: loop` node grounds nothing", NAME.groundOffActor],
      ["an actor with no `ground:` key grounds nothing", NAME.groundOffActor],
      ["an agent-role actor does not launder ownership into ground", NAME.groundOffActor],
      ["a graph with no ground-bearing node at all reports every component ungrounded", NAME.groundOffActor],
      ["exactly one verdict per component, never per node", NAME.perComponent],
      ["whole-graph verdicts anchor at the loops directory", NAME.perComponent],
      ["an empty graph reports nothing", NAME.tableGrounding],
    ]),
    ...decide(F_INBOUND, [
      ["an optimizing loop with no inbound monitoring edge is unpaired", NAME.pairing],
      ["an inbound monitoring edge pairs the loop", NAME.pairing],
      ["an inbound monitoring edge from an ACTOR pairs the loop", NAME.pairing],
      ["an OUTBOUND monitoring edge does not pair a loop — it watches something else", NAME.pairing],
      ["`optimizing: false` is never reported regardless of monitoring", NAME.pairing],
      ["an inbound edge of another type does not pair an optimizing loop", NAME.pairing],
      ["a self-declared monitoring edge does NOT pair the loop — a watcher may not be the thing it watches", NAME.tableUnpaired],
      ["a self-edge is discarded but a third party's inbound edge still pairs", NAME.tableUnpaired],
      ["a loop with no inbound target-setting edge is unowned", NAME.ownership],
      ["an inbound target-setting edge from an actor owns the reference", NAME.ownership],
      ["an inbound target-setting edge from another loop owns the reference — the cascade case", NAME.ownership],
      ["a loop with a named `owner:` field but no inbound target-setting edge is STILL unowned", NAME.ownership],
      ["an OUTBOUND target-setting edge does not own the declaring loop", NAME.ownership],
      ["a self-declared target-setting edge does NOT own the loop's reference", NAME.tableUnpaired],
      ["a monitoring self-edge is itself reported, so the hole is visible", NAME.selfEdgeAttribution],
      ["a target-setting self-edge is itself reported", NAME.selfEdgeAttribution],
      ["data-feed, veto and parameter-tuning self-edges are legitimate", NAME.unrelatedSelfEdge],
      ["an actor's monitoring self-edge is reported like any other node's", NAME.unrelatedSelfEdge],
      ["one self-referential finding per offending edge, and the loop still carries both inbound verdicts", NAME.selfEdgeAttribution],
      ["neither check ever reports an actor node", NAME.tableUnpaired],
      ["a loop can carry both findings independently", NAME.tableUnpaired],
      ["an edge from an undeclared node does not pair or own anything", NAME.pairing],
    ]),
    ...decide(F_ACTUATOR, [
      ["two loops sharing an identical actuator entry with no arbiter are reported", NAME.arbitration],
      ["a veto to only two of three contending loops still reports", NAME.arbitration],
      ["a single node vetoing every member clears the finding", NAME.arbitration],
      ["an arbiter may be a loop, not only an actor", NAME.tableArbitration],
      ["a member of the contending set may NOT be its own arbiter", NAME.arbitration],
      ["a member vetoing every OTHER member is still not an arbiter", NAME.tableArbitration],
      ["a loop contending for a DIFFERENT actuator is a valid non-member arbiter", NAME.tableArbitration],
      ["a non-member covering the whole set arbitrates even when a member also vetoes", NAME.tableArbitration],
      ["two nodes each vetoing PART of the set is not arbitration", NAME.arbitration],
      ["a veto edge covering the set plus unrelated loops still arbitrates", NAME.arbitration],
      ["loops with different actuator entries are not a conflict", NAME.actuatorMatching],
      ["an actuator declared by only one loop is not a conflict", NAME.actuatorMatching],
      ["a loop sharing ONE of several actuators is reported for that one only", NAME.tableArbitration],
      ["one finding per contested actuator, not one per contending pair", NAME.tableArbitration],
      ["two separately contested actuators yield two findings", NAME.actuatorMatching],
      ["an identical `prose:` actuator entry is contested like any other entry", NAME.actuatorMatching],
      ["entries that differ in any character are different actuators", NAME.actuatorMatching],
      ["an actor node's edges are read for veto but an actor declares no actuator", NAME.tableArbitration],
      ["a duplicate actuator entry within ONE loop is not a conflict with itself", NAME.actuatorMatching],
    ]),
    ...decide(F_TIMESCALE, [
      ["two periodic endpoints with a separation ratio of 3 or more report nothing", NAME.tableDuration],
      ["a separation ratio below 3 is an inversion", NAME.tableDuration],
      ["the ratio is directed — a target-setter FASTER than the loop it supervises is an inversion", NAME.tableDuration],
      ["a ratio of exactly 3 is the clean boundary", NAME.tableDuration],
      ["every edge finding anchors at the declaring node, never at the endpoint and never at the directory", NAME.timescaleAnchor],
      ["a monitoring, veto or parameter-tuning edge produces nothing", NAME.timescaleEdges],
      ["one finding per target-setting edge, not per node", NAME.timescaleEdges],
      ["a self-declared target-setting edge is out of domain whatever the cadence", NAME.perEdgeExclusion],
      ["a self-edge leaves the domain while a real edge from the same node stays in it", NAME.perEdgeExclusion],
      ["the day-one shape — no two periodic loops joined by a target-setting edge", NAME.timescaleEdges],
    ]),
    ...decide(F_CODES, [
      // RE-FILED 2026-08-15 at this story's own review, from `excluded` to `decided` (F-52-05-E).
      // It was ledgered `structural-duplicate → FF-5209`, and the gate does drive the real
      // command's LANE concatenation — but the scenario's `(path, code, message)` clause was
      // decided by neither instrument, since both compare an array with itself re-sorted over
      // fixtures where code order and message order never disagree. `NAME.frozenOrderTiebreak`
      // is the fixture where they do. The gate keeps its legs; what moved is the ledger entry.
      ["the combined finding order is frozen — loader lane first, then the five checks in id order", NAME.frozenOrderTiebreak],
      ["no check returns `ran` — the command derives it from `Model.present`", NAME.readsOnlyTheModel],
      ["the checks consume the frozen model and leave it untouched", NAME.readsOnlyTheModel],
      ["no check reads a file", NAME.readsOnlyTheModel],
      ["no check reads the environment", NAME.readsOnlyTheModel],
      ["an empty model is clean, not an error", NAME.tableRanCases],
      ["a model with nodes but no edges runs every check", NAME.tableRanCases],
    ]),
  ],
  excluded: [
    {
      // RE-FILED 2026-08-15 by story 52/05 task 05, from `decided` to `excluded`. This suite's
      // duration table builds `periodic(900_000, "periodic:15m")` LITERALLY — the milliseconds are
      // authored beside the text, and no unit is resolved anywhere in this file — so it cannot
      // decide a claim about resolution, only about comparison once resolution has happened. The
      // table and its test stay exactly as they are; what moved is the ledger entry, so the claim
      // has one home instead of two.
      feature: F_TIMESCALE,
      scenario: "duration units resolve and compare across ms, s, m, h and d",
      class: "duplicate-claim",
      reason: "This suite's duration table builds `periodic(900_000, \"periodic:15m\")` literally and resolves no unit, so it decides the RATIO half and not the resolution half the scenario is about. `test/loop/work-loops-value.test.mjs` drives records authoring `periodic:250ms` / `15s` / `15m` / `2h` / `1d` through the real loader and asserts 250 / 15000 / 900000 / 7200000 / 86400000 — a loader claim, decided where the loader runs.",
      pointer: "duration units resolve and compare across ms, s, m, h and d",
    },
    {
      feature: F_SCC,
      scenario: "the decomposition is deterministic in a fresh process",
      class: "structural-duplicate",
      reason: "Byte-stability across a process boundary is FF-5205's by name, and its fresh-process leg drives `checkGrounding`, whose whole output is the decomposition's component list and order — so the decomposition's cross-process determinism is what that gate compares. Re-spawning a process here would be a second home for one rule, and would also break this suite's no-filesystem, no-subprocess design.",
      pointer: FF5205_DETERMINISM,
    },
    {
      feature: F_TIMESCALE,
      scenario: "an event trigger opposite a clock is not comparable, never an inversion",
      class: "structural-duplicate",
      reason: "The periodic x event cell of the exhaustive 6x6 cadence cross-product, which that gate drives for all 36 cells, asserting the code, the severity and that the non-clock side is named while the clock side is not.",
      pointer: FF5206_CROSS_PRODUCT,
    },
    {
      feature: F_TIMESCALE,
      scenario: "the same pair in the opposite direction is also not comparable",
      class: "structural-duplicate",
      reason: "The event x periodic cell of the same cross-product — the gate drives both orientations of every pair and asserts which side is named non-clock in each.",
      pointer: FF5206_CROSS_PRODUCT,
    },
    {
      feature: F_TIMESCALE,
      scenario: "`unknown` opposite a clock is not comparable",
      class: "structural-duplicate",
      reason: "The periodic x unknown cell of the same cross-product; `unknown` is one of the six closed cadence kinds the gate sweeps.",
      pointer: FF5206_CROSS_PRODUCT,
    },
    {
      feature: F_TIMESCALE,
      scenario: "when neither side is on a clock the message names both",
      class: "structural-duplicate",
      reason: "The 25 non-clock x non-clock cells of the same cross-product, where the gate asserts that BOTH sides appear in the message.",
      pointer: FF5206_CROSS_PRODUCT,
    },
    {
      feature: F_TIMESCALE,
      scenario: "the check runs over target-setting edges ONLY — a data-feed edge produces nothing",
      class: "structural-duplicate",
      reason: "The gate drives the same periodic pair joined by `data-feed` and asserts an empty result, immediately after the cross-product that makes the target-setting version fire.",
      pointer: FF5206_CROSS_PRODUCT,
    },
    {
      feature: F_TIMESCALE,
      scenario: "a target-setting edge from an actor produces nothing at all — an actor has no cadence by schema",
      class: "structural-duplicate",
      reason: "The gate's out-of-domain leg drives an actor-declared target-setting edge to a periodic loop and asserts nothing at all is emitted.",
      pointer: FF5206_OUT_OF_DOMAIN,
    },
    {
      feature: F_TIMESCALE,
      scenario: "a target-setting edge TO an actor produces nothing at all",
      class: "structural-duplicate",
      reason: "The same out-of-domain leg drives a periodic loop target-setting an actor endpoint and asserts an empty result.",
      pointer: FF5206_OUT_OF_DOMAIN,
    },
    {
      feature: F_TIMESCALE,
      scenario: "a target-setting edge to an extra-registry endpoint produces nothing",
      class: "structural-duplicate",
      reason: "The same leg sweeps `command:`, `config:` and `module:` endpoints and asserts each is outside the loop timescale domain.",
      pointer: FF5206_OUT_OF_DOMAIN,
    },
    {
      feature: F_TIMESCALE,
      scenario: "a target-setting edge to an endpoint with no declaring record produces nothing",
      class: "structural-duplicate",
      reason: "The same leg drives an endpoint with `resolved: false` and no declaring record and asserts an empty result.",
      pointer: FF5206_OUT_OF_DOMAIN,
    },
    {
      feature: F_TIMESCALE,
      scenario: "a self-declared target-setting edge is OUT OF DOMAIN — the check emits nothing",
      class: "structural-duplicate",
      reason: "The same leg's first assertion is exactly this shape — a periodic loop declaring `target-setting: [itself]` — and asserts an empty result. The non-periodic self-edges it does NOT reach are decided here instead.",
      pointer: FF5206_OUT_OF_DOMAIN,
    },
    {
      feature: F_CODES,
      scenario: "every finding carries exactly the four envelope keys",
      class: "structural-duplicate",
      reason: "The gate's `assertEnvelope` deep-equals the sorted key list of every finding of both lanes against `[code, message, path, severity]`, so an extra or a missing key fails there.",
      pointer: FF5209_CODE_TABLE,
    },
    {
      feature: F_CODES,
      scenario: "severity is only ever `warn` or `error`",
      class: "structural-duplicate",
      reason: "The gate holds every emitted code to the literal 24-row lane/severity table, which is stronger than the two-value claim and pins all eight check codes at `warn`.",
      pointer: FF5209_CODE_TABLE,
    },
    {
      feature: F_CODES,
      scenario: "`path` is a raw absolute in its on-disk OS form",
      class: "structural-duplicate",
      reason: "The gate asserts `path.isAbsolute` for every finding AND, for the loader lane, that the anchor contains `path.sep` — the discriminator that catches a forward-slashed `C:/x` which `isAbsolute` alone admits.",
      pointer: FF5209_CODE_TABLE,
    },
    {
      feature: F_CODES,
      scenario: "a per-node finding anchors at the node's own file",
      class: "duplicate-claim",
      reason: "The per-node leg of the ternary `path` rule, written in four features. Its home is this suite's inbound-check lane, where the anchor is asserted on the finding the scenario is actually about.",
      pointer: "an optimizing loop with no inbound monitoring edge is unpaired",
    },
    {
      feature: F_CODES,
      scenario: "a whole-graph finding anchors at the loops directory",
      class: "duplicate-claim",
      reason: "The whole-graph leg of the same ternary `path` rule; decided in this suite against the groundedness check, including the negative half (no verdict anchors at a node's own file).",
      pointer: "whole-graph verdicts anchor at the loops directory",
    },
    {
      feature: F_CODES,
      scenario: "a per-edge finding anchors at the declaring node's file",
      class: "duplicate-claim",
      reason: "The per-edge leg of the same ternary `path` rule; decided in this suite against the timescale check, where the endpoint's file and the source directory are both excluded by name.",
      pointer: "every edge finding anchors at the declaring node, never at the endpoint and never at the directory",
    },
    {
      feature: F_CODES,
      scenario: "every emitted code is a member of the exported frozen set",
      class: "structural-duplicate",
      reason: "The gate looks every emitted code up in the literal 24-code table and fails on an undeclared one, then asserts all 24 are reachable.",
      pointer: FF5209_CODE_TABLE,
    },
    {
      feature: F_CODES,
      scenario: "the exported set is the CHECKS lane only — the loader's codes have another home",
      class: "structural-duplicate",
      reason: "The gate deep-equals `CHECK_FINDING_CODES` against the eight check-lane rows and `LOADER_FINDING_CODES` against the sixteen loader rows of one literal table, which is what makes the two lanes disjoint by construction.",
      pointer: FF5209_CODE_TABLE,
    },
    {
      feature: F_CODES,
      scenario: "the exported set cannot be mutated by a consumer",
      class: "structural-duplicate",
      reason: "The vocabulary gate calls `.add(\"not-admitted\")` on `CHECK_FINDING_CODES` among the frozen collections and asserts the sorted membership is unchanged.",
      pointer: FF5203_VOCABULARIES,
    },
    {
      feature: F_CODES,
      scenario: "the five checks are identified by their frozen ids",
      class: "structural-duplicate",
      reason: "The gate deep-equals `CHECK_IDS` against the five ids in order and asserts no exported `check*` function escapes that mapping — the ordering and the exhaustiveness both.",
      pointer: FF5205_DETERMINISM,
    },
    {
      feature: F_CODES,
      scenario: "`loop-self-referential-edge` is attributed by EDGE TYPE, so the counter is deterministic",
      class: "duplicate-claim",
      reason: "The attribution rule is written three times across the milestone's features. Its home is this suite's one-node-carrying-both-self-edges case, the only shape that can catch cross-attribution at all.",
      pointer: "one self-referential finding per offending edge, and the loop still carries both inbound verdicts",
    },
    {
      feature: F_CODES,
      scenario: "the three `ran` cases, pinned at the seam",
      class: "duplicate-claim",
      reason: "`ran` is not a check's output — it is derived by `work:loops-validate` from `Model.present`, so the claim is command-shaped and belongs to the command-family suite (task 03). What IS this suite's half — that no check reads `present` — is decided here.",
      pointer: "the three `ran` cases, pinned at the seam",
    },
    {
      feature: F_CODES,
      scenario: "the same literal model yields byte-identical findings on repeated invocation",
      class: "structural-duplicate",
      reason: "The gate JSON-stringifies each check's output over one literal model twice in-process and asserts equality; its model fires all five checks, so the repeat is not vacuous.",
      pointer: FF5205_DETERMINISM,
    },
    {
      feature: F_CODES,
      scenario: "the same literal model yields byte-identical findings in a fresh process",
      class: "structural-duplicate",
      reason: "The gate re-runs the same literal model through `node --input-type=module --eval` in a newly started process and compares the stdout bytes with the in-process result.",
      pointer: FF5205_DETERMINISM,
    },
    {
      feature: F_CODES,
      scenario: "no check reads a clock",
      class: "structural-duplicate",
      reason: "The gate sweeps the checks module's source for `Date.now`, `new Date()` and any dynamic import, and for a transitive import of `node:fs`/`node:process`/`node:os` — a stronger claim than two wall-clock runs agreeing, which a cached timestamp would also satisfy.",
      pointer: FF5205_SOURCE_PURE,
    },
  ],
  tables: [
    { feature: F_SCC, index: 0, rows: 12, cases: SCC_ROWS },
    { feature: F_GROUND, index: 0, rows: 9, cases: GROUNDING_ROWS },
    { feature: F_INBOUND, index: 0, rows: 23, cases: UNPAIRED_ROWS },
    { feature: F_ACTUATOR, index: 0, rows: 16, cases: ARBITRATION_ROWS },
    { feature: F_TIMESCALE, index: 0, rows: 13, cases: DURATION_ROWS },
    { feature: F_TIMESCALE, index: 1, rows: 48, cases: TIMESCALE_CROSS_ROWS },
    { feature: F_CODES, index: 0, rows: 8, cases: CODE_ROWS },
    { feature: F_CODES, index: 1, rows: 3, cases: RAN_ROWS },
  ],
};
