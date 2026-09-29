// Transitional core composition for work-owned commands/feedback.
import { createFeedbackCommand } from "@aof/work/commands/feedback";
import { resolveItemExact, requireLocalCheckout } from "./resolve.mjs";
import { transitionFeedbackAppended } from "../effects/doc-transitions.mjs";
import { renderWithPropagationWarnings, threadPropagationWarnings } from "../global-work-publisher.mjs";

export const { feedbackCommand } = createFeedbackCommand({ resolveItemExact, requireLocalCheckout, transitionFeedbackAppended, renderWithPropagationWarnings, threadPropagationWarnings });
