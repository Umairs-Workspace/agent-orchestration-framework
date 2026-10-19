import { assets } from "./support/assets-services.mjs";
// The Hyperagent PLANNING runtime (wiki/hyperagent-support.md;
// wiki/work/backlog/milestone_hyperagent-planning-runtime/SPEC.md).
//
// Hyperagent is an opt-in runtime that renders the planning subset of the ACD bundle — the six
// command procedures that carry a `hyperagent` variant, plus the Hyperagent-only `aof-prd` skill
// and the planner instructions asset — as importable SKILL.md files under `.hyperagent/`. These
// cases pin the three properties the change rests on:
//   1. opt-in: it is ACCEPTED when named and never ASSUMED when no runtime is named;
//   2. subset: only variant-carrying commands render, every other procedure reports
//      `outside-runtime-subset` (not a capability gap), and agents are not installable;
//   3. no drift for everyone else: the claude/codex render is untouched.
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { supportedRuntimes, defaultRuntimes, RUNTIMES, CAPABILITIES, CAPABILITY_STATUS } from "../src/model.mjs";
import { renderConfigOutputs } from "../src/adapters.mjs";
import { parseRuntimes } from "../src/spine/flags.mjs";
import { loadBundle, renderBundleOutputs } from "../src/work/bundle.mjs";
import { partitionByCapability, OUTSIDE_RUNTIME_SUBSET } from "../src/work/bundle-runtime.mjs";
import { readLock } from "../src/lock.mjs";
import { updateWork } from "../src/work/update.mjs";

const initWork = assets.work.init.initWork;

const PLANNING_COMMANDS = ["add-milestone", "add-story", "add-task", "refine", "shatter", "validate"];
const HYPERAGENT_SKILLS = [...PLANNING_COMMANDS.map((id) => `aof-${id}`), "aof-prd"].sort();

