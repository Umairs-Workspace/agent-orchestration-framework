import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { loopCommand } from "../../src/commands/loop.mjs";
import { invoke } from "../../src/command-core.mjs";
import { LOOP_STOPS } from "../../src/work/loop.mjs";
import { createFakePtySpawn, createFakeWhich } from "../support/mesh-worker-terminal-fixture.mjs";

const milestoneDoc = (status = "in-progress") => `---
type: milestone
number: 3
slug: fixture
title: Fixture
status: ${status}
depends: []
created: 2026-08-15
updated: 2026-08-15
schema: 1
aofVersion: 0.1.0
---
# Fixture
`;

const storyDoc = (status = "in-progress") => `---
type: story
number: 1
slug: ready
title: Ready
parent: 3
status: ${status}
depends: []
created: 2026-08-15
updated: 2026-08-15
schema: 1
aofVersion: 0.1.0
---
# Ready
`;

export async function loopFixture({ milestoneStatus = "in-progress", storyStatus = "in-progress", tasks = true, uat = false, cap = 3, reviewRounds } = {}) {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "aof-loop-command-"));
  const workDir = path.join(projectRoot, "wiki", "work");
  const milestoneDir = path.join(workDir, "03_milestone_fixture");
  const storyDir = path.join(milestoneDir, "stories", "01_story_ready");
  await mkdir(storyDir, { recursive: true });
  await writeFile(path.join(milestoneDir, "SPEC.md"), milestoneDoc(milestoneStatus));
  await writeFile(path.join(storyDir, "STORY.md"), storyDoc(storyStatus));
  if (tasks) {
    await mkdir(path.join(storyDir, "tasks"), { recursive: true });
    await writeFile(path.join(storyDir, "tasks", "00_ready.feature"), `${uat ? "@uat" : "@executable"}
Feature: Ready
  Scenario: ready
    Given a fixture
    When it runs
    Then it passes
`);
  }
  const workspace = {
    projectRoot,
    workDir,
    configPath: path.join(projectRoot, ".aof", "aof.config.json"),
    config: {
      work: {
        dir: "wiki/work",
        autonomous: { maxAttempts: cap },
        ...(reviewRounds === undefined ? {} : { loop: { reviewRounds } }),
      },
    },
  };
  return {
    projectRoot,
    workDir,
    milestoneDir,
    storyDir,
    workspace,
    ctx: { workspace },
    cleanup: () => rm(projectRoot, { recursive: true, force: true }),
  };
}

export function replaceStatus(file, status) {
  const body = readFileSync(file, "utf8");
  writeFileSync(file, body.replace(/^status: .*$/mu, `status: ${status}`));
}

export function completingDriver(fx, { onCommand } = {}) {
  const typed = [];
  const fake = createFakePtySpawn({
    onWrite({ chunk, emitExit }) {
      const command = chunk.replace(/[\r\n]+$/u, "");
      typed.push(command);
      // milestone 70/00 (phase-brief) — the driver's first input is the directive followed
      // by the compiled brief (after "\n\n"). The directive is always the first line; feed
      // ONLY that to onCommand so the exact `/aof:<phase> <ref>` comparisons keep their
      // meaning, while `typed` retains the full input (directive + brief).
      onCommand?.(command.split("\n\n")[0]);
      emitExit(0);
    },
  });
  return {
    typed,
    spawnCalls: fake.spawnCalls,
    options: {
      ptySpawn: fake.spawn,
      which: createFakeWhich(["claude"]),
      watchTranscriptSessionId: async () => `session-${typed.length}`,
      commandDelayMs: 0,
    },
  };
}

export async function treeFiles(root) {
  const rows = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(target);
      else rows.push(path.relative(root, target));
    }
  }
  if (existsSync(root)) await walk(root);
  return rows.sort();
}

export const loopCommandProbeTests = [
  {
    name: "loop command probe — returns the exact frozen document and passes work:next through verbatim without writes",
    async run() {
      const fx = await loopFixture();
      try {
        const fake = completingDriver(fx);
        const ctx = { ...fx.ctx, agentSessionDriverOptions: fake.options };
        const before = await treeFiles(fx.projectRoot);
        const next = await invoke("work:next", { scope: "03" }, ctx);
        const result = await loopCommand.run({ scope: "03" }, ctx);
        assert.deepEqual(Object.keys(result), ["scope", "level", "cap", "loopRunId", "state", "next", "act", "stops", "resumable", "driven"]);
        assert.deepEqual(result.next, next);
        assert.deepEqual(result.stops, [...LOOP_STOPS]);
        assert.deepEqual(result.driven, []);
        assert.deepEqual(Object.keys(result.resumable), ["stranded", "lastDeclaration"]);
        assert.equal(result.level, "L2");
        assert.equal(result.cap, 3);
        assert.equal(fake.spawnCalls.length, 0);
        assert.deepEqual(await treeFiles(fx.projectRoot), before);
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "loop command probe — loop ids are invocation-local and dry-run selects the human probe",
    async run() {
      const fx = await loopFixture();
      try {
        const first = await loopCommand.run({ scope: "03", level: "L1", cap: 5 }, fx.ctx);
        const second = await loopCommand.run({ scope: "03", level: "L1", cap: 5 }, fx.ctx);
        assert.notEqual(first.loopRunId, second.loopRunId);
        assert.equal(first.level, "L1");
        assert.equal(first.cap, 5);
        assert.equal(loopCommand.cli.launch({ dryRun: true }), null);
        assert.equal(typeof loopCommand.cli.launch({}), "function");
        assert.match(loopCommand.cli.render(first), /03.*L1.*cap 5/u);
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "loop command probe — a finished scope is done and still carries all ten keys",
    async run() {
      const fx = await loopFixture({ milestoneStatus: "done", storyStatus: "done" });
      try {
        const result = await loopCommand.run({ scope: "03" }, fx.ctx);
        assert.equal(result.state, "done");
        assert.deepEqual(result.act, { act: "done" });
        assert.equal(Object.keys(result).length, 10);
      } finally {
        await fx.cleanup();
      }
    },
  },
];
