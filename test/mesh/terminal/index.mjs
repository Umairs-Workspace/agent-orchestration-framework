// THE MESH/TERMINAL SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 38 / story 06 — worker-terminal-streaming (ADR-014; SECURITY T14): the
// worker's PTY byte stream rides the FROZEN mesh-relay.mjs envelope as a NEW opaque
// "terminal-frame" kind, routed by (nodeId, sessionId) (task 00); the fleet face
// gains a read-only GET /ws/terminal-view carve-out over an in-memory ephemeral
// mirror, multiplexing streams, dropping unresolvable frames (task 01); the
// acd-fleet-terminal-mirror-read-only fitness arms the read-only-in-fact invariant
// (task 02). Task 03 is the @manual real-second-machine soak, deferred to
// aof:verify 38 — no test file here.
import { meshTerminalRelayBridgeTests } from "./mesh-terminal-relay-bridge.test.mjs";
// m42 "interactive worker terminals" — the terminal-input behavioural lanes
// (router, client dispatch, worker delivery, pending-question, code column).
import { meshTerminalInputPathTests } from "./mesh-terminal-input-path.test.mjs";
import { meshTerminalStreamRelayTransportWiredTests } from "./mesh-terminal-stream-relay-transport-wired.test.mjs";
// milestone 46 / story 01 / task 00 (ADR-007) — the two links above JOINED. The driver's
// onOutputChunk producer and the worker stream client's sendTerminalFrame are each driven
// separately (that module and test/work/worker-stream-client.test.mjs); this one wires them
// with the SAME arrow mesh-launcher.mjs wires at BOTH call sites, so SECURITY T14's
// surviving half — the streamed bytes are the PTY chunk and nothing else, and a credential
// the worker's environment holds never reaches a frame — is asserted ACROSS the seam
// rather than on either side of it. It is the behavioural half of the invariant that
// acd-fleet-terminal-input-constrained's re-aimed detector #4 pins structurally.
import { meshTerminalSignalSourceTests } from "./mesh-terminal-signal-source.test.mjs";
import { meshTerminalMirrorReconnectTests } from "./mesh-terminal-mirror-reconnect.test.mjs";

export const tests = [
  // milestone 38 / story 06 — worker-terminal-streaming (ADR-014, tasks 00-02
  // traceability modules), plus m42's interactive-terminal-input lanes and the
  // acd-fleet-terminal-input-constrained fitness (the operator-overridden rewrite
  // of acd-fleet-terminal-mirror-read-only).
  ...meshTerminalRelayBridgeTests,
  ...meshTerminalInputPathTests,
  ...meshTerminalStreamRelayTransportWiredTests,
  // m46 / story 01 — the joined producer seam (ADR-007's behavioural half)
  ...meshTerminalSignalSourceTests,
  // VERIFICATION (relay-subscriber reconnect, 2026-07-25) — the fleet UI's terminal-frame
  // subscriber retries the relay broker instead of degrading permanently on a boot race
  // (the recurring live "waiting for output" after every deploy).
  ...meshTerminalMirrorReconnectTests,
];
