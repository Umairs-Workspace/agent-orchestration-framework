// The work observer (core's `assembleWorkObserve`, packages/core/src/application/bindings/work/observe.mjs), rebuilt
// from @aof/work's own factory so an observe suite reaches its subject without the assembled session driver.
//
// The binding's one collaborator is core's `reportDegrade`, called only when a run record or snapshot read fails
// with something other than ENOENT. Fail-on-use: a suite here reads only fixtures it wrote itself.
import { createWorkObserver } from "@aof/work/observe";

export function createObserverServices() {
  return createWorkObserver({
    reportDegrade: (code) => {
      throw new Error(`reportDegrade must not be reached (${code}): this suite reads only fixtures it wrote`);
    },
  });
}
