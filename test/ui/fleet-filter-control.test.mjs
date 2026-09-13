// Traceability wiring for milestone 47 / story 03 / task 01 —
// `stories/03_story_filtered-fleet-surface/tasks/01_filter-control-and-chip.feature` (@executable).
// Every @executable Scenario and every Scenario-Outline ROW is covered here.
//
// ADR-007 + DESIGN §Surface 1: the repo picker is contributed into the SHELL'S SURFACE SLOT
// beside the scope control and is mounted in EVERY page state; it reads `All repos` at rest; its
// options are the payload's own workspaces and nothing else; and the "filtered by" chip lives in
// the PAGE (R0), above the state ternary, carrying the first of the filter's two clear doors.
//
// TWO HARNESSES, AND THE CHOICE IS NOT COSMETIC:
//   - `withShellComposedFleet` — the REAL `<Fleet/>` inside the REAL `<Shell/>`, in ONE bundle.
//     This is the ONLY channel that can answer "where did the control END UP", because the shell
//     bus is module state and a fleet mounted alone renders its contribution IN PLACE.
//     `slotControls()` returns the accessible names inside the slot, in render order.
//   - `withFleetApp` — the fleet alone, for the page body (the banner, the empty card, the
//     regions), where no shell is needed.
// There is no vitest and no testing-library in this repo; there is no third channel.
//
// THE SHELL-COMPOSED MOUNT NEVER SETTLES VIA `flush()` and that is a property of the INSTRUMENT
// rather than a workaround: mini-react re-invokes every function component on every pass, the
// fleet's inline `onRefresh` arrow is a new function each time, its `SurfaceSlot` deps therefore
// differ, the contribution re-publishes and the two spin. Lanes settle by bounded `renderOnly()`
// passes, exactly as `test/ui/shell-regions.test.mjs` already does. **This milestone adds a FOURTH
// contribution to that slot, and every value it hands the slot is referentially STABLE** —
// `repo` is a primitive, the picker's view object is `useMemo`'d on three primitives, the
// options array is the payload's own (or one module-level empty constant) and the handler is a
// `[]`-dep `useCallback` — so the existing spin is not made worse. That is asserted below rather
// than asserted about, by the fact that these lanes settle in a bounded number of passes.
//
// WHAT THE HARNESS CANNOT SEE, and where each of those went. mini-react builds a TREE, not a
// DOM: no layout, no computed style, no media query, no focus, no measurement. So every pixel
// claim is `@uat` and is NOT smuggled in here — the 18ch truncation and the reserved-width
// arithmetic, the disclosure-vs-segment shape, the single filled teal block, the dashed
// treatment, the popover's rung/width/height, DG-47-4's two drops at ≤390, `Esc` and arrow-key
// movement, and the ≥24×24 hit target. What IS headlessly visible and is therefore asserted:
// presence, position in the slot's ordered contribution list, the option SET and its order,
// accessible names, `title` text, `aria-*` values, the rendered words, the request count, and
// what the page renders after a click.
//
// ONE PIXEL FACT IS ASSERTED, and only because DESIGN asks for it in a form a tree CAN carry:
// the trigger's reserved width is "stated ONCE, as a literal the CSS scanner can see, and the
// arithmetic is asserted rather than claimed" — m45's GAP-4 shipped a comment that disagreed
// with its own class. The constant is read from the module and its arithmetic is checked here.
//
// FEASIBILITY 3's OPEN CONTRADICTION IS HONOURED AS WRITTEN, not resolved: DESIGN requires the
// trigger DISABLED on an empty roster and ENABLED in the error state, and a FIRST-LOAD error is
// both. Row 3 asserts only what neither reading disputes — the control is present at its
// position, and a way OUT of the filter exists in that state (the banner's chip is rendered in
// the error state too, so its inline clear is that way out).
//
// ISOLATION: this suite exports a test ARRAY; drive it through a runner that IMPORTS the array,
// under `AOF_GLOBAL_HOME=$(mktemp -d)`. Every fixture server binds port 0.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  withTwoWorkspaceAssignFixture,
  withPublishedAssignFixture,
  withEmptyFleetFace,
  withRefusingFace,
} from "../support/mesh-ui-assign-fixture.mjs";
import { withFleetApp, findAll } from "../support/fleet-app-harness.mjs";
import { withShellComposedFleet } from "../support/shell-app-harness.mjs";
import {
  trigger,
  triggerLabel,
  pickerRows,
  togglePicker,
  pickRow,
  slotControlNames,
  banner,
  bannerChips,
  chipClear,
  clickNode,
  documentFacts,
  mentionsFact,
  emptyState,
  pageStateOf,
  placeholders,
  regionSummary,
} from "../support/fleet-filter-readers.mjs";
import { POLL_MS } from "../../ui/src/fleet/assign-affordance.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPO_PICKER_TSX = path.join(repoRoot, "ui", "src", "fleet", "RepoPicker.tsx");

// The two constants the control declares, read out of its SOURCE rather than imported: a `.tsx`
// is not loadable by plain node, and this repo has no React test harness that would make it so.
// Reading the literal is also the honest instrument for the one claim DESIGN makes about it —
// that it is spelled as a LITERAL the CSS scanner can see, which an imported value would not
// prove (Tailwind scans source text, so a composed string produces no CSS at all).
async function pickerConstant(name) {
  const source = await readFile(REPO_PICKER_TSX, "utf8");
  const match = source.match(new RegExp(`export const ${name} =\\s*"([^"]*)"`));
  assert.ok(match, `ui/src/fleet/RepoPicker.tsx declares \`export const ${name}\` as a string literal`);
  return match[1];
}

const FLEET = "/fleet";
// The label the trigger reads at rest. Pinned here AND checked against the module's own literal
// by the geometry lane below, so the two cannot drift.
const ALL_REPOS = "All repos";
// The fleet's own contribution order (DESIGN §Surface 1's S1-A): the two NARROWINGS first, as
// one group, then the two reader's aids.
// The THIRD narrowing's control (2026-09-11) sits right of the repo picker, so the three narrowings read as one group.
const slotOrder = (label) => ["Scope", `Filter by repo (${label})`, "Show work by status", "Legend", "Refresh the fleet view"];

