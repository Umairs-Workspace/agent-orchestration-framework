// Traceability wiring for milestone 70 / story 05 (brief-carries-the-contract) — tasks 00
// and 01.
//
//   tasks/00_the-contract-reaches-the-phase.feature  (@executable)
//   tasks/01_the-budget-is-spent.feature             (@executable)
//
// Both tasks exercise the PURE COMPILER (`src/phase-brief.mjs`) and its addressing helpers
// directly — no PTY, no worktree, no `claude` binary — which is exactly what ADR-002's
// purity buys. Task 02 is the REAL-STREAM half and lives in
// test/work/brief-pinned-to-the-stream.test.mjs, because a guard that only ever sees data shaped
// to pass is not a guard. One test object per @executable scenario; Scenario-Outline rows
// are folded into one entry each.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  addressArchitecture,
  addressDependencies,
  addressFitnessRegister,
  addressObjective,
  addressStory,
  addressTaskContracts,
  compilePhaseBrief,
  condenseArchitectureSlice,
  condenseFitnessRegister,
  condenseStory,
  condenseTaskContracts,
  BRIEF_BOUNDED_CONDENSERS,
  BRIEF_NON_CONDENSABLE_SECTIONS,
  BRIEF_SECTION_CONDENSERS,
  BRIEF_SECTION_PRIORITY,
  BRIEF_SECTION_SOURCES,
  PHASE_BRIEF_CEILING_CHARS,
  PHASE_BRIEF_CEILING_TOKENS,
  PHASE_BRIEF_CHARS_PER_TOKEN,
  PHASE_BRIEF_MAX_CHARS,
} from "../../src/phase-brief.mjs";
import { compileBriefForItem } from "../../src/phase-brief-read.mjs";
// The `.feature` parse has ONE home (52/05, F-52-05-D — three copies that disagreed),
// and reading a compiled brief has one too. Neither is re-derived here.
import { scenarioTitles } from "../support/feature-parse.mjs";
import { dispositionOf, sectionOf } from "../support/phase-brief-view.mjs";
import { srcFilesContaining } from "../support/read-src-files.mjs";

// ── fixtures shaped like the stream, then SIZED deliberately ────────────────────────────
//
// Every fixture below is Gherkin/Markdown with real structure, because the whole point of
// this story is that the reductions are STRUCTURE-AWARE. Sizes are driven by the number of
// scenarios and the length of the step prose, never by a wall of one repeated character —
// except where a scenario is explicitly about a section with no structure at all.

// This repository root — the subject of the src/** scan in the ceiling row below.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const VERIFICATION_TAGS = new Set(["@executable", "@manual", "@uat"]);

function gherkin({ tag = "@executable", feature = "A feature", scenarios = 3, steps = 4, prose = 120, rule = null, scenarioTag = null } = {}) {
  const lines = [`${tag} @cli @work`, `Feature: ${feature}`, ""];
  lines.push(`  ${"Narrative prose that a phase does not need in a brief. ".repeat(Math.max(1, Math.ceil(prose / 52)))}`, "");
  if (rule != null) lines.push(`  Rule: ${rule}`, "");
  for (let index = 0; index < scenarios; index += 1) {
    if (scenarioTag != null) lines.push(`  ${scenarioTag}`);
    lines.push(`  Scenario: ${feature} case ${index + 1} behaves as its author wrote it`);
    for (let step = 0; step < steps; step += 1) {
      lines.push(`    Given a step body of ${"detail ".repeat(Math.max(1, Math.ceil(prose / 7)))}`);
    }
    lines.push("");
  }
  lines.push("  Scenario Outline: outline for <case>", "    Given <case>", "    Then it holds", "",
    "    Examples: rows", "      | case |", "      | one  |", "      | two  |", "");
  return lines.join("\n");
}

const SMALL_CONTRACTS = [gherkin({ feature: "A small contract", scenarios: 2, steps: 2, prose: 40 })];
const HUGE_CONTRACTS = [
  gherkin({ feature: "A contract far past the ceiling", scenarios: 8, steps: 20, prose: 400 }),
  gherkin({ tag: "@manual", feature: "A second contract in the same story", scenarios: 6, steps: 20, prose: 400 }),
];
// Past the ceiling even at the headline form: hundreds of scenarios, each with a long title.
const OVERWHELMING_CONTRACTS = [
  gherkin({ feature: `A contract whose headlines alone overflow ${"x".repeat(300)}`, scenarios: 300, steps: 2, prose: 40 }),
];

const STORY_RECORD = `---
type: story
number: 05
slug: fixture
adrs: [ADR-002]
---
<!--
  STORY.md — the scaffold comment a record carries and a brief must never inherit.
-->
# 05 · The fixture story

## User story

As a phase handed a brief instead of a tree, I want the acceptance criteria I must satisfy.

## Tasks

- [ ] \`tasks/00_a.feature\` — the first task.

## Notes

${"Measured at the gate, and useful to refine but not to a build phase. ".repeat(20)}
`;

const MILESTONE_SPEC = `---
type: milestone
number: 70
slug: fixture
---
# 70 · Fixture

## Objective

${"The phase is handed its context instead of rediscovering it. ".repeat(12)}

## Scope

${"Everything the objective block is not, and which must never reach the brief. ".repeat(120)}

## Out of scope

${"More of the same. ".repeat(200)}
`;

const ARCHITECTURE_RECORD = `---
doc: architecture
---
# Fixture · Architecture

## ADR-001 — The first decision

**Status.** Accepted.

**Context.** ${"Context prose the brief drops when the budget is tight. ".repeat(20)}

**Decision.** The first decision, stated once and briefly.

**Consequences.** ${"Consequence prose the brief drops when the budget is tight. ".repeat(20)}

## ADR-002 — The second decision

**Status.** Accepted.

**Context.** ${"Context prose the brief drops when the budget is tight. ".repeat(20)}

**Decision.** The second decision, which is the one this story declares.

**Consequences.** ${"Consequence prose the brief drops when the budget is tight. ".repeat(20)}

## Fitness functions

<!-- Each structural invariant from an ADR, paired with the arch-test that enforces it in CI.
     This instructional comment is scaffolding, and it is what the register's reduction drops. -->

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-0001 | the first invariant holds everywhere | \`test/arch/acd-one.test.mjs\` | ADR-001 |
| FF-0002 | the second invariant holds everywhere | \`test/arch/acd-two.test.mjs\` | ADR-002 |

## Story partition

Never part of the register block.
`;

// ── THE POINTERS, PINNED BY LITERAL ─────────────────────────────────────────────────────
//
// `BRIEF_SECTION_SOURCES` is the compiler's answer to "where is the full text read". An
// assertion that compares the compiler's OUTPUT against that same constant proves only that
// one constant equals itself: rewrite `BRIEF_SECTION_SOURCES.tasks` to "elsewhere" and every
// such assertion stays green while every condensed contract in the stream points a phase at
// nowhere — which makes task 00's `a condensed section says where the full text lives`
// self-proving. So every pointer assertion below ALSO matches a literal naming the real
// artefact, written here and nowhere else. (The declaration-level half of this — that every
// declared section's source names a real artefact — lives with the frozen declarations it
// is about, in test/arch/work/acd-phase-brief-bounded-in-writer.test.mjs.)
const POINTS_AT = Object.freeze({
  tasks: /\btasks\//u,
  objective: /\bSPEC\.md\b/u,
  architecture: /\bARCHITECTURE\.md\b/u,
  story: /\bSTORY\.md\b/u,
});

// ── THE TWO SHAPES THE REAL STREAM HAS NO WITNESS FOR ───────────────────────────────────
//
// task 02's outline carries two rows that are conditional over the stream and that nothing
// in the stream currently satisfies — "task contracts past the ceiling even condensed" and
// "every section each within the ceiling, the sum far past it". Both are unreachable on
// today's data BY DESIGN: `tasks` is a bounded condenser (ADR-010 §1), so a real contract
// set is never unshippable; and the share rule (ADR-010 §2) leaves every live section the
// room it needs, so SACRIFICE fires zero times across all 633 briefs. task 02 now asserts
// both counts at ZERO explicitly, with the reason, instead of admitting them by omission —
// and the BEHAVIOURS live here, in the pure lane, where a witness can be constructed.

// A contract whose FEATURE HEADLINE alone exceeds the whole ceiling. The bounded condenser
// takes the skeleton unconditionally — a list of scenarios with no feature to hang them on
// names nothing — so this set's SMALLEST declared form is still past the ceiling. Measured:
// 55,586 chars whole, 11,110 in its smallest declared form, against a ceiling of 8,000.
const CONTRACTS_PAST_THE_CEILING_EVEN_CONDENSED = [
  [
    "@executable @cli",
    `Feature: ${"a contract whose feature headline alone overflows the whole ceiling ".repeat(160)}`,
    "",
    ...Array.from({ length: 12 }, (_, index) => [
      `  Scenario: case ${index + 1} behaves as its author wrote it`,
      ...Array.from({ length: 12 }, () => `    Given a step body of ${"detail ".repeat(40)}`),
      "",
    ].join("\n")),
  ].join("\n"),
];

// Every section WITHIN the ceiling on its own, the sum far past it: 5,154 + 5,420 + 5,820 +
// 1,294 = 17,688 against 8,000. Sized deliberately, then asserted in the test — a fixture
// that quietly drifted over the ceiling would be exercising the OTHER row.
const WITHIN_CEILING = Object.freeze({
  story: `## User story\n\nAs a phase handed a brief, ${"outcome prose that names the benefit. ".repeat(30)}\n\n## Notes\n\n${"note prose measured at the gate. ".repeat(120)}`,
  objective: `## Objective\n\n${"objective prose. ".repeat(318)}`,
  tasks: [
    [
      "@executable @cli",
      "Feature: A contract that fits the ceiling on its own",
      "",
      ...Array.from({ length: 8 }, (_, index) => [
        `  Scenario: case ${index + 1} behaves exactly as its author wrote it`,
        ...Array.from({ length: 6 }, () => `    Given a step body of ${"detail ".repeat(12)}`),
        "",
      ].join("\n")),
    ].join("\n"),
  ],
  fitness: [
    "## Fitness functions",
    "",
    "<!-- instructional comment -->",
    "",
    "| id | invariant | enforced by (arch-test) | from |",
    "|---|---|---|---|",
    ...Array.from({ length: 10 }, (_, index) => `| FF-${7000 + index} | invariant ${index} holds everywhere in this tree and is enforced in CI | \`test/arch/acd-${index}.test.mjs\` | ADR-00${index % 9} |`),
    "",
  ].join("\n"),
  dependencies: "70/00, 70/03",
});

