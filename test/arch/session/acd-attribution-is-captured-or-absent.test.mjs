// FF-9601 (96/ADR-001, 96/ADR-003) — ATTRIBUTION IS CAPTURED OR ABSENT, AND THERE IS
// EXACTLY ONE PATH FROM A TRANSCRIPT TO AN ITEM REF.
//
// The defect this control stands over is not hypothetical and not old. `agentMatchesMilestone`
// once pulled an unrelated milestone-38 agent into milestone 45's snapshot on a HEX SUBSTRING;
// FF-6805 retired it, correctly, and the join has been `sessionId` and nothing else since. What
// 96 changes is the supply side — a phase now mints a run record that carries the id — and the
// temptation an empty index creates is precisely to widen the join instead. So the absence is
// asserted BY SHAPE rather than promised in a comment, over the module set this milestone
// touches.
//
// FIVE CLAIMS, each failing for its own reason:
//
//   1. ONE JOIN. `sessionToItem.get(sessionId)` is the only transcript→item resolution in
//      `src/work/observe.mjs`, the retired matcher's vocabulary appears nowhere, and no module
//      96 touches matches an item ref against a session directory name or an agent's prose.
//   2. ONE READER OF THE STORE. The `~/.aof/mesh/sessions` partition is addressed from
//      `src/mesh/session.mjs` and from no other module in `src/` — the rung lives in the
//      store's own home, so "the ladder grew a rung" can never quietly mean "some other module
//      grew a filesystem read".
//   3. THE PURE RESOLVER STAYS PURE. `resolveSessionIdentity` still resolves over
//      `{ stdinText, env }` alone and touches no filesystem — the property ADR-001 §2 protects
//      by putting the new rung at the CALLER.
//   4. AMBIGUITY IS ABSENCE. Driven over real records: zero live records and two tied on
//      `lastPingAt` must each yield NO id; one strictly-newest must yield its own. A guessed id
//      silently moves another item's tokens, which is FF-6805's defect rebuilt in a different
//      module — so the tie is asserted, not reasoned about.
//   5. THE RECORD'S SHAPE IS UNCHANGED. The answering rung rides the command envelope and is
//      never written onto the run record, which would hand `work-observe` a second attribution
//      vocabulary to interpret.
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { srcFilesContaining } from "../../support/read-src-files.mjs";
import { stripComments, functionBody, matchedParenSpan } from "../../support/source-slice.mjs";
import { pingSession, resolveSessionIdFromLiveStore } from "../../../src/mesh/session.mjs";
import { runStartCommand } from "../../../src/commands/run-start.mjs";
import { resolveSessionIdentity } from "../../../src/commands/mesh/session.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// The module set milestone 96 / story 00 touches. The absence is asserted over these and not
// over `src/**` at large: a control that swept everything would be measuring other milestones'
// modules and would fail for their reasons, not this one's.
const MODULE_SET = ["src/work/observe.mjs", "src/mesh/session.mjs", "src/commands/run-start.mjs"];

// The retired path's own vocabulary. `agentMatchesMilestone` is FF-6805's subject by name; the
// rest are the shapes a widened join would have to wear — a ref matched against a directory
// name, a slug matched against prose.
const RETIRED_MATCHER_VOCABULARY = ["agentMatchesMilestone", "matchesMilestone", "milestoneRegex", "refRegex", "slugMatches"];

// The frozen run-record field set (19/ADR-001's shape, as `test/run/run-commands.test.mjs` pins it).
// A rung name reaching the record would show up here as a key nobody froze.
const RUN_RECORD_KEYS = new Set([
  "runId", "itemRef", "state", "attempt", "outcome", "sessionId", "brief", "createdAt", "updatedAt",
  "failureReason", "heartbeatAt", "retryOf", "reclaimedAt", "node", "resumeAfter", "spend",
]);

const source = async (rel) => stripComments(await readFile(path.join(repoRoot, rel), "utf8"));

