// test/loop/work-loops-record.test.mjs — milestone 52 / story 05, task 00: THE RECORD SUITE.
//
// The subject is always the exported `loadLoops(workDir)`, driven over a temp
// `<work.dir>/loops/` materialised by `test/support/loop-registry-fixture.mjs`. Never a
// module-private function, never a source read.
//
// WHAT THIS SUITE IS. It is the COMPLEMENT of the nine `test/arch/acd-loop-*` structural
// gates, not a second copy of them. FF-5203 already set-equals all thirteen exported
// vocabularies against the ADR literals; FF-5209 already owns the 24-code lane/severity
// table, the four-key envelope, OS-native absoluteness and a literal total-order oracle.
// Re-asserting any of those here would be the duplicated invariant 52/05's acceptance
// forbids — two homes for one rule — so each is recorded in `coverage.excluded` with the
// arch test that owns it. What is left is what those gates' fixtures CANNOT discriminate,
// and every case below names the discriminator it carries:
//
//   · the unparseable lane's case folding uses "README.md"/"draft.md" — FF-5209's pair is
//     "a-unparseable.md"/"z-unparseable.md", which sort identically under code units and
//     under a case-folding collation, so its fixture cannot see the rule it asserts;
//   · the within-key order uses entries whose AUTHORED order and RAW-TEXT order disagree —
//     FF-5209's pair is "bad:first"/"bad:second", where the two agree;
//   · determinism includes the IN-PROCESS repeat, the leg nothing on disk owns today
//     (FF-5209 calls `loadLoops` once per test);
//   · the malformed-line rank is driven by TWO nodes carrying malformed lines — FF-5209's
//     fixture has one, and it is the first node in id order, so a loader that hoisted every
//     malformed finding to the front of the lane would satisfy its oracle.
//
// Non-vacuity matters more than coverage: a case whose observation would pass over a loader
// that read nothing is not a case — hence the paired absent/populated models, the
// before/after vocabulary captures, and the collation-disagreement assertions that make the
// ordering claims decide a rule rather than restate it.
//
// TWO REGISTRATION TRAPS, both confirmed at the source (`test/arch/acd-loop-finding-envelope
// .test.mjs:358` and `:384`): its roster leg deep-equals the on-disk `test/arch/acd-loop-*`
// list against a literal nine, and its import-block leg requires no tenth `...acdLoop`
// spread. So this suite lives in `test/` without the `acd-loop-` prefix and exports an alias
// that does not begin `acdLoop`.
//
// ADR-002 (declared gaps), ADR-011 §2–§5 and §7 (typed fields, kind-scoped keys, dropped
// lines, empty lists, the normalised model), ADR-013 §1–§4 (the total order, `kind`
// suspension, no dedup).
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ADMITTED_KEYS, CADENCE_KINDS, EDGE_KEYS, ENDPOINT_SCHEMES, EVENT_TRIGGERS, FIELD_KINDS,
  GROUND_VALUES, LOADER_FINDING_CODES, NODE_KINDS, PERIODIC_UNITS, POINTER_SCHEMES,
  SENTINEL_TOKENS, loadLoops,
} from "../../src/work/loops.mjs";
import * as loaderModule from "../../src/work/loops.mjs";
import { examplesTables } from "../support/feature-parse.mjs";
import {
  actorRecord, actorRecordNames, codesFor, findingsFor, identityRecord, idsOf,
  loadLoopsInFreshProcess, loopRecord, messagesFor, nodeFor, renderRecord, reversedFiles,
  withLoopRegistry, withoutLoopRegistry,
} from "../support/loop-registry-fixture.mjs";

const FEATURE_DIR = "wiki/work/52_milestone_loop-registry-and-graph/stories/00_story_loop-model-and-loader/tasks";
const RECORD_FEATURE = `${FEATURE_DIR}/01_record-loader.feature`;
const VOCABULARY_FEATURE = `${FEATURE_DIR}/00_frozen-vocabulary.feature`;
const FINDINGS_FEATURE = `${FEATURE_DIR}/04_schema-and-honesty-findings.feature`;

// The arch gates whose assertions this suite refuses to duplicate. Looked up in the files,
// not remembered — `coverage.excluded[].pointer` must resolve to a `name` one of the nine
// modules actually exports.
const FF_5203_VOCABULARIES = "arch/52 FF-5203: all thirteen exported vocabularies equal the governing ADR literals";
const FF_5209_CODE_TABLE = "arch/52 FF-5209: the literal lane/severity table is reachable with exact anchors and ordering";
const FF_5209_TOTAL_ORDER = "arch/52 FF-5209: loader total order is independent of directory order and fixed by a literal oracle";

// The eight codes the CHECKS lane owns (ADR-011 §1). A load must never emit one; that is the
// "—" row of the total-order table, and the only place this suite names them.
const CHECK_LANE_CODES = Object.freeze([
  "loop-graph-ungrounded-component", "loop-graph-grounded-exogenous-only", "loop-unpaired-optimizer",
  "loop-unowned-reference", "loop-self-referential-edge", "loop-shared-actuator-unarbitrated",
  "loop-timescale-inversion", "loop-timescale-not-comparable",
]);

const BASE_ACTOR = "steward.md";
const REGISTRY_BRAND = Symbol("loop-registry fixture built by registry()");

/**
 * THE BACKGROUND, MECHANISED: "every base fixture carries at least one `kind: actor` record".
 * A fixture that already declares an actor keeps its own; every other one gets `steward.md`,
 * a clean actor that contributes exactly one node and zero findings. Where that makes a
 * scenario's literal node COUNT one higher, the case asserts the exact node-id SET instead —
 * strictly stronger than the count, and it still fails the loader the count was aimed at.
 */
function registry(files = {}) {
  const built = actorRecordNames(files).length > 0 ? { ...files } : { [BASE_ACTOR]: actorRecord(), ...files };
  // Branded NON-ENUMERABLY, so the map is still exactly the file map the fixture writes (a
  // spread or an `Object.entries` round trip drops the brand, which is what forces a derived
  // map — a reversed one, say — back through `registry()` rather than past it).
  return Object.defineProperty(built, REGISTRY_BRAND, { value: actorRecordNames(built), enumerable: false });
}

/**
 * Materialise, drive the exported loader, tear down. The subject stays in this file.
 *
 * The brand check is how the Background becomes a property of the SUITE rather than of the
 * cases a reader happens to check: no fixture reaches the loader without an actor record,
 * because there is no other door.
 */
async function overRegistry(files, run) {
  assert.ok(files?.[REGISTRY_BRAND]?.length > 0, "every fixture is built by registry(), which guarantees the Background's `kind: actor` record");
  return withLoopRegistry(files, async (fixture) => run(await loadLoops(fixture.workDir), fixture));
}

const severitiesOf = (model) => [...new Set(model.findings.map((finding) => finding.severity))].sort();
const indexOfPath = (model, filePath) => model.findings.findIndex((finding) => finding.path === filePath);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ————— the case tables ————————————————————————————————————————————————————————————
// Each array below is iterated by exactly one test AND is the `cases` array of one
// `coverage.tables` entry, so a row that stopped being driven would stop being counted.

// `01_record-loader` Examples 0 — filename x kind x declared id -> outcome (13 rows).
// One registry PER ROW: six rows are authored in "run-resilience.md" and two in "operator.md",
// so they cannot coexist in one directory without changing the very thing they measure.
const ID_TABLE_CASES = [
  { filename: "run-resilience.md", kind: "loop", declaredId: "loop:run-resilience", outcome: "node loads, no id finding", spec: loopRecord(), codes: [], nodeId: "loop:run-resilience" },
  { filename: "mesh-assignment-reclaim.md", kind: "loop", declaredId: "loop:mesh-assignment-reclaim", outcome: "node loads, no id finding", spec: loopRecord(), codes: [], nodeId: "loop:mesh-assignment-reclaim" },
  { filename: "operator.md", kind: "actor", declaredId: "actor:operator", outcome: "node loads, no id finding", spec: actorRecord(), codes: [], nodeId: "actor:operator" },
  { filename: "run-resilience.md", kind: "loop", declaredId: "loop:run-resiliance", outcome: "loop-id-mismatch (stem disagrees)", spec: loopRecord({ id: "loop:run-resiliance" }), codes: ["loop-id-mismatch"], nodeId: "loop:run-resiliance" },
  { filename: "run-resilience.md", kind: "loop", declaredId: "run-resilience", outcome: "loop-id-mismatch (no scheme)", spec: loopRecord({ id: "run-resilience" }), codes: ["loop-id-mismatch"], nodeId: "run-resilience" },
  { filename: "run-resilience.md", kind: "loop", declaredId: "actor:run-resilience", outcome: "loop-id-mismatch (scheme disagrees)", spec: loopRecord({ id: "actor:run-resilience" }), codes: ["loop-id-mismatch"], nodeId: "actor:run-resilience" },
  { filename: "operator.md", kind: "actor", declaredId: "loop:operator", outcome: "loop-id-mismatch (scheme disagrees)", spec: actorRecord({ id: "loop:operator" }), codes: ["loop-id-mismatch"], nodeId: "loop:operator" },
  { filename: "run-resilience.md", kind: "loop", declaredId: "(key absent)", outcome: 'loop-missing-field naming "id"', spec: loopRecord({ id: null }), codes: ["loop-missing-field"], nodeId: null, names: "id" },
  { filename: "run-resilience.md", kind: "—", declaredId: "loop:run-resilience", outcome: 'loop-missing-field naming "kind"', spec: loopRecord({ kind: null }), codes: ["loop-missing-field"], nodeId: "loop:run-resilience", names: "kind" },
  { filename: "notes.txt", kind: "n/a", declaredId: "n/a", outcome: "ignored — no node, no finding", spec: "loop notes, and not a record at all\n", codes: [], node: false },
  { filename: "archive/old-loop.md", kind: "n/a", declaredId: "n/a", outcome: "ignored — not descended, no finding", spec: loopRecord(), codes: [], node: false },
  { filename: "README.md", kind: "n/a", declaredId: "(no --- block)", outcome: "loop-record-unparseable, no node", spec: "Prose with no frontmatter block.\n", codes: ["loop-record-unparseable"], node: false },
  { filename: "draft.md", kind: "n/a", declaredId: "(--- block after a blank line)", outcome: "loop-record-unparseable, no node", spec: loopRecord({ leadingBlank: true }), codes: ["loop-record-unparseable"], node: false },
];

// `01_record-loader` Examples 1 — key shape x value shape -> outcome (12 rows). The shape a
// key expects comes from the frozen schema, never from the value it was handed, so each row
// also asserts what the node does NOT carry: nothing is coerced, collapsed or unwrapped.
const SHAPE_TABLE_CASES = [
  { expects: "list", authored: "[module:src/run-store.mjs#isRetryable]", outcome: "loads as a list", file: "shape-list-loads.md", spec: loopRecord(), codes: [], check: (node) => { assert.ok(Array.isArray(node.fields.reference)); assert.equal(node.fields.reference.length, 1); assert.equal(node.fields.reference[0].kind, "pointer"); } },
  { expects: "list", authored: "module:src/run-store.mjs#isRetryable", outcome: "loop-expected-list", file: "shape-list-scalar.md", spec: loopRecord({ fields: { reference: "module:src/run-store.mjs#isRetryable" } }), codes: ["loop-expected-list"], check: (node) => assert.equal("reference" in node.fields, false) },
  { expects: "list", authored: "(empty after the colon)", outcome: "loop-expected-list", file: "shape-list-empty-value.md", spec: loopRecord({ fields: { reference: "" } }), codes: ["loop-expected-list"], check: (node) => assert.equal("reference" in node.fields, false) },
  { expects: "list", authored: '(indented "- " block lines)', outcome: "loop-expected-list", file: "shape-list-block.md", spec: loopRecord({ fields: { reference: "" }, after: { reference: ["  - module:src/run-store.mjs#isRetryable", "  - command:work:next"] } }), codes: ["loop-expected-list"], check: (node) => { assert.equal("reference" in node.fields, false); assert.equal(JSON.stringify(node).includes("isRetryable"), false); } },
  { expects: "list", authored: "[]", outcome: "loop-empty-list", file: "shape-list-empty.md", spec: loopRecord({ fields: { reference: "[]" } }), codes: ["loop-empty-list"], check: (node) => assert.equal("reference" in node.fields, false) },
  { expects: "edge list", authored: "[loop:autonomous-cascade]", outcome: "loads as one edge", file: "shape-edge-loads.md", spec: loopRecord({ fields: { "data-feed": "[loop:autonomous-cascade]" } }), codes: [], check: (node) => { assert.deepEqual(Object.keys(node.edges), ["data-feed"]); assert.equal(node.edges["data-feed"].length, 1); assert.equal(node.edges["data-feed"][0].resolved, true); } },
  { expects: "edge list", authored: "[]", outcome: "loop-empty-list", file: "shape-edge-empty.md", spec: loopRecord({ fields: { "data-feed": "[]" } }), codes: ["loop-empty-list"], check: (node) => assert.deepEqual(Object.keys(node.edges), []) },
  { expects: "edge list", authored: "(key absent)", outcome: "no edge key, no finding", file: "shape-edge-absent.md", spec: loopRecord(), codes: [], check: (node) => assert.deepEqual(Object.keys(node.edges), []) },
  { expects: "scalar", authored: "actor:product-owner", outcome: "loads as one field", file: "shape-scalar-loads.md", spec: loopRecord(), codes: [], check: (node) => { assert.equal(Array.isArray(node.fields.owner), false); assert.equal(node.fields.owner.kind, "ref"); } },
  { expects: "scalar", authored: "[actor:product-owner]", outcome: "loop-expected-scalar", file: "shape-scalar-one-entry.md", spec: loopRecord({ fields: { owner: "[actor:product-owner]" } }), codes: ["loop-expected-scalar"], check: (node) => assert.equal("owner" in node.fields, false) },
  { expects: "scalar", authored: "[run state, attempt count]", outcome: "loop-expected-scalar", file: "shape-scalar-list.md", spec: loopRecord({ fields: { controlled: "[run state, attempt count]" } }), codes: ["loop-expected-scalar"], check: (node) => assert.equal("controlled" in node.fields, false) },
  { expects: "scalar", authored: "[]", outcome: "loop-expected-scalar", file: "shape-scalar-empty.md", spec: loopRecord({ fields: { controlled: "[]" } }), codes: ["loop-expected-scalar"], check: (node) => assert.equal("controlled" in node.fields, false) },
];

// `01_record-loader` Examples 2 — an unusable kind x the rest of the record (10 rows).
// `reported` is what SURVIVES suspension; `neverCodes` is the kind-DERIVED finding a reader
// might expect beside it and must never see. Rows 3 and 4 are both authored in "sensor.md",
// so this table too takes one registry per row.
const KIND_SUSPENSION_CASES = [
  { record: 'kind: sensor, with no "owner" key', reported: 'loop-bad-value naming "kind"', file: "sensor-no-owner.md", spec: loopRecord({ kind: "sensor", fields: { owner: null } }), codes: ["loop-bad-value"], neverCodes: ["loop-missing-field"] },
  { record: '(no "kind" key), with no "owner" key', reported: 'loop-missing-field naming "kind"', file: "kindless.md", spec: loopRecord({ kind: null, fields: { owner: null } }), codes: ["loop-missing-field"], neverCodes: [], namesOnly: "kind" },
  { record: 'kind: sensor, in "sensor.md", id: loop:sensor', reported: 'loop-bad-value naming "kind"', file: "sensor.md", spec: identityRecord({ id: "loop:sensor", kind: "sensor" }), codes: ["loop-bad-value"], neverCodes: ["loop-id-mismatch"] },
  { record: 'kind: sensor, in "sensor.md", id: loop:sensr', reported: "loop-bad-value, and loop-id-mismatch", file: "sensor.md", spec: identityRecord({ id: "loop:sensr", kind: "sensor" }), codes: ["loop-id-mismatch", "loop-bad-value"], neverCodes: [] },
  { record: 'kind: sensor, carrying "ground: exogenous"', reported: 'loop-bad-value naming "kind"', file: "sensor-ground.md", spec: identityRecord({ kind: "sensor", fields: { ground: "exogenous" } }), codes: ["loop-bad-value"], neverCodes: ["loop-key-not-admitted-for-kind"] },
  { record: 'kind: sensor, carrying "cadence: periodic:15s"', reported: 'loop-bad-value naming "kind"', file: "sensor-cadence.md", spec: identityRecord({ kind: "sensor", fields: { cadence: "periodic:15s" } }), codes: ["loop-bad-value"], neverCodes: ["loop-key-not-admitted-for-kind"] },
  { record: 'kind: sensor, carrying "status: draft"', reported: "loop-bad-value, and loop-unknown-key", file: "sensor-status.md", spec: identityRecord({ kind: "sensor", fields: { status: "draft" } }), codes: ["loop-bad-value", "loop-unknown-key"], neverCodes: ["loop-key-not-admitted-for-kind"] },
  { record: 'kind: sensor, carrying "reference: module:a.mjs#b"', reported: "loop-bad-value, and loop-expected-list", file: "sensor-reference.md", spec: identityRecord({ kind: "sensor", fields: { reference: "module:a.mjs#b" } }), codes: ["loop-bad-value", "loop-expected-list"], neverCodes: ["loop-key-not-admitted-for-kind"] },
  { record: 'kind: sensor, carrying "actuator: []"', reported: "loop-bad-value, and loop-empty-list", file: "sensor-actuator.md", spec: identityRecord({ kind: "sensor", fields: { actuator: "[]" } }), codes: ["loop-bad-value", "loop-empty-list"], neverCodes: ["loop-key-not-admitted-for-kind"] },
  { record: 'kind: sensor, carrying "cadence: hourly"', reported: 'loop-bad-value for "kind" and for "cadence"', file: "sensor-cadence-hourly.md", spec: identityRecord({ kind: "sensor", fields: { cadence: "hourly" } }), codes: ["loop-bad-value", "loop-bad-value"], neverCodes: ["loop-key-not-admitted-for-kind"], messagesEnd: ["Invalid value for kind: sensor", "Invalid value for cadence: hourly"] },
];

// `00_frozen-vocabulary` Examples 0 — every out-of-vocabulary token and the code it produces
// (31 rows). One registry, one record per row, `codes` the EXACT array for that record — so a
// row whose token produced a second finding, or none, fails on the row that authored it.
// "x.md" is the supporting record that makes the `loop:x` endpoint of row 10 resolve, so its
// "(none)" is about ADMISSION and not about a dangling endpoint.
const VOCABULARY_TABLE_CASES = [
  { vocabulary: "admitted key", token: "status: not-started", expected: "loop-unknown-key", severity: "error", file: "vk-status.md", spec: loopRecord({ fields: { status: "not-started" } }), codes: ["loop-unknown-key"], names: "status", check: (node) => assert.equal("status" in node.fields, false) },
  { vocabulary: "admitted key", token: "depends: [51]", expected: "loop-unknown-key", severity: "error", file: "vk-depends.md", spec: loopRecord({ fields: { depends: "[51]" } }), codes: ["loop-unknown-key"], names: "depends" },
  { vocabulary: "admitted key", token: "Kind: loop", expected: "loop-unknown-key", severity: "error", file: "vk-capital-kind.md", spec: loopRecord({ extraLines: ["Kind: loop"] }), codes: ["loop-unknown-key"], names: "Kind" },
  { vocabulary: "edge key", token: "feedback: [loop:x]", expected: "loop-unknown-key", severity: "error", file: "vk-feedback.md", spec: loopRecord({ fields: { feedback: "[loop:x]" } }), codes: ["loop-unknown-key"], names: "feedback" },
  { vocabulary: "edge key", token: "veto-constraint: [loop:x]", expected: "loop-unknown-key", severity: "error", file: "vk-veto-constraint.md", spec: loopRecord({ fields: { "veto-constraint": "[loop:x]" } }), codes: ["loop-unknown-key"], names: "veto-constraint" },
  { vocabulary: "kind-scoped key", token: "ground: exogenous (on kind: loop)", expected: "loop-key-not-admitted-for-kind", severity: "error", file: "vk-ground-on-loop.md", spec: loopRecord({ fields: { ground: "exogenous" } }), codes: ["loop-key-not-admitted-for-kind"], names: "ground", check: (node) => assert.equal("ground" in node.fields, false) },
  { vocabulary: "kind-scoped key", token: "controlled: run state (on kind: actor)", expected: "loop-key-not-admitted-for-kind", severity: "error", file: "vk-controlled-on-actor.md", spec: actorRecord({ fields: { controlled: "run state" } }), codes: ["loop-key-not-admitted-for-kind"], names: "controlled" },
  { vocabulary: "kind-scoped key", token: "cadence: periodic:15s (on kind: actor)", expected: "loop-key-not-admitted-for-kind", severity: "error", file: "vk-cadence-on-actor.md", spec: actorRecord({ fields: { cadence: "periodic:15s" } }), codes: ["loop-key-not-admitted-for-kind"], names: "cadence", check: (node) => assert.equal("cadence" in node.fields, false) },
  { vocabulary: "kind-scoped key", token: "optimizing: true (on kind: actor)", expected: "loop-key-not-admitted-for-kind", severity: "error", file: "vk-optimizing-on-actor.md", spec: actorRecord({ fields: { optimizing: "true" } }), codes: ["loop-key-not-admitted-for-kind"], names: "optimizing" },
  { vocabulary: "kind-scoped key", token: "monitoring: [loop:x] (on kind: actor)", expected: null, severity: "—", file: "vk-monitoring-on-actor.md", spec: actorRecord({ fields: { monitoring: "[loop:x]" } }), codes: [], absentKey: "monitoring" },
  { vocabulary: "kind-scoped key", token: "ground: exogenous (kind unreadable)", expected: null, severity: "—", file: "vk-ground-kindless.md", spec: identityRecord({ kind: "sensor", fields: { ground: "exogenous" } }), codes: ["loop-bad-value"], absentKey: "ground" },
  { vocabulary: "frontmatter line", token: "veto/constraint: [loop:x]", expected: "loop-malformed-frontmatter-line", severity: "error", file: "vk-slash-line.md", spec: loopRecord({ extraLines: ["veto/constraint: [loop:x]"] }), codes: ["loop-malformed-frontmatter-line"], names: "veto/constraint: [loop:x]" },
  { vocabulary: "frontmatter line", token: "target setting: [loop:x]", expected: "loop-malformed-frontmatter-line", severity: "error", file: "vk-space-line.md", spec: loopRecord({ extraLines: ["target setting: [loop:x]"] }), codes: ["loop-malformed-frontmatter-line"], names: "target setting: [loop:x]" },
  { vocabulary: "frontmatter line", token: "owner actor:product-owner", expected: "loop-malformed-frontmatter-line", severity: "error", file: "vk-colonless-line.md", spec: loopRecord({ extraLines: ["owner actor:product-owner"] }), codes: ["loop-malformed-frontmatter-line"], names: "owner actor:product-owner" },
  { vocabulary: "frontmatter line", token: "# evidence: RESEARCH §Q1.5", expected: null, severity: "—", file: "vk-comment-line.md", spec: loopRecord({ extraLines: ["# evidence: RESEARCH §Q1.5"] }), codes: [] },
  { vocabulary: "frontmatter line", token: "(a blank line)", expected: null, severity: "—", file: "vk-blank-line.md", spec: loopRecord({ extraLines: [""] }), codes: [] },
  { vocabulary: "frontmatter line", token: '"  - module:a.mjs#b" (indented)', expected: null, severity: "—", file: "vk-indented-dash.md", spec: loopRecord({ extraLines: ["  - module:a.mjs#b"] }), codes: [] },
  { vocabulary: "frontmatter line", token: '"  veto: [loop:x]" (indented)', expected: null, severity: "—", file: "vk-indented-key.md", spec: loopRecord({ extraLines: ["  veto: [loop:x]"] }), codes: [], absentKey: "veto" },
  { vocabulary: "frontmatter line", token: '"- loop:x" (top-level, leading -)', expected: null, severity: "—", file: "vk-leading-dash.md", spec: loopRecord({ extraLines: ["- loop:x"] }), codes: [] },
  { vocabulary: "node kind", token: "kind: sensor", expected: "loop-bad-value", severity: "error", file: "vk-kind-sensor.md", spec: loopRecord({ kind: "sensor" }), codes: ["loop-bad-value"], names: "kind" },
  { vocabulary: "node kind", token: "kind: Loop", expected: "loop-bad-value", severity: "error", file: "vk-kind-capital.md", spec: loopRecord({ kind: "Loop" }), codes: ["loop-bad-value"], names: "kind" },
  { vocabulary: "pointer scheme", token: "reference: [doc:src/x.md]", expected: "loop-bad-value", severity: "error", file: "vk-doc-pointer.md", spec: loopRecord({ fields: { reference: "[doc:src/x.md]" } }), codes: ["loop-bad-value"], names: "reference" },
  { vocabulary: "pointer scheme", token: "reference: [file:src/x.mjs#y]", expected: "loop-bad-value", severity: "error", file: "vk-file-pointer.md", spec: loopRecord({ fields: { reference: "[file:src/x.mjs#y]" } }), codes: ["loop-bad-value"], names: "reference" },
  { vocabulary: "endpoint scheme", token: "data-feed: [node:autonomous-cascade]", expected: "loop-bad-value", severity: "error", file: "vk-node-endpoint.md", spec: loopRecord({ fields: { "data-feed": "[node:autonomous-cascade]" } }), codes: ["loop-bad-value"], names: "data-feed" },
  { vocabulary: "sentinel", token: "ceiling: tbd", expected: "loop-bad-value", severity: "error", file: "vk-ceiling-tbd.md", spec: loopRecord({ fields: { ceiling: "tbd" } }), codes: ["loop-bad-value"], names: "ceiling" },
  { vocabulary: "sentinel", token: "owner: uncapped", expected: "loop-bad-value", severity: "error", file: "vk-owner-uncapped.md", spec: loopRecord({ fields: { owner: "uncapped" } }), codes: ["loop-bad-value"], names: "owner" },
  { vocabulary: "cadence kind", token: "cadence: hourly", expected: "loop-bad-value", severity: "error", file: "vk-cadence-hourly.md", spec: loopRecord({ fields: { cadence: "hourly" } }), codes: ["loop-bad-value"], names: "cadence" },
  { vocabulary: "cadence kind", token: "cadence: uncapped", expected: "loop-bad-value", severity: "error", file: "vk-cadence-uncapped.md", spec: loopRecord({ fields: { cadence: "uncapped" } }), codes: ["loop-bad-value"], names: "cadence" },
  { vocabulary: "duration unit", token: "cadence: periodic:2w", expected: "loop-bad-value", severity: "error", file: "vk-cadence-2w.md", spec: loopRecord({ fields: { cadence: "periodic:2w" } }), codes: ["loop-bad-value"], names: "cadence" },
  { vocabulary: "event trigger", token: "cadence: event:per-sprint", expected: "loop-bad-value", severity: "error", file: "vk-cadence-sprint.md", spec: loopRecord({ fields: { cadence: "event:per-sprint" } }), codes: ["loop-bad-value"], names: "cadence" },
  { vocabulary: "ground class", token: "ground: measured", expected: "loop-bad-value", severity: "error", file: "vk-ground-measured.md", spec: actorRecord({ fields: { ground: "measured" } }), codes: ["loop-bad-value"], names: "ground" },
];

