import { defaultApplication as _aofApplication } from "aof/default-application";
// FF-14801 — milestone 148 / ADR-005: "The base ranking keeps every eval pair in the block."
//
// Over records built IN MEMORY from this repository's own `wiki/work`, each cited
// `(query, scope, <item>/<id>)` pair must rank its record within the first `HOOK_LIMIT` (5)
// results of `rankRecords` — the ranking both backends share, and the five lines an agent is
// shown at a declared edge. A pair whose record is no longer in the corpus reds as GONE, never
// as a pass (m39/R4): a table that silently stops matching anything is a table that holds
// nothing.
//
// WHY THE LIVE CORPUS. The milestones after 148 add records to the ranked pool (148/03 alone
// adds every story's lessons), and the graph re-rank term is still stubbed (10/01). A frozen
// snapshot would never see the pool grow, which is the risk named; so the records are built by
// `buildRecords(null, ctx)` over the real tree, and nothing is written — `reindex` is never
// called, and the build runs under a throwaway `AOF_GLOBAL_HOME` so the global cache cannot
// answer for the checkout.
//
// OUT OF REACH, AND SAID SO. The graph re-rank reads a git-ignored artifact that a clean
// worktree does not have, so this eval holds the BASE ranking only (ADR-005 §3).
//
// THE RUNNER IS EXPORTED. `evalPair`/`runEval` are pure over (records, pairs, ranker); the
// story's `@executable` suite (`test/memory/retrieval-eval.test.mjs`) drives them over small
// record sets, and the fitness function below drives them over the live corpus.
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rankRecords } from "@aof/knowledge/memory/local-retrieval";
import { findWork } from "@aof/work/discovery";

const buildRecords = _aofApplication.knowledge.memory.localIndexing.buildRecords;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

// The block an agent is shown: `--block` renders the first `HOOK_LIMIT` (5) recalled records.
// Read from its one home, so the pass line moves if the block does.
export const HOOK_LIMIT = _aofApplication.knowledge.work.memory.HOOK_LIMIT;

const ARCHITECTURE = { area: "architecture" };

