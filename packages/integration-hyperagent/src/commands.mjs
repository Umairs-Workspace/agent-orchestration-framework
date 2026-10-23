// The Hyperagent CLI contribution — `aof work integrations hyperagent <verb>`, the deterministic half
// of `/aof:hyperplan`. The procedure (a bundle command) drives Hyperagent over MCP; these verbs do the
// parts that must not be improvised: compose the brief, read the planner's result back, check the
// plan branch in a throwaway checkout, and report whether the setup is in place.
//
// Collaborators are injected by core (commandError, git, the work validator), so the package owns the
// schema, argv, behaviour and rendering and spawns nothing itself. Ids take the `hyperagent:` prefix:
// like `notion:*` they are outside the /api/work bijection and inside the generic CLI bijection.
//
// Only the descriptors load with the registry: each verb imports its implementation when it RUNS, so
// a CLI path that never touches Hyperagent (FF-16004's per-verb module ceiling) pays nothing for it.
import path from "node:path";

// The modes, inline rather than imported from ./brief.mjs, so the input schema costs no module load.
// brief.mjs's PLAN_MODES is the source; the package suite asserts the two agree.
export const BRIEF_MODES = Object.freeze(["plan", "prd", "shatter", "refine"]);
const PLAN_MODES = BRIEF_MODES;

const lazy = {
  config: () => import("./config.mjs"),
  brief: () => import("./brief.mjs"),
  result: () => import("./plan-result.mjs"),
  check: () => import("./check.mjs"),
  doctor: () => import("./doctor.mjs")
};

const ROUTE = ["work", "integrations", "hyperagent"];
const PREFIX = "aof work integrations hyperagent";

function relativeWorkDir(workspace) {
  const relative = path.relative(workspace.projectRoot, workspace.workDir).replaceAll("\\", "/");
  return relative === "" ? "." : relative;
}

function asError(commandError, error) {
  return error?.code && /^hyperagent-/.test(error.code) ? commandError(error.message, error.code, 400) : error;
}

