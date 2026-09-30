// Compatibility entry; construction belongs to core application assembly.
import { workTestSelect } from "../application/default.mjs";
export const {
  CHANGED_SET_EMPTY,
  CHANGED_SET_UNREADABLE,
  SELECTION_SCOPES,
  SINCE_REV_UNRESOLVABLE,
  WIDENING_REASONS,
  isSuiteFile,
  registrationReport,
  selectSuites,
  wideningRuleProblems,
} = workTestSelect;
