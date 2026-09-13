// Fitness function: acd-session-leaf-per-session (milestone 48 / ADR-002 + ADR-010 R1,
// fitness #2) — "one live session, one record; an `end` cannot kill a sibling."
//
// THE DEFECT THIS PINS SHUT, measured at RESEARCH §3: the m38 leaf was
// `<node>~<workspace>~<assistant>`, so two `claude` sessions in one repo on one node
// resolved to the SAME file. `pingSession` upserted blindly over whichever wrote last
// (silently inheriting the first session's `startedAt`), and `endSession` unlinked the
// shared leaf — so quitting one pane marked the other dead while it was still running.
// That is the ordinary shape of working in two panes on one repo, not a corner case.
//
// THE FIX: a FOURTH leaf component, the session id, with the key travelling as ONE
// object (a fifth positional argument is exactly the shape a caller silently forgets,
// and a forgotten session component reintroduces the collision). An anonymous session
// (48/ADR-001) contributes the EMPTY segment — a trailing `~` — a shape a resolved id
// can never produce, and visibly distinct from a pre-m48 3-part leaf.
//
// 48/ADR-010 R1 settled the `~`-collision QA routed from task 01: `safeSegment` is NOT
// changed and `~` is NOT collapsed; instead the FOURTH segment gets its own INJECTIVE
// percent-encoding, so distinct ids compose distinct leaves and the question "what
// happens to two ids that collide after collapsing" has an answer no build can get
// wrong — nothing collapses, so nothing collides.
//
// Proofs:
//  1. STRUCTURAL — the leaf composition carries FOUR `~`-joined segments and routes
//     the fourth through the escaping `sessionSegment`; an anonymous key composes the
//     trailing-`~` empty segment.
//  2. STRUCTURAL — the key travels as ONE object: every `src/` call site of
//     sessionRecordPath / readSessionRecord / startSession / pingSession / endSession
//     passes the key as an object literal or identifier in the SECOND position, never
//     as a spread of positional components.
//  3. STRUCTURAL (ADR-010 R1) — ids differing only in awkward characters (`a~b`,
//     `a-b`, `a/b`) compose THREE distinct leaves, and every id in task 01's Examples
//     composes a leaf that splits into exactly four `~`-separated parts.
//  4. BEHAVIOURAL (real producers, hermetic store) — two live records for one
//     (node, workspace, assistant) with different ids are two files with their own
//     `startedAt`; `endSession` on one leaves the other BYTE-IDENTICAL on disk and
//     still present on the next real `readLiveSessions`; each awkward id creates
//     exactly one FLAT file and reads back byte-identical.
//  Self-check (m03 non-vacuous): a planted 3-part `sessionLeaf` (planted into the REAL
//  source text, asserted to have LANDED — the tree is CRLF), a planted 5-positional
//  call site, and a planted 3-part `endSession` (run against the real fixture) each
//  trip the SAME assertion the real code passes.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir, unlink, stat } from "node:fs/promises";
import { readdirSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startSession, endSession, readSessionRecord, sessionRecordPath } from "../../../src/mesh/session.mjs";
import { readLiveSessions } from "../../../src/mesh/presence.mjs";
import { loadWorkspace } from "../../../src/work.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const srcRoot = path.join(repoRoot, "src");
const sessionSourcePath = path.join(srcRoot, "mesh/session.mjs");
const commandSourcePath = path.join(srcRoot, "commands", "mesh", "session.mjs");

const NODE_ID = "node-a";
const NOW = "2026-08-10T12:00:00.000Z";

// The KEYED verbs — the ones 48/ADR-002 says take the key as ONE object.
// `readSessionRecordsForNode(workspace, nodeId)` is deliberately NOT in this list: it
// is a per-NODE read, not a keyed one.
const KEYED_VERBS = {
  sessionRecordPath: 2,
  readSessionRecord: 2,
  endSession: 2,
  startSession: 3, // + the trailing seam bag (ADR-010 R5)
  pingSession: 3,
};

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

