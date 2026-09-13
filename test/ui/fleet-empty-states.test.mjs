// Traceability wiring for milestone 47 / story 03 / task 02 —
// `stories/03_story_filtered-fleet-surface/tasks/02_honest-empty-states.feature` (@executable).
// Every @executable Scenario and every Scenario-Outline ROW is covered here.
//
// DG-47-3 + ADR-007: THREE WAYS OF ARRIVING AT NOTHING, THREE TRUE SENTENCES — plus the fourth
// that composition produces. What was broken, measured: `isEmptyStatus` was filter-agnostic, so
// narrowing a populated payload to a workspace it does not carry emptied every array and the
// page rendered `empty`, whose copy said *"No mesh-enabled workspaces have published yet"* — a
// FALSE STATEMENT ABOUT THE MESH produced by the operator's own filter. That is SPEC's forbidden
// outcome stated as a defect rather than a risk, and this is where the page stops saying it.
//
// EVERY STRING BELOW IS PINNED BY **DESIGN §Surface 2's E1–E7 table** (amended 2026-08-11), not
// invented here and not invented by the build. The DERIVATION is story 47/02's `emptyStateCopy`;
// the one-line consumer change is this story's. This file asserts what the PAGE renders and
// never what the helper returns.
//
// THE FIFTH CONDITION IS ADR-010's AND IT IS THE ONE A NAIVE BUILD GETS WRONG IN THE MOST
// DAMAGING DIRECTION. `?scope=local&repo=<another repo>` is served a payload the SERVER already
// narrowed to one workspace, so "zero workspace rows survived" collapses *the scope excluded it*
// and *the mesh does not have it* into one answer — and the page ends up asserting that a
// workspace which demonstrably publishes on this mesh publishes nowhere. E5 (OUT-OF-SCOPE) is
// the honest answer, and the accusation is structurally unavailable to a scope-narrowed payload.
//
// AND THE CLAUSE THAT IS EASY TO GET BACKWARDS, which is why it has a scenario of its own:
// **not yet known is not not found**. Before a payload lands a filter's value is simply
// UNRESOLVED — "the payload does not carry this id" is trivially true of a payload that has not
// arrived, so a naive build accuses a valid filter for the length of a round trip.
//
// SCOPE OF THE "NOTHING IS DRESSED AS A FAILURE" SWEEP, stated because it is a judgement rather
// than an omission: it reads the EMPTY CARD and the BANNER above it — the statement the operator
// is being given. It deliberately does NOT sweep the whole document, because the freshness
// LEGEND in the bar enumerates the run-state and assignment ramps and therefore contains the
// words `failed` and a `!` mark in every page state, filtered or not. A sweep including it would
// fail a correct build for rendering a legend, which is the "gate wrong about the tree rather
// than about the rule" species this milestone keeps catching.
//
// ISOLATION: this suite exports a test ARRAY; drive it through a runner that IMPORTS the array,
// under `AOF_GLOBAL_HOME=$(mktemp -d)`. Every fixture server binds port 0.
import assert from "node:assert/strict";
import { withTwoWorkspaceAssignFixture, withEmptyFleetFace, withRefusingFace, publishRepoInto } from "../support/mesh-ui-assign-fixture.mjs";
import { withFleetApp, findAll } from "../support/fleet-app-harness.mjs";
import {
  emptyState,
  banner,
  bannerChips,
  bannerNotice,
  chipClear,
  clickNode,
  documentFacts,
  mentionsFact,
  pageStateOf,
  placeholders,
  trigger,
  triggerLabel,
  errorState,
  regionHeaders,
} from "../support/fleet-filter-readers.mjs";

const FLEET = "/fleet";
const ALL_REPOS = "All repos";
const UNKNOWN = "nothing-publishes-as-this";

