// The work doctor (core's `assembleWorkDoctor` + `assembleWorkDoctorDiagrams` + the `readRenameMap` edge of
// `assembleCommandsDoctor`, packages/core/src/application/bindings/{work/doctor,work/doctor-diagrams,commands/doctor}.mjs),
// rebuilt from @aof/work's own factories so a doctor suite reaches its subject without the assembled application.
//
// Collaborators owned elsewhere:
//   - `projectExecution` (@aof/work-graph) and `readRuns` (execution's run store) are read only for an item whose
//     folder carries an EXECUTION.md. Fail-on-use: these suites write none.
//   - `resolveWorkDiagrams` (core config-inspect) answers what a config owes in diagram exports. The real diagrams
//     group runs here; its resolver is the faithful answer for a config that declares no `work.diagrams` — OFF.
//   - `readRenameMap` needs only `execFileAsync`, which is node's own `execFile`, promisified as the binding does.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createWorkDoctor } from "@aof/work/doctor";
import { createDoctorDiagrams } from "@aof/work/doctor/diagrams";
import { createDoctorExamples } from "@aof/work/doctor/examples";
import { createDoctorCommand } from "@aof/work/commands/doctor";

const refuse = (name) => () => {
  throw new Error(`${name} must not be reached: this suite writes no EXECUTION.md`);
};

const DIAGRAMS_OFF = Object.freeze({ enabled: false, generator: "off", formats: Object.freeze([]) });

export function createDoctorServices() {
  const { diagramsGroup } = createDoctorDiagrams({
    resolveWorkDiagrams: (config) => {
      if (config?.work?.diagrams !== undefined) throw new Error("this stand-in resolves only a config declaring no work.diagrams");
      return DIAGRAMS_OFF;
    },
  });
  // milestone 134 / story 04 — the examples gate stands in OFF, as the diagrams policy does: this
  // suite declares no work.examples, so no map is read and no answer is ever collected.
  const examplesEnabledFromConfig = (config) => {
    if (config?.work?.examples !== undefined) throw new Error("this stand-in resolves only a config declaring no work.examples");
    return false;
  };
  const { examplesGroup } = createDoctorExamples({ examplesEnabledFromConfig });
  const doctor = createWorkDoctor({
    projectExecution: refuse("projectExecution"),
    readRuns: refuse("readRuns"),
    diagramsGroup,
    examplesGroup,
    examplesEnabledFromConfig,
    collectAnswers: refuse("collectAnswers"),
  });
  const { readRenameMap } = createDoctorCommand({ execFileAsync: promisify(execFile) });
  return Object.freeze({ ...doctor, readRenameMap });
}