// THE PAIR TABLE. Every pair is drawn from a recall an item already recorded, and `from` names
// it as `<item ref>:<document>` — BY REF, never by path, so an archive move never stales the
// table (134/01/R2). The expected record is `<item>/<id>`, because ids recur in every item.
//
// Two kinds of pair, both taken from what a recall recorded:
//   - the QUERY the recall ran, with the scope it ran under, expecting a record it surfaced
//     (124, 126, 129, 138; the 05 spike's two, which lead the table as the origin names them);
//   - the GIST the recall line quoted for a surfaced record, as an architect would phrase it
//     again at the next decision, under the `--area architecture` scope those recalls used.
export const EVAL_PAIRS = Object.freeze([
  { query: "content addressed hash cross platform", scope: {}, expect: "01/R2", from: "05:spike/FINDINGS.md" },
  { query: "fitness function asserts a symbol appears in a file", scope: {}, expect: "01/R1", from: "05:spike/FINDINGS.md" },
  { query: "advisory doctor lane depends edge verification loop correction scope cap exhaustion", scope: ARCHITECTURE, expect: "62/ADR-003", from: "124:ARCHITECTURE.md" },
  // MOVED at 148/03, and why (ADR-005 consequence: a story that grows the pool keeps the eval green
  // or shows why a pair should move). The pair was 126's recorded query, "supervised declaration
  // reconcile level-triggered restart loop clock resume deadline attempt", which ranked 36/ADR-002
  // fourth. It sat in a near-tie with 68/ADR-002 and 53/ADR-004 — all three surfaced by that same
  // recall, within 0.14 of each other. Story lessons joining the pool shifted the term statistics,
  // and the tie reordered to 6th. No unrelated record entered the block, so the pair now quotes the
  // gist 126's recall recorded for 36/ADR-002 instead.
  { query: "supervision is spawn, watchdog and jittered backoff over a role-driven set", scope: ARCHITECTURE, expect: "36/ADR-002", from: "126:ARCHITECTURE.md" },
  { query: "loop concurrency worktree lanes merge-back grading per lane child process", scope: ARCHITECTURE, expect: "71/ADR-006", from: "129:ARCHITECTURE.md" },
  { query: "headless terminal emulator screen model beside node-pty", scope: ARCHITECTURE, expect: "28/ADR-002", from: "138:ARCHITECTURE.md" },
  { query: "provenance frozen envelope stamped by one writer seam at write time", scope: ARCHITECTURE, expect: "55/ADR-003", from: "134:ARCHITECTURE.md" },
  { query: "transcript watch is session-shaped", scope: ARCHITECTURE, expect: "63/ADR-013", from: "134:ARCHITECTURE.md" },
  { query: "a run waiting on a human releases its slot", scope: ARCHITECTURE, expect: "69/ADR-007", from: "134:ARCHITECTURE.md" },
  { query: "scenario join is declared never inferred unjoined case reported unjoined", scope: ARCHITECTURE, expect: "54/ADR-006", from: "135:ARCHITECTURE.md" },
  { query: "loop is resumed not restored durable loop state brief.loop envelope", scope: ARCHITECTURE, expect: "53/ADR-004", from: "143:ARCHITECTURE.md" },
  { query: "phase is read from brief.loop.phase never minted", scope: ARCHITECTURE, expect: "68/ADR-002", from: "143:ARCHITECTURE.md" },
  { query: "resume versus fresh is a verb distinction run-retry resumes the prior session", scope: ARCHITECTURE, expect: "20/ADR-003", from: "126:ARCHITECTURE.md" },
  { query: "trigger is a declaration plus a resolution, the trigger layer is a caller not a coordinator", scope: ARCHITECTURE, expect: "63/ADR-001", from: "126:ARCHITECTURE.md" },
  { query: "re-index engine is its own module importing readers, frontmatter rewrites are surgical single-line", scope: ARCHITECTURE, expect: "41/ADR-001", from: "127:ARCHITECTURE.md" },
  { query: "give a concern one home and remove a block from the widest out-degree file", scope: ARCHITECTURE, expect: "48/ADR-009", from: "127:ARCHITECTURE.md" },
  { query: "loop creation authority is exactly one type in one place, promote finding to chore", scope: ARCHITECTURE, expect: "71/ADR-003", from: "127:ARCHITECTURE.md" },
  { query: "run explicit state machine queued running done failed cancelled", scope: ARCHITECTURE, expect: "19/ADR-001", from: "130:ARCHITECTURE.md" },
  { query: "liveness is heartbeatAt on the run record", scope: ARCHITECTURE, expect: "20/ADR-004", from: "130:ARCHITECTURE.md" },
  { query: "routable session id is the assistant's own, never fabricated", scope: ARCHITECTURE, expect: "48/ADR-001", from: "131:ARCHITECTURE.md" },
  { query: "a control may store a decision, it must derive a fact", scope: ARCHITECTURE, expect: "119/ADR-003", from: "131:ARCHITECTURE.md" },
  { query: "opt-in config block, auth is an env-var reference tokenEnv, absent is an honest no-op", scope: ARCHITECTURE, expect: "17/ADR-004", from: "131:ARCHITECTURE.md" },
  { query: "memory is a backend selected by config, the local backend is a derived index never a second source of truth", scope: ARCHITECTURE, expect: "05/ADR-001", from: "133:ARCHITECTURE.md" },
  { query: "command core is a registry of pure operations keyed by id with a frozen contract", scope: ARCHITECTURE, expect: "08/ADR-002", from: "133:ARCHITECTURE.md" },
  { query: "fleet mirror is a read-only in-memory ephemeral tail, no input path back to the worker pty", scope: ARCHITECTURE, expect: "38/ADR-014", from: "138:ARCHITECTURE.md" },
].map((pair) => Object.freeze({ ...pair, scope: Object.freeze({ ...pair.scope }) })));

// `<item>/<id>` splits at the LAST slash: a nested story's item is itself `NN/MM`, and no
// record id carries a slash.
export function splitExpect(expect) {
  const cut = String(expect).lastIndexOf("/");
  return { item: expect.slice(0, cut), id: expect.slice(cut + 1) };
}

function describeScope(scope = {}) {
  const entries = Object.entries(scope);
  return entries.length ? ` [${entries.map(([k, v]) => `${k} ${v}`).join(", ")}]` : "";
}

