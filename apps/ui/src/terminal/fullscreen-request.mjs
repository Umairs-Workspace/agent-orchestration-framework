// The ONE terminal control's FULLSCREEN REQUEST (milestone 46 / story 05 / task 02 — ADR-009's
// clause that fullscreen goes through `requestFullscreen`, handing the LIVE DOM node and its
// `home`, with `claimsEscape: true` when input is enabled). A framework-free ESM module — no
// React, no DOM, no shell import — so what the control ASKS FOR is a value `node:test` can read.
//
// WHY THIS IS A DECISION AND NOT PLUMBING (ADR-001: a decision that lives in JSX is a decision
// no test in this repo can reach). Three of the request's fields are judgements about the
// session, and each of them is wrong in a different, silent way if it is decided at a call site:
//
//   · `claimsEscape` IS `inputEnabled`, exactly — `source.canInput && !mount.readOnly`, never
//     one flag. `Esc` is a live keystroke for the `claude` TUI on the far end ([Build-2]), so a
//     shell that swallowed it would make the one key a TUI needs most mean "leave". And the
//     converse is just as wrong: a READ-ONLY occupant that claimed the key would take away the
//     only exit a peek has, for a far end that is not listening for it. The two axes stay
//     independent — the SAME `mirror` source claims the key from the board dock and does not
//     from the fleet card, because posture is a property of the CALL SITE and capability is a
//     property of the SOURCE (ADR-002).
//
//   · `ownsChrome` is `true` for this control, always. DESIGN §S3 requires the fullscreen header
//     to be the inline header's identity fragment VERBATIM — the same lockup, the same identity
//     line, the same `read-only` pill, the same state chip — "so it reads as the same pane in a
//     bigger box". The shell's own generic header would be a second, LIGHT-THEME bar above a
//     dark terminal, which is the residual chrome DESIGN forbids by name. The visible exit
//     control stays MANDATORY: this says who paints it, never whether.
//
//   · the ID is the SESSION's, not the component's. Occupants never stack, so a second present
//     replaces the first and the first caller is left holding a dismiss closed over an id that
//     is no longer on screen; the shell no-ops it BY ID. An id that changed per render would
//     make every re-render look like a new occupant and re-adopt the node.
//
// WHAT THIS MODULE DOES NOT DECIDE, deliberately: `node`, `home`, `opener` and the two callbacks
// are DOM and React facts, so they are passed straight through by the `.tsx` and this module
// never invents one. It also does not name a stacking rung — the shell's overlay owns z, and
// `presentedStateModel` reports `fullscreen` taken from the ladder by name.

import { mountModelFor } from "./input-policy.mjs";
import { FORM_PANE_ACTIVATION } from "./host-model.mjs";

// The anchor the exit control sits at, in both headers. The same position as the control that
// entered fullscreen, so the eye does not have to search for the way out (DESIGN §S3 C1).
export const FULLSCREEN_EXIT_ANCHOR = "ml-auto";

// ─── WHERE FOCUS LANDS ON PRESENT (m49/ADR-007 (C); DESIGN §S3 delta 2) ──────────────────────
// A closed pair, and it is a REQUEST field rather than a shell default for one reason: only the
// request knows whether the occupant claims the keyboard. An operator who presented an
// INTERACTIVE pane did it TO TYPE (DG-49-5: taking the keyboard IS the expand), so focus belongs
// in the terminal; a read-only occupant has nothing to type into, and its mandatory exit control
// is then the only thing focus can usefully hold.
export const FOCUS_PRESENTS_TERMINAL = "terminal";
export const FOCUS_PRESENTS_EXIT = "exit-control";

