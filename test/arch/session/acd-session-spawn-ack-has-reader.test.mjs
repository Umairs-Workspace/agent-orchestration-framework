// Fitness function: acd-session-spawn-ack-has-reader (milestone 50 / story 04;
// ARCHITECTURE ADR-008 FF-A).
//
//   "A worker's `session-spawn-ack` is BRANCHED before any store apply, wired at the
//    PRODUCTION call site, re-stamped with the connection-bound nodeId, and arrives at a
//    registry the browser can read."
//
// ═══ THE INVARIANT THE MILESTONE ACTUALLY BROKE ════════════════════════════════════════
// `SESSION_SPAWN_ACK_KIND` shipped across three accepted stories with a builder, a sender,
// a transport and a unit test — and no reader. In `control-stream-server.mjs` it matched no
// branch, fell into `applyStreamFrame`, and came out of the kind table's tail as
// `{ published:false, skipped:true, code:"unknown-frame-kind" }`. That `skipped` was routed
// to `onFrameSkipped` and into the launcher's warning emitter, which wrote:
//
//   "Refused a session-spawn-ack frame from <node> for workspace (none) — this node has no
//    registered descriptor for that workspace, so the frame's items were DISCARDED."
//
// THREE OF THAT SENTENCE'S FOUR CLAIMS ARE FALSE: there is no workspace on the frame, no
// descriptor is required for it, and it carries no items. So the only operator-reachable
// trace of a failed spawn was a wrong sentence in a log — strictly worse than silence,
// because it sends the reader after a workspace-registration bug that does not exist.
//
// FIVE CLAUSES (ADR-008 FF-A a–e), each with a planted-violation self-check:
//   (a) the control BRANCHES the kind, and the branch appears BEFORE its `applyStreamFrame(`
//       call — an INDEX COMPARISON over the comment-stripped source, so the ack can never
//       regress into the unknown-frame-kind path;
//   (b) `applyStreamFrame`'s own kind table does NOT contain the ack (it is never persisted);
//   (c) `mesh-launcher.mjs` wires `onSessionSpawnAck` as a LITERAL key at the production
//       `startServer({` call, BEFORE the `controlStreamServerOptions` test spread (the F12
//       discipline: a sink reachable only through that spread is production-dead, which is
//       the exact class of defect this whole ADR exists to end);
//   (d) that wiring builds its envelope from the SECOND ARGUMENT's `nodeId`, never
//       `frame.nodeId` (finding F17's re-stamp, asserted the same way
//       `acd-fleet-terminal-frame-connection-identity` asserts it for the byte lane);
//   (e) a BEHAVIOURAL half — a fake worker frame driven in at the control's own message
//       seam reaches a registry `apply`, over the shipped modules and no others.
//
// Every plant is a HAND-WRITTEN synthesized snippet (never a string-replace on a real
// file), LF-normalised before planting because the tree is CRLF and an "\n"-shaped needle
// silently matches nothing against "\r\n".
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket } from "ws";
import { startControlStreamServer } from "../../../src/control-stream-server.mjs";
import { applyStreamFrame } from "../../../src/control-stream-server.mjs";
import { buildSessionSpawnAckFrame, buildSessionSpawnAckEnvelope, SESSION_SPAWN_ACK_KIND } from "../../../src/mesh/session-spawn-directive.mjs";
import { createSpawnOutcomeRegistry } from "../../../src/mesh/session-spawn-outcome.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CONTROL = path.join(repoRoot, "src", "control-stream-server.mjs");
const LAUNCHER = path.join(repoRoot, "src", "mesh", "launcher.mjs");

// LINE COMMENTS FIRST, BLOCK COMMENTS SECOND (TECH_DEBT item 24).
function stripComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function lf(source) {
  return source.replace(/\r\n/g, "\n");
}

async function realSource(file) {
  return lf(stripComments(await readFile(file, "utf8")));
}

// sliceBalanced(source, openIndex) — the substring INSIDE the {…} whose opening brace is at
// openIndex, depth-balanced. Cutting on the language's own structure rather than on a
// character window or an indentation-shaped `\n}` needle: both of those are wrong about a
// correct file the moment it is re-indented, and this repo has already paid for that twice
// (acd-fleet-board-link-resolved F-47-04-ARCH-2, acd-fleet-face-single-mutation-route).
function sliceBalanced(source, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex + 1, i);
    }
  }
  return null;
}

