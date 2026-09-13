// Mount the REAL production <Fleet/> component tree headlessly against a REAL
// running fleet face (milestone 38 / story 04 / task 06).
//
// THE POINT, and the mechanism, now live in ./react-app-harness.mjs — the
// surface-agnostic core (bundle the real .tsx, substitute only what React itself
// would provide, instrument every request, run a controllable clock). Extracted
// there for milestone 43 / story 04 (ADR-010 R4.5), which needs the same
// instrument for the BOARD; this file keeps exactly what is fleet-specific:
//
//   - the ENTRY (ui/src/fleet/Fleet.tsx) and its one net-new stub (the terminal
//     view, which wants xterm + a real DOM canvas — story 06 owns its lanes, and
//     rendering nothing here is exactly what the production component does for an
//     assignment with no live session);
//   - the ACCESSORS: how a lane addresses a fleet card, its region-6 affordance
//     row and the DG-13 geometry facts.
//
// The driver's shape is unchanged from the pre-extraction harness — every
// existing caller (fleet-assign-acknowledgment, fleet-assign-affordance,
// fleet-assign-row-geometry, mesh-ui-assign-item-workspace) sees the same
// { flush, clock, tree, cards(), affordance(ref), statusLoads(), … } it did.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withMountedApp, findAll, textOf, FRAGMENT } from "./react-app-harness.mjs";
import { TERMINAL_CONTROL_FILTER, TERMINAL_CONTROL_STUB, XTERM_RESOLVE, XTERM_STUBS } from "./terminal-dom.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FLEET_TSX = path.join(repoRoot, "ui", "src", "fleet", "Fleet.tsx");

// The ONE terminal control (m46/04, re-pointed off the deleted `terminal-view/FleetTerminalView`)
// wants xterm + a real DOM canvas; it is not what these lanes are about and it has its own
// suites. Rendering nothing here is exactly what the production control does for an assignment
// with no live session.
const FLEET_STUBS = { __terminal_control__: TERMINAL_CONTROL_STUB };
const FLEET_RESOLVE = [{ filter: TERMINAL_CONTROL_FILTER, to: "__terminal_control__" }];

// THE STUB IS OPT-OUT (m49/08), AND IT REMAINS THE DEFAULT. Its reason is measured and unchanged,
// so every caller that does not ask keeps getting `export const TerminalControl = () => null;`
// and every existing lane's expectations stand. A lane that asks for the REAL one gets the
// control bundled with its real siblings and the BROWSER environment substituted instead — the
// only way a surface-level lane can assert that a rendered pane opens a socket, which is the fact
// TECH_DEBT 29 is about. `lucide-react` stays REAL here: the fleet subtree imports icons the
// control's six-name stub does not carry, and substituting it would fail the bundle for a reason
// nothing to do with the terminal.
//
// ASKING FOR THE REAL CONTROL ALONE PROVES NOTHING: without `hostNodes` its `inlineRef` is never
// assigned and its session effect early-returns, and without `terminalEnvironment` there is no
// `WebSocket` to record. All three, or the lane is measuring the harness.
function fleetSubstitutions(realTerminalControl) {
  return realTerminalControl
    ? { stubs: { ...XTERM_STUBS }, resolve: [...XTERM_RESOLVE] }
    : { stubs: FLEET_STUBS, resolve: FLEET_RESOLVE };
}

