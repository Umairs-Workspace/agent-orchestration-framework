// THE COMMAND SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// milestone 72 / story 03 - THE COLD BOOT: `aof session ping` fires on every prompt an operator
// types, and it used to pay the whole command surface to write one small record - 324-351 ms of
// `src/cli.mjs`'s 363-384 ms was `src/command-core.mjs` alone, which statically imports all 88
// command modules. The registry and the generic face leave the CLI entry's STATIC closure (277
// modules to 25, measured), the session arm hoists to the FIRST statement of `run()` - above the
// help branch, which is registry-derived - and no lazy path awaits the registry above it, since a
// deferred registry is the same cost with a different spelling. The three hand-authored settings
// blocks that duplicated aof's own managed ones go, so the ping shells once; the framework MERGE is
// untouched, because the escape hatch that carried them through is the same one protecting this
// repo's unmanaged test-isolation guard. Both @executable task features plus FF-7205 and FF-7206.
import { cliSessionBootClosureTests } from "./cli-session-boot-closure.test.mjs";
// milestone 08 — CLI command core (story 00: the in-process registry of the six work operations)
import { commandCoreContractTests } from "./command-core-contract.test.mjs";
// milestone 08 — CLI command core (story 01: the CLI face; story 02: the board face; story 03: the
// enforcing fitness functions — the route↔command/command↔CLI bijection + the no-UI-core-import / no-subprocess guards)
import { cliFaceContractTests } from "./cli-face-contract.test.mjs";
import { configInspectTests } from "./config-inspect.test.mjs";
import { configEditorTests } from "./config-editor.test.mjs";
import { configFaultVisibleTests } from "./config-fault-visible.test.mjs";
import { dslPrimitiveTests } from "./dsl-primitives.test.mjs";
import { promptTests } from "./prompt.test.mjs";
// ── milestone 45 / story 04 — THE ADVERTISED ENTRY POINTS (ADR-002 + ADR-003). Every
// producer that hands the operator a URL stops minting `?mode=` and mints the path it
// actually serves: the board / fleet / config-editor launchers (probe AND announce, which
// are separate strings), `GET /api/mesh/board-url` (whose body shape stays exactly
// `{ url, workspaceId, ref }` so milestone 46's `origin` field stays additive), the
// desktop tray's compiled `MESH_UI_URL`, and the three hard-coded cross-links between the
// board and the fleet. The legacy addresses keep working — ADR-003 translates them once,
// client-side, at the entry — so every lane that asserts a NEW address has a sibling that
// asserts the OLD one still serves.
//   00_servers-advertise-paths — the `--json` probes, the `Open this URL in your browser:`
//     lines, real GETs of both the new and the legacy addresses on the servers that used
//     to advertise them, and the drill-in route (its `#ref`, its origin, its refusals).
//   01_in-app-cross-links — the three hrefs, read off the RENDERED tree of the REAL
//     `<Board/>` / `<Fleet/>` mounted against real faces, in the states that render them.
// (02_desktop-entry-and-no-literals-left is @manual — a compiled Rust constant behind a
// Windows cargo build, plus a real-browser back-compat census — and deliberately has no
// suite here. Its structural half is `acd-no-surface-mode-url-literal` above.)
import { advertisedPathsTests } from "./advertised-paths.test.mjs";
// milestone 66 / story 01 — the DECLARATION FORM (ADR-001, amended by ADR-008). One
// leaf freezes the id namespace, the register-block set and the recogniser; memory's
// two parsers stop owning their four literals and build both `headerRe`s from it.
// FF-6603 + FF-6604 are the story's own fitness functions (ADR-007 §1), each with its
// planted-defect lane; the differential is over the REAL `wiki/work`, because a
// re-home defect here is a SILENT SHRINK every fixture-planting suite stays green
// through.
import { declaredIdTests } from "./declared-id.test.mjs";
// story 128 — `aof work memory` joins the route table (task 00: the door resolves through
// `deriveRouteTable`, every verb answers byte-for-byte what the ladder answered, the empty block
// is zero bytes, the adapter keeps the seam's parsing rules, the refusals are coded). The
// behavioural half of founding `src/commands/work/`; the structural half is
// test/arch/command/acd-work-memory-routed.test.mjs.
import { workMemoryCommandTests } from "./work-memory-command.test.mjs";

export const tests = [
  // milestone 72 / story 03 - the cold boot (tasks 00-01) plus FF-7205 and FF-7206.
  ...cliSessionBootClosureTests,
  ...commandCoreContractTests,
  ...cliFaceContractTests,
  ...configInspectTests,
  ...configEditorTests,
  ...configFaultVisibleTests,
  ...dslPrimitiveTests,
  ...promptTests,
  // milestone 45 / story 04 — the advertised entry points (tasks 00–01; 02 is @manual)
  ...advertisedPathsTests,
  // milestone 66 / story 01 — the declaration form (tasks 00–01) + its two fitness functions
  ...declaredIdTests,
  // story 128 — work memory joins the route table (task 00)
  ...workMemoryCommandTests,
];
