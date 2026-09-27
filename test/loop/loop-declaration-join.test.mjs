// Traceability wiring for milestone 102 / story 02 — THE JOIN CLOSES.
//
// Covers every @executable scenario in
//   wiki/work/102_story_the-declaration-names-its-loop/tasks/02_the-join-closes.feature
//
// NO SCENARIO HERE WRITES A `brief.loop` LITERAL BY HAND. That is the whole point of the file.
// 78's finding (F-78-A) was not that the join was wrong; it was that the join could only ever be
// exercised by FIXTURES — `declarationOf` required `brief.loop.id`, nothing in the repository wrote
// it, and every green test on that path handed the reader a literal it had written itself. So
// nothing in the suite would have noticed if the producer had never existed, which is precisely
// what happened.
//
// The record under test is therefore built by `buildLoopDeclaration` (the producer), minted through
// `startRun` (the store's own verb), read back through `readRuns`, and joined by `projectExecution`
// (78's reader) — the real four, end to end, against the real shipped registry. That is the only
// shape of test that could have caught F-78-A.
//
// ZERO IS A MEASUREMENT, NEVER AN ABSENCE (78/ADR-003), and it survives: a run whose brief is empty
// stays counted in `runsFound` and absent from `runsCarryingDeclaration`, so the ratio falls between
// zero and one and an operator can see how much of an item's history predates the instrument.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SHELL_LOOP_ID } from "../../src/commands/loop.mjs";
import { buildLoopDeclaration } from "../../src/work/loop.mjs";
import { projectExecution } from "../../src/loop-record.mjs";
import { completeRun, readRuns, startRun } from "../../src/run-store.mjs";
import { loadLoops } from "../../src/work/loops.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BUNDLE = path.join(root, "src", "bundle");

// The seventeen keys the store froze (131/ADR-003 §3 appended asks), in order — measured against a real record rather than believed.
const RECORD_KEYS = Object.freeze([
  "runId", "itemRef", "state", "attempt", "outcome", "sessionId", "brief", "createdAt", "updatedAt",
  "failureReason", "heartbeatAt", "retryOf", "reclaimedAt", "node", "resumeAfter", "spend", "asks",
]);

const CONFIG = { work: { autonomous: { maxAttempts: 3 } } };

// A declaration BUILT BY THE PRODUCER. Every field the caller supplies is supplied here; the
// envelope's shape is the producer's answer, never this file's.
function built({ loopRunId, id = SHELL_LOOP_ID, phase = "continue", cycle = 1 } = {}) {
  const declaration = buildLoopDeclaration({
    loopRunId,
    scope: "102",
    level: "L2",
    cap: 3,
    phase,
    cycle,
    startedAt: "2026-09-05T00:00:00.000Z",
    id,
  });
  // A refusal here would be a producer defect, not a fixture one — say so loudly rather than
  // minting a run whose brief is a refusal object.
  assert.equal(declaration.code, undefined, `the producer refused: ${JSON.stringify(declaration)}`);
  return declaration;
}

