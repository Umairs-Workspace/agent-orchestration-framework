// THE REGISTRY CENSUS — milestone 52 / story 05 / task 04 (finding F-52-04-H's species, one story over).
//
// This is the only suite in story 05 with a fixture it does not author: it drives the exported loader
// and the five exported checks over the named day-one records in the REAL installed registry at
// `.aof/loops/`. Later additive node kinds are deliberately projected out of this historical census.
//
// WHY IT EXISTS. `test/arch/loop/acd-loop-records-parse.test.mjs` (FF-5204) filters the model's findings to
// `error` severity and asserts the roster as a FLOOR (`>= 9`). Both choices were right — an error-only
// sweep is the schema gate, and a floor keeps a tenth legitimate record from being a defect — and
// together they leave the registry's WARN lane and its ROSTER undecided. No gate anywhere runs a
// STRUCTURAL check over the real registry either: FF-5205, FF-5206 and FF-5209 all drive hand-built
// literal models. So the milestone's headline claim — three declared optimizers, all unpaired, because
// the registry declares no monitoring edge at all — is today computed by nothing on disk. This suite
// computes it.
//
// PIN THE THESIS, BOUND THE INCIDENTAL. A value RESEARCH or ADR-010 / ADR-012 §6 measured, and that the
// milestone reasons from, is PINNED: a change to it is a real event that must reach a reviewer. A count
// that is incidental to how many records happen to exist is a BOUND — a floor or a ceiling — because
// pinning it would redden CI for authoring a record. The per-claim discipline is the `discipline` column
// of the census table in
// `wiki/work/52_milestone_loop-registry-and-graph/stories/05_story_behavioural-suites/tasks/04_registry-census-suite.feature`,
// and the CENSUS_LEDGER below is asserted against that table, column for column, so the discipline
// itself is evidence rather than an intention.
//
// WHAT THIS SUITE DELIBERATELY DOES NOT TAKE. FF-5204 owns the zero-error claim, id-equals-stem, the
// typed-field sweep, cadence normalisation and — its strongest leg — pointer authority for every
// `command:` and `module:` pointer. None is re-asserted here; each is routed in `coverage.excluded` to
// FF-5204 by its exact exported test name, resolved against the gates on disk rather than trusted.
// 52/03's prose-BODY citation clauses ("its body cites `<path>:<line>`") are likewise out: the loader
// discards the body, and asserting a line number would redden this suite on every unrelated source
// edit. They are recorded as `not-black-box` with the decidable proxy that IS driven.
//
// THE ONE GAP THIS SUITE TAKES FROM FF-5204'S OWN STRONGEST LEG: FF-5204 resolves `command:` and
// `module:` pointers against real authorities but never checks that a `prose:` value's path names a file
// that exists — in exactly the honesty axis this milestone is about. Existence ONLY, never content and
// never a line number (a `#` anchor is admitted and stripped — ADR-013 §5).
//
// Values below were measured at refine on 2026-08-15 and RE-MEASURED at build on the same day; every
// one agreed. A future discrepancy is a finding to triage, never a number to quietly update.
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { EDGE_KEYS, loadLoops } from "../../src/work/loops.mjs";
import {
  checkActuatorArbitration,
  checkGrounding,
  checkPairing,
  checkReferenceOwnership,
  checkTimescale,
  decomposeLoopGraph,
} from "../../src/work/loops-checks.mjs";
import { examplesTables, scenarioTitles } from "../support/feature-parse.mjs";
import { stripComments } from "../support/source-slice.mjs";
import { suiteFilesBelow } from "../support/registration/registration-surface.mjs";

// THE REPO ROOT COMES FROM `import.meta.url`, NEVER FROM `process.cwd()` — the runner's working
// directory is not guaranteed, and a cwd-derived root would silently census the wrong tree.
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const workDir = path.join(root, ".aof");

const STORY_03 = "wiki/work/52_milestone_loop-registry-and-graph/stories/03_story_the-day-one-registry/tasks";
const FEATURE_ACTORS = `${STORY_03}/00_actor-nodes.feature`;
const FEATURE_PHASE = `${STORY_03}/01_acd-phase-loops.feature`;
const FEATURE_ENGINEERED = `${STORY_03}/02_engineered-controller-loops.feature`;
const FEATURE_EDGES = `${STORY_03}/03_declared-edges.feature`;
const FEATURE_CLEAN = `${STORY_03}/04_registry-loads-clean.feature`;
const TASK_FEATURE =
  "wiki/work/52_milestone_loop-registry-and-graph/stories/05_story_behavioural-suites/tasks/04_registry-census-suite.feature";

// FF-5204's two gates, by their exact exported names. Every `structural-duplicate` exclusion points at
// one of these, and the ledger test resolves both against `test/arch/` rather than trusting this pair.
const FF5204_PARSE = "arch/52 FF-5204: the real nine-record registry parses without error and no loop is aspirational";
const FF5204_POINTERS =
  "arch/52 FF-5204: every real pointer resolves to a registered command or a symbol declared in its named module";

// ---------------------------------------------------------------------------------------------------
// The pinned day-one values. Each is ADR-010, ADR-012 §6 or RESEARCH §Q1; see CENSUS_LEDGER for which.
// ---------------------------------------------------------------------------------------------------
const DAY_ONE_LOOPS = [
  "loop:build-to-green",
  "loop:review-fix-rereview",
  "loop:verify-triage-accept",
  "loop:autonomous-cascade",
  "loop:run-resilience",
  "loop:retrospective-memory-ingest",
  "loop:mesh-assignment-reclaim",
];
const DAY_ONE_ACTORS = ["actor:operator", "actor:product-owner"];
const DECLARED_OPTIMIZERS = ["loop:autonomous-cascade", "loop:build-to-green", "loop:review-fix-rereview"];
const OWNER_UNKNOWN_RECORDS = [
  "autonomous-cascade.md",
  "build-to-green.md",
  "mesh-assignment-reclaim.md",
  "retrospective-memory-ingest.md",
  "review-fix-rereview.md",
  "run-resilience.md",
];
// Milestone 69 supersedes the day-one uncapped measurement while preserving the
// historical feature table below as evidence of what milestone 52 measured.
const CEILING_UNCAPPED_RECORDS = [];
const CURRENT_CEILING_OVERRIDES = Object.freeze({
  "loop:build-to-green": "config:work.loop.buildNoProgressRounds",
  "loop:review-fix-rereview": "config:work.loop.reviewRounds",
});
const DAY_ONE_EDGES = [
  ["actor:operator", "target-setting", "loop:autonomous-cascade"],
  ["actor:product-owner", "target-setting", "loop:verify-triage-accept"],
];
// EDGES AUTHORED AFTER MILESTONE 52, ON DAY-ONE RECORDS — projected out of this HISTORICAL census
// for the same reason and by the same rule the header already applies to later node KINDS. The
// census's subject is the registry milestone 52 shipped; a later milestone declaring a new relation
// on one of those nine records does not change what 52 declared, and the pinned `2` above is a
// measurement of 52's registry, not a ceiling on the framework's.
//
// TRIAGED, NOT QUIETLY UPDATED (this file's own rule, header, last paragraph). The discrepancy
// reached a reviewer: 58/ADR-001 §2 AUTHORS five ownership edges as design acts, three of them on
// `actor:operator` and two on `loop:autonomous-cascade`, because RESEARCH §Q1 found five loops with
// no citable owner. Every one of them is named here rather than absorbed into a bigger number, so
// the projection is itself a census a reviewer can read — and the day-one pin stays at exactly two.
// The arbiter's own `veto`/`parameter-tuning` edges need no entry: `arbiter` is a later kind and the
// existing id filter already projects the whole node out.
const POST_52_EDGES = [
  // 58/ADR-001 §4 — the operator hand-edits the two config keys this loop's reference resolves.
  ["actor:operator", "target-setting", "loop:mesh-assignment-reclaim"],
  // 58/ADR-001 §4 — a governance judgment with no declared revising cycle.
  ["actor:operator", "target-setting", "loop:retrospective-memory-ingest"],
  // 58/ADR-001 §4 — the human sets the arbiter's priority; the only non-loop target admitted.
  ["actor:operator", "target-setting", "arbiter:speed-thoroughness-autonomy"],
  // 58/ADR-001 §3 — the cascade's selected item IS the build loop's setpoint.
  ["loop:autonomous-cascade", "target-setting", "loop:build-to-green"],
  // 58/ADR-001 §3 — and the review loop's.
  ["loop:autonomous-cascade", "target-setting", "loop:review-fix-rereview"],
];
const isPost52 = (edge) =>
  POST_52_EDGES.some(([source, key, target]) => edge.source === source && edge.key === key && edge.target === target);
