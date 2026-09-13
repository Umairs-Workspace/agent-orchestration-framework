// Traceability wiring for milestone 01 / story 00 `acd-bundle-resources`.
//
// Every @executable scenario AND every Scenario-Outline Examples row across the
// story's four task features is covered here, asserted against the REAL loader /
// renderer / manifest functions (no engine code authored in the tests):
//
//   00_bundle-source-tree.feature  — the tracked bundle root holds the ACD set
//   01_bundle-descriptor.feature   — the descriptor declares typed members
//   02_bundle-loader.feature       — the CLI loads the bundle cwd-independently
//   03_bundle-manifest.feature     — the shipped content-addressed manifest
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadBundle,
  readDescriptor,
  renderBundleOutputs,
  bundleRoot
} from "../../src/work/bundle.mjs";
import {
  generateBundleManifest,
  serializeBundleManifest,
  readShippedManifest
} from "../../src/work/bundle-manifest.mjs";
import { hashContent } from "../../src/lock.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// The frozen ACD actor set (the membership the fitness functions pin).
const AGENT_IDS = [
  "aof-architect",
  "aof-compliance",
  "aof-designer",
  "aof-developer",
  "aof-product-owner",
  "aof-qa",
  "aof-researcher",
  "aof-security"
];
const COMMAND_IDS = [
  "add-chore",
  "add-milestone",
  "add-spike",
  "add-story",
  "add-task",
  "add-uat",
  "assimilate-code",
  "autonomous",
  "code-review",
  "continue",
  "delegate",
  "feedback",
  "init",
  "insert-chore",
  "insert-milestone",
  "insert-story",
  "insert-uat",
  "migrate",
  "observe",
  "pay-debt",
  "promote",
  "recent",
  "refine",
  "retrospective",
  "shatter",
  "validate",
  "verify"
];
// story 80: `shared` is a template member filed under NO work-item type — the home of
// OUTCOME.md, which every DELIVERING type (milestone, story, chore) instantiates. The
// member id names the property, not a type, because `templateOutputPath` renders to
// `.aof/templates/work/<member-id>/` and the id therefore IS the scope.
const TEMPLATE_IDS = ["chore", "milestone", "shared", "spike", "story", "task", "uat"];
// The bundled gpt-5.6 delegation skills — how the ACD agents reach the configured
// delegation model (default gpt-5.6-sol; see work-delegation.test.mjs).
const SKILL_IDS = ["codex-computer-use", "codex-implementation", "codex-review"];

// THE HOOK MEMBERS, ALL OF THEM. This list is the membership gate, so it moves with
// the code (m46/ADR-006): m43 added `claude-artifact-sync` (a `hook`) and
// `artifact-sync-enqueue` (an `asset`) without moving it, and m49/07 adds the three
// CLAUDE session lifecycle members — the ones without which the terminals home is
// empty in every workspace except this one. A list that lags the descriptor cannot
// tell "a member was added" from "a member was broken".
const HOOK_IDS = [
  "claude-artifact-sync",
  "claude-run-heartbeat",
  "claude-session-end",
  "claude-session-prompt-ping",
  "claude-session-start",
  "codex-session-prompt-ping",
  "codex-session-start",
  "codex-session-stop-ping",
  "opencode-session-end",
  "opencode-session-prompt-ping",
  "opencode-session-start"
];
function descriptorMembers() {
  return readDescriptor().members;
}

function memberIds() {
  return descriptorMembers().map((member) => member.id);
}

