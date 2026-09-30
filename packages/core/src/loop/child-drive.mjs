// Compatibility entry; construction belongs to core application assembly.
import { loopChildDrive } from "../application/default.mjs";
export const {
  LANE_CANCEL_GRACE_MS,
  loopFixFilePath,
  childDriveOutcome,
  spawnLaneDrive,
} = loopChildDrive;
