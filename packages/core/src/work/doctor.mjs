// Compatibility entry; construction belongs to core application assembly.
import { workDoctor } from "../application/default.mjs";
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
} = workDoctor;
