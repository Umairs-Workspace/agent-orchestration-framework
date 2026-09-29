// Configured application adapter; assembly moves in Plan 02, removal in Plan 06.
import { createDiagramPlanCommand } from "@aof/work/commands/diagram/plan";
import { resolveWorkDiagrams } from "../../config-inspect.mjs";
import { generatorFor } from "../../diagrams/generators.mjs";
import { requireLocalCheckout, resolveItemExact } from "../resolve.mjs";

export const { diagramPlanCommand } = createDiagramPlanCommand({ resolveWorkDiagrams, generatorFor, requireLocalCheckout, resolveItemExact });
