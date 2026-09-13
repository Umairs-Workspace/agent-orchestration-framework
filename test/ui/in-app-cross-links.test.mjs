// Traceability wiring for milestone 45 / story 04, task 01 —
// `stories/04_story_advertised-entry-points/tasks/01_in-app-cross-links.feature`
// (@executable). Every Scenario and every Scenario-Outline ROW is covered here.
//
// THE CHANNEL, taken from the feature's LITMUS verbatim: these three links DO have a
// black-box runtime channel and it is already built. `test/support/board-app-harness.mjs`
// and `test/support/fleet-app-harness.mjs` esbuild the REAL, unmodified `Board.tsx` /
// `Fleet.tsx` and mount them headlessly against a REAL running face, over a minimal React
// with a controllable clock and an instrumented `fetch`. `findAll(tree, …)` walks the
// RENDERED tree, so every href below is read out of production render output — never out
// of a source file, never out of a bundle grep, never off a pure helper called directly.
// m38/STATE F-38.06e is why that matters: *"a state satisfied by calling the reducer
// directly proved nothing, because production could never drive it."*
//
// REACHING EACH STATE IS THE REAL WORK, and each is driven through a production door:
//   · the dead-server banner needs `serverGone`, which flips after THREE consecutive
//     SILENT load failures. The lane makes the REAL face refuse `/api/work/list` and then
//     presses the board's OWN `⟳ sync` control three times — the same `load({silent:true})`
//     the poll calls, driven through the affordance an operator can press.
//   · the watch link needs an item with `execution.active === true`, a holding node and NO
//     `execution.sessionId`. That overlay comes from the board face's own `/api/work/list`
//     envelope, so the lane mints a REAL assignment record through the production
//     assembler + state writer (`withBoardFace(...).dispatched`) and lets the real route
//     map it.
//   · the fleet's drill-in splits on `board.local`, which is minted by the REAL
//     `mesh:status` boards projection off a REAL group registry (see the note below).
//
// ── ONE FEASIBILITY DEVIATION, STATED RATHER THAN PAPERED OVER (F-45-04-DEV-1) ──────
// The feature's feasibility note says both branches of `BoardDrillIn` are "reachable from
// the fleet face's `/api/mesh/status` boards aggregate". Measured at HEAD, they are not
// reachable through `serveMeshUi`: since m34/ADR-006 that route answers
// `queryGlobalMeshStatus`, whose payload has NO `boards` key at all
// (`src/global-mesh-query.mjs` returns scope/workspaceId/stalenessSeconds/workspaces/
// items/nodes/diagnostics), so `status?.boards ?? []` is ALWAYS empty on that face and
// `BoardsRegion` always renders its "No boards registered in the group yet" placeholder.
// The `boards` aggregate is real and still produced — by `aof mesh status --json`
// (`src/commands/mesh-identity.mjs`'s `boardsProjection`), which is the producer
// `ui/src/fleet/api.ts` documents the local `MeshStatus` shape against ("deep-equal to
// `aof mesh status --json` for the same fixture").
//
// So the fleet lanes below are PRODUCER-FED rather than face-fed: a REAL group registry
// on disk → the REAL `mesh:status` command → its REAL payload served verbatim from a real
// 127.0.0.1 origin → the REAL `<Fleet/>` fetching it over HTTP. Nothing about the payload
// is hand-painted; the `local` marker in particular is computed by production code from
// the registry's roster and this node's configured `mesh.nodeId`. That is the m38/ADR-008
// producer-fed rule applied where the two real halves have drifted apart. The DRIFT
// itself is pre-existing, is not this story's to repair (a URL migration that also
// reconnected a data path would be two changes in one diff), and is reported as a finding.
//
// NOT ASSERTED HERE:
//   · "no `?mode=` literal survives in ui/src" — a PLACEMENT invariant owned by
//     `test/arch/ui/acd-no-surface-mode-url-literal.test.mjs`. What IS asserted below is its
//     behavioural neighbour, which the arch gate cannot see: no RENDERED anchor names
//     `mode`, in any state these lanes drive. A link composed at RUNTIME from a variable
//     would pass the gate and fail here.
//   · what `/fleet` and `/board` RENDER — 45/03's shell and entry.
//   · a live fetch of `http://127.0.0.1:4181/fleet`. 4181 is the fleet's FIXED port and is
//     held by the operator's live daemon on the control node; a lane that bound it would
//     be flaky by construction. The last lane cross-checks the link against the fleet's
//     OWN advertisement instead (`aof mesh ui --json`) — the property that actually
//     matters, and it needs no fixed port.
//
// OBSERVED, DEFERRED, DELIBERATELY NOT CHANGED (QA F-45-04-1): `Fleet.tsx`'s local-board
// drill-in href is RELATIVE, so on the fleet origin it resolves to :4181, which 404s
// `/api/work` — the board surface loads but cannot load its stream. That is TODAY's
// behaviour for `?mode=board`, and this story reproduces it EXACTLY, one character
// narrower. The lane pins the relative form on purpose; milestone 47 owns the fix.
//
// ── RE-POINTED BY MILESTONE 47 / STORY 01 (ADR-006), 2026-08-10 ────────────────────
// Milestone 47 took the fix this file routed to it, and it took it by DELETION: the
// local-shape boards branch — `BoardsRegion`, `BoardTile`, `BoardDrillIn` and the rest
// of `Fleet.tsx`'s unreachable local body — is gone, because the payload that reached it
// has not been served by the fleet FACE since m34 (this file's own F-45-04-DEV-1
// deviation note is the measurement that found it). So the relative `/board` anchor
// three of these lanes pinned no longer exists, in any state.
//
// THE LANES WERE RE-POINTED, NEVER DELETED WITH THE CODE THEY GUARDED, and the property
// each one protected survives verbatim — only its subject moved:
//   · `01 scenario 3` guarded "the fleet's board affordances never dead-end". The
//     two-case local/peer split existed so a rewrite could not turn a deliberate copy
//     control into a dead href. m47/ADR-006(a) settles the same question one level up:
//     EVERY board door on the fleet is now a control whose destination is minted at
//     click time by `GET /api/mesh/board-url`, and there is nothing left to hard-code.
//     The lane now measures exactly that, over the REAL producer payload that used to
//     reach the deleted branch.
//   · the mode sweep's fleet rows (5 and 6) keep their subject and their instrument;
//     their pinned anchor COUNTS move from 1 and 0 to 0 and 0, which is the reading the
//     m45 amendment (QA F-45-04-QA-1) said was the stronger one — an anchor appearing is
//     as loud as one disappearing.
//   · `01 scenario 5`'s third row compared a RENDERED href against the board server's
//     own advertised URL, because two independently edited sites can drift. There is no
//     second site any more: the fleet ASKS the board's launcher for the address. The row
//     now cross-checks the ONE resolver's answer against `aof work ui --json`'s
//     advertised board URL — the same two-real-faces claim, made where the answer now
//     lives.
// The behavioural half of m47's own contract lives in `test/fleet-board-drill-in
// .test.mjs` and `test/ui/fleet-boards-branch-deleted.test.mjs`; this file keeps the m45
// claims that outlived the change.
//
// Run focused and isolated (hook-enforced):
//   AOF_GLOBAL_HOME=$(mktemp -d) node --test test/ui/in-app-cross-links.test.mjs
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withBoardFace } from "../support/board-face-fixture.mjs";
import { withBoardApp } from "../support/board-app-harness.mjs";
import {
  withFleetBoards,
  BOARDS_FIXTURE_NOW as NOW,
  BOARDS_FIXTURE_PEER_NODE as PEER_NODE,
} from "../support/mesh-status-boards-fixture.mjs";
import { withTwoWorkspaceAssignFixture } from "../support/mesh-ui-assign-fixture.mjs";
import { findAll, textOf, visibleTextOf } from "../support/mini-react.mjs";
import { spawnCliAsync } from "../support/cli-spawn.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "bin", "aof.mjs");

