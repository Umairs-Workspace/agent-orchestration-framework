// Compatibility entry; construction belongs to core application assembly.
import { memoryGraphifyBackend } from "../application/default.mjs";
export default memoryGraphifyBackend.default;
export const {
  GRAPHIFY_INDEX_VERSION,
  workGraphRoot,
  GRAPHIFY_EXTRACTION_BACKEND,
  GRAPHIFY_EXTRACTION_EGRESS,
  graphifyIndexPath,
  GRAPH_SIGNAL_RANKED,
  GRAPH_SIGNAL_UNAVAILABLE,
  GRAPH_STATE_BUILT,
  GRAPH_STATE_BINARY_ABSENT,
  GRAPH_STATE_NOT_BUILT,
  rerank,
  applyScope,
} = memoryGraphifyBackend;
