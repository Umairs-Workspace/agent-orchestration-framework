// Steps for memory-episodic-records.feature (157/01). Sources are written into a fixture work
// stream exactly as their own writers lay them out — a VERIFICATION/SESSION Findings register, a
// FEEDBACK.ndjson ledger, run records under runs/<node>/, an observability snapshot — and the REAL
// CLI ingests them (`aof work memory ingest`). Records are read back from the store the backend
// wrote; a source is resolved through the application's own `resolveRecordSourcePath`. The runner
// resolves this module by convention from the feature's basename.
//
// A GRAPHIFY INGEST NEVER BUILDS A GRAPH HERE. The graphify binary may be on this machine's PATH,
// and the build it would start is an extraction, not a test. Every CLI run therefore gets a PATH
// holding only node's own directory, and a graphify ingest asserts the graph was skipped as absent.
import assert from "node:assert/strict";
import { mkdir, readdir, readFile, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { defaultApplication } from "aof/default-application";
import { MEMORY_RECORD_FIELDS } from "@aof/knowledge/memory/local-retrieval";
import { createStepRegistry } from "../support/step-registry.mjs";
import { registerCommonSteps } from "../support/common-steps.mjs";
import { cliPath, splitCommand } from "../support/cli-context.mjs";
import { spawnCliSync } from "../../support/cli-spawn.mjs";
import { ensureWorkStream, workDir, writeMilestone, writeStory } from "../support/work-stream-fixture.mjs";

const indexing = defaultApplication.knowledge.memory.localIndexing;

const registry = createStepRegistry();
registerCommonSteps(registry);

const EPISODIC = ["finding", "feedback", "run"];
const SLUGS = { 39: "x", 41: "y" };
const STORE = { local: path.join(".aof", "aof.memory.index.json"), graphify: path.join(".aof", "aof.memory.graphify.index.json") };

// ------------------------------------------------------------------ the CLI ----

function cli(context, command) {
  const result = spawnCliSync(process.execPath, ["--no-warnings", cliPath, ...splitCommand(command)], {
    cwd: context.projectDir,
    env: {
      ...process.env,
      PATH: path.dirname(process.execPath),
      AOF_DATA_DIR: context.dataDir,
      AOF_GLOBAL_HOME: context.globalDir,
      NODE_NO_WARNINGS: "1",
    },
    encoding: "utf8",
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

async function setBackend(context, backend) {
  await ensureWorkStream(context);
  const config = { name: "fixture", work: { dir: "./wiki/work" }, memory: { backend } };
  await writeFile(path.join(context.projectDir, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

async function readStore(context, backend) {
  return JSON.parse(await readFile(path.join(context.projectDir, STORE[backend]), "utf8"));
}

async function ingest(context, backend = "local") {
  await setBackend(context, backend);
  const result = cli(context, "work memory ingest --json");
  assert.equal(result.status, 0, `ingest exits 0 (stderr: ${result.stderr})`);
  const summary = JSON.parse(result.stdout);
  if (backend === "graphify") assert.equal(summary.graph?.binaryAbsent, true, "the graph build was skipped, never run");
  context.records = (await readStore(context, backend)).records;
  return summary;
}

function resolveCtx(context) {
  return { workDir: workDir(context), projectRoot: context.projectDir };
}

// --------------------------------------------------------------- the stream ----

async function item(context, ref) {
  await ensureWorkStream(context);
  if (context.items.has(ref)) return context.items.get(ref);
  if (ref.includes("/")) {
    const [parent, number] = ref.split("/");
    await item(context, parent);
    await writeStory(context, { parent, number, slug: "z", title: `Story ${ref}` });
  } else {
    await writeMilestone(context, { number: ref, slug: SLUGS[ref] ?? `m${ref}`, title: `Milestone ${ref}` });
  }
  return context.items.get(ref);
}

async function writeDoc(context, ref, file, lines) {
  const { dir } = await item(context, ref);
  await writeFile(path.join(dir, file), `${lines.join("\n")}\n`, "utf8");
}

const REGISTER_HEADER = ["| id | severity | stage | status | finding |", "|----|----------|-------|--------|---------|"];

async function declareFinding(context, ref, file, { id, severity = "minor", stage = "", status = "open", finding = "a declared finding" }) {
  await writeDoc(context, ref, file, [`# ${ref} · record`, "", "## Findings", "", ...REGISTER_HEADER, `| ${id} | ${severity} | ${stage} | ${status} | ${finding} |`]);
}

const rawRow = (id, text, actor = "qa") => ({ kind: "raw", id, text, actor, refs: "", at: "2026-10-11T10:00:00Z" });
const classificationRow = (id, raw) => ({ kind: "classification", id, raw, at: "2026-10-11T10:05:00Z", classification: { type: "bug" } });
const recallRow = (id) => ({ kind: "recall", id, at: "2026-10-11T10:10:00Z", edge: "continue-developer", actor: "developer", query: "cap", scope: {}, records: [] });

async function writeLedger(context, ref, lines) {
  const { dir } = await item(context, ref);
  await writeFile(path.join(dir, "FEEDBACK.ndjson"), `${lines.map((line) => (typeof line === "string" ? line : JSON.stringify(line))).join("\n")}\n`, "utf8");
}

let runSeq = 0;
async function writeRun(context, ref, { runId, state, attempt = 1, retryOf = null, phase = null, failureReason = null, sessionId = null, node = "node-7297" }) {
  const { dir } = await item(context, ref);
  const id = runId ?? `20261011T1${String(runSeq).padStart(5, "0")}000Z-${String(runSeq++).padStart(4, "0")}`;
  const terminal = ["done", "failed", "cancelled"].includes(state);
  const record = {
    runId: id, itemRef: ref, state, attempt, outcome: terminal ? state : null, sessionId,
    brief: phase ? { loop: { phase } } : {}, createdAt: "2026-10-11T10:00:00.000Z", updatedAt: "2026-10-11T11:00:00.000Z",
    failureReason, heartbeatAt: null, retryOf, reclaimedAt: null, node, resumeAfter: null, spend: null, asks: [],
  };
  const file = path.join(dir, "runs", node, `${id}.json`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  context.subjectRun = id;
  return id;
}

async function writeSnapshot(context, ref, agents) {
  const { dir } = await item(context, ref);
  const snapshot = path.join(dir, "observability", "snapshots", "2026-10-11T12-00-00-000Z");
  await mkdir(snapshot, { recursive: true });
  await writeFile(path.join(snapshot, "agents.json"), `${JSON.stringify({ agents }, null, 2)}\n`, "utf8");
  await writeFile(path.join(snapshot, "report.md"), "# report\n", "utf8");
}

const agent = (sessionId, attributedTo, stalls) => ({ id: `a-${sessionId}`, sessionId, attributedTo, stalls });
const stall = (gapMs) => ({ gapMs, at: 1760180000000, before: "assistant", after: "user" });

// The full episodic stream the parity and read-only scenarios share.
async function fullStream(context) {
  await writeDoc(context, "39", "VERIFICATION.md", ["# 39", "", "## Findings", "", ...REGISTER_HEADER, "| F-01 | major | continue | fixed | the cap is stale |", "", "### F-01 · the cap is stale", "", "Evidence: the loop read the cap once."]);
  await declareFinding(context, "39/02", "VERIFICATION.md", { id: "F-01" });
  await declareFinding(context, "41", "SESSION.md", { id: "F-02", stage: "refine" });
  await writeLedger(context, "39", [rawRow("r1", "the board lied"), classificationRow("c1", "r1"), recallRow("k1")]);
  await writeLedger(context, "39/02", [rawRow("r2", "a second note", "developer")]);
  await writeRun(context, "39", { state: "done", sessionId: "s-1", phase: "continue" });
  await writeRun(context, "39/02", { state: "failed", sessionId: "s-2", failureReason: "cap-exhausted" });
  await writeRun(context, "41", { state: "cancelled" });
  await writeRun(context, "41", { state: "running" });
  await writeSnapshot(context, "39", [agent("s-1", "39", [stall(600000)]), agent("s-2", "39/02", [])]);
}

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

const of = (context, type, ref) => context.records.filter((record) => record.recordType === type && (ref == null || record.item === ref));
const theRun = (context) => {
  const run = context.records.find((record) => record.recordType === "run" && record.id === context.subjectRun);
  assert.ok(run, `a run record exists for ${context.subjectRun}`);
  return run;
};

// ------------------------------------------------------------------ R1 · findings ----

registry.define(/^milestone "([^"]+)" has a VERIFICATION\.md Findings register holding the row "(.+)"$/, async (context, ref, row) => {
  context.doc = ["# 39 · Verification", "", "## Findings", "", "| id | severity | status | finding |", "|----|----------|--------|---------|", row];
  context.row = row;
  await writeDoc(context, ref, "VERIFICATION.md", context.doc);
  context.docRef = ref;
});

registry.define(/^the same register holds a heading "(.+)" with an evidence paragraph$/, async (context, heading) => {
  context.evidence = "The loop read the cap from the config cached at start, so a raised cap never applied.";
  context.doc.push("", heading, "", context.evidence);
  await writeDoc(context, context.docRef, "VERIFICATION.md", context.doc);
});

registry.define(/^"aof (.+)" runs after ingest$/, async (context, command) => {
  await ingest(context);
  const result = cli(context, command.replace(/\\"/g, '"'));
  assert.equal(result.status, 0, `${command} exits 0 (stderr: ${result.stderr})`);
  context.recalled = JSON.parse(result.stdout);
});

registry.define(/^exactly one record has id "([^"]+)"$/, (context, id) => {
  const hits = context.recalled.filter((record) => record.id === id);
  assert.equal(hits.length, 1, `one record with id ${id} (got ${hits.length})`);
  context.subject = hits[0];
});

registry.define(/^its recordType and kind are both "([^"]+)" and its area is "([^"]+)"$/, (context, type, area) => {
  assert.equal(context.subject.recordType, type);
  assert.equal(context.subject.kind, type);
  assert.equal(context.subject.area, area);
});

registry.define("its source cites the table row's line", (context) => {
  const line = context.doc.indexOf(context.row) + 1;
  assert.equal(context.subject.source, `39_milestone_x/VERIFICATION.md:${line}`);
});

registry.define("its text holds the row's severity and status and the heading's evidence paragraph", (context) => {
  for (const part of ["major", "open", context.evidence]) assert.ok(context.subject.text.includes(part), `text holds "${part}": ${context.subject.text}`);
});

registry.define(/^milestone "([^"]+)" has a VERIFICATION\.md whose prose outside the Findings register cites "([^"]+)"$/, async (context, ref, id) => {
  context.doc = ["# Verification", "", "## Summary", "", `${id} was closed by the cap fix.`, `| ${id} | major | open | quoted outside the register |`];
  context.docRef = ref;
  await writeDoc(context, ref, "VERIFICATION.md", context.doc);
});

registry.define(/^its Findings register holds "([^"]+)" only inside a fenced code block$/, async (context, id) => {
  context.doc.push("", "## Findings", "", "```text", `| ${id} | minor | open | a quoted sample |`, `### ${id} · a quoted heading`, "```");
  await writeDoc(context, context.docRef, "VERIFICATION.md", context.doc);
});

registry.define("ingest runs", async (context) => {
  await ingest(context);
});

registry.define(/^no finding record exists for "([^"]+)" or "([^"]+)" on item "([^"]+)"$/, (context, a, b, ref) => {
  const found = of(context, "finding", ref).filter((record) => record.id === a || record.id === b);
  assert.deepEqual(found.map((record) => record.id), []);
});