// fullscreenOpenerFor(form, { control, pane }) — WHICH ELEMENT ACTUALLY OPENED THIS.
//
// m49/ADR-007 (C): `opener` keeps its name — the shell reads this field and a shipped spelling
// survives unless it LIES — and the lie was that the control hard-coded its own expand button
// whatever the operator pressed. Today provenance and job coincide because the button is the only
// door; the moment a host declares the pane-activation form they diverge, and returning focus to
// a button the operator never touched loses their place in the grid (DESIGN §S3 delta 3:
// dismissal returns to the TILE, restoring its roving stop).
//
// THE RULE IS THE FORM'S, NOT THE HOST'S: the return target is the element carrying the
// PRESENTING affordance's form. One derivation replaces one hard-coded ref, and it lives here
// rather than in the `.tsx` because "which element opened it" is a decision, and a decision in
// JSX is a decision no test in this repo can reach.
// WHERE A HOST DECLARES ITS PANE A DOOR, THE PANE IS THE RETURN TARGET WHICHEVER DOOR WAS USED —
// corrected 2026-08-13 against a measurement: pressing the expand BUTTON returned focus to that
// button, which is inside the tile, and DESIGN §S3 delta 3 forbids exactly that ("not to a button
// inside the tile"). The reason is not symmetry: on such a surface the PANE is the roving stop, so
// returning anywhere else loses the operator's place in the grid. A caller passes `pane` only for
// a host that declares the pane-activation form, so the icon control's own hosts are unchanged.
export function fullscreenOpenerFor(form, elements = {}) {
  const control = elements.control ?? null;
  const pane = elements.pane ?? null;
  return pane ?? control;
}

// terminalFullscreenId(sessionKey) — the occupant id, from the session identity the control is
// already running. A `null`/empty session has nothing to present.
export function terminalFullscreenId(sessionKey) {
  return typeof sessionKey === "string" && sessionKey.length > 0 ? `terminal:${sessionKey}` : null;
}

// terminalFullscreenRequest({ source, posture, sessionKey, label, node, home, opener, onLayout,
// onDismiss }) — the whole request, as one value.
//
// Returns `null` when there is nothing to present (no session identity): a request with no id is
// refused by the shell's own reducer, and building one anyway would put the refusal in two
// places.
export function terminalFullscreenRequest({
  source = null,
  posture = null,
  sessionKey = null,
  label = null,
  node = null,
  home = null,
  opener = null,
  onLayout = null,
  onDismiss = null,
} = {}) {
  const id = terminalFullscreenId(sessionKey);
  if (id === null) return null;
  const model = mountModelFor({ source, mount: posture });
  return Object.freeze({
    id,
    // The `aria-label` naming the SESSION rather than the widget class (DESIGN §Accessibility 4).
    label: typeof label === "string" && label.length > 0 ? label : id,
    node,
    home,
    opener,
    // EXACTLY whether input is enabled. Never a preference, never a host's property.
    claimsEscape: model.inputEnabled,
    // …AND WHERE FOCUS PRESENTS, DERIVED FROM THE SAME ONE FACT, right beside it, so the two can
    // never disagree: an occupant that claims the keyboard wants focus in the pane it is about to
    // type into, and one that cannot type wants focus on the exit that is then its only way out.
    focusOnPresent: model.inputEnabled ? FOCUS_PRESENTS_TERMINAL : FOCUS_PRESENTS_EXIT,
    // The occupant paints its own header, and therefore its own mandatory exit control.
    ownsChrome: true,
    onLayout,
    onDismiss,
  });
}

// terminalFullscreenExits({ source, posture }) — what the two exits DO for this mount, as values
// a test can read without presenting anything. The visible control is mandatory in every
// combination without exception; `Escape` is the one that differs, and it differs by exactly one
// fact.
export function terminalFullscreenExits({ source = null, posture = null } = {}) {
  const model = mountModelFor({ source, mount: posture });
  return Object.freeze({
    inputEnabled: model.inputEnabled,
    claimsEscape: model.inputEnabled,
    // A claimed `Escape` reaches the far end as a keystroke and the shell does not dismiss on
    // it; an unclaimed one dismisses, because nothing is listening for it on the far end.
    escapeReachesFarEnd: model.inputEnabled,
    escapeDismisses: !model.inputEnabled,
    // MANDATORY IN EVERY ROW — and in the claiming rows it is the ONLY exit, which is what makes
    // the claim safe. Never hover-revealed, never auto-hiding, never faded by inactivity: a
    // build that did any of those has built a room with no door.
    exitControl: Object.freeze({
      visible: true,
      alwaysVisible: true,
      anchor: FULLSCREEN_EXIT_ANCHOR,
      onlyExit: model.inputEnabled,
    }),
  });
}
