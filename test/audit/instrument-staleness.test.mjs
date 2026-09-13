// milestone 59 / story 03 — STALENESS, SILENCE AND THE PRUNE.
//
// Mechanises all four `@executable` task features of 59/03 against the four audit lanes exported by
// `src/work/loops-checks.mjs`:
//
//   tasks/00_an-unrefreshed-anchor-is-not-an-anchor.feature → assessAnchorFreshness + buildGroundednessReport
//   tasks/01_an-instrument-that-has-said-nothing.feature    → assessInstrumentSilence
//   tasks/02_a-metric-that-has-not-moved.feature            → assessMetricMovement
//   tasks/03_a-loop-nobody-consults.feature                 → assessLoopConsultation
//
// THE CLOCK IS A FIXTURE, NEVER A READING. Not one case in this file calls `Date.now()`. Every
// instant and every window is a literal handed in on the call, which is the only arrangement under
// which "the report reads no clock of its own" is decidable at all — two wall-clock runs agreeing
// would also be green over a module that cached a timestamp. The DURATION LITERALS below live HERE,
// in the test, precisely because they may not live in the subject: converting a declared
// `work.audit.anchorStaleDays` into a window on this clock is the impure command edge's arithmetic
// (59/ADR-005 §2/§4), and FF-5907 holds the module to holding none of it.
//
// THE VACUITY TRAP. Nine of the covered scenarios assert that NOTHING is reported, and all nine are
// green over a lane that returns `[]` unconditionally. Every such case therefore carries, in the
// same test, the same fixture with one field changed that DOES fire.
//
// WHAT IS DECIDED ELSEWHERE AND IS NOT REBUILT HERE. FF-5907
// (`test/arch/loop/acd-loop-checks-pure.test.mjs`) owns the module's SOURCE purity — zero imports, no
// clock, no date literal, no duration literal, no key by which a node asserts its own freshness —
// and the single home of the unmoved-cycles threshold as a source fact. FF-5908
// (`test/arch/audit/acd-audit-reports-what-it-read.test.mjs`) owns the lane registry's completeness and
// binds this module's `audit-ran-on-nothing` text to the census's. This suite decides the BEHAVIOUR:
// what each lane answers over a model it is handed.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadLoops } from "../../src/work/loops.mjs";
import {
  ANCHOR_FRESHNESS_VERDICTS,
  AUDIT_LANE_FINDING_CODES,
  UNMOVED_CYCLES,
  assessAnchorFreshness,
  assessInstrumentSilence,
  assessLoopConsultation,
  assessMetricMovement,
  buildGroundednessReport,
} from "../../src/work/loops-checks.mjs";
import { makeLoopRegistry } from "../support/loop-registry-fixture.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");

// ---------------------------------------------------------------------------------------------
// Fixture builders. Literals only — nothing below reads, writes or stats a path except the two
// cases whose subject IS the real registry on disk, each of which says so in its name.
// ---------------------------------------------------------------------------------------------

const FS_ROOT = path.parse(process.cwd()).root;
const SOURCE = path.join(FS_ROOT, "aof-audit-fixture-not-on-disk", "loops");
const filePath = (id) => path.join(SOURCE, `${id.replace(/[^A-Za-z0-9]+/gu, "-")}.md`);

// The test's own duration arithmetic. The SUBJECT holds none of this (FF-5907).
const DAY = 86_400_000;
const WINDOW = 90 * DAY;
const NOW = Date.UTC(2026, 7, 30);
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

const endpoint = (raw) => {
  const colon = raw.indexOf(":");
  return { raw, scheme: raw.slice(0, colon), operand: raw.slice(colon + 1), resolved: true };
};
const normaliseEdges = (edges = {}) =>
  Object.fromEntries(Object.entries(edges).map(([key, list]) => [key, list.map(endpoint)]));

const model = (nodes) => ({ source: SOURCE, present: true, findings: [], nodes });

/** A `kind: anchor` node as the loader emits it. `checkedAt` is an epoch, or null for UNDATED. */
function anchorNode(id, { checkedAt = null, ground = "process-exit", edges = {} } = {}) {
  const fields = {
    ground: { key: "ground", raw: ground, kind: "enum", value: ground },
    observes: { key: "observes", raw: "module:src/run-store.mjs#attempts", kind: "pointer", pointer: { scheme: "module", operand: "src/run-store.mjs", symbol: "attempts" } },
  };
  if (checkedAt !== null) {
    fields.checked = { key: "checked", raw: iso(checkedAt), kind: "date", value: iso(checkedAt), ms: checkedAt };
  }
  return { id, kind: "anchor", title: id, path: filePath(id), fields, edges: normaliseEdges(edges) };
}

function loopNode(id, { edges = {}, cadence = null } = {}) {
  const fields = {
    controlled: { key: "controlled", raw: "attempt count", kind: "phrase" },
    optimizing: { key: "optimizing", raw: "false", kind: "flag", value: false },
    actuator: [{ key: "actuator", raw: `command:${id}`, kind: "pointer" }],
  };
  if (cadence) fields.cadence = cadence;
  return { id, kind: "loop", title: id, path: filePath(id), fields, edges: normaliseEdges(edges) };
}

function auditorNode(id, { edges = {} } = {}) {
  return {
    id,
    kind: "auditor",
    title: id,
    path: filePath(id),
    fields: {
      cadence: { key: "cadence", raw: "event:per-milestone", kind: "event", trigger: "per-milestone", scopeRank: 2 },
      escalation: { key: "escalation", raw: "actor:operator", kind: "ref", scheme: "actor", operand: "operator" },
    },
    edges: normaliseEdges(edges),
  };
}

const periodic = (ms, raw) => ({ key: "cadence", raw, kind: "periodic", ms });
const eventCadence = (trigger, extra = {}) => ({ key: "cadence", raw: `event:${trigger}`, kind: "event", trigger, ...extra });
const unknownCadence = () => ({ key: "cadence", raw: "unknown", kind: "unknown" });

const freshness = (now = NOW, window = WINDOW) => ({ now, window });
const observation = (extra = {}) => ({ root: SOURCE, ...extra });

const verdictOf = (report, id) => report.anchors.find((entry) => entry.id === id)?.verdict ?? null;
const componentHolding = (report, id) => {
  const held = report.components.filter((component) => component.members.includes(id));
  assert.equal(held.length, 1, `${id} is a member of exactly one component`);
  return held[0];
};
const codes = (findings) => findings.map((entry) => entry.code);
const withCode = (findings, code) => findings.filter((entry) => entry.code === code);

// =================================================================================================
// TASK 00 — an unrefreshed anchor is not an anchor.
// =================================================================================================

