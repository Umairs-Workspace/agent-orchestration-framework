// 145 / task 00 — the wave plan is replayed from the loop's own rules. `planLoopWaves` asks
// `nextWork(…, { throughReview: true })` over a view overlay and partitions each `readySet` with
// `partitionReadySetByDeclaredFiles`, until nothing is ready. Driven against a fixture milestone 07
// (stories 01-03, each with a task), the lane bound 3 unless a case says otherwise.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LOOP_PLAN_ASSUMPTION, planLoopWaves } from "@aof/work/ready-wave";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");

// `stories` maps a story number to its frontmatter extras: `files`/`depends` as written (or
// `null` for no key), and `status`.
async function fixture({ stories = {}, milestone = {}, extraDrivers = [] } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-loop-wave-plan-"));
  const project = path.join(root, "P");
  const globalHome = path.join(root, "G");
  const work = path.join(project, "wiki", "work");
  await mkdir(path.join(project, ".aof"), { recursive: true });
  await mkdir(globalHome, { recursive: true });
  const config = { name: "fixture", resources: [], work: { dir: "./wiki/work", loop: { concurrency: "refine_first" } } };
  await writeFile(path.join(project, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
  const milestoneDir = path.join(work, "07_milestone_m");
  await mkdir(milestoneDir, { recursive: true });
  const depends = milestone.depends ? `depends: ${milestone.depends}\n` : "";
  await writeFile(
    path.join(milestoneDir, "SPEC.md"),
    `---\ntype: milestone\nnumber: 07\nslug: m\ntitle: m\nstatus: ${milestone.status ?? "in-progress"}\n${depends}schema: 1\n---\n# 07 · m\n`,
    "utf8",
  );
  for (const driver of extraDrivers) {
    const dir = path.join(work, `${driver.number}_milestone_${driver.slug}`);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "SPEC.md"), `---\ntype: milestone\nnumber: ${driver.number}\nslug: ${driver.slug}\ntitle: ${driver.slug}\nstatus: ${driver.status}\nschema: 1\n---\n`, "utf8");
  }
  const defaults = { "01": { files: "[src/a.mjs]" }, "02": { files: "[src/b.mjs]" }, "03": { files: "[src/c.mjs]" } };
  for (const [number, base] of Object.entries(defaults)) {
    const story = { ...base, ...(stories[number] ?? {}) };
    if (story.absent) continue;
    const dir = path.join(milestoneDir, "stories", `${number}_story_s${number}`);
    await mkdir(path.join(dir, "tasks"), { recursive: true });
    const lines = [
      "---", "type: story", `number: ${number}`, `slug: s${number}`, `title: s${number}`, `status: ${story.status ?? "not-started"}`, "schema: 1",
      ...(story.files == null ? [] : [`files: ${story.files}`]),
      ...(story.depends == null ? [] : [`depends: ${story.depends}`]),
      "---", `# 07/${number}`, "",
    ];
    await writeFile(path.join(dir, "STORY.md"), lines.join("\n"), "utf8");
    await writeFile(path.join(dir, "tasks", "00_t.feature"), "@executable\nFeature: t\n\n  Scenario: s\n    Given a\n", "utf8");
  }
  return { root, project, globalHome, work };
}

async function withFixture(options, fn) {
  const fx = await fixture(options);
  try {
    return await fn(fx);
  } finally {
    await rm(fx.root, { recursive: true, force: true });
  }
}

const plan = (fx, bound = 3) => planLoopWaves(fx.work, "07", { projectRoot: fx.project, bound });
const refs = (wave) => wave.members.map((member) => member.ref);
const heldIn = (wave, ref) => wave.held.find((held) => held.ref === ref);

async function snapshot(dir) {
  const out = [];
  const walk = async (current) => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else out.push(`${path.relative(dir, full)} ${(await stat(full)).size} ${(await stat(full)).mtimeMs}`);
    }
  };
  await walk(dir);
  return out.sort();
}

