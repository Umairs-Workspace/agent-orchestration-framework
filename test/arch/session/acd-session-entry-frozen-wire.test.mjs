// Fitness function: acd-session-entry-frozen-wire (milestone 48 / ADR-005, with
// ADR-001's present-and-null clause and ADR-009's one-home clause) —
// "the presence session ENTRY is a FROZEN, ORDERED SIX, and the wire stays a
// pass-through".
//
// THE INVARIANT. `readLiveSessions` (src/mesh/presence.mjs) projects every live session
// record to EXACTLY
//   { sessionId, workspaceId, repo, assistant, lastPingAt, workspaceHasRun }
// in that order — an INSERTION at the head and an APPEND at the tail, never a reorder
// (m38/ADR-001's additive discipline applied one level down, from the record to the
// entry). Both new keys are ALWAYS PRESENT: `sessionId` is `string | null` (ADR-001 —
// a session with no resolvable id is LIVE but NOT ADDRESSABLE, and the wire says so
// with an explicit null rather than a silent omission), `workspaceHasRun` is a boolean
// that is FALSE by default (ADR-005/ADR-008 — the default-empty run set is what makes
// story 01 behaviour-neutral and mergeable before story 02).
//
// AND THE OTHER HALF, which is why this file exists rather than a behavioural test
// alone: the wire's remaining hops MUST STAY PASS-THROUGHS. `applyPresenceFrame`'s
// `safeSessionArray` (src/control-stream-server.mjs) is an ENTRY-level guard — "is this
// a non-array object" — and is NEVER taught a per-field whitelist. That helpful-looking
// change is exactly how this milestone's key would be silently dropped in transit while
// every other test stayed green, and it is why the highest-fan-in file on the path
// (37 dependents) is not edited by this milestone at all.
//
// PROOFS (m38/ADR-008: every behavioural clause is fed by the REAL producer over real
// records on disk; every structural detector is a PURE function over source text, so
// the real tree and the planted violations run through the IDENTICAL code path):
//  1. BEHAVIOURAL — the REAL `readLiveSessions` emits the exact ordered six, with
//     `sessionId` present-and-null for an anonymous record and `workspaceHasRun`
//     present-and-false by default (and TRUE when a run set says so, so "false" is a
//     default rather than a constant).
//  2. STRUCTURAL — the projection's own source names those six keys, in that order, in
//     ONE place; and `src/mesh/launcher.mjs` does not stamp the run fact inline
//     (ADR-009: the projection has one home, and this milestone REMOVES a block from
//     the widest-out-degree file in src/ rather than adding one).
//  3. STRUCTURAL — `ui/src/fleet/api.ts`'s `PresenceSession` declares exactly those six
//     keys, in that order, with `sessionId: string | null` and `workspaceHasRun:
//     boolean`. A type that lags the wire is how the next milestone reads a field that
//     is not there.
//  4. STRUCTURAL — `safeSessionArray` is still an entry-level guard with NO per-field
//     whitelist, and the control's session hop names no session FIELD at all.
//  5. SELF-CHECK (non-vacuous) — a reordered projection, an omitted `sessionId`, a
//     non-nullable / reordered `PresenceSession`, and a per-entry field whitelist at
//     the control are each FLAGGED by the same detectors the real tree passes. EVERY
//     plant asserts it LANDED in the source before asserting that it trips (the tree is
//     CRLF, so every mutation is built from lines split OUT of the real source and
//     rejoined with the source's own line ending — never a hand-typed multi-line
//     literal that would silently fail to match).
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readLiveSessions } from "../../../src/mesh/presence.mjs";
import { startSession } from "../../../src/mesh/session.mjs";
import { meshDir } from "../../../src/mesh/store.mjs";
import { loadWorkspace } from "../../../src/work.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..", "..");

const PROJECTION_FILE = "src/mesh/presence.mjs";
const CONTROL_FILE = "src/control-stream-server.mjs";
const LAUNCHER_FILE = "src/mesh/launcher.mjs";
const WIRE_TYPE_FILE = "ui/src/fleet/api.ts";

