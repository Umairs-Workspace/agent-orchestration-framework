import { tokensTests } from "./tokens.suite.mjs";
import { checkTests } from "./check.suite.mjs";
import { configTests } from "./config.suite.mjs";
import { practiceTests } from "./practice.suite.mjs";

export const tests = [
  ...tokensTests,
  ...checkTests,
  ...configTests,
  ...practiceTests,
];