export const fleetEmptyStatesTests = [
  // ══ Scenario Outline: each way of arriving at nothing states which fact it is asserting ══
  {
    name: "fleet-empty-states/02 each way of arriving at nothing states WHICH FACT it is asserting — an idle mesh, a quiet repo, a filter nothing matches, and two narrowings that do not meet (all four rows)",
    async run() {
      const seen = [];

      // ROW 1 — the mesh itself is idle. Today's unfiltered copy, unchanged.
      await withEmptyFleetFace(async ({ url }) => {
        await withFleetApp({ url, search: "", pathname: FLEET }, async (app) => {
          const empty = emptyState(app.tree());
          assert.equal(empty.heading, "No mesh-enabled workspaces yet");
          assert.equal(
            empty.body,
            "No mesh-enabled workspaces have published yet. Enable mesh on a workspace (config.mesh.enabled) and it will appear here.",
            "row 1: today's unfiltered copy, unchanged",
          );
          // The recovery control is the EXISTING `config.mesh.enabled: true` chip — not a
          // button, because the filter is not why this page is empty.
          assert.equal(empty.recovery, null, "row 1: no promoted recovery button");
          assert.ok(documentFacts(empty.card).includes("config.mesh.enabled: true"), "row 1: …the existing chip is what it offers");
          assert.equal(banner(app.tree()), null, "row 1: no narrowing is in force, so the banner names nothing and occupies zero height");
          seen.push({ case: "the mesh itself is idle", ...empty });
        });
      });

      await withTwoWorkspaceAssignFixture(async (fx) => {
        // ROW 2 — the repo is on the mesh, and QUIET. This row is only REACHABLE because the
        // emptiness question is filter-aware (47/02): today's predicate leaves the workspace's
        // own row standing and would render POPULATED with one card above two empty regions.
        await withFleetApp({ url: fx.url, search: `?repo=${fx.workspaceIdQuiet}`, pathname: FLEET }, async (app) => {
          const empty = emptyState(app.tree());
          assert.ok(empty != null, "row 2: a KNOWN but quiet repo reaches the filtered-empty state at all");
          assert.equal(empty.heading, "Nothing published for this repo yet");
          assert.equal(
            empty.body,
            "quiet-repo is on the mesh but has published no milestones and no nodes. The rest of the fleet is still there.",
            "row 2: …and the body names MILESTONES AND NODES — the regions this page actually has after ADR-006. Naming boards would send the operator looking for a region the record deleted.",
          );
          assert.equal(empty.recovery, "Show all repos", "row 2: the promoted recovery control");
          assert.deepEqual(bannerChips(app.tree()), ["repo · quiet-repo"], "row 2: the banner names every narrowing in force, and nothing else");
          seen.push({ case: "the repo is on the mesh, and quiet", ...empty });
        });

        // ROW 3 — the filter matches nothing HERE. `Nothing publishes as X` is a claim about
        // THIS MESH, which is the only claim the client can honestly make: "not published yet"
        // and "no such workspace" are indistinguishable from here.
        await withFleetApp({ url: fx.url, search: `?repo=${UNKNOWN}`, pathname: FLEET }, async (app) => {
          const empty = emptyState(app.tree());
          assert.equal(empty.heading, "No repo matches this filter");
          assert.equal(
            empty.body,
            `Nothing on this mesh publishes as ${UNKNOWN}. It may not have published yet, or the id may belong to another mesh.`,
          );
          assert.equal(empty.recovery, "Show all repos");
          assert.deepEqual(bannerChips(app.tree()), [`repo · ${UNKNOWN}`], "row 3: the banner names the narrowing, verbatim");
          seen.push({ case: "the filter matches nothing here", ...empty });
        });

        // ROW 4 — the two narrowings do not meet. ADR-005's intersection, and ADR-010's ruling
        // that this is OUT-OF-SCOPE rather than unknown.
        await withFleetApp({ url: fx.url, search: `?scope=local&repo=${fx.workspaceIdGone}`, pathname: FLEET }, async (app) => {
          const empty = emptyState(app.tree());
          assert.equal(empty.heading, "Nothing matches Local scope and this repo");
          // Its BODY is pinned by DESIGN as of the 2026-08-11 amendment, and the properties the
          // contract states are asserted beside the string so a re-wording is met as a decision.
          assert.equal(
            empty.body,
            `Local scope narrowed this view to one workspace, and ${fx.workspaceIdGone} is not it. The two narrowings have nothing in common, and a view of one workspace cannot say what the rest of the mesh holds.`,
          );
          assert.match(empty.body, /Local scope/, "row 4: the body names BOTH narrowings — the scope…");
          assert.ok(empty.body.includes(fx.workspaceIdGone), "row 4: …and the repo, verbatim");
          assert.match(empty.body, /two narrowings have nothing in common/, "row 4: …and says the INTERSECTION is what is empty, rather than either half of it");
          // THE COMBINATION THE MODULE MAY NEVER PRODUCE: the unknown-value accusation under a
          // payload that carries a served narrowing. A client served one workspace was not
          // served the mesh.
          assert.doesNotMatch(empty.body, /Nothing on this mesh publishes as/, "row 4: a scope-narrowed payload NEVER asserts the unknown-value accusation (ADR-010 clause 5)");
          assert.equal(empty.recovery, "Show all repos");
          assert.deepEqual(bannerChips(app.tree()), ["scope · Local", `repo · ${fx.workspaceIdGone}`], "row 4: the banner names BOTH narrowings, scope then repo");
          seen.push({ case: "the two narrowings do not meet", ...empty });
        });
      }, { rosterMembership: "publishers", quiet: true });

      // THE LAST THEN, and it is what makes this a contract rather than a copy deck: no two of
      // the four render the same heading, and none of them renders another's body.
      assert.equal(seen.length, 4, "all four ways of arriving at nothing were rendered");
      assert.equal(new Set(seen.map((entry) => entry.heading)).size, 4, `no two states render the same heading: ${JSON.stringify(seen.map((e) => e.heading))}`);
      assert.equal(new Set(seen.map((entry) => entry.body)).size, 4, "…and none of them renders another's body");
    },
  },

  // ══ Scenario: an unknown filter keeps the address the operator was handed ══
  {
    name: "fleet-empty-states/02 an unknown filter KEEPS the address the operator was handed — nothing is written, nothing is dropped, and a reload renders the same state",
    async run() {
      await withTwoWorkspaceAssignFixture(async (fx) => {
        // A value with mixed case and punctuation, so "byte for byte, including its spelling
        // and its case" is a claim a substring check could not make.
        const typed = "Not-A-Workspace-Id_42";
        const address = `?repo=${typed}`;
        const readOnce = async () =>
          withFleetApp({ url: fx.url, search: address, pathname: FLEET }, async (app) => {
            assert.equal(pageStateOf(app.tree()), "empty", "the page settles into its unknown-filter state");

            // SILENTLY REWRITING the address would take away the link the operator was handed;
            // silently DROPPING the value would render the whole mesh under a filter chip, "a
            // lie the operator cannot see".
            assert.deepEqual(app.historyWrites(), [], "the page has written NOTHING to the address — no history entry was pushed and no address was replaced");
            assert.equal(app.address(), `${FLEET}${address}`, "the address still carries the requested value, byte for byte, including its spelling and its case");

            // The value is still rendered on screen, in both places, exactly as it was typed.
            assert.equal(triggerLabel(app.tree()), typed, "…and in the picker's trigger, exactly as it was typed");
            assert.deepEqual(bannerChips(app.tree()), [`repo · ${typed}`], "…and in the chip");

            // The filter is still IN FORCE — the page has not silently fallen back.
            const facts = documentFacts(app.tree());
            for (const foreign of ["Per-folder integration descriptor", "Homedata Live Property Data"]) {
              assert.ok(!mentionsFact(facts, foreign), `the filter is still in force — ${JSON.stringify(foreign)} is not rendered`);
            }
            // …and it is not a page-level error either: that would claim the mesh is broken
            // when it is fine.
            assert.equal(errorState(app.tree()), null, "…and it is not dressed as a page-level failure");
            return emptyState(app.tree()).heading;
          });

        const first = await readOnce();
        // A REFRESH IS A FRESH MOUNT AT THE SAME ADDRESS, which the harness models exactly.
        const second = await readOnce();
        assert.equal(second, first, "reloading that same address renders the same state again");
      }, { rosterMembership: "publishers" });
    },
  },

  // ══ Scenario: not yet known is not not found ══
  {
    name: "fleet-empty-states/02 NOT YET KNOWN is not NOT FOUND — a valid filter is never accused of being unknown while the payload is still in flight, and nothing moves when the name resolves",
    async run() {
      await withTwoWorkspaceAssignFixture(async (fx) => {
        await withFleetApp(
          { url: fx.url, search: `?repo=${fx.workspaceIdA}`, pathname: FLEET, settle: "render", holdFromStart: "/api/mesh/status" },
          async (app) => {
            const tree = app.tree();
            // The LOADING state — the four region placeholders, unchanged.
            assert.deepEqual(
              placeholders(tree),
              ["Loading Workspaces", "Loading Milestones", "Loading Nodes", "Loading Diagnostics"],
              "the page is in its LOADING state — the four region placeholders, unchanged",
            );

            // The filter is stated in BOTH places, carrying the RAW value, in its ordinary
            // NEUTRAL form.
            assert.equal(triggerLabel(tree), fx.workspaceIdA, "the filter is stated in the picker, carrying the raw value");
            assert.deepEqual(bannerChips(tree), [`repo · ${fx.workspaceIdA}`], "…and in the banner");

            // NOTHING says the filter matches nothing, and nothing carries the unavailable
            // treatment. The dashed mark is a CLAIM about a payload that saw the mesh, and this
            // one has seen nothing.
            const facts = documentFacts(tree);
            assert.ok(!/matches nothing|No repo matches|publishes as/.test(facts), "nothing on the page says the filter matches nothing");
            // …and NEITHER OF THE FILTER'S TWO STATEMENTS carries the unavailable (dashed)
            // treatment. Scoped to the trigger and the chip, which are the two places the
            // filter's form is expressed: the legend's own "no presence" swatch is the same
            // house primitive and is present in every state, filtered or not, so a whole-tree
            // sweep would fail a correct build for rendering a legend.
            const dashed = (node) => /border-dashed/.test(String(node?.props?.className ?? ""));
            assert.ok(!dashed(trigger(tree)), "the trigger does not carry the unavailable (dashed) treatment — the dashed mark is a CLAIM about a payload that saw the mesh, and this one has seen nothing");
            const chip = findAll(banner(tree), (node) => String(node.props?.className ?? "").includes("rounded-md border"))[0];
            assert.ok(!dashed(chip), "…and neither does the chip");
            assert.equal(emptyState(tree), null, "no empty state of any kind is rendered");

            // …and the chip's own `title` says which fact it is asserting: not-yet-known.
            const chipTitle = findAll(banner(tree), (node) => String(node.props?.title ?? "").length > 0)[0]?.props?.title;
            assert.match(String(chipTitle), /not yet known/, "the chip states its condition in words — the mesh has not answered yet");

            // Release the held response and settle.
            const [held] = app.startHolds();
            await held.answered();
            held.release();
            await app.flush();

            const settled = app.tree();
            assert.equal(triggerLabel(settled), "control", "the value resolves to the workspace's NAME in the trigger");
            assert.deepEqual(bannerChips(settled), ["repo · control"], "…and in the chip");
            assert.equal(pageStateOf(settled), "populated", "the page is populated");
            assert.ok(mentionsFact(documentFacts(settled), "Per-folder integration descriptor"), "…narrowed to that workspace");
            assert.ok(!mentionsFact(documentFacts(settled), "Homedata Live Property Data"), "…and to that workspace only");

            // NOTHING MOVED when the name resolved: the banner is a full-width row with nothing
            // downstream of it, so the chip's width change displaces no sibling. Asserted as the
            // structural fact a tree can carry — the banner's row is the last thing in its
            // container, and the region column is a SEPARATE child of the page root.
            const bannerRow = banner(settled);
            const container = findAll(settled, (node) => (node.children ?? []).includes(bannerRow))[0];
            assert.equal((container.children ?? []).filter(Boolean).length, 1, "the banner is alone in its container — a full-width row with nothing downstream of it");
          },
        );
      }, { rosterMembership: "publishers" });
    },
  },

  // ══ Scenario Outline: no way of arriving at nothing is dressed as a failure ══
  {
    name: "fleet-empty-states/02 NO way of arriving at nothing is dressed as a failure — and the ERROR state stays visibly different, with a Retry label the filter never touches (all four rows)",
    async run() {
      const cards = [];

      await withEmptyFleetFace(async ({ url }) => {
        await withFleetApp({ url, search: "", pathname: FLEET }, async (app) => {
          cards.push({ case: "the mesh itself is idle", tree: app.tree() });
        });
      });
      await withTwoWorkspaceAssignFixture(async (fx) => {
        for (const [label, search] of [
          ["the repo is on the mesh, and quiet", `?repo=${fx.workspaceIdQuiet}`],
          ["the filter matches nothing here", `?repo=${UNKNOWN}`],
          ["the two narrowings do not meet", `?scope=local&repo=${fx.workspaceIdGone}`],
        ]) {
          await withFleetApp({ url: fx.url, search, pathname: FLEET }, async (app) => {
            cards.push({ case: label, tree: app.tree() });
          });
        }
      }, { rosterMembership: "publishers", quiet: true });

      assert.equal(cards.length, 4, "all four states were rendered");
      for (const { case: label, tree } of cards) {
        const empty = emptyState(tree);
        assert.ok(empty != null, `${label}: the page is in its empty state`);

        // The SUBJECT of this sweep is the statement the operator is given: the card and the
        // banner above it (see the header for why it is not the whole document).
        const statement = `${documentFacts(empty.card)} ${documentFacts(banner(tree) ?? {})}`;
        assert.ok(!/!/.test(statement.replace(/[^!]/g, "")), `${label}: no \`!\` mark`);
        assert.equal(errorState(tree), null, `${label}: no error pill and no retry control`);
        for (const word of ["error", "failed", "broken", "could not"]) {
          assert.ok(!new RegExp(word, "i").test(statement), `${label}: it uses none of the words error/failed/broken/could not — found ${JSON.stringify(word)}`);
        }
        // The SAME calm dashed card primitive the empty fleet has always used — one primitive
        // for all of them; they differ in their words, never in their box.
        assert.match(String(empty.card.props?.className), /border-dashed border-border bg-card\/50/, `${label}: the same calm dashed card primitive`);
        assert.ok(!/accent|destructive/.test(String(empty.card.props?.className)), `${label}: never accent, never destructive`);
      }
      // All four boxes really are the SAME primitive, byte for byte.
      assert.equal(new Set(cards.map((entry) => String(emptyState(entry.tree).card.props.className))).size, 1, "one card primitive for all four rows");

      // …and the ERROR state, produced by a face that refuses `/api/mesh/status`, is still
      // visibly different from all of them.
      await withRefusingFace(async ({ url }) => {
        for (const [label, search] of [["unfiltered", "?scope=local"], ["filtered", `?scope=local&repo=${UNKNOWN}`]]) {
          await withFleetApp({ url, search, pathname: FLEET }, async (app) => {
            const failure = errorState(app.tree());
            assert.ok(failure != null, `${label}: the error state keeps its pill`);
            assert.match(failure.pill, /!/, `${label}: …and its mark`);
            assert.match(documentFacts(app.tree()), /Global mesh store: /, `${label}: …and its mesh path`);
            // A control's label never carries a data-derived value that can be arbitrarily
            // long, and the banner directly above it already names every narrowing in force.
            assert.equal(failure.retry, "⟳ Retry Local", `${label}: the Retry control's label is UNCHANGED by the filter`);
          });
        }
      });
    },
  },

  // ══ Scenario Outline: every filtered empty state is one click from the whole fleet ══
  {
    name: "fleet-empty-states/02 every filtered empty state is ONE CLICK from the whole fleet, the click does not reload, and clearing one narrowing never clears the other (all three rows)",
    async run() {
      await withTwoWorkspaceAssignFixture(async (fx) => {
        const rows = [
          { case: "the filter matches nothing here", search: `?repo=${UNKNOWN}`, keeps: null, address: FLEET },
          // ROW 2 is ADR-005's "neither control clears the other" seen from the recovery
          // button: a `Show all repos` that also reset the scope would be a control doing two
          // things, one of them unasked for.
          { case: "the two narrowings do not meet", search: `?scope=local&repo=${fx.workspaceIdGone}`, keeps: "scope · Local", address: `${FLEET}?scope=local` },
          { case: "the repo is on the mesh, and quiet", search: `?repo=${fx.workspaceIdQuiet}`, keeps: null, address: FLEET },
        ];

        for (const row of rows) {
          await withFleetApp({ url: fx.url, search: row.search, pathname: FLEET }, async (app) => {
            const before = app.statusLoads();
            const empty = emptyState(app.tree());
            assert.equal(empty.recovery, "Show all repos", `${row.case}: the promoted recovery control is present`);

            await clickNode(app, empty.recoveryNode);

            const facts = documentFacts(app.tree());
            if (row.keeps == null) {
              assert.equal(pageStateOf(app.tree()), "populated", `${row.case}: the page renders the unfiltered fleet`);
              for (const back of ["Per-folder integration descriptor", "Homedata Live Property Data", "Published Elsewhere"]) {
                assert.ok(mentionsFact(facts, back), `${row.case}: every workspace's facts are back — ${JSON.stringify(back)}`);
              }
              assert.equal(banner(app.tree()), null, `${row.case}: the banner is gone and occupies zero height`);
            } else {
              // The OTHER narrowing is untouched, so the banner still states it and the page is
              // still narrowed by the server.
              assert.deepEqual(bannerChips(app.tree()), [row.keeps], `${row.case}: \`scope=local\` is UNTOUCHED — clearing one narrowing never clears the other`);
              assert.ok(mentionsFact(facts, "Per-folder integration descriptor"), `${row.case}: …and the scope's own view is what is on screen`);
              assert.ok(!mentionsFact(facts, "Homedata Live Property Data"), `${row.case}: …still narrowed by the scope the operator chose`);
            }
            assert.equal(triggerLabel(app.tree()), ALL_REPOS, `${row.case}: the picker reads \`All repos\``);
            assert.equal(app.statusLoads(), before, `${row.case}: no page reload and no remount — the app made no additional status request`);
            assert.equal(app.address(), row.address, `${row.case}: the address it now holds`);
          });
        }
      }, { rosterMembership: "publishers", quiet: true });
    },
  },

  // ── ADR-010 clause 4 — the PARTIAL intersection, which is the composed state's OTHER half ──
  //
  // Not a scenario of task 02's, and it is here rather than in task 00 because it is the twin of
  // E5 and the two must be asserted against each other: SAME composition, DIFFERENT roster, and
  // EXACTLY ONE of them ever speaks. DESIGN R0-N pins the sentence, its position, its weight and
  // its conditionality; ADR-010 clause 4 pins that this state is `populated` and not empty,
  // because forcing it empty would hide the very rows that answer the filter.
  {
    name: "fleet-empty-states/02 (ADR-010 clause 4) the PARTIAL intersection is a populated page with a notice, never an empty card — and exactly one of R0-N and the E5 card ever speaks",
    async run() {
      await withTwoWorkspaceAssignFixture(async (fx) => {
        // The roster survives: `worker-a` is a member of `portal`, and the server never narrowed
        // the roster under `scope=local`, so the repo filter is the FIRST narrowing it receives.
        await withFleetApp({ url: fx.url, search: `?scope=local&repo=${fx.workspaceIdB}`, pathname: FLEET }, async (app) => {
          const tree = app.tree();
          assert.equal(pageStateOf(tree), "populated", "the composed survivor is POPULATED — forcing it empty would hide the rows that answer the filter");
          assert.equal(emptyState(tree), null, "…so no empty card is rendered");

          assert.equal(
            bannerNotice(tree),
            "Local scope carries none of this repo's work — only the machines carrying it.",
            "R0-N says exactly what DESIGN pins: it names BOTH narrowings, says which one emptied what, and says what survived and why it is still relevant",
          );
          // It makes NO claim the client cannot support: it does not say the repo has no work,
          // only that THIS SCOPE'S payload carries none of it.
          assert.doesNotMatch(bannerNotice(tree), /has no work|publishes nothing|no work at all/, "…and it claims nothing about the repo itself");
          // It names no value, no region and no control.
          assert.ok(!bannerNotice(tree).includes(fx.workspaceIdB), "…it names no value — the chip beside it already carries the name");
          assert.ok(!/Nodes|R3/.test(bannerNotice(tree)), "…and no region: `the machines carrying it` names a RELATION");

          // WHERE IT SITS and WHAT IT WEIGHS: inside R0, on its own line BENEATH the chip row,
          // and it can never be mistaken for a chip or a control.
          const notice = findAll(banner(tree), (node) => node.type === "p")[0];
          const chipRow = findAll(banner(tree), (node) => String(node.props?.className ?? "").includes("flex flex-wrap items-center"))[0];
          const rowIndex = (banner(tree).children ?? []).indexOf(chipRow);
          const noticeIndex = (banner(tree).children ?? []).indexOf(notice);
          assert.ok(rowIndex >= 0 && noticeIndex > rowIndex, "R0-N is inside R0, on its own line BENEATH the chip row");
          assert.equal(notice.props.className, "mt-1 text-xs text-muted-foreground", "…at R0's own label ramp: no border, no background, no fill");
          assert.equal(findAll(notice, (node) => node.type === "button").length, 0, "…and it is not a control, and never becomes one");
          assert.equal(notice.props.role, undefined, "…it takes no live region of its own — it lives inside the banner's");

          // THE EMPTIED REGIONS KEEP THEIR HEADERS AND READ `0 of <N>` — a region that removed
          // itself because its count reached zero would make its own absence a second signal,
          // and would take away the `0 of <N>` that says WHICH narrowing emptied it.
          const headers = Object.fromEntries(regionHeaders(tree).map((region) => [region.label, region.summary]));
          assert.deepEqual(Object.keys(headers), ["Workspaces", "Milestones", "Nodes", "Diagnostics"], "all four regions are still there — none collapsed away because its count reached zero");
          assert.equal(headers.Workspaces, "0 of 1 workspaces", "R1 keeps its header and reads `0 of <N>`");
          assert.equal(headers.Milestones, "0 of 2 milestones", "R2 keeps its header and reads `0 of <N>`");
          assert.equal(headers.Nodes, "2 of 2 nodes carrying this repo", "R3 survives the narrowing the work regions did not");

          // …AND NO PER-REGION EMPTY CARD IS DRAWN (DESIGN's emptied-region rule, F-47-03-QA-10):
          // R0-N explains the composition ONCE, at the top, and one fact has one home. A second
          // card inside R2 saying "nothing here" would state the same fact in a second place
          // while explaining less than the `0 of <N>` above it already does.
          assert.ok(!documentFacts(tree).includes("No milestones published yet"), "no per-region empty card is drawn in the region the composition emptied");
          // NON-VACUITY, and it needs its own producer rather than a claim: the placeholder is
          // REAL, still ships, and is exactly what an UNFILTERED page renders over a projection
          // that carries a workspace and no work. A projection with nothing at all reaches the
          // whole-PAGE empty state instead, so the shape has to be built: one published repo
          // with an empty `wiki/work`, and no narrowing.
          await withEmptyFleetFace(async ({ url: emptyUrl, home, root }) => {
            await publishRepoInto({ home, root: `${root}-quiet` }, { name: "only-repo", milestones: [] });
            await withFleetApp({ url: emptyUrl, search: "", pathname: FLEET }, async (idle) => {
              assert.equal(pageStateOf(idle.tree()), "populated", "…a published-but-quiet repo with NO narrowing is a populated page");
              assert.ok(
                documentFacts(idle.tree()).includes("No milestones published yet"),
                "…and it STILL renders the shipped per-region placeholder, because there is no narrowing to name and therefore no `0 of <N>` doing the explaining. That is what makes its absence under a filter the rule rather than a deleted string.",
              );
            });
          });

          // THE SURVIVING ROSTER ROWS *ARE* THE ANSWER TO THE FILTER, so they are asserted as
          // RENDERED ROWS and not merely as a header count. `worker-b` is the row that matters:
          // it is a member of the filtered repo and NOT of the workspace the server narrowed to,
          // so a build implementing ADR-010's REJECTED clause 3 — gate the roster by the served
          // `status.workspaceId` first, then by repo — drops it while every other assertion on
          // this page stays green. This is the clause that build fails.
          const facts = documentFacts(tree);
          assert.ok(mentionsFact(facts, "worker-a"), "the multi-workspace member machine is rendered");
          assert.ok(mentionsFact(facts, "worker-b"), "…and so is the FOREIGN-workspace one — a member of this repo that the served workspace does not carry");
        });

        // …and its twin: SAME composition, DIFFERENT roster (no machine carries `elsewhere`), so
        // the E5 card speaks and the notice does not. Exactly one of them, in each direction.
        await withFleetApp({ url: fx.url, search: `?scope=local&repo=${fx.workspaceIdGone}`, pathname: FLEET }, async (app) => {
          assert.equal(pageStateOf(app.tree()), "empty", "with no surviving member machine the same composition is EMPTY");
          assert.equal(emptyState(app.tree()).heading, "Nothing matches Local scope and this repo", "…and the E5 card speaks");
          assert.equal(bannerNotice(app.tree()), null, "…while R0-N is silent — exactly one of the two ever speaks");
        });

        // …and the notice is ABSENT on an ordinary filtered page, in the loading state, and in
        // the error state: it is an explanation of a CONDITION, and none of those has one.
        await withFleetApp({ url: fx.url, search: `?repo=${fx.workspaceIdA}`, pathname: FLEET }, async (app) => {
          assert.equal(bannerNotice(app.tree()), null, "R0-N is absent on an ordinary filtered page");
        });
        await withFleetApp(
          { url: fx.url, search: `?scope=local&repo=${fx.workspaceIdB}`, pathname: FLEET, settle: "render", holdFromStart: "/api/mesh/status" },
          async (app) => {
            assert.equal(bannerNotice(app.tree()), null, "R0-N is absent in the loading state — there is no payload to have a partial intersection over");
            assert.ok(trigger(app.tree()) != null, "…while the control that states the narrowing is present, as it is in every state");
            const [held] = app.startHolds();
            await held.answered();
            held.release();
            await app.flush();
            assert.ok(bannerNotice(app.tree()) != null, "…and it appears once the payload lands (non-vacuous: the same mount reaches both)");
          },
        );
        await withRefusingFace(async ({ url }) => {
          await withFleetApp({ url, search: `?scope=local&repo=${fx.workspaceIdB}`, pathname: FLEET }, async (app) => {
            assert.equal(bannerNotice(app.tree()), null, "R0-N is absent in the error state");
            assert.ok(chipClear(app.tree()) != null, "…while the way out of the filter is still there");
          });
        });
      }, { rosterMembership: "publishers" });
    },
  },
];