registry.define(/^(?:story|milestone) "([^"]+)" declares finding "([^"]+)" in its (VERIFICATION\.md|SESSION\.md) Findings register$/, async (context, ref, id, file) => {
  await declareFinding(context, ref, file, { id });
});

registry.define(/^two finding records with id "([^"]+)" exist, one with item "([^"]+)" and one with item "([^"]+)"$/, (context, id, a, b) => {
  const items = of(context, "finding").filter((record) => record.id === id).map((record) => record.item).sort();
  assert.deepEqual(items, [a, b].sort());
});

registry.define(/^milestone "([^"]+)" declares finding "([^"]+)" in "([^"]+)" with Stage "([^"]*)" and status "([^"]*)"$/, async (context, ref, id, file, stage, status) => {
  await declareFinding(context, ref, file, { id, stage, status });
});

registry.define(/^the record for "([^"]+)" has stage "([^"]*)" and status "([^"]*)"$/, (context, id, stage, status) => {
  const record = of(context, "finding").find((entry) => entry.id === id);
  assert.ok(record, `a finding record for ${id}`);
  assert.equal(record.stage, stage);
  assert.equal(record.status, status);
});

// ------------------------------------------------------------------ R2 · feedback ----

registry.define(/^milestone "([^"]+)" has a FEEDBACK\.ndjson holding 2 raw rows, 1 classification row and 3 recall rows$/, async (context, ref) => {
  context.raw = [rawRow("r1", "the board showed a stale status", "qa"), rawRow("r2", "line one\nline two of a note", "developer")];
  await writeLedger(context, ref, [context.raw[0], classificationRow("c1", "r1"), context.raw[1], recallRow("k1"), recallRow("k2"), recallRow("k3")]);
});