// ADR-010 §4's WITNESS, sized as the architect measured it: a small condensable `story`
// (1,462 -> 243) sitting beneath a large NON-CONDENSABLE `objective` (5,416). `plan()`
// condenses a section only when it does not fit the room its own place leaves it, and
// `story` fits its room perfectly well — so under the packing as shipped it was carried
// WHOLE while `tasks`, `fitness` and `dependencies` were sacrificed to pay for the
// objective's overshoot. The story NOTES survived and the contract index and the register
// did not. Nothing here is over the ceiling on its own; the sum is.
const EXHAUSTION_WITNESS = Object.freeze({
  story: `## User story\n\nAs a phase handed a brief instead of a tree, I want the acceptance criteria I must satisfy and the constraints that bind me.\n\n## Notes\n\n${"Measured at the gate, and useful to refine but not to a build phase. ".repeat(19)}`,
  // NON-CONDENSABLE by declaration, so `plan()` takes it whole regardless of the room left
  // — the disjunct that lets the plan overshoot the target it set itself.
  objective: `## Objective\n\n${"The phase is handed its context instead of rediscovering it in the tree. ".repeat(74)}`,
  tasks: [
    [
      "@executable @cli",
      "Feature: A contract that fits the ceiling on its own",
      "",
      ...Array.from({ length: 30 }, (_, index) => [
        `  Scenario: case ${index + 1}`,
        ...Array.from({ length: 2 }, () => `    Given a step body of ${"detail ".repeat(12)}`),
        "",
      ].join("\n")),
    ].join("\n"),
  ],
  fitness: [
    "## Fitness functions",
    "",
    "<!-- instructional comment -->",
    "",
    "| id | invariant | enforced by (arch-test) | from |",
    "|---|---|---|---|",
    ...Array.from({ length: 14 }, (_, index) => `| FF-${7000 + index} | invariant ${index} holds everywhere | \`t${index}.mjs\` | ADR-00${index % 9} |`),
    "",
  ].join("\n"),
  dependencies: "70/00",
});

// The tag a Gherkin reader resolves for a scenario: its own tag line if it has one, else the
// enclosing Feature's. Written here rather than assumed, so "the verification tag is
// present" is a property of the CONDENSED OUTPUT and not of this test's optimism.
//
// NOT a fourth copy of the title parse, and not a candidate for feature-parse.mjs's home:
// that home answers "which scenarios are in this file", one line at a time, and cannot
// answer this at all — a scenario's lane depends on the enclosing FEATURE's tag line when
// the scenario carries none, which is state no per-line title parse keeps. Different
// question, different output, stated here so the difference is a decision rather than an
// oversight.
function scenarioLanes(text) {
  const lanes = [];
  let featureTags = [];
  let pending = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("@")) { pending = trimmed.split(/\s+/); continue; }
    if (/^Feature:/.test(trimmed)) { featureTags = pending; pending = []; continue; }
    if (/^(Scenario|Scenario Outline):/.test(trimmed)) {
      const own = pending.length > 0 ? pending : featureTags;
      lanes.push({ title: trimmed, tags: own, lane: own.find((tag) => VERIFICATION_TAGS.has(tag)) ?? null });
      pending = [];
      continue;
    }
    if (trimmed !== "") pending = [];
  }
  return lanes;
}

