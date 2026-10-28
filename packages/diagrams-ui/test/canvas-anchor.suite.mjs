// Milestone 171 / story 00 — Ask architect at the selection, driven headlessly: where the overlay's
// action sits (`canvas-anchor.mjs`, ADR-001), when it is drawn at all, the question field's steps,
// and the one ask path the bar and the canvas share (`askArchitect`, editor-state). The look on a
// drawn canvas is the smoke's (test/smoke/diagram-editor.smoke.mjs). node:assert/strict,
// `{ name, run }` shape.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ASK_ACTION, CLOSED_FIELD, anchorFor, canAsk, fieldStep, selectionAction, selectionLabel } from "@aof/diagrams-ui/canvas-anchor";
import { askArchitect, diagramReviewInvocation } from "@aof/diagrams-ui/editor-state";

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
const source = (name) => readFile(path.join(src, name), "utf8");

// The Background: "gateway" at 400,300 160×80 and "cache" at 640,300 120×80, on a 1200×800 canvas.
const GATEWAY = [400, 300, 560, 380];
const BOTH = [400, 300, 760, 380];
const VIEWPORT = { width: 1200, height: 800 };
const SIZE = { width: 112, height: 30 };
const at = (scrollX = 0, scrollY = 0, zoom = 1, extra = {}) => ({ scrollX, scrollY, zoom: { value: zoom }, ...extra });
const actionFor = ({ bounds = GATEWAY, selectedCount = 1, readOnly = false, appState = at() } = {}) => selectionAction({ selectedCount, readOnly, appState, bounds, viewport: VIEWPORT, size: SIZE });
const centreOf = (anchor) => anchor.x + SIZE.width / 2;

const FILE = "ADR-001-overlay.excalidraw";
// The editor's side of an ask, recorded in order: what was saved, recorded and launched.
function editorFake({ revision = "rev-1", saved = "rev-2" } = {}) {
  const log = [];
  return {
    log,
    deps: (overrides = {}) => ({
      revision,
      unsaved: false,
      save: async () => { log.push(["save"]); return { revision: saved }; },
      selection: () => { log.push(["selection"]); return ["gateway"]; },
      record: async (request) => { log.push(["record", request]); return "req-1"; },
      launch: (command) => log.push(["launch", command]),
      invocation: (id) => diagramReviewInvocation("171", FILE, id),
      ...overrides,
    }),
  };
}

