// test/mesh/mesh-effects-outbox.test.mjs — m42 wave (d) leg d3: FACTS OVER THE BRIDGE.
//
// The defect these lanes exist for is measured, not theoretical (STATE 2026-07-27):
// "Worker startup-reclaim frames are fire-once — the Mac worker restarted in the
// ~3-min window while the control was ALSO down; its `failed/daemon-restarted`
// report for run 0017's stranded worktree died on the dead connection, and the
// control row read a stale `running` for 35+ min". Every scenario below is a
// property of the cure: the fact is owed durably, delivery is separate from
// completion, an offline send loses nothing, and the control node's verdict — not
// the socket — is what ends the obligation.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { setDegradeSinkForTest } from "../../packages/core/src/degrade.mjs";
import { readExecutionOverlay } from "../../packages/core/src/board-mesh-execution.mjs";
import { buildNotifyEnvelope } from "../../packages/core/src/notify/notify.mjs";
import { openEffectsJournal, appendEvent, readEventSteps, pendingSteps } from "../../packages/core/src/effects/journal.mjs";
import { drainEffects, LOCAL_LOCI, CONTROL_LOCI } from "../../packages/core/src/effects/dispatch.mjs";
import { drainOutbox, remoteSteps, applyEffectAck, EFFECT_STEP_FRAME_KIND, EFFECT_ACK_FRAME_KIND } from "../../packages/core/src/effects/outbox.mjs";
import { reportAssignmentSettled } from "../../packages/core/src/effects/assignment-transitions.mjs";
import { applyStreamFrame } from "../../packages/core/src/control-stream-server.mjs";
import { readAssignment } from "../../packages/core/src/assignment-record.mjs";
import { openGlobalWorkProjectionStore } from "../../packages/core/src/global-work-store.mjs";
import { withMeshAssignFixture, seedAssignment } from "../support/mesh-assign-fixture.mjs";

const NOW = "2026-07-31T10:00:00.000Z";

// A journal in the fixture's isolated global home.
async function withJournal({ home }, fn) {
  const journal = await openEffectsJournal({ env: { AOF_GLOBAL_HOME: home } });
  try {
    return await fn(journal);
  } finally {
    journal.close();
  }
}

// The worker's owed step, raised the way production raises it.
async function raiseReport({ home }, report) {
  return reportAssignmentSettled(
    { now: NOW, ...report },
    { journalOptions: { env: { AOF_GLOBAL_HOME: home } } },
  );
}

// A control-node double that accepts every step and answers with the ack frame
// the real server sends, so a test can close the loop without a socket.
function acceptingControl() {
  const seen = [];
  return {
    seen,
    async send(envelope) {
      seen.push(envelope);
      return { sent: true };
    },
  };
}

