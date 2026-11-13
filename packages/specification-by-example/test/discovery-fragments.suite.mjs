// Traceability wiring for milestone 192 / story 02 — the practice's prose lives with the practice.
//
// Covers, of tasks/02_a-practices-prose-lives-with-the-practice.feature, the scenarios this package
// answers by its own files: every discovery fragment has a body for Claude and a body for Codex, and
// the README says what the package ships and what turns it on. The descriptor as core reads it, the
// registry and the payload are FF-19208's file (test/arch/practices), which may import core.
//
// Read by path from the package's own tree: a package suite imports nothing of core.
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const at = (rel) => fileURLToPath(new URL(`../${rel}`, import.meta.url));
const read = (rel) => readFileSync(at(rel), "utf8").replace(/\r\n/gu, "\n");
const descriptor = () => JSON.parse(read("assets/bundle.json"));
const sections = (text) => [...text.matchAll(/^<!-- fragment:([^\s>]+) -->$/gmu)].map((match) => match[1]);
const bodyOf = (text, slot) => {
  const pieces = text.split(`<!-- fragment:${slot} -->\n`);
  assert.equal(pieces.length, 2, `one section "${slot}"`);
  return pieces[1].split(/^<!-- fragment:/mu)[0].trim();
};

export const discoveryFragmentTests = [
  {
    name: "192/02 02 the package declares the practice discovery, keyed on work.examples.enabled, and nothing else turns it on",
    run: () => {
      const { practices, members } = descriptor();
      assert.deepEqual(practices.map(({ id, keys }) => ({ id, keys })), [{ id: "discovery", keys: ["work.examples.enabled"] }]);
      for (const member of members) {
        assert.equal(member.kind, "fragment", `${member.id} is a fragment`);
        assert.equal(member.practice, "discovery", `${member.id} names its practice`);
        assert.equal("keys" in member, false, `${member.id} names no key of its own`);
      }
    },
  },
  {
    name: "192/02 02 every discovery fragment has a body for Claude and a body for Codex",
    run: () => {
      for (const member of descriptor().members) {
        const codex = member.variants?.codex?.file;
        assert.ok(codex && existsSync(at(`assets/${codex}`)), `${member.id} has a Codex body file`);
        assert.ok(bodyOf(read(`assets/${codex}`), member.slot).length > 0, `${member.id}: its Codex body is not empty`);
        if (member.slot === "entry.rules") {
          assert.equal(member.file, undefined, "the one that fills entry.rules has a Codex body alone");
          continue;
        }
        assert.ok(member.file && existsSync(at(`assets/${member.file}`)), `${member.id} has a common body file`);
        assert.ok(bodyOf(read(`assets/${member.file}`), member.slot).length > 0, `${member.id}: its common body is not empty`);
        assert.match(member.file, /^fragments\/discovery\/[a-z-]+\.md$/u);
        assert.equal(codex, member.file.replace(/\.md$/u, ".codex.md"), `${member.id}: <target>.md beside <target>.codex.md`);
      }
      // Every section a body file holds is a declared fragment's: no prose ships that nothing renders.
      const declared = new Set(descriptor().members.flatMap((member) => [member.file, member.variants?.codex?.file].filter(Boolean).map((file) => `${file}#${member.slot}`)));
      for (const file of new Set([...declared].map((key) => key.split("#")[0]))) {
        for (const slot of sections(read(`assets/${file}`))) assert.ok(declared.has(`${file}#${slot}`), `${file} section ${slot} is declared`);
      }
    },
  },
  {
    name: "192/02 02 a Codex body keeps Codex's own wording",
    run: () => {
      const codex = read("assets/fragments/discovery/refine.codex.md");
      assert.doesNotMatch(codex, /AskUserQuestion|\/aof:|`aof:/u, "no Claude question tool and no Claude command name");
      assert.match(codex, /the available native question tool/u);
      assert.match(read("assets/fragments/discovery/refine.md"), /AskUserQuestion/u, "the common body is Claude's");
    },
  },
  {
    name: "192/02 02 the contribution is a data leaf that imports nothing",
    run: () => {
      const leaf = read("src/contribution.mjs");
      assert.doesNotMatch(leaf.replace(/^\s*\/\/.*$/gmu, ""), /\bimport\b/u);
      assert.match(leaf, /assets: Object\.freeze\(\{ package: "@aof\/specification-by-example" \}\)/u);
      const pkg = JSON.parse(read("package.json"));
      assert.equal(pkg.exports["./contribution"], "./src/contribution.mjs");
      assert.ok(pkg.files.includes("assets"), "the package ships its assets");
    },
  },
  {
    name: "192/02 02 the package's README says what it ships and what turns it on",
    run: () => {
      const readme = read("README.md").replace(/\s+/gu, " ");
      assert.match(readme, /practice `discovery`/u);
      assert.match(readme, /`work\.examples\.enabled`/u);
      assert.match(readme, /only to a project that has turned the key on and run `aof work update`/u);
      assert.match(readme, /wiki\/reference\/practice-prose\.md/u);
    },
  },
];
