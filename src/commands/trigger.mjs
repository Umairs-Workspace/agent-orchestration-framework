// Transitional core composition for work-loop-owned trigger command.
import { createTriggerCommand } from "@aof/work-loop/commands/trigger";
import {
  TRIGGER_SOURCES,
  TriggerDeclarationError,
  compileTriggerDeclaration,
  readTriggerDeclaration,
  triggerDeclarationPath,
} from "../work-trigger/declaration.mjs";

// Deferred: command-core registers this command, so importing it eagerly would close the registry cycle.
const loadCommandCore = () => import("../command-core.mjs");

export const { LEVEL_FLAG, LOOP_INPUT_KEYS, RESOLVED_TRIGGER_KEYS, TRIGGER_GATE_READING_FAILED, TRIGGER_GATE_READING_UNOBTAINED, TRIGGER_GATE_READING_UNREACHABLE, TRIGGER_LOOP_UNREGISTERED, TRIGGER_SIGNAL_UNMATCHED, TRIGGER_SIGNAL_UNREADABLE, TRIGGER_SOURCE_UNDECLARED_GAP, TRIGGER_SOURCE_UNKNOWN, TRIGGER_SOURCE_UNRESOLVABLE_HERE, TRIGGER_SOURCE_UNRESOLVED_GAP, TRIGGER_UNKNOWN, buildTriggerReport, triggerCommand } = createTriggerCommand({ TRIGGER_SOURCES, TriggerDeclarationError, compileTriggerDeclaration, readTriggerDeclaration, triggerDeclarationPath, loadCommandCore });
