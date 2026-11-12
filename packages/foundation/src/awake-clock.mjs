// packages/foundation/src/awake-clock.mjs — THE AWAKE CLOCK: time the host was actually running.
//
// MEASURED 2026-11-12 (loops 07 and 14, project-sijil / property-intelligence-platform): the host
// slept 00:14 → 05:07. Every bound in the loop is a wall-clock `setTimeout` or a difference of two
// wall-clock instants, and on Windows libuv's timer clock keeps running through a suspend. On wake
// every bound fired in the same second: the lane child's deadline killed two healthy sessions as
// `timeout`, and the lineage budget then charged the five sleeping hours to the attempt and halted
// the loop `deadline-exhausted` — a loop that had merged three lanes, killed by a closed lid.
//
// THE RULE: a bound measures AWAKE time. A ticker samples the wall clock every `tickMs`; a gap
// between two samples longer than `tickMs + gapMs` is a span the process did not run (a suspend,
// or an event loop starved past the threshold — both are time nobody worked), and it is recorded.
// `awakeElapsedMs(from, to)` is the wall span minus the recorded suspended spans inside it, and
// `setTimeout(fn, ms)` fires only once `ms` of AWAKE time has passed: a timer that wakes overdue
// from a suspend re-samples, sees the gap, and re-arms for what is left instead of firing.
//
// Every sample is also taken INLINE wherever a bound is evaluated, so a check that runs before the
// ticker's own overdue tick still sees the gap. A clock that was not ticking across a suspend
// cannot see it; `start()` is idempotent and every awake timer starts the clock it runs on.
//
// One process clock (`processAwakeClock()`); `createAwakeClock` takes injected time for tests.

export const AWAKE_TICK_MS = 5_000;
export const SUSPEND_GAP_MS = 60_000;
// Spans are few (one per suspend), but a daemon lives for weeks: keep the newest only.
const MAX_SPANS = 512;
const MAX_TIMER_MS = 2 ** 31 - 1;

export function createAwakeClock({
  now = () => Date.now(),
  tickMs = AWAKE_TICK_MS,
  gapMs = SUSPEND_GAP_MS,
  timers = null,
} = {}) {
  const schedule = timers ?? {
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (handle) => clearTimeout(handle),
    setInterval: (fn, ms) => setInterval(fn, ms),
    clearInterval: (handle) => clearInterval(handle),
  };
  const spans = [];
  let last = null;
  let ticker = null;

  // One sample: a forward gap past the threshold is recorded as suspended from the instant the
  // next tick was due to the instant this sample ran. A backward step (the wall clock was set
  // back) records nothing and re-bases.
  function sample() {
    const t = now();
    if (!Number.isFinite(t)) return;
    if (last != null && t - last > tickMs + gapMs) {
      spans.push([last + tickMs, t]);
      if (spans.length > MAX_SPANS) spans.splice(0, spans.length - MAX_SPANS);
    }
    last = t;
  }

  function start() {
    if (ticker != null) return api;
    last = now();
    ticker = schedule.setInterval(sample, tickMs);
    ticker?.unref?.();
    return api;
  }

  function stop() {
    if (ticker != null) schedule.clearInterval(ticker);
    ticker = null;
    last = null;
  }

  // The recorded suspended spans clipped to [fromMs, toMs], oldest first, as `[from, to]` pairs.
  function suspendedSpans(fromMs, toMs = now()) {
    sample();
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) return [];
    const out = [];
    for (const [a, b] of spans) {
      const from = Math.max(a, fromMs);
      const to = Math.min(b, toMs);
      if (to > from) out.push([from, to]);
    }
    return out;
  }

  function suspendedMs(fromMs, toMs = now()) {
    return suspendedSpans(fromMs, toMs).reduce((sum, [a, b]) => sum + (b - a), 0);
  }

  // Wall span minus the suspended spans inside it; never negative.
  function awakeElapsedMs(fromMs, toMs = now()) {
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return 0;
    return Math.max(0, toMs - fromMs - suspendedMs(fromMs, toMs));
  }

  // setTimeout(fn, ms, { from, unref }) — fire once `ms` of awake time has passed since `from`
  // (default: now). Answers `{ clear() }`. A wake that finds the bound not yet met re-arms for the
  // rest. `unref: true` keeps every underlying handle from holding the process open.
  function awakeTimeout(fn, ms, { from = now(), unref = false } = {}) {
    start();
    let handle = null;
    let cleared = false;
    // Capped at the platform's largest timer: Node turns anything above it into 1 ms, which
    // would make every re-arm of a long bound fire at once.
    const arm = (delay) => {
      handle = schedule.setTimeout(check, Math.min(MAX_TIMER_MS, Math.max(1, Math.ceil(delay))));
      if (unref) handle?.unref?.();
    };
    function check() {
      handle = null;
      if (cleared) return;
      const left = ms - awakeElapsedMs(from);
      if (left > 0) {
        arm(left);
        return;
      }
      cleared = true;
      fn();
    }
    arm(ms - awakeElapsedMs(from));
    return {
      clear() {
        cleared = true;
        if (handle != null) schedule.clearTimeout(handle);
        handle = null;
      },
    };
  }

  const api = { start, stop, sample, suspendedSpans, suspendedMs, awakeElapsedMs, setTimeout: awakeTimeout };
  return api;
}

let processClock = null;

// The process's one clock, started on first use (its ticker is unref'd and holds nothing open).
export function processAwakeClock() {
  if (processClock == null) processClock = createAwakeClock();
  return processClock.start();
}
