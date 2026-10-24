// COMPILING A PROPOSAL INTO THE SCENE (milestone 170, ADR-012). A proposal is the Mermaid view edited;
// its `changes` are keyed facts (`node:API`, `edge:A->B#1`, `layout:API`, `lib:Fn`, …). This module
// turns those facts into edits of the stored Excalidraw scene, touching only what they name.
//
// Pure, with the SDK injected: `toElements(skeletons)` is the SDK's `convertToExcalidrawElements` (it
// measures text, so it needs the browser), `newId()` mints element ids, `hints` are the converter's
// places for the proposed view's nodes, and `libraries` are the project's library items. The editor
// normalizes the result with the SDK's `restoreElements` and sends the touched elements as operations.
//
//   first draft  the scene holds no node: the converter's whole layout is used, in one batch
//   otherwise    per change — a node added is a box (or a library item insertion: its elements
//                cloned, tagged, anchored for arrows and labelled); a label change rewrites the bound
//                text, grows the box about its centre to fit, re-centres the text and re-routes the
//                box's arrows; a move translates the node's elements and re-routes its arrows; an edge is
//                (re)drawn straight between its boxes and bound at both ends.

import { projectScene } from "@aof/diagrams/scene-view";

// The converter's own box padding (Mermaid's flowchart padding), so a relabelled box matches its peers.
const LABEL_PADDING = 15;
const GAP = 120;
const aofOf = (element) => element?.customData?.aof ?? null;
const tag = (element, aof) => ({ ...element, customData: { ...(element.customData ?? {}), aof: { ...(aofOf(element) ?? {}), ...aof } } });

export function straightArrow(a, b) {
  const ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
  const cb = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const exit = (c, half, dx, dy) => {
    if (dx === 0 && dy === 0) return { x: c.x, y: c.y };
    const t = Math.min(dx === 0 ? Infinity : half.w / Math.abs(dx), dy === 0 ? Infinity : half.h / Math.abs(dy));
    return { x: c.x + dx * t, y: c.y + dy * t };
  };
  const dx = cb.x - ca.x;
  const dy = cb.y - ca.y;
  const start = exit(ca, { w: a.w / 2, h: a.h / 2 }, dx, dy);
  const end = exit(cb, { w: b.w / 2, h: b.h / 2 }, -dx, -dy);
  return { x: Math.round(start.x), y: Math.round(start.y), points: [[0, 0], [Math.round(end.x - start.x), Math.round(end.y - start.y)]] };
}

export function boundsOf(elements) {
  const boxes = elements.filter((e) => e && !e.isDeleted && Number.isFinite(e.x) && Number.isFinite(e.width));
  if (!boxes.length) return null;
  const left = Math.min(...boxes.map((e) => e.x));
  const top = Math.min(...boxes.map((e) => e.y));
  return { x: left, y: top, w: Math.max(...boxes.map((e) => e.x + e.width)) - left, h: Math.max(...boxes.map((e) => e.y + e.height)) - top };
}

const look = (shape) => (shape === "diamond" ? { type: "diamond", roundness: null } : shape === "circle" ? { type: "ellipse", roundness: null } : shape === "round" || shape === "stadium" ? { type: "rectangle", roundness: { type: 3 } } : { type: "rectangle", roundness: null });
const edgeLook = (kind) => ({ strokeStyle: kind.startsWith("dotted") ? "dashed" : "solid", strokeWidth: kind.startsWith("thick") ? 4 : 2, endArrowhead: kind.endsWith("open") ? null : "arrow" });

// Library items for Excalidraw's panel, tagged with where they came from, so an item dragged onto the
// canvas carries its library and name (the SDK copies `customData` when it inserts). An item of several
// elements is given one group, so each insertion stays one recognisable node.
export function libraryItemsFor(items) {
  return (Array.isArray(items) ? items : []).map((entry, i) => {
    const elements = Array.isArray(entry.elements) ? entry.elements : [];
    const shared = elements.length > 1 && elements.every((e) => (e.groupIds ?? []).length) ? elements[0].groupIds.at(-1) : null;
    const common = shared && elements.every((e) => e.groupIds.at(-1) === shared) ? null : `aoflib-${i}-${String(entry.id ?? i)}`;
    return {
      id: `aof-${entry.library}-${entry.id ?? i}`,
      status: "unpublished",
      created: 0,
      name: `${entry.library}/${entry.item}`,
      elements: elements.map((element) => tag({ ...element, groupIds: common && elements.length > 1 ? [...(element.groupIds ?? []), common] : (element.groupIds ?? []) }, { lib: { library: entry.library, item: entry.item } })),
    };
  });
}