registry.define(/^item "([^"]+)" has exactly (\d+) feedback records$/, (context, ref, count) => {
  context.feedback = of(context, "feedback", ref);
  assert.equal(context.feedback.length, Number(count));
});

registry.define("each holds its raw row's text verbatim and its actor as owner", (context) => {
  for (const row of context.raw) {
    const record = context.feedback.find((entry) => entry.id === row.id);
    assert.ok(record?.text.includes(row.text), `record ${row.id} holds its text verbatim`);
    assert.equal(record.owner, row.actor);
  }
});

registry.define("each has an empty stage and an empty status", (context) => {
  for (const record of context.feedback) {
    assert.equal(record.stage, "");
    assert.equal(record.status, "");
  }
});

registry.define(/^milestone "([^"]+)" has a FEEDBACK\.ndjson whose line 3 is blank and whose line 4 is a raw row$/, async (context, ref) => {
  await writeLedger(context, ref, [rawRow("r1", "one"), rawRow("r2", "two"), "", rawRow("r4", "four")]);
  context.subjectFeedback = "r4";
});

registry.define(/^that row's feedback record has a source ending "([^"]+)"$/, (context, suffix) => {
  const record = of(context, "feedback").find((entry) => entry.id === context.subjectFeedback);
  assert.ok(record?.source.endsWith(suffix), `source ${record?.source} ends ${suffix}`);
});

