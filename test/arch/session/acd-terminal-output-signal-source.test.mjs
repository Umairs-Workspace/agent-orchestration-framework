// Fitness function: acd-terminal-output-signal-source (SECURITY T14's surviving half; m46/ADR-007
// re-aimed it, and m46/04 gave it its own file) —
//
//   "The streamed terminal OUTPUT signal is the PTY chunk and NOTHING ELSE — at every producer
//    that feeds the send seam, wherever it lives; and the module that builds every terminal
//    envelope in both directions references no credential, env, askpass or mint material."
//
// ═══ WHY THIS IS ITS OWN GATE, AND WHY THE SPLIT WAS OVERDUE ══════════════════════════════════
// Until 46/04 this detector lived inside `acd-fleet-terminal-input-constrained` as its
// "invariant #4". That gate is named for the FLEET PAGE and is about the INPUT direction — the
// route entry, the worker's session-exact delivery, and the browser surfaces that may not type.
// This detector is about a WORKER-SIDE PRODUCER and the OUTPUT direction. One file, two subjects,
// and the file had grown past 950 lines carrying them — the largest of the repo's 254 arch tests.
//
// The cost of two subjects under one name is not tidiness, it is READABILITY UNDER FAILURE: a red
// line reading `arch/42 terminal-input …` about `src/mesh/launcher.mjs`'s output arrow sends the
// next reviewer to the fleet page. A gate's name is the first thing anyone reads about it, and it
// should describe its subject. Nothing about either invariant changed in the split; the detector,
// its plants and its refusal text are the SAME code, moved.
//
// ═══ ADR-007: THE SUBJECT IS DISCOVERED, NEVER NAMED ══════════════════════════════════════════
// Spike 44 measured `wireTerminalBridge` to have NO production caller, and m46/01 deleted it —
// this detector had been reading green for a month while asserting nothing about the bytes that
// reach an operator's screen. "A gate guarding dead code is worse than no gate, because green is
// read as a satisfied contract." So:
//   - the POSITIVE half reads EVERY `.sendTerminalFrame(` call site found by sweeping `src/`,
//     wherever it lives, and requires each to sit inside exactly
//     `(chunk, sessionId) => <client>.sendTerminalFrame(sessionId, String(chunk))`;
//   - ZERO producers is a TRIP, not a pass — the vacuity ADR-007 exists to prevent;
//   - the NEGATIVE half stays on `src/mesh/terminal-relay-bridge.mjs`, which still builds every
//     terminal envelope in both directions, so "no credential material appears in it" remains a
//     live, meaningful sweep;
//   - it grows NO second copy of the live-path credential needle: that one already exists, green,
//     in `acd-fleet-terminal-frame-connection-identity`, and two homes for one detector is the
//     shape these ADRs keep refusing.
//
// NAMING `src/mesh/launcher.mjs` WAS A MEASURED FALSE NEGATIVE: it is a 1,758-line hub with 37
// outward edges, so splitting it is plausible, and moving the real producers out while leaving
// any sanctioned-shaped `onOutputChunk:` arrow behind (dead code, a defaults object, a docs
// example) read GREEN. The sweep starts from the SEND SEAM, not from a path.
//
// THE EXACT-ARROW REGEX PINS THE SPELLING, NOT ONLY THE SEMANTICS. An equivalent re-spelling
// (`String(chunk)` hoisted to a const, a named helper, a destructured client) is REFUSED, so a
// future engineer updates this gate CONSCIOUSLY — with the invariant in front of them — instead
// of quietly loosening the regex until it no longer says anything.
//
// The behavioural half of the same invariant (real secrets in a real process environment, real
// bytes on a real frame) is `test/mesh/terminal/mesh-terminal-signal-source.test.mjs`.
//
// Every plant is a HAND-WRITTEN synthesized snippet (never a string-replace on a real file) —
// each asserts it LANDED (`assert.notEqual(planted, clean)`) before asserting the detector trips
// on it and stays quiet on the clean baseline.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const BRIDGE = path.join(repoRoot, "src", "mesh", "terminal-relay-bridge.mjs");
// THE REAL PRODUCER, DISCOVERED rather than named. This gate deliberately holds no path to
// `src/mesh/launcher.mjs` (where both producers live today), so a file split cannot silently
// move them out from under it.
const SRC_DIR = path.join(repoRoot, "src");

// LINE COMMENTS FIRST, BLOCK COMMENTS SECOND — the order is load-bearing (TECH_DEBT item 24):
// strip blocks first and a line comment containing `/*` deletes the rest of the file before the
// detector sees it, which on an absence sweep is a silent PASS.
function stripComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

// lf(source) — normalise CRLF -> LF before every regex probe (the repo's tree is checked out
// CRLF; an "\n"-only needle would silently no-op — m38's own hard-earned lesson).
function lf(source) {
  return source.replace(/\r\n/g, "\n");
}

async function realSource(file) {
  return lf(stripComments(await readFile(file, "utf8")));
}

const CREDENTIAL_NEEDLE = /\b(?:process\.env|askpass|credential|mint(?:CloneCredential|WriteCredential)?|GIT_ASKPASS|apiKey|privateKey|appPrivateKey)\b/i;

// THE SANCTIONED PRODUCER, spelled exactly. `String(chunk)` must be the WHOLE second argument — a
// concatenation, a re-read, a sanitiser or a second data source all fail this shape, which is how
// "sourced from the chunk and NOTHING else" is expressed structurally rather than by a second copy
// of the credential needle.
const SANCTIONED_OUTPUT_CHUNK_ARROW =
  /^\(\s*chunk\s*,\s*sessionId\s*\)\s*=>\s*[A-Za-z_$][\w$]*\.sendTerminalFrame\(\s*sessionId\s*,\s*String\(\s*chunk\s*\)\s*\)$/;

// ═══ THE SECOND SANCTIONED SHAPE (m50/ADR-008 decision 9) — AN ENUMERATION, NEVER A RELAXATION ═══
//
// m50/story 03's spawn handler is the third producer, and it is wired DIFFERENTLY on purpose: the
// handler owns its own PTY and calls a `sendTerminalFrame(sessionId, bytes)` SEAM it is handed,
// rather than being handed an `onOutputChunk` callback the way `createMeshWorkerExecutionHandler`
// and the resume handler are. So the launcher's wiring is a BRIDGE KEY, not an output arrow:
//
//     sendTerminalFrame: (sessionId, bytes) => client.sendTerminalFrame(sessionId, bytes),
//
// MEASURED, and it is why raising the number alone did NOT turn this gate green: with only the
// arrow shape enumerated, the third site tripped the "sits OUTSIDE any `onOutputChunk:` property
// VALUE" clause — a SECOND problem beside the ceiling, on a call site the ADR sanctions.
//
// THE FIX IS A SECOND NAMED SHAPE, NOT A WIDER PATTERN. Relaxing the arrow regex — or dropping the
// host requirement to "somewhere in a sanctioned-looking file" — would delete the property both
// shapes exist to hold: the streamed bytes are the PTY's own, passed through UNTOUCHED, with no
// second data source, no credential fold and no sanitiser between the callback and the seam. Two
// exact spellings assert that twice; one loose pattern asserts it never. A FOURTH shape must be
// added here CONSCIOUSLY, with the invariant in front of the engineer adding it.
//
// `bytes` must be the WHOLE second argument, exactly as `String(chunk)` must be above: the handler
// has already turned its PTY chunk into that string (it is the ONE thing it is allowed to send),
// and anything spliced in here would be the control-authored terminal content SECURITY T14's
// surviving half forbids.
const SANCTIONED_OUTPUT_BRIDGE_KEY =
  /^\(\s*sessionId\s*,\s*bytes\s*\)\s*=>\s*[A-Za-z_$][\w$]*\.sendTerminalFrame\(\s*sessionId\s*,\s*bytes\s*\)$/;

