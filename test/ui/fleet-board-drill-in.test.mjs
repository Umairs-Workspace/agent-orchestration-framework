// Traceability wiring for milestone 47 / story 01 / task 00 —
// `stories/01_story_board-drill-in/tasks/00_board-link-resolved.feature` (@executable).
// Every @executable Scenario and every Scenario-Outline ROW is covered here.
//
// ADR-006(a): THE ONE RESOLVER. Every board destination the fleet produces is MINTED AT
// CLICK TIME by `GET /api/mesh/board-url`, for the CARD's OWN workspace, and the operator
// lands on the board's real origin — the one that can actually serve `/api/work`.
//
// THE DEFECT THIS CLOSES — m45/STATE F-45-04-1(a). The fleet's other board door was
// `href="/board"`, RELATIVE, which on the fleet origin resolved to a server that
// deliberately 404s `/api/work` (m25/ADR-003's disjoint-face rule): the board page loaded
// and could not load its stream. A board server is PER-WORKSPACE and on an EPHEMERAL port
// that `boardUrlForWorkspace` launches on demand and memoises, so a literal address is not
// merely stale — it is wrong by construction, on every machine, for every workspace but at
// most one. Scenario 3 below measures BOTH sides of that: the resolved origin answers
// `/api/work/list` with 200, and the fleet origin answers the same path with a coded 404.
//
// THE THREE CHANNELS, taken from the feature's LITMUS verbatim — every Then is confirmable
// by an outsider without reading source:
//   (1) THE APP'S OWN TRAFFIC — `driver.requestsMatching(<fragment>)` records every request
//       the mounted production surface actually put on the wire, in order, with its URL.
//       "Nothing resolves until the click" and "the request carried the CARD's workspaceId"
//       are counts and query parameters read off that log.
//   (2) THE RENDERED TREE — `findAll` / `textOf` over the tree the REAL `<Fleet/>` produced,
//       which is how `Open board →` / `Opening board...` / `Open failed` are read. m38/STATE
//       F-38.06e is why this is the instrument and a helper test is not: "a state satisfied
//       by calling the reducer directly proved nothing, because production could never
//       drive it."
//   (3) REAL HTTP, from the lane itself — a plain `fetch` of an origin the app just
//       navigated to.
// Plus the ONE build prerequisite this task needed, and it is test-support only: the shared
// harness's `location.assign` now RECORDS its argument and the driver exposes
// `navigations()` (react-app-harness.mjs). Without it "the operator lands on X" was
// unobservable, and the feature says in terms that those clauses must come back rather than
// be downgraded to a source read.
//
// NOT ASSERTED HERE — the three PLACEMENT invariants (no hard-coded board address anywhere
// in `ui/src/fleet/`; `api.ts` declares `boardUrl` over the ONE route; `Fleet.tsx` calls
// `fleetApi.boardUrl`). They are owned by `test/arch/ui/acd-fleet-board-link-resolved.test.mjs`.
// What this file asserts is the half that gate CANNOT see: an address composed at RUNTIME
// leaves no literal in source, and no static rule can tell whether the request carried the
// RIGHT workspace id or whether the operator landed somewhere that works.
//
// THE FIXTURE IS THE COLLISION, and that is part of the contract rather than a convenience.
// `withTwoWorkspaceAssignFixture` stands a REAL `serveMeshUi` face on workspace A while
// workspace B — a different repo, same machine, same global projection — carries an item at
// the SAME ref "18", exactly as the 2026-07-24 soak did. BLOCKER F21 is the measured proof
// that a single-workspace fixture cannot see this class of defect: the right answer and the
// wrong answer are the same value.
//
// PORTS: every server here binds :0, and the boards a successful resolve LAUNCHES are closed
// with the fleet (mesh-ui-serve.mjs wraps `server.close`). Nothing touches :4181 or :4182.
//
// Run focused and isolated (hook-enforced):
//   AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<driver>
import assert from "node:assert/strict";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withTwoWorkspaceAssignFixture, removeWorkspaceFromProjection } from "../support/mesh-ui-assign-fixture.mjs";
import { withFleetApp, findAll, textOf } from "../support/fleet-app-harness.mjs";
import { visibleTextOf } from "../support/mini-react.mjs";
import { spawnCliAsync } from "../support/cli-spawn.mjs";
import { POLL_MS } from "../../ui/src/fleet/assign-affordance.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "bin", "aof.mjs");

