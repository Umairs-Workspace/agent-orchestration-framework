import { issueError, logIssue, listIssues, removeIssue } from "../issues.mjs";

function positional(args, count) {
  if (args.length !== count) throw issueError(count ? "Supply exactly one quoted summary or issue ID; see --help." : "aof issues list takes no positional arguments.");
  return args[0];
}
export const issuesCommands = [
  {
    id: "issues:log",
    input: { type: "object", properties: { summary: { type: "string" }, details: { type: "string" } }, required: ["summary"], additionalProperties: false },
    run: async (input, ctx) => logIssue(input, ctx),
    cli: {
      route: ["issues", "log"],
      spec: { workspace: false, usage: "aof issues log <summary> [--details <text>] [--json]", flags: { details: { type: "string", description: "reproduction steps or additional context" } } },
      argv: (args, options = {}) => ({ summary: positional(args, 1), ...(options.details !== undefined ? { details: options.details } : {}) }),
      json: result => result,
      render: issue => "Logged " + issue.id + ": " + issue.summary,
    },
  },
  {
    id: "issues:list",
    input: { type: "object", properties: {}, additionalProperties: false },
    run: async (_input, ctx) => listIssues(ctx),
    cli: {
      route: ["issues", "list"],
      spec: { workspace: false, usage: "aof issues list [--json]", flags: {} },
      argv: args => { positional(args, 0); return {}; },
      json: result => result,
      render: issues => issues.length ? issues.map(issue => [issue.id + "  " + issue.createdAt + "  " + issue.summary, "  From: " + issue.cwd, ...(issue.details ? ["  " + issue.details.replaceAll("\n", "\n  ")] : [])].join("\n")).join("\n\n") : "No issues logged.",
    },
  },
  {
    id: "issues:remove",
    input: { type: "object", properties: { id: { type: "string" } }, required: ["id"], additionalProperties: false },
    run: async (input, ctx) => removeIssue(input.id, ctx),
    cli: {
      route: ["issues", "remove"],
      spec: { workspace: false, usage: "aof issues remove <id> [--json]", flags: {} },
      argv: args => ({ id: positional(args, 1) }),
      json: result => result,
      render: result => "Removed " + result.id + ".",
    },
  },
];
