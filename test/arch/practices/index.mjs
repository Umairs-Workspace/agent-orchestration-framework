// THE ARCH/PRACTICES CONTROLS — this directory's index, and the ONE place its membership is written
// down (119/03, ADR-010). A new control here is one import and one spread IN THIS FILE, and
// `scripts/test.mjs` is unchanged by its arrival. Membership is IMPORTED AND SPREAD, never derived.

// milestone 192 / story 00 — FF-19205 (a slot leaves nothing behind), FF-19206 (every fragment lands
// on every runtime) and FF-19207 (a render reads the project's config and nothing else).
import { archTests as acdSlotLeavesNothingBehindTests } from "./acd-slot-leaves-nothing-behind.test.mjs";
import { archTests as acdFragmentLandsOnEveryRuntimeTests } from "./acd-fragment-lands-on-every-runtime.test.mjs";
import { archTests as acdRenderReadsProjectConfigOnlyTests } from "./acd-render-reads-project-config-only.test.mjs";

export const tests = [
  ...acdSlotLeavesNothingBehindTests,
  ...acdFragmentLandsOnEveryRuntimeTests,
  ...acdRenderReadsProjectConfigOnlyTests,
];
