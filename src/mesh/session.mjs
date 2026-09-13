// src/mesh/session.mjs — the SESSION dimension (milestone 38 / story 00, ADR-002;
// RE-KEYED by milestone 48 / story 00, ADR-002 + ADR-006 + ADR-010): a
// per-(nodeId, workspaceId, assistant, sessionId) live coding-assistant session
// record, TTL self-expiring liveness (REUSING the shared isStale predicate, never a
// parallel staleness rule), the store's own path-traversal-safe leaf composition,
// and — since 48/ADR-006 — the ORPHAN REAPER that makes the TTL an actual removal
// rather than a read-time filter over files nothing ever deletes.
//
// 48/ADR-002: the leaf gained a FOURTH component so two concurrent sessions in one
// repo are two records (RESEARCH §3 measured the collision: a blind upsert merged
// them, and either one's `end` deleted the other's liveness). The key travels as ONE
// object — never a fifth positional argument, precisely the shape a caller silently
// forgets — and `sessionId` is EXPLICITLY PRESENT and `null` for an anonymous
// session (48/ADR-001: the id is READ from the assistant, never made, so "no id on
// any channel" is a first-class state the record states rather than papers over).
//
// A session record is a TRANSIENT per-install liveness fact — like presence, like
// identity — so it lives under the node's OWN global mesh home
// (globalMeshPaths(...).meshRoot, honoring AOF_GLOBAL_HOME) in a `sessions/`
// partition: NEVER git, NEVER the repo working tree, NEVER synced over the git bus
// (23/ADR-001 relay-stateless + 33/ADR-004 clone-safe discipline).
//
// `startSession`/`pingSession`/`endSession` are the SOLE producers of a session
// record (ADR-002's "sole producer per state" discipline, mirroring the m35
// assignment-record module): start writes (startedAt = lastPingAt = now); ping
// upserts (an unknown session is upserted, so ping works with no prior start);
// end deletes (ENOENT-tolerant — ending an already-gone/never-written session is a
// benign no-op, never an error). Each is ONE atomic single-record write through the
// m19/R2 writeText temp+rename seam — never a bare write.
//
// TTL liveness (isSessionLive) REUSES the shared isStale predicate (imported from
// run-store.mjs — the SAME predicate mesh-presence.mjs's isNodeStale reuses) — no
// hand-rolled parallel staleness rule (acd-session-ttl-reuses-isstale).
import path from "node:path";
import { mkdir, readFile, readdir, unlink } from "node:fs/promises";
import { writeText } from "../fs.mjs";
import { meshDir } from "./store.mjs";
import { isStale } from "../run-store.mjs";
// m42 item 3 — every former silent catch reports a coded degrade event. The reaper
// (48/ADR-006) is opportunistic by contract: a leaf it cannot delete is REPORTED
// here and never propagates out of a session write.
import { reportDegrade } from "../degrade.mjs";

// The DOCUMENTED default session TTL, in seconds (ADR-002). Comfortably above the
// UserPromptSubmit ping cadence's headroom, so a live-but-quiet session (an assistant
// open, no prompt yet) is never falsely expired. EXPORTED (mirroring
// DEFAULT_PRESENCE_STALENESS_SECONDS) so a test imports the constant, never a
// duplicated literal.
export const DEFAULT_SESSION_TTL_SECONDS = 120;

// Resolve the session TTL (in SECONDS) from config, falling back to the DOCUMENTED
// default (ADR-002) — mirrors resolveStalenessSeconds EXACTLY: read off
// config.mesh?.session?.ttlSeconds via the raw optional-chain idiom (NOT
// config-editor.mjs's whitelist — the 22/story-01 lesson). A finite number >= 0 is
// honoured (so 0 is a valid, if aggressive, TTL); absent / NaN / negative / null /
// wrong-type all fall back to THIS single documented source.
export function resolveSessionTtlSeconds(config) {
  const configured = config?.mesh?.session?.ttlSeconds;
  if (typeof configured === "number" && Number.isFinite(configured) && configured >= 0) {
    return configured;
  }
  return DEFAULT_SESSION_TTL_SECONDS;
}

