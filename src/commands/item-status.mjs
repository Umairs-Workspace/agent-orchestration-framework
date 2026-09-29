// Transitional core composition for work-owned item-status commands.
import { createItemStatusCommand } from "@aof/work/commands/item-status";
import { resolveItem, resolveItemExact, requireLocalCheckout } from "./resolve.mjs";
import { transitionItemStatus } from "../effects/item-transitions.mjs";
import { renderWithPropagationWarnings, threadPropagationWarnings } from "../global-work-publisher.mjs";
import { doctorWork } from "../work/doctor.mjs";
import { headCommit } from "../mesh/worktree.mjs";
import { buildNotifyEnvelope, notify } from "../notify/notify.mjs";

export const { GATE_MISSING, GATE_RED, OVERRIDE_REASON_REQUIRED, itemStatusCommand } = createItemStatusCommand({ resolveItem, resolveItemExact, requireLocalCheckout, transitionItemStatus, renderWithPropagationWarnings, threadPropagationWarnings, doctorWork, headCommit, buildNotifyEnvelope, notify });
