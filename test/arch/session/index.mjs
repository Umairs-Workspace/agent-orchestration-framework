// THE ARCH/SESSION SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 53 / story 05 — architectural fitness functions (FF-5301…FF-5311).
import { archTests as acdSessionDriverMeshBlindTests } from "./acd-session-driver-mesh-blind.test.mjs";
import { archTests as acdSessionDriverSingleHomeTests } from "./acd-session-driver-single-home.test.mjs";
import { archTests as acdRawCaptureBeforeClassificationTests } from "./acd-raw-capture-before-classification.test.mjs";
import { archTests as acdSessionVerbBootsNoRegistryTests } from "./acd-session-verb-boots-no-registry.test.mjs";
import { archTests as acdTerminalServerOnlyTests } from "./acd-terminal-server-only.test.mjs";
// ── 46/03's THREE GATES. Each is registered for the clauses it turns GREEN, and only for
// those. `acd-terminal-mirror-geometry-pinned` is green whole: the descriptor's
// `mirror.fixedGeometry` equals the worker's own `ptySpawn` geometry, read from BOTH builds as
// text because they cannot import each other — a property that was true and entirely
// unguarded, and whose own predecessor comment claimed a test file that has never existed.
//
// The other two are SPLIT BY CLAUSE, which is how 46/03's story record rules it. What is
// registered below is everything about `ui/src/terminal/` that passes the day the core lands:
// no module names a port; the socket URL is built by ONE pure builder that reads no browser
// global; the shared set imports no React and touches no DOM global in its modules OR its
// declarations; and it imports nothing from `ui/src/fleet/` or `ui/src/board/`. Those clauses
// matter MOST during 46/04 and 46/05 — the stories that write the React component against this
// `.mjs` set — because ADR-001 makes the framework-free split an INVARIANT rather than a
// preference precisely on the grounds that "no reviewer reliably notices an absence".
//
// Their WHOLE-TREE clauses (no socket URL anywhere in `ui/src` carries a port literal; neither
// `DOCK_STATES` nor `TERMINAL_VIEW_STATES` is defined anywhere in `ui/src`; the five terminal
// hex literals have one home) cannot go green until the duplicate implementation is deleted,
// so they wait in parked siblings that 46/04 promotes in that same diff. They are not named in
// this file: a runner that merely MENTIONS a suite satisfies the registration ratchet by
// substring while nothing imports it, which is the reads-green-asserts-nothing defect
// ADR-006/ADR-007 exist to end. See 46/04's story record. A gate lands in the story that turns
// it GREEN, not the story that writes it.
import { archTests as acdTerminalMirrorGeometryPinnedTests } from "./acd-terminal-mirror-geometry-pinned.test.mjs";
import { archTests as acdTerminalOriginNotPortTests } from "./acd-terminal-origin-not-port.test.mjs";
import { archTests as acdTerminalControlBoundaryTests } from "./acd-terminal-control-boundary.test.mjs";
// …and the gate 46/04 SPLIT OUT of `acd-fleet-terminal-input-constrained`, which had grown two
// subjects under one name: a fleet-page gate carrying a worker-side output producer. Nothing about
// either invariant changed; the detector, its plants and its refusal text moved unchanged. A gate's
// name is the first thing anyone reads about it, and a red line reading `terminal-input` about the
// launcher's output arrow sends the next reviewer to the wrong surface.
import { archTests as acdTerminalOutputSignalSourceTests } from "./acd-terminal-output-signal-source.test.mjs";
import { archTests as acdCostStampedOnceTests } from "./acd-cost-stamped-once.test.mjs";
import { archTests as acdAgentModelSourceMapTests } from "./acd-agent-model-source-map.test.mjs";
import { archTests as acdAgentModelRoleDerivationTests } from "./acd-agent-model-role-derivation.test.mjs";
// milestone 38 — cross-machine worker execution & session presence (ADR-001/002/003/005)
import { archTests as acdSessionPresenceAdditiveTests } from "./acd-session-presence-additive.test.mjs";
import { archTests as acdSessionTtlReusesIsStaleTests } from "./acd-session-ttl-reuses-isstale.test.mjs";
import { archTests as acdSessionRecordFrozenTests } from "./acd-session-record-frozen.test.mjs";
import { archTests as acdSessionTtlSelfExpiresTests } from "./acd-session-ttl-self-expires.test.mjs";
import { archTests as acdSessionRunReconciliationTests } from "./acd-session-run-reconciliation.test.mjs";
import { archTests as acdCapturedProducerFixtureTests } from "./acd-captured-producer-fixture.test.mjs";
// milestone 38 / story 06 — ADR-014 AMENDMENT (2026-07-19, closing BLOCKER F-38.06):
// the transport is a HYBRID (an option-(a) draft was falsified at source — serveRelay
// binds LOOPBACK ONLY, so a worker cannot reach it off-host). Each leg on the bind it
// fits: the CROSS-MACHINE leg (worker -> control) rides the FABRIC (the worker sends a
// terminal-frame UP its stream client; control-stream-server branches it to an
// onTerminalFrame sink BEFORE applyStreamFrame — never persisted); the SAME-MACHINE
// leg (control -> the SEPARATE aof mesh ui process) is a LOOPBACK relay on the KNOWN
// port named in config.mesh.relay.url. acd-terminal-stream-transport-wired makes that
// hybrid producer wiring structurally REQUIRED (onOutputChunk -> client.sendTerminalFrame,
// control's onTerminalFrame + a known-port broker, the fleet's loopback subscriber), so
// the feature cannot ship inert again. The build lands in src/worker-stream-client.mjs
// (sendTerminalFrame), src/mesh/launcher.mjs (the worker fabric producer + the control
// known-port broker + onTerminalFrame bridge), src/control-stream-server.mjs (the
// terminal-frame branch), and src/cli.mjs (the loopback subscriber).
// meshTerminalStreamRelayTransportWiredTests is the PRODUCER-FED behavioural companion:
// a REAL worker-stream-client -> a REAL control-stream-server (fabric leg; onTerminalFrame
// gets the connection-bound nodeId, the store stays empty) -> a REAL serveRelay loopback
// broker -> a REAL createTerminalMirror -> a REAL serveMeshUi /ws/terminal-view client
// observes the exact bytes end-to-end, and an unroutable frame is dropped over the same
// real chain.
import { archTests as acdTerminalStreamTransportWiredTests } from "./acd-terminal-stream-transport-wired.test.mjs";
// milestone 38 / story 06 — ARMED RED-UNTIL-FIXED BY DESIGN (the F17 precedent). Two
// open findings from the 2026-07-23 reviews, each pinned so a known-inert seam cannot
// read green: (a) ADR-013 inv.7 — the captured session id is REPORTED only when the run
// reaches a terminal state, so the fleet card resolves `no-session` for the whole live
// run; (b) ADR-014 inv.8 / BLOCKER F-38.06e — the terminal-frame protocol has NO
// end-of-stream marker and the route unsubscribes only on the BROWSER's close, so
// DESIGN V9's `ended` is unreachable from a real session end and an open view sits on
// `streaming`/live forever. The two REAL-SOURCE lanes fail today and go GREEN when the
// producers land (RED again if reverted); the two SYNTHESIZED self-check lanes pass
// regardless of tree state, proving the detectors correct rather than merely red.
import { archTests as acdTerminalViewLiveObservableTests } from "./acd-terminal-view-live-observable.test.mjs";
// ── milestone 48 / story 00 — THE SESSION ID OF RECORD (ADR-001 the ordered ladder,
// ADR-002 the 4-part key + the re-frozen SEVEN-key record, ADR-006 the orphan reaper at the
// write seam, ADR-010 R1 the escaped 4th segment + R5 the injected unlink seam). The
// PRODUCER dimension only: `src/mesh/session.mjs` + `src/commands/mesh-session.mjs`, no
// wire change.
//   the three new fitness functions — the id is READ never made (#1), one live session is
//   one record and an `end` cannot kill a sibling (#2), and a TTL-expired record is REMOVED
//   by the owning node under the SHARED predicate (#3). `acd-session-record-frozen` is
//   AMENDED IN PLACE (#7, its own m38 file) rather than forked into a sibling.
import { archTests as acdSessionIdNeverFabricatedTests } from "./acd-session-id-never-fabricated.test.mjs";
import { archTests as acdSessionLeafPerSessionTests } from "./acd-session-leaf-per-session.test.mjs";
import { archTests as acdSessionOrphanReapedTests } from "./acd-session-orphan-reaped.test.mjs";
// ── milestone 48 / story 01 — THE SESSION ON THE PRESENCE WIRE (ADR-005, with ADR-001's
// present-and-null clause and ADR-009's one-home clause). `readLiveSessions`
// (src/mesh/presence.mjs) projects every live session record to the FROZEN ORDERED SIX
// `{ sessionId, workspaceId, repo, assistant, lastPingAt, workspaceHasRun }` — an
// insertion at the head and an append at the tail, so the m38 four keep their relative
// order — and `ui/src/fleet/api.ts`'s `PresenceSession` is its typed mirror. The story is
// BEHAVIOUR-NEUTRAL by contract: the injected `workspacesWithRuns` set DEFAULTS TO EMPTY,
// so every entry reports `workspaceHasRun: false`, the launcher's own filter still runs,
// and no rendered output moves until story 02 lands.
//   the fitness function — the ordered six off the REAL producer, `sessionId`
//   present-and-null for an anonymous/pre-m48 record, the typed mirror's declaration, and
//   `applyPresenceFrame`'s `safeSessionArray` still an ENTRY-level guard with NO per-field
//   whitelist (the change that would silently drop this milestone's key in transit while
//   every other test stayed green). GREEN ON ARRIVAL — it pins the contract this story
//   delivers.
import { archTests as acdSessionEntryFrozenWireTests } from "./acd-session-entry-frozen-wire.test.mjs";
//   the AMENDED fitness function `acd-session-run-reconciliation` (#8) is already imported
//   with m38's block above — its central assertion INVERTS in this change and its
//   self-check inverts with it.
// ── milestone 48 / story 03 — THE FLEET-SIDE SESSION INDEX (ADR-007, with ADR-003's
// authority split, ADR-009's no-new-sibling clause and ADR-010 R2's miss ruling).
// `buildSessionIndex({ nodes, assignments, now })` — a named export of the module that
// already IS the control node's no-I/O shaper — answers "what live sessions exist across
// the mesh" as an O(1) lookup on `(nodeId, sessionId)` plus a deterministic array, and the
// payload grows by ONE additive key, `sessions`. A PROJECTION, never a table: the source of
// truth is a TTL-expiring disk record, so a table would give the control node its own row
// lifetime and therefore its own expiry rule — a second authority over liveness.
//   the two fitness functions — the index is DERIVED, not stored (no session-index table
//   anywhere, no I/O, no cache, no composed `nodeId::sessionId` key, the freshness gate on
//   the fact the registry ALREADY derived, no session-level TTL re-evaluation, and a miss
//   that is explicitly `null`); and attribution has a SINGLE AUTHORITY (`workItem` derives
//   onto the session at the index and is stored nowhere, joined on BOTH columns, with a
//   free session's `workItem: null` present and first-class).
import { archTests as acdSessionIndexDerivedNotStoredTests } from "./acd-session-index-derived-not-stored.test.mjs";
import { archTests as acdSessionAttributionSingleAuthorityTests } from "./acd-session-attribution-single-authority.test.mjs";
// …and the story's TWO source-shape gates, lifted out of that traceability suite because
// they are invariants of the TREE rather than facts about one story's scenarios (and a
// structural claim asserted only where the feature is tested is a claim nobody checks
// when the next lane arrives):
//   · acd-session-worktree-lane-scoped — the handler is a SIBLING of
//     mesh-worker-execution.mjs (no import, no resolveProvider, one PTY factory), and the
//     session lane's worktrees live in their OWN root. The second half implements
//     TECH_DEBT 47's prescribed ratchet: every src/ module naming the ASSIGNMENT lane's
//     seam is allowlisted with a reason, because that root's every directory name is read
//     back as an assignmentId at worker start (measured: a `session-50` directory made the
//     launcher report a failed/daemon-restarted assignment that never existed).
//   · acd-session-input-lane-fallthrough — `client.onTerminalInput` holds ONE handler, so
//     the launcher orders both lanes; the launched lane may CLAIM a frame but may never
//     STARVE the assignment lane (no `try` block contains both calls).
import { archTests as acdSessionWorktreeLaneScopedTests } from "./acd-session-worktree-lane-scoped.test.mjs";
import { archTests as acdSessionInputLaneFallthroughTests } from "./acd-session-input-lane-fallthrough.test.mjs";
// …and the story's THREE new gates (ADR-008 decision 11's FF-A/FF-B/FF-F; FF-C/FF-D are
// clauses inside the four route-table detectors and FF-E is the amended producer-site
// ceiling, all already registered below):
//   · acd-session-spawn-ack-has-reader — the ack is branched BEFORE any store apply, wired
//     as a LITERAL production key, and re-stamped with the connection-bound nodeId (F17 at
//     its second address), with a behavioural half driven at the control's own socket seam.
//   · acd-wire-kind-has-both-ends — THE RATCHET, and the third measured instance of "a
//     shipped seam with no counterpart". Every string-valued `*_KIND` needs a producing end
//     AND a reading end, at least one outside its declaring home; a re-spelled end is an
//     enumerated exemption with its site and reason, never a pattern. RED on the tree this
//     story started from, green with the lane.
//   · acd-session-producer-fact-survives-the-wire — the four-hop chain no test on either
//     side of the wire can see, including the hop that must NOT change (`safeSessionArray`
//     stays a verbatim shape filter) and the no-second-class clause (the wire carries a
//     BOOLEAN, never a producer name).
import { archTests as acdSessionSpawnAckHasReaderTests } from "./acd-session-spawn-ack-has-reader.test.mjs";
import { archTests as acdSessionProducerFactSurvivesTheWireTests } from "./acd-session-producer-fact-survives-the-wire.test.mjs";
import { archTests as acdAttributionIsCapturedOrAbsentTests } from "./acd-attribution-is-captured-or-absent.test.mjs";

