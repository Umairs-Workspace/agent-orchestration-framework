// The ONE terminal control's HOST MODEL (milestone 46 / story 04 — DESIGN §Collapse is not
// Hide, DESIGN §Surfaces S1/S2/S3, ADR-002's "posture is the MOUNT's"). A framework-free ESM
// module — no React, no DOM, no socket, no clock — so `node:test` drives it headlessly and the
// `.tsx` stays a thin consumer (ADR-001: ALL logic in `.mjs`, and that split is an INVARIANT).
//
// WHAT THIS ANSWERS, and it is the pair of questions 46/03's core deliberately did not:
//   1. WHICH AFFORDANCES DOES A HOST DECLARE, in what FORM, and at what COST? FOUR hosts of one
//      control (m49/ADR-007 adds the grid pane), and the ONLY things that differ between them
//      are their declarations — which is also why a fourth SURFACE is a fourth ROW here rather
//      than a third host reused under another name.
//   2. WHAT ENDS A SESSION AND WHAT DOES NOT? A session's IDENTITY, as a value.
//
// ═══ WHY (1) IS A TABLE AND NOT A PROP-PER-HOST ═══════════════════════════════════════════════
// DESIGN's rule is short and it is the reason this module exists: *a chevron means layout-only;
// a worded toggle means subscribe/unsubscribe.* The two operations look alike and cost
// differently — collapse hides the byte area with CSS and keeps the WebSocket, the PTY, the
// running agent and the scrollback; Hide CLOSES the socket and the mirror is ephemeral, so a
// re-watch starts empty. Written down here because ONE CONTROL IS EXACTLY THE CIRCUMSTANCE UNDER
// WHICH TWO OPERATIONS QUIETLY ACQUIRE ONE BUTTON, and `affordanceFormViolations` refuses the
// merge as a value rather than leaving it to a reviewer's eye.
//
// ═══ WHY (2) IS A VALUE AND NOT A DEPENDENCY ARRAY ════════════════════════════════════════════
// The rule is already earned, in a comment, on the file this milestone deletes:
// *"collapsing must NOT tear the session down … So `collapsed` is deliberately NOT a
// dependency."* A dependency array is a thing only React can read, and this repo has no React
// test harness — so the rule survived as prose beside the mechanism, and a naive union of two
// components is exactly the diff that re-derives the effect's identity and quietly adds
// `collapsed` to it. Here the identity is a STRING a `node:test` can compare, the `.tsx` uses
// THAT string as its effect's dependency, and the property stops depending on nobody editing a
// comment.
//
// NOTHING IN THE IDENTITY IS A LAYOUT FACT. Not `collapsed`, not `expanded` (fullscreen), not the
// box height, not the host's own re-render revision. Everything in it is a fact about WHICH
// SESSION this is: the source's kind, every value that ADDRESSES it, the posture xterm was
// constructed under, and the operator's own restart token.

import { terminalPaneKey } from "./pane-identity.mjs";
import { PANE_EMPTY_HOST } from "./state-ramp.mjs";

// ─── The FOUR hosts ────────────────────────────────────────────────────────────────────────
// The fourth is milestone 49's (ADR-007): a tile on the terminals home. IT IS A FOURTH HOST
// RATHER THAN `HOST_FLEET_CARD` REUSED, and the reason is not the table's contents — the eight
// verdicts happen to coincide with the fleet card's today. It is that `hostAffordances` FAILS
// CLOSED (below): the only alternative is passing `HOST_FLEET_CARD` from a surface that is not
// the fleet, which makes this model report a lie onward to the identity line and the control
// strip, and whose REASONS are then false about a grid tile ("the panel's total height is a
// constant 192px" is a statement about a card).
//
// THE NAME AND THE VALUE MATCH, as both m46 hosts already do — `HOST_GRID_PANE = "grid-pane"`,
// DESIGN §S2's own value. The DIRECTORY the surface lives in is `ui/src/home/` and is a
// different thing: the folder is where the code lives, the host is what the control is told.
// Worth stating because an unrecognised host declares NOTHING, which on screen is a pane with
// no controls at all — a rendering bug to look at, and one of the few defects here that no gate
// would name.
export const HOST_BOARD_DOCK = "board-dock";
export const HOST_FLEET_CARD = "fleet-card";
export const HOST_FULLSCREEN = "fullscreen";
export const HOST_GRID_PANE = "grid-pane";
export const TERMINAL_HOSTS = Object.freeze([HOST_BOARD_DOCK, HOST_FLEET_CARD, HOST_FULLSCREEN, HOST_GRID_PANE]);

// ─── The affordance vocabulary ─────────────────────────────────────────────────────────────
// Every affordance the control can offer, named once. A host declares each one ON or OFF, and
// "everything else the control can do is declared OFF" is then a property of the table rather
// than of what a call site remembered to pass.
export const AFFORDANCE_COLLAPSE = "collapse";
export const AFFORDANCE_CLOSE = "close";
export const AFFORDANCE_DRAG_RESIZE = "drag-resize";
export const AFFORDANCE_WATCH_HIDE = "watch-hide";
export const AFFORDANCE_FULLSCREEN = "fullscreen";
export const AFFORDANCE_EXIT_FULLSCREEN = "exit-fullscreen";
export const AFFORDANCE_RESTART = "restart";
export const AFFORDANCE_PROVIDER_PICKER = "provider-picker";

export const AFFORDANCES = Object.freeze([
  AFFORDANCE_COLLAPSE,
  AFFORDANCE_CLOSE,
  AFFORDANCE_DRAG_RESIZE,
  AFFORDANCE_WATCH_HIDE,
  AFFORDANCE_FULLSCREEN,
  AFFORDANCE_EXIT_FULLSCREEN,
  AFFORDANCE_RESTART,
  AFFORDANCE_PROVIDER_PICKER,
]);

