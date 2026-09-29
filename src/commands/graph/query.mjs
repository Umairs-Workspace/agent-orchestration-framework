// Transitional core composition for knowledge-owned services.
import { createGraphQueryCommand } from "@aof/knowledge/commands/graph-query";
import { runGraphifyQuery, graphJsonPath } from "../../graphify.mjs";

export const { graphQueryCommand } = createGraphQueryCommand({ runGraphifyQuery, graphJsonPath });
