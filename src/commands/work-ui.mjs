// work:ui — the work board server as a REGISTERED launcher-seam command (m42
// wave (d) leg d1, wave-3 tail; formerly cli.mjs's CLI-only workUiCommand ladder
// branch). `aof work ui` serves the BUILT board (ui/dist) same-origin — api +
// terminal ws + static, one origin — mirroring the board's ui-build-missing +
// EADDRINUSE friendly refusals (never a stack trace).
//
// The launcher seam splits its two faces:
//   run (the probe) — boardUiProbe: what WOULD serve (port/projectDir,
//     uiBuildPresent, the board URL), non-blocking. This is the --json face (the
//     face's probe rule: --json never launches), which keeps the
//     acd-work-command-cli-bijection spawn probe from hanging on the server.
//   cli.launch — the long-lived board server body (the retired workUiCommand's
//     bytes: announce lines, friendly refusals, SIGINT/SIGTERM shutdown).
import path from "node:path";
import { serveBoard, boardUiProbe } from "../board-serve.mjs";
// milestone 46 / story 02 (ADR-004) — the fleet's documented default port, imported
// from its ONE home. THE COMMAND LAYER is the layer allowed to know both faces
// (m08/ADR-001), and this import is the whole reason the standalone default is
// resolved here rather than inside the board server: `board-serve.mjs` /
// `setup-ui.mjs` importing the fleet server would close a cycle
// (`mesh-ui-serve.mjs → board-serve.mjs` is a real edge) and drag `ws` plus a whole
// serve-face into `aof work ui --json`'s never-launches probe path. Re-typing `4181`
// here instead would add a FIFTH home to a port map that already has four
// (TECH_DEBT 25) — ADR-004 routes around that debt and must not deepen it.
import { DEFAULT_MESH_UI_PORT } from "../mesh/ui-serve.mjs";
import { commandError } from "../command-error.mjs";

// The one shaping both doors share: the probe (run) and the launch body resolve
// port/projectDir identically, so the probe can never describe a different
// server than the one `aof work ui` would start. Default 4180 so it does not
// collide with `aof assets ui` (4177 frontend / 4178 API); the board serves on
// this single port.
function resolveBoardLaunchConfig(options) {
  return {
    port: Number.parseInt(options.port ?? "4180", 10),
    projectDir: path.resolve(options.target ?? process.cwd()),
    // The RAW operator value, unvalidated and unresolved, and OMITTED when the flag
    // was not passed — so the input the probe receives is byte-identical to HEAD's
    // for every invocation that does not use it. The probe never launches and never
    // dials, so it neither resolves nor refuses this; the launch body does both, once,
    // below.
    ...(options.fleetOrigin === undefined ? {} : { fleetOrigin: options.fleetOrigin }),
  };
}

