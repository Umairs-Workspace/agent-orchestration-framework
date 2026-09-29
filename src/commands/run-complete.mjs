// Transitional core composition for work-owned run-complete commands.
import { createRunCompleteCommand } from "@aof/work/commands/run-complete";
import { resolveItemExact, requireLocalCheckout, resolveDrivenRun } from "./resolve.mjs";
import { transitionRunComplete } from "../effects/run-transitions.mjs";
import { parseResumeAfter } from "../run-store.mjs";
import { renderWithPropagationWarnings, threadPropagationWarnings } from "../global-work-publisher.mjs";

export const { runCompleteCommand } = createRunCompleteCommand({ resolveItemExact, requireLocalCheckout, resolveDrivenRun, transitionRunComplete, parseResumeAfter, renderWithPropagationWarnings, threadPropagationWarnings });
