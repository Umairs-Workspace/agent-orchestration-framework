// FF-19208 — off renders no practice prose, and core holds none (milestone 192 / story 02,
// ADR-005 §2, §6), with the render-level cases of the story's tasks:
//   tasks/00_with-a-practice-off-the-commands-hold-none-of-its-prose.feature
//   tasks/01_with-a-practice-on-the-command-says-what-it-says-today.feature (its @executable cases)
//   tasks/02_a-practices-prose-lives-with-the-practice.feature (the descriptor, registry and payload cases)
//
// Four scratch projects are initialised from this checkout's bundle for Claude, Codex and opencode,
// each under its own `AOF_GLOBAL_HOME`, then given a config and updated: NONE sets nothing, BRIEF sets
// `work.plan.enabled`, DISCOVERY sets `work.examples.enabled`, BOTH sets the two. The control itself,
// `practiceProseLeaks`, is pure over `{ file, text, words }` so each planted leak can be fed to it.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { practiceFixtureRoot } from "../../support/cli-spawn.mjs";
import { readAssetText } from "../../../packages/core/src/asset-base.mjs";
import { loadBundle, readDescriptor, renderBundleOutputs } from "../../../packages/core/src/work/bundle.mjs";
import { slotsOf } from "../../../packages/core/src/work/bundle-compose.mjs";
import { generateBundleManifest, serializeBundleManifest, manifestPath } from "../../../packages/core/src/work/bundle-manifest.mjs";
import { hashContent } from "../../../packages/core/src/lock.mjs";
import { PRACTICES } from "../../../packages/core/src/practices.mjs";
import { generatePackageAssetManifest } from "../../../scripts/sea-asset-manifest.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const cliPath = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");

export const DISCOVERY_WORDS = Object.freeze(["EXAMPLES.md", "example map", "work.examples.enabled", "discovery beat"]);
export const BRIEF_WORDS = Object.freeze(["PLAN.md", "work.plan.enabled", "build brief"]);
const BOTH_WORDS = Object.freeze([...DISCOVERY_WORDS, ...BRIEF_WORDS]);
const MARKER = "<!-- slot:";

const PROJECTS = Object.freeze({
  NONE: {},
  BRIEF: { plan: { enabled: true } },
  DISCOVERY: { examples: { enabled: true } },
  BOTH: { examples: { enabled: true }, plan: { enabled: true } },
});
const project = (name) => practiceFixtureRoot(repoRoot, name, PROJECTS[name]);
const readIn = (root, rel) => readFileSync(path.join(root, rel), "utf8").replace(/\r\n/gu, "\n");
// A Codex brief is TOML; its prose is the `developer_instructions` string.
const prose = (root, rel) => {
  const text = readIn(root, rel);
  return rel.endsWith(".toml") ? JSON.parse(/^developer_instructions = (.+)$/mu.exec(text)[1]) : text;
};

// The rendered artefacts, by what they are and which runtime renders them.
const ARTEFACTS = Object.freeze({
  "refine command": { claude: [".claude/commands/aof/refine.md"], opencode: [".opencode/commands/aof/refine.md"] },
  "refine skill": { codex: [".agents/skills/aof-refine/SKILL.md", ".agents/skills/aof-refine/procedure.md"] },
  "PO brief": { claude: [".claude/agents/aof-product-owner.md"], opencode: [".opencode/agents/aof-product-owner.md"], codex: [".codex/agents/aof-product-owner.toml"] },
  "architect brief": { claude: [".claude/agents/aof-architect.md"], opencode: [".opencode/agents/aof-architect.md"], codex: [".codex/agents/aof-architect.toml"] },
  "QA brief": { claude: [".claude/agents/aof-qa.md"], opencode: [".opencode/agents/aof-qa.md"], codex: [".codex/agents/aof-qa.toml"] },
});
const isRefine = (artefact) => artefact.startsWith("refine");
const wordsFor = (artefact) => (isRefine(artefact) ? BOTH_WORDS : DISCOVERY_WORDS);

