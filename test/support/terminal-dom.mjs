// THE BROWSER ENVIRONMENT THE ONE TERMINAL CONTROL NEEDS, as one home (milestone 49 / story 08).
//
// ═══ WHY IT WAS EXTRACTED ═══════════════════════════════════════════════════════════════════
// It lived inside `terminal-control-harness.mjs`, which was the only place that could mount the
// real control. Milestone 49 needs the SAME environment in a second place — a surface mounted
// through `withMountedApp` that has asked for the REAL control instead of the module-path stub —
// and two copies of a DOM stand-in is two answers to "what does `document.createElement` do",
// which is precisely the class of divergence a stand-in must not have. So the environment, the
// recording `WebSocket`, the stub SOURCES and the list of globals-installed-by-name are one
// module, and both harnesses compose it.
//
// ═══ WHAT IS SUBSTITUTED, AND IT IS ONLY WHAT A BROWSER WOULD PROVIDE ════════════════════════
//   · `@xterm/*` ×3 — a terminal emulator that measures glyphs in a canvas. The stand-in RECORDS
//     the calls the control makes (construct, open, resize, write, onData) so a lane can read
//     them.
//   · `react-dom`'s `createPortal` — the fullscreen occupant imports it at module scope.
//   · `lucide-react` — an icon pack of ~1,500 SVG modules. Named exports only, so an icon added
//     to the control without being added here fails the bundle LOUDLY.
//   · the DOM: a `document` that makes elements, `getComputedStyle`, `ResizeObserver`,
//     `requestAnimationFrame`, and a `WebSocket` the lane drives.
// `TerminalControl` IS NOT IN THIS SET AND MAY NEVER BE. It is the thing under test — milestone
// 46 shipped a control that opened no socket past 537 green tests because every harness stubbed
// it (TECH_DEBT 29), and this module is part of that item's remedy. The module-path filter below
// exists so the SURFACE harnesses can name the same one thing they stub and the same one flag
// that un-stubs it; it is exported for them, and this file's own set never uses it.
//
// ═══ THE FOCUS MODEL IS REAL, AND BOTH HALVES ARE ONE FACT ═══════════════════════════════════
// `focus()` used to be a literal no-op with no `activeElement` anywhere, so "focus MOVED from a
// to b" — the only assertion a roving tabstop actually needs — was inexpressible. A `focus()`
// that merely RECORDED being called would satisfy "focus landed" and still not express it. So
// there is one `activeElement`, `focus()` moves it, the previous holder loses it, and an element
// the renderer stops rendering does not keep it (`releaseDetached`).
import { walk } from "./mini-react.mjs";
import { CHROME_HEIGHT_PROPERTY } from "../../ui/src/app/shell-layout.mjs";

// ── the module-path stub the three SURFACE harnesses share, and its opt-out ─────────────────
// One spelling of the filter and one spelling of the stub, because three copies of a regex is
// three places for the one component this repo may not silently substitute to be named
// differently.
export const TERMINAL_CONTROL_FILTER = /(^|\/)TerminalControl$/;
export const TERMINAL_CONTROL_STUB = "export const TerminalControl = () => null;\n";

