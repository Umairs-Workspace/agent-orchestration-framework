import { capabilityRecallSurfacesTests } from "./capability-recall-surfaces.suite.mjs";
import { memoryRetrievalTests } from "./memory-retrieval.suite.mjs";
import { scopeFlagsFieldsAgreeTests } from "./scope-flags-fields-agree.suite.mjs";
import { tests as graphImpactTests } from "./graph-impact.suite.mjs";
import { graphifyPostureTests } from "./graphify-posture.suite.mjs";
import { memoryHooksInertTests } from "./memory-hooks-inert.suite.mjs";
import { memoryRecallBlockTests } from "./memory-recall-block.suite.mjs";
import { gapCarriesDischargeTests } from "./gap-carries-discharge.suite.mjs";

export const tests = [
  ...capabilityRecallSurfacesTests,
  ...memoryRetrievalTests,
  ...scopeFlagsFieldsAgreeTests,
  ...graphImpactTests,
  ...graphifyPostureTests,
  ...memoryHooksInertTests,
  ...memoryRecallBlockTests,
  ...gapCarriesDischargeTests,
];
