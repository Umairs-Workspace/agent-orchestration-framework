// Steps for memory-tune-prompt.feature (153/05). Everything here drives the REAL CLI — `aof work tune
// [scope] --json` — over a fixture work stream, and reads results back from the parsed report and from
// the project's own bytes. The runner resolves this module by convention from the feature's basename.
//
// Every run needs a stream that clears tune's own corpus floors (196 lessons, 30 run records, 3
// observation readings — the registry's, never varying with scope), so the fixture carries a floor item:
// a milestone whose retrospective holds filler lessons and whose three stories each hold ten run records
// and one observation snapshot. The lesson under test gets metadata unlike the filler's, so it forms a
// candidate of its own instead of dissolving into theirs.
import assert from "node:assert/strict";
import { mkdir, readFile, readdir, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createStepRegistry } from "../support/step-registry.mjs";
import { registerCommonSteps } from "../support/common-steps.mjs";
import { runCli } from "../support/cli-context.mjs";
import { ensureWorkStream, workDir } from "../support/work-stream-fixture.mjs";

const registry = createStepRegistry();
registerCommonSteps(registry);

const TARGET_REL = "packages/core/assets/commands/refine.md";
const PROMPT = `prompt:${TARGET_REL}`;
const TARGET_BYTES = "# refine\nstep one\n";
const LESSON = "Declare the existing counter's owning suite before drawing the write set.";
const EVIDENCE_FILE = "docs/incident-45.md";
const SECRET = "OUTSIDE-SECRET-4f1c9e";

const FILLER_META = "- **Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer";
const OWN_META = "- **Kind:** blocker · **Area:** security · **Stage:** verify · **Owner:** qa";

const blockFor = (ref, text) => `<!-- aof:lesson ${ref} -->\n${text}\n<!-- /aof:lesson ${ref} -->\n`;

// ------------------------------------------------------------------ fixtures ----

const frontmatter = (fields) => `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join("\n")}\nschema: 1\n---\n`;

// A lesson section as the retrospective parser reads it. `lesson: null` writes no Lesson line at all;
// an empty string writes the label with nothing after it.
function section(id, { meta = OWN_META, promoted = null, recurs = null, lesson = LESSON, what = "It happened." } = {}) {
  return [
    `## ${id} — a lesson ${id}`,
    "",
    meta,
    ...(promoted == null ? [] : [`- **Promoted to:** ${promoted}`]),
    ...(recurs == null ? [] : [`- **Recurs:** ${recurs}`]),
    `- **What happened:** ${what}`,
    ...(lesson == null ? [] : [`- **Lesson:** ${lesson}`]),
    "",
  ].join("\n");
}

