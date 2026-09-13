// THE MESH/ENROLLMENT SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

import { meshRevokeTests } from "./mesh-revoke.test.mjs";
// milestone 24 — device-code group-enrollment (story 01: device-code enrollment — the
// join flow end-to-end, ADR-002/003/005). src/commands/mesh-invite.mjs registers
// mesh:invite (control-node-guarded MINT: a 6-digit code, hashed through the ONE
// sha256Hex seam, recorded { codeHash, issuedAt, expiresAt, consumedAt:null } via story
// 00's writeRegistry, the plaintext returned ONCE); src/mesh/relay.mjs's
// http.createServer gains the ONE device-flow route POST /enroll ABOVE the 426 fallback
// (match via timingSafeEqual, single-use consume-then-admit in ONE atomic registry
// write, the strict-> TTL check, the EPHEMERAL per-source attempt-cap — ADR-005's
// resolveCodeTtlSeconds/resolveMaxAttempts resolvers, malformed→documented default,
// 300s/5) and issues { relayAuth, nodeId, gitRemote } while the roster stores ONLY
// relayAuthHash (story 02's auth-gate data source); src/commands/mesh-join.mjs registers
// mesh:join <code> (reads config.mesh.relay.url, POSTs, stores config.mesh.credential
// merge-not-clobber, provisions the granted remote via the shell-less
// spawnSync("git", ["remote","add",…]) argv idiom — a rejection stores NOTHING). Three
// @executable task features: 00_mesh-invite-mint (the mint truth table + hashed-at-rest
// shape + TTL arithmetic + the non-control refusal + 6 digits + --json),
// 01_device-code-flow (good code admits+issues+consumes; the expired/consumed/unknown/
// malformed reject matrix; the attempt-cap N-boundary 5-answered/6-refused; resolver
// malformed→default; control-node-offline; ws-envelope-untouched), and
// 02_mesh-join-and-provision (credential merge-not-clobber; the space-url argv-form
// provision; rejection-stores-nothing; --json). The @manual 03_join-end-to-end feature
// gets NO executable test (verified at aof:verify). Fitness: turns
// acd-enrollment-code-hashed-at-rest + acd-enrollment-code-single-use-constant-time
// GREEN; keeps acd-enroll-endpoint-http-not-ws GREEN; the new verbs ride
// acd-mesh-command-cli-bijection; acd-enroll-git-argv-no-shell stays RED until story
// 02 lands src/commands/mesh-revoke.mjs (the gate reads both files).
import { meshInviteMintTests } from "./mesh-invite-mint.test.mjs";
import { meshEnrollDeviceFlowTests } from "./mesh-enroll-device-flow.test.mjs";
import { meshJoinProvisionTests } from "./mesh-join-provision.test.mjs";

export const tests = [
  ...meshRevokeTests,
  // milestone 24 — device-code group-enrollment (story 00/01/02): imported since
  // milestone 24 but never spread into this executed set — review fix (live soak,
  // 2026-07-17): found while adding join/enroll coverage for the control-node-record
  // fix; these three suites (invite mint, device-flow enroll, join+provision) had
  // never actually run under `node scripts/test.mjs`, silently, since they were added.
  ...meshInviteMintTests,
  ...meshEnrollDeviceFlowTests,
  ...meshJoinProvisionTests,
];
