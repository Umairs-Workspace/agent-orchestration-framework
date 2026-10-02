// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createImportMaterializer } from "@aof/knowledge/import/materialize";

export function assembleImportMaterialize({ importStoreServices, workDigestTemplateServices, workServices }) {
  // Core composition for knowledge-owned import services.

  const { importMilestoneDir } = importStoreServices;
  const { ensureImportStoreGitignore } = importStoreServices;
  const { renderDigestDocument } = workDigestTemplateServices;
  const { WORK_ITEM_SCHEMA_VERSION } = workServices;

  const { SPEC_FILE, ARCHITECTURE_FILE, RETROSPECTIVE_FILE, AOF_FILE, INTENT_NOT_RECOVERABLE, renderSpec, renderArchitecture, renderRetrospective, renderDigest, writeColocatedDigest, planMaterialize, materializeImport } = createImportMaterializer({ importMilestoneDir, ensureImportStoreGitignore, renderDigestDocument, WORK_ITEM_SCHEMA_VERSION });

  return { SPEC_FILE, ARCHITECTURE_FILE, RETROSPECTIVE_FILE, AOF_FILE, INTENT_NOT_RECOVERABLE, renderSpec, renderArchitecture, renderRetrospective, renderDigest, writeColocatedDigest, planMaterialize, materializeImport };
}
