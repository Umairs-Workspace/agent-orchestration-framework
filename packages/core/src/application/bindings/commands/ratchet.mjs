// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createRatchetCommand } from "@aof/work/commands/ratchet";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

export function assembleCommandsRatchet({ commandsResolveServices }) {
  // Core composition for work-owned commands/ratchet.

  const { requireLocalCheckout } = commandsResolveServices;
  const { resolveItemExact } = commandsResolveServices;
  const execFileAsync = promisify(execFile);

  const { observeRatchet, ratchetCommand, resolveRatchetBase } = createRatchetCommand({ requireLocalCheckout, resolveItemExact, execFileAsync });

  return { observeRatchet, ratchetCommand, resolveRatchetBase };
}
