// Core assembly: construct once per application; collaborators are supplied explicitly.
import { loadLoops as load } from "@aof/work-graph/registry";
import { assetBase } from "../../../asset-base.mjs";
import * as api0 from "@aof/work-graph/registry";

export function assembleWorkLoops({  } = {}) {
  // Core selects the work-graph implementation.

  function loadLoops(workspace) {
    return load(workspace, { getFrameworkRoot: () => assetBase("version") });
  }

  return { "ADMITTED_KEYS": api0.ADMITTED_KEYS, "CADENCE_KINDS": api0.CADENCE_KINDS, "EDGE_KEYS": api0.EDGE_KEYS, "ENDPOINT_SCHEMES": api0.ENDPOINT_SCHEMES, "EVENT_TRIGGERS": api0.EVENT_TRIGGERS, "FIELD_KINDS": api0.FIELD_KINDS, "GROUND_VALUES": api0.GROUND_VALUES, "LOADER_FINDING_CODES": api0.LOADER_FINDING_CODES, "NODE_KINDS": api0.NODE_KINDS, "PERIODIC_UNITS": api0.PERIODIC_UNITS, "POINTER_SCHEMES": api0.POINTER_SCHEMES, "SENTINEL_TOKENS": api0.SENTINEL_TOKENS, "loopPointersIn": api0.loopPointersIn, "parseCadence": api0.parseCadence, loadLoops };
}
