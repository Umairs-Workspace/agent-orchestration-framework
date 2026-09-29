// Transitional core composition for knowledge-owned import services.
import { createImportMilestoneCommand } from "@aof/knowledge/commands/import-milestone";
import { recoverMilestone, listRecoverableMilestones, resolveCandidate } from "../import/recovery.mjs";
import { writeColocatedDigest } from "../import/materialize.mjs";
import { slugifySource } from "../import/store.mjs";
import { resolveConfiguredBackend } from "../work/memory.mjs";

export const { importMilestoneCommand } = createImportMilestoneCommand({ recoverMilestone, listRecoverableMilestones, resolveCandidate, writeColocatedDigest, slugifySource, resolveConfiguredBackend });
