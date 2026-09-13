// Fitness function: acd-test-command-reports-not-decides (milestone 72 / story 02, FF-7204;
// ADR-001 §4, ADR-002 §4, ADR-003).
//
//   "A gate DECIDES A TRANSITION; this command decides nothing. It runs a subset and says which
//    subset it ran."
//
// This project holds that no graph output feeds a gate, a merge, a status write or a work
// mutation (09/ADR-004). A command that selects tests FROM the graph is the first thing that looks
// like a breach, so the distinction has to be exact rather than reassuring — and it has to be held
// STRUCTURALLY, because stated as a convention that lasts until someone finds it convenient it is
// worth nothing. Five claims:
//
//   1. NO TEST MODULE ENTERS THE AOF PROCESS. Importing project test code EXECUTES it — 880
//      modules in this repository. A command whose whole subject is test files is one convenience
//      import away from doing exactly that, and the import that does it will look reasonable.
//   2. EVERY RESULT SAYS WHETHER IT MAY STAND AS A VERDICT, and only an unwidened whole-suite run
//      may.
//   3. NO DOOR CONSUMES IT. A future author who wants to read a selection as a verdict has to add
//      the edge in a file this control watches.
//   4. THE FAILURES-ONLY CONTRACT IS OVER ONE OBJECT. The two faces cannot drift, because there is
//      only one thing to render.
//   5. THE COMMAND DECLARES NO SESSION LAUNCH, read from the REGISTERED command object rather than
//      from source text — because what the registry says is what the runtime does.
//
// ── THE FRESH PROCESS IS THE ASSERTION, AND NOTHING ELSE CAN BE ──────────────────────────────
//
// Claim 1 cannot be measured from inside this suite. Every module it names is already resolved
// here — this file imports two of them directly — so a probe registered now sees a warmed cache
// and reports nothing at all, which is indistinguishable from a clean answer. So each module is
// probed in a FRESH `node` process of its own, with a resolve hook recording every specifier that
// process resolves, and the two-sided proof below drives a module that DOES import a test module
// through both probes and requires them to disagree.
//
// `module.register()` is the mechanism, via `node --import`, and the choice is forced: the declared
// engine floor is `node >=20` and `module.registerHooks` is 22.15+, so a control built on the
// newer API would pass VACUOUSLY on the floor — the worst available outcome for a control whose
// whole job is to see something.
//
// ── THE DOOR CENSUS MATCHES SHAPES, NEVER A RAW SUBSTRING ────────────────────────────────────
//
// A raw-token census would have been wrong on the day it landed, and the row below proves it
// rather than asserting it: `test:` appears inside prose in `src/work-audit/census.mjs`
// (`npm run test:smoke:cli`, in the unregistered baseline) and the bare `test` literal appears
// there four times as the suite ROOT path. All five are legitimate. So the census matches
// `invoke("<id>")`, `invokeRegistered("<id>")`, a `route: ["<id>" …]` declaration and a ladder
// `command === "<id>"` — and it is a PURE function over supplied sources, so the planted-invocation
// row drives without editing a real door.
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { stripComments } from "../../support/source-slice.mjs";
// THE TEST ROOTS COME FROM THEIR ONE HOME. A literal `["test", "test/arch", …]` here would be the
// FF-7203 species one directory over — a second answer that agrees until a fourth root arrives.
import { TEST_ROOTS } from "../../../src/work-audit/census.mjs";
import { runBounded } from "../../../src/work-audit/spawn.mjs";
import { getCommand } from "../../../src/command-core.mjs";
import { runTest, testCommand } from "../../../src/commands/test.mjs";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

// The registered id. It is `test` — not `test:` and not `work:test`: both work-command controls
// filter on `id.startsWith("work:")`, and a `work:` id would separately demand a served
// `/api/work/test` route that this command deliberately does not have.
const TEST_COMMAND_ID = "test";

