// Fitness function: acd-fleet-terminal-frame-connection-identity (milestone 38 /
// story 06; ARCHITECTURE ADR-014 AMENDMENT 2026-07-19; SECURITY T14 concern #2 /
// finding F17).
//
// THE T6 DISCIPLINE ON THE TERMINAL LEG. ADR-014 AMENDMENT's DECISION bullet 1
// states, VERBATIM: "Routing identity is the CONNECTION-bound nodeId (`meta.nodeId`),
// re-stamped control-side, never the worker's self-declared `frame.nodeId` (the T6
// discipline the credential path keeps)." SECURITY T14 concern #2 requires the same:
// a compromised/curious-but-admitted worker must NOT be able to target another node's
// fleet terminal card by self-declaring `frame.nodeId`.
//
// THE AS-BUILT DEFECT THIS PINS (F17). control-stream-server.mjs DOES compute the
// connection-bound nodeId (`meta.nodeId`) and passes it to the sink as the 2nd arg —
// `onTerminalFrame(frame, { nodeId })`. But the frame it passes STILL carries the
// worker's self-declared `frame.nodeId`, and the LAUNCHER sink
// (mesh-launcher.mjs:719) DISCARDS the connection identity and pushes the RAW frame:
//   onTerminalFrame: (frame) => controlTerminalPush?.push(frame)
// The loopback broker forwards the raw frame byte-for-byte and the mirror
// (mesh-terminal-mirror.mjs) routes by `envelope.nodeId` — i.e. the worker's
// SELF-DECLARED nodeId. So a malicious admitted worker that sends a raw
// { kind:"terminal-frame", nodeId:"<victim>", signal:{ sessionId, bytes } } up its OWN
// authenticated fabric socket injects arbitrary bytes onto the VICTIM node's fleet
// card — the exact spoof the "re-stamped control-side" claim promises is impossible.
// The re-stamp is NOT implemented anywhere between admission and the mirror.
//
// THE INVARIANT (accepts EITHER correct fix location). Between the frame arriving on a
// worker's connection and the loopback push, the frame's routing nodeId MUST be
// OVERWRITTEN with the connection-bound identity. Two equivalent fixes both pass:
//   (a) control-stream-server re-stamps: onTerminalFrame({ ...frame, nodeId }, { nodeId })
//   (b) launcher re-stamps: onTerminalFrame: (frame, { nodeId }) =>
//         controlTerminalPush?.push({ ...frame, nodeId })
// If NEITHER site re-stamps (the current tree), the detector TRIPS. This is a REAL
// gate, RED BY DESIGN until F17's one-line fix lands (the milestone's
// acd-terminal-stream-transport-wired red-until-wired convention).
//
// PLUS a GREEN clause moving T14 concern #1's credential-source pin onto the LIVE
// path. The hybrid retired `wireTerminalBridge` was dead code and is now DELETED
// (m46 / story 01, ADR-007 — the last detector still aimed at it,
// acd-fleet-terminal-input-constrained's #4, was re-aimed at mesh-launcher.mjs's
// `onOutputChunk` arrows in the same story); the LIVE frame builder is
// worker-stream-client.mjs's `sendTerminalFrame`, fed by the launcher's
// `onOutputChunk` wiring. This clause asserts the live builder folds NO credential
// material into the streamed bytes, and is the ONE home for that needle.
//
// Every plant is a HAND-WRITTEN synthesized snippet (never a string-replace on a real
// file — the acd-terminal-stream-transport-wired convention), built with explicit
// "\n" joins (the tree is CRLF; an "\n"-only needle silently no-ops against CRLF
// source), and each asserts it LANDED (`assert.notEqual(planted, clean)`) before
// asserting the detector trips.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const LAUNCHER = path.join(repoRoot, "src", "mesh", "launcher.mjs");
const CONTROL = path.join(repoRoot, "src", "control-stream-server.mjs");
const WSCLIENT = path.join(repoRoot, "src", "worker-stream-client.mjs");

function stripComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

