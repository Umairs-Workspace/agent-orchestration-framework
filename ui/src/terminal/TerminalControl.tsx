// Adapted from elirantutia/vibeyard (MIT) — the xterm terminal-pane wiring (terminal-pane.ts:
// new Terminal(), loadAddon(FitAddon/WebLinksAddon), term.open(), fit(), term.onData → carrier,
// carrier → term.write(), and the dispose/close cleanup), re-homed off vibeyard's Electron IPC
// carrier onto a browser WebSocket. vibeyard is MIT-licensed; see the repo NOTICE file. This
// file is where BOTH predecessors' derivations now live — `ui/src/board/TerminalDock.tsx` ported
// the wiring first and `ui/src/fleet/terminal-view/FleetTerminalView.tsx` reached it through
// that; milestone 46 / story 04 deletes both and the attribution travels with the derivation
// (ADR-001; `test/arch/acd-vibeyard-attribution.test.mjs` names this file).
//
// ════════════════════════════════════════════════════════════════════════════════════════════
// THE ONE TERMINAL CONTROL (milestone 46 / story 04 — ADR-001..005; DESIGN §Surfaces).
//
// THIS FILE IS A THIN CONSUMER AND THAT IS AN INVARIANT, not a preference (ADR-001): every
// DECISION below is imported — which URL, which geometry mode, which state word, which copy,
// whether input is wired, what the drag clamp is, which affordances this host declares, what ends
// a session — and what is left here is JSX, refs, effects and the xterm/DOM calls only a browser
// can make. `acd-terminal-control-boundary` fails CI if that split slips. AND SINCE 2026-08-09
// THIS FILE IS MOUNTED FOR REAL by `test/terminal-control-opens-its-socket.test.mjs`: "no test in
// this repo can reach JSX" was true, and it is how a control that opened NO SOCKET shipped green.
//
// FOUR HOSTS, ONE CONTROL: the board dock, the fleet card peek, the expand-to-fullscreen overlay
// and — since m49/ADR-007 — the terminals home's grid pane. The ONLY things that differ between
// them are the two declarations their call sites make — the SOURCE being opened and the POSTURE
// it is mounted at — plus the affordance table `host-model.mjs` holds for each host.
//
// TWO RULES THIS FILE IS MOST LIKELY TO BREAK, both earned and both now structural:
//
//   1. COLLAPSING MUST NOT TEAR THE SESSION DOWN. The predecessor said so in a comment beside a
//      dependency array — a mechanism only React can read, in a repo with no React test. Here
//      the session effect's dependency is `terminalSessionIdentity(...)`, a STRING a `node:test`
//      compares, and `collapsed` is not one of its inputs BY CONSTRUCTION rather than by anyone
//      remembering. The byte area is hidden with CSS and stays MOUNTED, so the WebSocket, the
//      PTY, the running agent and the scrollback all survive.
//
//   2. READ-ONLY MEANS READ-ONLY IN FACT. `disableStdin` and the cursor come off the input
//      policy's model — never a literal here — and the `onData` sink is registered only when the
//      policy says so. Under one control NEITHER posture has an input row, so the ABSENCE of one
//      no longer signals anything: the `read-only` LABEL and the non-blinking cursor are the
//      only two signals of the posture left, which is why the label is mandatory and `shrink-0`.
//
// ONE INSTANCE, ONE SOCKET, THROUGH EVERY TRANSITION. The xterm paints into a host element this
// component creates imperatively and MOVES between the inline pane and the fullscreen overlay.
// Presenting must not re-subscribe: the mirror is ephemeral, so a re-subscribe shows an empty
// pane, which is the visible tell that this was broken.
// ════════════════════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type * as React from "react";
import { X, ChevronDown, ChevronUp, RotateCw, Maximize2 } from "lucide-react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { cn } from "@/lib/utils";
import { CHROME_HEIGHT_ATTRIBUTE, CHROME_HEIGHT_PROPERTY } from "../app/shell-layout.mjs";
// THE SHELL'S ONE FULLSCREEN DOOR (ADR-009; DESIGN §S3: "reached through `requestFullscreen`
// — NOT a component-owned `createPortal(document.body)`"). This control asks; it never builds an
// overlay of its own, and it imports the CHANNEL rather than the shell component
// (`acd-shell-bus-single-host`). `hasShellHost` is the same question `SurfaceSlot` asks: with no
// shell in the bundle there is no door, so the affordance is not offered rather than offered and
// dead.
import { hasShellHost } from "../app/shell-bus.mjs";
import { sourceCarriesControlFrames, ORIGIN_ROLE_FLEET } from "./source-table.mjs";
import {
  applyControlFrame,
  applyTerminalEvent,
  bindSource,
  describeTerminalState,
  initialTerminalState,
  parseControlFrame,
  terminalEntryState,
  terminalStateUnavailable,
  TERMINAL_EVENTS,
  UNAVAILABLE_CAUSES,
} from "./state-ramp.mjs";
import { emitFit, geometryPlanFor, GEOMETRY_FIT } from "./geometry.mjs";
import type { ResizeMessage } from "./geometry.mjs";
import { terminalSocketUrl, REFUSAL_MISSING_ORIGIN, REFUSAL_UNRESOLVABLE_ORIGIN } from "./socket-url.mjs";
import { mountModelFor } from "./input-policy.mjs";
import type { MountPostureName } from "./input-policy.mjs";
import { terminalPaneIdentity, terminalPaneLabel } from "./pane-identity.mjs";
import { clampDockHeight, contentRegionHeight, dockHeightBounds } from "./clamp.mjs";
import { fullscreenOpenerFor } from "./fullscreen-request.mjs";
// C1's picker and C2+C3, each its own region and its own component — `acd-ui-surface-file-budget`'s
// remedy applied to this file at 46/05: a surface gains child components, not blocks.
import { TerminalByteArea } from "./TerminalByteArea";
import { TerminalHeader, TerminalIdentity } from "./TerminalIdentity";
import { TerminalControls } from "./TerminalControls";
import { TerminalDragHandle } from "./TerminalDragHandle";
import { TerminalFullscreenDoor } from "./TerminalFullscreenOccupant";
import { initialPicker, selectProvider, withSelectedProvider } from "./provider-picker.mjs";
import type { PickerState } from "./provider-picker.mjs";
import {
  AFFORDANCE_CLOSE,
  AFFORDANCE_COLLAPSE,
  AFFORDANCE_DRAG_RESIZE,
  AFFORDANCE_EXIT_FULLSCREEN,
  AFFORDANCE_FULLSCREEN,
  AFFORDANCE_PROVIDER_PICKER,
  AFFORDANCE_RESTART,
  AFFORDANCE_WATCH_HIDE,
  activatesPaneOnKey,
  applyHostChange,
  changeForAffordance,
  declaresAffordance,
  hostAffordances,
  terminalControlState,
  terminalPaneStanding,
  terminalSessionIdentity,
  FORM_ICON_CONTROL,
  FORM_PANE_ACTIVATION,
  HOST_BOARD_DOCK,
  HOST_FULLSCREEN,
  REST_PANE_NONE,
} from "./host-model.mjs";
import type { TerminalHost, TerminalPaneStandingInput } from "./host-model.mjs";
import {
  TERMINAL_BORDER_CLASS,
  TERMINAL_CHROME_BG_CLASS,
  TERMINAL_FOCUS_RING_CLASS,
  TERMINAL_FONT_FAMILY,
  TERMINAL_FONT_SIZE,
  TERMINAL_HEADER_CHROME_CLASS,
  TERMINAL_HOVER_BG_CLASS,
  TERMINAL_LINE_HEIGHT,
  TERMINAL_XTERM_THEME,
  terminalPaneBoxClass,
} from "./palette.mjs";