// The two sanctioned hosts, ENUMERATED by the property key that declares them and the exact shape
// each must carry. A call site is sanctioned iff it sits inside one of these and matches that
// one's spelling — never "inside anything that looks like a producer".
const SANCTIONED_PRODUCER_SHAPES = Object.freeze([
  Object.freeze({
    key: "onOutputChunk",
    shape: SANCTIONED_OUTPUT_CHUNK_ARROW,
    spelling: "(chunk, sessionId) => <client>.sendTerminalFrame(sessionId, String(chunk))",
  }),
  Object.freeze({
    key: "sendTerminalFrame",
    shape: SANCTIONED_OUTPUT_BRIDGE_KEY,
    spelling: "(sessionId, bytes) => <client>.sendTerminalFrame(sessionId, bytes)",
  }),
]);

// The SEND SEAM's call shape. The leading `.` is load-bearing: it excludes
// worker-stream-client.mjs's own `function sendTerminalFrame(...)` definition and its
// `sendTerminalFrame,` return-object entry, so the seam's DEFINITION is never mistaken for a
// producer while any file that CALLS it — including one that does not exist yet — is swept.
const SEND_TERMINAL_FRAME_CALL = /\.sendTerminalFrame\s*\(/g;

// ═══ THE SHRINK-ONLY CEILING (m49/ADR-003) — added by 49/02, and it is a SECOND invariant on the
//     same swept number, owned by a different milestone ═══════════════════════════════════════════
//
// The FLOOR below (m46/ADR-007) says "at least two, or the resume lane went dark". The CEILING says
// "at most two, or a BROWSER's arithmetic silently became wrong" — and the two are stated against
// ONE number because there is only one fact here: how many places in `src/` can feed the relay.
//
// WHY A THIRD CALL SITE IS A CORRECTNESS BUG AND NOT A STYLE ONE. m49's terminals home derives a
// pane's FEED AXIS in the browser, from a field already on the wire, by this arithmetic
// (ARCHITECTURE 49/ADR-003):
//
//     workItem != null  ⟺  an assignment execution owns this tuple  ⟹  a producer exists
//     workItem == null  ⟹  NO call site anywhere in src/ will ever feed this tuple  ⟹  `no-producer`
//
// The right-hand implication is not a property of the browser's code. It is a property of THIS
// REPOSITORY having exactly two `.sendTerminalFrame(` call sites, both inside `mesh-launcher.mjs`'s
// worker branch, both inside an assignment execution. Add a third outside that branch — a board
// bridge, a loopback worker, a replay tool — and every pane the home labels `no-producer` becomes a
// LIE: the operator is told "nothing will ever feed this" about a tuple that is streaming. No test
// in `ui/` can see that change; no test in `src/` is about it; the browser keeps answering
// confidently from an arithmetic that stopped holding one commit ago. **This gate is the only place
// the two builds meet.**
//
// IT COUNTS SITES; IT DOES NOT JUDGE BRANCHES. The honest statement of the invariant is "no producer
// outside the worker's assignment branch", and that is NOT textually decidable — a detector that
// guessed at branch membership would cry wolf, and this repo has already measured what that costs (a
// gate that cries wolf gets relaxed rather than obeyed). So the cheap, exact proxy: the COUNT is
// pinned, and a third site of any shape stops the build and asks a human. That is the same trade
// `acd-terminal-mirror-geometry-pinned` makes for 80x24.
//
// SHRINK-ONLY, in the sense `FLEET_TO_BOARD_BASELINE` uses the word: this number may be LOWERED by a
// diff (a producer genuinely leaving is a smaller surface, and the floor will independently object if
// it was the resume lane), and it may be RAISED only by an ADR that re-derives the feed axis — because
// raising it is not a test edit, it is the browser's `no-producer` answer changing meaning.
//
// ═══ RAISED 2 → 3 BY m50/ADR-008 DECISION 9, AND THE RE-DERIVATION IS THE SUBSTANCE OF THE RAISE ══
//
// The clause above reserved this number's increase to "an ADR that re-derives the feed axis". This is
// that raise, m50/ADR-008 is that ADR, and the re-derivation landed in the SAME diff — `ui/src/home/
// feed-axis.mjs`, this file, and the four wire hops between them are one change. 49/DESIGN §DG-49-2
// wrote the instruction in words and named milestone 50 as the amender.
//
// THE THREE SANCTIONED SITES, BY NAME (all three in `src/mesh/launcher.mjs`'s worker branch today,
// which is an OBSERVATION recorded here and never this detector's input — the sweep finds them
// wherever they move):
//   1. the ASSIGNMENT DRIVER's `onOutputChunk` arrow (createMeshWorkerExecutionHandler's wiring);
//   2. the RESUME LANE's `onOutputChunk` arrow (createMeshWorkerTerminalResumeHandler's wiring);
//   3. m50/story 03's SPAWN-HANDLER BRIDGE KEY,
//      `sendTerminalFrame: (sessionId, bytes) => client.sendTerminalFrame(sessionId, bytes)` —
//      recognised by the SECOND enumerated sanctioned shape above, never by relaxing the first.
//
// WHAT THE NUMBER PROXIES HAS CHANGED, and this is the whole re-derivation:
//
//   BEFORE — the count carried BOTH directions of m49/ADR-003's arithmetic:
//     `workItem != null ⟹ a producer exists`      (still true: the two assignment sites are untouched)
//     `workItem == null ⟹ NO producer will ever feed this tuple`
//                                                  (true ONLY while every producer was assignment-bound)
//
//   AFTER — the reverse direction no longer rests on the count at all. Site 3 is a producer that is
//   deliberately NOT assignment-bound: a launched session has no assignment by construction, so the
//   old implication is FALSE the moment it ships. It is replaced by a STATED FACT ON THE WIRE
//   (ADR-008 decision 8): every non-assignment producer writes `relaying: true` onto the session
//   record it owns, that boolean survives four hops (assembleSessionRecord → readLiveSessions →
//   safeSessionArray VERBATIM → buildSessionIndex) and the browser's axis becomes a DISJUNCTION of
//   two positive statements:
//     `producer-known ⟺ establishedProducer(workItem) OR row.relaying === true`, still failing CLOSED.
//   `acd-session-producer-fact-survives-the-wire` is the gate on that chain.
//
//   SO WHY KEEP THE COUNT AT ALL? Because the browser's answer is now only as honest as a new
//   producer's willingness to STATE itself, and nothing textual can check that a producer nobody has
//   written yet remembers to. The count survives as the TRIPWIRE that stops the build and asks a
//   human — which is what it was always really doing. A FOURTH site of ANY shape still fires.
const SANCTIONED_PRODUCER_SITES = 3;

// keyArrowRanges(source, key) — EVERY `key: <value>` property value in a source, with its
// [start, end) span, sliced from the key to the comma that closes that property at depth 0 (so a
// multi-line arrow, or one carrying parenthesised sub-expressions, is captured whole). Spans are
// what let a caller ask "is THIS call site inside a sanctioned arrow?" rather than "does a
// sanctioned arrow exist somewhere?" — the difference between the two is exactly the false
// negative this detector was hardened against.
function keyArrowRanges(source, key) {
  const ranges = [];
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
        if (depth === 0) break; // the ENCLOSING object literal closed — this is the last property
        depth -= 1;
      } else if (ch === "," && depth === 0) break;
    }
    ranges.push({ text: source.slice(start, i).trim(), start, end: i });
  }
  return ranges;
}

