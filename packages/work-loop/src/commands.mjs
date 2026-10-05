// One package contributes loop orchestration and its four local phase drivers.
// The core registry retains ownership of routing, shared namespaces and collisions.
//
// 147/02 — `work:drive-repair` is the FOURTH phase driver, beside refine, continue and verify: the
// session a lane halt is handed to. The loop never loads the session driver, so a repair session is
// reached exactly as the other three are — by spawning `aof work drive repair`.
export function createWorkLoopContribution({ loop, refine, continue: build, verify, repair }) {
  const commands = [loop, refine, build, verify, repair];
  const ids = ["work:loop", "work:drive-refine", "work:drive-continue", "work:drive-verify", "work:drive-repair"];
  if (commands.some((command, index) => command?.id !== ids[index])) {
    throw new TypeError("Work-loop contribution requires the loop and all four phase drivers.");
  }
  return Object.freeze({ name: "@aof/work-loop", commands: Object.freeze(commands) });
}

// A separate ordered group preserves the existing command enumeration during migration.
export function createTriggerContribution(trigger) {
  if (trigger?.id !== "work:trigger") {
    throw new TypeError("Work-loop trigger contribution requires work:trigger.");
  }
  return Object.freeze({ name: "@aof/work-loop", commands: Object.freeze([trigger]) });
}

export function createDispatchContribution(dispatch) {
  if (dispatch?.id !== "work:dispatch") {
    throw new TypeError("Work-loop dispatch contribution requires work:dispatch.");
  }
  return Object.freeze({ name: "@aof/work-loop", commands: Object.freeze([dispatch]) });
}
