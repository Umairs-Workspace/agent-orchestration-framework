// test/loop/work-loops-value.test.mjs — milestone 52 / story 05, task 01: THE VALUE SUITE.
//
// The subject is always a loaded model's `fields[key]` (a Field) or `edges[key]` (an Endpoint),
// reached through the exported `loadLoops(workDir)` over a temp `<work.dir>/loops/` materialised by
// `test/support/loop-registry-fixture.mjs`. Never a private value parser, never a source read.
//
// It mechanises the value-facing half of 52/00 — `02_field-value-grammar` (25 scenarios, 76 rows)
// and `03_pointer-endpoint-syntax` (29 scenarios, 41 rows). Almost none of that surface is
// pre-decided by the nine `test/arch/acd-loop-*` gates: FF-5203 set-equals the exported
// vocabularies, FF-5209 owns the code/severity table and the total order, FF-5206 builds
// `{kind:"periodic", ms}` literally. None of them ever asks what ONE AUTHORED STRING BECOMES.
//
// THE TWO CLAIMS THAT CARRY THE MILESTONE, and how each is mechanised here:
//
//   1. THE HONESTY ENVELOPE (ADR-002). A declared gap and a filled field differ in `kind`, so a
//      reader separates them WITHOUT reading `raw`. Every assertion below is on `kind` and its
//      payload; the gap/filled split is decided by a classifier handed `{ kind }` and nothing else,
//      which is what makes "without inspecting raw" a fact about the code rather than a promise.
//
//   2. ADR-003's SYNTAX-ONLY PROMISE, PROVED DIFFERENTIALLY. 52 validates the SHAPE of a pointer
//      and resolves nothing outside `<work.dir>/loops/`. Counting findings cannot prove that —
//      "no finding" is also what a resolver that happened to succeed would produce. So the load is
//      run against two different WORLDS: a registry citing five referents that do not exist, then
//      the same registry after those referents have been CREATED (at every root the loader could
//      reach: the temp root, the work directory, the loops directory itself, and a second global
//      home). The two loads are asserted BYTE-IDENTICAL. Nothing was consulted, so nothing could
//      change — and the comparison is proved sensitive in the same case by a third load, after one
//      new record lands INSIDE `loops/`, whose bytes do move.
//
// ONE CLAIM MIGRATES IN. `04_timescale-comparability`'s "duration units resolve and compare across
// ms, s, m, h and d" is a LOADER claim mis-homed in a check feature: FF-5206 and the checks suite
// both build `periodic(900_000, "periodic:15m")` literally, so nothing on disk ever resolves a unit
// from an authored string. The ladder is decided here, over records, and the ledger records the
// migration against the originating feature. See the note above `coverage`.
//
// NEGATIVES CARRY POSITIVE CONTROLS, MECHANICALLY. Every finding assertion in this suite goes
// through the three functions inside the `<suite-door>` block, which REFUSE an "asserts nothing was
// reported" claim that does not name, in the same case, the authored value that DOES report one.
// The meta test proves by source scan that there is no other door. The same block owns every read
// of an endpoint's three-valued resolution, so `true`/`false`/`null` is always asserted by IDENTITY
// and never by truthiness.
//
// TWO REGISTRATION TRAPS, confirmed at the source (`test/arch/loop/acd-loop-finding-envelope.test.mjs`
// :358 and :384): its roster leg deep-equals the on-disk `test/arch/acd-loop-*` list against a
// literal nine, and its import-block leg requires no tenth `...acdLoop` spread. So this suite lives
// in `test/` without the `acd-loop-` prefix and exports an alias that does not begin `acdLoop`.
//
// ADR-002 (the locked node contract, its admission rules and the honesty envelope), ADR-003 (the
// tier boundary — shape guaranteed, resolution never attempted), ADR-006 (the cadence grammar),
// ADR-011 §2 (the five typed kinds and the key-shaped `fields` map), §4 (the dropped line), §7 (the
// normalised model), ADR-013 §4 (no dedup of field lists), §5 ("#" admitted inside a "prose:" value).
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ADMITTED_KEYS, EDGE_KEYS, EVENT_TRIGGERS, FIELD_KINDS, LOADER_FINDING_CODES, NODE_KINDS,
  SENTINEL_TOKENS, loadLoops,
} from "../../src/work/loops.mjs";
import * as loaderModule from "../../src/work/loops.mjs";
import {
  actorRecord, codesFor, findingsFor, identityRecord, loadLoopsInFreshProcess, loopRecord,
  nodeFor, renderRecord, reversedFiles, withLoopRegistry,
} from "../support/loop-registry-fixture.mjs";
import { examplesTables } from "../support/feature-parse.mjs";
import { markedRegion } from "../support/source-slice.mjs";

const LOADER_TASKS = "wiki/work/52_milestone_loop-registry-and-graph/stories/00_story_loop-model-and-loader/tasks";
const CHECK_TASKS = "wiki/work/52_milestone_loop-registry-and-graph/stories/01_story_structural-checks/tasks";
const GRAMMAR_FEATURE = `${LOADER_TASKS}/02_field-value-grammar.feature`;
const POINTER_FEATURE = `${LOADER_TASKS}/03_pointer-endpoint-syntax.feature`;
const TIMESCALE_FEATURE = `${CHECK_TASKS}/04_timescale-comparability.feature`;

// The four gap kinds of ADR-002's envelope, plus "prose" — the set a consumer reading `kind` alone
// uses to tell a DECLARED GAP from a filled field. Named here because the honesty claim is that
// this partition is decidable from `kind` and from nothing else.
const GAP_KINDS = Object.freeze(["unknown", "uncapped", "none", "prose"]);
// The shape a key takes comes from the frozen schema (ADR-011 §2), never from the data — so these
// two lists, not the values, are what every shape assertion is made against.
const LIST_SHAPED_KEYS = Object.freeze(["reference", "measurement", "actuator", "ceiling"]);
const SCALAR_SHAPED_KEYS = Object.freeze(["controlled", "cadence", "owner", "optimizing", "ground"]);

const PROSE_DOC = "src/bundle/commands/continue.md";
const DANGLING = "loop-graph-dangling-endpoint";

/** Materialise, drive the exported loader, tear down. The subject stays in this file. */
async function overRegistry(files, run) {
  return withLoopRegistry(files, async (fixture) => run(await loadLoops(fixture.workDir), fixture));
}

const loopWith = (fields) => loopRecord({ fields });
const actorWith = (fields) => actorRecord({ fields });

/** Every field of every node, list entries flattened — the sweep surface for the envelope claims. */
function everyField(model) {
  const out = [];
  for (const node of model.nodes) {
    for (const [key, value] of Object.entries(node.fields)) {
      for (const field of Array.isArray(value) ? value : [value]) out.push({ node, key, field });
    }
  }
  return out;
}

/** Every endpoint of every node, with the key that declared it. */
function everyEndpoint(model) {
  const out = [];
  for (const node of model.nodes) {
    for (const [key, endpoints] of Object.entries(node.edges)) {
      for (const endpoint of endpoints) out.push({ node, key, endpoint });
    }
  }
  return out;
}

// <suite-door>
// ————— THE ONE DOOR EVERY FINDING AND EVERY RESOLUTION ASSERTION GOES THROUGH ————————————
// `01_loader-value-suite.feature`: "every case asserting that no finding is reported names, in the
// same case, the authored value that DOES report one", and "every three-valued resolution is
// asserted by identity against true, false or null, never by truthiness". Both are enforced here at
// RUN time rather than trusted, and the meta test proves by source scan that nothing bypasses this
// block — outside it the suite cannot reach `model.findings`, `codesFor`, `findingsFor`, or an
// endpoint's resolution at all.
const RESOLUTION = "resolved";
const THREE_VALUED = Object.freeze([true, false, null]);

/**
 * The exact code array anchored at one record. When the expectation is EMPTY, `control` must name a
 * path in the same model that really does report a finding — a negative with no positive control is
 * a dead test, and this refuses to run one. Returns the findings so a case can read severity and
 * message without a second door.
 */
function expectCodes(model, filePath, expected, { control = null, why = "" } = {}) {
  const label = why ? `${why} @ ${filePath}` : String(filePath);
  assert.deepEqual(codesFor(model, filePath), expected, label);
  if (expected.length === 0) {
    assert.ok(control, `${label}: a case asserting NO finding must name the authored value that DOES report one`);
    assert.ok(codesFor(model, control).length > 0, `${label}: ...and that control must really report one`);
  }
  return findingsFor(model, filePath);
}

/** `code` is absent at `at` — and PRESENT at `control`, in the same model, in the same case. */
function expectNoCode(model, code, { at, control, why = "" }) {
  const label = why ? `${why} @ ${at}` : String(at);
  assert.equal(codesFor(model, at).includes(code), false, `${label}: ${code} is not reported here`);
  assert.equal(codesFor(model, control).includes(code), true, `${label}: ...and the control in the same case does report ${code}`);
}

/** An endpoint's resolution, by IDENTITY against one of exactly three values — never truthiness. */
function resolvedIs(endpoint, expected, why = "") {
  assert.ok(THREE_VALUED.includes(expected), `${why}: a resolution expectation is true, false or null`);
  assert.equal(Object.hasOwn(endpoint, RESOLUTION), true, `${why}: every endpoint arrives already marked`);
  assert.strictEqual(endpoint[RESOLUTION], expected, `${why}: resolution is ${String(expected)}, by identity`);
  for (const other of THREE_VALUED) {
    if (other !== expected) assert.notStrictEqual(endpoint[RESOLUTION], other, `${why}: and it is not ${String(other)}`);
  }
}

/** The sweep form: an endpoint arrives already marked, with one of exactly three values. */
function resolvedIsOneOfTheThree(endpoint, why = "") {
  assert.equal(Object.hasOwn(endpoint, RESOLUTION), true, `${why}: every endpoint arrives already marked`);
  assert.equal(THREE_VALUED.includes(endpoint[RESOLUTION]), true, `${why}: with one of exactly three values`);
}

/** A pointer in a FIELD has no resolution at all — the "—" column of the pointer table. */
function carriesNoResolution(field, why = "") {
  assert.equal(Object.hasOwn(field, RESOLUTION), false, `${why}: a field entry carries no resolution`);
}

/** The distinct codes a load emitted, sorted — the non-vacuity reader for the two case tables. */
function codesEmitted(model) {
  return [...new Set(model.findings.map((finding) => finding.code))].sort();
}
// </suite-door>

// ————— milestone 58 / story 00 — THE ARBITER'S DECLARATIONS AND THE LAYER AXIS ——————————
//
// Homed HERE, in the loader's own VALUE suite, because that is what these scenarios are about: a
// dwell grammar, a conflict register, a layer enum and a scope ordinal are value shapes, and
// 58/ADR-007 §3 assigns this file to 58/00 for exactly that reason. These cases carry their own
// tables and are deliberately NOT added to `coverage`, which is milestone 52's ledger over
// milestone 52's features and is bound row-for-row by `test/loop/work-loops-coverage-ledger.test.mjs`.
//
// Contracts: `wiki/work/58_milestone_supervising-loops/stories/00_story_the-supervision-vocabulary/
// tasks/01_what-an-arbiter-must-declare.feature` and `…/03_the-layer-a-loop-declares.feature`.
// ADR-002 §1/§2/§3, ADR-003 §2/§4/§5, ADR-004 §3.

const REPO_ROOT_58 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TASKS_58 = "wiki/work/58_milestone_supervising-loops/stories/00_story_the-supervision-vocabulary/tasks";
const DECLARE_FEATURE_58 = `${TASKS_58}/01_what-an-arbiter-must-declare.feature`;
const LAYER_FEATURE_58 = `${TASKS_58}/03_the-layer-a-loop-declares.feature`;

const fieldLine58 = (key, value) => (value === "" ? `${key}:` : `${key}: ${value}`);

/** A complete, finding-free `kind: arbiter` record — every line authored, as everywhere here. */
const arbiter58 = (stem, overrides = {}) => `---\n${Object.entries({
  id: `arbiter:${stem}`,
  kind: "arbiter",
  title: stem,
  resolves: "which loop wins the shared agent",
  // A FIELD, not an edge — naming loops no record declares raises nothing, which is the feature's
  // own "no finding is raised about which loops the order names".
  priority: "[loop:alpha, loop:beta]",
  dwell: "cycles:2",
  ...overrides,
}).filter(([, value]) => value !== null).map(([key, value]) => `${fieldLine58(key, value)}\n`).join("")}---\n# ${stem}\n`;

/** A complete `kind: watcher` record — 57's fourth kind, whose `counter` shares one rule with
 *  the arbiter's `resolves` and is driven beside it row for row. */
const watcher58 = (stem, overrides = {}) => `---\n${Object.entries({
  id: `watcher:${stem}`,
  kind: "watcher",
  title: stem,
  counter: "contract changes",
  determinism: "counter",
  measurement: "[module:src/work/loops.mjs#loadLoops]",
  ...overrides,
}).filter(([, value]) => value !== null).map(([key, value]) => `${fieldLine58(key, value)}\n`).join("")}---\n# ${stem}\n`;

/** A complete `kind: anchor` record — 55's third kind. */
const anchor58 = (stem, overrides = {}) => `---\n${Object.entries({
  id: `anchor:${stem}`,
  kind: "anchor",
  title: stem,
  ground: "process-exit",
  observes: "module:src/work/loops.mjs#loadLoops",
  ...overrides,
}).filter(([, value]) => value !== null).map(([key, value]) => `${fieldLine58(key, value)}\n`).join("")}---\n# ${stem}\n`;

// `01_what-an-arbiter-must-declare` Examples 1 — a count of cycles at or above one, or none, and
// the boundary is ONE, not zero. `unknown` is refused DELIBERATELY: a dwell is not a discovered
// fact but a policy its author chooses, and "no dwell" already has a name.
const DWELL_58_CASES = [
  { value: "cycles:1", outcome: "clean", kind: "cycles", cycles: 1 },
  { value: "cycles:2", outcome: "clean", kind: "cycles", cycles: 2 },
  { value: "cycles:12", outcome: "clean", kind: "cycles", cycles: 12 },
  { value: "none", outcome: "clean", kind: "none", cycles: null },
  { value: "cycles:0", outcome: "bad-value" },
  { value: "cycles:-1", outcome: "bad-value" },
  { value: "cycles:", outcome: "bad-value" },
  { value: "cycles", outcome: "bad-value" },
  { value: "cycles:2.5", outcome: "bad-value" },
  { value: "cycles:two", outcome: "bad-value" },
  { value: "2", outcome: "bad-value" },
  { value: "periodic:2", outcome: "bad-value" },
  { value: "unknown", outcome: "bad-value" },
  { value: "uncapped", outcome: "bad-value" },
  { value: "[cycles:2]", outcome: "non-scalar" },
];

// The feature prints an empty cell as `(empty)`; the fixture authors `resolves:` with nothing
// after the colon, which is the line a `.feature` row means by it.
const EMPTY_VALUE = "(empty)";

// `01_what-an-arbiter-must-declare` Examples 2 — ONE REGISTER FOR BOTH KEYS. Every row is driven
// against `resolves` on an arbiter AND `counter` on a watcher in the SAME load, which is what
// makes "every value either key admits, the other admits" a decided property rather than two
// tables that happen to agree today.
const RESOLVES_COUNTER_58_CASES = [
  { value: "which loop wins the shared agent", outcome: "clean" },
  { value: "speed vs thoroughness: whose demand wins", outcome: "clean" },
  { value: "prose:src/bundle/agents/aof-developer.md", outcome: "bad-value" },
  { value: "config:work.loop.reviewRounds", outcome: "bad-value" },
  { value: "module:src/work/loops.mjs#loadLoops", outcome: "bad-value" },
  { value: "command:aof work loops validate", outcome: "bad-value" },
  { value: "unknown", outcome: "bad-value" },
  { value: "uncapped", outcome: "bad-value" },
  { value: "none", outcome: "bad-value" },
  { value: EMPTY_VALUE, outcome: "bad-value" },
  { value: "[which loop wins the shared agent]", outcome: "non-scalar" },
];

// `01_what-an-arbiter-must-declare` Examples 0 — identity and the three declarations, and no
// default for any of them.
const ARBITER_REQUIRED_58_CASES = [
  { field: "id" },
  { field: "kind" },
  { field: "title" },
  { field: "resolves" },
  { field: "priority" },
  { field: "dwell" },
];

// `03_the-layer-a-loop-declares` Examples 0 — a node without a cadence has no place on this axis.
const LAYER_KIND_58_CASES = [
  { kind: "loop", admits: true, build: (stem, extra) => renderRecord(loopRecord({ fields: extra }), stem) },
  { kind: "actor", admits: false, build: (stem, extra) => renderRecord(actorRecord({ fields: extra }), stem) },
  { kind: "anchor", admits: false, build: (stem, extra) => anchor58(stem, extra) },
  { kind: "watcher", admits: false, build: (stem, extra) => watcher58(stem, extra) },
  { kind: "arbiter", admits: false, build: (stem, extra) => arbiter58(stem, extra) },
];

// `03_the-layer-a-loop-declares` Examples 1 — three literals ranked slower-is-higher, no sentinel,
// and no bare ordinal. `2` is a row because an ordinal is what the loader COMPUTES; a record that
// could author one directly would be a record that chose its own place in the hierarchy.
const LAYER_VALUE_58_CASES = [
  { value: "operational", rank: 0 },
  { value: "management", rank: 1 },
  { value: "governance", rank: 2 },
  { value: "operations", outcome: "bad-value" },
  { value: "tactical", outcome: "bad-value" },
  { value: "strategic", outcome: "bad-value" },
  { value: "unknown", outcome: "bad-value" },
  { value: "none", outcome: "bad-value" },
  { value: "2", outcome: "bad-value" },
  { value: "[operational]", outcome: "non-scalar" },
];

// `03_the-layer-a-loop-declares` Examples 2 — the closed trigger set stands in a containment
// relation (a run-start inside a phase, a phase inside an item, an item inside a milestone); a
// clock does not, and `unknown` is a declared gap that still carries its existing warn.
const CADENCE_SCOPE_58_CASES = [
  { cadence: "event:per-run-start", scopeRank: 0, codes: [] },
  { cadence: "event:per-phase", scopeRank: 0, codes: [] },
  { cadence: "event:per-item", scopeRank: 1, codes: [] },
  { cadence: "event:per-milestone", scopeRank: 2, codes: [] },
  { cadence: "periodic:15s", scopeRank: null, codes: [] },
  { cadence: "periodic:45s", scopeRank: null, codes: [] },
  { cadence: "unknown", scopeRank: null, codes: ["loop-cadence-unknown"] },
  { cadence: "event:per-week", scopeRank: null, outcome: "bad-value" },
  { cadence: "event:", scopeRank: null, outcome: "bad-value" },
];

/**
 * Milestone 58 / story 00's own ledger — one entry per case this file adds, naming the feature it
 * mechanises. Kept apart from `coverage` deliberately: that object is milestone 52's, consumed by
 * `test/loop/work-loops-coverage-ledger.test.mjs`, which set-equals it against the twenty features 52
 * covers. The meta test reads this one and resolves every feature path on disk.
 */
const TRACED_58_TABLES = [
  {
    feature: DECLARE_FEATURE_58,
    tables: [
      { header: ["field"], cases: ARBITER_REQUIRED_58_CASES },
      { header: ["value", "outcome"], cases: DWELL_58_CASES },
      { header: ["value", "outcome"], cases: RESOLVES_COUNTER_58_CASES },
    ],
  },
  {
    feature: LAYER_FEATURE_58,
    tables: [
      { header: ["kind", "outcome"], cases: LAYER_KIND_58_CASES },
      { header: ["value", "outcome"], cases: LAYER_VALUE_58_CASES },
      { header: ["cadence", "carried"], cases: CADENCE_SCOPE_58_CASES },
    ],
  },
];

