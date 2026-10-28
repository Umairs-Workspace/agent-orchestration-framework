import { existsSync } from "node:fs";
import path from "node:path";
import { commandError } from "@aof/contracts/error";
import { gitRead } from "../graph-bundle.mjs";
import { fetchGraph, listRemote, readShareSettings } from "../graph-share.mjs";

// Configured application services are supplied by core; construction performs no I/O.
export function createGraphFetchCommand({ git, resolveGraphifyBinary, ensureGraphifyOutGitignore }) {
// graph:fetch — lay out the graph published for HEAD on the project's own remote as this clone's
// codebase graph (174/ADR-001): the fetch half of what `aof graph build` does on a miss, by hand,
// with no build. It works whether or not `graph.share` is on — the switch governs the build, not
// an operator's explicit ask.
//
//   input  { force? }
//   result { remote, ref, commit, blob, graphPath, fileCount, sourceCommit, builtAt,
//            commitsBehind, commitState, graphifyVersion, cache, warnings }
//
// Refusals: an unknown `graph.share` (graph-share-unknown), a remote that cannot be asked
// (graph-share-remote-failed), nothing published for HEAD (graph-fetch-none-published), and then
// exactly `aof graph import`'s — a graph already here is replaced only with --force, whole, and a
// failed lay-out leaves it byte-identical (166 Q2).

const graphFetchCommand = {
  id: "graph:fetch",
  input: {
    type: "object",
    properties: {
      force: { type: "boolean" },
    },
    additionalProperties: false,
  },

  async run(input, ctx) {
    const projectRoot = ctx.workspace.projectRoot;
    const { remote } = readShareSettings(ctx.workspace.config);
    const head = await gitRead(git, ["rev-parse", "HEAD"], projectRoot);
    if (!head) throw commandError("This clone has no HEAD commit, so there is no published graph to ask for.", "graph-fetch-none-published", 404);
    const listing = await listRemote(git, { cwd: projectRoot, remote });
    if (!listing.ok) throw commandError(`${remote}: ${listing.reason}`, "graph-share-remote-failed", 502);
    const blob = listing.graphs.get(head);
    if (!blob) {
      throw commandError(`${remote} holds no published graph for ${head.slice(0, 7)} (HEAD) — build one with \`aof graph build .\`.`, "graph-fetch-none-published", 404);
    }
    // Refused before the download, as the lay-out would refuse it after.
    const outDir = path.join(projectRoot, "graphify-out");
    if (existsSync(outDir) && input.force !== true) {
      throw commandError(`${outDir} already holds a graph — pass --force to replace it.`, "graph-import-graph-exists", 409);
    }
    try {
      return await fetchGraph(git, { projectRoot, remote, commit: head, blob, config: ctx.workspace.config, force: input.force, resolveGraphifyBinary, ensureGraphifyOutGitignore });
    } catch (error) {
      if (error.code === "share-fetch-failed") throw commandError(`${remote}: ${error.message}`, "graph-share-remote-failed", 502);
      throw error;
    }
  },

  cli: {
    route: ["graph", "fetch"],
    spec: {
      usage: "aof graph fetch [--force] [--json]",
      flags: {
        force: { type: "boolean", description: "replace this clone's existing graph" },
      },
    },

    argv: (_positionals, options = {}) => (options.force ? { force: true } : {}),

    render(result) {
      const lines = [`Fetched the graph for ${result.commit.slice(0, 7)} from ${result.remote} (${result.ref}) into ${result.graphPath}.`];
      if (result.cache) lines.push(`cache: ${result.cache.kept} kept, ${result.cache.rekeyed} rekeyed, ${result.cache.dropped} dropped.`);
      for (const warning of result.warnings) lines.push(`warning: ${warning}`);
      return lines.join("\n");
    },

    json: (result) => ({ ...result, graphPath: path.relative(process.cwd(), result.graphPath) }),
  },
};

return { graphFetchCommand };
}
