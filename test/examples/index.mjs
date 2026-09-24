// THE EXAMPLE-MAP SUITES — this directory's index, and the ONE place its membership is written down
// (119/03, ADR-010). A new suite here is one import and one spread IN THIS FILE, and
// `scripts/test.mjs` is unchanged by its arrival. Membership is IMPORTED AND SPREAD, never derived.

// milestone 134 / story 02 — the map's closed grammar, its queries and its token (tasks 00-01), and
// the `work.examples.enabled` gate (task 02).
import { exampleMapParseTests } from "./example-map-parse.test.mjs";
import { examplesConfigGateTests } from "./examples-config-gate.test.mjs";

export const tests = [
  ...exampleMapParseTests,
  ...examplesConfigGateTests,
];
