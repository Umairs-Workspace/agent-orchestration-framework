// MOUNT THE REAL `<TerminalControl/>` HEADLESSLY — ONE OF THEM OR TWENTY — AND WATCH WHETHER
// THEY OPEN SOCKETS (milestone 46, closing the gap that let a dead-on-arrival control ship green;
// milestone 49 / story 08, taking the same instrument from ONE control to a grid).
//
// ═══ WHY THIS EXISTS, measured rather than imagined ═══════════════════════════════════════════
// All three surface harnesses stub this component out by module path —
// `export const TerminalControl = () => null;` in board-app-harness.mjs, fleet-app-harness.mjs
// and shell-app-harness.mjs — because it alone pulls `@xterm/*`, which wants a real DOM. So 537
// green tests, a 71-mutant battery and two structural reviews all passed over a control that
// connected to nothing: every suite drove the framework-free model or a stub, and NOTHING
// rendered the real component and asserted a socket. The defect that shipped was a closed loop
// entirely inside the `.tsx` — the entry state said `idle`, `idle` renders a `<p>` instead of the
// pane host, so `inlineRef.current` stayed null, so the session effect early-returned, so the one
// line that moves the state off `idle` never ran.
//
// A model-only assertion cannot close that gap. This can: it bundles the REAL, UNMODIFIED
// `ui/src/terminal/TerminalControl.tsx` with its real siblings (the state ramp, the source table,
// the socket builder, the geometry rule, the input policy, the byte area, the picker), mounts it
// on mini-react with HOST NODES ATTACHED TO REFS, and hands the lane the list of WebSockets the
// component constructed. "A socket was opened" is then an observable, not an internal.
//
// ═══ WHAT MILESTONE 49 ADDED, AND WHY EACH WAS A BLOCKER RATHER THAN A CONVENIENCE ════════════
// The instrument was built to the size of milestone 46's problem — ONE control — and m49 is the
// first milestone to need many. Four capabilities, each of which turned a whole family of
// assertions from unreachable into observable:
//
//   1. THE ARITY AND A CALLER-SUPPLIED ENTRY. `withTerminalControl` mounted exactly one control
//      from a hard-coded entry, so every grid, focus and live-region contract needed a harness
//      that did not exist. The RENDERER already supported N — host refs are keyed by tree path,
//      reused across passes and detached on departure — so the ceiling was this file's single
//      `renderer.mount(...)` call and nothing deeper. With it comes a PER-PANE driver:
//      "the last socket constructed" is a correct answer at N=1 and a silently wrong one at N=12.
//
//   2. THE SHELL. `hasShellHost()` reads the BUNDLE's own copy of `ui/src/app/shell-bus.mjs`, and
//      a lane that imports that module in the test process sets a DIFFERENT module instance's
//      flag — the call succeeds, the flag reads true, and the mounted control still offers
//      nothing. So the entry re-exports the bundled bus and the harness declares the shell THERE.
//      Without it `offersFullscreen` is false in every lane and every expand/present/dismiss
//      scenario in the milestone reads as a `null` check that passes for the wrong reason.
//
//   3. A FOCUS MODEL AND A KEYBOARD. `focus()` was a literal no-op, there was no `activeElement`
//      anywhere, and no node could be dispatched to. The model lives in `terminal-dom.mjs`; what
//      lives here is the routing — a key goes to whatever HOLDS focus, never to a node the test
//      named, or the test is asserting the focus model rather than the component.
//
//   4. PROPAGATION. `click(node)` invoked ONE prop on ONE node and handed in a `stopPropagation()`
//      nothing consulted, so "clicking X does NOT also do Y" — a claim about which handlers a
//      single gesture reaches — was unwritable. A click is now delivered up the rendered tree's
//      real ancestry and a handler can genuinely stop it.
//
// ═══ WHAT IS SUBSTITUTED, AND IT IS ONLY THE ENVIRONMENT A BROWSER WOULD PROVIDE ══════════════
// The set is `terminal-dom.mjs`'s and is re-exported below as `CONTROL_STUBS`/`CONTROL_RESOLVE`
// so a fitness lane can read it: `@xterm/*` ×3, `react`/`react/jsx-runtime`, `react-dom`'s
// `createPortal`, `lucide-react`, and a DOM with a recording `WebSocket`. Everything else — every
// decision the milestone's ADRs put in a `.mjs` — is bundled FOR REAL.
//
// `TerminalControl` MAY NEVER ENTER THAT SET, and making the ENTRY a caller-supplied value opens
// a second door into the same room: an entry that imported a stubbed control would mount green
// and connect to nothing, which is TECH_DEBT 29 exactly, in the file built to prevent it. So a
// caller supplies an ENTRY and never a stub set — passing one is refused by name.
//
// WHAT THIS IS NOT. It is not a browser and it does not replace the `@manual` browser evidence
// in a milestone's VERIFICATION.md: no glyph is painted, no column is measured, no byte crosses
// a wire. What it proves is the thing that was false on the running system and true in every
// suite — that a bindable mount reaches `new WebSocket(url)` at all.
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ancestryOf, createRuntime } from "./mini-react.mjs";
import { bundleSurface, findAll, textOf, visibleTextOf, FRAGMENT } from "./react-app-harness.mjs";
import {
  createTerminalEnvironment,
  deliverEvent,
  focusableIn,
  installGlobals,
  TERMINAL_ENV_RESOLVE,
  TERMINAL_ENV_STUBS,
  VIEWPORT_HEIGHT,
} from "./terminal-dom.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTROL_TSX = path.join(repoRoot, "ui", "src", "terminal", "TerminalControl.tsx");
const ELEMENT = Symbol.for("aof.mini.element");

