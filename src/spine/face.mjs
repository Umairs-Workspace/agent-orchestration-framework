// CLI entry adapter for the process default application.
import { spineFace } from "../application/default.mjs";
export const {
  BASE_FLAGS,
  parseSpecArgv,
  deriveRouteTable,
  resolveRoute,
  runCommandFace,
} = spineFace;
