// Traceability wiring for milestone 47 / story 03 / task 03 —
// `stories/03_story_filtered-fleet-surface/tasks/03_deep-link-and-survival.feature` (@executable).
// Every @executable Scenario and every Scenario-Outline ROW is covered here.
//
// ADR-003 + ADR-005: the filter is a SHAREABLE ADDRESS. It is in force on first paint, it
// survives a refresh, the ⟳ control, the background poll and a retry after an error, it is
// carried by the `/fleet` nav item and by nothing else, and it COMPOSES with `?scope=` by
// intersection rather than replacing it.
//
// WHAT THIS FILE OWNS THAT 47/02 DOES NOT. 47/02 owns the URL contract as FUNCTIONS —
// `repoFromSearch`, `withRepoParam`, their idempotence, their preservation of every other
// parameter — driven by `node:test` on `scope.mjs` with no page in sight. This owns the same
// contract as an ADDRESS AN OPERATOR CAN PASTE: what the PAGE renders when opened at a given
// address, and what the ADDRESS holds after the page has been used. Every assertion below is
// stated in those two terms and none of them calls a helper.
//
// THE BUILD PREREQUISITE THIS TASK NAMED, and it is why scenario 5 is `@executable` at all:
// `react-app-harness.mjs` installed `history.pushState` as a NO-OP with no log and never
// reflected the written address back onto the stub `location`, so "the page wrote the address
// once", "it wrote nothing when the value was unchanged" and "it deleted the key rather than
// leaving a bare `?repo=`" were UNOBSERVABLE. The harness now records `(kind, state, title,
// url)` per call and reflects the result onto `location`, exposed as `historyWrites()` and
// `address()`. Without it the write scenario degrades to "the page still shows the right thing",
// and three of its eight rows would pass without the address ever being written. The reflection
// is the half that is easy to omit and is load-bearing: the surface decides idempotence by
// READING the address, so without it the second write would look like the first.
//
// A REFRESH IS A FRESH MOUNT AT THE SAME ADDRESS, which the harness models exactly: the app
// re-reads its filter from the URL at construction, and nothing else survives a reload.
//
// `?scope=local` ON A GLOBALLY-STARTED FIXTURE IS A REAL SERVER NARROWING — `mesh-ui-serve.mjs`
// resolves it to the DAEMON's own workspace — so the intersection cases below are genuinely
// composed (the server narrows, then the client narrows) and are not two client filters wearing
// different names.
//
// ISOLATION: this suite exports a test ARRAY; drive it through a runner that IMPORTS the array,
// under `AOF_GLOBAL_HOME=$(mktemp -d)`. Every fixture server binds port 0 and nothing here
// touches :4181 or :4182.
import assert from "node:assert/strict";
import { withTwoWorkspaceAssignFixture, withRefusingFace } from "../support/mesh-ui-assign-fixture.mjs";
import { withFleetApp, findAll, textOf } from "../support/fleet-app-harness.mjs";
import { withShellComposedFleet, withShellApp } from "../support/shell-app-harness.mjs";
import {
  trigger,
  triggerLabel,
  togglePicker,
  pickRow,
  banner,
  bannerChips,
  chipClear,
  clickNode,
  documentFacts,
  mentionsFact,
  pageStateOf,
  emptyState,
  errorState,
  refreshControl,
  regionSummary,
} from "../support/fleet-filter-readers.mjs";
import { POLL_MS } from "../../ui/src/fleet/assign-affordance.mjs";

const FLEET = "/fleet";
const ALL_REPOS = "All repos";

// The scope control's two buttons, addressed the way an operator does — by the word on them.
function scopeButton(tree, label) {
  const group = findAll(tree, (node) => node.props?.role === "group" && node.props?.["aria-label"] === "Scope")[0];
  return findAll(group, (node) => node.type === "button" && textOf(node) === label)[0] ?? null;
}

