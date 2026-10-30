import { commandError } from "@aof/contracts/error";
import { relativiseGraphPath } from "./shared.mjs";
// graph:impact — the DETERMINISTIC, file-anchored coupling lookup the running ACD
// agents consume (milestone 11, re-open / ADR-007). Where `graph:query` is a fuzzy,
// similarity-seeded NL traversal (legible but unreliable — it seeds on doc nodes and
// needs re-phrasing), `graph:impact` answers the one question a reviewing/refining
// agent actually has, EXACTLY: "for these files, what do they import/call
// (dependencies) and what imports/calls them (dependents / blast-radius)?" — computed
// straight from the graph EDGES, no LLM, no spawn, no fuzz.
//
//   input  { paths: string[] }            // the files the agent is reviewing/changing
//   result ImpactResult { graphPath, builtAt,
//                         files: [{ file, present, dependencies[], dependents[] }] }
//
// `builtAt` is the ARTIFACT's mtime, and `present` says whether the graph covers the
// file at all — so a zero answer can be read for what it is. "Absent from the graph"
// (a coverage gap) and "in the graph with no cross-file edges" (real isolation) are
// distinct facts, and the human render states which one it is; conflating them let a
// failed build be recorded as the architectural finding "these modules have no coupling".
//
// Since 179/ADR-002 this command is a FACE over the knowledge-engine port: it asks
// `relations(paths)` of the code corpus, which the graphify code backend answers from the
// STRUCTURED graph.json (09/ADR-001's permitted handle, never the markdown stdout, never a
// spawn). The face reads no artifact itself, so the code graph has one reader that also owns
// its absence. ADVISORY: it returns coupling FACTS the agent reasons over; it feeds no
// gate/merge (ADR-004 still holds).
//
// PRECONDITION (ADR-001, @executable): a graph must be built first. When the port answers
// `no-graph`, `run` throws today's build-first 424 — ahead of the empty-paths check, so it is
// deterministically CI-checkable with no binary. An artifact that does not parse is refused as
// `graph-unreadable`, naming the cause the port reports.
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
//   milestone 11 (re-open / ADR-007) — graph:impact: the DETERMINISTIC, edge-based,
//   file-anchored coupling lookup the running ACD agents consume (dependencies +
//   dependents straight from graph.json's edges). Reads the structured graph via the
//   pure normalizer (NOT a spawn, NOT a markdown parse) — supersedes the milestone's
//   original ADR-002 "zero production code" stance, which left it with no real consumer.
// The port's `builtAt` is graphArtifactBuiltAt, the SHARED derivation graph:build reports
// too, so the freshness this command prints is the same instant that build printed — a
// call-time `new Date()` here would be the very dishonesty that family of fixes removed.
//
// The pure core, `computeImpact`, lives at `../graph-impact.mjs` and is no longer re-exported
// here: a face that names it is the edge FF-17903 forbids.

// Configured application services are supplied by core; construction performs no I/O.
export function createGraphImpactCommand({ relations }) {
const graphImpactCommand = {
  id: "graph:impact",
  input: {
    type: "object",
    properties: {
      paths: { type: "array", items: { type: "string" } },
    },
    required: ["paths"],
    additionalProperties: false,
  },

  async run(input, ctx) {
    const answer = await relations(Array.isArray(input.paths) ? input.paths : [], { projectRoot: ctx.workspace.projectRoot });

    if (answer.served === false) throw commandError(`The knowledge engine serves no code relations (${answer.code}).`, answer.code, 424);

    // Build-first precondition, surfaced BEFORE the empty-paths check (mirrors graph:query). A
    // deterministic, binary-independent @executable path.
    if (answer.unavailable === "no-graph") {
      throw commandError(
        "No graph found — a graph must be built first (run `aof graph build <folder>`).",
        "no-graph",
        424
      );
    }
    if (answer.unavailable === "graph-unreadable") {
      throw commandError(`The graph at ${answer.artifact} could not be read (${answer.cause}) — rebuild it with \`aof graph build .\`.`, "graph-unreadable", 424);
    }
    if (!Array.isArray(input.paths) || input.paths.length === 0) {
      throw commandError("graph:impact needs at least one path (the file[s] to analyse).", "no-paths", 400);
    }

    // `builtAt` is the ARTIFACT's own mtime — the same honest freshness `graph:build` reports,
    // at the point the answer is actually consumed. An agent grounding a boundary or a review
    // rank reads the impact, not the build it may not have run; without this, a coupling
    // answer over a month-old graph is presented exactly like one over a fresh graph.
    return { graphPath: answer.artifact, builtAt: answer.builtAt, files: answer.files };
  },

  cli: {
    // m42 wave (d) leg d1 (wave 3) — routed through the registry-derived table +
    // the ONE generic face; graphVerbCommand's cli.mjs ladder branch is deleted.
    route: ["graph", "impact"],
    spec: {
      usage: "aof graph impact <path> [<path> ...] [--json]",
      flags: {},
    },

    // `aof graph impact <path> [<path> ...]`.
    argv: (positionals) => ({ paths: positionals }),

    // Human render: per file, the deterministic dependents (blast-radius) + deps.
    //
    // The two zero answers are DIFFERENT answers and are labelled as such. A file the
    // graph does not cover (`present:false`) is a TOOLING gap — the build never reached
    // it — and reads identically to real isolation unless it says so; the old
    // "(not in graph — build over its folder?)" was quiet enough to be recorded as the
    // architectural fact "this module has no coupling". A file the graph DOES cover with
    // no cross-file edges is that fact, and gets to be stated as one. The artifact's
    // freshness leads, because a confident answer over a stale graph is the failure mode
    // this command sits downstream of.
    render(result) {
      const lines = [];
      if (result.builtAt) lines.push(`graph built ${result.builtAt} (${result.graphPath})`);
      else lines.push(`graph ${result.graphPath} (build time unknown)`);
      for (const f of result.files) {
        const isolated = f.present && f.dependents.length === 0 && f.dependencies.length === 0;
        const note = !f.present
          ? "  (NOT COVERED BY THIS GRAPH — a coverage gap, not a no-coupling finding: rebuild with `aof graph build .`)"
          : isolated
            ? "  (in the graph, no cross-file edges — genuinely uncoupled)"
            : "";
        lines.push(`# ${f.file}${note}`);
        lines.push(`  imported/called by ← (${f.dependents.length}) ${f.dependents.join(", ") || "(none)"}`);
        lines.push(`  imports/calls      → (${f.dependencies.length}) ${f.dependencies.join(", ") || "(none)"}`);
      }
      const missing = result.files.filter((f) => !f.present).map((f) => f.file);
      if (missing.length > 0) {
        lines.push(
          `\n${missing.length} of ${result.files.length} requested file(s) are absent from the graph — treat their coupling as UNKNOWN, not zero: ${missing.join(", ")}`
        );
      }
      return lines.join("\n");
    },

    // --json face: relativise graphPath to cwd (08/ADR-002); files are repo-relative.
    json: (result) => relativiseGraphPath(result),
  },
};

return { graphImpactCommand };
}
