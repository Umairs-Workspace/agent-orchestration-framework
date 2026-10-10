// Steps for memory-lesson-recurrence.feature (153/02). Everything here drives the REAL CLI —
// `aof work validate`, `aof work memory ingest|recall|recurrence` — over a fixture work stream, and
// reads results back from stdout and from the stream's own files. The lesson texts are the
// calibration fixture's, so the feature and FF-15302 judge the same incidents. The runner resolves
// this module by convention from the feature's basename.
import assert from "node:assert/strict";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { createStepRegistry } from "../support/step-registry.mjs";
import { registerCommonSteps } from "../support/common-steps.mjs";
import { repoRoot, runCli } from "../support/cli-context.mjs";
import { ensureWorkStream, workDir, writeMilestone } from "../support/work-stream-fixture.mjs";

const registry = createStepRegistry();
registerCommonSteps(registry);

const FIXTURE = JSON.parse(await readFile(path.join(repoRoot, "test", "arch", "memory", "fixtures", "recurrence-pairs.json"), "utf8"));
const META = "- **Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer";

// A lesson as a RETROSPECTIVE section: the fixture's indexed blob has the title first, so the title
// becomes the heading and the rest the `What happened`, which indexes back to the same words.
function lessonSection(id, text, kind) {
  const [title, ...rest] = text.split(" \n ");
  return [`## ${id} — ${title}`, "", `- **Kind:** ${kind} · **Area:** process · **Stage:** verify · **Owner:** verifier`, `- **What happened:** ${rest.join(" ")}`, ""].join("\n");
}

async function writeRetrospective(context, number, body) {
  const dir = context.items.get(number)?.dir ?? (await writeMilestone(context, { number, slug: `m${number}`, title: `Milestone ${number}` }));
  const file = path.join(dir, "RETROSPECTIVE.md");
  await writeFile(file, body, "utf8");
  return file;
}

async function selectBackend(context, backend) {
  const file = path.join(context.projectDir, ".aof", "aof.config.json");
  const config = JSON.parse(await readFile(file, "utf8"));
  await writeFile(file, `${JSON.stringify({ ...config, memory: { backend } }, null, 2)}\n`, "utf8");
}

// Every file under a folder → bytes, so "no source document was edited" is a comparison.
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

const lessonText = (ref) => {
  const lesson = FIXTURE.lessons[ref];
  assert.ok(lesson, `the calibration fixture carries lesson ${ref}`);
  return lesson;
};

// ----------------------------------------------------------- R1 · the hold ----

async function liveRetrospective(context, { promotionFrom, promotion }) {
  await ensureWorkStream(context);
  const lessons = [1, 2, 3].map((n) => [`## R${n} — legacy ${n}`, "", META, "- **What happened:** an older lesson.", ""].join("\n"));
  const r4 = ["## R4 — new lesson", "", META, ...(promotion === null ? [] : [`- **Promoted to:** ${promotion}`]), "- **What happened:** a new lesson.", ""].join("\n");
  const text = ["---", `promotionFrom: ${promotionFrom}`, "---", "# 07 · Retrospective", "", ...lessons, r4].join("\n");
  context.retrospective = { file: await writeRetrospective(context, "07", text), text };
  // The fixture milestone is current-schema, so validate's only findings are the lesson hold's.
  const spec = path.join(context.items.get("07").dir, "SPEC.md");
  await writeFile(spec, (await readFile(spec, "utf8")).replace("updated: 2026-06-19\n---", "updated: 2026-06-19\nschema: 1\n---"), "utf8");
}

registry.define(/^a live retrospective with promotionFrom (\d+) and a conforming R4 without Promoted to$/, (context, from) =>
  liveRetrospective(context, { promotionFrom: from, promotion: null }));
registry.define(/^a live retrospective with promotionFrom (\d+) and a conforming R4 with Promoted to "([^"]+)"$/, (context, from, promotion) =>
  liveRetrospective(context, { promotionFrom: from, promotion }));
registry.define(/^a live retrospective with promotionFrom "([^"]+)" and a conforming R4 with Promoted to "([^"]+)"$/, (context, from, promotion) =>
  liveRetrospective(context, { promotionFrom: from, promotion }));

registry.define(/^the validation findings mention "([^"]+)" and "([^"]+)"$/, (context, first, second) => {
  const output = JSON.parse(context.lastResult.stdout);
  const problems = (Array.isArray(output) ? output : output.findings ?? []).map((finding) => finding.problem ?? finding.message ?? "").join("\n");
  assert.ok(problems.includes(first) && problems.includes(second), `the findings name "${first}" and "${second}" (findings: ${problems.slice(0, 400)})`);
});

registry.define("the retrospective is byte-identical to what was written", async (context) => {
  assert.equal(await readFile(context.retrospective.file, "utf8"), context.retrospective.text);
});

// ---------------------------------------------------------- E3 · indexing ----

registry.define(/^the local memory backend and a retrospective whose R4 has Promoted to "([^"]+)", Recurs "([^"]+)" and Kind "([^"]+)"$/, async (context, promotion, recurs, kind) => {
  await ensureWorkStream(context);
  await selectBackend(context, "local");
  const legacy = ["## R1 — A legacy lesson", "", "- **Kind:** near-miss (recurring) · **Area:** process · **Stage:** build · **Owner:** developer", "- **What happened:** an older lesson about a junction.", ""].join("\n");
  const r4 = ["## R4 — A new junction lesson", "", `- **Kind:** ${kind} · **Area:** process · **Stage:** verify · **Owner:** verifier`, `- **Promoted to:** ${promotion}`, `- **Recurs:** ${recurs}`, "- **What happened:** a new lesson about a junction.", ""].join("\n");
  const text = ["---", "promotionFrom: 2", "---", "# 07 · Retrospective", "", legacy, r4].join("\n");
  context.retrospective = { file: await writeRetrospective(context, "07", text), text };
});

