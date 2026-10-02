import { notionProjectionPlanTests } from "./notion-projection-plan.suite.mjs";
import { notionStatusMapSkipTests } from "./notion-status-map-skip.suite.mjs";
import { notionMappingSidecarTests } from "./notion-mapping-sidecar.suite.mjs";
import { integrationsMultiboardSidecarTests } from "./integrations-multiboard-sidecar.suite.mjs";

export const tests = [
  ...notionProjectionPlanTests,
  ...notionStatusMapSkipTests,
  ...notionMappingSidecarTests,
  ...integrationsMultiboardSidecarTests,
];
