// FF-6201 — tune reaches the acceptor through the deferred registry and carries no ruling rule.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { RULING_REFUSAL_ORDER } from "../../../src/commands/acceptor.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const facePath = fileURLToPath(new URL("../../../src/commands/tune.mjs", import.meta.url));
const face = readFileSync(facePath, "utf8");
const family = [
  "src/commands/tune.mjs",
  "src/work-tune/corpus.mjs",
  "src/work-tune/formation.mjs",
  "src/work-tune/proposal.mjs",
  "src/work-tune/provenance.mjs",
  "src/work-tune/distance.mjs",
];
const familyText = family.map((file) => readFileSync(`${root}/${file}`, "utf8")).join("\n");
const story = readFileSync(`${root}/wiki/work/62_milestone_self-improvement-loop/stories/04_story_the-tuners-face/STORY.md`, "utf8");

export const archTests = [
  {
    name: "architecture: FF-6201 the acceptor id has one home and the registry edge is deferred",
    run: () => {
      assert.equal((face.match(/work:acceptor/gu) ?? []).length, 1);
      assert.match(face, /await import\("\.\.\/command-core\.mjs"\)/u);
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
      for (const file of [...family, "src/command-core.mjs"]) {
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
    run: () => {
      const files = story.match(/^files:\s*\[([^\]]*)\]/mu)?.[1] ?? "";
      assert.doesNotMatch(files, /src\/commands\/acceptor\.mjs|src\/work-acceptor\//u);
    },
  },
];
