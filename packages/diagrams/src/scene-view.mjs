// THE SCENE, SEEN AS MERMAID (milestone 170, ADR-010). A diagram is stored as Excalidraw's own scene —
// it holds everything the editor can draw, library items included — and the architect reads and
// writes it through this projection into the aof Mermaid profile. Pure and import-free beyond the
// profile, so the server (context, propose) and the browser editor (selection, compile) run the same
// rules.
//
// WHAT A SCENE ELEMENT IS, IN MERMAID:
//   node      a box (rectangle, diamond, ellipse) — its label is its bound text; or a LIBRARY ITEM:
//             the elements of one insertion of a project library item (tagged `customData.aof.lib`
//             as the library loads, and kept by the SDK's duplication), one node per insertion
//   subgraph  a frame; its members are the nodes whose `frameId` names it
//   edge      an arrow bound at both ends to nodes; its label is its bound text
//   sketch    everything else — loose text, lines, freehand, images, half-joined arrows, untagged
//             groups — named and summarised, read-only to the architect, never dropped
//
// Every node, subgraph and sketch carries its Mermaid id in `customData.aof.id`. `assignAliases` gives
// one to whatever has none (what a person drew), at save; a copied element that carries an id
// already claimed becomes new. Edge keys are computed (`<from>-><to>#<n>`, in drawing order).
import { isProfileId, serializeProfile } from "./mermaid-profile.mjs";

const BOX_TYPES = new Set(["rectangle", "diamond", "ellipse"]);
const DEFAULT_STROKE = "#1e1e1e";

const aofOf = (element) => element?.customData?.aof ?? null;
const live = (elements) => (Array.isArray(elements) ? elements : []).filter((e) => e && e.isDeleted !== true);
const outermostGroup = (element) => (Array.isArray(element.groupIds) && element.groupIds.length ? element.groupIds[element.groupIds.length - 1] : null);
const round = (value) => Math.round(Number(value) || 0);

function boundsOf(elements) {
  const boxes = elements.filter((e) => Number.isFinite(e.x) && Number.isFinite(e.width));
  if (!boxes.length) return { x: 0, y: 0, w: 0, h: 0 };
  const left = Math.min(...boxes.map((e) => e.x));
  const top = Math.min(...boxes.map((e) => e.y));
  return { x: left, y: top, w: Math.max(...boxes.map((e) => e.x + e.width)) - left, h: Math.max(...boxes.map((e) => e.y + e.height)) - top };
}

// The parts of a scene, before any id is read: which elements make which node, frame, edge or sketch.
function partsOf(elements) {
  const all = live(elements);
  const byId = new Map(all.map((e) => [e.id, e]));
  const used = new Set();
  // Library item insertions: elements tagged with a library item, one node per outermost group.
  const instances = new Map();
  for (const element of all) {
    const lib = aofOf(element)?.lib;
    if (!lib) continue;
    const key = outermostGroup(element) ?? `element:${element.id}`;
    if (!instances.has(key)) instances.set(key, { kind: "node", lib, elements: [] });
    instances.get(key).elements.push(element);
  }
  for (const instance of instances.values()) for (const element of instance.elements) used.add(element.id);
  const frames = all.filter((e) => e.type === "frame" || e.type === "magicframe").map((element) => { used.add(element.id); return { kind: "subgraph", element, elements: [element] }; });
  const boxes = [];
  for (const element of all) {
    if (used.has(element.id) || !BOX_TYPES.has(element.type)) continue;
    const label = all.find((t) => t.type === "text" && t.containerId === element.id);
    used.add(element.id);
    if (label) used.add(label.id);
    boxes.push({ kind: "node", element, label, elements: label ? [element, label] : [element] });
  }
  const nodes = [...boxes, ...instances.values()];
  const nodeOfElement = new Map();
  nodes.forEach((node, index) => { for (const element of node.elements) nodeOfElement.set(element.id, index); });
  const edges = [];
  for (const element of all) {
    if (element.type !== "arrow" || used.has(element.id)) continue;
    const from = nodeOfElement.get(element.startBinding?.elementId);
    const to = nodeOfElement.get(element.endBinding?.elementId);
    if (from === undefined || to === undefined) continue;
    const label = all.find((t) => t.type === "text" && t.containerId === element.id);
    used.add(element.id);
    if (label) used.add(label.id);
    edges.push({ kind: "edge", element, label, from, to, elements: label ? [element, label] : [element] });
  }
  // Sketches: what is left, one per outermost group (or per element).
  const sketchGroups = new Map();
  for (const element of all) {
    if (used.has(element.id)) continue;
    if (element.type === "text" && element.containerId && byId.has(element.containerId) && used.has(element.containerId)) continue;
    const key = outermostGroup(element) ?? `element:${element.id}`;
    if (!sketchGroups.has(key)) sketchGroups.set(key, { kind: "sketch", elements: [] });
    sketchGroups.get(key).elements.push(element);
  }
  return { nodes, frames, edges, sketches: [...sketchGroups.values()], byId };
}