// The FROZEN ORDERED SIX (ADR-005) — one spelling, shared by every proof below.
//
// m50/ADR-008 decision 8 APPENDED A SEVENTH, `relaying`, AT THE TAIL — the growth this
// ADR names as permitted ("an INSERTION at the head and an APPEND at the tail, NEVER a
// reorder"). The constant keeps its name because the SIX are what it is about: all of
// them are still here, in order, and every proof below still reads an EXACT ordered
// projection rather than a subset. Both ends move together — the projection, the wire
// type and this list are one edit, which is the property this gate exists to hold.
const FROZEN_SIX = ["sessionId", "workspaceId", "repo", "assistant", "lastPingAt", "workspaceHasRun", "relaying"];
// The m38 four, in their m38 relative order — the keys this milestone may not move.
const M38_FOUR = ["workspaceId", "repo", "assistant", "lastPingAt"];
// The declared TS type of each key on the wire's typed mirror.
const DECLARED_TYPES = {
  sessionId: "string | null",
  workspaceId: "string",
  repo: "string",
  assistant: "string",
  lastPingAt: "string",
  workspaceHasRun: "boolean",
};

const NODE_ID = "node-a";
const NOW = "2026-08-10T12:00:00.000Z";

// ───────────────────────────────────────────────────────── source detectors (pure) ──

async function readSource(file) {
  return readFile(path.join(REPO, file), "utf8");
}

function eolOf(source) {
  return source.includes("\r\n") ? "\r\n" : "\n";
}

// CODE only — every rule below is about what the source DOES, never about what a
// comment SAYS (this milestone's own ADR text quotes the key names constantly, and a
// detector that counted prose would flag the documentation for existing).
//
// ORDER MATTERS (TECH_DEBT item 24): LINE comments are stripped FIRST. Blocks-first lets
// a `/*` inside a line comment (`templates/work/<type>/*.md`) open a PHANTOM block that
// swallows everything to the next `*/` — measured at 33,549 characters across five src/
// modules, work.mjs's `loadWorkspace` among them. `acd-session-ttl-reuses-isstale` has
// had the correct order all along. The `(^|[^:])` guard stays: a `://` is not a comment.
function stripComments(source) {
  return source.replace(/(^|[^:])\/\/.*$/gm, "$1").replace(/\/\*[\s\S]*?\*\//g, "");
}

// The balanced `{…}` (or `(…)`) slice that STARTS at `openIndex`.
function balancedSlice(source, openIndex, open = "{", close = "}") {
  let depth = 0;
  for (let i = openIndex; i < source.length; i += 1) {
    if (source[i] === open) depth += 1;
    else if (source[i] === close) {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex, i + 1);
    }
  }
  return null;
}

// The object literal `readLiveSessions` pushes onto its result — the projection itself.
function projectionLiteral(source) {
  const fn = source.indexOf("export async function readLiveSessions");
  if (fn < 0) return null;
  const push = source.indexOf("live.push({", fn);
  if (push < 0) return null;
  return balancedSlice(source, source.indexOf("{", push));
}

// The top-level keys of an object literal, IN ORDER.
function literalKeys(literal) {
  const keys = [];
  let depth = 0;
  for (const raw of literal.split(/\r?\n/)) {
    const line = raw.trim();
    if (depth === 1) {
      const match = line.match(/^([A-Za-z_$][\w$]*)\s*:/);
      if (match) keys.push(match[1]);
    }
    for (const char of line) {
      if (char === "{" || char === "[" || char === "(") depth += 1;
      else if (char === "}" || char === "]" || char === ")") depth -= 1;
    }
  }
  return keys;
}

// PROOF 2 — the projection's own source shape.
function projectionViolations(source) {
  const violations = [];
  const literal = projectionLiteral(source);
  if (literal == null) {
    violations.push(`${PROJECTION_FILE}: readLiveSessions no longer projects an entry literal — the ONE home of the session projection (ADR-009) is gone`);
    return violations;
  }
  const keys = literalKeys(literal);
  if (JSON.stringify(keys) !== JSON.stringify(FROZEN_SIX)) {
    violations.push(`${PROJECTION_FILE}: the projected entry's keys are ${JSON.stringify(keys)} — ADR-005 freezes them at ${JSON.stringify(FROZEN_SIX)}, in that order`);
  }
  if (!/sessionId:\s*record\.sessionId\s*\?\?\s*null/.test(literal)) {
    violations.push(`${PROJECTION_FILE}: sessionId is not read as \`record.sessionId ?? null\` — a pre-m48 record must project a well-formed anonymous entry (ADR-002's no-migration claim rests on this line)`);
  }
  // ONE home: exactly one place stamps the run fact.
  const stamps = (stripComments(source).match(/workspaceHasRun\s*:/g) ?? []).length;
  if (stamps !== 1) {
    violations.push(`${PROJECTION_FILE}: the workspaceHasRun stamp appears ${stamps} times — ADR-009 gives the projection exactly ONE home`);
  }
  return violations;
}

