// THE EXAMPLE-MAP SUITES — this directory's index, and the ONE place its membership is written down
// (119/03, ADR-010). A new suite here is one import and one spread IN THIS FILE, and
// `scripts/test.mjs` is unchanged by its arrival. Membership is IMPORTED AND SPREAD, never derived.

// milestone 134 / story 02 — the map's closed grammar, its queries and its token (tasks 00-01), and
// the `work.examples.enabled` gate (task 02).
import { examplesConfigGateTests } from "./examples-config-gate.test.mjs";
// milestone 134 / story 03 — the one reader of a person's answer, its stamp at settle, and the
// settle reading the transcript store that exists (tasks 00-02).
import { exampleAnswersTests } from "./example-answers.test.mjs";
// milestone 134 / story 04 — the examples doctor lane and its snapshot probe (tasks 00-01), and the
// continue door that refuses a story while a business question stands (task 02).
import { doctorExamplesLaneTests } from "./doctor-examples-lane.test.mjs";
import { continueDoorExamplesTests } from "./continue-door-examples.test.mjs";

export const tests = [
  ...examplesConfigGateTests,
  ...exampleAnswersTests,
  ...doctorExamplesLaneTests,
  ...continueDoorExamplesTests,
];
