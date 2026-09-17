// THE HARNESS HAS A SHELL, A FOCUS MODEL AND A KEYBOARD (milestone 49 / story 08 / task 01).
//
// ═══ WHY EACH OF THESE WAS A BLOCKER RATHER THAN A CONVENIENCE ═══════════════════════════════
//  - NO SHELL → `offersFullscreen` was false in every harness lane, so the expand control never
//    rendered and EVERY expand/present/dismiss scenario in milestone 49 was unreachable. Worse
//    than unreachable: the assertions became `null` checks that passed for the wrong reason.
//  - NO FOCUS MODEL → `focus()` was a literal no-op and there was no `activeElement` anywhere, so
//    `Enter`-to-present, `Escape` and arrow-key roving could not be driven at all.
//  - NO EVENT DELIVERY → the only driver invoked ONE prop on ONE node and handed in a
//    `stopPropagation()` nothing consulted, so every "clicking X does NOT also do Y" clause — a
//    claim about which handlers ONE gesture reaches — was unwritable.
//  - NO HOST NODES IN `withMountedApp` → refs never bound, the control's session effect
//    early-returned, and no socket could ever be constructed through the app-level lane.
//
// ═══ THE KNOWN ANSWERS THIS IS PROVED AGAINST ════════════════════════════════════════════════
// The PO ruling binds here as it does in task 00: never prove the harness against the grid, always
// against behaviour that is already true and already shipped.
//  - THE SHELL DOOR is driven at the four conjuncts of the SHIPPED gate, against the SHIPPED host
//    table — `board-dock` and `fleet-card` declare `AFFORDANCE_FULLSCREEN`, `fullscreen` declares
//    it off. Each row below varies exactly ONE conjunct; none is a new product rule.
//  - THE KEYBOARD is driven at `TerminalDragHandle` — a shipped `role="separator"`, `tabIndex={0}`
//    element whose handler moves the dock by a shipped constant (`DRAG_KEY_STEP = 16`) on two keys
//    and RETURNS for every other, with a shipped rendered observable (`aria-valuenow`). It has
//    shipped keyboard-operable and this repo has never once observed it working, because there was
//    no focus and no key delivery. If the harness cannot make those rows green against a control
//    nobody is changing, no keyboard claim anywhere can be believed.
//
// NOTHING HERE ASSERTS A TERMINALS-HOME BEHAVIOUR. This file proves only that a key ARRIVES at the
// handler that was attached; what any component decides to do with it is that component's
// contract. `activeElement` here is a value the harness maintains honestly; whether a person can
// SEE where focus is remains an `@uat` row.
//
// ISOLATION: no store, no server, no port. Run focused, with `AOF_GLOBAL_HOME=$(mktemp -d)`.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { withTerminalControl, CONTROL_STUBS, CONTROL_RESOLVE, findAll } from "../support/terminal-control-harness.mjs";
import { withMountedApp } from "../support/react-app-harness.mjs";
import { isUiSourceFile } from "../support/ui-source-files.mjs";
import { TERMINAL_CONTROL_FILTER, TERMINAL_CONTROL_STUB, TERMINAL_ENV_RESOLVE, TERMINAL_ENV_STUBS } from "../support/terminal-dom.mjs";
import * as processShellBus from "../../ui/src/app/shell-bus.mjs";
import { boardDockMount } from "../../ui/src/board/dock-mount.mjs";
import { fleetTerminalMount } from "../../ui/src/fleet/terminal-mount.mjs";
import {
  declaresAffordance,
  terminalControlState,
  terminalSessionIdentity,
  AFFORDANCE_DRAG_RESIZE,
  AFFORDANCE_FULLSCREEN,
  HOST_BOARD_DOCK,
  HOST_FLEET_CARD,
  HOST_FULLSCREEN,
  WATCH_LABEL,
} from "../../ui/src/terminal/host-model.mjs";
import { terminalFullscreenExits, terminalFullscreenId } from "../../ui/src/terminal/fullscreen-request.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const GRID_ENTRY = path.join(repoRoot, "test", "support", "terminal-grid-entry.tsx");
const FOCUS_ENTRY = path.join(repoRoot, "test", "support", "terminal-focus-entry.tsx");
const SURFACE_ENTRY = path.join(repoRoot, "test", "support", "terminal-surface-entry.tsx");

const BOARD_ORIGIN = "http://127.0.0.1:41773";
const FLEET_ORIGIN = "http://127.0.0.1:4181";
const ORIGINS = { self: BOARD_ORIGIN, fleet: FLEET_ORIGIN };
const EXPAND_LABEL = "Expand terminal to full screen";

const MIRROR = { kind: "mirror", ref: "49/08", nodeId: "aof-wsl", sessionId: "7f3a91c" };
const BOUND_DOCK = boardDockMount(MIRROR);
const CARD_MOUNT = fleetTerminalMount({ targetNodeId: "aof-wsl", sessionId: "7f3a91c", state: "running" }, { itemRef: "49/08" });

// One control at one host, through the entry that re-exports the BUNDLED shell bus — which is the
// only module instance a declaration can be made on that the mounted control will ever read.
const oneControl = ({ host, mount, origins = ORIGINS, shell = false }) => ({
  entry: GRID_ENTRY,
  exportName: "TerminalGrid",
  props: { panes: [{ key: "only", host, mount, origins }] },
  shell,
});

// The focus/propagation fixture declares in terms that it mounts NO terminal, which is what costs
// it the pane driver — the other half of the entry guard. It is not a convenience: an entry that
// could render whatever it liked AND be counted as panes is the door m49/08's own review walked
// through, so `terminals: false` and "no `pane(i)`" are one decision.
const focusFixture = (props = {}) => ({ entry: FOCUS_ENTRY, exportName: "FocusFixture", props, terminals: false });
const fixtureNode = (app, name) =>
  findAll(app.tree(), (node) => node.props?.["data-fixture"] === name)[0] ?? null;

// The surface entry, mounted through `withMountedApp` BOTH ways: with the module-path stub the
// three surface harnesses share, and without it.
const STUBBED_SUBSTITUTIONS = {
  stubs: { __terminal_control__: TERMINAL_CONTROL_STUB, ...TERMINAL_ENV_STUBS },
  resolve: [{ filter: TERMINAL_CONTROL_FILTER, to: "__terminal_control__" }, ...TERMINAL_ENV_RESOLVE],
};
const REAL_SUBSTITUTIONS = { stubs: { ...TERMINAL_ENV_STUBS }, resolve: [...TERMINAL_ENV_RESOLVE] };

