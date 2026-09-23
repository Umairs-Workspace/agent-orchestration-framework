// THE DIAGRAM SUITES — this directory's index, and the ONE place its membership is written down
// (119/03, ADR-010). A new suite here is one import and one spread IN THIS FILE, and
// `scripts/test.mjs` is unchanged by its arrival. Membership is IMPORTED AND SPREAD, never derived.

// milestone 133 / story 01 — the seam: the layout module (task 01), the generator registry and its
// adapter (task 02), and `aof diagram plan` through the real CLI (task 03).
import { diagramLayoutTests } from "./diagram-layout.test.mjs";
import { diagramGeneratorTests } from "./diagram-generator.test.mjs";
import { diagramPlanCommandTests } from "./diagram-plan-command.test.mjs";
// milestone 133 / story 02 — export: the browser ladder and the rasterizer (tasks 00-01), and
// `aof diagram export` (task 02).
import { diagramRasterizeTests } from "./diagram-rasterize.test.mjs";
import { diagramExportCommandTests } from "./diagram-export-command.test.mjs";

export const tests = [
  ...diagramLayoutTests,
  ...diagramGeneratorTests,
  ...diagramPlanCommandTests,
  ...diagramRasterizeTests,
  ...diagramExportCommandTests,
];
