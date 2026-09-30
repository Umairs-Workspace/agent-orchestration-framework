// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createNextCommand } from "@aof/work/commands/next";
import { executionScopeRef } from "@aof/mesh/assignment-record";
import { partitionReadySetByDeclaredFiles } from "@aof/work/ready-wave";

export function assembleCommandsNext({ workReadServices, itemLockServices }) {
  // Core composition for work-owned reads.

  const { nextWorkCacheFirst } = workReadServices;
  const { listItemsCacheFirst } = workReadServices;
  const { readHeldScopes } = itemLockServices;

  const { mergeSkipped, nextCommand } = createNextCommand({ nextWorkCacheFirst, listItemsCacheFirst, readHeldScopes, executionScopeRef, partitionReadySetByDeclaredFiles });

  return { mergeSkipped, nextCommand };
}
