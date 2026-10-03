// Traceability wiring for story 146 — a capture can skip the backlog.
//
// Covers EVERY @executable scenario in
//   tasks/00_the-add-commands-take-in-stream.feature
// Task 01 is @manual: an agent following the rendered prompt in a scratch project, which no
// assertion over the prose can stand in for.
//
// It reads the bundle SOURCES (`packages/core/assets/commands/`) and pins CONTENT, not wording —
// refine-discovery-beat's precedent. Byte-identity with a fresh render is read from
// `aof work update --dry-run --json`, which answers `skip` for a copy that is exactly what the
// current source renders. The "no prompt works out a number" scenario runs FF-12703's own leg (e)
// rather than a second copy of its sweep.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { archTests as oneMintTests } from "../arch/work/acd-one-mint.test.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");
const read = (rel) => readFile(path.join(repoRoot, rel), "utf8").then((text) => text.replace(/\r\n/g, "\n"));
const flat = (text) => text.replace(/\s+/g, " ");

const COMMANDS = "packages/core/assets/commands";
const DRIVERS = ["add-milestone", "add-story", "add-chore", "add-spike", "add-uat"];
const PROMPTS = DRIVERS.map((name) => `${COMMANDS}/${name}.md`);
const COPIES = DRIVERS.flatMap((name) => [
  `.claude/commands/aof/${name}.md`,
  `.codex/skills/aof-${name}/SKILL.md`,
  `.opencode/commands/aof/${name}.md`,
]);
const PROMOTE = "`aof work promote <slug> --json`";

// ── the slices the scenarios name ───────────────────────────────────────────────────────────────
const argumentHintOf = (text) => {
  const match = /^argument-hint:(.*)$/m.exec(text);
  assert.ok(match, "the prompt carries an argument-hint");
  return match[1];
};
// The intake step: the numbered step that decides whether the capture stays, to the next step.
function intakeStepOf(text) {
  const start = text.search(/^\d+\. \*\*(Then the intake decides|A standalone story's intake)/m);
  assert.ok(start >= 0, "the intake step is found");
  const rest = text.slice(start + 1);
  const next = rest.search(/^\d+\. |^<\/process>/m);
  return flat(text.slice(start, next === -1 ? text.length : start + 1 + next));
}
// The switch's own clause inside the intake step: from "With `--in-stream`" to "Without the switch".
function switchClauseOf(step) {
  const start = step.indexOf("With `--in-stream`");
  const end = step.indexOf("Without the switch", start);
  assert.ok(start >= 0 && end > start, "the intake step opens with the switch's clause");
  return step.slice(start, end);
}
const outputOf = (text) => flat(text.slice(text.indexOf("<output>"), text.indexOf("</output>")));

let dryRun = null;
function freshRenderActions() {
  if (dryRun) return dryRun;
  const result = spawnSync(process.execPath, [cliPath, "work", "update", "--dry-run", "--json"], { cwd: repoRoot, encoding: "utf8", env: { ...process.env, NODE_NO_WARNINGS: "1" } });
  assert.equal(result.status, 0, result.stderr);
  dryRun = new Map(JSON.parse(result.stdout).actions.map((action) => [action.path, action.action]));
  return dryRun;
}

function assertSwitchPromotesWhateverIntake(step, prompt) {
  const clause = switchClauseOf(step);
  assert.ok(clause.includes(PROMOTE), `${prompt}: the switch runs ${PROMOTE}`);
  assert.ok(clause.includes("straight after the scaffold"), `${prompt}: the promote runs straight after the scaffold`);
  assert.ok(clause.includes("whatever `work.intake` says"), `${prompt}: the switch overrides work.intake`);
}

export const workAddInStreamTests = [
  // ══ R1 · `--in-stream` sends one capture straight into the stream, at the tail ══
  {
    name: "work/146-00 E1 add-story tells the agent to promote a standalone story straight away when --in-stream is given",
    run: async () => {
      const text = await read(`${COMMANDS}/add-story.md`);
      assert.ok(argumentHintOf(text).includes("--in-stream"), "the argument hint lists --in-stream");
      assertSwitchPromotesWhateverIntake(intakeStepOf(text), "add-story");
      const output = outputOf(text);
      const switchCase = output.slice(output.indexOf("With `--in-stream`"));
      assert.ok(output.includes("With `--in-stream`"), "the output names the switch case");
      assert.ok(switchCase.includes("minted ref") && switchCase.includes("`aof:refine <NN>`"), "the switch case reports the minted ref and names aof:refine <NN> next");
    },
  },
  {
    name: "work/146-00 E2 without the switch, the backlog intake still leaves the capture in the backlog",
    run: async () => {
      const text = await read(`${COMMANDS}/add-story.md`);
      const step = intakeStepOf(text);
      assert.match(step, /Without the switch, under `work\.intake: "backlog"` it STAYS in the backlog/);
      assert.match(outputOf(text), /left in the backlog, `aof:promote <slug>` first/);
    },
  },
  {
    name: "work/146-00 E3 the switch appends at the tail and names no position",
    run: async () => {
      const clause = switchClauseOf(intakeStepOf(await read(`${COMMANDS}/add-milestone.md`)));
      assert.ok(clause.includes(PROMOTE), "the clause runs the promote");
      assert.ok(!clause.includes("--at"), "the promote it runs for --in-stream carries no --at");
      assert.match(clause, /lands at the tail/);
    },
  },
  {
    name: "work/146-00 every top-level add prompt carries the switch (Examples: the five driver prompts)",
    run: async () => {
      for (const prompt of PROMPTS) {
        const text = await read(prompt);
        assert.ok(argumentHintOf(text).includes("--in-stream"), `${prompt}: the argument hint lists --in-stream`);
        assertSwitchPromotesWhateverIntake(intakeStepOf(text), prompt);
        assert.match(
          flat(text),
          /`--in-stream` may appear anywhere in the arguments and is removed from them before the slug and title are derived/,
          `${prompt}: the switch is removed before the slug and title are derived`,
        );
      }
    },
  },
  {
    name: "work/146-00 the task prompt is not a driver and gains no switch",
    run: async () => {
      const text = await read(`${COMMANDS}/add-task.md`);
      assert.ok(text.length > 0, "non-vacuity: add-task.md was read");
      assert.ok(!text.includes("--in-stream"), "add-task.md does not mention --in-stream");
    },
  },

  // ══ R2 · The switch never mints and never reaches around a promote refusal ══
  {
    name: "work/146-00 E4 a promote refusal after --in-stream is reported and the item stays in the backlog",
    run: async () => {
      const step = intakeStepOf(await read(`${COMMANDS}/add-chore.md`));
      assert.match(step, /A promote refusal after `--in-stream` .*is reported as a stop/);
      assert.match(step, /stays where it was scaffolded, in the backlog/);
    },
  },
  {
    name: "work/146-00 no add prompt works out a number for the switch — FF-12703 (acd-one-mint) leg (e)",
    run: async () => {
      const leg = oneMintTests.find((test) => test.name.includes("no src/bundle/commands/add-*.md computes a top-level number"));
      assert.ok(leg, "FF-12703 leg (e) is found");
      await leg.run();
    },
  },
  {
    name: "work/146-00 each rendered prompt matches a fresh render (Examples: the fifteen copies)",
    run: async () => {
      const actions = freshRenderActions();
      for (const copy of COPIES) assert.equal(actions.get(copy), "skip", `${copy} is what a fresh render writes`);
    },
  },
];
