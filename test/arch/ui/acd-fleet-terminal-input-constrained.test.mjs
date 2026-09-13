// Fitness function: acd-fleet-terminal-input-constrained (m42 "interactive worker
// terminals" — the DELIBERATE rewrite of acd-fleet-terminal-mirror-read-only).
//
// HISTORY: milestone 38 / story 06 (ADR-014; SECURITY T14) shipped the fleet
// terminal view READ-ONLY — no mesh->PTY input path anywhere — and this gate's
// predecessor pinned that ABSENCE. On 2026-07-27 the operator overrode that
// decision ("Next step is to make the terminal interactable. Rather than
// continuing on worker"): a needs-input session could only be answered by
// resuming at the worker. The input path now EXISTS — so this gate pins its
// CONSTRAINED SHAPE instead of its absence:
//
//   1. TUPLE-BOUND ENTRY — input enters the mesh at EXACTLY ONE seam: the
//      terminal-view socket's message handler, which wraps the bytes with THE
//      SOCKET'S OWN (nodeId, sessionId) (closed over from the upgrade query).
//      The message content contributes ONLY opaque bytes: the handler is
//      CONTENT-BLIND (no JSON.parse, no parse-then-branch — a smuggled tuple in
//      the payload is just bytes), BOUNDED (MAX_TERMINAL_INPUT_BYTES), and
//      CLEAN-DEGRADING (no configured push -> output-only route, exactly as
//      before the feature).
//   2. SESSION-EXACT DELIVERY — the worker's input handler resolves its write
//      EXCLUSIVELY through the liveSessionInputs registry by the frame's OWN
//      sessionId. No direct term.write/pty.write, no "first live PTY" fallback,
//      no iteration — an unmatched session id is a drop, never a redirect.
//   3. THE MIRROR/BRIDGE STAY PURE — in-memory, no durable write, no
//      write-seam import (ADR-014 inv.3, unchanged).
//   4. THE POSTURE HAS ONE AUTHOR PER SURFACE — the interactive surfaces are the
//      BOARD DOCK and the TERMINALS HOME, the FLEET PAGE STAYS A MONITOR, and no
//      render site in any of the three assembles the value that decides whether an
//      operator can type into another machine. ui/src/fleet and ui/src/home wire no
//      input source and send nothing on any socket of their own. RE-EXPRESSED by
//      m46/04 and AMENDED by m49/03 (see both notes below).
//
// ═══ m46 / STORY 04 — TWO CHANGES TO THIS FILE, AND NEITHER IS AN INVARIANT ═══════
//
// (a) THE OUTPUT-SIGNAL DETECTOR MOVED OUT, WHOLE, TO ITS OWN GATE:
//     test/arch/session/acd-terminal-output-signal-source.test.mjs. It was this file's
//     "invariant #4" — every `.sendTerminalFrame(` producer under src/ streams exactly
//     `String(chunk)`, and the envelope-building bridge module references no credential
//     material. That is a WORKER-SIDE producer and the OUTPUT direction; this gate is
//     named for the FLEET PAGE and is about the INPUT direction. One file carrying two
//     subjects had grown past 950 lines, and a red line reading `arch/42 terminal-input`
//     about the launcher's output arrow sends the next reviewer to the wrong surface. The
//     detector, its plants and its refusal text moved unchanged; nothing was relaxed.
//
// (b) INVARIANT 4 IS RE-EXPRESSED AT EQUAL STRENGTH, because the move this milestone
//     makes would otherwise leave it GREEN AND VACUOUS. Its detector is a DIRECTORY
//     SWEEP over `ui/src/fleet/**` asserting no file there wires `onData`/`onKey`/
//     `onBinary` or sends on a socket. The one terminal control now lives in
//     `ui/src/terminal/` and genuinely DOES both — for the board's interactive mount —
//     so the sweep would keep passing while asserting nothing about the property it
//     names. A green gate is read as a satisfied contract, which is worse than a deleted
//     one. ADR-006 rules the replacement, and it is THREE assertions where there was one:
//       1. THE CALL SITE — `ui/src/fleet/**` declares the read-only posture and has no
//          path to `interactive`, asserted structurally AND behaviourally by importing
//          the fleet's real mount module and running the real policy over it;
//       2. THE POLICY — `inputEnabled = source.canInput && !mount.readOnly`, driven over
//          the WHOLE frozen source table x BOTH postures x every malformed declaration.
//          A pure function driven exhaustively is a far stronger pin than an
//          absence-of-string sweep;
//       3. THE SWEEP SURVIVES, still walking `ui/src/fleet/**` — still non-vacuous
//          (`Fleet.tsx`, `api.ts`, `assignments.mjs`, `scope.mjs`, `terminal-mount.mjs`
//          remain) and still proving no fleet-local module grows its own input path.
//     Two SPELLINGS this detector asserted are gone with the files that carried them, and
//     both are recorded at the clause that replaced them: the dock's `remote ·` badge
//     (DESIGN change 8 retires it — the identity line already reads `→ <nodeId>`), and
//     "the dock does not construct `disableStdin: true`" (after unification there is ONE
//     control file and the fleet's read-only mount must construct exactly that, so a
//     needle re-pointed literally would forbid the posture this milestone must preserve).
//     Their INVARIANTS survive; their spelling does not — exactly what ADR-006 predicts.
//
// ═══ m49 / STORY 03 — THE MILESTONE'S ONE DELIBERATE REVERSAL, IN ONE OF THREE PARTS ═══
//
// The fleet ORIGIN becomes an interactive surface: `/` is now the terminals home, its tiles
// mount the ONE control, and a tile whose session an assignment is relaying CAN BE TYPED INTO.
// Invariant 4's subject sentence above said the interactive surface was the board dock. That
// sentence is now FALSE ABOUT THE PRODUCT, so it is REWRITTEN — never deleted, and never left
// to fail silently. Both notes stay; two amendments, one trail.
//
// THE COUNTER-INTUITIVE MEASUREMENT THAT DECIDES THE SHAPE (ADR-008): because ADR-001 puts the
// home in `ui/src/home/` rather than in `ui/src/fleet/`, ALL THREE PARTS BELOW STAY LITERALLY
// TRUE AND NON-VACUOUS AFTER m49 WITH NO EDIT AT ALL. Nothing goes red. What breaks is the
// PROPERTY: *the value that decides whether an operator can type into another machine has
// exactly ONE author, and it is not a render site* would be enforced on ONE of three surfaces,
// with the two that can genuinely type unconstrained — m46/ADR-006's own diagnosis arriving one
// milestone later, at the same clause. A green gate is read as a satisfied contract.
//
// SO: ONE PART CHANGES, TWO DO NOT.
//   · PART 1 (the call site) GENERALISES from "the fleet directory declares read-only" to a
//     SURFACE → POSTURE-HOME TABLE across all three surfaces, their three JSX mount sites, and
//     a fail-closed behavioural row driven through the home's REAL mount. Nothing is relaxed:
//     every clause it had still runs, on the same inputs, with the same verdicts.
//   · PART 2 (the policy) IS UNTOUCHED — not one character. It is a pure function over the
//     frozen source table and the two postures, and m49 changes neither.
//   · PART 3 (the sweep) IS UNTOUCHED AND GAINS A DIRECTORY: `ui/src/home/**` is swept for the
//     same input paths and browser sockets `ui/src/fleet/**` is. The home is interactive
//     THROUGH THE ONE CONTROL AND ONLY THROUGH IT, and a new top-level directory would
//     otherwise sit outside the only sweep that catches a surface file wiring its own socket.
//
// TWO ASYMMETRIES ARE DELIBERATE, AND GENERALISING EITHER ONE BREAKS THE GATE:
//   (a) `INTERACTIVE_DECLARATION` STAYS SCOPED TO `ui/src/fleet/**`. It is the READ-ONLY
//       surface's clause and it means "this surface has nothing to flip". Generalised, it fails
//       immediately and for the right reason: `ui/src/board/dock-mount.mjs` has named
//       `POSTURE_INTERACTIVE` since m42 and `ui/src/home/session-mount.mjs` MUST name it. A
//       clause that forbids the interactive surfaces from naming the interactive posture
//       forbids the milestone.
//   (b) THE AUTHORSHIP CLAUSE COVERS ALL THREE SURFACE DIRECTORIES AND REACHES NONE OF
//       `ui/src/terminal/**`. It is posture-VALUE-blind — it constrains WHO writes the key, not
//       WHICH word they write — which is exactly why it generalises where (a) cannot. The core
//       writes a `posture:` key at SEVEN sites across THREE modules (`input-policy.mjs`, which
//       DEFINES the vocabulary; `host-model.mjs`'s control-state constructor and `SET_POSTURE`
//       transform; and `TerminalControl.tsx`'s two READ-THROUGHS of `mount.posture`). Not one
//       of them AUTHORS a permission. A sweep that reached the core would report the product
//       this gate exists to protect, and the obvious "fix" would be three exemption entries —
//       i.e. a permission list, which is what these ratchets exist INSTEAD of. A surface is
//       where a posture can be INVENTED; the core is where it is defined and passed on.
//
// AND THE JSX FLOOR IS PER-SURFACE, WHICH IS THE CLAUSE THIS GATE'S HISTORY IS ABOUT. Today's
// floor is `mountProps.length >= 1` over ONE file. Generalised to three surfaces by
// concatenating their matches, ONE Fleet match satisfies it and the new INTERACTIVE home mount
// site is checked by NOTHING while CI reads green. So every surface carries its OWN floor, the
// refusal NAMES the surface that lost its mount, and the sites are DISCOVERED by sweeping each
// surface directory rather than by naming a third `.tsx` — a gate that cannot be broken by a
// file move is strictly better than one whose list must be maintained (m46/ADR-006).
//
// STRUCTURAL half: source-analysis over the REAL src/mesh/terminal-relay-bridge.mjs,
// src/mesh/terminal-mirror.mjs, src/mesh/worker-execution.mjs, the terminal-VIEW upgrade
// block of src/mesh/ui-serve.mjs, and the one control + fleet UI surfaces (comments
// discounted, CRLF-normalised — the repo's tree is CRLF; an "\n"-only needle would
// silently no-op, the failure class m38 was repeatedly burned by).
// BEHAVIOURAL half: the REAL serveMeshUi proves (a) a keystroke arrives as a
// tuple-bound envelope carrying the SOCKET's tuple even when the payload smuggles
// a different one, and (b) an UNCONFIGURED route stays output-only (no echo, no
// crash, stream intact).
//
// Every plant is a HAND-WRITTEN synthesized snippet (never a string-replace on a
// real file) — each asserts it LANDED (`assert.notEqual(planted, clean)`) before
// asserting the detector trips on it and stays quiet on the clean baseline.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket } from "ws";
import { serveMeshUi, meshUiDist } from "../../../src/mesh/ui-serve.mjs";
import { createTerminalMirror } from "../../../src/mesh/terminal-mirror.mjs";
import { buildTerminalFrameEnvelope, TERMINAL_INPUT_KIND } from "../../../src/mesh/terminal-relay-bridge.mjs";
// m46/04 — INVARIANT 4's POLICY HALF is driven BEHAVIOURALLY, over the REAL modules the
// browser imports. A source-grep could only say the words are present; running the real
// policy over the real frozen table says the ANSWER is right, for every pair.
import { SESSION_SOURCES, sessionSourceFor } from "../../../ui/src/terminal/source-table.mjs";
import { inputPolicyFor, mountModelFor, POSTURE_INTERACTIVE, POSTURE_READ_ONLY } from "../../../ui/src/terminal/input-policy.mjs";
import { fleetTerminalMount } from "../../../ui/src/fleet/terminal-mount.mjs";
import { boardDockMount } from "../../../ui/src/board/dock-mount.mjs";
// m49/03 — THE THIRD PRODUCER, and the import is why the amendment and the module are ONE
// story: before this file exists the whole lane throws, and after it exists but before the
// table below is told about it the lane is GREEN AND VACUOUS about the new interactive surface.
// Vacuous is the dangerous one and it is this gate's own recorded history.
import { homeSessionMount } from "../../../ui/src/home/session-mount.mjs";
import { FEED_NO_PRODUCER, FEED_PRODUCER_KNOWN, FEED_ROSTER_GONE } from "../../../ui/src/home/feed-axis.mjs";

