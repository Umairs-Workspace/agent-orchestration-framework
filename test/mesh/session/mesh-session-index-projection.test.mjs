// Traceability wiring for milestone 48 / story 03 / task 00 —
// `tasks/00_the-index-is-a-projection.feature`: the fleet-side session index is an
// O(1) answer to "what is live across the mesh", derived fresh every time and stored
// nowhere.
//
// THE SEAM UNDER TEST is the REAL `buildSessionIndex` exported by
// `src/global-mesh-query.mjs` — the same function `shapeGlobalStatus` calls — driven
// with literal inputs shaped EXACTLY as the shaper receives them (the feature's own
// Background): each node carrying the `freshness` the registry derived and the
// `presence` record read off disk.
//
// PRODUCER-FED WHERE IT MATTERS (m38/ADR-008): the headline scenario's session entries
// are not hand-typed — they come from the REAL `startSession` → REAL `readLiveSessions`
// projection over real records on disk, so the entry's six inherited keys are the ones
// the wire actually carries rather than a convenience fixture that could agree with a
// wrong implementation.
//
// ISOLATION: every lane that touches a store runs under a fresh `AOF_GLOBAL_HOME` temp
// dir. No scenario here binds a port at all (the two HTTP scenarios live in task 01's
// suite, and they bind `port: 0`).
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildSessionIndex, shapeGlobalStatus } from "../../../src/global-mesh-query.mjs";
import { readLiveSessions } from "../../../src/mesh/presence.mjs";
import { startSession } from "../../../src/mesh/session.mjs";
import { loadWorkspace } from "../../../src/work.mjs";
import { openGlobalWorkProjectionStore } from "../../../src/global-work-store.mjs";

// The ADR-007 entry, in its exact order: nodeId, then ADR-005's frozen six verbatim,
// then the one derived field.
// m50/ADR-008 decision 8 APPENDED a ninth key, `relaying`, AFTER `workItem` — the two
// inputs of the browser's feed-axis disjunction sitting together. Unconditional and
// read with a strict `=== true`, exactly as `workspaceHasRun` is; every key above it
// keeps its position, so this list still asserts an exact ordered entry.
const ENTRY_KEYS = ["nodeId", "sessionId", "workspaceId", "repo", "assistant", "lastPingAt", "workspaceHasRun", "workItem", "relaying"];

const NOW = "2026-08-10T12:00:00.000Z";

