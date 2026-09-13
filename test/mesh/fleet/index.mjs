// THE MESH/FLEET SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 25 — mesh-ui (story 01: the fleet data model + the `aof mesh status` CLI
// mirror — mesh:status EXTENDED with a boards projection joining the m24 registry to
// each board's active runs). Three @executable task features: 00_boards-projection
// (the aggregate shape + the joins + the pure read), 01_mesh-status-render (the human
// text + the boards section + --json purity), 02_graceful-degradation (absent / torn /
// foreign-shaped / empty registry + stale + ownerless + non-local). The
// acd-mesh-ui-single-data-command gate tightens: mesh-identity.mjs is now the SOLE
// fleet-data joiner (readRegistry + readNodeRecords).
import { meshFleetBoardsProjectionTests } from "./mesh-fleet-boards-projection.test.mjs";
import { meshStatusFleetRenderTests } from "./mesh-status-fleet-render.test.mjs";
import { meshFleetGracefulDegradationTests } from "./mesh-fleet-graceful-degradation.test.mjs";
import { meshFleetSessionRenderTests } from "./mesh-fleet-session-render.test.mjs";
// milestone 38 / story 00 / task 08 — finding F6 (aof:verify 38, BLOCKER): the
// fleet read route (/api/mesh/status, queryGlobalMeshStatus) now carries each
// node's presence record through to the wire, closing the fixture-vs-producer
// gap that left row 3 permanently `idle` in production.
import { meshFleetPresencePlumbingTests } from "./mesh-fleet-presence-plumbing.test.mjs";
import { meshFleetTerminalViewMirrorTests } from "./mesh-fleet-terminal-view-mirror.test.mjs";
//   task 01 — the RENDER: the pure formatter, called with literal presence objects (no
//   store, no server, no port). The headline renders the NEW wire shape and the pre-m48
//   payload for the same situation and asserts they are DEEP-EQUAL.
import { meshFleetSessionSubsumptionRenderTests } from "./mesh-fleet-session-subsumption-render.test.mjs";
// ── milestone 49 / story 01 — ONE REPO, SAID ONCE (DESIGN §The `(session)` line — the
// dedupe rule, RULED; ADR-010). m48 made a session individually addressable, which is what
// let a second session in one repo exist as a distinct record; the node card's current-work
// line catches up: the repo is named ONCE and the line says HOW MANY (`working · demo ×2
// (session)`), grouped on the RAW repo string, the DISTINCT repos in codepoint order, the
// sign U+00D7 and never the letter `x`.
//   task 00 — the RULE, over the pure `fleetCurrentWorkLines`: the headline, the sign read as
//   a codepoint, the grouping/counting/ordering matrix, the raw-key matrix (no trim, no
//   case-fold), the count taken AFTER the run filter, the line's arithmetic stated as a RULE
//   that rejects BOTH wrong answers (today's duplicate rendering and DESIGN's rejected bare
//   dedupe), the cross-language literal, and the no-duplicate regression floor.
import { meshFleetRepoDedupeCountTests } from "./mesh-fleet-repo-dedupe-count.test.mjs";

export const tests = [
  // milestone 25 — mesh-ui (story 01: the fleet data model + the `aof mesh status` CLI mirror)
  ...meshFleetBoardsProjectionTests,
  ...meshStatusFleetRenderTests,
  ...meshFleetGracefulDegradationTests,
  ...meshFleetSessionRenderTests,
  ...meshFleetPresencePlumbingTests,
  ...meshFleetTerminalViewMirrorTests,
  ...meshFleetSessionSubsumptionRenderTests,
  // milestone 49 / story 01 — one repo, said once (ADR-010). Task 00's @executable
  // scenarios over the pure formatter; task 01's teeth are lanes of the AMENDED
  // acd-captured-producer-fixture, spread with the fitness functions above.
  ...meshFleetRepoDedupeCountTests,
];