// The FORMS. A form is what the operator SEES, and DESIGN binds two of them to a cost.
export const FORM_CHEVRON = "chevron";
export const FORM_WORDED_TOGGLE = "worded-toggle";
export const FORM_ICON_CONTROL = "icon-control";
export const FORM_SEPARATOR = "separator";
export const FORM_SEGMENTED = "segmented";
// m49/ADR-007 amendment (B) — THE SIXTH FORM, and it is a new VALUE in this closed vocabulary
// rather than a new PROP on the control. It means: *this host's own pane region activates this
// affordance (a click into the byte area, `Enter`/`Space` on the tile), IN ADDITION to the icon
// control, which stays because it is the discoverable one.*
//
// It rides BESIDE `form` on the entry (`activation`) rather than replacing it, because both are
// true at once on a grid tile and `form` is what the operator SEES first — the ⤢ control. The
// cost clause below polices the entry whichever way it is spelled, which is the property that
// made these tables worth building.
//
// AND IT IS PER-HOST FOR A MEASURED REASON, not for symmetry: on the BOARD DOCK a click into
// the byte area must focus xterm *to type*, and turning that click into a present would take
// typing away from the surface m42 deliberately made typeable. On a grid tile there is nothing
// to type into inline — DG-49-5's ruling is that taking the keyboard IS the expand.
export const FORM_PANE_ACTIVATION = "pane-activation";
export const AFFORDANCE_FORMS = Object.freeze([
  FORM_CHEVRON,
  FORM_WORDED_TOGGLE,
  FORM_ICON_CONTROL,
  FORM_SEPARATOR,
  FORM_SEGMENTED,
  FORM_PANE_ACTIVATION,
]);

// The COSTS, in ascending order of what they take from the operator.
export const COST_LAYOUT = "layout";
export const COST_SUBSCRIPTION = "subscription";
export const COST_SESSION = "session";
// A surface change is a full PAGE LOAD (ADR-009, correcting [Build-3]'s stated mechanism while
// keeping its conclusion): the PTY dies at the browser, before React gets a say. Named so no
// host's docs imply otherwise.
export const COST_PAGE_LOAD = "page-load";

// The worded toggle's two labels, unchanged in wording from the shipping fleet peek.
export const WATCH_LABEL = "Watch terminal →";
export const HIDE_LABEL = "Hide terminal";

function affordance(form, cost, extra = {}) {
  return Object.freeze({ declared: true, form, cost, ...extra });
}

// NOT DECLARED is a first-class answer carrying its own reason, because two of the fleet card's
// absences are DESIGN decisions rather than omissions and a reviewer must be able to tell.
function notDeclared(reason) {
  return Object.freeze({ declared: false, form: null, cost: null, reason });
}

const BOARD_DOCK_AFFORDANCES = Object.freeze({
  [AFFORDANCE_COLLAPSE]: affordance(FORM_CHEVRON, COST_LAYOUT),
  [AFFORDANCE_CLOSE]: affordance(FORM_ICON_CONTROL, COST_SESSION, { glyph: "✕" }),
  [AFFORDANCE_DRAG_RESIZE]: affordance(FORM_SEPARATOR, COST_LAYOUT, { role: "separator" }),
  [AFFORDANCE_WATCH_HIDE]: notDeclared("the dock has no subscription to toggle — `✕` ends the session and the chevron only hides it"),
  [AFFORDANCE_FULLSCREEN]: affordance(FORM_ICON_CONTROL, COST_LAYOUT),
  [AFFORDANCE_EXIT_FULLSCREEN]: notDeclared("only the fullscreen host offers its own exit"),
  [AFFORDANCE_RESTART]: affordance(FORM_ICON_CONTROL, COST_SESSION),
  [AFFORDANCE_PROVIDER_PICKER]: affordance(FORM_SEGMENTED, COST_SESSION),
});

const FLEET_CARD_AFFORDANCES = Object.freeze({
  [AFFORDANCE_COLLAPSE]: notDeclared("the card's rest state IS collapsed, and the toggle that opens it is the worded one — a second, cheaper chevron beside it would be two forms for one job"),
  [AFFORDANCE_CLOSE]: notDeclared("this host cannot end another machine's session; it can only stop watching"),
  // NOT AN OMISSION, and DESIGN says why: a card that grows reflows every sibling in its
  // stretched grid row, the panel's total height is a constant 192px, and the affordance for
  // "I want more of this" is EXPAND.
  [AFFORDANCE_DRAG_RESIZE]: notDeclared("the panel's total height is a constant 192px — a card that grows reflows every sibling in its stretched grid row, and the affordance for wanting more is EXPAND"),
  [AFFORDANCE_WATCH_HIDE]: affordance(FORM_WORDED_TOGGLE, COST_SUBSCRIPTION, { onLabel: HIDE_LABEL, offLabel: WATCH_LABEL }),
  [AFFORDANCE_FULLSCREEN]: affordance(FORM_ICON_CONTROL, COST_LAYOUT),
  [AFFORDANCE_EXIT_FULLSCREEN]: notDeclared("only the fullscreen host offers its own exit"),
  [AFFORDANCE_RESTART]: notDeclared("this host cannot re-spawn another machine's PTY"),
  [AFFORDANCE_PROVIDER_PICKER]: notDeclared("there is nothing to pick — the session already exists, on another machine"),
});

