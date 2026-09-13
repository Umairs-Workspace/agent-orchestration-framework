// src/loop-document.mjs — the committed loop graph's PURE composer and its one derived home
// (story 79, conforming to 78/ADR-001, ADR-002 and ADR-009 rather than re-deciding them).
//
// WHY THIS MODULE HAS NO IMPORTS BUT `node:path`. The composer is handed a model and returns
// bytes: no clock, no filesystem, no environment, no `process.cwd()`. That is what makes
// byte-identity assertable without standing up a workspace, and it is the property
// `acd-loop-document-write-scope` pins over this file's DIRECT imports.
//
// WHY IT IS NAMED `loop-document` AND NOT `loops-document`. 52/FF-5201 DISCOVERS loop modules
// from disk by two patterns — `src/work-loops*.mjs` and `src/commands/loops-*.mjs` — asserts the
// discovered set equals its expected six, and then holds every discovered module free of any
// write call form. Its own comment names this exact shape as the case it exists to catch: "a
// writer `src/commands/loops-init.mjs`". The registry is framework data and read-only by law;
// this document is a derived projection that lands OUTSIDE it, so it takes the second family's
// name — beside `src/work/loop.mjs`, `src/loop-bounds.mjs` and `src/loop-progress.mjs`
// (78/ADR-009). That is the distinction the gate encodes, not an evasion of it, and the
// write scope is asserted independently.
//
// WHY THE GRAPH BYTES ARRIVE AS TEXT. `renderLoopGraph` is exported from
// `src/commands/loops-graph.mjs` and its output is frozen by 52/FF-5208 across ten
// `structural-duplicate` scenarios — canonical node order, canonical edge order, the six declared
// glyphs plus the undeclared parallelogram, and the total node-key mangle. This story wants
// EXACTLY those bytes, so the renderer's text is injected here verbatim and no glyph, no node
// ordering and no edge ordering is restated in this file.
import path from "node:path";

// The document's one home: the root of the configured work directory, beside the only other two
// tracked non-item files there (`ROADMAP.md` and `TECH_DEBT.md`). NOT under the registry —
// since 53/07 that is `.aof/loops/`, which ships in the bundle, so a generated document rendered
// there would be overwritten by the next `aof work update`. Doctor already treats a FILE at this
// root as neither an item-folder candidate nor an orphan (`src/work/doctor.mjs:401`).
export const LOOP_DOCUMENT_BASENAME = "loops.md";

// The command a reader who finds this file stale must run. ONE home for the string: the document
// names it, the drift check's failure message names it, and neither spells it a second time.
export const REGENERATE_COMMAND = "aof work loops document --write";

// The path is DERIVED from the configured work directory and is never a caller-supplied argument
// — one home is what keeps the drift check anchored to something it can actually find.
export function loopDocumentPath(workspace) {
  const workDir = typeof workspace === "string" ? workspace : workspace?.workDir;
  if (!workDir) throw new TypeError("loopDocumentPath requires a work directory or a workspace");
  return path.join(workDir, LOOP_DOCUMENT_BASENAME);
}

function countsBlock({ nodeCount, edgeCount, summary }) {
  return [
    `- Declared records: ${nodeCount}`,
    `- Declared edges: ${edgeCount}`,
    `- Findings: ${summary.error} error, ${summary.warn} warning`,
  ];
}

// The per-check split, rendered from the census `work:loops-validate` already computes. The check
// ids are NOT restated here: they arrive in the canonical order the validate command inserted
// them, so this file holds no second copy of `CHECK_IDS` to drift from the first.
function checkTable(checks) {
  const rows = Object.entries(checks ?? {});
  if (rows.length === 0) return [];
  return [
    "| check | findings |",
    "| --- | --- |",
    ...rows.map(([id, entry]) => `| ${id} | ${entry.ran ? entry.findings : "not run"} |`),
  ];
}

