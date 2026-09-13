// THE ARCH/COMMAND SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 53 / story 07 — the framework loop registry's single `.aof/loops/`
// home (FF-5312), immutable bundle ownership (FF-5313), and the executable
// install/update/drift matrix. Kept outside the mined `acd-loop-*` namespace.
import { archTests as acdRegistrySingleHomeTests } from "./acd-registry-single-home.test.mjs";
import { archTests as acdRegistryFrameworkOwnedTests } from "./acd-registry-framework-owned.test.mjs";
import { archTests as acdRegistryFixtureClosedTests } from "./acd-registry-fixture-closed.test.mjs";
// (T1/T6) the relay ws auth-gate — milestone 33 / story 01 (ADR-002.consequence):
// acd-relay-auth-gate-checked is RETIRED. It guarded the ws upgrade auth-gate as the
// admission boundary; ADR-002 makes "already on the tailnet" the admission boundary
// instead, so this guard now asserts an enforcement mechanism that is no longer
// load-bearing. superseded by 33/ADR-002 — the broker is eliminated.
// milestone 24 — device-code group-enrollment (ARCHITECTURE.md / the STRUCTURAL fitness
// functions — the architect's, disjoint from the SECURITY.md crypto/enforcement fitness
// above). RED-until-built (src/mesh/registry.mjs + src/commands/mesh-{invite,join,revoke}.mjs
// do not exist yet), EXCEPT acd-enroll-endpoint-http-not-ws, which runs GREEN today against
// m23's src/mesh/relay.mjs (the ws envelope is neutral) and stays GREEN when the HTTP
// enrollment route lands — it guards against the WRONG shape (enrollment on a ws kind), not
// the absence of the right one. Three STRUCTURAL invariants: (ADR-1) the group registry has
// EXACTLY ONE control-node-guarded write seam (registry write-scope + single-writer,
// resolving 22/ADR-002's no-aggregate-roster tension); (ADR-2) enrollment is an HTTP route on
// serveRelay's http.createServer, NOT a ws kind (the ws { kind, nodeId, signal } envelope
// stays payload-agnostic); (ADR-3/ADR-4) every git-remote provision/de-provision spawn is the
// shell-less spawnSync("git", [ … ]) argv form (the 13/ADR-002 read-only-source idiom). Each
// carries the m03 non-vacuous self-check. From: story 00 (registry) / 01 (enrollment flow) /
// 02 (trust boundary). SECURITY fitness (hashed-code-at-rest, single-use/constant-time,
// auth-gate enforcement) is authored separately by aof-security above — NOT here.
import { archTests as acdRegistryWriteScopeTests } from "./acd-registry-write-scope.test.mjs";
import { archTests as acdDeclaredProgramSingleSpellerTests } from "./acd-declared-program-single-speller.test.mjs";
import { archTests as acdCommandNamespaceTests } from "./acd-command-namespace.test.mjs";
// cross-cutting — the CLI entry-point contract: a direct `node src/cli.mjs …` must
// dispatch like the bin (not a silent exit-0 no-op), and importing the module must
// stay inert. Guards the main-module guard in src/cli.mjs against regression.
import { archTests as acdCliEntryExecutesTests } from "./acd-cli-entry-executes.test.mjs";
import { archTests as acdNoOtlpReceiverTests } from "./acd-no-otlp-receiver.test.mjs";
// milestone 71 / story 00 — the build's terminator and the free gate before review
// (ADR-001/ADR-002): FF-7101 (a bound stated in a bundled prompt names its home and
// equals it) and FF-7105 (the prompt's gate ladder is the shell's, derived from
// `invokeGateLadder` rather than from a literal pair).
import { archTests as acdPromptBoundsNameTheirHomeTests } from "./acd-prompt-bounds-name-their-home.test.mjs";
import { archTests as acdPromptGateLadderParityTests } from "./acd-prompt-gate-ladder-parity.test.mjs";
import { archTests as acdNoGitBusReturnTests } from "./acd-no-git-bus-return.test.mjs";
import { archTests as acdControlDispatchReclaimDriverWiredTests } from "./acd-control-dispatch-reclaim-driver-wired.test.mjs";
import { archTests as acdSingleEntryCommandCoreTests } from "./acd-single-entry-command-core.test.mjs";
// m42 wave (d) legs d1/d2 (PRD-command-spine-effects-ledger) — the command-spine
// route-table gates (registry-derived, never a ladder grep) and the effects-
// ledger gates (closed vocabulary, one event-raiser, the crash-window drain).
import { archTests as acdCommandRouteDerivedTests } from "./acd-command-route-derived.test.mjs";
import { archTests as acdEffectsLedgerTests } from "./acd-effects-ledger.test.mjs";
// m42 wave (d) leg d1 (the PRD's layering item) — the command layer is a LEAF: no
// src-root module imports commands/*, and no dependency of a command reaches back
// into commands/ (the mesh-worker-execution ↔ commands/mesh-repo cycle).
import { archTests as acdCommandLayerImportsDownwardTests } from "./acd-command-layer-imports-downward.test.mjs";
// m42 wave (d) leg d1 (the PRD's "console.log confined to the face" item) — the
// closed, ratcheted printer set; a core reports through an injected collector.
import { archTests as acdConsoleLogConfinedTests } from "./acd-console-log-confined.test.mjs";
//   ADR-001/006 — the route module is React-free, DOM-free and node:test-loadable, and the
//                 legacy translation preserves every other query parameter and the fragment.
import { archTests as acdRouteLogicFrameworkFreeTests } from "./acd-route-logic-framework-free.test.mjs";
import { archTests as acdDeclaredIdSingleHomeTests } from "./acd-declared-id-single-home.test.mjs";
import { archTests as acdCitedPathResolvesTests } from "./acd-cited-path-resolves.test.mjs";
import { archTests as acdPathIsNotBehaviourTests } from "./acd-path-is-not-behaviour.test.mjs";
// milestone 119 / story 02 — `src/commands/` gets its interior, and the one control that story
// authors. FF-11908 (the registry CITES and does not EXPLAIN: every entry comment in
// `src/command-core.mjs` is one line whose content is a citation, the prose lives in the command
// module's own header, and the deferred-import comments documenting the TDZ ring are the one exempt
// class — derived from `src/commands/**`, where they actually live, because the register row scopes
// them to the registry, which holds none of them). No comment-density number is asserted, and the
// control reads its own source to keep it that way (ADR-006 §4). The controls this story RE-POINTED
// rather than authored — the `graph-` prefix sweep, the command-layer cycle walk, the mesh:status
// host equality, and FF-11904's own rows — are registered by their own milestones' blocks, because
// a re-pointed control is the same control.
import { archTests as acdRegistryCitesNeverExplainsTests } from "./acd-registry-cites-never-explains.test.mjs";
// story 125 / task 02 — the README may not name a command that does not resolve: a bounded
// extractor (fenced blocks + command tables) resolved through the registry's own route table
// (`deriveRouteTable`), keeping no list of its own. A control on the route table is a control of
// THIS subject; it lives here rather than under `test/arch/bundle/`, which 124/02's FF-12405 leg 10
// freezes at its 23 parity controls.
import { archTests as acdReadmeNamesWhatShipsTests } from "./acd-readme-names-what-ships.test.mjs";
// story 128 — `aof work memory` joins the route table (task 01: the ladder door closes, the help
// tail stops naming it, the four frozen lists move and the printer ratchet falls, the module
// founds `src/commands/work/` under budget, the seam's callers are untouched, and 125's README
// control goes green). The structural half; the behavioural half is
// test/command/work-memory-command.test.mjs.
import { archTests as acdWorkMemoryRoutedTests } from "./acd-work-memory-routed.test.mjs";