// Scenario Outline: an anchor's freshness has three answers — all THREE rows.
const FRESHNESS_ROWS = Object.freeze([
  { situation: "checked inside the window", checkedAt: NOW - (WINDOW - DAY), verdict: "fresh" },
  { situation: "checked longer ago than the window allows", checkedAt: NOW - (WINDOW + DAY), verdict: "stale" },
  { situation: "that has never declared a checked date", checkedAt: null, verdict: "undated" },
]);

const TASK_00 = [
  {
    name: "instrument-staleness/00: an anchor's freshness has three answers",
    run: () => {
      const seen = new Set();
      for (const row of FRESHNESS_ROWS) {
        const subject = anchorNode("anchor:subject", { checkedAt: row.checkedAt });
        const result = assessAnchorFreshness(model([subject]), freshness());
        assert.equal(result.anchors.length, 1, `${row.situation}: exactly one anchor was considered`);
        assert.equal(result.anchors[0].verdict, row.verdict, `an anchor ${row.situation} is reported as ${row.verdict}`);
        // A FINDING IS RAISED FOR STALE ALONE. `undated` is a REPORTED STATE, not a defect — that is
        // the whole point of the third answer, and collapsing it into stale is what would redden
        // every anchor shipped before this milestone (STORY.md §Notes, 54/04's wall of inherited red).
        assert.deepEqual(
          codes(result.findings), row.verdict === "stale" ? ["anchor-stale"] : [],
          `${row.situation}: ${row.verdict === "stale" ? "one anchor-stale finding" : "no finding at all"}`,
        );
        seen.add(row.verdict);
      }
      assert.deepEqual([...seen].sort(), [...ANCHOR_FRESHNESS_VERDICTS].sort(), "all three declared verdicts are reachable, and the table drives every one of them");
    },
  },
  {
    name: "instrument-staleness/00: an anchor exactly at the window boundary is not yet stale",
    run: () => {
      const atBoundary = assessAnchorFreshness(model([anchorNode("anchor:edge", { checkedAt: NOW - WINDOW })]), freshness());
      assert.equal(atBoundary.anchors[0].verdict, "fresh", "checked exactly as long ago as the window allows is FRESH");
      assert.deepEqual(codes(atBoundary.findings), [], "…and raises nothing");
      // THE CONTROL: one tick past the boundary, and the same fixture fires. Without it the
      // assertion above is green over a lane that never reports anything.
      const past = assessAnchorFreshness(model([anchorNode("anchor:edge", { checkedAt: NOW - WINDOW - 1 })]), freshness());
      assert.equal(past.anchors[0].verdict, "stale", "one tick further back is stale — the boundary is a decision, not a dead branch");
    },
  },
  {
    name: "instrument-staleness/00: every anchor shipped before this milestone is undated, and none of them is stale (the real registry on disk)",
    run: async () => {
      // Both homes: the SOURCE the bundle ships from (53/ADR-012's single source) and the INSTALLED
      // registry this repository runs on. A `checked:` date appearing in either is a real event.
      for (const home of ["src/bundle", ".aof"]) {
        const registry = await loadLoops({ aofDir: path.join(repoRoot, home) });
        assert.equal(registry.present, true, `${home}: the registry is present — the sweep is not over nothing`);
        const anchors = registry.nodes.filter((node) => node.kind === "anchor");
        assert.ok(anchors.length >= 3, `${home}: ${anchors.length} anchors shipped, so the claim below is non-vacuous`);
        const result = assessAnchorFreshness(registry, freshness());
        assert.deepEqual(
          result.anchors.map((entry) => entry.verdict), anchors.map(() => "undated"),
          `${home}: every anchor shipped before this milestone is UNDATED`,
        );
        assert.deepEqual(withCode(result.findings, "anchor-stale"), [], `${home}: and not one of them is stale`);
        assert.equal(result.read.count, anchors.length, `${home}: the lane says how many anchors it read`);
      }
    },
  },
  {
    name: "instrument-staleness/00: a loop grounded only through stale anchors degrades rather than disappearing",
    run: () => {
      const stale = anchorNode("anchor:soak", { checkedAt: NOW - (WINDOW + DAY), edges: { "data-feed": ["loop:guarded"] } });
      const subject = model([stale, loopNode("loop:guarded")]);
      const report = buildGroundednessReport(subject, {}, freshness());

      assert.equal(componentHolding(report, "loop:guarded").verdict, "stale", "the loop's ground is reported as stale");
      assert.ok(codes(report.findings).includes("loop-ground-stale"), "…and the degradation is named by its own code");
      assert.ok(
        withCode(report.findings, "loop-ground-stale")[0].message.includes("anchor:soak"),
        "…which names the anchor nobody refreshed",
      );
      // IT IS NOT UNANCHORED (ADR-005 §2). The edge is declared and the authority resolves; what has
      // lapsed is the reading. Collapsing the two would lose the difference between never having
      // been grounded and having been grounded a while ago.
      assert.deepEqual(report.unanchoredLoops, [], "the loop is NOT reported as unanchored");
      assert.deepEqual(withCode(report.findings, "loop-anchor-absent"), [], "…and no anchor-absent finding is raised for it");

      // THE CONTROL: the same registry inside its window is `anchored` and raises neither code.
      const fresh = buildGroundednessReport(
        model([anchorNode("anchor:soak", { checkedAt: NOW - DAY, edges: { "data-feed": ["loop:guarded"] } }), loopNode("loop:guarded")]),
        {}, freshness(),
      );
      assert.equal(componentHolding(fresh, "loop:guarded").verdict, "anchored", "a refreshed anchor grounds the loop outright");
      assert.deepEqual(codes(fresh.findings), [], "…and the whole report is clean");
    },
  },
  {
    name: "instrument-staleness/00: a loop with one fresh anchor is not degraded by a stale sibling",
    run: () => {
      const report = buildGroundednessReport(model([
        anchorNode("anchor:fresh", { checkedAt: NOW - DAY, edges: { "data-feed": ["loop:guarded"] } }),
        anchorNode("anchor:stale", { checkedAt: NOW - (WINDOW + DAY), edges: { "data-feed": ["loop:guarded"] } }),
        loopNode("loop:guarded"),
      ]), {}, freshness());

      assert.equal(componentHolding(report, "loop:guarded").verdict, "anchored", "one fresh anchor edge keeps the loop grounded");
      assert.deepEqual(componentHolding(report, "loop:guarded").unrefreshedGround, [], "…so the loop's ground is not degraded");
      // SCOPED BY THE SUBJECT, never by the length of the findings array. The stale anchor's OWN
      // singleton component is still degraded — its only ground is itself and nobody refreshed it,
      // which is 55's shape for the resolution-stale case verbatim (`the anchor's own component and
      // the one it feeds are both reported stale`, 58/FF-5805). What this scenario denies is that
      // the LOOP inherits it.
      assert.deepEqual(
        withCode(report.findings, "loop-ground-stale").filter((entry) => entry.message.includes("loop:guarded")), [],
        "…and no degradation finding names the loop",
      );
      // AND THE TWO FINDINGS DO NOT CANCEL. The stale sibling is still reported at its own record:
      // they are separate facts about separate records.
      assert.deepEqual(
        withCode(report.findings, "anchor-stale").map((entry) => entry.path), [filePath("anchor:stale")],
        "the stale anchor is still reported as stale, at its own file",
      );
      assert.equal(verdictOf(report, "anchor:fresh"), "fresh", "…and the fresh one is reported fresh");
    },
  },
  {
    name: "instrument-staleness/00: a loop with no anchor edge at all is still unanchored, and is not stale",
    run: () => {
      const report = buildGroundednessReport(model([loopNode("loop:orphan")]), {}, freshness());
      assert.deepEqual(report.unanchoredLoops, ["loop:orphan"], "the loop is reported as unanchored");
      assert.ok(codes(report.findings).includes("loop-anchor-absent"), "…by the code 55 froze for it");
      assert.deepEqual(withCode(report.findings, "loop-ground-stale"), [], "and it is NOT reported as stale — there is no anchor to have gone stale");
      assert.deepEqual(withCode(report.findings, "anchor-stale"), [], "…nor is any anchor named");
      assert.notEqual(componentHolding(report, "loop:orphan").verdict, "stale", "the verdict for a component with no ground at all is not staleness");
    },
  },
  {
    name: "instrument-staleness/00: the report reads no clock of its own",
    run: () => {
      const subject = model([
        anchorNode("anchor:soak", { checkedAt: NOW - (WINDOW + DAY), edges: { "data-feed": ["loop:guarded"] } }),
        loopNode("loop:guarded"),
      ]);
      const first = buildGroundednessReport(subject, {}, freshness());
      const second = buildGroundednessReport(subject, {}, freshness());
      assert.equal(JSON.stringify(second), JSON.stringify(first), "the same time and window handed in twice produce identical results");

      // NEITHER DEPENDED ON THE TIME AT WHICH IT RAN, and this is the leg that decides it: a run
      // whose only difference is the HANDED-IN instant answers differently, so the answer is a
      // function of the argument and of nothing ambient. A module reading its own clock could not
      // produce the earlier verdict at all.
      const earlier = buildGroundednessReport(subject, {}, freshness(NOW - (WINDOW + DAY) + 1));
      assert.equal(verdictOf(earlier, "anchor:soak"), "fresh", "the same anchor, judged at an earlier handed-in instant, is fresh");
      assert.equal(verdictOf(first, "anchor:soak"), "stale", "…and stale at the later one");

      // THE TWO-ARGUMENT CALL IS UNTOUCHED. `work:loops groundedness` and `work:loops validate` hand
      // in no window, so they get 55's report byte-for-byte and no freshness section at all — an
      // empty `anchors: []` there would read as "nothing is stale", which is the substitution
      // ADR-004 §1 exists to forbid.
      const windowless = buildGroundednessReport(subject, {});
      assert.equal(Object.hasOwn(windowless, "anchors"), false, "a report that was never given a window says nothing about freshness");
      assert.equal(Object.hasOwn(windowless, "read"), false, "…and declares no read of a population it never swept");
      for (const component of windowless.components) {
        assert.equal(Object.hasOwn(component, "unrefreshedGround"), false, "…and no component carries a freshness key");
        assert.equal(Object.hasOwn(component, "groundVerdict"), false, "…nor a degraded-from key it was never given the input for");
      }
      assert.deepEqual(
        Object.keys(windowless).sort(), ["components", "findings", "unanchoredLoops"],
        "the two-argument report's key set is exactly 55's, whole",
      );
      assert.equal(componentHolding(windowless, "loop:guarded").verdict, "anchored", "…and its verdict is 55's, undegraded");
      // AND THE WINDOW IS REFUSED RATHER THAN DEFAULTED: an incomplete freshness argument is an
      // error, never a guessed window.
      assert.throws(() => buildGroundednessReport(subject, {}, { now: NOW }), /freshness\.window/u, "a window that was not handed in is refused");
      assert.throws(() => buildGroundednessReport(subject, {}, { window: WINDOW }), /freshness\.now/u, "…and so is an absent instant");
    },
  },
  {
    // A STALE ANCHOR DEGRADES A VERDICT; IT DOES NOT DELETE ONE — the whole of ADR-005 §2 and of
    // this story's binding Note, stated as the property that actually decides it: the three-argument
    // report is a strict SUPERSET of the two-argument one.
    //
    // The first version of this module folded the degradation into the same ternary arm as 55's
    // resolution-staleness, so it WON over the `exogenous-only` arm. A registry whose only ground
    // was an exogenous anchor 91 days old then lost its `loop-graph-grounded-exogenous-only`
    // warning the moment a window was handed in — a `CHECK_FINDING_CODES` finding that
    // `aof work loops groundedness` still reports over that same registry. Two commands, one
    // registry, two answers. That is what this case exists to make impossible, and the
    // exogenous-only row below is the exact fixture that was measured failing.
    name: "instrument-staleness/00: handing in a window never deletes a finding the windowless report produced",
    run: async () => {
      const key = (entry) => `${entry.code}|${entry.path}|${entry.message}`;
      const staleAnchor = (id, ground, target) =>
        anchorNode(id, { ground, checkedAt: NOW - (WINDOW + DAY), edges: { "data-feed": [target] } });

      const registries = [
        {
          label: "ground is exogenous only, through an anchor nobody refreshed",
          model: model([staleAnchor("anchor:soak", "exogenous", "loop:guarded"), loopNode("loop:guarded")]),
          resolutions: {},
          preserved: ["loop-graph-grounded-exogenous-only"],
        },
        {
          label: "a component with no ground at all, beside a stale anchor",
          model: model([staleAnchor("anchor:soak", "process-exit", "loop:guarded"), loopNode("loop:guarded"), loopNode("loop:orphan")]),
          resolutions: {},
          preserved: ["loop-anchor-absent", "loop-graph-ungrounded-component"],
        },
        {
          label: "55's resolution-staleness and 59's temporal staleness on one anchor",
          model: model([staleAnchor("anchor:soak", "process-exit", "loop:guarded"), loopNode("loop:guarded")]),
          resolutions: { "anchor:soak": false },
          preserved: ["loop-anchor-stale"],
        },
      ];

      for (const registry of registries) {
        const windowless = buildGroundednessReport(registry.model, registry.resolutions);
        const windowed = buildGroundednessReport(registry.model, registry.resolutions, freshness());
        const lost = windowless.findings.filter((entry) => !windowed.findings.some((other) => key(other) === key(entry)));
        assert.deepEqual(lost.map(key), [], `${registry.label}: no finding is lost when a window is handed in`);
        for (const code of registry.preserved) {
          assert.ok(codes(windowless.findings).includes(code), `${registry.label}: the windowless report really did produce ${code} — the claim above is not vacuous`);
          assert.ok(codes(windowed.findings).includes(code), `${registry.label}: …and the windowed report still produces it`);
        }
        // THE CLASSIFICATION SURVIVES BESIDE THE DEGRADATION. `verdict` degrades; `groundVerdict`
        // still says what the ground was, so a face can report both rather than one replacing the other.
        for (const component of windowed.components) {
          const before = windowless.components.find((entry) => entry.members.join() === component.members.join());
          assert.equal(component.groundVerdict, before.verdict, `${registry.label}: [${component.members}] still reports the ground it was classified with`);
          if (component.unrefreshedGround.length > 0) {
            assert.equal(component.verdict, "stale", `${registry.label}: [${component.members}] degrades…`);
          } else {
            assert.equal(component.verdict, before.verdict, `${registry.label}: [${component.members}] is untouched…`);
          }
        }
        assert.deepEqual(windowed.unanchoredLoops, windowless.unanchoredLoops, `${registry.label}: and the unanchored lane never consults freshness`);
      }

      // AND OVER THE REAL REGISTRY, where every anchor is undated: the windowed report is finding-for
      // -finding identical to the windowless one, so the audit cannot disagree with
      // `aof work loops groundedness` about the registry this repository actually ships.
      const shipped = await loadLoops({ aofDir: path.join(repoRoot, "src/bundle") });
      const before = buildGroundednessReport(shipped, {});
      const after = buildGroundednessReport(shipped, {}, freshness());
      assert.deepEqual(after.findings.map(key), before.findings.map(key), "over the shipped registry the two calls report exactly the same findings");
      assert.deepEqual(after.components.map((entry) => entry.verdict), before.components.map((entry) => entry.verdict), "…and exactly the same verdicts");
    },
  },
];