// `04_schema-and-honesty-findings` Examples 1 — record content -> code x severity (25 rows).
// This is the code→condition mapping's HOME for 52/05: written three times across the
// milestone's features, decided once, here.
const RECORD_CONTENT_CASES = [
  { content: 'prose with no "---" block', code: "loop-record-unparseable", severity: "error", file: "rc-unparseable.md", spec: "Prose, and no frontmatter block.\n", codes: ["loop-record-unparseable"] },
  { content: 'kind: loop with no "owner" key', code: "loop-missing-field", severity: "error", file: "rc-missing-owner.md", spec: loopRecord({ fields: { owner: null } }), codes: ["loop-missing-field"] },
  { content: 'kind: loop with no "title" key', code: "loop-missing-field", severity: "error", file: "rc-missing-title.md", spec: loopRecord({ title: null }), codes: ["loop-missing-field"] },
  { content: "kind: sensor", code: "loop-bad-value", severity: "error", file: "rc-kind-sensor.md", spec: loopRecord({ kind: "sensor" }), codes: ["loop-bad-value"] },
  { content: "cadence: event:per-sprint", code: "loop-bad-value", severity: "error", file: "rc-cadence-sprint.md", spec: loopRecord({ fields: { cadence: "event:per-sprint" } }), codes: ["loop-bad-value"] },
  { content: "reference: module:src/run-store.mjs#isRetryable", code: "loop-expected-list", severity: "error", file: "rc-scalar-reference.md", spec: loopRecord({ fields: { reference: "module:src/run-store.mjs#isRetryable" } }), codes: ["loop-expected-list"] },
  { content: "controlled: [run state, attempt count]", code: "loop-expected-scalar", severity: "error", file: "rc-list-controlled.md", spec: loopRecord({ fields: { controlled: "[run state, attempt count]" } }), codes: ["loop-expected-scalar"] },
  { content: "reference: []", code: "loop-empty-list", severity: "error", file: "rc-empty-reference.md", spec: loopRecord({ fields: { reference: "[]" } }), codes: ["loop-empty-list"] },
  { content: "monitoring: []", code: "loop-empty-list", severity: "error", file: "rc-empty-monitoring.md", spec: loopRecord({ fields: { monitoring: "[]" } }), codes: ["loop-empty-list"] },
  { content: "status: not-started", code: "loop-unknown-key", severity: "error", file: "rc-unknown-key.md", spec: loopRecord({ fields: { status: "not-started" } }), codes: ["loop-unknown-key"] },
  { content: "ground: exogenous (on a kind: loop record)", code: "loop-key-not-admitted-for-kind", severity: "error", file: "rc-ground-on-loop.md", spec: loopRecord({ fields: { ground: "exogenous" } }), codes: ["loop-key-not-admitted-for-kind"] },
  { content: "cadence: periodic:15s (on a kind: actor record)", code: "loop-key-not-admitted-for-kind", severity: "error", file: "rc-cadence-on-actor.md", spec: actorRecord({ fields: { cadence: "periodic:15s" } }), codes: ["loop-key-not-admitted-for-kind"] },
  { content: "veto/constraint: [loop:autonomous-cascade]", code: "loop-malformed-frontmatter-line", severity: "error", file: "rc-malformed-line.md", spec: loopRecord({ extraLines: ["veto/constraint: [loop:autonomous-cascade]"] }), codes: ["loop-malformed-frontmatter-line"] },
  { content: 'an indented "  - module:a.mjs#b" continuation line', code: null, severity: "—", file: "rc-continuation.md", spec: loopRecord({ after: { reference: ["  - module:a.mjs#b"] } }), codes: [] },
  { content: "id: loop:other (in run-resilience.md)", code: "loop-id-mismatch", severity: "error", file: "run-resilience.md", spec: loopRecord({ id: "loop:other" }), codes: ["loop-id-mismatch"] },
  { content: "data-feed: [loop:ghost] with no declaring record", code: "loop-graph-dangling-endpoint", severity: "error", file: "rc-dangling.md", spec: loopRecord({ fields: { "data-feed": "[loop:ghost]" } }), codes: ["loop-graph-dangling-endpoint"] },
  { content: "owner: unknown", code: "loop-owner-unknown", severity: "warn", file: "rc-owner-unknown.md", spec: loopRecord({ fields: { owner: "unknown" } }), codes: ["loop-owner-unknown"] },
  { content: "cadence: unknown", code: "loop-cadence-unknown", severity: "warn", file: "rc-cadence-unknown.md", spec: loopRecord({ fields: { cadence: "unknown" } }), codes: ["loop-cadence-unknown"] },
  { content: "ceiling: unknown", code: "loop-ceiling-unknown", severity: "warn", file: "rc-ceiling-unknown.md", spec: loopRecord({ fields: { ceiling: "unknown" } }), codes: ["loop-ceiling-unknown"] },
  { content: "ceiling: uncapped", code: "loop-ceiling-uncapped", severity: "warn", file: "rc-ceiling-uncapped.md", spec: loopRecord({ fields: { ceiling: "uncapped" } }), codes: ["loop-ceiling-uncapped"] },
  { content: "measurement: [prose:src/bundle/commands/continue.md]", code: "loop-field-prose-only", severity: "warn", file: "rc-prose-measurement.md", spec: loopRecord({ fields: { measurement: "[prose:src/bundle/commands/continue.md]" } }), codes: ["loop-field-prose-only"] },
  { content: "owner: actor:product-owner", code: null, severity: "—", file: "rc-owner-filled.md", spec: loopRecord(), codes: [] },
  { content: "ceiling: none", code: null, severity: "—", file: "rc-ceiling-none.md", spec: loopRecord({ fields: { ceiling: "none" } }), codes: [] },
  { content: "data-feed: [item:52/00]", code: null, severity: "—", file: "rc-item-endpoint.md", spec: loopRecord({ fields: { "data-feed": "[item:52/00]" } }), codes: [] },
  { content: "reference: [module:src/does-not-exist.mjs#nope]", code: null, severity: "—", file: "rc-absent-module.md", spec: loopRecord({ fields: { reference: "[module:src/does-not-exist.mjs#nope]" } }), codes: [] },
];

// `04_schema-and-honesty-findings` Examples 2 (and this task's own ladder) — one authored key,
// the gate it fails, the ONE finding, and the finding a reader might expect beside it. FF-5203
// pins the codes per record; this suite decides the NEGATIVE half — that the gates behind the
// failing one were never reached.
const PRECEDENCE_LADDER_CASES = [
  { key: "status: []", gate: "1 admitted at all", one: "loop-unknown-key", never: ["loop-expected-list", "loop-empty-list"], severity: "error", file: "ladder-unknown-key.md", spec: loopRecord({ fields: { status: "[]" } }) },
  { key: "ground: [] (on a kind: loop record)", gate: "2 admitted for this kind", one: "loop-key-not-admitted-for-kind", never: ["loop-expected-scalar", "loop-empty-list"], severity: "error", file: "ladder-kind-empty.md", spec: loopRecord({ fields: { ground: "[]" } }) },
  { key: "ground: measured (on a kind: loop record)", gate: "2 admitted for this kind", one: "loop-key-not-admitted-for-kind", never: ["loop-bad-value"], severity: "error", file: "ladder-kind-value.md", spec: loopRecord({ fields: { ground: "measured" } }) },
  { key: "controlled: []", gate: "3 shape", one: "loop-expected-scalar", never: ["loop-empty-list"], severity: "error", file: "ladder-shape-scalar.md", spec: loopRecord({ fields: { controlled: "[]" } }) },
  { key: "reference: module:a.mjs#b", gate: "3 shape", one: "loop-expected-list", never: ["loop-bad-value"], severity: "error", file: "ladder-shape-list.md", spec: loopRecord({ fields: { reference: "module:a.mjs#b" } }) },
  { key: "reference: []", gate: "4 non-empty", one: "loop-empty-list", never: ["loop-bad-value"], severity: "error", file: "ladder-empty-field.md", spec: loopRecord({ fields: { reference: "[]" } }) },
  { key: "monitoring: []", gate: "4 non-empty", one: "loop-empty-list", never: ["loop-graph-dangling-endpoint"], severity: "error", file: "ladder-empty-edge.md", spec: loopRecord({ fields: { monitoring: "[]" } }) },
  { key: "cadence: hourly", gate: "5 grammar", one: "loop-bad-value", never: [], severity: "error", file: "ladder-grammar.md", spec: loopRecord({ fields: { cadence: "hourly" } }) },
  { key: "ceiling: unknown", gate: "(every gate passes)", one: "loop-ceiling-unknown", never: [], severity: "warn", file: "ladder-honesty.md", spec: loopRecord({ fields: { ceiling: "unknown" } }) },
];

// `04_schema-and-honesty-findings` Examples 0 — the total order, rank by rank (4 rows). Each
// row's `decide` runs over the ONE fixture below, whose two malformed-line-bearing nodes are
// the discriminator FF-5209's single-node fixture cannot carry.
const TOTAL_ORDER_FILES = registry({
  "README.md": "Prose, no frontmatter block.\n",
  "draft.md": loopRecord({ leadingBlank: true }),
  // Line numbers are file lines: the block's first line is file line 2. So "target setting"
  // lands on line 4, "controlled" on 5, "veto/constraint" on 6 and "cadence" on 7 — exactly
  // the fixture `04_schema-and-honesty-findings:157` describes.
  "a-loop.md": {
    lines: [
      "id: loop:a-loop", "kind: loop", "target setting: [loop:x]", "controlled: [a, b]",
      "veto/constraint: [loop:y]", "cadence: hourly", "title: A loop",
      "reference: [module:src/run-store.mjs#isRetryable]",
      "measurement: [module:src/run-store.mjs#attempts]", "actuator: [command:work:next]",
      "ceiling: none", "owner: actor:product-owner", "optimizing: false",
    ],
  },
  // AUTHORED order and SCHEMA key order disagree here on purpose — optimizing (rank 10) is
  // written first, controlled (rank 3) last — so rank 3 decides the rule instead of agreeing
  // with the file by accident. "bad:one"/"bad:two" carry the within-key entry order.
  "z-loop.md": {
    lines: [
      "id: loop:z-loop", "kind: loop", "title: Z loop", "owner actor:product-owner",
      "optimizing: yes", "reference: [bad:one, bad:two]", "controlled: [a, b]",
      "measurement: [module:src/run-store.mjs#attempts]", "actuator: [command:work:next]",
      "cadence: event:per-item", "ceiling: none", "owner: actor:product-owner",
    ],
  },
});

const TOTAL_ORDER_RANK_CASES = [
  {
    rank: "1",
    emitted: 'every "loop-record-unparseable" in the load',
    within: "path, code unit by code unit",
    decide: (model, fixture) => {
      const unparseable = model.findings.filter((finding) => finding.code === "loop-record-unparseable");
      assert.equal(unparseable.length, 2);
      assert.deepEqual(model.findings.slice(0, 2), unparseable, "the unparseable lane leads the whole load");
      assert.deepEqual(unparseable.map((finding) => finding.path), [fixture.pathOf("README.md"), fixture.pathOf("draft.md")]);
      assert.ok(unparseable[0].path < unparseable[1].path, "ordered by path, code unit by code unit");
    },
  },
  {
    rank: "2",
    emitted: "then per node in id order — that node's malformed-line findings",
    within: "line number, ascending",
    decide: (model, fixture) => {
      const aLoop = findingsFor(model, fixture.pathOf("a-loop.md"));
      const zLoop = findingsFor(model, fixture.pathOf("z-loop.md"));
      assert.deepEqual(aLoop.slice(0, 2).map((finding) => finding.message), [
        "Malformed frontmatter line 4: target setting: [loop:x]",
        "Malformed frontmatter line 6: veto/constraint: [loop:y]",
      ], "by line number, ascending, and ahead of every key-bearing finding of that node");
      assert.deepEqual(aLoop.slice(2).map((finding) => finding.code), ["loop-expected-scalar", "loop-bad-value"]);
      // The line-6 finding still precedes the "controlled" finding whose key was declared on
      // line 5 — line order governs WITHIN the malformed block, never across it.
      assert.equal(aLoop[1].message.includes("line 6"), true);
      assert.equal(aLoop[2].message.includes("controlled"), true);
      // THE DISCRIMINATOR FF-5209's SINGLE-NODE FIXTURE CANNOT CARRY: z-loop's malformed line
      // stays inside z-loop's own block, behind a-loop's key-bearing findings — a loader that
      // hoisted every malformed finding to the front of the lane would pass a one-node oracle.
      assert.equal(zLoop[0].code, "loop-malformed-frontmatter-line");
      assert.ok(indexOfPath(model, fixture.pathOf("z-loop.md")) > model.findings.indexOf(aLoop.at(-1)),
        "node blocks follow id order — loop:a-loop's whole block precedes loop:z-loop's");
    },
  },
  {
    rank: "3",
    emitted: "then that same node's key-bearing findings",
    within: "schema key order, then declared-entry order within a key",
    decide: (model, fixture) => {
      const zLoop = findingsFor(model, fixture.pathOf("z-loop.md")).slice(1);
      assert.deepEqual(zLoop.map((finding) => finding.message), [
        "controlled must be a scalar",
        "Invalid value for reference: bad:one",
        "Invalid value for reference: bad:two",
        "Invalid value for optimizing: yes",
      ], "schema key order (controlled, reference, optimizing) over the authored order (optimizing, reference, controlled), then declared-entry order within `reference`");
    },
  },
  {
    rank: "—",
    emitted: "the five structural checks' findings",
    within: "not this lane — the command composes them after it",
    decide: (model) => {
      assert.ok(model.findings.length > 0, "the lane fired, so the exclusion below is not vacuous");
      for (const finding of model.findings) {
        assert.equal(CHECK_LANE_CODES.includes(finding.code), false, `${finding.code} belongs to the checks lane, which a load never composes`);
      }
    },
  },
];

// ————— milestone 58 / story 00 — THE FIFTH KIND ——————————————————————————————————————
//
// Homed HERE, in the loader's own record suite, rather than in a new sibling: 58/00's subject IS
// the loader's parse shapes (58/ADR-007 §3 assigns this file to 58/00 for exactly that reason),
// and a second "arbiter-node" suite would be a fourth place a reader has to look for what a record
// may say. These cases carry their own tables and are deliberately NOT added to `coverage`, which
// is milestone 52's ledger over milestone 52's features and is bound row-for-row by
// `test/loop/work-loops-coverage-ledger.test.mjs`.
//
// Contracts: `wiki/work/58_milestone_supervising-loops/stories/00_story_the-supervision-vocabulary/
// tasks/00_a-fifth-kind.feature` and `…/02_an-arbiter-cannot-act.feature`. ADR-003 §1/§2/§3/§6.

const renderFields58 = (stem, fields) =>
  `---\n${Object.entries(fields)
    .filter(([, value]) => value !== null)
    .map(([key, value]) => `${key}: ${value}\n`)
    .join("")}---\n# ${stem}\n`;

/** A complete, finding-free `kind: arbiter` record. Every line is authored, as everywhere here. */
function arbiterRecord58(stem, overrides = {}) {
  return renderFields58(stem, {
    id: `arbiter:${stem}`,
    kind: "arbiter",
    title: stem,
    resolves: "which loop wins the shared agent",
    // The entries of `priority` are a FIELD, not an edge, so naming loops no record declares
    // raises nothing — "no finding is raised about which loops the order names" is the feature's
    // own line, and binding the order to the veto set is a later story's check.
    priority: "[loop:alpha, loop:beta]",
    dwell: "cycles:2",
    ...overrides,
  });
}

/** A complete `kind: watcher` record (57/ADR-001 §2) — the fourth kind, unchanged by this story. */
const watcherRecord58 = (stem, overrides = {}) => renderFields58(stem, {
  id: `watcher:${stem}`,
  kind: "watcher",
  title: stem,
  counter: "contract changes",
  determinism: "counter",
  measurement: "[module:src/work/loops.mjs#loadLoops]",
  ...overrides,
});

/** A complete `kind: anchor` record (55/ADR-001 §5) — the third kind, unchanged by this story. */
const anchorRecord58 = (stem, overrides = {}) => renderFields58(stem, {
  id: `anchor:${stem}`,
  kind: "anchor",
  title: stem,
  ground: "process-exit",
  observes: "module:src/work/loops.mjs#loadLoops",
  ...overrides,
});

/** One record of the named kind, complete for that kind, carrying `extra` as authored lines. */
function recordOfKind58(kind, stem, extra = {}) {
  if (kind === "loop") return renderRecord(loopRecord({ fields: extra }), stem);
  if (kind === "actor") return renderRecord(actorRecord({ fields: extra }), stem);
  if (kind === "anchor") return anchorRecord58(stem, extra);
  if (kind === "watcher") return watcherRecord58(stem, extra);
  if (kind === "arbiter") return arbiterRecord58(stem, extra);
  throw new Error(`recordOfKind58: ${kind} is not a declared kind`);
}

// `00_a-fifth-kind` Examples 0 — five literals, and nothing else, including the near-miss
// spellings. The three refusals are the words a reader reaches for FIRST, which is what makes them
// worth a row: a vocabulary that admitted `arbitrator` would be a vocabulary decided by whoever
// typed the record.
const KIND_VOCABULARY_58_CASES = [
  { kind: "loop", parses: true },
  { kind: "actor", parses: true },
  { kind: "anchor", parses: true },
  { kind: "watcher", parses: true },
  { kind: "arbiter", parses: true },
  { kind: "arbitrator", parses: false },
  { kind: "referee", parses: false },
  { kind: "supervisor", parses: false },
];

// `00_a-fifth-kind` Examples 1 — the three new keys land on ONE kind only, and every kind keeps
// what it already had. `admits` means the key reaches the model with no admission finding.
const KIND_KEY_ADMISSION_58_CASES = [
  { kind: "loop", key: "actuator", value: "[command:work:next]", admits: true },
  { kind: "loop", key: "cadence", value: "event:per-item", admits: true },
  { kind: "loop", key: "ceiling", value: "none", admits: true },
  { kind: "actor", key: "ground", value: "exogenous", admits: true },
  { kind: "anchor", key: "observes", value: "module:src/work/loops.mjs#loadLoops", admits: true },
  { kind: "watcher", key: "counter", value: "contract changes", admits: true },
  { kind: "watcher", key: "determinism", value: "counter", admits: true },
  { kind: "arbiter", key: "resolves", value: "which loop wins the shared agent", admits: true },
  { kind: "arbiter", key: "priority", value: "[loop:alpha]", admits: true },
  { kind: "arbiter", key: "dwell", value: "cycles:2", admits: true },
  { kind: "arbiter", key: "veto", value: "[loop:alpha]", admits: true, edge: true },
  { kind: "loop", key: "resolves", value: "which loop wins the shared agent", admits: false },
  { kind: "actor", key: "dwell", value: "cycles:2", admits: false },
  { kind: "anchor", key: "priority", value: "[loop:alpha]", admits: false },
  { kind: "watcher", key: "resolves", value: "which loop wins the shared agent", admits: false },
  { kind: "arbiter", key: "observes", value: "module:src/work/loops.mjs#loadLoops", admits: false },
  { kind: "arbiter", key: "determinism", value: "counter", admits: false },
];