// ── the control (FF-19208) ──────────────────────────────────────────────────────────────────────
// Each `{ file, word }` a text holds that it must not: a practice word, or — in a render, never in a
// source, whose slots are the point — a slot marker.
export function practiceProseLeaks(texts) {
  const leaks = [];
  for (const { file, text, words, source = false } of texts) {
    for (const word of words) if (text.toLowerCase().includes(word.toLowerCase())) leaks.push({ file, word });
    if (!source && text.includes(MARKER)) leaks.push({ file, word: MARKER });
  }
  return leaks;
}
const describe = (leaks) => leaks.map(({ file, word }) => `${file} holds "${word}"`).join("; ");

// NONE's rendered artefacts for every runtime, each with the words it must not hold.
const noneTexts = () => Object.entries(ARTEFACTS).flatMap(([artefact, byRuntime]) => Object.values(byRuntime).flat()
  .map((rel) => ({ file: rel, text: prose(project("NONE"), rel), words: wordsFor(artefact) })));

// Core's own sources of the four members: their common files, and the Codex text of each — the
// variant body and every associated file — read through the asset seam, never composed.
const CORE_MEMBERS = Object.freeze({ "refine": BOTH_WORDS, "aof-product-owner": DISCOVERY_WORDS, "aof-architect": DISCOVERY_WORDS, "aof-qa": DISCOVERY_WORDS });
function sectionOf(file, section) {
  const body = readAssetText("bundle", file);
  const pieces = body.split(`<!-- variant:${section} -->`);
  assert.equal(pieces.length, 2, `${file} holds the section ${section} once`);
  return pieces[1].split(/<!-- variant:[^>]+ -->/u)[0];
}
export function coreSourceTexts(read = (file, section) => (section ? sectionOf(file, section) : readAssetText("bundle", file))) {
  const members = readDescriptor().members.filter((member) => Object.hasOwn(CORE_MEMBERS, member.id) && member.kind !== "fragment");
  assert.equal(members.length, 4, "the four members are declared by core");
  const texts = [];
  for (const member of members) {
    const words = CORE_MEMBERS[member.id];
    texts.push({ file: `packages/core/assets/${member.file}`, text: read(member.file), words, source: true });
    for (const variant of Object.values(member.variants ?? {})) {
      if (!variant?.file) continue;
      for (const { file, section } of [variant, ...(variant.associatedFiles ?? [])]) {
        texts.push({ file: `packages/core/assets/${file}#${section}`, text: read(file, section), words, source: true });
      }
    }
  }
  return texts;
}

// ── helpers over the projects ───────────────────────────────────────────────────────────────────
const count = (text, needle) => text.split(needle).length - 1;
const flat = (text) => text.replace(/\s+/gu, " ");
const contractOf = (refine) => refine.slice(refine.indexOf("- **story — Contract (Three Amigos):**"), refine.indexOf("**`--autonomous` — cascade"));
const lineCount = (text) => text.split("\n").length;