// =================================================================================================
// TASK 01 — an instrument that has said nothing.
// =================================================================================================

const instrument = (id, cadence, reading = null) => ({ id, path: filePath(id), cadence, reading });
const DAILY = periodic(DAY, "periodic:1d");

// Scenario Outline: the rule is the same whatever the instrument is — all THREE rows. Each row is a
// DIFFERENT KIND of instrument and every one is judged by the same sentence, which is the claim:
// ADR-004 §2 keys the rule on `cadence:` so a channel added later needs no new check.
const INSTRUMENT_ROWS = Object.freeze([
  { instrument: "loop measurement", id: "loop:build-to-green" },
  { instrument: "watcher counter", id: "watcher:intervention-rate" },
  { instrument: "feedback channel", id: "channel:operator-feedback" },
]);

const TASK_01 = [
  {
    name: "instrument-staleness/01: an instrument that has spoken inside its window is not reported",
    run: () => {
      const heard = assessInstrumentSilence(
        [instrument("watcher:rate", DAILY, { at: NOW - DAY / 2 })],
        observation({ now: NOW }),
      );
      assert.equal(heard.instruments[0].verdict, "heard", "a reading inside the window is heard");
      assert.deepEqual(withCode(heard.findings, "instrument-silent"), [], "the instrument is not reported as silent");
      // THE CONTROL: the same instrument with the reading moved outside its own window fires.
      const quiet = assessInstrumentSilence(
        [instrument("watcher:rate", DAILY, { at: NOW - 3 * DAY })],
        observation({ now: NOW }),
      );
      assert.equal(quiet.instruments[0].verdict, "silent", "…and moving the same reading outside the window reports it");
    },
  },
  {
    name: "instrument-staleness/01: an instrument that has produced nothing inside its window is reported as silent, and the finding names all three things",
    run: () => {
      const result = assessInstrumentSilence(
        [instrument("watcher:intervention-rate", DAILY, { at: NOW - 3 * DAY })],
        observation({ now: NOW }),
      );
      assert.equal(result.instruments[0].verdict, "silent", "the instrument is reported as silent");
      const finding = withCode(result.findings, "instrument-silent");
      assert.equal(finding.length, 1, "exactly one silence finding");
      assert.ok(finding[0].message.includes("watcher:intervention-rate"), "the finding names the instrument");
      assert.ok(finding[0].message.includes("periodic:1d"), "…its declared cadence, as declared");
      // HOW LONG IT HAS BEEN QUIET, AS A MULTIPLE OF ITS OWN DECLARED PERIOD. A duration rendered in
      // units would need the ms/s/m/h/d table this module may not hold (FF-5907); two numbers on one
      // handed-in clock divide to a unit-free multiple that says the same thing.
      assert.ok(finding[0].message.includes("3.00"), `…and how long it has been quiet: ${finding[0].message}`);
      assert.equal(finding[0].path, filePath("watcher:intervention-rate"), "the finding anchors at the instrument's own record");
      assert.equal(finding[0].severity, "warn", "silence is reported, never enforced");
    },
  },
  {
    name: "instrument-staleness/01: an instrument with an unknown cadence is reported as unjudgeable",
    run: () => {
      const result = assessInstrumentSilence(
        [instrument("loop:legacy", unknownCadence(), { at: NOW - 400 * DAY })],
        observation({ now: NOW }),
      );
      const entry = result.instruments[0];
      assert.equal(entry.verdict, "unjudgeable", "an instrument declaring no cadence cannot be judged this way");
      assert.equal(entry.window, null, "it is reported as having NO WINDOW to judge against");
      assert.equal(entry.reason, "cadence-unknown", "…and the result says why rather than guessing a window on its behalf");
      assert.deepEqual(withCode(result.findings, "instrument-silent"), [], "no silence finding is raised for it");
      // THE CONTROL: the identical reading under a declared cadence IS judged, so "unjudgeable" is a
      // decision about the cadence and not a lane that never fires.
      const judged = assessInstrumentSilence([instrument("loop:legacy", DAILY, { at: NOW - 400 * DAY })], observation({ now: NOW }));
      assert.equal(judged.instruments[0].verdict, "silent", "the same reading under a declared cadence is silent");
    },
  },
  {
    name: "instrument-staleness/01: the rule is the same whatever the instrument is",
    run: () => {
      const instruments = INSTRUMENT_ROWS.map((row) => instrument(row.id, DAILY, { at: NOW - 5 * DAY }));
      const result = assessInstrumentSilence(instruments, observation({ now: NOW }));
      assert.equal(result.instruments.length, INSTRUMENT_ROWS.length, "every row of the table is driven");
      for (const [index, row] of INSTRUMENT_ROWS.entries()) {
        assert.equal(result.instruments[index].verdict, "silent", `a silent ${row.instrument} is reported as silent`);
      }
      const silences = withCode(result.findings, "instrument-silent");
      assert.deepEqual(
        silences.map((entry) => entry.code), INSTRUMENT_ROWS.map(() => "instrument-silent"),
        "…by the SAME rule and the same code — one sentence, not one per channel",
      );
      assert.deepEqual(
        silences.map((entry) => entry.message.replace(/^\S+/u, "<id>")).filter((value, index, all) => all.indexOf(value) === index).length,
        1,
        "…and the three messages differ only in the instrument's name, which is what 'the same rule' means",
      );
    },
  },
  {
    name: "instrument-staleness/01: an event cadence is judged by its own scope, not converted to a duration",
    run: () => {
      const trigger = eventCadence("per-item");
      const result = assessInstrumentSilence(
        [instrument("loop:build-to-green", trigger, { occurrences: 3 })],
        observation({ now: NOW }),
      );
      const entry = result.instruments[0];
      assert.equal(entry.verdict, "silent", "an event instrument that has produced no reading across its trigger's occurrences is silent");
      assert.deepEqual(entry.window, { kind: "event", trigger: "per-item", occurrences: 1 }, "it is judged against OCCURRENCES of that event");
      assert.deepEqual(entry.quiet, { occurrences: 3 }, "…and the quiet it reports is counted in occurrences");
      assert.ok(withCode(result.findings, "instrument-silent")[0].message.includes("occurrence(s) of per-item"), "…which the finding names");

      // NO DURATION IS DERIVED FROM THE TRIGGER, and this is the leg that proves it rather than
      // asserting it: an event cadence carrying a PLANTED `ms` — the field a duration would be read
      // from — answers identically. A lane that converted the trigger would move.
      const planted = assessInstrumentSilence(
        [instrument("loop:build-to-green", eventCadence("per-item", { ms: 1 }), { occurrences: 3 })],
        observation({ now: NOW }),
      );
      assert.equal(JSON.stringify(planted), JSON.stringify(result), "a planted duration on an event cadence changes nothing — none is derived from the trigger");
    },
  },
  {
    // THE EVENT BRANCH'S SINGLE DECISION POINT, DRIVEN ON BOTH SIDES AND AT ITS BOUNDARY. With only
    // 0 and 3 driven, `>=` -> `>` and `>= occurrences + 1` both survive: the threshold could move a
    // whole occurrence with CI green. The `absent` row is the other half — "nobody counted" is not
    // "nobody spoke", which is ADR-004 §1's rule and the one `assessLoopConsultation` already
    // enforces by REQUIRING its executions. Reporting silence over an uncounted channel would be a
    // verdict about a question nobody asked.
    //
    // The feature fixes no boundary for this branch and names no absent-count state; both are logged
    // in `wiki/work/59_milestone_audit-loops/STATE.md` under `## Feedback (for retro)` as contract
    // gaps for the PO, and decided here against the behaviour.
    name: "instrument-staleness/01: the event branch is decided at its threshold, and an uncounted channel is not silence",
    run: () => {
      const rows = [
        { occurrences: 0, verdict: "heard", reason: null, why: "no occurrence since the last reading is not silence" },
        { occurrences: 1, verdict: "silent", reason: null, why: "ONE completed occurrence with no reading is one missed reading — the boundary" },
        { occurrences: 3, verdict: "silent", reason: null, why: "…and three is silence by the same rule" },
        { occurrences: null, verdict: "unjudgeable", reason: "no-occurrence-count", why: "nobody counted is not nobody spoke" },
      ];
      for (const row of rows) {
        const reading = row.occurrences === null ? {} : { occurrences: row.occurrences };
        const result = assessInstrumentSilence(
          [instrument("loop:build-to-green", eventCadence("per-item"), reading)],
          observation({ now: NOW }),
        );
        const entry = result.instruments[0];
        assert.equal(entry.verdict, row.verdict, `occurrences=${row.occurrences}: ${row.why}`);
        assert.equal(entry.reason, row.reason, `occurrences=${row.occurrences}: the result says why, or says nothing because there is nothing to explain`);
        assert.equal(
          withCode(result.findings, "instrument-silent").length, row.verdict === "silent" ? 1 : 0,
          `occurrences=${row.occurrences}: a finding is raised exactly when the verdict is silence`,
        );
        if (row.occurrences === null) {
          assert.equal(entry.quiet, null, "an uncounted channel reports no quiet, because none was measured");
          assert.notEqual(entry.window, null, "…but the window it WOULD be judged against is still named");
        }
      }
    },
  },
  {
    name: "instrument-staleness/01: the assessment says how many instruments it considered, and one that considered none ran on nothing",
    run: () => {
      const populated = assessInstrumentSilence(
        INSTRUMENT_ROWS.map((row) => instrument(row.id, DAILY, { at: NOW })),
        observation({ now: NOW }),
      );
      assert.equal(populated.read.count, 3, "the result reports the number of instruments it considered");
      assert.equal(populated.read.floor, 1, "…together with the floor below which the result means nothing");
      assert.equal(populated.read.sweep, "instrument-silence", "…and names the sweep that produced it");
      assert.deepEqual(withCode(populated.findings, "audit-ran-on-nothing"), [], "a populated sweep is not reported as having run on nothing");

      const empty = assessInstrumentSilence([], observation({ now: NOW }));
      assert.equal(empty.read.count, 0, "an assessment that considered none says so in its read");
      const ranOnNothing = withCode(empty.findings, "audit-ran-on-nothing");
      assert.equal(ranOnNothing.length, 1, "…and is REPORTED as having run on nothing rather than reported clean");
      assert.equal(ranOnNothing[0].severity, "error", "which is the one error this lane raises");
      assert.ok(ranOnNothing[0].message.includes("instrument-silence"), "the finding names the sweep");
      assert.ok(ranOnNothing[0].message.includes(SOURCE), "…the root it walked");
      assert.ok(ranOnNothing[0].message.includes("required 1"), "…and the floor it missed");
    },
  },
  {
    // THE STORY'S HEADLINE CASE, AND IT WAS UNENFORCED. A periodic instrument that has NEVER produced
    // a reading is the watcher whose counter quietly stopped being produced — the thing this
    // milestone exists to catch. Dropping the `at == null ||` disjunct made it report `heard`, and
    // every case in this file plus both arch gates stayed green while the "never produced one"
    // message branch was rendered by nothing at all.
    name: "instrument-staleness/01: a periodic instrument that has never produced a reading is silent, not heard",
    run: () => {
      for (const [label, reading] of [["no reading object at all", null], ["a reading with no instant", {}]]) {
        const result = assessInstrumentSilence([instrument("watcher:mute", DAILY, reading)], observation({ now: NOW }));
        const entry = result.instruments[0];
        assert.equal(entry.verdict, "silent", `${label}: an instrument that has never spoken is SILENT — never heard`);
        assert.equal(entry.quiet, null, `${label}: there is no elapsed span, because there is no reading to measure from`);
        const finding = withCode(result.findings, "instrument-silent");
        assert.equal(finding.length, 1, `${label}: and the silence is reported`);
        assert.ok(finding[0].message.includes("watcher:mute"), `${label}: the finding names the instrument`);
        assert.ok(finding[0].message.includes("periodic:1d"), `${label}: …and its declared cadence`);
        assert.ok(finding[0].message.includes("has never produced one"), `${label}: …and says it has never spoken, rather than quoting a span it does not have`);
      }
      // THE CONTROL: the same instrument with a reading inside its window is heard, so the branch
      // above is a decision about the reading and not a lane that reports everything.
      const heard = assessInstrumentSilence([instrument("watcher:mute", DAILY, { at: NOW })], observation({ now: NOW }));
      assert.equal(heard.instruments[0].verdict, "heard", "…and one reading is all it takes to be heard");
    },
  },
  {
    // THE PERIODIC WINDOW HAS A BOUNDARY AND IT IS DECIDED HERE. With only a three-periods-stale
    // fixture, `>` -> `>=` survives and so does `> cadence.ms * 2`: the window could drift threefold
    // with CI green. Task 00 fixes and drives its boundary explicitly; this is the same rule one lane
    // over, and the two agree — a reading exactly one window old is DUE, not overdue.
    name: "instrument-staleness/01: a reading exactly one period old is not yet silence, and one tick past is",
    run: () => {
      const rows = [
        { label: "half a period old", at: NOW - DAY / 2, verdict: "heard" },
        { label: "exactly one period old", at: NOW - DAY, verdict: "heard" },
        { label: "one tick past one period", at: NOW - DAY - 1, verdict: "silent" },
        { label: "two periods old", at: NOW - 2 * DAY, verdict: "silent" },
      ];
      for (const row of rows) {
        const result = assessInstrumentSilence([instrument("watcher:rate", DAILY, { at: row.at })], observation({ now: NOW }));
        assert.equal(result.instruments[0].verdict, row.verdict, `${row.label}: reported ${row.verdict}`);
        assert.equal(
          withCode(result.findings, "instrument-silent").length, row.verdict === "silent" ? 1 : 0,
          `${row.label}: a finding is raised exactly when the verdict is silence`,
        );
      }
      // …AND THE WINDOW IS THE INSTRUMENT'S OWN, never a constant. The identical reading under a
      // cadence twice as slow is heard, which is what "judged against its OWN cadence" means.
      const slower = assessInstrumentSilence(
        [instrument("watcher:rate", periodic(4 * DAY, "periodic:4d"), { at: NOW - 2 * DAY })],
        observation({ now: NOW }),
      );
      assert.equal(slower.instruments[0].verdict, "heard", "two days of silence is nothing to an instrument that speaks every four");
    },
  },
  {
    // A MALFORMED CADENCE IS NOT AN UNDECLARED ONE. This is the lane whose whole thesis is that two
    // states a reader would merge are different facts; filing a broken `periodic:` under "declares no
    // cadence" reports a defect as an honest omission and sends the reader to the wrong place.
    name: "instrument-staleness/01: a cadence that is present but unusable is reported malformed, never undeclared",
    run: () => {
      const rows = [
        { label: "a periodic cadence whose span is not a number", cadence: { key: "cadence", raw: "periodic:1d", kind: "periodic", ms: "1d" }, reason: "cadence-malformed" },
        { label: "an event cadence with no trigger", cadence: { key: "cadence", raw: "event:", kind: "event" }, reason: "cadence-malformed" },
        { label: "a cadence declared honestly unknown", cadence: unknownCadence(), reason: "cadence-unknown" },
        { label: "no cadence at all", cadence: undefined, reason: "cadence-unknown" },
      ];
      for (const row of rows) {
        const result = assessInstrumentSilence([instrument("loop:x", row.cadence, { at: NOW - 400 * DAY })], observation({ now: NOW }));
        const entry = result.instruments[0];
        assert.equal(entry.verdict, "unjudgeable", `${row.label}: cannot be judged this way`);
        assert.equal(entry.reason, row.reason, `${row.label}: and the result says WHICH kind of unjudgeable it is`);
        assert.equal(entry.window, null, `${row.label}: with no window to judge against`);
        assert.deepEqual(withCode(result.findings, "instrument-silent"), [], `${row.label}: and no silence finding is raised for it`);
      }
      assert.equal(new Set(rows.map((row) => row.reason)).size, 2, "the two reasons are genuinely distinguished by this table, not merged into one bucket");
    },
  },
];

