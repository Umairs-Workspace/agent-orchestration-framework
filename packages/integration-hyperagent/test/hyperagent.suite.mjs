// @aof/integration-hyperagent — the package's own cases: its one contribution, config defaults and
// bounds, the brief, the result parser, the setup doctor, and the plan-branch check over a real git
// remote in a temp dir.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile, readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { contribution } from "../src/contribution.mjs";
import { readHyperagentConfig, isSafeBranch, HYPERAGENT_DEFAULTS } from "../src/config.mjs";
import { composeBrief, parseGitRemote, planSlug, PLAN_MODES, RESULT_BLOCK_MARKER } from "../src/brief.mjs";
import { parsePlanResult } from "../src/plan-result.mjs";
import { checkPlanBranch, inPlanningLane } from "../src/check.mjs";
import { inspectHyperagentSetup, codexServerName } from "../src/doctor.mjs";
import { BRIEF_MODES } from "../src/commands.mjs";

const REPO = { owner: "acme", repo: "widgets" };
const SETTINGS = HYPERAGENT_DEFAULTS;

function brief(overrides = {}) {
  return composeBrief({ mode: "plan", request: "Add SSO", repo: REPO, baseBranch: "main", workDir: "wiki/work", tags: { layers: ["@cli"] }, settings: SETTINGS, ...overrides });
}

function git(args, cwd, env) {
  return new Promise((resolve) => {
    execFile("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "init.defaultBranch=main", "-c", "commit.gpgsign=false", ...args], { cwd, ...(env ? { env } : {}) }, (error, stdout, stderr) =>
      resolve({ stdout: String(stdout), stderr: String(stderr), status: error ? (typeof error.code === "number" ? error.code : 1) : 0 }));
  });
}

async function withDir(fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-hyperagent-pkg-"));
  try { return await fn(dir); } finally { await rm(dir, { recursive: true, force: true }); }
}

// origin (bare) ← clone, with main holding a work dir and a plan branch on the remote.
async function planRemote(dir, planFiles) {
  const origin = path.join(dir, "origin.git");
  const seed = path.join(dir, "seed");
  const clone = path.join(dir, "clone");
  await git(["init", "--bare", origin], dir);
  await mkdir(path.join(seed, "wiki", "work"), { recursive: true });
  await git(["init", seed], dir);
  await writeFile(path.join(seed, "wiki", "work", "README.md"), "work\n");
  await git(["add", "."], seed);
  await git(["commit", "-m", "base"], seed);
  await git(["remote", "add", "origin", origin], seed);
  await git(["push", "origin", "main"], seed);
  await git(["checkout", "-b", "aof/plan/sso"], seed);
  for (const [file, content] of Object.entries(planFiles)) {
    await mkdir(path.dirname(path.join(seed, file)), { recursive: true });
    await writeFile(path.join(seed, file), content);
  }
  await git(["add", "."], seed);
  await git(["commit", "-m", "plan"], seed);
  await git(["push", "origin", "aof/plan/sso"], seed);
  await git(["clone", origin, clone], dir);
  return clone;
}

