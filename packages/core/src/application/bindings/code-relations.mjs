// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createCodeRelations } from "@aof/knowledge/graphify-code-relations";

export function assembleCodeRelations({  } = {}) {
  // The code readers' one capability (179/ADR-004): the code corpus's `relations`, through a port
  // over the graphify code backend's read half. It takes no graphify driver service, so the
  // readers it is handed to — the audit family among them — reach no process (59/FF-5904).

  const relations = createCodeRelations();

  return { relations };
}
