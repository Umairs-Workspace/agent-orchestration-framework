// Traceability: milestone 126 / story 02, task 03 (ADR-005). THE ANSWER RIDES `mesh status`.
//
// 36/ADR-004 §2 gives the supervisor exactly ONE data command, so this is a flag on `mesh:status`
// rather than a second verb. The two claims that matter are opposite: WITHOUT the flag the document
// is byte-identical and nothing is enumerated; WITH it the document gains exactly one key.
//
// The structural half is `test/arch/mesh/acd-declarations-ride-the-one-data-command.test.mjs`.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { meshStatusCommand } from "../../../src/commands/mesh/identity.mjs";
import { loadWorkspace } from "../../../src/work.mjs";

const NOW = "2026-09-08T12:00:00.000Z";

const loop = (over = {}) => ({
  loopRunId: "lr-1", scope: "53", level: "L2", cap: 3,
  phase: "continue", cycle: 1, startedAt: "2026-09-08T10:00:00.000Z",
  id: "loop:autonomous-cascade", supervised: true, ...over,
});

/** A reclaimed run — the shape the lid closing leaves behind, and a listed one. */
const reclaimed = (over = {}) => ({
  runId: "run-1", itemRef: "53", retryOf: null, state: "failed", attempt: 1,
  failureReason: "runtime_offline", resumeAfter: null,
  reclaimedAt: "2026-09-08T11:30:00.000Z",
  createdAt: "2026-09-08T11:00:00.000Z",
  heartbeatAt: "2026-09-08T11:20:00.000Z",
  updatedAt: "2026-09-08T11:30:00.000Z",
  brief: { loop: loop() },
  ...over,
});

/** A workspace on disk holding one milestone with one run record. */
async function makeWorkspace(root, name, { record = reclaimed(), nodeId = "node-1" } = {}) {
  const dir = path.join(root, name);
  const itemDir = path.join(dir, "wiki", "work", "53_milestone_fixture");
  await mkdir(path.join(itemDir, "runs"), { recursive: true });
  await mkdir(path.join(dir, ".aof"), { recursive: true });
  await writeFile(path.join(itemDir, "SPEC.md"), `---
type: milestone
number: 53
slug: fixture
title: Fixture
status: in-progress
depends: []
created: 2026-09-08
updated: 2026-09-08
schema: 1
aofVersion: 0.1.0
---
# Fixture
`);
  if (record != null) {
    await writeFile(path.join(itemDir, "runs", `${record.runId}.json`), JSON.stringify(record, null, 2));
  }
  await writeFile(path.join(dir, ".aof", "aof.config.json"), JSON.stringify({
    name, work: { dir: "wiki/work" }, mesh: { nodeId, workspaceId: `ws-${name}` },
  }, null, 2));
  return dir;
}