// lf(source) — normalise CRLF -> LF before every probe (the repo's tree is CRLF; an
// "\n"-only needle would silently no-op — the milestone's own hard-earned lesson).
function lf(source) {
  return source.replace(/\r\n/g, "\n");
}

function normalise(source) {
  return stripComments(lf(source));
}

// sliceBalanced(code, openIndex) — the substring INSIDE the {..}/(..) whose opening
// delimiter is at openIndex, depth-balanced (a nested body does not truncate early).
function sliceBalanced(code, openIndex, open = "{", close = "}") {
  let depth = 0;
  for (let i = openIndex; i < code.length; i += 1) {
    const ch = code[i];
    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return code.slice(openIndex + 1, i);
    }
  }
  return null;
}

// keyArrowValues(code, key) — EVERY expression assigned to an object `key:`, each sliced up
// to (but excluding) the next depth-0 comma or the enclosing object's closing brace.
// Depth-aware across {}, [], () so a re-stamp object `push({ ...frame, nodeId })`, a
// `(frame, { nodeId })` param list, and a `sendTerminalFrame(a, b)` call with its own
// comma do not truncate a slice. `code` MUST be comment-stripped + LF-normalised.
//
// PLURAL SINCE m46/04, AND THAT IS A REAL HOLE CLOSED, not tidiness. This helper used to
// `indexOf` the FIRST occurrence and return it alone. `src/mesh/launcher.mjs` carries TWO
// `onOutputChunk:` arrows — the assignment dispatch AND the terminal-resume handler — so the
// credential needle below read the first and said NOTHING about the second. A token folded into
// the RESUMED session's stream would have travelled with a green gate above it: "an assignment's
// session streams clean but a resumed one leaks" is precisely the silent half-wiring two call
// sites invite. Every arrow is read now, and the self-check below plants on the SECOND one
// specifically, so a regression to first-match-only fails rather than passing quietly.
function keyArrowValues(code, key) {
  const values = [];
  const needle = `${key}:`;
  let at = code.indexOf(needle);
  while (at !== -1) {
    let i = at + needle.length;
    let depth = 0;
    let value = "";
    for (; i < code.length; i += 1) {
      const ch = code[i];
      if (ch === "{" || ch === "[" || ch === "(") depth += 1;
      else if (ch === "}" || ch === "]" || ch === ")") {
        if (depth === 0) break; // the enclosing object's closing brace
        depth -= 1;
      } else if (ch === "," && depth === 0) {
        break;
      }
      value += ch;
    }
    values.push(value.trim());
    at = code.indexOf(needle, at + needle.length);
  }
  return values;
}

function onTerminalFrameSinkValue(launcherCode) {
  return keyArrowValues(launcherCode, "onTerminalFrame")[0] ?? null;
}

// launcherRestamps(sinkValue) — true iff the launcher sink (a) receives the
// connection-bound nodeId as its SECOND argument (`(frame, { nodeId })` / `(frame,
// meta)`) AND (b) does NOT push the bare self-declared `frame` — it pushes a
// re-stamped object instead. `push(frame)` (the current defect) is NOT a re-stamp.
function launcherRestamps(sinkValue) {
  if (sinkValue == null) return false;
  const takesConnectionNodeId =
    /\(\s*frame\s*,\s*\{[^}]*\bnodeId\b[^}]*\}\s*\)/.test(sinkValue) ||
    /\(\s*frame\s*,\s*meta\b/.test(sinkValue);
  if (!takesConnectionNodeId) return false;
  const pushesBareFrame = /push\(\s*frame\s*\)/.test(sinkValue);
  return !pushesBareFrame;
}

