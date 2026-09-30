// Compatibility entry; construction belongs to core application assembly.
import { workTestChanged } from "../application/default.mjs";
export const {
  CHANGED_SET_DEADLINE_MS,
  changedFiles,
  parseNameOnly,
  parsePorcelain,
} = workTestChanged;