// The Background's work stream: one milestone "34" with story "34/01".
const STREAM = {
  milestone: { number: "34", slug: "global-mesh", title: "Global Mesh", status: "in-progress" },
  stories: [{ number: "01", slug: "the-story", title: "The story", status: "in-progress" }],
};

// --- reading the RENDERED tree ------------------------------------------------

// Every anchor in a rendered tree, as { href, node }. The sweep lane counts these, so it
// is deliberately BROAD: any `<a>`, wherever it renders, whatever built it.
function anchorsIn(tree) {
  return findAll(tree, (node) => node.type === "a").map((node) => ({ node, href: node.props?.href }));
}

// The one anchor whose visible text contains `text` — addressed the way the reader
// addresses it, never by index.
function anchorByText(tree, text) {
  return anchorsIn(tree).find((anchor) => visibleTextOf(anchor.node).includes(text)) ?? null;
}

// The board's dead-server banner: the `role="alert"` strip the surface contributes into
// the notice rail. Found by its ROLE in the a11y tree, not by its copy.
function banner(tree) {
  return findAll(tree, (node) => node.props?.role === "alert")[0] ?? null;
}

// The board's own `⟳ sync` control — the production door a silent refresh comes through.
function syncControl(tree) {
  return findAll(tree, (node) => node.type === "button" && node.props?.["aria-label"] === "Sync work stream")[0] ?? null;
}