const FULLSCREEN_AFFORDANCES = Object.freeze({
  [AFFORDANCE_COLLAPSE]: notDeclared("the overlay is a bigger box, not a collapsible one"),
  [AFFORDANCE_CLOSE]: notDeclared("the overlay never ends a session — dismissing it returns the pane home"),
  [AFFORDANCE_DRAG_RESIZE]: notDeclared("the overlay is the whole viewport"),
  [AFFORDANCE_WATCH_HIDE]: notDeclared("the subscription belongs to the host that opened this"),
  [AFFORDANCE_FULLSCREEN]: notDeclared("it is already fullscreen"),
  // ALWAYS VISIBLE is binding, not stylistic (ADR-009 / [Build-2]): an interactive occupant
  // CLAIMS `Escape` — it is a live keystroke for the `claude` TUI on the far end — so the
  // visible control is then the ONLY exit. Never hover-revealed, never auto-hiding.
  [AFFORDANCE_EXIT_FULLSCREEN]: affordance(FORM_ICON_CONTROL, COST_LAYOUT, { alwaysVisible: true }),
  [AFFORDANCE_RESTART]: notDeclared("the overlay renders the SAME descriptor as its opener and adds no control of its own"),
  [AFFORDANCE_PROVIDER_PICKER]: notDeclared("the overlay renders the SAME descriptor as its opener and adds no control of its own"),
});

// ─── THE FOURTH TABLE (m49/ADR-007, DESIGN §S2) — a tile on the terminals home ─────────────
// Eight of eight named, TWO on and SIX off, and every absence carries its reason so a reviewer
// can tell a ruling from a forgotten line. The verdicts coincide with the fleet card's; two of
// the reasons are carried over verbatim (`restart`, `provider-picker`) because their substance
// is identical, and the rest are this surface's own.
const GRID_PANE_AFFORDANCES = Object.freeze({
  [AFFORDANCE_COLLAPSE]: notDeclared("a tile's box belongs to the grid track — a collapsed tile leaves a hole in a uniform grid, and the affordance for wanting more of one pane is EXPAND"),
  // DG-49-9, and it is the absence that matters most. SPEC scopes "focus, expand, close", and on
  // this surface `close` has no honest third meaning: it cannot end another machine's session
  // (no route, and widening the fleet face's write surface is out of scope), and it cannot mean
  // "drop this tile" (a persistent hidden set is how an operator loses track of an agent, on the
  // one screen built so they do not). An `✕` that merely unsubscribes is a SECOND form for the
  // worded toggle's job — the exact form↔cost lie `affordanceFormViolations` refuses as a value.
  // So `close` RESOLVES as `Hide terminal`, at its existing subscription cost, and layout
  // persistence therefore persists the WATCHED set and never a hidden one.
  [AFFORDANCE_CLOSE]: notDeclared("this host cannot end another machine's session, and an `✕` that merely unsubscribes is a second form for the worded toggle's job — SPEC's `close` resolves as Hide"),
  // The fleet card's reason, one grid over — and it is a DIFFERENT fact, which is why it is
  // re-stated rather than copied: the card's 192px panel height is not true about a tile, whose
  // width IS the grid track's.
  [AFFORDANCE_DRAG_RESIZE]: notDeclared("the tile's width is the grid track's; resizing one tile reflows every sibling in its row"),
  // The grid's live-socket budget IS a subscription budget (ADR-006), and the product already
  // owns the words for spending it. A second wording here would be a second vocabulary for one
  // operation, on the surface where sixteen of them are visible at once.
  [AFFORDANCE_WATCH_HIDE]: affordance(FORM_WORDED_TOGGLE, COST_SUBSCRIPTION, { onLabel: HIDE_LABEL, offLabel: WATCH_LABEL }),
  // EXPAND IS WHERE THE WORDS ARE: at every documented tile width the effective glyph is
  // 6.1-7.6px against the design system's smallest asserted-readable type of 10px, so the tile
  // is a picture and the overlay is where it becomes text (DG-49-5). `activation` is the second
  // door — see FORM_PANE_ACTIVATION. NO `alwaysVisible`: an always-visible EXIT belongs to the
  // fullscreen host, never to the opener.
  [AFFORDANCE_FULLSCREEN]: affordance(FORM_ICON_CONTROL, COST_LAYOUT, { activation: FORM_PANE_ACTIVATION }),
  [AFFORDANCE_EXIT_FULLSCREEN]: notDeclared("only the fullscreen host offers its own exit"),
  [AFFORDANCE_RESTART]: notDeclared("this host cannot re-spawn another machine's PTY"),
  [AFFORDANCE_PROVIDER_PICKER]: notDeclared("there is nothing to pick — the session already exists, on another machine"),
});

const HOST_AFFORDANCES = Object.freeze({
  [HOST_BOARD_DOCK]: BOARD_DOCK_AFFORDANCES,
  [HOST_FLEET_CARD]: FLEET_CARD_AFFORDANCES,
  [HOST_FULLSCREEN]: FULLSCREEN_AFFORDANCES,
  [HOST_GRID_PANE]: GRID_PANE_AFFORDANCES,
});

// Every affordance OFF — what an unknown host declares. FAIL CLOSED, the same reading the input
// policy takes: a host nothing recognises gets no controls at all rather than the board dock's.
const NO_AFFORDANCES = Object.freeze(
  Object.fromEntries(AFFORDANCES.map((name) => [name, notDeclared("unrecognised host — a host the control does not know declares nothing")])),
);

// hostAffordances(host) — the whole table for one host, every affordance present, declared ON or
// OFF. Reading it is how "everything else the control can do is declared OFF" becomes a fact
// rather than an assumption about what a call site passed.
export function hostAffordances(host) {
  return HOST_AFFORDANCES[host] ?? NO_AFFORDANCES;
}

export function declaresAffordance(host, name) {
  return hostAffordances(host)[name]?.declared === true;
}

