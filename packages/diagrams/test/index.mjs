// THE @aof/diagrams SUITES — this package's index, and the ONE place its membership is written down
// (119/03, ADR-010). A new suite here is one import and one spread IN THIS FILE, and
// `scripts/test.mjs` is unchanged by its arrival. Membership is IMPORTED AND SPREAD, never derived.

// milestone 133 / story 01 — the layout module (task 01) and the generator registry and its adapter
// (task 02); moved here with their subjects when diagramming became its own package.
import { diagramLayoutTests } from "./diagram-layout.suite.mjs";
import { diagramGeneratorTests } from "./diagram-generator.suite.mjs";
// The package's own seams: the contribution, the lane factory and the file command through a registry.
import { packageSeamsTests } from "./package-seams.suite.mjs";
// milestone 200 / ADR-006 — the aof Mermaid profile, the one diagram format.
import { mermaidProfileTests } from "./mermaid-profile.suite.mjs";
// milestone 200 / ADR-010 — the stored Excalidraw scene, seen as Mermaid.
import { sceneViewTests } from "./scene-view.suite.mjs";

export const tests = [
  ...diagramLayoutTests,
  ...diagramGeneratorTests,
  ...packageSeamsTests,
  ...mermaidProfileTests,
  ...sceneViewTests,
];
