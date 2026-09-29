// Transitional core composition for work-owned run-retry commands.
import { createRunRetryCommand } from "@aof/work/commands/run-retry";
import { resolveItemExact, requireLocalCheckout } from "./resolve.mjs";
import { transitionRunStart } from "../effects/run-transitions.mjs";
import { meshNodeIdOf } from "./mesh/gate.mjs";
import { lockContextFor } from "../item-lock.mjs";

export const { resolveAttemptCeiling, runRetryCommand } = createRunRetryCommand({ resolveItemExact, requireLocalCheckout, transitionRunStart, meshNodeIdOf, lockContextFor });
