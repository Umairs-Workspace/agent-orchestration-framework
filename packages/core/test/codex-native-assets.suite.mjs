import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { installedBundlePath } from "../../../test/support/cli-spawn.mjs";
import { assets } from "./support/assets-services.mjs";
import { renderConfigOutputs } from "../src/adapters.mjs";
import { createRenderPlan } from "../src/render-plan.mjs";
import { collectAdapterWarnings } from "../src/adapter-warnings.mjs";
import { runtimeAssetRoot } from "../src/model.mjs";
import { installableBundleResources } from "../src/work/bundle-runtime.mjs";

const targetDir = path.join(os.tmpdir(), "aof-native-plan");
const portable = value => value.replaceAll("\\", "/");
const output = (plan, file) => plan.find(item => portable(item.path) === file);
// These fixtures are resolved resources (including loaded associated-file contents).
const planFor = resources => createRenderPlan({ resources: resources.map(resource => ({ runtimes: ["codex"], ...resource })) }, { targetDir, runtimes: ["codex"] });

export const codexNativeAssetTests = [
  { name: "154/03 native fixture fallback cannot hide a stale or missing git-tracked output", async run() {
    const fixture = await mkdtemp(path.join(os.tmpdir(), "aof-native-tracking-"));
    const rel = ".agents/skills/probe/SKILL.md";
    const file = path.join(fixture, rel);
    try {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, "Stale tracked instructions");
      execFileSync("git", ["init", "-q"], { cwd: fixture, windowsHide: true });
      execFileSync("git", ["add", "--", rel], { cwd: fixture, windowsHide: true });
      assert.equal(installedBundlePath(rel, fixture), file);
      assert.equal(await readFile(installedBundlePath(rel, fixture), "utf8"), "Stale tracked instructions");
      await rm(file);
      await assert.rejects(readFile(installedBundlePath(rel, fixture), "utf8"), { code: "ENOENT" });
    } finally {
      assert.equal(path.dirname(path.resolve(fixture)), path.resolve(os.tmpdir()));
      await rm(fixture, { recursive: true, force: true });
    }
  } },
  ...["opus", "sonnet", "haiku"].map(model => ({ name: `154/03 Claude alias ${model} is not translated into a Codex model`, async run() {
    const config = await assets.dsl.resolveConfig({ resources: [{ kind: "agent", id: "reviewer", model, body: "Review" }] });
    const plan = await createRenderPlan(config, { targetDir, runtimes: ["codex"] });
    assert.doesNotMatch(output(plan, ".codex/agents/reviewer.toml").content, /^model =/m);
    const [warning] = collectAdapterWarnings(config, { runtimes: ["codex"] });
    assert.equal(warning.path, "resources[0].model");
    assert.match(warning.reason, /not a native Codex model id/);
  } })),
  { name: "154/03 Claude and OpenCode mixed asset bytes match their pre-change renderer", run() {
    const fixture = {"resources":[{"runtimes":["claude","opencode"],"kind":"skill","id":"helper","description":"Help","body":"Help the operator","disableModelInvocation":true},{"runtimes":["claude","opencode"],"kind":"command","id":"review","description":"Review","body":"Review the diff","argumentHint":"<ref>"},{"runtimes":["claude","opencode"],"kind":"agent","id":"reviewer","description":"Review","body":"Review carefully","model":"opus","effort":"high","tools":["Read","Grep"]},{"runtimes":["claude","opencode"],"kind":"rule","id":"scope","paths":["src"],"body":"Scoped rules"}]};
    const rendered = renderConfigOutputs(fixture, {targetDir, runtimes:["claude","opencode"]}).map(item => ({path:portable(item.path),content:item.content}));
    assert.deepEqual(rendered, [{"path":".claude/skills/helper/SKILL.md","content":"---\naof-generated: true\nname: helper\ndescription: Help\ndisable-model-invocation: true\naof-runtime: claude\n---\n\nHelp the operator\n"},{"path":".claude/commands/review.md","content":"---\naof-generated: true\ndescription: Review\nargument-hint: \"<ref>\"\naof-invocation: /review\naof-runtime: claude\n---\n\nReview the diff\n"},{"path":".claude/agents/reviewer.md","content":"---\naof-generated: true\nname: reviewer\ndescription: Review\nmodel: opus\neffort: high\ntools: Read, Grep\naof-runtime: claude\n---\nReview carefully"},{"path":".claude/rules/scope.md","content":"---\naof-generated: true\npaths: src\naof-runtime: claude\n---\n\nScoped rules\n"},{"path":".opencode/skills/helper/SKILL.md","content":"---\naof-generated: true\nname: helper\ndescription: Help\ndisable-model-invocation: true\naof-runtime: opencode\n---\n\nHelp the operator\n"},{"path":".opencode/commands/review.md","content":"---\ndescription: Review\n---\n\nReview the diff\n"},{"path":".opencode/agents/reviewer.md","content":"---\ndescription: Review\nmode: subagent\npermission:\n  \"*\": deny\n  grep: allow\n  read: allow\n---\n\nReview carefully\n"},{"path":".opencode/rules/scope.md","content":"---\naof-generated: true\npaths: src\naof-runtime: opencode\n---\n\nScoped rules\n"},{"path":".claude/.gitignore","content":"*\n!.gitignore\n"},{"path":".opencode/.gitignore","content":"*\n!.gitignore\n"}]);
  } },

  { name: "154/03 E1 command-derived refine skill and relative support use native discovery without duplicate legacy output", async run() {
    const source = { kind: "command", id: "refine", description: "Refine work", body: "Read {{files.criteria.md}} then {{skills.helper}}.", associatedFiles: [{ path: "files/criteria.md", content: "Criteria" }] };
    const before = structuredClone(source);
    const mapped = installableBundleResources([source], ["codex"]);
    const plan = await planFor([...mapped, { kind: "skill", id: "helper", body: "Help", runtimes: ["codex"] }]);
    const skill = output(plan, ".agents/skills/aof-refine/SKILL.md");
    assert.ok(skill);
    assert.match(skill.content, /Read criteria\.md then \.agents\/skills\/helper\/SKILL\.md/);
    assert.equal(output(plan, ".agents/skills/aof-refine/criteria.md").content, "Criteria");
    assert.ok(plan.every(item => !portable(item.path).startsWith(".codex/skills/")));
    assert.deepEqual(source, before);
  } },
  { name: "154/03 native custom agent retains required fields and runtime model/effort without tools enforcement", async run() {
    const plan = await planFor([{ kind: "agent", id: "reviewer", name: "reviewer", description: 'Review: "diff"\ncarefully', body: 'Review "changes".\nUse \\ paths.', model: "opus", effort: "high", tools: ["Read"], overrides: { codex: { model: "gpt-6.1-sol", effort: "xhigh" } } }]);
    const agent = output(plan, ".codex/agents/reviewer.toml");
    assert.ok(agent);
    assert.match(agent.content, /^name = "reviewer"$/m);
    assert.match(agent.content, /^model = "gpt-6.1-sol"$/m);
    assert.match(agent.content, /^model_reasoning_effort = "xhigh"$/m);
    assert.ok(agent.content.includes('developer_instructions = "Review \\"changes\\".\\nUse \\\\ paths."'));
    assert.ok(agent.content.includes('description = "Review: \\"diff\\"\\ncarefully"'));
    assert.doesNotMatch(agent.content, /^tools|sandbox|approval|permissions/m);
    assert.ok(!output(plan, ".codex/agents/reviewer.md"));
  } },
  { name: "154/03 ordinary skill has safely quoted YAML metadata and unchanged body", async run() {
    const [skill] = await planFor([{ kind: "skill", id: "ordinary", description: 'A: "quoted" # description\nNext line', body: "Instructions" }]);
    assert.match(skill.content, /^name: "ordinary"$/m);
    assert.ok(skill.content.includes('description: "A: \\"quoted\\" # description\\nNext line"'));
    assert.match(skill.content, /\nInstructions\n$/);
  } },
  { name: "154/03 explicit procedure emits native invocation policy with attributable ownership", async run() {
    for (const resource of [{ kind: "skill", id: "explicit", disableModelInvocation: true, body: "Run explicitly" }, ...installableBundleResources([{ kind: "command", id: "continue", body: "Continue" }], ["codex"])]) {
      const plan = await planFor([resource]);
      const policy = output(plan, `.agents/skills/${resource.id}/agents/openai.yaml`);
      assert.ok(policy);
      assert.match(policy.content, /^policy:\n  allow_implicit_invocation: false\n$/m);
      assert.equal(policy.resource.id, resource.id);
      assert.equal(policy.resource.artifact, "associated-file");
    }
    assert.equal((await planFor([{ kind: "skill", id: "ordinary", body: "Implicit allowed" }])).some(item => portable(item.path).endsWith("openai.yaml")), false);
  } },
  { name: "154/03 conflicting authored invocation policy refuses before producing a plan", async run() {
    await assert.rejects(planFor([{ kind: "skill", id: "explicit", disableModelInvocation: true, associatedFiles: [{ path: "files/agents/openai.yaml", content: "policy:\n  allow_implicit_invocation: true\n" }] }]), /invocation policy conflicts/);
  } },
  ...[[undefined, "AGENTS.md"], [["."], "AGENTS.md"], [["src"], "src/AGENTS.md"], [["src/components"], "src/components/AGENTS.md"], [["src\\components"], "src/components/AGENTS.md"]].map(([paths, file]) => ({
    name: `154/03 E2 native directory guidance ${JSON.stringify(paths ?? [])} lands at ${file} without degradation`, async run() {
      const config = await assets.dsl.resolveConfig({ resources: [{ kind: "rule", id: "scope", paths, body: "Scoped guidance" }] });
      const plan = await createRenderPlan(config, { targetDir, runtimes: ["codex"] });
      assert.equal(plan.length, 1);
      assert.ok(output(plan, file));
      assert.deepEqual(collectAdapterWarnings(config, { runtimes: ["codex"] }), []);
    }
  })),
  { name: "154/03 glob guidance remains visibly advisory after grouping and retains expanded references", async run() {
    const config = await assets.dsl.resolveConfig({ resources: [
      { kind: "rule", id: "glob", paths: ["src/**/*.test.*"], body: "Use {{skills.helper}}" },
      { kind: "rule", id: "root", body: "Root guidance" },
      { kind: "skill", id: "helper", body: "Help" }
    ] });
    const plan = await createRenderPlan(config, { targetDir, runtimes: ["codex"] });
    const root = output(plan, "AGENTS.md");
    assert.match(root.content, /Advisory condition only/);
    assert.match(root.content, /does not enforce these path selectors/);
    assert.match(root.content, /Use \.agents\/skills\/helper\/SKILL\.md/);
    assert.doesNotMatch(root.content, /\{\{/);
    const warnings = collectAdapterWarnings(config, { runtimes: ["codex"] });
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].generatedPath, "AGENTS.md");
    assert.match(warnings[0].reason, /glob enforcement unavailable/);
  } },
  ...["../outside", "/outside", "C:/outside", "C:\\outside", "\\\\server\\share", "src/../../outside", "src\u0000dir"].map(scope => ({
    name: `154/03 unsafe guidance scope ${JSON.stringify(scope)} produces no output and a refusal diagnostic`, async run() {
      const config = await assets.dsl.resolveConfig({ resources: [{ kind: "rule", id: "unsafe", paths: [scope], body: "Never escape" }] });
      assert.deepEqual(await createRenderPlan(config, { targetDir, runtimes: ["codex"] }), []);
      const [warning] = collectAdapterWarnings(config, { runtimes: ["codex"] });
      assert.equal(warning.generatedPath, null);
      assert.match(warning.reason, /Unsafe.*refused/);
    }
  })),
  { name: "154/03 unsupported tools warn against the effective runtime override without permission claims", async run() {
    const config = await assets.dsl.resolveConfig({ resources: [{ kind: "agent", id: "reviewer", model: "opus", body: "Review", overrides: { codex: { model: "gpt-6.1-sol", tools: ["Read"] } } }] });
    const [warning] = collectAdapterWarnings(config, { runtimes: ["codex"] });
    assert.equal(warning.path, "resources[0].tools");
    assert.equal(warning.runtime, "codex");
    assert.equal(warning.generatedPath, ".codex/agents/reviewer.toml");
    assert.match(warning.reason, /not enforced/);
    assert.deepEqual(collectAdapterWarnings(config, { runtimes: ["claude"] }), []);
  } },
  { name: "154/03 render planning is deterministic and does not mutate shared input", async run() {
    const config = await assets.dsl.resolveConfig({ resources: [{ kind: "skill", id: "ordinary", body: "Shared", overrides: { codex: { body: "Native" } } }, { kind: "agent", id: "reviewer", body: "Review" }] });
    const before = structuredClone(config);
    const first = renderConfigOutputs(config, { targetDir });
    assert.deepEqual(renderConfigOutputs(config, { targetDir }), first);
    assert.deepEqual(config, before);
    assert.match(output(first, ".claude/skills/ordinary/SKILL.md").content, /Shared/);
    assert.match(output(first, ".agents/skills/ordinary/SKILL.md").content, /Native/);
  } },
  { name: "154/03 global skills and agents resolve their distinct native roots without writing them", async run() {
    assert.equal(runtimeAssetRoot("codex", "skill", { global: true }), path.join(os.homedir(), ".agents"));
    assert.equal(runtimeAssetRoot("codex", "agent", { global: true }), path.join(os.homedir(), ".codex"));
    assert.equal(runtimeAssetRoot("claude", "skill"), ".claude");
    assert.equal(runtimeAssetRoot("opencode", "agent"), ".opencode");
  } }
];
