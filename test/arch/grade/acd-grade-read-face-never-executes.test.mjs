// FF-5405 (milestone 54 / ADR-003) — THE READ FACE NEVER EXECUTES, AND A GRADE NEVER
// RE-ENTERS ITSELF.
//
// Three properties, each with a measured cost behind it:
//   1. `work:grade`'s registered `run()` spawns NOTHING unless `run === true`. The bijection
//      gate spawns `aof work grade <ref> --json` as a real subprocess from inside this repo's
//      own suite; an executing bare face would make the suite spawn itself.
//   2. `work:grade` is a documented `BOARD_DEFERRED` member and no `/api/work/grade` route
//      exists. The route-coverage gate stands the server up and hits every served route; a
//      served grade would make a page load spawn a test run.
//   3. The spawn sets the re-entrancy stamp, and an already-stamped environment is REFUSED.
//      A rubric that invokes aof must not be able to fork a grader tree — and this repo is
//      exactly such a project: bare `aof` on PATH symlinks into the working tree.
//
// `m45/R5` (surfaced at recall) is the discipline this file is held to: *a fitness function
// must check what its name claims*. Each of the three is asserted over the running system —
// a real invocation, a real server, a real stamped environment — not over a comment.
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getCommand, listCommands } from "../../../src/command-core.mjs";
import { invoke } from "../../../src/command-core.mjs";
import { serveSetupUi } from "../../../src/setup-ui.mjs";
import { GRADE_REENTRANCY_ENV } from "../../../src/commands/grade.mjs";
import { makeGradeRepo, writeRunner, rubricFor, ctxFor, countingSpawn } from "../../support/grade-fixture.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export const archTests = [
  {
    name: "arch/FF-5405 the registered run() spawns nothing unless run === true",
    run: async () => {
      const { repo } = await makeGradeRepo();
      const runner = await writeRunner(repo, "green.cjs", 'process.stdout.write("ok - one\\n");');
      const fx = await makeGradeRepo({ rubric: rubricFor(runner) });
      try {
        const ctx = await ctxFor(fx.repo);
        // EVERY falsy and near-miss spelling of the flag reads as a READ. `run: true` is the
        // only door, so a truthy-but-not-true value must not open it either.
        for (const input of [{ ref: "03" }, { ref: "03", run: false }, { ref: "03", run: undefined }]) {
          const spawn = countingSpawn();
          const result = await invoke("work:grade", input, { ...ctx, spawnRubric: spawn });
          assert.equal(spawn.calls.length, 0, `${JSON.stringify(input)} launches nothing`);
          assert.equal(result.launched, 0, `${JSON.stringify(input)} reports launching nothing`);
        }
        const spawn = countingSpawn();
        await invoke("work:grade", { ref: "03", run: true }, { ...ctx, spawnRubric: spawn });
        assert.equal(spawn.calls.length, 1, "…and run: true launches exactly one");

        // NOTHING WAS WRITTEN AT THE DECLARED REPORT PATH BY A READ — the runner writes it,
        // and no runner ran.
        assert.equal(existsSync(path.join(fx.repo, "report.tap")), false, "a read creates nothing at the declared report path");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "arch/FF-5405 work:grade is a documented BOARD_DEFERRED member and no /api/work/grade route exists",
    run: async () => {
      // A LINE WALK, NOT A POSITIONAL CUT. `acd-test-suite-registration`'s ledger is right
      // about why: a slice whose end is a second `indexOf` sentinel assumes a declaration
      // order nothing pins, and this repo has six instruments that were wrong about the tree
      // for exactly that reason. The carve-out's own delimiters are LINES, so lines are what
      // this reads.
      const guard = await readFile(path.join(repoRoot, "test", "arch", "work", "acd-work-command-route-coverage.test.mjs"), "utf8");
      const lines = guard.split(/\r?\n/);
      const opens = lines.findIndex((line) => line.includes("const BOARD_DEFERRED"));
      assert.ok(opens >= 0, "the board-deferred carve-out is where this guard expects it");
      const closes = lines.findIndex((line, index) => index > opens && /^\s*\]\);\s*$/.test(line));
      assert.ok(closes > opens, "…and its closing line was found");

      const at = lines.findIndex((line, index) => index > opens && index < closes && /^\s*"grade",\s*$/.test(line));
      assert.ok(at > opens, "work:grade is a member of the board-deferred carve-out");

      // DOCUMENTED, not merely present: a carve-out with no reason beside it is how a
      // deferral becomes an oversight nobody can tell from a decision. The contiguous
      // comment lines immediately above the member ARE its documentation.
      const reason = [];
      for (let index = at - 1; index > opens && /^\s*\/\//.test(lines[index]); index -= 1) reason.unshift(lines[index]);
      const documented = reason.join("\n");
      assert.match(documented, /54\/ADR-003/, "…with its ADR named beside it");
      assert.match(documented, /page load|spawn a test run/i, "…and its reason recorded beside it");

      const { server, url } = await serveSetupUi(null, { projectDir: repoRoot, port: 0 });
      try {
        const response = await fetch(new URL("/api/work/grade", url));
        const body = await response.json().catch(() => null);
        assert.ok(response.status === 404 || body?.code === "not-found", `no /api/work/grade route is served (got ${response.status})`);
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }

      const boardUi = await readFile(path.join(repoRoot, "src", "board-ui.mjs"), "utf8");
      assert.ok(!boardUi.includes("work:grade"), "src/board-ui.mjs never reaches the grade command");
    },
  },

  {
    name: "arch/FF-5405 the spawn sets the re-entrancy stamp, and an already-stamped environment is refused",
    run: async () => {
      const { repo } = await makeGradeRepo();
      const runner = await writeRunner(repo, "green.cjs", 'process.stdout.write("ok - one\\n");');
      const fx = await makeGradeRepo({ rubric: rubricFor(runner) });
      try {
        const ctx = await ctxFor(fx.repo);

        // THE STAMP IS SET ON EVERY SPAWN — read off the options the spawn was actually
        // given, not off a comment claiming it.
        const spawn = countingSpawn();
        await invoke("work:grade", { ref: "03", run: true }, { ...ctx, spawnRubric: spawn });
        assert.equal(spawn.calls.length, 1, "guard: one spawn");
        assert.equal(spawn.calls[0].options.env[GRADE_REENTRANCY_ENV], "1", "the spawn sets the re-entrancy stamp in the child's environment");

        // AN ALREADY-STAMPED ENVIRONMENT IS REFUSED, and refusing launches nothing.
        const stamped = countingSpawn();
        const refused = await invoke(
          "work:grade",
          { ref: "03", run: true, env: { ...process.env, [GRADE_REENTRANCY_ENV]: "1" } },
          { ...ctx, spawnRubric: stamped },
        );
        assert.equal(stamped.calls.length, 0, "an already-stamped environment launches nothing");
        assert.equal(refused.grade.verdict, "indeterminate", "…and the refusal is indeterminate");
        assert.ok(refused.grade.codes.includes("runner-spawn-failed"), "…coded runner-spawn-failed, its own stated meaning");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "arch/FF-5405 the two registry-derived gates that need NOTHING are verified, never assumed (m19/R1)",
    run: async () => {
      const [command] = listCommands().filter((entry) => entry.id === "work:grade");
      assert.ok(command, "work:grade is registered");
      // `acd-command-route-derived` — 52/ADR-012 §1 generalised the route leg, so a declared
      // `cli.route` is all it needs. Verified.
      assert.deepEqual(command.cli.route, ["work", "grade"], "acd-command-route-derived: the route is declared, so the derived leg covers it");
      assert.equal(getCommand("work:grade"), command, "…and the registry resolves it by id");
      // `acd-launcher-seam` — it needs nothing because `work:grade` declares no `cli.launch`.
      // Verified rather than assumed: an added launch body would put a spawn behind a seam
      // this file's other assertions never see.
      assert.equal(command.cli.launch, undefined, "acd-launcher-seam: work:grade declares no cli.launch");
    },
  },
];
