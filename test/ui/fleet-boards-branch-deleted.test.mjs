// Traceability wiring for milestone 47 / story 01 / task 01 —
// `stories/01_story_board-drill-in/tasks/01_unreachable-boards-branch-deleted.feature`
// (@executable). Every @executable Scenario and every Scenario-Outline ROW is covered here.
//
// ADR-006(b): ONE PRODUCER OR NO REGION, and in this milestone, no region. The local-shape
// branch — `Fleet.tsx`'s `NodesRegion`, `NodeCard`, `PresenceDot`, `PresenceLabel`,
// `livenessOf`, `BoardsRegion`, `BoardTile`, `boardRunState`, `RunStateChip`,
// `BoardDrillIn` — is DELETED, together with `api.ts`'s `FleetBoard`, `MeshStatus` and
// `RunState`, which lost their last reader with it. `runChipClasses` STAYS:
// `AssignmentChip` shares it, and that is the trap this deletion is most likely to spring.
//
// WHY IT WAS UNREACHABLE, and it is stated in the source itself. `isGlobalStatus` narrowed
// on `Array.isArray(status.workspaces)`, and `shapeGlobalStatus` ALWAYS returns
// `workspaces`, for BOTH scopes — so the guard was always true on the face the web surface
// talks to, and the local branch had not rendered since m34. The `boards` half never made
// the m25/ADR-002 → m34/ADR-006 producer migration: the CLI face still consumes
// `mesh:status`'s registry-fed aggregate while the web face consumes the global SQLite
// projection, and the web face is STRUCTURALLY BARRED from the other by
// `acd-mesh-ui-no-core-import`. So `BoardsRegion` rendered its dashed "No boards registered
// in the group yet" placeholder in production for two milestones — m45 QA's F-45-04-QA-3.
//
// LITMUS: "≈250 lines are gone" is not a claim a scenario can make — a Then that can only
// be checked by grepping is a fitness function, and that one lives in
// `test/arch/testing/acd-ui-surface-file-budget.test.mjs` and
// `test/arch/ui/acd-fleet-board-link-resolved.test.mjs`. What an outsider CAN confirm is what
// the PRODUCT does afterwards, through three channels that already existed:
//   (1) THE REAL SURFACE, MOUNTED, FED BY THE REAL PRODUCER — `withFleetBoards`
//       (test/support/mesh-status-boards-fixture.mjs) invokes the REAL `mesh:status` verb
//       over a REAL group registry and serves its payload, `boards`, `local` marker and
//       all, verbatim over HTTP to the REAL `<Fleet/>`. Nothing is hand-painted. It is the
//       exact instrument that proved the branch unreachable, and it is what proves the
//       branch is gone.
//   (2) THE CLI FACE, driven as a child process, which still renders boards. This is what
//       separates "the dead UI branch went" from "the product lost boards".
//   (3) THE UI BUILD — `npm --prefix ui run build` is `tsc -b && vite build`, so a wire type
//       deleted while a reader survives fails there, loudly, by name.
//
// THE SEQUENCING CONSTRAINT, made structural rather than remembered (m45/STATE: "fixing (b)
// without (a) ships a visible broken link; fix them together or sequence (a) first"). This
// task is (b). Scenario 3 is the lock: it asserts, IN THE SAME RUN as the deletion, that the
// surviving route-resolved drill-in still opens a board — by executing task 00's whole
// feature. So the surface never passes through a state with a board affordance that
// dead-ends, and never through one with no way into a board at all.
//
// PORTS: every fixture server binds :0. Nothing here touches :4181 or :4182.
//
// Run focused and isolated (hook-enforced):
//   AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<driver>
import assert from "node:assert/strict";
import http from "node:http";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serveMeshUi, meshUiDist } from "../../src/mesh/ui-serve.mjs";
import { withFleetApp, findAll, textOf } from "../support/fleet-app-harness.mjs";
import { visibleTextOf } from "../support/mini-react.mjs";
import { withFleetBoards, withMeshStatusBoards, BOARDS_FIXTURE_LOCAL_NODE, BOARDS_FIXTURE_PEER_NODE } from "../support/mesh-status-boards-fixture.mjs";
import { withTwoWorkspaceAssignFixture, sameOriginAssign, readAssignmentRows } from "../support/mesh-ui-assign-fixture.mjs";
import { spawnCliAsync } from "../support/cli-spawn.mjs";
import { fleetBoardDrillInTests } from "./fleet-board-drill-in.test.mjs";
import { registeredSuitePaths } from "../support/registration/registration-surface.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "bin", "aof.mjs");

