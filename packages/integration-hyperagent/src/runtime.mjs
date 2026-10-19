// The Hyperagent PLANNING runtime's declarations — owned here, consumed by core.
//
// Core's model (RUNTIMES, CAPABILITIES) and its ACD bundle mapping (RESOURCE_MAPPINGS) import these
// rather than spelling Hyperagent inline, so everything Hyperagent-specific lives in this package and
// core carries only the import. Capability statuses are core's CAPABILITY_STATUS strings, written as
// literals because this package imports nothing from core (a feature package never reaches into the
// assembled core); core's suite asserts each one is a status it knows.
import os from "node:os";
import path from "node:path";

export const HYPERAGENT_RUNTIME_ID = "hyperagent";

// `optIn: true` keeps the runtime out of core's defaultRuntimes(): accepted when named, never assumed.
export const HYPERAGENT_RUNTIME = Object.freeze({
  id: HYPERAGENT_RUNTIME_ID,
  name: "Hyperagent",
  localRoot: ".hyperagent",
  globalRoot: path.join(os.homedir(), ".hyperagent"),
  commandPrefix: "",
  optIn: true
});

// Skills are native (Hyperagent imports SKILL.md); commands render only through the bundle mapping
// below; role agents and rules have no Hyperagent file format.
export const HYPERAGENT_CAPABILITIES = Object.freeze({
  skill: "native",
  command: "unsupported-fail",
  agent: "unsupported-warning",
  rule: "unsupported-warning",
  pathScopedRule: "unsupported-warning",
  codexExecutionPolicyRule: "unsupported-fail"
});

// The ACD command → skill mapping. `requiresVariant` renders ONLY members that author a `hyperagent`
// variant (the planning subset); every other procedure is reported outside the runtime's subset.
export const HYPERAGENT_BUNDLE_COMMAND_MAPPING = Object.freeze({
  kind: "skill",
  idPrefix: "aof-",
  invocationPrefix: "aof-",
  sourceInvocationPrefix: "/",
  argumentToken: "$ARGUMENTS",
  requiresVariant: true
});
