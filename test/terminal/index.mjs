// THE TERMINAL SUITES — this directory's index, and the ONE place its membership is written down
// (119/03, ADR-010). A new suite here is one import and one spread IN THIS FILE, and
// `scripts/test.mjs` is unchanged by its arrival. Membership is IMPORTED AND SPREAD, never derived.

// milestone 138 / story 00 — the model (task 02), readiness on the input box (task 03), every
// verdict acted on (task 04) and the screen at every stop (task 05).
import { screenModelTests } from "./screen-model.test.mjs";
import { sessionScreenReadyTests } from "./session-screen-ready.test.mjs";
import { sessionScreenVerdictsTests } from "./session-screen-verdicts.test.mjs";
import { sessionScreenEvidenceTests } from "./session-screen-evidence.test.mjs";
// milestone 138 / story 01 — the six v1 screens (task 01), and trust navigated to, the rest stopped
// by name (task 02).
import { claudeScreensRegistryTests } from "./claude-screens-registry.test.mjs";

export const tests = [
  ...screenModelTests,
  ...sessionScreenReadyTests,
  ...sessionScreenVerdictsTests,
  ...sessionScreenEvidenceTests,
  ...claudeScreensRegistryTests,
];
