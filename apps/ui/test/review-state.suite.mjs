import assert from "node:assert/strict";
import { pendingProposals, operationCounts, describeCounts, touchedIds, selectionFor, describeError, staleConflictIds, shouldPoll } from "../src/board/review-state.mjs";

const proposal = { operations: [{ op: "add", element: { id: "aof-1" } }, { op: "update", id: "a", patch: {} }, { op: "delete", id: "b" }, { op: "update", id: "a", patch: {} }] };
export const reviewStateTests = [
  { name: "review state: only pending proposals are actionable", run: () => {
    assert.deepEqual(pendingProposals([{ status: "pending", id: 1 }, { status: "accepted" }, null]).map((p) => p.id), [1]);
    assert.deepEqual(pendingProposals(undefined), []);
  } },
  { name: "review state: operation counts and touched ids", run: () => {
    assert.deepEqual(operationCounts(proposal), { add: 1, update: 2, delete: 1 });
    assert.equal(describeCounts(proposal), "1 added, 2 changed, 1 removed");
    assert.deepEqual(touchedIds(proposal), ["aof-1", "a", "b"]);
    assert.deepEqual(touchedIds(proposal, { existingOnly: true }), ["a", "b"]);
    assert.deepEqual(touchedIds({ operations: [{ op: "add", element: { id: "x" } }] }, { existingOnly: true }), []);
    assert.deepEqual(selectionFor(["a"]), { a: true });
  } },
  { name: "review state: stale and decided errors are explained", run: () => {
    const message = "Proposal is stale; these elements changed since it was made: a, b.";
    assert.deepEqual(staleConflictIds(message), ["a", "b"]);
    assert.match(describeError("diagram-proposal-stale", message), /a, b changed.*Ask the architect again/);
    assert.match(describeError("diagram-proposal-decided", "x"), /already/);
    assert.match(describeError("diagram-scene-conflict", "x"), /changed elsewhere/);
    assert.equal(describeError("other", "boom"), "boom");
  } },
  { name: "review state: polling needs an open editor and a visible tab", run: () => {
    assert.equal(shouldPoll({ open: true, visible: true }), true);
    assert.equal(shouldPoll({ open: true, visible: false }), false);
    assert.equal(shouldPoll({ open: false, visible: true }), false);
  } },
];