// ─── THE SECOND DECLARATION: does this host show a BYTE-AREA BOX when nothing is bound? ────
// m49/ADR-007 amendment (A). The control guarded its byte area with `{subscribed ? … : null}`,
// which conflates two different facts: *is a socket open* (a subscription fact) and *does this
// host show a box when nothing is bound* (a HOST LAYOUT fact). The consequence was that a pane
// held below the cap and a pane nothing will ever feed both had nowhere to render their one
// line — DG-49-4's and DG-49-2's whole observable.
//
// AN UNCONDITIONAL BYTE AREA IS THE WRONG FIX AND WOULD BE A REGRESSION: the fleet card's rest
// state is deliberately header-only (no chip, no socket, no bytes), and making the box
// unconditional would give it one it does not want. So the second fact becomes a VALUE here,
// beside the affordance table, in the module whose whole premise is *"four hosts of one
// control, and the ONLY things that differ between them are their declarations"*. One condition
// becomes one table lookup.
//
// THE VALUES ARE THE RAMP'S OWN, PLUS AN EXPLICIT "no pane" — imported, never re-typed, because
// a second copy of a treatment word is how two vocabularies start. The module boundary, so
// nothing is authored twice: the LINE is the surface's (injected through the `reason` seam), the
// TREATMENT is the ramp's (`PANE_EMPTY_HOST`), the BOX is `TerminalByteArea`'s, and the PRESENCE
// is this table's. Nothing new is authored in the `.tsx` at all.
export const REST_PANE_NONE = "no-pane";

const HOST_REST_PANES = Object.freeze({
  // The dock is open and nothing is bound: `idle`, with its one centred line. m46's behaviour.
  [HOST_BOARD_DOCK]: PANE_EMPTY_HOST,
  // PRESERVED BYTE-FOR-BYTE: the card at rest is a header and nothing else.
  [HOST_FLEET_CARD]: REST_PANE_NONE,
  // The overlay is the whole viewport; an occupant with nothing bound must still be a box, or
  // dismissing is the only way to learn anything happened at all.
  [HOST_FULLSCREEN]: PANE_EMPTY_HOST,
  // DG-49-4's own stated reason: a uniform grid must not have holes. It is also what gives the
  // held tile and the never-fed pane somewhere to render their line.
  [HOST_GRID_PANE]: PANE_EMPTY_HOST,
});

// hostRestPane(host) — the treatment this host's byte area takes when nothing is bound. FAILS
// CLOSED to `no-pane`, the same reading as the affordance table: a host the control does not
// know renders no box rather than inventing one.
export function hostRestPane(host) {
  return HOST_REST_PANES[host] ?? REST_PANE_NONE;
}

// ─── THE THIRD DECLARATION: does this host's pane REGION activate the fullscreen affordance? ──
// m49/ADR-007 amendment (B), read back rather than re-derived at a render site. The grid tile
// declares `AFFORDANCE_FULLSCREEN` with `activation: FORM_PANE_ACTIVATION` beside its icon
// control; every other host declares the icon control alone.
export function hostActivatesPane(host) {
  return hostAffordances(host)[AFFORDANCE_FULLSCREEN]?.activation === FORM_PANE_ACTIVATION;
}

// ─── THE FOURTH: does this host's state chip ANNOUNCE its own changes? (DG-49-7) ──────────────
// m46's design GAP G1 one seam over — *"the declaration was correct and the JSX simply never
// asked it"*. `aria-live="polite"` on the per-pane chip was built for ONE pane on ONE card and is
// right for one pane; on a grid of a dozen, a 5s poll plus a dozen sockets is a queue of polite
// announcements from panes the user is not looking at, with no way to tell which tile spoke. So
// the GRID owns one region and the tile's chip goes quiet — in that host ONLY, which is what
// keeps the board dock, the fleet card and the expanded pane (one pane, in a dialog) as they are.
//
// THE CHIP STILL RENDERS ITS WORD EVERYWHERE: this turns the ANNOUNCEMENT off, never the signal.
const HOST_ANNOUNCES_STATE = Object.freeze({
  [HOST_BOARD_DOCK]: true,
  [HOST_FLEET_CARD]: true,
  [HOST_FULLSCREEN]: true,
  [HOST_GRID_PANE]: false,
});

// FAILS CLOSED TO SILENT, deliberately in the opposite direction from the affordance table's
// fail-closed: an unrecognised host that announced would put an unowned live region on a page
// nobody designed the announcement for, and a missing announcement degrades to "the word is still
// on screen" while a surprise one interrupts a screen-reader user mid-sentence.
export function hostAnnouncesState(host) {
  return HOST_ANNOUNCES_STATE[host] === true;
}

// ─── THE FIFTH: how many ROWS this host's header has (DESIGN §S2's C1a/C1b) ───────────────────
// The grid tile has TWO — identity (lockup, identity line, `read-only` pill, `needs input` pill;
// NO controls) then status (the chip, the repo field, the controls at `ml-auto`) — because at a
// ≈394px track one row cannot hold both without the yield order eating the identity, which is the
// element that order forbids dropping. m46's three hosts keep the single row they ship with.
const HOST_HEADER_ROWS = Object.freeze({
  [HOST_BOARD_DOCK]: 1,
  [HOST_FLEET_CARD]: 1,
  [HOST_FULLSCREEN]: 1,
  [HOST_GRID_PANE]: 2,
});

export function hostHeaderRows(host) {
  return HOST_HEADER_ROWS[host] ?? 1;
}

// ─── THE SIXTH: what SHAPE is this host's byte box? ───────────────────────────────────────────
// The control had two answers hard-coded at its own render site — `flex-1` for the dock and a
// hard-coded `h-48` for everything else — and `h-48` is the FLEET CARD's number (its panel is a
// constant 192px). Applied to a grid tile it is a 192px box inside a ≈394px track, which draws a
// visible letterbox band above and below the mirror's own 640×408 picture; DESIGN calls a band in
// a TILE a gap, while the band in the fullscreen overlay is expected (its aspect is the
// viewport's). So a tile's box IS the source's aspect, and the number stops being one host's
// measurement standing in for three. The mock's 394×318 tile is this arithmetic.
export const PANE_BOX_FILL = "fill";
export const PANE_BOX_FIXED = "fixed";
export const PANE_BOX_ASPECT = "aspect";

