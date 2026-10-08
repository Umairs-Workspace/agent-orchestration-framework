// packages/contracts/src/agent-mode.mjs — the ONE home of the agent-mode chain and its default (155).
//
// Every session resolves which roles it plays inline and which it spawns through one chain:
//   1. `work.loop.agents.<phase>.mode` — loop-driven sessions only, as an override;
//   2. `work.agents.mode`;
//   3. `AGENT_MODE_DEFAULT`, `solo`, for every role-spawning command except verify (155 Q1).
// `loop-bounds.mjs` declares `work.loop.*` keys and nothing else (69/ADR-001; FF-6901), so the
// fallback to the workspace key lives here, beside it, and never there. The vocabulary and the
// per-phase loop resolvers are imported from the bounds home, never re-spelled. This supersedes
// 140's "the loop never inherits `work.agents.mode`" and widens 129/ADR-001 §5's fallback.

import { LOOP_AGENT_MODES, loopAgentModeFromConfig, LOOP_AGENT_MODE_RESOLVERS } from "./loop-bounds.mjs";

// Solo: a session holds the whole contract in one context, and a cold-start agent per role
// re-reads it at a cost the operator measured. `--orchestrated` is the per-run way out.
export const AGENT_MODE_DEFAULT = "solo";

// The hand-run answer: `work.agents.mode` when it is a member of `LOOP_AGENT_MODES` — verbatim,
// no trim, no case-fold — and the default for anything else, unset included.
export function agentModeFromConfig(workspace) {
  const mode = workspace?.config?.work?.agents?.mode;
  return LOOP_AGENT_MODES.includes(mode) ? mode : AGENT_MODE_DEFAULT;
}

// The driven answer: the phase's loop key when it is set, else the hand-run answer. `null` for a
// phase that resolves no mode (`verify`), so the drive composes no flag for it.
export function sessionAgentMode(workspace, phase) {
  if (!Object.prototype.hasOwnProperty.call(LOOP_AGENT_MODE_RESOLVERS, phase)) return null;
  return loopAgentModeFromConfig(workspace, phase) ?? agentModeFromConfig(workspace);
}
