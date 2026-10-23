// Traceability wiring for milestone 167 / story 02 (an idle view costs almost nothing) —
// apps/ui/src/lib/poll-cadence.mjs, the ONE cadence every UI poll runs through (ADR-004).
//
//   tasks/01_every-poll-pauses-and-backs-off.feature (@executable) — R2 and R3 over the scheduler the
//   board's, the fleet's, the detail panel's and the home's polls are built from, driven by an
//   injected clock and an injected visibility, with the surfaces' own base cadences. That every
//   interval poll in apps/ui/src is built from it, which surface action pokes it, and that the clock
//   ticks and the launcher's outcome wait are exempt, is FF-16703's to hold
//   (test/arch/ui/acd-ui-polls-through-one-cadence.test.mjs).
import assert from "node:assert/strict";
import { createPoll, POLL_BACKOFF_CAP_MS } from "../src/lib/poll-cadence.mjs";
import { POLL_MS, ASSIGN_SENT_HOLD_MS, ASSIGN_TIMEOUT_MS } from "../src/fleet/assign-affordance.mjs";
import { HOME_POLL_MS } from "../src/home/page-state.mjs";

// A fake clock over globalThis's timers — the scheduler reads them at call time, as it does under the
// UI harness's own clock — and a visibility the case flips.
function harness() {
  let now = 0, seq = 0;
  const due = new Map();
  const real = { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout };
  globalThis.setTimeout = (fn, ms) => { const id = ++seq; due.set(id, { at: now + ms, fn }); return id; };
  globalThis.clearTimeout = (id) => { due.delete(id); };
  let hidden = false;
  const listeners = new Set();
  const visibility = { hidden: () => hidden, subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); } };
  const settle = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
  return {
    visibility,
    now: () => now,
    async advance(ms) {
      const target = now + ms;
      for (;;) {
        const next = [...due].filter(([, entry]) => entry.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        due.delete(next[0]);
        now = next[1].at;
        next[1].fn();
        await settle();
      }
      now = target;
    },
    async setHidden(value) {
      hidden = value;
      for (const fn of listeners) fn();
      await settle();
    },
    restore() { globalThis.setTimeout = real.setTimeout; globalThis.clearTimeout = real.clearTimeout; },
  };
}

// A poll whose answers are scripted: each `run()` records when it fired and answers the next verdict.
function scripted(clock, { baseMs = POLL_MS, answers = () => false } = {}) {
  const fired = [];
  const poll = createPoll({ baseMs, visibility: clock.visibility, run: async () => { fired.push(clock.now()); return answers(fired.length); } });
  return { poll, fired, gaps: () => fired.map((at, i) => at - (i === 0 ? 0 : fired[i - 1])) };
}

async function withClock(body) {
  const clock = harness();
  try { await body(clock); } finally { clock.restore(); }
}

