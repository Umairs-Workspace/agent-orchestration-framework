import { capabilityRecallSurfacesTests } from "./capability-recall-surfaces.suite.mjs";
import { memoryRetrievalTests } from "./memory-retrieval.suite.mjs";
import { scopeFlagsFieldsAgreeTests } from "./scope-flags-fields-agree.suite.mjs";
import { tests as graphImpactTests } from "./graph-impact.suite.mjs";
import { graphifyPostureTests } from "./graphify-posture.suite.mjs";
import { memoryHooksInertTests } from "./memory-hooks-inert.suite.mjs";
import { memoryRecallBlockTests } from "./memory-recall-block.suite.mjs";
import { gapCarriesDischargeTests } from "./gap-carries-discharge.suite.mjs";
// milestone 148 / story 02 — a lesson's meta line and a gap's status, normalised on read; tags under index version 2.
import { memoryMetaNormalisedTests } from "./memory-meta-normalised.suite.mjs";
// milestone 148 / story 03 — every item's RETROSPECTIVE.md is read, so a story's lessons answer to its ref.
import { storyRetrospectivesIndexedTests } from "./story-retrospectives-indexed.suite.mjs";

export const tests = [
  ...capabilityRecallSurfacesTests,
  ...memoryRetrievalTests,
  ...scopeFlagsFieldsAgreeTests,
  ...graphImpactTests,
  ...graphifyPostureTests,
  ...memoryHooksInertTests,
  ...memoryRecallBlockTests,
  ...gapCarriesDischargeTests,
  ...memoryMetaNormalisedTests,
  ...storyRetrospectivesIndexedTests,
];
