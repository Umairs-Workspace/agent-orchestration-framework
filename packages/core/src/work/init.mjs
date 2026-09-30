// Compatibility entry; construction belongs to core application assembly.
import { workInit } from "../application/default.mjs";
export const {
  workLockPath,
  initWork,
  DEFAULT_MEMORY_BACKEND,
  TAG_GROUPS,
  WORK_INTAKE_CONFIG_PATH,
  initConfig,
} = workInit;
