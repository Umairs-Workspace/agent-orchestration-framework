// Effect execution over supplied storage, reactors, reachability and diagnostics.
// No application imports or process-global registration.
import { RETRY_UNTIL_DONE } from "./registry.mjs";

export const EFFECT_MAX_ATTEMPTS = 5;

// 164/ADR-006 — the backoff of a reactor that retries until done: the next attempt is no earlier
// than the step's last attempt + min(base * 2^attempts, cap). The base is one propagation tick,
// and the cap keeps a store that stays broken for a day probed four times an hour, not every tick.
export const RETRY_BACKOFF_BASE_MS = 15_000;
export const RETRY_BACKOFF_CAP_MS = 15 * 60_000;

export function retryBackoffMs(attempts) {
  return Math.min(RETRY_BACKOFF_BASE_MS * 2 ** Math.max(0, attempts), RETRY_BACKOFF_CAP_MS);
}

export function createEffectsDispatcher({ effects: defaultEffects, loci: defaultLoci, pendingSteps, failedStepsPastCeiling = null, markStep, reportDegrade } = {}) {
  for (const [name, port] of Object.entries({ pendingSteps, markStep, reportDegrade })) {
    if (typeof port !== 'function') throw new TypeError(`Effects dispatcher requires ${name}.`);
  }
  if (!defaultEffects || typeof defaultEffects !== 'object' || !Array.isArray(defaultLoci)) {
    throw new TypeError('Effects dispatcher requires a reactor table and default loci.');
  }

  // drainEffects — execute what is owed. Scope with `eventId` for the
  // transition-time sync drain (this command's own cascade); omit it for the
  // crash-recovery sweep (anything any process left pending). Returns one outcome
  // per considered step: { eventId, event, key, locus, status, detail?, error? }
  // with status done|failed|deferred|skipped.
  async function drainEffects({
    journal,
    effects = defaultEffects,
    loci = defaultLoci,
    eventId = null,
    limit = 100,
    maxAttempts = EFFECT_MAX_ATTEMPTS,
    // 164/ADR-006 — the backoff protects a broken store from AUTOMATIC passes. An operator's explicit
    // retry (a lane's cleanup, `doctor --converge`) passes `backoff: false` and runs what is owed now.
    backoff = true,
    now,
    // Reactor context — handles this process already holds that a reactor would
    // otherwise have to re-open (the control tick's open projection store is the
    // driving case). A reactor MUST work without it (opening and closing its own),
    // so a crash-recovery drain from any process behaves identically.
    ctx = {},
  } = {}) {
    // The crash-recovery sweep (no eventId) fetches ONLY steps this drain can run:
    // legitimately-deferred steps (a record-only integration:notion backlog) are
    // oldest-first in the journal, so without the locus filter they would consume
    // the whole limit window and starve every payable step behind them (m42 wave
    // (d) leg d4, port 4). An eventId-scoped drain keeps the full fetch — its
    // caller reads the `deferred` outcomes off the envelope (run-complete's wire).
    const scope = { eventId, maxAttempts, limit, ...(eventId ? {} : { loci }) };
    const reactorOf = (step) => (effects[step.name] ?? []).find((entry) => entry.key === step.key);
    // 164/ADR-006 — a failed step past the ceiling is still owed when its reactor retries until
    // done; every other reactor keeps the ceiling exactly as before.
    const pastCeiling = typeof failedStepsPastCeiling === "function"
      ? failedStepsPastCeiling(journal, scope).filter((step) => reactorOf(step)?.retry === RETRY_UNTIL_DONE)
      : [];
    const steps = pastCeiling.length === 0
      ? pendingSteps(journal, scope)
      : [...pendingSteps(journal, scope), ...pastCeiling].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    const clock = Date.parse(now ?? new Date().toISOString());
    const outcomes = [];
    for (const step of steps) {
      const base = { eventId: step.eventId, event: step.name, key: step.key, locus: step.locus };
      if (!lociReach(loci, step.locus)) {
        // Not ours to run — the outbox/tick with that locus drains it (d3/d4).
        outcomes.push({ ...base, status: "deferred" });
        continue;
      }
      const reactor = reactorOf(step);
      // A failed retry-until-done step waits out its backoff: not attempted, and not counted.
      if (backoff && reactor?.retry === RETRY_UNTIL_DONE && step.status === "failed"
        && clock < Date.parse(step.updatedAt) + retryBackoffMs(step.attempts)) {
        continue;
      }
      if (!reactor) {
        // Vocabulary drift: the step was materialised by a build whose EFFECTS
        // declared this reactor; this build does not. Loud, terminal, visible.
        markStep(journal, step.eventId, step.key, { status: "skipped", error: "unknown-reactor", now });
        reportDegrade("effect-unknown-reactor", new Error(`${step.name}/${step.key} has no reactor in this build`));
        outcomes.push({ ...base, status: "skipped", error: "unknown-reactor" });
        continue;
      }
      try {
        const detail = await reactor.apply({ eventId: step.eventId, name: step.name, payload: step.payload }, ctx);
        markStep(journal, step.eventId, step.key, { status: "done", now });
        outcomes.push({ ...base, status: "done", ...(detail !== undefined ? { detail } : {}) });
      } catch (error) {
        markStep(journal, step.eventId, step.key, { status: "failed", error: String(error?.message ?? error), now });
        reportDegrade("effect-failed", error, { path: `${step.name}/${step.key}` });
        const detail = effectFailureDetail(error);
        outcomes.push({
          ...base,
          status: "failed",
          error: String(error?.message ?? error),
          ...(detail !== undefined ? { detail } : {}),
        });
      }
    }
    return outcomes;
  }

  // runEffectsEphemeral — the journal-less fallback (sqlite unavailable / journal
  // open refused): the cascade still RUNS — behaviour is never gated on the
  // ledger's own health — it is just not durable, and says so via degrade at the
  // caller. Same outcome shape as drainEffects. `reactors` is the seam's OWN
  // applicability-filtered resolution (applicableReactors) so the ephemeral path
  // owes exactly what the journaled path would have appended; absent, the full
  // declared set runs (the pre-predicate behaviour).
  async function runEffectsEphemeral(name, payload, { effects = defaultEffects, reactors = null, loci = defaultLoci, ctx = {} } = {}) {
    const outcomes = [];
    for (const reactor of reactors ?? effects[name] ?? []) {
      const base = { eventId: null, event: name, key: reactor.key, locus: reactor.locus };
      if (!lociReach(loci, reactor.locus)) {
        outcomes.push({ ...base, status: "deferred" });
        continue;
      }
      try {
        const detail = await reactor.apply({ eventId: null, name, payload }, ctx);
        outcomes.push({ ...base, status: "done", ...(detail !== undefined ? { detail } : {}) });
      } catch (error) {
        reportDegrade("effect-failed", error, { path: `${name}/${reactor.key}` });
        const detail = effectFailureDetail(error);
        outcomes.push({
          ...base,
          status: "failed",
          error: String(error?.message ?? error),
          ...(detail !== undefined ? { detail } : {}),
        });
      }
    }
    return outcomes;
  }

  function lociReach(loci, locus) {
    return loci.includes(locus);
  }

  // A reactor may need to fail RETRYABLY while still returning structured evidence to
  // the command that raised the event. Projection propagation is the driving case: the
  // local fact is already durable, so the command keeps its own success result, but the
  // warning must reach `propagationWarnings` while the journal step remains `failed`.
  // Keeping this generic prevents the dispatcher from learning any reactor vocabulary.
  function effectFailureDetail(error) {
    const detail = error?.effectDetail;
    return detail != null && typeof detail === "object" && !Array.isArray(detail) ? detail : undefined;
  }

  return Object.freeze({ drainEffects, runEffectsEphemeral });
}