// The DEFAULT entry — the real control itself, exactly as milestone 46 named it. A caller that
// says nothing about an entry still mounts THIS file, so the shipping single-control path is
// byte-for-byte the same call it always was.
export { CONTROL_TSX };

// The substitutions, under the names the contract calls them by, so a fitness lane can assert
// that neither one matches `TerminalControl` by module path or by any other spelling.
export const CONTROL_STUBS = TERMINAL_ENV_STUBS;
export const CONTROL_RESOLVE = TERMINAL_ENV_RESOLVE;

// The settle bound. It is a BOUND on passes, not on panes: a pass renders the WHOLE tree and runs
// every effect that pass queued, so twenty controls settle in the same number of passes as one —
// what scales is the work inside a pass. Raising it would hide a genuine render loop, so the
// driver reports the passes it actually used (`settlePasses()`) and the grid lanes assert the
// measurement rather than trusting the number.
const SETTLE_PASSES = 50;

// ── THE SECOND DOOR INTO THE SAME ROOM, and it is the ENTRY ─────────────────────────────────
//
// Refusing a caller-supplied stub set closes one door. It does NOT close the other, and QA walked
// through it during the behavioural review of m49/08: an entry that imports NOTHING and renders
// `<section aria-label="fake pane"/>` twenty times mounts perfectly green, reports twenty panes
// and zero sockets — and satisfies every ABSENCE assertion story 49/05 is made of ("the panes
// beyond the cap hold NO socket", "exactly one node carries `aria-live`") without a line of the
// component under test ever running. That is milestone 46's failure with a new coat on.
//
// So EVERY entry must bundle the REAL control unless the caller says in terms that it mounts none
// (`terminals: false`) — and a caller who says that LOSES THE PANE DRIVER, which is the only thing
// a grid lane could have been written against. The two clauses together mean there is no path to
// `pane(i)` that does not run the component under test.
//
// THE CHECK IS MADE AGAINST THE BUNDLE TEXT rather than against the entry's path, because a path
// can be anything: only `ui/src/terminal/`'s own modules emit these four literals, and a fake that
// reproduced all four would have had to reproduce the control. Each is a load-bearing string from
// a DIFFERENT module, so deleting any one of them from the product is a CI failure here rather
// than a silent downgrade of this check:
const REAL_CONTROL_LITERALS = Object.freeze([
  "absolute inset-0 overflow-hidden",         // TerminalByteArea — the pane host the xterm opens into
  "Expand terminal to full screen",           // TerminalControls — the fullscreen door
  "Resize terminal dock",                     // TerminalDragHandle — the keyboard-operable separator
  "No session. Press Run agent on an item.",  // state-ramp — `idle`'s own copy
]);

