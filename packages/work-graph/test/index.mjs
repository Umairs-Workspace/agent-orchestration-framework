import { workLoopsChecksTests } from "./work-loops-checks.suite.mjs";
import { loopRecordRenderTests } from "./loop-record-render.suite.mjs";

export const tests = [
  ...workLoopsChecksTests,
  ...loopRecordRenderTests,
];
