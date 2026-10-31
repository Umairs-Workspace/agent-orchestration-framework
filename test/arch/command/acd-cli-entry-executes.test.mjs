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

// This control's subject is how the bin loads the SOURCE (160/ADR-008 §4), so every child it starts runs
// without the sharded run's AOF_TEST_CLI_BUNDLE.
export function sourceEnv(extra = {}) {
  const env = { ...process.env, NODE_NO_WARNINGS: "1", ...extra };
  for (const name of Object.keys(env)) if (name.toUpperCase() === "AOF_TEST_CLI_BUNDLE") delete env[name];
  return env;
}

function runNode(args) {
  const result = spawnCliSync(process.execPath, ["--no-warnings", ...args], {
    cwd: repoRoot,
    env: sourceEnv(),
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
        const env = sourceEnv();
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
export const MODULE_CEILINGS = Object.freeze([
  Object.freeze({ argv: ["--version"], ceiling: 17, measured: 17, loweredBy: "160/03 — 41 before: the session hooks and an unused workspace binding left cli.mjs's static imports; 167/00 raised it to 17: the degrade reporter counts every report on the process's cost meter before its throttle (167/ADR-001), so the zero-import meter leaf (foundation/cost-meter.mjs) loads with it" }),
  Object.freeze({ argv: ["work", "find", "160"], ceiling: 747, measured: 747, loweredBy: "160/03 — pinned at 706, unchanged by the cut: the registry is this verb's route table; 162 raised it to 707: its drive status ticker arms synchronously when a lane drive starts (162/ADR-004), so child-drive imports drive-status.mjs; 163 raised it to 708: the registry composes work:questions (commands/questions.mjs) beside work:answer in the one resume binding; 164/00 raised it to 709: every command runs the sync pass for its own workspace (164/ADR-004), and the store asks the one change predicate, the @aof/work/local-change leaf (164/ADR-002); 164/03 raised it to 710: doctor's lane roster gains the sync lane (doctor/sync.mjs), which the registry imports with the rest of doctor; 166 raised it to 715: the registry composes graph:export and graph:import (two command modules and their two core bindings) and the bundle leaf they share (graph-bundle.mjs), which graph:build also reads for its inputs stamp; 167/00 raised it to 717: the degrade reporter and the cache-first read count on the cost meter leaf (foundation/cost-meter.mjs), and doctor's lane roster gains the daemon-cost lane (doctor/daemon-cost.mjs); 167/06 raised it to 718: the projection store's board-face content reads moved to their own module under its line ratchet (mesh/content-reads.mjs), which the store imports; 168/01 raised it to 720: the registry composes work:prototype (its command module and its core binding); 162 verify (F-02) raised it to 721: the loop drive's terminal producer moved out of commands/drive.mjs into its own module (loop-session-stream.mjs) — the same code, one module more; the Hyperagent integration raised it to 723: the registry loads @aof/integration-hyperagent's command descriptors and the model its runtime declaration — every verb implementation is imported only when that verb runs; 169/01 raised it to 724 (169/ADR-002's ‘at most the one module’): the runtime declaration left the model, and the integration registry (integrations.mjs) and the package's one contribution (contribution.mjs) joined — still descriptors only; PR #13 raised it to 725: the registry composes diagram:scene (commands/diagram/scene.mjs) beside diagram:file in the one diagram-file binding; @aof/diagrams raised it to 726: the diagram verbs ride their own contribution module (@aof/diagrams/contribution) instead of @aof/work's, the one seam that lets core leave diagramming out; the diagrams opt-out read raised it to 727: diagram:capability (commands/capability.mjs), the one module the board asks before showing Edit draft; milestone 170 raised it to 728: diagram:scene reads the one diagram format through mermaid-profile.mjs; its scene-store rework (170/ADR-010) raised it to 729: diagram:scene projects the stored Excalidraw scene into that format through scene-view.mjs (PR #13's five stacked on main's 724 at the merge); 171's verify (F-171-01) raised it to 730: the session driver and its screen read the TUI's readiness gate and paste framing from their one home, the zero-import contracts leaf @aof/contracts/tui-ready, which the browser's dock reads too; 174 raised it to 737: the registry composes graph:fetch, graph:publish and graph:prune (three command modules and their three core bindings) and the ref transport they share (graph-share.mjs), which graph:build also imports for its fetch on a miss; 172 raised it to 739 (its verify, F-172-04; m174/F-01 named the +2): diagram:scene's `session` action reads the review invocation and tool list from their one home (@aof/diagrams/review-session, 172/ADR-002), and the board-ui binding assembles the architect's conversations port (@aof/execution/conversation-session, 172/ADR-001) at the same synchronous assembly as the rest of the board; 175/02 raised it to 740: the desktop app's per-platform names moved into their one home, the zero-I/O leaf commands/desktop-layout.mjs (175/ADR-002 §5, FF-17502), which desktop.mjs imports at the registry's synchronous assembly — the LaunchAgent render beside it is imported only on the darwin autostart path; 179/01 raised it to 742: the application assembles the knowledge-engine port (179/ADR-001), its core binding (knowledge-engine.mjs) and the pure router it composes (@aof/knowledge/engine); 179/02 raised it to 744: the binding composes the graphify code backend (graphify-code-backend.mjs) the graph faces ask through the port, and graph:impact gained its own composition binding (commands/graph/impact.mjs); 179/04 raised it to 745: the code readers' driver-free relations port has its own composition binding (code-relations.mjs), so the audit family reaches no graphify process; 180/01 raised it to 746: the memory node has one reader (memory-config.mjs, 180/ADR-001), which the three config resolvers and config inspection read through; PR #22 raised it to 747: the graphify code backend's read half moved into its own module (graphify-code-relations.mjs), so the code readers' port reaches no file writer (77/FF-7703) — the same code, one module more" }),
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
export async function modulesEvaluated(argv) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-160-03-"));
  try {
    const hook = path.join(dir, "record.mjs");
    const sink = path.join(dir, "modules.txt");
    await writeFile(hook, RECORDING_HOOK, "utf8");
    const result = spawnCliSync(process.execPath, ["--no-warnings", "--import", pathToFileURL(hook).href, binCli, ...argv], {
      cwd: repoRoot,
      env: sourceEnv({ FF16004_MODULE_SINK: sink }),
      encoding: "utf8",
    });
    assert.equal(result.status, 0, `aof ${argv.join(" ")} exited 0\n${result.stderr}`);
    const urls = (await readFile(sink, "utf8")).split(/\r?\n/u).filter((url) => url.startsWith("file:"));
    return [...new Set(urls)];
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
