// Steps for memory-effectiveness.feature (153/03). Everything here drives the REAL CLI —
// `aof work memory status`, `aof work memory record-recall`, `aof work doctor` — over a fixture work
// stream, and reads results back from stdout and from the stream's own files. The runner resolves this
// module by convention from the feature's basename.
import assert from "node:assert/strict";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createStepRegistry } from "../support/step-registry.mjs";
import { registerCommonSteps } from "../support/common-steps.mjs";
import { runCli } from "../support/cli-context.mjs";
import { ensureWorkStream, workDir } from "../support/work-stream-fixture.mjs";

const registry = createStepRegistry();
registerCommonSteps(registry);

const META = "- **Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer";
const lessonSection = (id, ...extra) => [`## ${id} — a lesson`, "", META, ...extra, "- **What happened:** a lesson about a junction.", ""].join("\n");
const retrospective = (...lessons) => ["# Retrospective", "", ...lessons].join("\n");

// ------------------------------------------------------------------ fixtures ----

// A milestone with a status and acceptance date, optionally carrying a retrospective and a ledger.
async function writeItem(context, number, { status = "done", updated = "2026-01-01", archived = false, retro = null, ledger = null } = {}) {
  await ensureWorkStream(context);
  const dir = path.join(workDir(context), ...(archived ? ["archive"] : []), `${number}_milestone_m${number}`);
  await mkdir(dir, { recursive: true });
  const fields = { type: "milestone", number: `"${number}"`, slug: `m${number}`, status, title: `"M ${number}"`, created: "2026-01-01", updated: updated ?? "", schema: 1 };
  await writeFile(path.join(dir, "SPEC.md"), `---\n${Object.entries(fields).filter(([, value]) => value !== "").map(([key, value]) => `${key}: ${value}`).join("\n")}\n---\n# M ${number}\n`, "utf8");
  if (retro != null) await writeFile(path.join(dir, "RETROSPECTIVE.md"), retro, "utf8");
  if (ledger != null) await writeFile(path.join(dir, "FEEDBACK.ndjson"), `${ledger.map((row) => (typeof row === "string" ? row : JSON.stringify(row))).join("\n")}\n`, "utf8");
  context.items.set(number, { ref: number, dir, type: "milestone" });
  return dir;
}

const observation = (id, records, at = "2026-10-10T10:00:00.000Z") => ({ kind: "recall", id, at, edge: "refine.architect", actor: "architect", query: "junction", scope: {}, records });
const returned = (item, id, verdict, recordType = "lesson") => ({ item, id, recordType, verdict });

async function selectBackend(context, backend) {
  await ensureWorkStream(context);
  const file = path.join(context.projectDir, ".aof", "aof.config.json");
  const config = JSON.parse(await readFile(file, "utf8"));
  await writeFile(file, `${JSON.stringify({ ...config, memory: { backend } }, null, 2)}\n`, "utf8");
}

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

const status = (context) => JSON.parse(context.lastResult.stdout);
const effectiveness = (context) => status(context).effectiveness;

// -------------------------------------------------------- R1 · accounting ----

registry.define(/^lesson "([^"]+)" is returned by two distinct completed recall observations, honoured then departed$/, async (context, ref) => {
  const [item, id] = ref.split("/");
  await writeItem(context, item, { retro: retrospective(lessonSection(id)) });
  for (const [recallId, verdict] of [["r1", "honoured"], ["r2", "departed"]]) {
    const file = path.join(context.root, `${recallId}.json`);
    await writeFile(file, `${JSON.stringify(observation(recallId, [returned(item, id, verdict)]))}\n`, "utf8");
    const submitted = await runCli(context, `work memory record-recall ${item} --input "${file}" --json`);
    assert.equal(submitted.status, 0, `record-recall ${recallId} exits 0 (stderr: ${submitted.stderr})`);
  }
});

registry.define(/^one distinct new lesson in item (\d+) carries Recurs "([^"]+)"$/, async (context, item, recurs) => {
  await writeItem(context, item, { retro: retrospective(lessonSection("R10", `- **Recurs:** ${recurs}`)) });
});

