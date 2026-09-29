// Transitional core composition for work-owned commands/counters.
import { createCountersCommand } from "@aof/work/commands/counters";
import { isRetryable, readRuns } from "../run-store.mjs";
import { resolveItem } from "./resolve.mjs";
import { resolveAttemptCeiling } from "./run-retry.mjs";

export const { countersCommand, observeCounters } = createCountersCommand({ isRetryable, readRuns, resolveItem, resolveAttemptCeiling });
