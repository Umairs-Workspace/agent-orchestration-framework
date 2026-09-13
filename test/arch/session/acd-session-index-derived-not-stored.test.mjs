// Fitness function: acd-session-index-derived-not-stored (milestone 48 / ADR-007, with
// ADR-009's no-new-sibling clause and ADR-010's R2 miss ruling) — "the index is a
// projection, not a store, and it is not a second liveness authority".
//
// THE INVARIANT. `buildSessionIndex` (src/global-mesh-query.mjs) answers "what live
// sessions exist across the mesh" from the inputs it is handed and from nothing else.
// It opens no store, writes no file, holds no state and caches nothing, so the same
// `{ nodes, assignments }` rebuild a content-identical index every time — which is the
// whole reason it can never go stale, and the reason nothing has to reconcile, repair
// or sweep it.
//
// AND THE OTHER HALF, which is why a table would have been the wrong home rather than
// merely a bigger one: the source of truth is a TTL-EXPIRING disk record. A SQLite
// table would make the control node a WRITER of session state with its own row
// lifetime and therefore its own expiry rule — a second authority over liveness
// (forbidden by the SPEC and ADR-003) and a second staleness rule (forbidden by
// `acd-session-ttl-reuses-isstale`). The same logic bans the softer version: a
// session-level TTL re-evaluation inside the index would be that second authority
// without the table. Node-level gate: YES, and it reads the fact the registry ALREADY
// derived. Session-level re-filter: NO.
//
// PROOFS (m38/ADR-008: every behavioural clause is fed by the REAL shaper over real
// inputs; every structural detector is a PURE function over source text, so the real
// tree and the planted violations run through the IDENTICAL code path):
//  1. STRUCTURAL — no `CREATE TABLE`/`INSERT INTO`/`UPDATE`/`REPLACE INTO` anywhere in
//     `src/` names a table that is a session index.
//  2. STRUCTURAL — the index path performs no I/O, re-derives no session-level
//     liveness, gates membership on the ALREADY-DERIVED `freshness`, holds no
//     module-level cache, composes no `"${nodeId}::${sessionId}"` key, and reaches the
//     terminal mirror through no import edge.
//  3. STRUCTURAL — `shapeGlobalStatus`'s return grows by EXACTLY one key: every
//     pre-existing key keeps its place, `sessions` is the only addition.
//  4. STRUCTURAL — `ui/src/fleet/api.ts`'s `MeshSession` is the TYPED MIRROR of that
//     entry: the same NINE keys, in the same order, with `sessionId: string` (narrowed
//     to non-null at the index — arithmetic, not divergence) and `workItem` explicitly
//     nullable; and `GlobalMeshStatus` carries `sessions: MeshSession[]` non-optionally,
//     inserted between `nodes` and `diagnostics` exactly as the runtime payload is.
//     THIS FILE IS THE HONEST HOME for that rule: the type mirrors ADR-007's entry, and
//     ADR-007's entry (`ENTRY_KEYS`, the `const entry = {…}` literal) is pinned right
//     here — one file, one shape, so the runtime pin and the type pin cannot disagree.
//     `acd-session-entry-frozen-wire` owns `PresenceSession` by the identical rule,
//     because it owns ADR-005's frozen six. A type that lags the wire is how the next
//     milestone's surface reads a field that is not there.
//  5. BEHAVIOURAL — over the REAL shaper: rebuildable to a deep-equal result with no
//     memoised identity; a `stale`/`unknown` node contributes ZERO while a `live` one
//     contributes all of its addressable sessions; an anonymous entry is absent from
//     the index and still present in `nodes[].presence.sessions[]`; the array is sorted
//     by `(nodeId, sessionId)`; and EVERY miss shape returns exactly `null` without
//     throwing (ADR-010 R2).
//  5b. BEHAVIOURAL (48/ADR-013 R12) — a duplicate `(nodeId, sessionId)` (one session
//     whose cwd MOVED between repos, both leaves live for one TTL window) yields
//     exactly ONE index row, the later `lastPingAt`; the SAME two entries in BOTH input
//     orders build a DEEP-EQUAL index; `now` sixty years apart changes nothing; and the
//     withheld candidate is still complete in `nodes[].presence.sessions[]`.
//
//  THE `lastPingAt` CLAUSE WAS NARROWED HERE, by 48/ADR-013 R12, in the same change
//  that introduced that resolution. It never meant "the name may not appear" — it meant
//  the control never re-derives LIVENESS. Ordering two SESSION ENTRIES by `lastPingAt`
//  is now REQUIRED; comparing one against a clock, a `now`, a TTL, a parsed date or a
//  LITERAL timestamp is still forbidden, and each of those is planted and asserted to
//  trip. See the clause itself for why the narrowing closes rather than opens the gap.
//  6. SELF-CHECK (non-vacuous) — a persisted index table, a session-level TTL
//     re-filter, a dropped/loosened freshness gate, a memoising module-level cache, a
//     composed string key, a reordered entry, an `undefined` miss, a drifted/optional/
//     reordered `MeshSession` and a BLINDED comment stripper are each FLAGGED by the
//     same detectors the real tree passes. EVERY plant asserts it LANDED in the
//     source first (the tree is mixed CRLF/LF, so every mutation is built from lines
//     split OUT of the real source and rejoined with that source's own line ending).
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { shapeGlobalStatus, buildSessionIndex } from "../../../src/global-mesh-query.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..", "..");

const QUERY_FILE = "src/global-mesh-query.mjs";
const WIRE_TYPE_FILE = "ui/src/fleet/api.ts";

// The ADR-007 entry, in its exact order: nodeId, then ADR-005's frozen six verbatim,
// then the ONE derived field.
// m50/ADR-008 decision 8 APPENDED a ninth key, `relaying`, AFTER `workItem` — the two
// inputs of the browser's feed-axis disjunction sitting together. Unconditional and
// read with a strict `=== true`, exactly as `workspaceHasRun` is; every key above it
// keeps its position, so this list still asserts an exact ordered entry.
const ENTRY_KEYS = ["nodeId", "sessionId", "workspaceId", "repo", "assistant", "lastPingAt", "workspaceHasRun", "workItem", "relaying"];

// The DECLARED TS type of each key on the wire's typed mirror (`MeshSession`).
// `sessionId` is `string` — NOT `PresenceSession`'s `string | null`. That is the one
// deliberate difference and it is arithmetic rather than divergence: an index keyed on
// `(nodeId, sessionId)` cannot hold an entry with no id, so an anonymous session is
// ABSENT from this array while staying complete in `nodes[].presence.sessions[]`. The
// runtime side of that same narrowing is asserted behaviourally below.
const MESH_SESSION_TYPES = {
  nodeId: "string",
  sessionId: "string",
  workspaceId: "string",
  repo: "string",
  assistant: "string",
  lastPingAt: "string",
  workspaceHasRun: "boolean",
  workItem: "{ ref: string; assignmentId: string } | null",
};

// The payload's top-level keys BEFORE this milestone (read off the shaper's own return
// at build time), and the ONE key ADR-007 adds. `stalenessSeconds` is m43/story 04's
// cache-freshness window — pre-existing, untouched here, and named so that "the payload
// grows by exactly one key" is asserted against what the shaper really produces.
//
// WHERE THE NEW KEY SITS — the reading, stated rather than invented. ADR-007 requires
// "ONE additive top-level key … Every existing key of `shapeGlobalStatus`'s return is
// byte-unchanged"; it does NOT pin the new key's POSITION. `sessions` is therefore
// INSERTED after `nodes` (beside the rows it derives from) rather than appended after
// `diagnostics`, which satisfies the ADR exactly: every pre-existing key is present,
// unchanged in value, and unchanged in RELATIVE order — an insertion, never a reorder,
// which is m38/ADR-001's own additive discipline (it inserted `sessions` BEFORE
// `aofVersion` rather than appending) applied one level up. The two rules below are
// therefore of different weight and are asserted separately: the relative-order rule is
// ADR-007's actual requirement; the exact-list rule pins the shape we SHIPPED, so a
// later move of the key is a deliberate edit here rather than a silent wire change.
const PRE_EXISTING_PAYLOAD_KEYS = ["scope", "workspaceId", "stalenessSeconds", "workspaces", "items", "nodes", "diagnostics"];
const PAYLOAD_KEYS_AFTER = ["scope", "workspaceId", "stalenessSeconds", "workspaces", "items", "nodes", "sessions", "diagnostics"];

