// Transitional core composition for knowledge-owned import services.
import { createImportMaterializer } from "@aof/knowledge/import/materialize";
import { importMilestoneDir, ensureImportStoreGitignore } from "./store.mjs";
import { renderDigestDocument } from "../work/digest-template.mjs";
import { WORK_ITEM_SCHEMA_VERSION } from "../work.mjs";

export const { SPEC_FILE, ARCHITECTURE_FILE, RETROSPECTIVE_FILE, AOF_FILE, INTENT_NOT_RECOVERABLE, renderSpec, renderArchitecture, renderRetrospective, renderDigest, writeColocatedDigest, planMaterialize, materializeImport } = createImportMaterializer({ importMilestoneDir, ensureImportStoreGitignore, renderDigestDocument, WORK_ITEM_SCHEMA_VERSION });
