import { defaultApplication as _aofApplication } from "aof/default-application";
// Fitness functions: acd-launched-session-from-discord (milestone 191) — the ONE file for the three
// launched-session controls of ARCHITECTURE's Fitness functions table. 191/00 founds it with
// FF-19101; 191/01 adds FF-19102 (Discord never types a shell) and 191/02 FF-19103 (one start core)
// as legs here, which is why the `test/arch/session` budget row moved 39 -> 40 once, for this file.
//
// ── FF-19101 · One handler serves both roles (191/ADR-001 §1–§2, its Invariant) ───────────────────
// The control node hosts its own launched sessions through the WORKER'S handler. A second handler
// written for the control would drift from the worker's one fix at a time, and the control's session
// would stop being the worker's session — one record, one fleet tile, reached by stop(). So:
//
//   1. `packages/mesh/src/launcher.mjs` builds its session-spawn handler from
//      `createMeshWorkerSessionSpawnHandler` in BOTH its control branch and its worker branch, each
//      call carrying the same literal keys (the repo guard and the scoped checkout, plus the three
//      outbound legs). A key reachable only through the test spread would be production-dead.
//   2. No module under `packages/mesh/src/` other than `session-spawn-handler.mjs` spawns a PTY for a
//      `session-spawn` frame: a module that both handles that frame and spawns a PTY is a second
//      handler, whatever it is called.
//   3. The router's two destinations are exclusive: one frame per lane for the local node and one for
//      a remote node each reach exactly one of the local handler and `dispatchDirective` — a frame
//      delivered to both opens two sessions, and to neither vanishes. This leg drives the SHIPPED
//      router.
//
// Every plant below is HAND-WRITTEN (never a string-replace on the real file) and asserts the
// detector trips on it, so a detector that can no longer see is red rather than vacuously green.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments, matchedParenSpan } from "../../support/source-slice.mjs";
import { buildSessionSpawnEnvelope } from "@aof/mesh/session-spawn-directive";
import { SOURCE_DIRECTORY_BUDGETS } from "../testing/acd-source-directory-budget.test.mjs";

const createTerminalInputRouter = _aofApplication.mesh.terminalInput.createTerminalInputRouter;
const buildTerminalInputEnvelope = _aofApplication.mesh.terminalRelayBridge.buildTerminalInputEnvelope;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const MESH_SRC = path.join(repoRoot, "packages", "mesh", "src");
const LAUNCHER = path.join(MESH_SRC, "launcher.mjs");
const THE_HANDLER = "session-spawn-handler.mjs";
const FACTORY = "createMeshWorkerSessionSpawnHandler";
// The keys ADR-001 §1 names: the repo guard and the scoped checkout the worker's call carries, and
// the three outbound legs each role supplies as its own.
const REQUIRED_KEYS = Object.freeze(["loadWs", "nodeId", "workerHasRepo", "meshCheckoutPath", "sendTerminalFrame", "sendTerminalEnd", "sendSessionSpawnAck"]);

const lf = (source) => String(source ?? "").replace(/\r\n/g, "\n");

// ── leg 1 ──────────────────────────────────────────────────────────────────────────────────────────

// braceSpan(code, from) → { open, close, body } of the first `{…}` at or after `from`, balanced.
function braceSpan(code, from) {
  const open = code.indexOf("{", from);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < code.length; i += 1) {
    if (code[i] === "{") depth += 1;
    else if (code[i] === "}" && --depth === 0) return { open, close: i, body: code.slice(open + 1, i) };
  }
  return null;
}