// A refusal names its cause, and "the producer is gone" is only ONE of the causes that produce an
// empty result. The others are honest re-spellings — shorthand (`onOutputChunk,`, which
// src/mesh/worker-execution.mjs already uses at three of its own call sites), method shorthand
// (`onOutputChunk(chunk, sessionId) { … }`), or a named helper — and telling an engineer the
// producer vanished when it is right in front of them, spelled differently, is how a gate gets
// deleted instead of re-aimed.
const RESPELLING_CLAUSE =
  "Either the producer is GONE (the vacuity ADR-007 forbids: a detector pointed at a producer that does not exist asserts nothing — it is not a weak gate, it is a FALSE one), OR it was RE-SPELLED: shorthand (`onOutputChunk,`), method shorthand (`onOutputChunk(chunk, sessionId) { … }`), or a named helper. If it was re-spelled, RE-AIM this detector at the new spelling — never delete it, and never relax the shape to fit.";

// The ENUMERATION, quoted back to whoever trips it. A refusal that says "not sanctioned" without
// naming what IS sanctioned is a refusal that gets answered by widening the regex.
const SANCTIONED_HOSTS_CLAUSE = SANCTIONED_PRODUCER_SHAPES
  .map((shape) => `\`${shape.key}: ${shape.spelling}\``)
  .join(" OR ");

// hostFor(source, call) — the sanctioned HOST a `.sendTerminalFrame(` call site sits inside, as
// { key, shape, spelling, text } — or null when it sits inside none of them. Every enumerated key's
// property VALUES are cut by brace/paren balance (keyArrowRanges), so "is THIS call inside a
// sanctioned host?" is answered by SPAN containment rather than by "does a sanctioned host exist
// somewhere in this file?" — the difference between the two is exactly the false negative this
// detector was hardened against in 46/04.
function hostFor(rangesByKey, callIndex) {
  for (const shape of SANCTIONED_PRODUCER_SHAPES) {
    const host = (rangesByKey.get(shape.key) ?? []).find((range) => callIndex >= range.start && callIndex < range.end);
    if (host != null) return { ...shape, text: host.text };
  }
  return null;
}

// outputSignalProblems({ bridgeSource, srcSources }) — `srcSources` is a
// Map<relativePath, comment-stripped source> covering every `.mjs` under `src/`.
export function outputSignalProblems({ bridgeSource, srcSources }) {
  const problems = [];

  // NEGATIVE half — STAYS on the bridge module, which still builds every terminal envelope in
  // BOTH directions, so this remains a live, meaningful sweep.
  if (CREDENTIAL_NEEDLE.test(bridgeSource)) {
    problems.push("mesh-terminal-relay-bridge.mjs references credential/env/askpass/mint material — the envelope builders must read NOTHING but their own arguments");
  }

  // POSITIVE half — RE-AIMED at the producer that actually runs, DISCOVERED by sweep, and since
  // m50/ADR-008 read against an ENUMERATION of two sanctioned host shapes rather than one.
  const producers = [];
  for (const [file, source] of srcSources) {
    const rangesByKey = new Map(SANCTIONED_PRODUCER_SHAPES.map((shape) => [shape.key, keyArrowRanges(source, shape.key)]));
    for (const call of source.matchAll(SEND_TERMINAL_FRAME_CALL)) {
      const host = hostFor(rangesByKey, call.index);
      producers.push({ file, host });
      if (host == null) {
        problems.push(
          `${file}: a \`.sendTerminalFrame(\` call site sits OUTSIDE every sanctioned producer host — the streamed signal must come from a PTY output callback or the spawn handler's own bridge seam, and nothing else. The sanctioned hosts are an ENUMERATION of exactly two: ${SANCTIONED_HOSTS_CLAUSE}. ${RESPELLING_CLAUSE}`,
        );
      } else if (!host.shape.test(host.text)) {
        problems.push(
          `${file}: the \`${host.key}:\` producer feeding \`.sendTerminalFrame(\` is not exactly \`${host.spelling}\` — the streamed signal must be the producer's OWN bytes and NOTHING else (SECURITY T14's surviving half). Got: ${host.text}`,
        );
      }
    }
  }

  if (producers.length === 0) {
    problems.push(
      `no \`.sendTerminalFrame(\` call site exists anywhere under src/ — the streamed terminal signal has no producer this gate can see. ${RESPELLING_CLAUSE} (If the SEND SEAM itself was renamed, re-aim the sweep at its new name.)`,
    );
  } else if (producers.length < SANCTIONED_PRODUCER_SITES) {
    problems.push(
      `only ${producers.length} \`.sendTerminalFrame(\` producer found under src/ (in ${producers.map((p) => p.file).join(", ")}) — ALL ${SANCTIONED_PRODUCER_SITES} production call sites must stream: the assignment dispatch, the terminal-resume handler AND (m50/story 03) the session-spawn handler's PTY bridge. Three call sites are three chances to disagree, and "an assignment's session streams but a RESUMED one goes dark" is exactly the silent half-wiring this milestone exists to end.`,
    );
  } else if (producers.length > SANCTIONED_PRODUCER_SITES) {
    problems.push(
      `${producers.length} \`.sendTerminalFrame(\` producers found under src/ (in ${producers.map((p) => p.file).join(", ")}) — the CEILING is ${SANCTIONED_PRODUCER_SITES} (m49/ADR-003, RAISED 2 → 3 by m50/ADR-008 decision 9). This is not a tidiness rule: the terminals home decides a pane's FEED AXIS in the BROWSER. Until m50 the arithmetic was \`workItem == null ⟹ no call site anywhere in src/ will ever feed this tuple ⟹ no-producer\`, a property of THIS SWEEP and not of any code in ui/. ADR-008 re-derived it, because m50's spawn handler is a producer that is NOT assignment-bound: the axis is now the DISJUNCTION \`establishedProducer(workItem) OR row.relaying === true\`, and the reverse direction rests on every non-assignment producer STATING \`relaying: true\` on the wire (acd-session-producer-fact-survives-the-wire gates that chain). THE COUNT SURVIVES AS THE TRIPWIRE: a new producer that does NOT state itself makes every \`no-producer\` pane a LIE — the operator is told "no live output — nothing will ever feed this" about a tuple that is streaming, and no test in either build can see it. So a FOURTH site stops the build and asks a human: either it is assignment-owned, or it must state \`relaying: true\` on the session record it feeds — and then this ceiling is RAISED in the SAME diff that says so in an ADR, never by relaxing the number to make CI quiet. Shrink-only otherwise: lowering it is always allowed (the FLOOR above will object independently if a lane is what left).`,
    );
  }
  return problems;
}