async function withTerminalSurface({ spec, real, hostNodes = true }, fn) {
  globalThis.__AOF_TERMINAL_SURFACE__ = spec;
  try {
    return await withMountedApp(
      {
        entry: SURFACE_ENTRY,
        exportName: "TerminalSurface",
        ...(real ? REAL_SUBSTITUTIONS : STUBBED_SUBSTITUTIONS),
        hostNodes,
        terminalEnvironment: true,
        url: "http://127.0.0.1:9",
      },
      fn,
    );
  } finally {
    delete globalThis.__AOF_TERMINAL_SURFACE__;
  }
}

const sourceOf = (relative) => readFileSync(path.join(repoRoot, relative), "utf8");
const stripComments = (source) => source.replace(/(^|[^:])\/\/.*$/gm, "$1").replace(/\/\*[\s\S]*?\*\//g, "");

// The keyboard step, READ OFF THE SHIPPED SOURCE rather than retyped. `node` cannot import a
// `.tsx`, and typing `16` here would make the lane below agree with itself the day the constant
// moves — which is the one way a keyboard assertion can stay green while the keyboard changes.
const DRAG_KEY_STEP = Number(/export const DRAG_KEY_STEP\s*=\s*(\d+)/.exec(sourceOf("ui/src/terminal/TerminalDragHandle.tsx"))?.[1]);

// The `ui/src` sweep uses the tree's ONE declared predicate (`test/support/ui-source-files.mjs`,
// landed by m49/02 for the per-file and per-directory budget gates) rather than a fourth inline
// copy of the same regex — its own header says why: a second copy is how two gates come to
// disagree about what a file IS.
function filesUnder(dir, matches) {
  const out = [];
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...filesUnder(full, matches));
    else if (matches(item.name)) out.push(full);
  }
  return out;
}

const uiSourceFiles = () => filesUnder(path.join(repoRoot, "ui", "src"), isUiSourceFile);
// The TEST tree is a different question from the ui tree — it holds `.mjs` suites and `.tsx`
// harness entries and nothing is budgeted — so it keeps its own predicate, stated here rather
// than borrowed from a gate that means something else by it.
const testTreeFiles = () => filesUnder(path.join(repoRoot, "test"), (name) => /\.(mjs|tsx?)$/.test(name));