// The SIX event-triggered loops. `loop:mesh-assignment-reclaim`'s `periodic:15s` is deliberately absent:
// FF-5204 already pins that exact raw value and its millisecond normalisation, and this suite takes no
// normalisation claim. Its clock is asserted here only as "the registry's sole periodic cadence".
const DAY_ONE_EVENT_CADENCE = {
  "loop:build-to-green": "event:per-phase",
  "loop:review-fix-rereview": "event:per-phase",
  "loop:verify-triage-accept": "event:per-item",
  "loop:autonomous-cascade": "event:per-item",
  "loop:run-resilience": "event:per-run-start",
  "loop:retrospective-memory-ingest": "event:per-milestone",
};
// RESEARCH found four loops whose MEASUREMENT authority is a paragraph. A FLOOR over named members:
// authoring a record can add to this set without reddening the suite.
const PROSE_ONLY_MEASUREMENT_FLOOR = [
  "loop:build-to-green",
  "loop:retrospective-memory-ingest",
  "loop:review-fix-rereview",
  "loop:verify-triage-accept",
];
// ADR-010's subtraction, in ids the loaded model can be asked about.
const ABSENT_IDS = ["loop:observe-tune", "loop:observe", "loop:work-observe", "loop:degrade", "loop:work-doctor"];
const ABSENT_ACTUATOR_MODULES = ["work/observe.mjs", "degrade.mjs"];

// ---------------------------------------------------------------------------------------------------
// Small helpers. `path.basename` is deliberately never used in this module — see the named proxy in
// "the census pins the thesis and bounds the incidental".
// ---------------------------------------------------------------------------------------------------
const fileName = (value) => String(value).split(/[\\/]/).at(-1);
const sorted = (values) => [...values].sort();
const entriesOf = (node) =>
  Object.entries(node.fields).flatMap(([key, value]) =>
    (Array.isArray(value) ? value : [value]).map((entry) => ({ key, entry })));
const fieldEntries = (node, key) => {
  const value = node.fields[key];
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
};

async function featureText(relPath) {
  return readFile(path.join(root, relPath), "utf8");
}

// The Nth `Examples:` block of a feature — an INDEX into the shared parse, never a second parser.
// This module used to carry its own, anchored `/^\s*Examples:\s*$/`: correct over 52/03's five
// features, which title no table, and wrong over the other ten, which is how F-52-05-D happened
// (strict: 21 tables / 415 rows; permissive: 28 / 461, the measured truth). Since
// `coverage.tables[].index` is an ordinal into whatever parser produced it, two parsers in one tree
// disagree about WHICH TABLE an entry names — so the parse has one home.
const examplesTable = (text, index) => examplesTables(text)[index] ?? null;

// A table cell states its expectation before the em dash and its reasoning after it.
const expectationHead = (cell) => cell.split("—")[0].trim();

function applyExpectation(head, actual, label) {
  if (/^\d+$/.test(head)) {
    assert.equal(actual, Number(head), `${label}: pinned at ${head}, measured ${actual}`);
    return "exact";
  }
  const range = head.match(/^(\d+) or (\d+)$/);
  if (range) {
    assert.ok(
      actual >= Number(range[1]) && actual <= Number(range[2]),
      `${label}: bounded to ${head}, measured ${actual}`,
    );
    return "range";
  }
  const floor = head.match(/^at least (\d+)$/);
  if (floor) {
    assert.ok(actual >= Number(floor[1]), `${label}: floor of ${floor[1]}, measured ${actual}`);
    return "floor";
  }
  assert.fail(`${label}: unparseable expectation "${head}"`);
  return null;
}

// ---------------------------------------------------------------------------------------------------
// THE CENSUS. Loaded once, from the real registry, and shared by every case below.
// ---------------------------------------------------------------------------------------------------
let censusPromise = null;

async function buildCensus() {
  const fullModel = await loadLoops(workDir);
  const dayOneIds = new Set([...DAY_ONE_LOOPS, ...DAY_ONE_ACTORS]);
  const nodes = fullModel.nodes.filter((node) => dayOneIds.has(node.id));
  const dayOnePaths = new Set(nodes.map((node) => node.path));
  const model = {
    ...fullModel,
    nodes,
    findings: fullModel.findings.filter((finding) => dayOnePaths.has(finding.path)),
  };
  const checks = {
    grounding: checkGrounding(model),
    pairing: checkPairing(model),
    "reference-ownership": checkReferenceOwnership(model),
    "actuator-arbitration": checkActuatorArbitration(model),
    timescale: checkTimescale(model),
  };
  const checkFindings = [
    ...checks.grounding,
    ...checks.pairing,
    ...checks["reference-ownership"],
    ...checks["actuator-arbitration"],
    ...checks.timescale,
  ];
  const all = [...model.findings, ...checkFindings];

  const byId = new Map(model.nodes.map((node) => [node.id, node]));
  const idByPath = new Map(model.nodes.map((node) => [node.path, node.id]));
  const declaredIds = new Set(byId.keys());
  const loops = model.nodes.filter((node) => node.kind === "loop");
  const actors = model.nodes.filter((node) => node.kind === "actor");

  const edges = [];
  for (const node of model.nodes) {
    for (const [key, endpoints] of Object.entries(node.edges)) {
      for (const endpoint of endpoints) edges.push({ source: node.id, key, target: endpoint.raw });
    }
  }

  const prose = [];
  for (const node of model.nodes) {
    for (const { key, entry } of entriesOf(node)) {
      if (entry.kind === "prose") prose.push({ id: node.id, key, value: entry.path, raw: entry.raw });
    }
  }

  // Every actuator a loop declares, mapped to the loops declaring it — the shared-lever census the
  // arbitration finding is drawn from, recomputed here rather than parsed back out of the findings.
  const actuatorUsers = new Map();
  for (const node of loops) {
    for (const entry of fieldEntries(node, "actuator")) {
      if (!actuatorUsers.has(entry.raw)) actuatorUsers.set(entry.raw, new Set());
      actuatorUsers.get(entry.raw).add(node.id);
    }
  }

  // The timescale check's DOMAIN: loop→loop `target-setting`, self-edges excluded (ADR-012 §3/C1). The
  // ceiling on `loop-timescale-not-comparable` follows from this, which is why that count is a bound.
  const loopToLoopTargetSetting = edges.filter((edge) =>
    edge.key === "target-setting" &&
    byId.get(edge.source)?.kind === "loop" &&
    byId.get(edge.target)?.kind === "loop" &&
    edge.source !== edge.target).length;

  const count = (code) => all.filter((finding) => finding.code === code).length;
  const findingsOf = (code) => all.filter((finding) => finding.code === code);
  const recordsReporting = (code) => sorted(findingsOf(code).map((finding) => fileName(finding.path)));

  return {
    model,
    checks,
    checkFindings,
    all,
    byId,
    idByPath,
    declaredIds,
    loops,
    actors,
    edges,
    prose,
    actuatorUsers,
    loopToLoopTargetSetting,
    components: decomposeLoopGraph(model),
    count,
    findingsOf,
    recordsReporting,
  };
}

function census() {
  censusPromise ??= buildCensus();
  return censusPromise;
}

// ---------------------------------------------------------------------------------------------------
// PARAMETERISED CASES — each array is asserted against the feature table it is drawn from before it is
// applied, so the table stays the authority and this file stays the mechanisation.
// ---------------------------------------------------------------------------------------------------

// 04_registry-loads-clean.feature, Examples 0, rows 1-11: the loader's ERROR lane. Owned by FF-5204's
// error sweep and NOT re-asserted here; enumerated so the table's 20 rows are accounted for exactly.
const FF5204_ERROR_LANE = [
  "loop-record-unparseable",
  "loop-missing-field",
  "loop-bad-value",
  "loop-expected-list",
  "loop-expected-scalar",
  "loop-empty-list",
  "loop-unknown-key",
  "loop-key-not-admitted-for-kind",
  "loop-malformed-frontmatter-line",
  "loop-id-mismatch",
  "loop-graph-dangling-endpoint",
];

// 04_registry-loads-clean.feature, Examples 0, rows 12-20: the WARN lane and the checks' lane — the half
// FF-5204 leaves undecided. `expected` is the cell head VERBATIM, so a change to the feature reds this.
const FINDING_CODE_CASES = [
  { code: "loop-owner-unknown", expected: "6" },
  { code: "loop-ceiling-uncapped", expected: "2" },
  { code: "loop-ceiling-unknown", expected: "0" },
  { code: "loop-cadence-unknown", expected: "0 or 1" },
  { code: "loop-field-prose-only", expected: "at least 4" },
  { code: "loop-unpaired-optimizer", expected: "3" },
  { code: "loop-self-referential-edge", expected: "0" },
  { code: "loop-timescale-inversion", expected: "0" },
  { code: "loop-shared-actuator-unarbitrated", expected: "at least 1" },
];

// 04_registry-loads-clean.feature, Examples 1: the four codes 52/03 left DELIBERATELY unpinned. Each is
// asserted as a floor and a ceiling that follow from the roster, never as a count.
//
// SEVERITY IS A PROPERTY OF THE ROW, not a blanket literal over the table (58/ADR-005 §1). These four
// rows were all `warn` on the day 52/03 wrote them, and one assertion covering all four said nothing
// about WHICH of them gates — so the table read as "these codes report" when what it meant was "these
// counts are unpinned". 58 promotes `loop-unowned-reference` and leaves the other three where they
// are, and the table now states that difference instead of averaging it away: a loop nobody
// admissibly owns is a structural supervision failure, while an honest "cannot decide" and the two
// grounding verdicts (55's and 59's, untouched by §2) remain things a reviewer reads rather than
// things that stop the run. The bounds discipline itself is unchanged.
const UNPINNED_CODE_CASES = [
  { code: "loop-unowned-reference", floor: 1, ceiling: "loops", measured: 5, severity: "error" },
  { code: "loop-timescale-not-comparable", floor: 0, ceiling: "loop-to-loop target-setting edges", measured: 0, severity: "warn" },
  { code: "loop-graph-ungrounded-component", floor: 1, ceiling: "nodes", measured: 7, severity: "warn" },
  { code: "loop-graph-grounded-exogenous-only", floor: 1, ceiling: "nodes", measured: 2, severity: "warn" },
];