export const hyperagentPackageTests = [
  {
    name: "integration-hyperagent/contribution: one frozen object names the work.integrations id, the package whose assets it ships, and its verbs",
    run: async () => {
      assert.ok(Object.isFrozen(contribution));
      assert.equal(contribution.id, "hyperagent");
      assert.equal(contribution.name, "@aof/integration-hyperagent");
      assert.deepEqual(contribution.assets, { package: "@aof/integration-hyperagent" });
      assert.equal(typeof contribution.commands, "function");
    }
  },
  {
    name: "integration-hyperagent/config: absent config yields the defaults; bad values fall back and are reported, never thrown",
    run: async () => {
      assert.deepEqual(readHyperagentConfig({}), { configured: false, value: { ...HYPERAGENT_DEFAULTS }, problems: [] });
      const good = readHyperagentConfig({ work: { integrations: { hyperagent: { agent: "Planner", baseBranch: "develop", branchPrefix: "plans", maxMinutes: 60, pollSeconds: 10 } } } });
      assert.deepEqual(good.value, { agent: "Planner", baseBranch: "develop", branchPrefix: "plans/", maxMinutes: 60, pollSeconds: 10 });
      const bad = readHyperagentConfig({ work: { integrations: { hyperagent: { agent: "", maxMinutes: 9999, pollSeconds: 1, baseBranch: "--upload-pack=x" } } } });
      assert.deepEqual(bad.value, { ...HYPERAGENT_DEFAULTS });
      assert.equal(bad.problems.length, 4);
    }
  },
  {
    name: "integration-hyperagent/config: isSafeBranch refuses option-shaped, range-shaped and malformed names",
    run: async () => {
      for (const name of ["main", "aof/plan/sso", "release-1.2"]) assert.ok(isSafeBranch(name), name);
      for (const name of ["-x", "--upload-pack=x", "a..b", "a/", "a//b", "x.lock", "", null, "a b"]) assert.ok(!isSafeBranch(name), String(name));
    }
  },
  {
    name: "integration-hyperagent/brief: GitHub remotes parse in https, ssh and scp form; anything else is null",
    run: async () => {
      for (const url of ["https://github.com/acme/widgets.git", "https://github.com/acme/widgets", "git@github.com:acme/widgets.git", "ssh://git@github.com/acme/widgets.git", "https://token@github.com/acme/widgets.git"]) {
        assert.deepEqual(parseGitRemote(url), REPO, url);
      }
      assert.equal(parseGitRemote("https://gitlab.com/acme/widgets.git"), null);
      assert.equal(parseGitRemote(""), null);
    }
  },
  {
    name: "integration-hyperagent/brief: the brief is deterministic, self-contained, names the plan branch and ends with the result-block contract",
    run: async () => {
      const first = brief();
      assert.deepEqual(brief(), first, "same inputs, same brief");
      assert.equal(first.agent, "AOF Planner");
      assert.equal(first.branch, "aof/plan/add-sso");
      for (const needle of ["acme/widgets", "Base branch: `main`", "aof/plan/add-sso", "`aof-prd`", "`aof-shatter`", "> Add SSO", "wiki/work/backlog/", "layers: @cli", "draft** pull request", "Never invent the answer", RESULT_BLOCK_MARKER]) {
        assert.ok(first.message.includes(needle), `brief mentions ${needle}`);
      }
      assert.match(brief({ mode: "refine", request: "", target: "07" }).message, /\*\*Item:\*\* `07`/);
      assert.match(brief({ mode: "shatter", request: "", target: "wiki/planning/PRD-sso.md" }).message, /\*\*PRD:\*\* `wiki\/planning\/PRD-sso.md`/);
      assert.equal(planSlug("  Add a Slack notifier — for loop questions!!  "), "add-a-slack-notifier-for-loop-questions");
      assert.equal(planSlug("***"), "plan");
    }
  },
  {
    name: "integration-hyperagent/brief: refusals are coded — unknown mode, missing request, missing target, no repo, unsafe base",
    run: async () => {
      const cases = [
        [{ mode: "build" }, "hyperagent-mode-unknown"],
        [{ request: " " }, "hyperagent-request-missing"],
        [{ mode: "refine", request: "", target: "" }, "hyperagent-target-missing"],
        [{ repo: null }, "hyperagent-repo-unresolved"],
        [{ baseBranch: "--x" }, "hyperagent-base-invalid"]
      ];
      for (const [overrides, code] of cases) assert.throws(() => brief(overrides), (error) => error.code === code, code);
      assert.deepEqual(PLAN_MODES, ["plan", "prd", "shatter", "refine"]);
      assert.deepEqual(BRIEF_MODES, PLAN_MODES, "the command schema's inline modes match the brief's");
    }
  },
  {
    name: "integration-hyperagent/result: the result block is read back; without it the PR URL and plan branch are found in the text",
    run: async () => {
      const block = ["Done — see the PR.", "```", RESULT_BLOCK_MARKER, "status: delivered", "pr: https://github.com/acme/widgets/pull/42", "branch: aof/plan/add-sso", "open-questions: 2", "```"].join("\n");
      assert.deepEqual(parsePlanResult(block), { found: true, status: "delivered", pr: { url: "https://github.com/acme/widgets/pull/42", owner: "acme", repo: "widgets", number: 42 }, branch: "aof/plan/add-sso", openQuestions: 2 });
      const prose = parsePlanResult("I opened https://github.com/acme/widgets/pull/7 from `aof/plan/sso`.");
      assert.equal(prose.found, false);
      assert.equal(prose.status, "delivered");
      assert.equal(prose.pr.number, 7);
      assert.equal(prose.branch, "aof/plan/sso");
      const blocked = parsePlanResult(`${RESULT_BLOCK_MARKER}\nstatus: blocked\npr: none\nbranch: aof/plan/sso\n`);
      assert.equal(blocked.status, "blocked");
      assert.equal(blocked.pr, null);
      assert.deepEqual(parsePlanResult("Which identity provider should this use?"), { found: false, status: "unknown", pr: null, branch: null, openQuestions: null });
    }
  },
  {
    name: "integration-hyperagent/check: planning-lane paths are work records, planning docs and root PRDs only",
    run: async () => {
      for (const file of ["wiki/work/backlog/milestone_sso/SPEC.md", "wiki/planning/PRD-sso.md", "PRD-sso.md"]) assert.ok(inPlanningLane(file, "wiki/work"), file);
      for (const file of ["src/index.mjs", "wiki/workbench.md", "docs/PRD-sso.md", ".hyperagent/AGENT.md"]) assert.ok(!inPlanningLane(file, "./wiki/work"), file);
    }
  },
  {
    // 169/01 task 02 — the extraction's --prefix is built with forward slashes (169/ADR-006); this
    // case was red on Windows before, where git does not split a prefix on the platform separator.
    name: "169/01 task 02 E1 · integration-hyperagent/check: a plan branch with nested files is extracted into a temporary checkout and validated; out-of-lane files are reported; the checkout is removed and the operator's untouched",
    run: async () => withDir(async (dir) => {
      const clone = await planRemote(dir, { "wiki/work/backlog/milestone_sso/SPEC.md": "spec\n", "src/sneaky.mjs": "export {};\n" });
      const seen = [];
      const result = await checkPlanBranch({
        projectRoot: clone, branch: "aof/plan/sso", base: "main", workDir: "wiki/work", gitExec: (args, options) => git(args, options.cwd, options.env),
        tmpRoot: dir,
        validateAt: async (tree) => { seen.push(tree); assert.equal((await readFile(path.join(tree, "wiki", "work", "backlog", "milestone_sso", "SPEC.md"), "utf8")).replace(/\r\n/g, "\n"), "spec\n", "the tree holds the branch tip (EOL as core.autocrlf checks it out)"); return [{ path: path.join(tree, "wiki", "work", "x"), problem: "planted" }]; }
      });
      assert.equal(seen.length, 1, "validated exactly once, in its own tree");
      assert.notEqual(seen[0], clone);
      assert.deepEqual(result.changed.sort(), ["src/sneaky.mjs", "wiki/work/backlog/milestone_sso/SPEC.md"]);
      assert.deepEqual(result.outOfLane, ["src/sneaky.mjs"]);
      assert.deepEqual(result.findings, [{ path: "wiki/work/x", problem: "planted" }]);
      assert.equal(result.pass, false);
      assert.match(result.commit, /^[0-9a-f]{40}$/);
      assert.equal((await git(["rev-parse", "--abbrev-ref", "HEAD"], clone)).stdout.trim(), "main", "the operator's branch is unchanged");
      assert.equal((await git(["worktree", "list", "--porcelain"], clone)).stdout.match(/^worktree /gm).length, 1, "no worktree is registered");
      assert.equal((await git(["status", "--porcelain"], clone)).stdout, "", "the operator's index and working tree are untouched");
      assert.deepEqual((await readdir(dir)).filter((name) => name.startsWith("aof-hyperplan-")), [], "the temporary directory is removed");
    })
  },
  {
    // 169/01 task 02 E1, as the scenario states it: the `aof work integrations hyperagent check` verb
    // itself runs over a real remote, with the same services core injects (git, the validator).
    name: "169/01 task 02 E1 · the `hyperagent:check` verb extracts a plan branch with nested files into a temporary checkout, validates it there, and removes it",
    run: async () => withDir(async (dir) => {
      const clone = await planRemote(dir, { "wiki/work/backlog/milestone_x/SPEC.md": "spec\n" });
      const validated = [];
      const commands = contribution.commands({
        commandError: (message, code) => Object.assign(new Error(message), { code }),
        gitExec: (args, options) => git(args, options.cwd, options.env),
        readJson: async () => { throw new Error("no config"); },
        validateWork: async (workDir, _config, _scope, { projectRoot }) => {
          validated.push(projectRoot);
          assert.equal((await readFile(path.join(projectRoot, "wiki", "work", "backlog", "milestone_x", "SPEC.md"), "utf8")).replace(/\r\n/g, "\n"), "spec\n");
          assert.equal(workDir, path.resolve(projectRoot, "./wiki/work"));
          return [];
        }
      });
      const check = commands.find((command) => command.id === "hyperagent:check");
      const ctx = { workspace: { projectRoot: clone, workDir: path.join(clone, "wiki", "work"), config: {} } };
      const result = await check.run(check.cli.argv(["aof/plan/sso"], { base: "main" }), ctx);
      assert.equal(validated.length, 1, "validated once, in its own checkout");
      assert.notEqual(validated[0], clone);
      assert.deepEqual(result.changed, ["wiki/work/backlog/milestone_x/SPEC.md"]);
      assert.equal(result.pass, true);
      assert.equal(check.cli.exit(result), 0);
      assert.ok(!(await readdir(os.tmpdir())).some((name) => validated[0].includes(name) && name.startsWith("aof-hyperplan-")), "the temporary checkout is removed");
    })
  },
  {
    name: "integration-hyperagent/check: an unsafe branch is refused before git runs, and a missing branch is a coded failure",
    run: async () => withDir(async (dir) => {
      const calls = [];
      await assert.rejects(checkPlanBranch({ projectRoot: dir, branch: "--upload-pack=evil", base: "main", workDir: "wiki/work", gitExec: async (args) => { calls.push(args); return { status: 0, stdout: "", stderr: "" }; }, validateAt: async () => [] }), (error) => error.code === "hyperagent-branch-invalid");
      assert.deepEqual(calls, []);
      const clone = await planRemote(dir, { "wiki/work/a.md": "a\n" });
      await assert.rejects(checkPlanBranch({ projectRoot: clone, branch: "aof/plan/absent", base: "main", workDir: "wiki/work", gitExec: (args, options) => git(args, options.cwd, options.env), validateAt: async () => [] }), (error) => error.code === "hyperagent-fetch-failed");
    })
  },
  {
    name: "integration-hyperagent/doctor: MCP registration is found in .mcp.json, ~/.claude.json and Codex config.toml; hints name the missing steps",
    run: async () => withDir(async (dir) => {
      const project = path.join(dir, "project");
      const home = path.join(dir, "home");
      await mkdir(project, { recursive: true });
      await mkdir(path.join(home, ".codex"), { recursive: true });
      const empty = await inspectHyperagentSetup({ projectRoot: project, config: {}, homeDir: home });
      assert.equal(empty.ready, false);
      assert.equal(empty.claude.registered, false);
      assert.ok(empty.hints.some((hint) => hint.includes("claude mcp add --transport http hyperagent https://hyperagent.com/api/mcp")));
      assert.ok(empty.hints.some((hint) => hint.includes("Enable the integration") && hint.includes("aof work update")), "169/ADR-005: the missing block is named");
      assert.ok(empty.hints.every((hint) => !/--runtime[^`]*hyperagent/.test(hint)), "no hint names hyperagent as a runtime");
      const enabledNoSkills = await inspectHyperagentSetup({ projectRoot: project, config: { work: { integrations: { hyperagent: {} } } }, homeDir: home });
      assert.ok(enabledNoSkills.hints.some((hint) => hint.includes("Import from GitHub") && hint.includes("aof work update")));

      await writeFile(path.join(project, ".mcp.json"), JSON.stringify({ mcpServers: { ha: { type: "http", url: "https://hyperagent.com/api/mcp" } } }));
      await writeFile(path.join(home, ".codex", "config.toml"), '[mcp_servers.hyper]\nurl = "https://hyperagent.com/api/mcp"\n');
      await mkdir(path.join(project, ".hyperagent", "skills", "aof-prd"), { recursive: true });
      await writeFile(path.join(project, ".hyperagent", "skills", "aof-prd", "SKILL.md"), "---\nname: aof-prd\n---\n");
      assert.equal((await inspectHyperagentSetup({ projectRoot: project, config: {}, homeDir: home })).ready, false, "not ready while the integration is off");
      const ready = await inspectHyperagentSetup({ projectRoot: project, config: { work: { integrations: { hyperagent: {} } } }, homeDir: home });
      assert.equal(ready.ready, true);
      assert.deepEqual(ready.claude, { registered: true, name: "ha", source: ".mcp.json" });
      assert.deepEqual(ready.codex, { registered: true, name: "hyper", source: "~/.codex/config.toml" });
      assert.deepEqual(ready.skills, ["aof-prd"]);
      assert.equal(codexServerName('[mcp_servers.other]\nurl = "https://example.com"\n[mcp_servers."ha"]\nurl="https://hyperagent.com/api/mcp"'), "ha");
      assert.equal(codexServerName('[mcp_servers.x]\ncommand = "hyperagent.com/api/mcp"\n'), null);
    })
  },
  {
    name: "integration-hyperagent/commands: the contribution registers brief, result, check and doctor under `aof work integrations hyperagent`",
    run: async () => {
      const commands = contribution.commands({ commandError: (message, code) => Object.assign(new Error(message), { code }), gitExec: async () => ({ status: 1, stdout: "", stderr: "" }), validateWork: async () => [], readJson: async () => ({}) });
      assert.deepEqual(commands.map((command) => command.id), ["hyperagent:brief", "hyperagent:result", "hyperagent:check", "hyperagent:doctor"]);
      for (const command of commands) assert.deepEqual(command.cli.route.slice(0, 3), ["work", "integrations", "hyperagent"]);
      const briefCommand = commands[0];
      const ctx = { workspace: { projectRoot: "/r", workDir: "/r/wiki/work", config: {} } };
      await assert.rejects(briefCommand.run({ mode: "plan", request: "x" }, ctx), (error) => error.code === "hyperagent-repo-unresolved");
      const result = await briefCommand.run({ mode: "plan", request: "Add SSO", repo: "acme/widgets", base: "main" }, ctx);
      assert.equal(result.repo, "acme/widgets");
      assert.equal(result.branch, "aof/plan/add-sso");
      await assert.rejects(briefCommand.run({ mode: "plan", request: "x", repo: "nope" }, ctx), (error) => error.code === "hyperagent-repo-invalid");
    }
  }
];
