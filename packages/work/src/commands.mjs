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
  "work:resync-board",
  "work:board-access",
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

export const boardResyncCommand = {
  id: "work:resync-board",
  input: {
    type: "object",
    properties: { ref: { type: "string", minLength: 1 } },
    required: ["ref"],
    additionalProperties: false,
  },
  async run(input, ctx) {
    const { resyncBoardOnRequest } = await import("./commands/board-resync.mjs");
    return resyncBoardOnRequest(input, ctx);
  },
  cli: {
    route: ["work", "resync-board"],
    spec: {
      usage: "aof work resync-board <ref> [--json]",
      flags: {},
    },
    argv: positionals => ({ ref: positionals[0] ?? "" }),
    json: result => result,
    render(result) {
      if (result.skipped) return "Resync skipped in local file mode.";
      if (result.reason === "no-conflict") return `${result.ref} has no recorded board conflict; nothing was written.`;
      if (result.reason === "not-linked") return `${result.ref} is not linked to a board item; nothing was written.`;
      return `${result.ref} resynced: board ID ${result.id} verified at revision ${result.revision}.`;
    },
    exit: () => 0,
  },
};

export const boardAccessCommand = {
  id: "work:board-access",
  input: { type: "object", properties: {}, additionalProperties: false },
  async run(input, ctx) {
    const { probeBoardAccess } = await import("./commands/board-access.mjs");
    return probeBoardAccess(input, ctx);
  },
  cli: {
    route: ["work", "board-access"],
    spec: {
      usage: "aof work board-access [--json]",
      flags: {},
    },
    argv: () => ({}),
    json: result => result,
    render(result) {
      if (result.skipped === "local-file-mode") return "Board access not checked: this workspace keeps its tracking in files.";
      if (result.skipped === "no-access-probe") return `Board access not checked: ${result.manifest} declares no access probe.`;
      if (result.ok) return `Board access verified for ${result.manifest}.`;
      return `Board access failed at ${result.stage} for ${result.manifest ?? "the selected board"}${result.code ? ` (${result.code})` : ""}: ${result.message}`;
    },
    exit: result => result.ok ? 0 : 1,
  },
};
