// Mount the REAL production app shell headlessly (milestone 45 / story 03).
//
// The mechanism is the shared core (./react-app-harness.mjs): the real, unmodified
// `ui/src/app/Shell.tsx` esbuild-bundled with its real siblings (shell-layout.mjs,
// shell-nav.mjs, shell-bus.mjs, SurfaceSlot.tsx and the route table), a minimal
// React, and a controllable clock. (`Landing.tsx` was on that list until m49/04 DELETED it: `/`
// is a routed surface now, so the shell renders no landing of its own to bundle.) NOTHING about
// the shell is stubbed — the only stand-in is
// the mounted SURFACE, which is the harness's own (see shell-harness-entry.tsx), because the
// four production surfaces have their own harnesses and their own suites.
//
// WHY A HARNESS AT ALL, when story 45/03's models are pure. Because three of DESIGN's clauses
// are about the DOCUMENT and not about a model: exactly one `banner` and one `<main>` survive
// the absorption of the surfaces' own bars, the skip link is the FIRST focusable element, and
// the surface's contributions really do land in the shell's bar rather than in the surface's
// own body. Each of those is a fact about the rendered tree, and the model cannot see any of
// them.
//
// The shell fetches exactly two things — the origin identity probe and, since 2026-09-12, the
// nav's fleet-origin probe (DG-45-5's producer, ShellNav.tsx). A lane that does not care passes
// `identity` and the first never runs; for the second, `withShellApp` supplies `resolvable: {}`
// unless the lane OWNS the key (`resolvable: undefined` hands the real probe back), because the
// shell-alone mount points at a port nobody listens on and sixty lanes predate the probe. The
// COMPOSED mounts below default nothing: they stand against a REAL face, and what that face
// answers to the probe is exactly what a composed lane is for.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withMountedApp, findAll, textOf, visibleTextOf, FRAGMENT } from "./react-app-harness.mjs";
import { TERMINAL_CONTROL_FILTER, TERMINAL_CONTROL_STUB, XTERM_RESOLVE, XTERM_STUBS } from "./terminal-dom.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SHELL_ENTRY = path.join(repoRoot, "test", "support", "shell-harness-entry.tsx");
const SHELL_FLEET_ENTRY = path.join(repoRoot, "test", "support", "shell-fleet-entry.tsx");
const SHELL_BOARD_ENTRY = path.join(repoRoot, "test", "support", "shell-board-entry.tsx");
const SHELL_HOME_ENTRY = path.join(repoRoot, "test", "support", "shell-home-entry.tsx");

// The fleet's ONE stubbed leaf, copied from test/support/fleet-app-harness.mjs verbatim: the ONE
// terminal control (m46/04, re-pointed off the deleted `terminal-view/FleetTerminalView`) wants
// xterm and a real DOM canvas, it has its own suites, and rendering nothing is exactly what the
// production control does for an assignment with no live session. Nothing else about either the
// fleet or the shell is stubbed.
const FLEET_STUBS = { __terminal_control__: TERMINAL_CONTROL_STUB };
const FLEET_RESOLVE = [{ filter: TERMINAL_CONTROL_FILTER, to: "__terminal_control__" }];

// THE STUB IS OPT-OUT (m49/08) AND REMAINS THE DEFAULT — the whole account is on
// fleet-app-harness.mjs. Both composed surfaces get the same door, because a composed lane is
// exactly where "the pane the shell is hosting really opens a socket" would be asked.
function composedSubstitutions(realTerminalControl, stubs, resolve, extraStubs = {}, extraResolve = []) {
  return realTerminalControl
    ? { stubs: { ...extraStubs, ...XTERM_STUBS }, resolve: [...extraResolve, ...XTERM_RESOLVE] }
    : { stubs, resolve };
}

