// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createNotionApply } from "@aof/integration-notion/sync";

export function assembleNotionSync({ notionMappingServices }) {
  // Core binds the sidecar writer to the package-owned apply algorithm.

  const { recordPageId } = notionMappingServices;
  const { applyPlan } = createNotionApply({ recordPageId });

  return { applyPlan };
}
