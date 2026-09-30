// Compatibility entry; construction belongs to core application assembly.
import { commandsLoopDocument } from "../application/default.mjs";
export * from "@aof/work-graph/commands/loop-document";
export const {
  loopDocumentCommand,
} = commandsLoopDocument;
