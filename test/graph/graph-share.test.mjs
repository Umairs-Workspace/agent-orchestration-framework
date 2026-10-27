import { defaultWorkspace as _aofWorkspace } from "aof/workspace-services";
import { defaultApplication as _aofApplication } from "aof/default-application";
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGraphBuildCommand } from "@aof/knowledge/commands/graph-build";
import { createGraphPublishCommand } from "@aof/knowledge/commands/graph-publish";
import { graphifyCacheKey, unpackBundle } from "@aof/knowledge/graph-bundle";
import { GRAPH_REF_PREFIX } from "@aof/knowledge/graph-share";
import { defaultGitExec } from "@aof/execution/worktrees";
import { spawnCliSync } from "../support/cli-spawn.mjs";
// 174 — a built graph is shared through the project's own remote. With `graph.share: "git-refs"`,
// `aof graph build` takes the graph published for HEAD as the blob behind
// `refs/aof/graph/v1/<commit>` instead of running graphify, and publishes a clean build of a
// default-branch commit there for the next clone; `aof graph fetch` / `publish` / `prune` run each
// half by hand. Every fixture is a bare `origin.git` in a temp dir and clones of it; graphify is a
// stub injected through the driver seam that writes a graph for the tree it is given and counts
// its runs. The explicit verbs need no graphify, so they run through the real CLI.

const loadWorkspace = _aofWorkspace.work.loadWorkspace;
const invoke = _aofApplication.invoke;
const graphify = _aofApplication.knowledge.graphify;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");

const WORKSPACE_ID = "9db1fd84f5895e38";
const VERSION = "0.8.44";
const REMOTE_VERBS = new Set(["ls-remote", "fetch", "push"]);

function run(cwd, command, args, options = {}) {
  return spawnCliSync(command, args, { cwd, windowsHide: true, ...options });
}

