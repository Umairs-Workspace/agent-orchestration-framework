// Steps for memory-recall-ledger.feature (153/01). Everything here drives the REAL CLI —
// `aof work memory record-recall <ref> --input <file>` — over a fixture work stream, and reads the
// result back from the item's own FEEDBACK.ndjson (the evidence) and the global effects journal
// (the publication). The runner resolves this module by convention from the feature's basename.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createStepRegistry } from "../support/step-registry.mjs";
import { registerCommonSteps } from "../support/common-steps.mjs";
import { cliPath, runCli } from "../support/cli-context.mjs";
import { ensureWorkStream, workDir, writeMilestone, writeStory } from "../support/work-stream-fixture.mjs";
import { appendRawFeedback, readFeedbackRecords, recordFeedbackClassification } from "@aof/work/feedback-records";

const registry = createStepRegistry();
registerCommonSteps(registry);

const EDGE_BY_ACTOR = { architect: "refine-architect", "product-owner": "refine-po" };
const LEDGER = "FEEDBACK.ndjson";

// ------------------------------------------------------------------ fixtures ----

async function ensureMilestone(context, number) {
  await ensureWorkStream(context);
  if (!context.items.has(number)) await writeMilestone(context, { number, slug: "memory", title: "Memory" });
  return context.items.get(number);
}

function ledgerPath(context, ref) {
  const item = context.items.get(ref);
  assert.ok(item, `item "${ref}" was scaffolded`);
  return path.join(item.dir, LEDGER);
}

async function readLedger(context, ref) {
  try {
    return await readFile(ledgerPath(context, ref), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}

// Every file under the work tree, by relative path → bytes. "No file has changed" means this
// map is equal before and after — including files that must not APPEAR (a lock, a STATE.md).
async function treeSnapshot(root) {
  const snapshot = new Map();
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else snapshot.set(path.relative(root, full), await readFile(full, "utf8"));
    }
  }
  await walk(root);
  return snapshot;
}

const RAW_ROW = { kind: "raw", id: "raw-1", text: "an earlier note", actor: "qa", refs: "", at: "2026-10-10T11:00:00Z" };

registry.define(/^a local item "([^"]+)" with an existing raw feedback row$/, async (context, ref) => {
  const item = await ensureMilestone(context, ref);
  await writeFile(path.join(item.dir, LEDGER), `${JSON.stringify(RAW_ROW)}\n`, "utf8");
});

registry.define(/^memory is off and item "([^"]+)" is local$/, async (context, ref) => {
  await ensureMilestone(context, ref);
  const config = JSON.parse(await readFile(path.join(context.projectDir, ".aof", "aof.config.json"), "utf8"));
  assert.equal(config.memory, undefined, "no memory backend is declared — memory is off");
});

registry.define(/^a local backlog spike "([^"]+)"$/, async (context, slug) => {
  await ensureWorkStream(context);
  const dir = path.join(workDir(context), "backlog", `spike_${slug}`);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "SPIKE.md"),
    `---\ntype: spike\nslug: ${slug}\nstatus: not-started\ntitle: "Probe"\ncreated: 2026-06-19\nupdated: 2026-06-19\n---\n# Probe\n`,
    "utf8",
  );
  context.items.set(slug, { ref: slug, dir, type: "spike" });
});

registry.define(/^a local story "([^"]+)\/([^"]+)"$/, async (context, parent, number) => {
  await ensureMilestone(context, parent);
  await writeStory(context, { parent, number, slug: "recalls", title: "Recalls" });
});

// ------------------------------------------------------- the retained observation ----

function parseVerdicts(list) {
  return [...list.matchAll(/"([^"=]+)\/([^"=]+)=([^"]*)"/g)].map(([, item, id, verdict]) => {
    const record = { item, id, recordType: "lesson" };
    if (verdict !== "") record.verdict = verdict;
    return record;
  });
}

function retain(context, { actor, id, at, query, scope, records }) {
  const scopeObject = {};
  for (const pair of scope.split(",").map((entry) => entry.trim()).filter(Boolean)) {
    const [key, ...rest] = pair.split("=");
    scopeObject[key] = rest.join("=");
  }
  context.observation = { id, at, edge: EDGE_BY_ACTOR[actor], actor, query, scope: scopeObject, records };
}

