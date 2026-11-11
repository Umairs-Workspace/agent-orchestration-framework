import path from "node:path";
import { gitRead } from "../graph-bundle.mjs";
import { fetchGraph, listRemote, publishGraph, readShareSettings } from "../graph-share.mjs";
// Configured application services are supplied by core; construction performs no I/O.
export function createGraphBuildCommand({ engine, isCodeOnlyWholeRootBuild, resolveGraphifyBinary, git, ensureGraphifyOutGitignore }) {
// graph:build — build the queryable graph from a folder (ADR-001). Since 179/ADR-002 this is a FACE
// over the knowledge-engine port: the build is `engine.ingest("code", …)`, which the graphify code
// backend answers (`../graphify-code-backend.mjs`) — binary resolution, the one spawn, the artifact
// honesty check, egress and the nested ignore all live there. This command keeps its id, schema,
// route and render, and 174's share wrapping, which is transport rather than engine work.
//
//   input  { path, backend?, tokenBudget?, offline?, outRoot? }
//   result BuildResult { graphPath, projectRoot, nodeCount, edgeCount,
//                        hyperedgeCount, builtAt, backend, egress, unchanged, stdout, share? }
//
// Paths are RAW ABSOLUTE (basis-neutral, 08/ADR-002); the CLI face relativises
// for display. `egress` reports whether the doc/media backend HOP ran: "none"
// when no backend (code/AST only, fully local), "docs-media" when ANY --backend
// ran — aof reports "the hop ran", never re-classifies by network reachability,
// never widens graphify's own egress (ADR-005). When the binary is absent, the
// port answers a structured graphify-missing error (ADR-002/004) BEFORE any spawn.
//
// SHARING (174/ADR-001). With `graph.share: "git-refs"`, a code-only build of the codebase graph
// at the project root that finds no current local graph first takes the one published for HEAD
// on the project's own remote, and publishes a clean build there afterwards (graph-share.mjs).
// The remote is advisory: every failure is a warning in `share`, never a failed build. `share` is
// absent when sharing is off, so the result is today's, byte for byte. The memory work graph
// builds under its own `outRoot` and never reaches this (ADR-002).
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
//   milestone 09 — graphify command core (graph:build/query/triage register into
//   the SAME core; ADR-001). The driver (src/graphify.mjs) is the sole spawn site.

const graphBuildCommand = {
  id: "graph:build",
  input: {
    type: "object",
    properties: {
      path: { type: "string" },
      backend: { type: "string" },
      tokenBudget: { type: "number" },
      offline: { type: "boolean" },
      outRoot: { type: "string" },
    },
    required: ["path"],
    additionalProperties: false,
  },

  async run(input, ctx) {
    const projectRoot = ctx.workspace.projectRoot;
    const outRoot = input.outRoot ?? projectRoot;

    // Only the codebase graph at the project root may be shared (174/ADR-002), and an --offline
    // build reaches no remote. The setting is read — and an unknown one refused — before anything runs.
    const request = { path: input.path, backend: input.backend ?? null, tokenBudget: input.tokenBudget };
    const codeOnly = isCodeOnlyWholeRootBuild(request, outRoot, projectRoot);
    const settings = codeOnly && path.resolve(outRoot) === path.resolve(projectRoot) && input.offline !== true ? readShareSettings(ctx.workspace.config) : null;
    const share = settings?.share === "git-refs" ? { remote: settings.remote, fetched: null, published: null, pruned: [], warnings: [] } : null;

    // On a miss, ask the remote for HEAD's graph, and keep it only when its inputs are this tree's.
    let listing = null;
    let took = false;
    const onMiss = share ? async ({ current }) => {
      listing = await takePublished({ projectRoot, share, config: ctx.workspace.config });
      if (!share.fetched) return null;
      if (current()) {
        took = true;
        return FETCHED_CURRENT;
      }
      share.fetched.used = false;
      share.fetched.reason = "its inputs differ from this tree, so it was rebuilt";
      return null;
    } : undefined;

    const result = await engine.ingest("code", { ...input, ...(onMiss ? { onMiss } : {}) }, { projectRoot });
    if (result?.served === false) throw new Error(`graph:build: the knowledge engine serves no code ingest (${result.code})`);

    if (listing && !took) {
      const outcome = await publishGraph(git, { projectRoot, outDir: path.dirname(result.graphPath), builtAt: result.builtAt, config: ctx.workspace.config, remote: share.remote, listing });
      share.published = outcome.published;
      share.pruned = outcome.pruned;
      share.warnings.push(...outcome.warnings);
    }

    return share ? { ...result, share } : result;
  },

  cli: {
    // m42 wave (d) leg d1 (wave 3) — routed through the registry-derived table +
    // the ONE generic face; graphVerbCommand's cli.mjs ladder branch is deleted.
    route: ["graph", "build"],
    spec: {
      usage: "aof graph build <folder> [--backend claude] [--token-budget N] [--offline] [--json]",
      flags: {
        backend: { type: "string", description: "graphify backend (e.g. claude)" },
        tokenBudget: { type: "string", description: "token budget for the build" },
        offline: { type: "boolean", description: "build without network egress" },
      },
    },

    // `aof graph build <folder> [--backend X] [--token-budget N] [--offline]`.
    argv: (positionals, options = {}) => {
      const input = { path: positionals[0] };
      if (options.backend) input.backend = options.backend;
      if (options.tokenBudget != null) input.tokenBudget = Number(options.tokenBudget);
      if (options.offline) input.offline = true;
      return input;
    },

    // Human render: the opaque graphify markdown + a one-line graph summary. An
    // untouched artifact says so in plain words — "already current" is the honest
    // reading of graphify's no-topology-change no-op, and stating it stops the next
    // reader from mistaking a steady state for a build that quietly did nothing.
    render(result) {
      const verb = result.unchanged ? "Already current at" : "Built";
      const summary = `${verb} ${result.nodeCount} nodes, ${result.edgeCount} edges, ${result.hyperedgeCount} hyperedges (egress: ${result.egress}, built ${result.builtAt}).`;
      const lines = [result.stdout ? `${result.stdout}\n${summary}` : summary];
      if (result.share) lines.push(...renderShare(result.share));
      return lines.join("\n");
    },

    // --json face projection: relativise the raw absolute paths to cwd, mirroring
    // work:next (cli.mjs). The structured result is otherwise the BuildResult.
    json: (result) => relativisePaths(result),
  },
};

// Relativise graphPath/projectRoot to process.cwd() for the CLI --json face
// (08/ADR-002 path-display projection). Leaves every other field untouched.
const FETCHED_CURRENT = "aof: took the graph already published for this commit — graphify was not run.";

// takePublished({ projectRoot, share, config }) → the remote's listing (null when it could not be
// asked), having laid out HEAD's published graph when there is one. Every failure lands in
// `share.warnings`, named by the remote, and the build carries on as if nothing was published.
async function takePublished({ projectRoot, share, config }) {
  const listing = await listRemote(git, { cwd: projectRoot, remote: share.remote });
  if (!listing.ok) {
    share.warnings.push(`${share.remote}: ${listing.reason}`);
    return null;
  }
  const head = await gitRead(git, ["rev-parse", "HEAD"], projectRoot);
  const blob = head ? listing.graphs.get(head) : null;
  if (!blob) return listing;
  try {
    await fetchGraph(git, { projectRoot, remote: share.remote, commit: head, blob, config, force: true, resolveGraphifyBinary, ensureGraphifyOutGitignore });
    share.fetched = { remote: share.remote, commit: head, blob, used: true };
  } catch (error) {
    share.warnings.push(`${share.remote}: ${error.message}`);
  }
  return listing;
}

function renderShare(share) {
  const lines = [];
  const short = (sha) => sha.slice(0, 7);
  if (share.fetched?.used) lines.push(`Fetched the graph for ${short(share.fetched.commit)} from ${share.remote}.`);
  else if (share.fetched) lines.push(`Fetched the graph for ${short(share.fetched.commit)} from ${share.remote}, but ${share.fetched.reason}.`);
  const published = share.published;
  if (published?.outcome === "published") lines.push(`Published the graph for ${short(published.commit)} to ${share.remote} (${published.ref}).`);
  else if (published?.outcome === "already-published") lines.push(`The graph for ${short(published.commit)} is already published on ${share.remote}.`);
  else if (published?.outcome === "skipped") lines.push(`Not published: ${published.reason}.`);
  if (share.pruned.length) lines.push(`Pruned ${share.pruned.length} old graph${share.pruned.length === 1 ? "" : "s"} from ${share.remote}: ${share.pruned.map(short).join(", ")}.`);
  for (const warning of share.warnings) lines.push(`warning: ${warning}`);
  return lines;
}

function relativisePaths(result) {
  const out = { ...result };
  if (typeof out.graphPath === "string") out.graphPath = path.relative(process.cwd(), out.graphPath);
  if (typeof out.projectRoot === "string") out.projectRoot = path.relative(process.cwd(), out.projectRoot);
  return out;
}

return { graphBuildCommand };
}
