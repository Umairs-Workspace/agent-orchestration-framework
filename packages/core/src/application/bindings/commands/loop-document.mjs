// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createLoopDocumentCommand } from "@aof/work-graph/commands/loop-document";
import * as api0 from "@aof/work-graph/commands/loop-document";

export function assembleCommandsLoopDocument({ provideCommandCore }) {
  // Core composition; the work-graph package owns the command.

  async function invokeRegistered(id, input, ctx) {
    const { invoke } = await provideCommandCore();
    return invoke(id, input, ctx);
  }
  const loopDocumentCommand = createLoopDocumentCommand({ invokeRegistered });

  return { ...api0, loopDocumentCommand };
}