const LEDGER_58 = [
  { test: "loops-value/58 a complete arbiter is read clean, and what it declared is readable off the node", feature: DECLARE_FEATURE_58 },
  { test: "loops-value/58 the dwell grammar table (table)", feature: DECLARE_FEATURE_58 },
  { test: "loops-value/58 the conflict an arbiter resolves and the metric a watcher counts are read by one rule (table)", feature: DECLARE_FEATURE_58 },
  { test: "loops-value/58 the arbiter's required declarations table (table)", feature: DECLARE_FEATURE_58 },
  { test: "loops-value/58 a loop declares the layer it runs at, and the record carries the ordinal a comparison will use", feature: LAYER_FEATURE_58 },
  { test: "loops-value/58 which kinds admit a layer (table)", feature: LAYER_FEATURE_58 },
  { test: "loops-value/58 the layer value table (table)", feature: LAYER_FEATURE_58 },
  { test: "loops-value/58 the cadence scope-ordinal table (table)", feature: LAYER_FEATURE_58 },
  { test: "loops-value/58 every Examples row of 58/00's value features is driven by a case", feature: DECLARE_FEATURE_58 },
];

// ————— the case tables ————————————————————————————————————————————————————————————————
// Each array below is iterated by exactly one test AND is the `cases` array of one `coverage.tables`
// entry, so a row that stopped being driven would stop being counted.

const noField = (key) => (node) => assert.equal(key in node.fields, false, `no admitted kind is claimed for "${key}"`);
const scalarField = (key, kind, payload = null) => (node) => {
  const field = node.fields[key];
  assert.ok(field, `"${key}" reached the model`);
  assert.equal(Array.isArray(field), false, `"${key}" is a single field, never wrapped in a list`);
  assert.equal(field.kind, kind);
  if (payload) payload(field);
};
const listField = (key, kinds, payload = null) => (node) => {
  const entries = node.fields[key];
  assert.ok(Array.isArray(entries), `"${key}" is a list of fields`);
  assert.deepEqual(entries.map((entry) => entry.kind), kinds, `"${key}" entry kinds`);
  if (payload) payload(entries);
};

// `02_field-value-grammar` Examples 0 — field key x raw value -> Field.kind x finding (76 rows).
// One record per row, all in ONE registry: the fixture's base record is finding-free, so each record
// authors exactly ONE value and `codes` is the EXACT finding array for that record. `kind` repeats
// the feature's own column so a reader can diff this table against the file.
//
// TWO ROWS CARRY A CONTRACT CONFLICT AND ARE DRIVEN BOTH WAYS (see `conflict`): the feature prints a
// BARE `unknown` on the list-shaped keys `measurement` and `actuator` against `loop-bad-value`, but
// its own preamble fixes the precedence — "evaluation stops at the FIRST gate that fails" — and its
// own `reference | module:src/run-store.mjs#isRetryable` row maps a bare scalar on a list key to
// `loop-expected-list`. The shape gate is reached first, so the value AS AUTHORED yields
// `loop-expected-list`; the bracketed form the row's finding describes (`[unknown]`, exactly the
// shape of the `reference | [unknown]` row) yields `loop-bad-value`. Both are asserted, and the
// conflict is recorded in the milestone's STATE.md rather than resolved by rewriting either side.
const FIELD_VALUE_ROWS = [
  { field: "title", authored: "Run resilience — runs driven to a terminal state", kind: "(no Field — bare string)", codes: [], severity: "—", spec: loopRecord({ title: "Run resilience — runs driven to a terminal state" }), check: (node) => { assert.equal(node.title, "Run resilience — runs driven to a terminal state"); assert.equal("title" in node.fields, false, "a title is a bare node-level string carrying no kind at all"); } },
  { field: "controlled", authored: "run state reaching a terminal value", kind: "phrase", codes: [], severity: "—", spec: loopWith({ controlled: "run state reaching a terminal value" }), check: scalarField("controlled", "phrase") },
  { field: "controlled", authored: "module:src/run-store.mjs#LEGAL_TRANSITIONS", kind: "pointer", codes: [], severity: "—", spec: loopWith({ controlled: "module:src/run-store.mjs#LEGAL_TRANSITIONS" }), check: scalarField("controlled", "pointer", (field) => assert.deepEqual(field.pointer, { scheme: "module", operand: "src/run-store.mjs", symbol: "LEGAL_TRANSITIONS" })) },
  { field: "controlled", authored: `prose:${PROSE_DOC}`, kind: "prose", codes: ["loop-field-prose-only"], severity: "warn", spec: loopWith({ controlled: `prose:${PROSE_DOC}` }), check: scalarField("controlled", "prose", (field) => assert.equal(field.path, PROSE_DOC)) },
  { field: "controlled", authored: "unknown", kind: "n/a", codes: ["loop-bad-value"], severity: "error", spec: loopWith({ controlled: "unknown" }), check: noField("controlled") },
  { field: "controlled", authored: "uncapped", kind: "n/a", codes: ["loop-bad-value"], severity: "error", spec: loopWith({ controlled: "uncapped" }), check: noField("controlled") },
  { field: "controlled", authored: "none", kind: "n/a", codes: ["loop-bad-value"], severity: "error", spec: loopWith({ controlled: "none" }), check: noField("controlled") },
  { field: "controlled", authored: "[run state reaching a terminal value]", kind: "n/a", codes: ["loop-expected-scalar"], severity: "error", spec: loopWith({ controlled: "[run state reaching a terminal value]" }), check: noField("controlled") },
  { field: "controlled", authored: "[module:a.mjs#x, module:b.mjs#y]", kind: "n/a", codes: ["loop-expected-scalar"], severity: "error", spec: loopWith({ controlled: "[module:a.mjs#x, module:b.mjs#y]" }), check: noField("controlled") },
  { field: "controlled", authored: "[]", kind: "n/a", codes: ["loop-expected-scalar"], severity: "error", spec: loopWith({ controlled: "[]" }), check: noField("controlled") },

  { field: "reference", authored: "[command:work:next]", kind: "pointer", codes: [], severity: "—", spec: loopWith({ reference: "[command:work:next]" }), check: listField("reference", ["pointer"], (entries) => assert.deepEqual(entries[0].pointer, { scheme: "command", operand: "work:next" })) },
  { field: "reference", authored: `[prose:${PROSE_DOC}]`, kind: "prose", codes: ["loop-field-prose-only"], severity: "warn", spec: loopWith({ reference: `[prose:${PROSE_DOC}]` }), check: listField("reference", ["prose"]) },
  { field: "reference", authored: "[module:a.mjs#x, prose:b.md]", kind: "pointer, prose", codes: [], severity: "—", spec: loopWith({ reference: "[module:a.mjs#x, prose:b.md]" }), check: listField("reference", ["pointer", "prose"]) },
  { field: "reference", authored: "[unknown]", kind: "n/a", codes: ["loop-bad-value"], severity: "error", spec: loopWith({ reference: "[unknown]" }), check: noField("reference") },
  { field: "reference", authored: "[the transition table in run-store]", kind: "n/a", codes: ["loop-bad-value"], severity: "error", spec: loopWith({ reference: "[the transition table in run-store]" }), check: noField("reference") },
  { field: "reference", authored: "module:src/run-store.mjs#isRetryable", kind: "n/a", codes: ["loop-expected-list"], severity: "error", spec: loopWith({ reference: "module:src/run-store.mjs#isRetryable" }), check: noField("reference") },
  { field: "reference", authored: "[]", kind: "n/a", codes: ["loop-empty-list"], severity: "error", spec: loopWith({ reference: "[]" }), check: noField("reference") },

  { field: "measurement", authored: "[module:src/run-store.mjs#isStale]", kind: "pointer", codes: [], severity: "—", spec: loopWith({ measurement: "[module:src/run-store.mjs#isStale]" }), check: listField("measurement", ["pointer"]) },
  { field: "measurement", authored: `[prose:${PROSE_DOC}]`, kind: "prose", codes: ["loop-field-prose-only"], severity: "warn", spec: loopWith({ measurement: `[prose:${PROSE_DOC}]` }), check: listField("measurement", ["prose"], (entries) => assert.equal(entries[0].path, PROSE_DOC)) },
  { field: "measurement", authored: `[prose:${PROSE_DOC}#retry-loop]`, kind: "prose (anchor kept)", codes: ["loop-field-prose-only"], severity: "warn", spec: loopWith({ measurement: `[prose:${PROSE_DOC}#retry-loop]` }), check: listField("measurement", ["prose"], (entries) => assert.equal(entries[0].path, `${PROSE_DOC}#retry-loop`, "the anchor is part of the payload")) },
  {
    field: "measurement", authored: "unknown", kind: "n/a", codes: ["loop-expected-list"], severity: "error",
    spec: loopWith({ measurement: "unknown" }), check: noField("measurement"),
    conflict: "the feature prints loop-bad-value for the bare form; its own precedence preamble puts the shape gate first",
    bracketed: { authored: "[unknown]", codes: ["loop-bad-value"], severity: "error", spec: loopWith({ measurement: "[unknown]" }), check: noField("measurement") },
  },
  { field: "measurement", authored: "[]", kind: "n/a", codes: ["loop-empty-list"], severity: "error", spec: loopWith({ measurement: "[]" }), check: noField("measurement") },

  { field: "actuator", authored: "[command:work:run-retry, command:work:run-complete]", kind: "pointer", codes: [], severity: "—", spec: loopWith({ actuator: "[command:work:run-retry, command:work:run-complete]" }), check: listField("actuator", ["pointer", "pointer"]) },
  { field: "actuator", authored: `[prose:${PROSE_DOC}]`, kind: "prose", codes: ["loop-field-prose-only"], severity: "warn", spec: loopWith({ actuator: `[prose:${PROSE_DOC}]` }), check: listField("actuator", ["prose"]) },
  {
    field: "actuator", authored: "unknown", kind: "n/a", codes: ["loop-expected-list"], severity: "error",
    spec: loopWith({ actuator: "unknown" }), check: noField("actuator"),
    conflict: "the feature prints loop-bad-value for the bare form; its own precedence preamble puts the shape gate first",
    bracketed: { authored: "[unknown]", codes: ["loop-bad-value"], severity: "error", spec: loopWith({ actuator: "[unknown]" }), check: noField("actuator") },
  },
  { field: "actuator", authored: "[]", kind: "n/a", codes: ["loop-empty-list"], severity: "error", spec: loopWith({ actuator: "[]" }), check: noField("actuator") },

  { field: "cadence", authored: "periodic:250ms", kind: "periodic (ms 250)", codes: [], severity: "—", spec: loopWith({ cadence: "periodic:250ms" }), check: scalarField("cadence", "periodic", (field) => assert.equal(field.ms, 250)) },
  { field: "cadence", authored: "periodic:15s", kind: "periodic (ms 15000)", codes: [], severity: "—", spec: loopWith({ cadence: "periodic:15s" }), check: scalarField("cadence", "periodic", (field) => assert.equal(field.ms, 15_000)) },
  { field: "cadence", authored: "periodic:90s", kind: "periodic (ms 90000)", codes: [], severity: "—", spec: loopWith({ cadence: "periodic:90s" }), check: scalarField("cadence", "periodic", (field) => assert.equal(field.ms, 90_000)) },
  { field: "cadence", authored: "periodic:15m", kind: "periodic (ms 900000)", codes: [], severity: "—", spec: loopWith({ cadence: "periodic:15m" }), check: scalarField("cadence", "periodic", (field) => assert.equal(field.ms, 900_000)) },
  { field: "cadence", authored: "periodic:2h", kind: "periodic (ms 7200000)", codes: [], severity: "—", spec: loopWith({ cadence: "periodic:2h" }), check: scalarField("cadence", "periodic", (field) => assert.equal(field.ms, 7_200_000)) },
  { field: "cadence", authored: "periodic:1d", kind: "periodic (ms 86400000)", codes: [], severity: "—", spec: loopWith({ cadence: "periodic:1d" }), check: scalarField("cadence", "periodic", (field) => assert.equal(field.ms, 86_400_000)) },
  { field: "cadence", authored: "event:per-item", kind: "event (per-item)", codes: [], severity: "—", spec: loopWith({ cadence: "event:per-item" }), check: scalarField("cadence", "event", (field) => assert.equal(field.trigger, "per-item")) },
  { field: "cadence", authored: "event:per-phase", kind: "event (per-phase)", codes: [], severity: "—", spec: loopWith({ cadence: "event:per-phase" }), check: scalarField("cadence", "event", (field) => assert.equal(field.trigger, "per-phase")) },
  { field: "cadence", authored: "event:per-milestone", kind: "event (per-milestone)", codes: [], severity: "—", spec: loopWith({ cadence: "event:per-milestone" }), check: scalarField("cadence", "event", (field) => assert.equal(field.trigger, "per-milestone")) },
  { field: "cadence", authored: "event:per-run-start", kind: "event (per-run-start)", codes: [], severity: "—", spec: loopWith({ cadence: "event:per-run-start" }), check: scalarField("cadence", "event", (field) => assert.equal(field.trigger, "per-run-start")) },
  { field: "cadence", authored: "unknown", kind: "unknown", codes: ["loop-cadence-unknown"], severity: "warn", spec: loopWith({ cadence: "unknown" }), check: scalarField("cadence", "unknown") },
  { field: "cadence", authored: "uncapped", kind: "n/a", codes: ["loop-bad-value"], severity: "error", spec: loopWith({ cadence: "uncapped" }), check: noField("cadence") },
  { field: "cadence", authored: "none", kind: "n/a", codes: ["loop-bad-value"], severity: "error", spec: loopWith({ cadence: "none" }), check: noField("cadence") },
  { field: "cadence", authored: "event:per-sprint", kind: "n/a", codes: ["loop-bad-value"], severity: "error", spec: loopWith({ cadence: "event:per-sprint" }), check: noField("cadence") },
  { field: "cadence", authored: "periodic:15", kind: "n/a", codes: ["loop-bad-value"], severity: "error", spec: loopWith({ cadence: "periodic:15" }), check: noField("cadence") },
  { field: "cadence", authored: "periodic:2w", kind: "n/a", codes: ["loop-bad-value"], severity: "error", spec: loopWith({ cadence: "periodic:2w" }), check: noField("cadence") },
  { field: "cadence", authored: "hourly", kind: "n/a", codes: ["loop-bad-value"], severity: "error", spec: loopWith({ cadence: "hourly" }), check: noField("cadence") },
  { field: "cadence", authored: "prose:src/mesh/sync-cadence.mjs", kind: "n/a", codes: ["loop-bad-value"], severity: "error", spec: loopWith({ cadence: "prose:src/mesh/sync-cadence.mjs" }), check: noField("cadence") },
  { field: "cadence", authored: "(empty after the colon)", kind: "n/a", codes: ["loop-bad-value"], severity: "error", spec: loopWith({ cadence: "" }), check: noField("cadence") },
  { field: "cadence", authored: "[periodic:15s]", kind: "n/a", codes: ["loop-expected-scalar"], severity: "error", spec: loopWith({ cadence: "[periodic:15s]" }), check: noField("cadence") },
  { field: "cadence", authored: "[]", kind: "n/a", codes: ["loop-expected-scalar"], severity: "error", spec: loopWith({ cadence: "[]" }), check: noField("cadence") },

  { field: "ceiling", authored: "[config:work.autonomous.maxAttempts]", kind: "pointer", codes: [], severity: "—", spec: loopWith({ ceiling: "[config:work.autonomous.maxAttempts]" }), check: listField("ceiling", ["pointer"]) },
  { field: "ceiling", authored: "[config:work.autonomous.maxAttempts, module:src/run-store.mjs#shouldRetry]", kind: "pointer", codes: [], severity: "—", spec: loopRecord({ fields: { ceiling: "[config:work.autonomous.maxAttempts, module:src/run-store.mjs#shouldRetry]" }, extraLines: ["# aof-generated: true"] }), check: listField("ceiling", ["pointer", "pointer"]) },
  { field: "ceiling", authored: "uncapped", kind: "uncapped (one-entry list)", codes: ["loop-ceiling-uncapped"], severity: "warn", spec: loopWith({ ceiling: "uncapped" }), check: listField("ceiling", ["uncapped"], (entries) => assert.equal(entries.length, 1)) },
  { field: "ceiling", authored: "none", kind: "none (one-entry list)", codes: [], severity: "—", spec: loopWith({ ceiling: "none" }), check: listField("ceiling", ["none"], (entries) => assert.equal(entries.length, 1)) },
  { field: "ceiling", authored: "unknown", kind: "unknown (one-entry list)", codes: ["loop-ceiling-unknown"], severity: "warn", spec: loopWith({ ceiling: "unknown" }), check: listField("ceiling", ["unknown"], (entries) => assert.equal(entries.length, 1)) },
  { field: "ceiling", authored: "[]", kind: "n/a", codes: ["loop-empty-list"], severity: "error", spec: loopWith({ ceiling: "[]" }), check: noField("ceiling") },
  { field: "ceiling", authored: "[uncapped]", kind: "n/a", codes: ["loop-bad-value"], severity: "error", spec: loopWith({ ceiling: "[uncapped]" }), check: noField("ceiling") },
  { field: "ceiling", authored: `[prose:${PROSE_DOC}]`, kind: "n/a", codes: ["loop-bad-value"], severity: "error", spec: loopWith({ ceiling: `[prose:${PROSE_DOC}]` }), check: noField("ceiling") },
  { field: "ceiling", authored: "3", kind: "n/a", codes: ["loop-bad-value"], severity: "error", spec: loopWith({ ceiling: "3" }), check: noField("ceiling") },

  { field: "owner", authored: "actor:product-owner", kind: "ref (actor / product-owner)", codes: [], severity: "—", spec: loopRecord(), check: scalarField("owner", "ref", (field) => { assert.equal(field.scheme, "actor"); assert.equal(field.operand, "product-owner"); }) },
  { field: "owner", authored: "unknown", kind: "unknown", codes: ["loop-owner-unknown"], severity: "warn", spec: loopWith({ owner: "unknown" }), check: scalarField("owner", "unknown") },
  { field: "owner", authored: "loop:autonomous-cascade", kind: "n/a", codes: ["loop-bad-value"], severity: "error", spec: loopWith({ owner: "loop:autonomous-cascade" }), check: noField("owner") },
  { field: "owner", authored: "prose:src/bundle/commands/verify.md", kind: "n/a", codes: ["loop-bad-value"], severity: "error", spec: loopWith({ owner: "prose:src/bundle/commands/verify.md" }), check: noField("owner") },
  { field: "owner", authored: "uncapped", kind: "n/a", codes: ["loop-bad-value"], severity: "error", spec: loopWith({ owner: "uncapped" }), check: noField("owner") },
  { field: "owner", authored: "the product owner", kind: "n/a", codes: ["loop-bad-value"], severity: "error", spec: loopWith({ owner: "the product owner" }), check: noField("owner") },
  { field: "owner", authored: "(empty after the colon)", kind: "n/a", codes: ["loop-bad-value"], severity: "error", spec: loopWith({ owner: "" }), check: noField("owner") },
  { field: "owner", authored: "[actor:product-owner]", kind: "n/a", codes: ["loop-expected-scalar"], severity: "error", spec: loopWith({ owner: "[actor:product-owner]" }), check: noField("owner") },
  { field: "owner", authored: "[]", kind: "n/a", codes: ["loop-expected-scalar"], severity: "error", spec: loopWith({ owner: "[]" }), check: noField("owner") },

  { field: "optimizing", authored: "true", kind: "flag (value true)", codes: [], severity: "—", spec: loopWith({ optimizing: "true" }), check: scalarField("optimizing", "flag", (field) => { assert.strictEqual(field.value, true, "the boolean true, not the string \"true\""); assert.equal(typeof field.value, "boolean"); }) },
  { field: "optimizing", authored: "false", kind: "flag (value false)", codes: [], severity: "—", spec: loopRecord(), check: scalarField("optimizing", "flag", (field) => { assert.strictEqual(field.value, false, "the boolean false, never a truthy string"); assert.equal(typeof field.value, "boolean"); }) },
  { field: "optimizing", authored: "unknown", kind: "n/a", codes: ["loop-bad-value"], severity: "error", spec: loopWith({ optimizing: "unknown" }), check: noField("optimizing") },
  { field: "optimizing", authored: "yes", kind: "n/a", codes: ["loop-bad-value"], severity: "error", spec: loopWith({ optimizing: "yes" }), check: noField("optimizing") },
  { field: "optimizing", authored: "[true]", kind: "n/a", codes: ["loop-expected-scalar"], severity: "error", spec: loopWith({ optimizing: "[true]" }), check: noField("optimizing") },
  { field: "optimizing", authored: "[]", kind: "n/a", codes: ["loop-expected-scalar"], severity: "error", spec: loopWith({ optimizing: "[]" }), check: noField("optimizing") },

  { field: "ground", authored: "exogenous (on a kind: actor node)", kind: "enum (value exogenous)", codes: [], severity: "—", spec: actorRecord(), check: scalarField("ground", "enum", (field) => assert.equal(field.value, "exogenous")) },
  { field: "ground", authored: "measured (on a kind: actor node)", kind: "n/a", codes: ["loop-bad-value"], severity: "error", spec: actorWith({ ground: "measured" }), check: noField("ground") },
  { field: "ground", authored: "[exogenous] (on a kind: actor node)", kind: "n/a", codes: ["loop-expected-scalar"], severity: "error", spec: actorWith({ ground: "[exogenous]" }), check: noField("ground") },
  { field: "ground", authored: "[] (on a kind: actor node)", kind: "n/a", codes: ["loop-expected-scalar"], severity: "error", spec: actorWith({ ground: "[]" }), check: noField("ground") },
  { field: "ground", authored: "exogenous (on a kind: loop node)", kind: "n/a", codes: ["loop-key-not-admitted-for-kind"], severity: "error", spec: loopWith({ ground: "exogenous" }), check: noField("ground") },
].map((row, index) => ({ ...row, file: `fv-${String(index).padStart(2, "0")}.md`, bracketedFile: `fv-${String(index).padStart(2, "0")}-bracketed.md` }));

