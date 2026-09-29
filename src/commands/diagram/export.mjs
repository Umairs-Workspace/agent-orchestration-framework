// Configured application adapter; assembly moves in Plan 02, removal in Plan 06.
import { createDiagramExportCommand } from "@aof/work/commands/diagram/export";
import { resolveWorkDiagrams } from "../../config-inspect.mjs";
import { generatorFor } from "../../diagrams/generators.mjs";
import { requireLocalCheckout, resolveItemExact } from "../resolve.mjs";
import { findBrowser, rasterizeSvg } from "../../diagrams/rasterize.mjs";
export const { diagramExportCommand } = createDiagramExportCommand({ resolveWorkDiagrams, generatorFor, requireLocalCheckout, resolveItemExact, findBrowser, rasterizeSvg });