registry.define(
  /^the ([a-z-]+) retained recall "([^"]+)" at "([^"]+)" for query "([^"]*)" with scope "([^"]*)" returning (nothing|.+)$/,
  (context, actor, id, at, query, scope, returned) => {
    retain(context, { actor, id, at, query, scope, records: returned === "nothing" ? [] : parseVerdicts(returned) });
  },
);

registry.define(/^a valid two-record observation "([^"]+)"$/, (context, id) => {
  retain(context, {
    actor: "architect", id, at: "2026-10-10T12:00:00Z", query: "junction cleanup", scope: "area=architecture",
    records: parseVerdicts('"45/R13=honoured" and "68/R10=departed"'),
  });
});

const DEFECTS = {
  "duplicate returned identity": (o) => { o.records = [o.records[0], { ...o.records[0] }]; },
  "verdict accepted": (o) => { o.records[0].verdict = "accepted"; },
  "blank actor": (o) => { o.actor = "   "; },
  "blank edge": (o) => { o.edge = ""; },
  "invalid capture instant": (o) => { o.at = "yesterday"; },
  "unknown top-level field": (o) => { o.verdictSummary = "all honoured"; },
  "missing record type": (o) => { delete o.records[0].recordType; },
};

registry.define(/^a valid two-record observation is changed to contain "([^"]+)"$/, (context, defect) => {
  retain(context, {
    actor: "architect", id: "c1", at: "2026-10-10T12:00:00Z", query: "junction cleanup", scope: "area=architecture",
    records: parseVerdicts('"45/R13=honoured" and "68/R10=departed"'),
  });
  assert.ok(DEFECTS[defect], `a defect named "${defect}" is defined`);
  DEFECTS[defect](context.observation);
});

registry.define(/^the observation's verdict for "([^"]+)\/([^"]+)" is changed to "([^"]+)"$/, (context, item, id, verdict) => {
  const record = context.observation.records.find((entry) => entry.item === item && entry.id === id);
  assert.ok(record, `${item}/${id} is in the observation`);
  record.verdict = verdict;
});

// ------------------------------------------------------------------ submission ----

async function writeObservationFile(context) {
  const file = path.join(context.root, "observation.json");
  await writeFile(file, `${JSON.stringify(context.observation, null, 2)}\n`, "utf8");
  return file;
}

registry.define(/^the observation is submitted to item "([^"]+)"$/, async (context, ref) => {
  await ensureWorkStream(context);
  const file = await writeObservationFile(context);
  context.beforeTree = await treeSnapshot(workDir(context));
  context.beforeLedger = context.items.has(ref) ? await readLedger(context, ref) : "";
  context.lastResult = await runCli(context, `work memory record-recall ${ref} --input "${file}" --json`);
});

// A concurrent pair needs two real processes at once; the shared runCli is synchronous.
function spawnCliAsync(context, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["--no-warnings", cliPath, ...args], {
      cwd: context.projectDir,
      env: { ...process.env, AOF_DATA_DIR: context.dataDir, AOF_GLOBAL_HOME: context.globalDir, NODE_NO_WARNINGS: "1" },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

registry.define(/^two same-item submissions of that exact observation run concurrently to item "([^"]+)"$/, async (context, ref) => {
  const file = await writeObservationFile(context);
  const args = ["work", "memory", "record-recall", ref, "--input", file, "--json"];
  context.concurrent = await Promise.all([spawnCliAsync(context, args), spawnCliAsync(context, args)]);
});

registry.define(/^a caller supplies a verdict to the existing work feedback command for item "([^"]+)"$/, async (context, ref) => {
  context.beforeTree = await treeSnapshot(workDir(context));
  context.lastResult = await runCli(context, `work feedback ${ref} --note "late note" --verdict honoured --json`);
});

registry.define(/^counters reads item "([^"]+)"$/, async (context, ref) => {
  context.lastResult = await runCli(context, `work counters ${ref} --json`);
  assert.equal(context.lastResult.status, 0, `work counters exits 0 (stderr: ${context.lastResult.stderr})`);
});

// ------------------------------------------------------------------- ledgers ----

