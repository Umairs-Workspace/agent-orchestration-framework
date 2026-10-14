import { defaultApplication as _aofApplication } from "aof/default-application";
// FF-15701 — milestone 157 / ADR-001 + ADR-002: "Both backends derive identical episodic
// identities from existing sources; every primary and stall locator resolves; rebuilding changes
// no source."
//
// Behavioural, over a fixture stream holding every episodic source shape — a Findings register
// with a row AND a heading for one id, a SESSION register, a mixed FEEDBACK ledger with a blank
// line, flat and node-partitioned run records in terminal and live states, and an observability
// snapshot whose agents carry stalls. Both backends rebuild from it; the graphify graph build is
// INJECTED as absent, so no binary runs.
//
// THE RESOLVER IS THE CONTROL'S SECOND HALF. A locator is evidence only if it cannot be turned
// into an arbitrary read, so the refusal of an absolute path, a traversal and a link out of the
// tree is asserted here beside the resolution it guards.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const localIndexing = _aofApplication.knowledge.memory.localIndexing;
const graphifyBackend = _aofApplication.knowledge.memory.graphifyBackend.default;

const EPISODIC = ["finding", "feedback", "run"];
const STALL_SOURCE = /stall source: (\S+)/g;

const raw = (id, text) => ({ kind: "raw", id, text, actor: "qa", refs: "", at: "2026-10-11T10:00:00Z" });
const run = (runId, itemRef, state, extra = {}) => ({
  runId, itemRef, state, attempt: 1, outcome: ["done", "failed", "cancelled"].includes(state) ? state : null, sessionId: null,
  brief: {}, createdAt: "2026-10-11T10:00:00.000Z", updatedAt: "2026-10-11T11:00:00.000Z", failureReason: null, heartbeatAt: null,
  retryOf: null, reclaimedAt: null, node: null, resumeAfter: null, spend: null, asks: [], ...extra,
});

async function put(file, body) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, typeof body === "string" ? body : `${JSON.stringify(body, null, 2)}\n`, "utf8");
}

async function buildStream() {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "aof-arch-episodic-"));
  const workDir = path.join(projectRoot, "wiki", "work");
  const m39 = path.join(workDir, "39_milestone_x");
  const s02 = path.join(m39, "stories", "02_story_z");
  const m41 = path.join(workDir, "41_milestone_y");
  await put(path.join(m39, "SPEC.md"), `---\ntype: milestone\nnumber: "39"\nslug: x\nstatus: in-progress\ntitle: "X"\n---\n# X\n`);
  await put(path.join(s02, "STORY.md"), `---\ntype: story\nnumber: "02"\nslug: z\nparent: "39"\nstatus: in-progress\ntitle: "Z"\n---\n# Z\n`);
  await put(path.join(m41, "SPEC.md"), `---\ntype: milestone\nnumber: "41"\nslug: y\nstatus: in-progress\ntitle: "Y"\n---\n# Y\n`);
  await put(path.join(m39, "VERIFICATION.md"), [
    "# 39 · Verification", "", "## Findings", "",
    "| id | severity | stage | status | finding |", "|----|----------|-------|--------|---------|",
    "| F-01 | major | continue | fixed | the cap is read from a stale config |",
    "| F-02 | minor |  | open | a second finding |", "",
    "### F-01 · the cap is read from a stale config", "", "Evidence: the loop read the cap once at start.", "",
  ].join("\n"));
  await put(path.join(m41, "SESSION.md"), ["# 41 · Session", "", "## Findings", "", "| id | severity | finding |", "|----|----------|---------|", "| F-01 | nit | a UAT observation |", ""].join("\n"));
  await put(path.join(m39, "FEEDBACK.ndjson"), [JSON.stringify(raw("r1", "the board lied")), "", JSON.stringify({ kind: "classification", id: "c1", raw: "r1", at: "2026-10-11T10:05:00Z", classification: { type: "bug" } }), JSON.stringify(raw("r2", "a second note")), ""].join("\n"));
  await put(path.join(m39, "runs", "node-7297", "20261011T100000000Z-0000.json"), run("20261011T100000000Z-0000", "39", "done", { node: "node-7297", sessionId: "s-1", brief: { loop: { phase: "continue" } } }));
  await put(path.join(m39, "runs", "20261011T110000000Z-0001.json"), run("20261011T110000000Z-0001", "39", "running"));
  await put(path.join(s02, "runs", "node-7297", "20261011T120000000Z-0000.json"), run("20261011T120000000Z-0000", "39/02", "failed", { node: "node-7297", sessionId: "s-2", failureReason: "cap-exhausted" }));
  await put(path.join(m41, "runs", "20261011T130000000Z-0000.json"), run("20261011T130000000Z-0000", "41", "cancelled"));
  await put(path.join(m39, "observability", "snapshots", "2026-10-11T12-00-00-000Z", "agents.json"), {
    agents: [
      { id: "a1", sessionId: "s-1", attributedTo: "39", stalls: [{ gapMs: 600000, at: 1760180000000, before: "assistant", after: "user" }] },
      { id: "a2", sessionId: "s-2", attributedTo: "39/02", stalls: [] },
    ],
  });
  await put(path.join(projectRoot, ".aof", "aof.config.json"), { name: "fixture", work: { dir: "./wiki/work" } });
  return { projectRoot, workDir };
}