const HOST_PANE_BOXES = Object.freeze({
  // The dock's height is the operator's, dragged and clamped; the byte area takes what is left.
  [HOST_BOARD_DOCK]: PANE_BOX_FILL,
  // The card's panel is a constant 192px, which is where `h-48` came from and where it belongs.
  [HOST_FLEET_CARD]: PANE_BOX_FIXED,
  [HOST_FULLSCREEN]: PANE_BOX_FILL,
  // The tile's width is the grid track's, and its height follows the mirror's own 80×24 screen.
  [HOST_GRID_PANE]: PANE_BOX_ASPECT,
});

export function hostPaneBox(host) {
  return HOST_PANE_BOXES[host] ?? PANE_BOX_FIXED;
}

// ─── WHAT A SURFACE THAT ARBITRATES N PANES DECIDES FOR ONE OF THEM (m49/05) ─────────────────
//
// A surface holding ONE pane decides nothing about it: the control's own state is the whole
// truth, and that is m46's shape, preserved exactly by `standing == null` below. A surface
// holding SIXTEEN decides three things no pane can decide for itself, each measured rather than
// stylistic:
//
//   · WHICH PANES HOLD A SOCKET. The live-socket ceiling is a property of the GRID (ADR-006); a
//     per-pane "am I allowed" check is N independent decisions that can disagree, and the grid's
//     count becomes emergent again — the thing SPEC forbids in terms.
//   · WHETHER THE WORDED TOGGLE IS OFFERED AT ALL. At the cap there is no slot to promote into,
//     so DG-49-4 removes the control and puts the recovery in the line above it.
//   · WHICH PANE IS THE SURFACE'S SINGLE ROVING TAB STOP. Twelve tiles are ONE tab stop, not
//     forty (DESIGN §focus model rule 1), and "which one" is a fact about the SET.
//
// …plus the facts about the SESSION that the mount's frozen thirteen-key shape deliberately does
// not carry (`mark`, the agent-state word; `field`, the secondary identity field; `note`, an
// annotation the transport cannot know). That shape is shared by three producers so a reader of
// one has read all three, and a fourteenth key for a fact one surface finds interesting is
// exactly what the freeze refuses.
// R-1, AND IT IS A RULE RATHER THAN A CASE (m49/05, designer's GAP-1): AN AFFORDANCE IS OFFERED
// IFF THERE IS SOMETHING TO ACT ON. The expand control already followed it — a held tile has no
// pane to present, so it is not offered — and the toggle did not: a pane that BINDS NOTHING has no
// subscription to release, so `Hide terminal` on it is a false affordance, and DG-49-9 forbids the
// toggle meaning "remove this tile". DG-49-4's own precedent settles the form: a control that
// cannot do its job is ABSENT, never disabled. The pane line already names the cause.
export function terminalPaneStanding(host, standing, ownSubscribed, bound = true) {
  const declared = standing != null && typeof standing === "object" && !Array.isArray(standing) ? standing : null;
  const activatesPane = hostActivatesPane(host);
  // The EFFECTIVE subscription, computed once: R-1 below reads it, and reading the control's own
  // state there instead would answer about a host that has not been arbitrated yet.
  const subscribed = typeof declared?.subscribed === "boolean" ? declared.subscribed : ownSubscribed === true;
  const text = (value) => (typeof value === "string" && value !== "" ? value : null);
  return Object.freeze({
    // The SURFACE's answer when it gave one, the control's own state when it did not. Never a
    // merge: a surface that arbitrates owns the answer, and one that does not is not consulted.
    subscribed,
    // OFFERED UNLESS WITHHELD, and never where there is nothing to release (R-1): a pane holding
    // no binding at all is a pane with no subscription, whatever the surface arbitrated. A pane
    // that is merely UNSUBSCRIBED keeps it — that toggle is the way back.
    offersToggle: declared?.watchOffered !== false && (bound !== false || subscribed !== true),
    activatesPane,
    // MAY THIS PANE BE PRESENTED AT ALL? Offered unless withheld, like every other member here.
    // A surface withholds it for a pane that must not take the keyboard: the fullscreen door is
    // the only typing path a tile has (DG-49-5 — taking the keyboard IS the expand), so closing
    // the door closes the keyboard WITHOUT touching the posture, which is part of the session's
    // identity and could not be changed without re-keying the session and closing its socket.
    presents: declared?.presents !== false,
    // `undefined` where no host declares the pane-activation form, so the rendered props of the
    // three hosts m46 shipped do not gain a key.
    tabIndex: activatesPane ? (declared?.tabStop === true ? 0 : -1) : undefined,
    restPane: hostRestPane(host),
    paneBox: hostPaneBox(host),
    mark: text(declared?.mark),
    field: text(declared?.field),
    // The annotation rides HERE rather than on the mount because posture is part of the session's
    // IDENTITY: annotating through the mount would rebuild the xterm and close the very socket
    // the annotation is about.
    note: text(declared?.note),
  });
}

// The keys that activate a pane region declaring `FORM_PANE_ACTIVATION`. `Enter` AND `Space`,
// because the tile is a focusable element with a role and an accessible name and those are the
// two keys the platform binds to activation — ADR-007 (B)'s accessibility obligation, which is
// not optional. Named here so the `.tsx` tests a value rather than a literal.
export function activatesPaneOnKey(key) {
  return key === "Enter" || key === " " || key === "Spacebar";
}

