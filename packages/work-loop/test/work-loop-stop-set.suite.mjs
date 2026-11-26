import assert from "node:assert/strict";
import {
  LOOP_REFUSALS,
  LANE_STOPS,
  LOOP_STOPS,
  OPERATOR_STOPS,
  REPAIRABLE_STOPS,
  decideHaltRepair,
  decideLoop,
  decideLoopAction,
  mapStoreRefusal,
  sessionLendFor,
} from "../src/engine.mjs";
import { workLoopStoryFixturesFor } from "./support/work-loop-story-fixtures.mjs";

const base = {
  next: { state: "ready", ref: "53/01", type: "story" },
  tasks: { tasks: [{ counts: { uat: 0 } }] },
  phase: "continue",
  cycle: 1,
  cap: 3,
};

// 147/00 — THE REPAIRABLE STOPS AND THE HAND-OVER DECISION, WIDENED (2026-11-14). 147 handed over
// only the three lane stops; the loop now tries its best before stopping, so every stop is handed to
// a repair session EXCEPT the operator's own five — a UAT sign-off, a question already waiting on
// the operator, the operator's Stop, a retry parked on a session limit, and the operator's time
// budget. The engine declares both sets as exports and decides the hand-over purely; `LOOP_STOPS`
// is unchanged by them. The sixteen-row outline covers every stop.
const REPAIR_ROWS = Object.freeze([
  ["lane-open-failed", "repair"],
  ["lane-merge-refused", "repair"],
  ["lane-merge-conflict", "repair"],
  ["uat-gate", "stop"],
  ["dependency-blocked", "repair"],
  ["cap-exhausted", "repair"],
  ["deadline-exhausted", "stop"],
  ["progress-exhausted", "repair"],
  ["no-progress", "repair"],
  ["grade-indeterminate", "repair"],
  ["session-needs-input", "stop"],
  ["run-not-retryable", "repair"],
  ["retry-parked", "stop"],
  ["unmapped-item-type", "repair"],
  ["operator-interrupt", "stop"],
  // 209/03 — resync is the operator's request, so a board conflict is never handed to a repair.
  ["board-conflict", "stop"],
]);

