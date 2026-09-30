// Compatibility entry; construction belongs to core application assembly.
import { commandsMeshDesktopPreflight } from "../../application/default.mjs";
export const {
  PREFLIGHT_CHECKS,
  HEARTBEAT_HOOK_ID,
  defaultRunner,
  PREFLIGHT_SEAMS,
  preflightSeams,
  runPreflight,
  renderPreflight,
} = commandsMeshDesktopPreflight;