// The row whose one authored slip makes every "(none)" row's silence non-vacuous.
const FIELD_VALUE_CONTROL = FIELD_VALUE_ROWS[4];

// `03_pointer-endpoint-syntax` Examples 0 — raw value -> parse x resolved x finding (41 rows).
// `resolved` applies to endpoints on the five edge keys; a pointer in a field has none at all, which
// is the "—" column and is asserted as an ABSENT property, not as a null one. A "field entry" row is
// authored into `reference:`, an "edge endpoint" row into `monitoring:`, and an "edge list" row is
// the whole authored value of an edge key.
const NO_RESOLUTION = "— no resolution column";

const fieldEntry = (authored, parses, codes) => ({ position: "field entry", authored, parses, resolved: NO_RESOLUTION, codes, spec: loopWith({ reference: `[${authored}]` }) });
const edgeEndpoint = (authored, parses, resolved, codes, note = "") => ({ position: "edge endpoint", authored, note, parses, resolved, codes, spec: loopWith({ monitoring: `[${authored}]` }) });

const POINTER_ROWS = [
  fieldEntry("module:src/run-store.mjs#isRetryable", { scheme: "module", operand: "src/run-store.mjs", symbol: "isRetryable" }, []),
  fieldEntry("command:work:next", { scheme: "command", operand: "work:next" }, []),
  fieldEntry("config:work.autonomous.maxAttempts", { scheme: "config", operand: "work.autonomous.maxAttempts" }, []),
  fieldEntry("module:src/does-not-exist.mjs#nope", { scheme: "module", operand: "src/does-not-exist.mjs", symbol: "nope" }, []),
  fieldEntry("module:src/work.mjs#notExported", { scheme: "module", operand: "src/work.mjs", symbol: "notExported" }, []),
  fieldEntry("command:work:no-such-verb", { scheme: "command", operand: "work:no-such-verb" }, []),
  fieldEntry("config:no.such.key", { scheme: "config", operand: "no.such.key" }, []),
  fieldEntry("module:src/run-store.mjs", null, ["loop-bad-value"]),
  fieldEntry("module:src/run-store.mjs#", null, ["loop-bad-value"]),
  fieldEntry("module:#isRetryable", null, ["loop-bad-value"]),
  fieldEntry("module:/src/run-store.mjs#x", null, ["loop-bad-value"]),
  fieldEntry("module:C:/src/run-store.mjs#x", null, ["loop-bad-value"]),
  fieldEntry("module:src\\run-store.mjs#x", null, ["loop-bad-value"]),
  fieldEntry("command:", null, ["loop-bad-value"]),
  fieldEntry("config:", null, ["loop-bad-value"]),
  fieldEntry(`doc:${PROSE_DOC}`, null, ["loop-bad-value"]),
  fieldEntry("item:52/00", null, ["loop-bad-value"]),
  fieldEntry("command:work:doctor#run", null, ["loop-bad-value"]),
  fieldEntry("config:work.autonomous.max#m", null, ["loop-bad-value"]),

  edgeEndpoint("loop:autonomous-cascade", { scheme: "loop", operand: "autonomous-cascade" }, true, [], "declared"),
  edgeEndpoint("actor:operator", { scheme: "actor", operand: "operator" }, true, [], "declared"),
  edgeEndpoint("loop:ghost", { scheme: "loop", operand: "ghost" }, false, [DANGLING], "undeclared"),
  edgeEndpoint("actor:ghost", { scheme: "actor", operand: "ghost" }, false, [DANGLING], "undeclared"),
  edgeEndpoint("loop:sensor", { scheme: "loop", operand: "sensor" }, true, [], "kind unreadable"),
  edgeEndpoint("item:52/00", { scheme: "item", operand: "52/00" }, null, []),
  edgeEndpoint("item:99/99", { scheme: "item", operand: "99/99" }, null, [], "no such item"),
  edgeEndpoint("command:work:doctor", { scheme: "command", operand: "work:doctor" }, null, []),
  edgeEndpoint("config:work.autonomous.maxAttempts", { scheme: "config", operand: "work.autonomous.maxAttempts" }, null, []),
  edgeEndpoint("module:src/run-store.mjs#isStale", { scheme: "module", operand: "src/run-store.mjs", symbol: "isStale" }, null, []),
  edgeEndpoint("module:src/run-store.mjs", null, NO_RESOLUTION, ["loop-bad-value"]),
  edgeEndpoint("node:autonomous-cascade", null, NO_RESOLUTION, ["loop-bad-value"]),
  edgeEndpoint("autonomous-cascade", null, NO_RESOLUTION, ["loop-bad-value"]),
  edgeEndpoint("loop:autonomous-cascade#x", null, NO_RESOLUTION, ["loop-bad-value"]),
  edgeEndpoint("item:52/00#anchor", null, NO_RESOLUTION, ["loop-bad-value"]),
  edgeEndpoint("command:work:doctor#run", null, NO_RESOLUTION, ["loop-bad-value"]),

  { position: "edge list", authored: "[loop:autonomous-cascade]", note: "declared", parses: "one endpoint on that key", resolved: true, codes: [], spec: loopWith({ monitoring: "[loop:autonomous-cascade]" }), check: (node) => assert.equal(node.edges.monitoring.length, 1) },
  { position: "edge list", authored: "[loop:a, loop:a]", note: "declared", parses: "one endpoint — deduplicated", resolved: true, codes: [], spec: loopWith({ monitoring: "[loop:a, loop:a]" }), check: (node) => { assert.equal(node.edges.monitoring.length, 1, "one fact stated twice is one edge"); assert.equal(JSON.stringify(node.edges).split("loop:a").length - 1, 1, "no second entry a consumer could count twice"); } },
  { position: "edge list", authored: "[loop:a, loop:a]", note: "a declares it — a SELF-edge", parses: "one SELF-edge — deduplicated", resolved: true, codes: [], file: "a.md", spec: loopWith({ monitoring: "[loop:a, loop:a]" }), check: (node) => { assert.equal(node.edges.monitoring.length, 1, "exactly one for a later check to see"); assert.equal(node.edges.monitoring[0].raw, node.id, "resolving to the declaring node itself"); } },
  { position: "edge list", authored: "[]", parses: "rejected — empty list", resolved: NO_RESOLUTION, codes: ["loop-empty-list"], spec: loopWith({ monitoring: "[]" }), check: (node) => assert.equal("monitoring" in node.edges, false, "nothing a consumer could read as declared-and-empty") },
  { position: "edge list", authored: "(the key is absent)", parses: "no such key in the model", resolved: NO_RESOLUTION, codes: [], spec: loopRecord(), check: (node) => assert.deepEqual(Object.keys(node.edges), [], "no such key in the model") },

  { position: "field list", authored: "[command:a, command:a]", parses: "two entries — never deduplicated", resolved: NO_RESOLUTION, codes: [], spec: loopWith({ actuator: "[command:a, command:a]" }), check: (node) => { assert.equal(node.fields.actuator.length, 2, "two declared authorities, kept"); assert.deepEqual(node.fields.actuator.map((entry) => entry.raw), ["command:a", "command:a"]); } },
].map((row, index) => ({ ...row, file: row.file ?? `pe-${String(index).padStart(2, "0")}.md` }));

// The row whose rejected pointer makes every "(none)" row's silence non-vacuous.
const POINTER_CONTROL = POINTER_ROWS[7];
// The three support records the resolution rows need: an endpoint resolves against a DECLARED id,
// so a declared loop, a declared actor and a record whose `kind` the loader cannot read must exist.
const POINTER_SUPPORT = {
  "autonomous-cascade.md": loopRecord(),
  "operator.md": actorRecord(),
  "sensor.md": identityRecord({ id: "loop:sensor", kind: "sensor" }),
};

// Test names live in one place so `coverage.decided[].test` cannot drift from the array; the meta
// test re-checks the correspondence in both directions.
const NAME = Object.freeze({
  sixKinds: "loops-value/02 the six gap-and-authority kinds are six distinct values",
  gapVsFilled: "loops-value/02 a declared gap is separable from a filled field by kind alone",
  rawAuthored: "loops-value/02 raw is the value exactly as authored, and the kind is the interpretation",
  pointerPresence: "loops-value/02 a pointer payload is present only when the kind is pointer",
  typedKinds: "loops-value/02 the five typed kinds each carry their own payload, and none is a gap kind",
  durationLadder: "loops-value/02 every duration unit resolves to milliseconds, and the ladder is what compares",
  eventCadence: "loops-value/02 an event cadence names its trigger and carries no duration",
  shapeByKey: "loops-value/02 a field's shape is fixed by its key, never by the data authored into it",
  sentinelAdmission: "loops-value/02 a sentinel is admitted where its key admits it and is a bad value everywhere else",
  ceilingSentinels: "loops-value/02 the three ceiling sentinels are told apart by kind AND by code",
  phraseAdmission: "loops-value/02 a free-text phrase is admitted on controlled, and on no other key",
  proseOnly: "loops-value/02 prose-only is a claim about the whole list, and each entry is classified on its own",
  emptyList: "loops-value/02 an empty list is an error, and never a declared gap",
  pointerSplit: "loops-value/03 a pointer splits at its FIRST colon, so a command operand keeps its own",
  pointerGrammar: "loops-value/03 the pointer grammar rejects a malformed module and both foreign schemes",
  endpointSchemes: "loops-value/03 the six endpoint schemes parse on every one of the five edge keys",
  hashOutsideModule: "loops-value/03 only a module pointer may carry a symbol, and a rejected value is never an endpoint",
  proseAnchor: "loops-value/03 a prose value is a sentinel, not a pointer, and keeps its anchor verbatim",
  intraRegistry: "loops-value/03 intra-registry endpoints resolve against the registry and nothing else",
  resolutionOrder: "loops-value/03 resolution does not depend on the order the records are read",
  extraRegistryNull: "loops-value/03 an extra-registry endpoint is unresolved, by identity and never by coercion",
  differential: "loops-value/03 the load consults nothing outside the loops directory",
  dedupAsymmetry: "loops-value/03 a field list keeps its duplicates and an edge list collapses them",
  emptyEdgeKey: "loops-value/03 an empty edge key and an absent one are different facts",
  tableGrammar: "loops-value table 02_field-value-grammar[0]: each authored value becomes its stated kind and finding",
  tablePointer: "loops-value table 03_pointer-endpoint-syntax[0]: each authored value parses, resolves and reports as stated",
  controlled: "loops-value/05 the suite drives the loaded model and its negatives carry positive controls",
});

