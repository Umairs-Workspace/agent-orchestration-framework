// THE MESH/IDENTITY SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 22 — mesh-foundation (story 01: node-identity + commands — src/node-identity.mjs
// derives the stable, human-readable node id + assembles the frozen 7-key capability
// descriptor (ADR-003); src/commands/mesh-identity.mjs registers mesh:identity (publish/
// read this node) + mesh:status (the synced roster) into the SAME core (ADR-001), thin
// over story 00's mesh-store; the aof mesh identity/status dispatch branches + meshVerbCli
// face in cli.mjs. Three task features: 00_node-identity-descriptor (in-process node
// identity, injected hostname/salt), 01_mesh-identity-status-commands (invoke the commands
// against a temp fixture), 02_mesh-identity-cli-face (spawn the real CLI — render + --json
// single envelope + the error-code matrix). The acd-mesh-command-cli-bijection gate now
// covers identity+status (extended above).
import { meshNodeIdentityTests, runRecordsNodeIdUnitTests } from "./mesh-node-identity.test.mjs";
import { meshIdentityStatusCommandsTests } from "./mesh-identity-status-commands.test.mjs";
import { meshIdentityCliFaceTests, runRecordsNodeIdCliTests } from "./mesh-identity-cli-face.test.mjs";
import { meshNodeStalenessStatusTests } from "./mesh-node-staleness-status.test.mjs";
// milestone 27 (story 00) — work-issuance-routing: the issuance directive
// substrate + the eligibility matcher. src/mesh-issuance.mjs (NEW): the frozen
// six-key directive record { itemRef, issuer, target, state, issuedAt,
// aofVersion } assembled by assembleDirective (the assembleClaimRecord idiom, no
// fs/config/clock), readIssuanceDirectives (the readLeaseClaims walk one level
// deeper across every issuer partition — absence-tolerant, torn-file-skipping,
// flat union), and nodeSatisfiesTarget (ADR-003's pure total predicate over the
// m22-frozen descriptor: any ⇒ true, node ⇒ nodeId match, capability ⇒
// runtimes/skills membership, unknown/malformed ⇒ false — fail-safe). src/mesh-
// store.mjs gains the RESERVED issuanceDirectivePath builder beside
// leaseClaimPath (writes nothing — story 01 builds the writes). Three
// @executable task features: 00_issuance-directive-record (the six-key assembly
// matrix + the union read + absence/torn-file tolerance + the byte-faithful
// round-trip), 01_targeting-matcher (the full truth table + the honest-minimal-
// install floor + the pure-read independence), 02_add-only-directive-merge (two
// REAL clones over a shared bare remote — add-only merge, no MERGING state,
// converged byte-for-byte union, the same-item two-issuer invariant). Fitness #2
// (acd-issuance-record-frozen — the six-key freeze + the EOL-match over the real
// nested issuance sample path, no new .gitattributes rule) + #3
// (acd-targeting-matcher-descriptor-pure — no node-identity.mjs import + the
// matcher reads only nodeId/runtimes/skills, m03 planted-violation self-check).
// milestone 27 routing-era candidacy compatibility tests retained where they do not depend on retired write surfaces.
import { meshCandidacyEveryReturnTests } from "./mesh-candidacy-every-return.test.mjs";
import { meshHookIdentityFromCwdTests } from "./mesh-hook-identity-from-cwd.test.mjs";
import { globalNodeIdentityTests } from "./global-node-identity.test.mjs";
// milestone 126 / story 02, task 03 — the declarations answer riding mesh:status behind a flag:
// the flagless document byte-identical, and one additive key when asked for. FF-12605 driven half.
import { meshStatusDeclarationsTests } from "./mesh-status-declarations.test.mjs";

export const tests = [
  // milestone 59 / story 01 — the twenty-six re-armed (ADR-003 §3). 117 test entries that had
  // not run since 15e0a92 (2026-07-26). Order follows the runner's own import order so the
  // diff reads as the restoration it is.
  ...meshNodeIdentityTests,
  ...meshIdentityStatusCommandsTests,
  ...meshIdentityCliFaceTests,
  ...meshNodeStalenessStatusTests,
  ...meshCandidacyEveryReturnTests,
  ...meshHookIdentityFromCwdTests,
  ...globalNodeIdentityTests,
  ...meshStatusDeclarationsTests,
  // 132 — run-records-carry-the-node-id: tasks 00-02's unit scenarios (opaque derivation,
  // the legacy/opaque predicates, the descriptor's hostname key and the fabric join).
  ...runRecordsNodeIdUnitTests,
  ...runRecordsNodeIdCliTests,
];