export const loopWavePlanTests = [
  {
    name: "145/00 E4: two stories writing different files share wave 1, in stream order",
    run: () => withFixture({ stories: { "03": { absent: true } } }, async (fx) => {
      const { waves } = await plan(fx);
      assert.deepEqual(refs(waves[0]), ["07/01", "07/02"]);
    }),
  },
  {
    name: "145/00 E5: a story whose files overlap an earlier one waits a wave, and says why",
    run: () => withFixture({ stories: { "02": { files: "[src/]" }, "03": { absent: true } } }, async (fx) => {
      const { waves } = await plan(fx);
      assert.deepEqual(refs(waves[0]), ["07/01"]);
      assert.deepEqual(refs(waves[1]), ["07/02"]);
      assert.deepEqual(heldIn(waves[0], "07/02"), { ref: "07/02", reason: "files-overlap", overlaps: ["07/01"] });
    }),
  },
  {
    name: "145/00 E6: a story that depends on another builds in the wave after it, and the edge is recorded",
    run: () => withFixture({ stories: { "02": { depends: "[01]" }, "03": { absent: true } } }, async (fx) => {
      const result = await plan(fx);
      assert.deepEqual(refs(result.waves[0]), ["07/01"]);
      assert.deepEqual(refs(result.waves[1]), ["07/02"]);
      assert.deepEqual(result.edges.map((edge) => `${edge.from} -> ${edge.to}`), ["07/01 -> 07/02"]);
    }),
  },
  {
    name: "145/00: the held reason comes from the partition, not from the plan (outline, three rows)",
    run: async () => {
      const rows = [
        { setup: { "01": { files: "[src/]" }, "02": { files: "[src/x.mjs]" } }, reason: "files-overlap" },
        { setup: { "01": { files: "[src/a.mjs]" }, "02": { files: null } }, reason: "write-set-unknown" },
        { setup: { "01": { files: null }, "02": { files: "[src/b.mjs]" } }, reason: "after-unknown" },
      ];
      for (const row of rows) {
        await withFixture({ stories: { ...row.setup, "03": { absent: true } } }, async (fx) => {
          const { waves } = await plan(fx);
          assert.equal(heldIn(waves[0], "07/02")?.reason, row.reason, JSON.stringify(row.setup));
        });
      }
    },
  },
  {
    name: "145/00: work:next answers the same wave and held set as before; the reasons ride only the partition's new key",
    run: () => withFixture({ stories: { "01": { files: "[src/]" }, "02": { files: "[src/x.mjs]" }, "03": { absent: true } } }, async (fx) => {
      const result = spawnSync(process.execPath, [cliPath, "work", "next", "07", "--through-review", "--json"], {
        cwd: fx.project,
        encoding: "utf8",
        env: { ...process.env, AOF_GLOBAL_HOME: fx.globalHome, NODE_NO_WARNINGS: "1" },
      });
      assert.equal(result.status, 0, result.stderr);
      const envelope = JSON.parse(result.stdout);
      assert.deepEqual(envelope.wave.map((member) => member.ref), ["07/01"]);
      assert.deepEqual(envelope.heldSet.map((member) => member.ref), ["07/02"]);
      assert.equal("heldReasons" in envelope, false, "work:next carries no new key");
      // Before this story a wave/held member was its readySet entry without `path`, and still is.
      for (const member of [...envelope.wave, ...envelope.heldSet]) {
        const entry = envelope.readySet.find((ready) => ready.ref === member.ref);
        assert.deepEqual(Object.keys(member).sort(), Object.keys(entry).filter((key) => key !== "path").sort(), "the members' keys are unchanged");
      }
    }),
  },
  {
    name: "145/00 E7: a wave larger than the lane bound marks the members past it as waiting for a lane",
    run: () => withFixture({}, async (fx) => {
      const result = await plan(fx, 2);
      assert.deepEqual(refs(result.waves[0]), ["07/01", "07/02", "07/03"]);
      assert.deepEqual(result.waves[0].members.filter((member) => member.waitsForLane).map((member) => member.ref), ["07/03"]);
      assert.equal(result.bound, 2);
    }),
  },
  {
    name: "145/00 E8: a story with no declared files runs alone and holds the rest",
    run: () => withFixture({ stories: { "01": { files: null } } }, async (fx) => {
      const { waves } = await plan(fx);
      assert.deepEqual(refs(waves[0]), ["07/01"]);
      assert.deepEqual(waves[0].held, [{ ref: "07/02", reason: "after-unknown" }, { ref: "07/03", reason: "after-unknown" }]);
      // The next wave partitions afresh: the unknown flag is not carried across waves.
      assert.deepEqual(refs(waves[1]), ["07/02", "07/03"]);
    }),
  },
  {
    name: "145/00: the plan states that its waves assume each wave finishes together",
    run: () => withFixture({}, async (fx) => {
      const result = await plan(fx);
      assert.equal(result.assumption, LOOP_PLAN_ASSUMPTION);
      assert.match(result.assumption, /asks again as each lane finishes/);
    }),
  },
  {
    name: "145/00 E9: a story already in review keeps its place in the plan, shaded as built",
    run: () => withFixture({ stories: { "01": { status: "in-review" }, "03": { absent: true } } }, async (fx) => {
      const { waves } = await plan(fx);
      assert.deepEqual(refs(waves[0]), ["07/01", "07/02"]);
      const [first, second] = waves[0].members;
      assert.deepEqual([first.built, first.status], [true, "in-review"]);
      assert.equal(second.built, false);
    }),
  },
  {
    name: "145/00 E10: a finished milestone still plans every story, every one built",
    run: () => withFixture({ milestone: { status: "done" }, stories: { "01": { status: "done" }, "02": { status: "done" }, "03": { absent: true } } }, async (fx) => {
      const result = await plan(fx);
      const planned = result.waves.flatMap(refs);
      assert.deepEqual(planned.sort(), ["07/01", "07/02"], "every story appears in exactly one wave");
      assert.ok(result.waves.every((wave) => wave.members.every((member) => member.built)));
      assert.deepEqual(result.unplanned, []);
    }),
  },
  {
    name: "145/00: the plan reads nothing outside the milestone's own decision, and writes nothing",
    run: () => withFixture({ milestone: { depends: "[06]" }, extraDrivers: [{ number: "06", slug: "prior", status: "not-started" }] }, async (fx) => {
      const before = await snapshot(fx.project);
      const result = await plan(fx);
      assert.deepEqual(result.waves.flatMap(refs).sort(), ["07/01", "07/02", "07/03"]);
      assert.deepEqual(await snapshot(fx.project), before, "no file in the work tree has changed");
    }),
  },
  {
    name: "145/00: a depends cycle is reported as unplanned, and the replay terminates",
    run: () => withFixture({ stories: { "01": { depends: "[02]" }, "02": { depends: "[01]" } } }, async (fx) => {
      const result = await plan(fx);
      assert.deepEqual(result.waves.flatMap(refs), ["07/03"]);
      assert.deepEqual(result.unplanned, ["07/01", "07/02"]);
    }),
  },
];
