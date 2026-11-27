import { tokensTests } from "./tokens.suite.mjs";
import { checkTests } from "./check.suite.mjs";
import { configTests } from "./config.suite.mjs";
import { practiceTests } from "./practice.suite.mjs";
import { mocksTests } from "./mocks.suite.mjs";

export const tests = [
  ...tokensTests,
  ...checkTests,
  ...configTests,
  ...practiceTests,
  ...mocksTests,
];
