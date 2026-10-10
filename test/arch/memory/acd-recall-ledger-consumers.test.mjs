// FF-15301 — milestone 153 / ADR-001: "Mixed ledger preserves raw counters, classification and
// publication; replay cannot double-count."
//
// A completed decision recall is the ledger's third row kind. The near-miss it answers is the one a
// new row kind always sets up: every consumer that partitions the ledger by kind must be moved
// together, and the one left behind silently counts the new rows as something else. Here the
// partition that matters is the RAW one — a recall row counted as raw feedback inflates the escape
// denominator and makes advice that was followed look like a defect that escaped.
//
//   (a) the MIXED-CONSUMER CONTROL: a ledger of 2 raw, 1 classification and 3 recall rows, written
//       through the real writers and read back through the real reader, goes through the counter's
//       observation path; the raw denominator must be 2 and no recall row may be an escape;
//   (b) the control carries its own NEGATIVE PROBE: the same control run over a counter that
//       "forgets" the partition (counts every row) must red with the observed wrong denominator —
//       so the control cannot go vacuous without this test saying so;
//   (c) a CENSUS of every module that reads the ledger: a new reader is a new consumer, and it reds
//       here until its partition treatment is declared (the reader list is the thing that rots);
//   (d) REPLAY cannot double-count: the identical observation submitted twice leaves one recall
//       row, and a conflicting resubmission leaves the ledger bytes untouched.
//
// RED PROBE (recorded in the milestone VERIFICATION): make `rawFeedback()` in
// `packages/work/src/counters.mjs` stop selecting `kind === "raw"` and (a) fails with
// "raw feedback denominator is 6, expected 2".
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRawFeedback,
  appendRecallObservation,
  feedbackRecordPath,
  readFeedbackRecords,
  recordFeedbackClassification,
} from "@aof/work/feedback-records";
import { countFindingEscapes } from "@aof/work/counters";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const recall = (id) => ({
  id, at: "2026-10-08T00:00:00Z", edge: "refine-architect", actor: "architect", query: "junction cleanup", scope: {},
  records: [{ item: "45", id: "R13", recordType: "lesson", verdict: "honoured" }],
});

async function withMixedLedger(run) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-ff15301-"));
  try {
    const item = { dir };
    await appendRawFeedback(item, { id: "raw-1", text: "first", actor: "qa", refs: "", at: "2026-10-05T00:00:00Z" });
    await appendRawFeedback(item, { id: "raw-2", text: "second", actor: "qa", refs: "", at: "2026-10-06T00:00:00Z" });
    await recordFeedbackClassification(item, { id: "triage-1", raw: "raw-1", at: "2026-10-07T00:00:00Z", classification: { kind: "bug" } });
    for (const id of ["c1", "c2", "c3"]) await appendRecallObservation(item, recall(id));
    await run(item);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// The control, parameterised by the counter under test so the negative probe can run the very same
// assertions over a mutant. Throws — with the observed number — when the partition is wrong.
async function assertRawPartition(item, countEscapes) {
  const feedbackRecords = await readFeedbackRecords(item);
  assert.equal(feedbackRecords.length, 6, "non-vacuity: the ledger really holds all six rows");
  const result = countEscapes([{ ref: "153", status: "done", acceptedAt: "2026-10-01T00:00:00Z", feedbackRecords, runs: [] }]);
  assert.equal(result.feedbackRecords, 2, `raw feedback denominator is ${result.feedbackRecords}, expected 2`);
  assert.equal(result.count, 2, `escape count is ${result.count}, expected 2 raw rows after acceptance`);
}

// What a consumer that omitted the partition would do: count every row as feedback.
function partitionOmittingCounter(items) {
  const [item] = items;
  const records = item.feedbackRecords;
  return { feedbackRecords: records.length, count: records.filter((entry) => Date.parse(entry.at) > Date.parse(item.acceptedAt)).length };
}

// Every module under packages/*/src that reads the ledger, and how it treats the partition. A module
// absent from this map is a consumer nobody classified.
const LEDGER_READERS = {
  "packages/work/src/feedback-records.mjs": "owns the parser and writers; admits all three kinds, writes under the ledger lock",
  "packages/work/src/doc-transitions.mjs": "appends raw (with its STATE bullet) or recall (without) and raises one feedback.recorded each",
  "packages/work/src/commands/feedback.mjs": "raw capture door (refuses recall fields) and the recall recorder",
  "packages/work/src/commands/counters.mjs": "hands the whole ledger to the counter",
  "packages/work/src/counters.mjs": 'selects kind === "raw" before counting',
};

async function sourceFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name === "node_modules") continue;
    if (entry.isDirectory()) found.push(...await sourceFiles(full));
    else if (entry.name.endsWith(".mjs")) found.push(full);
  }
  return found;
}

