// Compatibility entry; construction belongs to core application assembly.
import { defaultFoundation } from "./application/default-foundation.mjs";
export const setDegradeSinkForTest = defaultFoundation.degrade.setDegradeSinkForTest;
export const reportDegrade = defaultFoundation.degrade.reportDegrade;
