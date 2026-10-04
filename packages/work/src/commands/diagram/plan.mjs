import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { commandError } from "@aof/contracts/error";


import { assertAdrId, assertSlug, diagramPaths, diagramStem, hasAdrSection, LOOP_SUBJECT, loopDiagramPaths, readDiagramBrief } from "../../diagrams/layout.mjs";
import { listItems } from "../../discovery.mjs";
import { readItemMeta } from "../../records.mjs";


export function createDiagramPlanCommand({ resolveWorkDiagrams, generatorFor, requireLocalCheckout, resolveItemExact, planLoopWaves, loopLaneBound, loopConcurrency, refineFirst }) {

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
// AN ADR PLAN WRITES NOTHING — not even the `diagrams/` folder. Creating it is the drawing agent's
// first write, so an unused plan leaves the tree clean. (The `loop` subject below is the one
// exception: its plan is aof's own data, written to `execution/` before the drawing step.)






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

// ───────────────────────────────────────────── the loop subject (145) ────
//
// `aof diagram plan <ref> loop` — the milestone's planned waves, drawn by the same engine as an
// ADR diagram. THE CHECK ORDER IS THE CONTRACT (145 task 01): ref → item type → concurrency mode →
// refined → write the plan → off → generator → instructions. Every stop before the plan is written
// leaves the tree as it was; the plan itself is aof's own data, so it is written even when the
// drawing step cannot run, and a re-run overwrites it.

// The loop's own refined test (its `unrefinedStories`): every not-done story has at least one task,
// read the way `work:tasks` reads them — the `.feature` files in the story's `tasks/`.
async function unrefinedStories(workDir, milestone) {
  // A story's ref is its milestone's ref and its own number (`07/01`), and refs sort in stream order.
  const stories = (await listItems(workDir))
    .filter((item) => item.type === "story" && String(item.ref).startsWith(`${milestone.ref}/`))
    .sort((a, b) => String(a.ref).localeCompare(String(b.ref)));
  const unrefined = [];
  for (const story of stories) {
    if ((await readItemMeta(story)).status === "done") continue;
    if (!(await taskNames(story.dir)).some((name) => name.endsWith(".feature"))) unrefined.push(story.ref);
  }
  return { count: stories.length, unrefined };
}

async function taskNames(storyDir) {
  try {
    return await readdir(path.join(storyDir, "tasks"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

const HELD_BECAUSE = {
  "files-overlap": (held) => `its files: overlap ${held.overlaps.join(", ")}`,
  "write-set-unknown": () => "it declares no usable files:, so it can only run alone",
  "after-unknown": () => "a story with no usable files: runs alone in this wave",
};

// The drawing brief, built from the plan: one line per wave, then what was held and why, the
// depends edges, the lane bound and the plan's one stated assumption.
function loopBrief(plan) {
  const member = (story) => [
    `${story.ref} ${story.slug}`,
    ...(story.built ? [`[built — ${story.status}]`] : []),
    ...(story.waitsForLane ? ["[waits for a free lane]"] : []),
  ].join(" ");
  const lines = [
    `The loop plan for milestone ${plan.item}: the waves its stories build in under work.loop.concurrency "${refineFirst}".`,
    "Draw one column per wave, left to right, each wave's stories stacked inside it. Fill the stories already built with the style guide's `done` role (green) so they read as finished, draw a held story or one waiting for a lane visibly distinct from the stories that build, and draw the depends edges as arrows between stories.",
    "",
  ];
  for (const wave of plan.waves) {
    lines.push(`Wave ${wave.wave}: ${wave.members.map(member).join(", ")}`);
    for (const held of wave.held) lines.push(`  held out of wave ${wave.wave}: ${held.ref} — ${(HELD_BECAUSE[held.reason] ?? (() => held.reason))(held)}`);
  }
  if (plan.unplanned.length > 0) lines.push(`Never reached (a depends cycle): ${plan.unplanned.join(", ")}`);
  lines.push(
    "",
    `Depends edges: ${plan.edges.length === 0 ? "none" : plan.edges.map((edge) => `${edge.from} -> ${edge.to}`).join(", ")}`,
    `Lane bound: ${plan.bound == null ? "unbounded" : `${plan.bound} concurrent lanes`}`,
    `State this on the diagram: ${plan.assumption}`,
  );
  return lines.join("\n");
}

async function planLoop(item, ref, ctx) {
  const { projectRoot, config, workDir } = ctx.workspace;
  if (item.type !== "milestone") {
    throw commandError(`${item.ref} is a ${item.type}, not a milestone. A single item runs in one lane, so it has no waves to draw.`, "loop-not-a-milestone", 409);
  }
  const mode = loopConcurrency(ctx.workspace);
  if (mode !== refineFirst) {
    throw commandError(
      `work.loop.concurrency is "${mode}", not "${refineFirst}". Only "${refineFirst}" refines a milestone before it builds, so only it has an upfront wave plan to draw.`,
      "loop-not-refine-first",
      409,
    );
  }
  requireLocalCheckout(item, ref);
  const { count, unrefined } = await unrefinedStories(workDir, item);
  if (count === 0) {
    throw commandError(`${item.ref} has no stories, so it is not refined and has no waves to draw. Run aof:refine ${item.ref} first.`, "loop-not-refined", 409);
  }
  if (unrefined.length > 0) {
    throw commandError(
      `${unrefined.join(", ")} ${unrefined.length === 1 ? "has" : "have"} no tasks, so ${item.ref} is not refined. Run ${unrefined.map((story) => `aof:refine ${story}`).join(", ")} first.`,
      "loop-not-refined",
      409,
    );
  }

  const plan = await planLoopWaves(workDir, item.ref, { projectRoot, bound: loopLaneBound(ctx.workspace) });
  const itemRel = toPosix(path.relative(projectRoot, item.dir));
  const planPath = loopDiagramPaths(itemRel, null).plan;
  await mkdir(path.dirname(path.resolve(projectRoot, planPath)), { recursive: true });
  await writeFile(path.resolve(projectRoot, planPath), `${JSON.stringify(plan, null, 2)}\n`, "utf8");

  const diagrams = resolveWorkDiagrams(config);
  if (!diagrams.enabled) return { enabled: false, reason: offReason(config), item: item.ref, plan: planPath };
  const generator = generatorFor(diagrams.generator);
  const styleAbs = diagrams.style == null ? null : path.resolve(projectRoot, diagrams.style);
  const located = generator.locate({ home: os.homedir() });
  if (!located.ok) return { enabled: true, available: false, code: located.code, fix: located.fix, item: item.ref, plan: planPath };

  const paths = loopDiagramPaths(itemRel, generator.sourceExt);
  const absolute = Object.fromEntries(Object.entries(paths).map(([key, value]) => [key, path.resolve(projectRoot, value)]));
  const brief = loopBrief(plan);
  return {
    enabled: true,
    available: true,
    generator: generator.id,
    item: item.ref,
    subject: LOOP_SUBJECT,
    paths,
    brief,
    instructions: generator.instructions({ brief, paths: absolute, style: styleAbs != null && existsSync(styleAbs) ? styleAbs : null, skill: located.skill }),
  };
}

const diagramPlanCommand = {
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
    if (input.adr === LOOP_SUBJECT) return await planLoop(item, ref, ctx);

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
      usage: "aof diagram plan <ref> <ADR-NNN> --slug <slug> [--json]\n       aof diagram plan <milestone ref> loop [--json]",
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
      const planned = result.plan ? [`wrote ${result.plan}`] : [];
      if (!result.enabled) return [...planned, `diagrams off — ${result.reason}`].join("\n");
      if (!result.available) return [...planned, `diagram generator missing (${result.code}) — ${result.fix}`].join("\n");
      if (result.subject === LOOP_SUBJECT) {
        return [
          `${result.item} loop — draw the wave plan with ${result.generator}`,
          `  plan:   ${result.paths.plan}`,
          `  source: ${result.paths.source}`,
          `  png:    ${result.paths.png}`,
          "",
          result.instructions,
        ].join("\n");
      }
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

return { diagramPlanCommand };
}