registry.define(/^indexed lessons "([^"]+)" and "([^"]+)" of which only "([^"]+)" has recall evidence$/, async (context, first, second, observed) => {
  await selectBackend(context, "local");
  for (const ref of [first, second]) {
    const [item, id] = ref.split("/");
    const ledger = ref === observed ? [observation("r1", [returned(item, id, "honoured")])] : null;
    await writeItem(context, item, { retro: retrospective(lessonSection(id)), ledger });
  }
  const built = await runCli(context, "work memory ingest --json");
  assert.equal(built.status, 0, `ingest exits 0 (stderr: ${built.stderr})`);
});

registry.define(/^a completed recall records lesson "([^"]+)" as honoured, and the lesson is no longer in the current index$/, async (context, ref) => {
  const [item, id] = ref.split("/");
  await selectBackend(context, "local");
  await writeItem(context, item, { retro: retrospective(lessonSection("R1")), ledger: [observation("r1", [returned(item, id, "honoured")])] });
  const built = await runCli(context, "work memory ingest --json");
  assert.equal(built.status, 0, `ingest exits 0 (stderr: ${built.stderr})`);
});

registry.define(/^the work stream holds two complete observations of lesson "([^"]+)" and the "([^"]+)" memory backend is selected$/, async (context, ref, backend) => {
  const [item, id] = ref.split("/");
  await selectBackend(context, backend);
  await writeItem(context, item, { retro: retrospective(lessonSection(id)), ledger: [observation("r1", [returned(item, id, "honoured")]), observation("r2", [returned(item, id, "departed")])] });
  context.beforeTree = await treeSnapshot(workDir(context));
});

registry.define(/^one observation returned a lesson as honoured, an ADR as irrelevant and a capability as departed$/, async (context) => {
  await writeItem(context, "45", {
    retro: retrospective(lessonSection("R13")),
    ledger: [observation("r1", [returned("45", "R13", "honoured"), returned("45", "ADR-001", "irrelevant", "adr"), returned("9", "cap-a", "departed", "capability")])],
  });
});

registry.define(/^an item has one completed recall with an empty records array and another item has no ledger$/, async (context) => {
  await writeItem(context, "45", { ledger: [observation("r1", [])] });
  await writeItem(context, "46");
});

registry.define(/^an archived lesson "([^"]+)" is recalled by a story-owned observation, "([^"]+)" recurs from it and a third lesson "([^"]+)" recurs from "([^"]+)"$/, async (context, archivedRef, second, third, thirdSource) => {
  const [archivedItem, archivedId] = archivedRef.split("/");
  const [secondItem, secondId] = second.split("/");
  const [thirdItem, thirdId] = third.split("/");
  await writeItem(context, archivedItem, { archived: true, retro: retrospective(lessonSection(archivedId)) });
  const storyDir = path.join(workDir(context), "70_milestone_m70", "stories", "01_story_s1");
  await writeItem(context, "70", { status: "in-progress", updated: "2026-10-01" });
  await mkdir(storyDir, { recursive: true });
  await writeFile(path.join(storyDir, "STORY.md"), "---\ntype: story\nnumber: \"01\"\nslug: s1\nparent: \"70\"\nstatus: in-progress\ntitle: \"S\"\ncreated: 2026-10-01\nupdated: 2026-10-01\nschema: 1\n---\n# S\n", "utf8");
  await writeFile(path.join(storyDir, "FEEDBACK.ndjson"), `${JSON.stringify(observation("s1", [returned(archivedItem, archivedId, "honoured")]))}\n`, "utf8");
  await writeItem(context, secondItem, { retro: retrospective(lessonSection(secondId, `- **Recurs:** ${archivedRef}`)) });
  await writeItem(context, thirdItem, { retro: retrospective(lessonSection(thirdId, `- **Recurs:** ${thirdSource}`)) });
});

registry.define(/^the ledger holds one recall observation row twice, and one new lesson is listed twice$/, async (context) => {
  const row = observation("r1", [returned("45", "R13", "honoured")]);
  await writeItem(context, "45", { retro: retrospective(lessonSection("R13")), ledger: [row, row] });
  await writeItem(context, "68", { retro: retrospective(lessonSection("R10", "- **Recurs:** 45/R13")) });
});

registry.define(/^the evidence contains (malformed ledger JSON|an unknown ledger kind|conflicting payloads for one recall id)$/, async (context, defect) => {
  const rows = {
    "malformed ledger JSON": ["{not json"],
    "an unknown ledger kind": [{ kind: "mystery", id: "x" }],
    "conflicting payloads for one recall id": [observation("r1", [returned("45", "R13", "honoured")]), observation("r1", [returned("45", "R13", "departed")])],
  }[defect];
  await writeItem(context, "45", { retro: retrospective(lessonSection("R13")), ledger: rows });
  context.beforeTree = await treeSnapshot(workDir(context));
});

registry.define(/^the evidence contains an unreadable ledger file$/, async (context) => {
  const dir = await writeItem(context, "45", { retro: retrospective(lessonSection("R13")) });
  await mkdir(path.join(dir, "FEEDBACK.ndjson"));
  context.beforeTree = await treeSnapshot(workDir(context));
});

registry.define(/^the operator requests memory status( with per-lesson accounting)?$/, async (context, lessons) => {
  context.beforeTree ??= await treeSnapshot(workDir(context));
  context.lastResult = await runCli(context, `work memory status${lessons ? " --lessons" : ""} --json`);
  assert.equal(context.lastResult.status, 0, `status exits 0 (stderr: ${context.lastResult.stderr})`);
});

const COUNT_NAMES = ["surfaced", "honoured", "departed", "irrelevant", "recurred"];
function parseCounts(text) {
  return Object.fromEntries([...text.matchAll(/(surfaced|honoured|departed|irrelevant|recurred) (\d+)/g)].map(([, name, value]) => [name, Number(value)]));
}

registry.define(/^effectiveness lesson "([^"]+)" has (.+)$/, (context, ref, counts) => {
  const entry = effectiveness(context).lessons[ref];
  assert.ok(entry, `effectiveness.lessons carries ${ref}`);
  const expected = parseCounts(counts);
  for (const name of COUNT_NAMES) assert.equal(entry[name], expected[name] ?? 0, `${ref} ${name}`);
});

