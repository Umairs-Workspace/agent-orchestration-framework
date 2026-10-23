// The Hyperagent integration's ONE contribution to core (169/ADR-002) — everything the package ships
// reaches core through this object, read by core's registry (`packages/core/src/integrations.mjs`):
//
//   id       the `work.integrations` key that enables it (169/ADR-005: present ⇒ on, `{}` is enough)
//   assets   the package whose `assets/bundle.json` fragment core appends to its own descriptor
//            (169/ADR-004): `/aof:hyperplan`, the planner instructions and the seven planning skills
//   commands the four `aof work integrations hyperagent` verbs, built from core's injected services
//
// A data leaf: it imports the verb DESCRIPTORS (./commands.mjs), never a verb implementation, so a
// CLI path that never runs a Hyperagent verb pays for this module and nothing behind it (FF-16004).
import { createHyperagentCommands } from "./commands.mjs";

export const contribution = Object.freeze({
  id: "hyperagent",
  name: "@aof/integration-hyperagent",
  assets: Object.freeze({ package: "@aof/integration-hyperagent" }),
  commands(services) {
    const { briefCommand, resultCommand, checkCommand, doctorCommand } = createHyperagentCommands(services);
    return [briefCommand, resultCommand, checkCommand, doctorCommand];
  }
});
