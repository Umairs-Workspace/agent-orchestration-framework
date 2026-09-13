// Traceability wiring for milestone 70 / story 03 — every @executable scenario and
// every Examples row across tasks 00/01/02. The declaration/extractor/compiler checks
// are pure; doctor/status checks use hermetic work-stream fixtures.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  compilePhaseBrief,
  declaredAdrsInStory,
  extractAdrBlock,
  extractAdrBlocks,
  extractFitnessRegister,
  normalizeAdrDeclaration,
  PHASE_BRIEF_CEILING_CHARS,
} from "../../src/phase-brief.mjs";
import { compileBriefForItem } from "../../src/phase-brief-read.mjs";
import { budgetGroup } from "../../src/work/doctor-budget.mjs";
import { doctorWork } from "../../src/work/doctor.mjs";
import { validateWork } from "../../src/commands/validate.mjs";
import { loadWorkspace } from "../../src/work.mjs";
import { invoke } from "../../src/command-core.mjs";
import { seedGreenRegressionGate } from "../support/regression-gate-fixture.mjs";

const ARCHITECTURE = [
  "# Architecture",
  "## ADR-001 — First",
  "FIRST BODY",
  "## ADR-002 — Second",
  "SECOND BODY",
  "## ADR-003 — Third",
  "THIRD BODY",
  "## Fitness functions",
  "| id | invariant |",
  "|---|---|",
  "| FF-1 | one architecture artifact |",
  "## Story partition",
  "PARTITION BODY",
  "",
].join("\n");

function milestoneDoc(status = "in-progress", number = "70", slug = "warm") {
  return `---\ntype: milestone\nnumber: ${number}\nslug: ${slug}\ntitle: Warm\nstatus: ${status}\nowner: product-owner\ncreated: 2026-08-01\nupdated: 2026-08-01\nschema: 1\naofVersion: 0.1.0\n---\n# Warm\n`;
}

function storyDoc({ status = "in-progress", adrs, number = "03", parent = "70", slug = "slice" } = {}) {
  const declaration = adrs === undefined ? "" : `adrs: ${adrs}\n`;
  const parentLine = parent == null ? "" : `parent: ${parent}\n`;
  return `---\ntype: story\nnumber: ${number}\nslug: ${slug}\ntitle: Slice\n${parentLine}status: ${status}\nowner: product-owner\ncreated: 2026-08-01\nupdated: 2026-08-01\n${declaration}schema: 1\naofVersion: 0.1.0\n---\n# Slice\n`;
}

async function makeStoryFixture({ adrs, architecture = ARCHITECTURE, standalone = false } = {}) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-70-03-story-")));
  const home = path.join(root, "home");
  const repo = path.join(root, "repo");
  const workDir = path.join(repo, "wiki", "work");
  const milestoneDir = path.join(workDir, "70_milestone_warm");
  const storyDir = standalone
    ? path.join(workDir, "03_story_slice")
    : path.join(milestoneDir, "stories", "03_story_slice");
  await mkdir(path.join(repo, ".aof"), { recursive: true });
  await mkdir(home, { recursive: true });
  await mkdir(storyDir, { recursive: true });
  await writeFile(path.join(repo, ".aof", "aof.config.json"), JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" } }), "utf8");
  if (!standalone) {
    await writeFile(path.join(milestoneDir, "SPEC.md"), milestoneDoc(), "utf8");
    await writeFile(path.join(milestoneDir, "ARCHITECTURE.md"), architecture, "utf8");
  }
  await writeFile(path.join(storyDir, "STORY.md"), storyDoc({ adrs, parent: standalone ? null : "70" }), "utf8");
  const env = { AOF_GLOBAL_HOME: home };
  const workspace = await loadWorkspace(repo, undefined, { env });
  return { root, repo, workDir, milestoneDir, storyDir, workspace, env };
}

async function withStory(options, body) {
  const fixture = await makeStoryFixture(options);
  try { return await body(fixture); } finally { await rm(fixture.root, { recursive: true, force: true }); }
}

function textWithLines(count, prefix = "line") {
  return Array.from({ length: count }, (_, index) => `${prefix} ${index + 1}`).join("\n") + (count > 0 ? "\n" : "");
}

