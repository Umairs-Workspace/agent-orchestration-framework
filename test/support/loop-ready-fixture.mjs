import { mkdtemp, mkdir, rm, writeFile, utimes } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { invoke } from "../../src/command-core.mjs";
import { loadWorkspace } from "../../src/work.mjs";
import { spawnCliSync } from "./cli-spawn.mjs";
import { renderRecord } from "./loop-registry-fixture.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "bin", "aof.mjs");
const fixtureDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const fixtureMtime = new Date(`${fixtureDate}T00:00:00Z`);

function frontmatter(fields) {
  return `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join("\n")}\n---\n`;
}

async function pin(file) {
  await utimes(file, fixtureMtime, fixtureMtime);
}

async function writeItem(file, fields, heading) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${frontmatter(fields)}# ${heading}\n`, "utf8");
  await pin(file);
}

async function writeLoops(aofDir, loops) {
  if (loops === null || loops === undefined) return;
  const loopsPath = path.join(aofDir, "loops");
  if (loops === "file") {
    await writeFile(loopsPath, "not a directory\n", "utf8");
    return;
  }
  await mkdir(loopsPath, { recursive: true });
  for (const [name, spec] of Object.entries(loops)) {
    const target = path.join(loopsPath, ...name.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    const body = name.endsWith(".md") ? renderRecord(spec, path.basename(name, ".md")) : String(spec);
    await writeFile(target, body, "utf8");
  }
}

export async function makeLoopReadyRepo({
  config = {},
  milestones = [{ number: "07", slug: "alpha", stories: [{ number: "00", slug: "spine", tasks: ["00_task.feature"] }] }],
  loops = null,
} = {}) {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-loop-ready-"));
  const aofDir = path.join(repo, ".aof");
  const workDir = path.join(repo, "wiki", "work");
  const globalHome = path.join(repo, ".global-aof");
  await mkdir(aofDir, { recursive: true });
  await mkdir(workDir, { recursive: true });
  const authoredConfig = {
    name: "loop-ready-fixture",
    work: { dir: "./wiki/work", ...(config.work ?? {}) },
    ...(Object.hasOwn(config, "memory") ? { memory: config.memory } : {}),
    ...Object.fromEntries(Object.entries(config).filter(([key]) => key !== "work" && key !== "memory")),
  };
  await writeFile(path.join(aofDir, "aof.config.json"), JSON.stringify(authoredConfig, null, 2), "utf8");

  for (const milestone of milestones) {
    const milestoneDir = path.join(workDir, `${milestone.number}_milestone_${milestone.slug}`);
    await writeItem(
      path.join(milestoneDir, "SPEC.md"),
      {
        type: "milestone",
        number: milestone.number,
        slug: milestone.slug,
        status: milestone.status ?? "in-progress",
        title: `"${milestone.slug}"`,
        created: fixtureDate,
        updated: fixtureDate,
      },
      `${milestone.number} · ${milestone.slug}`,
    );
    await writeFile(path.join(milestoneDir, "ARCHITECTURE.md"), "# Architecture\n\nADR-000.\n", "utf8");
    await pin(path.join(milestoneDir, "ARCHITECTURE.md"));
    for (const story of milestone.stories ?? []) {
      const storyDir = path.join(milestoneDir, "stories", `${story.number}_story_${story.slug}`);
      await writeItem(
        path.join(storyDir, "STORY.md"),
        {
          type: "story",
          number: story.number,
          slug: story.slug,
          status: story.status ?? "in-progress",
          title: `"${story.slug}"`,
          parent: Number.parseInt(milestone.number, 10),
          created: fixtureDate,
          updated: fixtureDate,
        },
        `${story.number} · ${story.slug}`,
      );
      if (story.tasks !== null) {
        const tasksDir = path.join(storyDir, "tasks");
        await mkdir(tasksDir, { recursive: true });
        for (const taskName of story.tasks ?? []) {
          const body = taskName.endsWith(".feature") ? "@executable\nFeature: fixture\n" : "fixture notes\n";
          await writeFile(path.join(tasksDir, taskName), body, "utf8");
          await pin(path.join(tasksDir, taskName));
        }
      }
    }
  }
  await writeLoops(aofDir, loops);
  const workspace = await loadWorkspace(repo, undefined, { env: { AOF_GLOBAL_HOME: globalHome } });
  const env = { ...process.env, AOF_GLOBAL_HOME: globalHome, NODE_NO_WARNINGS: "1" };
  const ctx = { workspace, globalWorkStoreOptions: { env } };
  return {
    repo,
    workDir,
    aofDir,
    globalHome,
    env,
    ctx,
    cleanup: () => rm(repo, { recursive: true, force: true }),
  };
}

export async function withLoopReadyRepo(options, run) {
  const fixture = await makeLoopReadyRepo(options);
  try {
    return await run(fixture);
  } finally {
    await fixture.cleanup();
  }
}

export async function invokeDoctor(fixture, scope) {
  return await invoke("work:doctor", scope ? { scope } : {}, fixture.ctx);
}

export async function invokeLoopsValidate(fixture) {
  return await invoke("work:loops-validate", {}, fixture.ctx);
}

export function runDoctorCli(fixture, { scope, strict = false, explain, converge = false, json = true } = {}) {
  const args = ["work", "doctor"];
  if (scope) args.push(scope);
  if (strict) args.push("--strict");
  if (explain) args.push("--explain", explain);
  if (converge) args.push("--converge");
  if (json) args.push("--json");
  return spawnCliSync(process.execPath, [cliPath, ...args], {
    cwd: fixture.repo,
    encoding: "utf8",
    env: fixture.env,
  });
}

export function runLoopsCli(fixture) {
  return spawnCliSync(process.execPath, [cliPath, "work", "loops", "validate", "--json"], {
    cwd: fixture.repo,
    encoding: "utf8",
    env: fixture.env,
  });
}

export function row(loopReady, id) {
  return loopReady.checks.find((check) => check.id === id);
}

export function parseJson(result) {
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`CLI failed (${result.status}): ${result.stderr || result.stdout}`);
  }
  return JSON.parse(result.stdout);
}