// One declared field's value as the record wrote it. Every parsed field is either a scalar
// carrying `raw` or a list of entries carrying `raw`, so this needs no knowledge of the field
// vocabulary — which is what keeps the closed key sets in `src/work/loops.mjs` their own one home
// rather than acquiring a second copy here.
function fieldText(value) {
  if (Array.isArray(value)) return value.map((entry) => fieldText(entry)).join(", ");
  if (value != null && typeof value === "object") {
    // `raw` is the authored text, and every parsed field carries it (measured across the whole
    // registry). A shape without one is not silently rendered as `[object Object]` — it is
    // JSON-stringified, so the document stays readable AND the surprise is visible to whoever
    // reads the diff rather than swallowed by a default.
    return "raw" in value ? String(value.raw) : JSON.stringify(value);
  }
  return String(value);
}

// THE PER-RECORD SECTION IS WHAT MAKES A FRONTMATTER EDIT VISIBLE. The diagram draws the EDGE
// keys and nothing else, so a `ceiling` moving off `uncapped`, an `owner` acquiring a name or a
// `cadence` changing would move the registry and not move the picture at all — the exact class of
// change this document exists to surface in a pull request. Each record's declared fields are
// listed in the record's own order, one per line, so a one-field edit is a one-line diff.
//
// EDGES ARE DELIBERATELY NOT LISTED HERE. The renderer draws them, and a second listing would be
// this file restating an edge ordering the frozen renderer owns.
function recordBlocks(records) {
  if (records.length === 0) return ["No records are declared.", ""];
  const lines = [];
  for (const record of records) {
    lines.push(`### \`${record.id ?? "(no id)"}\` — ${record.title ?? "(no title)"}`, "");
    lines.push(`- kind: ${record.kind ?? "(none)"}`);
    for (const [key, value] of Object.entries(record.fields ?? {})) lines.push(`- ${key}: ${fieldText(value)}`);
    lines.push("");
  }
  return lines;
}

// composeLoopDocument — the whole artefact, from injected data only.
//
//   { present, source, nodeCount, edgeCount, graph, summary, records }
//
// `source` is a PROJECT-RELATIVE display path (the caller relativises; an absolute path would
// make the bytes depend on where the repository is checked out). `graph` is the frozen renderer's
// text. `summary` is `work:loops-validate`'s own `{ error, warn, checks }`.
//
// NO FRONTMATTER, DELIBERATELY. The bundle convention puts `<!-- aof-generated: … -->` first, and
// F-73-G records that a leading comment BEFORE frontmatter breaks frontmatter parsing silently.
// This document is not a work item and no register check reads it, so it carries no frontmatter
// at all and the trap cannot be sprung.
export function composeLoopDocument({ present, source, nodeCount, edgeCount, graph, summary, records = [] }) {
  const lines = [
    `<!-- aof-generated: \`${REGENERATE_COMMAND}\` — do not edit by hand -->`,
    "",
    "# The loop graph",
    "",
  ];

  if (present) {
    lines.push(
      `The control loops this repository declares, projected from the loop registry at \`${source}\`.`,
      `Regenerate with \`${REGENERATE_COMMAND}\` after any change to a loop record.`,
    );
  } else {
    lines.push(
      `No loop registry is declared. The registry was looked for at \`${source}\`.`,
      `Regenerate with \`${REGENERATE_COMMAND}\` once one exists.`,
    );
  }

  lines.push("", "## Health", "", ...countsBlock({ nodeCount, edgeCount, summary }), "");

  const table = checkTable(summary.checks);
  if (table.length > 0) lines.push(...table, "");

  if (!present) {
    lines.push("No check ran — there is no registry to check.", "");
  } else if (summary.error === 0 && summary.warn === 0) {
    lines.push("No check raised a finding.", "");
  }

  // The two numbers are NOT a contradiction and the page says so rather than leaving a reader to
  // reconcile them: the count above is of DECLARED records, while the diagram also draws every
  // endpoint a record points at, including ones no record declares (52 froze the parallelogram
  // for exactly those).
  lines.push(
    "The diagram below draws every endpoint a record points at, including endpoints no record",
    "declares; the record count above counts declared records only.",
    "",
    "## The graph",
    "",
    "```mermaid",
    graph,
    "```",
    "",
    "## The records",
    "",
    ...recordBlocks(records),
  );

  return lines.join("\n");
}
