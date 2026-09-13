// 78/01 — THE ITEM-SCOPED RENDERER: the graph of what ran, in bytes a diff can hold still.
//
// Two faces over one execution model (78/00): a mermaid graph scoped to the loops the item actually
// ENGAGED, and the document that carries what a picture cannot — the facts against the declaration
// (ADR-004), the join coverage the model always states (ADR-003), and the three gap classes
// (ADR-005).
//
// A NEW RENDERER, NOT AN EXTENSION OF THE FROZEN ONE (ADR-006). `renderLoopGraph`'s bytes are frozen
// by 52/FF-5208 across ten scenarios and a per-item graph that redrew the framework-wide picture
// would be worthless anyway. 52's conventions are reused by RESTATEMENT — `flowchart LR`, code-unit
// sort on nodes and on edges, collision-safe node keys — with one exception: `KIND_SHAPES` is
// IMPORTED. A second hand-copied glyph table drifts the first time a seventh kind lands, and 58 and
// 59 each landed one. Importing an export changes none of the frozen module's bytes; it is a read.
//
// DETERMINISM IS THE CONTRACT, not a nicety. A committed projection of a deterministic function is
// a thing a diff can mean something about: regenerate, and a non-empty diff says an input changed.
// So nothing here reads a clock, a path or a host name — every one of those would make the file
// differ on every regeneration and turn the drift check into noise.

import { KIND_SHAPES } from "./loop-graph-shapes.mjs";

// THE ONE GLYPH THIS MODULE SPELLS, and it is not a kind's. `UNDECLARED_SHAPE` is private to the
// frozen renderer, and the only ways to share it would be to export it — which would modify bytes
// FF-7802 holds unmodified — or to restate it here. Restated, therefore, and deliberately alone:
// FF-7802 asserts that no glyph belonging to a DECLARED kind is spelled in this file, which is the
// drift ADR-006 is about. Widening `loops-graph.mjs`'s exports is a later, additive change.
const UNDECLARED_SHAPE = ['[/"', '"/]'];

// THE REGENERATION SPELLING, AND ITS ONE HOME. Both faces of it are composed downstream of this
// module — the marker below, and the sign-off prose in `src/commands/loop-record.mjs` — so the
// spelling lives HERE, which the command already imports from, rather than in the command, which
// this module may not import back: that edge is a cycle, and FF-7805 pins the direction.
//
// It carries the REF the verb requires. A marker spelling `aof work loop-record --write` names a
// command that cannot run — the route is `aof work loop-record <ref> [--write]` — so the line an
// operator copies out of the document refuses before it does anything (chore 100, promoted from
// 78/02 review round 1).
//
// AND THE REF IT CARRIES IS THE ITEM'S OWN, never the placeholder that shape was first spelled with.
// A marker naming a literal `<ref>` is still a command an operator has to edit before it runs — the
// same defect one step smaller (chore 117, promoted from chore 100's review round 1). The ref is an
// input this document already has, so interpolating it costs nothing and keeps the bytes
// DETERMINISTIC PER ITEM, which is the property the drift check needs; constant-across-items was
// never the requirement.
//
// A FUNCTION RATHER THAN A CONSTANT INTERPOLATED AT EACH SITE. Two call sites format this string —
// the marker below and the sign-off prose — and spelling the `--write` tail at both is exactly how
// the marker and the sign-off's instruction drifted apart the first time. The placeholder survives
// as the fallback for a call carrying no ref, so an unnamed document still documents the shape and
// never emits an `aof work loop-record  --write` with a hole where the ref belongs.
export const REGENERATE_REF_PLACEHOLDER = "<ref>";

export function regenerateCommand(ref) {
  const named = typeof ref === "string" && ref.trim() !== "" ? ref.trim() : REGENERATE_REF_PLACEHOLDER;
  return `aof work loop-record ${named} --write`;
}

const compareCodeUnits = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

function compareEdges(left, right) {
  return compareCodeUnits(left.source, right.source)
    || compareCodeUnits(left.type, right.type)
    || compareCodeUnits(left.target, right.target);
}

// 52's collision-safe keying, restated: a base key of the id's word characters, then the first free
// numeric suffix. Two ids that mangle to one base get distinct keys, and every edge names the key of
// the node it meant rather than re-mangling the id at the point of use.
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