export const fleetFilterAddressTests = [
  // ══ Scenario Outline: a deep-linked address is in force on the first paint ══
  {
    name: "fleet-filter-address/03 a deep-linked address is IN FORCE on the first paint — the shared link, both narrowings, a blank value, whitespace, a doubled key, an unknown value and a stranger parameter (all eight rows)",
    async run() {
      await withTwoWorkspaceAssignFixture(async (fx) => {
        const CONTROL = "Per-folder integration descriptor";
        const PORTAL = "Homedata Live Property Data";
        const rows = [
          {
            case: "the ordinary shared link",
            search: `?repo=${fx.workspaceIdA}`,
            renders: { present: [CONTROL], absent: [PORTAL] },
            reads: "control",
            chips: ["repo · control"],
          },
          {
            case: "both narrowings, pasted together",
            search: `?scope=local&repo=${fx.workspaceIdA}`,
            renders: { present: [CONTROL], absent: [PORTAL] },
            reads: "control",
            chips: ["scope · Local", "repo · control"],
          },
          {
            case: "no filter at all",
            search: "?mode=fleet",
            renders: { present: [CONTROL, PORTAL], absent: [] },
            reads: ALL_REPOS,
            chips: [],
          },
          // ROWS 4 AND 5 ARE OPERATOR ARTIFACTS, NOT ERRORS — a cleared control, a half-finished
          // hand-edit. ADR-003: "answering a blank value with an error state on a page that has
          // data is worse than showing the data."
          {
            case: "a cleared control's leftovers",
            search: "?repo=",
            renders: { present: [CONTROL, PORTAL], absent: [] },
            reads: ALL_REPOS,
            chips: [],
          },
          {
            case: "a hand-edit that left whitespace",
            search: "?repo=%20",
            renders: { present: [CONTROL, PORTAL], absent: [] },
            reads: ALL_REPOS,
            chips: [],
          },
          // ROW 6 IS ONE RULE FOR REPEATED KEYS ACROSS THE WHOLE APP, not a new one: it is what
          // `URLSearchParams.get` returns and what the route module already does for a repeated
          // `mode`.
          {
            case: "a doubled parameter",
            search: `?repo=${fx.workspaceIdA}&repo=${fx.workspaceIdB}`,
            renders: { present: [CONTROL], absent: [PORTAL] },
            reads: "control",
            chips: ["repo · control"],
          },
          {
            case: "a value nothing carries",
            search: "?repo=carried-by-nothing",
            renders: { present: [], absent: [CONTROL, PORTAL] },
            reads: "carried-by-nothing",
            chips: ["repo · carried-by-nothing"],
            empty: "No repo matches this filter",
          },
          // ROW 8 IS THE PRESERVATION CLAIM SEEN FROM THE PAGE: `sort=name` is a parameter this
          // codebase has never heard of, and it must still be in the address afterwards.
          {
            case: "the filter beside a stranger",
            search: `?repo=${fx.workspaceIdA}&sort=name`,
            renders: { present: [CONTROL], absent: [PORTAL] },
            reads: "control",
            chips: ["repo · control"],
          },
        ];

        for (const row of rows) {
          await withFleetApp({ url: fx.url, search: row.search, pathname: FLEET }, async (app) => {
            const facts = documentFacts(app.tree());
            for (const present of row.renders.present) assert.ok(mentionsFact(facts, present), `${row.case}: ${JSON.stringify(present)} renders`);
            for (const absent of row.renders.absent) assert.ok(!mentionsFact(facts, absent), `${row.case}: ${JSON.stringify(absent)} does not`);
            if (row.empty) assert.equal(emptyState(app.tree())?.heading, row.empty, `${row.case}: …and the page renders the unknown-filter empty state`);

            assert.equal(triggerLabel(app.tree()), row.reads, `${row.case}: the picker's label`);
            assert.deepEqual(bannerChips(app.tree()), row.chips, `${row.case}: the banner`);
            if (row.chips.length === 0) assert.equal(banner(app.tree()), null, `${row.case}: …absent and zero-height`);

            // THE PAGE HAS REWRITTEN NOTHING. A blank or whitespace value is treated as absent
            // WITHOUT being tidied out of the address behind the operator's back.
            assert.deepEqual(app.historyWrites(), [], `${row.case}: the page has written nothing`);
            assert.equal(app.address(), `${FLEET}${row.search}`, `${row.case}: the address is unchanged from the one that was opened`);
          });
        }
      }, { rosterMembership: "publishers" });
    },
  },

  // ══ Scenario Outline: `scope` and `repo` INTERSECT ══
  {
    name: "fleet-filter-address/03 `scope` and `repo` INTERSECT — neither overrides the other, and an empty intersection is a correct answer that says so (all four rows)",
    async run() {
      const CONTROL = "Per-folder integration descriptor";
      const PORTAL = "Homedata Live Property Data";

      await withTwoWorkspaceAssignFixture(async (fx) => {
        // ROW 1 — the ordinary case the filter exists for.
        await withFleetApp({ url: fx.url, search: `?scope=global&repo=${fx.workspaceIdB}`, pathname: FLEET }, async (app) => {
          const facts = documentFacts(app.tree());
          assert.ok(mentionsFact(facts, PORTAL), "row 1: only that workspace's facts, out of the whole mesh");
          assert.ok(!mentionsFact(facts, CONTROL), "row 1: …and nothing else's");
          assert.deepEqual(bannerChips(app.tree()), ["repo · portal"], "row 1: `scope=global` is the DEFAULT and is not a narrowing, so only the repo is named");
        });

        // ROW 2 — a "no-op" intersection that is NOT one (ADR-010 clause 1, measured): the
        // server never narrowed the roster, so the repo filter is the FIRST narrowing it
        // receives and the roster shrinks. Two correct rules composing, both pinned.
        const localAlone = await withFleetApp({ url: fx.url, search: "?scope=local", pathname: FLEET }, async (app) => ({
          workspaces: regionSummary(app.tree(), "Workspaces"),
          milestones: regionSummary(app.tree(), "Milestones"),
          nodes: regionSummary(app.tree(), "Nodes"),
        }));
        await withFleetApp({ url: fx.url, search: `?scope=local&repo=${fx.workspaceIdA}`, pathname: FLEET }, async (app) => {
          const facts = documentFacts(app.tree());
          assert.ok(mentionsFact(facts, CONTROL), "row 2: exactly what `?scope=local` renders…");
          assert.ok(!mentionsFact(facts, PORTAL), "row 2: …and nothing the scope excluded");
          assert.equal(regionSummary(app.tree(), "Workspaces"), "1 of 1 workspaces", "row 2: the server-narrowed collections are untouched by the repo filter");
          assert.equal(regionSummary(app.tree(), "Milestones"), "2 of 2 milestones", "row 2: …items too");
          // …EXCEPT that the node roster is narrowed BY MEMBERSHIP, which is the one collection
          // this composition reaches, and the two numbers show it doing so: the server left the
          // roster machine-wide at TWO, and the repo filter — the FIRST narrowing that roster
          // ever receives — takes it to one. ADR-005 called this a "no-op intersection"; it
          // measurably is not (ADR-010 clause 1).
          assert.equal(localAlone.nodes, "2 nodes", "row 2 (non-vacuous): under `?scope=local` ALONE the roster is machine-wide and carries a node this repo does not");
          assert.equal(regionSummary(app.tree(), "Nodes"), "1 of 2 nodes carrying this repo", "row 2: …and adding the repo SHRINKS it — the roster narrows by membership");
        });

        // ROW 3 — the contradiction, and it is CORRECT.
        await withFleetApp({ url: fx.url, search: `?scope=local&repo=${fx.workspaceIdGone}`, pathname: FLEET }, async (app) => {
          assert.equal(pageStateOf(app.tree()), "empty", "row 3: the composed empty state");
          assert.equal(emptyState(app.tree()).heading, "Nothing matches Local scope and this repo", "row 3: …naming BOTH narrowings");
        });

        // Both narrowings remain in the address and on screen; neither is dropped, disabled or
        // dimmed because the other is set — and the scope control still shows BOTH options with
        // the active one marked, exactly as it does with no filter set.
        for (const [label, search] of [
          ["row 1", `?scope=global&repo=${fx.workspaceIdB}`],
          ["row 2", `?scope=local&repo=${fx.workspaceIdA}`],
          ["row 3", `?scope=local&repo=${fx.workspaceIdGone}`],
        ]) {
          await withFleetApp({ url: fx.url, search, pathname: FLEET }, async (app) => {
            assert.equal(app.address(), `${FLEET}${search}`, `${label}: both narrowings remain in the address`);
            const active = search.includes("scope=local") ? "Local" : "Global";
            const other = active === "Local" ? "Global" : "Local";
            assert.equal(scopeButton(app.tree(), active)?.props?.["aria-pressed"], true, `${label}: the scope control marks the active option`);
            assert.equal(scopeButton(app.tree(), other)?.props?.["aria-pressed"], false, `${label}: …and still shows the other`);
            assert.notEqual(trigger(app.tree()), null, `${label}: the repo control is present and undimmed`);
            assert.notEqual(trigger(app.tree()).props["aria-disabled"], true, `${label}: …and is not disabled because the other narrowing is set`);
          });
        }
      }, { rosterMembership: "publishers" });

      // ROW 4 — a `--local` SERVER with no `scope` in the URL at all. The rule does not need to
      // know how the first narrowing was asked for.
      await withTwoWorkspaceAssignFixture(async (fx) => {
        await withFleetApp({ url: fx.url, search: `?repo=${fx.workspaceIdGone}`, pathname: FLEET }, async (app) => {
          assert.equal(pageStateOf(app.tree()), "empty", "row 4: the composed empty state, on a server started local");
          assert.equal(emptyState(app.tree()).heading, "Nothing matches Local scope and this repo", "row 4: …reading the scope off the PAYLOAD, since the URL carries none");
          assert.deepEqual(bannerChips(app.tree()), ["scope · Local", `repo · ${fx.workspaceIdGone}`], "row 4: …and the banner names the narrowing the URL never mentioned");
        });
      }, { rosterMembership: "publishers", scope: "local" });
    },
  },

  // ══ Scenario Outline: the filter survives every re-read the page performs ══
  {
    name: "fleet-filter-address/03 the filter survives EVERY re-read the page performs — the poll, the ⟳ control, a Retry after a failure, and a full reload (all four rows)",
    async run() {
      const CONTROL = "Per-folder integration descriptor";
      const PORTAL = "Homedata Live Property Data";

      const stillNarrowed = (app, label, { unmounted = false } = {}) => {
        const facts = documentFacts(app.tree());
        assert.ok(mentionsFact(facts, CONTROL), `${label}: the page is still narrowed to that repo`);
        assert.ok(!mentionsFact(facts, PORTAL), `${label}: …and to that scope`);
        assert.deepEqual(bannerChips(app.tree()), ["scope · Local", "repo · control"], `${label}: the banner still names it`);
        assert.equal(triggerLabel(app.tree()), "control", `${label}: …and so does the picker`);
        const last = app.requestsMatching("/api/mesh/status").at(-1);
        assert.match(last.url, /[?&]scope=local\b/, `${label}: the request the app made carries ?scope=local`);
        assert.ok(!/[?&](repo|workspace|workspaceId)=/.test(last.url), `${label}: …and no repo or workspace parameter`);
        if (!unmounted) assert.equal(pageStateOf(app.tree()), "populated", `${label}: the page did not flip into its loading state and the populated body was never unmounted`);
      };

      await withTwoWorkspaceAssignFixture(async (fx) => {
        const address = `?scope=local&repo=${fx.workspaceIdA}`;

        // ROW 1 — the background poll.
        await withFleetApp({ url: fx.url, search: address, pathname: FLEET }, async (app) => {
          const before = app.statusLoads();
          await app.advance(POLL_MS);
          assert.equal(app.statusLoads(), before + 1, "the poll interval elapsed and the app re-read (non-vacuous)");
          stillNarrowed(app, "the background poll");
        });

        // ROW 2 — the manual refresh.
        await withFleetApp({ url: fx.url, search: address, pathname: FLEET }, async (app) => {
          const before = app.statusLoads();
          await clickNode(app, refreshControl(app.tree()));
          assert.equal(app.statusLoads(), before + 1, "the ⟳ control re-read (non-vacuous)");
          stillNarrowed(app, "the manual refresh");
        });

        // ROW 4 — a full refresh of the page. THE ONE ROW WHERE THE LAST THEN IS EXPECTED TO BE
        // VACUOUS: a reload IS a loading state, so it is kept in the table with its clause
        // marked rather than split out.
        await withFleetApp({ url: fx.url, search: address, pathname: FLEET }, async (app) => {
          stillNarrowed(app, "a full refresh of the page", { unmounted: true });
          assert.equal(app.address(), `${FLEET}${address}`, "…re-read from the URL at construction, which is the only thing that survives a reload");
        });
      }, { rosterMembership: "publishers" });

      // ROW 3 — a RETRY after a failure, and it is the row most likely to be missed in a build:
      // "Retry must re-attempt WITH the filter in force — never silently clearing it, exactly as
      // Retry never silently reverts the scope." A Retry that dropped the filter would look like
      // a fix.
      await withTwoWorkspaceAssignFixture(async (fx) => {
        // A face that REFUSES once and then proxies the real fleet, so the retry meets a real
        // payload rather than a fixture's idea of one — from the ONE home (F-47-03-ARCH-3). This
        // lane used to stand up its own `http.createServer` for exactly this, and its hand-typed
        // 503 body had already drifted from the shared one on the `path` row the error state's
        // `Global mesh store: <path>` line reads. The behaviour it needs is now an OPTION on the
        // shared face rather than a second copy of what a refusal looks like.
        await withRefusingFace(async ({ url, refusalCount }) => {
          await withFleetApp({ url, search: `?scope=local&repo=${fx.workspaceIdA}`, pathname: FLEET }, async (app) => {
            const failure = errorState(app.tree());
            assert.ok(failure != null, "the face refused once and the page is in its error state");
            assert.equal(refusalCount(), 1, "…and it really was the FACE that refused, exactly once (non-vacuous: the premise is measured, not inferred from the page)");
            assert.equal(failure.retry, "⟳ Retry Local", "…with its unchanged Retry label");
            assert.deepEqual(bannerChips(app.tree()), ["scope · Local", `repo · ${fx.workspaceIdA}`], "…and the narrowing survives the error, carrying the raw value while no payload has landed");

            await clickNode(app, failure.retryNode);
            stillNarrowed(app, "a retry after a failure", { unmounted: true });
          });
        }, { refusals: 1, proxyTo: fx.url });
      }, { rosterMembership: "publishers" });
    },
  },

  // ══ Scenario: the fleet's own nav item carries the filter ══
  {
    name: "fleet-filter-address/03 the fleet's OWN nav item carries the filter byte for byte, every other item is its bare path, and the chrome does not move",
    async run() {
      await withTwoWorkspaceAssignFixture(async (fx) => {
        const search = `?scope=local&repo=${fx.workspaceIdA}`;
        const read = async (address) =>
          withShellComposedFleet(
            {
              url: fx.url,
              search: address,
              pathname: FLEET,
              routeId: "fleet",
              // The shell never re-derives the address; the entry resolves it and hands it in,
              // which is why this lane can state the href rule without editing `shell-nav.mjs`.
              address: { pathname: FLEET, search: address, hash: "" },
              identity: "aof",
              viewportWidth: 1280,
              settle: "render",
              holdFromStart: "/api/mesh/status",
            },
            async (app) => {
              const [held] = app.startHolds();
              await held.answered();
              held.release();
              for (let attempt = 0; attempt < 40; attempt += 1) {
                await new Promise((resolve) => setImmediate(resolve));
                await app.renderOnly();
              }
              return app.navItems().map((item) => ({
                id: item.props["data-nav-item"],
                href: item.props.href,
                label: textOf(item).trim(),
              }));
            },
          );

        const filtered = await read(search);
        const bare = await read("");
        assert.ok(filtered.length > 1, "the shell rendered its nav (non-vacuous)");

        const fleetItem = filtered.find((item) => item.id === "fleet");
        assert.equal(fleetItem.href, `${FLEET}${search}`, "the Fleet item's address is `/fleet` carrying that exact search, byte for byte — clicking \"you are here\" is a no-op and copying its address yields the address you are on");

        for (const item of filtered.filter((entry) => entry.id !== "fleet")) {
          assert.ok(!/[?&]repo=/.test(item.href), `${item.id}: carries no \`repo\``);
          assert.ok(!/[?&]scope=/.test(item.href), `${item.id}: …and no \`scope\` — the filter therefore never leaks onto another surface, where it would be inert`);
          assert.match(item.href, /^\/[a-z-]*$/, `${item.id}: every other nav item's address is its BARE path`);
        }

        // A FILTER NEVER MOVES THE CHROME: the items, their order and their labels are
        // identical to the same shell rendered at `/fleet` with no filter.
        assert.deepEqual(filtered.map((item) => item.id), bare.map((item) => item.id), "the nav's items and their order are identical");
        assert.deepEqual(filtered.map((item) => item.label), bare.map((item) => item.label), "…and so are their labels, so nothing about the nav's width can have changed");

        // THE HONEST LIMIT, written as an assertion so it is never logged later as a defect:
        // returning to the fleet from another surface via the nav lands on an UNFILTERED fleet.
        // That is exactly what `?scope=` does today, and it is a property of the shell NOT
        // KNOWING either parameter's name — which is what keeps the filter local to the fleet
        // and is why `routes.mjs` and `shell-nav.mjs` are not edited by this milestone.
        // Read off the REAL shell standing on ANOTHER route — the fleet is not mounted there,
        // which is exactly the point: the nav's answer must not depend on it.
        const fromElsewhere = await withShellApp(
          {
            routeId: "board",
            address: { pathname: "/board", search: "", hash: "" },
            identity: "aof",
            viewportWidth: 1280,
            surface: "none",
          },
          async (app) => app.navItem("fleet")?.props?.href,
        );
        assert.equal(fromElsewhere, FLEET, "returning to the fleet from another surface via the nav lands on an UNFILTERED fleet — the operator's route back is Back, a bookmark, or the picker");
      }, { rosterMembership: "publishers" });
    },
  },

  // ══ Scenario Outline: picking and clearing write the address exactly once ══
  {
    name: "fleet-filter-address/03 picking and clearing write the address EXACTLY ONCE, writing the value it already holds writes NOTHING, and a cleared key is DELETED rather than emptied (all eight rows)",
    async run() {
      await withTwoWorkspaceAssignFixture(async (fx) => {
        const A = fx.workspaceIdA;
        const B = fx.workspaceIdB;
        const rows = [
          { case: "the first pick", start: "?mode=fleet", act: (app) => pick(app, "control"), writes: 1, address: `${FLEET}?mode=fleet&repo=${A}` },
          { case: "picking a second repo", start: `?repo=${A}`, act: (app) => pick(app, "portal"), writes: 1, address: `${FLEET}?repo=${B}` },
          // ROWS 3 AND 6 ARE IDEMPOTENCE AT THE INTERACTION LEVEL, not just at the function
          // level: a history entry per redundant click makes Back a stutter the operator has to
          // press through, and it is the kind of defect only a count can see.
          { case: "picking the repo already in force", start: `?repo=${A}`, act: (app) => pick(app, "control"), writes: 0, address: `${FLEET}?repo=${A}` },
          { case: "clearing from the chip", start: `?repo=${A}`, act: (app) => clickNode(app, chipClear(app.tree())), writes: 1, address: FLEET },
          { case: "clearing from the menu", start: `?repo=${A}`, act: (app) => pick(app, ALL_REPOS), writes: 1, address: FLEET },
          { case: "clearing when nothing is set", start: "?mode=fleet", act: (app) => pick(app, ALL_REPOS), writes: 0, address: `${FLEET}?mode=fleet` },
          { case: "picking beside another narrowing", start: "?scope=local", act: (app) => pick(app, "control"), writes: 1, address: `${FLEET}?scope=local&repo=${A}` },
          // ROW 8 IS ADR-005's copy-and-set from the OTHER control's side, and it is the
          // cheapest possible regression to ship: each writer touches only its own key, on a
          // copy, so writing one can never drop the other.
          { case: "switching scope while filtered", start: `?repo=${A}`, act: (app) => clickNode(app, scopeButton(app.tree(), "Local")), writes: 1, address: `${FLEET}?repo=${A}&scope=local` },
        ];

        const pick = async (app, label) => {
          await togglePicker(app);
          await pickRow(app, label);
        };

        for (const row of rows) {
          await withFleetApp({ url: fx.url, search: row.start, pathname: FLEET }, async (app) => {
            assert.deepEqual(app.historyWrites(), [], `${row.case}: nothing is written before the interaction (non-vacuous)`);
            await row.act(app);

            const writes = app.historyWrites();
            assert.equal(writes.length, row.writes, `${row.case}: the page has written the address ${row.writes} time(s) — got ${JSON.stringify(writes.map((w) => w.url))}`);
            assert.equal(app.address(), row.address, `${row.case}: the address it now holds`);
            for (const write of writes) {
              assert.equal(write.kind, "push", `${row.case}: each write it made was a PUSHED history entry, never a replacement — a filter change is a navigation the operator performed, and Back should undo it`);
            }
            // ROWS 4 AND 5 PIN "DELETED, NOT EMPTIED": the address bar must never carry a naked
            // `?repo=`, which is the same discipline `routes.mjs` already applies one layer up.
            assert.ok(!/[?&]repo=(&|$)/.test(app.address()), `${row.case}: the key is DELETED rather than emptied — never a naked \`?repo=\``);
            assert.ok(!/\?$/.test(app.address()), `${row.case}: …and an emptied query is the EMPTY string, never a bare \`?\``);

            // EVERY PARAMETER THE STARTING ADDRESS CARRIED THAT THE INTERACTION DID NOT CONCERN
            // IS STILL THERE, unchanged — including one this codebase has never heard of.
            for (const [key, value] of new URLSearchParams(row.start)) {
              if (key === "repo") continue;
              if (key === "scope" && row.case === "switching scope while filtered") continue;
              assert.ok(new URLSearchParams(app.address().split("?")[1] ?? "").get(key) === value, `${row.case}: \`${key}=${value}\` is still there, unchanged`);
            }
          });
        }

        // …and the STRANGER parameter, on its own lane because it is the claim m45's
        // preserve-by-default mechanism is about: a key this codebase has never heard of
        // survives a pick AND a clear.
        await withFleetApp({ url: fx.url, search: `?sort=name&repo=${A}`, pathname: FLEET }, async (app) => {
          await togglePicker(app);
          await pickRow(app, "portal");
          assert.equal(app.address(), `${FLEET}?sort=name&repo=${B}`, "a pick preserves a parameter this codebase has never heard of, in place");
          await clickNode(app, chipClear(app.tree()));
          assert.equal(app.address(), `${FLEET}?sort=name`, "…and so does a clear, which deletes only its own key");
        });
      }, { rosterMembership: "publishers" });
    },
  },
];
