// Traceability wiring for milestone 35 / story 03 / task 00 —
// tasks/00_status-shape.feature (@executable).
//
// `shapeGlobalStatus` (src/global-mesh-query.mjs) is a PURE function of its
// `{ paths, workProjection, registry, assignments, now }` inputs (zero I/O) — so
// every scenario/example row is asserted HEADLESSLY over planted projection +
// assignment inputs, no live SQLite, no server, mirroring the m34
// test/mesh/global-mesh-query.test.mjs convention.
//
// Prior-lesson discipline (R4/m21, work memory near-miss): a pure read-model
// helper needs explicit headless coverage of ordering/tie-breaks, non-mutation of
// the shared model, and unknown-state forward-compat, not just the happy path —
// this file asserts the "most-relevant assignment wins" tie-break, that the
// shaping never mutates its input arrays, and that every ADR-001 state
// (including the forward-compat `withdrawn`/`reclaimed` terminal states) travels
// through verbatim.
import assert from "node:assert/strict";
import { shapeGlobalStatus } from "../../src/global-mesh-query.mjs";

function baseArgs(overrides = {}) {
  return {
    paths: { databasePath: "/tmp/global.sqlite" },
    workProjection: { workspaceId: null, workspaces: [], items: [], errors: [] },
    registry: { workspaces: [], nodes: [], errors: [] },
    assignments: [],
    now: "2026-07-09T00:00:00.000Z",
    ...overrides,
  };
}

function assignmentRow(overrides = {}) {
  return {
    assignmentId: "a1",
    itemRef: "35/00",
    workspaceId: "alpha",
    targetNodeId: "worker-b",
    issuer: "operator",
    state: "assigned",
    runId: null,
    assignedAt: "2026-07-08T10:00:00.000Z",
    updatedAt: "2026-07-08T10:00:00.000Z",
    reclaimedAt: null,
    ...overrides,
  };
}

