// Fitness function: acd-session-attribution-single-authority (milestone 48 / ADR-003 +
// ADR-007) — "the work item derives onto the session and is stored nowhere; a free
// session is first-class".
//
// THE INVARIANT, and it is an AUTHORITY SPLIT BY FACT rather than by record. PRESENCE
// is the sole authority on a session's EXISTENCE and LIVENESS; the ASSIGNMENT is the
// sole authority on its WORK ATTRIBUTION. The join runs ONE WAY ONLY — `workItem`
// derives ONTO the session at the index, computed at read time from the authoritative
// row, and the session RECORD on disk carries no `ref`, no `itemRef`, no `workItem` and
// no `assignmentId`, ever. There is therefore no second copy of the attribution that
// could go stale or disagree: there is the assignment row, and a view of it.
//
// THE JOIN IS TWO-COLUMN — `(target_node_id, session_id)` — and that is not
// belt-and-braces. Session ids are opaque values minted by another system and nothing
// guarantees a worker's id is unique across machines, so a one-column match passes the
// happy path and then quietly attributes one machine's work to another machine's
// session. An assignment whose `sessionId` is ABSENT or `null` (the ordinary state
// until its worker captures one mid-run — m38/ADR-013's "absent, not false") is not a
// wildcard either.
//
// AND THE FREE SESSION IS THE POINT, not an edge case: a session with no matching
// assignment is never dropped, never demoted and never annotated. `workItem: null`,
// key EXPLICITLY PRESENT, is the whole representation — which is what makes the SPEC's
// "sessions with no work item are the whole point" structural rather than aspirational.
//
// PROOFS (m38/ADR-008: every behavioural clause is fed by the REAL producers — the real
// `startSession` writing a real record, the real `updateAssignmentState` writing the
// real `global_assignments.session_id`, the real shaper building the index; every
// structural detector is a PURE function over source text, so the real tree and the
// planted violations run through the IDENTICAL code path):
//  1. STRUCTURAL + BEHAVIOURAL — the session record's frozen key set contains no
//     ref/itemRef/workItem/assignmentId, at the assembler AND on disk.
//  2. STRUCTURAL — no session WRITE path reads `global_assignments` (the derivation is
//     one-directional by construction, not by convention).
//  3. STRUCTURAL — `workItem` is produced ONLY at the index, from the two-column key,
//     as exactly `{ ref, assignmentId }` copied verbatim off the row: no fabricated
//     placeholder, no fallback, nothing else about the assignment.
//  4. STRUCTURAL — the free session is never filtered: `workItem` appears in
//     `buildSessionIndex` exactly once, in the entry literal, and never in a branch.
//  5. BEHAVIOURAL — the id a session publishes and `global_assignments.session_id` are
//     ONE byte-identical value; the join succeeds on that equality alone; a free
//     session carries `workItem: null` with the key present and stays in the index.
//  6. SELF-CHECK (non-vacuous) — an item ref written onto a session record, an omitted
//     `workItem` for a free session, a free session filtered out of the index, a
//     fabricated placeholder ref and a one-column join are each FLAGGED by the same
//     detectors the real tree passes. EVERY plant asserts it LANDED in the source first
//     (the tree is mixed CRLF/LF, so every mutation is built from lines split OUT of
//     the real source and rejoined with that source's own line ending).
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { queryGlobalMeshStatus, shapeGlobalStatus, workspaceIdForProjectRoot } from "../../../src/global-mesh-query.mjs";
import { publishPresenceRecord, readLiveSessions } from "../../../src/mesh/presence.mjs";
import { startSession } from "../../../src/mesh/session.mjs";
import { meshDir, publishNodeRecord } from "../../../src/mesh/store.mjs";
import { loadWorkspace } from "../../../src/work.mjs";
import { openGlobalWorkProjectionStore } from "../../../src/global-work-store.mjs";
import { publishGlobalRegistryDescriptorsToStore } from "../../../src/global-node-registry.mjs";
import { assembleAssignmentRecord, insertAssignment, updateAssignmentState } from "../../../src/assignment-record.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..", "..");

const QUERY_FILE = "src/global-mesh-query.mjs";
const SESSION_FILE = "src/mesh/session.mjs";
const SESSION_CLI_FILE = "src/commands/mesh/session.mjs";

