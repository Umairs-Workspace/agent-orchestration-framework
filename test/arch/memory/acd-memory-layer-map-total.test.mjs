import { defaultApplication as _aofApplication } from "aof/default-application";
// FF-14803 — milestone 148 / ADR-004: "Every record type has a layer, and status accounts for every
// record."
//
// `RECORD_TYPE_LAYERS` (beside `MEMORY_RECORD_FIELDS` in `local-retrieval.mjs`) is the ONE partition
// of record types into memory layers. m40/R3 is the near-miss it answers: a new record kind obliges
// every consumer that partitions by kind, and `memory status` was the one left behind — on graphify
// it still names lessons and adrs only. So:
//
//   (a) over a fixture stream that exercises every parser, each `recordType` the indexer emits is a
//       key of `RECORD_TYPE_LAYERS` — a new parser that emits a new type reds here until the type
//       is given its layer;
//   (b) on BOTH backends the composed `status.types` counts sum to `recordCount`, so no record goes
//       unreported whichever backend is live.
//
// RED PROBE: drop `summary` from the map and (a) names it; return the backend's own status from the
// seam uncomposed and (b) reds on both backends.
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { writeEveryParserStream } from "../../memory/memory-status.test.mjs";
import { RECORD_TYPE_LAYERS } from "@aof/knowledge/memory/local-retrieval";

const runMemory = _aofApplication.knowledge.work.memory.runMemory;
const resolveConfiguredBackend = _aofApplication.knowledge.work.memory.resolveConfiguredBackend;
const buildRecords = _aofApplication.knowledge.memory.localIndexing.buildRecords;

const graphifyMissing = async () => {
  const error = new Error("graphify is not installed (test stub)");
  error.code = "graphify-missing";
  throw error;
};

async function withStream(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-ff14803-"));
  try {
    const workDir = path.join(root, "wiki", "work");
    const projectRoot = path.join(root, "project");
    await mkdir(path.join(projectRoot, ".aof"), { recursive: true });
    await writeEveryParserStream(workDir);
    await run({ workDir, projectRoot });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function composedStatus(backend, { workDir, projectRoot }) {
  const config = { memory: { backend } };
  const ctx = { workDir, projectRoot, configMemory: config.memory, invoke: graphifyMissing };
  const run = (argv) => runMemory(argv, { config, resolveBackend: (cfg) => resolveConfiguredBackend(cfg), ctx, log: () => {} });
  assert.equal((await run(["ingest", "--all"])).ok, true, `${backend} ingest`);
  const outcome = await run(["status", "--json"]);
  assert.equal(outcome.ok, true, `${backend} status`);
  return outcome.result;
}

export const archTests = [
  {
    name: "arch/FF-14803: every record type the indexer emits has a layer in RECORD_TYPE_LAYERS",
    run: () => withStream(async ({ workDir, projectRoot }) => {
      const records = await buildRecords(null, { workDir, projectRoot });
      const emitted = [...new Set(records.map((record) => record.recordType))].sort();
      assert.deepEqual(emitted, ["adr", "capability", "gap", "lesson", "summary"], "non-vacuity: the fixture exercises every parser");
      const unmapped = emitted.filter((type) => !Object.hasOwn(RECORD_TYPE_LAYERS, type));
      assert.deepEqual(unmapped, [], `every emitted type has a layer — unmapped: ${unmapped.join(", ")}`);
    }),
  },
  {
    name: "arch/FF-14803: on both backends the composed status types sum to recordCount",
    run: () => withStream(async (paths) => {
      for (const backend of ["local", "graphify"]) {
        const status = await composedStatus(backend, paths);
        assert.ok(status.recordCount > 0, `${backend}: non-vacuity — the store holds records`);
        const total = Object.values(status.types ?? {}).reduce((sum, entry) => sum + entry.count, 0);
        assert.equal(total, status.recordCount, `${backend}: ${JSON.stringify(status.types)} against ${status.recordCount}`);
      }
    }),
  },
];
