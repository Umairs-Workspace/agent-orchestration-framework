// THE AOF MERMAID PROFILE — the ONE format of an ADR diagram (milestone 170, ADR-006).
//
// A diagram is `diagrams/ADR-NNN-<slug>.mmd`: a Mermaid FLOWCHART in a canonical subset, plus `%% aof:`
// comment lines carrying what Mermaid cannot say and collaboration needs — the position and size a
// human gave a node, the path they bent an arrow into. `%%` lines are Mermaid comments, so the file
// stays valid Mermaid: GitHub, mermaid.live and the Excalidraw converter all read it and ignore the
// extension (measured: the converter keeps node ids as element ids, applies per-node `style`, and
// skips `%%` lines; it drops positions, parallel-edge identity and some shape kinds, which the model
// below keeps).
//
// IMPORT-FREE ON PURPOSE. The server (validation, merge) and the browser editor (the canvas round
// trip) run this same module; it touches no node API and no DOM. Errors are plain Errors carrying a
// `code`, a `status` and, for a parse error, the 1-based `line`.
//
// THE MODEL (JSON-safe, deterministic):
//   { direction, header: string[],
//     subgraphs: [{ id, label, parent }], nodes: [{ id, label, shape, parent }],
//     edges: [{ key, from, to, kind, label }],
//     styles: { [id]: { fill?, stroke?, color? } },
//     layout: { [nodeId]: { x, y, w?, h? } },   (a size only when a person chose it)
//     paths:  { [edgeKey]: { x, y, points: [[dx, dy], …] } },
//     libs:   { [nodeId]: { library, item } },   a node placed from a project library item
//     sketches: { [id]: summary } }               read-only: what Mermaid cannot express, by name
//
// Since milestone 170's ADR-010 the profile is the architect's VIEW of a diagram, not its storage:
// the stored file is Excalidraw's own scene, projected into this form (scene-view.mjs), and a
// proposal is this form edited.
// An edge's identity is `<from>-><to>#<n>`, n counting edges between that ordered pair in file order:
// Mermaid 10 has no edge ids, and the converter gives parallel edges the same element id.

export const PROFILE_VERSION = 1;
export const DIRECTIONS = Object.freeze(["LR", "RL", "TB", "TD", "BT"]);
export const SHAPES = Object.freeze({
  rect: ["[", "]"], round: ["(", ")"], stadium: ["([", "])"], subroutine: ["[[", "]]"],
  cylinder: ["[(", ")]"], circle: ["((", "))"], diamond: ["{", "}"], hexagon: ["{{", "}}"], asymmetric: [">", "]"],
});
export const EDGE_KINDS = Object.freeze({ arrow: "-->", open: "---", dotted: "-.->", "dotted-open": "-.-", thick: "==>", "thick-open": "===" });
export const STYLE_PROPS = Object.freeze(["fill", "stroke", "color"]);
export const LIMITS = Object.freeze({ nodes: 2000, edges: 4000, label: 500, id: 64, bytes: 512 * 1024 });

const ID = /^[A-Za-z][A-Za-z0-9_]*$/;
const RESERVED = new Set(["end", "subgraph", "graph", "flowchart", "style", "class", "classdef", "click", "linkstyle", "direction", "default"]);
// Openers longest first, so `([` is not read as `(`.
const OPENERS = Object.entries(SHAPES).map(([shape, [open, close]]) => ({ shape, open, close })).sort((a, b) => b.open.length - a.open.length);
const OPS = Object.entries(EDGE_KINDS).map(([kind, op]) => ({ kind, op })).sort((a, b) => b.op.length - a.op.length);
const KIND_OF = Object.fromEntries(Object.entries(EDGE_KINDS).map(([kind, op]) => [op, kind]));
const COLOR = /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?([0-9A-Fa-f]{2})?$|^[a-z]+$/;
const NUM = /^-?\d+(\.\d+)?$/;