// ————— the suite ——————————————————————————————————————————————————————————————————————
export const workLoopsValueTests = [
  {
    name: NAME.sixKinds,
    run: async () => {
      // One record per token — the six are AUTHORED separately so that no record's other keys can
      // supply the kind under test. The pointer/prose pair sit on `controlled` (the one key that
      // admits a phrase beside them), the two ceiling sentinels on `ceiling`, `unknown` on `owner`.
      await overRegistry({
        "k-pointer.md": loopWith({ controlled: "module:src/run-store.mjs#isRetryable" }),
        "k-prose.md": loopWith({ controlled: `prose:${PROSE_DOC}` }),
        "k-unknown.md": loopWith({ owner: "unknown" }),
        "k-uncapped.md": loopWith({ ceiling: "uncapped" }),
        "k-none.md": loopWith({ ceiling: "none" }),
        "k-phrase.md": loopWith({ controlled: "run state reaching a terminal value" }),
        "k-bad.md": loopWith({ controlled: "unknown" }),
      }, (model, fixture) => {
        const kindOf = (name, key) => {
          const value = nodeFor(model, fixture.pathOf(name)).fields[key];
          return (Array.isArray(value) ? value[0] : value).kind;
        };
        const observed = [
          kindOf("k-pointer.md", "controlled"), kindOf("k-prose.md", "controlled"),
          kindOf("k-unknown.md", "owner"), kindOf("k-uncapped.md", "ceiling"),
          kindOf("k-none.md", "ceiling"), kindOf("k-phrase.md", "controlled"),
        ];
        assert.deepEqual(observed, ["pointer", "prose", "unknown", "uncapped", "none", "phrase"]);
        // SIX DISTINCT VALUES, NOT ONE NULLABLE ONE: a loader that collapsed the four gap kinds to
        // "absent" would satisfy every per-record assertion above and fail this one.
        assert.equal(new Set(observed).size, 6, "no two of them share a kind");
        for (const kind of observed) assert.equal(FIELD_KINDS.has(kind), true, `${kind} is a member of the exported field-kind vocabulary`);
        // ...and every field of every node in the load carries the full envelope.
        const swept = everyField(model);
        assert.ok(swept.length >= 40, "the sweep is over a populated model, not an empty one");
        for (const { node, key, field } of swept) {
          const where = `${node.id}.${key}`;
          assert.deepEqual(field.key, key, `${where}: the field names its own key`);
          assert.equal(typeof field.raw, "string", `${where}: raw is present`);
          assert.equal(typeof field.kind, "string", `${where}: kind is present`);
          assert.ok(field.kind.length > 0, `${where}: kind is never absent, empty or null`);
          assert.notEqual(field.kind, null, `${where}: kind is never null`);
        }
        expectCodes(model, fixture.pathOf("k-none.md"), [], { control: fixture.pathOf("k-bad.md"), why: "ceiling: none is a filled value" });
        expectCodes(model, fixture.pathOf("k-phrase.md"), [], { control: fixture.pathOf("k-bad.md"), why: "a phrase on controlled is admitted" });
      });
    },
  },

  {
    name: NAME.gapVsFilled,
    run: async () => {
      // THE LOAD-BEARING SCENARIO OF THE MILESTONE (ADR-002).
      await overRegistry({
        "a.md": loopRecord(),
        "b.md": loopWith({ owner: "unknown" }),
      }, (model, fixture) => {
        const filled = nodeFor(model, fixture.pathOf("a.md")).fields.owner;
        const declaredGap = nodeFor(model, fixture.pathOf("b.md")).fields.owner;
        assert.notEqual(filled.kind, declaredGap.kind, "the two owner fields differ in KIND");
        assert.equal(declaredGap.kind, "unknown");
        assert.notEqual(filled.kind, "unknown");
        // A READER OF KIND ALONE SEPARATES THEM. The classifier is handed `{ kind }` and nothing
        // else — no raw reaches it, so "without inspecting raw" is a fact about what it can see.
        const readerOfKindAlone = (field) => {
          assert.deepEqual(Object.keys(field), ["kind"], "the reader is handed the kind and nothing else");
          return GAP_KINDS.includes(field.kind) ? "declared gap" : "filled";
        };
        assert.equal(readerOfKindAlone({ kind: filled.kind }), "filled");
        assert.equal(readerOfKindAlone({ kind: declaredGap.kind }), "declared gap");
        // ...and raw could not have done it: both raws are non-empty strings, and neither carries a
        // marker a consumer could branch on without knowing the vocabulary.
        assert.equal(typeof filled.raw, "string");
        assert.equal(typeof declaredGap.raw, "string");
        assert.notEqual(filled.raw, declaredGap.raw);
        expectCodes(model, fixture.pathOf("b.md"), ["loop-owner-unknown"], { why: "a declared gap is a warn" });
        expectCodes(model, fixture.pathOf("a.md"), [], { control: fixture.pathOf("b.md"), why: "a filled owner is silent" });
      });
    },
  },

  {
    name: NAME.rawAuthored,
    run: async () => {
      const phrase = "run state reaching a terminal value";
      await overRegistry({
        "raw.md": loopWith({ controlled: phrase, measurement: `[prose:${PROSE_DOC}#retry-loop]` }),
        "bad.md": loopWith({ controlled: "unknown" }),
      }, async (model, fixture) => {
        // NON-VACUITY FIRST: the record really does carry the line whose raw is being asserted.
        const text = await readFile(fixture.pathOf("raw.md"), "utf8");
        assert.ok(text.includes(`controlled: ${phrase}\n`), "the authored line is on disk, character for character");
        const node = nodeFor(model, fixture.pathOf("raw.md"));
        assert.equal(node.fields.controlled.raw, phrase, "raw is the value exactly as authored");
        // NEVER REPLACED BY A RESOLVED FORM: the pointer's raw survives whole beside its split.
        const pointer = node.fields.reference[0];
        assert.equal(pointer.raw, "module:src/run-store.mjs#isRetryable");
        assert.equal(pointer.pointer.operand, "src/run-store.mjs");
        assert.equal(pointer.raw.includes(pointer.pointer.operand), true, "the split is ADDED beside raw, never substituted for it");
        // ...and a sentinel's raw keeps the whole authored token, anchor and prefix included.
        assert.equal(node.fields.measurement[0].raw, `prose:${PROSE_DOC}#retry-loop`);
        expectCodes(model, fixture.pathOf("bad.md"), ["loop-bad-value"], { why: "the control: an authored value that DOES report" });
      });
    },
  },

  {
    name: NAME.pointerPresence,
    run: async () => {
      await overRegistry({
        "a.md": loopWith({ owner: "unknown" }),
        "b.md": loopWith({ measurement: `[prose:${PROSE_DOC}]` }),
        "bad.md": loopWith({ reference: "[doc:src/x.md]" }),
      }, (model, fixture) => {
        const node = nodeFor(model, fixture.pathOf("a.md"));
        const entry = node.fields.reference[0];
        assert.equal(entry.kind, "pointer");
        assert.equal(entry.pointer.scheme, "module");
        const owner = node.fields.owner;
        assert.equal(owner.kind, "unknown");
        assert.equal(Object.hasOwn(owner, "pointer"), false, "a declared gap carries no pointer");
        // THE BICONDITIONAL, over every field in the load: a `pointer` payload appears when the kind
        // is "pointer" and never otherwise — so the payload is never the thing a consumer branches on.
        const swept = everyField(model);
        assert.ok(swept.some(({ field }) => field.kind === "pointer"), "the sweep sees pointers");
        assert.ok(swept.some(({ field }) => field.kind !== "pointer"), "...and non-pointers");
        for (const { node: owning, key, field } of swept) {
          assert.equal(Object.hasOwn(field, "pointer"), field.kind === "pointer", `${owning.id}.${key} (${field.kind})`);
        }
        expectCodes(model, fixture.pathOf("bad.md"), ["loop-bad-value"], { why: "the control: an unknown scheme reports" });
      });
    },
  },

  {
    name: NAME.typedKinds,
    run: async () => {
      await overRegistry({
        "a.md": loopWith({ cadence: "periodic:15s", optimizing: "true" }),
        "b.md": loopRecord(),
        "operator.md": actorRecord(),
        "filled.md": loopWith({ cadence: "periodic:15s", optimizing: "false" }),
        "gapped.md": loopWith({ owner: "unknown" }),
      }, (model, fixture) => {
        const a = nodeFor(model, fixture.pathOf("a.md")).fields;
        const b = nodeFor(model, fixture.pathOf("b.md")).fields;
        const ground = nodeFor(model, fixture.pathOf("operator.md")).fields.ground;
        assert.equal(a.cadence.kind, "periodic");
        assert.equal(a.cadence.ms, 15_000);
        assert.equal(typeof a.cadence.ms, "number", "a numeric millisecond value, not a string");
        assert.equal(b.cadence.kind, "event");
        assert.equal(b.cadence.trigger, "per-item");
        assert.equal(a.owner.kind, "ref");
        assert.equal(a.owner.scheme, "actor");
        assert.equal(a.owner.operand, "product-owner");
        assert.equal(a.optimizing.kind, "flag");
        assert.strictEqual(a.optimizing.value, true, "a boolean, not the string \"true\"");
        assert.equal(ground.kind, "enum");
        assert.equal(ground.value, "exogenous");
        // NONE OF THE FIVE IS A GAP KIND — the honesty envelope's other half.
        const five = [a.cadence, b.cadence, a.owner, a.optimizing, ground];
        for (const field of five) {
          assert.equal(GAP_KINDS.includes(field.kind), false, `${field.key} (${field.kind}) is not a gap kind`);
          assert.equal(field.kind === "phrase", false, `${field.key} is not a phrase either`);
        }
        assert.deepEqual([...new Set(five.map((field) => field.kind))].sort(), ["enum", "event", "flag", "periodic", "ref"]);
        // A FILLED TYPED VALUE NEVER CARRIES A GAP KIND, and no honesty-lane finding is raised for it.
        const filled = nodeFor(model, fixture.pathOf("filled.md")).fields;
        assert.deepEqual([filled.cadence.kind, filled.owner.kind, filled.optimizing.kind], ["periodic", "ref", "flag"]);
        assert.strictEqual(filled.optimizing.value, false);
        expectCodes(model, fixture.pathOf("filled.md"), [], { control: fixture.pathOf("gapped.md"), why: "no honesty-lane finding for a filled typed value" });
      });
    },
  },

  {
    name: NAME.durationLadder,
    run: async () => {
      // THE MIGRATED CLAIM (`04_timescale-comparability`: "duration units resolve and compare across
      // ms, s, m, h and d"). FF-5206 and the checks suite both build `{kind:"periodic", ms}`
      // literally and never resolve a unit, so the ladder is decided by nothing until here.
      await overRegistry({
        "d-250ms.md": loopWith({ cadence: "periodic:250ms" }),
        "d-15s.md": loopWith({ cadence: "periodic:15s" }),
        "d-15m.md": loopWith({ cadence: "periodic:15m" }),
        "d-2h.md": loopWith({ cadence: "periodic:2h" }),
        "d-1d.md": loopWith({ cadence: "periodic:1d" }),
        "d-1h.md": loopWith({ cadence: "periodic:1h" }),
        "d-1000ms.md": loopWith({ cadence: "periodic:1000ms" }),
        "d-1s.md": loopWith({ cadence: "periodic:1s" }),
        "d-500ms.md": loopWith({ cadence: "periodic:500ms" }),
        "d-bad.md": loopWith({ cadence: "periodic:2w" }),
      }, (model, fixture) => {
        const cadence = (name) => nodeFor(model, fixture.pathOf(name)).fields.cadence;
        const ladder = ["d-250ms.md", "d-15s.md", "d-15m.md", "d-2h.md", "d-1d.md"].map(cadence);
        assert.deepEqual(ladder.map((field) => field.ms), [250, 15_000, 900_000, 7_200_000, 86_400_000]);
        for (const field of ladder) {
          assert.equal(typeof field.ms, "number", "each ms is a number, not a string");
          assert.deepEqual(Object.keys(field).sort(), ["key", "kind", "ms", "raw"], "no consumer is handed the duration to interpret");
        }
        assert.deepEqual(ladder.map((field) => field.raw), ["periodic:250ms", "periodic:15s", "periodic:15m", "periodic:2h", "periodic:1d"], "each raw is still the authored string");
        // THE COMPARISON USES THE RESOLVED DURATIONS, NOT THE LITERAL NUMBERS. The discriminator:
        // "periodic:15m" and "periodic:15s" print the SAME literal 15, and "periodic:1h" prints a
        // literal 1 against "periodic:1000ms"'s 1000 — so any comparison over the printed digits
        // gets both pairs wrong, one by calling them equal and one by inverting them.
        const literal = (field) => Number(field.raw.match(/(\d+)/)[1]);
        assert.equal(literal(cadence("d-15m.md")), literal(cadence("d-15s.md")), "the literal numbers are equal");
        assert.equal(cadence("d-15m.md").ms / cadence("d-15s.md").ms, 60, "the resolved durations are 60x apart");
        assert.ok(literal(cadence("d-1h.md")) < literal(cadence("d-1000ms.md")), "the literal numbers invert this pair");
        assert.equal(cadence("d-1h.md").ms / cadence("d-1000ms.md").ms, 3600, "...and the resolved ratio is 3600");
        assert.equal(cadence("d-1d.md").ms / cadence("d-1h.md").ms, 24);
        assert.equal(cadence("d-1s.md").ms / cadence("d-500ms.md").ms, 2, "1s over 500ms is the ratio a check reads as an inversion");
        expectCodes(model, fixture.pathOf("d-1d.md"), [], { control: fixture.pathOf("d-bad.md"), why: "a resolvable unit is silent; periodic:2w is not" });
      });
    },
  },

  {
    name: NAME.eventCadence,
    run: async () => {
      await overRegistry({
        "e.md": loopWith({ cadence: "event:per-milestone" }),
        "e-bad.md": loopWith({ cadence: "event:per-sprint" }),
      }, (model, fixture) => {
        const field = nodeFor(model, fixture.pathOf("e.md")).fields.cadence;
        assert.equal(field.kind, "event");
        assert.equal(field.trigger, "per-milestone");
        // NO MS, AND NO DURATION OF ANY OTHER NAME: the exact key set is what decides it, so a
        // loader that stamped a `ms`/`period`/`everyMs` alongside the trigger fails here.
        //
        // RE-MECHANISED FOR 58/ADR-002 §2, and the distinction is the whole ADR. The scenario's
        // claim is "carries no DURATION", and it is unchanged. What changed is the proxy: this
        // used to read "no number-valued key at all", which was a fair stand-in while a duration
        // was the only number a cadence could carry. `scopeRank` is an ORDINAL over the closed
        // `EVENT_TRIGGERS` containment relation (a run-start inside a phase, a phase inside an
        // item, an item inside a milestone) — a structural fact about this system that is
        // computed, compared with `<`, and never divided. The old proxy would refuse it, so the
        // no-duration claim is asserted directly instead: by NAME (no duration-shaped key can
        // appear) and by MAGNITUDE (the only number is a small ordinal bounded by the trigger set,
        // which no millisecond value of any of these cadences could be).
        assert.deepEqual(Object.keys(field).sort(), ["key", "kind", "raw", "scopeRank", "trigger"]);
        for (const forbidden of ["ms", "period", "periodMs", "everyMs", "duration", "durationMs", "interval", "intervalMs", "seconds"]) {
          assert.equal(Object.hasOwn(field, forbidden), false, `nothing in the load converts a trigger into a duration (${forbidden})`);
        }
        const numbers = Object.entries(field).filter(([, value]) => typeof value === "number");
        assert.deepEqual(numbers.map(([key]) => key), ["scopeRank"], "the ONE number an event cadence carries is its scope ordinal");
        assert.ok(Number.isInteger(field.scopeRank) && field.scopeRank >= 0 && field.scopeRank < EVENT_TRIGGERS.size,
          "…and it is an ordinal over the closed trigger set, not a quantity of time");
        expectCodes(model, fixture.pathOf("e.md"), [], { control: fixture.pathOf("e-bad.md"), why: "an admitted trigger is silent; per-sprint is not" });
      });
    },
  },

  {
    name: NAME.shapeByKey,
    run: async () => {
      await overRegistry({
        "c-uncapped.md": loopWith({ ceiling: "uncapped" }),
        "c-pointer.md": loopWith({ ceiling: "[config:work.autonomous.maxAttempts]" }),
        "c-none.md": loopWith({ ceiling: "none" }),
        "c-unknown.md": loopWith({ ceiling: "unknown" }),
        "scalars.md": loopRecord(),
        "operator.md": actorRecord(),
        "c-bad.md": loopWith({ ceiling: "3" }),
      }, (model, fixture) => {
        const ceilingOf = (name) => nodeFor(model, fixture.pathOf(name)).fields.ceiling;
        for (const name of ["c-uncapped.md", "c-pointer.md", "c-none.md", "c-unknown.md"]) {
          const entries = ceilingOf(name);
          assert.ok(Array.isArray(entries), `${name}: ceiling is a list`);
          assert.equal(entries.length, 1, `${name}: with one entry`);
        }
        assert.deepEqual(
          ["c-uncapped.md", "c-none.md", "c-unknown.md"].map((name) => ceilingOf(name)[0].kind),
          ["uncapped", "none", "unknown"],
          "a sentinel on ceiling still arrives inside a list, and its kind is the entry's",
        );
        // THE SHAPE IS A FUNCTION OF THE KEY ALONE, swept over a model whose ceilings are authored
        // four different ways: no consumer has to ask whether a value arrived as a list.
        let seen = 0;
        for (const node of model.nodes) {
          for (const [key, value] of Object.entries(node.fields)) {
            seen += 1;
            const expected = LIST_SHAPED_KEYS.includes(key);
            assert.equal(SCALAR_SHAPED_KEYS.includes(key), !expected, `${key} is in exactly one shape class`);
            assert.equal(Array.isArray(value), expected, `${node.id}.${key} is ${expected ? "a list" : "a single field"}`);
          }
        }
        assert.ok(seen >= 30, "the sweep is over a populated model");
        // ...and the five scalar keys are never wrapped into a one-entry list to match their
        // list-shaped siblings, on the one record that declares all of them.
        const scalars = nodeFor(model, fixture.pathOf("scalars.md")).fields;
        for (const key of ["controlled", "cadence", "owner", "optimizing"]) assert.equal(Array.isArray(scalars[key]), false, key);
        assert.equal(Array.isArray(nodeFor(model, fixture.pathOf("operator.md")).fields.ground), false, "ground");
        expectCodes(model, fixture.pathOf("c-none.md"), [], { control: fixture.pathOf("c-bad.md"), why: "a sentinel ceiling loads; ceiling: 3 does not" });
      });
    },
  },
  {
    name: NAME.sentinelAdmission,
    run: async () => {
      // A SENTINEL IS ADMITTED ON A NAMED SUBSET OF KEYS AND NOWHERE ELSE (ADR-002's admission
      // rules). On the three list-shaped machinery keys the token is authored INSIDE the list, which
      // is the form the covered feature's own `reference | [unknown]` row prints: a bare scalar
      // there fails the shape gate first and never reaches the value grammar (see the two rows
      // annotated `conflict` in FIELD_VALUE_ROWS).
      await overRegistry({
        "admitted.md": loopWith({ owner: "unknown", cadence: "unknown", ceiling: "unknown" }),
        "s-controlled.md": loopWith({ controlled: "unknown" }),
        "s-reference.md": loopWith({ reference: "[unknown]" }),
        "s-measurement.md": loopWith({ measurement: "[unknown]" }),
        "s-actuator.md": loopWith({ actuator: "[unknown]" }),
        "u-ceiling.md": loopWith({ ceiling: "uncapped" }),
        "u-cadence.md": loopWith({ cadence: "uncapped" }),
      }, (model, fixture) => {
        // EACH ADMITTED PLACEMENT YIELDS ITS GAP KIND AND ITS OWN WARN CODE. The three arrive in
        // schema key order on the one record that declares all three.
        const admitted = nodeFor(model, fixture.pathOf("admitted.md")).fields;
        assert.equal(admitted.owner.kind, "unknown");
        assert.equal(admitted.cadence.kind, "unknown");
        assert.equal(admitted.ceiling[0].kind, "unknown");
        const warns = expectCodes(model, fixture.pathOf("admitted.md"), ["loop-cadence-unknown", "loop-ceiling-unknown", "loop-owner-unknown"], { why: "each admitted placement gets its OWN code" });
        for (const finding of warns) assert.equal(finding.severity, "warn");
        assert.equal(warns.some((finding) => finding.code === "loop-bad-value"), false, "no bad value for any of them");
        // EACH UNADMITTED PLACEMENT IS loop-bad-value AT ERROR — an aspirational loop cannot be
        // declared, so the token that says "no evidence" is refused on the machinery keys.
        for (const name of ["s-controlled.md", "s-reference.md", "s-measurement.md", "s-actuator.md"]) {
          const findings = expectCodes(model, fixture.pathOf(name), ["loop-bad-value"], { why: `"unknown" is not admitted here (${name})` });
          assert.equal(findings[0].severity, "error");
          assert.ok(findings[0].message.includes("unknown"), "naming the value it refused");
        }
        assert.equal(nodeFor(model, fixture.pathOf("s-controlled.md")).fields.controlled, undefined, "and no kind is claimed for it");
        // "uncapped" is admitted on ceiling and is a bad value on cadence — the same asymmetry.
        assert.equal(nodeFor(model, fixture.pathOf("u-ceiling.md")).fields.ceiling[0].kind, "uncapped");
        expectCodes(model, fixture.pathOf("u-ceiling.md"), ["loop-ceiling-uncapped"], { why: "admitted on ceiling" });
        const badCadence = expectCodes(model, fixture.pathOf("u-cadence.md"), ["loop-bad-value"], { why: "uncapped on any key other than ceiling" });
        assert.equal(badCadence[0].severity, "error");
        assert.ok(badCadence[0].message.includes("cadence"), "naming cadence");
      });
    },
  },

  {
    name: NAME.ceilingSentinels,
    run: async () => {
      await overRegistry({
        "a.md": loopWith({ ceiling: "unknown" }),
        "b.md": loopWith({ ceiling: "uncapped" }),
        "c.md": loopWith({ ceiling: "none" }),
      }, (model, fixture) => {
        const entry = (name) => nodeFor(model, fixture.pathOf(name)).fields.ceiling[0];
        const kinds = ["a.md", "b.md", "c.md"].map((name) => entry(name).kind);
        assert.deepEqual(kinds, ["unknown", "uncapped", "none"]);
        assert.equal(new Set(kinds).size, 3, "no two of the three carry the same kind");
        // A loop with NO BOUND is never conflated with a body that terminates by construction.
        assert.notEqual(entry("b.md").kind, entry("c.md").kind);
        // TOLD APART BY CODE AS WELL AS BY KIND — a consumer reading only the findings still
        // separates all three, because the third's silence is itself the third answer.
        const unknown = expectCodes(model, fixture.pathOf("a.md"), ["loop-ceiling-unknown"], { why: "a declared gap warns like its siblings" });
        const uncapped = expectCodes(model, fixture.pathOf("b.md"), ["loop-ceiling-uncapped"], { why: "evidence found, and it is that no bound exists" });
        expectCodes(model, fixture.pathOf("c.md"), [], { control: fixture.pathOf("a.md"), why: "ceiling: none reports no ceiling finding at all" });
        assert.equal(unknown[0].severity, "warn");
        assert.equal(uncapped[0].severity, "warn");
        assert.notEqual(unknown[0].code, uncapped[0].code);
        for (const finding of [...unknown, ...uncapped]) {
          assert.notEqual(finding.severity, "error", "never reported at severity error");
          assert.ok(finding.message.includes("ceiling"), "naming ceiling");
        }
        // ...AND IT NEVER BLOCKS THE NODE FROM LOADING: the gapped record carries every other field.
        const gapped = nodeFor(model, fixture.pathOf("a.md"));
        assert.deepEqual(Object.keys(gapped.fields).sort(), ["actuator", "cadence", "ceiling", "controlled", "measurement", "optimizing", "owner", "reference"]);
      });
    },
  },

  {
    name: NAME.phraseAdmission,
    run: async () => {
      const phrase = "run state reaching a terminal value";
      await overRegistry({
        "p.md": loopWith({ controlled: phrase }),
        "p-reference.md": loopWith({ reference: "[the transition table in run-store]" }),
        "p-measurement.md": loopWith({ measurement: "[the transition table in run-store]" }),
        "p-actuator.md": loopWith({ actuator: "[the transition table in run-store]" }),
        "p-owner.md": loopWith({ owner: "the product owner" }),
        "p-cadence.md": loopWith({ cadence: "hourly" }),
        "p-ceiling.md": loopWith({ ceiling: "3" }),
        "p-optimizing.md": loopWith({ optimizing: "yes" }),
        "p-ground.md": actorWith({ ground: "measured" }),
      }, (model, fixture) => {
        const node = nodeFor(model, fixture.pathOf("p.md"));
        assert.equal(node.fields.controlled.kind, "phrase");
        // A TITLE IS A BARE NODE-LEVEL STRING, so the phrase admission never applies to it.
        assert.equal(node.title, "p", "the title reaches the consumer as the node's own string");
        assert.equal("title" in node.fields, false, "not an entry in fields");
        assert.equal(Object.hasOwn(node, "kind"), true);
        expectCodes(model, fixture.pathOf("p.md"), [], { control: fixture.pathOf("p-owner.md"), why: "no finding for the phrase or the title" });
        // CONTROLLED IS THE ONLY KEY ON WHICH A FREE PHRASE IS ADMITTED. Every other key that could
        // plausibly take one is authored with a phrase here, and each is refused...
        for (const name of ["p-reference.md", "p-measurement.md", "p-actuator.md", "p-owner.md", "p-cadence.md", "p-ceiling.md", "p-optimizing.md", "p-ground.md"]) {
          const findings = expectCodes(model, fixture.pathOf(name), ["loop-bad-value"], { why: `a free-text phrase is a bad value here (${name})` });
          assert.equal(findings[0].severity, "error");
        }
        assert.equal("reference" in nodeFor(model, fixture.pathOf("p-reference.md")).fields, false, "the entry is not admitted as a weak pointer");
        // ...and the model bears it out: no node anywhere carries kind "phrase" on another key.
        const phrases = everyField(model).filter(({ field }) => field.kind === "phrase");
        assert.ok(phrases.length > 0, "the sweep sees a phrase, so its scoping is not vacuous");
        for (const { node: owning, key } of phrases) assert.equal(key, "controlled", `${owning.id}.${key}`);
      });
    },
  },

  {
    name: NAME.proseOnly,
    run: async () => {
      await overRegistry({
        "mixed.md": loopWith({ actuator: `[command:work:run-retry, prose:${PROSE_DOC}]` }),
        "all-prose.md": loopWith({ actuator: `[prose:${PROSE_DOC}]` }),
        "pointer-solo.md": loopWith({ actuator: "[command:work:run-retry]" }),
        "measured.md": loopWith({ measurement: `[prose:${PROSE_DOC}]` }),
      }, (model, fixture) => {
        const entriesOf = (name, key) => nodeFor(model, fixture.pathOf(name)).fields[key];
        const mixed = entriesOf("mixed.md", "actuator");
        assert.deepEqual(mixed.map((entry) => entry.kind), ["pointer", "prose"], "each entry of a list field is classified on its own");
        // A FIELD CARRYING AT LEAST ONE MACHINE-READABLE POINTER IS NOT PROSE-ONLY: the code is a
        // claim about the WHOLE list, which is the number ADR-003 makes the registry's honesty from.
        expectCodes(model, fixture.pathOf("mixed.md"), [], { control: fixture.pathOf("all-prose.md"), why: "the mixed list reports no loop-field-prose-only" });
        const warn = expectCodes(model, fixture.pathOf("all-prose.md"), ["loop-field-prose-only"], { why: "the all-prose list reports the warn" });
        assert.equal(warn[0].severity, "warn");
        assert.ok(warn[0].message.includes("actuator"), "naming the key");
        // NO ENTRY'S KIND WAS DECIDED BY ITS SIBLINGS: each of the mixed list's entries is
        // byte-identical to the same value standing alone on another record.
        assert.deepEqual(mixed[0], entriesOf("pointer-solo.md", "actuator")[0]);
        assert.deepEqual(mixed[1], entriesOf("all-prose.md", "actuator")[0]);
        // A FIELD WHOSE AUTHORITY IS ONLY A PARAGRAPH IS A WARN, NOT AN ERROR — the node still loads.
        const prose = entriesOf("measured.md", "measurement")[0];
        assert.equal(prose.kind, "prose");
        const measured = expectCodes(model, fixture.pathOf("measured.md"), ["loop-field-prose-only"], { why: "naming measurement" });
        assert.equal(measured[0].severity, "warn");
        assert.equal(measured.some((finding) => finding.severity === "error"), false, "no error-severity finding for that field");
        assert.equal(nodeFor(model, fixture.pathOf("measured.md")).fields.measurement.length, 1, "and the field still reached the model");
      });
    },
  },

  {
    name: NAME.emptyList,
    run: async () => {
      // AN EMPTY LIST DECLARES NOTHING AT ALL, so it can never stand in for a declared gap — it is a
      // slip, not a claim a human made, and that is the hole "no declared loop is aspirational" closes.
      await overRegistry({
        "a.md": loopWith({ actuator: "[]" }),
        "b.md": loopWith({ actuator: `[prose:${PROSE_DOC}]` }),
      }, (model, fixture) => {
        const empty = expectCodes(model, fixture.pathOf("a.md"), ["loop-empty-list"], { why: "an empty list is an error" });
        assert.equal(empty[0].severity, "error");
        assert.ok(empty[0].message.includes("actuator"), "naming actuator");
        assert.equal("actuator" in nodeFor(model, fixture.pathOf("a.md")).fields, false, "no honesty-lane kind is claimed for it either");
        const prose = expectCodes(model, fixture.pathOf("b.md"), ["loop-field-prose-only"], { why: "a declared paragraph IS a claim" });
        assert.equal(prose[0].severity, "warn");
        assert.equal(prose.some((finding) => finding.severity === "error"), false, "and no error for that field");
        // The two are different facts about the same key, and neither is the other's code.
        assert.notEqual(empty[0].code, prose[0].code);
      });
    },
  },
  {
    name: NAME.pointerSplit,
    run: async () => {
      await overRegistry({
        "three.md": loopWith({ reference: "[module:src/run-store.mjs#isRetryable, command:work:next, config:work.autonomous.maxAttempts]" }),
        "retry.md": loopWith({ actuator: "[command:work:run-retry]" }),
        "bad.md": loopWith({ reference: "[command:]" }),
      }, (model, fixture) => {
        const entries = nodeFor(model, fixture.pathOf("three.md")).fields.reference;
        assert.deepEqual(entries.map((entry) => entry.pointer), [
          { scheme: "module", operand: "src/run-store.mjs", symbol: "isRetryable" },
          { scheme: "command", operand: "work:next" },
          { scheme: "config", operand: "work.autonomous.maxAttempts" },
        ], "scheme, operand and an optional symbol");
        for (const entry of entries) carriesNoResolution(entry, `reference entry ${entry.raw}`);
        assert.equal(Object.hasOwn(entries[1].pointer, "symbol"), false, "a command pointer carries no symbol");
        assert.equal(Object.hasOwn(entries[2].pointer, "symbol"), false, "nor does a config pointer");
        // THE OPERAND IS EVERYTHING AFTER THE FIRST COLON — not truncated at the second.
        const retry = nodeFor(model, fixture.pathOf("retry.md")).fields.actuator[0];
        assert.equal(retry.pointer.operand, "work:run-retry", "colon and all");
        assert.equal(retry.pointer.operand.split(":").length, 2, "the second colon is inside the operand, not a delimiter");
        assert.notEqual(retry.pointer.operand, "work");
        expectCodes(model, fixture.pathOf("three.md"), [], { control: fixture.pathOf("bad.md"), why: "three well-formed pointers report nothing" });
        expectCodes(model, fixture.pathOf("retry.md"), [], { control: fixture.pathOf("bad.md"), why: "and neither does the two-colon command" });
      });
    },
  },

  {
    name: NAME.pointerGrammar,
    run: async () => {
      await overRegistry({
        "no-symbol.md": loopWith({ reference: "[module:src/run-store.mjs]" }),
        "absolute.md": loopWith({ reference: "[module:/src/run-store.mjs#isRetryable]" }),
        "os-sep.md": loopWith({ reference: "[module:src\\run-store.mjs#isRetryable]" }),
        "doc-scheme.md": loopWith({ reference: `[doc:${PROSE_DOC}]` }),
        "endpoint-scheme.md": loopWith({ reference: "[item:52/00]" }),
        "item-endpoint.md": loopWith({ monitoring: "[item:52/00]" }),
      }, (model, fixture) => {
        const rejected = new Map();
        for (const name of ["no-symbol.md", "absolute.md", "os-sep.md", "doc-scheme.md", "endpoint-scheme.md"]) {
          const findings = expectCodes(model, fixture.pathOf(name), ["loop-bad-value"], { why: `rejected by the pointer grammar (${name})` });
          rejected.set(name, findings);
          assert.equal(findings[0].severity, "error");
          assert.ok(findings[0].message.includes("reference"), "naming reference");
          assert.equal("reference" in nodeFor(model, fixture.pathOf(name)).fields, false, `${name}: nothing is admitted in its place`);
        }
        // THE PATH IS NOT SILENTLY NORMALISED TO FORWARD SLASHES: the rejected value appears nowhere
        // on the node in either spelling, and the finding quotes it exactly as authored.
        const osSep = nodeFor(model, fixture.pathOf("os-sep.md"));
        assert.equal(JSON.stringify(osSep).includes("src/run-store.mjs#isRetryable"), false, "no forward-slashed rewrite reached the model");
        assert.equal(JSON.stringify(osSep).includes("run-store.mjs#isRetryable"), false, "and neither did the authored form");
        assert.ok(rejected.get("os-sep.md")[0].message.includes("src\\run-store.mjs#isRetryable"), "the finding quotes the value as authored");
        // AN UNKNOWN SCHEME IS NOT ADMITTED AS A PROSE SENTINEL BY ANOTHER NAME.
        assert.equal(everyField(model).some(({ field }) => field.raw.startsWith("doc:")), false, `"doc:" reaches no field, under any kind`);
        // ...AND "item" REMAINS AN ENDPOINT SCHEME ONLY: the same value that is a bad value in a
        // field parses on an edge key, in the same load.
        const endpoint = nodeFor(model, fixture.pathOf("item-endpoint.md")).edges.monitoring[0];
        assert.equal(endpoint.scheme, "item");
        assert.equal(endpoint.operand, "52/00");
        resolvedIs(endpoint, null, "an item endpoint is extra-registry");
        expectCodes(model, fixture.pathOf("item-endpoint.md"), [], { control: fixture.pathOf("endpoint-scheme.md"), why: "item: on an edge key is fine; in a field it is not" });
      });
    },
  },

  {
    name: NAME.endpointSchemes,
    run: async () => {
      // THE FULL CROSS of every endpoint scheme on every edge key, so the parse is decided by the
      // value and never by which key carried it. The scenario's Given lists one scheme per key; this
      // drives every pair, which strictly contains it. The key count is read from the loader's own
      // vocabulary and asserted against a literal, so 59/ADR-001 §3's sixth key (`reporting`) is
      // driven here the moment it exists rather than being a hole the cross silently skips.
      const SCHEMES = [
        { raw: "loop:autonomous-cascade", scheme: "loop", operand: "autonomous-cascade", resolved: true },
        { raw: "actor:operator", scheme: "actor", operand: "operator", resolved: true },
        { raw: "item:52/00", scheme: "item", operand: "52/00", resolved: null },
        { raw: "command:work:doctor", scheme: "command", operand: "work:doctor", resolved: null },
        { raw: "config:work.autonomous.maxAttempts", scheme: "config", operand: "work.autonomous.maxAttempts", resolved: null },
        { raw: "module:src/run-store.mjs#shouldRetry", scheme: "module", operand: "src/run-store.mjs", symbol: "shouldRetry", resolved: null },
      ];
      const keys = [...EDGE_KEYS];
      assert.equal(keys.length, 6, "six edge keys, from the loader's own vocabulary");
      const files = {
        "autonomous-cascade.md": loopRecord(),
        "operator.md": actorRecord(),
        "both.md": loopWith({ reference: "[module:src/run-store.mjs#shouldRetry]", "target-setting": "[module:src/run-store.mjs#shouldRetry]" }),
        "bad-endpoint.md": loopWith({ monitoring: "[node:autonomous-cascade]" }),
      };
      for (const key of keys) files[`edge-${key}.md`] = loopWith({ [key]: `[${SCHEMES.map((entry) => entry.raw).join(", ")}]` });
      await overRegistry(files, (model, fixture) => {
        for (const key of keys) {
          const node = nodeFor(model, fixture.pathOf(`edge-${key}.md`));
          const endpoints = node.edges[key];
          assert.equal(endpoints.length, 6, `${key}: all six schemes parse`);
          for (const [index, expected] of SCHEMES.entries()) {
            const endpoint = endpoints[index];
            const where = `${key}[${index}] ${expected.raw}`;
            assert.equal(endpoint.raw, expected.raw, `${where}: raw is the string exactly as authored`);
            assert.equal(endpoint.scheme, expected.scheme, where);
            assert.equal(endpoint.operand, expected.operand, where);
            resolvedIs(endpoint, expected.resolved, where);
            // AN ENDPOINT WITH NO "#" CARRIES NO SYMBOL AT ALL — absent, never present-and-empty,
            // never null. Only the module endpoint has one.
            assert.equal(Object.hasOwn(endpoint, "symbol"), Boolean(expected.symbol), `${where}: symbol presence`);
            if (expected.symbol) assert.equal(endpoint.symbol, expected.symbol, where);
            assert.equal(endpoint.operand.includes("#"), false, `${where}: the operand carries no "#"`);
          }
          expectCodes(model, fixture.pathOf(`edge-${key}.md`), [], { control: fixture.pathOf("bad-endpoint.md"), why: `${key}: six well-formed endpoints report nothing` });
        }
        // A MODULE ENDPOINT SPLITS ITS SYMBOL BY EXACTLY THE RULE A MODULE POINTER USES.
        const both = nodeFor(model, fixture.pathOf("both.md"));
        const endpoint = both.edges["target-setting"][0];
        const pointer = both.fields.reference[0].pointer;
        assert.deepEqual({ scheme: endpoint.scheme, operand: endpoint.operand, symbol: endpoint.symbol }, pointer, "one splitting rule, two lanes");
        assert.equal(endpoint.raw, "module:src/run-store.mjs#shouldRetry", "character for character");
        assert.equal(endpoint.operand.includes("#"), false);
        assert.equal(pointer.operand.includes("#"), false);
      });
    },
  },

  {
    name: NAME.hashOutsideModule,
    run: async () => {
      // Carrying "#run" silently into a command operand would make a later resolution pass fail
      // while naming the wrong defect — "no such command" for what is a malformed pointer.
      await overRegistry({
        "hash.md": loopWith({
          actuator: "[command:work:doctor#run]",
          ceiling: "[config:work.autonomous.maxAttempts#max]",
          monitoring: "[item:52/00#anchor]",
          "data-feed": "[loop:autonomous-cascade#x]",
        }),
        "autonomous-cascade.md": loopRecord(),
        "ghost-caller.md": loopWith({ "data-feed": "[loop:nowhere]" }),
      }, (model, fixture) => {
        const findings = expectCodes(model, fixture.pathOf("hash.md"), ["loop-bad-value", "loop-bad-value", "loop-bad-value", "loop-bad-value"], { why: "each of the four is rejected" });
        for (const finding of findings) assert.equal(finding.severity, "error");
        assert.deepEqual(findings.map((finding) => finding.message), [
          "Invalid value for actuator: command:work:doctor#run",
          "Invalid value for ceiling: config:work.autonomous.maxAttempts#max",
          "Invalid value for data-feed: loop:autonomous-cascade#x",
          "Invalid value for monitoring: item:52/00#anchor",
        ], "one per offending value, each naming its own key");
        const node = nodeFor(model, fixture.pathOf("hash.md"));
        for (const key of ["actuator", "ceiling"]) assert.equal(key in node.fields, false, `${key} claims no kind and no symbol`);
        for (const key of ["monitoring", "data-feed"]) assert.equal(key in node.edges, false, `${key} carries no endpoint`);
        // NO OPERAND ANYWHERE CARRIES A "#", swept over every pointer and every endpoint in the load.
        const operands = [
          ...everyField(model).filter(({ field }) => field.kind === "pointer").map(({ field }) => field.pointer.operand),
          ...everyEndpoint(model).map(({ endpoint }) => endpoint.operand),
        ];
        assert.ok(operands.length >= 8, "the sweep is over a populated model");
        for (const operand of operands) assert.equal(operand.includes("#"), false, operand);
        // A VALUE REJECTED ON GRAMMAR IS NEVER TAKEN UP AS AN ENDPOINT TO RESOLVE: the rejected
        // "loop:autonomous-cascade#x" raises no dangling finding, while a real undeclared endpoint
        // in the same load does.
        expectNoCode(model, DANGLING, { at: fixture.pathOf("hash.md"), control: fixture.pathOf("ghost-caller.md"), why: "a rejected value was never an endpoint" });
        assert.equal(JSON.stringify(model.nodes).includes("#x"), false, "and it reaches no node at all");
      });
    },
  },

  {
    name: NAME.proseAnchor,
    run: async () => {
      // "prose:" is a sentinel PREFIX carrying a path, not a pointer scheme, so the module-only "#"
      // split never reaches it — and the anchor is the point: a prose citation says WHICH paragraph.
      await overRegistry({
        "anchored.md": loopWith({ measurement: `[prose:${PROSE_DOC}#retry-loop]` }),
        "plain.md": loopWith({ measurement: `[prose:${PROSE_DOC}]` }),
        "ceiling.md": loopWith({ ceiling: `[prose:${PROSE_DOC}#retry-loop]` }),
      }, (model, fixture) => {
        const entry = nodeFor(model, fixture.pathOf("anchored.md")).fields.measurement[0];
        assert.equal(entry.kind, "prose", "never pointer");
        assert.equal(entry.path, `${PROSE_DOC}#retry-loop`, "the anchor is part of the payload, never split off as a symbol");
        assert.equal(Object.hasOwn(entry, "symbol"), false, "a sentinel carries no symbol");
        assert.equal(Object.hasOwn(entry, "scheme"), false, "and no scheme");
        assert.equal(Object.hasOwn(entry, "pointer"), false, "the module-only # rule is a rule about pointers");
        assert.deepEqual(Object.keys(entry).sort(), ["key", "kind", "path", "raw"]);
        // ...AND IT WARNS EXACTLY AS THE SAME CITATION WITH NO ANCHOR DOES.
        const anchored = expectCodes(model, fixture.pathOf("anchored.md"), ["loop-field-prose-only"], { why: "no loop-bad-value for measurement" });
        const plain = expectCodes(model, fixture.pathOf("plain.md"), ["loop-field-prose-only"], { why: "the same citation with no anchor" });
        assert.equal(anchored[0].severity, plain[0].severity);
        assert.equal(anchored[0].severity, "warn");
        assert.equal(anchored[0].message.replace("#retry-loop", ""), plain[0].message, "the same message but for the anchor it retains");
        // THE ANCHOR CHANGES WHICH KEYS ADMIT A PROSE CITATION NOT AT ALL.
        const ceiling = expectCodes(model, fixture.pathOf("ceiling.md"), ["loop-bad-value"], { why: "ceiling admits a pointer, never a prose citation" });
        assert.equal(ceiling[0].severity, "error");
        assert.ok(ceiling[0].message.includes("ceiling"));
      });
    },
  },
  {
    name: NAME.intraRegistry,
    run: async () => {
      // Reference integrity belongs to the LOAD: it is the only thing that sees the whole directory,
      // and `resolved` is part of what it hands on. The only call this case makes is `loadLoops`.
      await overRegistry({
        "run-resilience.md": loopWith({ "data-feed": "[loop:autonomous-cascade, loop:sensor]", veto: "[actor:operator]" }),
        "autonomous-cascade.md": loopRecord(),
        "operator.md": actorRecord(),
        "sensor.md": identityRecord({ id: "loop:sensor", kind: "sensor" }),
        "ghost-caller.md": loopWith({ "data-feed": "[loop:ghost, actor:ghost]" }),
        "by-filename.md": loopWith({ "data-feed": "[loop:operator]" }),
      }, (model, fixture) => {
        const edges = (name) => nodeFor(model, fixture.pathOf(name)).edges;
        const declared = edges("run-resilience.md");
        resolvedIs(declared["data-feed"][0], true, "a declared loop");
        resolvedIs(declared["data-feed"][1], true, "an endpoint naming a node whose kind is unreadable — it IS declared");
        resolvedIs(declared.veto[0], true, "a declared actor");
        // "run-resilience.md carries no finding at all caused by sensor.md's unreadable kind" —
        // one authoring slip must not raise errors against every record that names the node.
        expectCodes(model, fixture.pathOf("run-resilience.md"), [], { control: fixture.pathOf("ghost-caller.md"), why: "no sibling pays for sensor.md's kind" });
        expectCodes(model, fixture.pathOf("sensor.md"), ["loop-bad-value"], { why: "the unreadable kind is reported once, on its own record" });
        // AN UNDECLARED INTRA-REGISTRY ENDPOINT IS DANGLING, and the finding is anchored at the
        // DECLARING record's file — never at the endpoint's, never at the directory.
        const ghosts = edges("ghost-caller.md")["data-feed"];
        resolvedIs(ghosts[0], false, "loop:ghost");
        resolvedIs(ghosts[1], false, "actor:ghost");
        const dangling = expectCodes(model, fixture.pathOf("ghost-caller.md"), [DANGLING, DANGLING], { why: "one per undeclared endpoint" });
        for (const finding of dangling) {
          assert.equal(finding.severity, "error");
          assert.equal(finding.path, fixture.pathOf("ghost-caller.md"), "anchored at the file that declared the edge");
        }
        assert.deepEqual(dangling.map((finding) => finding.message), [
          "Endpoint does not name a declared node: loop:ghost",
          "Endpoint does not name a declared node: actor:ghost",
        ]);
        // Resolution is BY DECLARED ID, NOT BY FILENAME: "operator.md" exists and declares
        // "actor:operator", so "loop:operator" is dangling all the same.
        resolvedIs(edges("by-filename.md")["data-feed"][0], false, "loop:operator names no declared id");
        expectCodes(model, fixture.pathOf("by-filename.md"), [DANGLING], { why: "a filename is not an id" });
        assert.equal(model.nodes.some((node) => node.path === fixture.pathOf("operator.md")), true, "...though the file really is there");
        // EVERY ENDPOINT ARRIVES ALREADY MARKED — nothing downstream re-derives it from the node
        // list, and no structural check has been invoked for any of it.
        const swept = everyEndpoint(model);
        assert.equal(swept.length, 6, "every endpoint in the load");
        for (const { node, key, endpoint } of swept) resolvedIsOneOfTheThree(endpoint, `${node.id}.${key}`);
      });
    },
  },

  {
    name: NAME.resolutionOrder,
    run: async () => {
      // Three worlds, one answer: the declaring record read LAST, read FIRST, and written in the
      // reverse creation order. `ghost-caller.md` is the control in every one of them.
      const readLast = {
        "a-loop.md": loopWith({ "data-feed": "[loop:zeta]" }),
        "zeta.md": loopRecord(),
        "ghost-caller.md": loopWith({ "data-feed": "[loop:nowhere]" }),
      };
      const readFirst = {
        "a-zeta.md": loopRecord(),
        "z-loop.md": loopWith({ "data-feed": "[loop:a-zeta]" }),
        "ghost-caller.md": loopWith({ "data-feed": "[loop:nowhere]" }),
      };
      const decide = (citing) => (model, fixture) => {
        resolvedIs(nodeFor(model, fixture.pathOf(citing)).edges["data-feed"][0], true, `${citing} resolves whichever file was read first`);
        expectCodes(model, fixture.pathOf(citing), [], { control: fixture.pathOf("ghost-caller.md"), why: `${citing} reports no dangling endpoint` });
        expectNoCode(model, DANGLING, { at: fixture.pathOf(citing), control: fixture.pathOf("ghost-caller.md") });
      };
      await overRegistry(readLast, decide("a-loop.md"));
      await overRegistry(reversedFiles(readLast), decide("a-loop.md"));
      await overRegistry(readFirst, decide("z-loop.md"));
    },
  },

  {
    name: NAME.extraRegistryNull,
    run: async () => {
      // 52 validates syntax; 55 owns resolution, staleness and the provenance that makes a "no
      // longer resolves" verdict defensible. Until then `resolved` is null — a THIRD value, not a
      // falsy stand-in for "no", which is why every assertion here is by identity.
      await overRegistry({
        "extra.md": loopWith({ monitoring: "[item:52/00, command:work:doctor, config:work.max, module:src/x.mjs#isStale]" }),
        "ghost-caller.md": loopWith({ monitoring: "[loop:nowhere]" }),
      }, (model, fixture) => {
        const endpoints = nodeFor(model, fixture.pathOf("extra.md")).edges.monitoring;
        assert.equal(endpoints.length, 4);
        for (const endpoint of endpoints) resolvedIs(endpoint, null, `${endpoint.raw} is extra-registry`);
        assert.deepEqual(endpoints.map((endpoint) => endpoint.scheme), ["item", "command", "config", "module"]);
        expectCodes(model, fixture.pathOf("extra.md"), [], { control: fixture.pathOf("ghost-caller.md"), why: "an unresolved endpoint is not a dangling one" });
        expectNoCode(model, DANGLING, { at: fixture.pathOf("extra.md"), control: fixture.pathOf("ghost-caller.md") });
        // ...and the control's own endpoint is where false lives, so null is doing real work here.
        resolvedIs(nodeFor(model, fixture.pathOf("ghost-caller.md")).edges.monitoring[0], false, "an undeclared intra-registry endpoint");
      });
    },
  },

  {
    name: NAME.dedupAsymmetry,
    run: async () => {
      // AN EDGE IS A RELATION — declaring it twice asserts one fact twice, so dedup is lossless. A
      // FIELD LIST IS AN ENUMERATION OF DISTINCT AUTHORITIES, where multiplicity and order are the
      // author's own statement, so deduping one would rewrite a hand-authored record.
      await overRegistry({
        "a.md": loopWith({ actuator: "[command:a, command:a]", monitoring: "[loop:a, loop:a]" }),
        "watcher.md": loopWith({ monitoring: "[loop:a, loop:a]" }),
        "dupes.md": loopWith({
          reference: "[command:x, command:x]",
          measurement: "[module:src/a.mjs#b, module:src/a.mjs#b]",
          ceiling: "[config:work.loop.reviewRounds, config:work.loop.reviewRounds]",
        }),
        "empty.md": loopWith({ monitoring: "[]" }),
      }, (model, fixture) => {
        const a = nodeFor(model, fixture.pathOf("a.md"));
        assert.equal(a.fields.actuator.length, 2, "the field keeps two entries");
        assert.deepEqual(a.fields.actuator.map((entry) => entry.raw), ["command:a", "command:a"], "in the authored order, read back exactly as authored");
        for (const entry of a.fields.actuator) assert.equal(entry.kind, "pointer", "each classified on its own");
        assert.equal(a.edges.monitoring.length, 1, "the edge collapses to one");
        resolvedIs(a.edges.monitoring[0], true, "a SELF-edge, resolving to the declaring node itself");
        assert.equal(a.edges.monitoring[0].raw, a.id);
        expectCodes(model, fixture.pathOf("a.md"), [], { control: fixture.pathOf("empty.md"), why: "no finding for either repetition — not a bad value, not an empty list, and no code of its own" });
        // A SELF-EDGE IS THE STRUCTURAL CHECKS' TO REPORT, and there is exactly ONE for them to see.
        assert.equal(JSON.stringify(a.edges).split("loop:a").length - 1, 1, "no second entry any consumer could count twice");
        // The same rule with a third party at the other end, and on the three other field lists.
        const watcher = nodeFor(model, fixture.pathOf("watcher.md"));
        assert.equal(watcher.edges.monitoring.length, 1, "one endpoint");
        resolvedIs(watcher.edges.monitoring[0], true, "the repeated endpoint still resolves");
        expectCodes(model, fixture.pathOf("watcher.md"), [], { control: fixture.pathOf("empty.md"), why: "deduplicated in silence" });
        const dupes = nodeFor(model, fixture.pathOf("dupes.md")).fields;
        for (const key of ["reference", "measurement", "ceiling"]) assert.equal(dupes[key].length, 2, `${key} keeps both authorities`);
        expectCodes(model, fixture.pathOf("dupes.md"), [], { control: fixture.pathOf("empty.md"), why: "the same holds for reference, measurement and ceiling" });
        // NOTHING APPLIES THE EDGE LANE'S DEDUP TO A FIELD, OR A FIELD'S MULTIPLICITY TO AN EDGE —
        // decided on ONE record that shows both sides at once.
        assert.equal(a.fields.actuator.length, 2);
        assert.equal(a.edges.monitoring.length, 1);
      });
    },
  },

  {
    name: NAME.emptyEdgeKey,
    run: async () => {
      // An ABSENT edge key is a fact — "no edges of that type". An EMPTY list is a half-written
      // line, and the two must never look the same to a reader.
      await overRegistry({
        "a.md": loopWith({ monitoring: "[]" }),
        "b.md": loopRecord(),
        "all-five.md": loopWith({ "data-feed": "[]", "target-setting": "[]", monitoring: "[]", veto: "[]", "parameter-tuning": "[]" }),
      }, (model, fixture) => {
        const empty = expectCodes(model, fixture.pathOf("a.md"), ["loop-empty-list"], { why: "an empty edge list is an error" });
        assert.equal(empty[0].severity, "error");
        assert.ok(empty[0].message.includes("monitoring"), "naming monitoring");
        assert.equal("monitoring" in nodeFor(model, fixture.pathOf("a.md")).edges, false, "no entry a consumer could read as declared-and-empty");
        expectCodes(model, fixture.pathOf("b.md"), [], { control: fixture.pathOf("a.md"), why: "an absent edge key is not an error" });
        assert.deepEqual(Object.keys(nodeFor(model, fixture.pathOf("b.md")).edges), [], "and it carries no monitoring key at all");
        // ...AND THE SAME ERROR ON EVERY ONE OF THE FIVE, each naming its own key.
        const five = expectCodes(model, fixture.pathOf("all-five.md"), Array(5).fill("loop-empty-list"), { why: "one per authored empty edge key" });
        assert.deepEqual(five.map((finding) => finding.message), [
          "data-feed must not be empty", "target-setting must not be empty", "monitoring must not be empty",
          "veto must not be empty", "parameter-tuning must not be empty",
        ]);
        for (const finding of five) assert.equal(finding.severity, "error");
        assert.deepEqual(Object.keys(nodeFor(model, fixture.pathOf("all-five.md")).edges), [], "the node loads carrying no edges at all");
      });
    },
  },
  {
    name: NAME.differential,
    run: async () => {
      // THE ONLY SHAPE OF ASSERTION THAT CAN PROVE A NEGATIVE ABOUT WHAT WAS RESOLVED. Counting
      // cannot: "no finding" is also what a resolver that happened to succeed would produce. So the
      // SAME records are loaded against two different worlds and the two loads are compared BYTE
      // for byte. `measurement` carries the control — a value rejected on GRAMMAR, which reports in
      // both worlds and proves the load really did read these values.
      await withLoopRegistry({
        "citations.md": loopWith({
          reference: "[module:src/does-not-exist.mjs#nope, module:src/work.mjs#notExportedAnywhere]",
          actuator: "[command:work:no-such-verb]",
          ceiling: "[config:no.such.key]",
          monitoring: "[item:99/99]",
          measurement: "[module:src/run-store.mjs]",
        }),
      }, async (fixture) => {
        const homeBefore = path.join(fixture.temp, "home-before");
        const homeAfter = path.join(fixture.temp, "home-after");
        await mkdir(homeBefore, { recursive: true });
        await mkdir(homeAfter, { recursive: true });
        // The second world's global home DEFINES the config key the record cites. A loader that
        // read config would answer differently under it.
        await writeFile(path.join(homeAfter, "aof.config.json"), JSON.stringify({ no: { such: { key: "created" } } }), "utf8");

        const before = loadLoopsInFreshProcess(fixture.workDir, { env: { AOF_GLOBAL_HOME: homeBefore } });
        const model = await loadLoops(fixture.workDir);

        // Each of the five parses into its scheme and operand. Milestone 69 adds one
        // semantic exception to the no-resolution rule: a ceiling config pointer must
        // name a registered resolver, but it still never consults ambient config.
        const node = nodeFor(model, fixture.pathOf("citations.md"));
        assert.deepEqual(node.fields.reference.map((entry) => entry.pointer), [
          { scheme: "module", operand: "src/does-not-exist.mjs", symbol: "nope" },
          { scheme: "module", operand: "src/work.mjs", symbol: "notExportedAnywhere" },
        ], "a file that does not exist and a symbol that is not exported both parse");
        assert.deepEqual(node.fields.actuator[0].pointer, { scheme: "command", operand: "work:no-such-verb" });
        assert.deepEqual(node.fields.ceiling[0].pointer, { scheme: "config", operand: "no.such.key" });
        resolvedIs(node.edges.monitoring[0], null, "item:99/99 names no existing work item");
        const findings = expectCodes(model, fixture.pathOf("citations.md"), ["loop-bad-value", "loop-ceiling-pointer-unresolved"], { why: "the grammar control and the unresolved ceiling authority both report" });
        assert.equal(findings[0].message, "Invalid value for measurement: module:src/run-store.mjs");
        assert.equal(findings[1].message, "Ceiling pointer has no resolver: config:no.such.key");

        // NOW CREATE THE CITED REFERENTS — at every root the load could conceivably resolve them
        // against: the temp root, the work directory, and the loops directory itself. (`command:` is
        // the one referent with nothing to create: the command registry is compiled into `src/`, so
        // that leg rests on the byte identity below and on the table row that drives it.)
        for (const root of [fixture.temp, fixture.workDir, fixture.loopsDir]) {
          await mkdir(path.join(root, "src"), { recursive: true });
          await writeFile(path.join(root, "src", "does-not-exist.mjs"), "export const nope = 1;\n", "utf8");
          await writeFile(path.join(root, "src", "work.mjs"), "export const notExportedAnywhere = 1;\n", "utf8");
          await mkdir(path.join(root, "99_milestone_ghost", "stories", "99_story_ghost"), { recursive: true });
          await writeFile(path.join(root, "99_milestone_ghost", "SPEC.md"), "---\ntype: milestone\nnumber: 99\n---\n", "utf8");
          await writeFile(path.join(root, "99_milestone_ghost", "stories", "99_story_ghost", "STORY.md"), "---\ntype: story\nnumber: 99\nparent: 99\n---\n", "utf8");
          await mkdir(path.join(root, ".aof"), { recursive: true });
          await writeFile(path.join(root, ".aof", "aof.config.json"), JSON.stringify({ no: { such: { key: "created" } } }), "utf8");
        }

        const after = loadLoopsInFreshProcess(fixture.workDir, { env: { AOF_GLOBAL_HOME: homeAfter } });
        // THE PROOF. Same records, two worlds, byte-identical output: nothing outside the loops
        // directory was consulted, because nothing outside it could have changed the answer.
        assert.equal(after.stdout, before.stdout, "the two loads are byte-identical");
        assert.deepEqual(after.value, before.value);
        assert.equal(after.stdout.includes("loop-bad-value"), true, "and the grammar verdict is unchanged in both");
        assert.equal(after.stdout.includes("loop-ceiling-pointer-unresolved"), true, "the authority verdict is structural, not ambient-config-dependent");

        // ...AND THE COMPARISON IS SENSITIVE, so the identity above is not the trivial kind: one
        // new record INSIDE `loops/` moves the same bytes.
        await fixture.write({ "newcomer.md": loopRecord() });
        const moved = loadLoopsInFreshProcess(fixture.workDir, { env: { AOF_GLOBAL_HOME: homeAfter } });
        assert.notEqual(moved.stdout, before.stdout, "a change inside the loops directory DOES change the load");
        assert.equal(moved.value.nodes.length, before.value.nodes.length + 1);
      });
    },
  },

  {
    name: NAME.tableGrammar,
    run: async () => {
      const files = {};
      for (const row of FIELD_VALUE_ROWS) {
        files[row.file] = row.spec;
        if (row.bracketed) files[row.bracketedFile] = row.bracketed.spec;
      }
      await overRegistry(files, (model, fixture) => {
        const control = fixture.pathOf(FIELD_VALUE_CONTROL.file);
        for (const row of FIELD_VALUE_ROWS) {
          const why = `${row.field} | ${row.authored}`;
          const at = fixture.pathOf(row.file);
          const findings = expectCodes(model, at, row.codes, { control, why });
          for (const finding of findings) assert.equal(finding.severity, row.severity, why);
          row.check(nodeFor(model, at), findings);
          if (!row.bracketed) continue;
          // The conflicting row, driven a second way — see the note above FIELD_VALUE_ROWS.
          const leg = row.bracketed;
          const legWhy = `${row.field} | ${leg.authored} (the bracketed reading)`;
          const legFindings = expectCodes(model, fixture.pathOf(row.bracketedFile), leg.codes, { control, why: legWhy });
          for (const finding of legFindings) assert.equal(finding.severity, leg.severity, legWhy);
          leg.check(nodeFor(model, fixture.pathOf(row.bracketedFile)));
        }
        // NON-VACUITY: every code the table names was really emitted by the fixture that names it,
        // and both severities are present — so no row's expectation is met by an empty load.
        const named = [...new Set(FIELD_VALUE_ROWS.flatMap((row) => row.codes))].sort();
        assert.deepEqual(codesEmitted(model), named, "the codes the table names are exactly the codes the load emitted");
        assert.deepEqual([...new Set(FIELD_VALUE_ROWS.map((row) => row.severity))].sort(), ["error", "warn", "—"]);
      });
    },
  },

  {
    name: NAME.tablePointer,
    run: async () => {
      const files = { ...POINTER_SUPPORT };
      for (const row of POINTER_ROWS) files[row.file] = row.spec;
      await overRegistry(files, (model, fixture) => {
        const control = fixture.pathOf(POINTER_CONTROL.file);
        for (const row of POINTER_ROWS) {
          const why = `${row.position} | ${row.authored}${row.note ? ` (${row.note})` : ""}`;
          const at = fixture.pathOf(row.file);
          const node = nodeFor(model, at);
          const findings = expectCodes(model, at, row.codes, { control, why });
          for (const finding of findings) assert.equal(finding.severity, "error", why);
          if (row.position === "field entry") {
            if (row.parses === null) {
              assert.equal("reference" in node.fields, false, `${why}: rejected, so no kind is claimed`);
            } else {
              const entry = node.fields.reference[0];
              assert.equal(entry.raw, row.authored, `${why}: raw as authored`);
              assert.equal(entry.kind, "pointer", why);
              assert.deepEqual(entry.pointer, row.parses, why);
              carriesNoResolution(entry, why);
            }
          } else if (row.position === "edge endpoint") {
            if (row.parses === null) {
              assert.equal("monitoring" in node.edges, false, `${why}: rejected, so no endpoint is taken up`);
            } else {
              const endpoint = node.edges.monitoring[0];
              assert.equal(endpoint.raw, row.authored, `${why}: raw as authored`);
              assert.equal(endpoint.scheme, row.parses.scheme, why);
              assert.equal(endpoint.operand, row.parses.operand, why);
              assert.equal(Object.hasOwn(endpoint, "symbol"), Boolean(row.parses.symbol), `${why}: symbol presence`);
              if (row.parses.symbol) assert.equal(endpoint.symbol, row.parses.symbol, why);
              resolvedIs(endpoint, row.resolved, why);
            }
          } else {
            if (row.resolved !== NO_RESOLUTION) resolvedIs(node.edges.monitoring[0], row.resolved, why);
            row.check(node);
          }
        }
        // The support records are accounted for too: two clean, and the unreadable kind reported
        // exactly once — on its own file, never on the records whose endpoints name it.
        expectCodes(model, fixture.pathOf("sensor.md"), ["loop-bad-value"], { why: "sensor.md's own kind slip" });
        for (const name of ["autonomous-cascade.md", "operator.md"]) {
          expectCodes(model, fixture.pathOf(name), [], { control, why: `${name} is a clean declaring record` });
        }
        assert.deepEqual(codesEmitted(model), ["loop-bad-value", "loop-empty-list", DANGLING].sort(), "the codes the table names are exactly the codes the load emitted");
      });
    },
  },
  {
    name: NAME.controlled,
    run: async () => {
      // (1) THE SUBJECT. Every case above drives this binding, and it is the module's own export —
      // not a re-implementation, and never a module-private value parser.
      assert.equal(loadLoops, loaderModule.loadLoops);
      const source = await readFile(fileURLToPath(import.meta.url), "utf8");
      // 119/03 — the specifier is REPO-RELATIVE-resolved, not matched at a pinned depth. The
      // regex was `../src/`, true only while this suite sat flat in `test/`; the suite now sits
      // in `test/loop/` and the pinned spelling matched nothing, which reported "no subject
      // module" as an empty set rather than as a red. What the leg means is the MODULE, so it
      // is the module that is named.
      const suiteDir = path.dirname(fileURLToPath(import.meta.url));
      const srcImports = [...source.matchAll(/from "((?:\.\.\/)+src\/[^"]+)"/g)]
        .map((match) => path.relative(path.resolve(suiteDir, "..", ".."), path.resolve(suiteDir, match[1])).split(path.sep).join("/"));
      assert.deepEqual([...new Set(srcImports)], ["src/work/loops.mjs"], "one subject module, imported by its public path");
      const named = source.match(/import \{([^}]*)\} from "(?:\.\.\/)+src\/work\/loops\.mjs";/);
      assert.ok(named, "the named import list is readable");
      for (const binding of named[1].split(",").map((entry) => entry.trim()).filter(Boolean)) {
        assert.ok(Object.hasOwn(loaderModule, binding), `${binding} is an exported name, never a module-private one`);
      }
      // ...and no structural check was ever invoked: the checks live in another module, which this
      // suite does not import at all.
      const specifiers = [
        ...[...source.matchAll(/from "([^"]+)"/g)].map((match) => match[1]),
        ...[...source.matchAll(/import\("([^"]+)"\)/g)].map((match) => match[1]),
      ];
      assert.equal(specifiers.some((specifier) => specifier.includes("work-loops-checks")), false, "a consumer that loads and never checks is what every case above is");

      // (2) THE DOOR IS THE ONLY DOOR. Every finding assertion and every three-valued read in this
      // file happens inside one marked block, so the two suite-wide rules cannot be defeated by how
      // a case spells its call. The needles are assembled at run time so this scan cannot match its
      // own source.
      // The cut comes from the ONE HOME (`test/support/source-slice.mjs`) rather than a pair of
      // `indexOf` sentinels — the banned SENTINEL_END shape, whose failure here would be silent:
      // a renamed closer makes `indexOf` return −1 and the "door" becomes a few characters of the
      // opener, so the two suite-wide rules below would be asserted over a region that is not the
      // block. `markedRegion` returns null instead, and the guard on the next line is then the
      // only outcome.
      const open = `// <suite${"-door"}>`;
      const close = `// </suite${"-door"}>`;
      const door = markedRegion(source, open, close);
      assert.ok(door && door.length > 1000 && door.includes("expectCodes"), "the door block was located");
      const outside = source.replace(door, "");
      for (const [needle, what] of [
        [`codes${"For("}`, "the code array of a record"],
        [`findings${"For("}`, "the findings of a record"],
        [`.find${"ings"}`, "the load's whole finding list"],
      ]) {
        assert.equal(outside.includes(needle), false, `${what} is reached only inside the door`);
      }
      // The resolution key is matched on a WORD boundary, so the pointer table's own "—" sentinel
      // (`NO_RESOLUTION`, a label and not a property read) is not mistaken for one.
      const resolutionRead = new RegExp(`(?<![A-Za-z0-9_])RESO${"LUTION"}(?![A-Za-z0-9_])`);
      assert.equal(resolutionRead.test(outside), false, "an endpoint's three-valued resolution is reached only inside the door");

      // (3) AND THE DOOR'S GUARDS ARE LIVE, not decoration.
      const oneFinding = { findings: [{ code: "loop-bad-value", severity: "error", path: "/loud", message: "m" }] };
      assert.throws(() => expectCodes(oneFinding, "/quiet", []), /must name the authored value that DOES report one/);
      assert.throws(() => expectCodes(oneFinding, "/quiet", [], { control: "/also-quiet" }), /must really report one/);
      expectCodes(oneFinding, "/quiet", [], { control: "/loud" });
      assert.throws(() => expectNoCode(oneFinding, "loop-bad-value", { at: "/quiet", control: "/also-quiet" }), /the control in the same case does report/);
      // A truthiness reader passes each of these; an identity reader does not.
      assert.throws(() => resolvedIs({ resolved: "yes" }, true), /by identity/);
      assert.throws(() => resolvedIs({ resolved: 0 }, false), /by identity/);
      assert.throws(() => resolvedIs({ resolved: undefined }, null), /by identity/);
      assert.throws(() => resolvedIs({}, null), /already marked/);
      assert.throws(() => resolvedIs({ resolved: true }, "true"), /true, false or null/);
      assert.throws(() => resolvedIsOneOfTheThree({ resolved: "true" }), /one of exactly three/);
      assert.throws(() => carriesNoResolution({ key: "reference", resolved: null }), /carries no resolution/);

      // (4) THE LEDGER IS SELF-CONSISTENT. Task 05's checker owns the cross-FILE half (it re-derives
      // the scenario titles and row counts from the `.feature` files); this is the half only this
      // module can see.
      const names = new Set(workLoopsValueTests.map((entry) => entry.name));
      assert.equal(names.size, workLoopsValueTests.length, "test names are unique");
      for (const entry of workLoopsValueTests) {
        assert.equal(typeof entry.run, "function");
        assert.equal(Object.hasOwn(entry, "fn"), false, "the house runner shape is {name, run}");
      }
      const driven = new Set(coverage.decided.map((entry) => entry.test));
      for (const entry of coverage.decided) {
        assert.ok(names.has(entry.test), `${entry.scenario} -> ${entry.test}`);
        assert.ok(coverage.features.includes(entry.feature), entry.feature);
      }
      // No test is unledgered: every one either decides a scenario or drives a traced Examples
      // table (the two table tests decide ROWS, which `coverage.tables` traces, not titles).
      const tableTests = [NAME.tableGrammar, NAME.tablePointer];
      assert.equal(tableTests.length, coverage.tables.length, "one table test per traced Examples table");
      // MILESTONE 58's CASES ARE LEDGERED AGAINST 58's OWN FEATURES, and the rule survives rather
      // than being waived. `coverage` below is milestone 52's ledger, and
      // `work-loops-coverage-ledger.test.mjs` set-equals its `decided ∪ excluded` against the
      // twenty features 52 covers — so putting a 58 scenario in it would fail that checker for a
      // true statement. `LEDGER_58` is the substitute claim: every 58 case names the feature it
      // mechanises, and the feature is looked up ON DISK rather than trusted.
      for (const entry of LEDGER_58) {
        assert.ok(names.has(entry.test), `${entry.feature} -> ${entry.test}: the module exports that test`);
        await assert.doesNotReject(
          () => readFile(path.join(REPO_ROOT_58, entry.feature), "utf8"),
          `${entry.test}: the feature it mechanises exists on disk`,
        );
      }
      const ledgered58 = new Set(LEDGER_58.map((entry) => entry.test));
      assert.equal(ledgered58.size, LEDGER_58.length, "no 58 case is ledgered twice");
      for (const name of names) {
        if (name === NAME.controlled || tableTests.includes(name) || ledgered58.has(name)) continue;
        assert.ok(driven.has(name), `${name} decides at least one scenario — no test is unledgered`);
      }
      for (const entry of coverage.excluded) {
        assert.ok(coverage.features.includes(entry.feature), entry.feature);
        assert.ok(entry.reason.length > 0 && entry.pointer.length > 0, entry.scenario);
        assert.ok(["structural-duplicate", "not-black-box", "duplicate-claim"].includes(entry.class), entry.class);
      }
      const titles = [...coverage.decided, ...coverage.excluded].map((entry) => `${entry.feature}::${entry.scenario}`);
      assert.equal(new Set(titles).size, titles.length, "no scenario is both decided and excluded, and none is listed twice");
      for (const table of coverage.tables) {
        assert.ok(coverage.features.includes(table.feature), table.feature);
        assert.equal(table.cases.length, table.rows, `${table.feature} table ${table.index}`);
      }
      // The two covered features contribute their whole scenario sets; the third contributes only
      // the ONE migrated scenario (see the ledger note), so it is counted separately.
      const per = (feature) => titles.filter((title) => title.startsWith(`${feature}::`)).length;
      assert.equal(per(GRAMMAR_FEATURE), 25, "02_field-value-grammar has 25 scenarios");
      assert.equal(per(POINTER_FEATURE), 29, "03_pointer-endpoint-syntax has 29 scenarios");
      assert.equal(per(TIMESCALE_FEATURE), 1, "and the migrated claim is the only entry against its originating feature");

      // (5) THE `duplicate-claim` POINTER RESOLVES — looked up in the owning suite's own ledger
      // rather than transcribed, so a renamed scenario there fails here instead of drifting.
      const { coverage: recordCoverage } = await import("./work-loops-record.test.mjs");
      const owned = new Set(recordCoverage.decided.map((entry) => entry.scenario));
      const claims = coverage.excluded.filter((entry) => entry.class === "duplicate-claim");
      assert.ok(claims.length > 0, "there is a duplicate-claim entry to resolve");
      for (const entry of claims) {
        assert.equal(owned.has(entry.pointer), true, `${entry.scenario}: its pointer names a scenario task 00's suite really decides`);
      }

      // (6) THE TWO REGISTRATION TRAPS (`acd-loop-finding-envelope.test.mjs:358` and `:384`).
      const here = fileURLToPath(import.meta.url);
      assert.equal(path.basename(here).startsWith("acd-loop-"), false, "a tenth acd-loop-* file would red an accepted gate's roster");
      assert.equal(path.dirname(here).endsWith(`${path.sep}arch`), false, "and this suite is not under test/arch/");
      assert.equal(Object.keys({ workLoopsValueTests }).every((alias) => !alias.startsWith("acdLoop")), true, "the exported alias does not begin acdLoop");
    },
  },

  // ————— milestone 58 / story 00 · task 01 — `01_what-an-arbiter-must-declare.feature` ———

  {
    name: "loops-value/58 a complete arbiter is read clean, and what it declared is readable off the node",
    run: async () => {
      await overRegistry({
        "trade-off.md": arbiter58("trade-off"),
        "control.md": arbiter58("control", { dwell: "cycles:0" }),
      }, (model, fixture) => {
        const at = fixture.pathOf("trade-off.md");
        expectCodes(model, at, [], { control: fixture.pathOf("control.md"), why: "a complete arbiter is parsed without a finding" });
        const node = nodeFor(model, at);
        assert.deepEqual(node.fields.resolves, { key: "resolves", raw: "which loop wins the shared agent", kind: "phrase" },
          "the conflict it resolves is readable off the node, as the phrase its author wrote");
        assert.equal(node.fields.dwell.cycles, 2, "and the COUNT of cycles its dwell declares is a number a reader gets without re-parsing the raw");
        assert.equal(node.fields.dwell.kind, "cycles");
        assert.equal(node.fields.dwell.raw, "cycles:2", "…beside the text as authored");
      });

      // AN ABSENT DWELL IS A MISSING FIELD, NOT AN ASSUMED NONE. There is no default: an arbiter
      // that has not chosen its anti-oscillation policy has not recorded the trade-off, and a
      // silently-assumed `none` would be the loader authoring policy on its author's behalf.
      await overRegistry({
        "trade-off.md": arbiter58("trade-off", { dwell: null }),
        "control.md": arbiter58("control", { resolves: "unknown" }),
      }, (model, fixture) => {
        const at = fixture.pathOf("trade-off.md");
        const [missing] = expectCodes(model, at, ["loop-missing-field"], { why: "an absent dwell" });
        assert.equal(missing.message, "Required field is missing: dwell", "the missing-field finding names the dwell key");
        assert.equal("dwell" in nodeFor(model, at).fields, false, "and the parsed node carries no dwell value");
        expectNoCode(model, "loop-bad-value", { at, control: fixture.pathOf("control.md"), why: "an absent dwell is not a malformed one" });
      });

      // THE PRIORITY ORDER IS CARRIED THROUGH EXACTLY AS DECLARED — most-important-first is the
      // recorded trade-off, and a loader that sorted it would be re-authoring the policy.
      await overRegistry({
        "trade-off.md": arbiter58("trade-off", { priority: "[loop:verify-triage-accept, loop:review-fix-rereview, loop:build-to-green]" }),
        "control.md": arbiter58("control", { priority: "loop:only-one" }),
      }, (model, fixture) => {
        const at = fixture.pathOf("trade-off.md");
        expectCodes(model, at, [], { control: fixture.pathOf("control.md"), why: "no finding is raised about which loops the order names" });
        assert.deepEqual(
          nodeFor(model, at).fields.priority.map((entry) => entry.raw),
          ["loop:verify-triage-accept", "loop:review-fix-rereview", "loop:build-to-green"],
          "those three loops, in the order they were declared",
        );
        assert.deepEqual(nodeFor(model, at).fields.priority.map((entry) => entry.kind), ["ref", "ref", "ref"]);
      });

      // A PRIORITY DECLARED AS A SINGLE VALUE IS REFUSED AS A NON-LIST, and an EMPTY one as an
      // empty list — two different slips, two existing codes, neither new.
      await overRegistry({
        "scalar.md": arbiter58("scalar", { priority: "loop:build-to-green" }),
        "empty.md": arbiter58("empty", { priority: "[]" }),
      }, (model, fixture) => {
        const [scalar] = expectCodes(model, fixture.pathOf("scalar.md"), ["loop-expected-list"], { why: "a scalar priority" });
        assert.equal(scalar.message, "priority must be an inline list", "the existing expected-list finding names the priority key");
        const [empty] = expectCodes(model, fixture.pathOf("empty.md"), ["loop-empty-list"], { why: "an empty priority" });
        assert.equal(empty.message, "priority must not be empty", "the existing empty-list finding names the priority key");
      });

      // THE SENTINEL FOR AN ABSENT FACT IS REFUSED FOR A DWELL AND STILL ADMITTED WHERE A FACT CAN
      // BE ABSENT. Both halves in ONE load, because the claim is a DISTINCTION: a suite that only
      // showed the refusal would be satisfied by a loader that had dropped `unknown` everywhere.
      await overRegistry({
        "trade-off.md": arbiter58("trade-off", { dwell: "unknown" }),
        "alpha.md": loopWith({ cadence: "unknown" }),
      }, (model, fixture) => {
        const [bad] = expectCodes(model, fixture.pathOf("trade-off.md"), ["loop-bad-value"], { why: "dwell: unknown" });
        assert.equal(bad.message, "Invalid value for dwell: unknown", "a bad-value finding names the dwell key");
        assert.equal(bad.severity, "error");
        const [gap] = expectCodes(model, fixture.pathOf("alpha.md"), ["loop-cadence-unknown"], { why: "cadence: unknown" });
        assert.equal(gap.message, "cadence is declared unknown", "the loop's cadence is admitted, with the existing cadence-unknown finding naming it");
        assert.equal(gap.severity, "warn");
        assert.equal(nodeFor(model, fixture.pathOf("alpha.md")).fields.cadence.kind, "unknown", "…and it reached the model as a declared gap");
      });

      // A MALFORMED DWELL IS REFUSED WITH THE VALUE QUOTED BACK, and the loader's code set is not
      // widened to do it — the whole point of reusing `loop-bad-value` (ADR-004 §3).
      await overRegistry({
        "trade-off.md": arbiter58("trade-off", { dwell: "cycles:two" }),
        "control.md": arbiter58("control"),
      }, (model, fixture) => {
        const [bad] = expectCodes(model, fixture.pathOf("trade-off.md"), ["loop-bad-value"], { why: "a malformed dwell" });
        assert.equal(bad.message, "Invalid value for dwell: cycles:two", "the bad-value finding names the dwell key and quotes the value");
        expectNoCode(model, "loop-bad-value", { at: fixture.pathOf("control.md"), control: fixture.pathOf("trade-off.md"), why: "the well-formed sibling" });
      });
      assert.deepEqual(LOADER_FINDING_CODES, [
        "loop-record-unparseable", "loop-missing-field", "loop-bad-value", "loop-expected-list",
        "loop-expected-scalar", "loop-empty-list", "loop-unknown-key", "loop-key-not-admitted-for-kind",
        "loop-malformed-frontmatter-line", "loop-id-mismatch", "loop-graph-dangling-endpoint",
        "loop-owner-unknown", "loop-cadence-unknown", "loop-ceiling-unknown", "loop-ceiling-uncapped",
        "loop-ceiling-pointer-unresolved", "loop-field-prose-only",
      ], "the set of finding codes the loader can report is unchanged by this story — seventeen, by name");
    },
  },

  {
    name: "loops-value/58 the dwell grammar table (table)",
    run: async () => {
      for (const row of DWELL_58_CASES) {
        await overRegistry({
          "trade-off.md": arbiter58("trade-off", { dwell: row.value }),
          "control.md": arbiter58("control", { dwell: "periodic:2" }),
        }, (model, fixture) => {
          const at = fixture.pathOf("trade-off.md");
          const label = `dwell: ${row.value}`;
          if (row.outcome === "clean") {
            expectCodes(model, at, [], { control: fixture.pathOf("control.md"), why: label });
            const field = nodeFor(model, at).fields.dwell;
            assert.equal(field.kind, row.kind, label);
            if (row.cycles === null) assert.equal(Object.hasOwn(field, "cycles"), false, `${label}: "none" carries no count`);
            else assert.equal(field.cycles, row.cycles, label);
          } else if (row.outcome === "bad-value") {
            const [bad] = expectCodes(model, at, ["loop-bad-value"], { why: label });
            assert.equal(bad.message, `Invalid value for dwell: ${row.value}`, `${label}: quoted back as authored`);
            assert.equal("dwell" in nodeFor(model, at).fields, false, `${label}: and nothing reached the model`);
          } else {
            const [bad] = expectCodes(model, at, ["loop-expected-scalar"], { why: label });
            assert.equal(bad.message, "dwell must be a scalar", `${label}: refused as a non-scalar`);
          }
        });
      }
      // THE BOUNDARY IS ONE, NOT ZERO — stated over the table rather than trusted to a row, so a
      // grammar that accepted `cycles:0` could not pass by having its row quietly retyped.
      assert.equal(DWELL_58_CASES.find((row) => row.value === "cycles:1").outcome, "clean");
      assert.equal(DWELL_58_CASES.find((row) => row.value === "cycles:0").outcome, "bad-value");
      // AND `unknown` IS REFUSED WHILE IT IS A MEMBER OF THE SENTINEL VOCABULARY — the refusal is
      // a decision about this key, not a gap in the loader's sentinel set.
      assert.equal(SENTINEL_TOKENS.has("unknown"), true, "the sentinel exists…");
      assert.equal(DWELL_58_CASES.find((row) => row.value === "unknown").outcome, "bad-value", "…and a dwell still refuses it");
    },
  },

  {
    name: "loops-value/58 the conflict an arbiter resolves and the metric a watcher counts are read by one rule (table)",
    run: async () => {
      for (const row of RESOLVES_COUNTER_58_CASES) {
        const authored = row.value === EMPTY_VALUE ? "" : row.value;
        await overRegistry({
          "trade-off.md": arbiter58("trade-off", { resolves: authored }),
          "sentry.md": watcher58("sentry", { counter: authored }),
          "control.md": arbiter58("control", { resolves: "config:work.loop.reviewRounds" }),
        }, (model, fixture) => {
          const label = `resolves/counter: ${row.value}`;
          for (const [name, key] of [["trade-off.md", "resolves"], ["sentry.md", "counter"]]) {
            const at = fixture.pathOf(name);
            if (row.outcome === "clean") {
              expectCodes(model, at, [], { control: fixture.pathOf("control.md"), why: `${label} @ ${key}` });
              assert.deepEqual(nodeFor(model, at).fields[key], { key, raw: row.value, kind: "phrase" }, `${label}: ${key} is a phrase`);
            } else if (row.outcome === "bad-value") {
              const [bad] = expectCodes(model, at, ["loop-bad-value"], { why: `${label} @ ${key}` });
              assert.equal(bad.message, `Invalid value for ${key}: ${authored}`, `${label}: refused in the same way, naming the ${key} key`);
              assert.equal(key in nodeFor(model, at).fields, false, `${label}: ${key} did not reach the model`);
            } else {
              const [bad] = expectCodes(model, at, ["loop-expected-scalar"], { why: `${label} @ ${key}` });
              assert.equal(bad.message, `${key} must be a scalar`, `${label}: refused as a non-scalar`);
            }
          }
        });
      }
      // EVERY VALUE EITHER KEY ADMITS, THE OTHER ADMITS — asserted over the table as a SET
      // property, so the two keys cannot drift apart one row at a time.
      assert.equal(RESOLVES_COUNTER_58_CASES.every((row) => typeof row.outcome === "string"), true);
      assert.ok(RESOLVES_COUNTER_58_CASES.some((row) => row.outcome === "clean"), "the table admits something");
      assert.ok(RESOLVES_COUNTER_58_CASES.some((row) => row.outcome === "bad-value"), "…and refuses something");
      // …and `controlled` KEEPS ITS DISTINCT RULE: it is the key that admits a pointer beside a
      // phrase, which is exactly why ADR-003 §4 stopped citing it as the model for `resolves`.
      await overRegistry({
        "alpha.md": loopWith({ controlled: "config:work.loop.reviewRounds" }),
        "trade-off.md": arbiter58("trade-off", { resolves: "config:work.loop.reviewRounds" }),
      }, (model, fixture) => {
        expectCodes(model, fixture.pathOf("alpha.md"), [], { control: fixture.pathOf("trade-off.md"), why: "controlled admits the pointer resolves refuses" });
        assert.equal(nodeFor(model, fixture.pathOf("alpha.md")).fields.controlled.kind, "pointer");
      });
    },
  },

  {
    name: "loops-value/58 the arbiter's required declarations table (table)",
    run: async () => {
      for (const row of ARBITER_REQUIRED_58_CASES) {
        await overRegistry({
          "trade-off.md": arbiter58("trade-off", { [row.field]: null }),
          "control.md": arbiter58("control", { dwell: "cycles:0" }),
        }, (model, fixture) => {
          const at = fixture.pathOf("trade-off.md");
          const label = `omitting ${row.field}`;
          const missing = expectCodes(model, at, ["loop-missing-field"], { why: label })
            .filter((finding) => finding.code === "loop-missing-field");
          assert.equal(missing.length, 1, `${label}: one slip, one finding`);
          assert.equal(missing[0].message, `Required field is missing: ${row.field}`, `${label}: the finding names the field`);
          expectNoCode(model, "loop-bad-value", { at, control: fixture.pathOf("control.md"), why: `${label}: absence is not malformation` });
        });
      }
      // NO DEFAULT FOR ANY OF THEM, and the table is the arbiter's WHOLE required set — derived
      // from nothing, so a sixth required key would have to be added here deliberately.
      assert.deepEqual(ARBITER_REQUIRED_58_CASES.map((row) => row.field), ["id", "kind", "title", "resolves", "priority", "dwell"]);
    },
  },

  // ————— milestone 58 / story 00 · task 03 — `03_the-layer-a-loop-declares.feature` ———————

  {
    name: "loops-value/58 a loop declares the layer it runs at, and the record carries the ordinal a comparison will use",
    run: async () => {
      // A LOOP DECLARES ITS LAYER; a loop that declares none is read EXACTLY as it is read today.
      // Both in one load: the optionality claim is the load-bearing half (a required key would
      // redden all seven shipped records the instant this schema landed), and it is only decidable
      // beside a record that does declare one.
      await overRegistry({
        "declared.md": loopWith({ layer: "management" }),
        "silent.md": loopRecord(),
        "control.md": loopWith({ layer: "tactical" }),
      }, (model, fixture) => {
        expectCodes(model, fixture.pathOf("declared.md"), [], { control: fixture.pathOf("control.md"), why: "a declared layer" });
        expectCodes(model, fixture.pathOf("silent.md"), [], { control: fixture.pathOf("control.md"), why: "no layer at all — no finding is raised for the absence" });
        assert.equal(nodeFor(model, fixture.pathOf("declared.md")).fields.layer.raw, "management", "the layer it declares is readable off the node");
        assert.equal("layer" in nodeFor(model, fixture.pathOf("silent.md")).fields, false, "and the silent record carries no layer value");
      });

      // AN ARBITER DECLARING A LAYER IS REFUSED — it is not a cycle, so it has no place on this
      // axis, and the refusal is the loader's existing per-kind one.
      await overRegistry({
        "trade-off.md": arbiter58("trade-off", { layer: "governance" }),
      }, (model, fixture) => {
        const [refused] = expectCodes(model, fixture.pathOf("trade-off.md"), ["loop-key-not-admitted-for-kind"], { why: "an arbiter declaring a layer" });
        assert.equal(refused.message, "Key layer is not admitted for kind arbiter", "the existing finding names the layer key and the arbiter kind");
      });

      // THE PARSED RECORD CARRIES THE ORDINAL A COMPARISON WILL USE — three records in one load,
      // compared against EACH OTHER rather than against literals, because the claim is an ORDER.
      await overRegistry({
        "op.md": loopWith({ layer: "operational" }),
        "mg.md": loopWith({ layer: "management" }),
        "gv.md": loopWith({ layer: "governance" }),
        "control.md": loopWith({ layer: "strategic" }),
      }, (model, fixture) => {
        const rankOf = (name) => nodeFor(model, fixture.pathOf(name)).fields.layer.rank;
        for (const name of ["op.md", "mg.md", "gv.md"]) {
          expectCodes(model, fixture.pathOf(name), [], { control: fixture.pathOf("control.md"), why: name });
          assert.equal(typeof rankOf(name), "number", `${name}: reports an ordinal for the layer it declared`);
        }
        assert.ok(rankOf("gv.md") > rankOf("mg.md"), "the governance record's ordinal is higher than the management record's");
        assert.ok(rankOf("mg.md") > rankOf("op.md"), "the management record's ordinal is higher than the operational record's");
        // AND NO DURATION ACCOMPANIES ANY OF THEM. Slower is higher, and a rank is compared, never
        // divided — a `ms`/`seconds`/`interval` beside the ordinal would be the fabricated
        // conversion 52/ADR-006 §5 bans and ADR-002 was written to avoid.
        for (const name of ["op.md", "mg.md", "gv.md"]) {
          const field = nodeFor(model, fixture.pathOf(name)).fields.layer;
          assert.deepEqual(Object.keys(field).sort(), ["key", "kind", "raw", "rank", "value"].sort(), `${name}: the exact key set`);
          for (const duration of ["ms", "seconds", "interval", "intervalMs", "duration", "durationMs", "period"]) {
            assert.equal(Object.hasOwn(field, duration), false, `${name}: no duration accompanies the ordinal (${duration})`);
          }
        }
      });

      // A LOOP'S CADENCE CARRIES ITS OWN SCOPE ORDINAL ALONGSIDE THE DECLARED LAYER, and the two
      // are read SIDE BY SIDE off one record — which is what lets a later check compare numbers it
      // was handed instead of deriving a duration from a trigger.
      await overRegistry({
        "alpha.md": loopWith({ layer: "management", cadence: "event:per-item" }),
        "control.md": loopWith({ cadence: "event:per-week" }),
      }, (model, fixture) => {
        expectCodes(model, fixture.pathOf("alpha.md"), [], { control: fixture.pathOf("control.md"), why: "a layer beside an event cadence" });
        const node = nodeFor(model, fixture.pathOf("alpha.md"));
        assert.equal(node.fields.layer.rank, 1, "the layer's ordinal");
        assert.equal(node.fields.cadence.scopeRank, 1, "…and the cadence's scope ordinal, side by side");
        assert.equal(Object.hasOwn(node.fields.cadence, "ms"), false, "the record reports no duration for that cadence");
      });

      // A CLOCK SAYS NOTHING ABOUT SCOPE: a periodic cadence keeps the interval it already
      // reported and gains no scope ordinal, because there is nothing about containment in a
      // duration and inventing one is the move this whole ADR refuses.
      await overRegistry({
        "clock.md": loopWith({ cadence: "periodic:15s" }),
        "control.md": loopWith({ cadence: "periodic:0s" }),
      }, (model, fixture) => {
        expectCodes(model, fixture.pathOf("clock.md"), [], { control: fixture.pathOf("control.md"), why: "a periodic cadence" });
        const field = nodeFor(model, fixture.pathOf("clock.md")).fields.cadence;
        assert.equal(field.ms, 15_000, "the record reports the interval that cadence already reported");
        assert.equal(Object.hasOwn(field, "scopeRank"), false, "and reports no scope ordinal");
      });

      // A LAYER ITS CADENCE CONTRADICTS IS STILL PARSED, AND THE DISAGREEMENT IS LEFT VISIBLE.
      // Whether a declared layer agrees with its cadence is a later story's question; the loader
      // makes both facts visible in the same place and passes judgment on neither.
      await overRegistry({
        "odd.md": loopWith({ layer: "governance", cadence: "event:per-phase" }),
        "control.md": loopWith({ layer: "operations" }),
      }, (model, fixture) => {
        expectCodes(model, fixture.pathOf("odd.md"), [], { control: fixture.pathOf("control.md"), why: "a layer its cadence contradicts is still parsed" });
        const node = nodeFor(model, fixture.pathOf("odd.md"));
        assert.equal(node.fields.layer.rank, 2, "both ordinals are readable off the node");
        assert.equal(node.fields.cadence.scopeRank, 0);
        assert.notEqual(node.fields.layer.rank, node.fields.cadence.scopeRank, "…and they genuinely disagree, so the silence below is about a real disagreement");
      });
    },
  },

  {
    name: "loops-value/58 which kinds admit a layer (table)",
    run: async () => {
      for (const row of LAYER_KIND_58_CASES) {
        await overRegistry({
          "subject.md": row.build("subject", { layer: "operational" }),
          "control.md": arbiter58("control", { dwell: "cycles:0" }),
        }, (model, fixture) => {
          const at = fixture.pathOf("subject.md");
          const label = `${row.kind} declaring a layer`;
          if (row.admits) {
            expectCodes(model, at, [], { control: fixture.pathOf("control.md"), why: label });
            assert.equal(nodeFor(model, at).fields.layer.value, "operational", `${label}: admits the key`);
          } else {
            const [refused] = expectCodes(model, at, ["loop-key-not-admitted-for-kind"], { why: label });
            assert.equal(refused.message, `Key layer is not admitted for kind ${row.kind}`, label);
            assert.equal("layer" in nodeFor(model, at).fields, false, `${label}: nothing reached the model`);
          }
        });
      }
      // A NODE WITHOUT A CADENCE HAS NO PLACE ON THIS AXIS. Stated over the vocabulary so the two
      // cannot drift — as a CONTAINMENT rather than as an equality, which is the direction 58/ADR-002
      // §1 actually argued: a layer without a cadence is a claim about how fast a cycle turns made by
      // something that is not a cycle. The converse never held as a rule and 59/ADR-001 breaks it in
      // fact: an auditor IS a cadenced pass (§1 requires `cadence:`) and still declares no layer,
      // because it supervises nothing (§2). Equality would have made that ADR unimplementable.
      assert.deepEqual([...NODE_KINDS].filter((kind) => ADMITTED_KEYS[kind].has("layer")), ["loop"]);
      for (const kind of NODE_KINDS) {
        if (!ADMITTED_KEYS[kind].has("layer")) continue;
        assert.equal(ADMITTED_KEYS[kind].has("cadence"), true, `${kind}: no layer without a cadence`);
      }
      // The table mechanises 58's own Examples block, which is five rows and immutable; the sixth
      // kind is decided by the vocabulary sweep above, which runs over every kind there will ever be.
      assert.equal(LAYER_KIND_58_CASES.length, 5, "every kind 58 declared has a row");
    },
  },

  {
    name: "loops-value/58 the layer value table (table)",
    run: async () => {
      for (const row of LAYER_VALUE_58_CASES) {
        await overRegistry({
          "alpha.md": loopWith({ layer: row.value }),
          "control.md": loopWith({ layer: "strategic" }),
        }, (model, fixture) => {
          const at = fixture.pathOf("alpha.md");
          const label = `layer: ${row.value}`;
          if (row.rank !== undefined) {
            expectCodes(model, at, [], { control: fixture.pathOf("control.md"), why: label });
            assert.equal(nodeFor(model, at).fields.layer.rank, row.rank, `${label}: reports the stated ordinal`);
          } else if (row.outcome === "bad-value") {
            const [bad] = expectCodes(model, at, ["loop-bad-value"], { why: label });
            assert.equal(bad.message, `Invalid value for layer: ${row.value}`, `${label}: refused as a bad value, quoted back`);
            assert.equal("layer" in nodeFor(model, at).fields, false, label);
          } else {
            const [bad] = expectCodes(model, at, ["loop-expected-scalar"], { why: label });
            assert.equal(bad.message, "layer must be a scalar", `${label}: refused as a non-scalar`);
          }
        });
      }
      // THREE LITERALS RANKED SLOWER-IS-HIGHER, NO SENTINEL, AND NO BARE ORDINAL — read off the
      // table itself, so the three admitted rows are contiguous ranks starting at zero.
      const admitted = LAYER_VALUE_58_CASES.filter((row) => row.rank !== undefined);
      assert.deepEqual(admitted.map((row) => row.rank), [0, 1, 2], "three literals, three contiguous ranks");
      assert.deepEqual(admitted.map((row) => row.value), ["operational", "management", "governance"]);
      for (const sentinel of SENTINEL_TOKENS) {
        if (sentinel === "prose:") continue;
        assert.equal(LAYER_VALUE_58_CASES.some((row) => row.value === sentinel && row.rank !== undefined), false, `${sentinel}: no sentinel is admitted on this axis`);
      }
    },
  },

  {
    name: "loops-value/58 the cadence scope-ordinal table (table)",
    run: async () => {
      for (const row of CADENCE_SCOPE_58_CASES) {
        await overRegistry({
          "alpha.md": loopWith({ cadence: row.cadence }),
          "control.md": loopWith({ cadence: "event:per-eclipse" }),
        }, (model, fixture) => {
          const at = fixture.pathOf("alpha.md");
          const label = `cadence: ${row.cadence}`;
          if (row.outcome === "bad-value") {
            const [bad] = expectCodes(model, at, ["loop-bad-value"], { why: label });
            assert.equal(bad.message, `Invalid value for cadence: ${row.cadence}`, `${label}: a bad-value refusal`);
            return;
          }
          expectCodes(model, at, row.codes, { control: fixture.pathOf("control.md"), why: label });
          const field = nodeFor(model, at).fields.cadence;
          if (row.scopeRank === null) assert.equal(Object.hasOwn(field, "scopeRank"), false, `${label}: no scope ordinal`);
          else assert.equal(field.scopeRank, row.scopeRank, `${label}: the stated scope ordinal`);
        });
      }
      // THE CLOSED TRIGGER SET STANDS IN A CONTAINMENT RELATION; A CLOCK DOES NOT. Every member of
      // the frozen trigger set has a row, so a fifth trigger cannot arrive without a decision about
      // where it sits — and the ordinals are contiguous from zero, which is what makes them an
      // ordinal rather than four unrelated numbers.
      const ranked = CADENCE_SCOPE_58_CASES.filter((row) => row.scopeRank !== null && row.outcome !== "bad-value");
      assert.deepEqual(
        [...new Set(ranked.map((row) => row.scopeRank))].sort(),
        [0, 1, 2],
        "three ordinals over four triggers — a run-start and a phase share the innermost scope",
      );
      assert.deepEqual(
        ranked.map((row) => row.cadence.slice("event:".length)).sort(),
        [...EVENT_TRIGGERS].sort(),
        "every member of the frozen trigger set carries a scope ordinal, and nothing outside it does",
      );
    },
  },

  {
    name: "loops-value/58 every Examples row of 58/00's value features is driven by a case",
    run: async () => {
      // TRACEABILITY, MECHANISED — each table above bound to the Examples block it mechanises by
      // ROW COUNT and by HEADER, parsed from the feature on disk. 58's cases sit outside milestone
      // 52's ledger by construction (its set equality is over 52's own twenty features), so the
      // binding that ledger would have provided is made here instead of being left unmade.
      for (const { feature, tables } of TRACED_58_TABLES) {
        const parsed = examplesTables(await readFile(path.join(REPO_ROOT_58, feature), "utf8"));
        assert.equal(parsed.length, tables.length, `${feature}: one traced table per Examples block`);
        for (const [index, entry] of tables.entries()) {
          assert.equal(entry.cases.length, parsed[index].rows.length, `${feature} table ${index}: a case per row`);
          assert.deepEqual(parsed[index].header, entry.header, `${feature} table ${index}: the feature's own column names`);
        }
      }
    },
  },
];