// ═══ m50/ADR-008 FF-E's TWO ADDED CLAUSES ═══════════════════════════════════════════════════════
//
// Both are about the RAISE's PREMISE rather than about the count, and both are cheap. Decision 9
// raised this ceiling on the strength of ONE promise — that the third producer STATES itself on the
// wire, so the browser's reverse implication is carried by a field instead of by arithmetic. A raise
// whose premise is unchecked is a raise that ratifies whatever shipped.
//
//   (a) the third site's module passes `relaying: true` to BOTH `startSession(` and `pingSession(`.
//       Start alone is not enough: `pingSession` UPSERTS, so a ping that dropped the field would
//       rebuild a crash-recovered record WITHOUT it and demote a live pane mid-session.
//   (b) `feedAxisFor` still takes NO BYTE PARAMETER, optional or otherwise. This is the existing
//       gated invariant, RESTATED here now that the derivation has a second input — the moment an
//       axis has two inputs, "just look at whether bytes arrived" becomes the obvious third, and it
//       is forbidden: the browser writes those bytes straight into xterm, so a worker's own PTY
//       output could FORGE its pane's state by printing it (SECURITY T14).
const SPAWN_HANDLER = path.join(repoRoot, "src", "mesh", "session-spawn-handler.mjs");
const FEED_AXIS = path.join(repoRoot, "ui", "src", "home", "feed-axis.mjs");

// callArgs(source, name) — the paren-balanced ARGUMENT TEXT of every `name(` call, cut on the
// language's own structure so a nested call, an object literal or an arrow with its own commas
// cannot truncate the slice (the same correction acd-fleet-board-link-resolved made when it
// replaced a character window with a brace cut).
function callArgs(source, name) {
  const calls = [];
  const anchor = new RegExp(`\\b${name}\\s*\\(`, "g");
  let match;
  while ((match = anchor.exec(source)) !== null) {
    const open = match.index + match[0].length - 1;
    let depth = 0;
    for (let i = open; i < source.length; i += 1) {
      const ch = source[i];
      if (ch === "(" || ch === "[" || ch === "{") depth += 1;
      else if (ch === ")" || ch === "]" || ch === "}") {
        depth -= 1;
        if (depth === 0) { calls.push(source.slice(open + 1, i)); break; }
      }
    }
  }
  return calls;
}

// producerFactProblems({ handlerSource, feedAxisSource }) — the two clauses above, over
// comment-stripped sources. Kept OUT of `outputSignalProblems` deliberately: that function's whole
// input is a `src/` sweep, and folding a two-file assertion into it would make every synthesized
// self-check below carry two unrelated files to stay quiet.
export function producerFactProblems({ handlerSource, feedAxisSource }) {
  const problems = [];
  for (const verb of ["startSession", "pingSession"]) {
    const calls = callArgs(handlerSource, verb);
    if (calls.length === 0) {
      problems.push(
        `mesh-session-spawn-handler.mjs makes no \`${verb}(\` call — the third \`.sendTerminalFrame(\` producer no longer registers the session it bridges, so nothing on the wire can state that it is relayed. Either the call was RE-SPELLED (re-aim this clause at the new spelling) or the m50/ADR-008 decision 9 premise this ceiling was raised on is gone.`,
      );
      continue;
    }
    const stating = calls.filter((args) => /\brelaying\s*:\s*true\b/.test(args));
    if (stating.length !== calls.length) {
      problems.push(
        `mesh-session-spawn-handler.mjs: ${calls.length - stating.length} of ${calls.length} \`${verb}(\` call(s) do not pass \`relaying: true\` — the launched session's record would carry no producer fact, the browser's feed axis would read \`no-producer\`, and the operator would be told "no live output" about a pane this very module is streaming bytes into. This is the PREMISE the producer ceiling was raised on (m50/ADR-008 decision 9), not a nicety.`,
      );
    }
  }
  // The signature, read as a signature: `feedAxisFor(row, context)` and nothing else.
  const signature = /export\s+function\s+feedAxisFor\s*\(([^)]*)\)/.exec(feedAxisSource);
  if (signature == null) {
    problems.push("ui/src/home/feed-axis.mjs no longer exports a `feedAxisFor(` function this clause can read — re-aim it rather than delete it; the no-byte-parameter invariant is gated, not advisory.");
  } else {
    const params = signature[1].split(",").map((param) => param.trim()).filter((param) => param.length > 0);
    if (params.length > 2) {
      problems.push(`ui/src/home/feed-axis.mjs: \`feedAxisFor\` takes ${params.length} parameters (${params.join(", ")}) — it takes exactly \`(row, context)\`. A THIRD parameter is how a byte parameter arrives, and there must be none: the browser writes terminal bytes straight into xterm, so a worker's own printed output could FORGE its pane's axis.`);
    }
    if (/\b(?:byte|bytes|chunk|chunks|data|output)\b/i.test(signature[1])) {
      problems.push(`ui/src/home/feed-axis.mjs: \`feedAxisFor\`'s parameter list mentions bytes/chunk/data/output (\`${signature[1].trim()}\`) — the axis is derived from wire FIELDS and roster membership, never from terminal output (SECURITY T14; the invariant is a SIGNATURE rather than a promise).`);
    }
  }
  return problems;
}

// listSourceFiles(dir) — every .ts/.tsx/.mjs file under a directory, recursively.
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

// readSrcSources() — Map<repo-relative path, comment-stripped, CRLF-normalised source> for EVERY
// .mjs under src/. This is the detector's whole input: it starts from the send seam and finds the
// producers wherever they live, so no path in this file can go stale and no file move can make the
// gate vacuous (ADR-006).
async function readSrcSources() {
  const sources = new Map();
  for (const file of await listSourceFiles(SRC_DIR)) {
    sources.set(path.relative(repoRoot, file).split(path.sep).join("/"), await realSource(file));
  }
  return sources;
}

