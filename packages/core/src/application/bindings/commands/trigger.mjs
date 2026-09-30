// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createTriggerCommand } from "@aof/work-loop/commands/trigger";

export function assembleCommandsTrigger({ workTriggerDeclarationServices, provideCommandCore }) {
  // Core composition for work-loop-owned trigger command.

  const { TRIGGER_SOURCES } = workTriggerDeclarationServices;
  const { TriggerDeclarationError } = workTriggerDeclarationServices;
  const { compileTriggerDeclaration } = workTriggerDeclarationServices;
  const { readTriggerDeclaration } = workTriggerDeclarationServices;
  const { triggerDeclarationPath } = workTriggerDeclarationServices;

  // Deferred operation: core supplies a ready callback to the completed registry.
  const loadCommandCore = () => provideCommandCore();

  const { LEVEL_FLAG, LOOP_INPUT_KEYS, RESOLVED_TRIGGER_KEYS, TRIGGER_GATE_READING_FAILED, TRIGGER_GATE_READING_UNOBTAINED, TRIGGER_GATE_READING_UNREACHABLE, TRIGGER_LOOP_UNREGISTERED, TRIGGER_SIGNAL_UNMATCHED, TRIGGER_SIGNAL_UNREADABLE, TRIGGER_SOURCE_UNDECLARED_GAP, TRIGGER_SOURCE_UNKNOWN, TRIGGER_SOURCE_UNRESOLVABLE_HERE, TRIGGER_SOURCE_UNRESOLVED_GAP, TRIGGER_UNKNOWN, buildTriggerReport, triggerCommand } = createTriggerCommand({ TRIGGER_SOURCES, TriggerDeclarationError, compileTriggerDeclaration, readTriggerDeclaration, triggerDeclarationPath, loadCommandCore });

  return { LEVEL_FLAG, LOOP_INPUT_KEYS, RESOLVED_TRIGGER_KEYS, TRIGGER_GATE_READING_FAILED, TRIGGER_GATE_READING_UNOBTAINED, TRIGGER_GATE_READING_UNREACHABLE, TRIGGER_LOOP_UNREGISTERED, TRIGGER_SIGNAL_UNMATCHED, TRIGGER_SIGNAL_UNREADABLE, TRIGGER_SOURCE_UNDECLARED_GAP, TRIGGER_SOURCE_UNKNOWN, TRIGGER_SOURCE_UNRESOLVABLE_HERE, TRIGGER_SOURCE_UNRESOLVED_GAP, TRIGGER_UNKNOWN, buildTriggerReport, triggerCommand };
}