registry.define(/^milestone "([^"]+)" has a FEEDBACK\.ndjson whose line 2 is not JSON$/, async (context, ref) => {
  await writeLedger(context, ref, [rawRow("r1", "one"), "{ this is not json", rawRow("r3", "three")]);
});

registry.define("the feedback reader's existing diagnostic for line 2 is reported", async (context) => {
  const logged = [];
  for (const root of [context.globalDir, context.dataDir]) {
    try {
      for (const [, bytes] of await treeBytes(root)) logged.push(bytes.toString("utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  assert.ok(logged.some((text) => text.includes("Feedback record line 2 is invalid")), "the reader's line-2 diagnostic reached the degrade log");
});

registry.define("no feedback record cites line 2", (context) => {
  assert.deepEqual(of(context, "feedback").filter((record) => /:2#$/.test(record.source)), []);
});

// ------------------------------------------------------------------ R3 · runs ----

registry.define(/^milestone "([^"]+)" has a run record in state "([^"]+)"$/, async (context, ref, state) => {
  await writeRun(context, ref, { state });
});

registry.define(/^item "([^"]+)" has (\d+) run record\(s\)$/, (context, ref, count) => {
  assert.equal(of(context, "run", ref).length, Number(count));
});

registry.define(/^story "([^"]+)" has a failed run, attempt 2, retryOf its attempt-1 run, phase "([^"]+)" and failureReason "([^"]+)"$/, async (context, ref, phase, failureReason) => {
  const first = await writeRun(context, ref, { state: "failed", phase, failureReason: "runtime_offline" });
  context.retryOf = first;
  await writeRun(context, ref, { state: "failed", attempt: 2, retryOf: first, phase, failureReason });
});

registry.define(/^its run record has stage "([^"]*)" and status "([^"]*)"$/, (context, stage, status) => {
  const run = theRun(context);
  assert.equal(run.stage, stage);
  assert.equal(run.status, status);
});

registry.define(/^its summary holds "([^"]+)"$/, (context, text) => {
  assert.ok(theRun(context).summary.includes(text), `summary holds ${text}`);
});

registry.define("its text holds its attempt and its retryOf run id", (context) => {
  const { text } = theRun(context);
  assert.ok(text.includes("attempt: 2"), text);
  assert.ok(text.includes(context.retryOf), text);
});

registry.define(/^milestone "([^"]+)" has a done run whose loop phase is "([^"]*)"$/, async (context, ref, phase) => {
  await writeRun(context, ref, { state: "done", phase: phase || null });
});

registry.define(/^its run record has stage "([^"]*)"$/, (context, stage) => {
  assert.equal(theRun(context).stage, stage);
});

registry.define(/^(?:milestone|story) "([^"]+)" has a (done|failed) run for session "([^"]+)"$/, async (context, ref, state, sessionId) => {
  await writeRun(context, ref, { state, sessionId });
});

registry.define(/^the milestone's latest observability snapshot has no agent with sessionId "([^"]+)" attributed to "([^"]+)"$/, async (context, sessionId, ref) => {
  await writeSnapshot(context, ref, [agent("s-other", ref, [stall(1000)]), agent(sessionId, `${ref}/07`, [])]);
});

registry.define(/^the latest snapshot's agent with sessionId "([^"]+)" attributed to "([^"]+)" has an empty stalls array$/, async (context, sessionId, ref) => {
  await writeSnapshot(context, ref, [agent(sessionId, ref, [])]);
});

registry.define(/^the parent milestone snapshot's agent with sessionId "([^"]+)" is attributed to "([^"]+)" and records 2 stalls$/, async (context, sessionId, attributedTo) => {
  await writeSnapshot(context, attributedTo.split("/")[0], [agent(sessionId, attributedTo, [stall(600000), stall(900000)])]);
});

registry.define("the run record's text reports stalls unavailable", (context) => {
  assert.match(theRun(context).text, /stalls: unavailable/);
});

registry.define("it never reports zero stalls", (context) => {
  assert.doesNotMatch(theRun(context).text, /stalls: 0\b/);
});

registry.define("the run record's text reports zero stalls", (context) => {
  assert.match(theRun(context).text, /stalls: 0\b/);
});

registry.define(/^the run record for "([^"]+)" reports stalls unavailable$/, (context, ref) => {
  const run = theRun(context);
  assert.equal(run.item, ref);
  assert.match(run.text, /stalls: unavailable/);
});