export const archTests = [
  {
    name: "arch/42+46+50 (acd-terminal-output-signal-source): every `.sendTerminalFrame(` producer found by sweeping src/ — wherever it lives, and there must be exactly three — sits in one of the TWO enumerated sanctioned hosts and streams that host's own bytes and nothing else, and the bridge module that builds every envelope references no credential/env/askpass/mint material",
    async run() {
      const bridgeSource = await realSource(BRIDGE);
      const srcSources = await readSrcSources();
      assert.ok(srcSources.size > 100, `the src/ sweep found ${srcSources.size} modules — a sweep that found almost nothing would pass vacuously`);
      assert.deepEqual(
        outputSignalProblems({ bridgeSource, srcSources }),
        [],
        "every discovered producer streams exactly the PTY chunk, and the real bridge references no credential/env/askpass/mint material",
      );

      // THE DEAD SUBJECT IS GONE. The clause this detector used to carry asserted `String(chunk)`
      // about `wireTerminalBridge`; that function had no production caller and m46/01 deleted it.
      // Pin its absence so nobody re-introduces a producer here and re-aims the gate at a corpse.
      assert.ok(
        !/wireTerminalBridge/.test(bridgeSource),
        "wireTerminalBridge is gone from the bridge module (ADR-007) — the detector follows the live producer, never a re-animated corpse",
      );

      // THE PRODUCER IS REAL AND THERE ARE EXACTLY THREE OF IT — today all three in
      // src/mesh/launcher.mjs, but that is an OBSERVATION recorded here, never the detector's
      // input: the sweep above finds them wherever they move to.
      //
      // EXACTLY, not "at least". The floor is m46/ADR-007's (every lane streams); the ceiling is
      // m49/ADR-003's, raised 2 → 3 by m50/ADR-008 decision 9 in the same diff that re-derived the
      // feed axis. Reading the pair back as an EQUALITY here is what makes the shipped tree's green
      // a measured value rather than a satisfied inequality.
      const discovered = [];
      for (const [file, source] of srcSources) {
        for (const _call of source.matchAll(SEND_TERMINAL_FRAME_CALL)) discovered.push(file);
      }
      assert.equal(
        discovered.length,
        SANCTIONED_PRODUCER_SITES,
        `the streamed-output producer must be wired at ALL ${SANCTIONED_PRODUCER_SITES} call sites (the assignment dispatch, createMeshWorkerTerminalResumeHandler, and m50/story 03's session-spawn bridge) and at NO OTHER — found ${discovered.length} in ${discovered.join(", ")}. Below ${SANCTIONED_PRODUCER_SITES}: a lane went dark (m46/ADR-007). Above it: a producer arrived that the browser's feed axis knows nothing about (m49/ADR-003 as re-derived by m50/ADR-008).`,
      );
    },
  },

  {
    // ═══ m50/ADR-008 FF-E's TWO ADDED CLAUSES, over the REAL tree. They are what makes the raise
    //     above a decision with a checked premise rather than a bumped number.
    name: "arch/50 ADR-008 dec.9 (acd-terminal-output-signal-source): the THIRD producer's module states `relaying: true` at both `startSession(` and `pingSession(`, and `feedAxisFor` still takes no byte parameter — the two facts the ceiling raise rests on",
    async run() {
      const [handlerSource, feedAxisSource] = await Promise.all([realSource(SPAWN_HANDLER), realSource(FEED_AXIS)]);
      // NON-VACUITY FIRST: a clause fed an empty file is green for the same reason a correct one is.
      assert.ok(/createMeshWorkerSessionSpawnHandler/.test(handlerSource), "the spawn handler source was actually read (non-vacuous)");
      assert.ok(/feedAxisFor/.test(feedAxisSource), "the feed-axis source was actually read (non-vacuous)");
      assert.deepEqual(
        producerFactProblems({ handlerSource, feedAxisSource }),
        [],
        "the third producer states its fact on both write verbs, and the axis still cannot be reached by a byte",
      );
    },
  },

  {
    name: "arch/50 ADR-008 dec.9 (acd-terminal-output-signal-source) self-check: a spawn handler that registers WITHOUT `relaying: true` trips (on start, on ping, and on a missing verb), and a `feedAxisFor` that grows a third or byte-shaped parameter trips",
    async run() {
      // The clean synthesized shape — the two write verbs, both stating the fact.
      const cleanHandler = stripComments(`
        await startSession(ws, { ...sessionKey, repo, relaying: true, now: resolveNow() });
        const pingHandle = setIntervalImpl(() => Promise.resolve()
          .then(() => pingSession(ws, { ...sessionKey, repo, relaying: true, now: resolveNow() }))
          .catch((error) => reportDegrade("mesh-session-spawn-handler", error)), pingIntervalMs);
        export function createMeshWorkerSessionSpawnHandler(options = {}) { return handleSessionSpawn; }
      `);
      const cleanAxis = stripComments(`
        export function feedAxisFor(row, context) { return workItemAxis(row); }
      `);
      assert.deepEqual(
        producerFactProblems({ handlerSource: cleanHandler, feedAxisSource: cleanAxis }),
        [],
        "the clean synthesized shape stays quiet",
      );

      // PLANT — the START states it and the PING does not. This is the LIVELIEST of the plants:
      // `pingSession` upserts, so a crash-recovered record would be rebuilt without the fact and a
      // pane the operator is typing into would demote to `no live output` mid-session. A gate that
      // checked only `startSession(` would read green over exactly that.
      const pingDropped = cleanHandler.replace("pingSession(ws, { ...sessionKey, repo, relaying: true,", "pingSession(ws, { ...sessionKey, repo,");
      assert.notEqual(pingDropped, cleanHandler, "the plant actually differs from the clean synthesized shape");
      const pingProblems = producerFactProblems({ handlerSource: pingDropped, feedAxisSource: cleanAxis });
      assert.equal(pingProblems.length, 1, `self-check: a ping that drops the fact trips, and only that. Got: ${JSON.stringify(pingProblems)}`);
      assert.match(pingProblems[0], /pingSession/, "…and the refusal names the verb that dropped it");

      // PLANT — the START drops it (the ordinary regression: a new key forgotten at the write site).
      const startDropped = cleanHandler.replace("startSession(ws, { ...sessionKey, repo, relaying: true,", "startSession(ws, { ...sessionKey, repo,");
      assert.notEqual(startDropped, cleanHandler, "the plant actually differs from the clean synthesized shape");
      assert.ok(
        producerFactProblems({ handlerSource: startDropped, feedAxisSource: cleanAxis }).some((problem) => /startSession/.test(problem)),
        "self-check: a start that drops the fact trips, naming the verb",
      );

      // PLANT — the verb is GONE entirely (a re-spelling, or a handler that stopped registering).
      // This must trip rather than pass quietly: zero calls satisfy "every call states it".
      const noVerb = stripComments(`
        export function createMeshWorkerSessionSpawnHandler(options = {}) { return handleSessionSpawn; }
      `);
      const noVerbProblems = producerFactProblems({ handlerSource: noVerb, feedAxisSource: cleanAxis });
      assert.equal(noVerbProblems.length, 2, `self-check: BOTH missing verbs trip — a vacuous "all zero calls state it" is the failure mode. Got: ${JSON.stringify(noVerbProblems)}`);
      assert.ok(noVerbProblems.every((problem) => /RE-SPELLED/.test(problem)), "…and each names re-spelling as a cause, so the clause is re-aimed rather than deleted");

      // PLANT — the byte parameter, in both shapes it could arrive in: a bare third parameter, and
      // a byte-NAMED one. Either would let a worker's own printed output forge its pane's axis.
      const thirdParam = 'export function feedAxisFor(row, context, lastFrame) { return workItemAxis(row); }';
      assert.ok(
        producerFactProblems({ handlerSource: cleanHandler, feedAxisSource: thirdParam }).some((problem) => /THIRD parameter/.test(problem)),
        "self-check: a third parameter on feedAxisFor trips",
      );
      const byteParam = 'export function feedAxisFor(row, context = { bytes: null }) { return workItemAxis(row); }';
      assert.ok(
        producerFactProblems({ handlerSource: cleanHandler, feedAxisSource: byteParam }).some((problem) => /bytes\/chunk\/data\/output/.test(problem)),
        "self-check: a byte-SHAPED parameter trips even when the count is unchanged — the count alone is not the invariant",
      );
    },
  },

  {
    // ═══ m49/ADR-003's HALF, DRIVEN. The floor has been plant-driven since 46/04; the ceiling
    //     arrives with story 49/02 and is driven here the same way — a SYNTHESIZED third call site,
    //     asserted to LAND, fed to the SHIPPED `outputSignalProblems`, with the shipped two proven
    //     quiet in the same test.
    //
    // THE PLANT IS DELIBERATELY SANCTIONED-SHAPED. A malformed third arrow would trip the SHAPE
    // clause and prove nothing about the ceiling — the assertion below therefore requires the
    // ceiling refusal to be the ONLY problem returned, so a green ceiling cannot hide behind a red
    // shape. It is also planted in a SEPARATE module (`src/mesh-board-terminal-bridge.mjs` — the
    // "board bridge" ADR-003 names as the plausible third producer), because a file-local count
    // would be satisfied by moving one arrow.
    name: "arch/49 ADR-003 + 50 ADR-008 (acd-terminal-output-signal-source) self-check: the shrink-only CEILING (now 3) fires on a FOURTH `.sendTerminalFrame(` producer — the change that makes every `no-producer` pane in the terminals home a lie, with no test in either build able to see it — and the m50 BRIDGE-KEY shape is sanctioned by ENUMERATION, not by a relaxed pattern",
    async run() {
      const asSweep = (entries) => new Map(entries.map(([file, source]) => [file, stripComments(source)]));
      const sanctionedArrow = "onOutputChunk: (chunk, sessionId) => client.sendTerminalFrame(sessionId, String(chunk)),";
      // m50/story 03's shape: a BRIDGE KEY, not an output arrow. The gate's second enumerated shape.
      const sanctionedBridgeKey = "sendTerminalFrame: (sessionId, bytes) => client.sendTerminalFrame(sessionId, bytes),";

      const cleanThree = [
        [
          "src/mesh/launcher.mjs",
          `const handler = createMeshWorkerExecutionHandler({ nodeId, ${sanctionedArrow} });
           const terminalResumeHandler = createMeshWorkerTerminalResumeHandler({ nodeId, ${sanctionedArrow} });
           const sessionSpawnHandler = createMeshWorkerSessionSpawnHandler({ nodeId, ${sanctionedBridgeKey} });`,
        ],
      ];
      const cleanProblems = outputSignalProblems({ bridgeSource: "", srcSources: asSweep(cleanThree) });
      assert.deepEqual(cleanProblems, [], `the SHIPPED shape — exactly ${SANCTIONED_PRODUCER_SITES} sanctioned producers, two arrows and one bridge key — stays quiet under the ceiling`);

      // THE ENUMERATION IS DOING THE WORK, NOT A WIDENED PATTERN. Drive the bridge key on its own:
      // it is sanctioned by its OWN named shape, and a MALFORMED one still trips. If the fix had
      // been "relax the arrow to a pattern", the second assertion here would be green.
      const bridgeOnly = [["src/mesh/launcher.mjs", `const h = createMeshWorkerSessionSpawnHandler({ nodeId, ${sanctionedBridgeKey} });`]];
      assert.deepEqual(
        outputSignalProblems({ bridgeSource: "", srcSources: asSweep(bridgeOnly) }).filter((problem) => !/only 1/.test(problem)),
        [],
        "self-check: the m50 bridge key is sanctioned by its own enumerated shape (the FLOOR still objects to it being alone, which is a different clause)",
      );
      const foldedBridge = [["src/mesh/launcher.mjs", "const h = createMeshWorkerSessionSpawnHandler({ nodeId, sendTerminalFrame: (sessionId, bytes) => client.sendTerminalFrame(sessionId, bytes + process.env.ANTHROPIC_API_KEY) });"]];
      assert.ok(
        outputSignalProblems({ bridgeSource: "", srcSources: asSweep(foldedBridge) }).some((problem) => /not exactly/.test(problem)),
        "self-check: a credential folded into the BRIDGE KEY's bytes trips the SHAPE clause — the second sanctioned spelling is as exact as the first, never a loosened pattern",
      );
      const respeltBridge = [["src/mesh/launcher.mjs", "const h = createMeshWorkerSessionSpawnHandler({ nodeId, sendTerminalFrame: (sessionId, bytes) => client.sendTerminalFrame(sessionId, redact(bytes)) });"]];
      assert.ok(
        outputSignalProblems({ bridgeSource: "", srcSources: asSweep(respeltBridge) }).some((problem) => /not exactly/.test(problem)),
        "self-check: a sanitiser inside the bridge key trips too — the lane is content-blind by contract on BOTH sanctioned shapes",
      );

      // THE PLANT: a FOURTH producer, perfectly well-formed, in a new module.
      const plantedFour = [
        ...cleanThree,
        ["src/mesh-board-terminal-bridge.mjs", `const bridge = createBoardTerminalBridge({ nodeId, ${sanctionedArrow} });`],
      ];
      assert.notDeepEqual(plantedFour, cleanThree, "the plant actually differs from the clean three-producer sweep");
      assert.equal(plantedFour.length, cleanThree.length + 1, "the plant genuinely adds a FOURTH call site, in a module of its own");

      const ceilingProblems = outputSignalProblems({ bridgeSource: "", srcSources: asSweep(plantedFour) });
      assert.equal(
        ceilingProblems.length,
        1,
        `self-check: a fourth producer trips the CEILING and NOTHING ELSE — the plant is sanctioned-shaped on purpose, so a ceiling that never fired could not hide behind a shape refusal. Got: ${JSON.stringify(ceilingProblems)}`,
      );
      assert.match(
        ceilingProblems[0],
        /src\/mesh-board-terminal-bridge\.mjs/,
        "the refusal NAMES the file the new producer arrived in — a count with no location sends the next engineer to grep",
      );
      assert.match(
        ceilingProblems[0],
        /no-producer/,
        "…and it names the BROWSER answer that just became wrong, not merely the number",
      );
      assert.match(
        ceilingProblems[0],
        /ADR-003/,
        "…and the ADR that owns the ceiling, so raising it is a decision with a document rather than a diff",
      );
      assert.match(
        ceilingProblems[0],
        /relaying/,
        "…and the m50 re-derivation the raise rests on, so the next author is told the ACTUAL obligation (state the fact) rather than only the number",
      );

      // AND THE TWO REFUSALS ARE DISTINGUISHABLE. Floor and ceiling read the SAME number, so a
      // reviewer who cannot tell which one fired learns nothing from the red line.
      const oneProducer = [["src/mesh/launcher.mjs", `const handler = createMeshWorkerExecutionHandler({ nodeId, ${sanctionedArrow} });`]];
      const floorProblems = outputSignalProblems({ bridgeSource: "", srcSources: asSweep(oneProducer) });
      assert.equal(floorProblems.length, 1, `self-check: one producer still trips the FLOOR. Got: ${JSON.stringify(floorProblems)}`);
      assert.match(floorProblems[0], /production call sites must stream/, "the FLOOR's refusal is m46/ADR-007's — a lane went dark");
      assert.ok(
        !/no-producer/.test(floorProblems[0]) && !/ADR-003/.test(floorProblems[0]),
        "…and it does NOT borrow the ceiling's reason: two invariants on one number, two refusals, and a reviewer can tell which fired from the first line",
      );

      // FIVE is not a special case of four, and a `>` written as `===` would pass this file's other
      // clauses. Driven so the comparison itself is pinned.
      const plantedFive = [
        ...plantedFour,
        ["src/mesh-replay-terminal.mjs", `const replay = createReplayer({ nodeId, ${sanctionedArrow} });`],
      ];
      assert.equal(
        outputSignalProblems({ bridgeSource: "", srcSources: asSweep(plantedFive) }).length,
        1,
        "self-check: FIVE producers trip the ceiling too — the guard is `>` and not an equality against four",
      );
    },
  },

  {
    name: "arch/42+46 (acd-terminal-output-signal-source) self-check: a moved producer is still swept; a credential fold, a second data source, a sanitiser, a half-wired SECOND call site, a vanished producer and a RE-SPELLED one each trip — and the refusal names both causes",
    async run() {
      // A clean SYNTHESIZED producer file carrying the sanctioned arrow at both call sites; every
      // plant below is a hand-written mutation of THIS shape, fed to the detector as a one-entry
      // src/ sweep.
      const asSweep = (source, file = "src/synthesized-producer.mjs") => new Map([[file, stripComments(source)]]);
      const cleanLauncher = stripComments(`
        const handler = createMeshWorkerExecutionHandler({
          nodeId,
          onOutputChunk: (chunk, sessionId) => client.sendTerminalFrame(sessionId, String(chunk)),
          onSessionEnd: (sessionId) => client.sendTerminalEnd(sessionId),
        });
        const terminalResumeHandler = createMeshWorkerTerminalResumeHandler({
          nodeId,
          onOutputChunk: (chunk, sessionId) => client.sendTerminalFrame(sessionId, String(chunk)),
          onSessionEnd: (sessionId) => client.sendTerminalEnd(sessionId),
        });
        const sessionSpawnHandler = createMeshWorkerSessionSpawnHandler({
          nodeId,
          sendTerminalFrame: (sessionId, bytes) => client.sendTerminalFrame(sessionId, bytes),
          sendTerminalEnd: (sessionId) => client.sendTerminalEnd(sessionId),
        });
      `);
      assert.deepEqual(
        outputSignalProblems({ bridgeSource: "", srcSources: asSweep(cleanLauncher) }),
        [],
        "the clean synthesized producer shape stays quiet",
      );
      assert.equal(keyArrowRanges(cleanLauncher, "onOutputChunk").length, 2, "the synthesized baseline carries BOTH output arrows, exactly as production does");
      assert.equal(keyArrowRanges(cleanLauncher, "sendTerminalFrame").length, 1, "…and the m50 bridge key, so the baseline is the shipped THREE and not a two-site fossil");

      // PLANT — THE FILE MOVE (the measured false negative this hardening closes). The real
      // producers move to a NEW module and one of them folds a credential, while the OLD file
      // keeps a sanctioned-shaped but DEAD arrow. A detector that named `src/mesh/launcher.mjs`
      // reads GREEN here — it finds the decoy and never looks at the module the bytes actually
      // travel through. The sweep does.
      const movedProducers = stripComments(`
        const handler = createMeshWorkerExecutionHandler({
          onOutputChunk: (chunk, sessionId) => client.sendTerminalFrame(sessionId, String(chunk) + process.env.AOF_MESH_CLONE_TOKEN),
        });
        const terminalResumeHandler = createMeshWorkerTerminalResumeHandler({
          onOutputChunk: (chunk, sessionId) => client.sendTerminalFrame(sessionId, String(chunk)),
        });
      `);
      const decoyLeftBehind = stripComments(`
        export const WORKER_EXECUTION_DEFAULTS = {
          onOutputChunk: (chunk, sessionId) => client.sendTerminalFrame(sessionId, String(chunk)),
        };
      `);
      const movedSweep = new Map([
        ["src/mesh/launcher.mjs", decoyLeftBehind],
        ["src/mesh-worker-producer.mjs", movedProducers],
      ]);
      assert.notEqual(movedProducers, cleanLauncher, "the plant actually differs from the clean synthesized shape");
      assert.deepEqual(
        outputSignalProblems({ bridgeSource: "", srcSources: new Map([["src/mesh/launcher.mjs", decoyLeftBehind]]) }).map((p) => p.includes("only 1")),
        [true],
        "control: the decoy ALONE is sanctioned-shaped — a path-named detector would have read it and stopped there",
      );
      const movedProblems = outputSignalProblems({ bridgeSource: "", srcSources: movedSweep });
      assert.ok(
        movedProblems.some((problem) => problem.startsWith("src/mesh-worker-producer.mjs")),
        `self-check: a producer that MOVED to another module is still swept, and its defect still trips — the gate cannot be broken by a file move (ADR-006). Got: ${JSON.stringify(movedProblems)}`,
      );

      // PLANT — the credential fold: a token spliced in beside the chunk. THE leak.
      const plantedEnvFold = cleanLauncher.replace(
        "onOutputChunk: (chunk, sessionId) => client.sendTerminalFrame(sessionId, String(chunk)),\n          onSessionEnd: (sessionId) => client.sendTerminalEnd(sessionId),\n        });\n        const terminalResumeHandler",
        'onOutputChunk: (chunk, sessionId) => client.sendTerminalFrame(sessionId, String(chunk) + process.env.AOF_MESH_CLONE_TOKEN),\n          onSessionEnd: (sessionId) => client.sendTerminalEnd(sessionId),\n        });\n        const terminalResumeHandler',
      );
      assert.notEqual(plantedEnvFold, cleanLauncher, "the plant actually differs from the clean synthesized shape");
      assert.ok(
        outputSignalProblems({ bridgeSource: "", srcSources: asSweep(plantedEnvFold) }).length > 0,
        "self-check: a credential folded into the streamed chunk at the LIVE producer trips the detector",
      );

      // PLANT — a SECOND data source replacing the chunk (an askpass file read).
      const plantedSecondSource = cleanLauncher.replaceAll(
        "client.sendTerminalFrame(sessionId, String(chunk))",
        'client.sendTerminalFrame(sessionId, readFileSync(askpassPath, "utf8"))',
      );
      assert.notEqual(plantedSecondSource, cleanLauncher, "the plant actually differs from the clean synthesized shape");
      assert.ok(
        outputSignalProblems({ bridgeSource: "", srcSources: asSweep(plantedSecondSource) }).length > 0,
        "self-check: streaming anything OTHER than the callback's own chunk trips the detector",
      );

      // PLANT — a "helpful" sanitiser: the producer rewrites the bytes. The lane is content-blind
      // by contract; a half-working scrub is worse than none.
      const plantedSanitiser = cleanLauncher.replaceAll(
        "client.sendTerminalFrame(sessionId, String(chunk))",
        "client.sendTerminalFrame(sessionId, redactSecrets(String(chunk)))",
      );
      assert.notEqual(plantedSanitiser, cleanLauncher, "the plant actually differs from the clean synthesized shape");
      assert.ok(
        outputSignalProblems({ bridgeSource: "", srcSources: asSweep(plantedSanitiser) }).length > 0,
        "self-check: a producer that rewrites the chunk trips — the streamed bytes are the chunk, untouched",
      );

      // PLANT — the RESUME call site half-wired: the assignment lane streams, the resumed one
      // folds a secret. A detector that only read the FIRST arrow would pass this; reading EVERY
      // arrow is what makes two call sites one contract.
      const plantedResumeOnly = cleanLauncher.replace(
        "const terminalResumeHandler = createMeshWorkerTerminalResumeHandler({\n          nodeId,\n          onOutputChunk: (chunk, sessionId) => client.sendTerminalFrame(sessionId, String(chunk)),",
        "const terminalResumeHandler = createMeshWorkerTerminalResumeHandler({\n          nodeId,\n          onOutputChunk: (chunk, sessionId) => client.sendTerminalFrame(sessionId, String(chunk) + process.env.ANTHROPIC_API_KEY),",
      );
      assert.notEqual(plantedResumeOnly, cleanLauncher, "the plant actually differs from the clean synthesized shape");
      assert.ok(
        outputSignalProblems({ bridgeSource: "", srcSources: asSweep(plantedResumeOnly) }).length > 0,
        "self-check: a defect on the SECOND call site alone trips — every producer is read, not just the first",
      );

      // PLANT — THE VACUITY ITSELF: the producer removed entirely. This is the exact failure
      // ADR-007 was written about (a gate whose subject no longer runs), and it must TRIP rather
      // than pass quietly.
      const plantedNoProducer = cleanLauncher
        .replaceAll("onOutputChunk: (chunk, sessionId) => client.sendTerminalFrame(sessionId, String(chunk)),\n          ", "")
        .replaceAll("sendTerminalFrame: (sessionId, bytes) => client.sendTerminalFrame(sessionId, bytes),\n          ", "");
      assert.notEqual(plantedNoProducer, cleanLauncher, "the plant actually differs from the clean synthesized shape");
      assert.equal(keyArrowRanges(plantedNoProducer, "onOutputChunk").length, 0, "the plant genuinely removed every output arrow");
      assert.equal(keyArrowRanges(plantedNoProducer, "sendTerminalFrame").length, 0, "…and the bridge key too, so this really is the zero-producer tree and not a one-producer one");
      const noProducerProblems = outputSignalProblems({ bridgeSource: "", srcSources: asSweep(plantedNoProducer) });
      assert.ok(
        noProducerProblems.length > 0,
        "self-check: NO producer at all TRIPS — a detector with no subject asserts nothing, which is worse than no detector",
      );
      // …and the refusal NAMES BOTH CAUSES. "Gone" and "re-spelled" produce the same empty result,
      // and telling an engineer the producer vanished when it is right there under a different
      // spelling is how a gate gets deleted instead of re-aimed.
      assert.ok(
        noProducerProblems.every((problem) => /RE-SPELLED/.test(problem) && /RE-AIM this detector/.test(problem)),
        `self-check: the empty-result refusal names BOTH causes (gone OR re-spelled) and says re-aim, never delete. Got: ${JSON.stringify(noProducerProblems)}`,
      );

      // PLANT — THE RE-SPELLING ITSELF, which is the likelier of the two causes. The producer is
      // present and correct, but wired by SHORTHAND (`onOutputChunk,` — the spelling
      // src/mesh/worker-execution.mjs already uses at three of its own call sites), so there is no
      // `onOutputChunk:` property VALUE to read. The detector must trip (its shape assertion has
      // gone blind) AND must say so honestly, rather than either passing quietly or claiming the
      // producer is gone.
      const plantedShorthand = stripComments(`
        const onOutputChunk = (chunk, sessionId) => client.sendTerminalFrame(sessionId, String(chunk));
        const handler = createMeshWorkerExecutionHandler({ nodeId, onOutputChunk, onSessionEnd });
        const terminalResumeHandler = createMeshWorkerTerminalResumeHandler({ nodeId, onOutputChunk, onSessionEnd });
      `);
      assert.notEqual(plantedShorthand, cleanLauncher, "the plant actually differs from the clean synthesized shape");
      assert.equal(keyArrowRanges(plantedShorthand, "onOutputChunk").length, 0, "the plant genuinely carries no `onOutputChunk:` property value — the shorthand is real");
      const shorthandProblems = outputSignalProblems({ bridgeSource: "", srcSources: asSweep(plantedShorthand) });
      assert.ok(
        shorthandProblems.some((problem) => /sits OUTSIDE every sanctioned producer host/.test(problem) && /RE-SPELLED/.test(problem)),
        `self-check: a re-spelled (shorthand) producer trips, and the refusal names re-spelling as a cause. Got: ${JSON.stringify(shorthandProblems)}`,
      );

      // ── the BRIDGE-side plants (the NEGATIVE half, unchanged in strength) ──
      const cleanBridge = 'export function buildTerminalFrameEnvelope(nodeId, sessionId, bytes) { return { kind: TERMINAL_FRAME_KIND, nodeId, signal: { sessionId: sessionId ?? null, bytes } }; }';
      assert.deepEqual(
        outputSignalProblems({ bridgeSource: cleanBridge, srcSources: asSweep(cleanLauncher) }),
        [],
        "the clean synthesized bridge shape stays quiet",
      );

      const plantedEnvRead = 'export function buildTerminalFrameEnvelope(nodeId, sessionId, bytes) { const token = process.env.AOF_MESH_CLONE_TOKEN; return { kind: TERMINAL_FRAME_KIND, nodeId, signal: { sessionId: sessionId ?? null, bytes: bytes + token } }; }';
      assert.notEqual(plantedEnvRead, cleanBridge, "the plant actually differs from the clean synthesized shape");
      assert.ok(
        outputSignalProblems({ bridgeSource: plantedEnvRead, srcSources: asSweep(cleanLauncher) }).length > 0,
        "self-check: a planted process.env credential read in the envelope builder trips the detector",
      );

      const plantedAskpassRead = 'export function buildTerminalFrameEnvelope(nodeId, sessionId, bytes) { const askpass = loadOneShotAskpassFile(); return { kind: TERMINAL_FRAME_KIND, nodeId, signal: { sessionId: sessionId ?? null, bytes: bytes + askpass } }; }';
      assert.notEqual(plantedAskpassRead, cleanBridge, "the plant actually differs from the clean synthesized shape");
      assert.ok(
        outputSignalProblems({ bridgeSource: plantedAskpassRead, srcSources: asSweep(cleanLauncher) }).length > 0,
        "self-check: a planted askpass-file read in the envelope builder trips the detector",
      );
    },
  },
];
