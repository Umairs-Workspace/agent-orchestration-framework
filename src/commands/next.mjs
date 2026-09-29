// Transitional core composition for work-owned reads.
import { createNextCommand } from "@aof/work/commands/next";
import { nextWorkCacheFirst, listItemsCacheFirst } from "../work/read.mjs";
import { readHeldScopes } from "../item-lock.mjs";
import { executionScopeRef } from "../assignment-record.mjs";
import { partitionReadySetByDeclaredFiles } from "@aof/work/ready-wave";

export const { mergeSkipped, nextCommand } = createNextCommand({ nextWorkCacheFirst, listItemsCacheFirst, readHeldScopes, executionScopeRef, partitionReadySetByDeclaredFiles });
