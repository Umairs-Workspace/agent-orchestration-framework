// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createWorkDoctor } from "@aof/work/doctor";
import { projectExecution } from "@aof/work-graph/record";

export function assembleWorkDoctor({ runStoreServices, workDoctorDiagramsServices }) {
  // Core composition for work-owned doctor services.

  const { readRuns } = runStoreServices;
  const { diagramsGroup } = workDoctorDiagramsServices;

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
  } = createWorkDoctor({ projectExecution, readRuns, diagramsGroup });

  return { CHECK_GROUPS, CONVENTION_DOCS, budgetsFromConfig, buildSnapshot, doctorWork, duplicateDriverNumberGroup, inScope, isDependTarget, isDriver, orphanFolderGroup, siblingDependencyNumber, staleWindowFromConfig };
}