async function writeItem(context, number, { retro = null, ledger = null, stories = 0 } = {}) {
  await ensureWorkStream(context);
  const dir = path.join(workDir(context), `${number}_milestone_m${number}`);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "SPEC.md"), `${frontmatter({ type: "milestone", number: `"${number}"`, slug: `m${number}`, status: "done", title: `"M ${number}"`, created: "2026-01-01", updated: "2026-01-02" })}# M ${number}\n`, "utf8");
  if (retro != null) await writeFile(path.join(dir, "RETROSPECTIVE.md"), `# Retrospective\n\n${retro}`, "utf8");
  if (ledger != null) await writeFile(path.join(dir, "FEEDBACK.ndjson"), `${ledger.map((row) => (typeof row === "string" ? row : JSON.stringify(row))).join("\n")}\n`, "utf8");
  for (let story = 1; story <= stories; story += 1) {
    const storyDir = path.join(dir, "stories", `0${story}_story_s${story}`);
    await mkdir(path.join(storyDir, "runs"), { recursive: true });
    await writeFile(path.join(storyDir, "STORY.md"), `${frontmatter({ type: "story", number: `"0${story}"`, slug: `s${story}`, parent: `"${number}"`, status: "done", title: '"S"', created: "2026-01-01", updated: "2026-01-02" })}# S\n`, "utf8");
    for (let run = 0; run < 10; run += 1) {
      const runId = `2026-01-01T00-00-00-${String(run).padStart(3, "0")}Z-000`;
      await writeFile(path.join(storyDir, "runs", `${runId}.json`), JSON.stringify({ runId, itemRef: `${number}/0${story}`, state: "done", attempt: 1, outcome: "done", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:01:00.000Z" }), "utf8");
    }
    const snapshot = path.join(storyDir, "observability", "snapshots", "2026-01-01T00-00-00-000Z");
    await mkdir(snapshot, { recursive: true });
    await writeFile(path.join(snapshot, "report.md"), "# observed\n", "utf8");
    await writeFile(path.join(snapshot, "agents.json"), JSON.stringify({ sessions: [], agents: [], runs: { count: 0, unattributedCount: 0 } }), "utf8");
  }
  return dir;
}

const fillerLessons = () => Array.from({ length: 200 }, (_, index) => section(`R${index + 100}`, { meta: FILLER_META, lesson: "Keep it." })).join("\n");

async function put(context, relative, text) {
  const file = path.join(context.projectDir, ...relative.split("/"));
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text, "utf8");
  return file;
}

const observation = (id, item, lessonId, verdict) => ({
  kind: "recall", id, at: "2026-10-10T10:00:00.000Z", edge: "refine.architect", actor: "architect", query: "junction", scope: {},
  records: [{ item, id: lessonId, recordType: "lesson", verdict }],
});

// The state the Given steps accumulate; `flush` writes it. Re-flushing is idempotent, so step order is free.
function spec(context) {
  context.fx ??= {
    lesson: { promoted: PROMPT, lessonText: LESSON, what: `It was seen again; see ${EVIDENCE_FILE}.`, duplicate: null },
    targetBytes: TARGET_BYTES,
    verdicts: [],
    recurrer: false,
    floorsAt: "70",
    scoped: null,
  };
  return context.fx;
}

async function flush(context) {
  const fx = spec(context);
  await put(context, EVIDENCE_FILE, "# an incident\n");
  const sections = [section("R13", { promoted: fx.lesson.promoted, lesson: fx.lesson.lessonText, what: fx.lesson.what })];
  if (fx.lesson.duplicate != null) sections.push(section("R13", { promoted: fx.lesson.promoted, lesson: fx.lesson.duplicate, what: fx.lesson.what }));
  await writeItem(context, "45", {
    retro: sections.join("\n"),
    ledger: fx.verdicts.length === 0 ? null : fx.verdicts.map((verdict, index) => observation(`r${index + 1}`, "45", "R13", verdict)),
  });
  if (fx.recurrer) await writeItem(context, "68", { retro: section("R10", { meta: FILLER_META, promoted: "none", recurs: "45/R13", lesson: "Seen a second time." }) });
  if (fx.targetBytes != null) await put(context, TARGET_REL, fx.targetBytes);
  if (fx.floorsAt != null && !context.floorsWritten) {
    await writeItem(context, fx.floorsAt, { retro: fillerLessons(), stories: 3 });
    context.floorsWritten = true;
  }
}

async function treeSnapshot(root) {
  const snapshot = new Map();
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) snapshot.set(path.relative(root, full), "<link>");
      else if (entry.isDirectory()) await walk(full);
      else snapshot.set(path.relative(root, full), await readFile(full, "utf8"));
    }
  }
  await walk(root);
  return snapshot;
}

// ------------------------------------------------------------------- running ----

async function runTune(context, scope = null) {
  const fx = spec(context);
  await flush(context);
  context.before = await treeSnapshot(context.projectDir);
  context.lastResult = await runCli(context, `work tune${scope == null ? "" : ` ${scope}`} --json`);
  assert.equal(context.lastResult.status, 0, `work tune exits 0 (stderr: ${context.lastResult.stderr})`);
  context.report = JSON.parse(context.lastResult.stdout);
  context.after = await treeSnapshot(context.projectDir);
  fx.ran = true;
  return context.report;
}

const documentsOf = (entry) => (entry.provenanceResolution?.resolved ?? []).map((citation) => citation.document);
const about45 = (entry) => documentsOf(entry).some((document) => document.startsWith("wiki/work/45_"));
const promptProposal = (report) => report.proposals.find((proposal) => proposal.class === "prompt-or-brief-revision" && about45(proposal));
const memoryOf = (report) => report.corpus.memory;

// ---------------------------------------------------------------- R1 · evidence ----

