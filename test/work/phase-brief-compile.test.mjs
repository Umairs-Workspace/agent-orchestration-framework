// Traceability wiring for milestone 70 / story 00 (phase-brief) — tasks 00 and 01.
//
//   tasks/00_compile-the-brief.feature      (@executable)
//   tasks/01_bounded-and-truncated.feature  (@executable)
//
// These two tasks exercise the PURE COMPILER (`src/phase-brief.mjs`) directly — no PTY, no
// worktree, no `claude` binary — which is exactly what ADR-002's purity buys: the bound
// (ADR-003) is testable because the thing being bounded is deterministic. One test object
// per @executable scenario; Scenario-Outline rows are folded into one entry each.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  compilePhaseBrief, isValidPhaseBrief, composePhaseBriefInput,
  PHASE_BRIEF_CEILING_CHARS, PHASE_BRIEF_MAX_CHARS, PHASE_BRIEF_CHARS_PER_TOKEN, PHASE_BRIEF_CEILING_TOKENS,
  BRIEF_SECTION_PRIORITY,
} from "../../src/phase-brief.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// A full set of inputs (continue phase selects item, story, tasks, fitness).
function fullInputs(overrides = {}) {
  return {
    itemRef: "70/00",
    phase: "continue",
    story: "As the loop, I want the session handed a compiled brief so it starts from the extraction refine already performed.",
    tasks: ["Task 00: a pure compiler turns an item's documents into one brief.context.", "Task 01: the ceiling is enforced inside the compiler."],
    objective: "A phase is handed its context instead of rediscovering it.",
    fitness: "FF-7001: one brief bag. FF-7002: the compiler is a pure leaf. FF-7003: the bound is in the writer.",
    dependencies: "Sequenced behind 70/01 and 70/02, which start together.",
    ...overrides,
  };
}

// A helper that compiles a `continue` brief whose rendered length can be driven to a target
// by padding the LOWEST-priority selected section (fitness). Padding the lowest section is
// what lets the boundary tests land "every section in full at exactly the ceiling": each
// earlier section fits, then fitness takes it precisely to the target.
function paddedInputs(fitnessLen, overrides = {}) {
  return fullInputs({ fitness: "F".repeat(fitnessLen), ...overrides });
}