function ctxFor(projectRoot, backend) {
  const workDir = path.join(projectRoot, "wiki", "work");
  return {
    workDir,
    projectRoot,
    configMemory: { backend },
    invoke: async () => {
      const error = new Error("graphify binary not found");
      error.code = "graphify-missing";
      throw error;
    },
    loadWorkspace: async () => ({ config: { name: "fixture", memory: { backend } }, configPath: path.join(projectRoot, ".aof", "aof.config.json"), projectRoot, workDir }),
  };
}

const identities = (records) => records.filter((r) => EPISODIC.includes(r.recordType)).map((r) => `${r.item}|${r.recordType}|${r.id}`).sort();

async function treeBytes(root) {
  const bytes = new Map();
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else bytes.set(path.relative(root, full), await readFile(full));
    }
  }
  await walk(root);
  return bytes;
}

async function withStream(fn) {
  const stream = await buildStream();
  try {
    await fn(stream);
  } finally {
    await rm(stream.projectRoot, { recursive: true, force: true });
  }
}

export const archTests = [
  {
    name: "arch/FF-15701 (157/ADR-001): local and graphify derive the identical episodic identity set from the existing sources",
    run: () => withStream(async ({ projectRoot }) => {
      const local = await localIndexing.reindex(null, ctxFor(projectRoot, "local"));
      const graphify = await graphifyBackend.reindex(null, ctxFor(projectRoot, "graphify"));
      const ids = identities(local.records);
      for (const type of EPISODIC) assert.ok(ids.some((id) => id.includes(`|${type}|`)), `non-vacuity: the build produced ${type} records (${ids})`);
      assert.deepEqual(identities(graphify.records), ids, "graphify indexes exactly the local episodic identities");
      // The identity is (item, type, id): F-01 on 39 and on 41 are two records, and a running run
      // or a classification row is none.
      assert.ok(ids.includes("39|finding|F-01") && ids.includes("41|finding|F-01"), "one id on two items is two records");
      assert.equal(ids.filter((id) => id === "39|finding|F-01").length, 1, "a row and a heading for one id are one record");
      assert.ok(!ids.includes("39|run|20261011T110000000Z-0001"), "a running run is not a record");
      assert.ok(!ids.includes("39|feedback|c1"), "a classification row is not a feedback record");
    }),
  },
  {
    name: "arch/FF-15701 (157/ADR-002): every primary locator and every stall locator resolves to the value it names",
    run: () => withStream(async ({ projectRoot, workDir }) => {
      const ctx = { workDir, projectRoot };
      const { records } = await localIndexing.reindex(null, ctxFor(projectRoot, "local"));
      const episodic = records.filter((r) => EPISODIC.includes(r.recordType));
      let stallLocators = 0;
      for (const record of episodic) {
        const value = await localIndexing.readRecordSourceValue(record, ctx);
        if (record.recordType === "finding") assert.ok(String(value).includes(record.id), `${record.source} is the line declaring ${record.id}`);
        else assert.equal(value?.[record.recordType === "run" ? "runId" : "id"], record.id, `${record.source} names ${record.recordType} ${record.id}`);
        for (const [, locator] of record.text.matchAll(STALL_SOURCE)) {
          stallLocators += 1;
          const agent = await localIndexing.readRecordSourceValue({ ...record, source: locator }, ctx);
          assert.equal(agent?.sessionId, value.sessionId, `stall locator ${locator} is the run's own snapshot agent`);
        }
      }
      assert.ok(stallLocators > 0, "non-vacuity: a stall locator was resolved");
    }),
  },
  {
    name: "arch/FF-15701 (157/ADR-001): rebuilding on both backends, twice, changes no source byte",
    run: () => withStream(async ({ projectRoot, workDir }) => {
      const before = await treeBytes(workDir);
      for (let pass = 0; pass < 2; pass += 1) {
        await localIndexing.reindex(null, ctxFor(projectRoot, "local"));
        await graphifyBackend.reindex(null, ctxFor(projectRoot, "graphify"));
      }
      const after = await treeBytes(workDir);
      assert.deepEqual([...after.keys()].sort(), [...before.keys()].sort(), "no file appeared or vanished under the work tree");
      for (const [file, bytes] of before) assert.ok(bytes.equals(after.get(file)), `${file} is byte-identical`);
    }),
  },
  {
    name: "arch/FF-15701 (157/ADR-002): a locator that would leave the work tree is refused before any read",
    run: () => withStream(async ({ projectRoot, workDir }) => {
      const ctx = { workDir, projectRoot };
      const outside = path.join(projectRoot, "outside");
      await put(path.join(outside, "run.json"), { runId: "escaped" });
      await symlink(outside, path.join(workDir, "39_milestone_x", "link-out"), "junction");
      const sources = ["../../outside/run.json#", path.join(outside, "run.json").split(path.sep).join("/") + "#", "/etc/hosts:1", "39_milestone_x/link-out/run.json#"];
      for (const source of sources) {
        const record = { recordType: "run", id: "x", item: "39", source };
        assert.throws(() => localIndexing.resolveRecordSourcePath(record, ctx), (error) => error.code === localIndexing.SOURCE_REFUSED, `${source} is refused`);
        await assert.rejects(localIndexing.readRecordSourceValue(record, ctx), (error) => error.code === localIndexing.SOURCE_REFUSED, `${source} is never read`);
      }
    }),
  },
];
