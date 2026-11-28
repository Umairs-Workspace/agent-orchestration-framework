// 210/00 tasks 00–01: shipped instructions and native renders are executable policy.
// Supersedes 190/04's replay/coupling prose checks; its delivered features stay intact.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { generateBundleManifest, manifestPath, serializeBundleManifest } from "aof/bundle-manifest";

const read = file => readFile(new URL(`../../../${file}`, import.meta.url), "utf8");
const flat = text => text.replace(/\s+/gu, " ");
const source = name => `packages/acd/assets/commands/${name}.md`;
const renders = name => [`.claude/commands/aof/${name}.md`, `.opencode/commands/aof/${name}.md`,
  `.agents/skills/aof-${name}/${["map-tests", "add-uat"].includes(name) ? "SKILL" : "procedure"}.md`];
const chosen = "aof test <suite>… --reason";
function section(doc, marker, end) {
  const start = doc.indexOf(marker);
  assert.ok(start >= 0, marker);
  const stop = doc.indexOf(end, start + marker.length);
  assert.ok(stop > start, end);
  return flat(doc.slice(start, stop));
}
async function walk(relative) {
  const files = [];
  for (const entry of await readdir(new URL(`../../../${relative}/`, import.meta.url), { withFileTypes: true })) {
    const file = `${relative}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await walk(file));
    else files.push(file);
  }
  return files;
}

export const mapTestsCommandTests = [
  {
    name: "210/00 · map-tests ships and the derived manifest is current",
    async run() {
      const bundle = JSON.parse(await read("packages/acd/assets/bundle.json"));
      assert.equal(bundle.members.find(item => item.id === "map-tests")?.kind, "command");
      assert.equal(await readFile(manifestPath(), "utf8"), serializeBundleManifest(generateBundleManifest()));
      for (const file of renders("map-tests")) assert.ok((await read(file)).includes("work.test.instructions"), file);
    },
  },
  ...["continue", "review", "verify", "manual", "repair", "teach"].map(name => ({
    name: `210/00 E1 E2 · ${name} reads instructions before selecting tests in its source and renders`,
    async run() {
      const files = name === "teach" ? ["packages/learning/assets/commands/teach.md", ".claude/commands/aof/teach.md"] : [source(name), ...renders(name)];
      for (const file of files) {
        const text = flat(await read(file));
        assert.match(text, /Read the file named in `work\.test\.instructions` before running anything/iu, file);
        assert.ok(text.includes(chosen), file);
        assert.ok(text.includes("aof test --failed"), file);
      }
    },
  })),
  {
    name: "210/00 E3 · sources, renders and work-init goldens contain no old selection wording",
    async run() {
      const files = ["packages/acd/assets/variants/codex/workflow.md", "packages/acd/assets/references/workflow-contract.md",
        "packages/learning/assets/commands/teach.md", ".claude/commands/aof/teach.md", ".codex/aof/workflows/workflow-contract.md",
        ...["continue", "review", "verify", "manual", "repair", "map-tests", "add-uat"].flatMap(name => [source(name), ...renders(name)]),
        ...await walk("test/golden/baselines/work-init")];
      for (const file of files) assert.doesNotMatch(await read(file), /--scope (?:impacted|file|all)|never name(?:s)? suite files|declared impacted test gate|`--scope file` wearing prose/iu, file);
    },
  },
  {
    name: "210/00 E7 E8 E9 · bounded fixes hand over and pre-existing reds are recorded",
    async run() {
      for (const file of [source("continue"), ...renders("continue")]) {
        const region = section(await read(file), "<build_terminator>", "</build_terminator>");
        for (const phrase of ["aof test --failed", "Never run `aof test --all` in story work", "whole tree is the regression gate's", "test-fix-stopped", "blocker in the item's `STATE.md`", "loop's question to the operator, and stop", "pre-existing", "by case name", "## Feedback (for retro)", "not the story's to fix"]) assert.ok(region.includes(phrase), `${file}: ${phrase}`);
      }
      for (const file of [source("repair"), ...renders("repair")]) {
        const text = flat(await read(file));
        for (const phrase of ["test-fix-stopped", "blocker in the item's `STATE.md`", "loop's question to the operator, and stop"]) assert.ok(text.includes(phrase), `${file}: ${phrase}`);
      }
    },
  },
  {
    name: "210/00 · structural review compares recorded suite choices with suggestions and honours exclusions",
    async run() {
      for (const file of [source("continue"), ...renders("continue")]) {
        const region = section(await read(file), "<review_lanes>", "</review_lanes>");
        for (const phrase of ["structural lane", "recorded runs and reasons", "aof test --suggest", "story's changed files", "imports or names a changed file", "appears in no recorded run", "named by no recorded reason", "A stated exclusion is accepted"]) assert.ok(region.includes(phrase), `${file}: ${phrase}`);
      }
    },
  },
  {
    name: "210/00 E6 · map-tests drafts instructions, sets the key and asks the operator to edit",
    async run() {
      for (const file of [source("map-tests"), ...renders("map-tests")]) {
        const doc = flat(await read(file));
        for (const phrase of ["test roots", "runner scripts", "native `node:test` packages", "known hazards", "write the instructions and set `work.test.instructions`", "Ask the operator to edit the draft", "neither authors couplings nor replays commits", "--dry-run", "byte-identical"]) assert.ok(doc.includes(phrase), `${file}: ${phrase}`);
      }
    },
  },
  {
    name: "210/00 · UAT takes one whole-tree sweep for the session",
    async run() {
      for (const file of [source("add-uat"), ...renders("add-uat"),
        ...["SESSION", "STATE"].flatMap(name => [`packages/acd/assets/templates/uat/${name}.md`, `.aof/templates/work/uat/${name}.md`])]) {
        assert.match(flat(await read(file)), /one `aof test --all` for the session/u, file);
      }
    },
  },
];
