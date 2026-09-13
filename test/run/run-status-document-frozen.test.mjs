// Traceability: milestone 126 / story 01, task 02 (ADR-003 §3-§5). THE DOCUMENT DOES NOT MOVE.
//
// The render gained the record's facts; the `--json` document gained nothing. This suite drives the
// document rather than reading the source for it: `cli.json` is identity, so the value
// `invoke("work:run-status", …)` returns THROUGH `src/command-core.mjs` IS the document. Every
// answering path is exercised — the disk read, and the five cache/worker paths that a source sweep
// can see but not prove — because the `fromWorker` / `reportedBy` asymmetry is exactly where a
// "helpful" key would be added for symmetry and no test would notice.
//
// The structural half (the key sets read off the source, the pin, the render's purity) is
// `test/arch/run/acd-run-status-renders-the-record.test.mjs`.
import assert from "node:assert/strict";

import {
  withCacheReadFixture, plantCacheRow, refuseCommand, runCommand, streamRun, writeItem,
  WORKER_NODE,
} from "../support/cache-read-fixture.mjs";
import { loadWorkspace } from "../../src/command-core.mjs";
import { startRun } from "../../src/run-store.mjs";
import { runStatusCommand } from "../../src/commands/run-status.mjs";
import { resolveItemExact } from "../../src/commands/resolve.mjs";

// This node's own disk holds milestone "00" only, so a cache-only ref has genuinely no folder here.
const DISK_STREAM = [{ number: "00", stories: [] }];

const keysOf = (document) => Object.keys(document);
const status = (fx, ref) => runCommand(fx, "work:run-status", { ref });

/**
 * Mint a real run in the fixture's own `00` folder, so the disk path answers with a real record.
 * The folder is located through the command's OWN resolver rather than by reconstructing the
 * fixture's naming — a hand-built path that misses lands the run somewhere `run()` never looks, and
 * the suite then passes over an empty history while asserting about a full one.
 */
async function mintDiskRun(fx, { ref = "00", now = "2026-09-08T10:00:00.000Z", brief = {} } = {}) {
  const workspace = await loadWorkspace(fx.root, undefined, { env: fx.env });
  const item = await resolveItemExact({ workspace }, ref);
  assert.ok(item?.dir != null, `${ref} resolves to a local folder in the fixture`);
  return startRun(item, { brief, now, node: "umamis-msi" });
}