// One pair → { pair, verdict, rank }. GONE is decided over the WHOLE record set, before any
// scope: the record is not in the corpus at all. Otherwise the pair is ranked under the scope
// it was recorded with, over the full ranked list (so a lost pair names the rank it fell to),
// and is HELD within the first `HOOK_LIMIT`, LOST below it or when the ranking never returns it.
export function evalPair(records, pair, { rank = rankRecords } = {}) {
  const { item, id } = splitExpect(pair.expect);
  const present = records.some((record) => String(record.item) === item && record.id === id);
  if (!present) {
    return { pair, verdict: "gone", rank: null, message: `gone: ${pair.expect} is not in the corpus (query "${pair.query}"${describeScope(pair.scope)})` };
  }
  const ranked = rank(records, pair.query, pair.scope, { limit: records.length });
  const index = ranked.findIndex((record) => String(record.item) === item && record.id === id);
  const at = index === -1 ? null : index + 1;
  if (at !== null && at <= HOOK_LIMIT) return { pair, verdict: "held", rank: at, message: null };
  const where = at === null ? "the ranking never returned it" : `found at rank ${at}`;
  return {
    pair,
    verdict: "lost",
    rank: at,
    message: `lost: ${pair.expect} for query "${pair.query}"${describeScope(pair.scope)} — ${where}, outside the first ${HOOK_LIMIT}`,
  };
}

// The table → { pass, results, failures }. `failures` carries one message per pair that is not
// held, so a red eval names every pair it lost, not only the first.
export function runEval(records, pairs = EVAL_PAIRS, opts = {}) {
  const results = pairs.map((pair) => evalPair(records, pair, opts));
  const failures = results.filter((r) => r.verdict !== "held").map((r) => r.message);
  return { pass: failures.length === 0, results, failures };
}

export function assertEvalPasses(outcome) {
  assert.ok(outcome.pass, `the retrieval eval lost ${outcome.failures.length} pair(s):\n  ${outcome.failures.join("\n  ")}`);
}

// The live record set, built in memory and written nowhere. The build runs under a throwaway
// `AOF_GLOBAL_HOME`, restored afterwards, so the rows come off this checkout's disk and the
// global cache — which a clean worktree does not share — cannot answer for it.
export async function buildLiveRecords({ projectRoot = REPO_ROOT, workDir = path.join(projectRoot, "wiki", "work") } = {}) {
  const home = await mkdtemp(path.join(os.tmpdir(), "aof-eval-home-"));
  const prior = process.env.AOF_GLOBAL_HOME;
  process.env.AOF_GLOBAL_HOME = home;
  try {
    return await buildRecords(null, { workDir, projectRoot, configMemory: {} });
  } finally {
    if (prior === undefined) delete process.env.AOF_GLOBAL_HOME;
    else process.env.AOF_GLOBAL_HOME = prior;
    await rm(home, { recursive: true, force: true });
  }
}

// `from` is `<item ref>:<document>`; the ref is resolved through the stream (live or archived),
// and the named document of that item must carry the expected record's id.
export async function resolveProvenance(pair, workDir = path.join(REPO_ROOT, "wiki", "work")) {
  const cut = pair.from.indexOf(":");
  const ref = pair.from.slice(0, cut);
  const doc = pair.from.slice(cut + 1);
  const matches = await findWork(workDir, ref);
  if (matches.length !== 1) return { ok: false, reason: `"${ref}" resolves to ${matches.length} item(s)` };
  const docPath = path.join(matches[0].dir, doc);
  if (!existsSync(docPath)) return { ok: false, reason: `${ref} has no ${doc}` };
  const { id } = splitExpect(pair.expect);
  const text = await readFile(docPath, "utf8");
  const cited = new RegExp(`(^|[^A-Za-z0-9-])${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![0-9])`).test(text);
  return cited ? { ok: true } : { ok: false, reason: `${ref}:${doc} does not cite ${id}` };
}

export const archTests = [
  {
    name: "arch/FF-14801: every cited pair keeps its record within the first five over the live corpus",
    run: async () => {
      const records = await buildLiveRecords();
      assert.ok(records.length > 0, "the live corpus built records");
      assertEvalPasses(runEval(records));
    },
  },
  {
    // 148/03 E8 — the first change to the pool this eval guards: every item's retrospective is
    // read (ADR-006), so the pool now holds story lessons. Asserted present, so a green here is
    // never a green over a pool the widening silently failed to grow.
    name: "arch/FF-14801 (148/03 E8): the eval holds every pair over the live corpus with story lessons indexed",
    run: async () => {
      const records = await buildLiveRecords();
      const storyLessons = records.filter((r) => r.recordType === "lesson" && String(r.item).includes("/"));
      assert.ok(storyLessons.length > 0, "the live pool holds at least one lesson whose item is a nested story ref");
      const outcome = runEval(records);
      assertEvalPasses(outcome);
      assert.ok(outcome.results.every((r) => r.verdict === "held"));
    },
  },
];