import { importSpecifiers } from "../../support/module-family.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const BRIDGE = path.join(repoRoot, "src", "mesh", "terminal-relay-bridge.mjs");
const MIRROR = path.join(repoRoot, "src", "mesh", "terminal-mirror.mjs");
const MESH_UI_SERVE = path.join(repoRoot, "src", "mesh", "ui-serve.mjs");
const WORKER_EXECUTION = path.join(repoRoot, "src", "mesh", "worker-execution.mjs");
// The BROWSER surfaces. `BOARD_TERMINAL_DOCK` is gone: after m46/04 there is no board-local
// terminal component at all, and the ONE control all three surfaces mount lives here. The fleet
// directory is still swept whole — that sweep is invariant 4's surviving third — and m49/03
// adds the home's directory beside it.
const FLEET_UI_DIR = path.join(repoRoot, "ui", "src", "fleet");
const HOME_UI_DIR = path.join(repoRoot, "ui", "src", "home");
const TERMINAL_CONTROL = path.join(repoRoot, "ui", "src", "terminal", "TerminalControl.tsx");
// The DESCRIPTOR MODULE. After ADR-001 the `/ws/terminal-view` literal lives in the frozen
// source table, not in any component — so the clause that used to read the dock's raw source
// for that route is re-aimed HERE. A re-point at the control would fail for a reason that
// looks like a bug and is not.
const SOURCE_TABLE = path.join(repoRoot, "ui", "src", "terminal", "source-table.mjs");
// The FLEET's own call-site module — the home of the four behaviours that had none after the
// deletion, and the file that declares the read-only posture invariant 4 rests on. m49/03 makes
// it one ROW of the surface → posture-home table below rather than the only named author; the
// POSITIVE read of it (that it names `POSTURE_READ_ONLY` by name) is now driven per surface,
// from that table, and still runs against this exact file.
const FLEET_TERMINAL_MOUNT = path.join(repoRoot, "ui", "src", "fleet", "terminal-mount.mjs");
// The worker's own local /ws/terminal (scanned, never modified): its
// bidirectional input direction predates and outlives this feature.
const TERMINAL_WS = path.join(repoRoot, "src", "terminal-ws.mjs");

// LINE COMMENTS FIRST, BLOCK COMMENTS SECOND — the order is load-bearing (TECH_DEBT item 24):
// strip blocks first and a line comment containing `/*` deletes the rest of the file before any
// detector sees it, which on an absence sweep is a silent PASS.
function stripComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

// lf(source) — normalise CRLF -> LF before every regex probe (the repo's tree is
// checked out CRLF; an "\n"-only needle would silently no-op — m38's own
// hard-earned lesson, F1/F4/F6/F7/F8).
function lf(source) {
  return source.replace(/\r\n/g, "\n");
}

async function realSource(file) {
  return lf(stripComments(await readFile(file, "utf8")));
}

function sliceBalanced(source, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex, i + 1);
    }
  }
  return null;
}

