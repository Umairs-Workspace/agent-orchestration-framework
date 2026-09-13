// milestone 59 / story 03 — FF-5908.
//
// EVERY SWEEP DECLARES WHAT IT READ, AND A SWEEP THAT READ NOTHING IS A FINDING RATHER THAN A PASS.
//
// A lane that found nothing and a lane that LOOKED AT NOTHING are indistinguishable in a finding
// list, and the second is the failure this milestone exists to catch. It has already happened in
// this repository: a renamed fixture root turned a probe into a comparison of nothing with nothing
// and it passed (56, `acd-loop-probe-contract`'s `assertRead`). So ADR-004 §1 makes a clean lane
// result UNREPRESENTABLE without a read count and a floor.
//
// WIDENED BY 59/04 TO BIND ALL THREE READ-RECORD SHAPES (ADR-004 §1a, appended 2026-08-30).
//
// §1 says EVERY audit lane. At 59/03's head the rule had THREE spellings and the third did not
// obey it — the evidence lane built its record INLINE, keyed `id` rather than `sweep`, and performed
// no floor comparison at all, so it was the one lane that could read nothing and say so nowhere.
// Measured 2026-08-30: this file's own `censusReadFinding`, handed that record, rendered
//
//     the "undefined" sweep read 0 of a required 1 while walking /r
//
// A report naming its own sweep `undefined` is §1 failing while wearing the clothes of compliance,
// and the three shapes looked substitutable while two of them were not. So this gate's bound
// population is now all THREE: the census's, the checks leaf's and the evidence lane's — each
// keyed `sweep`, each put through the SAME floor comparison, and the two `src/work-audit/` lanes
// sharing ONE definition (`src/work-audit/reads.mjs`) rather than a copy apiece.
//
// THIS GATE HOLDS THE CHECKS MODULE'S FOUR LANES TO THAT CONTRACT, AND BINDS THEM TO THE CENSUS'S.
// `src/work/loops-checks.mjs` cannot import `src/work-audit/census.mjs` — importing anything is the
// one thing 52/ADR-007's purity invariant forbids of that leaf — so the read/floor rule necessarily
// exists there as a second mechanical copy. That is the same bind 58/FF-5807 made for the two copies
// of `CHECK_IDS` a module boundary forced apart, and the response is the same: where one home is
// structurally impossible, a gate is what keeps the copies from drifting. Concretely, this file
// asserts that
//
//   (a) every lane in `AUDIT_LANES` is a WELL-DECLARED SWEEP by the census's OWN validator
//       (`sweepDeclarationProblems`) — one definition of "declared", not two;
//   (b) the exported `assess*` functions and the registry are a BIJECTION, so a lane added without
//       a registry entry (and therefore without a floor) fails CI rather than passing over nothing;
//   (c) every lane's result carries a complete read record with no default and no optional count;
//   (d) a lane below its floor emits `audit-ran-on-nothing` whose text is BYTE-IDENTICAL to what the
//       census's `readFinding` produces for the same read record.
//
// 59/ADR-004 §1.
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  AUDIT_FINDING_CODES,
  SWEEP_BASES,
  readFinding as censusReadFinding,
  readRecord as censusReadRecord,
  sweepDeclarationProblems,
} from "../../../src/work-audit/census.mjs";
// THE ONE DEFINITION, and the evidence lane that now shares it (59/ADR-004 §1a).
import { readFile } from "node:fs/promises";

import * as reads from "../../../src/work-audit/reads.mjs";
import { EVIDENCE_SWEEP, runEvidence } from "../../../src/work-audit/evidence.mjs";
import {
  AUDIT_LANES,
  AUDIT_LANE_FINDING_CODES,
  CHECK_FINDING_CODES,
  UNMOVED_CYCLES,
  assessAnchorFreshness,
  assessInstrumentSilence,
  assessLoopConsultation,
  assessMetricMovement,
} from "../../../src/work/loops-checks.mjs";
import * as checksModule from "../../../src/work/loops-checks.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SOURCE = path.join(root, "audit-lane-fixture-not-on-disk", "loops");
const NOW = Date.UTC(2026, 7, 30);
const WINDOW = 90 * 86_400_000;
const model = (nodes) => ({ source: SOURCE, present: true, findings: [], nodes });

