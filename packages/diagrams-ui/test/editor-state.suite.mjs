// The editor's pure state, driven headlessly: the scene draft helpers (file name, fingerprint, the
// review invocation) and the review-panel helpers (pending proposals, counts and ids, error copy,
// the poll rule). Moved from apps/ui's board suite with their subject. node:assert/strict,
// `{ name, run }` shape.
import assert from "node:assert/strict";
import { POLL_MS, describeCounts, describeError, diagramReviewInvocation, openNotes, operationCounts, pendingProposals, sceneFileName, sceneFingerprint, selectionFor, shouldPoll, staleConflictIds, touchedIds } from "@aof/diagrams-ui/editor-state";

const scene = () => ({ elements: [{ id: "api", type: "text", text: "API", x: 10, y: 20, customData: { adr: "ADR-002" } }], files: {}, appState: { viewBackgroundColor: "#fff", gridSize: 20 } });
export const sceneDraftTests = [
  { name: "scene draft: filenames are confined to ADR diagram members", run: () => {
    assert.equal(sceneFileName("ADR-002-service.svg"), "ADR-002-service.excalidraw");
    for (const name of ["../ADR-002-api.svg", "a/b.svg", "a\\b.svg", "a..b.svg", "ADR-002-api.svg?path=x", "ADR-002-api.png", ".svg", ""]) assert.throws(() => sceneFileName(name), name);
  } },
  { name: "scene draft: the review invocation is a slash command built from the request id", run: () => {
    assert.equal(diagramReviewInvocation("133", "ADR-002-service.excalidraw", "req-1"), "/aof:diagram-review 133 ADR-002-service.excalidraw req-1");
  } },
  { name: "scene draft: selection, tool and camera changes are not document edits", run: () => {
    const original = scene();
    const movedCamera = structuredClone(original);
    Object.assign(movedCamera.appState, { selectedElementIds: { api: true }, zoom: { value: 3 }, scrollX: 42, activeTool: { type: "arrow" } });
    assert.equal(sceneFingerprint(original), sceneFingerprint(movedCamera));
  } },
  { name: "scene draft: label, geometry, bindings, metadata and embedded files change the fingerprint", run: () => {
    const original = scene();
    for (const patch of [{ text: "Renamed API" }, { x: 500 }, { customData: { adr: "ADR-003" } }, { boundElements: [{ id: "arrow", type: "arrow" }] }, { isDeleted: true }]) {
      const changed = structuredClone(original); Object.assign(changed.elements[0], patch);
      assert.notEqual(sceneFingerprint(original), sceneFingerprint(changed));
    }
    const changed = structuredClone(original); changed.files.image = { dataURL: "data:image/png;base64,AQ==" };
    assert.notEqual(sceneFingerprint(original), sceneFingerprint(changed));
    const recolored = structuredClone(original); recolored.appState.viewBackgroundColor = "#000";
    assert.notEqual(sceneFingerprint(original), sceneFingerprint(recolored));
  } },
];

const proposal = { changes: [{ key: "node:aof1", change: "added" }, { key: "node:a", change: "changed" }, { key: "layout:a", change: "changed" }, { key: "edge:b->c#1", change: "removed" }] };
export const reviewStateTests = [
  { name: "review state: only pending proposals are actionable", run: () => {
    assert.deepEqual(pendingProposals([{ status: "pending", id: 1 }, { status: "accepted" }, null]).map((p) => p.id), [1]);
    assert.deepEqual(pendingProposals(undefined), []);
  } },
  { name: "review state: a proposal's recorded changes give its counts and the Mermaid ids it touches", run: () => {
    assert.deepEqual(operationCounts(proposal), { add: 1, update: 2, delete: 1 });
    assert.equal(describeCounts(proposal), "1 added, 2 changed, 1 removed");
    assert.deepEqual(touchedIds(proposal), ["aof1", "a", "b->c#1"], "a node changed and moved is named once");
    assert.deepEqual(touchedIds(proposal, { existingOnly: true }), ["a", "b->c#1"]);
    assert.equal(describeCounts({ changes: [] }), "no changes");
    assert.deepEqual(touchedIds({ changes: [{ key: "direction", change: "changed" }] }), []);
    assert.deepEqual(selectionFor(["a"]), { a: true });
  } },
  { name: "review state: stale and decided errors are explained", run: () => {
    const message = "Proposal is stale; these changed since it was made: node:a, layout:b.";
    assert.deepEqual(staleConflictIds(message), ["node:a", "layout:b"]);
    assert.deepEqual(staleConflictIds("no marker here"), []);
    // CodeQL js/polynomial-redos: a long run of whitespace after the marker is read in linear time.
    const started = Date.now();
    assert.deepEqual(staleConflictIds(`changed since it was made:${"\t".repeat(200_000)}x`), ["x"]);
    assert.ok(Date.now() - started < 1000, "a long whitespace run is not polynomial");
    assert.match(describeError("diagram-proposal-stale", message), /node:a, layout:b changed.*Ask the architect again/);
    assert.match(describeError("diagram-proposal-decided", "x"), /already/);
    assert.match(describeError("diagram-scene-conflict", "x"), /changed elsewhere/);
    assert.equal(describeError("other", "boom"), "boom");
  } },
  { name: "review state: polling needs an open editor and a visible tab", run: () => {
    assert.equal(POLL_MS > 0, true);
    assert.equal(shouldPoll({ open: true, visible: true }), true);
    assert.equal(shouldPoll({ open: true, visible: false }), false);
    assert.equal(shouldPoll({ open: false, visible: true }), false);
  } },
];

export const notesAndDraftsTests = [
  { name: "notes: only open requests are notes the operator can still withdraw", run: () => {
    assert.deepEqual(openNotes([{ id: 1, status: "open" }, { id: 2, status: "answered" }, { id: 3, status: "withdrawn" }, { id: 4, status: "proposed" }, null]).map((r) => r.id), [1]);
    assert.deepEqual(openNotes(undefined), []);
  } },
  { name: "review invocation: with no request id it is the batch form that examines every open note", run: () => {
    assert.equal(diagramReviewInvocation("133", "ADR-002-service.excalidraw"), "/aof:diagram-review 133 ADR-002-service.excalidraw");
    assert.equal(diagramReviewInvocation("133", "ADR-002-service.excalidraw", null), "/aof:diagram-review 133 ADR-002-service.excalidraw");
  } },
];