export const tests = [
  // milestone 53 / story 05 — architectural fitness functions (FF-5301…FF-5311)
  ...acdSessionDriverMeshBlindTests,
  ...acdSessionDriverSingleHomeTests,
  ...acdRawCaptureBeforeClassificationTests,
  ...acdSessionVerbBootsNoRegistryTests,
  ...acdTerminalServerOnlyTests,
  ...acdTerminalMirrorGeometryPinnedTests,
  ...acdTerminalOriginNotPortTests,
  ...acdTerminalControlBoundaryTests,
  ...acdTerminalOutputSignalSourceTests,
  ...acdCostStampedOnceTests,
  ...acdAgentModelSourceMapTests,
  ...acdAgentModelRoleDerivationTests,
  // milestone 38 — session presence + cross-machine worker execution (ADR-001/002/003/005)
  ...acdSessionPresenceAdditiveTests,
  ...acdSessionTtlReusesIsStaleTests,
  ...acdSessionRecordFrozenTests,
  ...acdSessionTtlSelfExpiresTests,
  ...acdSessionRunReconciliationTests,
  ...acdCapturedProducerFixtureTests,
  ...acdTerminalStreamTransportWiredTests,
  // task 04 / F-38.06e — RED-until-fixed: the join key must arrive mid-run (ADR-013
  // inv.7) and the stream's END must be produced (ADR-014 inv.8)
  ...acdTerminalViewLiveObservableTests,
  // milestone 48 / story 00 — the session id of record (ADR-001/002/006/010). Its three
  // fitness functions, then its three @executable task features, all fed by the REAL
  // producer (the real `aof session` command / the real start/ping/end) over a hermetic
  // AOF_GLOBAL_HOME.
  ...acdSessionIdNeverFabricatedTests,
  ...acdSessionLeafPerSessionTests,
  ...acdSessionOrphanReapedTests,
  // milestone 48 / story 01 — the session on the presence wire (ADR-005/001/009). The
  // fitness function is GREEN ON ARRIVAL: it pins the contract this story delivers (the
  // frozen ordered six off the REAL producer, the typed mirror, and the control's hop
  // still a per-field-whitelist-free pass-through).
  ...acdSessionEntryFrozenWireTests,
  // milestone 48 / story 03 — the fleet-side session index (ADR-007/003/009/010 R2). Its
  // two fitness functions are GREEN ON ARRIVAL — they pin the contract this story delivers
  // — followed by its two @executable task features (00 the projection, 01 attribution and
  // the free session, the latter fed by the REAL shaper and a REAL fleet server on an
  // ephemeral port).
  ...acdSessionIndexDerivedNotStoredTests,
  ...acdSessionAttributionSingleAuthorityTests,
  ...acdSessionWorktreeLaneScopedTests,
  ...acdSessionInputLaneFallthroughTests,
  ...acdSessionSpawnAckHasReaderTests,
  ...acdSessionProducerFactSurvivesTheWireTests,
  ...acdAttributionIsCapturedOrAbsentTests,
];
