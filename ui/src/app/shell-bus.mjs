// The SURFACE → SHELL CHANNEL (milestone 45 / story 03; ADR-005's contract points 3 and 5.
// Third slot added by milestone 46 / story 05; ADR-009).
//
// The shell owns four things a mounted surface needs to reach: the surface SLOT in the top
// bar, the NOTICE RAIL above it, the DOCK in the overlay region, and the one fullscreen door.
// This module is how a surface reaches them — a tiny framework-free store, with no React and
// no DOM, so the shell's half stays testable and the surfaces stay ignorant of the shell's
// internals.
//
// WHY A STORE AND NOT A PROP OR A CONTEXT, stated because both are the obvious alternatives:
//   - a PROP would mean the shell passes each surface a handle, and task 00's own scenario
//     forbids it in terms ("no surface is passed a route, a shell handle or a mode value it
//     did not receive before"). It would also make every surface's signature a shell
//     dependency, which is how 46, 47 and 49 end up renegotiating the shell to ship;
//   - a React CONTEXT would put the channel inside the framework, where this repo's headless
//     harness cannot reach it (test/support/mini-react.mjs implements the five hooks the
//     production surfaces use and no context), so the fleet's and the board's existing
//     behavioural suites would have to be rewritten around a shell they do not mount.
//
// THE DEGRADED PATH IS THE POINT, not a fallback. When NO shell is present — which is exactly
// what test/support/{fleet,board}-app-harness.mjs do, mounting the surface COMPONENT directly
// — a contribution renders IN PLACE, where the surface's own bar renders it today. So the
// harnesses need no edit, every existing behavioural suite keeps its expectations, and the
// surface is honest when mounted alone.
//
// Driven headlessly by test/ui/shell-regions.test.mjs (the two contribution regions, through the
// REAL shell and the REAL surfaces) and test/ui/shell-not-found-and-fullscreen.test.mjs (the
// fullscreen door).

// The contribution SLOTS a surface may fill. The names are constants for the same reason the
// region names are: a string typed twice is a string that disagrees once.
//
// A SLOT IS NOT A REGION, and m46/ADR-009 is where the distinction starts earning its keep.
// Two of the three slots land in `chrome` and one in `overlay`; which region (and which ROW)
// a slot names is a LAYOUT fact, so it is answered by `slotPlacement()` in
// ui/src/app/shell-layout.mjs beside the region names — never re-derived by a surface.
export const SLOT_SURFACE = "surface-slot";
export const SLOT_NOTICE = "notice-rail";
// THE THIRD SLOT (m46/ADR-009). The dock's home was decided in m45 — `overlay`, out of flow,
// `z-30` reserved on the ladder — and Shell.tsx has rendered that row since, with a comment
// naming "m46's dock" as its next occupant. What did not exist was a CHANNEL to put one there.
// This is that channel and nothing else: one more entry in an existing vocabulary, not a new
// mechanism. Everything else about a contribution — the one-per-slot cap, the release, the
// stale-release guard, and the in-place render when no shell is present — is unchanged.
export const SLOT_DOCK = "dock";

// The three slots as a frozen list, for iteration and for a consumer that wants to assert the
// set. It is NOT a fourth slot.
export const SHELL_SLOTS = Object.freeze([SLOT_SURFACE, SLOT_NOTICE, SLOT_DOCK]);

// Whether an app shell exists in this bundle at all. Declared at Shell.tsx's MODULE scope,
// not in an effect: a surface asks this question while RENDERING its own bar, which happens
// before any parent effect has run, so an effect-time flag would make every surface render
// its contribution in place on the first pass and then move it — the one thing DESIGN's
// binding rail 2 forbids.
let shellPresent = false;

// The shell's delivery handler, attached while the Shell component is mounted.
let deliver = null;

// Contributions live here between a surface publishing one and the shell reading it, keyed by
// SLOT. At most ONE notice at a time (DESIGN §The chrome budget clause 4 — that cap is
// load-bearing for the 25% bound), one slot contribution and one dock: the routed surface is
// one surface, and a second contributor would be a second surface mounted at once, which the
// content region does not allow.
const contributions = new Map();

export function declareShellPresent() {
  shellPresent = true;
}

export function hasShellHost() {
  return shellPresent;
}

// attachShellHost(handler) — the Shell component's subscription, returning its own detach.
// The handler is called with the slot whose contribution changed; the shell then reads it
// back with `contributionFor`.
export function attachShellHost(handler) {
  deliver = typeof handler === "function" ? handler : null;
  return () => {
    if (deliver === handler) deliver = null;
  };
}

// contribute(slot, node) — publish, and return the release that withdraws it. A surface
// calls this from an effect and returns the release as the effect's cleanup, so a surface
// that unmounts takes its contribution with it and never leaves a control in a bar belonging
// to a surface that is gone.
//
// A SECOND PUBLISH REPLACES THE FIRST, and the first publisher's release then withdraws
// NOTHING — the identity check below is what makes that safe. It is the same shape, and the
// same accident, as the fullscreen door's stale dismisser: a component that has been replaced
// is still holding a live handle and fires it on unmount, on a socket close, on a stray click.
// A stale release that tore down the occupant that IS on screen would take away the terminal
// the operator is typing into, for a reason three components away. It also notifies the shell
// of nothing, which matters: a delivery for a slot that did not change is a shell re-render
// per stale handle.
export function contribute(slot, node) {
  contributions.set(slot, node);
  deliver?.(slot);
  return () => {
    if (contributions.get(slot) !== node) return;
    contributions.delete(slot);
    deliver?.(slot);
  };
}

