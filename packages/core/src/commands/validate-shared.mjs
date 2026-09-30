// Compatibility entry; construction belongs to core application assembly.
import { commandsValidateShared } from "../application/default.mjs";
export const {
  buildProjectValidationReport,
  buildGlobalValidationReport,
  adapterWarningLines,
  renderValidationReport,
  VALIDATE_FLAGS,
} = commandsValidateShared;
