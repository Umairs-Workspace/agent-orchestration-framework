// FF-5406 (milestone 54 / ADR-003 §1-§2, ADR-005 §5) — THE COMPILER IS A PURE LEAF AND THE
// SPAWN IS BOUNDED IN ONE PLACE.
//
// Two halves of one shape. `src/work/grade.mjs` COMPILES a record from observations handed
// to it — it imports nothing from `src/`, no `node:child_process`, no `node:fs`, and reads no
// clock — which is exactly what lets a unit test assert every verdict rule without a live
// binary. `src/commands/grade.mjs` GATHERS them, and holds the one spawn: no shell, stdin
// closed, a RESOLVED deadline and a kill signal.
//
// `m15/R3`: the scan is over the whole `src/**` family, not over the two modules this
// milestone happens to have written — a second spawn of the declared rubric added anywhere
// else is exactly the regression this guards, and it would not be added here.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { rubricSpawnOptions, rubricChildEnv, GRADE_REENTRANCY_ENV } from "../../../src/commands/grade.mjs";
import { readSrcFiles } from "../../support/read-src-files.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const stripComments = (text) => text.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

export const archTests = [
  {
    name: "arch/FF-5406 src/work/grade.mjs is a pure leaf — only the pure provenance leaf, no child_process, no fs, no clock",
    run: async () => {
      const text = await readFile(path.join(repoRoot, "src", "work", "grade.mjs"), "utf8");
      const code = stripComments(text);

      const imports = importSpecifiers(code).map((entry) => entry.specifier);
      assert.deepEqual(imports, ["../claim-provenance.mjs"], `the pure leaf imports only the pure provenance compiler (found: ${imports.join(", ")})`);
      assert.ok(!/\bimport\s*\(/.test(code), "…and performs no dynamic import either");

      // NO CLOCK. `gradedAt` is INJECTED — a module that read one could not be asserted
      // deterministically, and the record's timestamp would stop being a fact the caller
      // owns.
      for (const forbidden of ["Date.now(", "new Date(", "performance.now(", "process.hrtime"]) {
        assert.ok(!code.includes(forbidden), `the pure leaf reads no clock (found ${forbidden})`);
      }
      for (const forbidden of ["node:child_process", "node:fs", "spawnSync", "execSync", "readFileSync"]) {
        assert.ok(!code.includes(forbidden), `the pure leaf performs no I/O (found ${forbidden})`);
      }
    },
  },

  {
    name: "arch/FF-5406 exactly one module in src/** spawns the declared rubric argv",
    run: async () => {
      const spawners = [];
      for (const file of await readSrcFiles(repoRoot)) {
        const code = stripComments(await readFile(file.path, "utf8"));
        // The declared rubric is reached through the `work.rubric` KEY — that, and nothing
        // looser, is what makes a module the rubric's reader. (`plan.command` is deliberately
        // NOT part of the predicate: `commands/project-provision.mjs` plans argv arrays and
        // spawns them, and it is a provisioner, not a second grader. A guard that named it
        // would be checking something other than what its name claims — `m45/R5`.)
        const readsTheRubric = /work\?\.rubric|work\.rubric|RUBRIC_CONFIG_KEY/.test(code);
        const spawns = /\bspawnSync\s*\(|\bspawn\s*\(|\bexecFile|\bexec\s*\(/.test(code);
        if (readsTheRubric && spawns) spawners.push(file.rel);
      }
      assert.deepEqual(spawners, ["commands/grade.mjs"], `exactly one module spawns the declared rubric argv (found: ${spawners.join(", ")})`);
    },
  },

  {
    name: "arch/FF-5406 that spawn passes no shell, closes stdin, and carries a resolved deadline with a kill signal",
    run: async () => {
      // ASSERTED OVER THE BUILDER'S OWN OUTPUT, not over its source: the envelope is what
      // the spawn actually receives. Pure + injectable precisely so this is assertable
      // without a live binary — `graphifySpawnOptions`' shape, ADR-005 §5.
      const options = rubricSpawnOptions({ cwd: "/repo", env: { PATH: "/usr/bin" }, deadlineMs: 1234 });
      assert.equal(options.shell, false, "no shell — the argv array is passed element for element");
      assert.deepEqual(options.stdio, ["ignore", "pipe", "pipe"], "stdin is IGNORED (a runner that reads it gets EOF, not a hang) and BOTH streams are piped");
      assert.equal(options.timeout, 1234, "the deadline it was RESOLVED with is the one enforced");
      assert.equal(options.killSignal, "SIGKILL", "…and it force-kills");
      assert.equal(options.cwd, "/repo", "the child runs at the workspace root");
      assert.ok(Number.isFinite(options.maxBuffer) && options.maxBuffer > 0, "the capture is bounded too — an unbounded buffer is a second unbounded resource");

      // THE ONE VARIABLE AOF CONTRIBUTES. The ambient environment is inherited and the
      // declared one is overlaid; what §2 forbids is aof INVENTING a variable the project
      // did not ask for, and there is exactly one, ADR-003 §5's stamp.
      const ambient = { PATH: "/usr/bin", HOME: "/home/u" };
      const child = rubricChildEnv(ambient, { DECLARED: "yes", PATH: "/opt/bin" });
      assert.equal(child.HOME, "/home/u", "the ambient environment is inherited");
      assert.equal(child.PATH, "/opt/bin", "the declared value overrides an ambient one of the same name");
      assert.equal(child.DECLARED, "yes", "the declared environment reaches the child");
      const contributed = Object.keys(child).filter((name) => !(name in ambient) && name !== "DECLARED");
      assert.deepEqual(contributed, [GRADE_REENTRANCY_ENV], "exactly one variable is aof's own");
    },
  },

  {
    name: "arch/FF-5406 the deadline is RESOLVED through 69's single home, and the grade path declares none of its own",
    run: async () => {
      // 54 ENFORCES A BOUND AND CHOOSES NONE (`53/ADR-009` §1). A literal here would be a
      // rival home for `69/ADR-002`'s `startToClose`, and `acd-loop-cap-single-home` plus
      // 69/ADR-001's non-annexation rule are the authority it would be breaking.
      const code = stripComments(await readFile(path.join(repoRoot, "src", "commands", "grade.mjs"), "utf8"));
      // 81/00 — THE GUARD THAT PINNED THE OLD RESOLVER BY NAME NOW PINS THE NEW ONE. The
      // deadline is `min(startToClose, heartbeat)`, DERIVED in the same single home, so the
      // property this rung protects is unchanged and only the name it protects moved.
      assert.match(code, /import \{ gradeDeadlineFromConfig \} from "(?:\.\.?\/)+loop-bounds\.mjs"/, "the deadline is resolved through 69/ADR-001's home");
      assert.ok(!code.includes("startToCloseFromConfig"), "…and the grade path no longer resolves the unclamped bound it used to");
      assert.ok(!/\btimeout\s*[:=]\s*\d/.test(code), "the grade path hard-codes no timeout value");
      assert.ok(!/\b\d{5,}\b/.test(code.replace(/MAX_CAPTURE_BYTES[\s\S]{0,60}/, "")), "…and carries no bare millisecond literal");
      // NEITHER KEY IS READ BEHIND ITS RESOLVER'S BACK. The derivation reads two knobs, so
      // both names are refused here, not just the one the old deadline used.
      assert.ok(!code.includes("work.loop.startToCloseMs"), "…and does not re-read 69's start-to-close key behind its resolver's back");
      assert.ok(!code.includes("work.loop.heartbeatMs"), "…nor its heartbeat key");
    },
  },
];
