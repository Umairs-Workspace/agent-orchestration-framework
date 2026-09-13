// Traceability wiring for milestone 47 / story 03 / task 00 —
// `stories/03_story_filtered-fleet-surface/tasks/00_one-narrowing-seam.feature` (@executable).
// Every @executable Scenario and every Scenario-Outline ROW is covered here.
//
// ADR-004: EVERY REGION, OR NONE. The payload is narrowed ONCE, above the region fan-out and
// BEFORE `pageState`, so no region component ever receives the un-narrowed status and every
// narrowed region reports what it is showing out of what it has.
//
// THE HEADLINE NAMES NO REGION, ON PURPOSE, and that shape is the contract rather than a style.
// "Every region is narrowed" asserted region by region is worthless the moment someone adds a
// region — it passes today and rots at milestone 49. So the headline is a SWEEP OVER THE WHOLE
// RENDERED DOCUMENT (`documentFacts`, which collects text, `title`s and accessible names): *no
// fact belonging to any other workspace appears anywhere*. A region added by a later milestone
// is inside that sentence on the day it is added, without its author knowing this rule exists.
//
// NON-VACUITY IS THE OTHER HALF, and without it the sweep is satisfied by a page that renders
// nothing. Every sweep below runs TWICE over the SAME fixture — once filtered, once not — and
// the foreign facts that must be ABSENT from the first must be PRESENT in the second. "Absent"
// then means narrowed away, not never rendered.
//
// THE FIXTURE IS PRODUCER-FED END TO END. `withTwoWorkspaceAssignFixture` stands up the REAL
// `serveMeshUi` over a REAL global projection holding FOUR published workspaces — `control`,
// `portal`, a workspace whose checkout was deleted, and one that re-keyed itself — with the ref
// `18` colliding across all four (a page that narrowed by REF rather than by workspace id would
// render four cards and look fine). No hand-built status object appears below.
//
// TWO FIXTURE SHAPES ARE OPT-IN AND ARE BUILD PREREQUISITES THIS STORY ADDED, both test-support
// only and both REAL published state rather than an edited payload:
//   - `rosterMembership: "publishers"` — `worker-a` is enrolled into `control` and `portal`
//     ONLY. MEASURED 2026-08-11: the default fixture makes it a member of ALL FOUR (a node
//     record is machine-global, so every registry snapshot taken after it exists enrols it),
//     which the feature's own FEASIBILITY note did not catch — and with every node a member of
//     every repo, ADR-004 rule 2's membership narrowing removes nothing and cannot be told from
//     a passthrough. The Background says `worker-a` is published from `control` and `portal`
//     and from neither of the other two; this is what makes that true.
//   - `diagnostics: true` — `control` and `portal` publish with `mesh.enabled: true`, leaving
//     exactly TWO skipped workspaces in two DIFFERENT repos, and a fifth node is published and
//     then has its registry descriptor removed, which produces a REAL `descriptorErrors` row.
//     A "skipped" workspace is derived from a published descriptor's own `meshEnabled: false`
//     (global-mesh-query.mjs:393), never from an edited payload.
//
// NOT ASSERTED HERE — the SOURCE facts, which are `test/arch/acd-fleet-filter-every-region`'s:
// that the narrowing has one call site, that it runs before `pageState` and before the fan-out,
// and that `GlobalScopeView` does not narrow again. The empty-state-precedence scenario below
// is their BEHAVIOURAL neighbour and asserts the half a static gate cannot see. The PURE
// narrowing contract is 47/02's, exercised by `node:test` on `scope.mjs`; this file never calls
// the helper, it reads the page.
//
// ISOLATION: this suite exports a test ARRAY, so `node --test` on it runs ZERO tests and
// reports success. Drive it through a runner that IMPORTS the array, under
// `AOF_GLOBAL_HOME=$(mktemp -d)`. Every fixture server binds port 0; nothing here touches :4181
// or :4182.
import assert from "node:assert/strict";
import { withTwoWorkspaceAssignFixture, publishRepoInto, withEmptyFleetFace, withRefusingFace } from "../support/mesh-ui-assign-fixture.mjs";
import { withFleetApp, findAll } from "../support/fleet-app-harness.mjs";
import {
  documentFacts,
  mentionsFact,
  regionHeaders,
  regionSummary,
  diagnosticsStrip,
  emptyState,
  pageStateOf,
  placeholders,
  banner,
  bannerChips,
  chipClear,
  clickNode,
  refreshControl,
} from "../support/fleet-filter-readers.mjs";
import { POLL_MS } from "../../ui/src/fleet/assign-affordance.mjs";

