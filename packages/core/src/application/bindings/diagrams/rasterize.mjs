// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createSvgRasterizer } from "@aof/execution/svg-rasterizer";
import * as api0 from "@aof/execution/svg-rasterizer";

export function assembleDiagramsRasterize({ degradeServices }) {
  // Configured diagnostics; remove the legacy path in Plan 06.

  const { reportDegrade } = degradeServices;
  // 198/02 Q7 — the page entry rides with the SVG one: `aof design-system mocks capture` frames an
  // imported board through it, handed to the practice's verbs by the command core.
  const { rasterizeSvg, rasterizePage } = createSvgRasterizer({ reportDegrade });

  return { "RENDER_DEADLINE_MS": api0.RENDER_DEADLINE_MS, "playwrightCacheRoot": api0.playwrightCacheRoot, "findBrowser": api0.findBrowser, "browserArgv": api0.browserArgv, "viewBoxSize": api0.viewBoxSize, rasterizeSvg, rasterizePage };
}
