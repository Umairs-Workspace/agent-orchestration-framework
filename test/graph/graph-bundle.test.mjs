import { defaultWorkspace as _aofWorkspace } from "aof/workspace-services";
import { defaultApplication as _aofApplication } from "aof/default-application";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGraphImportCommand } from "@aof/knowledge/commands/graph-import";
import { createGraphBuildCommand } from "@aof/knowledge/commands/graph-build";
import { INPUTS_STAMP, graphifyCacheKey, unpackBundle } from "@aof/knowledge/graph-bundle";
import { defaultGitExec } from "@aof/execution/worktrees";
import { spawnCliSync } from "../support/cli-spawn.mjs";
// 166 — a built graph travels to another machine: `aof graph export <path>` writes the codebase
// graph and graphify's cache to one bundle file, and `aof graph import <path>` lays it out as a
// second clone's graph, in the same project only, saying how stale it is and re-keying the carried
// cache to the receiving clone's line endings. Every fixture is a temp git repo with a hand-written
// `graphify-out/`; no graphify binary is spawned by either verb.

const loadWorkspace = _aofWorkspace.work.loadWorkspace;
const invoke = _aofApplication.invoke;
const listCommands = _aofApplication.listCommands;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");

const WORKSPACE_ID = "9db1fd84f5895e38";
const BUILT_AT = "2026-10-13T09:00:00.000Z";
const CRLF_A = "export const a = 1;\r\nexport function f() {\r\n  return a;\r\n}\r\n";
const CRLF_B = "---\r\ntitle: b\r\n---\r\n# B\r\n\r\nbody\r\n";
const LF = (text) => text.replace(/\r\n/gu, "\n");

