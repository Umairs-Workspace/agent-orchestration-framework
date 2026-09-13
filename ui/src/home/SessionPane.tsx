// THE GRID TILE'S MOUNT SITE (milestone 49 / story 03 — ADR-007, ADR-008's part 1).
//
// ONE session row in, ONE terminal control out. This is the THIN consumer ADR-001's invariant
// asks for and nothing more: it holds no state, opens no socket, reads no global, computes no
// posture and composes no descriptor. Every decision it renders was made in a framework-free
// `.mjs` a plain `node:test` imports — `homeSessionMount` for the declaration, `host-model.mjs`
// for what a grid pane may offer.
//
// ═══ WHY IT LANDS WITH THE AMENDMENT RATHER THAN WITH THE GRID ═════════════════════════════
// Invariant 4's amended part 1 requires EVERY surface that mounts the one control to hand it its
// own module's return value BARE, and it carries a PER-SURFACE floor: a surface directory where
// the sweep finds NO mount site FAILS the clause rather than passing it. That floor exists
// because the alternative — one concatenated count across three surfaces — is satisfied by
// `Fleet.tsx` alone while the new INTERACTIVE surface is policed by nothing and CI reads green,
// which is this gate's own recorded failure mode. So the home's mount site is part of the
// amendment's diff: without it the amendment is either red or vacuous, and vacuous is worse.
//
// ═══ AND WHY THE GRID IS NOT HERE ══════════════════════════════════════════════════════════
// Story 05 owns which rows become tiles, which of them are subscribed, focus, expand and the
// live region. IT EXTENDS THIS FILE; it does not add a sibling that also mounts the control —
// two components mounting one control on one surface is two authors for a value that decides
// whether an operator can type into another machine, which is the exact property the gate above
// exists to keep singular.
//
// THE MOUNT PROP CLOSES ITS OWN LINE, AND THAT IS LOAD-BEARING RATHER THAN COSMETIC: the gate's
// extractor reads a `mount={…}` that ends its line, and a site spelled any other way is a site
// checked by NOTHING. It is now reported as a defect in the clause's reach rather than passing
// silently — but the fix is to keep the prop on its own line, never to relax the clause.
import { TerminalControl } from "../terminal/TerminalControl";
import { HOST_GRID_PANE } from "../terminal/host-model.mjs";
import type { TerminalPaneStandingInput } from "../terminal/host-model.mjs";
import { homeSessionMount, type HomeSessionRow } from "./session-mount.mjs";
import type { FeedAxis } from "./feed-axis.mjs";
import type { TerminalOrigins } from "../terminal/socket-url.mjs";

// THE ARBITER'S ANSWER FOR THIS ROW (m49/05), as the grid computed it: `subscribed: false` with
// the cause and the configured cap, so the mount's ONE injected sentence is the HELD line and its
// `<N>` is the configured number rather than a string anybody typed.
export type SessionPaneHold = {
  readonly subscribed?: boolean;
  readonly cause?: string | null;
  readonly cap?: number | null;
};

// THE ORIGINS ARE RECEIVED, NEVER READ. `ui/src/home/` touches no browser global (ADR-001, and
// `acd-home-layout-is-a-filter` fails CI on one), so the page hands this component the origins it
// was served from — the same shape the fleet's own page builder returns.
export function SessionPane({
  row,
  axis,
  origins,
  hold,
  standing,
}: {
  row: HomeSessionRow;
  axis?: FeedAxis | null;
  origins: TerminalOrigins;
  hold?: SessionPaneHold | null;
  // What the SURFACE decided about this tile among its siblings (m49/05): whether it holds a
  // socket, whether the worded toggle is offered at all, whether it is the grid's single roving
  // stop, and the session facts the mount's frozen thirteen-key shape does not carry.
  standing?: TerminalPaneStandingInput | null;
}) {
  return (
    <TerminalControl
      host={HOST_GRID_PANE}
      mount={homeSessionMount(row, { axis, hold })}
      origins={origins}
      standing={standing}
    />
  );
}
