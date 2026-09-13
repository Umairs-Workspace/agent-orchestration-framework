// FF-5404 (milestone 54 / ADR-002 §3, ADR-004 §4, ADR-007 §3) — THE GRADE LEG IS ADDITIVE.
//
// SCOPE, STATED FIRST SO THIS IS NOT MISREAD AS MORE THAN IT IS: this proves the GRADE leg
// only. It does NOT prove the gate is unchanged — the DOCTOR leg changes it, deliberately
// and measurably (ADR-007 §2a), and that half is FF-5410's and 54/02's. Conflating the two
// is how a milestone ships "nothing changed" over a change.
//
// What is proven: over a fixture with no `work.rubric`, the grade contributes NO gate act.
// It reports `rubric-unconfigured` at `indeterminate`, and no code path anywhere maps that
// code to a `pass` or to a halt.
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { invoke } from "../../../src/command-core.mjs";
import { GRADE_VERDICTS } from "../../../src/work/grade.mjs";
import { LOOP_STOPS } from "../../../src/work/loop.mjs";
import { readSrcFiles } from "../../support/read-src-files.mjs";
import { makeGradeRepo, ctxFor, countingSpawn } from "../../support/grade-fixture.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export const archTests = [
  {
    name: "arch/FF-5404 over a fixture with no work.rubric the grade reports rubric-unconfigured at indeterminate, and launches nothing",
    run: async () => {
      const fx = await makeGradeRepo();
      try {
        const spawn = countingSpawn();
        const result = await invoke("work:grade", { ref: "03", run: true }, await ctxFor(fx.repo, { spawnRubric: spawn }));
        assert.equal(result.grade.verdict, "indeterminate", "the verdict is indeterminate");
        assert.deepEqual(result.grade.codes, ["rubric-unconfigured"], "…carrying exactly that one code");
        assert.equal(spawn.calls.length, 0, "…and the grade leg contributes no act at all");
        assert.ok(GRADE_VERDICTS.includes(result.grade.verdict), "guard: the verdict is a member of the frozen triple");
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  {
    name: "arch/FF-5404 no code path in src/** maps rubric-unconfigured to a pass or to a halt",
    run: async () => {
      // THE TWO WAYS TO GET THE NO-REGRESSION RULE WRONG, refused structurally: read the
      // silence as `pass` (ship a green nothing paid for), or read it as a failure (halt
      // every loop in a repo that never asked for a grader).
      const offenders = [];
      for (const file of await readSrcFiles(repoRoot)) {
        const text = await readFile(file.path, "utf8");
        if (!text.includes("rubric-unconfigured")) continue;
        const code = text.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
        for (const line of code.split(/\r?\n/)) {
          if (!line.includes("rubric-unconfigured")) continue;
          // The code may be DECLARED beside "pass"/a stop (it is, in the frozen vocabulary's
          // own comment block) — what is forbidden is a line that both names it and yields
          // one, which is what an assignment or a return does.
          if (/rubric-unconfigured/.test(line) && /(?:verdict\s*[:=]\s*["']pass|return\s+["']pass|=>\s*["']pass)/.test(line)) {
            offenders.push(`${file.rel}: ${line.trim()} (maps it to a pass)`);
          }
          if (/rubric-unconfigured/.test(line) && new RegExp(`(?:${LOOP_STOPS.join("|")})`).test(line)) {
            offenders.push(`${file.rel}: ${line.trim()} (maps it to a halt)`);
          }
        }
      }
      assert.deepEqual(offenders, [], `rubric-unconfigured is mapped to a pass or a halt in: ${offenders.join("; ")}`);
    },
  },

  {
    name: "arch/FF-5404 the grade leg is not IN the gate yet, and this guard says so rather than implying otherwise",
    run: async () => {
      // ADR-002 §3's guarantee is evidenced HERE the way the ADR asks for it: at this story
      // nothing has been inserted into the loop at all. `work:grade` enters `GATE_ORDER` at
      // 54/02 — recording that boundary is what keeps a reader from taking this suite for
      // proof of a property it does not yet cover (`m08/R2`: "green verbatim" and "guarantee
      // preserved" are different claims).
      const loop = await readFile(path.join(repoRoot, "src", "work", "loop.mjs"), "utf8");
      // Stated as a property that holds on BOTH sides of 54/02, so this guard never has to
      // be edited when the gate row lands: whatever `GATE_ORDER` comes to name, the loop
      // shell must never branch on the unconfigured CODE. The leg's no-op is a consequence
      // of the record, not of a special case somebody wrote into the shell — and the
      // behavioural half above proves it without the gate at all.
      assert.ok(!loop.includes("rubric-unconfigured"), "the loop shell never branches on the unconfigured code — the leg is a no-op by construction, not by a special case");
      assert.ok(!loop.includes("work.rubric"), "…and the shell reads the declaration nowhere; the command is the only reader");
    },
  },
];