const REGIONS = ["Workspaces", "Milestones", "Nodes", "Diagnostics"];
const PLACEHOLDER = "No boards registered in the group yet";
const AT_REST = "Open board →";

// --- reading the rendered tree ------------------------------------------------

function regionHeaders(tree) {
  return findAll(tree, (node) => node.type === "h2").map((node) => textOf(node));
}

function sectionNamed(tree, label) {
  return findAll(
    tree,
    (node) => node.type === "section" && findAll(node, (inner) => inner.type === "h2" && textOf(inner) === label).length > 0,
  )[0] ?? null;
}

function scopeControl(tree) {
  return findAll(tree, (node) => node.props?.role === "group" && node.props?.["aria-label"] === "Scope")[0] ?? null;
}

function anchorsIn(tree) {
  return findAll(tree, (node) => node.type === "a").map((node) => node.props?.href);
}

// THE FOUR DOCUMENTED STATES, read off the tree by the marker each one renders and NOTHING
// else. Exactly one must hold — "never a blank document" is the clause this makes real.
function pageStateOf(tree) {
  const text = visibleTextOf(tree);
  const states = [];
  if (findAll(tree, (node) => node.props?.["aria-busy"] === "true").length > 0) states.push("loading");
  if (text.includes("Could not load the mesh")) states.push("error");
  if (text.includes("No mesh-enabled workspaces yet") || text.includes("No nodes in the group yet")) states.push("empty");
  if (REGIONS.every((label) => regionHeaders(tree).includes(label))) states.push("populated");
  return states;
}

function assertOneDocumentedState(tree, label) {
  const states = pageStateOf(tree);
  assert.equal(
    states.length,
    1,
    `${label}: the page is in exactly ONE of its four documented states — loading, error, empty or populated — and never a blank document (got ${JSON.stringify(states)})`,
  );
  return states[0];
}

// --- the two faces scenario 2 needs that no shared fixture stands up ----------

async function writeDist(dir) {
  await mkdir(path.join(dir, "assets"), { recursive: true });
  await writeFile(
    path.join(dir, "index.html"),
    '<!doctype html><html><head><script type="module" src="/assets/index-abc123.js"></script></head><body><div id="root"></div></body></html>\n',
    "utf8",
  );
  await writeFile(path.join(dir, "assets", "index-abc123.js"), "export const x = 1;\n", "utf8");
}

// A REAL `serveMeshUi` over an isolated projection that NOTHING has published into — the
// empty fleet, produced rather than painted.
async function withEmptyFleetFace(fn) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-fleet-empty-"));
  const root = path.join(tmp, "repo");
  const distRoot = path.join(tmp, "dist");
  await mkdir(path.join(root, ".aof"), { recursive: true });
  await writeFile(
    path.join(root, ".aof", "aof.config.json"),
    `${JSON.stringify({ name: "quiet", work: { dir: "./wiki/work" } }, null, 2)}\n`,
    "utf8",
  );
  await writeDist(meshUiDist(distRoot));
  const { server, url } = await serveMeshUi({
    projectDir: root,
    port: 0,
    repoRoot: distRoot,
    globalStoreOptions: { env: { AOF_GLOBAL_HOME: path.join(tmp, "home") } },
  });
  try {
    return await fn({ url });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(tmp, { recursive: true, force: true });
  }
}