export const canvasAnchorTests = [
  // ── R1 · A selection offers Ask architect where it sits, and nothing else ──────────────────
  { name: "171/00 E1 · a selected shape offers Ask architect above it, and no Add note", run: async () => {
    const action = actionFor();
    assert.equal(action.label, ASK_ACTION);
    assert.equal(action.label, "Ask architect");
    assert.equal(centreOf(action), 480, "centred on gateway's box (400..560)");
    assert.equal(action.y + SIZE.height, 300 - 8, "8 px clear of the box's top edge");
    assert.equal(action.placement, "above");
    const overlay = await source("CanvasOverlay.tsx");
    assert.doesNotMatch(overlay, /Add note/, "the overlay draws no Add note action (171/00 Q1)");
  } },
  { name: "171/00 E2 · two selected shapes share one action over the box enclosing both", run: () => {
    const action = actionFor({ bounds: BOTH, selectedCount: 2 });
    assert.equal(action.label, ASK_ACTION, "one action, not one per shape");
    assert.equal(centreOf(action), 580, "centred on the box from x 400 to x 760");
    assert.equal(action.y + SIZE.height, 292);
  } },
  { name: "171/00 · no action is drawn when nothing is selected", run: () => {
    assert.equal(actionFor({ selectedCount: 0, bounds: null }), null);
    assert.equal(actionFor({ selectedCount: 0 }), null);
  } },
  { name: "171/00 E4 · no action is drawn on a read-only diagram with \"gateway\" selected", run: () => {
    assert.equal(actionFor({ readOnly: true }), null);
  } },
  { name: "171/00 · no action is drawn while the operator is mid-drag of \"gateway\"", run: () => {
    assert.equal(actionFor({ appState: at(0, 0, 1, { selectedElementsAreBeingDragged: true }) }), null);
    for (const flag of ["isResizing", "isRotating", "newElement", "editingTextElement", "contextMenu", "openMenu"]) {
      assert.equal(actionFor({ appState: at(0, 0, 1, { [flag]: flag.endsWith("Element") || flag.endsWith("Menu") ? { id: "x" } : true }) }), null, flag);
    }
    assert.ok(actionFor({ appState: at(0, 0, 1, { selectedElementsAreBeingDragged: false, contextMenu: null, openMenu: null }) }), "an unset flag hides nothing");
  } },
  // 172/01 retired the bar under the canvas into the conversation panel's composer (172/ADR-003): its
  // Save as note and Ask are the bar's Add note and Ask architect, and are still not gated on a selection.
  { name: "171/00 E3 · with nothing selected, the panel's composer still offers Save as note and Ask", run: async () => {
    const panel = await source("ConversationPanel.tsx");
    const gate = /const disabled = ([^;]*);/.exec(panel);
    assert.ok(gate, "the composer gates its two buttons on one expression");
    assert.doesNotMatch(gate[1], /select/i, `not gated on a selection: ${gate[1]}`);
    for (const label of ["Save as note", "Ask architect"]) {
      assert.match(panel, new RegExp(`<button type="button" aria-label="${label}" disabled=\\{disabled\\}`), `the composer renders its ${label} button`);
    }
  } },
  { name: "171/00 · the field's placeholder names the selection: the shape's label, or a count", run: () => {
    const elements = [
      { id: "g", type: "rectangle", customData: { aof: { id: "gateway" } } },
      { id: "g-label", type: "text", text: "Gateway", containerId: "g" },
      { id: "c", type: "rectangle", customData: { aof: { id: "cache" } } },
      { id: "gone", type: "rectangle", isDeleted: true },
    ];
    assert.equal(selectionLabel(elements, { g: true }), "Gateway");
    assert.equal(selectionLabel(elements, { g: true, "g-label": true }), "Gateway", "a box and its own label are one shape");
    assert.equal(selectionLabel(elements, { c: true }), "cache", "an unlabelled shape is named by its Mermaid id");
    assert.equal(selectionLabel(elements, { g: true, c: true }), "2 shapes");
  } },

  // ── R2 · Asking from the canvas is the same ask as from the bar ───────────────────────────
  { name: "171/00 E5 · a question asked at the selection is recorded and launched as the bar's ask is", run: async () => {
    const canvas = editorFake();
    const text = "Why does this write to the database directly?";
    const id = await askArchitect({ text, ...canvas.deps() });
    assert.equal(id, "req-1");
    assert.deepEqual(canvas.log, [
      ["selection"],
      ["record", { baseRevision: "rev-1", selectedIds: ["gateway"], request: text }],
      ["launch", "/aof:diagram-review 171 ADR-001-overlay.excalidraw req-1"],
    ]);
    const bar = editorFake();
    await askArchitect({ text, ...bar.deps() });
    assert.deepEqual(bar.log, canvas.log, "the same selection and text record and launch the same");
    // And the editor routes BOTH entry points through that one path: the bar's ask and the
    // overlay's `onAsk` each reach `askAt`, the only caller of `askArchitect`.
    const editor = await source("ExcalidrawEditor.tsx");
    assert.equal(editor.match(/askArchitect\(/g)?.length, 1, "one ask path in the editor");
    assert.match(editor, /const ask = async \(text: string\) => [^\n]*askAt\(text, selectedElementIds\(\)\)/, "the panel's composer asks through askAt");
    assert.match(editor, /const askAtSelection = async[\s\S]*?askAt\(text, elementIds\)/, "the canvas asks through askAt");
    assert.match(editor, /<CanvasOverlay [^>]*onAsk=\{askAtSelection\}/, "the overlay is handed that ask");
  } },
  { name: "171/00 E6 · an unsaved canvas is saved before the ask is recorded", run: async () => {
    const fake = editorFake({ revision: "rev-1", saved: "rev-2" });
    await askArchitect({ text: "Why?", ...fake.deps({ unsaved: true }) });
    assert.deepEqual(fake.log.map(([step]) => step), ["save", "selection", "record", "launch"], "saved first; the selection is named after the save gave new shapes their ids");
    assert.equal(fake.log[2][1].baseRevision, "rev-2", "recorded against the revision that save answered");
  } },
  { name: "171/00 E7 · Escape closes the field and asks nothing", run: async () => {
    let { state } = fieldStep(CLOSED_FIELD, { type: "open" });
    ({ state } = fieldStep(state, { type: "type", text: "Why?" }));
    const escaped = fieldStep(state, { type: "escape" });
    assert.equal(escaped.ask, null, "nothing is asked, so nothing is recorded or launched");
    assert.deepEqual(escaped.state, CLOSED_FIELD);
    assert.equal(actionFor().label, ASK_ACTION, "the closed field gives the action back");
    const overlay = await source("CanvasOverlay.tsx");
    assert.match(overlay, /\{!field\.open \? <button[^>]*data-aof-canvas-action="ask"/, "the overlay shows the action whenever the field is closed");
  } },
  { name: "171/00 · an empty question cannot be asked", run: () => {
    const open = fieldStep(CLOSED_FIELD, { type: "open" }).state;
    assert.equal(canAsk(open), false);
    assert.equal(fieldStep(open, { type: "submit" }).ask, null);
    const blank = fieldStep(open, { type: "type", text: "   \n " }).state;
    assert.equal(canAsk(blank), false, "whitespace is not a question");
    const typed = fieldStep(open, { type: "type", text: "  Why?  " }).state;
    assert.equal(canAsk(typed), true);
    const submitted = fieldStep(typed, { type: "submit" });
    assert.equal(submitted.ask, "Why?");
    assert.equal(submitted.state.asking, true);
    assert.equal(canAsk(submitted.state), false, "asking disables Ask");
    assert.equal(fieldStep(submitted.state, { type: "escape" }).state.open, true, "an ask in flight is not closed");
    const failed = fieldStep(submitted.state, { type: "failed", error: "offline" }).state;
    assert.deepEqual([failed.text, failed.error, failed.asking], ["  Why?  ", "offline", false], "a failure keeps the text and says why");
    assert.deepEqual(fieldStep(submitted.state, { type: "asked" }).state, CLOSED_FIELD, "done closes the field");
  } },
  { name: "171/00 · the ask path refuses an empty question before saving or recording anything", run: async () => {
    const fake = editorFake();
    await assert.rejects(askArchitect({ text: "  ", ...fake.deps({ unsaved: true }) }), /Enter a question/);
    assert.deepEqual(fake.log, []);
    const unrecorded = editorFake();
    assert.equal(await askArchitect({ text: "Why?", ...unrecorded.deps({ record: async () => null }) }), null);
    assert.equal(unrecorded.log.some(([step]) => step === "launch"), false, "no id, no launch");
  } },

  // ── R3 · The action stays with its selection on screen ────────────────────────────────────
  { name: "171/00 E8 · panning 200 px left moves the action 200 px left", run: () => {
    assert.equal(actionFor({ appState: at(-200, 0) }).x, actionFor().x - 200);
  } },
  { name: "171/00 · at zoom 2 the action is centred above gateway's box drawn at twice size", run: () => {
    const action = actionFor({ appState: at(0, 0, 2) });
    assert.equal(centreOf(action), (800 + 1120) / 2);
    assert.equal(action.y + SIZE.height, 600 - 8);
  } },
  { name: "171/00 E9 · with no room above, the action is drawn below the box", run: () => {
    const action = actionFor({ appState: at(0, -296) });
    assert.equal(action.placement, "below");
    assert.equal(action.y, 380 - 296 + 8, "8 px below the box's bottom edge");
  } },
  { name: "171/00 E10 · a shape scrolled out of view draws no action", run: () => {
    assert.equal(actionFor({ appState: at(-2000, 0) }), null);
    assert.equal(anchorFor({ bounds: GATEWAY, appState: at(0, 2000), viewport: VIEWPORT, size: SIZE }), null);
  } },
  { name: "171/00 · near the canvas edge the action is kept inside it", run: () => {
    assert.equal(actionFor({ appState: at(-500, 0) }).x, 0, "left edge");
    const right = actionFor({ appState: at(700, 0) });
    assert.equal(right.x + SIZE.width, VIEWPORT.width, "right edge");
  } },
];