const anchor = (id, checkedAt) => ({
  id,
  kind: "anchor",
  title: id,
  path: path.join(SOURCE, `${id.replace(":", "-")}.md`),
  fields: {
    ground: { kind: "enum", value: "process-exit" },
    observes: { kind: "pointer", raw: "module:src/run-store.mjs#attempts" },
    ...(checkedAt == null ? {} : { checked: { kind: "date", raw: "2026-01-01", ms: checkedAt } }),
  },
  edges: {},
});
const loop = (id) => ({
  id, kind: "loop", title: id, path: path.join(SOURCE, `${id.replace(":", "-")}.md`),
  fields: { optimizing: { kind: "flag", value: false } }, edges: {},
});

// THE FOUR LANES, EACH WITH A POPULATED CALL AND AN EMPTY ONE. The empty call is what makes the
// below-floor leg non-vacuous; the populated one is what stops "every lane is below its floor"
// passing this file trivially.
const LANE_DRIVES = Object.freeze([
  {
    id: "anchor-freshness",
    export: "assessAnchorFreshness",
    populated: () => assessAnchorFreshness(model([anchor("anchor:soak", NOW - WINDOW - 1)]), { now: NOW, window: WINDOW }),
    empty: () => assessAnchorFreshness(model([loop("loop:a")]), { now: NOW, window: WINDOW }),
  },
  {
    id: "instrument-silence",
    export: "assessInstrumentSilence",
    populated: () => assessInstrumentSilence(
      [{ id: "watcher:rate", path: path.join(SOURCE, "rate.md"), cadence: { kind: "periodic", ms: 86_400_000, raw: "periodic:1d" }, reading: { at: NOW } }],
      { now: NOW, root: SOURCE },
    ),
    empty: () => assessInstrumentSilence([], { now: NOW, root: SOURCE }),
  },
  {
    id: "metric-movement",
    export: "assessMetricMovement",
    populated: () => assessMetricMovement(
      [{ id: "watcher:rate", path: path.join(SOURCE, "rate.md"), counter: "interventions", readings: Array.from({ length: UNMOVED_CYCLES }, () => 7) }],
      { root: SOURCE },
    ),
    empty: () => assessMetricMovement([], { root: SOURCE }),
  },
  {
    id: "loop-consultation",
    export: "assessLoopConsultation",
    populated: () => assessLoopConsultation(model([loop("loop:forgotten")]), { executions: [] }),
    empty: () => assessLoopConsultation(model([anchor("anchor:soak", null)]), { executions: [] }),
  },
]);

// DERIVED FROM THE CENSUS'S OWN RECORD, never restated here. A literal key list would let the
// census gain a key that this lane never grows, and the two audits would then disagree about what a
// complete read record is — which is the drift this whole file exists to bind.
const READ_KEYS = Object.keys(
  censusReadRecord({ id: "probe", root: "/probe", what: "probe population", basis: "disk", floor: 1 }, 0),
).sort();