export function createHyperagentCommands({ commandError, gitExec, validateWork, readJson }) {
  async function remoteRepo(projectRoot) {
    const { parseGitRemote } = await lazy.brief();
    const result = await gitExec(["remote", "get-url", "origin"], { cwd: projectRoot }).catch(() => null);
    return result?.status === 0 ? parseGitRemote(result.stdout) : null;
  }

  async function defaultBase(projectRoot) {
    const result = await gitExec(["symbolic-ref", "--short", "refs/remotes/origin/HEAD"], { cwd: projectRoot }).catch(() => null);
    const name = result?.status === 0 ? result.stdout.trim().replace(/^origin\//, "") : "";
    return name || "main";
  }

  // `aof work validate` over another checkout: its own config, its own work dir.
  async function validateAt(dir) {
    let config = {};
    try { config = await readJson(path.join(dir, ".aof", "aof.config.json")); } catch { config = {}; }
    const workDir = path.resolve(dir, config?.work?.dir ?? "./wiki/work");
    return validateWork(workDir, config, undefined, { projectRoot: dir });
  }

  const briefCommand = {
    id: "hyperagent:brief",
    input: {
      type: "object",
      properties: {
        mode: { type: "string", enum: [...PLAN_MODES] },
        target: { type: "string" },
        request: { type: "string" },
        repo: { type: "string" },
        base: { type: "string" }
      },
      required: ["mode"],
      additionalProperties: false
    },
    async run(input, ctx) {
      const workspace = ctx.workspace;
      const [{ readHyperagentConfig }, { composeBrief }] = await Promise.all([lazy.config(), lazy.brief()]);
      const settings = readHyperagentConfig(workspace.config).value;
      let repo = null;
      if (input.repo) {
        const [owner, name, extra] = String(input.repo).split("/");
        if (!owner || !name || extra !== undefined) throw commandError(`--repo must be <owner>/<name>, got "${input.repo}".`, "hyperagent-repo-invalid", 400);
        repo = { owner, repo: name };
      } else {
        repo = await remoteRepo(workspace.projectRoot);
      }
      const baseBranch = input.base ?? settings.baseBranch ?? await defaultBase(workspace.projectRoot);
      try {
        return {
          repo: repo ? `${repo.owner}/${repo.repo}` : null,
          baseBranch,
          ...composeBrief({
            mode: input.mode,
            request: input.request,
            target: input.target,
            repo,
            baseBranch,
            workDir: relativeWorkDir(workspace),
            tags: workspace.config?.work?.tags ?? {},
            settings
          }),
          maxMinutes: settings.maxMinutes,
          pollSeconds: settings.pollSeconds
        };
      } catch (error) {
        throw asError(commandError, error);
      }
    },
    cli: {
      route: [...ROUTE, "brief"],
      spec: {
        usage: `${PREFIX} brief <${PLAN_MODES.join("|")}> [target] [--request <text>] [--repo <owner/name>] [--base <branch>] [--json]`,
        flags: {
          request: { type: "string", description: "the operator's request, verbatim" },
          repo: { type: "string", description: "the GitHub repository (default: the origin remote)" },
          base: { type: "string", description: "the base branch (default: work.integrations.hyperagent.baseBranch, then origin's HEAD)" }
        }
      },
      argv: (positionals, options = {}) => {
        if (positionals[0] == null) throw commandError(`Usage: ${PREFIX} brief <${PLAN_MODES.join("|")}> [target] [--request <text>]`, "usage", 400);
        return {
          mode: positionals[0],
          ...(positionals[1] != null ? { target: positionals[1] } : {}),
          ...(options.request != null ? { request: String(options.request) } : {}),
          ...(options.repo != null ? { repo: String(options.repo) } : {}),
          ...(options.base != null ? { base: String(options.base) } : {})
        };
      },
      render: (result) => [
        `Brief for the Hyperagent agent "${result.agent}" — mode ${result.mode}, ${result.repo} from ${result.baseBranch}, plan branch ${result.branch}.`,
        "",
        result.message.trimEnd()
      ].join("\n"),
      json: (result) => result
    }
  };

  const resultCommand = {
    id: "hyperagent:result",
    input: {
      type: "object",
      properties: { file: { type: "string" } },
      required: ["file"],
      additionalProperties: false
    },
    async run(input, ctx) {
      const [{ readHyperagentConfig }, { parsePlanResult }, { readFile }] = await Promise.all([lazy.config(), lazy.result(), import("node:fs/promises")]);
      const settings = readHyperagentConfig(ctx.workspace.config).value;
      let text;
      try {
        text = await readFile(path.resolve(ctx.workspace.projectRoot, input.file), "utf8");
      } catch {
        throw commandError(`Cannot read the planner's message from "${input.file}".`, "hyperagent-result-unreadable", 400);
      }
      return parsePlanResult(text, { branchPrefix: settings.branchPrefix });
    },
    cli: {
      route: [...ROUTE, "result"],
      spec: { usage: `${PREFIX} result <file> [--json]`, flags: {} },
      argv: (positionals) => {
        if (positionals[0] == null) throw commandError(`Usage: ${PREFIX} result <file>`, "usage", 400);
        return { file: positionals[0] };
      },
      render: (result) => [
        `Planner result: ${result.status}${result.found ? "" : " (no result block — read from the text)"}.`,
        `  pull request: ${result.pr?.url ?? "none found"}`,
        `  branch: ${result.branch ?? "none found"}`,
        ...(result.openQuestions != null ? [`  open questions: ${result.openQuestions}`] : [])
      ].join("\n"),
      json: (result) => result,
      exit: (result) => (result.status === "delivered" && result.branch ? 0 : 1)
    }
  };

  const checkCommand = {
    id: "hyperagent:check",
    input: {
      type: "object",
      properties: {
        branch: { type: "string" },
        base: { type: "string" },
        remote: { type: "string" }
      },
      required: ["branch"],
      additionalProperties: false
    },
    async run(input, ctx) {
      const workspace = ctx.workspace;
      const [{ readHyperagentConfig }, { checkPlanBranch }] = await Promise.all([lazy.config(), lazy.check()]);
      const settings = readHyperagentConfig(workspace.config).value;
      try {
        return await checkPlanBranch({
          projectRoot: workspace.projectRoot,
          branch: input.branch,
          base: input.base ?? settings.baseBranch ?? await defaultBase(workspace.projectRoot),
          remote: input.remote ?? "origin",
          workDir: relativeWorkDir(workspace),
          gitExec,
          validateAt
        });
      } catch (error) {
        throw asError(commandError, error);
      }
    },
    cli: {
      route: [...ROUTE, "check"],
      spec: {
        usage: `${PREFIX} check <branch> [--base <branch>] [--remote <name>] [--json]`,
        flags: {
          base: { type: "string", description: "the branch the plan was cut from" },
          remote: { type: "string", description: "the remote holding the plan branch (default origin)" }
        }
      },
      argv: (positionals, options = {}) => {
        if (positionals[0] == null) throw commandError(`Usage: ${PREFIX} check <branch>`, "usage", 400);
        return {
          branch: positionals[0],
          ...(options.base != null ? { base: String(options.base) } : {}),
          ...(options.remote != null ? { remote: String(options.remote) } : {})
        };
      },
      render(result) {
        const verdict = result.pass && result.outOfLane.length === 0 ? "PASS" : "ATTENTION";
        return [
          `${verdict} — plan branch ${result.branch} at ${result.commit.slice(0, 12)} (against ${result.base}): ${result.changed.length} file(s) changed.`,
          ...(result.findings.length > 0 ? [`aof work validate: ${result.findings.length} issue(s):`, ...result.findings.map((finding) => `  ${finding.path} — ${finding.problem}`)] : ["aof work validate: PASS."]),
          ...(result.outOfLane.length > 0 ? ["Outside the planning lane (a plan branch should hold work records and planning docs only):", ...result.outOfLane.map((file) => `  ${file}`)] : []),
          "Your checkout was not touched; the branch was checked in a temporary directory."
        ].join("\n");
      },
      json: (result) => result,
      exit: (result) => (result.pass && result.outOfLane.length === 0 ? 0 : 1)
    }
  };

  const doctorCommand = {
    id: "hyperagent:doctor",
    input: { type: "object", properties: {}, additionalProperties: false },
    async run(_input, ctx) {
      const { inspectHyperagentSetup } = await lazy.doctor();
      return inspectHyperagentSetup({ projectRoot: ctx.workspace.projectRoot, config: ctx.workspace.config });
    },
    cli: {
      route: [...ROUTE, "doctor"],
      spec: { usage: `${PREFIX} doctor [--json]`, flags: {} },
      argv: () => ({}),
      render: (result) => [
        `Hyperagent planning: ${result.ready ? "ready" : "not ready yet"}.`,
        `  Claude Code MCP: ${result.claude.registered ? `registered as "${result.claude.name}" (${result.claude.source})` : "not registered"}`,
        `  Codex MCP: ${result.codex.registered ? `registered as "${result.codex.name}" (${result.codex.source})` : "not registered"}`,
        `  Planner skills in .hyperagent/skills: ${result.skills.length > 0 ? result.skills.join(", ") : "none"}`,
        `  Planner agent: "${result.config.value.agent}"; poll every ${result.config.value.pollSeconds}s for at most ${result.config.value.maxMinutes} min.`,
        ...result.hints.map((hint) => `  → ${hint}`)
      ].join("\n"),
      json: (result) => result
    }
  };

  return { briefCommand, resultCommand, checkCommand, doctorCommand };
}
