// Craft-review hardening for milestone 28 / story 00's SEA build recipe
// (scripts/build-sea.mjs) — two build-script UNIT tests, neither requiring a
// real build/exec:
//
//   F14 — assertSafeOutDir refuses a --out that resolves to the repo root, the
//   cwd, or a directory carrying package.json/src (a workspace marker), so
//   `--out .` (or an alias of the repo root) can never rmSync the working tree.
//
//   F8 — planMacCodesignSteps returns the ordered codesign --remove-signature
//   (before postject) / codesign --sign - (after postject) step list ONLY on
//   darwin; it is a pure planner (no execFileSync call), so its OUTPUT is
//   assertable on this (non-darwin) box without invoking the real codesign
//   binary. The mac EXECUTION of these steps is an @manual CI/verify row.
//
//   160/07 (ADR-008) — the test bundle a sharded run builds from the same recipe, the bin that loads it,
//   and FF-16008: the bundle answers a fixed command set exactly as the source does, and a control whose
//   subject is how the bin loads still measures the source.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, rm, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { assertSafeOutDir, buildTestCliBundle, CLI_BUNDLE_RECIPE, cliBundleNotice, planMacCodesignSteps, testCliBundleOptions, withTestCliBundle } from "../../scripts/build-sea.mjs";
import { MODULE_CEILINGS, modulesEvaluated, sourceEnv } from "../arch/command/acd-cli-entry-executes.test.mjs";
import { spawnCliSync } from "../support/cli-spawn.mjs";
import { stripComments } from "../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const buildSeaRecipeGuardsTests = [
  // ===== F14: assertSafeOutDir =====
  {
    name: "build-sea-recipe-guards/F14 refuses an --out that resolves to the repo root",
    async run() {
      assert.throws(
        () => assertSafeOutDir(repoRoot, { repoRoot, cwd: repoRoot }),
        /Refusing to build into the repo root/,
        "the repo root itself is refused"
      );
      // The `--out .` alias the finding calls out explicitly, resolved against
      // a cwd equal to the repo root (the real invocation shape).
      assert.throws(
        () => assertSafeOutDir(".", { repoRoot, cwd: repoRoot }),
        /Refusing to build into the (repo root|current working directory)/,
        "`--out .` from the repo root is refused"
      );
    },
  },
  {
    name: "build-sea-recipe-guards/F14 refuses an --out that resolves to the current working directory",
    async run() {
      const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-sea-guard-cwd-"));
      try {
        assert.throws(
          () => assertSafeOutDir(tmp, { repoRoot, cwd: tmp }),
          /Refusing to build into the current working directory/,
          "an --out equal to cwd (even outside the repo) is refused"
        );
      } finally {
        await rm(tmp, { recursive: true, force: true });
      }
    },
  },
  {
    name: "build-sea-recipe-guards/F14 refuses an --out directory that looks like a SOURCE workspace (.git + package.json, or bin/aof.mjs + package.json)",
    async run() {
      const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-sea-guard-ws-"));
      try {
        const fakeGitRepo = path.join(tmp, "looks-like-a-git-repo");
        await mkdir(path.join(fakeGitRepo, ".git"), { recursive: true });
        await writeFile(path.join(fakeGitRepo, "package.json"), "{}", "utf8");
        assert.throws(
          () => assertSafeOutDir(fakeGitRepo, { repoRoot, cwd: os.tmpdir() }),
          /looks like a SOURCE workspace/,
          "a dir carrying .git + package.json is refused even when it is neither repoRoot nor cwd"
        );

        const fakeAofRepo = path.join(tmp, "looks-like-an-aof-repo");
        await mkdir(path.join(fakeAofRepo, "bin"), { recursive: true });
        await writeFile(path.join(fakeAofRepo, "bin", "aof.mjs"), "// fake entry\n", "utf8");
        await writeFile(path.join(fakeAofRepo, "package.json"), "{}", "utf8");
        assert.throws(
          () => assertSafeOutDir(fakeAofRepo, { repoRoot, cwd: os.tmpdir() }),
          /looks like a SOURCE workspace/,
          "a dir carrying bin/aof.mjs + package.json (this repo's own entry shape) is refused"
        );
      } finally {
        await rm(tmp, { recursive: true, force: true });
      }
    },
  },
  {
    name: "build-sea-recipe-guards/F14 accepts a dedicated, empty --out directory (the normal dist-sea/ case)",
    async run() {
      const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-sea-guard-ok-"));
      try {
        const outDir = path.join(tmp, "dist-sea");
        const resolved = assertSafeOutDir(outDir, { repoRoot, cwd: os.tmpdir() });
        assert.equal(resolved, path.resolve(outDir), "a dedicated non-workspace directory resolves and does not throw");
      } finally {
        await rm(tmp, { recursive: true, force: true });
      }
    },
  },
  {
    name: "build-sea-recipe-guards/F14 accepts a RE-RUN into the build's own prior --out (package.json + bundle/ present, but no .git and no bin/aof.mjs)",
    async run() {
      const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-sea-guard-rerun-"));
      try {
        const outDir = path.join(tmp, "dist-sea");
        // Mirror build-sea.mjs's own output shape from a PRIOR run: a trimmed
        // package.json + a bundle/ sidecar copy — neither a .git dir nor
        // bin/aof.mjs, so this must NOT be mistaken for a source workspace
        // (the guard would otherwise make the tool unable to re-run into its
        // own default dist-sea/ output, which is the normal expected case).
        await mkdir(path.join(outDir, "bundle"), { recursive: true });
        await writeFile(path.join(outDir, "package.json"), JSON.stringify({ version: "0.1.0" }), "utf8");
        const resolved = assertSafeOutDir(outDir, { repoRoot, cwd: os.tmpdir() });
        assert.equal(resolved, path.resolve(outDir), "a prior build's own --out directory (package.json + bundle/, no .git/bin) is accepted for a re-run");
      } finally {
        await rm(tmp, { recursive: true, force: true });
      }
    },
  },

  // ===== F8: planMacCodesignSteps =====
  {
    name: "build-sea-recipe-guards/F8 plans no codesign steps on non-darwin platforms (win32/linux)",
    async run() {
      for (const platform of ["win32", "linux"]) {
        const steps = planMacCodesignSteps("/fake/out/aof", { platform });
        assert.deepEqual(steps, [], `${platform} plans zero codesign steps — codesign is never invoked off-darwin`);
      }
    },
  },
  {
    name: "build-sea-recipe-guards/F8 plans codesign --remove-signature BEFORE postject and an ad-hoc codesign --sign - AFTER, on darwin",
    async run() {
      const exePath = "/fake/out/aof";
      const steps = planMacCodesignSteps(exePath, { platform: "darwin" });
      assert.equal(steps.length, 2, "exactly two codesign steps are planned on darwin");

      const before = steps.find((step) => step.when === "before-postject");
      const after = steps.find((step) => step.when === "after-postject");
      assert.ok(before, "a before-postject step is planned");
      assert.ok(after, "an after-postject step is planned");

      assert.equal(before.cmd, "codesign");
      assert.deepEqual(before.args, ["--remove-signature", exePath], "the before step strips the stale Apple signature");

      assert.equal(after.cmd, "codesign");
      assert.deepEqual(after.args, ["--sign", "-", exePath], "the after step ad-hoc re-signs (superseded by Story 01's --force real-cert sign)");

      // Ordering: remove-signature is planned strictly before the ad-hoc
      // re-sign in the returned array (the caller runs them by `when`, but the
      // array itself should also read in the natural before->after order).
      assert.ok(steps.indexOf(before) < steps.indexOf(after), "remove-signature is listed before the ad-hoc re-sign");
    },
  },
  {
    name: "build-sea-recipe-guards/F8 the darwin codesign steps are skippable via the skip option (a CI leg whose own signing pipeline follows)",
    async run() {
      const steps = planMacCodesignSteps("/fake/out/aof", { platform: "darwin", skip: true });
      assert.deepEqual(steps, [], "skip:true plans zero codesign steps even on darwin");
    },
  },

  // ===== 160/07 (ADR-008): a test's child aof runs from one bundle =====
  {
    name: "160/07 E1 · a child aof in a sharded run gets the bundle's answer",
    async run() {
      const bundle = await runBundle();
      const fromBundle = await childAof(["work", "find", "160", "--json"], { bundle, cwd: repoRoot });
      const fromSource = await childAof(["work", "find", "160", "--json"], { cwd: repoRoot });
      assert.equal(fromBundle.status, 0, fromBundle.stderr);
      assert.ok(fromBundle.loaded.includes(pathToFileURL(bundle).href), "the bin loaded the bundle AOF_TEST_CLI_BUNDLE names");
      assert.ok(!fromBundle.loaded.includes(SOURCE_CLI_URL), "…and not packages/core/src/cli.mjs");
      assert.equal(fromBundle.stdout, fromSource.stdout, "the answer is the one the source gives");
    },
  },
  {
    name: "160/07 E2 · a failed build runs the source and says so",
    async run() {
      const out = await mkdtemp(path.join(os.tmpdir(), "aof-160-07-"));
      try {
        let calls = 0;
        const built = await buildTestCliBundle(out, { build: async () => { calls += 1; throw Object.assign(new Error("Build failed with 1 error"), { errors: [{ text: "Could not resolve ./missing.mjs" }] }); } });
        assert.equal(calls, 1);
        assert.deepEqual(built, { unavailable: "Could not resolve ./missing.mjs" });
        assert.equal(cliBundleNotice(built), "# cli bundle unavailable: Could not resolve ./missing.mjs");
        assert.equal("AOF_TEST_CLI_BUNDLE" in withTestCliBundle({ PATH: "/bin", AOF_TEST_CLI_BUNDLE: "/stale/bundle.mjs" }, built), false, "no unit is given AOF_TEST_CLI_BUNDLE");
        assert.equal(cliBundleNotice({ bundle: path.join(out, "cli.mjs") }), null, "a bundle that built prints nothing");
        const relative = path.relative(process.cwd(), out);
        const named = await buildTestCliBundle(relative, { build: async (options) => writeFile(options.outfile, "", "utf8") });
        assert.equal(named.bundle, path.join(out, "cli.mjs"), "the path a unit is given is absolute, whatever its children's working directory");
        const runner = await readFile(path.join(repoRoot, "scripts", "test-sharded.mjs"), "utf8");
        assert.equal((runner.match(/console\.log\(cliBundleLine\)/g) ?? []).length, 1, "the runner prints the line in one place, once");
      } finally {
        await rm(out, { recursive: true, force: true });
      }
    },
  },
  {
    name: "160/07 E3 · a focused run sets no bundle",
    async run() {
      const dir = await mkdtemp(path.join(os.tmpdir(), "aof-160-07-"));
      try {
        const suite = path.join(dir, "focused-probe.test.mjs");
        const sink = path.join(dir, "modules.txt");
        await writeFile(suite, focusedProbeSuite(sink), "utf8");
        const result = spawnCliSync(process.execPath, [path.join(repoRoot, "scripts", "test-shard.mjs"), suite], { cwd: repoRoot, env: withoutBundle(process.env), encoding: "utf8" });
        assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
        assert.match(result.stdout, /ok - focused-probe/u, "the probe's case ran");
        const loaded = (await readFile(sink, "utf8")).split(/\r?\n/u);
        assert.ok(loaded.includes(SOURCE_CLI_URL), "the bin loaded packages/core/src/cli.mjs");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "160/07 The bundle is built once per run, before the pool",
    async run() {
      const runner = stripComments(await readFile(path.join(repoRoot, "scripts", "test-sharded.mjs"), "utf8"));
      const builds = [...runner.matchAll(/buildTestCliBundle\(/g)];
      assert.equal(builds.length, 1, "the runner builds the bundle in exactly one place");
      assert.match(runner, /^const cliBundle = await buildTestCliBundle\(/mu, "…at module scope, so once per run");
      assert.ok(builds[0].index < runner.indexOf("await runPool("), "…before the pool starts its first unit");
      assert.match(runner, /const env = withTestCliBundle\(\{ \.\.\.process\.env, \.\.\.\(unit\.env \?\? \{\}\) \}, cliBundle\);/u, "every unit, lanes included, is given the one built bundle");
      const units = Array.from({ length: 40 }, (_, index) => withTestCliBundle({ UNIT: String(index) }, { bundle: "/run/.tmp/test-cli-bundle/cli.mjs" }));
      assert.deepEqual([...new Set(units.map((env) => env.AOF_TEST_CLI_BUNDLE))], ["/run/.tmp/test-cli-bundle/cli.mjs"], "every unit receives the same path");
    },
  },
  {
    name: "160/07 [outline] The bin loads the bundle only when the variable names a file (4 rows)",
    async run() {
      const bundle = await runBundle();
      const source = await childAof(["--version"], { cwd: repoRoot });
      assert.equal(source.status, 0, source.stderr);
      for (const [setting, value, entry] of [
        ["names the run's built bundle", bundle, pathToFileURL(bundle).href],
        ["is unset", undefined, SOURCE_CLI_URL],
        ["is the empty string", "", SOURCE_CLI_URL],
        ["names a path that does not exist", path.join(os.tmpdir(), "aof-160-07-missing", "cli.mjs"), SOURCE_CLI_URL],
      ]) {
        const result = await childAof(["--version"], { bundle: value, cwd: repoRoot });
        assert.ok(result.loaded.includes(entry), `AOF_TEST_CLI_BUNDLE ${setting}: the bin loaded ${entry}`);
        assert.equal(result.status, source.status, `AOF_TEST_CLI_BUNDLE ${setting}: the exit code is today's`);
        assert.equal(result.stdout, source.stdout, `AOF_TEST_CLI_BUNDLE ${setting}: the answer is today's`);
      }
    },
  },
  {
    name: "160/07 The test bundle and the release bundle share one recipe",
    async run() {
      const runner = stripComments(await readFile(path.join(repoRoot, "scripts", "test-sharded.mjs"), "utf8"));
      assert.match(runner, /import \{[^}]*\bbuildTestCliBundle\b[^}]*\} from "\.\/build-sea\.mjs";/u, "the runner takes its bundle from scripts/build-sea.mjs");
      for (const option of ["esbuild", "platform:", "format:", "target:", "external:", "entryPoints"]) assert.ok(!runner.includes(option), `the runner spells no ${option} of its own`);
      const recipe = stripComments(await readFile(path.join(repoRoot, "scripts", "build-sea.mjs"), "utf8"));
      assert.equal((recipe.match(/\.\.\.CLI_BUNDLE_RECIPE,/g) ?? []).length, 2, "the release step and the test bundle both spread the one recipe");
      assert.equal((recipe.match(/platform: "node"/g) ?? []).length, 1, "the platform is spelled once, in the recipe");
      const options = testCliBundleOptions(path.join(os.tmpdir(), "cli.mjs"));
      for (const [key, value] of Object.entries(CLI_BUNDLE_RECIPE)) assert.deepEqual(options[key], value, `the test bundle's ${key} is the recipe's`);
    },
  },
  {
    name: "FF-16008 160/07 [outline] E5 · each command in the parity set answers the same from the bundle and the source (5 rows)",
    async run() {
      const bundle = await runBundle();
      for (const argv of PARITY_SET) {
        const [source, built] = await parityPair(argv, bundle);
        assert.deepEqual(parityProblems(argv, source, built), [], `aof ${argv.join(" ")}`);
      }
    },
  },
  {
    name: "FF-16008 160/07 A bundle that answers one command differently is caught",
    async run() {
      const dir = await mkdtemp(path.join(os.tmpdir(), "aof-160-07-"));
      try {
        const planted = path.join(dir, "cli.mjs");
        const text = await readFile(await runBundle(), "utf8");
        const changed = text.replace("`source ${info.buildId}`", "`bundle ${info.buildId}`");
        assert.notEqual(changed, text, "the version string was found in the bundle and changed");
        await writeFile(planted, changed, "utf8");
        const problems = [];
        for (const argv of PARITY_SET) problems.push(...parityProblems(argv, ...(await parityPair(argv, planted))));
        assert.equal(problems.length, 1, problems.join("\n"));
        assert.match(problems[0], /^aof --version: stdout differs\nsource: 0\.1\.0 \(source [^\n]*\n+bundle: 0\.1\.0 \(bundle /u, `the failure names the command and shows both answers: ${JSON.stringify(problems[0])}`);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "FF-16008 160/07 E4 · the module-count control still counts the source",
    async run() {
      const saved = process.env.AOF_TEST_CLI_BUNDLE;
      process.env.AOF_TEST_CLI_BUNDLE = await runBundle();
      try {
        assert.equal("AOF_TEST_CLI_BUNDLE" in sourceEnv(), false, "the child FF-16004 starts carries no AOF_TEST_CLI_BUNDLE");
        const modules = await modulesEvaluated(["--version"]);
        const pinned = MODULE_CEILINGS.find((row) => row.argv[0] === "--version").measured;
        assert.equal(modules.length, pinned, `…and it counts ${pinned} modules, the count FF-16004 pins`);
      } finally {
        if (saved === undefined) delete process.env.AOF_TEST_CLI_BUNDLE; else process.env.AOF_TEST_CLI_BUNDLE = saved;
      }
    },
  },
  {
    name: "FF-16008 160/07 [outline] A control about the bin's own loading strips the variable (3 rows)",
    async run() {
      const dir = await mkdtemp(path.join(os.tmpdir(), "aof-160-07-"));
      try {
        // A bundle no source answer matches: a control that hands it to a child fails.
        const poison = path.join(dir, "poison.mjs");
        await writeFile(poison, 'export async function run() { console.log("POISONED"); process.exitCode = 9; }\n', "utf8");
        for (const control of LOADING_CONTROLS) {
          const result = spawnCliSync(process.execPath, [path.join(repoRoot, "scripts", "test-shard.mjs"), path.join(repoRoot, control)], { cwd: repoRoot, env: { ...withoutBundle(process.env), AOF_TEST_CLI_BUNDLE: poison }, encoding: "utf8" });
          assert.equal(result.status, 0, `${control} handed AOF_TEST_CLI_BUNDLE to a child\n${result.stdout}\n${result.stderr}`);
          assert.match(result.stdout, /^# executed \d+ cases; failures 0$/mu, `${control} ran its cases`);
        }
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },
];

// ── 160/07's helpers ─────────────────────────────────────────────────────────────────────────

const SOURCE_CLI_URL = pathToFileURL(path.join(repoRoot, "packages", "core", "src", "cli.mjs")).href;
const BIN = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");

// FF-16008's parity set (ADR-008 §5): a plain answer, a read of the stream, a command that reads package
// assets, a gate, and a refused command.
const PARITY_SET = Object.freeze([["--version"], ["work", "find", "160", "--json"], ["work", "init", "--runtime", "claude", "--json"], ["work", "validate", "--json"], ["not-a-verb"]]);

const LOADING_CONTROLS = Object.freeze([
  "test/arch/command/acd-cli-entry-executes.test.mjs",
  "test/arch/session/acd-session-verb-boots-no-registry.test.mjs",
  "test/arch/command/acd-single-entry-command-core.test.mjs",
]);

function withoutBundle(env) {
  return Object.fromEntries(Object.entries(env).filter(([name]) => name.toUpperCase() !== "AOF_TEST_CLI_BUNDLE"));
}

// The bundle this run built (a sharded run names it), or one built once here from this tree.
let ownBundle = null;
async function runBundle() {
  const named = process.env.AOF_TEST_CLI_BUNDLE;
  if (named && existsSync(named)) return named;
  ownBundle ??= (async () => {
    const out = await mkdtemp(path.join(os.tmpdir(), "aof-160-07-bundle-"));
    const built = await buildTestCliBundle(out);
    assert.ok(built.bundle, `the test bundle built: ${built.unavailable}`);
    return built.bundle;
  })();
  return ownBundle;
}

const RECORDING_HOOK = `import { registerHooks } from "node:module";
import { appendFileSync } from "node:fs";
const sink = process.env.AOF_160_07_MODULE_SINK;
registerHooks({ load(url, context, next) { appendFileSync(sink, url + "\\n"); return next(url, context); } });
`;

// One child aof through the bin, with AOF_TEST_CLI_BUNDLE set to `bundle` (absent when undefined), and the
// `file:` modules it loaded.
async function childAof(argv, { bundle, cwd, env = {} }) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-160-07-"));
  try {
    const hook = path.join(dir, "record.mjs");
    const sink = path.join(dir, "modules.txt");
    await writeFile(hook, RECORDING_HOOK, "utf8");
    await writeFile(sink, "", "utf8");
    const childEnv = { ...withoutBundle(process.env), NODE_NO_WARNINGS: "1", AOF_160_07_MODULE_SINK: sink, ...env };
    if (bundle !== undefined) childEnv.AOF_TEST_CLI_BUNDLE = bundle;
    const result = spawnCliSync(process.execPath, ["--no-warnings", "--import", pathToFileURL(hook).href, BIN, ...argv], { cwd, env: childEnv, encoding: "utf8" });
    const loaded = (await readFile(sink, "utf8")).split(/\r?\n/u).filter((url) => url.startsWith("file:"));
    return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "", loaded };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// The command once from the source and once from `bundle`, each in the same fresh temp project and global
// home — the same paths both times, so an answer that names its project names the same one.
async function parityPair(argv, bundle) {
  const base = await mkdtemp(path.join(os.tmpdir(), "aof-160-07-parity-"));
  const project = path.join(base, "project");
  const home = path.join(base, "home");
  try {
    const answers = [];
    for (const arm of [undefined, bundle]) {
      await rm(project, { recursive: true, force: true });
      await rm(home, { recursive: true, force: true });
      await mkdir(project, { recursive: true });
      await mkdir(home, { recursive: true });
      const { status, stdout, stderr } = await childAof(argv, { bundle: arm, cwd: project, env: { AOF_GLOBAL_HOME: home } });
      answers.push({ status, stdout, stderr });
    }
    return answers;
  } finally {
    await rm(base, { recursive: true, force: true });
  }
}

function parityProblems(argv, source, bundle) {
  const verb = `aof ${argv.join(" ")}`;
  const problems = [];
  for (const stream of ["stdout", "stderr"]) {
    if (source[stream] !== bundle[stream]) problems.push(`${verb}: ${stream} differs\nsource: ${source[stream]}\nbundle: ${bundle[stream]}`);
  }
  if (source.status !== bundle.status) problems.push(`${verb}: exit code differs — source ${source.status}, bundle ${bundle.status}`);
  return problems;
}

// A suite run through the shard entry: it starts the bin once, recording what that child loaded.
function focusedProbeSuite(sink) {
  return `import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
export const focusedProbeTests = [{ name: "focused-probe", run() {
  if (process.env.AOF_TEST_CLI_BUNDLE !== undefined) throw new Error("the shard entry set AOF_TEST_CLI_BUNDLE: " + process.env.AOF_TEST_CLI_BUNDLE);
  const hook = ${JSON.stringify(sink)} + ".hook.mjs";
  writeFileSync(hook, ${JSON.stringify(RECORDING_HOOK)});
  writeFileSync(${JSON.stringify(sink)}, "");
  const result = spawnSync(process.execPath, ["--no-warnings", "--import", pathToFileURL(hook).href, ${JSON.stringify(BIN)}, "--version"], { env: { ...process.env, AOF_160_07_MODULE_SINK: ${JSON.stringify(sink)} }, encoding: "utf8" });
  if (result.status !== 0) throw new Error("aof --version failed: " + result.stderr);
} }];
`;
}
