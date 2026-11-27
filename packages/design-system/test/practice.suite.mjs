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
//
// And, from milestone 198 / story 03, at the package seam:
//   tasks/00_the-design-template-records-design-system-changes.feature — "the variant is core's
//     template with the sections inserted" and "the variant is registered for the milestone template
//     alone"
//   tasks/02_verify-re-syncs-an-owned-system-at-accept.feature — "the shipped bundle carries the
//     fragment, scoped to Claude"
// Core's template and verify sources, and the other practice packages' bundles, are read as files.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { contribution } from "@aof/design-system/contribution";

const PACKAGE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = path.resolve(PACKAGE, "..", "..");
const CORE_TEMPLATE = "packages/acd/assets/templates/milestone/DESIGN.md";
const VARIANT = "templates/milestone/DESIGN.md";
const SECTIONS = Object.freeze(["## Design-system changes", "## Design-system gaps"]);

// 198/03 — the variant with its two sections taken out, against core's template: null when they are
// the same text, else the first line that differs, numbered in core's template. A section runs from
// its heading to the next heading.
export function variantDrift(core, variant) {
  const kept = [];
  let skipping = false;
  for (const line of variant.split("\n")) {
    if (line.startsWith("## ")) skipping = SECTIONS.includes(line);
    if (!skipping) kept.push(line);
  }
  const ours = core.split("\n");
  for (let index = 0; index < Math.max(ours.length, kept.length); index += 1) {
    if (ours[index] !== kept[index]) return { template: CORE_TEMPLATE, line: index + 1, core: ours[index] ?? "(end of file)", variant: kept[index] ?? "(end of file)" };
  }
  return null;
}
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
    // Amended by 198/02: the practice's first fragments are its three Claude-only ones (02 task 00).
    name: "198/01 00 (amended 198/02) the bundle declares the design-system practice on its one key, and every fragment it ships is Claude's alone",
    run: async () => {
      const { practices, members } = await bundle();
      assert.deepEqual(practices.map((practice) => [practice.id, practice.keys]), [["design-system", ["work.ui.designSystem.enabled"]]]);
      assert.equal(practices[0].runtimes, undefined, "the practice entry declares no runtimes: its fragments do (Q14)");
      const fragments = members.filter((member) => member.kind === "fragment");
      assert.deepEqual(fragments.map((fragment) => [fragment.target, fragment.slot]), [
        ["command:refine", "decide.designer"],
        ["command:verify", "conformance.baseline"],
        ["command:verify", "checks.design-system"], // 198/03
        ["agent:aof-designer", "ownership.design-system"],
      ]);
      for (const fragment of fragments) {
        assert.deepEqual(fragment.runtimes, ["claude"], `${fragment.id} is Claude's alone`);
        assert.equal(fragment.practice, "design-system", fragment.id);
        assert.equal(fragment.variants, undefined, `${fragment.id} has one common body and no Codex variant`);
      }
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
    // Amended by 198/02: the two mocks verbs join the three of 01.
    name: "198/01 00 (amended 198/02) the contribution is the package's, names its assets, and carries the five verbs",
    run: () => {
      assert.equal(contribution.id, "design-system");
      assert.equal(contribution.name, "@aof/design-system");
      assert.deepEqual(contribution.assets, { package: "@aof/design-system" });
      const commands = contribution.commands({ commandError: (message) => new Error(message) });
      assert.deepEqual(commands.map((verb) => verb.id), ["design-system:tokens", "design-system:check", "design-system:use", "design-system:mocks-import", "design-system:mocks-capture"]);
      assert.deepEqual(commands.map((verb) => verb.cli.route), [["design-system", "tokens"], ["design-system", "check"], ["design-system", "use"], ["design-system", "mocks", "import"], ["design-system", "mocks", "capture"]]);
    },
  },
  {
    name: "198/03 00 · the variant is core's milestone DESIGN.md template with the two sections inserted, just before the behavioural outcomes",
    run: async () => {
      const [core, variant] = await Promise.all([readFile(path.join(REPO, CORE_TEMPLATE), "utf8"), readFile(path.join(ASSETS, VARIANT), "utf8")]);
      assert.equal(variantDrift(core, variant), null);
      const at = (heading) => variant.indexOf(`\n${heading}\n`);
      assert.ok(at(SECTIONS[0]) > 0 && at(SECTIONS[0]) < at(SECTIONS[1]) && at(SECTIONS[1]) < at("## Behavioural outcomes (cross-reference)"), "changes, then gaps, just before the behavioural outcomes");
      assert.equal(variant.slice(at(SECTIONS[1]), at("## Behavioural outcomes (cross-reference)")).split("\n## ").length, 2, "nothing stands between the gaps and the behavioural outcomes");
    },
  },
  {
    name: "198/03 00 · a changed line of core's template, the variant unchanged, turns the suite red, naming the template and the line",
    run: async () => {
      const [core, variant] = await Promise.all([readFile(path.join(REPO, CORE_TEMPLATE), "utf8"), readFile(path.join(ASSETS, VARIANT), "utf8")]);
      const lines = core.split("\n");
      const target = lines.findIndex((line) => line.startsWith("## Intent"));
      lines[target] = "## Intent and audience";
      const drift = variantDrift(lines.join("\n"), variant);
      assert.deepEqual(drift, { template: CORE_TEMPLATE, line: target + 1, core: "## Intent and audience", variant: "## Intent" });
    },
  },
  {
    name: "198/03 00 · the variant is registered for the milestone template alone, and no other shipped practice varies DESIGN.md",
    run: async () => {
      const { members } = await bundle();
      assert.deepEqual(members.filter((member) => member.kind === "template-variant"), [
        { id: "design-system-design-template", kind: "template-variant", practice: "design-system", template: "milestone", name: "DESIGN.md", file: VARIANT },
      ]);
      const others = [];
      for (const owner of ["packages/acd/assets/bundle.json", "packages/specification-by-example/assets/bundle.json"]) {
        const declared = JSON.parse(await readFile(path.join(REPO, owner), "utf8"));
        for (const member of declared.members ?? []) if (member.kind === "template-variant" && member.name === "DESIGN.md") others.push(`${owner}: ${member.id}`);
      }
      assert.deepEqual(others, [], "turning another practice on beside this one is never refused as two variants of one file");
    },
  },
  {
    name: "198/03 02 · the shipped bundle carries the re-sync fragment, scoped to Claude, and its slot is in verify and in Codex's verify procedure once each",
    run: async () => {
      const { members } = await bundle();
      const fragment = members.find((member) => member.kind === "fragment" && member.target === "command:verify" && member.slot === "checks.design-system");
      assert.ok(fragment, "the fragment is declared");
      assert.deepEqual(fragment.runtimes, ["claude"]);
      assert.equal(fragment.variants, undefined, "no Codex variant");
      const marker = "<!-- slot:checks.design-system -->";
      const verify = await readFile(path.join(REPO, "packages/acd/assets/commands/verify.md"), "utf8");
      assert.equal(verify.split(marker).length - 1, 1, "verify.md holds the marker once");
      const workflow = await readFile(path.join(REPO, "packages/acd/assets/variants/codex/workflow.md"), "utf8");
      const procedure = /<!-- variant:procedure-verify -->([\s\S]*?)(?:<!-- variant:|$)/u.exec(workflow)?.[1] ?? "";
      assert.equal(procedure.split(marker).length - 1, 1, "Codex's verify procedure holds the marker once");
      assert.equal(workflow.split(marker).length - 1, 1, "and no other Codex section holds it");
    },
  },
];
