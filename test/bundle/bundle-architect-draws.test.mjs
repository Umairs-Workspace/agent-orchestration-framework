// milestone 133 / story 05 / task 00 — the architect's ADR rule and refine's Decide stage carry ONE
// diagram step, which names aof's verbs and never a generator (ADR-008).
//
// It reads the bundle SOURCE and the six rendered copies from this checkout, and pins the step's
// CONTENT (the judgement, the brief, the three branches, the two verbs, solo mode), not its wording.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getCommand } from "../../src/command-core.mjs";
import { parseSpecArgv } from "../../src/spine/face.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "bin", "aof.mjs");
const read = (rel) => readFile(path.join(repoRoot, rel), "utf8").then((text) => text.replace(/\r\n/g, "\n"));

const ARCHITECT = "src/bundle/agents/aof-architect.md";
const REFINE = "src/bundle/commands/refine.md";
const COPIES = [
  ".claude/agents/aof-architect.md",
  ".claude/commands/aof/refine.md",
  ".codex/agents/aof-architect.md",
  ".codex/skills/aof-refine/SKILL.md",
  ".opencode/agents/aof-architect.md",
  ".opencode/commands/aof/refine.md",
];
const PLAN = "aof diagram plan <ref> <ADR-NNN> --slug <slug> --json";
const EXPORT = "aof diagram export <ref> <ADR-NNN> --json";
const GENERATOR = ["diagram", "design"].join("-");

// The one passage: the paragraph (blank-line bounded) or list item that names `aof diagram plan`.
function passages(text) {
  return text.split(/\n\s*\n|\n(?=\s*- )/).filter((block) => block.includes("aof diagram plan"));
}

// The section a passage sits in, by its enclosing XML-ish tag or its nearest preceding marker.
const inArchitectOwnership = (text, passage) => {
  const open = text.indexOf("<ownership>");
  const close = text.indexOf("</ownership>");
  const at = text.indexOf(passage);
  const adrBullet = text.indexOf("immutable ADRs");
  return open >= 0 && at > open && at < close && adrBullet >= 0 && adrBullet < at;
};
const inRefineDecide = (text, passage) => {
  const decide = text.indexOf("1. **Decide**");
  const at = text.indexOf(passage);
  const architect = text.indexOf("`aof-architect` → ADRs", decide);
  const next = text.indexOf("\n  2. ", decide);
  return decide >= 0 && architect > decide && at > architect && (next === -1 || at < next);
};

