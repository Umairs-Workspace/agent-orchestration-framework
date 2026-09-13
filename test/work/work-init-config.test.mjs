// chore 51 — `Init writes a config`. Traceability wiring for the chore's
// ## Definition of Done, exercised against the REAL engine (`initConfig` in
// ../src/work/init.mjs), which is the ONE writer `/aof:init` calls after
// `aof work init` has rendered the bundle and the agent step has analysed the repo.
//
// A chore carries no .feature (acd-chore-no-feature), so these are the DoD boxes
// stated as assertions:
//   · box 4 — after the call, .aof/aof.config.json exists with memory.backend
//             "graphify" set active by default;
//   · box 5 — the inferred layers/refinements/domains land as a work.tags block;
//   · box 6 — an EXISTING config with no tags is FILLED and nothing else is
//             touched (work.dir/work.agents/memory/headroom/mesh and a foreign
//             section all survive byte-intact);
//   · box 7 — the written vocabulary is the SAME shape validateWork's closed tag
//             check reads: a feature tagged from it validates clean, and one
//             tagged outside it is still reported.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { initConfig } from "../../src/work/init.mjs";
import { validateWork } from "../../src/work.mjs";
// milestone 127 / story 02 task 04 — the face whose `--json` projection must carry the new
// envelope key (ADR-005 §1). Asserted through the command's own projection rather than a
// re-spelling of it, so a key that lands on the engine and not on the face is still red.
import { workInitConfigCommand } from "../../src/commands/init-update.mjs";

async function repoFixture() {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-init-config-"));
  await mkdir(path.join(repo, ".aof"), { recursive: true });
  return repo;
}

function configPathOf(repo) {
  return path.join(repo, ".aof", "aof.config.json");
}

async function readWrittenConfig(repo) {
  return JSON.parse(await readFile(configPathOf(repo), "utf8"));
}

// A config in exactly the state a plain `aof work init` (+ optional
// `--with-headroom`) leaves behind: real keys, NO tag vocabulary.
const SEEDED_CONFIG = {
  $schema: "https://aof.local/schemas/aof.schema.json",
  name: "seeded",
  resources: [],
  work: {
    dir: "./docs/work",
    agents: { mode: "orchestrated", productOwner: "inline" },
    headroom: { enabled: true, mode: "wrap", providers: ["claude", "codex"] },
  },
  memory: { backend: "local" },
  packages: [],
  runtimes: ["claude", "codex"],
  mesh: { workspaceId: "deadbeefcafe0001" },
  // A section aof does not own at all — the strictest form of "leaves every other
  // key untouched".
  somebodyElsesSection: { keep: ["me"], nested: { deeply: true } },
};