// affordanceFormViolations(hostOrTable) — DESIGN's form rule, as a value.
//
//   · every declared FORM (and every `activation` beside one) is a member of the closed
//     `AFFORDANCE_FORMS` vocabulary — added m49/03, because a list nothing reads is not closed;
//   · no CHEVRON anywhere may carry a cost that ends a session or a subscription;
//   · no WORDED subscribe/unsubscribe TOGGLE may carry a cost that is merely layout.
//
// Both directions, because both are lies and they are opposite lies: a chevron that unsubscribes
// takes the stream away from an operator who asked only for space, and a worded toggle that merely
// collapses tells an operator they stopped watching a worker when they did not.
//
// IT TAKES A TABLE AS WELL AS A HOST NAME, AND THAT IS WHAT MAKES IT PROVABLE. A detector whose
// only input is one of three frozen tables can only ever be shown to stay QUIET; it can never be
// shown to FIRE, so a mutation that makes it return `[]` unconditionally reads green everywhere.
// (A mutation review found exactly that: the one plant was fed to a locally re-implemented copy in
// the suite, so the SHIPPED detector was never once driven to a violation.) Taking the subject as
// an ARGUMENT is the same rule the socket builder follows for origins and the geometry helper
// follows for its box — the input is passed in, so the function is drivable.
export function affordanceFormViolations(hostOrTable) {
  const table =
    hostOrTable != null && typeof hostOrTable === "object" ? hostOrTable : hostAffordances(hostOrTable);
  const violations = [];
  // Every KEY the table holds, not just the eight this module names: a host that grew a ninth
  // affordance must be policed by the same rule, and a sweep over the known list would skip it.
  for (const name of Object.keys(table ?? {})) {
    const entry = table[name];
    if (entry?.declared !== true) continue;
    // THE VOCABULARY IS CLOSED IN FACT, NOT IN PROSE (m49/03, architect's review — the TENTH
    // OBLIGATION). `AFFORDANCE_FORMS` shipped as a list nothing read, so a host could declare
    // `form: "double-click"` with `activation: "hold-meta"` and this detector returned NOTHING —
    // while ADR-007 AMENDMENT (B) rests its whole "no prop, no new mechanism" argument on the
    // sixth form being *policed by a detector that already exists*. It is policed here, and the
    // SEVENTH form is policed the same way on arrival: a form is a member of the list or it is a
    // word the control cannot render, which on screen is a control that silently does not appear.
    if (!AFFORDANCE_FORMS.includes(entry.form)) {
      violations.push(`${name}: declares the form \`${entry.form}\`, which is not one of the ${AFFORDANCE_FORMS.length} forms this control knows (${AFFORDANCE_FORMS.join(", ")})`);
    }
    if (entry.activation !== undefined && !AFFORDANCE_FORMS.includes(entry.activation)) {
      violations.push(`${name}: declares the activation \`${entry.activation}\`, which is not one of the ${AFFORDANCE_FORMS.length} forms this control knows (${AFFORDANCE_FORMS.join(", ")})`);
    }
    if (entry.form === FORM_CHEVRON && entry.cost !== COST_LAYOUT) {
      violations.push(`${name}: a chevron means LAYOUT ONLY, and this one costs ${entry.cost}`);
    }
    if (entry.form === FORM_WORDED_TOGGLE && entry.cost === COST_LAYOUT) {
      violations.push(`${name}: a worded subscribe/unsubscribe toggle may not cost merely layout`);
    }
    // THE THIRD CLAUSE, and it is what stops the two tables being decoration: the COST an
    // affordance DECLARES must be the cost the CHANGE it dispatches actually has. The component
    // renders the form from one table and dispatches from the other, so a disagreement here is a
    // control whose appearance and whose effect were decided in two places.
    for (const engaged of [false, true]) {
      const kind = changeForAffordance(name, engaged);
      if (kind == null) continue;
      const actual = CHANGE_CATALOGUE[kind]?.cost ?? null;
      if (actual != null && actual !== entry.cost) {
        violations.push(`${name}: declares cost ${entry.cost} but dispatches \`${kind}\`, which costs ${actual}`);
      }
    }
  }
  return violations;
}

// ─── (2) THE SESSION'S IDENTITY ────────────────────────────────────────────────────────────
//
// The control's state, as this module reads it. Only the first five fields are identity; the
// rest are HOST state and are here so `applyHostChange` can move them without touching the
// session — which is the whole point.
export function terminalControlState(input = {}) {
  return Object.freeze({
    source: input.source ?? null,
    params: Object.freeze({ ...(input.params ?? {}) }),
    posture: input.posture ?? null,
    runToken: Number.isFinite(input.runToken) ? input.runToken : 0,
    subscribed: input.subscribed !== false,
    // ── host state: never identity ──
    collapsed: input.collapsed === true,
    expanded: input.expanded === true,
    boxHeight: Number.isFinite(input.boxHeight) ? input.boxHeight : null,
    hostRevision: Number.isFinite(input.hostRevision) ? input.hostRevision : 0,
    // Whether any byte has ever been painted into this session's scrollback. Not identity —
    // it is what makes the difference between "intact" and "empty" when a session SURVIVES.
    painted: input.painted === true,
    // A document load ends everything, including the control (ADR-009).
    pageAlive: input.pageAlive !== false,
  });
}

// The identity fields, named so a reader can check the list against the code rather than
// inferring it, and so a test can assert the list itself did not grow a layout fact.
export const SESSION_IDENTITY_FIELDS = Object.freeze(["source.kind", "params", "posture", "runToken", "subscribed"]);

// The layout facts that are DELIBERATELY not identity. Enumerated for the same reason.
export const NON_IDENTITY_FIELDS = Object.freeze(["collapsed", "expanded", "boxHeight", "hostRevision", "painted"]);