const RESOLVER = "/api/mesh/board-url";
const AT_REST = "Open board →";
const IN_FLIGHT = "Opening board...";
const FAILED = "Open failed";

// THE WORDS ARE PINNED, THE FULL TEXT IS NOT — task 00 scenario 5, amended at build
// (PO, 2026-08-11) and applied here 2026-08-11 for the cross-story collision the
// feature names. DG-47-5 clause 2 (47/04) rules that the pinned `→` SURVIVES the
// non-rest states, so the element now reads `Opening board... →` / `Open failed →`
// where these lanes read exact equality against the bare words.
//
// This is a RE-POINT, not a relaxation of what the lane claims: this story's claim
// was always that a refusal is STATED ON THE CARD rather than swallowed, and clause
// 1's ladder makes the words the part that yields at the abbreviation threshold
// while the glyph is the part that survives. The arrow's presence in every state is
// asserted where the ladder lives — 47/04 tasks/01 — and asserting it here as well
// would couple this story's lanes to a treatment another story owns, which is the
// coupling the amendment exists to remove.
//
// Deliberately NOT `includes` at the call site: the words must be present as the
// element's own leading text, so a build that rendered `Open failed` only inside a
// `title` (the swallowed-refusal defect) still fails.
function assertStates(actual, words, context) {
  assert.equal(typeof actual, "string", `${context}: the drill-in renders text at all (got ${JSON.stringify(actual)})`);
  assert.ok(
    actual.startsWith(words),
    `${context}: that card's drill-in states the failure in its own words — "${words}" — whatever else DG-47-5's treatment renders alongside them (got ${JSON.stringify(actual)})`,
  );
}

// --- reading the rendered tree ------------------------------------------------

// The four region headers the populated page renders, in order — the cheapest honest
// statement of "no region was unmounted".
function regionHeaders(tree) {
  return findAll(tree, (node) => node.type === "h2").map((node) => textOf(node));
}

function scopeControl(tree) {
  return findAll(tree, (node) => node.props?.role === "group" && node.props?.["aria-label"] === "Scope")[0] ?? null;
}

function refreshControl(tree) {
  return findAll(tree, (node) => node.type === "button" && node.props?.["aria-label"] === "Refresh the fleet view")[0] ?? null;
}

// Every card's drill-in label, keyed by the milestone title an operator reads. This is how
// "the in-flight state is the clicked card's, not the page's" is asserted: as a TABLE, so a
// state that leaks onto a neighbour is as loud as one that fails to appear.
function drillInLabels(app) {
  const out = {};
  for (const card of app.cards()) {
    const drillIn = app.drillInIn(card);
    const heading = findAll(card, (node) => node.type === "h3")[0];
    out[textOf(heading)] = drillIn?.label ?? null;
  }
  return out;
}

// --- "no board server has been launched by this page" -------------------------
//
// A launch is not a request, so it cannot be read off the request log — and reading it off
// the log would make headline 1's second Then a restatement of its first. A board server is
// a REAL `net.Server` in THIS process (the fixture's fleet is in-process), so the honest
// measurement is the set of ports this process is listening on. Scenario 3 proves the
// instrument fires: a successful resolve GAINS exactly one port, and it is the board's own.
function listeningPorts() {
  const handles = typeof process._getActiveHandles === "function" ? process._getActiveHandles() : null;
  assert.ok(Array.isArray(handles), "the launch instrument can enumerate this process's servers");
  const ports = new Set();
  for (const handle of handles) {
    if (!(handle instanceof net.Server)) continue;
    const address = typeof handle.address === "function" ? handle.address() : null;
    if (address && typeof address.port === "number") ports.add(address.port);
  }
  return ports;
}

function portsGained(before, after) {
  return [...after].filter((port) => !before.has(port));
}

// --- real HTTP, from the lane -------------------------------------------------

async function getJson(url) {
  const response = await fetch(url);
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    /* a non-JSON body is itself the fact a lane may assert */
  }
  return { status: response.status, body, text };
}

