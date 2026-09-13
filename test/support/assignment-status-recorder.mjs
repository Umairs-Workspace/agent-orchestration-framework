// test/support/assignment-status-recorder.mjs — THE ONE HOME for the injected
// assignment-report recorder.
//
// WHY THIS FILE EXISTS, measured rather than preferred. Two fixture families needed
// this double and each kept its own copy: `mesh-worker-exec-fixture.mjs` (milestone
// 35's execution family) and `mesh-worker-clone-fixture.mjs` (milestone 38's
// clone-on-miss family), the latter's header stating in terms that it "mirrors
// mesh-worker-exec-fixture.mjs's recorder exactly" and was "kept local so this module
// has no cross-dependency on the m35 fixture".
//
// It stopped mirroring it. Milestone 42 wave (d) leg d3 moved every TERMINAL report
// off `sendAssignmentStatus` and onto the durable journal -> outbox path, updated the
// m35 copy to record both channels, and left the m38 copy recording one. The m38
// suites then asserted "the worker streams the loud coded failed" against a transport
// the worker had stopped using, and went red — 22 failures whose message ("exactly one
// frame is streamed: 0 !== 1") named the symptom and not one of which named the cause.
// The production behaviour was correct throughout: the failure IS reported, loudly and
// durably, on the channel that replaced the one the fixture watched.
//
// A duplicated double that claims to mirror another is a claim nothing checks. The
// no-cross-dependency preference is what allowed the drift, and it cost more than it
// saved, so the double moves to one home that both families import. Neither fixture
// depends on the other.
//
// WHAT IT STANDS FOR — one question: "what did the worker report about this
// assignment?" Both channels land in `frames`, in order:
//   - POSTURE (accepted / running / needs-input / resumed) rides
//     `sendAssignmentStatus`, best-effort, exactly as it always did.
//   - a TERMINAL report (done / failed) is a FACT: it is raised into the worker's
//     journal and shipped as an `effect-step` envelope, so a dropped connection
//     redelivers it instead of losing it. The envelope's payload carries the same
//     { assignmentId, state, runId, sessionId, branch, code } evidence the status
//     frame did, so a recorded entry is shape-identical either way and an assertion
//     written before wave (d) reads the same after it.
// `statusFrames` / `effectSteps` are there for a test that needs to prove WHICH
// channel carried something.
export function createStatusRecorder() {
  const frames = [];
  const statusFrames = [];
  const effectSteps = [];
  return {
    frames,
    statusFrames,
    effectSteps,
    async sendAssignmentStatus(assignmentId, state, options = {}) {
      const frame = { assignmentId, state, ...options };
      frames.push(frame);
      statusFrames.push(frame);
      return { sent: true };
    },
    async sendEffectStep(envelope = {}) {
      effectSteps.push(envelope);
      const payload = envelope.payload ?? {};
      const { assignmentId, state, runId, sessionId, branch, code } = payload;
      // Drop the null placeholders the payload always carries so a recorded entry
      // matches the sparse shape the status frame produced (a test asserting
      // `f.code` must not see `code: null` where the old frame had no key). Session id
      // is different: an owned `sessionId: null` is the producer's explicit absence
      // signal and must survive the fixture projection.
      const extras = Object.fromEntries(
        Object.entries({ runId, branch, code }).filter(([, value]) => value != null),
      );
      if (Object.hasOwn(payload, "sessionId")) extras.sessionId = sessionId;
      frames.push({ assignmentId, state, ...extras });
      return { sent: true };
    },
  };
}
