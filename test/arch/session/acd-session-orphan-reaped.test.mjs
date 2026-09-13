// Fitness function: acd-session-orphan-reaped (milestone 48 / ADR-006 + ADR-010 R5,
// fitness #3) — "a TTL-expired session record is REMOVED, by the owning node, at the
// write seam, under the shared liveness predicate."
//
// THE GAP THIS CLOSES, measured at RESEARCH §4: NOTHING removed a session record.
// `isSessionLive` is a pure read-time filter; `readLiveSessions` returns survivors
// without deleting; `endSession` was the codebase's only unlink and had exactly one
// call site (the `aof session end` verb); `mesh-store.mjs`, which sweeps other
// partitions, has no reference to `sessions` at all. So a crashed, force-killed or
// powered-off session left a file behind forever. RESEARCH §1 turns that from hygiene
// into structure: Codex has NO `SessionEnd` event at all, so for Codex the TTL is the
// only end-of-life signal by construction — and 48/ADR-002's per-session key makes the
// leak one file per dead SESSION rather than per (node, workspace, assistant) triple.
//
// THE DECISION PINNED HERE (ADR-006): `end` is an OPTIMISATION, never the mechanism.
// `reapExpiredSessions` lives in the module that already owns the records and the only
// unlink, runs at the WRITE seam (so reads stay pure), sweeps only the OWNING node's
// leaves, reuses the SHARED predicate (never a second staleness rule), and is
// failure-isolated: a session write must never fail because a stale neighbour could
// not be deleted.
//
// Proofs:
//  1. STRUCTURAL — the reap path calls the shared `isSessionLive` and contains NO
//     second staleness comparison; the module evaluates `isStale` in exactly ONE place
//     (inside `isSessionLive` itself).
//  2. STRUCTURAL — the sweep is node-scoped: it filters leaves by this node's own
//     `${safeSegment(nodeId)}~` prefix.
//  3. STRUCTURAL — `startSession` AND `pingSession` invoke it (the write seam).
//  4. STRUCTURAL (ADR-010 R5) — the `unlink` seam DEFAULTS to the module's real
//     `unlink`, and NO `src/` call site supplies `options.unlink` IN EITHER SPELLING —
//     neither `{ unlink: fn }` nor the object SHORTHAND `{ unlink }`, which is the one a
//     production caller would actually write: a test seam may never become a production
//     door. `endSession` does not take the seam at all.
//  5. BEHAVIOURAL (real producers, hermetic store) — an expired leaf is gone after ONE
//     real `pingSession` while an in-TTL leaf survives BYTE-IDENTICAL; a pre-m48
//     THREE-part leaf is reaped by the same sweep (ADR-002's whole migration); a peer
//     node's expired leaf is untouched; an injected failing unlink neither fails the
//     write nor is swallowed silently (it is reported through the coded-degrade seam);
//     and reaping twice is a no-op.
//  Self-check (m03 non-vacuous): a planted hand-rolled staleness comparison (planted
//  into the REAL source text and asserted to have LANDED — the tree is CRLF), a
//  planted reap that sweeps a PEER's leaves, and a planted reap whose throw propagates
//  out of the write, each trip the SAME assertions the real code passes.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { readdirSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  pingSession,
  startSession,
  reapExpiredSessions,
  sessionRecordPath,
  isSessionLive,
  DEFAULT_SESSION_TTL_SECONDS,
} from "../../../src/mesh/session.mjs";
import { readLiveSessions } from "../../../src/mesh/presence.mjs";
import { setDegradeSinkForTest } from "../../../src/degrade.mjs";
import { loadWorkspace } from "../../../src/work.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const srcRoot = path.join(repoRoot, "src");
const sessionSourcePath = path.join(srcRoot, "mesh/session.mjs");
const commandSourcePath = path.join(srcRoot, "commands", "mesh", "session.mjs");