// ── the xterm stand-in ──────────────────────────────────────────────────────────────────────
// It records rather than renders, because what a lane can honestly assert about xterm is WHICH
// CALLS THE CONTROL MADE — the geometry it drove the terminal to, the bytes it wrote, whether it
// registered an input sink at all.
const VIRTUAL_XTERM = `
export class Terminal {
  constructor(options) {
    this.options = options ?? {};
    this.cols = 80;
    this.rows = 24;
    this.written = [];
    this.addons = [];
    this.host = null;
    // WHICH PANE THIS TERMINAL BELONGS TO, frozen at \`open()\`. The control MOVES the xterm's
    // host element between the inline pane and the fullscreen overlay, so \`host.parentElement\`
    // read later answers about wherever it is NOW — which is the right answer to a different
    // question and the wrong one to "whose terminal is this".
    this.hostNode = null;
    // Whether a socket has already been paired with this terminal — see the socket class below.
    // A terminal is opened ONCE per session and dials ONCE, so a SECOND socket claiming the same
    // terminal is a socket that was not built in that terminal's effect body.
    this.socketClaimed = false;
    this.disposed = false;
    this.dataHandler = null;
    globalThis.__AOF_TERMINALS__.push(this);
  }
  loadAddon(addon) { this.addons.push(addon); }
  // xterm creates its HELPER TEXTAREA in \`open()\` and sets \`tabIndex = 0\` on it unconditionally
  // (verified in the shipped @xterm/xterm bundle; \`disableStdin\` toggles readOnly, not this). It
  // is the element a browser's sequential-focus algorithm actually lands on, so the stand-in
  // carries it: a lane that counted \`tabindex="0"\` on the rendered tree could not see it, which
  // is exactly how a Tab trap shipped past a green suite (m49/05, measured on the deployed build).
  open(host) {
    this.host = host;
    this.hostNode = host?.parentElement ?? null;
    this.socketClaimed = false;
    this.textarea = { tabIndex: 0, focused: false, setAttribute(name, value) { if (name === "tabindex") this.tabIndex = Number(value); }, focus() { this.focused = true; } };
  }
  resize(cols, rows) { this.cols = cols; this.rows = rows; }
  write(data) { this.written.push(data); }
  onData(handler) {
    this.dataHandler = handler;
    const self = this;
    return { dispose() { self.dataHandler = null; } };
  }
  dispose() { this.disposed = true; }
}
`;
const VIRTUAL_FIT_ADDON = `
export class FitAddon {
  // A fit against an UNMEASURED container throws in the real addon, which is why the control
  // wraps the call — here it simply does nothing, and the cols/rows the emitter reads are the
  // terminal's own.
  fit() { this.fitted = (this.fitted ?? 0) + 1; }
}
`;
const VIRTUAL_WEB_LINKS_ADDON = "export class WebLinksAddon {}\n";
const VIRTUAL_REACT_DOM = "export const createPortal = (children) => children;\nexport default { createPortal };\n";
const VIRTUAL_ICONS = ["X", "ChevronDown", "ChevronUp", "RotateCw", "Maximize2", "Minimize2"]
  .map((name) => `export const ${name} = () => null;`)
  .join("\n") + "\n";

// THE MINIMUM A SURFACE NEEDS TO BUNDLE THE REAL CONTROL — the three `@xterm/*` modules and
// `react-dom`'s `createPortal`. Split out from the icon pack on purpose: a surface that un-stubs
// the control (`realTerminalControl`) keeps its OWN icon arrangement, and the fleet's is the real
// `lucide-react` because its subtree imports icons this six-name stub does not carry. A stub set
// that "helpfully" added the icons there would fail the bundle for a reason nothing to do with
// the terminal.
export const XTERM_STUBS = Object.freeze({
  __xterm__: VIRTUAL_XTERM,
  __xterm_fit__: VIRTUAL_FIT_ADDON,
  __xterm_web_links__: VIRTUAL_WEB_LINKS_ADDON,
  __react_dom__: VIRTUAL_REACT_DOM,
});
export const XTERM_RESOLVE = Object.freeze([
  Object.freeze({ filter: /^@xterm\/xterm$/, to: "__xterm__" }),
  Object.freeze({ filter: /^@xterm\/addon-fit$/, to: "__xterm_fit__" }),
  Object.freeze({ filter: /^@xterm\/addon-web-links$/, to: "__xterm_web_links__" }),
  Object.freeze({ filter: /^react-dom$/, to: "__react_dom__" }),
]);
// The icon pack, named exports only — an icon added to the control without being added here
// fails the bundle LOUDLY rather than silently rendering nothing.
export const ICON_STUBS = Object.freeze({ __icons__: VIRTUAL_ICONS });
export const ICON_RESOLVE = Object.freeze([Object.freeze({ filter: /^lucide-react$/, to: "__icons__" })]);

// The environment a browser would provide, as ONE stub set and its resolver list. FROZEN and
// exported as one pair so a caller cannot pass a set of its own that adds a member: a
// caller-supplied stub set is a second door into the room TECH_DEBT 29 is about.
export const TERMINAL_ENV_STUBS = Object.freeze({ ...XTERM_STUBS, ...ICON_STUBS });
export const TERMINAL_ENV_RESOLVE = Object.freeze([...XTERM_RESOLVE, ...ICON_RESOLVE]);

// The shell's published chrome height, as the shell publishes it. The control reads this off its
// OWN element (a measured defect it already carries a fitness function for), so the stand-in
// answers it for every element rather than pretending to model inheritance.
export const CHROME_HEIGHT = "48px";
// A viewport big enough that the dock's clamp is not the subject: 800 − 48 = a 752px content box,
// so the dock's default 280 sits a whole keyboard step clear of both the floor (48) and the
// ceiling (376). That headroom is what makes the ArrowUp/ArrowDown rows measure the handler
// rather than the clamp.
export const VIEWPORT_HEIGHT = 800;

