// Work owns these operations; namespaces are shared with other packages through core's registry.
export const WORK_COMMAND_IDS = Object.freeze([
  "migrate:folder",
  "work:list",
  "work:continue",
  "work:refine",
  "work:verify",
  "work:debt",
  "work:doc",
  "work:tasks",
  "work:validate",
  "work:next",
  "work:feedback",
  "work:doctor",
  "work:audit",
  "work:acceptor",
  "work:tune",
  "work:grade",
  "work:ratchet",
  "work:counters",
  "test",
  "work:run-start",
  "work:run-complete",
  "work:run-status",
  "work:status",
  "work:regression-gate",
  "work:run-retry",
  "work:resume",
  "work:answer",
  "work:questions",
  "work:find",
  "work:observe",
  "work:insert-milestone",
  "work:insert-uat",
  "work:insert-story",
  "work:insert-chore",
  "work:prototype",
  "work:promote",
  "work:archive",
  "work:publish-board",
  "work:renumber",
  "work:promote-gap",
  "work:promote-finding",
  "work:upgrade"
]);
const owned = new Set(WORK_COMMAND_IDS);

// Ordered groups let core preserve the existing command/help order during migration.
// The shared registry checks duplicate IDs and routes across all contributions.
export function createWorkContribution(commands) {
  if (!Array.isArray(commands) || commands.length === 0) {
    throw new TypeError("Work contribution requires a non-empty command array.");
  }
  for (const command of commands) {
    if (!owned.has(command?.id) || typeof command.run !== "function") {
      throw new TypeError("Command is not owned by work: " + String(command?.id));
    }
  }
  return Object.freeze({ name: "@aof/work", commands: Object.freeze([...commands]) });
}

export const boardPublishCommand = {
  id: "work:publish-board",
  input: {
    type: "object",
    properties: {
      ref: { type: "string", minLength: 1 },
      refinementComplete: { type: "boolean" },
      descendants: { type: "boolean" },
    },
    required: ["ref"],
    additionalProperties: false,
  },
  async run(input, ctx) {
    const { publishAtRefinementClose } = await import("./commands/board-publish.mjs");
    return publishAtRefinementClose(input, ctx);
  },
  cli: {
    route: ["work", "publish-board"],
    spec: {
      usage: "aof work publish-board <ref> --refinement-complete [--descendants] [--json]",
      flags: {
        refinementComplete: { type: "boolean", description: "publish after successful refinement, or retry that publication" },
        descendants: { type: "boolean", description: "include children whose refinement completed in the same cascade" },
      },
    },
    argv: (positionals, options) => ({
      ref: positionals[0] ?? "",
      refinementComplete: options.refinementComplete === true,
      descendants: options.descendants === true,
    }),
    json: result => result,
    render(result) {
      if (result.skipped) return "Publication skipped in local file mode.";
      return result.results.map(row => [
        row.ref, row.outcome, row.id == null ? null : "board ID " + row.id, row.code,
      ].filter(Boolean).join(" ")).join("\n");
    },
    exit: result => result.published || result.skipped ? 0 : 1,
  },
};