registry.define(/^an accepted item "([^"]+)" whose ledger holds 2 raw, 1 classification and 3 recall rows$/, async (context, ref) => {
  await writeMilestone(context, { number: ref, slug: "memory", title: "Memory", status: "done" });
  const item = context.items.get(ref);
  // Acceptance is the SPEC's `updated:` instant; the raw rows below post-date it.
  const spec = path.join(item.dir, "SPEC.md");
  await writeFile(spec, (await readFile(spec, "utf8")).replace("updated: 2026-06-19", "updated: 2026-10-01T00:00:00Z"), "utf8");
  await appendRawFeedback(item, { id: "raw-1", text: "first", actor: "qa", refs: "", at: "2026-10-05T00:00:00Z" });
  await appendRawFeedback(item, { id: "raw-2", text: "second", actor: "qa", refs: "", at: "2026-10-06T00:00:00Z" });
  await recordFeedbackClassification(item, { id: "triage-1", raw: "raw-1", at: "2026-10-07T00:00:00Z", classification: { kind: "bug" } });
  const base = { edge: "refine-architect", actor: "architect", query: "q", scope: {}, records: [{ item: "45", id: "R13", recordType: "lesson", verdict: "honoured" }] };
  for (const id of ["c1", "c2", "c3"]) {
    retain(context, { actor: "architect", id, at: "2026-10-08T00:00:00Z", query: base.query, scope: "", records: base.records });
    const file = await writeObservationFile(context);
    const result = await runCli(context, `work memory record-recall ${ref} --input "${file}" --json`);
    assert.equal(result.status, 0, `recall ${id} recorded (stderr: ${result.stderr})`);
  }
  context.ledgerBeforeTriage = await readLedger(context, ref);
  assert.equal((await readFeedbackRecords(item)).length, 6);
});

// ----------------------------------------------------------------- assertions ----

function lastJson(context) {
  return JSON.parse(context.lastResult.stdout);
}

registry.define(/^the diagnostic mentions "(.+)"$/, (context, text) => {
  const raw = context.lastResult.stdout + context.lastResult.stderr;
  const expected = text.replace(/\\"/g, '"');
  assert.ok(raw.includes(expected) || JSON.parse(context.lastResult.stdout || "{}").error?.includes(expected), `the diagnostic mentions ${expected} (got: ${raw.slice(0, 400)})`);
});

registry.define(/^no file under the work tree has changed$/, async (context) => {
  assert.deepEqual(await treeSnapshot(workDir(context)), context.beforeTree, "every file under the work tree is byte-identical, and none appeared");
});

registry.define(/^no other item's files changed$/, async (context) => {
  const after = await treeSnapshot(workDir(context));
  const changed = [...new Set([...context.beforeTree.keys(), ...after.keys()])].filter((file) => context.beforeTree.get(file) !== after.get(file));
  assert.ok(changed.every((file) => path.basename(file) === LEDGER), `only a ledger changed (changed: ${changed.join(", ")})`);
  assert.equal(changed.length, 1, `exactly one ledger changed (changed: ${changed.join(", ")})`);
});

registry.define(
  /^exactly one new row of kind "recall" with id "([^"]+)", actor "([^"]+)" and edge "([^"]+)" was appended to item "([^"]+)"$/,
  async (context, id, actor, edge, ref) => {
    const rows = (await readLedger(context, ref)).split("\n").filter(Boolean).map((line) => JSON.parse(line));
    const added = rows.slice((context.beforeLedger ?? "").split("\n").filter(Boolean).length);
    assert.equal(added.length, 1, "exactly one row was appended");
    assert.deepEqual([added[0].kind, added[0].id, added[0].actor, added[0].edge], ["recall", id, actor, edge]);
    context.addedRow = added[0];
  },
);

registry.define(/^that row equals the retained observation$/, (context) => {
  assert.deepEqual(context.addedRow, { kind: "recall", ...context.observation }, "query, scope, instant, identities and verdicts are the retained ones");
});

registry.define(/^that row has an empty records array$/, (context) => {
  assert.deepEqual(context.addedRow.records, []);
  assert.equal(context.addedRow.query, context.observation.query);
});

registry.define(/^the existing ledger bytes of item "([^"]+)" remain an unchanged prefix$/, async (context, ref) => {
  assert.ok((await readLedger(context, ref)).startsWith(context.beforeLedger), "the prior ledger is an unchanged prefix");
});

registry.define(/^the ledger is byte-identical to its content before this submission$/, async (context) => {
  const ref = "153";
  assert.equal(await readLedger(context, ref), context.beforeLedger);
});

registry.define(/^no retrieval index exists anywhere$/, async (context) => {
  for (const root of [context.projectDir, context.globalDir, context.dataDir]) {
    const offenders = [];
    async function walk(dir) {
      let entries;
      try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (/memory/i.test(entry.name) && !full.includes(`${path.sep}wiki${path.sep}`)) offenders.push(full);
        if (entry.isDirectory()) await walk(full);
      }
    }
    await walk(root);
    assert.deepEqual(offenders, [], `no memory index or store under ${root}`);
  }
});

registry.define(/^both submissions succeed and name recall "([^"]+)"$/, (context, id) => {
  for (const result of context.concurrent) {
    assert.equal(result.status, 0, `submission exits 0 (stderr: ${result.stderr})`);
    assert.equal(JSON.parse(result.stdout).id, id);
  }
});