function profileError(message, code = "diagram-mermaid-invalid", line = null) {
  const error = new Error(line == null ? message : `line ${line}: ${message}`);
  error.code = code;
  error.status = 400;
  if (line != null) error.line = line;
  return error;
}

// ── labels ──────────────────────────────────────────────────────────────────────────────────────
// Written always quoted. `"` is `#quot;`, a backtick (which would start a Markdown string) `#96;`, a
// `#` that would read as an entity `#35;`, and a newline `<br/>`.
export function encodeLabel(text) {
  return String(text ?? "")
    .replace(/#(?=[A-Za-z0-9]+;)/g, "#35;")
    .replace(/"/g, "#quot;")
    .replace(/`/g, "#96;")
    .replace(/\r?\n/g, "<br/>");
}
export function decodeLabel(text) {
  return String(text ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/#(quot|amp|lt|gt|nbsp);/g, (_, name) => ({ quot: '"', amp: "&", lt: "<", gt: ">", nbsp: " " })[name])
    .replace(/#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

// The whole id rule, for a reader that must not throw — the scene's projection keeps a claimed id
// only when the parser would read it back.
export const isProfileId = (id) => typeof id === "string" && ID.test(id) && id.length <= LIMITS.id && !RESERVED.has(id.toLowerCase());

function checkId(id, line) {
  if (!ID.test(id) || id.length > LIMITS.id) throw profileError(`"${id}" is not a profile id: a letter, then letters, digits or _, at most ${LIMITS.id} characters.`, "diagram-mermaid-invalid", line);
  if (RESERVED.has(id.toLowerCase())) throw profileError(`"${id}" is a Mermaid keyword and cannot be an id.`, "diagram-mermaid-invalid", line);
  return id;
}

// ── parse ───────────────────────────────────────────────────────────────────────────────────────
// A node reference: `<id>` with an optional shape and label — `API`, `API["API service"]`, `S[(Store)]`.
function readNode(text, at, line) {
  const id = /^[A-Za-z][A-Za-z0-9_]*/.exec(text.slice(at))?.[0];
  if (!id) throw profileError(`expected a node id at "${text.slice(at, at + 20)}".`, "diagram-mermaid-invalid", line);
  checkId(id, line);
  let i = at + id.length;
  const opener = OPENERS.find(({ open }) => text.startsWith(open, i));
  if (!opener) {
    if (text.startsWith(":::", i)) throw profileError("classes (`:::`) are not in the aof profile; use `style <id> fill:…,stroke:…`.", "diagram-mermaid-unsupported", line);
    return { id, shape: null, label: null, end: i };
  }
  i += opener.open.length;
  let label;
  if (text[i] === '"') {
    const close = text.indexOf('"', i + 1);
    if (close < 0) throw profileError(`the label of "${id}" opens a quote it never closes.`, "diagram-mermaid-invalid", line);
    label = text.slice(i + 1, close);
    i = close + 1;
  } else {
    const close = text.indexOf(opener.close, i);
    if (close < 0) throw profileError(`the shape of "${id}" opens "${opener.open}" and never closes it with "${opener.close}".`, "diagram-mermaid-invalid", line);
    label = text.slice(i, close).trim();
    i = close;
  }
  if (!text.startsWith(opener.close, i)) throw profileError(`the shape of "${id}" must close with "${opener.close}".`, "diagram-mermaid-invalid", line);
  i += opener.close.length;
  if (text.startsWith(":::", i)) throw profileError("classes (`:::`) are not in the aof profile; use `style <id> fill:…,stroke:…`.", "diagram-mermaid-unsupported", line);
  return { id, shape: opener.shape, label: decodeLabel(label), end: i };
}

function readOp(text, at, line) {
  const rest = text.slice(at);
  const found = OPS.find(({ op }) => rest.startsWith(op));
  if (!found) {
    if (/^--\s*[^->]/.test(rest) || /^==\s*[^=>]/.test(rest)) throw profileError('write an edge label as `-->|"label"|`, not `-- label -->`.', "diagram-mermaid-unsupported", line);
    throw profileError(`expected an edge (${Object.values(EDGE_KINDS).join(" ")}) at "${rest.slice(0, 20)}".`, "diagram-mermaid-invalid", line);
  }
  let i = at + found.op.length;
  let label = null;
  if (text[i] === "|") {
    const quoted = text[i + 1] === '"';
    const close = quoted ? text.indexOf('"|', i + 2) : text.indexOf("|", i + 1);
    if (close < 0) throw profileError("an edge label opens `|` and never closes it.", "diagram-mermaid-invalid", line);
    label = decodeLabel(quoted ? text.slice(i + 2, close) : text.slice(i + 1, close).trim());
    i = close + (quoted ? 2 : 1);
  }
  return { kind: found.kind, label, end: i };
}

const skipSpace = (text, i) => { while (text[i] === " " || text[i] === "\t") i += 1; return i; };

function readDirective(body, line, model) {
  const parts = body.trim().split(/\s+/);
  const word = parts.shift();
  const fields = Object.fromEntries(parts.map((part) => { const eq = part.indexOf("="); return eq < 0 ? [part, ""] : [part.slice(0, eq), part.slice(eq + 1)]; }));
  if (word === "aof:profile") {
    if (Number(parts[0]) !== PROFILE_VERSION) throw profileError(`this file declares aof profile ${parts[0]}; this aof reads profile ${PROFILE_VERSION}.`, "diagram-mermaid-unsupported", line);
    return;
  }
  const number = (name) => {
    if (!NUM.test(fields[name] ?? "")) throw profileError(`${word} needs a number for ${name}=.`, "diagram-mermaid-invalid", line);
    return Math.round(Number(fields[name]));
  };
  if (word === "aof:node") {
    const id = checkId(parts[0] ?? "", line);
    // A size is written only when a person resized the box; otherwise the label decides it.
    if (("w" in fields) !== ("h" in fields)) throw profileError("aof:node takes w= and h= together, or neither.", "diagram-mermaid-invalid", line);
    model.layout[id] = { x: number("x"), y: number("y"), ...("w" in fields ? { w: number("w"), h: number("h") } : {}) };
    return;
  }
  if (word === "aof:edge") {
    const key = parts[0] ?? "";
    if (!/^[A-Za-z][A-Za-z0-9_]*->[A-Za-z][A-Za-z0-9_]*#\d+$/.test(key)) throw profileError(`"${key}" is not an edge key (<from>-><to>#<n>).`, "diagram-mermaid-invalid", line);
    const points = (fields.points ?? "").split(";").filter(Boolean).map((pair) => pair.split(",").map((value) => { if (!NUM.test(value)) throw profileError("aof:edge points are `dx,dy;dx,dy;…`.", "diagram-mermaid-invalid", line); return Math.round(Number(value)); }));
    if (points.length < 2 || points.some((pair) => pair.length !== 2)) throw profileError("aof:edge needs at least two points.", "diagram-mermaid-invalid", line);
    model.paths[key] = { x: number("x"), y: number("y"), points };
    return;
  }
  if (word === "aof:lib") {
    const id = checkId(parts[0] ?? "", line);
    // The library is its file's name, so it may hold spaces ("Azure Icons"); it ends at the `/"` that
    // opens the item, and a file name never holds a `/`.
    const ref = /^aof:lib\s+\S+\s+([^\s/"][^/"]*)\/"([^"]*)"\s*$/.exec(body.trim());
    if (!ref || ref[2].trim() === "") throw profileError('aof:lib reads `%% aof:lib <id> <library>/"<item name>"`.', "diagram-mermaid-invalid", line);
    model.libs[id] = { library: ref[1], item: decodeLabel(ref[2]) };
    return;
  }
  if (word === "aof:sketch") {
    const id = checkId(parts[0] ?? "", line);
    const summary = /^aof:sketch\s+\S+\s+"([^"]*)"\s*$/.exec(body.trim());
    model.sketches[id] = summary ? decodeLabel(summary[1]) : "";
    return;
  }
  throw profileError(`"%% ${word}" is not an aof directive (aof:profile, aof:node, aof:edge, aof:lib, aof:sketch).`, "diagram-mermaid-unsupported", line);
}

