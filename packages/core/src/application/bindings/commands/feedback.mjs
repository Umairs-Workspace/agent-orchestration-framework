// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createFeedbackCommand } from "@aof/work/commands/feedback";

export function assembleCommandsFeedback({ commandsResolveServices, effectsDocTransitionsServices, globalWorkPublisherServices }) {
  // Core composition for work-owned commands/feedback.

  const { resolveItemExact } = commandsResolveServices;
  const { requireLocalCheckout } = commandsResolveServices;
  const { transitionFeedbackAppended } = effectsDocTransitionsServices;
  const { renderWithPropagationWarnings } = globalWorkPublisherServices;
  const { threadPropagationWarnings } = globalWorkPublisherServices;

  const { feedbackCommand } = createFeedbackCommand({ resolveItemExact, requireLocalCheckout, transitionFeedbackAppended, renderWithPropagationWarnings, threadPropagationWarnings });

  return { feedbackCommand };
}
