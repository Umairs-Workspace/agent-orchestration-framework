import { capabilityRecallSurfacesTests } from "./capability-recall-surfaces.suite.mjs";
import { memoryRetrievalTests } from "./memory-retrieval.suite.mjs";
import { tests as graphImpactTests } from "./graph-impact.suite.mjs";

export const tests = [
  ...capabilityRecallSurfacesTests,
  ...memoryRetrievalTests,
  ...graphImpactTests,
];