// =================================================================================================
// TASK 02 — a metric that has not moved.
// =================================================================================================

const counter = (id, readings) => ({ id, path: filePath(id), counter: "interventions per run", readings });
const held = (value, times) => Array.from({ length: times }, () => value);

const TASK_02 = [
  {
    name: "instrument-staleness/02: a counter that has moved is not reported",
    run: () => {
      const moved = assessMetricMovement([counter("watcher:rate", [...held(7, UNMOVED_CYCLES - 1), 8])], observation());
      assert.equal(moved.counters[0].verdict, "moved", "a counter that changed within the declared number of cycles has moved");
      assert.deepEqual(withCode(moved.findings, "metric-unmoved"), [], "the watcher is not reported");
      // THE CONTROL: the same reading count with the last value unchanged DOES fire.
      const stuck = assessMetricMovement([counter("watcher:rate", held(7, UNMOVED_CYCLES))], observation());
      assert.equal(stuck.counters[0].verdict, "unmoved", "…and holding that same value one reading longer reports it");
    },
  },
  {
    name: "instrument-staleness/02: a counter unchanged across the declared number of cycles is reported, and the finding names all three things",
    run: () => {
      const result = assessMetricMovement([counter("watcher:intervention-rate", held(42, UNMOVED_CYCLES + 4))], observation());
      assert.equal(result.counters[0].verdict, "unmoved", "the watcher is reported as having an unmoved metric");
      const finding = withCode(result.findings, "metric-unmoved");
      assert.equal(finding.length, 1, "exactly one unmoved-metric finding");
      assert.ok(finding[0].message.includes("watcher:intervention-rate"), "the finding names the watcher");
      assert.ok(finding[0].message.includes("42"), "…the value");
      assert.ok(finding[0].message.includes(String(UNMOVED_CYCLES + 4)), "…and how many cycles it has held it");
      assert.equal(finding[0].severity, "warn", "the judgment is deliberately weak: something to look at, not a fault");
      assert.equal(finding[0].path, filePath("watcher:intervention-rate"), "and it anchors at the watcher's own record");
    },
  },
  {
    name: "instrument-staleness/02: a counter with fewer readings than the threshold is not yet judged",
    run: () => {
      const result = assessMetricMovement([counter("watcher:young", held(3, UNMOVED_CYCLES - 1))], observation());
      assert.equal(result.counters[0].verdict, "not-yet-judgeable", "it is reported as not yet judgeable");
      assert.equal(result.counters[0].readings, UNMOVED_CYCLES - 1, "…and the result says how many readings it had");
      assert.deepEqual(withCode(result.findings, "metric-unmoved"), [], "no unmoved-metric finding is raised for it");
      // THE CONTROL: one more identical reading crosses the threshold and fires.
      const judged = assessMetricMovement([counter("watcher:young", held(3, UNMOVED_CYCLES))], observation());
      assert.equal(judged.counters[0].verdict, "unmoved", "the very next identical reading is judgeable, and unmoved");
    },
  },
  {
    name: "instrument-staleness/02: a counter with no readings at all is silent rather than unmoved",
    run: () => {
      const result = assessMetricMovement([counter("watcher:mute", [])], observation());
      assert.equal(result.counters[0].verdict, "silent", "it is reported as silent");
      assert.deepEqual(withCode(result.findings, "metric-unmoved"), [], "and it is NOT reported as having an unmoved metric");
      assert.equal(result.counters[0].value, null, "there is no value to have held");
      // NOTHING WAS QUIETLY BORROWED FROM THE OTHER LANE EITHER: silence has ONE home and this lane
      // names the state without raising the other lane's code (ADR-004 §2's one-rule discipline).
      assert.deepEqual(withCode(result.findings, "instrument-silent"), [], "…and the silence lane's code is not raised from here");
    },
  },
  {
    name: "instrument-staleness/02: the number of cycles has one home",
    run: () => {
      // IT COMES FROM A SINGLE DECLARED SOURCE. The lane called with no threshold uses the exported
      // constant, and the verdict tracks that constant rather than any number spelled at a call site.
      const atThreshold = assessMetricMovement([counter("watcher:rate", held(1, UNMOVED_CYCLES))], observation());
      assert.equal(atThreshold.counters[0].cycles, UNMOVED_CYCLES, "the result reports the threshold it used, and it is the exported one");
      assert.equal(atThreshold.counters[0].verdict, "unmoved", "…and the verdict is decided by it");
      const belowThreshold = assessMetricMovement([counter("watcher:rate", held(1, UNMOVED_CYCLES - 1))], observation());
      assert.equal(belowThreshold.counters[0].verdict, "not-yet-judgeable", "one reading short of the SAME constant is not yet judgeable");
      // …and an argued-about threshold is argued about in ONE place: handing a different one in
      // moves every verdict, which is what makes the constant a knob rather than a coincidence.
      const stricter = assessMetricMovement([counter("watcher:rate", held(1, UNMOVED_CYCLES - 1))], observation({ cycles: UNMOVED_CYCLES - 1 }));
      assert.equal(stricter.counters[0].verdict, "unmoved", "the same readings against a lower declared threshold are unmoved");
      assert.equal(typeof UNMOVED_CYCLES, "number", "the home is a declared export, not a literal a reader has to go looking for");
    },
  },
  {
    name: "instrument-staleness/02: the assessment reads no clock",
    run: () => {
      const counters = [counter("watcher:a", held(5, UNMOVED_CYCLES)), counter("watcher:b", [...held(5, UNMOVED_CYCLES), 6])];
      const first = assessMetricMovement(counters, observation());
      const second = assessMetricMovement(counters, observation());
      assert.equal(JSON.stringify(second), JSON.stringify(first), "the same readings and the same threshold handed in twice are identical");
      assert.ok(withCode(first.findings, "metric-unmoved").length === 1, "…over a fixture that actually reports something");
      // A CYCLE IS A COUNT, NOT A DURATION: this lane takes no instant at all, so there is nothing
      // for a clock to have been read into.
      assert.equal(Object.hasOwn(observation(), "now"), false, "the movement lane is handed no instant");
      assert.deepEqual(
        first.counters.map((entry) => entry.verdict), ["unmoved", "moved"],
        "and the answer is a function of the readings alone",
      );
    },
  },
];

