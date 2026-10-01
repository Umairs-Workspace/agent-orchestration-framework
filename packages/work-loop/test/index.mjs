import { workLoopDeterminismTests } from "./work-loop-determinism.suite.mjs";
import { workLoopGateOrderTests } from "./work-loop-gate-order.suite.mjs";
import { workLoopLevelLadderTests } from "./work-loop-level-ladder.suite.mjs";
import { workLoopReviewBoundTests } from "./work-loop-review-bound.suite.mjs";
import { workLoopScopeGuardTests } from "./work-loop-scope-guard.suite.mjs";
import { workLoopStopSetTests } from "./work-loop-stop-set.suite.mjs";

export const tests = [
  ...workLoopDeterminismTests,
  ...workLoopGateOrderTests,
  ...workLoopLevelLadderTests,
  ...workLoopReviewBoundTests,
  ...workLoopScopeGuardTests,
  ...workLoopStopSetTests,
];
