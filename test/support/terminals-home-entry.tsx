// A HARNESS ENTRY THAT MOUNTS THE REAL TERMINALS-HOME GRID (milestone 49 / story 05).
//
// IT MOUNTS THE PRODUCT, NOT A FIXTURE OF IT. `ui/src/home/SessionGrid.tsx` composes the rows,
// arbitrates the sockets, owns the keyboard and holds the one live region; it renders
// `SessionPane`, which mounts the REAL, UNMODIFIED `ui/src/terminal/TerminalControl.tsx`. So
// "sixteen sockets were constructed" is a fact about the shipped grid rather than about a test
// harness that happened to hand sixteen mounts to sixteen controls.
//
// THAT DISTINCTION IS THE WHOLE OF TECH_DEBT 29. Milestone 46 shipped a control that opened NO
// SOCKET AT ALL past 537 green tests because every harness stubbed the component by module path;
// story 08 closed the first door (a caller may not supply a stub set) and the second (an entry
// that renders panes must bundle the real control, verified against the bundle text). This entry
// walks through neither: it imports the product's own grid, and every socket below is one the
// product constructed.
//
// IT RE-EXPORTS THE BUNDLE'S OWN `shell-bus.mjs`, which is the ONLY way to declare the shell
// present where the mounted control can see it: the control reads `hasShellHost()` once at first
// render from the copy INSIDE its own esbuild bundle, so a lane that imports that module in the
// test process sets a different module instance's flag — the call succeeds, the flag reads true,
// and the mounted control still offers no expand control.
import type * as React from "react";
import * as shellBus from "../../ui/src/app/shell-bus.mjs";
import { SessionGrid } from "../../ui/src/home/SessionGrid";

export { shellBus };

export function TerminalsHome({
  status,
  origins,
  onSummary,
}: {
  status?: unknown;
  origins?: unknown;
  onSummary?: (counts: { sessions: number; live: number; needInput: number }) => void;
}): React.ReactElement {
  return <SessionGrid status={status} origins={origins as never} onSummary={onSummary} />;
}
