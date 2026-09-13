// The PRODUCER-FED `mesh:status` boards payload, served verbatim to the REAL
// `<Fleet/>` — extracted here for milestone 47 / story 01 (ADR-006(b)).
//
// WHERE IT CAME FROM, and why it moved. It was written inside
// `test/ui/in-app-cross-links.test.mjs` (m45/04/01) as `withFleetBoards`, and it is the
// exact instrument that PROVED the fleet's local-shape branch unreachable — m45 QA's
// F-45-04-QA-3. m47/01 task 01 is the change that deletes that branch, and its lanes
// need the same instrument to prove the branch is gone. Two copies of a fixture whose
// whole value is "nothing here is hand-painted" is the one shape that would let the
// two suites disagree about what the producer actually says, so it has ONE home and
// both suites import it.
//
// WHAT IT IS. A REAL group registry on disk → the REAL `mesh:status` command (the
// producer, invoked through `command-core`) → its REAL payload served verbatim from a
// real 127.0.0.1 origin → the REAL `<Fleet/>` fetching it over HTTP. Nothing about the
// payload is painted: the `local` marker in particular is computed by production code
// from the registry's roster and this node's configured `mesh.nodeId`, and the fixture
// ASSERTS that before it serves anything (a fixture that quietly stopped producing the
// marker would make every lane below vacuous).
//
// THE DRIFT IT SITS ON, stated because it is the subject rather than a caveat. This
// payload is NOT what the fleet FACE serves: since m34/ADR-006 `/api/mesh/status`
// answers `queryGlobalMeshStatus`, whose payload has no `boards` key at all. The
// producer that computes the aggregate (`aof mesh status --json`) and the face the web
// surface talks to are different systems of record, and the fleet face is structurally
// barred from the other (`acd-mesh-ui-no-core-import`). So this fixture is the ONLY way
// to hand the web surface a boards payload, which is precisely why it can prove that
// handing it one now renders no boards region.
//
// PORTS: the stand-in server binds :0. Nothing here touches :4181 or :4182.
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadWorkspace } from "../../src/work.mjs";
import { invoke } from "../../src/command-core.mjs";
import { meshDir, nodeRecordPath, presenceRecordPath } from "../../src/mesh/store.mjs";
import { registryPath, registryDir, emptyRegistry, admitNode, registerBoard } from "../../src/mesh/registry.mjs";
import { withFleetApp } from "./fleet-app-harness.mjs";

export const BOARDS_FIXTURE_NOW = "2026-07-01T12:00:00.000Z";
export const BOARDS_FIXTURE_LOCAL_NODE = "aof-control";
export const BOARDS_FIXTURE_PEER_NODE = "umamis-mac-mini";

const NOW = BOARDS_FIXTURE_NOW;
const LOCAL_NODE = BOARDS_FIXTURE_LOCAL_NODE;
const PEER_NODE = BOARDS_FIXTURE_PEER_NODE;

export async function makeMeshRepo() {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-fleet-boards-"));
  await mkdir(path.join(repo, "wiki", "work"), { recursive: true });
  await mkdir(path.join(repo, ".aof"), { recursive: true });
  await writeFile(
    path.join(repo, ".aof", "aof.config.json"),
    `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" }, mesh: { nodeId: LOCAL_NODE } }, null, 2)}\n`,
    "utf8",
  );
  return repo;
}

// A node RECORD + its presence, on disk. `mesh:status`'s `nodes` half is built from
// these files, and the REGISTRY roster is a separate fact — which is what lets a lane
// stand up a board whose owner is admitted to the group while the node roster the
// payload carries is EMPTY (the branch's own "boards but no nodes" inverse).
async function seedNode(workspace, id, { activeRuns = [] } = {}) {
  await mkdir(path.join(meshDir(workspace), "nodes"), { recursive: true });
  await writeFile(
    nodeRecordPath(workspace, id),
    JSON.stringify({ nodeId: id, host: id, os: "linux", runtimes: ["claude"], skills: [], aofVersion: "0.1.0", publishedAt: NOW }, null, 2),
    "utf8",
  );
  await mkdir(path.join(meshDir(workspace), "presence"), { recursive: true });
  await writeFile(
    presenceRecordPath(workspace, id),
    JSON.stringify({ nodeId: id, heartbeatAt: NOW, activeRuns, aofVersion: "0.1.0" }, null, 2),
    "utf8",
  );
}

