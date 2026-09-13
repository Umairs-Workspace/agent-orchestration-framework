// Traceability wiring for milestone 46 / story 02 / task 00 —
// tasks/00_the-board-is-handed-the-fleet-origin.feature (@executable @cli @work @board).
//
// Covers EVERY @executable scenario and Scenario-Outline row of that feature: a board
// the fleet LAUNCHED is handed that fleet's real bound origin and serves it back as a
// read-only fact; two fleets alive at once each hand their own board their own origin;
// the fact is a GET that moves nothing on disk; every non-GET method answers exactly
// what a GET-only sibling on the same server answers; the memoised per-workspace board
// is reused and its origin does not move; one fleet with two workspaces yields two
// boards on two ports carrying the SAME fleet origin; and a board nobody handed an
// origin to still answers the route and says plainly that it has none.
//
// THE ROUTE'S PATH is named in exactly ONE place in this file (ROUTE below) because the
// feature deliberately does not fix it — every Then reads a VALUE off a real response,
// never a path.
//
// LITMUS, as the feature states it: every assertion is a value read off a real HTTP
// response from a REAL `serveMeshUi` / `serveBoard` on EPHEMERAL ports — never a mock of
// either server, and never a source read. The fixture idiom is this repo's own
// (`test/mesh/ui/mesh-ui-serve.test.mjs`'s makeRepo + publishWorkspaceSnapshot, and
// `test/ui/board-serve.test.mjs`'s writeDist).
//
// THE PORT TRAP, and it governs every lane: no server here binds a fixed port. The live
// daemons on the control node hold :4181 (fleet UI) and :4182 (control serve), so a lane
// that started a fleet on the documented default would EADDRINUSE against the operator's
// own soak. An "explicit non-default port" is one this file obtained by binding :0,
// reading `address().port` and releasing it. Nothing here listens on 4181, and no
// assertion claims nothing is listening there.
//
// ISOLATION: AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<driver> — FOCUSED, never the
// full suite. The global mesh store each lane uses is a per-fixture temp dir passed as
// `globalStoreOptions`, so a lane cannot reach the real ~/.aof either way.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serveBoard, boardUiDist } from "../../src/board-serve.mjs";
import { serveMeshUi, meshUiDist } from "../../src/mesh/ui-serve.mjs";
import { loadWorkspace } from "../../src/work.mjs";
import { openGlobalWorkProjectionStore } from "../../src/global-work-store.mjs";
import { publishGlobalRegistryDescriptorsToStore } from "../../src/global-node-registry.mjs";
import { publishNodeRecord } from "../../src/mesh/store.mjs";
// The workspace id is asked of its ONE home (TECH_DEBT 4's fix), never re-derived
// here — it is the same rule the projection store keyed the published snapshot on.
import { resolveWorkspaceId } from "../../src/workspace-identity.mjs";

// The ONE place this file names the route the build chose. Every Then below reads a
// value off the response it returns.
const ROUTE = "/api/fleet-origin";

// --- fixtures ----------------------------------------------------------------

// A base dir holding the isolated global mesh store and one or more workspace repos.
// The store lives OUTSIDE every repo so a byte-level snapshot of a workspace fixture is
// not perturbed by ordinary projection bookkeeping.
async function makeBase() {
  const base = await mkdtemp(path.join(os.tmpdir(), "aof-fleet-origin-"));
  const globalHome = path.join(base, "global-home");
  await mkdir(globalHome, { recursive: true });
  return { base, globalStoreOptions: { env: { AOF_GLOBAL_HOME: globalHome } } };
}

