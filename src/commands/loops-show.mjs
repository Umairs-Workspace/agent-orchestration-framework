import path from "node:path";

import { loadLoops } from "../work/loops.mjs";

// 58/ADR-001 §1 — the ONE edge key that carries "who may change this loop's target". The setter is
// COMPUTED from the declared edges of the WHOLE registry: no kind admits a key by which a record
// asserts its own supervisor (58/FF-5804), so there is nothing here to read off a node.
const REFERENCE_EDGE = "target-setting";

function displayPath(value) {
  return path.relative(process.cwd(), value) || ".";
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * 58/ADR-001 §1 — target id -> the ids declaring an inbound `target-setting` edge to it, in id
 * order. Computed over every node the registry loaded, which is what lets `--id` narrow what is
 * PRINTED without ever narrowing the answer.
 *
 * A node pointing the edge at ITSELF is not its own supervisor — the reading
 * `checkReferenceOwnership` already takes of a self-edge, so the face and the check agree on what
 * one is worth. Everything else is reported as it stands: a setter declared by a kind that may not
 * set one is still named, because hiding it would hide the defect. Whether any declaration is
 * ADMISSIBLE is `aof work loops validate`'s question, and this command's exit code does not move.
 */
function referenceSettersByTarget(nodes) {
  const byTarget = new Map();
  for (const node of nodes) {
    if (typeof node.id !== "string" || !node.id) continue;
    for (const value of node.edges?.[REFERENCE_EDGE] ?? []) {
      if (value.raw === node.id) continue;
      if (!byTarget.has(value.raw)) byTarget.set(value.raw, new Set());
      byTarget.get(value.raw).add(node.id);
    }
  }
  return new Map([...byTarget].map(([id, setters]) => [id, [...setters].sort(compareCodeUnits)]));
}

/**
 * 58/ADR-002 §1 — the two supervision segments, APPENDED after the three segments this story does
 * not touch. The face reports and does not judge:
 *
 *   · an undeclared `layer:` renders as no layer, never as a default the record did not declare,
 *     and what is printed is the RAW value the record wrote (the rank is the checks' business);
 *   · a missing setter is stated in words, never as a blank segment and never as an invented owner
 *     — and only where the absence is a defect. ADR-001 requires an inbound reference-setting edge
 *     of a `kind: loop` and of nothing else, so every other kind's line simply ends at its title.
 */
function supervisionSegments(node) {
  const segments = [];
  const layer = node.fields?.layer;
  if (layer?.raw != null) segments.push(`layer ${layer.raw}`);
  if (node.referenceSetters?.length > 0) segments.push(`reference set by ${node.referenceSetters.join(", ")}`);
  else if (node.kind === "loop") segments.push("no declared reference-setter");
  return segments;
}

export const loopsShowCommand = {
  id: "work:loops-show",
  input: {
    type: "object",
    properties: { id: { type: "string" } },
    additionalProperties: false,
  },

  async run(input, ctx) {
    const model = await loadLoops(ctx.workspace);
    // COMPUTE FIRST, THEN NARROW. Reversing these two lines is the defect this ordering exists to
    // refuse: `--id loop:build` would then answer "nobody" for a loop whose supervisor is simply
    // not in the printed list.
    const setters = referenceSettersByTarget(model.nodes);
    const nodes = model.nodes
      .filter((node) => input?.id == null || node.id === input.id)
      .map((node) => ({ ...node, referenceSetters: [...(setters.get(node.id) ?? [])] }));
    return { source: model.source, present: model.present, nodes };
  },

  cli: {
    route: ["work", "loops", "show"],
    spec: {
      usage: "aof work loops show [--id <node-id>] [--json]",
      flags: { id: { type: "string", description: "show only the declared node with this id" } },
    },
    argv: (_positionals, options = {}) => options.id == null ? {} : { id: options.id },
    render(result) {
      const shownSource = displayPath(result.source);
      if (!result.present) return `No loop registry is declared at ${shownSource}.`;
      const lines = [`Loop registry: ${result.nodes.length} node(s) in ${shownSource}.`];
      for (const node of result.nodes) {
        lines.push([node.id, node.kind ?? "unknown", node.title ?? "-", ...supervisionSegments(node)].join(" · "));
      }
      return lines.join("\n");
    },
    json: (result) => ({
      source: displayPath(result.source),
      present: result.present,
      nodes: result.nodes.map((node) => ({ ...node, path: displayPath(node.path) })),
    }),
  },
};