registry.define("the memory index is built and the lessons are recalled", async (context) => {
  const built = await runCli(context, "work memory ingest --json");
  assert.equal(built.status, 0, `ingest exits 0 (stderr: ${built.stderr})`);
  const recalled = await runCli(context, "work memory recall junction --json --limit 20");
  assert.equal(recalled.status, 0, `recall exits 0 (stderr: ${recalled.stderr})`);
  context.recalled = Object.fromEntries(JSON.parse(recalled.stdout).filter((record) => record.recordType === "lesson").map((record) => [record.id, record]));
});

registry.define(/^the recalled R4 status is "([^"]+)"$/, (context, status) => assert.equal(context.recalled.R4.status, status));
registry.define(/^the recalled R4 tags are "([^"]+)" and "([^"]+)"$/, (context, first, second) => assert.deepEqual(context.recalled.R4.tags, [first, second]));
registry.define("the recalled legacy R1 status is empty and has no recurs tag", (context) => {
  assert.equal(context.recalled.R1.status, "");
  assert.ok(!context.recalled.R1.tags.some((tag) => tag.startsWith("recurs:")), "no recurs tag");
});

// ------------------------------------------------------ R2 · the decision ----

async function indexLessons(context, refs) {
  await ensureWorkStream(context);
  await selectBackend(context, "local");
  for (const ref of refs) {
    const item = ref.slice(0, ref.lastIndexOf("/"));
    const id = ref.slice(ref.lastIndexOf("/") + 1);
    const lesson = lessonText(ref);
    await writeRetrospective(context, item, ["---", "doc: retrospective", "---", `# ${item} · Retrospective`, "", lessonSection(id, lesson.text, lesson.kind)].join("\n"));
  }
  const built = await runCli(context, "work memory ingest --json");
  assert.equal(built.status, 0, `ingest exits 0 (stderr: ${built.stderr})`);
}

registry.define(/^the local memory backend indexing lesson "([^"]+)" from item (\d+) and lesson "([^"]+)" from item (\d+)$/, (context, first, _firstItem, second) =>
  indexLessons(context, [first, second]));

registry.define(/^memory is off and lesson "([^"]+)" is in item (\d+)$/, async (context, ref) => {
  await ensureWorkStream(context);
  const lesson = lessonText(ref);
  await writeRetrospective(context, ref.slice(0, ref.lastIndexOf("/")), lessonSection(ref.slice(ref.lastIndexOf("/") + 1), lesson.text, lesson.kind));
});

registry.define(/^recurrence is evaluated for the text of "([^"]+)" excluding "([^"]+)"$/, async (context, ref, exclude) => {
  context.beforeTree = await treeSnapshot(workDir(context));
  // A double quote cannot ride the command splitter and is not a word, so it becomes a space.
  const text = lessonText(ref).text.replace(/["']/g, " ").replace(/\s+/g, " ").trim();
  const flag = exclude === "none" ? "" : ` --exclude ${exclude}`;
  context.lastResult = await runCli(context, `work memory recurrence "${text}"${flag} --json`);
});

const decision = (context) => JSON.parse(context.lastResult.stdout);

registry.define(/^the qualifying reference is "([^"]+)"$/, (context, ref) => assert.equal(decision(context).qualifying, ref));
registry.define("there is no qualifying reference", (context) => assert.equal(decision(context).qualifying, null));
registry.define("the result reports a score above its threshold and a calibration version", (context) => {
  const result = decision(context);
  assert.ok(result.score > result.threshold, `${result.score} > ${result.threshold}`);
  assert.equal(typeof result.calibration, "string");
  assert.ok(result.calibration.length > 0);
});
registry.define("the result still reports the best candidate score and the threshold", (context) => {
  const result = decision(context);
  assert.equal(typeof result.score, "number");
  assert.equal(typeof result.threshold, "number");
  assert.ok(result.score <= result.threshold);
});
registry.define(/^the candidates are exactly "([^"]+)"$/, (context, ref) => assert.deepEqual(decision(context).candidates.map((candidate) => candidate.ref), [ref]));
registry.define("there are no candidates", (context) => assert.deepEqual(decision(context).candidates, []));

registry.define("no source document was edited", async (context) => {
  assert.deepEqual(await treeSnapshot(workDir(context)), context.beforeTree);
});

registry.define("no retrieval index exists anywhere", async (context) => {
  const index = path.join(context.projectDir, ".aof", "aof.memory.index.json");
  await assert.rejects(() => stat(index), { code: "ENOENT" });
});

export async function runStep(context, step) {
  await registry.run(context, step);
}
