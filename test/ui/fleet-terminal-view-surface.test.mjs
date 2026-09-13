// test/ui/fleet-terminal-view-surface.test.mjs — traceability for milestone 38 /
// story 06 / task 04 (tasks/04_bug-fleet-terminal-view-surface.feature; BLOCKER
// F-38.06c). ARCHITECTURE ADR-013 (the `session_id` join key) + ADR-014 (the
// read-only mirror, routed by (nodeId, sessionId)); DESIGN §Surface 3 (V1-V9 + the
// States table); SECURITY T14.
//
// THE THREE-LINK CHAIN this task closes:
//   (1) PERSIST — the worker already SENDS its captured session id on the
//       assignment-status frame; the control node read only `runId` off it and
//       `global_assignments` had no session_id column, so the join key was dropped
//       on the floor.
//   (2) SURFACE — `projectAssignment` carried eight keys, none of them the session
//       id, so `/api/mesh/status` could not express which stream a card opens.
//   (3) RENDER — there was no `ui/` terminal-view consumer at all.
//
// PRODUCER-FED OR IT IS NOT EVIDENCE (ADR-008 — this milestone's defining lesson,
// earned seven times). The persist + surface lanes drive the REAL
// `control-stream-server` frame handler (`applyStreamFrame`) over a REAL
// AOF_GLOBAL_HOME-isolated SQLite store, with the frame built by the REAL
// `buildAssignmentStatusFrame` the worker's own `sendAssignmentStatus` calls, and
// read the REAL `/api/mesh/status` shaping (`queryGlobalMeshStatus`) — never a
// hand-built assignment row asserted against itself. The render lanes drive the
// framework-free `.mjs` helpers `FleetTerminalView.tsx` ITSELF imports (the
// ui/src/board/terminal/*.mjs + test/session/terminal-dock.test.mjs house precedent) —
// headless, no browser — and the multiplex lane drives BOTH resolved URLs into the
// REAL serveMeshUi `/ws/terminal-view` route over the REAL in-memory mirror.
//
// The ON-SCREEN render is judged at the design-conformance gate against §Surface 3;
// the live cross-machine stream stays task 03's @manual soak.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, rm, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket } from "ws";

import { applyStreamFrame } from "../../src/control-stream-server.mjs";
import { buildAssignmentStatusFrame } from "../../src/worker-stream-client.mjs";
// m49/00 — `listAllAssignments` is the SHARED reader `shapeGlobalStatus` itself
// threads through (global-mesh-query.mjs), so scenario 1 pins the mapper's output
// at the exact seam the fleet shaping consumes, not at a lookalike.
import { readAssignment, listAllAssignments } from "../../src/assignment-record.mjs";
import { openGlobalWorkProjectionStore } from "../../src/global-work-store.mjs";
import { queryGlobalMeshStatus } from "../../src/global-mesh-query.mjs";
import { globalMeshPaths } from "../../src/workspace.mjs";
import { serveMeshUi, meshUiDist } from "../../src/mesh/ui-serve.mjs";
import { createTerminalMirror } from "../../src/mesh/terminal-mirror.mjs";
import { buildTerminalFrameEnvelope } from "../../src/mesh/terminal-relay-bridge.mjs";
import { withMeshAssignFixture, seedAssignment, seedTargetNode } from "../support/mesh-assign-fixture.mjs";
// m49/00 scenario 2 — the NODE attachment needs a node that survives the REAL
// registry read, and `seedTargetNode`'s direct-SQL row does not: `queryGlobalRegistry`
// silently drops a `global_nodes` row whose descriptor FILE does not resolve (the
// asymmetry test/support/mesh-ui-assign-fixture.mjs documents at `dropNodeFromRoster`).
// A node published through these two REAL doors is genuinely on the wire.
import { publishNodeRecord } from "../../src/mesh/store.mjs";
import { publishGlobalRegistryDescriptorsToStore } from "../../src/global-node-registry.mjs";

// ═══ RE-POINTED BY MILESTONE 46 / STORY 04, IN THE DIFF THAT DELETED THE MODULES ═════════════
// `ui/src/fleet/terminal-view/` is gone. Its four behaviours went to two homes, and WHICH home
// is the milestone's own argument:
//   · FLEET-DOMAIN (they read `assignment.targetNodeId` / the m35 assignment chip) →
//     `ui/src/fleet/terminal-mount.mjs`: `resolveTerminalStream`, `NO_STREAM`,
//     `terminalAssignmentReason`;
//   · NOT fleet-domain → the SHARED core the board mounts too: the multiplex key is
//     `terminalPaneKey` (keyed on the SOURCE's declared params rather than on one surface's
//     tuple), V1's "a terminal with no visible owner is never rendered" is
//     `terminalPaneIdentity` returning `{ rendered: false, reason }`, the URL is
//     `terminalSocketUrl`, and the ramp is the merged one.
//
// EVERY ASSERTION BELOW SURVIVES THE MOVE, because every DISTINCTION it asserts survived the
// merge. Three spellings changed and all three are DESIGN rulings, not relaxations:
//   1. `disconnected` retires as a STATE WORD and becomes the mandatory CAUSE LINE on `error` —
//      a refused spawn on a healthy socket is not a disconnection, so `error` is the superset,
//      and it is only safe BECAUSE the cause is mandatory;
//   2. the descriptor's `token` (a theme-token NAME the component mapped to classes itself) is
//      replaced by `dotClass` + `labelClass` — the map moved INTO the shared set, so two
//      surfaces cannot map the same token differently;
//   3. a view is BOUND (`connecting`) before a byte can reach it; the fleet ramp used to start at
//      `waiting for output` before the socket was open.
import {
  resolveTerminalStream,
  terminalAssignmentReason,
  fleetTerminalMount,
  NO_STREAM,
} from "../../ui/src/fleet/terminal-mount.mjs";
import { sessionSourceFor } from "../../ui/src/terminal/source-table.mjs";
import { terminalSocketUrl } from "../../ui/src/terminal/socket-url.mjs";
import { terminalPaneIdentity, terminalPaneKey } from "../../ui/src/terminal/pane-identity.mjs";
import {
  bindSource,
  applyTerminalEvent,
  describeTerminalState,
  TERMINAL_EVENTS,
  TERMINAL_STATES,
  TRANSPORT_CAUSE_LINE,
} from "../../ui/src/terminal/state-ramp.mjs";
import {
  TERMINAL_DOT_CLASS_DESTRUCTIVE,
  TERMINAL_DOT_CLASS_MUTED,
  TERMINAL_LABEL_CLASS_FAILURE,
} from "../../ui/src/terminal/palette.mjs";

const NOW = "2026-07-23T10:00:00.000Z";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TERMINAL_DIR = path.join(repoRoot, "ui", "src", "terminal");
const TERMINAL_CONTROL = path.join(TERMINAL_DIR, "TerminalControl.tsx");

// The terminal surface is several components (the control, the identity chip, the byte
// area, the fullscreen occupant). A claim about what the SURFACE renders is measured over
// all of them, so moving a render between components is not a violation and deleting it is.
async function terminalTsxFiles() {
  const files = (await readdir(TERMINAL_DIR)).filter((name) => name.endsWith(".tsx")).sort();
  assert.ok(files.length > 0, `the sweep of ${TERMINAL_DIR} found no .tsx component — a walk whose subject set empties must FAIL naming the directory (119/ADR-003 §4)`);
  return files;
}
async function terminalSurfaceSource() {
  const files = await terminalTsxFiles();
  const parts = await Promise.all(files.map((name) => readFile(path.join(TERMINAL_DIR, name), "utf8")));
  return lf(parts.join("\n"));
}
// Every site that renders the non-live bar, keyed on the flag that DECIDES it renders.
async function terminalBarSites() {
  const sites = [];
  for (const name of await terminalTsxFiles()) {
    const text = lf(await readFile(path.join(TERMINAL_DIR, name), "utf8"));
    for (const match of text.matchAll(/descriptor\.showsBar[\s\S]{0,1200}?className=\{cn\(([^)]*)\)\}/g)) {
      sites.push({ file: name, className: match[1] });
    }
  }
  return sites;
}
// m49/00 scenario 6 — the browser's own declaration of this wire (the OTHER half
// of the same contract, asserted by a file's content and a build's exit code).
const FLEET_API_TS = path.join(repoRoot, "ui", "src", "fleet", "api.ts");

// The `mirror` descriptor — the ONE source a fleet card mounts, taken as a WHOLE ROW off the
// frozen table (never assembled: `acd-terminal-control-boundary`'s call-site ratchet refuses it).
const MIRROR = sessionSourceFor("mirror").source;

// The four ramp calls and the two header helpers this suite used to import, expressed against
// their new homes so every lane below reads exactly as it did.
const TERMINAL_VIEW_STATES = {
  WAITING: TERMINAL_STATES.WAITING,
  STREAMING: TERMINAL_STATES.STREAMING,
  ENDED: TERMINAL_STATES.ENDED,
  DISCONNECTED: TERMINAL_STATES.ERROR,
};
// SUBSCRIBED AND OPEN, with no byte yet — the fleet ramp's `waiting`. It takes two steps now
// because it takes two FACTS: `connecting` is "the transport is not yet established" and
// `waiting` is "it IS established and nothing has been said". The predecessor collapsed them and
// asserted the second before the first was true.
const initialTerminalViewState = () => applyTerminalEvent(bindSource(), TERMINAL_EVENTS.SOCKET_OPEN);
const terminalViewOnBytes = (current) => applyTerminalEvent(current, TERMINAL_EVENTS.BYTES);
const terminalViewOnClose = (current) => applyTerminalEvent(current, TERMINAL_EVENTS.CLOSE);
const terminalViewOnError = (current) => applyTerminalEvent(current, TERMINAL_EVENTS.TRANSPORT_FAILURE);
// The fleet's assignment-derived wording is INJECTED as a `reason` STRING (ADR-005): the shared
// describer computes no assignment state of its own, and this call is the injection.
const describeTerminalViewState = (current, { assignment } = {}) =>
  describeTerminalState(current, { reason: terminalAssignmentReason(assignment), owner: "38/06" });
const terminalStreamKey = (nodeId, sessionId) => terminalPaneKey(MIRROR, { nodeId, sessionId });
const terminalViewSocketUrl = (stream, { host } = {}) =>
  stream?.resolved === true
    ? terminalSocketUrl(MIRROR, { nodeId: stream.nodeId, sessionId: stream.sessionId }, { origins: { fleet: `http://${host}` } }).url
    : null;
