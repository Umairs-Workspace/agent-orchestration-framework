// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createTriggerDeclarations } from "@aof/work-loop/trigger/declaration";
import { readAssetText } from "../../../asset-base.mjs";

export function assembleWorkTriggerDeclaration({ workLoopsServices }) {
  // Core composition for work-loop-owned trigger declaration.

  const { parseCadence } = workLoopsServices;

  const { TRIGGER_DECLARATION_ASSET, TRIGGER_DECLARATION_RELPATH, TRIGGER_PAIRING_REASONS, TRIGGER_PAIRING_STATES, TRIGGER_SOURCES, TriggerDeclarationError, bundledTriggerDeclaration, compileTriggerDeclaration, readTriggerDeclaration, triggerDeclarationPath } = createTriggerDeclarations({ readAssetText, parseCadence });

  return { TRIGGER_DECLARATION_ASSET, TRIGGER_DECLARATION_RELPATH, TRIGGER_PAIRING_REASONS, TRIGGER_PAIRING_STATES, TRIGGER_SOURCES, TriggerDeclarationError, bundledTriggerDeclaration, compileTriggerDeclaration, readTriggerDeclaration, triggerDeclarationPath };
}