// =================================================================================================
// TASK 03 — a loop nobody consults.
// =================================================================================================

const noExecutions = () => ({ executions: [] });

const TASK_03 = [
  {
    name: "instrument-staleness/03: a loop with a consumer is not a prune candidate",
    run: () => {
      const consulted = model([
        loopNode("loop:watched"),
        loopNode("loop:supervisor", { edges: { "target-setting": ["loop:watched"] } }),
      ]);
      const result = assessLoopConsultation(consulted, noExecutions());
      const watched = result.loops.find((entry) => entry.id === "loop:watched");
      assert.equal(watched.verdict, "consulted", "a declared loop with an inbound edge from another node is consulted");
      assert.deepEqual(watched.inbound, ["loop:supervisor"], "…and the result names who consults it");
      assert.deepEqual(
        withCode(result.findings, "loop-unconsulted").map((entry) => entry.path), [filePath("loop:supervisor")],
        "the loop is not reported as a prune candidate — only the supervisor nobody consults is",
      );

      // AN AUDITOR'S `reporting` EDGE IS A CONSUMER TOO (59/ADR-001 §3). The sixth edge key reaches
      // this lane, so a loop somebody reports on is not offered for pruning on the ground that
      // nothing consults it.
      const audited = assessLoopConsultation(
        model([loopNode("loop:watched"), auditorNode("auditor:instruments", { edges: { reporting: ["loop:watched"] } })]),
        noExecutions(),
      );
      assert.equal(audited.loops[0].verdict, "consulted", "an inbound `reporting` edge consults the loop");
      assert.deepEqual(withCode(audited.findings, "loop-unconsulted"), [], "…so nothing is offered for pruning");
    },
  },
  {
    name: "instrument-staleness/03: a loop with no inbound edge and no observed execution is a prune candidate, named and reasoned",
    run: () => {
      const result = assessLoopConsultation(model([loopNode("loop:forgotten")]), noExecutions());
      assert.equal(result.loops[0].verdict, "prune-candidate", "the loop is reported as a prune candidate");
      const finding = withCode(result.findings, "loop-unconsulted");
      assert.equal(finding.length, 1, "exactly one prune-candidate finding");
      assert.ok(finding[0].message.includes("loop:forgotten"), "the finding names the loop");
      assert.ok(finding[0].message.includes("no declared node names it on any edge"), "…and says why it is a candidate: nothing consults it");
      assert.ok(finding[0].message.includes("no execution of it was observed"), "…on both halves of the rule");
      assert.ok(finding[0].message.includes("never removed"), "…and says, in the finding itself, that it is reported and not removed");
      assert.equal(finding[0].severity, "warn", "a prune candidate is a finding with a name on it, never a gate");
      // A LOOP THAT ONLY POINTS AT ITSELF HAS NO CONSUMER — a self-edge is not consultation.
      const selfish = assessLoopConsultation(
        model([loopNode("loop:forgotten", { edges: { "data-feed": ["loop:forgotten"] } })]), noExecutions(),
      );
      assert.equal(selfish.loops[0].verdict, "prune-candidate", "a self-edge does not consult the loop that declares it");
    },
  },
  {
    name: "instrument-staleness/03: a loop with no inbound edge that has run is not a prune candidate",
    run: () => {
      const result = assessLoopConsultation(model([loopNode("loop:solo")]), { executions: ["loop:solo"] });
      assert.equal(result.loops[0].verdict, "executed", "a record of it having run is enough");
      assert.deepEqual(withCode(result.findings, "loop-unconsulted"), [], "the loop is not reported as a prune candidate");
      // NOBODY-ASKED IS NOT NOBODY-RAN. The executions argument has no default, because a report
      // that never asked whether a loop ran may not report that it never did (ADR-004 §1).
      assert.throws(() => assessLoopConsultation(model([loopNode("loop:solo")]), {}), /observed to run/u, "an absent execution set is refused, never defaulted to empty");
      assert.throws(() => assessLoopConsultation(model([loopNode("loop:solo")]), undefined), /observed to run/u, "…and so is no observation at all");
    },
  },
  {
    name: "instrument-staleness/03: the report never removes anything (a real registry on disk)",
    run: async () => {
      const fixture = await makeLoopRegistry({
        "forgotten.md": [
          "---", "id: loop:forgotten", "kind: loop", "title: forgotten", "controlled: attempt count",
          "reference: [module:src/run-store.mjs#isRetryable]", "measurement: [module:src/run-store.mjs#attempts]",
          "actuator: [command:work:next]", "cadence: event:per-item", "ceiling: none",
          "owner: actor:product-owner", "optimizing: false", "---", "# forgotten", "",
        ].join("\n"),
      });
      try {
        const before = await snapshot(fixture.loopsDir);
        const registry = await loadLoops(fixture.workDir);
        const result = assessLoopConsultation(registry, noExecutions());
        assert.deepEqual(
          withCode(result.findings, "loop-unconsulted").map((entry) => entry.path), [fixture.pathOf("forgotten.md")],
          "the registry contains a prune candidate and the assessment names it",
        );

        const after = await snapshot(fixture.loopsDir);
        assert.deepEqual(after, before, "the registry ON DISK is unchanged — the audit has no vocabulary in which to remove a node");
        const reloaded = await loadLoops(fixture.workDir);
        assert.deepEqual(
          reloaded.nodes.map((node) => node.id), ["loop:forgotten"],
          "…and the candidate is still declared afterwards",
        );
        // THE MODEL IT WAS HANDED IS UNTOUCHED TOO, which is the in-memory half of the same rule.
        assert.deepEqual(registry.nodes.map((node) => node.id), ["loop:forgotten"], "the parsed model is not mutated either");
      } finally {
        await fixture.cleanup();
      }
    },
  },
  {
    name: "instrument-staleness/03: an unconsulted node that is not a loop is not offered for pruning",
    run: () => {
      const registry = model([anchorNode("anchor:soak"), auditorNode("auditor:instruments"), loopNode("loop:forgotten")]);
      const result = assessLoopConsultation(registry, noExecutions());
      assert.deepEqual(
        result.loops.map((entry) => entry.id), ["loop:forgotten"],
        "only kind: loop nodes are considered at all",
      );
      assert.deepEqual(
        withCode(result.findings, "loop-unconsulted").map((entry) => entry.path), [filePath("loop:forgotten")],
        "a declared anchor with no inbound edge is NOT reported as a prune candidate",
      );
      // NON-VACUITY: the anchor really has no inbound edge, so its exclusion is a rule about the
      // KIND and not an artefact of the fixture.
      const anchorInbound = result.loops.filter((entry) => entry.inbound.includes("anchor:soak"));
      assert.deepEqual(anchorInbound, [], "the anchor consults nothing here either — it is excluded by kind, not by luck");
    },
  },
  {
    name: "instrument-staleness/03: the assessment says how many loops it considered, and one that considered none ran on nothing",
    run: () => {
      const populated = assessLoopConsultation(model([loopNode("loop:a"), loopNode("loop:b"), anchorNode("anchor:soak")]), noExecutions());
      assert.equal(populated.read.count, 2, "the result reports the number of LOOPS it considered");
      assert.equal(populated.read.floor, 1, "…together with its floor");
      assert.equal(populated.read.sweep, "loop-consultation", "…and names the sweep");
      assert.deepEqual(withCode(populated.findings, "audit-ran-on-nothing"), [], "a populated sweep is not reported as having run on nothing");

      const empty = assessLoopConsultation(model([anchorNode("anchor:soak")]), noExecutions());
      assert.equal(empty.read.count, 0, "a registry with no declared loop considered none");
      const ranOnNothing = withCode(empty.findings, "audit-ran-on-nothing");
      assert.equal(ranOnNothing.length, 1, "…and is reported as having run on nothing");
      assert.ok(ranOnNothing[0].message.includes("loop-consultation"), "the finding names the sweep");
      assert.ok(ranOnNothing[0].message.includes(SOURCE), "…and the root it walked");
    },
  },
  {
    name: "instrument-staleness/03: every code these lanes emit is a member of the exported frozen set",
    run: () => {
      // The lane vocabulary is closed the same way 52 closed the check lane's: a code outside the
      // exported set is a bug, and this drives all four lanes over fixtures that fire every one.
      const emitted = new Set();
      const push = (result) => result.findings.forEach((entry) => emitted.add(entry.code));
      push(buildGroundednessReport(
        model([anchorNode("anchor:soak", { checkedAt: NOW - (WINDOW + DAY), edges: { "data-feed": ["loop:guarded"] } }), loopNode("loop:guarded")]),
        {}, freshness(),
      ));
      push(assessInstrumentSilence([instrument("watcher:rate", DAILY, { at: NOW - 3 * DAY })], observation({ now: NOW })));
      push(assessMetricMovement([counter("watcher:rate", held(1, UNMOVED_CYCLES))], observation()));
      push(assessLoopConsultation(model([loopNode("loop:forgotten")]), noExecutions()));
      push(assessInstrumentSilence([], observation({ now: NOW })));

      for (const code of emitted) {
        assert.ok(AUDIT_LANE_FINDING_CODES.has(code) || code === "loop-anchor-absent", `${code}: an emitted code is a declared member of the audit lane's frozen set`);
      }
      assert.deepEqual(
        [...AUDIT_LANE_FINDING_CODES].filter((code) => !emitted.has(code)), [],
        "…and every declared code is reachable, so the set is a vocabulary and not a wish list",
      );
    },
  },
];

/** Every file under a registry directory, by name, with its bytes — the on-disk no-removal oracle. */
async function snapshot(directory) {
  const names = (await readdir(directory)).sort();
  const entries = [];
  for (const name of names) entries.push([name, await readFile(path.join(directory, name), "utf8")]);
  return entries;
}

export const instrumentStalenessTests = [...TASK_00, ...TASK_01, ...TASK_02, ...TASK_03];
