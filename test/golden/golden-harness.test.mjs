// 203/00 — the golden harness, proven on a fixture verb (203/ADR-001 to ADR-004). No aof verb is
// a subject here: the fixture lane is declared in-test over `fixtures/fixture-verb.mjs`, which
// writes what a spec file tells it to. Its baselines live under a temp root, and every write to
// them goes through `scripts/golden.mjs` as a child process — this suite never imports the
// writer (FF-20302).
//
// Tasks: 00 (R1, run and capture), 01 (R2, the closed normaliser), 02 (R3, materialise and
// report), 03 (R4, only the script writes).
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnCliSync } from "../support/cli-spawn.mjs";
import { captureScenario, compareScenario, runScenario } from "../support/golden/harness.mjs";
import { RULES, normaliseContext, normaliseText } from "../support/golden/normalise.mjs";
import { materialise, updateCommand } from "../support/golden/baseline-store.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FIXTURE_VERB = path.join(repoRoot, "test/golden/fixtures/fixture-verb.mjs");
const GOLDEN = path.join(repoRoot, "scripts/golden.mjs");

// ── fixtures ────────────────────────────────────────────────────────────────────────────────

function withDir(run) {
  return async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "aof-golden-test-"));
    try {
      await run(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
}

// A fixture lane under `dir`: each step's spec is a JSON file, so `setSpec` changes what the verb
// writes without changing the step's argv. `scenarios` is { id: { base, files, steps: [spec |
// { spec, exit }] } }. The lane is also written as a module, for `--lane-module`.
function fixtureLane(dir, scenarios, id = "fixture") {
  const specs = path.join(dir, "specs");
  mkdirSync(specs, { recursive: true });
  const specPath = (scenarioId, index) => path.join(specs, `${id}-${scenarioId}-${index}.json`);
  const setSpec = (scenarioId, index, spec) => writeFileSync(specPath(scenarioId, index), JSON.stringify(spec));
  const lane = {
    id,
    command: [FIXTURE_VERB],
    scenarios: Object.entries(scenarios).map(([scenarioId, declared]) => ({
      id: scenarioId,
      ...(declared.base ? { base: declared.base } : {}),
      ...(declared.files ? { files: declared.files } : {}),
      steps: declared.steps.map((step, index) => {
        const { spec, exit } = step.spec ? step : { spec: step, exit: undefined };
        setSpec(scenarioId, index, spec);
        return { argv: [specPath(scenarioId, index)], ...(exit === undefined ? {} : { exit }) };
      }),
    })),
  };
  const modulePath = path.join(dir, `${id}.lane.mjs`);
  writeFileSync(modulePath, `export default ${JSON.stringify(lane, null, 2)};\n`);
  return { lane, modulePath, setSpec };
}

const scenarioOf = (lane, id) => lane.scenarios.find((scenario) => scenario.id === id);

function golden(args, { root, modules }) {
  const result = spawnCliSync(process.execPath, [GOLDEN, "--root", root, ...modules.flatMap((file) => ["--lane-module", file]), ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function goldenOk(args, options) {
  const result = golden(args, options);
  assert.equal(result.status, 0, `golden ${args.join(" ")} exits 0 — stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  return result;
}

// Every file under `root` with its bytes and modification time — what "nothing was written" means.
function snapshot(root) {
  const files = new Map();
  const walk = (dir, segments) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, [...segments, entry.name]);
      else files.set([...segments, entry.name].join("/"), { bytes: readFileSync(full).toString("base64"), mtimeMs: statSync(full).mtimeMs });
    }
  };
  walk(root, []);
  return files;
}

const keysUnder = (tree, prefix) => [...tree.keys()].filter((key) => key.startsWith(`${prefix}/`)).map((key) => key.slice(prefix.length + 1)).sort();

const twentyLines = (tenth) => `${Array.from({ length: 20 }, (_, index) => (index === 9 ? tenth : `line ${index + 1}`)).join("\n")}\n`;

// A baseline for the materialise cases, written by hand: the store is read-only, and these cases
// prove what it reads, not what the writer writes.
function plantBaseline(root, laneId, scenarioId, { files = {}, removed = [], steps = "[]\n" } = {}) {
  const dir = path.join(root, laneId, scenarioId);
  for (const [key, text] of Object.entries(files)) {
    const target = path.join(dir, ...`${key}.golden`.split("/"));
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, text);
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "removed.golden"), removed.length ? `${removed.join("\n")}\n` : "");
  writeFileSync(path.join(dir, "steps.golden"), steps);
}

const declaredLane = (id, scenarios) => ({ id, scenarios: Object.entries(scenarios).map(([scenarioId, base]) => ({ id: scenarioId, ...(base ? { base } : {}), steps: [] })) });

// ── task 00 · R1 · a scenario runs isolated, and both trees are captured ────────────────────

const task00 = [
  {
    name: "203/00 task00 E1 — the project tree and the home tree are captured apart",
    run: withDir((dir) => {
      const { lane } = fixtureLane(dir, { s: { steps: [{ project: { "a.md": "A\n" }, home: { "x.json": "{}\n" } }] } });
      const { tree } = runScenario(lane, scenarioOf(lane, "s"));
      assert.deepEqual(keysUnder(tree, "project"), ["a.md"]);
      assert.deepEqual(keysUnder(tree, "home"), ["x.json"]);
    }),
  },
  {
    name: "203/00 task00 — the step runs in the temp project, with the temp home as its global home, both under one temp root that is a direct child of the OS temp directory",
    run: withDir((dir) => {
      const { lane } = fixtureLane(dir, { s: { steps: [{ report: ["cwd", "home"] }] } });
      const { steps, root } = runScenario(lane, scenarioOf(lane, "s"));
      const tmp = path.resolve(os.tmpdir());
      assert.equal(path.dirname(root), tmp, "the temp root is a direct child of the OS temp directory");
      // A child reports its working directory in realpath form (macOS's /var → /private/var).
      const forms = (rel) => [path.join(root, rel), path.join(realpathSync(tmp), path.basename(root), rel)];
      assert.ok(forms("project").includes(steps[0].envelope.cwd), `cwd ${steps[0].envelope.cwd} is the scenario's temp project`);
      assert.ok(forms("home").includes(steps[0].envelope.home), `AOF_GLOBAL_HOME ${steps[0].envelope.home} is the scenario's temp home`);
    }),
  },
  {
    name: "203/00 task00 E2 — dotfiles and nested folders are captured, with \"/\" in every path",
    run: withDir((dir) => {
      const { lane } = fixtureLane(dir, { s: { steps: [{ project: { ".claude/settings.json": "{}\n", ".gitignore": "x\n", "wiki/work/.gitattributes": "* text\n" } }] } });
      const { tree } = runScenario(lane, scenarioOf(lane, "s"));
      assert.deepEqual(keysUnder(tree, "project"), [".claude/settings.json", ".gitignore", "wiki/work/.gitattributes"]);
    }),
  },
  {
    name: "203/00 task00 — starting files are in place before the first step and are part of the tree",
    run: withDir((dir) => {
      const { lane } = fixtureLane(dir, { s: { files: { "AGENTS.md": "# Mine" }, steps: [{ report: ["files"] }] } });
      const { tree, steps } = runScenario(lane, scenarioOf(lane, "s"));
      assert.ok(steps[0].envelope.files.includes("AGENTS.md"), "the step saw AGENTS.md");
      assert.equal(tree.get("project/AGENTS.md").toString("utf8"), "# Mine");
    }),
  },
  {
    name: "203/00 task00 — every step leaves a record of its argv, exit code and envelope, in order",
    run: withDir((dir) => {
      const { lane } = fixtureLane(dir, { s: { steps: [{ envelope: { step: "one" } }, { envelope: { step: "two" } }] } });
      const { steps } = runScenario(lane, scenarioOf(lane, "s"));
      assert.equal(steps.length, 2);
      assert.deepEqual(steps.map((record) => record.envelope.step), ["one", "two"]);
      scenarioOf(lane, "s").steps.forEach((step, index) => {
        assert.deepEqual(steps[index].argv, step.argv);
        assert.equal(steps[index].exit, 0);
      });
    }),
  },
  {
    name: "203/00 task00 E4 — an empty home is captured as empty",
    run: withDir((dir) => {
      const { lane } = fixtureLane(dir, { s: { steps: [{ project: { "a.md": "A\n" } }] } });
      const { tree } = runScenario(lane, scenarioOf(lane, "s"));
      assert.deepEqual(keysUnder(tree, "home"), []);
    }),
  },
  {
    name: "203/00 task00 E3 — a step that exits other than declared fails the scenario naming the step and its argv, shows its stderr, and no later step runs",
    run: withDir((dir) => {
      const { lane } = fixtureLane(dir, { s: { steps: [{ exit: 3, stderr: "oops" }, { project: { "late.md": "x" } }] } });
      const scenario = scenarioOf(lane, "s");
      let failure;
      try {
        runScenario(lane, scenario);
      } catch (error) {
        failure = error;
      }
      assert.ok(failure, "the scenario fails");
      assert.match(failure.message, /step 1 /u);
      assert.ok(failure.message.includes(scenario.steps[0].argv.join(" ")), "the failure names the step's argv");
      assert.match(failure.message, /oops/u);
      assert.equal(failure.steps.length, 1, "no later step ran");
    }),
  },
  {
    name: "203/00 task00 — a step may declare a non-zero exit, and then it passes",
    run: withDir((dir) => {
      const { lane } = fixtureLane(dir, { s: { steps: [{ spec: { exit: 1 }, exit: 1 }] } });
      const { steps } = runScenario(lane, scenarioOf(lane, "s"));
      assert.equal(steps[0].exit, 1);
    }),
  },
  ...[
    ["exits 0", { home: { "x.json": "{}\n" } }],
    ["exits 3 where 0 is declared", { home: { "x.json": "{}\n" }, exit: 3 }],
    ["writes a file that is not valid UTF-8", { home: { "x.json": "{}\n" }, project: { "bin/blob": { base64: Buffer.from([0xff, 0xfe, 0x00, 0xc3]).toString("base64") } } }],
  ].map(([ends, spec]) => ({
    name: `203/00 task00 E5 — the temp root is removed when the step ${ends}, and the real global home is untouched`,
    run: withDir((dir) => {
      const { lane } = fixtureLane(dir, { s: { steps: [spec] } });
      const parent = path.join(dir, "tmp");
      mkdirSync(parent);
      const realHome = process.env.AOF_GLOBAL_HOME ?? path.join(os.homedir(), ".aof");
      const before = snapshot(realHome);
      try {
        captureScenario(lane, scenarioOf(lane, "s"), { tempParent: parent });
      } catch {
        // Pass or fail, the root must be gone: the UTF-8 case fails in the normaliser, after the run.
      }
      assert.deepEqual(readdirSync(parent), [], "the scenario's temp root no longer exists");
      assert.deepEqual(snapshot(realHome), before, "no file under the real global home was created or changed");
    }),
  })),
];

// ── task 01 · R2 · output is normalised by a closed rule list ──────────────────────────────

function withContext(run, overrides = {}) {
  return withDir((dir) => {
    const root = path.join(dir, "root");
    mkdirSync(path.join(root, "project"), { recursive: true });
    mkdirSync(path.join(root, "home"));
    const ctx = normaliseContext({ project: path.join(root, "project"), home: path.join(root, "home") }, overrides);
    return run(ctx);
  });
}

const sha = "a".repeat(32) + "0123456789abcdef".repeat(2);

const task01 = [
  {
    name: "203/00 task01 — the rules are six, in a fixed order",
    run: async () => {
      assert.deepEqual(RULES.map((rule) => rule.id), ["eol", "temp-paths", "instants", "hashes", "version", "build-id"]);
      assert.ok(Object.isFrozen(RULES));
    },
  },
  ...[
    ["E6", () => `"generatedAt": "2026-11-20T18:24:42.679Z"`, () => `"generatedAt": "<timestamp>"`],
    ["", () => "2026-11-20T18:24:42Z", () => "<timestamp>"],
    ["", (ctx) => `${ctx.project}/.claude/settings.json`, () => "<project>/.claude/settings.json"],
    ["", (ctx) => `${ctx.home}/mesh/nodes`, () => "<home>/mesh/nodes"],
    ["E7", (ctx) => JSON.stringify(`${ctx.project.split(/[\\/]/u).join("\\")}\\.claude`).slice(1, -1), () => "<project>/.claude"],
    ["E8", (ctx) => `${ctx.projectReal}/a.md`, () => "<project>/a.md"],
    ["E9", () => `sha256:${sha}`, () => "sha256:<hash>"],
    ["", (ctx) => `"version": "${ctx.version}"`, () => `"version": "<version>"`],
    ["", (ctx) => `built ${ctx.buildId}.`, () => "built <build-id>."],
  ].map(([example, input, output], index) => ({
    name: `203/00 task01 ${example || `row ${index + 1}`} — each rule rewrites what it names: ${input({ project: "<project path>", home: "<home path>", projectReal: "<realpath>", version: "<v>", buildId: "<id>" })}`,
    run: withContext(
      (ctx) => {
        assert.equal(normaliseText(input(ctx), ctx), output(ctx));
      },
      { buildId: "f00dfeed+dirty" },
    ),
  })),
  ...[
    ["E10", () => "matches \\d+\\\\.md", {}],
    ["E10", () => "10.1.0", { version: "0.1.0" }],
    ["", () => "sha256:abc", {}],
    ["", () => "2026-11-20", {}],
    ["", () => "C:\\Users\\someone\\code\\a.md", {}],
  ].map(([example, input, overrides], index) => ({
    name: `203/00 task01 ${example || `row ${index + 1}`} — what no rule names is left exactly as it was: ${input()}`,
    run: withContext((ctx) => {
      assert.equal(normaliseText(input(), ctx), input());
    }, overrides),
  })),
  {
    name: "203/00 task01 E11 — line endings are normalised in every captured file, so CRLF compares equal to its LF baseline",
    run: withDir((dir) => {
      const root = path.join(dir, "baselines");
      const { lane, modulePath, setSpec } = fixtureLane(dir, { s: { steps: [{ project: { "a.md": "a\nb\n" } }] } });
      goldenOk(["--lane", "fixture", "--scenario", "s", "--update"], { root, modules: [modulePath] });
      setSpec("s", 0, { project: { "a.md": "a\r\nb\r\n" } });
      const { passed, report } = compareScenario({ lanes: [lane], laneId: "fixture", scenarioId: "s", root });
      assert.ok(passed, `CRLF is not reported as changed:\n${report}`);
    }),
  },
  {
    name: "203/00 task01 — step envelopes are normalised by the same rules",
    run: withDir((dir) => {
      const { lane } = fixtureLane(dir, { s: { steps: [{ report: ["cwd"], envelope: { at: "2026-11-20T18:24:42.679Z" } }] } });
      const { steps } = captureScenario(lane, scenarioOf(lane, "s"));
      const [record] = JSON.parse(steps);
      assert.equal(record.envelope.cwd, "<project>");
      assert.equal(record.envelope.at, "<timestamp>");
    }),
  },
  {
    name: "203/00 task01 E12 — a file that is not valid UTF-8 fails by name, and nothing is compared",
    run: withDir((dir) => {
      const root = path.join(dir, "baselines");
      const { lane, modulePath, setSpec } = fixtureLane(dir, { s: { steps: [{ project: { "a.md": "a\n" } }] } });
      goldenOk(["--lane", "fixture", "--scenario", "s", "--update"], { root, modules: [modulePath] });
      setSpec("s", 0, { project: { "a.md": "changed\n", "bin/blob": { base64: Buffer.from([0xff, 0xfe, 0xc3]).toString("base64") } } });
      assert.throws(
        () => compareScenario({ lanes: [lane], laneId: "fixture", scenarioId: "s", root }),
        (error) => error.message.includes('"project/bin/blob"') && !/changed|added/u.test(error.message),
      );
    }),
  },
];

// ── task 02 · R3 · drift fails with a summary and a diff per file ──────────────────────────

const task02 = [
  {
    name: "203/00 task02 E13 — the expected tree is materialised from a base and a delta",
    run: withDir((dir) => {
      const lanes = [declaredLane("fixture", { base: null, s: "base" })];
      plantBaseline(dir, "fixture", "base", { files: { "project/a.md": "A\n", "project/b.md": "B\n" } });
      plantBaseline(dir, "fixture", "s", { files: { "project/b.md": "other\n" }, removed: ["project/a.md"] });
      const { tree } = materialise({ lanes, root: dir, laneId: "fixture", scenarioId: "s" });
      assert.deepEqual([...tree], [["project/b.md", "other\n"]]);
    }),
  },
  {
    name: "203/00 task02 — a chain of bases materialises in order",
    run: withDir((dir) => {
      const lanes = [declaredLane("fixture", { a: null, b: "a", c: "b" })];
      plantBaseline(dir, "fixture", "a", { files: { "project/a.md": "A\n" } });
      plantBaseline(dir, "fixture", "b", { files: { "project/b.md": "B\n" } });
      plantBaseline(dir, "fixture", "c", { files: { "project/c.md": "C\n" } });
      const { tree } = materialise({ lanes, root: dir, laneId: "fixture", scenarioId: "c" });
      assert.deepEqual([...tree.keys()], ["project/a.md", "project/b.md", "project/c.md"]);
    }),
  },
  {
    name: "203/00 task02 E14 — a base that does not exist fails by name",
    run: withDir((dir) => {
      const lanes = [declaredLane("fixture", { s: "nowhere" })];
      plantBaseline(dir, "fixture", "s");
      assert.throws(() => materialise({ lanes, root: dir, laneId: "fixture", scenarioId: "s" }), (error) => /"s"/u.test(error.message) && /"nowhere"/u.test(error.message));
    }),
  },
  {
    name: "203/00 task02 E15 — a cycle of bases fails, naming the chain",
    run: withDir((dir) => {
      const lanes = [declaredLane("fixture", { x: "y", y: "x" })];
      assert.throws(() => materialise({ lanes, root: dir, laneId: "fixture", scenarioId: "x" }), (error) => error.message.includes("x → y → x"));
    }),
  },
  {
    name: "203/00 task02 — a base in another lane is named as \"<lane>/<scenario>\"",
    run: withDir((dir) => {
      const lanes = [declaredLane("other", { root: null }), declaredLane("fixture", { s: "other/root" })];
      plantBaseline(dir, "other", "root", { files: { "project/r.md": "R\n" } });
      plantBaseline(dir, "fixture", "s");
      const { tree } = materialise({ lanes, root: dir, laneId: "fixture", scenarioId: "s" });
      assert.deepEqual([...tree.keys()], ["project/r.md"]);
    }),
  },
  {
    name: "203/00 task02 — an unchanged tree passes, and prints nothing",
    run: withDir((dir) => {
      const root = path.join(dir, "baselines");
      const { lane, modulePath } = fixtureLane(dir, { s: { steps: [{ project: { "a.md": "A\n" } }] } });
      goldenOk(["--lane", "fixture", "--update"], { root, modules: [modulePath] });
      assert.deepEqual(compareScenario({ lanes: [lane], laneId: "fixture", scenarioId: "s", root }), { passed: true, report: "" });
    }),
  },
  {
    name: "203/00 task02 E16 — a changed line fails with a summary, a hunk with 3 lines of context and the command that accepts it",
    run: withDir((dir) => {
      const root = path.join(dir, "baselines");
      const { lane, modulePath, setSpec } = fixtureLane(dir, { s: { steps: [{ project: { "a.md": "A\n", "b.md": twentyLines("old ten") } }] } });
      goldenOk(["--lane", "fixture", "--update"], { root, modules: [modulePath] });
      setSpec("s", 0, { project: { "a.md": "A\n", "b.md": twentyLines("new ten") } });
      const { passed, report } = compareScenario({ lanes: [lane], laneId: "fixture", scenarioId: "s", root });
      assert.equal(passed, false);
      assert.ok(report.startsWith("1 changed\n  project/b.md\n"), report);
      assert.ok(
        report.includes(["@@ -7,7 +7,7 @@", " line 7", " line 8", " line 9", "-old ten", "+new ten", " line 11", " line 12", " line 13"].join("\n")),
        `one hunk, the old and new line, 3 lines of context each side:\n${report}`,
      );
      assert.equal(report.split("\n").at(-1), "node scripts/golden.mjs --lane fixture --scenario s --update");
    }),
  },
  ...[
    ["has \"c.md\" that its baseline lacks", { "a.md": "A\n", "c.md": "C\n" }, {}, "1 added", ["--- /dev/null", "+++ actual/project/c.md", "@@ -0,0 +1 @@", "+C"]],
    ["lacks \"a.md\" that its baseline holds", {}, {}, "1 removed", ["--- baseline/project/a.md", "+++ /dev/null", "@@ -1 +0,0 @@", "-A"]],
    ["writes \"x.json\" into the home", { "a.md": "A\n" }, { "x.json": "{}\n" }, "1 added", ["--- /dev/null", "+++ actual/home/x.json", "@@ -0,0 +1 @@", "+{}"]],
  ].map(([differs, project, home, summary, diff]) => ({
    name: `203/00 task02 — each kind of difference is counted under its own heading: output ${differs} → ${summary}`,
    run: withDir((dir) => {
      const root = path.join(dir, "baselines");
      const { lane, modulePath, setSpec } = fixtureLane(dir, { s: { steps: [{ project: { "a.md": "A\n" } }] } });
      goldenOk(["--lane", "fixture", "--update"], { root, modules: [modulePath] });
      setSpec("s", 0, { project, home });
      const { passed, report } = compareScenario({ lanes: [lane], laneId: "fixture", scenarioId: "s", root });
      assert.equal(passed, false);
      assert.ok(report.startsWith(`${summary}\n`), report);
      assert.ok(report.includes(diff.join("\n")), `the whole file diffed against nothing:\n${report}`);
    }),
  })),
  {
    name: "203/00 task02 E18 — past 20 files, the report lists every path and shows 20 diffs, saying 5 were left out and that the script prints them all",
    run: withDir((dir) => {
      const root = path.join(dir, "baselines");
      const files = (text) => Object.fromEntries(Array.from({ length: 25 }, (_, index) => [`f${String(index).padStart(2, "0")}.md`, text]));
      const { lane, modulePath, setSpec } = fixtureLane(dir, { s: { steps: [{ project: files("old\n") }] } });
      goldenOk(["--lane", "fixture", "--update"], { root, modules: [modulePath] });
      setSpec("s", 0, { project: files("new\n") });
      const { report } = compareScenario({ lanes: [lane], laneId: "fixture", scenarioId: "s", root });
      const paths = Array.from({ length: 25 }, (_, index) => `project/f${String(index).padStart(2, "0")}.md`);
      assert.ok(report.startsWith(`25 changed\n${paths.map((key) => `  ${key}`).join("\n")}\n`), "every path is listed");
      const shown = [...report.matchAll(/^\+\+\+ actual\/(.+)$/gmu)].map((match) => match[1]);
      assert.deepEqual(shown, paths.slice(0, 20), "the first 20 diffs, in path order");
      assert.match(report, /5 diffs were left out; node scripts\/golden\.mjs .* prints them all\./u);
    }),
  },
  {
    name: "203/00 task02 E19 — a changed step record fails even when no file changed",
    run: withDir((dir) => {
      const root = path.join(dir, "baselines");
      const { lane, modulePath, setSpec } = fixtureLane(dir, { s: { steps: [{ project: { "a.md": "A\n" }, envelope: { said: "before" } }] } });
      goldenOk(["--lane", "fixture", "--update"], { root, modules: [modulePath] });
      setSpec("s", 0, { project: { "a.md": "A\n" }, envelope: { said: "after" } });
      const { passed, report } = compareScenario({ lanes: [lane], laneId: "fixture", scenarioId: "s", root });
      assert.equal(passed, false);
      assert.ok(report.startsWith("step records changed\n"), report);
      assert.ok(report.includes('-      "said": "before"\n+      "said": "after"'), `the step records' diff:\n${report}`);
    }),
  },
  {
    name: "203/00 task02 E20 — a scenario with no baseline fails with the update command and writes nothing",
    run: withDir((dir) => {
      const root = path.join(dir, "baselines");
      const { lane } = fixtureLane(dir, { s: { steps: [{ project: { "a.md": "A\n" } }] } });
      const { passed, report } = compareScenario({ lanes: [lane], laneId: "fixture", scenarioId: "s", root });
      assert.equal(passed, false);
      assert.match(report, /"s" has no baseline/u);
      assert.equal(report.split("\n").at(-1), updateCommand("fixture", "s"));
      assert.equal(snapshot(root).size, 0, "no file exists under the baseline root");
    }),
  },
];

// ── task 03 · R4 · only the update script writes a baseline ────────────────────────────────

const derivedLane = (dir, extra = {}) =>
  fixtureLane(dir, {
    base: { steps: [{ project: { "a.md": "A\n", "b.md": "B\n" } }] },
    s: { base: "base", steps: [{ project: { "b.md": "B for s\n" } }] },
    ...extra,
  });

const task03 = [
  {
    name: "203/00 task03 E21 — a failing run leaves every baseline byte and modification time as it was",
    run: withDir((dir) => {
      const root = path.join(dir, "baselines");
      const { lane, modulePath, setSpec } = fixtureLane(dir, { s: { steps: [{ project: { "a.md": "A\n" } }] } });
      goldenOk(["--lane", "fixture", "--update"], { root, modules: [modulePath] });
      const before = snapshot(root);
      setSpec("s", 0, { project: { "a.md": "drifted\n" } });
      assert.equal(compareScenario({ lanes: [lane], laneId: "fixture", scenarioId: "s", root }).passed, false);
      assert.deepEqual(snapshot(root), before);
    }),
  },
  {
    name: "203/00 task03 — without --update, the script reports exactly what the suite reports, exits non-zero and writes nothing",
    run: withDir((dir) => {
      const root = path.join(dir, "baselines");
      const { lane, modulePath, setSpec } = fixtureLane(dir, { s: { steps: [{ project: { "a.md": "A\n", "b.md": "B\n" } }] } });
      goldenOk(["--lane", "fixture", "--update"], { root, modules: [modulePath] });
      setSpec("s", 0, { project: { "a.md": "A\n", "b.md": "B changed\n" } });
      const before = snapshot(root);
      const suite = compareScenario({ lanes: [lane], laneId: "fixture", scenarioId: "s", root });
      const script = golden(["--lane", "fixture", "--scenario", "s"], { root, modules: [modulePath] });
      assert.notEqual(script.status, 0);
      assert.ok(script.stdout.includes(suite.report), `the script prints the suite's summary and diff:\n${script.stdout}`);
      assert.deepEqual(snapshot(root), before, "it writes nothing");
    }),
  },
  {
    name: "203/00 task03 — --update writes a scenario with no base whole: a .golden per captured file, steps.golden and an empty removed.golden, printing each file",
    run: withDir((dir) => {
      const root = path.join(dir, "baselines");
      const { modulePath } = fixtureLane(dir, { base: { steps: [{ project: { "a.md": "A\n", "d/b.md": "B\n" }, home: { "x.json": "{}\n" } }] } });
      const { stdout } = goldenOk(["--lane", "fixture", "--scenario", "base", "--update"], { root, modules: [modulePath] });
      const written = [...snapshot(path.join(root, "fixture", "base")).keys()].sort();
      assert.deepEqual(written, ["home/x.json.golden", "project/a.md.golden", "project/d/b.md.golden", "removed.golden", "steps.golden"]);
      assert.equal(readFileSync(path.join(root, "fixture", "base", "removed.golden"), "utf8"), "");
      for (const rel of written) assert.ok(stdout.includes(`wrote fixture/base/${rel}`), `prints ${rel}`);
    }),
  },
  {
    name: "203/00 task03 E22 — --update stores only what a derived scenario changes, and lists what it lacks",
    run: withDir((dir) => {
      const root = path.join(dir, "baselines");
      const { modulePath } = derivedLane(dir);
      goldenOk(["--lane", "fixture", "--update"], { root, modules: [modulePath] });
      assert.deepEqual([...snapshot(path.join(root, "fixture", "s")).keys()].sort(), ["project/b.md.golden", "removed.golden", "steps.golden"]);
      assert.equal(readFileSync(path.join(root, "fixture", "s", "removed.golden"), "utf8"), "project/a.md\n");
    }),
  },
  {
    name: "203/00 task03 E25 — --update removes a stored file the scenario no longer differs on",
    run: withDir((dir) => {
      const root = path.join(dir, "baselines");
      const { modulePath, setSpec } = derivedLane(dir);
      goldenOk(["--lane", "fixture", "--update"], { root, modules: [modulePath] });
      assert.ok(existsSync(path.join(root, "fixture", "s", "project", "b.md.golden")));
      setSpec("s", 0, { project: { "b.md": "B\n" } });
      goldenOk(["--lane", "fixture", "--scenario", "s", "--update"], { root, modules: [modulePath] });
      assert.equal(existsSync(path.join(root, "fixture", "s", "project", "b.md.golden")), false);
    }),
  },
  {
    name: "203/00 task03 E23 — updating a base re-derives every scenario that builds on it, base first",
    run: withDir((dir) => {
      const root = path.join(dir, "baselines");
      // s and t each store their own a.md at first. Only a re-derive removes it once all three agree.
      const outputs = (a) => ({ base: { "a.md": a.base, "b.md": "B\n" }, s: { "a.md": a.s, "s.md": "S\n" }, t: { "a.md": a.t, "b.md": "B\n", "t.md": "T\n" } });
      const before = outputs({ base: "A\n", s: "A for s\n", t: "A for t\n" });
      const { lane, modulePath, setSpec } = fixtureLane(dir, {
        base: { steps: [{ project: before.base }] },
        s: { base: "base", steps: [{ project: before.s }] },
        t: { base: "base", steps: [{ project: before.t }] },
      });
      goldenOk(["--lane", "fixture", "--update"], { root, modules: [modulePath] });
      for (const id of ["s", "t"]) assert.ok(existsSync(path.join(root, "fixture", id, "project", "a.md.golden")), `${id} stores its own a.md before the change`);
      const after = outputs({ base: "A2\n", s: "A2\n", t: "A2\n" });
      for (const id of ["base", "s", "t"]) setSpec(id, 0, { project: after[id] });
      const { stdout } = goldenOk(["--lane", "fixture", "--scenario", "base", "--update"], { root, modules: [modulePath] });
      const lines = stdout.split("\n");
      const firstOf = (ref) => lines.findIndex((line) => line.includes(`${ref}/`) || line.startsWith(`${ref}:`));
      assert.ok(firstOf("fixture/base") !== -1 && firstOf("fixture/base") < firstOf("fixture/s") && firstOf("fixture/base") < firstOf("fixture/t"), `base is written before s and t:\n${stdout}`);
      for (const id of ["s", "t"]) assert.equal(existsSync(path.join(root, "fixture", id, "project", "a.md.golden")), false, `${id} stores no a.md, because it now matches the new base`);
      for (const id of ["base", "s", "t"]) {
        const { passed, report } = compareScenario({ lanes: [lane], laneId: "fixture", scenarioId: id, root });
        assert.ok(passed, `${id} passes after the update:\n${report}`);
      }
    }),
  },
  {
    name: "203/00 task03 E24 — a second --update writes nothing and says so",
    run: withDir((dir) => {
      const root = path.join(dir, "baselines");
      const { modulePath } = derivedLane(dir);
      goldenOk(["--lane", "fixture", "--update"], { root, modules: [modulePath] });
      const before = snapshot(root);
      const { stdout } = goldenOk(["--lane", "fixture", "--update"], { root, modules: [modulePath] });
      assert.deepEqual(snapshot(root), before);
      assert.match(stdout, /every baseline was already current/u);
    }),
  },
  {
    name: "203/00 task03 — --update over every lane writes them all, and with --lane fixture only lane fixture",
    run: withDir((dir) => {
      const root = path.join(dir, "baselines");
      const fixture = fixtureLane(dir, { s: { steps: [{ project: { "a.md": "A\n" } }] } });
      const other = fixtureLane(dir, { o: { steps: [{ project: { "o.md": "O\n" } }] } }, "other");
      const modules = [fixture.modulePath, other.modulePath];
      goldenOk(["--update"], { root, modules });
      assert.ok(existsSync(path.join(root, "fixture", "s", "steps.golden")) && existsSync(path.join(root, "other", "o", "steps.golden")), "every lane is written");
      fixture.setSpec("s", 0, { project: { "a.md": "A2\n" } });
      other.setSpec("o", 0, { project: { "o.md": "O2\n" } });
      goldenOk(["--lane", "fixture", "--update"], { root, modules });
      assert.equal(readFileSync(path.join(root, "fixture", "s", "project", "a.md.golden"), "utf8"), "A2\n");
      assert.equal(readFileSync(path.join(root, "other", "o", "project", "o.md.golden"), "utf8"), "O\n", "lane other is untouched");
    }),
  },
  ...[
    [["--lane", "nowhere", "--update"], ["nowhere", "fixture"]],
    [["--lane", "fixture", "--scenario", "nowhere", "--update"], ["nowhere", "fixture/s"]],
  ].map(([args, named]) => ({
    name: `203/00 task03 — an unknown lane or scenario is refused by name, writing nothing: ${args.join(" ")}`,
    run: withDir((dir) => {
      const root = path.join(dir, "baselines");
      const { modulePath } = fixtureLane(dir, { s: { steps: [{ project: { "a.md": "A\n" } }] } });
      const result = golden(args, { root, modules: [modulePath] });
      assert.notEqual(result.status, 0);
      for (const name of named) assert.ok(result.stderr.includes(name), `names ${name}: ${result.stderr}`);
      assert.equal(snapshot(root).size, 0);
    }),
  })),
];

// ── 204/02 task02 · a step may run a fixture script (204/ADR-001 §5) ─────────────────────────

const USER_EDIT = "test/golden/fixtures/user-edit.mjs";

const stepScript = [
  {
    name: "204/02 task02 — a step carrying a command runs that fixture script in the lane command's place, and its record names the script",
    run: withDir(async () => {
      const lane = { id: "edits", command: [FIXTURE_VERB], scenarios: [{ id: "s", files: { "notes.md": "one\n" }, steps: [{ command: USER_EDIT, argv: ["notes.md", "--append", "two\n"], exit: 0 }] }] };
      const { tree, steps } = runScenario(lane, lane.scenarios[0]);
      assert.equal(tree.get("project/notes.md").toString("utf8"), "one\ntwo\n");
      assert.deepEqual(steps, [{ command: USER_EDIT, argv: ["notes.md", "--append", "two\n"], exit: 0, envelope: null }]);
    }),
  },
  ...[
    [["notes.md", "--append", "two\n"], 0, "one\ntwo\n"],
    [["notes.md", "--prepend", "zero\n"], 0, "zero\none\n"],
    [["absent.md", "--append", "x\n"], 1, null],
  ].map(([argv, exit, after]) => ({
    name: `204/02 task02 — user-edit.mjs ${argv.join(" ").replaceAll("\n", "\\n")} exits ${exit}${after === null ? ", names the missing file and creates nothing" : ""}`,
    run: withDir(async (dir) => {
      writeFileSync(path.join(dir, "notes.md"), "one\n");
      const result = spawnCliSync(process.execPath, [path.join(repoRoot, USER_EDIT), ...argv], { cwd: dir, encoding: "utf8" });
      assert.equal(result.status, exit, result.stderr);
      if (after === null) {
        assert.match(result.stderr, /absent\.md/u);
        assert.ok(!existsSync(path.join(dir, "absent.md")), "no file is created");
        assert.equal(readFileSync(path.join(dir, "notes.md"), "utf8"), "one\n");
      } else {
        assert.equal(readFileSync(path.join(dir, "notes.md"), "utf8"), after);
      }
    }),
  })),
];

export const goldenHarnessTests = [...task00, ...task01, ...task02, ...task03, ...stepScript];
