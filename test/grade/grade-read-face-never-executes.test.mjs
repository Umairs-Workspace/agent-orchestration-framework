// Traceability wiring for milestone 54 / story 01, task `02_the-read-face-never-executes`.
//
// Every @executable scenario of
//   wiki/work/54_milestone_verification-loop/stories/01_story_the-declared-rubric/tasks/02_the-read-face-never-executes.feature
//
// THIS RULE IS NOT STYLISTIC, AND THE COST OF GETTING IT WRONG IS MEASURED.
// `acd-work-command-cli-bijection` spawns `aof work <sub> --json` as a REAL SUBPROCESS from
// inside this repo's own test suite, over every registry-derived `work:*` subcommand. A
// `work:grade` whose bare face executed the declared rubric would therefore make this repo's
// test suite SPAWN ITSELF — and, with a board route, make a page load spawn a test run,
// because `acd-work-command-route-coverage` stands the server up and hits every served route.
//
// WHAT LANDS HERE AND WHAT DOES NOT, so a null is not read as a defect: the READER of the
// last recorded grade lands with this story; the WRITER is 54/03 (ADR-008 §3 puts
// `brief.grade` on the run through `transitionRunStart`'s `edge.brief`). The seeded records
// below stand in for that writer — the SHAPE is ADR-008 §3's and the seam is not this
// story's to build.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, rm, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { invoke, getCommand, listCommands } from "../../src/command-core.mjs";
import { serveSetupUi } from "../../src/setup-ui.mjs";
import { startRun } from "../../src/run-store.mjs";
import { resolveItem } from "../../src/commands/resolve.mjs";
import { spawnCliSync } from "../support/cli-spawn.mjs";
import { makeGradeRepo, writeRunner, rubricFor, ctxFor, countingSpawn } from "../support/grade-fixture.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "bin", "aof.mjs");

// A grade record of ADR-005 §4's exact shape, standing in for 54/03's writer.
const RECORDED = Object.freeze({
  ref: "03",
  verdict: "fail",
  codes: ["case-failed"],
  runner: { command: ["node", "runner.mjs"], cwd: "/repo", exit: 1, durationMs: 4321 },
  report: { format: "tap", path: "/repo/report.tap", floor: 1 },
  cases: { total: 12, failed: 2, skipped: 1 },
  failures: [{ case: "a case that failed", message: "expected 1 to equal 2", scenario: null }],
  gradedAt: "2026-08-22T10:00:00.000Z",
  provenance: { node: "node-a", run: null, commit: null, at: "2026-08-22T10:00:00.000Z" },
});

// Seed a run carrying `brief.grade` — the DURABLE record ADR-008 §3 puts on the run the
// grade re-drove, through the bag that already carries `brief.loop`.
async function seedRecordedGrade(repo, ref = "03") {
  const ctx = await ctxFor(repo);
  const item = await resolveItem(ctx, ref);
  await startRun(item, { brief: { grade: RECORDED }, now: "2026-08-22T10:00:01.000Z" });
  return ctx;
}

