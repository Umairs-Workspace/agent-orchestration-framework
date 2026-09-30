// Compatibility entry; construction belongs to core application assembly.
import { defaultSessionHooks } from "../application/default-session-hooks.mjs";
export const aofHome = defaultSessionHooks.meshStore.aofHome;
export const meshDir = defaultSessionHooks.meshStore.meshDir;
export const nodeRecordPath = defaultSessionHooks.meshStore.nodeRecordPath;
export const presenceRecordPath = defaultSessionHooks.meshStore.presenceRecordPath;
export const publishNodeRecord = defaultSessionHooks.meshStore.publishNodeRecord;
export const readNodeRecord = defaultSessionHooks.meshStore.readNodeRecord;
export const readNodeRecords = defaultSessionHooks.meshStore.readNodeRecords;
export { runsDir, runRecordPath, runNodeRecordPath } from "../run-store.mjs";
