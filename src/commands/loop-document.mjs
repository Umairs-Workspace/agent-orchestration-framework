// Compatibility composition; the work-graph package owns the command.
import { createLoopDocumentCommand } from "@aof/work-graph/commands/loop-document";
export * from "@aof/work-graph/commands/loop-document";
async function invokeRegistered(id, input, ctx) {
  const { invoke } = await import("../command-core.mjs");
  return invoke(id, input, ctx);
}
export const loopDocumentCommand = createLoopDocumentCommand({ invokeRegistered });
