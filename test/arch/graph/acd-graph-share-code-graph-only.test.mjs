import { defaultWorkspace as _aofWorkspace } from "aof/workspace-services";
import { defaultApplication as _aofApplication } from "aof/default-application";
import { readRuntimeFiles } from "../../support/read-src-files.mjs";
import { dependencySpecifiers } from "../../support/workspace/configured-source.mjs";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultGitExec } from "@aof/execution/worktrees";
import { spawnCliSync } from "../../support/cli-spawn.mjs";
import { createGraphBuildCommand } from "@aof/knowledge/commands/graph-build";
import { createGraphifyCodeBackend } from "@aof/knowledge/graphify-code-backend";
import { createKnowledgeEngine } from "@aof/knowledge/engine";

// graph:build is a face over the port since 179/ADR-002: the services build the graphify code
// backend, the port routes the face's `ingest("code")` to it, and the face keeps the share wrapping.
const composeGraphBuild = (services) => createGraphBuildCommand({ ...services, engine: createKnowledgeEngine({ backends: [createGraphifyCodeBackend(services).graphifyCodeBackend] }) });
// FF-17401 (story 174, ADR-002) — only the codebase graph rides the ref transport.
//
// "`refs/aof/graph/` is named in exactly one source module, `graph-share.mjs`; no memory module
//  imports it, and it imports no memory or mesh-transport module."
//
// m38/ADR-016 (`acd-memory-index-never-on-mesh`) says memory syncback never fetches a remote index
// or a peer's cache. The ref transport is git to the project's own remote, and it may carry the
// codebase graph at the project root only — never the memory work graph (`.aof/memory-graph/`) or
// the memory index. Four proofs:
//   (a) the ref namespace is spelled in one runtime module, so no second door to the remote exists;
//   (b) that module imports nothing from memory and nothing from a mesh transport — except the
//       config reader `memory-config.mjs`, which reaches no index, backend or transport and whose own
//       imports FF-18001 pins (amended by 180/ADR-001);
//   (c) its importers are exactly the four graph commands that share, and no memory module;
//   (d) live: a graph:build the way the memory backend invokes it — under its own `outRoot` —
//       makes no remote git call with `memory.graph.share: "git-refs"` (the new spelling, 180/ADR-003),
//       and the backend still invokes it so.

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SHARE_MODULE = path.join("packages", "knowledge", "src", "graph-share.mjs");
const SHARE_IMPORTERS = new Set([
  path.join("packages", "knowledge", "src", "commands", "graph-build.mjs"),
  path.join("packages", "knowledge", "src", "commands", "graph-fetch.mjs"),
  path.join("packages", "knowledge", "src", "commands", "graph-publish.mjs"),
  path.join("packages", "knowledge", "src", "commands", "graph-prune.mjs"),
]);
const REF_NAMESPACE = /refs\/aof\/graph\//u;
const MEMORY_OR_MESH = /(?:^|\/)memory(?:[-/.]|$)|@aof\/mesh(?:\/|$)|(?:^|\/)mesh[-/]|@aof\/messaging|^ws$/u;
// The one memory-named module graph-share.mjs may import: configuration only (180/ADR-001).
const CONFIG_READER = "./memory-config.mjs";
const IMPORTS_SHARE = /(?:^|\/)graph-share(?:\.mjs)?$/u;
const MEMORY_MODULE = /(?:^|[\\/])memory(?:[\\/]|[-.][^\\/]*$)/u;

