// Traceability wiring for milestone 37 / story 01
// tasks/02_bundle-membership.feature — "the spike & chore commands and templates
// are members of the ACD asset bundle".
//
// Asserted the way the milestone-01 bundle tests do it (packages/core/test/bundle.suite.mjs,
// test/arch/bundle/acd-bundle-membership.test.mjs, test/arch/bundle/acd-bundle-manifest-hashes.test.mjs):
// load the REAL descriptor, resolve REAL on-disk files, and hash the REAL
// re-rendered content against the shipped manifest — no engine code authored here.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { loadBundle, readDescriptor, renderBundleOutputs, bundleRoot } from "../src/work/bundle.mjs";
import { readShippedManifest } from "../src/work/bundle-manifest.mjs";
import { hashContent } from "../src/lock.mjs";

function descriptorMembers() {
  return readDescriptor().members;
}

function normalize(p) {
  return String(p).replaceAll("\\", "/");
}

export const bundleSpikeChoreMembershipTests = [
  // Scenario: the add-spike and add-chore command docs are declared bundle members
  {
    name: 'bundle/spike-chore-membership: the descriptor declares "add-spike" and "add-chore" as kind "command", and still declares "add-task"/"add-story"',
    run: async () => {
      const byId = new Map(descriptorMembers().map((m) => [m.id, m]));
      const addSpike = byId.get("add-spike");
      const addChore = byId.get("add-chore");
      assert.ok(addSpike, "descriptor declares member add-spike");
      assert.equal(addSpike.kind, "command", "add-spike is kind command");
      assert.ok(addChore, "descriptor declares member add-chore");
      assert.equal(addChore.kind, "command", "add-chore is kind command");

      const addTask = byId.get("add-task");
      const addStory = byId.get("add-story");
      assert.ok(addTask && addTask.kind === "command", "still declares add-task as kind command");
      assert.ok(addStory && addStory.kind === "command", "still declares add-story as kind command");
    },
  },

  // Scenario: the SPIKE.md and CHORE.md templates are declared bundle members
  {
    name: 'bundle/spike-chore-membership: the descriptor declares "spike" and "chore" as kind "template", and still declares "story"/"uat"',
    run: async () => {
      const byId = new Map(descriptorMembers().map((m) => [m.id, m]));
      const spike = byId.get("spike");
      const chore = byId.get("chore");
      assert.ok(spike, "descriptor declares member spike");
      assert.equal(spike.kind, "template", "spike is kind template");
      assert.ok(chore, "descriptor declares member chore");
      assert.equal(chore.kind, "template", "chore is kind template");

      const story = byId.get("story");
      const uat = byId.get("uat");
      assert.ok(story && story.kind === "template", "still declares story as kind template");
      assert.ok(uat && uat.kind === "template", "still declares uat as kind template");
    },
  },

  // Scenario: each new member resolves to an existing bundle file on disk
  {
    name: "bundle/spike-chore-membership: commands/add-spike.md, commands/add-chore.md, templates/spike/SPIKE.md, templates/chore/CHORE.md all exist under the bundle root",
    run: async () => {
      const root = bundleRoot();
      assert.ok(existsSync(path.join(root, "commands", "add-spike.md")), "commands/add-spike.md exists under the bundle root");
      assert.ok(existsSync(path.join(root, "commands", "add-chore.md")), "commands/add-chore.md exists under the bundle root");
      assert.ok(existsSync(path.join(root, "templates", "spike", "SPIKE.md")), "templates/spike/SPIKE.md exists under the bundle root");
      assert.ok(existsSync(path.join(root, "templates", "chore", "CHORE.md")), "templates/chore/CHORE.md exists under the bundle root");
    },
  },

  // milestone 168 / story 00 — the prototype's two templates are a bundle member, so `aof work
  // update` renders them where the scaffold reads them, and neither opens with a comment before
  // its frontmatter (a displaced fence parses as no frontmatter at all).
  {
    name: 'bundle/spike-chore-membership: the descriptor declares "prototype" as kind "template", and its PROTOTYPE.md and STATE.md exist with their frontmatter first',
    run: async () => {
      const prototype = descriptorMembers().find((m) => m.id === "prototype" && m.kind === "template");
      assert.ok(prototype, "descriptor declares member prototype");
      assert.equal(prototype.kind, "template", "prototype is kind template");
      assert.equal(prototype.dir, "templates/prototype");
      for (const file of ["PROTOTYPE.md", "STATE.md"]) {
        const full = path.join(bundleRoot(), "templates", "prototype", file);
        assert.ok(existsSync(full), `templates/prototype/${file} exists under the bundle root`);
        assert.ok(readFileSync(full, "utf8").startsWith("---"), `templates/prototype/${file} opens with its frontmatter fence`);
      }
    },
  },

  // milestone 168 / story 01 task 02 — the bundle declares the command beside add-chore: a command
  // member for exactly add-chore's runtimes and codex variant shape, and a template member.
  {
    name: 'bundle/spike-chore-membership: 168/01 "prototype" is a command member for exactly the runtimes "add-chore" is, and a template member',
    run: async () => {
      const members = descriptorMembers().filter((m) => m.id === "prototype");
      const command = members.find((m) => m.kind === "command");
      const addChore = descriptorMembers().find((m) => m.id === "add-chore" && m.kind === "command");
      assert.ok(command, "prototype is a command member");
      assert.equal(command.file, "commands/prototype.md");
      assert.deepEqual([...command.runtimes].sort(), [...addChore.runtimes].sort(), "the runtimes add-chore ships to");
      assert.deepEqual(Object.keys(command.variants).sort(), Object.keys(addChore.variants).sort(), "the same variant runtimes");
      assert.equal(command.variants.codex.section, "prototype", "the codex workflow.md section");
      assert.ok(members.some((m) => m.kind === "template"), "prototype is also a template member");
    },
  },
  // E15 — `aof work update` writes what `renderBundleOutputs` renders, so each runtime's surface is
  // read off the rendered set for a project initialised with all three runtimes.
  ...[
    ["claude", ".claude/commands/aof/prototype.md"],
    ["opencode", ".opencode/commands/aof/prototype.md"],
    ["codex", ".agents/skills/aof-prototype/SKILL.md"],
  ].map(([runtime, surface]) => ({
    name: `bundle/spike-chore-membership: 168/01 E15 · the ${runtime} runtime carries the prototype command at ${surface}`,
    run: async () => {
      const rendered = renderBundleOutputs(loadBundle(), { runtimes: ["claude", "codex", "opencode"] });
      const output = rendered.find((o) => normalize(o.path) === surface);
      assert.ok(output, `${surface} is rendered`);
      assert.match(output.content, /aof work prototype/, `${surface} carries the prototype command's body`);
      if (runtime === "codex") assert.doesNotMatch(output.content, /\/aof:|\.claude\/commands\//, "the codex section names no Claude surface");
    },
  })),
  {
    name: "bundle/spike-chore-membership: 168/01 E16 · explain answers a prototype with its intent, on both surfaces",
    run: async () => {
      for (const file of [path.join("commands", "explain.md"), path.join("variants", "codex", "workflow.md")]) {
        assert.match(readFileSync(path.join(bundleRoot(), file), "utf8"), /^ {3}\| prototype \| its `## Intent` \|$/m, `${file} maps prototype to its ## Intent`);
      }
    },
  },

  // Scenario Outline: the manifest hash for "<id>" is a true content address of its re-rendered content
  ...["add-spike", "add-chore", "spike", "chore", "prototype"].map((id) => ({
    name: `bundle/spike-chore-membership: the shipped manifest entry for "${id}" has a non-empty path, a "sha256:" hash equal to the sha256 of its re-rendered content`,
    run: async () => {
      const manifest = readShippedManifest();
      const rendered = renderBundleOutputs(loadBundle(), { runtimes: manifest.runtimes });
      const renderedById = new Map(rendered.map((o) => [o.resource.id, o]));

      const entries = manifest.entries.filter((e) => e.resource.id === id);
      assert.ok(entries.length > 0, `manifest carries at least one entry for member "${id}"`);

      for (const entry of entries) {
        assert.ok(typeof entry.path === "string" && entry.path.length > 0, `${id} entry has a non-empty path`);
        assert.ok(entry.hash.startsWith("sha256:"), `${id} entry hash begins with "sha256:"; got "${entry.hash}"`);

        // Find the matching rendered output by path (a template member may emit
        // multiple files; a command emits exactly one) — mirrors
        // acd-bundle-manifest-hashes.test.mjs's path-keyed lookup.
        const renderedByPath = new Map(rendered.map((o) => [normalize(o.path), o]));
        const output = renderedByPath.get(normalize(entry.path));
        assert.ok(output, `a rendered output exists for manifest path ${entry.path}`);
        assert.equal(output.resource.id, id, `rendered output at ${entry.path} belongs to member "${id}"`);
        assert.equal(entry.hash, hashContent(output.content), `${id} manifest hash at ${entry.path} equals the sha256 of the re-rendered content`);
      }

      // Non-vacuity: at least one rendered output actually exists for this id.
      assert.ok(renderedById.has(id) || rendered.some((o) => o.resource.id === id), `at least one rendered output exists for member "${id}"`);
    },
  })),
];