// PROOF 2 (b) — ADR-009: the stamp is NOT applied inline in the launcher, the
// widest-out-degree file in src/ (TECH_DEBT item 10's "add a call site, never a block").
function launcherViolations(source) {
  return stripComments(source).includes("workspaceHasRun")
    ? [`${LAUNCHER_FILE}: names workspaceHasRun — ADR-009 puts the stamp in readLiveSessions, never inline in the launcher (the launcher SUPPLIES workspacesWithRuns, it does not project)`]
    : [];
}

// PROOF 3 — the wire's typed mirror: `export type PresenceSession = { … };`
function presenceSessionFields(tsSource) {
  const decl = tsSource.indexOf("export type PresenceSession");
  if (decl < 0) return null;
  const literal = balancedSlice(tsSource, tsSource.indexOf("{", decl));
  if (literal == null) return null;
  const fields = [];
  for (const raw of literal.split(/\r?\n/)) {
    const match = raw.trim().match(/^([A-Za-z_$][\w$]*)(\??)\s*:\s*(.+?);$/);
    if (match) fields.push({ name: match[1], optional: match[2] === "?", type: match[3].trim() });
  }
  return fields;
}

function wireTypeViolations(tsSource) {
  const violations = [];
  const fields = presenceSessionFields(tsSource);
  if (fields == null) {
    violations.push(`${WIRE_TYPE_FILE}: no \`export type PresenceSession\` declaration — the wire's typed mirror (ADR-005) is missing`);
    return violations;
  }
  const names = fields.map((field) => field.name);
  if (JSON.stringify(names) !== JSON.stringify(FROZEN_SIX)) {
    violations.push(`${WIRE_TYPE_FILE}: PresenceSession declares ${JSON.stringify(names)} — the wire type must mirror ${JSON.stringify(FROZEN_SIX)}, in that order`);
  }
  for (const field of fields) {
    const expected = DECLARED_TYPES[field.name];
    if (expected == null) continue; // already reported by the key-list check
    if (field.optional) {
      violations.push(`${WIRE_TYPE_FILE}: PresenceSession.${field.name} is OPTIONAL — both new keys are ALWAYS present (ADR-001/ADR-005); \`null\` is how "no value" is said`);
    }
    if (field.type !== expected) {
      violations.push(`${WIRE_TYPE_FILE}: PresenceSession.${field.name} is declared \`${field.type}\`, not \`${expected}\``);
    }
  }
  return violations;
}

// PROOF 4 — the control's session hop stays an ENTRY-level guard.
function sessionGuardBody(controlSource) {
  const fn = controlSource.indexOf("function safeSessionArray");
  if (fn < 0) return null;
  return balancedSlice(controlSource, controlSource.indexOf("{", fn));
}

