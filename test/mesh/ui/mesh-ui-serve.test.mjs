// Traceability wiring for milestone 25 / story 02 / task 00 —
// tasks/00_mesh-ui-serve.feature (@executable).
//
// Covers EVERY @executable scenario / Scenario-Outline row: the `aof mesh ui`
// serve-face stands up ONE 127.0.0.1 server on its documented default port (4181),
// serving the built ui/dist bundle, the GET /api/mesh/status route which
// answers the global mesh projection (with --local narrowing work items to the
// current workspace), and GET /api/mesh/board-url for real board drill-ins; the /api/mesh namespace is DISJOINT from
// the board's frozen /api/work (a board request is a 404, never a proxied board); an
// unknown route is a clean { ok:false, error, code:"not-found" } envelope and a miss
// never crashes the server; a missing bundle + an occupied port are friendly refusals
// (the board's ui-build-missing / EADDRINUSE posture, mirrored), never a stack trace.
//
// Exercises the REAL server (serveMeshUi) against temp fixtures — a fixture ui/dist
// standing in for the built bundle, an isolated global projection store, and real
// fetches against the server. node:assert/strict.
//
// milestone 130 / story 03 — EXTENDED (the suite is at its directory's ceiling) with:
//   01_the-status-body-names-the-serving-node.feature — `localNodeId` beside `scope` on
//     every status answer, `null` on an unconfigured machine, read once per server, the
//     projection untouched (130/ADR-005 §3; TECH_DEBT item 18 (b) paid);
//   02_the-loop-stop-route-is-assign-shaped.feature — item 44's two guard blocks hoisted,
//     then POST /api/mesh/loop-stop admitted as assign is, lifting exactly { scope,
//     workspaceId }, resolved to the local row, answering the verb's document or its coded
//     refusal — every refusal PRODUCED by the fixture's run records (130/ADR-005 §4).
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serveMeshUi, DEFAULT_MESH_UI_PORT, meshUiDist } from "../../../src/mesh/ui-serve.mjs";
import { loadWorkspace } from "../../../src/work.mjs";
import { openGlobalWorkProjectionStore } from "../../../src/global-work-store.mjs";
import { publishGlobalRegistryDescriptorsToStore } from "../../../src/global-node-registry.mjs";
import { publishNodeRecord } from "../../../src/mesh/store.mjs";
import { queryGlobalMeshStatus } from "../../../src/global-mesh-query.mjs";
import { globalMeshPaths } from "../../../src/workspace.mjs";
import { loopStopsDir, readStopRequest } from "../../../src/loop/stop-request.mjs";
import { publishRepoInto, withPublishedAssignFixture } from "../../support/mesh-ui-assign-fixture.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";
import { matchedBraceBody, stripComments } from "../../support/source-slice.mjs";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// ── milestone 130 / story 03 fixtures ─────────────────────────────────────────────────

// Stream `03` with item `03/01` under `root`'s work dir, carrying ONE run record: `state`
// (running by default), a usable `brief.loop` under loopRunId L1 over scope 03 unless a
// `brief` is handed in, a fresh `heartbeatAt` unless one is handed in, and `node` as given.
// Written straight under the item's runs/ dir — the run-store seam the verb reads.
async function writeLoopStream(root, { state = "running", node = null, heartbeatAt = new Date().toISOString(), brief } = {}) {
  const milestoneDir = path.join(root, "wiki", "work", "03_milestone_loop");
  const storyDir = path.join(milestoneDir, "stories", "01_story_first");
  await mkdir(path.join(storyDir, "runs"), { recursive: true });
  await writeFile(path.join(milestoneDir, "SPEC.md"), "---\ntype: milestone\nnumber: 03\nslug: loop\nstatus: in-progress\ntitle: Loop\n---\n", "utf8");
  await writeFile(path.join(storyDir, "STORY.md"), "---\ntype: story\nnumber: 01\nslug: first\nparent: 03\nstatus: in-progress\ntitle: First\n---\n", "utf8");
  const record = {
    runId: "run-1", itemRef: "03/01", state, attempt: 1, outcome: state === "running" ? null : state,
    sessionId: null,
    brief: brief ?? { loop: { loopRunId: "L1", scope: "03", level: "L2", cap: 3, phase: "continue", cycle: 1, startedAt: "2026-09-13T00:00:00.000Z", id: "loop-id", supervised: false } },
    createdAt: "2026-09-13T00:00:00.000Z", updatedAt: heartbeatAt,
    failureReason: null, heartbeatAt, retryOf: null, reclaimedAt: null, node,
  };
  await writeFile(path.join(storyDir, "runs", "run-1.json"), JSON.stringify(record, null, 2), "utf8");
}

// The request files under the ONE home (ADR-001 §1) — this test's isolated AOF_GLOBAL_HOME.
async function requestFiles() {
  try {
    return (await readdir(loopStopsDir())).sort();
  } catch {
    return [];
  }
}

// postLoopStop(url, { method, origin, contentType, rawBody }) — the assign fixture's
// `postAssign` idiom for the third route: `origin: "SAME"` is this server's own origin (the
// exact string a same-origin fetch sends), any other string rides verbatim, `undefined`
// sends no Origin; `contentType: undefined` sends no content-type; `rawBody` is the body.
async function postLoopStop(url, { method = "POST", origin, contentType, rawBody } = {}) {
  const headers = {};
  if (origin !== undefined) headers.origin = origin === "SAME" ? new URL(url).origin : origin;
  if (contentType !== undefined) headers["content-type"] = contentType;
  return fetch(new URL("/api/mesh/loop-stop", url), { method, headers, ...(rawBody === undefined ? {} : { body: rawBody }) });
}

// --- fixtures ----------------------------------------------------------------

// A repo whose config points work.dir at wiki/work, with one work item and one
// node record published into an isolated global mesh projection store.
async function makeRepo() {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-mesh-ui-serve-"));
  const workDir = path.join(repo, "wiki", "work");
  const globalHome = path.join(repo, "global-home");
  const milestoneDir = path.join(workDir, "34_milestone_global-mesh");
  await mkdir(milestoneDir, { recursive: true });
  await writeFile(
    path.join(milestoneDir, "SPEC.md"),
    "---\ntype: milestone\nnumber: 34\nslug: global-mesh\nstatus: in-progress\ntitle: Global Mesh\n---\n",
    "utf8"
  );
  await mkdir(path.join(repo, ".aof"), { recursive: true });
  await writeFile(
    path.join(repo, ".aof", "aof.config.json"),
    JSON.stringify({ name: "fixture", runtimes: ["claude"], work: { dir: "./wiki/work" }, mesh: { enabled: true, relay: { controlNode: "mac-studio" } } }, null, 2),
    "utf8"
  );

  const globalStoreOptions = { env: { AOF_GLOBAL_HOME: globalHome } };
  const workspace = await loadWorkspace(repo, undefined, globalStoreOptions);
  await publishNodeRecord(workspace, "mac-studio", {
    nodeId: "mac-studio",
    host: "mac-studio",
    os: "darwin",
    runtimes: ["claude"],
    skills: ["a", "b"],
    aofVersion: "0.1.0",
    publishedAt: "2026-06-29T00:00:00.000Z",
  });
  const store = await openGlobalWorkProjectionStore(globalStoreOptions);
  try {
    await store.publishWorkspaceSnapshot(workspace, { now: "2026-07-04T10:05:00.000Z" });
    await publishGlobalRegistryDescriptorsToStore(store, workspace, { now: "2026-07-04T10:05:00.000Z" });
  } finally {
    store.close();
  }

  return { repo, workDir, globalStoreOptions };
}
// Write a directory that stands in for the BUILT bundle (ui/dist): an index.html
// referencing a hashed asset, plus the asset — the same shape board-serve.test uses.
async function writeDist(dir) {
  await mkdir(path.join(dir, "assets"), { recursive: true });
  await writeFile(
    path.join(dir, "index.html"),
    [
      "<!doctype html>",
      "<html>",
      "  <head>",
      "    <meta charset=\"UTF-8\" />",
      "    <script type=\"module\" crossorigin src=\"/assets/index-abc123.js\"></script>",
      "  </head>",
      "  <body><div id=\"root\"></div></body>",
      "</html>",
      "",
    ].join("\n"),
    "utf8"
  );
  await writeFile(path.join(dir, "assets", "index-abc123.js"), "export const x = 1;\n", "utf8");
  return dir;
}