const NODE_ID = "node-a";
const PEER_NODE_ID = "node-b";
const NOW = "2026-08-10T12:00:00.000Z";
const NOW_MS = Date.parse(NOW);
const TTL_MS = DEFAULT_SESSION_TTL_SECONDS * 1000;

function normalise(source) {
  return source.replace(/\r\n/g, "\n");
}

// ORDER MATTERS (TECH_DEBT item 24): LINE comments are stripped FIRST. Blocks-first lets
// a `/*` inside a line comment (`templates/work/<type>/*.md`) open a PHANTOM block that
// swallows everything to the next `*/` — measured at 33,549 characters across five src/
// modules, work.mjs's `loadWorkspace` among them. `acd-session-ttl-reuses-isstale` has
// had the correct order all along. The `(^|[^:])` guard stays: a `://` is not a comment.
function stripComments(source) {
  return source.replace(/(^|[^:])\/\/[^\n]*/g, "$1").replace(/\/\*[\s\S]*?\*\//g, "");
}

function plant(source, needle, replacement) {
  const code = normalise(source);
  assert.ok(code.includes(needle), `the plant's needle must exist in the real source (CRLF-normalised): ${needle}`);
  const planted = code.replace(needle, replacement);
  assert.notEqual(planted, code, "the plant LANDED in the source text");
  return planted;
}

// NON-VACUITY OF THE STRIP ITSELF (TECH_DEBT item 24, fix (b)). Proof 4 sweeps ALL of
// `src/` for an ABSENCE, and an absence-sweep is silently GREEN if the stripper deleted
// the source it was meant to read — item 24's named "silent false GREEN" shape. The
// anchor is each module's OWN exported symbol names: a name a module `export`s at line
// start is code by construction, so if it does not survive `stripComments` then the
// corpus this rule ruled on was not the corpus. Measured under the OLD block-first
// order: 18 exported symbols across three modules disappeared. Under the shipped order:
// zero. The stripper is a PARAMETER so the self-check can run both through this path.
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

// ADR-010 R5's production-door rule, in BOTH SPELLINGS. `{ unlink: fn }` is the obvious
// one and the only one the shipped scan saw. The object SHORTHAND `{ unlink }` is the
// one that would actually happen — `pingSession(ws, key, { unlink })` reads like tidy
// code, opens the identical door, and `\bunlink\s*:` does not see it at all.
//
// An IMPORT/EXPORT clause is spelled identically (`import { readdir, unlink } from
// "node:fs/promises"`, which src/mesh/session.mjs, src/run-store.mjs and src/fs.mjs all
// carry) and is NOT a supply: that import is precisely what ADR-010 R5's DEFAULT is
// built ON. Module clauses are therefore removed before the scan rather than
// special-cased inside it, so the rule stays "no object property named `unlink`".
function suppliedUnlinkSites(code) {
  const body = code
    .replace(/\bimport\s*\{[^}]*\}\s*from\s*["'][^"']+["']/g, "")
    .replace(/\bexport\s*\{[^}]*\}(?:\s*from\s*["'][^"']+["'])?/g, "");
  return [
    ...[...body.matchAll(/\bunlink\s*:/g)].map(() => "an explicit `unlink:` property"),
    ...[...body.matchAll(/[{,]\s*unlink\s*(?=[,}])/g)].map(() => "the object SHORTHAND `{ unlink }`"),
  ];
}

// The reap path, read off the source: everything from `reapExpiredSessions`'s
// declaration to its closing brace, plus the window helper it delegates its clock to.
function reapPath(code) {
  const source = stripComments(normalise(code));
  const start = source.indexOf("export async function reapExpiredSessions(");
  if (start < 0) return null;
  const body = source.slice(start, source.indexOf("\n}", start));
  const windowStart = source.indexOf("function resolveReapWindow(");
  const windowBody = windowStart < 0 ? "" : source.slice(windowStart, source.indexOf("\n}", windowStart));
  return { body, windowBody, source };
}

