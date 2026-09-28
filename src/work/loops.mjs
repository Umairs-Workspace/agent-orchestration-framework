// Compatibility export; work-graph owns this implementation.
export { ADMITTED_KEYS, CADENCE_KINDS, EDGE_KEYS, ENDPOINT_SCHEMES, EVENT_TRIGGERS, FIELD_KINDS, GROUND_VALUES, LOADER_FINDING_CODES, NODE_KINDS, PERIODIC_UNITS, POINTER_SCHEMES, SENTINEL_TOKENS, loopPointersIn, parseCadence } from "@aof/work-graph/registry";
import { loadLoops as load } from "@aof/work-graph/registry";
import { assetBase } from "../asset-base.mjs";
export function loadLoops(workspace) {
  return load(workspace, { getFrameworkRoot: () => assetBase("version") });
}