function bundleCarriesTheRealControl(bundleSource) {
  return REAL_CONTROL_LITERALS.every((literal) => bundleSource.includes(literal));
}

// withTerminalControl(options, fn) — mount the REAL control (or an entry that renders N of them)
// and yield a driver.
//
//   host / mount / origins  — the shipping single-control call, unchanged. They become the mounted
//                             component's props when no `props` is supplied.
//   entry                   — the module to bundle and mount. Defaults to the real control.
//                             A caller-supplied entry is bundled with its REAL siblings against
//                             the SAME stub set; a caller may NOT supply a stub set of its own.
//   exportName              — which export of that entry to mount. Defaults to `TerminalControl`.
//   props                   — the mounted component's props. Defaults to `{ host, mount, origins }`.
//   shell                   — declare the shell present ON THE BUNDLE the control reads, before
//                             the first render (the flag is read once, at first render). Requires
//                             an entry that re-exports the bundled bus as `shellBus`.
//   terminals               — defaults TRUE, meaning "this entry mounts the real control", which
//                             is VERIFIED against the bundle rather than trusted. `false` is for a
//                             fixture that deliberately mounts none (a focus/propagation shape),
//                             and it costs the caller the whole pane driver.
export async function withTerminalControl(options, fn) {
  const {
    host,
    mount,
    origins = {},
    entry = CONTROL_TSX,
    exportName = "TerminalControl",
    props = null,
    shell = false,
    terminals: mountsTerminals = true,
  } = options ?? {};
  // THE ONE FORBIDDEN FIX, refused by name rather than by convention. An entry is a caller's;
  // the SUBSTITUTIONS are this harness's, and a lane that could add one could substitute the
  // component under test — mount green and connect to nothing.
  if (options?.stubs != null || options?.resolve != null) {
    throw new Error(
      "terminal-control harness: a lane supplies an ENTRY, never a stub set — the substitutions are this harness's and `TerminalControl` may never enter them",
    );
  }

  const bundleSource = await bundleSurface({ entry, stubs: CONTROL_STUBS, resolve: CONTROL_RESOLVE });
  // THE SECOND DOOR, CLOSED BEFORE ANYTHING MOUNTS. An entry that claims to mount terminals must
  // have bundled the real ones; a caller that says it mounts none gets no pane driver at all.
  if (mountsTerminals && !bundleCarriesTheRealControl(bundleSource)) {
    throw new Error(
      `terminal-control harness: the entry ${entry} renders panes but its bundle does not carry the REAL ui/src/terminal/TerminalControl — a substitute mounts green, reports panes and constructs no socket, which satisfies every ABSENCE assertion without running the component under test (TECH_DEBT 29). An entry that deliberately mounts no terminal declares \`terminals: false\`, and then it has no pane driver.`,
    );
  }
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-terminal-control-"));
  const bundlePath = path.join(tmp, `control-${Date.now()}.mjs`);

  const env = createTerminalEnvironment();
  const { documentStub, sockets, terminals, observers } = env;

  // `bindAllHosts` — every host element gets the path-keyed, reused, detach-on-departure stand-in
  // a ref-carrying one already got. It is what makes a FOCUS MODEL possible at all: the shipped
  // drag separator is a `role="separator" tabIndex={0}` div with no ref, and `activeElement` is a
  // property of an ELEMENT. Refs are unaffected — one is still assigned only where the component
  // wrote one.
  const renderer = createRuntime({ hostNode: (tag) => env.createNode(tag), bindAllHosts: true });

  // EVERY GLOBAL THIS HARNESS INSTALLS, BY ITS OWN NAME, so the restore is a straight walk and
  // cannot forget one. The real runner is a single sequential process (`scripts/test.mjs`), so a
  // `document` left standing would change what `typeof document === "undefined"` answers for
  // every module in every suite that runs after this one.
  const windowStub = {
    innerHeight: VIEWPORT_HEIGHT,
    document: documentStub,
    addEventListener() {},
    removeEventListener() {},
  };
  const installed = {
    __AOF_MINI_REACT__: renderer.runtime,
    ...env.globals,
    window: windowStub,
  };
  const installedNames = Object.keys(installed);
  const restoreGlobals = installGlobals(installed);

  let shellBus = null;
  try {
    await writeFile(bundlePath, bundleSource, "utf8");
    const mod = await import(pathToFileURL(bundlePath).href);
    const Component = mod[exportName];
    if (typeof Component !== "function") throw new Error(`the bundle did not export a ${exportName} component`);

    // THE BUNDLE'S OWN SHELL BUS. `shellPresent` is module state with no reset of its own, and it
    // is STICKY: within one mounted module instance, one control declaring a shell declares it for
    // every control mounted afterwards through the same instance (`setProps` with a fresh key is
    // how a lane proves that).
    //
    // WHAT ACTUALLY STOPS IT LEAKING BETWEEN LANES IS THE FRESH MODULE INSTANCE, and that is worth
    // stating precisely rather than crediting the resets: `bundleSurface` caches the bundle
    // SOURCE, but this harness writes that source to a fresh `mkdtemp` + timestamped path per
    // call, so `await import()` evaluates a NEW module every lane and the flag physically cannot
    // survive one. The resets below are FORWARD COVER — they are what keeps the guarantee true the
    // day the bundle FILE is cached too (which is the obvious optimisation, and the day it lands
    // the leak would otherwise be silent).
    shellBus = mod.shellBus ?? null;
    if (shell && shellBus == null) {
      throw new Error(
        "terminal-control harness: `shell: true` needs an entry that re-exports the BUNDLED `shell-bus.mjs` as `shellBus` — declaring it on a copy imported in the test process sets a different module instance's flag",
      );
    }
    const shellEvents = [];
    let detachFullscreen = null;
    if (shellBus != null) {
      shellBus.resetShellBus();
      detachFullscreen = shellBus.attachFullscreenHost((event) => shellEvents.push(event));
      if (shell) shellBus.declareShellPresent();
    }

    let currentProps = props ?? { host, mount, origins };
    let settlePasses = 0;

    // A PANE'S SECTION IS ONE THE CONTROL ITSELF RENDERED, which is why the `ref` is part of the
    // predicate rather than the `<section>` tag alone. The control's own root is
    // `<section ref={sectionRef} aria-label={paneLabel}>` — it holds a ref because it must read
    // the shell's published chrome height off its own element — and a hand-written stand-in
    // `<section aria-label="fake pane"/>` does not. This is the structural half of the guard whose
    // loud half is `REAL_CONTROL_LITERALS`; it is declared here because the mount check below is
    // the first thing that asks.
    const paneSections = (tree) =>
      findAll(tree, (node) => node.type === "section" && node.props?.ref != null && node.props?.["aria-label"] != null);

    // render() — settle the tree the way a browser settles between paints: a state update from an
    // effect re-renders, and that render's own effects run. Bounded, so a genuine loop fails
    // loudly. Focus is reconciled at the end of every settle for the same reason the renderer
    // detaches a departed host's ref: `activeElement` may not point at an element the renderer no
    // longer renders.
    const render = () => {
      for (let pass = 0; pass < SETTLE_PASSES; pass += 1) {
        if (!renderer.isDirty()) {
          settlePasses = pass;
          env.releaseDetached(renderer.hostNodes());
          return renderer.tree();
        }
        renderer.render();
      }
      throw new Error("terminal-control harness: the control never settled");
    };

    const mountRoot = () => {
      renderer.mount({ $$el: ELEMENT, type: Component, props: currentProps, key: null });
      return render();
    };
    mountRoot();

    const nodeWithClass = (root, fragment) =>
      findAll(root, (node) => typeof node.props?.className === "string" && node.props.className.includes(fragment));
    const liveRegion = (root) => findAll(root, (node) => node.props?.["aria-live"] === "polite")[0] ?? null;
    const statusBar = (root) => findAll(root, (node) => node.props?.role === "status")[0] ?? null;
    const buttonNamed = (root, name) =>
      findAll(root, (node) => node.type === "button" && node.props?.["aria-label"] === name)[0] ?? null;
    const buttonWithLabel = (root, label) =>
      findAll(root, (node) => node.type === "button" && visibleTextOf(node) === label)[0] ?? null;

    // ── addressing ONE pane out of many ─────────────────────────────────────────────────────
    //
    // A pane IS its `<section>`: the control renders exactly one, with the session's own
    // accessible name on it, and nothing else in the tree renders one (the fullscreen occupant is
    // a portalled `<div>`). So "the pane at index 2" is a structural fact about the rendered tree
    // rather than a count of constructions — which matters, because the constructions are what a
    // grid gets wrong.
    //
    // A SOCKET AND AN XTERM ARE ATTRIBUTED BY THE ELEMENT THEY WERE OPENED INTO, never by their
    // position in a shared list. `terminal-dom.mjs` records the pane host each xterm was opened
    // into and each socket was built beside; here that node is matched against the stand-in bound
    // to THIS section's own `absolute inset-0` element. Two panes with identical mounts therefore
    // stay distinguishable, which a URL or an index could not do.
    //
    // AND THE WHOLE DRIVER IS WITHHELD FROM A `terminals: false` LANE. That is the other half of
    // the entry guard: the only reason to declare an entry terminal-free is to drive a shape that
    // has no panes in it, so being able to ask about panes anyway would put the fake back in
    // business — it could render whatever it liked and be counted.
    const sections = () => {
      if (!mountsTerminals) {
        throw new Error(
          "terminal-control harness: this lane declared `terminals: false`, so it has no panes to address — a pane driver is only ever handed to an entry that bundled the REAL control",
        );
      }
      return paneSections(renderer.tree());
    };

    const paneAt = (index) => {
      const all = sections();
      const section = all[index];
      if (section == null) {
        throw new Error(
          `terminal-control harness: no pane at index ${index} — the tree holds ${all.length} (asking about a pane that was never mounted must fail, not answer about a neighbour)`,
        );
      }
      const paneHostNode = () => nodeWithClass(section, "absolute inset-0")[0]?.hostNode ?? null;
      const ownTerminals = () => {
        const node = paneHostNode();
        return node == null ? [] : terminals.filter((terminal) => terminal.hostNode === node);
      };
      const ownSockets = () => {
        const node = paneHostNode();
        return node == null ? [] : sockets.filter((socket) => socket.hostNode === node);
      };
      return {
        index,
        section,
        tree: () => section,
        label: () => section.props?.["aria-label"] ?? null,
        sockets: ownSockets,
        socket: () => ownSockets().slice(-1)[0] ?? null,
        terminals: ownTerminals,
        terminal: () => ownTerminals().slice(-1)[0] ?? null,
        paneHosts: () => nodeWithClass(section, "absolute inset-0"),
        paneHost: () => nodeWithClass(section, "absolute inset-0")[0] ?? null,
        paneText: () => visibleTextOf(section),
        chip: () => {
          const live = liveRegion(section);
          return live == null ? null : visibleTextOf(live);
        },
        bar: () => {
          const bar = statusBar(section);
          return bar == null ? null : visibleTextOf(bar);
        },
        button: (name) => buttonNamed(section, name),
        buttonLabelled: (label) => buttonWithLabel(section, label),
        focusables: () => focusableIn(section),
      };
    };

    // ── delivering a gesture ────────────────────────────────────────────────────────────────
    const dispatch = (target, type, init = {}) => {
      const chain = ancestryOf(renderer.tree(), target);
      if (target != null && chain.length === 0) {
        throw new Error(
          `terminal-control harness: the node dispatched at is not in the CURRENT rendered tree — re-read it after the last render (a stale node's handlers are nobody's)`,
        );
      }
      // …and the DOCUMENT is the last stop, exactly as it is in a browser. A whole class of
      // shipped behaviour is document-scoped because the point is that it works wherever focus
      // happens to be — `Shell.tsx` adds its fullscreen `keydown` to `window.document` — so a
      // gesture that stopped at the rendered root could never reach it.
      const result = deliverEvent(chain, type, init, { document: documentStub });
      render();
      return result;
    };

    const resolveFocusTarget = (target) => {
      if (target == null) return null;
      // A DOM stand-in (what a `ref` holds, and what the shell's `opener.focus()` is handed).
      if (typeof target.focus === "function" && target.tagName != null) return target;
      // A rendered element, which is how a lane names the thing an operator would tab to.
      if (target.hostNode != null) return target.hostNode;
      throw new Error("terminal-control harness: nothing focusable was named — pass a rendered host element or a node a ref holds");
    };

    const treeNodeFor = (domNode) =>
      domNode == null ? null : findAll(renderer.tree(), (node) => node.hostNode === domNode)[0] ?? null;

    const driver = {
      tree: () => renderer.tree(),
      render,
      // The passes the LAST settle actually used, so "the tree settled without the harness's own
      // bound being reached" is a measurement rather than the absence of a thrown error.
      settlePasses: () => settlePasses,
      settleBound: () => SETTLE_PASSES,
      // EVERY socket the component constructed, in order. `sockets().length` is the assertion.
      sockets: () => sockets.slice(),
      socket: () => sockets[sockets.length - 1] ?? null,
      terminals: () => terminals.slice(),
      terminal: () => terminals[terminals.length - 1] ?? null,
      // EVERY SOCKET THIS ENVIRONMENT COULD NOT ATTRIBUTE TO A PANE. It must be EMPTY, and the
      // grid lanes assert that it is: an unattributable socket used to be adopted by whichever
      // pane happened to have opened the last xterm, which is a plausible-looking wrong answer in
      // every per-pane count. The day a socket is built outside the session effect's one
      // synchronous body — an async effect, a reconnect timer, a pooled subscription — this list
      // is how it announces itself instead of landing on a neighbour.
      unattributedSockets: () => sockets.filter((socket) => socket.hostNode == null),
      resizeObservers: () => observers.slice(),
      // THE PANE HOST — the `absolute inset-0` div the byte area renders only for a pane whose
      // treatment is `bytes`, and the element the xterm is opened into. Its ABSENCE is what the
      // shipped defect looked like from the outside.
      paneHosts: () => nodeWithClass(renderer.tree(), "absolute inset-0"),
      paneHost: () => nodeWithClass(renderer.tree(), "absolute inset-0")[0] ?? null,
      // The whole byte area as a reader reads it (the centred empty line, the top-left line, or
      // the non-live bar), and the header's state chip.
      paneText: () => visibleTextOf(renderer.tree()),
      chip: () => {
        const live = liveRegion(renderer.tree());
        return live == null ? null : visibleTextOf(live);
      },
      // The bar and the top-left line, addressed by their roles/structure rather than their copy.
      bar: () => {
        const bar = statusBar(renderer.tree());
        return bar == null ? null : visibleTextOf(bar);
      },
      // A control the operator can press, by its accessible name.
      button: (name) => buttonNamed(renderer.tree(), name),
      buttonLabelled: (label) => buttonWithLabel(renderer.tree(), label),
      // A CLICK IS AN EVENT NOW, not a prop call — it starts at the node named and travels up the
      // rendered tree's real ancestry, and a handler that calls `stopPropagation()` really stops
      // it. The call sites that were here before are unaffected: a button clicked this way still
      // runs its own `onClick` first, which is all any of them assert.
      // A GESTURE AIMED AT NOTHING IS AN ERROR, NOT A QUIET SETTLE. `click(null)` used to return a
      // settled tree, which is indistinguishable from a click that happened and changed nothing —
      // and story 49/05's clauses are mostly "…does NOT also…", so a lane that mislocated its
      // button would observe exactly the outcome those clauses assert. Same discipline as
      // `dispatch`'s stale-node throw.
      click: (node) => {
        if (node == null) {
          throw new Error(
            "terminal-control harness: `click(null)` — nothing was aimed at. A control that was not found is a failed lookup, not a click that did nothing",
          );
        }
        dispatch(node, "click");
        return renderer.tree();
      },
      // The same gesture, with what it DID handed back (`{ defaultPrevented, stopped, reached }`).
      clickEvent: (node, init) => dispatch(node, "click", init),
      dispatch,
      // ── the grid ──
      paneCount: () => sections().length,
      panes: () => sections().map((_, index) => paneAt(index)),
      pane: paneAt,
      sections,
      // setProps(next) — re-render the ROOT with new props, which is how an entry drops a pane, or
      // adds one, without remounting the tree: mini-react keys instances by tree path, so the
      // panes that stay keep their state, their socket and their scrollback, and the one that
      // leaves has its cleanups run and its host refs detached.
      setProps: (next) => {
        currentProps = next;
        return mountRoot();
      },
      props: () => currentProps,
      // ── focus and keys ──
      activeElement: () => env.activeElement(),
      // The rendered element that holds focus, for a lane that would rather compare tree nodes.
      focused: () => treeNodeFor(env.activeElement()),
      nodeFor: (renderedNode) => renderedNode?.hostNode ?? null,
      elementFor: (domNode) => treeNodeFor(domNode),
      focusables: () => focusableIn(renderer.tree()),
      focus: (target) => {
        const node = resolveFocusTarget(target);
        node?.focus();
        return env.activeElement();
      },
      blur: () => {
        const active = env.activeElement();
        active?.blur?.();
        return env.activeElement();
      },
      // press(key) — a key ROUTED BY FOCUS, never addressed by node. That is the whole point: a
      // roving tabstop is a claim that keys go to whatever holds focus, and a driver that took a
      // node would let the test assert that instead of the component.
      //
      // AND IT THROWS WHEN NOTHING IN THE TREE HOLDS FOCUS, rather than delivering to nobody: the
      // body holding focus is the default state, so a lane that forgot to `focus()` would press a
      // key, observe nothing move, and pass every "…does NOT also…" clause it was written to
      // check. A key aimed at nobody is a defect in the lane.
      press: (key, init = {}) => {
        const target = treeNodeFor(env.activeElement());
        if (target == null) {
          throw new Error(
            `terminal-control harness: \`press(${JSON.stringify(key)})\` with nothing in the mounted tree focused — the document body holding focus is not a target. \`focus()\` the element first; a key delivered to nobody looks exactly like a key a component ignored`,
          );
        }
        return dispatch(target, "keydown", { key, ...init });
      },
      // keyDown(node, key) — the same delivery, aimed. For a lane proving propagation itself,
      // where "which element was focused" is not the subject.
      keyDown: (node, key, init = {}) => dispatch(node, "keydown", { key, ...init }),
      // ── the shell ──
      // The BUNDLE's own bus, never a copy imported in the test process. `null` when the entry
      // does not re-export it, which is the honest answer for the default entry.
      shell: shellBus == null
        ? null
        : {
            declarePresent: () => shellBus.declareShellPresent(),
            hasShellHost: () => shellBus.hasShellHost(),
            reset: () => shellBus.resetShellBus(),
            // The BUNDLED module namespace itself, so a lane can assert the guarantee that
            // actually stops the flag leaking: a FRESH INSTANCE per lane. Two lanes holding the
            // same object is the day the resets above stop being forward cover and start being
            // the only thing standing between one lane's declaration and the next lane's answer —
            // and it should be a red assertion rather than a quiet change of régime.
            instance: () => shellBus,
            // Every `{ type: "present" | "dismiss", … }` the bundled door delivered, in order.
            events: () => shellEvents.slice(),
            presents: () => shellEvents.filter((event) => event.type === "present").map((event) => event.occupant),
            dismissals: () => shellEvents.filter((event) => event.type === "dismiss"),
          },
      // The deferred layout callbacks the control armed, run in order.
      runFrames: () => env.runFrames(),
      // The globals this lane installed, BY NAME — so "everything is restored" is a walk a lane
      // can perform rather than a promise this file makes.
      installedGlobals: () => installedNames.slice(),
      document: () => documentStub,
      unmount: () => renderer.unmount(),
    };

    try {
      return await fn(driver);
    } finally {
      detachFullscreen?.();
    }
  } finally {
    renderer.unmount();
    // The flag is module state on a CACHED bundle. Leaving it set would declare a shell for the
    // next lane that mounts the same entry, and its "no shell" row would pass for the wrong
    // reason on a day nobody changed anything.
    shellBus?.resetShellBus();
    restoreGlobals();
    await rm(tmp, { recursive: true, force: true });
  }
}

export { findAll, textOf, visibleTextOf, FRAGMENT, ancestryOf };