// The leaf composition, read off the source: it must join FOUR segments with `~` and
// route the fourth through the escaping sessionSegment.
function leafCompositionViolations(code) {
  const source = stripComments(normalise(code));
  const start = source.indexOf("function sessionLeaf(");
  if (start < 0) return ["sessionLeaf is not declared in the session module"];
  const body = source.slice(start, source.indexOf("\n}", start));
  const problems = [];
  const separators = (body.match(/~/g) ?? []).length;
  if (separators !== 3) problems.push(`the leaf joins ${separators + 1} segments — ADR-002 requires FOUR`);
  if (!/sessionSegment\(/.test(body)) problems.push("the fourth segment does not route through the escaping sessionSegment (ADR-010 R1)");
  if (!/safeSegment\(nodeId\)/.test(body)) problems.push("the node segment no longer composes through safeSegment — the per-node read scans by that literal prefix");
  return problems;
}

// A modest argument splitter, enough for this module's own call sites: it walks from
// the call's open paren and splits on top-level commas.
function callArgumentLists(code, fnName) {
  const source = stripComments(code);
  const calls = [];
  const pattern = new RegExp(`\\b${fnName}\\s*\\(`, "g");
  let match;
  while ((match = pattern.exec(source)) != null) {
    const before = source.slice(Math.max(0, match.index - 40), match.index);
    if (/\bfunction\s+$/.test(before)) continue; // the declaration, not a call
    let depth = 0;
    const args = [];
    let current = "";
    for (let index = match.index + match[0].length - 1; index < source.length; index += 1) {
      const char = source[index];
      if (char === "(" || char === "{" || char === "[") {
        depth += 1;
        if (depth === 1) continue;
      } else if (char === ")" || char === "}" || char === "]") {
        depth -= 1;
        if (depth === 0) { args.push(current.trim()); break; }
      } else if (char === "," && depth === 1) {
        args.push(current.trim());
        current = "";
        continue;
      }
      current += char;
    }
    calls.push(args.filter((arg) => arg.length > 0));
  }
  return calls;
}

// NON-VACUITY OF THE STRIP ITSELF (TECH_DEBT item 24, fix (b)). Proof 2 sweeps ALL of
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

// The KEYED call sites this rule actually ruled on, per verb. A rule that loops an
// EMPTY list passes for the wrong reason, so the sweep counts what it saw and refuses
// to rule until every keyed verb has been exercised at least once (the shape
// `recordViolations` uses in acd-session-attribution-single-authority: it will not rule
// on an absence until it has seen the seven).
function keyedCallSitesByVerb(code) {
  const seen = {};
  for (const verb of Object.keys(KEYED_VERBS)) {
    seen[verb] = callArgumentLists(code, verb).filter((args) => args.length >= 2).length;
  }
  return seen;
}

function keyAsOneObjectViolations(code, label) {
  const problems = [];
  for (const [verb, maxArity] of Object.entries(KEYED_VERBS)) {
    for (const args of callArgumentLists(code, verb)) {
      if (args.length < 2) continue; // a re-export or a reference, not a keyed call
      if (args.length > maxArity) problems.push(`${label}: ${verb}(…) is called with ${args.length} arguments — the key must travel as ONE object (max ${maxArity})`);
      if (!args[1].startsWith("{") && !/^[A-Za-z_$][\w$]*$/.test(args[1])) {
        problems.push(`${label}: ${verb}(…)'s second argument is not a key object — "${args[1]}"`);
      }
      if (/^["'`]/.test(args[1])) problems.push(`${label}: ${verb}(…) takes a positional key component — "${args[1]}"`);
    }
  }
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
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-acd-session-leaf-per-session-"));
  const root = path.join(tmp, "repo");
  const home = path.join(tmp, "home");
  await mkdir(path.join(root, "wiki", "work"), { recursive: true });
  await mkdir(path.join(root, ".aof"), { recursive: true });
  const config = { name: "fixture", work: { dir: "./wiki/work" }, mesh: { nodeId: NODE_ID } };
  await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
  const env = { AOF_GLOBAL_HOME: home };
  return { tmp, root, home, env, sessionsDir: path.join(home, "mesh", "sessions"), ws: await loadWorkspace(root, undefined, { env }) };
}

const leafFor = (workspace, key) => path.basename(sessionRecordPath(workspace, key), ".json");

export const archTests = [
  {
    name: "arch/48 ADR-002+010 (acd-session-leaf-per-session): STRUCTURAL — the leaf composition carries a FOURTH session segment, escaped, with the node segment's prefix untouched",
    run: async () => {
      const problems = leafCompositionViolations(await readFile(sessionSourcePath, "utf8"));
      assert.deepEqual(problems, [], `leaf composition problems:\n  ${problems.join("\n  ")}`);

      // The composed shape itself, off the REAL exported path builder.
      const workspace = { globalMeshRoot: path.join(os.tmpdir(), "leaf-probe") };
      const addressable = leafFor(workspace, { nodeId: "node-a", workspaceId: "ws-1", assistant: "claude-code", sessionId: "sess-A" });
      assert.deepEqual(addressable.split("~"), ["node-a", "ws-1", "claude-code", "sess-A"], "four `~`-separated parts");

      const anonymous = leafFor(workspace, { nodeId: "node-a", workspaceId: "ws-1", assistant: "claude-code", sessionId: null });
      assert.equal(anonymous, "node-a~ws-1~claude-code~", "an anonymous session composes the EMPTY fourth segment — a trailing `~`");
      assert.equal(anonymous.split("~").length, 4, "…which is still four parts, not three");
      assert.notEqual(anonymous, "node-a~ws-1~claude-code", "…and is visibly distinct from a pre-m48 3-part leaf");
    },
  },
  {
    name: "arch/48 ADR-002 (acd-session-leaf-per-session): STRUCTURAL — every src/ call site passes the key as ONE object, never as positional components (and the sweep says how many sites it ruled on)",
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

      // NON-VACUITY OF THE WALK. `keyAsOneObjectViolations` LOOPS a match list, so it
      // returns `[]` for a file with no keyed call at all — which is 213 of the 215
      // modules, and would also be every module after a rename of these verbs. The
      // sweep therefore states its yield and refuses to rule until each keyed verb has
      // been seen at least once.
      const totals = Object.fromEntries(Object.keys(KEYED_VERBS).map((verb) => [verb, 0]));
      for (const [, source] of corpus) {
        for (const [verb, count] of Object.entries(keyedCallSitesByVerb(source))) totals[verb] += count;
      }
      const unseen = Object.entries(totals).filter(([, count]) => count === 0).map(([verb]) => verb);
      assert.deepEqual(
        unseen,
        [],
        `these keyed verbs have NO call site in src/ — the rule below would loop an empty list and pass for the wrong reason (a rename empties it silently): ${JSON.stringify(unseen)}; measured yield: ${JSON.stringify(totals)}`,
      );

      const problems = [];
      for (const [rel, source] of corpus) problems.push(...keyAsOneObjectViolations(source, rel));
      assert.deepEqual(problems, [], `the key must travel as ONE object:\n  ${problems.join("\n  ")}`);
    },
  },
  {
    name: "arch/48 ADR-010 R1 (acd-session-leaf-per-session): STRUCTURAL — the escape is INJECTIVE: ids differing only in awkward characters compose DISTINCT leaves, and every Examples id composes exactly four parts",
    run: async () => {
      const workspace = { globalMeshRoot: path.join(os.tmpdir(), "leaf-probe") };
      const base = { nodeId: "node-a", workspaceId: "ws-1", assistant: "claude-code" };

      const collisionCandidates = ["a~b", "a-b", "a/b"].map((sessionId) => leafFor(workspace, { ...base, sessionId }));
      assert.equal(new Set(collisionCandidates).size, 3, `a~b / a-b / a/b must compose THREE distinct leaves, got ${JSON.stringify(collisionCandidates)}`);

      // Task 01's own Examples table, plus task 00's storage rows.
      const examples = ["../../escape", "a/b\\c", "weird~id", "weird~id~here", "3f2b9c14-8a7e-4d61-9f03-1c5ea77b42d9", "  spaced-id  ", "3F2b9C14-8a7E-4d61-9F03-1c5EA77B42d9"];
      const leaves = new Set();
      for (const sessionId of examples) {
        const leaf = leafFor(workspace, { ...base, sessionId });
        assert.equal(leaf.split("~").length, 4, `"${sessionId}" composes exactly four parts (got "${leaf}")`);
        assert.ok(!leaf.includes("/") && !leaf.includes("\\"), `"${sessionId}" composes ONE flat segment — no separator survives`);
        leaves.add(leaf);
      }
      assert.equal(leaves.size, examples.length, "every Examples id composes its OWN leaf — the encoding is injective");
    },
  },
  {
    name: "arch/48 ADR-002 (acd-session-leaf-per-session): BEHAVIOURAL — two live sessions in one repo are two records, and endSession on one leaves the sibling byte-identical on disk and live on the next read",
    run: async () => {
      const fixture = await makeFixture();
      try {
        const base = { nodeId: NODE_ID, workspaceId: "ws-1", assistant: "claude-code" };
        await startSession(fixture.ws, { ...base, repo: "demo", sessionId: "sess-A", now: NOW });
        await startSession(fixture.ws, { ...base, repo: "demo", sessionId: "sess-B", now: "2026-08-10T12:00:30.000Z" });

        const files = (await readdir(fixture.sessionsDir)).sort();
        assert.equal(files.length, 2, "TWO record files, not one");
        assert.equal(new Set(files).size, 2, "the two file names differ from each other");

        const recordA = await readSessionRecord(fixture.ws, { ...base, sessionId: "sess-A" });
        const recordB = await readSessionRecord(fixture.ws, { ...base, sessionId: "sess-B" });
        assert.equal(recordA.sessionId, "sess-A");
        assert.equal(recordB.sessionId, "sess-B");
        assert.equal(recordA.startedAt, NOW, "each record carries its OWN startedAt — the blind upsert can no longer merge two sessions");
        assert.equal(recordB.startedAt, "2026-08-10T12:00:30.000Z");

        const bytesBefore = await readFile(sessionRecordPath(fixture.ws, { ...base, sessionId: "sess-B" }), "utf8");
        await endSession(fixture.ws, { ...base, sessionId: "sess-A" });

        assert.equal(await readSessionRecord(fixture.ws, { ...base, sessionId: "sess-A" }), null, "sess-A's record is gone");
        const bytesAfter = await readFile(sessionRecordPath(fixture.ws, { ...base, sessionId: "sess-B" }), "utf8");
        assert.equal(bytesAfter, bytesBefore, "sess-B's record is BYTE-IDENTICAL — the single most important consequence of the key change");

        const live = await readLiveSessions(fixture.ws, NODE_ID, { now: "2026-08-10T12:01:00.000Z" });
        assert.equal(live.length, 1, "exactly one live session survives the end");
        assert.equal(live[0].lastPingAt, "2026-08-10T12:00:30.000Z", "…and it is sess-B's entry (matched on its own lastPingAt — the entry's own shape is story 01's contract, not this one's)");
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/48 ADR-010 R1 (acd-session-leaf-per-session): BEHAVIOURAL — an awkward id still writes exactly ONE flat file under sessions/, and reads back byte-identical",
    run: async () => {
      const fixture = await makeFixture();
      try {
        const ids = ["../../escape", "a/b\\c", "weird~id", "3f2b9c14-8a7e-4d61-9f03-1c5ea77b42d9"];
        for (const sessionId of ids) {
          const key = { nodeId: NODE_ID, workspaceId: "ws-1", assistant: "claude-code", sessionId };
          await startSession(fixture.ws, { ...key, repo: "demo", now: NOW });
          const record = await readSessionRecord(fixture.ws, key);
          assert.ok(record, `a record exists for ${JSON.stringify(sessionId)}`);
          assert.strictEqual(record.sessionId, sessionId, "the path is made safe, the VALUE is not rewritten");
        }
        const entries = await readdir(fixture.sessionsDir, { withFileTypes: true });
        assert.equal(entries.length, ids.length, "one flat file per id — nothing extra, nothing merged");
        for (const entry of entries) {
          assert.ok(entry.isFile(), `${entry.name} is a FILE — no subdirectory was created`);
        }
        const meshEntries = await readdir(path.join(fixture.home, "mesh"));
        assert.deepEqual(meshEntries.sort(), ["sessions"], "nothing was written outside the sessions directory");
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/48 ADR-002 (acd-session-leaf-per-session): self-check — a planted 3-part leaf, a planted 5-positional call site, and a planted 3-part endSession each trip the SAME assertions the real code passes",
    run: async () => {
      const realSource = await readFile(sessionSourcePath, "utf8");
      assert.deepEqual(leafCompositionViolations(realSource), [], "the real leaf composition is clean");

      const plantedLeaf = plant(
        realSource,
        "return `${safeSegment(nodeId)}~${safeSegment(workspaceId)}~${safeSegment(assistant)}~${sessionSegment(sessionId)}`;",
        "return `${safeSegment(nodeId)}~${safeSegment(workspaceId)}~${safeSegment(assistant)}`;",
      );
      assert.ok(leafCompositionViolations(plantedLeaf).length > 0, "a planted 3-part leaf trips the composition detector");

      // The positional plant goes into the REAL caller, read from disk and run through
      // the SAME per-file path the sweep uses — a hand-typed string would only prove
      // that the regex fires, not that the walk reads the tree.
      const realCaller = await readFile(commandSourcePath, "utf8");
      assert.deepEqual(keyAsOneObjectViolations(normalise(realCaller), "src/commands/mesh/session.mjs"), [], "the real caller passes the one-object detector");
      const callerSites = keyedCallSitesByVerb(normalise(realCaller));
      assert.ok(
        Object.values(callerSites).some((count) => count > 0),
        `…and it genuinely HAS keyed call sites for the detector to rule on (got ${JSON.stringify(callerSites)}) — an empty list would make the assertion above vacuous`,
      );

      const plantedCall = plant(
        realCaller,
        "const record = await startSession(ws, { nodeId, workspaceId, repo, assistant, sessionId, now });",
        "const record = await startSession(ws, nodeId, workspaceId, assistant, sessionId);",
      );
      const positional = keyAsOneObjectViolations(plantedCall, "src/commands/mesh/session.mjs");
      assert.ok(positional.length > 0, `a 5-positional call site planted into the REAL caller trips the one-object detector (got ${JSON.stringify(positional)})`);
      assert.ok(positional.some((problem) => problem.includes("ONE object")), "…naming the rule it breaks");

      // …and a positional STRING component (the other half of the rule) too.
      const plantedString = plant(
        realCaller,
        "await endSession(ws, { nodeId, workspaceId, assistant, sessionId });",
        'await endSession(ws, "node-a", workspaceId, assistant, sessionId);',
      );
      assert.ok(
        keyAsOneObjectViolations(plantedString, "src/commands/mesh/session.mjs").some((problem) => problem.includes("positional key component")),
        "a positional STRING key component planted into the real caller trips the detector too",
      );

      // The pre-m48 world, reconstructed on the real store: a 3-part WRITER plus a
      // 3-part deleter is exactly RESEARCH §3's measured defect — two sessions collapse
      // onto ONE file, and ending either takes the other's liveness with it. The
      // behavioural assertion above ("the sibling survives, byte-identical") is what
      // trips on it, which is what makes that assertion non-vacuous.
      const fixture = await makeFixture();
      try {
        const base = { nodeId: NODE_ID, workspaceId: "ws-1", assistant: "claude-code" };
        const legacyLeaf = path.join(fixture.sessionsDir, `${NODE_ID}~ws-1~claude-code.json`);
        await mkdir(fixture.sessionsDir, { recursive: true });
        const legacyWrite = async (sessionId, startedAt) => {
          // The m38 3-part writer: the key carries no session component, so the second
          // session's write lands on the FIRST session's file.
          await writeFile(legacyLeaf, JSON.stringify({ nodeId: NODE_ID, workspaceId: "ws-1", repo: "demo", assistant: "claude-code", startedAt, lastPingAt: startedAt, planted: sessionId }, null, 2), "utf8");
        };
        await legacyWrite("sess-A", NOW);
        await legacyWrite("sess-B", "2026-08-10T12:00:30.000Z");
        assert.equal((await readdir(fixture.sessionsDir)).length, 1, "the planted 3-part writer merged TWO sessions into ONE file — the defect, reproduced");

        await unlink(legacyLeaf); // the planted 3-part endSession, for sess-A
        assert.equal((await readdir(fixture.sessionsDir)).length, 0, "…and ending sess-A deleted the ONLY record, so live sess-B reads as gone — the assertion above trips");

        // The real pair, on the same store: two files, and end removes exactly one.
        await startSession(fixture.ws, { ...base, repo: "demo", sessionId: "sess-A", now: NOW });
        await startSession(fixture.ws, { ...base, repo: "demo", sessionId: "sess-B", now: NOW });
        await endSession(fixture.ws, { ...base, sessionId: "sess-A" });
        const remaining = await readdir(fixture.sessionsDir);
        assert.deepEqual(remaining, [`${NODE_ID}~ws-1~claude-code~sess-B.json`], "the real endSession removed ONLY its own 4-part leaf");
        await stat(sessionRecordPath(fixture.ws, { ...base, sessionId: "sess-B" }));
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },
];
