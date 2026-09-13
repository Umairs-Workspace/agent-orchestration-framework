// A HARNESS ENTRY THAT RENDERS N REAL TERMINAL CONTROLS (milestone 49 / story 08 / task 00).
//
// `withTerminalControl` mounted exactly ONE control from a hard-coded entry, so every contract
// that begins "a grid of three subscribed tiles…" or "twenty rows and a cap of sixteen…" had no
// tree to be evaluated against. The renderer already supported N — host refs are keyed by tree
// path, reused across passes and detached on departure — so what was missing was an ENTRY that
// renders more than one, and a harness that takes one from its caller.
//
// TWO THINGS THIS FILE IS, DELIBERATELY:
//
//   1. IT RENDERS THE REAL, UNMODIFIED CONTROL. Not a stub, not a copy, not a wrapper that
//      re-implements a decision. `TerminalControl` may never enter this harness's substitution
//      set (TECH_DEBT 29: milestone 46 shipped a control that opened NO socket past 537 green
//      tests because every harness stubbed it), and a caller-supplied entry is the second door
//      into that same room — so the entry is checked in HERE, beside the harness, rather than
//      being something a lane can compose out of whatever it likes.
//
//   2. IT RE-EXPORTS THE BUNDLE'S OWN `shell-bus.mjs`. This is the ONLY way to declare the shell
//      present where the mounted control can see it. The control reads `hasShellHost()` once at
//      first render, from the copy of that module INSIDE its own esbuild bundle; a lane that
//      imports `ui/src/app/shell-bus.mjs` in the test process and calls `declareShellPresent()`
//      sets a different module instance's flag — the call succeeds, the flag reads true, and the
//      mounted control still offers no expand control. Re-exporting the namespace is not a test
//      seam in the product: nothing under `ui/src/` gains a caller, and
//      `acd-shell-bus-single-host` (which scans the ui tree only) is untouched.
//
// IT ADDS NO BEHAVIOUR. Every pane's host, mount and origins come from the caller; this file
// decides nothing about which rows become panes, what any pane says, or how many may subscribe.
// Those are milestone 49's product stories and none of them is here.
import type * as React from "react";
import * as shellBus from "../../ui/src/app/shell-bus.mjs";
import { TerminalControl } from "../../ui/src/terminal/TerminalControl";

export { shellBus };

// One pane's declaration, as the caller states it. `key` is REQUIRED and it is load-bearing:
// mini-react keys an instance by its position in the tree, so an unkeyed list that loses its
// middle member would re-key every pane after it — and "the tile at index 2 kept its socket and
// its scrollback while its neighbour left" would be measuring the harness's own remount.
export type GridPane = {
  key: string;
  host: string;
  mount: unknown;
  origins?: unknown;
};

export function TerminalGrid({
  panes = [],
  origins = {},
}: {
  panes?: GridPane[];
  origins?: unknown;
}): React.ReactElement {
  return (
    <>
      {panes.map((pane) => (
        <TerminalControl
          key={pane.key}
          host={pane.host as never}
          mount={pane.mount as never}
          origins={(pane.origins ?? origins) as never}
        />
      ))}
    </>
  );
}
