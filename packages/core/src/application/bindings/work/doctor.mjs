// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createWorkDoctor } from "@aof/work/doctor";
import { projectExecution } from "@aof/work-graph/record";
import { createExamplesStoryProbe, EXAMPLES_BUDGET_ROWS } from "@aof/specification-by-example/story-probe";

export function assembleWorkDoctor({ runStoreServices, workDoctorDiagramsServices, workDoctorExamplesServices, configInspectServices, provideWorkExamplesAnswers }) {
  // Core composition for work-owned doctor services.

  const { readRuns } = runStoreServices;
  const { diagramsGroup } = workDoctorDiagramsServices;
  const { examplesGroup } = workDoctorExamplesServices;
  const { examplesEnabledFromConfig } = configInspectServices;
  // Deferred: the answers collector is assembled after the doctor; the probe calls it only at run time.
  const collectAnswers = async (...args) => (await provideWorkExamplesAnswers()).collectAnswers(...args);
  // 135/ADR-001 §3 — specification by example composed into the engine's three neutral seams.
  const { storyProbe } = createExamplesStoryProbe({ examplesEnabledFromConfig, collectAnswers });

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
  } = createWorkDoctor({ projectExecution, readRuns, diagramsGroup, storyProbe, budgetRows: EXAMPLES_BUDGET_ROWS, extensionGroups: [examplesGroup] });

  return { CHECK_GROUPS, CONVENTION_DOCS, budgetsFromConfig, buildSnapshot, doctorWork, duplicateDriverNumberGroup, inScope, isDependTarget, isDriver, orphanFolderGroup, siblingDependencyNumber, staleWindowFromConfig };
}