export const tests = [
  // milestone 53 / story 07 — home, ownership, delivery and refresh
  ...acdRegistrySingleHomeTests,
  ...acdRegistryFrameworkOwnedTests,
  ...acdRegistryFixtureClosedTests,
  ...acdRegistryWriteScopeTests,
  ...acdDeclaredProgramSingleSpellerTests,
  ...acdCommandNamespaceTests,
  ...acdCliEntryExecutesTests,
  ...acdNoOtlpReceiverTests,
  // milestone 71 / story 00 — the build's terminator and the free gate before review:
  // FF-7101 + FF-7105. The story's three task features are prompt-layer claims and are
  // driven by these two suites; it lands no runtime module of its own.
  ...acdPromptBoundsNameTheirHomeTests,
  ...acdPromptGateLadderParityTests,
  ...acdNoGitBusReturnTests,
  ...acdControlDispatchReclaimDriverWiredTests,
  ...acdSingleEntryCommandCoreTests,
  // m42 wave (d) legs d1/d2 — command spine + effects ledger
  ...acdCommandRouteDerivedTests,
  ...acdEffectsLedgerTests,
  ...acdCommandLayerImportsDownwardTests,
  ...acdConsoleLogConfinedTests,
  ...acdRouteLogicFrameworkFreeTests,
  ...acdDeclaredIdSingleHomeTests,
  ...acdCitedPathResolvesTests,
  ...acdPathIsNotBehaviourTests,
  // milestone 119 / story 02 — the registry cites, it does not explain (see the import note).
  ...acdRegistryCitesNeverExplainsTests,
  // story 125 / task 02 — the README names what ships (see the import note).
  ...acdReadmeNamesWhatShipsTests,
  // story 128 — work memory joins the route table (task 01)
  ...acdWorkMemoryRoutedTests,
];
