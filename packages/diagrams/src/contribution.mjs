// THE DIAGRAMS CONTRIBUTION — the one object core registers for this package, in the shape every
// package contribution takes (`{ name, commands }`, frozen; see @aof/work's and
// @aof/integration-notion's). The diagram verbs used to ride @aof/work's contribution; they now ride
// their own, so that core composes diagramming as ONE unit it can leave out.
//
// Dependencies run one way: this package imports @aof/work (item discovery, records, the declared-id
// grammar, the acceptance horizon) and @aof/work imports nothing of this package. @aof/work's doctor
// reaches the diagrams lane only through its injected `diagramsGroup` / `diagramListing` seams, and
// core composes the two (the FF-13501 shape, applied to diagrams).
export const DIAGRAM_COMMAND_IDS = Object.freeze([
  "diagram:plan",
  "diagram:export",
  "diagram:file",
  "diagram:scene",
  "diagram:capability",
]);
const owned = new Set(DIAGRAM_COMMAND_IDS);

export function createDiagramsContribution(commands) {
  if (!Array.isArray(commands) || commands.length === 0) {
    throw new TypeError("Diagrams contribution requires a non-empty command array.");
  }
  for (const command of commands) {
    if (!owned.has(command?.id) || typeof command.run !== "function") {
      throw new TypeError("Command is not owned by diagrams: " + String(command?.id));
    }
  }
  return Object.freeze({ name: "@aof/diagrams", commands: Object.freeze([...commands]) });
}