function passThroughViolations(controlSource) {
  const violations = [];
  const raw = sessionGuardBody(controlSource);
  const body = raw == null ? null : stripComments(raw);
  if (body == null) {
    violations.push(`${CONTROL_FILE}: safeSessionArray is gone — the entry-level guard must STAY (pass-through is not absence of validation)`);
    return violations;
  }
  // (a) A per-field whitelist necessarily NAMES the entry's fields.
  for (const key of FROZEN_SIX) {
    if (new RegExp(`\\b${key}\\b`).test(body)) {
      violations.push(`${CONTROL_FILE}: safeSessionArray names the session field \`${key}\` — the control RELAYS a session entry, it never re-specifies one (ADR-005); a per-field whitelist here is how this milestone's key gets silently dropped in transit`);
    }
  }
  // (b) …or rebuilds the entry rather than keeping it whole.
  for (const shape of [/=>\s*\(\s*\{/, /Object\.fromEntries/, /Object\.assign/, /\.map\s*\(/, /\bpick\s*\(/]) {
    if (shape.test(body)) {
      violations.push(`${CONTROL_FILE}: safeSessionArray REBUILDS each entry (${shape}) — the entry must be kept WHOLE, so a key this milestone never heard of rides the hop for free`);
    }
  }
  // (c) Non-vacuity: the guard still GUARDS. Deleting the check (the other way to make
  //     (a) and (b) pass) fails here.
  if (!/Array\.isArray/.test(body) || !/typeof\s+\w+\s*===\s*"object"/.test(body)) {
    violations.push(`${CONTROL_FILE}: safeSessionArray no longer performs the entry-level "is this a non-array object" check — the guard must stay a guard`);
  }
  // (d) …and nothing ELSE in the file shapes a session entry.
  if (/presence\.sessions\s*\.\s*(map|filter|flatMap|reduce)\b/.test(stripComments(controlSource))) {
    violations.push(`${CONTROL_FILE}: the presence hop reshapes \`presence.sessions\` outside the entry-level guard — every pass-through hop MUST STAY a pass-through`);
  }
  return violations;
}

// ───────────────────────────────────────────────── the real producer (proof 1) ──

// A live session record written by the REAL producer, with its id state pinned to what
// the clause under test needs: `sessionId: "x"` (addressable), or — with `sessionId`
// omitted — a record carrying NO `sessionId` key at all, exactly as a PRE-m48 build
// wrote it. Story 48/00 owns that field's writer and is landing in parallel, so pinning
// the record STATE is what keeps the absence-tolerant clause (ADR-005's
// `record.sessionId ?? null`, the line ADR-002's no-migration claim rests on) a real
// proof under BOTH builds rather than a coincidence of whatever the producer records
// today.
async function seed(ws, { workspaceId, repo, assistant, sessionId }) {
  await startSession(ws, { nodeId: NODE_ID, workspaceId, repo, assistant, now: NOW, sessionId: sessionId ?? null });
  const dir = path.join(meshDir(ws), "sessions");
  for (const name of (await readdir(dir)).filter((entry) => entry.endsWith(".json"))) {
    const file = path.join(dir, name);
    const record = JSON.parse(await readFile(file, "utf8"));
    if (record.workspaceId !== workspaceId || record.assistant !== assistant) continue;
    if (sessionId === undefined ? !Object.hasOwn(record, "sessionId") : record.sessionId === sessionId) return;
    await writeFile(
      file,
      JSON.stringify(
        {
          nodeId: record.nodeId,
          workspaceId: record.workspaceId,
          repo: record.repo,
          assistant: record.assistant,
          ...(sessionId === undefined ? {} : { sessionId }),
          startedAt: record.startedAt,
          lastPingAt: record.lastPingAt,
        },
        null,
        2,
      ),
      "utf8",
    );
    return;
  }
  assert.fail(`no session record on disk for ${workspaceId}/${assistant}`);
}

// Drive the REAL readLiveSessions over REAL records: one ADDRESSABLE session and one
// PRE-m48 record with no `sessionId` key at all.
async function produceEntries({ workspacesWithRuns } = {}) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-acd-session-entry-wire-"));
  try {
    const root = path.join(tmp, "repo");
    const home = path.join(tmp, "home");
    await mkdir(path.join(root, "wiki", "work"), { recursive: true });
    await mkdir(path.join(root, ".aof"), { recursive: true });
    await writeFile(
      path.join(root, ".aof", "aof.config.json"),
      `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" }, mesh: { nodeId: NODE_ID } }, null, 2)}\n`,
      "utf8",
    );
    const ws = await loadWorkspace(root, undefined, { env: { AOF_GLOBAL_HOME: home } });
    await seed(ws, { workspaceId: "ws-A", repo: "alpha", assistant: "claude-code", sessionId: "sess-A" });
    await seed(ws, { workspaceId: "ws-B", repo: "beta", assistant: "codex" }); // pre-m48: no id key
    const entries = await readLiveSessions(ws, NODE_ID, {
      now: NOW,
      config: {},
      ...(workspacesWithRuns ? { workspacesWithRuns } : {}),
    });
    return {
      entries,
      addressable: entries.find((entry) => entry.workspaceId === "ws-A"),
      anonymous: entries.find((entry) => entry.workspaceId === "ws-B"),
    };
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

export const archTests = [
  {
    name: "arch/48+50 ADR-005+001 (acd-session-entry-frozen-wire): the REAL readLiveSessions emits the FROZEN ORDERED SIX PLUS m50's appended `relaying` — SEVEN keys, sessionId present-and-null for an anonymous record, workspaceHasRun present-and-false by default (behavioural, producer-fed)",
    run: async () => {
      const { entries, addressable, anonymous } = await produceEntries();
      assert.equal(entries.length, 2, "the producer genuinely emitted both sessions (an empty array would make every clause below vacuous)");

      for (const entry of entries) {
        assert.deepEqual(Object.keys(entry), FROZEN_SIX, `the entry's keys are EXACTLY the ordered list this file freezes — the m48 six plus m50's appended \`relaying\` (got ${JSON.stringify(Object.keys(entry))})`);
        // The m38 four keep their RELATIVE order — an insertion at the head and an
        // append at the tail, never a reorder.
        assert.deepEqual(Object.keys(entry).filter((key) => M38_FOUR.includes(key)), M38_FOUR, "the m38 four keep their relative order");
        assert.equal(Object.hasOwn(entry, "sessionId"), true, "sessionId is PRESENT — never omitted");
        assert.equal(Object.hasOwn(entry, "workspaceHasRun"), true, "workspaceHasRun is PRESENT — never omitted");
        assert.equal(typeof entry.workspaceHasRun, "boolean", "workspaceHasRun is a BOOLEAN");
        assert.equal(entry.workspaceHasRun, false, "…and it is FALSE by default — the injected run set defaults to EMPTY, which is what makes story 01 behaviour-neutral");
        // No key of the session RECORD leaked onto the entry.
        assert.equal(Object.hasOwn(entry, "startedAt"), false, "the record's startedAt did not leak onto the entry");
        assert.equal(Object.hasOwn(entry, "nodeId"), false, "the record's nodeId did not leak onto the entry");
      }

      assert.equal(addressable.sessionId, "sess-A", "an addressable session carries its id BYTE-IDENTICALLY (no transformation)");
      assert.equal(anonymous.sessionId, null, "a record with no sessionId key at all projects `sessionId: null` — present-and-null, never absent, never undefined");
      assert.equal(JSON.parse(JSON.stringify(anonymous)).sessionId, null, "…and it survives JSON serialisation as null (an `undefined` would have vanished on the wire)");

      // "FALSE by default" is a DEFAULT, not a constant: a supplied run set stamps true,
      // per entry.
      const stamped = await produceEntries({ workspacesWithRuns: new Set(["ws-A"]) });
      assert.equal(stamped.addressable.workspaceHasRun, true, "a supplied run set stamps the matching workspace's entry TRUE (so the default-false clause above is a real default)");
      assert.equal(stamped.anonymous.workspaceHasRun, false, "…and only that workspace's — the stamp is per ENTRY");
      assert.equal(stamped.entries.length, 2, "…and it never REMOVES a session: the stamp describes a workspace");
    },
  },

  {
    name: "arch/48+50 ADR-005+009 (acd-session-entry-frozen-wire): the projection names the SEVEN keys (the frozen six plus m50's appended `relaying`) in order in ONE home, reads `record.sessionId ?? null`, and the launcher does not stamp the run fact inline (structural)",
    run: async () => {
      const violations = [
        ...projectionViolations(await readSource(PROJECTION_FILE)),
        ...launcherViolations(await readSource(LAUNCHER_FILE)),
      ];
      assert.deepEqual(violations, [], `the session projection has drifted from ADR-005/ADR-009:\n${violations.join("\n")}`);
    },
  },

  {
    name: "arch/48+50 ADR-005 (acd-session-entry-frozen-wire): ui/src/fleet/api.ts's PresenceSession is the typed mirror of the SEVEN (the frozen six plus m50's appended `relaying`) — same keys, same order, `sessionId: string | null` (structural)",
    run: async () => {
      const violations = wireTypeViolations(await readSource(WIRE_TYPE_FILE));
      assert.deepEqual(violations, [], `the wire's typed mirror has drifted from the wire:\n${violations.join("\n")}`);
    },
  },

  {
    name: "arch/48 ADR-005 (acd-session-entry-frozen-wire): applyPresenceFrame's safeSessionArray is still an ENTRY-level guard with NO per-field whitelist — every pass-through hop stays a pass-through (structural)",
    run: async () => {
      const violations = passThroughViolations(await readSource(CONTROL_FILE));
      assert.deepEqual(violations, [], `the control's session hop is no longer a pass-through:\n${violations.join("\n")}`);

      // Non-vacuity: the hop this rule governs actually EXISTS and is actually WIRED —
      // a renamed guard that emptied the scan fails here.
      const control = await readSource(CONTROL_FILE);
      assert.match(control, /sessions:\s*safeSessionArray\(presence\.sessions\)/, "applyPresenceFrame still routes `sessions` through the entry-level guard");
    },
  },

  {
    name: "arch/48 ADR-005 (acd-session-entry-frozen-wire): self-check — a reordered projection, an omitted sessionId, a non-nullable/reordered PresenceSession and a per-entry field whitelist at the control are each FLAGGED by the same detectors the real tree passes (non-vacuous)",
    run: async () => {
      // ── planted: a REORDERED projection ─────────────────────────────────────
      const projection = await readSource(PROJECTION_FILE);
      const literal = projectionLiteral(projection);
      assert.ok(literal, "the real projection literal is extractable (the premise of every plant below)");
      const eol = eolOf(projection);
      const lines = literal.split(/\r?\n/);
      const idLineIndex = lines.findIndex((line) => /^\s*sessionId:/.test(line));
      assert.ok(idLineIndex > 0, "the real projection has a sessionId line to move");
      const lastKeyIndex = lines.findIndex((line) => /^\s*workspaceHasRun:/.test(line));
      assert.ok(lastKeyIndex > idLineIndex, "…and a trailing workspaceHasRun line to move it past");

      const reorderedLines = [...lines];
      const [idLine] = reorderedLines.splice(idLineIndex, 1);
      reorderedLines.splice(lastKeyIndex, 0, idLine); // sessionId now trails the m38 four
      const reordered = projection.replace(literal, reorderedLines.join(eol));
      assert.notEqual(reordered, projection, "the planted REORDER genuinely landed in the source (the tree is CRLF — a non-landing mutation would make this self-check a no-op)");
      assert.deepEqual(projectionViolations(projection), [], "the real projection passes the detector");
      const reorderViolations = projectionViolations(reordered);
      assert.ok(
        reorderViolations.some((violation) => violation.includes("ADR-005 freezes them")),
        `a reordered projection is FLAGGED (got ${JSON.stringify(reorderViolations)})`,
      );

      // ── planted: an OMITTED sessionId (the anonymous record's key vanishes) ──
      const omittedLines = lines.filter((line) => !/^\s*sessionId:/.test(line));
      const omitted = projection.replace(literal, omittedLines.join(eol));
      assert.notEqual(omitted, projection, "the planted OMISSION genuinely landed in the source");
      const omitViolations = projectionViolations(omitted);
      assert.ok(omitViolations.length >= 1, `an omitted sessionId is FLAGGED (got ${JSON.stringify(omitViolations)})`);
      assert.ok(
        omitViolations.some((violation) => violation.includes("record.sessionId ?? null")),
        "…and the flag names the absence-tolerant read the no-migration claim rests on",
      );

      // ── planted: the launcher stamps the run fact inline (ADR-009) ───────────
      const launcher = await readSource(LAUNCHER_FILE);
      assert.deepEqual(launcherViolations(launcher), [], "the real launcher does not stamp the run fact");
      assert.equal(launcherViolations(`${launcher}${eol}const entry = { workspaceHasRun: workspacesWithRuns.has(id) };${eol}`).length, 1, "an inline launcher stamp is FLAGGED");

      // ── planted: the WIRE TYPE drifts ───────────────────────────────────────
      const wireType = await readSource(WIRE_TYPE_FILE);
      assert.deepEqual(wireTypeViolations(wireType), [], "the real wire type passes the detector");
      const typeEol = eolOf(wireType);

      const nonNullable = wireType.replace("sessionId: string | null;", "sessionId: string;");
      assert.notEqual(nonNullable, wireType, "the planted NON-NULLABLE sessionId genuinely landed");
      assert.ok(
        wireTypeViolations(nonNullable).some((violation) => violation.includes("PresenceSession.sessionId")),
        "a non-nullable sessionId is FLAGGED — `null` is how an unaddressable session is said",
      );

      const optional = wireType.replace("sessionId: string | null;", "sessionId?: string | null;");
      assert.notEqual(optional, wireType, "the planted OPTIONAL sessionId genuinely landed");
      assert.ok(
        wireTypeViolations(optional).some((violation) => violation.includes("OPTIONAL")),
        "an optional (omittable) sessionId is FLAGGED — the key is ALWAYS present",
      );

      const declFields = presenceSessionFields(wireType);
      assert.deepEqual(declFields.map((field) => field.name), FROZEN_SIX, "the real declaration is the ordered six (the premise of the reorder plant)");
      const declStart = wireType.indexOf("export type PresenceSession");
      const declLiteral = balancedSlice(wireType, wireType.indexOf("{", declStart));
      const declLines = declLiteral.split(/\r?\n/);
      const runLineIndex = declLines.findIndex((line) => /^\s*workspaceHasRun\s*:/.test(line));
      const idDeclIndex = declLines.findIndex((line) => /^\s*sessionId\s*[?:]/.test(line));
      assert.ok(runLineIndex > idDeclIndex && idDeclIndex > 0, "the real declaration has both lines to swap");
      const swapped = [...declLines];
      [swapped[idDeclIndex], swapped[runLineIndex]] = [swapped[runLineIndex], swapped[idDeclIndex]];
      const reorderedType = wireType.replace(declLiteral, swapped.join(typeEol));
      assert.notEqual(reorderedType, wireType, "the planted TYPE REORDER genuinely landed");
      assert.ok(
        wireTypeViolations(reorderedType).some((violation) => violation.includes("in that order")),
        "a reordered PresenceSession is FLAGGED — the order IS the contract",
      );

      // ── planted: a PER-ENTRY FIELD WHITELIST at the control ─────────────────
      // The precise change that would silently drop `sessionId` in transit and leave
      // every other test green — which is why it is planted as SOURCE, through the
      // same detector the real file passes.
      const control = await readSource(CONTROL_FILE);
      const guard = sessionGuardBody(control);
      assert.ok(guard, "the real entry-level guard is extractable");
      assert.deepEqual(passThroughViolations(control), [], "the real control passes the detector");

      const controlEol = eolOf(control);
      const whitelistBody = [
        "{",
        "  return Array.isArray(value)",
        "    ? value",
        "        .filter((entry) => entry != null && typeof entry === \"object\" && !Array.isArray(entry))",
        "        .map((entry) => ({ workspaceId: entry.workspaceId, repo: entry.repo, assistant: entry.assistant, lastPingAt: entry.lastPingAt }))",
        "    : [];",
        "}",
      ].join(controlEol);
      const whitelisted = control.replace(guard, whitelistBody);
      assert.notEqual(whitelisted, control, "the planted PER-FIELD WHITELIST genuinely landed in the source");
      const whitelistViolations = passThroughViolations(whitelisted);
      assert.ok(whitelistViolations.length >= 1, `a per-entry field whitelist at the control is FLAGGED (got ${JSON.stringify(whitelistViolations)})`);
      assert.ok(
        whitelistViolations.some((violation) => violation.includes("workspaceId")),
        "…because it NAMES a session field the control has no business naming",
      );
      assert.ok(
        whitelistViolations.some((violation) => violation.includes("REBUILDS")),
        "…and because it rebuilds the entry instead of keeping it whole",
      );

      // ── planted: the guard DELETED (the other way to satisfy the two rules above) ──
      const deletedGuard = control.replace(guard, ["{", "  return Array.isArray(value) ? value : [];", "}"].join(controlEol));
      assert.notEqual(deletedGuard, control, "the planted GUARD DELETION genuinely landed");
      assert.ok(
        passThroughViolations(deletedGuard).some((violation) => violation.includes("must stay a guard")),
        "dropping the entry-level check is FLAGGED — pass-through is not absence of validation",
      );
    },
  },
];
