// THE MESH/BUDGET SUITES — this directory's index, and the ONE place its membership is written
// down (119/03, ADR-010). A new suite here is one import and one spread IN THIS FILE.

// milestone 167 / story 04 — the daemon budget soak (ADR-007): the real `mesh serve --serve` and
// `mesh ui` over a generated tree as large as aof's, with the motivating faults planted and a
// viewer polling, judged against DAEMON_BUDGET. About 90 s, one unit in the sharded gate.
import { daemonBudgetSoakTests } from "./daemon-budget-soak.test.mjs";

export const tests = [
  ...daemonBudgetSoakTests,
];