registry.define(/^lesson "45\/R13" has (\d+) surfaced, (\d+) honoured and (\d+) departed observations$/, async (context, surfaced, honoured, departed) => {
  assert.equal(Number(surfaced), Number(honoured) + Number(departed), "every surfacing carries one verdict");
  const fx = spec(context);
  fx.verdicts = [...Array(Number(honoured)).fill("honoured"), ...Array(Number(departed)).fill("departed")];
  // Repeated wording in prose must not count for anything: the words the accounting counts are all here.
  fx.lesson.what = `It was seen again; see ${EVIDENCE_FILE}. Honoured honoured departed departed surfaced surfaced recurs recurs recurs recurs from 45/R13.`;
});
registry.define(/^a distinct later lesson explicitly recurs from "45\/R13"$/, async (context) => {
  spec(context).recurrer = true;
});
registry.define(/^the scoped fixture meets tune's existing corpus and provenance floors$/, async (context) => {
  await flush(context);
});
registry.define(/^the operator runs work tune for that scope$/, async (context) => {
  await runTune(context);
});

registry.define(/^the candidate exposes surfaced (\d+), honoured (\d+), departed (\d+) and recurred (\d+)$/, (context, surfaced, honoured, departed, recurred) => {
  const proposal = promptProposal(context.report);
  assert.ok(proposal, "the lesson's candidate is a proposal");
  assert.deepEqual(proposal.evidence.memory.totals, { surfaced: Number(surfaced), honoured: Number(honoured), departed: Number(departed), irrelevant: 0, recurred: Number(recurred) });
});
registry.define(/^its evidence cites the ledger rows and both source lessons$/, (context) => {
  const { memory } = promptProposal(context.report).evidence;
  assert.equal(memory.ledgerRows.length, 3);
  for (const row of memory.ledgerRows) assert.match(row, /^wiki\/work\/45_milestone_m45\/FEEDBACK\.ndjson:[123]$/u);
  assert.ok(memory.sourceLessons.includes("45/R13") && memory.sourceLessons.includes("68/R10"), `both lessons are cited (got ${memory.sourceLessons})`);
  assert.deepEqual(memory.recurrences, ["wiki/work/68_milestone_m68/RETROSPECTIVE.md:3"]);
});
registry.define(/^no count is inferred merely from repeated wording in prose$/, async (context) => {
  const retro = await readFile(path.join(workDir(context), "45_milestone_m45", "RETROSPECTIVE.md"), "utf8");
  assert.ok((retro.match(/recurs/giu) ?? []).length >= 4, "the prose really does repeat the counted words");
  const { totals } = promptProposal(context.report).evidence.memory;
  assert.equal(totals.recurred, 1);
  assert.equal(totals.surfaced, 3);
});

registry.define(/^a candidate's repeated lesson mentions and recall rows all belong to one source document$/, async (context) => {
  const fx = spec(context);
  fx.lesson = { promoted: "none", lessonText: LESSON, what: "It happened. It happened again. It happened a third time.", duplicate: null };
  fx.targetBytes = null;
  fx.verdicts = ["honoured", "departed", "departed"];
});
registry.define(/^its proposal evidence floor requires two distinct source documents$/, async (context) => {
  await flush(context);
});
registry.define(/^tune resolves the candidate's provenance$/, async (context) => {
  await runTune(context);
});
registry.define(/^it retains the insufficient-evidence finding$/, (context) => {
  const found = context.report.findings.filter((finding) => finding.code === "below-evidence-floor" && about45(finding));
  assert.equal(found.length, 1, `one below-evidence-floor finding names the lesson's document (got ${JSON.stringify(context.report.findings.map((finding) => finding.code))})`);
  context.floorFinding = found[0];
});
registry.define(/^it does not count repeated observations as a second source document$/, (context) => {
  assert.equal(context.floorFinding.distinctSourceDocumentCount, 1);
  assert.equal(context.floorFinding.sourceDocuments.length, 1);
  assert.equal(context.report.proposals.some(about45), false, "no proposal rests on the repeated observations");
});

