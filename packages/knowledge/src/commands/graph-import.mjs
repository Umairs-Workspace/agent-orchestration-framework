import { readFileSync } from "node:fs";
import path from "node:path";
import { commandError } from "@aof/contracts/error";
import { graphJsonPath } from "../graph-normalize.mjs";
import { layOutBundle, unpackBundle } from "../graph-bundle.mjs";

// Configured application services are supplied by core; construction performs no I/O.
export function createGraphImportCommand({ git, resolveGraphifyBinary, ensureGraphifyOutGitignore }) {
// graph:import — lay a bundle written by `aof graph export` out as this clone's codebase graph
// (166 R2–R4). What it lays down is exactly what every graph reader resolves —
// `<projectRoot>/graphify-out/graph.json` — so the graph answers impact/query at once, with no
// build in between.
//
//   input  { path, force? }
//   result { graphPath, fileCount, sourceCommit, builtAt, commitsBehind, commitState,
//            graphifyVersion, cache: { kept, rekeyed, dropped }, warnings }
//
// The order of refusals is the order of what the operator can fix: a file that is no bundle
// (graph-import-not-a-bundle), then the lay-out's own — a bundle of another project, then a graph
// already here — which `layOutBundle` owns so `aof graph fetch` refuses exactly as import does
// (174/ADR-001). A failed import leaves the old graph byte-identical.

const graphImportCommand = {
  id: "graph:import",
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
      throw commandError("graph:import needs the bundle path to read — `aof graph import <path>`.", "graph-import-no-path", 400);
    }
    const bundlePath = path.resolve(input.path);
    const bundle = readBundle(bundlePath);
    const laidOut = await layOutBundle({ bundle, source: bundlePath, projectRoot, config: ctx.workspace.config, force: input.force, git, resolveGraphifyBinary, ensureGraphifyOutGitignore });
    return { ...laidOut, graphPath: graphJsonPath(projectRoot) };
  },

  cli: {
    route: ["graph", "import"],
    spec: {
      usage: "aof graph import <path> [--force] [--json]",
      flags: {
        force: { type: "boolean", description: "replace this clone's existing graph" },
      },
    },

    argv: (positionals, options = {}) => {
      const input = {};
      if (positionals[0] != null) input.path = positionals[0];
      if (options.force) input.force = true;
      return input;
    },

    render(result) {
      const lines = [`Imported ${result.fileCount} files into ${result.graphPath}.`];
      lines.push(`graph built ${result.builtAt ?? "at an unknown time"}${result.builtAt ? ` (${describeAge(result.builtAt)})` : ""}, ${describeCommit(result)}.`);
      if (result.cache) lines.push(`cache: ${result.cache.kept} kept, ${result.cache.rekeyed} rekeyed, ${result.cache.dropped} dropped.`);
      for (const warning of result.warnings) lines.push(`warning: ${warning}`);
      return lines.join("\n");
    },

    json: (result) => ({ ...result, graphPath: path.relative(process.cwd(), result.graphPath) }),
  },
};

function readBundle(bundlePath) {
  let bytes;
  try {
    bytes = readFileSync(bundlePath);
  } catch (error) {
    throw commandError(`${bundlePath} is not an aof graph bundle: ${error.code === "ENOENT" ? "no such file" : error.message}`, "graph-import-not-a-bundle", 422);
  }
  try {
    return unpackBundle(bytes);
  } catch (error) {
    if (error.code !== "bundle-invalid") throw error;
    throw commandError(`${bundlePath} is not an aof graph bundle: ${error.message}`, "graph-import-not-a-bundle", 422);
  }
}

return { graphImportCommand };
}

function describeCommit(result) {
  const short = result.sourceCommit ? result.sourceCommit.slice(0, 7) : null;
  switch (result.commitState) {
    case "at-head": return `at ${short}, which is HEAD — the graph is at HEAD`;
    case "behind": return `at ${short}, ${result.commitsBehind} commit${result.commitsBehind === 1 ? "" : "s"} behind HEAD`;
    case "not-in-clone": return `at ${short}, a commit not in this clone`;
    case "not-ancestor": return `at ${short}, which is not an ancestor of HEAD`;
    default: return short ? `at ${short}` : "at an unknown commit";
  }
}

function describeAge(builtAt, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - Date.parse(builtAt)) / 60000));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} old`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} old`;
  const days = Math.round(hours / 24);
  return `${days} days old`;
}