// terminalSessionIdentity(state) — the ONE string the `.tsx` uses as its session effect's
// dependency. `null` means "there is no session here": nothing bound, an unaddressable
// half-tuple, an unsubscribed host, or a document that has gone.
//
// The pane key comes from the shared identity model, so the tuple that addresses a session is
// the SOURCE's declared params — whatever they are — and a third source needs no edit here.
export function terminalSessionIdentity(state) {
  const value = state ?? {};
  if (value.pageAlive === false) return null;
  if (value.subscribed === false) return null;
  const key = terminalPaneKey(value.source, value.params);
  if (key == null) return null;
  return `${key}::${value.posture ?? "unknown-posture"}::${value.runToken ?? 0}`;
}

// ─── The host changes, as pure transforms ──────────────────────────────────────────────────
// Each is a thing an operator or a host can DO, with its cost declared beside it. The catalogue
// is the readable half of the rule: "collapse" sits next to `COST_LAYOUT` and "hide" sits next
// to `COST_SUBSCRIPTION`, in the same table, where they can be compared.
export const HOST_CHANGES = Object.freeze({
  COLLAPSE: "collapse",
  EXPAND: "expand",
  RESIZE: "resize",
  HOST_RERENDER: "host-rerender",
  PRESENT_FULLSCREEN: "present-fullscreen",
  DISMISS_FULLSCREEN: "dismiss-fullscreen",
  HIDE: "hide",
  WATCH: "watch",
  CLOSE: "close",
  REBIND: "rebind",
  RESTART: "restart",
  SELECT_PROVIDER: "select-provider",
  SET_POSTURE: "set-posture",
  NAVIGATE: "navigate",
});

export const CHANGE_CATALOGUE = Object.freeze({
  [HOST_CHANGES.COLLAPSE]: Object.freeze({ cost: COST_LAYOUT, why: "collapse is layout; it is not part of the session's identity" }),
  [HOST_CHANGES.EXPAND]: Object.freeze({ cost: COST_LAYOUT, why: "the byte area was hidden, never unmounted" }),
  [HOST_CHANGES.RESIZE]: Object.freeze({ cost: COST_LAYOUT, why: "a resize re-fits (fit) or re-scales (scale); it rebuilds nothing" }),
  [HOST_CHANGES.HOST_RERENDER]: Object.freeze({ cost: COST_LAYOUT, why: "nothing in the host's own data is part of the session's identity" }),
  [HOST_CHANGES.PRESENT_FULLSCREEN]: Object.freeze({ cost: COST_LAYOUT, why: "the live node is ADOPTED and returned home — 46/05 owns that proof" }),
  [HOST_CHANGES.DISMISS_FULLSCREEN]: Object.freeze({ cost: COST_LAYOUT, why: "the live node is returned home; presenting re-created nothing" }),
  [HOST_CHANGES.HIDE]: Object.freeze({ cost: COST_SUBSCRIPTION, why: "hide closes the socket; the mirror is ephemeral by design" }),
  [HOST_CHANGES.WATCH]: Object.freeze({ cost: COST_SUBSCRIPTION, why: "a fresh subscribe opens ONE new socket onto an empty pane" }),
  [HOST_CHANGES.CLOSE]: Object.freeze({ cost: COST_SESSION, why: "close is the ONLY control that ends a local session" }),
  [HOST_CHANGES.REBIND]: Object.freeze({ cost: COST_SESSION, why: "a different address is a different session — routing is tuple-only" }),
  [HOST_CHANGES.RESTART]: Object.freeze({ cost: COST_SESSION, why: "restart is a deliberate re-spawn, not a reconnect" }),
  [HOST_CHANGES.SELECT_PROVIDER]: Object.freeze({ cost: COST_SESSION, why: "a provider is a property of the spawn; the picker is LOCKED while live for exactly this reason" }),
  [HOST_CHANGES.SET_POSTURE]: Object.freeze({ cost: COST_SESSION, why: "stdin is fixed at xterm construction — UNREACHABLE in m46, named so m49 does not discover it" }),
  [HOST_CHANGES.NAVIGATE]: Object.freeze({ cost: COST_PAGE_LOAD, why: "navigation is a full page load; this is STATED, not a defect, and no story may promise otherwise" }),
});

// applyHostChange(state, change) — the transform. `change` is `{ kind, ... }`; an unknown kind
// returns the SAME state, because a change this module has not learned must not be allowed to
// look like a teardown.
export function applyHostChange(state, change) {
  const current = terminalControlState(state);
  const kind = typeof change === "string" ? change : change?.kind;
  switch (kind) {
    case HOST_CHANGES.COLLAPSE:
      return terminalControlState({ ...current, collapsed: true });
    case HOST_CHANGES.EXPAND:
      return terminalControlState({ ...current, collapsed: false });
    case HOST_CHANGES.RESIZE:
      return terminalControlState({ ...current, boxHeight: change?.boxHeight ?? current.boxHeight });
    case HOST_CHANGES.HOST_RERENDER:
      return terminalControlState({ ...current, hostRevision: current.hostRevision + 1 });
    case HOST_CHANGES.PRESENT_FULLSCREEN:
      return terminalControlState({ ...current, expanded: true });
    case HOST_CHANGES.DISMISS_FULLSCREEN:
      return terminalControlState({ ...current, expanded: false });
    case HOST_CHANGES.HIDE:
      return terminalControlState({ ...current, subscribed: false, expanded: false, painted: false });
    case HOST_CHANGES.WATCH:
      return terminalControlState({ ...current, subscribed: true, painted: false });
    case HOST_CHANGES.CLOSE:
      return terminalControlState({ ...current, source: null, params: {}, subscribed: false, painted: false });
    case HOST_CHANGES.REBIND:
      return terminalControlState({
        ...current,
        source: change?.source ?? current.source,
        params: { ...current.params, ...(change?.params ?? {}) },
        painted: false,
      });
    case HOST_CHANGES.RESTART:
      return terminalControlState({ ...current, runToken: current.runToken + 1, painted: false });
    case HOST_CHANGES.SELECT_PROVIDER:
      return terminalControlState({ ...current, params: { ...current.params, provider: change?.provider ?? null }, painted: false });
    case HOST_CHANGES.SET_POSTURE:
      return terminalControlState({ ...current, posture: change?.posture ?? current.posture, painted: false });
    case HOST_CHANGES.NAVIGATE:
      return terminalControlState({ ...current, pageAlive: false, painted: false });
    default:
      return current;
  }
}

