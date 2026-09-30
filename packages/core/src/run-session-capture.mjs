// Compatibility entry; construction belongs to core application assembly.
import { runSessionCapture } from "./application/default.mjs";
export const {
  captureSessionIdOnRecord,
} = runSessionCapture;
