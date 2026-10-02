// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createWorkDoctor } from "@aof/work/doctor";
import { projectExecution } from "@aof/work-graph/record";

export function assembleWorkDoctor({ runStoreServices, workDoctorDiagramsServices, workDoctorExamplesServices, configInspectServices, provideWorkExamplesAnswers }) {
  // Core composition for work-owned doctor services.

  const { readRuns } = runStoreServices;
  const { diagramsGroup } = workDoctorDiagramsServices;
  const { examplesGroup } = workDoctorExamplesServices;
  const { examplesEnabledFromConfig } = configInspectServices;
  // Deferred: the answers collector is assembled after the doctor; the probe calls it only at run time.
  const collectAnswers = async (...args) => (await provideWorkExamplesAnswers()).collectAnswers(...args);

  const {
    CHECK_GROUPS,
    CONVENTION_DOCS,
    budgetsFromConfig,
    buildSnapshot,
    doctorWork,
    duplicateDriverNumberGroup,
    inScope,
    isDependTarget,
    isDriver,
    orphanFolderGroup,
    siblingDependencyNumber,
    staleWindowFromConfig,
  } = createWorkDoctor({ projectExecution, readRuns, diagramsGroup, examplesGroup, examplesEnabledFromConfig, collectAnswers });

  return { CHECK_GROUPS, CONVENTION_DOCS, budgetsFromConfig, buildSnapshot, doctorWork, duplicateDriverNumberGroup, inScope, isDependTarget, isDriver, orphanFolderGroup, siblingDependencyNumber, staleWindowFromConfig };
}
