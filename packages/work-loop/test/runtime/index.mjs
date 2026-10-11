import { runtimePhaseTests } from "./phases.suite.mjs";
import { runtimeAskTests } from "./asks.suite.mjs";

export const tests = [
  ...runtimePhaseTests,
  ...runtimeAskTests,
];
