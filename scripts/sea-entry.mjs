// The SEA main SOURCE (milestone 28 / story 00, ADR-001/ADR-004; reshaped for
// TECH_DEBT item 1 — decouple the program from the binary).
//
// This is the file esbuild bundles (--bundle --platform=node --format=cjs
// --target=node22) into the single CJS SEA `main` script sea-config.json points
// at. It stays BYTE-EQUIVALENT IN SHAPE to bin/aof.mjs where it matters
// (ADR-004): the ONE run() command core is the only dispatch — no relay
// fast-path, no per-mode fork; mode is entirely argv-routed through run().
//
// TECH_DEBT item 1 — the LAUNCHER discipline. The binary used to BE the whole
// program (every src/*.mjs compiled into the blob), so a one-line source change
// needed an 88 MB rebuild + reinstall, and a running daemon could silently
// disagree with its source. Now the embedded bundle is only the FALLBACK:
//
//   - PAYLOAD mode (the installed/soak loop): when <exeDir>/src/cli.mjs exists
//     (the install ships the real src/ tree + node_modules beside the exe, the
//     same anchor the bundle/ and ui/ sidecars already use), the CLI is loaded
//     FROM DISK — a source change is picked up by restart, never a rebuild.
//   - EMBEDDED mode (the release single-file artefact, or AOF_SEA_EMBEDDED=1):
//     the esbuild bundle compiled into this binary runs, exactly as before.
//
// The selection consults ONLY payload presence (cli.mjs, and the BUILD_ID.json stamp
// that says a payload install exists) + AOF_SEA_EMBEDDED — never argv
// (the acd-single-entry-command-core invariant: no command-mode fork ahead of
// run()). A payload that is present but BROKEN fails LOUDLY with the payload
// path and the recovery steps — never a silent fallback to the embedded build,
// which would be exactly the stale-code-running-invisibly failure item 1 exists
// to end. The chosen mode is stamped into AOF_RUNTIME_MODE so build-info /
// --version / daemon startup lines can say which code is actually running.
import path from "node:path";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { run } from "../src/cli.mjs";

// Native dynamic import, shielded from esbuild: under --format=cjs esbuild
// rewrites a bare `import(expr)` into a require()-based shim, which cannot load
// the on-disk ESM payload. `new Function` is opaque to the bundler, so the real
// engine-level import() survives into the SEA main (verified against this exact
// SEA recipe: external ESM + relative imports + bare specifiers all resolve,
// anchored beside the exe).
const dynamicImport = new Function("specifier", "return import(specifier)");

// The build this binary's bundle was made from, compiled in by scripts/build-sea.mjs (esbuild
// `define`); null in a binary that predates the stamp. build-info reports it in embedded mode,
// where the payload's BUILD_ID.json describes some OTHER build.
const EMBEDDED_BUILD_ID = typeof __AOF_EMBEDDED_BUILD_ID__ === "string" ? __AOF_EMBEDDED_BUILD_ID__ : null;

// 2026-09-27 — A PAYLOAD INSTALL IS NEVER STOOD IN FOR BY THE EMBEDDED BUILD. "Payload absent"
// used to mean "run the embedded bundle", and a payload install passes through absent while it
// replaces src/. The desktop app's 3-second `mesh status` poll landed in that window and ran a
// two-month-old bundle, whose identity self-heal re-minted the control node's id (16:02:47Z,
// 4 s after an `install-local`). So when a payload install is on disk (its BUILD_ID.json stamp beside
// the exe) but src/cli.mjs is missing, this waits for it to come back and, if it never does, FAILS
// LOUDLY. Embedded runs only for a binary with no payload install, or on AOF_SEA_EMBEDDED=1.
const PAYLOAD_WAIT_MS = 15000;
const PAYLOAD_POLL_MS = 100;

function payloadReappears(file) {
  const cell = new Int32Array(new SharedArrayBuffer(4));
  const until = Date.now() + PAYLOAD_WAIT_MS;
  while (Date.now() < until) {
    Atomics.wait(cell, 0, 0, PAYLOAD_POLL_MS);
    if (existsSync(file)) return true;
  }
  return false;
}

const payloadCliPath = path.join(path.dirname(process.execPath), "src", "cli.mjs");
const payloadStampPath = path.join(path.dirname(process.execPath), "BUILD_ID.json");
let payloadPresent = process.env.AOF_SEA_EMBEDDED !== "1" && existsSync(payloadCliPath);
if (process.env.AOF_SEA_EMBEDDED !== "1" && !payloadPresent && existsSync(payloadStampPath)) {
  payloadPresent = payloadReappears(payloadCliPath);
  if (!payloadPresent) {
    console.error(
      `aof: the installed CLI payload is missing (${payloadCliPath}), but this is a payload install (BUILD_ID.json beside the exe).\n` +
      `Refusing to run this binary's embedded build (${EMBEDDED_BUILD_ID ?? "unstamped"}) in its place. ` +
      "Re-run the payload install (node scripts/install-local.mjs), or set AOF_SEA_EMBEDDED=1 to run the embedded build deliberately.",
    );
    process.exit(1);
  }
}
process.env.AOF_RUNTIME_MODE = payloadPresent ? "payload" : "embedded";
if (EMBEDDED_BUILD_ID != null) process.env.AOF_EMBEDDED_BUILD_ID = EMBEDDED_BUILD_ID;

const resolveRun = payloadPresent
  ? dynamicImport(pathToFileURL(payloadCliPath).href)
      .catch((error) => {
        throw new Error(
          `aof: failed to load the installed CLI payload at ${payloadCliPath}: ${error.message}\n` +
          "Re-run the payload install (node scripts/install-local.mjs) or set AOF_SEA_EMBEDDED=1 to run this binary's embedded build.",
        );
      })
      .then((payload) => {
        if (typeof payload.run !== "function") {
          throw new Error(
            `aof: the installed CLI payload at ${payloadCliPath} exports no run() — re-run the payload install (node scripts/install-local.mjs).`,
          );
        }
        return payload.run;
      })
  : Promise.resolve(run);

resolveRun
  .then((run) => run(process.argv.slice(2)))
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