export const runStatusDocumentFrozenTests = [
  {
    name: "126/01 task02 — the document's key set is exactly what it is today, on every answering path",
    async run() {
      await withCacheReadFixture(async (fx) => {
        // (1) resolved on disk, with a loop-minted run in its `runs/` dir
        const brief = { loop: { loopRunId: "l", scope: "00", level: "L2", cap: 3, phase: "continue", cycle: 2, startedAt: "2026-09-08T10:00:00.000Z", id: "id" } };
        await mintDiskRun(fx, { brief });
        const diskWithRun = await status(fx, "00");
        assert.deepEqual(keysOf(diskWithRun), ["ref", "runs", "answeredFrom"]);
        assert.equal(diskWithRun.answeredFrom, "disk");
        assert.equal(diskWithRun.runs.length, 1);

        // (2) unresolvable ref, runs streamed for it — the `:48` path
        await streamRun(fx, { ref: "07", runId: "w-07", state: "running", node: WORKER_NODE });
        const streamedOnly = await status(fx, "07");
        assert.deepEqual(keysOf(streamedOnly), ["ref", "runs", "fromWorker", "answeredFrom", "reportedBy"]);
        assert.equal(streamedOnly.answeredFrom, "cache");
        assert.equal(streamedOnly.fromWorker, true);

        // (3) THE FOUR-KEY `:50` PATH IS NOT REACHABLE FROM THIS FIXTURE, and that is recorded
        // rather than faked. It needs a ref `resolveItem` does NOT resolve but `readStreamedItemRow`
        // DOES — and `resolveItem` is cache-first, so any row this fixture can plant resolves and
        // the call takes `:62` instead. A planted row asserted as `:50` would be a test that names
        // one branch and exercises another, which is worse than an acknowledged boundary. The
        // four-key shape, and that it gains no `reportedBy` "for symmetry", is proved structurally
        // instead: `acd-run-status-renders-the-record` leg 4 reads the source and asserts there is
        // exactly ONE four-key return site. The five sites below are driven.

        // (4) resolved from the cache only (no local folder), with streamed runs — the `:61` path
        await plantCacheRow(fx, "09", { status: "in-progress", title: "Cache only", node: WORKER_NODE });
        await streamRun(fx, { ref: "09", runId: "w-09", state: "done", node: WORKER_NODE });
        const cacheOnlyWithRuns = await status(fx, "09");
        assert.deepEqual(keysOf(cacheOnlyWithRuns), ["ref", "runs", "fromWorker", "answeredFrom", "reportedBy"]);
        assert.equal(cacheOnlyWithRuns.answeredFrom, "cache");

        // (5) resolved from the cache only, with NO streamed runs — the `:62` path
        await plantCacheRow(fx, "10", { status: "in-progress", title: "Cache only, no runs", node: WORKER_NODE });
        const cacheOnlyNoRuns = await status(fx, "10");
        assert.deepEqual(keysOf(cacheOnlyNoRuns), ["ref", "runs", "fromWorker", "answeredFrom", "reportedBy"]);
        assert.deepEqual(cacheOnlyNoRuns.runs, []);

        // (6) resolved on disk with NO local runs, and runs streamed by the worker — the `:71`
        // path, which hardcodes `cache` for a DISK-resolved item. That is why `answeredFrom` is
        // not the worker marker and `fromWorker` is.
        await writeItem(fx, "11");
        await streamRun(fx, { ref: "11", runId: "w-11", state: "running", node: WORKER_NODE });
        const diskItemStreamedRuns = await status(fx, "11");
        assert.deepEqual(keysOf(diskItemStreamedRuns), ["ref", "runs", "fromWorker", "answeredFrom", "reportedBy"]);
        assert.equal(diskItemStreamedRuns.answeredFrom, "cache");
        assert.equal(diskItemStreamedRuns.fromWorker, true);

        // (7) resolved on disk, no runs anywhere and nothing streamed — the `:73` path
        await writeItem(fx, "12");
        const diskNoRuns = await status(fx, "12");
        assert.deepEqual(keysOf(diskNoRuns), ["ref", "runs", "answeredFrom"]);
        assert.equal(diskNoRuns.answeredFrom, "disk");
        assert.deepEqual(diskNoRuns.runs, []);

        // NO document on ANY path carries a render's fact.
        for (const document of [diskWithRun, streamedOnly, cacheOnlyWithRuns, cacheOnlyNoRuns, diskItemStreamedRuns, diskNoRuns]) {
          for (const forbidden of ["now", "elapsed", "heartbeatAge", "age", "line", "rendered"]) {
            assert.ok(!(forbidden in document), `no document carries \`${forbidden}\``);
          }
          for (const run of document.runs) {
            for (const forbidden of ["now", "elapsed", "heartbeatAge", "rendered"]) {
              assert.ok(!(forbidden in run), `no run inside \`runs\` carries \`${forbidden}\``);
            }
          }
        }
      }, { stream: DISK_STREAM });
    },
  },
  {
    name: "126/01 task02 — an unresolvable ref with nothing streamed is still the same coded refusal",
    async run() {
      await withCacheReadFixture(async (fx) => {
        const error = await refuseCommand(() => status(fx, "99"));
        assert.equal(error.code, "ref-not-found");
        assert.equal(error.status, 404);
      }, { stream: DISK_STREAM });
    },
  },
  {
    name: "126/01 task02 — what is inside `runs` is unreshaped",
    async run() {
      await withCacheReadFixture(async (fx) => {
        const loop = { loopRunId: "l", scope: "00", level: "L2", cap: 3, phase: "continue", cycle: 2, startedAt: "2026-09-08T10:00:00.000Z", id: "id" };
        await mintDiskRun(fx, { brief: { loop } });
        const document = await status(fx, "00");
        const [record] = document.runs;
        assert.equal(Object.keys(record).length, 16, "the disk-read record carries exactly the sixteen record keys");
        assert.deepEqual(Object.keys(record.brief.loop), Object.keys(loop), "the envelope's eight keys, in order");
        assert.deepEqual(record.brief.loop, loop, "…with its values intact");

        // The projection's own writer stores exactly four keys; the read adds none and
        // normalises none away.
        await streamRun(fx, { ref: "07", runId: "w-07", state: "running", node: WORKER_NODE });
        const streamed = await status(fx, "07");
        assert.deepEqual(
          Object.keys(streamed.runs[0]).sort(),
          ["itemRef", "node", "runId", "state"],
          "the worker-streamed record is passed through exactly as the projection holds it",
        );
      }, { stream: DISK_STREAM });
    },
  },
  {
    name: "126/01 task02 — the instant belongs to the RENDER, and the document never learns of it",
    async run() {
      await withCacheReadFixture(async (fx) => {
        await mintDiskRun(fx, { brief: { loop: { loopRunId: "l", scope: "00", level: "L2", cap: 3, phase: "continue", cycle: 1, startedAt: "2026-09-08T10:00:00.000Z", id: "id" } } });
        const document = await status(fx, "00");
        const before = JSON.parse(JSON.stringify(document));

        // `now` is not an input key, and the declaration is still closed.
        assert.equal(runStatusCommand.input.additionalProperties, false);
        assert.deepEqual(Object.keys(runStatusCommand.input.properties), ["ref"]);

        const early = runStatusCommand.cli.render(document, { now: "2026-09-08T11:00:00.000Z" });
        const later = runStatusCommand.cli.render(document, { now: "2026-09-08T12:00:00.000Z" });
        assert.notEqual(early, later, "two `faceCtx.now` values an hour apart produce two different lines");
        assert.deepEqual(
          JSON.parse(JSON.stringify(document)),
          before,
          "the result is deep-equal to the invoked document after both renders — the render writes nothing back",
        );
      }, { stream: DISK_STREAM });
    },
  },
];
