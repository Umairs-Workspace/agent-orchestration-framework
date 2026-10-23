// Fitness function: acd-loop-terminal-ingress (FF-16201, 162/ADR-001 + ADR-002) —
//
//   "The terminal ingress binds loopback only, admits only a token-bearing client, has no
//    write-direction sink, and stamps every forwarded frame with the daemon's own node id, never
//    the child's."
//
// The ingress is the one door through which a process OUTSIDE the daemon — a loop's `aof work
// drive` child — puts bytes onto the terminal wire. Each clause closes one way that door could be
// wrong:
//   - LOOPBACK ONLY. A drive child is always on the daemon's own machine; an ingress on any other
//     address is a terminal-injection endpoint on the network.
//   - TOKEN-BEARING ONLY. Another local user's process must not be able to paint a session card.
//     The token is per start and lives in the daemon's own mesh home.
//   - NO WRITE-DIRECTION SINK. The loop's session is unattended and read-only (ADR-002); the
//     ingress answers nothing but its admission, so it is never a way into the drive.
//   - THE DAEMON'S OWN NODE ID. The ingress reads only `{ sessionId, bytes }`; the forward builds
//     the envelope with the daemon's id — the F17 re-stamp discipline, one hop earlier.
// And the premise the producer ceiling was raised on (acd-terminal-output-signal-source, 3 → 4):
// the drive child STATES its session relayed and names its loop run, at the one upsert it makes.
//
// The static clauses read comment-stripped, CRLF-normalised sources and are driven by hand-written
// plants below (each asserted to LAND before it is asserted to trip). The behavioural clause starts
// a REAL ingress on an ephemeral loopback port under a temp home and drives it with a real client.
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket } from "ws";
import { createTerminalRelayBridge } from "../../../packages/mesh/src/terminal-relay-bridge.mjs";
import { createMeshStore } from "../../../packages/mesh/src/store.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const BRIDGE = path.join(repoRoot, "packages", "mesh", "src", "terminal-relay-bridge.mjs");
const LAUNCHER = path.join(repoRoot, "packages", "mesh", "src", "launcher.mjs");
// The drive child's producer — extracted from `commands/drive.mjs` at 162's verify (F-02).
const DRIVE = path.join(repoRoot, "packages", "work-loop", "src", "loop-session-stream.mjs");

function stripComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

async function realSource(file) {
  return stripComments((await readFile(file, "utf8")).replace(/\r\n/g, "\n"));
}

// The body of `function <name>(` up to its balanced closing brace.
function functionBody(source, name) {
  const anchor = new RegExp(`function\\s+${name}\\s*\\(`).exec(source);
  if (anchor == null) return null;
  // The parameter list is balanced first: a default like `randomBytes(32)` holds its own parens.
  let close = anchor.index + anchor[0].length - 1;
  for (let depth = 0; close < source.length; close += 1) {
    if (source[close] === "(") depth += 1;
    else if (source[close] === ")" && --depth === 0) break;
  }
  const open = source.indexOf("{", close);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  return null;
}