// A repoRoot fixture whose ui/dist holds a built bundle so serveMeshUi(repoRoot)
// resolves to a dir with index.html — mirrors board-serve.test's repoRoot fixture.
async function makeRepoRootWithDist() {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-mesh-ui-root-"));
  await writeDist(meshUiDist(root));
  return root;
}

async function closeServer(server) {
  await new Promise((resolve) => server.close(resolve));
}

export const meshUiServeTests = [
  // ═══ Scenario: aof mesh ui starts the fleet server on 127.0.0.1 ═══════════
  {
    name: "mesh-ui-serve/00 the fleet server starts, binds 127.0.0.1, and the page + its API answer on one same-origin port",
    async run() {
      const { repo, globalStoreOptions } = await makeRepo();
      const root = await makeRepoRootWithDist();
      let server;
      try {
        let url;
        let fleetUrl;
        // scope:"local" — this scenario is about serve MECHANICS (one origin, the
        // static bundle + the API), not the global-vs-local data source, so it stays
        // isolated from whatever global store (if any) exists on the host machine.
        ({ server, url, fleetUrl } = await serveMeshUi({ projectDir: repo, port: 0, repoRoot: root, scope: "local", globalStoreOptions }));
        const address = server.address();
        assert.equal(address.address, "127.0.0.1", "the server binds 127.0.0.1");
        // m45 / story 04 (ADR-002) — the announce names the fleet's PATH on this server's
        // own origin; the `?mode=fleet` selector it used to carry is retired (a bookmark
        // of it still works — ADR-003 translates it at the entry — but nothing mints it).
        // Parsed, never matched as a substring: `…/fleet&scope=global` would pass an
        // `includes("/fleet")` while being a pathname with no parameters at all.
        const parsedFleetUrl = new URL(fleetUrl);
        assert.equal(parsedFleetUrl.pathname, "/fleet", "the returned fleetUrl names the ADR-002 fleet path");
        assert.equal(parsedFleetUrl.searchParams.get("mode"), null, "…and no `mode` selector survives on it");
        assert.equal(parsedFleetUrl.host, `127.0.0.1:${address.port}`, "…on this server's own origin");

        // the fleet page (static index) and its API answer on the SAME origin/port
        const page = await fetch(new URL("/", url));
        assert.equal(page.status, 200, "the fleet page serves on the one origin");
        const pageBody = await page.text();
        assert.ok(pageBody.includes("/assets/"), "the served index is the built bundle (references /assets/)");
        assert.ok(!pageBody.includes("/src/main.tsx"), "it serves the built index, not the dev source");

        const api = await fetch(new URL("/api/mesh/status", url));
        assert.equal(api.status, 200, "GET /api/mesh/status answers on the same port");
        assert.ok(api.headers.get("content-type")?.includes("application/json"), "the API returns JSON");
      } finally {
        if (server) await closeServer(server);
        await rm(repo, { recursive: true, force: true });
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  // The documented default port literal (4181) is exported + distinct from the
  // board's 4180 and assets-ui's 4177/4178 (a build-time choice the feature pins).
  {
    name: "mesh-ui-serve/00 the documented default port is 4181, distinct from the board's 4180 and assets-ui 4177/4178",
    async run() {
      assert.equal(DEFAULT_MESH_UI_PORT, 4181, "the fleet default port is 4181");
      for (const collided of [4177, 4178, 4180]) {
        assert.notEqual(DEFAULT_MESH_UI_PORT, collided, `4181 does not collide with ${collided}`);
      }
    },
  },

  // ═══ Scenario: a missing UI build is refused with the friendly build-missing line ═══
  {
    name: "mesh-ui-serve/00 a missing ui/dist build is a friendly ui-build-missing refusal, not a crash",
    async run() {
      const { repo, globalStoreOptions } = await makeRepo();
      // a repoRoot WITHOUT ui/dist
      const root = await mkdtemp(path.join(os.tmpdir(), "aof-mesh-ui-nobuild-"));
      let rejected;
      let server;
      try {
        try {
          ({ server } = await serveMeshUi({ projectDir: repo, port: 0, repoRoot: root, globalStoreOptions }));
        } catch (error) {
          rejected = error;
        }
        assert.ok(rejected, "serveMeshUi rejects when the build is missing");
        assert.equal(rejected.code, "ui-build-missing", "the rejection carries the ui-build-missing code");
        assert.ok(
          /build/i.test(rejected.message) && /npm --prefix ui run build/.test(rejected.message),
          "the message tells the operator to build the UI first"
        );
        assert.equal(server, undefined, "no server was left listening");
      } finally {
        if (server) await closeServer(server);
        await rm(repo, { recursive: true, force: true });
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  // ═══ Scenario: a port already in use is refused with the friendly port-in-use line ═══
  // The serve-face rejects with EADDRINUSE (the CLI verb maps it to the friendly
  // "Port N is already in use. Pass --port <n> to pick another." line) — the
  // structural half here is that binding an occupied port rejects, not crashes.
  {
    name: "mesh-ui-serve/00 an occupied port rejects with EADDRINUSE (the friendly port-in-use refusal), not a crash",
    async run() {
      const { repo, globalStoreOptions } = await makeRepo();
      const root = await makeRepoRootWithDist();
      // occupy a port with a throwaway server
      const blocker = http.createServer(() => {});
      await new Promise((resolve) => blocker.listen(0, "127.0.0.1", resolve));
      const occupied = blocker.address().port;
      let rejected;
      let server;
      try {
        try {
          ({ server } = await serveMeshUi({ projectDir: repo, port: occupied, repoRoot: root, globalStoreOptions }));
        } catch (error) {
          rejected = error;
        }
        assert.ok(rejected, "serveMeshUi rejects when the port is occupied");
        assert.equal(rejected.code, "EADDRINUSE", "the rejection is a benign EADDRINUSE the CLI maps to the friendly line");
      } finally {
        if (server) await closeServer(server);
        await new Promise((resolve) => blocker.close(resolve));
        await rm(repo, { recursive: true, force: true });
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  // ═══ Scenario: GET /api/mesh/status answers the local-filtered global projection ═══
  // milestone 34 / story 03 (ADR-006): local mode is the same machine-wide
  // projection with work items narrowed to the current workspace id; nodes remain
  // machine-wide.
  {
    name: "mesh-ui-serve/00 GET /api/mesh/status carries the local-filtered global projection (scope: local)",
    async run() {
      const { repo, globalStoreOptions } = await makeRepo();
      const root = await makeRepoRootWithDist();
      let server;
      try {
        let url;
        ({ server, url } = await serveMeshUi({ projectDir: repo, port: 0, repoRoot: root, scope: "local", globalStoreOptions }));
        const response = await fetch(new URL("/api/mesh/status", url));
        assert.equal(response.status, 200);
        const payload = await response.json();
        assert.ok(Array.isArray(payload.nodes), "the payload carries a machine-wide nodes array");
        assert.ok(Array.isArray(payload.workspaces), "the payload carries a workspaces array");
        assert.ok(Array.isArray(payload.items), "the payload carries a work items array");
        assert.equal(payload.scope, "local");
        assert.equal(payload.currentWorkspace, path.resolve(repo));
        assert.ok(payload.nodes.some((n) => n.nodeId === "mac-studio"), "the planted node surfaces");
        assert.ok(payload.workspaces.some((w) => w.projectRoot === path.resolve(repo)), "the current workspace surfaces");
        assert.ok(payload.items.some((item) => item.ref === "34" && item.slug === "global-mesh"), "the planted work item surfaces");
        assert.ok(payload.items.every((item) => item.workspaceId === payload.workspaceId), "local scope filters work items to the current workspace id");
        assert.ok(payload.nodes.some((n) => n.workspaceIds?.includes(payload.workspaceId)), "the machine-wide node roster retains workspace membership");
      } finally {
        if (server) await closeServer(server);
        await rm(repo, { recursive: true, force: true });
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  // ═══ Scenario: the fleet face serves no /api/work route ════════════════════
  {
    name: "mesh-ui-serve/00 the /api/mesh namespace is disjoint from /api/work — a board request is a 404, never a proxied board",
    async run() {
      const { repo, globalStoreOptions } = await makeRepo();
      const root = await makeRepoRootWithDist();
      let server;
      try {
        let url;
        // scope:"local" — the /api/work disjoint-namespace concern is orthogonal to
        // global-vs-local; isolated from the ambient global store.
        ({ server, url } = await serveMeshUi({ projectDir: repo, port: 0, repoRoot: root, scope: "local", globalStoreOptions }));
        for (const route of ["/api/work/list", "/api/work/doc?ref=03&doc=SPEC", "/api/work/run-status?ref=03"]) {
          const response = await fetch(new URL(route, url));
          assert.equal(response.status, 404, `${route} is a 404 on the fleet face (no /api/work)`);
          const body = await response.json();
          assert.equal(body.ok, false, `${route} answers a clean error envelope`);
          assert.equal(body.code, "not-found", `${route} is a not-found, no board data proxied`);
        }
      } finally {
        if (server) await closeServer(server);
        await rm(repo, { recursive: true, force: true });
        await rm(root, { recursive: true, force: true });
      }
    },
  },


  // ═══ Scenario: a milestone drill-in opens a real workspace board URL ═══════
  {
    name: "mesh-ui-serve/00 board-url drill-in starts and reuses the selected workspace's real board server",
    async run() {
      const { repo, globalStoreOptions } = await makeRepo();
      const root = await makeRepoRootWithDist();
      let server;
      try {
        let url;
        ({ server, url } = await serveMeshUi({ projectDir: repo, port: 0, repoRoot: root, scope: "global", globalStoreOptions }));
        const statusResponse = await fetch(new URL("/api/mesh/status", url));
        assert.equal(statusResponse.status, 200, "the global mesh status answers");
        const status = await statusResponse.json();
        const workspaceId = status.workspaces[0]?.workspaceId;
        assert.ok(workspaceId, "the fixture publishes a workspace id");

        const firstResponse = await fetch(new URL(`/api/mesh/board-url?workspaceId=${encodeURIComponent(workspaceId)}&ref=34`, url));
        assert.equal(firstResponse.status, 200, "the board-url route answers");
        const first = await firstResponse.json();
        assert.equal(first.workspaceId, workspaceId, "the response is for the selected workspace");
        assert.equal(first.ref, "34", "the response carries the requested milestone ref");
        // m45 / story 04 (ADR-002) — the drill-in URL is the board's PATH on the
        // workspace's OWN board origin, and its `#ref` fragment is unchanged. Parsed
        // rather than substring-matched, for the same reason as the announce above.
        const parsedDrillIn = new URL(first.url);
        assert.equal(parsedDrillIn.pathname, "/board", "the drill-in URL names the ADR-002 board path");
        assert.equal(parsedDrillIn.searchParams.get("mode"), null, "…with no `mode` selector on it");
        assert.equal(parsedDrillIn.hash, "#34", "…and it still selects the requested milestone by fragment");

        const boardList = await fetch(new URL("/api/work/list", first.url));
        assert.equal(boardList.status, 200, "the returned board origin serves /api/work/list");
        // m43 / story 04 (ADR-010/R4.1) — the board route answers the
        // `{ items, stalenessSeconds }` envelope; the drill-in assertion is about WHICH
        // workspace's stream the returned origin serves, which is unmoved.
        const items = (await boardList.json()).items;
        assert.ok(items.some((item) => item.ref === "34" && item.title === "Global Mesh"), "the board serves the selected workspace's work stream");

        const secondResponse = await fetch(new URL(`/api/mesh/board-url?workspaceId=${encodeURIComponent(workspaceId)}&ref=34`, url));
        assert.equal(secondResponse.status, 200, "a second drill-in answers");
        const second = await secondResponse.json();
        assert.equal(second.url, first.url, "the workspace board server is reused, not relaunched per click");
      } finally {
        if (server) await closeServer(server);
        await rm(repo, { recursive: true, force: true });
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  // ═══ Scenario Outline: an unknown /api/mesh route answers a clean not-found and the server survives ═══
  {
    name: "mesh-ui-serve/00 an unknown /api/mesh route answers a clean not-found envelope and a follow-up read proves the miss did not crash the server",
    async run() {
      const routes = ["/api/mesh/does-not-exist", "/api/mesh/status/extra", "/api/mesh/"];
      const { repo, globalStoreOptions } = await makeRepo();
      const root = await makeRepoRootWithDist();
      let server;
      try {
        let url;
        // scope:"local" — the unknown-route survival concern is orthogonal to
        // global-vs-local; isolated from the ambient global store.
        ({ server, url } = await serveMeshUi({ projectDir: repo, port: 0, repoRoot: root, scope: "local", globalStoreOptions }));
        for (const route of routes) {
          const response = await fetch(new URL(route, url));
          assert.equal(response.status, 404, `${route} is a 404`);
          const body = await response.json();
          assert.deepEqual(
            Object.keys(body).sort(),
            ["code", "error", "ok"],
            `${route} carries exactly { ok, error, code }`
          );
          assert.equal(body.ok, false, `${route} → ok:false`);
          assert.equal(body.code, "not-found", `${route} → code:"not-found"`);

          // a follow-up read still answers — the miss did not crash the server
          const followup = await fetch(new URL("/api/mesh/status", url));
          assert.equal(followup.status, 200, `after ${route}, /api/mesh/status still answers (server survived)`);
        }
      } finally {
        if (server) await closeServer(server);
        await rm(repo, { recursive: true, force: true });
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // milestone 130 / story 03 / task 01 — tasks/01_the-status-body-names-the-serving-node.feature
  // (@executable): \`localNodeId\` beside \`scope\` on every status answer, \`null\` on an
  // unconfigured machine, read once per server, the projection untouched (130/ADR-005 §3;
  // pays TECH_DEBT item 18 (b)). The published assign fixture commits \`mesh.nodeId:
  // "control-a"\`; this file's own makeRepo commits none over an isolated home.
  // ═══════════════════════════════════════════════════════════════════════════════════════

  // ══ Scenario Outline: every status answer names the serving node beside its scope ══
  {
    name: "status-names-the-serving-node/01 every status answer names the serving node beside its scope — localNodeId control-a on the default, ?scope=local and ?repo= reads, and the other keys are exactly the projection's (Examples)",
    async run() {
      await withPublishedAssignFixture(async ({ url, workspaceId, globalStoreOptions }) => {
        const projectionKeys = Object.keys(await queryGlobalMeshStatus({ ...globalStoreOptions }));
        const rows = [
          { query: "", scope: "global", extra: [] },
          { query: "?scope=local", scope: "local", extra: ["currentWorkspace"] },
          { query: `?repo=${workspaceId}`, scope: "global", extra: [] },
        ];
        for (const row of rows) {
          const response = await fetch(new URL(`/api/mesh/status${row.query}`, url));
          assert.equal(response.status, 200, `${row.query || "(bare)"}: 200`);
          const body = await response.json();
          assert.equal(body.scope, row.scope, `${row.query || "(bare)"}: scope`);
          assert.equal(body.localNodeId, "control-a", `${row.query || "(bare)"}: localNodeId is the serving node's own committed id`);
          assert.ok(projectionKeys.includes("scope"), "the projection already names scope (the route re-stamps it in place)");
          assert.deepEqual(Object.keys(body), [...projectionKeys, "localNodeId", ...row.extra], `${row.query || "(bare)"}: the projection's keys (scope among them, re-stamped in place), then localNodeId${row.extra.length ? ", then currentWorkspace" : ""} — nothing else`);
        }
      }, { nodes: ["control-a", "umamis-mac-mini"] });
    },
  },

  // ══ Scenario: a refused scope carries no stamp ══
  {
    name: "status-names-the-serving-node/01 a refused scope carries no stamp — 400 invalid-scope with body keys exactly ok, error, code",
    async run() {
      await withPublishedAssignFixture(async ({ url }) => {
        const response = await fetch(new URL("/api/mesh/status?scope=bogus", url));
        assert.equal(response.status, 400);
        const body = await response.json();
        assert.equal(body.code, "invalid-scope");
        assert.deepEqual(Object.keys(body), ["ok", "error", "code"], "the refusal envelope gains nothing");
      }, { nodes: ["control-a"] });
    },
  },

  // ══ Scenario: the stamp is the server's, not the roster's ══
  {
    name: "status-names-the-serving-node/01 the stamp is the server's, not the roster's — localNodeId control-a with no nodes[] row of that id",
    async run() {
      await withPublishedAssignFixture(async ({ url }) => {
        const body = await (await fetch(new URL("/api/mesh/status", url))).json();
        assert.equal(body.localNodeId, "control-a");
        assert.ok(!body.nodes.some((node) => node.nodeId === "control-a"), "the roster carries no control-a row — locality is the server's fact, the roster the registry's");
        assert.ok(body.nodes.some((node) => node.nodeId === "umamis-mac-mini"), "…while the published node is there (non-vacuous)");
      }, { nodes: ["umamis-mac-mini"] });
    },
  },

  // ══ Scenario: an unconfigured machine names no node ══
  // ══ Scenario: the identity is read once per server ══
  {
    name: "status-names-the-serving-node/01 an unconfigured machine names no node — localNodeId null, present never absent — and the identity is read once per server: a sidecar written after the first answer changes nothing",
    async run() {
      const { repo, globalStoreOptions } = await makeRepo();
      const root = await makeRepoRootWithDist();
      let server;
      try {
        ({ server } = await serveMeshUi({ projectDir: repo, port: 0, repoRoot: root, scope: "global", globalStoreOptions }));
        const url = `http://127.0.0.1:${server.address().port}/`;
        const first = await (await fetch(new URL("/api/mesh/status", url))).json();
        assert.ok("localNodeId" in first, "the key is PRESENT");
        assert.equal(first.localNodeId, null, "…and null: no mesh.nodeId committed, no identity sidecar in the isolated home");
        // A sidecar naming a node arrives AFTER the first answer — the memo is the server's
        // identity for its life, so a later answer does not change.
        const sidecar = globalMeshPaths({ env: globalStoreOptions.env }).identityPath;
        await mkdir(path.dirname(sidecar), { recursive: true });
        await writeFile(sidecar, `${JSON.stringify({ nodeId: "late-node", pinned: true }, null, 2)}\n`, "utf8");
        assert.equal((await loadWorkspace(repo, undefined, { env: globalStoreOptions.env })).config?.mesh?.nodeId, "late-node", "the sidecar really would hydrate a fresh load (non-vacuous)");
        const second = await (await fetch(new URL("/api/mesh/status", url))).json();
        assert.equal(second.localNodeId, null, "still null — the identity was read once, per server");
      } finally {
        if (server) await closeServer(server);
        await rm(repo, { recursive: true, force: true });
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario: the projection is byte-identical ══
  {
    name: "status-names-the-serving-node/01 the projection is byte-identical — shapeGlobalStatus over the fixture's rows carries no localNodeId key; the stamp is the route's, never the store's",
    async run() {
      await withPublishedAssignFixture(async ({ globalStoreOptions }) => {
        const projection = await queryGlobalMeshStatus({ ...globalStoreOptions });
        assert.ok(!("localNodeId" in projection), "no localNodeId on the projection");
        assert.ok(Array.isArray(projection.nodes) && projection.nodes.length > 0, "…over real rows (non-vacuous)");
      }, { nodes: ["control-a"] });
    },
  },

  // ══ Scenario: the wire types name the two additive facts ══
  {
    name: "status-names-the-serving-node/01 the wire types name the two additive facts — FleetStatus declares localNodeId?: string | null, PresenceRecord declares loops?: PresenceLoop[] with the eleven keys and stop: null | \"drain\" | \"cancel\"",
    async run() {
      const api = await readFile(path.join(repoRoot, "ui", "src", "fleet", "api.ts"), "utf8");
      assert.match(api, /export type GlobalMeshStatus = \{[\s\S]*?localNodeId\?: string \| null;/, "GlobalMeshStatus (= FleetStatus) declares localNodeId?: string | null");
      assert.match(api, /export type FleetStatus = GlobalMeshStatus;/, "FleetStatus is that type");
      assert.match(api, /export type PresenceRecord = \{[\s\S]*?loops\?: PresenceLoop\[\];[\s\S]*?\};/, "PresenceRecord declares loops?: PresenceLoop[]");
      const loop = /export type PresenceLoop = \{([\s\S]*?)\};/.exec(api);
      assert.ok(loop, "PresenceLoop is declared");
      const keys = [...loop[1].matchAll(/^\s*(\w+)\??:/gm)].map((match) => match[1]);
      assert.deepEqual(keys, ["loopRunId", "workspaceId", "scope", "level", "cap", "phase", "cycle", "ref", "runId", "supervised", "stop"], "the eleven keys, in the frozen order");
      assert.match(loop[1], /stop: null \| "drain" \| "cancel";/, "stop is the two words or null");
    },
  },

  // ══ Scenario: item 18 (b) is discharged, not deferred ══
  {
    name: "status-names-the-serving-node/01 item 18 (b) is discharged, not deferred — TECH_DEBT item 18 names this story and the route line that pays its (b) clause, or the clause is gone",
    async run() {
      const ledger = await readFile(path.join(repoRoot, "wiki", "work", "TECH_DEBT.md"), "utf8");
      const item = /^## 18\. [\s\S]*?(?=^## \d+\. |(?![\s\S]))/m.exec(ledger);
      assert.ok(item, "item 18 still stands (its (a) half is open)");
      const clause = /\*\*\(b\)[\s\S]*?(?=\n\n|\*\*How it bites)/.exec(item[0]);
      if (clause) {
        assert.match(clause[0], /130\/03/, "the (b) clause names the story that paid it");
        assert.match(clause[0], /localNodeId/, "…and the route line that pays it");
        assert.doesNotMatch(clause[0], /cannot say which machine/i, "…and no longer states the gap as open");
      }
      assert.doesNotMatch(item[0], /^- \*\*\(b\)\*\* `shapeGlobalStatus` states the serving node/m, "the fix's (b) bullet no longer stands as open work");
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // milestone 130 / story 03 / task 02 — tasks/02_the-loop-stop-route-is-assign-shaped.feature
  // (@executable): item 44's two guard blocks hoisted, then POST /api/mesh/loop-stop — admitted
  // as assign is, lifting exactly { scope, workspaceId }, resolved to the local row, answering
  // the verb's document or its coded refusal (130/ADR-005 §4; ADR-002 §3-§4; ADR-006 §1).
  // The verb's refusals are PRODUCED by the fixture's run records, never stubbed.
  // ═══════════════════════════════════════════════════════════════════════════════════════

  // ══ Scenario: the two helpers exist and the existing write routes call them ══
  {
    name: "loop-stop-route/02 the two helpers exist exactly once each, every write branch calls admitWriteRequest( before any readJsonBody(, and the assign + session branches call resolveLocalWorkspaceRow( with no inline find of their own",
    async run() {
      const source = stripComments(await readFile(path.join(repoRoot, "src", "mesh", "ui-serve.mjs"), "utf8"));
      assert.equal((source.match(/function admitWriteRequest\s*\(/g) ?? []).length, 1, "admitWriteRequest is defined exactly once");
      assert.equal((source.match(/function resolveLocalWorkspaceRow\s*\(/g) ?? []).length, 1, "resolveLocalWorkspaceRow is defined exactly once");
      for (const route of ["/api/mesh/assign", "/api/mesh/session", "/api/mesh/loop-stop"]) {
        const body = matchedBraceBody(source, new RegExp(`if\\s*\\(\\s*pathname\\s*===\\s*"${route}"\\s*\\)`).exec(source).index);
        assert.ok(body, `${route}: the branch is sliceable`);
        const admit = body.search(/admitWriteRequest\s*\(/);
        const read = body.search(/readJsonBody\s*\(/);
        assert.ok(admit >= 0, `${route}: calls admitWriteRequest(`);
        assert.ok(read >= 0 && admit < read, `${route}: …BEFORE any readJsonBody(`);
        assert.doesNotMatch(body, /request\.method\s*!==\s*"POST"/, `${route}: no inline method guard of its own`);
        assert.doesNotMatch(body, /headers\.origin/, `${route}: no inline Origin guard of its own`);
        assert.match(body, /resolveLocalWorkspaceRow\s*\(/, `${route}: calls resolveLocalWorkspaceRow(`);
        assert.doesNotMatch(body, /\.workspaces\s*\?\?\s*\[\]\)\s*\.find\(/, `${route}: no inline row lookup of its own`);
      }
    },
  },

  // ══ Scenario Outline: admission is the same for the third route as for the first ══
  {
    name: "loop-stop-route/02 admission is the same for the third route as for the first — method, Origin (exact string), content-type, body shape, workspace resolution, the own-id assertion; no request file written (Examples)",
    async run() {
      await withPublishedAssignFixture(async ({ url, root, home, workspaceId }) => {
        await writeLoopStream(root, { state: "running", node: "control-a" });
        // A published row whose project root is GONE (another machine's checkout), and one whose
        // checkout identifies itself as ANOTHER id — the two rows the resolution ladder refuses.
        const goneRoot = path.join(path.dirname(root), "gone-repo");
        const goneId = await publishRepoInto({ home, root: goneRoot }, { name: "gone" });
        await rm(goneRoot, { recursive: true, force: true });
        const rekeyedRoot = path.join(path.dirname(root), "rekeyed-repo");
        const rekeyedId = await publishRepoInto({ home, root: rekeyedRoot }, { name: "rekeyed" });
        const rekeyedConfig = path.join(rekeyedRoot, ".aof", "aof.config.json");
        await writeFile(rekeyedConfig, `${JSON.stringify({ ...JSON.parse(await readFile(rekeyedConfig, "utf8")), mesh: { nodeId: "control-a", workspaceId: "someone-else" } }, null, 2)}\n`, "utf8");
        const stopsBefore = await requestFiles();
        const wellFormed = JSON.stringify({ scope: "03", workspaceId });
        const rows = [
          { label: "GET", method: "GET", origin: "SAME", contentType: "application/json", status: 405, code: "method-not-allowed", allow: "POST" },
          { label: "PUT", method: "PUT", origin: "SAME", contentType: "application/json", rawBody: wellFormed, status: 405, code: "method-not-allowed", allow: "POST" },
          { label: "cross-origin", origin: "http://evil.example", contentType: "application/json", rawBody: wellFormed, status: 403, code: "cross-origin-refused" },
          { label: "same origin with a trailing slash", origin: `${new URL(url).origin}/`, contentType: "application/json", rawBody: wellFormed, status: 403, code: "cross-origin-refused" },
          { label: "no Origin", origin: undefined, contentType: "application/json", rawBody: wellFormed, status: 403, code: "cross-origin-refused" },
          { label: "text/plain", origin: "SAME", contentType: "text/plain", rawBody: wellFormed, status: 400, code: "invalid-content-type" },
          { label: "no content-type", origin: "SAME", contentType: undefined, rawBody: wellFormed, status: 400, code: "invalid-content-type" },
          { label: "not json", origin: "SAME", contentType: "application/json", rawBody: "{ not json", status: 400, code: "invalid-body" },
          { label: "empty", origin: "SAME", contentType: "application/json", rawBody: "", status: 400, code: "invalid-body" },
          { label: "null", origin: "SAME", contentType: "application/json", rawBody: "null", status: 400, code: "invalid-body" },
          { label: "an array", origin: "SAME", contentType: "application/json", rawBody: JSON.stringify(["03", workspaceId]), status: 400, code: "invalid-body" },
          { label: "scope only", origin: "SAME", contentType: "application/json", rawBody: JSON.stringify({ scope: "03" }), status: 400, code: "invalid-body" },
          { label: "workspaceId only", origin: "SAME", contentType: "application/json", rawBody: JSON.stringify({ workspaceId }), status: 400, code: "invalid-body" },
          { label: "blank scope", origin: "SAME", contentType: "application/json", rawBody: JSON.stringify({ scope: "  ", workspaceId }), status: 400, code: "invalid-body" },
          { label: "a number is not a scope", origin: "SAME", contentType: "application/json", rawBody: JSON.stringify({ scope: 3, workspaceId }), status: 400, code: "invalid-body" },
          { label: "an array is not a workspaceId", origin: "SAME", contentType: "application/json", rawBody: JSON.stringify({ scope: "03", workspaceId: [workspaceId] }), status: 400, code: "invalid-body" },
          { label: "unknown workspace", origin: "SAME", contentType: "application/json", rawBody: JSON.stringify({ scope: "03", workspaceId: "nope" }), status: 404, code: "workspace-not-found" },
          { label: "a row whose projectRoot is gone", origin: "SAME", contentType: "application/json", rawBody: JSON.stringify({ scope: "03", workspaceId: goneId }), status: 409, code: "workspace-not-local" },
          { label: "a row whose checkout identifies itself as another id", origin: "SAME", contentType: "application/json", rawBody: JSON.stringify({ scope: "03", workspaceId: rekeyedId }), status: 409, code: "workspace-id-mismatch" },
        ];
        for (const row of rows) {
          const response = await postLoopStop(url, row);
          assert.equal(response.status, row.status, `${row.label}: ${row.status}`);
          const body = await response.json();
          assert.equal(body.code, row.code, `${row.label}: ${row.code}`);
          assert.notEqual(body.ok, true, `${row.label}: never ok`);
          if (row.allow) assert.equal(response.headers.get("allow"), row.allow, `${row.label}: Allow: POST`);
        }
        assert.deepEqual(await requestFiles(), stopsBefore, "no loop-stops file was written by any refusal");
      }, { nodes: ["control-a"] });
    },
  },

  // ══ Scenario Outline: a well-formed stop answers the verb's document verbatim and writes the request ══
  {
    name: "loop-stop-route/02 a well-formed stop answers the verb's seven-key document verbatim and writes the request — drain, then cancel, then cancel again; forged fields, a charset suffix and a megabyte of padding ride no further (Examples)",
    async run() {
      const rows = [
        { label: "forged state + issuer", contentType: "application/json", body: (workspaceId) => ({ scope: "03", workspaceId, state: "forged", issuer: "forged" }) },
        { label: "charset suffix", contentType: "application/json; charset=utf-8", body: (workspaceId) => ({ scope: "03", workspaceId }) },
        { label: "a 1,048,577-character pad", contentType: "application/json", body: (workspaceId) => ({ scope: "03", workspaceId, pad: "x".repeat(1_048_577) }) },
      ];
      for (const row of rows) {
        await rm(loopStopsDir(), { recursive: true, force: true });
        await withPublishedAssignFixture(async ({ url, root, workspaceId }) => {
          await writeLoopStream(root, { state: "running", node: "control-a" });
          const first = await postLoopStop(url, { origin: "SAME", contentType: row.contentType, rawBody: JSON.stringify(row.body(workspaceId)) });
          assert.equal(first.status, 200, `${row.label}: 200`);
          const document = await first.json();
          assert.deepEqual(Object.keys(document), ["ok", "loopRunId", "scope", "live", "request", "state", "path"], `${row.label}: the seven keys, in order`);
          assert.equal(document.ok, true);
          assert.equal(document.loopRunId, "L1");
          assert.equal(document.scope, "03");
          assert.equal(document.live, true, `${row.label}: a fresh heartbeat is live`);
          assert.equal(document.request, "drain", `${row.label}: the first press drains`);
          assert.equal(document.state, "requested");
          assert.ok(document.path.startsWith(loopStopsDir()), `${row.label}: the request file is under <home>/mesh/loop-stops/ — ${document.path}`);
          const text = await readFile(document.path, "utf8");
          const record = JSON.parse(text);
          assert.equal(record.by?.node, "control-a", `${row.label}: by.node is the workspace's own node`);
          // The request's `workspaceId` is the VERB's (130/02 task 01 pins it `null` on a checkout with
          // no pinned `mesh.workspaceId`, this fixture's shape) — recorded at 130/03's review close as
          // an amendment candidate (TECH_DEBT item 4's one precedence), not asserted here.
          assert.equal(record.workspaceId, null, `${row.label}: the request's workspaceId is the verb's own answer (130/02's contract)`);
          for (const forged of ["issuer", "forged", "pad"]) assert.ok(!text.includes(forged), `${row.label}: "${forged}" rides no further than the body`);
          const second = await (await postLoopStop(url, { origin: "SAME", contentType: row.contentType, rawBody: JSON.stringify(row.body(workspaceId)) })).json();
          assert.equal(second.request, "cancel", `${row.label}: the second press cancels`);
          assert.equal(second.state, "requested");
          const third = await (await postLoopStop(url, { origin: "SAME", contentType: row.contentType, rawBody: JSON.stringify(row.body(workspaceId)) })).json();
          assert.equal(third.ok, true, `${row.label}: a third press is never an error`);
          assert.equal(third.request, "cancel", `${row.label}: …and answers cancel again`);
        }, { nodes: ["control-a"] });
        await rm(loopStopsDir(), { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario Outline: liveness is reported, never refused ══
  {
    name: "loop-stop-route/02 liveness is reported, never refused — a fresh run is live + requested; a stale heartbeat or a done run is not live + honoured, and the request file exists either way (Examples)",
    async run() {
      const rows = [
        { label: "running, fresh heartbeat", run: { state: "running" }, live: true, state: "requested" },
        { label: "running, heartbeat older than heartbeatMs", run: { state: "running", heartbeatAt: "2026-01-01T00:00:00.000Z" }, live: false, state: "honoured" },
        { label: "done", run: { state: "done" }, live: false, state: "honoured" },
      ];
      for (const row of rows) {
        await rm(loopStopsDir(), { recursive: true, force: true });
        await withPublishedAssignFixture(async ({ url, root, workspaceId }) => {
          await writeLoopStream(root, { ...row.run, node: "control-a" });
          const response = await postLoopStop(url, { origin: "SAME", contentType: "application/json", rawBody: JSON.stringify({ scope: "03", workspaceId }) });
          assert.equal(response.status, 200, `${row.label}: 200 — liveness is never a refusal`);
          const document = await response.json();
          assert.equal(document.live, row.live, `${row.label}: live`);
          assert.equal(document.state, row.state, `${row.label}: state`);
          assert.ok(await readStopRequest(loopStopsDir(), "L1"), `${row.label}: the request file exists`);
        }, { nodes: ["control-a"] });
        await rm(loopStopsDir(), { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario Outline: the verb's refusals map to the face's codes, produced by the records ══
  {
    name: "loop-stop-route/02 the verb's refusals map to the face's codes, produced by the records — 404 loop-stop-no-declaration, 409 loop-stop-not-local naming both nodes and the remedy, 409 loop-stop-scope; body exactly { ok, error, code }; no file written (Examples)",
    async run() {
      const rows = [
        { label: "no usable declaration in stream 03", arrange: { state: "running", brief: {} }, scope: "03", status: 404, code: "loop-stop-no-declaration" },
        { label: "an admitted scope with nothing in it", arrange: { state: "running" }, scope: "999", status: 404, code: "loop-stop-no-declaration" },
        { label: "the latest run under L1 names another node", arrange: { state: "running", node: "umamis-mac-mini" }, scope: "03", status: 409, code: "loop-stop-not-local", sentence: ["umamis-mac-mini", "control-a", "own console"] },
        { label: "abc", arrange: { state: "running" }, scope: "abc", status: 409, code: "loop-stop-scope" },
        { label: "05-01", arrange: { state: "running" }, scope: "05-01", status: 409, code: "loop-stop-scope" },
      ];
      for (const row of rows) {
        await rm(loopStopsDir(), { recursive: true, force: true });
        await withPublishedAssignFixture(async ({ url, root, workspaceId }) => {
          await writeLoopStream(root, { node: "control-a", ...row.arrange });
          const response = await postLoopStop(url, { origin: "SAME", contentType: "application/json", rawBody: JSON.stringify({ scope: row.scope, workspaceId }) });
          assert.equal(response.status, row.status, `${row.label}: ${row.status}`);
          const body = await response.json();
          assert.deepEqual(Object.keys(body), ["ok", "error", "code"], `${row.label}: the envelope is exactly ok, error, code`);
          assert.equal(body.ok, false);
          assert.equal(body.code, row.code, `${row.label}: the verb's own code, verbatim`);
          assert.equal(typeof body.error, "string");
          for (const word of row.sentence ?? []) assert.ok(body.error.includes(word), `${row.label}: the sentence names ${JSON.stringify(word)} — got ${body.error}`);
          assert.deepEqual(await requestFiles(), [], `${row.label}: no loop-stops file was written`);
        }, { nodes: ["control-a", "umamis-mac-mini"] });
      }
    },
  },

  // ══ Scenario: an unconfigured control node still stops a local loop ══
  {
    name: "loop-stop-route/02 an unconfigured control node still stops a local loop — 200 request drain over a repo committing no mesh.nodeId; control-identity-unknown is assign's, not this route's",
    async run() {
      await rm(loopStopsDir(), { recursive: true, force: true });
      const { repo, globalStoreOptions } = await makeRepo();
      const root = await makeRepoRootWithDist();
      let server;
      try {
        await writeLoopStream(repo, { state: "running" });
        ({ server } = await serveMeshUi({ projectDir: repo, port: 0, repoRoot: root, scope: "global", globalStoreOptions }));
        const url = `http://127.0.0.1:${server.address().port}/`;
        const status = await (await fetch(new URL("/api/mesh/status", url))).json();
        assert.equal(status.localNodeId, null, "the serving node is unconfigured (the premise)");
        const workspaceId = status.workspaces[0]?.workspaceId;
        assert.ok(workspaceId, "the fixture's workspace is in the projection");
        const response = await postLoopStop(url, { origin: "SAME", contentType: "application/json", rawBody: JSON.stringify({ scope: "03", workspaceId }) });
        assert.equal(response.status, 200, "no control-identity-unknown on this route");
        const document = await response.json();
        assert.equal(document.request, "drain");
        assert.equal((await readStopRequest(loopStopsDir(), "L1"))?.by?.node ?? null, null, "the request's by.node is honestly null — the verb stamps what the workspace has");
      } finally {
        if (server) await closeServer(server);
        await rm(repo, { recursive: true, force: true });
        await rm(root, { recursive: true, force: true });
        await rm(loopStopsDir(), { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario: the face imports the core and nothing from commands ══
  {
    name: "loop-stop-route/02 the face imports the core and nothing from commands — ../loop/stop.mjs is among ui-serve.mjs's specifiers, none is under ../commands/, and acd-mesh-ui-no-core-import's allow-list names it as the second sanctioned write door",
    async run() {
      const source = stripComments(await readFile(path.join(repoRoot, "src", "mesh", "ui-serve.mjs"), "utf8"));
      const specifiers = importSpecifiers(source).map((entry) => entry.specifier);
      assert.ok(specifiers.includes("../loop/stop.mjs"), `imports ../loop/stop.mjs — got ${JSON.stringify(specifiers)}`);
      assert.deepEqual(specifiers.filter((spec) => spec.startsWith("../commands/") || spec.startsWith("./commands/")), [], "nothing under commands/");
      const gate = await readFile(path.join(repoRoot, "test", "arch", "mesh", "acd-mesh-ui-no-core-import.test.mjs"), "utf8");
      assert.match(gate, /"\.\.\/loop\/stop\.mjs"/, "the allow-list names ../loop/stop.mjs");
      assert.match(gate, /specifiers\.includes\("\.\.\/loop\/stop\.mjs"\)/, "…as a POSITIVE assertion, the way the assign door is named");
    },
  },

  // ══ Scenario: the enumerations name six routes and three write routes ══
  {
    name: "loop-stop-route/02 the enumerations name six routes and three write routes — read-only + write-isolation name /api/mesh/loop-stop with the write set exactly assign, session, loop-stop; single-mutation-route + board-link-resolved assert the helper CALL, not the inline guard text",
    async run() {
      const readOnly = await readFile(path.join(repoRoot, "test", "arch", "mesh", "acd-mesh-ui-read-only.test.mjs"), "utf8");
      assert.match(readOnly, /"\/api\/mesh\/loop-stop"/, "the read-only route table names /api/mesh/loop-stop");
      const writeIsolation = await readFile(path.join(repoRoot, "test", "arch", "mesh", "acd-mesh-ui-write-isolation.test.mjs"), "utf8");
      assert.match(writeIsolation, /WRITE_ROUTES = Object\.freeze\(\["assign", "session", "loop-stop"\]\)/, "the write allowlist is exactly assign, session, loop-stop");
      assert.match(writeIsolation, /READ_ROUTES = Object\.freeze\(\["board-url", "session-outcome", "status"\]\)/, "…and the read set did not move");
      const singleMutation = await readFile(path.join(repoRoot, "test", "arch", "ui", "acd-fleet-face-single-mutation-route.test.mjs"), "utf8");
      assert.match(singleMutation, /WRITE_ROUTES = Object\.freeze\(\["\/api\/mesh\/assign", "\/api\/mesh\/session", "\/api\/mesh\/loop-stop"\]\)/, "single-mutation-route enumerates the three");
      assert.match(singleMutation, /const ADMISSION_HELPER = "admitWriteRequest";/, "…and names the admission helper it looks for");
      assert.match(singleMutation, /callAt = body\.search\(new RegExp\(/, "…looking for the helper's CALL in each write branch's own head, not the inline guard text");
      const boardLink = await readFile(path.join(repoRoot, "test", "arch", "ui", "acd-fleet-board-link-resolved.test.mjs"), "utf8");
      assert.match(boardLink, /resolveLocalWorkspaceRow/, "board-link-resolved knows the resolver helper by name");
      assert.match(boardLink, /"\/api\/mesh\/loop-stop"/, "…and lists loop-stop among the routes that resolve a row");
    },
  },

  // ══ Scenario: item 44 is discharged ══
  {
    name: "loop-stop-route/02 item 44 is discharged — TECH_DEBT item 44 is deleted or names this story and the two helpers that paid it",
    async run() {
      const ledger = await readFile(path.join(repoRoot, "wiki", "work", "TECH_DEBT.md"), "utf8");
      const item = /^## 44\. [\s\S]*?(?=^## \d+\. |(?![\s\S]))/m.exec(ledger);
      if (item) {
        assert.match(item[0], /130\/03/, "item 44 names the story that paid it");
        assert.match(item[0], /admitWriteRequest/, "…and the admission helper");
        assert.match(item[0], /resolveLocalWorkspaceRow/, "…and the resolution helper");
        assert.doesNotMatch(item[0], /\*\*Status:\*\* open/, "…and no longer stands as open");
      }
    },
  },
  // 131/04 — hoisted below.
  ...loopbackHostTests(),
];

// ---- 131/04 task 02 — one loopback predicate refuses a rebinding page on both faces ---------------
//
// A rebinding page sends a Host naming itself and an Origin that matches it, which the exact-string
// Origin check admits. Node's `fetch` drops a caller-set Host, so these rows go through `node:http`.

function fleetRequest(url, { method = "POST", route, host, origin, contentType, body } = {}) {
  const target = new URL(url);
  const headers = {};
  if (host !== undefined) headers.host = host;
  if (origin !== undefined) headers.origin = origin;
  if (contentType !== undefined) headers["content-type"] = contentType;
  return new Promise((resolve, reject) => {
    const request = http.request({ hostname: target.hostname, port: target.port, method, path: route, headers }, (response) => {
      let text = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { text += chunk; });
      response.on("end", () => {
        let parsed = null;
        try { parsed = text === "" ? null : JSON.parse(text); } catch { parsed = text; }
        resolve({ status: response.statusCode, body: parsed, raw: text });
      });
    });
    request.on("error", reject);
    if (body != null) request.write(body);
    request.end();
  });
}

function loopbackHostTests() {
  return [
    {
      name: "131/04 task02 — the predicate answers only for a loopback name (forty-seven rows)",
      async run() {
        const { isLoopbackHost } = await import("../../../src/static-serve.mjs");
        const rows = [
          ["127.0.0.1", true], ["127.0.0.1:4181", true], ["localhost", true], ["localhost:4181", true], ["LOCALHOST:4181", true],
          ["[::1]", true], ["[::1]:4181", true], ["127.1.2.3:80", true], ["evil.example:1234", false], ["192.168.1.5:4181", false],
          ["0.0.0.0:4181", false], ["::1", false], ["[::ffff:127.0.0.1]", false], ["localhost.evil.example", false], ["127.0.0.1.evil.example", false],
          ["localhost:abc", false], ["user@localhost", false], ["http://localhost:4181", false], ["", false], [undefined, false],
          ["127.0.0.1:0", true], ["127.0.0.1:65535", true], ["127.0.0.1:99999", true], ["127.0.0.1:999999", false], ["Localhost", true],
          ["127.255.255.254", true], ["128.0.0.1", false], ["127.256.0.1", false], ["127.0.0", false], ["127.0.0.1.1", false],
          ["127.0.0.01", false], ["0x7f.0.0.1", false], ["2130706433", false], ["127.0.0.1:", false], ["127.0.0.1:4181:1", false],
          [" 127.0.0.1", false], ["127.0.0.1 ", false], ["localhost.", false], ["localhost:4181/path", false], ["[::1]:", false],
          ["[::1]:abc", false], ["[::1", false], ["[::2]", false], ["[0:0:0:0:0:0:0:1]", false], [["127.0.0.1"], false],
          [2130706433, false], [null, false],
        ];
        assert.equal(rows.length, 47, "every row of the truth table");
        for (const [host, expected] of rows) assert.equal(isLoopbackHost(host), expected, `isLoopbackHost(${JSON.stringify(host)})`);
      },
    },
    {
      name: "131/04 task02 — a rebinding page is refused on the fleet's write routes, and a loopback page is not (eleven rows)",
      async run() {
        await withPublishedAssignFixture(async ({ url, root, workspaceId }) => {
          await writeLoopStream(root, { state: "running", node: "control-a" });
          const port = new URL(url).port;
          const body = { "loop-stop": JSON.stringify({ scope: "03", workspaceId }), assign: JSON.stringify({ ref: "03/01", workspaceId, target: "control-a" }), session: JSON.stringify({ workspaceId }) };
          const rows = [
            ["loop-stop", "evil.example:1234", true], ["assign", "evil.example:1234", true], ["session", "evil.example:1234", true],
            ["loop-stop", `192.168.1.5:${port}`, true], ["loop-stop", `0.0.0.0:${port}`, true], ["loop-stop", `localhost.:${port}`, true],
            ["assign", `127.0.0.1.evil.example:${port}`, true],
            ["loop-stop", `localhost:${port}`, false], ["loop-stop", `127.0.0.1:${port}`, false], ["loop-stop", `LOCALHOST:${port}`, false], ["loop-stop", `[::1]:${port}`, false],
          ];
          const stopsBefore = await requestFiles();
          for (const [route, host, refused] of rows) {
            const response = await fleetRequest(url, { route: `/api/mesh/${route}`, host, origin: `http://${host}`, contentType: "application/json", body: body[route] });
            if (refused) {
              assert.equal(response.status, 403, `${route} ${host}`);
              assert.deepEqual(response.body, { ok: false, error: "Write refused: the page was not served from a loopback address.", code: "non-loopback-host" }, `${route} ${host}`);
              assert.ok(!response.raw.includes(host.split(":")[0]) && !response.raw.includes(port), `${route} ${host}: names neither host nor port`);
            } else {
              assert.notEqual(response.body?.code, "non-loopback-host", `${route} ${host}: admitted`);
              assert.notEqual(response.body?.code, "cross-origin-refused", `${route} ${host}: admitted`);
              assert.equal(response.status, 200, `${route} ${host}: the route's own answer (${JSON.stringify(response.body)})`);
            }
          }
          assert.ok((await requestFiles()).length > stopsBefore.length, "the admitted loopback stops reached the verb");
        });
      },
    },
    {
      name: "131/04 task02 — method, Origin, Host and content-type are checked in that order on the fleet, and the Host check precedes the body read (five rows)",
      async run() {
        await withPublishedAssignFixture(async ({ url }) => {
          const rows = [
            ["PUT", "/api/mesh/loop-stop", "evil.example:1234", "http://evil.example:1234", "application/json", null, 405, "method-not-allowed"],
            ["POST", "/api/mesh/loop-stop", "evil.example:1234", "http://other.example", "application/json", "{}", 403, "cross-origin-refused"],
            ["POST", "/api/mesh/loop-stop", "evil.example:1234", "http://evil.example:1234", "text/plain", "{}", 403, "non-loopback-host"],
            ["POST", "/api/mesh/assign", "evil.example:1234", "http://evil.example:1234", undefined, "{}", 403, "non-loopback-host"],
            ["POST", "/api/mesh/loop-stop", "evil.example:1234", "http://evil.example:1234", "application/json", "a".repeat(2_000_000), 403, "non-loopback-host"],
          ];
          for (const [method, route, host, origin, contentType, body, status, code] of rows) {
            const response = await fleetRequest(url, { method, route, host, origin, contentType, body });
            assert.equal(response.status, status, `${method} ${route} ${origin} ${contentType}`);
            assert.equal(response.body.code, code, `${method} ${route} ${origin} ${contentType}`);
          }
        });
      },
    },
    {
      name: "131/04 task02 — the predicate is one export in the shared leaf, called by both admissions",
      async run() {
        const read = (rel) => readFile(path.join(repoRoot, rel), "utf8").then((text) => stripComments(text));
        const leaf = await read("src/static-serve.mjs");
        assert.deepEqual(importSpecifiers(leaf).map((entry) => entry.specifier), ["node:path"], "static-serve.mjs imports only node:path");
        const exported = [...leaf.matchAll(/^export function (\w+)/gmu)].map((match) => match[1]).sort();
        assert.deepEqual(exported, ["contentType", "isLoopbackHost", "safeStaticPath", "shouldServeAppShell"]);
        for (const rel of ["src/board-ui.mjs", "src/mesh/ui-serve.mjs"]) {
          const source = await read(rel);
          const at = source.indexOf("function admitWriteRequest(");
          assert.ok(at >= 0, `${rel} defines admitWriteRequest`);
          const helper = matchedBraceBody(source, at) ?? "";
          assert.equal((helper.match(/isLoopbackHost\(request\.headers\.host\)/gu) ?? []).length, 1, `${rel}: one call`);
          const origin = helper.search(/originHeader\s*!==/u);
          const loopback = helper.indexOf("isLoopbackHost(");
          const content = helper.search(/application\\\/json/u);
          assert.ok(origin >= 0 && origin < loopback && loopback < content, `${rel}: between the Origin check and the content-type check`);
          assert.equal((source.match(/isLoopbackHost\(/gu) ?? []).length, 1, `${rel}: no second isLoopbackHost( call`);
          assert.ok(!/headers\.host\s*(?:===|!==|==|!=)/u.test(source) && !/(?:===|!==|==|!=)\s*request\.headers\.host/u.test(source), `${rel}: no comparison made on headers.host`);
        }
        const fleet = await read("src/mesh/ui-serve.mjs");
        assert.equal((fleet.match(/function admitWriteRequest\(/gu) ?? []).length, 1, "the fleet still defines exactly one admitWriteRequest");
      },
    },
    {
      name: "131/04 task02 — the fleet's read route ignores the Host",
      async run() {
        await withPublishedAssignFixture(async ({ url }) => {
          const port = new URL(url).port;
          const foreign = await fleetRequest(url, { method: "GET", route: "/api/mesh/status", host: "evil.example:1234" });
          const loopback = await fleetRequest(url, { method: "GET", route: "/api/mesh/status", host: `127.0.0.1:${port}` });
          assert.equal(foreign.status, 200);
          assert.equal(loopback.status, 200);
          assert.deepEqual(Object.keys(foreign.body).sort(), Object.keys(loopback.body).sort(), "the status envelope, as with a loopback Host");
        });
      },
    },
  ];
}
