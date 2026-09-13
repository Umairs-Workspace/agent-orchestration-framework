// Fitness function: acd-session-producer-fact-survives-the-wire (milestone 50 / story 04;
// ARCHITECTURE ADR-008 FF-F).
//
//   "`relaying` — the worker's stated fact that something is bridging this session's PTY
//    output — survives all FOUR hops from the session record to the browser's feed axis,
//    the hop that must NOT change does not, and the wire carries a BOOLEAN and never a name."
//
// ═══ WHY THIS IS A GATE AND NOT A TEST ════════════════════════════════════════════════
// The failure mode is one NOTHING ELSE CAN SEE. Each hop is a projection with its own unit
// tests, and each of those tests is written against the keys that hop knows about. Drop the
// key at hop 2 and: `mesh-session`'s tests are green (the record has it), `feed-axis`'s
// tests are green (the row it is handed has it), `mesh-presence`'s tests are green (nothing
// asserts a key it never emitted) — and the BROWSER keeps answering confidently from a
// field that never arrives. Every pane a launched session owns silently reverts to
// `no live output — no assignment is relaying this session`, on a session that is streaming.
//
// So the chain is asserted END TO END, as a chain, in one place. THE FOUR HOPS:
//   1. `assembleSessionRecord` (mesh-session.mjs) — the m48/ADR-002 frozen SEVEN gains an
//      APPENDED eighth;
//   2. `readLiveSessions`'s pushed entry (mesh-presence.mjs) — the m48/ADR-005 frozen
//      ordered SIX gains an APPENDED seventh, at the TAIL, never a reorder;
//   3. `safeSessionArray` (control-stream-server.mjs) — **NO CHANGE, AND THAT IS A
//      DECISION.** It filters non-objects and passes each entry VERBATIM. Teaching it a key
//      whitelist would end the very property the m38 fabric bug was fixed by, and every
//      future session key would need an edit here that nobody would remember to make. The
//      non-change is asserted BESIDE the three changes rather than left to be discovered;
//   4. `buildSessionIndex`'s entry (global-mesh-query.mjs) — the unconditional EIGHT gains
//      an appended ninth, read with a strict `=== true`.
// …and then (e) the browser's derivation reads it, with `no-producer` reachable ONLY when
// BOTH positive statements are absent (the fail-closed half), and (f) the wire carries a
// BOOLEAN — no `producer`/`launched`/`launcher` string appears on a session entry — which
// is how ADR-008 decision 8's no-second-class property is held STRUCTURALLY rather than by
// review. SPEC: "a launcher that produces a second class of session defeats its own purpose".
//
// Each clause carries a planted-violation self-check, and the chain half is driven with
// REAL values through the SHIPPED functions as well as grepped, because a key that is
// present in the source and dropped by a guard is exactly the shape a source sweep misses.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assembleSessionRecord } from "../../../src/mesh/session.mjs";
import { feedAxisFor, FEED_PRODUCER_KNOWN, FEED_NO_PRODUCER } from "../../../ui/src/home/feed-axis.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SESSION = path.join(repoRoot, "src", "mesh", "session.mjs");
const PRESENCE = path.join(repoRoot, "src", "mesh", "presence.mjs");
const CONTROL = path.join(repoRoot, "src", "control-stream-server.mjs");
const QUERY = path.join(repoRoot, "src", "global-mesh-query.mjs");
const FEED_AXIS = path.join(repoRoot, "ui", "src", "home", "feed-axis.mjs");

// LINE COMMENTS FIRST, BLOCK COMMENTS SECOND (TECH_DEBT item 24) — and it matters here more
// than usual: every one of these five files documents the key in prose beside the code, so a
// sweep over un-stripped source would be green on a tree where the key exists only in the
// comments.
function stripComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function lf(source) {
  return source.replace(/\r\n/g, "\n");
}

async function realSource(file) {
  return lf(stripComments(await readFile(file, "utf8")));
}

const FIELD = "relaying";

