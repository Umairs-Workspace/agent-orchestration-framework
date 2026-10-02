// Work owns these operations; namespaces are shared with other packages through core's registry.
export const WORK_COMMAND_IDS = Object.freeze([
  "migrate:folder",
  "diagram:plan",
  "diagram:export",
  "diagram:file",
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
  "work:find",
  "work:observe",
  "work:insert-milestone",
  "work:insert-uat",
  "work:insert-story",
  "work:insert-chore",
  "work:promote",
  "work:archive",
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
