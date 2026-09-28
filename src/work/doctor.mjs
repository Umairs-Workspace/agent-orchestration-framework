// Transitional core composition for work-owned doctor services.
import { createWorkDoctor } from "@aof/work/doctor";
import { projectExecution } from "../loop-record.mjs";
import { readRuns } from "../run-store.mjs";
import { diagramsGroup } from "./doctor-diagrams.mjs";

export const {
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
