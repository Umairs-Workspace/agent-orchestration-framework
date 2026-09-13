// Traceability wiring for milestone 49 / story 04, task 01 —
// `stories/04_story_route-becomes-the-home/tasks/01_the-page-states.feature`
// (@ui @work @design). Its LAST scenario is `@uat`: the pixels, the dashed card's exact
// geometry, the spacing and the ramp are a human's verdict against DESIGN §S1's binding
// checklist, and nothing in this file asserts a pixel.
//
// WHY THIS PAGE'S EMPTY STATE IS THE ORDINARY ONE, and why that makes this the milestone's
// first impression. A presence session record is written only where a workspace wires the
// assistant's session hooks, and the shipped bundle wires them for CODEX only. Measured on the
// live three-node fleet at refine: all three report an empty index while two report a non-empty
// `activeRuns`. So the state an operator actually MEETS is E2 — "runs in flight, nothing
// reporting" — and a bare `No live sessions.` would be true of the array and false about the
// world. E1 and E2 are two states because they are two facts.
//
// TWO LANES, and which claim goes in which is deliberate:
//   · SELECTOR + COPY facts — which state, which sentence, which count — are driven over the
//     framework-free `ui/src/home/page-state.mjs` under plain `node`, exhaustively.
//   · RENDERED facts — the card's classes, the anchor's href, the one `<h1>`, the slot's home,
//     "no second bar" — are driven through the MOUNT harness against a REAL fixture face, which
//     reads the rendered tree rather than a source file. A link composed at runtime from a
//     variable satisfies every source-text gate and can still be wrong; that is the precedent
//     `test/ui/in-app-cross-links.test.mjs` set and it is why these are not source assertions.
//
// ISOLATION. No store, no database, no mesh. The face binds `port: 0` and the lane reads back
// `address().port` — `:4181` and `:4182` are held by live daemons on this machine and NO LANE
// BINDS A FIXED PORT.
import assert from "node:assert/strict";
import http from "node:http";
import {
  HOME_E1_LINES,
  HOME_E2_WHY,
  HOME_EMPTY_CARD_CLASS,
  HOME_EXIT_HREF,
  HOME_EXIT_LABEL,
  HOME_HEADING,
  HOME_LOADING_LINE,
  HOME_PAGE_STATE_E1,
  HOME_PAGE_STATE_E2,
  HOME_PAGE_STATE_ERROR,
  HOME_PAGE_STATE_LIST,
  HOME_PAGE_STATE_LOADING,
  HOME_PAGE_STATE_POPULATED,
  HOME_PAGE_STATES_WITH_PAYLOAD,
  HOME_POLL_MS,
  activeRunCount,
  countedPhrase,
  homeEmptyCopy,
  homeFaultMessage,
  homePageState,
  homeSlotSummary,
} from "../../ui/src/home/page-state.mjs";
import { withShellComposedHome, findAll, textOf } from "../support/shell-app-harness.mjs";

const NOW = "2026-08-13T09:00:00.000Z";
const ADDRESS = (pathname = "/") => ({ pathname, search: "", hash: "" });

// ── the payload, shaped exactly as `/api/mesh/status` serves it ─────────────────────────────
const payload = ({ sessions = [], nodes = [] } = {}) =>
  ({ scope: "global", workspaces: [], items: [], nodes, sessions, diagnostics: {} });

// A node the registry calls LIVE, carrying its presence record. `activeRuns` is the field the
// E1/E2 discriminator reads and `buildSessionIndex` never does.
const node = (nodeId, { freshness = "live", runs = [] } = {}) => ({
  nodeId,
  freshness,
  presence: { nodeId, heartbeatAt: NOW, activeRuns: runs, sessions: [], aofVersion: "0.1.0" },
});

// A node that has NEVER beaten omits `presence` entirely — the m23 locked rule, not a fabricated
// empty record.
const neverBeat = (nodeId) => ({ nodeId, freshness: "unknown" });

// An index row, in m48's frozen entry order.
const session = (nodeId, sessionId, workItem = null) => ({
  nodeId,
  sessionId,
  workspaceId: "workspace-a",
  repo: "demo",
  assistant: "codex",
  lastPingAt: NOW,
  workspaceHasRun: true,
  workItem,
});

const QUIET_FLEET = payload({ nodes: [node("aof-control"), node("aof-wsl")] });
const RUNS_IN_FLIGHT = payload({ nodes: [node("aof-control", { runs: ["r1"] })] });
const ONE_SESSION = payload({ nodes: [node("aof-control")], sessions: [session("aof-control", "sess-A")] });

const FAULT = "the global mesh store is unavailable";

// ── the fixture face ────────────────────────────────────────────────────────────────────────
//
// A REAL server on an ephemeral port answering the ONE route this surface reads. `failures`
// refuses the first N requests, which is how the FIRST-fetch failure and the Retry that clears
// it are both reachable in one lane.
//
// THE THREE WAYS THIS CAN GO WRONG ARE ALL REACHABLE, because the page says something different
// in each and only one of them was ever driven (QA F4):
//   `fault: "coded"`        — the fleet face's own `{ ok:false, error, code, path }` envelope.
//   `fault: "unparseable"`  — a refusal whose body is NOT JSON (an HTML 502 from a proxy, a
//                             truncated write). There IS no coded sentence to read.
//   `refuseConnections`     — the face is listening and destroys every socket: a genuine
//                             TRANSPORT rejection, so `fetch` rejects and there is no response
//                             at all. Nothing in the response path ever runs.
//   `failAfter: n`         — the MIRROR IMAGE of `failures`, added 2026-08-13 for GAP-7's second
//                            half: the first n requests succeed and every one after them is
//                            refused. That is the only way to reach a poll that fails while
//                            last-known content is on screen — the F-49-04-b case, which was
//                            ruled correct AS BUILT and which rule R-3 must NOT collapse into the
//                            failed page state.
async function withHomeFace({ status = QUIET_FLEET, failures = 0, failAfter = null, fault = "coded", refuseConnections = false } = {}, body) {
  let current = status;
  let remaining = failures;
  let served = 0;
  const server = http.createServer((request, response) => {
    // ONLY the status route is scripted. Every other `/api/*` path is the fleet face's own 404
    // (ui-serve.mjs: "any other /api/* path … is a 404") — which since 2026-09-12 includes the
    // shell's nav probe of `/api/fleet-origin` (DG-45-5's producer, ShellNav.tsx). Counting that
    // probe here would spend a `failures` budget on a request the lane never scripted, and the
    // status fetch it meant to fail would then succeed.
    if (new URL(request.url ?? "/", "http://127.0.0.1").pathname !== "/api/mesh/status") {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: false, error: "not found", code: "not-found" }));
      return;
    }
    served += 1;
    if (Number.isInteger(failAfter) && served > failAfter) remaining += 1;
    if (remaining > 0) {
      remaining -= 1;
      if (fault === "unparseable") {
        // Content-type says JSON and the body is not — the shape a reverse proxy or a truncated
        // write produces, and the one where `response.json()` itself throws.
        response.writeHead(502, { "content-type": "application/json" });
        response.end("<html><body>502 Bad Gateway</body></html>");
        return;
      }
      response.writeHead(503, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: false, error: FAULT, code: "global-store-unavailable", path: "/tmp/mesh.db" }));
      return;
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(current));
  });
  if (refuseConnections) server.on("connection", (socket) => socket.destroy());
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    return await body({ url, serve: (next) => { current = next; }, served: () => served });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

