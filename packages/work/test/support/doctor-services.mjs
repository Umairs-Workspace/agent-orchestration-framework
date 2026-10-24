// The work doctor (core's `assembleWorkDoctor` + the `readRenameMap` edge of `assembleCommandsDoctor`,
// packages/core/src/application/bindings/{work/doctor,commands/doctor}.mjs), rebuilt from @aof/work's own
// factories so a doctor suite reaches its subject without the assembled application.
//
// Collaborators owned elsewhere:
//   - `projectExecution` (@aof/work-graph) and `readRuns` (execution's run store) are read only for an item whose
//     folder carries an EXECUTION.md. Fail-on-use: these suites write none.
//   - the diagrams lane is @aof/diagrams' (its package, one way: @aof/work imports nothing of it), reached by the
//     spine through its injected `diagramsGroup` / `diagramListing` seams. Here the engine is built with NOTHING
//     composed in — the empty group and the default null listing — which is what @aof/work alone is. A suite
//     whose subject is the diagrams lane lives beside that package (test/work/doctor-diagrams-lane.test.mjs).
//   - `readRenameMap` needs only `execFileAsync`, which is node's own `execFile`, promisified as the binding does.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createWorkDoctor } from "@aof/work/doctor";
import { createDoctorCommand } from "@aof/work/commands/doctor";

const refuse = (name) => () => {
  throw new Error(`${name} must not be reached: this suite writes no EXECUTION.md`);
};

export function createDoctorServices() {
  const doctor = createWorkDoctor({
    projectExecution: refuse("projectExecution"),
    readRuns: refuse("readRuns"),
    // milestone 135 / ADR-001 §3 — no story probe, no budget rows and no extension lanes; and no
    // diagrams lane: the engine with nothing composed in, which is what @aof/work alone is.
    diagramsGroup: () => [],
  });
  const { readRenameMap } = createDoctorCommand({ execFileAsync: promisify(execFile) });
  return Object.freeze({ ...doctor, readRenameMap });
}
