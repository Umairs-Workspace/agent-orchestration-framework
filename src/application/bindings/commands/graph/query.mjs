// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createGraphQueryCommand } from "@aof/knowledge/commands/graph-query";

export function assembleCommandsGraphQuery({ graphifyServices }) {
  // Core composition for knowledge-owned services.

  const { runGraphifyQuery } = graphifyServices;
  const { graphJsonPath } = graphifyServices;

  const { graphQueryCommand } = createGraphQueryCommand({ runGraphifyQuery, graphJsonPath });

  return { graphQueryCommand };
}