// A workspace repo whose work stream holds exactly one milestone, published into the
// shared isolated projection store so the fleet's board-url route can find it.
async function makeWorkspace(base, { name, ref, slug }) {
  const repo = path.join(base, `repo-${name}`);
  const workDir = path.join(repo, "wiki", "work");
  const milestoneDir = path.join(workDir, `${ref}_milestone_${slug}`);
  await mkdir(milestoneDir, { recursive: true });
  await writeFile(
    path.join(milestoneDir, "SPEC.md"),
    `---\ntype: milestone\nnumber: ${ref}\nslug: ${slug}\nstatus: in-progress\ntitle: ${slug}\n---\n`,
    "utf8"
  );
  await mkdir(path.join(repo, ".aof"), { recursive: true });
  await writeFile(
    path.join(repo, ".aof", "aof.config.json"),
    JSON.stringify({ name, runtimes: ["claude"], work: { dir: "./wiki/work" }, mesh: { enabled: true } }, null, 2),
    "utf8"
  );
  return { repo, workDir, ref };
}

async function publishWorkspace(repo, globalStoreOptions, { nodeId = "mac-studio" } = {}) {
  const workspace = await loadWorkspace(repo, undefined, globalStoreOptions);
  await publishNodeRecord(workspace, nodeId, {
    nodeId,
    host: nodeId,
    os: "darwin",
    runtimes: ["claude"],
    skills: [],
    aofVersion: "0.1.0",
    publishedAt: "2026-08-08T00:00:00.000Z",
  });
  const store = await openGlobalWorkProjectionStore(globalStoreOptions);
  try {
    await store.publishWorkspaceSnapshot(workspace, { now: "2026-08-08T10:05:00.000Z" });
    await publishGlobalRegistryDescriptorsToStore(store, workspace, { now: "2026-08-08T10:05:00.000Z" });
  } finally {
    store.close();
  }
  return resolveWorkspaceId(workspace);
}

// A directory standing in for the BUILT bundle (ui/dist) so neither server refuses with
// ui-build-missing — board-serve.test.mjs's own fixture shape.
async function writeDist(dir) {
  await mkdir(path.join(dir, "assets"), { recursive: true });
  await writeFile(
    path.join(dir, "index.html"),
    '<!doctype html>\n<html><head><script type="module" crossorigin src="/assets/index-abc123.js"></script></head><body><div id="root"></div></body></html>\n',
    "utf8"
  );
  await writeFile(path.join(dir, "assets", "index-abc123.js"), "export const x = 1;\n", "utf8");
  return dir;
}

// One repoRoot whose ui/dist satisfies BOTH servers (boardUiDist and meshUiDist resolve
// to the same `<root>/ui/dist`, which is the point — one bundle, three origins).
async function makeRepoRootWithDist() {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-fleet-origin-root-"));
  await writeDist(meshUiDist(root));
  await writeDist(boardUiDist(root));
  return root;
}

// A free port obtained by binding :0 and releasing it — the ONLY way this file names an
// "explicit, non-default port". Never a literal.
function reserveFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function closeServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

