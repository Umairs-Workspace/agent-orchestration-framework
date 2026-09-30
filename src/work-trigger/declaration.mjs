// Compatibility entry; construction belongs to core application assembly.
import { workTriggerDeclaration } from "../application/default.mjs";
export const {
  TRIGGER_DECLARATION_ASSET,
  TRIGGER_DECLARATION_RELPATH,
  TRIGGER_PAIRING_REASONS,
  TRIGGER_PAIRING_STATES,
  TRIGGER_SOURCES,
  TriggerDeclarationError,
  bundledTriggerDeclaration,
  compileTriggerDeclaration,
  readTriggerDeclaration,
  triggerDeclarationPath,
} = workTriggerDeclaration;
