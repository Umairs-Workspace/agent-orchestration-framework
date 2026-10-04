import { exampleMapParseTests } from "./example-map-parse.suite.mjs";
import { packageSeamsTests } from "./package-seams.suite.mjs";
import { exampleTraceTests } from "./example-trace.suite.mjs";

export const tests = [
  ...exampleMapParseTests,
  ...packageSeamsTests,
  ...exampleTraceTests,
];