export function contributionFor(slot) {
  return contributions.get(slot) ?? null;
}

// Test-only reset. Named for what it is rather than hidden behind a flag: the store is module
// state, and a suite that mounted a shell must be able to hand the next one a clean one.
export function resetShellBus() {
  shellPresent = false;
  deliver = null;
  contributions.clear();
}

// ─────────────────────────────────────────────────── the fullscreen request ───
//
// ADR-005 [Build-1]: a surface ASKS the shell to present a LIVE NODE; it does not build its
// own overlay and it does not hand over a React element to be re-rendered somewhere else.
// The request therefore carries the node itself — `node` is a real DOM element the shell
// ADOPTS (re-parents into the overlay region and returns to `home` on dismiss), which is what
// guarantees one xterm, one socket, one PTY through both transitions.
//
// THE EXEMPTION HAS RETIRED AND THE CALLER HAS ARRIVED (corrected 2026-08-08, m46/05). m45
// wrote here that "the one fullscreen overlay that exists today (FleetTerminalView.tsx:412) is
// the named, shrink-only exemption that retires with m46". Story 46/04 deleted that file, and
// story 46/05 re-homed the extracted control's overlay onto this door — so both halves of that
// sentence are now history rather than plan. The prohibition it was an exemption FROM (ADR-005:
// no per-surface `fixed inset-0` layer) outlived the file it was written about, which is
// exactly how an exemption becomes permanent under a new name; it is now held by
// `test/arch/ui/acd-no-per-surface-fixed-overlay.test.mjs`, whose named subject is the extracted
// control. A rule whose only enforcement was an exemption on a deleted file is not enforced.
let fullscreenListener = null;

export function attachFullscreenHost(handler) {
  fullscreenListener = typeof handler === "function" ? handler : null;
  return () => {
    if (fullscreenListener === handler) fullscreenListener = null;
  };
}

// requestFullscreen({ id, label, node, home, opener, claimsEscape, onLayout }) — ask the shell
// to present. Returns a dismiss function, so the caller never needs to name the slot again.
//
//   node        — the LIVE DOM element to adopt. Presenting must not unmount, remount, re-key
//                 or re-create the occupant, and dismissing must return the SAME node to
//                 `home`.
//   home        — where the node came from, so dismissal can put it back exactly there.
//   opener      — the control that opened it: focus returns THERE on dismissal, never to the
//                 document body.
//   claimsEscape— [Build-2] an INTERACTIVE occupant may claim `Escape` (m46's terminal
//                 forwards stdin, so `Esc` is a live keystroke for the TUI on the far end).
//                 The visible exit control stays mandatory either way — for a claiming
//                 occupant it is the only remaining exit.
//   onLayout    — called after present AND after dismiss, one frame later, so a surface that
//                 sizes itself to its box re-measures once its new box is live.
//   ownsChrome  — m46/05, ADDITIVE and defaulting to the m45 behaviour. An occupant that
//                 carries its OWN header renders the mandatory exit control itself, at the same
//                 `ml-auto` anchor, and the shell renders none: DESIGN §S3 requires the
//                 fullscreen header to be the control's identity fragment VERBATIM (the same
//                 lockup, identity line, `read-only` pill and state chip), and a second,
//                 light-theme shell bar above a dark terminal is the exact thing DESIGN forbids
//                 ("the chrome is GONE — not dimmed, not showing through"). The exit control
//                 stays MANDATORY either way; this says who paints it, never whether.
//   onDismiss   — m46/05, ADDITIVE. The occupant is TOLD when the shell dismisses it. Without
//                 it, the two exits the shell owns (`Escape` on a non-claiming occupant, and
//                 the shell's own control) return the node home while the caller still believes
//                 it is presented — it would keep rendering into a node that is no longer on
//                 screen. Fires on replacement too, which is correct: occupants never stack, so
//                 being replaced IS being dismissed.
export function requestFullscreen(request) {
  fullscreenListener?.({ type: "present", occupant: request });
  // The returned dismiss is CLOSED OVER THIS REQUEST'S ID, and the shell checks it — see
  // `dismissFullscreen`. That is what makes handing a dismiss function to a caller safe.
  return () => dismissFullscreen(request?.id);
}

// dismissFullscreen(id) — dismiss the occupant with THIS id. A dismiss whose id is not the
// occupant currently presented is a NO-OP, exactly like dismissing an empty slot: no tick, no
// focus move, no teardown.
//
// THE ID IS NOT OPTIONAL DECORATION, and the case is m46's. Occupants never stack — a second
// request REPLACES the first — so the moment a second terminal is presented, the first
// terminal's component is still holding a live dismiss function for a session that is no
// longer on screen. It fires on unmount, on a socket close, on a stray click; without the id
// it would tear down SOMEONE ELSE'S fullscreen, and the operator would watch the terminal
// they are typing into vanish for a reason that is three components away. The shell's own two
// exits (`Escape`, the visible exit control) pass no id and target whatever is presented,
// which is correct by construction: both are properties of the presented state.
export function dismissFullscreen(id) {
  fullscreenListener?.({ type: "dismiss", id, via: "control" });
}
