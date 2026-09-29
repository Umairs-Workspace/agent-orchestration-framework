// Transitional core composition for work-loop-owned trigger declaration.
import { createTriggerDeclarations } from "@aof/work-loop/trigger/declaration";
import { readAssetText } from "../asset-base.mjs";
import { parseCadence } from "../work/loops.mjs";

export const { TRIGGER_DECLARATION_ASSET, TRIGGER_DECLARATION_RELPATH, TRIGGER_PAIRING_REASONS, TRIGGER_PAIRING_STATES, TRIGGER_SOURCES, TriggerDeclarationError, bundledTriggerDeclaration, compileTriggerDeclaration, readTriggerDeclaration, triggerDeclarationPath } = createTriggerDeclarations({ readAssetText, parseCadence });