export const archTests = [
  {
    name: "arch/FF-15301: a mixed ledger of 2 raw, 1 classification and 3 recall rows keeps the raw denominator at 2 and counts no recall as an escape",
    run: () => withMixedLedger((item) => assertRawPartition(item, countFindingEscapes)),
  },
  {
    name: "arch/FF-15301: the control reds with the observed denominator when a consumer omits the raw partition (negative probe)",
    run: () => withMixedLedger(async (item) => {
      await assert.rejects(
        assertRawPartition(item, partitionOmittingCounter),
        (error) => /raw feedback denominator is 6, expected 2/.test(error.message),
        "the control must detect a counter that counts recall and classification rows as raw",
      );
    }),
  },
  {
    name: "arch/FF-15301: every module that reads the ledger is classified, and the counter selects its partition explicitly",
    run: async () => {
      const readers = [];
      for (const pkg of await readdir(path.join(repoRoot, "packages"))) {
        const src = path.join(repoRoot, "packages", pkg, "src");
        let files;
        try { files = await sourceFiles(src); } catch { continue; }
        for (const file of files) {
          const text = await readFile(file, "utf8");
          if (/readFeedbackRecords|FEEDBACK_RECORD_FILE|FEEDBACK\.ndjson|feedbackRecords|appendRecallObservation/.test(text)) {
            readers.push(path.relative(repoRoot, file).split(path.sep).join("/"));
          }
        }
      }
      const unclassified = readers.filter((file) => !(file in LEDGER_READERS));
      assert.deepEqual(unclassified, [], `a new ledger reader must declare how it treats raw / classification / recall rows in LEDGER_READERS: ${unclassified.join(", ")}`);
      const vanished = Object.keys(LEDGER_READERS).filter((file) => !readers.includes(file));
      assert.deepEqual(vanished, [], `LEDGER_READERS names a module that no longer reads the ledger: ${vanished.join(", ")}`);
      const counters = await readFile(path.join(repoRoot, "packages/work/src/counters.mjs"), "utf8");
      assert.match(counters, /kind === "raw"/, "the counter selects the raw partition explicitly rather than counting whatever the ledger holds");
    },
  },
  {
    name: "arch/FF-15301: replay cannot double-count — an identical resubmission leaves one recall row and a conflicting one leaves the bytes untouched",
    run: () => withMixedLedger(async (item) => {
      const before = await readFile(feedbackRecordPath(item), "utf8");
      const replay = await appendRecallObservation(item, recall("c1"));
      assert.equal(replay.replayed, true, "the identical observation is a replay");
      assert.equal(await readFile(feedbackRecordPath(item), "utf8"), before, "a replay writes nothing");
      const changed = { ...recall("c1"), records: [{ item: "45", id: "R13", recordType: "lesson", verdict: "departed" }] };
      await assert.rejects(appendRecallObservation(item, changed), { code: "feedback-id-conflict" });
      assert.equal(await readFile(feedbackRecordPath(item), "utf8"), before, "a conflicting retry leaves the ledger byte-identical");
      const rows = (await readFeedbackRecords(item)).filter((row) => row.kind === "recall");
      assert.equal(rows.length, 3, "three recall rows, once each");
    }),
  },
];
