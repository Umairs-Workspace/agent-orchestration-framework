// apps/ui/src/lib/poll-cadence.mjs — THE ONE POLL CADENCE (milestone 167, ADR-004; FF-16703).
//
// Every open view used to poll every 5 s forever, minimised to the tray or not, changed or not, and
// each poll made the daemon rebuild and resend its whole answer. Every interval poll in
// `apps/ui/src` now runs through this one scheduler, which owns the next-delay rule:
//   · while the window is HIDDEN it polls nothing, and the moment it is shown it polls at once;
//   · each UNCHANGED answer doubles the delay from the base, up to POLL_BACKOFF_CAP_MS (the
//     operator's answer to 167/02 Q1, 2026-10-20);
//   · a CHANGED answer, a user action on the surface (`poke`) or a pending assign (`pin`) returns it
//     to the base at once — the fleet's `Sent` hold and assign timeout are timed in the base, so a
//     pinned cadence keeps their meaning.
// One `setTimeout` chain, never `setInterval`, so the delay can move between polls. The timers are
// read off `globalThis` at call time, so a test's installed fake clock is the one it schedules on.
// Exempt, by the ADR: the clock ticks that only re-render a relative time, and the session
// launcher's bounded wait for one spawn outcome. Framework-free: the surfaces wrap it in an effect.

export const POLL_BACKOFF_CAP_MS = 15_000;

// The document's own visibility, or "always visible" where there is no document (node).
export function documentVisibility(doc = globalThis.document) {
  return {
    hidden: () => doc?.visibilityState === "hidden",
    subscribe(listener) {
      if (typeof doc?.addEventListener !== "function") return () => {};
      doc.addEventListener("visibilitychange", listener);
      return () => doc.removeEventListener("visibilitychange", listener);
    },
  };
}

// createPoll({ baseMs, capMs, run, visibility }) → { start, stop, poke, pin, unpin, nextDelay }
//   run        () => Promise<boolean | void> — one poll; `false` means the answer was UNCHANGED,
//              anything else (true, undefined, a throw) is treated as a change and resets the delay.
//   visibility { hidden(), subscribe(listener) → unsubscribe } — injected, `documentVisibility()` by default.
// `start()` arms the first poll one base delay out (the surface has already made its first load).
export function createPoll({ baseMs, capMs = POLL_BACKOFF_CAP_MS, run, visibility = documentVisibility() }) {
  if (!(baseMs > 0) || typeof run !== "function") throw new TypeError("createPoll needs a positive baseMs and a run function.");
  const cap = Math.max(baseMs, capMs);
  let delay = baseMs;
  let timer = null;
  let running = false;
  let started = false;
  let pins = 0;
  let unsubscribe = null;

  const clear = () => {
    if (timer != null) globalThis.clearTimeout(timer);
    timer = null;
  };
  const due = () => (pins > 0 ? baseMs : delay);
  const schedule = (ms) => {
    clear();
    if (!started || visibility.hidden()) return;
    timer = globalThis.setTimeout(() => {
      timer = null;
      void fire();
    }, ms);
  };

  async function fire() {
    if (!started || running) return;
    if (visibility.hidden()) return;
    running = true;
    let unchanged = false;
    try {
      unchanged = (await run()) === false;
    } catch {
      unchanged = false;
    } finally {
      running = false;
    }
    // A pinned poll does not back off at all, so its release starts again from the base.
    delay = unchanged && pins === 0 ? Math.min(delay * 2, cap) : baseMs;
    // On an unchanged answer the next delay is the one just grown to; the first one is the base.
    schedule(unchanged ? due() : baseMs);
  }

  const onVisibility = () => {
    if (!started) return;
    if (visibility.hidden()) clear();
    else {
      clear();
      void fire();
    }
  };

  return {
    start() {
      if (started) return;
      started = true;
      unsubscribe = visibility.subscribe(onVisibility);
      schedule(baseMs);
    },
    stop() {
      started = false;
      clear();
      unsubscribe?.();
      unsubscribe = null;
    },
    // A user action on this surface: back to the base, measured from now.
    poke() {
      delay = baseMs;
      if (!running) schedule(baseMs);
    },
    // A pending assign holds the base cadence until it is released.
    pin() {
      pins += 1;
      delay = baseMs;
      if (!running) schedule(baseMs);
    },
    unpin() {
      pins = Math.max(0, pins - 1);
    },
    nextDelay: () => due(),
  };
}

// armPoll(options, holder) → stop — a surface's effect in one call: create, start, and hand the poll
// to `holder.current` (a ref a user action pokes or pins through); the returned function is the
// effect's cleanup, and it clears the holder only if the holder still holds this poll.
export function armPoll(options, holder = null) {
  const poll = createPoll(options);
  if (holder) holder.current = poll;
  poll.start();
  return () => {
    poll.stop();
    if (holder && holder.current === poll) holder.current = null;
  };
}
