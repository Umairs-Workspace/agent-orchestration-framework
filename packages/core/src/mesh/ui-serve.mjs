// Compatibility entry; construction belongs to core application assembly.
import { meshUiServe } from "../application/default.mjs";
export const {
  DEFAULT_MESH_UI_PORT,
  meshUiDist,
  meshUiProbe,
  MAX_TERMINAL_INPUT_BYTES,
  serveMeshUi,
} = meshUiServe;
