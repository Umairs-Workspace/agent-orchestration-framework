// THE CANVAS OVERLAY'S HEADLESS HALF (milestone 171 / ADR-001) — pure: no React, no DOM, no SDK.
// Excalidraw 0.18 has no context-menu, selection-toolbar or comment API, so everything aof puts ON
// the canvas lives in one overlay layer, and this module is the one place that says where a thing
// sits. Scene bounds (`[x1, y1, x2, y2]`, the SDK's `getCommonBounds`) and the app state's scroll
// and zoom go in; a position inside the canvas comes out. The overlay is a child of the SDK's own
// container, whose top-left IS the canvas's, so the container offsets (`offsetLeft`/`offsetTop`)
// cancel and are never added. FF-17102: no other file in `packages/diagrams-ui/src` converts scene
// coordinates to the screen.

export const ANCHOR_GAP = 8;
export const ASK_ACTION = "Ask architect";

// A scene point drawn on the canvas: the SDK's own transform, less the container offset.
export function sceneToCanvas(sceneX, sceneY, appState) {
  const zoom = appState?.zoom?.value ?? 1;
  const scrollX = appState?.scrollX ?? 0;
  const scrollY = appState?.scrollY ?? 0;
  return { x: (sceneX + scrollX) * zoom, y: (sceneY + scrollY) * zoom };
}

// Where a thing of `size` sits beside scene `bounds`: centred above them, `gap` clear; below them
// when there is no room above; kept inside the canvas edges. Null when the bounds are out of view —
// a shape scrolled off-screen hides its affordances.
export function anchorFor({ bounds, appState, viewport, size, gap = ANCHOR_GAP }) {
  const box = onCanvas(bounds, appState, viewport);
  if (!box) return null;
  const w = size?.width ?? 0;
  const h = size?.height ?? 0;
  const x = clamp((box.left + box.right) / 2 - w / 2, 0, box.width - w);
  const above = box.top - gap - h;
  const placement = above >= 0 ? "above" : "below";
  const y = clamp(placement === "above" ? above : box.bottom + gap, 0, box.height - h);
  return { x, y, placement };
}

// Bounds drawn on the canvas, or null when they are out of view.
function onCanvas(bounds, appState, viewport) {
  if (!Array.isArray(bounds) || bounds.length !== 4 || !bounds.every(Number.isFinite)) return null;
  const topLeft = sceneToCanvas(bounds[0], bounds[1], appState);
  const bottomRight = sceneToCanvas(bounds[2], bounds[3], appState);
  const width = viewport?.width ?? 0;
  const height = viewport?.height ?? 0;
  if (bottomRight.x < 0 || topLeft.x > width || bottomRight.y < 0 || topLeft.y > height) return null;
  return { left: topLeft.x, top: topLeft.y, right: bottomRight.x, bottom: bottomRight.y, width, height };
}

// A note's pin (171/ADR-006): centred on the top-right corner of the shape it names, kept inside the
// canvas, and gone with the shape when it scrolls out of view.
export function cornerAnchor({ bounds, appState, viewport, size }) {
  const box = onCanvas(bounds, appState, viewport);
  if (!box) return null;
  const w = size?.width ?? 0;
  const h = size?.height ?? 0;
  return { x: clamp(box.right - w / 2, 0, box.width - w), y: clamp(box.top - h / 2, 0, box.height - h) };
}

// A note's thread, beside the shape: to its right, or to its left when there is no room on the right;
// top-aligned with it, and kept inside the canvas.
export function besideAnchor({ bounds, appState, viewport, size, gap = ANCHOR_GAP }) {
  const box = onCanvas(bounds, appState, viewport);
  if (!box) return null;
  const w = size?.width ?? 0;
  const h = size?.height ?? 0;
  const side = box.right + gap + w <= box.width ? "right" : "left";
  const x = clamp(side === "right" ? box.right + gap : box.left - gap - w, 0, box.width - w);
  return { x, y: clamp(box.top, 0, box.height - h), side };
}

// The overlay's one action at a selection: Ask architect, and nothing else (171/00 Q1 — a note is
// added through the editor's bar). Nothing is drawn with nothing selected, on a read-only diagram,
// or mid-gesture: while the selection is dragged, resized or rotated, a shape or label is being
// drawn or typed, or one of the SDK's own menus is open — the states its own canvas buttons hide in.
export const MID_GESTURE = ["selectedElementsAreBeingDragged", "isResizing", "resizingElement", "isRotating", "newElement", "editingTextElement", "contextMenu", "openMenu"];
export function selectionAction({ selectedCount, readOnly, appState, bounds, viewport, size, gap = ANCHOR_GAP }) {
  if (!selectedCount || readOnly) return null;
  if (MID_GESTURE.some((key) => Boolean(appState?.[key]))) return null;
  const anchor = anchorFor({ bounds, appState, viewport, size, gap });
  return anchor ? { label: ASK_ACTION, ...anchor } : null;
}

// What the question field's placeholder calls the selection: the one shape's label, or a count.
export function selectionLabel(elements, selectedIds) {
  const ids = Object.keys(selectedIds ?? {}).filter((id) => selectedIds[id]);
  const live = (Array.isArray(elements) ? elements : []).filter((element) => element && element.isDeleted !== true);
  const chosen = live.filter((element) => ids.includes(element.id) && !(element.containerId && ids.includes(element.containerId)));
  if (chosen.length !== 1) return `${chosen.length} shapes`;
  const [shape] = chosen;
  const text = shape.type === "text" ? shape.text : live.find((element) => element.type === "text" && element.containerId === shape.id)?.text;
  return String(text ?? "").replace(/\s+/g, " ").trim() || shape.customData?.aof?.id || "this shape";
}

// The question field, as a reducer: `open` it from the action, `type`, `submit` (Enter or Ask),
// `escape` (Escape or Cancel), and the ask's own `asked` / `failed`. Escape closes and asks nothing;
// an empty question cannot be asked; a failure keeps the text and says why under the field.
export const CLOSED_FIELD = Object.freeze({ open: false, text: "", asking: false, error: null });
export function canAsk(field) {
  return Boolean(field?.open) && !field.asking && String(field.text ?? "").trim().length > 0;
}
export function fieldStep(field, event) {
  const state = field ?? CLOSED_FIELD;
  switch (event?.type) {
    case "open": return { state: { ...CLOSED_FIELD, open: true }, ask: null };
    case "type": return { state: state.asking ? state : { ...state, text: String(event.text ?? ""), error: null }, ask: null };
    case "submit": return canAsk(state) ? { state: { ...state, asking: true, error: null }, ask: state.text.trim() } : { state, ask: null };
    case "escape": return { state: state.asking ? state : CLOSED_FIELD, ask: null };
    case "asked": return { state: CLOSED_FIELD, ask: null };
    case "failed": return { state: { ...state, asking: false, error: String(event.error ?? "The architect could not be asked.") }, ask: null };
    default: return { state, ask: null };
  }
}

function clamp(value, low, high) {
  return Math.max(low, Math.min(value, Math.max(low, high)));
}