// withFleetApp({ url, search, settle, holdFromStart }, fn) — mounts the REAL
// <Fleet/> against the REAL fleet face listening at `url`, and yields a driver:
//   { flush, clock, tree, cards(), card(ref), statusLoads(), navigations(), unmount }
//
// `settle` / `holdFromStart` are the CORE harness's own options, plumbed through
// unchanged (m47/01 build prerequisite). Without them a fleet mounted ALONE could
// never be read in its LOADING state — `withMountedApp` defaults to `settle:
// "flush"`, which waits for the first `/api/mesh/status` to land, and on a
// loopback fixture `settle: "render"` alone loses that race every time. m47/01
// task 01 scenario 2's loading row is a state the DESIGN states table asserts, so
// it has to be reachable rather than raced for:
//   withFleetApp({ url, settle: "render", holdFromStart: "/api/mesh/status" }, …)
export async function withFleetApp({ url, search = "?mode=fleet", pathname, settle, holdFromStart, realTerminalControl = false, hostNodes = false, terminalEnvironment = false }, fn) {
  return withMountedApp(
    {
      entry: FLEET_TSX,
      exportName: "Fleet",
      ...fleetSubstitutions(realTerminalControl),
      hostNodes,
      terminalEnvironment,
      url,
      search,
      // `pathname` (m47/03) — the path half of the opened address. It only matters to a lane
      // that reads back what the surface WROTE: the fleet composes its write as
      // `location.pathname + <search>`, so `/fleet` here is what makes an asserted address
      // read the way the feature writes it. Absent ⇒ the core's "/" default, unchanged.
      ...(pathname === undefined ? {} : { pathname }),
      ...(settle === undefined ? {} : { settle }),
      ...(holdFromStart === undefined ? {} : { holdFromStart }),
      accessors: (driver) => fleetAccessors(driver),
    },
    fn,
  );
}

// ── addressing the drill-in, state-invariantly (m47/04, F-47-04-QA-3) ────────
//
// The two geometry facts DG-47-5 cannot touch, because ADR-008 forbids relaxing
// either and the contract pins both in all three states: the drill-in span carries
// `shrink-1000` (it absorbs essentially all the row's pressure) and an EXPLICIT
// min-width floor sized to its pinned arrow (never `min-w-0`, which let the arrow
// escape the card's content box — DG-15/DG-19).
//
// `\bshrink-1000\b` does NOT match the chip tail's `shrink-1000000`: the `0` after
// `1000` is a word character, so there is no boundary there. That is the one
// collision on this row, and it is closed by the regex rather than by hoping.
const DRILLIN_SHRINK = /\bshrink-1000\b/;
const DRILLIN_FLOOR = /\bmin-w-\d/;

function isDrillInLabel(node) {
  if (!node || node.type !== "span") return false;
  const className = typeof node.props?.className === "string" ? node.props.className : "";
  return DRILLIN_SHRINK.test(className) && DRILLIN_FLOOR.test(className);
}

// …and the CONTROL is the button that contains it. A card's drill-in button is the
// only interactive ancestor the span ever has (m38/ADR-012: the card is a plain
// <div> and a <button> may not nest another interactive element).
function isDrillInControl(node) {
  return Boolean(node) && node.type === "button" && findAll(node, isDrillInLabel).length > 0;
}