function git(cwd, ...args) {
  const result = run(cwd, "git", ["-c", "core.autocrlf=false", "-c", "user.name=t", "-c", "user.email=t@example.test", ...args], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

const scratchRoots = [];
process.once("exit", () => {
  for (const root of scratchRoots) rmSync(root, { recursive: true, force: true });
});

function scratch() {
  const root = mkdtempSync(path.join(os.tmpdir(), "aof-graph-share-"));
  scratchRoots.push(root);
  return root;
}

// ------------------------------------------------------------------- the fixture ----
//
// `origin.git`, a bare repo whose `main` holds `commits` first-parent commits m01..mNN, and whose
// committed `.aof/aof.config.json` sets `graph.share` (no `graph` key when `share` is null), so the
// clone's tree is clean as checked out.
function makeProject({ share = "git-refs", commits = 1 } = {}) {
  const root = scratch();
  const origin = path.join(root, "origin.git");
  git(root, "init", "-q", "--bare", "-b", "main", origin);
  const seed = path.join(root, "seed");
  mkdirSync(path.join(seed, "src"), { recursive: true });
  mkdirSync(path.join(seed, ".aof"), { recursive: true });
  mkdirSync(path.join(seed, "wiki", "work"), { recursive: true });
  git(seed, "init", "-q", "-b", "main");
  const config = { name: "fixture", work: { dir: "./wiki/work" }, mesh: { workspaceId: WORKSPACE_ID } };
  if (share != null) config.graph = { share };
  writeFileSync(path.join(seed, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`);
  writeFileSync(path.join(seed, ".gitignore"), "graphify-out/\nnode_modules/\n");
  writeFileSync(path.join(seed, "wiki", "work", ".gitkeep"), "");
  writeFileSync(path.join(seed, "src", "a.mjs"), "export const a = 1;\n");
  writeFileSync(path.join(seed, "src", "b.mjs"), "import { a } from './a.mjs';\nexport const b = a;\n");
  const shas = [];
  for (let n = 1; n <= commits; n += 1) {
    if (n > 1) writeFileSync(path.join(seed, "src", "log.mjs"), `export const n = ${n};\n`);
    git(seed, "add", "-A");
    git(seed, "commit", "-q", "-m", `m${String(n).padStart(2, "0")}`);
    shas.push(git(seed, "rev-parse", "HEAD"));
  }
  git(seed, "remote", "add", "origin", origin);
  git(seed, "push", "-q", "origin", "main");
  return { root, origin, seed, commits: shas, head: shas.at(-1) };
}

function cloneOf(project, name = "clone") {
  const clone = path.join(project.root, name);
  git(project.root, "clone", "-q", project.origin, clone);
  return clone;
}

const head = (repo) => git(repo, "rev-parse", "HEAD");

// What a graphify build leaves behind: a graph naming the commit it was built at, a manifest of
// the files it read and an AST cache keyed by graphify's formula.
function writeGraph(outRoot, repo, commit) {
  const out = path.join(outRoot, "graphify-out");
  const ast = path.join(out, "cache", "ast", `v${VERSION}`);
  mkdirSync(ast, { recursive: true });
  const read = readdirSync(path.join(repo, "src")).filter((name) => name.endsWith(".mjs")).map((name) => `src/${name}`).sort();
  const graph = {
    directed: true,
    multigraph: false,
    graph: {},
    nodes: read.map((rel) => ({ id: rel, label: path.basename(rel), file_type: "code", source_file: rel, source_location: "L1" })),
    links: [],
    hyperedges: [],
    built_at_commit: commit,
  };
  writeFileSync(path.join(out, "graph.json"), JSON.stringify(graph));
  writeFileSync(path.join(out, "manifest.json"), JSON.stringify(Object.fromEntries(read.map((rel) => [rel, { mtime: 1, ast_hash: "x", semantic_hash: "" }]))));
  writeFileSync(path.join(out, "GRAPH_REPORT.md"), "# Graph report\n");
  for (const rel of read) {
    writeFileSync(path.join(ast, `${graphifyCacheKey(rel, readFileSync(path.join(repo, rel)))}.json`), JSON.stringify({ nodes: [{ id: rel }], edges: [] }));
  }
}

// A git that answers no remote call — what a node with no network looks like to the build.
const offline = (inner) => (args, options) => (REMOTE_VERBS.has(args[0]) ? Promise.resolve({ status: 128, stdout: "", stderr: "fatal: offline in this fixture" }) : inner(args, options));

// graph:build over a clone with the stub graphify. `stamp` names the commit the stub's graph
// claims (HEAD by default); `wrap` decorates the recording git.
async function build(repo, { stamp, wrap, input = { path: "." } } = {}) {
  const ran = [];
  const calls = [];
  const recording = (args, options) => {
    calls.push({ args, env: options?.env });
    return defaultGitExec(args, options);
  };
  const { graphBuildCommand } = createGraphBuildCommand({
    resolveGraphifyBinary: () => ({ found: true, binary: "graphify", path: "graphify", version: VERSION }),
    runGraphifyBuild: (request, options) => {
      ran.push(request);
      writeGraph(options.outRoot, repo, stamp ?? head(repo));
      const graphPath = graphify.graphJsonPath(options.outRoot);
      return { graphPath, stdout: "fake graphify", status: 0, builtAt: graphify.graphArtifactBuiltAt(graphPath), unchanged: false };
    },
    readGraph: graphify.readGraph,
    normalizeGraph: graphify.normalizeGraph,
    graphJsonPath: graphify.graphJsonPath,
    graphArtifactBuiltAt: graphify.graphArtifactBuiltAt,
    isCodeOnlyWholeRootBuild: graphify.isCodeOnlyWholeRootBuild,
    git: wrap ? wrap(recording) : recording,
    ensureGraphifyOutGitignore: async () => true,
  });
  const result = await graphBuildCommand.run(input, { workspace: await loadWorkspace(repo) });
  return {
    result,
    json: graphBuildCommand.cli.json(result),
    text: graphBuildCommand.cli.render(result),
    ran: ran.length,
    remoteCalls: calls.filter((call) => REMOTE_VERBS.has(call.args[0])),
  };
}

// A bundle `aof graph export` wrote for HEAD of a fresh clone, built by the stub with no remote.
async function exportedBundle(project, name = "builder") {
  const builder = cloneOf(project, name);
  assert.equal((await build(builder, { wrap: offline })).ran, 1, "the builder runs graphify once");
  const file = path.join(project.root, `${name}.graph`);
  await invoke("graph:export", { path: file }, { workspace: await loadWorkspace(builder) });
  return readFileSync(file);
}

// Put `bytes` on the remote behind the graph ref of `commit`, as another node would have.
let blobs = 0;
function publishRaw(project, commit, bytes) {
  const file = path.join(project.root, `blob-${(blobs += 1)}`);
  writeFileSync(file, bytes);
  const blob = git(project.origin, "hash-object", "-w", file);
  git(project.origin, "update-ref", `${GRAPH_REF_PREFIX}${commit}`, blob);
  return blob;
}

// The remote's graph refs, as Map(commit → { blob, type }).
function remoteGraphs(project) {
  const listed = git(project.origin, "for-each-ref", "--format=%(objectname) %(objecttype) %(refname)", "refs/aof/");
  const out = new Map();
  for (const line of listed.split("\n").filter(Boolean)) {
    const [blob, type, ref] = line.split(" ");
    out.set(ref.startsWith(GRAPH_REF_PREFIX) ? ref.slice(GRAPH_REF_PREFIX.length) : ref, { blob, type });
  }
  return out;
}

function blobBytes(repo, blob) {
  const result = run(repo, "git", ["cat-file", "blob", blob]);
  assert.equal(result.status, 0);
  return result.stdout;
}

const graphJsonOf = (bytes) => unpackBundle(bytes).files.find((file) => file.path === "graph.json").bytes;

function runCli(cwd, args) {
  const result = run(cwd, process.execPath, [cliPath, ...args], { encoding: "utf8", env: { ...process.env, NODE_NO_WARNINGS: "1" } });
  let json = null;
  try {
    json = JSON.parse(result.stdout);
  } catch {
    json = null;
  }
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "", json };
}

function snapshot(dir) {
  if (!existsSync(dir)) return null;
  const out = {};
  const walk = (at, prefix) => {
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(at, entry.name), rel);
      else out[rel] = readFileSync(path.join(at, entry.name)).toString("base64");
    }
  };
  walk(dir, "");
  return out;
}

// A hook on the bare remote, so a test can see what the remote received.
function hook(project, name, body) {
  const file = path.join(project.origin, "hooks", name);
  writeFileSync(file, `#!/bin/sh\n${body}\n`);
  chmodSync(file, 0o755);
}

const ZERO = "0000000000000000000000000000000000000000";

// ------------------------------------------------------------------------------- 00 ----

const fetchOnMissTests = [
  {
    name: "174/00 E1 · a clone with no graph fetches and imports the published one, and graphify does not run",
    run: async () => {
      const project = makeProject();
      const bundle = await exportedBundle(project);
      publishRaw(project, project.head, bundle);
      const clone = cloneOf(project);
      const { ran, json, text } = await build(clone);
      assert.equal(ran, 0, "graphify has run 0 times");
      assert.deepEqual(readFileSync(path.join(clone, "graphify-out", "graph.json")), graphJsonOf(bundle), "graph.json is the published bundle's");
      assert.deepEqual(json.share.fetched, { remote: "origin", commit: project.head, blob: remoteGraphs(project).get(project.head).blob, used: true });
      assert.equal(json.unchanged, true);
      assert.match(text, /Fetched the graph for [0-9a-f]{7} from origin/u);
      assert.equal(git(clone, "for-each-ref", "refs/aof/"), "", "the clone has no local ref under refs/aof/");
    },
  },
  {
    name: "174/00 E2 · with nothing published for the commit, the build runs graphify as before",
    run: async () => {
      const project = makeProject();
      const clone = cloneOf(project);
      const { ran, json } = await build(clone);
      assert.equal(ran, 1, "graphify has run 1 time");
      assert.equal(json.share.fetched, null, "the JSON result reports no fetch");
    },
  },
  {
    name: "174/00 E3 · a clone whose own graph is current makes no network call",
    run: async () => {
      const project = makeProject();
      const clone = cloneOf(project);
      assert.equal((await build(clone, { wrap: offline })).ran, 1);
      git(clone, "remote", "set-url", "origin", path.join(project.root, "does-not-exist.git"));
      const { ran, text, json, remoteCalls } = await build(clone);
      assert.match(text, /Already current/u);
      assert.equal(ran, 0, "graphify has run 0 times");
      assert.deepEqual(remoteCalls, [], "no call reaches the remote");
      assert.deepEqual(json.share.warnings, [], "no warning about the remote");
    },
  },
  ...[
    ["the clone's \"origin\" remote URL is a path that does not exist", (project, clone) => git(clone, "remote", "set-url", "origin", path.join(project.root, "does-not-exist.git")), /the remote was unreachable/u],
    ["\"origin.git\" holds a ref pointing at a blob that is not a bundle", (project) => publishRaw(project, project.head, Buffer.from("not a bundle\n")), /the published graph was not a bundle/u],
  ].map(([state, arrange, reason], index) => ({
    name: `174/00 E4 · a remote that cannot be used never fails the build — ${index === 0 ? "E4 · " : ""}${state}`,
    run: async () => {
      const project = makeProject();
      const clone = cloneOf(project);
      arrange(project, clone);
      const { ran, json } = await build(clone);
      assert.equal(ran, 1, "graphify has run 1 time");
      assert.equal(json.share.warnings.length, 1, JSON.stringify(json.share.warnings));
      assert.match(json.share.warnings[0], /^origin: /u, "the warning names the remote");
      assert.match(json.share.warnings[0], reason);
      assert.ok(existsSync(path.join(clone, "graphify-out", "graph.json")), "the build still built");
    },
  })),
  {
    name: "174/00 · a fetched graph whose inputs do not match this tree is rebuilt",
    run: async () => {
      const project = makeProject();
      publishRaw(project, project.head, await exportedBundle(project));
      const clone = cloneOf(project);
      writeFileSync(path.join(clone, "scratch.mjs"), "export const scratch = 1;\n");
      const { ran, json, text } = await build(clone);
      assert.equal(ran, 1, "graphify has run 1 time");
      assert.equal(json.share.fetched.used, false);
      assert.equal(json.share.fetched.commit, project.head);
      assert.match(json.share.fetched.reason, /inputs differ/u);
      assert.match(text, /but its inputs differ from this tree, so it was rebuilt/u);
    },
  },
  {
    name: "174/00 E5 · the memory work graph never fetches, whatever graph.share says",
    run: async () => {
      const project = makeProject();
      publishRaw(project, project.head, await exportedBundle(project));
      const clone = cloneOf(project);
      const outRoot = path.join(clone, ".aof", "memory-graph");
      const { remoteCalls, json } = await build(clone, { input: { path: "wiki/work", outRoot } });
      assert.deepEqual(remoteCalls, [], "origin.git receives no fetch and no push for that build");
      assert.equal(json.share, undefined, "the build carries no sharing section");
      assert.equal(existsSync(path.join(clone, "graphify-out")), false, "nothing is written under graphify-out/ at the project root");
      assert.ok(existsSync(path.join(outRoot, "graphify-out", "graph.json")), "the memory graph is built under its own root");
      // The same holds for a whole-root build that lands under another root.
      const elsewhere = await build(clone, { input: { path: ".", outRoot } });
      assert.deepEqual(elsewhere.remoteCalls, []);
      assert.equal(elsewhere.json.share, undefined);
    },
  },
];

// ------------------------------------------------------------------------------- 01 ----

const publishTests = [
  {
    name: "174/01 E6 · a clean build of a default-branch commit is published with no step by hand",
    run: async () => {
      const project = makeProject();
      const clone = cloneOf(project);
      const { json, text } = await build(clone);
      const graphs = remoteGraphs(project);
      assert.deepEqual([...graphs.keys()], [project.head], "origin.git holds refs/aof/graph/v1/<full sha of HEAD>");
      assert.equal(graphs.get(project.head).type, "blob", "the ref points at a blob, not a commit");
      const { stamp } = unpackBundle(blobBytes(project.origin, graphs.get(project.head).blob));
      assert.equal(stamp.sourceCommit, project.head, "the blob is a bundle stamped with the commit");
      assert.equal(json.share.remote, "origin");
      assert.deepEqual(json.share.published, { outcome: "published", commit: project.head, ref: `${GRAPH_REF_PREFIX}${project.head}`, blob: graphs.get(project.head).blob, reason: null });
      assert.match(text, /Published the graph for [0-9a-f]{7} to origin/u);
    },
  },
  ...[
    ["E7 · the clone has an untracked, non-ignored file \"scratch.mjs\"", {}, (clone) => writeFileSync(path.join(clone, "scratch.mjs"), "export const s = 1;\n"), (reason) => assert.match(reason, /scratch\.mjs/u)],
    ["the clone has a modified, uncommitted \"src/a.mjs\"", {}, (clone) => writeFileSync(path.join(clone, "src", "a.mjs"), "export const a = 2;\n"), (reason) => assert.match(reason, /src\/a\.mjs/u)],
    ["E8 · the clone is at a commit pushed only on branch \"aof/mesh/174-a\", not on \"main\"", {}, (clone) => {
      git(clone, "checkout", "-q", "-b", "aof/mesh/174-a");
      writeFileSync(path.join(clone, "src", "lane.mjs"), "export const lane = 1;\n");
      git(clone, "add", "-A");
      git(clone, "commit", "-q", "-m", "lane");
      git(clone, "push", "-q", "origin", "aof/mesh/174-a");
    }, (reason) => assert.match(reason, /not on the default branch/u)],
    ["the clone is at a local commit that was never pushed", {}, (clone) => {
      writeFileSync(path.join(clone, "src", "local.mjs"), "export const local = 1;\n");
      git(clone, "add", "-A");
      git(clone, "commit", "-q", "-m", "local");
    }, (reason) => assert.match(reason, /not on the default branch/u)],
    ["E9 · the graph on disk was built at an earlier commit and HEAD has moved on", { commits: 2 }, () => {}, (reason, project) => {
      assert.ok(reason.includes(project.commits[0].slice(0, 7)), reason);
      assert.ok(reason.includes(project.commits[1].slice(0, 7)), reason);
    }],
  ].map(([state, shape, arrange, check]) => ({
    name: `174/01 E7 · a build that may not be published says why, and pushes nothing — ${state}`,
    run: async () => {
      const project = makeProject(shape);
      const clone = cloneOf(project);
      arrange(clone);
      const stamp = shape.commits === 2 ? project.commits[0] : undefined;
      const { json } = await build(clone, { stamp });
      assert.equal(remoteGraphs(project).size, 0, "origin.git holds no ref under refs/aof/graph/");
      assert.equal(json.share.published.outcome, "skipped", "nothing published");
      check(json.share.published.reason, project);
      assert.deepEqual(json.share.warnings, [], "a skipped publish is a reason, not a warning");
    },
  })),
  {
    name: "174/01 · an ignored file in the tree does not stop a publish",
    run: async () => {
      const project = makeProject();
      const clone = cloneOf(project);
      mkdirSync(path.join(clone, "node_modules"), { recursive: true });
      writeFileSync(path.join(clone, "node_modules", "x.js"), "module.exports = 1;\n");
      await build(clone);
      assert.deepEqual([...remoteGraphs(project).keys()], [project.head]);
    },
  },
  {
    name: "174/01 E10 · a commit another node already published is left as it is",
    run: async () => {
      const project = makeProject();
      const clone = cloneOf(project);
      await build(clone, { wrap: offline });
      const b1 = publishRaw(project, project.head, Buffer.from("another node's bundle\n"));
      const { status, json, stderr } = runCli(clone, ["graph", "publish", "--json"]);
      assert.equal(status, 0, stderr);
      assert.equal(remoteGraphs(project).get(project.head).blob, b1, "the ref still points at B1");
      assert.equal(json.published.outcome, "already-published");
    },
  },
  {
    name: "174/01 E11 · a publish that loses the race is reported as already published, not as an error",
    run: async () => {
      const project = makeProject();
      const clone = cloneOf(project);
      await build(clone, { wrap: offline });
      let other = null;
      const racing = (args, options) => {
        if (args[0] === "push" && other == null) other = publishRaw(project, project.head, Buffer.from("the other clone's bundle\n"));
        return defaultGitExec(args, options);
      };
      const { graphPublishCommand } = createGraphPublishCommand({ git: racing, graphArtifactBuiltAt: graphify.graphArtifactBuiltAt });
      const result = await graphPublishCommand.run({}, { workspace: await loadWorkspace(clone) });
      assert.ok(other, "the other clone published between the check and the push");
      assert.equal(remoteGraphs(project).get(project.head).blob, other, "the ref points at the other clone's blob");
      assert.equal(result.published.outcome, "already-published");
      assert.equal(result.published.blob, other);
    },
  },
];

// ------------------------------------------------------------------------------- 02 ----

const optInTests = [
  ...[
    ["E12 · has no \"graph\" key", null],
    ["sets \"graph.share\" to \"off\"", "off"],
  ].map(([setting, share]) => ({
    name: `174/02 E12 · a project that has not turned sharing on never contacts the remote — ${setting}`,
    run: async () => {
      const project = makeProject({ share });
      publishRaw(project, project.head, Buffer.from("published\n"));
      const clone = cloneOf(project);
      const { ran, remoteCalls, json } = await build(clone);
      assert.equal(ran, 1, "graphify has run 1 time");
      assert.deepEqual(remoteCalls, [], "origin.git receives no fetch and no push for that build");
      assert.equal("share" in json, false, "the JSON result carries no sharing section");
      assert.equal(remoteGraphs(project).get(project.head).blob != null, true, "the remote is untouched");
    },
  })),
  {
    name: "174/02 E13 · initialising a new project writes no sharing setting",
    run: async () => {
      const repo = scratch();
      git(repo, "init", "-q", "-b", "main");
      const env = { ...process.env, NODE_NO_WARNINGS: "1", AOF_GLOBAL_HOME: mkdtempSync(path.join(os.tmpdir(), "aof-graph-share-home-")) };
      scratchRoots.push(env.AOF_GLOBAL_HOME);
      // `aof work init` installs the bundle over the project config `aof init` writes; neither adds one.
      for (const args of [["init", "--claude", "--json"], ["work", "init", "--json"]]) {
        const result = run(repo, process.execPath, [cliPath, ...args], { encoding: "utf8", env });
        assert.equal(result.status, 0, `aof ${args.join(" ")}: ${result.stderr}`);
      }
      const config = JSON.parse(readFileSync(path.join(repo, ".aof", "aof.config.json"), "utf8"));
      assert.equal("graph" in config, false, `.aof/aof.config.json has no "graph" key (${Object.keys(config)})`);
    },
  },
  {
    name: "174/02 · a sharing setting aof does not know is refused before anything runs",
    run: async () => {
      const project = makeProject({ share: "rsync" });
      const clone = cloneOf(project);
      await assert.rejects(
        build(clone),
        (error) => {
          assert.equal(error.code, "graph-share-unknown");
          assert.match(error.message, /graph\.share/u);
          assert.match(error.message, /"git-refs"/u);
          assert.match(error.message, /"off"/u);
          return true;
        }
      );
      assert.equal(existsSync(path.join(clone, "graphify-out")), false, "graphify has run 0 times");
      const cli = runCli(clone, ["graph", "fetch", "--json"]);
      assert.notEqual(cli.status, 0);
      assert.equal(cli.json?.code, "graph-share-unknown", "the explicit verbs refuse it too");
    },
  },
  ...[
    ["E14 · has no \"graphify-out/\"", false, [], (clone, bundle, before, cli) => {
      assert.equal(cli.status, 0, cli.stderr);
      assert.deepEqual(readFileSync(path.join(clone, "graphify-out", "graph.json")), graphJsonOf(bundle), "graph.json is the published graph's");
      assert.equal(cli.json.remote, "origin");
      assert.equal(cli.json.commitState, "at-head");
    }],
    ["already has a graph", true, [], (clone, bundle, before, cli) => {
      assert.notEqual(cli.status, 0);
      assert.equal(cli.json.code, "graph-import-graph-exists");
      assert.deepEqual(snapshot(path.join(clone, "graphify-out")), before, "the old graph is byte-identical");
    }],
    ["already has a graph, with --force", true, ["--force"], (clone, bundle, before, cli) => {
      assert.equal(cli.status, 0, cli.stderr);
      assert.deepEqual(readFileSync(path.join(clone, "graphify-out", "graph.json")), graphJsonOf(bundle));
      assert.equal(existsSync(path.join(clone, "graphify-out", "old-only.txt")), false, "the old graph is replaced whole");
    }],
  ].map(([local, hasGraph, flags, check]) => ({
    name: `174/02 E14 · aof graph fetch lays out the graph published for HEAD, with import's refusals — the clone ${local}`,
    run: async () => {
      const project = makeProject();
      const bundle = await exportedBundle(project);
      publishRaw(project, project.head, bundle);
      const clone = cloneOf(project);
      if (hasGraph) {
        writeGraph(clone, clone, "0000000000000000000000000000000000000001");
        writeFileSync(path.join(clone, "graphify-out", "old-only.txt"), "old\n");
      }
      const before = snapshot(path.join(clone, "graphify-out"));
      check(clone, bundle, before, runCli(clone, ["graph", "fetch", ...flags, "--json"]));
    },
  })),
  {
    name: "174/02 · aof graph fetch with nothing published says so and changes nothing",
    run: async () => {
      const project = makeProject();
      const clone = cloneOf(project);
      const cli = runCli(clone, ["graph", "fetch", "--json"]);
      assert.notEqual(cli.status, 0);
      assert.equal(cli.json.code, "graph-fetch-none-published");
      assert.ok(cli.json.error.includes(project.head.slice(0, 7)), cli.json.error);
      assert.equal(existsSync(path.join(clone, "graphify-out")), false, "graphify-out/ is unchanged");
    },
  },
  {
    name: "174/02 E15 · aof graph publish applies the build's rules and says why it published nothing",
    run: async () => {
      const project = makeProject();
      const clone = cloneOf(project);
      await build(clone, { wrap: offline });
      writeFileSync(path.join(clone, "scratch.mjs"), "export const s = 1;\n");
      const cli = runCli(clone, ["graph", "publish", "--json"]);
      assert.equal(cli.status, 0, cli.stderr);
      assert.equal(remoteGraphs(project).size, 0);
      assert.equal(cli.json.published.outcome, "skipped");
      assert.match(cli.json.published.reason, /scratch\.mjs/u);
      assert.match(runCli(clone, ["graph", "publish"]).stdout, /Not published: .*scratch\.mjs/u);
    },
  },
  {
    name: "174/02 · the explicit verbs work while sharing is off",
    run: async () => {
      const project = makeProject({ share: null });
      const clone = cloneOf(project);
      await build(clone);
      const cli = runCli(clone, ["graph", "publish", "--json"]);
      assert.equal(cli.status, 0, cli.stderr);
      assert.equal(cli.json.published.outcome, "published");
      assert.deepEqual([...remoteGraphs(project).keys()], [project.head]);
    },
  },
  {
    name: "174/02 · fetch, publish and prune are registered, routed and have a usage line",
    run: async () => {
      const commands = new Map(_aofApplication.listCommands().map((command) => [command.id, command]));
      for (const verb of ["fetch", "publish", "prune"]) {
        const command = commands.get(`graph:${verb}`);
        assert.ok(command, `graph:${verb} is registered`);
        assert.deepEqual(command.cli.route, ["graph", verb]);
        assert.match(command.cli.spec.usage, new RegExp(`^aof graph ${verb}`, "u"));
      }
    },
  },
];

// ------------------------------------------------------------------------------- 03 ----

// The twenty-five-commit fixture with graphs published for `from`..`to` (1-based, inclusive).
function withPublished(project, from, to) {
  for (let n = from; n <= to; n += 1) publishRaw(project, project.commits[n - 1], Buffer.from(`graph m${n}\n`));
}

const range = (project, from, to) => project.commits.slice(from - 1, to).sort();

const pruneTests = [
  {
    name: "174/03 E16 · a successful publish prunes the oldest graph past twenty",
    run: async () => {
      const project = makeProject({ commits: 25 });
      withPublished(project, 5, 24);
      const clone = cloneOf(project);
      const { json, text } = await build(clone);
      assert.deepEqual([...remoteGraphs(project).keys()].sort(), range(project, 6, 25), "exactly m06 to m25 remain");
      assert.deepEqual(json.share.pruned, [project.commits[4]], "m05 is listed as pruned");
      assert.match(text, /Pruned 1 old graph from origin/u);
    },
  },
  {
    name: "174/03 E17 · a graph of a commit that is not on the default branch is pruned",
    run: async () => {
      const project = makeProject({ commits: 25 });
      withPublished(project, 20, 24);
      git(project.seed, "checkout", "-q", "-b", "aof/mesh/174-a");
      writeFileSync(path.join(project.seed, "src", "lane.mjs"), "export const lane = 1;\n");
      git(project.seed, "add", "-A");
      git(project.seed, "commit", "-q", "-m", "lane");
      git(project.seed, "push", "-q", "origin", "aof/mesh/174-a");
      const lane = git(project.seed, "rev-parse", "HEAD");
      publishRaw(project, lane, Buffer.from("lane graph\n"));
      const clone = cloneOf(project);
      const cli = runCli(clone, ["graph", "prune", "--json"]);
      assert.equal(cli.status, 0, cli.stderr);
      assert.deepEqual([...remoteGraphs(project).keys()].sort(), range(project, 20, 24));
      assert.deepEqual(cli.json.pruned, [lane], "the lane commit is listed as pruned");
    },
  },
  {
    name: "174/03 E18 · prune with nothing to delete says so and pushes nothing",
    run: async () => {
      const project = makeProject({ commits: 25 });
      withPublished(project, 20, 25);
      const log = path.join(project.root, "pushes.log");
      hook(project, "pre-receive", `cat >> "${log.replace(/\\/gu, "/")}"`);
      const clone = cloneOf(project);
      const cli = runCli(clone, ["graph", "prune", "--json"]);
      assert.equal(cli.status, 0, cli.stderr);
      assert.deepEqual(cli.json.pruned, [], "nothing pruned");
      assert.equal(cli.json.kept.length, 6);
      assert.equal(existsSync(log), false, "origin.git received no push");
      assert.match(runCli(clone, ["graph", "prune"]).stdout, /Nothing to prune on origin/u);
    },
  },
  {
    name: "174/03 · prune never deletes a ref outside refs/aof/graph/",
    run: async () => {
      const project = makeProject({ commits: 25 });
      const keep = publishRaw(project, project.head, Buffer.from("x\n"));
      git(project.origin, "update-ref", `${GRAPH_REF_PREFIX}${project.head}`, "-d");
      git(project.origin, "update-ref", "refs/aof/other/keep", keep);
      git(project.origin, "branch", "aof/mesh/174-a", project.commits[0]);
      withPublished(project, 1, 1);
      const clone = cloneOf(project);
      const cli = runCli(clone, ["graph", "prune", "--json"]);
      assert.equal(cli.status, 0, cli.stderr);
      assert.equal(git(project.origin, "rev-parse", "refs/aof/other/keep"), keep, "refs/aof/other/keep is still there");
      assert.equal(git(project.origin, "rev-parse", "refs/heads/aof/mesh/174-a"), project.commits[0], "the branch is still there");
      assert.deepEqual(cli.json.pruned, [project.commits[0]], "m01 is listed as pruned");
    },
  },
  {
    name: "174/03 · a publish whose prune fails is still a successful publish",
    run: async () => {
      const project = makeProject({ commits: 25 });
      hook(project, "pre-receive", `while read old new ref; do [ "$new" = "${ZERO}" ] && { echo "deletions refused" >&2; exit 1; }; done; exit 0`);
      withPublished(project, 5, 24);
      const clone = cloneOf(project);
      const { json } = await build(clone);
      assert.ok(remoteGraphs(project).has(project.head), "origin.git holds the graph of m25");
      assert.equal(json.share.published.outcome, "published");
      assert.deepEqual(json.share.pruned, []);
      assert.equal(json.share.warnings.length, 1);
      assert.match(json.share.warnings[0], /^origin: the prune after publishing failed/u);
    },
  },
];

// The proof the plan names: clone A builds once and publishes, clone B builds the same commit
// with no graphify run and a byte-identical graph.
const roundTripTests = [
  {
    name: "174/00 · one clone's build is the next clone's graph — graphify runs once across both",
    run: async () => {
      const project = makeProject();
      const a = cloneOf(project, "a");
      const first = await build(a);
      assert.equal(first.ran, 1);
      assert.equal(first.json.share.published.outcome, "published");
      const b = cloneOf(project, "b");
      const second = await build(b);
      assert.equal(second.ran, 0, "clone B runs no graphify");
      assert.equal(second.json.share.fetched.used, true);
      assert.deepEqual(readFileSync(path.join(b, "graphify-out", "graph.json")), readFileSync(path.join(a, "graphify-out", "graph.json")));
      for (const call of [...first.remoteCalls, ...second.remoteCalls]) {
        assert.equal(call.env?.GIT_TERMINAL_PROMPT, "0", `git ${call.args[0]} reaches the remote with no prompt`);
      }
    },
  },
];

export const graphShareTests = [
  ...fetchOnMissTests,
  ...publishTests,
  ...optInTests,
  ...pruneTests,
  ...roundTripTests,
];
