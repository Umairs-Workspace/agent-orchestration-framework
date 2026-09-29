// Transitional core composition for knowledge-owned services.
import { createGraphTriageCommand } from "@aof/knowledge/commands/graph-triage";
import { runGraphifyTriage, graphJsonPath } from "../../graphify.mjs";

export const { graphTriageCommand } = createGraphTriageCommand({ runGraphifyTriage, graphJsonPath });