// The shared advertised-URL Thens, read through `new URL` and never as a substring: a
// query glued onto a path parses as a PATHNAME that contains the parameters as text, and
// every `includes` check in the world accepts it (task 00's trap 1).
function assertLinkPath(href, { path: expectedPath, scope = "absent", label }) {
  const url = new URL(href);
  assert.equal(url.pathname, expectedPath, `${label}: the href's pathname is exactly ${expectedPath} (got ${href})`);
  assert.equal(url.searchParams.get("mode"), null, `${label}: …and it names no \`mode\` parameter (got ${href})`);
  assert.equal(
    url.searchParams.get("scope"),
    scope === "absent" ? null : scope,
    `${label}: …its \`scope\` parameter, read via searchParams.get, is ${scope} (got ${href})`,
  );
  assert.ok(!url.pathname.includes("&"), `${label}: the pathname contains no "&" (got ${href})`);
  assert.ok(!url.pathname.includes("?"), `${label}: the pathname contains no "?" (got ${href})`);
  return url;
}

// "not one of them names a `mode` parameter, in its query or ANYWHERE else" — so the test
// is on the raw href string, not only on its parsed search. A relative href gets a
// throwaway base so it parses at all; the base is never asserted against.
function namesMode(href) {
  if (typeof href !== "string") return false;
  if (/[?&]mode=/.test(href)) return true;
  const url = new URL(href, "http://127.0.0.1:1/");
  return url.searchParams.has("mode") || url.pathname.includes("mode=");
}

// `aof <verb> --json` through the REAL CLI — task 00's channel, reused here so the two
// sides of the cross-check lane are the two REAL faces and not one fact read twice.
async function probe(cwd, args) {
  const result = await spawnCliAsync(process.execPath, [cliPath, ...args, "--json"], {
    cwd,
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });
  assert.equal(result.status, 0, `\`aof ${args.join(" ")} --json\` exits 0 (stderr: ${result.stderr})`);
  return JSON.parse(result.stdout);
}

// Drive the board into `serverGone`: make the REAL face refuse the list, then press the
// board's OWN `⟳ sync` control three times (three consecutive SILENT load failures).
async function driveServerGone(face, app) {
  face.failListWith(503, "Board face refused the list");
  for (let press = 0; press < 3; press += 1) {
    const sync = syncControl(app.tree());
    assert.ok(sync, "the board renders its own `⟳ sync` control — the production door a silent refresh comes through");
    await sync.props.onClick({ stopPropagation() {}, preventDefault() {} });
    await app.flush();
  }
}