registry.define(/^the ledger of item "([^"]+)" contains exactly one "([^"]+)" row$/, async (context, ref, id) => {
  const rows = (await readLedger(context, ref)).split("\n").filter(Boolean).map((line) => JSON.parse(line));
  assert.equal(rows.filter((row) => row.id === id).length, 1);
});

registry.define(/^exactly one of the two submissions wrote and the other reported a replay$/, (context) => {
  const replayed = context.concurrent.map((result) => JSON.parse(result.stdout).replayed);
  assert.deepEqual([...replayed].sort(), [false, true]);
});

registry.define(/^the raw feedback denominator is 2$/, (context) => {
  const escape = lastJson(context).escape;
  assert.equal(escape.status, "measured");
  assert.equal(escape.feedbackRecords, 2, "two raw rows — not the classification, not the three recalls");
  assert.equal(escape.count, 2, "both raw rows post-date acceptance; the recall rows are never escapes");
});

registry.define(/^later triage classifies one raw row and the classification references it$/, async (context) => {
  const item = context.items.get("153");
  const record = await recordFeedbackClassification(item, { id: "triage-2", raw: "raw-2", at: "2026-10-09T00:00:00Z", classification: { kind: "note" } });
  assert.equal(record.raw, "raw-2");
});

registry.define(/^classifying a recall id is refused as a non-raw reference$/, async (context) => {
  const item = context.items.get("153");
  await assert.rejects(
    recordFeedbackClassification(item, { id: "triage-3", raw: "c1", at: "2026-10-09T00:00:00Z", classification: { kind: "note" } }),
    { code: "feedback-raw-reference-invalid" },
  );
});

registry.define(/^all earlier rows of item "([^"]+)" remain an unchanged byte prefix$/, async (context, ref) => {
  assert.ok((await readLedger(context, ref)).startsWith(context.ledgerBeforeTriage));
});

registry.define(/^a local item "([^"]+)" whose ledger holds a valid raw row followed by an unknown record kind$/, async (context, ref) => {
  const item = await ensureMilestone(context, ref);
  await writeFile(path.join(item.dir, LEDGER), `${JSON.stringify(RAW_ROW)}\n{"kind":"verdict","id":"x"}\n`, "utf8");
});

registry.define(/^the changed item was published through the existing cascade$/, async (context) => {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(path.join(context.globalDir, "mesh", "work", "journal.sqlite"), { readOnly: true });
  try {
    const events = db.prepare("SELECT event_id, name, payload FROM events WHERE name = 'feedback.recorded'").all();
    const mine = events.filter((event) => JSON.parse(event.payload).recallId === context.observation.id);
    assert.equal(mine.length, 1, "exactly one feedback.recorded event carries this recall");
    const payload = JSON.parse(mine[0].payload);
    assert.deepEqual([payload.doc, payload.bullet, payload.rawId], [LEDGER, null, null], "it names the ledger, with no STATE bullet and no raw id");
    const steps = db.prepare("SELECT reactor_key, status FROM effect_steps WHERE event_id = ?").all(mine[0].event_id);
    assert.deepEqual(steps.map((step) => [step.reactor_key, step.status]), [["publish-projection", "done"]], "the existing publish reactor ran");
  } finally {
    db.close();
  }
});

registry.define(/^item "([^"]+)" has no STATE\.md feedback bullet and no raw row from the recall$/, async (context, ref) => {
  const item = context.items.get(ref);
  assert.deepEqual(await readdir(item.dir).then((names) => names.sort()), [LEDGER, "SPEC.md"], "no STATE.md was created");
  const rows = await readFeedbackRecords(item);
  assert.deepEqual(rows.map((row) => row.kind), ["raw", "recall"], "the only raw row is the one that was already there");
});

registry.define(/^help for the memory command no longer advertises "([^"]+)"$/, async (context, verb) => {
  const help = await runCli(context, "work memory recall -h");
  assert.equal(help.status, 0);
  assert.ok(!help.stdout.includes(verb), `help does not mention ${verb}`);
  assert.ok(help.stdout.includes("record-recall"), "help names record-recall");
});

registry.define(/^an ordinary recall still emits a records array under JSON$/, async (context) => {
  const recall = await runCli(context, 'work memory recall "junction cleanup" --json');
  assert.equal(recall.status, 0, `recall exits 0 (stderr: ${recall.stderr})`);
  assert.ok(Array.isArray(JSON.parse(recall.stdout)), "recall --json is an ARRAY");
});

export async function runStep(context, step) {
  await registry.run(context, step);
}