export const meshEffectsOutboxTests = [
  {
    name: "effects-outbox/d3 a control-store step is OWED by a worker, not run by it — the local drain defers it and the outbox claims it",
    run: async () => withMeshAssignFixture(async ({ home }) => {
      const { eventId } = await raiseReport({ home }, { assignmentId: "asg-1", state: "failed", code: "daemon-restarted" });
      assert.ok(eventId, "the report is durable — it has an event id");

      await withJournal({ home }, async (journal) => {
        // The worker's own drain reaches checkout + local only.
        const outcomes = await drainEffects({ journal, eventId, loci: LOCAL_LOCI, now: NOW });
        assert.equal(outcomes.length, 1);
        assert.equal(outcomes[0].locus, "control-store");
        assert.equal(outcomes[0].status, "deferred", "a worker never runs a control-store reactor itself");

        const steps = readEventSteps(journal, eventId);
        assert.equal(steps[0].status, "pending", "the step is still OWED after the local drain");

        const owed = remoteSteps(journal, { loci: LOCAL_LOCI });
        assert.deepEqual(
          owed.map((step) => [step.name, step.key]),
          [["assignment.reported", "settle-assignment"]],
          "the outbox's work-list is exactly the steps this node cannot run",
        );
      });
    }),
  },
  {
    name: "effects-outbox/d3 DELIVERY IS NOT COMPLETION — a shipped step stays pending until the control node acks it",
    run: async () => withMeshAssignFixture(async ({ home }) => {
      const { eventId } = await raiseReport({ home }, { assignmentId: "asg-2", state: "done", branch: "aof/mesh/35-00" });
      await withJournal({ home }, async (journal) => {
        const control = acceptingControl();
        const shipped = await drainOutbox({ journal, send: control.send, now: NOW });
        assert.equal(shipped.length, 1);
        assert.equal(shipped[0].status, "sent");
        assert.equal(control.seen.length, 1, "the envelope reached the transport");
        assert.equal(control.seen[0].name, "assignment.reported");
        assert.equal(control.seen[0].payload.branch, "aof/mesh/35-00", "the fact carries its own evidence");

        assert.equal(readEventSteps(journal, eventId)[0].status, "pending", "a SENT step is still owed — the receipt is the ack, not the send");

        applyEffectAck(journal, { eventId, reactorKey: "settle-assignment", ok: true }, { now: NOW });
        assert.equal(readEventSteps(journal, eventId)[0].status, "done", "the ack is what pays the step");
      });
    }),
  },
  {
    name: "effects-outbox/d3 THE MEASURED DEFECT: a report raised while the control node is unreachable is redelivered by the next drain, never lost",
    run: async () => withMeshAssignFixture(async ({ home }) => {
      // The worker restarts and reports a stranded worktree — with nobody home.
      const { eventId } = await raiseReport({ home }, { assignmentId: "asg-3", state: "failed", code: "daemon-restarted" });
      await withJournal({ home }, async (journal) => {
        const offline = [];
        const first = await drainOutbox({
          journal,
          send: async (envelope) => {
            offline.push(envelope);
            return { sent: false, code: "not-connected" };
          },
          now: NOW,
        });
        assert.equal(first[0].status, "unsent");
        const afterOffline = readEventSteps(journal, eventId)[0];
        assert.equal(afterOffline.status, "pending", "an offline send leaves the fact owed");
        assert.equal(afterOffline.attempts, 0, "being offline is not a failed attempt — it must never burn the retry budget");

        // The connection returns; the very next drain ships it.
        const control = acceptingControl();
        const second = await drainOutbox({ journal, send: control.send, now: NOW });
        assert.equal(second[0].status, "sent", "the next drain redelivers — this is the fire-once cure");
        assert.equal(control.seen[0].payload.code, "daemon-restarted", "the redelivered fact is the same fact");
      });
    }),
  },
  {
    name: "effects-outbox/d3 the ack vocabulary: ok pays, a coded refusal ENDS the step (never a redelivery loop), a bare fault leaves it retryable",
    run: async () => withMeshAssignFixture(async ({ home }) => {
      const a = await raiseReport({ home }, { assignmentId: "asg-ok", state: "done" });
      const b = await raiseReport({ home }, { assignmentId: "asg-refused", state: "done" });
      const c = await raiseReport({ home }, { assignmentId: "asg-fault", state: "done" });
      await withJournal({ home }, async (journal) => {
        applyEffectAck(journal, { eventId: a.eventId, reactorKey: "settle-assignment", ok: true }, { now: NOW });
        applyEffectAck(journal, { eventId: b.eventId, reactorKey: "settle-assignment", ok: false, code: "assignment-status-already-terminal" }, { now: NOW });
        applyEffectAck(journal, { eventId: c.eventId, reactorKey: "settle-assignment", ok: false }, { now: NOW });

        assert.equal(readEventSteps(journal, a.eventId)[0].status, "done");
        const refused = readEventSteps(journal, b.eventId)[0];
        assert.equal(refused.status, "skipped", "a DECIDED refusal ends the obligation — redelivering it would loop forever");
        assert.equal(refused.lastError, "assignment-status-already-terminal", "the verdict is recorded, never silent");
        assert.equal(readEventSteps(journal, c.eventId)[0].status, "failed", "a fault stays retryable");

        // Only the fault is still owed.
        const owed = remoteSteps(journal, { loci: LOCAL_LOCI }).map((step) => step.eventId);
        assert.deepEqual(owed, [c.eventId]);

        // A duplicate ack for a settled step is the at-least-once tax, paid quietly.
        const dupe = applyEffectAck(journal, { eventId: a.eventId, reactorKey: "settle-assignment", ok: true }, { now: NOW });
        assert.equal(dupe.applied, false);
        assert.equal(dupe.code, "effect-ack-already-settled");
        // An ack for a step this journal never owed is ignored, never fabricated.
        const ghost = applyEffectAck(journal, { eventId: "nope", reactorKey: "settle-assignment", ok: true }, { now: NOW });
        assert.equal(ghost.code, "effect-ack-unknown-step");
      });
    }),
  },
  {
    name: "effects-outbox/d3 retryable control NACKs never exhaust an obligation, even after more than five failures",
    run: async () => withMeshAssignFixture(async ({ workspaceId, home }) => {
      await seedAssignment({ home }, {
        assignmentId: "asg-retryable-nack",
        itemRef: "35/00",
        workspaceId,
        targetNodeId: "worker-a",
        issuer: "control-a",
        state: "running",
        assignedAt: "2026-07-31T09:00:00.000Z",
        updatedAt: "2026-07-31T09:00:00.000Z",
      });
      const { eventId } = await raiseReport({ home }, { assignmentId: "asg-retryable-nack", state: "failed", code: "daemon-restarted" });
      const envelope = await withJournal({ home }, async (journal) => {
        const sent = [];
        await drainOutbox({ journal, send: async (value) => { sent.push(value); return { sent: true }; }, now: NOW, eventId });
        return sent[0];
      });

      const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
      const acks = [];
      const directiveTargets = {
        get: () => ({ readyState: 1, send(encoded) { acks.push(JSON.parse(encoded)); } }),
      };
      const brokenSqlite = { DatabaseSync: class { constructor() { throw new Error("control journal unavailable"); } } };
      try {
        for (let attempt = 1; attempt <= 7; attempt += 1) {
          const result = await applyStreamFrame(
            store,
            { kind: EFFECT_STEP_FRAME_KIND, nodeId: "worker-a", ...envelope },
            {
              nodeId: "worker-a",
              now: NOW,
              journalOptions: { databasePath: `${home}/broken-control-journal.sqlite`, sqlite: brokenSqlite },
              directiveTargets,
            },
          );
          assert.equal(result.retryable, true, `control fault ${attempt} is explicitly retryable`);
          const ack = acks.at(-1);
          assert.equal(ack.retryable, true, `NACK ${attempt} carries retryability over the wire`);
          await withJournal({ home }, async (journal) => {
            const receipt = applyEffectAck(journal, ack, { now: NOW });
            assert.deepEqual(
              { status: receipt.status, retryable: receipt.retryable },
              { status: "pending", retryable: true },
            );
            const step = readEventSteps(journal, eventId)[0];
            assert.deepEqual({ status: step.status, attempts: step.attempts }, { status: "pending", attempts: 0 });
          });
        }

        await withJournal({ home }, async (journal) => {
          assert.ok(remoteSteps(journal, { loci: LOCAL_LOCI }).some((step) => step.eventId === eventId), "the seventh infrastructure NACK is still redeliverable");
        });

        const applied = await applyStreamFrame(
          store,
          { kind: EFFECT_STEP_FRAME_KIND, nodeId: "worker-a", ...envelope },
          {
            nodeId: "worker-a",
            now: NOW,
            journalOptions: { databasePath: `${home}/healthy-control-journal.sqlite` },
            directiveTargets,
          },
        );
        assert.equal(applied.applied, true, "the later healthy control applies the original obligation");
        const successAck = acks.at(-1);
        assert.equal(successAck.ok, true);
        await withJournal({ home }, async (journal) => {
          assert.equal(applyEffectAck(journal, successAck, { now: NOW }).status, "done");
          assert.equal(readEventSteps(journal, eventId)[0].status, "done");
        });
        assert.equal(readAssignment(store, "asg-retryable-nack").state, "failed");
      } finally { store.close(); }
    }),
  },
  {
    name: "effects-outbox/d3 END TO END over the real bridge door: a shipped step settles the control row through the transition and is acked",
    run: async () => withMeshAssignFixture(async ({ workspaceId, home }) => {
      await seedAssignment({ home }, {
        assignmentId: "asg-e2e",
        itemRef: "35/00",
        workspaceId,
        targetNodeId: "worker-a",
        issuer: "control-a",
        state: "running",
        assignedAt: "2026-07-31T09:00:00.000Z",
        updatedAt: "2026-07-31T09:00:00.000Z",
      });
      const { eventId } = await raiseReport({ home }, { assignmentId: "asg-e2e", state: "done", branch: "aof/mesh/35-00-asg-e2e" });

      // Ship it the way the worker does, then hand the envelope to the control's
      // own frame door — with the connection's authenticated identity.
      const envelope = await withJournal({ home }, async (journal) => {
        const control = acceptingControl();
        await drainOutbox({ journal, send: control.send, now: NOW, eventId });
        return control.seen[0];
      });
      assert.ok(envelope, "the worker shipped one envelope");

      const sent = [];
      const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
      try {
        const result = await applyStreamFrame(store, { kind: EFFECT_STEP_FRAME_KIND, nodeId: "worker-a", ...envelope }, {
          nodeId: "worker-a",
          now: NOW,
          journalOptions: { env: { AOF_GLOBAL_HOME: home } },
          directiveTargets: { get: () => ({ fake: true }), send: () => ({ sent: true }) },
          sendDirective: (_targets, _to, frame) => { sent.push(frame); return { sent: true }; },
        });
        assert.equal(result.applied, true, "the control node applied the bridged fact");

        const row = readAssignment(store, "asg-e2e");
        assert.equal(row.state, "done", "the assignment row settled — the fact crossed the bridge and landed");
      } finally {
        store.close();
      }
    }),
  },
  {
    name: "effects-outbox/d3 the bridge door is GUARDED: an unknown event, an undeclared reactor, and a non-holder are each refused with a code — the transition's rules apply to a bridged fact",
    run: async () => withMeshAssignFixture(async ({ workspaceId, home }) => {
      await seedAssignment({ home }, {
        assignmentId: "asg-guarded",
        itemRef: "35/00",
        workspaceId,
        targetNodeId: "worker-a",
        issuer: "control-a",
        state: "running",
        assignedAt: "2026-07-31T09:00:00.000Z",
        updatedAt: "2026-07-31T09:00:00.000Z",
      });
      const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
      const options = {
        now: NOW,
        journalOptions: { env: { AOF_GLOBAL_HOME: home } },
        directiveTargets: { get: () => ({ fake: true }) },
      };
      try {
        const unknownEvent = await applyStreamFrame(store, {
          kind: EFFECT_STEP_FRAME_KIND, nodeId: "worker-a", eventId: "e1", reactorKey: "settle-assignment", name: "not.an.event", payload: {},
        }, { ...options, nodeId: "worker-a" });
        assert.equal(unknownEvent.code, "effect-step-unknown-event", "a name outside the closed vocabulary is refused, never guessed at");

        const unknownReactor = await applyStreamFrame(store, {
          kind: EFFECT_STEP_FRAME_KIND, nodeId: "worker-a", eventId: "e2", reactorKey: "not-a-reactor", name: "assignment.reported", payload: {},
        }, { ...options, nodeId: "worker-a" });
        assert.equal(unknownReactor.code, "effect-step-unknown-reactor", "a reactor this build does not declare is refused (mixed-version fleet)");

        // The holder guard: worker-b ships a fact about worker-a's assignment.
        const notHolder = await applyStreamFrame(store, {
          kind: EFFECT_STEP_FRAME_KIND, nodeId: "worker-b", eventId: "e3", reactorKey: "settle-assignment", name: "assignment.reported",
          payload: { assignmentId: "asg-guarded", state: "done" },
        }, { ...options, nodeId: "worker-b" });
        assert.equal(notHolder.applied, false, "a non-holder cannot settle another node's assignment through the bridge");
        assert.equal(notHolder.code, "assignment-status-not-holder", "and the refusal is the transition's own code — one rule, both doors");
        assert.equal(readAssignment(store, "asg-guarded").state, "running", "the row is untouched");
      } finally {
        store.close();
      }
    }),
  },
  {
    name: "effects-outbox/d3 a control-node process runs the same step IN PLACE — the locus decides, not the code path",
    run: async () => withMeshAssignFixture(async ({ workspaceId, home }) => {
      await seedAssignment({ home }, {
        assignmentId: "asg-local",
        itemRef: "35/00",
        workspaceId,
        targetNodeId: "control-a",
        issuer: "control-a",
        state: "running",
        assignedAt: "2026-07-31T09:00:00.000Z",
        updatedAt: "2026-07-31T09:00:00.000Z",
      });
      const { eventId } = await raiseReport({ home }, { assignmentId: "asg-local", state: "failed" });
      const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
      try {
        await withJournal({ home }, async (journal) => {
          const outcomes = await drainEffects({
            journal,
            eventId,
            loci: CONTROL_LOCI,
            now: NOW,
            ctx: { store, now: NOW, journalOptions: { env: { AOF_GLOBAL_HOME: home } } },
          });
          assert.equal(outcomes[0].status, "done", "with control-store reachable, the very same step just runs");
          assert.equal(readEventSteps(journal, eventId)[0].status, "done");
        });
        assert.equal(readAssignment(store, "asg-local").state, "failed");
      } finally {
        store.close();
      }
    }),
  },
  {
    name: "effects-outbox/d3 the frame kinds have ONE home — worker and control import the same literals",
    run: async () => {
      assert.equal(EFFECT_STEP_FRAME_KIND, "effect-step");
      assert.equal(EFFECT_ACK_FRAME_KIND, "effect-ack");
      // Both sides import them rather than re-spelling (the WORKTREE_CONTENT_FRAME_KIND
      // discipline); the arch gate proves the import, this proves the values.
      const { readFile } = await import("node:fs/promises");
      const url = await import("node:url");
      const path = await import("node:path");
      const src = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..", "..", "packages", "core", "src");
      for (const file of ["worker-stream-client.mjs", "control-stream-server.mjs"]) {
        const source = await readFile(path.join(src, "application/bindings", file), "utf8");
        assert.ok(
          /from\s+["']@aof\/mesh\/effect-frames["']/.test(source),
          `${file} imports the frame kinds from their one home`,
        );
      }
    },
  },
  ...workerAskControlTests(),
];

// ── milestone 131 / story 12, tasks 01-03 — THE CONTROL KEEPS, POSTS AND SHOWS A WORKER'S ASK
// (ADR-010 §3-§6). One park fact, raised the way a worker raises it and applied IN PLACE through the
// real `settle-assignment` reactor (the locus decides, as the case above shows), with `notify`
// observed through a fake fetch counting POSTs. The control's checkout of the workspace is the
// fixture's own repo, registered as its descriptor, with `discord` enabled. Built inside a hoisted
// function so the array above can spread it without a TDZ.
function workerAskControlTests() {
  const TOKEN = "MTIzNDU2Nzg5MDEyMzQ1Njc4.AbCdEf.workerAskSecretSegment01";
  const CHANNEL = "123456789012345678";
  const WORKER = "node-2976";
  const ASK = Object.freeze({ question: "Decision needed: split 35/00?", phase: "build", askedAt: "2026-07-31T09:48:00.000Z" });

  async function withWorkerAskWorld(body, { descriptor = true } = {}) {
    return withMeshAssignFixture(async (fx) => {
      const { home, root, workspaceId } = fx;
      const config = { name: "demo", work: { dir: "./wiki/work", notify: { channels: { discord: { type: "discord", channelId: CHANNEL } } } }, mesh: { nodeId: "control-a" } };
      await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
      const env = { AOF_GLOBAL_HOME: home };
      if (descriptor) {
        const store = await openGlobalWorkProjectionStore({ env });
        try {
          store.db.prepare("INSERT INTO global_workspace_descriptors (workspace_id, project_root, work_dir, descriptor_path) VALUES (?, ?, ?, ?)")
            .run(workspaceId, root, path.join(root, "wiki", "work"), path.join(root, ".aof", "descriptor.json"));
        } finally {
          store.close();
        }
      }
      await seedAssignment({ home }, {
        assignmentId: "asg-ask", itemRef: "35/00", workspaceId, targetNodeId: WORKER, issuer: "control-a",
        state: "running", runId: "run-ask", assignedAt: "2026-07-31T09:00:00.000Z", updatedAt: "2026-07-31T09:00:00.000Z",
      });
      const posts = [];
      const fetch = async (url, init) => {
        posts.push({ url, body: JSON.parse(init.body) });
        return { status: 200, headers: { get: () => "application/json" }, json: async () => ({ id: "990000000000000001" }) };
      };
      // Raises the worker's report and applies it in place through the control reactor.
      const apply = async (report) => {
        const { eventId } = await raiseReport({ home }, { assignmentId: "asg-ask", runId: "run-ask", ...report });
        const store = await openGlobalWorkProjectionStore({ env });
        try {
          await withJournal({ home }, (journal) => drainEffects({
            journal, eventId, loci: CONTROL_LOCI, now: NOW,
            ctx: { store, now: NOW, journalOptions: { env }, globalWorkStoreOptions: { env }, notifyOptions: { env: { AOF_DISCORD_BOT_TOKEN: TOKEN }, fetch } },
          }));
        } finally {
          store.close();
        }
      };
      const raw = async () => {
        const store = await openGlobalWorkProjectionStore({ env });
        try {
          return store.db.prepare("SELECT state, code, ask FROM global_assignments WHERE assignment_id = 'asg-ask'").get();
        } finally {
          store.close();
        }
      };
      const setRow = async (fields) => {
        const store = await openGlobalWorkProjectionStore({ env });
        try {
          const keys = Object.keys(fields);
          store.db.prepare(`UPDATE global_assignments SET ${keys.map((key) => `${key} = ?`).join(", ")} WHERE assignment_id = 'asg-ask'`).run(...keys.map((key) => fields[key]));
        } finally {
          store.close();
        }
      };
      const overlay = async () => (await readExecutionOverlay(fx.workspace, { globalWorkStoreOptions: { env } })).get("35/00");
      return body({ ...fx, env, posts, apply, raw, setRow, overlay });
    });
  }
  const PARK = Object.freeze({ state: "running", code: "needs-input", sessionId: "sess-ask" });

  return [
    {
      name: "131/12 task01 — a park fact's ask lands on the row as JSON, and the execution overlay carries it",
      run: async () => withWorkerAskWorld(async ({ apply, raw, overlay }) => {
        await apply({ ...PARK, ask: ASK });
        assert.deepEqual(JSON.parse((await raw()).ask), ASK, "the row's ask column holds that object as JSON");
        assert.deepEqual((await overlay()).ask, ASK, "the overlay for 35/00 carries it");
      }),
    },
    {
      name: "131/12 task01 — when the overlay carries the ask (three rows), and a park with no ask leaves the column alone",
      run: async () => withWorkerAskWorld(async ({ apply, setRow, raw, overlay }) => {
        await apply({ ...PARK, ask: ASK });
        for (const [label, fields, present] of [
          ["running, needs-input", { state: "running", code: "needs-input" }, true],
          ["running, resumed", { state: "running", code: "resumed" }, false],
          ["done", { state: "done", code: null }, false],
        ]) {
          await setRow(fields);
          const execution = await overlay();
          assert.equal(Object.hasOwn(execution, "ask"), present, `${label}: ${present ? "the parsed object" : "absent"}`);
          if (present) assert.deepEqual(execution.ask, ASK, label);
        }
        await setRow({ state: "running", code: "resumed" });
        await apply({ ...PARK });
        assert.deepEqual(JSON.parse((await raw()).ask), ASK, "a park with no ask leaves the earlier question");
      }),
    },
    {
      name: "131/12 task01 — an unparseable ask column projects ask: null after one assignment-ask-unreadable",
      run: async () => withWorkerAskWorld(async ({ setRow, overlay }) => {
        const events = [];
        setDegradeSinkForTest(() => ({ write: (event) => events.push(event) }));
        try {
          await setRow({ state: "running", code: "needs-input", session_id: "sess-ask", ask: "{not json" });
          assert.equal((await overlay()).ask, null);
          assert.equal(events.filter((event) => event.code === "assignment-ask-unreadable").length, 1);
        } finally {
          setDegradeSinkForTest(undefined);
        }
      }),
    },
    {
      name: "131/12 task01 — an older store gains the ask column without losing a row, and opening it again changes nothing",
      run: async () => withMeshAssignFixture(async ({ home, workspaceId }) => {
        const env = { AOF_GLOBAL_HOME: home };
        for (const id of ["asg-1", "asg-2", "asg-3"]) {
          await seedAssignment({ home }, { assignmentId: id, itemRef: "35/00", workspaceId, targetNodeId: WORKER, issuer: "control-a", state: "running", assignedAt: NOW, updatedAt: NOW });
        }
        const old = await openGlobalWorkProjectionStore({ env });
        let before;
        try {
          old.db.exec("ALTER TABLE global_assignments DROP COLUMN ask");
          old.db.prepare("UPDATE aof_schema SET value = 9 WHERE key = 'version'").run();
          before = old.db.prepare("SELECT * FROM global_assignments ORDER BY assignment_id").all();
        } finally {
          old.close();
        }
        for (const pass of ["first", "second"]) {
          const store = await openGlobalWorkProjectionStore({ env });
          try {
            const columns = store.db.prepare("PRAGMA table_info(global_assignments)").all().map((column) => column.name);
            assert.ok(columns.includes("ask"), `${pass}: the ask column exists`);
            const rows = store.db.prepare("SELECT * FROM global_assignments ORDER BY assignment_id").all().map(({ ask, ...rest }) => rest);
            assert.deepEqual(rows, before.map((row) => ({ ...row })), `${pass}: the three rows are unchanged`);
            assert.equal(Number(store.db.prepare("SELECT value FROM aof_schema WHERE key = 'version'").get().value), 10);
          } finally {
            store.close();
          }
        }
      }),
    },
    {
      name: "131/12 task02 — a worker's ask is posted once, by the control, naming the worker's node, with the question as its body",
      run: async () => withWorkerAskWorld(async ({ apply, posts }) => {
        await apply({ ...PARK, ask: ASK });
        assert.equal(posts.length, 1, "exactly one POST");
        const [line1, body] = posts[0].body.content.split("\n");
        // 131/13: line 1 names the control's project (`demo`), then the worker's node.
        assert.equal(line1, `**35/00 — waiting on you** (build, 12m) · demo · ${WORKER}`);
        assert.equal(body, ASK.question);
        assert.ok(posts[0].url.endsWith(`/channels/${CHANNEL}/messages`));
      }),
    },
    {
      name: "131/12 task02 — when the control posts (four rows): only on the edge into needs-input",
      run: async () => {
        for (const [label, before, report, posted] of [
          ["null, a park", null, { ...PARK, ask: ASK }, 1],
          ["resumed, a re-ask", "resumed", { ...PARK, ask: ASK }, 1],
          ["needs-input, the park redelivered", "needs-input", { ...PARK, ask: ASK }, 0],
          ["null, a done fact", null, { state: "done" }, 0],
        ]) {
          await withWorkerAskWorld(async ({ apply, setRow, posts }) => {
            if (before != null) await setRow({ code: before, session_id: "sess-ask" });
            await apply(report);
            assert.equal(posts.length, posted, label);
          });
        }
      },
    },
    {
      name: "131/12 task02 — no checkout, no post: one worker-ask-unannounced names the workspace, and the row still parks",
      run: async () => withWorkerAskWorld(async ({ apply, posts, raw, workspaceId }) => {
        const events = [];
        setDegradeSinkForTest(() => ({ write: (event) => events.push(event) }));
        try {
          await apply({ ...PARK, ask: ASK });
          assert.equal(posts.length, 0, "no POST");
          const unannounced = events.filter((event) => event.code === "worker-ask-unannounced");
          assert.equal(unannounced.length, 1);
          assert.match(unannounced[0].message, new RegExp(workspaceId, "u"));
          assert.equal((await raw()).code, "needs-input");
        } finally {
          setDegradeSinkForTest(undefined);
        }
      }, { descriptor: false }),
    },
    {
      name: "131/12 task02 — a local ask keeps its own node: with no fields.node the envelope's node is config.mesh.nodeId",
      run() {
        assert.equal(buildNotifyEnvelope("session-needs-input", { ref: "131/03" }, { config: { mesh: { nodeId: "node-7297" } } }).node, "node-7297");
        assert.equal(buildNotifyEnvelope("session-needs-input", { ref: "131/03", node: WORKER }, { config: { mesh: { nodeId: "node-7297" } } }).node, WORKER);
      },
    },
    {
      name: "131/12 task03 — the board's worker ask (two rows): the row's question, phase and instant, or today's null question",
      run: async () => {
        for (const [label, withAsk] of [["the column set", true], ["absent", false]]) {
          await withWorkerAskWorld(async ({ apply, workspace, env }) => {
            await apply(withAsk ? { ...PARK, ask: ASK } : { ...PARK });
            const { invoke } = await import("../../packages/core/src/command-core.mjs");
            const rows = await invoke("work:list", { mesh: true }, { workspace, globalWorkStoreOptions: { env } });
            const ask = rows.find((row) => row.ref === "35/00")?.ask;
            assert.ok(ask != null, `${label}: the row carries an ask`);
            assert.equal(ask.local, false, label);
            assert.equal(ask.node, WORKER, label);
            if (withAsk) {
              assert.deepEqual({ question: ask.question, phase: ask.phase, askedAt: ask.askedAt }, ASK, label);
            } else {
              assert.deepEqual({ question: ask.question, phase: ask.phase }, { question: null, phase: null }, label);
              assert.equal(ask.askedAt, NOW, `${label}: askedAt is the row's updatedAt`);
            }
          });
        }
      },
    },
  ];
}