// milestone 46 / story 02 (ADR-004) — THE STANDALONE FLEET ORIGIN, resolved in the
// COMMAND layer.
//
// THE CARRIER, settled at story kickoff and written down because discovering it
// mid-build is how a 1.5-day story becomes a 3-day one (PO finding F6): it is the
// CLI FLAG `--fleet-origin`, and there is exactly ONE of it — no config key and no
// environment variable beside it, because a flag AND a key AND a var would be three
// answers to one question, which is the very shape (`FLEET_PORT` in a browser
// constant vs. `DEFAULT_MESH_UI_PORT` in a server) this milestone exists to end.
// Why the flag: `work:ui` already owns the CLI's PORT vocabulary here (`--port`), and
// the fleet origin is the same kind of fact stated the same way; it declares
// `workspace: false` and genuinely needs no workspace, so a config key would make
// `aof work ui` behave differently per cwd — the cwd-derived-identity shape of
// TECH_DEBT 4 — and would grow this command a config-reading path it does not have.
// The condition that overturns it: if operators want to say this ONCE per machine
// rather than once per launch, the persistence lands as a fallback INSIDE this one
// resolver — one function, one home — never as a second carrier.
//
// The rules, each a PO/QA ruling ratified 2026-08-08:
//  - absent, empty or whitespace-only is ABSENCE, not a bad value: it falls back to
//    the fleet's own documented default, silently. An operator who configured nothing
//    configured nothing.
//  - a well-formed http(s) origin is taken VERBATIM, normalised only by `new URL().origin`
//    (which drops a trailing slash and nothing else) — including a fleet on another
//    machine and a TLS origin on its implicit port.
//  - anything else is REFUSED BY NAME. A bare port (`4181`, `127.0.0.1:4181`) re-creates
//    `FLEET_PORT` one layer down where nobody is looking for it; a path or a query would
//    be silently discarded by `new URL(x).origin` although the operator believes it is
//    used; a `ws:`/`wss:` scheme hands the URL builder two inputs for one decision (the
//    socket scheme is derived from the PAGE's scheme, never configured). A malformed
//    value is NEVER quietly replaced by the default — an operator who configured a fleet
//    and silently got 4181 has no way to see it.
//
// `source` is "default" for BOTH the fallback and an explicit configuration: the pair
// ADR-004 freezes answers "was I TOLD, or did I RESOLVE", and a configured value is
// resolved locally (PO ruling F-46.02-2).
// The example in the refusal is BUILT from the constant, never typed: a help string
// carrying its own copy of `4181` is a fifth home for the port map wearing a friendly
// hat, and it would drift silently the day the default moves.
//
// A FUNCTION, not a `const`, and that is load-bearing rather than style. This module
// sits ON a real import ring — `mesh-ui-serve → board-serve → setup-ui → board-ui →
// command-core → commands/work-ui → mesh-ui-serve` — so `DEFAULT_MESH_UI_PORT` is in
// its TDZ while this module evaluates whenever the graph is ENTERED at
// `mesh-ui-serve.mjs`. Reading it at module scope threw `Cannot access
// 'DEFAULT_MESH_UI_PORT' before initialization` for that entry point while
// `import("./src/cli.mjs")` stayed green — load order masked it, which is exactly why
// `acd-board-server-no-fleet-import` now probes each module as its own FRESH entry
// point. Every read of the constant in this file must therefore happen at CALL time.
// The cycle itself is legitimate and ADR-004 sanctioned (the command layer is the layer
// allowed to know both faces); what is not sanctioned is dereferencing across it during
// module evaluation — and the fix is never a second copy of the number (TECH_DEBT 25).
function validFleetOriginShape() {
  return `a scheme + host (+ optional port), e.g. http://127.0.0.1:${DEFAULT_MESH_UI_PORT} or https://fleet.example`;
}

export function resolveStandaloneFleetOrigin(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return { origin: `http://127.0.0.1:${DEFAULT_MESH_UI_PORT}`, source: "default" };
  }
  const value = String(raw).trim();

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    // MEASURED, and it is where BOTH bare-port rows land: `new URL("4181")` and
    // `new URL("127.0.0.1:4181")` each throw `ERR_INVALID_URL` (a bare host:port is not
    // a scheme — `127.0.0.1:` is rejected because the scheme grammar forbids digits in
    // the leading position). So the bare port never reaches the scheme branch below, and
    // it is refused here rather than coerced into a loopback origin.
    throw fleetOriginRefusal(value, "it is not a URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    // The live row here is the SOCKET scheme, `ws:`/`wss:` — which parses fine and must
    // still be refused: the socket scheme is derived by the URL builder from the page's
    // own scheme, so accepting it would hand the builder two inputs for one decision.
    throw fleetOriginRefusal(value, `its scheme is "${parsed.protocol.replace(/:$/, "")}", not http or https`);
  }
  if (parsed.pathname !== "" && parsed.pathname !== "/") {
    throw fleetOriginRefusal(value, `it carries a path ("${parsed.pathname}")`);
  }
  if (parsed.search !== "") throw fleetOriginRefusal(value, `it carries a query ("${parsed.search}")`);
  if (parsed.hash !== "") throw fleetOriginRefusal(value, `it carries a fragment ("${parsed.hash}")`);
  if (parsed.username !== "" || parsed.password !== "") throw fleetOriginRefusal(value, "it carries credentials");

  return { origin: parsed.origin, source: "default" };
}

// A refusal NAMES ITS OWN CAUSE and what a valid value looks like — this codebase's
// rule, and the only way an operator can tell a rejected origin from a fleet that is
// simply not running. A sentence on stderr, never a stack trace (the launch body
// prints `.message` and sets a non-zero exit, exactly as it does for ui-build-missing
// and EADDRINUSE).
function fleetOriginRefusal(value, because) {
  const error = new Error(
    `--fleet-origin "${value}" is not a valid origin: ${because}. Pass ${validFleetOriginShape()}.`
  );
  error.code = "invalid-fleet-origin";
  return error;
}

