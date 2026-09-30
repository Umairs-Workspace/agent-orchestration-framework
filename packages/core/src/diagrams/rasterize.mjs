// Compatibility entry; construction belongs to core application assembly.
import { diagramsRasterize } from "../application/default.mjs";
export const {
  RENDER_DEADLINE_MS,
  playwrightCacheRoot,
  findBrowser,
  browserArgv,
  viewBoxSize,
  rasterizeSvg,
} = diagramsRasterize;
