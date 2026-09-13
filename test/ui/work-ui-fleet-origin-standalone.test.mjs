// Traceability wiring for milestone 46 / story 02 / task 01 —
// tasks/01_standalone-resolves-its-own-default.feature (@executable @cli @work @board).
//
// Covers EVERY @executable scenario and Scenario-Outline row of that feature: a board
// started by `aof work ui` with no fleet anywhere still serves a fleet origin and names
// it a RESOLUTION; an explicit configuration overrides the default verbatim across all
// eight rows; a malformed configuration is refused BY NAME with a non-zero exit and no
// board left running, across all six rows; a standalone board neither starts nor waits
// for a fleet (and `--json` still returns its HEAD envelope without binding a port);
// whatever produced it, the served value is an ORIGIN across all four rows; and the
// standalone default is the FLEET's documented default and none of the four other
// numbers in the port map.
//
// THE CARRIER, settled at story kickoff (PO finding F6) and consumed here: the CLI flag
// `--fleet-origin` on `aof work ui`, and there is exactly ONE of it — no config key and
// no environment variable beside it. The Given "the operator's explicit fleet-origin
// configuration is X" is therefore composed onto the launch argv by `launchBoard` below;
// the When names the command, the Given names the configuration, and the harness joins
// them. See src/commands/work-ui.mjs for the ruling and the condition that overturns it.
//
// LITMUS, as the feature states it: every Then is a value read off a real HTTP response
// from a REAL `serveBoard` on an ephemeral port, or off a real `aof work ui` process's
// stdout and exit code (the launch-and-read shape test/ui/work-ui-verb-rename.test.mjs
// already uses). The one production module imported for a NUMBER is
// `src/mesh/ui-serve.mjs`, and only to read `DEFAULT_MESH_UI_PORT` for comparison — the
// TEST may import both faces, which is precisely what the production modules may not do,
// and comparing against the constant's ONE home is what stops the number being re-typed
// into a fifth (TECH_DEBT 25).
//
// THE PORT TRAP: the standalone default IS 4181 and the live fleet daemon holds it on
// the control node (:4182 likewise). Reading the number is not binding it — no lane here
// listens on the resolved origin and none asserts that nothing answers there. Every
// board binds a port this lane reserved by binding :0 and releasing it, and every
// "nothing is listening there" premise uses such a reserved-and-released port.
//
// ISOLATION: AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<driver> — FOCUSED, never the
// full suite.
import assert from "node:assert/strict";
import net from "node:net";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serveBoard, boardUiDist, boardUiProbe } from "../../src/board-serve.mjs";
import { serveMeshUi, meshUiDist, DEFAULT_MESH_UI_PORT } from "../../src/mesh/ui-serve.mjs";
// The COMMAND layer's own resolver — the subject of this task, imported rather than
// re-implemented so a shape row exercises the production decision, not a copy of it.
import { resolveStandaloneFleetOrigin } from "../../src/commands/work-ui.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "bin", "aof.mjs");

// The ONE place this file names the route the build chose (task 00 owns its shape; this
// task only CONSUMES the served fact).
const ROUTE = "/api/fleet-origin";

// --- fixtures ----------------------------------------------------------------

// A repo whose .aof/aof.config.json points work.dir at wiki/work, with one milestone so
// the board's work stream is non-empty — work-ui-verb-rename.test.mjs's own fixture.
async function makeFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-work-ui-origin-"));
  const workDir = path.join(root, "wiki", "work");
  await mkdir(path.join(root, ".aof"), { recursive: true });
  await mkdir(path.join(workDir, "03_milestone_board"), { recursive: true });
  await writeFile(
    path.join(root, ".aof", "aof.config.json"),
    JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" } }, null, 2),
    "utf8"
  );
  await writeFile(
    path.join(workDir, "03_milestone_board", "SPEC.md"),
    "---\ntype: milestone\nnumber: \"03\"\nslug: board\nstatus: in-progress\ntitle: \"Board\"\ncreated: 2026-06-19\nupdated: 2026-06-19\n---\n# 03\n",
    "utf8"
  );
  return root;
}

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