// ------------------------------------------------------------------ R4 · resolution ----

registry.define(/^milestone "([^"]+)" has a failed run record at "[^"]+\/runs\/([^/]+)\/([^/"]+)\.json"$/, async (context, ref, node, runId) => {
  await writeRun(context, ref, { state: "failed", runId, node, failureReason: "runtime_offline" });
});

registry.define("its run record's source is resolved", async (context) => {
  await ingest(context);
  context.subject = theRun(context);
  context.resolved = indexing.resolveRecordSourcePath(context.subject, resolveCtx(context));
});

registry.define(/^the source ends "([^"]+)"$/, (context, suffix) => {
  assert.ok(context.subject.source.endsWith(suffix), `${context.subject.source} ends ${suffix}`);
});

registry.define(/^the resolver answers that path with pointer "" and line null$/, (context) => {
  assert.equal(context.resolved.path, context.subject.source.slice(0, -1));
  assert.equal(context.resolved.pointer, "");
  assert.equal(context.resolved.line, null);
});

registry.define("the value at that pointer is the run record's root object", async (context) => {
  const value = await indexing.readRecordSourceValue(context.subject, resolveCtx(context));
  assert.deepEqual(value, JSON.parse(await readFile(context.resolved.absPath, "utf8")));
});

registry.define(/^an? (?:episodic|lesson) record(?: of type "([^"]+)")? with source "([^"]+)"$/, async (context, type, source) => {
  await ensureWorkStream(context);
  context.subject = { recordType: type ?? "lesson", id: "x", item: "39", source };
  if (source.includes("link-out")) {
    const outside = path.join(context.root, "outside");
    await mkdir(outside, { recursive: true });
    await writeFile(path.join(outside, "run.json"), "{}\n", "utf8");
    const { dir } = await item(context, "39");
    await symlink(outside, path.join(dir, "link-out"), "junction");
  }
});

registry.define("the source is resolved", (context) => {
  try {
    context.resolved = indexing.resolveRecordSourcePath(context.subject, resolveCtx(context));
    context.refusal = null;
  } catch (error) {
    context.resolved = null;
    context.refusal = error;
  }
});

registry.define(/^the resolver answers path "([^"]+)", line "([^"]+)" and pointer "([^"]*)"$/, (context, rel, line, pointer) => {
  assert.equal(context.refusal, null, `resolved without refusal (${context.refusal?.message})`);
  assert.equal(context.resolved.path, rel);
  assert.equal(context.resolved.line, line === "null" ? null : Number(line));
  if (pointer === "") assert.equal("pointer" in context.resolved, false, "a Markdown locator carries no pointer");
  else assert.equal(context.resolved.pointer, pointer === "(empty)" ? "" : pointer);
});

registry.define("the resolver's path, line and absPath are those it answered before this change", (context) => {
  // The pre-157 algorithm, verbatim: split at the last colon, resolve against the work dir.
  const source = context.subject.source;
  const at = source.lastIndexOf(":");
  const rel = source.slice(0, at);
  assert.deepEqual(context.resolved, { path: rel, line: Number.parseInt(source.slice(at + 1), 10), absPath: path.resolve(workDir(context), rel) });
});

registry.define("it carries no pointer", (context) => {
  assert.equal("pointer" in context.resolved, false);
});

registry.define("it is refused and no file is opened", async (context) => {
  assert.equal(context.refusal?.code, indexing.SOURCE_REFUSED, `refused with ${indexing.SOURCE_REFUSED} (got ${context.refusal?.code ?? "an answer"})`);
  // The value reader refuses before it reads: a refusal, never a read error or a value.
  await assert.rejects(indexing.readRecordSourceValue(context.subject, resolveCtx(context)), (error) => error.code === indexing.SOURCE_REFUSED);
});

// ------------------------------------------------------------------ index version ----

const LEGACY_LESSON = {
  recordType: "lesson", id: "R1", item: "39", itemSlug: "x", title: "a stale store still answers recall", area: "tooling", stage: "build",
  kind: "near-miss", owner: "developer", status: "", tags: [], summary: "a stale store still answers", text: "a stale store still answers recall", source: "39_milestone_x/RETROSPECTIVE.md:3",
};

registry.define(/^a local store and a graphify store each written at index version (\d+)$/, async (context, version) => {
  await item(context, "39");
  for (const backend of ["local", "graphify"]) {
    const store = { backend, version: Number(version), generatedAt: "2026-10-01T00:00:00.000Z", workDir: workDir(context), recordCount: 1, records: [LEGACY_LESSON] };
    await writeFile(path.join(context.projectDir, STORE[backend]), `${JSON.stringify(store, null, 2)}\n`, "utf8");
  }
});