export const assignmentFleetStatusShapeTests = [
  // Scenario: a work item carrying an assignment surfaces the assignment on its item row.
  {
    name: "assignment-fleet-status-shape/00 a work item carrying an assignment surfaces the assignment on its item row",
    run: () => {
      const item = { workspaceId: "alpha", ref: "35/00", type: "task", slug: "x", status: "in-progress", title: "X", parent: "35", sourcePath: "/x" };
      const args = baseArgs({
        workProjection: { workspaceId: null, workspaces: [], items: [item], errors: [] },
        assignments: [assignmentRow({ state: "running", runId: "run-1" })],
      });
      const result = shapeGlobalStatus(args);
      const row = result.items.find((i) => i.ref === "35/00");
      assert.ok(row, "the item row still surfaces");
      assert.ok(row.assignment, "the item row carries an assignment");
      assert.equal(row.assignment.state, "running");
      assert.equal(row.assignment.targetNodeId, "worker-b");
      assert.equal(row.assignment.runId, "run-1");
      assert.equal(row.assignment.assignedAt, "2026-07-08T10:00:00.000Z");
      assert.equal(row.assignment.updatedAt, "2026-07-08T10:00:00.000Z");
      assert.equal(row.assignment.reclaimedAt, null);
    },
  },

  // Scenario: a node holding assignments surfaces them keyed to that node.
  {
    name: "assignment-fleet-status-shape/00 a node holding assignments surfaces them keyed to that node",
    run: () => {
      const node = { nodeId: "worker-b", role: "worker" };
      const args = baseArgs({
        registry: { workspaces: [], nodes: [node], errors: [] },
        assignments: [
          assignmentRow({ assignmentId: "a1", itemRef: "35/00", state: "running" }),
          assignmentRow({ assignmentId: "a2", itemRef: "35/01", state: "accepted", assignedAt: "2026-07-08T09:00:00.000Z" }),
        ],
      });
      const result = shapeGlobalStatus(args);
      const row = result.nodes.find((n) => n.nodeId === "worker-b");
      assert.ok(row, "the node row still surfaces");
      assert.ok(Array.isArray(row.assignments), "the node row carries its held assignments");
      assert.equal(row.assignments.length, 2);
      const states = row.assignments.map((a) => a.state).sort();
      assert.deepEqual(states, ["accepted", "running"]);
      assert.ok(row.assignments.every((a) => a.targetNodeId === "worker-b"));
    },
  },

  // Scenario: an item and a node with no assignment carry nothing fabricated.
  {
    name: "assignment-fleet-status-shape/00 an item and a node with no assignment carry nothing fabricated — absent, not false",
    run: () => {
      const item = { workspaceId: "alpha", ref: "34", type: "milestone", slug: "y", status: "in-progress", title: "Y", parent: null, sourcePath: "/y" };
      const node = { nodeId: "worker-c", role: "worker" };
      const args = baseArgs({
        workProjection: { workspaceId: null, workspaces: [], items: [item], errors: [] },
        registry: { workspaces: [], nodes: [node], errors: [] },
        assignments: [],
      });
      const result = shapeGlobalStatus(args);
      const itemRow = result.items.find((i) => i.ref === "34");
      const nodeRow = result.nodes.find((n) => n.nodeId === "worker-c");
      assert.ok(!("assignment" in itemRow) || itemRow.assignment == null, "the item row carries no fabricated assignment");
      assert.ok(!("assignments" in nodeRow) || nodeRow.assignments == null, "the node row carries no fabricated assignments");
      assert.ok(!Object.prototype.hasOwnProperty.call(itemRow, "assignment"), "no placeholder assignment key is synthesized on the item row");
      assert.ok(!Object.prototype.hasOwnProperty.call(nodeRow, "assignments"), "no placeholder assignments key is synthesized on the node row");
    },
  },

  // Scenario: the assignment rows are additive — no existing status field changes meaning.
  {
    name: "assignment-fleet-status-shape/00 the assignment rows are additive — every pre-existing field keeps its m34 meaning, and the shaping mutates no input",
    run: () => {
      const item = { workspaceId: "alpha", ref: "35/00", type: "task", slug: "x", status: "in-progress", title: "X", parent: "35", sourcePath: "/x" };
      const workspace = { workspaceId: "alpha", projectRoot: "/alpha", workDir: "/alpha/wiki/work", name: "alpha", lastPublishedAt: "2026-07-08T00:00:00.000Z" };
      const node = { nodeId: "worker-b", role: "worker" };
      const itemsBefore = JSON.stringify([item]);
      const workspacesBefore = JSON.stringify([workspace]);
      const nodesBefore = JSON.stringify([node]);

      const args = baseArgs({
        workProjection: { workspaceId: null, workspaces: [workspace], items: [item], errors: [] },
        registry: { workspaces: [], nodes: [node], errors: [] },
        assignments: [assignmentRow()],
      });
      const result = shapeGlobalStatus(args);

      // the body still carries scope, workspaces, items, nodes, diagnostics
      assert.equal(result.scope, "global");
      assert.ok(Array.isArray(result.workspaces));
      assert.ok(Array.isArray(result.items));
      assert.ok(Array.isArray(result.nodes));
      assert.ok(result.diagnostics && typeof result.diagnostics === "object");

      // every pre-existing field keeps its m34 meaning unchanged
      const itemRow = result.items.find((i) => i.ref === "35/00");
      assert.equal(itemRow.workspaceId, item.workspaceId);
      assert.equal(itemRow.type, item.type);
      assert.equal(itemRow.slug, item.slug);
      assert.equal(itemRow.status, item.status);
      assert.equal(itemRow.title, item.title);
      assert.equal(itemRow.parent, item.parent);
      assert.equal(itemRow.sourcePath, item.sourcePath);

      // a reader that ignores the assignment field reads the same shape as before
      const { assignment: _ignored, ...withoutAssignment } = itemRow;
      assert.deepEqual(withoutAssignment, item);

      // the shaping never mutated the caller's input arrays/objects (non-mutation)
      assert.equal(JSON.stringify([item]), itemsBefore, "the input item row is unchanged");
      assert.equal(JSON.stringify([workspace]), workspacesBefore, "the input workspace row is unchanged");
      assert.equal(JSON.stringify([node]), nodesBefore, "the input node row is unchanged");
    },
  },

  // Scenario Outline: each lifecycle state travels through the read shape
  // verbatim, with reclaim provenance intact.
  {
    name: "assignment-fleet-status-shape/00 each lifecycle state travels through the read shape verbatim, with reclaim provenance intact",
    run: () => {
      const rows = [
        { state: "assigned", reclaimedAt: null },
        { state: "accepted", reclaimedAt: null },
        { state: "running", reclaimedAt: null },
        { state: "done", reclaimedAt: null },
        { state: "failed", reclaimedAt: null },
        { state: "withdrawn", reclaimedAt: null },
        { state: "reclaimed", reclaimedAt: "2026-07-08T10:05:00.000Z" },
      ];
      for (const { state, reclaimedAt } of rows) {
        const item = { workspaceId: "alpha", ref: "35/00", type: "task", slug: "x", status: "in-progress", title: "X", parent: "35", sourcePath: "/x" };
        const args = baseArgs({
          workProjection: { workspaceId: null, workspaces: [], items: [item], errors: [] },
          assignments: [assignmentRow({ state, reclaimedAt, updatedAt: reclaimedAt ?? "2026-07-08T10:00:00.000Z" })],
        });
        const result = shapeGlobalStatus(args);
        const itemRow = result.items.find((i) => i.ref === "35/00");
        assert.equal(itemRow.assignment.state, state, `state "${state}" travels through verbatim`);
        assert.equal(itemRow.assignment.reclaimedAt, reclaimedAt, `reclaimedAt for state "${state}" travels through verbatim`);
      }
    },
  },

  // The read layer applies no chip label or colour — the shape carries the RAW
  // ADR-001 state string, never a { label, token } descriptor (that's task 01).
  {
    name: "assignment-fleet-status-shape/00 the read layer applies no chip label or colour to the row",
    run: () => {
      const item = { workspaceId: "alpha", ref: "35/00", type: "task", slug: "x", status: "in-progress", title: "X", parent: "35", sourcePath: "/x" };
      const args = baseArgs({
        workProjection: { workspaceId: null, workspaces: [], items: [item], errors: [] },
        assignments: [assignmentRow({ state: "failed" })],
      });
      const result = shapeGlobalStatus(args);
      const itemRow = result.items.find((i) => i.ref === "35/00");
      assert.equal(itemRow.assignment.state, "failed");
      assert.ok(!("label" in itemRow.assignment), "no chip label is applied at the read layer");
      assert.ok(!("token" in itemRow.assignment), "no chip token/colour is applied at the read layer");
      assert.ok(!("mark" in itemRow.assignment), "no chip mark is applied at the read layer");
    },
  },

  // Tie-break coverage (R4/m21 discipline): when multiple rows exist for the
  // same item, an ACTIVE assignment always wins over a terminal one, even when
  // the terminal row is more recent — the chip prioritises the actionable state.
  {
    name: "assignment-fleet-status-shape/00 an active assignment wins the tie-break over a more-recent terminal row for the same item",
    run: () => {
      const item = { workspaceId: "alpha", ref: "35/00", type: "task", slug: "x", status: "in-progress", title: "X", parent: "35", sourcePath: "/x" };
      const args = baseArgs({
        workProjection: { workspaceId: null, workspaces: [], items: [item], errors: [] },
        // listAllAssignments orders most-recent-first — the terminal "done" row is
        // listed FIRST (more recent) but the ACTIVE "running" row must still win.
        assignments: [
          assignmentRow({ assignmentId: "a-done", state: "done", assignedAt: "2026-07-08T11:00:00.000Z" }),
          assignmentRow({ assignmentId: "a-running", state: "running", assignedAt: "2026-07-08T09:00:00.000Z" }),
        ],
      });
      const result = shapeGlobalStatus(args);
      const itemRow = result.items.find((i) => i.ref === "35/00");
      assert.equal(itemRow.assignment.assignmentId, "a-running", "the active row wins the tie-break, not the more-recent terminal row");
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MILESTONE 49 / STORY 00 — tasks/00_the-projection-carries-the-code.feature
  // (@executable). `projectAssignment` now appends the worker's status-refinement
  // `code` — the fact the system already produces, persists and maps, dropped one
  // function before a browser could read it.
  //
  // SCENARIOS 3 and 5 land here, in the PURE shaper's own suite, because both are
  // properties of the projection literal over planted rows: no store, no I/O, no
  // port. (Scenarios 1/2/4/6 are producer-fed or file-shaped and live in
  // test/ui/fleet-terminal-view-surface.test.mjs.) Row 6 of scenario 3 is the reason
  // the value axis is exercised HERE rather than through SQLite: a TEXT column's
  // affinity would coerce the stored `42` to `"42"` and the non-string case could
  // never reach the guard at all.
  // ═══════════════════════════════════════════════════════════════════════════

  // Scenario Outline: the key is present only when the row states a code, and the
  // word travels verbatim. Every Examples row, at BOTH attachment points — the
  // Background defines "the projected row" as an item's `assignment` OR an element
  // of a node's `assignments`, and ONE function feeds both.
  //
  // ROWS 2 AND 3 ARE THE ANTI-FILTER PROOF: `code` is a MULTI-VALUED column, not a
  // `needs-input` flag. Production writes `resumed` on it today and a later build
  // will write words this one has never heard of; a projection that copied only
  // the word it was told about would become a second authority over a vocabulary
  // the worker owns.
  ...[
    { label: "the agent is blocked on a person", stored: "needs-input", carries: "needs-input" },
    { label: "the session was revived by a resume", stored: "resumed", carries: "resumed" },
    { label: "a code this build has never heard of", stored: "some-future-code", carries: "some-future-code" },
    { label: "nothing to refine — the normal case", stored: null, carries: undefined },
    { label: "a writer that stored an empty string", stored: "", carries: undefined },
    { label: "a non-string a hand-written row left", stored: 42, carries: undefined },
    // NOT A TYPO. The guard is length-based because `sessionId`'s is; this story
    // does not invent a trimming rule its sibling key does not have.
    { label: "whitespace only", stored: " ", carries: " " },
  ].map((example) => ({
    name: `task00/49-00 the projected row carries the code only when the row STATES one, verbatim — ${example.label} (stored ${JSON.stringify(example.stored)})`,
    run: () => {
      const item = { workspaceId: "alpha", ref: "35/00", type: "task", slug: "x", status: "in-progress", title: "X", parent: "35", sourcePath: "/x" };
      const node = { nodeId: "worker-b", role: "worker" };
      const args = baseArgs({
        workProjection: { workspaceId: null, workspaces: [], items: [item], errors: [] },
        registry: { workspaces: [], nodes: [node], errors: [] },
        assignments: [assignmentRow({ state: "running", sessionId: "sess-1", code: example.stored })],
      });
      const result = shapeGlobalStatus(args);
      const itemAttachment = result.items.find((i) => i.ref === "35/00").assignment;
      const nodeAttachment = result.nodes.find((n) => n.nodeId === "worker-b").assignments[0];

      for (const [where, projected] of [["the item row", itemAttachment], ["the node row", nodeAttachment]]) {
        const has = Object.prototype.hasOwnProperty.call(projected, "code");
        if (example.carries === undefined) {
          assert.equal(has, false, `${where}'s projected assignment has NO \`code\` key at all — absent, not false`);
          assert.equal(projected.code, undefined, `${where} reads undefined for a code the row does not state`);
        } else {
          assert.equal(has, true, `${where}'s projected assignment carries the \`code\` key`);
          assert.equal(projected.code, example.carries, `${where} carries the code reading exactly ${JSON.stringify(example.carries)}`);
          // …and it is the STORE's own word, never a translation of it.
          assert.equal(projected.code, example.stored, `${where} copies the stored word VERBATIM — no whitelist, no boolean, no closed set`);
        }
        // The never-clause, whichever branch the row took.
        assert.notEqual(projected.code, null, `${where} is never given a \`code\` of null`);
        assert.notEqual(projected.code, "", `${where} is never given a \`code\` of ""`);
        // The refinement never displaces the state it refines.
        assert.equal(projected.state, "running", `${where} keeps its state — the code REFINES a state, it never replaces one`);
      }
    },
  })),

  // Scenario: nothing is attached where nothing was attached before. The ADDITIVE-
  // change regression — an optional key inside the projection must not make an
  // ATTACHMENT appear where none existed, and must not remove one either.
  {
    name: "task00/49-00 nothing is attached where nothing was attached before — the ATTACHMENT is unconditional, only the `code` KEY inside it is conditional",
    run: () => {
      const bareItem = { workspaceId: "alpha", ref: "34", type: "milestone", slug: "y", status: "in-progress", title: "Y", parent: null, sourcePath: "/y" };
      const heldItem = { workspaceId: "alpha", ref: "35/00", type: "task", slug: "x", status: "in-progress", title: "X", parent: "35", sourcePath: "/x" };
      const holdingNode = { nodeId: "worker-b", role: "worker" };
      const emptyNode = { nodeId: "worker-c", role: "worker" };
      const args = baseArgs({
        workProjection: { workspaceId: null, workspaces: [], items: [bareItem, heldItem], errors: [] },
        registry: { workspaces: [], nodes: [holdingNode, emptyNode], errors: [] },
        // The held assignment states NO code — the normal case, and the one an
        // "attachment follows the code" bug would drop on the floor.
        assignments: [assignmentRow({ state: "running", code: null })],
      });
      const result = shapeGlobalStatus(args);
      const bareRow = result.items.find((i) => i.ref === "34");
      const heldRow = result.items.find((i) => i.ref === "35/00");
      const emptyNodeRow = result.nodes.find((n) => n.nodeId === "worker-c");

      assert.equal(Object.prototype.hasOwnProperty.call(bareRow, "assignment"), false, "an item with no assignment at all has NO `assignment` key");
      assert.equal(Object.prototype.hasOwnProperty.call(emptyNodeRow, "assignments"), false, "a node holding no assignments has NO `assignments` key");

      assert.equal(Object.prototype.hasOwnProperty.call(heldRow, "assignment"), true, "an item whose assignment carries no code STILL has its `assignment` key — the attachment is unconditional");
      assert.equal(Object.prototype.hasOwnProperty.call(heldRow.assignment, "code"), false, "…and only the `code` key inside it is conditional");
      assert.equal(heldRow.assignment.assignmentId, "a1");
      assert.equal(heldRow.assignment.state, "running");
    },
  },
];