// Settle a SHELL-COMPOSED mount by bounded render passes — see the header.
async function settleComposed(app, done) {
  const [held] = app.startHolds();
  if (held) {
    await held.answered();
    held.release();
  }
  for (let attempt = 0; attempt < 60 && !done(app); attempt += 1) {
    await new Promise((resolve) => setImmediate(resolve));
    await app.renderOnly();
  }
}

export const fleetFilterControlTests = [
  // ══ Scenario Outline: the picker is mounted in EVERY page state ══
  {
    name: "fleet-filter-control/01 the picker is mounted in EVERY page state, IN the slot, in the fleet's own order — loading (filtered and not), error, empty (idle and filtered) and populated (all seven rows)",
    async run() {
      // ROWS 1, 2, 6, 7 — a REAL populated face, held for the two loading rows.
      await withPublishedAssignFixture(async ({ url, workspaceId }) => {
        const heldRows = [
          { case: "first load, nothing has landed", search: `?repo=${workspaceId}`, reads: workspaceId, wayOut: true },
          { case: "first load, no filter", search: "", reads: ALL_REPOS, wayOut: false },
        ];
        for (const row of heldRows) {
          await withShellComposedFleet(
            {
              url,
              search: row.search,
              pathname: FLEET,
              routeId: "fleet",
              address: { pathname: FLEET, search: row.search, hash: "" },
              identity: "aof",
              viewportWidth: 1280,
              settle: "render",
              holdFromStart: "/api/mesh/status",
            },
            async (app) => {
              // It really IS the loading state: the fleet's own four `aria-busy` placeholders
              // own the content region and the data is still in flight.
              assert.equal(placeholders(app.mains()[0]).length, 4, `${row.case}: the fleet's own loading state is what is on screen`);
              assert.deepEqual(
                app.slotControls(),
                slotOrder(row.reads),
                `${row.case}: the slot holds exactly these contributions, in this order — and the picker is IN it before the first request has landed. ROW 1 IS THE POINT OF THE SCENARIO: the filter's value is known FROM THE URL before any data is, so the trigger renders its value immediately and never as a pulse block.`,
              );
              // …and NOWHERE else in the document: the contribution MOVED, it was not copied.
              assert.equal(
                findAll(app.tree(), (node) => String(node.props?.["aria-label"] ?? "").startsWith("Filter by repo")).length,
                1,
                `${row.case}: exactly one repo picker exists in the document`,
              );
              assert.equal(
                findAll(app.mains()[0], (node) => String(node.props?.["aria-label"] ?? "").startsWith("Filter by repo")).length,
                0,
                `${row.case}: …and it is NOT inside the page body region that swaps out under load, error and empty`,
              );
              assert.equal(triggerLabel(app.slot()), row.reads, `${row.case}: the trigger reads ${JSON.stringify(row.reads)}`);
              // A WAY OUT, and in the loading state the filtered row's is the banner's chip.
              const clear = chipClear(app.mains()[0]);
              if (row.wayOut) assert.ok(clear != null, `${row.case}: a control that clears the filter is present`);
              else assert.equal(clear, null, `${row.case}: there is no filter to leave`);

              await settleComposed(app, (a) => placeholders(a.mains()[0]).length === 0);
            },
          );
        }

        // ROWS 6 and 7 — the ordinary populated page, filtered and not.
        for (const row of [
          { case: "the ordinary filtered page", search: `?repo=${workspaceId}`, reads: "demo", wayOut: true },
          { case: "the ordinary unfiltered page", search: "", reads: ALL_REPOS, wayOut: false },
        ]) {
          await withShellComposedFleet(
            {
              url,
              search: row.search,
              pathname: FLEET,
              routeId: "fleet",
              address: { pathname: FLEET, search: row.search, hash: "" },
              identity: "aof",
              viewportWidth: 1280,
              settle: "render",
              holdFromStart: "/api/mesh/status",
            },
            async (app) => {
              await settleComposed(app, (a) => placeholders(a.mains()[0]).length === 0);
              assert.deepEqual(app.slotControls(), slotOrder(row.reads), `${row.case}: the slot's four contributions, in the fleet's own order`);
              assert.equal(triggerLabel(app.slot()), row.reads, `${row.case}: the trigger reads ${JSON.stringify(row.reads)}`);
              const clear = chipClear(app.mains()[0]);
              if (row.wayOut) assert.ok(clear != null, `${row.case}: a control that clears the filter is present`);
              else assert.equal(clear, null, `${row.case}: there is no filter to leave`);
            },
          );
        }

        // ROW 5 — the filter matched nothing: the EMPTY state over a populated projection.
        await withFleetApp({ url, search: "?repo=nothing-carries-this", pathname: FLEET }, async (app) => {
          assert.equal(pageStateOf(app.tree()), "empty", "the filter matched nothing: the page is empty");
          assert.deepEqual(slotControlNames(app.tree()), slotOrder("nothing-carries-this"), "…and the picker is present, at its position, reading the RAW requested value");
          assert.ok(chipClear(app.tree()) != null, "…with a control that clears the filter");
        });
      }, { nodes: ["worker-a"] });

      // ROW 3 — the mesh refuses the read. FEASIBILITY 3: DESIGN's own states table requires the
      // trigger ENABLED here and DISABLED on an empty roster, and a FIRST-LOAD error is both. So
      // this asserts only what neither reading disputes.
      await withRefusingFace(async ({ url }) => {
        await withFleetApp({ url, search: "?repo=a-known-workspace", pathname: FLEET }, async (app) => {
          assert.equal(pageStateOf(app.tree()), "error", "the mesh refuses the read: the page is in its error state");
          assert.deepEqual(slotControlNames(app.tree()), slotOrder("a-known-workspace"), "the picker is present at its reserved position, whatever its enabled state");
          assert.equal(triggerLabel(app.tree()), "a-known-workspace", "…reading the requested repo");
          const clear = chipClear(app.tree());
          assert.ok(clear != null, "a control that clears the filter is present, and it is not the browser's Back button — a failed load must never trap the operator inside the narrowing that may have caused it");
          assert.match(String(clear.props?.["aria-label"]), /^Clear repo filter/, "…and it says what it clears");
        });
      });

      // ROW 4 — nothing has published anywhere.
      await withEmptyFleetFace(async ({ url }) => {
        await withFleetApp({ url, search: "", pathname: FLEET }, async (app) => {
          assert.equal(pageStateOf(app.tree()), "empty", "nothing published anywhere: the page is empty");
          assert.deepEqual(slotControlNames(app.tree()), slotOrder(ALL_REPOS), "the picker is STILL present, reading `All repos`");
          assert.equal(chipClear(app.tree()), null, "there is no filter to leave");
        });
      });
    },
  },

  // ══ Scenario Outline: the picker offers exactly the workspaces the REAL payload carries ══
  {
    name: "fleet-filter-control/01 the picker offers EXACTLY the workspaces the REAL payload carries — never an invented one, and an empty roster disables rather than fabricates (all three rows)",
    async run() {
      // ROW 1 — nothing published at all. The `assignableNodeOptions` discipline applied to a
      // second picker: never an invented placeholder target, and never a control that vanishes
      // because it has nothing to offer. A hidden control cannot explain itself; a disabled one
      // with a `title` can.
      await withEmptyFleetFace(async ({ url }) => {
        await withFleetApp({ url, search: "", pathname: FLEET }, async (app) => {
          const node = trigger(app.tree());
          assert.ok(node != null, "the picker is STILL rendered over an empty roster");
          assert.equal(triggerLabel(app.tree()), ALL_REPOS, "…and reads `All repos`");
          assert.equal(node.props["aria-disabled"], true, "…is marked disabled");
          assert.equal(node.props.title, "No workspaces have published to this mesh yet", "…and its `title` says why");
          // Marked disabled, NOT removed from the keyboard: an element the keyboard skips hides
          // its explanation from exactly the users who need it.
          assert.notEqual(node.props.disabled, true, "…and it stays FOCUSABLE — `aria-disabled`, never the `disabled` attribute");
          await togglePicker(app);
          assert.deepEqual(pickerRows(app.tree()), [], "…and it offers nothing, rather than an invented placeholder target");
        });
      });

      // ROW 2 — one workspace.
      await withPublishedAssignFixture(async ({ url, workspaceId }) => {
        await withFleetApp({ url, search: "", pathname: FLEET }, async (app) => {
          await togglePicker(app);
          const rows = pickerRows(app.tree());
          assert.equal(rows.length, 2, "one workspace: `All repos` plus exactly one row below the separator");
          assert.ok(rows[1].text.includes("demo"), "…and the row names the workspace the payload carries");
          assert.ok(rows[1].title?.length > 0 && rows[1].title !== "demo", "…carrying its projectRoot as well as its name");
          void workspaceId;
        });
      }, { nodes: ["worker-a"] });

      // ROW 3 — four workspaces, in the payload's own order, each distinguishable by its
      // `projectRoot`. That second line is why DESIGN puts the path on the row at all.
      await withTwoWorkspaceAssignFixture(async (fx) => {
        const served = await (await fetch(new URL("/api/mesh/status?scope=global", fx.url))).json();
        await withFleetApp({ url: fx.url, search: `?repo=${fx.workspaceIdB}`, pathname: FLEET }, async (app) => {
          await togglePicker(app);
          const rows = pickerRows(app.tree());

          // The FIRST row is `All repos`, above a separator, and it is present whatever else is.
          assert.ok(rows[0].text.includes(ALL_REPOS), "the first row is `All repos`");
          assert.ok(rows[0].text.includes("full fleet"), "…with its right-aligned muted hint");

          // Below it: exactly one row per workspace ON THE PAYLOAD, in the payload's own order,
          // and every row names a workspace `GET /api/mesh/status` actually returned.
          const names = served.workspaces.map((workspace) => workspace.name ?? workspace.workspaceId);
          assert.equal(rows.length - 1, served.workspaces.length, "exactly one row per workspace on the payload");
          assert.deepEqual(rows.slice(1).map((row) => row.lines[0]), names, "…in the payload's OWN order, and no row names anything else");
          for (const [index, row] of rows.slice(1).entries()) {
            assert.equal(row.lines[1], served.workspaces[index].projectRoot, `row ${index}: carries that workspace's projectRoot as well as its name`);
            assert.equal(row.title, served.workspaces[index].projectRoot, `row ${index}: …with the full path in \`title\``);
          }

          // The row for the ACTIVE filter is marked by a `✓` and by weight, not by colour alone.
          const selected = rows.filter((row) => row.selected);
          assert.equal(selected.length, 1, "exactly one row is marked selected");
          assert.equal(selected[0].lines[0], "portal", "…and it is the active filter's");
          assert.ok(selected[0].text.includes("✓"), "…marked by a `✓` glyph (shape)");
          const weighted = findAll(selected[0].node, (node) => String(node.props?.className ?? "").includes("font-semibold"));
          assert.ok(weighted.length > 0, "…and by weight — never by colour alone");
        });
      }, { rosterMembership: "publishers" });
    },
  },

  // ══ Scenario: picking a repo narrows without a round trip ══
  {
    name: "fleet-filter-control/01 picking a repo narrows the page WITHOUT a round trip, and the server never hears about it — the poll cadence is unchanged and no request ever carries the filter",
    async run() {
      await withTwoWorkspaceAssignFixture(async (fx) => {
        await withFleetApp({ url: fx.url, search: "?mode=fleet", pathname: FLEET }, async (app) => {
          const before = app.statusLoads();
          assert.ok(before >= 1, "the app has made its first status request (non-vacuous)");

          await togglePicker(app);
          await pickRow(app, "portal");

          // Narrowed in the same frame: no loading state was entered and the populated body was
          // never unmounted (its region headers are continuously present).
          assert.equal(pageStateOf(app.tree()), "populated", "the page is narrowed in the same frame — no loading state is entered");
          assert.ok(mentionsFact(documentFacts(app.tree()), "Homedata Live Property Data"), "…and it really is narrowed to the picked repo");
          assert.ok(!mentionsFact(documentFacts(app.tree()), "Per-folder integration descriptor"), "…with the other repo's work gone");

          assert.equal(app.statusLoads(), before, "the app has made ZERO additional /api/mesh/status requests");
          for (const request of app.requests()) {
            assert.ok(
              !/[?&](repo|workspace|workspaceId)=/.test(request.url),
              `not one request the app has EVER made carries a repo or workspace query parameter — found ${request.url}. A server-side filter would also "work"; counting the app's OWN traffic is how an outsider tells the two builds apart (ADR-002).`,
            );
          }

          await app.advance(POLL_MS);
          assert.equal(app.statusLoads(), before + 1, "when the poll interval elapses the app makes exactly ONE further request — the cadence is unchanged");
          const last = app.requestsMatching("/api/mesh/status").at(-1);
          assert.match(last.url, /[?&]scope=global\b/, "…and that request carries the same `?scope=` it carried before");
          assert.ok(!/[?&]repo=/.test(last.url), "…and nothing else");
        });
      }, { rosterMembership: "publishers" });
    },
  },

  // ══ Scenario Outline: the "filtered by" banner is at the top of the PAGE ══
  {
    name: "fleet-filter-control/01 the `filtered by` banner is at the top of the PAGE, above the state swap, and is absent and zero-height when nothing is narrowed (all eight rows)",
    async run() {
      await withTwoWorkspaceAssignFixture(async (fx) => {
        const rows = [
          { case: "filtered and populated", search: `?repo=${fx.workspaceIdA}`, state: "populated", chips: ["repo · control"] },
          { case: "filtered and the read failed", search: `?repo=${fx.workspaceIdA}`, state: "error", refusing: true, chips: [`repo · ${fx.workspaceIdA}`] },
          { case: "filtered to nothing", search: "?repo=nothing-carries-this", state: "empty", chips: ["repo · nothing-carries-this"] },
          { case: "both narrowings in force", search: `?scope=local&repo=${fx.workspaceIdGone}`, state: "empty", chips: ["scope · Local", `repo · ${fx.workspaceIdGone}`] },
          { case: "scope only", search: "?scope=local", state: "populated", chips: ["scope · Local"] },
          { case: "nothing narrowed", search: "?mode=fleet", state: "populated", chips: [] },
        ];

        for (const row of rows) {
          const run = async (url) => {
            await withFleetApp({ url, search: row.search, pathname: FLEET }, async (app) => {
              const tree = app.tree();
              assert.equal(pageStateOf(tree), row.state, `${row.case}: the page reaches its ${row.state} state`);
              const node = banner(tree);
              if (row.chips.length === 0) {
                // The ONE place this milestone is allowed a conditional element, and DESIGN
                // states the reason it does not violate DG-20's covert-signal rule: the CONTROL
                // in the bar states the filter's state at all times, in all four page states, so
                // the obligation is discharged there. That is exactly why the control may never
                // be conditional and this banner may.
                assert.equal(node, null, `${row.case}: the banner is absent entirely, and occupies zero height`);
                assert.ok(trigger(tree) != null, `${row.case}: …which is only permitted because the CONTROL is still present and still states the filter's state`);
                return;
              }
              assert.ok(node != null, `${row.case}: the banner is present`);
              assert.deepEqual(bannerChips(tree), row.chips, `${row.case}: one chip per narrowing in force, in the order scope THEN repo`);
              // It is in the page body, not the bar — the bar's own trigger already names the
              // repo, and a chip beside it would say the same word twice.
              assert.equal(
                findAll(node, (child) => String(child.props?.["aria-label"] ?? "").startsWith("Filter by repo")).length,
                0,
                `${row.case}: the banner is rendered in the page body, not in the bar`,
              );
              // …and nothing else: no counts, no totals, no second sentence.
              const text = documentFacts(node);
              assert.ok(!/\d+ of \d+/.test(text), `${row.case}: no counts in the banner`);
              assert.equal(findAll(node, (child) => child.type === "p").length, 0, `${row.case}: and no second sentence — R0-N speaks only for a partial intersection`);
            });
          };
          if (row.refusing) await withRefusingFace(async ({ url }) => run(url));
          else await run(fx.url);
        }

        // ROW 2 of the table — filtered while the FIRST LOAD is held. Its own mount, because it
        // needs the response frozen.
        await withFleetApp(
          { url: fx.url, search: `?repo=${fx.workspaceIdA}`, pathname: FLEET, settle: "render", holdFromStart: "/api/mesh/status" },
          async (app) => {
            assert.equal(pageStateOf(app.tree()), "loading", "filtered while the first load is held: the page is loading");
            assert.deepEqual(bannerChips(app.tree()), [`repo · ${fx.workspaceIdA}`], "…and the banner is present, with one repo chip carrying the RAW value");
            const [held] = app.startHolds();
            await held.answered();
            held.release();
            await app.flush();
          },
        );

        // ROW 8 — nothing narrowed, nothing published.
        await withEmptyFleetFace(async ({ url }) => {
          await withFleetApp({ url, search: "", pathname: FLEET }, async (app) => {
            assert.equal(pageStateOf(app.tree()), "empty", "nothing narrowed, nothing published: the empty state");
            assert.equal(banner(app.tree()), null, "…and the banner is absent entirely, occupying zero height");
          });
        });

        // THE BANNER IS THE SAME ELEMENT IN EVERY STATE and is rendered ABOVE whatever the
        // state branch renders — asserted structurally, over one filtered address in three
        // different states, by its position among the root's children.
        for (const [label, url, search] of [
          ["populated", fx.url, `?repo=${fx.workspaceIdA}`],
          ["empty", fx.url, "?repo=nothing-carries-this"],
        ]) {
          await withFleetApp({ url, search, pathname: FLEET }, async (app) => {
            const root = app.tree();
            const children = (root.children ?? []).filter(Boolean);
            const bannerAt = children.findIndex((child) => findAll(child, (node) => node.props?.role === "status").length > 0);
            const bodyAt = children.findIndex((child) => findAll(child, (node) => node.type === "h2" || String(node.props?.className ?? "").includes("border-dashed border-border bg-card/50")).length > 0);
            assert.ok(bannerAt >= 0 && bodyAt >= 0, `${label}: both the banner and the state branch are on the page`);
            assert.ok(bannerAt < bodyAt, `${label}: the banner is rendered ABOVE whatever the page's state branch renders`);
          });
        }
      }, { rosterMembership: "publishers" });
    },
  },

  // ══ Scenario Outline: the filter clears through either door ══
  {
    name: "fleet-filter-control/01 the filter clears through EITHER door in one click with no reload — the chip's inline `✕` and the picker's `All repos` row, in the populated state and in the empty one (both rows)",
    async run() {
      await withTwoWorkspaceAssignFixture(async (fx) => {
        const doors = [
          {
            case: "the door on the statement",
            open: async (app) => {
              const clear = chipClear(app.tree());
              assert.ok(clear != null, "the inline `✕` inside the repo chip is present");
              assert.match(String(clear.props["aria-label"]), /^Clear repo filter \(.+\)$/, "…and its accessible name says what it clears");
              await clickNode(app, clear);
            },
          },
          {
            case: "the door in the menu",
            open: async (app) => {
              await togglePicker(app);
              await pickRow(app, ALL_REPOS);
            },
          },
        ];

        for (const door of doors) {
          // …in the POPULATED state.
          await withFleetApp({ url: fx.url, search: `?repo=${fx.workspaceIdA}`, pathname: FLEET }, async (app) => {
            const before = app.statusLoads();
            await door.open(app);
            const facts = documentFacts(app.tree());
            for (const back of ["portal", "Homedata Live Property Data", "Published Elsewhere", "Re-keyed Checkout"]) {
              assert.ok(mentionsFact(facts, back), `${door.case}: the unfiltered fleet is back — ${JSON.stringify(back)} renders again`);
            }
            assert.equal(banner(app.tree()), null, `${door.case}: the banner is gone and occupies zero height`);
            assert.equal(triggerLabel(app.tree()), ALL_REPOS, `${door.case}: the picker reads \`All repos\` again`);
            assert.equal(app.statusLoads(), before, `${door.case}: no reload and no remount — the app made no additional status request`);
          });

          // …and the SAME door, behaving identically, in the state the operator is most likely
          // to be stuck in. This is where it bites: the menu is a closed popover and the chip is
          // the thing on screen.
          await withFleetApp({ url: fx.url, search: "?repo=nothing-carries-this", pathname: FLEET }, async (app) => {
            assert.equal(pageStateOf(app.tree()), "empty", `${door.case}: starting from the empty state`);
            await door.open(app);
            assert.equal(pageStateOf(app.tree()), "populated", `${door.case}: the same door is available and behaves identically in the empty state`);
            assert.equal(banner(app.tree()), null, `${door.case}: …the banner is gone`);
            assert.equal(triggerLabel(app.tree()), ALL_REPOS, `${door.case}: …and the picker reads \`All repos\``);
          });
        }
      }, { rosterMembership: "publishers" });
    },
  },

  // ══ Scenario: every filter control names itself ══
  {
    name: "fleet-filter-control/01 every filter control NAMES itself, every filter state is carried by words as well as marks, and a filter change is announced rather than shouted",
    async run() {
      await withTwoWorkspaceAssignFixture(async (fx) => {
        await withFleetApp({ url: fx.url, search: `?repo=${fx.workspaceIdA}`, pathname: FLEET }, async (app) => {
          const tree = app.tree();
          const node = trigger(tree);

          // The picker's accessible name says BOTH what it filters and what it is set to.
          assert.equal(node.props["aria-label"], "Filter by repo (control)", "the picker's accessible name says what it filters AND what it is set to");
          assert.ok(!/^[▾\s]*$/.test(String(node.props["aria-label"])), "…never a bare `▾`");
          assert.notEqual(node.props["aria-label"], "control", "…and never a name that is only the value");

          // The inline clear is a real button whose accessible name names the repo it clears.
          const clear = chipClear(tree);
          assert.equal(clear.type, "button", "the inline clear is a real <button>");
          assert.equal(clear.props["aria-label"], "Clear repo filter (control)", "…whose accessible name names the repo it clears");

          // The picker declares itself a disclosure over a listbox…
          assert.equal(node.props["aria-haspopup"], "listbox", "the picker declares itself a disclosure over a listbox");
          assert.equal(node.props["aria-expanded"], false, "…and declares its expanded state");
          await togglePicker(app);
          assert.equal(trigger(app.tree()).props["aria-expanded"], true, "…which changes when it opens");
          // …and its rows declare themselves options with their selected state.
          const rows = pickerRows(app.tree());
          assert.ok(rows.length > 1, "the listbox has rows (non-vacuous)");
          for (const row of rows) assert.equal(typeof row.selected, "boolean", "every row declares its selected state");
          assert.equal(findAll(app.tree(), (child) => child.props?.role === "listbox").length, 1, "…inside exactly one listbox");
          await togglePicker(app);

          // The banner ANNOUNCES POLITELY — a status region, never an alert, because nothing is
          // wrong. And it introduces no landmark of its own.
          const region = banner(app.tree());
          assert.equal(region.props.role, "status", "the banner is a status region");
          assert.equal(region.props["aria-live"], "polite", "…announcing politely");
          assert.equal(findAll(app.tree(), (child) => child.props?.role === "alert").length, 0, "…and never an alert");
          assert.equal(findAll(app.tree(), (child) => child.type === "header" || child.props?.role === "banner").length, 0, "the banner introduces no `banner` landmark of its own (the fleet mounted alone renders none at all — the shell owns the one)");
          assert.equal(findAll(app.tree(), (child) => child.type === "main" || child.props?.role === "main").length, 0, "…and no second `<main>`");
        });

        // EVERY FORM OF THE CHIP SAYS SOMETHING IN ITS `title`, and each is about a DIFFERENT
        // subject: the RESOLVED chip carries the raw `workspaceId`; the unknown chip states a
        // fact about the MESH; the out-of-scope chip states one about the PAYLOAD.
        //
        // The RESOLVED row is F-47-03-QA-3 and it is the load-bearing half of the
        // chip-carries-the-id ruling: once the value resolves the chip renders the NAME, so the
        // raw id an operator typed is on the page in EXACTLY TWO PLACES — this `title` and the
        // address bar, which ADR-003 guarantees is never rewritten. QA's residual observation on
        // 47/02 was closed on that division of labour, and half of it was unguarded.
        const titles = [
          [`?repo=${fx.workspaceIdA}`, fx.workspaceIdA, "the RESOLVED chip renders the name and carries the raw workspaceId in `title` — the screen carries the name, the address carries the id, and this is the only other place the id survives"],
          ["?repo=nothing-carries-this", "No workspace with this id has published to the mesh", "the payload SAW the mesh and carries no such row"],
          [`?scope=local&repo=${fx.workspaceIdGone}`, "This scope's payload does not carry this workspace", "a scope-narrowed payload speaks about the PAYLOAD, never about the mesh"],
        ];
        for (const [search, expected, why] of titles) {
          await withFleetApp({ url: fx.url, search, pathname: FLEET }, async (app) => {
            // Scoped to the BANNER: the bar's trigger also carries a `title` (the full value,
            // for its truncation), and the two are different sentences about different things.
            const chip = findAll(banner(app.tree()), (node) => String(node.props?.title ?? "").length > 0)[0];
            assert.equal(chip?.props?.title, expected, `${search}: ${why}`);
          });
        }

        // EVERY FACT ABOVE IS READABLE WITH ALL COLOUR REMOVED — the words and the marks carry
        // it. Asserted as the property a tree can actually hold: every state the filter can be
        // in is distinguishable from the rendered TEXT alone, with no class consulted.
        const words = {};
        for (const [label, search] of [
          ["unfiltered", "?mode=fleet"],
          ["resolved", `?repo=${fx.workspaceIdA}`],
          ["unknown", "?repo=nothing-carries-this"],
          ["out-of-scope", `?scope=local&repo=${fx.workspaceIdGone}`],
        ]) {
          words[label] = await withFleetApp({ url: fx.url, search, pathname: FLEET }, async (app) => {
            const tree = app.tree();
            return [triggerLabel(tree), ...bannerChips(tree), emptyState(tree)?.heading ?? "", chipClear(tree)?.props?.["aria-label"] ?? ""].join(" | ");
          });
        }
        const rendered = Object.values(words);
        assert.equal(new Set(rendered).size, rendered.length, `each filter state is distinguishable from its WORDS alone, with all colour removed: ${JSON.stringify(words, null, 1)}`);
      }, { rosterMembership: "publishers" });
    },
  },

  // ── the ONE geometry fact a tree CAN carry (DESIGN §Surface 1, and m45's GAP-4) ───────────
  {
    name: "fleet-filter-control/01 the trigger's reserved width is stated ONCE as a literal the CSS scanner can see, and its arithmetic is ASSERTED rather than claimed",
    async run() {
      // m45's GAP-4 shipped a comment that disagreed with its own class, and DESIGN says in
      // terms that this bar does not get to learn that twice. The constant is a LITERAL (a
      // composed string would produce no CSS at all, because Tailwind scans source text), it is
      // spelled ONCE, and the arithmetic behind it is checked here rather than described.
      const REPO_TRIGGER_WIDTH = await pickerConstant("REPO_TRIGGER_WIDTH");
      assert.equal(await pickerConstant("ALL_REPOS"), ALL_REPOS, "the resting label is the module's own literal — this suite and the control cannot drift");

      // RE-POINTED 2026-08-11 (verify fix pass, F-47-V-4). The superseded pair was
      // `min-w-[calc(9ch+1.375rem)] max-w-[18ch]`, and this lane used to check its arithmetic —
      // correctly, and to no effect, because the arithmetic was not the defect. The defect was
      // that the pair does not RESERVE anything: measured on the live build the trigger ran
      // 82.0 -> 119.9px across four states at 1280 and moved the scope control's left edge by
      // 23.0px, while `max-w-[18ch]` computed as a BORDER-BOX maximum gave a ~11-character
      // ceiling rather than 18. A lane that verifies a constant's internal consistency cannot
      // see either fact; what the baseline actually rules is a FIXED WIDTH, so that is what is
      // asserted now, and the behavioural half — that the width does not move between states —
      // is lane 02 below, where a render can see it.
      // RE-POINTED AGAIN 2026-08-13 (verify pass 2, F-47-V-18/19), and WHY matters more than what.
      // The previous cut of this lane asserted the ceiling's ARITHMETIC — "rail 358 − scope 105.2
      // − two gaps 24 − the dropped aids 53 = 175.8px of budget" — and passed. The `two gaps 24`
      // was wrong: the slot row is `Shell.tsx`'s `data-shell-slot` span, whose gap is `gap-4`
      // (16px), not the BAR's `gap-3` (12px) one element up. Real residual 167.77px, ceiling
      // 175.5px, and at that ceiling the row needed 365.73px in a 358px rail and WRAPPED — 70px
      // in two y-bands inside a fixed 40px `overflow: visible` bar, overprinting the chrome.
      // **So this lane did not merely miss the defect; it certified it.** A lane that re-checks a
      // transcribed derivation can only ever confirm the transcription.
      //
      // What is asserted now is the PROPERTY that makes the fit true for occupants nobody has
      // added yet: the trigger is a genuinely shrinkable flex item, so the layout engine computes
      // the residual instead of a human transcribing it. There is no arithmetic left to get wrong.
      assert.equal(
        REPO_TRIGGER_WIDTH,
        "w-full min-w-0 max-w-[45vw] sm:w-[150px] sm:min-w-[150px] sm:max-w-none",
        "the reserved width is one literal both halves of the trigger consume",
      );

      const fixed = REPO_TRIGGER_WIDTH.match(/sm:w-\[(\d+)px\]/);
      assert.ok(fixed, "…and the reserved half is an explicit PIXEL width, not a `ch` measure — a `ch` ceiling is a border-box ceiling and cannot state the slot the mock rules");
      assert.equal(Number(fixed[1]), 150, "the slot is 150px — `mocks/README.md`'s first stated rule: 'a fixed 150px slot in every state, so no state change moves the scope control, the nav, or the bar'");
      assert.match(REPO_TRIGGER_WIDTH, /sm:min-w-\[150px\]/, "…and the fixed half pins the MINIMUM too, so it reserves rather than merely caps: a max alone lets a short label hug and the scope control move, which is the defect F-47-V-4 measured at 23.0px");

      // F-47-V-19 — THE BOUNDARY, AND IT IS NOT A DETAIL. The fixed slot was pinned at `md`
      // (>=768) while DESIGN §Render breakpoints records the desktop-app window as **760**x520.
      // 760 < 768, so the rule never applied in the product's own window and the state-change
      // shift returned there. `sm` (>=640) puts 760 inside the rule and closes the 391..767 band
      // the checklist had left unpinned. Asserted in BOTH directions so a revert is loud.
      assert.doesNotMatch(REPO_TRIGGER_WIDTH, /md:/, "the fixed slot is NOT gated at `md` — the Rust desktop window is 760px wide and `md` is 768, so an `md` gate misses the product it is written for (F-47-V-19)");
      assert.match(REPO_TRIGGER_WIDTH, /sm:max-w-none/, "…and the hugging ceiling is released at the same breakpoint the fixed width takes over at, so exactly one rule governs at every width");

      // THE FIT ITSELF — a property, not a sum. `w-full` because a `<button>`'s `width: auto` is
      // SHRINK-TO-FIT, so with `auto` the button sized to its own content and overflowed the
      // width its wrapper had already been given; `min-w-0` because a flex item's automatic
      // minimum size otherwise floors it at min-content and no shrink can happen at all.
      assert.match(REPO_TRIGGER_WIDTH, /(^|\s)w-full(\s|$)/, "below `sm` the trigger takes the width its wrapper was given — a `<button>`'s `width: auto` is shrink-to-fit, so `w-auto` here overflowed the wrapper by exactly the row's shortfall (F-47-V-18)");
      assert.match(REPO_TRIGGER_WIDTH, /(^|\s)min-w-0(\s|$)/, "…and it may shrink at all: without `min-w-0` a flex item's automatic minimum size is its min-content, and the row overflows rather than the trigger yielding");
      assert.doesNotMatch(REPO_TRIGGER_WIDTH, /\dch/, "the withdrawn `ch` terms do not come back: Tailwind's min/max-width are BORDER-BOX, so a `ch` bound silently spends the padding and the border out of the label's budget (m45 GAP-4, arriving from the other side)");

      // …and the ceiling that remains is honest about being a SHARE, not a fit guarantee.
      const ceiling = REPO_TRIGGER_WIDTH.match(/max-w-\[(\d+)vw\]/);
      assert.ok(ceiling, "the hugging half keeps a share cap so the trigger never eats half the bar when there IS room");
      assert.ok(Number(ceiling[1]) <= 50, `…and the share is at most half the viewport (got ${ceiling[1]}vw)`);

      // GATE B (ADR-014's precedent): COUPLE THE CLAIM TO THE CSS FACT RATHER THAN TO A COMMENT.
      // The whole defect was a hand-carried number about a file this one never read. Read it.
      const shell = await readFile(new URL("../../ui/src/app/Shell.tsx", import.meta.url), "utf8");
      const slotRow = shell.match(/data-shell-slot="surface-bar"\s+className="([^"]*)"/);
      assert.ok(slotRow, "`Shell.tsx` declares the surface-bar slot row's classes as a literal this gate can read");
      assert.match(slotRow[1], /(^|\s)flex-nowrap(\s|$)/, "the slot row is `flex-nowrap`: it lives in a fixed `h-10` bar whose overflow is VISIBLE, so a wrap is not a degradation — it draws over the chrome above and the content below (F-47-V-18). `flex-wrap` also makes the trigger's `min-w-0` unreachable, because line-breaking uses each item's HYPOTHETICAL size and wraps before anything is allowed to shrink");
      assert.doesNotMatch(slotRow[1], /(^|\s)flex-wrap(\s|$)/, "…and it is not ALSO `flex-wrap` — the two would race and the last-declared would win silently");
      assert.match(slotRow[1], /(^|\s)min-w-0(\s|$)/, "…and the row itself may be narrower than its content inside the bar, or the shrink stops one element above the trigger");

      // THE WRAPPER, WHICH IS THE ELEMENT THAT ACTUALLY BLOCKED THE SHRINK. `RepoPicker` renders
      // the button inside a `relative` span for the popover's anchor, and THAT span — not the
      // button — is the slot's direct flex child. With the ceiling on the button and
      // `min-width: auto` here, the shrink stopped one element short of the thing it was meant
      // to shrink, and the row overflowed anyway. Measured: wrapper 175.5px where the residual
      // was 167.77px.
      const pickerSource = await readFile(REPO_PICKER_TSX, "utf8");
      const wrapper = pickerSource.match(/<span className="(relative[^"]*)"\s+ref=\{containerRef/);
      assert.ok(wrapper, "`RepoPicker.tsx` declares the popover-anchor wrapper's classes as a literal this gate can read");
      assert.match(wrapper[1], /(^|\s)min-w-0(\s|$)/, "the popover-anchor wrapper carries `min-w-0`: it is the slot's DIRECT flex child, so its automatic minimum size is what decides whether the trigger may yield at all (F-47-V-18)");
    },
  },

  // ══ The THIRD narrowing (2026-09-11): milestones by work status, open by default ══
  {
    name: "fleet-filter-control/status the default view hides DONE milestones and says so in the region header; `?status=all` shows them with the bare head; a named status carries a banner chip whose clear returns to open",
    async run() {
      await withTwoWorkspaceAssignFixture(async (fx) => {
        // Seven milestones on the mesh, one of them done. The default view shows six and the
        // header states the seventh — the accepted `<n> milestones` head, plus ONE tail.
        await withFleetApp({ url: fx.url, search: "?mode=fleet", pathname: FLEET }, async (app) => {
          assert.equal(pageStateOf(app.tree()), "populated");
          assert.equal(regionSummary(app.tree(), "Milestones"), "6 milestones · 1 done hidden", "the head is the shipped form and the tail names what was hidden");
          assert.ok(!mentionsFact(documentFacts(app.tree()), "Shipped 0"), "the done milestone is not on the page");
          assert.ok(mentionsFact(documentFacts(app.tree()), "Control Only"), "…while an open one in the same repo is");
          const control = findAll(app.tree(), (node) => node.type === "select" && node.props?.["aria-label"] === "Show work by status")[0];
          assert.ok(control, "the status control is in the slot");
          assert.equal(control.props.value, "open", "…and reads the default");
          assert.equal(banner(app.tree()), null, "the default view is not announced as a filter — the header tail is its statement");
          assert.equal(app.address(), `${FLEET}?mode=fleet`, "…and the address carries no status key");

          // Widening through the control is a client-side narrowing change: same frame, no request.
          const loads = app.statusLoads();
          await control.props.onChange({ target: { value: "all" } });
          await app.flush();
          assert.equal(regionSummary(app.tree(), "Milestones"), "7 milestones", "`all` shows every milestone with the bare head and NO tail");
          assert.ok(mentionsFact(documentFacts(app.tree()), "Shipped 0"), "the done milestone is now on the page");
          assert.equal(app.address(), `${FLEET}?mode=fleet&status=all`, "`all` is a value and is written, so a refresh keeps it");
          assert.equal(app.statusLoads(), loads, "no round trip");
          assert.equal(banner(app.tree()), null, "`all` is the absence of a narrowing and is not announced either");
        });

        // A NAMED status is a narrowing in force: chip in the banner, clear returns to OPEN.
        await withFleetApp({ url: fx.url, search: "?status=done", pathname: FLEET }, async (app) => {
          assert.equal(regionSummary(app.tree(), "Milestones"), "1 milestone · 6 hidden, done only");
          assert.deepEqual(bannerChips(app.tree()), ["status · Done"], "the banner states the one narrowing in force");
          const clear = findAll(app.tree(), (node) => node.props?.["aria-label"] === "Clear status filter (Done)")[0];
          assert.ok(clear, "the clear is ON the chip, and names what it clears");
          await clickNode(app, clear);
          assert.equal(regionSummary(app.tree(), "Milestones"), "6 milestones · 1 done hidden", "clearing returns to the DEFAULT view, not to everything");
          assert.equal(app.address(), FLEET, "…and deletes the key rather than writing `open`");
          assert.equal(banner(app.tree()), null);
        });

        // Composed with the repo narrowing: the `<n> of <N>` head is the repo's, the tail is the status's.
        await withFleetApp({ url: fx.url, search: `?repo=${fx.workspaceIdA}&status=done`, pathname: FLEET }, async (app) => {
          assert.equal(regionSummary(app.tree(), "Milestones"), "1 of 7 milestones · 2 hidden, done only");
          assert.deepEqual(bannerChips(app.tree()), ["repo · control", "status · Done"], "scope, repo, status — the order the seam applies them");
        });
      }, { finished: 1 });
    },
  },
  {
    name: "fleet-filter-control/status when the status view hides EVERY milestone the region says so and offers the one-click way out — never the `No milestones published yet` placeholder",
    async run() {
      await withTwoWorkspaceAssignFixture(async (fx) => {
        await withFleetApp({ url: fx.url, search: "?status=blocked", pathname: FLEET }, async (app) => {
          assert.equal(pageStateOf(app.tree()), "populated", "a repo with hidden work is a populated page, not an empty one");
          assert.equal(regionSummary(app.tree(), "Milestones"), "0 milestones · 7 hidden, blocked only");
          const facts = documentFacts(app.tree());
          assert.ok(!mentionsFact(facts, "No milestones published yet"), "the unfiltered placeholder would be a lie here");
          assert.ok(mentionsFact(facts, "7 milestones hidden by status"), "the region names what it is hiding");
          const showAll = findAll(app.tree(), (node) => node.type === "button" && String(node.props?.children ?? "") === "Show all")[0];
          assert.ok(showAll, "…and carries the way out");
          await clickNode(app, showAll);
          assert.equal(regionSummary(app.tree(), "Milestones"), "7 milestones");
          assert.equal(app.address(), `${FLEET}?status=all`);
        });
      }, { finished: 1 });
    },
  },
  {
    name: "fleet-filter-control/status clicking a workspace card narrows the page to that workspace through the SAME repo narrowing — the address, the chip and the picker all agree — and clicking it again clears",
    async run() {
      await withTwoWorkspaceAssignFixture(async (fx) => {
        await withFleetApp({ url: fx.url, search: "?mode=fleet", pathname: FLEET }, async (app) => {
          const cardFor = (name) => findAll(app.tree(), (node) => node.type === "button" && node.props?.["aria-pressed"] !== undefined && String(node.props?.title ?? "").includes("workspace") && findAll(node, (child) => String(child.props?.children ?? "") === name).length > 0)[0];
          const portal = cardFor("portal");
          assert.ok(portal, "the portal workspace's card is a button");
          assert.equal(portal.props["aria-pressed"], false, "…not pressed while no repo is in force");
          const loads = app.statusLoads();
          await clickNode(app, portal);
          assert.equal(app.address(), `${FLEET}?mode=fleet&repo=${fx.workspaceIdB}`, "the click writes the repo narrowing to the address");
          assert.deepEqual(bannerChips(app.tree()), ["repo · portal"], "…the banner states it");
          assert.equal(triggerLabel(app.tree()), "portal", "…the picker reads it");
          assert.ok(mentionsFact(documentFacts(app.tree()), "Homedata Live Property Data"), "…and the page is narrowed to that repo's work");
          assert.ok(!mentionsFact(documentFacts(app.tree()), "Per-folder integration descriptor"));
          assert.equal(app.statusLoads(), loads, "in the same frame, with no round trip");
          const pressed = cardFor("portal");
          assert.equal(pressed.props["aria-pressed"], true, "the card now reads pressed");
          assert.equal(findAll(app.tree(), (node) => node.type === "button" && node.props?.["aria-pressed"] !== undefined && String(node.props?.title ?? "").includes("workspace")).length, 1, "…and it is the only card left, because the workspaces region narrows too");
          await clickNode(app, pressed);
          assert.equal(app.address(), `${FLEET}?mode=fleet`, "clicking the pressed card clears the narrowing");
          assert.equal(banner(app.tree()), null);
        });
      }, { rosterMembership: "publishers" });
    },
  },
];

