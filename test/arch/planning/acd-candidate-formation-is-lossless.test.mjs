// FF-6209 — formation is a pure, lossless partition with a readable criterion.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { CORPUS_LANES, assembleCorpus } from "../../../src/work-tune/corpus.mjs";
import { resolveCitationAtEmit } from "../../../src/work-tune/provenance.mjs";
import {
  FORMATION_CRITERION,
  FORMATION_DEFAULT_BASIS,
  FORMATION_REFUSAL_CODES,
  formCandidates,
  measureFormationCriteria,
} from "../../../src/work-tune/formation.mjs";

const modulePath = fileURLToPath(new URL("../../../src/work-tune/formation.mjs", import.meta.url));
const root = fileURLToPath(new URL("../../../", import.meta.url));
const moduleText = readFileSync(modulePath, "utf8");
const source = (lane, id, overrides = {}) => ({
  lane,
  id,
  source: `${lane}/${id}.md:1`,
  kind: "mistake",
  area: "process",
  stage: "build",
  owner: "developer",
  target: null,
  ...overrides,
});
const canonical = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
};
const multiset = (values) => {
  const counts = new Map();
  for (const value of values.map(canonical)) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
};

export const archTests = [
  {
    name: "architecture: FF-6209 formation is a pure leaf outside command-core and filesystem rings",
    run: () => {
      assert.doesNotMatch(moduleText, /command-core|node:(?:fs|path|child_process)|process\.(?:argv|cwd|env)|Date\s*\(|Math\.random/u);
      assert.doesNotMatch(moduleText, /(?:read|write|open|readdir|stat|spawn|exec)(?:File|Sync)?\s*\(/u);
      assert.doesNotMatch(moduleText, /run:|wiki\/work|observability|snapshots|agents\.json/u, "formation carries locators and owns no lane path vocabulary");
      assert.deepEqual(formCandidates([{ item: "38", runId: "run-1" }]).candidates[0].citations, []);
    },
  },
  {
    name: "architecture: FF-6209 the criterion is named, ordered, variable and coded at its boundary",
    run: () => {
      assert.equal(FORMATION_CRITERION.range.loosest, 1);
      assert.equal(FORMATION_CRITERION.range.tightest, FORMATION_CRITERION.dimensions.length);
      assert.ok(FORMATION_CRITERION.defaultValue >= FORMATION_CRITERION.range.loosest);
      assert.ok(FORMATION_CRITERION.defaultValue <= FORMATION_CRITERION.range.tightest);
      assert.match(FORMATION_REFUSAL_CODES.CRITERION_OUT_OF_RANGE, /^formation-/u);
      assert.match(FORMATION_CRITERION.tieBreak, /source-citation/u);
    },
  },
  {
    name: "architecture: FF-6209 every registry lane enters one common partition without lane semantics",
    run: () => {
      const records = [
        source("lessons", "R1"),
        {
          lane: "lineage",
          item: "38",
          runId: "20260712T213809392Z-0000",
          source: "wiki/work/38_milestone_fixture/runs/20260712T213809392Z-0000.json",
          target: null,
        },
        {
          lane: "observations",
          item: "68",
          state: "read-empty",
          reading: {
            folder: "68_milestone_loop-telemetry",
            generatedAt: "2026-08-22T02:02:51.026Z",
          },
          source: "wiki/work/68_milestone_loop-telemetry/observability/snapshots/2026-08-22T02-02-51-026Z/agents.json",
          target: null,
        },
      ];
      assert.deepEqual(records.map((record) => record.lane), CORPUS_LANES.map((entry) => entry.id));
      const result = formCandidates(records);
      assert.deepEqual(new Set(result.candidates.flatMap((candidate) => candidate.sources).map((record) => record.lane)), new Set(CORPUS_LANES.map((entry) => entry.id)));
      for (const candidate of result.candidates) {
        assert.equal(candidate.citations.length >= candidate.sources.length, true, "every admitted lane source contributes a locator");
      }
      for (const entry of CORPUS_LANES) assert.doesNotMatch(moduleText, new RegExp(`["']${entry.id}["']`, "u"));
    },
  },
  {
    name: "architecture: FF-6209 membership and arithmetic both prove an exact partition",
    run: () => {
      const first = source("x", "repeated", { source: "x/first.md:1", detail: { reading: 1 } });
      const second = source("x", "repeated", { source: "x/second.md:1", detail: { reading: 2 } });
      const records = [first, second, { ...first, detail: { reading: 1 } }];
      for (const criterion of [1, 2, 3, 4]) {
        const carried = formCandidates(records, { criterion }).candidates.flatMap((candidate) => candidate.sources);
        assert.equal(carried.length, records.length);
        assert.deepEqual(multiset(carried), multiset(records));

        // A set of ids and total arithmetic both miss this plant: one occurrence
        // of `first` was dropped and `second` was duplicated. Full-record
        // occurrence counts distinguish the two partitions.
        const planted = [...carried];
        planted.splice(planted.findIndex((record) => canonical(record) === canonical(first)), 1);
        planted.push(second);
        assert.equal(planted.length, records.length);
        assert.deepEqual(new Set(planted.map((record) => record.id)), new Set(records.map((record) => record.id)));
        assert.notDeepEqual(multiset(planted), multiset(records));
      }
    },
  },
  {
    // ADR-014 §5, AND IT HAD NO ASSERTION UNTIL MILESTONE 62's VERIFY GATE (finding D-07).
    // FF-6209 declares "the tie-break is a function of CONTENT, never of ARRIVAL … a shuffled
    // input yields byte-identical candidates", and the shipped control never shuffled anything.
    // The gap was found by the control's OWN red probe: keying `sourceKey` on arrival position
    // turned exactly one leg red — the real-corpus TRADEOFF leg — and only because the measured
    // table happened to move. Had the corpus's clusters been insensitive to that ordering, an
    // arrival-reading tie-break would have passed the whole control. A probe that goes red for
    // the wrong reason is a control that is green for the wrong reason, which is the argument
    // for red probes stated in one measurement.
    //
    // Both inputs are driven on purpose: PLANTED records that tie on all four dimensions (where
    // the tie-break is the only thing deciding, so this is where arrival could leak in), and the
    // REAL lessons lane (where the ties are the ones this repository actually produces).
    name: "architecture: FF-6209 a shuffled input yields byte-identical candidates — the tie-break reads content, never arrival",
    run: async () => {
      // Deterministic Fisher-Yates, so a failure here is reproducible rather than a flake.
      const permute = (values, seed) => {
        const out = [...values];
        let state = seed >>> 0;
        for (let index = out.length - 1; index > 0; index -= 1) {
          state = (state * 1664525 + 1013904223) >>> 0;
          const swap = state % (index + 1);
          [out[index], out[swap]] = [out[swap], out[index]];
        }
        return out;
      };

      const tied = [
        source("x", "a", { source: "x/a.md:1" }),
        source("x", "b", { source: "x/b.md:1" }),
        source("x", "c", { source: "x/c.md:1" }),
        source("x", "d", { source: "x/d.md:1" }),
        source("x", "e", { source: "x/e.md:1" }),
      ];
      const corpus = await assembleCorpus({ cwd: root });
      const real = corpus.lanes.find((lane) => lane.lane === "lessons")?.contribution ?? [];
      assert.ok(real.length > 0, "non-vacuity: the real lessons lane reached this leg");

      for (const [label, records] of [["planted ties", tied], ["the real lessons lane", real]]) {
        const baseline = JSON.stringify(formCandidates(records).candidates);
        let reordered = 0;
        for (const seed of [1, 7, 4242]) {
          const shuffled = permute(records, seed);
          if (canonical(shuffled[0]) !== canonical(records[0])) reordered += 1;
          assert.equal(
            JSON.stringify(formCandidates(shuffled).candidates),
            baseline,
            `${label}: seed ${seed} moved a candidate, so arrival order is reachable from the tie-break`,
          );
        }
        assert.ok(reordered > 0, `${label}: non-vacuity — at least one shuffle really did move the input`);
      }
    },
  },
  {
    name: "architecture: FF-6209 default 3 is checked against the tracked real-corpus tradeoff",
    run: async () => {
      const corpus = await assembleCorpus({ cwd: root });
      const lessons = corpus.lanes.find((lane) => lane.lane === "lessons")?.contribution ?? [];
      const admittedByLane = corpus.lanes.map((lane) => ({
        lane: lane.lane,
        records: lane.lane === "observations"
          ? lane.raw.entries.filter((record) => String(record.state).startsWith("read-"))
          : (lane.contribution ?? lane.raw),
      }));
      assert.deepEqual(admittedByLane.map((entry) => entry.lane), CORPUS_LANES.map((entry) => entry.id));
      for (const entry of admittedByLane) {
        const formed = formCandidates(entry.records);
        assert.equal(formed.candidates.flatMap((candidate) => candidate.sources).length, entry.records.length, entry.lane);

        // CITATIONS ARE CARRIED LOSSLESSLY, WHICH IS NOT THE SAME CLAIM AS ONE PER RECORD
        // (milestone 62 gate, finding D-01). This leg asserted `citations.length ===
        // records.length`, a premise that held only while every record carried exactly one
        // citation. 62/04 gave each lesson record a `citations` array — its own `source` plus
        // the path citations found in that retrospective section — so 154 of the 402 lesson
        // records now carry more than one, and the lane carries 654 citations for 402 records.
        // Formation was right and the assertion was stale: reading a count as a partition proof
        // is what made a widening upstream look like a loss here. The partition claim lives at
        // the `sources` leg above, and is untouched.
        //
        // The baseline is the module against a case where the answer is not in question: a
        // SINGLETON candidate's citations are exactly that record's, so clustering is lossless
        // iff the clustered multiset equals the concatenated singleton multisets. Deriving the
        // expectation this way keeps `citationsOn`'s rule in its one home instead of copying it
        // into this control, which is the defect this whole milestone is about.
        const perRecord = entry.records.flatMap((record) => formCandidates([record]).candidates[0].citations);
        assert.ok(perRecord.length >= entry.records.length, `${entry.lane}: non-vacuity — every record carries at least one citation`);
        assert.deepEqual(
          multiset(formed.candidates.flatMap((candidate) => candidate.citations)),
          multiset(perRecord),
          `${entry.lane}: clustering neither dropped nor duplicated a citation`,
        );
        // EVERY CANDIDATE CARRIES EVIDENCE THAT RESOLVES — which is NOT "every citation
        // resolves", and the difference is the second half of finding D-01. This leg used to
        // assert the latter over the real tree. It could only ever pass while each record's
        // sole citation was its own `source` line, and 62/04's widening put the BODY's path
        // citations in too — so the corpus's actual prose came with them. Measured here today:
        // 654 citations, 46 unresolvable, of three kinds, none of them a defect —
        //   · paths to files that have since been deleted or renamed (`scripts/test-suite.mjs`),
        //   · path-shaped prose in a sentence (`a/b.json`),
        //   · and `../escape.json`, which a retrospective about path safety cites precisely
        //     BECAUSE it escapes — a citation that resolved would falsify that lesson.
        // A control demanding all 654 resolve would be demanding this repository stop recording
        // what it learned. Resolution is provenance's question and DEMOTION is its answer
        // (FF-6204, and the 24 `unresolvable-provenance` findings a real run reports); what
        // belongs here is the property formation must hold for that answer to mean anything:
        // no candidate reaches provenance with nothing resolvable behind it, so a demotion is
        // always a judgement about evidence rather than about an empty set.
        for (const candidate of formed.candidates) {
          const resolvable = candidate.citations.filter((citation) => resolveCitationAtEmit(citation, { rootDir: root }).ok);
          assert.ok(
            resolvable.length > 0,
            `${entry.lane}: a candidate carries no citation that resolves — ${JSON.stringify(candidate.citations)}`,
          );
        }
      }
      // THE DECISION IS CHECKED LIVE; THE STORED TABLE IS PROVENANCE, NOT AN EXPECTATION
      // (milestone 62 gate, finding D-08). This leg used to assert `measured` byte-equal to
      // `FORMATION_DEFAULT_BASIS.measurements` and `lessons.length` equal to its record count.
      // Both go stale the moment ANY retrospective is written — including THIS milestone's own,
      // which `aof:verify` writes minutes after the suite goes green, so the control was set to
      // fail on the commit that accepted it. FF-6208 already states the rule this leg was
      // breaking: "it runs over the corpus as it stands and holds no expected figure — a stored
      // count would go stale on the next retrospective, which is the corpus this milestone
      // reads." Two controls over one corpus disagreed about that, and the stored-figure one
      // was wrong.
      //
      // What is asserted instead is the claim the stored table was ever evidence FOR: that
      // default 3 still EARNS its place over the corpus as it stands — the largest loose cluster
      // collapses, recurring multi-source classes survive, and the tightest setting fragments.
      // The recorded basis stays in the module as dated provenance and is held to the same three
      // relations, so a basis that never justified the default is still caught; what is no longer
      // asserted is that the corpus stopped growing.
      const measured = measureFormationCriteria(lessons);
      assert.equal(FORMATION_DEFAULT_BASIS.selected, FORMATION_CRITERION.defaultValue);
      assert.deepEqual(
        measured.map((entry) => entry.value),
        FORMATION_DEFAULT_BASIS.measurements.map((entry) => entry.value),
        "the live table covers exactly the criterion values the recorded basis measured",
      );
      const holds = (table, label) => {
        const loose = table.find((entry) => entry.value === 2);
        const selected = table.find((entry) => entry.value === FORMATION_DEFAULT_BASIS.selected);
        const tight = table.find((entry) => entry.value === 4);
        assert.ok(selected.largest < loose.largest, `${label}: ${FORMATION_DEFAULT_BASIS.tradeoff}`);
        assert.ok(selected.recurring > loose.recurring, `${label}: ${FORMATION_DEFAULT_BASIS.tradeoff}`);
        assert.ok(selected.candidates < tight.candidates, `${label}: ${FORMATION_DEFAULT_BASIS.tradeoff}`);
      };
      holds(measured, `the corpus as it stands (${lessons.length} lesson records)`);
      holds([...FORMATION_DEFAULT_BASIS.measurements], "the recorded basis");
    },
  },
  {
    name: "architecture: FF-6209 candidates contain no downstream answer or typed target object",
    run: () => {
      const candidate = formCandidates([source("x", "1", { target: "config:any.ref" })]).candidates[0];
      assert.deepEqual(Object.keys(candidate), ["sources", "citations", "target"]);
      assert.equal(typeof candidate.target, "string");
      for (const key of ["lane", "patch", "applier", "verdict", "distance", "class"]) assert.equal(key in candidate, false);
    },
  },
];