// The authority a loop record cites, and the KEY it cites it under — which is the edge type the
// registry declares for that relationship. `actuator` and `owner` are fields rather than members of
// `EDGE_KEYS`, so the picture labels each edge with the field that declares it instead of inventing
// an edge type the registry does not use.
// Named apart from the projection's own `AUTHORITY_FIELD_KEYS`, which is deliberately NARROWER:
// that one asks which citations RESOLVE (`owner` alone, the only authority field carrying an
// intra-registry scheme), this one asks which are DRAWN. Two questions, two lists, two names — a
// shared name over different members is how the next reader concludes they are the same set.
const AUTHORITY_DRAWN_KEYS = Object.freeze(["actuator", "owner", "reference"]);

function authorityEdgesOf(node) {
  const edges = [];
  for (const key of AUTHORITY_DRAWN_KEYS) {
    const declared = node?.fields?.[key];
    const entries = Array.isArray(declared) ? declared : declared == null ? [] : [declared];
    for (const entry of entries) {
      const raw = String(entry?.raw ?? "");
      // The `unknown` sentinel is an absence, not an endpoint — drawing it would put a node on the
      // page for the fact that nobody has answered, which the gap sections already say in words.
      if (raw.length === 0 || entry?.kind === "unknown") continue;
      edges.push({ source: node.id, type: key, target: raw });
    }
  }
  return edges;
}

/**
 * The graph, scoped to what ran. The scope is the execution model's own answer: the loops the item
 * ENGAGED, the actuators those loops declare, and the reference owners they answer to. A registry of
 * 17 records whose item engaged 2 draws 2 loops — never the framework-wide picture.
 */
export function renderExecutionGraph({ model, registry } = {}) {
  const nodes = Array.isArray(registry) ? registry : Array.isArray(registry?.nodes) ? registry.nodes : [];
  const byId = new Map(nodes.filter((node) => typeof node?.id === "string" && node.id).map((node) => [node.id, node]));
  const engaged = [...new Set((model?.engagements ?? [])
    .map((engagement) => engagement.loop)
    .filter((id) => typeof id === "string" && id))].sort(compareCodeUnits);

  // PASS ONE — settle the scope: the engaged loops, plus every authority they cite. The authority
  // edges fall out of the same walk, since an authority is in scope precisely because it was cited.
  const visualIds = new Set(engaged);
  const edges = [];
  for (const id of engaged) {
    const node = byId.get(id);
    if (node == null) continue;
    for (const edge of authorityEdgesOf(node)) {
      visualIds.add(edge.target);
      edges.push(edge);
    }
  }

  // PASS TWO — the registry's own declared edges, judged against the FINISHED scope. An edge whose
  // target is a loop this item never engaged would drag the framework-wide picture back in one
  // endpoint at a time; an edge between two engaged loops belongs, whichever of them sorts first.
  for (const id of engaged) {
    const node = byId.get(id);
    if (node == null) continue;
    for (const [type, endpoints] of Object.entries(node.edges ?? {})) {
      for (const endpoint of Array.isArray(endpoints) ? endpoints : []) {
        const target = String(endpoint?.raw ?? "");
        if (target.length === 0 || !visualIds.has(target)) continue;
        edges.push({ source: id, type, target });
      }
    }
  }

  const ids = [...visualIds].sort(compareCodeUnits);
  const keys = nodeKeys(ids);
  const lines = ["flowchart LR"];
  for (const id of ids) {
    const key = keys.get(id);
    const node = byId.get(id);
    // A declared node carries `<id> · <title>` in its own kind's shape, from the ONE shared table.
    // Everything else — an endpoint no record declares, and a record whose `kind:` the vocabulary
    // does not admit — carries its raw text alone, in the shape 52 froze for it, borrowing no
    // declared kind's glyph.
    const shape = node == null ? undefined : KIND_SHAPES.get(node.kind);
    if (shape) lines.push(`  ${key}${shape[0]}${node.id} · ${node.title ?? "-"}${shape[1]}`);
    else lines.push(`  ${key}${UNDECLARED_SHAPE[0]}${id}${UNDECLARED_SHAPE[1]}`);
  }
  edges.sort(compareEdges);
  for (const edge of edges) {
    lines.push(`  ${keys.get(edge.source)} -->|${edge.type}| ${keys.get(edge.target)}`);
  }
  return Object.freeze({ text: lines.join("\n"), nodeCount: ids.length, edgeCount: edges.length });
}

// ADR-004 on the page: the three non-numeric ceilings read as three different remedies, never as one
// word for "no limit". A capped engagement and an uncapped one cannot render the same bytes.
const CEILING_PROSE = Object.freeze({
  none: "terminates by construction",
  unknown: "nothing has declared one",
  uncapped: "deliberately unbounded",
});

