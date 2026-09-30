// Compatibility entry; construction belongs to core application assembly.
import { commandsLoopRecord } from "../application/default.mjs";
export * from "@aof/work-graph/commands/loop-record";
export const {
  loopRecordCommand,
} = commandsLoopRecord;