async function runWorkUi(input) {
  const { port, projectDir } = input;

  // m46 / story 02 — resolved BEFORE any bind, so a refused origin leaves no board
  // server listening on a guess. Same friendly-refusal posture as the two below: a
  // sentence on stderr and a non-zero exit, never a stack trace.
  let fleetOrigin;
  try {
    fleetOrigin = resolveStandaloneFleetOrigin(input.fleetOrigin);
  } catch (error) {
    if (error.code === "invalid-fleet-origin") {
      console.error(error.message);
      process.exitCode = 1;
      return;
    }
    throw error;
  }

  let session;
  try {
    session = await serveBoard({ projectDir, port, fleetOrigin });
  } catch (error) {
    if (error.code === "ui-build-missing") {
      console.error(error.message);
      process.exitCode = 1;
      return;
    }
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use. Pass --port <n> to pick another.`);
      process.exitCode = 1;
      return;
    }
    throw error;
  }

  const { server, boardUrl } = session;
  console.log("AOF work ui is running locally.");
  console.log(`Open this URL in your browser: ${boardUrl}`);
  console.log(`Project: ${projectDir}`);
  console.log("Press Ctrl+C to stop the board.");

  await new Promise((resolve) => {
    const shutdown = () => {
      server.close(() => {
        resolve();
      });
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  });
}

export const workUiCommand = {
  id: "work:ui",
  input: {
    type: "object",
    properties: {
      port: { type: "number" },
      projectDir: { type: "string" },
      // m46 / story 02 — the RAW operator value. It is shaped (not resolved) by
      // `argv`, so the non-blocking probe stays byte-identical: `boardUiProbe` ignores
      // it, and `aof work ui --json` neither resolves an origin nor refuses one.
      fleetOrigin: { type: "string" },
    },
    additionalProperties: false,
  },

  async run(input) {
    // The NON-BLOCKING probe (no bind, no server): what WOULD serve. The launch
    // body is the door below; this registered run never blocks.
    return boardUiProbe(input);
  },

  cli: {
    route: ["work", "ui"],
    spec: {
      // The `[--fleet-origin <origin>]` clause is APPENDED, never inserted: two usage
      // surfaces assert this string by prefix (`aof work ui [--port 4180]`), so the
      // order of the existing clauses is load-bearing.
      usage: "aof work ui [--port 4180] [--target <dir>] [--fleet-origin <origin>] [--json]",
      workspace: false,
      flags: {
        port: { type: "string", description: "port to bind (default 4180)" },
        target: { type: "string", description: "serve this project directory instead of the cwd" },
        // m46 / story 02 (ADR-004) — the ONE carrier for the fleet origin a standalone
        // board hands its terminal surfaces. An ORIGIN, never a port: accepting a bare
        // port here would re-create `FLEET_PORT` one layer down.
        //
        // The description names NO number, deliberately: this object literal is
        // evaluated at MODULE scope, and this module sits on an import ring whose entry
        // at `mesh-ui-serve.mjs` leaves `DEFAULT_MESH_UI_PORT` in its TDZ (see
        // validFleetOriginShape above). The concrete default is stated where it can be
        // read lazily — in the refusal message — rather than copied into a second home
        // to make a help string convenient.
        fleetOrigin: {
          type: "string",
          description: "where the fleet is, as an origin — defaults to the fleet UI's own documented port on 127.0.0.1",
        },
      },
    },

    // No positional. Previously a stray one was silently ignored — it now gets
    // the seam's loud refusal (the guard governs both doors).
    argv: (positionals, options) => {
      if (positionals.length > 0) {
        throw commandError(`"work ui" takes no positional argument (got "${positionals[0]}").`, "invalid-input", 400);
      }
      return resolveBoardLaunchConfig(options);
    },

    // The launcher seam: every non---json invocation IS the board server (bare
    // `aof work ui` launches — today's contract); the probe is the machine face.
    launch: () => (input) => runWorkUi(input),

    // The probe's human line — unreachable from the CLI today; other faces may
    // invoke the probe headlessly.
    render(result) {
      const build = result.uiBuildPresent ? "ui build present" : "ui build MISSING (npm --prefix ui run build)";
      return `Board probe — would serve ${result.boardUrl} from ${result.projectDir} (${build})`;
    },

    // The --json face is the bare probe (the non-blocking bijection-probe shape).
    json: (result) => result,
  },
};
