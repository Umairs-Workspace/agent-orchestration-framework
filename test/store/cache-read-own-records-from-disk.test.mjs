import { defaultApplication as _aofApplication } from "aof/default-application";
// Traceability wiring for milestone 164 / story 02 (my own items read from my files):
//   .../02_story_my-own-items-read-from-my-files/tasks/00_my-own-records-answer-from-my-files.feature (@executable)
//
// 164/ADR-005: a cached row stands in for a LOCAL record only when another node reported it and
// the record has not changed since this node last observed it — `cacheAnswers`, the one predicate
// the stream readers and doctor share. Every case runs the real commands in-process over a real
// work tree, projection store and observation baseline under an isolated global home. The
// baseline is laid the way production lays it: by story 00's sync pass.
//
// Doctor's per-fact source stamp has no black-box channel, so its reads are observed through a
// finding only one status can produce: an in-progress (or later) story with no tasks draws
// `started-story-no-tasks`; a not-started one never does.
import assert from "node:assert/strict";
import { withCacheFixture, itemRow, writeItem, withStore } from "../support/cache-authority-fixture.mjs";

const invoke = _aofApplication.invoke;
const syncWorkspace = _aofApplication.mesh.globalWorkPublisher.syncWorkspace;
const upsertWorkItems = _aofApplication.mesh.store.upsertWorkItems;

const THIS_NODE = "node-7297";
const MAC = "node-9549";
const STREAM = [{ number: "164", stories: ["00"] }, { number: "05", stories: ["01"] }, { number: "07", stories: [] }];

// Background: a mesh-propagating workspace with 164/00, 05/01 and the milestone 07, observed once
// by the sync pass (unless the case is about having no baseline).
const withAof = (body, { observed = true } = {}) => () => withCacheFixture(async (fx) => {
  if (observed) await syncWorkspace(fx.workspace, { globalWorkStoreOptions: { env: fx.env }, journalOptions: { env: fx.env } });
  return body(fx);
}, { stream: STREAM, nodeId: THIS_NODE });

async function reportedBy(fx, node, ref, status, extra = {}) {
  await withStore(fx, (store) => upsertWorkItems(store, fx.workspaceId, [itemRow(ref, { status, ...extra })], { nodeId: node, authority: "reported", syncedAt: "2026-10-19T09:00:00.000Z" }));
}

const run = (fx, id, input = {}) => invoke(id, input, fx.ctx);
const found = async (fx, ref) => (await run(fx, "work:find", { query: ref })).rows.find((row) => row.ref === ref) ?? null;
const startedNoTasks = (findings, folder) => findings.some((finding) => finding.code === "started-story-no-tasks" && String(finding.path ?? "").includes(folder));
const divergence = (findings, folder) => findings.some((finding) => finding.code === "cache-status-divergence" && String(finding.path ?? "").includes(folder));

export const cacheReadOwnRecordsFromDiskTests = [
  // ================================ R1 — a record this node authored answers from its file
  ...[
    { example: "E1", row: "not-started", file: "in-progress" },
    { example: "E2", row: "in-progress", file: "in-progress" },
  ].map(({ example, row, file }) => ({
    name: `164/02 ${example} · a record this node reported answers from its file (row ${row}, file ${file})`,
    run: withAof(async (fx) => {
      await reportedBy(fx, THIS_NODE, "164/00", row);
      await writeItem(fx, "164/00", { status: file });
      const answer = await found(fx, "164/00");
      assert.equal(answer.status, file);
      assert.equal(answer.answeredFrom, "disk");
    }),
  })),

  // ================================ R2 — another machine's report stands in for my untouched scaffold
  {
    name: "164/02 E3 · a worker's report answers for a scaffold this node has not touched",
    run: withAof(async (fx) => {
      await reportedBy(fx, MAC, "05/01", "in-review");
      const answer = await found(fx, "05/01");
      assert.equal(answer.status, "in-review");
      assert.equal(answer.answeredFrom, "cache");
      assert.equal(answer.reportedBy, MAC);
    }),
  },
  {
    name: "164/02 E4 · a local edit outranks a worker's report",
    run: withAof(async (fx) => {
      await reportedBy(fx, MAC, "05/01", "in-review");
      await writeItem(fx, "05/01", { status: "done" });
      const answer = await found(fx, "05/01");
      assert.equal(answer.status, "done");
      assert.equal(answer.answeredFrom, "disk");
    }),
  },
  {
    name: "164/02 E5 · with no baseline, a worker's report still answers",
    run: withAof(async (fx) => {
      await reportedBy(fx, MAC, "05/01", "in-review");
      const answer = await found(fx, "05/01");
      assert.equal(answer.status, "in-review");
      assert.equal(answer.answeredFrom, "cache");
    }, { observed: false }),
  },
  {
    name: "164/02 · list and next read by the same rule",
    run: withAof(async (fx) => {
      await reportedBy(fx, THIS_NODE, "164/00", "not-started");
      await writeItem(fx, "164/00", { status: "in-progress" });
      const listed = (await run(fx, "work:list", {})).find((row) => row.ref === "164/00");
      assert.equal(listed?.status, "in-progress", "list reads 164/00 from its file");
      const next = await run(fx, "work:next", { scope: "164" });
      const offered = [next, ...(next.readySet ?? [])].find((row) => row?.ref === "164/00");
      assert.ok(offered, `next 164 answers about 164/00 (got ${JSON.stringify({ state: next.state, ref: next.ref })})`);
      assert.equal(offered.status, "in-progress", "next reads 164/00 from its file");
    }),
  },

  // ================================ R3 — doctor reads the same way the stream does
  {
    name: "164/02 E6 · doctor reads this node's own record from its file and raises no divergence",
    run: withAof(async (fx) => {
      await reportedBy(fx, THIS_NODE, "164/00", "not-started");
      await writeItem(fx, "164/00", { status: "in-progress" });
      const { findings } = await run(fx, "work:doctor", {});
      assert.ok(startedNoTasks(findings, "00_story_s164-00"), "doctor reads 164/00 as in-progress, from disk");
      assert.ok(!divergence(findings, "164_milestone"), "no cache-status-divergence names 164/00");
    }),
  },
  {
    name: "164/02 E7 · doctor reads a worker's report exactly as find does",
    run: withAof(async (fx) => {
      await reportedBy(fx, MAC, "05/01", "in-review");
      assert.equal((await found(fx, "05/01")).status, "in-review", "find reads in-review from the cache");
      const { findings } = await run(fx, "work:doctor", {});
      assert.ok(startedNoTasks(findings, "01_story_s05-01"), "doctor reads 05/01 as in-review, from the cache — its disk says not-started");
    }),
  },

  // ================================ R4 — what the store alone knows is still shown
  {
    name: "164/02 E8 · an item with no local folder is listed from the store",
    run: withAof(async (fx) => {
      await reportedBy(fx, MAC, "07/02", "in-progress");
      const listed = (await run(fx, "work:list", {})).find((row) => row.ref === "07/02");
      assert.equal(listed?.status, "in-progress");
    }),
  },
];