// ingressProblems({ bridgeSource, launcherSource, driveSource }) — the static clauses.
export function ingressProblems({ bridgeSource, launcherSource, driveSource }) {
  const problems = [];
  const server = functionBody(bridgeSource, "startTerminalIngress");
  if (server == null) {
    problems.push("terminal-relay-bridge.mjs exports no `startTerminalIngress(` this gate can read — re-aim it at the ingress, never delete it");
  } else {
    const host = /const\s+TERMINAL_INGRESS_HOST\s*=\s*"([^"]*)"/.exec(bridgeSource)?.[1];
    if (host !== "127.0.0.1") problems.push(`the ingress host is ${JSON.stringify(host ?? null)} — it binds 127.0.0.1 and nothing else (loopback only)`);
    if (!/\.listen\(\s*0\s*,\s*TERMINAL_INGRESS_HOST\b/.test(server)) problems.push("the ingress does not listen on `(0, TERMINAL_INGRESS_HOST)` — an ephemeral loopback port is the only bind it may take");
    if (!/ingressTokenMatches\(\s*request\.headers\[TERMINAL_INGRESS_TOKEN_HEADER\]\s*,\s*token\s*\)/.test(server) || !/handleUpgrade/.test(server)) {
      problems.push("the ingress upgrade is not gated on `ingressTokenMatches(request.headers[TERMINAL_INGRESS_TOKEN_HEADER], token)` before `handleUpgrade` — an unauthenticated local process could paint a session card");
    }
    const sends = [...server.matchAll(/\.send\(([^)]*)\)/g)].map((match) => match[1].trim());
    if (sends.length !== 1 || !/type:\s*"admitted"/.test(sends[0] ?? "")) {
      problems.push(`the ingress sends ${sends.length} kind(s) of message (${JSON.stringify(sends)}) — it answers its admission and NOTHING else: no write-direction sink, so it is never a way into the drive`);
    }
    if (/TERMINAL_INPUT_KIND|terminal-input|\.write\(/.test(server)) problems.push("the ingress references the input direction — it is output-only by construction");
  }
  const route = functionBody(bridgeSource, "routeIngressMessage");
  if (route == null) {
    problems.push("terminal-relay-bridge.mjs has no `routeIngressMessage(` this gate can read");
  } else {
    if (/nodeId/.test(route)) problems.push("routeIngressMessage reads a `nodeId` — the ingress forwards a session id and its bytes ONLY, so a child can never name the node its frames route under");
    if (!/forward\.frame\(\s*sessionId\s*,\s*message\.bytes\s*\)/.test(route)) problems.push("routeIngressMessage does not forward exactly `(sessionId, message.bytes)`");
  }
  // The control node's leg builds the envelope with the LAUNCHER's own node id.
  if (!/frame:\s*\(\s*sessionId\s*,\s*bytes\s*\)\s*=>\s*controlTerminalPush\.push\(\s*buildTerminalFrameEnvelope\(\s*nodeId\s*,\s*sessionId\s*,\s*bytes\s*\)\s*\)/.test(launcherSource)) {
    problems.push("the launcher's control-side ingress forward does not build `buildTerminalFrameEnvelope(nodeId, sessionId, bytes)` with the daemon's own `nodeId`");
  }
  if (!/end:\s*\(\s*sessionId\s*\)\s*=>\s*controlTerminalPush\.push\(\s*buildTerminalEndEnvelope\(\s*nodeId\s*,\s*sessionId\s*\)\s*\)/.test(launcherSource)) {
    problems.push("the launcher's control-side ingress end does not build `buildTerminalEndEnvelope(nodeId, sessionId)` with the daemon's own `nodeId`");
  }
  // The premise of the 3 → 4 producer raise: the child states both facts at its one upsert.
  const statement = functionBody(driveSource, "stateLoopSession");
  if (statement == null) {
    problems.push("loop-session-stream.mjs has no `stateLoopSession(` — the loop drive no longer states its session, so its pane would read `no-producer` or mount typeable");
  } else if (!/pingSession\(/.test(statement) || !/relaying:\s*true/.test(statement) || !/\bloopRunId\b/.test(statement)) {
    problems.push("loop-session-stream.mjs's `stateLoopSession` does not upsert through `pingSession(` with `relaying: true` and the `loopRunId` — the premise the producer ceiling was raised on (162/ADR-002)");
  }
  return problems;
}

// A REAL ingress published through the REAL mesh store at a temp mesh root — the launcher's wiring.
async function withIngress(run) {
  const home = await mkdtemp(path.join(os.tmpdir(), "aof-ingress-"));
  const forwarded = [];
  const degrades = [];
  const bridge = createTerminalRelayBridge({ reportDegrade: (code, error) => degrades.push({ code, error }) });
  const store = createMeshStore({ globalMeshPaths: () => ({ meshRoot: path.join(home, "mesh") }) });
  const ingress = await bridge.startTerminalIngress({
    forward: {
      frame: (...args) => forwarded.push(["frame", ...args]),
      end: (...args) => forwarded.push(["end", ...args]),
    },
    publish: (address) => store.publishTerminalIngress(null, address),
    withdraw: (token) => store.withdrawTerminalIngress(null, token),
  });
  const ingressPath = store.terminalIngressPath();
  try {
    await run({ bridge, ingress, ingressPath, forwarded, address: JSON.parse(await readFile(ingressPath, "utf8")) });
  } finally {
    await ingress.stop();
    assert.equal(await store.readTerminalIngress(), null, "the address is withdrawn on stop");
    await rm(home, { recursive: true, force: true });
  }
}