registry.define(/^effectiveness type "([^"]+)" has (.+)$/, (context, type, counts) => {
  const entry = effectiveness(context).types[type];
  assert.ok(entry, `effectiveness.types carries ${type}`);
  const expected = parseCounts(counts);
  for (const name of COUNT_NAMES) assert.equal(entry[name], expected[name] ?? 0, `${type} ${name}`);
});

registry.define(/^lesson "([^"]+)" has provenance "([^"]+)"$/, (context, ref, provenance) => assert.equal(effectiveness(context).lessons[ref].provenance, provenance));
registry.define(/^per-lesson detail is omitted but the legacy status fields and record counts remain$/, (context) => {
  const document = status(context);
  assert.equal("lessons" in document.effectiveness, false);
  for (const field of ["backend", "recordCount", "types", "layers", "conformance"]) assert.ok(field in document, `legacy field ${field} remains`);
});
registry.define(/^the report states that honouring a lesson is not proof of prevention$/, (context) => assert.match(effectiveness(context).basis, /not proof/));
registry.define(/^the report is complete with no diagnostics$/, (context) => {
  assert.equal(effectiveness(context).complete, true);
  assert.deepEqual(effectiveness(context).diagnostics, []);
});
registry.define(/^the report diagnoses "([^"]+)" naming its source and is not complete$/, (context, defect) => {
  const report = effectiveness(context);
  assert.equal(report.complete, false);
  assert.ok(report.diagnostics.some((diagnostic) => diagnostic.defect === defect && /FEEDBACK\.ndjson/.test(diagnostic.source)), `a diagnostic names ${defect} and its ledger (got ${JSON.stringify(report.diagnostics)})`);
});
registry.define(/^no source file was changed$/, async (context) => {
  assert.deepEqual(await treeSnapshot(workDir(context)), context.beforeTree);
});

