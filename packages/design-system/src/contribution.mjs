// The design system's ONE contribution to core (198/ADR-008), read by core's practices registry
// (`packages/core/src/practices.mjs`):
//
//   id       the package's name in the registry
//   assets   the package whose `assets/bundle.json` fragment core appends to its own descriptor: the
//            practice `design-system`, keyed on `work.ui.designSystem.enabled` (no fragments yet —
//            198/02 and 198/03 add them), and the `/aof:design-system` command, Claude's alone
//   commands the three `aof design-system` verbs, built from core's injected services (198/ADR-003,
//            198/01 Q11: a practice's contribution may carry commands, assembled as an integration's)
//
// A data leaf: it imports the verb DESCRIPTORS (./commands.mjs), never a verb implementation, so a
// CLI path that never runs a design-system verb pays for this module and nothing behind it (FF-16004).
import { createDesignSystemCommands } from "./commands.mjs";

export const contribution = Object.freeze({
  id: "design-system",
  name: "@aof/design-system",
  assets: Object.freeze({ package: "@aof/design-system" }),
  commands(services) {
    const { tokensCommand, checkCommand, useCommand } = createDesignSystemCommands(services);
    return [tokensCommand, checkCommand, useCommand];
  },
});