// V1's structural guard, in its new shape: `{ rendered: false }` instead of `null`. The header
// MODEL that survived (`label`, `sessionLabel`, `readOnlyLabel`) is composed from the identity
// plus the read-only posture the fleet's own mount declares.
function terminalStreamHeader(stream, { itemRef, assignmentId } = {}) {
  const mount = fleetTerminalMount(
    stream?.resolved === true ? { targetNodeId: stream.nodeId, sessionId: stream.sessionId } : null,
    { itemRef, assignmentId },
  );
  if (!mount.rendersPanel) return null;
  const identity = terminalPaneIdentity({ source: MIRROR, params: mount.params, ref: mount.ref, farEnd: mount.farEnd });
  if (!identity.rendered) return null;
  return {
    ref: identity.ref,
    nodeId: mount.params.nodeId,
    sessionId: mount.params.sessionId,
    key: identity.key,
    label: identity.label,
    sessionLabel: `session ${mount.params.sessionId}`,
    readOnlyLabel: "read-only",
  };
}

// lf(source) — CRLF-normalise before ANY cross-file text comparison (the normaliser
// every arch test in this repo already carries; added here at the architect's N6,
// 2026-07-23). This tree is MIXED: `ui/src/board/TerminalDock.tsx` is CRLF and
// `ui/src/fleet/terminal-view/FleetTerminalView.tsx` is LF, so the theme/font
// comparisons below were comparing raw bytes ACROSS line-ending regimes — green
// today only because both matches happen to be single-line. Reformat either
// declaration onto multiple lines and the lane fails on line endings ALONE, which
// is this milestone's own recurring bite (a needle that silently no-ops).
function lf(source) {
  return String(source).replace(/\r\n/g, "\n");
}

async function withStore({ home }, fn) {
  const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
  try {
    return await fn(store);
  } finally {
    store.close();
  }
}

// The m35 projected-assignment key set, in order — the eight keys that existed
// BEFORE this task. Every one must keep its meaning (and its place) byte-for-byte:
// this thread is ADDITIVE only.
const PRE_EXISTING_PROJECTED_KEYS = [
  "assignmentId", "state", "targetNodeId", "issuer", "runId", "assignedAt", "updatedAt", "reclaimedAt",
];