async function seedConfig(repo, config = SEEDED_CONFIG) {
  await writeFile(configPathOf(repo), `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return config;
}

// A one-milestone stream whose single task feature carries the tags named, so the
// closed-vocabulary check has something real to accept or reject.
async function seedStream(repo, featureTags) {
  const workDir = path.join(repo, "wiki", "work");
  const tasksDir = path.join(workDir, "01_milestone_probe", "stories", "01_story_probe", "tasks");
  await mkdir(tasksDir, { recursive: true });
  await writeFile(
    path.join(workDir, "01_milestone_probe", "SPEC.md"),
    '---\ntype: milestone\nnumber: 01\nslug: probe\nstatus: in-progress\ntitle: "Probe"\ncreated: 2026-08-13\nupdated: 2026-08-13\n---\n',
    "utf8",
  );
  await writeFile(
    path.join(workDir, "01_milestone_probe", "stories", "01_story_probe", "STORY.md"),
    '---\ntype: story\nnumber: 01\nslug: probe\nparent: 01\nstatus: in-progress\ntitle: "Probe"\ncreated: 2026-08-13\nupdated: 2026-08-13\n---\n',
    "utf8",
  );
  await writeFile(
    path.join(tasksDir, "01_probe.feature"),
    `Feature: Probe\n\n  ${featureTags} @executable\n  Scenario: it runs\n    Given a thing\n    When it happens\n    Then it works\n`,
    "utf8",
  );
  return workDir;
}

export const workInitConfigTests = [
  // ==========================================================================
  // milestone 127 / story 02 / task 04 — `work.intake` is written HERE, into a
  // config this verb CREATES, and nowhere else (ADR-005 §1).
  //
  //   Scenario: a config born from init-config carries intake backlog
  //   Scenario Outline: an existing config is never re-pointed (all four rows)
  //
  // The second is the load-bearing one: filling `"backlog"` into an existing
  // config's HOLE would silently change where that project's next item lands,
  // which is what "absent ⇒ stream" exists to prevent.
  // ==========================================================================
  {
    name: "work/init-config 127/02: a config born from init-config carries work.intake \"backlog\" beside the memory backend, and the envelope + --json projection report created/intakeWritten true",
    run: async () => {
      const repo = await repoFixture();
      try {
        const result = await initConfig({ targetDir: repo });

        assert.equal(result.created, true, "the config did not exist before the call");
        assert.equal(result.intakeWritten, true, "the envelope reports the intake as newly written");
        assert.equal(result.intake, "backlog", "…and carries the value it wrote");

        const config = await readWrittenConfig(repo);
        assert.equal(config.work.intake, "backlog", "a fresh repository lands on the backlog with no prompt edit");
        assert.equal(config.memory.backend, "graphify", "beside the memory backend — both defaults land in the same write");

        // The FACE, not a second spelling of it: the `--json` document a caller reads.
        const document = workInitConfigCommand.cli.json({ ...result, targetDir: repo });
        assert.equal(document.intakeWritten, true, "the --json projection carries intakeWritten");
        assert.equal(document.intake, "backlog", "…beside the value, the shape backendWritten/memoryBackend use");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  // Scenario Outline: an existing config is never re-pointed — every row.
  ...[
    { before: "work: { dir: \"./wiki/work\" }", work: { dir: "./wiki/work" }, after: null, why: "an absent key stays absent — it reads as stream" },
    { before: "work: { intake: \"stream\" }", work: { dir: "./wiki/work", intake: "stream" }, after: "stream", why: "an explicit choice is kept" },
    { before: "work: { intake: \"backlog\" }", work: { dir: "./wiki/work", intake: "backlog" }, after: "backlog", why: "already chosen" },
    { before: "no work block at all", work: undefined, after: null, why: "the config exists, so nothing is filled" },
  ].map(({ before, work, after, why }) => ({
    name: `work/init-config 127/02: an existing config carrying ${before} is never re-pointed — work.intake is ${after ?? "absent"} and intakeWritten is false (${why})`,
    run: async () => {
      const repo = await repoFixture();
      try {
        const seeded = { $schema: "https://aof.local/schemas/aof.schema.json", name: "seeded", resources: [], memory: { backend: "local" } };
        if (work !== undefined) seeded.work = work;
        await seedConfig(repo, seeded);
        const beforeConfig = await readWrittenConfig(repo);

        const result = await initConfig({ targetDir: repo, tags: { layers: ["@cli"] } });

        assert.equal(result.created, false, "the config already existed");
        assert.equal(result.intakeWritten, false, "nothing was written into an existing config's intake");
        assert.equal(result.intake, after, `the envelope reports the intake as ${after ?? "absent (null)"}`);

        const afterConfig = await readWrittenConfig(repo);
        assert.equal(afterConfig.work?.intake ?? null, after, `work.intake is ${after ?? "absent"} — ${why}`);

        // And no key changed other than the two chore 51 already fills into a hole.
        assert.deepEqual(afterConfig.work?.tags, { layers: ["@cli"] }, "work.tags — the chore 51 fill");
        assert.equal(afterConfig.memory.backend, "local", "memory.backend — an existing choice is kept");
        assert.equal(afterConfig.name, beforeConfig.name);
        assert.equal(afterConfig.$schema, beforeConfig.$schema);
        assert.deepEqual(afterConfig.resources, beforeConfig.resources);
        assert.deepEqual(
          Object.keys(afterConfig).sort(),
          [...new Set([...Object.keys(beforeConfig), "work"])].sort(),
          "no root key is invented beyond the `work` block work.tags nests under",
        );
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  })),

  // DoD box 4 + 5 — a repo with NO config gets one, memory.backend active by
  // default and the inferred vocabulary written.
  {
    name: "work/init-config: a repo with no config gets one carrying memory.backend \"graphify\" and the inferred work.tags",
    run: async () => {
      const repo = await repoFixture();
      try {
        const result = await initConfig({
          targetDir: repo,
          tags: { layers: ["@cli", "@ui"], refinements: ["@work"], domains: ["@board", "@memory"] },
        });

        assert.equal(result.created, true, "the config did not exist before the call");
        assert.ok(existsSync(configPathOf(repo)), ".aof/aof.config.json exists after the call");

        const config = await readWrittenConfig(repo);
        assert.equal(config.memory.backend, "graphify", "memory.backend is graphify, active by default");
        assert.equal(result.backendWritten, true, "the result reports the backend as newly set");
        assert.deepEqual(config.work.tags, {
          layers: ["@cli", "@ui"],
          refinements: ["@work"],
          domains: ["@board", "@memory"],
        });
        assert.equal(result.tagsWritten, true, "the result reports the vocabulary as written");

        // The document it BIRTHS is a valid aof config: the schema's required
        // root keys are present, not just the two blocks this verb owns.
        assert.equal(config.$schema, "https://aof.local/schemas/aof.schema.json");
        assert.equal(config.name, path.basename(repo), "name defaults to the project directory name");
        assert.deepEqual(config.resources, [], "resources (schema-required) is present");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  // DoD box 6 — the fill, and the no-clobber. Every other key survives byte-intact,
  // INCLUDING an already-chosen memory backend (fill the hole, never re-author).
  {
    name: "work/init-config: an existing config with no tags is FILLED — work.dir/work.agents/headroom/mesh, a foreign section and an existing memory.backend all survive",
    run: async () => {
      const repo = await repoFixture();
      try {
        await seedConfig(repo);
        const before = await readWrittenConfig(repo);

        const result = await initConfig({
          targetDir: repo,
          tags: { layers: ["@cli"], domains: ["@work-stream"] },
        });

        assert.equal(result.created, false, "the config already existed");
        const after = await readWrittenConfig(repo);

        // The fill.
        assert.deepEqual(after.work.tags, { layers: ["@cli"], domains: ["@work-stream"] });
        assert.equal(result.tagsWritten, true);

        // An EXISTING backend choice is kept — "active by default" is a default,
        // not an override.
        assert.equal(after.memory.backend, "local", "the project's own memory backend choice survives");
        assert.equal(result.backendWritten, false, "the result reports the backend as kept, not set");

        // The no-clobber: every other key, byte-for-byte.
        assert.deepEqual(after.work.dir, before.work.dir);
        assert.deepEqual(after.work.agents, before.work.agents);
        assert.deepEqual(after.work.headroom, before.work.headroom);
        assert.deepEqual(after.mesh, before.mesh);
        assert.deepEqual(after.packages, before.packages);
        assert.deepEqual(after.runtimes, before.runtimes);
        assert.deepEqual(after.resources, before.resources);
        assert.equal(after.name, before.name);
        assert.equal(after.$schema, before.$schema);
        assert.deepEqual(after.somebodyElsesSection, before.somebodyElsesSection, "a section aof does not own survives untouched");

        // Nothing was added beyond the two keys this verb owns.
        assert.deepEqual(
          Object.keys(after).sort(),
          Object.keys(before).sort(),
          "no root key is invented (work.tags nests under the existing work block)",
        );
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  // The other half of "fill, never re-author": a project that already HAS a
  // vocabulary keeps it, whatever the agent inferred.
  {
    name: "work/init-config: a config that already carries a tag vocabulary keeps it — the inferred one never overwrites it",
    run: async () => {
      const repo = await repoFixture();
      try {
        await seedConfig(repo, {
          ...SEEDED_CONFIG,
          work: { ...SEEDED_CONFIG.work, tags: { layers: ["@existing"], domains: ["@already-chosen"] } },
        });

        const result = await initConfig({
          targetDir: repo,
          tags: { layers: ["@inferred"], refinements: ["@nope"], domains: ["@also-inferred"] },
        });

        const after = await readWrittenConfig(repo);
        assert.deepEqual(after.work.tags, { layers: ["@existing"], domains: ["@already-chosen"] });
        assert.equal(result.tagsWritten, false, "nothing was written over the existing vocabulary");
        assert.equal(result.tagsKept, true, "the result says the existing vocabulary was kept");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  // No vocabulary offered (the bare call): the backend default still lands, and
  // no empty work.tags husk is invented.
  {
    name: "work/init-config: with no vocabulary given the backend default still lands and no empty work.tags block is invented",
    run: async () => {
      const repo = await repoFixture();
      try {
        const result = await initConfig({ targetDir: repo });
        const config = await readWrittenConfig(repo);

        assert.equal(config.memory.backend, "graphify");
        assert.equal(result.tagsWritten, false);
        assert.equal(result.tagsKept, false, "nothing was kept either — nothing was offered");
        assert.equal(config.work?.tags, undefined, "no empty tags husk is written");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  // DoD box 7 — the written shape IS the shape the closed tag check reads. Both
  // directions, so the assertion cannot pass vacuously.
  {
    name: "work/init-config: the written work.tags block is the same shape `aof work validate` reads — a tag from it validates clean, one outside it is still reported",
    run: async () => {
      const repo = await repoFixture();
      try {
        await initConfig({
          targetDir: repo,
          tags: { layers: ["@cli"], refinements: ["@work"], domains: ["@work-stream"] },
        });
        const config = await readWrittenConfig(repo);

        const accepted = await seedStream(repo, "@cli @work-stream");
        const acceptedFindings = await validateWork(accepted, config, undefined);
        assert.deepEqual(
          acceptedFindings.filter((finding) => /unknown tag/.test(finding.problem)),
          [],
          "every tag the verb wrote is inside the closed vocabulary the validator enforces",
        );

        const rejectedRepo = await repoFixture();
        try {
          const rejected = await seedStream(rejectedRepo, "@cli @not-in-the-vocabulary");
          const rejectedFindings = await validateWork(rejected, config, undefined);
          assert.ok(
            rejectedFindings.some((finding) => /unknown tag "@not-in-the-vocabulary"/.test(finding.problem)),
            "a tag OUTSIDE the written vocabulary is still reported (the check is really running)",
          );
        } finally {
          await rm(rejectedRepo, { recursive: true, force: true });
        }
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
];
