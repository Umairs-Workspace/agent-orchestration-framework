// THE GOLDEN SUITES — this directory's index, and the ONE place its membership is written down
// (119/03, ADR-010). A new suite here is one import and one spread IN THIS FILE.
//
// milestone 203 / story 00 — the harness every golden lane runs on, proven on a fixture verb:
// a verb run isolated in a temp project and home, the closed normaliser, a baseline stored as a
// delta from a named base, drift reported as a diff per file, and only `scripts/golden.mjs
// --update` writing (203/ADR-001 to ADR-004).
import { goldenHarnessTests } from "./golden-harness.test.mjs";
// milestone 203 / story 01 — the `work-init` lane: eight init scenarios held to committed baselines
// (`default` whole, the rest as deltas over it), and the render run twice to the same bytes
// (203/ADR-005, ADR-002 §5).
import { workInitTests } from "./work-init.test.mjs";
// milestone 203 / story 02 — the `work-update` lane: update on every init scenario's own output
// changes nothing, a customised update keeps the user's edit, and an older tree rebuilt from the
// committed baseline upgrades to exactly the expected changes (203/ADR-006).
import { workUpdateTests } from "./work-update.test.mjs";

export const tests = [
  ...goldenHarnessTests,
  ...workInitTests,
  ...workUpdateTests,
];