registry.define(/^one selected item has no ledger and another has an invalid recall row$/, async (context) => {
  spec(context).floorsAt = "70";
  await writeItem(context, "45", { retro: section("R13", { promoted: "none" }) });
  await writeItem(context, "46", { retro: section("R1", { meta: FILLER_META, promoted: "none" }), ledger: [observation("ok", "46", "R1", "honoured"), JSON.stringify({ kind: "recall", id: "bad" })] });
  await writeItem(context, "47", { ledger: [observation("fine", "47", "R7", "departed")] });
  context.fx.flushed = true;
});
registry.define(/^tune assembles its evidence$/, async (context) => {
  await ensureWorkStream(context);
  await writeItem(context, spec(context).floorsAt, { retro: fillerLessons(), stories: 3 });
  context.floorsWritten = true;
  context.before = await treeSnapshot(context.projectDir);
  context.lastResult = await runCli(context, "work tune --json");
  assert.equal(context.lastResult.status, 0, `work tune exits 0 (stderr: ${context.lastResult.stderr})`);
  context.report = JSON.parse(context.lastResult.stdout);
});
registry.define(/^the absent ledger contributes zero observations$/, (context) => {
  const memory = memoryOf(context.report);
  assert.equal(memory.ledgers.some((source) => source.includes("45_")), false, "an item with no ledger is not read as one");
  assert.equal(memory.lessons["45/R13"], undefined, "and is given no invented row");
});
registry.define(/^the invalid row is diagnosed with its source instead of silently contributing zero$/, (context) => {
  const memory = memoryOf(context.report);
  assert.equal(memory.complete, false);
  assert.equal(memory.diagnostics.length, 1);
  assert.match(memory.diagnostics[0].source, /^wiki\/work\/46_milestone_m46\/FEEDBACK\.ndjson$/u);
  assert.equal(memory.diagnostics[0].line, 2);
  const finding = context.report.findings.find((entry) => entry.code === "memory-evidence-defect");
  assert.equal(finding.source, memory.diagnostics[0].source);
});
registry.define(/^unrelated valid evidence is not described as corrupted$/, (context) => {
  const memory = memoryOf(context.report);
  assert.equal(memory.lessons["46/R1"].honoured, 1, "the valid row beside the invalid one still counts");
  assert.equal(memory.lessons["47/R7"].departed, 1, "another item's valid ledger is intact");
  const named = [...memory.diagnostics, ...context.report.findings.filter((entry) => entry.code === "memory-evidence-defect")];
  assert.equal(named.some((entry) => String(entry.source).includes("47_")), false);
});

registry.define(/^items "45" and "68" each have recall observations$/, async (context) => {
  const fx = spec(context);
  fx.floorsAt = null;
  await put(context, EVIDENCE_FILE, "# an incident\n");
  await put(context, TARGET_REL, TARGET_BYTES);
  await writeItem(context, "45", {
    retro: section("R13", { promoted: PROMPT, what: `See ${EVIDENCE_FILE}.` }),
    ledger: [observation("a", "45", "R13", "honoured"), observation("b", "45", "R13", "departed")],
  });
  // 68 carries the floor item's stories, and its own lesson repeats 45/R13 and is promoted to the same prompt.
  await writeItem(context, "68", {
    retro: [section("R10", { promoted: PROMPT, recurs: "45/R13", what: `See ${EVIDENCE_FILE}.` }), fillerLessons()].join("\n"),
    ledger: [observation("c", "45", "R13", "honoured")],
    stories: 3,
  });
});
registry.define(/^tune is scoped to "([^"]+)"$/, async (context, scope) => {
  await runTune(context, scope);
});
registry.define(/^only observations owned by the selected items contribute to its observation counts$/, (context) => {
  const memory = memoryOf(context.report);
  assert.deepEqual(memory.ledgers, ["wiki/work/68_milestone_m68/FEEDBACK.ndjson"], "the unselected item's ledger is not opened");
  const counts = memory.lessons["45/R13"];
  assert.deepEqual([counts.surfaced, counts.honoured, counts.departed], [1, 1, 0], "only the selected item's own observation counts");
  assert.equal(counts.recurred, 1, "the selected retrospective's explicit recurrence counts");
});
registry.define(/^referenced prior lessons can be resolved for provenance without importing unrelated ledger observations$/, (context) => {
  const proposal = context.report.proposals.find((entry) => entry.class === "prompt-or-brief-revision");
  assert.ok(proposal, "the recurring lesson's candidate is a proposal");
  assert.ok(documentsOf(proposal).some((document) => document.startsWith("wiki/work/45_")), "the earlier lesson resolved as a source document");
  assert.equal(proposal.evidence.memory.ledgerRows.some((row) => row.includes("45_milestone")), false, "none of the earlier item's own ledger rows came with it");
});
registry.define(/^the corpus report declares which source lane it read$/, (context) => {
  const memory = memoryOf(context.report);
  assert.equal(memory.lane, "recall-ledger");
  assert.deepEqual(memory.items.filter((ref) => ref.startsWith("45")), []);
  assert.match(memory.what, /ledgers/u);
});