// withShellApp(props, fn) — mount the REAL <Shell/> with `props`, and yield a driver whose
// accessors address the shell's regions the way DESIGN names them.
//
//   routeId / address        — what the entry resolved (the shell never re-derives them).
//   surface                  — "none" | "plain" | "contributing" (see shell-harness-entry.tsx).
//   slotLabels / noticeText   — what a CONTRIBUTING surface puts in the slot and the rail.
//   viewportWidth / identity / noticeHeight
//                            — the three seams; supplied, the shell measures nothing and probes
//                              nothing. `noticeHeight` stands in for the rail's MEASURED height:
//                              a mini-React tree has no layout, so without it the one coupling
//                              m46's dock binds to (rail stands → the published chrome height
//                              grows → the budget verdict changes) was assertable on the pure
//                              model only, never through the component that publishes it.
export async function withShellApp(props, fn) {
  const { search = "", hash = "", ...shellProps } = props ?? {};
  globalThis.__AOF_SHELL_PROPS__ = Object.hasOwn(shellProps, "resolvable") ? shellProps : { ...shellProps, resolvable: {} };
  // The shell bus is MODULE state inside the bundle. The bundle is cached per entry, so a
  // second mount in the same process reuses it — and a contribution left behind by the
  // previous mount would leak into the next lane's bar. The bundle exposes its own reset
  // through the entry, and `withMountedApp`'s unmount runs every effect cleanup (which is what
  // withdraws a contribution), so the reset here is belt AND braces.
  try {
    return await withMountedApp(
      {
        entry: SHELL_ENTRY,
        exportName: "ShellHarness",
        // Nothing on this surface talks to a server except the identity probe, and every lane
        // supplies `identity`. The origin is still real so a stray request would be visible in
        // `requests()` rather than silently swallowed.
        url: "http://127.0.0.1:9",
        search,
        hash,
        accessors: (driver) => shellAccessors(driver),
      },
      fn,
    );
  } finally {
    delete globalThis.__AOF_SHELL_PROPS__;
  }
}

// withShellComposedFleet({ url, search, settle, ...shellProps }, fn) — the REAL `<Fleet/>`
// inside the REAL `<Shell/>`, in ONE bundle, against the REAL fleet face listening at `url`.
//
// This is the join neither of the other two harnesses can see (see shell-fleet-entry.tsx). Its
// accessors are the shell's — a lane asks where a control ENDED UP, which is the whole
// question — plus `surfaceBody`, which is now the fleet's own tree rather than a stub's.
//
// `settle: "render"` mounts WITHOUT waiting for the fleet's first request to land, which is
// the only way to read the LOADING page state. The scope control is contributed outside the
// fleet's loading/error/empty/populated ternary precisely so it is present in all four, and
// that clause is only checkable from the state where it would be missing.
export async function withShellComposedFleet(options, fn) {
  const { url, search = "", hash = "", pathname, settle = "flush", holdFromStart = null, realTerminalControl = false, hostNodes = false, terminalEnvironment = false, ...shellProps } = options ?? {};
  globalThis.__AOF_SHELL_PROPS__ = shellProps;
  try {
    return await withMountedApp(
      {
        entry: SHELL_FLEET_ENTRY,
        exportName: "ShellFleetHarness",
        ...composedSubstitutions(realTerminalControl, FLEET_STUBS, FLEET_RESOLVE),
        hostNodes,
        terminalEnvironment,
        url,
        search,
        hash,
        // m47/03 — the path half of the opened address, for a lane that reads back what the
        // composed surface WROTE. Absent ⇒ the core's "/" default, unchanged.
        ...(pathname === undefined ? {} : { pathname }),
        settle,
        holdFromStart,
        accessors: (driver) => shellAccessors(driver),
      },
      fn,
    );
  } finally {
    delete globalThis.__AOF_SHELL_PROPS__;
  }
}

