import { defaultWorkspace as _aofWorkspace } from "aof/workspace-services";
import { readRuntimeFiles } from "../../support/read-src-files.mjs";
import { dependencySpecifiers } from "../../support/workspace/configured-source.mjs";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GRAPH_REF_PREFIX, fetchPublished, listRemote, publishGraph, pruneGraphs } from "@aof/knowledge/graph-share";
import { defaultGitExec } from "@aof/execution/worktrees";
import { spawnCliSync } from "../../support/cli-spawn.mjs";
// FF-17402 (story 174, ADR-001 and ADR-003) — the ref transport never forces, and never prompts.
//
// "No source module pushes to `refs/aof/graph/` with `--force`, `-f` or a `+` refspec, and every
//  remote git call in `graph-share.mjs` passes `GIT_TERMINAL_PROMPT=0`."
//
// Git refuses to move a ref that points at a non-commit unless forced, and that refusal is the
// whole of "the first publish of a commit wins": a force anywhere would let a later node overwrite
// a graph another node published. And a remote call that can open a credential prompt hangs a
// daemon with no terminal (the Mac's SSH/no-login-session class of failure). Three proofs:
//   (a) static: no module that names the ref namespace or imports the transport spells a force
//       flag or a `+`-prefixed refspec;
//   (b) static: every `ls-remote` / `fetch` / `push` argv in graph-share.mjs goes through
//       `remoteGit`, and `remoteGit` sets GIT_TERMINAL_PROMPT to "0";
//   (c) live: a listing, a fetch, a publish and a prune against a real bare remote, through a
//       recording git — every remote call carries the env, and no push argv forces.

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SHARE_MODULE = path.join("packages", "knowledge", "src", "graph-share.mjs");
const REMOTE_VERBS = new Set(["ls-remote", "fetch", "push"]);
const FORCE_LITERAL = /["'`](?:--force(?:-with-lease|-if-includes)?|-f|--mirror)(?:["'`=])|["'`]\+(?:\$\{|refs\/|[0-9a-f]{7})/u;
const FORCE_ARG = /^(?:--force(?:-with-lease|-if-includes)?(?:=.*)?|-f|--mirror|\+.*)$/u;

function stripComments(source) {
  // Line comments first (TECH_DEBT item 24): a line comment holding a block opener must not blind the scan.
  return source.replace(/(^|[^:])\/\/[^\n]*/gu, "$1").replace(/\/\*[\s\S]*?\*\//gu, "");
}

function forcingLines(code) {
  return code.split("\n").filter((line) => FORCE_LITERAL.test(line));
}

export const archTests = [
  {
    name: "arch/174 FF-17402: no module that reaches refs/aof/graph/ spells a force flag or a + refspec",
    run: async () => {
      const files = await readRuntimeFiles(repoRoot);
      const offenders = [];
      let scanned = 0;
      for (const file of files) {
        const rel = path.relative(repoRoot, file.path);
        const code = stripComments(readFileSync(file.path, "utf8"));
        const reaches = /refs\/aof\/graph\//u.test(code)
          || dependencySpecifiers(code).some((entry) => /(?:^|\/)graph-share(?:\.mjs)?$/u.test(entry.specifier));
        if (!reaches) continue;
        scanned += 1;
        for (const line of forcingLines(code)) offenders.push(`${rel}: ${line.trim()}`);
      }
      assert.ok(scanned >= 5, `scanned the transport and its importers (${scanned})`);
      assert.deepEqual(offenders, [], "no push to the graph namespace can be forced");
      for (const planted of ['["push", "--force", remote]', '["push", "-f", remote]', '`+${blob}:${ref}`', '"--force-with-lease=x"']) {
        assert.equal(forcingLines(planted).length, 1, `the guard catches ${planted}`);
      }
    },
  },
  {
    name: "arch/174 FF-17402: every remote git call in graph-share.mjs goes through remoteGit, which sets GIT_TERMINAL_PROMPT=0",
    run: async () => {
      const code = stripComments(readFileSync(path.join(repoRoot, SHARE_MODULE), "utf8"));
      const argvs = [...code.matchAll(/(\w+)\(\s*git\s*,\s*\[\s*"(ls-remote|fetch|push)"/gu)];
      assert.ok(argvs.length >= 4, `found the remote calls (${argvs.length})`);
      assert.deepEqual(argvs.filter((match) => match[1] !== "remoteGit").map((match) => match[0]), [], "every remote verb is called through remoteGit");
      assert.deepEqual([...code.matchAll(/\bgit\(\s*\[\s*"(ls-remote|fetch|push)"/gu)].map((match) => match[0]), [], "no remote verb is called on git directly");
      assert.match(code, /GIT_TERMINAL_PROMPT:\s*"0"/u, "the remote env disables the prompt");
      assert.match(code, /function remoteGit\([^)]*\)\s*\{[^}]*env:\s*\{\s*\.\.\.process\.env,\s*\.\.\.REMOTE_ENV\s*\}/u, "remoteGit passes it on every call");
    },
  },
  {
    name: "arch/174 FF-17402: live — a listing, fetch, publish and prune against a bare remote reach it only with GIT_TERMINAL_PROMPT=0 and never force",
    run: async () => {
      const root = mkdtempSync(path.join(os.tmpdir(), "aof-ff17402-"));
      try {
        const git = (cwd, ...args) => {
          const result = spawnCliSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.test", ...args], { cwd, encoding: "utf8", windowsHide: true });
          assert.equal(result.status, 0, result.stderr);
          return result.stdout.trim();
        };
        const origin = path.join(root, "origin.git");
        const clone = path.join(root, "clone");
        git(root, "init", "-q", "--bare", "-b", "main", origin);
        mkdirSync(path.join(clone, ".aof"), { recursive: true });
        git(root, "init", "-q", "-b", "main", clone);
        writeFileSync(path.join(clone, ".aof", "aof.config.json"), JSON.stringify({ name: "f", work: { dir: "./wiki/work" } }));
        writeFileSync(path.join(clone, ".gitignore"), "graphify-out/\n");
        git(clone, "add", "-A");
        git(clone, "commit", "-q", "-m", "x");
        git(clone, "remote", "add", "origin", origin);
        git(clone, "push", "-q", "origin", "main");
        const head = git(clone, "rev-parse", "HEAD");
        const outDir = path.join(clone, "graphify-out");
        mkdirSync(outDir, { recursive: true });
        writeFileSync(path.join(outDir, "graph.json"), JSON.stringify({ nodes: [], links: [], built_at_commit: head }));
        // A graph published for a commit not on main, for the prune to delete.
        writeFileSync(path.join(root, "stray"), "stray\n");
        git(origin, "update-ref", `${GRAPH_REF_PREFIX}${"1".repeat(40)}`, git(origin, "hash-object", "-w", path.join(root, "stray")));

        const calls = [];
        const recording = (args, options) => {
          calls.push({ args, env: options?.env });
          return defaultGitExec(args, options);
        };
        const config = (await _aofWorkspace.work.loadWorkspace(clone)).config;
        const listing = await listRemote(recording, { cwd: clone, remote: "origin" });
        assert.equal(listing.ok, true);
        const outcome = await publishGraph(recording, { projectRoot: clone, outDir, builtAt: new Date().toISOString(), config, remote: "origin", listing });
        assert.equal(outcome.published.outcome, "published");
        assert.deepEqual(outcome.pruned, ["1".repeat(40)], "the prune ran and deleted the stray graph");
        await fetchPublished(recording, { cwd: clone, remote: "origin", commit: head, blob: outcome.published.blob });
        await pruneGraphs(recording, { projectRoot: clone, remote: "origin", listing: await listRemote(recording, { cwd: clone, remote: "origin" }) });

        const remote = calls.filter((call) => REMOTE_VERBS.has(call.args[0]));
        assert.deepEqual([...new Set(remote.map((call) => call.args[0]))].sort(), ["fetch", "ls-remote", "push"], "every remote verb was exercised");
        for (const call of remote) {
          assert.equal(call.env?.GIT_TERMINAL_PROMPT, "0", `git ${call.args.join(" ")} reaches the remote with no prompt`);
          assert.deepEqual(call.args.filter((arg) => FORCE_ARG.test(arg)), [], `git ${call.args.join(" ")} never forces`);
        }
        assert.ok(FORCE_ARG.test("--force") && FORCE_ARG.test(`+${head}:${GRAPH_REF_PREFIX}${head}`), "the argv guard is live");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  },
];
