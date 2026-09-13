// FF-5401 (milestone 54 / ADR-002) — AOF NEVER BECOMES THE TEST RUNNER.
//
// The whole milestone rests on one line: aof RUNS a rubric the project declared, in a CHILD
// PROCESS, and is never itself the thing that executes the suite. The failure mode this
// guards is not hypothetical — it is the cheap next step a later edit takes: "we already
// have the test array; just import it and count". An `import()` of a project's test file
// RUNS ITS MODULE SCOPE, which is aof executing the project's code inside its own process,
// with the project's globals, its ports and its side effects — and with no bound, no capture
// and no report.
//
// `m15/R3` (surfaced at recall) is why the scan is over the WHOLE module family rather than
// over the grade path alone: *a determinism (or any invariant) fitness grep must scan the
// whole module family it governs*. A guard that only read `src/commands/grade.mjs` would
// pass on the day someone put the import in `src/work/loop.mjs` instead.
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readSrcFiles } from "../../support/read-src-files.mjs";
import { readFile } from "node:fs/promises";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// A STATIC import of a runner script or of anything under `test/`.
const STATIC_SUITE_IMPORT = /\bfrom\s+["'][^"']*(?:scripts\/test(?:-unit)?\.mjs|(?:^|\/)test\/[^"']*)["']/;
// A DYNAMIC one — the shape a "just import it and count" edit reaches for first.
const DYNAMIC_SUITE_IMPORT = /\bimport\s*\(\s*[^)]*(?:scripts\/test(?:-unit)?\.mjs|["'`][^"'`]*\/test\/)/;
// A `.test.mjs` path anywhere in an import specifier, however it was assembled.
const TEST_FILE_SPECIFIER = /\bimport\s*\(?[^;\n]*["'`][^"'`]*\.test\.mjs["'`]/;

export const archTests = [
  {
    name: "arch/FF-5401 no module in src/** imports a runner script or anything under test/**",
    run: async () => {
      const offenders = [];
      for (const file of await readSrcFiles(repoRoot)) {
        const text = await readFile(file.path, "utf8");
        // Comments cite these paths constantly (this milestone's own modules do), so a
        // comment naming `scripts/test.mjs` must not be counted as an import of it.
        const code = text.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
        for (const [label, pattern] of [
          ["static import", STATIC_SUITE_IMPORT],
          ["dynamic import", DYNAMIC_SUITE_IMPORT],
          ["a .test.mjs specifier", TEST_FILE_SPECIFIER],
        ]) {
          if (pattern.test(code)) offenders.push(`${file.rel} (${label})`);
        }
      }
      assert.deepEqual(offenders, [], `src/** reaches a test suite by import in: ${offenders.join(", ")}`);
    },
  },

  {
    name: "arch/FF-5401 the ONLY route from src/** to a suite is the declared argv of ADR-004, in a child process",
    run: async () => {
      // One module holds the declared-rubric spawn, and that spawn's program comes from the
      // DECLARATION rather than from a literal aof wrote. A grade path naming a runner
      // script by name would be aof choosing the runner — precisely what ADR-004 §2 forbids.
      const grade = await readFile(path.join(repoRoot, "src", "commands", "grade.mjs"), "utf8");
      const code = grade.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
      assert.ok(!code.includes("scripts/test.mjs"), "the grade path names no runner script of its own");
      assert.ok(!code.includes("node --test"), "…and no runner invocation of its own");
      // The program and its arguments come off the plan, which comes off the declaration.
      assert.match(code, /const \[program, \.\.\.args\] = plan\.command/, "the launched program is the DECLARED argv's own first element");
    },
  },
];
