// Milestone 62 / story 05 — executable traceability for all five formation tasks.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

import {
  FORMATION_CRITERION,
  FORMATION_REFUSAL_CODES,
  formCandidates,
} from "../../src/work-tune/formation.mjs";

const rec = (id, overrides = {}) => ({
  id,
  source: `wiki/work/fixture/RETROSPECTIVE.md:${id}`,
  kind: "mistake",
  area: "process",
  stage: "build",
  owner: "developer",
  target: "config:work.loop.reviewRounds",
  ...overrides,
});

const flatSources = (result) => result.candidates.flatMap((candidate) => candidate.sources);
const membership = (result) => new Map(result.candidates.flatMap((candidate, index) =>
  candidate.sources.map((source) => [source.id, index])));

export const tuneFormationTests = [
  {
    name: "tune formation 62/05 task 00 — every input source occurs exactly once, including duplicates and empty records",
    run: () => {
      const records = [
        rec("1"),
        rec("2", { source: "wiki/work/other/RETROSPECTIVE.md:2" }),
        rec("3", { owner: "qa" }),
        rec("4", { kind: "", area: "", stage: "", owner: "", text: "" }),
        rec("5", { kind: undefined, area: undefined, stage: undefined, owner: undefined, runId: "run-5" }),
      ];
      const result = formCandidates(records, { criterion: 3 });
      assert.equal(flatSources(result).length, records.length);
      assert.equal(new Set(flatSources(result)).size, records.length);
      for (const record of records) assert.equal(flatSources(result).filter((source) => source.id === record.id).length, 1);
      assert.equal(result.candidates.reduce((sum, candidate) => sum + candidate.sources.length, 0), records.length);
    },
  },
  {
    name: "tune formation 62/05 task 00 — eligible transitive boundary ties are settled by source content",
    run: () => {
      const records = [
        rec("a", { source: "same.md:1", kind: "a", area: "a", stage: "a", owner: "a" }),
        rec("b", { source: "same.md:1", kind: "a", area: "a", stage: "b", owner: "b" }),
        rec("c", { source: "same.md:1", kind: "b", area: "b", stage: "b", owner: "b" }),
      ];
      const first = formCandidates(records, { criterion: 2 });
      const tightened = formCandidates([records[2], records[1], records[0]], { criterion: 3 });
      const shuffledAtSameCut = formCandidates([records[2], records[1], records[0]], { criterion: 2 });
      assert.equal(JSON.stringify(first), JSON.stringify(shuffledAtSameCut));
      assert.deepEqual(membership(first), membership(shuffledAtSameCut));
      assert.equal(first.candidates.length, 1, "a↔b and b↔c form one transitive candidate at the admitted cut");
      assert.equal(tightened.candidates.length, 3, "tightening removes both transitive edges without an arrival tie");
    },
  },
  {
    name: "tune formation 62/05 task 00 — duplicate citations and property insertion order never become arrival tie-breaks",
    run: () => {
      const ordinary = rec("same", { source: "duplicate.md:1", details: { alpha: 1, beta: 2 } });
      const reordered = {
        details: { beta: 2, alpha: 1 },
        target: ordinary.target,
        owner: ordinary.owner,
        stage: ordinary.stage,
        area: ordinary.area,
        kind: ordinary.kind,
        source: ordinary.source,
        id: ordinary.id,
      };
      const boundary = rec("boundary", { source: "duplicate.md:1", owner: "qa" });
      const left = formCandidates([ordinary, reordered, boundary], { criterion: 3 });
      const right = formCandidates([boundary, reordered, ordinary], { criterion: 3 });
      assert.equal(JSON.stringify(left), JSON.stringify(right));
      assert.deepEqual(left.candidates.flatMap((candidate) => candidate.sources), right.candidates.flatMap((candidate) => candidate.sources));
    },
  },
  {
    name: "tune formation 62/05 task 01 — calls, reversals and fresh processes return byte-identical candidates",
    run: () => {
      const records = [rec("1"), rec("2", { owner: "qa" }), rec("3", { stage: "verify" })];
      const expected = JSON.stringify(formCandidates(records));
      assert.equal(JSON.stringify(formCandidates(records)), expected);
      assert.equal(JSON.stringify(formCandidates([...records].reverse())), expected);
      const source = `import {formCandidates} from ${JSON.stringify(new URL("../../src/work-tune/formation.mjs", import.meta.url).href)}; const r=${JSON.stringify(records)}; process.stdout.write(JSON.stringify(formCandidates(r)));`;
      const fresh = spawnSync(process.execPath, ["--input-type=module", "--eval", source], { encoding: "utf8" });
      assert.equal(fresh.status, 0, fresh.stderr);
      assert.equal(fresh.stdout, expected);
    },
  },
  {
    name: "tune formation 62/05 task 01 — nonexistent source documents are never opened",
    run: () => {
      const result = formCandidates([rec("gone", { source: "Z:/definitely/absent.md:9000" })]);
      assert.equal(result.candidates.length, 1);
      assert.deepEqual(result.candidates[0].citations, ["Z:/definitely/absent.md:9000"]);
    },
  },
  {
    name: "tune formation 62/05 task 02 — candidates answer only sources citations and bare target",
    run: () => {
      const records = [rec("1"), rec("2")];
      const candidate = formCandidates(records).candidates[0];
      assert.deepEqual(Object.keys(candidate), ["sources", "citations", "target"]);
      assert.deepEqual(candidate.sources, records);
      assert.deepEqual(candidate.citations, records.map((record) => record.source));
      assert.equal(candidate.target, "config:work.loop.reviewRounds");
      for (const absent of ["lane", "patch", "applier", "verdict", "distance", "from", "to", "layer"]) {
        assert.equal(absent in candidate, false, absent);
      }
    },
  },
  {
    name: "tune formation 62/05 task 02 — scalar and array locators supplied by source owners stay whole",
    run: () => {
      const records = [
        rec("scalar", { citations: "one.md:4", source: undefined, target: "a" }),
        rec("array", { citations: ["two.md:5", { locator: "three.md:6" }], source: undefined, target: "b" }),
        {
          item: "38",
          runId: "20260712T213809392Z-0000",
          source: "wiki/work/38_milestone_fixture/runs/20260712T213809392Z-0000.json",
          target: "c",
        },
        {
          item: "68",
          state: "read-empty",
          reading: {
            folder: "68_milestone_loop-telemetry",
            generatedAt: "2026-08-22T02:02:51.026Z",
          },
          source: "wiki/work/68_milestone_loop-telemetry/observability/snapshots/2026-08-22T02-02-51-026Z/agents.json",
          target: "d",
        },
      ];
      const citations = formCandidates(records).candidates.flatMap((candidate) => candidate.citations);
      assert.deepEqual(citations, [
        "one.md:4",
        "three.md:6",
        "two.md:5",
        "wiki/work/38_milestone_fixture/runs/20260712T213809392Z-0000.json",
        "wiki/work/68_milestone_loop-telemetry/observability/snapshots/2026-08-22T02-02-51-026Z/agents.json",
      ]);
      assert.equal(citations.includes("o"), false, "a scalar citations string is never iterated as characters");
    },
  },
  {
    name: "tune formation 62/05 task 02 — null targets remain candidates and citations are not judged",
    run: () => {
      const candidate = formCandidates([rec("1", { target: null, source: "missing.md:3" })]).candidates[0];
      assert.equal(candidate.target, null);
      assert.deepEqual(candidate.citations, ["missing.md:3"]);
      assert.equal("resolvable" in candidate, false);
    },
  },
  {
    name: "tune formation 62/05 task 03 — the named readable criterion visibly controls grouping",
    run: () => {
      const records = [rec("1"), rec("2", { owner: "qa" })];
      const loose = formCandidates(records, { criterion: 3 });
      const tight = formCandidates(records, { criterion: 4 });
      assert.equal(FORMATION_CRITERION.name, "minimum-shared-metadata-fields");
      assert.equal(loose.criterion.value, 3);
      assert.equal(tight.criterion.value, 4);
      assert.equal(loose.candidates.length, 1);
      assert.equal(tight.candidates.length, 2);
    },
  },
  {
    name: "tune formation 62/05 task 03 — loosening only merges and tightening only splits",
    run: () => {
      const records = [
        rec("a"),
        rec("b", { owner: "qa" }),
        rec("c", { stage: "verify", owner: "qa" }),
        rec("d", { area: "architecture", stage: "verify", owner: "architect" }),
      ];
      const results = [1, 2, 3, 4].map((criterion) => formCandidates(records, { criterion }));
      for (let index = 1; index < results.length; index += 1) {
        assert.ok(results[index].candidates.length >= results[index - 1].candidates.length);
        const looser = membership(results[index - 1]);
        const tighter = membership(results[index]);
        for (const left of records) for (const right of records) {
          if (tighter.get(left.id) === tighter.get(right.id)) assert.equal(looser.get(left.id), looser.get(right.id));
        }
      }
      for (const result of results) assert.equal(flatSources(result).length, records.length);
    },
  },
  {
    name: "tune formation 62/05 task 03 — missing criterion uses the declared default",
    run: () => {
      for (const options of [undefined, {}]) {
        const result = formCandidates([rec("1")], options);
        assert.equal(result.criterion.value, FORMATION_CRITERION.defaultValue);
        assert.deepEqual(result.criterion.range, FORMATION_CRITERION.range);
      }
    },
  },
  {
    name: "tune formation 62/05 task 03 — values outside the ordered range are coded refusals",
    run: () => {
      for (const value of [undefined, null, 0, 5, 2.5, "3", Number.NaN, {}, { value: undefined }]) {
        assert.throws(
          () => formCandidates([rec("1")], { criterion: value }),
          (error) => error.code === FORMATION_REFUSAL_CODES.CRITERION_OUT_OF_RANGE
            && error.parameter === FORMATION_CRITERION.name
            && error.range === FORMATION_CRITERION.range,
        );
      }
    },
  },
  {
    name: "tune formation 62/05 task 04 — empty and singleton corpora emit zero and one candidate",
    run: () => {
      assert.deepEqual(formCandidates([]).candidates, []);
      const source = rec("only");
      const result = formCandidates([source]);
      assert.equal(result.candidates.length, 1);
      assert.deepEqual(result.candidates[0], { sources: [source], citations: [source.source], target: source.target });
    },
  },
  {
    name: "tune formation 62/05 task 04 — singleton and larger clusters share exactly one shape",
    run: () => {
      const records = [rec("1"), rec("2"), rec("3", { target: null })];
      const result = formCandidates(records);
      assert.deepEqual(result.candidates.map((candidate) => Object.keys(candidate)), [
        ["sources", "citations", "target"],
        ["sources", "citations", "target"],
      ]);
      assert.deepEqual(result.candidates.map((candidate) => candidate.sources.length).sort(), [1, 2]);
    },
  },
];