// ------------------------------------------------- the traversal-safe 4-part leaf ----

// A single path segment collapses `..`/`/`/`\` into `-` (the mesh-store.mjs flatLeaf
// invariant, applied per-input) — never letting a traversal-shaped id become a
// multi-segment path. This is a PATH-SAFETY coercion at the seam, not id policy.
//
// 48/ADR-010 R1: this function is DELIBERATELY UNCHANGED and `~` is NOT added to its
// collapse set. The three m38 segments must keep composing byte-for-byte, because
// readSessionRecordsForNode scans by the literal `${safeSegment(nodeId)}~` prefix —
// the per-node read is the one thing in this module that must not move.
function safeSegment(value) {
  return String(value).replace(/[\\/]/g, "-").replace(/\.\.+/g, "-");
}

// The FOURTH segment's OWN composition (48/ADR-010 R1) — the session id is a value
// from ANOTHER system, so it gets a stronger rule than the other three: every byte
// outside the conservative allow-list [A-Za-z0-9._-] is percent-encoded as %XX
// (uppercase hex, per UTF-8 byte). The encoding is INJECTIVE — distinct ids compose
// distinct segments — so the merge-two-sessions-into-one-record defect ADR-002 exists
// to close can never be re-opened through an id's charset. `~` encodes to %7E, so the
// separator stays unambiguous and the leaf always splits into exactly four parts;
// `/`, `\` and `%` are outside the allow-list too, so the result is one flat leaf that
// cannot traverse. A UUID (the measured shape) encodes to ITSELF, which is what keeps
// the live directory listing readable.
//
// It has exactly ONE direction and there is NO decoder anywhere — nothing ever reads
// an id back off a filename (readSessionRecordsForNode parses record CONTENT), so
// there is no second spelling of an id that could drift from the one the assistant
// issued. An anonymous session (sessionId: null, 48/ADR-001) composes the EMPTY
// segment: leaf `<node>~<workspace>~<assistant>~`, trailing separator intact.
function sessionSegment(sessionId) {
  if (sessionId == null) return "";
  let encoded = "";
  for (const byte of Buffer.from(String(sessionId), "utf8")) {
    const char = String.fromCharCode(byte);
    encoded += /[A-Za-z0-9._-]/.test(char) ? char : `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
  }
  return encoded;
}

// The session record's traversal-safe leaf — the 4-part key
// (nodeId, workspaceId, assistant, sessionId) joined with `~` (a separator neither
// safeSegment nor sessionSegment output ever contains), so the four parts can never
// be confused for each other. The key arrives as ONE object (48/ADR-002): a
// positional session component is exactly what a caller forgets, and a forgotten
// session component reintroduces the collision this key exists to close.
function sessionLeaf({ nodeId, workspaceId, assistant, sessionId = null } = {}) {
  return `${safeSegment(nodeId)}~${safeSegment(workspaceId)}~${safeSegment(assistant)}~${sessionSegment(sessionId)}`;
}

function sessionsDir(workspace) {
  return path.join(meshDir(workspace), "sessions");
}

// The ONE session-record path builder — built FROM meshDir (the same partition root
// presence/nodes use), keyed by the 4-part tuple: exactly one flat
// sessions/<node>~<workspace>~<assistant>~<session>.json leaf directly under the
// partition root. Co-located with the global_node_workspaces registry the aggregation
// reads (ADR-003) — one AOF_GLOBAL_HOME covers both.
export function sessionRecordPath(workspace, key) {
  return path.join(sessionsDir(workspace), `${sessionLeaf(key)}.json`);
}

// ------------------------------------------------------- the record assembly ----

// Assemble a session record — the FROZEN schema, EXACTLY these SEVEN keys in this
// order (48/ADR-002, re-freezing m38's six by INSERTION):
// { nodeId, workspaceId, repo, assistant, sessionId, startedAt, lastPingAt }.
// `sessionId` is inserted after `assistant` so the identity block sits together ahead
// of the lifecycle pair, and every m38 key keeps its RELATIVE order. A PURE projection
// of its inputs (no fs, no clock) so the frozen shape has ONE home both start/ping
// route through.
//
// `sessionId` is EXPLICITLY PRESENT and `null` when no channel supplied one — never
// omitted (a reader cannot otherwise tell "this build has no session ids" from "this
// session has none") and never generated (48/ADR-001). The `?? null` is what makes
// the key survive JSON.stringify for an anonymous session.
//
// 50/ADR-008 decision 8: the seven become EIGHT by APPEND — `relaying`, the LAST key,
// with every existing key keeping its position (the same additive discipline m48 itself
// used when it re-froze m38's six by insertion). It states ONE transport fact: "something
// is bridging this session's PTY output up this worker's stream" — precisely what a
// `.sendTerminalFrame(` call site embodies.
//
// A BOOLEAN, NEVER A NAMED PRODUCER. `producer: "launcher" | "assignment"` was rejected in
// ADR-008 because it would hand any future build the means to MARK a launched session,
// which SPEC forbids by name ("a launcher that produces a second class of session defeats
// its own purpose"). With a boolean the payload CANNOT distinguish the two populations, so
// no-second-class is structural rather than a rule someone must remember.
//
// Read with a strict `=== true`, exactly as `workspaceHasRun` is one hop down the wire: an
// unstated fact is `false`, never `undefined` — the key is ALWAYS PRESENT so a reader can
// tell "this build states nothing" from "this session has no bridge".
export function assembleSessionRecord({ nodeId, workspaceId, repo, assistant, sessionId, startedAt, lastPingAt, relaying }) {
  return {
    nodeId,
    workspaceId,
    repo,
    assistant,
    sessionId: sessionId ?? null,
    startedAt,
    lastPingAt,
    relaying: relaying === true,
  };
}

// ------------------------------------------------------------- read ----

// Read ONE session record by its 4-part key object, parsed off disk.
// Absence-tolerant: a key with no record on disk (ENOENT, or any read miss) reads as
// null — the same absence-is-benign discipline mesh-store/mesh-presence keep. A read
// mutates nothing.
//
// THE READ IS HONEST ABOUT WHOSE RECORD IT FOUND (48/ADR-013 R14, TECH_DEBT item 35).
// A leaf is a filesystem path, and on a case-insensitive filesystem (Windows, default
// macOS) `…~sess-ABC.json` and `…~sess-abc.json` are ONE file — so a read for `sess-ABC`
// could return a record whose `sessionId` is `"sess-abc"`: not an absence and not a
// visible merge, but ANOTHER session's id, byte for byte. A wrong value that still looks
// valid is the one outcome ADR-001's byte-identity clause and ADR-011/R6 both exist to
// exclude — it rides the wire, reaches the index, and joins
// `global_assignments.session_id` to the WRONG row. The record is already parsed here,
// so one comparison closes it: a record whose id is not the id we ASKED for is not this
// key's record, and reads as this module's own absence-is-benign `null`.
//
// The `?? null` on BOTH sides is load-bearing, not idiom: a PRE-m48 record carries no
// `sessionId` key at all, and reading it by an anonymous key must still match — ADR-002's
// "there is NO migration" claim rests on exactly that read, and this guard must not break
// the thing it exists to protect.
//
// It makes the READ honest; it does NOT make the WRITE non-destructive (R14's stated
// limit — the second session's write still replaces the first one's file on such a
// filesystem, which is a liveness merge, never a wrong address).
export async function readSessionRecord(workspace, key) {
  try {
    const record = JSON.parse(await readFile(sessionRecordPath(workspace, key), "utf8"));
    if ((record?.sessionId ?? null) !== (key?.sessionId ?? null)) return null;
    return record;
  } catch {
    return null;
  }
}

// Read every session record for a node, parsed. Absence-tolerant: no sessions/ dir
// (or nothing yet written) reads as [] — never an error. A torn/unparseable file is
// skipped rather than blinding the whole list (the derived/rebuildable discipline).
// This is a per-NODE read (filters to files whose leaf's node segment matches) — the
// aggregation (ADR-003) reads across workspaces for THIS node, never another node's.
//
// 48/ADR-002: UNCHANGED code, CHANGED meaning. It filters by the `<nodeId>~` leaf
// prefix and parses record CONTENT, so it transparently returns N records for one
// (workspace, assistant) pair where it previously returned at most one — and a
// pre-m48 THREE-part leaf still matches the prefix, so it is read (as an anonymous
// record) until the reaper removes it. Every downstream reader already iterates a
// list, so no caller needs teaching.
export async function readSessionRecordsForNode(workspace, nodeId) {
  let entries = [];
  try {
    entries = await readdir(sessionsDir(workspace));
  } catch (error) {
    // ENOENT is the ONLY benign one — no sessions/ dir yet means nothing has ever
    // registered, which is a true absence. Any other fault (EACCES, ENOTDIR, EIO)
    // makes this reader answer "no live sessions" for a store that exists and cannot
    // be read, and every consumer downstream — presence, and since 96/00 the run
    // mint's session-id rung — then reports honest absence for a reason nothing
    // states. Discriminated exactly as reapExpiredSessions' own readdir already is.
    if (error?.code !== "ENOENT") reportDegrade("mesh-session-read", error, { path: sessionsDir(workspace) });
    return [];
  }
  const prefix = `${safeSegment(nodeId)}~`;
  const records = [];
  for (const name of entries) {
    if (!name.endsWith(".json") || !name.startsWith(prefix)) continue;
    try {
      records.push(JSON.parse(await readFile(path.join(sessionsDir(workspace), name), "utf8")));
    } catch {
      continue;
    }
  }
  return records;
}

// ------------------------------------------------------------- the orphan reaper ----

// Resolve the ONE clock + TTL a reap runs under (48/ADR-006: "the reap and the read
// share ONE clock per invocation"). The option NAMES are readLiveSessions' own
// (options.now / options.ttlSeconds / options.config, mesh-presence.mjs) so one
// options object can feed both without inventing a second convention; the workspace's
// own config is the production source of the documented `mesh.session.ttlSeconds`
// knob. Factored out so the reap body itself holds no clock arithmetic at all.
function resolveReapWindow(workspace, options) {
  const nowMs = typeof options.now === "function" ? Date.parse(options.now()) : Date.parse(options.now ?? new Date().toISOString());
  const ttlSeconds = typeof options.ttlSeconds === "number" ? options.ttlSeconds : resolveSessionTtlSeconds(options.config ?? workspace?.config);
  return { nowMs, ttlMs: ttlSeconds * 1000 };
}

// reapExpiredSessions(workspace, nodeId, options) — 48/ADR-006's named removal verb,
// and the ONLY mechanism that makes a session leave disk when its assistant never
// says goodbye (a crash, a force-kill, a machine powered off — or a Codex session,
// which by construction can never fire an end event: RESEARCH §1 measured that Codex
// has no SessionEnd at all). It unlinks every leaf of THIS node that the SHARED
// isSessionLive predicate calls expired — the predicate is REUSED, never
// re-expressed, so no second staleness rule can disagree with any other reader.
//
// It runs at the WRITE seam (startSession/pingSession call it before they write), so
// reads stay pure and no daemon, schedule or launcher edit is needed. It sweeps by
// FILE NAME under this node's own `${safeSegment(nodeId)}~` prefix — never another
// node's leaves (a control node reaping a peer's record would be a second authority
// over that machine's liveness), and never by recomposing a leaf from a parsed
// record, which is what lets a pre-m48 THREE-part leaf be removed by the same sweep:
// that is ADR-002's whole migration.
//
// FAILURE-ISOLATED BY CONTRACT: it never throws. Any fault — an unlink that fails, a
// racing sibling that already removed the file, an unreadable entry — is reported
// through the coded-degrade seam and swallowed at this boundary, because a session
// start/ping must not fail because a stale neighbour could not be deleted. Idempotent:
// reaping twice removes nothing the second time. Returns the number of leaves removed.
//
// `options.unlink` (48/ADR-010 R5) is the INJECTED deleter, defaulting to this
// module's own `unlink` import — the house convention for proving a fault path that
// no real filesystem can produce portably across this fleet's three platforms. NO
// src/ call site may supply it (acd-session-orphan-reaped): a test seam must never
// become a production door.
export async function reapExpiredSessions(workspace, nodeId, options = {}) {
  const unlinkFile = options.unlink ?? unlink;
  let reaped = 0;
  try {
    const { nowMs, ttlMs } = resolveReapWindow(workspace, options);
    const dir = sessionsDir(workspace);
    let entries = [];
    try {
      entries = await readdir(dir);
    } catch (error) {
      // ENOENT is the ONLY benign one: no sessions/ dir yet means nothing to sweep. Any
      // other fault (EACCES, EPERM, EIO) disables the reaper for this node ENTIRELY and
      // for as long as it lasts — the exact failure ADR-006 says must be "reported
      // through the coded-degrade seam and never propagate", and the one the sibling
      // catch below already discriminates correctly. Undiscriminated, it is silent
      // forever: TTL stops being a removal, disk grows without bound, and pre-m48 leaves
      // never migrate, with nothing anywhere saying why.
      if (error?.code !== "ENOENT") reportDegrade("mesh-session-reap", error, { path: dir });
      return reaped;
    }
    const prefix = `${safeSegment(nodeId)}~`;
    for (const name of entries) {
      if (!name.endsWith(".json") || !name.startsWith(prefix)) continue;
      const file = path.join(dir, name);
      try {
        const record = JSON.parse(await readFile(file, "utf8"));
        if (isSessionLive(record, nowMs, ttlMs)) continue;
        await unlinkFile(file);
        reaped += 1;
      } catch (error) {
        if (error?.code === "ENOENT") continue; // a racing sibling already removed it
        reportDegrade("mesh-session-reap", error, { path: file });
      }
    }
  } catch (error) {
    reportDegrade("mesh-session-reap", error);
  }
  return reaped;
}

// ------------------------------------------------------------- write (sole producers) ----

// startSession(workspace, key, options) — writes the record fresh:
// startedAt = lastPingAt = now. ONE atomic single-record write through the writeText
// temp+rename seam, per SESSION (48/ADR-002) — it can no longer clobber a sibling
// session in the same repo.
//
// It REAPS before it writes (48/ADR-006): the sweep is a side-effect of the write,
// never a replacement for it, and never a reason for it to fail. `options` is the
// trailing seam bag (unlink/now/ttlSeconds/config) forwarded to the reap — the KEY
// object does not grow; production supplies no options at all.
//
// 50/ADR-008 decision 8: `relaying` travels in the SAME bag as `repo` — a stated fact
// about this session, not part of the 4-part KEY (the key object does not grow; a
// positional session component is exactly what a caller forgets). Defaulted `false`, so
// every existing caller — the hook-registered path above all — is byte-identical in
// meaning: an operator's own `claude` on a worker states nothing and nothing relays it.
export async function startSession(workspace, { nodeId, workspaceId, repo, assistant, sessionId = null, relaying = false, now }, options = {}) {
  const nowIso = now ?? new Date().toISOString();
  await reapExpiredSessions(workspace, nodeId, { ...options, now: options.now ?? nowIso });
  const record = assembleSessionRecord({ nodeId, workspaceId, repo, assistant, sessionId, startedAt: nowIso, lastPingAt: nowIso, relaying });
  await mkdir(sessionsDir(workspace), { recursive: true });
  await writeText(sessionRecordPath(workspace, { nodeId, workspaceId, assistant, sessionId }), JSON.stringify(record, null, 2));
  return record;
}

// pingSession(workspace, key, options) — UPSERTS: refreshes lastPingAt = now on an
// existing record (startedAt/repo unchanged), or mints a fresh record
// (startedAt = lastPingAt = now) when no prior record exists — idempotent, so a ping
// without a prior start still registers the session (a crash-recovered assistant
// self-heals on its very next ping). ONE atomic single-record write.
//
// Since 48/ADR-002 the `startedAt` it preserves is unambiguously THIS session's: the
// merge-two-processes-into-one-record defect is closed by the key, not by a check.
// It REAPS before it writes, under the same instant it is about to stamp.
//
// 50/ADR-008 decision 8 — `relaying` is STICKY, mirroring the `repo: existing?.repo ?? repo`
// carry-forward one line down. The rule is the DISJUNCTION
// `relaying === true || existing?.relaying === true`, which makes an explicit `false`
// non-demoting, and that is the honest reading of "sticky": a ping that forgot the field —
// or a caller that spells it `false` because it does not know — must never silently demote
// a LIVE, typeable pane to `no live output` mid-session. The record is deleted at
// `endSession`, so the fact never outlives the bridge; there is nothing for stickiness to
// leave behind.
export async function pingSession(workspace, { nodeId, workspaceId, repo, assistant, sessionId = null, relaying = false, now }, options = {}) {
  const nowIso = now ?? new Date().toISOString();
  await reapExpiredSessions(workspace, nodeId, { ...options, now: options.now ?? nowIso });
  const existing = await readSessionRecord(workspace, { nodeId, workspaceId, assistant, sessionId });
  const record = assembleSessionRecord({
    nodeId,
    workspaceId,
    repo: existing?.repo ?? repo,
    assistant,
    sessionId,
    startedAt: existing?.startedAt ?? nowIso,
    lastPingAt: nowIso,
    relaying: relaying === true || existing?.relaying === true,
  });
  await mkdir(sessionsDir(workspace), { recursive: true });
  await writeText(sessionRecordPath(workspace, { nodeId, workspaceId, assistant, sessionId }), JSON.stringify(record, null, 2));
  return record;
}

// endSession(workspace, { nodeId, workspaceId, assistant, sessionId }) — DELETES the
// record, and ONLY its own full 4-part leaf (48/ADR-002): a sibling session in the
// same repo is untouched, which is the single most important behavioural consequence
// of the key change. ENOENT-tolerant: ending a key with no record (already
// TTL-expired, or never written) is a benign no-op success, never a thrown error —
// writeText has no delete counterpart, so this is the ONE place the session module
// reaches past it for the "end" verb's delete-semantics.
//
// It does NOT take the reaper's unlink seam: `end` is an optimisation, never the
// mechanism (48/ADR-006), and a seam no scenario needs is a production path waiting
// to be misused (48/ADR-010 R5).
export async function endSession(workspace, { nodeId, workspaceId, assistant, sessionId = null }) {
  try {
    await unlink(sessionRecordPath(workspace, { nodeId, workspaceId, assistant, sessionId }));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

// ------------------------------------------------------------- TTL liveness ----

// isSessionLive(record, nowMs, ttlMs) — a session is LIVE iff `!isStale(...)` using
// the SAME shared predicate the whole mesh already shares (isStale, run-store.mjs;
// re-exposed as isNodeStale by mesh-presence.mjs) — strict `>`, so a session AT the
// TTL is still live. isStale reads `record.heartbeatAt ?? record.updatedAt`; the
// session record carries neither key, so `heartbeatAt` is passed EXPLICITLY here —
// the record is shaped so the shared predicate's fallback resolves to lastPingAt
// without the predicate itself needing to know the session schema.
export function isSessionLive(record, nowMs, ttlMs) {
  return !isStale({ heartbeatAt: record?.lastPingAt }, nowMs, ttlMs);
}

// ------------------------------------------------- the run mint's session-id rung ----

// resolveSessionIdFromLiveStore(workspace, key) — 96/ADR-001 §2: the ONE rung that
// reads this liveness store for an attribution id, homed HERE because this module is
// the store's home and a second reader of `~/.aof/mesh/sessions` anywhere in `src/`
// is the thing FF-9601 forbids. `resolveSessionIdentity` (commands/mesh-session.mjs)
// stays PURE over `{ stdinText, env }` — the ladder grows at the CALLER, never inside
// the pure resolver, so "the ladder gained a rung" never quietly means "the resolver
// gained a filesystem read".
//
// WHY THE RUNG EXISTS AT ALL. `CLAUDE_SESSION_ID` and `CLAUDE_PROJECT_DIR` are UNSET
// in a tool shell (measured at 96's refine), so of 48/ADR-001's three rungs only the
// explicit `--session` flag is reachable from a phase command. The id exists in
// exactly one place a phase can read: the record `aof session ping` writes on the very
// prompt that invoked it. That is why the mint sits at the TOP of a phase — a record
// is guaranteed fresh for SECONDS (DEFAULT_SESSION_TTL_SECONDS = 120, with the reaper
// unlinking at every write seam), not for the length of a phase.
//
// AMBIGUITY RESOLVES TO ABSENCE, NEVER TO A GUESS (ADR-001 §3). Two live sessions can
// share one workspace — measured, two `claude-code` sessions on one workspace id at
// once — so "the session for this workspace" is not a unique answer. An id is returned
// only when ONE live record is STRICTLY the newest by `lastPingAt`; a tie, an empty
// store, a store fault (which this module's own reader degrades to `[]` and reports)
// and an anonymous newest record all resolve `null`. An unattributable run costs one
// honest row in a snapshot; a guessed one silently moves another item's tokens, which
// is FF-6805's retired defect rebuilt in a different module.
//
// The liveness filter REUSES isSessionLive — the same shared predicate every other
// reader of this store uses — so no second staleness rule can disagree with any other.
export async function resolveSessionIdFromLiveStore(workspace, { nodeId, workspaceId, now, ttlSeconds, config } = {}) {
  // Neither half of the key is derivable here: an install with no resolved node id, or
  // no resolvable workspace id, cannot address a record, and answering anyway would be
  // the guess this rung exists to refuse.
  if (typeof nodeId !== "string" || nodeId.length === 0) return null;
  if (typeof workspaceId !== "string" || workspaceId.length === 0) return null;
  const records = await readSessionRecordsForNode(workspace, nodeId);
  const nowMs = typeof now === "function" ? Date.parse(now()) : Date.parse(now ?? new Date().toISOString());
  const resolvedTtl = typeof ttlSeconds === "number" ? ttlSeconds : resolveSessionTtlSeconds(config ?? workspace?.config);
  const ttlMs = resolvedTtl * 1000;
  let newestAt = null;
  let newestRecord = null;
  let tied = false;
  for (const record of records) {
    // The leaf prefix already excludes another node's records; the record's own
    // `nodeId` is checked too, so a hand-placed or mis-keyed file cannot answer for
    // this node. `workspaceId` is the second half of the key: a live session in
    // ANOTHER workspace on this machine is not this run's session.
    if (record?.nodeId !== nodeId) continue;
    if (record?.workspaceId !== workspaceId) continue;
    if (!isSessionLive(record, nowMs, ttlMs)) continue;
    const at = Date.parse(record.lastPingAt);
    if (!Number.isFinite(at)) continue; // an unparseable stamp cannot be ordered, so it cannot win
    if (newestAt == null || at > newestAt) {
      newestAt = at;
      newestRecord = record;
      tied = false;
    } else if (at === newestAt) {
      tied = true;
    }
  }
  if (newestRecord == null || tied) return null;
  const sessionId = newestRecord.sessionId;
  return typeof sessionId === "string" && sessionId.length > 0 ? sessionId : null;
}