export const bundleTests = [
  // ====================================================================
  // 00_bundle-source-tree.feature
  // ====================================================================

  {
    name: "bundle/source-tree: the bundle root holds the complete ACD actor set (8 agents, 27 commands, 7 templates, 3 skills, 11 hooks)",
    run: async () => {
      const ids = new Set(memberIds());
      for (const id of AGENT_IDS) assert.ok(ids.has(id), `missing agent ${id}`);
      for (const id of COMMAND_IDS) assert.ok(ids.has(id), `missing command ${id}`);
      for (const id of TEMPLATE_IDS) assert.ok(ids.has(id), `missing template ${id}`);
      for (const id of SKILL_IDS) assert.ok(ids.has(id), `missing skill ${id}`);
      const byKind = (kind) => descriptorMembers().filter((m) => m.kind === kind).length;
      for (const id of HOOK_IDS) assert.ok(ids.has(id), `missing hook ${id}`);
      assert.equal(byKind("agent"), 8, "8 agents");
      assert.equal(byKind("command"), 27, "27 commands (incl. the 4 insert-* placement twins, `promote` — the one mint, 127/02 — assimilate-code, delegate, observe, init and pay-debt)");
      assert.equal(byKind("skill"), 3, "3 codex delegation skills");
      assert.equal(byKind("template"), 7, "milestone/story/task/uat/spike/chore templates + the type-agnostic `shared` (OUTCOME.md)");
      assert.equal(byKind("hook"), 11, "11 hooks: 3 Codex session-presence + 3 Claude session-presence + 3 OpenCode session-presence + artifact-sync + run-heartbeat");
    }
  },
  {
    name: "bundle/source-tree: the bundle root ships with the package — tracked and not git-ignored",
    run: async () => {
      const root = bundleRoot();
      assert.ok(existsSync(root), "bundle root exists on disk");
      // Not matched by any git-ignore rule: `git check-ignore` exits non-zero
      // (and prints nothing) when a path is NOT ignored.
      let ignored = false;
      try {
        const out = execFileSync("git", ["check-ignore", path.join(root, "bundle.json")], {
          cwd: repoRoot,
          encoding: "utf8"
        });
        ignored = out.trim().length > 0;
      } catch {
        ignored = false; // non-zero exit == not ignored
      }
      assert.equal(ignored, false, "bundle root is not matched by any git-ignore rule");
      // Tracked: the descriptor + a representative member are known to git.
      const lsFiles = execFileSync("git", ["ls-files", "src/bundle"], { cwd: repoRoot, encoding: "utf8" });
      assert.ok(lsFiles.includes("src/bundle/bundle.json"), "descriptor is git-tracked");
      assert.ok(lsFiles.includes("src/bundle/agents/aof-architect.md"), "agents are git-tracked");
    }
  },
  // Scenario Outline: a declared ACD member is present in the bundle root.
  {
    name: "bundle/source-tree: outline — declared members present (aof-architect, aof-product-owner, aof-qa, aof-security, add-milestone, refine, shatter, verify)",
    run: async () => {
      const root = bundleRoot();
      const ids = new Set(memberIds());
      const byId = new Map(descriptorMembers().map((m) => [m.id, m]));
      for (const id of [
        "aof-architect",
        "aof-product-owner",
        "aof-qa",
        "aof-security",
        "add-milestone",
        "refine",
        "shatter",
        "verify"
      ]) {
        assert.ok(ids.has(id), `declared member ${id} present`);
        const member = byId.get(id);
        const file = member.file ?? member.dir;
        assert.ok(existsSync(path.join(root, file)), `on-disk file/dir for ${id} exists`);
      }
    }
  },
  // Scenario Outline: a legacy or unmanaged actor is absent from the bundle root.
  {
    name: "bundle/source-tree: outline — legacy/unmanaged actors absent (code-reviewer, gsd-planner, gsd-executor, gsd-verifier, gsd-roadmapper)",
    run: async () => {
      const ids = new Set(memberIds());
      const root = bundleRoot();
      for (const id of ["code-reviewer", "gsd-planner", "gsd-executor", "gsd-verifier", "gsd-roadmapper"]) {
        assert.ok(!ids.has(id), `legacy/unmanaged ${id} is not a declared member`);
        assert.ok(!existsSync(path.join(root, "agents", `${id}.md`)), `no ${id}.md file in bundle agents`);
        assert.ok(!existsSync(path.join(root, "commands", `${id}.md`)), `no ${id}.md file in bundle commands`);
      }
    }
  },

  // ====================================================================
  // 01_bundle-descriptor.feature
  // ====================================================================

  {
    name: "bundle/descriptor: one typed entry per member — every member carries id + kind; 8 agents, 27 commands, 7 templates, 3 skills, 11 hooks",
    run: async () => {
      const members = descriptorMembers();
      for (const member of members) {
        assert.ok(typeof member.id === "string" && member.id.length > 0, "member has id");
        // `asset` is m43/ADR-002's aof-EXCLUSIVE verbatim-installed file kind (the
        // artifact-sync enqueue SCRIPT, whose hook ENTRY ships through the settings
        // merge). It has been a real member kind since m43 and this list did not
        // admit it — the valid-kind list moves with the code (m46/ADR-006).
        assert.ok(["agent", "asset", "command", "hook", "skill", "template"].includes(member.kind), `member ${member.id} has a valid kind`);
      }
      assert.deepEqual(
        members.filter((m) => m.kind === "agent").map((m) => m.id).sort(),
        [...AGENT_IDS].sort(),
        "8 agents declared"
      );
      assert.deepEqual(
        members.filter((m) => m.kind === "command").map((m) => m.id).sort(),
        [...COMMAND_IDS].sort(),
        "27 commands declared"
      );
      assert.deepEqual(
        members.filter((m) => m.kind === "hook").map((m) => m.id).sort(),
        [...HOOK_IDS].sort(),
        "11 hooks declared: lifecycle hooks plus Claude artifact-sync and run-heartbeat triggers"
      );
      assert.deepEqual(
        members.filter((m) => m.kind === "template").map((m) => m.id).sort(),
        [...TEMPLATE_IDS].sort(),
        "milestone/story/task/uat/spike/chore templates declared as kind template"
      );
      assert.deepEqual(
        members.filter((m) => m.kind === "skill").map((m) => m.id).sort(),
        [...SKILL_IDS].sort(),
        "3 codex delegation skills declared as kind skill"
      );
    }
  },
  {
    name: "bundle/descriptor: every resource member (agent + command) names one or more target runtimes",
    run: async () => {
      const resourceMembers = descriptorMembers().filter((m) => m.kind === "agent" || m.kind === "command");
      assert.equal(resourceMembers.length, 35, "35 resource members (8 agents + 27 commands)");
      for (const member of resourceMembers) {
        assert.ok(Array.isArray(member.runtimes) && member.runtimes.length >= 1, `${member.id} declares >=1 runtime`);
      }
    }
  },
  // Scenario Outline: a descriptor resource entry declares its kind and target runtime(s).
  {
    name: "bundle/descriptor: outline — resource kind + runtimes (agents claude,codex,opencode; commands claude,opencode)",
    run: async () => {
      const byId = new Map(descriptorMembers().map((m) => [m.id, m]));
      const rows = [
        { id: "aof-architect", kind: "agent", runtimes: ["claude", "codex", "opencode"] },
        { id: "aof-product-owner", kind: "agent", runtimes: ["claude", "codex", "opencode"] },
        { id: "aof-qa", kind: "agent", runtimes: ["claude", "codex", "opencode"] },
        { id: "aof-developer", kind: "agent", runtimes: ["claude", "codex", "opencode"] },
        { id: "add-milestone", kind: "command", runtimes: ["claude", "opencode"] },
        { id: "refine", kind: "command", runtimes: ["claude", "opencode"] },
        { id: "verify", kind: "command", runtimes: ["claude", "opencode"] },
        { id: "retrospective", kind: "command", runtimes: ["claude", "opencode"] }
      ];
      for (const row of rows) {
        const member = byId.get(row.id);
        assert.ok(member, `entry for ${row.id} exists`);
        assert.equal(member.kind, row.kind, `${row.id} kind`);
        assert.deepEqual(member.runtimes, row.runtimes, `${row.id} runtimes`);
      }
    }
  },
  // Scenario Outline: a template member is declared with id and kind "template".
  {
    name: "bundle/descriptor: outline — template members (milestone, story, task, uat, spike, chore) are kind template",
    run: async () => {
      const byId = new Map(descriptorMembers().map((m) => [m.id, m]));
      for (const id of TEMPLATE_IDS) {
        const member = byId.get(id);
        assert.ok(member, `entry for ${id} exists`);
        assert.equal(member.kind, "template", `${id} is kind template`);
        // Templates are not runtime-targeted resources.
        assert.equal(member.runtimes, undefined, `${id} declares no runtimes`);
      }
    }
  },

  // ====================================================================
  // 02_bundle-loader.feature
  // ====================================================================

  {
    name: "bundle/loader: the loader returns the full member set faithful to the descriptor (by count and by id)",
    run: async () => {
      const bundle = loadBundle();
      const descriptorIds = memberIds();
      const loadedIds = [
        ...bundle.resources.map((r) => r.id),
        ...bundle.hooks.map((h) => h.id),
        ...bundle.templates.map((t) => t.id),
        ...bundle.assets.map((a) => a.id)
      ];
      assert.equal(loadedIds.length, descriptorIds.length, "member count matches descriptor");
      assert.deepEqual(loadedIds.slice().sort(), descriptorIds.slice().sort(), "member ids match descriptor");
    }
  },
  {
    name: "bundle/loader: the loaded bundle renders one non-empty output per claude-supported member",
    run: async () => {
      const bundle = loadBundle();
      const outputs = renderBundleOutputs(bundle, { runtimes: ["claude"] });
      // Claude supports all agents (8) + all commands (27) + the 3 codex delegation skills + all template files.
      const resourceOutputs = outputs.filter((o) => o.resource.kind === "agent" || o.resource.kind === "command");
      assert.equal(resourceOutputs.length, AGENT_IDS.length + COMMAND_IDS.length, "one output per claude resource member");
      for (const output of outputs) {
        assert.ok(typeof output.content === "string" && output.content.trim().length > 0, `${output.resource.id} content non-empty`);
      }
    }
  },
  // Scenario Outline: the bundle loads identically from any working directory.
  {
    name: "bundle/loader: outline — loads identically from repo root, an unrelated temp dir, and a nested subdirectory",
    run: async () => {
      const baseline = memberIds().slice().sort();
      const originalCwd = process.cwd();
      const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-bundle-cwd-"));
      const nested = path.join(repoRoot, "src", "bundle", "agents");
      try {
        for (const cwd of [repoRoot, tmp, nested]) {
          process.chdir(cwd);
          // loadBundle resolves the root from import.meta.url, so cwd is irrelevant.
          const bundle = loadBundle();
          const loaded = [
            ...bundle.resources.map((r) => r.id),
            ...bundle.hooks.map((h) => h.id),
            ...bundle.templates.map((t) => t.id),
            ...bundle.assets.map((a) => a.id)
          ].sort();
          assert.deepEqual(loaded, baseline, `member set stable from cwd ${cwd}`);
        }
      } finally {
        process.chdir(originalCwd);
        await rm(tmp, { recursive: true, force: true });
      }
    }
  },
  {
    name: "bundle/loader: ADR-001 — the bundle resolves from a child process whose cwd is an unrelated temp dir",
    run: async () => {
      // A black-box proof of cwd-independence: spawn node from a temp cwd and
      // load the bundle by its module path; the member count must match.
      const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-bundle-proc-"));
      const loaderUrl = pathToFileUrl(path.join(repoRoot, "src", "work", "bundle.mjs"));
      try {
        const script = `import { loadBundle } from ${JSON.stringify(loaderUrl)}; const b = loadBundle(); process.stdout.write(String(b.resources.length + b.hooks.length + b.templates.length + b.assets.length));`;
        const out = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
          cwd: tmp,
          encoding: "utf8"
        });
        assert.equal(out.trim(), String(memberIds().length), "child process loads full member set from unrelated cwd");
      } finally {
        await rm(tmp, { recursive: true, force: true });
      }
    }
  },

  // ====================================================================
  // 03_bundle-manifest.feature
  // ====================================================================

  {
    name: "bundle/manifest: catalogues one entry per rendered member with path/runtime/resource/hash and resource id+kind",
    run: async () => {
      const manifest = readShippedManifest();
      const rendered = renderBundleOutputs(loadBundle(), { runtimes: manifest.runtimes });
      assert.equal(manifest.entries.length, rendered.length, "one entry per rendered member");
      for (const entry of manifest.entries) {
        assert.ok(typeof entry.path === "string" && entry.path.length > 0, "entry has path");
        assert.ok(typeof entry.runtime === "string" && entry.runtime.length > 0, "entry has runtime");
        assert.ok(entry.resource && typeof entry.resource === "object", "entry has resource");
        assert.ok(typeof entry.resource.id === "string", "resource has id");
        assert.ok(typeof entry.resource.kind === "string", "resource has kind");
        assert.ok(typeof entry.hash === "string", "entry has hash");
      }
    }
  },
  {
    name: "bundle/manifest: every hash is a sha256 content address",
    run: async () => {
      const manifest = readShippedManifest();
      for (const entry of manifest.entries) {
        assert.ok(entry.hash.startsWith("sha256:"), `${entry.path} hash is sha256:`);
      }
    }
  },
  {
    name: "bundle/manifest: records the bundle version",
    run: async () => {
      const manifest = readShippedManifest();
      assert.ok("bundleVersion" in manifest, "manifest carries bundleVersion");
      assert.ok(typeof manifest.bundleVersion === "string" && manifest.bundleVersion.length > 0, "bundleVersion non-empty");
    }
  },
  {
    name: "bundle/manifest: regenerating from an unchanged bundle is byte-for-byte stable, hashes unchanged",
    run: async () => {
      const first = generateBundleManifest();
      const second = generateBundleManifest();
      assert.equal(serializeBundleManifest(first), serializeBundleManifest(second), "regeneration is byte-for-byte stable");
      const firstHashes = first.entries.map((e) => `${e.path}=${e.hash}`).sort();
      const secondHashes = second.entries.map((e) => `${e.path}=${e.hash}`).sort();
      assert.deepEqual(secondHashes, firstHashes, "every entry hash unchanged across regeneration");
      // And it matches what shipped on disk.
      assert.equal(serializeBundleManifest(first), serializeBundleManifest(generateBundleManifest()), "stable vs disk-derived");
    }
  },
  // Scenario Outline: a rendered member appears in the manifest with the full entry shape.
  {
    name: "bundle/manifest: outline — entry shape for aof-architect, aof-qa, add-milestone, refine",
    run: async () => {
      const manifest = readShippedManifest();
      const byId = new Map(manifest.entries.map((e) => [e.resource.id, e]));
      for (const id of ["aof-architect", "aof-qa", "add-milestone", "refine"]) {
        const entry = byId.get(id);
        assert.ok(entry, `manifest entry for ${id} exists`);
        assert.ok(entry.path.length > 0, `${id} non-empty path`);
        assert.ok(typeof entry.runtime === "string" && entry.runtime.length > 0, `${id} has runtime`);
        assert.ok(entry.hash.startsWith("sha256:"), `${id} hash is sha256:`);
      }
    }
  },
  {
    name: "bundle/manifest: each entry hash equals hashContent of the re-rendered member (content-address soundness)",
    run: async () => {
      const manifest = readShippedManifest();
      const rendered = renderBundleOutputs(loadBundle(), { runtimes: manifest.runtimes });
      const renderedByPath = new Map(rendered.map((o) => [String(o.path).replaceAll("\\", "/"), o]));
      for (const entry of manifest.entries) {
        const output = renderedByPath.get(entry.path);
        assert.ok(output, `rendered output for ${entry.path}`);
        assert.equal(entry.hash, hashContent(output.content), `${entry.path} hash is a true content address`);
      }
    }
  },
  {
    name: "bundle/opencode: rendering for the opencode runtime produces .opencode/commands, .opencode/agents and .opencode/plugins outputs",
    run: async () => {
      const outputs = renderBundleOutputs(loadBundle(), { runtimes: ["opencode"] });
      const commands = outputs.filter((o) => o.resource.kind === "command" && String(o.path).replaceAll("\\", "/").startsWith(".opencode/commands/"));
      const agents = outputs.filter((o) => o.resource.kind === "agent" && String(o.path).replaceAll("\\", "/").startsWith(".opencode/agents/"));
      const plugins = outputs.filter((o) => o.resource.kind === "hooks" && String(o.path).replaceAll("\\", "/").startsWith(".opencode/plugins/"));
      assert.equal(commands.length, COMMAND_IDS.length, "one .opencode/commands output per command member");
      assert.equal(agents.length, AGENT_IDS.length, "one .opencode/agents output per agent member");
      assert.equal(plugins.length, 3, "one .opencode/plugins output per opencode bundle hook");
      for (const id of ["opencode-session-start", "opencode-session-prompt-ping", "opencode-session-end"]) {
        assert.ok(outputs.some((o) => String(o.path).replaceAll("\\", "/") === `.opencode/plugins/aof-${id}.js`), `plugin file for ${id} renders`);
      }
      const sample = outputs.find((o) => String(o.path).replaceAll("\\", "/") === ".opencode/commands/aof/refine.md");
      assert.ok(sample, "a namespaced command renders under .opencode/commands/aof/");
      assert.doesNotMatch(sample.content, /^aof-invocation:/m, "opencode command carries no aof-invocation frontmatter");
      const sessionStart = outputs.find((o) => String(o.path).replaceAll("\\", "/") === ".opencode/plugins/aof-opencode-session-start.js");
      assert.match(sessionStart.content, /"session\.created": async/);
      assert.ok(sessionStart.content.includes('await $`${["aof","session","start","--assistant","opencode"]}`;'));

      const architect = outputs.find((o) => String(o.path).replaceAll("\\", "/") === ".opencode/agents/aof-architect.md");
      assert.ok(architect, "an opencode agent file renders");
      assert.match(architect.content, /^description: ACD technical architect/m, "opencode agent carries description frontmatter");
      assert.match(architect.content, /^mode: subagent$/m, "opencode agent declares subagent mode");
      assert.doesNotMatch(architect.content, /^model:/m, "opencode agent omits model so the model is not pinned");
      assert.doesNotMatch(architect.content, /^tools:/m, "opencode agent emits no deprecated tools frontmatter");
      assert.doesNotMatch(architect.content, /^aof-runtime:/m, "opencode agent carries no aof-runtime frontmatter");
      assert.doesNotMatch(architect.content, /^aof-generated:/m, "opencode agent carries no aof-generated frontmatter");
      assert.match(architect.content, /^permission:$/m, "opencode agent maps tools to a permission block");
      assert.match(architect.content, /^  "\*": deny$/m, "opencode agent denies all tools by default");
      assert.match(architect.content, /^  read: allow$/m, "opencode agent allows each listed tool");
      assert.doesNotMatch(architect.content, /^  task: allow$/m, "opencode agent omits tools not in the allow-list");
    }
  }
];

function pathToFileUrl(filePath) {
  let resolved = path.resolve(filePath).replaceAll("\\", "/");
  if (!resolved.startsWith("/")) resolved = `/${resolved}`;
  return `file://${encodeURI(resolved)}`;
}