// The modules that must be probed in a fresh process — the command and everything it reaches that
// this milestone owns. Restricted at run time to what exists on disk, with a non-vacuity floor, so
// a walk that resolves nothing cannot pass.
const PROBED_MODULES = Object.freeze([
  "src/commands/test.mjs",
  "src/command-core.mjs",
  "src/work/toolchain.mjs",
  "src/work/test-select.mjs",
  "src/work/test-changed.mjs",
  "src/work-audit/spawn.mjs",
  "src/work-audit/census.mjs",
  "src/graph-normalize.mjs",
  "src/commands/graph/impact.mjs",
]);

const PROBE_FLOOR = 4;

// The doors where a selection must never be readable as a verdict.
const DOOR_ROOTS = Object.freeze([
  "src/commands/item-status.mjs",
  "src/work/doctor.mjs",
  "src/work/loop.mjs",
  "src/work-audit",
  "src/bundle",
]);

// ── PURE CENSORS ─────────────────────────────────────────────────────────────────────────────

// The four ways a command id reaches a runtime: two invocation calls, a route declaration, and a
// ladder branch. Anything else naming the id — a suite root path, a package script inside a
// string, a sentence addressed to a human — is the word being USED rather than the command being
// CALLED, and is admitted.
function invocationShapes(id) {
  return [
    { label: `invoke("${id}")`, pattern: new RegExp(`\\binvoke\\s*\\(\\s*(["'\`])${id}\\1`, "u") },
    { label: `invokeRegistered("${id}")`, pattern: new RegExp(`\\binvokeRegistered\\s*\\(\\s*(["'\`])${id}\\1`, "u") },
    { label: `a route declaration naming "${id}"`, pattern: new RegExp(`route\\s*:\\s*\\[\\s*(["'\`])${id}\\1`, "u") },
    { label: `a ladder branch on "${id}"`, pattern: new RegExp(`command\\s*===\\s*(["'\`])${id}\\1`, "u") },
  ];
}

// PURE — `[{ rel, code }]` in, the doors that invoke the command out.
export function doorInvocationProblems(sources, id = TEST_COMMAND_ID) {
  const problems = [];
  for (const { rel, code } of sources) {
    const stripped = stripComments(code);
    for (const shape of invocationShapes(id)) {
      if (shape.pattern.test(stripped)) {
        problems.push(`${rel} carries ${shape.label} — a transition door that can read a test selection is a gate consuming a report, and 09/ADR-004 is held structurally here rather than by convention.`);
      }
    }
  }
  return problems;
}

// PURE — the census this control does NOT use, kept so the row can PROVE the shape census is
// necessary rather than merely claim it. A raw token census reds on correct shipped code.
export function rawTokenProblems(sources, id = TEST_COMMAND_ID) {
  const pattern = new RegExp(`(["'\`])${id}`, "u");
  return sources.filter(({ code }) => pattern.test(stripComments(code))).map(({ rel }) => rel);
}

