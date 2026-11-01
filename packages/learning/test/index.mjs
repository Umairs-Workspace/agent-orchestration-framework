import { modeTests } from "./mode.suite.mjs";
import { teachFrameTests } from "./teach-frame.suite.mjs";
import { teachGuideTests } from "./teach-guide.suite.mjs";

export const tests = [
  ...modeTests,
  ...teachFrameTests,
  ...teachGuideTests,
];