// The keys a session record may NEVER carry: attribution derives onto the session and
// is stored nowhere (ADR-003).
const FORBIDDEN_RECORD_KEYS = ["ref", "itemRef", "workItem", "assignmentId"];

// The session record's frozen SEVEN (m48/ADR-002), named here only so the detector can
// prove it is reading the real assembler rather than an empty slice.
// m50/ADR-008 decision 8 APPENDED an eighth key, `relaying` — the worker's stated fact
// that something is bridging this session's PTY output up its stream. An APPEND is the
// same re-freeze-by-growth m48 itself performed on m38's six; every key above keeps its
// position, so this list still asserts an exact ordered record rather than a subset.
const RECORD_KEYS = ["nodeId", "workspaceId", "repo", "assistant", "sessionId", "startedAt", "lastPingAt", "relaying"];

const NOW = "2026-08-10T12:00:00.000Z";

// ────────────────────────────────────────────────────────── source helpers (pure) ──

async function readSource(file) {
  return readFile(path.join(REPO, file), "utf8");
}

function eolOf(source) {
  return source.includes("\r\n") ? "\r\n" : "\n";
}

// CODE only — every rule here is about what the source DOES, never about what a comment
// SAYS (these ADRs quote `workItem`, `itemRef` and `global_assignments` constantly, and
// a detector that counted prose would flag the documentation for existing).
//
// ORDER MATTERS (TECH_DEBT item 24): LINE comments are stripped FIRST. Blocks-first lets
// a `/*` inside a line comment (`templates/work/<type>/*.md`) open a PHANTOM block that
// swallows everything to the next `*/` — measured at 33,549 characters across five src/
// modules, work.mjs's `loadWorkspace` among them. `acd-session-ttl-reuses-isstale` has
// had the correct order all along. The `(^|[^:])` guard stays: a `://` is not a comment.
function stripComments(source) {
  return source.replace(/(^|[^:])\/\/.*$/gm, "$1").replace(/\/\*[\s\S]*?\*\//g, "");
}

// NON-VACUITY OF THE STRIP ITSELF (TECH_DEBT item 24, fix (b)). `workItemHomeViolations`
// sweeps ALL of `src/` for an ABSENCE, and an absence-sweep is silently GREEN if the
// stripper deleted the source it was meant to read — item 24's named "silent false
// GREEN" shape. The anchor is each module's OWN exported symbol names: a name a module
// `export`s at line start is code by construction, so if it does not survive
// `stripComments` then the corpus this rule ruled on was not the corpus. Measured under
// the OLD block-first order: 18 exported symbols across three modules disappeared —
// `loadWorkspace` and `findWork` among them. Under the shipped order: zero. (The plant
// that DEMONSTRATES the blinding, both orders through one code path, lives in
// acd-session-index-derived-not-stored's self-check.)
function strippedCorpusViolations(entries, strip = stripComments) {
  const violations = [];
  const anchors = /^export\s+(?:default\s+)?(?:async\s+)?(?:function\s*\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm;
  for (const [file, source] of entries) {
    const stripped = strip(source);
    for (const [, name] of source.matchAll(anchors)) {
      if (!new RegExp(`\\b${name}\\b`).test(stripped)) {
        violations.push(`${file}: the exported symbol \`${name}\` does NOT survive stripComments() — this whole-src/ absence sweep ruled on code the STRIPPER had already deleted (TECH_DEBT item 24: a \`/*\` inside a line comment opens a phantom block that runs to the next \`*/\`). Fix the stripper, not this assertion.`);
      }
    }
  }
  return violations;
}

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

function functionBody(source, name) {
  const decl = source.search(new RegExp(`(export\\s+)?function\\s+${name}\\s*\\(`));
  if (decl < 0) return null;
  const paramsClose = source.indexOf(")", source.indexOf("(", decl));
  if (paramsClose < 0) return null;
  const bodyOpen = source.indexOf("{", paramsClose);
  if (bodyOpen < 0) return null;
  return balancedSlice(source, bodyOpen);
}

// The top-level keys of an object literal, IN ORDER — shorthand included (`{ nodeId,
// workspaceId }` declares two keys, and a parser blind to shorthand would read a
// correct record as empty and a planted one as clean).
function literalKeys(literal) {
  const keys = [];
  let depth = 0;
  for (const raw of literal.split(/\r?\n/)) {
    const line = raw.trim();
    if (depth === 1) {
      const match = line.match(/^([A-Za-z_$][\w$]*)\s*(:|,\s*$|$)/);
      if (match) keys.push(match[1]);
    }
    for (const char of line) {
      if (char === "{" || char === "[" || char === "(") depth += 1;
      else if (char === "}" || char === "]" || char === ")") depth -= 1;
    }
  }
  return keys;
}

// `assembleSessionRecord`'s returned literal — the record's ONE shape.
function recordLiteral(source) {
  const body = functionBody(source, "assembleSessionRecord");
  if (body == null) return null;
  const marker = body.indexOf("return {");
  if (marker < 0) return null;
  return balancedSlice(body, body.indexOf("{", marker));
}

// `buildSessionIndex`'s entry literal — where `workItem` is DERIVED.
function entryLiteral(source) {
  const body = functionBody(source, "buildSessionIndex");
  if (body == null) return null;
  const marker = body.indexOf("const entry = {");
  if (marker < 0) return null;
  return balancedSlice(body, body.indexOf("{", marker));
}

// ─────────────────── PROOF 1 + 2: the record stores no attribution, and reads none ──

function recordViolations(source) {
  const violations = [];
  const literal = recordLiteral(source);
  if (literal == null) {
    violations.push(`${SESSION_FILE}: no \`assembleSessionRecord\` returning a literal — the record's ONE shape has nowhere to be pinned`);
    return violations;
  }
  const keys = literalKeys(literal);
  // Non-vacuity: the slice really is the record (a detector reading an empty literal
  // would pass every forbidden-key rule below for the wrong reason).
  if (!RECORD_KEYS.every((key) => keys.includes(key))) {
    violations.push(`${SESSION_FILE}: the assembled record's keys are ${JSON.stringify(keys)} — this detector expects m48/ADR-002's seven (${JSON.stringify(RECORD_KEYS)}) to be present before it can rule on what is ABSENT`);
  }
  for (const forbidden of FORBIDDEN_RECORD_KEYS) {
    if (keys.includes(forbidden)) {
      violations.push(`${SESSION_FILE}: the session record carries \`${forbidden}\` — attribution DERIVES onto the session at the index (ADR-003/ADR-007) and is stored NOWHERE; a stored copy is a second authority that can go stale or disagree`);
    }
  }
  return violations;
}

// The session WRITE path never reads the assignment table: the derivation is
// one-directional BY CONSTRUCTION, not by convention.
function writePathViolations(entries) {
  const violations = [];
  for (const [file, source] of entries) {
    const code = stripComments(source);
    if (/global_assignments/.test(code)) {
      violations.push(`${file}: names \`global_assignments\` — the session write path never reads the assignment table (ADR-003: presence owns existence/liveness, the assignment owns attribution, and neither asks the other's question)`);
    }
    if (/from\s+"\.\.?\/(assignment-record|global-work-store)\.mjs"/.test(code)) {
      violations.push(`${file}: imports the assignment/store surface — a session writer that can reach the assignment table is one refactor away from storing a ref on the record`);
    }
    for (const forbidden of FORBIDDEN_RECORD_KEYS) {
      if (forbidden === "ref") continue; // `ref` is too common a substring to scan for as a bare word here; the record literal above pins it exactly
      if (new RegExp(`\\b${forbidden}\\b`).test(code)) {
        violations.push(`${file}: names \`${forbidden}\` — no attribution vocabulary belongs on the session write path`);
      }
    }
  }
  return violations;
}

// ────────────────── PROOF 3 + 4: workItem is produced ONLY at the index, two-column ──

// `workItem` exists in exactly ONE module. (`\b` matters: `workItemColumns` in
// global-work-store.mjs is a work-ITEM column list, an unrelated pre-existing name.)
function workItemHomeViolations(entries) {
  const violations = [];
  for (const [file, source] of entries) {
    if (file === QUERY_FILE) continue;
    if (/\bworkItem\b/.test(stripComments(source))) {
      violations.push(`${file}: produces or names \`workItem\` — ADR-003/ADR-007 put the derivation in ONE place, the index in ${QUERY_FILE}; a second producer is a second answer`);
    }
  }
  return violations;
}

function attributionViolations(source) {
  const violations = [];

  // (a) The join helper reads BOTH columns and rejects an absent/blank half of either —
  //     the two-column key, and "absent is not a wildcard".
  const raw = functionBody(source, "sessionAssignmentRows");
  if (raw == null) {
    violations.push(`${QUERY_FILE}: no \`sessionAssignmentRows\` — the assignment side of the join has nowhere to live`);
  } else {
    const join = stripComments(raw);
    if (!/row\?\.targetNodeId|row\.targetNodeId/.test(join)) {
      violations.push(`${QUERY_FILE}: the join does not read \`targetNodeId\` — a one-column match on the session id alone attributes one machine's work to another machine's session`);
    }
    if (!/row\?\.sessionId|row\.sessionId/.test(join)) {
      violations.push(`${QUERY_FILE}: the join does not read \`sessionId\``);
    }
    for (const half of ["nodeId", "sessionId"]) {
      if (!new RegExp(`typeof\\s+${half}\\s*!==\\s*"string"[^\\n]*continue`).test(join)) {
        violations.push(`${QUERY_FILE}: the join does not SKIP a row whose \`${half}\` is absent/blank — an assignment omits \`sessionId\` entirely until its worker captures one (m38/ADR-013 "absent, not false"), and treating that as a wildcard attributes someone else's work to this session`);
      }
    }
  }

  // (b) The derivation itself: resolved through BOTH halves, and projected to EXACTLY
  //     `{ ref, assignmentId }` copied verbatim — no fabricated placeholder, no
  //     fallback, nothing else about the assignment copied.
  const rawWorkItem = functionBody(source, "sessionWorkItem");
  if (rawWorkItem == null) {
    violations.push(`${QUERY_FILE}: no \`sessionWorkItem\` — the one-directional derivation has nowhere to live`);
  } else {
    const derive = stripComments(rawWorkItem);
    if (!/\.get\(nodeId\)/.test(derive) || !/\.get\(sessionId\)/.test(derive)) {
      violations.push(`${QUERY_FILE}: the derivation does not resolve through BOTH \`nodeId\` and \`sessionId\` — a lookup satisfiable by half the key mis-attributes work across machines`);
    }
    const returned = /return\s*(\{[^}]*\})\s*;/.exec(derive);
    if (!returned) {
      violations.push(`${QUERY_FILE}: \`sessionWorkItem\` no longer returns an object literal — the projected attribution cannot be pinned`);
    } else {
      const projected = returned[1];
      if (!/^\{\s*ref:\s*picked\.itemRef,\s*assignmentId:\s*picked\.assignmentId,?\s*\}$/.test(projected.trim())) {
        violations.push(`${QUERY_FILE}: the derived workItem is \`${projected.trim()}\` — it must be EXACTLY { ref: picked.itemRef, assignmentId: picked.assignmentId }: two values copied verbatim off the authoritative row, never a fabricated/defaulted ref, and never a second copy of the item's title/status/workspace (items[] already carries those, joinable on the ref)`);
      }
    }
    if (!/if\s*\(!picked\)\s*return null;/.test(derive)) {
      violations.push(`${QUERY_FILE}: an unmatched join does not return \`null\` explicitly — a free session's whole representation is \`workItem: null\`, never a guess`);
    }
  }

  // (c) The free session is never FILTERED. `workItem` appears in buildSessionIndex
  //     exactly once — in the entry literal — so it can never reach a branch.
  const build = functionBody(source, "buildSessionIndex");
  if (build == null) {
    violations.push(`${QUERY_FILE}: no \`buildSessionIndex\``);
  } else {
    const code = stripComments(build);
    const mentions = (code.match(/\bworkItem\b/g) ?? []).length;
    if (mentions !== 1) {
      violations.push(`${QUERY_FILE}: buildSessionIndex names \`workItem\` ${mentions} times — exactly ONE (the unconditional entry key) is allowed: a second mention is a filter, a demotion or an annotation, and a session with no work item is a first-class ANSWER, not an absence`);
    }
    const entry = entryLiteral(source);
    if (entry == null || !literalKeys(entry).includes("workItem")) {
      violations.push(`${QUERY_FILE}: the index entry does not carry \`workItem\` unconditionally — the key is EXPLICITLY PRESENT and \`null\` for a free session, never omitted`);
    }
    if (entry != null && /workItem:[^,\n]*\?[^,\n]*:/.test(stripComments(entry))) {
      violations.push(`${QUERY_FILE}: \`workItem\` is assigned conditionally — present-and-null is one unconditional shape, not two`);
    }
  }

  return violations;
}

// ───────────────────────────────────────────────────── the real producers (proof 5) ──

async function withTemp(prefix, fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// A real repo carrying milestone 48 / story 03 (so `items[]` holds the ref `48/03`),
// plus an isolated global mesh home. `loadWorkspace`'s third argument is an OPTIONS bag
// — handing it a bare env silently falls back to `process.env` and the fixture writes
// into whatever global home the shell carries.
async function makeRepo(tmp) {
  const root = path.join(tmp, "repo");
  const home = path.join(tmp, "home");
  const milestoneDir = path.join(root, "wiki", "work", "48_milestone_fleet-session-identity");
  await mkdir(path.join(milestoneDir, "stories", "03_story_fleet-session-index"), { recursive: true });
  await writeFile(path.join(milestoneDir, "SPEC.md"), "---\ntype: milestone\nnumber: 48\nslug: fleet-session-identity\nstatus: in-progress\ntitle: Fleet session identity\n---\n", "utf8");
  await writeFile(
    path.join(milestoneDir, "stories", "03_story_fleet-session-index", "STORY.md"),
    "---\ntype: story\nnumber: 03\nslug: fleet-session-index\nparent: 48\nstatus: in-progress\ntitle: The fleet-side session index\n---\n",
    "utf8",
  );
  await mkdir(path.join(root, ".aof"), { recursive: true });
  await writeFile(
    path.join(root, ".aof", "aof.config.json"),
    `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" }, mesh: { enabled: true, nodeId: "node-a" } }, null, 2)}\n`,
    "utf8",
  );
  const env = { AOF_GLOBAL_HOME: home };
  const workspace = await loadWorkspace(root, undefined, { env });
  return { workspace, root, home, env, workspaceId: workspaceIdForProjectRoot(root) };
}

export const archTests = [
  {
    name: "arch/48 ADR-003 (acd-session-attribution-single-authority): the session record's frozen key set carries no ref/itemRef/workItem/assignmentId, and no session write path reads global_assignments (structural)",
    run: async () => {
      const violations = [
        ...recordViolations(await readSource(SESSION_FILE)),
        ...writePathViolations([
          [SESSION_FILE, await readSource(SESSION_FILE)],
          [SESSION_CLI_FILE, await readSource(SESSION_CLI_FILE)],
        ]),
      ];
      assert.deepEqual(violations, [], `the session record has grown an attribution copy:\n${violations.join("\n")}`);
    },
  },

  {
    name: "arch/48 ADR-003+007 (acd-session-attribution-single-authority): workItem is produced ONLY at the index, joined on (target_node_id, session_id), projected to exactly { ref, assignmentId } with no fabricated ref, and never filtered (structural)",
    run: async () => {
      const entries = [];
      async function walk(dir, rel) {
        for (const item of await readdir(dir, { withFileTypes: true })) {
          const relPath = rel ? `${rel}/${item.name}` : item.name;
          if (item.isDirectory()) {
            await walk(path.join(dir, item.name), relPath);
            continue;
          }
          if (!item.name.endsWith(".mjs")) continue;
          entries.push([`src/${relPath}`, await readFile(path.join(dir, item.name), "utf8")]);
        }
      }
      await walk(path.join(REPO, "src"), "");
      assert.ok(entries.length > 50, `the scan really walked src/ (found ${entries.length} modules)`);

      // …and the sweep really READ what it walked (TECH_DEBT item 24): an absence-rule
      // over source the stripper deleted is a false GREEN, so the blinding is asserted
      // BEFORE the absence is ruled on.
      const blinded = strippedCorpusViolations(entries);
      assert.deepEqual(blinded, [], `the comment stripper BLINDED this sweep — it ruled on an absence inside source it had itself deleted:\n${blinded.join("\n")}`);

      const violations = [
        ...workItemHomeViolations(entries),
        ...attributionViolations(await readSource(QUERY_FILE)),
      ];
      assert.deepEqual(violations, [], `the attribution derivation has drifted from ADR-003/ADR-007:\n${violations.join("\n")}`);
    },
  },

  {
    name: "arch/48 ADR-003 (acd-session-attribution-single-authority): over the REAL producers — the published session id and global_assignments.session_id are ONE byte-identical value, the join succeeds on that equality, and the record on disk stores no attribution (behavioural)",
    run: async () => withTemp("aof-acd-attribution-", async (tmp) => {
      const { workspace, env, workspaceId } = await makeRepo(tmp);
      const now = new Date().toISOString();
      // The measured shape (RESEARCH §1/§2): one Claude Code UUID, two producers.
      const uuid = "3f2b9c14-8a7e-4d61-9f03-1c5ea77b42d9";

      await startSession(workspace, { nodeId: "node-a", workspaceId: "ws-1", repo: "demo", assistant: "claude-code", sessionId: uuid, now });
      await startSession(workspace, { nodeId: "node-a", workspaceId: "ws-2", repo: "beta", assistant: "codex", sessionId: "sess-free", now });
      const sessions = await readLiveSessions(workspace, "node-a", { now, config: {} });
      assert.equal(sessions.length, 2, "the real producer published both sessions (non-vacuous)");
      await publishNodeRecord(workspace, "node-a", { nodeId: "node-a", host: "node-a", os: "win32", runtimes: ["claude"], skills: [], aofVersion: "0.1.0", publishedAt: now });
      await publishPresenceRecord(workspace, "node-a", { nodeId: "node-a", heartbeatAt: now, activeRuns: [], sessions, aofVersion: "0.1.0" });

      const store = await openGlobalWorkProjectionStore({ env });
      let assignmentId;
      let column;
      try {
        await store.publishWorkspaceSnapshot(workspace, { now });
        await publishGlobalRegistryDescriptorsToStore(store, workspace, { now });
        const record = assembleAssignmentRecord({ itemRef: "48/03", workspaceId, targetNodeId: "node-a", issuer: "control-a", state: "assigned", now });
        insertAssignment(store, record);
        // The REAL writer of `global_assignments.session_id` — the seam the worker's
        // captured id actually travels through.
        updateAssignmentState(store, record.assignmentId, "running", { now, sessionId: uuid });
        assignmentId = record.assignmentId;
        column = store.db.prepare("SELECT session_id FROM global_assignments WHERE assignment_id = ?").get(assignmentId).session_id;
      } finally {
        store.close();
      }

      // ONE VALUE, never two that need agreeing.
      const sessionDir = path.join(meshDir(workspace), "sessions");
      const leaves = (await readdir(sessionDir)).filter((name) => name.endsWith(".json"));
      const records = [];
      for (const leaf of leaves) records.push(JSON.parse(await readFile(path.join(sessionDir, leaf), "utf8")));
      const published = records.find((record) => record.sessionId === uuid);
      assert.ok(published, "the session record on disk carries the id the assistant issued");
      assert.strictEqual(published.sessionId, column, "…byte-identical to global_assignments.session_id — one value, two producers, zero reconciliation");

      // …and the RECORD stores no attribution at all.
      for (const record of records) {
        for (const forbidden of FORBIDDEN_RECORD_KEYS) {
          assert.equal(Object.hasOwn(record, forbidden), false, `the session record on disk carries no \`${forbidden}\``);
        }
        assert.equal(/48\/03/.test(JSON.stringify(record)), false, "…and no item ref appears anywhere in it");
      }

      const status = await queryGlobalMeshStatus({ env });
      const assigned = status.sessions.find((entry) => entry.sessionId === uuid);
      const free = status.sessions.find((entry) => entry.sessionId === "sess-free");

      assert.ok(assigned, "the assigned session is in the index");
      assert.deepEqual(assigned.workItem, { ref: "48/03", assignmentId }, "…and the join succeeds on the id equality alone, carrying exactly the ref and the assignment id");
      assert.deepEqual(Object.keys(assigned.workItem), ["ref", "assignmentId"], "…and nothing else about the assignment is copied");

      assert.ok(free, "the FREE session is in the index — never dropped, never demoted");
      assert.equal(Object.hasOwn(free, "workItem"), true, "…with the key `workItem` EXPLICITLY present");
      assert.strictEqual(free.workItem, null, "…and the value exactly null");
      assert.strictEqual(JSON.parse(JSON.stringify(free)).workItem, null, "…surviving the wire as an explicit null rather than vanishing");
    }),
  },

  {
    name: "arch/48 ADR-003+007 (acd-session-attribution-single-authority): self-check — an item ref on the session record, an omitted workItem, a filtered-out free session, a fabricated placeholder ref and a one-column join are each FLAGGED by the same detectors the real tree passes (non-vacuous)",
    run: async () => {
      const sessionSource = await readSource(SESSION_FILE);
      const querySource = await readSource(QUERY_FILE);
      assert.deepEqual(recordViolations(sessionSource), [], "the real session record passes the detector (the premise of the plants below)");
      assert.deepEqual(attributionViolations(querySource), [], "…and so does the real attribution path");

      // ── planted: an ITEM REF written onto the session record ────────────────
      const record = recordLiteral(sessionSource);
      assert.ok(record, "the real record literal is extractable");
      const recordEol = eolOf(sessionSource);
      const recordLines = record.split(/\r?\n/);
      const refIndex = recordLines.findIndex((line) => /^\s*repo,/.test(line));
      assert.ok(refIndex > 0, "the real record has a line to insert beside");
      const stored = [...recordLines];
      stored.splice(refIndex + 1, 0, `${recordLines[refIndex].match(/^\s*/)[0]}itemRef,`);
      const withRef = sessionSource.replace(record, stored.join(recordEol));
      assert.notEqual(withRef, sessionSource, "the planted ITEM REF genuinely landed in the source");
      const refViolations = recordViolations(withRef);
      assert.ok(
        refViolations.some((violation) => violation.includes("itemRef")),
        `an item ref stored on the session record is FLAGGED (got ${JSON.stringify(refViolations)})`,
      );
      assert.ok(refViolations.some((violation) => violation.includes("stored NOWHERE")), "…and the flag names the rule it breaks");

      // …and so is a session write path that reaches the assignment table at all.
      assert.deepEqual(writePathViolations([[SESSION_FILE, sessionSource]]), [], "the real session module reads no assignment table");
      const reading = `${sessionSource}${recordEol}const row = db.prepare("SELECT item_ref FROM global_assignments WHERE session_id = ?").get(sessionId);${recordEol}`;
      assert.notEqual(reading, sessionSource, "the planted ASSIGNMENT READ genuinely landed");
      assert.ok(
        writePathViolations([[SESSION_FILE, reading]]).some((violation) => violation.includes("global_assignments")),
        "a session write path that reads the assignment table is FLAGGED — the derivation is one-directional BY CONSTRUCTION",
      );

      // ── planted: an OMITTED workItem for a free session ─────────────────────
      const queryEol = eolOf(querySource);
      const entry = entryLiteral(querySource);
      assert.ok(entry, "the real entry literal is extractable");
      const entryLines = entry.split(/\r?\n/);
      const workItemIndex = entryLines.findIndex((line) => /^\s*workItem:/.test(line));
      assert.ok(workItemIndex > 0, "the real entry carries a workItem line (the premise of the plants below)");
      const omitted = querySource.replace(entry, entryLines.filter((_, i) => i !== workItemIndex).join(queryEol));
      assert.notEqual(omitted, querySource, "the planted OMISSION genuinely landed");
      const omitViolations = attributionViolations(omitted);
      assert.ok(
        omitViolations.some((violation) => violation.includes("unconditionally") || violation.includes("names `workItem` 0 times")),
        `an omitted workItem is FLAGGED (got ${JSON.stringify(omitViolations)})`,
      );

      // ── planted: a FREE SESSION FILTERED OUT of the index ───────────────────
      const build = functionBody(querySource, "buildSessionIndex");
      const pushLine = build.split(/\r?\n/).find((line) => /^\s*sessions\.push\(entry\);/.test(line));
      assert.ok(pushLine, "the real body pushes the entry (the anchor for the filter plant)");
      const filtered = querySource.replace(
        pushLine,
        [`${pushLine.match(/^\s*/)[0]}if (entry.workItem === null) continue;`, pushLine].join(queryEol),
      );
      assert.notEqual(filtered, querySource, "the planted FREE-SESSION FILTER genuinely landed");
      const filterViolations = attributionViolations(filtered);
      assert.ok(
        filterViolations.some((violation) => violation.includes("times")),
        `a free session filtered out of the index is FLAGGED (got ${JSON.stringify(filterViolations)})`,
      );
      assert.ok(
        filterViolations.some((violation) => violation.includes("first-class ANSWER")),
        "…and the flag names the SPEC's own premise: a session with no work item is an answer, not an absence",
      );

      // ── planted: a FABRICATED placeholder ref ──────────────────────────────
      const fabricated = querySource.replace(
        "return { ref: picked.itemRef, assignmentId: picked.assignmentId };",
        "return { ref: picked.itemRef ?? \"unknown\", assignmentId: picked.assignmentId };",
      );
      assert.notEqual(fabricated, querySource, "the planted FABRICATED REF genuinely landed");
      assert.ok(
        attributionViolations(fabricated).some((violation) => violation.includes("fabricated/defaulted ref")),
        "a fabricated placeholder ref is FLAGGED — an unmatched join degrades to null, never to a guess",
      );
      // …as is copying MORE of the assignment than the two routing values.
      const fattened = querySource.replace(
        "return { ref: picked.itemRef, assignmentId: picked.assignmentId };",
        "return { ref: picked.itemRef, assignmentId: picked.assignmentId, state: picked.state };",
      );
      assert.notEqual(fattened, querySource, "the planted EXTRA FIELD genuinely landed");
      assert.ok(
        attributionViolations(fattened).some((violation) => violation.includes("EXACTLY")),
        "copying the assignment's state onto the entry is FLAGGED — items[] is the authority on the item",
      );

      // ── planted: a ONE-COLUMN join (the half-key mis-attribution) ───────────
      const oneColumn = querySource.replace(
        "const picked = pickItemAssignment(rowsByNodeSession.get(nodeId)?.get(sessionId));",
        "const picked = pickItemAssignment(rowsByNodeSession.get(sessionId));",
      );
      assert.notEqual(oneColumn, querySource, "the planted ONE-COLUMN JOIN genuinely landed");
      assert.ok(
        attributionViolations(oneColumn).some((violation) => violation.includes("half the key")),
        "a join resolved by the session id alone is FLAGGED — nothing guarantees a worker's session id is unique across machines",
      );

      // …and so is a join that treats an ABSENT session id as a wildcard.
      const joinBody = functionBody(querySource, "sessionAssignmentRows");
      const guardLine = joinBody.split(/\r?\n/).find((line) => /typeof sessionId !== "string"/.test(line));
      assert.ok(guardLine, "the real join guards the session half");
      // Spliced through the join's OWN body, never against the whole file: the same
      // guard is written one indent level deeper inside `buildSessionIndex`, and the
      // shallower line is a SUBSTRING of the deeper one — a whole-file replace would
      // silently mutate the wrong function and leave this plant proving nothing.
      const wildcardBody = joinBody.replace(`${guardLine}${queryEol}`, "");
      assert.notEqual(wildcardBody, joinBody, "the planted WILDCARD genuinely landed in the JOIN's own body");
      const wildcard = querySource.replace(joinBody, wildcardBody);
      assert.notEqual(wildcard, querySource, "…and that body genuinely landed back in the source");
      assert.match(functionBody(wildcard, "buildSessionIndex"), /typeof sessionId !== "string"/, "…while buildSessionIndex's own guard is untouched (the plant is scoped to the join)");
      assert.ok(
        attributionViolations(wildcard).some((violation) => violation.includes("absent, not false")),
        "a join that stops skipping an absent session id is FLAGGED — absent is not a wildcard",
      );
    },
  },
];
