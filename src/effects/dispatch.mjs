// src/effects/dispatch.mjs — the topology-aware effects dispatcher (m42 wave (d)
// leg d2). Runs the steps a journal owes whose locus THIS process can reach;
// leaves remote-locus steps pending for the outbox (leg d3). Two drain modes by
// design: the CLI face drains synchronously before exit (per-reactor outcomes in
// the result envelope); daemons drain on the converge tick (d3). Failures are
// events, never silence: a failing reactor marks its step `failed` (retried
// while under the attempts ceiling), reports a coded degrade, and NEVER aborts
// the drain — one consequence's fault cannot strand its siblings.
import { createEffectsDispatcher } from "@aof/effects/dispatch";
export { EFFECT_MAX_ATTEMPTS } from "@aof/effects/dispatch";
import { EFFECTS } from "./table.mjs";
import { pendingSteps, markStep } from "./journal.mjs";
import { reportDegrade } from "../degrade.mjs";

// The loci a plain CLI process on a checkout can reach: its own repo folder and
// its own node-local projection/logs. integration:* joins in d4.
export const LOCAL_LOCI = Object.freeze(["checkout", "local"]);

// The loci a CONTROL-NODE process can reach (m42 wave (d) leg d3): everything a
// local process can, PLUS the authoritative mesh store it is the writer for.
// A worker process is NOT given this set — its `control-store` steps stay
// pending and travel by outbox (outbox.mjs), which is the whole point: a
// consequence owed to another node's store is DURABLE, not fire-and-forget.
export const CONTROL_LOCI = Object.freeze(["checkout", "local", "control-store"]);

// reachableLoci(workspace) — the loci a drain acting FOR this workspace may run
// (m42 wave (d) leg d4, port 4). An `integration:<name>` locus is WORKSPACE-
// scoped, not node-scoped: reachability is the workspace's own config (the
// credentials reference lives there), and the operator decision that makes a
// completion's own drain perform the external write is that integration's
// `autoSync: true`. Without the opt-in the base set is returned unchanged and
// the integration step stays deferred — owed to the integration's own verb
// (notion: sync-work), which passes the locus explicitly when the operator runs
// it. No workspace ⇒ the base set (the worker-site posture).
export function reachableLoci(workspace, base = LOCAL_LOCI) {
  const integrations = workspace?.config?.work?.integrations;
  if (!integrations || typeof integrations !== "object") return base;
  const extra = Object.entries(integrations)
    .filter(([, config]) => config?.autoSync === true)
    .map(([name]) => `integration:${name}`);
  return extra.length > 0 ? [...base, ...extra] : base;
}

// The contribution table now loads without importing domain implementations or transitions.
const dispatcher = createEffectsDispatcher({
  effects: EFFECTS, loci: LOCAL_LOCI, pendingSteps, markStep, reportDegrade,
});

export async function drainEffects(options) {
  return await dispatcher.drainEffects(options);
}

export async function runEffectsEphemeral(name, payload, options) {
  return await dispatcher.runEffectsEphemeral(name, payload, options);
}