// EVERY GLOBAL THIS ENVIRONMENT INSTALLS, BY ITS OWN NAME, so a restore is a straight walk and
// cannot forget one. The real runner is a single sequential process (`scripts/test.mjs`), so a
// `document` left standing would change what `typeof document === "undefined"` answers for every
// module in every suite that runs after this one.
export const TERMINAL_DOM_GLOBALS = Object.freeze([
  "__AOF_TERMINALS__",
  "document",
  "WebSocket",
  "ResizeObserver",
  "getComputedStyle",
  "requestAnimationFrame",
  "cancelAnimationFrame",
]);

// installGlobals(values) — set each name, remembering what it held, and hand back the walk that
// puts every one of them back (deleting the ones that did not exist).
export function installGlobals(values) {
  const previous = new Map(Object.keys(values).map((name) => [name, globalThis[name]]));
  const had = new Map(Object.keys(values).map((name) => [name, Object.hasOwn(globalThis, name)]));
  for (const [name, value] of Object.entries(values)) globalThis[name] = value;
  return () => {
    for (const [name, saved] of previous) {
      if (!had.get(name)) delete globalThis[name];
      else globalThis[name] = saved;
    }
  };
}

// ── the WebSocket the lane drives ───────────────────────────────────────────────────────────
// EVERY construction is recorded, which is the whole point: the assertion this environment
// exists for is "the component constructed one".
//
// EACH SOCKET ALSO REMEMBERS WHICH TERMINAL WAS OPEN WHEN IT WAS BUILT, and that is what makes a
// GRID's sockets attributable to panes. The control's session effect is one synchronous body:
// it appends the xterm's host into the pane it holds a ref to, constructs the `Terminal`, calls
// `term.open(pane)`, and only then reaches `new WebSocket(url)`. So the terminal most recently
// OPENED at construction time is this socket's, and that terminal's host has a parent element —
// which is the pane's own host node. At N=1 nobody needed the link; at N=12 "the last socket
// constructed" answers about whichever pane rendered last, silently.
//
// AN UNATTRIBUTABLE SOCKET IS LOUD, NEVER ADOPTED BY A NEIGHBOUR. The pairing above is only sound
// inside that one synchronous body, and the day a socket is built outside it — an async effect, a
// reconnect/backoff timer, a pooled subscription — "the most recently opened terminal" is some
// OTHER pane's, so the socket would land on a neighbour and every per-pane count would still look
// plausible. A neighbour's wrong answer is worse than no answer, so a terminal may be claimed by
// at most ONE socket: a second one finds it already claimed, gets `hostNode = null`, and shows up
// in `unattributedSockets()`, which the grid lanes assert is empty.
function createSocketClass(sockets, terminals) {
  return class HarnessWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    constructor(url, protocols) {
      this.url = url;
      this.protocols = protocols ?? null;
      this.readyState = HarnessWebSocket.CONNECTING;
      this.binaryType = "blob";
      this.sent = [];
      this.closed = false;
      this.onopen = null;
      this.onmessage = null;
      this.onerror = null;
      this.onclose = null;
      // The pane this socket belongs to, as a DOM fact rather than as an index into a list: the
      // element the xterm was opened into, and its parent — the host node the pane's own `ref`
      // points at. `null` when no terminal has been opened OR when the last one opened has
      // already been paired — a socket this environment cannot attribute and must not guess about.
      const opened = terminals.filter((terminal) => terminal.hostNode != null);
      const candidate = opened.length > 0 ? opened[opened.length - 1] : null;
      if (candidate != null && !candidate.socketClaimed) {
        candidate.socketClaimed = true;
        this.hostNode = candidate.hostNode;
      } else {
        this.hostNode = null;
      }
      sockets.push(this);
    }

    send(data) {
      this.sent.push(data);
    }

    close() {
      this.closed = true;
      this.readyState = HarnessWebSocket.CLOSED;
    }

    // ── what a lane does TO a socket, spelled as the far end's own events ──
    accept() {
      this.readyState = HarnessWebSocket.OPEN;
      this.onopen?.({ type: "open" });
    }

    deliver(data) {
      this.onmessage?.({ type: "message", data });
    }

    fail() {
      this.onerror?.({ type: "error" });
    }

    hangUp() {
      this.readyState = HarnessWebSocket.CLOSED;
      this.onclose?.({ type: "close" });
    }
  };
}