async function withBoard(repo, body) {
  const { server, url } = await serveSetupUi(null, { projectDir: repo, port: 0 });
  try {
    return await body(url);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

export const gradeReadFaceNeverExecutesTests = [
  {
    name: "grade/02 the bare verb reports the plan and executes nothing",
    run: async () => {
      const { repo } = await makeGradeRepo();
      const runner = await writeRunner(repo, "green.cjs", 'process.stdout.write("ok - one\\n");');
      const fx = await makeGradeRepo({ rubric: rubricFor(runner) });
      try {
        const spawn = countingSpawn();
        const result = await invoke("work:grade", { ref: "03" }, await ctxFor(fx.repo, { spawnRubric: spawn }));

        assert.deepEqual(result.plan.command, [process.execPath, runner], "the output reports the argv that WOULD run");
        assert.equal(result.plan.cwd, fx.repo, "…its working directory");
        assert.equal(result.plan.report.path, path.join(fx.repo, "report.tap"), "…the report path");
        assert.equal(result.floor, 1, "…and the floor");

        assert.equal(spawn.calls.length, 0, "no process was launched");
        assert.equal(result.launched, 0, "…and the record says so");
        assert.equal(existsSync(path.join(fx.repo, "report.tap")), false, "the declared report path is neither created nor modified");
        assert.equal(result.ran, false, "the read face reports itself as a read");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "grade/02 the bare verb reports the last recorded grade, and says so when there is none",
    run: async () => {
      const { repo } = await makeGradeRepo();
      const runner = await writeRunner(repo, "green.cjs", 'process.stdout.write("ok - one\\n");');
      const fx = await makeGradeRepo({ rubric: rubricFor(runner) });
      try {
        const result = await invoke("work:grade", { ref: "03" }, await ctxFor(fx.repo));
        assert.equal(result.recorded, null, "no grade has been recorded for the item");
        assert.match(result.message, /No grade has been recorded/, "the output states that no grade has been recorded for that item");
        // IT DOES NOT PRESENT THE PLAN AS THOUGH IT WERE A RESULT — the plan is reported,
        // and it is reported AS a plan.
        assert.match(result.message, /it is not a result/, "it does not present the plan as though it were a result");
        assert.notEqual(result.grade?.verdict, "pass", "the verdict field of a never-recorded grade is not reported as pass");
        assert.equal(result.grade, null, "…there is no verdict at all, because nothing was graded");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "grade/02 a recorded grade is reported back verbatim by the read face",
    run: async () => {
      const { repo } = await makeGradeRepo();
      const runner = await writeRunner(repo, "green.cjs", 'process.stdout.write("ok - one\\n");');
      const fx = await makeGradeRepo({ rubric: rubricFor(runner) });
      try {
        await seedRecordedGrade(fx.repo);
        const spawn = countingSpawn();
        const result = await invoke("work:grade", { ref: "03" }, await ctxFor(fx.repo, { spawnRubric: spawn }));

        assert.equal(result.recorded.verdict, "fail", "the output reports that grade's verdict");
        assert.deepEqual(result.recorded.codes, ["case-failed"], "…its codes");
        assert.deepEqual(result.recorded.cases, { total: 12, failed: 2, skipped: 1 }, "…and its observed case counts");
        assert.ok(result.recordedAt, "it reports when the grade was taken");

        // NOTHING ABOUT THE RECORDED GRADE WAS RECOMPUTED BY READING IT. The record comes
        // back byte-identical, and no runner was launched to produce it.
        assert.deepEqual(result.recorded, RECORDED, "nothing about the recorded grade was recomputed by reading it");
        assert.equal(spawn.calls.length, 0, "…and reading it launched nothing");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "grade/02 `--run` is the only door to execution",
    run: async () => {
      const { repo } = await makeGradeRepo();
      const runner = await writeRunner(repo, "green.cjs", 'process.stdout.write("ok - one\\n");');
      const fx = await makeGradeRepo({ rubric: rubricFor(runner) });
      try {
        const ran = countingSpawn();
        await invoke("work:grade", { ref: "03", run: true }, await ctxFor(fx.repo, { spawnRubric: ran }));
        assert.equal(ran.calls.length, 1, "exactly one process is launched");

        const read = countingSpawn();
        await invoke("work:grade", { ref: "03" }, await ctxFor(fx.repo, { spawnRubric: read }));
        assert.equal(read.calls.length, 0, "invoking the same command without --run launches none");

        // NO OTHER FLAG, POSITIONAL OR ENVIRONMENT VARIABLE REACHES THE SPAWN. `run` is the
        // only input the argv adapter can set that turns the read into an act, and the
        // schema is closed (`additionalProperties: false`) so nothing else can be smuggled in.
        const command = getCommand("work:grade");
        assert.equal(command.input.additionalProperties, false, "the input schema is closed");
        assert.deepEqual(
          Object.keys(command.cli.spec.flags),
          ["run"],
          "`--run` is the only flag the CLI face declares",
        );
        assert.deepEqual(command.cli.argv(["03"], {}), { ref: "03" }, "a bare positional yields no run");
        assert.deepEqual(command.cli.argv(["03"], { run: true }), { ref: "03", run: true }, "…and only --run sets it");
        // An environment variable cannot open the door either: no read of process.env
        // decides whether to spawn.
        const source = await readFile(path.join(repoRoot, "src", "commands", "grade.mjs"), "utf8");
        assert.ok(!/if\s*\([^)]*process\.env[^)]*\)\s*\{[^}]*spawn/s.test(source), "no environment variable gates the spawn");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "grade/02 the machine face of the bare verb is one parseable document at exit 0, spawned as a real subprocess",
    run: async () => {
      // THE BIJECTION GATE'S OWN PROBE, run here as a behaviour rather than left to the
      // arch-test: the fixture declares no `work.rubric`, so an executing bare face would
      // have nothing to run — the assertion that matters is that it exits 0 with ONE
      // document and launches nothing.
      const fx = await makeGradeRepo();
      try {
        const result = spawnCliSync(process.execPath, [cliPath, "work", "grade", "03", "--json"], {
          cwd: fx.repo,
          encoding: "utf8",
          env: { ...process.env, NODE_NO_WARNINGS: "1" },
        });
        assert.equal(result.status, 0, `it exits 0 (stderr: ${result.stderr})`);
        let parsed;
        assert.doesNotThrow(() => { parsed = JSON.parse(result.stdout ?? ""); }, "its standard output parses as exactly one JSON document");
        assert.equal(parsed.launched, 0, "no process was launched by it");
        assert.ok(parsed.grade.codes.includes("rubric-unconfigured"), "the document reports rubric-unconfigured");
        assert.ok(parsed.error === undefined, "…rather than an error");
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "grade/02 the command is registered once, and is CLI-reachable by its declared route",
    run: async () => {
      const registered = listCommands().filter((command) => command.id === "work:grade");
      assert.equal(registered.length, 1, "work:grade appears exactly once");

      const [command] = registered;
      assert.notEqual(command.cli, null, "it carries a non-null cli adapter");
      assert.equal(typeof command.cli.argv, "function", "…with an argv function");
      assert.equal(typeof command.cli.render, "function", "…and a render function");
      assert.deepEqual(command.cli.route, ["work", "grade"], "it is reachable through its declared route `work grade`");
      // `acd-launcher-seam` needs NOTHING from this story — but it is VERIFIED at build,
      // never assumed (`m19/R1`).
      assert.equal(command.cli.launch, undefined, "it declares no launcher seam");
    },
  },

  {
    name: "grade/02 the command is a documented board-deferred member with no served route",
    run: async () => {
      const { repo } = await makeGradeRepo();
      const runner = await writeRunner(repo, "green.cjs", 'process.stdout.write("ok - one\\n");');
      const fx = await makeGradeRepo({ rubric: rubricFor(runner) });
      try {
        await withBoard(fx.repo, async (url) => {
          // NO ROUTE SERVES THE GRADE. A `GET /api/work/grade` that executed a suite would
          // let a page load spawn a test run.
          const response = await fetch(new URL("/api/work/grade", url));
          const body = await response.json().catch(() => null);
          assert.ok(response.status === 404 || body?.code === "not-found", `/api/work/grade is not a served route (got ${response.status})`);
          assert.equal(existsSync(path.join(fx.repo, "report.tap")), false, "a board page load launches no process");
        });

        // A DOCUMENTED MEMBER WITH ITS REASON RECORDED BESIDE IT — the carve-out records a
        // deferral, never an oversight.
        // Read as LINES, never as a positional cut: the carve-out's delimiters are lines,
        // and an `indexOf` sentinel end would assume a declaration order nothing pins.
        const guard = await readFile(path.join(repoRoot, "test", "arch", "work", "acd-work-command-route-coverage.test.mjs"), "utf8");
        const lines = guard.split(/\r?\n/);
        const opens = lines.findIndex((line) => line.includes("const BOARD_DEFERRED"));
        const closes = lines.findIndex((line, index) => index > opens && /^\s*\]\);\s*$/.test(line));
        const at = lines.findIndex((line, index) => index > opens && index < closes && /^\s*"grade",\s*$/.test(line));
        assert.ok(at > opens, "work:grade is a member of the board-deferred carve-out");

        const reason = [];
        for (let index = at - 1; index > opens && /^\s*\/\//.test(lines[index]); index -= 1) reason.unshift(lines[index]);
        assert.match(reason.join("\n"), /page load|spawn a test run/i, "…with its reason recorded beside it");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "grade/02 the grade still reaches the board, on the run record and through the existing read",
    run: async () => {
      const { repo } = await makeGradeRepo();
      const runner = await writeRunner(repo, "green.cjs", 'process.stdout.write("ok - one\\n");');
      const fx = await makeGradeRepo({ rubric: rubricFor(runner) });
      try {
        await seedRecordedGrade(fx.repo);
        // THE EXISTING READ, UNCHANGED. `work:run-status` returns the run records; the grade
        // rides `brief.grade` (ADR-008 §3) and arrives with them.
        const status = await invoke("work:run-status", { ref: "03" }, await ctxFor(fx.repo));
        const carried = status.runs.map((run) => run.brief?.grade).filter(Boolean);
        assert.equal(carried.length, 1, "the grade is present in what the board's run status returns");
        assert.equal(carried[0].verdict, "fail", "…its verdict");
        assert.deepEqual(carried[0].codes, ["case-failed"], "…and its codes");

        // ZERO BOARD CHANGE. Asserted as a property of the sources rather than as a diff.
        const boardUi = await readFile(path.join(repoRoot, "src", "board-ui.mjs"), "utf8");
        assert.ok(!boardUi.includes("work:grade"), "src/board-ui.mjs was not edited to make that true");
        assert.ok(!boardUi.includes("/api/work/grade"), "…and it serves no grade route");

        const uiFiles = [];
        const walk = async (dir) => {
          for (const entry of await readdir(dir, { withFileTypes: true })) {
            if (entry.name === "node_modules" || entry.name === "dist") continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) await walk(full);
            else if (/\.(m?[jt]sx?|vue|svelte)$/.test(entry.name)) uiFiles.push(full);
          }
        };
        await walk(path.join(repoRoot, "ui"));
        for (const file of uiFiles) {
          const text = await readFile(file, "utf8");
          assert.ok(!text.includes("work:grade"), `no file under ui/ was edited to make that true (${path.relative(repoRoot, file)})`);
        }
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "grade/02 no prompt-layer wrapper is added for this command",
    run: async () => {
      // `53/ADR-008`'s ruling, unchanged: `/aof:continue` and `/aof:verify` ARE the wrappers,
      // and the prompt-layer wording is 71's.
      const bundleCommands = path.join(repoRoot, "src", "bundle", "commands");
      const files = await readdir(bundleCommands);
      assert.ok(!files.some((name) => /grade/i.test(name)), "no new /aof:* wrapper file exists for the grade verb");
      for (const name of files) {
        const text = await readFile(path.join(bundleCommands, name), "utf8");
        assert.ok(!text.includes("work:grade"), `no file under src/bundle/commands/ was edited by this story (${name})`);
        assert.ok(!text.includes("aof work grade"), `…nor spells the verb in prose (${name})`);
      }
    },
  },
];