const FLEET = "/fleet";

// Mount the REAL, unmodified `<Fleet/>` at an address and read it once it has settled.
function atAddress(fx, search, read) {
  return withFleetApp({ url: fx.url, search, pathname: FLEET }, async (app) => read(app));
}

// The four region labels the page renders, in order. R0 (the banner) is not a region header —
// it is a content row above the state swap — so this is R1–R4 and nothing else.
const REGIONS = ["Workspaces", "Milestones", "Nodes", "Diagnostics"];

export const fleetNarrowingSeamTests = [
  // ══ Scenario Outline: filtered to one repo, nothing on the page belongs to any other ══
  {
    name: "fleet-narrowing-seam/00 filtered to one repo, NOTHING on the page belongs to any other — swept over the whole document, with the unfiltered render as the control (all four rows)",
    async run() {
      await withTwoWorkspaceAssignFixture(async (fx) => {
        // The un-narrowed render is the CONTROL for every row: whatever must be absent under a
        // filter is required to be PRESENT here, so "absent" means narrowed away rather than
        // never rendered.
        const unfiltered = await atAddress(fx, "?mode=fleet", async (app) => ({
          facts: documentFacts(app.tree()),
          state: pageStateOf(app.tree()),
        }));
        assert.equal(unfiltered.state, "populated", "the control render is the populated whole-mesh page");

        // EVERY ROW'S FOREIGN ROOTS ARE SWEPT TOO, and they are swept with a RAW substring
        // rather than through `mentionsFact` (F-47-03-QA-4). The word-boundary rule is correct
        // for a NAME — it is what keeps the node id `control-a` from reading as a leak of the
        // workspace `control` — but a `projectRoot` ends in `…\portal-repo`, where the same rule
        // treats `-` as a word character and answers "no mention". The consequence is exactly
        // the gap this sweep exists to close: a foreign ROOT leaking with no accompanying name
        // would be invisible. A full absolute path is unambiguous — no node id, no timestamp and
        // no count contains one — so for roots ANY occurrence is a leak and the raw test is the
        // right one. The feature's own Thens list `projectRoot`s in `never on screen`; this is
        // what makes that clause real.
        const roots = { control: fx.rootA, portal: fx.rootB, elsewhere: fx.rootGone, rekeyed: fx.rootRekeyed };
        const otherRoots = (mine) => Object.entries(roots).filter(([name]) => name !== mine).map(([, root]) => root);

        const rows = [
          {
            case: "the daemon's own workspace",
            repo: fx.workspaceIdA,
            root: fx.rootA,
            onScreen: ["control", "Per-folder integration descriptor", "Control Only", "worker-a"],
            // `worker-b` is a member of `portal` and of nothing else, so it is a foreign row
            // here for exactly the reason ADR-004 rule 2 gives.
            never: ["portal", "elsewhere", "rekeyed", "Homedata Live Property Data", "Portal Only", "Published Elsewhere", "Re-keyed Checkout", "worker-b"],
            neverRoots: otherRoots("control"),
            milestone18: "Per-folder integration descriptor",
          },
          {
            case: "a peer workspace in the same projection",
            repo: fx.workspaceIdB,
            root: fx.rootB,
            // BOTH member machines survive here, and that is the shape ADR-010's §Consequences
            // calls the non-vacuity half: `worker-a` is a member of two repos and `worker-b` of
            // this one alone.
            onScreen: ["portal", "Homedata Live Property Data", "Portal Only", "worker-a", "worker-b"],
            never: ["control", "elsewhere", "rekeyed", "Per-folder integration descriptor", "Control Only", "Published Elsewhere", "Re-keyed Checkout"],
            neverRoots: otherRoots("portal"),
            milestone18: "Homedata Live Property Data",
          },
          {
            case: "a workspace whose checkout is gone",
            repo: fx.workspaceIdGone,
            root: null,
            onScreen: ["elsewhere", "Published Elsewhere"],
            // ROWS 3 AND 4 ARE THE ONES THAT PROVE THE KEY — and the node clause is ADR-004
            // rule 2 seen from the surface: a node is in the filtered repo iff it is a MEMBER
            // of it, so a repo no machine carries renders an EMPTY node region rather than the
            // machine-wide roster. That deliberately diverges from `?scope=local`, where the
            // roster stays machine-wide; both are correct and neither is to be "fixed" to
            // match the other.
            never: ["control", "portal", "rekeyed", "Per-folder integration descriptor", "Control Only", "Homedata Live Property Data", "Portal Only", "Re-keyed Checkout", "worker-a", "worker-b"],
            // …and the vanished workspace's OWN root is gone from disk, so every root on the
            // payload is foreign to it.
            neverRoots: Object.values(roots).filter((root) => root !== fx.rootGone),
            milestone18: "Published Elsewhere",
          },
          {
            case: "a workspace that re-keyed itself after publishing",
            repo: fx.workspaceIdRekeyed,
            root: fx.rootRekeyed,
            onScreen: ["rekeyed", "Re-keyed Checkout"],
            never: ["control", "portal", "elsewhere", "Per-folder integration descriptor", "Control Only", "Homedata Live Property Data", "Portal Only", "Published Elsewhere", "worker-a", "worker-b"],
            neverRoots: otherRoots("rekeyed"),
            milestone18: "Re-keyed Checkout",
          },
        ];

        for (const row of rows) {
          await atAddress(fx, `?repo=${row.repo}`, async (app) => {
            const tree = app.tree();
            const facts = documentFacts(tree);

            for (const fact of row.onScreen) {
              assert.ok(mentionsFact(facts, fact), `${row.case}: ${JSON.stringify(fact)} is rendered somewhere on the page`);
            }
            if (row.root) {
              assert.ok(facts.includes(row.root), `${row.case}: the filtered workspace's own projectRoot is on the page`);
            }

            for (const fact of row.never) {
              assert.ok(
                !mentionsFact(facts, fact),
                `${row.case}: ${JSON.stringify(fact)} appears somewhere in the rendered document — as text, in a \`title\` or in an accessible name — under a filter that excludes it. ADR-004: every region is narrowed at ONE seam, so nothing belonging to another workspace can survive anywhere on the page.`,
              );
              assert.ok(
                mentionsFact(unfiltered.facts, fact),
                `${row.case}: NON-VACUITY — ${JSON.stringify(fact)} is not on the UNFILTERED page either, so its absence above proves nothing. The sweep must be over a page that renders these facts when nothing is narrowed.`,
              );
            }

            for (const root of row.neverRoots) {
              assert.ok(
                !facts.includes(root),
                `${row.case}: the projectRoot ${JSON.stringify(root)} appears somewhere in the rendered document under a filter that excludes it. A path is a workspace-identifying fact wherever it is rendered — as text, in a \`title\` or in an accessible name.`,
              );
              assert.ok(
                unfiltered.facts.includes(root),
                `${row.case}: NON-VACUITY — ${JSON.stringify(root)} is not on the UNFILTERED page either, so its absence above proves nothing.`,
              );
            }

            // The ref `18` exists in ALL FOUR workspaces with a different title in each, so a
            // page that narrowed by REF rather than by WORKSPACE ID would render four cards
            // and look entirely correct. Exactly one survives, and it is this repo's.
            const eighteens = findAll(tree, (node) => node.type === "h3" && /Homedata Live Property Data|Per-folder integration descriptor|Published Elsewhere|Re-keyed Checkout/.test(String(node.children?.[0] ?? "")));
            assert.equal(eighteens.length, 1, `${row.case}: exactly one milestone card is rendered for the colliding ref 18`);
            assert.ok(mentionsFact(facts, row.milestone18), `${row.case}: …and it is this repo's (${row.milestone18})`);

            assert.equal(pageStateOf(tree), "populated", `${row.case}: the page never enters its error state`);

            // THE ONLY FACTS THAT SURVIVE UN-NARROWED CARRY NO WORKSPACE IDENTITY AT ALL, and
            // each of them is DECLARED. The compound region's two machine-wide facts — the
            // projection's own freshness and its descriptor-error count — are a timestamp and
            // a count that name no workspace, so they are outside the sweep by construction;
            // the region says so in its header.
            assert.equal(
              regionSummary(tree, "Diagnostics"),
              "projection health is mesh-wide · skipped workspaces narrowed",
              `${row.case}: the ONE partially-exempt region declares WHICH half of itself is which`,
            );
          });
        }
      }, { rosterMembership: "publishers" });
    },
  },

  // ══ Scenario: a filter changes which rows render, never which regions exist ══
  {
    name: "fleet-narrowing-seam/00 a filter changes which ROWS render, never which REGIONS exist — four against four, one partial exemption, no other marker",
    async run() {
      await withTwoWorkspaceAssignFixture(async (fx) => {
        const unfiltered = await atAddress(fx, "?mode=fleet", async (app) => regionHeaders(app.tree()));
        const filtered = await atAddress(fx, `?repo=${fx.workspaceIdA}`, async (app) => regionHeaders(app.tree()));

        for (const [label, headers] of [["unfiltered", unfiltered], ["filtered", filtered]]) {
          assert.deepEqual(headers.map((region) => region.label), REGIONS, `${label}: exactly four regions, in this order`);
        }
        // …and that is the same number of regions as the `RegionPlaceholder`s the loading state
        // reserves. Four against four, with no boards region in either (ADR-006 deleted it, and
        // this arithmetic is the record of that agreement rather than a coincidence).
        const reserved = await withFleetApp(
          { url: fx.url, search: "?mode=fleet", pathname: FLEET, settle: "render", holdFromStart: "/api/mesh/status" },
          async (app) => {
            const labels = placeholders(app.tree());
            const [held] = app.startHolds();
            await held.answered();
            held.release();
            return labels;
          },
        );
        assert.deepEqual(reserved, REGIONS.map((region) => `Loading ${region}`), "the loading state reserves exactly four region placeholders — four regions against four placeholders");

        // No region is added by the filter and none is removed by it.
        assert.equal(filtered.length, unfiltered.length, "the filter adds no region and removes none");

        // EXACTLY ONE region declares any part of itself not narrowed, it is Diagnostics, and
        // what it declares is a PARTIAL exemption that says which half is which. The word
        // "partial" is load-bearing: a region declaring a BLANKET exemption over facts that DO
        // carry a workspace is not an exempt region, it is an un-narrowed one wearing a label.
        const declaring = filtered.filter((region) => /mesh-wide|not narrowed|unfiltered/i.test(region.summary));
        assert.deepEqual(declaring.map((region) => region.label), ["Diagnostics"], "exactly ONE region declares any part of itself not narrowed");
        assert.match(declaring[0].summary, /projection health is mesh-wide/, "…and it names the half that is machine-wide");
        assert.match(declaring[0].summary, /skipped workspaces narrowed/, "…and the half that is NOT — a blanket exemption would fail this clause");

        // No region carries a marker the other render does not: unfiltered, nothing declares
        // anything, because with nothing narrowed there is nothing to declare.
        assert.deepEqual(
          unfiltered.filter((region) => /mesh-wide|not narrowed/i.test(region.summary)).map((region) => region.label),
          [],
          "the UNFILTERED render carries no not-narrowed marker at all",
        );

        // Every region that renders rows unfiltered renders only this repo's rows filtered.
        await atAddress(fx, `?repo=${fx.workspaceIdA}`, async (app) => {
          const facts = documentFacts(app.tree());
          for (const foreign of ["portal", "Homedata Live Property Data", "Published Elsewhere", "Re-keyed Checkout"]) {
            assert.ok(!mentionsFact(facts, foreign), `no region renders ${JSON.stringify(foreign)} under the filter`);
          }
        });
      }, { rosterMembership: "publishers" });
    },
  },

  // ══ Scenario Outline: each narrowed region's header states what it is showing ══
  {
    name: "fleet-narrowing-seam/00 each narrowed region's header states what it is showing out of what it HAS, and the compound region states which half of itself is which (all four rows)",
    async run() {
      await withTwoWorkspaceAssignFixture(async (fx) => {
        const unfiltered = await atAddress(fx, "?mode=fleet", async (app) => regionHeaders(app.tree()));
        const filtered = await atAddress(fx, `?repo=${fx.workspaceIdA}`, async (app) => ({
          headers: regionHeaders(app.tree()),
          banner: banner(app.tree()),
        }));

        const rows = [
          { case: "R1", region: "Workspaces", unfiltered: "4 workspaces", filtered: "1 of 4 workspaces" },
          { case: "R2", region: "Milestones", unfiltered: "6 milestones", filtered: "2 of 6 milestones" },
          // R3's `carrying this repo` IS LOAD-BEARING COPY: membership is a different relation
          // from ownership, and a node count that simply shrank would read as machines having
          // gone away. R3 also carries NO liveness tail — that belonged to the local-shape
          // panel ADR-006 deleted, and a lane asking for it would fail a correct build.
          //
          // The number is `1 of 2` and not the feature's illustrative `1 of 1`, which the
          // feature itself sanctions ("the numbers are the FIXTURE'S and the build may re-state
          // them against whatever the producer actually publishes — what is BINDING is the
          // FORM"). It is also strictly the better exemplar: the roster now carries a node this
          // repo does NOT carry, so `n < N` and the membership narrowing is visibly removing a
          // row rather than counting the same one twice (F-47-03-QA-1).
          { case: "R3 — the membership relation named", region: "Nodes", unfiltered: "2 nodes", filtered: "1 of 2 nodes carrying this repo" },
          { case: "R4 — the ONE partial exemption", region: "Diagnostics", unfiltered: "", filtered: "projection health is mesh-wide · skipped workspaces narrowed" },
        ];

        for (const row of rows) {
          const before = unfiltered.find((region) => region.label === row.region)?.summary;
          const after = filtered.headers.find((region) => region.label === row.region)?.summary;
          assert.equal(after, row.filtered, `${row.case}: ${row.region}'s FILTERED header summary`);
          assert.equal(before, row.unfiltered, `${row.case}: …and the same region at /fleet with no filter`);
        }

        // Where the summary carries an `<n> of <N>`, the total after `of` is the UNFILTERED
        // total — what the whole mesh has, not what the filter left. Read against the control
        // render's own bare counts rather than against a number typed here twice.
        for (const region of ["Workspaces", "Milestones"]) {
          const total = Number((unfiltered.find((entry) => entry.label === region)?.summary ?? "").match(/^(\d+)/)?.[1]);
          const after = filtered.headers.find((entry) => entry.label === region)?.summary ?? "";
          assert.equal(Number(after.match(/of (\d+)/)?.[1]), total, `${region}: the total after "of" is the PRE-FILTER total`);
          assert.ok(Number(after.match(/^(\d+)/)?.[1]) < total, `${region}: …and the shown count is genuinely smaller, so the form is not vacuous`);
        }

        // NO COUNT APPEARS IN THE FILTER BANNER — counts live in the region headers, one fact
        // one home.
        const bannerText = filtered.banner == null ? "" : documentFacts(filtered.banner);
        assert.ok(!/\d+ of \d+/.test(bannerText), "the banner carries no `<n> of <N>` count");
        assert.ok(!/\b\d+ (workspaces?|milestones?|nodes?)\b/.test(bannerText), "…and no bare region count either");
      }, { rosterMembership: "publishers" });
    },
  },

  // ══ Scenario Outline: the ONE compound region, fact by fact ══
  {
    name: "fleet-narrowing-seam/00 the ONE COMPOUND region narrows the facts that carry a workspace and leaves the facts that do not — and says which is which (all three rows)",
    async run() {
      // The fixture makes the two halves DIFFER: two DIFFERENT repos are skipped (each
      // published with mesh propagation disabled — a real derivable fact) and one descriptor
      // error exists. Without that the region could print its sentence while narrowing
      // nothing, and the completeness ratchet cannot see inside `diagnostics` because it is an
      // object rather than an array — this scenario is the ONLY gate on the compound.
      await withTwoWorkspaceAssignFixture(async (fx) => {
        const unfiltered = await atAddress(fx, "?mode=fleet", async (app) => diagnosticsStrip(app.tree()));
        const filtered = await atAddress(fx, `?repo=${fx.workspaceIdGone}`, async (app) => ({
          strip: diagnosticsStrip(app.tree()),
          summary: regionSummary(app.tree(), "Diagnostics"),
        }));

        // ROW 1 — the projection's own freshness. case 3(a): machine-wide and DECLARED. It has
        // no per-repo meaning, and narrowing it would hide the cause of an operator's own stale
        // data (a projection error in another workspace is still why YOUR data is stale).
        const projectedUnfiltered = unfiltered.match(/Projection: ([^·]+)/)?.[1].trim();
        const projectedFiltered = filtered.strip.match(/Projection: ([^·]+)/)?.[1].trim();
        assert.match(projectedUnfiltered ?? "", /^updated /, "unfiltered, the strip states the projection's own timestamp");
        assert.equal(projectedFiltered, projectedUnfiltered, "filtered, it reads the SAME timestamp");
        assert.ok(!/of \d+/.test(projectedFiltered ?? ""), "…with no `<n> of <N>` at all — case 3(a), machine-wide");

        // ROW 2 — the WORKSPACE-CARRYING count. case 1: NARROWED. This is the row that fails a
        // naive build loudly: an unamended narrowing spreads `diagnostics` through untouched
        // and prints a number about repos the operator is not looking at, beneath a chip saying
        // the view is narrowed.
        assert.match(unfiltered, /\b2 disabled\/skipped workspaces\b/, "unfiltered, TWO different repos are skipped — the fixture makes the narrowing observable");
        assert.match(filtered.strip, /\b1 of 2 disabled\/skipped workspaces\b/, "filtered, the skipped count is narrowed and takes the house `<n> of <N>` form");

        // ROW 3 — the PATH-carrying count. case 3(a): machine-wide and DECLARED. Over-narrowing
        // and under-narrowing are both failures here, and rows 1 and 3 are what make the
        // difference visible: a build that "fixed" the compound by narrowing the WHOLE region
        // would pass row 2 and fail these.
        const descriptorUnfiltered = unfiltered.match(/(\d+) descriptor error/)?.[1];
        assert.equal(descriptorUnfiltered, "1", "unfiltered, the mesh-wide descriptor-error count is real (non-vacuous)");
        assert.match(filtered.strip, /\b1 descriptor error\b/, "filtered, it reads the SAME count");
        assert.ok(!/of \d+ descriptor/.test(filtered.strip), "…with no `<n> of <N>` at all — case 3(a), machine-wide");

        // …and the region SAYS which is which, fact by fact rather than as a blanket label.
        assert.equal(filtered.summary, "projection health is mesh-wide · skipped workspaces narrowed");
      }, { rosterMembership: "publishers", diagnostics: true });
    },
  },

  // ══ Scenario: a filter that leaves nothing renders the EMPTY state ══
  {
    name: "fleet-narrowing-seam/00 a filter that leaves nothing renders the page's EMPTY state, never a populated page of empty regions — including for a KNOWN but quiet repo",
    async run() {
      // THE BEHAVIOURAL NEIGHBOUR of the arch test's `narrowAt < pageStateAt`: if emptiness
      // were judged on the UN-narrowed payload, a filtered-to-zero view would render the
      // populated body with every region empty and no explanation — SPEC's forbidden outcome.
      await withTwoWorkspaceAssignFixture(async (fx) => {
        const cases = [
          ["a value no workspace on the payload carries", "?repo=no-such-workspace-id"],
          // …and the SAME is true when the filter names a workspace the payload DOES carry but
          // which has published nothing. That predicate is 47/02's (the emptiness question is
          // filter-aware); what is asserted HERE is only what an operator sees.
          ["a KNOWN workspace that has published nothing", `?repo=${fx.workspaceIdQuiet}`],
        ];
        for (const [label, search] of cases) {
          await atAddress(fx, search, async (app) => {
            const tree = app.tree();
            assert.equal(pageStateOf(tree), "empty", `${label}: the page is in its empty state`);
            assert.ok(emptyState(tree)?.card != null, `${label}: …the single centred card, not the region column`);
            assert.deepEqual(regionHeaders(tree), [], `${label}: no region header is rendered at all`);
            assert.deepEqual(placeholders(tree), [], `${label}: no empty-region placeholder is rendered for any region`);

            // The filter banner is rendered ABOVE that card, naming the narrowing in force.
            const chips = bannerChips(tree);
            assert.equal(chips.length, 1, `${label}: the banner is rendered with the narrowing in force`);
            assert.match(chips[0], /^repo · /, `${label}: …and it names the repo narrowing`);
          });
        }
      }, { rosterMembership: "publishers", quiet: true });
    },
  },

  // ══ Scenario: the seam re-applies to every payload the poll delivers ══
  {
    name: "fleet-narrowing-seam/00 the seam re-applies to EVERY payload the poll delivers and to the one the ⟳ control fetches — and clearing the filter reveals the new workspace with no reload",
    async run() {
      await withTwoWorkspaceAssignFixture(async (fx) => {
        await withFleetApp({ url: fx.url, search: `?repo=${fx.workspaceIdA}`, pathname: FLEET }, async (app) => {
          assert.equal(regionSummary(app.tree(), "Milestones"), "2 of 6 milestones", "the page starts narrowed to control");

          // A NEW workspace with its own milestones is published into the SAME projection while
          // the page is open — the way another machine's sync does it, through the real
          // publisher rather than by injecting a payload.
          await publishRepoInto(
            { home: fx.home, root: `${fx.rootA}-late-arrival` },
            { name: "late-arrival", milestones: [{ number: 77, slug: "arrived-late", title: "Arrived Late" }] },
          );

          await app.advance(POLL_MS);
          assert.ok(!documentFacts(app.tree()).includes("Arrived Late"), "after the poll, the page still renders no fact belonging to the new workspace");
          assert.ok(!documentFacts(app.tree()).includes("late-arrival"), "…not its name either");
          // THE NON-VACUITY GUARD: "nothing new appeared" is also true of a page that stopped
          // polling. The `<N>` moving is what proves a fresh payload arrived AND was narrowed.
          assert.equal(regionSummary(app.tree(), "Milestones"), "2 of 7 milestones", "the region totals have GROWN to include it — the page knows it is there and is not showing it");
          assert.equal(regionSummary(app.tree(), "Workspaces"), "1 of 5 workspaces", "…and so has the workspaces total");

          await clickNode(app, refreshControl(app.tree()));
          assert.ok(!documentFacts(app.tree()).includes("Arrived Late"), "after the ⟳ refresh, the page STILL renders no fact belonging to the new workspace");
          assert.equal(regionSummary(app.tree(), "Milestones"), "2 of 7 milestones", "…and the fresh payload is still the one being narrowed");

          const before = app.statusLoads();
          await clickNode(app, chipClear(app.tree()));
          assert.ok(documentFacts(app.tree()).includes("Arrived Late"), "clearing the filter renders the new workspace's facts");
          assert.equal(app.statusLoads(), before, "…with no reload: the app made no additional status request");
          assert.equal(regionSummary(app.tree(), "Milestones"), "7 milestones", "…and the summaries return to their bare unfiltered form");
        });
      }, { rosterMembership: "publishers" });
    },
  },

  // ══ Scenario: the in-body "Filtered to workspace" line is gone ══
  {
    name: "fleet-narrowing-seam/00 the in-body `Filtered to workspace <id>` line is GONE, and the narrowing it stated is stated ONCE, in the banner, in every page state",
    async run() {
      await withTwoWorkspaceAssignFixture(async (fx) => {
        // POPULATED — the state the old line lived in.
        await atAddress(fx, "?scope=local", async (app) => {
          const tree = app.tree();
          const facts = documentFacts(tree);
          assert.ok(!/Filtered to workspace/.test(facts), "the page renders no in-body `Filtered to workspace <id>` line");
          assert.ok(!mentionsFact(facts, fx.workspaceIdA), "…and the raw daemon workspace id it used to print is not on the page at all — R0's component list is closed, and `scope · Local` says what the narrowing IS without naming it");
          assert.deepEqual(bannerChips(tree), ["scope · Local"], "the narrowing `scope=local` produced is stated exactly once, in the filter banner");
          // A STATEMENT rather than a control: scope's own control is always visible in the bar
          // with BOTH options showing, so clearing it is already one click away. The repo's
          // clear lives inside a closed popover, which is why ITS chip carries one.
          assert.equal(chipClear(tree), null, "…and it carries no clear affordance of its own");
        });

        // EMPTY — the same address against a face with nothing published.
        await withEmptyFleetFace(async ({ url }) => {
          await withFleetApp({ url, search: "?scope=local", pathname: FLEET }, async (app) => {
            assert.equal(pageStateOf(app.tree()), "empty", "an empty projection renders the empty state");
            assert.deepEqual(bannerChips(app.tree()), ["scope · Local"], "…and the narrowing is still stated, above the card");
          });
        });

        // ERROR — the same address against a face that refuses `/api/mesh/status`.
        await withRefusingFace(async ({ url }) => {
          await withFleetApp({ url, search: "?scope=local", pathname: FLEET }, async (app) => {
            assert.equal(pageStateOf(app.tree()), "error", "a refused read renders the error state");
            assert.deepEqual(bannerChips(app.tree()), ["scope · Local"], "…and the narrowing is STILL stated, above the error");
          });
        });
      }, { rosterMembership: "publishers" });
    },
  },
];
