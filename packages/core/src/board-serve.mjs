// Compatibility entry; construction belongs to core application assembly.
import { boardServe } from "./application/default.mjs";
export const {
  boardUiDist,
  boardUiProbe,
  serveBoard,
} = boardServe;
