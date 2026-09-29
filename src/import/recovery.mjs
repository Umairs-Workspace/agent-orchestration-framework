// Transitional core composition for knowledge-owned import services.
import { createImportRecovery } from "@aof/knowledge/import/recovery";
import { slugifySource } from "./store.mjs";

export const { listRecoverableMilestones, resolveCandidate, recoverMilestone } = createImportRecovery({ slugifySource });
