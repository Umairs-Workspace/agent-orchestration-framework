// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createChangedFilesReader } from "@aof/work/testing/changed";
import { runBounded } from "@aof/execution/bounded-process";

export function assembleWorkTestChanged() {
  // Core composition for work-owned testing: the working tree's changed set, for `aof test --suggest`,
  // and what changed between two content keys, for a fix round.

  const { CHANGED_SET_DEADLINE_MS, CHANGED_SET_UNREADABLE, changedBetween, changedFiles, parsePorcelain } = createChangedFilesReader({ runBounded });

  return { CHANGED_SET_DEADLINE_MS, CHANGED_SET_UNREADABLE, changedBetween, changedFiles, parsePorcelain };
}
