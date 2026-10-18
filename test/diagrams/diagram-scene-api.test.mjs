import assert from "node:assert/strict";
import http from "node:http";
import { createBoardApi } from "@aof/server/board-ui";

async function withApi(run) {
  const calls = [];
  let failure = null;
  const workspace = { projectRoot: "/fixture", config: {} };
  const api = createBoardApi({
    loadWorkspace: async () => workspace,
    resolveCacheStalenessSeconds: () => 30,
    invoke: async (id, input, ctx) => {
      calls.push({ id, input, ctx });
      if (failure) throw failure;
      return { delivered: true, id, input };
    },
  });
  const server = http.createServer(async (req, res) => {
    if (!await api.handleDiagramApi(req, res, { projectDir: "/fixture" })) {
      res.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const request = (method, target, { headers = {}, body } = {}) => new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port: address.port, method, path: target, headers }, (res) => {
      let text = "";
      res.setEncoding("utf8"); res.on("data", (chunk) => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: text ? JSON.parse(text) : null }));
    });
    req.on("error", reject); if (body !== undefined) req.write(body); req.end();
  });
  try { await run({ calls, request, setFailure: (error) => { failure = error; }, port: address.port, workspace }); }
  finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

export const diagramSceneApiTests = [
  { name: "scene api: GET invokes the scene reader with its exact query shape", run: () => withApi(async ({ calls, request, workspace }) => {
    const response = await request("GET", "/api/diagram/scene?ref=%2007%20&file=%20ADR-002-scene.excalidraw%20");
    assert.equal(response.status, 200);
    assert.deepEqual(calls, [{ id: "diagram:scene", input: { ref: "07", file: "ADR-002-scene.excalidraw", action: "read" }, ctx: { workspace } }]);
    assert.equal(response.body.delivered, true);
  }) },
  { name: "scene api: POST admits only same-origin loopback JSON and forwards the body", run: () => withApi(async ({ calls, request, port }) => {
    const host = `127.0.0.1:${port}`;
    const response = await request("POST", "/api/diagram/scene?ref=07&file=ADR-002-scene.excalidraw", {
      headers: { host, origin: `http://${host}`, "content-type": "application/json" },
      body: JSON.stringify({ action: "save", baseRevision: null, scene: { type: "excalidraw" } }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(calls[0].input, { ref: "07", file: "ADR-002-scene.excalidraw", action: "save", baseRevision: null, scene: { type: "excalidraw" } });
  }) },
  { name: "scene api: refuses unsafe or malformed writes before invoking the command", run: () => withApi(async ({ calls, request, port }) => {
    const host = `127.0.0.1:${port}`;
    const rows = [
      ["PUT", { host }, undefined, 405, "method-not-allowed"],
      ["POST", { host, origin: "http://evil.test", "content-type": "application/json" }, "{}", 403, "cross-origin-refused"],
      ["POST", { host: "evil.test", origin: "http://evil.test", "content-type": "application/json" }, "{}", 403, "non-loopback-host"],
      ["POST", { host, origin: `http://${host}`, "content-type": "text/plain" }, "{}", 400, "invalid-content-type"],
      ["POST", { host, origin: `http://${host}`, "content-type": "application/json" }, "{broken", 400, "malformed-json"],
      ["POST", { host, origin: `http://${host}`, "content-type": "application/json" }, JSON.stringify({ payload: "x".repeat(1_000_001) }), 413, "payload-too-large"],
    ];
    for (const [method, headers, body, status, code] of rows) {
      const response = await request(method, "/api/diagram/scene", { headers, body });
      assert.equal(response.status, status); assert.equal(response.body.code, code);
    }
    assert.deepEqual(calls, []);
  }) },
  { name: "scene api: command errors retain their 409 status and code", run: () => withApi(async ({ calls, request, port, setFailure }) => {
    setFailure(Object.assign(new Error("revision conflict"), { status: 409, code: "diagram-scene-conflict" }));
    const host = `127.0.0.1:${port}`;
    const response = await request("POST", "/api/diagram/scene", { headers: { host, origin: `http://${host}`, "content-type": "application/json" }, body: "{}" });
    assert.equal(response.status, 409); assert.deepEqual(response.body, { ok: false, error: "revision conflict", code: "diagram-scene-conflict" });
    assert.equal(calls.length, 1);
  }) },
];
