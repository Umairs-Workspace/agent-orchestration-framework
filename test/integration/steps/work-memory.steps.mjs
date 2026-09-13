// Steps for work-memory.feature (story 128). Everything the feature needs is the
// shared grammar — the point the command-spine steps make, made again for the
// memory door: a migrated verb's contract is expressible in common steps, so
// migrating a command costs a scenario, not a bespoke harness. This module exists
// because the runner resolves steps BY CONVENTION from the feature's basename
// (`features/<name>.feature` ↔ `steps/<name>.steps.mjs`, test/integration/cli.mjs),
// not because any step here is new.
import { createStepRegistry } from "../support/step-registry.mjs";
import { registerCommonSteps } from "../support/common-steps.mjs";

const registry = createStepRegistry();
registerCommonSteps(registry);

export async function runStep(context, step) {
  await registry.run(context, step);
}
