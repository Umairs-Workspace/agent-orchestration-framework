import { sessionModelTests } from "./session-model.suite.mjs";
import { runtimeSessionTests } from "./runtime-session.suite.mjs";
import { runtimeSelectionTests } from "./runtime-selection.suite.mjs";
import { diagramRasterizeTests } from "./diagram-rasterize.suite.mjs";
import { terminalSessionsTests } from "./terminal-sessions.suite.mjs";
import { runFailureClassificationTests } from "./run-failure-classification.suite.mjs";
import { runNodePartitionTests } from "./run-node-partition.suite.mjs";
import { runRetryLineageTests } from "./run-retry-lineage.suite.mjs";
import { runStoreDerivedLogTests } from "./run-store-derived-log.suite.mjs";
import { runStoreSpendTests } from "./run-store-spend.suite.mjs";
import { runStoreStateMachineTests } from "./run-store-state-machine.suite.mjs";

export const tests = [
  ...runtimeSessionTests,
  ...runtimeSelectionTests,
  ...sessionModelTests,
  ...diagramRasterizeTests,
  ...terminalSessionsTests,
  ...runFailureClassificationTests,
  ...runNodePartitionTests,
  ...runRetryLineageTests,
  ...runStoreDerivedLogTests,
  ...runStoreSpendTests,
  ...runStoreStateMachineTests,
];
