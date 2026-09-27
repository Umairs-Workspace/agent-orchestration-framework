// THE ARCH/TERMINAL CONTROLS — this directory's index, and the ONE place its membership is written
// down (119/03, ADR-010). A new control here is one import and one spread IN THIS FILE, and
// `scripts/test.mjs` is unchanged by its arrival. Membership is IMPORTED AND SPREAD, never derived.

// milestone 138 / story 00 — FF-13801 (the screen has one reader).
import { archTests as acdScreenHasOneReaderTests } from "./acd-screen-has-one-reader.test.mjs";

export const tests = [
  ...acdScreenHasOneReaderTests,
];
