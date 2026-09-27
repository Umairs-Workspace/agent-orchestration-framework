// diagram:plan — `aof diagram plan <ref> <ADR-NNN> --slug <slug>` (milestone 133, ADR-004 §2).
// The architect's prose never knows which tool draws or whether drawing is on: it asks this
// command and follows the answer. Three answers, all exit 0 —
//   off                → { enabled: false, reason }
//   generator missing  → { enabled: true, available: false, code, fix }
//   the plan           → { enabled: true, available: true, generator, item, adr, stem, paths, brief, instructions }
// — and a malformed request is a coded REFUSAL, because it is the caller's bug.
//
// THE CHECK ORDER IS THE CONTRACT (task 03, ruling 2): ref → off → ADR id → ADR heading → brief →
// slug → delivered → style → generator. Off answers before any ADR check, so a project with
// diagrams off never sees a refusal about an ADR it was not going to draw.
//
// IT WRITES NOTHING — not even the `diagrams/` folder. Creating it is the drawing agent's first
// write, so an unused plan leaves the tree clean.
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { commandError } from "../../command-error.mjs";
import { resolveWorkDiagrams } from "../../config-inspect.mjs";
import { generatorFor } from "../../diagrams/generators.mjs";
import { assertAdrId, assertSlug, diagramPaths, diagramStem, hasAdrSection, readDiagramBrief } from "../../diagrams/layout.mjs";
import { requireLocalCheckout, resolveItemExact } from "../resolve.mjs";

// Why diagrams are off, in the operator's terms: unset, switched off, or a config that does not
// validate (the resolver answers off for all three; only the reason differs).
function offReason(config) {
  const raw = config?.work?.diagrams;
  if (raw === undefined) return "work.diagrams is unset, so diagrams are off for this project.";
  if (raw?.generator === "off") return 'work.diagrams.generator is "off", so diagrams are off for this project.';
  return "work.diagrams does not validate (run `aof project validate`), so diagrams are off until it does.";
}

async function readArchitecture(itemDir) {
  try {
    return await readFile(path.join(itemDir, "ARCHITECTURE.md"), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}

const toPosix = (value) => value.replace(/\\/g, "/");

export const diagramPlanCommand = {
  id: "diagram:plan",
  input: {
    type: "object",
    properties: {
      ref: { type: "string" },
      adr: { type: "string" },
      slug: { type: "string" },
    },
    required: ["ref", "adr"],
    additionalProperties: false,
  },

  async run(input, ctx) {
    const { projectRoot, config } = ctx.workspace;
    const ref = typeof input.ref === "string" ? input.ref.trim() : "";
    const item = await resolveItemExact(ctx, ref);
    if (!item) throw commandError(`No item resolves to ref "${ref}".`, "ref-not-found", 404);

    const diagrams = resolveWorkDiagrams(config);
    if (!diagrams.enabled) return { enabled: false, reason: offReason(config) };

    requireLocalCheckout(item, ref);
    assertAdrId(input.adr);
    const architecture = await readArchitecture(item.dir);
    if (!hasAdrSection(architecture, input.adr)) {
      throw commandError(`${item.ref} has no "## ${input.adr}" heading in its ARCHITECTURE.md.`, "diagram-adr-unknown", 404);
    }
    const brief = readDiagramBrief(architecture, input.adr);
    if (brief == null) {
      throw commandError(
        `${input.adr} carries no "### Diagram" brief. The brief is the ADR's own statement of what to draw — write it first.`,
        "diagram-brief-missing",
        422,
      );
    }
    assertSlug(input.slug);
    if (item.status === "done") {
      throw commandError(`${item.ref} is done, and a delivered ADR's diagram is immutable — a changed design is a new ADR.`, "diagram-item-delivered", 409);
    }
    const styleAbs = diagrams.style == null ? null : path.resolve(projectRoot, diagrams.style);
    if (styleAbs != null && !existsSync(styleAbs)) {
      throw commandError(`work.diagrams.style names ${diagrams.style}, which does not exist.`, "diagram-style-missing", 422);
    }

    const generator = generatorFor(diagrams.generator);
    const located = generator.locate({ home: os.homedir() });
    if (!located.ok) return { enabled: true, available: false, code: located.code, fix: located.fix };

    const stem = diagramStem(input.adr, input.slug);
    const paths = diagramPaths(toPosix(path.relative(projectRoot, item.dir)), stem, generator.sourceExt, diagrams.formats);
    const absolute = Object.fromEntries(Object.entries(paths).map(([key, value]) => [key, path.resolve(projectRoot, value)]));
    return {
      enabled: true,
      available: true,
      generator: generator.id,
      item: item.ref,
      adr: input.adr,
      stem,
      paths,
      brief,
      instructions: generator.instructions({ brief, paths: absolute, style: styleAbs, skill: located.skill }),
    };
  },

  cli: {
    route: ["diagram", "plan"],
    spec: {
      usage: "aof diagram plan <ref> <ADR-NNN> --slug <slug> [--json]",
      flags: {
        slug: { type: "string", description: "the diagram's slug — its stem is ADR-NNN-<slug>" },
      },
    },

    argv: (positionals, options = {}) => ({
      ref: positionals[0],
      adr: positionals[1],
      ...(typeof options.slug === "string" ? { slug: options.slug } : {}),
    }),

    render(result) {
      if (!result.enabled) return `diagrams off — ${result.reason}`;
      if (!result.available) return `diagram generator missing (${result.code}) — ${result.fix}`;
      return [
        `${result.item} ${result.adr} — draw ${result.stem} with ${result.generator}`,
        `  source: ${result.paths.source}`,
        `  svg:    ${result.paths.svg}`,
        ...(result.paths.png ? [`  png:    ${result.paths.png}`] : []),
        "",
        result.instructions,
      ].join("\n");
    },

    json: (result) => result,
  },
};
