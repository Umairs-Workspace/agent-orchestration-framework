// FF-6207 — the tune face is byte-level read-only and carries no state between runs.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildTuneReport, tuneCommand } from "../../../src/commands/tune.mjs";

async function snapshot(root) {
  const files = new Map();
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile()) files.set(path.relative(root, absolute), await readFile(absolute));
    }
  }
  await walk(root);
  return files;
}

function sameSnapshot(left, right) {
  assert.deepEqual([...left.keys()].sort(), [...right.keys()].sort());
  for (const [file, bytes] of left) assert.deepEqual(right.get(file), bytes, file);
}

const model = Object.freeze({ nodes: Object.freeze([]) });

export const archTests = [
  {
    name: "architecture: FF-6207 two tune runs leave every workspace byte unchanged and carry no state back",
    async run() {
      const root = await mkdtemp(path.join(os.tmpdir(), "aof-tune-read-only-"));
      try {
        await mkdir(path.join(root, ".aof"), { recursive: true });
        await writeFile(path.join(root, "one.md"), "one\n", "utf8");
        await writeFile(path.join(root, "two.md"), "two\n", "utf8");
        const corpus = Object.freeze({
          scope: null,
          matched: true,
          items: Object.freeze(["01"]),
          reads: Object.freeze([{ sweep: "lessons", count: 2, floor: 1, what: "fixture", root }]),
          findings: Object.freeze([]),
          lanes: Object.freeze([{ lane: "lessons", contribution: Object.freeze([
            { source: "one.md:1", title: "prompt handoff", text: "prompt handoff", kind: "mistake", area: "process", stage: "build", owner: "developer" },
            { source: "two.md:1", title: "prompt handoff", text: "prompt handoff", kind: "mistake", area: "process", stage: "build", owner: "developer" },
          ]) }]),
        });
        const ctx = { workspace: { projectRoot: root, workDir: path.join(root, "wiki", "work"), config: {} }, tune: { model, corpus } };
        const before = await snapshot(root);
        const first = await buildTuneReport({}, ctx);
        const middle = await snapshot(root);
        const second = await buildTuneReport({}, ctx);
        const after = await snapshot(root);
        sameSnapshot(before, middle);
        sameSnapshot(before, after);
        assert.deepEqual(second, first);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "architecture: FF-6207 the face advertises no strict dry-run apply commit or board route",
    run: () => {
      assert.deepEqual(tuneCommand.cli.spec.flags, {});
      assert.deepEqual(tuneCommand.cli.route, ["work", "tune"]);
      assert.doesNotMatch(tuneCommand.cli.spec.usage, /strict|dry-run|apply|commit/iu);
    },
  },
];