async function makeBudgetFixture({
  milestoneStatus = "in-progress",
  storyStatus = "in-review",
  architectureLines = 2,
  storyLines = null,
  featureLines = null,
  budgets = { architecture: 3, story: 20, feature: 20, spec: 50 },
} = {}) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-70-03-budget-")));
  const home = path.join(root, "home");
  const repo = path.join(root, "repo");
  const workDir = path.join(repo, "wiki", "work");
  const milestoneDir = path.join(workDir, "70_milestone_budget");
  const storyDir = path.join(milestoneDir, "stories", "03_story_slice");
  await mkdir(path.join(repo, ".aof"), { recursive: true });
  await mkdir(path.join(storyDir, "tasks"), { recursive: true });
  await mkdir(home, { recursive: true });
  await writeFile(path.join(repo, ".aof", "aof.config.json"), JSON.stringify({ name: "fixture", work: { dir: "./wiki/work", doctor: { budgets } } }), "utf8");
  await writeFile(path.join(milestoneDir, "SPEC.md"), milestoneDoc(milestoneStatus, "70", "budget"), "utf8");
  await writeFile(path.join(milestoneDir, "ARCHITECTURE.md"), textWithLines(architectureLines, "architecture"), "utf8");
  const baseStory = storyDoc({ status: storyStatus });
  const storyText = storyLines == null || storyLines <= baseStory.trimEnd().split("\n").length
    ? baseStory
    : baseStory.trimEnd() + "\n" + textWithLines(storyLines - baseStory.trimEnd().split("\n").length, "story");
  await writeFile(path.join(storyDir, "STORY.md"), storyText, "utf8");
  if (featureLines != null) await writeFile(path.join(storyDir, "tasks", "00_contract.feature"), textWithLines(featureLines, "feature"), "utf8");
  const env = { AOF_GLOBAL_HOME: home };
  const workspace = await loadWorkspace(repo, undefined, { env });
  return {
    root, workspace, workDir, milestoneDir, storyDir,
    ctx: { workspace, globalWorkStoreOptions: { env }, effectsJournalOptions: { env } },
  };
}

async function withBudget(options, body) {
  const fixture = await makeBudgetFixture(options);
  try { return await body(fixture); } finally { await rm(fixture.root, { recursive: true, force: true }); }
}

async function budgetFindings(fixture, { acceptingRef = null, scope } = {}) {
  return doctorWork(fixture.workDir, fixture.workspace.config, scope, {
    groups: [budgetGroup],
    ...(acceptingRef ? { acceptingRef } : {}),
  });
}

async function assertCode(action, code) {
  let caught;
  try { await action(); } catch (error) { caught = error; }
  assert.equal(caught?.code, code, `expected ${code}, got ${caught?.code ?? "no refusal"}`);
  return caught;
}

