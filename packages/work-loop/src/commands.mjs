// One package contributes loop orchestration and its three local phase drivers.
// The core registry retains ownership of routing, shared namespaces and collisions.
export function createWorkLoopContribution({ loop, refine, continue: build, verify }) {
  const commands = [loop, refine, build, verify];
  const ids = ["work:loop", "work:drive-refine", "work:drive-continue", "work:drive-verify"];
  if (commands.some((command, index) => command?.id !== ids[index])) {
    throw new TypeError("Work-loop contribution requires the loop and all three phase drivers.");
  }
  return Object.freeze({ name: "@aof/work-loop", commands: Object.freeze(commands) });
}