async function withTemp(prefix, fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// A session entry exactly as ADR-005's `readLiveSessions` projection emits it.
function session(sessionId, fields = {}) {
  return {
    sessionId,
    workspaceId: fields.workspaceId ?? "ws-1",
    repo: fields.repo ?? "demo",
    assistant: fields.assistant ?? "claude-code",
    lastPingAt: fields.lastPingAt ?? NOW,
    workspaceHasRun: fields.workspaceHasRun ?? false,
  };
}

// A registry node row exactly as `shapeGlobalStatus` receives it: the `freshness` the
// registry derived (`freshnessFor`) plus the `presence` record merged off disk.
function node(nodeId, sessions, freshness = "live") {
  return {
    nodeId,
    role: "worker",
    freshness,
    presence: {
      nodeId,
      heartbeatAt: NOW,
      activeRuns: [],
      sessions,
      aofVersion: "0.1.0",
    },
  };
}

// A recursive content snapshot of a directory: [relPath, size, sha256] sorted. Used to
// prove the projection creates, rewrites and removes nothing.
async function snapshotTree(root) {
  const rows = [];
  async function walk(dir, rel) {
    for (const name of (await readdir(dir)).sort()) {
      const full = path.join(dir, name);
      const relPath = rel ? `${rel}/${name}` : name;
      const info = await stat(full);
      if (info.isDirectory()) {
        await walk(full, relPath);
        continue;
      }
      const bytes = await readFile(full);
      rows.push([relPath, bytes.length, createHash("sha256").update(bytes).digest("hex")]);
    }
  }
  await walk(root, "");
  return rows;
}

// The SQLite side of "nothing was persisted": every table name plus its row count.
function snapshotTables(store) {
  const names = store.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map((row) => row.name);
  return names.map((name) => [name, store.db.prepare(`SELECT COUNT(*) AS n FROM "${name}"`).get().n]);
}

// A real repo + isolated global mesh home, for the lanes that need a real store.
async function makeWorkspace(tmp, { nodeId = "node-a" } = {}) {
  const root = path.join(tmp, "repo");
  const home = path.join(tmp, "home");
  await mkdir(path.join(root, "wiki", "work"), { recursive: true });
  await mkdir(path.join(root, ".aof"), { recursive: true });
  await writeFile(
    path.join(root, ".aof", "aof.config.json"),
    `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" }, mesh: { enabled: true, nodeId } }, null, 2)}\n`,
    "utf8",
  );
  const workspace = await loadWorkspace(root, undefined, { env: { AOF_GLOBAL_HOME: home } });
  return { workspace, root, home, env: { AOF_GLOBAL_HOME: home } };
}

export const meshSessionIndexProjectionTests = [
  // ═══ Scenario: a live session that has no assignment at all is addressable by its
  //     tuple — the milestone's premise stated as a test ═══════════════════════════
  {
    name: "session-index/00 a live session with NO assignment anywhere is addressable by its tuple, and its entry is the ordered eight, self-sufficient (producer-fed entry)",
    run: async () => withTemp("aof-session-index-headline-", async (tmp) => {
      const { workspace } = await makeWorkspace(tmp, { nodeId: "node-a" });
      // The session entries are produced by the REAL projection over a REAL record on
      // disk — not hand-typed — so the six keys this index inherits are the six the
      // wire actually carries.
      await startSession(workspace, { nodeId: "node-a", workspaceId: "ws-1", repo: "demo", assistant: "claude-code", sessionId: "sess-A", now: NOW });
      const produced = await readLiveSessions(workspace, "node-a", { now: NOW, config: {} });
      assert.equal(produced.length, 1, "the real producer emitted the session (non-vacuous)");

      const nodes = [node("node-a", produced)];
      const index = buildSessionIndex({ nodes, assignments: [], now: NOW });

      const found = index.lookup("node-a", "sess-A");
      assert.notEqual(found, null, "lookup(<that node>, \"sess-A\") returns that session");
      assert.equal(index.sessions.length, 1, "the array form contains exactly one entry for that tuple");
      assert.equal(index.sessions[0], found, "…and it is the SAME entry object the lookup answers — one shape, not two");

      assert.deepEqual(Object.keys(found), ENTRY_KEYS, `the entry's keys are exactly ${JSON.stringify(ENTRY_KEYS)} — in that order`);

      // SELF-SUFFICIENT: every value is readable off the entry alone. Serialised and
      // re-parsed with the node rows thrown away, nothing is lost — which is the
      // operational meaning of "no join back into nodes[].presence".
      const alone = JSON.parse(JSON.stringify(found));
      assert.deepEqual(Object.keys(alone), ENTRY_KEYS, "…and every key survives the wire (no `undefined` that would serialise away)");
      assert.equal(alone.workspaceId, "ws-1", "workspaceId is readable from the entry alone");
      assert.equal(alone.repo, "demo", "repo is readable from the entry alone");
      assert.equal(alone.assistant, "claude-code", "assistant is readable from the entry alone");
      assert.equal(alone.lastPingAt, produced[0].lastPingAt, "lastPingAt is readable from the entry alone, byte-identical to the published entry");
      assert.equal(alone.workspaceHasRun, false, "workspaceHasRun is readable from the entry alone");
      assert.equal(alone.workItem, null, "…and a session with no assignment anywhere says so with an explicit null");

      assert.equal(found.nodeId, "node-a", "nodeId is that node's id, byte-identical to its source");
      assert.equal(found.sessionId, "sess-A", "sessionId is exactly `sess-A`, byte-identical to its source");
      assert.equal(found.sessionId, produced[0].sessionId, "…the SAME bytes the producer published (no transformation anywhere on the path)");
    }),
  },

  // ═══ Scenario Outline: only a node the registry calls live contributes sessions;
  //     ambiguity fails closed ═══════════════════════════════════════════════════
  ...[
    { case: "a machine that is beating", freshness: "live", contributes: 2 },
    { case: "a machine gone quiet", freshness: "stale", contributes: 0 },
    { case: "a machine never seen", freshness: "unknown", contributes: 0 },
  ].map((row) => ({
    name: `session-index/00 the freshness gate — ${row.case} (freshness ${row.freshness}) contributes ${row.contributes === 0 ? "nothing" : "both sessions"}, and the node's own presence record is never edited`,
    run: async () => {
      const sessions = [session("sess-A"), session("sess-B", { workspaceId: "ws-2", repo: "beta" })];
      const nodes = [node("node-a", sessions, row.freshness)];
      const index = buildSessionIndex({ nodes, assignments: [], now: NOW });

      assert.equal(index.sessions.length, row.contributes, `the index contains ${row.contributes === 0 ? "nothing" : "both sessions"} from that node`);
      for (const id of ["sess-A", "sess-B"]) {
        const expected = row.contributes === 0 ? null : "an entry";
        const actual = index.lookup("node-a", id) === null ? null : "an entry";
        assert.equal(actual, expected, `lookup(node-a, ${id}) reflects the gate`);
      }
      // The gate withholds a session from the INDEX; it never edits the node's own
      // record. A machine that is not visible still reports what it last published.
      assert.equal(nodes[0].presence.sessions.length, 2, "that node's presence.sessions[] is still non-empty in the payload");
      assert.deepEqual(nodes[0].presence.sessions, sessions, "…and byte-unchanged — the index reads it, it never rewrites it");
    },
  })),

  // ═══ Scenario: the control node never re-judges a session's own liveness ═══════
  {
    name: "session-index/00 a session whose lastPingAt is far older than this control's own session TTL is STILL in the index — the publisher is the single filtering authority, and no `now` of ours changes the answer",
    run: async () => {
      // Six hours old — far beyond ANY plausible session TTL (the documented default
      // is 120 seconds). The publishing node already TTL-filtered before publishing;
      // the control relays that verdict verbatim.
      const ancient = session("sess-old", { lastPingAt: "2026-08-10T06:00:00.000Z" });
      const nodes = [node("node-a", [ancient])];

      const index = buildSessionIndex({ nodes, assignments: [], now: NOW });
      const entry = index.lookup("node-a", "sess-old");
      assert.notEqual(entry, null, "that session IS in the index — the control carries the publisher's filtering through verbatim");
      assert.equal(entry.lastPingAt, "2026-08-10T06:00:00.000Z", "…with its own lastPingAt carried through byte-for-byte, not re-stamped");

      // An hour later — a second TTL evaluation here (two machines, two configured
      // ttlSeconds) is exactly the second authority over liveness the SPEC forbids.
      const later = buildSessionIndex({ nodes, assignments: [], now: "2026-08-10T13:00:00.000Z" });
      assert.deepEqual(later.sessions, index.sessions, "building the index with a `now` an hour later yields the same entry — no clock of ours decides who is alive");
      assert.deepEqual(later.lookup("node-a", "sess-old"), entry, "…and the tuple still resolves to the same answer");

      // …and a `now` before the session even started changes nothing either: the
      // parameter is accepted and never read.
      const earlier = buildSessionIndex({ nodes, assignments: [], now: "2020-01-01T00:00:00.000Z" });
      assert.deepEqual(earlier.sessions, index.sessions, "…nor does a `now` in the distant past");
    },
  },

  // ═══ Scenario: an anonymous session is not in the index and is not lost either ══
  {
    name: "session-index/00 an anonymous session (sessionId null) is absent from the index — arithmetic, not a filter — and stays COMPLETE in nodes[].presence.sessions[]",
    run: async () => {
      const named = session("sess-A");
      const anonymous = session(null, { workspaceId: "ws-2", repo: "beta", assistant: "codex" });
      const nodes = [node("node-a", [named, anonymous])];

      const index = buildSessionIndex({ nodes, assignments: [], now: NOW });

      assert.equal(index.sessions.length, 1, "the index contains exactly one entry");
      assert.equal(index.sessions[0].sessionId, "sess-A", "…for `sess-A`");

      // THE OTHER HALF, in the SAME scenario so it can never read as a silent drop:
      // sessions[] is the complete liveness truth, the index is its ADDRESSABLE subset.
      assert.equal(nodes[0].presence.sessions.length, 2, "the node's presence.sessions[] still contains BOTH sessions");
      assert.deepEqual(nodes[0].presence.sessions, [named, anonymous], "…unchanged, in order, byte-for-byte");
      assert.equal(nodes[0].presence.sessions[1].sessionId, null, "…the anonymous one still says `sessionId: null` — live, simply not addressable");

      // Nothing anywhere marks it as dropped, filtered or degraded.
      const serialised = JSON.stringify(nodes[0].presence.sessions[1]);
      for (const smell of ["dropped", "filtered", "degraded", "excluded", "hidden", "indexed"]) {
        assert.equal(serialised.includes(smell), false, `nothing marks the anonymous session as ${smell}`);
      }
      assert.deepEqual(Object.keys(nodes[0].presence.sessions[1]), ["sessionId", "workspaceId", "repo", "assistant", "lastPingAt", "workspaceHasRun"], "…its own entry keeps exactly the frozen six it arrived with");
    },
  },

  // ═══ Scenario: the same inputs yield the same index, twice, with nothing created
  //     anywhere ═══════════════════════════════════════════════════════════════════
  {
    name: "session-index/00 the same { nodes, assignments } rebuild a deep-equal index twice, with no memoised identity, and the real store directory + database are byte-unchanged",
    run: async () => withTemp("aof-session-index-rebuild-", async (tmp) => {
      const { workspace, home, env } = await makeWorkspace(tmp, { nodeId: "node-a" });
      // A REAL store on disk, with real records in it, so "nothing was created,
      // rewritten or removed" is measured against a real directory rather than an
      // empty one.
      await startSession(workspace, { nodeId: "node-a", workspaceId: "ws-1", repo: "demo", assistant: "claude-code", sessionId: "sess-A", now: NOW });
      const store = await openGlobalWorkProjectionStore({ env });
      let tablesBefore;
      try {
        tablesBefore = snapshotTables(store);
      } finally {
        store.close();
      }
      const treeBefore = await snapshotTree(home);
      assert.ok(treeBefore.length > 0, "the store directory genuinely holds files (an empty snapshot would make this clause vacuous)");

      // Three nodes, five sessions between them.
      const nodes = [
        node("node-a", [session("s1"), session("s2", { workspaceId: "ws-2" })]),
        node("node-b", [session("s3", { repo: "beta" }), session("s4", { repo: "beta", workspaceId: "ws-3" })]),
        node("node-c", [session("s5", { repo: "gamma" })]),
      ];
      const assignments = [{ assignmentId: "asg-1", itemRef: "48/03", workspaceId: "ws-1", targetNodeId: "node-a", state: "running", sessionId: "s1" }];

      const first = buildSessionIndex({ nodes, assignments, now: NOW });
      const second = buildSessionIndex({ nodes, assignments, now: NOW });

      assert.equal(first.sessions.length, 5, "five sessions across three nodes (non-vacuous)");
      assert.deepEqual(second.sessions, first.sessions, "the two results are deep-equal");
      assert.notEqual(second.sessions, first.sessions, "the second call did not return the first call's array identity — there is no memoised cache handing back a stale answer");
      assert.notEqual(second.sessions[0], first.sessions[0], "…nor its entry objects");
      assert.deepEqual(second.lookup("node-a", "s1"), first.lookup("node-a", "s1"), "…and the lookup answers identically");

      const treeAfter = await snapshotTree(home);
      assert.deepEqual(treeAfter, treeBefore, "a fresh snapshot of the store directory is unchanged: no file created, rewritten or removed");

      const reopened = await openGlobalWorkProjectionStore({ env });
      try {
        assert.deepEqual(snapshotTables(reopened), tablesBefore, "no database table was created and no row was written");
        for (const [name] of snapshotTables(reopened)) {
          assert.equal(/session/i.test(name), false, `no table names a session index (found ${name})`);
        }
      } finally {
        reopened.close();
      }
    }),
  },

  // ═══ Scenario: the array is sorted by node then session, whatever order the inputs
  //     arrive in ══════════════════════════════════════════════════════════════════
  {
    name: "session-index/00 the array is sorted ascending by nodeId then sessionId in plain CODEPOINT order, and a differently-scrambled input yields a deep-equal array",
    run: async () => {
      // `node-B` before `node-a` and `sess-Z` before `sess-a` are the discriminator: a
      // locale-sensitive collation orders them the other way round.
      const scrambledA = [
        node("node-a", [session("sess-b"), session("sess-Z"), session("sess-a")]),
        node("node-B", [session("sess-a")]),
      ];
      const scrambledB = [
        node("node-B", [session("sess-a")]),
        node("node-a", [session("sess-Z"), session("sess-a"), session("sess-b")]),
      ];

      const index = buildSessionIndex({ nodes: scrambledA, assignments: [], now: NOW });
      const tuples = index.sessions.map((entry) => [entry.nodeId, entry.sessionId]);
      assert.deepEqual(
        tuples,
        [["node-B", "sess-a"], ["node-a", "sess-Z"], ["node-a", "sess-a"], ["node-a", "sess-b"]],
        "sorted ascending by nodeId, and within a node ascending by sessionId, by plain codepoint comparison",
      );
      // The discriminator, stated: a locale collation would have put node-a first.
      assert.notDeepEqual(
        tuples,
        [...tuples].sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1])),
        "…and NOT in locale-collated order — the two orders genuinely differ for this input, so the assertion above is a real discriminator",
      );

      const other = buildSessionIndex({ nodes: scrambledB, assignments: [], now: NOW });
      assert.deepEqual(other.sessions, index.sessions, "building it again from the same inputs in a DIFFERENT scrambled order yields a deep-equal array");
    },
  },

  // ═══ Scenario: a session MID-MOVE is one address — the duplicate tuple is RESOLVED
  //     by a stated total order, never by whichever leaf readdir returned first ══════
  //     (48/ADR-013 R12, the structural review's blocking finding)
  {
    name: "session-index/00 R12 two live records for ONE (nodeId, sessionId) — a session whose repo moved — yield exactly ONE index row, the LATER lastPingAt wins, and BOTH arrival orders build a deep-equal index (producer-fed)",
    run: async () => withTemp("aof-session-index-duplicate-", async (tmp) => {
      const { workspace } = await makeWorkspace(tmp, { nodeId: "node-a" });
      const EARLIER = "2026-08-10T11:59:00.000Z";
      const LATER = "2026-08-10T12:00:00.000Z";
      // ONE session id, TWO workspaces — produced by the REAL writer, because this is
      // ORDINARY use and not misuse: ADR-002 keys the record on
      // `(nodeId, workspaceId, assistant, sessionId)` and the hook derives `workspaceId`
      // from the payload's own cwd, so one session whose working directory moves from one
      // repo to another pings a SECOND leaf under the SAME id, and both records are live
      // for one TTL window.
      await startSession(workspace, { nodeId: "node-a", workspaceId: "ws-1", repo: "alpha", assistant: "claude-code", sessionId: "dup-1", now: EARLIER });
      await startSession(workspace, { nodeId: "node-a", workspaceId: "ws-2", repo: "beta", assistant: "claude-code", sessionId: "dup-1", now: LATER });

      const produced = await readLiveSessions(workspace, "node-a", { now: LATER, config: {} });
      assert.equal(produced.length, 2, "the wire carries BOTH records (non-vacuous: two leaves for one id really are live)");
      assert.deepEqual(produced.map((entry) => entry.sessionId), ["dup-1", "dup-1"], "…both under the same session id");

      const nodes = [node("node-a", produced)];
      const forward = buildSessionIndex({ nodes, assignments: [], now: LATER });
      const reversed = buildSessionIndex({ nodes: [node("node-a", [...produced].reverse())], assignments: [], now: LATER });

      assert.equal(forward.sessions.length, 1, "the index holds exactly ONE row for the tuple — an address that resolves to two things is not an address");
      const survivor = forward.lookup("node-a", "dup-1");
      assert.notEqual(survivor, null, "…and the tuple still resolves");
      assert.equal(survivor.workspaceId, "ws-2", "the survivor is the LATER-pinged record — where the session actually is now");
      assert.equal(survivor.repo, "beta", "…carrying that record's own repo, so the label is not the repo the session left");
      assert.equal(survivor.lastPingAt, LATER, "…and its own lastPingAt, byte-for-byte");

      // THE ORDER-INDEPENDENCE PROOF, which is the whole point: the survivor is the total
      // order's, never the filesystem's. `readdir` returns leaves in a different order on
      // NTFS than on ext4, and this must not change one byte of the answer.
      assert.deepEqual(reversed.sessions, forward.sessions, "feeding the SAME two entries in the OPPOSITE order builds a deep-equal index");
      assert.deepEqual(reversed.lookup("node-a", "dup-1"), forward.lookup("node-a", "dup-1"), "…and the lookup answers identically");

      // …and no clock of ours took part in the decision (ADR-007's no-clock clause).
      const distantPast = buildSessionIndex({ nodes, assignments: [], now: "2020-01-01T00:00:00.000Z" });
      const distantFuture = buildSessionIndex({ nodes, assignments: [], now: "2099-01-01T00:00:00.000Z" });
      assert.deepEqual(distantPast.sessions, forward.sessions, "a `now` in the distant past resolves the duplicate the same way");
      assert.deepEqual(distantFuture.sessions, forward.sessions, "…as does one in the distant future — the comparison is between the two entries, never against a clock");

      // THE WITHHELD CANDIDATE IS NOT LOST, and this clause is here so nobody can read
      // the resolution as a silent drop: `sessions[]` is the complete liveness truth, the
      // index is its ADDRESSABLE subset.
      assert.equal(nodes[0].presence.sessions.length, 2, "the node's presence.sessions[] still carries BOTH records");
      assert.deepEqual(nodes[0].presence.sessions, produced, "…byte-unchanged — the index reads it, it never rewrites it");
      assert.ok(nodes[0].presence.sessions.some((entry) => entry.workspaceId === "ws-1"), "…including the workspace the index withheld");
    }),
  },

  // ═══ Scenario Outline: the tie-break is a TOTAL order — latest lastPingAt (as a
  //     STRING), then ascending workspaceId, repo, assistant; an unstated ping sorts
  //     LAST ══════════════════════════════════════════════════════════════════════
  ...[
    {
      case: "the later ping wins, whatever the workspace ids say",
      first: session("dup", { workspaceId: "ws-a", repo: "alpha", lastPingAt: "2026-08-10T11:00:00.000Z" }),
      second: session("dup", { workspaceId: "ws-z", repo: "zulu", lastPingAt: "2026-08-10T12:00:00.000Z" }),
      winner: { workspaceId: "ws-z", lastPingAt: "2026-08-10T12:00:00.000Z" },
    },
    {
      case: "equal pings fall through to ascending workspaceId",
      first: session("dup", { workspaceId: "ws-z", repo: "zulu" }),
      second: session("dup", { workspaceId: "ws-a", repo: "alpha" }),
      winner: { workspaceId: "ws-a", lastPingAt: NOW },
    },
    {
      case: "a codepoint comparison, not a locale collation — `ws-Z` precedes `ws-a`",
      first: session("dup", { workspaceId: "ws-a", repo: "alpha" }),
      second: session("dup", { workspaceId: "ws-Z", repo: "zulu" }),
      winner: { workspaceId: "ws-Z", lastPingAt: NOW },
    },
    {
      case: "equal ping and workspace fall through to ascending repo",
      first: session("dup", { workspaceId: "ws-a", repo: "zulu" }),
      second: session("dup", { workspaceId: "ws-a", repo: "alpha" }),
      winner: { workspaceId: "ws-a", repo: "alpha" },
    },
    {
      case: "equal ping, workspace and repo fall through to ascending assistant",
      first: session("dup", { workspaceId: "ws-a", repo: "alpha", assistant: "codex" }),
      second: session("dup", { workspaceId: "ws-a", repo: "alpha", assistant: "claude-code" }),
      winner: { workspaceId: "ws-a", assistant: "claude-code" },
    },
    {
      case: "a NON-STRING lastPingAt states nothing and sorts LAST",
      first: { ...session("dup", { workspaceId: "ws-a", repo: "alpha" }), lastPingAt: 42 },
      second: session("dup", { workspaceId: "ws-z", repo: "zulu", lastPingAt: "2026-08-10T09:00:00.000Z" }),
      winner: { workspaceId: "ws-z", lastPingAt: "2026-08-10T09:00:00.000Z" },
    },
    {
      case: "an ABSENT lastPingAt sorts last too — one rule for the missing key and the malformed value",
      first: { ...session("dup", { workspaceId: "ws-a", repo: "alpha" }), lastPingAt: undefined },
      second: session("dup", { workspaceId: "ws-z", repo: "zulu", lastPingAt: "2026-08-10T09:00:00.000Z" }),
      winner: { workspaceId: "ws-z", lastPingAt: "2026-08-10T09:00:00.000Z" },
    },
    {
      case: "two unstated pings still resolve — the order falls through to workspaceId",
      first: { ...session("dup", { workspaceId: "ws-z", repo: "zulu" }), lastPingAt: null },
      second: { ...session("dup", { workspaceId: "ws-a", repo: "alpha" }), lastPingAt: undefined },
      winner: { workspaceId: "ws-a" },
    },
  ].map((row) => ({
    name: `session-index/00 R12 the duplicate tie-break is a TOTAL order — ${row.case} — and the two arrival orders agree`,
    run: async () => {
      const forward = buildSessionIndex({ nodes: [node("node-a", [row.first, row.second])], assignments: [], now: NOW });
      const backward = buildSessionIndex({ nodes: [node("node-a", [row.second, row.first])], assignments: [], now: NOW });

      assert.equal(forward.sessions.length, 1, "exactly one row for the tuple");
      for (const [field, value] of Object.entries(row.winner)) {
        assert.deepEqual(forward.sessions[0][field], value, `the survivor's ${field} is ${JSON.stringify(value)}`);
      }
      // TOTALITY, stated as the test the ADR asks for: same entries, both orders,
      // deep-equal index. A comparison that were merely partial would answer differently
      // depending on which candidate arrived first.
      assert.deepEqual(backward.sessions, forward.sessions, "the OPPOSITE arrival order yields a deep-equal index");
      assert.deepEqual(backward.lookup("node-a", "dup"), forward.lookup("node-a", "dup"), "…and the same lookup answer");
    },
  })),

  // ═══ Scenario Outline: a CORRUPT presence record is skipped, never thrown ═════════
  //     A `presence.sessions` that is not an array is not iterable, and a `for…of` over
  //     it threw `TypeError: object is not iterable` straight out of `shapeGlobalStatus`
  //     — the control node's ONLY status shaper, behind `/api/status`, the fleet page and
  //     `aof mesh status --json`. One bad file on disk must not blind the whole fleet.
  ...[
    { case: "an object (a hand-edited or half-written record)", sessions: { "0": { sessionId: "sess-x", workspaceId: "ws-1" } } },
    { case: "a string", sessions: "sess-x" },
    { case: "a number", sessions: 7 },
    { case: "a boolean", sessions: true },
    { case: "null", sessions: null },
    { case: "an array-LOOKING object", sessions: { length: 2 } },
  ].map((row) => ({
    name: `session-index/00 a presence record whose sessions is ${row.case} is SKIPPED — the index still answers, the healthy node still contributes, and nothing throws`,
    run: async () => {
      const corrupt = {
        nodeId: "node-corrupt",
        role: "worker",
        freshness: "live",
        presence: { nodeId: "node-corrupt", heartbeatAt: NOW, activeRuns: [], sessions: row.sessions, aofVersion: "0.1.0" },
      };
      const healthy = node("node-ok", [session("sess-ok")]);

      let index;
      assert.doesNotThrow(() => {
        index = buildSessionIndex({ nodes: [corrupt, healthy], assignments: [], now: NOW });
      }, "buildSessionIndex does not throw on a corrupt presence record");
      assert.equal(index.sessions.length, 1, "the corrupt node contributes nothing — ambiguity fails CLOSED");
      assert.equal(index.sessions[0].nodeId, "node-ok", "…and the HEALTHY node's session is still indexed (the fleet is not blinded)");
      assert.strictEqual(index.lookup("node-corrupt", "sess-x"), null, "the corrupt node addresses nothing");

      // THE REAL CRASH PATH, not just the helper: the shaper behind /api/status.
      let payload;
      assert.doesNotThrow(() => {
        payload = shapeGlobalStatus({
          paths: { databasePath: "/fixture/global.db" },
          workProjection: { workspaces: [], items: [], errors: [] },
          registry: { nodes: [corrupt, healthy], workspaces: [], errors: [] },
          assignments: [],
          now: NOW,
          cacheStalenessSeconds: 30,
        });
      }, "shapeGlobalStatus does not throw — the status payload is still produced");
      assert.equal(payload.sessions.length, 1, "…carrying the healthy node's session");
      assert.equal(payload.nodes.length, 2, "…and BOTH node rows, corrupt one included: the guard withholds sessions, it never hides a machine");
    },
  })),

  // A presence value that is not an object at all — the same skip, one level up.
  {
    name: "session-index/00 a node whose whole `presence` is missing or not an object contributes nothing and throws nothing",
    run: async () => {
      const rows = [undefined, null, "presence", 42, [], { sessions: undefined }];
      for (const presence of rows) {
        let index;
        assert.doesNotThrow(() => {
          index = buildSessionIndex({
            nodes: [{ nodeId: "node-a", role: "worker", freshness: "live", presence }, node("node-ok", [session("sess-ok")])],
            assignments: [],
            now: NOW,
          });
        }, `presence = ${JSON.stringify(presence) ?? "undefined"} does not throw`);
        assert.equal(index.sessions.length, 1, "only the healthy node contributes");
        assert.strictEqual(index.lookup("node-a", "sess-ok"), null, "…and never under the wrong node");
      }
    },
  },

  // ═══ Scenario Outline: a lookup that does not match answers, it does not throw ══
  //     ADR-010 R2 fixes the value: a miss is `null`, EXPLICITLY, never `undefined`.
  ...[
    { case: "right node, wrong session", args: ["node-a", "sess-ZZZ"] },
    { case: "wrong node, right session", args: ["node-other", "sess-A"] },
    { case: "a null session id", args: ["node-a", null] },
    { case: "an empty session id", args: ["node-a", ""] },
    { case: "both unknown", args: ["node-unknown", "sess-unknown"] },
  ].map((row) => ({
    name: `session-index/00 a lookup miss (${row.case}) returns exactly null and throws nothing — and the CORRECT pair still resolves`,
    run: async () => {
      const index = buildSessionIndex({ nodes: [node("node-a", [session("sess-A")])], assignments: [], now: NOW });

      let result;
      assert.doesNotThrow(() => {
        result = index.lookup(...row.args);
      }, "no error is thrown");
      // ADR-010 R2: strict identity on `null`, not merely falsy. `undefined` cannot
      // distinguish "no such session" from "no such lookup".
      assert.strictEqual(result, null, `lookup(${JSON.stringify(row.args)}) is exactly null`);
      assert.equal(result === undefined, false, "…and specifically NOT undefined");

      // A miss leaves the index usable.
      const hit = index.lookup("node-a", "sess-A");
      assert.notEqual(hit, null, "a lookup with the CORRECT pair still returns the session");
      assert.equal(hit.sessionId, "sess-A", "…the right one");
    },
  })),

  // The half-key proof, stated once as its own lane: nothing about the lookup is
  // satisfiable by one half of the tuple, and no argument shape throws.
  {
    name: "session-index/00 the lookup is never satisfiable by half a key, and no argument shape — missing, wrong-typed, object, number — makes it throw",
    run: async () => {
      const index = buildSessionIndex({
        nodes: [node("node-a", [session("sess-A")]), node("node-b", [session("sess-B")])],
        assignments: [],
        now: NOW,
      });
      assert.strictEqual(index.lookup("node-b", "sess-A"), null, "the session id alone does not satisfy the lookup");
      assert.strictEqual(index.lookup("node-a", "sess-B"), null, "…nor does the node id alone");
      assert.equal(index.lookup("node-a", "sess-A").nodeId, "node-a", "…while both correct pairs resolve");
      assert.equal(index.lookup("node-b", "sess-B").nodeId, "node-b", "…each to its OWN node's entry");

      for (const args of [[], ["node-a"], [null, null], [undefined, undefined], [42, 42], [{}, {}], [["node-a"], ["sess-A"]], ["node-a", 0], [true, true]]) {
        let value;
        assert.doesNotThrow(() => {
          value = index.lookup(...args);
        }, `lookup(${JSON.stringify(args)}) does not throw`);
        assert.strictEqual(value, null, `lookup(${JSON.stringify(args)}) is exactly null — a half-specified tuple is not addressable (ambiguity fails CLOSED)`);
      }
    },
  },

  // ═══ Scenario Outline: nothing to report reports nothing ═════════════════════════
  ...[
    { case: "an empty mesh", nodes: () => [] },
    { case: "live nodes, nobody working", nodes: () => [node("node-a", []), node("node-b", [])] },
    { case: "a node that has never beaten", nodes: () => [{ nodeId: "node-a", role: "worker", freshness: "unknown" }] },
    {
      case: "every node stale",
      nodes: () => [
        node("node-a", [session("s1")], "stale"),
        node("node-b", [session("s2")], "stale"),
        node("node-c", [session("s3")], "stale"),
      ],
    },
  ].map((row) => ({
    name: `session-index/00 nothing to report reports nothing — ${row.case}: an empty array, every lookup falsy, and no error thrown`,
    run: async () => {
      const nodes = row.nodes();
      let index;
      assert.doesNotThrow(() => {
        index = buildSessionIndex({ nodes, assignments: [], now: NOW });
      }, "no error is thrown");
      assert.deepEqual(index.sessions, [], "the array form is empty");
      for (const nodeId of ["node-a", "node-b", "node-c", "node-unknown"]) {
        for (const sessionId of ["s1", "s2", "s3", "sess-A"]) {
          assert.strictEqual(index.lookup(nodeId, sessionId), null, `lookup(${nodeId}, ${sessionId}) is falsy — exactly null`);
        }
      }
    },
  })),

  // An honest empty answer for the degenerate inputs the shaper itself can hand over:
  // an absent `assignments`, an absent `nodes`, and no argument at all.
  {
    name: "session-index/00 an absent nodes/assignments input — and no argument at all — is an empty index, never a throw",
    run: async () => {
      for (const args of [[], [{}], [{ nodes: undefined, assignments: undefined }], [{ nodes: [node("node-a", [session("sess-A")])] }]]) {
        let index;
        assert.doesNotThrow(() => {
          index = buildSessionIndex(...args);
        }, `buildSessionIndex(${JSON.stringify(args)}) does not throw`);
        assert.ok(Array.isArray(index.sessions), "…and still answers an array form");
        assert.strictEqual(index.lookup("nope", "nope"), null, "…and a lookup on it is exactly null");
      }
      // The last shape above carries nodes but no assignments at all — the free
      // session still lands, with an explicit null work item.
      const index = buildSessionIndex({ nodes: [node("node-a", [session("sess-A")])] });
      assert.equal(index.sessions.length, 1, "a node input with NO assignments key still indexes its sessions");
      assert.strictEqual(index.sessions[0].workItem, null, "…with workItem explicitly null");
    },
  },
];