export function parseProfile(text) {
  const source = String(text ?? "");
  if (source.length > LIMITS.bytes) throw profileError(`a diagram is at most ${LIMITS.bytes} characters.`, "diagram-mermaid-too-large");
  const model = { direction: null, header: [], subgraphs: [], nodes: [], edges: [], styles: {}, layout: {}, paths: {}, libs: {}, sketches: {} };
  const nodeIndex = new Map();
  const subgraphIds = new Set();
  const stack = [];
  const pairCount = new Map();
  let statements = 0;
  const lines = source.split(/\r?\n/);
  const touch = (ref, line) => {
    const parent = stack.at(-1) ?? null;
    if (subgraphIds.has(ref.id)) throw profileError(`"${ref.id}" is a subgraph and cannot also be a node.`, "diagram-mermaid-invalid", line);
    let node = nodeIndex.get(ref.id);
    if (!node) {
      node = { id: ref.id, label: ref.id, shape: "rect", parent };
      nodeIndex.set(ref.id, node);
      model.nodes.push(node);
    }
    if (ref.shape) { node.shape = ref.shape; node.label = ref.label; }
    return node;
  };
  lines.forEach((raw, index) => {
    const line = index + 1;
    const text = raw.trim().replace(/;$/, "").trimEnd();
    if (text === "") return;
    if (text.startsWith("%%")) {
      const body = text.slice(2).trim();
      if (body.startsWith("{")) throw profileError("`%%{init}%%` directives are not in the aof profile.", "diagram-mermaid-unsupported", line);
      if (body.startsWith("aof:")) { readDirective(body, line, model); return; }
      if (statements === 0) model.header.push(body);
      return;
    }
    if (model.direction == null) {
      const header = /^(flowchart|graph)\s+(LR|RL|TB|TD|BT)$/.exec(text);
      if (!header) throw profileError("a diagram starts `flowchart LR` (or RL, TB, TD, BT): the aof profile is a flowchart.", "diagram-mermaid-unsupported", line);
      model.direction = header[2];
      return;
    }
    statements += 1;
    const sub = /^subgraph\s+([A-Za-z][A-Za-z0-9_]*)\s*(?:\[\s*"([^"]*)"\s*\]|\[\s*([^\]]*)\])?$/.exec(text);
    if (sub) {
      const id = checkId(sub[1], line);
      if (subgraphIds.has(id) || nodeIndex.has(id)) throw profileError(`"${id}" is declared twice.`, "diagram-mermaid-invalid", line);
      subgraphIds.add(id);
      model.subgraphs.push({ id, label: decodeLabel(sub[2] ?? sub[3] ?? id), parent: stack.at(-1) ?? null });
      stack.push(id);
      return;
    }
    if (text.startsWith("subgraph")) throw profileError('write a subgraph as `subgraph <id>["label"]`.', "diagram-mermaid-invalid", line);
    if (text === "end") {
      if (stack.length === 0) throw profileError("`end` closes no subgraph.", "diagram-mermaid-invalid", line);
      stack.pop();
      return;
    }
    if (/^direction\b/.test(text)) throw profileError("a subgraph `direction` is not in the aof profile.", "diagram-mermaid-unsupported", line);
    if (/^(classDef|class|click|linkStyle)\b/.test(text)) throw profileError(`\`${text.split(/\s/)[0]}\` is not in the aof profile; use \`style <id> fill:…,stroke:…\`.`, "diagram-mermaid-unsupported", line);
    const style = /^style\s+([A-Za-z][A-Za-z0-9_]*)\s+(.+)$/.exec(text);
    if (style) {
      const id = checkId(style[1], line);
      const props = {};
      for (const pair of style[2].split(",")) {
        const [name, value] = pair.split(":").map((part) => part?.trim());
        if (!STYLE_PROPS.includes(name)) throw profileError(`style "${name}" is not in the aof profile (${STYLE_PROPS.join(", ")}).`, "diagram-mermaid-unsupported", line);
        if (!COLOR.test(value ?? "")) throw profileError(`style ${name} needs a colour (#rgb, #rrggbb or a name).`, "diagram-mermaid-invalid", line);
        props[name] = value;
      }
      model.styles[id] = { ...(model.styles[id] ?? {}), ...props };
      return;
    }
    if (/\s&\s/.test(text)) throw profileError("`&` is not in the aof profile: write one edge per line.", "diagram-mermaid-unsupported", line);
    // A node declaration, or a chain of edges `A --> B -->|"x"| C` (inline shapes allowed).
    const first = readNode(text, 0, line);
    let previous = touch(first, line);
    let i = skipSpace(text, first.end);
    while (i < text.length) {
      const op = readOp(text, i, line);
      i = skipSpace(text, op.end);
      const ref = readNode(text, i, line);
      const next = touch(ref, line);
      const pair = `${previous.id}->${next.id}`;
      const n = (pairCount.get(pair) ?? 0) + 1;
      pairCount.set(pair, n);
      model.edges.push({ key: `${pair}#${n}`, from: previous.id, to: next.id, kind: op.kind, label: op.label });
      previous = next;
      i = skipSpace(text, ref.end);
    }
  });
  if (model.direction == null) throw profileError("a diagram starts `flowchart LR` (or RL, TB, TD, BT).", "diagram-mermaid-unsupported");
  if (stack.length) throw profileError(`subgraph "${stack.at(-1)}" is never closed with \`end\`.`);
  const problems = validateModel(model);
  if (problems.length) throw profileError(problems.join(" "));
  return model;
}

