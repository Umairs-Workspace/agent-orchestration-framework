import { capabilityRecallSurfacesTests } from "./capability-recall-surfaces.suite.mjs";
import { memoryRetrievalTests } from "./memory-retrieval.suite.mjs";

export const tests = [
  ...capabilityRecallSurfacesTests,
  ...memoryRetrievalTests,
];
