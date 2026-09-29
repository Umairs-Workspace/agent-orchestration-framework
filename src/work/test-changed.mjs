// Transitional core composition for work-owned testing.
import { createChangedFilesReader } from "@aof/work/testing/changed";
import { runBounded } from "@aof/execution/bounded-process";
import { CHANGED_SET_EMPTY, CHANGED_SET_UNREADABLE, SINCE_REV_UNRESOLVABLE } from "./test-select.mjs";

export const { CHANGED_SET_DEADLINE_MS, changedFiles, parseNameOnly, parsePorcelain } = createChangedFilesReader({ runBounded, CHANGED_SET_EMPTY, CHANGED_SET_UNREADABLE, SINCE_REV_UNRESOLVABLE });