export const architectureSliceTests = [
  // ── task 00: adrs declared ────────────────────────────────────────────────
  {
    name: "70/03 task00 a story declares ADR ids and the reader preserves declaration order",
    run: () => assert.deepEqual(declaredAdrsInStory(storyDoc({ adrs: "[ADR-002, ADR-001]" })), { ids: ["ADR-002", "ADR-001"], malformed: false }),
  },
  {
    name: "70/03 task00 omission is benign but means the milestone register still binds",
    run: () => withStory({}, async ({ storyDir, milestoneDir }) => {
      const declaration = declaredAdrsInStory(await readFile(path.join(storyDir, "STORY.md"), "utf8"));
      const brief = await compileBriefForItem({ itemRef: "70/03", phase: "continue", itemDir: storyDir, milestoneDir });
      assert.deepEqual(declaration.ids, []);
      assert.ok(brief.sections.some((section) => section.id === "fitness"), "the milestone register is carried");
    }),
  },
  {
    name: "70/03 task00 every existing declaration-free story remains valid",
    run: () => withStory({}, async ({ workDir, workspace }) => {
      assert.equal((await validateWork(workDir, workspace.config, undefined)).filter((finding) => /ADR declaration/i.test(finding.problem)).length, 0);
    }),
  },
  {
    name: "70/03 task00 an ADR absent from its own milestone is surfaced, never collapsed to no declaration",
    run: () => withStory({ adrs: "[ADR-999]" }, async ({ workDir, workspace }) => {
      const findings = (await validateWork(workDir, workspace.config, "70/03")).filter((finding) => /ADR declaration/i.test(finding.problem));
      assert.equal(findings.length, 1);
      assert.match(findings[0].problem, /ADR-999/);
    }),
  },
  {
    name: "70/03 task00 a standalone story declaration is unresolved rather than borrowed from another item",
    run: () => withStory({ adrs: "[ADR-001]", standalone: true }, async ({ workDir, workspace }) => {
      const [finding] = (await validateWork(workDir, workspace.config, "03")).filter((entry) => /ADR declaration/i.test(entry.problem));
      assert.match(finding.problem, /no parent milestone/);
    }),
  },
  {
    name: "70/03 task00 outline declaration shapes (6 rows)",
    run: async () => {
      const rows = [
        ["[ADR-001]", ["ADR-001"], false],
        ["[ADR-003, ADR-001]", ["ADR-003", "ADR-001"], false],
        ["[]", [], false],
        [undefined, [], false],
        ["[ADR-001, ADR-001]", ["ADR-001"], false],
        ["ADR-001", [], true],
      ];
      for (const [raw, ids, malformed] of rows) {
        const result = declaredAdrsInStory(storyDoc({ adrs: raw }));
        assert.deepEqual(result, { ids, malformed }, String(raw));
      }
      assert.deepEqual(normalizeAdrDeclaration(["ADR-002", "ADR-002", "ADR-001"]).ids, ["ADR-002", "ADR-001"]);
      await withStory({ adrs: "ADR-001" }, async ({ workDir, workspace }) => {
        const findings = await validateWork(workDir, workspace.config, "70/03");
        assert.ok(findings.some((finding) => /ADR declaration.*inline list/i.test(finding.problem)), "the malformed row is reported by the validity check");
      });
    },
  },

  // ── task 01: ADR block addressable ────────────────────────────────────────
  {
    name: "70/03 task01 one declared ADR is returned whole without another ADR's content",
    run: () => {
      const block = extractAdrBlock(ARCHITECTURE, "ADR-002");
      assert.match(block, /^## ADR-002/);
      assert.match(block, /SECOND BODY/);
      assert.doesNotMatch(block, /FIRST BODY|THIRD BODY/);
    },
  },
  {
    name: "70/03 task01 an ADR block ends exactly where the next ADR starts",
    run: () => {
      const block = extractAdrBlock("## ADR-001 — one\nONE\n## ADR-002 — two\nTWO", "ADR-001");
      assert.equal(block, "## ADR-001 — one\nONE\n");
    },
  },
  {
    name: "70/03 regression fenced ADR headings are examples, not addresses or block boundaries",
    run: () => {
      const source = "## ADR-001 — real\nBEFORE\n```md\n## ADR-998 — fenced example\nEXAMPLE\n```\nAFTER\n## ADR-002 — next\nNEXT\n";
      assert.equal(extractAdrBlock(source, "ADR-998"), null, "the fenced example is not addressable");
      const real = extractAdrBlock(source, "ADR-001");
      assert.match(real, /AFTER/, "the fenced heading did not cut the real block short");
      assert.doesNotMatch(real, /NEXT/, "the next real ADR still ends the block");
    },
  },
  {
    name: "70/03 regression commented ADR headings are examples, not addresses or block boundaries",
    run: () => {
      const source = "## ADR-001 — real\nBEFORE\n<!--\n## ADR-997 — commented example\n-->\nAFTER\n## ADR-002 — next\nNEXT\n";
      assert.equal(extractAdrBlock(source, "ADR-997"), null, "the commented example is not addressable");
      assert.match(extractAdrBlock(source, "ADR-001"), /AFTER/, "the commented heading did not cut the real block short");
    },
  },
  {
    name: "70/03 regression a fenced fake fitness register preceding the real one is ignored and exact real boundaries are preserved",
    run: () => {
      const source = "# Architecture\n```md\n## Fitness functions\n| FF-FAKE | fenced |\n## Fake boundary\nFAKE\n```\n## ADR-001 — real\nADR BODY\n## Fitness functions\n| FF-REAL | registered |\n## Story partition\nPARTITION BODY\n";
      assert.equal(
        extractFitnessRegister(source),
        "## Fitness functions\n| FF-REAL | registered |\n",
      );
    },
  },
  {
    name: "70/03 regression an HTML-commented fake fitness register preceding the real one is ignored and exact real boundaries are preserved",
    run: () => {
      const source = "# Architecture\n<!--\n## Fitness functions\n| FF-FAKE | commented |\n## Fake boundary\nFAKE\n-->\n## ADR-001 — real\nADR BODY\n## Fitness functions\n| FF-REAL | registered |\n## Story partition\nPARTITION BODY\n";
      assert.equal(
        extractFitnessRegister(source),
        "## Fitness functions\n| FF-REAL | registered |\n",
      );
    },
  },
  {
    name: "70/03 task01 an absent or similarly numbered id resolves to nothing",
    run: () => {
      assert.equal(extractAdrBlock(ARCHITECTURE, "ADR-020"), null);
      assert.equal(extractAdrBlock(ARCHITECTURE, "ADR-00"), null);
    },
  },
  {
    name: "70/03 task01 extraction consumes one architecture text and expects no sibling ADR files",
    run: () => {
      const result = extractAdrBlocks(ARCHITECTURE, ["ADR-001", "ADR-003"]);
      assert.deepEqual(result.blocks.map((block) => block.id), ["ADR-001", "ADR-003"]);
      assert.equal(result.missing.length, 0);
    },
  },
  {
    name: "70/03 task01 a story brief carries only its two declared ADR slices",
    run: () => withStory({ adrs: "[ADR-001, ADR-003]" }, async ({ storyDir, milestoneDir }) => {
      const brief = await compileBriefForItem({ itemRef: "70/03", phase: "continue", itemDir: storyDir, milestoneDir });
      const slice = brief.sections.find((section) => section.id === "architecture");
      assert.match(slice.text, /FIRST BODY/);
      assert.match(slice.text, /THIRD BODY/);
      assert.doesNotMatch(slice.text, /SECOND BODY|FF-1|PARTITION BODY/);
      assert.ok(!brief.sections.some((section) => section.id === "fitness"), "declared slices replace the fallback register");
    }),
  },
  {
    name: "70/03 task01 a declaration-free story gets the fitness register, not the whole architecture",
    run: () => withStory({}, async ({ storyDir, milestoneDir }) => {
      const brief = await compileBriefForItem({ itemRef: "70/03", phase: "continue", itemDir: storyDir, milestoneDir });
      const register = brief.sections.find((section) => section.id === "fitness");
      assert.match(register.text, /FF-1/);
      assert.doesNotMatch(register.text, /FIRST BODY|PARTITION BODY/);
      assert.ok(!brief.sections.some((section) => section.id === "architecture"));
    }),
  },
  {
    name: "70/03 regression slicing and register fallback apply only to stories; milestone briefs preserve the full architecture decisions",
    run: () => withStory({}, async ({ milestoneDir }) => {
      const brief = await compileBriefForItem({ itemRef: "70", itemType: "milestone", phase: "refine", itemDir: milestoneDir, milestoneDir });
      const decisions = brief.sections.find((section) => section.id === "architecture");
      assert.match(decisions.title, /full milestone record/i);
      assert.match(decisions.text, /FIRST BODY/);
      assert.match(decisions.text, /SECOND BODY/);
      assert.match(decisions.text, /FF-1/);
      assert.match(decisions.text, /PARTITION BODY/);
      assert.ok(!brief.sections.some((section) => section.id === "fitness"), "the register is not duplicated beside the full architecture record");
    }),
  },
  {
    name: "70/03 task01 over-ceiling declared slices are bounded and name every dropped ADR",
    run: () => {
      const ids = ["ADR-101", "ADR-102"];
      const brief = compilePhaseBrief({ itemRef: "70/03", phase: "continue", story: "story", tasks: ["task"], architecture: { declared: ids, text: "X".repeat(PHASE_BRIEF_CEILING_CHARS * 2) } });
      assert.ok(brief.text.length <= brief.ceiling);
      assert.equal(brief.truncated, true);
      assert.match(brief.notice, /ARCHITECTURE SLICE/);
      for (const id of ids) assert.match(brief.notice, new RegExp(id));
    },
  },
  {
    name: "70/03 task01 outline exact addressing (5 rows)",
    run: () => {
      assert.deepEqual(extractAdrBlocks(ARCHITECTURE, ["ADR-002"]).blocks.map((b) => b.id), ["ADR-002"]);
      assert.deepEqual(extractAdrBlocks(ARCHITECTURE, ["ADR-003", "ADR-001"]).blocks.map((b) => b.id), ["ADR-001", "ADR-003"], "document order wins for extracted blocks");
      assert.deepEqual(extractAdrBlocks(ARCHITECTURE, ["ADR-999"]), { blocks: [], missing: ["ADR-999"] });
      const mixed = extractAdrBlocks(ARCHITECTURE, ["ADR-002", "ADR-999"]);
      assert.deepEqual(mixed.blocks.map((b) => b.id), ["ADR-002"]);
      assert.deepEqual(mixed.missing, ["ADR-999"]);
      assert.deepEqual(extractAdrBlocks(ARCHITECTURE, []), { blocks: [], missing: [] });
    },
  },

  // ── task 02: budget binds at accept ───────────────────────────────────────
  {
    name: "70/03 task02 an item within budget can pass the acceptance status door",
    run: () => withBudget({ architectureLines: 3 }, async ({ ctx, milestoneDir }) => {
      // 96/04 — the milestone accept door now also holds the regression gate. Seed its green row so
      // the move reaches THIS suite's claim (the budget door) instead of a newer, unrelated refusal.
      await seedGreenRegressionGate(milestoneDir);
      const result = await invoke("work:status", { ref: "70", status: "done", now: "2026-08-22T00:00:00.000Z" }, ctx);
      assert.equal(result.status, "done");
      assert.match(await readFile(path.join(milestoneDir, "SPEC.md"), "utf8"), /^status: done$/m);
    }),
  },
  {
    name: "70/03 task02 an over-budget item is refused at accept with artifact, size and budget",
    run: () => withBudget({ architectureLines: 4 }, async ({ ctx, milestoneDir }) => {
      const error = await assertCode(() => invoke("work:status", { ref: "70", status: "done" }, ctx), "artifact-budget-exceeded");
      assert.match(error.message, /ARCHITECTURE\.md is 4 lines, over the 3-line budget/);
      assert.match(await readFile(path.join(milestoneDir, "SPEC.md"), "utf8"), /^status: in-progress$/m, "refusal writes nothing");
    }),
  },
  {
    name: "70/03 task02 an open over-budget item is warned, not refused",
    run: () => withBudget({ architectureLines: 4 }, async (fixture) => {
      const [finding] = await budgetFindings(fixture, { scope: "70" });
      assert.equal(finding.severity, "warn");
      assert.equal(finding.code, "doc-over-budget");
    }),
  },
  {
    name: "70/03 task02 the stream-wide sweep leaves already accepted overages as warnings",
    run: () => withBudget({ milestoneStatus: "done", architectureLines: 4 }, async (fixture) => {
      const findings = await budgetFindings(fixture);
      assert.ok(findings.length > 0);
      assert.ok(findings.every((finding) => finding.severity === "warn"));
      const alreadyAccepted = await invoke("work:status", { ref: "70", status: "done", ifApplicable: true }, fixture.ctx);
      assert.equal(alreadyAccepted.moved, false, "a done item is not re-accepted or re-litigated by the budget gate");
      assert.equal(alreadyAccepted.code, "status-edge-not-applicable");
    }),
  },
  {
    name: "70/03 task02 an artifact exactly at budget raises no refusal",
    run: () => withBudget({ architectureLines: 3 }, async (fixture) => {
      assert.equal((await budgetFindings(fixture, { acceptingRef: "70", scope: "70" })).filter((f) => f.severity === "error").length, 0);
    }),
  },
  {
    name: "70/03 task02 configured budgets have one resolution path for warning and refusal",
    run: () => withBudget({ architectureLines: 6, budgets: { architecture: 5, story: 200, feature: 200, spec: 200 } }, async (fixture) => {
      const [warning] = await budgetFindings(fixture, { scope: "70" });
      const [refusal] = await budgetFindings(fixture, { acceptingRef: "70", scope: "70" });
      assert.equal(warning.severity, "warn");
      assert.equal(refusal.severity, "error");
      assert.equal(warning.message, refusal.message);
      assert.match(refusal.message, /5-line budget/);
    }),
  },
  {
    name: "70/03 task02 outline one measurement at open and accept gates (6 rows)",
    run: async () => {
      const rows = [
        [{ architectureLines: 4 }, "70", null, "warn"],
        [{ architectureLines: 4 }, "70", "70", "error"],
        [{ architectureLines: 3 }, "70", "70", null],
        [{ architectureLines: 2 }, "70", "70", null],
        [{ featureLines: 21 }, "70/03", "70/03", "error"],
        [{ storyLines: 21 }, "70/03", "70/03", "error"],
      ];
      for (const [options, scope, acceptingRef, severity] of rows) {
        await withBudget(options, async (fixture) => {
          const findings = await budgetFindings(fixture, { scope, acceptingRef });
          const matching = findings.filter((finding) => acceptingRef == null || finding.severity === "error");
          if (severity == null) assert.equal(matching.length, 0, JSON.stringify(options));
          else assert.ok(matching.some((finding) => finding.severity === severity), JSON.stringify(options));
        });
      }
    },
  },
];
