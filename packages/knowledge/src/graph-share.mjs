import { readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { commandError } from "@aof/contracts/error";
import { SHARE_MODES, readMemoryConfig } from "./memory-config.mjs";
import { BUNDLE_VERSION, PUBLISHED_GRAPHS_KEPT, bundleGraph, gitRead, layOutBundle, readBuiltAtCommit, unpackBundle } from "./graph-bundle.mjs";
// src/graph-share.mjs — the codebase graph shared through the project's own git remote (174). A
// commit's graph is a bundle blob behind `refs/aof/graph/v<bundle version>/<commit>`: `ls-remote`
// names it, `fetch` brings it with no local ref, and a push of `<blob>:<ref>` publishes it. One
// object, no history, no new service and no new credential (spike 173).
//
// THE ONE MODULE THAT NAMES `refs/aof/graph/` (174/ADR-002, FF-17401). It imports no memory module
// but the config reader `memory-config.mjs`, which reaches no index, backend or transport (180/ADR-001),
// and no mesh transport, and no memory module imports it: only the codebase graph at the project
// root travels this way, never the memory work graph or the memory index (m38/ADR-016).
//
// Spawn-free like graph-bundle.mjs: git arrives injected, `(args, { cwd, env, timeoutMs }) →
// { status, stdout, stderr }`. Every call that reaches the remote goes through `remoteGit`, which
// sets GIT_TERMINAL_PROMPT=0 so a missing credential fails instead of hanging a daemon on a prompt
// (FF-17402). Nothing here forces a push: git refuses to move a ref that points at a non-commit,
// and that refusal is what makes the first publish of a commit the one that stays (ADR-003).

export const GRAPH_REF_PREFIX = `refs/aof/graph/v${BUNDLE_VERSION}/`;
export { SHARE_MODES };
const REMOTE_TIMEOUT_MS = 120_000;
// A full object id (SHA-1 or SHA-256). Every id the remote names is checked against it before it
// reaches an argv: a remote answers ls-remote, so its output is input, never trusted.
const FULL_SHA = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const NAMED_FILES = 10;

export function graphRef(commit) {
  return `${GRAPH_REF_PREFIX}${commit}`;
}

// readShareSettings(config) → { share, remote }. The code corpus's share settings live at
// `memory.graph` (180/ADR-003), or at the legacy root `graph`, and `memory-config.mjs` reads both.
// `share` absent or "off" is today's behaviour; "git-refs" turns sharing on; anything else is
// refused before anything runs, naming the accepted values and the key the author wrote. `remote`
// names the remote, `origin` by default.
export function readShareSettings(config) {
  const { share, remote } = readMemoryConfig(config).graph;
  return { share, remote };
}

const REMOTE_ENV = Object.freeze({ GIT_TERMINAL_PROMPT: "0" });

function remoteGit(git, args, cwd) {
  return git(args, { cwd, env: { ...process.env, ...REMOTE_ENV }, timeoutMs: REMOTE_TIMEOUT_MS });
}

function firstLine(result, fallback) {
  const text = String(result?.stderr ?? "").trim() || String(result?.stdout ?? "").trim();
  return text.split(/\r?\n/u).find((line) => line.trim() && !line.startsWith("hint:"))?.trim() ?? fallback;
}

async function settle(promise) {
  try {
    return await promise;
  } catch (error) {
    return { status: null, stdout: "", stderr: error?.message ?? String(error) };
  }
}

// listRemote(git, { cwd, remote }) — ONE `ls-remote` answers everything a fetch, a publish and a
// prune need: the remote's default branch and its tip (its own HEAD), and every published graph,
// as Map(commit → blob). `{ ok: false, reason }` when the remote cannot be asked.
export async function listRemote(git, { cwd, remote }) {
  const result = await settle(remoteGit(git, ["ls-remote", "--symref", remote, "HEAD", `${GRAPH_REF_PREFIX}*`], cwd));
  if (result.status !== 0) return { ok: false, remote, reason: `the remote was unreachable (${firstLine(result, "git ls-remote failed")})` };
  let defaultBranch = null;
  let tip = null;
  const graphs = new Map();
  for (const line of String(result.stdout ?? "").split(/\r?\n/u)) {
    const symref = /^ref: (\S+)\tHEAD$/u.exec(line);
    if (symref) {
      defaultBranch = symref[1];
      continue;
    }
    const [sha, name] = line.split("\t");
    if (!FULL_SHA.test(sha ?? "")) continue;
    if (name === "HEAD") tip = sha;
    else if (name?.startsWith(GRAPH_REF_PREFIX) && FULL_SHA.test(name.slice(GRAPH_REF_PREFIX.length))) {
      graphs.set(name.slice(GRAPH_REF_PREFIX.length), sha);
    }
  }
  return { ok: true, remote, defaultBranch, tip, graphs };
}

// fetchPublished(git, { cwd, remote, commit, blob }) → the bundle's bytes. The blob comes from
// `listRemote`, never from FETCH_HEAD, which this fetch does not write and a concurrent fetch in
// the same repo could overwrite. `unpack-file` writes the blob to a file in the git dir, because
// the injected git returns stdout as text and a gzip bundle cannot survive that. Throws
// `share-fetch-failed` naming why.
export async function fetchPublished(git, { cwd, remote, commit, blob }) {
  const fetched = await settle(remoteGit(git, ["fetch", "--no-tags", "--no-write-fetch-head", remote, graphRef(commit)], cwd));
  if (fetched.status !== 0) throw shareFailure(`the published graph could not be fetched (${firstLine(fetched, "git fetch failed")})`);
  const gitDir = await gitRead(git, ["rev-parse", "--absolute-git-dir"], cwd);
  const name = gitDir ? await gitRead(git, ["unpack-file", blob], gitDir) : null;
  if (!name) throw shareFailure(`the published graph ${blob.slice(0, 7)} is not a file git can unpack`);
  const file = path.join(gitDir, name);
  try {
    return readFileSync(file);
  } finally {
    rmSync(file, { force: true });
  }
}

function shareFailure(reason) {
  return Object.assign(new Error(reason), { code: "share-fetch-failed" });
}

// publishEligibility(git, { projectRoot, outDir, listing }) → { eligible, commit, reason }
// (174/ADR-003). A graph is published only when it was built at HEAD, from a tree with nothing
// modified, staged or untracked that is not ignored (a build reads untracked files, and a graph
// once pushed stays fetchable by its hash), of a commit on the remote's default branch — decided
// from the branch tip already in this clone, never by fetching it. Anything else fails closed,
// and the reason names what to fix.
export async function publishEligibility(git, { projectRoot, outDir, listing }) {
  const head = await gitRead(git, ["rev-parse", "HEAD"], projectRoot);
  const built = readBuiltAtCommit(outDir);
  if (!head) return skip(null, "this clone has no HEAD commit");
  if (!built) return skip(head, "the graph names no commit it was built at");
  if (built !== head) return skip(head, `the graph was built at ${built.slice(0, 7)} and HEAD is ${head.slice(0, 7)} — build again at HEAD to publish`);

  // Read raw, never through gitRead: its trim would eat the leading space of " M path".
  const status = await settle(git(["status", "--porcelain=v1", "-z", "--untracked-files=all"], { cwd: projectRoot }));
  if (status.status !== 0) return skip(head, "git could not report whether the tree is clean");
  const dirty = porcelainPaths(String(status.stdout ?? ""));
  if (dirty.length) {
    const named = dirty.slice(0, NAMED_FILES).join(", ");
    const more = dirty.length > NAMED_FILES ? ` and ${dirty.length - NAMED_FILES} more` : "";
    return skip(head, `the tree is not clean, and a graph built from it would describe uncommitted work: ${named}${more}`);
  }

  if (!listing.defaultBranch || !listing.tip) return skip(head, `${listing.remote} names no default branch, so HEAD cannot be shown to be on it`);
  const branch = listing.defaultBranch.replace(/^refs\/heads\//u, "");
  if (await gitRead(git, ["cat-file", "-e", `${listing.tip}^{commit}`], projectRoot) == null) {
    return skip(head, `the tip of ${listing.remote}/${branch} (${listing.tip.slice(0, 7)}) is not in this clone, so HEAD cannot be shown to be on the default branch — fetch it, then publish`);
  }
  if (await gitRead(git, ["merge-base", "--is-ancestor", head, listing.tip], projectRoot) == null) {
    return skip(head, `HEAD ${head.slice(0, 7)} is not on the default branch (${listing.remote}/${branch} is at ${listing.tip.slice(0, 7)})`);
  }
  return { eligible: true, commit: head, reason: null };
}

function skip(commit, reason) {
  return { eligible: false, commit, reason };
}

// The paths `status --porcelain=v1 -z` names. A rename or copy entry carries its source path as
// the next NUL-separated field, which is skipped: the destination is the path in the tree.
function porcelainPaths(status) {
  const fields = status.split("\0");
  const paths = [];
  for (let index = 0; index < fields.length; index += 1) {
    const entry = fields[index];
    if (entry.length < 4) continue;
    paths.push(entry.slice(3));
    if (entry[0] === "R" || entry[0] === "C") index += 1;
  }
  return [...new Set(paths)].sort();
}

// publishBundle(git, { projectRoot, remote, commit, bytes, listing }) → { outcome, commit, ref,
// blob, reason }. `already-published` when the remote holds a graph for the commit — the first
// publish wins and bundles are never compared, since two builds of one commit stamp different
// times (ADR-003) — and also when the push is refused because one appeared meanwhile.
// `failed` names any other refusal. The bundle is written to the git dir and stored with
// `hash-object -w`; no local ref is created.
export async function publishBundle(git, { projectRoot, remote, commit, bytes, listing }) {
  const ref = graphRef(commit);
  if (listing.graphs.has(commit)) return { outcome: "already-published", commit, ref, blob: listing.graphs.get(commit), reason: null };

  const gitDir = await gitRead(git, ["rev-parse", "--absolute-git-dir"], projectRoot);
  if (!gitDir) return { outcome: "failed", commit, ref, blob: null, reason: "git could not name this clone's git directory" };
  const file = path.join(gitDir, `aof-graph-bundle-${process.pid}-${Date.now().toString(36)}`);
  let blob;
  try {
    writeFileSync(file, bytes);
    blob = await gitRead(git, ["hash-object", "-w", file], projectRoot);
  } finally {
    rmSync(file, { force: true });
  }
  if (!blob) return { outcome: "failed", commit, ref, blob: null, reason: "git could not store the bundle" };

  // --no-verify: a cache ref is not a branch push, and a pre-push hook written for branches
  // (lint, tests) would run, and could hang, on every build.
  const pushed = await settle(remoteGit(git, ["push", "--no-verify", remote, `${blob}:${ref}`], projectRoot));
  if (pushed.status === 0) {
    listing.graphs.set(commit, blob);
    return { outcome: "published", commit, ref, blob, reason: null };
  }
  const now = await listRemote(git, { cwd: projectRoot, remote });
  if (now.ok && now.graphs.has(commit)) {
    listing.graphs.set(commit, now.graphs.get(commit));
    return { outcome: "already-published", commit, ref, blob: now.graphs.get(commit), reason: null };
  }
  return { outcome: "failed", commit, ref, blob: null, reason: `${remote} refused the push (${firstLine(pushed, "git push failed")})` };
}

// pruneGraphs(git, { projectRoot, remote, listing }) → { pruned, kept, skipped, failed }
// (ADR-003). A graph is kept only when its commit is one of the newest PUBLISHED_GRAPHS_KEPT
// first-parent commits of the default branch's tip, which must already be in this clone. Every
// other ref under this version's namespace is deleted in one push, by name. Nothing to delete
// pushes nothing.
export async function pruneGraphs(git, { projectRoot, remote, listing }) {
  const empty = { pruned: [], kept: [], skipped: null, failed: null };
  if (!listing.defaultBranch || !listing.tip) return { ...empty, skipped: `${remote} names no default branch, so which graphs are current cannot be told` };
  if (await gitRead(git, ["cat-file", "-e", `${listing.tip}^{commit}`], projectRoot) == null) {
    return { ...empty, skipped: `the tip of ${remote}'s default branch (${listing.tip.slice(0, 7)}) is not in this clone — fetch it, then prune` };
  }
  const recent = await gitRead(git, ["rev-list", "--first-parent", `--max-count=${PUBLISHED_GRAPHS_KEPT}`, listing.tip], projectRoot);
  if (recent == null) return { ...empty, skipped: "git could not list the default branch's recent commits" };
  const keep = new Set(recent.split(/\s+/u).filter(Boolean));
  const published = [...listing.graphs.keys()].sort();
  const kept = published.filter((commit) => keep.has(commit));
  const doomed = published.filter((commit) => !keep.has(commit));
  if (doomed.length === 0) return { ...empty, kept };

  const deleted = await settle(remoteGit(git, ["push", "--no-verify", "--delete", remote, ...doomed.map(graphRef)], projectRoot));
  if (deleted.status !== 0) return { ...empty, kept, failed: `${remote} refused to delete ${doomed.length} old graph${doomed.length === 1 ? "" : "s"} (${firstLine(deleted, "git push --delete failed")})` };
  for (const commit of doomed) listing.graphs.delete(commit);
  return { ...empty, pruned: doomed, kept };
}

// fetchGraph(git, { projectRoot, remote, commit, blob, config, force, resolveGraphifyBinary,
// ensureGraphifyOutGitignore }) → import's result, plus where the graph came from. Fetch, then the
// one staged swap `aof graph import` uses, so a fetched graph is refused for exactly what an
// imported one is. A blob that is no bundle throws `graph-import-not-a-bundle`.
export async function fetchGraph(git, { projectRoot, remote, commit, blob, config, force, resolveGraphifyBinary, ensureGraphifyOutGitignore }) {
  const source = `${remote} ${graphRef(commit)}`;
  const bytes = await fetchPublished(git, { cwd: projectRoot, remote, commit, blob });
  let bundle;
  try {
    bundle = unpackBundle(bytes);
  } catch (error) {
    if (error.code !== "bundle-invalid") throw error;
    throw commandError(`the published graph was not a bundle (${source}: ${error.message})`, "graph-import-not-a-bundle", 422);
  }
  const laidOut = await layOutBundle({ bundle, source, projectRoot, config, force, git, resolveGraphifyBinary, ensureGraphifyOutGitignore });
  return { ...laidOut, remote, ref: graphRef(commit), commit, blob };
}

// publishGraph(git, { projectRoot, outDir, builtAt, config, remote, listing }) →
// { published, pruned, warnings }. The rules of ADR-003 in their order: eligible, then not already
// published, then pushed; and only a push that succeeded prunes. A prune that fails, or cannot
// run, is a warning on a publish that still succeeded.
export async function publishGraph(git, { projectRoot, outDir, builtAt, config, remote, listing }) {
  const eligibility = await publishEligibility(git, { projectRoot, outDir, listing });
  if (!eligibility.eligible) {
    return { published: { outcome: "skipped", commit: eligibility.commit, ref: null, blob: null, reason: eligibility.reason }, pruned: [], warnings: [] };
  }
  const { bytes } = await bundleGraph({ outDir, builtAt, config, git, projectRoot });
  const published = await publishBundle(git, { projectRoot, remote, commit: eligibility.commit, bytes, listing });
  if (published.outcome === "failed") return { published, pruned: [], warnings: [`${remote}: ${published.reason}`] };
  if (published.outcome !== "published") return { published, pruned: [], warnings: [] };
  const prune = await pruneGraphs(git, { projectRoot, remote, listing });
  const warnings = [prune.failed, prune.skipped].filter(Boolean).map((reason) => `${remote}: the prune after publishing failed — ${reason}`);
  return { published, pruned: prune.pruned, warnings };
}
