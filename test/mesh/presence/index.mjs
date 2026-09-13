// THE MESH/PRESENCE SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 22 — mesh-foundation (story 02: git-sync engine — src/mesh-sync.mjs is the
// PAYLOAD-AGNOSTIC git transport (syncMesh) + the background-loop runner (startSyncLoop,
// a thin timer over the one-shot transport); src/commands/mesh-sync.mjs registers
// mesh:sync into the SAME core (ADR-004), thin over the transport; the aof mesh sync
// dispatch branch + argsFor case in cli.mjs. Two @executable task features:
// 00_git-sync-transport (the transport over a REAL local bare-remote git fixture —
// commit+push, the clean no-op, pull a peer, the payload-agnostic outline, the add-only
// merge), 01_sync-cadence-loop (the loop over an INJECTED ticker — once-per-tick, the
// valid/malformed cadence outlines, batching, cadence read-at-start). The @manual
// 02_two-node-render-over-remote feature gets NO executable test (verified at aof:verify).
// Fitness #4 acd-mesh-sync-record-neutral asserts the engine moves files not fields. The
// acd-mesh-command-cli-bijection gate now covers identity+status+sync.
// milestone 23 — control-node-relay (story 00: presence-heartbeat — src/mesh/presence.mjs
// is the presence-record assembly + the node-staleness predicate (reusing m20's isStale
// shape) + the activeRuns read of the run records; src/commands/mesh-heartbeat.mjs
// publishes THIS node's presence git-only via the m22-reserved presenceRecordPath;
// mesh:status is EXTENDED in mesh-identity.mjs to render presence + a stale flag. Two
// @executable task features: 00_presence-record (the publish + the frozen schema +
// byte-equivalence + rebuildability + republish-untouched-peer), 01_node-staleness-and-
// status (the strict-`>` staleness boundary + the documented-default threshold + the
// never-beat no-presence rule + the stable --json shape). The @manual 02_presence-over-git
// feature gets NO executable test (verified at aof:verify). Fitness #3
// acd-presence-write-scope (every presence write joins the reserved seam + routes through
// writeText + references zero record-doc) + fitness #6 acd-mesh-eol-pinned (the .mesh/**
// eol=lf pin, the 22/R5 carry-forward). The acd-mesh-command-cli-bijection gate now covers
// identity+status+sync+heartbeat.
import { meshPresenceRecordTests } from "./mesh-presence-record.test.mjs";
// milestone 23 — control-node-relay (story 02: presence-over-relay). The cadence loop
// (src/mesh/presence-loop.mjs — a thin timer over the one-shot publish, the m22
// startSyncLoop split, config.mesh.presence.cadenceSeconds + the documented default)
// stays; the loop's git-durability half was never relay-dependent (ADR-002.4).
// milestone 33 / story 01 (ADR-002.1 — F-3204): the TWO-PUBLISH path (git unconditional +
// the relay best-effort push) is RETIRED from src/commands/mesh-heartbeat.mjs — superseded
// by 33/ADR-002 — the broker is eliminated. meshPresenceDualBusTests (task
// 00_dual-bus-publish's whole subject) and fitness #4 acd-presence-relay-independent (the
// two-publish control-flow grep) are RETIRED with it; meshPresenceDegradationLoopTests is
// TRIMMED to its cadence-loop-only scenarios (the relay-down/relay-restored rows retired
// alongside the push).
import { meshPresenceDegradationLoopTests } from "./mesh-presence-degradation-loop.test.mjs";
import { meshPresenceAdditiveSessionsTests } from "./mesh-presence-additive-sessions.test.mjs";
import { meshPresenceAggregateWorkspacesTests } from "./mesh-presence-aggregate-workspaces.test.mjs";
//   task 00 — the PROJECTION, the one place on the whole path where a session field was
//   actually lost: every Then reads a value off a real call to the real readLiveSessions.
import { meshPresenceSessionEntryTests } from "./mesh-presence-session-entry.test.mjs";
//   task 01 — the FABRIC half: a producer-made entry crosses the real control-side path
//   (applyStreamFrame → applyPresenceFrame → publishPresenceRecord → queryGlobalRegistry →
//   the one HTTP route) WHOLE, an unknown key included, with the entry-level guard's
//   rejections and the presence record's own frozen shape unmoved.
import { meshPresenceSessionWireTests } from "./mesh-presence-session-wire.test.mjs";

export const tests = [
  ...meshPresenceRecordTests,
  ...meshPresenceDegradationLoopTests,
  ...meshPresenceAdditiveSessionsTests,
  ...meshPresenceAggregateWorkspacesTests,
  // …and its two @executable task features (00 the projection, 01 the fabric crossing).
  ...meshPresenceSessionEntryTests,
  ...meshPresenceSessionWireTests,
];
