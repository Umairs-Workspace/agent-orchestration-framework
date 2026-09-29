// Transitional core composition for knowledge-owned services.
import { createLocalBackend } from "@aof/knowledge/memory/local-backend";
import { reindex, status, memoryIndexPath } from "./local-indexing.mjs";

const services = createLocalBackend({ reindex, status, memoryIndexPath });
export default services.default;