// The mount declaration BOTH call sites produce and this control consumes. ONE home, in the
// shared domain folder — not the board's, which is where it briefly lived and which would have
// been a sixth `fleet → board` edge in the milestone chartered to remove them (ADR-001).
import type { TerminalMountDeclaration } from "./mount.mjs";
export type TerminalMount = TerminalMountDeclaration;

// The origins the surface was HANDED (ADR-004). `self` is the page's own origin; `fleet` is the
// served fact. Neither is guessed here and no port literal appears anywhere in this file. The
// type is the CORE's — one home, so a call site cannot hand this component a shape the builder
// would then refuse.
import type { TerminalOrigins } from "./socket-url.mjs";
export type { TerminalOrigins };

// Every header control reaches a >=24x24 hit target BY PADDING, never by weight or fill, so the
// reading hierarchy (identity > read-only > state > expand > toggle) survives (SC 2.5.8).
// `shrink-0` IS LOAD-BEARING, NOT TIDINESS (defect found on the running system, 2026-08-09).
// `h-7 w-7` is a BASIS, and a flex child's basis is what flexbox takes from first. The inline
// header protects these by wrapping them in a `shrink-0` span; the FULLSCREEN occupant renders
// its exit as a direct child of a `flex-nowrap` header, where nothing protected it — measured
// at **17×28**, a 28px door squeezed to 17px, in the one place the occupant's own comment calls
// "then the ONLY exit" because an interactive pane claims `Escape`. The class is the single home
// every control's form comes from, so the guarantee belongs here rather than at each call site.
const CONTROL_CLASS = `grid h-7 w-7 shrink-0 place-items-center rounded text-zinc-400 transition ${TERMINAL_HOVER_BG_CLASS}`;

// The one place this file reads a browser global for the drag clamp, and it hands the number
// STRAIGHT to `clamp.mjs` — the clamp itself is a pure function of the content box (ADR-009:
// off the viewport and onto the shell's published chrome height, which is wrong by exactly the
// chrome height if you clamp against `window.innerHeight`).
//
// IT READS THE PROPERTY OFF ITS OWN ELEMENT, and that is not a detail — it is a measured defect
// this function once had. The shell publishes `--aof-shell-chrome-height` on the shell ROOT, not
// on `document.documentElement`; a custom property INHERITS DOWNWARDS, so reading it off the
// documentElement (which is the root's PARENT) returns the EMPTY STRING and silently degrades
// every clamp back to the viewport — the exact defect this function exists to fix, wearing the
// fix's own name. Measured in headless Chromium against this DOM shape: `""` off
// `document.documentElement`, `"48px"` off the dock's own section, and `"48px"` still off an
// element inside a `position: fixed` box (inheritance is unaffected by positioning).
//
// SO THERE IS NO `?? document.documentElement` FALLBACK. Keeping one would keep the bug's exact
// code path alive for the case where the ref is not yet populated — and `clamp.mjs` already has
// the right answer for that case, which is "unmeasured, do not resize the dock at all".
//
// The ARITHMETIC lives in `clamp.mjs` (`contentRegionHeight`), where a test can reach it; what is
// left here is the two DOM reads only a browser can make. `acd-terminal-control-boundary` fails
// CI if this file grows the arithmetic back.
function readContentBoxHeight(element: Element | null): number | null {
  if (element == null || typeof window === "undefined" || typeof getComputedStyle !== "function") return null;
  return contentRegionHeight(window.innerHeight, getComputedStyle(element).getPropertyValue(CHROME_HEIGHT_PROPERTY));
}

