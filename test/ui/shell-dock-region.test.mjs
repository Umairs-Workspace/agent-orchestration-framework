// Traceability wiring for milestone 46 / story 05, task 00 —
// `stories/05_story_dock-shell-host/tasks/00_the-dock-is-contributed-to-the-overlay-region.feature`
// (@executable).
//
// THE CHANNEL, not a new mechanism. m45 shipped the surface → shell bus two slots wide
// (`SLOT_SURFACE`, `SLOT_NOTICE`) plus the fullscreen door, and Shell.tsx has rendered the
// overlay row since, with a comment naming "m46's dock" as its next occupant. So the dock's HOME
// existed and the bus's SHAPE existed; what did not exist was a slot name for the dock. ADR-009
// adds exactly that and nothing else, and every scenario below is one more entry in an existing
// vocabulary read back as a value.
//
// THE CHANNEL THIS SUITE USES: `ui/src/app/shell-bus.mjs` and `ui/src/app/shell-layout.mjs` under
// plain `node` — no bundler, no DOM, no browser — plus, where a clause is about the rendered TREE
// rather than the model, a fact read off the tree the house's headless mini-React harnesses
// render. Both lanes are `node --test`; no scenario here needs a browser.
//
// NOT ASSERTED HERE (structural, and each owned by a gate): the z rung is IMPORTED rather than
// retyped, and no undeclared rung literal survives in `ui/src` → `acd-shell-z-ladder-single-home`;
// the control contributes and does not import `ui/src/app/Shell` → `acd-shell-bus-single-host`;
// NO per-surface `fixed inset-0` layer exists in `ui/src` → `acd-no-per-surface-fixed-overlay`,
// which this story writes because the prohibition never had one (the QA FLAG in the feature
// header, now closed).
//
// ISOLATION: `AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<file>` — FOCUSED, never the full
// suite (`global-work-propagation.test.mjs` binds :4182, which the live control daemon holds).
import assert from "node:assert/strict";
import {
  REGION_CHROME,
  REGION_CONTENT,
  REGION_OVERLAY,
  ROW_CONTENT,
  ROW_NOTICE_RAIL,
  ROW_ORDER,
  ROW_OVERLAY,
  ROW_SURFACE_BAR,
  ROW_TOP_BAR,
  Z_LADDER,
  chromeModel,
  contentModeFor,
  fullscreenReducer,
  fullscreenState,
  presentedStateModel,
  rungFor,
  shellRows,
  slotPlacement,
} from "../../ui/src/app/shell-layout.mjs";
import {
  SHELL_SLOTS,
  SLOT_DOCK,
  SLOT_NOTICE,
  SLOT_SURFACE,
  attachShellHost,
  contribute,
  contributionFor,
  resetShellBus,
} from "../../ui/src/app/shell-bus.mjs";
import { withBoardApp } from "../support/board-app-harness.mjs";
import { withBoardFace } from "../support/board-face-fixture.mjs";
import { withShellApp, withShellComposedBoard } from "../support/shell-app-harness.mjs";
import { findAll, textOf, visibleTextOf } from "../support/mini-react.mjs";

const addressOf = (pathname) => ({ pathname, search: "", hash: "" });

// A `done` story in the board face's default stream. Its primary action is the ad-hoc `Run agent`
// — the one action that binds a session and opens the dock with NO server round trip, so the lane
// exercises the operator's real path to a dock rather than reaching into React state.
const RUNNABLE_REF = "43/03";

