import path from "node:path";

import { commandError } from "../command-error.mjs";
import { loadLoops } from "../work/loops.mjs";
import { KIND_SHAPES } from "../loop-graph-shapes.mjs";

function displayPath(value) {
  return path.relative(process.cwd(), value) || ".";
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareEdges(left, right) {
  return compareCodeUnits(left.source, right.source) ||
    compareCodeUnits(left.type, right.type) ||
    compareCodeUnits(left.target, right.target);
}

// The glyph table moved BELOW commands/ at chore 116 (src/loop-graph-shapes.mjs carries why both
// 78/FF-7802 and m42 wave (d) are honoured by the move). Re-exported here so every existing importer
// of this module keeps working, and `renderLoopGraph` reads the same Map it always did.
export { KIND_SHAPES };

// 52/FF-5208 pins this one for `command:`, `config:`, `module:` and dangling `loop:` endpoints, and
// this story moves NONE of it — the new shapes are for declared kinds only, which is what keeps the
// repair additive. It is also the shape a record whose `kind:` the vocabulary does not admit falls
// to: it borrows no declared kind's glyph.
const UNDECLARED_SHAPE = ['[/"', '"/]'];

function baseNodeKey(id) {
  return id.replace(/[^A-Za-z0-9_]/g, "_");
}

function nodeKeys(ids) {
  const keys = new Map();
  const used = new Set();
  for (const id of ids) {
    const base = baseNodeKey(id);
    let key = base;
    let suffix = 2;
    while (used.has(key)) {
      key = `${base}_${suffix}`;
      suffix += 1;
    }
    used.add(key);
    keys.set(id, key);
  }
  return keys;
}

export function renderLoopGraph(model) {
  const declared = new Map();
  for (const node of model.nodes) {
    if (typeof node.id === "string" && !declared.has(node.id)) declared.set(node.id, node);
  }

  const visualIds = new Set(declared.keys());
  const edges = [];
  for (const node of model.nodes) {
    for (const [type, endpoints] of Object.entries(node.edges ?? {})) {
      for (const endpoint of endpoints) {
        visualIds.add(endpoint.raw);
        edges.push({ source: node.id, type, target: endpoint.raw });
      }
    }
  }

  const ids = [...visualIds].sort(compareCodeUnits);
  const keys = nodeKeys(ids);
  const lines = ["flowchart LR"];
  for (const id of ids) {
    const key = keys.get(id);
    const node = declared.get(id);
    // A DECLARED node carries `<id> · <title>` in its own kind's shape; everything else — an
    // endpoint no record declares, and a record whose `kind:` is outside the vocabulary — carries
    // its raw text alone, in the shape 52 froze for it.
    const shape = node == null ? undefined : KIND_SHAPES.get(node.kind);
    if (shape) lines.push(`  ${key}${shape[0]}${node.id} · ${node.title ?? "-"}${shape[1]}`);
    else lines.push(`  ${key}${UNDECLARED_SHAPE[0]}${id}${UNDECLARED_SHAPE[1]}`);
  }
  edges.sort(compareEdges);
  for (const edge of edges) {
    lines.push(`  ${keys.get(edge.source)} -->|${edge.type}| ${keys.get(edge.target)}`);
  }
  return { text: lines.join("\n"), edgeCount: edges.length };
}

export const loopsGraphCommand = {
  id: "work:loops-graph",
  input: {
    type: "object",
    properties: { format: { type: "string", enum: ["mermaid"] } },
    additionalProperties: false,
  },

  async run(input, ctx) {
    const format = input?.format ?? "mermaid";
    if (format !== "mermaid") {
      throw commandError(`Unsupported loop graph format "${format}".`, "unsupported-format", 400);
    }
    const model = await loadLoops(ctx.workspace);
    const rendered = renderLoopGraph(model);
    return {
      source: model.source,
      present: model.present,
      format,
      text: rendered.text,
      nodeCount: model.nodes.length,
      edgeCount: rendered.edgeCount,
    };
  },

  cli: {
    route: ["work", "loops", "graph"],
    spec: {
      usage: "aof work loops graph [--format mermaid] [--json]",
      flags: { format: { type: "string", description: "diagram format (mermaid)" } },
    },
    argv: (_positionals, options = {}) => options.format == null ? {} : { format: options.format },
    render: (result) => result.text,
    json: (result) => ({ ...result, source: displayPath(result.source) }),
  },
};