export const phaseBriefCompileTests = [
  // ═══════════════ 00_compile-the-brief.feature ═══════════════
  // Scenario: a story's brief carries what the phase would otherwise rediscover
  {
    name: "70/00 task00 a story's brief carries what the phase would otherwise rediscover — names the item, carries the story outcome + task contracts + structural constraints, and no content the compiler was not handed",
    run: async () => {
      const ctx = compilePhaseBrief(fullInputs());
      assert.equal(ctx.itemRef, "70/00", "the brief names the item it is for");
      const ids = ctx.sections.map((s) => s.id);
      assert.ok(ids.includes("story"), "it carries the story's own outcome");
      assert.ok(ids.includes("tasks"), "it carries the story's task contracts");
      assert.ok(ids.includes("fitness"), "it carries the structural constraints the story is bound by");
      // no content the compiler was not handed
      const marker = "UNHANDED-SENTINEL-xyz";
      const withMarker = compilePhaseBrief(fullInputs({ story: fullInputs().story + "\n" + marker }));
      assert.ok(withMarker.text.includes(marker), "handed content is carried");
      assert.ok(!ctx.text.includes(marker), "content not handed is never fabricated into the brief");
    },
  },
  // Scenario: the compiler performs no I/O of its own
  {
    name: "70/00 task00 the compiler performs no I/O of its own — no file read, no clock read, and the same inputs produce a byte-identical brief on every invocation",
    run: async () => {
      const source = await readFile(path.join(root, "src", "phase-brief.mjs"), "utf8");
      assert.doesNotMatch(source, /\bimport\b/u, "the pure compiler imports nothing (not even node builtins)");
      assert.doesNotMatch(source, /\b(?:readFile|readdir|stat|readlink)\b/u, "no filesystem read in the compiler");
      assert.doesNotMatch(source, /\b(?:Date\.now|performance\.now|process\.hrtime|new Date)\b/u, "no wall-clock read in the compiler");
      const a = compilePhaseBrief(fullInputs());
      const b = compilePhaseBrief(fullInputs());
      assert.equal(JSON.stringify(a), JSON.stringify(b), "identical inputs produce a byte-identical brief");
      assert.equal(a.text, b.text, "the rendered text is byte-identical run to run");
    },
  },
  // Scenario: an absent section is omitted rather than faked
  {
    name: "70/00 task00 an absent section is omitted rather than faked — no fitness register omits that section, states nothing about it, and the remaining sections are unchanged in content and order",
    run: async () => {
      const without = compilePhaseBrief(fullInputs({ fitness: undefined }));
      const ids = without.sections.map((s) => s.id);
      assert.ok(!ids.includes("fitness"), "a story whose milestone has no structural register omits that section");
      assert.ok(!without.text.includes("fitness") && !without.text.includes("STRUCTURAL CONSTRAINTS"), "it states nothing about a register that does not exist");
      const withFitness = compilePhaseBrief(fullInputs());
      const retained = without.sections.filter((s) => s.id !== "fitness");
      const retainedWith = withFitness.sections.filter((s) => s.id !== "fitness");
      assert.deepEqual(retained.map((s) => s.text), retainedWith.map((s) => s.text), "the remaining sections are unchanged in content");
      assert.deepEqual(retained.map((s) => s.id), retainedWith.map((s) => s.id), "the remaining sections keep their order");
    },
  },
  // Scenario: the brief is validated before it is anyone's input
  {
    name: "70/00 task00 the brief is validated before it is anyone's input — a compiled brief conforms, and a non-conforming brief is refused by the compiler rather than returned",
    run: async () => {
      const ctx = compilePhaseBrief(fullInputs());
      assert.equal(isValidPhaseBrief(ctx), true, "a compiled brief conforms to the declared brief shape");
      assert.ok(ctx.text.length > 0 && typeof ctx.itemRef === "string" && Array.isArray(ctx.sections), "the declared shape is the compiled shape");
      assert.throws(() => compilePhaseBrief({}), /no item ref/u, "a brief with no subject is refused (thrown) by the compiler, never returned");
      assert.equal(isValidPhaseBrief({ itemRef: "" }), false, "the validator rejects a non-conforming brief");
      assert.equal(isValidPhaseBrief(null), false, "the validator rejects null");
    },
  },
  // Scenario Outline: which sections a brief is assembled from (5 rows)
  {
    name: "70/00 task00 outline which sections a brief is assembled from (5 rows: story record -> user story+benefit; task contracts -> scenarios; milestone objective -> why the work exists; fitness register -> invariants; dependency edges -> sibling items sequenced behind)",
    run: async () => {
      const inputs = fullInputs({ phase: "refine" });
      const ctx = compilePhaseBrief(inputs);
      const byId = Object.fromEntries(ctx.sections.map((s) => [s.id, s.text]));
      // the story record -> the user story and its stated benefit
      assert.ok(byId.story.includes("As the loop"), "the story record yields the user story");
      assert.ok(ctx.sections.find((s) => s.id === "story").title.includes("benefit"), "the story section's title names the benefit");
      // the story's task contracts -> the scenarios the phase must satisfy
      assert.ok(byId.tasks.includes("a pure compiler turns an item's documents"), "the task contracts yield the scenarios");
      // the milestone objective -> why the work exists
      assert.ok(byId.objective.includes("handed its context"), "the milestone objective yields why the work exists");
      // the milestone fitness register -> the invariants the phase must not break
      assert.ok(byId.fitness.includes("FF-7001"), "the fitness register yields the invariants the phase must not break");
      // the item's dependency edges -> which sibling items this one is sequenced behind
      assert.ok(byId.dependencies.includes("70/01"), "the dependency edges yield which sibling items this one is sequenced behind");
    },
  },
  // Scenario Outline: inputs that are absent, empty or malformed (5 rows)
  {
    name: "70/00 task00 outline inputs that are absent, empty or malformed (5 rows: every section -> complete; no fitness register -> without that section; empty task contract set -> says it is empty; whitespace-only section -> omitted as if absent; no item ref -> refusal)",
    run: async () => {
      // every declared section -> a complete brief
      const complete = compilePhaseBrief(fullInputs({ phase: "refine" }));
      assert.equal(complete.sections.length, 6, "refine phase with every input: item, story, objective, tasks, fitness, dependencies — complete brief");
      assert.equal(complete.truncated, false, "a complete brief within the ceiling is not truncated");
      // no fitness register -> a brief without that section, other sections unchanged
      const noFitness = compilePhaseBrief(fullInputs({ fitness: undefined }));
      assert.ok(!noFitness.sections.some((s) => s.id === "fitness"), "no fitness register -> a brief without that section");
      // an empty task contract set -> a brief that says the contract set is empty
      const emptyTasks = compilePhaseBrief(fullInputs({ tasks: [] }));
      const emptyTasksSection = emptyTasks.sections.find((s) => s.id === "tasks");
      assert.ok(emptyTasksSection.text.toLowerCase().includes("empty"), "an empty task contract set -> a brief that says the contract set is empty");
      // a section whose text is whitespace only -> a brief that omits it, exactly as if absent
      const whitespace = compilePhaseBrief(fullInputs({ story: "   \t  " }));
      assert.ok(!whitespace.sections.some((s) => s.id === "story"), "a whitespace-only section is omitted, exactly as if absent");
      // no item ref at all -> a refusal
      assert.throws(() => compilePhaseBrief({ phase: "continue" }), /no item ref/u, "no item ref -> refusal");
    },
  },

  // ═══════════════ 01_bounded-and-truncated.feature ═══════════════
  // Scenario: a brief within the ceiling is returned whole
  {
    name: "70/00 task01 a brief within the ceiling is returned whole — every section present in full, no truncation notice",
    run: async () => {
      const ctx = compilePhaseBrief(paddedInputs(60));
      assert.ok(ctx.chars < ctx.ceiling, "the assembled sections are within the ceiling");
      assert.equal(ctx.truncated, false, "no truncation");
      assert.equal(ctx.notice, null, "the brief carries no truncation notice");
      const ids = ctx.sections.map((s) => s.id);
      assert.deepEqual(ids, ["item", "story", "tasks", "fitness"], "every continue section is present in full, in declared order");
      assert.equal(ctx.dropped.length, 0, "nothing was dropped");
    },
  },
  // Scenario: an over-ceiling brief is truncated rather than shipped
  {
    name: "70/00 task01 an over-ceiling brief is truncated rather than shipped — the returned brief is within the ceiling, states that it was truncated, and names what was dropped or shortened",
    run: async () => {
      const ctx = compilePhaseBrief(paddedInputs(200000));
      assert.ok(ctx.text.length <= ctx.ceiling, "the returned brief is within the ceiling");
      assert.equal(ctx.truncated, true, "the brief states that it was truncated");
      assert.ok(typeof ctx.notice === "string" && ctx.notice.length > 0, "the truncation notice is present");
      assert.ok(ctx.notice.toLowerCase().includes("truncated"), "the notice names the truncation");
      assert.ok(ctx.dropped.includes("fitness"), "the notice names which sections were dropped");
    },
  },
  // Scenario: truncation follows the declared priority, not input order
  {
    name: "70/00 task01 truncation follows the declared priority, not input order — the highest-priority sections are retained, the lowest-priority are dropped first, and the retained sections keep their declared order",
    run: async () => {
      // refine selects all six; pad only the LOWEST (dependencies) past the ceiling.
      const ctx = compilePhaseBrief(fullInputs({
        phase: "refine",
        dependencies: "D".repeat(200000),
        fitness: "F",
      }));
      assert.deepEqual(ctx.dropped, ["dependencies"], "the lowest-priority section (dependencies) is the one dropped first");
      assert.deepEqual(ctx.sections.map((s) => s.id), ["item", "story", "objective", "tasks", "fitness"], "the retained sections keep their declared priority order");
    },
  },
  // Scenario: truncation never empties the brief
  {
    name: "70/00 task01 truncation never empties the brief — a single section that alone exceeds the whole ceiling still yields a brief that names the item, carries a truncation notice, and is not empty",
    run: async () => {
      const ctx = compilePhaseBrief(fullInputs({ phase: "refine", story: "S".repeat(400000) }));
      assert.equal(ctx.sections[0].id, "item", "the brief still names the item it is for");
      assert.equal(ctx.truncated, true, "it still carries a truncation notice");
      assert.ok(typeof ctx.notice === "string" && ctx.notice.length > 0, "the truncation notice is present");
      assert.ok(ctx.text.length > 0, "it is not empty");
      assert.ok(ctx.dropped.includes("story"), "the over-ceiling single section is dropped, not silently shipped");
    },
  },
  // Scenario: the ceiling is one number in one place
  {
    name: "70/00 task01 the ceiling is one number in one place — the ceiling is applied inside the compiler, no caller applies a size limit, and no second ceiling literal exists outside the compiler",
    run: async () => {
      assert.equal(PHASE_BRIEF_CEILING_CHARS, PHASE_BRIEF_CEILING_TOKENS * PHASE_BRIEF_CHARS_PER_TOKEN, "the ceiling is one number derived from the declared ratio");
      const over = compilePhaseBrief(paddedInputs(200000));
      assert.equal(over.ceiling, PHASE_BRIEF_CEILING_CHARS, "the compiler stamps the one ceiling literal on the brief it writes");
      // the enforcement is inside compilePhaseBrief: a caller handing oversized input gets a
      // truncated (within-ceiling) brief back, never an oversized one.
      assert.ok(over.text.length <= PHASE_BRIEF_CEILING_CHARS, "the enforcement point is the compiler itself — no caller applies a size limit");
      // no second ceiling literal outside the compiler: the ceiling is DERIVED (2000 * 4) in
      // phase-brief.mjs, so no src file hardcodes the numeric ceiling anywhere else.
      const { glob } = await import("node:fs/promises");
      let hardcoded = 0;
      for await (const file of glob(path.join(root, "src", "**", "*.mjs"))) {
        if (file.endsWith("phase-brief.mjs")) continue;
        const text = await readFile(file, "utf8");
        if (text.includes(String(PHASE_BRIEF_CEILING_CHARS))) hardcoded += 1;
      }
      assert.equal(hardcoded, 0, "no second ceiling literal exists outside the compiler");
      assert.ok((await readFile(path.join(root, "src", "phase-brief.mjs"), "utf8")).includes("PHASE_BRIEF_CEILING_TOKENS * PHASE_BRIEF_CHARS_PER_TOKEN"), "the ceiling is derived from the declared ratio, one number in one place");
      assert.equal(BRIEF_SECTION_PRIORITY.length, 7, "the declared section priority is the single section list the compiler reads, including 70/03's architecture slice");
    },
  },
  // Scenario Outline: sizes against the ceiling (5 rows)
  {
    name: "70/00 task01 outline sizes against the ceiling (5 rows: well under -> every section in full, notice absent; exactly at -> every section in full, notice absent; one past -> within ceiling, notice present; many times -> within ceiling, notice present; one section past on its own -> item named that section cut, notice present)",
    run: async () => {
      // well under the ceiling -> every section in full, notice absent
      const under = compilePhaseBrief(paddedInputs(40));
      assert.deepEqual(under.sections.map((s) => s.id), ["item", "story", "tasks", "fitness"], "well under: every section in full");
      assert.equal(under.notice, null, "well under: notice absent");

      // exactly at the ceiling -> every section in full, notice absent
      const baseline = compilePhaseBrief(paddedInputs(1));
      const at = compilePhaseBrief(paddedInputs(PHASE_BRIEF_CEILING_CHARS - baseline.chars + 1));
      assert.equal(at.chars, PHASE_BRIEF_CEILING_CHARS, "exactly at the ceiling");
      assert.deepEqual(at.sections.map((s) => s.id), ["item", "story", "tasks", "fitness"], "exactly at: every section in full");
      assert.equal(at.notice, null, "exactly at: notice absent");

      // one unit past the ceiling -> a brief within the ceiling, notice present
      const onePast = compilePhaseBrief(paddedInputs(PHASE_BRIEF_CEILING_CHARS - baseline.chars + 2));
      assert.equal(onePast.truncated, true, "one past: truncated");
      assert.ok(onePast.text.length <= onePast.ceiling, "one past: a brief within the ceiling");
      assert.ok(onePast.notice != null, "one past: notice present");

      // many times the ceiling -> a brief within the ceiling, notice present
      const many = compilePhaseBrief(paddedInputs(5000000));
      assert.ok(many.text.length <= many.ceiling, "many times: a brief within the ceiling");
      assert.equal(many.truncated, true, "many times: truncated");
      assert.ok(many.notice != null, "many times: notice present");

      // one section past on its own -> the item named, that section cut, notice present
      const own = compilePhaseBrief(fullInputs({ phase: "continue", story: "S".repeat(300000), fitness: "F", tasks: ["T"] }));
      assert.equal(own.sections[0].id, "item", "one section past on its own: the item named");
      assert.ok(own.dropped.includes("story"), "one section past on its own: that section cut");
      assert.ok(own.notice != null, "one section past on its own: notice present");
      assert.ok(own.text.length <= own.ceiling, "one section past on its own: within the ceiling");
    },
  },
  // Scenario Outline: what the truncation notice must let a reader answer (3 rows)
  {
    name: "70/00 task01 outline what the truncation notice must let a reader answer (3 rows: was truncated at all; which named sections are missing or shortened; that the remaining content is complete as far as it goes)",
    run: async () => {
      const ctx = compilePhaseBrief(paddedInputs(200000));
      assert.equal(ctx.truncated, true, "was this brief truncated at all -> yes");
      assert.ok(ctx.notice.includes("Dropped or shortened"), "the notice names which sections are missing or shortened");
      assert.ok(ctx.dropped.includes("fitness"), "the named dropped/shortened section is the fitness section");
      assert.ok(ctx.notice.includes("complete as far as they go"), "the notice states the remaining content is complete as far as it goes");
    },
  },

  // ── the compose seam (driver first-input) — exercised here for its purity ──
  {
    name: "70/00 composePhaseBriefInput — the phase context reaches the model as input when present, and a bare command when absent (absence stays benign)",
    run: async () => {
      const ctx = compilePhaseBrief(fullInputs());
      const input = composePhaseBriefInput("/aof:continue 70/00", ctx);
      assert.ok(input.startsWith("/aof:continue 70/00"), "the command leads the first input");
      assert.ok(input.includes(ctx.text), "the brief's content is present in the first input");
      assert.ok(input.includes("As the loop"), "the brief's content is the actual text, not a pointer to files");
      assert.equal(composePhaseBriefInput("/aof:continue 70/00", undefined), "/aof:continue 70/00", "no compiled context -> exactly the command");
      const truncated = compilePhaseBrief(paddedInputs(200000));
      const tInput = composePhaseBriefInput("/aof:continue 70/00", truncated);
      assert.ok(tInput.includes("TRUNCATED"), "a truncated brief's notice reaches the model as input too");
    },
  },
  {
    name: "70/03 regression the complete near-ceiling phase context actually sent, including its truncation notice, stays within PHASE_BRIEF_MAX_CHARS",
    run: () => {
      const command = "/aof:continue 70/03";
      const ctx = compilePhaseBrief({
        itemRef: `70/${"X".repeat(PHASE_BRIEF_MAX_CHARS)}`,
        phase: "continue",
        tasks: ["T".repeat(PHASE_BRIEF_MAX_CHARS)],
      });
      const composed = composePhaseBriefInput(command, ctx);
      const sentContext = composed.slice(command.length + 2);
      assert.equal(sentContext, `${ctx.text}\n\n${ctx.notice}`, "the measured context is exactly what compose sends after the command");
      assert.equal(sentContext.length, ctx.chars, "chars measures sections plus the notice, not sections alone");
      assert.ok(sentContext.length <= PHASE_BRIEF_MAX_CHARS, `${sentContext.length} <= ${PHASE_BRIEF_MAX_CHARS}`);
      assert.match(sentContext, /TRUNCATED/);
    },
  },
];
