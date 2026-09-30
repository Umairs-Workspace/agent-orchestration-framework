// Compatibility entry; construction belongs to core application assembly.
import { dsl } from "./application/default.mjs";
export const {
  loadConfig,
  loadProjectConfig,
  resolveConfig,
} = dsl;