// ─── THE TIE: an affordance and the change it dispatches ───────────────────────────────────
//
// WHY THIS EXISTS, and it is the difference between a model and a gate. Two frozen tables that
// only ever validate each other prove nothing about the product: at 46/04's first review the form
// rule could not see that Watch/Hide was a worded button and collapse was a chevron, because the
// COMPONENT chose both forms independently and the tables were never consulted. So the component
// now renders each control's FORM from `hostAffordances` and dispatches the change THIS map pairs
// with it — one row, one form, one cost, one transition — and `affordanceFormViolations` polices
// the pair rather than a literal beside a literal.
//
// `engaged` is the toggle's current side, because two of these are toggles and a toggle's change
// depends on which way it is pointing: an OPEN peek's worded toggle unsubscribes, a closed one
// subscribes, and both are the same affordance.
export const AFFORDANCE_CHANGE = Object.freeze({
  [AFFORDANCE_COLLAPSE]: Object.freeze({ engaged: HOST_CHANGES.EXPAND, idle: HOST_CHANGES.COLLAPSE }),
  [AFFORDANCE_CLOSE]: Object.freeze({ engaged: HOST_CHANGES.CLOSE, idle: HOST_CHANGES.CLOSE }),
  [AFFORDANCE_DRAG_RESIZE]: Object.freeze({ engaged: HOST_CHANGES.RESIZE, idle: HOST_CHANGES.RESIZE }),
  [AFFORDANCE_WATCH_HIDE]: Object.freeze({ engaged: HOST_CHANGES.HIDE, idle: HOST_CHANGES.WATCH }),
  [AFFORDANCE_FULLSCREEN]: Object.freeze({ engaged: HOST_CHANGES.PRESENT_FULLSCREEN, idle: HOST_CHANGES.PRESENT_FULLSCREEN }),
  [AFFORDANCE_EXIT_FULLSCREEN]: Object.freeze({ engaged: HOST_CHANGES.DISMISS_FULLSCREEN, idle: HOST_CHANGES.DISMISS_FULLSCREEN }),
  [AFFORDANCE_RESTART]: Object.freeze({ engaged: HOST_CHANGES.RESTART, idle: HOST_CHANGES.RESTART }),
  [AFFORDANCE_PROVIDER_PICKER]: Object.freeze({ engaged: HOST_CHANGES.SELECT_PROVIDER, idle: HOST_CHANGES.SELECT_PROVIDER }),
});

// changeForAffordance(name, engaged) — the change an affordance dispatches, or `null` for a name
// this module does not know (which is not a change: an unknown control must do NOTHING rather
// than something plausible).
export function changeForAffordance(name, engaged = false) {
  const pair = AFFORDANCE_CHANGE[name];
  if (pair == null) return null;
  return engaged ? pair.engaged : pair.idle;
}

export const SESSION_SURVIVES = "survives";
export const SESSION_TEARS_DOWN = "tears-down";
export const SESSION_NONE = "none";

export const SCROLLBACK_INTACT = "intact";
export const SCROLLBACK_EMPTY = "empty";
export const SCROLLBACK_GONE = "gone";

// sessionOutcome(before, after) — did this change end the session, and what happened to the
// scrollback?
//
// `continuous` is the half that a boolean verdict cannot carry and that the operator actually
// feels: a session that SURVIVED kept receiving while it was hidden, so the output produced
// during a collapse is present on expand, in order, with no gap — which is a different claim
// from "there is still a terminal here".
export function sessionOutcome(before, after) {
  const from = terminalSessionIdentity(before);
  const to = terminalSessionIdentity(after);
  if (from == null && to == null) return frozenOutcome(SESSION_NONE, SCROLLBACK_GONE, false);
  if (from != null && to === from) {
    const painted = terminalControlState(after).painted;
    return frozenOutcome(SESSION_SURVIVES, painted ? SCROLLBACK_INTACT : SCROLLBACK_EMPTY, true);
  }
  return frozenOutcome(SESSION_TEARS_DOWN, SCROLLBACK_GONE, false);
}

function frozenOutcome(verdict, scrollback, continuous) {
  return Object.freeze({ verdict, scrollback, continuous });
}

// changeOutcome(state, change) — the whole answer for one change applied to one state, with the
// catalogue's own reason attached. This is what a scenario reads.
export function changeOutcome(state, change) {
  const kind = typeof change === "string" ? change : change?.kind;
  const before = terminalControlState(state);
  const after = applyHostChange(before, change);
  const entry = CHANGE_CATALOGUE[kind] ?? null;
  return Object.freeze({
    ...sessionOutcome(before, after),
    cost: entry?.cost ?? null,
    why: entry?.why ?? null,
    identityBefore: terminalSessionIdentity(before),
    identityAfter: terminalSessionIdentity(after),
  });
}

// ─── `collapsed` IS NOT A STATE WORD ───────────────────────────────────────────────────────
// The ramp has no word for a host's layout, and it must never grow one: a second vocabulary is
// the exact defect this milestone deletes. Exported as a value so the scenario that asserts it
// does not have to grep the ramp.
export const HOST_LAYOUT_FLAGS = Object.freeze(["collapsed", "expanded"]);
export function isRampState(word, rampWords) {
  return Array.isArray(rampWords) && rampWords.includes(word);
}
