// diagram:capability — `aof diagram capability [--json]`: what diagramming this project offers,
// read through THE ONE READER of `work.diagrams` (core's `resolveWorkDiagrams`, injected). It is
// the opt-out seam's answer: the board asks it ONCE before showing Edit draft, and hides the
// control — fetching nothing, loading no editor chunk — when the editor is off.
//
// Two tiers, one answer. With diagrams OFF by config (`work.diagrams` unset, off or invalid),
// `enabled` is false and so is `editor`. With the package ABSENT from the build, there is no
// command at all: the board face answers the same shape with `absent: true` when the registry
// does not know this id, so the board needs no second code path for "not installed".
//
// The editor follows the generator switch on purpose: a project that has turned diagrams off has
// said it does not draw, and a draft editor that quietly stays on would be a second switch.
export function createDiagramCapabilityCommand({ resolveWorkDiagrams }) {
  const diagramCapabilityCommand = {
    id: "diagram:capability",
    input: { type: "object", properties: {}, additionalProperties: false },

    async run(_input, ctx) {
      const owed = resolveWorkDiagrams(ctx?.workspace?.config ?? {});
      return { absent: false, enabled: owed.enabled === true, editor: owed.enabled === true, generator: owed.generator ?? "off" };
    },

    cli: {
      route: ["diagram", "capability"],
      spec: { usage: "aof diagram capability [--json]" },
      argv: () => ({}),
      render: (result) => (result.editor ? `diagrams on (${result.generator}); the draft editor is available` : "diagrams off; the draft editor is hidden"),
      json: (result) => result,
    },
  };
  return { diagramCapabilityCommand };
}
