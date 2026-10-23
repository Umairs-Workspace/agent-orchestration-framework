// THE @aof/integration-hyperagent SUITES — this package's index, and the ONE place its membership is
// written down (119/03, ADR-010): a new suite is one import and one spread in this file.
import { hyperagentPackageTests } from "./hyperagent.suite.mjs";

export const tests = [
  ...hyperagentPackageTests,
];