// ── validate ────────────────────────────────────────────────────────────────────────────────────
export function validateModel(model) {
  const problems = [];
  const nodes = new Set();
  const groups = new Set();
  for (const group of model.subgraphs ?? []) {
    if (!isProfileId(group.id) || groups.has(group.id)) problems.push(`subgraph "${group.id}" is not a unique id.`);
    groups.add(group.id);
  }
  for (const node of model.nodes ?? []) {
    if (!isProfileId(node.id) || nodes.has(node.id) || groups.has(node.id)) problems.push(`node "${node.id}" is not a unique id.`);
    if (!SHAPES[node.shape]) problems.push(`node "${node.id}" has an unknown shape "${node.shape}".`);
    if (String(node.label ?? "").length > LIMITS.label) problems.push(`node "${node.id}"'s label is over ${LIMITS.label} characters.`);
    nodes.add(node.id);
  }
  for (const item of [...(model.nodes ?? []), ...(model.subgraphs ?? [])]) {
    if (item.parent != null && !groups.has(item.parent)) problems.push(`"${item.id}" sits in subgraph "${item.parent}", which does not exist.`);
  }
  for (const group of model.subgraphs ?? []) {
    const seen = new Set([group.id]);
    for (let at = group.parent; at != null; at = model.subgraphs.find((g) => g.id === at)?.parent ?? null) {
      if (seen.has(at)) { problems.push(`subgraph "${group.id}" is nested inside itself.`); break; }
      seen.add(at);
    }
  }
  const keys = new Set();
  for (const edge of model.edges ?? []) {
    if (!nodes.has(edge.from) || !nodes.has(edge.to)) problems.push(`edge ${edge.key} joins a node that does not exist.`);
    if (!EDGE_KINDS[edge.kind]) problems.push(`edge ${edge.key} has an unknown kind "${edge.kind}".`);
    if (keys.has(edge.key)) problems.push(`edge ${edge.key} appears twice.`);
    keys.add(edge.key);
  }
  for (const id of Object.keys(model.styles ?? {})) if (!nodes.has(id) && !groups.has(id)) problems.push(`style names "${id}", which is not a node or subgraph.`);
  for (const id of Object.keys(model.layout ?? {})) if (!nodes.has(id)) problems.push(`aof:node names "${id}", which is not a node.`);
  for (const key of Object.keys(model.paths ?? {})) if (!keys.has(key)) problems.push(`aof:edge names "${key}", which is not an edge.`);
  for (const id of Object.keys(model.libs ?? {})) if (!nodes.has(id)) problems.push(`aof:lib names "${id}", which is not a node.`);
  for (const id of Object.keys(model.sketches ?? {})) if (nodes.has(id) || groups.has(id)) problems.push(`aof:sketch "${id}" reuses a node or subgraph id.`);
  if ((model.nodes ?? []).length > LIMITS.nodes || (model.edges ?? []).length > LIMITS.edges) problems.push(`a diagram holds at most ${LIMITS.nodes} nodes and ${LIMITS.edges} edges.`);
  return problems;
}