function git(cwd, ...args) {
  const result = spawnCliSync("git", ["-c", "core.autocrlf=false", "-c", "user.name=t", "-c", "user.email=t@example.test", ...args], { cwd, encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

const scratchRoots = [];
process.once("exit", () => {
  for (const root of scratchRoots) rmSync(root, { recursive: true, force: true });
});

function scratch() {
  const root = mkdtempSync(path.join(os.tmpdir(), "aof-graph-bundle-"));
  scratchRoots.push(root);
  return root;
}

function writeConfig(repo, workspaceId) {
  mkdirSync(path.join(repo, ".aof"), { recursive: true });
  const config = { name: "fixture", work: { dir: "./wiki/work" } };
  if (workspaceId) config.mesh = { workspaceId };
  writeFileSync(path.join(repo, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`);
  mkdirSync(path.join(repo, "wiki", "work"), { recursive: true });
}

// The source repo: two committed files (CRLF bytes), and a hand-written graphify-out/ whose cache
// is keyed by graphify's formula over those CRLF bytes, with every machine-local file present.
// `rootMessage` keeps an unrelated repo's root commit distinct: a commit's sha is its content, so
// two fixtures with the same files, author, message and second share one root commit.
function makeSource(root, { workspaceId = WORKSPACE_ID, rootMessage = "root" } = {}) {
  const repo = path.join(root, "win", "aof");
  mkdirSync(path.join(repo, "packages"), { recursive: true });
  mkdirSync(path.join(repo, "docs"), { recursive: true });
  git(repo, "init", "-q", "-b", "main");
  writeConfig(repo, workspaceId);
  writeFileSync(path.join(repo, "packages", "a.mjs"), CRLF_A);
  writeFileSync(path.join(repo, "packages", "b.mjs"), "import { a } from './a.mjs';\r\n");
  writeFileSync(path.join(repo, "docs", "b.md"), CRLF_B);
  writeFileSync(path.join(repo, ".gitignore"), "graphify-out/\n");
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", rootMessage);
  const head = git(repo, "rev-parse", "HEAD");
  writeGraph(repo, head);
  return { repo, head };
}

function writeGraph(repo, commit) {
  const out = path.join(repo, "graphify-out");
  const ast = path.join(out, "cache", "ast", "v0.8.44");
  mkdirSync(ast, { recursive: true });
  const graph = {
    directed: true,
    multigraph: false,
    graph: {},
    nodes: [
      { id: "a", label: "a.mjs", file_type: "code", source_file: "packages/a.mjs", source_location: "L1" },
      { id: "b", label: "b.mjs", file_type: "code", source_file: "packages/b.mjs", source_location: "L1" },
    ],
    links: [{ source: "b", target: "a", relation: "imports", confidence: "EXTRACTED", source_file: "packages/b.mjs", source_location: "L1" }],
    hyperedges: [],
    built_at_commit: commit,
  };
  writeFileSync(path.join(out, "graph.json"), JSON.stringify(graph));
  writeFileSync(path.join(out, "manifest.json"), JSON.stringify({ "packages/a.mjs": { mtime: 1, ast_hash: "x", semantic_hash: "" } }));
  writeFileSync(path.join(out, "GRAPH_REPORT.md"), "# Graph report\n");
  writeFileSync(path.join(out, ".gitignore"), "*\n!.gitignore\n");
  writeFileSync(path.join(out, ".graphify_root"), repo);
  for (const [rel, text] of [["packages/a.mjs", CRLF_A], ["docs/b.md", CRLF_B]]) {
    writeFileSync(path.join(ast, `${graphifyCacheKey(rel, Buffer.from(text))}.json`), JSON.stringify({ nodes: [{ id: rel, source_file: rel }], edges: [] }));
  }
  writeFileSync(path.join(out, "cache", "stat-index.json"), JSON.stringify({ [path.join(repo, "packages", "a.mjs")]: { size: 1, mtime_ns: 1, hash: "x" } }));
  const when = new Date(BUILT_AT);
  utimesSync(path.join(out, "graph.json"), when, when);
}

// A second clone of the source, at the same commit, with no graph.
function makeClone(root, source, { name = "wsl", workspaceId = WORKSPACE_ID } = {}) {
  const clone = path.join(root, name, "aof");
  mkdirSync(path.dirname(clone), { recursive: true });
  git(root, "clone", "-q", source, clone);
  if (workspaceId !== WORKSPACE_ID) {
    writeConfig(clone, workspaceId);
  }
  return clone;
}

const ctxFor = async (repo) => ({ workspace: await loadWorkspace(repo) });

async function exportFrom(repo, bundle, extra = {}) {
  return invoke("graph:export", { path: bundle, ...extra }, await ctxFor(repo));
}

async function importInto(repo, bundle, extra = {}) {
  return invoke("graph:import", { path: bundle, ...extra }, await ctxFor(repo));
}

async function rejectsWith(fn, code) {
  let caught = null;
  try {
    await fn();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught, `expected a refusal with code "${code}"`);
  assert.equal(caught.code, code, `refused with "${code}" (got "${caught.code}": ${caught.message})`);
  return caught;
}

function runCli(cwd, args) {
  const result = spawnCliSync(process.execPath, [cliPath, ...args], { cwd, encoding: "utf8", env: { ...process.env, NODE_NO_WARNINGS: "1" } });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function snapshot(dir) {
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

// The receiving side's graphify version, injected — the one input of import that is otherwise a
// probe of the live binary.
async function importWithVersion(repo, bundle, local) {
  const { graphImportCommand } = createGraphImportCommand({
    git: defaultGitExec,
    resolveGraphifyBinary: () => local,
    ensureGraphifyOutGitignore: async () => true,
  });
  return graphImportCommand.run({ path: bundle }, await ctxFor(repo));
}

// ------------------------------------------------------------------------------- 00 ----

const exportTests = [
  {
    name: "166/00 E1 · a built graph is written to one bundle file, stamped for the receiver",
    run: async () => {
      const root = scratch();
      const { repo, head } = makeSource(root);
      const bundle = path.join(root, "carry", "aof.graph");
      const result = await exportFrom(repo, bundle);
      assert.deepEqual(readdirSync(path.dirname(bundle)), ["aof.graph"]);
      const { stamp, files } = unpackBundle(readFileSync(bundle));
      const carried = Object.fromEntries(files.map((file) => [file.path, file.bytes]));
      for (const rel of ["graph.json", "manifest.json", "GRAPH_REPORT.md", `cache/ast/v0.8.44/${graphifyCacheKey("packages/a.mjs", Buffer.from(CRLF_A))}.json`]) {
        assert.ok(carried[rel], `the bundle holds ${rel}`);
        assert.deepEqual(carried[rel], readFileSync(path.join(repo, "graphify-out", ...rel.split("/"))), `${rel} is byte-identical`);
      }
      assert.equal(stamp.sourceCommit, head);
      assert.equal(stamp.builtAt, BUILT_AT);
      assert.equal(stamp.graphifyVersion, "0.8.44");
      assert.equal(stamp.workspaceId, WORKSPACE_ID);
      assert.equal(result.bundlePath, bundle);
      assert.equal(result.bytes, statSync(bundle).size);
      assert.equal(result.fileCount, files.length);
    },
  },
  {
    name: "166/00 E2 · export with no path is refused and writes nothing",
    run: async () => {
      const root = scratch();
      const { repo } = makeSource(root);
      const before = [readdirSync(repo).sort(), readdirSync(path.dirname(repo)).sort()];
      const result = runCli(repo, ["graph", "export", "--json"]);
      assert.notEqual(result.status, 0);
      assert.equal(JSON.parse(result.stdout).code, "graph-export-no-path");
      assert.deepEqual([readdirSync(repo).sort(), readdirSync(path.dirname(repo)).sort()], before);
    },
  },
  {
    name: "166/00 E3 · export before any graph is built is refused and names the build",
    run: async () => {
      const root = scratch();
      const { repo } = makeSource(root);
      rmSync(path.join(repo, "graphify-out", "graph.json"));
      const bundle = path.join(root, "carry", "aof.graph");
      const error = await rejectsWith(() => exportFrom(repo, bundle), "graph-export-no-graph");
      assert.match(error.message, /aof graph build \./u);
      assert.equal(existsSync(bundle), false);
    },
  },
  {
    name: "166/00 E4 · an existing file at the target is replaced only with --force",
    run: async () => {
      const root = scratch();
      const { repo } = makeSource(root);
      const bundle = path.join(root, "carry", "aof.graph");
      mkdirSync(path.dirname(bundle), { recursive: true });
      writeFileSync(bundle, "old");
      await rejectsWith(() => exportFrom(repo, bundle), "graph-export-target-exists");
      assert.equal(readFileSync(bundle, "utf8"), "old");
      await exportFrom(repo, bundle, { force: true });
      assert.ok(unpackBundle(readFileSync(bundle)).files.length > 0, "the target now holds a bundle of the fixture");
    },
  },
  {
    name: "166/00 · the target directory is created when it does not exist yet",
    run: async () => {
      const root = scratch();
      const { repo } = makeSource(root);
      const bundle = path.join(root, "new", "deeper", "aof.graph");
      await exportFrom(repo, bundle);
      assert.ok(statSync(bundle).isFile());
    },
  },
  {
    name: "166/00 · a relative path resolves against the directory the command runs in",
    run: async () => {
      const root = scratch();
      const { repo } = makeSource(root);
      const result = runCli(path.join(repo, "packages"), ["graph", "export", "../aof.graph", "--json"]);
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.ok(statSync(path.join(repo, "aof.graph")).isFile());
    },
  },
  {
    name: "166/00 · graph export is reachable through the registry and has a usage line",
    run: async () => {
      const root = scratch();
      const result = runCli(root, ["graph", "export", "--help"]);
      assert.match(result.stdout + result.stderr, /aof graph export <path> \[--force\] \[--json\]/u);
      const command = listCommands().find((entry) => entry.id === "graph:export");
      assert.ok(command?.cli, "graph:export is registered with a cli adapter");
    },
  },
];

// ------------------------------------------------------------------------------- 01 ----

const importTests = [
  {
    name: "166/01 · the bundle is laid out as the clone's graph and is readable at once",
    run: async () => {
      const root = scratch();
      const { repo } = makeSource(root);
      const bundle = path.join(root, "carry", "aof.graph");
      await exportFrom(repo, bundle);
      const clone = makeClone(root, repo);
      await importInto(clone, bundle);
      for (const rel of ["graph.json", "manifest.json", "GRAPH_REPORT.md"]) {
        assert.deepEqual(readFileSync(path.join(clone, "graphify-out", rel)), readFileSync(path.join(repo, "graphify-out", rel)), `${rel} is byte-identical`);
      }
      assert.match(readFileSync(path.join(clone, "graphify-out", ".gitignore"), "utf8"), /^\*$/mu);
      const impact = await invoke("graph:impact", { paths: ["packages/a.mjs"] }, await ctxFor(clone));
      assert.equal(impact.files[0].present, true);
    },
  },
  {
    name: "166/01 E6 · an existing graph is replaced only with --force, and whole",
    run: async () => {
      const root = scratch();
      const { repo } = makeSource(root);
      const bundle = path.join(root, "carry", "aof.graph");
      await exportFrom(repo, bundle);
      const clone = makeClone(root, repo);
      const stale = path.join(clone, "graphify-out", "cache", "ast", "v0.8.44");
      mkdirSync(stale, { recursive: true });
      writeFileSync(path.join(clone, "graphify-out", "graph.json"), "{}");
      writeFileSync(path.join(stale, "stale.json"), "{}");
      const before = snapshot(path.join(clone, "graphify-out"));
      await rejectsWith(() => importInto(clone, bundle), "graph-import-graph-exists");
      assert.deepEqual(snapshot(path.join(clone, "graphify-out")), before);
      await importInto(clone, bundle, { force: true });
      assert.equal(existsSync(path.join(stale, "stale.json")), false);
      assert.deepEqual(readFileSync(path.join(clone, "graphify-out", "graph.json")), readFileSync(path.join(repo, "graphify-out", "graph.json")));
    },
  },
  {
    name: "166/01 E7 · a path that is not an aof graph bundle is refused and the clone's graph is untouched",
    run: async () => {
      const root = scratch();
      const { repo } = makeSource(root);
      const carry = path.join(root, "carry");
      await exportFrom(repo, path.join(carry, "aof.graph"));
      writeFileSync(path.join(carry, "README.md"), "# not a bundle\n");
      const { gzipSync } = await import("node:zlib");
      writeFileSync(path.join(carry, "plain.gz"), gzipSync(Buffer.from("just some text\n")));
      const clone = makeClone(root, repo);
      await importInto(clone, path.join(carry, "aof.graph"));
      const before = snapshot(path.join(clone, "graphify-out"));
      for (const target of [path.join(carry, "missing.graph"), path.join(carry, "README.md"), carry, path.join(carry, "plain.gz")]) {
        const error = await rejectsWith(() => importInto(clone, target, { force: true }), "graph-import-not-a-bundle");
        assert.ok(error.message.includes(target), `the refusal names ${target}`);
        assert.deepEqual(snapshot(path.join(clone, "graphify-out")), before, `the graph is untouched after ${target}`);
      }
    },
  },
  {
    name: "166/01 E8 · a bundle truncated mid-copy is refused and leaves nothing half-written",
    run: async () => {
      const root = scratch();
      const { repo } = makeSource(root);
      const bundle = path.join(root, "carry", "aof.graph");
      await exportFrom(repo, bundle);
      const bytes = readFileSync(bundle);
      const cut = path.join(root, "carry", "cut.graph");
      writeFileSync(cut, bytes.subarray(0, Math.floor(bytes.length / 2)));
      const clone = makeClone(root, repo);
      await rejectsWith(() => importInto(clone, cut), "graph-import-not-a-bundle");
      assert.equal(existsSync(path.join(clone, "graphify-out")), false);
      assert.deepEqual(readdirSync(clone).filter((name) => name.startsWith("graphify-out")), []);
    },
  },
  {
    name: "166/01 E13 · a bundle from another project is refused, and --force does not override it",
    run: async () => {
      const root = scratch();
      const { repo } = makeSource(root);
      const bundle = path.join(root, "carry", "aof.graph");
      await exportFrom(repo, bundle);
      const clone = makeClone(root, repo, { workspaceId: "0f0f0f0f0f0f0f0f" });
      for (const extra of [{}, { force: true }]) {
        const error = await rejectsWith(() => importInto(clone, bundle, extra), "graph-import-wrong-project");
        assert.match(error.message, /9db1fd84f5895e38/u);
        assert.match(error.message, /0f0f0f0f0f0f0f0f/u);
        assert.equal(existsSync(path.join(clone, "graphify-out")), false);
      }
    },
  },
  {
    name: "166/01 · a project with no workspaceId is identified by its root commit",
    run: async () => {
      const root = scratch();
      const { repo } = makeSource(root, { workspaceId: null });
      const bundle = path.join(root, "carry", "aof.graph");
      await exportFrom(repo, bundle);
      const clone = makeClone(root, repo, { workspaceId: null });
      await importInto(clone, bundle);
      const other = makeSource(path.join(root, "other"), { workspaceId: null, rootMessage: "an unrelated project" }).repo;
      rmSync(path.join(other, "graphify-out"), { recursive: true, force: true });
      await rejectsWith(() => importInto(other, bundle), "graph-import-wrong-project");
    },
  },
  {
    name: "166/01 · import with no path is refused, and the verb has a usage line in the registry",
    run: async () => {
      const root = scratch();
      const { repo } = makeSource(root);
      const result = runCli(repo, ["graph", "import", "--json"]);
      assert.notEqual(result.status, 0);
      assert.equal(JSON.parse(result.stdout).code, "graph-import-no-path");
      const help = runCli(repo, ["graph", "import", "--help"]);
      assert.match(help.stdout + help.stderr, /aof graph import <path> \[--force\] \[--json\]/u);
      assert.ok(listCommands().find((entry) => entry.id === "graph:import")?.cli, "graph:import is registered with a cli adapter");
    },
  },
];

// ------------------------------------------------------------------------------- 02 ----

const FOUND_0844 = { found: true, version: "0.8.44" };

const stalenessTests = [
  {
    name: "166/02 E9 · a clone ahead of the bundle's commit is told how far behind the graph is",
    run: async () => {
      const root = scratch();
      const { repo, head } = makeSource(root);
      const bundle = path.join(root, "carry", "aof.graph");
      await exportFrom(repo, bundle);
      const clone = makeClone(root, repo);
      for (let index = 0; index < 12; index += 1) git(clone, "commit", "-q", "--allow-empty", "-m", `c${index}`);
      const result = await importWithVersion(clone, bundle, FOUND_0844);
      assert.equal(result.sourceCommit, head);
      assert.equal(result.builtAt, BUILT_AT);
      assert.equal(result.commitsBehind, 12);
      const command = listCommands().find((entry) => entry.id === "graph:import");
      const text = command.cli.render(result);
      assert.match(text, /12 commits behind HEAD/u);
      assert.match(text, /\d+ (?:minutes?|hours?|days) old/u);
    },
  },
  {
    name: "166/02 · commit distance at the edges — at HEAD, and a HEAD that does not descend from it",
    run: async () => {
      const root = scratch();
      const { repo } = makeSource(root);
      git(repo, "commit", "-q", "--allow-empty", "-m", "graph here");
      const graphCommit = git(repo, "rev-parse", "HEAD");
      writeGraph(repo, graphCommit);
      const bundle = path.join(root, "carry", "aof.graph");
      await exportFrom(repo, bundle);
      const clone = makeClone(root, repo);
      const render = listCommands().find((entry) => entry.id === "graph:import").cli.render;
      const atHead = await importWithVersion(clone, bundle, FOUND_0844);
      assert.equal(atHead.commitsBehind, 0);
      assert.match(render(atHead), /the graph is at HEAD/u);
      git(clone, "checkout", "-q", "-b", "side", "HEAD~1");
      git(clone, "commit", "-q", "--allow-empty", "-m", "diverged");
      rmSync(path.join(clone, "graphify-out"), { recursive: true, force: true });
      const diverged = await importWithVersion(clone, bundle, FOUND_0844);
      assert.equal(diverged.commitsBehind, null);
      assert.match(render(diverged), new RegExp(`${graphCommit.slice(0, 7)}, which is not an ancestor of HEAD`, "u"));
    },
  },
  {
    name: "166/02 E10 · a source commit this clone has never fetched is named, never guessed",
    run: async () => {
      const root = scratch();
      const { repo } = makeSource(root);
      const clone = makeClone(root, repo);
      git(repo, "commit", "-q", "--allow-empty", "-m", "never fetched");
      const unfetched = git(repo, "rev-parse", "HEAD");
      writeGraph(repo, unfetched);
      const bundle = path.join(root, "carry", "aof.graph");
      await exportFrom(repo, bundle);
      const result = await importWithVersion(clone, bundle, FOUND_0844);
      assert.equal(result.sourceCommit, unfetched);
      assert.equal(result.commitsBehind, null);
      const text = listCommands().find((entry) => entry.id === "graph:import").cli.render(result);
      assert.match(text, /a commit not in this clone/u);
      assert.match(text, /old/u);
    },
  },
  {
    name: "166/02 E11 · a different graphify version is imported with a warning, never refused",
    run: async () => {
      const root = scratch();
      const { repo } = makeSource(root);
      const bundle = path.join(root, "carry", "aof.graph");
      await exportFrom(repo, bundle);
      const cases = [
        [{ found: true, version: "0.9.5" }, (warnings) => {
          assert.equal(warnings.length, 1);
          assert.match(warnings[0], /0\.8\.44/u);
          assert.match(warnings[0], /0\.9\.5/u);
          assert.match(warnings[0], /discard the carried cache/u);
          assert.match(warnings[0], /re-extracts everything/u);
        }],
        [FOUND_0844, (warnings) => assert.deepEqual(warnings, [])],
        [{ found: false, hint: "absent" }, (warnings) => {
          assert.equal(warnings.length, 1);
          assert.match(warnings[0], /not installed here/u);
          assert.match(warnings[0], /aof project provision graphify/u);
        }],
      ];
      for (const [local, check] of cases) {
        const clone = makeClone(root, repo, { name: `v-${local.version ?? "absent"}` });
        const result = await importWithVersion(clone, bundle, local);
        check(result.warnings);
      }
    },
  },
  {
    name: "166/02 E14 · after the import, every graph reader reports the build time the bundle carried",
    run: async () => {
      const root = scratch();
      const { repo } = makeSource(root);
      const bundle = path.join(root, "carry", "aof.graph");
      await exportFrom(repo, bundle);
      const clone = makeClone(root, repo);
      await importInto(clone, bundle);
      const impact = await invoke("graph:impact", { paths: ["packages/a.mjs"] }, await ctxFor(clone));
      assert.equal(impact.builtAt, BUILT_AT);
    },
  },
];

// ------------------------------------------------------------------------------- 03 ----

function containsPath(dir, needle) {
  const forms = [needle, needle.replaceAll("\\", "/"), needle.replaceAll("/", "\\"), JSON.stringify(needle).slice(1, -1)];
  return Object.entries(snapshot(dir)).filter(([, base64]) => {
    const text = Buffer.from(base64, "base64").toString("utf8");
    return forms.some((form) => text.includes(form));
  }).map(([rel]) => rel);
}

const machineTests = [
  {
    name: "166/03 E12 · no path from the source machine reaches the receiver's graph",
    run: async () => {
      const root = scratch();
      const { repo } = makeSource(root);
      const bundle = path.join(root, "carry", "aof.graph");
      await exportFrom(repo, bundle);
      const { files } = unpackBundle(readFileSync(bundle));
      const forms = [repo, repo.replaceAll("\\", "/"), repo.replaceAll("/", "\\"), JSON.stringify(repo).slice(1, -1)];
      for (const file of files) {
        const text = file.bytes.toString("utf8");
        assert.ok(!forms.some((form) => text.includes(form)), `${file.path} carries no source-machine path`);
      }
      assert.ok(!files.some((file) => file.path === "cache/stat-index.json"), "the bundle holds no stat index");
      const clone = makeClone(root, repo);
      await importInto(clone, bundle);
      assert.equal(readFileSync(path.join(clone, "graphify-out", ".graphify_root"), "utf8"), clone);
      assert.deepEqual(containsPath(path.join(clone, "graphify-out"), repo), []);
    },
  },
  {
    name: "166/03 E15 · import re-keys the carried cache to the receiving clone's line endings",
    run: async () => {
      const root = scratch();
      const { repo } = makeSource(root);
      const bundle = path.join(root, "carry", "aof.graph");
      await exportFrom(repo, bundle);
      const clone = makeClone(root, repo);
      writeFileSync(path.join(clone, "packages", "a.mjs"), LF(CRLF_A));
      writeFileSync(path.join(clone, "docs", "b.md"), LF(CRLF_B));
      const result = await importInto(clone, bundle);
      const cache = path.join(clone, "graphify-out", "cache", "ast", "v0.8.44");
      for (const [rel, crlf] of [["packages/a.mjs", CRLF_A], ["docs/b.md", CRLF_B]]) {
        const lfKey = graphifyCacheKey(rel, Buffer.from(LF(crlf)));
        const crlfKey = graphifyCacheKey(rel, Buffer.from(crlf));
        assert.notEqual(lfKey, crlfKey, `${rel}: the two checkouts key differently`);
        assert.deepEqual(
          readFileSync(path.join(cache, `${lfKey}.json`)),
          readFileSync(path.join(repo, "graphify-out", "cache", "ast", "v0.8.44", `${crlfKey}.json`)),
          `${rel}: the entry moved to the LF key with its content untouched`
        );
        assert.equal(existsSync(path.join(cache, `${crlfKey}.json`)), false);
      }
      assert.equal(result.cache.rekeyed, 2);
    },
  },
  {
    name: "166/03 · an entry is carried only when it maps to a file this clone holds",
    run: async () => {
      const root = scratch();
      const { repo } = makeSource(root);
      const sourceCache = path.join(repo, "graphify-out", "cache", "ast", "v0.8.44");
      writeFileSync(path.join(sourceCache, `${graphifyCacheKey("packages/gone.mjs", Buffer.from("gone\r\n"))}.json`), "{}");
      const bundle = path.join(root, "carry", "aof.graph");
      await exportFrom(repo, bundle);
      // Same line endings as the source for a.mjs (kept), different content for b.md (dropped),
      // and gone.mjs, which this clone does not hold (dropped).
      const clone = makeClone(root, repo);
      writeFileSync(path.join(clone, "docs", "b.md"), "---\ntitle: b\n---\n# B, rewritten\n");
      const result = await importInto(clone, bundle);
      assert.deepEqual(result.cache, { kept: 1, rekeyed: 0, dropped: 2 });
      const cache = path.join(clone, "graphify-out", "cache", "ast", "v0.8.44");
      assert.deepEqual(readdirSync(cache), [`${graphifyCacheKey("packages/a.mjs", Buffer.from(CRLF_A))}.json`]);
    },
  },
];

// graph:build over a fixture, with graphify replaced by a counter that leaves the artifact as it is
// — the inputs stamp, not graphify, is what these scenarios exercise (166 F-01).
async function buildWith(repo, { version = "0.8.44" } = {}) {
  const services = _aofApplication.knowledge.graphify;
  const calls = [];
  const { graphBuildCommand } = createGraphBuildCommand({
    resolveGraphifyBinary: () => ({ found: true, binary: "graphify", path: "graphify", version }),
    runGraphifyBuild: (input, options) => {
      calls.push(input);
      const graphPath = services.graphJsonPath(options.outRoot);
      return { graphPath, stdout: "fake graphify", status: 0, builtAt: services.graphArtifactBuiltAt(graphPath), unchanged: false };
    },
    readGraph: services.readGraph,
    normalizeGraph: services.normalizeGraph,
    graphJsonPath: services.graphJsonPath,
    graphArtifactBuiltAt: services.graphArtifactBuiltAt,
    isCodeOnlyWholeRootBuild: services.isCodeOnlyWholeRootBuild,
    git: defaultGitExec,
  });
  const result = await graphBuildCommand.run({ path: "." }, await ctxFor(repo));
  return { result, ran: calls.length };
}

// A source graph stamped by one build, exported, and imported into an LF checkout of the clone.
async function stampedCarry(root) {
  const { repo } = makeSource(root);
  assert.equal((await buildWith(repo)).ran, 1, "the first build runs graphify and stamps what it read");
  const bundle = path.join(root, "carry", "aof.graph");
  await exportFrom(repo, bundle);
  const clone = makeClone(root, repo);
  writeFileSync(path.join(clone, "packages", "a.mjs"), LF(CRLF_A));
  writeFileSync(path.join(clone, "packages", "b.mjs"), LF("import { a } from './a.mjs';\r\n"));
  writeFileSync(path.join(clone, "docs", "b.md"), LF(CRLF_B));
  await importInto(clone, bundle);
  return { repo, clone };
}

machineTests.push(
  {
    name: "166/01 F-01 · a second build over unchanged files runs no graphify",
    run: async () => {
      const root = scratch();
      const { repo } = makeSource(root);
      assert.equal((await buildWith(repo)).ran, 1);
      const again = await buildWith(repo);
      assert.equal(again.ran, 0, "graphify is not run");
      assert.equal(again.result.unchanged, true);
      assert.equal(again.result.nodeCount, 2, "counts still come from graph.json");
      assert.equal(again.result.builtAt, BUILT_AT, "builtAt is the graph's own build time");
    },
  },
  {
    name: "166/01 F-01 · the imported graph is current on an LF checkout of the same commit — the build runs no graphify",
    run: async () => {
      const root = scratch();
      const { clone } = await stampedCarry(root);
      const { result, ran } = await buildWith(clone);
      assert.equal(ran, 0, "graphify is not run");
      assert.equal(result.unchanged, true);
      assert.match(result.stdout, /graphify was not run/u);
    },
  },
  ...[
    ["\"packages/a.mjs\" is edited", (clone) => writeFileSync(path.join(clone, "packages", "a.mjs"), "export const a = 2;\n")],
    ["a new file \"packages/c.mjs\" is added", (clone) => writeFileSync(path.join(clone, "packages", "c.mjs"), "export const c = 1;\n")],
    ["a file graphify never read is deleted", (clone) => rmSync(path.join(clone, "docs", "b.md"))],
    ["graph.json was rewritten after it was stamped", (clone) => writeFileSync(path.join(clone, "graphify-out", "graph.json"), readFileSync(path.join(clone, "graphify-out", "graph.json"), "utf8").replace("\"a.mjs\"", "\"a2.mjs\""))],
  ].map(([change, apply]) => ({
    name: `166/01 F-01 · the build runs graphify when ${change}`,
    run: async () => {
      const root = scratch();
      const { clone } = await stampedCarry(root);
      apply(clone);
      assert.equal((await buildWith(clone)).ran, 1);
    },
  })),
  {
    name: "166/01 F-01 · the build runs graphify when this machine's graphify version differs from the stamp's",
    run: async () => {
      const root = scratch();
      const { clone } = await stampedCarry(root);
      assert.equal((await buildWith(clone, { version: "0.9.5" })).ran, 1);
    },
  },
  {
    name: "166/01 F-01 · a code-only build over the whole tree stamps what it read; a subtree or backend build does not",
    run: async () => {
      const root = scratch();
      const { repo } = makeSource(root);
      await buildWith(repo);
      const stamp = JSON.parse(readFileSync(path.join(repo, "graphify-out", INPUTS_STAMP), "utf8"));
      assert.equal(stamp.graphifyVersion, "0.8.44");
      assert.match(stamp.digest, /^[0-9a-f]{64}$/u);
      const { files } = unpackBundle(await (async () => {
        const bundle = path.join(root, "carry", "aof.graph");
        await exportFrom(repo, bundle);
        return readFileSync(bundle);
      })());
      assert.ok(files.some((file) => file.path === INPUTS_STAMP), "the stamp travels in the bundle");
      assert.equal(_aofApplication.knowledge.graphify.isCodeOnlyWholeRootBuild({ path: "packages" }, repo, repo), false, "a subtree build is never skipped");
      assert.equal(_aofApplication.knowledge.graphify.isCodeOnlyWholeRootBuild({ path: ".", backend: "claude" }, repo, repo), false, "a backend build is never skipped");
    },
  },
  {
    name: "166/01 F-02 · a code-only build gets the long default budget; every other spawn keeps the short one",
    run: async () => {
      const { graphifySpawnOptions, DEFAULT_GRAPHIFY_TIMEOUT_MS, DEFAULT_CODE_BUILD_TIMEOUT_MS, GRAPHIFY_TIMEOUT_ENV } = _aofApplication.knowledge.graphify;
      assert.equal(graphifySpawnOptions({ projectRoot: "/r", env: {} }).timeout, DEFAULT_GRAPHIFY_TIMEOUT_MS);
      assert.equal(graphifySpawnOptions({ projectRoot: "/r", env: {}, codeBuild: true }).timeout, DEFAULT_CODE_BUILD_TIMEOUT_MS);
      assert.ok(DEFAULT_CODE_BUILD_TIMEOUT_MS >= 600_000, "covers the 232 s measured full build with room");
      assert.equal(graphifySpawnOptions({ projectRoot: "/r", env: { [GRAPHIFY_TIMEOUT_ENV]: "5000" }, codeBuild: true }).timeout, 5000, "the override still wins");
    },
  }
);

machineTests.push({
  name: "166/03 · a clone git cannot list carries the cache unchanged, and says so",
  run: async () => {
    const root = scratch();
    const { repo } = makeSource(root);
    const bundle = path.join(root, "carry", "aof.graph");
    await exportFrom(repo, bundle);
    const clone = makeClone(root, repo);
    const { graphImportCommand } = createGraphImportCommand({
      git: (args, options) => (args[0] === "ls-files" ? Promise.resolve({ status: 128, stdout: "" }) : defaultGitExec(args, options)),
      resolveGraphifyBinary: () => FOUND_0844,
      ensureGraphifyOutGitignore: async () => true,
    });
    const result = await graphImportCommand.run({ path: bundle }, await ctxFor(clone));
    assert.equal(result.cache, null);
    assert.ok(result.warnings.some((warning) => /not re-keyed/u.test(warning)));
    const carried = readdirSync(path.join(repo, "graphify-out", "cache", "ast", "v0.8.44")).sort();
    assert.deepEqual(readdirSync(path.join(clone, "graphify-out", "cache", "ast", "v0.8.44")).sort(), carried);
  },
});

export const graphBundleTests =[...exportTests, ...importTests, ...stalenessTests, ...machineTests];