function dial(port, headers) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/`, { headers });
    const received = [];
    ws.on("message", (data) => received.push(String(data)));
    ws.on("open", () => setTimeout(() => resolve({ ws, opened: true, received }), 50));
    ws.on("unexpected-response", (_request, response) => resolve({ ws, opened: false, status: response.statusCode, received }));
    ws.on("error", () => resolve({ ws, opened: false, received }));
  });
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 80));

export const archTests = [
  {
    name: "arch/162 FF-16201 (acd-loop-terminal-ingress): the ingress binds loopback only, gates its upgrade on the per-start token, answers nothing but its admission, forwards only a session id and its bytes into a forward the launcher builds with its OWN node id, and the drive child states its session relayed and loop-driven",
    async run() {
      const [bridgeSource, launcherSource, driveSource] = await Promise.all([realSource(BRIDGE), realSource(LAUNCHER), realSource(DRIVE)]);
      assert.ok(/startTerminalIngress/.test(bridgeSource) && /ingressForward/.test(launcherSource) && /stateLoopSession/.test(driveSource), "the three sources were actually read (non-vacuous)");
      assert.deepEqual(ingressProblems({ bridgeSource, launcherSource, driveSource }), []);
    },
  },
  {
    name: "arch/162 FF-16201 (acd-loop-terminal-ingress) behaviour: a REAL ingress publishes its address under the mesh home, refuses a token-less and a wrong-token client before any frame is read, forwards an admitted client's frame as (sessionId, bytes) whatever nodeId it names, drops an input-shaped message, and removes its file on stop",
    async run() {
      await withIngress(async ({ ingressPath, forwarded, address }) => {
        assert.equal(path.basename(ingressPath), "terminal-ingress.json", "published at <aof home>/mesh/terminal-ingress.json");
        assert.equal(address.host, "127.0.0.1", "the address file names the loopback host");
        assert.ok(Number.isInteger(address.port) && address.port > 0, "…an ephemeral port");
        assert.equal(typeof address.token, "string");
        assert.ok(address.token.length >= 32, "…and a per-start random token");

        const anonymous = await dial(address.port, {});
        assert.equal(anonymous.opened, false, "a client with no token is refused at the upgrade");
        assert.equal(anonymous.status, 401);
        const wrong = await dial(address.port, { "x-aof-ingress-token": "x".repeat(address.token.length) });
        assert.equal(wrong.opened, false, "a client with the wrong token is refused at the upgrade");
        assert.deepEqual(forwarded, [], "…and no frame was read from either connection");

        const admitted = await dial(address.port, { "x-aof-ingress-token": address.token });
        assert.equal(admitted.opened, true, "the token-bearing client is admitted");
        assert.deepEqual(admitted.received.map((text) => JSON.parse(text)), [{ type: "admitted" }], "the ingress answers its admission and nothing else");
        admitted.ws.send(JSON.stringify({ type: "frame", sessionId: "s-1", bytes: "hello", nodeId: "node-victim" }));
        admitted.ws.send(JSON.stringify({ type: "terminal-input", sessionId: "s-1", bytes: "rm -rf /\r" }));
        admitted.ws.send(JSON.stringify({ type: "frame", sessionId: "", bytes: "orphan" }));
        admitted.ws.send(JSON.stringify({ type: "end", sessionId: "s-1", nodeId: "node-victim" }));
        await settle();
        assert.deepEqual(forwarded, [["frame", "s-1", "hello"], ["end", "s-1"]], "only (sessionId, bytes) and (sessionId) reach the forward — the client's nodeId never does, an input-shaped message is dropped, and a frame with no session is dropped");
        assert.deepEqual(admitted.received.map((text) => JSON.parse(text)), [{ type: "admitted" }], "…and nothing was sent back for any of them");
        admitted.ws.close();
      });
    },
  },
  {
    name: "arch/162 FF-16201 (acd-loop-terminal-ingress) red probes: a wildcard bind, an ungated upgrade, a reply sink, a node id read off the message, a forward stamped with the child's id and a child that no longer states its loop each trip",
    async run() {
      const [bridgeSource, launcherSource, driveSource] = await Promise.all([realSource(BRIDGE), realSource(LAUNCHER), realSource(DRIVE)]);
      const clean = { bridgeSource, launcherSource, driveSource };
      const probe = (label, key, from, to, needle) => {
        const planted = clean[key].replace(from, to);
        assert.notEqual(planted, clean[key], `${label}: the plant landed`);
        const problems = ingressProblems({ ...clean, [key]: planted });
        assert.ok(problems.some((problem) => needle.test(problem)), `${label}: trips. Got: ${JSON.stringify(problems)}`);
      };
      probe("wildcard host", "bridgeSource", 'const TERMINAL_INGRESS_HOST = "127.0.0.1"', 'const TERMINAL_INGRESS_HOST = "0.0.0.0"', /loopback only/);
      probe("ungated upgrade", "bridgeSource", "if (!ingressTokenMatches(request.headers[TERMINAL_INGRESS_TOKEN_HEADER], token))", "if (false)", /unauthenticated/);
      probe("a reply sink", "bridgeSource", 'client.on("message", (data) => routeIngressMessage(data, safeForward));', 'client.on("message", (data) => { routeIngressMessage(data, safeForward); client.send(String(data)); });', /NOTHING else/);
      probe("a node id read off the message", "bridgeSource", "forward.frame(sessionId, message.bytes);", "forward.frame(sessionId, message.bytes, message.nodeId);", /nodeId/);
      probe("the child's id stamped on the control leg", "launcherSource", "controlTerminalPush.push(buildTerminalFrameEnvelope(nodeId, sessionId, bytes))", "controlTerminalPush.push(buildTerminalFrameEnvelope(childNodeId, sessionId, bytes))", /own `nodeId`/);
      probe("a child that no longer names its loop", "driveSource", /relaying:\s*true,\s*loopRunId,/, "relaying: true,", /premise/);
    },
  },
];
