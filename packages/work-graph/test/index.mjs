import { workLoopsChecksTests } from "./work-loops-checks.suite.mjs";
import { loopRecordRenderTests } from "./loop-record-render.suite.mjs";
import { workCountersTests } from "./work-counters.suite.mjs";

export const tests = [
  ...workLoopsChecksTests,
  ...loopRecordRenderTests,
  ...workCountersTests,
];
