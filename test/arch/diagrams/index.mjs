// THE ARCH/DIAGRAMS CONTROLS — this directory's index, and the ONE place its membership is written
// down (119/03, ADR-010). A new control here is one import and one spread IN THIS FILE, and
// `scripts/test.mjs` is unchanged by its arrival. Membership is IMPORTED AND SPREAD, never derived.

// milestone 133 / story 01 — FF-13301 (the generator is named once) and FF-13302 (the layout has
// one home).
import { archTests as acdDiagramGeneratorNamedOnceTests } from "./acd-diagram-generator-named-once.test.mjs";
import { archTests as acdDiagramLayoutSingleHomeTests } from "./acd-diagram-layout-single-home.test.mjs";
// milestone 133 / story 02 — FF-13303 (export needs no Playwright and forms one argv).
import { archTests as acdDiagramExportNoPlaywrightTests } from "./acd-diagram-export-no-playwright.test.mjs";

export const tests = [
  ...acdDiagramGeneratorNamedOnceTests,
  ...acdDiagramLayoutSingleHomeTests,
  ...acdDiagramExportNoPlaywrightTests,
];
