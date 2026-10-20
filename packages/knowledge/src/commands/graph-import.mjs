import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import path from "node:path";
import { commandError } from "@aof/contracts/error";
import { graphJsonPath } from "../graph-normalize.mjs";
import { describeProject, gitRead, listCloneFiles, readProjectIdentity, rekeyCache, sameProject, unpackBundle } from "../graph-bundle.mjs";

const GRAPHIFY_OUT = "graphify-out";

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
// (graph-import-not-a-bundle), a bundle of another project (graph-import-wrong-project — no
// override, 166 Q4), then a graph already here (graph-import-graph-exists — only --force replaces
// it, and whole, 166 Q2). Everything is staged in a sibling folder and swapped in only once the
// whole bundle has verified and landed, so a failed import leaves the old graph byte-identical.

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

    const local = await readProjectIdentity({ config: ctx.workspace.config, git, projectRoot });
    if (!sameProject(bundle.stamp, local).same) {
      throw commandError(
        `${bundlePath} holds the graph of ${describeProject(bundle.stamp)}, and this clone is ${describeProject(local)} — a graph of another codebase would answer with the wrong coupling.`,
        "graph-import-wrong-project",
        409
      );
    }

    const outDir = path.join(projectRoot, GRAPHIFY_OUT);
    if (existsSync(outDir) && input.force !== true) {
      throw commandError(`${outDir} already holds a graph — pass --force to replace it.`, "graph-import-graph-exists", 409);
    }

    const tag = `${process.pid}-${Date.now().toString(36)}`;
    const staged = path.join(projectRoot, `${GRAPHIFY_OUT}.import-${tag}`);
    const replaced = path.join(projectRoot, `${GRAPHIFY_OUT}.replaced-${tag}`);
    let cache;
    try {
      for (const file of bundle.files) {
        const target = path.join(staged, ...file.path.split("/"));
        mkdirSync(path.dirname(target), { recursive: true });
        writeFileSync(target, file.bytes);
      }
      // The receiving clone's own root, in the shape aof's builds write it (`update <absRoot>`).
      writeFileSync(path.join(staged, ".graphify_root"), projectRoot, "utf8");
      // An unlistable clone carries the cache unchanged: re-keying against an empty file list
      // would read every entry as orphaned and drop the whole cache.
      const files = await listCloneFiles(git, projectRoot);
      cache = files ? rekeyCache({ outDir: staged, projectRoot, files }) : null;
      // `builtAt` IS graph.json's mtime (graphArtifactBuiltAt), so the graph keeps the age it was
      // built with rather than looking as new as the import (166 E14).
      const builtAt = Date.parse(bundle.stamp.builtAt ?? "");
      if (Number.isFinite(builtAt)) {
        const when = new Date(builtAt);
        utimesSync(path.join(staged, "graph.json"), when, when);
      }
      if (existsSync(outDir)) renameSync(outDir, replaced);
      try {
        renameSync(staged, outDir);
      } catch (error) {
        if (existsSync(replaced)) renameSync(replaced, outDir);
        throw error;
      }
    } catch (error) {
      rmSync(staged, { recursive: true, force: true });
      throw commandError(`import of ${bundlePath} failed, and this clone's graph is unchanged: ${error.message}`, "graph-import-failed", 500);
    }
    rmSync(replaced, { recursive: true, force: true });
    await ensureGraphifyOutGitignore(projectRoot);

    const staleness = await readStaleness({ projectRoot, sourceCommit: bundle.stamp.sourceCommit ?? null });
    return {
      graphPath: graphJsonPath(projectRoot),
      fileCount: bundle.files.length,
      sourceCommit: bundle.stamp.sourceCommit ?? null,
      builtAt: bundle.stamp.builtAt ?? null,
      ...staleness,
      graphifyVersion: bundle.stamp.graphifyVersion ?? null,
      cache,
      warnings: [
        ...versionWarnings(bundle.stamp.graphifyVersion ?? null),
        ...(cache ? [] : ["git could not list this clone's files, so the carried cache was not re-keyed — it is kept as exported."]),
      ],
    };
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

// How far the graph's commit is behind this clone's HEAD (166 R3). A commit this clone never
// fetched, or one HEAD does not descend from, is named and never counted.
async function readStaleness({ projectRoot, sourceCommit }) {
  const head = await gitRead(git, ["rev-parse", "HEAD"], projectRoot);
  if (!sourceCommit || !head) return { commitsBehind: null, commitState: "unknown" };
  if (await gitRead(git, ["cat-file", "-e", `${sourceCommit}^{commit}`], projectRoot) == null) {
    return { commitsBehind: null, commitState: "not-in-clone" };
  }
  if (await gitRead(git, ["merge-base", "--is-ancestor", sourceCommit, head], projectRoot) == null) {
    return { commitsBehind: null, commitState: "not-ancestor" };
  }
  const count = Number.parseInt(await gitRead(git, ["rev-list", "--count", `${sourceCommit}..${head}`], projectRoot) ?? "", 10);
  if (!Number.isFinite(count)) return { commitsBehind: null, commitState: "unknown" };
  return { commitsBehind: count, commitState: count === 0 ? "at-head" : "behind" };
}

// A graphify version mismatch is a warning, never a refusal (166 Q3): graph.json answers at once,
// and graphify's next run sweeps a cache folder that is not its own version.
function versionWarnings(bundleVersion) {
  let local;
  try {
    local = resolveGraphifyBinary();
  } catch {
    local = { found: false };
  }
  if (!local?.found) {
    return ["graphify is not installed here, so the carried cache cannot be checked against it — run `aof project provision graphify` before the next build."];
  }
  if (bundleVersion && local.version && local.version !== bundleVersion) {
    return [`the bundle's cache was written by graphify ${bundleVersion} and this machine runs ${local.version} — graphify will discard the carried cache, so the next build re-extracts everything.`];
  }
  return [];
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