function assertStep(passage, document) {
  const flat = passage.replace(/\s+/g, " ");
  assert.match(flat, /moving parts/, `${document}: draws only for moving parts`);
  assert.match(flat, /most ADRs get none/, `${document}: most ADRs get none`);
  assert.match(flat, /judgement/, `${document}: the judgement is the architect's`);
  assert.match(flat, /`### Diagram` brief/, `${document}: the brief`);
  assert.match(flat, /why a picture helps, the view, the components,? and the flows|why a picture helps, the view, the components, the flows/, `${document}: what the brief says`);
  assert.ok(flat.includes(PLAN), `${document}: the plan command`);
  assert.match(flat, /`enabled: false` → drop the brief and record nothing/, `${document}: the off branch`);
  assert.match(flat, /`available: false` → keep the brief, record `diagram not drawn: <code>` in `STATE\.md`, and continue; it is never a stop/, `${document}: the missing branch`);
  assert.match(flat, /follows the answer's `instructions`/, `${document}: the draw branch`);
  assert.ok(flat.includes(EXPORT), `${document}: the export command`);
  assert.match(flat, /paste the returned `block` under the brief/, `${document}: the block is pasted`);
  assert.match(flat, /aof never edits `ARCHITECTURE\.md`/, `${document}: aof never edits ARCHITECTURE.md`);
}

export const bundleArchitectDrawsTests = [
  {
    name: "133/05 task 00: the step is in both source documents, once, inside the ADR authoring they already describe",
    run: async () => {
      const architect = await read(ARCHITECT);
      const [architectStep, ...architectExtra] = passages(architect);
      assert.deepEqual(architectExtra, [], "one passage names the plan verb in the architect");
      assert.ok(inArchitectOwnership(architect, architectStep), "beside the ADR bullet, in what the architect writes");
      const refine = await read(REFINE);
      const [refineStep, ...refineExtra] = passages(refine);
      assert.deepEqual(refineExtra, [], "one passage names the plan verb in refine");
      assert.ok(inRefineDecide(refine, refineStep), "inside the milestone Decide step, after aof-architect → ADRs");
      for (const step of [architectStep, refineStep]) assert.ok(step.includes("aof diagram export"));
    },
  },
  {
    name: "133/05 task 00: the step states the judgement, the brief and each branch",
    run: async () => {
      assertStep(passages(await read(ARCHITECT))[0], ARCHITECT);
      assertStep(passages(await read(REFINE))[0], REFINE);
    },
  },
  {
    name: "133/05 task 00: refine says the main session runs the step itself in solo mode",
    run: async () => {
      assert.match(passages(await read(REFINE))[0].replace(/\s+/g, " "), /On a solo refine the main session is the architect and runs the same step/);
    },
  },
  {
    name: "133/05 task 00: no bundle document names the generator, sources or rendered copies",
    run: async () => {
      for (const document of [ARCHITECT, REFINE, ...COPIES]) {
        const text = await read(document);
        assert.equal(text.includes(GENERATOR), false, `${document} names the generator`);
        assert.equal(text.includes(`/${GENERATOR}:`), false, `${document} names the plugin command`);
      }
    },
  },
  {
    name: "133/05 task 00: every rendered copy carries the step and matches a fresh render",
    run: async () => {
      for (const copy of COPIES) assert.ok((await read(copy)).includes(PLAN), `${copy} carries the step`);
      const dry = spawnSync(process.execPath, [cliPath, "work", "update", "--dry-run", "--json"], { cwd: repoRoot, encoding: "utf8", env: { ...process.env, NODE_NO_WARNINGS: "1" } });
      assert.equal(dry.status, 0, dry.stderr);
      const actions = new Map(JSON.parse(dry.stdout).actions.map((action) => [action.path, action.action]));
      for (const copy of COPIES) assert.equal(actions.get(copy), "skip", `${copy} is what a fresh render writes`);
    },
  },
  {
    name: "133/05 task 00: the architect's tools are not widened to draw",
    run: async () => {
      const frozen = await read("src/bundle/frozen-set.jsonc");
      const pinned = /"aof-architect":\s*\[([^\]]*)\]/.exec(frozen)?.[1] ?? "";
      assert.deepEqual(pinned.split(",").map((tool) => tool.trim().replace(/"/g, "")), ["Read", "Grep", "Glob", "Bash", "Write", "Edit"]);
      const architect = await read(ARCHITECT);
      const tools = /^tools:\s*(.*)$/m.exec(architect)?.[1] ?? "";
      assert.equal(tools.includes("Skill"), false, "the architect asks for no Skill tool");
    },
  },
  {
    name: "133/05 task 00: the commands the prose names are the commands that exist, with the flags it passes",
    run: () => {
      for (const [id, argv] of [["diagram:plan", ["07", "ADR-002", "--slug", "seam", "--json"]], ["diagram:export", ["07", "ADR-002", "--json"]]]) {
        const command = getCommand(id);
        assert.ok(command, `${id} is registered`);
        assert.deepEqual(command.cli.route, id.split(":"), `${id} is reached as aof ${id.replace(":", " ")}`);
        assert.doesNotThrow(() => parseSpecArgv(argv, command.cli.spec, id), `${id} accepts ${argv.filter((arg) => arg.startsWith("--")).join(" ")}`);
      }
    },
  },
];