async function statusOf(context, backend) {
  await setBackend(context, backend);
  const result = cli(context, "work memory status --json");
  assert.equal(result.status, 0, `status exits 0 (stderr: ${result.stderr})`);
  return JSON.parse(result.stdout);
}

registry.define(/^"aof work memory status --json" runs$/, async (context) => {
  context.statuses = { local: await statusOf(context, "local"), graphify: await statusOf(context, "graphify") };
});

registry.define(/^each reports its index stale against version (\d+)$/, (context, current) => {
  for (const [backend, status] of Object.entries(context.statuses)) {
    assert.deepEqual(status.index, { version: 2, current: Number(current), stale: true }, `${backend} reports stale`);
  }
});

registry.define("recall over each still answers from the existing records", async (context) => {
  for (const backend of ["local", "graphify"]) {
    await setBackend(context, backend);
    const result = cli(context, 'work memory recall "stale store" --json');
    assert.equal(result.status, 0, `${backend} recall exits 0 (stderr: ${result.stderr})`);
    assert.deepEqual(JSON.parse(result.stdout).map((record) => record.id), ["R1"], `${backend} recall answers from the version-2 store`);
  }
});

registry.define(/^after "aof work memory ingest" each reports version (\d+) and fresh$/, async (context, version) => {
  for (const backend of ["local", "graphify"]) {
    await ingest(context, backend);
    const status = await statusOf(context, backend);
    assert.deepEqual(status.index, { version: Number(version), current: Number(version), stale: false }, `${backend} is fresh after ingest`);
  }
});

// ------------------------------------------------------------------ parity and read-only ----

registry.define(/^the stream holds findings, raw feedback and terminal runs on items "39", "39\/02" and "41"$/, fullStream);
registry.define("the stream holds findings, raw feedback, run records and an observability snapshot", fullStream);

const identities = (records) => records.filter((record) => EPISODIC.includes(record.recordType)).map((record) => `${record.item}|${record.recordType}|${record.id}`).sort();

registry.define(/^ingest runs once with backend "local" and once with backend "graphify"$/, async (context) => {
  await ingest(context, "local");
  context.localRecords = context.records;
  await ingest(context, "graphify");
  context.graphifyRecords = context.records;
});

registry.define("both stores hold the same set of (item, recordType, id) for types finding, feedback and run", (context) => {
  const local = identities(context.localRecords);
  assert.ok(EPISODIC.every((type) => local.some((identity) => identity.includes(`|${type}|`))), `every episodic type is present: ${local}`);
  assert.deepEqual(identities(context.graphifyRecords), local);
});

registry.define("every one of those records' sources resolves", async (context) => {
  for (const record of [...context.localRecords, ...context.graphifyRecords].filter((entry) => EPISODIC.includes(entry.recordType))) {
    const value = await indexing.readRecordSourceValue(record, resolveCtx(context));
    assert.notEqual(value, undefined, `${record.recordType} ${record.id} resolves (${record.source})`);
  }
});

registry.define("ingest runs twice", async (context) => {
  context.before = await treeBytes(workDir(context));
  await ingest(context);
  await ingest(context);
});

registry.define("every VERIFICATION.md, SESSION.md, FEEDBACK.ndjson, run record and snapshot is byte-identical to before", async (context) => {
  const after = await treeBytes(workDir(context));
  assert.deepEqual([...after.keys()].sort(), [...context.before.keys()].sort(), "ingest added or removed no file under the work tree");
  for (const [file, bytes] of context.before) assert.ok(bytes.equals(after.get(file)), `${file} is byte-identical`);
  for (const name of ["VERIFICATION.md", "SESSION.md", "FEEDBACK.ndjson", "agents.json"]) {
    assert.ok([...context.before.keys()].some((file) => file.endsWith(name)), `the stream held a ${name}`);
  }
  assert.ok([...context.before.keys()].some((file) => file.includes(`runs${path.sep}`)), "the stream held run records");
});

// ══════════════════════════════════ 157/02 · every consumer accounts for the episodic pool ════

const CORPUS_LANES = defaultApplication.work.tune.corpus.CORPUS_LANES;
const assembleCorpus = defaultApplication.work.tune.corpus.assembleCorpus;
const LEGACY_COUNTERS = ["lessons", "adrs", "summaries", "capabilities", "gaps", "findings", "feedback", "runs"];

const lessonDoc = (id, title, area = "architecture") => [
  `## ${id} — ${title}`,
  "",
  `- **Kind:** near-miss · **Area:** ${area} · **Stage:** build · **Owner:** developer`,
  `- **What happened:** ${title.toLowerCase()} during the build.`,
  "- **Why:** the reader cached it.",
  `- **Lesson:** read ${id} from its source every time.`,
  "",
];

