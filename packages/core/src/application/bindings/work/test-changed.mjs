// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createChangedFilesReader } from "@aof/work/testing/changed";
import { runBounded } from "@aof/execution/bounded-process";

export function assembleWorkTestChanged({ workTestSelectServices }) {
  // Core composition for work-owned testing.

  const { CHANGED_SET_EMPTY } = workTestSelectServices;
  const { CHANGED_SET_UNREADABLE } = workTestSelectServices;
  const { SINCE_REV_UNRESOLVABLE } = workTestSelectServices;

  const { CHANGED_SET_DEADLINE_MS, changedFiles, parseNameOnly, parsePorcelain } = createChangedFilesReader({ runBounded, CHANGED_SET_EMPTY, CHANGED_SET_UNREADABLE, SINCE_REV_UNRESOLVABLE });

  return { CHANGED_SET_DEADLINE_MS, changedFiles, parseNameOnly, parsePorcelain };
}