async function withItem(body) {
  const dir = await mkdtemp(path.join(tmpdir(), "aof-loop-join-"));
  try {
    await mkdir(path.join(dir, "runs"), { recursive: true });
    return await body({ ref: "102", dir });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Mint one run per brief, in order, through the store's own verbs — and CLOSE each before the
// next, because the store refuses a second mint while one is non-terminal. That is production's
// own sequence, not a workaround: an engagement's runs are consecutive and terminal.
async function mint(item, briefs) {
  const minted = [];
  for (const [index, brief] of briefs.entries()) {
    const now = `2026-09-05T00:0${index}:00.000Z`;
    const record = await startRun(item, { brief, now });
    await completeRun(item, { runId: record.runId, outcome: "done", now });
    minted.push(record);
  }
  return minted;
}

// A gap list is a list of `{ subject }` records, never bare strings (`gapList`,
// `src/loop-record.mjs`) — read through the loader's own shape rather than a belief about it.
const names = (gap) => gap.map((entry) => entry.subject);

const project = async (runs) => projectExecution({
  registry: (await loadLoops(BUNDLE)).nodes,
  runs,
  config: CONFIG,
});

export const loopDeclarationJoinTests = [
  {
    // Scenario: a declaration survives the round trip through the store
    name: "loop-declaration-join/02: a built declaration round-trips through the store byte-identically",
    run: () => withItem(async (item) => {
      const declaration = built({ loopRunId: "lr-round-trip" });
      await mint(item, [{ loop: declaration }]);
      const [record] = await readRuns(item);

      assert.equal(record.brief.loop.id, declaration.id);
      assert.equal(record.brief.loop.id, SHELL_LOOP_ID);
      // Every OTHER key too, and the key set itself — nothing was reshaped, added or dropped.
      assert.deepEqual(record.brief.loop, declaration);
      assert.deepEqual(Object.keys(record.brief.loop), Object.keys(declaration));
      assert.equal(JSON.stringify(record.brief.loop), JSON.stringify(declaration), "byte-identical");
    }),
  },
  {
    // Scenario: the projection joins a run the producer really wrote
    // Examples row: one carrying, none empty | 1 | 1 | 1 | 1
    name: "loop-declaration-join/02: the projection joins a producer-written run — 1 found, 1 carrying, ratio 1, 1 engagement",
    run: () => withItem(async (item) => {
      await mint(item, [{ loop: built({ loopRunId: "lr-1" }) }]);
      const model = await project(await readRuns(item));

      assert.equal(model.coverage.runsFound, 1);
      assert.equal(model.coverage.runsCarryingDeclaration, 1);
      assert.equal(model.coverage.ratio, 1);
      assert.equal(model.engagements.length, 1);
      assert.equal(model.engagements[0].loop, SHELL_LOOP_ID, "its loop is the id the producer wrote");
      assert.equal(model.engagements[0].declared, true, "a registry record declares that id");
    }),
  },
  {
    // Scenario: the loop is no longer reported as never having run
    name: "loop-declaration-join/02: the shell's loop leaves declared-never-ran, and every other declared loop stays in it",
    run: () => withItem(async (item) => {
      const registry = (await loadLoops(BUNDLE)).nodes;
      const declaredLoops = registry.filter((node) => node.kind === "loop").map((node) => node.id);
      assert.ok(declaredLoops.includes(SHELL_LOOP_ID), "the registry declares the shell's loop");
      assert.ok(declaredLoops.length > 1, "there are other declared loops to stay named");

      // BEFORE: the honest-absence answer 78 ships, and the state this repository was really in.
      const before = await project([]);
      assert.ok(names(before.gaps["declared-never-ran"]).includes(SHELL_LOOP_ID), "it began as never-ran");

      await mint(item, [{ loop: built({ loopRunId: "lr-1" }) }]);
      const after = await project(await readRuns(item));

      assert.equal(names(after.gaps["declared-never-ran"]).includes(SHELL_LOOP_ID), false, "it no longer names that loop");
      for (const id of declaredLoops.filter((candidate) => candidate !== SHELL_LOOP_ID)) {
        assert.ok(names(after.gaps["declared-never-ran"]).includes(id), `still names ${id}, which no run carried`);
      }
    }),
  },
  {
    // Scenario: an id the registry does not declare is reported, not refused
    name: "loop-declaration-join/02: an undeclared loop id projects normally, declared false, named in ran-undeclared",
    run: () => withItem(async (item) => {
      // The PRODUCER built this one too — an undeclared id is not the engine's question, so it
      // builds and carries through. That is the departure this story argued for, made executable.
      await mint(item, [{ loop: built({ loopRunId: "lr-1", id: "loop:no-such-loop" }) }]);
      const model = await project(await readRuns(item));

      assert.equal(model.engagements.length, 1, "the projection returned normally — no error raised");
      assert.equal(model.engagements[0].declared, false);
      assert.ok(names(model.gaps["ran-undeclared"]).includes("loop:no-such-loop"));
    }),
  },
  {
    // Scenario: a run minted before the producer existed is counted, never dropped
    // Examples row: one carrying, one empty brief | 2 | 1 | 0.5 | 1
    name: "loop-declaration-join/02: a carrying run beside an empty-brief run reports 2 found, 1 carrying, ratio one half",
    run: () => withItem(async (item) => {
      await mint(item, [{ loop: built({ loopRunId: "lr-1" }) }, {}]);
      const model = await project(await readRuns(item));

      assert.equal(model.coverage.runsFound, 2);
      assert.equal(model.coverage.runsCarryingDeclaration, 1);
      assert.equal(model.coverage.ratio, 0.5);
      assert.equal(model.engagements.length, 1, "one engagement, built from the carrying run alone");
      assert.equal(model.engagements[0].cycles, 1, "the empty-brief run invented no cycle");
    }),
  },
  {
    // Scenario: two invocations over one item are two engagements
    // Examples rows: two carrying under two loop run ids | 2 | 2 | 1 | 2
    //                two carrying under one loop run id  | 2 | 2 | 1 | 1
    name: "loop-declaration-join/02: one loop id under two loop run ids is two engagements; under one it is one",
    run: () => withItem(async (item) => {
      await mint(item, [
        { loop: built({ loopRunId: "lr-a", cycle: 1 }) },
        { loop: built({ loopRunId: "lr-b", cycle: 1 }) },
      ]);
      const two = await project(await readRuns(item));
      assert.equal(two.coverage.runsFound, 2);
      assert.equal(two.coverage.runsCarryingDeclaration, 2);
      assert.equal(two.coverage.ratio, 1);
      assert.equal(two.engagements.length, 2);
      assert.deepEqual([...new Set(two.engagements.map((e) => e.loop))], [SHELL_LOOP_ID], "both name the same loop");
      // Neither absorbed the other's runs.
      assert.deepEqual(two.engagements.map((e) => e.cycles), [1, 1]);

      await withItem(async (other) => {
        await mint(other, [
          { loop: built({ loopRunId: "lr-one", cycle: 1 }) },
          { loop: built({ loopRunId: "lr-one", phase: "verify", cycle: 1 }) },
        ]);
        const one = await project(await readRuns(other));
        assert.equal(one.coverage.runsFound, 2);
        assert.equal(one.coverage.runsCarryingDeclaration, 2);
        assert.equal(one.coverage.ratio, 1);
        assert.equal(one.engagements.length, 1, "one loop run id is one engagement");
      });
    }),
  },
  {
    // Examples row: none carrying, three empty briefs | 3 | 0 | 0 | 0
    name: "loop-declaration-join/02: three empty-brief runs report 3 found, 0 carrying, ratio 0, no engagement",
    run: () => withItem(async (item) => {
      await mint(item, [{}, {}, {}]);
      const model = await project(await readRuns(item));

      assert.equal(model.coverage.runsFound, 3);
      assert.equal(model.coverage.runsCarryingDeclaration, 0);
      assert.equal(model.coverage.ratio, 0);
      assert.equal(model.engagements.length, 0);
      // …and the shell's loop is back to `declared-never-ran`, which is the honest answer for a
      // history that predates the producer rather than an error.
      assert.ok(names(model.gaps["declared-never-ran"]).includes(SHELL_LOOP_ID));
    }),
  },
  {
    // Scenario: the run record shape is untouched
    name: "loop-declaration-join/02: a run carrying the declaration keeps the store's frozen seventeen keys, in order",
    run: () => withItem(async (item) => {
      await mint(item, [{ loop: built({ loopRunId: "lr-1" }) }, {}]);
      const [carrying, empty] = await readRuns(item);

      assert.deepEqual(Object.keys(carrying), RECORD_KEYS);
      // Measured against a run from THIS tree that carries no declaration, so the comparison is
      // with the store's real record shape rather than with a literal somebody typed.
      assert.deepEqual(Object.keys(carrying), Object.keys(empty));
      // The declaration is INSIDE `brief`, which the store never reshaped.
      assert.deepEqual(Object.keys(carrying.brief), ["loop"]);
      assert.deepEqual(empty.brief, {});
    }),
  },
];