export const archTests = [
  // ══ tasks/00 · R1 · With a practice off, a project's commands hold none of its prose ══
  ...Object.entries(ARTEFACTS).flatMap(([artefact, byRuntime]) => Object.entries(byRuntime).map(([runtime, rels]) => ({
    name: `192/02 00 E1 · a project with nothing on holds neither practice's prose — ${artefact}, ${runtime}`,
    run: () => {
      const texts = rels.map((rel) => ({ file: rel, text: prose(project("NONE"), rel), words: wordsFor(artefact) }));
      const leaks = practiceProseLeaks(texts);
      assert.deepEqual(leaks, [], describe(leaks));
    },
  }))),
  {
    name: "192/02 00 the refine skill is its entry and its procedure",
    run: () => {
      for (const rel of ARTEFACTS["refine skill"].codex) {
        const leaks = practiceProseLeaks([{ file: rel, text: readIn(project("NONE"), rel), words: BOTH_WORDS }]);
        assert.deepEqual(leaks, [], describe(leaks));
      }
      assert.match(readIn(project("NONE"), ".agents/skills/aof-refine/SKILL.md"), /Scope declared reads\/writes\.\nRetain executable\/manual\/UAT lanes/u, "the entry's second sentence stands alone");
    },
  },
  {
    name: "192/02 00 E2 · the build brief alone",
    run: () => {
      const refine = readIn(project("BRIEF"), ".claude/commands/aof/refine.md");
      const start = refine.indexOf("  **The build brief — ONLY when the project has turned it on.**");
      assert.ok(start >= 0, "the paragraph that opens \"The build brief\" is there");
      const bullets = refine.slice(start).split("\n\n")[1].split("\n").filter((line) => line.startsWith("  - "));
      assert.equal(bullets.length, 4, "its four bullets follow it");
      assert.deepEqual(practiceProseLeaks([{ file: "BRIEF refine", text: refine, words: DISCOVERY_WORDS }]), []);
    },
  },
  {
    name: "192/02 00 E3 · discovery alone",
    run: () => {
      const refine = readIn(project("DISCOVERY"), ".claude/commands/aof/refine.md");
      assert.match(refine, /^ {2}Discovery comes first/mu);
      assert.match(refine, /^ {2}\*\*With an applicable example map, formulate from it\.\*\*/mu);
      assert.deepEqual(practiceProseLeaks([{ file: "DISCOVERY refine", text: refine, words: BRIEF_WORDS }]), []);
    },
  },
  {
    name: "192/02 00 the Contract still reads as one procedure with nothing on",
    run: () => {
      const refine = readIn(project("NONE"), ".claude/commands/aof/refine.md");
      const contract = contractOf(refine);
      const order = ["- **story — Contract (Three Amigos):** author the task `.feature` files under `tasks/`.\n\n  **Formulation.**", "**Gate check (before authoring):**", "**Finish the story contract, not only its tasks.**"]
        .map((needle) => contract.indexOf(needle));
      assert.ok(order.every((at) => at >= 0), `the Contract holds its opening, Formulation, the gate check and the finish, in that order: ${order}`);
      assert.deepEqual([...order].sort((a, b) => a - b), order);
      assert.ok(contract.trimEnd().endsWith("be empty only for a documentation/verification-only story that writes no project file."), "the Contract ends at the finish");
      assert.doesNotMatch(refine, /\n[ \t]*\n[ \t]*\n/u, "no two blank lines stand together");
    },
  },
  {
    name: "192/02 00 a project with nothing on loads a shorter command",
    run: () => {
      const none = lineCount(readIn(project("NONE"), ".claude/commands/aof/refine.md"));
      const both = lineCount(readIn(project("BOTH"), ".claude/commands/aof/refine.md"));
      assert.ok(both - none >= 80, `NONE ${none} lines, BOTH ${both}: ${both - none} shorter`);
    },
  },
  {
    name: "192/02 00 the canonical render is a project with nothing on",
    run: () => {
      const generated = serializeBundleManifest(generateBundleManifest());
      assert.equal(generated, readFileSync(manifestPath(), "utf8"), "the regenerated manifest is byte for byte the committed one");
      const entry = JSON.parse(generated).entries.find((candidate) => candidate.path === ".claude/commands/aof/refine.md");
      assert.equal(entry.hash, hashContent(readFileSync(path.join(project("NONE"), ".claude/commands/aof/refine.md"), "utf8")), "the refine command's hash is NONE's");
    },
  },
  {
    name: "192/02 00 FF-19208 · off renders no practice prose, and core holds none",
    run: () => {
      const rendered = practiceProseLeaks(noneTexts());
      assert.deepEqual(rendered, [], `NONE's render: ${describe(rendered)}`);
      const sources = practiceProseLeaks(coreSourceTexts());
      assert.deepEqual(sources, [], `core's sources: ${describe(sources)}`);
      // Non-vacuous: the same control reds on BOTH, which has both practices on.
      const both = practiceProseLeaks(noneTexts().map((entry) => ({ ...entry, text: prose(project("BOTH"), entry.file) })));
      for (const word of [...DISCOVERY_WORDS.slice(0, 3), "work.plan.enabled"]) assert.ok(both.some((leak) => leak.word === word), `BOTH holds "${word}"`);
    },
  },
  ...[
    ["the sentence \"write no EXAMPLES.md\" written back into core's refine source", "packages/core/assets/commands/refine.md", "EXAMPLES.md",
      () => coreSourceTexts((file, section) => {
        const text = section ? sectionOf(file, section) : readAssetText("bundle", file);
        return file === "commands/refine.md" ? text.replace("- **story — Contract (Three Amigos):**", "- **story — Contract (Three Amigos):** When it is off, write no EXAMPLES.md.") : text;
      })],
    ["a discovery fragment declared with no practice, so it renders everywhere", ".claude/commands/aof/refine.md", "discovery beat",
      () => {
        // The beat re-declared under a practice that is on for every project: a fragment no gate holds back.
        const descriptor = readDescriptor();
        descriptor.practices.push({ id: "everywhere", title: "Everywhere", summary: "On for every project.", keys: ["work.everywhere"], contributor: "@aof/specification-by-example" });
        descriptor.members = descriptor.members.map((member) => (member.id === "discovery-refine-formulation" ? { ...member, practice: "everywhere" } : member));
        const outputs = renderBundleOutputs(loadBundle({ descriptor, config: { work: { everywhere: true } } }), { runtimes: ["claude"] });
        return [{ file: ".claude/commands/aof/refine.md", text: outputs.find((output) => output.path.replaceAll("\\", "/") === ".claude/commands/aof/refine.md").content, words: BOTH_WORDS }];
      }],
    ["the map bullet left in the Codex text of the PO brief", "packages/core/assets/variants/codex/workflow.md#aof-product-owner", "example map",
      () => coreSourceTexts((file, section) => {
        const text = section ? sectionOf(file, section) : readAssetText("bundle", file);
        return section === "aof-product-owner" ? text.replace("<!-- slot:ownership.examples -->", "- A story's `EXAMPLES.md` — its **example map**, drafted only when `work.examples.enabled` is on.") : text;
      })],
    ["the build brief's paragraph left in the Codex refine procedure", "packages/core/assets/variants/codex/workflow.md#procedure-refine", "work.plan.enabled",
      () => coreSourceTexts((file, section) => {
        const text = section ? sectionOf(file, section) : readAssetText("bundle", file);
        return section === "procedure-refine" ? text.replace("  <!-- slot:contract.brief -->", "  **The build brief — ONLY when the project has turned it on.** Read `work.plan.enabled` from\n  `.aof/aof.config.json`.") : text;
      })],
  ].map(([planted, file, word, texts]) => ({
    name: `192/02 00 FF-19208 · each planted leak turns the control red — ${planted}`,
    run: () => {
      const leaks = practiceProseLeaks(texts());
      assert.ok(leaks.some((leak) => leak.file === file && leak.word === word), `the control names ${file} and "${word}": ${describe(leaks)}`);
    },
  })),

  // ══ tasks/01 · R2 · With a practice on, the command says what it says today (@executable) ══
  {
    name: "192/02 01 every passage that moved is rendered once",
    run: () => {
      const refine = readIn(project("BOTH"), ".claude/commands/aof/refine.md");
      for (const opening of ["Discovery comes first", "With an applicable example map, formulate from it.", "The build brief", "When `work.examples.enabled` is on, a business-rule", "When `work.examples.enabled` is on, it lists"]) {
        assert.equal(count(refine, opening), 1, `"${opening}" appears exactly once`);
      }
    },
  },
  {
    name: "192/02 01 the passages stand in the order they stood in",
    run: () => {
      const refine = readIn(project("BOTH"), ".claude/commands/aof/refine.md");
      const at = (needle) => { const index = refine.indexOf(needle); assert.ok(index >= 0, `${needle} is there`); return index; };
      assert.ok(at("Discovery comes first") < at("**Formulation.**"), "the discovery beat comes before Formulation");
      assert.ok(at("**With an applicable example map, formulate from it.**") < at("**Under orchestrated mode"), "the formulation from the map comes before Under orchestrated mode");
      assert.ok(at("**Finish the story contract") < at("**The build brief") && at("**The build brief") < at("**`--autonomous` — cascade"), "the build brief stands between the finish and the --autonomous block");
    },
  },
  {
    name: "192/02 01 a moved passage keeps its place in its list",
    run: () => {
      const refine = readIn(project("BOTH"), ".claude/commands/aof/refine.md");
      const contract = contractOf(refine);
      const beat = contract.slice(contract.indexOf("Discovery comes first") - 2, contract.indexOf("**Formulation.**"));
      for (const line of beat.split("\n").filter((candidate) => candidate.trim() !== "")) assert.match(line, /^ {2}/u, `indented under the Contract's bullet: ${line}`);
      const po = readIn(project("BOTH"), ".claude/agents/aof-product-owner.md");
      const ownership = po.slice(po.indexOf("<ownership>"), po.indexOf("</ownership>")).split("\n");
      const bullet = ownership.findIndex((line) => line.startsWith("- A story's `EXAMPLES.md` — its **example map**"));
      assert.ok(bullet > 0 && ownership[bullet - 1].startsWith("- Each story's `STORY.md`"), "the map bullet is a bullet of the ownership list, where it stood");
      assert.deepEqual(ownership.slice(bullet + 1, bullet + 5).map((line) => line.startsWith("  - ")), [true, true, true, true], "its four sub-bullets sit beneath it");
      assert.ok(ownership[bullet + 5].startsWith("- **Formulating from the map.**"));
    },
  },
  {
    name: "192/02 01 a fragment still says when it applies",
    run: () => {
      const refine = flat(readIn(project("BOTH"), ".claude/commands/aof/refine.md"));
      assert.match(refine, /Discovery comes first, and ONLY when the project has turned it on: read `work\.examples\.enabled`/u);
      assert.match(refine, /When it is off, write no `EXAMPLES\.md`, ask no question/u);
      assert.match(refine, /The build brief — ONLY when the project has turned it on\.\*\* Read `work\.plan\.enabled`/u);
      assert.match(refine, /It defaults to \*\*false\*\*/u);
    },
  },
  ...[
    ["the available native question tool", "AskUserQuestion"],
    ["native question request", "AskUserQuestion"],
    ["structured `needs_input` phase result", "/aof:"],
  ].map(([codex, claude]) => ({
    name: `192/02 01 the Codex text keeps its own wording — refine procedure holds "${codex}"`,
    run: () => {
      const procedure = flat(readIn(project("BOTH"), ".agents/skills/aof-refine/procedure.md"));
      assert.ok(procedure.includes(codex), `holds "${codex}"`);
      assert.ok(!procedure.includes(claude), `does not hold "${claude}"`);
    },
  })),
  {
    name: "192/02 01 this checkout's committed copies are what the bundle renders",
    run: () => {
      const home = mkdtempSync(path.join(os.tmpdir(), "aof-192-02-home-"));
      try {
        const result = spawnSync(process.execPath, [cliPath, "work", "update", "--dry-run", "--json"], { cwd: repoRoot, encoding: "utf8", env: { ...process.env, AOF_GLOBAL_HOME: home, NODE_NO_WARNINGS: "1" } });
        assert.equal(result.status, 0, result.stderr);
        const planned = JSON.parse(result.stdout).actions.filter((action) => action.action !== "skip" && /^\.(claude|agents|codex|opencode)\//u.test(action.path));
        assert.deepEqual(planned, [], "no rendered command, agent or skill would change");
      } finally {
        rmSync(home, { recursive: true, force: true });
      }
    },
  },
  {
    name: "192/02 01 milestones 134, 135 and 136 still hold",
    run: async () => {
      const { refineDiscoveryBeatTests } = await import("../../examples/refine-discovery-beat.test.mjs");
      const { tests: packageTests } = await import("../../../packages/specification-by-example/test/index.mjs");
      const failed = [];
      for (const test of [...refineDiscoveryBeatTests, ...packageTests]) {
        try { await test.run(); } catch (error) { failed.push(`${test.name}: ${error.message.split("\n")[0]}`); }
      }
      assert.ok(refineDiscoveryBeatTests.length > 40 && packageTests.length > 0, "the suites were found");
      assert.deepEqual(failed, []);
    },
  },

  // ══ tasks/02 · R3 · A practice's prose lives with the practice (descriptor, registry, payload) ══
  {
    name: "192/02 02 E6 · discovery's prose is the specification-by-example package's",
    run: () => {
      const descriptor = readDescriptor();
      const practice = descriptor.practices.find((candidate) => candidate.id === "discovery");
      assert.deepEqual({ keys: practice.keys, contributor: practice.contributor }, { keys: ["work.examples.enabled"], contributor: "@aof/specification-by-example" });
      const fragments = descriptor.members.filter((member) => member.kind === "fragment" && member.practice === "discovery");
      assert.ok(fragments.length >= 8, "the discovery fragments are declared");
      for (const fragment of fragments) {
        assert.equal(fragment.assetClass, "package:@aof/specification-by-example", `${fragment.id} is read from the package`);
        for (const file of [fragment.file, ...Object.values(fragment.variants ?? {}).map((variant) => variant.file)].filter(Boolean)) {
          assert.match(file, /^fragments\/discovery\//u, `${fragment.id}: ${file} is under the package's assets/fragments/discovery`);
        }
      }
      const refine = readAssetText("bundle", "commands/refine.md");
      const contract = contractOf(refine);
      assert.ok(contract.includes("\n\n  <!-- slot:contract.discovery -->\n\n  **Formulation.**"), "core's refine source holds the marker where the beat stood");
    },
  },
  {
    name: "192/02 02 E7 · the build brief is declared by core's own bundle",
    run: () => {
      const descriptor = readDescriptor();
      const practice = descriptor.practices.find((candidate) => candidate.id === "build-brief");
      assert.deepEqual({ keys: practice.keys, contributor: practice.contributor }, { keys: ["work.plan.enabled"], contributor: "core" });
      const fragments = descriptor.members.filter((member) => member.kind === "fragment" && member.practice === "build-brief");
      assert.deepEqual(fragments.map(({ target, slot, assetClass }) => ({ target, slot, assetClass })), [{ target: "command:refine", slot: "contract.brief", assetClass: undefined }]);
    },
  },
  ...[
    ["refine", "contract.discovery"], ["refine", "contract.formulation"], ["refine", "contract.brief"], ["refine", "autonomous.milestone"],
    ["refine", "output.autonomous"], ["aof-product-owner", "ownership.examples"], ["aof-architect", "ownership.examples"], ["aof-qa", "ownership.examples"],
  ].map(([id, slot]) => ({
    name: `192/02 02 each slot of the first move is in the Claude source and in the Codex text — ${id} ${slot}`,
    run: () => {
      const member = readDescriptor().members.find((candidate) => candidate.id === id && candidate.kind !== "fragment");
      assert.ok(slotsOf(readAssetText("bundle", member.file)).includes(slot), `${member.file} carries ${slot}`);
      const codex = member.variants.codex;
      const texts = [codex, ...(codex.associatedFiles ?? [])].map(({ file, section }) => sectionOf(file, section));
      assert.ok(texts.some((text) => slotsOf(text).includes(slot)), `the Codex text of ${id} carries ${slot}`);
    },
  })),
  {
    name: "192/02 02 the Codex entry carries one slot of its own",
    run: () => {
      const member = readDescriptor().members.find((candidate) => candidate.id === "refine");
      assert.ok(slotsOf(sectionOf(member.variants.codex.file, member.variants.codex.section)).includes("entry.rules"), "the Codex entry carries entry.rules");
      assert.equal(slotsOf(readAssetText("bundle", member.file)).includes("entry.rules"), false, "the common source does not");
    },
  },
  {
    name: "192/02 02 the package is a registered practice",
    run: () => {
      assert.deepEqual(PRACTICES.map((practice) => practice.name), ["@aof/learning", "@aof/specification-by-example"]);
      const offenders = [];
      const walk = (dir) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(full);
          else if (entry.name.endsWith(".mjs") && /["']@aof\/(learning|specification-by-example)(\/[^"']*)?["']/u.test(readFileSync(full, "utf8"))) offenders.push(path.relative(repoRoot, full));
        }
      };
      walk(path.join(repoRoot, "packages", "work", "src"));
      assert.deepEqual(offenders, [], "@aof/work imports nothing from either practice");
    },
  },
  {
    name: "192/02 02 the practice's assets ride the payload and the packaged binary",
    run: () => {
      const entry = generatePackageAssetManifest(repoRoot).find((candidate) => candidate.name === "@aof/specification-by-example");
      assert.ok(entry, "the package asset manifest lists the package");
      assert.equal(entry.sidecar, "packages/specification-by-example");
      const listed = entry.files.map((file) => String(file.rel ?? file).replaceAll("\\", "/"));
      const declared = readDescriptor().members.filter((member) => member.practice === "discovery")
        .flatMap((member) => [member.file, ...Object.values(member.variants ?? {}).map((variant) => variant.file)]).filter(Boolean);
      for (const file of ["bundle.json", ...new Set(declared)]) assert.ok(listed.includes(file), `${file} rides the payload`);
    },
  },
];