// meshStatusBoardsPayload({ local, peer, nodes, activeRuns }) — build the registry,
// invoke the REAL producer, and hand back its payload plus the repo it was produced
// from. Exported on its own so the CLI-face lane can drive `aof mesh status` over the
// SAME registry the web lanes are fed from.
export async function withMeshStatusBoards({ local = null, peer = null, nodes = true, activeRuns = [] }, fn) {
  const repo = await makeMeshRepo();
  const previousHome = process.env.AOF_GLOBAL_HOME;
  process.env.AOF_GLOBAL_HOME = path.join(repo, "global-home");
  try {
    const workspace = await loadWorkspace(repo);
    let registry = emptyRegistry();
    if (local) {
      if (nodes) await seedNode(workspace, LOCAL_NODE, { activeRuns });
      registry = admitNode(registry, { nodeId: LOCAL_NODE, admittedAt: NOW, boards: [local] });
      registry = registerBoard(registry, local);
    }
    if (peer) {
      if (nodes) await seedNode(workspace, PEER_NODE, { activeRuns });
      registry = admitNode(registry, { nodeId: PEER_NODE, admittedAt: NOW, boards: [peer] });
      registry = registerBoard(registry, peer);
    }
    await mkdir(registryDir(workspace), { recursive: true });
    await writeFile(registryPath(workspace), JSON.stringify(registry, null, 2), "utf8");

    // THE PRODUCER. Nothing below paints a payload — this is `aof mesh status --json`'s
    // own result, `local` marker and all.
    const payload = await invoke("mesh:status", { now: NOW }, { workspace });
    assert.ok(Array.isArray(payload.boards), "the REAL mesh:status producer answers a boards aggregate");
    if (local) {
      assert.equal(
        payload.boards.find((board) => board.ref === local)?.local,
        true,
        "…marking the board this node owns `local: true` (computed by production, never painted here)",
      );
    }
    if (peer) {
      assert.equal(
        Object.hasOwn(payload.boards.find((board) => board.ref === peer) ?? {}, "local"),
        false,
        "…and omitting the marker entirely for a peer board (the absent-not-false idiom)",
      );
    }
    if (!nodes) {
      assert.equal(payload.nodes.length, 0, "…over an EMPTY node roster, which is the row's own condition");
    }
    return await fn({ payload, repo, workspace });
  } finally {
    if (previousHome === undefined) delete process.env.AOF_GLOBAL_HOME;
    else process.env.AOF_GLOBAL_HOME = previousHome;
    await rm(repo, { recursive: true, force: true });
  }
}

// withFleetBoards({ local, peer, nodes, activeRuns, search, settle, holdFromStart }, fn)
// — the payload above, served VERBATIM over HTTP, with the REAL <Fleet/> mounted
// against it. `local` is the board this node owns (the projection marks it
// `local: true`); `peer` is a board owned by another node (no marker at all).
export async function withFleetBoards(options, fn) {
  const { local = null, peer = null, nodes = true, activeRuns = [], search = "?scope=global", ...mount } = options;
  return withMeshStatusBoards({ local, peer, nodes, activeRuns }, async ({ payload, repo }) => {
    let server;
    try {
      server = http.createServer((request, response) => {
        const url = new URL(request.url ?? "/", "http://127.0.0.1");
        if (url.pathname === "/api/mesh/status") {
          response.writeHead(200, { "content-type": "application/json" });
          response.end(JSON.stringify(payload));
          return;
        }
        response.writeHead(404, { "content-type": "application/json" });
        response.end(JSON.stringify({ ok: false, error: "Not found", code: "not-found" }));
      });
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
      });
      const url = `http://127.0.0.1:${server.address().port}`;
      return await withFleetApp({ url, search, ...mount }, (app) => fn(app, { repo, payload, url }));
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
    }
  });
}
