// THE DIAGRAM SUITES — this directory's index, and the ONE place its membership is written down
// (119/03, ADR-010). A new suite here is one import and one spread IN THIS FILE, and
// `scripts/test.mjs` is unchanged by its arrival. Membership is IMPORTED AND SPREAD, never derived.

// milestone 133 / story 01 — the seam: the layout module (task 01), the generator registry and its
// adapter (task 02), and `aof diagram plan` through the real CLI (task 03).

import { diagramPlanCommandTests } from "./diagram-plan-command.test.mjs";
// milestone 133 / story 02 — export: the browser ladder and the rasterizer (tasks 00-01), and
// `aof diagram export` (task 02).
import { diagramExportCommandTests } from "./diagram-export-command.test.mjs";
// 145 — the loop diagram: `aof diagram plan <ref> loop` (task 01), `aof diagram export <ref> loop`
// (task 02) and the `/aof:loop-diagram` command's prose (task 03).
import { loopDiagramCommandTests } from "./loop-diagram-command.test.mjs";
// 151 — `/aof:add-diagram`: refine's diagram step run after the fact; the command's prose (tasks 01-02).
import { addDiagramCommandTests } from "./add-diagram-command.test.mjs";

export const tests = [
  ...diagramPlanCommandTests,
  ...diagramExportCommandTests,
  ...loopDiagramCommandTests,
  ...addDiagramCommandTests,
];