/**
 * THE COVERAGE LEDGER. `decided` is what this suite really decides; `tables` carries one entry per
 * Examples table of the two covered features, each `cases` being the very array a test above
 * iterates. Task 05's checker re-derives the scenario titles and row counts from the `.feature`
 * files and consumes this.
 *
 * TWO COVERED FEATURES, PLUS ONE MIGRATED SCENARIO. `02_field-value-grammar` (25 scenarios, 76
 * rows) and `03_pointer-endpoint-syntax` (29, 41) are covered WHOLE: their decided ∪ excluded is
 * exactly their scenario-title set — 54 titles, 117 rows. `04_timescale-comparability` appears for
 * exactly ONE title, the migrated ladder claim, and for nothing else: its other twenty scenarios
 * and both its tables belong to `test/loop/work-loops-checks.test.mjs`, which covers that feature whole.
 * The migration is recorded here because the claim is a LOADER claim — FF-5206 and the checks suite
 * both build `{kind:"periodic", ms}` literally, so until this suite nothing on disk ever resolved
 * "15m" to 900000 from an authored record. That sibling ledger still lists the same title against
 * its duration-ratio table; the overlap is deliberate and is flagged to the story, because only one
 * of two homes can survive the "a duplicated invariant is two homes for one rule" rule and the
 * choice belongs to the story rather than to this task.
 *
 * ONE EXCLUSION, a shrink of the seeded ceiling rather than an expansion. Everything else this
 * suite could have excluded is decided instead — including the two members that sit closest to a
 * gate. `03_pointer-endpoint-syntax`'s "the dangling finding is the load's own" is DECIDED rather
 * than excluded as `not-black-box`: its "with no structural check having been invoked" clause is
 * driven by the proxy this whole suite is built on — the only `src/` module it imports is
 * `work-loops.mjs`, asserted by source scan in the meta test, so there is no check here to invoke.
 * And the four differential scenarios are decided by byte identity across two worlds rather than by
 * the finding count that could never have separated a resolver from a non-resolver.
 */