// withShellComposedBoard({ url, ...shellProps }, fn) — the REAL `<Board/>` inside the REAL
// `<Shell/>`, in ONE bundle, against the REAL board face listening at `url` (m46/05).
//
// The board's own harness (test/support/board-app-harness.mjs) mounts the component ALONE and
// must stay unmodified — that is m46/ADR-009's degraded-path clause, and it is what keeps every
// existing board suite's expectations. This is the other half of the same claim: the SAME
// component, hosted, renders none of its three contributions in place.
//
// The board's two stubs are its own harness's, copied for the same two reasons stated there: the
// terminal control alone pulls `@xterm/*` ×3 (a real DOM canvas), and `lucide-react` is ~1,500
// SVG modules whose used icons are listed BY NAME so an unlisted one fails loudly.
const BOARD_ICONS = ["Send", "X", "ChevronDown", "ChevronUp", "RotateCw", "Maximize2", "Minimize2"]
  .map((name) => `export const ${name} = () => null;`)
  .join("\n") + "\n";
const BOARD_STUBS = {
  __terminal_control__: TERMINAL_CONTROL_STUB,
  __icons__: BOARD_ICONS,
};
const BOARD_RESOLVE = [
  { filter: TERMINAL_CONTROL_FILTER, to: "__terminal_control__" },
  { filter: /^lucide-react$/, to: "__icons__" },
];

export async function withShellComposedBoard(options, fn) {
  const { url, search = "", hash = "", settle = "flush", realTerminalControl = false, hostNodes = false, terminalEnvironment = false, ...shellProps } = options ?? {};
  globalThis.__AOF_SHELL_PROPS__ = shellProps;
  try {
    return await withMountedApp(
      {
        entry: SHELL_BOARD_ENTRY,
        exportName: "ShellBoardHarness",
        ...composedSubstitutions(realTerminalControl, BOARD_STUBS, BOARD_RESOLVE, { __icons__: BOARD_ICONS }, [{ filter: /^lucide-react$/, to: "__icons__" }]),
        hostNodes,
        terminalEnvironment,
        url,
        search,
        hash,
        settle,
        accessors: (driver) => shellAccessors(driver),
      },
      fn,
    );
  } finally {
    delete globalThis.__AOF_SHELL_PROPS__;
  }
}

// withShellComposedHome({ url, settle, ...shellProps }, fn) — the REAL `<Home/>` inside the REAL
// `<Shell/>`, in ONE bundle, against a REAL fixture face listening at `url` (m49/04).
//
// The third composition, and the FIRST one whose surface is mounted at `/`. Two things only this
// configuration can see: the home's G0 summary really leaving the page's body and arriving in
// the shell's slot (the bus is module state — see shell-home-entry.tsx), and `/` really being
// inside `SurfaceBoundary` rather than drawn by the shell itself.
//
// `settle: "render"` mounts WITHOUT waiting for the first `/api/mesh/status` to land, which is
// the only way to read the home's own LOADING state; on a loopback fixture that race is lost
// every time without `holdFromStart` too, exactly as the fleet's harness records.
//
// ~~NOTHING IS STUBBED. The home imports no terminal control in this story (it renders no rows).~~
// SUPERSEDED 2026-08-13 by story 49/05: the home's populated arm now mounts `SessionGrid` →
// `SessionPane` → the REAL `TerminalControl`, so this composition reaches the one leaf that pulls
// `@xterm/*` ×3 and `lucide-react`. It stubs the control BY MODULE PATH, exactly as the fleet's
// and the board's compositions do and for the same reason — and `realTerminalControl: true` opts
// back out, which is the door `withTerminalControl` uses to prove a socket is really opened.
// THE STUB IS NOT A PLACE TO ASSERT A SOCKET FROM: a stubbed control renders, resolves, composes
// and connects to NOTHING (TECH_DEBT 29). Story 05's own suite mounts the real one.
const HOME_ICONS = ["X", "ChevronDown", "ChevronUp", "RotateCw", "Maximize2", "Minimize2"]
  .map((name) => `export const ${name} = () => null;`)
  .join("\n") + "\n";
const HOME_STUBS = { __terminal_control__: TERMINAL_CONTROL_STUB, __icons__: HOME_ICONS };
const HOME_RESOLVE = [
  { filter: TERMINAL_CONTROL_FILTER, to: "__terminal_control__" },
  { filter: /^lucide-react$/, to: "__icons__" },
];