export const inAppCrossLinksTests = [
  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: the board's dead-server banner links the fleet at a path, on the fleet's
  // own fixed origin.
  //
  // The banner exists because a board server dies with every daemon restart and its port
  // is ephemeral; the fleet's port is FIXED, which is the whole reason this link is
  // absolute and hard-coded. The migration must keep that.
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "in-app-cross-links/01 the board's dead-server banner links the fleet at a PATH, on the fleet's own fixed origin (01 scenario 1)",
    async run() {
      await withBoardFace(async (face) => {
        await withBoardApp({ url: face.url, search: "" }, async (app) => {
          assert.ok(app.laneCards().length > 0 || app.overviewCards().length > 0, "the board loaded its stream first");
          assert.equal(banner(app.tree()), null, "…and no dead-server banner stands while the face is healthy");

          await driveServerGone(face, app);

          const strip = banner(app.tree());
          assert.ok(strip, "after three consecutive silent refresh failures the dead-server banner renders");

          const link = anchorByText(strip, "the fleet");
          assert.ok(link, "…carrying a \"the fleet\" anchor");
          const href = assertLinkPath(link.href, { path: "/fleet", scope: "absent", label: "the banner's fleet link" });
          assert.equal(href.hostname, "127.0.0.1", "its host is 127.0.0.1");
          assert.equal(href.port, "4181", "…and its port is 4181 — the fleet's FIXED port, unchanged, because a board port is ephemeral and a fleet port is not");
          assert.equal(href.search, "", "it carries no `scope` parameter — this link never had one, and the migration must not invent one");

          // A URL change, not a copy change.
          assert.equal(textOf(link.node).trim(), "the fleet", "the anchor's own words are unchanged");
          assert.match(String(link.node.props?.className ?? ""), /\bunderline\b/, "…and its `underline` affordance is unchanged");
          const strip_text = visibleTextOf(strip).replace(/\s+/g, " ");
          assert.match(strip_text, /This board's server is gone/, "the banner's sentence is unchanged…");
          assert.match(strip_text, /Reopen the board from the fleet/, "…including the clause the link sits inside");
        });
      }, { stream: STREAM });
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: the detail panel's "watch on the fleet" link is a path that still carries
  // `scope=global`.
  //
  // The one in-app link carrying a query payload, and the shape ADR-003 names as the
  // bookmarked form that must survive intact.
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "in-app-cross-links/01 the detail panel's \"watch on the fleet\" link is a PATH that still carries scope=global, and is still absent once a session exists (01 scenario 2)",
    async run() {
      // (a) active, held by another node, NO sessionId — the state the link renders in.
      await withBoardFace(async (face) => {
        await face.dispatched("34/01", { node: PEER_NODE, state: "running", sessionId: null, at: NOW });
        await withBoardApp({ url: face.url, hash: "#34/01", search: "" }, async (app) => {
          const detail = app.detail();
          assert.ok(detail, "the detail panel is open on 34/01");
          assert.match(detail.title ?? "", /The story/, "…on the item the lane deep-linked to");

          const link = anchorByText(detail.panel, "watch on the fleet");
          assert.ok(link, "the \"watch on the fleet\" anchor renders for an ACTIVE item with no session");
          assertLinkPath(link.href, { path: "/fleet", scope: "global", label: "the watch link" });
          assert.equal(new URL(link.href).hostname, "127.0.0.1", "…on the fleet's own fixed origin");
          assert.equal(new URL(link.href).port, "4181", "…at its fixed port");

          assert.equal(link.node.props?.target, "_blank", "its `target` is _blank — unchanged");
          assert.equal(link.node.props?.rel, "noreferrer", "its `rel` is noreferrer — unchanged");
          assert.match(String(link.node.props?.title ?? ""), new RegExp(PEER_NODE), "…and its title still names the holding node");
        });
      }, { stream: STREAM });

      // (b) the SAME item once it reports a sessionId — the pre-existing condition, which
      // the migration must leave untouched.
      await withBoardFace(async (face) => {
        await face.dispatched("34/01", { node: PEER_NODE, state: "running", sessionId: "sess-abc123", at: NOW });
        await withBoardApp({ url: face.url, hash: "#34/01", search: "" }, async (app) => {
          const detail = app.detail();
          assert.ok(detail, "the detail panel is open on 34/01");
          assert.equal(
            anchorByText(detail.panel, "watch on the fleet"),
            null,
            "the link is absent when the same item reports `execution.sessionId` — the pre-existing condition is untouched by the migration",
          );
        });
      }, { stream: STREAM });
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario: the fleet renders no board affordance that can dead-end.
  //
  // RE-POINTED by m47/ADR-006 (see the header). As written at m45 this lane pinned the
  // local board's RELATIVE `/board` anchor and the peer board's href-less copy control.
  // Both belonged to the local-shape branch m47 deleted, and the property they were
  // there for — a rewrite must never turn a deliberate control into a dead href — is now
  // true by construction and is measured that way: over the SAME producer payload that
  // used to reach the deleted branch, the fleet renders NO anchor naming a board and NO
  // board affordance at all for a board in that payload.
  //
  // The instrument is unchanged and it is the one that found the gap: the REAL
  // `mesh:status` producer over a REAL group registry, served verbatim to the REAL
  // <Fleet/>. If the branch came back, this lane would see it.
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "in-app-cross-links/01 the fleet renders NO board affordance that can dead-end — the local/peer board branch is gone and no anchor names a board (01 scenario 3, re-pointed by m47/ADR-006)",
    async run() {
      await withFleetBoards({ local: "lark-guard", peer: "vista-app-web" }, async (app, { payload }) => {
        const tree = app.tree();

        // The producer really did hand this surface two boards — one local, one peer.
        assert.deepEqual(
          payload.boards.map((board) => [board.ref, board.local === true]),
          [["lark-guard", true], ["vista-app-web", false]],
          "the REAL mesh:status payload served to the app carries BOTH boards, marked as they always were — the producer is untouched",
        );

        const boardAffordances = findAll(
          tree,
          (node) => (node.type === "a" || node.type === "button") && visibleTextOf(node).includes("Open board"),
        );
        assert.deepEqual(
          boardAffordances.map((node) => node.type),
          [],
          "NEITHER board renders an `Open board →` control any more — the branch that rendered them is deleted (m47/ADR-006(b))",
        );

        for (const ref of ["lark-guard", "vista-app-web"]) {
          assert.equal(
            visibleTextOf(tree).includes(ref),
            false,
            `no board tile is rendered for "${ref}" — the region is gone, not merely emptied`,
          );
        }
        assert.equal(
          visibleTextOf(tree).includes("No boards registered in the group yet"),
          false,
          "…and neither is the dashed placeholder an operator has actually been looking at since m34",
        );

        // The property the m45 lane existed to protect, asserted where it now lives:
        // there is no href on this surface that could dead-end anywhere.
        assert.deepEqual(anchorsIn(tree).map((anchor) => anchor.href), [], "the fleet renders NO anchor at all in this state");
      });
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario Outline: across every state these lanes drive, no anchor either surface
  // renders names a `mode` parameter. (6 rows)
  //
  // The behavioural neighbour of the arch gate, and the half the gate cannot see: a
  // `mode` parameter composed at RUNTIME from a variable leaves no literal in source.
  //
  // ── F-45-04-DEV-2, a feature defect FLAGGED rather than fixed ─────────────────────
  // The outline's last Then — "at least one anchor was collected, so the sweep is
  // non-vacuous" — is UNSATISFIABLE for three of its own six rows, measured against the
  // real surfaces at HEAD. `ui/src/board/` renders exactly TWO anchors in total (the
  // banner's and the detail panel's, both conditional) and `ui/src/fleet/` renders
  // exactly ONE (the local-board drill-in). So `the board, healthy` (0), `the board,
  // deep-linked by hash` (0 — the panel opens, but the watch link needs an ACTIVE
  // assignment with no session, which that row does not state) and `the fleet, a peer
  // board` (0 — the peer branch is a `<button>` by design, which is the very split
  // scenario 3 exists to protect) each render no anchor at all.
  //
  // The clause's INTENT is a non-vacuity guard, and it is honoured here at the level
  // where it is both true and load-bearing: the anchor count of EVERY row is pinned as a
  // measured table, so a state that stops rendering an anchor it used to render fails
  // loudly (which is strictly stronger than `> 0`), and the sweep as a whole is asserted
  // to have collected anchors. Every row is still swept for the `mode` and off-machine
  // properties, which is the scenario's actual subject.
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "in-app-cross-links/01 across every state these lanes drive, NO anchor either surface renders names a `mode` parameter (01 scenario 4, all six rows)",
    async run() {
      const collected = [];

      const sweep = (label, tree) => {
        const anchors = anchorsIn(tree);
        for (const anchor of anchors) {
          assert.equal(namesMode(anchor.href), false, `${label}: no rendered anchor names a \`mode\` parameter (got ${anchor.href})`);
          if (typeof anchor.href === "string" && /^[a-z]+:\/\//i.test(anchor.href)) {
            assert.equal(new URL(anchor.href).hostname, "127.0.0.1", `${label}: every ABSOLUTE href names host 127.0.0.1 — no link points off-machine (got ${anchor.href})`);
          }
        }
        collected.push({ label, hrefs: anchors.map((anchor) => anchor.href) });
      };

      // ── the board, healthy ────────────────────────────────────────────────
      await withBoardFace(async (face) => {
        await withBoardApp({ url: face.url, search: "" }, async (app) => {
          sweep("the board, healthy", app.tree());

          // ── the board, server gone ──────────────────────────────────────
          await driveServerGone(face, app);
          assert.ok(banner(app.tree()), "the server-gone state really was reached");
          sweep("the board, server gone", app.tree());
        });
      }, { stream: STREAM });

      // ── the board, detail panel open on an item held by another node ──────
      await withBoardFace(async (face) => {
        await face.dispatched("34/01", { node: PEER_NODE, state: "running", sessionId: null, at: NOW });
        await withBoardApp({ url: face.url, hash: "#34/01", search: "" }, async (app) => {
          assert.ok(app.detail(), "the detail panel really is open");
          sweep("the board, detail panel open", app.tree());
        });
      }, { stream: STREAM });

      // ── the board, deep-linked by hash (the drill-in's own landing state) ──
      await withBoardFace(async (face) => {
        await withBoardApp({ url: face.url, hash: "#34/01", search: "" }, async (app) => {
          sweep("the board, deep-linked by hash", app.tree());
        });
      }, { stream: STREAM });

      // ── the fleet, a local board ──────────────────────────────────────────
      await withFleetBoards({ local: "lark-guard" }, async (app) => {
        sweep("the fleet, a local board", app.tree());
      });

      // ── the fleet, a peer board and no local board ────────────────────────
      await withFleetBoards({ peer: "vista-app-web", local: null }, async (app) => {
        // A PINNED-ZERO row (see the counts table below): it proves the count, and the
        // mode-sweep clause is knowingly vacuous here. The feature records the same.
        sweep("the fleet, a peer board", app.tree());
      });

      assert.equal(collected.length, 6, "all six states were driven and swept");

      // The non-vacuity guard, at the level where it is true (see F-45-04-DEV-2 above):
      // the sweep as a whole collected anchors…
      const everyHref = collected.flatMap((row) => row.hrefs);
      assert.ok(everyHref.length > 0, "the sweep collected anchors — it is not vacuous as a whole");
      // …and each row's anchor COUNT is pinned, so a state that stops rendering a link it
      // renders today fails here rather than passing an emptier sweep.
      //
      // ROWS 5 AND 6 MOVED TO ZERO AT m47/ADR-006, and the move is the point rather than
      // a maintenance edit: `ui/src/fleet/` used to render exactly ONE anchor in total —
      // the local board's relative `/board` — and the branch that rendered it is deleted.
      // The fleet's board door is now a CONTROL that mints its destination at click time,
      // so ZERO is the true value for every fleet state, and pinning it is what stops a
      // future author reintroducing an `href` here without meeting ADR-006(a).
      assert.deepEqual(
        collected.map((row) => [row.label, row.hrefs.length]),
        [
          // The board renders exactly two anchors in total, both conditional…
          ["the board, healthy", 0],
          ["the board, server gone", 1],
          ["the board, detail panel open", 1],
          ["the board, deep-linked by hash", 0],
          // …and the fleet renders NONE, in any state (m47/ADR-006(b)).
          ["the fleet, a local board", 0],
          ["the fleet, a peer board", 0],
        ],
        "each state renders exactly the anchors it renders today — a link that appears or disappears is caught here",
      );
      assert.deepEqual(
        [...new Set(everyHref)].sort(),
        ["http://127.0.0.1:4181/fleet", "http://127.0.0.1:4181/fleet?scope=global"],
        "…and the whole set of hrefs these two surfaces can render is exactly the two the BOARD renders — the fleet's one anchor left with m47/ADR-006(b)'s deletion",
      );
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario Outline: each in-app link names the same path the corresponding server
  // advertises for itself. (3 rows)
  //
  // Two independently edited sites agreeing is what stops the board pointing at `/fleet`
  // while the fleet advertises `/fleet-view`.
  //
  // THE THIRD ROW WAS RE-POINTED BY m47/ADR-006, and the re-pointing is a strengthening
  // rather than a substitution. It used to compare a RELATIVE rendered href with the
  // board's ABSOLUTE advertised URL, by pathname. That href is gone: the fleet no longer
  // NAMES a board address at all, it ASKS `GET /api/mesh/board-url` — the launcher — for
  // one at click time. So the row now compares the ONE resolver's real answer with what
  // `aof work ui --json` advertises for the same workspace, which is the same
  // two-independently-edited-sites claim asked where the answer now lives. Both sides
  // are real faces and neither is a source read.
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: "in-app-cross-links/01 each in-app link names the SAME path the corresponding server advertises for itself (01 scenario 5, all three rows; row 3 re-pointed by m47/ADR-006)",
    async run() {
      let bannerHref;
      let watchHref;
      let resolvedBoardUrl;
      let fleetProbe;
      let boardProbe;

      await withBoardFace(async (face) => {
        await face.dispatched("34/01", { node: PEER_NODE, state: "running", sessionId: null, at: NOW });
        await withBoardApp({ url: face.url, hash: "#34/01", search: "" }, async (app) => {
          watchHref = anchorByText(app.detail().panel, "watch on the fleet")?.href;
          await driveServerGone(face, app);
          bannerHref = anchorByText(banner(app.tree()), "the fleet")?.href;
        });
        // The probes run in the SAME workspace the surfaces were mounted against, and
        // INSIDE the fixture's lifetime — `withBoardFace` removes its temp repo on the
        // way out, and a CLI spawned with a cwd that no longer exists never runs at all.
        fleetProbe = await probe(face.root, ["mesh", "ui"]);
      }, { stream: STREAM });

      // Row 3's two sides, both real: the FLEET's resolver answer for a card's own
      // workspace, and the BOARD's own advertisement of what it would serve there.
      await withTwoWorkspaceAssignFixture(async ({ url, workspaceIdA, rootA }) => {
        const response = await fetch(new URL(`/api/mesh/board-url?workspaceId=${encodeURIComponent(workspaceIdA)}&ref=18`, url));
        assert.equal(response.status, 200, "the fleet's ONE board resolver answers the drill-in's question");
        resolvedBoardUrl = (await response.json()).url;
        boardProbe = await probe(rootA, ["work", "ui"]);
      });

      assert.ok(bannerHref, "the banner link rendered");
      assert.ok(watchHref, "the watch link rendered");
      assert.ok(resolvedBoardUrl, "the fleet's resolver answered a board URL");

      const rows = [
        { case: "the banner link vs the fleet", href: bannerHref, advertised: fleetProbe.fleetUrl },
        { case: "the watch link vs the fleet", href: watchHref, advertised: fleetProbe.fleetUrl },
        // The resolver's answer vs the board's own advertisement — compared by pathname,
        // because the resolver's answer also carries the clicked ref as a fragment.
        { case: "the resolved board URL vs the board", href: resolvedBoardUrl, advertised: boardProbe.boardUrl },
      ];

      for (const row of rows) {
        const linkPath = new URL(row.href, "http://127.0.0.1:1/").pathname;
        const advertisedPath = new URL(row.advertised).pathname;
        assert.equal(
          linkPath,
          advertisedPath,
          `${row.case}: the pathname of the rendered href and the pathname of the probe's advertised URL are the same string`,
        );
        assert.equal(namesMode(row.href), false, `${row.case}: the rendered href names no \`mode\` parameter`);
        assert.equal(namesMode(row.advertised), false, `${row.case}: …and neither does the advertised URL`);
      }
    },
  },
];