export const terminalHarnessShellFocusKeyboardTests = [
  // ══════════════════════════════════════════════════════════════════════════════════════════
  // 1 · THE SHELL DOOR. Four conjuncts, each varied on its own, all against shipped hosts.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "shell/01 the expand control appears exactly when all FOUR of the shipped gate's conjuncts hold — six rows, each varying one conjunct of `declaresAffordance(host, FULLSCREEN) && shellHosted && subscribed && mount.bound`",
    run: async () => {
      // ROW 2 IS THE STATE OF THE WORLD BEFORE THIS STORY, and it is the only row the old harness
      // could produce — which is precisely why every expand scenario in milestone 49 was
      // unreachable and why an assertion written against it would read `null` and pass.
      // ROWS 3, 4 AND 6 ARE WHAT STOP THE FIX BEING "force the button on": a harness that declared
      // the shell AND made the control render its expand control unconditionally would pass rows
      // 1, 2 and 5 and fail these three.

      // Row 1 — the shipped dock, in a shell. All four hold.
      await withTerminalControl(oneControl({ host: HOST_BOARD_DOCK, mount: BOUND_DOCK, shell: true }), (app) => {
        assert.equal(app.shell.hasShellHost(), true, "the shell is declared ON THE BUNDLE the control reads");
        assert.ok(app.button(EXPAND_LABEL) != null, "row 1 (all four hold): the expand control is PRESENT");
      });

      // Row 2 — the same tree with no shell. `shellHosted` is the conjunct that decides it.
      await withTerminalControl(oneControl({ host: HOST_BOARD_DOCK, mount: BOUND_DOCK }), (app) => {
        assert.equal(app.shell.hasShellHost(), false, "row 2: the deciding conjunct — `shellHosted` is false");
        assert.equal(app.button(EXPAND_LABEL), null, "row 2: the expand control is ABSENT");
        assert.equal(app.sockets().length, 1, "…and it is absent for the SHELL's sake, not because nothing mounted");
      });

      // Row 3 — a shell, and nothing bound. `mount.bound` is the conjunct that decides it.
      await withTerminalControl(oneControl({ host: HOST_BOARD_DOCK, mount: boardDockMount(null), shell: true }), (app) => {
        assert.equal(boardDockMount(null).bound, false, "row 3: the deciding conjunct — `mount.bound` is false");
        assert.equal(app.shell.hasShellHost(), true, "…while the shell IS declared");
        assert.equal(app.button(EXPAND_LABEL), null, "row 3: the expand control is ABSENT");
      });

      // Row 4 — the card at rest. `subscribed` is the conjunct that decides it.
      await withTerminalControl(
        oneControl({ host: HOST_FLEET_CARD, mount: CARD_MOUNT, origins: { self: FLEET_ORIGIN, fleet: FLEET_ORIGIN }, shell: true }),
        (app) => {
          assert.equal(app.chip(), null, "row 4: the deciding conjunct — the card rests UNSUBSCRIBED (no state chip, and no byte area)");
          assert.equal(app.paneHosts().length, 0);
          assert.equal(app.button(EXPAND_LABEL), null, "row 4: the expand control is ABSENT");

          // Row 5 — the SAME card, watching. Subscribing is the only thing that changed.
          app.click(app.buttonLabelled(WATCH_LABEL));
          assert.equal(app.sockets().length, 1, "row 5: the worded toggle subscribed");
          assert.ok(app.button(EXPAND_LABEL) != null, "row 5 (all four hold): the expand control is PRESENT");
        },
      );

      // Row 6 — the host that is already there. The HOST TABLE decides it.
      await withTerminalControl(oneControl({ host: HOST_FULLSCREEN, mount: BOUND_DOCK, shell: true }), (app) => {
        assert.equal(
          declaresAffordance(HOST_FULLSCREEN, AFFORDANCE_FULLSCREEN),
          false,
          "row 6: the deciding conjunct — the host declares the affordance OFF (`it is already fullscreen`)",
        );
        assert.equal(app.shell.hasShellHost(), true);
        assert.equal(app.sockets().length, 1, "…and the pane is bound and subscribed, so three of four conjuncts hold");
        assert.equal(app.button(EXPAND_LABEL), null, "row 6: the expand control is ABSENT");
      });
    },
  },

  {
    name: "shell/02 presenting through the BUNDLED bus hands the lane the real request — one present, the session's own id, a LIVE node, `ownsChrome`, `claimsEscape` — and it costs a layout change and nothing else, for THE PRESENTED PANE and for its two neighbours",
    run: async () => {
      // IT IS PRESENTED AT INDEX 1 OF THREE, and that is the point rather than decoration.
      // Presenting RE-PARENTS the xterm's host element into the overlay, so a driver that read
      // `host.parentElement` lazily would answer about where the pane is NOW and the presented
      // pane would lose its OWN xterm — while `app.terminal()`, the global "last constructed",
      // kept answering correctly and every lane stayed green. The attribution is frozen at
      // `open()` for exactly this, and it is only checkable by asking the presented pane about
      // itself while its neighbours are there to be confused with.
      await withTerminalControl(
        {
          entry: GRID_ENTRY,
          exportName: "TerminalGrid",
          shell: true,
          props: {
            panes: [
              { key: "p0", host: HOST_BOARD_DOCK, mount: boardDockMount({ ...MIRROR, sessionId: "s-0" }), origins: ORIGINS },
              { key: "p1", host: HOST_BOARD_DOCK, mount: BOUND_DOCK, origins: ORIGINS },
              { key: "p2", host: HOST_BOARD_DOCK, mount: boardDockMount({ ...MIRROR, sessionId: "s-2" }), origins: ORIGINS },
            ],
          },
        },
        (app) => {
        assert.equal(app.paneCount(), 3);
        const subject = () => app.pane(1);
        subject().socket().accept();
        app.render();
        subject().socket().deliver("painted scrollback\r\n");
        app.render();
        assert.equal(subject().chip(), "streaming");
        assert.equal(app.pane(0).chip(), "connecting…", "…and its neighbours are in a different state, so a mix-up would show");

        const socketsBefore = app.sockets().length;
        const terminalsBefore = app.terminals().length;
        const scrollbackBefore = [...subject().terminal().written];
        const neighbourTerminals = [app.pane(0).terminal(), app.pane(2).terminal()];
        const neighbourSockets = [app.pane(0).socket(), app.pane(2).socket()];
        assert.equal(app.shell.presents().length, 0, "nothing is presented before the button is pressed");

        app.click(subject().button(EXPAND_LABEL));

        // ALL OF THIS IS SHIPPED m46 BEHAVIOUR that no suite has ever been able to observe,
        // because the button that starts it has never rendered in a harness.
        const requests = app.shell.presents();
        assert.equal(requests.length, 1, "the lane received exactly ONE present request");
        const request = requests[0];

        const sessionKey = terminalSessionIdentity({
          ...terminalControlState({ subscribed: true }),
          source: BOUND_DOCK.source,
          params: BOUND_DOCK.params,
          posture: BOUND_DOCK.posture,
        });
        assert.equal(request.id, terminalFullscreenId(sessionKey), "its `id` is `terminal:` followed by that pane's own session key");
        assert.ok(request.id.startsWith("terminal:"));

        // The `node` is the LIVE element the control created for the presentation — a DOM element
        // the shell will adopt, never a React element it would re-render somewhere else.
        assert.equal(typeof request.node, "object");
        assert.equal(request.node.tagName, "DIV");
        assert.equal(request.node.className, "h-full");
        assert.equal(request.node.$$el, undefined, "…not a React element");

        assert.equal(request.ownsChrome, true);
        assert.equal(
          request.claimsEscape,
          terminalFullscreenExits({ source: BOUND_DOCK.source, posture: BOUND_DOCK.posture }).claimsEscape,
          "`claimsEscape` equals that mount's own `inputEnabled`",
        );

        // THE PRESENTED PANE STILL ANSWERS ABOUT ITSELF. This is the clause the `open()` freeze
        // exists for: the xterm's host element has just been re-parented into the overlay, so a
        // lazily-read `host.parentElement` no longer names the pane it belongs to — and the pane
        // would report NO terminal of its own while the global count stayed right.
        assert.notEqual(subject().terminal(), null, "the presented pane still holds its OWN xterm after the re-parent");
        assert.equal(subject().terminals().length, 1, "…exactly one of them");
        assert.equal(subject().sockets().length, 1, "…and its own one socket, unchanged");
        assert.equal(subject().terminal(), app.terminals()[1], "…and it is the xterm THIS pane constructed, second of three");
        assert.deepEqual(subject().terminal().written, scrollbackBefore, "…whose written scrollback is unchanged");
        assert.equal(subject().paneHosts().length, 1, "…and the pane still has exactly one INLINE host inside its own section");

        // …and neither neighbour moved.
        assert.deepEqual([app.pane(0).terminal(), app.pane(2).terminal()], neighbourTerminals, "the neighbours' xterms are still their own");
        assert.deepEqual([app.pane(0).socket(), app.pane(2).socket()], neighbourSockets, "…and so are their sockets");
        assert.equal(app.pane(0).chip(), "connecting…");
        assert.equal(app.pane(2).chip(), "connecting…");

        // THE COST IS LAYOUT AND NOTHING ELSE — the same claim m46 already makes about collapse,
        // asserted here about present. A re-subscribe would be visible: the mirror is ephemeral,
        // so it would come back EMPTY.
        assert.equal(app.sockets().length, socketsBefore, "the number of constructed sockets is unchanged");
        assert.equal(app.terminals().length, terminalsBefore, "…and the number of constructed xterms is unchanged");
        assert.deepEqual(app.unattributedSockets(), [], "…and presenting did not orphan a socket");
        },
      );
    },
  },

  {
    name: "shell/03 declaring the shell on the TEST PROCESS's own copy of the module changes nothing the mounted control can see — the call succeeds, the flag reads true, and the control still offers no door",
    run: async () => {
      try {
        // THE TWO HALVES ARE THE POINT. A builder who takes the obvious path gets a call that
        // succeeds, a flag that reads true, and a control that still offers nothing — and will go
        // looking for the defect inside `TerminalControl.tsx`.
        processShellBus.declareShellPresent();
        assert.equal(processShellBus.hasShellHost(), true, "the call DID happen — on the wrong module instance");

        await withTerminalControl(oneControl({ host: HOST_BOARD_DOCK, mount: BOUND_DOCK }), (app) => {
          assert.equal(app.button(EXPAND_LABEL), null, "no expand control is in the rendered tree");
          assert.equal(app.shell.hasShellHost(), false, "the BUNDLE's own copy of the flag is still false");
          assert.equal(app.sockets().length, 1, "…and the control really did mount (non-vacuous)");
        });

        // …and declared on the instance the control actually reads, the door opens.
        await withTerminalControl(oneControl({ host: HOST_BOARD_DOCK, mount: BOUND_DOCK, shell: true }), (app) => {
          assert.ok(app.button(EXPAND_LABEL) != null, "declared on the BUNDLE, the expand control IS in the rendered tree");
        });
      } finally {
        // The test process's copy is module state for the WHOLE run — one sequential process — so
        // it goes back exactly as it was found.
        processShellBus.resetShellBus();
        assert.equal(processShellBus.hasShellHost(), false);
      }
    },
  },

  {
    name: "shell/04 the shell flag does not LEAK from one lane to the next — and the guarantee that stops it is the FRESH MODULE INSTANCE per lane, with the resets as forward cover for the day the bundle FILE is cached too",
    run: async () => {
      const declared = async () =>
        withTerminalControl(oneControl({ host: HOST_BOARD_DOCK, mount: BOUND_DOCK, shell: true }), (app) => app.button(EXPAND_LABEL) != null);
      const notDeclared = async () =>
        withTerminalControl(oneControl({ host: HOST_BOARD_DOCK, mount: BOUND_DOCK }), (app) => app.button(EXPAND_LABEL) != null);

      assert.equal(await declared(), true, "lane 1 declares the shell and gets the door");
      assert.equal(await notDeclared(), false, "a SECOND lane in the same process, not declaring, gets no door");
      // …and the order does not change either answer.
      assert.equal(await notDeclared(), false, "not-declared, run first, still gets no door");
      assert.equal(await declared(), true, "…and declared, run after it, still gets one");

      // THE MECHANISM, MADE LOAD-BEARING RATHER THAN STATED — and it is NOT the resets. The four
      // lanes above pass because `bundleSurface` caches the bundle SOURCE while this harness
      // writes it to a fresh temp path per call, so `await import()` evaluates a NEW module every
      // lane and the flag cannot physically survive one. That is the guarantee, so that is what is
      // asserted; the `resetShellBus()` calls are FORWARD COVER for the day the bundle FILE is
      // cached too (the obvious optimisation — and `ui/src/app/shell-bus.mjs`'s three module-scope
      // `let`s are the only mutable state in the whole bundle, all three of them reset by
      // `resetShellBus`). The day that lands, THIS assertion goes red rather than the régime
      // changing quietly.
      const instances = [];
      for (let lane = 0; lane < 2; lane += 1) {
        await withTerminalControl(oneControl({ host: HOST_BOARD_DOCK, mount: BOUND_DOCK }), (app) => instances.push(app.shell.instance()));
      }
      assert.notEqual(instances[0], instances[1], "each lane evaluates its OWN copy of the bundled shell bus — that is what stops the flag leaking");

      // …AND WITHIN ONE INSTANCE THE FLAG IS REAL, STICKY MODULE STATE, which is what makes the
      // reset worth having at all. `setProps` with a fresh key is how a lane gets a second control
      // instance out of the same module: `hasShellHost` is read once, at each control's FIRST
      // render.
      await withTerminalControl(oneControl({ host: HOST_BOARD_DOCK, mount: BOUND_DOCK, shell: true }), (app) => {
        assert.ok(app.button(EXPAND_LABEL) != null, "the first control instance read the flag as declared");

        app.shell.reset();
        assert.equal(app.shell.hasShellHost(), false, "the reset really cleared it on the instance the control reads");
        app.setProps({ panes: [{ key: "second", host: HOST_BOARD_DOCK, mount: BOUND_DOCK, origins: ORIGINS }] });
        assert.equal(app.paneCount(), 1);
        assert.equal(app.button(EXPAND_LABEL), null, "a SECOND control instance through the SAME module reads the reset flag — no door");

        app.shell.declarePresent();
        app.setProps({ panes: [{ key: "third", host: HOST_BOARD_DOCK, mount: BOUND_DOCK, origins: ORIGINS }] });
        assert.ok(app.button(EXPAND_LABEL) != null, "…and declaring again on that same instance opens it for the next one — the flag is real, sticky module state");
      });
    },
  },

  {
    name: "shell/05 NO declarer is added to the product tree — `declareShellPresent(` is called exactly once across `ui/src`, at module scope, from `ui/src/app/Shell.tsx`, and the harness reaches the declaration through the BUNDLED module from `test/`",
    run: () => {
      // `test/arch/mesh/acd-shell-bus-single-host.test.mjs` scans the ui tree only, so a `test/` caller
      // is out of its scope BY CONSTRUCTION and a `ui/src/` caller is a CI failure. The flag means
      // "a shell exists in this bundle"; only the module that renders the shell root may assert it.
      const callers = [];
      for (const file of uiSourceFiles()) {
        const source = stripComments(readFileSync(file, "utf8"));
        const calls = source.match(/(?<!function\s)declareShellPresent\s*\(/g) ?? [];
        const definition = /export\s+function\s+declareShellPresent\s*\(/.test(source) ? 1 : 0;
        const count = calls.length - definition;
        if (count > 0) callers.push([path.relative(repoRoot, file).split(path.sep).join("/"), count]);
      }
      assert.deepEqual(callers, [["ui/src/app/Shell.tsx", 1]], `exactly one caller, and it is the shell root (found: ${JSON.stringify(callers)})`);

      const shell = stripComments(sourceOf("ui/src/app/Shell.tsx"));
      const line = shell.split(/\r?\n/).find((candidate) => candidate.includes("declareShellPresent("));
      assert.ok(/^declareShellPresent\(\);?\s*$/.test(line.trim()), `the call is at MODULE scope (found: ${JSON.stringify(line)})`);

      // The harness's own declarer lives in `test/`, on the BUNDLE's re-exported namespace.
      const entry = stripComments(sourceOf("test/support/terminal-grid-entry.tsx"));
      assert.ok(entry.includes("shell-bus.mjs"), "the harness entry re-exports the bundled bus");
      assert.ok(!entry.includes("declareShellPresent("), "…and does not itself declare — the harness does, from `test/`");
      assert.ok(
        stripComments(sourceOf("test/support/terminal-control-harness.mjs")).includes("shellBus.declareShellPresent()"),
        "…which is where the declaration is made",
      );
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // 2 · THE FOCUS MODEL. A live `activeElement` that `focus()` moves — both halves of one fact.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "shell/06 `focus()` MOVES a document-level `activeElement` and the previous holder loses it — five rows, including the one a recorder cannot express and the one where the holder leaves the tree",
    run: async () => {
      await withTerminalControl(focusFixture({ showA: true, showB: true }), (app) => {
        const a = () => fixtureNode(app, "a");
        const b = () => fixtureNode(app, "b");
        assert.ok(a() != null && b() != null, "the fixture rendered two focusable elements");
        assert.equal(app.focusables().length, 2, "…and exactly those two are focusable");

        // Row 1 — nothing focused yet.
        assert.equal(app.activeElement().tagName, "BODY", "before anything is focused, the body holds it, as a browser has it");
        assert.notEqual(app.activeElement(), a().hostNode);
        assert.notEqual(app.activeElement(), b().hostNode);
        assert.equal(app.focused(), null, "no element of the mounted tree holds focus by default");

        // Row 2 — focus lands.
        app.focus(a());
        assert.equal(app.activeElement(), a().hostNode, "`focus()` on A makes A the activeElement");
        assert.notEqual(app.activeElement(), b().hostNode, "…and B does not hold focus");
        assert.equal(app.focused().props["data-fixture"], "a");

        // Row 3 — focus MOVES. THIS IS THE ASSERTION A RECORDER CANNOT EXPRESS: a `focus()` that
        // merely recorded being called satisfies rows 2 and 4 and cannot state this one at all.
        app.focus(b());
        assert.equal(app.activeElement(), b().hostNode, "`focus()` on B moves it");
        assert.notEqual(app.activeElement(), a().hostNode, "…and A NO LONGER holds focus");

        // Row 4 — re-focusing is idempotent.
        app.focus(a());
        const before = app.tree();
        app.focus(a());
        assert.equal(app.activeElement(), a().hostNode, "focusing A again leaves A holding it");
        assert.equal(app.tree(), before, "…and nothing else in the tree changed");
      });

      // Row 5 — the holder LEAVES THE TREE. It matches the renderer's existing discipline: a
      // departed host element's ref is detached rather than left dangling, and focus follows the
      // same rule for the same reason.
      await withTerminalControl(focusFixture({ showA: true, showB: true }), (app) => {
        const a = fixtureNode(app, "a");
        app.focus(a);
        assert.equal(app.activeElement(), a.hostNode);
        app.setProps({ showA: false, showB: true });
        assert.equal(fixtureNode(app, "a"), null, "A was removed by the re-render");
        assert.notEqual(app.activeElement(), a.hostNode, "`activeElement` does not point at an element the renderer no longer renders");
        assert.equal(app.activeElement().tagName, "BODY");
        assert.ok(fixtureNode(app, "b") != null, "…and B is untouched");
      });
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // 3 · THE KEYBOARD. Driven at a shipped handler with a shipped, rendered observable.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "shell/07 keys reach the SHIPPED drag separator's own handler and it responds exactly as it ships — ArrowUp/ArrowDown move `aria-valuenow` by 16 and call `preventDefault()`; Enter, Escape and a printable character change nothing and call it for neither",
    run: async () => {
      const separatorOf = (app) => findAll(app.tree(), (node) => node.props?.role === "separator")[0] ?? null;
      const rows = [
        { case: "grow the dock", key: "ArrowUp", delta: DRAG_KEY_STEP, prevented: true },
        { case: "shrink the dock", key: "ArrowDown", delta: -DRAG_KEY_STEP, prevented: true },
        { case: "a key it does not own", key: "Enter", delta: 0, prevented: false },
        { case: "another it does not own", key: "Escape", delta: 0, prevented: false },
        { case: "a printable character", key: "a", delta: 0, prevented: false },
      ];
      for (const row of rows) {
        await withTerminalControl(
          { host: HOST_BOARD_DOCK, mount: boardDockMount({ kind: "local-pty", ref: "49/08", command: "/aof:build 49/08" }), origins: ORIGINS },
          (app) => {
            const separator = separatorOf(app);
            assert.ok(separator != null, `${row.case}: the dock renders its separator (the host declares drag-resize: ${declaresAffordance(HOST_BOARD_DOCK, AFFORDANCE_DRAG_RESIZE)})`);
            assert.equal(separator.props["aria-label"], "Resize terminal dock");

            const before = separator.props["aria-valuenow"];
            const min = separator.props["aria-valuemin"];
            const max = separator.props["aria-valuemax"];
            assert.ok(
              before - DRAG_KEY_STEP >= min && before + DRAG_KEY_STEP <= max,
              `${row.case}: the separator sits at ${before} with at least one ${DRAG_KEY_STEP}px step of headroom in both directions (${min}..${max}) — so the clamp is not the subject`,
            );

            // A KEY IS ROUTED BY FOCUS, never addressed by node.
            app.focus(separator);
            assert.equal(app.focused().props.role, "separator", `${row.case}: the separator holds focus`);
            const result = app.press(row.key);

            assert.equal(separatorOf(app).props["aria-valuenow"], before + row.delta, `${row.case}: aria-valuenow`);
            assert.equal(result.defaultPrevented, row.prevented, `${row.case}: preventDefault()`);
          },
        );
      }
    },
  },

  {
    name: "shell/08 a key goes to the element that HOLDS FOCUS, and to nothing else — and when focus moves, so does the key",
    run: async () => {
      const events = [];
      await withTerminalControl(focusFixture({ onEvent: (event) => events.push(event) }), (app) => {
        app.focus(fixtureNode(app, "a"));
        app.press("x");
        assert.deepEqual(
          events.filter((event) => event.where === "a"),
          [{ where: "a", type: "keydown", key: "x" }],
          "the first element's handler received an event whose `key` is exactly the pressed key",
        );
        assert.deepEqual(events.filter((event) => event.where === "b"), [], "the second element's handler received nothing");

        events.length = 0;
        app.focus(fixtureNode(app, "b"));
        app.press("x");
        assert.deepEqual(
          events.filter((event) => event.where === "b"),
          [{ where: "b", type: "keydown", key: "x" }],
          "focus moved, so the second element's handler received it",
        );
        assert.deepEqual(events.filter((event) => event.where === "a"), [], "…and the first received nothing further");
      });
    },
  },

  {
    name: "shell/09 an event dispatched at a DESCENDANT reaches its ancestors, and a handler can STOP it — four rows, click and keydown, bubbling and stopped",
    run: async () => {
      // PROPAGATION IS A CAPABILITY, NOT A DETAIL. Every "…does NOT also…" clause is a claim about
      // which handlers ONE gesture reaches; a harness that calls props directly can assert the
      // first half of each of those and never the second, which is the shape of a test that agrees
      // with whatever the code does.
      const rows = [
        { case: "it bubbles", type: "click", stop: false, ancestorRan: true },
        { case: "it can be stopped", type: "click", stop: true, ancestorRan: false },
        { case: "keys bubble too", type: "keydown", stop: false, ancestorRan: true },
        { case: "and can be stopped too", type: "keydown", stop: true, ancestorRan: false },
      ];
      for (const row of rows) {
        const events = [];
        await withTerminalControl(
          focusFixture({ stopAtDescendant: row.stop, onEvent: (event) => events.push(event) }),
          (app) => {
            const descendant = fixtureNode(app, "descendant");
            assert.ok(descendant != null);
            const result = row.type === "click" ? app.clickEvent(descendant) : app.keyDown(descendant, "k");
            const where = events.map((event) => event.where);
            assert.ok(where.includes("descendant"), `${row.case}: the descendant's handler ran`);
            assert.equal(
              where.includes("ancestor"),
              row.ancestorRan,
              `${row.case}: the ancestor's handler ${row.ancestorRan ? "ALSO ran" : "did NOT run"} (reached: ${where.join(", ")})`,
            );
            assert.equal(result.stopped, row.stop, `${row.case}: the gesture reports whether it was stopped`);
            assert.equal(result.reached.length, row.ancestorRan ? 2 : 1);
          },
        );
      }
    },
  },

  {
    name: "shell/09b a gesture reaches the DOCUMENT after the tree, exactly as a browser has it — the app shell's fullscreen `Escape` is attached at `window.document`, so a key that stopped at the rendered root could never reach it",
    run: async () => {
      // THE SHELL'S OWN LISTENER IS DOCUMENT-SCOPED, and deliberately: it carries `Escape` for the
      // presented occupant and the focus trap, and the whole point is that it works wherever focus
      // happens to be. `Shell.tsx` attaches it to `view.document` — so `press` walking only the
      // rendered ancestry left `05/04`'s `Escape`-claiming clause undrivable, which is precisely
      // the mid-build discovery this story exists to prevent.
      const seen = [];
      await withTerminalControl(focusFixture({}), (app) => {
        const listener = (event) => seen.push({ type: event.type, key: event.key ?? null });
        app.document().addEventListener("keydown", listener);
        app.document().addEventListener("click", listener);

        app.focus(fixtureNode(app, "a"));
        const key = app.press("Escape");
        assert.deepEqual(seen, [{ type: "keydown", key: "Escape" }], "the key reached the document-scoped listener");
        assert.equal(key.reachedDocument, 1, "…and the gesture reports that it got there");

        seen.length = 0;
        const click = app.clickEvent(fixtureNode(app, "b"));
        assert.deepEqual(seen, [{ type: "click", key: null }], "…and so does a click");
        assert.equal(click.reachedDocument, 1);

        // …AND `stopPropagation()` STOPS IT THERE TOO. The document is the last stop on the path,
        // not a second, unconditional delivery — a handler that stopped the gesture stopped it.
        app.document().removeEventListener("keydown", listener);
        app.document().removeEventListener("click", listener);
        assert.equal(app.document().listenerCount("keydown"), 0, "the listeners really came off (non-vacuous)");
      });

      const stopped = [];
      await withTerminalControl(focusFixture({ stopAtDescendant: true }), (app) => {
        app.document().addEventListener("click", (event) => stopped.push(event.type));
        const result = app.clickEvent(fixtureNode(app, "descendant"));
        assert.equal(result.stopped, true, "the descendant stopped it");
        assert.deepEqual(stopped, [], "…so it never reached the document");
        assert.equal(result.reachedDocument, 0);
      });
    },
  },

  {
    name: "shell/09c a gesture aimed at NOTHING is an error, not a quiet settle — `press` with nothing focused and `click(null)` both throw, matching `dispatch`'s stale-node discipline",
    run: async () => {
      // STORY 49/05's CLAUSES ARE MOSTLY "…does NOT also…", so a lane that forgot to `focus()`, or
      // whose `button(name)` lookup missed, observes EXACTLY the outcome those clauses assert. A
      // silent no-op there is a test that agrees with whatever the code does.
      await withTerminalControl(focusFixture({}), (app) => {
        assert.equal(app.activeElement().tagName, "BODY", "nothing in the tree holds focus");
        assert.throws(
          () => app.press("ArrowUp"),
          /with nothing in the mounted tree focused/,
          "a key delivered to nobody looks exactly like a key a component ignored",
        );
        assert.throws(
          () => app.click(null),
          /nothing was aimed at/,
          "a control that was not found is a failed lookup, not a click that did nothing",
        );
        // …and the same discipline the harness already had for a node from a previous pass.
        const stale = fixtureNode(app, "a");
        app.setProps({ showA: false, showB: true });
        assert.throws(() => app.clickEvent(stale), /not in the CURRENT rendered tree/);

        // NON-VACUITY: once something IS focused, the same call works.
        app.setProps({ showA: true, showB: true });
        app.focus(fixtureNode(app, "a"));
        assert.equal(app.press("ArrowUp").delivered >= 1, true, "with focus, the key is delivered");
      });
    },
  },

  {
    name: "shell/10 the existing direct-invocation driver keeps working for the suites that use it — a button clicked through a bubbling dispatch still runs its OWN handler first, and still settles the tree",
    run: async () => {
      await withTerminalControl(
        { host: HOST_BOARD_DOCK, mount: boardDockMount({ kind: "local-pty", ref: "49/08", command: "/aof:build 49/08" }), origins: ORIGINS },
        (app) => {
          const collapse = app.button("Collapse terminal dock");
          assert.ok(collapse != null);
          const result = app.clickEvent(collapse);
          assert.equal(result.reached[0], collapse, "the button's OWN handler ran first");
          assert.ok(app.button("Expand terminal dock") != null, "…and the tree settled — the control flipped its label");
          assert.equal(app.sockets().length, 1, "…and collapsing opened no second socket, exactly as m46 pins");
        },
      );

      // The m46 socket suite's own `click` call sites are the check, and there are four of them.
      const socketSuite = sourceOf("test/session/terminal-control-opens-its-socket.test.mjs");
      assert.equal((socketSuite.match(/\.click\(/g) ?? []).length, 4, "the shipping suite's four `click` call sites are unchanged in number");
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // 4 · REFS THAT BIND IN THE APP-LEVEL HARNESS — as an OPT-IN, because the alternative is banned.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "shell/11 a surface mounted through `withMountedApp` CAN be given host nodes, and then its refs bind — the guarded effect runs with a node rather than early-returning, and a host element that leaves the tree has its ref set back to `null`",
    run: async () => {
      const observations = [];
      await withTerminalSurface(
        {
          real: true,
          spec: {
            host: HOST_BOARD_DOCK,
            mount: BOUND_DOCK,
            origins: ORIGINS,
            observe: (event) => observations.push(event),
          },
        },
        async (app) => {
          assert.deepEqual(
            observations.map((event) => event.where),
            ["effect-ran"],
            "`ref.current` was a node rather than `null` at the moment the guarded effect ran",
          );
          assert.equal(observations[0].current?.tagName, "DIV", "…and the node is a real host stand-in");
          // The same fact, one level up: the control's OWN ref-guarded session effect ran, which
          // is the guard it opens its WebSocket behind.
          assert.equal(app.sockets().length, 1, "…and the real control constructed exactly one socket through this lane");
          assert.equal(app.paneHosts().length, 1);

          // …and a host element that LEAVES has its ref detached.
          observations.length = 0;
          const toggle = findAll(app.tree(), (node) => node.type === "button" && node.props?.["aria-label"] === "toggle probe")[0];
          toggle.props.onClick({ stopPropagation() {}, preventDefault() {} });
          await app.flush();
          assert.equal(findAll(app.tree(), (node) => node.props?.["data-probe"] === "host").length, 0, "the probe element left the tree");
          assert.deepEqual(
            observations.map((event) => [event.where, event.current]),
            [["effect-early-return", null]],
            "…and its ref was set back to `null`",
          );
        },
      );
    },
  },

  {
    name: "shell/12 a caller that does NOT ask for host nodes gets exactly today's behaviour — a `{ current }` the renderer does not assign, an effect that early-returns, and no socket — and the diff adds no call site that asks on behalf of a suite that did not",
    run: async () => {
      const observations = [];
      await withTerminalSurface(
        {
          real: true,
          hostNodes: false,
          spec: {
            host: HOST_BOARD_DOCK,
            mount: BOUND_DOCK,
            origins: ORIGINS,
            observe: (event) => observations.push(event),
          },
        },
        (app) => {
          assert.deepEqual(
            observations.map((event) => [event.where, event.current]),
            [["effect-early-return", null]],
            "without the opt-in, `useRef` hands back a `{ current }` nothing assigns and the guarded effect early-returns — today's behaviour, exactly",
          );
          assert.equal(app.sockets().length, 0, "…and the real control constructs no socket, which is why this was a blocker");
        },
      );

      // mini-react says why the alternative is banned, in terms: "a default-on factory would hand
      // those surfaces an object where they expect `null` and change what they do, in suites this
      // change has no business touching". So no suite gets it on its behalf.
      //
      // THE DETECTOR HAD TO BE FIXED BEFORE IT COULD SAY ANYTHING. It read `/hostNodes:\s*true/`
      // and NOTHING in the tree matched it — the one place that asks spells it `hostNodes = true`
      // (a destructuring default in this file's own `withTerminalSurface`), so an empty result set
      // was proof of the regex rather than of the tree. It now matches BOTH spellings, it is shown
      // a planted positive, and the expected answer is the one file that legitimately asks rather
      // than the empty list.
      const ASKS_FOR_HOST_NODES = /\bhostNodes\s*[:=]\s*true\b/;
      assert.ok(
        ASKS_FOR_HOST_NODES.test("withMountedApp({ entry, hostNodes: true })") && ASKS_FOR_HOST_NODES.test("const { hostNodes = true } = options;"),
        "the detector fires on BOTH spellings — a planted positive, because an empty result set proves nothing about a regex nothing can match",
      );
      const askers = testTreeFiles()
        .filter((file) => ASKS_FOR_HOST_NODES.test(readFileSync(file, "utf8")))
        .map((file) => path.relative(repoRoot, file).split(path.sep).join("/"));
      assert.deepEqual(
        askers,
        // 127/04's board suite is the second legitimate asker (aof:verify 127): the milestone switcher
        // reads bare `document` and positions its listbox off `getBoundingClientRect`, so opening it
        // headlessly needs a real host node and a rect stamped on it — asked for BY THAT SUITE, per
        // lane, which is exactly the shape this leg admits; no harness asks on its behalf.
        ["test/session/terminal-harness-shell-focus-keyboard.test.mjs", "test/ui/board-backlog-and-archive.test.mjs"],
        `only the suites that legitimately ask for host nodes do so, per lane — no harness asks on a suite's behalf (found: ${askers.join(", ")})`,
      );

      // …and each surface harness's default is read by PARSE rather than by a substring: the
      // option is destructured with `= false`, which is what makes every defaulting caller
      // unaffected.
      for (const harness of ["fleet-app-harness", "board-app-harness", "shell-app-harness"]) {
        const source = stripComments(sourceOf(`test/support/${harness}.mjs`));
        const defaults = [...source.matchAll(/\bhostNodes\s*=\s*(\w+)/g)].map((match) => match[1]);
        assert.ok(defaults.length > 0, `${harness} takes the option at all`);
        assert.deepEqual(
          [...new Set(defaults)],
          ["false"],
          `${harness} defaults host nodes OFF at every entry point, so every suite that mounts through it is unaffected`,
        );
        const terminalDefaults = [...source.matchAll(/\bterminalEnvironment\s*=\s*(\w+)/g)].map((match) => match[1]);
        assert.deepEqual([...new Set(terminalDefaults)], ["false"], `${harness} defaults the terminal environment OFF too`);
      }
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // 5 · THE STUB BECOMES OPT-OUT, AND NOTHING ELSE ABOUT IT MOVES.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "shell/13 a surface lane that opts OUT of the `TerminalControl` module-path stub gets one that OPENS A SOCKET — and the SAME lane without opting out gets no pane host and no socket at all",
    run: async () => {
      // THE TWO HALVES IN ONE LANE ARE THE PROOF, because one half alone is satisfiable by
      // accident: the second half is what the stub does today and the first is what it must be
      // able to do on request. One flag, one surface, one measured difference.
      const spec = { host: HOST_BOARD_DOCK, mount: BOUND_DOCK, origins: ORIGINS, probe: false };

      await withTerminalSurface({ real: true, spec: { ...spec } }, (app) => {
        assert.equal(app.paneHosts().length, 1, "opted OUT of the stub: the real control is in the tree — the pane host `absolute inset-0` is present");
        assert.equal(app.sockets().length, 1, "…and exactly one socket was constructed");
      });

      await withTerminalSurface({ real: false, spec: { ...spec } }, (app) => {
        assert.equal(app.paneHosts().length, 0, "the SAME lane without opting out: no pane host is present");
        assert.equal(app.sockets().length, 0, "…and NO socket was constructed — which is exactly how TECH_DEBT 29 shipped green");
      });
    },
  },

  {
    name: "shell/14 every suite that relies on the stub is unaffected — the three surface harnesses still stub the control BY DEFAULT, by the same module-path filter, and `export const TerminalControl = () => null;` is still what a defaulting caller gets",
    run: () => {
      // The filters exist for a MEASURED reason — the control alone pulls `@xterm/*`, which wants
      // a real DOM. This story makes stubbing opt-OUT; it does not make it optional-by-default,
      // and it removes nothing.
      assert.equal(TERMINAL_CONTROL_STUB, "export const TerminalControl = () => null;\n");
      for (const spelling of ["TerminalControl", "./TerminalControl", "../terminal/TerminalControl"]) {
        assert.ok(TERMINAL_CONTROL_FILTER.test(spelling), `the shared filter still matches \`${spelling}\``);
      }
      for (const harness of ["fleet-app-harness", "board-app-harness", "shell-app-harness"]) {
        const source = sourceOf(`test/support/${harness}.mjs`);
        assert.ok(source.includes("TERMINAL_CONTROL_FILTER"), `${harness} resolves the control through the shared filter`);
        assert.ok(source.includes("TERMINAL_CONTROL_STUB"), `${harness} substitutes the shared stub`);
        assert.match(source, /realTerminalControl = false/, `${harness} defaults to the STUB — the opt-out is a caller's ask`);
      }
    },
  },

  {
    name: "shell/15 `TerminalControl` never enters the stub set of the harness built to prevent exactly that, and no option this task added can be used to substitute it",
    run: async () => {
      // RESTATED HERE AS WELL AS IN TASK 00 BECAUSE THE TWO TASKS OPEN DIFFERENT DOORS INTO THE
      // SAME ROOM, and a socket proof dies quietly the day either one is left open.
      for (const key of Object.keys(CONTROL_STUBS)) assert.ok(!/terminalcontrol/i.test(key));
      for (const entry of CONTROL_RESOLVE) {
        assert.ok(!entry.filter.test("TerminalControl"));
        assert.ok(!entry.filter.test("../terminal/TerminalControl"));
      }
      assert.deepEqual(
        Object.keys(CONTROL_STUBS).sort(),
        ["__icons__", "__react_dom__", "__xterm__", "__xterm_fit__", "__xterm_web_links__"],
        "the substitutions remain exactly the environment a browser would provide",
      );
      // The options THIS task added — a shell handle, a focus model, a key driver, a host-node
      // factory — take no module specifier and no source, so none of them can substitute anything.
      await assert.rejects(
        () => withTerminalControl({ ...oneControl({ host: HOST_BOARD_DOCK, mount: BOUND_DOCK, shell: true }), stubs: {} }, () => {}),
        /a lane supplies an ENTRY, never a stub set/,
      );
      // …and asking for a shell on an entry that cannot reach the bundled bus FAILS rather than
      // quietly declaring nothing.
      await assert.rejects(
        () => withTerminalControl({ ...focusFixture({}), shell: true }, () => {}),
        /needs an entry that re-exports the BUNDLED/,
      );
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // 6 · WHAT THE HARNESS LEAVES BEHIND.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "shell/16 a lane that declared a shell, focused an element, dispatched keys and mounted host nodes leaves NOTHING behind — every installed global is restored, and the following lane sees no document, no declared shell and no attached fullscreen host",
    run: async () => {
      let names = [];
      await withTerminalControl(oneControl({ host: HOST_BOARD_DOCK, mount: BOUND_DOCK, shell: true }), (app) => {
        names = app.installedGlobals();
        const separator = findAll(app.tree(), (node) => node.props?.role === "separator")[0];
        app.focus(separator);
        app.press("ArrowUp");
        app.click(app.button(EXPAND_LABEL));
        assert.equal(app.shell.presents().length, 1, "the lane really did all of it (non-vacuous)");
        assert.notEqual(app.activeElement().tagName, "BODY");
      });

      // The `INSTALLED` list is a straight walk, and its own comment says why: the real runner is
      // a single sequential process, so a leaked global changes what an unrelated suite does, far
      // from the cause.
      assert.deepEqual(
        [...names].sort(),
        ["WebSocket", "__AOF_MINI_REACT__", "__AOF_TERMINALS__", "cancelAnimationFrame", "document", "getComputedStyle", "requestAnimationFrame", "window", "ResizeObserver"].sort(),
        "every global this harness installs is NAMED in the restore list",
      );
      assert.equal(typeof document, "undefined", "a lane running immediately afterwards observes `typeof document === \"undefined\"` again");
      assert.equal(typeof globalThis.window, "undefined");
      assert.equal(typeof globalThis.__AOF_MINI_REACT__, "undefined");
      assert.equal(processShellBus.hasShellHost(), false, "…and nothing declared a shell on the test process's own module");

      // THE FOLLOWING LANE, actually run: no declared shell, no attached fullscreen host, and
      // nothing holding focus.
      await withTerminalControl(oneControl({ host: HOST_BOARD_DOCK, mount: BOUND_DOCK }), (app) => {
        assert.equal(app.shell.hasShellHost(), false, "the following lane sees no declared shell");
        assert.equal(app.button(EXPAND_LABEL), null);
        assert.deepEqual(app.shell.events(), [], "…and no fullscreen host carrying the previous lane's occupant");
        assert.equal(app.activeElement().tagName, "BODY", "…and nothing holds focus");
      });
    },
  },
];