function stripComments(source) {
  // Line comments first (TECH_DEBT item 24): a line comment holding a block opener must not blind the scan.
  return source.replace(/(^|[^:])\/\/[^\n]*/gu, "$1").replace(/\/\*[\s\S]*?\*\//gu, "");
}

async function runtimeSources() {
  const files = await readRuntimeFiles(repoRoot);
  return Promise.all(files.map(async (file) => {
    const raw = readFileSync(file.path, "utf8");
    return { rel: path.relative(repoRoot, file.path), code: stripComments(raw), specs: dependencySpecifiers(stripComments(raw)).map((entry) => entry.specifier) };
  }));
}

function refNamers(sources) {
  return sources.filter((source) => REF_NAMESPACE.test(source.code)).map((source) => source.rel).sort();
}

function shareImporters(sources) {
  return sources.filter((source) => source.specs.some((spec) => IMPORTS_SHARE.test(spec))).map((source) => source.rel).sort();
}

export const archTests = [
  {
    name: "arch/174 FF-17401: refs/aof/graph/ is named in exactly one runtime module, graph-share.mjs",
    run: async () => {
      const sources = await runtimeSources();
      assert.ok(sources.length > 0, "found runtime modules to scan");
      assert.deepEqual(refNamers(sources), [SHARE_MODULE], "no second module names the ref namespace");
      // The scanner is live: a planted second namer is caught.
      assert.deepEqual(refNamers([...sources, { rel: "planted.mjs", code: 'const ref = "refs/aof/graph/v1/x";', specs: [] }]), [SHARE_MODULE, "planted.mjs"].sort());
    },
  },
  {
    name: "arch/174 FF-17401: graph-share.mjs imports no memory module but the config reader, and no mesh transport",
    run: async () => {
      const share = (await runtimeSources()).find((source) => source.rel === SHARE_MODULE);
      assert.ok(share, `${SHARE_MODULE} exists`);
      const offenders = share.specs.filter((spec) => spec !== CONFIG_READER && MEMORY_OR_MESH.test(spec));
      assert.deepEqual(offenders, [], `graph-share.mjs imports ${offenders.join(", ")}`);
      for (const planted of ["./memory/graphify-backend.mjs", "../memory.mjs", "@aof/mesh/stream", "ws"]) {
        assert.ok(MEMORY_OR_MESH.test(planted), `the import guard catches ${planted}`);
      }
    },
  },
  {
    name: "arch/174 FF-17401: graph-share.mjs is imported only by the four sharing graph commands, never by a memory module",
    run: async () => {
      const sources = await runtimeSources();
      const importers = shareImporters(sources);
      assert.deepEqual(importers, [...SHARE_IMPORTERS].sort(), "the importers are exactly the sharing commands");
      assert.deepEqual(importers.filter((rel) => MEMORY_MODULE.test(rel)), [], "no memory module imports the transport");
      assert.ok(MEMORY_MODULE.test(path.join("packages", "knowledge", "src", "memory", "graphify-backend.mjs")), "the memory-module test is live");
      assert.ok(MEMORY_MODULE.test(path.join("packages", "knowledge", "src", "memory.mjs")), "and catches the memory verb module");
    },
  },
  {
    name: "arch/174 FF-17401 + 180/01 task 02: a memory backend's work-graph build makes no remote call with sharing on in the new spelling, and the memory backend builds under that root",
    run: async () => {
      const backend = readFileSync(path.join(repoRoot, "packages", "knowledge", "src", "memory", "graphify-backend.mjs"), "utf8");
      assert.match(stripComments(backend), /invoke\(\s*"graph:build",\s*\{[^}]*outRoot:\s*workGraphRoot\(/u, "the memory backend builds under its own outRoot");

      const root = mkdtempSync(path.join(os.tmpdir(), "aof-ff17401-"));
      try {
        const git = (...args) => {
          const result = spawnCliSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.test", ...args], { cwd: root, encoding: "utf8", windowsHide: true });
          assert.equal(result.status, 0, result.stderr);
        };
        mkdirSync(path.join(root, ".aof"), { recursive: true });
        mkdirSync(path.join(root, "wiki", "work"), { recursive: true });
        writeFileSync(path.join(root, ".aof", "aof.config.json"), JSON.stringify({ name: "f", work: { dir: "./wiki/work" }, memory: { backend: "graphify", graph: { share: "git-refs" } } }));
        writeFileSync(path.join(root, "wiki", "work", "a.md"), "# a\n");
        git("init", "-q", "-b", "main");
        git("add", "-A");
        git("commit", "-q", "-m", "x");
        git("remote", "add", "origin", path.join(root, "no-such-remote.git"));

        const graphify = _aofApplication.knowledge.graphify;
        const remote = [];
        const { graphBuildCommand } = composeGraphBuild({
          resolveGraphifyBinary: () => ({ found: true, version: "0.8.44" }),
          runGraphifyBuild: (_request, { outRoot }) => {
            const graphPath = graphify.graphJsonPath(outRoot);
            mkdirSync(path.dirname(graphPath), { recursive: true });
            writeFileSync(graphPath, JSON.stringify({ nodes: [], links: [], hyperedges: [] }));
            return { graphPath, stdout: "", status: 0, builtAt: graphify.graphArtifactBuiltAt(graphPath), unchanged: false };
          },
          readGraph: graphify.readGraph,
          normalizeGraph: graphify.normalizeGraph,
          graphJsonPath: graphify.graphJsonPath,
          graphArtifactBuiltAt: graphify.graphArtifactBuiltAt,
          isCodeOnlyWholeRootBuild: graphify.isCodeOnlyWholeRootBuild,
          git: (args, options) => {
            if (["ls-remote", "fetch", "push"].includes(args[0])) remote.push(args);
            return defaultGitExec(args, options);
          },
          ensureGraphifyOutGitignore: async () => true,
        });
        const ctx = { workspace: await _aofWorkspace.work.loadWorkspace(root) };
        const outRoot = path.join(root, ".aof", "memory-graph");
        for (const input of [{ path: "wiki/work", outRoot }, { path: ".", outRoot }, { path: "wiki/work", backend: "ollama", outRoot }]) {
          const result = await graphBuildCommand.run(input, ctx);
          assert.equal(result.share, undefined, `${JSON.stringify(input)} carries no sharing section`);
        }
        assert.deepEqual(remote, [], "no build under the memory root reached the remote");
        // The probe is live: the codebase build at the project root does reach it.
        await graphBuildCommand.run({ path: "." }, ctx);
        assert.ok(remote.length > 0, "the project-root build asks the remote");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  },
];