// `aof <verb> --json` through the REAL CLI — the BOARD's own advertisement of the path it
// serves itself at, so scenario 3's pathname clause compares two independent faces rather
// than a constant this file chose.
async function probe(cwd, args) {
  const result = await spawnCliAsync(process.execPath, [cliPath, ...args, "--json"], {
    cwd,
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });
  assert.equal(result.status, 0, `\`aof ${args.join(" ")} --json\` exits 0 (stderr: ${result.stderr})`);
  return JSON.parse(result.stdout);
}

// --- a proxy in front of the REAL face ----------------------------------------
//
// Scenario 5 needs two causes the fixture cannot produce on its own: a status payload whose
// item row carries a BLANK workspaceId (a stale or hand-built wire), and a face that STOPS
// ANSWERING mid-click. Both are properties of the WIRE, so they are produced at the wire —
// the fleet face itself is real and untouched, and the refusals the app meets are the REAL
// route's (`invalid-workspace` is minted by `mesh-ui-serve.mjs`, not by this file).
async function withFaceProxy({ target, rewriteStatus = null, onResolve = null }, fn) {
  const sockets = new Set();
  let closed = false;
  // THE PROXY MUST NOT SHOW UP IN THE APP'S OWN REQUEST LOG. The harness instruments
  // `globalThis.fetch` for the duration of a mount, so a proxy that forwarded with the
  // ambient `fetch` would record its OWN upstream call beside the app's — and every count
  // in this file would silently double (measured: 2 board-url entries per click, one to
  // the proxy and one to the face). The real fetch is captured HERE, before any mount, so
  // the log stays exactly "what the app put on the wire".
  const forward = globalThis.fetch;
  const server = http.createServer(async (request, response) => {
    const requested = new URL(request.url ?? "/", "http://127.0.0.1");
    if (requested.pathname === "/api/mesh/status" && rewriteStatus) {
      const upstream = await forward(new URL(request.url ?? "/", target));
      const payload = rewriteStatus(await upstream.json());
      response.writeHead(upstream.status, { "content-type": "application/json" });
      response.end(JSON.stringify(payload));
      return;
    }
    if (requested.pathname === RESOLVER && onResolve) {
      onResolve({ request, response, stop: () => { closed = true; for (const socket of sockets) socket.destroy(); server.close(); } });
      return;
    }
    const upstream = await forward(new URL(request.url ?? "/", target), { method: request.method });
    const text = await upstream.text();
    response.writeHead(upstream.status, { "content-type": upstream.headers.get("content-type") ?? "application/json" });
    response.end(text);
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    return await fn({ url, stop: () => { closed = true; for (const socket of sockets) socket.destroy(); server.close(); } });
  } finally {
    for (const socket of sockets) socket.destroy();
    if (!closed) await new Promise((resolve) => server.close(() => resolve()));
  }
}

// ── headline 1's rows ─────────────────────────────────────────────────────────
//
// Resolving a board LAUNCHES one, so a surface that resolved at RENDER time would start a
// board server for every card on the page, again on every poll, for boards nobody asked to
// open. Each row is a real activity driven through a production door.
const NO_MINT_ROWS = [
  {
    case: "the first load, before any interaction",
    async activity() {
      /* the Background already settled the page after its first /api/mesh/status */
    },
  },
  {
    case: "the poll — the steady state, and the one that would repeat",
    async activity(app) {
      const before = app.statusLoads();
      await app.advance(POLL_MS);
      assert.ok(app.statusLoads() > before, "the clock advance really landed a silent re-poll");
    },
  },
  {
    case: "the manual ⟳ refresh",
    async activity(app) {
      const before = app.statusLoads();
      const control = refreshControl(app.tree());
      assert.ok(control, "the fleet renders its own ⟳ refresh control");
      await control.props.onClick({ stopPropagation() {}, preventDefault() {} });
      await app.flush();
      assert.ok(app.statusLoads() > before, "the refresh really re-polled");
    },
  },
  {
    case: "a scope switch, which re-queries under the new scope",
    async activity(app) {
      const before = app.statusLoads();
      for (const label of ["Local", "Global"]) {
        const control = scopeControl(app.tree());
        const button = findAll(control, (node) => node.type === "button" && textOf(node) === label)[0];
        assert.ok(button, `the scope control offers ${label}`);
        await button.props.onClick({ stopPropagation() {}, preventDefault() {} });
        await app.flush();
      }
      assert.ok(app.statusLoads() >= before + 2, "both scope switches really re-queried");
    },
  },
  {
    case: "the extra silent load a successful assign fires",
    async activity(app, { titles }) {
      const affordance = app.cardByTitle(titles.A);
      assert.ok(affordance, "the card carries its assign affordance");
      await affordance.choose("worker-a");
      await affordance.click();
      assert.equal(app.assignPosts(), 1, "the assign really POSTed once");
      assert.ok(app.statusLoads() >= 2, "…and fired its ONE extra silent load");
    },
  },
  {
    case: "hovering / focusing the card, which is where an `href` would show",
    async activity(app, { titles }) {
      const drillIn = app.drillInByTitle(titles.A);
      // THE HONEST STATEMENT OF THE DIFFERENCE BETWEEN THE TWO DESIGNS. An anchor
      // advertises its destination on hover, in the status bar and to "copy link address",
      // so an `href` could not be resolved lazily even in principle. There is nothing here
      // to activate short of the click: no href, and no pre-click handler that could reach
      // the wire. Everything a hover CAN surface is surfaced.
      assert.equal(drillIn.href, undefined, "the drill-in carries no href — there is no destination to advertise before the click");
      for (const handler of ["onFocus", "onMouseEnter", "onMouseOver", "onPointerEnter"]) {
        assert.equal(drillIn.button.props?.[handler], undefined, `…and no ${handler} handler that could resolve one behind the operator's back`);
      }
      assert.match(String(drillIn.button.props?.title ?? ""), /^Open board for /, "what a hover DOES surface is the affordance's own title, which names no address");
      await app.flush();
    },
  },
];

// ── headline 4's rows (scenario 5) ────────────────────────────────────────────
const REFUSAL_ROWS = [
  {
    case: "the workspace left the projection between the poll and the click",
    title: "Portal Only",
    ref: "44",
    // The workspace's row is removed from the global projection AFTER the page loaded,
    // through the fixture's own removal door (which wraps the store's production
    // `removeWorkspaceFromCache`) — never a hand-built row.
    async cause({ home, workspaceIdB }) {
      const removed = await removeWorkspaceFromProjection({ home }, workspaceIdB);
      assert.ok(removed.items > 0, "the workspace really was carrying rows before it left the projection");
      assert.ok(removed.descriptors > 0, "…and a registry descriptor, which is the other half of the union the payload is built from");
    },
    expect: { status: 404, code: "workspace-not-found" },
  },
  {
    // ROW 2 — THE ROW AN OPERATOR ACTUALLY MEETS, and the one this build stopped on. Its
    // answer cell was amended at build (PO, 2026-08-11) under ADR-011: it contracted
    // `5xx board-url-failed` and claimed "the board cannot start", and both were false of
    // the tree — measured twice, independently, over this same committed fixture. The
    // resolver answered 200, the board BOUND, and the operator landed on a page that
    // rendered and showed an empty stream.
    //
    // ADR-011's ruling is that the row stands and the ROUTE was wrong: the fleet's ONE
    // door must give a truthful answer, not merely be the only door. The refusal reuses
    // the `workspace-not-local`/409 vocabulary the same file has minted on the ASSIGN
    // route since m38 — same field, same row, same query, same question — rather than
    // minting a second name for one fact. The cause is unchanged: the fixture's `Gone`
    // workspace is a REAL publish followed by a REAL `rm -rf`, never a hand-built row,
    // and it is the same producer the assign route's own `workspace-not-local` lane uses.
    case: "a checkout that no longer exists on this machine — the projection row is here but the checkout is not",
    title: "Published Elsewhere",
    ref: "18",
    expect: { status: 409, code: "workspace-not-local" },
  },
  {
    case: "a payload row carrying a blank workspace id — a stale or hand-built wire",
    title: "Portal Only",
    ref: "44",
    // The FACE answers a status payload whose item row carries an empty `workspaceId`. The
    // refusal the app meets is the REAL route's coded 400.
    rewriteStatus: (payload) => ({
      ...payload,
      items: payload.items.map((item) => (item.ref === "44" ? { ...item, workspaceId: "" } : item)),
    }),
    expect: { status: 400, code: "invalid-workspace" },
  },
  {
    case: "the face stops answering mid-click",
    title: "Portal Only",
    ref: "44",
    // NOT a route refusal — a REJECTED PROMISE, and it takes a different path in the client
    // (`fetch` throws rather than answering `!response.ok`). A build that only handled `!ok`
    // would pass the rows above and leave this card stuck reading "Opening board..." for
    // ever.
    onResolve: ({ stop }) => stop(),
    expect: null,
  },
];

export const fleetBoardDrillInTests = [
  // ══════════════════════════════════════════════════════════════════════════
  // Scenario Outline: no board address is minted until the operator asks for one.
  // (6 rows)
  // ══════════════════════════════════════════════════════════════════════════
  ...NO_MINT_ROWS.map((row) => ({
    name: `fleet-board-drill-in/00 no board address is minted until the operator asks for one — ${row.case} (00 scenario 1)`,
    async run() {
      await withTwoWorkspaceAssignFixture(async ({ url, titles }) => {
        await withFleetApp({ url, search: "?scope=global" }, async (app) => {
          assert.ok(app.cards().length >= 4, "the fleet is mounted and showing its milestone cards");
          const portsBefore = listeningPorts();

          await row.activity(app, { titles });

          assert.deepEqual(
            app.requestsMatching(RESOLVER).map((request) => request.url),
            [],
            `the app has issued ZERO requests to ${RESOLVER} — a board address does not exist until the operator asks for one`,
          );
          assert.deepEqual(
            portsGained(portsBefore, listeningPorts()),
            [],
            "no board server has been launched by this page (resolving one STARTS one — boardUrlForWorkspace launches and memoises a real per-workspace server)",
          );
          const labels = drillInLabels(app);
          assert.ok(Object.keys(labels).length >= 4, "…and the cards are still there to be read");
          assert.deepEqual(
            [...new Set(Object.values(labels))],
            [AT_REST],
            `every card still renders its drill-in at rest, reading "${AT_REST}" (got ${JSON.stringify(labels)})`,
          );
        });
      });
    },
  })),

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario Outline: the click asks the one resolver for the CARD's own workspace and
  // the CARD's own ref. (4 rows)
  //
  // ROWS 3 AND 4 ARE NOT PADDING: rows 1 and 2 alone would pass a build that read the
  // workspace id off the CARD but the ref off the wrong place, because both cards carry
  // ref "18". The two non-colliding rows are what make the ref half non-vacuous.
  // ══════════════════════════════════════════════════════════════════════════
  ...[
    { case: "the DAEMON's own workspace — the value a broken build would guess", title: "A", workspace: "A", ref: "18" },
    { case: "a FOREIGN workspace carrying the SAME ref — F21's exact shape", title: "B", workspace: "B", ref: "18" },
    { case: "a foreign workspace carrying a ref only IT has — the control row", title: "Portal Only", workspace: "B", ref: "44" },
    { case: "the daemon's own workspace carrying a ref only IT has", title: "Control Only", workspace: "A", ref: "31" },
  ].map((row) => ({
    name: `fleet-board-drill-in/00 the click asks the ONE resolver for the CARD's own workspace and ref — ${row.case} (00 scenario 2)`,
    async run() {
      await withTwoWorkspaceAssignFixture(async ({ url, titles, workspaceIdA, workspaceIdB }) => {
        const title = row.title === "A" || row.title === "B" ? titles[row.title] : row.title;
        const expectedWorkspace = row.workspace === "A" ? workspaceIdA : workspaceIdB;
        await withFleetApp({ url, search: "?scope=global" }, async (app) => {
          const statusLoadsBefore = app.statusLoads();
          const drillIn = app.drillInByTitle(title);
          assert.ok(drillIn, `the card titled ${JSON.stringify(title)} renders a drill-in`);
          await drillIn.click();

          const resolves = app.requestsMatching(RESOLVER);
          assert.equal(resolves.length, 1, `EXACTLY ONE request has been issued to ${RESOLVER} (got ${JSON.stringify(resolves.map((r) => r.url))})`);
          const params = new URL(resolves[0].url).searchParams;
          assert.equal(
            params.get("workspaceId"),
            expectedWorkspace,
            `its \`workspaceId\` parameter is workspace ${row.workspace} — the workspace that card belongs to, never the daemon's own (daemon: ${workspaceIdA})`,
          );
          assert.equal(params.get("ref"), row.ref, `its \`ref\` parameter is ${row.ref}`);

          assert.deepEqual(
            app.requestsMatching("/api/work").map((request) => request.url),
            [],
            "the app has issued NO request to any /api/work path — the fleet LINKS to a board, it never fetches one (m25/ADR-003)",
          );
          assert.equal(
            app.statusLoads(),
            statusLoadsBefore,
            "…and no second /api/mesh/status load on account of the click",
          );
        });
      });
    },
  })),

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: the operator lands on the board's own origin — the one that can serve the
  // board's stream. THE DEFECT, CLOSED, AND MEASURED FROM BOTH SIDES (F-45-04-1(a)).
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "fleet-board-drill-in/00 the operator lands on the board's OWN origin, which serves /api/work/list 200 where the fleet origin answers a coded 404 (00 scenario 3)",
    async run() {
      await withTwoWorkspaceAssignFixture(async ({ url, titles, workspaceIdA, rootA }) => {
        const fleetOrigin = new URL(url).origin;
        // The BOARD's own advertisement of the path it serves itself at — a second real
        // face, so the pathname clause is not a constant this file chose.
        const boardProbe = await probe(rootA, ["work", "ui"]);

        let navigated;
        let launchedPorts;
        await withFleetApp({ url, search: "?scope=global" }, async (app) => {
          const portsBefore = listeningPorts();
          await app.drillInByTitle(titles.A).click();
          launchedPorts = portsGained(portsBefore, listeningPorts());

          const navigations = app.navigations();
          assert.equal(navigations.length, 1, `the app performed EXACTLY ONE navigation (got ${JSON.stringify(navigations)})`);
          navigated = navigations[0];
        });

        // ABSOLUTE — it parses with `new URL(...)` on its own, with a scheme, a host and a
        // port. (A relative `/board` throws here, which is the whole of the old defect.)
        const target = new URL(navigated);
        assert.match(target.protocol, /^https?:$/, "the address it navigated to carries a scheme");
        assert.ok(target.hostname.length > 0, "…a host");
        assert.ok(target.port.length > 0, "…and a port");
        assert.notEqual(target.origin, fleetOrigin, `its origin is NOT the fleet's own origin (fleet: ${fleetOrigin})`);

        // The instrument behind scenario 1's second Then, proved to fire: the click really
        // did LAUNCH a board server, and it is the one the app navigated to.
        assert.deepEqual(
          launchedPorts,
          [Number(target.port)],
          "the click launched EXACTLY ONE board server, on the port it navigated to — which is what makes scenario 1's 'no board server has been launched' a measurement rather than a restatement",
        );

        // ONE RESOLVER, ONE ANSWER, NO CLIENT-SIDE COMPOSITION: the lane asks the same
        // route the same question and gets the same origin (the launch is memoised).
        const direct = await getJson(new URL(`${RESOLVER}?workspaceId=${encodeURIComponent(workspaceIdA)}&ref=18`, url));
        assert.equal(direct.status, 200, "the lane's own call to the resolver answers 200");
        assert.equal(
          new URL(direct.body.url).origin,
          target.origin,
          "its origin is byte-identical to the `url` the same GET answers when the lane calls it directly",
        );
        assert.equal(
          target.pathname,
          new URL(boardProbe.boardUrl).pathname,
          "its pathname is the board path the board server advertises for itself (`aof work ui --json`)",
        );
        assert.equal(target.hash, "#18", "its fragment is the clicked card's ref, so the board opens ON that item");

        // BOTH SIDES OF THE DEFECT, measured with real HTTP.
        const boardList = await getJson(new URL("/api/work/list", target.origin));
        assert.equal(boardList.status, 200, `a real GET of ${target.origin}/api/work/list answers 200`);
        assert.ok(Array.isArray(boardList.body?.items), "…with the board's own work stream");
        assert.ok(
          boardList.body.items.some((item) => item.ref === "18" && item.title === titles.A),
          `…and it is THAT workspace's stream — it carries ${JSON.stringify(titles.A)} (got ${JSON.stringify(boardList.body.items.map((i) => i.ref))})`,
        );

        const fleetList = await getJson(new URL("/api/work/list", url));
        assert.equal(fleetList.status, 404, "a real GET of /api/work/list on the FLEET's origin answers 404…");
        assert.equal(
          fleetList.body?.code,
          "not-found",
          "…with code \"not-found\" — which is what the old relative `/board` resolved to, and why the board page used to render and then sit empty",
        );
      });
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: while the resolver is in flight the card says so, and the rest of the page
  // does not move. The response is HELD rather than raced — a loopback resolve is faster
  // than any assertion.
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "fleet-board-drill-in/00 while the resolver is in flight the clicked card says so and the rest of the page does not move (00 scenario 4)",
    async run() {
      await withTwoWorkspaceAssignFixture(async ({ url, titles }) => {
        await withFleetApp({ url, search: "?scope=global" }, async (app) => {
          const hold = app.holdNext(RESOLVER);
          const pending = app.drillInByTitle(titles.A).clickDetached();
          await app.renderOnly();

          const labels = drillInLabels(app);
          assertStates(labels[titles.A], IN_FLIGHT, `the clicked card (all labels: ${JSON.stringify(labels)})`);
          assert.equal(
            visibleTextOf(app.drillInByTitle(titles.A).button).includes(AT_REST),
            false,
            `…and no longer offers "${AT_REST}"`,
          );
          assert.deepEqual(app.navigations(), [], "no navigation has happened yet");

          const others = Object.entries(labels).filter(([title]) => title !== titles.A);
          assert.ok(others.length >= 3, "there are other cards to compare against");
          assert.deepEqual(
            [...new Set(others.map(([, label]) => label))],
            [AT_REST],
            `every OTHER card still reads "${AT_REST}" — the in-flight state is the clicked card's, not the page's`,
          );

          assert.deepEqual(
            regionHeaders(app.tree()),
            ["Workspaces", "Milestones", "Nodes", "Diagnostics"],
            "the page is still in its populated state: every region is still mounted",
          );
          assert.ok(refreshControl(app.tree()), "…the top bar is still mounted");
          assert.ok(scopeControl(app.tree()), "…and so is the scope control");

          await hold.answered();
          hold.release();
          await pending.settle();

          assert.equal(app.navigations().length, 1, "the app performs its ONE navigation once the held response is released");

          // THE CLOSING THEN, ASSERTED AS AN EQUALITY RATHER THAN AS `!== IN_FLIGHT`
          // (F-47-01-QA-7). The inequality alone left a hole with exactly the shape of the
          // defect ADR-011 just closed — a WRONG SUCCESS that does not report itself: a
          // build that set `openError` on the success path satisfies "not reading
          // 'Opening board...'" while every opened card reads "Open failed" as the
          // document unloads, and all sixteen lanes of this feature stay green. The three
          // states are named as a closed set here because two of them are failures of the
          // third, and `location.assign` does not unload synchronously — the operator sees
          // this frame.
          const settledLabels = drillInLabels(app);
          assert.equal(
            settledLabels[titles.A],
            AT_REST,
            `after a SUCCESSFUL open the drill-in reads "${AT_REST}" — not "${IN_FLIGHT}" (location.assign does not unload the document synchronously, and a navigation can be refused, cancelled or blocked) and emphatically not "${FAILED}", which a success path that set openError would leave on every opened card (got ${JSON.stringify(settledLabels)})`,
          );
          assert.deepEqual(
            [...new Set(Object.values(settledLabels))],
            [AT_REST],
            "…and so does every other card: a successful open leaves the whole page at rest, with no residue of the click on any card",
          );
        });
      });
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario Outline: the resolver refuses, the fleet says so on the card, and nothing
  // navigates. (4 rows)
  //
  // ROW 4 IS NOT A ROUTE REFUSAL — it is a rejected promise, and it takes a different code
  // path in the client (`fetch` throws rather than answering `!response.ok`). A build that
  // only handled `!ok` would pass rows 1–3 and leave the card stuck reading "Opening
  // board..." forever on row 4.
  // ══════════════════════════════════════════════════════════════════════════
  ...REFUSAL_ROWS.map((row) => ({
    name: `fleet-board-drill-in/00 the resolver refuses, the fleet says so on the card, and nothing navigates — ${row.case} (00 scenario 5)`,
    async run() {
      await withTwoWorkspaceAssignFixture(async (fixture) => {
        const { url, home, workspaceIdB } = fixture;
        const drive = async (faceUrl) => {
          await withFleetApp({ url: faceUrl, search: "?scope=global" }, async (app) => {
            const before = drillInLabels(app);
            assert.equal(before[row.title], AT_REST, "the card starts at rest");
            const portsBefore = listeningPorts();
            if (row.cause) await row.cause({ home, workspaceIdB });

            await app.drillInByTitle(row.title).click();

            assert.deepEqual(app.navigations(), [], "the app performed NO navigation — the operator is still on the fleet");
            // ADR-011's own consequence, and the reason its probe sits BEFORE
            // `boardUrlForWorkspace` rather than inside it: a refused resolve must never
            // reach the launch, or every un-openable card strands a memoised board server
            // (and its bound port) for the fleet's lifetime. It is asserted for EVERY
            // refusal row, not just the reachability one, because the rule is "a refusal
            // launches nothing", not "this refusal launches nothing".
            assert.deepEqual(
              portsGained(portsBefore, listeningPorts()),
              [],
              "no board server was launched by the refused resolve — the refusal is reached before the memoised launch",
            );

            const labels = drillInLabels(app);
            assertStates(labels[row.title], FAILED, `the refused card (all labels: ${JSON.stringify(labels)})`);

            // The card is still mounted WITH the rest of its content.
            const card = app.cards().find((candidate) => textOf(candidate).includes(row.title));
            assert.ok(card, "the card is still mounted");
            const cardText = textOf(card);
            assert.ok(cardText.includes(row.title), "…with its title");
            assert.ok(cardText.startsWith(`${row.ref}milestone`), `…its ref row (\`${row.ref}\` + the type label), got ${JSON.stringify(cardText.slice(0, 40))}`);
            assert.ok(cardText.includes("stories done") || cardText.includes("not started"), "…its progress");
            assert.ok(
              findAll(card, (node) => node.type === "select" && String(node.props?.["aria-label"] ?? "").startsWith("Assign ")).length === 1,
              "…and its assign affordance",
            );

            const others = Object.entries(labels).filter(([title]) => title !== row.title);
            assert.deepEqual(
              [...new Set(others.map(([, label]) => label))],
              [AT_REST],
              "no other card's drill-in has changed — one card's failure is not the page's",
            );

            assert.deepEqual(
              regionHeaders(app.tree()),
              ["Workspaces", "Milestones", "Nodes", "Diagnostics"],
              "the page did NOT flip to its whole-page error state, and no region was unmounted",
            );
            assert.equal(
              visibleTextOf(app.tree()).includes("Could not load the mesh"),
              false,
              "…and it is not showing the page-level error",
            );

            // The refusal really was the one the row names — asked of the REAL face with
            // the app's OWN query string, so the cause is confirmed rather than assumed.
            // (Row 4 is a rejected promise and has no response to read.)
            if (row.expect) {
              const asked = new URL(app.requestsMatching(RESOLVER)[0].url).search;
              const answer = await getJson(new URL(`${RESOLVER}${asked}`, url));
              assert.equal(answer.status, row.expect.status, `the route really answered ${row.expect.status} for the query the app sent (${asked})`);
              assert.equal(answer.body?.code, row.expect.code, `…with code ${row.expect.code}`);
            }

            const beforeSecond = app.requestsMatching(RESOLVER).length;
            await app.drillInByTitle(row.title).click();
            assert.equal(
              app.requestsMatching(RESOLVER).length,
              beforeSecond + 1,
              `clicking the same drill-in again issues a FRESH request to ${RESOLVER} — the failure is recoverable without a reload`,
            );
          });
        };

        if (row.rewriteStatus || row.onResolve) {
          await withFaceProxy({ target: url, rewriteStatus: row.rewriteStatus ?? null, onResolve: row.onResolve ?? null }, async ({ url: proxyUrl }) => {
            await drive(proxyUrl);
          });
        } else {
          await drive(url);
        }
      });
    },
  })),
];
