import { defaultApplication as _aofApplication } from "aof/default-application";
// Traceability wiring for milestone 164 / story 00 (a local change is noticed and owed):
//   .../00_story_a-local-change-is-noticed-and-owed/tasks/00_a-changed-record-takes-its-row.feature (@executable)
//   .../00_story_a-local-change-is-noticed-and-owed/tasks/01_a-change-is-owed-in-the-journal.feature (@executable)
//
// Every case drives THE sync pass (`syncWorkspace`, 164/ADR-004) over a real work tree, a real
// projection store and a real effects journal under an isolated global home. The pass detects
// (stat gate, then the one "changed since observed" predicate), marks (`workspace.changed` in the
// existing journal) and drains (the `publish-projection` reactor a verb's event uses).
//
// The journal's own collapse-key rules (E9-E11 and the v1 → v2 migration at the unit grain) are
// in packages/effects/test/journal.test.mjs; the cases here prove them through the pass.
import assert from "node:assert/strict";
import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { withCacheFixture, seedActive, settle, rows, authorOf, itemRow, writeItem, withStore } from "../support/cache-authority-fixture.mjs";

const syncWorkspace = _aofApplication.mesh.globalWorkPublisher.syncWorkspace;
const upsertWorkItems = _aofApplication.mesh.store.upsertWorkItems;
const openEffectsJournal = _aofApplication.effects.journal.openEffectsJournal;
const readEvents = _aofApplication.effects.journal.readEvents;
const readEventSteps = _aofApplication.effects.journal.readEventSteps;
const appendEvent = _aofApplication.effects.journal.appendEvent;

const THIS_NODE = "node-7297";
const MAC = "node-9549";
const STREAM = [{ number: "164", stories: ["00"] }, { number: "05", stories: ["01"] }];

// Background: a mesh-propagating workspace holding 164/00 and 05/01, this node pinned.
const withAof = (body, { observed = true } = {}) => () => withCacheFixture(async (fx) => {
  if (observed) await sync(fx); // "every record has been published and observed once"
  return body(fx);
}, { stream: STREAM, nodeId: THIS_NODE });

function sync(fx, options = {}) {
  return syncWorkspace(fx.workspace, { globalWorkStoreOptions: { env: fx.env }, journalOptions: { env: fx.env }, ...options });
}

// Another node's report, through the reported door a worker's frame uses.
async function reportedBy(fx, node, ref, status, at = "2026-10-19T09:00:00.000Z") {
  await withStore(fx, (store) => upsertWorkItems(store, fx.workspaceId, [itemRow(ref, { status })], { nodeId: node, authority: "reported", syncedAt: at }));
}

async function statusOf(fx, ref) {
  return (await rows(fx)).get(ref)?.status ?? null;
}

async function observationOf(fx, ref, node = THIS_NODE) {
  return withStore(fx, (store) => store.db
    .prepare("SELECT fingerprint FROM work_item_observations WHERE workspace_id = ? AND ref = ? AND node_id = ?")
    .get(fx.workspaceId, ref, node)?.fingerprint ?? null);
}

async function journalEvents(fx, name = "workspace.changed") {
  const journal = await openEffectsJournal({ env: fx.env });
  try {
    return readEvents(journal, { name, limit: 1000 }).map((event) => ({ ...event, steps: readEventSteps(journal, event.eventId) }));
  } finally {
    journal.close();
  }
}

// Time passes for every failed step: a retry-until-done reactor waits out its backoff
// (164/ADR-006), so "the next pass" lands a failed publish once that backoff has elapsed.
async function ageFailedSteps(fx) {
  const journal = await openEffectsJournal({ env: fx.env });
  try {
    journal.db.prepare("UPDATE effect_steps SET updated_at = '2000-01-01T00:00:00.000Z' WHERE status = 'failed'").run();
  } finally {
    journal.close();
  }
}

// A reword of the record doc's prose, touching no frontmatter field.
async function reword(fx, ref) {
  const [milestone, story] = ref.split("/");
  const doc = path.join(fx.workDir, `${milestone}_milestone_m${milestone}`, "stories", `${story}_story_s${milestone}-${story}`, "STORY.md");
  await appendFile(doc, `\n## User story\n\nAs the operator, reworded ${Date.now()}.\n`, "utf8");
  assert.match(await readFile(doc, "utf8"), /reworded/);
}