const claimedId = (part) => {
  for (const element of part.elements) { const id = aofOf(element)?.id; if (isProfileId(id)) return id; }
  return null;
};

// Give every node, frame and sketch a Mermaid id. Returns the elements with `customData.aof.id`
// stamped where it was missing or contested, and the map element id → Mermaid id it assigned.
export function assignAliases(elements) {
  const { nodes, frames, sketches } = partsOf(elements);
  const taken = new Set();
  const assigned = new Map();
  const parts = [...nodes, ...frames, ...sketches];
  const pending = [];
  for (const part of parts) {
    const id = claimedId(part);
    if (id && !taken.has(id)) { taken.add(id); part.alias = id; } else pending.push(part);
  }
  const counters = { node: 1, subgraph: 1, sketch: 1 };
  const prefix = { node: "n", subgraph: "g", sketch: "s" };
  for (const part of pending) {
    let id;
    do { id = `${prefix[part.kind]}${counters[part.kind]++}`; } while (taken.has(id));
    taken.add(id);
    part.alias = id;
  }
  for (const part of parts) for (const element of part.elements) {
    if (element.type === "text" && element.containerId) continue; // a label belongs to its box
    if (aofOf(element)?.id !== part.alias) assigned.set(element.id, part.alias);
  }
  const stamped = (Array.isArray(elements) ? elements : []).map((element) => {
    const id = assigned.get(element.id);
    return id ? { ...element, customData: { ...(element.customData ?? {}), aof: { ...(aofOf(element) ?? {}), id } } } : element;
  });
  return { elements: stamped, assigned: Object.fromEntries(assigned) };
}

const kindOf = (arrow) => {
  const dotted = arrow.strokeStyle === "dashed" || arrow.strokeStyle === "dotted";
  const thick = Number(arrow.strokeWidth) >= 4;
  const open = arrow.endArrowhead == null;
  return `${dotted ? "dotted" : thick ? "thick" : open ? "open" : "arrow"}${(dotted || thick) && open ? "-open" : ""}`;
};
const shapeOf = (element) => (element.type === "diamond" ? "diamond" : element.type === "ellipse" ? "circle" : element.roundness ? "round" : "rect");
const textOf = (element) => String(element?.originalText ?? element?.text ?? "");
function summaryOf(elements) {
  const counts = new Map();
  for (const element of elements) counts.set(element.type, (counts.get(element.type) ?? 0) + 1);
  const parts = [...counts].map(([type, n]) => (n > 1 ? `${type} ×${n}` : type));
  const text = elements.find((e) => e.type === "text");
  return `${parts.join(", ")}${text ? `, text "${textOf(text).slice(0, 40)}"` : ""}`;
}

