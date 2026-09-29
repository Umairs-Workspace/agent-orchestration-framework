// Configured diagnostics; remove the legacy path in Plan 06.
export { RENDER_DEADLINE_MS, playwrightCacheRoot, findBrowser, browserArgv, viewBoxSize } from "@aof/execution/svg-rasterizer";
import { createSvgRasterizer } from "@aof/execution/svg-rasterizer";
import { reportDegrade } from "../degrade.mjs";
export const { rasterizeSvg } = createSvgRasterizer({ reportDegrade });
