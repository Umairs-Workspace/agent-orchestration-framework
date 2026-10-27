// The editor's pure state, driven headlessly: the scene draft helpers (file name, fingerprint, the
// review invocation) and the review-panel helpers (pending proposals, counts and ids, error copy,
// the poll rule). Moved from apps/ui's board suite with their subject. node:assert/strict,
// `{ name, run }` shape.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DELIVERY_ACTIONS, deliveryFor, POLL_MS, describeCounts, describeError, diagramReviewInvocation, openNotes, operationCounts, pendingProposals, sceneFileName, sceneFingerprint, selectionFor, shouldPoll, staleConflictIds, touchedIds } from "@aof/diagrams-ui/editor-state";

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

// Milestone 172 / story 02 / task 01 — asking and replying reach the architect's session on the server
// (172/ADR-002 §1): one pure decision per action names the bodies it posts to the conversation route,
// and the diagram surface renders no terminal (172/ADR-003 §4).
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const sourceOf = (rel) => readFile(path.join(repoRoot, rel), "utf8");
export const deliveryTests = [
  { name: "172/02 task01 E1 · asking posts the new note's request id", run: () => {
    assert.deepEqual(deliveryFor("ask", { requestId: "r7", waiting: 0 }), [{ requestId: "r7" }]);
  } },
  { name: "172/02 task01 E2 · asking with notes waiting posts the question, then one batch review", run: () => {
    assert.deepEqual(deliveryFor("ask", { requestId: "r7", waiting: 2 }), [{ requestId: "r7" }, {}]);
  } },
  { name: "172/02 task01 E4 / E5 · a reply posts its note's request id, session running or not", run: () => {
    assert.deepEqual(deliveryFor("reply", { requestId: "r7" }), [{ requestId: "r7" }]);
    assert.deepEqual(deliveryFor("reply", { requestId: "r7", waiting: 3 }), [{ requestId: "r7" }], "a reply never sweeps the other notes in");
  } },
  { name: "172/02 task01 E6 · Save as note posts nothing", run: () => {
    assert.deepEqual(deliveryFor("note", { requestId: "r9", waiting: 1 }), []);
  } },
  { name: "172/02 task01 E7 · reviewing the waiting notes posts one batch review", run: () => {
    assert.deepEqual(deliveryFor("review", { waiting: 2 }), [{}]);
  } },
  ...[
    ["requests a first draft recorded as \"r9\", no note waiting", "first-draft", { requestId: "r9", waiting: 0 }, [{ requestId: "r9" }]],
    ["chooses Ask again in the thread of \"r7\"", "ask-again", { requestId: "r7" }, [{ requestId: "r7" }]],
    ["withdraws the waiting note \"r1\"", "withdraw", { requestId: "r1" }, []],
  ].map(([label, action, facts, posted]) => ({ name: `172/02 task01 · each action delivers exactly what it names: the operator ${label}`, run: () => {
    assert.deepEqual(deliveryFor(action, facts), posted);
  } })),
  { name: "172/02 task01 · every action has a delivery, and an action with no request posts no request", run: () => {
    assert.deepEqual([...DELIVERY_ACTIONS], ["ask", "first-draft", "reply", "ask-again", "review", "note", "withdraw"]);
    assert.deepEqual(deliveryFor("ask", {}), [], "no request id, nothing to ask about");
  } },
  { name: "172/02 task01 E1 · the diagram surface renders no terminal and the editor types into none", run: async () => {
    const surface = await sourceOf("apps/ui/src/diagram/DiagramSurface.tsx");
    for (const gone of ["TerminalControl", "SurfaceDock", "dock-mount", "onDeliver"]) assert.doesNotMatch(surface, new RegExp(gone), `the surface names no ${gone}`);
    const editor = await sourceOf("packages/diagrams-ui/src/ExcalidrawEditor.tsx");
    assert.doesNotMatch(editor, /onDeliver|\bdock\b/u, "the editor has no dock to deliver through");
    assert.match(editor, /\/api\/diagram\/conversation\?ref=/u, "it posts to the conversation route");
    assert.match(editor, /deliveryFor\(action, \{ requestId, waiting: waitingNotes\(requestId\) \}\)/u, "every post is deliveryFor's answer");
  } },
  { name: "172/02 task01 E12 · an unavailable session shows the command to run instead", run: async () => {
    const editor = await sourceOf("packages/diagrams-ui/src/ExcalidrawEditor.tsx");
    const branch = /if \(response\.status === 503 && answer\.code === UNAVAILABLE\) \{([\s\S]*?)\n {6}\}/u.exec(editor)?.[1] ?? "";
    assert.match(branch, /step\(\{ type: "session", state: "unavailable"/u, "the session state becomes unavailable");
    assert.match(branch, /setInvocation\(diagramReviewInvocation\(itemRef, file\)\)/u, "the batch command is shown, with Copy, in the composer");
    assert.equal(diagramReviewInvocation("171", "ADR-003-push-stream.excalidraw"), "/aof:diagram-review 171 ADR-003-push-stream.excalidraw");
  } },
];