// createTerminalEnvironment() — the whole stand-in, as VALUES. Nothing is installed here: the
// caller composes the globals it wants (the terminal-control harness owns a `window` of its own;
// `withMountedApp` already has one carrying `location`/`history` and only needs it augmented).
export function createTerminalEnvironment() {
  const nodes = [];
  const sockets = [];
  const terminals = [];
  const frames = new Map();
  const observers = [];
  let frameId = 0;

  const documentStub = {
    createElement: (tag) => createNode(tag),
    // ── the focus model ──
    // A real `activeElement`, seeded at the body exactly as a browser seeds it: BEFORE anything
    // is focused, nothing in the mounted tree holds focus, and that must be an observable rather
    // than a `null` a lane cannot tell from "the harness does not model this".
    activeElement: null,
    addEventListener(type, handler) {
      if (typeof handler !== "function") return;
      if (!documentListeners.has(type)) documentListeners.set(type, new Set());
      documentListeners.get(type).add(handler);
    },
    removeEventListener(type, handler) {
      documentListeners.get(type)?.delete(handler);
    },
    // Deliver to the listeners attached RIGHT NOW (a copy, so a handler that detaches during
    // delivery does not mutate the set being iterated).
    dispatchEvent(event) {
      for (const handler of [...(documentListeners.get(event?.type) ?? [])]) handler(event);
      return true;
    },
    listenerCount: (type) => documentListeners.get(type)?.size ?? 0,
    // There is no layout and no selector engine here, so a query answers EMPTY rather than
    // pretending — a stand-in that pretended to more would let a lane assert against a
    // measurement nobody made.
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  const documentListeners = new Map();

  function createNode(tag) {
    const listeners = new Map();
    const node = {
      tagName: String(tag).toUpperCase(),
      className: "",
      style: {},
      childNodes: [],
      parentElement: null,
      ownerDocument: documentStub,
      // A measured box. `clientWidth/Height` is what the geometry plan scales INTO;
      // `offsetWidth/Height` is the terminal's own intrinsic pixel screen.
      clientWidth: 640,
      clientHeight: 408,
      offsetWidth: 640,
      offsetHeight: 408,
      appendChild(child) {
        child.parentElement?.removeChild?.(child);
        child.parentElement = node;
        node.childNodes.push(child);
        return child;
      },
      removeChild(child) {
        const at = node.childNodes.indexOf(child);
        if (at >= 0) node.childNodes.splice(at, 1);
        if (child.parentElement === node) child.parentElement = null;
        return child;
      },
      remove() {
        node.parentElement?.removeChild(node);
      },
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener(type, handler) {
        if (typeof handler !== "function") return;
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type).add(handler);
      },
      removeEventListener(type, handler) {
        listeners.get(type)?.delete(handler);
      },
      dispatchEvent(event) {
        for (const handler of [...(listeners.get(event?.type) ?? [])]) handler(event);
        return true;
      },
      setAttribute() {},
      contains(other) {
        for (let cursor = other; cursor != null; cursor = cursor.parentElement) {
          if (cursor === node) return true;
        }
        return false;
      },
      // THE MOVE, not a recording of one. The previous holder loses focus in the same call that
      // gives it to this node, because "A no longer holds focus" is the half a recorder cannot
      // express and the half a roving tabstop is made of.
      focus() {
        documentStub.activeElement = node;
      },
      blur() {
        if (documentStub.activeElement === node) documentStub.activeElement = documentStub.body;
      },
    };
    nodes.push(node);
    return node;
  }

  documentStub.documentElement = createNode("html");
  documentStub.body = createNode("body");
  documentStub.activeElement = documentStub.body;

  const environment = {
    documentStub,
    createNode,
    nodes,
    sockets,
    terminals,
    frames,
    observers,
    activeElement: () => documentStub.activeElement,
    // releaseDetached(attached) — `activeElement` may not point at an element the renderer no
    // longer renders. The renderer already detaches a departed host element's REF for the same
    // reason; focus follows the same rule, and focus goes back to the body rather than nowhere.
    releaseDetached(attached) {
      const active = documentStub.activeElement;
      if (active == null || active === documentStub.body || active === documentStub.documentElement) return;
      if (!attached.has(active)) documentStub.activeElement = documentStub.body;
    },
    // The globals this environment owns, by name, ready for `installGlobals`. `window` is
    // deliberately absent: one harness owns a window of its own and the other already has one
    // carrying `location`/`history`, so the composition is the caller's.
    globals: {
      __AOF_TERMINALS__: terminals,
      document: documentStub,
      WebSocket: createSocketClass(sockets, terminals),
      ResizeObserver: class {
        constructor(callback) {
          this.callback = callback;
          observers.push(this);
        }
        observe(target) { this.target = target; }
        unobserve() {}
        disconnect() { this.disconnected = true; }
      },
      getComputedStyle: () => ({
        getPropertyValue: (name) => (name === CHROME_HEIGHT_PROPERTY ? CHROME_HEIGHT : ""),
      }),
      // The deferred re-layout the control arms for its own mount. Queued by ID rather than
      // fired, so a lane decides whether a second layout pass has happened — and so a cancel
      // forgets the frame it names rather than whichever one is now at that position.
      requestAnimationFrame: (fn) => {
        frameId += 1;
        frames.set(frameId, fn);
        return frameId;
      },
      cancelAnimationFrame: (id) => frames.delete(id),
    },
    // runFrames() — the deferred layout callbacks the control armed, run in order.
    runFrames() {
      const pending = [...frames.values()];
      frames.clear();
      for (const frame of pending) frame();
      return pending.length;
    },
  };
  return environment;
}