// A repoRoot whose ui/dist satisfies BOTH servers, for the in-process lanes.
async function makeRepoRootWithDist() {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-work-ui-origin-root-"));
  await writeDist(boardUiDist(root));
  await writeDist(meshUiDist(root));
  return root;
}

// A free port obtained by binding :0 and releasing it. Both a `--port <free>` and, where
// a row needs one, an origin that names a port NOTHING is listening on.
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

// Can this lane bind that port? Used as the "no second listener appeared" and "no board
// is left running" probe — a successful bind proves nothing is holding it.
async function portIsFree(port) {
  return await new Promise((resolve) => {
    const server = net.createServer();
    server.on("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => server.close(() => resolve(true)));
  });
}

function closeServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

// Bind a port and HOLD it, so a launch aimed at it would hit EADDRINUSE.
function bindBusyPort(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

// --- the real CLI ------------------------------------------------------------

// Launch `aof work ui …` and wait until it announces its board URL (the readiness line),
// or until it EXITS (a refusal — returned as { exited } rather than thrown, because six
// rows below are about exactly that outcome).
function launchBoard(cwd, args, { timeoutMs = 20000 } = {}) {
  return new Promise((resolve, reject) => {
    import("node:child_process").then(({ spawn }) => {
      const started = Date.now();
      const child = spawn(process.execPath, [cliPath, ...args], {
        cwd,
        env: { ...process.env, NODE_NO_WARNINGS: "1" },
      });
      let stdout = "";
      let stderr = "";
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try { child.kill("SIGTERM"); } catch { /* noop */ }
        reject(new Error(`work ui launch timed out; stdout=<${stdout}> stderr=<${stderr}>`));
      }, timeoutMs);
      const ready = () => /Open this URL in your browser:\s*\S+/.test(stdout);
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
        if (settled || !ready()) return;
        settled = true;
        clearTimeout(timer);
        resolve({
          exited: false,
          status: null,
          readyMs: Date.now() - started,
          get stdout() { return stdout; },
          get stderr() { return stderr; },
          stop: () => new Promise((res) => {
            child.on("close", () => res());
            try { child.kill("SIGTERM"); } catch { res(); }
          }),
        });
      });
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      child.on("close", (status) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ exited: true, status, readyMs: Date.now() - started, stdout, stderr, stop: async () => {} });
      });
      child.on("error", (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      });
    });
  });
}

// `aof work ui --json` — the non-blocking probe. Runs to completion.
function probeJson(cwd, args, { timeoutMs = 20000 } = {}) {
  return new Promise((resolve, reject) => {
    import("node:child_process").then(({ spawn }) => {
      const child = spawn(process.execPath, [cliPath, ...args, "--json"], {
        cwd,
        env: { ...process.env, NODE_NO_WARNINGS: "1" },
      });
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => {
        try { child.kill("SIGTERM"); } catch { /* noop */ }
        reject(new Error(`work ui --json did not exit; stdout=<${stdout}>`));
      }, timeoutMs);
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      child.on("close", (status) => {
        clearTimeout(timer);
        resolve({ status, stdout, stderr });
      });
      child.on("error", reject);
    });
  });
}

function announcedUrl(stdout) {
  const match = stdout.match(/Open this URL in your browser:\s*(\S+)/);
  return match ? match[1] : null;
}

async function readFact(origin) {
  const response = await fetch(new URL(ROUTE, origin));
  assert.equal(response.status, 200, `the fleet-origin fact answers 200 on ${origin}`);
  return await response.json();
}

// The argv a row's "explicit fleet-origin configuration" becomes. `undefined` is the
// "(absent)" row — no flag at all, which is a different input from an empty one.
function withConfiguration(port, configured) {
  const args = ["work", "ui", "--port", String(port)];
  if (configured !== undefined) args.push("--fleet-origin", configured);
  return args;
}

const DEFAULT_ORIGIN = `http://127.0.0.1:${DEFAULT_MESH_UI_PORT}`;