// Task 00's fixture: 2 architecture lessons, 3 findings, 2 raw feedback rows and 3 terminal runs on
// milestone 39 — 10 records. Task 01's adds 4 findings, so 39 holds 12 delivery records.
async function consumerFixture(context, { extraFindings = 0 } = {}) {
  await writeDoc(context, "39", "RETROSPECTIVE.md", ["# 39 · Retrospective", "", ...lessonDoc("R1", "The cap was read once at start"), ...lessonDoc("R2", "The board trusted a stale projection")]);
  const findings = Array.from({ length: 3 + extraFindings }, (_, i) => `| F-0${i + 1} | minor | open | finding ${i + 1} |`);
  await writeDoc(context, "39", "VERIFICATION.md", ["# 39", "", "## Findings", "", "| id | severity | status | finding |", "|----|----------|--------|---------|", ...findings]);
  await writeLedger(context, "39", [rawRow("r1", "the board lied"), classificationRow("c1", "r1"), rawRow("r2", "a second note")]);
  await writeRun(context, "39", { state: "done", phase: "refine" });
  await writeRun(context, "39", { state: "cancelled" });
  await writeRun(context, "39", { state: "failed", phase: "continue", failureReason: "cap-exhausted" });
}

function runJson(context, command) {
  const result = cli(context, command);
  assert.equal(result.status, 0, `${command} exits 0 (stderr: ${result.stderr})`);
  return result;
}

registry.define(/^the 157\/02 (status|recall) fixture( is ingested)?$/, async (context, which, ingested) => {
  await consumerFixture(context, { extraFindings: which === "recall" ? 4 : 0 });
  if (ingested) await ingest(context);
});

registry.define(/^"aof work memory status --json" runs over the ingested store$/, (context) => {
  context.status = JSON.parse(runJson(context, "work memory status --json").stdout);
});

registry.define(/^"aof work memory status --json" runs once with backend "local" and once with backend "graphify", each after its own ingest$/, async (context) => {
  context.statuses = {};
  for (const backend of ["local", "graphify"]) {
    await ingest(context, backend);
    context.statuses[backend] = JSON.parse(runJson(context, "work memory status --json").stdout);
  }
});

registry.define(/^"aof work memory status --json" runs with backend "none"$/, async (context) => {
  await setBackend(context, "none");
  context.status = JSON.parse(runJson(context, "work memory status --json").stdout);
});

registry.define(/^its "types" holds finding (\d+), feedback (\d+) and run (\d+), each with layer "([^"]+)"$/, (context, finding, feedback, run, layer) => {
  const { types } = context.status;
  assert.deepEqual([types.finding, types.feedback, types.run], [finding, feedback, run].map((count) => ({ count: Number(count), layer })));
});

registry.define(/^its "layers" is (\{.+\})$/, (context, layers) => {
  assert.deepEqual(context.status.layers, JSON.parse(layers));
});

registry.define(/^no type is reported with layer "unmapped"$/, (context) => {
  assert.deepEqual(Object.entries(context.status.types).filter(([, entry]) => entry.layer === "unmapped"), []);
  assert.equal("unmapped" in context.status.layers, false);
});

registry.define(/^its legacy counters "findings", "feedback" and "runs" read (\d+), (\d+) and (\d+)$/, (context, findings, feedback, runs) => {
  assert.deepEqual([context.status.findings, context.status.feedback, context.status.runs], [findings, feedback, runs].map(Number));
});

registry.define(/^its legacy counters sum to its "recordCount" of (\d+)$/, (context, total) => {
  assert.equal(context.status.recordCount, Number(total));
  assert.equal(LEGACY_COUNTERS.reduce((sum, key) => sum + context.status[key], 0), Number(total));
});

registry.define(/^both carry the same "types" and the same "layers"$/, (context) => {
  assert.deepEqual(context.statuses.graphify.types, context.statuses.local.types);
  assert.deepEqual(context.statuses.graphify.layers, context.statuses.local.layers);
});

registry.define(/^graphify's legacy "lessons" and "adrs" still read (\d+) and (\d+)$/, (context, lessons, adrs) => {
  assert.deepEqual([context.statuses.graphify.lessons, context.statuses.graphify.adrs], [Number(lessons), Number(adrs)]);
});

registry.define(/^its "types" is \{\} and every "layers" count is 0$/, (context) => {
  assert.deepEqual(context.status.types, {});
  assert.ok(Object.values(context.status.layers).every((count) => count === 0), JSON.stringify(context.status.layers));
});

registry.define(/^it returns (\d+) records$/, (context, count) => {
  assert.equal(context.recalled.length, Number(count));
});

registry.define(/^each carries the frozen record fields plus "score"$/, (context) => {
  const fields = [...MEMORY_RECORD_FIELDS, "score"].sort();
  for (const record of context.recalled) assert.deepEqual(Object.keys(record).sort(), fields);
});

