import assert from "node:assert/strict";
import {
  GATE_ORDER,
  decideLoop,
  decideLoopAction,
  resolveLoopBound,
} from "../../src/work/loop.mjs";
import { workLoopStoryFixturesFor } from "../support/work-loop-story-fixtures.mjs";

const story = { state: "ready", ref: "53/01", type: "story" };
const tasks = { tasks: [{ counts: { uat: 0 } }] };

export const workLoopGateOrderTests = [
  {
    name: "loop gate order — the shared story fixtures stay executable",
    run() {
      for (const { name, args, expected } of workLoopStoryFixturesFor("gate-order")) {
        assert.deepEqual(decideLoopAction(...args), expected, name);
      }
    },
  },
  {
    // EXTENDED BY MILESTONE 54 / STORY 02 (54/ADR-007 §1) — from three rows to five, which is
    // the change `53/ADR-005` §6 declared this order FOR: it fixed the sequence *"because 54
    // depends on it"*, and 54 is what fills the two rungs it left room for. The ladder is now
    // ordered by strictly increasing cost — `work:validate` (pure, in-process) → `work:doctor`
    // (one snapshot) → `work:grade --run` (one bounded child) → the review turn (a whole agent
    // session) — with each rung short-circuiting the ones after it. The three rows this test
    // pinned are still the first, second and last of the five, in the same relative order:
    // nothing was reordered, and the freeze this test exists to hold is unchanged.
    name: "loop gate order — continue, deterministic validate, doctor, grade, verify is frozen",
    run() {
      assert.equal(Object.isFrozen(GATE_ORDER), true);
      assert.deepEqual(GATE_ORDER, [
        { act: "drive", phase: "continue" },
        { act: "gate", command: "work:validate" },
        { act: "gate", command: "work:doctor" },
        { act: "gate", command: "work:grade" },
        { act: "drive", phase: "verify" },
      ]);
      assert.equal(decideLoopAction({ next: story, tasks, lastPhase: "continue", session: { outcome: "done", declared: true }, cap: 3 }).act, "gate");
    },
  },
  {
    name: "loop gate order — clean advances and red retries carry findings below the cap",
    run() {
      assert.deepEqual(decideLoopAction({ next: story, tasks, gate: { findings: [] }, cycle: 1, cap: 3 }), {
        act: "drive", ref: "53/01", phase: "verify", cycle: 1,
      });
      const findings = [{ code: "red-a" }, { code: "red-b" }];
      assert.deepEqual(decideLoopAction({ next: story, tasks, gate: { findings }, cycle: 1, cap: 3 }), {
        act: "drive", ref: "53/01", phase: "continue", cycle: 2, findings,
      });
    },
  },
  {
    name: "loop gate order — cycle greater than or equal to cap halts every repeated phase",
    run() {
      for (const [cap, cycle] of [[1, 1], [3, 3], [3, 4]]) {
        const result = decideLoopAction({ next: story, tasks, gate: { findings: 2 }, cycle, cap });
        assert.deepEqual(result, { act: "halt", stop: "cap-exhausted", producer: "engine:cycle>=cap", ref: "53/01", phase: "continue", cycle, cap });
      }
      assert.equal(decideLoopAction({ next: story, tasks, lastPhase: "verify", cycle: 3, cap: 3 }).stop, "cap-exhausted");
      assert.equal(decideLoopAction({ next: { ...story, ref: "53/02" }, tasks, cap: 3 }).cycle, 1);
      assert.deepEqual(decideLoopAction({ next: story, tasks, gate: { findings: [] }, cycle: 3, cap: 3 }), {
        act: "drive", ref: "53/01", phase: "verify", cycle: 1,
      });
      assert.deepEqual(decideLoopAction({ next: story, tasks, gate: { findings: [] }, cycle: 4, cap: 3 }), {
        act: "drive", ref: "53/01", phase: "verify", cycle: 1,
      });
    },
  },
  {
    name: "loop gate order — cap and cycle accept only supplied positive safe integers",
    run() {
      for (const cap of [undefined, null, 0, -1, 2.5, "3", Infinity, NaN, true]) {
        assert.equal(resolveLoopBound(cap).code, "loop-bound-unresolved");
      }
      for (const cap of [1, 2, 3, 5, 10]) assert.deepEqual(resolveLoopBound(cap), { admitted: true, cap });
      assert.equal(decideLoop({ scope: "53", level: "L3" }).code, "loop-bound-unresolved");
      assert.equal(decideLoop({ scope: "53", level: "L3", cap: 3 }).code, "loop-level-gate");
      assert.equal(decideLoop({ scope: "53/01", level: "L2" }).code, "loop-scope-unsupported");
      assert.equal(decideLoop({ scope: "53", level: "L2" }).code, "loop-bound-unresolved");
      for (const cycle of [0, -1, 1.5, "2"]) {
        const result = decideLoop({ scope: "53", level: "L2", cap: 3, cycle });
        assert.equal(result.code, "loop-bound-unresolved", String(cycle));
        assert.equal(result.field, "cycle", String(cycle));
        assert.equal(result.value, cycle, String(cycle));
      }
    },
  },
  {
    name: "loop gate order — caller-selected caps produce the exact arithmetic table",
    run() {
      for (const cap of [1, 2, 3, 5, 10]) {
        const result = decideLoopAction({ next: story, tasks, gate: { findings: 1 }, cycle: 2, cap });
        if (cap <= 2) assert.equal(result.stop, "cap-exhausted");
        else assert.deepEqual(result, { act: "drive", ref: "53/01", phase: "continue", cycle: 3, findings: 1 });
      }
    },
  },
];