export async function withShellComposedHome(options, fn) {
  const { url, search = "", hash = "", pathname = "/", settle = "flush", holdFromStart = null, realTerminalControl = false, ...shellProps } = options ?? {};
  globalThis.__AOF_SHELL_PROPS__ = shellProps;
  try {
    return await withMountedApp(
      {
        entry: SHELL_HOME_ENTRY,
        exportName: "ShellHomeHarness",
        ...composedSubstitutions(realTerminalControl, HOME_STUBS, HOME_RESOLVE, { __icons__: HOME_ICONS }, [{ filter: /^lucide-react$/, to: "__icons__" }]),
        url,
        search,
        hash,
        pathname,
        settle,
        holdFromStart,
        accessors: (driver) => ({ ...shellAccessors(driver), ...homeAccessors(driver) }),
      },
      fn,
    );
  } finally {
    delete globalThis.__AOF_SHELL_PROPS__;
  }
}

// How a lane addresses the HOME's own regions. Every one of them is read off the RENDERED tree
// rather than off a source file: the page's states are a fact about what the operator is looking
// at, and `test/ui/in-app-cross-links.test.mjs` set the precedent for reading an href out of
// production render output for exactly this reason (a link composed at runtime from a variable
// satisfies a source-text gate and can still be wrong).
export function homeAccessors(driver) {
  const tree = () => driver.tree();
  const stateNodes = () => findAll(tree(), (node) => typeof node.props?.["data-home-state"] === "string");
  return {
    // The state treatments ON SCREEN, by name. DESIGN §S1 G3: exactly one, never two, never a
    // state plus a partial grid — so a lane asserts the LIST and not merely "mine is present".
    homeStates: () => stateNodes().map((node) => node.props["data-home-state"]),
    homeState: () => stateNodes()[0] ?? null,
    // The page's own heading nodes, so "exactly one `<h1>`" is a count rather than a lookup.
    headings: (level = "h1") => findAll(tree(), (node) => node.type === level),
    // The G0 contribution, wherever the shell put it at this width.
    homeSummary: () => findAll(tree(), (node) => node.props?.["data-home-slot"] === "summary")[0] ?? null,
    // Every anchor inside the page's own state treatment — never the shell's nav.
    homeExits: () => {
      const state = stateNodes()[0] ?? null;
      return state === null ? [] : findAll(state, (node) => node.props?.["data-home-exit"] !== undefined);
    },
    // The failed state's one control, fired the way an operator fires it.
    async retry() {
      const button = findAll(tree(), (node) => node.type === "button" && textOf(node).includes("Retry"))[0] ?? null;
      if (button === null) throw new Error("no retry control is on screen");
      await button.props?.onClick?.({ stopPropagation() {}, preventDefault() {} });
      await driver.flush();
    },
    statusLoads: () => driver.requestsMatching("/api/mesh/status").length,
  };
}

