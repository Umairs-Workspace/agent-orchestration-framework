// The mount entry for the REAL-COMPOSITION harness, board half (milestone 46 / story 05).
//
// The exact sibling of `shell-fleet-entry.tsx`, and it exists for the reason that one names: the
// channel's host flag is MODULE state (`ui/src/app/shell-bus.mjs`'s `shellPresent`, set by
// IMPORTING Shell.tsx), so a harness that bundles only one half of the join gets its own copy of
// the bus and every clause about the JOIN is true in neither bundle.
//
// WHAT ONLY THIS ENTRY CAN SEE (m46/ADR-009's degraded-path clause, task 00 scenario 3). The
// board makes THREE contributions — its status legend + ⟳ sync to the surface slot, its
// `serverGone` strip to the notice rail, and now its terminal DOCK to the overlay region — and
// the claim is that the SAME component renders all three IN PLACE with no shell and NONE of them
// in place under one. `test/support/board-app-harness.mjs` proves the first half and must stay
// UNMODIFIED (that is the clause). This entry proves the second half with the same component.
//
// The ONE stub is the same leaf every other harness stubs, for the same reason: the terminal
// control alone pulls `@xterm/*` ×3, which want a real DOM canvas, and it has its own suites.
// Rendering nothing is exactly what the production control does for a mount with no panel — and
// it is enough here, because what this entry measures is WHERE the dock's contribution lands,
// not what it paints.
import { Shell } from "../../ui/src/app/Shell";
import { Board } from "../../ui/src/board/Board";

type CompositionProps = Record<string, unknown>;

function readProps(): CompositionProps {
  return ((globalThis as Record<string, unknown>).__AOF_SHELL_PROPS__ as CompositionProps) ?? {};
}

export function ShellBoardHarness() {
  const props = readProps();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the lane's props are the shell's own, checked by tsc at every real call site.
  return <Shell {...(props as any)} surface={<Board />} />;
}