// ── delivering an event to the handlers a component ACTUALLY attached ────────────────────────
//
// The mounted components attach their handlers as React PROPS on the rendered tree, so delivery
// walks the RENDERED tree's ancestry rather than the DOM stand-in's: `onClick` on a `<button>`,
// then its ancestors', until a handler calls `stopPropagation()`. That is the difference between
// a driver that can express "clicking the header's own controls does NOT present the pane" and
// one that can only invoke a prop and agree with whatever the code does.
export const EVENT_PROP = Object.freeze({
  click: "onClick",
  // FOCUS AND BLUR, added m49/05: a surface that moves a roving stop when a MOUSE focuses a tile
  // is behaviour no lane could drive while `focus()` only moved `activeElement` — and the defect
  // it hides is measurable (a clicked tile held focus while carrying `tabindex="-1"`, so the next
  // arrow key moved from a tile nobody was looking at). Delivery walks the rendered ancestry as
  // every other gesture does; a lane that needs the DOM's non-bubbling rule asserts the target.
  focus: "onFocus",
  blur: "onBlur",
  keydown: "onKeyDown",
  keyup: "onKeyUp",
  pointerdown: "onPointerDown",
  pointermove: "onPointerMove",
  pointerup: "onPointerUp",
  change: "onChange",
});

// deliverEvent(chain, type, init, { document }) — run one gesture up one propagation path.
// `chain` is the target FIRST, then its ancestors (`ancestryOf`). Returns what the gesture DID,
// so a lane can assert `preventDefault()` was called — the shipped drag separator calls it for
// exactly two keys and returns for every other, and a harness that reported "handled" for
// everything would pass the two rows that matter and fail nothing.
//
// THE DOCUMENT IS THE LAST STOP, and it is not an extra: a whole class of shipped behaviour is
// DOCUMENT-SCOPED because the point is that it works wherever focus happens to be. The app
// shell's fullscreen `Escape` is exactly that — `Shell.tsx` adds its `keydown` to
// `window.document` and the reducer decides whether the occupant claimed the key — so a `press`
// that walked only the rendered ancestry could never reach it, and `05/04`'s `Escape`-claiming
// clause would be undrivable. Delivery follows the DOM's own order (target, ancestors, then the
// document) and a handler that called `stopPropagation()` stops it there too.
export function deliverEvent(chain, type, init = {}, { document: documentTarget = null } = {}) {
  const prop = EVENT_PROP[type];
  if (prop == null) throw new Error(`terminal-dom: no React prop is known for a \`${type}\` event`);
  let stopped = false;
  let defaultPrevented = false;
  const reached = [];
  const event = {
    type,
    target: chain[0] ?? null,
    currentTarget: null,
    bubbles: true,
    ...init,
    stopPropagation() { stopped = true; },
    preventDefault() { defaultPrevented = true; },
  };
  for (const node of chain) {
    const handler = node?.props?.[prop];
    event.currentTarget = node;
    if (typeof handler === "function") {
      reached.push(node);
      handler(event);
    }
    if (stopped) break;
  }
  let reachedDocument = 0;
  if (!stopped && documentTarget != null && typeof documentTarget.dispatchEvent === "function") {
    reachedDocument = documentTarget.listenerCount?.(type) ?? 0;
    event.currentTarget = documentTarget;
    documentTarget.dispatchEvent(event);
  }
  return { defaultPrevented, stopped, reached, delivered: reached.length, reachedDocument };
}

// focusableIn(tree) — every rendered element a keyboard can reach, in document order. `tabIndex`
// is the declaration; a `button` is focusable without one, exactly as the platform has it.
export function focusableIn(tree) {
  const found = [];
  walk(tree, (node) => {
    if (node?.props?.tabIndex != null && node.props.tabIndex >= 0) found.push(node);
    else if (node?.type === "button" && node.props?.disabled !== true) found.push(node);
  });
  return found;
}