const decide = (feature, pairs) => pairs.map(([scenario, test]) => ({ feature, scenario, test }));

export const coverage = {
  features: [GRAMMAR_FEATURE, POINTER_FEATURE, TIMESCALE_FEATURE],
  decided: [
    ...decide(GRAMMAR_FEATURE, [
      ["every field carries key, raw and kind, and kind is never absent", NAME.sixKinds],
      ["raw is the value exactly as authored", NAME.rawAuthored],
      ["pointer is present only when kind is pointer", NAME.pointerPresence],
      ["a declared gap and a filled field differ in kind, not merely in raw", NAME.gapVsFilled],
      ["the six authority-and-gap kinds are distinguished, and every gap kind names the gap it declares", NAME.sixKinds],
      ["the five typed kinds each carry their own payload", NAME.typedKinds],
      ["cadence arrives normalised — a consumer is never handed a duration to parse", NAME.durationLadder],
      ["an event cadence names its trigger and carries no duration", NAME.eventCadence],
      ["the shape of a field is fixed by its key, never by its data", NAME.shapeByKey],
      ["a sentinel on ceiling still arrives inside a list", NAME.shapeByKey],
      ["the scalar keys are never wrapped in a list", NAME.shapeByKey],
      ['"unknown" is admitted on owner, cadence and ceiling', NAME.sentinelAdmission],
      ['"unknown" anywhere else is a bad value — an aspirational loop cannot be declared', NAME.sentinelAdmission],
      ['"uncapped" and "none" are admitted only on ceiling, and they mean opposite things', NAME.ceilingSentinels],
      ['"uncapped" on any key other than ceiling is a bad value', NAME.sentinelAdmission],
      ['"ceiling: unknown" is a declared gap and warns like its siblings', NAME.ceilingSentinels],
      ["the three ceiling sentinels are told apart by kind AND by code", NAME.ceilingSentinels],
      ["a free-text phrase is admitted on controlled, and on no other key", NAME.phraseAdmission],
      ["a free-text phrase on a machinery field is a bad value", NAME.phraseAdmission],
      ["a field whose authority is only a paragraph is a warn, not an error", NAME.proseOnly],
      ["each entry of a list field is classified on its own", NAME.proseOnly],
      ["a field mixing a pointer and a prose entry is not prose-only", NAME.proseOnly],
      ["an empty list is not a way to declare a gap", NAME.emptyList],
      ["a filled typed value never carries a gap kind", NAME.typedKinds],
    ]),
    ...decide(POINTER_FEATURE, [
      ["the three pointer schemes parse into scheme, operand and an optional symbol", NAME.pointerSplit],
      ["the operand is everything after the FIRST colon", NAME.pointerSplit],
      ["a module pointer without a symbol is a bad value", NAME.pointerGrammar],
      ["a module pointer whose path is absolute is a bad value", NAME.pointerGrammar],
      ["a module pointer whose path uses OS separators is a bad value", NAME.pointerGrammar],
      ['an unknown scheme is a bad value — there is deliberately no "doc:" pointer', NAME.pointerGrammar],
      ["an endpoint scheme is not a pointer scheme", NAME.pointerGrammar],
      ["the six endpoint schemes parse on every one of the five edge keys", NAME.endpointSchemes],
      ["a module endpoint splits its symbol by exactly the rule a module pointer uses", NAME.endpointSchemes],
      ['an endpoint with no "#" carries no symbol at all', NAME.endpointSchemes],
      ['a "#" anywhere outside a module pointer or endpoint is a bad value', NAME.hashOutsideModule],
      ['a "#" inside a "prose:" value is admitted, and the anchor is retained verbatim', NAME.proseAnchor],
      ["intra-registry endpoints resolve against the DECLARED nodes", NAME.intraRegistry],
      ["an intra-registry endpoint with no declaring record is dangling", NAME.intraRegistry],
      ["the dangling finding is the load's own — no structural check has to run for it to appear", NAME.intraRegistry],
      ["resolution does not depend on the order the records are read", NAME.resolutionOrder],
      ["resolution is by declared id, not by filename", NAME.intraRegistry],
      ["an endpoint naming a node whose kind is bad or missing still resolves", NAME.intraRegistry],
      ["extra-registry endpoints carry resolved: null and are never resolved", NAME.extraRegistryNull],
      ["a repeated endpoint on one edge key is deduplicated in silence", NAME.dedupAsymmetry],
      ["a repeated SELF-referential endpoint leaves exactly one edge for a later check to see", NAME.dedupAsymmetry],
      ["a repeated entry in a FIELD list is kept, never deduplicated", NAME.dedupAsymmetry],
      ["dedup is the edge lane's rule alone, and one record shows both sides of it at once", NAME.dedupAsymmetry],
      ["an edge key authored with an empty list is an error, and an absent edge key is not", NAME.emptyEdgeKey],
      ["an empty list on any of the five edge keys is the same error", NAME.emptyEdgeKey],
      ["a module pointer naming a file that does not exist produces NO finding", NAME.differential],
      ["a module pointer naming a symbol that is not exported produces NO finding", NAME.differential],
      ["an unregistered command id and an absent config key produce NO finding", NAME.differential],
      ["an item endpoint naming no existing work item produces NO finding", NAME.differential],
    ]),
    ...decide(TIMESCALE_FEATURE, [
      ["duration units resolve and compare across ms, s, m, h and d", NAME.durationLadder],
    ]),
  ],
  excluded: [
    {
      feature: GRAMMAR_FEATURE,
      scenario: "id, kind and title are node-level and never appear among the fields",
      class: "duplicate-claim",
      reason: "Both clauses — that `fields` carries no entry named id, kind or title, and that the node's own id, kind and title are readable without going through `fields` — are asserted per node over a populated model by task 00's suite, which owns the node-shape claim. A second home for it is the duplicated invariant 52/05's acceptance forbids. What this suite adds instead is the half a node-shape claim cannot see — that a title carries no `kind` at all, and so is not a Field — which is decided on the first row of the field-value table.",
      pointer: "a node is exactly id, kind, title, path, fields and edges",
    },
  ],
  tables: [
    { feature: GRAMMAR_FEATURE, index: 0, rows: 76, cases: FIELD_VALUE_ROWS },
    { feature: POINTER_FEATURE, index: 0, rows: 41, cases: POINTER_ROWS },
  ],
};
