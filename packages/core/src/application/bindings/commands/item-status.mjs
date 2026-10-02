// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createItemStatusCommand } from "@aof/work/commands/item-status";

export function assembleCommandsItemStatus({ commandsResolveServices, effectsItemTransitionsServices, globalWorkPublisherServices, workDoctorServices, meshWorktreeServices, notifyNotifyServices }) {
  // Core composition for work-owned item-status commands.

  const { resolveItem } = commandsResolveServices;
  const { resolveItemExact } = commandsResolveServices;
  const { requireLocalCheckout } = commandsResolveServices;
  const { transitionItemStatus } = effectsItemTransitionsServices;
  const { renderWithPropagationWarnings } = globalWorkPublisherServices;
  const { threadPropagationWarnings } = globalWorkPublisherServices;
  const { doctorWork } = workDoctorServices;
  const { headCommit } = meshWorktreeServices;
  const { buildNotifyEnvelope } = notifyNotifyServices;
  const { notify } = notifyNotifyServices;

  const { GATE_MISSING, GATE_RED, OVERRIDE_REASON_REQUIRED, itemStatusCommand } = createItemStatusCommand({ resolveItem, resolveItemExact, requireLocalCheckout, transitionItemStatus, renderWithPropagationWarnings, threadPropagationWarnings, doctorWork, headCommit, buildNotifyEnvelope, notify });

  return { GATE_MISSING, GATE_RED, OVERRIDE_REASON_REQUIRED, itemStatusCommand };
}