export const shellDockRegionTests = [
  // ======================================================================
  // Scenario Outline: a contribution is keyed by its slot, and the shell places it in the
  // region that slot names — three rows, of which only the dock is new
  // ======================================================================
  {
    name: "shell-dock/00 a contribution is keyed by its SLOT and the shell places it in the region that slot NAMES — the dock is the third entry in an existing vocabulary, and the only one out of flow (00 scenario 1, all three rows)",
    run() {
      const rows = [
        {
          name: "the surface's own controls — a status legend and ⟳ sync",
          slot: SLOT_SURFACE,
          what: "slot-controls",
          region: REGION_CHROME,
          // The slot MOVES: the top bar at 1280, the surface bar at ≤1023. Its contents never
          // change form.
          rowAt1280: ROW_TOP_BAR,
          rowAt1023: ROW_SURFACE_BAR,
          inFlow: true,
          contributesHeight: true,
        },
        {
          name: "the surface's one notice — the board's `serverGone` strip",
          slot: SLOT_NOTICE,
          what: "notice-strip",
          region: REGION_CHROME,
          rowAt1280: ROW_NOTICE_RAIL,
          rowAt1023: ROW_NOTICE_RAIL,
          inFlow: true,
          contributesHeight: true,
        },
        {
          name: "THE DOCK — new in this story",
          slot: SLOT_DOCK,
          what: "terminal-dock",
          region: REGION_OVERLAY,
          rowAt1280: ROW_OVERLAY,
          rowAt1023: ROW_OVERLAY,
          // OUT of flow, contributing ZERO to the height of anything — which is exactly what
          // makes task 01 necessary: a region that costs nothing cannot shrink the content box,
          // so the shrink has to be published as its own number.
          inFlow: false,
          contributesHeight: false,
        },
      ];

      // The slot names are imported CONSTANTS, never strings typed twice — and there are exactly
      // three of them.
      assert.deepEqual([...SHELL_SLOTS], [SLOT_SURFACE, SLOT_NOTICE, SLOT_DOCK]);
      assert.equal(SHELL_SLOTS.length, 3, "three slots; the dock is the third and there is no fourth");

      for (const row of rows) {
        resetShellBus();
        // GIVEN a surface publishes <what> to the <slot> slot…
        const release = contribute(row.slot, row.what);
        // THEN it is readable under <slot> and under NO OTHER slot.
        assert.equal(contributionFor(row.slot), row.what, `${row.name}: readable under its own slot`);
        for (const other of SHELL_SLOTS.filter((slot) => slot !== row.slot)) {
          assert.equal(contributionFor(other), null, `${row.name}: and under no other slot (${other})`);
        }

        // AND the shell places it in the <region> region, whose row is <row>.
        const placement = slotPlacement(row.slot, { viewportWidth: 1280 });
        assert.equal(placement.region, row.region, `${row.name}: region`);
        assert.equal(placement.row, row.rowAt1280, `${row.name}: row at 1280`);
        assert.equal(slotPlacement(row.slot, { viewportWidth: 1023 }).row, row.rowAt1023, `${row.name}: row at 1023`);

        // AND that region is (or is not) in flow.
        assert.equal(placement.inFlow, row.inFlow, `${row.name}: in flow?`);
        assert.equal(placement.contributesHeight, row.contributesHeight, `${row.name}: summed into a height?`);

        // AND withdrawing leaves <slot> holding nothing, and every OTHER slot untouched.
        const others = SHELL_SLOTS.filter((slot) => slot !== row.slot);
        for (const other of others) contribute(other, `${other}-untouched`);
        release();
        assert.equal(contributionFor(row.slot), null, `${row.name}: withdrawn`);
        for (const other of others) {
          assert.equal(contributionFor(other), `${other}-untouched`, `${row.name}: ${other} untouched`);
        }
      }
      resetShellBus();

      // THE OVERLAY IS A SIBLING OF CONTENT, in the model's own row list: R5, after R4, both
      // top-level rows of the same shell rather than one nested in the other.
      assert.deepEqual([...ROW_ORDER], [ROW_NOTICE_RAIL, ROW_TOP_BAR, ROW_SURFACE_BAR, ROW_CONTENT, ROW_OVERLAY]);
      const overlay = shellRows().find((row) => row.row === ROW_OVERLAY);
      assert.equal(overlay.region, REGION_OVERLAY);
      assert.equal(overlay.inFlow, false, "out of flow");
      assert.equal(overlay.height, 0, "…and it contributes ZERO to the height of anything, in every state");
      assert.equal(shellRows().find((row) => row.row === ROW_CONTENT).region, REGION_CONTENT);

      // …and a slot the channel does not carry is REFUSED by name rather than placed somewhere
      // plausible. A fourth place to put something is a GAP, never a layer of its own.
      for (const unknown of ["dock-overlay", "", null, "chrome"]) {
        assert.throws(
          () => slotPlacement(unknown),
          (error) => /unknown shell slot/.test(error.message) && /surface-slot, notice-rail, dock/.test(error.message),
          `a slot named ${JSON.stringify(unknown)} is refused, naming the three the channel carries`,
        );
      }
    },
  },

  // ======================================================================
  // Scenario: each slot holds at most one contribution, a second publish replaces the first,
  // and a STALE release withdraws nothing
  // ======================================================================
  {
    name: "shell-dock/00 each slot holds at most ONE contribution, a second publish replaces the first, and the first publisher's STALE release withdraws nothing and notifies the shell of nothing (00 scenario 2)",
    run() {
      resetShellBus();
      const delivered = [];
      const detach = attachShellHost((slot) => delivered.push(slot));

      // GIVEN a surface has published a dock and holds the release it was handed…
      const releaseFirst = contribute(SLOT_DOCK, "dock-one");
      assert.equal(contributionFor(SLOT_DOCK), "dock-one");
      assert.deepEqual(delivered, [SLOT_DOCK], "the shell was told once");

      // WHEN a second dock is published to the same slot…
      const releaseSecond = contribute(SLOT_DOCK, "dock-two");
      assert.equal(contributionFor(SLOT_DOCK), "dock-two", "the slot holds exactly one contribution and it is the second");
      assert.deepEqual(delivered, [SLOT_DOCK, SLOT_DOCK]);

      // THEN the first publisher's release, fired afterwards, withdraws NOTHING.
      releaseFirst();
      assert.equal(contributionFor(SLOT_DOCK), "dock-two", "the stale release took nothing away");
      assert.equal(delivered.length, 2, "…and notified the shell of nothing");

      // AND firing it twice more changes nothing and notifies nothing.
      releaseFirst();
      releaseFirst();
      assert.equal(contributionFor(SLOT_DOCK), "dock-two");
      assert.equal(delivered.length, 2);

      // AND the second publisher's OWN release still withdraws the second dock.
      releaseSecond();
      assert.equal(contributionFor(SLOT_DOCK), null, "the live handle still works");
      assert.equal(delivered.length, 3);

      // THE SAME SHAPE AS THE FULLSCREEN STALE DISMISSER, for the same reason and against the
      // same accident — a component that has been replaced is still holding a live handle, and it
      // fires on unmount, on a socket close, on a stray click.
      const presentingA = fullscreenReducer(fullscreenState(), { type: "present", occupant: { id: "a" } });
      const presentingB = fullscreenReducer(presentingA, { type: "present", occupant: { id: "b" } });
      const stale = fullscreenReducer(presentingB, { type: "dismiss", id: "a" });
      assert.equal(stale.occupant.id, "b", "a stale dismiss is as harmless as a stale release");
      assert.equal(stale.layoutTick, presentingB.layoutTick);

      detach();
      resetShellBus();
    },
  },

  // ======================================================================
  // Scenario: with NO shell present the same contribution renders IN PLACE, and no harness
  // needs an edit
  // ======================================================================
  {
    name: "shell-dock/00 with NO shell the board renders its DOCK and its slot controls IN PLACE — `board-app-harness.mjs` unmodified — and the SAME component under a shell renders neither in place: each is DELIVERED to the region its slot names (00 scenario 3)",
    async run() {
      // THE DOCK IS OPENED, in both halves, through the operator's own path. The first cut of
      // this scenario asserted the claim over a board whose `dockOpen` was still `false`, so the
      // one contribution this story ADDS was in neither tree and the lane measured the notice
      // rail and the slot controls only — a scenario about three contributions exercising one.
      // `Run agent` is the action that opens a dock with no server round trip.
      //
      // The two clicks are driven off the RENDERED TREE rather than through a harness accessor,
      // because only one of the two mounts has the board's accessors — and this scenario's whole
      // claim is that the SAME component behaves differently only in where its contributions
      // land. `test/support/board-app-harness.mjs` stays unmodified, which is the clause.
      const click = async (app, matches, what) => {
        const node = findAll(app.tree(), (candidate) => candidate.type === "button" && matches(textOf(candidate)))[0] ?? null;
        assert.ok(node, `the board offers ${what}`);
        await node.props.onClick?.({ stopPropagation() {}, preventDefault() {} });
        await app.flush();
      };
      const openTheDock = async (app) => {
        await click(app, (text) => /Mesh artifact authority/.test(text), "the milestone's overview card");
        await click(app, (text) => text.startsWith("✓" + RUNNABLE_REF), `the ${RUNNABLE_REF} lane card`);
        // A `done` story's primary action is the ad-hoc `Run agent`: it binds a session and opens
        // the dock with NO server round trip, which is the operator's own path to a dock.
        await click(app, (text) => /Run agent/i.test(text), "`Run agent` on the selected story");
      };

      await withBoardFace(async (face) => {
        // ── HALF ONE: the board component mounted DIRECTLY, with no shell in the tree. This is
        //    the mount every existing board suite uses, through a harness this story did not
        //    touch.
        await withBoardApp({ url: face.url }, async (app) => {
          const tree = app.tree();
          // The board's own row holds the slot controls…
          assert.ok(findAll(tree, (node) => node.props?.["aria-label"] === "Sync work stream").length > 0, "⟳ sync renders in the board's own body");
          assert.ok(findAll(tree, (node) => textOf(node).includes("status legend")).length > 0, "…and so does the status legend");
          // …and there is no shell in the tree to have delivered them to: no `data-shell-slot`,
          // no `data-shell-row`, nothing published anywhere. The board is honest mounted alone.
          //
          // THE BUS IS READ OFF THE TREE, NEVER OFF THE NODE-SIDE MODULE. Each harness esbuilds
          // its own bundle, so the `shell-bus.mjs` this file imports is a DIFFERENT module
          // instance from the one the mounted app uses — asserting `contributionFor(...) === null`
          // here would pass in every configuration, including a broken one. That is precisely the
          // green-and-vacuous shape this milestone keeps finding.
          assert.deepEqual(
            findAll(app.tree(), (node) => typeof node.props?.["data-shell-slot"] === "string"),
            [],
            "no shell delivered anything, because there is no shell",
          );

          // THE DOCK, OPENED THE WAY AN OPERATOR OPENS IT, and rendered IN PLACE — the board's
          // own last flex child, exactly where it has always rendered. (The control itself is
          // this harness's one stub, for the reason that harness states: it alone pulls
          // `@xterm/*`, which wants a real DOM canvas. What is measured here is WHERE the
          // contribution lands, not what it paints — so the stub's own wrapper is the subject.)
          const wrappers = () => findAll(app.tree(), (node) => node.type === "div" && node.props?.className === "shrink-0").length;
          const before = wrappers();
          await openTheDock(app);
          assert.equal(wrappers(), before + 1, "opening the dock added ITS wrapper — rendered IN PLACE, in the board's own tree");
          assert.deepEqual(
            findAll(app.tree(), (node) => typeof node.props?.["data-shell-slot"] === "string"),
            [],
            "…and STILL nothing was published: a surface mounted alone is honest on its own",
          );
        });

        // ── HALF TWO: the SAME component, inside the REAL shell, in ONE bundle. Each of the
        //    three contributions is DELIVERED — none of them renders in the surface's own body.
        await withShellComposedBoard(
          { url: face.url, routeId: "board", address: addressOf("/board"), identity: "aof", viewportWidth: 1280 },
          async (app) => {
            const body = app.surfaceBody();
            const slot = app.slot();
            assert.ok(slot, "the shell's surface slot exists");
            assert.ok(
              findAll(slot, (node) => node.props?.["aria-label"] === "Sync work stream").length > 0,
              "the board's ⟳ sync arrived in the SHELL's slot",
            );
            // …and it is NOT also in the surface's own body: one control, one home.
            const inBody = body === null ? [] : findAll(body, (node) => node.props?.["aria-label"] === "Sync work stream");
            assert.deepEqual(inBody, [], "…and it does not also render in place");

            // The board's `<main>` is the SHELL's, exactly one of it, and the board's own root is
            // inside it — so a dock rendered in place would be inside `<main>` and a delivered one
            // is not.
            assert.equal(app.mains().length, 1, "one `<main>`, the shell's");

            // ── AND THE DOCK, THE ONE CONTRIBUTION THIS STORY ADDS, through the same operator
            //    path. This is the half the first cut never reached: `dockOpen` starts false, so
            //    a lane that only mounted the board proved the claim about a dock that was not
            //    there.
            assert.equal(app.dock(), null, "no dock yet — the board opens one on demand, and reserves no band for it");
            await openTheDock(app);

            const dock = app.dock();
            assert.ok(dock, "the board's dock arrived in the SHELL's overlay row, through the third slot");
            assert.equal(dock.props["data-shell-region"], REGION_OVERLAY);
            assert.ok(
              findAll(app.row("overlay"), (node) => node === dock).length === 1,
              "…inside the overlay row itself, which is where `slotPlacement` says the dock slot lands",
            );
            // …and NOT in the board's own body. The two mounts are the same component: honest
            // mounted alone, honest hosted, and never told which it is by a prop.
            const bodyNow = app.surfaceBody();
            assert.deepEqual(
              bodyNow === null ? [] : findAll(bodyNow, (node) => node === dock),
              [],
              "the dock does not ALSO render in place — it is delivered instead",
            );
          },
        );
      });
    },
  },

  // ======================================================================
  // Scenario Outline: the dock takes its rung from the ladder BY NAME, and a rung the ladder
  // does not name cannot be asked for
  // ======================================================================
  {
    name: "shell-dock/00 the dock takes its rung from the LADDER by name (dock → 30), and a rung the ladder does not name is REFUSED rather than answered with a number (00 scenario 4, all eight rows)",
    run() {
      const answered = [
        ["dock", 30, "reserved for this control since m45, and taken by name here for the first time"],
        ["fullscreen", 50, "the top rung, and its occupant is its only occupant"],
        ["toast", 40, ""],
        ["stickyChrome", 10, ""],
        ["popover", 20, ""],
      ];
      for (const [name, z, why] of answered) {
        assert.equal(rungFor(name), z, `${name} → ${z} ${why}`);
        assert.equal(Z_LADDER[name], z, "…and the ladder itself says so");
      }

      // THE REFUSALS. Never a number — "an element that needs a rung this list does not name is a
      // GAP whose fix is to add the rung to ui/src/app/shell-layout.mjs FIRST, with a stated
      // meaning", so the failure this closes is a story inventing `z-35` at 2am to get a dock
      // above a legend.
      const refusals = [
        ["content", /FLOOR/, "the ladder's floor is the ABSENCE of a rung (z auto) and is never asked for"],
        ["dockOverlay", /CLOSED/, "a rung invented under pressure"],
        ["", /CLOSED/, "an empty name — a rung is a name on the list or it is nothing"],
      ];
      for (const [name, needle, why] of refusals) {
        assert.throws(
          () => rungFor(name),
          (error) => {
            assert.match(error.message, needle, why);
            // It names the ladder's own five names AND the module that owns them.
            for (const declared of ["stickyChrome", "popover", "dock", "toast", "fullscreen"]) {
              assert.ok(error.message.includes(declared), `the refusal names ${declared}`);
            }
            assert.ok(error.message.includes("ui/src/app/shell-layout.mjs"), "…and the module to add a rung to");
            return true;
          },
          `${JSON.stringify(name)} is refused`,
        );
      }

      // AND THE DOCK'S PLACEMENT TAKES IT FROM THE LADDER rather than carrying a number of its
      // own: the placement's `z` IS `rungFor("dock")`.
      assert.equal(slotPlacement(SLOT_DOCK).rung, "dock");
      assert.equal(slotPlacement(SLOT_DOCK).z, rungFor("dock"));
      // …and the two slots that need no rung declare none, rather than defaulting to one.
      assert.equal(slotPlacement(SLOT_SURFACE).z, null);
      assert.equal(slotPlacement(SLOT_NOTICE).z, null);
    },
  },

  // ======================================================================
  // Scenario: the surface that hosts the dock declares `content:fixed`, and hosting a dock
  // changes the published chrome height by nothing
  // ======================================================================
  {
    name: "shell-dock/00 the dock's host declares `content:fixed`, its descendants own scroll, its region declares `min-height: 0` — and the published chrome height and the budget verdict are IDENTICAL whether a dock is contributed or not (00 scenario 5)",
    run() {
      // THE DOCK'S HOST is the board. (The fleet's mode is NOT re-decided here: the card peek is
      // 46/04's host and the route table keeps `fleet` on `content:page`.)
      const board = contentModeFor("board");
      assert.equal(board.mode, "content:fixed");
      assert.equal(board.hostsDock, true, "…and it is the mode a dock may cover");
      assert.equal(board.scrollOwner, "descendants", "its DESCENDANTS own scroll");
      assert.equal(board.regionOwnsScroll, false, "the content region is never itself the scroll owner");
      assert.equal(board.minHeight, 0, "`min-height: 0` — what stops an overflowing child silently growing the parent");
      assert.match(board.contentClass, /min-h-0/);
      assert.equal(contentModeFor("fleet").mode, "content:page", "the fleet's mode is untouched by this story");

      // THE PUBLISHED CHROME HEIGHT IS IDENTICAL, in every dock state, at every viewport this
      // milestone documents — because the overlay row contributes zero to the height of anything.
      const viewports = [
        { viewportHeight: 800, viewportWidth: 1280, surfaceBar: false },
        { viewportHeight: 520, viewportWidth: 760, surfaceBar: true },
        { viewportHeight: 520, viewportWidth: 768, surfaceBar: true, notice: { height: 33 } },
        { viewportHeight: 844, viewportWidth: 390, surfaceBar: true },
      ];
      const dockStates = [null, { height: 48 }, { height: 216 }, { height: 280 }, { height: 376 }, { height: 33 }];
      for (const viewport of viewports) {
        const withoutDock = chromeModel(viewport);
        for (const dock of dockStates) {
          const withDock = chromeModel({ ...viewport, dock });
          assert.equal(withDock.height, withoutDock.height, `chrome height unchanged by dock ${JSON.stringify(dock)}`);
          assert.equal(withDock.value, withoutDock.value);
          // AND the budget verdict is identical too: opening a dock can never move the shell into
          // or out of a chrome breach.
          assert.equal(withDock.verdict, withoutDock.verdict, `budget verdict unchanged by dock ${JSON.stringify(dock)}`);
          assert.equal(withDock.contentHeight, withoutDock.contentHeight, "…and so is the content REGION's own height");
        }
      }
      // The breach row really is a breach, so the clause above is not quietly comparing two
      // `within` verdicts at every viewport.
      assert.equal(chromeModel(viewports[2]).verdict, "breach");
      assert.equal(chromeModel({ ...viewports[2], dock: { height: 199 } }).verdict, "breach");
    },
  },

  // ======================================================================
  // Scenario: the dock and the fullscreen occupant share the overlay region without fighting
  // over it — the collision Shell.tsx:349-358 warns about, IN ADVANCE AND IN TERMS
  // ======================================================================
  {
    name: "shell-dock/00 the dock and the fullscreen occupant share the OVERLAY region: the adoption host holds no React-rendered children at any point, the dock survives present AND dismiss, and the occupant covers it rather than racing it (00 scenario 6)",
    async run() {
      // The rungs, first, as values: the occupant is ABOVE the dock, so it covers it.
      assert.equal(rungFor("dock"), 30);
      assert.equal(rungFor("fullscreen"), 50);
      assert.ok(rungFor("fullscreen") > rungFor("dock"), "the occupant covers the dock rather than racing it");
      assert.equal(slotPlacement(SLOT_DOCK).region, REGION_OVERLAY, "…and both live in the same region");
      assert.equal(presentedStateModel(fullscreenReducer(fullscreenState(), { type: "present", occupant: { id: "a" } })).rung, "fullscreen");

      await withShellApp(
        {
          routeId: "board",
          address: addressOf("/board"),
          identity: "aof",
          viewportWidth: 1280,
          surface: "contributing",
          slotLabels: ["⟳ sync"],
          dockText: "terminal dock",
          dockInset: 280,
        },
        async (app) => {
          const dockNodes = () => findAll(app.tree(), (node) => node.props?.["data-stub-dock"] != null);
          assert.equal(dockNodes().length, 1, "GIVEN a dock is contributed to the overlay region");
          assert.ok(app.dock(), "…and the shell put it in the overlay row's dock slot");

          // ── THE PUBLISHED INSET, READ OFF THE RENDERED ROOT (DG-46-1's headline, and it was
          //    asserted by NOTHING until QA measured it: deleting BOTH `DOCK_INSET_PROPERTY`
          //    writes from Shell.tsx left all 42 tests green while the content region stopped
          //    shrinking and the operator's action strip went back under the dock). Every other
          //    Then in this story reads `chromeModel(...)` directly — the MODEL — and the model
          //    being right is not the same fact as the shell publishing it.
          assert.equal(app.dockInset(), "280px", "the shell PUBLISHES the dock inset on its root, where a surface's `calc()` reads it");
          assert.equal(app.chromeHeight(), "48px", "…beside the chrome height, and independent of it");

          // …and the DOCK'S LANDING PLACE is the model's answer, not a second answer typed into
          // the JSX: the wrapper the shell renders declares the region `slotPlacement` names, and
          // it sits inside the OVERLAY row rather than beside it.
          assert.equal(app.dock().props["data-shell-region"], REGION_OVERLAY);
          const overlayRow = app.row("overlay");
          assert.ok(overlayRow, "the overlay row is rendered");
          assert.ok(
            findAll(overlayRow, (node) => node === app.dock()).length === 1,
            "the dock is INSIDE the overlay row — a model that said `overlay` while the JSX put the dock in the chrome row would leave every model assertion green",
          );
          assert.equal(app.fullscreenHost(), null, "nothing is presented yet, so there is no adoption host");

          // WHEN an occupant is then presented fullscreen…
          const node = { id: "the-live-node" };
          const adopted = [];
          const home = { appendChild: (child) => adopted.push(child) };
          const dismissals = [];
          await app.present({
            id: "session-a",
            label: "46/05 dock",
            node,
            home,
            // The terminal declares this; a `null` node + fake home is the shell half under test.
            ownsChrome: true,
            // S1 — the SHELL is what calls this. The control cannot see `Escape` or the shell's
            // own exit control, so a shell that never called `onDismiss` would leave the caller
            // rendering into a node already sent home, silently.
            onDismiss: () => dismissals.push("told"),
          });

          // THEN the adoption host holds NO React-rendered children — the adopted node and
          // React's own children never share a parent. React reconciles by POSITION, so an
          // imperative `appendChild` into a parent React also renders into gets the occupant
          // inserted after the dock, re-parented under it, or removed by a reconciliation that
          // believes it owns the slot. THIS STORY IS THE MOMENT Shell.tsx warned about: until
          // now there was no second child to prove it with.
          const host = app.fullscreenHost();
          assert.ok(host, "the overlay carries its dedicated adoption host");
          assert.deepEqual(host.children, [], "…and React renders NOTHING into it");
          assert.notEqual(host, app.dock(), "…it is not the dock, either");

          // AND the dock is still contributed after the present — presenting withdraws nothing.
          // Read off the TREE the mounted shell rendered, not off this file's own copy of the bus
          // module: the harness bundles its own, so a node-side `contributionFor` would answer
          // about a store the app never touched.
          assert.equal(dockNodes().length, 1, "the dock is still there, under the occupant");
          assert.ok(app.dock(), "…still in the overlay row's dock slot");
          // AND the shell's chrome is hidden while the occupant is presented.
          assert.equal(app.row("top-bar"), null, "the chrome is HIDDEN, not overlaid");

          // S2 — AN OCCUPANT THAT OWNS ITS CHROME GETS NO SHELL HEADER, and this is asserted off
          // the RENDERED TREE rather than off the model boolean that drives it. It is the clause
          // with the least margin for error in the whole story: for an INTERACTIVE terminal
          // `Escape` is CLAIMED, so the occupant's own exit control is the ONLY door — and if the
          // shell also painted its header the operator would get a light-theme bar above a dark
          // terminal, which is the residual chrome DESIGN forbids by name.
          assert.equal(
            visibleTextOf(app.fullscreen()).trim(),
            "",
            "an `ownsChrome` occupant gets NO shell header — the occupant paints its own, with the exit at the same `ml-auto` anchor",
          );
          assert.deepEqual(
            findAll(app.fullscreen(), (node) => node.type === "button"),
            [],
            "…and therefore no second exit control: `renderedBy` says WHO paints it, never whether",
          );
          await app.dismissFullscreen("session-a");

          // AND still contributed after the dismiss, with the chrome back.
          assert.equal(dockNodes().length, 1, "…and it survives the dismiss");
          assert.ok(app.dock());
          assert.ok(app.row("top-bar"), "the chrome comes back");
          assert.deepEqual(adopted, [node], "…and the occupant went home, exactly once, as the same object");
          // S1 — and the occupant was TOLD, exactly once, by the shell.
          assert.deepEqual(dismissals, ["told"], "the shell tells the occupant it was dismissed — the caller cannot see `Escape` or the shell's own exit control");
          assert.equal(app.dockInset(), "280px", "…and the published inset is untouched throughout: the dock never stopped being contributed");
        },
      );
    },
  },
];
