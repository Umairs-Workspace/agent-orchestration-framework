import { notionProjectionPlanTests } from "./notion-projection-plan.suite.mjs";
import { notionStatusMapSkipTests } from "./notion-status-map-skip.suite.mjs";

export const tests = [
  ...notionProjectionPlanTests,
  ...notionStatusMapSkipTests,
];