// ── serialize (the canonical form) ─────────────────────────────────────────────────────────────
// Re-keys edges by their order, so a model built by hand (or by the canvas) always writes keys the
// parser would compute; a path follows its edge through the re-key.
export function canonicalEdges(model) {
  const pairCount = new Map();
  const rekey = new Map();
  const edges = (model.edges ?? []).map((edge) => {
    const pair = `${edge.from}->${edge.to}`;
    const n = (pairCount.get(pair) ?? 0) + 1;
    pairCount.set(pair, n);
    const key = `${pair}#${n}`;
    rekey.set(edge.key, key);
    return { ...edge, key };
  });
  const paths = {};
  for (const [key, path] of Object.entries(model.paths ?? {})) if (rekey.has(key)) paths[rekey.get(key)] = path;
  return { edges, paths };
}

export function serializeProfile(model) {
  const problems = validateModel(model);
  if (problems.length) throw profileError(problems.join(" "));
  const { edges, paths } = canonicalEdges(model);
  const out = [`flowchart ${model.direction ?? "LR"}`, `  %% aof:profile ${PROFILE_VERSION}`];
  for (const line of model.header ?? []) if (!/^aof:/.test(line)) out.push(`  %% ${line}`.trimEnd());
  const nodeLine = (node, indent) => { const [open, close] = SHAPES[node.shape]; return `${indent}${node.id}${open}"${encodeLabel(node.label)}"${close}`; };
  const emitGroup = (parent, indent) => {
    for (const group of model.subgraphs.filter((g) => (g.parent ?? null) === parent)) {
      out.push(`${indent}subgraph ${group.id}["${encodeLabel(group.label)}"]`);
      emitGroup(group.id, `${indent}  `);
      for (const node of model.nodes.filter((n) => n.parent === group.id)) out.push(nodeLine(node, `${indent}  `));
      out.push(`${indent}end`);
    }
  };
  emitGroup(null, "  ");
  for (const node of model.nodes.filter((n) => (n.parent ?? null) === null)) out.push(nodeLine(node, "  "));
  for (const edge of edges) out.push(`  ${edge.from} ${EDGE_KINDS[edge.kind]}${edge.label != null && edge.label !== "" ? `|"${encodeLabel(edge.label)}"|` : ""} ${edge.to}`);
  for (const id of Object.keys(model.styles ?? {}).sort()) {
    const props = STYLE_PROPS.filter((name) => model.styles[id][name] != null).map((name) => `${name}:${model.styles[id][name]}`);
    if (props.length) out.push(`  style ${id} ${props.join(",")}`);
  }
  for (const id of Object.keys(model.layout ?? {}).sort()) {
    const { x, y, w, h } = model.layout[id];
    const size = w != null && h != null ? ` w=${Math.round(w)} h=${Math.round(h)}` : "";
    out.push(`  %% aof:node ${id} x=${Math.round(x)} y=${Math.round(y)}${size}`);
  }
  for (const key of Object.keys(paths).sort()) {
    const { x, y, points } = paths[key];
    out.push(`  %% aof:edge ${key} x=${Math.round(x)} y=${Math.round(y)} points=${points.map(([dx, dy]) => `${Math.round(dx)},${Math.round(dy)}`).join(";")}`);
  }
  for (const id of Object.keys(model.libs ?? {}).sort()) out.push(`  %% aof:lib ${id} ${model.libs[id].library}/"${encodeLabel(model.libs[id].item)}"`);
  for (const id of Object.keys(model.sketches ?? {}).sort()) out.push(`  %% aof:sketch ${id} "${encodeLabel(model.sketches[id])}"`);
  return `${out.join("\n")}\n`;
}

