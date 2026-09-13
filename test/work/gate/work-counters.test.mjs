// Traceability for milestone 57 / story 04 (tasks 00–02), and — added beside them by
// milestone 61 / story 04 — the TRIAL METRIC that lands in this same leaf:
//
//   61/04 tasks/03_the-trial-metric-is-declared-not-named.feature
//
// `roundsToAccept` is the metric the acceptor points at (61/ADR-002 §1, §7). Putting it
// anywhere else would open a second deterministic-counter home, so its rows land here,
// beside the counter-metric it is paired with.
import assert from "node:assert/strict";

import {
  LOWER_IS_BETTER,
  countFindingEscapes,
  countInterventions,
  computeWorkCounters,
  roundsToAccept,
} from "../../../src/work/counters.mjs";
import { checkPairing } from "../../../src/work/loops-checks.mjs";

const raw = (id, at) => ({ kind: "raw", id, text: id, actor: "qa", refs: "", at });
const accepted = (ref, feedbackRecords = [], acceptedAt = "2026-08-20T12:00:00.000Z") => ({
  ref,
  status: "done",
  acceptedAt,
  feedbackRecords,
  runs: [],
});
const run = (runId, overrides = {}) => ({
  runId,
  state: "done",
  outcome: "done",
  attempt: 1,
  retryOf: null,
  failureReason: null,
  resumeAfter: null,
  ...overrides,
});
const withRuns = (ref, runs) => ({ ref, status: "in-progress", acceptedAt: null, feedbackRecords: [], runs });