// ------------------------------------------------------------------- R2 · patch ----

registry.define(/^a recurring lesson meets the existing proposal evidence floor$/, async (context) => {
  spec(context).recurrer = true;
  await flush(context);
});
registry.define(/^its unambiguous target is "([^"]+)"$/, async (context, target) => {
  const fx = spec(context);
  fx.lesson.promoted = target;
  assert.equal(target, PROMPT, "the fixture's destination is the one the scenario names");
  await flush(context);
});
registry.define(/^its Lesson text is "(.+)"$/, async (context, text) => {
  assert.equal(text, LESSON);
  spec(context).lesson.lessonText = text;
  await flush(context);
});
registry.define(/^the authored target contains a known byte sequence$/, async (context) => {
  spec(context).targetBytes = TARGET_BYTES;
  await flush(context);
});
registry.define(/^tune forms the prompt revision proposal$/, async (context) => {
  await runTune(context);
});

registry.define(/^its patch contains that exact sequence as from and a deterministic appended lesson block as to$/, (context) => {
  const proposal = promptProposal(context.report);
  assert.ok(proposal?.patch, `a patch is computed (got ${JSON.stringify(proposal?.reason)})`);
  assert.equal(proposal.patch.from, TARGET_BYTES);
  assert.equal(proposal.patch.to, `${TARGET_BYTES}\n${blockFor("45/R13", LESSON)}`);
  context.proposal = proposal;
});
registry.define(/^the block identifies the canonical lesson ref and contains the exact Lesson text$/, (context) => {
  assert.match(context.proposal.patch.to, /<!-- aof:lesson 45\/R13 -->/u);
  assert.ok(context.proposal.patch.to.includes(LESSON));
  assert.equal(context.proposal.patch.lesson, "45/R13");
});
registry.define(/^its lane remains advisory with no automatic applier$/, (context) => {
  assert.equal(context.proposal.lane, "advisory");
  assert.equal(context.proposal.applier, null);
  assert.equal(Object.prototype.hasOwnProperty.call(context.proposal, "verdict"), false, "the acceptor never assessed it");
});
registry.define(/^its patch is not marked replacement-prose-not-computable$/, (context) => {
  assert.notEqual(context.proposal.reason?.code, "replacement-prose-not-computable");
});
registry.define(/^the target, configuration, retrospectives and ledgers remain byte-identical$/, (context) => {
  assert.deepEqual(context.after, context.before, "every byte under the project is unchanged by the command");
  assert.equal(context.after.get(path.join("packages", "core", "assets", "commands", "refine.md")), TARGET_BYTES);
});

registry.define(/^the target already contains the exact block for the canonical lesson ref and text$/, async (context) => {
  const fx = spec(context);
  fx.recurrer = true;
  fx.targetBytes = `${TARGET_BYTES}\n${blockFor("45/R13", LESSON)}`;
  await flush(context);
});
registry.define(/^tune runs again with the same evidence$/, async (context) => {
  context.first = await runTune(context);
  context.firstStdout = context.lastResult.stdout;
  context.second = await runTune(context);
});
registry.define(/^it reports already-in-force and no duplicate patch$/, (context) => {
  const found = context.second.findings.filter((finding) => finding.code === "already-in-force" && about45(finding));
  assert.equal(found.length, 1);
  assert.equal(found[0].lesson, "45/R13");
  assert.equal(context.second.proposals.some((proposal) => proposal.class === "prompt-or-brief-revision" && about45(proposal)), false);
});
registry.define(/^repeated reports are deterministic$/, (context) => {
  assert.equal(context.lastResult.stdout, context.firstStdout, "two runs over the same evidence print the same bytes");
});

