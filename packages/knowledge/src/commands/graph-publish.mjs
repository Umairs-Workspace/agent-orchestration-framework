import { existsSync } from "node:fs";
import path from "node:path";
import { commandError } from "@aof/contracts/error";
import { listRemote, publishGraph, readShareSettings } from "../graph-share.mjs";

// Configured application services are supplied by core; construction performs no I/O.
export function createGraphPublishCommand({ git, graphArtifactBuiltAt }) {
// graph:publish — publish this clone's codebase graph to the project's own remote, under exactly
// the rules `aof graph build` publishes by (174/ADR-003): built at HEAD, from a clean tree, of a
// default-branch commit, the first publish of a commit wins, and a publish prunes to the newest
// twenty. It works whether or not `graph.share` is on.
//
//   input  {}
//   result { remote, published: { outcome, commit, ref, blob, reason }, pruned, warnings }
//
// A graph that may not be published is an answer, not an error: it exits 0 with
// `published.outcome` "skipped" and the reason. So is a commit already published. What exits
// non-zero is what stops the question being asked at all: no graph (graph-publish-no-graph), an
// unknown `graph.share` (graph-share-unknown), a remote that cannot be asked or that refuses the
// push (graph-share-remote-failed).

const graphPublishCommand = {
  id: "graph:publish",
  input: { type: "object", properties: {}, additionalProperties: false },

  async run(_input, ctx) {
    const projectRoot = ctx.workspace.projectRoot;
    const { remote } = readShareSettings(ctx.workspace.config);
    const outDir = path.join(projectRoot, "graphify-out");
    const graphPath = path.join(outDir, "graph.json");
    if (!existsSync(graphPath)) {
      throw commandError("No graph to publish — build one first with `aof graph build .`.", "graph-publish-no-graph", 424);
    }
    const listing = await listRemote(git, { cwd: projectRoot, remote });
    if (!listing.ok) throw commandError(`${remote}: ${listing.reason}`, "graph-share-remote-failed", 502);
    const outcome = await publishGraph(git, { projectRoot, outDir, builtAt: graphArtifactBuiltAt(graphPath), config: ctx.workspace.config, remote, listing });
    if (outcome.published.outcome === "failed") throw commandError(`${remote}: ${outcome.published.reason}`, "graph-share-remote-failed", 502);
    return { remote, ...outcome };
  },

  cli: {
    route: ["graph", "publish"],
    spec: { usage: "aof graph publish [--json]", flags: {} },

    argv: () => ({}),

    render(result) {
      const { published } = result;
      const short = published.commit ? published.commit.slice(0, 7) : "HEAD";
      const lines = [
        published.outcome === "published" ? `Published the graph for ${short} to ${result.remote} (${published.ref}).`
          : published.outcome === "already-published" ? `The graph for ${short} is already published on ${result.remote} — nothing was pushed.`
            : `Not published: ${published.reason}.`,
      ];
      if (result.pruned.length) lines.push(`Pruned ${result.pruned.length} old graph${result.pruned.length === 1 ? "" : "s"}: ${result.pruned.map((sha) => sha.slice(0, 7)).join(", ")}.`);
      for (const warning of result.warnings) lines.push(`warning: ${warning}`);
      return lines.join("\n");
    },

    json: (result) => result,
  },
};

return { graphPublishCommand };
}