async function withTempRepo(fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-hyperagent-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function hyperagentPartition() {
  return partitionByCapability(loadBundle().resources, ["hyperagent"]);
}

export const hyperagentRuntimeTests = [
  {
    name: "hyperagent/opt-in: the runtime is supported (accepted when named) but excluded from the default runtime set",
    run: async () => {
      assert.ok(supportedRuntimes().includes("hyperagent"), "hyperagent is a supported runtime");
      assert.equal(RUNTIMES.hyperagent.optIn, true, "hyperagent is declared opt-in");
      assert.equal(RUNTIMES.hyperagent.localRoot, ".hyperagent");
      assert.ok(!defaultRuntimes().includes("hyperagent"), "hyperagent is never assumed");
      assert.deepEqual(defaultRuntimes(), supportedRuntimes().filter((runtime) => runtime !== "hyperagent"),
        "every other runtime keeps its default membership");
    }
  },
  {
    name: "hyperagent/opt-in: CLI runtime flags default to the non-opt-in set and accept --runtime hyperagent",
    run: async () => {
      assert.ok(!parseRuntimes({}).includes("hyperagent"), "no flag ⇒ no hyperagent");
      assert.deepEqual(parseRuntimes({ runtime: "hyperagent" }), ["hyperagent"]);
      assert.deepEqual(parseRuntimes({ runtime: "claude,hyperagent" }), ["claude", "hyperagent"]);
    }
  },
  {
    name: "hyperagent/opt-in: an asset render with no runtimes named writes nothing under .hyperagent/",
    run: async () => withTempRepo(async (dir) => {
      const config = { resources: [{ id: "planner-notes", kind: "skill", name: "planner-notes", description: "d", body: "b", runtimes: supportedRuntimes() }] };
      const outputs = renderConfigOutputs(config, { targetDir: dir });
      assert.ok(outputs.length > 0, "the default render produced outputs");
      assert.ok(outputs.every((output) => !String(output.path).replaceAll("\\", "/").startsWith(".hyperagent/")),
        "a default render never touches the opt-in runtime's folder");
    })
  },
  {
    name: "hyperagent/capabilities: skills are native; commands, agents and rules are not renderable outside the bundle mapping",
    run: async () => {
      assert.equal(CAPABILITIES.skill.hyperagent, CAPABILITY_STATUS.native);
      assert.equal(CAPABILITIES.command.hyperagent, CAPABILITY_STATUS.unsupportedFail);
      assert.equal(CAPABILITIES.agent.hyperagent, CAPABILITY_STATUS.unsupportedWarning);
      assert.equal(CAPABILITIES.rule.hyperagent, CAPABILITY_STATUS.unsupportedWarning);
    }
  },
  {
    name: "hyperagent/subset: exactly the six planning commands map to aof-* skills, plus the aof-prd skill",
    run: async () => {
      const { installable } = hyperagentPartition();
      assert.deepEqual(installable.map((resource) => resource.id).sort(), HYPERAGENT_SKILLS);
      for (const resource of installable) {
        assert.equal(resource.kind, "skill", `${resource.id} renders as a skill`);
        assert.deepEqual(resource.runtimes, ["hyperagent"], `${resource.id} targets hyperagent only`);
      }
    }
  },
  {
    name: "hyperagent/subset: every other command reports outside-runtime-subset and every agent is not installable",
    run: async () => {
      const bundle = loadBundle();
      const { notInstallable } = hyperagentPartition();
      const commands = bundle.resources.filter((resource) => resource.kind === "command").map((resource) => resource.id);
      const outside = notInstallable.filter((item) => item.status === OUTSIDE_RUNTIME_SUBSET).map((item) => item.id).sort();
      assert.deepEqual(outside, commands.filter((id) => !PLANNING_COMMANDS.includes(id)).sort());
      const agents = notInstallable.filter((item) => item.kind === "agent");
      assert.equal(agents.length, bundle.resources.filter((resource) => resource.kind === "agent").length);
      assert.ok(agents.every((item) => item.status === CAPABILITY_STATUS.unsupportedWarning));
    }
  },
  {
    name: "hyperagent/render: each skill is an importable SKILL.md carrying the Hyperagent execution contract",
    run: async () => {
      const outputs = renderBundleOutputs(loadBundle(), { runtimes: ["hyperagent"] })
        .filter((output) => output.resource?.kind === "skill");
      assert.deepEqual(outputs.map((output) => output.resource.id).sort(), HYPERAGENT_SKILLS);
      for (const output of outputs) {
        const id = output.resource.id;
        assert.equal(String(output.path).replaceAll("\\", "/"), `.hyperagent/skills/${id}/SKILL.md`);
        const frontmatter = output.content.slice(0, output.content.indexOf("\n---", 3));
        assert.match(frontmatter, new RegExp(`^name: ${id}$`, "m"), `${id} names itself`);
        assert.match(frontmatter, /^description: .*\S/m, `${id} has a description`);
        assert.match(frontmatter, /^aof-runtime: hyperagent$/m);
        assert.match(frontmatter, /^aof-generated: true$/m);
        assert.match(output.content, /draft\*{0,2}\s+pull\s+request/i, `${id} delivers through a draft pull request`);
        if (id !== "aof-prd") {
          assert.match(output.content, /## Hyperagent execution contract/, `${id} carries the execution contract`);
          assert.match(output.content, /Never write to the default branch/, `${id} forbids default-branch writes`);
          assert.match(output.content, /`aof work promote` → \*\*never\*\*/, `${id} never mints a number`);
          assert.match(output.content, /### Validate checklist/, `${id} carries the validate checklist`);
        }
      }
    }
  },
  {
    name: "hyperagent/no-drift: the claude and codex renders contain nothing for hyperagent",
    run: async () => {
      const outputs = renderBundleOutputs(loadBundle(), { runtimes: ["claude", "codex"] });
      assert.ok(outputs.every((output) => output.runtime !== "hyperagent"));
      assert.ok(outputs.every((output) => !String(output.path).replaceAll("\\", "/").startsWith(".hyperagent/")));
      assert.ok(outputs.every((output) => output.resource?.id !== "aof-prd"), "aof-prd is Hyperagent-only");
    }
  },
  {
    name: "hyperagent/init: `aof work init --runtime hyperagent` writes the skills and planner instructions, and records the runtime",
    run: async () => withTempRepo(async (dir) => {
      const result = await initWork({ targetDir: dir, runtimes: ["hyperagent"] });
      assert.equal(result.guarded, false);
      for (const id of HYPERAGENT_SKILLS) {
        assert.ok(existsSync(path.join(dir, ".hyperagent", "skills", id, "SKILL.md")), `${id} written`);
      }
      const instructions = await readFile(path.join(dir, ".hyperagent", "AGENT.md"), "utf8");
      assert.match(instructions, /AOF Planner/);
      assert.ok(!existsSync(path.join(dir, ".hyperagent", "skills", "aof-continue")), "build procedures are not written");
      assert.ok(!existsSync(path.join(dir, ".hyperagent", "agents")), "role agents are not written");
      const lock = await readLock(path.join(dir, ".aof", "aof.lock.json"));
      assert.deepEqual(lock.work.runtimes, ["hyperagent"]);
    })
  },
  {
    name: "hyperagent/update: a re-run of `aof work update` over a fresh hyperagent install changes nothing",
    run: async () => withTempRepo(async (dir) => {
      await initWork({ targetDir: dir, runtimes: ["hyperagent"] });
      const result = await updateWork({ targetDir: dir });
      const changed = result.actions.filter((item) => item.action !== "skip");
      assert.deepEqual(changed.map((item) => `${item.action} ${item.path}`), [], "update is idempotent");
    })
  }
];