function shellAccessors(driver) {
  const tree = () => driver.tree();
  const byRow = (row) => findAll(tree(), (node) => node.props?.["data-shell-row"] === row);

  return {
    // R1–R5, addressed by the row names shell-layout.mjs declares.
    row: (name) => byRow(name)[0] ?? null,
    rows: () => ["notice-rail", "top-bar", "surface-bar", "content", "overlay"].filter((row) => byRow(row).length > 0),

    // The two landmarks DESIGN §Accessibility 6 caps at one each.
    banners: () => findAll(tree(), (node) => node.type === "header" || node.props?.role === "banner"),
    mains: () => findAll(tree(), (node) => node.type === "main" || node.props?.role === "main"),

    // The skip link — the first focusable element in the document.
    focusables: () =>
      findAll(
        tree(),
        (node) =>
          (node.type === "a" && typeof node.props?.href === "string")
          || node.type === "button"
          || node.type === "select"
          || node.props?.tabIndex === 0,
      ),

    navItems: () => findAll(tree(), (node) => typeof node.props?.["data-nav-item"] === "string"),
    navItem: (id) => findAll(tree(), (node) => node.props?.["data-nav-item"] === id)[0] ?? null,
    nav: () => findAll(tree(), (node) => node.type === "nav")[0] ?? null,

    // The surface slot, wherever it lives at this width — the slot MOVES, its contents never
    // change form, so a lane addresses it by role rather than by row.
    slot: () => findAll(tree(), (node) => typeof node.props?.["data-shell-slot"] === "string")[0] ?? null,
    slotHome: () => findAll(tree(), (node) => typeof node.props?.["data-shell-slot"] === "string")[0]?.props?.["data-shell-slot"] ?? null,
    slotLabels: () => {
      const slot = findAll(tree(), (node) => typeof node.props?.["data-shell-slot"] === "string")[0] ?? null;
      return slot === null ? [] : findAll(slot, (node) => node.type === "button").map((node) => node.props?.["aria-label"] ?? textOf(node));
    },

    notice: () => findAll(tree(), (node) => node.props?.role === "alert")[0] ?? null,

    // The published chrome height and the budget verdict, read off the root exactly as an
    // outsider (or m46's dock) would.
    chromeHeight: () => findAll(tree(), (node) => typeof node.props?.["data-shell-chrome-height"] === "string")[0]?.props?.["data-shell-chrome-height"] ?? null,
    budgetVerdict: () => findAll(tree(), (node) => typeof node.props?.["data-shell-budget"] === "string")[0]?.props?.["data-shell-budget"] ?? null,

    // The published dock inset, read off the root exactly as the board's own `calc()` reads it.
    dockInset: () => findAll(tree(), (node) => typeof node.props?.["data-shell-dock-inset"] === "string")[0]?.props?.["data-shell-dock-inset"] ?? null,
    // The dock's landing place in the overlay region (m46/ADR-009's third slot).
    dock: () => findAll(tree(), (node) => node.props?.["data-shell-slot"] === "dock")[0] ?? null,

    fullscreen: () => findAll(tree(), (node) => typeof node.props?.["data-shell-fullscreen"] === "string")[0] ?? null,
    // The childless host the adopted node is re-parented INTO — a different element from the
    // overlay, which also carries the exit header (and, from m46, the dock).
    fullscreenHost: () => findAll(tree(), (node) => typeof node.props?.["data-shell-fullscreen-host"] === "string")[0] ?? null,
    surfaceBody: () => findAll(tree(), (node) => typeof node.props?.["data-stub-surface"] === "string")[0] ?? null,

    // Any node carrying an accessible name, by that name — the way an operator addresses a
    // control, and how a lane finds the fleet's scope control wherever the shell put it.
    byLabel: (label) => findAll(tree(), (node) => node.props?.["aria-label"] === label)[0] ?? null,
    // The accessible names inside the surface slot, whatever element carries them (the fleet's
    // scope control is a `role="group"`, not a button — `slotLabels` above sees buttons only).
    slotControls: () => {
      const slot = findAll(tree(), (node) => typeof node.props?.["data-shell-slot"] === "string")[0] ?? null;
      if (slot === null) return [];
      const labelled = findAll(slot, (node) => typeof node.props?.["aria-label"] === "string");
      // A control nested inside another labelled control is that control's part, not a second
      // contribution (the scope control's two buttons live inside its group).
      return labelled
        .filter((node) => !labelled.some((other) => other !== node && findAll(other, (inner) => inner === node).length > 0))
        .map((node) => node.props["aria-label"]);
    },

    // The fullscreen door, reached through the REAL shell bus the mounted shell is listening on
    // (see shell-harness-entry.tsx). A lane presents and dismisses the way m46's terminal will.
    async present(request) {
      globalThis.__AOF_SHELL_BUS__.requestFullscreen(request);
      await driver.flush();
    },
    async dismissFullscreen(id) {
      globalThis.__AOF_SHELL_BUS__.dismissFullscreen(id);
      await driver.flush();
    },
  };
}

export { FRAGMENT, findAll, textOf, visibleTextOf };
