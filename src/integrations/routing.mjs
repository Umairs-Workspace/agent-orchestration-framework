// Compatibility entry; construction belongs to core application assembly.
import { integrationsRouting } from "../application/default.mjs";
export const {
  INTEGRATIONS_FILE,
  resolveMilestoneFolderByRef,
  isPageId,
  classifyParent,
  asBoardsRegistry,
  RoutingError,
  readRouting,
  writeRouting,
  hasRouting,
  resolveNotionRouting,
} = integrationsRouting;