// extractUpgradeBlock(source) — the terminal-VIEW's server.on("upgrade", ...)
// handler block, brace-balanced from its opening `{`.
function extractUpgradeBlock(source) {
  const anchor = /server\.on\(\s*["']upgrade["']\s*,\s*\([^)]*\)\s*=>\s*\{/.exec(source);
  if (!anchor) return null;
  const braceOpen = source.indexOf("{", anchor.index);
  return sliceBalanced(source, braceOpen);
}

// extractMessageHandler(upgradeBlock) — the ws.on("message", ...) handler INSIDE
// the terminal-view upgrade block, brace-balanced from the arrow's `{` (the LAST
// character of the anchor match — an indexOf would find a `{}` inside the params).
function extractMessageHandler(upgradeBlock) {
  if (upgradeBlock == null) return null;
  const anchor = /ws\.on\(\s*["']message["']\s*,\s*\([^)]*\)\s*=>\s*\{/.exec(upgradeBlock);
  if (!anchor) return null;
  return sliceBalanced(upgradeBlock, anchor.index + anchor[0].length - 1);
}

// extractFunction(source, name) — a named function's brace-balanced body, sliced
// from the anchor match's OWN closing `{` (a default-parameter `{}` would defeat
// a naive indexOf).
function extractFunction(source, name) {
  const anchor = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`).exec(source);
  if (!anchor) return null;
  return sliceBalanced(source, anchor.index + anchor[0].length - 1);
}

const PTY_WRITE = /\b(?:term|pty)\.write\s*\(/;

// --- detector #1 — the TUPLE-BOUND, CONTENT-BLIND route entry ---
//
// The message handler must EXIST (positive — the feature is real), must build its
// envelope from the SOCKET's own closure tuple via the sanctioned builder, must
// keep the null-push degrade and the size ceiling, and must NEVER parse or
// branch on the message content (content-blind: a smuggled tuple is just bytes)
// nor touch a PTY itself.
function routeEntryProblems({ bridgeSource, mirrorSource, upgradeBlock }) {
  const problems = [];
  if (PTY_WRITE.test(bridgeSource)) problems.push("mesh-terminal-relay-bridge.mjs calls term.write/pty.write — the bridge builds envelopes, it never touches a PTY");
  if (PTY_WRITE.test(mirrorSource)) problems.push("mesh-terminal-mirror.mjs calls term.write/pty.write — the mirror is a projection, it never touches a PTY");
  if (upgradeBlock == null) {
    problems.push("could not locate the terminal-VIEW upgrade block in mesh-ui-serve.mjs");
    return problems;
  }
  const messageHandler = extractMessageHandler(upgradeBlock);
  if (messageHandler == null) {
    problems.push('the terminal-VIEW upgrade block has NO ws.on("message", ...) handler — the interactive input seam is missing (its ABSENCE is the old read-only shape; the operator overrode it)');
    return problems;
  }
  // POSITIVE — tuple-bound: the envelope is built by the sanctioned builder from
  // EXACTLY the closure identifiers the upgrade query resolved.
  if (!/buildTerminalInputEnvelope\(\s*nodeId\s*,\s*sessionId\s*,/.test(messageHandler)) {
    problems.push("the message handler does not build its envelope via buildTerminalInputEnvelope(nodeId, sessionId, ...) — the SOCKET's own tuple must be the ONLY routing source");
  }
  // POSITIVE — clean degrade: no configured push -> output-only route.
  if (!/terminalInputPush\s*==\s*null/.test(messageHandler)) {
    problems.push("the message handler does not guard terminalInputPush == null — an unconfigured relay must degrade the route to output-only, not crash");
  }
  // POSITIVE — bounded: the input ceiling is enforced in the handler.
  if (!/MAX_TERMINAL_INPUT_BYTES/.test(messageHandler)) {
    problems.push("the message handler does not enforce MAX_TERMINAL_INPUT_BYTES — the input lane must be bounded");
  }
  // NEGATIVE — content-blind: no parse, no branch on message content. A JSON.parse
  // here is the exact shape a smuggled {nodeId, sessionId} would enter through.
  if (/JSON\.parse/.test(messageHandler)) {
    problems.push("the message handler JSON.parses the browser message — the input lane must be CONTENT-BLIND (a smuggled tuple in the payload must stay opaque bytes)");
  }
  if (/data\s*\.\s*(?:nodeId|sessionId)|\bparsed\b/.test(messageHandler)) {
    problems.push("the message handler reads routing facts off the message content — the socket's own tuple is the ONLY routing source");
  }
  // NEGATIVE — the route never touches a PTY itself.
  if (PTY_WRITE.test(messageHandler) || PTY_WRITE.test(upgradeBlock)) {
    problems.push("the terminal-VIEW route calls term.write/pty.write directly — delivery belongs to the worker's session-exact registry, never the fleet face");
  }
  return problems;
}

// --- detector #2 — SESSION-EXACT delivery at the worker ---
//
// The worker's input handler resolves its write EXCLUSIVELY through the
// liveSessionInputs registry by the frame's own sessionId: no direct PTY write,
// no iteration/fallback that could redirect input to "some other" live session.
function workerDeliveryProblems(handlerSource) {
  const problems = [];
  if (handlerSource == null) {
    problems.push("createMeshWorkerTerminalInputHandler is missing from mesh-worker-execution.mjs — the worker has no constrained input seam");
    return problems;
  }
  if (!/liveSessionInputs\.get\(\s*sessionId\s*\)/.test(handlerSource)) {
    problems.push("the worker input handler does not resolve its write via liveSessionInputs.get(sessionId) — session-exact delivery is the invariant");
  }
  if (PTY_WRITE.test(handlerSource)) {
    problems.push("the worker input handler calls term.write/pty.write directly — the registry-resolved write is the ONLY sanctioned delivery");
  }
  if (/liveSessionInputs\s*\.\s*(?:values|entries|keys)\s*\(|for\s*\(\s*const\b[^)]*of\s+liveSessionInputs/.test(handlerSource)) {
    problems.push("the worker input handler iterates liveSessionInputs — a 'first/any live PTY' fallback is a cross-session injection, exactly what session-exact delivery forbids");
  }
  if (/livePtyKills|livePtyWrites\s*\.\s*get/.test(handlerSource)) {
    problems.push("the worker input handler resolves by assignment registries — the frame's join key is the SESSION id, never an assignment guess");
  }
  return problems;
}

// --- detector #3 — the mirror/bridge stay PURE (unchanged from the predecessor) ---

const DURABLE_WRITE = /\b(?:writeText|writeFile|writeFileSync|appendFile|appendFileSync|outputFile)\s*\(/;

function importsWriteSeam(specs) {
  return specs.some(
    (s) =>
      /^node:fs(\/promises)?$/.test(s) ||
      /(^|\/)fs\.mjs$/.test(s) ||
      /(^|\/)mesh-presence\.mjs$/.test(s) ||
      /(^|\/)mesh-store\.mjs$/.test(s),
  );
}

function durabilityProblems({ bridgeSource, mirrorSource }) {
  const problems = [];
  for (const [label, source] of [["mesh/terminal-relay-bridge.mjs", bridgeSource], ["mesh/terminal-mirror.mjs", mirrorSource]]) {
    if (DURABLE_WRITE.test(source)) problems.push(`${label} calls a durable write (writeText/writeFile/appendFile/...) — the mirror/bridge must stay in-memory only`);
    const specs = importSpecifiers(source).map((entry) => entry.specifier);
    if (importsWriteSeam(specs)) problems.push(`${label} imports a write/persist seam (node:fs / node:fs/promises / fs.mjs / mesh-presence.mjs / mesh-store.mjs): ${specs.join(", ")}`);
    if (/\bpublishPresenceRecord\b/.test(source)) problems.push(`${label} references publishPresenceRecord — the durable git-write function`);
    if (/\bpresenceRecordPath\b/.test(source)) problems.push(`${label} references presenceRecordPath — the git-tracked write target`);
  }
  return problems;
}

// --- detector #4 — INVARIANT 4, RE-EXPRESSED (m46/04, ADR-006): the FLEET PAGE stays a
// MONITOR. The interactive surface is the ONE control mounted by the BOARD DOCK;
// `ui/src/fleet/**` wires no input source and sends on no socket ---
//
// THE SWEEP BELOW IS ONE OF THREE, and on its own it is no longer sufficient. The control
// moved to `ui/src/terminal/` and genuinely wires `onData` there for the board's interactive
// mount, so a directory sweep of `ui/src/fleet/**` would stay green while saying nothing about
// whether the FLEET can type. It is kept because it is still non-vacuous and still proves that
// no fleet-LOCAL module grows its own input path; the call-site clause and the exhaustively
// driven policy are what carry the property now.

const SOCKET_NAMED = /\bWebSocket\b/;
const ANY_SEND_CALL = /\.\s*send\s*\(/;
const TERMINAL_INPUT_SOURCE = /\.\s*(?:onData|onKey|onBinary)\s*\(|\battachCustomKeyEventHandler\s*\(/;

// The fleet has no path to `interactive`, and this is what that means as a needle. A fleet file
// that named the interactive posture, or declared `readOnly: false`, or offered a posture as a
// PROP or a parameter, would have re-opened the question this milestone is required to keep shut
// until m49.
const INTERACTIVE_DECLARATION = /\bPOSTURE_INTERACTIVE\b|["']interactive["']|\breadOnly\s*:\s*false\b|\bMOUNT_INTERACTIVE\b/;

// THE POSTURE IS WRITTEN IN EXACTLY ONE FLEET FILE, and this is the clause that says so.
//
// A needle for the WORD `interactive` is one indirection away from the value, and a structural
// review found the natural spelling that walks past it:
//
//     mount={{ ...fleetTerminalMount(assignment, { itemRef }), posture: { readOnly: !!0 } }}
//
// Nothing in that line says `interactive`, so the word sweep stays quiet — and measured through
// the real modules the card becomes `inputEnabled: true`, `disableStdin: false`, a registered
// `onData` sink, a blinking cursor and NO `read-only` label. Both remaining posture signals gone,
// CI silent. `posture: { readOnly: !typing }`, `posture: Boolean(0)` and `posture: peekPosture`
// are the same shape, and they are the spellings m49's own feature will reach for.
//
// So the rule is about WHO MAY WRITE THE FIELD, not about which word they write: `posture:` is a
// key only `terminal-mount.mjs` may author anywhere under `ui/src/fleet/**`. It is deliberately
// the same shape as the sibling gate's descriptor-field ratchet, for the same reason — a value
// that decides a permission may have exactly one author.
const POSTURE_KEY_WRITE = /(^|[\s{,(])posture\s*:/m;
const FLEET_POSTURE_HOME = "ui/src/fleet/terminal-mount.mjs";

function browserSocketSend(source) {
  return SOCKET_NAMED.test(source) && ANY_SEND_CALL.test(source);
}

// listSourceFiles(dir) — every .ts/.tsx/.mjs file under a UI directory, recursively.
async function listSourceFiles(dir) {
  const found = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await listSourceFiles(full)));
    else if (/\.(?:tsx?|mjs)$/.test(entry.name) && !entry.name.endsWith(".d.mts")) found.push(full);
  }
  return found;
}

// ══ m49/03 — THE SURFACE → POSTURE-HOME TABLE (ADR-008's part 1, generalised) ═══════════════
//
// THREE surfaces, three modules, three JSX mount sites. The table is DATA rather than three
// copies of one clause, because the property is the same on all three and a fourth surface
// should cost one row: *a value that decides a permission has exactly one author, and a posture
// may not be assembled at a render site.*
//
// `files` is each directory's own NON-VACUITY floor, measured 2026-08-13 through this sweep's
// OWN filter (which takes `.ts`/`.tsx`/`.mjs` and EXCLUDES `.d.mts`): the fleet holds 14 of its
// 20 entries, the board 16, the home 7. The floors are set well below those so ordinary growth
// does not touch them — they exist to catch a sweep that read NOTHING, which is
// indistinguishable from a clean surface unless the sweep says how much it saw.
export const POSTURE_HOMES = Object.freeze([
  Object.freeze({
    surface: "the fleet page (the monitor)",
    dir: "ui/src/fleet",
    // THE m46 CONSTANT, PRESERVED AND RE-HOMED rather than re-typed: the fleet's single author
    // is the same fact it always was, now stated as one row of a table instead of as one clause.
    postureHome: FLEET_POSTURE_HOME,
    declares: "POSTURE_READ_ONLY",
    bareCall: /^fleetTerminalMount\(/,
    call: "fleetTerminalMount(",
    files: 5,
  }),
  Object.freeze({
    surface: "the board dock",
    dir: "ui/src/board",
    postureHome: "ui/src/board/dock-mount.mjs",
    declares: "POSTURE_INTERACTIVE",
    bareCall: /^boardDockMount\(/,
    call: "boardDockMount(",
    files: 5,
  }),
  Object.freeze({
    surface: "the terminals home",
    dir: "ui/src/home",
    postureHome: "ui/src/home/session-mount.mjs",
    declares: "POSTURE_INTERACTIVE",
    bareCall: /^homeSessionMount\(/,
    call: "homeSessionMount(",
    files: 2,
  }),
]);

// The JSX extractor, hoisted to one constant so the real-tree clause and every plant are driven
// through the SAME needle. It is deliberately narrow — `<TerminalControl` … `mount={…}` within
// 400 characters, with the prop CLOSING ITS OWN LINE — and its narrowness is precisely why the
// floor below must be per-surface: a mount site it cannot see yields ZERO matches, which reads
// exactly like a surface that has none.
//
// ═══ THE CAPTURE IS BOUNDED TO ONE LINE, AND THAT IS A CORRECTION (49/03, architect's review) ══
// It was `([\s\S]*?)`, inherited from the clause this generalises, and generalised across a
// directory sweep that made it unsafe: `[\s\S]*?` runs to the next `}`-at-line-end ANYWHERE IN
// THE FILE, so a file holding a COMPLIANT single-line site followed by a SECOND, non-compliant
// one produced exactly ONE match — the compliant capture — with the second site living inside
// that match's own span, and `matchAll` then resuming PAST it. Measured against these shipped
// detectors: `mount={{ ...homeSessionMount(row), readOnly: false }}` in the second site returned
// ZERO offenders from both `mountSiteOffenders` and `postureAuthorOffenders`, while yielding
// `inputEnabled: true` through the real policy — the exact m46 spelling this clause exists to
// catch, on the surface that can type.
//
// `[^\n]*` cannot span, and a mount prop that is not on one line is not a prop this extractor
// was ever able to read. Verified against the real tree: it finds all three sites exactly —
// `fleetTerminalMount(assignment, { itemRef: m.item.ref })`, `boardDockMount(dockSession)`,
// `homeSessionMount(row, { axis })`.
//
// IT GOT PAST THE FIRST REVIEW BECAUSE THE PLANT WAS NOT SHAPED LIKE THE TREE — an isolated
// one-line snippet with no trailing `}`-at-line-end, where the same spelling that hides in a real
// file simply produced no match. A plant not shaped like the tree proves the detector, not the
// property; the plants below are whole files now.
const MOUNT_PROP = /<\s*TerminalControl[\s\S]{0,400}?mount=\{([^\n]*)\}\s*\n/g;

// …and the extractor's REACH is asserted rather than trusted (same review): every
// `<TerminalControl` a surface file holds must yield a mount prop this extractor can READ. A site
// spelled so the extractor cannot see it — another prop after `mount=` on the same line, or a
// prop broken across lines — is now a reported DEFECT IN REACH instead of a silent zero, which is
// the same argument the per-surface floor makes, one level finer: per FILE rather than per
// directory. Green on the delivered tree, where each of the three surfaces mounts the control
// exactly once.
const CONTROL_MOUNT = /<\s*TerminalControl\b/g;

// Every detector below takes a LISTING — `[{ path, source }]` — so a plant is synthesized text
// and never a file written into `ui/src/**`, which would race every other suite reading that
// tree and would survive a crashed run. It strips comments itself (idempotent on already-clean
// input, LINE-FIRST per TECH_DEBT 24) so no plant can arrive un-stripped by accident.
function cleaned(file) {
  return lf(stripComments(String(file?.source ?? "")));
}

function surfaceOf(relative, table) {
  return (table ?? []).find((entry) => typeof relative === "string" && relative.startsWith(`${entry.dir}/`)) ?? null;
}

// ── PART 1, CLAUSE A — THE POSTURE HAS ONE AUTHOR PER SURFACE ──────────────────────────────
// Posture-VALUE-blind by design: it constrains WHO writes the key, never WHICH word they write.
// That is what lets it cover all three surfaces where the absence sweep below cannot, and it is
// why a file OUTSIDE the three surface directories is skipped rather than reported —
// `ui/src/terminal/**` defines the vocabulary, transforms state within it and reads it through.
export function postureAuthorOffenders(files, table = POSTURE_HOMES) {
  const offenders = [];
  const listing = Array.isArray(files) ? files : [];
  for (const file of listing) {
    const surface = surfaceOf(file?.path, table);
    if (surface == null) continue;
    if (file.path === surface.postureHome) continue;
    if (!POSTURE_KEY_WRITE.test(cleaned(file))) continue;
    offenders.push(
      `${file.path} WRITES a \`posture:\` key — ${surface.surface}'s posture has exactly one author (${surface.postureHome}), because a value that decides whether an operator can type into another machine may not be assembled at a render site`,
    );
  }
  // BOTH DIRECTIONS, and this half is what stops the table rotting into a permission slip: a
  // named author that is not on disk guards a number about nothing, and a surface the sweep
  // could not read is not a clean surface.
  for (const entry of table ?? []) {
    const swept = listing.filter((file) => surfaceOf(file?.path, table) === entry);
    if (swept.length < entry.files) {
      offenders.push(
        `${entry.dir}/ was swept and yielded ${swept.length} source files, under its floor of ${entry.files}. An absence sweep over a directory it could not read reports nothing for the same reason a clean one does.`,
      );
    }
    if (!listing.some((file) => file?.path === entry.postureHome)) {
      offenders.push(
        `${entry.postureHome} is named in this gate's surface → posture-home table and was NOT found in the sweep. If it moved, RE-AIM the table: a clause naming an author that does not exist is the strongest-looking green in this file.`,
      );
    }
  }
  return offenders;
}

// ── PART 1, CLAUSE B — THE FLEET NAMES NO INTERACTIVE POSTURE AT ALL ───────────────────────
// SCOPED TO `ui/src/fleet/**` AND TO NOTHING ELSE, deliberately (see the m49 note in the header).
// Generalising this needle is not a strengthening; it makes the amendment unsatisfiable.
export function fleetInteractivePostureOffenders(files) {
  const offenders = [];
  for (const file of Array.isArray(files) ? files : []) {
    if (!String(file?.path ?? "").startsWith("ui/src/fleet/")) continue;
    if (!INTERACTIVE_DECLARATION.test(cleaned(file))) continue;
    offenders.push(
      `${file.path} names the INTERACTIVE posture — the fleet page stays a MONITOR. m49 makes the fleet ORIGIN interactive at ui/src/home/, not the fleet card, and reversing the card's posture is a decision no story in this milestone took.`,
    );
  }
  return offenders;
}

// ── PART 1, CLAUSE C — EVERY MOUNT SITE HANDS ITS OWN MODULE'S RETURN VALUE, BARE ──────────
// PER-SURFACE FLOORS PLUS DISCOVERY-BY-SWEEP (ADR-008 amendment (A)). A surface directory where
// no mount site is found FAILS this clause; it never passes it. That is the whole lesson of this
// gate's own history applied to its newest clause — a detector that reports nothing because it
// looked nowhere reads exactly like a detector that reports nothing because the code is clean.
export function mountSiteOffenders(files, table = POSTURE_HOMES) {
  const offenders = [];
  const listing = Array.isArray(files) ? files : [];
  for (const entry of table ?? []) {
    let found = 0;
    for (const file of listing) {
      if (surfaceOf(file?.path, table) !== entry) continue;
      const source = cleaned(file);
      const props = [...source.matchAll(MOUNT_PROP)];
      // REACH, PER FILE. A `<TerminalControl` this extractor cannot read a mount prop for is a
      // site checked by nothing — and with two sites in one file it is the SECOND one that
      // disappears, which is the shape a review does not see.
      const mounts = [...source.matchAll(CONTROL_MOUNT)].length;
      if (mounts > props.length) {
        offenders.push(
          `${file.path} mounts the control ${mounts} time(s) but this clause could read only ${props.length} \`mount={…}\` prop(s) from it. A site the extractor cannot see is a site checked by NOTHING while CI reads green — put the prop on its own line (\`mount={${entry.call}…)}\`), and never delete this check to make the file pass.`,
        );
      }
      for (const match of props) {
        found += 1;
        const prop = match[1].trim();
        if (!entry.bareCall.test(prop)) {
          offenders.push(
            `${file.path} hands the control a \`mount\` prop that is not a bare \`${entry.call}\` call — got \`${prop}\`. A spread (\`{ ...${entry.call}…), posture: … }\`) is a SECOND author for a value that decides whether an operator can type into another machine, and it is invisible to a word sweep.`,
          );
          continue;
        }
        if (/\.\.\./.test(prop)) {
          offenders.push(`${file.path} spreads its mount prop — \`${prop}\``);
        }
      }
    }
    if (found === 0) {
      offenders.push(
        `NO \`<TerminalControl … mount={…}>\` site was found anywhere under ${entry.dir}/ — ${entry.surface}. ZERO mount sites in a surface directory is a defect in THIS CLAUSE'S REACH, never evidence of a compliant surface: the extractor requires the prop to close its own line, so a site with another prop after \`mount=\` on the same line yields no matches and this clause would otherwise read green about the surface it stopped checking. Re-aim the extractor or fix the site — do not delete the floor.`,
      );
    }
  }
  return offenders;
}

// ── PART 3 — NO SURFACE DIRECTORY GROWS AN INPUT PATH OR A SOCKET OF ITS OWN ───────────────
// One detector, two directories (`ui/src/fleet/**` since m42, `ui/src/home/**` since m49). The
// home is interactive THROUGH THE ONE CONTROL and only through it; a home module that grew a
// private socket would be a second input seam beside the tuple-bound one, which is invariant 1's
// whole subject.
export function inputSourceOffenders(files) {
  const offenders = [];
  for (const file of Array.isArray(files) ? files : []) {
    const clean = cleaned(file);
    if (TERMINAL_INPUT_SOURCE.test(clean)) {
      offenders.push(`${file.path} wires a terminal input source (onData/onKey/onBinary/attachCustomKeyEventHandler)`);
    }
    if (browserSocketSend(clean)) offenders.push(`${file.path} sends on a socket — this surface originates no frame`);
  }
  return offenders;
}

// readSurfaceListing(dir) — the ONE place these detectors touch the filesystem, returning the
// `{ path, source }` listing they take. It FAILS LOUDLY, by name, when a swept directory is not
// there: an empty listing from a walk that never walked is indistinguishable from a clean tree.
async function readSurfaceListing(dir) {
  let files;
  try {
    files = await listSourceFiles(dir);
  } catch (error) {
    throw new Error(
      `invariant 4 could not read the surface directory \`${path.relative(repoRoot, dir).split(path.sep).join("/")}\` (${error?.code ?? error?.message}). A sweep that cannot see its subject must FAIL: passing over a directory that is not there is the exact green-and-vacuous shape this gate's own amendments exist to prevent.`,
    );
  }
  const listing = [];
  for (const file of files) {
    listing.push({
      path: path.relative(repoRoot, file).split(path.sep).join("/"),
      source: await realSource(file),
    });
  }
  return listing;
}

async function readAllSurfaceListings(table = POSTURE_HOMES) {
  const listing = [];
  for (const entry of table ?? []) listing.push(...(await readSurfaceListing(path.join(repoRoot, ...entry.dir.split("/")))));
  return listing;
}

export const archTests = [
  // ══ invariant #1 — the tuple-bound, content-blind, bounded route entry ══
  {
    name: "arch/42 terminal-input: the terminal-VIEW route's input seam EXISTS and is tuple-bound (socket's own nodeId/sessionId), content-blind (no JSON.parse/branch), bounded, and clean-degrading",
    async run() {
      const bridgeSource = await realSource(BRIDGE);
      const mirrorSource = await realSource(MIRROR);
      const uiSource = await realSource(MESH_UI_SERVE);
      const upgradeBlock = extractUpgradeBlock(uiSource);
      assert.ok(upgradeBlock != null, "the terminal-VIEW upgrade block is found in the real mesh-ui-serve.mjs source");
      assert.deepEqual(
        routeEntryProblems({ bridgeSource, mirrorSource, upgradeBlock }),
        [],
        "the real route entry is tuple-bound, content-blind, bounded, clean-degrading, and touches no PTY",
      );

      // A clean SYNTHESIZED baseline carrying every sanctioned marker — plants
      // below are hand-written mutations of THIS shape.
      const clean = stripComments(`
        server.on("upgrade", (request, socket, head) => {
          terminalViewWss.handleUpgrade(request, socket, head, (ws) => {
            const unsubscribe = mirror.subscribe(nodeId, sessionId, (bytes) => { ws.send(bytes); });
            ws.on("close", unsubscribe);
            ws.on("message", (data) => {
              if (terminalInputPush == null) return;
              const bytes = String(data);
              if (Buffer.byteLength(bytes) > MAX_TERMINAL_INPUT_BYTES) return;
              terminalInputPush.push(buildTerminalInputEnvelope(nodeId, sessionId, bytes));
            });
          });
        });
      `);
      assert.deepEqual(
        routeEntryProblems({ bridgeSource: "", mirrorSource: "", upgradeBlock: extractUpgradeBlock(clean) }),
        [],
        "the clean synthesized route shape stays quiet",
      );

      // PLANT — the OLD read-only shape (no message handler at all): the feature
      // regressing to absence must now FAIL CI (the positive half).
      const plantedAbsent = stripComments(`
        server.on("upgrade", (request, socket, head) => {
          terminalViewWss.handleUpgrade(request, socket, head, (ws) => {
            const unsubscribe = mirror.subscribe(nodeId, sessionId, (bytes) => { ws.send(bytes); });
            ws.on("close", unsubscribe);
          });
        });
      `);
      assert.notEqual(plantedAbsent, clean, "the plant actually differs from the clean synthesized shape");
      assert.ok(
        routeEntryProblems({ bridgeSource: "", mirrorSource: "", upgradeBlock: extractUpgradeBlock(plantedAbsent) }).length > 0,
        "self-check: the input seam's ABSENCE trips — the gate pins the constrained shape, not the old read-only one",
      );

      // PLANT — a content-routed handler: JSON.parse the payload and route by ITS
      // tuple. The exact cross-session injection the tuple-binding forbids.
      const plantedContentRouted = clean.replace(
        "terminalInputPush.push(buildTerminalInputEnvelope(nodeId, sessionId, bytes));",
        "const parsed = JSON.parse(bytes); terminalInputPush.push(buildTerminalInputEnvelope(parsed.nodeId, parsed.sessionId, parsed.bytes));",
      );
      assert.notEqual(plantedContentRouted, clean, "the plant actually differs from the clean synthesized shape");
      assert.ok(
        routeEntryProblems({ bridgeSource: "", mirrorSource: "", upgradeBlock: extractUpgradeBlock(plantedContentRouted) }).length > 0,
        "self-check: a JSON.parse/content-routed handler trips — the socket's own tuple is the ONLY routing source",
      );

      // PLANT — the size ceiling removed.
      const plantedUnbounded = clean.replace(/\s*if \(Buffer\.byteLength\(bytes\) > MAX_TERMINAL_INPUT_BYTES\) return;/, "");
      assert.notEqual(plantedUnbounded, clean, "the plant actually differs from the clean synthesized shape");
      assert.ok(
        routeEntryProblems({ bridgeSource: "", mirrorSource: "", upgradeBlock: extractUpgradeBlock(plantedUnbounded) }).length > 0,
        "self-check: dropping the MAX_TERMINAL_INPUT_BYTES ceiling trips",
      );

      // PLANT — the null-push degrade removed.
      const plantedNoDegrade = clean.replace(/\s*if \(terminalInputPush == null\) return;/, "");
      assert.notEqual(plantedNoDegrade, clean, "the plant actually differs from the clean synthesized shape");
      assert.ok(
        routeEntryProblems({ bridgeSource: "", mirrorSource: "", upgradeBlock: extractUpgradeBlock(plantedNoDegrade) }).length > 0,
        "self-check: dropping the terminalInputPush == null degrade trips",
      );

      // PLANT — a direct PTY write in the route.
      const plantedDirectWrite = clean.replace(
        "terminalInputPush.push(buildTerminalInputEnvelope(nodeId, sessionId, bytes));",
        "term.write(bytes);",
      );
      assert.notEqual(plantedDirectWrite, clean, "the plant actually differs from the clean synthesized shape");
      assert.ok(
        routeEntryProblems({ bridgeSource: "", mirrorSource: "", upgradeBlock: extractUpgradeBlock(plantedDirectWrite) }).length > 0,
        "self-check: a direct term.write in the route trips — delivery belongs to the worker's registry",
      );
    },
  },

  // ══ invariant #2 — session-exact delivery at the worker ══
  {
    name: "arch/42 terminal-input: the worker's input handler delivers EXCLUSIVELY via liveSessionInputs.get(sessionId) — no direct PTY write, no first-live-PTY fallback, no assignment-keyed guess",
    async run() {
      const workerSource = await realSource(WORKER_EXECUTION);
      const handler = extractFunction(workerSource, "createMeshWorkerTerminalInputHandler");
      assert.deepEqual(workerDeliveryProblems(handler), [], "the real worker input handler is session-exact");

      const clean = stripComments(`
        function createMeshWorkerTerminalInputHandler(options = {}) {
          return function handleTerminalInput(frame) {
            const sessionId = typeof frame?.sessionId === "string" ? frame.sessionId : null;
            const bytes = typeof frame?.bytes === "string" ? frame.bytes : null;
            if (sessionId == null || bytes == null) return;
            const write = liveSessionInputs.get(sessionId);
            if (write == null) return;
            write(bytes);
          };
        }
      `);
      assert.deepEqual(workerDeliveryProblems(extractFunction(clean, "createMeshWorkerTerminalInputHandler")), [], "the clean synthesized handler stays quiet");

      // PLANT — the "any live PTY" fallback: an unmatched session falls through to
      // the first registered write. THE cross-session injection.
      const plantedFallback = clean.replace(
        "if (write == null) return;",
        "const fallback = liveSessionInputs.values().next().value; if (write == null && fallback == null) return;",
      );
      assert.notEqual(plantedFallback, clean, "the plant actually differs from the clean synthesized shape");
      assert.ok(
        workerDeliveryProblems(extractFunction(plantedFallback, "createMeshWorkerTerminalInputHandler")).length > 0,
        "self-check: a first-live-PTY fallback trips — an unmatched session is a DROP, never a redirect",
      );

      // PLANT — a direct term.write beside the registry.
      const plantedDirect = clean.replace("write(bytes);", "term.write(bytes);");
      assert.notEqual(plantedDirect, clean, "the plant actually differs from the clean synthesized shape");
      assert.ok(
        workerDeliveryProblems(extractFunction(plantedDirect, "createMeshWorkerTerminalInputHandler")).length > 0,
        "self-check: a direct term.write in the handler trips",
      );

      // PLANT — assignment-keyed delivery (livePtyWrites.get by a guessed id).
      const plantedAssignmentKeyed = clean.replace(
        "const write = liveSessionInputs.get(sessionId);",
        "const write = livePtyWrites.get(frame.assignmentId) ?? liveSessionInputs.get(sessionId);",
      );
      assert.notEqual(plantedAssignmentKeyed, clean, "the plant actually differs from the clean synthesized shape");
      assert.ok(
        workerDeliveryProblems(extractFunction(plantedAssignmentKeyed, "createMeshWorkerTerminalInputHandler")).length > 0,
        "self-check: assignment-keyed resolution trips — the session id is the ONLY join key",
      );

      // …and the registry lifecycle is real: the bracket clears every per-PTY
      // registry at settle (input can never outlive its bracket), and the session
      // binding is created at session-id capture.
      assert.ok(
        /function\s+clearLivePtyRegistries\s*\(/.test(workerSource),
        "clearLivePtyRegistries exists — the one settle-side sweep for kill + write + session binding",
      );
      assert.ok(
        /clearLivePtyRegistries\(\s*assignmentId\s*\)/.test(workerSource),
        "the bracket calls clearLivePtyRegistries(assignmentId) at settle",
      );
      assert.ok(
        /liveSessionInputs\.set\(\s*sessionId\s*,/.test(workerSource),
        "the session binding is created at session-id capture (liveSessionInputs.set(sessionId, ...))",
      );
    },
  },

  // ══ invariant #3 — the bridge + mirror stay in-memory / never a record ══
  {
    name: "arch/42 terminal-input (ADR-014 inv.3 unchanged): the bridge + mirror write NO durable record — no writeText/writeFile, no write/persist-seam import, no presenceRecordPath/publishPresenceRecord reference",
    async run() {
      const bridgeSource = await realSource(BRIDGE);
      const mirrorSource = await realSource(MIRROR);
      assert.deepEqual(durabilityProblems({ bridgeSource, mirrorSource }), [], "the real bridge + mirror modules are durable-write-free");

      const clean = 'export function createTerminalMirror() { const listenersByKey = new Map(); return { apply(envelope) { return true; } }; }';
      const plantedDurableWrite = 'import { writeText } from "./fs.mjs";\nexport function createTerminalMirror() { return { apply(envelope) { writeText("./transcript.log", envelope.signal.bytes); return true; } }; }';
      assert.notEqual(plantedDurableWrite, clean, "the plant actually differs from the clean synthesized shape");
      assert.deepEqual(durabilityProblems({ bridgeSource: clean, mirrorSource: clean }), [], "the clean synthesized shape stays quiet");
      assert.ok(
        durabilityProblems({ bridgeSource: clean, mirrorSource: plantedDurableWrite }).length > 0,
        "self-check: a planted durable write (writeText) of streamed bytes trips the detector",
      );

      const plantedPersistImport = 'import { presenceRecordPath } from "./mesh/store.mjs";\nexport function createTerminalMirror() { return { apply(envelope) { return true; } }; }';
      assert.notEqual(plantedPersistImport, clean, "the plant actually differs from the clean synthesized shape");
      assert.ok(
        durabilityProblems({ bridgeSource: clean, mirrorSource: plantedPersistImport }).length > 0,
        "self-check: a planted mesh-store.mjs / presenceRecordPath import trips the detector",
      );
    },
  },

  // ══ invariant #4 · PART 1 — THE CALL SITE, AMENDED BY m49/03 TO A SURFACE → POSTURE-HOME
  //    TABLE. Three surfaces, three modules, three JSX mount sites, each with its OWN floor.
  //    Asserted three ways on purpose: structurally over each surface directory (nobody but the
  //    named module writes the key), textually at the render sites (the prop is a bare call), and
  //    BEHAVIOURALLY by running the REAL policy over the REAL mounts all three modules compute.
  //    The structural half catches a posture arriving as a prop or a parameter; the behavioural
  //    half catches a declaration that is spelled right and ANSWERS wrong. ══
  {
    name: "arch/46+49 terminal-input (invariant 4, part 1 — the call site): the posture has ONE author per surface across all THREE surface directories, the fleet still names no interactive posture, every mount site hands its own module's return value bare with a PER-SURFACE floor, and the REAL mounts answer three ways",
    async run() {
      const listing = await readAllSurfaceListings();

      // CLAUSE A — one author per surface, over all three directories at once.
      assert.deepEqual(
        postureAuthorOffenders(listing),
        [],
        "no value any surface holds — no assignment field, no roster fact, no query parameter, no operator action — may assemble the posture at a render site. Each surface has exactly ONE module that may write the key, and `ui/src/terminal/**` is not swept because the core DEFINES the vocabulary rather than authoring a permission.",
      );

      // CLAUSE B — and the FLEET still names no interactive posture at all. Scope unchanged.
      assert.deepEqual(
        fleetInteractivePostureOffenders(listing),
        [],
        "the fleet page stays a MONITOR: nothing under ui/src/fleet/ names POSTURE_INTERACTIVE, the quoted word, `readOnly: false` or MOUNT_INTERACTIVE. m49 makes the fleet ORIGIN interactive at ui/src/home/; it does not reverse the card.",
      );
      // …and the other two surfaces are NOT swept by that needle, which is what makes the
      // amendment satisfiable at all: both of them MUST name the interactive posture.
      for (const dir of ["ui/src/board/", "ui/src/home/"]) {
        const named = listing.filter((file) => file.path.startsWith(dir) && INTERACTIVE_DECLARATION.test(file.source));
        assert.ok(
          named.length >= 1,
          `${dir} names the interactive posture (found ${named.length}) — that declaration IS the product on these two surfaces, and a clause that forbade it would forbid the milestone`,
        );
        assert.deepEqual(
          fleetInteractivePostureOffenders(named),
          [],
          `…and the fleet-scoped needle reports NONE of them: ${named.map((file) => file.path).join(", ")}`,
        );
      }

      // CLAUSE C — every mount site is a bare call, PER SURFACE, with its own floor of one.
      assert.deepEqual(
        mountSiteOffenders(listing),
        [],
        "each of the three surfaces mounts the ONE control and hands it its own module's return value, unwrapped — and each carries its OWN floor, because a concatenated whole-clause floor is satisfied by Fleet alone while the new interactive surface is policed by nothing.",
      );

      // POSITIVE, and non-vacuous: each surface genuinely DECLARES its posture by name. An
      // absence sweep alone would be satisfied by a surface that declared no posture at all,
      // which fails closed at the policy but says nothing about intent.
      for (const entry of POSTURE_HOMES) {
        const module = listing.find((file) => file.path === entry.postureHome);
        assert.ok(module != null, `${entry.postureHome} is on disk and was swept`);
        assert.ok(
          new RegExp(`\\b${entry.declares}\\b`).test(module.source),
          `${entry.postureHome} declares ${entry.declares} by name, imported from the shared policy`,
        );
      }
      // …and the fleet's row still points at the module m46 named, by its own anchor rather than
      // by a re-typed path: the generalisation moved the clause into a table, not off its subject.
      assert.equal(
        path.join(repoRoot, ...POSTURE_HOMES[0].postureHome.split("/")),
        FLEET_TERMINAL_MOUNT,
        "the fleet's posture-home row IS ui/src/fleet/terminal-mount.mjs, the file m46's clause named",
      );

      // BEHAVIOURAL — the REAL mount the fleet computes for a REAL resolved assignment, run
      // through the REAL policy. This is the clause a source-grep cannot write, and it is not
      // decoration: a plant that reads the posture OFF THE ASSIGNMENT ROW
      // (`mountPosture(assignment?.posture ?? POSTURE_READ_ONLY)`) names no `interactive` literal
      // anywhere and sails past the sweep above. So the mount is driven with every shape a fleet
      // row could carry, INCLUDING the ones that would flip it.
      for (const adversarial of [
        { targetNodeId: "node-a", sessionId: "sess-1", state: "running", posture: "interactive" },
        { targetNodeId: "node-a", sessionId: "sess-1", state: "running", readOnly: false },
        { targetNodeId: "node-a", sessionId: "sess-1", state: "done", posture: POSTURE_INTERACTIVE },
      ]) {
        const flipped = fleetTerminalMount(adversarial, { itemRef: "46/04" });
        assert.equal(flipped.posture, POSTURE_READ_ONLY, `no value the row carries turns the posture: ${JSON.stringify(adversarial)}`);
        assert.equal(inputPolicyFor(flipped.source, flipped.posture).inputEnabled, false, "…and no input path opens");
      }

      const mount = fleetTerminalMount(
        { targetNodeId: "node-a", sessionId: "sess-1", state: "running" },
        { itemRef: "46/04" },
      );
      assert.equal(mount.rendersPanel, true, "precondition: a resolved tuple with a nameable owner DOES render a panel");
      assert.equal(mount.posture, POSTURE_READ_ONLY, "the fleet's own mount declares read-only");
      const fleetPolicy = inputPolicyFor(mount.source, mount.posture);
      assert.equal(fleetPolicy.inputEnabled, false, "…and the real policy over the real mount yields NO input path");
      assert.equal(fleetPolicy.disableStdin, true, "…with stdin disabled IN FACT");
      const fleetModel = mountModelFor({ source: mount.source, mount: mount.posture });
      assert.deepEqual([...fleetModel.keystrokeSinks], [], "…no keystroke sink is registered at all — absent, not registered-and-ignored");
      assert.equal(fleetModel.sendPath, null, "…and no send path is named, so there is nothing for a later refactor to re-enable by deleting a guard");
      assert.equal(fleetModel.readOnlyLabel, "read-only", "…and the posture travels as a mandatory LABEL, which under one control is one of only TWO signals left");
      assert.equal(fleetModel.cursor.blink, false, "…the other being the non-blinking cursor");

      // THE CONTRAST, so the clause proves a DIFFERENCE rather than a constant: the board mounts
      // the SAME `mirror` source and CAN type. If both answered the same way, this gate would be
      // green for a control that simply never types.
      const boardMirror = boardDockMount({ kind: "mirror", ref: "46/04", nodeId: "node-a", sessionId: "sess-1" });
      assert.equal(boardMirror.posture, POSTURE_INTERACTIVE, "the board mounts the same source interactively (m42's operator override)");
      assert.equal(inputPolicyFor(boardMirror.source, boardMirror.posture).inputEnabled, true, "…and CAN type into it — one source, two postures, which is the whole reason posture is not a property of the source");
      assert.equal(boardMirror.source.kind, mount.source.kind, "…and it is genuinely the SAME source row, not a look-alike");

      // ── m49/03 — THE HOME'S REAL MOUNT, DRIVEN IN BOTH DIRECTIONS ────────────────────────
      // The same adversarial shapes the fleet's mount is driven with, aimed at the surface that
      // CAN type. A plant that read the posture OFF THE ROW names no `interactive` literal
      // anywhere and sails past every word sweep in this file; this is the clause that catches
      // it. And the LAST row is the non-vacuity: a mount hard-coded to read-only would pass
      // every fail-closed row above and ship a grid that can never type — this milestone's
      // headline, silently missing.
      const homeRow = (extra = {}) => ({ nodeId: "node-a", sessionId: "sess-1", repo: "aof", ...extra });
      for (const [label, axis, row] of [
        ["the word, on the row", FEED_NO_PRODUCER, homeRow({ posture: "interactive" })],
        ["the constant, on the row", FEED_NO_PRODUCER, homeRow({ posture: POSTURE_INTERACTIVE })],
        ["the field the word sweep cannot see", FEED_NO_PRODUCER, homeRow({ readOnly: false })],
        ["a capability read as a permission", FEED_NO_PRODUCER, homeRow({ canInput: true })],
        ["a session that left the roster, looking alive", FEED_ROSTER_GONE, homeRow({ state: "running" })],
        ["…and a row carrying no work item at all", null, homeRow({ workItem: null })],
      ]) {
        const declared = homeSessionMount(row, axis == null ? {} : { axis });
        assert.equal(declared.posture, POSTURE_READ_ONLY, `${label}: no value the row carries turns the posture`);
        assert.equal(inputPolicyFor(declared.source, declared.posture).inputEnabled, false, "…and no input path opens");
        assert.deepEqual([...mountModelFor({ source: declared.source, mount: declared.posture }).keystrokeSinks], [], "…with no keystroke sink registered at all");
      }

      const homeTypeable = homeSessionMount(homeRow({ workItem: { ref: "49/03", assignmentId: "asg-1" } }), { axis: FEED_PRODUCER_KNOWN });
      assert.equal(homeTypeable.rendersPanel, true, "precondition: an addressable row with a nameable owner DOES render a panel");
      assert.equal(homeTypeable.posture, POSTURE_INTERACTIVE, "a positively-established `producer-known` row IS interactive — the milestone's headline, asserted rather than assumed");
      assert.equal(inputPolicyFor(homeTypeable.source, homeTypeable.posture).inputEnabled, true, "…and the real policy over the real mount opens the input path");
      assert.equal(homeTypeable.source, mount.source, "…on the SAME frozen `mirror` row the fleet mounts read-only — one source, now THREE postures across three surfaces");
      assert.equal(homeTypeable.source, boardMirror.source, "…and the same one the board mounts interactively");

      // THE CONTRAST IS NOW A THREE-WAY ONE, and it is asserted as a DIFFERENCE rather than
      // described: if every surface answered the same way this gate would be green for a product
      // that either never types or always does.
      const postures = [mount.posture, boardMirror.posture, homeTypeable.posture, homeSessionMount(homeRow(), { axis: FEED_NO_PRODUCER }).posture];
      assert.equal(new Set(postures).size, 2, `four real mounts, both postures represented: ${postures.join(", ")}`);
      assert.notEqual(postures[0], postures[2], "the fleet card and the grid tile answer DIFFERENTLY for the same source row");

      // ══ AND EVERY AMENDED CLAUSE IS DRIVEN TO A VIOLATION, in this same lane, against the
      //    SHIPPED detectors above and never a copy re-implemented here. m46's mutation review
      //    found the one plant in this family fed to a local copy, so the shipped detector had
      //    never once been driven to fire and `return []` would have read green everywhere. Each
      //    plant asserts it LANDED before the detector is asked, and each detector is shown QUIET
      //    on the clean tree in the SAME lane. ══
      const clean = listing;
      const plant = (path, source) => [...clean, { path, source }];
      const landed = (planted) => assert.notEqual(planted.length, clean.length, "the plant LANDED — the synthesized listing differs from the clean one");

      // ── THE AUTHORSHIP CLAUSE, in the spelling a word sweep cannot see, on each surface ──
      for (const [label, file, source] of [
        [
          "the exact spelling m46's own structural review found walking past the word sweep",
          "ui/src/home/GridTile.tsx",
          "export function GridTile({ row }) {\n  return <TerminalControl host={HOST_GRID_PANE} mount={{ ...homeSessionMount(row), posture: { readOnly: !!0 } }} />;\n}\n",
        ],
        [
          "a home helper module that decides the posture too",
          "ui/src/home/tile-mount.mjs",
          'export function tileMount(row) {\n  return { bound: true, posture: POSTURE_INTERACTIVE };\n}\n',
        ],
        ["the same move, one directory over", "ui/src/board/DockTile.tsx", "const mount = { bound: true, posture: dockPosture };\n"],
        ["and the clause it already had", "ui/src/fleet/PeekTile.tsx", "const mount = { bound: true, posture: peekPosture };\n"],
      ]) {
        const planted = plant(file, source);
        landed(planted);
        const fired = postureAuthorOffenders(planted);
        assert.ok(fired.some((offender) => offender.startsWith(`${file} WRITES`)), `self-check: ${label} — the SHIPPED authorship clause fires and names the planted file. Got: ${JSON.stringify(fired)}`);
        assert.ok(
          fired.some((offender) => offender.includes(surfaceOf(file, POSTURE_HOMES).postureHome)),
          "…and names the module that IS allowed to author the value there",
        );
        assert.deepEqual(postureAuthorOffenders(clean), [], "…and the CLEAN tree, in this same lane, reports none");
      }

      // ── AND IT REACHES NONE OF `ui/src/terminal/**`, which is the trap. The shipped control
      //    writes `posture: mount.posture` — a READ-THROUGH of the value this gate protects.
      for (const file of ["ui/src/terminal/TerminalControl.tsx", "ui/src/terminal/input-policy.mjs", "ui/src/terminal/host-model.mjs"]) {
        assert.deepEqual(
          postureAuthorOffenders([{ path: file, source: "const identity = terminalSessionIdentity({ posture: mount.posture });\n" }, ...clean]),
          [],
          `${file} writes a \`posture:\` key and is NOT an offender — the core DEFINES the vocabulary, transforms state within it and passes a decided value through. A sweep that reported it would fail CI on three modules that are provably not authors, and the obvious 'fix' would be an exemption list.`,
        );
      }

      // ══ THE FLOOR PLANT — THE ONE THAT MATTERS (ADR-008 amendment (A)) ══════════════════
      // The home's `<TerminalControl … mount={…}>` site DELETED ENTIRELY while Fleet's and
      // Board's remain. A concatenated whole-clause floor stays GREEN on this plant, which is
      // precisely why the floor is per-surface. WITHOUT THIS PLANT THE FLOOR IS THE THING IT
      // EXISTS TO PREVENT.
      // `matchAll`, NEVER `.test()` — `MOUNT_PROP` carries `/g`, and `.test()` on a global regex
      // ADVANCES `lastIndex`, so the next file is searched from a stale offset and the answer
      // depends on the order files arrive in. It failed CLOSED here (the count guard below went
      // red) but a wrong answer in the newest clause is not something to leave to a guard.
      const homeless = clean.filter((file) => !(file.path.startsWith("ui/src/home/") && [...file.source.matchAll(MOUNT_PROP)].length > 0));
      assert.equal(homeless.length, clean.length - 1, "the floor plant LANDED: exactly one home mount site was removed, and the fleet's and the board's are untouched");
      assert.ok(
        homeless.some((file) => file.path.startsWith("ui/src/fleet/")) && homeless.some((file) => file.path.startsWith("ui/src/board/")),
        "…with both other surfaces still present, so this is a MISSING HOME SITE and not an empty tree",
      );
      const floorFired = mountSiteOffenders(homeless);
      assert.ok(
        floorFired.some((offender) => offender.includes("ui/src/home/") && offender.includes("the terminals home")),
        `self-check: deleting the home's mount site turns the clause RED and the refusal NAMES the surface that lost it. Got: ${JSON.stringify(floorFired)}`,
      );
      // …and the CONCATENATED floor this replaced would have stayed green on the same plant,
      // which is the whole argument, asserted rather than described.
      const concatenated = homeless.flatMap((file) => [...file.source.matchAll(MOUNT_PROP)]);
      assert.ok(
        concatenated.length >= 1,
        `the old whole-clause floor (\`mountProps.length >= 1\` over every surface at once) is SATISFIED by ${concatenated.length} surviving Fleet/Board match(es) on the very plant above — one match, and the new interactive surface is policed by nothing while CI reads green`,
      );
      assert.deepEqual(mountSiteOffenders(clean), [], "…and the CLEAN tree, in this same lane, reports none");

      // ── ITS MIRROR: the sweep must be shown to FIND the site, not merely to count one ──
      const spread = plant("ui/src/home/SpreadTile.tsx", "  <TerminalControl\n    host={HOST_GRID_PANE}\n    mount={{ ...homeSessionMount(row) }}\n  />\n");
      landed(spread);
      assert.ok(
        mountSiteOffenders(spread).some((offender) => offender.includes("SpreadTile") && offender.includes("bare")),
        "self-check: a home mount site whose prop is a SPREAD is reported — the sweep genuinely reads the props it counts",
      );

      // ══ TWO SITES IN ONE FILE — the case an UNBOUNDED capture made invisible ═════════════
      // A WHOLE FILE, shaped like the tree rather than as an isolated snippet: a compliant
      // single-line site, then a second, non-compliant one below it. With the old
      // `([\s\S]*?)` capture this returned ZERO offenders from BOTH shipped detectors — the
      // extractor saw one match whose capture began with `homeSessionMount(`, the second site
      // lived inside that match's own span, and `matchAll` resumed past it. Through the real
      // policy the second site is `inputEnabled: true`: the exact m46 spelling this clause
      // exists to catch, on the surface that can type.
      const twoSites = plant(
        "ui/src/home/TwoTiles.tsx",
        [
          'import { TerminalControl } from "../terminal/TerminalControl";',
          'import { HOST_GRID_PANE } from "../terminal/host-model.mjs";',
          'import { homeSessionMount } from "./session-mount.mjs";',
          "",
          "export const A = ({ row, o }) => <TerminalControl host={HOST_GRID_PANE} mount={homeSessionMount(row)} origins={o} />;",
          "",
          "export const B = ({ row, o }) => (",
          "  <TerminalControl",
          "    host={HOST_GRID_PANE}",
          "    mount={{ ...homeSessionMount(row), readOnly: false }}",
          "    origins={o}",
          "  />",
          ");",
          "",
        ].join("\n"),
      );
      landed(twoSites);
      const twoFired = mountSiteOffenders(twoSites);
      assert.ok(
        twoFired.some((offender) => offender.includes("TwoTiles.tsx") && offender.includes("bare")),
        `self-check: the SECOND site in a file is READ and reported — a bounded capture cannot span past it. Got: ${JSON.stringify(twoFired)}`,
      );
      assert.ok(
        twoFired.some((offender) => offender.includes("TwoTiles.tsx") && offender.includes("could read only")),
        "…and the file is ALSO reported for REACH: it mounts the control twice and only one prop is readable, which is the defect one level finer than the per-surface floor",
      );
      // AND THIS CLAUSE IS THE *ONLY* ONE THAT SEES THAT SPELLING, which is why its reach has to
      // be exact rather than nearly right: `readOnly: false` names no `interactive` literal, so
      // the fleet-scoped word sweep is silent by design, and it writes no `posture:` key, so the
      // authorship clause is silent too. Stated as assertions rather than trusted, because "some
      // other clause would have caught it" is the belief that let the unbounded capture ship.
      assert.deepEqual(fleetInteractivePostureOffenders(twoSites), [], "the fleet-scoped word sweep says nothing about it — it is not a fleet file and it names no posture word");
      assert.deepEqual(postureAuthorOffenders(twoSites), [], "…and neither does the authorship clause: `readOnly: false` is not a `posture:` key write. THE BARE-CALL CLAUSE IS THE WHOLE GUARD HERE.");

      // …and its sibling spelling — the one that DOES write the key — is caught by BOTH, so the
      // two clauses are shown to overlap where they overlap and not where they do not.
      const twoSitesPostureKey = plant(
        "ui/src/home/TwoTilesPosture.tsx",
        [
          "export const A = ({ row, o }) => <TerminalControl host={HOST_GRID_PANE} mount={homeSessionMount(row)} origins={o} />;",
          "",
          "export const B = ({ row, o }) => (",
          "  <TerminalControl",
          "    host={HOST_GRID_PANE}",
          "    mount={{ ...homeSessionMount(row), posture: { readOnly: !!0 } }}",
          "  />",
          ");",
          "",
        ].join("\n"),
      );
      landed(twoSitesPostureKey);
      assert.ok(
        mountSiteOffenders(twoSitesPostureKey).some((offender) => offender.includes("TwoTilesPosture.tsx")),
        "the bare-call clause reads the second site",
      );
      assert.ok(
        postureAuthorOffenders(twoSitesPostureKey).some((offender) => offender.startsWith("ui/src/home/TwoTilesPosture.tsx WRITES")),
        "…and the authorship clause reports it independently, so the two fail together rather than relying on each other",
      );
      assert.deepEqual(mountSiteOffenders(clean), [], "…and the CLEAN tree, in this same lane, reports none");
    },
  },

  // ══ invariant #4 · PART 2 — THE POLICY, driven EXHAUSTIVELY over the whole frozen source
  //    table x both postures x every malformed declaration. ADR-006: "a pure function tested
  //    exhaustively is a far stronger pin than an absence-of-string sweep", and this is the
  //    clause that replaces the strength the directory sweep lost when the control moved. ══
  {
    name: "arch/46 terminal-input (invariant 4, part 2 — the policy): `inputEnabled = source.canInput && !mount.readOnly` over the WHOLE frozen table x both postures, and it FAILS CLOSED on every malformed declaration",
    async run() {
      assert.ok(SESSION_SOURCES.length >= 2, `the frozen table was actually read (non-vacuous): ${SESSION_SOURCES.length} rows`);

      // THE WHOLE TABLE x BOTH POSTURES — every cell, no sampling.
      for (const source of SESSION_SOURCES) {
        for (const posture of [POSTURE_INTERACTIVE, POSTURE_READ_ONLY]) {
          const policy = inputPolicyFor(source, posture);
          const expected = source.canInput === true && posture === POSTURE_INTERACTIVE;
          assert.equal(policy.inputEnabled, expected, `${source.kind} x ${posture}: inputEnabled`);
          assert.equal(policy.disableStdin, !expected, `${source.kind} x ${posture}: disableStdin is the exact negation — there is no third state in which a widget accepts keystrokes and drops them`);
          const model = mountModelFor({ source, mount: posture });
          assert.deepEqual([...model.keystrokeSinks], expected ? ["onData"] : [], `${source.kind} x ${posture}: the keystroke sink is present exactly when input is`);
          assert.equal(model.cursor.blink, expected, `${source.kind} x ${posture}: a blinking cursor is the universal "you can type here"`);
          assert.equal(model.readOnlyLabel, expected ? null : "read-only", `${source.kind} x ${posture}: the label is mandatory on a read-only mount`);
        }
      }

      // FAIL CLOSED. `canInput` is a CAPABILITY and is NEVER a permission — the permission is
      // the mount's, and an absent or malformed permission is not a permission. The failure the
      // posture exists to prevent is an operator believing a keystroke reached a worker, so an
      // unknown input may cost a keystroke; it may never cost a lie.
      const mirror = sessionSourceFor("mirror").source;
      const closed = [
        ["a source that declares canInput:false", { ...mirror, canInput: false }, POSTURE_INTERACTIVE],
        ["an unrecognised source kind", sessionSourceFor("banana").source, POSTURE_INTERACTIVE],
        ["no mount posture supplied at all", mirror, undefined],
        ["a null mount", mirror, null],
        ["a mount carrying an unrecognised key (wrong case)", mirror, { readonly: false }],
        ["a non-boolean readOnly that SAYS read-only in words", mirror, { readOnly: "yes" }],
        ["a mis-spelled posture", mirror, "Interactive"],
      ];
      for (const [label, source, mount] of closed) {
        const policy = inputPolicyFor(source, mount);
        assert.equal(policy.inputEnabled, false, `${label}: FAILS CLOSED — no input path`);
        assert.equal(policy.disableStdin, true, `${label}: stdin disabled in fact`);
        assert.deepEqual([...mountModelFor({ source, mount }).keystrokeSinks], [], `${label}: no keystroke sink registered`);
      }

      // …and the answer does not move with the host, the origin, the box or the URL. The policy
      // is a function of exactly two inputs, and nothing else may enter it.
      const a = inputPolicyFor(mirror, POSTURE_READ_ONLY);
      const b = inputPolicyFor(mirror, POSTURE_READ_ONLY);
      assert.deepEqual({ ...a }, { ...b }, "the same pair yields the same answer, every time");
    },
  },

  // ══ invariant #4 · PART 3 — THE SWEEP SURVIVES. Still walking `ui/src/fleet/**`, still
  //    non-vacuous, still proving that no fleet-LOCAL module grows its own input path. On its
  //    own it is no longer sufficient (the control left this directory), which is why parts 1
  //    and 2 exist — but it is not weaker than it was, and deleting it would give up the only
  //    clause that catches a NEW fleet file wiring a socket of its own. ══
  {
    name: "arch/42+46+49 terminal-input (invariant 4, part 3 — the surviving sweep, and it GAINS a directory): neither ui/src/fleet nor ui/src/home wires an input source or sends on a socket of its own, and the fleet still mounts the ONE control against the tuple-bound route",
    async run() {
      const fleetListing = await readSurfaceListing(FLEET_UI_DIR);
      assert.ok(fleetListing.length >= 5, `the fleet UI surface is found and is non-vacuous: ${fleetListing.length} files`);
      // m49/03 — THE SECOND SWEPT DIRECTORY. `ui/src/home/` is a NEW top-level directory that
      // would otherwise sit outside the only clause that catches a surface file wiring a socket
      // of its own — the same blind spot, one milestone later. Its absence FAILS loudly (see
      // `readSurfaceListing`) rather than passing over nothing.
      const homeListing = await readSurfaceListing(HOME_UI_DIR);
      assert.ok(homeListing.length >= 2, `the terminals home is found and is non-vacuous: ${homeListing.length} files`);

      const swept = [...fleetListing, ...homeListing];
      assert.deepEqual(
        inputSourceOffenders(swept),
        [],
        "the fleet page remains a monitor, and the home is interactive THROUGH THE ONE CONTROL AND ONLY THROUGH IT. NOTE, because the move makes this clause weaker than it reads: the ONE control lives in `ui/src/terminal/` and DOES wire onData there for the two interactive mounts — so this sweep alone can no longer answer 'can this surface type?'. Parts 1 and 2 above are what answer it now.",
      );

      // …AND THE SWEEP GENUINELY FIRES, on both directories, against the SHIPPED detector. Each
      // plant asserts it LANDED before the detector is asked, and the clean tree is shown quiet
      // in the same lane — a detector only ever shown to stay QUIET is one mutation from
      // asserting nothing.
      for (const [label, file, source] of [
        ["a home module taking keystrokes", "ui/src/home/keys.mjs", "export function wire(term) {\n  term.onData((bytes) => queue.push(bytes));\n}\n"],
        ["a home module with its own wire", "ui/src/home/socket.mjs", 'export function open(url) {\n  const ws = new WebSocket(url);\n  ws.send("hello");\n  return ws;\n}\n'],
        ["a home module keying off the DOM", "ui/src/home/keymap.mjs", "export function bind(term) {\n  term.attachCustomKeyEventHandler(() => true);\n}\n"],
        ["the fleet clause, unchanged", "ui/src/fleet/peek-keys.mjs", "export function wire(term) {\n  term.onKey((event) => event);\n}\n"],
      ]) {
        const planted = [...swept, { path: file, source }];
        assert.notEqual(planted.length, swept.length, `${label}: the plant LANDED`);
        assert.ok(
          inputSourceOffenders(planted).some((offender) => offender.startsWith(file)),
          `self-check: ${label} is reported by the SHIPPED sweep, naming the file and what it wired`,
        );
        assert.deepEqual(inputSourceOffenders(swept), [], "…and the CLEAN tree, in this same lane, reports none");
      }

      // ── TECH_DEBT 24, WITH A PLANT: on an ABSENCE sweep the wrong strip order is a silent
      //    PASS, and silence is what this whole file is written against. ──
      const blinding = [
        "// the pane's key uses /* as its own marker — see the note below",
        ...Array(20).fill("const filler = 1;"),
        "term.onData((bytes) => queue.push(bytes));",
        "/* an ordinary block comment, twenty-two lines later */",
        "export const wired = true;",
      ].join("\n");
      assert.ok(
        inputSourceOffenders([...swept, { path: "ui/src/home/blinded.mjs", source: blinding }]).some((offender) => offender.startsWith("ui/src/home/blinded.mjs")),
        "a LINE comment containing `/*` twenty lines above an `onData` wiring does NOT blind the sweep — line comments are stripped FIRST, block comments SECOND",
      );
      const blockFirst = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      assert.ok(
        !TERMINAL_INPUT_SOURCE.test(blockFirst(blinding)),
        "…and with the strip order REVERSED the same file reports NOTHING AT ALL, which is why the order is asserted here and not merely commented",
      );
      assert.deepEqual(
        inputSourceOffenders([{ path: "ui/src/home/commented.mjs", source: "/*\nterm.onData((bytes) => queue.push(bytes));\n*/\nexport const x = 1;\n" }]),
        [],
        "…while an `onData` that appears ONLY inside a genuine block comment is NOT reported: the stripper still strips",
      );

      // The fleet still MOUNTS the control (an unmounted consumer is how F-38.06c once hid),
      // and the mount assertion is RE-POINTED: it is no longer "the fleet renders
      // FleetTerminalView" but "the fleet renders THE ONE CONTROL".
      const fleetPage = await realSource(path.join(FLEET_UI_DIR, "Fleet.tsx"));
      assert.ok(/<\s*TerminalControl\b/.test(fleetPage), "the fleet page MOUNTS the one terminal control");
      assert.ok(/fleetTerminalMount\s*\(/.test(fleetPage), "…handing it the mount its own module computes, rather than a posture typed at the JSX");

      // THE `/ws/terminal-view` ROUTE IS STILL NAMED — RE-AIMED AT THE DESCRIPTOR MODULE. After
      // ADR-001 that literal lives in the frozen source table, not in any component, so a
      // re-point at the control would fail for a reason that looks like a bug and is not. Read
      // RAW (comment-unstripped): a `ws://` inside a template literal reads as a line comment to
      // the stripper, truncating the very line a route check needs — the caveat this file has
      // documented since m42 and the reason this one clause does not use `realSource`.
      const tableRaw = lf(await readFile(SOURCE_TABLE, "utf8"));
      assert.ok(/\/ws\/terminal-view/.test(tableRaw), "the mirror source declares the tuple-bound /ws/terminal-view route");
      assert.ok(/\/ws\/terminal\b/.test(tableRaw), "…and the local PTY source declares the board's own bidirectional route");

      // THE ONE CONTROL'S INTERACTIVE LANE IS REAL — the positive half of the operator's m42
      // override, re-pointed off the deleted dock. Without this the read-only clauses above
      // could be satisfied by a control that can never type at all, which is not the product.
      const controlSource = await realSource(TERMINAL_CONTROL);
      assert.ok(TERMINAL_INPUT_SOURCE.test(controlSource), "the one control wires term.onData — the input direction is real");
      assert.ok(browserSocketSend(controlSource), "…and sends on its socket, so keystrokes genuinely travel");

      // TWO SPELLINGS RETIRED WITH THE FILES THAT CARRIED THEM, recorded here so a reviewer
      // meets the decision rather than a confusing red:
      //  · the dock's `remote ·` BADGE — DESIGN change 8 retires it. The invariant ("a remote
      //    session SAYS it is remote, never colour alone") survives in the IDENTITY LINE, which
      //    reads `<ref> → <nodeId>`, and that is what is asserted now.
      //  · "the dock does not construct `disableStdin: true`" — after unification there is ONE
      //    control file and the fleet's read-only mount must construct exactly that, so a needle
      //    re-pointed literally would forbid the posture this milestone must preserve. The
      //    invariant ("no half-disabled widget that swallows keystrokes silently") is the
      //    POLICY's now, driven exhaustively in part 2 — and it is stronger here than a string
      //    ever was, because the control may not spell either value as a LITERAL at all.
      const identity = await realSource(path.join(repoRoot, "ui", "src", "terminal", "pane-identity.mjs"));
      assert.ok(/→\s*\$\{far\}|\$\{owner\}\s*→/.test(identity), "the identity line names the far end — a remote session says so in WORDS");
      assert.ok(
        !/disableStdin\s*:\s*(?:true|false)\b/.test(controlSource),
        "the control never spells `disableStdin` as a literal — it reads the input policy's model, which is what makes the fleet's posture a property of the fleet's DECLARATION rather than of this component",
      );
      assert.ok(
        !/cursorBlink\s*:\s*(?:true|false)\b/.test(controlSource),
        "…and the same for the cursor, the posture's second non-colour signal",
      );

      // And the worker's own local /ws/terminal is untouched by this feature.
      const terminalWsSource = await realSource(TERMINAL_WS);
      assert.ok(/term\.write\s*\(/.test(terminalWsSource), "terminal-ws.mjs (the board's local /ws/terminal) still writes its own PTY — unchanged");
    },
  },

  // ══ behavioural — the REAL route: tuple-bound push, smuggle-proof, clean degrade ══
  {
    name: "arch/42 terminal-input (behavioural): a keystroke arrives as a terminal-input envelope carrying the SOCKET's tuple — a payload-smuggled tuple stays opaque bytes; an unconfigured route stays output-only and the mirror stream survives",
    async run() {
      const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-terminal-input-fitness-"));
      const root = path.join(tmp, "repo");
      const distRoot = path.join(tmp, "dist");
      const home = path.join(tmp, "home");
      let server;
      let bareServer;
      try {
        await mkdir(path.join(root, ".aof"), { recursive: true });
        await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify({ name: "demo", work: { dir: "./wiki/work" } }, null, 2)}\n`, "utf8");
        await mkdir(path.join(meshUiDist(distRoot), "assets"), { recursive: true });
        await writeFile(path.join(meshUiDist(distRoot), "index.html"), "<!doctype html><html><body></body></html>\n", "utf8");
        await writeFile(path.join(meshUiDist(distRoot), "assets", "index-abc123.js"), "export const x = 1;\n", "utf8");

        // ── the CONFIGURED route: keystrokes become tuple-bound envelopes ──
        const pushed = [];
        const mirror = createTerminalMirror();
        ({ server } = await serveMeshUi({
          projectDir: root, port: 0, repoRoot: distRoot,
          globalStoreOptions: { env: { AOF_GLOBAL_HOME: home } },
          terminalMirror: mirror,
          terminalInputPush: { push: (envelope) => { pushed.push(envelope); } },
        }));
        const port = server.address().port;
        const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/terminal-view?nodeId=node-a&sessionId=sess-1`);
        await new Promise((resolve, reject) => { ws.on("open", resolve); ws.on("error", reject); });

        ws.send("an operator answer\r");
        // The SMUGGLE: a JSON payload naming a DIFFERENT tuple — it must arrive as
        // opaque BYTES under the socket's own tuple, never as routing.
        ws.send('{"nodeId":"victim-node","sessionId":"stolen-sess","bytes":"evil"}');
        await new Promise((resolve, reject) => {
          const start = Date.now();
          const tick = () => {
            if (pushed.length >= 2) return resolve();
            if (Date.now() - start > 1500) return reject(new Error("timeout waiting for the pushed input envelopes"));
            setTimeout(tick, 5);
          };
          tick();
        });
        assert.equal(pushed[0].kind, TERMINAL_INPUT_KIND);
        assert.equal(pushed[0].nodeId, "node-a", "the envelope carries the SOCKET's nodeId");
        assert.equal(pushed[0].signal.sessionId, "sess-1", "the envelope carries the SOCKET's sessionId");
        assert.equal(pushed[0].signal.bytes, "an operator answer\r", "the bytes ride verbatim");
        assert.equal(pushed[1].nodeId, "node-a", "a smuggled tuple does NOT reroute the envelope");
        assert.equal(pushed[1].signal.sessionId, "sess-1", "a smuggled tuple does NOT reroute the envelope");
        assert.equal(pushed[1].signal.bytes, '{"nodeId":"victim-node","sessionId":"stolen-sess","bytes":"evil"}', "the smuggle arrives as opaque BYTES — content-blind");
        ws.close();

        // ── the UNCONFIGURED route: output-only, no echo, stream intact ──
        const bareMirror = createTerminalMirror();
        ({ server: bareServer } = await serveMeshUi({
          projectDir: root, port: 0, repoRoot: distRoot,
          globalStoreOptions: { env: { AOF_GLOBAL_HOME: home } },
          terminalMirror: bareMirror,
        }));
        const barePort = bareServer.address().port;
        const bareWs = new WebSocket(`ws://127.0.0.1:${barePort}/ws/terminal-view?nodeId=node-a&sessionId=sess-1`);
        const received = [];
        await new Promise((resolve, reject) => { bareWs.on("open", resolve); bareWs.on("error", reject); });
        bareWs.on("message", (data) => received.push(data.toString()));
        bareWs.send("a keystroke with no input lane configured\r");
        await new Promise((resolve) => setTimeout(resolve, 150));
        assert.equal(bareWs.readyState, WebSocket.OPEN, "the connection survives a client-sent keystroke (no crash)");
        assert.equal(received.length, 0, "the client received NOTHING back — no echo, no sink");
        bareMirror.apply(buildTerminalFrameEnvelope("node-a", "sess-1", "still streaming after the keystroke\n"));
        await new Promise((resolve, reject) => {
          const start = Date.now();
          const tick = () => {
            if (received.length >= 1) return resolve();
            if (Date.now() - start > 1500) return reject(new Error("timeout waiting for the post-keystroke frame"));
            setTimeout(tick, 5);
          };
          tick();
        });
        assert.equal(received[0], "still streaming after the keystroke\n");
        bareWs.close();
      } finally {
        if (server) await new Promise((resolve) => server.close(resolve));
        if (bareServer) await new Promise((resolve) => bareServer.close(resolve));
        await rm(tmp, { recursive: true, force: true });
      }
    },
  },
];
