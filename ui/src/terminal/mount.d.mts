// THE MOUNT CONTRACT — the ONE shape both call sites produce and the one control consumes
// (milestone 46 / story 04; ADR-001, ADR-002).
//
// WHY IT LIVES HERE AND NOWHERE ELSE. It had three homes at first review: the board's
// `dock-mount.d.mts` (canonical, in one CONSUMER's folder), the control's own `.tsx` (nine fields
// retyped), and the fleet's `terminal-mount.d.mts` — which imported the board's. That last one is
// a `fleet → board` edge, TYPE-ONLY and therefore invisible to `aof graph impact`, added by the
// milestone chartered to remove them; ADR-001's own Alternatives-rejected says it in terms — *"A
// sixth would be added by the one milestone chartered to reduce coupling."*
//
// A shared CONTRACT belongs in the shared DOMAIN folder. `ui/src/terminal/` is where the source
// table, the ramp, the geometry rule and the input policy already live; the shape a call site
// hands the control is the same species of fact. Both surfaces now import DOWN into it and
// neither imports the other — which is exactly what ADR-001 set the folder up to make possible.
//
// `acd-terminal-control-boundary` carries a SHRINK-ONLY baseline of the surviving `fleet → board`
// specifiers, `.d.mts` included, so a seventh fails CI rather than needing a reviewer to notice
// it. TECH_DEBT 18(a) is three milestones old and this is the first gate it has ever had.

import type { SessionSource } from "./source-table.mjs";

// What a CALL SITE declares. Every field is a fact only the call site knows; not one of them is a
// derivation (the route, the geometry mode, the URL, the input path and the chrome are all
// derived FROM `source` and `posture` by the shared core).
export interface TerminalMountDeclaration {
  // Is a source bound at all? `false` is the dock's `idle`: not an error, not a loading state.
  readonly bound: boolean;
  // Does a panel render AT ALL? `false` is m38/ADR-014 invariant 4 / V1 — not an empty frame, not
  // a disabled toggle, and NOT an `unavailable` pane.
  readonly rendersPanel: boolean;
  // A WHOLE ROW off the frozen table, never assembled at a call site.
  readonly source: SessionSource | null;
  // Exactly the values that address it — the source's own declared params.
  readonly params: Readonly<Record<string, string>>;
  // The HOST's declaration, never the source's. `interactive` | `read-only`.
  readonly posture: string;
  // The owner. V1: a terminal with no visible owner is never rendered.
  readonly ref: string | null;
  // The far end, when it is somewhere else. A local PTY names nobody.
  readonly farEnd: string | null;
  // The identity line's TAIL (`session 7f3a91c`) — source-shaped copy the call site owns, and the
  // first thing to yield when the header cannot fit (DESIGN §S2's yield order).
  readonly detail: string | null;
  // The state-aware command typed ONCE per session, as ordinary input on the raw path.
  readonly command: string | null;
  // Wording the shared describer cannot compute — the fleet's assignment-derived V10 sentence,
  // INJECTED as a string so the shared set never learns a surface's vocabulary (ADR-005).
  readonly reason: string | null;
  // WHO OWNS THE SPAWN. A restart is a deliberate RE-SPAWN, so the control offers it only where
  // this host is what spawned the session. A mount fact, not a source field: the same source is
  // somebody else's from one host and this one's from another.
  readonly spawnedHere: boolean;
  // A FORCED `unavailable`, which in m46 means a FIXTURE (DG-46-3: the state ships with no
  // production producer; the board dock is always same-origin and a fleet card with no resolvable
  // tuple renders no panel at all). Milestone 49 is its producer.
  readonly unavailable?: { readonly cause?: string; readonly workspacePath?: string | null } | null;
}

// The fleet's declaration adds the reason it has NO panel when it has none.
export interface FleetTerminalMountDeclaration extends TerminalMountDeclaration {
  readonly noStream: string | null;
}