// functionBody(source, name) — a named function's body, cut by BRACE BALANCE after its
// parameter list closes. Never an indentation-shaped `\n}` needle and never a character
// window: both are wrong about a correct file the moment it is re-indented or grows a line,
// and a mis-cut region makes an ABSENCE clause silently green.
function functionBody(source, name) {
  const declaration = new RegExp(`function\\s+${name}\\s*\\(`).exec(source);
  if (declaration == null) return null;
  let parens = 0;
  let close = -1;
  for (let i = declaration.index + declaration[0].length - 1; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "(") parens += 1;
    else if (ch === ")") {
      parens -= 1;
      if (parens === 0) { close = i; break; }
    }
  }
  if (close < 0) return null;
  const open = source.indexOf("{", close);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return null;
}

// hopProblems(...) — the FOUR hops, over comment-stripped sources. Every positive clause
// carries its own NON-VACUITY needle (the anchor the key must sit beside), so a renamed or
// reshaped function fails LOUDLY as "not found" rather than passing as "absent, fine".
export function hopProblems({ sessionSource, presenceSource, controlSource, querySource }) {
  const problems = [];

  // HOP 1 — the record's own literal. Cut the FUNCTION, not the file: `pingSession`'s sticky
  // disjunction one screen down also contains `relaying: relaying === true`, so a whole-file
  // needle would read the ping's spelling and call the record's absence satisfied.
  const assemble = functionBody(sessionSource, "assembleSessionRecord");
  if (assemble == null) {
    problems.push("mesh-session.mjs has no `assembleSessionRecord(` — NOT FOUND rather than a claim about the rule: re-aim hop 1 at the new spelling.");
  } else if (!new RegExp(`${FIELD}\\s*:\\s*${FIELD}\\s*===\\s*true`).test(assemble)) {
    problems.push(`hop 1: mesh-session.mjs's assembleSessionRecord does not emit \`${FIELD}: ${FIELD} === true\` — the record is the ORIGIN of this fact, and a record without it makes all three downstream hops carry nothing. Strict \`=== true\`, so an unstated fact is false rather than undefined.`);
  }
  // …and the ping must carry it through, STICKY.
  const ping = functionBody(sessionSource, "pingSession");
  if (ping == null) {
    problems.push("mesh-session.mjs has no `pingSession(` — NOT FOUND rather than a claim about the rule.");
  } else if (!new RegExp(`${FIELD}\\s*:\\s*${FIELD}\\s*===\\s*true\\s*\\|\\|\\s*existing\\?\\.${FIELD}\\s*===\\s*true`).test(ping)) {
    problems.push(`hop 1: mesh-session.mjs's pingSession does not resolve \`${FIELD}\` as the DISJUNCTION \`${FIELD} === true || existing?.${FIELD} === true\` — a ping that omits the field (or states it false) would DEMOTE a live, typeable pane to "no live output" mid-session. Sticky, mirroring the \`repo: existing?.repo ?? repo\` carry-forward beside it.`);
  }

  // HOP 2 — the presence projection's pushed literal, APPENDED AT THE TAIL.
  if (!/function\s+readLiveSessions\s*\(/.test(presenceSource)) {
    problems.push("mesh-presence.mjs has no `readLiveSessions(` — NOT FOUND rather than a claim about the rule.");
  } else {
    if (!new RegExp(`${FIELD}\\s*:\\s*record\\.${FIELD}\\s*===\\s*true`).test(presenceSource)) {
      problems.push(`hop 2: mesh-presence.mjs's readLiveSessions does not project \`${FIELD}: record.${FIELD} === true\` — THE PROJECTION THAT SILENTLY DROPS THE KEY IS THE WHOLE FAILURE MODE: the record has it, the browser reads it, and the wire between them carries nothing, with every test on both sides green.`);
    }
    // THE TAIL, not merely presence. m48/ADR-005 froze this entry's ORDER and declares the
    // only legal growth as "an INSERTION at the head and an APPEND at the tail, NEVER a
    // reorder". A key spliced into the middle is a reorder of everything after it.
    const workspaceHasRunAt = presenceSource.search(/workspaceHasRun\s*:/);
    const relayingAt = presenceSource.search(new RegExp(`${FIELD}\\s*:\\s*record\\.${FIELD}`));
    if (workspaceHasRunAt >= 0 && relayingAt >= 0 && relayingAt < workspaceHasRunAt) {
      problems.push(`hop 2: mesh-presence.mjs projects \`${FIELD}\` BEFORE \`workspaceHasRun\` — m48/ADR-005 froze this entry's order and permits an APPEND AT THE TAIL, never a reorder of the keys already there.`);
    }
  }

  // HOP 3 — THE NON-CHANGE, asserted as a negative. This is the hop that must not learn a
  // key, and it is written down beside the three that must.
  const safe = functionBody(controlSource, "safeSessionArray");
  if (safe == null) {
    problems.push("control-stream-server.mjs has no `safeSessionArray(` this detector can cut — NOT FOUND rather than a claim about the rule.");
  } else {
    if (safe.includes(FIELD) || /workspaceHasRun|sessionId\s*:|lastPingAt/.test(safe)) {
      problems.push(`hop 3: control-stream-server.mjs's safeSessionArray names session KEYS — it must stay a SHAPE filter (non-objects out, every entry passed VERBATIM). A key whitelist here ends the property the m38 fabric bug was fixed by, and would silently drop every future session field. THE NON-CHANGE IS THE DECISION (ADR-008 decision 8, hop 3).`);
    }
    if (!/typeof\s+entry\s*===\s*["']object["']/.test(safe)) {
      problems.push("hop 3: control-stream-server.mjs's safeSessionArray no longer filters by SHAPE (`typeof entry === \"object\"`) — NOT FOUND rather than a claim about the rule; the negative clause above is meaningless over a function that has become something else.");
    }
  }

  // HOP 4 — the session index entry, unconditional and strict.
  if (!/function\s+buildSessionIndex\s*\(/.test(querySource)) {
    problems.push("global-mesh-query.mjs has no `buildSessionIndex(` — NOT FOUND rather than a claim about the rule.");
  } else {
    if (!new RegExp(`${FIELD}\\s*:\\s*session\\.${FIELD}\\s*===\\s*true`).test(querySource)) {
      problems.push(`hop 4: global-mesh-query.mjs's buildSessionIndex entry does not carry \`${FIELD}: session.${FIELD} === true\` — UNCONDITIONAL and strict-read, exactly as \`workspaceHasRun\` beside it: a node that STATES nothing has not stated this, and an unstated fact is false rather than undefined or thrown.`);
    }
    // APPENDED AFTER `workItem`, which is the other half of the browser's disjunction — the
    // two inputs of one derivation sitting together is the point.
    const workItemAt = querySource.search(/workItem\s*:\s*sessionWorkItem/);
    const relayingAt = querySource.search(new RegExp(`${FIELD}\\s*:\\s*session\\.${FIELD}`));
    if (workItemAt >= 0 && relayingAt >= 0 && relayingAt < workItemAt) {
      problems.push(`hop 4: global-mesh-query.mjs places \`${FIELD}\` BEFORE \`workItem\` — ADR-008 decision 8 appends it AFTER, so the axis's two inputs read together and the eight keys before them keep their order.`);
    }
    // A CONDITIONAL KEY IS THE SUBTLE VERSION OF DROPPING IT: present sometimes is
    // indistinguishable, to a browser, from a build that never states it.
    if (new RegExp(`if\\s*\\([^)]*${FIELD}[^)]*\\)\\s*\\{?\\s*entry\\.${FIELD}`).test(querySource)) {
      problems.push(`hop 4: global-mesh-query.mjs sets \`${FIELD}\` CONDITIONALLY — the key is unconditional. A key that is sometimes absent is a key a reader cannot distinguish from a build that does not state it.`);
    }
  }

  return problems;
}

// (f) THE WIRE CARRIES A BOOLEAN, NEVER A NAME. ADR-008 rejected
// `producer: "launcher" | "assignment"` because it hands any future build the means to MARK
// a launched session — SPEC's named anti-goal and DESIGN §S4's explicit GAP. With a boolean
// the payload CANNOT distinguish the two populations, so no-second-class is structural.
// THE KEY, not the value's shape. `producer: "launcher"` and
// `producer: row.relaying === true ? "launcher" : "assignment"` are the same defect, and a
// detector that required the value to BEGIN with a quote would see only the first — which
// is the less likely of the two, because the second is what a build actually writes when it
// derives the marker from the boolean it already has. Measured: none of these keys appears
// in either projection module today, so the KEY alone is a clean, sharp needle.
const FORBIDDEN_SESSION_MARKERS = Object.freeze(["producer", "producedBy", "launched", "launcher", "spawnKind", "sessionKind", "sessionSource"]);
// …and the vocabulary itself, as VALUES, so a marker smuggled under an innocent key name is
// caught too. `relaying` is a boolean: neither of these files has any business minting one
// of these strings onto a session.
const FORBIDDEN_SESSION_MARKER_VALUES = Object.freeze(['"launcher"', '"launched"', '"spawned"']);

export function noSecondClassProblems({ presenceSource, querySource }) {
  const problems = [];
  const reason = `A named producer hands any renderer the means to MARK a launched session, which SPEC forbids ("a launcher that produces a second class of session defeats its own purpose") and DESIGN §S4 calls a GAP. The wire carries a BOOLEAN (\`${FIELD}\`) precisely so the payload CANNOT distinguish the two populations: the distinction must be IMPOSSIBLE, not merely discouraged.`;
  for (const [name, source] of [["mesh-presence.mjs (readLiveSessions)", presenceSource], ["global-mesh-query.mjs (buildSessionIndex)", querySource]]) {
    for (const marker of FORBIDDEN_SESSION_MARKERS) {
      if (new RegExp(`\\b${marker}\\s*:`).test(source)) {
        problems.push(`${name} puts a \`${marker}:\` key on a session projection. ${reason}`);
      }
    }
    for (const value of FORBIDDEN_SESSION_MARKER_VALUES) {
      if (source.includes(value)) {
        problems.push(`${name} mints the string ${value} onto a session projection. ${reason}`);
      }
    }
  }
  return problems;
}

export const archTests = [
  {
    name: "arch/50 ADR-008 FF-F (acd-session-producer-fact-survives-the-wire): `relaying` is emitted at hops 1, 2 and 4, hop 3 (safeSessionArray) is still a verbatim SHAPE filter with no key whitelist, and no session projection carries a producer NAME",
    async run() {
      const [sessionSource, presenceSource, controlSource, querySource] = await Promise.all([
        realSource(SESSION), realSource(PRESENCE), realSource(CONTROL), realSource(QUERY),
      ]);
      // NON-VACUITY: each file was read and survived the stripper.
      assert.ok(/startSession/.test(sessionSource) && /readLiveSessions/.test(presenceSource), "the record and presence sources were actually read");
      assert.ok(/safeSessionArray/.test(controlSource) && /buildSessionIndex/.test(querySource), "the control and query sources were actually read");

      assert.deepEqual(hopProblems({ sessionSource, presenceSource, controlSource, querySource }), [], "the fact is emitted at every hop that must emit it, and the hop that must not change has not");
      assert.deepEqual(noSecondClassProblems({ presenceSource, querySource }), [], "the wire carries a boolean and never a producer name");
    },
  },

  {
    name: "arch/50 ADR-008 FF-F (acd-session-producer-fact-survives-the-wire) self-check: a drop at ANY of hops 1/2/4, a non-sticky ping, a mid-entry insertion, a key whitelist smuggled into safeSessionArray, and a NAMED producer on the wire each trip",
    async run() {
      const clean = {
        sessionSource: lf(stripComments(`
          export function assembleSessionRecord({ nodeId, repo, startedAt, lastPingAt, relaying }) {
            return { nodeId, repo, startedAt, lastPingAt, relaying: relaying === true };
          }
          export async function pingSession(workspace, { repo, relaying = false, now }, options = {}) {
            const record = assembleSessionRecord({ repo: existing?.repo ?? repo, relaying: relaying === true || existing?.relaying === true });
            return record;
          }
        `)),
        presenceSource: lf(stripComments(`
          export async function readLiveSessions(workspace, nodeId, options = {}) {
            live.push({ sessionId: record.sessionId ?? null, lastPingAt: record.lastPingAt, workspaceHasRun: workspacesWithRuns.has(record.workspaceId), relaying: record.relaying === true });
          }
        `)),
        controlSource: lf(stripComments(`
          function safeSessionArray(value) {
            return Array.isArray(value) ? value.filter((entry) => entry != null && typeof entry === "object" && !Array.isArray(entry)) : [];
          }
        `)),
        querySource: lf(stripComments(`
          export function buildSessionIndex(nodes, rows) {
            const entry = { nodeId, sessionId, workspaceHasRun: session.workspaceHasRun === true, workItem: sessionWorkItem(rowsByNodeSession, nodeId, sessionId), relaying: session.relaying === true };
          }
        `)),
      };
      assert.deepEqual(hopProblems(clean), [], "self-check: the clean synthesized chain stays quiet");
      assert.deepEqual(noSecondClassProblems(clean), [], "…and carries no producer name");

      // PLANT — HOP 1 DROPPED. The record never states the fact, so nothing downstream can.
      const hop1 = { ...clean, sessionSource: clean.sessionSource.replace("relaying: relaying === true }", "}") };
      assert.notEqual(hop1.sessionSource, clean.sessionSource, "the plant actually differs from the clean synthesized shape");
      assert.ok(hopProblems(hop1).some((problem) => /^hop 1/.test(problem)), "self-check: a record that stops stating the fact trips hop 1");

      // PLANT — A NON-STICKY PING. The subtlest of the five: start states it, the record is
      // written, and then a ping thirty seconds later quietly rebuilds it WITHOUT the field
      // and the operator's pane goes read-only mid-keystroke.
      const nonSticky = { ...clean, sessionSource: clean.sessionSource.replace("relaying: relaying === true || existing?.relaying === true", "relaying: relaying === true") };
      assert.notEqual(nonSticky.sessionSource, clean.sessionSource, "the plant actually differs from the clean synthesized shape");
      const stickyProblems = hopProblems(nonSticky);
      assert.ok(stickyProblems.some((problem) => /DEMOTE a live, typeable pane/.test(problem)), `self-check: a non-sticky ping trips, and the refusal names the consequence. Got: ${JSON.stringify(stickyProblems)}`);

      // PLANT — HOP 2 DROPPED. THE headline failure: the browser keeps answering
      // confidently from a field that never arrives, with every test on both sides green.
      const hop2 = { ...clean, presenceSource: clean.presenceSource.replace(", relaying: record.relaying === true", "") };
      assert.notEqual(hop2.presenceSource, clean.presenceSource, "the plant actually differs from the clean synthesized shape");
      const hop2Problems = hopProblems(hop2);
      assert.ok(hop2Problems.some((problem) => /^hop 2/.test(problem)), "self-check: a projection that drops the key trips hop 2");
      assert.ok(hop2Problems.some((problem) => /WHOLE FAILURE MODE/.test(problem)), "…and the refusal names WHY no other test can see it");

      // PLANT — A MID-ENTRY INSERTION at hop 2. m48/ADR-005 permits an append at the tail;
      // a splice reorders every key after it, on a projection another milestone froze.
      const reordered = { ...clean, presenceSource: clean.presenceSource.replace(
        "workspaceHasRun: workspacesWithRuns.has(record.workspaceId), relaying: record.relaying === true",
        "relaying: record.relaying === true, workspaceHasRun: workspacesWithRuns.has(record.workspaceId)",
      ) };
      assert.notEqual(reordered.presenceSource, clean.presenceSource, "the plant actually differs from the clean synthesized shape");
      assert.ok(hopProblems(reordered).some((problem) => /never a reorder/.test(problem)), "self-check: a key spliced BEFORE workspaceHasRun trips the tail-append rule");

      // PLANT — HOP 3 TAUGHT A KEY WHITELIST. This is the "helpful" edit: make the wire hop
      // explicit about which session keys it carries. It ends the verbatim property the m38
      // fabric bug was fixed by, and silently drops every future field.
      const whitelisted = { ...clean, controlSource: lf(stripComments(`
        function safeSessionArray(value) {
          return Array.isArray(value)
            ? value.filter((entry) => entry != null && typeof entry === "object").map((entry) => ({ sessionId: entry.sessionId, lastPingAt: entry.lastPingAt, workspaceHasRun: entry.workspaceHasRun, relaying: entry.relaying }))
            : [];
        }
      `)) };
      const whitelistProblems = hopProblems(whitelisted);
      assert.ok(whitelistProblems.some((problem) => /^hop 3/.test(problem)), "self-check: a key whitelist smuggled into safeSessionArray trips");
      assert.ok(whitelistProblems.some((problem) => /THE NON-CHANGE IS THE DECISION/.test(problem)), "…and the refusal says the non-change is deliberate, which is the whole reason this clause exists");

      // PLANT — HOP 4 DROPPED, and hop 4 CONDITIONAL.
      const hop4 = { ...clean, querySource: clean.querySource.replace(", relaying: session.relaying === true", "") };
      assert.notEqual(hop4.querySource, clean.querySource, "the plant actually differs from the clean synthesized shape");
      assert.ok(hopProblems(hop4).some((problem) => /^hop 4/.test(problem)), "self-check: an index entry that drops the key trips hop 4");
      const looseRead = { ...clean, querySource: clean.querySource.replace("relaying: session.relaying === true", "relaying: session.relaying") };
      assert.ok(hopProblems(looseRead).some((problem) => /strict-read/.test(problem)), "self-check: a non-strict read trips — an older node that states the STRING \"true\" must read false, not true");

      // PLANT — A NAMED PRODUCER ON THE WIRE (f). The richer-for-diagnostics option ADR-008
      // rejected: it hands a renderer the means to mark a launched session.
      const named = { ...clean, querySource: clean.querySource.replace("relaying: session.relaying === true", 'producer: session.relaying === true ? "launcher" : "assignment"') };
      assert.notEqual(named.querySource, clean.querySource, "the plant actually differs from the clean synthesized shape");
      const namedProblems = noSecondClassProblems(named);
      assert.ok(namedProblems.length > 0, `self-check: a NAMED producer on a session projection trips. Got: ${JSON.stringify(namedProblems)}`);
      assert.ok(namedProblems.some((problem) => /second class of session/.test(problem)), "…quoting SPEC's anti-goal, because the rule is about a product promise and not about a type");
    },
  },

  {
    // ═══ THE CHAIN, DRIVEN WITH REAL VALUES THROUGH THE SHIPPED FUNCTIONS. A source sweep
    //     cannot see a key that is emitted and then dropped by a guard one hop later, and
    //     that is precisely the shape this gate is about. Hops 1, 3 and the browser's
    //     derivation are pure and reachable directly; hops 2 and 4 need a filesystem and a
    //     store and are covered by the story's own behavioural suite.
    name: "arch/50 ADR-008 FF-F (acd-session-producer-fact-survives-the-wire, behavioural): a real record carries the fact, the verbatim wire hop preserves it, and the browser's axis is the DISJUNCTION — fail-closed on a strict === true",
    async run() {
      const record = assembleSessionRecord({ nodeId: "n1", workspaceId: "ws", repo: "aof", assistant: "claude", sessionId: "s-1", startedAt: "t0", lastPingAt: "t0", relaying: true });
      assert.equal(record.relaying, true, "hop 1: the record states the fact");
      assert.deepEqual(
        Object.keys(record),
        ["nodeId", "workspaceId", "repo", "assistant", "sessionId", "startedAt", "lastPingAt", "relaying"],
        "…APPENDED as the eighth key, with m48/ADR-002's frozen seven in their existing order (an insertion would be a reorder of a shape another milestone froze)",
      );
      assert.equal(assembleSessionRecord({ nodeId: "n1" }).relaying, false, "…and a record that states nothing reads FALSE, never undefined — the key is always present");

      // HOP 3 IS NOT DRIVEN HERE, DELIBERATELY. `safeSessionArray` is module-private, and
      // EXPORTING IT TO TEST IT WOULD BE A CHANGE TO THE ONE HOP THIS ADR SAYS MUST NOT
      // CHANGE — a gate that edits its own subject to observe it is the shape this file
      // exists to refuse. Its non-change is asserted STRUCTURALLY above, and it is driven
      // end-to-end through the REAL `applyPresenceFrame` in the story's own behavioural
      // suite (test/session/session-spawn-outcome-lane.test.mjs), where a key the control has never
      // heard of is put on the wire and read back off the far side.

      // THE BROWSER'S DERIVATION — the disjunction, both directions, and the fail-closed half.
      assert.equal(feedAxisFor({ nodeId: "n1", sessionId: "s-1", workItem: null, relaying: true }, null), FEED_PRODUCER_KNOWN, "a launched session (no assignment, relayed) is producer-known");
      assert.equal(feedAxisFor({ nodeId: "n1", sessionId: "s-1", workItem: { ref: "50/04", assignmentId: "a-1" } }, null), FEED_PRODUCER_KNOWN, "an assignment session is unchanged — its positive statement is still workItem");
      assert.equal(feedAxisFor({ nodeId: "n1", sessionId: "s-1", workItem: null }, null), FEED_NO_PRODUCER, "a free session nothing relays stays no-producer — the operator's own hand-started `claude` is exactly this population");
      for (const stated of [false, "true", 1, "yes", {}, null, undefined]) {
        assert.equal(
          feedAxisFor({ nodeId: "n1", sessionId: "s-1", workItem: null, relaying: stated }, null),
          FEED_NO_PRODUCER,
          `a \`relaying\` of ${JSON.stringify(stated)} is not a stated TRUE — strict === true, so it fails CLOSED (an older node that states the string "true" must not light up a pane with a socket that never delivers a byte)`,
        );
      }
    },
  },

  {
    name: "arch/50 ADR-008 FF-F (acd-session-producer-fact-survives-the-wire): the browser's axis still takes no byte parameter and defines no new state word — the derivation gained an input, not a vocabulary",
    async run() {
      const feedAxisSource = await realSource(FEED_AXIS);
      // The axis's CLOSED SET is unchanged: three values, and the module still imports its
      // state words rather than declaring any. ADR-008 decision 8: the wire states a
      // TRANSPORT fact (`relaying`); the browser keeps its own word (`producer-known`).
      // Neither vocabulary crosses.
      assert.match(feedAxisSource, /FEED_AXIS_VALUES\s*=\s*Object\.freeze\(\[FEED_PRODUCER_KNOWN,\s*FEED_NO_PRODUCER,\s*FEED_ROSTER_GONE\]\)/, "the axis is still exactly three values");
      assert.ok(!/relaying\s*=\s*["']/.test(feedAxisSource), "…and `relaying` never becomes a STATE WORD in the browser — it is a field it reads, not a value it returns");
      assert.ok(
        !/\bfeedAxisFor\s*\([^)]*\b(?:byte|bytes|chunk|data)\b/i.test(feedAxisSource),
        "…and no byte reaches the derivation: the browser writes those bytes straight into xterm, so a worker's own printed output could FORGE its pane's axis (SECURITY T14, gated)",
      );
    },
  },
];