// 01_acd-phase-loops.feature, Examples 0: ADR-010 rows 1-4, one row per ACD phase loop.
const PHASE_LOOP_CASES = [
  {
    loop: "loop:build-to-green",
    owner: "unknown",
    ceiling: "uncapped",
    measurement: "prose:src/bundle/commands/continue.md",
    optimizing: "true",
  },
  {
    loop: "loop:review-fix-rereview",
    owner: "unknown",
    ceiling: "uncapped",
    measurement: "prose:src/bundle/commands/continue.md",
    optimizing: "true",
  },
  {
    loop: "loop:verify-triage-accept",
    owner: "actor:product-owner",
    ceiling: "none",
    measurement: "prose:src/bundle/commands/verify.md",
    optimizing: "false",
  },
  {
    loop: "loop:autonomous-cascade",
    owner: "unknown",
    ceiling: "config:work.autonomous.maxAttempts",
    measurement: "command:work:next",
    optimizing: "true",
  },
];

// ---------------------------------------------------------------------------------------------------
// THE CENSUS LEDGER — one entry per row of this task's own census table, carrying the refine-time value
// verbatim, the discipline, and (for a pinned claim) the authority that measured it plus the case that
// asserts it. Asserted against the feature table column for column.
//
// ONE CITATION CORRECTION, RECORDED RATHER THAN SILENTLY FOLLOWED: the feature's `why` column cites
// "ADR-013 §3's independence rule" for `loop-self-referential-edge`. ADR-013 §3 is the DEFINITION test
// ("declared here, never exported here"); the independence rule — a node may not satisfy an independence
// requirement with itself — is ADR-011 §9 (ARCHITECTURE.md:1169). The ledger names the ADR that states
// the rule; the discrepancy is filed in the milestone's STATE.md feedback rather than patched here.
// ---------------------------------------------------------------------------------------------------
const CENSUS_LEDGER = [
  {
    claim: "loop records / actor records",
    measured: "7 / 2, named",
    discipline: "pinned",
    authority: "ADR-010",
    test: "loops-census/04 the roster is the named nine — seven loops and two actors, each named",
  },
  {
    claim: "loop-owner-unknown",
    measured: "6, verify-triage-accept excluded",
    discipline: "pinned",
    authority: "RESEARCH §Q1",
    test: "loops-census/04 the honest warns are the deliverable working, and each is attributed",
  },
  {
    claim: "loop-ceiling-uncapped",
    measured: "2 — build-to-green, review-fix-rereview",
    discipline: "pinned",
    authority: "ADR-010",
    test: "loops-census/04 the honest warns are the deliverable working, and each is attributed",
  },
  {
    claim: "loop-ceiling-unknown / loop-cadence-unknown",
    measured: "0 / 0",
    discipline: "pinned",
    authority: "ADR-012 §6",
    test: "loops-census/04 the honest warns are the deliverable working, and each is attributed",
  },
  {
    claim: "loop-field-prose-only",
    measured: "12",
    discipline: "bounded",
    form: "floor",
    test: "loops-census/04 the honest warns are the deliverable working, and each is attributed",
  },
  {
    claim: "optimizing true / false",
    measured: "3 / 4",
    discipline: "pinned",
    authority: "ADR-012 §6",
    test: "loops-census/04 three loops declare themselves optimizers and all three are unpaired",
  },
  {
    claim: "loop-unpaired-optimizer",
    measured: "3 — autonomous-cascade, build-to-green, review-fix-rereview",
    discipline: "pinned",
    authority: "ADR-012 §6",
    test: "loops-census/04 three loops declare themselves optimizers and all three are unpaired",
  },
  {
    claim: "declared edges, all types",
    measured: "2, both target-setting",
    discipline: "pinned",
    authority: "ADR-012 §6",
    test: "loops-census/04 the registry declares two edges, and the absence of the rest is the finding",
  },
  {
    claim: "monitoring / data-feed / veto / parameter-tuning",
    measured: "0 / 0 / 0 / 0",
    discipline: "pinned",
    authority: "ADR-010",
    test: "loops-census/04 the registry declares two edges, and the absence of the rest is the finding",
  },
  {
    claim: "records declaring ground:",
    measured: "1 — operator.md, exogenous",
    discipline: "pinned",
    authority: "ADR-005 §1",
    test: "loops-census/04 exactly one node carries ground, and it is the operator",
  },
  {
    claim: "grounded / ungrounded components",
    measured: "2 / 7",
    discipline: "bounded",
    form: "floor",
    test: "loops-census/04 exactly one node carries ground, and it is the operator",
  },
  {
    claim: "periodic cadences",
    measured: "1",
    discipline: "pinned",
    authority: "ADR-010",
    test: "loops-census/04 only one loop is on a clock, which is why no timescale inversion is reported",
  },
  {
    claim: "loop-timescale-inversion",
    measured: "0",
    discipline: "pinned",
    authority: "ADR-010",
    test: "loops-census/04 only one loop is on a clock, which is why no timescale inversion is reported",
  },
  {
    claim: "loop-timescale-not-comparable",
    measured: "0",
    discipline: "bounded",
    form: "ceiling",
    test: "loops-census/04 only one loop is on a clock, which is why no timescale inversion is reported",
  },
  {
    claim: "loop-self-referential-edge",
    measured: "0",
    discipline: "pinned",
    authority: "ADR-011 §9",
    test: "loops-census/04 no finding in the registry comes from a node confirming itself",
  },
  {
    claim: "loop-shared-actuator-unarbitrated",
    measured: "3, the widest naming an actuator four loops declare",
    discipline: "bounded",
    form: "floor",
    test: "loops-census/04 the shared-actuator finding fires on a real shared lever",
  },
  {
    claim: "loop-unowned-reference",
    measured: "5",
    discipline: "bounded",
    form: "floor",
    test: "loops-census/04 the four deliberately unpinned codes are asserted as bounds only",
  },
  {
    claim: "prose: paths that exist",
    measured: "all",
    discipline: "pinned",
    authority: "ADR-013 §5",
    test: "loops-census/04 every prose path names a file that exists",
  },
];

const CENSUS_AUTHORITIES = ["ADR-005 §1", "ADR-010", "ADR-011 §9", "ADR-012 §6", "ADR-013 §5", "RESEARCH §Q1"];

// A NAMED PROXY, in the ADR-012 §7/G1 sense — not a decision procedure. These tokens are the mechanisms
// FF-5204's four claims are built from: the command registry (`command:` authority), the definition-form
// test (`module:` authority), the typed-field sweep's vocabulary import, the millisecond normalisation,
// the error-severity sweep, and the stem derivation id-equals-stem needs. Their absence from this
// module's comment-stripped source is what makes "no case re-asserts them" checkable at all; the real
// guarantee is the exclusion ledger, which routes each claim to FF-5204 by name.
// The tokens are ASSEMBLED rather than written whole, for the obvious reason: a list of forbidden
// literals written as literals is its own first match.
const FF5204_MECHANISMS = [
  ["list", "Commands"],
  ["declared", "Here"],
  ["FIELD", "_KINDS"],
  ["cadence", ".ms"],
  ["severity === ", '"error"'],
  ["path", ".basename"],
].map((parts) => parts.join(""));