async function withDocs(docs, body) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-70-05-"));
  try {
    const milestoneDir = path.join(root, "wiki", "work", "70_milestone_fixture");
    const storyDir = path.join(milestoneDir, "stories", "05_story_fixture");
    await mkdir(path.join(storyDir, "tasks"), { recursive: true });
    if (docs.spec != null) await writeFile(path.join(milestoneDir, "SPEC.md"), docs.spec, "utf8");
    if (docs.architecture != null) await writeFile(path.join(milestoneDir, "ARCHITECTURE.md"), docs.architecture, "utf8");
    if (docs.story != null) await writeFile(path.join(storyDir, "STORY.md"), docs.story, "utf8");
    for (const [name, text] of Object.entries(docs.tasks ?? {})) {
      await writeFile(path.join(storyDir, "tasks", name), text, "utf8");
    }
    return await body({ milestoneDir, storyDir });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

export const briefCarriesTheContractTests = [
  // ═══════════ 00_the-contract-reaches-the-phase.feature ═══════════

  // Scenario: a contract too large to ship whole is condensed rather than dropped
  {
    name: "70/05 task00 a contract too large to ship whole is condensed rather than dropped — the brief carries the task contracts in condensed form, they are not absent, and the brief is still within the ceiling",
    run: () => {
      const whole = HUGE_CONTRACTS.join("\n\n");
      assert.ok(whole.length > PHASE_BRIEF_MAX_CHARS, `the fixture contracts exceed the ceiling on their own (${whole.length} > ${PHASE_BRIEF_MAX_CHARS})`);
      const ctx = compilePhaseBrief({ itemRef: "70/05", phase: "continue", story: addressStory(STORY_RECORD), tasks: HUGE_CONTRACTS });
      const tasks = sectionOf(ctx, "tasks");
      assert.ok(tasks != null, "the brief carries the task contracts");
      assert.ok(ctx.condensed.includes("tasks"), "it carries them in condensed form");
      assert.ok(!ctx.dropped.includes("tasks"), "the contracts are not absent from the brief");
      assert.ok(tasks.text.includes("Scenario: A contract far past the ceiling case 1"), "the criteria are present in the author's own words");
      assert.ok(ctx.chars <= ctx.ceiling, `the brief is still within the ceiling (${ctx.chars} <= ${ctx.ceiling})`);
    },
  },

  // Scenario: the condensed contract names every acceptance criterion it can carry
  {
    name: "70/05 task00 the condensed contract names every acceptance criterion it can carry — every scenario the condensed form carries is named, each named scenario's verification tag is present, anything left out is counted, and the count says where the full contract is read",
    run: () => {
      // (a) a contract that condenses whole: every criterion is named, none omitted.
      const carried = compilePhaseBrief({ itemRef: "70/05", phase: "continue", story: addressStory(STORY_RECORD), tasks: HUGE_CONTRACTS });
      const carriedSection = sectionOf(carried, "tasks");
      const carriedDisposition = dispositionOf(carried, "tasks");
      assert.equal(carriedDisposition.disposition, "condensed");
      assert.equal(scenarioTitles(carriedSection.text).length, carriedDisposition.kept, "every scenario the condensed form can carry is named");
      const lanes = scenarioLanes(carriedSection.text);
      assert.ok(lanes.length > 0, "the condensed form names scenarios at all");
      for (const scenario of lanes) {
        assert.ok(scenario.lane != null, `each named scenario's verification tag is present (${scenario.title})`);
      }
      assert.ok(lanes.some((s) => s.lane === "@executable") && lanes.some((s) => s.lane === "@manual"), "the tag lines carry the real lanes, not one guessed lane for all");
      assert.equal(carriedDisposition.omitted, 0, "nothing left out when the whole contract fits condensed");
      assert.match(carriedSection.text, /All \d+ scenarios listed, none omitted\./u, "a count is stated even when nothing was omitted");

      // (b) a contract whose headlines ALONE overflow: what is left out is COUNTED.
      const bounded = compilePhaseBrief({ itemRef: "70/05", phase: "continue", story: addressStory(STORY_RECORD), tasks: OVERWHELMING_CONTRACTS });
      const boundedSection = sectionOf(bounded, "tasks");
      const boundedDisposition = dispositionOf(bounded, "tasks");
      assert.ok(boundedSection != null, "a contract past the ceiling even condensed is still carried, bounded");
      assert.ok(boundedDisposition.omitted > 0, "the bounded condenser did leave scenarios out");
      assert.equal(boundedDisposition.kept + boundedDisposition.omitted, boundedDisposition.total, "kept + omitted is the whole contract — the count balances");
      assert.equal(scenarioTitles(boundedSection.text).length, boundedDisposition.kept, "the count matches what is actually listed");
      assert.match(boundedSection.text, new RegExp(`${boundedDisposition.kept} of ${boundedDisposition.total} scenarios listed, ${boundedDisposition.omitted} omitted`, "u"), "any scenario left out is counted, never silently omitted");
      assert.ok(boundedSection.text.includes(BRIEF_SECTION_SOURCES.tasks), "the count is accompanied by where the full contract is read");
      assert.match(boundedSection.text, POINTS_AT.tasks, "…and that pointer names the contracts' real home, not merely whatever the constant happens to say");
      assert.ok(bounded.chars <= bounded.ceiling, "and the bounded contract still fits the ceiling");
    },
  },

  // Scenario: a section small enough to fit whole is never condensed
  {
    name: "70/05 task00 a section small enough to fit whole is never condensed — the contracts appear in full and nothing in the brief describes them as condensed",
    run: () => {
      const ctx = compilePhaseBrief({ itemRef: "70/05", phase: "continue", story: addressStory(STORY_RECORD), tasks: SMALL_CONTRACTS });
      const tasks = sectionOf(ctx, "tasks");
      assert.equal(tasks.text, addressTaskContracts(SMALL_CONTRACTS), "the contracts appear in full, byte for byte as addressed");
      assert.deepEqual(ctx.condensed, [], "nothing was condensed");
      assert.equal(ctx.truncated, false, "the brief was not truncated");
      assert.equal(ctx.notice, null, "there is no notice");
      assert.doesNotMatch(ctx.text, /condensed/iu, "nothing in the brief describes them as condensed");
    },
  },

  // Scenario: the architecture a story declares reaches its brief
  {
    name: "70/05 task00 the architecture a story declares reaches its brief — the declared architecture is carried and is not evicted by a higher-priority section that did not fit",
    run: () => {
      // `story` sits at priority 2 with no addressable block, so it cannot be represented and
      // is UNSHIPPABLE; `architecture` sits three priorities BELOW it. Under the deleted
      // prefix cut this was exactly the shape that evicted everything underneath.
      const architecture = addressArchitecture(ARCHITECTURE_RECORD, { declared: ["ADR-002"] });
      const ctx = compilePhaseBrief({
        itemRef: "70/05",
        phase: "continue",
        story: "S".repeat(PHASE_BRIEF_MAX_CHARS * 3),
        tasks: SMALL_CONTRACTS,
        architecture,
      });
      assert.ok(ctx.unshippable.includes("story"), "the higher-priority section did not fit in any declared form");
      const slice = sectionOf(ctx, "architecture");
      assert.ok(slice != null, "the declared architecture reaches the brief");
      assert.ok(slice.text.includes("ADR-002"), "and it is the slice the story declared");
      assert.ok(!ctx.dropped.includes("architecture"), "it is not evicted by a higher-priority section that did not fit");
      assert.ok(!ctx.dropped.includes("tasks"), "nor is anything else below the section that did not fit");
    },
  },

  // Scenario: a condensed section is named as condensed, not merely shortened
  {
    name: "70/05 task00 a condensed section is named as condensed, not merely shortened — the condensed section is identified as condensed, the dropped section as dropped, and the two are distinguishable",
    run: () => {
      const ctx = compilePhaseBrief({
        itemRef: "70/05",
        phase: "continue",
        story: addressStory(STORY_RECORD),
        tasks: HUGE_CONTRACTS,
        fitness: "F".repeat(PHASE_BRIEF_MAX_CHARS * 2),
      });
      assert.ok(ctx.condensed.includes("tasks"), "one section was condensed");
      assert.ok(ctx.dropped.includes("fitness"), "another was dropped");
      assert.match(ctx.notice, /CONDENSED[^\n]*TASK CONTRACTS/u, "the condensed section is identified as condensed");
      assert.match(ctx.notice, /(SACRIFICED|UNSHIPPABLE)[^\n]*STRUCTURAL CONSTRAINTS/u, "the dropped section is identified as dropped");
      const condensedLine = ctx.notice.split("\n").find((line) => line.startsWith("CONDENSED"));
      const droppedLine = ctx.notice.split("\n").find((line) => /^(SACRIFICED|UNSHIPPABLE)/.test(line));
      assert.ok(condensedLine != null && droppedLine != null && condensedLine !== droppedLine, "the two are distinguishable from one another");
      assert.ok(condensedLine.includes("still carried") && droppedLine.includes("not carried"), "and they are distinguishable by what they say, not merely by their order");
      // The literal roll-call two delivered suites assert is RETAINED, never substituted.
      assert.ok(ctx.notice.includes("Dropped or shortened"), "the delivered roll-call phrase is retained alongside the new detail");
    },
  },

  // Scenario: a condensed section says where the full text lives
  {
    name: "70/05 task00 a condensed section says where the full text lives — the brief states which form survived and points at where the complete text can be read",
    run: () => {
      const ctx = compilePhaseBrief({ itemRef: "70/05", phase: "continue", story: addressStory(STORY_RECORD), tasks: HUGE_CONTRACTS });
      const disposition = dispositionOf(ctx, "tasks");
      assert.equal(disposition.disposition, "condensed");
      assert.ok(typeof disposition.form === "string" && disposition.form.length > 0, "the brief states which form survived");
      assert.equal(disposition.where, BRIEF_SECTION_SOURCES.tasks, "and where the complete text can be read");
      assert.match(disposition.where, POINTS_AT.tasks, "…and that pointer names the tasks/ directory the contracts are actually read from");
      assert.ok(ctx.notice.includes(disposition.form), "the notice states the form that survived");
      assert.ok(ctx.notice.includes(BRIEF_SECTION_SOURCES.tasks), "the notice points at where the complete text can be read");
      assert.match(ctx.notice, POINTS_AT.tasks, "…at the tasks/ directory by name");
      assert.ok(sectionOf(ctx, "tasks").text.includes(BRIEF_SECTION_SOURCES.tasks), "and so does the section itself, where a phase reading the contract will be looking");
      assert.match(sectionOf(ctx, "tasks").text, POINTS_AT.tasks, "…at the tasks/ directory by name there too");
    },
  },

  // Scenario Outline: what each section reduces to when the budget is tight (7 rows)
  {
    name: "70/05 task00 outline what each section reduces to when the budget is tight (7 rows: tasks -> headlines+tags; architecture -> heading+decision; fitness -> register rows; objective -> the objective block; story -> user story then notes; item -> the whole ref, never sacrificed; dependencies -> the whole edge list, sacrificed whole)",
    run: () => {
      // Every one of the seven declared sections is covered, and each row is checked BOTH
      // ways: what survives, and what is gone.
      const covered = new Set();

      // tasks — feature, rule and scenario headlines with their tags survive; step bodies,
      // data tables and narrative prose do not.
      covered.add("tasks");
      const contracts = addressTaskContracts([gherkin({ feature: "Reduced", scenarios: 3, steps: 4, prose: 200, rule: "a rule that survives" })]);
      const tasks = condenseTaskContracts(contracts, { budget: PHASE_BRIEF_MAX_CHARS });
      assert.ok(tasks.text.includes("Feature: Reduced"), "tasks: the feature headline survives");
      assert.ok(tasks.text.includes("Rule: a rule that survives"), "tasks: the rule headline survives");
      assert.ok(tasks.text.includes("Scenario: Reduced case 1"), "tasks: the scenario headlines survive");
      assert.ok(tasks.text.includes("Scenario Outline: outline for <case>"), "tasks: the scenario-outline headline survives");
      assert.ok(tasks.text.includes("@executable"), "tasks: the tag lines survive");
      assert.doesNotMatch(tasks.text, /Given a step body/u, "tasks: step bodies are dropped");
      assert.doesNotMatch(tasks.text, /\| one {2}\|/u, "tasks: data tables are dropped");
      assert.doesNotMatch(tasks.text, /Narrative prose that a phase does not need/u, "tasks: narrative prose is dropped");

      // architecture — each declared ADR's heading and decision paragraph survive; the
      // context and consequences around each decision do not.
      covered.add("architecture");
      const slice = addressArchitecture(ARCHITECTURE_RECORD, { declared: ["ADR-001", "ADR-002"] });
      const architecture = condenseArchitectureSlice(slice.text, { budget: PHASE_BRIEF_MAX_CHARS });
      assert.ok(architecture.text.includes("## ADR-001 — The first decision"), "architecture: the ADR heading survives");
      assert.ok(architecture.text.includes("## ADR-002 — The second decision"), "architecture: every declared ADR's heading survives");
      assert.ok(architecture.text.includes("**Decision.** The first decision, stated once and briefly."), "architecture: the decision paragraph survives");
      assert.ok(architecture.text.includes("**Decision.** The second decision, which is the one this story declares."), "architecture: each declared ADR's decision survives");
      assert.doesNotMatch(architecture.text, /\*\*Context\.\*\*/u, "architecture: the context around each decision is dropped");
      assert.doesNotMatch(architecture.text, /\*\*Consequences\.\*\*/u, "architecture: the consequences around each decision are dropped");

      // fitness — the register's rows survive; the instructional comment wrapping the table
      // does not.
      covered.add("fitness");
      const register = addressFitnessRegister(ARCHITECTURE_RECORD, {});
      const fitness = condenseFitnessRegister(register, { budget: PHASE_BRIEF_MAX_CHARS });
      assert.ok(fitness.text.includes("FF-0001") && fitness.text.includes("FF-0002"), "fitness: the register's rows survive");
      assert.ok(fitness.text.includes("the first invariant holds everywhere"), "fitness: each row's invariant survives");
      assert.doesNotMatch(fitness.text, /instructional comment is scaffolding/u, "fitness: the instructional comment wrapping the table is dropped");
      assert.doesNotMatch(fitness.text, /acd-one\.test\.mjs/u, "fitness: the row's remaining columns are dropped — the reduction is the row, not the comment");

      // objective — the specification's objective block survives; every other block of the
      // specification does not. Addressing IS its whole reduction: it declares no condenser.
      covered.add("objective");
      const objective = addressObjective(MILESTONE_SPEC);
      assert.ok(objective.includes("The phase is handed its context instead of rediscovering it."), "objective: the specification's objective block survives");
      assert.doesNotMatch(objective, /## Scope/u, "objective: every other block of the specification is dropped");
      assert.doesNotMatch(objective, /## Out of scope/u, "objective: including the ones after it");
      assert.equal(BRIEF_SECTION_CONDENSERS.objective, undefined, "objective: it declares no condenser — addressing is its whole reduction");
      assert.ok(BRIEF_NON_CONDENSABLE_SECTIONS.includes("objective"), "objective: and that is DECLARED, never left to omission");

      // story — the user story block, then the notes if budget holds; frontmatter, the
      // scaffold comment and the rest of the record never appear.
      covered.add("story");
      const addressed = addressStory(STORY_RECORD);
      assert.ok(addressed.includes("## User story") && addressed.includes("## Notes"), "story: the user story block, then the notes if budget holds");
      assert.doesNotMatch(addressed, /^---/mu, "story: the record's frontmatter is dropped");
      assert.doesNotMatch(addressed, /STORY\.md — the scaffold comment/u, "story: the record's scaffolding is dropped");
      assert.doesNotMatch(addressed, /## Tasks/u, "story: the rest of the record is dropped");
      const storyCondensed = condenseStory(addressed, { budget: PHASE_BRIEF_MAX_CHARS });
      assert.ok(storyCondensed.text.includes("As a phase handed a brief instead of a tree"), "story: under budget pressure the user story block is what survives");
      assert.doesNotMatch(storyCondensed.text, /Measured at the gate/u, "story: and the notes are what it drops");

      // item — the whole ref; nothing at any size, and it is never sacrificed.
      covered.add("item");
      assert.equal(BRIEF_SECTION_CONDENSERS.item, undefined, "item: it has no condensed form");
      assert.ok(BRIEF_NON_CONDENSABLE_SECTIONS.includes("item"), "item: declared non-condensable");
      const crowded = compilePhaseBrief({
        itemRef: "70/05", phase: "refine",
        story: "S".repeat(PHASE_BRIEF_MAX_CHARS * 2), tasks: OVERWHELMING_CONTRACTS,
        objective: "O".repeat(PHASE_BRIEF_MAX_CHARS * 2), fitness: "F".repeat(PHASE_BRIEF_MAX_CHARS * 2),
        dependencies: "D".repeat(PHASE_BRIEF_MAX_CHARS * 2),
      });
      assert.equal(crowded.sections[0].id, "item", "item: the whole ref is carried at any size");
      assert.ok(crowded.sections[0].text.includes("70/05"), "item: and it is the ref itself");
      assert.ok(!crowded.dropped.includes("item") && !crowded.sacrificed.includes("item"), "item: it is never sacrificed, at any size");

      // dependencies — the whole edge list; no condensed form; sacrificed whole, lowest first.
      covered.add("dependencies");
      assert.equal(BRIEF_SECTION_CONDENSERS.dependencies, undefined, "dependencies: it has no condensed form");
      assert.ok(BRIEF_NON_CONDENSABLE_SECTIONS.includes("dependencies"), "dependencies: declared non-condensable");
      // The edge list is sized to be the section that cannot be carried, because since chore
      // 95 a sacrifice is only kept when the room the shedding freed cannot take the section
      // back. A two-ref edge list is re-seated in the room a larger section's departure
      // frees — which is the amendment working, not this row failing.
      const shed = compilePhaseBrief({
        itemRef: "70/05", phase: "refine",
        story: addressStory(STORY_RECORD),
        objective: "O".repeat(Math.floor(PHASE_BRIEF_MAX_CHARS * 0.45)),
        tasks: SMALL_CONTRACTS,
        fitness: addressFitnessRegister(ARCHITECTURE_RECORD, {}),
        dependencies: "70/00, ".repeat(Math.floor((PHASE_BRIEF_MAX_CHARS * 0.45) / 7)),
      });
      assert.ok(shed.sacrificed.includes("dependencies"), "dependencies: it is sacrificed whole");
      assert.equal(sectionOf(shed, "dependencies"), null, "dependencies: and no partial form of it is carried — it has no condensed form to leave behind");
      assert.equal(shed.sacrificed[shed.sacrificed.length - 1], "dependencies", "dependencies: and it is the lowest priority, so it goes first");

      assert.deepEqual([...covered].sort(), [...BRIEF_SECTION_PRIORITY].sort(), "every declared section has a row — an eighth section cannot slip through this outline unexamined");
    },
  },

  // Scenario Outline: a phase can answer these about its own contract (5 rows)
  {
    name: "70/05 task00 outline a phase can answer these about its own contract (5 rows: was it condensed; which scenarios; which lane each belongs to; was anything left out; where the complete text is read)",
    run: () => {
      const ctx = compilePhaseBrief({ itemRef: "70/05", phase: "continue", story: addressStory(STORY_RECORD), tasks: OVERWHELMING_CONTRACTS });
      const brief = `${ctx.text}\n\n${ctx.notice}`;
      const contract = sectionOf(ctx, "tasks").text;

      // "was this section condensed, or is it the contract in full"
      assert.match(contract, /^CONDENSED — /u, "a reader inspecting the brief alone can tell the section was condensed");
      const full = compilePhaseBrief({ itemRef: "70/05", phase: "continue", story: addressStory(STORY_RECORD), tasks: SMALL_CONTRACTS });
      assert.doesNotMatch(sectionOf(full, "tasks").text, /^CONDENSED/u, "and can tell a contract carried in full from a condensed one");

      // "which scenarios must be satisfied, in their author's own words"
      const named = scenarioTitles(contract);
      assert.ok(named.length > 0, "the scenarios that must be satisfied are named");
      assert.ok(OVERWHELMING_CONTRACTS[0].includes(named[0]), "and they are the author's own words, not a paraphrase");

      // "which verification lane each named scenario belongs to"
      for (const scenario of scenarioLanes(contract)) {
        assert.ok(scenario.lane != null, `the verification lane is answerable for ${scenario.title}`);
      }

      // "whether any scenario was left out of the list"
      assert.match(contract, /\d+ of \d+ scenarios listed, \d+ omitted\./u, "whether any scenario was left out is answerable from the brief alone");

      // "where the complete contract text can be read"
      assert.ok(brief.includes(BRIEF_SECTION_SOURCES.tasks), "where the complete contract text can be read is answerable from the brief alone");
      assert.match(brief, POINTS_AT.tasks, "…and the answer names the tasks/ directory, not merely whatever the constant says");
    },
  },

  // ═══════════ 01_the-budget-is-spent.feature ═══════════

  // Scenario: a section that does not fit does not evict the sections below it
  {
    name: "70/05 task01 a section that does not fit does not evict the sections below it — the lower-priority sections that do fit are still carried, and the brief does not drop them on account of the section above them",
    run: () => {
      const ctx = compilePhaseBrief({
        itemRef: "70/05", phase: "refine",
        story: "S".repeat(PHASE_BRIEF_MAX_CHARS * 3),  // unshippable in any declared form
        objective: addressObjective(MILESTONE_SPEC),
        tasks: SMALL_CONTRACTS,
        fitness: addressFitnessRegister(ARCHITECTURE_RECORD, {}),
        dependencies: "70/00",
      });
      assert.ok(ctx.unshippable.includes("story"), "one section cannot be carried even condensed");
      for (const id of ["objective", "tasks", "fitness", "dependencies"]) {
        assert.ok(sectionOf(ctx, id) != null, `the lower-priority section ${id} that does fit is still carried`);
        assert.ok(!ctx.dropped.includes(id), `the brief does not drop ${id} on account of the section above it`);
      }
      assert.deepEqual(ctx.sacrificed, [], "nothing was given up at all — an unshippable section frees nothing and asks for nothing");
    },
  },

  // Scenario: sacrifice starts at the lowest declared priority
  {
    name: "70/05 task01 sacrifice starts at the lowest declared priority — the lowest-priority section is sacrificed first, and a higher-priority one only after every lower one has been",
    run: () => {
      const ctx = compilePhaseBrief({
        itemRef: "70/05", phase: "refine",
        story: addressStory(STORY_RECORD),
        objective: "O".repeat(PHASE_BRIEF_MAX_CHARS - 700),
        tasks: SMALL_CONTRACTS,
        fitness: addressFitnessRegister(ARCHITECTURE_RECORD, {}),
        dependencies: "70/00, 70/03",
      });
      assert.ok(ctx.sacrificed.length > 0, "the condensed set still exceeded the ceiling, so something was shed");

      // AMENDED BY CHORE 95, whose record ratifies the amendment. The SHEDDING is still
      // strictly bottom-up — `dependencies` goes first, then `fitness`, then `tasks` — but
      // shedding is no longer the last word: the room a sacrifice frees is offered BACK,
      // highest priority first, so the retained set is no longer required to be a PREFIX of
      // the priority order nor the sacrificed set its suffix. Under the suffix rule this
      // brief kept `item` and `story` alone and gave up FOUR sections to pay for one
      // 7,300-char non-condensable `objective` that was then given up as well — measured on
      // four of milestone 72's real refine briefs, at a third of the ceiling unspent.
      //
      // What stands in the suffix rule's place is the stronger claim, and the one the notice
      // actually makes: a section is named SACRIFICED only when it could not be carried in
      // the room the finished brief has left.
      assert.deepEqual(ctx.sacrificed, ["objective"], "the one section that cannot be carried in the room left is the one given up");
      const roomLeft = ctx.ceiling - ctx.chars;
      assert.ok(
        PHASE_BRIEF_MAX_CHARS - 700 > roomLeft,
        `and the claim is true: the objective is larger than the room left (${PHASE_BRIEF_MAX_CHARS - 700} > ${roomLeft})`,
      );
      for (const id of ["tasks", "fitness", "dependencies"]) {
        assert.ok(sectionOf(ctx, id) != null, `the lower-priority ${id} fits the room the objective's departure freed, and is carried rather than given up`);
      }

      // PRIORITY STILL DECIDES WHO PAYS, which is what the bottom-up rule is FOR and is the
      // half of it the amendment leaves untouched: two non-condensable sections of the same
      // size, only one of which fits, and the LOWER priority is the one given up.
      const rival = "R".repeat(Math.floor(PHASE_BRIEF_MAX_CHARS * 0.6));
      const contested = compilePhaseBrief({ itemRef: "70/05", phase: "refine", objective: rival, dependencies: rival });
      assert.ok(sectionOf(contested, "objective") != null, "the higher-priority section is the one carried");
      assert.deepEqual(contested.sacrificed, ["dependencies"], "and the lower-priority rival is the one given up");
    },
  },

  // Scenario: a section that cannot be carried at all is unshippable, not sacrificed
  {
    name: "70/05 task01 a section that cannot be carried at all is unshippable, not sacrificed — it is named as unshippable, no lower-priority section is given up on its account, and the notice points at where it is read in full",
    run: () => {
      const ctx = compilePhaseBrief({
        itemRef: "70/05", phase: "refine",
        story: addressStory(STORY_RECORD),
        objective: "O".repeat(PHASE_BRIEF_MAX_CHARS * 2),
        tasks: SMALL_CONTRACTS,
        fitness: addressFitnessRegister(ARCHITECTURE_RECORD, {}),
        dependencies: "70/00",
      });
      assert.deepEqual(ctx.unshippable, ["objective"], "that section is named as unshippable");
      assert.ok(!ctx.sacrificed.includes("objective"), "and not as sacrificed — the two dispositions are not the same thing");
      assert.deepEqual(ctx.sacrificed, [], "no lower-priority section is given up on its account");
      assert.ok(sectionOf(ctx, "tasks") != null && sectionOf(ctx, "fitness") != null && sectionOf(ctx, "dependencies") != null, "every section below it is still carried");
      assert.match(ctx.notice, /UNSHIPPABLE[^\n]*MILESTONE OBJECTIVE/u, "the notice names it unshippable");
      assert.ok(ctx.notice.includes(BRIEF_SECTION_SOURCES.objective), "the notice points at where that section is read in full");
      assert.match(ctx.notice, POINTS_AT.objective, "…and it names SPEC.md, the document the objective is actually addressed out of");
    },
  },

  // Scenario: the retained sections keep their declared order
  {
    name: "70/05 task01 the retained sections keep their declared order — the sections that remain appear in their declared priority order, not in the order they were supplied",
    run: () => {
      // Supplied in a deliberately scrambled key order; the brief must not follow it.
      const ctx = compilePhaseBrief({
        dependencies: "70/00",
        fitness: addressFitnessRegister(ARCHITECTURE_RECORD, {}),
        tasks: HUGE_CONTRACTS,
        objective: addressObjective(MILESTONE_SPEC),
        story: addressStory(STORY_RECORD),
        phase: "refine",
        itemRef: "70/05",
      });
      assert.ok(ctx.sacrificed.length > 0 || ctx.unshippable.length > 0 || ctx.condensed.length > 0, "the brief did shed or shorten something");
      const retained = ctx.sections.map((section) => section.id);
      const ranks = retained.map((id) => BRIEF_SECTION_PRIORITY.indexOf(id));
      assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), "the sections that remain appear in their declared priority order");
      assert.notDeepEqual(retained, ["dependencies", "fitness", "tasks", "objective", "story", "item"], "the order does not follow the order they were supplied in");
    },
  },

  // Scenario: the sections carried are the longest run of the priority order that fits
  {
    name: "70/05 task01 the sections carried are the longest run of the priority order that fits — the highest priorities that fit together are carried, a section is sacrificed only while the brief is still over the ceiling, and an unshippable section does not shorten that run",
    run: () => {
      const ctx = compilePhaseBrief({
        itemRef: "70/05", phase: "refine",
        story: addressStory(STORY_RECORD),
        objective: "O".repeat(PHASE_BRIEF_MAX_CHARS * 2),  // unshippable, mid-priority
        tasks: HUGE_CONTRACTS,
        architecture: addressArchitecture(ARCHITECTURE_RECORD, { declared: ["ADR-001", "ADR-002"] }),
        fitness: addressFitnessRegister(ARCHITECTURE_RECORD, {}),
        dependencies: "70/00",
      });
      const offered = ["item", "story", "objective", "tasks", "architecture", "fitness", "dependencies"];
      const shippable = offered.filter((id) => !ctx.unshippable.includes(id));
      const retained = ctx.sections.map((section) => section.id);
      assert.deepEqual(retained, shippable.slice(0, retained.length), "the sections carried are the highest priorities that fit together — a run, never a scatter");
      assert.ok(ctx.chars <= ctx.ceiling, "the run that was kept fits");
      // A section is sacrificed only while the brief is still over the ceiling: put the
      // last-sacrificed section back and the brief no longer fits.
      if (ctx.sacrificed.length > 0) {
        const restored = retained.concat(ctx.sacrificed[0]);
        const rebuilt = compilePhaseBrief({ itemRef: "70/05", phase: "refine", story: addressStory(STORY_RECORD), tasks: HUGE_CONTRACTS, architecture: addressArchitecture(ARCHITECTURE_RECORD, { declared: ["ADR-001", "ADR-002"] }), fitness: addressFitnessRegister(ARCHITECTURE_RECORD, {}), dependencies: "70/00" });
        assert.ok(rebuilt.chars <= rebuilt.ceiling, "and the brief without the unshippable section still fits");
        assert.ok(restored.length > retained.length, "the sacrifice was a real loss, not a relabelling");
      }
      assert.ok(ctx.unshippable.includes("objective"), "the unshippable section is skipped in place");
      assert.ok(retained.includes("tasks"), "and it does not shorten the run — the sections below it are still reached");
    },
  },

  // Scenario: the ceiling is unchanged by this story
  {
    name: "70/05 task01 the ceiling is unchanged by this story — it is the same number, still enforced inside the compiler, and no second ceiling literal exists outside it",
    run: async () => {
      assert.equal(PHASE_BRIEF_CEILING_TOKENS, 2000, "the ceiling is the same number of tokens ADR-003 declared");
      assert.equal(PHASE_BRIEF_CHARS_PER_TOKEN, 4, "at the same declared chars-per-token ratio");
      assert.equal(PHASE_BRIEF_MAX_CHARS, 8000, "so the ceiling is the same number of characters");
      assert.equal(PHASE_BRIEF_CEILING_CHARS, PHASE_BRIEF_MAX_CHARS, "and both names still point at the one bound");
      // still enforced INSIDE the compiler: a caller handing over many times the ceiling
      // gets a within-ceiling brief back, never an oversized one.
      const over = compilePhaseBrief({ itemRef: "70/05", phase: "refine", story: addressStory(STORY_RECORD), tasks: OVERWHELMING_CONTRACTS, objective: "O".repeat(PHASE_BRIEF_MAX_CHARS * 4), fitness: "F".repeat(PHASE_BRIEF_MAX_CHARS * 4) });
      assert.ok(over.chars <= PHASE_BRIEF_MAX_CHARS, "the enforcement point is the compiler itself");
      assert.equal(over.ceiling, PHASE_BRIEF_MAX_CHARS, "and it stamps the one ceiling on what it writes");
      // "no second ceiling literal exists outside it" — the scenario's own third step, so
      // it is asserted here and not delegated. The WALK is not this row's, though: it was
      // written out three times across three suites (~113 ms a copy) for one fact, so it
      // now comes from the one home the milestone already built for scanning src/**, which
      // reads the tree once per process.
      const second = await srcFilesContaining(REPO_ROOT, String(PHASE_BRIEF_MAX_CHARS), { except: ["phase-brief.mjs"] });
      assert.deepEqual(second, [], "no second ceiling literal exists outside it");
    },
  },

  // Scenario: a milestone objective reaches the brief as its objective, not as its whole spec
  {
    name: "70/05 task01 a milestone objective reaches the brief as its objective, not as its whole spec — the brief carries the specification's objective and does not carry the whole specification document",
    run: () => withDocs({ spec: MILESTONE_SPEC, architecture: ARCHITECTURE_RECORD, story: STORY_RECORD, tasks: { "00_a.feature": SMALL_CONTRACTS[0] } }, async ({ storyDir, milestoneDir }) => {
      assert.ok(MILESTONE_SPEC.length > PHASE_BRIEF_MAX_CHARS, `the fixture specification is many times the ceiling (${MILESTONE_SPEC.length})`);
      const brief = await compileBriefForItem({ itemRef: "70/05", phase: "refine", itemType: "story", itemDir: storyDir, milestoneDir });
      const objective = sectionOf(brief, "objective");
      assert.ok(objective != null, "the brief carries the specification's objective");
      assert.ok(objective.text.includes("The phase is handed its context instead of rediscovering it."), "and it is the objective block itself");
      assert.doesNotMatch(brief.text, /## Out of scope/u, "it does not carry the whole specification document");
      assert.ok(objective.text.length < MILESTONE_SPEC.length / 4, `the objective section is a fraction of the document it came from (${objective.text.length} of ${MILESTONE_SPEC.length})`);
    }),
  },

  // Scenario: no document reaches the brief unaddressed
  {
    name: "70/05 task01 no document reaches the brief unaddressed — every section value traces back to an addressing helper's output, no section carries a document the reader did not address, and none carries a record's frontmatter block or its scaffold comments",
    run: () => withDocs({ spec: MILESTONE_SPEC, architecture: ARCHITECTURE_RECORD, story: STORY_RECORD, tasks: { "00_a.feature": SMALL_CONTRACTS[0] } }, async ({ storyDir, milestoneDir }) => {
      const brief = await compileBriefForItem({ itemRef: "70/05", phase: "refine", itemType: "story", itemDir: storyDir, milestoneDir });
      const declared = ["ADR-002"];
      const addressedBy = {
        item: "Item: 70/05",
        story: addressStory(STORY_RECORD),
        objective: addressObjective(MILESTONE_SPEC),
        tasks: addressTaskContracts([SMALL_CONTRACTS[0]]),
        architecture: addressArchitecture(ARCHITECTURE_RECORD, { declared })?.text,
        fitness: addressFitnessRegister(ARCHITECTURE_RECORD, { declared }),
        dependencies: addressDependencies(STORY_RECORD),
      };
      for (const section of brief.sections) {
        const addressed = addressedBy[section.id];
        assert.ok(addressed != null, `${section.id} traces back to an addressing helper`);
        const condenser = BRIEF_SECTION_CONDENSERS[section.id];
        const condensed = condenser == null ? null : condenser(addressed, { budget: PHASE_BRIEF_MAX_CHARS });
        assert.ok(
          section.text === addressed || (condensed != null && section.text.startsWith("CONDENSED — ")),
          `${section.id} is the addressed extract, or that extract condensed — never the document`,
        );
        assert.doesNotMatch(section.text, /^---\r?\n(?:[\s\S]*?)\r?\n---/u, `${section.id} carries no record's frontmatter block`);
        assert.doesNotMatch(section.text, /STORY\.md — the scaffold comment/u, `${section.id} carries no record's scaffold comments`);
      }
      assert.doesNotMatch(brief.text, /## Out of scope|## Tasks|## Story partition/u, "no section carries a document the reader did not address");
    }),
  },

  // Scenario Outline: a section too large is condensed before anything is sacrificed (6 rows)
  {
    name: "70/05 task01 outline the packing matrix (6 rows: all within -> all in full, none sacrificed; one over -> that one condensed, none sacrificed; a mid-priority too large even condensed -> every lower one still carried, none sacrificed; the condensed set still over -> carried up to the ceiling, lowest first; every section over even condensed -> the item and a notice; only the item -> the item alone with no notice)",
    run: () => {
      const register = addressFitnessRegister(ARCHITECTURE_RECORD, {});
      const story = addressStory(STORY_RECORD);

      // every section within the ceiling whole -> every section carried in full, none sacrificed
      const all = compilePhaseBrief({ itemRef: "70/05", phase: "continue", story, tasks: SMALL_CONTRACTS, fitness: register });
      assert.deepEqual(all.sections.map((s) => s.id), ["item", "story", "tasks", "fitness"], "all within: every section carried");
      assert.deepEqual(all.condensed, [], "all within: in full");
      assert.deepEqual(all.sacrificed, [], "all within: none sacrificed");

      // one section over on its own, the rest fitting -> that section condensed, the others whole
      const oneOver = compilePhaseBrief({ itemRef: "70/05", phase: "continue", story, tasks: HUGE_CONTRACTS, fitness: register });
      assert.deepEqual(oneOver.condensed, ["tasks"], "one over: that section condensed");
      assert.equal(sectionOf(oneOver, "story").text, story, "one over: the others whole");
      assert.equal(sectionOf(oneOver, "fitness").text, register, "one over: the others whole");
      assert.deepEqual(oneOver.sacrificed, [], "one over: none sacrificed");

      // a mid-priority section too large even condensed -> every lower-priority section still
      // carried, none sacrificed, that section unshippable
      const midUnshippable = compilePhaseBrief({ itemRef: "70/05", phase: "refine", story, objective: "O".repeat(PHASE_BRIEF_MAX_CHARS * 2), tasks: SMALL_CONTRACTS, fitness: register, dependencies: "70/00" });
      assert.deepEqual(midUnshippable.unshippable, ["objective"], "mid too large: that section is unshippable");
      assert.deepEqual(midUnshippable.sacrificed, [], "mid too large: none sacrificed");
      for (const id of ["tasks", "fitness", "dependencies"]) {
        assert.ok(sectionOf(midUnshippable, id) != null, `mid too large: the lower-priority ${id} is still carried`);
      }

      // the condensed set still over the ceiling -> condensed sections carried up to the
      // ceiling, the lowest priority sacrificed first, then the next
      const stillOver = compilePhaseBrief({ itemRef: "70/05", phase: "refine", story, objective: "O".repeat(PHASE_BRIEF_MAX_CHARS - 700), tasks: SMALL_CONTRACTS, fitness: register, dependencies: "70/00" });
      assert.ok(stillOver.sacrificed.length >= 1, "condensed set still over: something is sacrificed");
      // AMENDED BY CHORE 95 (ratified in that chore's record): shedding is bottom-up, but the
      // room it frees is offered back highest-priority first, so what remains sacrificed is
      // what could not be re-seated — here the 7,300-char non-condensable objective, and not
      // the three lower-priority sections that fit in the room its departure freed.
      assert.deepEqual(stillOver.sacrificed, ["objective"], "condensed set still over: the section that cannot be carried in the room left is the one given up");
      for (const id of ["tasks", "fitness", "dependencies"]) {
        assert.ok(sectionOf(stillOver, id) != null, `condensed set still over: the lower-priority ${id} fits the room left and is carried`);
      }
      assert.ok(stillOver.chars <= stillOver.ceiling, "condensed set still over: carried up to the ceiling");

      // every section over the ceiling even condensed -> the item named and a notice, never
      // an empty brief; every section but the item leaves
      const everythingOver = compilePhaseBrief({
        itemRef: "70/05", phase: "refine",
        story: "S".repeat(PHASE_BRIEF_MAX_CHARS * 2), objective: "O".repeat(PHASE_BRIEF_MAX_CHARS * 2),
        tasks: ["T".repeat(PHASE_BRIEF_MAX_CHARS * 2)], fitness: "F".repeat(PHASE_BRIEF_MAX_CHARS * 2),
        dependencies: "D".repeat(PHASE_BRIEF_MAX_CHARS * 2),
      });
      assert.deepEqual(everythingOver.sections.map((s) => s.id), ["item"], "everything over: the item named");
      assert.ok(everythingOver.text.includes("Item: 70/05"), "everything over: never an empty brief");
      assert.ok(everythingOver.notice != null && everythingOver.truncated, "everything over: and a notice");
      assert.deepEqual([...everythingOver.dropped].sort(), ["dependencies", "fitness", "objective", "story", "tasks"], "everything over: every section but the item left the brief");
      // …and HOW each of them left it, pinned rather than implied. The row's own words are
      // "every section but the item leaves"; that is a statement about the dropped SET, and
      // this ADR's whole point is that a section leaves by one of two dispositions which
      // are not the same thing. Here every one of the five is over the ceiling in its own
      // right, so every one is UNSHIPPABLE and NOTHING was sacrificed: no section was given
      // up to make room for another, because there was no room to make.
      assert.deepEqual([...everythingOver.unshippable].sort(), ["dependencies", "fitness", "objective", "story", "tasks"], "everything over: each of them is unshippable — over the ceiling in every declared form");
      assert.deepEqual(everythingOver.sacrificed, [], "everything over: and none of them was SACRIFICED — an unshippable section frees nothing, so nothing is given up on its account");

      // only the item available to carry -> the item alone, none sacrificed, no notice
      const alone = compilePhaseBrief({ itemRef: "70/05", phase: "continue" });
      assert.deepEqual(alone.sections.map((s) => s.id), ["item"], "only the item: the item alone");
      assert.deepEqual(alone.dropped, [], "only the item: none sacrificed");
      assert.equal(alone.truncated, false, "only the item: nothing was lost");
      assert.equal(alone.notice, null, "only the item: and no notice claiming a loss");
    },
  },

  // Scenario Outline: what the objective and story sections carry (7 rows)
  {
    name: "70/05 task01 outline addressed extracts (7 rows: a milestone spec -> its Objective block; a story record -> User story then Notes; an architecture record -> the declared ADRs' headings and decisions; a task contract set -> the headlines and tags; a fitness register -> the rows without the comment; an absent document -> no section; a document missing the block -> no section, never the whole file)",
    run: () => {
      // a milestone specification -> its `## Objective` block, never the whole document
      const objective = addressObjective(MILESTONE_SPEC);
      assert.ok(objective.startsWith("## Objective"), "spec: its Objective block");
      assert.ok(objective.length < MILESTONE_SPEC.length, "spec: never the whole document");

      // a story record -> its `## User story` block, then `## Notes` if budget holds
      const story = addressStory(STORY_RECORD);
      assert.ok(story.startsWith("## User story"), "story record: its User story block");
      assert.ok(story.includes("## Notes"), "story record: then Notes if budget holds");
      // matched case-insensitively — three real records in this stream write `## User Story`
      assert.ok(addressStory(STORY_RECORD.replace("## User story", "## User Story")) != null, "story record: the block is matched case-insensitively");

      // an architecture record -> the declared ADRs' headings and decisions, not the register whole
      const slice = addressArchitecture(ARCHITECTURE_RECORD, { declared: ["ADR-002"] });
      assert.ok(slice.text.includes("## ADR-002"), "architecture record: the declared ADR's heading");
      assert.doesNotMatch(slice.text, /## ADR-001/u, "architecture record: only what was declared");
      assert.doesNotMatch(slice.text, /## Fitness functions/u, "architecture record: not the register whole");

      // a task contract set -> the headlines and tag lines of every contract in the story
      const contracts = condenseTaskContracts(addressTaskContracts(HUGE_CONTRACTS), { budget: PHASE_BRIEF_MAX_CHARS });
      assert.ok(contracts.text.includes("Feature: A contract far past the ceiling"), "contract set: the first contract's headline");
      assert.ok(contracts.text.includes("Feature: A second contract in the same story"), "contract set: EVERY contract in the story, not just the first");
      assert.ok(contracts.text.includes("@manual"), "contract set: the tag lines of each");

      // a fitness register -> the register's rows, without the instructional comment
      const register = condenseFitnessRegister(addressFitnessRegister(ARCHITECTURE_RECORD, {}), { budget: PHASE_BRIEF_MAX_CHARS });
      assert.ok(register.text.includes("FF-0001") && register.text.includes("FF-0002"), "register: the rows");
      assert.doesNotMatch(register.text, /instructional comment is scaffolding/u, "register: without the instructional comment");

      // a document that is absent -> no section at all, rather than an empty one
      assert.equal(addressStory(null), null, "absent document: no section at all");
      assert.equal(addressObjective(undefined), null, "absent document: no section at all");
      assert.equal(addressTaskContracts(null), null, "absent contract set: no section at all");
      assert.equal(addressDependencies(null), null, "absent document: no section at all");
      const absent = compilePhaseBrief({ itemRef: "70/05", phase: "continue", story: addressStory(null), tasks: addressTaskContracts(null) });
      assert.deepEqual(absent.sections.map((s) => s.id), ["item"], "absent document: the section is omitted");
      assert.equal(absent.notice, null, "absent document: and no notice, because nothing the brief ever had was lost");

      // a document missing the block -> no section, rather than the whole file as a fallback
      const noBlock = "---\ntype: story\n---\n# A record with no user story block\n\n## Notes\nOnly notes.\n";
      assert.equal(addressStory(noBlock), null, "missing block: no section");
      const missing = compilePhaseBrief({ itemRef: "70/05", phase: "continue", story: addressStory(noBlock), tasks: SMALL_CONTRACTS });
      assert.ok(!missing.sections.some((s) => s.id === "story"), "missing block: no section");
      assert.doesNotMatch(missing.text, /Only notes\.|# A record with no user story block/u, "missing block: never the whole file as a fallback");
      // …and a section HANDED OVER but not representable is a different thing: it is dropped,
      // and it DOES raise a notice (ADR-009 §4).
      const unrepresentable = compilePhaseBrief({ itemRef: "70/05", phase: "continue", story: "S".repeat(PHASE_BRIEF_MAX_CHARS * 2), tasks: SMALL_CONTRACTS });
      assert.ok(unrepresentable.dropped.includes("story"), "handed over but unrepresentable: dropped");
      assert.ok(unrepresentable.notice != null, "handed over but unrepresentable: and it does raise a notice");
    },
  },

  // ── the two shapes task 02's stream has no witness for, witnessed here ──
  {
    name: "70/05 task01 regression a contract set past the ceiling EVEN CONDENSED is unshippable, counted and pointed at — the shape task 02's `past the ceiling even condensed` row has no witness for on this stream, because a bounded condenser (ADR-010 §1) makes a real contract set unshippable only when its own skeleton overflows",
    run: () => {
      const whole = addressTaskContracts(CONTRACTS_PAST_THE_CEILING_EVEN_CONDENSED);
      // The fixture is the row's precondition, asserted rather than assumed. This set's own
      // SKELETON overflows: its `Feature:` line alone is past the whole ceiling, so there is
      // no room in which the condenser can both name a scenario and fit. Since chore 115 that
      // is measured as a DECLINE rather than as a husk — a form naming 0 of 12 scenarios is
      // not a form — and the section is unshippable either way, which is what this row is
      // about. Nor is it "merely unrepresentable": the same twelve scenarios behind a headline
      // that fits condense to a real form, so the contract set is one the condenser reads.
      const headline = whole.split("\n").find((line) => line.startsWith("Feature:"));
      assert.ok(headline.length > PHASE_BRIEF_MAX_CHARS, `the skeleton alone is past the whole ceiling (${headline.length} > ${PHASE_BRIEF_MAX_CHARS})`);
      assert.equal(condenseTaskContracts(whole, { budget: PHASE_BRIEF_MAX_CHARS }), null, "so no declared form of it fits — and none is offered that would name none of its scenarios");
      const readable = condenseTaskContracts(whole.replace(headline, "Feature: a headline that fits"), { budget: PHASE_BRIEF_MAX_CHARS });
      assert.ok(readable != null && readable.kept > 0, "the contract set is READ, not unreadable — behind a headline that fits, the same scenarios condense to a real form");
      assert.ok(readable.text.length < whole.length / 4, `and that reduction is real (${readable.text.length} from ${whole.length})`);

      const ctx = compilePhaseBrief({
        itemRef: "70/05", phase: "refine",
        story: addressStory(STORY_RECORD),
        objective: addressObjective(MILESTONE_SPEC),
        tasks: CONTRACTS_PAST_THE_CEILING_EVEN_CONDENSED,
        fitness: addressFitnessRegister(ARCHITECTURE_RECORD, {}),
        dependencies: "70/00",
      });
      assert.deepEqual(ctx.unshippable, ["tasks"], "it is named UNSHIPPABLE");
      assert.equal(dispositionOf(ctx, "tasks").disposition, "unshippable", "and the disposition says so, not merely the array");
      assert.deepEqual(ctx.sacrificed, [], "nothing below it was given up on its account — an unshippable section frees nothing");
      assert.ok(!ctx.condensed.includes("tasks"), "and it is not reported as condensed, because it is not carried at all");
      assert.equal(sectionOf(ctx, "tasks"), null, "the contract set reaches the brief in no form");
      for (const id of ["objective", "fitness", "dependencies"]) {
        assert.ok(sectionOf(ctx, id) != null, `the lower-priority ${id} is still carried`);
      }
      assert.match(ctx.notice, /UNSHIPPABLE[^\n]*TASK CONTRACTS/u, "the notice names it unshippable");
      assert.ok(ctx.notice.includes(BRIEF_SECTION_SOURCES.tasks), "and points at where the full contract is read");
      assert.match(ctx.notice, POINTS_AT.tasks, "…at the tasks/ directory by name");
      assert.ok(ctx.chars <= ctx.ceiling, "and the brief is still within the ceiling");
    },
  },
  {
    name: "70/05 task01 regression every section within the ceiling and the sum far past it — condensed first, then sacrificed bottom-up until it fits: the shape task 02's `condensed first, then sacrificed` row has no witness for on this stream, because the share rule (ADR-010 §2) leaves every live section the room it needs",
    run: () => {
      // The row's precondition, asserted rather than assumed: EACH section within the
      // ceiling on its own, the SUM far past it. A fixture that drifted over the ceiling
      // would be exercising the unshippable row instead, silently.
      const sizes = {
        story: WITHIN_CEILING.story.length,
        objective: WITHIN_CEILING.objective.length,
        tasks: addressTaskContracts(WITHIN_CEILING.tasks).length,
        fitness: WITHIN_CEILING.fitness.length,
      };
      for (const [id, size] of Object.entries(sizes)) {
        assert.ok(size < PHASE_BRIEF_MAX_CHARS, `${id} is within the ceiling on its own (${size} < ${PHASE_BRIEF_MAX_CHARS})`);
      }
      const sum = Object.values(sizes).reduce((a, b) => a + b, 0);
      assert.ok(sum > PHASE_BRIEF_MAX_CHARS * 2, `and the sum is far past it (${sum} against ${PHASE_BRIEF_MAX_CHARS})`);

      const ctx = compilePhaseBrief({
        itemRef: "70/05", phase: "refine",
        story: WITHIN_CEILING.story,
        objective: WITHIN_CEILING.objective,
        tasks: WITHIN_CEILING.tasks,
        fitness: WITHIN_CEILING.fitness,
        dependencies: WITHIN_CEILING.dependencies,
      });

      // CONDENSED FIRST — the exact predicate task 02's row applies, run here on a witness:
      // no section is still carried UNCONDENSED while something was given up for room.
      assert.ok(ctx.sacrificed.length > 0, "something was sacrificed — the condensed set still exceeded the ceiling");
      assert.deepEqual(ctx.unshippable, [], "nothing here is unshippable — every section fits the ceiling on its own");
      const uncondensed = ctx.sections
        .filter((section) => BRIEF_SECTION_CONDENSERS[section.id] != null && !ctx.condensed.includes(section.id))
        .map((section) => section.id);
      assert.deepEqual(uncondensed, [], `sacrificed ${ctx.sacrificed.join(", ")} while these were still carried uncondensed`);
      assert.ok(ctx.condensed.length > 0, "and at least one section was condensed rather than given up");

      // THEN SACRIFICED BOTTOM-UP — `fitness` then `tasks`, the two whose only form in the
      // room a 5,419-char non-condensable objective leaves would name NONE of their own
      // entries. AMENDED BY CHORE 95 (ratified in that chore's record): the shed order is
      // unchanged, but the room the shedding freed is offered back highest-priority first,
      // so `dependencies` — LOWER in the priority order than either of them — is carried
      // rather than given up, and the retained set is no longer a prefix of that order.
      assert.deepEqual(ctx.sacrificed, ["tasks", "fitness"], "the sections given up are the ones no form of which fits the room left");
      assert.ok(sectionOf(ctx, "dependencies") != null, "and the lower-priority dependencies, which does fit, is carried rather than shed with them");

      // UNTIL IT FITS — and no further: the budget is spent, not abandoned.
      assert.ok(ctx.chars <= ctx.ceiling, `the brief fits (${ctx.chars} <= ${ctx.ceiling})`);
      assert.ok(ctx.chars > ctx.ceiling * 0.9, `and it fits by spending the budget rather than by emptying the brief (${ctx.chars} of ${ctx.ceiling})`);
      assert.match(ctx.notice, /SACRIFICED[^\n]*TASK CONTRACTS/u, "the notice names the sacrifice as a sacrifice");
      assert.match(ctx.notice, /CONDENSED[^\n]*STORY/u, "and the condensation as a condensation — the two dispositions stay distinguishable in one notice");

      // THEN SACRIFICED BOTTOM-UP — kept as a leg of its own, on the shape that still needs
      // one: the same set with an `objective` too large to sit beside the story. AMENDED BY
      // CHORE 95 (ratified in that chore's record): shedding is still bottom-up, but the room
      // it frees is offered back, so what REMAINS shed is what could not be re-seated — never
      // a lower-priority section that would have fitted the room left.
      const forced = compilePhaseBrief({
        itemRef: "70/05", phase: "refine",
        story: WITHIN_CEILING.story,
        objective: `## Objective\n\n${"objective prose. ".repeat(430)}`,
        tasks: WITHIN_CEILING.tasks,
        fitness: WITHIN_CEILING.fitness,
        dependencies: WITHIN_CEILING.dependencies,
      });
      assert.deepEqual(forced.sacrificed, ["objective"], "the section that cannot be carried in the room left is the one given up");
      assert.deepEqual(forced.unshippable, [], "and it is a sacrifice, not an unshippable — it fits the ceiling on its own");
      // …and the sacrifice CLAIM is true, which is what replaces the suffix rule: the section
      // named as given up genuinely does not fit the room the finished brief has left. A
      // brief that shed something while a tenth of its ceiling stood unspent was stating
      // something untrue, and is the defect chore 95 was raised on.
      assert.ok(
        "objective prose. ".repeat(430).length > forced.ceiling - forced.chars,
        `the objective is larger than the room left (${"objective prose. ".repeat(430).length} > ${forced.ceiling - forced.chars})`,
      );
      for (const id of ["tasks", "fitness", "dependencies"]) {
        assert.ok(sectionOf(forced, id) != null, `the lower-priority ${id} fits the room left and is carried rather than given up`);
      }
      assert.ok(forced.chars <= forced.ceiling, `the brief fits (${forced.chars} <= ${forced.ceiling})`);
      assert.match(forced.notice, /SACRIFICED[^\n]*MILESTONE OBJECTIVE/u, "the notice names the sacrifice as a sacrifice");
      assert.match(forced.notice, /CONDENSED[^\n]*STORY/u, "and the condensation as a condensation — the two dispositions stay distinguishable in one notice");
    },
  },

  // ── ADR-010 §4: condensation is EXHAUSTED before any sacrifice ──
  {
    name: "70/05 task01 regression condensation is exhausted before any sacrifice — a condensable section carried WHOLE is offered its condenser before any section is given up, because priority means LAST TO PAY and not FULL FORM FIRST (ADR-010 §4)",
    run: () => {
      const inputs = {
        itemRef: "70/05", phase: "refine",
        story: EXHAUSTION_WITNESS.story,
        objective: EXHAUSTION_WITNESS.objective,
        tasks: EXHAUSTION_WITNESS.tasks,
        fitness: EXHAUSTION_WITNESS.fitness,
        dependencies: EXHAUSTION_WITNESS.dependencies,
      };
      // THE ROW'S PRECONDITION, asserted rather than assumed — this is task 02's locked
      // "every section | each within the ceiling, the sum far past it" situation.
      const sizes = {
        story: EXHAUSTION_WITNESS.story.length,
        objective: EXHAUSTION_WITNESS.objective.length,
        tasks: addressTaskContracts(EXHAUSTION_WITNESS.tasks).length,
        fitness: EXHAUSTION_WITNESS.fitness.length,
      };
      for (const [id, size] of Object.entries(sizes)) {
        assert.ok(size < PHASE_BRIEF_MAX_CHARS, `${id} is within the ceiling on its own (${size})`);
      }
      assert.ok(Object.values(sizes).reduce((a, b) => a + b, 0) > PHASE_BRIEF_MAX_CHARS, "and the sum is past it");
      // The two properties that make this the §4 witness and not some other overflow: the
      // section that overshoots is NON-CONDENSABLE, and the section that pays for it has a
      // condenser whose reduction is large and real.
      assert.ok(BRIEF_NON_CONDENSABLE_SECTIONS.includes("objective"), "the section that overshoots the plan has no condensed form at all");
      const storyCondensed = condenseStory(EXHAUSTION_WITNESS.story);
      assert.ok(storyCondensed != null && storyCondensed.text.length < EXHAUSTION_WITNESS.story.length / 4, `and the section beneath it has a real condensed form (${EXHAUSTION_WITNESS.story.length} -> ${storyCondensed?.text.length})`);

      const ctx = compilePhaseBrief(inputs);

      // CONDENSATION EXHAUSTED: no section is carried in full form while another is given
      // up. This is the same predicate task 02's row applies to the stream, where it has no
      // witness — here it has one, and before ADR-010 §4 the compiler FAILED it.
      const uncondensed = ctx.sections
        .filter((section) => BRIEF_SECTION_CONDENSERS[section.id] != null && !ctx.condensed.includes(section.id))
        .map((section) => section.id);
      assert.deepEqual(uncondensed, [], `nothing is carried in full form while something pays (sacrificed ${JSON.stringify(ctx.sacrificed)})`);
      assert.ok(ctx.condensed.includes("story"), "the condensable section beneath the overshoot is CONDENSED");
      assert.equal(sectionOf(ctx, "story").text, storyCondensed.text, "and to its declared condensed form, byte for byte");

      // …AND THAT IS WHAT RESCUES THE SECTIONS BELOW. Under the packing as shipped this
      // brief carried three sections and sacrificed three: the story NOTES survived while
      // the acceptance criteria and the structural constraints left the brief entirely —
      // F-11's own symptom, manufactured by the packer rather than by the reader.
      assert.deepEqual(ctx.sacrificed, [], "nothing is sacrificed once condensation has been exhausted");
      assert.deepEqual(ctx.unshippable, [], "and nothing here is unshippable — every section fits the ceiling alone");
      assert.deepEqual(ctx.sections.map((section) => section.id), ["item", "story", "objective", "tasks", "fitness", "dependencies"], "every offered section is carried");
      assert.ok(scenarioTitles(sectionOf(ctx, "tasks").text).length > 0, "the acceptance criteria are named rather than absent");
      assert.ok(sectionOf(ctx, "fitness").text.includes("FF-7000"), "and the structural constraints are carried rather than absent");
      assert.ok(ctx.chars <= ctx.ceiling, `within the ceiling (${ctx.chars} <= ${ctx.ceiling})`);

      // `item` is untouched by the pass, by construction — the walk stops at index 1.
      assert.equal(ctx.sections[0].id, "item", "the item stays first");
      assert.ok(!ctx.condensed.includes("item") && !ctx.sacrificed.includes("item"), "and is neither condensed nor sacrificed");
    },
  },

  // ── a declaration the whole policy rests on: bounded condensers are DECLARED ──
  {
    name: "70/05 regression the bounded condensers are declared by name, and every bounded section's declared condenser is the one that states its own count",
    run: () => {
      assert.ok(Object.isFrozen(BRIEF_BOUNDED_CONDENSERS), "the bounded set is frozen");
      for (const id of BRIEF_BOUNDED_CONDENSERS) {
        assert.ok(BRIEF_SECTION_CONDENSERS[id] != null, `${id} is bounded, so it declares a condenser`);
      }
      const counted = condenseTaskContracts(addressTaskContracts(OVERWHELMING_CONTRACTS), { budget: 2000 });
      assert.ok(counted.text.length <= 2000, `a bounded condenser honours the room it is given (${counted.text.length} <= 2000)`);
      assert.ok(counted.omitted > 0 && counted.kept > 0, "and states a real count on both sides");
      const wider = condenseTaskContracts(addressTaskContracts(OVERWHELMING_CONTRACTS), { budget: 6000 });
      assert.ok(wider.kept > counted.kept, "more room carries more of the contract — the bound is the budget, not a constant");
    },
  },
  // ── chore 95: the architecture condenser never emits a husk ──
  {
    name: "70/05 regression the architecture slice never arrives as a husk — when no decision passage fits the room whole it carries the FIRST one OPENED, under a form that says so, rather than a heading and a count of nothing",
    run: () => {
      // A record whose every decision passage is larger than the room a tight budget leaves:
      // the shape milestone 72's own ARCHITECTURE.md has, where four decisions each ran past
      // the ~3,000 chars the planner leaves a milestone's refine brief and the section
      // arrived announcing `0 of 4 decisions listed` while naming none of them.
      const passage = (n) => `**Decision.** ${`Decision ${n} prose, stated at length so no whole passage fits the room. `.repeat(24)}`;
      const record = [
        "# Architecture",
        ...[1, 2, 3, 4].flatMap((n) => [
          `## ADR-00${n} — Decision ${n}`,
          "",
          `**Context.** ${`Context ${n} the condenser drops. `.repeat(20)}`,
          "",
          passage(n),
          "",
          `**Consequences.** ${`Consequence ${n} the condenser drops. `.repeat(20)}`,
          "",
        ]),
      ].join("\n");

      // ROOMY: every passage fits, and the form is the listed one.
      const roomy = condenseArchitectureSlice(record, { budget: PHASE_BRIEF_MAX_CHARS });
      assert.equal(roomy.kept, 4, "with room for them all, all four decisions are listed");
      assert.match(roomy.text, /^CONDENSED — each declared ADR's heading and its decision passage/u, "and the form announced is the listed one");

      // TIGHT: no passage fits whole. The section still names one of its entries.
      const tight = condenseArchitectureSlice(record, { budget: 1600 });
      assert.ok(tight != null, "a tight budget still produces a section");
      assert.ok(tight.text.length <= 1600, `and honours the room it is given (${tight.text.length} <= 1600)`);
      assert.equal(tight.kept, 1, "the first decision is carried rather than none — a section counted as carried and empty of its content is a husk");
      assert.equal(tight.total, 4, "and the count still names how many there were");
      assert.match(tight.text, /^CONDENSED — each declared ADR's heading, and the opening lines of the first decision passage/u, "the FORM says the passage was opened, so the count of 1 is honest about what 1 means");
      assert.ok(tight.text.includes("**Decision.** Decision 1 prose"), "the opened passage is the FIRST one, and it opens where the passage opens");
      assert.match(tight.text, /\n…/u, "and it is ellipsed, so a phase can see the passage was opened and not listed");
      assert.ok(!tight.text.includes(passage(1)), "…because the whole passage is precisely what did not fit");

      // Every declared ADR's HEADING is still carried — the condenser's own rule, which the
      // room held back for an unfittable first passage used to starve: three of milestone
      // 72's four headings were lost with it.
      for (const n of [1, 2, 3, 4]) {
        assert.ok(tight.text.includes(`## ADR-00${n} — Decision ${n}`), `ADR-00${n}'s heading survives — which decisions bind the item is the fact a phase must not lose`);
      }

      // AIRLESS: too little room even to open a passage worth reading. The honest answer is
      // the heading and the count, and the condenser does not invent a two-word "decision".
      const airless = condenseArchitectureSlice(record, { budget: 300 });
      assert.ok(airless == null || airless.kept === 0, "with no room for an opening worth reading, none is claimed");
      if (airless != null) {
        assert.doesNotMatch(airless.text, /opening lines of the first decision passage/u, "and the opened form is not announced by a section that carries no opening");
      }
    },
  },

  // ── chore 115: the OTHER two bounded condensers, and the reserve underneath all three ──
  {
    name: "70/05 regression the contract index and the fitness register never arrive as husks either — where no entry of theirs fits the room whole the FIRST is carried OPENED under a form that says so, and where not even an opening fits, no CONDENSED section is offered at all",
    run: () => {
      // Both fixtures are the shape chore 95's outcome measured and left open: entries all
      // larger than the room a tight budget leaves, where the section used to arrive
      // announcing itself CONDENSED and naming none of them.
      const contracts = [
        "@executable @cli",
        "Feature: the brief compiler carries what a phase needs",
        "",
        ...Array.from({ length: 8 }, (_, index) => [
          "  @executable",
          `  Scenario: case ${index + 1} names a condition at the length this stream's own scenarios are titled, which a tight budget cannot hold whole in the room its headline leaves behind`,
          "    Given a step body the condenser drops",
          "",
        ].join("\n")),
      ].join("\n");

      // ROOMY: every scenario fits, and the form announced is the listed one.
      const roomy = condenseTaskContracts(contracts, { budget: PHASE_BRIEF_MAX_CHARS });
      assert.equal(roomy.kept, 8, "with room for them all, all eight scenarios are listed");
      assert.match(roomy.text, /^CONDENSED — scenario headlines and their tag lines only/u, "and the form announced is the listed one");

      // TIGHT: no scenario fits whole. The section still names one of its own.
      const tight = condenseTaskContracts(contracts, { budget: 400 });
      assert.ok(tight != null && tight.text.length <= 400, `a tight budget still produces a section within its room (${tight?.text.length} <= 400)`);
      assert.equal(tight.kept, 1, "the first scenario is carried rather than none — a section counted as carried and empty of its content is a husk");
      assert.equal(tight.total, 8, "and the count still names how many there were");
      assert.match(tight.text, /^CONDENSED — the feature and rule headlines, and the opening of the first scenario's own headline/u, "the FORM says the headline was opened, so the count of 1 is honest about what 1 means");
      assert.match(tight.text, /\n…/u, "and it is ellipsed, so a phase can see it was opened and not listed");
      // What is opened is the HEADLINE and not the block: a block leads with its tag lines,
      // so an opening cut from it would spend the room naming no scenario at all — and the
      // stream guard's own check (the titles present must equal the count claimed) is the
      // thing that would catch it.
      assert.deepEqual(scenarioTitles(tight.text).length, tight.kept, "the section names exactly as many scenarios as it says it carried");
      assert.ok(tight.text.includes("Scenario: case 1 names a condition"), "…and the one it names is the FIRST, opened where its headline opens");

      // AIRLESS: not even an opening worth reading fits. No section is offered at all —
      // the honest answer, because a form that names 0 of 8 scenarios is not a form.
      assert.equal(condenseTaskContracts(contracts, { budget: 300 }), null, "with no room for an opening worth reading, the condenser declines rather than announcing CONDENSED with nothing carried");

      // …and the register, whose rows a tight budget outgrows the same way. LIST-SHAPED, which
      // is the register this can happen to: a TABLE row's first entry is the header row, which
      // is short and always fits, while m38's 30,461-char register and m35's 13,790 are lists
      // whose every entry runs past the room a tight budget leaves.
      const register = [
        "## Fitness register",
        "",
        "<!-- The instructional comment a register carries, which the condenser strips. It is",
        "     here because a real register has one, and because a reduction that does not",
        "     shrink is not offered at all. -->",
        "",
        ...Array.from({ length: 6 }, (_, index) => [
          `${index + 1}. **FF-71${String(index).padStart(2, "0")}** — ${`invariant ${index + 1} stated at the length this stream's own list-shaped registers state one. `.repeat(14)}`,
          "",
        ].join("\n")),
      ].join("\n");

      const wide = condenseFitnessRegister(register, { budget: PHASE_BRIEF_MAX_CHARS });
      assert.ok(wide.kept === wide.total && wide.total === 6, `with room for them all, every row is listed (${wide.kept} of ${wide.total})`);
      assert.match(wide.text, /^CONDENSED — each register row's id and invariant only/u, "and the form announced is the listed one");

      const squeezed = condenseFitnessRegister(register, { budget: 900 });
      assert.ok(squeezed != null && squeezed.text.length <= 900, `a tight budget still produces a section within its room (${squeezed?.text.length} <= 900)`);
      assert.equal(squeezed.kept, 1, "the first row is carried rather than none");
      assert.match(squeezed.text, /^CONDENSED — the register's frame, and the opening lines of its first row/u, "under the form that says the row was opened");
      assert.ok(squeezed.text.includes("**FF-7100**"), "a row leads with its id, so its opening names the row it opens");
      assert.match(squeezed.text, /\n…/u, "and it is ellipsed");
      assert.ok(squeezed.text.includes("## Fitness register"), "the register's frame is carried with it");

      assert.equal(condenseFitnessRegister(register, { budget: 300 }), null, "and with no room for an opening worth reading, the register declines too");
    },
  },
  {
    name: "70/05 regression the fill holds room back for a first entry only while that entry could claim it — a first entry larger than the whole room starves the skeleton of room nothing will ever spend, which is what lost three of milestone 72's four ADR headings",
    run: () => {
      // The contract's SKELETON is its `Feature:` and `Rule:` lines — which rules bind the
      // phase is the fact this section must not lose. The first scenario here is larger than
      // the whole budget, so no fill can ever take it: room reserved for it is room nothing
      // can claim, and the rules used to be what paid for the reservation.
      const budget = 900;
      const firstScenario = `  Scenario: ${"a first scenario whose headline runs past every room this budget could leave. ".repeat(16)}`;
      assert.ok(firstScenario.length > budget, `the first entry could never be claimed at any point in this fill (${firstScenario.length} > ${budget})`);
      const contracts = [
        "@executable @cli",
        "Feature: the fill holds back only room an entry can claim",
        "",
        "  Rule: the first rule the contract states",
        firstScenario,
        "",
        "  Rule: the second rule the contract states",
        "  Scenario: a short second scenario",
        "",
        "  Rule: the third rule the contract states",
        "  Scenario: a short third scenario",
        "",
      ].join("\n");

      const out = condenseTaskContracts(contracts, { budget });
      assert.ok(out != null && out.text.length <= budget, `the section honours the room it is given (${out?.text.length} <= ${budget})`);
      assert.ok(out.kept >= 1, "the scenarios that DO fit are still carried");
      for (const rule of ["the first rule", "the second rule", "the third rule"]) {
        assert.ok(out.text.includes(`Rule: ${rule} the contract states`), `${rule}'s headline survives — the skeleton is not starved for a first entry that could never have fitted`);
      }
      assert.ok(out.text.includes("Feature: the fill holds back only room an entry can claim"), "and so does the feature the rules hang on");
    },
  },
  {
    name: "70/05 regression the never-a-husk rule holds at EVERY budget, for every bounded condenser — the invariant swept rather than sampled, because the two budgets a chore measured are the two a fix is tuned to and the ones between them are where the next husk appears",
    run: () => {
      // The three bounded condensers, each over a record of its own kind, swept across every
      // budget from nothing to well past the ceiling. The invariant is one line: a condenser
      // either declines, or it names at least one of the entries it counts.
      const subjects = [
        ["tasks", condenseTaskContracts, [
          "@executable @cli",
          "Feature: a contract set with headlines of the length this stream writes them",
          "",
          "  Rule: the rule the scenarios below sit under",
          ...Array.from({ length: 5 }, (_, index) => [
            "  @executable",
            `  Scenario: case ${index + 1} states its condition at a length that a tight budget cannot hold whole, which is the shape every husk in this file was found in`,
            "    Given a step body the condenser drops",
            "",
          ].join("\n")),
        ].join("\n")],
        ["architecture", condenseArchitectureSlice, [
          "# Architecture",
          ...[1, 2, 3].flatMap((n) => [
            `## ADR-00${n} — Decision ${n}`,
            "",
            `**Context.** ${`Context ${n} the condenser drops. `.repeat(12)}`,
            "",
            `**Decision.** ${`Decision ${n} prose, stated at the length a real ADR states one. `.repeat(18)}`,
            "",
          ]),
        ].join("\n")],
        ["fitness", condenseFitnessRegister, [
          "## Fitness register",
          "",
          "<!-- The instructional comment a register carries, which the condenser strips. -->",
          "",
          ...Array.from({ length: 5 }, (_, index) => [
            `${index + 1}. **FF-72${String(index).padStart(2, "0")}** — ${`invariant ${index + 1} stated at the length a real register states one. `.repeat(10)}`,
            "",
          ].join("\n")),
        ].join("\n")],
      ];

      const husks = [];
      let offered = 0;
      for (const [id, condense, record] of subjects) {
        for (let budget = 0; budget <= PHASE_BRIEF_MAX_CHARS + 400; budget += 25) {
          const out = condense(record, { budget });
          if (out == null) continue;
          offered += 1;
          if (out.total > 0 && out.kept === 0) husks.push(`${id} @${budget}: ${out.kept} of ${out.total} ${out.unit}`);
        }
      }
      // NON-VACUITY: a sweep that never got a section back would be green over exactly the
      // failure it exists to catch.
      assert.ok(offered > 300, `the sweep really does get sections back to check (${offered})`);
      assert.deepEqual(husks, [], "no bounded condenser announces itself CONDENSED while naming none of its own entries, at any budget");
    },
  },
];
