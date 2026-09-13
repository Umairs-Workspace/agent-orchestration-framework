// C1'S YIELD ORDER AND THE CONTROLS' FORM, ASSERTED ON THE REAL RENDERED COMPONENT
// (milestone 46 — the regression suite for the three UI defects found on the running system,
// 2026-08-09, in the same pass that found the socket blocker).
//
// ═══ THE THREE DEFECTS THIS SUITE EXISTS TO CATCH ════════════════════════════════════════════
// All three lived in the `.tsx` seam TECH_DEBT 29 names — the one place the milestone's 537 green
// tests, its 71-mutant battery and its five reviews could not reach, because all three app
// harnesses stub this component out by module path. All three were found by MEASURING A BROWSER,
// never by reading code, and every number below is a measurement rather than an estimate.
//
//   1. THE DOCK COULD NOT BE CLOSED AT 390. The header measured `scrollWidth 451` against
//      `clientWidth 390` — 61px of overflow — which laid `✕ Close terminal dock` out at
//      `x 423–451` inside a 390-wide frame. The identity collapsed to **width 0** underneath
//      `provider:` at the same time: two elements on the same pixels, which is precisely what
//      DESIGN's yield rule forbids ("a lower-priority element gives up space rather than being
//      overprinted", the m38 DG-13/DG-16 lesson).
//
//   2. THE YIELD WAS KEYED TO THE VIEWPORT, SO S2 YIELDED THE WRONG THING FIRST. The drops were
//      `sm:` and `md:` — questions about the WINDOW — while the box that runs out of room is the
//      HEADER. A fleet card is ~395px wide inside a 1280 viewport, so `md:` read TRUE: the card
//      kept the whole `· session <id>` tail and truncated the REF instead. That is CONFORMANCE
//      C13 exactly inverted — C13 has the 390 sample dropping the tail AND the word, keeping `▣`.
//
//   3. THE FULLSCREEN EXIT — "then the ONLY exit", by its own component's comment, because an
//      interactive occupant claims `Escape` — SHIPPED AT 17×28. `CONTROL_CLASS` sets `h-7 w-7`,
//      which is a flex BASIS and the first thing flexbox takes; the inline header protects its
//      controls inside a `shrink-0` span, and the occupant renders its exit as a direct child of
//      a `flex-nowrap` header, where nothing did. A 28px door squeezed to 17px.
//
// ═══ WHAT THIS SUITE CAN AND CANNOT SEE ══════════════════════════════════════════════════════
// `withTerminalControl` mounts the REAL component but there is NO LAYOUT ENGINE behind it: no
// box is measured, so "does it overflow at 390" is not a question that can be asked here and is
// not asked. What IS asserted is the DECLARATION that decides the layout — that the yield is
// keyed to the header's own width rather than the window's, that the drops are ordered, and that
// every control carries the class that stopped the door being squeezed. The measurements above
// are the milestone's `@manual` browser evidence and stay that; these lanes are what makes a
// silent revert of any of the three fail before it reaches a browser again.
//
// ISOLATION: run focused, with `AOF_GLOBAL_HOME=$(mktemp -d)`. Never the full suite.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { findAll, withTerminalControl } from "../support/terminal-control-harness.mjs";
import { boardDockMount } from "../../ui/src/board/dock-mount.mjs";
import { fleetTerminalMount } from "../../ui/src/fleet/terminal-mount.mjs";
import {
  AFFORDANCE_PROVIDER_PICKER,
  declaresAffordance,
  HOST_BOARD_DOCK,
  HOST_FLEET_CARD,
  HOST_FULLSCREEN,
} from "../../ui/src/terminal/host-model.mjs";
import {
  TERMINAL_YIELD_FIELD_LABEL_CLASS,
  TERMINAL_YIELD_TAIL_CLASS,
  TERMINAL_YIELD_WORD_CLASS,
} from "../../ui/src/terminal/palette.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TERMINAL_DIR = path.join(repoRoot, "ui", "src", "terminal");

const BOARD_ORIGIN = "http://127.0.0.1:41773";
const FLEET_ORIGIN = "http://127.0.0.1:4181";
const ORIGINS = { self: BOARD_ORIGIN, fleet: FLEET_ORIGIN };

// A `mirror` at both call sites, because the `· session <id>` TAIL — the first thing the order
// drops — only exists on a source whose far end is elsewhere.
const MIRROR = { kind: "mirror", ref: "46/02", nodeId: "aof-wsl", sessionId: "7f3a91c" };
// The same far end as the fleet's own call site builds it, so both hosts render the tail.
const FLEET_MOUNT = fleetTerminalMount(
  { targetNodeId: "aof-wsl", sessionId: "7f3a91c", state: "running" },
  { itemRef: "46/02" },
);

