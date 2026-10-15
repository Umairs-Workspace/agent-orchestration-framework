// Fitness function: the CLI entry-point contract.
//
// `packages/core/src/cli.mjs` EXPORTS `run(argv)` and is the module imported by both the
// canonical bin (`bin/aof.mjs`) and the in-process test harness. It also carries
// a main-module guard so that executing the file DIRECTLY (`node packages/core/src/cli.mjs …`)
// dispatches through `run` exactly like the bin. Without that guard, a direct run
// loads the module, defines `run`, and exits 0 having done NOTHING — a silent
// success that defeats `… || fallback` guards (the bad command "succeeds", so the
// fallback never fires). That footgun cost real debugging time once; this locks it
// shut from three sides:
//   1. a direct run DISPATCHES (produces the help banner, exits 0),
//   2. a direct run is BYTE-IDENTICAL to the bin entry (no divergent face),
//   3. an unknown command exits NON-ZERO (a direct run can still fail loudly),
//   4. IMPORTING the module stays inert (no dispatch, no output) — the design that
//      lets the bin and the harness import `run` without side effects.
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnCliSync } from "../../support/cli-spawn.mjs";
import { stripComments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const srcCli = path.join(repoRoot, "packages", "core", "src", "cli.mjs");
const binCli = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");

function runNode(args) {
  const result = spawnCliSync(process.execPath, ["--no-warnings", ...args], {
    cwd: repoRoot,
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
    encoding: "utf8",
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

export const archTests = [
  {
    name: "arch/cli-entry: `node src/cli.mjs --help` dispatches (not a silent exit-0 no-op)",
    run: async () => {
      const result = runNode([srcCli, "--help"]);
      assert.equal(result.status, 0, `expected exit 0, got ${result.status}\n${result.stderr}`);
      assert.match(
        result.stdout,
        /aof - Agent Orchestration Framework/,
        "a direct `node packages/core/src/cli.mjs --help` must print the help banner — if this is empty, the main-module guard is missing and the file is a silent no-op"
      );
    },
  },
  {
    name: "arch/cli-entry: direct `node src/cli.mjs` is identical to the bin entry",
    run: async () => {
      const direct = runNode([srcCli, "--help"]);
      const bin = runNode([binCli, "--help"]);
      assert.equal(direct.status, bin.status, "exit code must match the bin entry");
      assert.equal(direct.stdout, bin.stdout, "stdout must match the bin entry byte-for-byte");
    },
  },
  {
    name: "arch/cli-entry: a direct run still fails loudly on an unknown command",
    run: async () => {
      const result = runNode([srcCli, "totally-unknown-command"]);
      // The pre-fix footgun: ANY direct invocation exited 0. An unknown command
      // must now exit non-zero, proving the guard routes errors through the catch.
      assert.notEqual(result.status, 0, "an unknown command must exit non-zero");
      assert.match(result.stderr, /Unknown command/, "the error message must reach stderr");
    },
  },
  {
    name: "arch/cli-entry: importing src/cli.mjs is inert (no dispatch, no output)",
    run: async () => {
      // Importing must NOT trip the main-module guard: argv[1] is this -e script,
      // not cli.mjs, so the module only defines `run`. Assert nothing is printed
      // and `run` is exported as a function.
      const url = pathToFileURL(srcCli).href;
      const result = runNode([
        "--input-type=module",
        "-e",
        `import(${JSON.stringify(url)}).then((m) => { if (typeof m.run !== "function") { console.error("run is not a function"); process.exit(3); } });`,
      ]);
      assert.equal(result.status, 0, `import should be inert and exit 0, got ${result.status}\n${result.stderr}`);
      assert.equal(result.stdout, "", "importing the module must print nothing (no dispatch on import)");
    },
  },

  // ══════════════ FF-16004 (160/03, ADR-004) — the compile cache, and a pinned module ceiling ══════
  {
    name: "FF-16004 160/03 task00: the bin turns the compile cache on before it loads the CLI, which it reaches only through a dynamic import",
    run: async () => {
      const code = stripComments(await readFile(binCli, "utf8"));
      const statements = code.split(/\r?\n/u).map((line) => line.trim()).filter((line) => line && !line.startsWith("#!") && !/^import\s/u.test(line));
      assert.equal(statements[0], "module.enableCompileCache?.();", "the first statement enables the compile cache, guarded for a runtime without it");
      assert.ok(!/^import\s[^(]*["']\.\.\/src\/cli\.mjs["']/mu.test(code), "the CLI module is not a static import — a static one is hoisted above the call");
      assert.ok(code.indexOf('await import("../src/cli.mjs")') > code.indexOf("module.enableCompileCache?.()"), "…and is reached through a dynamic import after it");
    },
  },
  {
    name: "FF-16004 160/03 task00: every unit process turns the cache on before it loads a suite",
    run: async () => {
      const dir = await mkdtemp(path.join(os.tmpdir(), "aof-160-03-"));
      try {
        const suite = path.join(dir, "cache-probe.test.mjs");
        await writeFile(suite, CACHE_PROBE_SUITE, "utf8");
        const env = { ...process.env, NODE_NO_WARNINGS: "1" };
        delete env.NODE_DISABLE_COMPILE_CACHE;
        const result = spawnCliSync(process.execPath, [path.join(repoRoot, "scripts", "test-shard.mjs"), suite], { cwd: repoRoot, env, encoding: "utf8" });
        assert.equal(result.status, 0, `the suite saw a compile cache directory when it was loaded\n${result.stdout}\n${result.stderr}`);
        assert.match(result.stdout, /ok - cache-probe/u, "…and its case ran");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "FF-16004 160/03 task00: the entry contract is unchanged — the bin is byte-identical to a direct run of the CLI module",
    run: async () => {
      for (const [argv, code] of [[["--version"], 0], [["--help"], 0], [["no-such-command"], 1]]) {
        const direct = runNode([srcCli, ...argv]);
        const bin = runNode([binCli, ...argv]);
        assert.equal(bin.status, code, `${argv.join(" ")} exits ${code} through the bin\n${bin.stderr}`);
        assert.equal(direct.status, bin.status, `${argv.join(" ")}: the exit code matches a direct run`);
        assert.equal(bin.stdout, direct.stdout, `${argv.join(" ")}: stdout is byte-identical`);
        assert.equal(bin.stderr, direct.stderr, `${argv.join(" ")}: stderr is byte-identical`);
      }
    },
  },
  {
    name: "FF-16004 160/03 task00: a runtime without the compile cache still starts",
    run: async () => {
      const dir = await mkdtemp(path.join(os.tmpdir(), "aof-160-03-"));
      try {
        const preload = path.join(dir, "no-compile-cache.mjs");
        await writeFile(preload, 'import module from "node:module";\nmodule.enableCompileCache = undefined;\n', "utf8");
        const result = runNode(["--import", pathToFileURL(preload).href, binCli, "--version"]);
        assert.equal(result.status, 0, `the bin starts without module.enableCompileCache\n${result.stderr}`);
        assert.match(result.stdout, /^\d+\.\d+\.\d+/u, "…and prints the version");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "FF-16004 160/03 task01: a child's module count stays within its pinned ceiling, and --version loads no command surface",
    run: async () => {
      for (const row of MODULE_CEILINGS) {
        const modules = await modulesEvaluated(row.argv);
        assert.deepEqual(ceilingProblems(row, modules.length), [], `aof ${row.argv.join(" ")} — ${modules.length} modules`);
        if (row.argv[0] === "--version") {
          assert.ok(modules.some((url) => url.endsWith("/packages/core/src/cli.mjs")), "the hook recorded the CLI, so the count is not vacuous");
          assert.deepEqual(modules.filter((url) => /\/command-core\.mjs$|\/commands\//u.test(url)), [], "--version evaluates neither the command core nor any command module");
        }
      }
    },
  },
  {
    name: "FF-16004 160/03 task01: a ceiling equals its measured count, names the story that lowered it, and a count below it fails until it is lowered",
    run: () => {
      for (const row of MODULE_CEILINGS) {
        assert.equal(row.ceiling, row.measured, `aof ${row.argv.join(" ")}: the ceiling is the count measured when it was pinned`);
        assert.match(row.loweredBy, /^\d+\/\d+\b/u, `aof ${row.argv.join(" ")}: the row names the story that set it`);
      }
      const row = { argv: ["--version"], ceiling: 16, measured: 16, loweredBy: "160/03" };
      assert.deepEqual(ceilingProblems(row, 16), [], "a count at its ceiling passes");
      assert.equal(ceilingProblems(row, 17).length, 1, "a count above its ceiling fails");
      assert.match(ceilingProblems(row, 15)[0] ?? "", /lower the ceiling to 15/u, "a count below its ceiling fails until the ceiling is lowered to match");
    },
  },
];

// ── FF-16004's helpers ───────────────────────────────────────────────────────────────────────

// Shrink-only: each ceiling is the count measured when it was pinned, and a story that lowers the
// count lowers the row with it. Counted as distinct `file:` modules a resolve hook sees loaded, so a
// Node upgrade's builtins move nothing.
const MODULE_CEILINGS = Object.freeze([
  Object.freeze({ argv: ["--version"], ceiling: 16, measured: 16, loweredBy: "160/03 — 41 before: the session hooks and an unused workspace binding left cli.mjs's static imports" }),
  Object.freeze({ argv: ["work", "find", "160"], ceiling: 706, measured: 706, loweredBy: "160/03 — pinned at 706, unchanged by the cut: the registry is this verb's route table" }),
]);

export function ceilingProblems(row, count) {
  const verb = `aof ${row.argv.join(" ")}`;
  if (count > row.ceiling) return [`${verb} evaluates ${count} modules, above its ceiling of ${row.ceiling} — defer what this verb's path does not use`];
  if (count < row.ceiling) return [`${verb} evaluates ${count} modules, below its ceiling of ${row.ceiling} — lower the ceiling to ${count} and name the story that lowered it`];
  return [];
}

const RECORDING_HOOK = `import { registerHooks } from "node:module";
import { appendFileSync } from "node:fs";
const sink = process.env.FF16004_MODULE_SINK;
registerHooks({ load(url, context, next) { appendFileSync(sink, url + "\\n"); return next(url, context); } });
`;

const CACHE_PROBE_SUITE = `import module from "node:module";
const dir = module.getCompileCacheDir?.();
export const cacheProbeTests = [{ name: "cache-probe", run() { if (typeof dir !== "string" || dir.length === 0) throw new Error("no compile cache directory when the suite was loaded: " + dir); } }];
`;

// The distinct `file:` modules a child `aof <argv>` loads, run through the bin from the repository root.
async function modulesEvaluated(argv) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-160-03-"));
  try {
    const hook = path.join(dir, "record.mjs");
    const sink = path.join(dir, "modules.txt");
    await writeFile(hook, RECORDING_HOOK, "utf8");
    const result = spawnCliSync(process.execPath, ["--no-warnings", "--import", pathToFileURL(hook).href, binCli, ...argv], {
      cwd: repoRoot,
      env: { ...process.env, NODE_NO_WARNINGS: "1", FF16004_MODULE_SINK: sink },
      encoding: "utf8",
    });
    assert.equal(result.status, 0, `aof ${argv.join(" ")} exited 0\n${result.stderr}`);
    const urls = (await readFile(sink, "utf8")).split(/\r?\n/u).filter((url) => url.startsWith("file:"));
    return [...new Set(urls)];
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