// `02_an-arbiter-cannot-act` Examples 0 — the four keys by which a node acts, measures, cycles or
// grounds itself, across every declared kind. The restriction is PER KIND rather than global: a
// loop keeps all three of the first, an actor and an anchor keep their ground, and one kind admits
// none of them.
const FOUR_KEYS_BY_KIND_58_CASES = [
  { key: "actuator", kind: "loop", admits: true, value: "[command:work:next]" },
  { key: "actuator", kind: "actor", admits: false, value: "[command:work:next]" },
  { key: "actuator", kind: "anchor", admits: false, value: "[command:work:next]" },
  { key: "actuator", kind: "watcher", admits: false, value: "[command:work:next]" },
  { key: "actuator", kind: "arbiter", admits: false, value: "[command:work:next]" },
  { key: "measurement", kind: "loop", admits: true, value: "[module:src/work/loops.mjs#loadLoops]" },
  { key: "measurement", kind: "actor", admits: false, value: "[module:src/work/loops.mjs#loadLoops]" },
  { key: "measurement", kind: "anchor", admits: false, value: "[module:src/work/loops.mjs#loadLoops]" },
  { key: "measurement", kind: "watcher", admits: true, value: "[module:src/work/loops.mjs#loadLoops]" },
  { key: "measurement", kind: "arbiter", admits: false, value: "[module:src/work/loops.mjs#loadLoops]" },
  { key: "cadence", kind: "loop", admits: true, value: "event:per-item" },
  { key: "cadence", kind: "actor", admits: false, value: "event:per-item" },
  { key: "cadence", kind: "anchor", admits: false, value: "event:per-item" },
  { key: "cadence", kind: "watcher", admits: false, value: "event:per-item" },
  { key: "cadence", kind: "arbiter", admits: false, value: "event:per-item" },
  { key: "ground", kind: "loop", admits: false, value: "exogenous" },
  { key: "ground", kind: "actor", admits: true, value: "exogenous" },
  { key: "ground", kind: "anchor", admits: true, value: "exogenous" },
  { key: "ground", kind: "watcher", admits: false, value: "exogenous" },
  { key: "ground", kind: "arbiter", admits: false, value: "exogenous" },
];

const REPO_ROOT_58 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TASKS_58 = "wiki/work/58_milestone_supervising-loops/stories/00_story_the-supervision-vocabulary/tasks";
const FIFTH_KIND_FEATURE_58 = `${TASKS_58}/00_a-fifth-kind.feature`;
const CANNOT_ACT_FEATURE_58 = `${TASKS_58}/02_an-arbiter-cannot-act.feature`;

/** Each 58 table, bound to the Examples block it mechanises — by row count AND by column names. */
const TRACED_58_TABLES = [
  {
    feature: FIFTH_KIND_FEATURE_58,
    tables: [
      { header: ["kind", "outcome"], cases: KIND_VOCABULARY_58_CASES },
      { header: ["kind", "key", "outcome"], cases: KIND_KEY_ADMISSION_58_CASES },
    ],
  },
  {
    feature: CANNOT_ACT_FEATURE_58,
    tables: [
      { header: ["key", "kind", "outcome"], cases: FOUR_KEYS_BY_KIND_58_CASES },
    ],
  },
];

// ————— milestone 59 / story 00 — THE SIXTH KIND ——————————————————————————————————————
//
// Homed HERE for 58's reason, unchanged: 59/00's subject IS the loader's parse shapes, and a
// separate "auditor-node" suite would be a fifth place a reader has to look for what a record may
// say. `test/loop/work-loops-record.test.mjs` is 59/00's declared file for exactly that (59/ADR-008 §2).
// These cases carry their own tables and are deliberately NOT added to `coverage`, which is
// milestone 52's ledger over milestone 52's features.
//
// Contracts: `wiki/work/59_milestone_audit-loops/stories/00_story_the-auditor-kind/tasks/
// {00_a-sixth-kind,01_what-an-auditor-must-declare,02_an-auditor-cannot-act,
// 03_the-report-is-an-edge-and-nothing-points-back}.feature`. ADR-001 §1/§2/§3/§4.

/**
 * A complete, finding-free `kind: auditor` record. `escalation` names `actor:steward`, the actor
 * `registry()`'s Background puts in every fixture, so the default record's bypass names a node that
 * is really there rather than one the reader has to take on trust.
 */
const auditorRecord59 = (stem, overrides = {}) => renderFields58(stem, {
  id: `auditor:${stem}`,
  kind: "auditor",
  title: stem,
  audits: "[module:src/work/loops-checks.mjs#checkGrounding]",
  measurement: "[command:work:doctor]",
  cadence: "event:per-milestone",
  escalation: "actor:steward",
  ...overrides,
});

/** One record of the named kind, complete for that kind — 58's six, plus 59's auditor. */
function recordOfKind59(kind, stem, extra = {}) {
  return kind === "auditor" ? auditorRecord59(stem, extra) : recordOfKind58(kind, stem, extra);
}

// `01_what-an-auditor-must-declare` Examples 0 — each required key, and its absence named (4 rows).
// Each closes a specific way the audit could quietly become something else: what it reads, how it
// reads it, that it is a CYCLE, and the actor it can reach when the ordinary channel is what failed.
const AUDITOR_REQUIRED_59_CASES = [
  { key: "audits" },
  { key: "measurement" },
  { key: "cadence" },
  { key: "escalation" },
];

// `01_what-an-auditor-must-declare` Examples 1 — an instrument pointer against the schemes the
// registry already knows (8 rows). The six accepted forms are all authored ALONGSIDE the record
// that declares them, so "a declared loop id" is declared in the fixture and not merely spelled
// like one; the two refusals are the two ways a subject stops being an instrument.
const AUDITS_POINTER_59_CASES = [
  { pointer: "a module path", raw: "module:src/work/loops-checks.mjs#checkGrounding", accepted: true, kind: "pointer" },
  { pointer: "a registered command", raw: "command:work:doctor", accepted: true, kind: "pointer" },
  { pointer: "a config key", raw: "config:work.audit.anchorStaleDays", accepted: true, kind: "pointer" },
  { pointer: "a declared loop id", raw: "loop:alpha", accepted: true, kind: "ref" },
  { pointer: "a declared watcher id", raw: "watcher:sentry", accepted: true, kind: "ref" },
  { pointer: "a declared anchor id", raw: "anchor:gauge", accepted: true, kind: "ref" },
  { pointer: "a work item reference", raw: "item:59/00", accepted: false },
  { pointer: "a scheme no record has declared", raw: "instrument:the-gates", accepted: false },
];

// `02_an-auditor-cannot-act` Examples 0 — the ten keys the kind omits (10 rows). Every one is a
// specific way the audit could stop being independent, and every one is refused by the loader's
// EXISTING `loop-key-not-admitted-for-kind`: ADR-001 §2 adds no finding code for any of them.
const AUDITOR_OMITS_59_CASES = [
  { key: "actuator", value: "[command:work:next]" },
  { key: "optimizing", value: "false" },
  { key: "controlled", value: "the gates" },
  { key: "reference", value: "[module:src/work/loops.mjs#loadLoops]" },
  { key: "ground", value: "exogenous" },
  { key: "counter", value: "contract changes" },
  { key: "determinism", value: "counter" },
  { key: "layer", value: "operational" },
  { key: "owner", value: "actor:product-owner" },
  { key: "ceiling", value: "none" },
];

// The seventeen codes a load could emit BEFORE this milestone. 59 adds none — its every refusal is
// one of these — so the array is stated here as a literal and deep-equalled against the loader's own
// export, which is what makes "no finding code that did not exist before this milestone" decidable
// rather than a promise about the cases somebody happened to write.
const PRE_59_LOADER_CODES = Object.freeze([
  "loop-record-unparseable", "loop-missing-field", "loop-bad-value", "loop-expected-list",
  "loop-expected-scalar", "loop-empty-list", "loop-unknown-key", "loop-key-not-admitted-for-kind",
  "loop-malformed-frontmatter-line", "loop-id-mismatch", "loop-graph-dangling-endpoint",
  "loop-owner-unknown", "loop-cadence-unknown", "loop-ceiling-unknown", "loop-ceiling-uncapped",
  "loop-ceiling-pointer-unresolved", "loop-field-prose-only",
]);

const TASKS_59 = "wiki/work/59_milestone_audit-loops/stories/00_story_the-auditor-kind/tasks";
const MUST_DECLARE_FEATURE_59 = `${TASKS_59}/01_what-an-auditor-must-declare.feature`;
const CANNOT_ACT_FEATURE_59 = `${TASKS_59}/02_an-auditor-cannot-act.feature`;

/** Each 59 table, bound to the Examples block it mechanises — by row count AND by column names. */
const TRACED_59_TABLES = [
  {
    feature: MUST_DECLARE_FEATURE_59,
    tables: [
      { header: ["key"], cases: AUDITOR_REQUIRED_59_CASES },
      { header: ["pointer", "verdict"], cases: AUDITS_POINTER_59_CASES },
    ],
  },
  {
    feature: CANNOT_ACT_FEATURE_59,
    tables: [
      { header: ["key"], cases: AUDITOR_OMITS_59_CASES },
    ],
  },
];