registry.define(/^the run's line holds "([^"]+)", its kind, its area and its tags$/, (context, reason) => {
  const line = context.output.split("\n").find((entry) => entry.includes(reason));
  assert.ok(line, `a block line holds ${reason}: ${context.output}`);
  const run = context.records.find((record) => record.recordType === "run" && line.startsWith(`${record.id} `));
  assert.ok(run, "the line is the failed run's");
  assert.ok(line.includes(` · ${run.kind} · ${run.area} · `), line);
  if (run.tags.length > 0) assert.ok(line.includes(`[${run.tags.join("; ")}]`), line);
  else assert.ok(!line.includes(" · ["), "an untagged run carries no tags field");
  context.line = line;
  context.subject = run;
});

registry.define(/^the line's last field is its source$/, (context) => {
  assert.ok(context.line.endsWith(` · ${context.subject.source}`), context.line);
});

registry.define(/^the whole stream is rebuilt exactly as before this change$/, async (context) => {
  const before = context.records;
  context.records = (await readStore(context, "local")).records;
  assert.deepEqual(context.records, before, "--all rebuilds the same whole-stream record set as a bare ingest");
});

const lowFloors = () => CORPUS_LANES.map((entry) => Object.freeze({ ...entry, floor: 1 }));

registry.define(/^the stream's tune corpus is assembled with no memory index$/, async (context) => {
  await setBackend(context, "local");
  context.corpus = JSON.stringify(await assembleCorpus({ cwd: context.projectDir, lanes: lowFloors() }));
});

registry.define(/^the memory index is ingested with 3 findings, 2 feedback and 3 runs and the corpus is assembled again$/, async (context) => {
  await ingest(context);
  assert.deepEqual(["finding", "feedback", "run"].map((type) => of(context, type).length), [3, 2, 3], "non-vacuity: the index holds the episodic copies");
  context.corpusAfter = JSON.stringify(await assembleCorpus({ cwd: context.projectDir, lanes: lowFloors() }));
});

registry.define(/^its lesson population, lineage counts and recall accounting are equal to the first assembly$/, (context) => {
  assert.equal(context.corpusAfter, context.corpus);
});

// The block line as it was rendered before 157 — the formula verbatim.
const legacyLine = (record) => `${record.id} (m${record.item}) · ${record.kind || record.recordType} · ${record.area} · ${record.title}${record.tags.length ? ` · [${record.tags.join("; ")}]` : ""} · ${record.source}`;

registry.define(/^a lesson "([^"]+)" on milestone "([^"]+)" and its block line rendered before this change$/, (context, id, ref) => {
  context.subject = context.records.find((record) => record.recordType === "lesson" && record.id === id && record.item === ref);
  assert.ok(context.subject, `lesson ${ref}/${id} is indexed`);
  context.line = legacyLine(context.subject);
});

registry.define(/^the lesson's line is byte-identical to the line rendered before$/, (context) => {
  assert.ok(context.output.split("\n").includes(context.line), `${context.line}\nin\n${context.output}`);
});

registry.define(/^a finding on milestone "([^"]+)" whose text repeats lesson "([^/]+)\/([^"]+)" word for word$/, async (context, ref, lessonItem, lessonId) => {
  await ingest(context);
  const lesson = context.records.find((record) => record.recordType === "lesson" && record.item === lessonItem && record.id === lessonId);
  context.thatText = lesson.text.replace(/\s+/g, " ").trim();
  await writeDoc(context, ref, "VERIFICATION.md", ["# 41", "", "## Findings", "", "| id | severity | finding |", "|----|----------|---------|", `| F-01 | minor | ${context.thatText} |`]);
  await ingest(context);
  assert.ok(of(context, "finding", ref).some((record) => record.text.includes(context.thatText)), "non-vacuity: the finding repeats the lesson");
});

registry.define(/^it matches "([^"]+)" and no finding record$/, (context, ref) => {
  const result = JSON.parse(context.stdout);
  assert.equal(result.qualifying, ref);
  assert.ok(result.candidates.every((candidate) => /\/R\d+$/.test(candidate.ref)), JSON.stringify(result.candidates));
});

// The generic door: one CLI invocation, quoted placeholders filled from the scenario, its output
// kept as text and, for --json, parsed. Registered LAST so every narrower "… runs" step wins.
registry.define(/^"aof (.+)" runs$/, (context, raw) => {
  const command = raw
    .replace(/\\"/g, '"')
    .replace("<the lesson's title>", context.subject?.title ?? "")
    .replace("<that text>", context.thatText ?? "");
  const result = runJson(context, command);
  context.stdout = result.stdout;
  context.output = result.stdout;
  if (/--json\b/.test(command) && /\brecall\b/.test(command)) context.recalled = JSON.parse(result.stdout);
});

export async function runStep(context, step) {
  return registry.run(context, step);
}