async function withTemp(fn) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-mesh-declarations-"));
  try {
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/** Invoke `mesh:status` over a real workspace, with the projection store isolated per call. */
async function status(dir, input, { env } = {}) {
  const workspace = await loadWorkspace(dir, undefined, env ? { env } : undefined);
  return meshStatusCommand.run({ now: NOW, ...input }, {
    workspace,
    globalWorkStoreOptions: env ? { env } : {},
  });
}

export const meshStatusDeclarationsTests = [
  {
    name: "126/02 task03 — without the flag the document is byte-identical and nothing is enumerated",
    async run() {
      await withTemp(async (root) => {
        const dir = await makeWorkspace(root, "repo-a");
        const flagless = await status(dir, {});
        assert.deepEqual(Object.keys(flagless), ["nodes", "boards", "isControlNode"]);
        assert.ok(!("declarations" in flagless), "no declarations key");

        // The flag gates the WALK, not just the key: a producer that enumerated and then declined
        // to emit would have paid the whole 167 ms the refine measured.
        const withFlag = await status(dir, { declarations: true });
        const { declarations, ...rest } = withFlag;
        assert.deepEqual(rest, flagless, "the document minus `declarations` is the flagless document");
        assert.deepEqual(Object.keys(withFlag), ["nodes", "boards", "isControlNode", "declarations"]);
      });
    },
  },
  {
    name: "126/02 task03 — with the flag the document gains exactly one key, and a row carries seven",
    async run() {
      await withTemp(async (root) => {
        const dir = await makeWorkspace(root, "repo-a");
        const result = await status(dir, { declarations: true });
        assert.deepEqual(Object.keys(result.declarations), ["ok", "rows", "skipped"]);
        assert.equal(result.declarations.ok, true);
        assert.equal(result.declarations.rows.length, 1, "one row for the reclaimed supervised declaration");

        const [row] = result.declarations.rows;
        assert.deepEqual(Object.keys(row), ["id", "label", "argv", "cwd", "scope", "level", "cap"]);
        assert.equal(row.id, "lr-1", "the id is the declaration's loopRunId");
        assert.match(row.label, /53/u, "the label names the scope");
        assert.deepEqual(row.argv, ["work", "loop", "53", "--level", "L2", "--resume"]);
        assert.equal(row.cwd, dir, "each row's cwd is its own workspace's projectRoot");
        assert.notEqual(row.cwd, process.cwd(), "…and never the process's working directory");
        assert.equal(row.scope, "53");
        assert.equal(row.level, "L2");
        assert.equal(row.cap, 3);

        // Two runs over the unchanged fixture return the identical value.
        const again = await status(dir, { declarations: true });
        assert.deepEqual(again.declarations, result.declarations);
      });
    },
  },
  {
    name: "126/02 task03 — an unsupervised or absent declaration yields no row, and the answer still says ok",
    async run() {
      await withTemp(async (root) => {
        const unsupervised = await makeWorkspace(root, "repo-b", {
          record: reclaimed({ brief: { loop: loop({ supervised: false }) } }),
        });
        const noDeclaration = await makeWorkspace(root, "repo-c", { record: null });

        for (const dir of [unsupervised, noDeclaration]) {
          const result = await status(dir, { declarations: true });
          assert.equal(result.declarations.ok, true, `${dir}: the resolver answered`);
          assert.deepEqual(result.declarations.rows, [], `${dir}: no row`);
          assert.deepEqual(result.declarations.skipped, [], `${dir}: nothing skipped`);
        }
      });
    },
  },
  {
    name: "126/02 task03 — the standalone fallback answers a resolver that ANSWERED, never one that did not",
    async run() {
      await withTemp(async (root) => {
        const dir = await makeWorkspace(root, "repo-a");
        // No membership rows at all: the resolver answers `ok` with an empty workspace list, and
        // the command's own workspace is the single member.
        const answered = await status(dir, { declarations: true });
        assert.equal(answered.declarations.ok, true);
        assert.equal(answered.declarations.rows.length, 1, "the command's own workspace is the standalone member");
      });
    },
  },
  {
    name: "126/02 task03 — the flag lands in three places and changes nothing else about the verb",
    run() {
      const schema = meshStatusCommand.input;
      assert.equal(schema.additionalProperties, false, "the input schema is still closed");
      assert.deepEqual(schema.properties.declarations, { type: "boolean" });
      assert.deepEqual(Object.keys(schema.properties), ["now", "declarations"]);
      assert.equal(meshStatusCommand.cli.spec.flags.declarations.type, "boolean");
      assert.match(meshStatusCommand.cli.spec.usage, /\[--declarations\]/u);
      assert.deepEqual(meshStatusCommand.cli.argv([], { declarations: true }), { declarations: true });
      assert.deepEqual(meshStatusCommand.cli.argv([], {}), {}, "absent, the flag shapes nothing");
    },
  },
  {
    name: "126/02 task03 — the records come from DISK, and the human render is unchanged",
    async run() {
      await withTemp(async (root) => {
        // A `done` record on disk yields no row — whatever any projection might hold, disk is the
        // authority for a local run (TECH_DEBT item 19).
        const dir = await makeWorkspace(root, "repo-d", {
          record: reclaimed({ state: "done", failureReason: null, reclaimedAt: null }),
        });
        const result = await status(dir, { declarations: true });
        assert.deepEqual(result.declarations.rows, []);

        // The human face prints what it printed before: `cli.render` never sees `declarations`.
        const rendered = meshStatusCommand.cli.render(result, {});
        assert.ok(!rendered.includes("declaration"), `the render says nothing of declarations: ${rendered}`);
      });
    },
  },
];