// The projection. `index` maps each Mermaid id (and edge key) to the scene elements that show it, so
// a selection can be named, a proposal's touched facts found, and a change compiled back.
export function projectScene(elements) {
  const { nodes, frames, edges, sketches } = partsOf(elements);
  const model = { direction: "LR", header: [], subgraphs: [], nodes: [], edges: [], styles: {}, layout: {}, paths: {}, libs: {}, sketches: {} };
  const index = {};
  const usedIds = new Set();
  const idOf = (part, fallback) => { const id = claimedId(part); const chosen = id && !usedIds.has(id) ? id : fallback; usedIds.add(chosen); return chosen; };
  const frameIds = new Map();
  frames.forEach((frame, i) => {
    const id = idOf(frame, `g_${i + 1}`);
    frameIds.set(frame.element.id, id);
    model.subgraphs.push({ id, label: String(frame.element.name ?? id), parent: null });
    index[id] = { kind: "subgraph", elementIds: [frame.element.id], container: frame.element.id };
  });
  const nodeIds = [];
  nodes.forEach((node, i) => {
    const id = idOf(node, `n_${i + 1}`);
    nodeIds.push(id);
    if (node.lib) {
      const anchor = node.elements.find((e) => aofOf(e)?.anchor) ?? null;
      const label = node.elements.find((e) => e.type === "text" && aofOf(e)?.label);
      const box = boundsOf(node.elements);
      const frame = node.elements.find((e) => e.frameId)?.frameId;
      model.nodes.push({ id, label: label ? textOf(label) : node.lib.item ?? id, shape: "rect", parent: frameIds.get(frame) ?? null });
      model.libs[id] = { library: String(node.lib.library ?? ""), item: String(node.lib.item ?? "") };
      model.layout[id] = { x: round(box.x), y: round(box.y) };
      index[id] = { kind: "node", elementIds: node.elements.map((e) => e.id), container: anchor?.id ?? null, label: label?.id ?? null, lib: true };
      return;
    }
    const element = node.element;
    model.nodes.push({ id, label: node.label ? textOf(node.label) : "", shape: shapeOf(element), parent: frameIds.get(element.frameId) ?? null });
    const style = {};
    if (element.backgroundColor && element.backgroundColor !== "transparent") style.fill = element.backgroundColor;
    if (element.strokeColor && element.strokeColor !== DEFAULT_STROKE) style.stroke = element.strokeColor;
    if (node.label?.strokeColor && node.label.strokeColor !== DEFAULT_STROKE) style.color = node.label.strokeColor;
    if (Object.keys(style).length) model.styles[id] = style;
    model.layout[id] = { x: round(element.x), y: round(element.y) };
    index[id] = { kind: "node", elementIds: node.elements.map((e) => e.id), container: element.id, label: node.label?.id ?? null };
  });
  const pairCount = new Map();
  for (const edge of edges) {
    const from = nodeIds[edge.from];
    const to = nodeIds[edge.to];
    const pair = `${from}->${to}`;
    const n = (pairCount.get(pair) ?? 0) + 1;
    pairCount.set(pair, n);
    const key = `${pair}#${n}`;
    model.edges.push({ key, from, to, kind: kindOf(edge.element), label: edge.label ? textOf(edge.label) : null });
    index[key] = { kind: "edge", elementIds: edge.elements.map((e) => e.id), container: edge.element.id, label: edge.label?.id ?? null, from, to };
  }
  sketches.forEach((sketch, i) => {
    const id = idOf(sketch, `s_${i + 1}`);
    model.sketches[id] = summaryOf(sketch.elements);
    index[id] = { kind: "sketch", elementIds: sketch.elements.map((e) => e.id), container: null };
  });
  // Each node's bound arrows, so a move or a removal reaches them.
  for (const [key, entry] of Object.entries(index)) {
    if (entry.kind !== "edge") continue;
    for (const end of [entry.from, entry.to]) (index[end].arrows ??= []).push(key);
  }
  return { model, index };
}

// The Mermaid the architect reads.
export function sceneView(elements) {
  return serializeProfile(projectScene(elements).model);
}

// The Mermaid ids a canvas selection names (a label selects its box or arrow).
export function selectionIds(elements, selectedElementIds) {
  const { index } = projectScene(elements);
  const owner = new Map();
  for (const [id, entry] of Object.entries(index)) for (const elementId of entry.elementIds) owner.set(elementId, id);
  const ids = new Set();
  for (const [elementId, selected] of Object.entries(selectedElementIds ?? {})) if (selected && owner.has(elementId)) ids.add(owner.get(elementId));
  return [...ids];
}