export const pollCadenceTests = [
  {
    name: "167/02 E3 · a window hidden for ten minutes makes no request",
    run: () => withClock(async (clock) => {
      for (const baseMs of [POLL_MS, HOME_POLL_MS]) {
        const { poll, fired } = scripted(clock, { baseMs, answers: () => true });
        poll.start();
        await clock.setHidden(true);
        await clock.advance(10 * 60_000);
        assert.deepEqual(fired, [], "the fleet and the board make no request");
        poll.stop();
        await clock.setHidden(false);
      }
    }),
  },
  {
    name: "167/02 E4 · a window shown again polls at once",
    run: () => withClock(async (clock) => {
      const { poll, fired } = scripted(clock);
      poll.start();
      await clock.setHidden(true);
      await clock.advance(10 * 60_000);
      const shownAt = clock.now();
      await clock.setHidden(false);
      assert.deepEqual(fired, [shownAt], "each polls at once, before any delay");
      poll.stop();
    }),
  },
  {
    name: "167/02 E5 · unchanged answers slow the board to every 15 seconds",
    run: () => withClock(async (clock) => {
      const { poll, gaps } = scripted(clock, { answers: () => false }); // four 304s
      poll.start();
      await clock.advance(5_000 + 10_000 + 15_000 + 15_000);
      assert.deepEqual(gaps(), [5_000, 10_000, 15_000, 15_000], "the delays between its polls are 5, 10, 15 and 15 seconds");
      assert.equal(POLL_BACKOFF_CAP_MS, 15_000, "the cap is the operator's answer to 167/02 Q1");
      poll.stop();
    }),
  },
  {
    name: "167/02 E6 · a changed answer returns the cadence to 5 seconds",
    run: () => withClock(async (clock) => {
      const { poll, gaps } = scripted(clock, { answers: (n) => n === 4 }); // three 304s, then a changed list
      poll.start();
      await clock.advance(5_000 + 10_000 + 15_000 + 15_000);
      assert.equal(poll.nextDelay(), 5_000, "after the changed answer the cadence is back at its base");
      await clock.advance(5_000);
      assert.equal(gaps().at(-1), 5_000, "the next poll is 5 seconds later");
      poll.stop();
    }),
  },
  {
    name: "167/02 E7 · a pending assign holds the fleet at 5 seconds",
    run: () => withClock(async (clock) => {
      const { poll, fired, gaps } = scripted(clock, { answers: () => false });
      poll.start();
      await clock.advance(5_000 + 10_000 + 15_000);
      assert.equal(poll.nextDelay(), 15_000, "premise: the fleet's status poll has slowed to every 15 seconds");
      poll.pin(); // the operator clicks Assign
      const pinnedFrom = fired.length;
      await clock.advance(ASSIGN_TIMEOUT_MS);
      assert.deepEqual(gaps().slice(pinnedFrom + 1), new Array(fired.length - pinnedFrom - 1).fill(POLL_MS), "the fleet polls every 5 seconds until the assign resolves");
      // The Sent hold is one poll interval and the timeout two, both in POLL_MS, and a pinned cadence
      // IS POLL_MS — so both end at the same poll they always ended at.
      assert.equal(ASSIGN_SENT_HOLD_MS, POLL_MS);
      assert.equal(ASSIGN_TIMEOUT_MS, POLL_MS * 2);
      poll.unpin();
      await clock.advance(POLL_MS);
      assert.equal(poll.nextDelay(), 2 * POLL_MS, "released, an unchanged answer slows it again");
      poll.stop();
    }),
  },
  {
    name: "167/02 a user action on a surface returns its cadence to 5 seconds (board list, detail runs, fleet status, home feed)",
    run: () => withClock(async (clock) => {
      for (const baseMs of [POLL_MS, POLL_MS, POLL_MS, HOME_POLL_MS]) {
        const { poll, fired } = scripted(clock, { baseMs, answers: () => false });
        poll.start();
        await clock.advance(baseMs * 6);
        assert.equal(poll.nextDelay(), POLL_BACKOFF_CAP_MS, "premise: the poll has slowed to every 15 seconds");
        const actedAt = clock.now();
        poll.poke(); // the operator's action on that surface
        await clock.advance(baseMs);
        assert.equal(fired.at(-1) - actedAt, baseMs, "the next poll is 5 seconds later");
        poll.stop();
      }
    }),
  },
  {
    name: "167/02 a run that throws is a change, never a stalled poll, and a stopped poll fires nothing",
    run: () => withClock(async (clock) => {
      const fired = [];
      const poll = createPoll({ baseMs: POLL_MS, visibility: clock.visibility, run: async () => { fired.push(clock.now()); throw new Error("offline"); } });
      poll.start();
      await clock.advance(3 * POLL_MS);
      assert.deepEqual(fired, [5_000, 10_000, 15_000], "a failed poll keeps the base cadence");
      poll.stop();
      await clock.advance(10 * POLL_MS);
      assert.equal(fired.length, 3, "nothing fires after stop");
      assert.throws(() => createPoll({ baseMs: 0, run: () => true }), /positive baseMs/);
    }),
  },
];