function reapStructuralViolations(code) {
  const problems = [];
  const reap = reapPath(code);
  if (reap == null) return ["reapExpiredSessions is not declared in the session module (ADR-006's named removal verb)"];

  if (!/isSessionLive\s*\(/.test(reap.body)) problems.push("the reap path does not call the SHARED isSessionLive predicate");
  // A second staleness rule: any comparison applied to a parsed date inside the reap
  // path. The predicate is IMPORTED, never re-expressed (acd-session-ttl-reuses-isstale).
  for (const [label, body] of [["reap", reap.body], ["reap-window", reap.windowBody]]) {
    if (/Date\.parse\s*\([^)]*\)[^;\n]*[<>]=?/.test(body)) problems.push(`a hand-rolled staleness comparison exists in the ${label} path`);
    if (/lastPingAt[^;\n]*[<>]=?/.test(body)) problems.push(`the ${label} path compares lastPingAt itself — the predicate must decide`);
  }
  // Exactly ONE evaluation of the shared isStale in the whole module: the one inside
  // isSessionLive. A second call site would be a second staleness decision.
  const isStaleCalls = (stripComments(normalise(code)).match(/\bisStale\s*\(/g) ?? []).length;
  if (isStaleCalls !== 1) problems.push(`the module evaluates isStale ${isStaleCalls} times — exactly ONE (inside isSessionLive) is the single-predicate rule`);

  // Node ownership: the sweep is scoped to THIS node's own leaf prefix.
  if (!/safeSegment\(nodeId\)\}~/.test(reap.body)) problems.push("the reap does not scope its sweep to this node's own `<nodeId>~` leaf prefix");
  if (!/startsWith\(prefix\)/.test(reap.body)) problems.push("the reap does not filter directory entries by that prefix");

  // The write seam invokes it.
  for (const verb of ["startSession", "pingSession"]) {
    const start = reap.source.indexOf(`export async function ${verb}(`);
    const body = start < 0 ? "" : reap.source.slice(start, reap.source.indexOf("\n}", start));
    if (!/reapExpiredSessions\s*\(/.test(body)) problems.push(`${verb} does not invoke reapExpiredSessions — ADR-006 puts the sweep at the WRITE seam`);
  }

  // ADR-010 R5: the injected deleter defaults to the module's real unlink.
  if (!/options\.unlink\s*\?\?\s*unlink/.test(reap.body)) problems.push("the reap's deleter does not default to the module's real unlink (ADR-010 R5)");
  const endStart = reap.source.indexOf("export async function endSession(");
  const endBody = endStart < 0 ? "" : reap.source.slice(endStart, reap.source.indexOf("\n}", endStart));
  if (/options\.unlink/.test(endBody)) problems.push("endSession took the reaper's unlink seam — it is not the reaper (ADR-010 R5)");
  return problems;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const entry = path.join(dir, name);
    if (statSync(entry).isDirectory()) walk(entry, out);
    else if (name.endsWith(".mjs")) out.push(entry);
  }
  return out;
}

async function makeFixture() {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-acd-session-orphan-reaped-"));
  const root = path.join(tmp, "repo");
  const home = path.join(tmp, "home");
  await mkdir(path.join(root, "wiki", "work"), { recursive: true });
  await mkdir(path.join(root, ".aof"), { recursive: true });
  const config = { name: "fixture", work: { dir: "./wiki/work" }, mesh: { nodeId: NODE_ID } };
  await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
  const env = { AOF_GLOBAL_HOME: home };
  const sessionsDir = path.join(home, "mesh", "sessions");
  await mkdir(sessionsDir, { recursive: true });
  return { tmp, root, home, env, sessionsDir, ws: await loadWorkspace(root, undefined, { env }) };
}