export const workLoopStopSetTests = [
  {
    name: "147/00 R1 (widened) — REPAIRABLE_STOPS is every loop stop that is not one of the operator's six, both frozen, and LOOP_STOPS is unchanged by them",
    run() {
      assert.equal(Object.isFrozen(REPAIRABLE_STOPS), true);
      assert.equal(Object.isFrozen(OPERATOR_STOPS), true);
      assert.deepEqual([...OPERATOR_STOPS].sort(), ["board-conflict", "deadline-exhausted", "operator-interrupt", "retry-parked", "session-needs-input", "uat-gate"]);
      assert.deepEqual([...REPAIRABLE_STOPS], LOOP_STOPS.filter((stop) => !OPERATOR_STOPS.includes(stop)), "every non-operator stop, in LOOP_STOPS' order");
      assert.deepEqual([...LANE_STOPS], LOOP_STOPS.slice(12, 15), "the lane stops are LOOP_STOPS' members 13-15, in their order");
      for (const stop of LANE_STOPS) assert.ok(REPAIRABLE_STOPS.includes(stop), `${stop} is still repairable`);
      assert.equal(LOOP_STOPS.length, 16, "LOOP_STOPS gains only 209/03's board-conflict");
      for (const stop of OPERATOR_STOPS) assert.ok(LOOP_STOPS.includes(stop), `${stop} is a loop stop`);
    },
  },
  {
    name: "147/00 R2 (widened) [outline] the engine hands over every stop but the operator's — decideHaltRepair over every stop with repair on and no earlier repair (16 rows)",
    run() {
      assert.equal(REPAIR_ROWS.length, LOOP_STOPS.length, "the outline covers every stop");
      assert.deepEqual(REPAIR_ROWS.map(([stop]) => stop).sort(), [...LOOP_STOPS].sort(), "…and names each exactly once");
      for (const [stop, answer] of REPAIR_ROWS) {
        assert.equal(decideHaltRepair({ stop, repairOn: true, priorRepair: null }), answer, `${stop} → ${answer}`);
        assert.equal(decideHaltRepair({ stop }), answer, `${stop}: repair on and no prior repair are the defaults`);
      }
    },
  },
  {
    name: "147/00 R1 — repair turned off answers stop for every repairable stop; 147/01 R3 — one repair per halt: an earlier repair answers stop",
    run() {
      for (const stop of REPAIRABLE_STOPS) {
        assert.equal(decideHaltRepair({ stop, repairOn: false }), "stop", `${stop}: off`);
        assert.equal(decideHaltRepair({ stop, repairOn: undefined }), "repair", `${stop}: an absent switch is on`);
        assert.equal(decideHaltRepair({ stop, repairOn: "true" }), "stop", `${stop}: only the boolean true is on`);
        assert.equal(decideHaltRepair({ stop, repairOn: true, priorRepair: { runId: "R1" } }), "stop", `${stop}: a prior repair run stops`);
        assert.equal(decideHaltRepair({ stop, repairOn: true, priorRepair: "R1" }), "stop", `${stop}: any non-null prior repair stops`);
      }
      for (const stop of OPERATOR_STOPS) assert.equal(decideHaltRepair({ stop, repairOn: true, priorRepair: null }), "stop", `${stop} is the operator's: never repaired, whatever the switch`);
      assert.equal(decideHaltRepair(), "stop", "no stop at all is a stop");
    },
  },
  {
    name: "147/02 — the repair session is lent the CONTINUE phase's flag parts, and SESSION_PHASES gains no fourth row",
    run() {
      const declaration = {
        sessions: {
          refine: { model: "fable", modelSource: "--model", effort: "xhigh", effortSource: "--model" },
          continue: { model: "opus", modelSource: "--model", effort: "high", effortSource: "--thinking" },
          verify: { model: null, modelSource: "default", effort: "high", effortSource: "default" },
        },
      };
      assert.deepEqual(sessionLendFor(declaration, "repair"), sessionLendFor(declaration, "continue"), "repair lends what continue lends");
      assert.deepEqual(sessionLendFor(declaration, "repair"), { model: "opus", thinking: "high" });
      assert.deepEqual(sessionLendFor({ sessions: { ...declaration.sessions, continue: { model: "opus", modelSource: "config", effort: "high", effortSource: "config" } } }, "repair"), {}, "config-sourced parts are not lent — the repair drive resolves them from the same config");
      assert.equal("repair" in declaration.sessions, false, "the declaration's table stays the three phases");
    },
  },
  {
    name: "loop stop set — the shared story fixtures stay executable",
    run() {
      for (const { name, args, expected } of workLoopStoryFixturesFor("stop-set")) {
        assert.deepEqual(decideLoopAction(...args), expected, name);
      }
    },
  },
  {
    name: "loop stop set — stops and pre-start refusals are distinct frozen vocabularies",
    run() {
      assert.equal(Object.isFrozen(LOOP_STOPS), true);
      // 129/01 (ADR-008 §5) — the three lane stops, APPENDED LAST: the twelve before them keep
      // their names and their order. 209/03 appends the board conflict after them.
      assert.deepEqual(LOOP_STOPS, ["uat-gate", "dependency-blocked", "cap-exhausted", "deadline-exhausted", "progress-exhausted", "no-progress", "grade-indeterminate", "session-needs-input", "run-not-retryable", "retry-parked", "unmapped-item-type", "operator-interrupt", "lane-open-failed", "lane-merge-refused", "lane-merge-conflict", "board-conflict"]);
      // 102/00 — the sixth member, APPENDED LAST: the five prior codes keep their order.
      assert.deepEqual(LOOP_REFUSALS, ["loop-scope-unsupported", "loop-level-locked", "loop-level-gate", "loop-level-unknown", "loop-bound-unresolved", "loop-id-missing"]);
      assert.deepEqual(LOOP_REFUSALS.slice(0, 5), ["loop-scope-unsupported", "loop-level-locked", "loop-level-gate", "loop-level-unknown", "loop-bound-unresolved"]);
      assert.equal(LOOP_REFUSALS.at(-1), "loop-id-missing");
      assert.equal(LOOP_STOPS.some((id) => /infeasible|open-decision/.test(id)), false);
      const decision = decideLoop({ scope: "53", level: "L2", ...base });
      assert.deepEqual(decision.stops, LOOP_STOPS);
    },
  },
  {
    name: "loop stop set — session outcomes decide from codes, never message text",
    run() {
      for (const message of ["the scenario is infeasible", "an open decision"]) {
        const result = decideLoopAction({ ...base, session: { outcome: "needs-input", sessionId: "sess-9f2", message } });
        assert.equal(result.stop, "session-needs-input");
        assert.equal(result.producer, "session-driver:outcome=needs-input");
        assert.equal(result.message, message);
      }
      assert.deepEqual(decideLoopAction({ ...base, session: { outcome: "done", sessionId: "sess-1" }, lastPhase: "continue" }), {
        act: "gate", ref: "53/01", command: "work:validate",
      });
      assert.deepEqual(decideLoopAction({ ...base, session: { outcome: "failed" }, storeAnswer: { started: true, runId: "run-2", attempt: 2 } }), {
        act: "drive", ref: "53/01", phase: "continue", cycle: 1, runId: "run-2", attempt: 2,
      });
    },
  },
  {
    name: "loop stop set — store refusals map closed and fail closed",
    run() {
      assert.equal(mapStoreRefusal({ code: "duplicate-run" }), null);
      assert.equal(mapStoreRefusal({ code: "no-retryable-run" }), null);
      assert.deepEqual(mapStoreRefusal({ code: "not-retryable" }), { stop: "run-not-retryable", producer: "run-store:not-retryable" });
      assert.deepEqual(mapStoreRefusal({ code: "attempts-exhausted" }), { stop: "cap-exhausted", producer: "run-store:attempts-exhausted" });
      assert.deepEqual(mapStoreRefusal({ code: "retry-parked", readyAt: "2026-08-15T01:10:00.000Z" }), { stop: "retry-parked", producer: "run-store:retry-parked", readyAt: "2026-08-15T01:10:00.000Z" });
      assert.deepEqual(mapStoreRefusal({ code: "some-future-code" }), { stop: "run-not-retryable", producer: "run-store:some-future-code" });
      assert.deepEqual(mapStoreRefusal(), { stop: "run-not-retryable", producer: "run-store:absent" });
      const readyAt = { iso: ["later"] };
      const first = mapStoreRefusal({ code: "retry-parked", readyAt });
      const second = mapStoreRefusal({ code: "retry-parked", readyAt });
      first.readyAt.iso.push("changed");
      assert.deepEqual(readyAt, { iso: ["later"] });
      assert.deepEqual(second.readyAt, { iso: ["later"] });
    },
  },
  {
    name: "loop stop set — all six simultaneous-fact rows decide exactly one precedence winner",
    run() {
      const rows = [
        {
          name: "SIGINT outranks every other fact",
          input: {
            ...base,
            signal: "SIGINT",
            cycle: 3,
            cap: 3,
            next: { state: "ready", ref: "53/01", type: "uat" },
            session: { outcome: "needs-input", sessionId: "s" },
            storeAnswer: { code: "attempts-exhausted" },
          },
          stop: "operator-interrupt",
          producer: "launcher:signal=SIGINT",
        },
        {
          name: "needs-input outranks a spent cycle",
          input: { ...base, cycle: 3, cap: 3, session: { outcome: "needs-input", sessionId: "s" } },
          stop: "session-needs-input",
          producer: "session-driver:outcome=needs-input",
        },
        {
          name: "needs-input outranks the store's exhausted refusal",
          input: {
            ...base,
            session: { outcome: "needs-input", sessionId: "s" },
            storeAnswer: { code: "attempts-exhausted" },
          },
          stop: "session-needs-input",
          producer: "session-driver:outcome=needs-input",
        },
        {
          name: "the store's non-retryable refusal outranks a spent cycle",
          input: {
            ...base,
            cycle: 3,
            cap: 3,
            session: { outcome: "failed" },
            storeAnswer: { code: "not-retryable" },
          },
          stop: "run-not-retryable",
          producer: "run-store:not-retryable",
        },
        {
          name: "the store's parked retry outranks a ready UAT item",
          input: {
            ...base,
            next: { state: "ready", ref: "53/06", type: "uat" },
            session: { outcome: "failed" },
            storeAnswer: { code: "retry-parked", readyAt: "2026-08-15T01:10:00.000Z" },
          },
          stop: "retry-parked",
          producer: "run-store:retry-parked",
        },
        {
          name: "a spent cycle outranks a ready UAT item",
          input: { ...base, cycle: 3, cap: 3, next: { state: "ready", ref: "53/06", type: "uat" } },
          stop: "cap-exhausted",
          producer: "engine:cycle>=cap",
        },
      ];

      for (const row of rows) {
        const result = decideLoopAction(row.input);
        assert.equal(result.stop, row.stop, row.name);
        assert.equal(result.producer, row.producer, row.name);
        assert.equal(
          Object.values(result).filter((value) => LOOP_STOPS.includes(value)).length,
          1,
          `${row.name}: exactly one stop id`,
        );
      }
    },
  },

  // ── 129/01 task 03 — the three lane stops join the closed set (ADR-008 §5) ──
  // Traceability: 129/01/tasks/03_the-wave-is-decided-purely.feature, "the three lane stops are
  // the closed set's last three members". The twelve are asserted BY NAME AND POSITION and the
  // three by position 13-15, so a stop slipped in ahead of them, or a renamed member, is a red
  // here rather than a count that still happens to be fifteen.
  {
    name: "129/01/03 the three lane stops are the closed set's last three members, the twelve before them are unrenamed, and the refusals are untouched",
    run() {
      assert.equal(LOOP_STOPS.length, 16);
      assert.equal(Object.isFrozen(LOOP_STOPS), true);
      assert.deepEqual(LOOP_STOPS.slice(12, 15), ["lane-open-failed", "lane-merge-refused", "lane-merge-conflict"], "members 13, 14 and 15, in that order");
      assert.equal(LOOP_STOPS[15], "board-conflict", "209/03 appends the board conflict as member 16");
      assert.deepEqual(LOOP_STOPS.slice(0, 12), [
        "uat-gate", "dependency-blocked", "cap-exhausted", "deadline-exhausted", "progress-exhausted", "no-progress",
        "grade-indeterminate", "session-needs-input", "run-not-retryable", "retry-parked", "unmapped-item-type", "operator-interrupt",
      ], "the first twelve, in their order");
      assert.deepEqual([...LOOP_REFUSALS], ["loop-scope-unsupported", "loop-level-locked", "loop-level-gate", "loop-level-unknown", "loop-bound-unresolved", "loop-id-missing"], "LOOP_REFUSALS is untouched");
      const decision = decideLoop({ scope: "53", level: "L2", ...base });
      assert.equal(decision.admitted, true);
      assert.deepEqual(decision.stops, [...LOOP_STOPS], "an admitted answer reports the closed set in full, lane stops included");
    },
  },
];