export function TerminalControl({
  host,
  mount,
  onClose,
  origins,
  standing,
}: {
  host: TerminalHost;
  mount: TerminalMount;
  onClose?: () => void;
  origins: TerminalOrigins;
  // What a surface holding N panes decided about THIS one — the arbitrated subscription, whether
  // the toggle is offered at all, the surface's single roving tab stop, and the session facts the
  // mount's frozen shape does not carry. Its whole meaning is in `terminalPaneStanding`; ABSENT is
  // m46's behaviour, unchanged, at every host that ships today.
  standing?: TerminalPaneStandingInput | null;
}) {
  const affordances = hostAffordances(host);
  const isDock = host === HOST_BOARD_DOCK;

  const [picker, setPicker] = useState<PickerState>(() => initialPicker());
  // ONE HOST STATE, DRIVEN BY THE SHARED REDUCER. Four separate `useState` booleans were four
  // transitions re-implemented in setters beside a model that already had them — they agreed by
  // inspection only, which is ADR-007's own rule ("a fitness function whose subject has no
  // production caller is not a weak gate, it is a FALSE one") arriving in the milestone that
  // states it. Every control below dispatches a NAMED change through `applyHostChange`, so the
  // 28 assertions in `terminal-collapse-is-not-hide.test.mjs` are about the code that ships.
  //
  // The board dock is subscribed the moment it mounts (closing it unmounts the component); the
  // fleet card rests CLOSED and its worded toggle subscribes. Two costs, two forms — never one
  // button (DESIGN §Collapse is not Hide, enforced as a value in host-model.mjs).
  const [hostState, setHostState] = useState(() =>
    terminalControlState({ subscribed: !declaresAffordance(host, AFFORDANCE_WATCH_HIDE) }),
  );
  // AN UNMEASURED BOX ON THE FIRST FRAME, and that is the designed state rather than an
  // omission: the published property is only legible once this component's own element is in the
  // document, so the first render has no box and `clamp.mjs` answers "I was not resized".
  const [contentBox, setContentBox] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [state, setState] = useState(() => initialTerminalState());

  const sectionRef = useRef<HTMLElement | null>(null);
  const inlineRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  // The ONE xterm instance and the ONE host element it paints into — held across renders so the
  // fullscreen transition RE-PARENTS the same painted terminal rather than rebuilding it.
  const termRef = useRef<Terminal | null>(null);
  const paneRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  // The live re-fit/re-scale, held so the SHELL's post-transition tick can call it. The tick is
  // consumed, never re-derived beside it (ADR-009).
  const relayoutRef = useRef<(() => void) | null>(null);
  // The re-fit, reachable from the RE-LAYOUT effect, which owns boxes this effect's observer
  // cannot see (the overlay's). One home for the account: `sendFit`, below.
  const sendFitRef = useRef<(() => void) | null>(null);

  // WHETHER THERE IS A DOOR AT ALL. Asked once, at first render, and never re-asked — the same
  // rule and the same reason as `SurfaceSlot`'s: whether an app shell exists is a property of the
  // BUNDLE, not of a moment. With no shell there is no fullscreen host, so the affordance is not
  // offered rather than offered and dead. In production every route mounts inside the shell.
  const [shellHosted] = useState(hasShellHost);

  const { collapsed, expanded } = hostState;
  const stance = terminalPaneStanding(host, standing, hostState.subscribed, mount.bound);
  const { subscribed } = stance;
  // WHAT ADDRESSES THIS PANE, which is not whether anything BINDS. A mount may carry its source
  // and declare `bound: false` — a session nothing will ever feed (ADR-003's amendment) — and it
  // must still be NAMED: dropping the source there renders `no session` for a session that
  // demonstrably exists. `bound` is read by the binding below, and by nothing else.
  const source = mount.source;
  // The `local-pty` source declares `provider` as one of its addressing params, and the picker's
  // selection is the only value that can complete it — so the tuple is finished at the ONE seam
  // that owns that rule, never by a ternary here.
  const addressed = useMemo(() => withSelectedProvider(source, mount.params, picker), [source, mount.params, picker]);

  // THE ONE DISPATCH. Every affordance's `onClick` names the AFFORDANCE, and the change it
  // performs comes from the table that also gave it its form and its cost — so a control's
  // appearance and its effect can never be decided in two places.
  const act = useCallback((affordance: string, engaged = false, extra: Record<string, unknown> = {}) => {
    const kind = changeForAffordance(affordance, engaged);
    if (kind == null) return;
    setHostState((current) => applyHostChange(current, { kind, ...extra }));
  }, []);

  // WHAT THIS PANE REPORTS UP, none of it a decision: a byte LANDED, its transport WORD, and that it
  // took FOCUS — the three facts a surface holding N panes cannot observe for itself, each answering
  // one of its rules (do not drop a pane being read, announce the focused one alone, move the roving
  // stop to the tile the mouse focused). In a ref: the session effect may not re-run on a callback.
  const standingRef = useRef(standing);
  standingRef.current = standing;
  const viaRef = useRef<string>(FORM_ICON_CONTROL); // which door opened it: `opener` names its form's element
  const present = useCallback((form: string) => ((viaRef.current = form), act(AFFORDANCE_FULLSCREEN)), [act]);

  const model = useMemo(
    () => mountModelFor({ source, mount: mount.posture as MountPostureName }),
    [source, mount.posture],
  );
  const identity = useMemo(
    () => terminalPaneIdentity({ source, params: addressed, ref: mount.ref, farEnd: mount.farEnd }),
    [source, addressed, mount.ref, mount.farEnd],
  );
  const socket = useMemo(() => terminalSocketUrl(source, addressed, { origins }), [source, addressed, origins]);

  // The accessible name, computed HERE rather than beside the JSX because the fullscreen request
  // carries it too — one name for the inline region and the presented dialog alike (DESIGN
  // §Accessibility 4: it names the SESSION, never the widget class).
  const paneLabel = terminalPaneLabel({ posture: model.posture, identity, ref: mount.ref, detail: mount.detail, siblings: stance.activatesPane });

  // THE SESSION'S IDENTITY, as a string. This is the session effect's ONLY dependency, and no
  // layout fact is an input to it — that is rule 1 at the top of this file, made structural.
  //
  // A STRING, NOT THE STATE OBJECT, AND THAT IS LOAD-BEARING: the fleet card builds a NEW mount
  // object on every render, so an effect keyed on props identity would tear the session down on
  // every poll.
  // `subscribed` is the STANDING's: a pane the arbiter did not subscribe has no session identity,
  const sessionKey = useMemo(
    () => terminalSessionIdentity({ ...hostState, subscribed, source, params: addressed, posture: mount.posture }),
    [hostState, subscribed, source, addressed, mount.posture],
  );

  // An origin we do NOT HAVE is `unavailable`; an origin we have and cannot CONNECT to is
  // `error`. They are different facts and the ramp keeps them apart (DESIGN §The transitions,
  // rule 4: `unavailable` is entered BEFORE any socket exists and never from a live state).
  //
  // THE CAUSE IS NAMED, NEVER DEFAULTED. A missing `fleet` origin is `no fleet origin` / `aof
  // mesh ui` — not `board unreachable` / `aof work ui`, which names the wrong server and gives a
  // command that does not produce a fleet (designer's ruling, 2026-08-08). The fixture path is
  // the mount's own `unavailable`, because DG-46-3 gives the state no production producer in m46.
  const unavailable = useMemo(() => {
    if (mount.unavailable != null) {
      return terminalStateUnavailable({
        cause: mount.unavailable.cause,
        workspacePath: mount.unavailable.workspacePath ?? null,
      });
    }
    if (sessionKey == null || socket.url != null) return null;
    if (socket.reason !== REFUSAL_MISSING_ORIGIN && socket.reason !== REFUSAL_UNRESOLVABLE_ORIGIN) return null;
    return terminalStateUnavailable({
      cause: socket.missing?.includes(ORIGIN_ROLE_FLEET)
        ? UNAVAILABLE_CAUSES.NO_FLEET_ORIGIN
        : UNAVAILABLE_CAUSES.ORIGIN_UNREACHABLE,
    });
  }, [mount.unavailable, sessionKey, socket]);

  // ── THE BINDING ────────────────────────────────────────────────────────────────────────
  // CAN THIS PANE BE BOUND AT ALL — a session to address, a source to dial, a URL the origins
  // composed, no unavailability. ONE value for TWO readers (this effect and the render); the
  // blocker of 2026-08-09 is what happened when only the effect had it, and `terminalEntryState`
  // carries that account. It hands the narrowed `source`/`url` over so neither reader re-decides.
  const binding = useMemo(
    () =>
      mount.bound && sessionKey != null && source != null && unavailable == null && socket.url != null
        ? { source, url: socket.url }
        : null,
    [mount.bound, sessionKey, source, unavailable, socket.url],
  );

  // ── THE SESSION EFFECT ─────────────────────────────────────────────────────────────────
  // Mount ONE xterm, open ONE socket, wire the frozen envelope, and tear both down on cleanup
  // (React 19 StrictMode double-invokes — the dispose/close cleanup is load-bearing).
  //
  // `binding` is READ here but is deliberately NOT a dependency: it is an object and the fleet card
  // rebuilds its mount on every poll, so keying the session on one is the teardown-per-render
  // defect `sessionKey` prevents. Its every INPUT is in the deps below, so it cannot go stale.
  useEffect(() => {
    if (binding == null) return;
    const { source: boundSource, url } = binding;
    // NO HOST, NO SESSION — reachable only where nothing is rendered at all. A bindable pane that
    // IS rendered has this element by the ramp's own rule: its entry state is `connecting`, whose
    // pane treatment is `bytes`.
    const inline = inlineRef.current;
    if (!inline) return;

    // COMMITTED, not merely derived: the entry state makes the host element exist, and this makes
    // the pane HOLD A SOCKET, so the ramp accepts the transport events below (it discards every
    // event on a state that holds none, and `idle` is one of the two that cannot).
    setState(bindSource());

    // The host element the xterm paints into. It is what a `scale` source's CSS transform
    // scales and what the fullscreen transition re-parents; anchored top-left of whichever pane
    // holds it, so the scaled screen always sits inside that pane.
    const pane = document.createElement("div");
    pane.style.position = "absolute";
    pane.style.top = "0";
    pane.style.left = "0";
    pane.style.transformOrigin = "top left";
    paneRef.current = pane;
    inline.appendChild(pane);

    const term = new Terminal({
      convertEol: true,
      // READ-ONLY IN FACT, and every one of these three comes off the policy's model rather than
      // from a literal — which is what makes the fleet card's posture a property of its
      // declaration instead of a property of this file.
      disableStdin: model.disableStdin,
      cursorBlink: model.cursor.blink,
      cursorStyle: model.cursor.style,
      // 13px glyphs on a 17px line — the pair that makes an 80x24 screen exactly the 640x408 box
      // the committed mock scales. xterm takes the line height as a MULTIPLE, so it is derived
      // from the two numbers rather than typed a third time.
      fontSize: TERMINAL_FONT_SIZE,
      lineHeight: TERMINAL_LINE_HEIGHT,
      fontFamily: TERMINAL_FONT_FAMILY,
      theme: TERMINAL_XTERM_THEME,
      allowProposedApi: true,
    });
    termRef.current = term;
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    // Loaded on BOTH sources (PO ruling, knowing change 13): the dock already link-ified a
    // worker's streamed output, so making the peek match REMOVES an arbitrary difference between
    // two views of the same bytes. It is a render affordance and touches no input path.
    term.loadAddon(new WebLinksAddon());
    term.open(pane);
    // xterm's helper textarea is a TAB STOP by construction (`textarea.tabIndex = 0` in its own
    // `open()`, unconditionally). Where the PANE REGION is the roving stop that is a trap: measured
    // on the deployed build, Tab reached it, ten presses never left it and eight `	` were RELAYED
    // TO THE FAR END — the opposite of DG-49-5. It stays PROGRAMMATICALLY focusable, which is what
    // presenting and a click into the byte area use.
    if (stance.activatesPane) term.textarea?.setAttribute?.("tabindex", "-1");

    // GEOMETRY IS DERIVED FROM THE DESCRIPTOR (ADR-003) — never from the host, the origin or an
    // `isRemote` boolean. A `fit` source reflows; a `scale` source is driven to the far end's own
    // fixed geometry and the fixed-size result is scaled by ONE CSS transform.
    const plan = geometryPlanFor(boundSource, {});
    if (plan.mode !== GEOMETRY_FIT && plan.cols != null && plan.rows != null) {
      term.resize(plan.cols, plan.rows);
    }

    const ws = new WebSocket(url);
    ws.binaryType = "arraybuffer";
    let lastFit: ResizeMessage | null = null;

    // The state-aware command, typed ONCE per session as ordinary input on the same raw path a
    // keystroke takes (never a JSON frame — the envelope is unchanged). A mount with no input
    // path cannot type it, which is the honest consequence of the posture rather than a guard.
    let commandSent = false;
    let commandTimer: ReturnType<typeof setTimeout> | null = null;
    const sendCommand = () => {
      if (commandSent || !mount.command || !model.inputEnabled) return;
      commandSent = true;
      if (commandTimer !== null) {
        clearTimeout(commandTimer);
        commandTimer = null;
      }
      if (ws.readyState === WebSocket.OPEN) ws.send(mount.command + "\r");
    };

    // A `scale` source declares NO resize control frame, so the emitter is never wired for one:
    // the guard is STRUCTURAL (there is no path to send down) rather than an early return one
    // refactor away from deletion (ADR-003).
    // WHEN A FIT SOURCE RE-FITS, AND WHY THE FIT IS UNCONDITIONAL WHILE THE FRAME IS NOT:
    // one home, on `geometry.mjs`'s header. Three boxes change; only one of them is this observer.
    const sendFit = plan.emitsResizeFrame
      ? () => {
          try {
            fitAddon.fit();
          } catch {
            return; // the container is not measured yet; the observer will call again
          }
          if (ws.readyState !== WebSocket.OPEN) return;
          const result = emitFit(term.cols, term.rows, (frame: string) => ws.send(frame), lastFit);
          lastFit = result.message;
        }
      : null;

    ws.onopen = () => {
      sendFit?.();
      if (mount.command && model.inputEnabled) commandTimer = setTimeout(sendCommand, 700);
      setState((current) => applyTerminalEvent(current, TERMINAL_EVENTS.SOCKET_OPEN));
    };

    const paint = (data: string | ArrayBuffer) => {
      if (typeof data === "string") term.write(data);
      else term.write(new Uint8Array(data));
      standingRef.current?.onReport?.({ painted: true });
      setState((current) => applyTerminalEvent(current, TERMINAL_EVENTS.BYTES));
      sendCommand();
    };

    ws.onmessage = (event: MessageEvent) => {
      const data = event.data;
      // WHOSE LANE MAY CARRY A CONTROL FRAME IS THE SOURCE'S BUSINESS (source-table.mjs). The
      // mirror lane carries opaque bytes in both directions and ends with a transport close, so
      // reading its output as an envelope would turn a painter into a parser — and would let a
      // worker's own PTY output forge one.
      if (typeof data === "string" && sourceCarriesControlFrames(boundSource)) {
        const frame = parseControlFrame(data);
        if (frame != null) {
          setState((current) => applyControlFrame(current, frame));
          return;
        }
      }
      paint(data as string | ArrayBuffer);
    };

    ws.onerror = () => setState((current) => applyTerminalEvent(current, TERMINAL_EVENTS.TRANSPORT_FAILURE));
    ws.onclose = () => setState((current) => applyTerminalEvent(current, TERMINAL_EVENTS.CLOSE));

    // THE INPUT DIRECTION. Registered only when the policy says so: a read-only mount gets NO
    // handler at all, not one that is registered and ignored (a half-disabled widget that
    // swallows keystrokes silently is a worse lie than no terminal).
    const dataSub = model.inputEnabled
      ? term.onData((input: string) => {
          if (ws.readyState === WebSocket.OPEN) ws.send(input);
        })
      : null;

    const observer = sendFit == null ? null : new ResizeObserver(() => sendFit());
    if (observer != null) observer.observe(inline);
    // The re-layout effect owns the box the pane actually lives in — including the overlay's,
    // which this observer cannot see — so it needs a way to ask for the re-fit. One home for the
    // fit: the observer above and the transition both come through `sendFit`, and `emitFit` still
    // suppresses an unchanged pair, so asking twice costs nothing on the wire.
    sendFitRef.current = sendFit;

    return () => {
      if (commandTimer !== null) clearTimeout(commandTimer);
      if (sendFitRef.current === sendFit) sendFitRef.current = null;
      observer?.disconnect();
      dataSub?.dispose();
      try {
        ws.close();
      } catch {
        /* already closing */
      }
      term.dispose();
      termRef.current = null;
      try {
        pane.remove();
      } catch {
        /* already detached */
      }
      paneRef.current = null;
    };
    // `collapsed` and `expanded` are DELIBERATELY absent: they are host layout, not session
    // identity, and `sessionKey` is the value that says so.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey, unavailable != null, socket.url]);

  // ── THE LAYOUT EFFECT ──────────────────────────────────────────────────────────────────
  // Put the ONE pane into whichever host is active, then fit (a resizable far end) or scale (a
  // fixed one). Runs after the session effect so the refs are populated, and re-runs on the
  // fullscreen transition to RE-PARENT — never to re-subscribe.
  useEffect(() => {
    if (sessionKey == null || source == null) return;
    const pane = paneRef.current;
    const term = termRef.current;
    if (pane == null || term == null) return;
    const active = expanded ? overlayRef.current : inlineRef.current;
    if (active == null) return;
    if (pane.parentElement !== active) active.appendChild(pane);

    const relayout = () => {
      // THE BOX IS RE-MEASURED EVERY TIME, and that is what makes the non-live bar's cost
      // structural rather than a number anyone types. The bar is a `flex-none` sibling of this
      // pane's container inside ONE box, so when it appears the container's `clientHeight` drops
      // by the bar's own height and the plan below recomputes against the smaller box — the
      // mirror's picture shrinks by exactly the bar, and the host's total height never moves.
      // THE MOCK'S SCALE PAIRS ARE OUTPUTS OF THIS CALL, and no number from them appears in this
      // file. Two of the four do not reproduce against the mock's own boxes either — the
      // overlay's 1264×739 derives 1.811, not the drawn 1.83 — and the designer's own note says
      // so: on S3 the ABSOLUTES are illustrative and only the DIFFERENCE binds. What is asserted
      // in `terminal-control-both-sources.test.mjs` is that difference: the same source in the
      // same panel returns a smaller scale when the bar is present, by exactly the bar's height
      // over the intrinsic height.
      const screen = pane.querySelector<HTMLElement>(".xterm-screen");
      const plan = geometryPlanFor(source, {
        // The intrinsic size is the terminal's OWN pixel screen — a transform-independent layout
        // metric, so it stays the true fixed-geometry size however the pane is scaled.
        intrinsicWidth: screen?.offsetWidth ?? pane.offsetWidth,
        intrinsicHeight: screen?.offsetHeight ?? pane.offsetHeight,
        boxWidth: active.clientWidth,
        boxHeight: active.clientHeight,
      });
      if (plan.mode === GEOMETRY_FIT) {
        // A FIT source has no transform at all: it reflows to the box, and xterm's own scrollback
        // keeps the newest line at the bottom, exactly as a shell does.
        pane.style.transform = "";
        pane.style.width = "100%";
        pane.style.height = "100%";
        // …AND REFLOWING IS THE TERMINAL'S JOB, NOT THE DIV'S. Stretching the element without
        // re-fitting leaves the same rows and columns in a bigger box, which is the band a fit
        // source is defined by NOT having. The far end is told too — `sendFit` re-measures and
        // emits the resize frame — so the agent repaints INTO the new rows rather than the
        // operator getting a bigger window onto the same 15 lines.
        sendFitRef.current?.();
        return;
      }
      pane.style.transform = `scale(${plan.scale})`;
    };

    // THE SHELL'S POST-TRANSITION TICK IS CONSUMED HERE (ADR-009). `onLayout` fires after
    // present AND after dismiss — the box changed either way, and the second is not a special
    // case — and it calls this same function, so the control adds no timer of its own beside the
    // shell's. What the tick ASKS FOR is a property of the SOURCE: a `fit` source re-fits (more
    // rows and columns, glyphs unchanged) and a `scale` source re-scales the fixed 80×24 into
    // the new box; a re-measure that changes nothing emits nothing, because `emitFit` suppresses
    // an unchanged pair.
    relayoutRef.current = relayout;
    relayout();
    // FOCUS PRESENTS INSIDE THE TERMINAL (S3 delta 2): the request NAMES it, this ACTS on it — only
    // the control holds the xterm. Measured before: the pane host div held focus and typing sent
    // NOTHING, while the input path was wired all along.
    if (expanded && model.inputEnabled) term.textarea?.focus?.();
    // One deferred re-layout for the MOUNT: the pane may not be laid out on the tick it first
    // lands in its host. (The fullscreen frame's defer is the shell's, above — this is not a
    // second copy of it.) The zero-box guard degrades to scale 1 and is not sticky, so the next
    // measured tick returns the real ratio.
    const raf = requestAnimationFrame(relayout);
    const observer = new ResizeObserver(() => relayout());
    observer.observe(active);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      if (relayoutRef.current === relayout) relayoutRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey, expanded, collapsed, height, source]);

  // The content box the dock's height clamps against — re-read whenever the number can change,
  // never held. It is read off THIS component's own element, because that is where the shell's
  // published property is legible (see `readContentBoxHeight`).
  //
  // A RESIZE LISTENER ALONE IS NOT ENOUGH, and the gap was measured rather than imagined: the
  // published chrome height grows 48 → 81 the moment the board's `serverGone` notice rail
  // appears, and NO resize event fires — the viewport did not change, the CHROME did. A
  // resize-only re-read therefore left the ceiling 16px too tall and let the dock take 52% of the
  // content region instead of the half the rule promises. (Nothing was covered — the published
  // inset still tracked the dock's real height — but the half-share rule is the clamp's whole
  // job.) It is the same defect class as reading the property off the wrong element: a published
  // number that is not re-read at the moment it changes.
  //
  // NO GEOMETRIC OBSERVER CAN SEE IT. The dock is fixed to the viewport's bottom edge, so neither
  // its own box nor the document's moves when the rail appears. What changes is the shell's
  // PUBLICATION, so that is what is watched: the shell stamps `data-shell-chrome-height` on its
  // root beside the custom property, and this observer is filtered to exactly that attribute —
  // it fires when the number changes and at no other time. Watching `style` instead would fire on
  // every pane transform the layout effect writes.
  useEffect(() => {
    if (!isDock || typeof window === "undefined") return undefined;
    const update = () => setContentBox(readContentBoxHeight(sectionRef.current));
    update();
    window.addEventListener("resize", update);
    const document_ = sectionRef.current?.ownerDocument ?? null;
    const observer =
      typeof MutationObserver === "function" && document_ !== null ? new MutationObserver(update) : null;
    if (observer !== null && document_ !== null) {
      observer.observe(document_, { attributes: true, subtree: true, attributeFilter: [CHROME_HEIGHT_ATTRIBUTE] });
    }
    return () => {
      window.removeEventListener("resize", update);
      observer?.disconnect();
    };
  }, [isDock]);

  // ── THE ROVING STOP MOVES DOM FOCUS, NOT ONLY `tabindex` ───────────────────────────────
  // A roving tabstop that only re-labels the stop leaves the caret on the tile the operator left,
  // so the next arrow — worse, the next `Enter` — reaches the wrong session. On the false→true
  // TRANSITION only, seeded at first render, so a tile mounting AS the stop takes nothing.
  const wasStopRef = useRef(stance.tabIndex === 0);
  useEffect(() => {
    const isStop = stance.tabIndex === 0;
    if (isStop && !wasStopRef.current) sectionRef.current?.focus?.();
    wasStopRef.current = isStop;
  }, [stance.tabIndex]);

  // …and the transport word on every change: the FOCUSED pane's is announced, and `ended`/`error`
  // tells a surface a retained pane's courtesy is spent.
  useEffect(() => {
    standingRef.current?.onReport?.({ state: state.state });
  }, [state.state]);

  const bounds = dockHeightBounds(contentBox);
  // THE DEFAULT IS CLAMPED BY THE SAME RULE AS THE DRAG. At the desktop app's 760×520 window the
  // content box is 432px, so the maximum is 216 — and an unclamped 280 would open the dock at a
  // height the operator is not allowed to drag it to.
  const dockHeight = clampDockHeight(height ?? bounds.defaultHeight, contentBox);

  // ONE CLAMP, TWO INPUT METHODS — and it is the SHAPE that makes it one, not a promise. The
  // handle reports a DELTA; this is the only place a new height is computed, from the height on
  // screen, through the one clamp. The pointer and the keyboard cannot diverge because there is
  // no second path for them to diverge along.
  //
  // The defect that taught it (measured, 2026-08-08): the pointer drag started from the RENDERED
  // `dockHeight` and the keyboard from the raw `height` state, which differ the moment the box
  // changes. With 300 stored in a 432px box the dock renders at 216 and ArrowDown answered
  // 300 − 16 → re-clamped to 216 — a dead keypress, and the `aria-valuenow` a screen reader was
  // told was not the number the next key operated on.
  const resizeBy = useCallback(
    (delta: number) => setHeight(clampDockHeight(dockHeight + delta, contentBox)),
    [dockHeight, contentBox],
  );

  // V1 — a terminal with no visible owner is never rendered, and the fleet's "no resolvable
  // tuple" case renders NO PANEL AT ALL: not an empty frame, not a disabled toggle, and not an
  // `unavailable` pane.
  if (!mount.rendersPanel) return null;
  if (mount.bound && !identity.rendered) return null;

  // EVERY PANE DECISION IS A DESCRIPTOR FIELD, not a boolean re-derived from a state word here.
  // `pane`, `showsBar`, `showsTopLeftLine`, `dims`, `restartable` and `locksProviderPicker` are
  // all computed in `state-ramp.mjs` — because DESIGN V11 (the bar never overprints; the top-left
  // line is only for a pane that is empty BY DEFINITION) is the hardest-won rule in this
  // milestone, and at first review it lived in JSX that no test in this repo can reach. That is
  // how the fullscreen overlay came to render one of the four treatments instead of all four.
  //
  // …AND SO IS THE ENTRY STATE (BLOCKER, 2026-08-09; the account is on `terminalEntryState`). This
  // read `state` directly — `idle` until the effect said otherwise — and `idle` renders the
  // empty-host line INSTEAD of the pane host carrying `inlineRef`, so the effect early-returned,
  // no socket was created, and the line that leaves `idle` sat after that guard. Deriving the
  // entry state from the SAME `binding` the effect is guarded by is what breaks that loop.
  const descriptor = describeTerminalState(unavailable ?? terminalEntryState(state, { bindable: binding != null }), {
    owner: identity.rendered ? identity.ref : mount.ref,
    reason: mount.reason,
    // A SESSION NOTHING WILL RELAY IS A TERMINAL THAT IS EMPTY rather than a host with nothing in
    // it, so its line sits where the first byte would have been (DG-49-2) — STATED, never guessed.
    emptyTerminal: mount.source != null && !mount.bound,
  });

  const offersRestart = declaresAffordance(host, AFFORDANCE_RESTART) && mount.spawnedHere && descriptor.restartable;
  const toggle = affordances[AFFORDANCE_WATCH_HIDE];
  const offersFullscreen = declaresAffordance(host, AFFORDANCE_FULLSCREEN) && shellHosted && subscribed && mount.bound && stance.presents;
  const activatesPane = stance.activatesPane && offersFullscreen; // the second door, where there is a pane to present
  const paneBoxClass = terminalPaneBoxClass(stance.paneBox); // the host's declared box, as a class

  // C1 — the header's identity fragment, rendered VERBATIM by the inline header and the
  // fullscreen one, so the two surfaces speak ONE identity and the posture rides both. It is a
  // child component (`TerminalIdentity.tsx`) rather than a block here — `acd-ui-surface-file-budget`'s
  // own remedy, applied when the ratchet fired on this file at 863 against its 840 ceiling.
  //
  // IT IS RENDERED AGAINST THE HOST THAT IS SHOWING IT, and that is a fix rather than a
  // parameterisation (design-conformance GAP G1, 2026-08-09). The fragment was built once against
  // the OPENER's host and handed to the fullscreen occupant verbatim, so the overlay carried the
  // board dock's provider picker — while `host-model.mjs` had said all along that it must not:
  //
  //   [HOST_FULLSCREEN][AFFORDANCE_PROVIDER_PICKER] =
  //     notDeclared("the overlay renders the SAME descriptor as its opener and adds no control of its own")
  //
  // The declaration was correct and the JSX simply never asked it — the same shape as this
  // milestone's blocker, one seam over. Asking makes an existing rule load-bearing instead of
  // inventing a new one. (And it matters beyond tidiness: a `role="radiogroup"` inside the
  // overlay puts a focusable widget ahead of the ONLY exit from a surface that claims `Escape`.)
  const identityProps = {
    identity,
    detail: mount.detail,
    model,
    descriptor,
    picker,
    subscribed,
    standing: stance,
    onSelectProvider: (id: string) => {
      setPicker((current) => selectProvider(current, id));
      act(AFFORDANCE_PROVIDER_PICKER, false, { provider: id });
    },
  };

  // The control cluster is its own component (`TerminalControls.tsx`) — the same remedy, applied
  // the second time `acd-ui-surface-file-budget` fired on this file in one evening. Which controls
  // exist is still the HOST TABLE's answer, asked there; what is decided here is only what this
  // control alone knows: whether a restart is re-spawnable, whether a shell door exists, and that
  // Watch/Hide also resets the ramp.
  const controls = (
    <TerminalControls
      host={host}
      controlClassName={CONTROL_CLASS}
      offersRestart={offersRestart}
      offersFullscreen={offersFullscreen}
      offersToggle={stance.offersToggle}
      onExpand={() => present(FORM_ICON_CONTROL)}
      openerRef={openerRef}
      collapsed={collapsed}
      subscribed={subscribed}
      toggle={toggle}
      act={act}
      onWatchHide={() => {
        act(AFFORDANCE_WATCH_HIDE, subscribed);
        setState(initialTerminalState());
        standing?.onWatch?.(!subscribed); // the arbitrating surface is told: the spend is its next input
      }}
      onClose={onClose}
    />
  );

  return (
    <>
      <section
        ref={sectionRef}
        className={cn(
          "flex flex-col text-zinc-200",
          TERMINAL_CHROME_BG_CLASS,
          isDock ? cn("border-t", TERMINAL_BORDER_CLASS) : cn("mt-3 rounded-md border", TERMINAL_BORDER_CLASS),
          stance.activatesPane && TERMINAL_FOCUS_RING_CLASS, // the house ring, on the STOP's own frame
        )}
        aria-label={paneLabel}
        style={isDock && !collapsed ? { height: dockHeight } : undefined}
        // THE SURFACE'S SINGLE ROVING STOP where a host declares the pane-activation form: one tile
        // in the page tab order and every other at `-1` (§focus model rule 1); `undefined` else.
        tabIndex={stance.tabIndex}
        onFocus={(event) => (event.target === event.currentTarget ? standingRef.current?.onReport?.({ focused: true }) : undefined)}
        onKeyDown={
          activatesPane
            ? (event) => {
                // ONLY the tile's own key: a key pressed on a control INSIDE it bubbles through
                // here, and presenting on that would fire twice for one gesture.
                if (event.target !== event.currentTarget || !activatesPaneOnKey(event.key)) return;
                event.preventDefault();
                present(FORM_PANE_ACTIVATION);
              }
            : undefined
        }
      >
        {declaresAffordance(host, AFFORDANCE_DRAG_RESIZE) && !collapsed ? (
          <TerminalDragHandle value={dockHeight} min={bounds.min} max={bounds.max} onResizeBy={resizeBy} />
        ) : null}
        {/* C1 — the header, and how many ROWS it has is the host's declaration (DESIGN §S2's
            C1a/C1b). The region is its own component beside the identity fragment it composes:
            `acd-ui-surface-file-budget`'s own remedy — a surface gains CHILD COMPONENTS, not
            blocks — applied the third time the ratchet fired on this file. */}
        <TerminalHeader {...identityProps} host={host} isDock={isDock} controls={controls} />
        {/* WHETHER THERE IS A BOX AT ALL IS THE HOST'S DECLARATION, not a subscription test
            (ADR-007 (A)): the guard that conflated them left the held tile and the never-fed pane
            nowhere to render their one line. The card's header-only rest state is its own
            `no-pane` declaration, preserved. */}
        {subscribed || stance.restPane !== REST_PANE_NONE ? (
          // HIDDEN, NOT UNMOUNTED. The xterm pane and its socket survive a collapse, so the agent
          // keeps working in the background and the scrollback is intact on expand.
          <div className={cn("flex min-h-0 flex-col", paneBoxClass, collapsed && "hidden")}>
            <TerminalByteArea
              descriptor={descriptor}
              paneRef={inlineRef}
              framed
              host={host}
              onActivate={stance.activatesPane ? () => (activatesPane ? present(FORM_PANE_ACTIVATION) : undefined) : null}
            />
          </div>
        ) : null}
      </section>

      {/* S3 — the door and the occupant, in the region's own component: it creates the live node
          the SHELL adopts, asks through `requestFullscreen`, holds the hidden `home` that node
          returns to, and portals the overlay's tree into it. Presenting moves DOM and touches no
          session — which is why none of it is in the session effect's dependencies. */}
      <TerminalFullscreenDoor
        expanded={expanded}
        subscribed={subscribed}
        source={source}
        posture={mount.posture}
        sessionKey={sessionKey}
        label={paneLabel}
        identity={<TerminalIdentity {...identityProps} host={HOST_FULLSCREEN} />}
        descriptor={descriptor}
        paneRef={overlayRef}
        exitClassName={CONTROL_CLASS}
        openerFor={() => fullscreenOpenerFor(viaRef.current, { control: openerRef.current, pane: stance.activatesPane ? sectionRef.current : null })}
        onLayout={() => relayoutRef.current?.()}
        onExit={() => act(AFFORDANCE_EXIT_FULLSCREEN)}
      />
    </>
  );
}
