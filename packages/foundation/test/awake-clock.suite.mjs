// 2026-11-12 — THE AWAKE CLOCK. Loops 07 and 14 died on wake from a 5-hour host suspend: every
// wall-clock bound fired at once. Pins:
//   - a gap between samples past tick + threshold is recorded as suspended; ordinary ticks are not
//   - awakeElapsedMs subtracts only the suspended time inside its window, never below zero
//   - an awake timeout that wakes overdue from a suspend re-arms for what is left, and fires once
//     its bound of AWAKE time has passed; clear() disarms it
//   - a backward wall-clock step records nothing
import assert from "node:assert/strict";
import { createAwakeClock } from "@aof/foundation/awake-clock";

// A scripted host: `advance(ms)` runs every due timer in order (the ticker included), `suspend(ms)`
// moves the wall clock with NO timer running — what a closed lid does — so the next timer that runs
// finds itself overdue, exactly as libuv's does on wake.
function scriptedHost(startMs = 1_000_000) {
  let now = startMs;
  let seq = 0;
  const pending = new Map();
  const add = (fn, ms, every) => {
    const id = ++seq;
    pending.set(id, { fn, at: now + Math.max(1, ms), every });
    return id;
  };
  const timers = {
    setTimeout: (fn, ms) => add(fn, ms, null),
    clearTimeout: (id) => pending.delete(id),
    setInterval: (fn, ms) => add(fn, ms, ms),
    clearInterval: (id) => pending.delete(id),
  };
  function runDue(untilMs) {
    for (;;) {
      const due = [...pending.entries()].filter(([, t]) => t.at <= untilMs).sort((a, b) => a[1].at - b[1].at || a[0] - b[0]);
      if (due.length === 0) return;
      const [id, t] = due[0];
      now = Math.max(now, t.at);
      if (t.every == null) pending.delete(id);
      else t.at += t.every;
      t.fn();
    }
  }
  return {
    timers,
    now: () => now,
    advance(ms) { const target = now + ms; runDue(target); now = target; },
    // The wall clock jumps; on wake every overdue timer runs at the wake instant.
    suspend(ms) {
      now += ms;
      for (const t of pending.values()) if (t.at < now) t.at = now;
      runDue(now);
    },
    setWall(ms) { now = ms; },
  };
}

const TICK = 5_000;
const GAP = 60_000;
const HOUR = 3_600_000;

export const awakeClockTests = [
  {
    name: "awake-clock/01 ordinary ticks record no suspend; a gap past tick + threshold is recorded and subtracted",
    run() {
      const host = scriptedHost();
      const clock = createAwakeClock({ now: host.now, timers: host.timers, tickMs: TICK, gapMs: GAP }).start();
      const t0 = host.now();
      host.advance(10 * 60_000);
      assert.equal(clock.suspendedMs(t0), 0, "ten awake minutes record nothing");
      assert.equal(clock.awakeElapsedMs(t0), 10 * 60_000);
      host.suspend(5 * HOUR);
      host.advance(60_000);
      const suspended = clock.suspendedMs(t0);
      assert.ok(suspended >= 5 * HOUR - TICK && suspended <= 5 * HOUR, `the 5 h suspend is recorded, less at most the tick it began in (${suspended} ms)`);
      const awake = clock.awakeElapsedMs(t0);
      assert.ok(awake >= 11 * 60_000 && awake <= 11 * 60_000 + TICK, `awake time is the 11 minutes the host ran (${awake} ms)`);
    },
  },
  {
    name: "awake-clock/02 a gap at or under the threshold is not a suspend (a busy event loop is not a closed lid)",
    run() {
      const host = scriptedHost();
      const clock = createAwakeClock({ now: host.now, timers: host.timers, tickMs: TICK, gapMs: GAP }).start();
      const t0 = host.now();
      host.suspend(GAP);
      assert.equal(clock.suspendedMs(t0), 0);
      host.suspend(GAP + TICK + 1);
      assert.ok(clock.suspendedMs(t0) > 0, "one millisecond past tick + threshold is recorded");
    },
  },
  {
    name: "awake-clock/03 an awake timeout overdue from a suspend re-arms for what is left, then fires once its awake bound passes",
    run() {
      const host = scriptedHost();
      const clock = createAwakeClock({ now: host.now, timers: host.timers, tickMs: TICK, gapMs: GAP }).start();
      let fired = 0;
      clock.setTimeout(() => { fired += 1; }, HOUR);
      host.advance(50 * 60_000);
      assert.equal(fired, 0, "fifty awake minutes: not yet");
      host.suspend(5 * HOUR);
      assert.equal(fired, 0, "waking five hours later does not fire a bound with ten awake minutes left");
      host.advance(9 * 60_000);
      assert.equal(fired, 0, "nine of the ten minutes: not yet");
      host.advance(2 * 60_000);
      assert.equal(fired, 1, "the bound fires once an hour of awake time has passed");
      host.advance(HOUR);
      assert.equal(fired, 1, "and only once");
    },
  },
  {
    name: "awake-clock/04 with no suspend the awake timeout fires at its bound, `from` counts from an earlier instant, and clear() disarms",
    run() {
      const host = scriptedHost();
      const clock = createAwakeClock({ now: host.now, timers: host.timers, tickMs: TICK, gapMs: GAP }).start();
      const startedAt = host.now();
      host.advance(20_000);
      let fromFired = 0;
      clock.setTimeout(() => { fromFired += 1; }, 30_000, { from: startedAt });
      host.advance(9_000);
      assert.equal(fromFired, 0);
      host.advance(2_000);
      assert.equal(fromFired, 1, "30 s from the earlier instant, not from the call");
      let cleared = 0;
      const handle = clock.setTimeout(() => { cleared += 1; }, 10_000);
      handle.clear();
      host.advance(60_000);
      assert.equal(cleared, 0);
    },
  },
  {
    name: "awake-clock/05 a backward wall-clock step records nothing and never makes elapsed negative",
    run() {
      const host = scriptedHost();
      const clock = createAwakeClock({ now: host.now, timers: host.timers, tickMs: TICK, gapMs: GAP }).start();
      const t0 = host.now();
      host.advance(30_000);
      host.setWall(t0 - HOUR);
      host.advance(30_000);
      assert.equal(clock.suspendedMs(t0 - 2 * HOUR, t0 + HOUR), 0);
      assert.equal(clock.awakeElapsedMs(t0), 0, "a window that ends before it starts is zero, never negative");
    },
  },
];