// ── the first draft: the converter's whole layout ───────────────────────────────────────────────
// `converted` is the converter's skeleton list for the proposed view: node and subgraph ids are kept,
// edges are named `<from>_<to>` (parallel edges alike, so they are matched in order).
export function firstDraftSkeletons(converted, proposed, { newId }) {
  const ids = new Map();
  const out = [];
  const edgeQueue = new Map();
  for (const edge of proposed.edges) {
    const pair = `${edge.from}->${edge.to}`;
    if (!edgeQueue.has(pair)) edgeQueue.set(pair, []);
    edgeQueue.get(pair).push(edge);
  }
  const groups = new Set(proposed.subgraphs.map((g) => g.id));
  const nodes = new Map(proposed.nodes.map((n) => [n.id, n]));
  for (const skeleton of converted) {
    if (skeleton.type === "arrow") continue;
    const id = newId();
    ids.set(skeleton.id, id);
    if (groups.has(skeleton.id)) {
      const group = proposed.subgraphs.find((g) => g.id === skeleton.id);
      out.push({ type: "frame", id, x: skeleton.x, y: skeleton.y, width: skeleton.width, height: skeleton.height, name: group.label, children: [], customData: { aof: { id: group.id } } });
    } else if (nodes.has(skeleton.id)) {
      const node = nodes.get(skeleton.id);
      const style = proposed.styles[node.id] ?? {};
      out.push({ ...skeleton, ...look(node.shape), id, groupIds: [], label: { ...(skeleton.label ?? {}), text: node.label, ...(style.color ? { strokeColor: style.color } : {}) }, customData: { aof: { id: node.id } }, ...(style.fill ? { backgroundColor: style.fill, fillStyle: "solid" } : {}), ...(style.stroke ? { strokeColor: style.stroke } : {}) });
    }
  }
  for (const skeleton of converted) {
    if (skeleton.type !== "arrow") continue;
    const edge = edgeQueue.get(`${skeleton.start?.id}->${skeleton.end?.id}`)?.shift();
    if (!edge) continue;
    out.push({ ...skeleton, ...edgeLook(edge.kind), id: newId(), groupIds: [], start: { id: ids.get(edge.from) }, end: { id: ids.get(edge.to) }, ...(edge.label ? { label: { ...(skeleton.label ?? {}), text: edge.label } } : { label: undefined }) });
    if (!edge.label) delete out.at(-1).label;
  }
  // Frame membership: each node inside the frame its subgraph became.
  return { skeletons: out, frameOf: (nodeId) => ids.get(nodes.get(nodeId)?.parent) ?? null };
}

