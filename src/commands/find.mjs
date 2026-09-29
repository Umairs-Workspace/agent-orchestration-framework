// Transitional core composition for work-owned reads.
import { createFindCommand } from "@aof/work/commands/find";
import { findWorkCacheFirst } from "../work/read.mjs";

export const { findCommand } = createFindCommand({ findWorkCacheFirst });