// ————— the suite ——————————————————————————————————————————————————————————————————
export const workLoopsRecordTests = [
  {
    name: "loops-record/01 an absent registry and an empty one differ in `present` alone",
    run: async () => {
      await withoutLoopRegistry(async (fixture) => {
        const absent = await loadLoops(fixture.workDir);
        assert.equal(absent.present, false);
        assert.deepEqual(absent.nodes, []);
        assert.deepEqual(absent.findings, []);
        // `source` names the directory that WOULD hold the registry, raw and OS-native,
        // whether or not it exists. Compared against a JOIN and never against a literal
        // relative string — on Windows the latter is not even the same shape.
        assert.equal(absent.source, path.join(fixture.workDir, "loops"));
        assert.ok(path.isAbsolute(absent.source));
        assert.ok(absent.source.includes(path.sep), "in its on-disk OS-native form");

        await fixture.write({});
        const empty = await loadLoops(fixture.workDir);
        assert.equal(empty.present, true);
        assert.deepEqual(empty.nodes, []);
        assert.deepEqual(empty.findings, []);
        assert.equal(empty.source, absent.source, "source is still that same absolute path");
        // THE DISCRIMINATOR: one workspace, one source, and the two answers differ in exactly
        // one key. A loader that returned a constant — either constant — fails here.
        assert.deepEqual({ ...absent, present: true }, empty);
        assert.notDeepEqual(absent, empty);

        // ...and the pair is not vacuous: populated, the same directory answers again.
        await fixture.write(registry({ "run-resilience.md": loopRecord() }));
        const populated = await loadLoops(fixture.workDir);
        assert.equal(populated.present, true);
        assert.deepEqual(idsOf(populated), ["actor:steward", "loop:run-resilience"]);
        assert.deepEqual(populated.findings, []);
      });
    },
  },

  {
    name: "loops-record/01 the model is plain, round-trippable data with the frozen key set",
    run: async () => {
      await overRegistry(registry({
        "gapped.md": loopRecord({ fields: { owner: "unknown" } }),
        "broken.md": loopRecord({ fields: { status: "draft", monitoring: "[actor:steward]" } }),
      }), (model, fixture) => {
        assert.deepEqual(severitiesOf(model), ["error", "warn"], "findings of BOTH severities, so the shape claims are not made over an empty list");
        assert.deepEqual(Object.keys(model).sort(), ["findings", "nodes", "present", "source"]);
        // No map, no class, no live handle: the parse of the serialisation IS the model.
        assert.deepEqual(JSON.parse(JSON.stringify(model)), model);

        for (const node of model.nodes) {
          assert.deepEqual(Object.keys(node).sort(), ["edges", "fields", "id", "kind", "path", "title"]);
          for (const identity of ["id", "kind", "title"]) {
            assert.equal(identity in node.fields, false, `${identity} is a node-level scalar, never an entry of fields`);
          }
        }
        const broken = nodeFor(model, fixture.pathOf("broken.md"));
        assert.equal(broken.id, "loop:broken");
        assert.equal(broken.title, "broken");
        assert.deepEqual(Object.keys(broken.edges), ["monitoring"], "edges carries only the edge keys the record declared");
        const gapped = nodeFor(model, fixture.pathOf("gapped.md"));
        assert.deepEqual(Object.keys(gapped.edges), [], "an undeclared edge key is ABSENT — never present as an empty list");
      });
    },
  },

  {
    name: "loops-record/01 node order is code-unit lexicographic where a collation would disagree",
    run: async () => {
      const files = registry({
        "Zeta.md": loopRecord(),
        "runbook.md": loopRecord(),
        "run-store.md": loopRecord(),
      });
      const expected = ["actor:steward", "loop:Zeta", "loop:run-store", "loop:runbook"];
      await overRegistry(files, (model, fixture) => {
        assert.deepEqual(idsOf(model), expected);
        // THE CASE DECIDES THE RULE RATHER THAN RESTATING IT: a case-folding collation puts
        // "loop:Zeta" AFTER "loop:run-store", so the fixture can tell the two orders apart.
        assert.ok("loop:Zeta" < "loop:run-store", "code units: Z (0x5A) precedes r (0x72)");
        assert.ok("loop:Zeta".localeCompare("loop:run-store") > 0, "a collation folds the case and reverses them");
        assert.notDeepEqual([...idsOf(model)].sort((left, right) => left.localeCompare(right)), expected);
        // The punctuation leg is asserted as a code-unit FACT, since a collation may or may
        // not agree about "-": the case folding above is what carries the disagreement.
        assert.ok("loop:run-store" < "loop:runbook", 'code units: "-" (0x2D) precedes "b" (0x62)');

        const fresh = loadLoopsInFreshProcess(fixture.workDir, {
          expression: "model.nodes.map((node) => node.id)",
          // A different host locale/language declared to the child. The byte identity below
          // is the claim; the collation disagreement asserted above is what makes it bite.
          env: { LC_ALL: "tr_TR.UTF-8", LANG: "tr_TR.UTF-8", LC_COLLATE: "tr_TR.UTF-8" },
        });
        assert.equal(fresh.stdout, JSON.stringify(expected), "unchanged in a fresh process, under a different host locale");
      });
      // ...and it does not vary with the order the directory was WRITTEN. (readdir returns
      // names in name order whatever the creation order, so this pins creation/mtime
      // independence — it is not a shuffled directory read and does not claim to be one.)
      await overRegistry(registry(reversedFiles(files)), (model) => {
        assert.deepEqual(idsOf(model), expected);
      });
    },
  },

  {
    name: "loops-record/01 the directory walk takes the flat markdown files and nothing else",
    run: async () => {
      await overRegistry(registry({
        "run-resilience.md": loopRecord(),
        "notes.txt": "loop notes, and not a record at all\n",
        "archive/old-loop.md": loopRecord(),
      }), (model, fixture) => {
        // The scenario's "exactly one node" is asserted as the exact node SET — the
        // Background's actor is the other member. Strictly stronger than the count, and a
        // loader that read "notes.txt" or descended "archive/" still fails it.
        assert.deepEqual(idsOf(model), ["actor:steward", "loop:run-resilience"]);
        assert.deepEqual(model.findings, [], "no finding names either non-record");
        assert.equal(model.nodes.some((node) => node.id === "loop:old-loop"), false);
        assert.equal(model.nodes.some((node) => node.path.includes(`${path.sep}archive${path.sep}`)), false);
        assert.equal(JSON.stringify(model).includes("notes.txt"), false);
        assert.equal(JSON.stringify(model).includes("old-loop"), false);
        assert.equal(fixture.pathOf("archive/old-loop.md").includes("archive"), true, "the nested record really was materialised");
      });
    },
  },

  {
    name: "loops-record/01 an unparseable record costs its own node and no sibling's",
    run: async () => {
      const valid = () => loopRecord({ fields: { monitoring: "[actor:steward]" } });
      const control = await overRegistry(registry({ "run-resilience.md": valid() }), (model, fixture) => {
        const node = nodeFor(model, fixture.pathOf("run-resilience.md"));
        return { fields: node.fields, edges: node.edges };
      });
      await overRegistry(registry({
        "run-resilience.md": valid(),
        "README.md": "Prose, and no frontmatter block at all.\n",
        "draft.md": loopRecord({ leadingBlank: true }),
      }), (model, fixture) => {
        assert.deepEqual(codesFor(model, fixture.pathOf("README.md")), ["loop-record-unparseable"]);
        assert.deepEqual(codesFor(model, fixture.pathOf("draft.md")), ["loop-record-unparseable"]);
        assert.equal(model.findings.filter((finding) => finding.code === "loop-record-unparseable").length, 2);
        // Again the exact node set rather than the literal count (see the walk case above).
        assert.deepEqual(idsOf(model), ["actor:steward", "loop:run-resilience"]);
        assert.deepEqual(findingsFor(model, fixture.pathOf("run-resilience.md")), [], "no sibling pays for it");
        const node = nodeFor(model, fixture.pathOf("run-resilience.md"));
        assert.deepEqual({ fields: node.fields, edges: node.edges }, control, "the valid record's own fields and edges are unaffected");
      });
    },
  },

  {
    name: "loops-record/01 an unusable kind suspends the id's scheme leg and not its stem leg",
    run: async () => {
      await overRegistry(registry({
        "sensor.md": identityRecord({ id: "loop:sensor", kind: "sensor" }),
        "gauge.md": identityRecord({ id: "loop:guage", kind: "sensor" }),
      }), (model, fixture) => {
        // No readable kind for a SCHEME to disagree with — so the scheme leg is suspended...
        assert.deepEqual(codesFor(model, fixture.pathOf("sensor.md")), ["loop-bad-value"]);
        assert.deepEqual(messagesFor(model, fixture.pathOf("sensor.md")), ["Invalid value for kind: sensor"]);
        // ...while the STEM leg reads the filename, which needs no kind at all.
        assert.deepEqual(codesFor(model, fixture.pathOf("gauge.md")), ["loop-id-mismatch", "loop-bad-value"]);
        assert.ok(messagesFor(model, fixture.pathOf("gauge.md"))[0].includes("loop:guage"));
        for (const name of ["sensor.md", "gauge.md"]) {
          assert.equal(nodeFor(model, fixture.pathOf(name)).kind, null, "neither node carries a second finding raised by the unreadable kind itself");
        }
      });
    },
  },

  {
    name: "loops-record/01 a record whose kind is unusable is admitted against the union",
    run: async () => {
      await overRegistry(registry({
        "anchored.md": identityRecord({ kind: "sensor", fields: { ground: "exogenous", cadence: "periodic:15s", status: "draft" } }),
        "operator-typo.md": actorRecord({ kind: "sensor" }),
      }), (model, fixture) => {
        const anchored = fixture.pathOf("anchored.md");
        assert.deepEqual(codesFor(model, anchored), ["loop-bad-value", "loop-unknown-key"]);
        assert.deepEqual(messagesFor(model, anchored), ["Invalid value for kind: sensor", "Unknown loop-record key: status"]);
        const node = nodeFor(model, anchored);
        assert.equal(node.kind, null, "carried with kind null — never dropped, never defaulted to loop or actor");
        // Neither admitted key is reported: with no kind to scope admission, admission falls
        // back to the UNION, so both parse into fields instead of being reported on top of
        // the one slip.
        assert.equal(node.fields.ground.kind, "enum");
        assert.equal(node.fields.cadence.kind, "periodic");
        // ONE SLIP, ONE FINDING, NEVER SIX: the required-key sweep is kind-derived, so it is
        // suspended whole — this record declares no control key at all and reports none.
        assert.deepEqual(codesFor(model, fixture.pathOf("operator-typo.md")), ["loop-bad-value"]);
        assert.equal(nodeFor(model, fixture.pathOf("operator-typo.md")).kind, null);
        assert.equal(model.findings.some((finding) => finding.code === "loop-key-not-admitted-for-kind"), false);
        assert.equal(model.findings.some((finding) => finding.code === "loop-missing-field"), false);
      });
    },
  },

  {
    name: "loops-record/00 the top-level line scanner reports the dropped line once and invents no key",
    run: async () => {
      await overRegistry(registry({
        "a.md": loopRecord({
          fields: { reference: "" },
          after: { reference: ["  - module:src/run-store.mjs#isRetryable", "  - command:work:next"] },
          extraLines: ["veto/constraint: [loop:autonomous-cascade]"],
        }),
        "b.md": loopRecord({ fields: { "veto-constraint": "[loop:x]" } }),
      }), (model, fixture) => {
        const a = fixture.pathOf("a.md");
        const malformed = findingsFor(model, a).filter((finding) => finding.code === "loop-malformed-frontmatter-line");
        assert.equal(malformed.length, 1, "exactly one, for the TOP-LEVEL line — neither indented line is reported on its own");
        assert.ok(malformed[0].message.endsWith("veto/constraint: [loop:autonomous-cascade]"), "quoting the line");
        assert.deepEqual(codesFor(model, a), ["loop-malformed-frontmatter-line", "loop-expected-list"]);
        assert.equal(findingsFor(model, a).filter((finding) => finding.message.includes("reference")).length, 1, "exactly one finding for reference");

        const node = nodeFor(model, a);
        assert.equal("veto/constraint" in node.fields, false);
        assert.equal("veto" in node.edges, false, "no veto edge is invented from the dropped line");
        assert.equal(JSON.stringify(node).includes("loop:autonomous-cascade"), false);
        assert.equal(JSON.stringify(node).includes("isRetryable"), false, "no entry from the indented lines reaches the node");

        // A key that REACHED the model and a line that never became one are different facts.
        assert.deepEqual(codesFor(model, fixture.pathOf("b.md")), ["loop-unknown-key"]);
        assert.deepEqual(messagesFor(model, fixture.pathOf("b.md")), ["Unknown loop-record key: veto-constraint"]);
      });
    },
  },

  {
    name: "loops-record/00 the scanner's skip rules survive a fixture that would otherwise fail them",
    run: async () => {
      await overRegistry(registry({
        "escalation.md": loopRecord({ after: { controlled: ["", "# evidence: RESEARCH §Q1.5"] } }),
      }), async (model, fixture) => {
        // NON-VACUITY FIRST: a skip rule is only asserted by a fixture that CONTAINS the lines
        // it must skip, so the record is read back before anything is claimed about it.
        const text = await readFile(fixture.pathOf("escalation.md"), "utf8");
        assert.ok(text.includes("attempt count\n\n# evidence: RESEARCH §Q1.5\nreference:"), "a blank line and a # comment sit INSIDE the block, above a real key");
        assert.deepEqual(codesFor(model, fixture.pathOf("escalation.md")), []);
        assert.deepEqual(model.findings, []);
        const node = nodeFor(model, fixture.pathOf("escalation.md"));
        // The keys declared BELOW the comment still parse into fields — a scanner that swallowed
        // the rest of the block after a comment would leave these missing instead.
        assert.deepEqual(Object.keys(node.fields).sort(), ["actuator", "cadence", "ceiling", "controlled", "measurement", "optimizing", "owner", "reference"]);
      });
    },
  },

  {
    name: "loops-record/04 one authoring slip yields one finding, at the first gate it fails (table)",
    run: async () => {
      const files = registry(Object.fromEntries(PRECEDENCE_LADDER_CASES.map((row) => [row.file, row.spec])));
      await overRegistry(files, (model, fixture) => {
        for (const row of PRECEDENCE_LADDER_CASES) {
          const anchored = findingsFor(model, fixture.pathOf(row.file));
          assert.deepEqual(anchored.map((finding) => finding.code), [row.one], `${row.key} — gate ${row.gate}`);
          assert.equal(anchored[0].severity, row.severity, row.key);
          for (const never of row.never) {
            assert.equal(anchored.some((finding) => finding.code === never), false, `${row.key}: ${never} is the gate behind the failing one and is never reached`);
          }
          if (row.severity === "warn") {
            assert.equal(anchored.some((finding) => finding.severity === "error"), false, `${row.key}: every gate passes, so no error-severity finding stands beside the warn`);
          }
        }
        // "No key anywhere in the load carries two schema-lane findings", decided by the
        // proxy the fixture makes exact: every record authors exactly ONE slip, so the load's
        // error count is the number of rows that fail a gate — a second finding on any key
        // would push it up, whichever key it landed on.
        const errors = model.findings.filter((finding) => finding.severity === "error");
        assert.equal(errors.length, PRECEDENCE_LADDER_CASES.filter((row) => row.severity === "error").length);
      });
    },
  },

  {
    name: "loops-record/04 several independent slips on one record are reported independently",
    run: async () => {
      await overRegistry(registry({
        "many.md": loopRecord({
          fields: { controlled: "[a, b]", reference: "module:a.mjs#b", actuator: "[]", cadence: "hourly", owner: null, status: "draft" },
        }),
      }), (model, fixture) => {
        const anchored = findingsFor(model, fixture.pathOf("many.md"));
        assert.deepEqual(anchored.map((finding) => finding.code), [
          "loop-expected-scalar", "loop-expected-list", "loop-empty-list",
          "loop-bad-value", "loop-missing-field", "loop-unknown-key",
        ], "six findings, one per key — the load does not stop at the first violation");
        const keys = ["controlled", "reference", "actuator", "cadence", "owner", "status"];
        anchored.forEach((finding, index) => {
          assert.ok(finding.message.includes(keys[index]), `${finding.message} names ${keys[index]}`);
        });
        assert.equal(new Set(keys).size, 6, "each of the six keys carries exactly one finding");
      });
    },
  },

  {
    name: "loops-record/01 a missing key and a declared gap are different facts",
    run: async () => {
      await overRegistry(registry({
        "a.md": loopRecord({ fields: { owner: null } }),
        "b.md": loopRecord({ fields: { owner: "unknown" } }),
      }), (model, fixture) => {
        const absent = findingsFor(model, fixture.pathOf("a.md"));
        assert.deepEqual(absent.map((finding) => [finding.code, finding.severity]), [["loop-missing-field", "error"]]);
        assert.equal(absent[0].message, "Required field is missing: owner");
        const declared = findingsFor(model, fixture.pathOf("b.md"));
        assert.deepEqual(declared.map((finding) => [finding.code, finding.severity]), [["loop-owner-unknown", "warn"]]);
        assert.equal(declared.some((finding) => finding.code === "loop-missing-field"), false, "a declared gap is not an absence");
        assert.equal(nodeFor(model, fixture.pathOf("b.md")).fields.owner.kind, "unknown", "and it still loads as a node");
      });
    },
  },

  {
    name: "loops-record/04 declared gaps warn, never block, and never equal a filled field",
    run: async () => {
      await overRegistry(registry({
        "filled.md": loopRecord({ fields: { ceiling: "[config:work.autonomous.maxAttempts]" } }),
        "gapped.md": loopRecord({ fields: { measurement: "[prose:src/bundle/commands/continue.md]", cadence: "unknown", ceiling: "uncapped", owner: "unknown" } }),
        "gapped-ceiling.md": loopRecord({ fields: { ceiling: "unknown" } }),
      }), (model, fixture) => {
        assert.deepEqual(codesFor(model, fixture.pathOf("gapped.md")), [
          "loop-field-prose-only", "loop-cadence-unknown", "loop-ceiling-uncapped", "loop-owner-unknown",
        ]);
        assert.deepEqual(codesFor(model, fixture.pathOf("gapped-ceiling.md")), ["loop-ceiling-unknown"]);
        assert.deepEqual(severitiesOf(model), ["warn"], "a directory whose only findings are the five honesty-lane warns");
        assert.equal(new Set(model.findings.map((finding) => finding.code)).size, 5, "all five, so 'never blocks' is claimed over the whole lane");
        // A declared gap never blocks: every record still loads, none is omitted for a warn.
        assert.deepEqual(idsOf(model), ["actor:steward", "loop:filled", "loop:gapped", "loop:gapped-ceiling"]);

        assert.deepEqual(findingsFor(model, fixture.pathOf("filled.md")), [], "a filled field carries no honesty-lane finding at all");
        const filled = nodeFor(model, fixture.pathOf("filled.md"));
        const gapped = nodeFor(model, fixture.pathOf("gapped.md"));
        // ...and the difference survives into the MODEL as well as into the findings, so a
        // consumer that never reads a finding still cannot confuse the two.
        assert.equal(filled.fields.owner.kind, "ref");
        assert.equal(gapped.fields.owner.kind, "unknown");
        assert.equal(filled.fields.ceiling[0].kind, "pointer");
        assert.equal(gapped.fields.ceiling[0].kind, "uncapped");
      });
    },
  },

  {
    name: "loops-record/04 the unparseable lane leads the whole load, ordered by path",
    run: async () => {
      await overRegistry(registry({
        "alpha.md": loopRecord({ fields: { status: "draft" } }),
        "README.md": "Prose, and no --- block.\n",
        "draft.md": loopRecord({ leadingBlank: true }),
      }), (model, fixture) => {
        assert.equal(model.findings.length, 3);
        assert.deepEqual(model.findings.slice(0, 2).map((finding) => [finding.code, finding.path]), [
          ["loop-record-unparseable", fixture.pathOf("README.md")],
          ["loop-record-unparseable", fixture.pathOf("draft.md")],
        ], "both precede every other finding of the load, ordered by their own path");
        // THE NEAR MISS FF-5209's ORACLE CANNOT SEE: its pair is "a-unparseable.md"/
        // "z-unparseable.md", which sort identically under code units and under a case-folding
        // collation. This pair disagrees, so it decides the rule.
        assert.ok("README.md" < "draft.md", "code units: R (0x52) precedes d (0x64)");
        assert.ok("README.md".localeCompare("draft.md") > 0, "a case-folding collation would reverse them");
        // ...and alpha's own finding follows both, though its path sorts BETWEEN them: the
        // unparseable lane is prior to node ordering, never merged into it.
        assert.deepEqual(model.findings[2], {
          code: "loop-unknown-key", severity: "error", path: fixture.pathOf("alpha.md"),
          message: "Unknown loop-record key: status",
        });
        assert.ok("README.md" < "alpha.md" && "alpha.md" < "draft.md");
      });
    },
  },

  {
    name: "loops-record/04 within one key the findings follow the authored order",
    run: async () => {
      await overRegistry(registry({
        "a.md": loopRecord({ fields: { reference: "[module:src/run-store.mjs, doc:src/x.md, item:52/00]" } }),
      }), async (model, fixture) => {
        const authored = ["module:src/run-store.mjs", "doc:src/x.md", "item:52/00"];
        assert.deepEqual(codesFor(model, fixture.pathOf("a.md")), ["loop-bad-value", "loop-bad-value", "loop-bad-value"]);
        assert.deepEqual(messagesFor(model, fixture.pathOf("a.md")), authored.map((entry) => `Invalid value for reference: ${entry}`),
          "the AUTHORED order — the only order a reader can check against the file in front of them");
        // THE SECOND NEAR MISS: FF-5209's within-key pair is "bad:first"/"bad:second", whose
        // authored order and raw-text order AGREE, so its fixture cannot tell the two rules
        // apart. Here raw-text order would put the "doc:" entry first.
        assert.notDeepEqual([...authored].sort(), authored);
        assert.equal([...authored].sort()[0], "doc:src/x.md");
        assert.equal("reference" in nodeFor(model, fixture.pathOf("a.md")).fields, false);
        const again = await loadLoops(fixture.workDir);
        assert.deepEqual(again.findings, model.findings, "identical on a second load");
      });
    },
  },

  {
    name: "loops-record/04 determinism holds across an in-process repeat and a fresh process",
    run: async () => {
      await overRegistry(registry({
        "README.md": "Prose, no frontmatter.\n",
        "draft.md": loopRecord({ leadingBlank: true }),
        "a-loop.md": loopRecord({ fields: { reference: "[bad:one, bad:two]", status: "draft" }, extraLines: ["veto/constraint: [loop:x]"] }),
        "z-loop.md": loopRecord({ fields: { owner: "unknown", cadence: "unknown", "data-feed": "[loop:ghost]" } }),
      }), async (first, fixture) => {
        assert.ok(first.findings.length >= 8 && severitiesOf(first).length === 2, "a fixed directory that fires several codes at both severities");
        // THE THIRD NEAR MISS: FF-5209 calls `loadLoops` once per test, so the IN-PROCESS
        // repeat — the leg that catches a per-call mutation of module state — is asserted by
        // nothing on disk today.
        const second = await loadLoops(fixture.workDir);
        assert.deepEqual(second.findings, first.findings);
        assert.equal(JSON.stringify(second.findings), JSON.stringify(first.findings), "byte-identical, in the same order");
        const fresh = loadLoopsInFreshProcess(fixture.workDir, { expression: "model.findings" });
        assert.equal(fresh.stdout, JSON.stringify(first.findings), "and a fresh-process load is byte-identical to both");
      });
    },
  },

  {
    name: "loops-record/04 a finding never varies with wall-clock time",
    run: async () => {
      await overRegistry(registry({
        "a.md": loopRecord({ fields: { owner: "unknown", status: "draft" } }),
      }), async (first, fixture) => {
        const startedAt = Date.now();
        await sleep(8);
        const later = await loadLoops(fixture.workDir);
        assert.ok(Date.now() > startedAt, "the two loads really did happen at two wall-clock times");
        assert.equal(JSON.stringify(later.findings), JSON.stringify(first.findings));
        // ...and nothing time-shaped is carried: no ISO stamp, no epoch, no run identifier.
        // Scoped to the reported VALUES — the anchor path is a fixture artifact.
        const timeShaped = /\d{4}-\d{2}-\d{2}T\d{2}:|\b\d{10,}\b|\b[0-9a-f]{8}-[0-9a-f]{4}-/i;
        assert.ok(first.findings.length > 0);
        for (const finding of first.findings) {
          for (const value of [finding.code, finding.severity, finding.message]) {
            assert.equal(timeShaped.test(value), false, `${value} carries a timestamp, a duration or a run identifier`);
          }
        }
      });
    },
  },

  {
    name: "loops-record/04 every comparison that fixes the order is code-unit lexicographic",
    run: async () => {
      await overRegistry(registry({
        "README.md": "Prose, no --- block.\n",
        "draft.md": loopRecord({ leadingBlank: true }),
        "run-store.md": loopRecord({ fields: { status: "draft" } }),
        "runbook.md": loopRecord({ fields: { status: "draft" } }),
      }), (model, fixture) => {
        assert.deepEqual(model.findings.map((finding) => finding.path), [
          fixture.pathOf("README.md"), fixture.pathOf("draft.md"),
          fixture.pathOf("run-store.md"), fixture.pathOf("runbook.md"),
        ]);
        assert.ok("README.md".localeCompare("draft.md") > 0, 'the unparseable pair: "R" precedes "d" by code unit, where a collation folds the case and puts "draft.md" first');
        assert.ok("loop:run-store" < "loop:runbook", 'the node blocks: "-" precedes "b" by code unit, whatever weight a collation gives punctuation');
        // The whole findings list, byte for byte, from a process told it lives in another
        // locale. (The source-side sweep — "no comparison ANYWHERE in the load is made by a
        // locale-aware collation" — is a claim about `src/work/loops.mjs`'s text, which no
        // gate owns today; this is the decidable proxy, and it is the one that a reordering
        // loader would fail.)
        const fresh = loadLoopsInFreshProcess(fixture.workDir, {
          expression: "model.findings",
          env: { LC_ALL: "tr_TR.UTF-8", LANG: "tr_TR.UTF-8", LC_COLLATE: "tr_TR.UTF-8" },
        });
        assert.equal(fresh.stdout, JSON.stringify(model.findings));
      });
    },
  },

  {
    name: "loops-record/00 a load leaves the exported vocabularies exactly as they were",
    run: async () => {
      // The ELEVEN vocabularies, captured before any load. Admitted keys are KIND-SCOPED, so
      // that one vocabulary is three captures (union, loop, actor) — the count is of
      // vocabularies, which is how the feature enumerates them.
      const sets = {
        "admitted keys (all)": ADMITTED_KEYS.all, "admitted keys (loop)": ADMITTED_KEYS.loop,
        "admitted keys (actor)": ADMITTED_KEYS.actor, "admitted keys (anchor)": ADMITTED_KEYS.anchor,
        "admitted keys (watcher)": ADMITTED_KEYS.watcher, "node kinds": NODE_KINDS, "edge keys": EDGE_KEYS,
        "pointer schemes": POINTER_SCHEMES, "endpoint schemes": ENDPOINT_SCHEMES,
        "sentinels": SENTINEL_TOKENS, "cadence kinds": CADENCE_KINDS, "duration units": PERIODIC_UNITS,
        "event triggers": EVENT_TRIGGERS, "field kinds": FIELD_KINDS, "ground classes": GROUND_VALUES,
      };
      const before = Object.fromEntries(Object.entries(sets).map(([name, set]) => [name, [...set].sort()]));
      await overRegistry(registry({ "novel.md": loopRecord({ fields: { watchdog: "[loop:x]" } }) }), async (model, fixture) => {
        assert.deepEqual(codesFor(model, fixture.pathOf("novel.md")), ["loop-unknown-key"]);
        assert.deepEqual(messagesFor(model, fixture.pathOf("novel.md")), ["Unknown loop-record key: watchdog"]);
        const afterLoad = Object.fromEntries(Object.entries(sets).map(([name, set]) => [name, [...set].sort()]));
        assert.deepEqual(afterLoad, before, "the sets are literals, not accumulated from the data being read");
        for (const set of Object.values(sets)) set.add("watchdog");
        const afterMutation = Object.fromEntries(Object.entries(sets).map(([name, set]) => [name, [...set].sort()]));
        assert.deepEqual(afterMutation, before, "and they cannot be widened at runtime");
        for (const [name, set] of Object.entries(sets)) assert.equal(set.has("watchdog"), false, name);
        const again = await loadLoops(fixture.workDir);
        assert.deepEqual(again.findings, model.findings, "a subsequent load classifies the attempted member exactly as it did before");
      });
    },
  },

  {
    name: "loops-record/00 the loader's namespace holds eleven vocabulary sets and one frozen code array",
    run: () => {
      // THE READING, RECORDED RATHER THAN RESOLVED (`00_frozen-vocabulary:22` — "no twelfth
      // set is exported"). The loader exports TWELVE frozen collections: the eleven
      // vocabularies plus `LOADER_FINDING_CODES`, which `04_schema-and-honesty-findings`
      // requires to exist. `Array.isArray` is the discriminator — the claim is about the
      // frozen vocabulary SETS, and the code array is not one of them. A reading question,
      // not a defect.
      //
      // THE FOURTEENTH EXPORT IS A FUNCTION, AND THE SCENARIO'S COUNT IS UNMOVED (milestone
      // 62 gate, finding D-02). 62/04 added `loopPointersIn` — an EXTRACTOR that reads
      // `POINTER_SCHEMES` over free text so 62's corpus can join a lesson to the one config
      // pointer it names. It is a function, in the same category as `loadLoops`, so the
      // eleven-SET claim at `:22` is untouched: reconciling this census is the whole fix, and
      // widening it to admit a set would not have been. This census is the only reader that
      // sees a new export at all, which is exactly why it is a census and not a count.
      //
      // THE FIFTEENTH EXPORT IS ALSO A FUNCTION, AND THE SCENARIO'S COUNT IS AGAIN UNMOVED
      // (63/00, ADR-002 §3). `parseCadence` is the body that WAS the private `cadenceField`,
      // given a public name so `src/work-trigger/declaration.mjs` compiles a trigger's cadence
      // through the loop registry's own grammar instead of a second copy of it — the species
      // 66/FF-6604 and TECH_DEBT item 68 exist to refuse. Its answers are byte-unchanged (this
      // suite's own vocabulary table is the reader that would see it if they were not), and the
      // alternative the ADR names — exporting a `CADENCE_SOURCES` SET — is exactly what `:22`
      // forbids. So the move is 62/04's, line-for-line: one more NAME, no more SETS.
      //
      // This is a CENSUS of the namespace, which is what "no twelfth" needs and what no gate
      // performs; the per-set MEMBERSHIP is FF-5203's and is not re-asserted here.
      assert.deepEqual(Object.keys(loaderModule).sort(), [
        "ADMITTED_KEYS", "CADENCE_KINDS", "EDGE_KEYS", "ENDPOINT_SCHEMES", "EVENT_TRIGGERS",
        "FIELD_KINDS", "GROUND_VALUES", "LOADER_FINDING_CODES", "NODE_KINDS", "PERIODIC_UNITS",
        "POINTER_SCHEMES", "SENTINEL_TOKENS", "loadLoops", "loopPointersIn", "parseCadence",
      ], "fifteen exports: eleven vocabularies, one finding-code array, three functions");

      // The eleven-set claim the scenario actually freezes, asserted rather than inferred
      // from the list above: every non-function export but the finding-code array is a set.
      const sets = Object.entries(loaderModule)
        .filter(([, value]) => typeof value !== "function" && !Array.isArray(value));
      assert.equal(sets.length, 11, "eleven frozen vocabulary sets — no twelfth");

      const flat = { CADENCE_KINDS, EDGE_KEYS, ENDPOINT_SCHEMES, EVENT_TRIGGERS, FIELD_KINDS, GROUND_VALUES, NODE_KINDS, PERIODIC_UNITS, POINTER_SCHEMES, SENTINEL_TOKENS };
      for (const [name, set] of Object.entries(flat)) {
        assert.equal(typeof set.has, "function", name);
        assert.equal(Array.isArray(set), false, name);
        assert.ok(Object.isFrozen(set), name);
      }
      // The eleventh vocabulary is KIND-SCOPED: the union plus one set per node kind.
      assert.ok(Object.isFrozen(ADMITTED_KEYS));
      // ONE SUBSET PER DECLARED KIND, AND THE UNION — derived from `NODE_KINDS` rather than
      // re-typed, so the day a sixth kind is admitted to the registry and NOT given its own
      // admitted-key set, this census fails instead of silently letting that kind fall through to
      // the union (which is what `parseNode` uses when it cannot resolve a kind at all). 58's
      // `arbiter` is the widening that made the literal list wrong; deriving it is what stops the
      // next one needing an edit here.
      assert.deepEqual(Object.keys(ADMITTED_KEYS).sort(), ["all", ...NODE_KINDS].sort());
      for (const kind of NODE_KINDS) {
        assert.equal(typeof ADMITTED_KEYS[kind]?.has, "function", `${kind}: has its own kind-scoped admitted-key set`);
        for (const key of ADMITTED_KEYS[kind]) assert.ok(ADMITTED_KEYS.all.has(key), `${kind}/${key}: the union contains every kind's key`);
      }
      assert.equal(Object.keys(flat).length + 1, 11, "ten flat sets plus the kind-scoped admitted keys — eleven vocabularies");
      // ...and the twelfth frozen collection, discriminated by shape rather than by name.
      assert.ok(Array.isArray(LOADER_FINDING_CODES) && Object.isFrozen(LOADER_FINDING_CODES));
      assert.equal(typeof loaderModule.loadLoops, "function");
    },
  },

  {
    name: "loops-record/00 the out-of-vocabulary token table (table)",
    run: async () => {
      const files = registry({
        // The supporting record that makes row 10's `loop:x` endpoint RESOLVE, so its
        // "(none)" is a statement about admission and not about a dangling endpoint.
        "x.md": loopRecord(),
        ...Object.fromEntries(VOCABULARY_TABLE_CASES.map((row) => [row.file, row.spec])),
      });
      await overRegistry(files, (model, fixture) => {
        for (const row of VOCABULARY_TABLE_CASES) {
          const anchored = findingsFor(model, fixture.pathOf(row.file));
          assert.deepEqual(anchored.map((finding) => finding.code), row.codes, `${row.vocabulary} | ${row.token}`);
          if (row.expected) {
            const finding = anchored.find((candidate) => candidate.code === row.expected);
            assert.ok(finding, `${row.token} — expected ${row.expected}`);
            assert.equal(finding.severity, row.severity, row.token);
            if (row.names) assert.ok(finding.message.includes(row.names), `${finding.message} names ${row.names}`);
          } else {
            assert.equal(anchored.some((finding) => finding.code === "loop-key-not-admitted-for-kind"), false, `${row.token} — (none)`);
          }
          if (row.absentKey) {
            assert.equal(anchored.some((finding) => finding.message.includes(row.absentKey)), false, `${row.token}: no finding names ${row.absentKey}`);
          }
          if (row.check) row.check(nodeFor(model, fixture.pathOf(row.file)));
        }
        // The two admission codes are never confused: inside the union is one code, outside
        // it is the other, decided over the two rows in the SAME load.
        assert.deepEqual(codesFor(model, fixture.pathOf("vk-ground-on-loop.md")), ["loop-key-not-admitted-for-kind"]);
        assert.deepEqual(codesFor(model, fixture.pathOf("vk-status.md")), ["loop-unknown-key"]);
        // ...and a kind-scoped rejection names the key AND the kind, so the message tells an
        // author which of the two to change.
        assert.equal(messagesFor(model, fixture.pathOf("vk-ground-on-loop.md"))[0], "Key ground is not admitted for kind loop");
        assert.equal(messagesFor(model, fixture.pathOf("vk-cadence-on-actor.md"))[0], "Key cadence is not admitted for kind actor");
        // A control field on an actor costs no missing-field sweep of its own.
        assert.equal(findingsFor(model, fixture.pathOf("vk-cadence-on-actor.md")).some((finding) => finding.code === "loop-missing-field"), false);
      });
    },
  },

  {
    name: "loops-record/00 a capitalised key is an unknown key and leaves the real key missing",
    run: async () => {
      await overRegistry(registry({
        "capitalised.md": loopRecord({ kind: null, extraLines: ["Kind: loop"] }),
      }), (model, fixture) => {
        assert.deepEqual(codesFor(model, fixture.pathOf("capitalised.md")), ["loop-missing-field", "loop-unknown-key"]);
        assert.deepEqual(messagesFor(model, fixture.pathOf("capitalised.md")), [
          "Required field is missing: kind", "Unknown loop-record key: Kind",
        ], "the one row that fires twice — the capitalised key is outside the admitted set, and the real key is then absent");
      });
    },
  },

  {
    name: "loops-record/01 a node with no kind is kept and still gets every kind-independent check",
    run: async () => {
      await overRegistry(registry({
        "run-resilience.md": loopRecord({ kind: null }),
        "watcher.md": loopRecord({ fields: { "data-feed": "[loop:run-resilience]" } }),
        "a-loop.md": {
          lines: ["id: loop:a-loop", "title: A loop", "status: draft", "reference: module:a.mjs#b", "actuator: []", "cadence: hourly"],
        },
      }), (model, fixture) => {
        const kept = nodeFor(model, fixture.pathOf("run-resilience.md"));
        assert.deepEqual(codesFor(model, fixture.pathOf("run-resilience.md")), ["loop-missing-field"]);
        assert.equal(messagesFor(model, fixture.pathOf("run-resilience.md"))[0], "Required field is missing: kind");
        assert.ok(kept, "the node is carried in the model, never dropped");
        assert.equal(kept.kind, null, "neither loop nor actor, and never defaulted to either");
        // ...and an endpoint declared elsewhere as "loop:run-resilience" still resolves to it,
        // which is WHY a kindless node is kept rather than dropped.
        assert.deepEqual(codesFor(model, fixture.pathOf("watcher.md")), []);
        assert.equal(nodeFor(model, fixture.pathOf("watcher.md")).edges["data-feed"][0].resolved, true);

        // Every kind-INDEPENDENT check still runs: admission against the union, shape,
        // non-empty and grammar — and none of the kind-DERIVED ones does.
        const anchored = findingsFor(model, fixture.pathOf("a-loop.md"));
        assert.deepEqual(anchored.map((finding) => finding.code), [
          "loop-missing-field", "loop-expected-list", "loop-empty-list", "loop-bad-value", "loop-unknown-key",
        ]);
        assert.equal(anchored.filter((finding) => finding.code === "loop-missing-field").length, 1, 'loop-missing-field for no key other than "kind"');
        assert.equal(anchored[0].message, "Required field is missing: kind");
        assert.equal(anchored.some((finding) => finding.code === "loop-key-not-admitted-for-kind"), false);
        assert.equal(anchored.some((finding) => finding.code === "loop-id-mismatch"), false, "the stem leg passes, and the scheme leg is suspended");
      });
    },
  },

  {
    name: "loops-record/01 an actor node needs only id, kind and title",
    run: async () => {
      await overRegistry(registry({
        "operator.md": actorRecord(),
        "bare.md": actorRecord({ fields: { ground: null } }),
      }), (model, fixture) => {
        assert.deepEqual(model.findings, [], "zero error-severity findings, and no missing-field for any control key");
        assert.deepEqual(idsOf(model), ["actor:bare", "actor:operator"]);
        assert.equal(nodeFor(model, fixture.pathOf("operator.md")).fields.ground.kind, "enum");
        assert.deepEqual(Object.keys(nodeFor(model, fixture.pathOf("bare.md")).fields), [], "an actor declaring nothing but its identity is complete");
      });
    },
  },

  {
    name: "loops-record/01 a directory of records loads to one node per file",
    run: async () => {
      await overRegistry(registry({
        "run-resilience.md": loopRecord(),
        "autonomous-cascade.md": loopRecord(),
        "operator.md": actorRecord(),
      }), (model, fixture) => {
        assert.equal(model.present, true);
        assert.equal(model.nodes.length, 3, "exactly three nodes — one per file");
        for (const name of ["run-resilience.md", "autonomous-cascade.md", "operator.md"]) {
          const node = nodeFor(model, fixture.pathOf(name));
          assert.ok(node, name);
          assert.equal(node.id, `${name === "operator.md" ? "actor" : "loop"}:${path.basename(name, ".md")}`, "each node's id is the one its own file declared");
        }
      });
    },
  },

  {
    name: "loops-record/01 the key-shape table — what one authored value becomes (table)",
    run: async () => {
      const files = registry({
        // The supporting record that makes the edge row's endpoint resolve, so "loads as one
        // edge" is not quietly also a dangling-endpoint case.
        "autonomous-cascade.md": loopRecord(),
        ...Object.fromEntries(SHAPE_TABLE_CASES.map((row) => [row.file, row.spec])),
        // The scalar rule holds for every scalar key, not just the two the table samples.
        "shape-scalar-cadence.md": loopRecord({ fields: { cadence: "[event:per-item]" } }),
        "shape-scalar-optimizing.md": loopRecord({ fields: { optimizing: "[false]" } }),
        "shape-scalar-ground.md": actorRecord({ fields: { ground: "[exogenous]" } }),
      });
      await overRegistry(files, (model, fixture) => {
        for (const row of SHAPE_TABLE_CASES) {
          const anchored = findingsFor(model, fixture.pathOf(row.file));
          assert.deepEqual(anchored.map((finding) => finding.code), row.codes, `${row.expects} | ${row.authored} -> ${row.outcome}`);
          row.check(nodeFor(model, fixture.pathOf(row.file)));
        }
        for (const name of ["shape-scalar-cadence.md", "shape-scalar-optimizing.md", "shape-scalar-ground.md"]) {
          assert.deepEqual(codesFor(model, fixture.pathOf(name)), ["loop-expected-scalar"], `${name}: the same holds for cadence, optimizing and ground on an actor`);
        }
        // An empty inline list and a value that is no list at all are DIFFERENT errors, and
        // neither leaves a "reference" any consumer could read as declared-and-satisfied.
        assert.deepEqual(codesFor(model, fixture.pathOf("shape-list-empty.md")), ["loop-empty-list"]);
        assert.deepEqual(codesFor(model, fixture.pathOf("shape-list-empty-value.md")), ["loop-expected-list"]);
      });
    },
  },

  {
    name: "loops-record/01 an empty machinery list is never a way to declare a loop with no machinery",
    run: async () => {
      await overRegistry(registry({
        "hollow.md": loopRecord({ fields: { reference: "[]", measurement: "[]", actuator: "[]", ceiling: "[]" } }),
      }), (model, fixture) => {
        const anchored = findingsFor(model, fixture.pathOf("hollow.md"));
        assert.deepEqual(anchored.map((finding) => finding.code), ["loop-empty-list", "loop-empty-list", "loop-empty-list", "loop-empty-list"]);
        assert.deepEqual(anchored.map((finding) => finding.message), [
          "reference must not be empty", "measurement must not be empty",
          "actuator must not be empty", "ceiling must not be empty",
        ], "each of the four is named");
        const node = nodeFor(model, fixture.pathOf("hollow.md"));
        for (const key of ["reference", "measurement", "actuator", "ceiling"]) {
          assert.equal(key in node.fields, false, `${key} carries no entry`);
        }
        assert.equal(anchored.some((finding) => finding.severity === "warn"), false, "no honesty-lane warn stands in place of any of them");
      });
    },
  },

  {
    name: "loops-record/01 the filename x kind x declared id table (table)",
    run: async () => {
      // ONE REGISTRY PER ROW: six rows are authored in "run-resilience.md" and two in
      // "operator.md", so a single directory could not hold them without changing the very
      // thing each row measures.
      for (const row of ID_TABLE_CASES) {
        await overRegistry(registry({ [row.filename]: row.spec }), (model, fixture) => {
          const anchored = findingsFor(model, fixture.pathOf(row.filename));
          const label = `${row.filename} | ${row.kind} | ${row.declaredId} -> ${row.outcome}`;
          assert.deepEqual(anchored.map((finding) => finding.code), row.codes, label);
          assert.deepEqual(model.findings, anchored, `${label}: and nothing else in the load`);
          if (row.names) assert.ok(anchored[0].message.includes(row.names), `${label}: names ${row.names}`);
          const node = nodeFor(model, fixture.pathOf(row.filename));
          if (row.node === false) {
            assert.equal(node, null, `${label}: no node`);
            assert.deepEqual(idsOf(model), ["actor:steward"], `${label}: only the Background's actor loads`);
          } else {
            assert.ok(node, label);
            assert.equal(node.id, row.nodeId, `${label}: the id is carried as declared, never repaired`);
          }
        });
      }
    },
  },

  {
    name: "loops-record/01 the unusable-kind suspension table (table)",
    run: async () => {
      // Rows 3 and 4 are both authored in "sensor.md" (the scheme leg and the stem leg of the
      // same rule), so this table too takes one registry per row.
      for (const row of KIND_SUSPENSION_CASES) {
        await overRegistry(registry({ [row.file]: row.spec }), (model, fixture) => {
          const anchored = findingsFor(model, fixture.pathOf(row.file));
          assert.deepEqual(anchored.map((finding) => finding.code), row.codes, `${row.record} -> ${row.reported}`);
          for (const never of row.neverCodes) {
            assert.equal(anchored.some((finding) => finding.code === never), false, `${row.record}: ${never} is kind-DERIVED and is suspended with the kind`);
          }
          if (row.namesOnly) {
            assert.equal(anchored.length, 1, row.record);
            assert.ok(anchored[0].message.endsWith(row.namesOnly), `${row.record}: names ${row.namesOnly} and no control key`);
          }
          if (row.messagesEnd) assert.deepEqual(anchored.map((finding) => finding.message), row.messagesEnd, row.record);
          assert.equal(nodeFor(model, fixture.pathOf(row.file)).kind, null, `${row.record}: the node is kept, carrying kind null`);
        });
      }
    },
  },

  {
    name: "loops-record/04 the record-content table — code and severity (table)",
    run: async () => {
      const files = registry(Object.fromEntries(RECORD_CONTENT_CASES.map((row) => [row.file, row.spec])));
      await overRegistry(files, (model, fixture) => {
        for (const row of RECORD_CONTENT_CASES) {
          const anchored = findingsFor(model, fixture.pathOf(row.file));
          assert.deepEqual(anchored.map((finding) => finding.code), row.codes, `${row.content} -> ${row.code ?? "(no finding)"}`);
          if (row.code) {
            assert.equal(anchored[0].code, row.code, row.content);
            assert.equal(anchored[0].severity, row.severity, `${row.content}: severity ${row.severity}`);
          }
        }
      });
    },
  },

  {
    name: "loops-record/04 the total-order rank table (table)",
    run: async () => {
      await overRegistry(TOTAL_ORDER_FILES, (model, fixture) => {
        for (const row of TOTAL_ORDER_RANK_CASES) row.decide(model, fixture);
      });
    },
  },

  {
    name: "loops-record/00 endpoint schemes resolve in two tiers",
    run: async () => {
      await overRegistry(registry({
        "present.md": loopRecord(),
        "hub.md": loopRecord({ fields: { "data-feed": "[loop:present, actor:steward, item:52/00, command:work:next, config:work.autonomous.maxAttempts, module:src/run-store.mjs#isRetryable]" } }),
      }), (model, fixture) => {
        assert.deepEqual(findingsFor(model, fixture.pathOf("hub.md")), [], "all six are admitted — the membership of the set itself is FF-5203's, not re-asserted here");
        const endpoints = nodeFor(model, fixture.pathOf("hub.md")).edges["data-feed"];
        assert.deepEqual(endpoints.map((endpoint) => [endpoint.scheme, endpoint.resolved]), [
          ["loop", true], ["actor", true],
          ["item", null], ["command", null], ["config", null], ["module", null],
        ], "loop: and actor: are the only two the loader resolves against declared nodes; the other four are declared and syntax-checked only");
      });
    },
  },

  {
    name: "loops-record/04 the load's own findings carry all three of its lanes",
    run: async () => {
      await overRegistry(registry({
        "run-resilience.md": loopRecord({ fields: { "data-feed": "[loop:ghost]", owner: "unknown", status: "draft" } }),
      }), (model, fixture) => {
        // Schema, reference integrity and honesty, all three arriving WITH the model — the
        // only call in this case is `loadLoops`, so no structural check has been run to
        // produce any of them, and none arrives from a later pass.
        assert.deepEqual(codesFor(model, fixture.pathOf("run-resilience.md")), [
          "loop-owner-unknown", "loop-graph-dangling-endpoint", "loop-unknown-key",
        ]);
        assert.equal(model.nodes.some((node) => node.id === "loop:ghost"), false, "no record declares it");
        assert.equal(nodeFor(model, fixture.pathOf("run-resilience.md")).edges["data-feed"][0].resolved, false);
        for (const finding of model.findings) assert.equal(CHECK_LANE_CODES.includes(finding.code), false);
      });
    },
  },

  {
    name: "loops-record/01 node and finding paths are raw absolutes in OS-native form",
    run: async () => {
      await overRegistry(registry({
        "run-resilience.md": loopRecord({ fields: { status: "draft" } }),
      }), (model, fixture) => {
        const node = nodeFor(model, fixture.pathOf("run-resilience.md"));
        assert.ok(path.isAbsolute(node.path));
        assert.equal(node.path, path.join(model.source, "run-resilience.md"), "the OS-native join of source and the filename");
        assert.ok(node.path.includes(path.sep), "the running platform's own separator");
        assert.ok(node.path.startsWith(model.source + path.sep), "not relative to the work directory, the repo root or the cwd");
        // "The same absolute path is what every consumer of the model receives": the finding
        // anchored at this record carries the identical string, character for character.
        assert.equal(findingsFor(model, node.path).length, 1);
        assert.equal(model.findings[0].path, node.path);
        // ...and the loader normalises NO separator: the absolute node path and a
        // forward-slashed pointer operand coexist in the same node.
        const operand = node.fields.reference[0].pointer.operand;
        assert.equal(operand, "src/run-store.mjs", "still exactly as authored");
        assert.equal(operand.includes("\\"), false, "forward-slashed, whatever the platform separator is");
      });
    },
  },

  {
    name: "loops-record/05 the suite drives the public loader and its fixtures are non-vacuous",
    run: async () => {
      // (1) THE SUBJECT. Every case above calls this binding, and it is the module's own
      // export — not a re-implementation, not a private function reached through a namespace.
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

      // (2) EVERY FIXTURE GOES THROUGH `registry()`, which is what makes the Background —
      // "every base fixture carries at least one `kind: actor` record" — a property of the
      // suite rather than of the cases a reader happens to check. Enforced at RUN time by the
      // one door every case uses, so it cannot be defeated by how a case spells its call...
      await assert.rejects(
        () => overRegistry({ "a.md": loopRecord() }, () => {}),
        /built by registry/,
        "...and the door really is shut: an unbranded file map never reaches the loader",
      );
      assert.deepEqual(actorRecordNames(registry({ "a.md": loopRecord() })), [BASE_ACTOR], "a fixture with no actor of its own is given one");
      assert.deepEqual(actorRecordNames(registry({ "operator.md": actorRecord() })), ["operator.md"], "a fixture that declares one keeps it");
      await overRegistry(registry({}), (model) => {
        assert.deepEqual(model.nodes.map((node) => [node.id, node.kind]), [["actor:steward", "actor"]], "and it RESOLVES to a node whose kind is actor");
        assert.deepEqual(model.findings, []);
      });

      // (3) NO CASE ASSERTS AN ABSENT REGISTRY WITHOUT ASSERTING A POPULATED ONE BESIDE IT:
      // there is exactly one absent-registry call site, and the ledger shows the same test
      // deciding the absent scenario and the empty one.
      assert.equal(source.split(`without${"LoopRegistry("}`).length - 1, 1);
      const decidedFor = (scenario) => coverage.decided.find((entry) => entry.scenario === scenario)?.test;
      assert.equal(
        decidedFor("an absent loops directory is present:false with zero nodes and no finding"),
        decidedFor("an EMPTY loops directory is present:true with zero nodes — absence and emptiness are different facts"),
      );

      // (4) THE LEDGER IS SELF-CONSISTENT — task 05's checker owns the cross-file half; this
      // is the half that can only be decided from inside the module.
      const names = new Set(workLoopsRecordTests.map((entry) => entry.name));
      assert.equal(names.size, workLoopsRecordTests.length, "test names are unique");
      for (const entry of workLoopsRecordTests) {
        assert.equal(typeof entry.run, "function");
        assert.equal(Object.hasOwn(entry, "fn"), false, "the house runner shape is {name, run}");
      }
      for (const entry of coverage.decided) {
        assert.ok(names.has(entry.test), `${entry.scenario} -> ${entry.test}`);
        assert.ok(coverage.features.includes(entry.feature), entry.feature);
      }
      for (const entry of coverage.excluded) {
        assert.ok(coverage.features.includes(entry.feature), entry.feature);
        assert.ok(entry.reason.length > 0 && entry.pointer.length > 0, entry.scenario);
      }
      const titles = [...coverage.decided, ...coverage.excluded].map((entry) => `${entry.feature}::${entry.scenario}`);
      assert.equal(new Set(titles).size, titles.length, "no scenario is both decided and excluded, and none is listed twice");
      for (const table of coverage.tables) {
        assert.ok(coverage.features.includes(table.feature), table.feature);
        assert.equal(table.cases.length, table.rows, `${table.feature} table ${table.index}`);
      }
    },
  },

  // ————— milestone 58 / story 00 · task 00 — `00_a-fifth-kind.feature` ————————————————

  {
    name: "loops-record/58 the fifth kind parses as its own node, and the four before it are read as themselves",
    run: async () => {
      // ONE LOAD, FIVE KINDS. The re-classification claim is only decidable over a model that
      // contains all five: a loader that read `arbiter` as the fallback would still report the
      // arbiter's own kind correctly if the arbiter were alone in the directory.
      await overRegistry(registry({
        "alpha.md": loopRecord(),
        "operator.md": actorRecord(),
        "gauge.md": anchorRecord58("gauge"),
        "sentry.md": watcherRecord58("sentry"),
        "trade-off.md": arbiterRecord58("trade-off"),
      }), (model, fixture) => {
        assert.deepEqual(model.findings, [], "the five declared kinds coexist with no finding at all");
        const arbiter = nodeFor(model, fixture.pathOf("trade-off.md"));
        assert.equal(arbiter.kind, "arbiter", "its kind is reported as arbiter");
        assert.equal(arbiter.id, "arbiter:trade-off", "…and the id it declares is readable off the node");
        assert.equal(arbiter.title, "trade-off", "…as is the title");

        // NONE OF THE FOUR IS RE-CLASSIFIED AS THE KIND THIS STORY ADDS.
        assert.deepEqual(
          Object.fromEntries(model.nodes.map((node) => [node.id, node.kind])),
          {
            "actor:operator": "actor",
            "anchor:gauge": "anchor",
            "arbiter:trade-off": "arbiter",
            "loop:alpha": "loop",
            "watcher:sentry": "watcher",
          },
          "each is parsed as the kind it declares",
        );
        assert.equal(model.nodes.filter((node) => node.kind === "arbiter").length, 1, "exactly one node is the new kind");
      });

      // A KIND NOBODY HAS DECLARED IS STILL REFUSED, and the value is quoted back so an author
      // can see which of the two — the word or the vocabulary — is wrong.
      await overRegistry(registry({
        "outside.md": arbiterRecord58("outside", { kind: "arbitrator" }),
      }), (model, fixture) => {
        const findings = findingsFor(model, fixture.pathOf("outside.md"));
        const bad = findings.find((finding) => finding.code === "loop-bad-value");
        assert.ok(bad, "a bad-value finding is raised");
        assert.equal(bad.message, "Invalid value for kind: arbitrator", "…naming the kind key and quoting the value");
        assert.equal(model.nodes.some((node) => node.kind === "arbitrator"), false, "and no node is parsed as the unrecognised kind");
      });

      // AN ARBITER WHOSE ID DOES NOT NAME ITS KIND IS REFUSED by the EXISTING id-mismatch rule,
      // which names the id it expected — and the other four kinds' identity findings are what
      // they were, decided in the same load rather than remembered.
      await overRegistry(registry({
        "mismatch.md": arbiterRecord58("mismatch", { id: "actor:mismatch" }),
        "loop-mismatch.md": renderRecord(loopRecord({ id: "arbiter:loop-mismatch" }), "loop-mismatch"),
        "actor-mismatch.md": renderRecord(actorRecord({ id: "loop:actor-mismatch" }), "actor-mismatch"),
        "anchor-mismatch.md": anchorRecord58("anchor-mismatch", { id: "loop:anchor-mismatch" }),
        "watcher-mismatch.md": watcherRecord58("watcher-mismatch", { id: "loop:watcher-mismatch" }),
      }), (model, fixture) => {
        assert.equal(messagesFor(model, fixture.pathOf("mismatch.md"))[0], "id actor:mismatch must equal arbiter:mismatch");
        assert.deepEqual(
          ["loop-mismatch.md", "actor-mismatch.md", "anchor-mismatch.md", "watcher-mismatch.md"]
            .map((name) => messagesFor(model, fixture.pathOf(name))[0]),
          [
            "id arbiter:loop-mismatch must equal loop:loop-mismatch",
            "id loop:actor-mismatch must equal actor:actor-mismatch",
            "id loop:anchor-mismatch must equal anchor:anchor-mismatch",
            "id loop:watcher-mismatch must equal watcher:watcher-mismatch",
          ],
          "the identity findings for the other four kinds are unchanged",
        );
        for (const name of ["mismatch.md", "loop-mismatch.md", "actor-mismatch.md", "anchor-mismatch.md", "watcher-mismatch.md"]) {
          assert.deepEqual(codesFor(model, fixture.pathOf(name)), ["loop-id-mismatch"], `${name}: one slip, one finding`);
        }
      });
    },
  },

  {
    name: "loops-record/58 the kind vocabulary table (table)",
    run: async () => {
      for (const row of KIND_VOCABULARY_58_CASES) {
        const text = row.parses
          ? recordOfKind58(row.kind, "subject")
          : arbiterRecord58("subject", { kind: row.kind });
        await overRegistry(registry({ "subject.md": text }), (model, fixture) => {
          const node = nodeFor(model, fixture.pathOf("subject.md"));
          const codes = codesFor(model, fixture.pathOf("subject.md"));
          if (row.parses) {
            assert.deepEqual(codes, [], `${row.kind}: parses as a node`);
            assert.equal(node.kind, row.kind, `${row.kind}: and its kind is what it declared`);
          } else {
            assert.ok(codes.includes("loop-bad-value"), `${row.kind}: is refused as a bad value`);
            assert.ok(
              messagesFor(model, fixture.pathOf("subject.md")).includes(`Invalid value for kind: ${row.kind}`),
              `${row.kind}: the finding names the kind key and quotes the value`,
            );
            assert.equal(node.kind, null, `${row.kind}: no node is parsed as the unrecognised kind`);
          }
        });
      }
      // NON-VACUITY: the near-miss spellings are genuinely OUTSIDE the set, and the five literals
      // genuinely inside it — decided against the vocabulary itself, not only against the loader.
      for (const row of KIND_VOCABULARY_58_CASES) assert.equal(NODE_KINDS.has(row.kind), row.parses, row.kind);
      // 58's Examples block is five literals and three near-misses, and it is immutable. The
      // CLOSURE claim — the vocabulary holds exactly the declared kinds and nothing else — moved to
      // the milestone that last widened it; what stays here is that all five of 58's are still
      // members, which is the additivity this table can decide on its own.
      assert.equal(KIND_VOCABULARY_58_CASES.filter((row) => row.parses).length, 5, "58's five literals");
      assert.ok(NODE_KINDS.size >= 5, `additive: the vocabulary carries ${NODE_KINDS.size} kinds`);
    },
  },

  {
    name: "loops-record/58 an arbiter is an endpoint, and the kinds nothing points at are not",
    run: async () => {
      // AN EDGE MAY NAME AN ARBITER AS ITS ENDPOINT — the node the human's priority belongs to
      // could not otherwise be said to receive it (ADR-003 §6).
      await overRegistry(registry({
        "operator.md": actorRecord({ fields: { "target-setting": "[arbiter:trade-off]" } }),
        "trade-off.md": arbiterRecord58("trade-off"),
      }), (model, fixture) => {
        assert.deepEqual(model.findings, [], "no bad-value finding names the edge");
        const edge = nodeFor(model, fixture.pathOf("operator.md")).edges["target-setting"][0];
        assert.equal(edge.raw, "arbiter:trade-off", "the arbiter is the endpoint of that edge");
        assert.strictEqual(edge.resolved, true, "…and it resolves against the declared record, by identity");
      });

      // AN EDGE NAMING AN ARBITER NO RECORD DECLARES IS DANGLING — the EXISTING finding, which
      // means the arbiter scheme joined the intra-registry set and not merely the endpoint set.
      await overRegistry(registry({
        "operator.md": actorRecord({ fields: { "target-setting": "[arbiter:absent]" } }),
      }), (model, fixture) => {
        assert.deepEqual(codesFor(model, fixture.pathOf("operator.md")), ["loop-graph-dangling-endpoint"]);
        assert.equal(messagesFor(model, fixture.pathOf("operator.md"))[0], "Endpoint does not name a declared node: arbiter:absent");
      });

      // THE KINDS NOTHING POINTS AT ARE STILL NOT ENDPOINTS. 58 widens this vocabulary for the one
      // edge it actually declares; speculative widening for `watcher:` and `anchor:` is refused,
      // and the refusal is visible here rather than only in the ADR.
      for (const raw of ["watcher:sentry", "anchor:gauge"]) {
        await overRegistry(registry({
          "operator.md": actorRecord({ fields: { "target-setting": `[${raw}]` } }),
          "sentry.md": watcherRecord58("sentry"),
          "gauge.md": anchorRecord58("gauge"),
        }), (model, fixture) => {
          assert.deepEqual(codesFor(model, fixture.pathOf("operator.md")), ["loop-bad-value"], raw);
          assert.equal(messagesFor(model, fixture.pathOf("operator.md"))[0], `Invalid value for target-setting: ${raw}`, `${raw}: the finding names the edge key`);
        });
      }
      // AND THE ENDPOINT VOCABULARY HAS WIDENED BY THE ARBITER ALONE.
      assert.deepEqual(
        [...ENDPOINT_SCHEMES],
        ["loop", "actor", "item", "command", "config", "module", "arbiter"],
        "52's six, plus arbiter, in that order — no watcher, no anchor",
      );
    },
  },

  {
    name: "loops-record/58 the per-kind admitted-key table (table)",
    run: async () => {
      for (const row of KIND_KEY_ADMISSION_58_CASES) {
        const stem = "subject";
        // A kind's OWN key is authored by the builder already; the table's job is the cross
        // product, so the key is authored explicitly on top of a complete record either way.
        await overRegistry(registry({
          [`${stem}.md`]: recordOfKind58(row.kind, stem, { [row.key]: row.value }),
        }), (model, fixture) => {
          const label = `${row.kind} | ${row.key}`;
          const node = nodeFor(model, fixture.pathOf(`${stem}.md`));
          const refused = findingsFor(model, fixture.pathOf(`${stem}.md`))
            .filter((finding) => finding.code === "loop-key-not-admitted-for-kind" && finding.message.includes(row.key));
          if (row.admits) {
            assert.deepEqual(refused, [], `${label}: admits the key`);
            const home = row.edge ? node.edges : node.fields;
            assert.ok(home[row.key], `${label}: …and the value reaches the model`);
          } else {
            assert.equal(refused.length, 1, `${label}: reports a key not admitted for kind`);
            assert.equal(refused[0].message, `Key ${row.key} is not admitted for kind ${row.kind}`, `${label}: naming the key and the kind`);
            assert.equal(row.key in node.fields, false, `${label}: and the value it declared is not parsed onto the node`);
            assert.equal(row.key in node.edges, false, `${label}: nor onto its edges`);
          }
          assert.equal(ADMITTED_KEYS[row.kind].has(row.key), row.admits, `${label}: the vocabulary itself agrees`);
        });
      }
      // The three new keys land on ONE kind only — decided over the vocabulary, so the table above
      // could not be satisfied by a loader that admitted them everywhere and reported nothing.
      for (const key of ["resolves", "priority", "dwell"]) {
        assert.deepEqual(
          [...NODE_KINDS].filter((kind) => ADMITTED_KEYS[kind].has(key)),
          ["arbiter"],
          `${key}: admitted on the arbiter and on no other kind`,
        );
      }
    },
  },

  // ————— milestone 58 / story 00 · task 02 — `02_an-arbiter-cannot-act.feature` ————————

  {
    name: "loops-record/58 an arbiter has no vocabulary in which to say it acts, measures, cycles or grounds itself",
    run: async () => {
      // THE REFUSAL IS THE LOADER'S, NOT A CHECK'S. This suite imports the loader and nothing
      // else (its own `loops-record/05` case proves the import list by source scan), so the
      // finding below is already present in a model no check has been run over.
      await overRegistry(registry({
        "trade-off.md": arbiterRecord58("trade-off", { actuator: "[command:work:next]" }),
      }), (model, fixture) => {
        const anchored = findingsFor(model, fixture.pathOf("trade-off.md"));
        assert.deepEqual(anchored.map((finding) => finding.code), ["loop-key-not-admitted-for-kind"],
          "the existing key-not-admitted-for-kind finding, and it is the ONLY finding raised for the actuator key");
        assert.equal(anchored[0].message, "Key actuator is not admitted for kind arbiter",
          "the finding's message names the actuator key AND the arbiter kind");
        assert.equal(anchored[0].severity, "error");
        assert.equal("actuator" in nodeFor(model, fixture.pathOf("trade-off.md")).fields, false,
          "the value it declared is not parsed onto the node");
      });

      await overRegistry(registry({
        "measured.md": arbiterRecord58("measured", { measurement: "[module:src/work/loops.mjs#loadLoops]" }),
      }), (model, fixture) => {
        assert.deepEqual(codesFor(model, fixture.pathOf("measured.md")), ["loop-key-not-admitted-for-kind"],
          "loaded without running any check, the finding is already present");
      });

      // A LOOP MAY STILL DECLARE ALL FOUR — three on the loop, `ground` on the actor. The
      // restriction is per kind, and a global one would have broken every shipped loop record.
      await overRegistry(registry({
        "alpha.md": renderRecord(loopRecord({
          fields: {
            actuator: "[command:work:next]",
            measurement: "[module:src/work/loops.mjs#loadLoops]",
            cadence: "event:per-item",
          },
        }), "alpha"),
        "operator.md": actorRecord({ fields: { ground: "exogenous" } }),
      }), (model, fixture) => {
        assert.deepEqual(model.findings, [], "no finding is raised against any of those keys");
        const loop = nodeFor(model, fixture.pathOf("alpha.md"));
        assert.equal(loop.fields.actuator[0].raw, "command:work:next");
        assert.equal(loop.fields.measurement[0].raw, "module:src/work/loops.mjs#loadLoops");
        assert.equal(loop.fields.cadence.trigger, "per-item");
        assert.equal(nodeFor(model, fixture.pathOf("operator.md")).fields.ground.value, "exogenous");
      });

      // A KEY NO KIND ADMITS IS REFUSED AS UNKNOWN, not as a key admitted elsewhere — which is
      // the whole distinction between the two admission codes, and the one ADR-004 §5 relies on
      // when it refuses the dead-band outright rather than declaring an unreadable field.
      await overRegistry(registry({
        "trade-off.md": arbiterRecord58("trade-off", { "dead-band": "0.05" }),
      }), (model, fixture) => {
        assert.deepEqual(codesFor(model, fixture.pathOf("trade-off.md")), ["loop-unknown-key"]);
        assert.equal(messagesFor(model, fixture.pathOf("trade-off.md"))[0], "Unknown loop-record key: dead-band");
      });
      for (const kind of NODE_KINDS) {
        assert.equal(ADMITTED_KEYS[kind].has("dead-band"), false, `${kind}: no kind admits that key`);
      }
      assert.equal(ADMITTED_KEYS.all.has("dead-band"), false, "…and it is outside the union too");
    },
  },

  {
    name: "loops-record/58 the four keys by which a node acts, measures, cycles or grounds itself (table)",
    run: async () => {
      for (const row of FOUR_KEYS_BY_KIND_58_CASES) {
        await overRegistry(registry({
          "subject.md": recordOfKind58(row.kind, "subject", { [row.key]: row.value }),
        }), (model, fixture) => {
          const label = `${row.key} | ${row.kind}`;
          const refused = findingsFor(model, fixture.pathOf("subject.md"))
            .filter((finding) => finding.code === "loop-key-not-admitted-for-kind" && finding.message.includes(row.key));
          assert.equal(refused.length, row.admits ? 0 : 1, `${label}: ${row.admits ? "admits the key" : "reports a key not admitted for kind"}`);
          if (!row.admits) {
            assert.equal(refused[0].message, `Key ${row.key} is not admitted for kind ${row.kind}`, label);
            assert.equal(row.key in nodeFor(model, fixture.pathOf("subject.md")).fields, false, `${label}: not parsed onto the node`);
          }
          assert.equal(ADMITTED_KEYS[row.kind].has(row.key), row.admits, `${label}: the vocabulary itself agrees`);
        });
      }
      // The table covers every kind 58 declared for every one of the four keys. It is bound row-for-
      // row to 58's own Examples block, which is immutable, so the SIXTH kind's four rows live in
      // 59/00's own table (`AUDITOR_OMITS_59_CASES`) rather than being appended here — and the sweep
      // below is what stops the two tables between them leaving a kind undriven.
      assert.equal(FOUR_KEYS_BY_KIND_58_CASES.length, 4 * 5, "four keys across the five kinds 58 declared");
      for (const key of ["actuator", "measurement", "cadence", "ground"]) {
        const driven = new Set(FOUR_KEYS_BY_KIND_58_CASES.filter((row) => row.key === key).map((row) => row.kind));
        for (const kind of NODE_KINDS) {
          assert.equal(
            driven.has(kind) || AUDITOR_OMITS_59_CASES.some((row) => row.key === key) || kind === "auditor",
            true,
            `${key} x ${kind}: every declared kind is driven by one of the two tables`,
          );
        }
      }
      assert.equal(
        FOUR_KEYS_BY_KIND_58_CASES.filter((row) => row.kind === "arbiter" && row.admits).length,
        0,
        "and one kind admits none of them",
      );
    },
  },

  {
    name: "loops-record/58 every Examples row of 58/00's record features is driven by a case",
    run: async () => {
      // TRACEABILITY, MECHANISED. Each table above is bound to the Examples block it mechanises by
      // ROW COUNT and by HEADER, parsed from the feature on disk. A row deleted from a table would
      // otherwise be a row that silently stopped being driven — 52's ledger exists for exactly this
      // failure, and 58's cases are outside that ledger by construction (its set equality is over
      // 52's own twenty features), so the binding is made here instead of being left unmade.
      for (const { feature, tables } of TRACED_58_TABLES) {
        const parsed = examplesTables(await readFile(path.join(REPO_ROOT_58, feature), "utf8"));
        assert.equal(parsed.length, tables.length, `${feature}: one traced table per Examples block`);
        for (const [index, entry] of tables.entries()) {
          assert.equal(entry.cases.length, parsed[index].rows.length, `${feature} table ${index}: a case per row`);
          assert.deepEqual(parsed[index].header, entry.header, `${feature} table ${index}: the feature's own column names`);
          // THE CELL TEXT, NOT JUST THE SHAPE. Row count and header alone are satisfied by a table
          // whose rows were rewritten — measured at review: flipping cell text in three features
          // left every case green. Each case's first-column property must equal the feature's own
          // first-column cell, in row order, so a row EDITED is caught as loudly as a row deleted.
          assert.deepEqual(
            entry.cases.map((row) => row[entry.header[0]]),
            parsed[index].rows.map((row) => row[0]),
            `${feature} table ${index}: each case names the feature's own first-column cell, in row order`,
          );
        }
      }
    },
  },
  // ————— milestone 59 / story 00 · task 00 — `00_a-sixth-kind.feature` —————————————————

  {
    name: "loops-record/59 the sixth kind parses as its own node, and the five before it are read as themselves",
    run: async () => {
      // ONE LOAD, SIX KINDS. The re-classification claim is only decidable over a model that
      // contains all six: a loader that read `auditor` as the fallback would still report the
      // auditor's own kind correctly if the auditor were alone in the directory.
      await overRegistry(registry({
        "alpha.md": loopRecord(),
        "operator.md": actorRecord(),
        "gauge.md": anchorRecord58("gauge"),
        "sentry.md": watcherRecord58("sentry"),
        "trade-off.md": arbiterRecord58("trade-off"),
        "gates.md": auditorRecord59("gates", { escalation: "actor:operator" }),
      }), (model, fixture) => {
        assert.deepEqual(model.findings, [], "the six declared kinds coexist with no finding at all");
        const auditor = nodeFor(model, fixture.pathOf("gates.md"));
        assert.equal(auditor.kind, "auditor", "its kind is reported as auditor");
        assert.equal(auditor.id, "auditor:gates", "…and the id it declares is readable off the node");
        assert.equal(auditor.title, "gates", "…as is the title");

        // NONE OF THE FIVE IS RE-CLASSIFIED AS THE KIND THIS STORY ADDS.
        assert.deepEqual(
          Object.fromEntries(model.nodes.map((node) => [node.id, node.kind])),
          {
            "actor:operator": "actor",
            "anchor:gauge": "anchor",
            "arbiter:trade-off": "arbiter",
            "auditor:gates": "auditor",
            "loop:alpha": "loop",
            "watcher:sentry": "watcher",
          },
          "each is parsed as the kind it declares",
        );
        assert.equal(model.nodes.filter((node) => node.kind === "auditor").length, 1, "exactly one node is the new kind");
      });

      // A KIND NOBODY HAS DECLARED IS STILL REFUSED, and the value is quoted back so an author can
      // see which of the two — the word or the vocabulary — is wrong. `inspector` and `reviewer` are
      // the words a reader reaches for first, which is what makes them worth driving.
      for (const kind of ["inspector", "reviewer", "Auditor"]) {
        await overRegistry(registry({
          "outside.md": auditorRecord59("outside", { kind }),
        }), (model, fixture) => {
          const bad = findingsFor(model, fixture.pathOf("outside.md")).find((finding) => finding.code === "loop-bad-value");
          assert.ok(bad, `${kind}: a bad-value finding is raised`);
          assert.equal(bad.message, `Invalid value for kind: ${kind}`, `${kind}: …naming the kind key and quoting the value`);
          assert.equal(model.nodes.some((node) => node.kind === kind), false, `${kind}: and no node is parsed as the unrecognised kind`);
          assert.equal(NODE_KINDS.has(kind), false, `${kind}: the vocabulary itself agrees`);
        });
      }

      // AN AUDITOR WHOSE ID DOES NOT NAME ITS KIND IS REFUSED by the EXISTING id-mismatch rule,
      // which names the id it expected — and the other five kinds' identity findings are what they
      // were, decided in the SAME load rather than remembered.
      await overRegistry(registry({
        "mismatch.md": auditorRecord59("mismatch", { id: "loop:mismatch" }),
        "loop-mismatch.md": renderRecord(loopRecord({ id: "auditor:loop-mismatch" }), "loop-mismatch"),
        "actor-mismatch.md": renderRecord(actorRecord({ id: "loop:actor-mismatch" }), "actor-mismatch"),
        "anchor-mismatch.md": anchorRecord58("anchor-mismatch", { id: "loop:anchor-mismatch" }),
        "watcher-mismatch.md": watcherRecord58("watcher-mismatch", { id: "loop:watcher-mismatch" }),
        "arbiter-mismatch.md": arbiterRecord58("arbiter-mismatch", { id: "loop:arbiter-mismatch" }),
      }), (model, fixture) => {
        assert.equal(messagesFor(model, fixture.pathOf("mismatch.md"))[0], "id loop:mismatch must equal auditor:mismatch");
        assert.deepEqual(
          ["loop-mismatch.md", "actor-mismatch.md", "anchor-mismatch.md", "watcher-mismatch.md", "arbiter-mismatch.md"]
            .map((name) => messagesFor(model, fixture.pathOf(name))[0]),
          [
            "id auditor:loop-mismatch must equal loop:loop-mismatch",
            "id loop:actor-mismatch must equal actor:actor-mismatch",
            "id loop:anchor-mismatch must equal anchor:anchor-mismatch",
            "id loop:watcher-mismatch must equal watcher:watcher-mismatch",
            "id loop:arbiter-mismatch must equal arbiter:arbiter-mismatch",
          ],
          "the identity findings for the other five kinds are unchanged",
        );
        for (const name of ["mismatch.md", "loop-mismatch.md", "actor-mismatch.md", "anchor-mismatch.md", "watcher-mismatch.md", "arbiter-mismatch.md"]) {
          assert.deepEqual(codesFor(model, fixture.pathOf(name)), ["loop-id-mismatch"], `${name}: one slip, one finding`);
        }
      });
    },
  },

  {
    name: "loops-record/59 the kind vocabulary is closed at six, and every kind the five earlier milestones declared is still a member",
    run: async () => {
      // READ BACK OFF THE VOCABULARY ITSELF, in declaration order — 55 took this enum from two to
      // three, 57 to four, 58 to five, and this is the fourth widening. A member DROPPED fails here
      // exactly as loudly as a member invented.
      assert.deepEqual([...NODE_KINDS], ["loop", "actor", "anchor", "watcher", "arbiter", "auditor"],
        "exactly the six declared kinds");
      for (const kind of ["loop", "actor", "anchor", "watcher", "arbiter"]) {
        assert.equal(NODE_KINDS.has(kind), true, `${kind}: still a member after the widening`);
      }
      // …AND EVERY ONE OF THE SIX IS A KIND A RECORD CAN ACTUALLY BE, decided by loading one of
      // each rather than by reading the set twice. A set member with no admitted-key entry would
      // parse to a node that admits nothing at all.
      for (const kind of NODE_KINDS) {
        await overRegistry(registry({ "subject.md": recordOfKind59(kind, "subject") }), (model, fixture) => {
          assert.deepEqual(codesFor(model, fixture.pathOf("subject.md")), [], `${kind}: a complete record of this kind parses clean`);
          assert.equal(nodeFor(model, fixture.pathOf("subject.md")).kind, kind, `${kind}: and reports the kind it declared`);
        });
        assert.equal(Object.hasOwn(ADMITTED_KEYS, kind), true, `${kind}: has an admitted-key set of its own`);
      }
      assert.deepEqual(Object.keys(ADMITTED_KEYS).sort(), ["all", ...NODE_KINDS].sort(),
        "the admitted-key map is derived from the kind vocabulary — a seventh kind with no set of its own fails here");
    },
  },

  // ————— milestone 59 / story 00 · task 01 — `01_what-an-auditor-must-declare.feature` ——

  {
    name: "loops-record/59 the auditor's four required declarations (table)",
    run: async () => {
      for (const row of AUDITOR_REQUIRED_59_CASES) {
        await overRegistry(registry({
          "gates.md": auditorRecord59("gates", { [row.key]: null }),
        }), (model, fixture) => {
          const missing = findingsFor(model, fixture.pathOf("gates.md"))
            .filter((finding) => finding.code === "loop-missing-field");
          assert.deepEqual(missing.map((finding) => finding.message), [`Required field is missing: ${row.key}`],
            `${row.key}: a missing-field finding names it, and names nothing else`);
          assert.equal(missing[0].severity, "error", `${row.key}: and it gates`);
          // NOT PARSED AS A COMPLETE AUDITOR: the key it omitted is absent from the model, so
          // nothing downstream can read a value the record never supplied.
          const node = nodeFor(model, fixture.pathOf("gates.md"));
          assert.equal(row.key in node.fields, false, `${row.key}: nothing was invented on the record's behalf`);
        });
      }
      // NON-VACUITY, BOTH WAYS: the same record with every key present raises nothing, and the four
      // are exactly the kind's required set as the loader itself computes it.
      await overRegistry(registry({ "gates.md": auditorRecord59("gates") }), (model, fixture) => {
        assert.deepEqual(codesFor(model, fixture.pathOf("gates.md")), [], "the complete record raises nothing");
      });
      for (const row of AUDITOR_REQUIRED_59_CASES) {
        assert.equal(ADMITTED_KEYS.auditor.has(row.key), true, `${row.key}: admitted as well as required`);
      }
    },
  },

  {
    name: "loops-record/59 an auditor with no declared subject is not an auditor of everything",
    run: async () => {
      await overRegistry(registry({
        "gates.md": auditorRecord59("gates", { audits: "[]" }),
      }), (model, fixture) => {
        assert.deepEqual(codesFor(model, fixture.pathOf("gates.md")), ["loop-empty-list"],
          "the existing empty-list finding, and only it — the gates behind it are never reached");
        assert.equal(messagesFor(model, fixture.pathOf("gates.md"))[0], "audits must not be empty",
          "…and the finding names the audits key");
        assert.equal("audits" in nodeFor(model, fixture.pathOf("gates.md")).fields, false,
          "an empty list is never a way to declare an auditor whose subject is everything");
      });
      // An empty list and an ABSENT key are different facts, and the loader keeps them apart — the
      // distinction 52/ADR-011 §5 drew, restated over the key this story adds.
      await overRegistry(registry({
        "gates.md": auditorRecord59("gates", { audits: null }),
      }), (model, fixture) => {
        assert.deepEqual(codesFor(model, fixture.pathOf("gates.md")), ["loop-missing-field"], "absence is a missing field");
      });
    },
  },

  {
    name: "loops-record/59 the instrument-pointer table — what an auditor may name as a subject (table)",
    run: async () => {
      // The six accepted forms are DECLARED ALONGSIDE the auditor, so "a declared loop id" is a
      // record in the directory rather than a string shaped like one.
      const neighbours = {
        "alpha.md": loopRecord(),
        "sentry.md": watcherRecord58("sentry"),
        "gauge.md": anchorRecord58("gauge"),
      };
      for (const row of AUDITS_POINTER_59_CASES) {
        await overRegistry(registry({
          ...neighbours,
          "gates.md": auditorRecord59("gates", { audits: `[${row.raw}]` }),
        }), (model, fixture) => {
          const node = nodeFor(model, fixture.pathOf("gates.md"));
          const codes = codesFor(model, fixture.pathOf("gates.md"));
          if (row.accepted) {
            assert.deepEqual(codes, [], `${row.pointer}: accepted as an instrument`);
            assert.equal(node.fields.audits.length, 1, `${row.pointer}: …and it reaches the model`);
            assert.equal(node.fields.audits[0].raw, row.raw, `${row.pointer}: verbatim`);
            assert.equal(node.fields.audits[0].kind, row.kind, `${row.pointer}: typed as ${row.kind}`);
            assert.equal(FIELD_KINDS.has(node.fields.audits[0].kind), true, `${row.pointer}: in the exported field-kind vocabulary`);
          } else {
            assert.deepEqual(codes, ["loop-bad-value"], `${row.pointer}: refused`);
            assert.equal(messagesFor(model, fixture.pathOf("gates.md"))[0], `Invalid value for audits: ${row.raw}`,
              `${row.pointer}: naming the audits key and quoting the value`);
            assert.equal("audits" in node.fields, false, `${row.pointer}: and nothing reached the model`);
          }
        });
      }
      // A REGISTRY ID IS A REGISTRY ID, WHATEVER SCHEME NAMES IT. `loop:`, `watcher:` and `anchor:`
      // all obey ONE slug grammar, in `splitUri`, because they all name a record in this directory.
      // NOT A TABLE ROW: the Examples block above is eight rows and immutable, and none of them is a
      // malformed id. It is pinned here instead because it is the only behaviour that distinguishes
      // `INTRA_REGISTRY_SCHEMES` carrying the two new schemes from `INTRA_REGISTRY_SCHEMES` without
      // them — measured: without the widening, `audits: [watcher:bad slug]` is ADMITTED as an
      // instrument, an id with a space in it that no record can ever have. `loop:` is driven beside
      // them as the control, because it obeyed the rule before this milestone.
      for (const raw of ["anchor:bad_slug", "watcher:bad slug", "anchor:-leading-dash", "watcher:UPPER_CASE", "loop:bad_slug"]) {
        await overRegistry(registry({
          ...neighbours,
          "gates.md": auditorRecord59("gates", { audits: `[${raw}]` }),
        }), (model, fixture) => {
          assert.deepEqual(codesFor(model, fixture.pathOf("gates.md")), ["loop-bad-value"], `${raw}: refused`);
          assert.equal(messagesFor(model, fixture.pathOf("gates.md"))[0], `Invalid value for audits: ${raw}`, raw);
          assert.equal("audits" in nodeFor(model, fixture.pathOf("gates.md")).fields, false,
            `${raw}: an id no record could carry never reaches the model as an instrument`);
        });
      }

      // A WORK ITEM IS THE WORK. `item:` is an admissible ENDPOINT everywhere else in this registry
      // — that is what makes its absence here a decision rather than an oversight.
      assert.equal(ENDPOINT_SCHEMES.has("item"), true, "`item:` is still an endpoint scheme…");
      await overRegistry(registry({
        "alpha.md": renderRecord(loopRecord({ fields: { "data-feed": "[item:59/00]" } }), "alpha"),
        "gates.md": auditorRecord59("gates", { audits: "[item:59/00]" }),
      }), (model, fixture) => {
        assert.deepEqual(codesFor(model, fixture.pathOf("alpha.md")), [], "…and a loop may still feed on one");
        assert.deepEqual(codesFor(model, fixture.pathOf("gates.md")), ["loop-bad-value"], "…but an auditor may not audit one");
        assert.equal(model.nodes.some((node) => node.kind === "auditor" && "audits" in node.fields), false,
          "no node is parsed that audits a work item");
      });
    },
  },

  {
    name: "loops-record/59 an auditor's reading may not be a prose authority, and a loop's still may",
    run: async () => {
      const document = "prose:src/bundle/commands/verify.md";
      await overRegistry(registry({
        "gates.md": auditorRecord59("gates", { measurement: `[${document}]` }),
      }), (model, fixture) => {
        const findings = findingsFor(model, fixture.pathOf("gates.md"));
        assert.deepEqual(findings.map((finding) => finding.code), ["loop-bad-value"],
          "a bad-value finding, and it is the ONLY finding raised for the measurement key");
        assert.equal(findings[0].message, `Invalid value for measurement: ${document}`, "naming the measurement key");
        assert.equal(findings[0].severity, "error", "…at error");
        assert.equal("measurement" in nodeFor(model, fixture.pathOf("gates.md")).fields, false,
          "and the paragraph never reaches the model as a reading");
      });

      // THE DISTINCTION, DECIDED IN ONE LOAD OVER THE SAME VALUE. A loop and a watcher keep the
      // prose measurement they are allowed and keep the WARNING it earns them; the auditor's is an
      // ERROR. Different code, different severity, different fate for the value — which is how a
      // reader tells "you leaned on a document" from "an audit may not lean on one at all".
      await overRegistry(registry({
        "alpha.md": renderRecord(loopRecord({ fields: { measurement: `[${document}]` } }), "alpha"),
        "sentry.md": watcherRecord58("sentry", { measurement: `[${document}]` }),
        "gates.md": auditorRecord59("gates", { measurement: `[${document}]` }),
      }), (model, fixture) => {
        for (const name of ["alpha.md", "sentry.md"]) {
          const findings = findingsFor(model, fixture.pathOf(name));
          assert.deepEqual(findings.map((finding) => finding.code), ["loop-field-prose-only"], `${name}: parsed, and warned`);
          assert.equal(findings[0].severity, "warn", `${name}: the honesty warning it has carried since milestone 52`);
          assert.equal(findings[0].message, `measurement is backed only by prose: ${document}`, `${name}: naming the value`);
          assert.equal(nodeFor(model, fixture.pathOf(name)).fields.measurement[0].kind, "prose", `${name}: and neither is refused`);
        }
        const auditor = findingsFor(model, fixture.pathOf("gates.md"));
        assert.deepEqual(auditor.map((finding) => finding.code), ["loop-bad-value"], "the auditor's is a different code…");
        assert.equal(auditor[0].severity, "error", "…at a different severity…");
        assert.notEqual(auditor[0].message, `measurement is backed only by prose: ${document}`, "…with a different message");
      });

      // A MACHINE READING IS STILL A READING. The refusal is of the `prose:` scheme and not of the
      // key, so the three pointer schemes all land — otherwise the rule above would be unfalsifiable.
      for (const raw of ["module:src/work/loops.mjs#loadLoops", "command:work:doctor", "config:work.audit.anchorStaleDays"]) {
        await overRegistry(registry({
          "gates.md": auditorRecord59("gates", { measurement: `[${raw}]` }),
        }), (model, fixture) => {
          assert.deepEqual(codesFor(model, fixture.pathOf("gates.md")), [], `${raw}: a machine authority is admitted`);
          assert.equal(nodeFor(model, fixture.pathOf("gates.md")).fields.measurement[0].kind, "pointer", raw);
        });
      }
      // A MIXED LIST IS STILL REFUSED, ENTRY BY ENTRY — an auditor cannot smuggle a paragraph in
      // beside a pointer, which a whole-list rule would have let through.
      await overRegistry(registry({
        "gates.md": auditorRecord59("gates", { measurement: `[command:work:doctor, ${document}]` }),
      }), (model, fixture) => {
        assert.deepEqual(codesFor(model, fixture.pathOf("gates.md")), ["loop-bad-value"], "the prose entry alone is refused");
        assert.equal(messagesFor(model, fixture.pathOf("gates.md"))[0], `Invalid value for measurement: ${document}`);
        assert.deepEqual(
          nodeFor(model, fixture.pathOf("gates.md")).fields.measurement.map((entry) => entry.raw),
          ["command:work:doctor"],
          "…and the pointer beside it is kept",
        );
      });
    },
  },

  {
    name: "loops-record/59 the escalation is an actor, and a cadence outside the vocabulary is refused",
    run: async () => {
      // A BYPASS THAT TERMINATES INSIDE THE MACHINERY IS NOT A BYPASS. Every non-actor scheme this
      // registry knows is driven, so the rule is "must be an actor" and not "must not be a loop".
      for (const raw of ["loop:alpha", "arbiter:trade-off", "watcher:sentry", "anchor:gauge", "command:work:next", "unknown"]) {
        await overRegistry(registry({
          "gates.md": auditorRecord59("gates", { escalation: raw }),
        }), (model, fixture) => {
          assert.deepEqual(codesFor(model, fixture.pathOf("gates.md")), ["loop-bad-value"], `${raw}: refused`);
          assert.equal(messagesFor(model, fixture.pathOf("gates.md"))[0], `Invalid value for escalation: ${raw}`,
            `${raw}: the finding names the escalation key`);
          assert.equal("escalation" in nodeFor(model, fixture.pathOf("gates.md")).fields, false, `${raw}: nothing reached the model`);
        });
      }
      await overRegistry(registry({
        "operator.md": actorRecord(),
        "gates.md": auditorRecord59("gates", { escalation: "actor:operator" }),
      }), (model, fixture) => {
        assert.deepEqual(model.findings, [], "an actor is accepted");
        const escalation = nodeFor(model, fixture.pathOf("gates.md")).fields.escalation;
        assert.equal(escalation.kind, "ref", "…as a ref");
        assert.equal(escalation.scheme, "actor", "…in the actor scheme");
        assert.equal(escalation.operand, "operator", "…naming the actor");
      });

      // AN UNPARSEABLE CADENCE IS REFUSED AS IT IS FOR EVERY OTHER CYCLE — the EXISTING finding,
      // over the same three vocabularies a loop's cadence is decided against.
      for (const raw of ["quarterly", "periodic:2w", "event:per-eclipse"]) {
        await overRegistry(registry({
          "gates.md": auditorRecord59("gates", { cadence: raw }),
          "alpha.md": renderRecord(loopRecord({ fields: { cadence: raw } }), "alpha"),
        }), (model, fixture) => {
          for (const name of ["gates.md", "alpha.md"]) {
            assert.deepEqual(codesFor(model, fixture.pathOf(name)), ["loop-bad-value"], `${raw} on ${name}`);
            assert.equal(messagesFor(model, fixture.pathOf(name))[0], `Invalid value for cadence: ${raw}`,
              `${raw}: the existing cadence finding names the value`);
            assert.equal("cadence" in nodeFor(model, fixture.pathOf(name)).fields, false,
              `${raw}: no cadence is assumed on the record's behalf`);
          }
        });
      }
      // …and the vocabulary it IS decided against reaches the auditor unchanged.
      for (const raw of ["periodic:1d", "event:per-milestone"]) {
        await overRegistry(registry({ "gates.md": auditorRecord59("gates", { cadence: raw }) }), (model, fixture) => {
          assert.deepEqual(codesFor(model, fixture.pathOf("gates.md")), [], raw);
        });
      }
    },
  },

  // ————— milestone 59 / story 00 · task 02 — `02_an-auditor-cannot-act.feature` —————————

  {
    name: "loops-record/59 the ten keys an auditor has no vocabulary for (table)",
    run: async () => {
      // NO NEW FINDING CODE, AND THE CLAIM IS DECIDED OVER THE LOADER'S OWN FROZEN ARRAY rather
      // than over the cases below: 59 adds no code, so the array is what it was before this
      // milestone, member for member and in order.
      assert.deepEqual([...LOADER_FINDING_CODES], [...PRE_59_LOADER_CODES],
        "the loader's frozen code array did not grow — every refusal this milestone adds is an existing code");

      for (const row of AUDITOR_OMITS_59_CASES) {
        await overRegistry(registry({
          "gates.md": auditorRecord59("gates", { [row.key]: row.value }),
        }), (model, fixture) => {
          const anchored = findingsFor(model, fixture.pathOf("gates.md"));
          assert.deepEqual(anchored.map((finding) => finding.code), ["loop-key-not-admitted-for-kind"],
            `${row.key}: the EXISTING not-admitted-for-kind finding, and it is the only finding raised`);
          assert.equal(anchored[0].message, `Key ${row.key} is not admitted for kind auditor`,
            `${row.key}: naming the key AND the auditor kind`);
          assert.equal(anchored[0].severity, "error", `${row.key}: and it gates`);
          const node = nodeFor(model, fixture.pathOf("gates.md"));
          assert.equal(row.key in node.fields, false, `${row.key}: the value it declared is not parsed onto the node`);
          assert.equal(row.key in node.edges, false, `${row.key}: nor onto its edges`);
          for (const finding of anchored) {
            assert.equal(PRE_59_LOADER_CODES.includes(finding.code), true,
              `${row.key}: no finding code that did not exist before this milestone is emitted`);
          }
          assert.equal(ADMITTED_KEYS.auditor.has(row.key), false, `${row.key}: the vocabulary itself agrees`);
          // PER KIND, NOT A DELETION: every one of the ten is still a key SOME kind admits, which is
          // what makes the omission the design rather than the vocabulary shrinking.
          assert.equal(ADMITTED_KEYS.all.has(row.key), true, `${row.key}: still admitted by some kind`);
        });
      }
      assert.equal(AUDITOR_OMITS_59_CASES.length, 10, "ten omissions, one row each");
    },
  },

  {
    name: "loops-record/59 the kinds that do admit those keys are unaffected by the widening",
    run: async () => {
      await overRegistry(registry({
        "alpha.md": renderRecord(loopRecord({
          fields: {
            actuator: "[command:work:next]",
            reference: "[module:src/work/loops.mjs#loadLoops]",
            layer: "operational",
            owner: "actor:product-owner",
            ceiling: "none",
          },
        }), "alpha"),
        "sentry.md": watcherRecord58("sentry", { counter: "contract changes", determinism: "counter" }),
        "gauge.md": anchorRecord58("gauge", { ground: "process-exit" }),
      }), (model, fixture) => {
        assert.deepEqual(model.findings, [], "no key gains a finding from this milestone's widening");
        const loop = nodeFor(model, fixture.pathOf("alpha.md"));
        assert.equal(loop.fields.actuator[0].raw, "command:work:next");
        assert.equal(loop.fields.reference[0].raw, "module:src/work/loops.mjs#loadLoops");
        assert.equal(loop.fields.layer.value, "operational");
        assert.equal(loop.fields.owner.raw, "actor:product-owner");
        assert.equal(loop.fields.ceiling[0].kind, "none");
        const watcher = nodeFor(model, fixture.pathOf("sentry.md"));
        assert.equal(watcher.fields.counter.raw, "contract changes");
        assert.equal(watcher.fields.determinism.value, "counter");
        assert.equal(nodeFor(model, fixture.pathOf("gauge.md")).fields.ground.value, "process-exit");
      });
      // Each of the ten is admitted SOMEWHERE, decided over the vocabulary rather than over the one
      // fixture above — a key admitted by no kind at all would make the table's refusals vacuous.
      for (const row of AUDITOR_OMITS_59_CASES) {
        const hosts = [...NODE_KINDS].filter((kind) => ADMITTED_KEYS[kind].has(row.key));
        assert.ok(hosts.length > 0, `${row.key}: still admitted on ${hosts.join(", ") || "no kind at all"}`);
        assert.equal(hosts.includes("auditor"), false, `${row.key}: and never on the auditor`);
      }
    },
  },

  {
    name: "loops-record/59 an auditor declares two edges and no others, whatever order it is written in",
    run: async () => {
      // 59/ADR-001 §5a — `data-feed` and `reporting`, and nothing else. Each of the other four is a
      // different way the auditor would stop reporting and start participating, and the sharpest is
      // `monitoring`: `checkPairing` adds EVERY source's monitoring endpoint to its `paired` set, so
      // an auditor monitoring a loop would clear that loop's `loop-unpaired-optimizer` — a
      // `GATING_CODES` member — BY AUDITING IT. The audit would be buying the green gate it exists
      // to report on. `target-setting` would make it an owner of some loop's reference; `veto` and
      // `parameter-tuning` would make it an arbiter of what it audits.
      //
      // The keys stay ADMITTED — §1 freezes the auditor's set as its four declarations plus the edge
      // keys — so the refusal is on the ENDPOINT, with the loader's existing bad-value code.
      const REFUSED = ["target-setting", "veto", "parameter-tuning", "monitoring"];
      for (const key of REFUSED) {
        assert.equal(ADMITTED_KEYS.auditor.has(key), true, `${key}: the key is admitted for the kind…`);
        await overRegistry(registry({
          "alpha.md": loopRecord(),
          "gates.md": auditorRecord59("gates", { [key]: "[loop:alpha]" }),
        }), (model, fixture) => {
          const findings = findingsFor(model, fixture.pathOf("gates.md"));
          assert.deepEqual(findings.map((finding) => finding.code), ["loop-bad-value"],
            `${key}: …and the edge is REPORTED rather than accepted, with no code this milestone invented`);
          assert.equal(findings[0].message, `Invalid value for ${key}: loop:alpha`, `${key}: the finding names the edge key`);
          assert.equal(key in nodeFor(model, fixture.pathOf("gates.md")).edges, false,
            `${key}: no such edge reaches the graph, so nothing downstream can read it`);
          // …AND THE SAME EDGE ON A KIND THAT MAY DECLARE IT IS UNTOUCHED, so each refusal is about
          // the auditor and not about the key.
          assert.deepEqual(codesFor(model, fixture.pathOf("alpha.md")), [], `${key}: the loop is unaffected`);
        });
      }
      // THE HOLE, NAMED AND SHUT. A loop with an actuator and `optimizing: true` is what
      // `loop-unpaired-optimizer` is about; an auditor monitoring it must not be what pairs it.
      // Decided on the LOADER, which is where 59/00 can decide it: the edge never reaches the model,
      // so no check — present or future — can read a pairing off it.
      await overRegistry(registry({
        "alpha.md": renderRecord(loopRecord({ fields: { optimizing: "true" } }), "alpha"),
        "gates.md": auditorRecord59("gates", { monitoring: "[loop:alpha]" }),
      }), (model, fixture) => {
        const reachable = model.nodes.flatMap((node) => Object.entries(node.edges))
          .filter(([key]) => key === "monitoring")
          .flatMap(([, endpoints]) => endpoints.map((entry) => entry.raw));
        assert.deepEqual(reachable, [], "no monitoring edge exists in the model at all — the auditor cannot pair a loop");
        assert.deepEqual(codesFor(model, fixture.pathOf("gates.md")), ["loop-bad-value"]);
      });
      // A WATCHER STILL PAIRS, which is what makes the refusal above a rule about the auditor rather
      // than a rule about `monitoring`.
      await overRegistry(registry({
        "alpha.md": renderRecord(loopRecord({ fields: { optimizing: "true" } }), "alpha"),
        "sentry.md": watcherRecord58("sentry", { monitoring: "[loop:alpha]" }),
      }), (model, fixture) => {
        assert.deepEqual(model.findings, [], "a watcher's monitoring edge is untouched");
        assert.equal(nodeFor(model, fixture.pathOf("sentry.md")).edges.monitoring[0].raw, "loop:alpha");
      });

      // THE TWO IT DOES DECLARE BOTH LAND — otherwise the four refusals above would be satisfied by
      // an auditor that could declare no edge at all, which is not what §5a says.
      for (const key of ["data-feed", "reporting"]) {
        assert.equal(EDGE_KEYS.has(key), true, key);
        await overRegistry(registry({
          "operator.md": actorRecord(),
          "gates.md": auditorRecord59("gates", { escalation: "actor:operator", [key]: "[actor:operator]" }),
        }), (model, fixture) => {
          assert.deepEqual(model.findings, [], `${key}: accepted`);
          assert.deepEqual(Object.keys(nodeFor(model, fixture.pathOf("gates.md")).edges), [key], `${key}: and it is on the node`);
          assert.strictEqual(nodeFor(model, fixture.pathOf("gates.md")).edges[key][0].resolved, true, key);
        });
      }
      assert.equal(REFUSED.length + 2, EDGE_KEYS.size, "the two admitted and the four refused are the whole edge vocabulary");

      await overRegistry(registry({
        "operator.md": actorRecord({ fields: { "target-setting": "[loop:alpha]" } }),
        "alpha.md": loopRecord(),
      }), (model, fixture) => {
        assert.deepEqual(model.findings, [], "an actor still sets a loop's target");
        assert.equal(nodeFor(model, fixture.pathOf("operator.md")).edges["target-setting"][0].resolved, true);
      });

      // THE REFUSAL SURVIVES BEING WRITTEN IN A DIFFERENT ORDER. `actuator` is authored FIRST, ahead
      // of every required key, and two of the required keys are missing — so the ordering claim is
      // decided against a record whose authored order and schema order genuinely disagree.
      const scrambled = renderFields58("scrambled", {
        actuator: "[command:work:next]",
        id: "auditor:scrambled",
        kind: "auditor",
        title: "scrambled",
        escalation: "actor:steward",
        audits: "[command:work:doctor]",
      });
      await overRegistry(registry({ "scrambled.md": scrambled }), (model, fixture) => {
        const findings = findingsFor(model, fixture.pathOf("scrambled.md"));
        const notAdmitted = findings.filter((finding) => finding.code === "loop-key-not-admitted-for-kind");
        assert.deepEqual(notAdmitted.map((finding) => finding.message), ["Key actuator is not admitted for kind auditor"],
          "the not-admitted-for-kind finding still names the actuator");
        assert.deepEqual(
          findings.filter((finding) => finding.code === "loop-missing-field").map((finding) => finding.message),
          ["Required field is missing: measurement", "Required field is missing: cadence"],
          "the required-key findings are unchanged by the ordering — schema key order, not authored order",
        );
      });
    },
  },

  // ————— milestone 59 / story 00 · task 03 — `03_the-report-is-an-edge…feature` ————————

  {
    name: "loops-record/59 the report is an edge out of the auditor",
    run: async () => {
      await overRegistry(registry({
        "operator.md": actorRecord(),
        "gates.md": auditorRecord59("gates", { escalation: "actor:operator", reporting: "[actor:operator]" }),
      }), (model, fixture) => {
        assert.deepEqual(model.findings, [], "the edge parses with no finding");
        const edges = nodeFor(model, fixture.pathOf("gates.md")).edges;
        assert.deepEqual(Object.keys(edges), ["reporting"], "an OUTBOUND edge of the auditor, and its only one");
        assert.equal(edges.reporting[0].raw, "actor:operator", "the actor is its endpoint");
        assert.strictEqual(edges.reporting[0].resolved, true, "…resolved against the declared record, by identity");
        assert.equal("reporting" in nodeFor(model, fixture.pathOf("operator.md")).edges, false,
          "and the actor declares nothing — the edge is the auditor's, in one direction");
      });

      // THE EDGE MAY NAME ANY NODE THE REGISTRY ALREADY ADMITS AS AN ENDPOINT. No new endpoint
      // scheme is needed for the report to land anywhere it should.
      await overRegistry(registry({
        "operator.md": actorRecord(),
        "alpha.md": loopRecord(),
        "gates.md": auditorRecord59("gates", { escalation: "actor:operator", reporting: "[actor:operator, loop:alpha]" }),
      }), (model, fixture) => {
        assert.deepEqual(model.findings, [], "no bad-value finding names the reporting key");
        assert.deepEqual(
          nodeFor(model, fixture.pathOf("gates.md")).edges.reporting.map((entry) => entry.raw),
          ["actor:operator", "loop:alpha"],
          "both edges are parsed, in the order authored",
        );
      });

      // A REPORTING EDGE TO A NODE NOBODY DECLARES IS DANGLING — the EXISTING finding, which means
      // the sixth edge key joined the lane the other five are already in rather than sitting outside
      // the reference-integrity check.
      await overRegistry(registry({
        "gates.md": auditorRecord59("gates", { reporting: "[actor:nobody]" }),
      }), (model, fixture) => {
        assert.deepEqual(codesFor(model, fixture.pathOf("gates.md")), ["loop-graph-dangling-endpoint"]);
        assert.equal(messagesFor(model, fixture.pathOf("gates.md"))[0], "Endpoint does not name a declared node: actor:nobody",
          "the existing dangling-endpoint finding names the missing endpoint");
      });
    },
  },

  {
    name: "loops-record/59 nothing points at an auditor, and the edge vocabulary is closed at six",
    run: async () => {
      // NO RECORD MAY NAME AN AUDITOR AS AN ENDPOINT — `ENDPOINT_SCHEMES` is unchanged, which is
      // 58/ADR-003 §6's precedent applied: widen the endpoint vocabulary only for an edge actually
      // declared. Driven over EVERY edge key, so the claim is about the scheme and not about
      // `monitoring`, and over a DECLARED auditor, so it is not a dangling-endpoint result wearing
      // another name.
      assert.equal(ENDPOINT_SCHEMES.has("auditor"), false, "`auditor:` is not an admissible endpoint scheme");
      for (const key of EDGE_KEYS) {
        await overRegistry(registry({
          "alpha.md": renderRecord(loopRecord({ fields: { [key]: "[auditor:gates]" } }), "alpha"),
          "gates.md": auditorRecord59("gates"),
        }), (model, fixture) => {
          assert.deepEqual(codesFor(model, fixture.pathOf("alpha.md")), ["loop-bad-value"], `${key}: refused`);
          assert.equal(messagesFor(model, fixture.pathOf("alpha.md"))[0], `Invalid value for ${key}: auditor:gates`,
            `${key}: a bad-value finding names the edge key`);
          const reachable = model.nodes.flatMap((node) => Object.values(node.edges).flat()).map((entry) => entry.raw);
          assert.equal(reachable.includes("auditor:gates"), false,
            `${key}: the auditor is not reachable as the endpoint of any edge`);
        });
      }

      // THE EDGE VOCABULARY, READ BACK. Six keys, in declaration order, and the five that existed
      // before this milestone are all still members — a key DROPPED fails here too.
      assert.deepEqual([...EDGE_KEYS],
        ["data-feed", "target-setting", "monitoring", "veto", "parameter-tuning", "reporting"],
        "exactly the six declared edge keys");
      for (const key of ["data-feed", "target-setting", "monitoring", "veto", "parameter-tuning"]) {
        assert.equal(EDGE_KEYS.has(key), true, `${key}: still a member`);
      }
      // `reporting` IS NOT A REUSE OF `monitoring`, and the two are distinguishable on the model —
      // which is the whole reason ADR-001 §3 spent a sixth key rather than overloading the fifth.
      await overRegistry(registry({
        "alpha.md": loopRecord(),
        "sentry.md": watcherRecord58("sentry", { monitoring: "[loop:alpha]" }),
        "gates.md": auditorRecord59("gates", { reporting: "[loop:alpha]" }),
      }), (model, fixture) => {
        assert.deepEqual(model.findings, []);
        assert.deepEqual(Object.keys(nodeFor(model, fixture.pathOf("sentry.md")).edges), ["monitoring"]);
        assert.deepEqual(Object.keys(nodeFor(model, fixture.pathOf("gates.md")).edges), ["reporting"]);
      });

      // AN EDGE KEY NOBODY HAS DECLARED IS STILL REFUSED — as an UNKNOWN key, not as a key admitted
      // elsewhere, which is the distinction between the two admission codes.
      for (const key of ["broadcast", "reports", "reporting-to"]) {
        await overRegistry(registry({
          "gates.md": auditorRecord59("gates", { [key]: "[actor:steward]" }),
        }), (model, fixture) => {
          assert.deepEqual(codesFor(model, fixture.pathOf("gates.md")), ["loop-unknown-key"], `${key}: refused`);
          assert.equal(messagesFor(model, fixture.pathOf("gates.md"))[0], `Unknown loop-record key: ${key}`, key);
          assert.equal(key in nodeFor(model, fixture.pathOf("gates.md")).edges, false, `${key}: no edge is parsed from it`);
          assert.equal(EDGE_KEYS.has(key), false, `${key}: the vocabulary itself agrees`);
          assert.equal(ADMITTED_KEYS.all.has(key), false, `${key}: …and it is outside the union too`);
        });
      }
    },
  },

  {
    name: "loops-record/59 every Examples row of 59/00's record features is driven by a case",
    run: async () => {
      // TRACEABILITY, MECHANISED — 58's binding, extended to this story's tables. Each is bound to
      // the Examples block it mechanises by ROW COUNT and by HEADER, parsed from the feature on
      // disk, so a row deleted from a table would otherwise be a row that silently stopped running.
      for (const { feature, tables } of TRACED_59_TABLES) {
        const parsed = examplesTables(await readFile(path.join(REPO_ROOT_58, feature), "utf8"));
        assert.equal(parsed.length, tables.length, `${feature}: one traced table per Examples block`);
        for (const [index, entry] of tables.entries()) {
          assert.equal(entry.cases.length, parsed[index].rows.length, `${feature} table ${index}: a case per row`);
          assert.deepEqual(parsed[index].header, entry.header, `${feature} table ${index}: the feature's own column names`);
          // THE CELL TEXT, NOT JUST THE SHAPE. Row count and header alone are satisfied by a table
          // whose rows were rewritten — measured at review: flipping cell text in three features
          // left every case green. Each case's first-column property must equal the feature's own
          // first-column cell, in row order, so a row EDITED is caught as loudly as a row deleted.
          assert.deepEqual(
            entry.cases.map((row) => row[entry.header[0]]),
            parsed[index].rows.map((row) => row[0]),
            `${feature} table ${index}: each case names the feature's own first-column cell, in row order`,
          );
        }
      }
    },
  },

];