// The MESSAGE HANDLER's own body — `ws.on("message", (data) => { … })`. The ordering clause
// is stated INSIDE it deliberately: `applyStreamFrame`'s own DEFINITION sits earlier in the
// file than the handler, so a whole-file index comparison would measure the branch against
// the definition and report a correct tree as broken.
export function messageHandlerRegion(controlSource) {
  const anchor = /ws\.on\(\s*["']message["']/.exec(controlSource);
  if (anchor == null) return null;
  const open = controlSource.indexOf("{", anchor.index);
  return open < 0 ? null : sliceBalanced(controlSource, open);
}

// (a) THE ORDER, as an index comparison over the handler's own body. "Is there a branch?"
// is not the invariant — the invariant is that the branch RUNS FIRST, because an ack that
// reaches applyStreamFrame is an ack reported to the operator as a discarded workspace
// payload.
export function branchOrderProblems(handlerSource) {
  const problems = [];
  const branch = handlerSource.search(/kind\s*===\s*SESSION_SPAWN_ACK_KIND/);
  const apply = handlerSource.search(/\bapplyStreamFrame\s*\(\s*store\b/);
  if (branch < 0) {
    problems.push("control-stream-server.mjs never branches on SESSION_SPAWN_ACK_KIND — the ack falls through to applyStreamFrame's kind table and is reported to the operator as a DISCARDED workspace payload (three of that sentence's four claims are false). This is the defect ADR-008 exists to close.");
    return problems;
  }
  if (apply < 0) {
    problems.push("control-stream-server.mjs's message handler makes no `applyStreamFrame(store` call this detector can find — NOT FOUND rather than a claim about the rule: the handler was reshaped and this ordering clause must be reshaped with it.");
    return problems;
  }
  if (branch > apply) {
    problems.push("control-stream-server.mjs branches SESSION_SPAWN_ACK_KIND AFTER its applyStreamFrame( call — the branch must come BEFORE, or the ack is store-applied first and re-enters the unknown-frame-kind path it was pulled out of (ADR-008 decision 2; ADR-002 decision 6's no-persist clause).");
  }
  return problems;
}

// (b) NEVER PERSISTED. The kind table is `applyStreamFrame`'s own dispatch, and the ack
// must not appear in it — a failed spawn registers no session, so there is no record to
// hang an outcome on (ADR-004 decision 5).
export function noPersistProblems(controlSource) {
  const problems = [];
  const declaration = /(?:export\s+)?async\s+function\s+applyStreamFrame\s*\(/.exec(controlSource);
  if (declaration == null) {
    problems.push("could not find `applyStreamFrame`'s declaration — NOT FOUND rather than a claim about the rule: re-aim this clause at the new spelling rather than deleting it.");
    return problems;
  }
  // THE PARAMETER LIST FIRST, BY PAREN BALANCE. `applyStreamFrame(store, frame, options = {})`
  // carries a `{}` DEFAULT, so reaching for the next `{` after the declaration lands inside
  // the parameter list and cuts an EMPTY body — which passes an absence sweep silently. That
  // is the vacuity this file's own header is about, met inside this file.
  let close = -1;
  let parens = 0;
  for (let i = declaration.index + declaration[0].length - 1; i < controlSource.length; i += 1) {
    const ch = controlSource[i];
    if (ch === "(") parens += 1;
    else if (ch === ")") {
      parens -= 1;
      if (parens === 0) { close = i; break; }
    }
  }
  const open = close < 0 ? -1 : controlSource.indexOf("{", close);
  const body = open < 0 ? null : sliceBalanced(controlSource, open);
  if (body == null) {
    problems.push("could not cut `applyStreamFrame`'s body by brace balance — NOT FOUND rather than a claim about the rule.");
    return problems;
  }
  // NON-VACUITY, INSIDE THE DETECTOR: the cut must actually contain the kind table's own
  // tail. An empty or wrongly-cut body satisfies the absence check below for free.
  if (!/unknown-frame-kind/.test(body)) {
    problems.push("the cut `applyStreamFrame` body does not contain the kind table's `unknown-frame-kind` tail — the cut is wrong, not the tree. An absence sweep over a mis-cut region is a silent PASS.");
    return problems;
  }
  if (/SESSION_SPAWN_ACK_KIND|["']session-spawn-ack["']/.test(body)) {
    problems.push("applyStreamFrame's kind table mentions the session-spawn ack — the ack must NEVER be a store apply (ADR-008 decision 2). Branch it before the apply instead of adding a row to the table.");
  }
  return problems;
}

// keyValues(source, key) — every `key: <value>` property value, cut to the depth-0 comma or
// the enclosing object's close. Depth-aware across {} [] () so an arrow with its own call
// parentheses does not truncate. (The same helper shape
// `acd-fleet-terminal-frame-connection-identity` uses for the byte lane's re-stamp.)
function keyValues(source, key) {
  const values = [];
  const anchor = new RegExp(`\\b${key}\\s*:\\s*`, "g");
  let match;
  while ((match = anchor.exec(source)) !== null) {
    const start = match.index + match[0].length;
    let depth = 0;
    let i = start;
    for (; i < source.length; i += 1) {
      const ch = source[i];
      if (ch === "(" || ch === "[" || ch === "{") depth += 1;
      else if (ch === ")" || ch === "]" || ch === "}") {
        if (depth === 0) break;
        depth -= 1;
      } else if (ch === "," && depth === 0) break;
    }
    values.push({ text: source.slice(start, i).trim(), start });
  }
  return values;
}

// (c) + (d) THE PRODUCTION WIRING AND THE RE-STAMP.
export function wiringProblems(launcherSource) {
  const problems = [];
  const wirings = keyValues(launcherSource, "onSessionSpawnAck");
  if (wirings.length === 0) {
    problems.push("mesh-launcher.mjs wires no `onSessionSpawnAck:` key — the control's sink defaults to a no-op, so the ack is branched and then dropped. A lane whose far end is a default no-op is the shape ADR-008 was written about.");
    return problems;
  }
  for (const wiring of wirings) {
    // (d) THE F17 RE-STAMP. The envelope's nodeId must come from the SECOND ARGUMENT's
    // destructured `{ nodeId }` — the connection-bound identity resolved at admission —
    // and the worker's self-declared `frame.nodeId` must not be read here at all.
    if (!/\(\s*frame\s*,\s*\{\s*nodeId\s*\}\s*\)\s*=>/.test(wiring.text)) {
      problems.push(`mesh-launcher.mjs's onSessionSpawnAck wiring does not take \`(frame, { nodeId })\` — the CONNECTION-bound identity is the second argument, and a wiring that ignores it routes by whatever the worker declared. Got: ${wiring.text}`);
    }
    if (/frame\s*\.\s*nodeId/.test(wiring.text)) {
      problems.push(`mesh-launcher.mjs's onSessionSpawnAck wiring reads \`frame.nodeId\` — finding F17: an admitted worker could then send { kind:"session-spawn-ack", nodeId:"<victim>", ok:false } up its OWN authenticated socket and RESOLVE ANOTHER NODE'S PENDING SPAWN as a refusal. The self-declared nodeId is discarded; the connection's is used. Got: ${wiring.text}`);
    }
    if (!/buildSessionSpawnAckEnvelope\s*\(\s*nodeId\s*,/.test(wiring.text)) {
      problems.push(`mesh-launcher.mjs's onSessionSpawnAck wiring does not build its envelope as \`buildSessionSpawnAckEnvelope(nodeId, …)\` — one wire shape, one home (ADR-006 decision 2), and the re-stamped nodeId is its FIRST argument. Got: ${wiring.text}`);
    }
  }

  // (c) THE F12 DISCIPLINE: a LITERAL key at the production `startServer({` call, BEFORE
  // the `controlStreamServerOptions` test spread. A sink reachable only through that spread
  // is satisfiable by a fixture and dead in the daemon.
  const spread = launcherSource.search(/\.\.\.\(\s*options\?\.controlStreamServerOptions/);
  if (spread < 0) {
    problems.push("could not find the `...(options?.controlStreamServerOptions` spread in mesh-launcher.mjs — NOT FOUND rather than a claim about the rule: the F12 ordering cannot be measured against a spread that is not there.");
  } else if (!wirings.some((wiring) => wiring.start < spread)) {
    problems.push("mesh-launcher.mjs's onSessionSpawnAck key sits AFTER the controlStreamServerOptions test spread — the F12/F-38.05 discipline: a sink reachable only through that spread is satisfiable by a fixture and PRODUCTION-DEAD, which is the exact class of defect ADR-008 exists to end.");
  }
  return problems;
}

export const archTests = [
  {
    name: "arch/50 ADR-008 FF-A (acd-session-spawn-ack-has-reader): the control BRANCHES the ack before applyStreamFrame, never persists it, and the launcher wires the sink as a literal key with the F17 connection-identity re-stamp",
    async run() {
      const [controlSource, launcherSource] = await Promise.all([realSource(CONTROL), realSource(LAUNCHER)]);
      // NON-VACUITY: both files were actually read and stripped without being eaten.
      assert.ok(/wss\.on\(\s*["']connection["']/.test(controlSource), "the control source still contains its accept loop — if this fails the comment stripper ate the file");
      assert.ok(/startServer\s*\(/.test(launcherSource), "the launcher source still contains its production startServer call");

      const handler = messageHandlerRegion(controlSource);
      assert.ok(handler != null, "the `ws.on(\"message\", …)` body is sliceable — the ordering clause is measured INSIDE it, never over the whole file (applyStreamFrame's own DEFINITION sits earlier than the handler, and a whole-file comparison would report a correct tree as broken)");
      assert.ok(/applyStreamFrame\s*\(\s*store/.test(handler), "…and it really is the region that calls applyStreamFrame (non-vacuous)");

      assert.deepEqual(branchOrderProblems(handler), [], "(a) the ack is branched BEFORE applyStreamFrame");
      assert.deepEqual(noPersistProblems(controlSource), [], "(b) the ack is not a row in applyStreamFrame's kind table");
      assert.deepEqual(wiringProblems(launcherSource), [], "(c)+(d) the sink is a literal production key and re-stamps the connection-bound nodeId");
    },
  },

  {
    name: "arch/50 ADR-008 FF-A (acd-session-spawn-ack-has-reader) self-check: the PRE-ADR-008 control (no branch), a branch placed AFTER the apply, an ack added to the persist table, a wiring that reads frame.nodeId, and a wiring reachable only through the test spread each trip",
    async run() {
      // ── (a) plants ──
      const cleanControl = lf(stripComments(`
        if (frame?.kind === TERMINAL_FRAME_KIND) { onTerminalFrame(frame, { nodeId }); return; }
        if (frame?.kind === SESSION_SPAWN_ACK_KIND) { onSessionSpawnAck(frame, { nodeId }); return; }
        applyStreamFrame(store, frame, { now: receivedAt, nodeId });
      `));
      const cleanTable = lf(stripComments(`
        export async function applyStreamFrame(store, frame, options = {}) {
          if (frame?.kind === "presence") return applyPresenceFrame(store, frame, options);
          return { published: false, skipped: true, code: "unknown-frame-kind" };
        }
      `));
      assert.deepEqual(branchOrderProblems(cleanControl), [], "self-check: the clean synthesized handler shape stays quiet on the ordering clause");
      assert.deepEqual(noPersistProblems(cleanTable), [], "self-check: …and the clean synthesized kind table stays quiet on the no-persist clause");

      // THE PRE-ADR-008 TREE, reconstructed: the branch simply is not there. This is the
      // shipped defect, and it must trip.
      const noBranch = cleanControl.replace("if (frame?.kind === SESSION_SPAWN_ACK_KIND) { onSessionSpawnAck(frame, { nodeId }); return; }\n", "");
      assert.notEqual(noBranch, cleanControl, "the plant actually removed the branch");
      const noBranchProblems = branchOrderProblems(noBranch);
      assert.equal(noBranchProblems.length, 1, `self-check: the PRE-ADR-008 control trips. Got: ${JSON.stringify(noBranchProblems)}`);
      assert.match(noBranchProblems[0], /DISCARDED workspace payload/, "…and the refusal names the FALSE SENTENCE the operator actually read, not merely the missing branch");

      // THE ORDER REVERSED: a branch that exists but runs after the apply. It compiles, it
      // is unreachable, and a "does the branch exist?" detector would read green.
      const afterApply = lf(stripComments(`
        applyStreamFrame(store, frame, { now: receivedAt, nodeId });
        if (frame?.kind === SESSION_SPAWN_ACK_KIND) { onSessionSpawnAck(frame, { nodeId }); return; }
      `));
      const orderProblems = branchOrderProblems(afterApply);
      assert.equal(orderProblems.length, 1, `self-check: a branch placed AFTER the apply trips. Got: ${JSON.stringify(orderProblems)}`);
      assert.match(orderProblems[0], /must come BEFORE/, "…on the ordering, which is the whole invariant");

      // ── (b) plant: the ack added to the persist table, the "obvious" fix a future author
      // reaches for when they want the outcome to survive a restart. ADR-002 decision 6 and
      // ADR-004 decision 5 both forbid it.
      const persisted = lf(stripComments(`
        export async function applyStreamFrame(store, frame, options = {}) {
          if (frame?.kind === SESSION_SPAWN_ACK_KIND) return applySessionSpawnAckFrame(store, frame, options);
          return { published: false, skipped: true, code: "unknown-frame-kind" };
        }
      `));
      const persistProblems = noPersistProblems(persisted);
      assert.equal(persistProblems.length, 1, `self-check: an ack row in the persist table trips. Got: ${JSON.stringify(persistProblems)}`);
      assert.match(persistProblems[0], /NEVER be a store apply/, "…naming the rule rather than the symptom");

      // ── (c)+(d) plants ──
      const cleanLauncher = lf(stripComments(`
        streamServer = await startServer({
          onTerminalFrame: (frame, { nodeId }) => controlTerminalPush?.push({ ...frame, nodeId }),
          onSessionSpawnAck: (frame, { nodeId }) => controlTerminalPush?.push(buildSessionSpawnAckEnvelope(nodeId, frame)),
          ...(options?.controlStreamServerOptions ?? {}),
        });
      `));
      assert.deepEqual(wiringProblems(cleanLauncher), [], "self-check: the clean synthesized wiring stays quiet");

      // THE SPOOF: the wiring reads the worker's self-declared nodeId. This is F17 exactly,
      // one lane over from where it was first found, and it is the difference between "an
      // admitted worker can refuse its own spawn" and "an admitted worker can refuse
      // ANYONE'S".
      const spoofable = cleanLauncher.replace(
        "buildSessionSpawnAckEnvelope(nodeId, frame)",
        "buildSessionSpawnAckEnvelope(frame.nodeId, frame)",
      );
      assert.notEqual(spoofable, cleanLauncher, "the plant actually differs from the clean synthesized shape");
      const spoofProblems = wiringProblems(spoofable);
      assert.ok(
        spoofProblems.some((problem) => /frame\.nodeId/.test(problem) && /ANOTHER NODE'S PENDING SPAWN/.test(problem)),
        `self-check: a wiring that routes by the worker's self-declared nodeId trips, and the refusal names the attack. Got: ${JSON.stringify(spoofProblems)}`,
      );

      // THE PRODUCTION-DEAD WIRING: the sink supplied ONLY through the test spread. Every
      // unit test passes; the daemon has a no-op. This is F12/F-38.05, and it is the exact
      // species of defect ADR-006 and ADR-008 were both written to prevent.
      const spreadOnly = lf(stripComments(`
        streamServer = await startServer({
          onTerminalFrame: (frame, { nodeId }) => controlTerminalPush?.push({ ...frame, nodeId }),
          ...(options?.controlStreamServerOptions ?? {}),
          onSessionSpawnAck: (frame, { nodeId }) => controlTerminalPush?.push(buildSessionSpawnAckEnvelope(nodeId, frame)),
        });
      `));
      const spreadProblems = wiringProblems(spreadOnly);
      assert.ok(
        spreadProblems.some((problem) => /PRODUCTION-DEAD/.test(problem)),
        `self-check: a sink wired after the controlStreamServerOptions spread trips (F12). Got: ${JSON.stringify(spreadProblems)}`,
      );

      // …AND THE MISSING WIRING ENTIRELY, which is the state the tree shipped in.
      const unwired = cleanLauncher.replace(/\s*onSessionSpawnAck:[^\n]*\n/, "\n");
      assert.notEqual(unwired, cleanLauncher, "the plant actually removed the wiring");
      assert.ok(
        wiringProblems(unwired).some((problem) => /default no-op/.test(problem)),
        "self-check: an unwired sink trips — a branch whose far end defaults to a no-op is a lane that reads green and does nothing",
      );
    },
  },

  {
    // ═══ (e) THE BEHAVIOURAL HALF. Everything above is a source shape; this is the frame
    //     actually travelling. It is driven at the control's OWN message seam — a real
    //     admitted WebSocket connection into a real `startControlStreamServer` — and never
    //     by calling a sink directly, because "the sink works when called" is precisely
    //     what was already true while the lane did not exist.
    name: "arch/50 ADR-008 FF-A (acd-session-spawn-ack-has-reader, behavioural): a fake worker's session-spawn-ack driven in at the control's real socket seam reaches a spawn-outcome registry apply — over the shipped modules, with the connection's nodeId and no store write",
    async run() {
      const outcomes = createSpawnOutcomeRegistry({ now: () => "2026-08-14T12:00:00.000Z" });
      const skipped = [];
      const applied = [];
      let server;
      try {
        server = await startControlStreamServer({
          port: 0,
          bindAddress: "127.0.0.1",
          // ADMITTED BY AN AUTHORITATIVE RESOLVER, with the connection bound to "n1" — the
          // identity the re-stamp must use no matter what the frame declares.
          resolveOrigin: () => ({ authoritative: true, nodeId: "n1" }),
          // THE PRODUCTION WIRING'S SHAPE, verbatim: re-stamp with the 2nd argument's
          // nodeId and push the envelope on. The launcher's own literal key is asserted
          // structurally above; this drives the same expression.
          onSessionSpawnAck: (frame, { nodeId }) => {
            const envelope = buildSessionSpawnAckEnvelope(nodeId, frame);
            applied.push({ envelope, accepted: outcomes.apply(envelope) });
          },
          onFrameSkipped: (skip) => skipped.push(skip),
        });

        const address = server.server.address();
        const socket = new WebSocket(`ws://127.0.0.1:${address.port}/`);
        await new Promise((resolve, reject) => {
          socket.once("open", resolve);
          socket.once("error", reject);
        });
        // THE FRAME IS BUILT BY THE SHIPPED BUILDER, and it SELF-DECLARES a different node —
        // "n2" — so the re-stamp is exercised rather than assumed.
        socket.send(JSON.stringify(buildSessionSpawnAckFrame({ sessionId: "s-1", nodeId: "n2", ok: false, code: "session-repo-unavailable" })));
        // The message handler is synchronous up to the sink; one turn of the event loop is
        // enough, and a poll keeps the test from being a sleep.
        for (let attempt = 0; attempt < 200 && applied.length === 0; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
        socket.close();

        assert.equal(applied.length, 1, "the control handed the ack to its sink exactly once");
        assert.equal(applied[0].accepted, true, "…and the spawn-outcome registry accepted the envelope");
        assert.deepEqual(
          applied[0].envelope,
          {
            kind: SESSION_SPAWN_ACK_KIND,
            nodeId: "n1",
            signal: { sessionId: "s-1", ok: false, code: "session-repo-unavailable" },
          },
          "the envelope is the FROZEN { kind, nodeId, signal } with every field inside `signal`, and its nodeId is the CONNECTION's \"n1\" — the worker's self-declared \"n2\" is discarded (F17)",
        );
        assert.deepEqual(
          outcomes.read("n1", "s-1"),
          { ok: false, code: "session-repo-unavailable", at: "2026-08-14T12:00:00.000Z" },
          "the registry holds the outcome at the CONNECTION-bound tuple",
        );
        assert.equal(outcomes.read("n2", "s-1"), null, "…and nothing at the tuple the worker tried to claim");
        assert.deepEqual(skipped, [], "no frame-skipped diagnostic fired — the ack never reached applyStreamFrame's unknown-frame-kind tail, which is the false sentence this gate exists to keep deleted");
      } finally {
        if (server) await server.stop?.();
      }
    },
  },

  {
    // The NEGATIVE half of (b), driven rather than grepped: `applyStreamFrame` still does
    // not recognise the ack. The fix is a BRANCH BEFORE the apply, never a new row in the
    // persist table, and this is what says so about the running code.
    name: "arch/50 ADR-008 FF-A (acd-session-spawn-ack-has-reader, behavioural): applyStreamFrame STILL answers unknown-frame-kind for a session-spawn-ack — the lane is a pre-apply branch, never a persist row",
    async run() {
      const store = { paths: {} };
      const result = await applyStreamFrame(store, buildSessionSpawnAckFrame({ sessionId: "s-1", nodeId: "n1", ok: true }), { now: "2026-08-14T12:00:00.000Z", nodeId: "n1" });
      assert.deepEqual(
        result,
        { published: false, skipped: true, code: "unknown-frame-kind" },
        "the store-apply path is unchanged and still does not know this kind — ADR-002 decision 6's no-persist clause and ADR-004 decision 5's 'only the worker writes a session record' both stand",
      );
    },
  },
];
