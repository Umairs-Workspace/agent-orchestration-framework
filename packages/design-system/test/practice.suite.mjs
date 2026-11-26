// Traceability wiring for milestone 198 / story 01 — the package's own half of the practice and the
// extract command.
//
// Covers, at the package seam:
//   tasks/00_the-design-system-practice-is-registered.feature — the practice the bundle declares
//   tasks/01_the-extract-command-is-claude-only-and-always-installed.feature — E4 and "the command hands
//     every deterministic step to a verb", read from the command's source
// The render-level scenarios of both tasks (E1, E2, E3, the outlines, the registry, the manifests and
// the payload) need core, which a package's suite may not import: they are
// test/arch/practices/acd-design-system-practice.test.mjs.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { contribution } from "@aof/design-system/contribution";

const PACKAGE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = path.join(PACKAGE, "assets");
const bundle = async () => JSON.parse(await readFile(path.join(ASSETS, "bundle.json"), "utf8"));
const command = () => readFile(path.join(ASSETS, "commands", "design-system.md"), "utf8");

async function filesUnder(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await filesUnder(full));
    else out.push(full);
  }
  return out;
}

export const practiceTests = [
  {
    name: "198/01 00 the bundle declares the design-system practice on its one key, with no fragment",
    run: async () => {
      const { practices, members } = await bundle();
      assert.deepEqual(practices.map((practice) => [practice.id, practice.keys]), [["design-system", ["work.ui.designSystem.enabled"]]]);
      assert.deepEqual(members.filter((member) => member.kind === "fragment" || member.kind === "template-variant"), [], "no fragments yet: 02 and 03 add them");
      assert.equal(practices[0].runtimes, undefined, "a practice with no fragment names no runtimes (Q14)");
    },
  },
  {
    name: "198/01 01 the command member is Claude's alone, unmapped, in the aof namespace, and gated by no practice",
    run: async () => {
      const { members } = await bundle();
      const member = members.find((candidate) => candidate.id === "design-system");
      assert.deepEqual(member, { id: "design-system", kind: "command", file: "commands/design-system.md", runtimes: ["claude"], commandNamespace: "aof", mapped: false });
      assert.equal(member.practice, undefined, "installed whether the practice is on or off");
    },
  },
  {
    name: "198/01 01 E4 · the command reads from-code.md from the type at run time, and the package ships no copy",
    run: async () => {
      const text = await command();
      assert.match(text, /`from-code\.md` \*\*from the type, now, at run time\*\*/);
      const names = (await filesUnder(ASSETS)).map((file) => path.basename(file));
      for (const banned of ["from-code.md", "format.md"]) assert.ok(!names.includes(banned), `the package ships no ${banned}`);
    },
  },
  {
    name: "198/01 01 the command hands every deterministic step to a verb, and asks before publishing and before use",
    run: async () => {
      const text = await command();
      for (const verb of ["aof design-system tokens", "aof design-system check", "aof design-system use"]) {
        const line = text.split("\n").find((candidate) => candidate.startsWith(verb));
        assert.ok(line, `it calls ${verb}`);
        assert.match(line, /--json$/, `it reads ${verb}'s --json answer`);
      }
      assert.match(text, /Resolve the title before publishing/);
      assert.match(text, /title equals the agreed title exactly, \*\*stop before publishing\*\*/);
      assert.match(text, /The inventory review — the operator agrees before anything is published/);
      assert.match(text, /The operator approves the published system/);
      const review = text.indexOf("The inventory review");
      const publish = text.indexOf("Build and publish the system");
      const approve = text.indexOf("The operator approves the published system");
      const use = text.indexOf("aof design-system use --name");
      assert.ok(review < publish && publish < approve && approve < use, "ask, publish, ask, then use");
    },
  },
  {
    name: "198/01 00 the contribution is the package's, names its assets, and carries the three verbs",
    run: () => {
      assert.equal(contribution.id, "design-system");
      assert.equal(contribution.name, "@aof/design-system");
      assert.deepEqual(contribution.assets, { package: "@aof/design-system" });
      const commands = contribution.commands({ commandError: (message) => new Error(message) });
      assert.deepEqual(commands.map((verb) => verb.id), ["design-system:tokens", "design-system:check", "design-system:use"]);
      assert.deepEqual(commands.map((verb) => verb.cli.route), [["design-system", "tokens"], ["design-system", "check"], ["design-system", "use"]]);
    },
  },
];