// ---------------------------------------------------------- R2 · age ----

// An unpromoted lesson in milestone 10 accepted 2026-01-01, then `n` distinct milestones accepted afterwards.
registry.define(/^a lesson with Promoted to "([^"]+)" in an item accepted on 2026-01-01 and (\d+) later accepted milestones$/, async (context, promotion, later) => {
  await writeItem(context, "10", { retro: retrospective(lessonSection("R1", `- **Promoted to:** ${promotion}`)) });
  for (let i = 0; i < Number(later); i += 1) await writeItem(context, String(20 + i), { updated: `2026-02-${String(i + 1).padStart(2, "0")}` });
});
registry.define(/^a legacy lesson with no Promoted to field in an item accepted on 2026-01-01 and (\d+) later accepted milestones$/, async (context, later) => {
  await writeItem(context, "10", { retro: retrospective(lessonSection("R1")) });
  for (let i = 0; i < Number(later); i += 1) await writeItem(context, String(20 + i), { updated: `2026-02-${String(i + 1).padStart(2, "0")}` });
});
registry.define(/^an accepted item without an acceptance date holds an unpromoted lesson, and (\d+) later-numbered milestones exist$/, async (context, count) => {
  await writeItem(context, "10", { updated: null, retro: retrospective(lessonSection("R1", "- **Promoted to:** none")) });
  for (let i = 0; i < Number(count); i += 1) await writeItem(context, String(20 + i), { updated: `2026-03-${String(i + 1).padStart(2, "0")}` });
});
registry.define(/^one more distinct milestone is accepted after that date$/, async (context) => {
  await writeItem(context, "29", { updated: "2026-04-01" });
});

registry.define(/^the operator runs normal work doctor$/, async (context) => {
  context.lastResult = await runCli(context, "work doctor --json");
});
registry.define(/^the operator runs work doctor in strict mode$/, async (context) => {
  context.lastResult = await runCli(context, "work doctor --strict --json");
});
registry.define(/^the operator runs work doctor scoped to item "([^"]+)"$/, async (context, scope) => {
  context.lastResult = await runCli(context, `work doctor ${scope} --json`);
});

const findings = (context, code) => JSON.parse(context.lastResult.stdout).findings.filter((finding) => finding.code === code);
const AGED = "memory-lesson-unpromoted-aged";

registry.define(/^no aged-unpromoted warning is emitted$/, (context) => assert.deepEqual(findings(context, AGED), []));
registry.define(/^an advisory aged-unpromoted warning identifies lesson "([^"]+)", age (\d+) and default threshold (\d+)$/, (context, ref, age, threshold) => {
  const found = findings(context, AGED).filter((finding) => finding.message.includes(`lesson ${ref} `));
  assert.equal(found.length, 1, `one warning for ${ref}`);
  assert.equal(found[0].severity, "warn");
  assert.match(found[0].message, new RegExp(`age ${age}\\b`));
  assert.match(found[0].message, new RegExp(`default threshold ${threshold}\\b`));
});
registry.define(/^the aged-unpromoted warning for "([^"]+)" is labelled (.+)$/, (context, ref, label) => {
  const found = findings(context, AGED).filter((finding) => finding.message.includes(`lesson ${ref} `));
  assert.equal(found.length, 1);
  assert.ok(found[0].message.includes(label), `${found[0].message} carries "${label}"`);
});
registry.define(/^doctor identifies "([^"]+)" as unknown age and issues no aged-unpromoted warning$/, (context, ref) => {
  assert.deepEqual(findings(context, AGED), []);
  const unknown = findings(context, "memory-lesson-age-unknown");
  assert.equal(unknown.length, 1);
  assert.match(unknown[0].message, new RegExp(`lesson ${ref} .*unknown age`));
});

// ------------------------------------------------------ R3 · advisory ----

