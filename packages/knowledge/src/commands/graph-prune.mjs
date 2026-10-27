import { commandError } from "@aof/contracts/error";
import { listRemote, pruneGraphs, readShareSettings } from "../graph-share.mjs";

// Configured application services are supplied by core; construction performs no I/O.
export function createGraphPruneCommand({ git }) {
// graph:prune — delete the published graphs the remote no longer needs to keep (174/ADR-003):
// every graph whose commit is not one of the newest twenty first-parent commits of the default
// branch. The same rule every successful publish applies, run by hand. It only ever names refs
// under this bundle version's graph namespace, and with nothing to delete it pushes nothing.
//
//   input  {}
//   result { remote, pruned: [commit], kept: [commit] }
//
// Refusals: an unknown `graph.share` (graph-share-unknown); a remote that cannot be asked, or
// that refuses the deletion (graph-share-remote-failed); and a default branch whose tip is not in
// this clone (graph-prune-tip-missing), since which graphs are current cannot be told without it.

const graphPruneCommand = {
  id: "graph:prune",
  input: { type: "object", properties: {}, additionalProperties: false },

  async run(_input, ctx) {
    const projectRoot = ctx.workspace.projectRoot;
    const { remote } = readShareSettings(ctx.workspace.config);
    const listing = await listRemote(git, { cwd: projectRoot, remote });
    if (!listing.ok) throw commandError(`${remote}: ${listing.reason}`, "graph-share-remote-failed", 502);
    const outcome = await pruneGraphs(git, { projectRoot, remote, listing });
    if (outcome.skipped) throw commandError(`${remote}: ${outcome.skipped}.`, "graph-prune-tip-missing", 409);
    if (outcome.failed) throw commandError(`${remote}: ${outcome.failed}.`, "graph-share-remote-failed", 502);
    return { remote, pruned: outcome.pruned, kept: outcome.kept };
  },

  cli: {
    route: ["graph", "prune"],
    spec: { usage: "aof graph prune [--json]", flags: {} },

    argv: () => ({}),

    render(result) {
      if (!result.pruned.length) return `Nothing to prune on ${result.remote} — ${result.kept.length} published graph${result.kept.length === 1 ? "" : "s"} kept.`;
      return `Pruned ${result.pruned.length} graph${result.pruned.length === 1 ? "" : "s"} from ${result.remote}: ${result.pruned.map((sha) => sha.slice(0, 7)).join(", ")} — ${result.kept.length} kept.`;
    },

    json: (result) => result,
  },
};

return { graphPruneCommand };
}