export const workUiFleetOriginStandaloneTests = [
  // ═══ Scenario: a board started by `aof work ui` with no fleet anywhere still serves a
  // fleet origin, and names it a RESOLUTION rather than a fact it was told. ═══════════
  {
    name: "work-ui-fleet-origin/01 a standalone `aof work ui` serves the resolved fleet origin and names it \"default\"",
    async run() {
      const root = await makeFixture();
      let handle;
      try {
        const port = await reserveFreePort();
        handle = await launchBoard(root, ["work", "ui", "--port", String(port)]);
        assert.equal(handle.exited, false, `the launch came up (stderr: ${handle.stderr})`);
        const boardUrl = announcedUrl(handle.stdout);
        assert.ok(boardUrl, "the launch announces a board URL");

        const fact = await readFact(boardUrl);
        assert.equal(
          fact.fleetOrigin,
          DEFAULT_ORIGIN,
          "`fleetOrigin` is http://127.0.0.1: followed by DEFAULT_MESH_UI_PORT exactly as src/mesh/ui-serve.mjs exports it — compared to its one home, never re-typed"
        );
        assert.equal(fact.source, "default", "`source` is \"default\" — the board RESOLVED this rather than being told it");
        assert.notEqual(fact.fleetOrigin, null, "the value is NOT null: a standalone board never leaves a terminal surface with nothing to build a URL from");

        const page = await fetch(new URL("/board", boardUrl));
        assert.equal(page.status, 200, "the board's /board page answers 200 with the app shell");
        assert.match(await page.text(), /<div id="root">/, "…the app shell");
        const list = await fetch(new URL("/api/work/list", boardUrl));
        assert.equal(list.status, 200, "…and /api/work/list answers its usual envelope");
        assert.deepEqual(Object.keys(await list.json()).sort(), ["items", "nodeId", "stalenessSeconds"], "…unchanged by resolving an origin");
      } finally {
        if (handle) await handle.stop();
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  // ═══ Scenario Outline: an explicit fleet-origin configuration overrides the default,
  // VERBATIM. All eight rows. ════════════════════════════════════════════════════════
  {
    name: "work-ui-fleet-origin/01 an explicit fleet-origin configuration overrides the default verbatim (all eight rows)",
    async run() {
      const root = await makeFixture();
      // ONE reserved-and-released loopback port serves the two rows that name one, and
      // it is the "nothing is listening there" premise for both.
      const reserved = await reserveFreePort();
      const rows = [
        { case: "nothing configured", configured: undefined, expected: DEFAULT_ORIGIN, loopbackPort: null },
        { case: "an empty configuration", configured: "", expected: DEFAULT_ORIGIN, loopbackPort: null },
        { case: "a whitespace-only configuration", configured: "   ", expected: DEFAULT_ORIGIN, loopbackPort: null },
        { case: "a fleet on another loopback port", configured: `http://127.0.0.1:${reserved}`, expected: `http://127.0.0.1:${reserved}`, loopbackPort: reserved },
        { case: "a fleet on another MACHINE", configured: "http://192.0.2.10:4181", expected: "http://192.0.2.10:4181", loopbackPort: null },
        { case: "a fleet behind TLS", configured: "https://fleet.example:8443", expected: "https://fleet.example:8443", loopbackPort: null },
        { case: "a fleet behind TLS on the implicit port", configured: "https://fleet.example", expected: "https://fleet.example", loopbackPort: null },
        { case: "a trailing slash the operator typed", configured: `http://127.0.0.1:${reserved}/`, expected: `http://127.0.0.1:${reserved}`, loopbackPort: reserved },
      ];
      try {
        for (const row of rows) {
          const port = await reserveFreePort();
          const handle = await launchBoard(root, withConfiguration(port, row.configured));
          try {
            assert.equal(handle.exited, false, `${row.case}: the launch came up (stderr: ${handle.stderr})`);
            const boardUrl = announcedUrl(handle.stdout);
            assert.ok(boardUrl, `${row.case}: the launch ANNOUNCED its board URL`);

            const fact = await readFact(boardUrl);
            assert.equal(fact.fleetOrigin, row.expected, `${row.case}: \`fleetOrigin\` is exactly ${row.expected}`);
            assert.equal(fact.source, "default", `${row.case}: \`source\` is "default"`);

            const list = await fetch(new URL("/api/work/list", boardUrl));
            assert.equal(list.status, 200, `${row.case}: …and it answered /api/work/list without ever waiting on the configured origin`);

            // The board bound exactly ONE port: its own, the one it was asked for.
            assert.equal(new URL(boardUrl).port, String(port), `${row.case}: the board bound the port it was given`);
            if (row.loopbackPort !== null) {
              // …and nothing was dialled and no second listener appeared: the port the
              // configuration NAMES is still free while the board is up.
              assert.equal(
                await portIsFree(row.loopbackPort),
                true,
                `${row.case}: no second listener appeared on the configured origin's port — nothing is listening there, and the board came up anyway`
              );
            }
          } finally {
            await handle.stop();
          }
        }
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  // ═══ Scenario Outline: a malformed fleet-origin configuration is refused BY NAME, and
  // no board is left running on a guess. All six rows. ═══════════════════════════════
  {
    name: "work-ui-fleet-origin/01 a malformed fleet-origin configuration is refused by name and leaves no board running (all six rows)",
    async run() {
      const root = await makeFixture();
      const rows = [
        { case: "a bare port", configured: "4181" },
        { case: "a bare port on a host", configured: "127.0.0.1:4181" },
        { case: "an origin carrying a path", configured: "http://127.0.0.1:4181/fleet" },
        { case: "an origin carrying a query", configured: "http://127.0.0.1:4181/?scope=global" },
        { case: "a websocket scheme", configured: "ws://127.0.0.1:4181" },
        { case: "not a URL at all", configured: "not-an-origin" },
      ];
      try {
        for (const row of rows) {
          const port = await reserveFreePort();
          const handle = await launchBoard(root, withConfiguration(port, row.configured));
          const output = `${handle.stdout}${handle.stderr}`;

          assert.equal(handle.exited, true, `${row.case}: the process exits rather than serving`);
          assert.notEqual(handle.status, 0, `${row.case}: …with a non-zero exit code (got ${handle.status})`);
          assert.ok(
            output.includes(row.configured),
            `${row.case}: the message NAMES the offending value (got: ${JSON.stringify(output)})`
          );
          // …and says what a VALID one looks like. Keyed on the half of the guidance no
          // malformed row's own value can supply, so the assertion cannot be satisfied
          // by the message merely echoing the input back.
          assert.ok(
            output.includes("https://fleet.example"),
            `${row.case}: …and says what a valid one looks like (got: ${JSON.stringify(output)})`
          );
          assert.ok(!/at Object\.<anonymous>/.test(output), `${row.case}: the message is a sentence, not a stack trace`);
          assert.ok(!/^\s*Error:/m.test(output), `${row.case}: …and carries no \`Error:\` prefix`);
          assert.equal(announcedUrl(handle.stdout), null, `${row.case}: no board URL was announced`);

          // NO board server is left listening on that port.
          assert.equal(await portIsFree(port), true, `${row.case}: a following bind of the same port succeeds`);
          // …and a malformed configuration is never quietly replaced by the default:
          // nothing anywhere is serving the would-have-been origin from this launch,
          // because this launch is not serving at all.
          assert.ok(!/is running locally\./.test(handle.stdout), `${row.case}: no board serves the would-have-been \`http://127.0.0.1:4181\``);
        }

        // THE ORDER PROOF (QA F3). "No board is left listening" is trivially true for a
        // bind-then-refuse implementation too — the process exits either way, and a
        // post-mortem `portIsFree` cannot tell the two apart. So: OCCUPY the port first.
        // If the origin were validated after `serveBoard`, the operator would get the
        // EADDRINUSE guidance and never learn their configuration was malformed — they
        // would fix the port, launch again, and hit the real refusal one round-trip
        // later. The origin refusal must WIN, which is only true if it happens first.
        const occupied = await reserveFreePort();
        const listener = await bindBusyPort(occupied);
        try {
          const handle = await launchBoard(root, withConfiguration(occupied, "not-an-origin"));
          const output = `${handle.stdout}${handle.stderr}`;
          assert.equal(handle.exited, true, "a malformed origin on an OCCUPIED port still exits");
          assert.notEqual(handle.status, 0, "…non-zero");
          assert.ok(
            output.includes("--fleet-origin") && output.includes("not-an-origin"),
            `…and the refusal names the ORIGIN, which is the error that happened first (got: ${JSON.stringify(output)})`
          );
          assert.ok(
            !/is already in use/.test(output),
            "…and never the port-in-use guidance: the origin is resolved BEFORE any bind is attempted, so the operator learns the real cause in one round trip"
          );
        } finally {
          await new Promise((resolve) => listener.close(resolve));
        }
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  // ═══ Scenario: a standalone board neither starts nor waits for a fleet — the number
  // came from the command layer, not from a running server. ══════════════════════════
  {
    name: "work-ui-fleet-origin/01 a standalone board neither starts nor waits for a fleet, and --json still answers its HEAD envelope without binding a port",
    async run() {
      const root = await makeFixture();
      let handle;
      try {
        const nothingListening = await reserveFreePort();
        const configured = `http://127.0.0.1:${nothingListening}`;
        const port = await reserveFreePort();

        handle = await launchBoard(root, withConfiguration(port, configured));
        assert.equal(handle.exited, false, `the launch came up (stderr: ${handle.stderr})`);
        assert.match(handle.stdout, /Open this URL in your browser:\s*\S+/, "the `Open this URL in your browser:` line appears");
        const boardUrl = announcedUrl(handle.stdout);
        const list = await fetch(new URL("/api/work/list", boardUrl));
        assert.equal(list.status, 200, "…and /api/work/list answers within the lane's ordinary readiness timeout — the launch never blocks on the configured origin");

        const fact = await readFact(boardUrl);
        assert.equal(
          fact.fleetOrigin,
          configured,
          "the fleet-origin fact answers 200 with that configured origin although nothing is listening on it — the command layer RESOLVED a number, it did not discover one"
        );

        assert.equal(await portIsFree(nothingListening), true, "exactly one listener exists for this launch: the board's own port");

        // The non-blocking probe: an envelope, exit 0, and no bind.
        const probePort = await reserveFreePort();
        const probe = await probeJson(root, ["work", "ui", "--port", String(probePort), "--fleet-origin", configured]);
        assert.equal(probe.status, 0, `\`aof work ui --json\` exits 0 (stderr: ${probe.stderr})`);
        const envelope = JSON.parse(probe.stdout);
        assert.equal(await portIsFree(probePort), true, "…without binding any port");

        // Every key the probe carried at HEAD, present with an unchanged value — read
        // against boardUiProbe's own answer for the same input rather than a re-typed
        // literal, so the pin cannot drift from board-serve.mjs:33-46.
        const head = boardUiProbe({ projectDir: root, port: probePort });
        for (const key of ["mode", "port", "projectDir", "uiDist", "uiBuildPresent", "boardUrl"]) {
          assert.ok(key in envelope, `the probe envelope still carries \`${key}\``);
          assert.deepEqual(envelope[key], head[key], `…with an unchanged value for \`${key}\``);
        }
        assert.equal(envelope.mode, "board", "…and `mode` still reads \"board\"");
      } finally {
        if (handle) await handle.stop();
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  // ═══ Scenario Outline: whatever produced it, the value the board serves is an ORIGIN.
  // All four rows — three from the command layer, one handed down by a real fleet. ════
  {
    name: "work-ui-fleet-origin/01 whatever produced it, the served value is an ORIGIN — never a bare port, a path or a query (all four rows)",
    async run() {
      const fixture = await makeFixture();
      const root = await makeRepoRootWithDist();
      const boards = [];
      let fleet;
      try {
        const reserved = await reserveFreePort();
        // Rows 1-3: produced by the COMMAND layer's own resolver — the production
        // decision, imported rather than re-implemented.
        const rows = [
          { case: "the standalone default", fleetOrigin: resolveStandaloneFleetOrigin(undefined) },
          { case: "an explicit non-default port", fleetOrigin: resolveStandaloneFleetOrigin(`http://127.0.0.1:${reserved}`) },
          { case: "an implicit-port TLS origin", fleetOrigin: resolveStandaloneFleetOrigin("https://fleet.example") },
        ];
        const origins = [];
        for (const row of rows) {
          const board = await serveBoard({ projectDir: fixture, port: 0, repoRoot: root, fleetOrigin: row.fleetOrigin });
          boards.push(board.server);
          origins.push({ case: row.case, fact: await readFact(board.url) });
        }

        // Row 4: handed down by a real fleet launcher (task 00's seam), re-read here for
        // the SHAPE rule rather than for the value.
        fleet = await serveMeshUi({ projectDir: fixture, port: 0, repoRoot: root });
        const handedDown = await serveBoard({
          projectDir: fixture,
          port: 0,
          repoRoot: root,
          fleetOrigin: { origin: new URL(fleet.fleetUrl).origin, source: "launcher" },
        });
        boards.push(handedDown.server);
        origins.push({ case: "handed down by a fleet launcher", fact: await readFact(handedDown.url) });

        for (const { case: label, fact } of origins) {
          const value = fact.fleetOrigin;
          assert.equal(typeof value, "string", `${label}: it is a string, and not a number and not a numeric string`);
          assert.ok(!/^\d+$/.test(value), `${label}: …a bare port never reaches a reader`);
          let parsed;
          assert.doesNotThrow(() => { parsed = new URL(value); }, `${label}: it parses with new URL(...) without throwing`);
          assert.equal(
            value,
            new URL(value).origin,
            `${label}: it is byte-identical to new URL(fleetOrigin).origin — a path, a query, a fragment, a trailing slash, a credential or a bare port would all make those differ`
          );
          assert.ok(["http:", "https:"].includes(parsed.protocol), `${label}: its scheme is http or https`);
          assert.notEqual(parsed.hostname, "", `${label}: …and its host is non-empty`);
          assert.equal(
            new URL("/ws/terminal-view", value).pathname,
            "/ws/terminal-view",
            `${label}: it composes into a socket URL with no string surgery — the only thing a reader will ever do with it`
          );
        }
      } finally {
        for (const server of boards) await closeServer(server);
        if (fleet) await closeServer(fleet.server);
        await rm(fixture, { recursive: true, force: true });
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  // ═══ Scenario: the standalone default is the FLEET's documented default, and is none
  // of the four other numbers in the port map (TECH_DEBT 25). ════════════════════════
  {
    name: "work-ui-fleet-origin/01 the standalone default is the FLEET's documented default and none of the four other numbers in the port map",
    async run() {
      const root = await makeFixture();
      let handle;
      try {
        const port = await reserveFreePort();
        handle = await launchBoard(root, ["work", "ui", "--port", String(port)]);
        assert.equal(handle.exited, false, `the launch came up (stderr: ${handle.stderr})`);
        const boardUrl = announcedUrl(handle.stdout);
        const fact = await readFact(boardUrl);

        const resolvedPort = new URL(fact.fleetOrigin).port;
        assert.equal(
          resolvedPort,
          String(DEFAULT_MESH_UI_PORT),
          "new URL(fleetOrigin).port equals DEFAULT_MESH_UI_PORT imported from src/mesh/ui-serve.mjs"
        );
        assert.notEqual(resolvedPort, new URL(boardUrl).port, "…it is not the board's own listening port");
        assert.notEqual(resolvedPort, "4180", "…it is not 4180 — boardUiProbe's default and work:ui's own");
        assert.notEqual(resolvedPort, "4178", "…it is not 4178 — serveBoard's own masked default, which is the assets API port");
        assert.notEqual(resolvedPort, "4177", "…it is not 4177 — serveSetupUi's default and the assets front end's");
      } finally {
        if (handle) await handle.stop();
        await rm(root, { recursive: true, force: true });
      }
    },
  },
];
