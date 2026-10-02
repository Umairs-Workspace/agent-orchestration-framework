// The acceptor criterion service (core's `assembleWorkAcceptorCriterion`,
// packages/core/src/application/bindings/work-acceptor/criterion.mjs), rebuilt from @aof/work's own factory so an
// acceptor suite reaches its subject without the assembled application.
//
// The binding hands the factory two collaborators from core's frozen-set module:
//   - `bundledFrozenSet` — the shipped frozen-set declaration. `defaultCriterion()` carries its member IDS as the
//     opaque `frozenSet` field, which only feeds the criterion digest. A suite here asserts on the work-owned fields
//     (alpha, lambda, B, tieRate, ...) and compares digests within one process, never against the shipped member
//     list, so a fixed fixture declaration stands in. A suite whose assertions read the SHIPPED members is a
//     work<->core integration and stays in root test/.
//   - `readFrozenSet` — a project's own declaration on disk, read only by `readCriterion`'s fallback. Fail-on-use.
import { createAcceptorCriterion } from "@aof/work/acceptor/criterion";

const FIXTURE_FROZEN_SET = Object.freeze({ members: Object.freeze([Object.freeze({ id: "fixture-frozen-member" })]) });

const refuseProjectFrozenSet = () => {
  throw new Error("readFrozenSet must not be reached: this suite reads no project criterion from disk");
};

export function createAcceptorCriterionServices({
  bundledFrozenSet = () => FIXTURE_FROZEN_SET,
  readFrozenSet = refuseProjectFrozenSet,
} = {}) {
  return createAcceptorCriterion({ bundledFrozenSet, readFrozenSet });
}
