import { fsTempHygieneTests } from "./fs-temp-hygiene.suite.mjs";
import { awakeClockTests } from "./awake-clock.suite.mjs";
import { fsJsonFormatTests } from "./fs-json-format.suite.mjs";

export const tests = [
  ...fsTempHygieneTests,
  ...awakeClockTests,
  ...fsJsonFormatTests,
];