// Plant a record file DIRECTLY (never through the producer) — the point of these
// scenarios is a leaf that is already on disk when the write seam runs.
async function plantRecord(fixture, { leaf, nodeId = NODE_ID, workspaceId = "ws-x", assistant = "claude-code", sessionId = null, ageMs }) {
  const lastPingAt = new Date(NOW_MS - ageMs).toISOString();
  const record = { nodeId, workspaceId, repo: "demo", assistant, sessionId, startedAt: lastPingAt, lastPingAt };
  const file = path.join(fixture.sessionsDir, leaf);
  await writeFile(file, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return { file, record };
}

async function exists(file) {
  try {
    await readFile(file, "utf8");
    return true;
  } catch {
    return false;
  }
}

export const archTests = [
  {
    name: "arch/48 ADR-006+010 (acd-session-orphan-reaped): STRUCTURAL — the reap reuses the shared predicate, hand-rolls no staleness, sweeps only this node, runs at the write seam, and defaults its unlink seam",
    run: async () => {
      const problems = reapStructuralViolations(await readFile(sessionSourcePath, "utf8"));
      assert.deepEqual(problems, [], `reap structural problems:\n  ${problems.join("\n  ")}`);
    },
  },
  {
    name: "arch/48 ADR-010 R5 (acd-session-orphan-reaped): STRUCTURAL — NO src/ call site supplies options.unlink in EITHER spelling (`{ unlink: fn }` or the shorthand `{ unlink }`); a test seam never becomes a production door",
    run: async () => {
      const corpus = [];
      for (const file of walk(srcRoot)) {
        corpus.push([path.relative(repoRoot, file).split(path.sep).join("/"), normalise(await readFile(file, "utf8"))]);
      }
      assert.ok(corpus.length > 50, `the scan really walked src/ (found ${corpus.length} modules)`);

      // …and the sweep really READ what it walked (TECH_DEBT item 24): an absence-rule
      // over source the stripper deleted is a false GREEN, so the blinding is asserted
      // BEFORE the absence is ruled on.
      const blinded = strippedCorpusViolations(corpus);
      assert.deepEqual(blinded, [], `the comment stripper BLINDED this sweep — it ruled on an absence inside source it had itself deleted:\n  ${blinded.join("\n  ")}`);

      const offenders = [];
      for (const [rel, source] of corpus) {
        for (const site of suppliedUnlinkSites(stripComments(source))) offenders.push(`${rel}: ${site}`);
      }
      assert.deepEqual(offenders, [], `a src/ caller supplies the reaper's injected deleter:\n  ${offenders.join("\n  ")}`);
    },
  },

  {
    name: "arch/48 ADR-010 R5 (acd-session-orphan-reaped): self-check — BOTH production-door spellings, planted into the REAL caller, trip the SAME sweep; the module's own `import { … unlink }` and the `options.unlink ?? unlink` DEFAULT do not (non-vacuous)",
    run: async () => {
      // The real files, through the sweep's own code path — not hand-typed strings, so
      // these plants prove the WALK reads the tree rather than that a regex fires.
      const realCaller = normalise(await readFile(commandSourcePath, "utf8"));
      const realSession = normalise(await readFile(sessionSourcePath, "utf8"));
      assert.deepEqual(suppliedUnlinkSites(stripComments(realCaller)), [], "the real CLI caller supplies no seam");
      assert.deepEqual(
        suppliedUnlinkSites(stripComments(realSession)),
        [],
        "…and neither does the session module: its `import { mkdir, readFile, readdir, unlink }` is what ADR-010 R5's DEFAULT is built ON, and `options.unlink ?? unlink` reads the seam rather than supplying one",
      );
      // The two shapes that must NOT be read as supplies are genuinely PRESENT in that
      // module (an exclusion nobody exercises is an exclusion nobody has tested).
      assert.match(realSession, /import \{[^}]*\bunlink\b[^}]*\} from "node:fs\/promises"/, "the import-clause spelling really occurs in the real source");
      assert.match(realSession, /const unlinkFile = options\.unlink \?\? unlink;/, "…and so does the default-not-supply spelling");

      const needle = "const record = await pingSession(ws, { nodeId, workspaceId, repo, assistant, sessionId, now });";

      // (a) the EXPLICIT spelling — the one the shipped scan already caught.
      const explicit = plant(realCaller, needle, "const record = await pingSession(ws, { nodeId, workspaceId, repo, assistant, sessionId, now }, { unlink: async () => {} });");
      const explicitSites = suppliedUnlinkSites(stripComments(explicit));
      assert.ok(explicitSites.length >= 1, `a planted \`{ unlink: fn }\` at the real call site is FLAGGED (got ${JSON.stringify(explicitSites)})`);
      assert.ok(explicitSites.some((site) => site.includes("explicit")), "…named as the explicit property");

      // (b) the SHORTHAND — the spelling the shipped scan MISSED, and the one a
      //     production caller would actually write.
      const shorthand = plant(realCaller, needle, "const record = await pingSession(ws, { nodeId, workspaceId, repo, assistant, sessionId, now }, { unlink });");
      const shorthandSites = suppliedUnlinkSites(stripComments(shorthand));
      assert.ok(shorthandSites.length >= 1, `a planted \`{ unlink }\` shorthand at the real call site is FLAGGED (got ${JSON.stringify(shorthandSites)})`);
      assert.ok(shorthandSites.some((site) => site.includes("SHORTHAND")), "…named as the shorthand");
      assert.equal(/\bunlink\s*:/.test(stripComments(shorthand)), false, "…and the SHIPPED `\\bunlink\\s*:` scan does not see it at all — which is why the rule was one tidy refactor from being a production door with CI green");

      // (c) the shorthand mixed into a larger bag, and after another key.
      for (const bag of ["{ unlink, now }", "{ now, unlink }", "{ ...seams, unlink }"]) {
        const mixed = plant(realCaller, needle, `const record = await pingSession(ws, { nodeId, workspaceId, repo, assistant, sessionId, now }, ${bag});`);
        assert.ok(suppliedUnlinkSites(stripComments(mixed)).length >= 1, `\`${bag}\` is FLAGGED too — the door is the property, not its position`);
      }
    },
  },
  {
    name: "arch/48 ADR-006 (acd-session-orphan-reaped): BEHAVIOURAL — one real pingSession removes the expired leaf, leaves the in-TTL leaf byte-identical, and still writes its own record",
    run: async () => {
      const fixture = await makeFixture();
      try {
        const expired = await plantRecord(fixture, { leaf: `${NODE_ID}~ws-dead~claude-code~sess-dead.json`, workspaceId: "ws-dead", sessionId: "sess-dead", ageMs: TTL_MS + 1 });
        const alive = await plantRecord(fixture, { leaf: `${NODE_ID}~ws-alive~claude-code~sess-alive.json`, workspaceId: "ws-alive", sessionId: "sess-alive", ageMs: TTL_MS / 2 });
        const aliveBytes = await readFile(alive.file, "utf8");

        await pingSession(fixture.ws, { nodeId: NODE_ID, workspaceId: "ws-1", repo: "demo", assistant: "claude-code", sessionId: "sess-mine", now: NOW });

        assert.equal(await exists(expired.file), false, "the expired record's file is GONE from disk");
        assert.equal(await readFile(alive.file, "utf8"), aliveBytes, "the in-TTL record is still there, byte-identical");
        const mine = JSON.parse(await readFile(sessionRecordPath(fixture.ws, { nodeId: NODE_ID, workspaceId: "ws-1", assistant: "claude-code", sessionId: "sess-mine" }), "utf8"));
        assert.equal(mine.lastPingAt, NOW, "the ping's OWN record was written normally — the sweep is a side-effect of the write, never a replacement for it");
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/48 ADR-002+006 (acd-session-orphan-reaped): BEHAVIOURAL — a pre-m48 THREE-part leaf is reaped by the same sweep (this IS the migration), while an in-TTL 3-part leaf survives untouched",
    run: async () => {
      const fixture = await makeFixture();
      try {
        const legacyDead = await plantRecord(fixture, { leaf: `${NODE_ID}~ws-old~claude-code.json`, workspaceId: "ws-old", ageMs: TTL_MS + 1 });
        const legacyLive = await plantRecord(fixture, { leaf: `${NODE_ID}~ws-recent~claude-code.json`, workspaceId: "ws-recent", ageMs: TTL_MS / 2 });
        const legacyLiveBytes = await readFile(legacyLive.file, "utf8");

        await pingSession(fixture.ws, { nodeId: NODE_ID, workspaceId: "ws-1", repo: "demo", assistant: "claude-code", sessionId: "sess-mine", now: NOW });

        assert.equal(await exists(legacyDead.file), false, "the pre-m48 3-part leaf is gone — no migration code, the reaper IS the migration");
        assert.equal(await readFile(legacyLive.file, "utf8"), legacyLiveBytes, "an in-TTL 3-part leaf survives untouched — a deploy must not blind a node to sessions live across it");

        const live = await readLiveSessions(fixture.ws, NODE_ID, { now: NOW });
        const survivingWorkspaces = live.map((entry) => entry.workspaceId).sort();
        assert.deepEqual(survivingWorkspaces, ["ws-1", "ws-recent"], "the surviving pre-m48 record still reads as a live session");
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/48 ADR-006 (acd-session-orphan-reaped): BEHAVIOURAL — the sweep touches only THIS node's records; a peer's expired leaf is byte-identical afterwards",
    run: async () => {
      const fixture = await makeFixture();
      try {
        const mine = await plantRecord(fixture, { leaf: `${NODE_ID}~ws-dead~claude-code~sess-dead.json`, workspaceId: "ws-dead", sessionId: "sess-dead", ageMs: TTL_MS * 10 });
        const peer = await plantRecord(fixture, { leaf: `${PEER_NODE_ID}~ws-dead~claude-code~sess-peer.json`, nodeId: PEER_NODE_ID, workspaceId: "ws-dead", sessionId: "sess-peer", ageMs: TTL_MS * 10 });
        const peerBytes = await readFile(peer.file, "utf8");

        await pingSession(fixture.ws, { nodeId: NODE_ID, workspaceId: "ws-1", repo: "demo", assistant: "claude-code", sessionId: "sess-mine", now: NOW });

        assert.equal(await exists(mine.file), false, "this node's expired record is gone");
        assert.equal(await readFile(peer.file, "utf8"), peerBytes, "the other node's expired record is untouched, however stale it looks from here");
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/48 ADR-006+010 R5 (acd-session-orphan-reaped): BEHAVIOURAL — a reap that CANNOT delete never fails the write, is reported through the coded-degrade channel, and is idempotently removed on the next reap",
    run: async () => {
      const fixture = await makeFixture();
      const events = [];
      setDegradeSinkForTest(() => ({ write: (event) => events.push(event) }));
      try {
        const expired = await plantRecord(fixture, { leaf: `${NODE_ID}~ws-dead~claude-code~sess-dead.json`, workspaceId: "ws-dead", sessionId: "sess-dead", ageMs: TTL_MS + 1 });

        const record = await pingSession(
          fixture.ws,
          { nodeId: NODE_ID, workspaceId: "ws-1", repo: "demo", assistant: "claude-code", sessionId: "sess-mine", now: NOW },
          { unlink: async () => { throw Object.assign(new Error("locked"), { code: "EPERM" }); } },
        );

        assert.equal(record.lastPingAt, NOW, "pingSession RESOLVED — a stale neighbour that cannot be deleted never fails the session write");
        assert.ok(await exists(sessionRecordPath(fixture.ws, { nodeId: NODE_ID, workspaceId: "ws-1", assistant: "claude-code", sessionId: "sess-mine" })), "the ping's own record was written correctly");
        assert.equal(await exists(expired.file), true, "the expired leaf is STILL on disk — the reap genuinely tried and genuinely failed (this is what makes the scenario non-vacuous)");
        assert.deepEqual(events.map((event) => event.code), ["mesh-session-reap"], "the failure was reported through the coded-degrade channel, never swallowed silently or thrown");

        // Idempotent, and the fault was the SEAM's, not the reaper's: a second write
        // with no seam supplied removes it.
        await pingSession(fixture.ws, { nodeId: NODE_ID, workspaceId: "ws-1", repo: "demo", assistant: "claude-code", sessionId: "sess-mine", now: NOW });
        assert.equal(await exists(expired.file), false, "the next real ping removes it");
        assert.equal(await reapExpiredSessions(fixture.ws, NODE_ID, { now: NOW }), 0, "reaping twice removes nothing further");
      } finally {
        setDegradeSinkForTest(undefined);
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/48 ADR-006 (acd-session-orphan-reaped): self-check — a hand-rolled staleness, a peer-sweeping reap, and a reap whose throw propagates each trip the SAME assertions the real reaper passes",
    run: async () => {
      const realSource = await readFile(sessionSourcePath, "utf8");
      assert.deepEqual(reapStructuralViolations(realSource), [], "the real reap path is clean");

      const plantedStaleness = plant(
        realSource,
        "        if (isSessionLive(record, nowMs, ttlMs)) continue;",
        "        if (Date.parse(record.lastPingAt) > nowMs - ttlMs) continue;",
      );
      const stalenessProblems = reapStructuralViolations(plantedStaleness);
      assert.ok(stalenessProblems.length > 0, `a planted hand-rolled staleness comparison trips the detector (got ${JSON.stringify(stalenessProblems)})`);

      const plantedPeerSweep = plant(realSource, "    const prefix = `${safeSegment(nodeId)}~`;", "    const prefix = \"\";");
      assert.ok(reapStructuralViolations(plantedPeerSweep).length > 0, "a planted peer-sweeping reap trips the ownership detector");

      const plantedNoSeam = plant(realSource, "  const unlinkFile = options.unlink ?? unlink;", "  const unlinkFile = unlink;");
      assert.ok(reapStructuralViolations(plantedNoSeam).length > 0, "a reap with no injectable deleter trips the ADR-010 R5 detector");

      // The propagating-throw plant, run for real against the fixture: the write must
      // fail under it, which is exactly the assertion the real pingSession passes.
      const fixture = await makeFixture();
      try {
        await plantRecord(fixture, { leaf: `${NODE_ID}~ws-dead~claude-code~sess-dead.json`, workspaceId: "ws-dead", sessionId: "sess-dead", ageMs: TTL_MS + 1 });
        const plantedPing = async () => {
          // A reaper without the failure isolation: the unlink fault propagates and
          // takes the session write with it.
          const entries = await readdir(fixture.sessionsDir);
          for (const name of entries) {
            if (!name.startsWith(`${NODE_ID}~`)) continue;
            const record = JSON.parse(await readFile(path.join(fixture.sessionsDir, name), "utf8"));
            if (isSessionLive(record, NOW_MS, TTL_MS)) continue;
            throw Object.assign(new Error("locked"), { code: "EPERM" });
          }
          return startSession(fixture.ws, { nodeId: NODE_ID, workspaceId: "ws-1", repo: "demo", assistant: "claude-code", sessionId: "sess-mine", now: NOW });
        };
        await assert.rejects(plantedPing, /locked/, "the planted non-isolated reap FAILS the write — the defect ADR-006 forbids");

        // The real one, same fixture, same fault: it resolves.
        const real = await pingSession(
          fixture.ws,
          { nodeId: NODE_ID, workspaceId: "ws-1", repo: "demo", assistant: "claude-code", sessionId: "sess-mine", now: NOW },
          { unlink: async () => { throw Object.assign(new Error("locked"), { code: "EPERM" }); } },
        );
        assert.equal(real.sessionId, "sess-mine", "the real reap is failure-isolated under the identical fault");
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },
];
