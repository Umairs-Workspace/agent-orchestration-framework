// THE MESH/RELAY SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 23 — control-node-relay (story 01: thin relay — src/mesh/relay.mjs is the
// stateless ws@8 broker shipped as a `relay` mode (serveRelay → { server, url, stop }),
// carrying the FROZEN, payload-agnostic envelope { kind, nodeId, signal } fanned out to
// the OTHER peers (no self-echo) in memory only; the never-crash { type:'error' }
// control-frame on a malformed/oversized frame (the hand-rolled maxFrameBytes check); and
// relayMode, the in-process config gate (serves only when controlNode === nodeId). The
// `aof mesh relay` verb is registered with a NON-BLOCKING status probe (--json returns).
// Three @executable task features: 00_relay-broker-fanout (the serve-unit + fan-out +
// in-memory-only + late-joiner + clean stop()), 01_relay-envelope-and-resilience (the
// payload-agnostic forwarding outline + the bad-frame resilience matrix + peer-disconnect),
// 02_control-node-role (the config gate + re-nomination-by-config + lose-liveness-not-data).
// milestone 33 / story 01 (ADR-002 — the broker is ELIMINATED as the presence/liveness
// transport): fitness #1 acd-relay-stateless and fitness #2 acd-relay-envelope-neutral
// (siblings of acd-relay-auth-gate-checked, ADR-002's fitness ledger) are RETIRED —
// superseded by 33/ADR-002 — the broker is eliminated. The serve-unit discipline
// (meshRelayBrokerFanoutTests / meshRelayEnvelopeResilienceTests / meshRelayControlNodeTests)
// stays green — mesh-relay.mjs's serve-unit shape is REUSED by the ADR-003 launcher, only
// its role as the liveness transport is retired.
import { meshRelayBrokerFanoutTests } from "./mesh-relay-broker-fanout.test.mjs";
import { meshRelayEnvelopeResilienceTests } from "./mesh-relay-envelope-resilience.test.mjs";
import { meshRelayControlNodeTests } from "./mesh-relay-control-node.test.mjs";
// milestone 24 — device-code group-enrollment (story 02: the enforceable trust boundary —
// ADR-003/004). src/mesh/registry.mjs gains the PURE credential-verify seam
// verifyCredential(registry, token) (hash the presented relayAuth, constant-time compare
// against a roster entry's relayAuthHash, AND reject a nodeId in the revocation list — the
// T6 live-read); src/mesh/relay.mjs's server.on("upgrade") handler gains the ADDITIVE ws
// auth-gate ABOVE the pathname router — for a GROUP (non-loopback) connection it reads the
// Authorization-header relayAuth token, verifies it against the LIVE roster/revocation
// (readRegistry(workspace) → verifyCredential) and socket.destroy()s a missing / invalid /
// not-in-roster / REVOKED credential upstream of clients.add, while LOOPBACK stays the m23
// local default (the injectable isGroupConnection seam makes the branch deterministic
// in-process — the STORY.md build note); src/commands/mesh-revoke.mjs registers mesh:revoke
// <node> (control-node-guarded: roster removal + explicit-deny revocation append in ONE
// atomic writeRegistry + git-remote de-provision via the shell-less
// spawnSync("git", ["remote","remove",…]) argv idiom). Two @executable task features:
// 00_relay-auth-gate (the admit/reject matrix + the live-revocation read + loopback default
// + the gate persists nothing) and 01_mesh-revoke (roster removal + revocation append + the
// argv-form de-provision + the auth-gate rejects after revoke + the non-control refusal +
// --json + add-only targeted removal). The @manual 02_revocation-completeness feature gets
// NO executable test (the real-remote push-access half is verified at aof:verify). Fitness:
// turns acd-relay-auth-gate-checked GREEN (the security-owned enforcement gate) +
// acd-enroll-git-argv-no-shell GREEN (mesh-revoke.mjs's de-provision argv form); keeps
// acd-relay-stateless + acd-relay-envelope-neutral + acd-enroll-endpoint-http-not-ws GREEN
// (the gate is a READ + a decision, never a write); the new verb rides
// acd-mesh-command-cli-bijection.
import { meshRelayAuthGateTests } from "./mesh-relay-auth-gate.test.mjs";
// milestone 33 (story 01) — fabric-native transport + coordination launcher: task 02
// (02_broker-retirement.feature, dedicated behavioural coverage, review Fix 5) — a
// node's presence/liveness view fully populated with the broker never started (over
// invoke("mesh:status", …, { fabricPeers }), no serveRelay/mesh-registry call anywhere
// in the test's own control flow); a peer's liveness visible with NO device-code
// enrollment / ws upgrade auth-gate; presence still renders from the reused git floor
// with neither broker nor fabric configured; plus a structural confirmation that
// mesh-identity.mjs imports no relay/broker module (a real source read).
import { meshBrokerRetirementTests } from "./mesh-broker-retirement.test.mjs";
import { controlStreamServerTests } from "./control-stream-server.test.mjs";

export const tests = [
  ...meshRelayBrokerFanoutTests,
  ...meshRelayEnvelopeResilienceTests,
  ...meshRelayControlNodeTests,
  ...meshRelayAuthGateTests,
  ...meshBrokerRetirementTests,
  ...controlStreamServerTests,
];