// controlOnTerminalFrameArg(controlCode) — the FIRST argument text of the
// `onTerminalFrame(` CALL in control-stream-server (the frame it hands the sink).
function controlOnTerminalFrameArg(controlCode) {
  const m = /onTerminalFrame\s*\(/.exec(controlCode);
  if (!m) return null;
  const open = controlCode.indexOf("(", m.index);
  const args = sliceBalanced(controlCode, open, "(", ")");
  if (args == null) return null;
  // first depth-0 comma splits arg1 from arg2
  let depth = 0;
  for (let i = 0; i < args.length; i += 1) {
    const ch = args[i];
    if (ch === "{" || ch === "[" || ch === "(") depth += 1;
    else if (ch === "}" || ch === "]" || ch === ")") depth -= 1;
    else if (ch === "," && depth === 0) return args.slice(0, i).trim();
  }
  return args.trim();
}

// controlRestamps(controlCode) — true iff control-stream-server hands the sink a
// re-stamped frame (`onTerminalFrame({ ...frame, nodeId }, …)`) rather than the bare
// self-declared `frame`.
function controlRestamps(controlCode) {
  const arg = controlOnTerminalFrameArg(controlCode);
  if (arg == null) return false;
  if (/^frame$/.test(arg)) return false; // bare frame — no re-stamp
  return /\.\.\.\s*frame/.test(arg) && /\bnodeId\b/.test(arg);
}

// controlPassesConnectionNodeId(controlCode) — the DEFENDED half (green now): control
// resolves nodeId from the CONNECTION (meta.nodeId), never the frame, and passes it to
// the sink. A regression to `frame.nodeId` here must trip.
function controlPassesConnectionNodeId(controlCode) {
  const bindsMeta = /\bnodeId\s*=\s*meta\.nodeId\b/.test(controlCode);
  const callPassesNodeId = /onTerminalFrame\s*\([^)]*\bnodeId\b/.test(controlCode) &&
    !/onTerminalFrame\s*\([^)]*frame\.nodeId/.test(controlCode);
  return bindsMeta && callPassesNodeId;
}

function connectionIdentityProblems(controlCode, launcherCode) {
  const control = normalise(controlCode);
  const launcher = normalise(launcherCode);
  const problems = [];

  if (!controlPassesConnectionNodeId(control)) {
    problems.push("control-stream-server.mjs does not resolve the terminal-frame nodeId from the CONNECTION (meta.nodeId) and pass it to the onTerminalFrame sink — the T6 discipline requires the connection-bound identity, never frame.nodeId");
  }

  const sinkValue = onTerminalFrameSinkValue(launcher);
  if (sinkValue == null) {
    problems.push("could not locate the onTerminalFrame: sink at the startServer({...}) call site in mesh-launcher.mjs");
    return problems;
  }

  // The end-to-end re-stamp: SOMEWHERE between admission and the loopback push, the
  // routing nodeId is overwritten with the connection identity. Accepts either fix
  // location; trips only when NEITHER re-stamps (the current F17 defect).
  if (!controlRestamps(control) && !launcherRestamps(sinkValue)) {
    problems.push("the terminal-frame's routing nodeId is NEVER re-stamped with the connection-bound identity (SECURITY T14 / F17): control-stream-server hands the sink the raw self-declared frame and the launcher pushes it verbatim (onTerminalFrame: (frame) => controlTerminalPush?.push(frame)) — a malicious admitted worker can target another node's fleet card by self-declaring frame.nodeId. Re-stamp control-side ((frame, { nodeId }) => push({ ...frame, nodeId })) — the ADR-014 AMENDMENT's own 're-stamped control-side' invariant");
  }

  return problems;
}

// --- credential-source on the LIVE fabric path (T14 concern #1, moved off the retired
// wireTerminalBridge onto worker-stream-client.sendTerminalFrame + the launcher's
// onOutputChunk wiring) ---

const CREDENTIAL_NEEDLE = /\b(?:process\.env|askpass|credential|mint(?:CloneCredential|WriteCredential)?|GIT_ASKPASS|apiKey|privateKey|appPrivateKey|token)\b/i;

// functionBody(code, name) — the balanced body of `function <name>(...) { … }`.
function functionBody(code, name) {
  const m = new RegExp(`function\\s+${name}\\s*\\(`).exec(code);
  if (!m) return null;
  const open = code.indexOf("{", m.index);
  if (open === -1) return null;
  return sliceBalanced(code, open);
}

function liveCredentialSourceProblems(wsClientCode, launcherCode) {
  const wsCode = normalise(wsClientCode);
  const launcher = normalise(launcherCode);
  const problems = [];

  const body = functionBody(wsCode, "sendTerminalFrame");
  if (body == null) {
    problems.push("worker-stream-client.mjs exposes no sendTerminalFrame(sessionId, bytes) — the LIVE fabric frame builder is missing (the credential-source pin has nothing to guard)");
  } else {
    if (CREDENTIAL_NEEDLE.test(body)) {
      problems.push("worker-stream-client.mjs's sendTerminalFrame references credential/env/askpass/mint/token material — the streamed frame must be built EXCLUSIVELY from its `bytes` argument (term.onData output), never a secret (SECURITY T14)");
    }
    if (!/buildTerminalFrameEnvelope\(\s*nodeId\s*,\s*sessionId\s*,\s*bytes\s*\)/.test(body)) {
      problems.push("worker-stream-client.mjs's sendTerminalFrame does not build its envelope from exactly (nodeId, sessionId, bytes) — a second data source may be spliced into the streamed bytes");
    }
  }

  // EVERY onOutputChunk wiring must forward EXACTLY the PTY chunk — no credential folded in
  // beside String(chunk). ALL of them, not the first: the launcher has two production call sites
  // (the assignment dispatch and the terminal-resume handler) and reading only one is how a leak
  // on the resumed lane travels under a green gate.
  const arrows = keyArrowValues(launcher, "onOutputChunk");
  if (arrows.length === 0) {
    problems.push("mesh-launcher.mjs has no onOutputChunk arrow at the createHandler call site — the live producer wiring is absent");
  }
  arrows.forEach((arrow, index) => {
    if (CREDENTIAL_NEEDLE.test(arrow)) {
      problems.push(`mesh-launcher.mjs's onOutputChunk #${index + 1} of ${arrows.length} folds credential/env/token material into the streamed chunk — the signal must be sourced ONLY from the PTY chunk`);
    }
  });

  return problems;
}

export const archTests = [
  // ══ REAL gate — the connection-identity re-stamp (RED BY DESIGN until F17 lands) ══
  {
    name: "arch/38 SECURITY T14 / F17 (acd-fleet-terminal-frame-connection-identity): the terminal-frame's routing nodeId is re-stamped with the CONNECTION-bound identity (never the worker's self-declared frame.nodeId) — the ADR-014 AMENDMENT's 're-stamped control-side' invariant (RED until the F17 launcher fix lands)",
    async run() {
      const [controlSource, launcherSource] = await Promise.all([readFile(CONTROL, "utf8"), readFile(LAUNCHER, "utf8")]);
      const problems = connectionIdentityProblems(controlSource, launcherSource);
      assert.deepEqual(
        problems,
        [],
        `the terminal-frame routing nodeId must be re-stamped control-side per ADR-014 AMENDMENT + SECURITY T14 concern #2. RED BY DESIGN until finding F17's fix lands (re-stamp the connection nodeId before the loopback push):\n${JSON.stringify(problems, null, 2)}`,
      );
    },
  },

  // ══ REAL gate — the LIVE credential-source pin (GREEN; the live path is clean) ══
  {
    name: "arch/38 SECURITY T14 concern #1 (acd-fleet-terminal-frame-connection-identity): the LIVE fabric frame builder (worker-stream-client.sendTerminalFrame + the launcher onOutputChunk wiring) folds NO credential material into the streamed bytes",
    async run() {
      const [wsClientSource, launcherSource] = await Promise.all([readFile(WSCLIENT, "utf8"), readFile(LAUNCHER, "utf8")]);
      const problems = liveCredentialSourceProblems(wsClientSource, launcherSource);
      assert.deepEqual(problems, [], `the live fabric terminal frame builder must source its bytes ONLY from the PTY chunk:\n${JSON.stringify(problems, null, 2)}`);
    },
  },

  // ══ self-check — non-vacuous, CRLF-safe: the detectors distinguish a re-stamped
  //    shape from the raw-push defect, regardless of the real tree ══
  {
    name: "arch/38 SECURITY T14 / F17 self-check: a re-stamped sink (control-side OR launcher-side) is clean; the raw-push defect (neither re-stamps) trips; a frame.nodeId regression on the control side trips; a credential folded into the live builder trips — each plant asserts it LANDED first",
    async run() {
      // --- connection-identity: synthesized control + launcher shapes ---
      const controlGood = [
        "wss.on('connection', (ws, meta) => {",
        "  const nodeId = meta.nodeId;",
        "  ws.on('message', (data) => {",
        "    const frame = JSON.parse(data.toString());",
        "    if (frame?.kind === TERMINAL_FRAME_KIND) { onTerminalFrame(frame, { nodeId }); return; }",
        "  });",
        "});",
      ].join("\n");
      // control re-stamps itself (fix location a)
      const controlRestampGood = controlGood.replace("onTerminalFrame(frame, { nodeId })", "onTerminalFrame({ ...frame, nodeId }, { nodeId })");
      // control regressed to routing by the self-declared frame.nodeId
      const controlFrameNodeId = [
        "wss.on('connection', (ws, meta) => {",
        "  const nodeId = meta.nodeId;",
        "  ws.on('message', (data) => {",
        "    const frame = JSON.parse(data.toString());",
        "    if (frame?.kind === TERMINAL_FRAME_KIND) { onTerminalFrame(frame, { nodeId: frame.nodeId }); return; }",
        "  });",
        "});",
      ].join("\n");

      const launcherRaw = [
        "streamServer = await startServer({",
        "  bindAddress, peerNodeIds, peersByAddress,",
        "  onTerminalFrame: (frame) => controlTerminalPush?.push(frame),",
        "});",
      ].join("\n");
      const launcherRestamp = [
        "streamServer = await startServer({",
        "  bindAddress, peerNodeIds, peersByAddress,",
        "  onTerminalFrame: (frame, { nodeId }) => controlTerminalPush?.push({ ...frame, nodeId }),",
        "});",
      ].join("\n");

      // clean shape #1: launcher re-stamps (control passes bare frame + connection nodeId)
      assert.deepEqual(connectionIdentityProblems(controlGood, launcherRestamp), [], "sanity: a launcher-side re-stamp is clean");
      // clean shape #2: control re-stamps (launcher may push the already-stamped frame raw)
      assert.deepEqual(connectionIdentityProblems(controlRestampGood, launcherRaw), [], "sanity: a control-side re-stamp is clean even with a raw launcher push");

      // PLANT — the F17 defect: NEITHER re-stamps (bare control frame + raw launcher push).
      assert.notEqual(launcherRaw, launcherRestamp, "plant differs from the clean launcher");
      const rawProblems = connectionIdentityProblems(controlGood, launcherRaw);
      assert.ok(
        rawProblems.some((p) => p.includes("NEVER re-stamped")),
        "self-check: the raw-push defect (no re-stamp anywhere) trips the identity detector",
      );

      // PLANT — the control side routes by the self-declared frame.nodeId.
      assert.notEqual(controlFrameNodeId, controlGood, "plant differs from the clean control");
      const frameNodeProblems = connectionIdentityProblems(controlFrameNodeId, launcherRestamp);
      assert.ok(
        frameNodeProblems.some((p) => p.includes("meta.nodeId")),
        "self-check: control resolving nodeId from frame.nodeId trips the connection-identity detector",
      );

      // --- live credential-source: synthesized ws-client + launcher ---
      const wsGood = [
        "export function createWorkerStreamClient(opts) {",
        "  async function sendTerminalFrame(sessionId, bytes) {",
        "    if (!connected || handle == null) return { sent: false };",
        "    try { await transport.send(handle, buildTerminalFrameEnvelope(nodeId, sessionId, bytes)); return { sent: true }; } catch { return { sent: false }; }",
        "  }",
        "  return { sendTerminalFrame };",
        "}",
      ].join("\n");
      const wsLeaks = wsGood.replace(
        "buildTerminalFrameEnvelope(nodeId, sessionId, bytes)",
        "buildTerminalFrameEnvelope(nodeId, sessionId, bytes + process.env.AOF_MESH_CLONE_TOKEN)",
      );
      // TWO call sites, exactly as production has: the assignment dispatch and the
      // terminal-resume handler.
      const launcherOcGood = [
        "const handler = createHandler({",
        "  onOutputChunk: (chunk, sessionId) => client.sendTerminalFrame(sessionId, String(chunk)),",
        "});",
        "const resume = createResumeHandler({",
        "  onOutputChunk: (chunk, sessionId) => client.sendTerminalFrame(sessionId, String(chunk)),",
        "});",
      ].join("\n");
      const launcherOcLeaks = launcherOcGood.replace(
        "onOutputChunk: (chunk, sessionId) => client.sendTerminalFrame(sessionId, String(chunk)),",
        "onOutputChunk: (chunk, sessionId) => client.sendTerminalFrame(sessionId, String(chunk) + process.env.TOKEN),",
      );
      // THE PLANT THAT PROVES THE HELPER IS PLURAL: the leak is on the SECOND arrow ONLY. A
      // first-match-only `keyArrowValue` reads the clean first one, finds nothing, and passes —
      // which is exactly the state this file was in until m46/04.
      const launcherOcLeaksOnResume = [
        "const handler = createHandler({",
        "  onOutputChunk: (chunk, sessionId) => client.sendTerminalFrame(sessionId, String(chunk)),",
        "});",
        "const resume = createResumeHandler({",
        "  onOutputChunk: (chunk, sessionId) => client.sendTerminalFrame(sessionId, String(chunk) + process.env.ANTHROPIC_API_KEY),",
        "});",
      ].join("\n");

      assert.deepEqual(liveCredentialSourceProblems(wsGood, launcherOcGood), [], "sanity: the bytes-only live builder is clean");
      assert.equal(keyArrowValues(normalise(launcherOcGood), "onOutputChunk").length, 2, "sanity: the synthesized baseline carries BOTH call sites, exactly as production does");

      assert.notEqual(wsLeaks, wsGood, "plant differs from the clean ws client");
      assert.ok(
        liveCredentialSourceProblems(wsLeaks, launcherOcGood).some((p) => p.includes("credential/env/askpass")),
        "self-check: a process.env token folded into sendTerminalFrame's bytes trips the live credential-source detector",
      );

      assert.notEqual(launcherOcLeaks, launcherOcGood, "plant differs from the clean onOutputChunk");
      assert.ok(
        liveCredentialSourceProblems(wsGood, launcherOcLeaks).some((p) => p.includes("onOutputChunk")),
        "self-check: a token folded into the onOutputChunk wiring trips the live credential-source detector",
      );

      // …AND ON THE SECOND ARROW ALONE. This is the regression a singular first-match helper
      // would let through, and the assertion that keeps `keyArrowValues` plural.
      assert.notEqual(launcherOcLeaksOnResume, launcherOcGood, "plant differs from the clean onOutputChunk");
      const resumeProblems = liveCredentialSourceProblems(wsGood, launcherOcLeaksOnResume);
      assert.ok(
        resumeProblems.some((p) => p.includes("#2 of 2")),
        `self-check: a token folded into the SECOND onOutputChunk (the terminal-resume handler) trips, and the refusal NAMES which of the two it was. A first-match-only reader passes this plant. Got: ${JSON.stringify(resumeProblems)}`,
      );

      // The helper itself, driven directly: both arrows come back, in source order.
      const both = keyArrowValues(normalise(launcherOcLeaksOnResume), "onOutputChunk");
      assert.equal(both.length, 2, "keyArrowValues returns EVERY arrow, not the first");
      assert.ok(!/ANTHROPIC_API_KEY/.test(both[0]), "…the first is clean");
      assert.ok(/ANTHROPIC_API_KEY/.test(both[1]), "…and the second is the one carrying the leak");
    },
  },
];