export const archTests = [
  {
    name: "arch/59 FF-5908: every audit lane is a declared sweep by the census's own definition, and the registry is closed",
    run: () => {
      assert.ok(AUDIT_LANES.length >= 4, `non-vacuous: ${AUDIT_LANES.length} lanes are registered`);
      assert.ok(READ_KEYS.includes("count") && READ_KEYS.includes("floor"), `non-vacuous: the census's own record shape was read (${READ_KEYS.join(", ")})`);

      // ONE DEFINITION OF "DECLARED", NOT TWO. The census's validator decides it, driven over this
      // module's registry, so a lane here without a floor / a description / a basis fails on the
      // same rule that governs the census's own sweeps. The `root` leg is supplied because these
      // lanes walk WHICHEVER registry they are handed — `EVIDENCE_SWEEP`'s shape verbatim — and the
      // per-call read record is asserted to carry a real one below.
      const problems = sweepDeclarationProblems(AUDIT_LANES.map((lane) => ({ ...lane, root: "<supplied per call>" })));
      assert.deepEqual(problems, [], "every registered audit lane declares an id, a floor, a population and a basis");

      for (const lane of AUDIT_LANES) {
        assert.ok(SWEEP_BASES.includes(lane.basis), `${lane.id}: the basis comes from the census's vocabulary rather than a private one`);
        assert.ok(lane.floor >= 1, `${lane.id}: a floor of zero would make "found nothing" and "looked at nothing" the same answer`);
        assert.equal(Object.isFrozen(lane), true, `${lane.id}: the declaration is frozen, so a floor cannot be lowered at run time`);
      }
      assert.equal(Object.isFrozen(AUDIT_LANES), true, "the registry itself is frozen");
      const ids = AUDIT_LANES.map((lane) => lane.id);
      assert.deepEqual([...new Set(ids)], ids, "no lane id is declared twice");

      // NON-VACUITY OF THE VALIDATOR ITSELF (R5/m45 — a fitness function must check what its name
      // claims). A lane with its floor removed is REFUSED by the same call that passed above.
      const stripped = AUDIT_LANES.map((lane) => ({ ...lane, root: "<supplied per call>" }));
      delete stripped[0].floor;
      assert.ok(
        sweepDeclarationProblems(stripped).some((problem) => problem.includes("declares no floor")),
        "…and the validator that passed above rejects a lane with no floor, so the assertion is a decision",
      );
    },
  },
  {
    name: "arch/59 FF-5908: the lane registry and the exported assessments are a bijection, so a lane cannot arrive without a floor",
    run: () => {
      const exported = Object.entries(checksModule)
        .filter(([name, value]) => name.startsWith("assess") && typeof value === "function")
        .map(([name]) => name)
        .sort();
      assert.deepEqual(
        exported, LANE_DRIVES.map((lane) => lane.export).sort(),
        "every exported assessment is driven by this gate — a new lane function fails here rather than shipping unwatched",
      );
      assert.deepEqual(
        LANE_DRIVES.map((lane) => lane.id).sort(), AUDIT_LANES.map((lane) => lane.id).sort(),
        "…and every driven lane has a registry entry, and every registry entry a lane",
      );
      for (const drive of LANE_DRIVES) {
        assert.equal(typeof checksModule[drive.export], "function", `${drive.id}: ${drive.export} is exported`);
        assert.equal(drive.populated().read.sweep, drive.id, `${drive.id}: the read record names the lane it came from`);
      }
    },
  },
  {
    name: "arch/59 FF-5908: a clean lane result is not representable without a read count",
    run: () => {
      for (const drive of LANE_DRIVES) {
        const lane = AUDIT_LANES.find((entry) => entry.id === drive.id);
        for (const [label, result] of [["populated", drive.populated()], ["empty", drive.empty()]]) {
          const read = result.read;
          assert.ok(read != null, `${drive.id}/${label}: the result carries a read record`);
          assert.deepEqual(Object.keys(read).sort(), READ_KEYS, `${drive.id}/${label}: the read record is complete — no partial form`);
          assert.equal(Object.isFrozen(read), true, `${drive.id}/${label}: and it cannot be edited after the fact`);
          assert.equal(typeof read.count, "number", `${drive.id}/${label}: the count is a number, never an absent optional`);
          assert.equal(read.floor, lane.floor, `${drive.id}/${label}: the floor comes from the registry, not from the call site`);
          assert.equal(read.what, lane.what, `${drive.id}/${label}: …and so does the description of the population`);
          assert.ok(typeof read.root === "string" && read.root.length > 0, `${drive.id}/${label}: the read names the root it walked`);
        }
        assert.ok(drive.populated().read.count >= lane.floor, `${drive.id}: the populated drive is at or above its floor`);
        assert.equal(drive.empty().read.count, 0, `${drive.id}: …and the empty drive read nothing`);
      }
    },
  },
  {
    name: "arch/59 FF-5908: a lane below its floor emits audit-ran-on-nothing, byte-identical to the census's",
    run: () => {
      for (const drive of LANE_DRIVES) {
        const lane = AUDIT_LANES.find((entry) => entry.id === drive.id);
        const empty = drive.empty();
        const raised = empty.findings.filter((entry) => entry.code === "audit-ran-on-nothing");
        assert.equal(raised.length, 1, `${drive.id}: a lane that read nothing raises exactly one finding about it`);
        assert.equal(raised[0].severity, "error", `${drive.id}: a lane that looked at nothing reporting clean is the failure, so this one gates`);
        assert.ok(raised[0].message.includes(lane.id), `${drive.id}: the finding names the sweep`);
        assert.ok(raised[0].message.includes(empty.read.root), `${drive.id}: …the root it walked`);
        assert.ok(raised[0].message.includes(`required ${lane.floor}`), `${drive.id}: …and the floor it missed`);

        // THE BIND. The census's emitter, handed this lane's own read record, produces the same
        // finding to the byte. A drift in either copy fails here rather than being discovered as two
        // audits that disagree about what a sweep over nothing looks like.
        assert.deepEqual(
          raised[0], censusReadFinding(empty.read),
          `${drive.id}: the checks lane's ran-on-nothing finding is byte-identical to the census's for the same read`,
        );

        // …AND THE POPULATED DRIVE RAISES NONE, so the leg above is a decision about the count.
        assert.deepEqual(
          drive.populated().findings.filter((entry) => entry.code === "audit-ran-on-nothing"), [],
          `${drive.id}: a lane at or above its floor is not reported as having run on nothing`,
        );
        assert.equal(censusReadFinding(drive.populated().read), null, "…by the census's rule as well as by this one");
      }
    },
  },
  {
    name: "arch/59 FF-5908: the read record is ONE shape across all three lanes, keyed `sweep`, and the two audit-family lanes share ONE definition",
    run: async () => {
      // (1) THE SHAPES. Built the way each lane really builds one, and compared as key sets.
      const censusShape = censusReadRecord({ id: "probe", root: "/probe", what: "probe population", basis: "disk", floor: 1 }, 0);
      const checksShape = LANE_DRIVES[0].empty().read;
      const evidenceShape = (await runEvidence({ repoRoot: root, items: [] })).reads[0];
      const shapes = [["census", censusShape], ["checks", checksShape], ["evidence", evidenceShape]];
      for (const [lane, shape] of shapes) {
        assert.deepEqual(Object.keys(shape).sort(), READ_KEYS, `${lane}: the same six keys as every other lane`);
        assert.ok(typeof shape.sweep === "string" && shape.sweep.length > 0, `${lane}: keyed \`sweep\`, never \`id\` — the divergence ADR-004 §1a closed`);
        assert.equal(Object.hasOwn(shape, "id"), false, `${lane}: and it does not ALSO carry an \`id\`, which would let the two spellings coexist`);
        assert.equal(typeof shape.count, "number", `${lane}: carries a count`);
        assert.ok(shape.floor >= 1, `${lane}: and a floor`);
      }
      // NON-VACUITY OF THE COMPARISON ITSELF: three DIFFERENT sweeps were compared, so this is
      // three real lanes agreeing rather than one value compared with itself.
      assert.equal(evidenceShape.sweep, EVIDENCE_SWEEP.id, "the evidence read names the evidence lane's own sweep");
      assert.equal([...new Set(shapes.map(([, shape]) => shape.sweep))].length, 3, "three distinct sweeps were compared");

      // (2) ONE DEFINITION, not three copies that happen to agree today. The census RE-EXPORTS the
      // shared functions rather than holding its own, so IDENTITY — not deep-equality — is the
      // assertion: two copies would be two function objects.
      assert.equal(censusReadFinding, reads.readFinding, "the census's readFinding IS the shared one");
      assert.equal(censusReadRecord, reads.readRecord, "…and so is its readRecord");
      assert.equal(sweepDeclarationProblems, reads.sweepDeclarationProblems, "…and its sweep-declaration validator");
      const evidenceSource = await readFile(path.join(root, "src", "work-audit", "evidence.mjs"), "utf8");
      assert.match(evidenceSource, /from "\.\/reads\.mjs"/u, "the evidence lane imports the one definition");
      assert.equal(
        /^\s*(?:export\s+)?function\s+read(?:Record|Finding)\s*\(/mu.test(evidenceSource), false,
        "…and defines no second copy of either — a second copy inside src/work-audit/ is the duplication ADR-002 §2 already refuses",
      );
      assert.equal(
        /\{\s*\.\.\.EVIDENCE_SWEEP\s*,/u.test(evidenceSource), false,
        "…and the inline {...EVIDENCE_SWEEP, root, count} spelling is gone from the emission site",
      );
    },
  },
  {
    name: "arch/59 FF-5908: the LIMIT record is ONE shape too, and every key the face renders is one every declared limit carries",
    run: async () => {
      // ── D-59-3, found at `aof:verify 59` on the shipped command ────────────────────────────
      //
      // The read record's own lesson, one field over and one milestone later. `sweepLimits()`
      // emitted `{sweep, basis, claim, limit, authority}` and the evidence lane
      // `{question, answeredBy, consequence}`; the face interpolated the SECOND shape over BOTH,
      // so `aof work audit` printed `limit (instrument-census): undefined — undefined`, twice, on
      // every run — the audit silencing its own statement of its blind spot, in exactly the
      // clean-lane case the limit was promoted for at 59/01's review.
      //
      // A green `@executable` suite did not catch it because every fixture lane in
      // `test/audit/audit-command.test.mjs` declared `limits: []`. So the bind here is not "the shapes
      // match" — it is RENDERER KEYS ⊆ DECLARED KEYS, driven over the limits the lanes really ship.
      const { CENSUS_SWEEPS, sweepLimits } = await import("../../../src/work-audit/census.mjs");
      const { REGISTRATION_LIMIT } = await import("../../../src/work-audit/evidence.mjs");

      // (1) ONE DEFINITION, by identity rather than by deep-equality — two copies would be two
      // function objects, exactly as the read record's leg above argues.
      const census = await import("../../../src/work-audit/census.mjs");
      assert.equal(census.limitRecord, reads.limitRecord, "the census's limitRecord IS the shared one");
      assert.equal(census.limitDeclarationProblems, reads.limitDeclarationProblems, "…and so is its validator");
      assert.equal(census.LIMIT_KEYS, reads.LIMIT_KEYS, "…and its key set");

      // (2) EVERY DECLARED LIMIT, from every lane that ships one, carries exactly the frozen keys.
      const declared = [...sweepLimits(CENSUS_SWEEPS), REGISTRATION_LIMIT];
      assert.ok(declared.length >= 3, `non-vacuity: ${declared.length} shipped limits were read before any claim about them`);
      const keySet = [...reads.LIMIT_KEYS].sort();
      for (const limit of declared) {
        assert.deepEqual(Object.keys(limit).sort(), keySet, `a shipped limit carries exactly the frozen keys: ${limit.question}`);
        assert.deepEqual(reads.limitDeclarationProblems([limit]), [], "…and is renderable by the one validator");
      }
      // Two lanes really were compared, so this is agreement rather than one value against itself.
      assert.ok(declared.some((limit) => limit.sweep === "runner-bindings"), "the census's text-level limit is in the population");
      assert.equal(declared.at(-1).question, REGISTRATION_LIMIT.question, "…and the evidence lane's is too");

      // (3) THE BIND THAT CATCHES D-59-3. Every `limit.<key>` the human face reads is a key every
      // declared limit above carries. Before the fix `question` and `consequence` were read here
      // and absent from the census's two, which is precisely how a real limit rendered blank.
      const face = await readFile(path.join(root, "src", "commands", "audit.mjs"), "utf8");
      const renderedKeys = [...new Set([...face.matchAll(/\blimit\.([A-Za-z_$][\w$]*)/gu)].map((match) => match[1]))];
      assert.ok(renderedKeys.length >= 2, `non-vacuity: the face reads ${renderedKeys.length} keys off a limit`);
      const rendersLane = renderedKeys.includes("lane");
      assert.equal(rendersLane, true, "the face attributes each limit to its lane");
      for (const key of renderedKeys.filter((name) => name !== "lane")) {
        for (const limit of declared) {
          assert.equal(
            Object.hasOwn(limit, key), true,
            `the face renders \`limit.${key}\`, which the "${limit.sweep ?? limit.question}" limit does not carry — that is D-59-3 exactly: a renderer reading one lane's vocabulary over another lane's record prints an absent value where the caveat belongs`,
          );
        }
      }

      // (4) NO SECOND VOCABULARY SURVIVES. The pre-fix cell names are gone from both lanes.
      for (const file of ["census.mjs", "evidence.mjs"]) {
        const source = await readFile(path.join(root, "src", "work-audit", file), "utf8");
        assert.equal(/^\s*claim:/mu.test(source), false, `${file}: the \`claim:\` cell is gone — the claim is the read record's \`what\``);
        assert.equal(/^\s*limit:/mu.test(source), false, `${file}: and the \`limit:\` cell is gone — what follows from a limit is \`consequence\``);
      }

      // (5) NON-VACUITY OF THE VALIDATOR. It fires on the exact pre-fix shape and is silent on the
      // shipped one, so the four assertions above are statements about a detector that works.
      const preFix = { sweep: "runner-bindings", basis: "text", claim: "what the runner imports", limit: "a text-level claim", authority: null };
      const problems = reads.limitDeclarationProblems([preFix]);
      assert.ok(problems.length > 0, "the pre-D-59-3 shape is refused");
      assert.match(problems[0], /`question`/u, "…named by the key the face could not find");
      assert.throws(() => reads.limitRecord({ question: "q?" }), /unrenderable limit/u, "and a limit missing a consequence is refused at construction");
    },
  },
  {
    name: "arch/59 FF-5908: the EVIDENCE lane below its floor emits audit-ran-on-nothing, byte-identical to the census's",
    run: async () => {
      // THE LANE THAT COULD PREVIOUSLY READ NOTHING AND SAY SO NOWHERE. With no item in scope the
      // register sweep re-runs zero rows, which is below its declared floor of one.
      const empty = await runEvidence({ repoRoot: root, items: [] });
      const read = empty.reads[0];
      assert.equal(read.count, 0, "the sweep read nothing");
      assert.ok(read.count < read.floor, "…which is below its floor");
      const raised = empty.findings.filter((entry) => entry.code === "audit-ran-on-nothing");
      assert.equal(raised.length, 1, "a lane that read nothing raises exactly one finding about it");
      assert.equal(raised[0].severity, "error", "…and it gates, because a lane that looked at nothing reporting clean is the failure");
      assert.deepEqual(raised[0], censusReadFinding(read), "…byte-identical to what the census's emitter produces for the same read");
      assert.ok(raised[0].message.includes(EVIDENCE_SWEEP.id), "the finding names the sweep");
      assert.equal(raised[0].message.includes("undefined"), false, "…rather than the exact string the pre-convergence record rendered");

      // …AND A POPULATED SWEEP RAISES NONE, so the leg above is a decision about the count and
      // not a lane that always complains.
      assert.equal(censusReadFinding({ ...read, count: read.floor }), null, "at its floor, the same emitter says nothing");
    },
  },
  {
    name: "arch/59 FF-5908: the checks leaf keeps a HAND-RESTATED copy, because it may import nothing",
    run: async () => {
      // THIS IS NOT AN EXCEPTION TO THE ONE-DEFINITION RULE — it is the only form the rule can take
      // in a module 52/ADR-007 (FF-5907) forbids from importing anything at all. So the parity is
      // ASSERTED rather than derived (58/FF-5807's move), and the byte-identity leg above is that
      // assertion. What this leg adds is the REASON: the leaf really does import nothing, so a
      // shared import was never available to it.
      const source = await readFile(path.join(root, "src", "work", "loops-checks.mjs"), "utf8");
      assert.ok(source.length > 0, "the checks leaf was read");
      const imports = source.split(/\r?\n/).filter((line) => /^\s*import[\s{"']/u.test(line));
      assert.deepEqual(imports, [], "the checks leaf imports nothing — which is why its read record is a copy and not a call");
      assert.match(source, /function readFinding\(read\)/u, "…and it holds its own restatement");
      assert.match(source, /byte-identical to .readFinding. in/u, "…which says in its own source that it is a copy, and names what binds it");
    },
  },
  {
    name: "arch/59 FF-5908: the audit lane's vocabulary is closed, shares exactly the one code with the census, and is disjoint from the check lane",
    run: () => {
      const laneCodes = [...AUDIT_LANE_FINDING_CODES].sort();
      assert.deepEqual(
        laneCodes,
        ["anchor-stale", "audit-ran-on-nothing", "instrument-silent", "loop-ground-stale", "loop-unconsulted", "metric-unmoved"],
        "the audit lane's codes equal the ADR's literals",
      );
      // DISJOINT FROM `work:loops validate`'s LANE. `CHECK_IDS` stays six and `CHECK_FINDING_CODES`
      // stays at its twenty-one: 58/ADR-005 §3 refused a seventh check id, and 59/ADR-007 §1 refuses
      // to put the audit on the frozen cost ladder at all. These are a separate command's findings.
      const overlap = laneCodes.filter((code) => CHECK_FINDING_CODES.has(code));
      assert.deepEqual(overlap, [], "no audit-lane code is also a check-lane code");
      assert.equal(CHECK_FINDING_CODES.size, 21, "…and the check lane's vocabulary did not grow to accommodate the audit");

      // ONE CODE IS SHARED WITH THE CENSUS, AND EXACTLY ONE. It is the same fact — a sweep that ran
      // on nothing — and a second spelling of it would be the duplication ADR-004 §1 exists to stop.
      const shared = laneCodes.filter((code) => AUDIT_FINDING_CODES.includes(code));
      assert.deepEqual(shared, ["audit-ran-on-nothing"], "the two audit modules share exactly the ran-on-nothing code");

      // Every declared code is REACHABLE over the drives above plus the freshness lane's degradation,
      // so the set is a vocabulary rather than a wish list.
      const emitted = new Set();
      for (const drive of LANE_DRIVES) {
        for (const entry of [...drive.populated().findings, ...drive.empty().findings]) emitted.add(entry.code);
      }
      const grounded = model([
        { ...anchor("anchor:soak", NOW - WINDOW - 1), edges: { "data-feed": [{ raw: "loop:guarded", scheme: "loop", operand: "guarded", resolved: true }] } },
        loop("loop:guarded"),
      ]);
      for (const entry of checksModule.buildGroundednessReport(grounded, {}, { now: NOW, window: WINDOW }).findings) emitted.add(entry.code);
      const quiet = assessInstrumentSilence(
        [{ id: "watcher:rate", path: path.join(SOURCE, "rate.md"), cadence: { kind: "periodic", ms: 86_400_000, raw: "periodic:1d" }, reading: { at: NOW - 3 * 86_400_000 } }],
        { now: NOW, root: SOURCE },
      );
      for (const entry of quiet.findings) emitted.add(entry.code);
      assert.deepEqual(
        laneCodes.filter((code) => !emitted.has(code)), [],
        "every declared audit-lane code is reachable over the lanes this gate drives",
      );
    },
  },
];