export const workLoopsRegistryCensusTests = [
  {
    // PINNED, ADR-010: the day-one set is SEVEN loops and TWO actors, named. FF-5204 asserts a floor of
    // nine and one node of each kind, deliberately — so a tenth legitimate record is not a defect there.
    // Here the roster IS the claim: a tenth record fails this case, which is the point. A new loop is
    // reviewed, not absorbed.
    name: "loops-census/04 the roster is the named nine — seven loops and two actors, each named",
    run: async () => {
      const { model, loops, actors } = await census();
      assert.equal(model.present, true, "the real registry resolves");
      assert.equal(model.nodes.length, 9, "the day-one roster is nine records");
      assert.equal(loops.length, 7, "seven records declare kind: loop");
      assert.equal(actors.length, 2, "two records declare kind: actor");
      assert.deepEqual(sorted(loops.map((node) => node.id)), sorted(DAY_ONE_LOOPS));
      assert.deepEqual(sorted(actors.map((node) => node.id)), sorted(DAY_ONE_ACTORS));
      // No record declares a kind outside the closed pair — a node whose `kind` is unusable reaches the
      // model as `kind: null` (ADR-013 §2 suspends its kind-derived checks), so this is a real sweep.
      for (const node of model.nodes) {
        assert.ok(node.kind === "loop" || node.kind === "actor", `${node.path}: kind is loop or actor`);
        assert.ok(typeof node.id === "string" && node.id.length > 0, `${node.path}: declares an id`);
      }
    },
  },

  {
    // The WARN lane FF-5204's error filter drops entirely — and the milestone's most valuable output: an
    // addressable list of what aof does not know about its own machinery. PINNED where RESEARCH or an ADR
    // measured it (6 unknown owners with verify-triage-accept excluded; 2 uncapped ceilings, named; zero
    // unknown ceilings and zero unknown cadences); BOUNDED where the count scales with the roster
    // (`loop-field-prose-only`, measured 12, asserted as a floor over named members).
    name: "loops-census/04 the honest warns are the deliverable working, and each is attributed",
    run: async () => {
      const { model, byId, count, findingsOf, recordsReporting } = await census();

      assert.deepEqual(recordsReporting("loop-owner-unknown"), sorted(OWNER_UNKNOWN_RECORDS));
      assert.equal(
        recordsReporting("loop-owner-unknown").includes("verify-triage-accept.md"),
        false,
        "the one loop RESEARCH found an owner for is not in the unknown-owner list",
      );
      assert.deepEqual(recordsReporting("loop-ceiling-uncapped"), sorted(CEILING_UNCAPPED_RECORDS));
      assert.equal(count("loop-ceiling-unknown"), 0, "no record declares an unknown ceiling");
      assert.equal(count("loop-cadence-unknown"), 0, "no record declares an unknown cadence");

      // Every one of these is a WARN. The deliverable is that the registry REPORTS its gaps, not that it
      // has none — a registry reporting none would be the one to distrust.
      for (const code of ["loop-owner-unknown", "loop-ceiling-uncapped", "loop-field-prose-only"]) {
        for (const finding of findingsOf(code)) assert.equal(finding.severity, "warn", `${code}: ${finding.path}`);
      }

      // The one non-unknown owner names a node the registry declares — so the owner names no absent node.
      const owned = model.nodes.filter((node) => node.fields.owner?.kind === "ref");
      assert.equal(owned.length, 1, "exactly one record declares an owner that is not the unknown sentinel");
      assert.equal(owned[0].id, "loop:verify-triage-accept");
      assert.equal(owned[0].fields.owner.raw, "actor:product-owner");
      assert.ok(byId.has("actor:product-owner"), "the declared owner is a declared node");

      // BOUNDED — a floor, and a floor over NAMED members. 12 entries were measured; the assertion is
      // that at least the four prose-only-measurement loops RESEARCH found are still prose-backed, so
      // authoring a record cannot redden it and losing an honest `prose:` declaration still can.
      assert.ok(count("loop-field-prose-only") >= 4, `prose-only floor: ${count("loop-field-prose-only")}`);
      for (const id of PROSE_ONLY_MEASUREMENT_FLOOR) {
        const entries = fieldEntries(byId.get(id), "measurement");
        assert.ok(entries.length > 0 && entries.every((entry) => entry.kind === "prose"), `${id}: measurement is prose`);
      }

      // Every ceiling is evidenced as `uncapped`, `none` or a pointer — never a restated number. This is
      // the decidable proxy for 52/03's "the record restates none of the machinery it points at".
      for (const node of model.nodes.filter((candidate) => candidate.kind === "loop")) {
        const entries = fieldEntries(node, "ceiling");
        assert.ok(entries.length > 0, `${node.id}: declares a ceiling`);
        for (const entry of entries) {
          assert.ok(["uncapped", "none", "pointer"].includes(entry.kind), `${node.id}: ceiling ${entry.raw}`);
        }
      }
    },
  },

  {
    // THE PRD THESIS, MADE COMPUTABLE. Nothing else in the tree computes this. The count is NOT asserted
    // twice: it is asserted to equal the number of declared optimizers, and WHY every one of them is
    // unpaired — the registry declares no monitoring edge at all — is the edge census's claim, next case.
    name: "loops-census/04 three loops declare themselves optimizers and all three are unpaired",
    run: async () => {
      const { loops, checks, idByPath } = await census();

      const declaring = (value) =>
        sorted(loops.filter((node) => node.fields.optimizing?.value === value).map((node) => node.id));
      assert.deepEqual(declaring(true), sorted(DECLARED_OPTIMIZERS));
      assert.deepEqual(declaring(false), sorted(DAY_ONE_LOOPS.filter((id) => !DECLARED_OPTIMIZERS.includes(id))));
      assert.equal(declaring(true).length, 3);
      assert.equal(declaring(false).length, 4);
      for (const node of loops) {
        assert.equal(node.fields.optimizing?.kind, "flag", `${node.id}: optimizing is the literal true or false`);
      }

      const unpaired = checks.pairing.filter((finding) => finding.code === "loop-unpaired-optimizer");
      assert.deepEqual(sorted(unpaired.map((finding) => idByPath.get(finding.path))), sorted(DECLARED_OPTIMIZERS));
      assert.equal(
        unpaired.length,
        declaring(true).length,
        "every declared optimizer is unpaired — the count follows from the optimizer census, not a second literal",
      );
      for (const finding of unpaired) assert.equal(finding.severity, "error", finding.path);
    },
  },

  {
    // THE EDGE CENSUS IS THE "ABSENCE IS THE FINDING" DELIVERABLE. Two declared edges, both
    // target-setting, and four whole edge types with nothing in them. Zero monitoring is WHY the three
    // optimizers above are unpaired; zero parameter-tuning is the day-one answer to "what tunes aof's
    // harness?", readable in one second (ADR-010).
    name: "loops-census/04 the registry declares two edges, and the absence of the rest is the finding",
    run: async () => {
      const { edges: allEdges, byId } = await census();

      // The projection is asserted BOTH WAYS, so it cannot hide anything: what was projected out is
      // exactly the five 58/ADR-001 authored, and what remains is exactly milestone 52's two.
      const projected = sorted(allEdges.filter(isPost52).map((edge) => `${edge.source} ${edge.key} ${edge.target}`));
      assert.deepEqual(projected, sorted(POST_52_EDGES.map((edge) => edge.join(" "))),
        "every edge authored after 52 on a day-one record is named, and no unnamed edge appeared");
      const edges = allEdges.filter((edge) => !isPost52(edge));

      assert.equal(edges.length, 2, "exactly two edges were declared by milestone 52 across all nine records");
      assert.deepEqual(
        sorted(edges.map((edge) => `${edge.source} ${edge.key} ${edge.target}`)),
        sorted(DAY_ONE_EDGES.map((edge) => edge.join(" "))),
      );
      for (const edge of edges) {
        assert.ok(EDGE_KEYS.has(edge.key), `${edge.source}: ${edge.key} is one of the five closed types`);
        assert.equal(edge.key, "target-setting", `${edge.source} -> ${edge.target}`);
      }
      for (const key of ["monitoring", "data-feed", "veto", "parameter-tuning"]) {
        assert.equal(edges.filter((edge) => edge.key === key).length, 0, `no record declares a ${key} edge`);
      }

      // ADR-012 §6/F3: the product owner's edge set is CLOSED at the one cited relation; the operator's
      // is a FLOOR, and every endpoint above it needs its own citation (OQ-1). Both are asserted in the
      // shape the ADR gives them.
      const declaredBy = (id) => Object.entries(byId.get(id).edges);
      assert.deepEqual(declaredBy("actor:product-owner").map(([key, endpoints]) => [key, endpoints.map((e) => e.raw)]), [
        ["target-setting", ["loop:verify-triage-accept"]],
      ]);
      assert.ok(
        byId.get("actor:operator").edges["target-setting"].some((endpoint) => endpoint.raw === "loop:autonomous-cascade"),
        "the operator declares at least the cited floor",
      );
    },
  },

  {
    // ADR-005 §1 admits exactly one ground class on one node kind, and ADR-012 §6/F3 states the
    // consequence so nobody treats it as a defect: on day one most components are ungrounded, and that is
    // the correct output. The ground count is PINNED; the grounded/ungrounded split is BOUNDED — it
    // follows from the roster, and pinning it would duplicate the roster pin.
    name: "loops-census/04 exactly one node carries ground, and it is the operator",
    run: async () => {
      const { model, byId, checks, components, declaredIds } = await census();

      const grounded = model.nodes.filter((node) => node.fields.ground !== undefined);
      assert.equal(grounded.length, 1, "exactly one record declares a ground: key");
      assert.equal(fileName(grounded[0].path), "operator.md");
      assert.equal(grounded[0].id, "actor:operator");
      assert.equal(grounded[0].kind, "actor");
      assert.equal(grounded[0].fields.ground.raw, "exogenous");
      for (const node of model.nodes.filter((candidate) => candidate.kind === "loop")) {
        assert.equal(node.fields.ground, undefined, `${node.id}: ground: is admitted on kind: actor only`);
      }

      // Both actors declare a one-line title, and the product owner declares no ground at all — not
      // "ground: unknown", not any other value.
      for (const id of DAY_ONE_ACTORS) {
        const actor = byId.get(id);
        assert.equal(actor.kind, "actor");
        assert.ok(typeof actor.title === "string" && actor.title.length > 0 && !actor.title.includes("\n"), id);
      }
      assert.equal(byId.get("actor:product-owner").fields.ground, undefined);

      // BOUNDED, both floors: at least one grounded-exogenous-only component and at least one ungrounded.
      // Measured 2 / 7 — a count that moves the day anyone authors a record or a citation-backed edge.
      const ofCode = (code) => checks.grounding.filter((finding) => finding.code === code).length;
      assert.ok(ofCode("loop-graph-grounded-exogenous-only") >= 1, "at least one grounded component");
      assert.ok(ofCode("loop-graph-ungrounded-component") >= 1, "at least one ungrounded component");
      assert.equal(
        ofCode("loop-graph-grounded-exogenous-only") + ofCode("loop-graph-ungrounded-component"),
        components.length,
        "the grounding check classifies every component exactly once",
      );
      assert.deepEqual(sorted(components.flat()), sorted([...declaredIds]), "the components partition the roster");
    },
  },

  {
    // PINNED: exactly one record is on a clock, and zero inversions — the second follows from the first,
    // which is why 52/03 gives the reason in the scenario title. BOUNDED: `loop-timescale-not-comparable`
    // is an artefact of how few edges exist, so it is asserted as a CEILING derived from the check's own
    // domain (loop→loop target-setting, self-edges excluded), never as a count.
    name: "loops-census/04 only one loop is on a clock, which is why no timescale inversion is reported",
    run: async () => {
      const { model, byId, checks, loopToLoopTargetSetting } = await census();

      const periodic = model.nodes.filter((node) => node.fields.cadence?.kind === "periodic");
      assert.equal(periodic.length, 1, "exactly one record declares a periodic cadence");
      assert.equal(periodic[0].id, "loop:mesh-assignment-reclaim");
      for (const [id, raw] of Object.entries(DAY_ONE_EVENT_CADENCE)) {
        assert.equal(byId.get(id).fields.cadence.kind, "event", `${id}: not on a clock`);
        assert.equal(byId.get(id).fields.cadence.raw, raw, `${id}: declared trigger`);
      }

      const inversions = checks.timescale.filter((finding) => finding.code === "loop-timescale-inversion");
      assert.equal(inversions.length, 0, "no timescale inversion is reported");
      const incomparable = checks.timescale.filter((finding) => finding.code === "loop-timescale-not-comparable");
      assert.ok(
        incomparable.length <= loopToLoopTargetSetting,
        `not-comparable is bounded by the check's domain (${loopToLoopTargetSetting} loop-to-loop target-setting edges), got ${incomparable.length}`,
      );
    },
  },

  {
    // ADR-011 §9's independence rule, over the REAL registry rather than a fixture: a watcher may not be
    // the thing it watches, and a node may not own its own reference. Zero is PINNED — a first
    // self-confirming edge is exactly the failure this arc exists to prevent.
    name: "loops-census/04 no finding in the registry comes from a node confirming itself",
    run: async () => {
      const { checkFindings, edges } = await census();

      assert.deepEqual(
        checkFindings.filter((finding) => finding.code === "loop-self-referential-edge"),
        [],
        "no check reports a self-referential edge",
      );
      for (const edge of edges) {
        assert.notEqual(edge.target, edge.source, `${edge.source} declares a ${edge.key} edge to itself`);
      }
    },
  },

  {
    // PRD §Context failure 3, made computable. The finding COUNT is bounded (it follows the roster), but
    // the SHAPE is the claim: the finding must fire on a lever real loops genuinely share, not on two
    // coarse citations of the same orchestrating prompt — which is the citation artifact 52/03 closed on
    // the authoring side (ADR-011 §10: an actuator names the narrowest artifact that ACTS).
    name: "loops-census/04 the shared-actuator finding fires on a real shared lever",
    run: async () => {
      const { checks, actuatorUsers, declaredIds } = await census();

      const findings = checks["actuator-arbitration"].filter(
        (finding) => finding.code === "loop-shared-actuator-unarbitrated");
      assert.ok(findings.length >= 1, "at least one shared actuator is unarbitrated");

      // Every contender the finding names is a record the registry declares.
      for (const finding of findings) {
        const named = finding.message.match(/\[([^\]]*)\]/);
        assert.ok(named, `finding names its contenders: ${finding.message}`);
        const contenders = named[1].split(", ").filter(Boolean);
        assert.ok(contenders.length >= 2, `a shared actuator has at least two contenders: ${finding.message}`);
        for (const id of contenders) assert.ok(declaredIds.has(id), `${id} is a declared record`);
      }

      // At least one names an actuator MORE THAN TWO loops declare — measured: the developer agent
      // definition, declared by four. A floor, so the claim survives a roster change.
      const widest = [...actuatorUsers.entries()].sort((left, right) => right[1].size - left[1].size)[0];
      assert.ok(widest[1].size > 2, `the widest shared lever is declared by ${widest[1].size} loops`);
      assert.ok(
        findings.some((finding) => finding.message.includes(widest[0])),
        `the widest shared lever is reported: ${widest[0]}`,
      );
      assert.ok(widest[0].includes("src/bundle/agents/"), `the shared lever is an agent definition: ${widest[0]}`);

      // THE CITATION-ARTIFACT GUARD: no loop declares an orchestrating phase prompt as its actuator. If
      // one did, the finding above would be an artefact of coarse citation rather than a real collision.
      for (const actuator of actuatorUsers.keys()) {
        assert.equal(
          actuator.includes("src/bundle/commands/"),
          false,
          `${actuator}: an actuator names the artifact that acts, never the prompt that orchestrates it`,
        );
      }
    },
  },

  {
    // ADR-010's SUBTRACTION, still subtracted. observe→tune is not declared because `tune` does not
    // exist; `work-observe.mjs` and `degrade.mjs` are unattached measurement streams with no actuator.
    // Asserted against the LOADED MODEL — ids, endpoints and declared field values — never against a
    // grep of the directory, so a record that existed but did not parse could not hide inside it.
    name: "loops-census/04 the four absences ADR-010 declared are still absent",
    run: async () => {
      const { model, declaredIds, edges } = await census();

      for (const absent of ABSENT_IDS) {
        assert.equal(declaredIds.has(absent), false, `${absent} is not declared`);
        assert.equal(
          edges.some((edge) => edge.target === absent),
          false,
          `no edge endpoint names ${absent}`,
        );
      }

      // "No record declares an actuator that tunes another loop's parameters", in actuator terms: no
      // actuator entry names a node of this registry at all. (The parameter-tuning EDGE census is the
      // previous case's; it is not asserted twice.)
      for (const node of model.nodes) {
        for (const entry of fieldEntries(node, "actuator")) {
          assert.equal(declaredIds.has(entry.raw), false, `${node.id}: actuator ${entry.raw} names a registry node`);
          for (const module of ABSENT_ACTUATOR_MODULES) {
            assert.equal(
              entry.raw.includes(module),
              false,
              `${node.id}: ${module} is a measurement stream, not an actuator`,
            );
          }
        }
      }
    },
  },

  {
    // THE GAP IN FF-5204'S OWN STRONGEST LEG. It resolves every `command:` and `module:` pointer against
    // a real authority, and never checks that a `prose:` value's path names a file that exists — in
    // exactly the honesty axis this milestone is about. EXISTENCE ONLY: the anchor is stripped (ADR-013
    // §5 admits a `#` in a `prose:` value), the file is stat-ed and never read, and no line number is
    // asserted — 52/03's prose-BODY `<path>:<line>` clauses stay out precisely because a line number
    // would redden this suite on every unrelated source edit.
    name: "loops-census/04 every prose path names a file that exists",
    run: async () => {
      const { prose, byId } = await census();

      assert.ok(prose.length > 0, "the prose sweep is non-vacuous");
      for (const entry of prose) {
        const target = entry.value.split("#")[0];
        assert.equal(/:\d+$/.test(target), false, `${entry.id}/${entry.key}: a prose: value names a path, not a line`);
        assert.equal(target.startsWith("/"), false, `${entry.id}/${entry.key}: repo-relative`);
        const stats = await stat(path.join(root, target)).catch(() => null);
        assert.ok(stats?.isFile(), `${entry.id}/${entry.key}: ${target} names a file present in the tree`);
      }

      // The existence probe is not vacuous: a path that is not in the tree fails it.
      assert.equal(
        (await stat(path.join(root, "src/no-such-file-52-05-04.mjs")).catch(() => null))?.isFile() ?? false,
        false,
        "the existence probe rejects an absent path",
      );

      // THE OTHER HALF OF THE FIELD-AUTHORITY CENSUS: RESEARCH found two loops with every field backed by
      // a named symbol rather than a paragraph. They declare no `prose:` entry at all, which is the
      // decidable proxy for "the record declares the machinery and restates none of it".
      for (const [id, keys] of [
        ["loop:run-resilience", ["controlled", "reference", "measurement", "actuator", "ceiling"]],
        ["loop:mesh-assignment-reclaim", ["controlled", "reference", "measurement", "actuator"]],
      ]) {
        assert.equal(prose.some((entry) => entry.id === id), false, `${id}: declares no prose authority`);
        for (const key of keys) {
          const entries = fieldEntries(byId.get(id), key);
          assert.ok(entries.length > 0, `${id}/${key}: declared`);
          for (const entry of entries) assert.equal(entry.kind, "pointer", `${id}/${key}: ${entry.raw}`);
        }
      }
    },
  },

  {
    // THE DISCIPLINE ITSELF, MADE CHECKABLE. A suite that pins everything is a suite that will be edited
    // to stay green, which is how a census stops being evidence. The ledger is asserted against this
    // task's own census table — claim, refine-time value and discipline, column for column — so a change
    // to any measured value reaches a reviewer through a red test rather than through a quiet edit.
    name: "loops-census/04 the census pins the thesis and bounds the incidental",
    run: async () => {
      const table = examplesTable(await featureText(TASK_FEATURE), 0);
      assert.ok(table, "the census table is present");
      assert.deepEqual(table.header.slice(0, 3), ["claim", "measured at refine 2026-08-15", "discipline"]);
      assert.equal(table.rows.length, CENSUS_LEDGER.length, "one ledger entry per census row");
      assert.deepEqual(table.rows.map((row) => row[0]), CENSUS_LEDGER.map((entry) => entry.claim));
      assert.deepEqual(table.rows.map((row) => row[1]), CENSUS_LEDGER.map((entry) => entry.measured));
      assert.deepEqual(table.rows.map((row) => row[2]), CENSUS_LEDGER.map((entry) => entry.discipline));

      const names = new Set(workLoopsRegistryCensusTests.map((entry) => entry.name));
      for (const entry of CENSUS_LEDGER) {
        assert.ok(names.has(entry.test), `${entry.claim}: its case names where it is asserted (${entry.test})`);
        if (entry.discipline === "pinned") {
          // EVERY PINNED VALUE NAMES WHERE IT WAS MEASURED — an ADR or RESEARCH, never this file.
          assert.ok(CENSUS_AUTHORITIES.includes(entry.authority), `${entry.claim}: authority ${entry.authority}`);
          assert.equal(entry.form, undefined, `${entry.claim}: a pinned value is not also a bound`);
          continue;
        }
        assert.equal(entry.discipline, "bounded", `${entry.claim}: discipline is pinned or bounded`);
        // EVERY BOUNDED VALUE IS A FLOOR OR A CEILING, so authoring a record does not redden it.
        assert.ok(["floor", "ceiling"].includes(entry.form), `${entry.claim}: form ${entry.form}`);
        assert.equal(entry.authority, undefined, `${entry.claim}: a bound cites no measurement to pin`);
      }
      assert.ok(
        CENSUS_LEDGER.some((entry) => entry.discipline === "pinned") &&
          CENSUS_LEDGER.some((entry) => entry.discipline === "bounded"),
        "both disciplines are in use",
      );

      // NO CASE RE-ASSERTS FF-5204's CLAIMS — a named proxy over this module's own comment-stripped
      // source (see FF5204_MECHANISMS): the zero-error sweep, id-equals-stem, the typed-field sweep,
      // cadence normalisation and pointer authority are all built from mechanisms this file never uses.
      const self = stripComments(await readFile(path.join(here, "work-loops-registry-census.test.mjs"), "utf8"));
      for (const mechanism of FF5204_MECHANISMS) {
        assert.equal(self.includes(mechanism), false, `this suite takes no FF-5204 claim via ${mechanism}`);
      }
    },
  },

  {
    // 52/03's own finding-code table, driven over the real registry. Its 20 rows split cleanly: 11 are
    // the loader's ERROR lane, which FF-5204's sweep owns and this suite does not re-assert, and 9 are
    // the WARN lane and the checks' lane that no gate decides today. The expectation is parsed from the
    // feature cell, so the table stays the authority — including its own discipline, which is looser than
    // this task's census on one row (`loop-cadence-unknown`: "0 or 1" there, pinned at 0 here; measured 0,
    // so both hold, and the tighter pin lives in the honest-warns case).
    name: "loops-census/04 the warn-lane and check-lane counts of 52/03's finding-code table",
    run: async () => {
      const { count } = await census();
      const table = examplesTable(await featureText(FEATURE_CLEAN), 0);
      assert.ok(table, "the finding-code table is present");
      assert.deepEqual(table.header, ["finding code", "expected count in the day-one registry"]);
      assert.equal(table.rows.length, 20, "the table's row count");

      const codes = table.rows.map((row) => row[0]);
      assert.deepEqual(
        sorted(codes),
        sorted([...FF5204_ERROR_LANE, ...FINDING_CODE_CASES.map((entry) => entry.code)]),
        "every row is either FF-5204's error lane or a case driven here",
      );
      assert.equal(
        FF5204_ERROR_LANE.some((code) => FINDING_CODE_CASES.some((entry) => entry.code === code)),
        false,
        "the two lanes are disjoint",
      );

      const expectations = new Map(table.rows.map((row) => [row[0], expectationHead(row[1])]));
      const applied = [];
      for (const testCase of FINDING_CODE_CASES) {
        assert.equal(expectations.get(testCase.code), testCase.expected, `${testCase.code}: the feature's expectation`);
        if (testCase.code === "loop-ceiling-uncapped") {
          assert.equal(count(testCase.code), 0, "milestone 69 replaced both day-one uncapped declarations with resolved pointers");
          applied.push("superseded");
        } else {
          applied.push(applyExpectation(testCase.expected, count(testCase.code), testCase.code));
        }
      }
      assert.equal(applied.length, FINDING_CODE_CASES.length);
      assert.ok(applied.includes("exact") && applied.includes("floor"), "the table exercises both disciplines");
    },
  },

  {
    // 52/03's SECOND table: the four codes it deliberately left unpinned, because each follows from an
    // edge set that is authored from citations rather than budgeted (OQ-1). Each is asserted as a floor
    // AND a ceiling that follow from the roster — never as a count, which is the whole point of the row.
    name: "loops-census/04 the four deliberately unpinned codes are asserted as bounds only",
    run: async () => {
      const cens = await census();
      const table = examplesTable(await featureText(FEATURE_CLEAN), 1);
      assert.ok(table, "the unpinned-code table is present");
      assert.equal(table.header[0], "code deliberately left unpinned");
      assert.equal(table.rows.length, 4, "the table's row count");
      assert.deepEqual(table.rows.map((row) => row[0]), UNPINNED_CODE_CASES.map((entry) => entry.code));
      for (const row of table.rows) assert.ok(row[1].length > 0, `${row[0]}: the table states why`);

      const ceilings = {
        loops: cens.loops.length,
        nodes: cens.model.nodes.length,
        "loop-to-loop target-setting edges": cens.loopToLoopTargetSetting,
      };
      for (const testCase of UNPINNED_CODE_CASES) {
        const observed = cens.count(testCase.code);
        assert.ok(observed >= testCase.floor, `${testCase.code}: floor ${testCase.floor}, observed ${observed}`);
        assert.ok(
          observed <= ceilings[testCase.ceiling],
          `${testCase.code}: ceiling is the registry's ${testCase.ceiling} (${ceilings[testCase.ceiling]}), observed ${observed}`,
        );
        // The SHAPE is the claim the count is not: every finding of these codes anchors at a real path
        // and names only nodes the registry declares.
        for (const finding of cens.findingsOf(testCase.code)) {
          assert.equal(finding.severity, testCase.severity, `${testCase.code}: ${finding.path}`);
          assert.ok(path.isAbsolute(finding.path) && finding.path.length > 0, `${testCase.code}: anchored`);
          for (const id of finding.message.match(/(?:loop|actor):[A-Za-z0-9-]+/g) ?? []) {
            assert.ok(cens.declaredIds.has(id), `${testCase.code}: ${id} is a declared record`);
          }
        }
      }
      // NON-VACUITY of the severity column: the four rows carry BOTH answers, so the per-row
      // assertion above is a discrimination and not four restatements of one constant. And the one
      // row that gates is the one whose findings actually occur in this projection (floor 1).
      assert.deepEqual(
        [...new Set(UNPINNED_CODE_CASES.map((entry) => entry.severity))].sort(),
        ["error", "warn"],
        "the table states which of the four codes gates and which report",
      );
      assert.ok(
        cens.findingsOf("loop-unowned-reference").length > 0,
        "…and the gating row is observed, so its severity claim is not made over an empty list",
      );

      // "An unowned reference stays unowned": every loop the check names really has no inbound
      // target-setting edge, which is what makes the bound above evidence rather than an accident.
      const unowned = cens.findingsOf("loop-unowned-reference").map((finding) => cens.idByPath.get(finding.path));
      for (const id of unowned) {
        assert.equal(cens.byId.get(id).kind, "loop", `${id}: reference ownership is a loop-level claim`);
        assert.equal(
          cens.edges.some((edge) => edge.key === "target-setting" && edge.target === id && edge.source !== id),
          false,
          `${id}: no inbound target-setting edge`,
        );
      }
    },
  },

  {
    // ADR-010 rows 1-4, as 52/03 tabulated them: one row per ACD phase loop, four axes each. The case
    // array is asserted EQUAL to the parsed table before it is applied, so the feature is the authority
    // and this array is only its mechanisation. The `measurement` axis is checked as an AUTHORITY the
    // record declares plus the KIND of every entry on that key — never as pointer resolution, which is
    // FF-5204's.
    name: "loops-census/04 the four ACD phase loops match their owner/ceiling/measurement/optimizing table",
    run: async () => {
      const { byId } = await census();
      const table = examplesTable(await featureText(FEATURE_PHASE), 0);
      assert.ok(table, "the phase-loop table is present");
      assert.deepEqual(table.header, ["loop", "owner", "ceiling", "measurement kind", "optimizing"]);
      assert.equal(table.rows.length, PHASE_LOOP_CASES.length, "the table's row count");
      assert.deepEqual(
        table.rows,
        PHASE_LOOP_CASES.map((row) => [row.loop, row.owner, row.ceiling, row.measurement, row.optimizing]),
      );

      for (const row of PHASE_LOOP_CASES) {
        const node = byId.get(row.loop);
        assert.ok(node, `${row.loop} is declared`);
        assert.equal(node.fields.owner.raw, row.owner, `${row.loop}: owner`);
        assert.deepEqual(
          fieldEntries(node, "ceiling").map((entry) => entry.raw),
          [CURRENT_CEILING_OVERRIDES[row.loop] ?? row.ceiling],
          `${row.loop}: ceiling (day-one value is superseded only where milestone 69 declares an authority)`,
        );
        const measurement = fieldEntries(node, "measurement").map((entry) => entry.raw);
        assert.ok(measurement.includes(row.measurement), `${row.loop}: measurement names ${row.measurement}`);
        const scheme = row.measurement.slice(0, row.measurement.indexOf(":") + 1);
        for (const raw of measurement) assert.ok(raw.startsWith(scheme), `${row.loop}: measurement kind ${scheme}`);
        assert.equal(node.fields.optimizing.raw, row.optimizing, `${row.loop}: optimizing`);
      }
    },
  },

  {
    // THE LEDGER IS ITSELF EVIDENCE, so it is checked rather than asserted in prose: decided ∪ excluded is
    // EXACTLY the scenario-title set of the five covered features, no title is claimed twice, every
    // `decided.test` names a case in this module, and every `structural-duplicate` pointer is LOOKED UP
    // against the gates on disk rather than trusted — a pointer at a gate name that no longer exists is
    // how an exclusion table quietly becomes fiction.
    name: "loops-census/04 the coverage ledger is complete and its pointers resolve",
    run: async () => {
      const names = new Set(workLoopsRegistryCensusTests.map((entry) => entry.name));
      const classes = new Set(["structural-duplicate", "not-black-box", "duplicate-claim"]);

      for (const feature of coverage.features) {
        const titles = scenarioTitles(await featureText(feature));
        assert.ok(titles.length > 0, `${feature}: declares scenarios`);
        const claimed = [
          ...coverage.decided.filter((entry) => entry.feature === feature).map((entry) => entry.scenario),
          ...coverage.excluded.filter((entry) => entry.feature === feature).map((entry) => entry.scenario),
        ];
        assert.equal(new Set(claimed).size, claimed.length, `${feature}: no scenario is claimed twice`);
        assert.deepEqual(sorted(claimed), sorted(titles), `${feature}: decided union excluded is the scenario set`);
      }

      for (const entry of [...coverage.decided, ...coverage.excluded]) {
        assert.ok(coverage.features.includes(entry.feature), `${entry.scenario}: a covered feature`);
      }
      for (const entry of coverage.decided) {
        assert.ok(names.has(entry.test), `${entry.scenario}: decided by ${entry.test}`);
      }

      // The nine loop-registry gates, imported from disk, so a pointer is resolved and not asserted.
      const archDir = path.join(root, "test", "arch");
      const archNames = new Set();
      // 119/03 — recursive; the gates live under `test/arch/loop/` now.
      for (const file of (await suiteFilesBelow(archDir)).filter((rel) => rel.split("/").pop().startsWith("acd-loop-"))) {
        const module = await import(pathToFileURL(path.join(archDir, file)).href);
        for (const entry of module.archTests ?? []) archNames.add(entry.name);
      }
      assert.ok(archNames.size > 0, "the loop-registry gates resolved");
      assert.ok(archNames.has(FF5204_PARSE) && archNames.has(FF5204_POINTERS), "both FF-5204 gates resolved by name");

      const decidedTitles = new Set(coverage.decided.map((entry) => entry.scenario));
      for (const entry of coverage.excluded) {
        assert.ok(classes.has(entry.class), `${entry.scenario}: class ${entry.class}`);
        assert.ok(entry.reason.length > 0, `${entry.scenario}: states a reason`);
        if (entry.class === "structural-duplicate") {
          assert.ok(archNames.has(entry.pointer), `${entry.scenario}: ${entry.pointer} is an exported gate name`);
        } else if (entry.class === "not-black-box") {
          assert.ok(names.has(entry.pointer), `${entry.scenario}: ${entry.pointer} is the proxy driven here`);
        } else {
          assert.ok(decidedTitles.has(entry.pointer), `${entry.scenario}: ${entry.pointer} is a decided scenario`);
        }
      }

      for (const entry of coverage.tables) {
        const table = examplesTable(await featureText(entry.feature), entry.index);
        assert.ok(table, `${entry.feature}#${entry.index}: the table is present`);
        assert.equal(table.rows.length, entry.rows, `${entry.feature}#${entry.index}: row count`);
        assert.ok(Array.isArray(entry.cases) && entry.cases.length > 0, `${entry.feature}#${entry.index}: cases`);
      }
    },
  },
];