// A synthetic workspace is enough for claim 4: the rung reads the store through `meshDir`,
// which honours an injected `globalMeshRoot`. The SOLE PRODUCERS write the records, so what
// the rung reads is what `aof session ping` actually writes — never a hand-placed file whose
// shape a test author chose.
async function withStore(body) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-ff9601-"));
  try {
    return await body({ globalMeshRoot: path.join(root, "mesh") });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const plant = (ws, { sessionId, nodeId = "node-a", workspaceId = "ws-1", now }) =>
  pingSession(ws, { nodeId, workspaceId, repo: "fixture", assistant: "claude-code", sessionId, now });

export const archTests = [
  {
    name: "arch/96/00 FF-9601 (1a) ONE JOIN — `sessionToItem.get(sessionId)` is the only transcript→item resolution in work-observe, and the retired matcher's vocabulary appears nowhere in the 96 module set",
    run: async () => {
      const observe = await source("src/work/observe.mjs");

      // The index is READ in exactly one place. A second `.get` on it would be a second
      // opportunity to answer with something other than the session's own item.
      const lookups = (observe.match(/sessionToItem\s*(\?\.)?\.get\(/g) ?? []).length;
      assert.equal(lookups, 1, `the session→item index is consulted exactly once (found ${lookups})`);

      // …and `attributedTo` is only ever the value that lookup produced.
      const attributions = observe.match(/attributedTo:[^,;}]+/g) ?? [];
      assert.ok(attributions.length > 0, "the projection still states an attribution at all");
      // Three legal values and no fourth: the join's own answer (`itemRef`), an explicit
      // `null`, and a pass-through of an already-attributed row's own field. Anything else is
      // a ref arriving from somewhere other than the join.
      const LEGAL = [/^itemRef$/, /^null$/, /^[A-Za-z_$][\w$]*\.attributedTo\s*\?\?\s*null$/];
      for (const hit of attributions) {
        const value = hit.slice(hit.indexOf(":") + 1).trim();
        assert.ok(
          LEGAL.some((pattern) => pattern.test(value)),
          `attributedTo is the join's own answer, an explicit null, or a pass-through — never a derived one (saw "${value}")`,
        );
      }

      for (const rel of MODULE_SET) {
        const text = await source(rel);
        for (const token of RETIRED_MATCHER_VOCABULARY) {
          assert.ok(!text.includes(token), `${rel} names the retired text matcher "${token}" — FF-6805's path, by shape`);
        }
      }
    },
  },
  {
    name: "arch/96/00 FF-9601 (1b) ONE JOIN — no module 96 touches matches an item ref against a session directory name or an agent's prose",
    run: async () => {
      for (const rel of MODULE_SET) {
        const text = await source(rel);
        // A widened join has to read one of these three fields and compare it against a ref.
        // The comparison, not the read, is the defect: `description`, `prompt` and the session
        // directory name are all legitimately READ (they are rendered), so the assertion is on
        // a test of one against an item ref.
        const suspicious = [
          /\b(description|prompt|promptText|agentText)\b[^\n]{0,60}\.(includes|indexOf|match|test)\(/,
          /\bitemRef\b[^\n]{0,40}\.(includes|indexOf)\(/,
          /\bref\b[^\n]{0,30}\.test\(\s*(sessionId|entry\.name|dirName)/,
          /(sessionId|entry\.name)[^\n]{0,40}\.(includes|startsWith|indexOf)\(\s*(ref|itemRef|msId|ssId)/,
        ];
        for (const pattern of suspicious) {
          const hit = pattern.exec(text);
          assert.equal(hit, null, `${rel} tests a ref against prose or a session directory name: ${hit?.[0]}`);
        }
      }
    },
  },
  {
    name: "arch/96/00 FF-9601 (2) ONE READER OF THE STORE — the `sessions` partition is addressed from src/mesh/session.mjs and from no other module in src/",
    run: async () => {
      // The partition is named exactly once, at its own path builder. Any other module that
      // wanted to read it would have to name the segment or import a builder for it — and no
      // builder is exported.
      const segment = await srcFilesContaining(repoRoot, '"sessions"', { except: ["mesh/session.mjs"] });
      assert.deepEqual(segment, [], `only src/mesh/session.mjs names the sessions partition (also: ${segment.join(", ")})`);

      const builders = await srcFilesContaining(repoRoot, "sessionRecordPath(", { except: ["mesh/session.mjs"] });
      assert.deepEqual(builders, [], `only src/mesh/session.mjs composes a session record path (also: ${builders.join(", ")})`);

      // The rung itself is exported from that module and from nowhere else.
      const rung = await srcFilesContaining(repoRoot, "export async function resolveSessionIdFromLiveStore");
      // ONE HOME, spelled as the floor plus a declared ceiling — never as a one-member census
      // (FF-11902): the module is named AMONG what the sweep found.
      assert.ok(rung.length >= 1, "the sweep of src/ found no module exporting the live-store rung");
      assert.ok(rung.length <= 1, `the live-store rung has one home (found in: ${rung.join(", ")})`);
      assert.equal(rung[0], "mesh/session.mjs", "…and it is the session module");
    },
  },
  {
    name: "arch/96/00 FF-9601 (3) THE PURE RESOLVER STAYS PURE — resolveSessionIdentity resolves over { stdinText, env } alone and reads no filesystem",
    run: async () => {
      const module = await source("src/commands/mesh/session.mjs");
      const header = "export function resolveSessionIdentity({ stdinText, env } = {})";
      assert.ok(module.includes(header), "resolveSessionIdentity still takes exactly { stdinText, env }");

      const body = functionBody(module, header);
      assert.ok(body != null && body.length > 0, "the resolver's body is readable");
      for (const forbidden of ["readFile", "readdir", "access(", "existsSync", "node:fs", "resolveSessionIdFromLiveStore", "readSessionRecord"]) {
        assert.ok(!body.includes(forbidden), `the pure resolver reaches "${forbidden}" — the rung belongs at the CALLER (ADR-001 §2)`);
      }

      // And it still behaves as a pure function of its two inputs.
      assert.deepEqual(resolveSessionIdentity({ stdinText: "", env: {} }), { source: null, sessionId: null, payload: null });
      assert.equal(resolveSessionIdentity({ stdinText: "", env: { CLAUDE_SESSION_ID: "s" } }).sessionId, "s");
      assert.equal(resolveSessionIdentity({ stdinText: JSON.stringify({ session_id: "p" }), env: {} }).sessionId, "p");
    },
  },
  {
    name: "arch/96/00 FF-9601 (4) AMBIGUITY IS ABSENCE — zero records and a tie each yield NO id, and only a strictly-newest record answers",
    run: async () => {
      await withStore(async (ws) => {
        const key = { nodeId: "node-a", workspaceId: "ws-1", now: "2026-09-04T10:01:00.000Z" };

        assert.equal(await resolveSessionIdFromLiveStore(ws, key), null, "an empty store resolves null — never a store-wide guess");

        await plant(ws, { sessionId: "s1", now: "2026-09-04T10:00:00.000Z" });
        await plant(ws, { sessionId: "s2", now: "2026-09-04T10:00:00.000Z" });
        assert.equal(await resolveSessionIdFromLiveStore(ws, key), null, "two records tied on lastPingAt resolve null, never a coin toss");

        await plant(ws, { sessionId: "s3", now: "2026-09-04T10:00:30.000Z" });
        assert.equal(await resolveSessionIdFromLiveStore(ws, key), "s3", "one strictly-newest record is the one answer there is");
      });
    },
  },
  {
    name: "arch/96/00 FF-9601 (5) THE FLAG WINS, AND THE RECORD'S FIELD SET DOES NOT GROW — the answering rung rides the envelope and is never persisted",
    run: async () => {
      // The flag heads the ladder, structurally: the store is consulted only under the
      // absent-flag branch, so no future edit can make the store answer over an explicit id
      // without deleting the guard.
      const runStart = await source("src/commands/run-start.mjs");
      const guard = /if\s*\(\s*sessionId\s*==\s*null\s*\)\s*\{[\s\S]{0,400}?resolveSessionIdFromLiveStore/;
      assert.match(runStart, guard, "the live-store rung is consulted only when the --session flag supplied nothing");

      // The rung's name never reaches the persisted record: it is spread onto the RESULT and
      // nowhere else, and the store module has never heard of it.
      const store = await source("src/run-store.mjs");
      assert.ok(!store.includes("sessionSource"), "src/run-store.mjs does not know the rung's name, so it cannot persist it");
      const edges = runStart.match(/sessionSource/g) ?? [];
      assert.ok(edges.length > 0, "the command does name the rung — on the envelope");
      const persistedEdge = /transitionRunStart\([\s\S]{0,400}?sessionSource/;
      assert.doesNotMatch(runStart, persistedEdge, "…but never inside the edge the store persists");

      // …and the frozen key set has not grown a rung field.
      const keys = [...RUN_RECORD_KEYS];
      assert.ok(keys.every((key) => !/source|rung/i.test(key)), "the frozen run-record shape carries no attribution-vocabulary field");
      assert.equal(runStartCommand.id, "work:run-start", "the subject of all of the above is the command this control names");
    },
  },
  {
    name: "arch/96/00 FF-9601 (1c) ONE JOIN — the unattributed BODY reports, and never attributes: every listed row is marked unattributed",
    run: async () => {
      // ADR-003 is a FACE change and the contract says so on both sides. The list added
      // beside the count must not become a second place an item ref can be inferred, so the
      // rows it emits are asserted to carry an explicit null rather than any derived ref.
      const observe = await source("src/work/observe.mjs");
      // The ROW ITSELF — the argument list the language draws around it — never a character
      // window or a sentinel end (F-47-04-ARCH-2: both have produced confident reds about a
      // tree that honours the rule). A moved or renamed push fails as NOT FOUND, loudly.
      const pushAt = observe.indexOf("unattributed.push");
      assert.ok(pushAt >= 0, "the unattributed body pushes a row, so there is one to assert over");
      const row = matchedParenSpan(observe, pushAt + "unattributed.push".length);
      assert.ok(row != null, "the pushed row's argument list is readable");
      assert.match(row.body, /attributedTo:\s*null/, "every listed unattributed row is marked unattributed, explicitly");
      assert.doesNotMatch(row.body, /itemRef|sessionToItem/, "…and nothing in that row is derived from an item ref");
    },
  },
];
