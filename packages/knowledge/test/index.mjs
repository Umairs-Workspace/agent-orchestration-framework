import { capabilityRecallSurfacesTests } from "./capability-recall-surfaces.suite.mjs";
import { memoryRetrievalTests } from "./memory-retrieval.suite.mjs";
import { scopeFlagsFieldsAgreeTests } from "./scope-flags-fields-agree.suite.mjs";
import { tests as graphImpactTests } from "./graph-impact.suite.mjs";

export const tests = [
  ...capabilityRecallSurfacesTests,
  ...memoryRetrievalTests,
  ...scopeFlagsFieldsAgreeTests,
  ...graphImpactTests,
];