registry.define(/^a distinct lesson "([^"]+)" carries Recurs "([^"]+)" and the predecessor is archived and promoted$/, async (context, newRef, recurs) => {
  const [newItem, newId] = newRef.split("/");
  const [item, id] = recurs.split("/");
  const archived = await writeItem(context, item, { archived: true, retro: retrospective(lessonSection(id, "- **Promoted to:** rule:.aof/rules/x.md")) });
  context.archivedRetro = { file: path.join(archived, "RETROSPECTIVE.md"), text: await readFile(path.join(archived, "RETROSPECTIVE.md"), "utf8") };
  await writeItem(context, newItem, { retro: retrospective(lessonSection(newId, "- **Promoted to:** none", `- **Recurs:** ${recurs}`)) });
});
registry.define(/^a warning identifies predecessor "([^"]+)" and the new lesson "([^"]+)"$/, (context, predecessor, newRef) => {
  const found = findings(context, "memory-lesson-recurs");
  assert.equal(found.length, 1);
  assert.equal(found[0].severity, "warn");
  assert.ok(found[0].message.includes(predecessor) && found[0].message.includes(newRef), found[0].message);
});
registry.define(/^the archived retrospective is byte-identical$/, async (context) => {
  assert.equal(await readFile(context.archivedRetro.file, "utf8"), context.archivedRetro.text);
});

registry.define(/^a fixture whose only findings are one recurrence and one aged-unpromoted warning$/, async (context) => {
  await writeItem(context, "10", { retro: retrospective(lessonSection("R1", "- **Promoted to:** none")) });
  await writeItem(context, "11", { updated: "2026-01-02", retro: retrospective(lessonSection("R1", "- **Promoted to:** rule:.aof/rules/x.md", "- **Recurs:** 10/R1")) });
  for (let i = 0; i < 5; i += 1) await writeItem(context, String(20 + i), { updated: `2026-02-${String(i + 1).padStart(2, "0")}` });
});
registry.define(/^doctor reports both memory findings as warnings with no memory error$/, (context) => {
  const document = JSON.parse(context.lastResult.stdout);
  const memory = document.findings.filter((finding) => finding.code.startsWith("memory-lesson-"));
  assert.ok(memory.some((finding) => finding.code === AGED) && memory.some((finding) => finding.code === "memory-lesson-recurs"));
  assert.ok(memory.every((finding) => finding.severity === "warn"));
});
registry.define(/^doctor exits (\d+)$/, (context, code) => assert.equal(context.lastResult.status, Number(code), `doctor exit (stdout: ${context.lastResult.stdout.slice(0, 300)})`));
registry.define(/^doctor reports healthy "(true|false)" for strict "(true|false)"$/, (context, healthy, strict) => {
  const document = JSON.parse(context.lastResult.stdout);
  assert.equal(String(document.healthy), healthy);
  assert.equal(String(document.strict), strict);
});

registry.define(/^item "([^"]+)" holds an unpromoted lesson with (\d+) later accepted milestones elsewhere and an unrelated item has a recurring lesson$/, async (context, item, later) => {
  await writeItem(context, item, { retro: retrospective(lessonSection("R1", "- **Promoted to:** none")) });
  for (let i = 0; i < Number(later); i += 1) await writeItem(context, String(20 + i), { updated: `2026-02-${String(i + 1).padStart(2, "0")}` });
  await writeItem(context, "70", { updated: "2026-01-01", retro: retrospective(lessonSection("R1", "- **Promoted to:** rule:.aof/rules/x.md")) });
  await writeItem(context, "71", { updated: "2026-01-01", retro: retrospective(lessonSection("R2", "- **Promoted to:** rule:.aof/rules/x.md", "- **Recurs:** 70/R1")) });
});
registry.define(/^doctor reports only in-scope memory findings and computes age (\d+)$/, (context, age) => {
  const memory = JSON.parse(context.lastResult.stdout).findings.filter((finding) => finding.code.startsWith("memory-lesson-"));
  assert.equal(memory.length, 1, JSON.stringify(memory));
  assert.equal(memory[0].code, AGED);
  assert.match(memory[0].message, new RegExp(`age ${age}\\b`));
});

export async function runStep(context, step) {
  await registry.run(context, step);
}