/**
 * THE COVERAGE LEDGER. `decided ∪ excluded` is exactly the scenario set of the three covered
 * features (32 + 26 + 19 = 77), and `tables` carries one entry per Examples table in file
 * order, each `cases` being the very array a test above iterates. Task 05's checker consumes
 * this; the module's own last test checks what only it can see.
 *
 * EXCLUSIONS, all one class. Every excluded scenario's headline claim is a set equality, a
 * code/severity table, an envelope shape or a literal total-order oracle that one of the nine
 * `test/arch/acd-loop-*` gates already asserts in exactly that shape — the duplicated
 * invariant 52/05's acceptance forbids. Each pointer is a test `name` looked up in the gate's
 * own file. Two clause-level residues are recorded rather than excluded, because the
 * scenarios that carry them are decided here on their other clauses: `01_record-loader`'s
 * "nothing inside the load projects it onto a face" (proxy: the finding anchored at a record
 * carries the node's own path string, character for character — see the paths case) and
 * `04_schema-and-honesty-findings`' "no comparison anywhere in the load is made by a
 * locale-aware collation" (proxy: byte identity from a fresh process told it lives in another
 * locale, over a fixture whose two orderings a collation would disagree with).
 */
export const coverage = {
  features: [RECORD_FEATURE, VOCABULARY_FEATURE, FINDINGS_FEATURE],
  decided: [
    { feature: RECORD_FEATURE, scenario: "a directory of records loads to one node per file", test: "loops-record/01 a directory of records loads to one node per file" },
    { feature: RECORD_FEATURE, scenario: "an absent loops directory is present:false with zero nodes and no finding", test: "loops-record/01 an absent registry and an empty one differ in `present` alone" },
    { feature: RECORD_FEATURE, scenario: "an EMPTY loops directory is present:true with zero nodes — absence and emptiness are different facts", test: "loops-record/01 an absent registry and an empty one differ in `present` alone" },
    { feature: RECORD_FEATURE, scenario: "source is the raw absolute loops directory whether or not it exists", test: "loops-record/01 an absent registry and an empty one differ in `present` alone" },
    { feature: RECORD_FEATURE, scenario: "the loaded model is exactly source, present, nodes and findings", test: "loops-record/01 the model is plain, round-trippable data with the frozen key set" },
    { feature: RECORD_FEATURE, scenario: "nodes arrive sorted by id, deterministically", test: "loops-record/01 node order is code-unit lexicographic where a collation would disagree" },
    { feature: RECORD_FEATURE, scenario: "the id sort is on code units, never on a locale-aware collation", test: "loops-record/01 node order is code-unit lexicographic where a collation would disagree" },
    { feature: RECORD_FEATURE, scenario: "a node is exactly id, kind, title, path, fields and edges", test: "loops-record/01 the model is plain, round-trippable data with the frozen key set" },
    { feature: RECORD_FEATURE, scenario: "id must equal the scheme joined to the filename stem", test: "loops-record/01 the filename x kind x declared id table (table)" },
    { feature: RECORD_FEATURE, scenario: "an id that does not match the filename stem is a mismatch", test: "loops-record/01 the filename x kind x declared id table (table)" },
    { feature: RECORD_FEATURE, scenario: "an id whose scheme disagrees with its kind is a mismatch", test: "loops-record/01 the filename x kind x declared id table (table)" },
    { feature: RECORD_FEATURE, scenario: 'a file that is not ".md" is ignored — no node, no finding', test: "loops-record/01 the directory walk takes the flat markdown files and nothing else" },
    { feature: RECORD_FEATURE, scenario: "a subdirectory inside loops/ is not descended", test: "loops-record/01 the directory walk takes the flat markdown files and nothing else" },
    { feature: RECORD_FEATURE, scenario: "a record with no frontmatter block is unparseable", test: "loops-record/01 an unparseable record costs its own node and no sibling's" },
    { feature: RECORD_FEATURE, scenario: "a frontmatter block that does not start at the first line is unparseable", test: "loops-record/01 an unparseable record costs its own node and no sibling's" },
    { feature: RECORD_FEATURE, scenario: "an unparseable record does not stop its siblings loading", test: "loops-record/01 an unparseable record costs its own node and no sibling's" },
    { feature: RECORD_FEATURE, scenario: "nodes carry path as a raw absolute, never relativised", test: "loops-record/01 node and finding paths are raw absolutes in OS-native form" },
    { feature: RECORD_FEATURE, scenario: "the loader normalises no separator — the absolute node path and a forward-slashed operand coexist", test: "loops-record/01 node and finding paths are raw absolutes in OS-native form" },
    { feature: RECORD_FEATURE, scenario: "a required key absent on a loop node is a missing field", test: "loops-record/01 a missing key and a declared gap are different facts" },
    { feature: RECORD_FEATURE, scenario: 'a record with no "kind" key is a missing field, and the node is kept carrying kind null', test: "loops-record/01 a node with no kind is kept and still gets every kind-independent check" },
    { feature: RECORD_FEATURE, scenario: "a record typo'd to an unadmitted kind reports its kind, and nothing derived from it", test: "loops-record/01 a record whose kind is unusable is admitted against the union" },
    { feature: RECORD_FEATURE, scenario: "an unusable kind suspends the id's SCHEME leg and leaves its STEM leg running", test: "loops-record/01 an unusable kind suspends the id's scheme leg and not its stem leg" },
    { feature: RECORD_FEATURE, scenario: "a node with no kind at all still gets every kind-INDEPENDENT check", test: "loops-record/01 a node with no kind is kept and still gets every kind-independent check" },
    { feature: RECORD_FEATURE, scenario: "absence and a declared gap are never the same thing", test: "loops-record/01 a missing key and a declared gap are different facts" },
    { feature: RECORD_FEATURE, scenario: "an actor node needs only id, kind and title", test: "loops-record/01 an actor node needs only id, kind and title" },
    { feature: RECORD_FEATURE, scenario: "a list field authored as a bare scalar is an error and is NEVER coerced", test: "loops-record/01 the key-shape table — what one authored value becomes (table)" },
    { feature: RECORD_FEATURE, scenario: "a list authored as a YAML block list is seen as a bare scalar — the grammar admits no block lists", test: "loops-record/01 the key-shape table — what one authored value becomes (table)" },
    { feature: RECORD_FEATURE, scenario: "a list field authored with an empty value is an error", test: "loops-record/01 the key-shape table — what one authored value becomes (table)" },
    { feature: RECORD_FEATURE, scenario: "a scalar field authored as a list is an error and is NEVER collapsed", test: "loops-record/01 the key-shape table — what one authored value becomes (table)" },
    { feature: RECORD_FEATURE, scenario: "a one-entry list where a scalar belongs is still an error", test: "loops-record/01 the key-shape table — what one authored value becomes (table)" },
    { feature: RECORD_FEATURE, scenario: "an empty inline list is an error, and it is not the same error as a value that is no list at all", test: "loops-record/01 the key-shape table — what one authored value becomes (table)" },
    { feature: RECORD_FEATURE, scenario: "an empty machinery list is never a way to declare a loop with no machinery", test: "loops-record/01 an empty machinery list is never a way to declare a loop with no machinery" },

    { feature: VOCABULARY_FEATURE, scenario: "the loader exports eleven vocabulary sets, and the field kinds are the eleventh", test: "loops-record/00 the loader's namespace holds eleven vocabulary sets and one frozen code array" },
    { feature: VOCABULARY_FEATURE, scenario: "the endpoint schemes are exactly six, split into two resolution tiers", test: "loops-record/00 endpoint schemes resolve in two tiers" },
    { feature: VOCABULARY_FEATURE, scenario: "a key outside the union of schema keys and edge keys is reported, never ignored", test: "loops-record/00 the out-of-vocabulary token table (table)" },
    { feature: VOCABULARY_FEATURE, scenario: '"depends" on a loop record is an unknown key — the item graph and the loop graph never mix', test: "loops-record/00 the out-of-vocabulary token table (table)" },
    { feature: VOCABULARY_FEATURE, scenario: '"ground" on a loop node is a key admitted for another kind, not a key the vocabulary has never heard of', test: "loops-record/00 the out-of-vocabulary token table (table)" },
    { feature: VOCABULARY_FEATURE, scenario: "a control field on an actor node is a key admitted for another kind", test: "loops-record/00 the out-of-vocabulary token table (table)" },
    { feature: VOCABULARY_FEATURE, scenario: "the two admission codes are never confused — inside the union is one code, outside it is the other", test: "loops-record/00 the out-of-vocabulary token table (table)" },
    { feature: VOCABULARY_FEATURE, scenario: 'a "kind" outside the closed set is a bad value, and admission falls back to the union', test: "loops-record/01 a record whose kind is unusable is admitted against the union" },
    { feature: VOCABULARY_FEATURE, scenario: "a frontmatter line that produces no key is reported, never dropped in silence", test: "loops-record/00 the top-level line scanner reports the dropped line once and invents no key" },
    { feature: VOCABULARY_FEATURE, scenario: "a key that reached the model and a line that never became one are different findings", test: "loops-record/00 the top-level line scanner reports the dropped line once and invents no key" },
    { feature: VOCABULARY_FEATURE, scenario: 'a blank line and a "#" comment inside the frontmatter are not malformed', test: "loops-record/00 the scanner's skip rules survive a fixture that would otherwise fail them" },
    { feature: VOCABULARY_FEATURE, scenario: "an indented continuation line is never reported on its own", test: "loops-record/00 the top-level line scanner reports the dropped line once and invents no key" },
    { feature: VOCABULARY_FEATURE, scenario: "the exported sets are literals, not accumulated from the data being read", test: "loops-record/00 a load leaves the exported vocabularies exactly as they were" },
    { feature: VOCABULARY_FEATURE, scenario: "the exported sets cannot be widened at runtime", test: "loops-record/00 a load leaves the exported vocabularies exactly as they were" },
    { feature: VOCABULARY_FEATURE, scenario: "a capitalised key is an unknown key and leaves the real key missing", test: "loops-record/00 a capitalised key is an unknown key and leaves the real key missing" },

    { feature: FINDINGS_FEATURE, scenario: "a declared gap never blocks", test: "loops-record/04 declared gaps warn, never block, and never equal a filled field" },
    { feature: FINDINGS_FEATURE, scenario: "a declared gap is never silently equal to a filled field", test: "loops-record/04 declared gaps warn, never block, and never equal a filled field" },
    { feature: FINDINGS_FEATURE, scenario: "the load's own findings carry all three of its lanes", test: "loops-record/04 the load's own findings carry all three of its lanes" },
    { feature: FINDINGS_FEATURE, scenario: "a key that fails a gate is reported once, and the gates behind it are never reached", test: "loops-record/04 one authoring slip yields one finding, at the first gate it fails (table)" },
    { feature: FINDINGS_FEATURE, scenario: "one record with several violations reports one finding per violation", test: "loops-record/04 several independent slips on one record are reported independently" },
    { feature: FINDINGS_FEATURE, scenario: "findings are deterministic across runs", test: "loops-record/04 determinism holds across an in-process repeat and a fresh process" },
    { feature: FINDINGS_FEATURE, scenario: "an unparseable record's finding comes first in the whole lane, ordered by path", test: "loops-record/04 the unparseable lane leads the whole load, ordered by path" },
    { feature: FINDINGS_FEATURE, scenario: "a malformed frontmatter line precedes its own node's key-bearing findings, by line number", test: "loops-record/04 the total-order rank table (table)" },
    { feature: FINDINGS_FEATURE, scenario: "within one key, the findings follow the order the offending entries were declared", test: "loops-record/04 within one key the findings follow the authored order" },
    { feature: FINDINGS_FEATURE, scenario: "every comparison that fixes the order is code-unit lexicographic", test: "loops-record/04 every comparison that fixes the order is code-unit lexicographic" },
    { feature: FINDINGS_FEATURE, scenario: "a finding never varies with wall-clock time", test: "loops-record/04 a finding never varies with wall-clock time" },
  ],
  excluded: [
    { feature: VOCABULARY_FEATURE, scenario: "the admitted key union is exactly the seventeen schema and edge keys", class: "structural-duplicate", reason: "A fixture-free set equality over `ADMITTED_KEYS.all`, which FF-5203 already asserts against the ADR-011 §3 literal. A second set-equality would be two homes for one rule.", pointer: FF_5203_VOCABULARIES },
    { feature: VOCABULARY_FEATURE, scenario: 'a "kind: loop" node admits sixteen keys, and "ground" is not one of them', class: "structural-duplicate", reason: "FF-5203 set-equals `ADMITTED_KEYS.loop` against the literal, which decides both the sixteen members and the absence of `ground`.", pointer: FF_5203_VOCABULARIES },
    { feature: VOCABULARY_FEATURE, scenario: 'a "kind: actor" node admits nine keys, and no control field is one of them', class: "structural-duplicate", reason: "FF-5203 set-equals `ADMITTED_KEYS.actor` against the literal, which decides both the nine members and the absence of every control field.", pointer: FF_5203_VOCABULARIES },
    { feature: VOCABULARY_FEATURE, scenario: "the node kinds are exactly two", class: "structural-duplicate", reason: "FF-5203 set-equals `NODE_KINDS` against [\"loop\", \"actor\"].", pointer: FF_5203_VOCABULARIES },
    { feature: VOCABULARY_FEATURE, scenario: 'the edge keys are exactly the five, and "veto" is the single token for veto/constraint', class: "structural-duplicate", reason: "FF-5203 set-equals `EDGE_KEYS` against the five ADR-004 literals; \"no token carrying a /\" follows from that literal set and is decided by it.", pointer: FF_5203_VOCABULARIES },
    { feature: VOCABULARY_FEATURE, scenario: 'the pointer schemes are exactly three, and there is no "doc:" scheme', class: "structural-duplicate", reason: "FF-5203 set-equals `POINTER_SCHEMES` against [\"module\", \"command\", \"config\"], which decides the absence of \"doc\" and of \"prose\". The behavioural half — `reference: [doc:…]` is a bad value — is a row of this suite's own vocabulary table.", pointer: FF_5203_VOCABULARIES },
    { feature: VOCABULARY_FEATURE, scenario: 'the sentinel tokens are exactly the three standalone tokens plus the "prose:" prefix', class: "structural-duplicate", reason: "FF-5203 set-equals `SENTINEL_TOKENS` against the four ADR-002 literals, which decides that no fourth standalone sentinel exists.", pointer: FF_5203_VOCABULARIES },
    { feature: VOCABULARY_FEATURE, scenario: "the cadence kinds and duration units are closed", class: "structural-duplicate", reason: "FF-5203 set-equals `CADENCE_KINDS` and `PERIODIC_UNITS` against the ADR-006 literals, which decides that \"uncapped\" is not a cadence kind.", pointer: FF_5203_VOCABULARIES },
    { feature: VOCABULARY_FEATURE, scenario: "the event triggers are exactly four", class: "structural-duplicate", reason: "FF-5203 set-equals `EVENT_TRIGGERS` against the four ADR-006 literals.", pointer: FF_5203_VOCABULARIES },
    { feature: VOCABULARY_FEATURE, scenario: "the field kinds are exactly eleven — six of the honesty envelope and five typed", class: "structural-duplicate", reason: "FF-5203 set-equals `FIELD_KINDS` against the eleven ADR-011 §2 literals, which decides the six/five split and their distinctness.", pointer: FF_5203_VOCABULARIES },
    { feature: VOCABULARY_FEATURE, scenario: "the ground classes are exactly one in this milestone", class: "structural-duplicate", reason: "FF-5203 set-equals `GROUND_VALUES` against [\"exogenous\"].", pointer: FF_5203_VOCABULARIES },

    { feature: FINDINGS_FEATURE, scenario: "schema and reference-integrity violations are reported at severity error", class: "structural-duplicate", reason: "FF-5209 drives a fixture engineered to fire every code and asserts each one's severity against the literal 24-row lane/severity table, so all eleven error codes are decided there — including that none is ever reported at warn.", pointer: FF_5209_CODE_TABLE },
    { feature: FINDINGS_FEATURE, scenario: "declared gaps are reported at severity warn", class: "structural-duplicate", reason: "The same literal table decides the five honesty codes' severity. What this suite adds instead is the behaviour a severity table cannot see — that a gap never blocks and never equals a filled field.", pointer: FF_5209_CODE_TABLE },
    { feature: FINDINGS_FEATURE, scenario: "every finding is exactly the four-key envelope", class: "structural-duplicate", reason: "FF-5209's `assertEnvelope` deep-equals every finding's sorted key set against [code, message, path, severity] over both lanes, and asserts every severity is one of the two.", pointer: FF_5209_CODE_TABLE },
    { feature: FINDINGS_FEATURE, scenario: "every finding path is a raw absolute, never relativised", class: "structural-duplicate", reason: "FF-5209 asserts `path.isAbsolute` AND `path.sep` membership per loader finding — the OS-native discriminator, not merely absoluteness. Re-asserting it here would be the second home.", pointer: FF_5209_CODE_TABLE },
    { feature: FINDINGS_FEATURE, scenario: "a per-node finding is anchored at the node's own file", class: "structural-duplicate", reason: "FF-5209's literal total-order oracle pins the exact anchor path of every finding per record, and its bad/bad-two pair pins that same-code records keep their own declaring-file anchors.", pointer: FF_5209_TOTAL_ORDER },
    { feature: FINDINGS_FEATURE, scenario: "every emitted code is a member of the loader's frozen set", class: "structural-duplicate", reason: "FF-5209 asserts each emitted code is declared in the 24-row table and that its LANE is the loader's for every loader-lane index, which decides that no structural-check code is ever emitted by a load.", pointer: FF_5209_CODE_TABLE },
    { feature: FINDINGS_FEATURE, scenario: "every code the loader may emit is reachable", class: "structural-duplicate", reason: "FF-5209 deep-equals the emitted code set against the whole 24-code table over a fixture built to trip each one — the reachability claim in exactly that shape.", pointer: FF_5209_CODE_TABLE },
    { feature: FINDINGS_FEATURE, scenario: "the loader's findings arrive in a frozen order — by node id, then by schema key order", class: "structural-duplicate", reason: "FF-5209 holds the loader to a literal total-order oracle over a six-record fixture (node-id order, key order, and two findings on one key in emission order) and repeats it under a second root in a different creation order.", pointer: FF_5209_TOTAL_ORDER },
  ],
  tables: [
    { feature: RECORD_FEATURE, index: 0, rows: 13, cases: ID_TABLE_CASES },
    { feature: RECORD_FEATURE, index: 1, rows: 12, cases: SHAPE_TABLE_CASES },
    { feature: RECORD_FEATURE, index: 2, rows: 10, cases: KIND_SUSPENSION_CASES },
    { feature: VOCABULARY_FEATURE, index: 0, rows: 31, cases: VOCABULARY_TABLE_CASES },
    { feature: FINDINGS_FEATURE, index: 0, rows: 4, cases: TOTAL_ORDER_RANK_CASES },
    { feature: FINDINGS_FEATURE, index: 1, rows: 25, cases: RECORD_CONTENT_CASES },
    { feature: FINDINGS_FEATURE, index: 2, rows: 9, cases: PRECEDENCE_LADDER_CASES },
  ],
};
