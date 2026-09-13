// THE MESH/UI SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 25 — mesh-ui (story 02: the read-only fleet web surface — the NEW
// src/mesh/ui-serve.mjs thin serve-face (a board-serve.mjs sibling) behind the
// CLI-only `aof mesh ui` verb; one 127.0.0.1 server on default port 4181 serving
// ui/dist at the fleet's own path (m45/ADR-002) + the single GET /api/mesh/status route
// (invoke("mesh:status")). One @executable task feature (00_mesh-ui-serve): the verb
// stands up ONE server, /api/mesh/status deep-equals `aof mesh status --json`, the
// /api/mesh namespace is disjoint from /api/work, unknown-route + missing-bundle +
// occupied-port are friendly refusals. The three SPECIFY'd face guards now activate
// against the as-built module: acd-mesh-ui-no-core-import (only ./command-core.mjs +
// no fs write), acd-mesh-ui-single-server (one http.createServer on 127.0.0.1;
// /api/mesh* never /api/work*), acd-mesh-ui-write-isolation (zero fs write / no
// shell-out / no /ws/terminal / no write route). The phase-2 half of
// acd-mesh-ui-single-data-command activates now the module exists (it invoke's
// mesh:status, imports no mesh-core module).
import { meshUiServeTests } from "./mesh-ui-serve.test.mjs";
// Spawn-level coverage for the `aof mesh ui` CLI verb (meshUiCommand, cli.mjs) — the
// verb-face the in-process serveMeshUi tests don't reach: the human announce line, the
// default-port (4181) bind, --port override, and the exact EADDRINUSE refusal + exit 1.
import { meshUiCliFaceTests } from "./mesh-ui-cli-face.test.mjs";
// The server-observable @executable halves of tasks 03/04/05 (the fleet face issues
// no /api/work on a drill-in; the client opens no event stream / a ws upgrade is
// refused; a write-method is a clean method-rejection with no state change; serving
// mutates no file). The rendered-view @manual halves + the Playwright browser lane
// are QA-owned, judged at Review.
import { meshUiReadOnlyContractTests } from "./mesh-ui-read-only-contract.test.mjs";
import { meshUiGlobalScopeTests } from "./mesh-ui-global-scope.test.mjs";
// milestone 38 / story 04 — ui-driven-assignment (ADR-012; SECURITY T13): the
// read-only fleet face's FIRST live write route, POST /api/mesh/assign, wrapping
// the existing assignWork verb VERBATIM. Task 00 the route + real-store mint
// readback; task 01 the verb's own gates re-run identically on the UI path; task
// 02 the read-only posture preserved (one exception, CSRF-refused elsewhere);
// task 03 the assign affordance's producer-fed picker + chip. Task 04 is the
// @manual real-UI soak, deferred to aof:verify 38 — no test file here.
import { meshUiAssignRouteTests } from "./mesh-ui-assign-route.test.mjs";
import { meshUiAssignGatesTests } from "./mesh-ui-assign-gates.test.mjs";
import { meshUiAssignReadOnlyPostureTests } from "./mesh-ui-assign-read-only-posture.test.mjs";
// milestone 38 / story 04 — task 05 (BLOCKER F21's own contract, driven in a
// TWO-workspace fixture: a single-workspace one structurally cannot express the
// failure) + task 06 (F22's acknowledgment — the `Sent` hold and the ONE extra
// silent re-load, driven through the REAL production <Fleet/> tree as well as
// the pure helper, per STATE.md's F-38.06e lesson).
import { meshUiAssignItemWorkspaceTests } from "./mesh-ui-assign-item-workspace.test.mjs";
import { meshUiAssignmentReadOnlyTests } from "./mesh-ui-assignment-read-only.test.mjs";
// milestone 50 / story 02 — the fleet face's SECOND named write route, POST
// /api/mesh/session (ADR-001), dispatched over the loopback relay bridge because the
// mesh-ui and mesh-serve daemons are separate processes (ADR-006, which supersedes
// ADR-001 decision 4). Tasks 00 + 02; task 01 is the fitness-function update, armed in
// test/arch/mesh/acd-mesh-ui-write-isolation.test.mjs.
import { meshUiSessionRouteTests } from "./mesh-ui-session-route.test.mjs";

export const tests = [
  // milestone 25 — mesh-ui (story 02: the read-only fleet web serve-face + its 3 face guards)
  ...meshUiServeTests,
  ...meshUiCliFaceTests,
  ...meshUiReadOnlyContractTests,
  ...meshUiGlobalScopeTests,
  // milestone 38 / story 04 — ui-driven-assignment (ADR-012; SECURITY T13): the
  // fleet face's ONE mutation carve-out, POST /api/mesh/assign
  ...meshUiAssignRouteTests,
  ...meshUiAssignGatesTests,
  ...meshUiAssignReadOnlyPostureTests,
  ...meshUiAssignItemWorkspaceTests,
  ...meshUiAssignmentReadOnlyTests,
  // milestone 50 / story 02 — POST /api/mesh/session: the route, its honest coded
  // refusals, and the REAL relay-router → control-stream → worker dispatch chain
  // (tasks 00 + 02)
  ...meshUiSessionRouteTests,
];
