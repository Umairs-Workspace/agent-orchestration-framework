// Compatibility entry; construction belongs to core application assembly.
import { workLoops } from "../application/default.mjs";
export const {
  ADMITTED_KEYS,
  CADENCE_KINDS,
  EDGE_KEYS,
  ENDPOINT_SCHEMES,
  EVENT_TRIGGERS,
  FIELD_KINDS,
  GROUND_VALUES,
  LOADER_FINDING_CODES,
  NODE_KINDS,
  PERIODIC_UNITS,
  POINTER_SCHEMES,
  SENTINEL_TOKENS,
  loopPointersIn,
  parseCadence,
  loadLoops,
} = workLoops;