// THE COVERAGE LEDGER. Covered feature set: 52/03's five task features — the story whose residue FF-5204
// leaves undecided. `decided` names the case in this module that drives each scenario; `excluded` names
// the class, the reason, and the pointer the ledger test resolves.
export const coverage = {
  features: [FEATURE_ACTORS, FEATURE_PHASE, FEATURE_ENGINEERED, FEATURE_EDGES, FEATURE_CLEAN],
  decided: [
    {
      feature: FEATURE_ACTORS,
      scenario: "the operator record declares the exogenous root",
      test: "loops-census/04 exactly one node carries ground, and it is the operator",
    },
    {
      feature: FEATURE_ACTORS,
      scenario: "the operator is the only ground-bearing node in the registry",
      test: "loops-census/04 exactly one node carries ground, and it is the operator",
    },
    {
      feature: FEATURE_ACTORS,
      scenario: "the product-owner record declares no ground at all",
      test: "loops-census/04 exactly one node carries ground, and it is the operator",
    },
    {
      feature: FEATURE_ACTORS,
      scenario: "the product-owner's edge set is exactly the one relation RESEARCH cited",
      test: "loops-census/04 the registry declares two edges, and the absence of the rest is the finding",
    },
    {
      feature: FEATURE_ACTORS,
      scenario: "the product-owner record exists because a loop names it",
      test: "loops-census/04 the honest warns are the deliverable working, and each is attributed",
    },
    {
      feature: FEATURE_PHASE,
      scenario: "build-to-green declares an uncapped ceiling and an unknown owner as two different facts",
      test: "loops-census/04 the four ACD phase loops match their owner/ceiling/measurement/optimizing table",
    },
    {
      feature: FEATURE_PHASE,
      scenario: "review-fix-rereview declares the same two states on its own evidence",
      test: "loops-census/04 the four ACD phase loops match their owner/ceiling/measurement/optimizing table",
    },
    {
      feature: FEATURE_PHASE,
      scenario: "the uncapped pair declare measurement as prose, never as a fabricated pointer",
      test: "loops-census/04 the four ACD phase loops match their owner/ceiling/measurement/optimizing table",
    },
    {
      feature: FEATURE_PHASE,
      scenario: "the uncapped pair name the artifact that acts, never the phase prompt that orchestrates it",
      test: "loops-census/04 the shared-actuator finding fires on a real shared lever",
    },
    {
      feature: FEATURE_PHASE,
      scenario: "the shared actuator is a real shared lever and its arbiter is really absent",
      test: "loops-census/04 the shared-actuator finding fires on a real shared lever",
    },
    {
      feature: FEATURE_PHASE,
      scenario: "the ceiling axis and the cadence axis stay separate on the uncapped pair",
      test: "loops-census/04 only one loop is on a clock, which is why no timescale inversion is reported",
    },
    {
      feature: FEATURE_PHASE,
      scenario: "verify-triage-accept declares the one owner RESEARCH found, and a ceiling of `none`",
      test: "loops-census/04 the four ACD phase loops match their owner/ceiling/measurement/optimizing table",
    },
    {
      feature: FEATURE_PHASE,
      scenario: "three of the four declare optimizing true, and each body says why on its own terms",
      test: "loops-census/04 three loops declare themselves optimizers and all three are unpaired",
    },
    {
      feature: FEATURE_ENGINEERED,
      scenario: "run-resilience declares every machinery field as a pointer",
      test: "loops-census/04 every prose path names a file that exists",
    },
    {
      feature: FEATURE_ENGINEERED,
      scenario: "run-resilience still declares an unknown owner",
      test: "loops-census/04 the honest warns are the deliverable working, and each is attributed",
    },
    {
      feature: FEATURE_ENGINEERED,
      scenario: "run-resilience declares its own cadence and does not borrow the mesh's clock",
      test: "loops-census/04 only one loop is on a clock, which is why no timescale inversion is reported",
    },
    {
      feature: FEATURE_ENGINEERED,
      scenario: "mesh-assignment-reclaim is the day-one registry's only loop on a clock",
      test: "loops-census/04 only one loop is on a clock, which is why no timescale inversion is reported",
    },
    {
      feature: FEATURE_ENGINEERED,
      scenario: "retrospective-memory-ingest declares a per-milestone trigger and no per-loop owner",
      test: "loops-census/04 the honest warns are the deliverable working, and each is attributed",
    },
    {
      feature: FEATURE_ENGINEERED,
      scenario: "none of the three engineered controllers claims to be an optimizer",
      test: "loops-census/04 three loops declare themselves optimizers and all three are unpaired",
    },
    {
      feature: FEATURE_EDGES,
      scenario: "no node monitors, or sets the reference of, itself",
      test: "loops-census/04 no finding in the registry comes from a node confirming itself",
    },
    {
      feature: FEATURE_EDGES,
      scenario: "the registry declares no parameter-tuning edge anywhere",
      test: "loops-census/04 the registry declares two edges, and the absence of the rest is the finding",
    },
    {
      feature: FEATURE_EDGES,
      scenario: "an unwatched loop stays unwatched",
      test: "loops-census/04 the registry declares two edges, and the absence of the rest is the finding",
    },
    {
      feature: FEATURE_EDGES,
      scenario: "an unowned reference stays unowned",
      test: "loops-census/04 the four deliberately unpinned codes are asserted as bounds only",
    },
    {
      feature: FEATURE_CLEAN,
      scenario: "the registry contains exactly nine nodes",
      test: "loops-census/04 the roster is the named nine — seven loops and two actors, each named",
    },
    {
      feature: FEATURE_CLEAN,
      scenario: "the honest warns are the deliverable working, not a defect",
      test: "loops-census/04 the honest warns are the deliverable working, and each is attributed",
    },
    {
      feature: FEATURE_CLEAN,
      scenario: "the three declared optimizers are all unpaired — the PRD thesis, made computable",
      test: "loops-census/04 three loops declare themselves optimizers and all three are unpaired",
    },
    {
      feature: FEATURE_CLEAN,
      scenario: "observe→tune is not declared",
      test: "loops-census/04 the four absences ADR-010 declared are still absent",
    },
    {
      feature: FEATURE_CLEAN,
      scenario: "the timescale check reports no inversion, because only one node is on a clock",
      test: "loops-census/04 only one loop is on a clock, which is why no timescale inversion is reported",
    },
    {
      feature: FEATURE_CLEAN,
      scenario: "no finding in the registry comes from a node confirming itself",
      test: "loops-census/04 no finding in the registry comes from a node confirming itself",
    },
  ],
  excluded: [
    {
      feature: FEATURE_ACTORS,
      scenario: "neither actor node carries the loop-only control fields",
      class: "structural-duplicate",
      reason:
        "A control field on a kind: actor record is loop-key-not-admitted-for-kind, an error-severity finding, so the real-registry error sweep already decides it. This suite takes no error-lane claim.",
      pointer: FF5204_PARSE,
    },
    {
      feature: FEATURE_ACTORS,
      scenario: "every target-setting edge the operator declares is defended in its prose body",
      class: "not-black-box",
      reason:
        "The defence lives in the markdown body the loader discards, and its <path>:<line> citations would redden this suite on any unrelated source edit. The decidable proxy driven here is the edge census: the operator's declared endpoint set, ADR-012 §6/F3's floor included.",
      pointer: "loops-census/04 the registry declares two edges, and the absence of the rest is the finding",
    },
    {
      feature: FEATURE_PHASE,
      scenario: "the autonomous cascade declares a registered command and a config key",
      class: "structural-duplicate",
      reason:
        "The load-bearing clause is that work:next is an id registered in COMMANDS — pointer authority, which FF-5204 resolves over the real registry. The record's declared values are driven by the phase-loop table case here, but no registration claim is taken.",
      pointer: FF5204_POINTERS,
    },
    {
      feature: FEATURE_PHASE,
      scenario: "no ACD phase loop declares `unknown` for a machinery field, or an empty list for anything",
      class: "structural-duplicate",
      reason:
        "The sentinel sweep and the non-empty-list assertion over every kind: loop node are FF-5204's own legs, and an empty list is error-severity besides.",
      pointer: FF5204_PARSE,
    },
    {
      feature: FEATURE_ENGINEERED,
      scenario: "the run-resilience record restates none of the machinery it points at",
      class: "not-black-box",
      reason:
        "The forbidden restatements (transition-table members, failure-class names) are body text the loader discards. The decidable proxy driven here is the field-authority census: every machinery field of run-resilience is a pointer and none is prose, and every ceiling in the registry is uncapped, none or a pointer rather than a restated number.",
      pointer: "loops-census/04 every prose path names a file that exists",
    },
    {
      feature: FEATURE_ENGINEERED,
      scenario: "the dual staleness gate declares the AND, not merely its two operands",
      class: "structural-duplicate",
      reason:
        "Its load-bearing risk is a pointer at an importing module rather than a defining one — the exact thing FF-5204's pointer-authority leg measures, over these very sites (ADR-013 §3).",
      pointer: FF5204_POINTERS,
    },
    {
      feature: FEATURE_ENGINEERED,
      scenario: "the ingest actuator is authored as a module pointer or prose, never as a command that is not registered",
      class: "structural-duplicate",
      reason:
        "The claim is that no command: pointer at the memory surface exists and that the module pointer names a symbol its file declares — pointer authority end to end.",
      pointer: FF5204_POINTERS,
    },
    {
      feature: FEATURE_ENGINEERED,
      scenario: "every pointer these three records declare names a real, correctly located authority",
      class: "structural-duplicate",
      reason: "This scenario IS FF-5204's pointer-authority leg, stated at the record level.",
      pointer: FF5204_POINTERS,
    },
    {
      feature: FEATURE_EDGES,
      scenario: "every declared edge key is one of the five closed types",
      class: "structural-duplicate",
      reason:
        "An edge key outside the closed five is loop-unknown-key and the veto/constraint spelling is loop-malformed-frontmatter-line — both error-severity over the real registry.",
      pointer: FF5204_PARSE,
    },
    {
      feature: FEATURE_EDGES,
      scenario: "every intra-registry endpoint resolves to a declared record",
      class: "structural-duplicate",
      reason:
        "An unresolved endpoint is loop-graph-dangling-endpoint, error-severity. The absence half — no endpoint names observe-tune, observe, degrade or work-doctor — is driven here by the ADR-010 absences case.",
      pointer: FF5204_PARSE,
    },
    {
      feature: FEATURE_EDGES,
      scenario: "every declared edge is defended in the declaring record's prose body",
      class: "not-black-box",
      reason:
        "Every clause is a body claim with a <path>:<line> citation; the loader discards the body, and asserting a line number would redden this suite on every unrelated source edit. The decidable proxy driven here is the edge census over the loaded model.",
      pointer: "loops-census/04 the registry declares two edges, and the absence of the rest is the finding",
    },
    {
      feature: FEATURE_EDGES,
      scenario: "an edge key a record declares carries at least one endpoint",
      class: "structural-duplicate",
      reason:
        "An empty edge list is loop-empty-list, error-severity; the silent-dedup clause is a loader-contract claim over authored fixtures, not a census of the real registry.",
      pointer: FF5204_PARSE,
    },
    {
      feature: FEATURE_EDGES,
      scenario: "no record carries a `depends:` key",
      class: "structural-duplicate",
      reason:
        "depends is outside the admitted union, so a record carrying it emits loop-unknown-key at error severity; the work-item half of the scenario is the item graph's, not this registry's.",
      pointer: FF5204_PARSE,
    },
    {
      feature: FEATURE_CLEAN,
      scenario: "every node's id equals its filename stem",
      class: "structural-duplicate",
      reason: "id-equals-stem is asserted over every real record by FF-5204, and is not re-asserted here.",
      pointer: FF5204_PARSE,
    },
    {
      feature: FEATURE_CLEAN,
      scenario: "all nine records load with zero error-severity findings",
      class: "structural-duplicate",
      reason:
        "The zero-error claim is FF-5204's, and is the one claim this suite exists to complement rather than repeat.",
      pointer: FF5204_PARSE,
    },
    {
      feature: FEATURE_CLEAN,
      scenario: "no record declares a machinery field, a ceiling or an edge as an empty list",
      class: "structural-duplicate",
      reason:
        "FF-5204 asserts each machinery list is a non-empty array over every kind: loop node, and loop-empty-list is error-severity besides.",
      pointer: FF5204_PARSE,
    },
    {
      feature: FEATURE_CLEAN,
      scenario: "every key each record declares is admitted for that record's kind",
      class: "structural-duplicate",
      reason:
        "Kind-scoped admission, the global union and the malformed-line sweep are all error-severity codes over the real registry.",
      pointer: FF5204_PARSE,
    },
  ],
  tables: [
    { feature: FEATURE_CLEAN, index: 0, rows: 20, cases: FINDING_CODE_CASES },
    { feature: FEATURE_CLEAN, index: 1, rows: 4, cases: UNPINNED_CODE_CASES },
    { feature: FEATURE_PHASE, index: 0, rows: 4, cases: PHASE_LOOP_CASES },
  ],
};
