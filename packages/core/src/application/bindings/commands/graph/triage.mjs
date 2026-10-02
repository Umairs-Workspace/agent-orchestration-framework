// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createGraphTriageCommand } from "@aof/knowledge/commands/graph-triage";

export function assembleCommandsGraphTriage({ graphifyServices }) {
  // Core composition for knowledge-owned services.

  const { runGraphifyTriage } = graphifyServices;
  const { graphJsonPath } = graphifyServices;

  const { graphTriageCommand } = createGraphTriageCommand({ runGraphifyTriage, graphJsonPath });

  return { graphTriageCommand };
}
