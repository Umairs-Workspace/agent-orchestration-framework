// Compatibility entry; construction belongs to core application assembly.
import { sync } from "./application/default.mjs";
export const {
  createSyncPlan,
  executeSyncPlan,
} = sync;