const COMPARISON_SUFFIX = Object.freeze({ within: "", at: ", at the bound", over: ", over the bound" });

function ceilingPhrase(engagement) {
  const { ceiling, cycles } = engagement;
  const plural = cycles === 1 ? "cycle" : "cycles";
  if (ceiling.state === "bounded") {
    // A bound the projection could not put a number on is still a declared bound — it is named by
    // what the record declares rather than silently rendered as "no limit".
    if (ceiling.bound == null) {
      return `${cycles} ${plural} against a declared ceiling of \`${ceiling.declared.join(", ")}\``;
    }
    return `${cycles} ${plural} against a declared ceiling of ${ceiling.bound}${COMPARISON_SUFFIX[ceiling.comparison] ?? ""}`;
  }
  return `${cycles} ${plural}, ceiling \`${ceiling.state}\` — ${CEILING_PROSE[ceiling.state]}`;
}

// The three gap classes, each under its own heading, each heading naming the remedy — three
// headings and not one bucket because they ask three different things of the reader (ADR-005).
const GAP_SECTIONS = Object.freeze([
  { gap: "ran-undeclared", title: "Ran, undeclared", remedy: "declare the loop, or fix the id it named" },
  { gap: "declared-never-ran", title: "Declared, never ran", remedy: "drive the loop, or accept that it does not apply here" },
  { gap: "authority-unresolved", title: "Authority unresolved", remedy: "fix the registry record's endpoint" },
]);

function engagementLines(engagement) {
  const facts = [ceilingPhrase(engagement)];
  if (engagement.phases.length > 0) facts.push(`phases ${engagement.phases.map((phase) => `\`${phase}\``).join(" → ")}`);
  facts.push(`${engagement.attempts} ${engagement.attempts === 1 ? "attempt" : "attempts"}`);
  if (engagement.retryChain.length > 0) {
    facts.push(`retry chain ${engagement.retryChain.map((link) => `${link.retryOf} → ${link.runId}`).join(", ")}`);
  }
  // In flight is a different fact from having failed, and it is said in those words.
  facts.push(engagement.outcome == null
    ? "in flight"
    : `ended \`${engagement.outcome}\`${engagement.stopReason ? ` — ${engagement.stopReason}` : ""}`);
  return `- **${engagement.loop ?? "(no loop declared)"}** (\`${engagement.loopRunId}\`) — ${facts.join("; ")}.`;
}

/**
 * The document — markdown wrapping a fenced `mermaid` block, so it renders on GitHub, in an editor
 * preview and in the board.
 *
 * FRONTMATTER FIRST, the generated marker AFTER it. That order is F-73-G: a leading comment before
 * frontmatter breaks frontmatter parsing silently, and this document is parsed.
 */
export function renderExecutionDocument({ model, registry, ref } = {}) {
  const coverage = model.coverage;
  const lines = [
    "---",
    "doc: execution",
    `item: ${ref ?? ""}`,
    "---",
    `<!-- aof-generated: \`${regenerateCommand(ref)}\` — do not edit by hand, except the sign-off. -->`,
    "",
    `# ${ref ?? "The item"} · The loop execution record`,
    "",
    "## Coverage",
    "",
    // ALWAYS PRESENT, zero or complete (ADR-003). A record that renders nothing without saying why
    // is indistinguishable from a broken renderer — which is the observability report over again.
    `- ${coverage.runsFound} ${coverage.runsFound === 1 ? "run" : "runs"} found for this item, `
      + `${coverage.runsCarryingDeclaration} carrying a loop declaration `
      + `(${Math.round(coverage.ratio * 100)}%).`,
    "",
    "## What ran",
    "",
  ];

  if (model.engagements.length === 0) {
    // An empty scope renders a STATEMENT, not a blank — distinguishable from a rendering that
    // failed to run.
    lines.push("No loop ran for this item.", "");
  } else {
    lines.push(...model.engagements.map((engagement) => engagementLines(engagement)), "");
  }

  lines.push("## The graph", "", "```mermaid", renderExecutionGraph({ model, registry }).text, "```", "");

  for (const section of GAP_SECTIONS) {
    const gaps = model.gaps[section.gap] ?? [];
    // A class with no gaps renders NO HEADING — an empty "None" placeholder is noise a reader
    // learns to skip, and the absence is already stated by the class not appearing.
    if (gaps.length === 0) continue;
    lines.push(`## ${section.title}`, "", `Remedy: ${section.remedy}.`, "");
    lines.push(...gaps.map((gap) => `- \`${gap.subject}\``), "");
  }

  return lines.join("\n");
}