function fleetAccessors(driver) {
  return {
    statusLoads: () => driver.requestsMatching("/api/mesh/status").length,
    assignPosts: () => driver.requestsMatching("/api/mesh/assign").length,
    // Every work-item card on screen, in render order — a card being the root
    // <div> that carries the card's own class marker AND a picker. On a GLOBAL
    // face these come from MANY workspaces, which is the whole point of F21:
    // two cards can carry the same ref.
    cards() {
      return findAll(
        driver.tree(),
        (node) =>
          node.type === "div"
          && typeof node.props?.className === "string"
          && node.props.className.includes("rounded-[10px]")
          && findAll(node, (inner) => inner.type === "select" && String(inner.props?.["aria-label"] ?? "").startsWith("Assign ")).length > 0,
      );
    },
    // ── the board drill-in (m47/01, ADR-006a) ────────────────────────────────
    //
    // The fleet's ONE way into a board. It is a CONTROL, not an anchor — its
    // destination is minted at click time by `GET /api/mesh/board-url`, so there
    // is no href to read and the only way to address it is the way an operator
    // does: the button that opens a board, and inside it the yield-order span
    // that carries the words.
    //
    // RE-BASED 2026-08-11 by m47/04, and the re-basing is FINDING F-47-04-QA-3
    // rather than a tidy-up. Both accessors used to address the element by a
    // property DG-47-5 REMOVES, so a CONFORMING build turned 47/01's shipped,
    // green lanes red — and red in the direction of a FALSE GREEN, since
    // `.label` degraded to `""` in exactly the state those lanes assert
    // `"Open failed"` on:
    //   (a) the label span was found by `className.includes("group-hover:
    //       underline")`, and clause 3 DROPS that class in the failed state;
    //   (b) the button was found by `title.startsWith("Open board for ")`, and
    //       clause 5 REWRITES that title in the failed state to the remedy
    //       sentence (`Could not open a board for … run aof work ui …`).
    // Nothing any lane ASSERTS moved; only how the two elements are found.
    //
    // THE NEW IDENTITIES SURVIVE EVERY CLAUSE OF DG-47-5, and DESIGN names them
    // as design facts rather than as test code: the span is the element carrying
    // `shrink-1000` AND its explicit min-width floor — ADR-008 forbids relaxing
    // either, and the contract pins both in all three states — and the control is
    // THE BUTTON THAT CONTAINS THAT SPAN. Deliberately not the tone, the words,
    // the pinned glyph or either `title`: DG-47-5 varies all of them by state,
    // which is the whole reason this file had to change.
    //
    // (`fleet-assign-row-geometry.test.mjs`'s own `region5()` needed no edit: it
    // finds the span by the span's `title`, which clause 5 leaves state-varying
    // and unchanged. The re-basing is concentrated in this one file.)
    drillIns() {
      return findAll(driver.tree(), isDrillInControl);
    },
    // drillInIn(card) — the drill-in of ONE card, with the label an operator
    // READS (region 5's yield-order span: "Open board →" / "Opening board..." /
    // "Open failed") and the two ways to fire it.
    drillInIn(card) {
      const button = card && isDrillInControl(card) ? card : findAll(card, isDrillInControl)[0];
      if (!button) return null;
      // The yield-order span (DG-13 clause 5), which is where the label lives.
      const label = findAll(button, isDrillInLabel)[0] ?? null;
      return {
        button,
        label: label ? textOf(label).replace(/\s+/g, " ").trim() : "",
        href: button.props?.href,
        async click() {
          await button.props?.onClick?.({ stopPropagation() {}, preventDefault() {} });
          await driver.flush();
        },
        // clickDetached() — fire the REAL click WITHOUT awaiting it, so a lane can
        // read the tree mid-flight (pair with holdNext + renderOnly) and settle after.
        clickDetached() {
          const pending = button.props?.onClick?.({ stopPropagation() {}, preventDefault() {} });
          return {
            async settle({ ignoreHeld = false } = {}) {
              await pending;
              await driver.flush({ ignoreHeld });
            },
          };
        },
      };
    },
    // drillInByTitle(title) — the drill-in of the card an operator can read by name.
    drillInByTitle(title) {
      const matches = driver.cards().filter((card) => textOf(card).includes(title));
      if (matches.length === 0) return null;
      if (matches.length > 1) throw new Error(`more than one card matches the title ${JSON.stringify(title)}`);
      return driver.drillInIn(matches[0]);
    },
    // cardByTitle(title) — the way the OPERATOR addresses a card: by the
    // milestone title they can read. This is how the soak's click is
    // reproduced, since ref alone is ambiguous across workspaces.
    cardByTitle(title) {
      const matches = driver.cards().filter((card) => textOf(card).includes(title));
      if (matches.length === 0) return null;
      if (matches.length > 1) throw new Error(`more than one card matches the title ${JSON.stringify(title)}`);
      return driver.affordanceIn(matches[0]);
    },
    // The affordance row for a card, addressed the way the operator does:
    // through the <select>'s accessible name ("Assign <ref> to a worker node").
    affordance(ref) {
      const tree = driver.tree();
      const selects = findAll(tree, (node) => node.type === "select" && node.props?.["aria-label"] === `Assign ${ref} to a worker node`);
      if (selects.length === 0) return null;
      if (selects.length > 1) throw new Error(`more than one affordance renders for ref ${ref} — address the card by title instead`);
      return driver.affordanceIn(selects[0]);
    },
    // affordanceIn(node) — the region-6 facts for a card (or for the picker
    // itself). Region 6 is the row that DIRECTLY contains the picker; the
    // action and the message slot are its siblings there. Addressed
    // structurally (never by index), so a layout change fails loudly.
    affordanceIn(node) {
      const tree = driver.tree();
      const select = node.type === "select"
        ? node
        : findAll(node, (inner) => inner.type === "select" && String(inner.props?.["aria-label"] ?? "").startsWith("Assign "))[0];
      if (!select) return null;
      const card = findAll(
        tree,
        (candidate) =>
          candidate.type === "div"
          && typeof candidate.props?.className === "string"
          && candidate.props.className.includes("rounded-[10px]")
          && findAll(candidate, (inner) => inner === select).length > 0,
      )[0] ?? null;
      const row = findAll(tree, (candidate) => (candidate.children ?? []).includes(select))[0] ?? null;
      const action = (row?.children ?? []).find((child) => child && child.type === "button") ?? null;
      const message = (row?.children ?? []).find((child) => child && child.type === "span" && typeof child.props?.className === "string" && child.props.className.includes("text-destructive")) ?? null;
      const optionNodes = findAll(select, (child) => child.type === "option");
      const options = optionNodes.map((child) => child.props?.value ?? "");
      // DG-13 — the row's GEOMETRY, read off the RENDERED props/classNames
      // (the house idiom: a class/structure fact, asserted where the component
      // actually emits it). The action's width lives on its inner sizing
      // shell; the picker's floor on the <select> itself; the message slot's
      // full text on its native `title`.
      const actionSizer = action ? findAll(action, (child) => child.type === "span")[0] ?? null : null;
      // The one honest placeholder an EMPTY roster renders ("No worker nodes
      // yet") — a single valueless option. Exposed so the empty-roster row of
      // the States table can be read off the RENDERED tree, not only derived
      // from the reducer.
      const placeholder = optionNodes.length === 1 && (optionNodes[0].props?.value ?? "") === "" ? optionNodes[0] : null;
      return {
        select,
        action,
        // The WHOLE card node (all six regions) — so a region-5 assertion is
        // made against the SAME rendered tree as region 6's affordance.
        card,
        row,
        // The WHOLE card (all six regions) — so region 5's m35 `assigned` chip
        // is read from the SAME rendered tree as region 6's affordance, never
        // from the payload.
        cardText: card ? textOf(card) : "",
        options,
        pickerPlaceholder: placeholder ? textOf(placeholder) : null,
        selectedNode: select.props?.value ?? "",
        selectDisabled: select.props?.disabled === true,
        selectClassName: select.props?.className ?? "",
        selectStyle: select.props?.style ?? null,
        actionLabel: textOf(action),
        actionDisabled: action?.props?.disabled === true,
        actionClassName: action?.props?.className ?? "",
        actionSizerClassName: actionSizer?.props?.className ?? "",
        actionSizerStyle: actionSizer?.props?.style ?? null,
        // The row's own direct children, by kind — DG-13 clause 1's "a label
        // swap may not move another element" is only meaningful if the row's
        // membership is itself constant.
        rowChildTypes: (row?.children ?? []).filter(Boolean).map((child) => (typeof child === "object" ? child.type : "#text")),
        message: message ? textOf(message) : null,
        messageClassName: message?.props?.className ?? "",
        messageTitle: message?.props?.title ?? null,
        async choose(nodeId) {
          select.props?.onChange?.({ target: { value: nodeId } });
          await driver.flush();
        },
        async click() {
          const event = { stopPropagation() {}, preventDefault() {} };
          await action?.props?.onClick?.(event);
          await driver.flush();
        },
        // clickDetached() — fire the REAL click WITHOUT awaiting it, so the
        // caller can read the tree mid-flight (pair with holdNext + renderOnly)
        // and settle afterwards.
        clickDetached() {
          const event = { stopPropagation() {}, preventDefault() {} };
          const pending = action?.props?.onClick?.(event);
          return {
            async settle() {
              await pending;
              await driver.flush();
            },
          };
        },
      };
    },
  };
}

// Re-exported so a lane can query REGIONS the affordance driver does not model
// (region 5's footer / attention cluster — DG-13 clause 5) off the same tree.
export { FRAGMENT, findAll, textOf };