// ── incremental changes ─────────────────────────────────────────────────────────────────────────
export function compileProposal({ elements, changes, proposed, hints = new Map(), libraries = [], toElements, newId }) {
  const list = (Array.isArray(elements) ? elements : []).map((e) => ({ ...e }));
  const byId = new Map(list.map((e) => [e.id, e]));
  const touched = new Set();
  const unresolved = [];
  const { model: base, index } = projectScene(list);
  const add = (element) => { list.push(element); byId.set(element.id, element); touched.add(element.id); return element; };
  const patch = (id, fields) => { const element = byId.get(id); if (!element) return; Object.assign(element, fields); touched.add(id); };
  const remove = (id) => patch(id, { isDeleted: true });
  const nodeBox = (id) => {
    const entry = index[id] ?? added.get(id);
    if (!entry) return null;
    const container = entry.container ? byId.get(entry.container) : null;
    return container ? { x: container.x, y: container.y, w: container.width, h: container.height } : boundsOf(entry.elementIds.map((e) => byId.get(e)));
  };
  const added = new Map(); // nodes added in this compile: id → { container, elementIds }
  const frames = new Map(Object.entries(index).filter(([, e]) => e.kind === "subgraph").map(([id, e]) => [id, e.container]));
  const kinds = (prefix, change) => changes.filter((c) => c.key.startsWith(`${prefix}:`) && (change ? c.change === change : true)).map((c) => c.key.slice(prefix.length + 1));
  const proposedNode = (id) => proposed.nodes.find((n) => n.id === id);
  const proposedEdge = (key) => proposed.edges.find((e) => e.key === key);
  const unbind = (containerId, arrowId) => { const c = byId.get(containerId); if (c?.boundElements) patch(containerId, { boundElements: c.boundElements.filter((b) => b.id !== arrowId) }); };
  const deleteEdge = (key) => {
    const entry = index[key];
    if (!entry) return;
    for (const elementId of entry.elementIds) remove(elementId);
    for (const end of [entry.from, entry.to]) if (index[end]?.container) unbind(index[end].container, entry.container);
  };
  // A text's measured size, for a box to fit its label and the label to sit centred.
  const measure = (text, fontSize) => {
    const [made] = toElements([{ type: "text", x: 0, y: 0, text, ...(fontSize ? { fontSize } : {}) }]);
    return { w: made?.width ?? text.length * 10, h: made?.height ?? 25 };
  };
  // A library node's label sits centred under its item.
  const underItem = (box, size) => ({ x: box.x + (box.w - size.w) / 2, y: box.y + box.h + 8 });

  // 1. Removals: edges, then nodes (with their remaining arrows), then subgraphs.
  for (const key of kinds("edge", "removed")) deleteEdge(key);
  for (const id of kinds("node", "removed")) {
    for (const key of index[id]?.arrows ?? []) deleteEdge(key);
    for (const elementId of index[id]?.elementIds ?? []) remove(elementId);
  }
  for (const id of kinds("subgraph", "removed")) {
    const frameId = frames.get(id);
    if (!frameId) continue;
    remove(frameId);
    for (const element of list) if (element.frameId === frameId && !element.isDeleted) patch(element.id, { frameId: null });
    frames.delete(id);
  }

  // 2. Subgraphs added or renamed (frames first, so nodes can join them).
  for (const id of kinds("subgraph", "added")) {
    const group = proposed.subgraphs.find((g) => g.id === id);
    const [frame] = toElements([{ type: "frame", id: newId(), x: 0, y: 0, width: 200, height: 120, name: group.label, children: [] }]);
    add(tag({ ...frame, name: group.label }, { id }));
    frames.set(id, frame.id);
  }
  for (const id of kinds("subgraph", "changed")) {
    const group = proposed.subgraphs.find((g) => g.id === id);
    if (frames.get(id)) patch(frames.get(id), { name: group.label });
  }

  // 3. Nodes added: a place from the proposal, else the converter's place aligned to a node both share,
  //    else to the right of the drawing.
  const content = boundsOf(list.filter((e) => !e.isDeleted));
  const anchorDelta = (() => {
    for (const node of proposed.nodes) {
      const hint = hints.get(node.id);
      const box = index[node.id] ? nodeBox(node.id) : null;
      if (hint && box) return { x: box.x - hint.x, y: box.y - hint.y };
    }
    return null;
  })();
  let fallback = content ? { x: content.x + content.w + GAP, y: content.y } : { x: 0, y: 0 };
  const placeOf = (id) => {
    const layout = proposed.layout[id];
    if (layout) return { x: layout.x, y: layout.y };
    const hint = hints.get(id);
    if (hint && anchorDelta) return { x: hint.x + anchorDelta.x, y: hint.y + anchorDelta.y };
    if (hint && !content) return { x: hint.x, y: hint.y };
    const spot = { ...fallback };
    fallback = { x: fallback.x, y: fallback.y + 100 };
    return spot;
  };
  for (const id of kinds("node", "added")) {
    const node = proposedNode(id);
    const at = placeOf(id);
    const frameId = node.parent ? frames.get(node.parent) ?? null : null;
    const lib = proposed.libs[id];
    if (lib) {
      const item = libraries.find((entry) => entry.library === lib.library && entry.item === lib.item);
      if (!item) { unresolved.push(`${id}: ${lib.library}/"${lib.item}" is not in the project libraries`); continue; }
      const map = new Map(item.elements.map((e) => [e.id, newId()]));
      const groupMap = new Map();
      const instance = newId();
      const source = boundsOf(item.elements) ?? { x: 0, y: 0, w: 0, h: 0 };
      const dx = at.x - source.x;
      const dy = at.y - source.y;
      const remap = (ref) => (ref && map.has(ref) ? map.get(ref) : ref);
      const ids = [];
      for (const element of item.elements) {
        const groupIds = [...(element.groupIds ?? []).map((g) => { if (!groupMap.has(g)) groupMap.set(g, newId()); return groupMap.get(g); }), instance];
        const copy = tag({
          ...element, id: map.get(element.id), x: element.x + dx, y: element.y + dy, groupIds, frameId,
          containerId: remap(element.containerId) ?? null,
          boundElements: element.boundElements ? element.boundElements.map((b) => ({ ...b, id: remap(b.id) })) : null,
          ...(element.startBinding ? { startBinding: { ...element.startBinding, elementId: remap(element.startBinding.elementId) } } : {}),
          ...(element.endBinding ? { endBinding: { ...element.endBinding, elementId: remap(element.endBinding.elementId) } } : {}),
          isDeleted: false,
        }, { id, lib: { library: lib.library, item: lib.item } });
        add(copy); ids.push(copy.id);
      }
      const box = { x: source.x + dx, y: source.y + dy, w: source.w, h: source.h };
      const [anchor] = toElements([{ type: "rectangle", id: newId(), x: box.x, y: box.y, width: box.w, height: box.h, strokeColor: "transparent", backgroundColor: "transparent" }]);
      add(tag({ ...anchor, groupIds: [instance], frameId }, { id, lib: { library: lib.library, item: lib.item }, anchor: true }));
      const [label] = toElements([{ type: "text", id: newId(), x: box.x, y: box.y + box.h + 8, text: node.label }]);
      add(tag({ ...label, ...underItem(box, { w: label.width, h: label.height }), groupIds: [instance], frameId }, { id, lib: { library: lib.library, item: lib.item }, label: true }));
      added.set(id, { container: anchor.id, elementIds: [...ids, anchor.id, label.id] });
      continue;
    }
    const style = proposed.styles[id] ?? {};
    const hint = hints.get(id);
    const made = toElements([{
      ...look(node.shape), id: newId(), x: at.x, y: at.y, ...(hint ? { width: hint.w, height: hint.h } : {}),
      label: { text: node.label, ...(style.color ? { strokeColor: style.color } : {}) },
      ...(style.fill ? { backgroundColor: style.fill, fillStyle: "solid" } : {}), ...(style.stroke ? { strokeColor: style.stroke } : {}),
    }]);
    const container = made.find((e) => e.type !== "text");
    for (const element of made) add(element === container ? tag({ ...element, frameId }, { id }) : { ...element, frameId });
    added.set(id, { container: container.id, elementIds: made.map((e) => e.id) });
  }

  // 4. Nodes changed: label, shape, subgraph. A box that must grow keeps its centre — the converter lays
  //    nodes out by centre, so the growth is shared by the gaps on both sides — and its arrows are
  //    re-routed in step 7.
  const resized = new Set();
  for (const id of kinds("node", "changed")) {
    const before = base.nodes.find((n) => n.id === id);
    const after = proposedNode(id);
    const entry = index[id];
    if (!before || !after || !entry) continue;
    if (before.label !== after.label) {
      const label = entry.label ? byId.get(entry.label) : null;
      if (label) {
        const size = measure(after.label, label.fontSize);
        const container = byId.get(entry.container);
        if (entry.lib) {
          const anchor = { x: container.x, y: container.y, w: container.width, h: container.height };
          patch(label.id, { text: after.label, originalText: after.label, width: size.w, height: size.h, ...underItem(anchor, size) });
        } else {
          const width = Math.max(container.width, Math.ceil(size.w + LABEL_PADDING * 2));
          const height = Math.max(container.height, Math.ceil(size.h + LABEL_PADDING));
          if (width !== container.width || height !== container.height) {
            patch(container.id, { x: container.x - (width - container.width) / 2, y: container.y - (height - container.height) / 2, width, height });
            resized.add(id);
          }
          patch(label.id, { text: after.label, originalText: after.label, width: size.w, height: size.h, x: container.x + (width - size.w) / 2, y: container.y + (height - size.h) / 2 });
        }
      } else if (entry.container) {
        const container = byId.get(entry.container);
        const [text] = toElements([{ type: "text", id: newId(), x: container.x, y: container.y, text: after.label }]);
        add({ ...text, containerId: container.id, textAlign: "center", verticalAlign: "middle", x: container.x + (container.width - text.width) / 2, y: container.y + (container.height - text.height) / 2 });
        patch(container.id, { boundElements: [...(container.boundElements ?? []), { id: text.id, type: "text" }] });
      }
    }
    if (before.shape !== after.shape && !entry.lib) patch(entry.container, look(after.shape));
    if (before.parent !== after.parent) {
      const frameId = after.parent ? frames.get(after.parent) ?? null : null;
      for (const elementId of entry.elementIds) patch(elementId, { frameId });
    }
  }

  // 5. Styles.
  for (const id of kinds("style")) {
    const entry = index[id] ?? added.get(id);
    if (!entry?.container || index[id]?.kind === "subgraph") continue;
    const style = proposed.styles[id] ?? {};
    patch(entry.container, { backgroundColor: style.fill ?? "transparent", ...(style.fill ? { fillStyle: "solid" } : {}), strokeColor: style.stroke ?? "#1e1e1e" });
    if (index[id]?.label) patch(index[id].label, { strokeColor: style.color ?? "#1e1e1e" });
  }

  // 6. Moves: translate the node's elements; its arrows are redrawn in step 7.
  const moved = new Set();
  for (const id of kinds("layout", "changed")) {
    const entry = index[id];
    const target = proposed.layout[id];
    const box = nodeBox(id);
    if (!entry || !target || !box) continue;
    const dx = target.x - box.x;
    const dy = target.y - box.y;
    if (!dx && !dy) continue;
    for (const elementId of entry.elementIds) { const e = byId.get(elementId); patch(elementId, { x: e.x + dx, y: e.y + dy }); }
    moved.add(id);
  }

  // 7. Edges: added and changed edges are (re)drawn; a moved or resized node's other edges are
  //    re-routed, their labels re-centred on the new line.
  const draw = (edge) => {
    const from = (index[edge.from] ?? added.get(edge.from))?.container;
    const to = (index[edge.to] ?? added.get(edge.to))?.container;
    const a = nodeBox(edge.from);
    const b = nodeBox(edge.to);
    if (!from || !to || !a || !b) { unresolved.push(`${edge.key}: an end has no box to bind to`); return; }
    const route = straightArrow(a, b);
    const made = toElements([{ type: "arrow", id: newId(), ...route, ...edgeLook(edge.kind), ...(edge.label ? { label: { text: edge.label } } : {}) }]);
    const arrow = made.find((e) => e.type === "arrow");
    for (const element of made) add(element === arrow ? { ...element, startBinding: { elementId: from, focus: 0, gap: 4 }, endBinding: { elementId: to, focus: 0, gap: 4 } } : element);
    for (const end of new Set([from, to])) { const c = byId.get(end); patch(end, { boundElements: [...(c.boundElements ?? []), { id: arrow.id, type: "arrow" }] }); }
  };
  for (const key of kinds("edge", "changed")) { deleteEdge(key); const edge = proposedEdge(key); if (edge) draw(edge); }
  for (const key of kinds("edge", "added")) { const edge = proposedEdge(key); if (edge) draw(edge); }
  const redrawn = new Set([...kinds("edge", "changed"), ...kinds("edge", "removed")]);
  for (const id of new Set([...moved, ...resized])) {
    for (const key of index[id]?.arrows ?? []) {
      if (redrawn.has(key)) continue;
      redrawn.add(key);
      const entry = index[key];
      const arrow = byId.get(entry.container);
      const a = nodeBox(entry.from);
      const b = nodeBox(entry.to);
      if (!arrow || !a || !b) continue;
      const route = straightArrow(a, b);
      const label = entry.label ? byId.get(entry.label) : null;
      if (label) patch(label.id, { x: route.x + route.points[1][0] / 2 - label.width / 2, y: route.y + route.points[1][1] / 2 - label.height / 2 });
      patch(arrow.id, { ...route, width: Math.abs(route.points[1][0]), height: Math.abs(route.points[1][1]) });
    }
  }

  // 8. Frames fit their members.
  for (const [id, frameId] of frames) {
    const frame = byId.get(frameId);
    if (!frame || frame.isDeleted) continue;
    const members = list.filter((e) => e.frameId === frameId && !e.isDeleted);
    const box = boundsOf(members);
    if (!box) continue;
    const next = { x: box.x - 24, y: box.y - 36, width: box.w + 48, height: box.h + 60 };
    // A fit that changes nothing is not an edit: it would make the frame look changed to Excalidraw and
    // send an update accept may refuse.
    const fits = Object.entries(next).every(([key, value]) => frame[key] === value);
    if (!fits && (touched.has(frameId) || members.some((e) => touched.has(e.id)))) patch(frameId, next);
    void id;
  }
  return { elements: list, touched, unresolved };
}

// The operations accept sends: every element the compile touched, as it now is.
export function operationsFor(before, after, touched) {
  const prior = new Map((Array.isArray(before) ? before : []).map((e) => [e.id, e]));
  const operations = [];
  for (const element of after) {
    if (!touched.has(element.id)) continue;
    if (!prior.has(element.id)) { if (!element.isDeleted) operations.push({ op: "add", element }); continue; }
    const { id, ...fields } = element;
    operations.push({ op: "update", id, patch: fields });
  }
  return operations;
}
