import { existsSync, mkdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { commandError } from "@aof/contracts/error";
import { graphArtifactBuiltAt, graphJsonPath } from "../graph-normalize.mjs";
import { bundleGraph } from "../graph-bundle.mjs";

// Configured application services are supplied by core; construction performs no I/O.
export function createGraphExportCommand({ git }) {
// graph:export — write the codebase graph, with graphify's cache, to ONE bundle file at the path
// the operator names (166 R1). The graph is derived and never committed (10/ADR-005), so this is
// the way a built graph reaches a second clone without a second full extraction.
//
//   input  { path, force? }
//   result { bundlePath, bytes, fileCount, stamp }
//
// The path is always the operator's (166 Q1) and an existing file is replaced only on --force
// (166 Q2). Reads only `graphify-out/` — never a source file — and spawns nothing: git arrives
// injected, and the graphify version is the one the carried cache folder names.

const graphExportCommand = {
  id: "graph:export",
  input: {
    type: "object",
    properties: {
      path: { type: "string" },
      force: { type: "boolean" },
    },
    additionalProperties: false,
  },

  async run(input, ctx) {
    const projectRoot = ctx.workspace.projectRoot;
    if (typeof input.path !== "string" || input.path.trim() === "") {
      throw commandError("graph:export needs the bundle path to write — `aof graph export <path>`.", "graph-export-no-path", 400);
    }
    const graphPath = graphJsonPath(projectRoot);
    if (!existsSync(graphPath)) {
      throw commandError("No graph to export — build one first with `aof graph build .`.", "graph-export-no-graph", 424);
    }
    const bundlePath = path.resolve(input.path);
    if (existsSync(bundlePath)) {
      if (statSync(bundlePath).isDirectory()) {
        throw commandError(`${bundlePath} is a directory — name the bundle FILE to write.`, "graph-export-target-exists", 409);
      }
      if (input.force !== true) {
        throw commandError(`${bundlePath} already exists — pass --force to replace it.`, "graph-export-target-exists", 409);
      }
    }

    const { bytes, fileCount, stamp } = await bundleGraph({ outDir: path.dirname(graphPath), builtAt: graphArtifactBuiltAt(graphPath), config: ctx.workspace.config, git, projectRoot });

    // Written beside the target and renamed over it, so a failed write never leaves a torn bundle
    // where the operator expects a whole one.
    mkdirSync(path.dirname(bundlePath), { recursive: true });
    const partial = `${bundlePath}.partial-${process.pid}`;
    try {
      writeFileSync(partial, bytes);
      renameSync(partial, bundlePath);
    } catch (error) {
      rmSync(partial, { force: true });
      throw error;
    }
    return { bundlePath, bytes: bytes.length, fileCount, stamp };
  },

  cli: {
    route: ["graph", "export"],
    spec: {
      usage: "aof graph export <path> [--force] [--json]",
      flags: {
        force: { type: "boolean", description: "replace an existing file at the path" },
      },
    },

    argv: (positionals, options = {}) => {
      const input = {};
      if (positionals[0] != null) input.path = positionals[0];
      if (options.force) input.force = true;
      return input;
    },

    render(result) {
      const commit = result.stamp.sourceCommit ? ` at ${result.stamp.sourceCommit.slice(0, 7)}` : "";
      return `Exported ${result.fileCount} files (${formatBytes(result.bytes)}) to ${result.bundlePath} — graph built ${result.stamp.builtAt}${commit}.`;
    },

    json: (result) => result,
  },
};

return { graphExportCommand };
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