// The canonical text of any profile text — what the store keeps, so a revision is a fact about the
// diagram rather than about whitespace.
export function canonicalize(text) {
  return serializeProfile(parseProfile(text));
}

export function emptyProfile(direction = "LR") {
  return serializeProfile({ direction, header: [], subgraphs: [], nodes: [], edges: [], styles: {}, layout: {}, paths: {}, libs: {}, sketches: {} });
}

// ── items: the keyed view diff and merge share ─────────────────────────────────────────────────
// Every fact of a diagram is one keyed item; equal items are equal JSON. Order is kept separately.
function itemsOf(model) {
  const items = new Map();
  items.set("direction", JSON.stringify(model.direction));
  for (const group of model.subgraphs) items.set(`subgraph:${group.id}`, JSON.stringify({ label: group.label, parent: group.parent ?? null }));
  for (const node of model.nodes) items.set(`node:${node.id}`, JSON.stringify({ label: node.label, shape: node.shape, parent: node.parent ?? null }));
  for (const edge of model.edges) items.set(`edge:${edge.key}`, JSON.stringify({ from: edge.from, to: edge.to, kind: edge.kind, label: edge.label ?? null }));
  for (const [id, style] of Object.entries(model.styles)) items.set(`style:${id}`, JSON.stringify(Object.fromEntries(STYLE_PROPS.filter((p) => style[p] != null).map((p) => [p, style[p]]))));
  for (const [id, box] of Object.entries(model.layout)) items.set(`layout:${id}`, JSON.stringify(box));
  for (const [key, path] of Object.entries(model.paths)) items.set(`path:${key}`, JSON.stringify(path));
  for (const [id, lib] of Object.entries(model.libs ?? {})) items.set(`lib:${id}`, JSON.stringify(lib));
  return items;
}

// What changed from `before` to `after`, as keyed facts — the review panel's list and Preview's
// selection. Layout and path moves are reported too: a proposal that only moves boxes is a change.
export function diffModels(before, after) {
  const a = itemsOf(before);
  const b = itemsOf(after);
  const changes = [];
  for (const [key, value] of b) {
    if (!a.has(key)) changes.push({ key, change: "added" });
    else if (a.get(key) !== value) changes.push({ key, change: "changed" });
  }
  for (const key of a.keys()) if (!b.has(key)) changes.push({ key, change: "removed" });
  return changes;
}

// The node and edge ids a set of changes touches — what Preview selects on the canvas.
export function changedIds(changes) {
  const ids = new Set();
  for (const { key } of changes) {
    const [kind, id] = [key.slice(0, key.indexOf(":")), key.slice(key.indexOf(":") + 1)];
    if (kind === "node" || kind === "style" || kind === "layout" || kind === "subgraph" || kind === "lib") ids.add(id);
    if (kind === "edge" || kind === "path") ids.add(id);
  }
  return [...ids];
}
