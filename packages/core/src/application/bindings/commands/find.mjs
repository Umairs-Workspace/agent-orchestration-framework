// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createFindCommand } from "@aof/work/commands/find";

export function assembleCommandsFind({ workReadServices }) {
  // Core composition for work-owned reads.

  const { findWorkCacheFirst } = workReadServices;

  const { findCommand } = createFindCommand({ findWorkCacheFirst });

  return { findCommand };
}