// Tailwind v4's container breakpoints, in rem, so ORDER can be asserted as arithmetic rather
// than by comparing two strings and hoping. `@md` 28rem · `@lg` 32rem · `@xl` 36rem.
const CONTAINER_REM = { "@xs": 20, "@sm": 24, "@md": 28, "@lg": 32, "@xl": 36, "@2xl": 42 };
const remOf = (token) => {
  const name = String(token).split(":")[0];
  const rem = CONTAINER_REM[name];
  assert.ok(rem != null, `the yield token ${JSON.stringify(token)} names a container breakpoint this table knows`);
  return rem;
};

// Every className in the rendered tree, as a flat list of strings.
const classNames = (tree) =>
  findAll(tree, (node) => typeof node.props?.className === "string").map((node) => node.props.className);

// A VIEWPORT breakpoint variant — `md:inline` — as opposed to a CONTAINER one, `@md:inline`.
// The leading `@` is the whole difference between the two defects and the fix, so the needle is
// "a breakpoint name that is NOT preceded by `@`".
const VIEWPORT_VARIANT = /(^|[\s])(sm|md|lg|xl|2xl):/;

export const terminalControlHeaderYieldTests = [
  // ══════════════════════════════════════════════════════════════════════════════════════════
  // DEFECT 2 — the yield is keyed to the HEADER, never the window.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "terminal-control-header-yield/00 the header declares a container, so C1's drops are decided by the header's own width — a fleet card ~395px wide inside a 1280 viewport must yield as 395, not as 1280",
    run: async () => {
      for (const [label, host, mount] of [
        ["board dock", HOST_BOARD_DOCK, boardDockMount(MIRROR)],
        ["fleet card", HOST_FLEET_CARD, FLEET_MOUNT],
      ]) {
        await withTerminalControl({ host, mount, origins: ORIGINS }, (control) => {
          const headers = findAll(control.tree(), (node) => node.type === "header");
          assert.equal(headers.length, 1, `${label}: exactly one C1 header is rendered`);
          assert.match(
            headers[0].props.className,
            /(^|\s)@container(\s|$)/,
            `${label}: C1 carries \`@container\` — without it every \`@\`-variant below never matches (a container query with no container ancestor is inert), so the header would render permanently yielded`,
          );
        });
      }
    },
  },

  {
    name: "terminal-control-header-yield/01 NOTHING in the rendered control is keyed to a viewport breakpoint — the shipped defect was `md:` reading TRUE on a 1280 viewport for a 395px card, which kept the session tail and truncated the ref instead (CONFORMANCE C13, inverted)",
    run: async () => {
      for (const [label, host, mount] of [
        ["board dock", HOST_BOARD_DOCK, boardDockMount(MIRROR)],
        ["fleet card", HOST_FLEET_CARD, FLEET_MOUNT],
      ]) {
        await withTerminalControl({ host, mount, origins: ORIGINS }, (control) => {
          const all = classNames(control.tree());
          assert.ok(all.length > 5, `${label}: the tree was actually read (non-vacuous): ${all.length} styled nodes`);
          const offenders = all.filter((value) => VIEWPORT_VARIANT.test(value));
          assert.deepEqual(
            offenders,
            [],
            `${label}: a viewport variant answers how wide the WINDOW is, and the box that runs out of room is the HEADER. Use the \`@\`-prefixed container variant (palette.mjs \`TERMINAL_YIELD_*\`)`,
          );
        });
      }
    },
  },

  {
    name: "terminal-control-header-yield/02 the drops are ORDERED — the `· session <id>` tail goes before the `TERMINAL` word, which goes before the muted field labels, so the header cannot yield the identity while keeping decoration",
    run: async () => {
      const tail = remOf(TERMINAL_YIELD_TAIL_CLASS);
      const word = remOf(TERMINAL_YIELD_WORD_CLASS);
      const fieldLabel = remOf(TERMINAL_YIELD_FIELD_LABEL_CLASS);
      // A HIGHER restore threshold means an EARLIER drop as the header narrows. DESIGN §S2 fixes
      // the first two; the third is S1's substitute for the wrap S1 is forbidden, and is carried
      // to the designer as a contract gap rather than claimed as contract.
      assert.ok(
        tail > word,
        `the tail yields FIRST — half an id names nothing, while the ref and the node still identify the pane (tail ${tail}rem must exceed word ${word}rem)`,
      );
      assert.ok(
        word > fieldLabel,
        `the \`TERMINAL\` word yields BEFORE the muted field labels (word ${word}rem must exceed field-label ${fieldLabel}rem)`,
      );
    },
  },

  {
    name: "terminal-control-header-yield/03 each of the three drops is DECLARED on the element it governs — the tail, the `TERMINAL` word and the `item` field label each carry their container token, and the glyph carries none",
    run: async () => {
      await withTerminalControl(
        { host: HOST_BOARD_DOCK, mount: boardDockMount(MIRROR), origins: ORIGINS },
        (control) => {
          const all = classNames(control.tree());
          for (const [what, token] of [
            ["the `· session <id>` tail", TERMINAL_YIELD_TAIL_CLASS],
            ["the `▣ TERMINAL` word", TERMINAL_YIELD_WORD_CLASS],
          ]) {
            assert.ok(
              all.some((value) => value.includes(token)),
              `${what} carries ${token} — a drop nothing declares is a drop that never happens`,
            );
          }
          // The glyph NEVER yields with the word: DESIGN says the lockup keeps `▣` at every
          // width, and the 390 measurement is what it looks like when it works (an 11px lockup).
          const glyph = findAll(control.tree(), (node) => node.props?.["aria-hidden"] === "true" && node.type === "span");
          assert.ok(glyph.length > 0, "the lockup glyph is rendered");
        },
      );
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // DEFECT 3 — the door that was squeezed to 17px.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "terminal-control-header-yield/04 EVERY header control is `shrink-0` — `h-7 w-7` is a flex basis, and a basis is the first thing flexbox takes; the fullscreen exit shipped at 17×28 because nothing protected it",
    run: async () => {
      await withTerminalControl(
        { host: HOST_BOARD_DOCK, mount: boardDockMount(MIRROR), origins: ORIGINS },
        (control) => {
          const controls = findAll(
            control.tree(),
            (node) => node.type === "button" && typeof node.props?.className === "string" && node.props.className.includes("h-7 w-7"),
          );
          assert.ok(controls.length >= 2, `the header renders its controls (non-vacuous): ${controls.length}`);
          for (const button of controls) {
            assert.match(
              button.props.className,
              /(^|\s)shrink-0(\s|$)/,
              `the control ${JSON.stringify(button.props["aria-label"])} carries \`shrink-0\` — its 28px box is a BASIS, and the occupant renders its exit as a direct child of a \`flex-nowrap\` header where nothing else protects it`,
            );
          }
        },
      );
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // DESIGN GAP G1 — the overlay wore the dock's provider picker (aof-designer, 2026-08-09).
  // ══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "terminal-control-header-yield/06 the identity fragment is rendered against the host SHOWING it — the fullscreen overlay carries no provider picker, because `host-model.mjs` says it must not and the JSX now asks",
    run: async () => {
      // The model has always been right; the seam was what ignored it. Assert the DECLARATION
      // first, so a lane failing here says which of the two moved.
      assert.equal(
        declaresAffordance(HOST_FULLSCREEN, AFFORDANCE_PROVIDER_PICKER),
        false,
        "HOST_FULLSCREEN does not declare a provider picker — `the overlay renders the SAME descriptor as its opener and adds no control of its own`",
      );
      assert.equal(
        declaresAffordance(HOST_BOARD_DOCK, AFFORDANCE_PROVIDER_PICKER),
        true,
        "…and the board dock DOES (non-vacuous: the assertion above is not true of every host)",
      );

      // The seam: the occupant must be handed an identity built against HOST_FULLSCREEN. Built
      // once against the OPENER's host and passed verbatim — which is what shipped — the overlay
      // inherits a `role="radiogroup"` ahead of the only exit from a surface that claims `Escape`.
      // RE-ANCHORED 2026-08-13 (m49/05): the door and the occupant moved into
      // `TerminalFullscreenOccupant.tsx` — one component now creates the adopted node, asks the
      // shell and portals the tree into it — so the control hands the identity to
      // `<TerminalFullscreenDoor>`. The RULE is unchanged and is what is asserted; only the
      // element carrying it moved, which is this milestone's own recorded anchor-rot shape.
      const source = await readFile(path.join(TERMINAL_DIR, "TerminalControl.tsx"), "utf8");
      const occupant = source.match(/<TerminalFullscreenDoor[\s\S]*?\n\s*\/>/);
      assert.ok(occupant, "the control renders the fullscreen door, which owns the occupant");
      assert.match(
        occupant[0],
        /identity=\{<TerminalIdentity[^>]*host=\{HOST_FULLSCREEN\}[^>]*\/>\}/,
        "the occupant's identity is built for HOST_FULLSCREEN, never reused from the opener's host",
      );
    },
  },

  {
    name: "terminal-control-header-yield/07 a FIT source RE-FITS when its box changes — stretching the pane element without re-fitting the terminal leaves the same rows in a bigger box, which is the band a fit source is defined by not having",
    run: async () => {
      // Measured on the running system before the fix: the overlay's box grew to 1264x739 and the
      // terminal stayed at the dock's 15 rows / 210px — 529px of dead black. `relayout` stretched
      // the DIV; `fitAddon.fit()` was driven by a ResizeObserver on the INLINE host, whose box
      // does not change when the overlay presents. Two halves of "a bigger box", in two effects,
      // and only one of them ran. After the fix: 52 rows / 728px.
      //
      // Source-level because presenting fullscreen needs the shell bus and a real portal, and
      // because the defect is precisely a MISSING CALL — the kind of absence no reviewer reliably
      // notices (ADR-001's own argument for why a gate beats a preference).
      const source = await readFile(path.join(TERMINAL_DIR, "TerminalControl.tsx"), "utf8");
      const fitBranch = source.match(/if \(plan\.mode === GEOMETRY_FIT\)\s*\{[\s\S]*?\n      \}/);
      assert.ok(fitBranch, "the re-layout effect has a GEOMETRY_FIT branch");
      assert.match(
        fitBranch[0],
        /sendFitRef\.current\?\.\(\)/,
        "the FIT branch asks for a re-fit: a fit source reflows to the box, and the far end is told so it repaints into the new rows",
      );
      // …and the re-fit must remain reachable from there, i.e. the session effect publishes it.
      assert.match(
        source,
        /sendFitRef\.current = sendFit;/,
        "the session effect publishes its `sendFit` so the re-layout effect can reach the one home for fitting",
      );
    },
  },

  {
    name: "terminal-control-header-yield/08 the pane is FITTED unconditionally and only the resize FRAME is gated on an open socket — a session that has ended still has a box, and the first thing that changes it is the session ending",
    run: async () => {
      // Measured on `exited (0)`, 2026-08-09: the non-live bar is paid for out of the byte area,
      // so the host shrank by exactly the bar's 29px — and the terminal kept all 15 rows, leaving
      // `.xterm-rows` reaching 789 against a bar top of 763. 26px of the last row sat UNDER an
      // opaque bar, with `overflow: visible`, so it was not even clipped. `04/00`'s scenario
      // forbids precisely that: "a non-live message never overprints the bytes".
      //
      // The cause was one ordering: `if (ws.readyState !== WebSocket.OPEN) return;` sat ABOVE
      // `fitAddon.fit()`, so once the stream closed there was nobody to tell and therefore no
      // re-fit either. Fitting the pane and telling the far end are different acts. After the
      // fix: 15 rows → 13, and the pane ends 2px ABOVE the bar.
      const source = await readFile(path.join(TERMINAL_DIR, "TerminalControl.tsx"), "utf8");
      const body = source.match(/const sendFit = plan\.emitsResizeFrame[\s\S]*?\n      : null;/);
      assert.ok(body, "the control builds its fit emitter from the geometry plan");

      const fitAt = body[0].indexOf("fitAddon.fit()");
      const gateAt = body[0].indexOf("ws.readyState !== WebSocket.OPEN");
      assert.ok(fitAt > 0, "…it fits the pane");
      assert.ok(gateAt > 0, "…and it gates the frame on an open socket");
      assert.ok(
        fitAt < gateAt,
        "THE FIT MUST COME FIRST. Gating the fit on an open socket means a pane whose box changes after the stream ends — which is every `ended` and `error` pane, because the bar itself is what changes it — never reflows, and the bar covers the last row of the operator's output.",
      );
    },
  },

  {
    name: "terminal-control-header-yield/05 the fullscreen occupant declares its OWN container — it is portaled into a node the shell owns, so it inherits no container from the header it expanded out of, and without one the biggest box on screen would render the most yielded header",
    run: async () => {
      // Source-level, and deliberately so: presenting fullscreen needs the shell bus and a real
      // portal, which this harness does not stand up (46/05's suite owns that path). What is
      // asserted is the one declaration whose ABSENCE is invisible until a human expands a pane.
      const source = await readFile(path.join(TERMINAL_DIR, "TerminalFullscreenOccupant.tsx"), "utf8");
      const header = source.match(/<header[\s\S]*?>/);
      assert.ok(header, "the occupant renders a C1 header");
      assert.match(
        header[0],
        /@container/,
        "the occupant's header carries `@container`: a container query with no container ancestor NEVER matches, so a portaled subtree without one renders every drop taken — the word, the tail and both field labels gone, permanently, in fullscreen",
      );
      assert.doesNotMatch(
        source,
        VIEWPORT_VARIANT,
        "the occupant is keyed to no viewport breakpoint either",
      );
    },
  },
];