registry.define(/^a prompt target is lexically inside the repository but resolves through a symlink outside it$/, async (context) => {
  const outside = path.join(context.root, "outside");
  await mkdir(outside, { recursive: true });
  await writeFile(path.join(outside, "refine.md"), `# outside\n${SECRET}\n`, "utf8");
  const fx = spec(context);
  fx.recurrer = true;
  fx.lesson.promoted = "prompt:linked/refine.md";
  fx.targetBytes = null;
  await flush(context);
  // A junction needs no privilege on Windows and is an ordinary symlink elsewhere; both resolve outside.
  await symlink(outside, path.join(context.projectDir, "linked"), "junction");
});
registry.define(/^tune evaluates the target through an instrumented content reader$/, async (context) => {
  await runTune(context);
});
registry.define(/^it reports a target-boundary finding$/, (context) => {
  const entries = context.report.proposals.filter(about45);
  assert.ok(entries.some((entry) => entry.reason?.code === "target-boundary"), `a target-boundary reason is reported (got ${JSON.stringify(entries.map((entry) => entry.reason))})`);
  assert.ok(entries.every((entry) => entry.patch == null));
});
registry.define(/^the outside target's contents are never read or included in output$/, (context) => {
  assert.equal(context.lastResult.stdout.includes(SECRET), false);
  assert.equal(context.lastResult.stderr.includes(SECRET), false);
  assert.equal(JSON.stringify(context.report).includes("# outside"), false);
});

// A recurring lesson candidate, one condition at a time. Each starts from the working fixture and breaks one thing.
const CONDITIONS = {
  "no promotion target": (fx) => { fx.lesson.promoted = "none"; },
  "a rule target": (fx) => { fx.lesson.promoted = "rule:.aof/rules/x.md"; },
  "two conflicting prompt targets": (fx) => { fx.lesson.promoted = `${PROMPT} prompt:packages/core/assets/commands/other.md`; },
  "conflicting lesson text for one ref": (fx) => { fx.lesson.duplicate = "A different sentence for the same lesson."; },
  "an empty Lesson field": (fx) => { fx.lesson.lessonText = ""; },
  "a missing target file": (fx) => { fx.targetBytes = null; },
  "an absolute target path": (fx) => { fx.lesson.promoted = "prompt:/etc/aof-refine.md"; fx.targetBytes = null; },
  "a parent traversal target path": (fx) => { fx.lesson.promoted = "prompt:../outside/refine.md"; fx.targetBytes = null; },
  "a generated .claude command target": (fx) => { fx.lesson.promoted = "prompt:.claude/commands/aof/refine.md"; },
};
registry.define(/^a recurring lesson candidate has "([^"]+)"$/, async (context, condition) => {
  assert.ok(CONDITIONS[condition], `unknown condition ${condition}`);
  const fx = spec(context);
  CONDITIONS[condition](fx);
  await flush(context);
  if (condition === "a generated .claude command target") await put(context, ".claude/commands/aof/refine.md", "# generated\n");
});
registry.define(/^tune evaluates its prompt revision$/, async (context) => {
  await runTune(context);
});

const RESULTS = {
  "no computable target": { proposal: "no-target-to-change" },
  "no prompt revision": { proposal: "no-prompt-revision" },
  "candidate fact conflict": { finding: "candidate-fact-conflict" },
  "conflicting replacement text": { proposal: "conflicting-replacement-text" },
  "replacement text missing": { proposal: "replacement-text-missing" },
  "target unreadable": { proposal: "target-unreadable" },
  "target boundary finding": { proposal: "target-boundary" },
  "authored target required": { proposal: "authored-target-required" },
};
registry.define(/^it reports "([^"]+)" with no applicable patch$/, (context, result) => {
  const expected = RESULTS[result];
  assert.ok(expected, `unknown result ${result}`);
  const proposals = context.report.proposals.filter(about45);
  const findings = context.report.findings.filter(about45);
  if (expected.proposal) {
    assert.ok(proposals.some((proposal) => proposal.reason?.code === expected.proposal), `${result}: expected reason ${expected.proposal} (got ${JSON.stringify(proposals.map((proposal) => proposal.reason))} / findings ${JSON.stringify(findings.map((finding) => finding.code))})`);
  } else {
    assert.ok(findings.some((finding) => finding.code === expected.finding), `${result}: expected finding ${expected.finding} (got ${JSON.stringify(findings.map((finding) => finding.code))})`);
  }
  assert.ok(proposals.every((proposal) => proposal.patch == null), "and none of them carries a patch");
});
registry.define(/^no target content is written$/, (context) => {
  assert.deepEqual(context.after, context.before, "every byte under the project is unchanged by the command");
});

export async function runStep(context, step) {
  await registry.run(context, step);
}
