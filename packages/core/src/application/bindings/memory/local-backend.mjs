// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createLocalBackend } from "@aof/knowledge/memory/local-backend";

export function assembleMemoryLocalBackend({ memoryLocalIndexingServices }) {
  // Core composition for knowledge-owned services.

  const { reindex } = memoryLocalIndexingServices;
  const { status } = memoryLocalIndexingServices;
  const { memoryIndexPath } = memoryLocalIndexingServices;

  const services = createLocalBackend({ reindex, status, memoryIndexPath });

  return { "default": services.default };
}