export const workCountersTests = [
  {
    name: "57/04 task 00: escapes are post-acceptance raw findings, attributed per item and totalled over scope",
    run() {
      const input = [
        accepted("57/00", [
          raw("before", "2026-08-20T11:59:00.000Z"),
          raw("after-a", "2026-08-20T12:01:00.000Z"),
          raw("after-b", "2026-08-21T09:00:00.000Z"),
          { kind: "classification", id: "class-a", raw: "after-a", at: "2026-08-21T10:00:00.000Z", classification: { type: "mistake" } },
        ]),
        accepted("57/01", [raw("after-c", "2026-08-22T09:00:00.000Z")]),
        { ref: "57/02", status: "in-progress", acceptedAt: null, feedbackRecords: [raw("bench", "2026-08-22T09:00:00.000Z")], runs: [] },
      ];
      const before = structuredClone(input);
      const result = countFindingEscapes(input);
      assert.equal(result.status, "measured");
      assert.equal(result.count, 3);
      assert.deepEqual(result.items.map((item) => [item.ref, item.count]), [["57/00", 2], ["57/01", 1]]);
      assert.deepEqual(result.items[0].escapes.map((entry) => entry.id), ["after-a", "after-b"]);
      assert.equal(result.feedbackRecords, 4, "classification records do not enter the counter's denominator");
      assert.deepEqual(input, before, "the counter mutates no supplied record");

      const secondPass = countFindingEscapes([
        accepted("57/03", [raw("review-one", "2026-08-19T08:00:00.000Z"), raw("review-two", "2026-08-20T11:00:00.000Z")]),
      ]);
      assert.equal(secondPass.count, 0, "findings from repeated review before acceptance are not escapes");
    },
  },
  {
    name: "57/04 task 01: retries, resumes, exhausted ceilings and non-retryable failures are interventions",
    run() {
      const clean = countInterventions([withRuns("57/00", [run("a1")])]);
      assert.equal(clean.count, 0);
      assert.equal(clean.runs, 1);

      const retried = countInterventions([withRuns("57/01", [
        run("b1", { state: "failed", outcome: "failed", failureReason: "timeout" }),
        run("b2", { attempt: 2, retryOf: "b1" }),
      ])]);
      assert.equal(retried.count, 1);
      assert.equal(retried.items[0].interventions[0].kind, "retry");

      const resumed = countInterventions([withRuns("57/02", [
        run("c1", { state: "failed", outcome: "failed", failureReason: "session_limit", resumeAfter: "2026-08-20T13:00:00.000Z" }),
        run("c2", { attempt: 2, retryOf: "c1" }),
      ])]);
      assert.equal(resumed.count, 1);
      assert.equal(resumed.items[0].interventions[0].kind, "resume");

      const thirdAttempt = countInterventions([withRuns("57/03", [
        run("d1", { state: "failed", outcome: "failed", failureReason: "timeout" }),
        run("d2", { state: "failed", outcome: "failed", attempt: 2, retryOf: "d1", failureReason: "timeout" }),
        run("d3", { state: "failed", outcome: "failed", attempt: 3, retryOf: "d2", failureReason: "agent_error" }),
      ])]);
      assert.equal(thirdAttempt.count, 2, "each retry in a three-attempt lineage counts once, even when the last retry fails");

      const terminal = countInterventions([
        withRuns("57/04", [run("e1", { state: "failed", outcome: "failed", attempt: 3, failureReason: "timeout" })]),
        withRuns("57/05", [run("f1", { state: "failed", outcome: "failed", failureReason: "agent_error" })]),
      ], { maxAttempts: 3 });
      assert.equal(terminal.count, 2);
      assert.deepEqual(terminal.items.map((item) => [item.ref, item.count]), [["57/04", 1], ["57/05", 1]]);
      assert.deepEqual(terminal.items.map((item) => item.interventions[0].kind), ["attempts-exhausted", "non-retryable-failure"]);

      const tenRuns = Array.from({ length: 10 }, (_, index) => run(`g${index}`, index < 2
        ? { state: "failed", outcome: "failed", failureReason: "agent_error" }
        : {}));
      const rate = countInterventions([withRuns("57", tenRuns)]);
      assert.equal(rate.count, 2);
      assert.equal(rate.runs, 10);
      assert.equal(rate.rate, 0.2);
    },
  },
  {
    name: "57/04 task 02: absent evidence is unmeasurable, real zero is measured, and partial scope stays explicit",
    run() {
      const none = computeWorkCounters([]);
      assert.equal(none.escape.status, "unmeasurable");
      assert.equal(none.intervention.status, "unmeasurable");
      assert.equal(Object.hasOwn(none.escape, "count"), false);
      assert.equal(Object.hasOwn(none.intervention, "count"), false);

      const noFeedback = countFindingEscapes([accepted("57/00")]);
      assert.equal(noFeedback.status, "unmeasurable");
      assert.equal(noFeedback.reason, "feedback-absent");

      const noAcceptance = countFindingEscapes([
        { ref: "57/00", status: "in-progress", acceptedAt: null, feedbackRecords: [raw("x", "2026-08-20T13:00:00.000Z")] },
      ]);
      assert.equal(noAcceptance.reason, "accepted-items-absent");

      const realZero = countFindingEscapes([
        accepted("57/00", [raw("before", "2026-08-20T11:00:00.000Z")]),
      ]);
      assert.equal(realZero.status, "measured");
      assert.equal(realZero.count, 0);
      assert.notDeepEqual(realZero, noFeedback);

      const partial = countInterventions([
        withRuns("57/00", [run("p1")]),
        withRuns("57/01", []),
      ]);
      assert.equal(partial.status, "measured");
      assert.equal(partial.count, 0);
      assert.equal(partial.measuredItems, 1);
      assert.equal(partial.unmeasuredItems, 1);
      assert.deepEqual(partial.missing, ["57/01"]);

      // Pairing is structural: a different node's monitoring edge remains present
      // even while its separately reported counter result is unmeasurable.
      const pairing = checkPairing({ nodes: [
        { id: "loop:review", kind: "loop", path: "loop.md", fields: { optimizing: { value: true } }, edges: {} },
        { id: "counter:escape", kind: "actor", path: "counter.md", fields: {}, edges: { monitoring: [{ raw: "loop:review" }] } },
      ] });
      assert.equal(pairing.some((finding) => finding.code === "loop-unpaired-optimizer"), false);
      assert.equal(noFeedback.status, "unmeasurable", "the counter's own output still exposes missing evidence");
    },
  },
  {
    name: "61/04 task 03: the trial metric is measurable only where the attribution is, and says which reading it could not take",
    run: () => {
      const attributedRun = (runId, sessionId) => ({ runId, sessionId, createdAt: "2026-08-19T09:00:00.000Z", state: "done" });
      const item = (ref, runs, status = "done") => ({ ref, status, acceptedAt: status === "done" ? "2026-08-20T12:00:00.000Z" : null, runs, feedbackRecords: [] });

      // MEASURED: two accepted items, every consumed run attributable to a session.
      const measured = roundsToAccept([
        item("61/00", [attributedRun("a", "s1"), attributedRun("b", "s1")]),
        item("61/01", [attributedRun("c", "s2")]),
      ]);
      assert.equal(measured.status, "measured");
      assert.equal(measured.count, 3, "the rounds an item consumed on its way in");
      assert.equal(measured.measuredItems, 2);
      assert.equal(measured.value, 1.5, "the comparable reading is rounds per accepted item");
      assert.equal(measured.better, LOWER_IS_BETTER, "the metric declares its own polarity");

      // AT HEAD, EVERY ARM IS UNMEASURABLE: `sessionId` is null in 61 of 61 records, so
      // no round can be attributed to a harness configuration. That is reported by name
      // — never as a count of zero, which would say a reading was taken.
      const blind = roundsToAccept([item("61/00", [attributedRun("a", null)])]);
      assert.equal(blind.status, "unmeasurable");
      assert.equal(blind.reason, "run-attribution-absent");
      assert.equal(blind.value, null, "an unmeasurable reading is null, never 0");
      assert.deepEqual(blind.missing, ["61/00"]);

      // A population with nothing accepted is a DIFFERENT unmeasurable, named
      // differently: nothing was accepted, so there was nothing to time.
      const unaccepted = roundsToAccept([item("61/02", [attributedRun("a", "s1")], "in-progress")]);
      assert.equal(unaccepted.reason, "accepted-items-absent");
      assert.equal(roundsToAccept([]).reason, "accepted-items-absent");

      // A run minted AFTER acceptance belongs to whatever happened next.
      const after = roundsToAccept([{
        ref: "61/03",
        status: "done",
        acceptedAt: "2026-08-20T12:00:00.000Z",
        runs: [attributedRun("a", "s1"), { runId: "later", sessionId: "s1", createdAt: "2026-08-25T09:00:00.000Z", state: "done" }],
        feedbackRecords: [],
      }]);
      assert.equal(after.count, 1, "…and is not a round the item consumed on its way in");
      assert.equal(after.items[0].runs, 2);

      // The counter-metric it is PAIRED with reports its own polarity and value too, so
      // the engine reads the direction off the reading rather than knowing the metric.
      const escapes = countFindingEscapes([accepted("61/04", [raw("before", "2026-08-19T00:00:00.000Z"), raw("after", "2026-08-21T00:00:00.000Z")])]);
      assert.equal(escapes.better, LOWER_IS_BETTER);
      assert.equal(escapes.value, escapes.count);
      assert.equal(countInterventions([withRuns("61/05", [run("p1")])]).better, LOWER_IS_BETTER);
      assert.equal(countFindingEscapes([]).value, null);
    },
  },
];