export const syncLocalChangeOwedTests = [
  // ======================================== task 00 · R1 — a change takes its row, never lost
  {
    name: "164/00 E1 · a hand edit of a record this node reported lands",
    run: withAof(async (fx) => {
      assert.equal(await statusOf(fx, "164/00"), "not-started");
      assert.equal(await authorOf(fx, "164/00"), THIS_NODE);
      await writeItem(fx, "164/00", { status: "in-progress" });
      await sync(fx);
      assert.equal(await statusOf(fx, "164/00"), "in-progress");
      assert.equal(await authorOf(fx, "164/00"), THIS_NODE);
    }),
  },
  {
    name: "164/00 E2 · a pulled change takes back a row another node reported",
    run: withAof(async (fx) => {
      await reportedBy(fx, MAC, "05/01", "in-review");
      assert.equal(await authorOf(fx, "05/01"), MAC);
      await writeItem(fx, "05/01", { status: "done" });
      await sync(fx);
      assert.equal(await statusOf(fx, "05/01"), "done");
      assert.equal(await authorOf(fx, "05/01"), THIS_NODE);
    }),
  },
  {
    name: "164/00 E3 · an untouched scaffold never overwrites another node's report — even when the pass reads every row",
    run: withAof(async (fx) => {
      await reportedBy(fx, MAC, "05/01", "in-review");
      // A change ELSEWHERE moves the stat digest, so the pass really hashes 05/01's row.
      await writeItem(fx, "164/00", { status: "in-progress" });
      const result = await sync(fx);
      assert.equal(result.changed, true, "the pass ran a row comparison and published");
      assert.equal(await statusOf(fx, "05/01"), "in-review");
      assert.equal(await authorOf(fx, "05/01"), MAC);
    }),
  },
  {
    name: "164/00 E4 · a prose-only edit claims nothing",
    run: withAof(async (fx) => {
      await reportedBy(fx, MAC, "05/01", "in-review");
      const before = (await rows(fx)).get("05/01");
      const events = (await journalEvents(fx)).length;
      await reword(fx, "05/01");
      const result = await sync(fx);
      assert.equal(result.changed, false, "a moved digest with no changed row owes nothing");
      assert.deepEqual((await rows(fx)).get("05/01"), before);
      assert.equal(await authorOf(fx, "05/01"), MAC);
      assert.equal((await journalEvents(fx)).length, events, "no mark is appended for prose");
    }),
  },
  {
    name: "164/00 E5 · a write that fails leaves the change owed, and the next pass lands it",
    run: withAof(async (fx) => {
      const observed = await observationOf(fx, "164/00");
      await writeItem(fx, "164/00", { status: "in-progress" });
      // The global store refuses writes: another connection holds its write lock.
      const blocker = new DatabaseSync(path.join(fx.home, "mesh", "work", "projection.sqlite"));
      try {
        blocker.exec("PRAGMA busy_timeout = 0");
        blocker.exec("BEGIN IMMEDIATE");
        const refused = await sync(fx);
        assert.equal(refused.effects?.[0]?.status, "failed", "the publish failed and its step is retryable");
      } finally {
        try { blocker.exec("ROLLBACK"); } finally { blocker.close(); }
      }
      assert.equal(await observationOf(fx, "164/00"), observed, "the observation did not advance");
      assert.equal(await statusOf(fx, "164/00"), "not-started");
      await ageFailedSteps(fx); // the failed publish's backoff elapses (164/ADR-006)
      await sync(fx);
      assert.equal(await statusOf(fx, "164/00"), "in-progress");
    }),
  },
  {
    name: "164/00 E6 · with no observations, the first pass records what it sees and takes nothing",
    run: withAof(async (fx) => {
      assert.equal(await observationOf(fx, "05/01"), null, "the observations are empty");
      await reportedBy(fx, MAC, "05/01", "in-review");
      await sync(fx);
      assert.equal(await statusOf(fx, "05/01"), "in-review");
      assert.equal(await authorOf(fx, "05/01"), MAC);
      assert.ok(await observationOf(fx, "05/01"), "this node has observed 05/01");
    }, { observed: false }),
  },

  // ======================================== task 00 · R2 — a held change waits for the holder
  {
    name: "164/00 E7 · an edit to a held item is not written, and stays owed",
    run: withAof(async (fx) => {
      await reportedBy(fx, MAC, "05/01", "in-progress");
      await seedActive(fx, { assignmentId: "asg-05", itemRef: "05/01", node: MAC, state: "running" });
      const observed = await observationOf(fx, "05/01");
      await writeItem(fx, "05/01", { status: "blocked" });
      const result = await sync(fx);
      assert.equal(await authorOf(fx, "05/01"), MAC, "the row is not written by this node");
      assert.equal(await statusOf(fx, "05/01"), "in-progress");
      assert.deepEqual(result.held, [{ ref: "05/01", reason: "held-by-assignment", holderNode: MAC }]);
      assert.equal(await observationOf(fx, "05/01"), observed, "the observation of 05/01 is unchanged");
    }),
  },
  {
    name: "164/00 E8 · once the lane settles, the held edit lands over the lane's report",
    run: withAof(async (fx) => {
      await seedActive(fx, { assignmentId: "asg-05", itemRef: "05/01", node: MAC, state: "running" });
      await writeItem(fx, "05/01", { status: "blocked" });
      await sync(fx);
      await settle(fx, "asg-05", "done");
      await reportedBy(fx, MAC, "05/01", "in-review", "2026-10-19T11:00:00.000Z");
      await sync(fx);
      assert.equal(await statusOf(fx, "05/01"), "blocked");
      assert.equal(await authorOf(fx, "05/01"), THIS_NODE);
    }),
  },
  {
    name: "164/00 R2 · a mark that settled under the lock is re-marked once the lock releases, rather than ignored as already seen",
    run: withAof(async (fx) => {
      await writeItem(fx, "05/01", { status: "blocked" });
      await sync(fx, { drain: false }); // marked before the lock was taken…
      await seedActive(fx, { assignmentId: "asg-05", itemRef: "05/01", node: MAC, state: "running" });
      await reportedBy(fx, MAC, "05/01", "in-progress");
      await sync(fx); // …and drained under it: the step settles, the change stays owed
      assert.equal(await authorOf(fx, "05/01"), MAC);
      await settle(fx, "asg-05", "done");
      await sync(fx);
      assert.equal(await statusOf(fx, "05/01"), "blocked");
      assert.equal(await authorOf(fx, "05/01"), THIS_NODE);
    }),
  },
  {
    name: "164/00 R1 · a deleted record is a change: its observation is forgotten and the row this node authored is retracted",
    run: withAof(async (fx) => {
      const { rm } = await import("node:fs/promises");
      await rm(path.join(fx.workDir, "05_milestone_m05", "stories", "01_story_s05-01"), { recursive: true, force: true });
      const result = await sync(fx);
      assert.ok(result.owed.includes("05/01"));
      assert.equal((await rows(fx)).has("05/01"), false);
      assert.equal(await observationOf(fx, "05/01"), null);
      assert.equal((await sync(fx)).changed, false, "the next pass owes nothing");
    }),
  },

  // ======================================== task 01 · R3 — one owed sync per workspace
  {
    name: "164/00 task 01 · a noticed change appends one mark, owed at the local locus to the publish reactor",
    run: withAof(async (fx) => {
      const before = (await journalEvents(fx)).length;
      await writeItem(fx, "164/00", { status: "in-progress" });
      const result = await sync(fx, { drain: false });
      const events = await journalEvents(fx);
      assert.equal(events.length, before + 1);
      const [mark] = events.filter((event) => event.eventId === result.eventId);
      assert.equal(mark.payload.workspaceId, fx.workspaceId);
      assert.deepEqual(mark.steps.map(({ key, locus, status }) => ({ key, locus, status })), [{ key: "publish-projection", locus: "local", status: "pending" }]);
    }),
  },
  {
    name: "164/00 E9 · newer marks supersede older owed ones for the same workspace",
    run: withAof(async (fx) => {
      const ids = [];
      for (const status of ["in-progress", "in-review", "blocked"]) {
        await writeItem(fx, "164/00", { status });
        ids.push((await sync(fx, { drain: false })).eventId);
      }
      const steps = (await journalEvents(fx)).filter((event) => ids.includes(event.eventId))
        .map((event) => [event.eventId, event.steps[0].status]);
      assert.deepEqual(new Map(steps), new Map([[ids[0], "superseded"], [ids[1], "superseded"], [ids[2], "pending"]]));
    }),
  },
  {
    name: "164/00 E10 · noticing the same workspace state twice appends one event",
    run: withAof(async (fx) => {
      await writeItem(fx, "164/00", { status: "in-progress" });
      const first = await sync(fx, { drain: false });
      const second = await sync(fx, { drain: false });
      assert.equal(second.eventId, first.eventId);
      assert.equal(second.appended, false);
      assert.equal((await journalEvents(fx)).filter((event) => event.payload?.digest === first.digest).length, 1);
    }),
  },
  {
    name: "164/00 E11 · a verb's event is never superseded by a mark",
    run: withAof(async (fx) => {
      const journal = await openEffectsJournal({ env: fx.env });
      try {
        appendEvent(journal, { eventId: "verb-164-00", name: "item-status.changed", payload: { ref: "164/00", workspaceRoot: fx.root } }, [{ key: "publish-projection", locus: "local" }]);
      } finally {
        journal.close();
      }
      await writeItem(fx, "164/00", { status: "in-progress" });
      await sync(fx, { drain: false });
      const [verb] = await journalEvents(fx, "item-status.changed");
      assert.equal(verb.steps[0].status, "pending");
    }),
  },
];