// Mount the REAL home inside the REAL shell against that face.
const mount = (options, fn) =>
  withShellComposedHome({ routeId: "landing", address: ADDRESS("/"), identity: "aof", viewportWidth: 1280, ...options }, fn);

// Every className in a subtree, joined — how a lane asks "is anything in this card red?".
const classesOf = (node) => findAll(node, () => true).map((child) => String(child.props?.className ?? "")).join(" ");

const GRID_TRACK = "grid-cols-[repeat(auto-fill";

export const terminalsHomePageStatesTests = [
  // ======================================================================
  // Scenario Outline 1: ONE selector answers for every payload the face can serve
  // ======================================================================
  {
    name: "home-states/01 one selector answers for every payload the face can serve, never throws, and is stable under re-reading (01 scenario 1, all 16 rows)",
    run() {
      const rows = [
        // ── the four states DESIGN §S1 fixes ────────────────────────────────────────────────
        ["the very first fetch is still out", { loading: true, error: null, status: null }, HOME_PAGE_STATE_LOADING],
        ["the first fetch failed", { loading: false, error: FAULT, status: null }, HOME_PAGE_STATE_ERROR],
        ["a quiet fleet", { loading: false, error: null, status: QUIET_FLEET }, HOME_PAGE_STATE_E1],
        ["runs in flight, nothing reporting", { loading: false, error: null, status: RUNS_IN_FLIGHT }, HOME_PAGE_STATE_E2],
        ["sessions to show", { loading: false, error: null, status: ONE_SESSION }, HOME_PAGE_STATE_POPULATED],

        // ── precedence, stated so it is not discovered ──────────────────────────────────────
        ["loading wins over a stale error", { loading: true, error: FAULT, status: null }, HOME_PAGE_STATE_LOADING],
        ["an error wins over an empty payload", { loading: false, error: FAULT, status: QUIET_FLEET }, HOME_PAGE_STATE_ERROR],
        [
          "an error wins over a populated payload",
          { loading: false, error: FAULT, status: payload({ sessions: [session("a", "s1"), session("b", "s2")] }) },
          HOME_PAGE_STATE_ERROR,
        ],

        // ── malformed and adversarial — every one answers, none throws ──────────────────────
        // THE TWO `status`-ABSENT ROWS ARE A DELIBERATE READING: no payload has ever arrived, so
        // the honest answer is "still asking". Answering E1 there would assert "nothing is
        // running" about a fleet nobody has heard from.
        ["no payload key at all", { loading: false, error: null }, HOME_PAGE_STATE_LOADING],
        ["a null payload", { loading: false, error: null, status: null }, HOME_PAGE_STATE_LOADING],
        ["the index key is missing", { loading: false, error: null, status: { nodes: [] } }, HOME_PAGE_STATE_E1],
        ["the index is not an array", { loading: false, error: null, status: { sessions: "none", nodes: [] } }, HOME_PAGE_STATE_E1],
        ["the index holds a non-object", { loading: false, error: null, status: { sessions: ["sess-A"], nodes: [] } }, HOME_PAGE_STATE_E1],
        // A HALF-TUPLE ROW. `buildSessionIndex` skips anonymous sessions, so this should be
        // unreachable on the wire — which is exactly why it needs a row: an unreachable shape is
        // one nobody drives, and the guard that refuses it is then absent rather than merely
        // untested (QA F3, mutation M10). A row that cannot be ADDRESSED is not a pane, and the
        // same predicate feeds the G0 summary story 05 wires to real counts, so counting one
        // would put a number on screen for a session no socket can ever reach.
        ["the index holds a half-tuple row", { loading: false, error: null, status: { sessions: [{ nodeId: "a" }], nodes: [] } }, HOME_PAGE_STATE_E1],
        ["…and the mirror image, a row with only a sessionId", { loading: false, error: null, status: { sessions: [{ sessionId: "sess-A" }], nodes: [] } }, HOME_PAGE_STATE_E1],
        ["…and an EMPTY id, which is a string and still not addressable", { loading: false, error: null, status: { sessions: [{ nodeId: "a", sessionId: "" }], nodes: [] } }, HOME_PAGE_STATE_E1],
        ["the nodes key is missing", { loading: false, error: null, status: { sessions: [] } }, HOME_PAGE_STATE_E1],
        ["a node with no presence record", { loading: false, error: null, status: payload({ nodes: [neverBeat("aof-wsl")] }) }, HOME_PAGE_STATE_E1],
        [
          "`activeRuns` is not an array",
          { loading: false, error: null, status: payload({ nodes: [{ nodeId: "n", freshness: "live", presence: { activeRuns: NOW } }] }) },
          HOME_PAGE_STATE_E1,
        ],
      ];

      for (const [label, context, expected] of rows) {
        let answer;
        assert.doesNotThrow(() => { answer = homePageState(context); }, `${label}: no error is thrown`);
        assert.equal(answer, expected, `${label}: the state`);
        assert.equal(homePageState(context), answer, `${label}: re-reading the identical input returns the identical answer`);
        assert.ok(HOME_PAGE_STATE_LIST.includes(answer), `${label}: the answer is a member of the closed set`);
      }

      // TOTAL means TOTAL: the shapes a caller can produce by accident answer too.
      for (const hostile of [null, undefined, "loading", 7, [], { status: 5 }, { status: "" }]) {
        assert.doesNotThrow(() => homePageState(hostile), `${JSON.stringify(hostile)}: answers rather than throwing`);
        assert.ok(HOME_PAGE_STATE_LIST.includes(homePageState(hostile)));
      }

      // EVERY MALFORMED ROW FAILS TOWARD E1 rather than toward E2: E2 makes a POSITIVE claim
      // ("there are runs in flight"), and a claim built on a shape we could not parse is exactly
      // the lie-by-omission this page exists to refuse.
      const malformed = rows.slice(10).map(([, context]) => homePageState(context));
      assert.deepEqual([...new Set(malformed)], [HOME_PAGE_STATE_E1], "every malformed shape lands on E1, never on E2 and never on the failed state");
    },
  },

  // ======================================================================
  // Scenario Outline 2: the page shows ONE state and nothing beside it
  // ======================================================================
  {
    name: "home-states/01 the page shows exactly ONE state treatment and nothing beside it — never two, never a state plus a partial grid (01 scenario 2, all five rows)",
    async run() {
      const cases = [
        [HOME_PAGE_STATE_LOADING, { status: QUIET_FLEET }, { settle: "render", holdFromStart: "/api/mesh/status" }],
        [HOME_PAGE_STATE_ERROR, { status: QUIET_FLEET, failures: 1 }, {}],
        [HOME_PAGE_STATE_E1, { status: QUIET_FLEET }, {}],
        [HOME_PAGE_STATE_E2, { status: RUNS_IN_FLIGHT }, {}],
        [HOME_PAGE_STATE_POPULATED, { status: ONE_SESSION }, {}],
      ];

      for (const [expected, face, options] of cases) {
        await withHomeFace(face, async ({ url }) => {
          await mount({ url, ...options }, async (app) => {
            assert.deepEqual(app.homeStates(), [expected], `${expected}: exactly one of the five treatments is present, and it is this one`);

            // …and none of the other four is present, not even collapsed or zero-height.
            for (const other of HOME_PAGE_STATE_LIST.filter((name) => name !== expected)) {
              assert.equal(app.homeStates().includes(other), false, `${expected}: ${other} is not also in the tree`);
            }

            // No partial grid, no placeholder tile, no empty tile frame — the grid track exists
            // in exactly one state and it is the populated one.
            const grids = findAll(app.tree(), (child) => String(child.props?.className ?? "").includes(GRID_TRACK));
            assert.equal(grids.length, expected === HOME_PAGE_STATE_POPULATED ? 1 : 0, `${expected}: the grid region is ${expected === HOME_PAGE_STATE_POPULATED ? "the state itself" : "absent"}`);
            if (expected === HOME_PAGE_STATE_POPULATED) {
              // RE-AIMED 2026-08-13 by story 05, which is the story that FILLS this region. The
              // clause was `children == []` — "this story renders NO rows" — and its premise
              // expired the moment the grid landed. What survives, and what this lane was really
              // about, is that the POPULATED arm is the grid and nothing else: one region, no
              // page chrome of its own, and (below) no second treatment beside it.
              const rows = (grids[0].children ?? []).filter((child) => child?.props?.["aria-live"] == null);
              assert.equal(
                rows.length,
                1,
                "the populated arm IS the grid: one tile per addressable session on the payload (this fixture carries one), plus the grid's ONE live region and nothing else",
              );
            }
          });
        });
      }
    },
  },

  // ======================================================================
  // Scenario Outline 3: which emptiness this is, decided from the nodes' own runs
  // ======================================================================
  {
    name: "home-states/01 which emptiness this is, decided from the LIVE nodes' own runs — a stale node's frozen run is not in flight (01 scenario 3, all nine rows)",
    run() {
      const rows = [
        ["no mesh at all", payload(), HOME_PAGE_STATE_E1, null],
        ["live nodes, nobody working", payload({ nodes: [node("a"), node("b")] }), HOME_PAGE_STATE_E1, null],
        ["one live node, one run", payload({ nodes: [node("a", { runs: ["r1"] })] }), HOME_PAGE_STATE_E2, 1],
        [
          "the live fleet as measured at this refine",
          payload({ nodes: [node("a", { runs: ["r1"] }), node("b", { runs: ["r2"] }), node("c")] }),
          HOME_PAGE_STATE_E2,
          2,
        ],
        ["one node, several runs", payload({ nodes: [node("a", { runs: ["r1", "r2", "r3"] })] }), HOME_PAGE_STATE_E2, 3],
        [
          "runs spread across the fleet",
          payload({ nodes: [node("a", { runs: ["r1"] }), node("b", { runs: ["r2", "r3"] }), node("c")] }),
          HOME_PAGE_STATE_E2,
          3,
        ],
        // THE LAST THREE ROWS ARE THE LIVE-NODES-ONLY RULING. A stale node's presence file is
        // FROZEN ON DISK with its runs inside it — the exact hazard `buildSessionIndex` gates on
        // — so counting them would make this page assert "runs in flight" about a machine we
        // cannot see.
        [
          "a STALE node holding a frozen run",
          payload({ nodes: [node("a"), node("b", { freshness: "stale", runs: ["r1"] })] }),
          HOME_PAGE_STATE_E1,
          null,
        ],
        [
          "a node never seen, with a run in its record",
          payload({ nodes: [node("a"), { nodeId: "b", freshness: "unknown", presence: { activeRuns: ["r1"] } }] }),
          HOME_PAGE_STATE_E1,
          null,
        ],
        [
          "live runs beside a stale node's frozen run",
          payload({ nodes: [node("a", { runs: ["r1"] }), node("b", { freshness: "stale", runs: ["r2", "r3"] })] }),
          HOME_PAGE_STATE_E2,
          1,
        ],
      ];

      for (const [label, status, expected, count] of rows) {
        const state = homePageState({ loading: false, error: null, status });
        assert.equal(state, expected, `${label}: the state`);
        const copy = homeEmptyCopy(state, activeRunCount(status));
        assert.equal(copy.runCount, count, `${label}: the run count the copy NAMES (null = this state makes no count claim)`);
        if (count !== null) {
          // THE NOUN AGREES WITH THE NUMBER (designer's GAP-6). Spelled OUT here rather than
          // asked of `countedPhrase`: an expectation computed through the production helper moves
          // with the helper and can never fail.
          assert.ok(
            copy.lines[0].startsWith(`${count} ${count === 1 ? "run" : "runs"} in flight`),
            `${label}: …and the count is IN the sentence, agreeing with it: ${copy.lines[0]}`,
          );
        }
      }
    },
  },

  // ======================================================================
  // Scenario Outline 4: each empty state says exactly what DESIGN fixed, and prints no command
  // ======================================================================
  {
    name: "home-states/01 each empty state says exactly what DESIGN fixed, carries one link, prints NO command and is never dressed as a failure (01 scenario 4, both rows)",
    async run() {
      const rows = [
        [HOME_PAGE_STATE_E1, QUIET_FLEET, HOME_E1_LINES[0], HOME_E1_LINES[1]],
        // `1 run in flight` — the singular the LIVE PRODUCTION SCREEN got wrong (GAP-6). This
        // fixture carries exactly one run, so this row IS the singular branch.
        [HOME_PAGE_STATE_E2, RUNS_IN_FLIGHT, "1 run in flight · no session is reporting a terminal.", HOME_E2_WHY],
      ];

      for (const [expected, status, line1, line2] of rows) {
        await withHomeFace({ status }, async ({ url }) => {
          await mount({ url }, async (app) => {
            const card = app.homeState();
            assert.ok(card, `${expected}: the card is on screen`);
            assert.equal(card.props["data-home-state"], expected);

            const paragraphs = findAll(card, (child) => child.type === "p").map((child) => textOf(child).trim());
            assert.equal(paragraphs[0], line1, `${expected}: line 1 is exactly what DESIGN fixed`);
            assert.equal(paragraphs[1], line2, `${expected}: line 2 is exactly what DESIGN fixed, byte for byte`);

            // EXACTLY ONE LINK, and it carries the one label.
            const anchors = findAll(card, (child) => child.type === "a");
            assert.equal(anchors.length, 1, `${expected}: the card contains exactly one link`);
            assert.equal(textOf(anchors[0]).trim(), HOME_EXIT_LABEL, `${expected}: …labelled ${HOME_EXIT_LABEL}`);

            // NO COMMAND. Asserted as an ABSENCE over the WHOLE card rather than as "the E2 card
            // has no `aof session` line", because the failure mode is reaching for `EmptyFleet`'s
            // shape, which prints three different commands in three different branches.
            const words = textOf(card);
            for (const token of ["aof ", "config.", "npm", "node "]) {
              assert.equal(words.includes(token), false, `${expected}: the card names no command — found ${JSON.stringify(token)}`);
            }
            assert.equal(findAll(card, (child) => child.type === "code" || child.type === "pre").length, 0, `${expected}: no code block`);
            const classes = classesOf(card);
            assert.equal(/\bmono\b/.test(classes), false, `${expected}: nothing in the card is monospace-formatted`);

            // NOTHING IS DRESSED AS A FAILURE, and nothing moves.
            for (const forbidden of ["destructive", "accent", "text-red", "bg-red", "animate-pulse", "animate-spin", "aof-pending"]) {
              assert.equal(classes.includes(forbidden), false, `${expected}: the card carries no ${forbidden}`);
            }
            assert.equal(findAll(card, (child) => child.props?.role === "progressbar").length, 0, `${expected}: no spinner`);

            // THE CARD IS THE HOUSE'S DASHED EMPTY PRIMITIVE, VERBATIM — nothing appended.
            assert.equal(card.props.className, HOME_EMPTY_CARD_CLASS, `${expected}: the card class is the house's own, byte for byte`);
          });
        });
      }
    },
  },

  // ======================================================================
  // Scenario 5: the single link is a PATH link into this application
  // ======================================================================
  {
    name: "home-states/01 the one route out is a real path anchor into this application, with no legacy selector on it, and the nav is unchanged by it (01 scenario 5)",
    async run() {
      for (const status of [QUIET_FLEET, RUNS_IN_FLIGHT]) {
        await withHomeFace({ status }, async ({ url }) => {
          await mount({ url }, async (app) => {
            const exits = app.homeExits();
            assert.equal(exits.length, 1, "exactly one such link in the card — E1 and E2 differ in their words, never in their number of exits");
            const anchor = exits[0];

            assert.equal(anchor.props.href, "/fleet", "its href is exactly /fleet");
            assert.equal(anchor.props.href, HOME_EXIT_HREF, "…and it is the value the module derived from the ONE route table, not a literal typed at the call site");
            assert.equal(anchor.props.href.includes("mode"), false, "no `mode` parameter");
            assert.equal(anchor.props.href.includes("?"), false, "no query string");
            assert.equal(anchor.props.href.includes("://"), false, "no origin — it is a path");

            // A REAL ANCHOR an operator can middle-click, not a button that navigates.
            assert.equal(anchor.type, "a", "it is an anchor…");
            assert.equal(anchor.props.onClick, undefined, "…that does not navigate by script");

            // THE SHELL'S NAV IS UNCHANGED BY IT.
            assert.equal(app.navItem("landing").props["aria-current"], "page", "the landing nav item is still the current one");
            const navFleet = app.navItem("fleet");
            assert.ok(navFleet, "the nav still carries its own fleet destination…");
            assert.equal(findAll(app.homeState(), (child) => child === navFleet).length, 0, "…and it is NOT duplicated into the card");
          });
        });
      }
    },
  },

  // ======================================================================
  // Scenario 6: loading is the FIRST fetch only, and it is a line rather than a shimmer
  // ======================================================================
  {
    name: "home-states/01 loading is a muted centred LINE in the same dashed card — never a shimmer, never a skeleton, and the slot summary is present from the first paint (01 scenario 6)",
    async run() {
      await withHomeFace({ status: ONE_SESSION }, async ({ url }) => {
        await mount({ url, settle: "render", holdFromStart: "/api/mesh/status" }, async (app) => {
          const card = app.homeState();
          assert.ok(card, "the loading treatment is on screen");
          assert.equal(card.props["data-home-state"], HOME_PAGE_STATE_LOADING);

          const lines = findAll(card, (child) => child.type === "p").map((child) => textOf(child).trim());
          assert.deepEqual(lines, [HOME_LOADING_LINE], "one muted centred line, and it reads exactly `Loading sessions…`");
          assert.match(String(findAll(card, (child) => child.type === "p")[0].props.className), /text-center/, "…centred");

          // IT SITS IN THE SAME DASHED EMPTY CARD the two empty states use.
          assert.equal(card.props.className, HOME_EMPTY_CARD_CLASS, "the same card, byte for byte");

          // NO ANIMATION AT ALL. Story 06 measured that both of this house's shimmer idioms run
          // under `prefers-reduced-motion: reduce`, so a shimmer here would ship a NEW
          // accessibility defect into the milestone that exists to remove one.
          const classes = classesOf(app.tree());
          for (const forbidden of ["animate-pulse", "aof-pending", "animate-spin", "animate-"]) {
            assert.equal(classes.includes(forbidden), false, `no element in the tree carries ${forbidden}`);
          }
          assert.equal(findAll(app.tree(), (child) => String(child.props?.className ?? "").includes(GRID_TRACK)).length, 0, "no skeleton block, no placeholder tile and no reserved tile frame");

          // THE PAGE CONTRIBUTES ITS SLOT NODE IN THIS STATE TOO — a slot that only appears once
          // data arrives is missing from the state where it would be missed. The task feature's
          // clause is about the NODE, and the node is here.
          //
          // WHAT IT SAYS IS NOW RULE R-3's (designer's GAP-7, 2026-08-13). This lane used to
          // assert `0 sessions · 0 live` in the loading state, and that string is what the ruling
          // refuses: `0` is not a neutral placeholder on THIS surface — "0 sessions" is E1's
          // whole message — so asserting it before the first fetch has returned is the lie
          // DG-49-1 exists to refuse, one region up. The slot holds its place and says NOTHING.
          const summary = app.homeSummary();
          assert.ok(summary, "the surface-slot summary NODE is present from the FIRST paint");
          assert.equal(textOf(summary), "", "…and it asserts NO count before the first fetch has returned (R-3)");
          assert.equal(homeSlotSummary(HOME_PAGE_STATE_LOADING, { sessions: 0, live: 0, needInput: 0 }), null, "…which is the decision, taken in the .mjs");
          for (const forbidden of ["0", "—", "-", "…"]) {
            assert.equal(textOf(summary).includes(forbidden), false, `…and it is NOTHING AT ALL, not ${JSON.stringify(forbidden)}`);
          }
          assert.equal(findAll(summary, (child) => String(child.props?.className ?? "").includes("animate-")).length, 0, "…and no skeleton");
        });
      });
    },
  },

  // ======================================================================
  // Scenario 7: a later poll never blanks the page back to loading
  // ======================================================================
  {
    name: "home-states/01 a later poll never blanks the page back to loading — twenty consecutive polls, no intermediate frame, and a changed payload updates in place (01 scenario 7)",
    async run() {
      await withHomeFace({ status: QUIET_FLEET }, async ({ url, serve, served }) => {
        await mount({ url }, async (app) => {
          assert.deepEqual(app.homeStates(), [HOME_PAGE_STATE_E1], "the first fetch has landed and the page shows its state");
          const before = textOf(app.homeState());
          const loadsAfterMount = app.statusLoads();

          // TWENTY CONSECUTIVE POLLS, EACH READ WHILE ITS REQUEST IS STILL IN FLIGHT.
          //
          // THE FRAME IS THE WHOLE SCENARIO, AND A PLAIN `advance` NEVER REACHES IT (QA F1).
          // `app.advance(ms)` is `clock.advance(ms, flush)`, and `flush()` waits for every
          // in-flight request to land before the tree is read — so a page that DID blank to the
          // loading card on every poll would be back on its populated state by the time the
          // assertion looked, and this lane would report twenty green frames it never saw. QA
          // drove exactly that: the old sequence passed against a home that re-entered `loading`
          // on every poll. So the response is HELD, the tree is read in the window the rule is
          // about, and only then released.
          for (let poll = 1; poll <= 20; poll += 1) {
            const hold = app.holdNext("/api/mesh/status");
            await app.advanceHeld(HOME_POLL_MS);
            assert.ok(hold.claimed(), `poll ${poll}: the poll really went out and its response is genuinely held`);
            assert.deepEqual(app.homeStates(), [HOME_PAGE_STATE_E1], `poll ${poll}: still E1 WHILE the request is in flight — it does NOT return to the loading card at any point`);
            assert.equal(textOf(app.homeState()), before, `poll ${poll}: the same words, mid-flight`);
            hold.release();
            await app.flush();
            // …and unchanged again once it lands: no blank between the two frames either.
            assert.deepEqual(app.homeStates(), [HOME_PAGE_STATE_E1], `poll ${poll}: still E1 after it landed`);
            assert.equal(textOf(app.homeState()), before, `poll ${poll}: the same words, settled`);
          }
          assert.ok(app.statusLoads() >= loadsAfterMount + 20, `all twenty polls really went out: ${loadsAfterMount} → ${app.statusLoads()} status loads`);
          assert.ok(served() > 20, "…and the face really answered them");

          // …AND WHEN A POLL LANDS WITH A CHANGED PAYLOAD THE PAGE UPDATES IN PLACE, with no
          // intermediate blank frame: the very next read is the NEW state, never the loading one.
          serve(RUNS_IN_FLIGHT);
          await app.advance(HOME_POLL_MS);
          assert.deepEqual(app.homeStates(), [HOME_PAGE_STATE_E2], "the changed payload took effect in place");
          assert.match(textOf(app.homeState()), /1 run in flight/, "…with the new count in the sentence, agreeing with it (GAP-6)");
        });
      });
    },
  },

  // ======================================================================
  // Scenario 8: a payload error names the fault, offers the way back, and is not an empty state
  // ======================================================================
  {
    name: "home-states/01 a payload error NAMES the fault, reuses the fleet's failed ramp, is visibly not an empty card, and Retry leaves the state (01 scenario 8)",
    async run() {
      await withHomeFace({ status: RUNS_IN_FLIGHT, failures: 1 }, async ({ url }) => {
        await mount({ url }, async (app) => {
          const failed = app.homeState();
          assert.ok(failed, "the failed treatment is on screen");
          assert.equal(failed.props["data-home-state"], HOME_PAGE_STATE_ERROR);

          // THE FAULT IS NAMED — the server's own coded sentence, not a bare "something went
          // wrong". An operator's next move depends on which fault this is.
          const words = textOf(failed);
          assert.ok(words.includes(FAULT), `the fault is named in the message the operator reads: ${words}`);
          assert.equal(/something went wrong/i.test(words), false);

          // THE FLEET PAGE'S OWN FAILED-STATE RAMP, REUSED: the accent pill, its mark, the retry.
          const classes = classesOf(failed);
          assert.ok(classes.includes("border-accent/30") && classes.includes("bg-accent/10") && classes.includes("text-accent"), "the accent pill");
          assert.ok(findAll(failed, (child) => textOf(child).trim() === "!").length > 0, "…its mark");
          const retry = findAll(failed, (child) => child.type === "button");
          assert.equal(retry.length, 1, "…and exactly one retry control");
          assert.match(textOf(retry[0]), /Retry/);

          // VISIBLY A DIFFERENT TREATMENT from the dashed empty card — an operator can tell
          // "this failed" from "there is nothing here" without reading the words.
          assert.notEqual(failed.props.className, HOME_EMPTY_CARD_CLASS);
          assert.equal(classes.includes("border-dashed"), false, "no dashed empty primitive anywhere in the failed state");

          // THE ERROR REPLACES THE CONTENT REGION ENTIRELY: no partial grid, no half-populated
          // state beside it.
          assert.deepEqual(app.homeStates(), [HOME_PAGE_STATE_ERROR]);
          assert.equal(findAll(app.tree(), (child) => String(child.props?.className ?? "").includes(GRID_TRACK)).length, 0);

          // PRESSING RETRY RE-ISSUES THE REQUEST and, on success, the page leaves the failed
          // state for whichever of the four other states the NEW payload names — here E2, which
          // is the state the live fleet is actually in.
          const before = app.statusLoads();
          await app.retry();
          assert.ok(app.statusLoads() > before, "retry re-issued the request");
          assert.deepEqual(app.homeStates(), [HOME_PAGE_STATE_E2], "…and the page left the failed state for the one the new payload names");
        });
      });
    },
  },

  // ======================================================================
  // Scenario 8, the OTHER TWO WAYS THE FETCH CAN FAIL (QA F4)
  //
  // The row above serves a coded body every time, so it drives ONE of the three paths into the
  // failed state. The other two are the ones an operator meets when something is broken further
  // out than the mesh store — a proxy in front of the face, or a daemon that is not there — and
  // they are exactly where "names the fault, not a bare something-went-wrong" is most likely to
  // decay into nothing at all.
  // ======================================================================
  {
    name: "home-states/01 the failed state stands, names something and offers the retry when the refusal has NO readable body and when the face refuses the connection outright (01 scenario 8, the two undriven fault paths)",
    async run() {
      // (a) A REFUSAL WHOSE BODY IS NOT JSON. `response.json()` itself throws, so there is no
      // coded sentence to read and the status is all there is. The page must still be in the
      // FAILED state — never an empty one, which would say "nothing is running" about a fleet
      // that refused to answer.
      await withHomeFace({ status: QUIET_FLEET, failures: 1, fault: "unparseable" }, async ({ url }) => {
        await mount({ url }, async (app) => {
          assert.deepEqual(app.homeStates(), [HOME_PAGE_STATE_ERROR], "an unreadable refusal is a FAILURE, not an emptiness");
          const words = textOf(app.homeState());
          assert.ok(words.includes("502"), `the status is named when the body cannot be: ${words}`);
          assert.equal(/something went wrong/i.test(words), false);
          assert.equal(findAll(app.homeState(), (child) => child.type === "button").length, 1, "…and the way back is still offered");

          // …and Retry still clears it, because the recovery path must not depend on which kind
          // of refusal produced the state.
          await app.retry();
          assert.deepEqual(app.homeStates(), [HOME_PAGE_STATE_E1], "Retry leaves the failed state for whichever state the new payload names");
        });
      });

      // (b) THE FACE REFUSES THE CONNECTION. `fetch` rejects; nothing in the response path runs.
      // The page's message is the TRANSPORT error's own, which is the only thing anyone has —
      // there is no server sentence and no status.
      await withHomeFace({ status: QUIET_FLEET, refuseConnections: true }, async ({ url }) => {
        await mount({ url }, async (app) => {
          assert.deepEqual(app.homeStates(), [HOME_PAGE_STATE_ERROR], "a refused connection is a FAILURE, not an emptiness");
          const words = textOf(app.homeState()).trim();
          assert.ok(words.includes("Could not load the mesh:"), `the failed state's own framing survives: ${words}`);
          // …and it carries a fault of SOME kind rather than trailing off into the framing alone.
          // Measured here, verbatim, so the sentence an operator actually meets is on the record
          // rather than inferred: `Could not load the mesh: fetch failed`.
          const named = words.split("Could not load the mesh:")[1].replace("⟳ Retry", "").trim();
          assert.ok(named.length > 0, `the message names a fault rather than ending at the colon: ${JSON.stringify(words)}`);
          assert.notEqual(named, "Failed to load", "a transport rejection carries its OWN message — the last-resort wording is for a throw with nothing on it");
          assert.equal(/something went wrong/i.test(words), false);
          assert.equal(findAll(app.homeState(), (child) => child.type === "button").length, 1, "…and the way back is offered here too");
          // WHETHER THE TRANSPORT LIBRARY'S OWN WORDING IS ENOUGH FOR AN OPERATOR IS A COPY
          // QUESTION DESIGN HAS NOT RULED, and this lane deliberately does not settle it: it
          // pins the STATE, the framing and the exit, which are behaviour, and leaves the
          // sentence to the designer. Inventing a friendlier sentence here would be inventing
          // copy in a test — the thing DG-49-1's own restraint clause exists to refuse.
        });
      });
    },
  },

  // ======================================================================
  // Scenario 8's decision, driven DIRECTLY (architect F3)
  //
  // `homeFaultMessage` lives in the `.mjs` because WHICH sentence the operator sees is a
  // decision, and the whole reason for putting a decision there is that `node:test` can drive it
  // without a browser, a server or a mount. Until this lane existed nothing imported it — it was
  // reachable only through the harness, on the ONE path where a coded body exists, so two of its
  // three branches had no test at all and the argument for its location was undischarged.
  // ======================================================================
  {
    name: "home-states/01 the fault-naming decision, driven directly: the server's own sentence wins, else the status, else the last-resort wording (01 scenario 8, the decision)",
    run() {
      const rows = [
        ["a named coded body wins outright", { ok: false, error: FAULT, code: "global-store-unavailable" }, 503, FAULT],
        ["…even beside a status it could have used instead", { error: "workspace is not local" }, 409, "workspace is not local"],
        ["no readable body: the status is what there is", null, 502, "Request failed (502)"],
        ["a body with no `error` key is no sentence", { ok: false, code: "global-store-unavailable" }, 503, "Request failed (503)"],
        ["an empty `error` is no sentence either", { error: "" }, 503, "Request failed (503)"],
        ["neither body nor status: the last resort, spelled ONCE, here", null, undefined, "Failed to load"],
      ];
      for (const [label, body, httpStatus, expected] of rows) {
        assert.equal(homeFaultMessage(body, httpStatus), expected, label);
      }

      // TOTAL, because it runs inside the catch of the surface's only fetch and a throw there is
      // a blank page at `/`.
      for (const hostile of [undefined, "a string", 7, [], { error: 5 }, { error: null }]) {
        assert.doesNotThrow(() => homeFaultMessage(hostile, 500));
        assert.equal(typeof homeFaultMessage(hostile, 500), "string");
        assert.ok(homeFaultMessage(hostile, 500).length > 0, "it never answers with an empty sentence");
      }

      // THE LAST-RESORT SENTENCE HAS ONE HOME. It used to be typed here AND in the component's
      // catch, in the module whose own header argues against a fact with two homes; the catch now
      // asks for it. A grep that finds it twice is the defect.
      assert.equal(homeFaultMessage(null), "Failed to load");
    },
  },

  // ======================================================================
  // Scenario 9: the page contributes ONE node to the shell's slot and grows no bar of its own
  // ======================================================================
  {
    name: "home-states/01 the page contributes ONE summary node to the shell's slot — top bar at 1280, the 40px surface bar at 900 — and adds no row and no bar of its own (01 scenario 9)",
    async run() {
      await withHomeFace({ status: ONE_SESSION }, async ({ url }) => {
        const rowsAt = {};
        for (const [width, home] of [[1280, "top-bar"], [900, "surface-bar"]]) {
          await mount({ url, viewportWidth: width }, async (app) => {
            assert.equal(app.slotHome(), home, `${width}: the slot's home`);
            const summary = app.homeSummary();
            assert.ok(summary, `${width}: the contribution is present`);
            assert.equal(findAll(app.slot(), (child) => child === summary).length, 1, `${width}: …and it is INSIDE the shell's slot, not in the page's body`);
            // The FIXTURE is `ONE_SESSION`, so the page is POPULATED and the slot holds a payload
            // (R-3). Spelled as a literal rather than through the formatter: an expectation
            // computed by the code under test cannot fail.
            assert.equal(textOf(summary).trim(), "1 session · 0 live", `${width}: …and its contents do not change form`);

            // THE SHELL'S ROW LIST IS EXACTLY THE ROWS IT HAD BEFORE THIS SURFACE EXISTED. A
            // second bar is a GAP, not a variant.
            rowsAt[width] = app.rows();
            assert.equal(app.banners().length, 1, `${width}: exactly one banner`);
            assert.equal(app.mains().length, 1, `${width}: …and exactly one <main>`);

            // A SUMMARY AND NEVER A CONTROL.
            assert.equal(findAll(summary, (child) => child.type === "button" || child.type === "a").length, 0, `${width}: it holds no button and no link`);
            assert.equal(summary.props.onClick, undefined);
            assert.equal(summary.props.tabIndex, undefined, `${width}: …and nothing focusable`);
          });
        }
        // The home adds no sixth row: at 1280 the shell stands its top bar and content; at 900 it
        // also stands the surface bar — which is the SHELL's own row, not the page's.
        assert.deepEqual(rowsAt[1280], ["top-bar", "content", "overlay"], "at 1280 the shell's rows are its own, unchanged");
        assert.deepEqual(rowsAt[900], ["top-bar", "surface-bar", "content", "overlay"], "at 900 the SHELL stands its surface bar — the page grew no bar");
      });
    },
  },

  // ======================================================================
  // Scenario Outline 10: the summary says what is true and drops the part that is not
  // ======================================================================
  {
    name: "home-states/01 the surface-slot summary says what is true and drops the part that is not — `· K need input` only when K > 0 (01 scenario 10, all five rows)",
    run() {
      const rows = [
        ["nothing at all", { sessions: 0, live: 0, needInput: 0 }, "0 sessions · 0 live"],
        ["sessions, none watched", { sessions: 3, live: 0, needInput: 0 }, "3 sessions · 0 live"],
        // PLURALISED PER COUNT — the designer's GAP-3, ruled 2026-08-13, and DESIGN's own G0
        // template (`<K> need input`) is what was amended: its DG-49-7 live region already said
        // `1 pane needs input`, so the chrome and the announcement were two spellings of one fact.
        // ~~`1 sessions` is in the table DELIBERATELY … pluralising it would be inventing copy.~~
        // It was measured on the live build and read as a defect, which is what settled it.
        ["one needs input", { sessions: 3, live: 3, needInput: 1 }, "3 sessions · 3 live · 1 needs input"],
        ["several need input", { sessions: 9, live: 9, needInput: 4 }, "9 sessions · 9 live · 4 need input"],
        ["a single session", { sessions: 1, live: 1, needInput: 0 }, "1 session · 1 live"],
      ];
      // EVERY ROW IS ASKED IN ALL THREE PAYLOAD-HOLDING STATES. The counts are the payload's; the
      // page's own state does not change what a held payload says (R-3 governs WHETHER it speaks,
      // never WHAT it says), and a formatter that answered differently in E1 than in `populated`
      // would put two spellings of one fact in the chrome.
      for (const [label, counts, expected] of rows) {
        for (const state of HOME_PAGE_STATES_WITH_PAYLOAD) {
          assert.equal(homeSlotSummary(state, counts), expected, `${label} (${state})`);
        }
      }

      // The formatter is TOTAL, because story 05 wires real counts into it and a summary that
      // threw would take the whole chrome with it.
      assert.equal(homeSlotSummary(HOME_PAGE_STATE_E1), "0 sessions · 0 live");
      assert.equal(homeSlotSummary(HOME_PAGE_STATE_E1, null), "0 sessions · 0 live");
      assert.equal(homeSlotSummary(HOME_PAGE_STATE_E1, { sessions: -3, live: NaN, needInput: undefined }), "0 sessions · 0 live");
    },
  },

  // ======================================================================
  // GAP-6 (designer's re-render, ruled 2026-08-13) — THE COUNT RULE IS THE SURFACE'S
  //
  // `1 runs in flight` was on the LIVE PRODUCTION SCREEN, one string over from the summary GAP-3
  // had just fixed. The diagnosis is the actionable part: GAP-3's fix and DG-49-3's correction
  // were both written about "the summary", so the identical defect on the same screen was never
  // in their blast radius. This lane drives the SHARED RULE and then every phrase on the surface
  // that uses it, at BOTH forms — so a sixth interpolation added without the rule is a lane that
  // has to be edited rather than a string nobody re-reads.
  // ======================================================================
  {
    name: "home-states/01 GAP-6 — every interpolated count on this surface agrees with its own value, through ONE shared rule: K3 reads `1 run in flight`, and 0/2/3 take the plural",
    run() {
      // ── the rule itself, driven directly ────────────────────────────────────────────────────
      assert.equal(countedPhrase(1, "run in flight", "runs in flight"), "1 run in flight", "ONE takes the singular — the open defect");
      assert.equal(countedPhrase(3, "run in flight", "runs in flight"), "3 runs in flight", "…and three the plural");
      assert.equal(countedPhrase(0, "run in flight", "runs in flight"), "0 runs in flight", "…and ZERO is plural, as English has it");
      assert.equal(countedPhrase(2, "session", "sessions"), "2 sessions");
      // TOTAL, because it renders inside the chrome and a throw there takes the whole bar with it.
      for (const [hostile, expected] of [
        [undefined, "0 runs"], [null, "0 runs"], [NaN, "0 runs"], [-4, "0 runs"], [Infinity, "0 runs"],
        ["1", "0 runs"], [1.9, "1 run"], [1.0, "1 run"], [true, "0 runs"],
      ]) {
        assert.doesNotThrow(() => countedPhrase(hostile, "run", "runs"), `${String(hostile)}: answers rather than throwing`);
        assert.equal(countedPhrase(hostile, "run", "runs"), expected, `${String(hostile)}: …and the whole number decides the form`);
      }

      // ── K3, the open defect, at its singular and its plural, through the SHIPPED copy ───────
      assert.equal(
        homeEmptyCopy(HOME_PAGE_STATE_E2, 1).lines[0],
        "1 run in flight · no session is reporting a terminal.",
        "K3's singular is the string the live production capture got wrong",
      );
      assert.equal(homeEmptyCopy(HOME_PAGE_STATE_E2, 3).lines[0], "3 runs in flight · no session is reporting a terminal.", "…and R-A-1280-e2's N=3 is unchanged by the fix");
      assert.equal(homeEmptyCopy(HOME_PAGE_STATE_E2, 0).lines[0], "0 runs in flight · no session is reporting a terminal.");
      // E1 MAKES NO COUNT CLAIM AT ALL, so there is no agreement to get right in it.
      assert.equal(homeEmptyCopy(HOME_PAGE_STATE_E1, 1).lines[0], HOME_E1_LINES[0], "E1 names no count in either direction");
      assert.equal(homeEmptyCopy(HOME_PAGE_STATE_E1, 1).runCount, null);

      // ── G0, the string GAP-3 fixed, still right and now sharing the rule ────────────────────
      assert.equal(homeSlotSummary(HOME_PAGE_STATE_POPULATED, { sessions: 1, live: 1, needInput: 1 }), "1 session · 1 live · 1 needs input", "R-A-1280-summary-singular, all three singular");
      assert.equal(homeSlotSummary(HOME_PAGE_STATE_POPULATED, { sessions: 6, live: 5, needInput: 2 }), "6 sessions · 5 live · 2 need input", "…and the verb agrees with a plural number too");

      // ── AND THE SHAPE PROPERTY, WHICH IS THE RULE ITSELF RATHER THAN A LIST OF STRINGS ──────
      //
      // For every interpolation on this surface: BLANK THE DIGITS, and the words at one must
      // DIFFER from the words at two, while every non-one value must give the SAME words. That is
      // "the phrase agrees with its own value" stated as something a lane can measure without
      // re-spelling a single sentence — and without asking `countedPhrase` what it thinks, which
      // is what would make the lane unable to fail.
      //
      // A NOTE ON WHAT THIS CANNOT DO, stated rather than implied: it sweeps the phrases NAMED in
      // the table below, so a SIXTH interpolation added tomorrow is caught by this lane only if
      // it is added here too. No lane can enumerate a template literal that has not been written.
      // The rule's real guard against that is structural — every count on this surface goes
      // through ONE function, so there is one place to get it right.
      const words = (line) => String(line).replace(/\d+/g, "N");
      const phrases = [
        ["K3 — the E2 page state", (n) => homeEmptyCopy(HOME_PAGE_STATE_E2, n).lines[0]],
        ["G0 — the sessions count", (n) => homeSlotSummary(HOME_PAGE_STATE_POPULATED, { sessions: n, live: 2, needInput: 2 })],
        ["G0 — the needs-input verb", (n) => homeSlotSummary(HOME_PAGE_STATE_POPULATED, { sessions: 2, live: 2, needInput: n })],
      ];
      for (const [label, render] of phrases) {
        assert.notEqual(words(render(1)), words(render(2)), `${label}: the WORDS change with the number, not just the digit — ${JSON.stringify([render(1), render(2)])}`);
        assert.equal(words(render(2)), words(render(3)), `${label}: …and every plural value takes the same words`);
        assert.equal(words(render(2)), words(render(17)), `${label}: …at seventeen too`);
        assert.ok(String(render(1)).includes("1"), `${label}: the count really is interpolated (non-vacuous): ${render(1)}`);
      }
      // ZERO IS PLURAL, and it takes its own row because `> 1` and `!== 1` are the two spellings
      // of this rule and only this comparison tells them apart.
      assert.equal(words(homeEmptyCopy(HOME_PAGE_STATE_E2, 0).lines[0]), words(homeEmptyCopy(HOME_PAGE_STATE_E2, 2).lines[0]), "K3 at zero reads as its plural");
      assert.equal(
        words(homeSlotSummary(HOME_PAGE_STATE_POPULATED, { sessions: 0, live: 0, needInput: 2 })),
        words(homeSlotSummary(HOME_PAGE_STATE_POPULATED, { sessions: 2, live: 0, needInput: 2 })),
        "…and so does G0's sessions count",
      );
    },
  },

  // ======================================================================
  // GAP-7 (designer's re-render, ruled 2026-08-13) — RULE R-3: G0 ASSERTS ONLY WHAT IT HOLDS
  //
  // `R-A-1280-error.png` rendered `0 sessions · 0 live` in the chrome, 90px above a red alert
  // reading `Could not load the mesh`; `R-A-1280-loading.png` rendered it above `Loading
  // sessions…`. The page said it did not know and the chrome said the answer was zero.
  //
  // THE SECOND HALF OF THIS LANE IS THE DISTINCTION THE RULING TURNS ON: "while the last fetch
  // failed" is the failed PAGE STATE, never any failed poll. A poll that fails while last-known
  // content is on screen was ruled separately (F-49-04-b) as correct AS BUILT — keep last-known,
  // surface nothing — and G0 must keep rendering there, because it DOES hold a payload.
  // ======================================================================
  {
    name: "home-states/01 GAP-7/R-3 — G0 renders counts only where the page holds a payload: NOTHING while loading and while the last fetch failed, and its LAST-KNOWN counts through a silent re-poll failure",
    async run() {
      // ── the decision, over the whole closed set of states ───────────────────────────────────
      const counts = { sessions: 4, live: 3, needInput: 1 };
      assert.deepEqual([...HOME_PAGE_STATES_WITH_PAYLOAD], [HOME_PAGE_STATE_E1, HOME_PAGE_STATE_E2, HOME_PAGE_STATE_POPULATED], "the three states that hold a payload, and only those");
      for (const state of HOME_PAGE_STATE_LIST) {
        const held = state !== HOME_PAGE_STATE_LOADING && state !== HOME_PAGE_STATE_ERROR;
        assert.equal(
          homeSlotSummary(state, counts),
          held ? "4 sessions · 3 live · 1 needs input" : null,
          `${state}: ${held ? "the counts it holds" : "NOTHING AT ALL — not `0`, not `—`, not a skeleton"}`,
        );
      }
      // TOTAL over the shapes a caller can produce by accident, and a state nobody named is not a
      // payload: the default fails CLOSED, toward saying nothing.
      for (const hostile of [undefined, null, "", "Populated", "POPULATED", 7, [], {}, HOME_PAGE_STATE_LIST]) {
        assert.doesNotThrow(() => homeSlotSummary(hostile, counts), `${JSON.stringify(hostile)}: answers rather than throwing`);
        assert.equal(homeSlotSummary(hostile, counts), null, `${JSON.stringify(hostile)}: an unrecognised state asserts no count`);
      }

      // ── and on screen, in the two states the renders caught ─────────────────────────────────
      // THE FAILED STATE — `R-A-1280-error.png`'s own frame: `0 sessions · 0 live` in the chrome,
      // 90px above `Could not load the mesh`. The mutant this row kills is R-3 applied to
      // `loading` alone, which is the shape the ruling's two clauses invite if only the first is
      // read. (It does NOT distinguish "keyed on the state" from "keyed on `status != null`":
      // no reachable frame in this component puts a held payload behind the failed state, and
      // page-state.mjs says so rather than claiming otherwise.)
      await withHomeFace({ status: ONE_SESSION, failures: 1 }, async ({ url }) => {
        await mount({ url }, async (app) => {
          assert.deepEqual(app.homeStates(), [HOME_PAGE_STATE_ERROR], "the page is in its failed state…");
          assert.ok(textOf(app.homeState()).includes("Could not load the mesh"), "…saying so in the region below");
          const summary = app.homeSummary();
          assert.ok(summary, "the slot NODE still holds its place in the bar");
          assert.equal(textOf(summary), "", "…and asserts NOTHING while the last fetch failed (R-3)");

          // …AND RETRY RESTORES IT, so the rule is a suspension rather than a removal.
          await app.retry();
          assert.deepEqual(app.homeStates(), [HOME_PAGE_STATE_POPULATED], "the retry landed");
          assert.equal(textOf(app.homeSummary()).trim(), "1 session · 0 live", "…and the summary speaks again, from the payload it now holds");
        });
      });

      // ── F-49-04-b: THE SILENT RE-POLL FAILURE, WHICH IS NOT THAT CASE ──────────────────────
      // The first fetch lands; every poll after it is refused. The page keeps its last-known
      // content and surfaces nothing (ruled correct as built), so G0 keeps its last-known counts
      // — it still holds a payload. A build that collapsed the two cases would blank this slot
      // every five seconds behind a screen of live terminals.
      await withHomeFace({ status: ONE_SESSION, failAfter: 1 }, async ({ url, served }) => {
        await mount({ url }, async (app) => {
          assert.deepEqual(app.homeStates(), [HOME_PAGE_STATE_POPULATED], "the first fetch landed");
          assert.equal(textOf(app.homeSummary()).trim(), "1 session · 0 live", "…and the summary reads the payload");
          const before = app.statusLoads();
          for (let poll = 1; poll <= 3; poll += 1) {
            await app.advance(HOME_POLL_MS);
            assert.deepEqual(app.homeStates(), [HOME_PAGE_STATE_POPULATED], `poll ${poll}: the page keeps its last-known content`);
            assert.equal(textOf(app.homeSummary()).trim(), "1 session · 0 live", `poll ${poll}: …and G0 keeps its last-known counts — the failed POLL is not the failed PAGE STATE`);
          }
          assert.ok(app.statusLoads() >= before + 3, `all three polls really went out: ${before} → ${app.statusLoads()}`);
          assert.ok(served() >= 4, `…and the face really refused them: ${served()} requests served`);
        });
      });
    },
  },

  // ======================================================================
  // Scenario 11: the page keeps exactly ONE heading, and it is the one the deleted file carried
  // ======================================================================
  {
    name: "home-states/01 the page keeps exactly ONE `<h1>`, it reads `Live terminals`, it is sr-only, and it is present in every one of the five states (01 scenario 11)",
    async run() {
      const cases = [
        [HOME_PAGE_STATE_LOADING, { status: QUIET_FLEET }, { settle: "render", holdFromStart: "/api/mesh/status" }],
        [HOME_PAGE_STATE_ERROR, { status: QUIET_FLEET, failures: 1 }, {}],
        [HOME_PAGE_STATE_E1, { status: QUIET_FLEET }, {}],
        [HOME_PAGE_STATE_E2, { status: RUNS_IN_FLIGHT }, {}],
        [HOME_PAGE_STATE_POPULATED, { status: ONE_SESSION }, {}],
      ];

      for (const [expected, face, options] of cases) {
        await withHomeFace(face, async ({ url }) => {
          await mount({ url, ...options }, async (app) => {
            assert.deepEqual(app.homeStates(), [expected], `${expected}: the state under test`);
            const headings = app.headings("h1");
            assert.equal(headings.length, 1, `${expected}: exactly one <h1> on the page — no second one is contributed by the shell, the slot or the state cards`);
            assert.equal(textOf(headings[0]).trim(), HOME_HEADING, `${expected}: and its text is exactly ${HOME_HEADING}`);
            // VISUALLY HIDDEN WHILE REMAINING IN THE ACCESSIBILITY TREE: `sr-only`, never
            // `hidden` and never `aria-hidden` — the grid is its own title, and a 432px content
            // box cannot spend a row saying so.
            assert.match(String(headings[0].props.className), /\bsr-only\b/, `${expected}: it is sr-only`);
            assert.equal(headings[0].props["aria-hidden"], undefined, `${expected}: …and still in the accessibility tree`);
          });
        });
      }
    },
  },
];
