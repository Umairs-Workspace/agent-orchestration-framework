// THE ARCH/DIAGRAMS CONTROLS — this directory's index, and the ONE place its membership is written
// down (119/03, ADR-010). A new control here is one import and one spread IN THIS FILE, and
// `scripts/test.mjs` is unchanged by its arrival. Membership is IMPORTED AND SPREAD, never derived.

// milestone 133 / story 01 — FF-13301 (the generator is named once) and FF-13302 (the layout has
// one home).
import { archTests as acdDiagramGeneratorNamedOnceTests } from "./acd-diagram-generator-named-once.test.mjs";
import { archTests as acdDiagramLayoutSingleHomeTests } from "./acd-diagram-layout-single-home.test.mjs";
// milestone 133 / story 02 — FF-13303 (export needs no Playwright and forms one argv).
import { archTests as acdDiagramExportNoPlaywrightTests } from "./acd-diagram-export-no-playwright.test.mjs";
// milestone 170 / ADR-001 — FF-17001 (diagramming is its own package, depended on one way).
import { archTests as acdDiagramsPackageOneWayTests } from "./acd-diagrams-package-one-way.test.mjs";
// milestone 171 / story 00 — FF-17102 (only canvas-anchor.mjs converts scene coordinates to the screen).
import { archTests as acdDiagramCanvasAnchorOneHomeTests } from "./acd-diagram-canvas-anchor-one-home.test.mjs";
// milestone 171 / story 02 — FF-17101 (the face's diagram routes, the stream included, import nothing of the package).
import { archTests as acdDiagramFaceImportsNothingTests } from "./acd-diagram-face-imports-nothing.test.mjs";

export const tests = [
  ...acdDiagramGeneratorNamedOnceTests,
  ...acdDiagramLayoutSingleHomeTests,
  ...acdDiagramExportNoPlaywrightTests,
  ...acdDiagramsPackageOneWayTests,
  ...acdDiagramCanvasAnchorOneHomeTests,
  ...acdDiagramFaceImportsNothingTests,
];
