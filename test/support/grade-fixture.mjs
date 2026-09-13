// test/support/grade-fixture.mjs — the fixture builder the four milestone-54 / story-01
// behavioural suites share. ONE builder, four consumers: a rubric fixture that four files
// each re-derived would drift, and the thing they are all asserting about is the SAME
// declaration shape.
//
// The repos are real on-disk workspaces (a `.aof/aof.config.json`, a work stream with a
// milestone and a story) because that is exactly the difference this story's contracts draw
// against 54/00's: 54/00 proves the PURE COMPILER over handed observations; these prove the
// COMMAND over a real repository — it reads that repo's actual configuration, decides what
// to run, and (mostly) spawns nothing.
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

import { loadWorkspace } from "../../src/work.mjs";

const FIXTURE_DATE = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

function frontmatter(fields) {
  return `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join("\n")}\n---\n`;
}

/**
 * A workspace declaring (or deliberately not declaring) a `work.rubric`.
 *
 * `rubric: null` is the ORDINARY case and the one the no-regression rule is about — almost
 * every repo that installs aof has no rubric on the day it installs it. `undefined` and
 * `null` are the same thing here: no key at all.
 */
// A `## Fitness functions` register with ONE declaration citing a control that really
// exists in the fixture. The controls lane skips an item declaring none, so a fixture meant
// to observe leg B's honest no-op (`control-runner-unchecked`) must declare one — otherwise
// the lane reports nothing and a test asserting "the lane still says so" passes vacuously,
// which is the exact defect this milestone exists to refuse.
const FITNESS_REGISTER = `
## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-0001 | **The fixture declares one control.** | \`test/arch/fixture-control.test.mjs\` | ADR-000 |
`;

export async function makeGradeRepo({ rubric = null, loop = null, controls = null, fitnessRegister = false } = {}) {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-grade-"));
  const workDir = path.join(repo, "wiki", "work");
  await mkdir(path.join(repo, ".aof"), { recursive: true });
  await mkdir(workDir, { recursive: true });

  const work = { dir: "./wiki/work" };
  if (rubric != null) work.rubric = rubric;
  if (loop != null) work.loop = loop;
  if (controls != null) work.controls = controls;
  await writeFile(path.join(repo, ".aof", "aof.config.json"), JSON.stringify({ name: "grade-fixture", work }, null, 2), "utf8");

  const milestoneDir = path.join(workDir, "03_milestone_board");
  await mkdir(milestoneDir, { recursive: true });
  await writeFile(
    path.join(milestoneDir, "SPEC.md"),
    frontmatter({ type: "milestone", number: "03", slug: "board", status: "in-progress", title: '"Board"', created: FIXTURE_DATE, updated: FIXTURE_DATE }) + "# 03 · Board\n",
    "utf8",
  );
  await writeFile(
    path.join(milestoneDir, "ARCHITECTURE.md"),
    `# Architecture\n\nADR-000.\n${fitnessRegister ? FITNESS_REGISTER : ""}`,
    "utf8",
  );
  if (fitnessRegister) {
    await mkdir(path.join(repo, "test", "arch"), { recursive: true });
    await writeFile(path.join(repo, "test", "arch", "fixture-control.test.mjs"), "export const archTests = [];\n", "utf8");
  }

  const storyDir = path.join(milestoneDir, "stories", "00_story_spine");
  await mkdir(path.join(storyDir, "tasks"), { recursive: true });
  await writeFile(
    path.join(storyDir, "STORY.md"),
    frontmatter({ type: "story", number: "00", slug: "spine", status: "in-progress", title: '"Spine"', parent: "3", created: FIXTURE_DATE, updated: FIXTURE_DATE }) + "# 00 · Spine\n",
    "utf8",
  );
  await writeFile(path.join(storyDir, "tasks", "00_task.feature"), "@executable\nFeature: fixture\n", "utf8");

  return { repo, workDir, milestoneDir, storyDir };
}

/** Write an executable node script into the fixture and answer its absolute path. */
export async function writeRunner(repo, name, body) {
  const dir = path.join(repo, "runners");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, name);
  await writeFile(file, body, "utf8");
  return file;
}

/** The declaration shape every suite starts from, varied in exactly one respect per test. */
export function rubricFor(runnerPath, extra = {}) {
  return {
    command: [process.execPath, runnerPath],
    report: { format: "tap", path: "report.tap", floor: 1 },
    ...extra,
  };
}

export const ctxFor = async (repo, extra = {}) => ({ workspace: await loadWorkspace(repo), ...extra });

/**
 * A `spawnSync` that RECORDS every launch before delegating to the real one. The contracts
 * repeatedly assert "no process was launched" and "exactly one process is launched" — an
 * observable count, not an inference — and this is the observation.
 *
 * `stub` replaces the real spawn entirely (for a launch that must not really happen, e.g.
 * the deadline outline's three declarations, which are about the PLAN and never about a run).
 */
export function countingSpawn(stub = null) {
  const calls = [];
  const spawn = (program, args, options) => {
    calls.push({ program, args, options });
    return stub ? stub(program, args, options) : spawnSync(program, args, options);
  };
  spawn.calls = calls;
  return spawn;
}