// A BYTE-LEVEL snapshot of a fixture tree: every file's repo-relative path mapped to the
// sha256 of its bytes. Comparing two snapshots catches an added, removed OR rewritten
// file — a mtime/size check would miss a same-length rewrite.
async function snapshotTree(root) {
  const out = new Map();
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      const bytes = await readFile(full);
      out.set(path.relative(root, full).replaceAll("\\", "/"), createHash("sha256").update(bytes).digest("hex"));
    }
  };
  await walk(root);
  return [...out.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

// --- readers -----------------------------------------------------------------

// GET /api/mesh/board-url on a fleet, then read the board's fleet-origin fact from the
// origin THAT response returned — the drill-in an operator actually performs.
async function drillIn(fleetUrl, workspaceId, ref = "34") {
  const response = await fetch(new URL(`/api/mesh/board-url?workspaceId=${encodeURIComponent(workspaceId)}&ref=${ref}`, fleetUrl));
  assert.equal(response.status, 200, "the fleet's board-url route answers 200");
  const body = await response.json();
  return { body, boardOrigin: new URL(body.url).origin };
}

async function readFact(origin) {
  const response = await fetch(new URL(ROUTE, origin));
  return { status: response.status, contentType: response.headers.get("content-type") ?? "", text: await response.text() };
}

async function readFactJson(origin) {
  const { status, text } = await readFact(origin);
  assert.equal(status, 200, `the fleet-origin fact answers 200 on ${origin} (got body: ${text})`);
  return JSON.parse(text);
}

export const boardFleetOriginSeamTests = [
  // ═══ Scenario Outline: the board a fleet launched is handed THAT fleet's bound
  // origin, and serves it back. Both rows. ═══════════════════════════════════════
  ...[
    { case: "the lane's own idiom", startedOn: "an ephemeral port (`port: 0`)", port: async () => 0 },
    { case: "an explicit, non-default port", startedOn: "a free port the lane reserved by binding `:0` and released", port: reserveFreePort },
  ].map((row) => ({
    name: `board-fleet-origin-seam/00 the board a fleet launched is handed that fleet's bound origin and serves it back — ${row.case}`,
    async run() {
      const { base, globalStoreOptions } = await makeBase();
      const root = await makeRepoRootWithDist();
      let fleet;
      try {
        const { repo } = await makeWorkspace(base, { name: "alpha", ref: "34", slug: "global-mesh" });
        const workspaceId = await publishWorkspace(repo, globalStoreOptions);

        fleet = await serveMeshUi({ projectDir: repo, port: await row.port(), repoRoot: root, globalStoreOptions });
        const fleetPort = fleet.server.address().port;

        const { boardOrigin } = await drillIn(fleet.url, workspaceId);
        const fact = await readFactJson(boardOrigin);

        // Read off the RUNNING fleet's own socket, not off a constant.
        assert.equal(
          fact.fleetOrigin,
          `http://127.0.0.1:${fleetPort}`,
          "`fleetOrigin` is exactly http://127.0.0.1: followed by the port that fleet's own server.address().port reports"
        );
        // The same origin obtained two independent ways.
        assert.equal(
          fact.fleetOrigin,
          new URL(fleet.fleetUrl).origin,
          "…and it is byte-identical to `new URL(fleetUrl).origin` computed from the fleetUrl serveMeshUi returned"
        );
        assert.equal(
          fact.fleetOrigin,
          new URL(fact.fleetOrigin).origin,
          "…and it equals its own `new URL(...).origin`, so it is an ORIGIN and not a URL that merely starts with one"
        );
        assert.equal(fact.source, "launcher", "`source` is \"launcher\" — the board was TOLD, and the payload says so");
        assert.notEqual(
          new URL(fact.fleetOrigin).port,
          new URL(boardOrigin).port,
          "`fleetOrigin`'s port is NOT the board's own — a same-origin guess could not have produced this value"
        );
        assert.notEqual(new URL(fact.fleetOrigin).port, "4181", "…nor 4181 — a hard-coded default could not have produced it either");
      } finally {
        if (fleet) await closeServer(fleet.server);
        await rm(base, { recursive: true, force: true });
        await rm(root, { recursive: true, force: true });
      }
    },
  })),

  // ═══ Scenario: two fleets running at the same time each hand their OWN board their
  // OWN origin. The anti-constant proof — a constant, an env var, a module-level
  // singleton or a same-origin fallback each fail HERE and pass everything else. ═════
  {
    name: "board-fleet-origin-seam/00 two fleets running at once each hand their OWN board their OWN origin",
    async run() {
      const { base, globalStoreOptions } = await makeBase();
      const root = await makeRepoRootWithDist();
      let fleetA;
      let fleetB;
      try {
        const { repo } = await makeWorkspace(base, { name: "alpha", ref: "34", slug: "global-mesh" });
        const workspaceId = await publishWorkspace(repo, globalStoreOptions);

        fleetA = await serveMeshUi({ projectDir: repo, port: 0, repoRoot: root, globalStoreOptions });
        fleetB = await serveMeshUi({ projectDir: repo, port: 0, repoRoot: root, globalStoreOptions });
        assert.notEqual(fleetA.server.address().port, fleetB.server.address().port, "the two fleets bound two different ephemeral ports");

        const a = await drillIn(fleetA.url, workspaceId);
        const b = await drillIn(fleetB.url, workspaceId);
        const factA = await readFactJson(a.boardOrigin);
        const factB = await readFactJson(b.boardOrigin);

        assert.notEqual(factA.fleetOrigin, factB.fleetOrigin, "the two `fleetOrigin` values are different from each other");
        assert.equal(factA.fleetOrigin, `http://127.0.0.1:${fleetA.server.address().port}`, "each equals its OWN fleet's origin (A)");
        assert.equal(factB.fleetOrigin, `http://127.0.0.1:${fleetB.server.address().port}`, "each equals its OWN fleet's origin (B)");
        assert.notEqual(factA.fleetOrigin, `http://127.0.0.1:${fleetB.server.address().port}`, "…and neither equals the other fleet's (A)");
        assert.notEqual(factB.fleetOrigin, `http://127.0.0.1:${fleetA.server.address().port}`, "…and neither equals the other fleet's (B)");
        assert.notEqual(factA.fleetOrigin, a.boardOrigin, "neither equals its own board's origin (A)");
        assert.notEqual(factB.fleetOrigin, b.boardOrigin, "neither equals its own board's origin (B)");
        assert.notEqual(factA.fleetOrigin, "http://127.0.0.1:4181", "…and neither is http://127.0.0.1:4181 (A)");
        assert.notEqual(factB.fleetOrigin, "http://127.0.0.1:4181", "…and neither is http://127.0.0.1:4181 (B)");
        assert.equal(factA.source, "launcher", "both facts carry source \"launcher\" (A)");
        assert.equal(factB.source, "launcher", "both facts carry source \"launcher\" (B)");
      } finally {
        if (fleetA) await closeServer(fleetA.server);
        if (fleetB) await closeServer(fleetB.server);
        await rm(base, { recursive: true, force: true });
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  // ═══ Scenario: reading the fleet-origin fact is a READ — it answers on a GET and
  // changes not one byte. ═══════════════════════════════════════════════════════════
  {
    name: "board-fleet-origin-seam/00 reading the fleet-origin fact is a read — ten GETs, byte-identical, and not one byte moves on disk",
    async run() {
      const { base, globalStoreOptions } = await makeBase();
      const root = await makeRepoRootWithDist();
      let fleet;
      try {
        const { repo } = await makeWorkspace(base, { name: "alpha", ref: "34", slug: "global-mesh" });
        const workspaceId = await publishWorkspace(repo, globalStoreOptions);
        fleet = await serveMeshUi({ projectDir: repo, port: 0, repoRoot: root, globalStoreOptions });
        const { boardOrigin } = await drillIn(fleet.url, workspaceId);

        const before = await snapshotTree(repo);

        const reads = [];
        for (let i = 0; i < 10; i += 1) reads.push(await readFact(boardOrigin));
        for (const [index, read] of reads.entries()) {
          assert.equal(read.status, 200, `read ${index + 1} answers 200`);
          assert.match(read.contentType, /application\/json/, `read ${index + 1} answers a JSON content type`);
          assert.deepEqual(
            Object.keys(JSON.parse(read.text)).sort(),
            ["fleetOrigin", "source"],
            `read ${index + 1}'s body carries exactly the keys \`fleetOrigin\` and \`source\``
          );
        }
        for (const read of reads.slice(1)) {
          assert.equal(read.text, reads[0].text, "all ten bodies are byte-identical — a fact, not a value that drifts per request");
        }

        assert.deepEqual(await snapshotTree(repo), before, "a fresh snapshot of the workspace fixture is unchanged: no file added, removed or rewritten");

        // The frozen /api/work* surface is not re-routed by the additive route.
        const list = await fetch(new URL("/api/work/list", boardOrigin));
        assert.equal(list.status, 200, "the board's frozen /api/work/list still answers 200");
        assert.deepEqual(
          Object.keys(await list.json()).sort(),
          ["items", "nodeId", "stalenessSeconds"],
          "…with its { items, stalenessSeconds, nodeId } envelope — the new route is additive, never a re-route"
        );

        // The fact lives on the BOARD's origin only; the fleet face gained nothing.
        const onTheFleet = await fetch(new URL(ROUTE, fleet.url));
        assert.equal(onTheFleet.status, 404, "the FLEET origin answers 404 for that same route path");
      } finally {
        if (fleet) await closeServer(fleet.server);
        await rm(base, { recursive: true, force: true });
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  // ═══ Scenario Outline: every non-GET method answers exactly what a GET-only sibling
  // on the same server answers, and writes nothing. All five rows in ONE lane, so the
  // "unchanged after ALL of them" and "a following GET still answers" Thens are real. ══
  {
    name: "board-fleet-origin-seam/00 every non-GET method answers exactly what GET-only sibling /api/capabilities answers, and writes nothing (all five rows)",
    async run() {
      const { base, globalStoreOptions } = await makeBase();
      const root = await makeRepoRootWithDist();
      let fleet;
      try {
        const { repo } = await makeWorkspace(base, { name: "alpha", ref: "34", slug: "global-mesh" });
        const workspaceId = await publishWorkspace(repo, globalStoreOptions);
        fleet = await serveMeshUi({ projectDir: repo, port: 0, repoRoot: root, globalStoreOptions });
        const { boardOrigin } = await drillIn(fleet.url, workspaceId);

        const before = await snapshotTree(repo);

        const rows = [
          { case: "a create attempt", method: "POST", status: 404, code: "not-found" },
          { case: "a replace attempt", method: "PUT", status: 404, code: "not-found" },
          { case: "a partial update", method: "PATCH", status: 404, code: "not-found" },
          { case: "a delete attempt", method: "DELETE", status: 404, code: "not-found" },
          // HEAD asserts STATUS only: HTTP forbids a body on a HEAD response and Node
          // strips it, so there is no `code` to compare.
          { case: "a HEAD probe", method: "HEAD", status: 404, code: null },
        ];

        for (const row of rows) {
          const mine = await fetch(new URL(ROUTE, boardOrigin), { method: row.method });
          const sibling = await fetch(new URL("/api/capabilities", boardOrigin), { method: row.method });
          const mineText = await mine.text();
          const siblingText = await sibling.text();

          assert.equal(mine.status, row.status, `${row.case}: the response status is ${row.status}`);
          assert.equal(
            mine.status,
            sibling.status,
            `${row.case}: …byte-identical to what GET-only sibling /api/capabilities answers for the SAME method on the SAME server`
          );
          if (row.code !== null) {
            const mineBody = JSON.parse(mineText);
            const siblingBody = JSON.parse(siblingText);
            assert.equal(mineBody.code, row.code, `${row.case}: the envelope's \`code\` is ${row.code}`);
            assert.equal(mineBody.code, siblingBody.code, `${row.case}: …and it equals the sibling's \`code\``);
            assert.notEqual(mineBody.ok, true, `${row.case}: no response body claims success (no ok:true)`);
            assert.equal(mineBody.fleetOrigin, undefined, `${row.case}: …and no \`fleetOrigin\` is handed out on a write method`);
          } else {
            assert.equal(mineText, "", `${row.case}: a HEAD response carries no body`);
          }
        }

        assert.deepEqual(await snapshotTree(repo), before, "a fresh snapshot of the workspace fixture is unchanged after all of them");

        const after = await readFactJson(boardOrigin);
        assert.equal(after.source, "launcher", "a following GET of the route still answers 200 with the fact — the server survived every rejected method");
        assert.equal(after.fleetOrigin, `http://127.0.0.1:${fleet.server.address().port}`, "…and the fact is unchanged");
      } finally {
        if (fleet) await closeServer(fleet.server);
        await rm(base, { recursive: true, force: true });
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  // ═══ Scenario: a second drill-in for the same workspace reuses the ONE board, and the
  // origin it reports does not move. Threading an option through a memoised launch is
  // exactly the change that can turn a cache hit into a second launch. ═══════════════
  {
    name: "board-fleet-origin-seam/00 a second drill-in reuses the memoised board, the fact does not move, and closing the fleet still closes the board",
    async run() {
      const { base, globalStoreOptions } = await makeBase();
      const root = await makeRepoRootWithDist();
      let fleet;
      let fleetClosed = false;
      try {
        const { repo } = await makeWorkspace(base, { name: "alpha", ref: "34", slug: "global-mesh" });
        const workspaceId = await publishWorkspace(repo, globalStoreOptions);
        fleet = await serveMeshUi({ projectDir: repo, port: 0, repoRoot: root, globalStoreOptions });

        const first = await drillIn(fleet.url, workspaceId);
        const factFirst = await readFactJson(first.boardOrigin);
        const second = await drillIn(fleet.url, workspaceId);
        const factSecond = await readFactJson(second.boardOrigin);

        assert.equal(
          second.body.url,
          first.body.url,
          "the second response's `url` is byte-identical to the first's — the memoised per-workspace board was reused, not relaunched per click"
        );
        assert.equal(second.boardOrigin, first.boardOrigin, "both reads answer from the same board port");
        for (const [label, origin] of [["first", first.boardOrigin], ["second", second.boardOrigin]]) {
          const list = await fetch(new URL("/api/work/list", origin));
          assert.equal(list.status, 200, `${label}: GET /api/work/list answers 200 there`);
          const body = await list.json();
          assert.ok(
            body.items.some((item) => String(item.number ?? item.ref ?? "").includes("34")),
            `${label}: …serving that workspace's own stream (the item "34" is in it)`
          );
        }
        assert.deepEqual(factSecond, factFirst, "both fleet-origin facts are byte-identical — same `fleetOrigin`, same `source`");

        assert.deepEqual(
          Object.keys(second.body).sort(),
          ["ref", "url", "workspaceId"],
          "the /api/mesh/board-url body's own keys are still exactly `url`, `workspaceId`, `ref` — no `origin` key (that field is milestone 49's)"
        );

        // Closing the fleet closes that board with it — the memoised entry is not leaked
        // by the added option.
        await closeServer(fleet.server);
        fleetClosed = true;
        let stillServing = true;
        try {
          await fetch(new URL(ROUTE, first.boardOrigin));
        } catch {
          stillServing = false;
        }
        assert.equal(stillServing, false, "closing the fleet closed that board with it, as it did before");
      } finally {
        if (fleet && !fleetClosed) await closeServer(fleet.server);
        await rm(base, { recursive: true, force: true });
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  // ═══ Scenario: two workspaces get two boards on two ports, and BOTH are handed the
  // SAME one fleet origin. A per-board or per-workspace derivation passes every
  // single-workspace row above and fails here. ═══════════════════════════════════════
  {
    name: "board-fleet-origin-seam/00 one fleet, two workspaces: two boards on two ports, both handed the SAME fleet origin",
    async run() {
      const { base, globalStoreOptions } = await makeBase();
      const root = await makeRepoRootWithDist();
      let fleet;
      try {
        const alpha = await makeWorkspace(base, { name: "alpha", ref: "34", slug: "global-mesh" });
        const beta = await makeWorkspace(base, { name: "beta", ref: "35", slug: "second-stream" });
        const alphaId = await publishWorkspace(alpha.repo, globalStoreOptions);
        const betaId = await publishWorkspace(beta.repo, globalStoreOptions);
        assert.notEqual(alphaId, betaId, "the fixture published TWO distinct workspaces into the one isolated store");

        fleet = await serveMeshUi({ projectDir: alpha.repo, port: 0, repoRoot: root, globalStoreOptions });
        const fleetOrigin = `http://127.0.0.1:${fleet.server.address().port}`;

        const a = await drillIn(fleet.url, alphaId, "34");
        const b = await drillIn(fleet.url, betaId, "35");
        assert.notEqual(a.boardOrigin, b.boardOrigin, "the two board origins are different — two real board servers, not one reused across workspaces");

        for (const [label, origin, present, absent] of [
          ["alpha", a.boardOrigin, "34", "35"],
          ["beta", b.boardOrigin, "35", "34"],
        ]) {
          const body = await (await fetch(new URL("/api/work/list", origin))).json();
          const numbers = body.items.map((item) => String(item.number ?? item.ref ?? ""));
          assert.ok(numbers.some((n) => n.includes(present)), `${label}'s board serves its OWN workspace's stream (${present} is in it)`);
          assert.ok(!numbers.some((n) => n.includes(absent)), `…and not the other's (${absent} is not)`);
        }

        const factA = await readFactJson(a.boardOrigin);
        const factB = await readFactJson(b.boardOrigin);
        assert.equal(factA.fleetOrigin, fleetOrigin, "both boards report the identical `fleetOrigin`, equal to that one fleet's own bound origin (alpha)");
        assert.equal(factB.fleetOrigin, fleetOrigin, "…and beta");
        assert.equal(factA.source, "launcher", "both report source \"launcher\" (alpha)");
        assert.equal(factB.source, "launcher", "…and beta");
      } finally {
        if (fleet) await closeServer(fleet.server);
        await rm(base, { recursive: true, force: true });
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  // ═══ THE NEGATIVE BOUNDARY: a board nobody handed an origin to — the shape every
  // existing serveBoard suite uses — still answers the route and says plainly that it
  // has none. A page that read `undefined` would build ws://undefined/ws/terminal-view
  // and fail far from its cause. ═════════════════════════════════════════════════════
  {
    name: "board-fleet-origin-seam/00 a board nobody handed an origin to still answers the route, and says plainly that it has none",
    async run() {
      const { base } = await makeBase();
      const root = await makeRepoRootWithDist();
      let board;
      try {
        const { repo } = await makeWorkspace(base, { name: "alpha", ref: "34", slug: "global-mesh" });
        // Exactly the shape six existing suites use: no fleet, no origin option at all.
        board = await serveBoard({ projectDir: repo, port: 0, repoRoot: root });

        const { status, contentType, text } = await readFact(board.url);
        assert.equal(status, 200, "the response is 200 — not a 404 and not a 500, or a reader cannot tell \"no fleet configured\" from \"old build\"");
        assert.match(contentType, /application\/json/, "…and it is JSON");
        const fact = JSON.parse(text);

        assert.ok("fleetOrigin" in fact, "the body still carries the key `fleetOrigin`, present and never absent");
        assert.equal(fact.fleetOrigin, null, "`fleetOrigin` is explicitly null");
        assert.notEqual(fact.fleetOrigin, undefined, "…never undefined");
        assert.notEqual(fact.fleetOrigin, "undefined", "…never the STRING \"undefined\"");
        assert.notEqual(fact.fleetOrigin, "", "…never an empty string");
        assert.notEqual(fact.fleetOrigin, "4181", "…never a bare port");
        assert.notEqual(fact.fleetOrigin, "http://127.0.0.1:4181", "…and never a fabricated http://127.0.0.1:4181 invented by the board server");
        assert.ok(text.includes("\"fleetOrigin\":null"), "…and the key is serialised with an explicit null, never omitted");

        assert.notEqual(fact.source, "launcher", "`source` is not \"launcher\" — nothing launched this board, and the payload must not claim it did");
        // THE THIRD VALUE, PINNED BY NAME. The feature's Then reads only `not "launcher"`
        // because it was authored BEFORE the PO ruling that named the value (F-46.02-1);
        // `not "launcher"` is satisfied by "default", by `null`, by `"unset"` and by a
        // typo, and this fact is the entire interface story 46/04 reads. Asserting the
        // literal strengthens the test without touching the contract.
        assert.equal(fact.source, "none", "`source` is exactly \"none\" — the named third value meaning no origin was ESTABLISHED");
        // …and on the WIRE, not just on the parsed object: `undefined` vanishes from
        // JSON.stringify, so a body that omitted either key would still satisfy every
        // property read above once parsed.
        assert.equal(text, '{"fleetOrigin":null,"source":"none"}', "…and the served body is exactly that, byte for byte");

        // A board with no fleet origin is a working board.
        const page = await fetch(new URL("/board", board.url));
        assert.equal(page.status, 200, "the board's page serves exactly as it does today");
        const list = await fetch(new URL("/api/work/list", board.url));
        assert.equal(list.status, 200, "…and its /api/work/* routes serve exactly as they do today");
        assert.deepEqual(Object.keys(await list.json()).sort(), ["items", "nodeId", "stalenessSeconds"], "…with the unchanged envelope");
      } finally {
        if (board) await closeServer(board.server);
        await rm(base, { recursive: true, force: true });
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  // ═══ THE SEAM GUARD (QA F4). NOT a feature scenario, and labelled so nobody reads it
  // as one: task 01's Outline titles the rule — "the value the board serves is an ORIGIN
  // — never a bare port, never a URL carrying a path or a query" — and its rows exercise
  // it through the two suppliers that exist. Both happen to be disciplined, so the rows
  // would stay green over a board server that served whatever it was handed. This lane
  // drives the SEAM directly, because that predicate is the interface story 46/04 reads
  // and a contract upheld only by the current callers' good manners is upheld nowhere.
  // A refused value degrades to "no origin was established" — the board cannot repair a
  // supplier's mistake, and handing a reader a broken origin is worse than handing none.
  {
    name: "board-fleet-origin-seam/00 (seam guard) a handed-down value that is not an ORIGIN is served as null/\"none\", never passed through",
    async run() {
      const { base } = await makeBase();
      const root = await makeRepoRootWithDist();
      const servers = [];
      try {
        const { repo } = await makeWorkspace(base, { name: "alpha", ref: "34", slug: "global-mesh" });

        const refused = [
          ["a bare port", "4181"],
          ["a bare port on a host", "127.0.0.1:4181"],
          ["an origin carrying a path", "http://127.0.0.1:4181/fleet"],
          ["an origin carrying a query", "http://127.0.0.1:4181/?scope=global"],
          ["a websocket scheme", "ws://127.0.0.1:4181"],
          ["a trailing slash the supplier failed to normalise", "http://127.0.0.1:4181/"],
          ["not a URL at all", "not-an-origin"],
          ["the string \"undefined\"", "undefined"],
        ];
        for (const [label, origin] of refused) {
          // Handed down claiming to be the LAUNCHER — the most trusted supplier there is,
          // so the guard cannot be passing merely because the source was unrecognised.
          const board = await serveBoard({ projectDir: repo, port: 0, repoRoot: root, fleetOrigin: { origin, source: "launcher" } });
          servers.push(board.server);
          const { status, text } = await readFact(board.url);
          assert.equal(status, 200, `${label}: the route still answers 200`);
          assert.equal(
            text,
            '{"fleetOrigin":null,"source":"none"}',
            `${label}: ${JSON.stringify(origin)} is refused at the seam and served as no-origin — never handed to a reader`
          );
        }

        // And the guard is not simply refusing everything: a canonical origin passes.
        const good = await serveBoard({ projectDir: repo, port: 0, repoRoot: root, fleetOrigin: { origin: "https://fleet.example", source: "launcher" } });
        servers.push(good.server);
        assert.deepEqual(
          await readFactJson(good.url),
          { fleetOrigin: "https://fleet.example", source: "launcher" },
          "a canonical origin passes through verbatim — the guard is a predicate, not a blanket refusal"
        );
      } finally {
        for (const server of servers) await closeServer(server);
        await rm(base, { recursive: true, force: true });
        await rm(root, { recursive: true, force: true });
      }
    },
  },
];
