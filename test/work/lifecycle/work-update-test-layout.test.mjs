import { defaultApplication as _aofApplication } from "aof/default-application";
// Traceability wiring for milestone 190 / story 04 task 01 — `aof work update` prints the
// test-layout warnings (190/ADR-008 §5, 190/04 Q1).
//
// Covers every @executable scenario in
//   tasks/01_work-update-prints-the-test-layout-warnings.feature
//
// THE FIXTURE is a scratch repo initialised by the shipped `work:init` (Claude only, the cheapest
// render), so every case runs `work:update` over a real install. Its
// config is then replaced by the case's, and its git index staged with the case's files. "runs" is
// the `work:update` command: its `run`, then its `--json` and text faces. `AOF_GLOBAL_HOME` is
// isolated by the runner.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const init = _aofApplication.getCommand("work:init");
const update = _aofApplication.getCommand("work:update");
const doctor = _aofApplication.getCommand("project:doctor");

// E20's pre-190 declaration: one root, no couplings, a gate with no resume templates.
const PRE_190 = Object.freeze({
  command: "node",
  args: ["scripts/test.mjs"],
  selectArgs: ["--only", "{file}"],
  roots: ["test"],
  deadlineMs: 60_000,
  report: { format: "tap" },
  gate: { args: ["scripts/test-sharded.mjs"], jobsArgs: ["--jobs", "{jobs}"] },
});

// E21's: the same, with every key the family reads declared, the work dir's coupling among them.
const COVERED = Object.freeze({
  ...PRE_190,
  roots: ["test", "packages/work/test"],
  suiteSuffixes: [".test.mjs", ".suite.mjs"],
  couplings: [{ paths: ["wiki/**"], suites: [], why: "no suite reads the work stream" }],
  gate: { ...PRE_190.gate, reportArgs: ["--report-json", "{report}"], filesArgs: ["--files", "{files}"] },
});

async function withRepo(test, run) {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-190-04-update-"));
  try {
    await init.run({ targetDir: repo, runtimes: ["claude"] });
    const configPath = path.join(repo, ".aof", "aof.config.json");
    const config = JSON.parse(await readFile(configPath, "utf8").catch(() => "{}"));
    const work = { ...(config.work ?? {}) };
    if (test === undefined) delete work.test;
    else work.test = test;
    await writeFile(configPath, `${JSON.stringify({ name: "p", resources: [], ...config, work }, null, 2)}\n`);
    // A suite and a work-stream record, so E21's work-dir coupling matches a tracked file.
    const file = "packages/work/test/a.suite.mjs";
    const record = "wiki/work/README.md";
    for (const tracked of [file, record]) {
      await mkdir(path.join(repo, path.dirname(tracked)), { recursive: true });
      await writeFile(path.join(repo, tracked), "// fixture\n");
    }
    for (const args of [["init", "-q"], ["add", "--", file, record]]) {
      const result = spawnSync("git", args, { cwd: repo, encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
    }
    await run(repo);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
}

async function updated(repo, { dryRun = false } = {}) {
  const result = await update.run({ targetDir: repo, ...(dryRun ? { dryRun } : {}) });
  return { result, json: update.cli.json(result), text: update.cli.render(result) };
}

const layoutLines = (text) => text.split("\n").filter((line) => line.includes("test-layout-"));

// Every file under the repo with its size and modification time, to show a dry run wrote nothing.
async function snapshot(root) {
  const out = {};
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.name === ".git") continue;
      if (entry.isDirectory()) await walk(full);
      else {
        const info = await stat(full);
        out[path.relative(root, full)] = `${info.size}:${info.mtimeMs}`;
      }
    }
  }
  await walk(root);
  return out;
}

export const workUpdateTestLayoutTests = [
  {
    name: "190/04-01 E20 · a pre-190 declaration prints one line per warning, after the Updated ACD line",
    run: () => withRepo(PRE_190, async (repo) => {
      const { text } = await updated(repo);
      const lines = text.split("\n");
      const summary = lines.findIndex((line) => line.startsWith("Updated ACD:"));
      assert.ok(summary >= 0, text);
      const after = lines.slice(summary + 1).filter((line) => line.includes("test-layout-"));
      assert.deepEqual(after.map((line) => line.match(/test-layout-[a-z]+/u)[0]), ["test-layout-suites", "test-layout-couplings", "test-layout-resume"]);
      assert.deepEqual(layoutLines(text), after, "no test-layout line before the Updated ACD line");
      for (const line of after) assert.match(line, /\/aof:map-tests/u, line);
    }),
  },
  {
    name: "190/04-01 E21 · a declaration that covers the tree prints nothing",
    run: () => withRepo(COVERED, async (repo) => {
      const { text, json } = await updated(repo);
      assert.deepEqual(layoutLines(text), []);
      assert.deepEqual(json.testLayout, []);
    }),
  },
  {
    name: "190/04-01 E22 · the dry run prints the same lines and writes nothing",
    run: () => withRepo(PRE_190, async (repo) => {
      const before = await snapshot(repo);
      const dry = await updated(repo, { dryRun: true });
      assert.deepEqual(await snapshot(repo), before, "no file is written");
      const wet = await updated(repo);
      assert.equal(layoutLines(dry.text).length, 3);
      assert.deepEqual(layoutLines(dry.text), layoutLines(wet.text));
    }),
  },
  {
    name: "190/04-01 the update and the project doctor agree",
    run: () => withRepo(PRE_190, async (repo) => {
      const { json } = await updated(repo);
      const report = await doctor.run({ target: repo });
      const warnings = report.checks
        .filter((check) => check.id.startsWith("test-layout-") && check.severity === "warning")
        .map(({ id, message }) => ({ id, message }));
      assert.equal(warnings.length, 3);
      assert.deepEqual(json.testLayout.map(({ id, message }) => ({ id, message })), warnings);
    }),
  },
  {
    name: "190/04-01 an undeclared test runner adds no line",
    run: () => withRepo(undefined, async (repo) => {
      const { text } = await updated(repo);
      assert.deepEqual(layoutLines(text), []);
    }),
  },
];