export const fleetTerminalViewSurfaceTests = [
  // ═══════════════════════════════════════════════════════════════════════════
  // LINK 1 — PERSIST. "the session_id a worker reports on its assignment-status
  // frame is PERSISTED on the assignment record"
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "task04/38-06 the session id a worker reports on its assignment-status frame is PERSISTED on the assignment record, verbatim across a re-read",
    async run() {
      await withMeshAssignFixture(async ({ workspaceId, home }) => {
        // Given an assignment row held by node "node-a".
        await seedAssignment({ home }, {
          assignmentId: "asg-1", itemRef: "35/00", workspaceId,
          targetNodeId: "node-a", issuer: "control-a", state: "accepted", assignedAt: NOW,
        });

        // When the worker sends an assignment-status frame carrying its captured
        // session id "sess-1" — the REAL frame builder the worker's own
        // sendAssignmentStatus() calls, over the REAL control-side frame handler.
        await withStore({ home }, async (store) => {
          const frame = buildAssignmentStatusFrame("node-a", "asg-1", "running", {
            runId: "run-7", sessionId: "sess-1", now: NOW,
          });
          assert.equal(frame.sessionId, "sess-1", "the REAL worker frame builder does carry the session id");
          const result = await applyStreamFrame(store, frame, { now: NOW, nodeId: "node-a" });
          assert.equal(result.applied, true, "the real handler applied the frame");

          // Then the stored assignment row carries that session id — no longer
          // dropped at the frame handler.
          const record = readAssignment(store, "asg-1");
          assert.equal(record.sessionId, "sess-1", "the session id is persisted on the assignment record");
          assert.equal(record.runId, "run-7", "the pre-existing run link is untouched");
          assert.equal(record.state, "running");
        });

        // And re-reading the row returns it verbatim, so the join key survives a
        // control-node restart — a SEPARATE store open over the SAME database file
        // (the store above was closed), i.e. a genuine reopen, not a cache read.
        await withStore({ home }, async (store) => {
          const reread = readAssignment(store, "asg-1");
          assert.equal(reread.sessionId, "sess-1", "the session id survives a control-node restart (a fresh store open)");
        });
      });
    },
  },
  {
    name: "task04/38-06 an assignment-status frame carrying NO session id leaves a previously-captured value intact — absent is not a clear",
    async run() {
      await withMeshAssignFixture(async ({ workspaceId, home }) => {
        await seedAssignment({ home }, {
          assignmentId: "asg-1", itemRef: "35/00", workspaceId,
          targetNodeId: "node-a", issuer: "control-a", state: "accepted", assignedAt: NOW,
        });
        await withStore({ home }, async (store) => {
          await applyStreamFrame(
            store,
            buildAssignmentStatusFrame("node-a", "asg-1", "running", { runId: "run-7", sessionId: "sess-1", now: NOW }),
            { now: NOW, nodeId: "node-a" },
          );

          // A later terminal-state frame carries NO sessionId (the real builder
          // OMITS the key when none is supplied — the conditional-inclusion shape).
          const done = buildAssignmentStatusFrame("node-a", "asg-1", "done", { now: NOW });
          assert.equal(Object.prototype.hasOwnProperty.call(done, "sessionId"), false, "the real builder omits sessionId when the worker supplies none");
          const result = await applyStreamFrame(store, done, { now: NOW, nodeId: "node-a" });
          assert.equal(result.applied, true);

          const record = readAssignment(store, "asg-1");
          assert.equal(record.state, "done");
          assert.equal(record.sessionId, "sess-1", "the previously-captured session id is NOT cleared by a frame that simply does not mention it");
          assert.equal(record.runId, "run-7", "and the run link keeps the same absent-is-not-a-clear discipline");
        });
      });
    },
  },
  {
    name: "task04/38-06 a PRE-EXISTING database with no session_id column is migrated IN PLACE (idempotent) — never recreated, never wiped",
    async run() {
      const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-session-id-migration-"));
      const home = path.join(tmp, "home");
      try {
        const paths = globalMeshPaths({ env: { AOF_GLOBAL_HOME: home } });
        await mkdir(paths.workRoot, { recursive: true });

        // Build a PRE-EXISTING database the way a real machine already has one:
        // the schema-v4 `global_assignments` shape WITHOUT session_id, carrying a
        // live dispatch row (assignment rows are operator/worker-CREATED state —
        // unrecoverable if a "migration" recreated the table).
        const { DatabaseSync } = await import("node:sqlite");
        const legacy = new DatabaseSync(paths.databasePath);
        legacy.exec(`
          CREATE TABLE aof_schema (key TEXT PRIMARY KEY, value INTEGER NOT NULL);
          INSERT INTO aof_schema (key, value) VALUES ('version', 4);
          CREATE TABLE global_assignments (
            assignment_id TEXT PRIMARY KEY,
            item_ref TEXT NOT NULL,
            workspace_id TEXT NOT NULL,
            target_node_id TEXT NOT NULL,
            issuer TEXT NOT NULL,
            state TEXT NOT NULL,
            run_id TEXT,
            assigned_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            reclaimed_at TEXT
          );
          INSERT INTO global_assignments
            (assignment_id, item_ref, workspace_id, target_node_id, issuer, state, run_id, assigned_at, updated_at, reclaimed_at)
          VALUES ('legacy-1', '35/00', 'ws-legacy', 'node-a', 'control-a', 'running', 'run-legacy', '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z', NULL);
        `);
        const legacyColumns = legacy.prepare("PRAGMA table_info(global_assignments)").all().map((c) => c.name);
        assert.equal(legacyColumns.includes("session_id"), false, "the pre-existing database genuinely lacks the column (the migration has something to do)");
        legacy.close();

        // Opening through the REAL store migrates in place.
        await withStore({ home }, async (store) => {
          const columns = store.db.prepare("PRAGMA table_info(global_assignments)").all().map((c) => c.name);
          assert.ok(columns.includes("session_id"), "the pre-existing database gained the session_id column");

          const row = store.db.prepare("SELECT * FROM global_assignments WHERE assignment_id = 'legacy-1'").get();
          assert.ok(row, "the pre-existing dispatch row SURVIVED — the table was altered, not recreated");
          assert.equal(row.state, "running");
          assert.equal(row.run_id, "run-legacy");
          assert.equal(row.target_node_id, "node-a");
          assert.equal(row.assigned_at, "2026-07-01T00:00:00.000Z");
          assert.equal(row.session_id, null, "an un-captured session id reads null — no fabricated backfill");

          // And the REAL frame handler can now capture into the migrated table.
          await applyStreamFrame(
            store,
            buildAssignmentStatusFrame("node-a", "legacy-1", "running", { sessionId: "sess-legacy", now: NOW }),
            { now: NOW, nodeId: "node-a" },
          );
          assert.equal(readAssignment(store, "legacy-1").sessionId, "sess-legacy");
        });

        // IDEMPOTENT: a second (and third) open of the ALREADY-migrated database
        // neither throws nor disturbs the row.
        await withStore({ home }, async (store) => {
          const columns = store.db.prepare("PRAGMA table_info(global_assignments)").all().map((c) => c.name);
          assert.equal(columns.filter((name) => name === "session_id").length, 1, "re-opening adds the column exactly once");
          assert.equal(readAssignment(store, "legacy-1").sessionId, "sess-legacy", "the captured value survives the re-open");
        });
      } finally {
        await rm(tmp, { recursive: true, force: true });
      }
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LINK 2 — SURFACE. "the assignment projection SURFACES the session id, so a
  // card can resolve its stream"
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "task04/38-06 the REAL /api/mesh/status shaping surfaces the session id alongside the target node id — ADDITIVE only, absent (never an empty string) when uncaptured",
    async run() {
      await withMeshAssignFixture(async ({ workspace, workspaceId, home, root }) => {
        const env = { AOF_GLOBAL_HOME: home };
        await seedTargetNode({ home }, { nodeId: "node-a", workspaceId, projectRoot: root, workDir: path.join(root, "wiki", "work") });
        // TWO assignments: one whose worker HAS captured a session, one whose
        // worker has not yet.
        await seedAssignment({ home }, {
          assignmentId: "asg-1", itemRef: "35/00", workspaceId,
          targetNodeId: "node-a", issuer: "control-a", state: "accepted", assignedAt: NOW,
        });
        await seedAssignment({ home }, {
          assignmentId: "asg-2", itemRef: "35", workspaceId,
          targetNodeId: "node-a", issuer: "control-a", state: "assigned", assignedAt: NOW,
        });

        await withStore({ home }, async (store) => {
          await store.publishWorkspaceSnapshot(workspace, { workspaceId });
          // Given an assignment row whose session id has been captured — by the
          // REAL frame handler, over the REAL worker frame.
          await applyStreamFrame(
            store,
            buildAssignmentStatusFrame("node-a", "asg-1", "running", { runId: "run-7", sessionId: "sess-1", now: NOW }),
            { now: NOW, nodeId: "node-a" },
          );
        });

        // When the fleet status payload is shaped — the REAL /api/mesh/status read.
        const status = await queryGlobalMeshStatus({ env, now: NOW });
        const captured = status.items.find((item) => item.ref === "35/00");
        const uncaptured = status.items.find((item) => item.ref === "35");
        assert.ok(captured?.assignment, "the item row still carries its assignment");
        assert.ok(uncaptured?.assignment, "the second item row still carries its assignment");

        // Then that assignment's projected row carries the session id alongside
        // its target node id.
        assert.equal(captured.assignment.sessionId, "sess-1");
        assert.equal(captured.assignment.targetNodeId, "node-a");

        // And every pre-existing projected key keeps its meaning byte-for-byte —
        // ADDITIVE only (same keys, same order, same values; sessionId appended).
        assert.deepEqual(
          Object.keys(captured.assignment).slice(0, PRE_EXISTING_PROJECTED_KEYS.length),
          PRE_EXISTING_PROJECTED_KEYS,
          "the eight pre-existing projected keys keep their identity AND their order",
        );
        assert.equal(captured.assignment.assignmentId, "asg-1");
        assert.equal(captured.assignment.state, "running");
        assert.equal(captured.assignment.issuer, "control-a");
        assert.equal(captured.assignment.runId, "run-7");
        assert.equal(captured.assignment.assignedAt, NOW);
        assert.equal(captured.assignment.reclaimedAt, null);

        // And an assignment with no session id yet carries no fabricated
        // placeholder — absent, not an empty string.
        assert.deepEqual(Object.keys(uncaptured.assignment), PRE_EXISTING_PROJECTED_KEYS, "the uncaptured row is exactly the pre-existing eight");
        assert.equal(Object.prototype.hasOwnProperty.call(uncaptured.assignment, "sessionId"), false, "no sessionId key at all — absent, not \"\"");
        assert.notEqual(uncaptured.assignment.sessionId, "", "and certainly never an empty-string placeholder");
      });
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LINK 3 — RENDER. "a card resolves its stream from the surfaced session_id —
  // or honestly declines to subscribe" (Scenario Outline, 4 rows)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "task04/38-06 a card resolves its stream from the REAL surfaced session_id — (node-a, sess-1) and (node-b, sess-2) each resolve to their OWN stream",
    async run() {
      await withMeshAssignFixture(async ({ workspace, workspaceId, home, root }) => {
        const env = { AOF_GLOBAL_HOME: home };
        for (const nodeId of ["node-a", "node-b"]) {
          await seedTargetNode({ home }, { nodeId, workspaceId, projectRoot: root, workDir: path.join(root, "wiki", "work") });
        }
        await seedAssignment({ home }, { assignmentId: "asg-a", itemRef: "35/00", workspaceId, targetNodeId: "node-a", issuer: "control-a", state: "accepted", assignedAt: NOW });
        await seedAssignment({ home }, { assignmentId: "asg-b", itemRef: "35", workspaceId, targetNodeId: "node-b", issuer: "control-a", state: "accepted", assignedAt: NOW });
        await withStore({ home }, async (store) => {
          await store.publishWorkspaceSnapshot(workspace, { workspaceId });
          await applyStreamFrame(store, buildAssignmentStatusFrame("node-a", "asg-a", "running", { sessionId: "sess-1", now: NOW }), { now: NOW, nodeId: "node-a" });
          await applyStreamFrame(store, buildAssignmentStatusFrame("node-b", "asg-b", "running", { sessionId: "sess-2", now: NOW }), { now: NOW, nodeId: "node-b" });
        });

        const status = await queryGlobalMeshStatus({ env, now: NOW });
        const rowA = status.items.find((item) => item.ref === "35/00").assignment;
        const rowB = status.items.find((item) => item.ref === "35").assignment;

        // | node-a | sess-1 | the (node-a, sess-1) stream |
        const streamA = resolveTerminalStream(rowA);
        assert.equal(streamA.resolved, true);
        assert.equal(streamA.nodeId, "node-a");
        assert.equal(streamA.sessionId, "sess-1");
        assert.equal(streamA.key, terminalStreamKey("node-a", "sess-1"));

        // | node-b | sess-2 | the (node-b, sess-2) stream |
        const streamB = resolveTerminalStream(rowB);
        assert.equal(streamB.resolved, true);
        assert.equal(streamB.nodeId, "node-b");
        assert.equal(streamB.sessionId, "sess-2");

        // And it NEVER subscribes to a guessed, defaulted, or sibling session
        // (ADR-014 invariant 4) — each URL carries its OWN tuple only.
        const urlA = terminalViewSocketUrl(streamA, { protocol: "http:", host: "127.0.0.1:4181" });
        const urlB = terminalViewSocketUrl(streamB, { protocol: "http:", host: "127.0.0.1:4181" });
        assert.equal(urlA, "ws://127.0.0.1:4181/ws/terminal-view?nodeId=node-a&sessionId=sess-1");
        assert.equal(urlB, "ws://127.0.0.1:4181/ws/terminal-view?nodeId=node-b&sessionId=sess-2");
        assert.ok(!urlA.includes("sess-2") && !urlB.includes("sess-1"), "neither card's subscription mentions the other's session");
      });
    },
  },
  {
    name: "task04/38-06 a card whose REAL projected assignment has no session id yet resolves to NO stream — no terminal, no socket, and never a sibling's session",
    async run() {
      await withMeshAssignFixture(async ({ workspace, workspaceId, home, root }) => {
        const env = { AOF_GLOBAL_HOME: home };
        await seedTargetNode({ home }, { nodeId: "node-a", workspaceId, projectRoot: root, workDir: path.join(root, "wiki", "work") });
        // A SIBLING assignment on the SAME node DOES have a session — the exact
        // value a "helpful" defaulting bug would borrow.
        await seedAssignment({ home }, { assignmentId: "asg-sib", itemRef: "35", workspaceId, targetNodeId: "node-a", issuer: "control-a", state: "running", assignedAt: NOW });
        await seedAssignment({ home }, { assignmentId: "asg-none", itemRef: "35/00", workspaceId, targetNodeId: "node-a", issuer: "control-a", state: "assigned", assignedAt: NOW });
        await withStore({ home }, async (store) => {
          await store.publishWorkspaceSnapshot(workspace, { workspaceId });
          await applyStreamFrame(store, buildAssignmentStatusFrame("node-a", "asg-sib", "running", { sessionId: "sess-sibling", now: NOW }), { now: NOW, nodeId: "node-a" });
        });

        const status = await queryGlobalMeshStatus({ env, now: NOW });
        const row = status.items.find((item) => item.ref === "35/00").assignment;
        assert.equal(row.assignmentId, "asg-none");

        // | node-a | absent | NO stream — the card shows no terminal, opens no socket |
        const stream = resolveTerminalStream(row);
        assert.equal(stream.resolved, false);
        assert.equal(stream.reason, NO_STREAM.NO_SESSION);
        assert.equal(terminalViewSocketUrl(stream, { protocol: "http:", host: "127.0.0.1:4181" }), null, "an unresolved stream yields NO url — nothing to open");
        assert.equal(terminalStreamHeader(stream, { itemRef: "35/00" }), null, "and NO header — the card renders no terminal at all (V1)");
        assert.equal(stream.sessionId, undefined, "it borrowed nothing from the sibling assignment on the same node");
      });
    },
  },
  {
    name: "task04/38-06 an unresolvable tuple (no node id) never opens a socket — the defensive half of ADR-014 invariant 4",
    async run() {
      // A projected row with NO target node cannot arise from the store (the column
      // is NOT NULL) — this row is deliberately synthesized to prove the RESOLVER
      // itself never fabricates the missing half, which is the assertion the
      // Examples row asks for.
      const stream = resolveTerminalStream({ assignmentId: "asg-x", state: "running", sessionId: "sess-1" });
      assert.equal(stream.resolved, false);
      assert.equal(stream.reason, NO_STREAM.NO_NODE);
      assert.equal(terminalViewSocketUrl(stream, { protocol: "http:", host: "127.0.0.1:4181" }), null);
      assert.equal(terminalStreamHeader(stream, { itemRef: "35/00" }), null);

      // A half-tuple never produces a routing key either — so it can never match a
      // live subscription (the mirror's own routingKey discipline, mirrored here).
      assert.equal(terminalStreamKey(null, "sess-1"), null);
      assert.equal(terminalStreamKey("node-a", null), null);
      assert.equal(terminalStreamKey("node-a", ""), null);

      // And the no-assignment case degrades the same honest way (never throws).
      assert.equal(resolveTerminalStream(null).reason, NO_STREAM.NO_ASSIGNMENT);
      assert.equal(resolveTerminalStream(undefined).resolved, false);
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // V7/V9 — "the terminal-view state reads honestly at every point in its life"
  // (Scenario Outline, 4 rows)
  // ═══════════════════════════════════════════════════════════════════════════
  ...[
    {
      event: "it has subscribed but no byte has arrived",
      reads: "an honest waiting/empty state",
      apply: () => initialTerminalViewState(),
      expect: TERMINAL_VIEW_STATES.WAITING,
      text: "waiting for output",
      failure: false,
    },
    {
      event: "the first PTY bytes arrive",
      reads: "streaming live",
      apply: () => terminalViewOnBytes(initialTerminalViewState()),
      expect: TERMINAL_VIEW_STATES.STREAMING,
      text: "streaming",
      failure: false,
    },
    {
      event: "the stream closes cleanly",
      reads: "ended — not a frozen pretend-live frame",
      apply: () => terminalViewOnClose(terminalViewOnBytes(initialTerminalViewState())),
      expect: TERMINAL_VIEW_STATES.ENDED,
      text: "stream ended",
      failure: false,
    },
    {
      event: "the transport fails",
      reads: "a disconnected/error state, legibly",
      apply: () => terminalViewOnError(terminalViewOnBytes(initialTerminalViewState())),
      expect: TERMINAL_VIEW_STATES.DISCONNECTED,
      // THE WORD MOVED AND THE MEANING DID NOT. `disconnected` was the fleet's failure STATE;
      // `error` is the superset (a refused spawn on a healthy socket is not a disconnection), and
      // the fleet's word survives where it was always doing its real work — as the MANDATORY
      // cause line the operator reads in the pane.
      text: "error",
      cause: TRANSPORT_CAUSE_LINE,
      failure: true,
    },
  ].map((row) => ({
    name: `task04/38-06 the terminal-view state reads honestly — when ${row.event}, the view reads ${row.reads}`,
    run: () => {
      const state = row.apply();
      assert.equal(state.state, row.expect);
      const descriptor = describeTerminalViewState(state);
      assert.equal(descriptor.text, row.text, "the state is named in WORDS — legible, never colour alone");
      assert.equal(descriptor.state, row.expect);

      // And a NORMAL empty or ended state is never rendered as an error nor as an
      // endless spinner (V7/V9). The `token` NAME the component used to map to classes itself is
      // gone — the map lives in the shared set now, so two surfaces cannot map one token two ways
      // — and the assertion reads the CLASS the descriptor carries.
      if (row.failure) {
        assert.equal(descriptor.reads, "failure", "a genuine transport failure DOES read as a failure");
        assert.equal(descriptor.dotClass, TERMINAL_DOT_CLASS_DESTRUCTIVE, "on the pre-existing read-failure token — no terminal-local error primitive");
        assert.equal(descriptor.labelClass, TERMINAL_LABEL_CLASS_FAILURE, "…and its dark-surface label variant");
        assert.equal(descriptor.cause, row.cause, "and the CAUSE is mandatory — `error` is only safe as the superset because the cause line is there");
        assert.equal(descriptor.live, false, "a dead stream never claims to be live");
      } else {
        assert.equal(descriptor.reads, "normal", "an empty/streaming/ended state is NOT an error");
        assert.notEqual(descriptor.dotClass, TERMINAL_DOT_CLASS_DESTRUCTIVE, "and never wears the red error token");
      }
      if (row.expect !== TERMINAL_VIEW_STATES.STREAMING) {
        assert.equal(descriptor.motion, "none", "no motion off the live state — the cold start can never render as a spinner-forever");
        assert.equal(descriptor.live, false);
      } else {
        assert.equal(descriptor.live, true);
      }
    },
  })),
  {
    name: "task04/38-06 the state ramp never launders a failure into a clean finish, and an unknown state LABELS ITSELF (never impersonates `waiting`, never a red error)",
    run: () => {
      // The close that FOLLOWS a transport error stays disconnected — relabelling
      // it "stream ended" would tell the operator the run finished cleanly.
      const dropped = terminalViewOnError(terminalViewOnBytes(initialTerminalViewState()));
      assert.equal(terminalViewOnClose(dropped).state, TERMINAL_VIEW_STATES.DISCONNECTED);
      assert.equal(describeTerminalViewState(terminalViewOnClose(dropped)).cause, TRANSPORT_CAUSE_LINE, "…and the line that names the failure survives its own tail");

      // Forward-compat: an unrecognised state degrades QUIETLY — muted token,
      // `normal` (never the red failure token), no motion, not live.
      const unknown = describeTerminalViewState("some-future-state");
      assert.equal(unknown.reads, "normal");
      assert.equal(unknown.dotClass, TERMINAL_DOT_CLASS_MUTED);
      assert.equal(unknown.motion, "none");
      assert.equal(unknown.live, false);

      // …and it SAYS it is unknown (QA SHOULD-FIX 2, 2026-07-23). This lane used to
      // enshrine the deviation it documented: the fallback returned the WAITING
      // descriptor, so a state this module has not learned yet rendered the words
      // `waiting for output` — a specific, checkable claim ("bytes are still
      // plausibly coming") that nothing had established, on a surface whose whole
      // discipline is never to assert a liveness the source does not. The house
      // idiom (ui/src/fleet/assignments.mjs's UNKNOWN_CHIP, and the board run
      // chip's fallback) labels itself `unknown`; so does this now.
      assert.equal(unknown.text, "unknown", "an unrecognised state names ITSELF — it never borrows a known state's words");
      assert.equal(unknown.state, "unknown");
      assert.notEqual(unknown.text, describeTerminalViewState(TERMINAL_VIEW_STATES.WAITING).text, "and is distinguishable from a genuine cold start");

      // The same for an absent/null state (the other half of the forward-compat
      // fallback — a descriptor is always returned, it never throws).
      for (const absent of [undefined, null, ""]) {
        assert.equal(describeTerminalViewState(absent).text, "unknown");
      }
    },
  },
  {
    // QA SHOULD-FIX 3 (2026-07-23). view-state.mjs DOCUMENTS this transition —
    // "bytes arriving after an ended/disconnected state legitimately revive the
    // view" — and it is the ONE transition with no laundering guard, so it is the
    // one most worth pinning: a future "once ended, always ended" tightening would
    // silently freeze a genuinely revived stream, and nothing asserted otherwise.
    name: "task04/38-06 bytes arriving AFTER an ended/disconnected view legitimately revive it to streaming — the source is asserting liveness again",
    run: () => {
      const ended = terminalViewOnClose(terminalViewOnBytes(initialTerminalViewState()));
      assert.equal(ended.state, TERMINAL_VIEW_STATES.ENDED, "precondition: the view had ended");
      assert.equal(terminalViewOnBytes(ended).state, TERMINAL_VIEW_STATES.STREAMING, "a byte after `ended` revives the view — V9 forbids showing a liveness the source no longer asserts, never the reverse");
      assert.equal(describeTerminalViewState(terminalViewOnBytes(ended)).live, true);

      const dropped = terminalViewOnError(terminalViewOnBytes(initialTerminalViewState()));
      assert.equal(dropped.state, TERMINAL_VIEW_STATES.DISCONNECTED, "precondition: the view had dropped");
      assert.equal(terminalViewOnBytes(dropped).state, TERMINAL_VIEW_STATES.STREAMING, "and a byte after `disconnected` revives it too — a reconnected stream that is genuinely flowing must not keep reading as failed");

      // The revive is a genuine round trip: the revived view can end again.
      assert.equal(terminalViewOnClose(terminalViewOnBytes(ended)).state, TERMINAL_VIEW_STATES.ENDED);
    },
  },
  {
    // DESIGN §Surface 3 V10 (NEW 2026-07-23, GAP-3; CORRECTED §Correction 3).
    // `waiting for output` is a PROMISE; on an assignment that has already finished it
    // is the same species of lie as a stuck `working`. The ruling: keep the tuple-only
    // RESOLUTION (a state filter would hide a real captured stream), fix the LABEL —
    // and derive BOTH terminal-ness and the wording from `assignmentChip(row)`, never
    // a hand-maintained list.
    //
    // BEFORE this correction the describer read a `TERMINAL_ASSIGNMENT_STATES` set of
    // raw state strings `{done, failed, reclaimed}`. That set LEAKED the fleet's two
    // OTHER terminal states — `withdrawn` (operator-stop, ADR-001) and `stale` — so
    // their terminal-views sat on `waiting for output` forever: the exact lie V10
    // exists to kill, at two new addresses. This lane now pins that BOTH leaked states
    // read honestly, that terminal-ness is the chip's judgment (so `reclaimed` WITHOUT
    // `reclaimedAt` — which the chip degrades to `unknown` — is NOT asserted terminal),
    // and the V11 chip/bar split (short STATE in `text`, full REASON in `reason`).
    name: "task04/38-06 (V10) a stream whose assignment is terminal reads `no live output` — terminal-ness AND wording come from assignmentChip (no leaky state list), the ROUTING stays tuple-only, and the chip/bar split holds (V11)",
    async run() {
      const waiting = initialTerminalViewState();

      // NON-terminal (or absent) assignments keep the promise — output is still
      // possible, so `waiting for output` stays honest, with no override reason.
      const stillWaiting = describeTerminalViewState(waiting);
      assert.equal(stillWaiting.text, "waiting for output", "a stream that could still speak keeps the promise");
      assert.equal(stillWaiting.reason, null, "…and offers no bar override — the bar falls back to the same text");
      assert.equal(describeTerminalViewState(waiting, {}).text, "waiting for output", "and so does one whose assignment the caller did not supply");
      for (const state of ["assigned", "accepted", "running"]) {
        assert.equal(describeTerminalViewState(waiting, { assignment: { state } }).text, "waiting for output", `${state} is NOT terminal — output is still possible`);
      }
      // Forward-compat: a state neither this module NOR the chip recognises must NOT
      // be asserted terminal — we may not claim output is impossible for a state we do
      // not know. The chip degrades it to `unknown`, which is not `done`/`failed`.
      const future = describeTerminalViewState(waiting, { assignment: { state: "some-future-state" } });
      assert.equal(future.text, "waiting for output", "an unknown assignment state keeps `waiting for output` — the chip degrades to `unknown`, which is not terminal");
      assert.equal(future.reason, null);
      // …and the ONE-vocabulary consequence: a `reclaimed` row MISSING its reclaimedAt
      // is exactly such an unrecognised shape (assignmentChip needs reclaimedAt to
      // settle it to failed), so it too keeps waiting — no second list to drift.
      assert.equal(describeTerminalViewState(waiting, { assignment: { state: "reclaimed" } }).text, "waiting for output", "reclaimed WITHOUT reclaimedAt degrades to `unknown` at the chip — not terminal (one vocabulary, no drift)");

      // TERMINAL assignments now ALL read honestly — including the two the old set
      // leaked. Terminal-ness AND the words come from assignmentChip: done/failed read
      // directly; `withdrawn` and reclaimed/`stale` (with `reclaimedAt`) SETTLE to
      // `failed`, carrying the chip's `· reclaimed` note where it has one.
      const terminalCases = [
        { assignment: { state: "done" }, reason: "no live output — assignment done", leaked: false },
        { assignment: { state: "failed" }, reason: "no live output — assignment failed", leaked: false },
        { assignment: { state: "reclaimed", reclaimedAt: NOW }, reason: "no live output — assignment failed · reclaimed", leaked: false },
        // The two §Correction 3 addresses — terminal, and formerly stuck on `waiting`.
        { assignment: { state: "withdrawn" }, reason: "no live output — assignment failed", leaked: true },
        { assignment: { state: "stale", reclaimedAt: NOW }, reason: "no live output — assignment failed · reclaimed", leaked: true },
      ];
      for (const { assignment, reason, leaked } of terminalCases) {
        const descriptor = describeTerminalViewState(waiting, { assignment });
        // V11 chip/bar SPLIT: the header STATE chip carries the short in-family word…
        assert.equal(descriptor.text, "no live output", `the header STATE chip is the short 14-char word (${assignment.state})`);
        assert.equal(descriptor.text.length, 14, "…exactly `no live output` (14 chars) — a chip that grows into a sentence wraps the header (V11)");
        // …while the BAR carries the full REASON in the m35 ramp's own words + note.
        assert.equal(descriptor.reason, reason, `the viewport BAR carries the REASON in assignmentChip's own words (${assignment.state})`);
        assert.notEqual(descriptor.text, descriptor.reason, "chip and bar are SPLIT — the long reason never lands in the header chip");
        // …and it is the SAME WAITING state, told truthfully — no new primitive.
        assert.equal(descriptor.state, TERMINAL_VIEW_STATES.WAITING, "it is the SAME state, told truthfully — no new state was invented");
        assert.equal(descriptor.dotClass, TERMINAL_DOT_CLASS_MUTED, "on the same quiet token — no new primitive, never an error");
        assert.equal(descriptor.reads, "normal");
        assert.equal(descriptor.motion, "none");
        assert.equal(descriptor.live, false);
        if (leaked) {
          assert.notEqual(descriptor.text, "waiting for output", `${assignment.state} no longer leaks a \`waiting for output\` that can never come true (§Correction 3)`);
        }
      }

      // The stronger fact wins: a view that ACTUALLY received bytes keeps its own
      // ramp, whatever the assignment says — and carries no bar override.
      for (const [state, text] of [
        [TERMINAL_VIEW_STATES.STREAMING, "streaming"],
        [TERMINAL_VIEW_STATES.ENDED, "stream ended"],
        // The chip reads `error` now; the fleet's own word survives as the mandatory cause line
        // in the pane, which is where it was always doing its real work.
        [TERMINAL_VIEW_STATES.DISCONNECTED, "error"],
      ]) {
        const descriptor = describeTerminalViewState(state, { assignment: { state: "done" } });
        assert.equal(descriptor.text, text, "a view that received bytes keeps its OWN ramp, whatever the assignment says");
        assert.equal(descriptor.reason, null, "…and carries no override reason — the bar renders its own state word");
      }

      // And the ROUTING is untouched (the half V10 explicitly forbids changing):
      // a terminal assignment that captured a session still RESOLVES its stream.
      const stream = resolveTerminalStream({ targetNodeId: "node-a", sessionId: "sess-1", state: "done" });
      assert.equal(stream.resolved, true, "a finished assignment's captured stream is still resolvable — the label tells the truth, the resolver hides nothing");
      assert.equal(stream.sessionId, "sess-1");

      // The chip/bar split is genuinely WIRED in the component, not merely present on
      // the descriptor: the header chip renders the short STATE (`descriptor.text`) and the
      // message slots render the PANE LINE. A descriptor that grew a `reason` the component
      // ignored would lose the detail and leave the header showing the long string again.
      //
      // RE-POINTED, AND THE FALLBACK CHAIN MOVED INTO THE CORE (m46/04). The component used to
      // spell `descriptor.reason ?? descriptor.text` at each render site — three sites, on three
      // surfaces, one precedence to get subtly different. The core now computes ONE `paneLine`
      // (an injected reason, else `error`'s mandatory cause, else `waiting`'s own richer line,
      // else the state word) and the component renders that field and nothing else.
      // READ OVER THE WHOLE TERMINAL SURFACE, not one file. These assertions used to read
      // `TerminalControl.tsx` alone, and the rendering has since moved: the chip lives in
      // `TerminalIdentity.tsx` and the pane line in `TerminalByteArea.tsx`. That move is
      // the design this very test describes — "there is exactly ONE `byteArea`, and both
      // the inline host and the fullscreen overlay CALL it" — so the extraction was the
      // contract being honoured, and the gate reported it as a violation because it was
      // looking in the file the code used to be in.
      //
      // The claim is about the SURFACE, so it is measured over the surface. A later move
      // between these components cannot break it again; deleting the split can.
      const surface = await terminalSurfaceSource();
      assert.ok(/\{descriptor\.text\}/.test(surface), "the header STATE chip renders descriptor.text (the short word)");
      assert.ok(/\{descriptor\.paneLine\}/.test(surface), "the viewport bar and the top-left line both render `descriptor.paneLine` — the chip/bar split is wired, not just declared");
      assert.ok(!/descriptor\.reason \?\? descriptor\.text/.test(surface), "…and no render site re-derives the precedence for itself");
      const control = await readFile(TERMINAL_CONTROL, "utf8");
      assert.ok(/reason: mount\.reason/.test(control), "the component passes the call site's INJECTED reason to the describer — it computes no assignment state of its own (ADR-005)");
    },
  },
  {
    // DESIGN §Surface 3 V11 (NEW 2026-07-23, GAP-1) — confirmed in a real render:
    // `stream ended` was painted unbacked over the last output line and BOTH became
    // unreadable. Structural, over the real component source: chrome that destroys
    // the content it annotates is worse than no chrome.
    name: "task04/38-06 (V11) the non-live message never overprints the frame it describes — ended/error render on an OPAQUE, IN-FLOW bar, top-left is reserved for the pane that is empty by definition, and the rule now binds ALL THREE surfaces",
    async run() {
      // RE-POINTED at the ONE control (m46/04). V11 used to be asserted over the fleet component
      // while the BOARD DOCK painted its error message `absolute inset-x-0 top-0` over the
      // operator's last output line, and the FULLSCREEN overlay did the same `absolute … bottom-0`
      // — the file admitted it, reasoning that the fitness function read the compliant inline
      // twin. One control means one bar rule and nowhere left to hide: the assertions below now
      // read the whole component, so both predecessors' violations are fixed BY the merge.
      // The remaining clauses read the same SURFACE for the same reason as V10: the pane's
      // structure now lives in `TerminalByteArea.tsx` and its host in `TerminalControl.tsx`,
      // and this clause is about the rendered result of the two together.
      const control = await terminalSurfaceSource();

      // ONE BYTE AREA, THREE SURFACES — and that is the strongest form this clause can take.
      // There is exactly ONE bar site because there is exactly ONE `byteArea`, and both the
      // inline host and the fullscreen overlay CALL it. A second copy is how the overlay came
      // to render one of the four treatments instead of all four.
      //
      // ANCHORED ON `descriptor.showsBar`, NOT ON `role="status"`. The old matcher keyed on
      // the ARIA attribute, and m49/05's F6 fix made that attribute CONDITIONAL — spread as
      // `{...(hostAnnouncesState(host) ? { role: "status" } : null)}` so a grid of ended tiles
      // does not narrate the fleet. The bar still renders its words everywhere; only the
      // announcement moved. A detector keyed on an accessibility attribute therefore found
      // ZERO bars and reported "no bar site" about a component that has exactly one — the
      // failure mode of measuring a thing by an attribute that is allowed to vary.
      // `descriptor.showsBar` is the structural anchor: it is what DECIDES the bar exists.
      const bars = await terminalBarSites();
      // A FLOOR AND A DECLARED CEILING, never a retyped count (FF-11902). The floor is the sweep's
      // own non-vacuity: a bar site exists somewhere under ui/src/terminal. The ceiling is a
      // DECISION — ONE byte area, called by both surfaces — and a second copy is how the overlay
      // came to render one of the four treatments instead of all four. Every site found is judged.
      assert.ok(bars.length >= 1, `the sweep of ${TERMINAL_DIR} found no bar site keyed on descriptor.showsBar`);
      assert.ok(bars.length <= 1, `${bars.length} bar sites — one function, three surfaces; a second copy is the divergence this clause refuses: ${bars.map((site) => site.file).join(", ")}`);
      for (const { file: barFile, className: bar } of bars) {
        assert.ok(barFile.length > 0, `the bar site is named, so a reader knows where to look: ${barFile}`);
        assert.ok(/TERMINAL_CHROME_BG_CLASS/.test(bar), `${barFile}: on an OPAQUE background (the chrome token) — never unbacked text over live glyphs`);
        assert.ok(/border-t/.test(bar), `${barFile}: divided from the bytes above it`);
        assert.ok(
          !/\babsolute\b/.test(bar),
          `${barFile}: it takes its OWN layout space rather than floating over the pane: an opaque bar overlaid on the bottom still HIDES the newest line (measured), which is GAP-1 relocated, not fixed. THIS is change 7 — the fullscreen bar used to be absolute … bottom-0.`,
        );
      }
      // …and BOTH surfaces genuinely render it: the inline host and the overlay each call the one
      // function, so the four treatments cannot diverge between them.
      // The one byte area was a LOCAL FUNCTION called as `byteArea(inlineRef)` /
      // `byteArea(overlayRef)`; it is now the extracted `<TerminalByteArea>` component,
      // handed the same two refs. The claim is untouched — both surfaces render the ONE
      // byte area — so only the shape it is read through moves. Keying on the component
      // and its `paneRef` is the stronger reading anyway: a second COPY of the component
      // would be caught by the single-bar-site assertion above, and a surface that stopped
      // rendering it at all is caught here.
      const calls = [...control.matchAll(/paneRef=\{(inlineRef|overlayRef)\}/g)].map((match) => match[1]);
      assert.deepEqual(calls.sort(), ["inlineRef", "overlayRef"], "the inline surface AND the fullscreen overlay both render the ONE byte area");
      // …and both refs genuinely LAND on that byte area rather than merely being passed to
      // something. The inline site names the component directly; the overlay hands its ref
      // to the fullscreen door, whose occupant forwards it into the same component. Both
      // legs are asserted, because "a ref is passed somewhere" is not the claim.
      assert.match(control, /<TerminalByteArea[\s\S]{0,600}?paneRef=\{inlineRef\}/u, "the inline surface renders the byte area directly");
      assert.match(control, /<TerminalByteArea[\s\S]{0,600}?paneRef=\{paneRef\}/u, "the fullscreen occupant forwards its paneRef into the SAME byte area — the overlay renders no twin");

      assert.ok(
        /flex min-h-0 flex-1 flex-col/.test(control) && /relative min-h-0 flex-1/.test(control),
        "…which is only true because the byte area is a flex-1 sibling that SHRINKS by the bar's height (the layout effect then re-fits or re-scales into the smaller box)",
      );

      // The top-left placement survives ONLY for the state whose pane is empty by definition, and
      // the dead frame is dimmed (with the label still carrying the meaning — V6). BOTH are
      // DESCRIPTOR FIELDS now, computed in `state-ramp.mjs` where a `node:test` can drive them,
      // rather than booleans re-derived from state words at this render site.
      const topOverlay = /className="[^"]*absolute[^"]*top-0[^"]*"/.exec(control)?.[0] ?? null;
      assert.ok(topOverlay != null, "the empty/cold-start message still sits at the top-left, where the first line will appear");
      assert.ok(!/bg-\[/.test(topOverlay), "…and needs no bar: nothing can be overprinted on a pane that is empty by definition");
      assert.ok(/descriptor\.showsTopLeftLine/.test(control), "…and that placement is the DESCRIPTOR's answer, not a state-word test in JSX");
      assert.ok(/descriptor\.showsBar/.test(control), "…as is the bar's");
      assert.ok(/descriptor\.dims/.test(control), "the frozen frame of a dead stream is dimmed — dead separated from live");
      assert.ok(/\{descriptor\.text\}/.test(control), "…while the LABEL always carries the meaning (V6: the dim never travels alone)");
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // V1/V8 — "the view NAMES its stream, and multiplexed cards never cross-wire"
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "task04/38-06 each view's header names its OWN (nodeId, sessionId) resolved to the assignment ref it belongs to — and a terminal with no visible owner is never rendered",
    run: () => {
      const headerA = terminalStreamHeader(resolveTerminalStream({ targetNodeId: "node-a", sessionId: "sess-1" }), { itemRef: "38/06" });
      const headerB = terminalStreamHeader(resolveTerminalStream({ targetNodeId: "node-b", sessionId: "sess-2" }), { itemRef: "38/07" });

      assert.equal(headerA.ref, "38/06");
      assert.equal(headerA.nodeId, "node-a");
      assert.equal(headerA.sessionId, "sess-1");
      assert.ok(headerA.label.includes("38/06") && headerA.label.includes("node-a"), "the header names the assignment ref AND the node — not a raw id alone (V1)");
      assert.ok(headerA.sessionLabel.includes("sess-1"));
      assert.equal(headerA.readOnlyLabel, "read-only", "the read-only posture travels as an explicit LABEL (V2/V6)");

      // Neither header mentions the other's stream.
      assert.ok(!headerA.label.includes("node-b") && !headerA.sessionLabel.includes("sess-2"));
      assert.ok(!headerB.label.includes("node-a") && !headerB.sessionLabel.includes("sess-1"));
      assert.notEqual(headerA.key, headerB.key);

      // The subscription key is the FULL tuple, never the node alone: two sessions
      // on the SAME node are two DIFFERENT keys (V8).
      const sameNodeOne = terminalStreamHeader(resolveTerminalStream({ targetNodeId: "node-a", sessionId: "sess-1" }), { itemRef: "38/06" });
      const sameNodeTwo = terminalStreamHeader(resolveTerminalStream({ targetNodeId: "node-a", sessionId: "sess-9" }), { itemRef: "38/08" });
      assert.notEqual(sameNodeOne.key, sameNodeTwo.key, "same node, different session ⇒ different subscription key");

      // A terminal with no visible owner is never rendered (V1): a resolvable
      // stream the view cannot NAME yields no header at all.
      assert.equal(terminalStreamHeader(resolveTerminalStream({ targetNodeId: "node-a", sessionId: "sess-1" }), {}), null);
      // …and it degrades to the assignment id when no human ref is available,
      // rather than rendering an anonymous terminal.
      const byId = terminalStreamHeader(resolveTerminalStream({ targetNodeId: "node-a", sessionId: "sess-1" }), { assignmentId: "asg-1" });
      assert.equal(byId.ref, "asg-1");
    },
  },
  {
    name: "task04/38-06 two multiplexed views over the REAL /ws/terminal-view route are never handed each other's bytes",
    async run() {
      // PRODUCER-FED end-to-end: the URLs the REAL resolver produced are dialled
      // against the REAL serveMeshUi route over the REAL in-memory mirror, fed by
      // the REAL terminal-frame envelope builder.
      const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-fleet-terminal-view-"));
      const root = path.join(tmp, "repo");
      const distRoot = path.join(tmp, "dist");
      const home = path.join(tmp, "home");
      let server;
      const sockets = [];
      try {
        await mkdir(path.join(root, ".aof"), { recursive: true });
        await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify({ name: "demo", work: { dir: "./wiki/work" } }, null, 2)}\n`, "utf8");
        await mkdir(path.join(meshUiDist(distRoot), "assets"), { recursive: true });
        await writeFile(path.join(meshUiDist(distRoot), "index.html"), "<!doctype html><html><body></body></html>\n", "utf8");
        await writeFile(path.join(meshUiDist(distRoot), "assets", "index-abc123.js"), "export const x = 1;\n", "utf8");

        const mirror = createTerminalMirror();
        ({ server } = await serveMeshUi({
          projectDir: root, port: 0, repoRoot: distRoot,
          globalStoreOptions: { env: { AOF_GLOBAL_HOME: home } },
          terminalMirror: mirror,
        }));
        const host = `127.0.0.1:${server.address().port}`;

        const streamA = resolveTerminalStream({ targetNodeId: "node-a", sessionId: "sess-1" });
        const streamB = resolveTerminalStream({ targetNodeId: "node-b", sessionId: "sess-2" });
        const received = { a: [], b: [] };
        for (const [bucket, stream] of [["a", streamA], ["b", streamB]]) {
          const url = terminalViewSocketUrl(stream, { protocol: "http:", host });
          const ws = new WebSocket(url);
          sockets.push(ws);
          ws.on("message", (data) => received[bucket].push(data.toString()));
          await new Promise((resolve, reject) => {
            ws.on("open", resolve);
            ws.on("error", reject);
          });
        }

        mirror.apply(buildTerminalFrameEnvelope("node-a", "sess-1", "hello from a\n"));
        mirror.apply(buildTerminalFrameEnvelope("node-b", "sess-2", "hello from b\n"));
        // An unresolvable frame (no open subscription for its tuple) is dropped —
        // never bled into an unrelated view.
        mirror.apply(buildTerminalFrameEnvelope("node-a", "sess-ghost", "orphan bytes\n"));

        const start = Date.now();
        while (received.a.length < 1 || received.b.length < 1) {
          if (Date.now() - start > 2000) throw new Error("timeout waiting for the multiplexed frames");
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
        await new Promise((resolve) => setTimeout(resolve, 100));

        assert.deepEqual(received.a, ["hello from a\n"], "view A saw ONLY its own stream's bytes");
        assert.deepEqual(received.b, ["hello from b\n"], "view B saw ONLY its own stream's bytes");
      } finally {
        for (const ws of sockets) {
          try { ws.close(); } catch { /* already closing */ }
        }
        if (server) await new Promise((resolve) => server.close(resolve));
        await rm(tmp, { recursive: true, force: true });
      }
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // V3 — "the view reuses the existing terminal rendering, and the typed UI build
  // stays green"
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "task04/38-06 V3, DISCHARGED BY THE MERGE: the fleet view does not REUSE the board dock's terminal idiom — it IS the board dock's terminal, one component with two mounts, so there is nothing left to keep in sync",
    async run() {
      // V3 asked the fleet view to REUSE the dock's xterm wiring, its font stack, its theme and
      // its dark classes, and this lane compared the two files to prove it. That comparison was
      // the strongest thing available while there were two files — and it was still only a
      // comparison: the two had ALREADY drifted by one addon (the dock loaded WebLinksAddon and
      // the peek did not), which a hex-and-font diff cannot see.
      //
      // After m46/04 the requirement is discharged rather than re-pointed. There is ONE component,
      // so "the same idiom" is not a property to check between two files but a fact about there
      // being one — which `acd-terminal-server-only`'s single-construction-site sweep pins, and
      // which this lane now asserts positively about the surviving file.
      const control = lf(await readFile(TERMINAL_CONTROL, "utf8"));

      for (const specifier of ['from "@xterm/xterm"', 'from "@xterm/addon-fit"', '"@xterm/xterm/css/xterm.css"']) {
        assert.ok(control.includes(specifier), `the one control imports ${specifier}`);
      }
      assert.ok(control.includes('from "@xterm/addon-web-links"'), "…including WebLinksAddon, which the peek used to lack — the one arbitrary difference between two views of the same bytes, removed (PO ruling, knowing change 13)");

      // The terminal's own look is not spelled here AT ALL: the theme object, the font stack and
      // the font size come off the palette module, so there is no second copy to compare against.
      assert.ok(/theme:\s*TERMINAL_XTERM_THEME/.test(control), "the xterm theme is the palette's object, not a literal");
      assert.ok(/fontFamily:\s*TERMINAL_FONT_FAMILY/.test(control), "the mono font stack is the palette's constant");
      assert.ok(/fontSize:\s*TERMINAL_FONT_SIZE/.test(control), "…and so is the font size");

      // No terminal palette outside its one home: not one of DG-46-2's five hexes is typed here.
      const invented = (control.match(/#[0-9a-fA-F]{3,8}/g) ?? []).filter((hex) => !/^#[0-9a-fA-F]{6}$/.test(hex) || true);
      assert.deepEqual(invented, [], "the one control invents — and types — NO colour of its own; every value is imported from ui/src/terminal/palette.mjs");
    },
  },
  {
    // NAMED FOR WHAT IT PROVES (QA SHOULD-FIX 1, 2026-07-23): this lane checks the
    // .d.mts companion FILES exist and are imported — a structural, filesystem-level
    // check. It does NOT run the typed build, so it cannot claim `tsc -b && vite
    // build stays green`; the lane BELOW does that for real. Both are kept: this one
    // localises the failure to "the companion is missing" (the F2 lesson) in under a
    // millisecond, and stays a gate on a machine with no TypeScript installed.
    name: "task04/38-06 every framework-free terminal .mjs helper ships its .d.mts companion, the one control imports them, and the fleet page mounts it (the companion-PRESENCE half — the node suite does not type-check the fleet TS)",
    async run() {
      // RE-POINTED at the ONE control's home (m46/04). The helper set moved out of the fleet's
      // folder — that is the point of the milestone — but the rule is the same one, and its floor
      // went UP: there were two `.mjs` helpers here, and there are eight.
      const entries = await readdir(TERMINAL_DIR);
      const helpers = entries.filter((name) => name.endsWith(".mjs"));
      assert.ok(helpers.length >= 5, `the control ships its logic as framework-free .mjs helpers (the house pattern): ${helpers.length}`);
      for (const helper of helpers) {
        const companion = `${helper.slice(0, -".mjs".length)}.d.mts`;
        assert.ok(entries.includes(companion), `${helper} ships its ${companion} companion (the node suite does NOT type-check the fleet TS)`);
      }
      // And the component genuinely CONSUMES them (a helper nothing imports is not a seam — the
      // F-38.05 lesson at this scale). Two are consumed by the CALL SITES rather than the control
      // — the source table and the input policy are what a mount module asks — so the check is
      // over the whole production tree that reaches the folder, not over one file.
      const control = await readFile(TERMINAL_CONTROL, "utf8");
      const boardMount = await readFile(path.join(repoRoot, "ui", "src", "board", "dock-mount.mjs"), "utf8");
      const fleetMount = await readFile(path.join(repoRoot, "ui", "src", "fleet", "terminal-mount.mjs"), "utf8");
      const consumers = `${control}\n${boardMount}\n${fleetMount}`;
      for (const helper of helpers) {
        assert.ok(consumers.includes(`/${helper}`) || consumers.includes(`./${helper}`), `${helper} is imported by the control or by a call site's mount module`);
      }
      // And the fleet page MOUNTS the control (F-38.06c was a component-shaped hole; an unmounted
      // component would be the same hole one layer in).
      const fleet = await readFile(path.join(repoRoot, "ui", "src", "fleet", "Fleet.tsx"), "utf8");
      assert.ok(fleet.includes("TerminalControl"), "Fleet.tsx mounts the one terminal control from the work-item card");
      assert.ok(fleet.includes("fleetTerminalMount"), "…handing it the mount its own module computes");
    },
  },
  {
    // The REAL half of the V3 step "…so `tsc -b && vite build` passes" (QA
    // SHOULD-FIX 1, 2026-07-23). The companion-presence lane above proves the FILES
    // are there; only the compiler proves they TYPE. This milestone's own F2 was
    // exactly that gap — `ui/src/fleet/runs.mjs` shipped without its `.d.mts`, the
    // node suite stayed green, and `tsc -b && vite build` failed on an implicit any.
    //
    // GUARD-IF-PRESENT, mirroring the cargo lanes in scripts/test.mjs: TypeScript is
    // a devDependency hoisted to the repo root, so it is present on any `npm ci`
    // tree — but a SEA/packaged checkout without node_modules must not be failed for
    // a toolchain it never installed. The check runs the compiler DIRECTLY through
    // this process's own node (`process.execPath node_modules/typescript/bin/tsc`) —
    // never `npx` (policy-blocked, and it would resolve/fetch off-tree).
    //
    // `-b ui` builds the ui/ solution (tsconfig.app.json + tsconfig.node.json). Both
    // are `noEmit` with their tsBuildInfoFile under an ignored node_modules/.tmp, so
    // this writes NOTHING into the tracked tree. `--force` defeats the incremental
    // cache: a lane that silently no-ops because a previous build left a fresh
    // .tsbuildinfo would be a hollow pass — the exact class of defect this file was
    // written to catch. Measured ~2s.
    name: "task04/38-06 the typed UI build genuinely type-checks — `tsc -b ui` compiles the fleet terminal-view clean (guard-if-present; skips when TypeScript is not installed)",
    async run() {
      const tsc = path.join(repoRoot, "node_modules", "typescript", "bin", "tsc");
      const solution = path.join(repoRoot, "ui", "tsconfig.json");
      if (!existsSync(tsc) || !existsSync(solution)) {
        // The honest-degrade path: announce the skip rather than pretend a pass.
        console.log(`# skip - tsc -b ui (typescript=${existsSync(tsc)}, ui/tsconfig.json=${existsSync(solution)})`);
        return;
      }
      const result = spawnSync(process.execPath, [tsc, "-b", "ui", "--force"], {
        cwd: repoRoot,
        encoding: "utf8",
        timeout: 300000,
      });
      assert.equal(result.error, undefined, `tsc could not be spawned: ${String(result.error?.message ?? "")}`);
      assert.equal(
        result.status,
        0,
        `\`tsc -b ui\` must compile clean — the typed UI build is part of this task's own contract (V3).\n`
        + `${String(result.stdout ?? "")}${String(result.stderr ?? "")}`,
      );
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MILESTONE 49 / STORY 00 — tasks/00_the-projection-carries-the-code.feature
  // (@executable). THE ONE HOP: the worker's status-refinement `code` — produced,
  // persisted and mapped in production today — stops being dropped by
  // `projectAssignment`, one function before a browser can read it.
  //
  // WHY HERE. This suite already owns the SAME seam for `sessionId`, the additive
  // key that arrived one milestone earlier: the REAL worker frame builder, over
  // the REAL control-side frame handler, over a REAL AOF_GLOBAL_HOME-isolated
  // store, read through the REAL `/api/mesh/status` shaping (ADR-008's
  // producer-fed rule). Scenarios 1, 2, 4 and 6 land here; scenarios 3 and 5 are
  // properties of the pure projection literal and land in the pure shaper's own
  // suite (test/assignment/assignment-fleet-status-shape.test.mjs).
  //
  // The lanes below stand up NO server and bind NO port.
  // ═══════════════════════════════════════════════════════════════════════════

  // SCENARIO 1 — THE PREMISE, green on arrival by design: the fact is ALREADY at
  // the shared mapper's output, which is what licenses a three-line diff instead
  // of a migration across the 38 dependents of src/assignment-record.mjs. It fails
  // the moment anyone edits that god-node — exactly the edit this story must not
  // make — so the twelve-key shape is pinned as a TEST rather than left to review.
  {
    name: "task00/49-00 the shared row mapper already hands the projection the fact, so the god-node needs no edit — twelve keys, in order, with an uncoded row reading `code: null`",
    async run() {
      await withMeshAssignFixture(async ({ workspaceId, home }) => {
        const journalOptions = { env: { AOF_GLOBAL_HOME: home } };
        // Given an assignment row stored with state `running` and code `needs-input`
        // — written through the REAL producer path, never a hand-built row.
        await seedAssignment({ home }, {
          assignmentId: "asg-1", itemRef: "35/00", workspaceId,
          targetNodeId: "node-a", issuer: "control-a", state: "accepted", assignedAt: NOW,
        });
        // …beside a row whose worker has never reported a code at all.
        await seedAssignment({ home }, {
          assignmentId: "asg-none", itemRef: "35", workspaceId,
          targetNodeId: "node-a", issuer: "control-a", state: "assigned", assignedAt: NOW,
        });

        await withStore({ home }, async (store) => {
          const frame = buildAssignmentStatusFrame("node-a", "asg-1", "running", { code: "needs-input", now: NOW });
          assert.equal(frame.code, "needs-input", "the REAL worker frame builder does carry the refinement code");
          const applied = await applyStreamFrame(store, frame, { now: NOW, nodeId: "node-a", journalOptions });
          assert.equal(applied.applied, true, "the real handler applied the frame");

          // When I list every assignment through the shared reader the fleet
          // shaping itself uses (global-mesh-query.mjs threads THIS function).
          const rows = listAllAssignments(store);
          const coded = rows.find((row) => row.assignmentId === "asg-1");
          const uncoded = rows.find((row) => row.assignmentId === "asg-none");

          // Then that row's `code` reads exactly `needs-input`.
          assert.equal(coded.code, "needs-input", "the shared mapper already carries the fact to the projection's doorstep");
          assert.equal(coded.state, "running", "…without disturbing the state it refines");

          // And the mapped row's keys are exactly these twelve, in this order.
          assert.deepEqual(
            Object.keys(coded),
            [
              "assignmentId", "itemRef", "workspaceId", "targetNodeId", "issuer", "state",
              "runId", "assignedAt", "updatedAt", "reclaimedAt", "sessionId", "code",
            ],
            "the 38-dependent shared mapper's read shape is UNCHANGED by this story — twelve keys, in order",
          );

          // And a row that has never carried a code maps to `code: null` — never
          // "", never a fabricated word. (This is also trap 3: `"code" in row` is
          // TRUE for every row ever projected, so the projection's guard must test
          // the VALUE, not the key.)
          assert.equal(uncoded.code, null, "a row that has never carried a code maps to null");
          assert.equal(Object.prototype.hasOwnProperty.call(uncoded, "code"), true, "…and the KEY is present regardless — which is why the projection guards on the value");
          assert.notEqual(uncoded.code, "", "never an empty string");
        });
      });
    },
  },

  // SCENARIO 2 — THE HEADLINE, driven end-to-end by the REAL producer path.
  // NOTE ON THE REF: the feature writes the item as `49/00`; this fixture's work
  // projection publishes milestone `35` and story `35/00`, and the observable is
  // the PROJECTED ASSIGNMENT, not the ref string — an item ref with no published
  // row could carry no item attachment to assert at all.
  {
    name: "task00/49-00 a worker reporting a live blocked agent puts the word on the wire, at BOTH attachment points — the item's `assignment` AND the node's `assignments`",
    async run() {
      await withMeshAssignFixture(async ({ workspace, workspaceId, home, root }) => {
        const env = { AOF_GLOBAL_HOME: home };
        // Given an assignment held by node `node-a` for the fixture's item. The
        // node is PUBLISHED through the real node-record + registry-descriptor
        // doors, not seeded by SQL alone: a `global_nodes` row whose descriptor
        // file does not resolve is dropped from the roster, so the NODE attachment
        // — half of what this scenario measures — would silently not exist.
        await publishNodeRecord(workspace, "node-a", {
          nodeId: "node-a", host: "node-a", os: "linux", runtimes: [], skills: [], aofVersion: "0.1.0", publishedAt: NOW,
        });
        await seedTargetNode({ home }, { nodeId: "node-a", workspaceId, projectRoot: root, workDir: path.join(root, "wiki", "work") });
        await seedAssignment({ home }, {
          assignmentId: "asg-1", itemRef: "35/00", workspaceId,
          targetNodeId: "node-a", issuer: "control-a", state: "accepted", assignedAt: NOW,
        });

        await withStore({ home }, async (store) => {
          await store.publishWorkspaceSnapshot(workspace, { workspaceId });
          await publishGlobalRegistryDescriptorsToStore(store, workspace, { now: NOW });
          // When the worker sends its assignment-status frame reporting `running`
          // with code `needs-input` through the REAL control-side frame handler.
          // It carries a session id too, so "sessionId keeps its place among them"
          // is genuinely observable rather than vacuously true.
          const applied = await applyStreamFrame(
            store,
            buildAssignmentStatusFrame("node-a", "asg-1", "running", { runId: "run-7", sessionId: "sess-1", code: "needs-input", now: NOW }),
            { now: NOW, nodeId: "node-a", journalOptions: { env } },
          );
          assert.equal(applied.applied, true, "the real handler applied the frame");
        });

        // And the fleet status payload is shaped from that store (the REAL
        // /api/mesh/status read).
        const status = await queryGlobalMeshStatus({ env, now: NOW });
        const itemAttachment = status.items.find((item) => item.ref === "35/00")?.assignment;
        const nodeRow = status.nodes.find((node) => node.nodeId === "node-a");
        assert.ok(itemAttachment, "the item row still carries its assignment");
        assert.ok(Array.isArray(nodeRow?.assignments), "the node row still carries its held assignments");
        const nodeAttachment = nodeRow.assignments.find((row) => row.assignmentId === "asg-1");
        assert.ok(nodeAttachment, "the node holds the same assignment");

        // Then the item row's projected assignment carries `code` reading exactly
        // `needs-input` — and so does the node row's, for the SAME assignment: one
        // function feeds both, so neither can be the one that was remembered.
        assert.equal(itemAttachment.code, "needs-input", "the item attachment carries the word");
        assert.equal(nodeAttachment.code, "needs-input", "the node attachment carries the SAME word — one projection, two attachment points");

        // And the assignment's `state` still reads `running` — the code REFINES a
        // state, it never replaces one.
        assert.equal(itemAttachment.state, "running");
        assert.equal(nodeAttachment.state, "running");

        // And the eight pre-existing projected keys keep their names, their order
        // and their values byte-for-byte, `sessionId` keeps its place among them,
        // and NO other key appears on the projected row.
        for (const [where, projected] of [["the item row", itemAttachment], ["the node row", nodeAttachment]]) {
          assert.deepEqual(
            Object.keys(projected),
            [...PRE_EXISTING_PROJECTED_KEYS, "sessionId", "code"],
            `${where}: the eight pre-existing keys keep their names AND their order, sessionId keeps its place, code is appended — and no other key appears`,
          );
          assert.equal(projected.assignmentId, "asg-1");
          assert.equal(projected.targetNodeId, "node-a");
          assert.equal(projected.issuer, "control-a");
          assert.equal(projected.runId, "run-7");
          assert.equal(projected.assignedAt, NOW);
          assert.equal(projected.updatedAt, NOW);
          assert.equal(projected.reclaimedAt, null);
          assert.equal(projected.sessionId, "sess-1");
        }
      });
    },
  },

  // SCENARIO 4 — THE DYNAMIC. "Absent, not false" across the CLEAR, not merely at
  // rest. A code-less frame CLEARS the column (control-stream-server.mjs:346-351),
  // DELIBERATELY unlike runId/sessionId's absent-is-not-a-clear: the code names the
  // CURRENT posture of the session, not a captured fact. If the wire key survived
  // the clear, the fleet would report a human still being waited on after they
  // answered — a worse lie than showing nothing. A static fixture never reaches it.
  ...[
    {
      label: "the human answered",
      frame: "`running` with NO `code` key on the frame",
      send: { now: NOW },
      carries: undefined,
    },
    {
      label: "the agent blocked again",
      frame: "`running` with code `needs-input`",
      send: { code: "needs-input", now: NOW },
      carries: "needs-input",
    },
    {
      label: "the session was resumed instead",
      frame: "`running` with code `resumed`",
      send: { code: "resumed", now: NOW },
      carries: "resumed",
    },
  ].map((example) => ({
    name: `task00/49-00 the wire key appears when the agent blocks and DISAPPEARS when the human answers — ${example.label}: a further frame ${example.frame}`,
    async run() {
      await withMeshAssignFixture(async ({ workspace, workspaceId, home, root }) => {
        const env = { AOF_GLOBAL_HOME: home };
        await seedTargetNode({ home }, { nodeId: "node-a", workspaceId, projectRoot: root, workDir: path.join(root, "wiki", "work") });
        await seedAssignment({ home }, {
          assignmentId: "asg-1", itemRef: "35/00", workspaceId,
          targetNodeId: "node-a", issuer: "control-a", state: "accepted", assignedAt: NOW,
        });

        await withStore({ home }, async (store) => {
          await store.publishWorkspaceSnapshot(workspace, { workspaceId });
          // Given an assignment already reported `running` with code `needs-input`.
          await applyStreamFrame(
            store,
            buildAssignmentStatusFrame("node-a", "asg-1", "running", { sessionId: "sess-1", code: "needs-input", now: NOW }),
            { now: NOW, nodeId: "node-a", journalOptions: { env } },
          );
        });
        const before = (await queryGlobalMeshStatus({ env, now: NOW })).items.find((item) => item.ref === "35/00").assignment;
        assert.equal(before.code, "needs-input", "precondition: the blocked agent's word is on the wire");

        await withStore({ home }, async (store) => {
          // When the worker sends a further status frame …
          const next = buildAssignmentStatusFrame("node-a", "asg-1", "running", example.send);
          if (example.carries === undefined) {
            assert.equal(
              Object.prototype.hasOwnProperty.call(next, "code"),
              false,
              "the real builder OMITS the code key when the worker supplies none — this frame genuinely says nothing about the code",
            );
          }
          const applied = await applyStreamFrame(store, next, { now: NOW, nodeId: "node-a", journalOptions: { env } });
          assert.equal(applied.applied, true, "the real handler applied the further frame");
        });

        // And the fleet status payload is re-shaped from the same store.
        const after = (await queryGlobalMeshStatus({ env, now: NOW })).items.find((item) => item.ref === "35/00").assignment;

        if (example.carries === undefined) {
          assert.equal(Object.prototype.hasOwnProperty.call(after, "code"), false, "the projected row has NO `code` key at all — the column was cleared, and the wire key VANISHED with it");
          assert.equal(after.code, undefined, "…never a null, never an empty string left behind");
          assert.deepEqual(
            Object.keys(after),
            [...PRE_EXISTING_PROJECTED_KEYS, "sessionId"],
            "…and the row is back to exactly the pre-existing eight plus sessionId",
          );
        } else {
          assert.equal(after.code, example.carries, `the projected row carries \`code\` reading exactly ${example.carries}`);
        }
        assert.equal(after.state, "running", "the state is untouched throughout — the code refines it, never replaces it");
        assert.equal(after.sessionId, "sess-1", "…and the captured session id keeps ITS absent-is-not-a-clear discipline across the same frames");
      });
    },
  })),

  // SCENARIO 6 — THE BROWSER'S HALF. A wire field no type admits is a field the
  // next milestone reads and cannot compile against; a type that lags the wire is
  // the defect `acd-session-entry-frozen-wire` already exists for. Asserted by the
  // file's own content and the build's exit code — never by a pixel. This story
  // adds NO reader: the rendering of the mark is story 05's.
  {
    name: "task00/49-00 the browser's own type admits the field — `WorkAssignment` declares `code` as an OPTIONAL string appended AFTER sessionId, never `string | null`",
    async run() {
      const source = lf(await readFile(FLEET_API_TS, "utf8"));
      const block = /export type WorkAssignment = \{\n([\s\S]*?)\n\};/.exec(source)?.[1];
      assert.ok(block, "ui/src/fleet/api.ts declares the WorkAssignment type");
      const members = [...block.matchAll(/^ {2}(\w+)(\??): ([^;]+);$/gm)].map((match) => `${match[1]}${match[2]}: ${match[3]}`);

      // Every pre-existing member keeps its name, its type and its position; `code`
      // is OPTIONAL, a plain `string`, and appended AFTER `sessionId`.
      assert.deepEqual(
        members,
        [
          "assignmentId: string",
          "state: string",
          "targetNodeId: string",
          "issuer: string",
          "runId: string | null",
          "assignedAt: string",
          "updatedAt: string",
          "reclaimedAt: string | null",
          "sessionId?: string",
          "code?: string",
        ],
        "the wire's browser-side declaration is ADDITIVE: ten members, in this order, the pre-existing nine byte-unchanged",
      );

      // …and `code` is NOT `string | null`. The wire OMITS the key rather than
      // shipping a null, so the type must say exactly what `sessionId` says: a
      // `| null` here would license the very reader the projection refuses to feed.
      assert.ok(!/\bcode\??\s*:\s*string \| null/.test(block), "`code` is never declared `string | null` — absent, not null");
      assert.ok(block.includes("  code?: string;"), "…it is declared exactly `code?: string;` — what `sessionId` says, byte for byte");
    },
  },
  {
    // The exit-zero half of scenario 6's last clause, run for THIS story rather
    // than inherited from the m38 lane above: an optional member added to a type
    // ten `ui/` modules read is exactly the change that compiles in review and
    // fails in CI. Same guard-if-present discipline (TypeScript is a root
    // devDependency; a packaged checkout without node_modules is not failed for a
    // toolchain it never installed), same direct `node node_modules/typescript/bin/tsc`
    // invocation (never `npx` — policy-blocked and off-tree), same `--force` so a
    // stale .tsbuildinfo cannot hollow the pass.
    name: "task00/49-00 the typed UI build over `ui/` exits zero with the new wire member — `tsc -b ui --force` (guard-if-present; skips when TypeScript is not installed)",
    async run() {
      const tsc = path.join(repoRoot, "node_modules", "typescript", "bin", "tsc");
      const solution = path.join(repoRoot, "ui", "tsconfig.json");
      if (!existsSync(tsc) || !existsSync(solution)) {
        console.log(`# skip - tsc -b ui (typescript=${existsSync(tsc)}, ui/tsconfig.json=${existsSync(solution)})`);
        return;
      }
      const result = spawnSync(process.execPath, [tsc, "-b", "ui", "--force"], {
        cwd: repoRoot,
        encoding: "utf8",
        timeout: 300000,
      });
      assert.equal(result.error, undefined, `tsc could not be spawned: ${String(result.error?.message ?? "")}`);
      assert.equal(
        result.status,
        0,
        `\`tsc -b ui\` must compile clean — the typed UI build exiting zero is a clause of this task's own contract (m49/00 scenario 6).\n`
        + `${String(result.stdout ?? "")}${String(result.stderr ?? "")}`,
      );
    },
  },
];