// A face that REFUSES `/api/mesh/status` — the error state's own producer.
async function withRefusingFace(fn) {
  const server = http.createServer((request, response) => {
    response.writeHead(503, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: false, error: "The global mesh store is unavailable.", code: "global-store-unavailable" }));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  try {
    return await fn({ url: `http://127.0.0.1:${server.address().port}` });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

// --- scenario 1's rows --------------------------------------------------------

const LOCAL_SHAPE_ROWS = [
  {
    case: "one board owned by THIS node — the branch that rendered a real anchor",
    fixture: { local: "lark-guard" },
    boards: ["lark-guard"],
  },
  {
    case: "one board owned by a PEER — the branch that rendered a copy control",
    fixture: { peer: "vista-app-web" },
    boards: ["vista-app-web"],
  },
  {
    case: "both, which is what the m45 lanes drove",
    fixture: { local: "lark-guard", peer: "vista-app-web" },
    boards: ["lark-guard", "vista-app-web"],
  },
  {
    // ROW 4 IS THE `runChipClasses` TRAP FROM THE SIDE THAT CAN SEE IT: `RunStateChip` was
    // the only local-shape caller of the shared tone map, and it went with the branch while
    // `AssignmentChip` kept it. Scenario 5's assignment row is the other half.
    case: "a board with active runs — the run-state chip's only local-shape caller",
    fixture: { local: "lark-guard", activeRuns: ["run-7"] },
    boards: ["lark-guard"],
    assertPayload: (payload) => {
      assert.deepEqual(
        payload.boards.find((board) => board.ref === "lark-guard")?.activeRuns,
        ["run-7"],
        "the producer really did hand this surface a board with an active run — the chip's own condition",
      );
    },
  },
  {
    case: "boards but NO nodes — the branch's own \"nodes-but-no-boards\" inverse",
    fixture: { local: "lark-guard", nodes: false },
    boards: ["lark-guard"],
  },
  {
    // ROW 6 pins that "no placeholder" is not satisfied by "the placeholder only shows when
    // the array is non-empty". The dashed placeholder was the EMPTY case's render — the
    // thing an operator has actually been looking at for two milestones.
    case: "the empty local shape — the placeholder's own condition",
    fixture: {},
    boards: [],
    expectState: "empty",
  },
];

// --- scenario 2's states ------------------------------------------------------

const ANCHOR_SWEEP_ROWS = [
  {
    case: "the ordinary populated fleet",
    async mount(fn) {
      await withTwoWorkspaceAssignFixture(async ({ url }) => {
        await withFleetApp({ url, search: "?scope=global" }, fn);
      });
    },
  },
  {
    case: "the state that used to render the relative `/board` anchor",
    async mount(fn) {
      await withFleetBoards({ local: "lark-guard" }, fn);
    },
  },
  {
    case: "the state that used to render the peer copy-control",
    async mount(fn) {
      await withFleetBoards({ peer: "vista-app-web" }, fn);
    },
  },
  {
    case: "the empty fleet",
    async mount(fn) {
      await withEmptyFleetFace(async ({ url }) => {
        await withFleetApp({ url, search: "?scope=global" }, fn);
      });
    },
  },
  {
    case: "the error state",
    async mount(fn) {
      await withRefusingFace(async ({ url }) => {
        await withFleetApp({ url, search: "?scope=global" }, fn);
      });
    },
  },
  {
    case: "the loading state",
    // The build prerequisite this row needed: `withFleetApp` now plumbs the core harness's
    // `settle` / `holdFromStart`, so the app's FIRST status response is genuinely frozen
    // rather than raced for on a loopback fixture.
    async mount(fn) {
      await withTwoWorkspaceAssignFixture(async ({ url }) => {
        await withFleetApp(
          { url, search: "?scope=global", settle: "render", holdFromStart: "/api/mesh/status" },
          async (app) => {
            assert.deepEqual(pageStateOf(app.tree()), ["loading"], "the loading state really was reached and held");
            await fn(app);
            for (const hold of app.startHolds()) hold.release();
            await app.flush();
          },
        );
      });
    },
  },
];

// --- scenario 5's rows --------------------------------------------------------

const REGION_ROWS = [
  {
    case: "R1",
    region: "the Workspaces summary",
    fact: "one card per workspace, each with its name, its `projectRoot` and its mesh-enabled dot",
    check(app, { status }) {
      const section = sectionNamed(app.tree(), "Workspaces");
      assert.ok(section, "the Workspaces summary is rendered");
      const cards = findAll(
        section,
        // A card is a BUTTON since 2026-09-11 — clicking it narrows the page to that workspace — so
        // it is found by its role and its card skin, not by a border class that now varies with selection.
        (node) => node.type === "button" && String(node.props?.className ?? "").includes("rounded-lg border") && String(node.props?.className ?? "").includes("bg-card px-4"),
      );
      assert.equal(cards.length, status.workspaces.length, "one card per workspace in the payload");
      assert.ok(status.workspaces.length >= 2, "…and the fixture really published more than one");
      for (const workspace of status.workspaces) {
        const card = cards.find((candidate) => textOf(candidate).includes(workspace.projectRoot));
        assert.ok(card, `a card carries ${workspace.name}'s projectRoot`);
        assert.ok(textOf(card).includes(workspace.name ?? workspace.workspaceId), "…and its name");
        assert.equal(
          findAll(card, (node) => node.props?.["aria-hidden"] === "true" && String(node.props?.className ?? "").includes("rounded-full")).length,
          1,
          "…and its mesh-enabled dot",
        );
      }
    },
  },
  {
    case: "R2",
    region: "the Milestones list",
    fact: "one card per milestone, with its status ring, chip, progress track and story dots",
    check(app, { status }) {
      const section = sectionNamed(app.tree(), "Milestones");
      assert.ok(section, "the Milestones list is rendered");
      const milestones = status.items.filter((item) => item.type === "milestone");
      const cards = app.cards();
      assert.equal(cards.length, milestones.length, "one card per milestone in the payload");
      for (const card of cards) {
        assert.equal(findAll(card, (node) => node.props?.role === "img").length >= 1, true, "…its status ring");
        assert.equal(
          findAll(card, (node) => String(node.props?.className ?? "").includes("rounded-full px-2.5 py-0.5 text-xs font-semibold")).length,
          1,
          "…its status chip",
        );
        assert.equal(
          findAll(card, (node) => String(node.props?.className ?? "").includes("h-1.5 w-full")).length,
          1,
          "…its progress track",
        );
        assert.ok(textOf(card).includes("—") || findAll(card, (node) => node.props?.role === "img").length > 1, "…and its story-dot row");
      }
    },
  },
  {
    case: "R3",
    region: "the Nodes panel",
    fact: "one row per node in the global roster, with its role, freshness and current work",
    check(app, { status }) {
      const section = sectionNamed(app.tree(), "Nodes");
      assert.ok(section, "the Nodes panel is rendered");
      assert.ok(status.nodes.length >= 1, "the fixture published a node roster");
      const text = visibleTextOf(section);
      assert.ok(text.startsWith(`Nodes ${status.nodes.length} node`), `its summary counts the roster (got ${JSON.stringify(text.slice(0, 40))})`);
      for (const node of status.nodes) {
        assert.ok(text.includes(node.nodeId), `…and it names ${node.nodeId}`);
        assert.ok(text.includes(node.role), "…with its role");
      }
      assert.ok(/never seen|last seen/.test(text), "…its freshness");
      assert.ok(/idle|running|working/.test(text), "…and its current-work line");
    },
  },
  {
    case: "R4",
    region: "the Diagnostics region",
    fact: "the projection's freshness, its skipped workspaces and its errors",
    check(app) {
      const section = sectionNamed(app.tree(), "Diagnostics");
      assert.ok(section, "the Diagnostics region is rendered");
      const text = visibleTextOf(section);
      assert.match(text, /Projection: (updated|no snapshot yet)/, "the projection's freshness");
      assert.match(text, /\d+ disabled\/skipped workspaces?/, "…its skipped workspaces");
      assert.match(text, /\d+ descriptor errors?/, "…and its errors");
    },
  },
  {
    case: "the shared chip primitive",
    region: "a card carrying an assignment",
    fact: "its assignment chip, with the same pill shape and the same tone as before — `runChipClasses` survived the deletion",
    assign: true,
    check(app) {
      const chips = findAll(app.tree(), (node) => String(node.props?.title ?? "").startsWith("assignment "));
      assert.equal(chips.length, 1, "the assigned card renders exactly one assignment chip");
      // The pill shape and the tone map are `runChipClasses`'s own output, byte for byte.
      // A deletion that had taken the shared helper with `RunStateChip` would fail here.
      assert.equal(
        chips[0].props.className,
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-semibold border-border bg-muted text-muted-foreground",
        "…with the SAME pill shape and the SAME `muted` tone the run chip's map paints",
      );
      assert.ok(visibleTextOf(app.tree()).includes("assigned → worker-a"), "…and it still names its target");
    },
  },
  {
    case: "the one mutation affordance",
    region: "a card's assign row",
    fact: "its node picker and its action, still able to mint an assignment",
    check(app, { titles }) {
      const affordance = app.cardByTitle(titles.A);
      assert.ok(affordance, "the card renders its assign row");
      assert.deepEqual(affordance.rowChildTypes, ["select", "button"], "…still exactly `select · button` (DG-13's locked membership)");
      assert.deepEqual(affordance.options, ["worker-a"], "…fed from the REAL roster");
      assert.equal(affordance.actionLabel, "Assign →", "…with its action at rest");
    },
    // "still able to mint" is a MUTATION, so it is driven through the affordance and read
    // back out of the real store rather than off the button's label.
    async after(app, { home, workspaceIdA, titles }) {
      const affordance = app.cardByTitle(titles.A);
      await affordance.choose("worker-a");
      await affordance.click();
      const rows = await readAssignmentRows({ home }, workspaceIdA, "18");
      assert.equal(rows.length, 1, "the click really minted an assignment in the REAL store");
      assert.equal(rows[0].target_node_id, "worker-a", "…against the node the row named");
    },
  },
  {
    case: "the surface's slot contribution",
    region: "the top bar",
    fact: "the scope control, the freshness legend and the ⟳ refresh, in that order",
    check(app) {
      const slot = findAll(
        app.tree(),
        (node) => String(node.props?.className ?? "") === "flex items-center gap-3 text-xs text-muted-foreground",
      )[0];
      assert.ok(slot, "the fleet still contributes into the shell's surface slot");
      const order = findAll(slot, (node) =>
        (node.props?.role === "group" && node.props?.["aria-label"] === "Scope")
        || node.props?.["aria-label"] === "Legend"
        || node.props?.["aria-label"] === "Refresh the fleet view")
        .map((node) => node.props["aria-label"]);
      assert.deepEqual(order, ["Scope", "Legend", "Refresh the fleet view"], "…in that order");
    },
  },
];

// --- scenario 6's enumeration -------------------------------------------------
//
// "The suites that mount the REAL component are green in the same run" is a property of the
// RUN, and the checkable form of it is: these suites are IN the run, and none of them has
// been emptied or broken at module level by the deletion. Both halves are asserted below —
// registration is read out of `scripts/test.mjs`'s own source (the same filename-based check
// `acd-test-suite-registration` makes), and each module is imported and its exported array
// counted. The m45 cross-link FLEET lane, which the feature names separately, IS executed.
//
// WHY THEY ARE NOT RE-RUN HERE, corrected 2026-08-11 (F-47-01-QA-9). The first draft of this
// note justified the choice on COST — "running them would double a multi-minute suite" — and
// that was false: QA ran all nine and measured **57 seconds, all green**. A justification
// that is wrong is worse than none, because it stops the next author checking, so here is
// the real one and it is not about cost.
//
// RE-RUNNING THEM ADDS ZERO SIGNAL TO THE RUN. These suites are registered, so if any of
// them is red the run is red — which is precisely and exhaustively what "green in the same
// run" asserts. Executing them again inside this lane would not change whether the run
// fails; it would only change WHERE one failure is reported, printing every fault twice for
// one cause. That is a real cost (a red `fleet-assign-row-geometry` would also indict a lane
// about wire types) and it buys nothing.
//
// THE CONTRAST WITH SCENARIO 3 IS THE POINT, and it is why that lane DOES execute task 00's
// whole feature. Scenario 3 is a SEQUENCING LOCK: its claim is that this deletion may not
// land in a tree where task 00 is red, so the two must be joined in ONE assertion or the
// ordering is a note rather than a gate. Here the claim is a regression check over suites
// that are already gates in their own right. Different claims, different instruments.
//
// What registration alone would NOT catch is a suite that is registered but empty, or whose
// export was renamed so the runner imports `undefined` and spreads nothing. Both holes are
// closed below by importing each module and counting its lanes.
const REAL_COMPONENT_SUITES = [
  "test/ui/fleet-assign-acknowledgment.test.mjs",
  "test/ui/fleet-assign-affordance.test.mjs",
  "test/ui/fleet-assign-row-geometry.test.mjs",
  "test/mesh/ui/mesh-ui-assign-item-workspace.test.mjs",
  "test/ui/shell-regions.test.mjs",
  "test/ui/shell-entry-plan.test.mjs",
  "test/ui/board-freshness-legend.test.mjs",
  "test/ui/board-freshness-ramp.test.mjs",
  "test/ui/board-provenance-attribution.test.mjs",
];

export const fleetBoardsBranchDeletedTests = [
  // ══════════════════════════════════════════════════════════════════════════
  // Scenario Outline: the local-shape payload renders no boards region, and the page
  // still stands. (6 rows)
  // ══════════════════════════════════════════════════════════════════════════
  ...LOCAL_SHAPE_ROWS.map((row) => ({
    name: `fleet-boards-branch-deleted/01 the local-shape payload renders no boards region and the page still stands — ${row.case} (01 scenario 1)`,
    async run() {
      await withFleetBoards(row.fixture, async (app, { payload }) => {
        assert.deepEqual(payload.boards.map((board) => board.ref), row.boards, "the REAL producer handed this surface exactly the boards the row names");
        if (row.assertPayload) row.assertPayload(payload);

        const tree = app.tree();
        assert.ok(tree, "the surface does not throw: the mount settles and a tree is rendered");
        assert.ok(visibleTextOf(tree).length > 0, "…and it is not a blank document");

        assert.equal(regionHeaders(tree).includes("Boards"), false, "no \"Boards\" region header is rendered");
        for (const ref of row.boards) {
          assert.equal(visibleTextOf(tree).includes(ref), false, `no board tile is rendered for "${ref}"`);
        }
        assert.equal(visibleTextOf(tree).includes(PLACEHOLDER), false, `no "${PLACEHOLDER}" placeholder is rendered`);
        assert.equal(
          app.drillIns().length,
          app.cards().length,
          `no "${AT_REST}" control is rendered for any board in that payload — every board-opening affordance belongs to a MILESTONE card (${app.cards().length} of them)`,
        );

        const state = assertOneDocumentedState(tree, row.case);
        if (row.expectState) assert.equal(state, row.expectState, `…and it is the ${row.expectState} state`);

        assert.ok(
          scopeControl(tree),
          "the top bar's scope control is still mounted, as `acd-mesh-ui-scope-visible` has required in EVERY page state since m34",
        );
      });
    },
  })),

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario Outline: no anchor the fleet renders names a board address, in any state.
  // (6 rows)
  //
  // THE COUNTS ARE THE ASSERTION, and the sweep clause is knowingly vacuous where a count
  // is zero — the m45 amendment (QA F-45-04-QA-1) made exactly this correction to exactly
  // this sweep, and the reading it delivered is the stronger one: an anchor APPEARING is as
  // loud as one disappearing. Measured at m45, `ui/src/fleet/` rendered exactly ONE anchor
  // in total — the local-board drill-in — and this task deletes it, so ZERO is the true
  // value for every state.
  //
  // THE LAST THEN IS THE NON-VACUITY GUARD for the whole scenario: a surface with no board
  // affordance at all would satisfy every anchor clause trivially. Tying the count of board
  // controls to the count of milestone cards is what keeps "no anchors" from being satisfied
  // by "no way into a board".
  // ══════════════════════════════════════════════════════════════════════════
  ...ANCHOR_SWEEP_ROWS.map((row) => ({
    name: `fleet-boards-branch-deleted/01 no anchor the fleet renders names a board address — ${row.case} (01 scenario 2)`,
    async run() {
      await row.mount(async (app) => {
        const tree = app.tree();
        const hrefs = anchorsIn(tree);
        assert.equal(hrefs.length, 0, `the anchor count for this state is exactly 0 (got ${JSON.stringify(hrefs)})`);
        for (const href of hrefs) {
          assert.equal(/\/board(?![\w-])/.test(String(href)), false, "not one collected href has a pathname naming a board");
          assert.equal(/[?&]mode=/.test(String(href)), false, "not one collected href names a `mode` parameter");
        }

        const drillIns = app.drillIns();
        const cards = app.cards();
        assert.equal(
          drillIns.length,
          cards.length,
          "every board-opening affordance on screen is a control, and the number of them equals the number of milestone cards rendered",
        );
        for (const drillIn of drillIns) {
          assert.equal(drillIn.props?.href, undefined, "…and it carries no href");
          assert.equal(drillIn.type, "button", "…because it is a control, not an anchor");
        }
      });
    },
  })),

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: at the deletion, the surviving door still opens a board — THE SEQUENCING
  // LOCK, asserted in the SAME run as the deletion because that is the only run in which
  // it can be false.
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "fleet-boards-branch-deleted/01 at the deletion, the surviving door still opens a board — task 00's whole feature is green in this same run (01 scenario 3)",
    async run() {
      // (a) the door itself, driven once here so this lane makes its own measurement.
      await withTwoWorkspaceAssignFixture(async ({ url, titles, workspaceIdA }) => {
        await withFleetApp({ url, search: "?scope=global" }, async (app) => {
          const cards = app.cards().length;
          assert.ok(cards > 0, "the deletion is in the tree and the fleet still renders milestone cards");
          assert.equal(app.drillIns().length, cards, "…each with a board affordance, so the surface offers a way into a board");

          await app.drillInByTitle(titles.A).click();
          const resolves = app.requestsMatching("/api/mesh/board-url");
          assert.equal(resolves.length, 1, "the drill-in still resolves through GET /api/mesh/board-url");
          const params = new URL(resolves[0].url).searchParams;
          assert.equal(params.get("workspaceId"), workspaceIdA, "…carrying that card's own workspace");
          assert.equal(params.get("ref"), "18", "…and its own ref");

          const navigations = app.navigations();
          assert.equal(navigations.length, 1, "the operator still lands somewhere");
          const origin = new URL(navigations[0]).origin;
          assert.notEqual(origin, new URL(url).origin, "…on the board's OWN origin, not the fleet's");
          const list = await fetch(new URL("/api/work/list", origin));
          assert.equal(list.status, 200, "…which still answers /api/work/list with 200");

          // …and no state of this delivery offers a board affordance that DEAD-ENDS: there
          // is no anchor on the surface at all, so there is nothing left to hard-code.
          assert.deepEqual(anchorsIn(app.tree()), [], "there is no board affordance that can dead-end — the fleet renders no anchor");
        });
      });

      // (b) TASK 00'S WHOLE FEATURE, executed here. This is the lock: task 01's deletion may
      // not land in a tree where task 00 is red, and "in the same run" is the only way to say
      // that as an assertion rather than as an ordering note.
      const failures = [];
      for (const lane of fleetBoardDrillInTests) {
        try {
          await lane.run();
        } catch (error) {
          failures.push(`${lane.name}\n    ${String(error.message).split("\n")[0]}`);
        }
      }
      assert.deepEqual(
        failures,
        [],
        `task 00's whole feature must be green in this same run — the fleet has exactly one way into a board, and it works. RED lanes:\n  ${failures.join("\n  ")}`,
      );
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: the boards producer and the CLI face are untouched. THE DELETION IS OF A DEAD
  // UI BRANCH, NOT OF A PRODUCT FEATURE — without this scenario "the boards region is gone"
  // reads as "aof lost boards", and the distinction is the entire justification of ADR-006.
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "fleet-boards-branch-deleted/01 the boards producer and the CLI face are untouched (01 scenario 4)",
    async run() {
      await withMeshStatusBoards({ local: "lark-guard", peer: "vista-app-web" }, async ({ repo }) => {
        const env = { ...process.env, NODE_NO_WARNINGS: "1", AOF_GLOBAL_HOME: path.join(repo, "global-home") };

        const json = await spawnCliAsync(process.execPath, [cliPath, "mesh", "status", "--json"], { cwd: repo, env });
        assert.equal(json.status, 0, `\`aof mesh status --json\` exits 0 (stderr: ${json.stderr})`);
        const payload = JSON.parse(json.stdout);
        assert.ok(Array.isArray(payload.boards), "its payload still carries a `boards` aggregate");
        assert.equal(payload.boards.length, 2, "…with both boards in it");

        const local = payload.boards.find((board) => board.ref === "lark-guard");
        const peer = payload.boards.find((board) => board.ref === "vista-app-web");
        assert.equal(local.local, true, "the board this node owns still carries `local: true`");
        assert.equal(local.owner, BOARDS_FIXTURE_LOCAL_NODE, "…attributed to this node");
        assert.equal(Object.hasOwn(peer, "local"), false, "…and the peer board still omits the marker entirely");
        assert.equal(peer.owner, BOARDS_FIXTURE_PEER_NODE, "…attributed to its own owner");

        const human = await spawnCliAsync(process.execPath, [cliPath, "mesh", "status"], { cwd: repo, env });
        assert.equal(human.status, 0, `\`aof mesh status\` exits 0 (stderr: ${human.stderr})`);
        const lines = human.stdout.trim().split(/\r?\n/);
        assert.ok(lines.includes("BOARDS"), "the rendered output still holds its Boards section");

        // "Nothing about that output changed with this deletion", stated as a CROSS-CHECK of
        // the two faces rather than a golden string: the Boards block the human render emits
        // is exactly what the SAME payload's rows say it should be — ref, owner and running
        // count, one line each. A change on either side breaks it.
        const expected = payload.boards.map((board) => `${board.ref} on ${board.owner} — running ${board.activeRuns.length}`);
        assert.deepEqual(
          lines.slice(lines.indexOf("BOARDS") + 1),
          expected,
          "…naming both boards, their owners and their running counts, exactly as the --json payload's rows imply",
        );
      });
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario Outline: every region the real face can reach still renders exactly as before.
  // (7 rows) — the claim that makes this a deletion of dead code rather than a change of
  // behaviour.
  // ══════════════════════════════════════════════════════════════════════════
  ...REGION_ROWS.map((row) => ({
    name: `fleet-boards-branch-deleted/01 every region the real face can reach still renders exactly as before — ${row.case}: ${row.region} (01 scenario 5)`,
    async run() {
      await withTwoWorkspaceAssignFixture(async ({ url, home, titles, workspaceIdA }) => {
        if (row.assign) await sameOriginAssign(url, "18", "worker-a", workspaceIdA);
        const status = await (await fetch(new URL("/api/mesh/status?scope=global", url))).json();
        await withFleetApp({ url, search: "?scope=global" }, async (app) => {
          assert.deepEqual(
            regionHeaders(app.tree()),
            REGIONS,
            "the page settled into its populated state with every region mounted",
          );
          row.check(app, { status, titles });
          if (row.after) await row.after(app, { home, workspaceIdA, titles });
        });
      });
    },
  })),

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: the wire types that lost their last reader leave with it, and the tree still
  // builds and still runs.
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "fleet-boards-branch-deleted/01 the orphaned wire types leave cleanly — `npm --prefix ui run build` is green and the surface still mounts (01 scenario 6)",
    async run() {
      // GUARD-IF-PRESENT, the house ethos for a lane that shells a toolchain: without the
      // ui/ dependency tree there is nothing to build, and a lane that failed for that would
      // be reporting on the checkout rather than on the code.
      const uiModules = path.join(repoRoot, "ui", "node_modules");
      assert.ok(existsSync(uiModules), `the ui dependency tree is present at ${uiModules} — install it before running this lane`);

      const build = spawnSync("npm", ["--prefix", "ui", "run", "build"], {
        cwd: repoRoot,
        encoding: "utf8",
        shell: process.platform === "win32",
        env: { ...process.env, NODE_NO_WARNINGS: "1" },
      });
      const output = `${build.stdout ?? ""}${build.stderr ?? ""}`;
      assert.equal(
        build.status,
        0,
        `\`tsc -b\` completes with no error — no surviving reader names a type that is gone, and no deleted type is still exported for nobody.\n${output}`,
      );
      assert.doesNotMatch(output, /error TS\d+/, `…and tsc named no error:\n${output}`);
      assert.match(output, /built in/, `and the bundle builds:\n${output}`);

      // The bundle really landed, and it really carries this surface.
      const indexHtml = path.join(repoRoot, "ui", "dist", "index.html");
      assert.ok(existsSync(indexHtml), "…writing its index.html");
      const html = await readFile(indexHtml, "utf8");
      const assetMatch = html.match(/src="([^"]*index-[^"]*\.js)"/);
      assert.ok(assetMatch, "…and naming its built entry chunk");
      const bundle = await readFile(path.join(repoRoot, "ui", "dist", assetMatch[1].replace(/^\//, "")), "utf8");
      assert.ok(bundle.includes("Open board"), "…which still carries the fleet surface's own drill-in copy");
      assert.equal(bundle.includes(PLACEHOLDER), false, `…and no longer carries "${PLACEHOLDER}" — the deleted region is out of the shipped bundle too`);

      // The built fleet surface still mounts and renders its regions.
      await withTwoWorkspaceAssignFixture(async ({ url }) => {
        await withFleetApp({ url, search: "?scope=global" }, async (app) => {
          assert.deepEqual(regionHeaders(app.tree()), REGIONS, "the fleet surface still mounts and renders its regions");
        });
      });

      // The suites that mount the REAL component are IN this run, and none of them was
      // emptied or broken at module level by the deletion.
      // 119/03 — registration is transitive now (the runner names directories, each directory's
      // index names its own suites), so the membership question goes to the registration surface.
      // The claim is the same one: these suites are IN this run, or the run is red.
      const registered = await registeredSuitePaths(repoRoot);
      const unregistered = REAL_COMPONENT_SUITES.filter((suite) => !registered.has(suite));
      assert.deepEqual(unregistered, [], "every suite that mounts the REAL component is registered — so it is green IN THIS RUN or the run is red");
      for (const suite of REAL_COMPONENT_SUITES) {
        // Each row is a REPO-relative path, so it is resolved from the repo root. Taking the
        // basename and resolving it beside this file was only ever right while every suite sat
        // flat in `test/`; three of these now live two directories away.
        const mod = await import(new URL(`../../${suite}`, import.meta.url).href);
        const arrays = Object.values(mod).filter((value) => Array.isArray(value));
        assert.equal(arrays.length, 1, `${suite} exports exactly one runner array`);
        assert.ok(arrays[0].length > 0, `${suite} still carries lanes (it was not emptied by the deletion)`);
      }

      // …and the m45 cross-link suite still runs a FLEET lane and PASSES it: the evidence for
      // the board drill-in moved onto the surviving route-resolved one rather than leaving
      // with the branch it used to guard.
      const { inAppCrossLinksTests } = await import("./in-app-cross-links.test.mjs");
      const fleetLane = inAppCrossLinksTests.find((lane) => lane.name.includes("the fleet renders NO board affordance"));
      assert.ok(fleetLane, "the m45 cross-link suite still carries a FLEET lane");
      await fleetLane.run();
    },
  },
];