// PURE — a dynamic import or a require of a path under a declared test root, as TEXT. The census
// is the cheap half of claim 1; the fresh process below is the half that actually sees.
export function testModuleReachProblems(sources, roots = TEST_ROOTS) {
  const problems = [];
  const pattern = /(?:\bimport\s*\(|\brequire\s*\()\s*(["'`])([^"'`]+)\1/gu;
  for (const { rel, code } of sources) {
    for (const match of stripComments(code).matchAll(pattern)) {
      const named = match[2].replaceAll("\\", "/");
      const reachesATest = named.endsWith(".test.mjs") || roots.some((root) => named.includes(`${root}/`));
      if (reachesATest) {
        problems.push(`${rel} names ${JSON.stringify(match[2])} in a dynamic import — importing project test code EXECUTES it, and this family may not.`);
      }
    }
  }
  return problems;
}

// Is a recorded specifier a project test module? The roots are the declared ones, and the
// comparison is against the path RELATIVE to the repository, so a temp directory that happens to
// contain the word `test` is not mistaken for one.
export function underTestRoot(url, roots = TEST_ROOTS, root = repoRoot) {
  if (!url.startsWith("file:")) return false;
  const rel = path.relative(root, fileURLToPath(url)).replaceAll("\\", "/");
  if (rel.startsWith("..")) return false;
  return roots.some((declared) => rel === declared || rel.startsWith(`${declared}/`));
}

// ── THE FRESH-PROCESS PROBE ──────────────────────────────────────────────────────────────────

const HOOK_SOURCE = `import { appendFileSync } from "node:fs";
let sink = null;
export async function initialize(data) { sink = data.sink; }
export async function resolve(specifier, context, nextResolve) {
  const resolved = await nextResolve(specifier, context);
  try { appendFileSync(sink, \`\${resolved.url}\\n\`); } catch { /* the probe never breaks the probe */ }
  return resolved;
}
`;

const SETUP_SOURCE = `import { register } from "node:module";
register("./probe-hook.mjs", import.meta.url, { data: { sink: process.env.AOF_PROBE_SINK } });
`;

async function probeHarness() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-7204-"));
  await writeFile(path.join(dir, "probe-hook.mjs"), HOOK_SOURCE, "utf8");
  await writeFile(path.join(dir, "probe-setup.mjs"), SETUP_SOURCE, "utf8");
  return dir;
}

// Run one fresh process that imports exactly what it is told to and nothing else, and hand back
// every module specifier it resolved.
async function specifiersResolvedBy(harness, source, label) {
  const sink = path.join(harness, `${label}.txt`);
  await writeFile(sink, "", "utf8");
  const child = await runBounded({
    command: process.execPath,
    // `--import` takes a URL, and on Windows an absolute path is not one: `C:\…` is read as a
    // `c:` protocol and refused by the loader. The URL form is correct on every platform.
    args: ["--import", pathToFileURL(path.join(harness, "probe-setup.mjs")).href, "-e", source],
    cwd: repoRoot,
    deadlineMs: 120_000,
    env: { ...process.env, AOF_PROBE_SINK: sink, AOF_GLOBAL_HOME: path.join(harness, `home-${label}`) },
  });
  const recorded = (await readFile(sink, "utf8")).split(/\r?\n/).filter(Boolean);
  return { child, recorded };
}

async function doorSources() {
  const sources = [];
  for (const entry of DOOR_ROOTS) {
    const absolute = path.join(repoRoot, entry);
    if (!existsSync(absolute)) continue;
    if (entry.endsWith(".mjs")) {
      sources.push({ rel: entry, code: await readFile(absolute, "utf8") });
      continue;
    }
    const stack = [entry];
    while (stack.length > 0) {
      const rel = stack.pop();
      for (const child of await readdir(path.join(repoRoot, rel), { withFileTypes: true })) {
        const childRel = `${rel}/${child.name}`;
        if (child.isDirectory()) stack.push(childRel);
        else if (child.name.endsWith(".mjs")) sources.push({ rel: childRel, code: await readFile(path.join(repoRoot, childRel), "utf8") });
      }
    }
  }
  return sources;
}

// ── THE STUBS THE PURE ROWS DRIVE AGAINST ────────────────────────────────────────────────────

const WHOLE = Object.freeze(["test/a.test.mjs", "test/b.test.mjs", "test/c.test.mjs"]);

const TOOLCHAIN = Object.freeze({
  ok: true,
  toolchain: Object.freeze({
    command: "node",
    program: "/usr/bin/node",
    args: Object.freeze([]),
    selectArgs: Object.freeze(["--only", "{file}"]),
    roots: Object.freeze(["test"]),
    deadlineMs: 900_000,
    report: Object.freeze({ format: "tap" }),
  }),
});

function observed({ stdout = "", stderr = "", exitCode = 0 } = {}) {
  return {
    outcome: "exited",
    command: "/usr/bin/node",
    args: [],
    attempted: "/usr/bin/node",
    deadlineMs: 900_000,
    exitCode,
    stdout,
    stderr,
    verdict: exitCode === 0 ? "passed" : "failed",
    status: exitCode === 0 ? 0 : 1,
    message: "the run's own verdict",
  };
}

const deps = (extra = {}) => ({
  projectRoot: repoRoot,
  config: {},
  resolveToolchain: () => TOOLCHAIN,
  walk: async (_root, root) => (root === "test" ? [...WHOLE] : []),
  readChanged: async () => ({ ok: true, changed: ["src/thing.mjs"], base: null }),
  select: () => Object.freeze({ scope: "impacted", gate: false, selected: ["test/b.test.mjs"], widened: [], builtAt: "2026-09-02T00:00:00.000Z", graphPath: "graphify-out/graph.json", changed: ["src/thing.mjs"], resolved: ["src/thing.mjs"], refusal: null }),
  run: async () => observed(),
  ...extra,
});

const widening = (reason) => () => Object.freeze({
  scope: "all",
  gate: false,
  selected: [...WHOLE],
  widened: [{ file: "src/new.mjs", reason }],
  builtAt: null,
  graphPath: "graphify-out/graph.json",
  changed: ["src/new.mjs"],
  resolved: [],
  refusal: null,
});

export const archTests = [
  {
    name: "arch/72 FF-7204 (acd-test-command-reports-not-decides): no test module enters the aof process, probed in a FRESH process per module",
    async run() {
      const modules = PROBED_MODULES.filter((rel) => existsSync(path.join(repoRoot, rel)));
      assert.ok(modules.length >= PROBE_FLOOR, `the probed set resolved on disk (${modules.length} of ${PROBED_MODULES.length}) — an absence over an empty set is free`);

      const harness = await probeHarness();
      try {
        for (const rel of modules) {
          const url = pathToFileURL(path.join(repoRoot, rel)).href;
          const { child, recorded } = await specifiersResolvedBy(harness, `await import(${JSON.stringify(url)});`, rel.replaceAll("/", "-"));
          assert.equal(child.outcome, "exited", `${rel}: the probe finished — ${child.error ?? ""}`);
          assert.equal(child.exitCode, 0, `${rel}: the probe imported it cleanly\n${child.stderr}`);
          assert.ok(recorded.length > 0, `${rel}: the probe recorded something, so its silence is an answer rather than a broken hook`);

          const leaked = recorded.filter((specifier) => underTestRoot(specifier));
          assert.deepEqual(leaked, [], `${rel} resolved ${leaked.length} specifier(s) under a declared test root — importing project test code EXECUTES it:\n  ${leaked.join("\n  ")}`);
        }
      } finally {
        await rm(harness, { recursive: true, force: true });
      }
    },
  },

  {
    name: "arch/72 FF-7204 (acd-test-command-reports-not-decides): the fresh process is the assertion, because a warmed cache cannot see this",
    async run() {
      const harness = await probeHarness();
      try {
        // A planted module that DOES import a test module, under a test root of its own making.
        await mkdir(path.join(harness, "test"), { recursive: true });
        const planted = path.join(harness, "test", "planted.test.mjs");
        await writeFile(planted, "export const plantedTests = [];\n", "utf8");
        const importer = path.join(harness, "importer.mjs");
        await writeFile(importer, `import { plantedTests } from "./test/planted.test.mjs";\nexport const seen = plantedTests.length;\n`, "utf8");

        const importerUrl = JSON.stringify(pathToFileURL(importer).href);
        const hookUrl = JSON.stringify(pathToFileURL(path.join(harness, "probe-hook.mjs")).href);

        // COLD — the hook is registered by `--import`, before anything at all is imported, so it
        // sees the resolution as it happens.
        const cold = await specifiersResolvedBy(harness, `await import(${importerUrl});`, "cold");
        assert.equal(cold.child.outcome, "exited", `the cold probe finished — ${cold.child.error ?? ""}`);
        const coldSaw = cold.recorded.filter((url) => url.endsWith("planted.test.mjs"));
        assert.equal(coldSaw.length, 1, `the fresh process reports the test module it loaded:\n  ${cold.recorded.join("\n  ")}`);

        // WARM — NO `--import` at all. The module is imported FIRST, the hook registered after,
        // and the module imported again: exactly the position every in-suite probe is in, because
        // the resolution it wants to see already happened and was served from the cache. Same
        // module, same claim, opposite answer — which is why the fresh process is the assertion.
        const warmSink = path.join(harness, "warm.txt");
        await writeFile(warmSink, "", "utf8");
        const warmChild = await runBounded({
          command: process.execPath,
          args: ["-e", `await import(${importerUrl});\nconst { register } = await import("node:module");\nregister(${hookUrl}, { data: { sink: process.env.AOF_PROBE_SINK } });\nawait import(${importerUrl});`],
          cwd: repoRoot,
          deadlineMs: 120_000,
          env: { ...process.env, AOF_PROBE_SINK: warmSink, AOF_GLOBAL_HOME: path.join(harness, "home-warm") },
        });
        assert.equal(warmChild.outcome, "exited", `the warm probe finished — ${warmChild.error ?? ""}`);
        assert.equal(warmChild.exitCode, 0, `the warm probe ran cleanly\n${warmChild.stderr}`);
        const warmRecorded = (await readFile(warmSink, "utf8")).split(/\r?\n/).filter(Boolean);

        assert.ok(warmRecorded.some((url) => url.endsWith("importer.mjs")), `the warm hook IS live — it recorded the re-import:\n  ${warmRecorded.join("\n  ")}`);
        assert.deepEqual(
          warmRecorded.filter((url) => url.endsWith("planted.test.mjs")),
          [],
          `…and it reports NOTHING about the test module, because that resolution was already cached:\n  ${warmRecorded.join("\n  ")}`,
        );

        // The classifier itself is proven both ways, so "nothing under a test root" is never a
        // statement about a resolver that resolves nothing.
        assert.equal(underTestRoot(pathToFileURL(planted).href, ["test"], harness), true, "the classifier sees a module under a declared root");
        assert.equal(underTestRoot(pathToFileURL(importer).href, ["test"], harness), false, "…and does not see one beside it");
        assert.equal(underTestRoot("node:fs"), false, "…and a builtin is not a test module");
      } finally {
        await rm(harness, { recursive: true, force: true });
      }
    },
  },

  {
    name: "arch/72 FF-7204 (acd-test-command-reports-not-decides): no transition door invokes the test command, and a planted invocation is named",
    async run() {
      const sources = await doorSources();
      assert.ok(sources.length >= 8, `the doors were actually walked (non-vacuous): ${sources.length} modules read`);
      for (const entry of DOOR_ROOTS) {
        assert.ok(sources.some(({ rel }) => rel === entry || rel.startsWith(`${entry}/`)), `${entry} is in the set the census read`);
      }

      const problems = doorInvocationProblems(sources);
      assert.deepEqual(problems, [], `no status, accept, merge, loop or audit door reads a test selection as a verdict:\n  ${problems.join("\n  ")}`);

      // A PLANTED invocation in one of those doors is named — driven over supplied sources, so no
      // real door is edited to prove the census can see one.
      for (const shape of [
        `await invoke("${TEST_COMMAND_ID}", { scope: "all" }, ctx);`,
        `const out = await invokeRegistered("${TEST_COMMAND_ID}", input);`,
        `cli: { route: ["${TEST_COMMAND_ID}"] }`,
        `if (command === "${TEST_COMMAND_ID}") return gateOn(result);`,
      ]) {
        const planted = doorInvocationProblems([{ rel: "src/work/loop.mjs", code: shape }]);
        assert.equal(planted.length, 1, `a planted \`${shape}\` is caught`);
        assert.ok(planted[0].startsWith("src/work/loop.mjs"), "…and the module is named");
      }

      // THE SHAPE CENSUS IS NECESSARY, AND THE ROW PROVES IT RATHER THAN CLAIMING IT: a raw-token
      // census reds on shipped, correct code — the suite ROOT path and a package script inside
      // prose both carry the token, and neither is an invocation.
      const raw = rawTokenProblems(sources);
      assert.ok(raw.length > 0, "a raw-token census WOULD red on correct code, which is why this one matches shapes");
      assert.ok(raw.some((rel) => rel.startsWith("src/work-audit/")), `…and it reds in the audit family first: ${raw.join(", ")}`);
    },
  },

  {
    name: "arch/72 FF-7204 (acd-test-command-reports-not-decides): the family holds no dynamic import of a test module, as text",
    async run() {
      const sources = [];
      for (const rel of PROBED_MODULES.filter((entry) => entry.startsWith("src/commands/test") || entry.startsWith("src/work/t"))) {
        sources.push({ rel, code: await readFile(path.join(repoRoot, rel), "utf8") });
      }
      assert.ok(sources.length >= 3, `the family resolved (non-vacuous): ${sources.length} modules`);
      const problems = testModuleReachProblems(sources);
      assert.deepEqual(problems, [], `no module in this family names a test module in a dynamic import:\n  ${problems.join("\n  ")}`);

      // …and the detector is not vacuous: a planted convenience import is caught, in both spellings.
      assert.equal(testModuleReachProblems([{ rel: "src/commands/test.mjs", code: 'const s = await import("../test/arch/thing.test.mjs");' }]).length, 1, "a planted dynamic import is caught");
      assert.equal(testModuleReachProblems([{ rel: "src/commands/test.mjs", code: 'const s = require("./test/helper.mjs");' }]).length, 1, "…and so is the older syntax");
    },
  },

  {
    name: "arch/72 FF-7204 (acd-test-command-reports-not-decides): gate: false on every narrowed or widened result, and true only for an unwidened whole run",
    async run() {
      const narrowed = await runTest({ scope: "impacted" }, deps());
      assert.equal(narrowed.scope, "impacted", "a narrowed run ran as impacted");
      assert.equal(narrowed.gate, false, "…and may not stand as a verdict");

      const named = await runTest({ scope: "file", files: ["test/c.test.mjs"] }, deps({ readChanged: async () => { throw new Error("not for this scope"); } }));
      assert.equal(named.gate, false, "a named run may not stand as a verdict either");

      for (const reason of ["no-graph", "not-in-graph", "no-registered-dependent", "graph-unreadable"]) {
        const wide = await runTest({ scope: "impacted" }, deps({ select: widening(reason) }));
        assert.equal(wide.scope, "all", `a run widened by ${reason} runs as all`);
        assert.equal(wide.gate, false, `…and still may NOT stand as a verdict (${reason})`);
      }

      const whole = await runTest({ scope: "all" }, deps({ readChanged: async () => { throw new Error("not for this scope"); }, select: () => { throw new Error("not for this scope"); } }));
      assert.equal(whole.gate, true, "an unwidened whole run is the one result that may stand");

      // NO OPTION SUPPRESSES A WIDENING — the flag half of the same claim FF-7202 makes over the
      // selection function. Neither the declared flags nor an undeclared key passed straight into
      // the input can turn one off.
      const flags = Object.keys(testCommand.cli.spec.flags);
      const suppressing = flags.filter((flag) => /widen|strict|narrow|suppress|force/iu.test(flag));
      assert.deepEqual(suppressing, [], `no declared flag can suppress a widening: ${flags.join(", ")}`);
      const forced = await runTest({ scope: "impacted", noWiden: true, strictScope: true }, deps({ select: widening("not-in-graph") }));
      assert.equal(forced.scope, "all", "an unknown suppressing key does not narrow the run");
      assert.equal(forced.widened.length, 1, "…the widening stands");
      assert.equal(forced.gate, false, "…and it still may not stand as a verdict");
    },
  },

  {
    name: "arch/72 FF-7204 (acd-test-command-reports-not-decides): the failures-only contract is asserted over ONE object, and verbose removes nothing",
    async run() {
      const output = observed({
        stdout: ["# unit", "ok - alpha"].join("\n"),
        stderr: ["not ok - beta", "AssertionError: beta blew up", "    at beta (test/x.test.mjs:1:1)"].join("\n"),
        exitCode: 1,
      });
      const quiet = await runTest({ scope: "impacted" }, deps({ run: async () => output }));
      const loud = await runTest({ scope: "impacted", verbose: true }, deps({ run: async () => output }));

      // ONE OBJECT: the machine face IS the result, not a second assembly of it.
      assert.equal(testCommand.cli.json(quiet), quiet, "the machine face renders from the result itself");

      const quietText = testCommand.cli.render(quiet);
      const loudText = testCommand.cli.render(loud);
      assert.ok(!quietText.includes("ok - alpha"), "the quiet face prints no passing row");
      assert.ok(loudText.includes("ok - alpha"), "…and the verbose face adds it");
      for (const line of quietText.split("\n")) {
        assert.ok(loudText.split("\n").includes(line), `verbose removes nothing — "${line}"`);
      }

      // THE FAILURE'S ASSERTION TEXT IS PRESENT IN BOTH FACES, and it came off STDERR — which is
      // the correctness trap this contract exists to close, not an optimisation: a filter reading
      // stdout alone would have printed "no failures" over this very fixture.
      assert.equal(quiet.report.failures.length, 1, "the failure was read at all");
      assert.ok(quiet.report.failures[0].message.includes("beta blew up"), "…with its assertion output attached");
      assert.ok(quietText.includes("beta blew up"), "…present in the human face");
      assert.ok(JSON.stringify(testCommand.cli.json(quiet)).includes("beta blew up"), "…and in the machine face");
      assert.equal(quiet.exit, 1, "…and the run exits non-zero");

      // A GREEN-READING REPORT BESIDE A NON-ZERO EXIT IS A CONTRADICTION, never a pass — and it
      // SAYS SO. A non-zero exit under a face that printed nothing is the same silent failure this
      // command exists to replace, so the LINE is asserted and not merely the status.
      const silentRed = await runTest({ scope: "impacted" }, deps({ run: async () => observed({ stdout: "# unit\nok - alpha", stderr: "", exitCode: 1 }) }));
      assert.equal(silentRed.report.contradiction, true, "a green report beside a non-zero exit is reported as a contradiction");
      assert.equal(silentRed.exit, 1, "…and is never a pass");
      assert.ok(testCommand.cli.render(silentRed).includes("is a contradiction, not a pass"), "…and the human face says which of the three it was");

      // AND AN UNREADABLE REPORT IS THE THIRD WAY, stated rather than left to the exit code: a run
      // whose output no normaliser could read enumerated no case at all, so it produced no verdict.
      const unreadable = await runTest({ scope: "impacted" }, deps({ run: async () => observed({ stdout: "a wall of prose no normaliser can read", stderr: "", exitCode: 0 }) }));
      assert.equal(unreadable.report.ok, false, "an unreadable report is reported as unreadable");
      assert.equal(unreadable.exit, 1, "…and a run that produced no verdict is never a pass");
      assert.ok(testCommand.cli.render(unreadable).includes("could not be read as tap"), "…with the human face naming the declared format it failed to read");
    },
  },

  {
    name: "arch/72 FF-7204 (acd-test-command-reports-not-decides): the command declares no session launch, read from the registry rather than from source text",
    async run() {
      const registered = getCommand(TEST_COMMAND_ID);
      assert.ok(registered != null, `${TEST_COMMAND_ID} is registered in the one core`);
      assert.equal(registered, testCommand, "…and it is this story's command object");
      assert.equal(typeof registered.cli.launch, "undefined", "the test command declares NO session launch — it runs a bounded child and returns");

      // Driven against one that DOES, so the row measures a distinction rather than an absence.
      const launcher = getCommand("mesh:ui");
      assert.ok(launcher != null, "mesh:ui is registered, so the contrast is not vacuous");
      assert.equal(typeof launcher.cli.launch, "function", "…and it declares a session launch");

      // The id is `test`, and it is deliberately not in the `work:` namespace.
      assert.equal(registered.id, TEST_COMMAND_ID, "the registered id is the one the census matches on");
      assert.ok(!registered.id.startsWith("work:"), "…and it is not a work: command, which would demand a served /api/work route");
      assert.deepEqual(registered.cli.route, [TEST_COMMAND_ID], "…reached by a one-word route, which resolveRoute already walks down to");
    },
  },
];