// The functions that ARE the index path. Every structural rule below is scoped to
// these bodies — a rule that scanned the whole module would flag the store-opening
// query surface this pure shaper legitimately lives beside.
const INDEX_PATH_FUNCTIONS = ["buildSessionIndex", "sessionAssignmentRows", "sessionWorkItem"];

// ────────────────────────────────────────────────────────── source helpers (pure) ──

async function readSource(file) {
  return readFile(path.join(REPO, file), "utf8");
}

function eolOf(source) {
  return source.includes("\r\n") ? "\r\n" : "\n";
}

// CODE only — every rule here is about what the source DOES, never about what a comment
// SAYS (this milestone's own comments quote `isStale`, `CREATE TABLE` and the composed
// key constantly, and a detector that counted prose would flag the documentation for
// existing).
//
// ORDER MATTERS (TECH_DEBT item 24): LINE comments are stripped FIRST. Blocks-first lets
// a `/*` inside a line comment (`templates/work/<type>/*.md`) open a PHANTOM block that
// swallows everything to the next `*/` — measured at 33,549 characters across five src/
// modules, work.mjs's `loadWorkspace` among them. `acd-session-ttl-reuses-isstale` has
// had the correct order all along. The `(^|[^:])` guard stays: a `://` is not a comment.
function stripComments(source) {
  return source.replace(/(^|[^:])\/\/.*$/gm, "$1").replace(/\/\*[\s\S]*?\*\//g, "");
}

// NON-VACUITY OF THE STRIP ITSELF (TECH_DEBT item 24, fix (b)). PROOF 1 sweeps ALL of
// `src/` for an ABSENCE, and an absence-sweep is silently GREEN if the stripper deleted
// the source it was meant to read — item 24's named "silent false GREEN" shape. The
// anchor is each module's OWN exported symbol names: a name a module `export`s at line
// start is code by construction, so if it does not survive `stripComments` then the
// corpus this rule ruled on was not the corpus. Measured under the OLD block-first
// order: 18 exported symbols across three modules disappeared — `loadWorkspace`,
// `findWork` and `parseFrontmatter` among them. Under the shipped order: zero.
//
// The stripper is a PARAMETER (defaulting to the real one) for the same reason every
// other detector here is a pure function over text: the self-check can then run the
// OLD block-first order and the shipped line-first order through the IDENTICAL code
// path, over the REAL corpus, and show the difference rather than assert it.
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

// The body of a named function declaration, `{…}` included.
function functionBody(source, name) {
  const decl = source.search(new RegExp(`(export\\s+)?function\\s+${name}\\s*\\(`));
  if (decl < 0) return null;
  const paramsClose = source.indexOf(")", source.indexOf("(", decl));
  if (paramsClose < 0) return null;
  const bodyOpen = source.indexOf("{", paramsClose);
  if (bodyOpen < 0) return null;
  return balancedSlice(source, bodyOpen);
}

// The top-level keys of an object literal, IN ORDER — SHORTHAND INCLUDED. `{ nodeId,
// sessionId, workspaceId: session.workspaceId }` declares three keys, and a parser that
// only saw `name:` would read the first two as absent and then report the REAL,
// correctly-ordered entry as drifted. Both spellings are the same key on the wire, so
// both are read here.
function literalKeys(literal) {
  const keys = [];
  let depth = 0;
  for (const raw of literal.split(/\r?\n/)) {
    const line = raw.trim();
    if (depth === 1) {
      // `key: value,` … or `key,` / `key` (shorthand). A comment line cannot match — it
      // starts with `/`, which is outside the identifier class.
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

// The `const entry = { … }` literal buildSessionIndex pushes — the index entry itself.
function entryLiteral(source) {
  const body = functionBody(source, "buildSessionIndex");
  if (body == null) return null;
  const marker = body.indexOf("const entry = {");
  if (marker < 0) return null;
  return balancedSlice(body, body.indexOf("{", marker));
}

// `shapeGlobalStatus`'s own returned payload literal — the LAST `return {` in its body
// (the earlier ones are inside its per-row map callbacks).
function payloadLiteral(source) {
  const body = functionBody(source, "shapeGlobalStatus");
  if (body == null) return null;
  const marker = body.lastIndexOf("return {");
  if (marker < 0) return null;
  return balancedSlice(body, body.indexOf("{", marker));
}

// ─────────────────────────────────────────────────────── PROOF 1: no session table ──

// Every table name a DDL/DML statement in the tree names. Column names are deliberately
// NOT scanned: `global_assignments.session_id` is a legitimate, pre-existing column and
// this rule is about a TABLE that would BE a session index.
function statementTableNames(source) {
  const names = [];
  const patterns = [
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`[]?([A-Za-z_][\w$]*)/gi,
    /INSERT\s+(?:OR\s+\w+\s+)?INTO\s+["`[]?([A-Za-z_][\w$]*)/gi,
    /REPLACE\s+INTO\s+["`[]?([A-Za-z_][\w$]*)/gi,
    /\bUPDATE\s+["`[]?([A-Za-z_][\w$]*)["`\]]?\s+SET\b/gi,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) names.push(match[1]);
  }
  return names;
}

function persistedIndexViolations(sources, strip = stripComments) {
  const violations = [];
  for (const [file, source] of sources) {
    for (const name of statementTableNames(strip(source))) {
      if (/session/i.test(name)) {
        violations.push(`${file}: a SQL statement names the table \`${name}\` — the session index is a DERIVED PROJECTION (ADR-007); a table would make the control node a writer of session state with its own expiry rule, i.e. a second authority over liveness`);
      }
    }
  }
  return violations;
}

// ───────────────────────────────────────────────── PROOF 2: the index path's shape ──

function indexPathViolations(source) {
  const violations = [];
  const code = stripComments(source);

  if (!/export\s+function\s+buildSessionIndex\s*\(/.test(code)) {
    violations.push(`${QUERY_FILE}: no exported \`buildSessionIndex\` — ADR-007 puts the index in THIS module, as a named export the shaper calls and a caller can reach in-process`);
    return violations;
  }

  // (a) The index path is PURE: no I/O of any kind, and no clock.
  const forbidden = [
    [/\bawait\b/, "an `await` — the index is a synchronous pure projection; anything it had to wait for would be I/O"],
    [/\b(readFile|writeFile|readdir|mkdir|unlink|rename|stat|existsSync|createWriteStream)\b/, "a filesystem call"],
    [/\bfs\b/, "the filesystem module"],
    [/\.prepare\s*\(|\bdb\b|\bstore\b|openGlobalWorkProjectionStore|globalMeshPaths/, "a store/database reach — the index opens nothing"],
    [/\bprocess\b|\benv\b/, "the process environment"],
    [/new\s+Date|Date\.(now|parse)/, "a clock — no clock of ours decides who is alive"],
    [/\bisStale\b|\bisSessionLive\b/, "the session staleness predicate — the PUBLISHER already TTL-filtered; a second evaluation here is the second authority the SPEC forbids"],
    [/ttl/i, "a TTL — session-level liveness is NEVER re-derived at the control"],
    [/\bnow\b/, "the `now` input — ADR-007's signature accepts it and the index must never read it"],
    [/::/, "a composed `nodeId::sessionId` key — that is the terminal mirror's own private spelling, and two spellings of one tuple drift (the lookup is NESTED)"],
  ];
  for (const name of INDEX_PATH_FUNCTIONS) {
    const raw = functionBody(source, name);
    if (raw == null) {
      violations.push(`${QUERY_FILE}: the index-path function \`${name}\` is gone — the projection must stay one readable path in this module (ADR-009: no new root sibling)`);
      continue;
    }
    const body = stripComments(raw);
    for (const [pattern, why] of forbidden) {
      if (pattern.test(body)) violations.push(`${QUERY_FILE}: \`${name}\` reaches ${why}`);
    }
    // `lastPingAt` — NARROWED by 48/ADR-013 R12, which amended THIS clause in the same
    // change that introduced the duplicate resolution. The clause never meant "the name
    // may not appear"; it meant THE CONTROL NEVER RE-DERIVES LIVENESS. Comparing two
    // SESSION ENTRIES' timestamps to each other is ORDERING — which of these two records
    // is the fresher one — and ADR-013 R12 now REQUIRES it: a duplicate
    // `(nodeId, sessionId)` is resolved by a stated total order whose first key is
    // `lastPingAt` DESCENDING, compared as a plain codepoint string. Comparing one
    // against a CLOCK, a `now`, a TTL or a parsed date is LIVENESS, and stays forbidden.
    //
    // WHY THE NARROWED CLAUSE STILL CATCHES A REAL RE-DERIVATION, rather than being a
    // deletion dressed up: to re-derive liveness you need A TIME TO COMPARE AGAINST, and
    // inside these bodies there are exactly three ways to obtain one —
    //   (i)   a clock / `now` / TTL / staleness predicate — already forbidden ANYWHERE
    //         in these bodies by `forbidden` above. That is what closes the loophole a
    //         line-local rule would leave: a cutoff computed on an EARLIER line cannot
    //         exist here either, because the tokens that could compute it cannot.
    //   (ii)  a timestamp LITERAL — a fixed cutoff is a clock with the clock spelled
    //         out; closed immediately below.
    //   (iii) ANOTHER ENTRY's `lastPingAt` — ordering, and the one ADR-013 R12 permits.
    // So this clause only has to keep every `lastPingAt` read ENTRY-SHAPED and keep date
    // literals out. Nothing else it used to forbid was ever load-bearing.
    const residue = body
      // the verbatim copy onto the entry (`lastPingAt: session.lastPingAt`) …
      .replace(/\blastPingAt:\s*[A-Za-z_$][\w$]*\??\.lastPingAt\b/g, "")
      // … and a read off an OPERAND (`candidate.lastPingAt`, `held.lastPingAt`), which
      // is how ONE ENTRY is weighed against ANOTHER.
      .replace(/\b[A-Za-z_$][\w$]*\??\.lastPingAt\b/g, "");
    if (/lastPingAt/.test(residue)) {
      violations.push(`${QUERY_FILE}: \`${name}\` names lastPingAt outside the verbatim copy onto the entry AND outside a read off an entry operand — the control CARRIES the publisher's timestamp and may ORDER two ENTRIES by it (48/ADR-013 R12), but it never re-derives LIVENESS from it`);
    }
    if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(body)) {
      violations.push(`${QUERY_FILE}: \`${name}\` carries a LITERAL ISO timestamp — a fixed cutoff is a clock with the clock spelled out, and comparing lastPingAt against one is the second liveness authority the SPEC forbids. ADR-013 R12 permits ordering two ENTRIES against each other and nothing else.`);
    }
  }

  // (b) The freshness gate, on the fact the registry ALREADY derived, compared
  //     STRICTLY (ambiguity fails CLOSED — "stale"/"unknown" contribute nothing).
  const build = stripComments(functionBody(source, "buildSessionIndex") ?? "");
  if (!/node\.freshness\s*!==\s*"live"/.test(build) && !/node\.freshness\s*===\s*"live"/.test(build)) {
    violations.push(`${QUERY_FILE}: buildSessionIndex does not gate membership on \`node.freshness\` against the exact string "live" — a node that stops heartbeating leaves its presence file frozen on disk with its sessions inside it, which would otherwise read live forever (ADR-007)`);
  }

  // (c) The entry: the ordered NINE, unconditional.
  const entry = entryLiteral(source);
  if (entry == null) {
    violations.push(`${QUERY_FILE}: buildSessionIndex no longer builds an entry literal — the ADR-007 entry shape has nowhere to live`);
  } else {
    const keys = literalKeys(entry);
    if (JSON.stringify(keys) !== JSON.stringify(ENTRY_KEYS)) {
      violations.push(`${QUERY_FILE}: the index entry's keys are ${JSON.stringify(keys)} — ADR-007 freezes them at ${JSON.stringify(ENTRY_KEYS)}, in that order (nodeId, then ADR-005's six verbatim, then the one derived field, then m50/ADR-008's appended 'relaying')`);
    }
  }

  // (d) The lookup: an EXPLICIT `null` miss (ADR-010 R2) with both halves guarded.
  const lookup = /lookup\s*\(nodeId,\s*sessionId\)\s*\{[\s\S]*?\n\s{4}\}/.exec(code);
  if (!lookup) {
    violations.push(`${QUERY_FILE}: no \`lookup(nodeId, sessionId)\` on the index — ADR-007's O(1) answer to "is this tuple a live session"`);
  } else {
    if (!/\?\?\s*null/.test(lookup[0])) {
      violations.push(`${QUERY_FILE}: lookup does not end in an explicit \`?? null\` — a miss is \`null\`, NEVER \`undefined\` (ADR-010 R2: the natural \`get(...)?.get(...)\` leaks undefined, which cannot distinguish "no such session" from "no such lookup")`);
    }
    for (const half of ["nodeId", "sessionId"]) {
      if (!new RegExp(`typeof\\s+${half}\\s*!==\\s*"string"`).test(lookup[0])) {
        violations.push(`${QUERY_FILE}: lookup does not reject a non-string \`${half}\` — a half-specified tuple is not addressable and must be a calm null, never a throw`);
      }
    }
  }

  // (e) No memoisation: nothing at MODULE scope holds an index between calls.
  for (const line of code.split(/\r?\n/)) {
    if (!/^(const|let|var)\s/.test(line)) continue; // module scope only (depth-0 lines)
    if (/new\s+(Map|WeakMap|WeakRef)\s*\(/.test(line) || /\b(cache|memo|_index)\b/i.test(line)) {
      violations.push(`${QUERY_FILE}: a module-scope binding holds state across calls (${line.trim()}) — the index caches NOTHING; a memoised second call is how a derived answer goes stale`);
    }
  }

  // (f) No import edge to the terminal mirror: the SPEC's "changing how the mirror
  //     routes is out of scope" is honoured by not touching it at all.
  if (/mesh-terminal-mirror/.test(code)) {
    violations.push(`${QUERY_FILE}: imports/names the terminal mirror — that would drag the relay transport into a pure shaper's import graph and give the routing tuple a second spelling`);
  }

  return violations;
}

// ─────────────────────────────────────── PROOF 3: the payload grows by ONE key ──

function payloadViolations(source) {
  const violations = [];
  const literal = payloadLiteral(source);
  if (literal == null) {
    violations.push(`${QUERY_FILE}: shapeGlobalStatus no longer returns an object literal — the payload's shape cannot be pinned`);
    return violations;
  }
  const keys = literalKeys(literal);
  if (JSON.stringify(keys) !== JSON.stringify(PAYLOAD_KEYS_AFTER)) {
    violations.push(`${QUERY_FILE}: the payload's top-level keys are ${JSON.stringify(keys)} — ADR-007 adds EXACTLY \`sessions\`, leaving ${JSON.stringify(PRE_EXISTING_PAYLOAD_KEYS)} in place: ${JSON.stringify(PAYLOAD_KEYS_AFTER)}`);
  }
  // …and every pre-existing key keeps its relative order (an insertion, never a
  // reorder — m38/ADR-001's additive discipline applied to the payload).
  const surviving = keys.filter((key) => PRE_EXISTING_PAYLOAD_KEYS.includes(key));
  if (JSON.stringify(surviving) !== JSON.stringify(PRE_EXISTING_PAYLOAD_KEYS)) {
    violations.push(`${QUERY_FILE}: the pre-existing payload keys now read ${JSON.stringify(surviving)} — they must keep their relative order byte-for-byte`);
  }
  return violations;
}

// ────────────────────────────────── PROOF 4: the wire's TYPED MIRROR (`MeshSession`) ──

// The declared fields of `export type <name> = { … };`, IN ORDER. Lines that are pure
// `//` comments are skipped for BOTH the field match and the brace depth, so a comment
// carrying an unbalanced bracket cannot desynchronise the walk (`GlobalMeshStatus` has
// four such lines around the `sessions` key).
function typeFields(tsSource, typeName) {
  const decl = tsSource.indexOf(`export type ${typeName}`);
  if (decl < 0) return null;
  const literal = balancedSlice(tsSource, tsSource.indexOf("{", decl));
  if (literal == null) return null;
  const fields = [];
  let depth = 0;
  for (const raw of literal.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("//")) continue;
    if (depth === 1) {
      const match = line.match(/^([A-Za-z_$][\w$]*)(\??)\s*:\s*(.+?);$/);
      if (match) fields.push({ name: match[1], optional: match[2] === "?", type: match[3].trim() });
    }
    for (const char of line) {
      if (char === "{" || char === "[" || char === "(") depth += 1;
      else if (char === "}" || char === "]" || char === ")") depth -= 1;
    }
  }
  return fields;
}

function wireTypeViolations(tsSource) {
  const violations = [];
  const fields = typeFields(tsSource, "MeshSession");
  if (fields == null) {
    violations.push(`${WIRE_TYPE_FILE}: no \`export type MeshSession\` declaration — the index entry's typed mirror (ADR-007) is missing, so every consumer of \`sessions[]\` types itself`);
    return violations;
  }
  const names = fields.map((field) => field.name);
  if (JSON.stringify(names) !== JSON.stringify(ENTRY_KEYS)) {
    violations.push(`${WIRE_TYPE_FILE}: MeshSession declares ${JSON.stringify(names)} — the wire type must mirror the index entry ${JSON.stringify(ENTRY_KEYS)}, in that order (nodeId, then ADR-005's six verbatim, then the one derived field, then m50/ADR-008's appended 'relaying')`);
  }
  for (const field of fields) {
    const expected = MESH_SESSION_TYPES[field.name];
    if (expected == null) continue; // already reported by the key-list check
    if (field.optional) {
      violations.push(`${WIRE_TYPE_FILE}: MeshSession.${field.name} is OPTIONAL — every key of the entry is UNCONDITIONALLY present (ADR-007); \`null\` is how "no value" is said, and \`workItem: null\` is a free session's whole representation`);
    }
    if (field.type !== expected) {
      violations.push(`${WIRE_TYPE_FILE}: MeshSession.${field.name} is declared \`${field.type}\`, not \`${expected}\``);
    }
  }

  // …and the payload's own type carries the array, non-optionally, in the same place
  // the runtime literal inserts it (between `nodes` and `diagnostics`).
  const status = typeFields(tsSource, "GlobalMeshStatus");
  if (status == null) {
    violations.push(`${WIRE_TYPE_FILE}: no \`export type GlobalMeshStatus\` declaration — the payload's typed mirror is missing`);
    return violations;
  }
  const statusNames = status.map((field) => field.name);
  const sessions = status.find((field) => field.name === "sessions");
  if (sessions == null) {
    violations.push(`${WIRE_TYPE_FILE}: GlobalMeshStatus declares ${JSON.stringify(statusNames)} — it must carry \`sessions\`, the ONE key ADR-007 adds to the payload; a typed payload that lacks it makes every reader of the index cast`);
    return violations;
  }
  if (sessions.optional) {
    violations.push(`${WIRE_TYPE_FILE}: GlobalMeshStatus.sessions is OPTIONAL — a store with no live session serves \`sessions: []\`, so an optional key would let a consumer read "this build does not report sessions" as "nobody is working"`);
  }
  if (sessions.type !== "MeshSession[]") {
    violations.push(`${WIRE_TYPE_FILE}: GlobalMeshStatus.sessions is declared \`${sessions.type}\`, not \`MeshSession[]\` — the payload key and the entry type must be the SAME shape, or the mirror mirrors nothing`);
  }
  const at = statusNames.indexOf("sessions");
  if (statusNames[at - 1] !== "nodes" || statusNames[at + 1] !== "diagnostics") {
    violations.push(`${WIRE_TYPE_FILE}: GlobalMeshStatus's keys read ${JSON.stringify(statusNames)} — \`sessions\` is INSERTED between \`nodes\` and \`diagnostics\`, mirroring ${JSON.stringify(PAYLOAD_KEYS_AFTER)}: an insertion beside the rows it derives from, never an append and never a reorder`);
  }
  return violations;
}

// ───────────────────────────────────────────────────────── the real shaper (proof 5) ──

function wireSession(sessionId, fields = {}) {
  return {
    sessionId,
    workspaceId: fields.workspaceId ?? "ws-1",
    repo: fields.repo ?? "demo",
    assistant: fields.assistant ?? "claude-code",
    lastPingAt: fields.lastPingAt ?? "2026-08-10T12:00:00.000Z",
    workspaceHasRun: fields.workspaceHasRun ?? false,
  };
}

function registryNode(nodeId, sessions, freshness = "live") {
  return {
    nodeId,
    role: "worker",
    freshness,
    presence: { nodeId, heartbeatAt: "2026-08-10T12:00:00.000Z", activeRuns: [], sessions, aofVersion: "0.1.0" },
  };
}

// The REAL shaper, called exactly as `queryGlobalMeshStatus` calls it. `now` is
// injectable so the R12 clause below can shape ONE duplicate at two instants sixty
// years apart and assert the index is unmoved — the ordering is between two ENTRIES,
// never against a clock.
function shape(nodes, assignments = [], now = "2026-08-10T12:00:00.000Z") {
  return shapeGlobalStatus({
    paths: { databasePath: "/nowhere/global.db" },
    workProjection: { workspaces: [], items: [], errors: [], workspaceId: null },
    registry: { nodes, workspaces: [], errors: [] },
    assignments,
    now,
    cacheStalenessSeconds: 900,
  });
}

async function srcSources() {
  const entries = [];
  async function walk(dir, rel) {
    for (const name of await readdir(dir, { withFileTypes: true })) {
      const relPath = rel ? `${rel}/${name.name}` : name.name;
      if (name.isDirectory()) {
        await walk(path.join(dir, name.name), relPath);
        continue;
      }
      if (!name.name.endsWith(".mjs")) continue;
      entries.push([`src/${relPath}`, await readFile(path.join(dir, name.name), "utf8")]);
    }
  }
  await walk(path.join(REPO, "src"), "");
  return entries;
}

export const archTests = [
  {
    name: "arch/48 ADR-007 (acd-session-index-derived-not-stored): no CREATE TABLE/INSERT/UPDATE anywhere in src/ names a session-index table — the index is a projection, never a store (structural)",
    run: async () => {
      const sources = await srcSources();
      assert.ok(sources.length > 50, `the scan really walked src/ (found ${sources.length} modules)`);
      // …and the sweep really READ what it walked (TECH_DEBT item 24): an absence-rule
      // over source the stripper deleted is a false GREEN, so the blinding is asserted
      // BEFORE the absence is ruled on.
      const blinded = strippedCorpusViolations(sources);
      assert.deepEqual(blinded, [], `the comment stripper BLINDED this sweep — it ruled on an absence inside source it had itself deleted:\n${blinded.join("\n")}`);
      const violations = persistedIndexViolations(sources);
      assert.deepEqual(violations, [], `something persists a session index:\n${violations.join("\n")}`);
    },
  },

  {
    name: "arch/48 ADR-007+010R2 (acd-session-index-derived-not-stored): the index path does no I/O, re-derives no session liveness, gates on the already-derived freshness, caches nothing, composes no string key, and misses with an explicit null (structural)",
    run: async () => {
      const violations = indexPathViolations(await readSource(QUERY_FILE));
      assert.deepEqual(violations, [], `the session index has drifted from ADR-007:\n${violations.join("\n")}`);
    },
  },

  {
    name: "arch/48 ADR-007 (acd-session-index-derived-not-stored): shapeGlobalStatus's return grows by EXACTLY one key — `sessions` — with every pre-existing key in its pre-existing place (structural)",
    run: async () => {
      const violations = payloadViolations(await readSource(QUERY_FILE));
      assert.deepEqual(violations, [], `the payload did not grow additively:\n${violations.join("\n")}`);
    },
  },

  {
    name: "arch/48 ADR-007 (acd-session-index-derived-not-stored): ui/src/fleet/api.ts's MeshSession is the typed mirror of the index entry — same NINE keys (m50/ADR-008 decision 8 appended 'relaying'), same order, `sessionId: string`, `workItem` nullable — and GlobalMeshStatus carries `sessions: MeshSession[]` (structural)",
    run: async () => {
      const violations = wireTypeViolations(await readSource(WIRE_TYPE_FILE));
      assert.deepEqual(violations, [], `the wire's typed mirror has drifted from the index entry:\n${violations.join("\n")}`);

      // The two mirrors are pinned to ONE list, so a rename cannot pass by moving with
      // itself: the type's key order IS the runtime entry's key order.
      const fields = typeFields(await readSource(WIRE_TYPE_FILE), "MeshSession");
      assert.deepEqual(fields.map((field) => field.name), ENTRY_KEYS, "the declared keys ARE the ENTRY_KEYS this file asserts against the runtime literal");
      assert.deepEqual(literalKeys(entryLiteral(await readSource(QUERY_FILE))), ENTRY_KEYS, "…and so are the runtime literal's — one shape, pinned in one file");
    },
  },

  {
    name: "arch/48 ADR-007 (acd-session-index-derived-not-stored): over the REAL shaper — rebuildable to a deep-equal index with no memoised identity, a stale/unknown node contributes ZERO, an anonymous session is absent from the index and present in nodes[].presence, and the array is sorted by (nodeId, sessionId) (behavioural)",
    run: async () => {
      const nodes = [
        registryNode("node-b", [wireSession("sess-2"), wireSession("sess-1")]),
        registryNode("node-a", [wireSession("sess-A"), wireSession(null, { repo: "beta" })]),
        registryNode("node-stale", [wireSession("sess-S")], "stale"),
        registryNode("node-unknown", [wireSession("sess-U")], "unknown"),
      ];
      const assignments = [{ assignmentId: "asg-1", itemRef: "48/03", workspaceId: "ws-1", targetNodeId: "node-a", state: "running", sessionId: "sess-A" }];

      const first = shape(nodes, assignments);
      const second = shape(nodes, assignments);

      // REBUILDABLE — the same inputs, a content-identical index, no memoisation.
      assert.deepEqual(second.sessions, first.sessions, "the same { nodes, assignments } rebuild a deep-equal index");
      assert.notEqual(second.sessions, first.sessions, "…with no memoised array identity handed back");
      assert.notEqual(second.sessions[0], first.sessions[0], "…nor memoised entry identity");

      // THE FRESHNESS GATE — a live node contributes all of its ADDRESSABLE sessions;
      // stale and unknown contribute ZERO (ambiguity fails CLOSED).
      assert.deepEqual(
        first.sessions.map((entry) => [entry.nodeId, entry.sessionId]),
        [["node-a", "sess-A"], ["node-b", "sess-1"], ["node-b", "sess-2"]],
        "only the live nodes' addressable sessions are in the index, sorted by (nodeId, sessionId) in codepoint order",
      );
      for (const nodeId of ["node-stale", "node-unknown"]) {
        assert.equal(first.sessions.some((entry) => entry.nodeId === nodeId), false, `${nodeId} contributes ZERO sessions`);
        const row = first.nodes.find((node) => node.nodeId === nodeId);
        assert.equal(row.presence.sessions.length, 1, `…while ${nodeId}'s own presence record still reports its session (the gate withholds from the INDEX, it never edits the record)`);
      }

      // ANONYMOUS: absent from the index, COMPLETE in sessions[].
      const nodeA = first.nodes.find((node) => node.nodeId === "node-a");
      assert.equal(nodeA.presence.sessions.length, 2, "the anonymous session is still on the node's own record");
      assert.equal(nodeA.presence.sessions.filter((entry) => entry.sessionId === null).length, 1, "…still saying `sessionId: null`");
      assert.equal(first.sessions.filter((entry) => entry.nodeId === "node-a").length, 1, "…and only the addressable one reached the index");

      // The entry itself, off the real shaper.
      const entry = first.sessions.find((row) => row.sessionId === "sess-A");
      assert.deepEqual(Object.keys(entry), ENTRY_KEYS, "the entry is the ordered nine");
      assert.deepEqual(entry.workItem, { ref: "48/03", assignmentId: "asg-1" }, "…with the derived attribution");
      assert.deepEqual(Object.keys(first), PAYLOAD_KEYS_AFTER, "…and the payload carries exactly the pre-existing keys plus `sessions`");
    },
  },

  {
    name: "arch/48 ADR-013 R12 (acd-session-index-derived-not-stored): a duplicate (nodeId, sessionId) yields exactly ONE row — the later lastPingAt — the SAME two entries in BOTH input orders build a DEEP-EQUAL index, and `now` sixty years apart changes nothing (behavioural)",
    run: async () => {
      // ADR-013 R12's MEASURED, ORDINARY case, not a corner one: ADR-002 made
      // `workspaceId` a key component and the hook derives it from the payload's own
      // `cwd`, so ONE Claude Code session whose working directory moves between repos
      // pings a SECOND leaf under the SAME id, and both records are live for one TTL
      // window. That is a session mid-move.
      const earlier = wireSession("sess-moved", { workspaceId: "ws-1", repo: "alpha", lastPingAt: "2026-08-10T12:00:00.000Z" });
      const later = wireSession("sess-moved", { workspaceId: "ws-2", repo: "beta", lastPingAt: "2026-08-10T12:00:30.000Z" });

      const orderA = shape([registryNode("node-a", [earlier, later])]);
      const orderB = shape([registryNode("node-a", [later, earlier])]);

      // THE ADDRESS IS UNIQUE. m38/ADR-014 routes the terminal mirror on
      // `(nodeId, sessionId)`; an address that resolves to two things is not an address.
      assert.equal(orderA.sessions.length, 1, "one tuple, ONE index row");
      assert.equal(orderB.sessions.length, 1, "…in either arrival order");

      // ORDER-INDEPENDENCE — the assertion R12 names. `readSessionRecordsForNode`
      // returns leaves in `readdir` order with no sort, so a rule that kept the FIRST
      // arrival answered differently on NTFS than on ext4.
      assert.deepEqual(orderB.sessions, orderA.sessions, "the SAME two entries in BOTH arrival orders build a DEEP-EQUAL index — the survivor is not whichever leaf readdir returned first");

      // …and the survivor is the LATER ping, which is the only answer that can be RIGHT
      // rather than merely stable: the duplicate exists because the session MOVED, so
      // the freshest record is where it actually is. Picking the older one labels the
      // repo wrong and opens the terminal on a workspace the session has left.
      assert.equal(orderA.sessions[0].workspaceId, "ws-2", "the survivor is the LATER lastPingAt's record");
      assert.equal(orderA.sessions[0].repo, "beta", "…so the repo label is where the session actually is");
      assert.equal(orderA.sessions[0].lastPingAt, "2026-08-10T12:00:30.000Z");
      assert.deepEqual(Object.keys(orderA.sessions[0]), ENTRY_KEYS, "…and the survivor is an ordinary entry — resolution changes WHICH row, never the row's shape");

      // THE WITHHELD CANDIDATE IS NOT LOST and is NOT a degrade: ADR-007's own division,
      // restated — `sessions[]` is the complete liveness truth, the index its ADDRESSABLE
      // subset. Withholding the loser is the same shape as withholding an anonymous one.
      for (const [label, payload] of [["order A", orderA], ["order B", orderB]]) {
        const presence = payload.nodes.find((node) => node.nodeId === "node-a").presence.sessions;
        assert.equal(presence.length, 2, `${label}: BOTH records are still on the node's own presence record — the resolution withholds from the INDEX, it never edits the record`);
        assert.deepEqual(presence.map((entry) => entry.workspaceId).sort(), ["ws-1", "ws-2"], `${label}: …both workspaces, intact`);
      }

      // AND IT IS NOT A CLOCK. The same duplicate shaped at two instants sixty years
      // apart builds an identical index: the comparison is between two ENTRIES.
      assert.deepEqual(shape([registryNode("node-a", [earlier, later])], [], "2020-01-01T00:00:00.000Z").sessions, orderA.sessions, "`now` in 2020 changes nothing");
      assert.deepEqual(shape([registryNode("node-a", [later, earlier])], [], "2099-12-31T23:59:59.000Z").sessions, orderA.sessions, "…nor does `now` in 2099, in the other arrival order");

      // A non-string `lastPingAt` STATES NOTHING and sorts LAST (ADR-010 R3's discipline
      // one layer up), so it can never take the address off a record that stated one.
      const unstated = wireSession("sess-moved", { workspaceId: "ws-9", repo: "gamma", lastPingAt: null });
      for (const candidates of [[unstated, later], [later, unstated]]) {
        const resolved = shape([registryNode("node-a", candidates)]);
        assert.equal(resolved.sessions.length, 1, "still one row");
        assert.equal(resolved.sessions[0].workspaceId, "ws-2", "…and an unstated timestamp never outranks a stated one, in either arrival order");
      }

      // NON-VACUITY — the rule R12 replaced, re-created over the SAME two candidates.
      // `if (forNode.has(sessionId)) continue` kept whichever leaf arrived first, so it
      // is ORDER-DEPENDENT; the deep-equal assertion above is therefore not vacuously
      // true of any implementation.
      const firstArrivalWins = (candidates) => {
        const held = new Map();
        for (const candidate of candidates) {
          if (held.has(candidate.sessionId)) continue;
          held.set(candidate.sessionId, candidate);
        }
        return [...held.values()];
      };
      assert.equal(firstArrivalWins([earlier, later])[0].workspaceId, "ws-1", "the pre-R12 rule answers ws-1 for one arrival order…");
      assert.equal(firstArrivalWins([later, earlier])[0].workspaceId, "ws-2", "…and ws-2 for the other — ORDER-DEPENDENT, a different answer on NTFS than on ext4");
      assert.notEqual(
        firstArrivalWins([earlier, later])[0].workspaceId,
        firstArrivalWins([later, earlier])[0].workspaceId,
        "…so the two orders GENUINELY differ for a first-arrival rule, which is what makes the deep-equal assertion above a real measurement",
      );
    },
  },

  {
    name: "arch/48 ADR-010 R2 (acd-session-index-derived-not-stored): every miss shape returns exactly null and no lookup call throws — a HIT returns the very entry the array carries (behavioural)",
    run: async () => {
      const index = buildSessionIndex({
        nodes: [registryNode("node-a", [wireSession("sess-A")])],
        assignments: [],
        now: "2026-08-10T12:00:00.000Z",
      });
      const misses = [
        ["node-a", "sess-ZZZ"],
        ["node-other", "sess-A"],
        ["node-a", null],
        ["node-a", ""],
        ["node-unknown", "sess-unknown"],
        [null, "sess-A"],
        ["", "sess-A"],
        [undefined, undefined],
        [42, {}],
        [],
      ];
      for (const args of misses) {
        let value;
        assert.doesNotThrow(() => {
          value = index.lookup(...args);
        }, `lookup(${JSON.stringify(args)}) does not throw`);
        assert.strictEqual(value, null, `lookup(${JSON.stringify(args)}) is exactly null — never undefined (ADR-010 R2)`);
      }
      const hit = index.lookup("node-a", "sess-A");
      assert.equal(hit, index.sessions[0], "a HIT returns the SAME entry object the array carries — one shape, not two");
    },
  },

  {
    name: "arch/48 ADR-007 (acd-session-index-derived-not-stored): self-check — a persisted index table, a session-level TTL re-filter, a dropped freshness gate, a memoising cache, a composed string key, a reordered entry, an undefined miss, a moved payload key, a drifted MeshSession and a BLINDED comment stripper are each FLAGGED by the same detectors the real tree passes (non-vacuous)",
    run: async () => {
      const source = await readSource(QUERY_FILE);
      const eol = eolOf(source);
      assert.deepEqual(indexPathViolations(source), [], "the real index path passes the detector (the premise of every plant)");
      assert.deepEqual(payloadViolations(source), [], "…and so does the real payload literal");

      // ── planted: a PERSISTED index table ────────────────────────────────────
      const sources = await srcSources();
      assert.deepEqual(persistedIndexViolations(sources), [], "the real tree persists no session index");
      const [victimFile, victimSource] = sources.find(([file]) => file === "src/global-work-store.mjs");
      const withTable = `${victimSource}${eolOf(victimSource)}db.exec("CREATE TABLE IF NOT EXISTS global_session_index (node_id TEXT, session_id TEXT, PRIMARY KEY (node_id, session_id))");${eolOf(victimSource)}`;
      assert.notEqual(withTable, victimSource, "the planted TABLE genuinely landed in the source");
      const tableViolations = persistedIndexViolations([[victimFile, withTable]]);
      assert.equal(tableViolations.length, 1, `a persisted session-index table is FLAGGED (got ${JSON.stringify(tableViolations)})`);
      assert.ok(tableViolations[0].includes("global_session_index"), "…by name");
      // …and an INSERT into one is flagged too (a table can also arrive by migration).
      assert.equal(persistedIndexViolations([[victimFile, `${victimSource}${eol}db.prepare("INSERT INTO session_index (node_id) VALUES (?)").run(id);${eol}`]]).length, 1, "an INSERT into a session-index table is FLAGGED");
      // Non-vacuity of the SQL detector itself: the real tree's OWN statements are
      // genuinely being read (it names the tables this repo really has) — asserted over
      // the STRIPPED source, which is the text `persistedIndexViolations` actually
      // scans. Asserting it over the RAW source would keep passing while the stripped
      // path went blind, which is precisely the defect TECH_DEBT item 24 describes.
      assert.ok(statementTableNames(stripComments(victimSource)).includes("global_assignments"), "the SQL scanner really reads this tree's statements AFTER the strip (it found global_assignments)");
      assert.deepEqual(persistedIndexViolations([[victimFile, victimSource]]), [], "…and the pre-existing `session_id` COLUMN on that table is NOT flagged — this rule is about a table, not a column");

      // ── planted: a BLINDED STRIPPER, which is how this whole-src/ absence sweep
      //    goes silently GREEN (TECH_DEBT item 24) ─────────────────────────────
      // The specimen is the exact stripper this file shipped with until the m48 review:
      // block comments FIRST, so a `/*` inside a LINE comment (this tree really writes
      // `templates/work/<type>/*.md` in prose) opens a phantom block that runs to the
      // next `*/`. Both detectors take the stripper as a parameter, so the real order
      // and the blinded order run through the IDENTICAL code path below.
      const blockFirst = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

      // The phantom opens in the LINE comment and closes at the next `*/` — which is an
      // unrelated block comment further down the file, so everything BETWEEN them is
      // deleted: the CREATE TABLE the absence rule was looking for, and an export that
      // proves the deletion happened. This is the literal shape of src/work.mjs.
      const victim = [
        "export const before = 1;",
        "// a path glob quoted in prose: templates/work/<type>/*.md",
        'db.exec("CREATE TABLE IF NOT EXISTS global_session_index (node_id TEXT, session_id TEXT)");',
        "export const afterwards = 2;",
        "/* an ordinary block comment — its closer ends the phantom block */",
        "export const later = 3;",
      ].join(eol);

      // The SHIPPED order reads the file: the planted table is FLAGGED.
      const seen = persistedIndexViolations([["src/planted.mjs", victim]]);
      assert.equal(seen.length, 1, `the shipped (line-first) stripper SEES the planted table (got ${JSON.stringify(seen)})`);
      assert.ok(seen[0].includes("global_session_index"), "…by name");
      assert.deepEqual(strippedCorpusViolations([["src/planted.mjs", victim]]), [], "…and nothing was blinded");

      // The BLINDED order deletes it: the same absence rule passes for the WRONG reason.
      assert.deepEqual(
        persistedIndexViolations([["src/planted.mjs", victim]], blockFirst),
        [],
        "the block-first stripper makes the SAME planted table invisible — the absence sweep goes GREEN over source it deleted itself, which is the silent false GREEN this detector exists to catch",
      );
      const blindedFlags = strippedCorpusViolations([["src/planted.mjs", victim]], blockFirst);
      assert.ok(blindedFlags.length >= 1, `…and THAT is what the blinding detector catches (got ${JSON.stringify(blindedFlags)})`);
      assert.ok(blindedFlags.some((violation) => violation.includes("afterwards")), "…naming the exported symbol the stripper deleted");
      assert.ok(blindedFlags.some((violation) => violation.includes("stripComments")), "…and naming the STRIPPER, so the next reader fixes the tool rather than the assertion");

      // …and it is not a toy: over the REAL src/ corpus the block-first order blinds
      // whole modules (measured: 33,549 characters, 18 exported symbols, five modules).
      const realCorpusBlinded = strippedCorpusViolations(sources, blockFirst);
      assert.ok(realCorpusBlinded.length >= 1, "the block-first order blinds this repo's OWN src/ tree — the fix is load-bearing, not cosmetic");
      assert.deepEqual(strippedCorpusViolations(sources), [], "…and the shipped order blinds none of it");

      // ── planted: a SESSION-LEVEL TTL re-filter inside the index ─────────────
      const build = functionBody(source, "buildSessionIndex");
      assert.ok(build, "the real buildSessionIndex body is extractable");
      const gateLine = build.split(/\r?\n/).find((line) => /node\.freshness\s*!==\s*"live"/.test(line));
      assert.ok(gateLine, "the real body carries the freshness gate line (the premise of the two plants below)");

      const refiltered = source.replace(
        gateLine,
        [gateLine, `${gateLine.match(/^\s*/)[0]}if (Date.parse(session.lastPingAt) < Date.parse(now) - ttlMs) continue;`].join(eol),
      );
      assert.notEqual(refiltered, source, "the planted TTL RE-FILTER genuinely landed in the source");
      const refilterViolations = indexPathViolations(refiltered);
      assert.ok(refilterViolations.length >= 1, `a session-level TTL re-filter is FLAGGED (got ${JSON.stringify(refilterViolations)})`);
      assert.ok(
        refilterViolations.some((violation) => violation.includes("second authority") || violation.includes("clock") || violation.includes("TTL")),
        "…and the flag names the second-authority rule it breaks",
      );

      // ── planted: the THREE liveness re-derivations the NARROWED lastPingAt clause
      //    must still catch (48/ADR-013 R12) ────────────────────────────────────
      // R12 permits ordering two ENTRIES by `lastPingAt` and nothing else. The narrowing
      // is only honest if the shapes it stopped forbidding are the ORDERING ones and
      // every LIVENESS one still trips — so each way of obtaining "a time to compare
      // against" is planted at the same anchor and asserted to be FLAGGED.
      const indent = gateLine.match(/^\s*/)[0];
      const plantAtGate = (statement) => {
        const planted = source.replace(gateLine, [gateLine, `${indent}${statement}`].join(eol));
        assert.notEqual(planted, source, `the plant genuinely landed: ${statement}`);
        return indexPathViolations(planted);
      };

      // (i) a bare `now` cutoff — no Date.parse at all, so it survives the clock rule
      //     and is caught because `now` may not be READ in the index path.
      const nowCutoff = plantAtGate('if (session.lastPingAt < now) continue;');
      assert.ok(nowCutoff.length >= 1, `a bare \`now\` cutoff is FLAGGED (got ${JSON.stringify(nowCutoff)})`);
      assert.ok(nowCutoff.some((violation) => violation.includes("`now` input")), "…named as the `now` input the index must never read");

      // (ii) a LITERAL timestamp cutoff — the one shape that names neither a clock, nor
      //      `now`, nor a TTL, and would have slipped through the narrowing had the
      //      literal rule not been added with it.
      const literalCutoff = plantAtGate('if (session.lastPingAt < "2026-08-10T11:58:00.000Z") continue;');
      assert.ok(literalCutoff.length >= 1, `a LITERAL timestamp cutoff is FLAGGED (got ${JSON.stringify(literalCutoff)})`);
      assert.ok(literalCutoff.some((violation) => violation.includes("LITERAL ISO timestamp")), "…named as a clock with the clock spelled out");
      assert.equal(
        literalCutoff.some((violation) => violation.includes("`now` input") || violation.includes("a clock —")),
        false,
        "…and it is caught by the LITERAL rule specifically, not incidentally by the clock/now rules — which is what makes that rule load-bearing rather than decorative",
      );

      // (iii) the shared staleness predicate, re-evaluated here.
      const restaled = plantAtGate("if (!isSessionLive(session, nowMs, ttlMs)) continue;");
      assert.ok(restaled.some((violation) => violation.includes("staleness predicate")), "a second evaluation of the shared staleness predicate is FLAGGED");

      // (iv) a `lastPingAt` that is NOT a read off an entry operand — the residue rule's
      //      own remaining job after the narrowing.
      const bareName = plantAtGate("const { lastPingAt } = session;");
      assert.ok(
        bareName.some((violation) => violation.includes("outside a read off an entry operand")),
        `a lastPingAt taken out of entry shape is FLAGGED (got ${JSON.stringify(bareName)})`,
      );

      // …and the ORDERING R12 requires is NOT flagged: the real comparator is exactly
      // this shape, and the narrowed clause must let it through or the ADR is unbuildable.
      const ordering = plantAtGate("const fresher = candidate.lastPingAt > held.lastPingAt;");
      assert.deepEqual(
        ordering,
        [],
        `comparing TWO ENTRIES' lastPingAt is ORDERING, not liveness, and is explicitly permitted by ADR-013 R12 (got ${JSON.stringify(ordering)})`,
      );

      // ── planted: the FRESHNESS GATE dropped, and loosened ───────────────────
      const ungated = source.replace(`${gateLine}${eol}`, "");
      assert.notEqual(ungated, source, "the planted GATE DELETION genuinely landed");
      assert.ok(
        indexPathViolations(ungated).some((violation) => violation.includes("freshness")),
        "a dropped freshness gate is FLAGGED — a node that stops heartbeating would read live forever",
      );
      const loosened = source.replace(gateLine, gateLine.replace(/node\.freshness\s*!==\s*"live"/, "node.freshness === \"dead\""));
      assert.notEqual(loosened, source, "the planted LOOSENED gate genuinely landed");
      assert.ok(
        indexPathViolations(loosened).some((violation) => violation.includes("freshness")),
        "…and so is a gate that stops comparing against the exact string \"live\" (ambiguity must fail CLOSED)",
      );

      // ── planted: a MEMOISING module-level cache ────────────────────────────
      const cached = `${source}${eol}const sessionIndexCache = new Map();${eol}`;
      assert.notEqual(cached, source, "the planted CACHE genuinely landed");
      assert.ok(
        indexPathViolations(cached).some((violation) => violation.includes("caches NOTHING")),
        "a module-scope cache is FLAGGED — a memoised second call is how a derived answer goes stale",
      );

      // ── planted: a COMPOSED string key (the mirror's private spelling) ──────
      const composed = source.replace(gateLine, [gateLine, `${gateLine.match(/^\s*/)[0]}const routingKey = \`\${node.nodeId}::\${session.sessionId}\`;`].join(eol));
      assert.notEqual(composed, source, "the planted COMPOSED KEY genuinely landed");
      assert.ok(
        indexPathViolations(composed).some((violation) => violation.includes("composed")),
        "a composed `nodeId::sessionId` key is FLAGGED — two spellings of one tuple drift",
      );

      // ── planted: a REORDERED entry ─────────────────────────────────────────
      const entry = entryLiteral(source);
      assert.ok(entry, "the real entry literal is extractable");
      const entryLines = entry.split(/\r?\n/);
      const idIndex = entryLines.findIndex((line) => /^\s*sessionId,/.test(line));
      const workItemIndex = entryLines.findIndex((line) => /^\s*workItem:/.test(line));
      assert.ok(idIndex > 0 && workItemIndex > idIndex, "the real entry has a sessionId line to move past workItem");
      const reorderedLines = [...entryLines];
      const [idLine] = reorderedLines.splice(idIndex, 1);
      reorderedLines.splice(workItemIndex, 0, idLine);
      const reordered = source.replace(entry, reorderedLines.join(eol));
      assert.notEqual(reordered, source, "the planted ENTRY REORDER genuinely landed");
      assert.ok(
        indexPathViolations(reordered).some((violation) => violation.includes("in that order")),
        "a reordered entry is FLAGGED — the order IS the contract",
      );

      // ── planted: an `undefined` miss (ADR-010 R2's exact ruling) ────────────
      const undefinedMiss = source.replace("return byNode.get(nodeId)?.get(sessionId) ?? null;", "return byNode.get(nodeId)?.get(sessionId);");
      assert.notEqual(undefinedMiss, source, "the planted UNDEFINED MISS genuinely landed");
      assert.ok(
        indexPathViolations(undefinedMiss).some((violation) => violation.includes("?? null")),
        "a lookup that leaks `undefined` is FLAGGED — ADR-010 R2 fixes the value at null",
      );
      const unguarded = source.replace(/if \(typeof sessionId !== "string" \|\| sessionId\.length === 0\) return null;\r?\n\s+return byNode/, "      return byNode");
      assert.notEqual(unguarded, source, "the planted UNGUARDED HALF genuinely landed");
      assert.ok(
        indexPathViolations(unguarded).some((violation) => violation.includes("sessionId")),
        "a lookup that stops guarding a half of the tuple is FLAGGED",
      );

      // ── planted: the payload's additivity broken ────────────────────────────
      const payload = payloadLiteral(source);
      assert.ok(payload, "the real payload literal is extractable");
      const payloadLines = payload.split(/\r?\n/);
      const sessionsIndex = payloadLines.findIndex((line) => /^\s*sessions:/.test(line));
      const nodesIndex = payloadLines.findIndex((line) => /^\s*nodes,/.test(line));
      assert.ok(sessionsIndex > 0 && nodesIndex > 0, "the real payload has both lines (the premise of the plant)");
      const withoutNodes = source.replace(payload, payloadLines.filter((_, i) => i !== nodesIndex).join(eol));
      assert.notEqual(withoutNodes, source, "the planted DROPPED KEY genuinely landed");
      assert.ok(
        payloadViolations(withoutNodes).some((violation) => violation.includes("ADR-007 adds EXACTLY")),
        "dropping a pre-existing payload key is FLAGGED — the growth is additive or it is not shipped",
      );
      const swapped = [...payloadLines];
      [swapped[nodesIndex], swapped[nodesIndex - 1]] = [swapped[nodesIndex - 1], swapped[nodesIndex]];
      const reorderedPayload = source.replace(payload, swapped.join(eol));
      assert.notEqual(reorderedPayload, source, "the planted PAYLOAD REORDER genuinely landed");
      assert.ok(
        payloadViolations(reorderedPayload).some((violation) => violation.includes("relative order")),
        "reordering the pre-existing payload keys is FLAGGED — an insertion, never a reorder",
      );

      // ── planted: the WIRE TYPE drifts from the entry ────────────────────────
      // The whole point of proof 4: the runtime shape is pinned elsewhere, so a drifted
      // TYPE is invisible to every other test in the milestone. Each mutation is built
      // from lines split OUT of the real declaration and rejoined with that file's own
      // line ending, so a plant cannot silently stop landing.
      const wireType = await readSource(WIRE_TYPE_FILE);
      const typeEol = eolOf(wireType);
      assert.deepEqual(wireTypeViolations(wireType), [], "the real wire type passes the detector (the premise of every plant below)");

      const meshLiteral = balancedSlice(wireType, wireType.indexOf("{", wireType.indexOf("export type MeshSession")));
      assert.ok(meshLiteral, "the real MeshSession declaration is extractable");
      const meshLines = meshLiteral.split(/\r?\n/);
      const typeIdIndex = meshLines.findIndex((line) => /^\s*sessionId\s*\??\s*:/.test(line));
      const typeWorkItemIndex = meshLines.findIndex((line) => /^\s*workItem\s*\??\s*:/.test(line));
      assert.ok(typeIdIndex > 0 && typeWorkItemIndex > typeIdIndex, "the real declaration has both a sessionId and a trailing workItem line");
      const plantMesh = (lines) => {
        const planted = wireType.replace(meshLiteral, lines.join(typeEol));
        assert.notEqual(planted, wireType, "the plant genuinely landed in ui/src/fleet/api.ts");
        return planted;
      };
      const indentOf = (line) => line.match(/^\s*/)[0];

      const nullableId = plantMesh(meshLines.map((line, i) => (i === typeIdIndex ? `${indentOf(line)}sessionId: string | null;` : line)));
      assert.ok(
        wireTypeViolations(nullableId).some((violation) => violation.includes("MeshSession.sessionId")),
        "a `string | null` sessionId is FLAGGED — the INDEX is the addressable subset, and an entry with no id cannot be keyed on the tuple",
      );

      const optionalId = plantMesh(meshLines.map((line, i) => (i === typeIdIndex ? `${indentOf(line)}sessionId?: string;` : line)));
      assert.ok(
        wireTypeViolations(optionalId).some((violation) => violation.includes("OPTIONAL")),
        "an optional (omittable) sessionId is FLAGGED — every key of the entry is unconditionally present",
      );

      const solidWorkItem = plantMesh(meshLines.map((line, i) => (i === typeWorkItemIndex ? `${indentOf(line)}workItem: { ref: string; assignmentId: string };` : line)));
      assert.ok(
        wireTypeViolations(solidWorkItem).some((violation) => violation.includes("MeshSession.workItem")),
        "a non-nullable workItem is FLAGGED — a free session's whole representation is `workItem: null`",
      );

      const movedId = [...meshLines];
      const [typeIdLine] = movedId.splice(typeIdIndex, 1);
      movedId.splice(typeWorkItemIndex, 0, typeIdLine);
      assert.ok(
        wireTypeViolations(plantMesh(movedId)).some((violation) => violation.includes("in that order")),
        "a reordered MeshSession is FLAGGED — the order IS the contract, and it is the SAME order the runtime entry is pinned to",
      );

      // ── planted: GlobalMeshStatus loses / loosens / moves `sessions` ────────
      const statusLiteral = balancedSlice(wireType, wireType.indexOf("{", wireType.indexOf("export type GlobalMeshStatus")));
      assert.ok(statusLiteral, "the real GlobalMeshStatus declaration is extractable");
      const statusLines = statusLiteral.split(/\r?\n/);
      const statusSessionsIndex = statusLines.findIndex((line) => /^\s*sessions\s*\??\s*:/.test(line));
      const statusDiagnosticsIndex = statusLines.findIndex((line) => /^\s*diagnostics\s*\??\s*:/.test(line));
      assert.ok(statusSessionsIndex > 0 && statusDiagnosticsIndex > statusSessionsIndex, "the real payload type declares `sessions` ahead of `diagnostics`");
      const plantStatus = (lines) => {
        const planted = wireType.replace(statusLiteral, lines.join(typeEol));
        assert.notEqual(planted, wireType, "the plant genuinely landed in ui/src/fleet/api.ts");
        return planted;
      };

      assert.ok(
        wireTypeViolations(plantStatus(statusLines.filter((_, i) => i !== statusSessionsIndex))).some((violation) => violation.includes("the ONE key ADR-007 adds")),
        "a payload type with no `sessions` key is FLAGGED — every reader of the index would have to cast",
      );
      assert.ok(
        wireTypeViolations(plantStatus(statusLines.map((line, i) => (i === statusSessionsIndex ? `${indentOf(line)}sessions?: MeshSession[];` : line)))).some((violation) => violation.includes("OPTIONAL")),
        "an optional `sessions` is FLAGGED — `[]` means nobody is working, absence would mean nothing at all",
      );
      assert.ok(
        wireTypeViolations(plantStatus(statusLines.map((line, i) => (i === statusSessionsIndex ? `${indentOf(line)}sessions: unknown[];` : line)))).some((violation) => violation.includes("MeshSession[]")),
        "a `sessions` typed as anything but MeshSession[] is FLAGGED — the mirror must mirror",
      );
      const movedSessions = [...statusLines];
      const [sessionsLine] = movedSessions.splice(statusSessionsIndex, 1);
      movedSessions.splice(movedSessions.findIndex((line) => /^\s*diagnostics\s*\??\s*:/.test(line)) + 1, 0, sessionsLine);
      assert.ok(
        wireTypeViolations(plantStatus(movedSessions)).some((violation) => violation.includes("INSERTED between")),
        "appending `sessions` after `diagnostics` is FLAGGED — the runtime literal inserts it beside the rows it derives from, and the mirror follows",
      );
    },
  },
];