// roleBranches(code) → { control, worker } — the bodies of the launcher's role switch: the
// `if (role === "control" …) { … }` immediately followed by `else if (role === "worker" …) { … }`.
// Other `role === "control"` tests in the file (a ticker gate) are not the switch, so the control
// branch is the one whose closing brace is followed by the worker branch's `else if`.
export function roleBranches(code) {
  const workerAnchor = /\belse\s+if\s*\(\s*role\s*===\s*["']worker["']/.exec(code);
  if (workerAnchor == null) return { control: null, worker: null };
  const worker = braceSpan(code, workerAnchor.index + workerAnchor[0].length);
  let control = null;
  const controlAnchor = /\bif\s*\(\s*role\s*===\s*["']control["']/g;
  let match;
  while ((match = controlAnchor.exec(code)) !== null) {
    if (match.index > workerAnchor.index) break;
    const span = braceSpan(code, match.index + match[0].length);
    if (span != null && /^\s*$/.test(code.slice(span.close + 1, workerAnchor.index))) control = span;
  }
  return { control: control?.body ?? null, worker: worker?.body ?? null };
}

// factoryCallKeys(body) → the keys of the FIRST call in `body` that builds a handler from the
// worker's factory — called directly, or through a local alias whose initialiser names it (the
// launcher's `options?.createMeshWorkerSessionSpawnHandler ?? createMeshWorkerSessionSpawnHandler`
// test seam). Null when no such call exists.
export function factoryCallKeys(body) {
  if (body == null) return null;
  const callees = new Set([FACTORY]);
  const alias = new RegExp(`\\bconst\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*[^;]*\\b${FACTORY}\\b[^;]*;`, "g");
  let match;
  while ((match = alias.exec(body)) !== null) callees.add(match[1]);
  for (const callee of callees) {
    const call = new RegExp(`(?<![\\w$.])${callee.replace(/\$/g, "\\$")}\\s*\\(\\s*\\{`, "g");
    while ((match = call.exec(body)) !== null) {
      const span = matchedParenSpan(body, match.index);
      if (span == null) continue;
      return REQUIRED_KEYS.filter((key) => new RegExp(`(?:^|[{,\\s])${key}\\s*[:,}]`).test(span.body));
    }
  }
  return null;
}

export function oneHandlerProblems(launcherSource) {
  const code = lf(stripComments(launcherSource));
  const { control, worker } = roleBranches(code);
  const problems = [];
  for (const [role, body] of [["control", control], ["worker", worker]]) {
    if (body == null) {
      problems.push(`could not locate the launcher's ${role} branch (the role switch \`if (role === "control" …) … else if (role === "worker" …)\`)`);
      continue;
    }
    const keys = factoryCallKeys(body);
    if (keys == null) {
      problems.push(`the launcher's ${role} branch does not build its session-spawn handler from ${FACTORY} — a second handler for one role drifts from the other (191/ADR-001 Invariant)`);
      continue;
    }
    const missing = REQUIRED_KEYS.filter((key) => !keys.includes(key));
    if (missing.length > 0) {
      problems.push(`the launcher's ${role} branch calls ${FACTORY} without the literal key(s) ${missing.join(", ")} — a key reachable only through the test spread is production-dead (the F12 discipline)`);
    }
  }
  return problems;
}

// ── leg 2 ──────────────────────────────────────────────────────────────────────────────────────────

const HANDLES_SPAWN_FRAME = /\bSESSION_SPAWN_KIND\b|["'`]session-spawn["'`]|\bonSessionSpawn\s*\??\.?\s*\(/;
const SPAWNS_PTY = /\b(?:ptySpawn|spawnWithLoader|createTerminalSpawn|loadNodePty)\s*\(|\bpty\s*\.\s*spawn\s*\(|from\s*["']node-pty["']|import\s*\(\s*["']node-pty["']\s*\)/;

// secondHandlerProblem(name, source) → a problem string when `source` both handles a session-spawn
// frame and spawns a PTY, and is not THE handler. Comments never count.
export function secondHandlerProblem(name, source) {
  if (name === THE_HANDLER) return null;
  const code = lf(stripComments(source));
  if (HANDLES_SPAWN_FRAME.test(code) && SPAWNS_PTY.test(code)) {
    return `packages/mesh/src/${name} both handles a session-spawn frame and spawns a PTY — only ${THE_HANDLER} may (FF-19101: one handler serves both roles)`;
  }
  return null;
}

async function meshSourceFiles(dir = MESH_SRC, prefix = "") {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...await meshSourceFiles(path.join(dir, entry.name), rel));
    else if (entry.name.endsWith(".mjs")) out.push({ name: rel, file: path.join(dir, entry.name) });
  }
  return out;
}

// ── leg 3 ──────────────────────────────────────────────────────────────────────────────────────────

const LOCAL = "ctl-1";
const REMOTE = "wsl-2";
const SESSION = "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10";
const LANES = Object.freeze([
  { lane: "session-spawn", envelope: (node) => buildSessionSpawnEnvelope(node, { sessionId: SESSION, workspaceId: "ws-a", assistant: "claude", itemRef: null, at: "2026-11-12T00:00:00.000Z" }) },
  { lane: "terminal-input", envelope: (node) => buildTerminalInputEnvelope(node, SESSION, "ls\r") },
]);

// exclusivityProblems(makeRouter) — routes one frame per lane for the local node and one for a
// remote node through a router built by `makeRouter(ports)`, and names every frame that reached
// other than exactly one destination, or the wrong one.
export async function exclusivityProblems(makeRouter) {
  const problems = [];
  for (const { lane, envelope } of LANES) {
    for (const node of [LOCAL, REMOTE]) {
      let local = 0;
      let remote = 0;
      const router = makeRouter({
        dispatchDirective: () => { remote += 1; return { sent: true }; },
        localHandler: {
          nodeId: LOCAL,
          spawn: () => { local += 1; return Promise.resolve(); },
          input: () => { local += 1; return true; },
        },
      });
      router.apply(envelope(node));
      await Promise.resolve();
      const expected = node === LOCAL ? { local: 1, remote: 0 } : { local: 0, remote: 1 };
      if (local !== expected.local || remote !== expected.remote) {
        problems.push(`a ${lane} frame for ${node === LOCAL ? "the local node" : "a remote node"} reached the local handler ${local} time(s) and dispatchDirective ${remote} time(s); expected ${expected.local} and ${expected.remote}`);
      }
    }
  }
  return problems;
}

const shippedRouter = (ports) => createTerminalInputRouter({ ...ports, now: () => "2026-11-12T00:00:00.000Z" });

// ── plants ─────────────────────────────────────────────────────────────────────────────────────────

const CLEAN_LAUNCHER = `
async function startLauncher(ws, options) {
  if (role === "control" && options?.streamServer !== false) {
    if (ingressForward != null) {
      const createSessionSpawnHandler = options?.createMeshWorkerSessionSpawnHandler ?? createMeshWorkerSessionSpawnHandler;
      sessionSpawnHandler = createSessionSpawnHandler({
        loadWs: () => Promise.resolve(ws),
        nodeId,
        workerHasRepo,
        meshCheckoutPath,
        sendTerminalFrame: (s, b) => legs.frame(s, b),
        sendTerminalEnd: (s) => legs.end(s),
        sendSessionSpawnAck: (r) => push.push(r),
        ...(options?.sessionSpawnHandlerOptions ?? {}),
      });
    }
  } else if (role === "worker" && options?.streamClient !== false) {
    sessionSpawnHandler = createMeshWorkerSessionSpawnHandler({
      loadWs: () => Promise.resolve(ws),
      nodeId,
      workerHasRepo,
      meshCheckoutPath,
      sendTerminalFrame: (s, b) => client.sendTerminalFrame(s, b),
      sendTerminalEnd: (s) => client.sendTerminalEnd(s),
      sendSessionSpawnAck: (r) => client.sendSessionSpawnAck(r),
    });
  }
  if (role === "control" && hasDispatchSeam) { tick(); }
}
`;

// The pre-191 launcher: the control branch builds no handler at all.
const NO_CONTROL_HANDLER = `
async function startLauncher(ws, options) {
  if (role === "control" && options?.streamServer !== false) {
    streamServer = await startServer({ port });
  } else if (role === "worker" && options?.streamClient !== false) {
    sessionSpawnHandler = createMeshWorkerSessionSpawnHandler({
      loadWs: () => Promise.resolve(ws), nodeId, workerHasRepo, meshCheckoutPath,
      sendTerminalFrame: (s, b) => client.sendTerminalFrame(s, b), sendTerminalEnd: (s) => client.sendTerminalEnd(s), sendSessionSpawnAck: (r) => client.sendSessionSpawnAck(r),
    });
  }
}
`;

// The drift this control exists to refuse: the control writes its own handler.
const CONTROL_OWN_HANDLER = `
async function startLauncher(ws, options) {
  if (role === "control" && options?.streamServer !== false) {
    // createMeshWorkerSessionSpawnHandler is named only in a comment here.
    sessionSpawnHandler = createControlSessionHandler({
      loadWs: () => Promise.resolve(ws), nodeId, workerHasRepo, meshCheckoutPath,
      sendTerminalFrame: (s, b) => legs.frame(s, b), sendTerminalEnd: (s) => legs.end(s), sendSessionSpawnAck: (r) => push.push(r),
    });
  } else if (role === "worker" && options?.streamClient !== false) {
    sessionSpawnHandler = createMeshWorkerSessionSpawnHandler({
      loadWs: () => Promise.resolve(ws), nodeId, workerHasRepo, meshCheckoutPath,
      sendTerminalFrame: (s, b) => client.sendTerminalFrame(s, b), sendTerminalEnd: (s) => client.sendTerminalEnd(s), sendSessionSpawnAck: (r) => client.sendSessionSpawnAck(r),
    });
  }
}
`;

// The repo guard reachable only through the test spread on the control branch.
const CONTROL_KEY_ONLY_IN_SPREAD = `
async function startLauncher(ws, options) {
  if (role === "control" && options?.streamServer !== false) {
    sessionSpawnHandler = createMeshWorkerSessionSpawnHandler({
      loadWs: () => Promise.resolve(ws), nodeId, meshCheckoutPath,
      sendTerminalFrame: (s, b) => legs.frame(s, b), sendTerminalEnd: (s) => legs.end(s), sendSessionSpawnAck: (r) => push.push(r),
      ...(options?.sessionSpawnHandlerOptions ?? {}),
    });
  } else if (role === "worker" && options?.streamClient !== false) {
    sessionSpawnHandler = createMeshWorkerSessionSpawnHandler({
      loadWs: () => Promise.resolve(ws), nodeId, workerHasRepo, meshCheckoutPath,
      sendTerminalFrame: (s, b) => client.sendTerminalFrame(s, b), sendTerminalEnd: (s) => client.sendTerminalEnd(s), sendSessionSpawnAck: (r) => client.sendSessionSpawnAck(r),
    });
  }
}
`;

const SECOND_HANDLER_MODULE = `
import { SESSION_SPAWN_KIND } from "./session-spawn-directive.mjs";
export function onFrame(frame, ptySpawn) {
  if (frame.kind === SESSION_SPAWN_KIND) return ptySpawn(process.env.SHELL, [], { cwd: frame.cwd });
  return null;
}
`;

const COMMENT_ONLY_MODULE = `
// A session-spawn frame (SESSION_SPAWN_KIND) is handled by session-spawn-handler.mjs, which calls
// ptySpawn(shell, [], …). This module only routes it.
export function route(frame, dispatch) { return dispatch(frame); }
`;

// A router that delivers a local frame to BOTH destinations — the two-sessions defect.
const BOTH_DESTINATIONS = (ports) => ({
  apply(envelope) {
    if (envelope.nodeId === ports.localHandler.nodeId) {
      if (envelope.kind === "session-spawn") ports.localHandler.spawn(envelope); else ports.localHandler.input(envelope);
    }
    ports.dispatchDirective(envelope);
    return true;
  },
});

// A router with no local lane — the control's frame vanishes into a not-connected dispatch.
const NEITHER_LOCAL = (ports) => ({
  apply(envelope) {
    if (envelope.nodeId !== ports.localHandler.nodeId) ports.dispatchDirective(envelope);
    return false;
  },
});

export const archTests = [
  {
    name: "arch/191 FF-19101 (acd-launched-session-from-discord): the launcher builds its session-spawn handler from createMeshWorkerSessionSpawnHandler in BOTH its control and its worker branch, with the same literal keys",
    async run() {
      const problems = oneHandlerProblems(await readFile(LAUNCHER, "utf8"));
      assert.deepEqual(problems, [], problems.join("\n"));
    },
  },
  {
    name: "arch/191 FF-19101 (acd-launched-session-from-discord): no module under packages/mesh/src other than session-spawn-handler.mjs spawns a PTY for a session-spawn frame",
    async run() {
      const files = await meshSourceFiles();
      assert.ok(files.some((entry) => entry.name === THE_HANDLER), "the walk reached session-spawn-handler.mjs (non-vacuous)");
      assert.ok(files.length > 20, `the walk covered the mesh source tree (${files.length} files)`);
      const handler = files.find((entry) => entry.name === THE_HANDLER);
      const handlerCode = lf(stripComments(await readFile(handler.file, "utf8")));
      assert.ok(SPAWNS_PTY.test(handlerCode), "the detector sees THE handler's own PTY spawn — it can see what it forbids elsewhere");
      const problems = [];
      for (const { name, file } of files) {
        const problem = secondHandlerProblem(name, await readFile(file, "utf8"));
        if (problem != null) problems.push(problem);
      }
      assert.deepEqual(problems, [], problems.join("\n"));
    },
  },
  {
    name: "arch/191 FF-19101 (acd-launched-session-from-discord): the shipped router's two destinations are exclusive — one frame per lane for the local node and one for a remote node each reach exactly one of the local handler and dispatchDirective",
    async run() {
      const problems = await exclusivityProblems(shippedRouter);
      assert.deepEqual(problems, [], problems.join("\n"));
    },
  },
  {
    name: "arch/191 (acd-launched-session-from-discord): the test/arch/session budget row moved once, to 40, with its reason naming FF-19101, FF-19102 and FF-19103 as this one file's three controls",
    run() {
      const row = SOURCE_DIRECTORY_BUDGETS.find((entry) => entry.directory === "test/arch/session");
      assert.ok(row, "the test/arch/session row exists");
      assert.equal(row.ceiling, 40, "the row's ceiling is 40");
      assert.equal(row.allowance, 0, "…with zero allowance");
      for (const id of ["FF-19101", "FF-19102", "FF-19103"]) assert.ok(row.why.includes(id), `its reason names ${id}`);
      assert.ok(row.why.includes("acd-launched-session-from-discord.test.mjs"), "…and the one file that holds them");
    },
  },
  {
    name: "arch/191 FF-19101 (acd-launched-session-from-discord) self-check: a control branch with no handler, one built from another factory, one missing a literal key, a second PTY-spawning frame handler, and a router that delivers to both or to neither each trip — and the clean plants do not",
    async run() {
      assert.deepEqual(oneHandlerProblems(CLEAN_LAUNCHER), [], "the clean plant (aliased factory on control, direct on worker) passes");
      const { control, worker } = roleBranches(lf(stripComments(CLEAN_LAUNCHER)));
      assert.ok(control?.includes("createSessionSpawnHandler") && !control.includes("hasDispatchSeam"), "the plant's control branch is the role switch's, not the later ticker gate");
      assert.ok(worker?.includes("client.sendTerminalFrame"), "the plant's worker branch landed");

      const noControl = oneHandlerProblems(NO_CONTROL_HANDLER);
      assert.ok(noControl.some((p) => p.includes("control branch does not build")), `the pre-191 launcher trips: ${noControl.join(" | ")}`);
      assert.ok(!noControl.some((p) => p.includes("worker branch")), "…and only on the control branch");

      const ownHandler = oneHandlerProblems(CONTROL_OWN_HANDLER);
      assert.ok(ownHandler.some((p) => p.includes("control branch does not build")), `a control-only handler trips, even with the factory named in a comment: ${ownHandler.join(" | ")}`);

      const spreadOnly = oneHandlerProblems(CONTROL_KEY_ONLY_IN_SPREAD);
      assert.ok(spreadOnly.some((p) => p.includes("control branch") && p.includes("workerHasRepo")), `a key reachable only through the spread trips: ${spreadOnly.join(" | ")}`);

      assert.match(secondHandlerProblem("rogue.mjs", SECOND_HANDLER_MODULE) ?? "", /rogue\.mjs both handles a session-spawn frame and spawns a PTY/, "a second PTY-spawning frame handler trips");
      assert.equal(secondHandlerProblem(THE_HANDLER, SECOND_HANDLER_MODULE), null, "THE handler is the one module allowed to");
      assert.equal(secondHandlerProblem("router.mjs", COMMENT_ONLY_MODULE), null, "a mention in a comment is not a spawn");

      const both = await exclusivityProblems(BOTH_DESTINATIONS);
      assert.equal(both.length, 2, `a router that delivers a local frame to both trips once per lane: ${both.join(" | ")}`);
      assert.ok(both.every((p) => p.includes("the local node") && p.includes("dispatchDirective 1 time")), "…naming the double delivery");
      const neither = await exclusivityProblems(NEITHER_LOCAL);
      assert.equal(neither.length, 2, `a router that drops the local frame trips once per lane: ${neither.join(" | ")}`);
    },
  },
];
