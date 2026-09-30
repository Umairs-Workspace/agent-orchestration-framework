import { defaultApplication as _aofApplication } from "aof/default-application";
import { defaultWorkspace as _aofWorkspace } from "aof/workspace-services";
// FF-6201 — tune reaches the acceptor through the deferred registry and carries no ruling rule.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RULING_REFUSAL_ORDER = _aofApplication.work.commandTools.acceptor.RULING_REFUSAL_ORDER;
const findWork = _aofWorkspace.work.findWork;

const root = fileURLToPath(new URL("../../../", import.meta.url));
const facePath = fileURLToPath(new URL("../../../packages/work/src/commands/tune.mjs", import.meta.url));
const face = readFileSync(facePath, "utf8");
const family = [
  "packages/work/src/commands/tune.mjs",
  "packages/core/src/application/bindings/commands/tune.mjs",
  "packages/work/src/tune/corpus.mjs",
  "packages/work/src/tune/formation.mjs",
  "packages/work/src/tune/proposal.mjs",
  "packages/work/src/tune/provenance.mjs",
  "packages/work/src/tune/distance.mjs",
];
const familyText = family.map((file) => readFileSync(`${root}/${file}`, "utf8")).join("\n");
// milestone 127 / ADR-004 §3 — the story this control reads is resolved BY REF at run time, never
// by a literal path: its milestone (62, done) is archived by `aof work archive`, and a reader that
// spelled the folder would go red on the move. `findWork` answers wherever the folder sits.
const storyText = async () => {
  const [row] = await findWork(`${root}wiki/work`, "62/04");
  assert.ok(row?.dir, "story 62/04 resolves through findWork (live or archived)");
  return readFile(path.join(row.dir, "STORY.md"), "utf8");
};

export const archTests = [
  {
    name: "architecture: FF-6201 the acceptor id has one home and the registry edge is deferred",
    run: () => {
      assert.equal((face.match(/work:acceptor/gu) ?? []).length, 1);
      assert.match(face, /return await getRegistry\(\)/u);
      const composition = readFileSync(path.join(root, "packages/core/src/application/bindings/commands/tune.mjs"), "utf8");
      assert.match(composition, /const getRegistry = \(\) => provideCommandCore\(\)/u);
      assert.match(composition, /createTuneCommand\(\{[^}]*getRegistry \}\)/u);
      assert.doesNotMatch(face, /^import .*command-core\.mjs/mu);
      assert.match(face, /resolveCommand/u);
      assert.match(face, /invokeCommand/u);
      assert.doesNotMatch(familyText, /^import .*command-core\.mjs/mu);
    },
  },
  {
    name: "architecture: FF-6201 no tune-family module carries the acceptor's ruling vocabulary or arithmetic",
    run: () => {
      for (const code of RULING_REFUSAL_ORDER) {
        assert.equal(familyText.includes(JSON.stringify(code)), false, `${code} is rendered from the answer, not restated`);
      }
      assert.doesNotMatch(familyText, /\be-?value\b|wealth multiplier|crossing lattice|ledger sum/iu);
      assert.doesNotMatch(familyText, /["']work\.(?:loop|autonomous)\./u);
    },
  },
  {
    name: "architecture: FF-6201 every family member and command-core import cleanly in a fresh process",
    run: () => {
      for (const file of [...family, "packages/core/src/application/bindings/command-core.mjs"]) {
        const url = pathToFileURL(`${root}/${file}`).href;
        const child = spawnSync(process.execPath, ["--input-type=module", "--eval", `await import(${JSON.stringify(url)})`], {
          cwd: root,
          encoding: "utf8",
        });
        assert.equal(child.status, 0, `${file}: ${child.stderr}`);
      }
    },
  },
  {
    name: "architecture: FF-6201 story 62/04 writes no acceptor-owned module",
    run: async () => {
      const story = await storyText();
      const files = story.match(/^files:\s*\[([^\]]*)\]/mu)?.[1] ?? "";
      assert.doesNotMatch(files, /src\/commands\/acceptor\.mjs|src\/work-acceptor\//u);
    },
  },
];
