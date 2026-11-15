import { defaultApplication as _aofApplication } from "aof/default-application";
// FF-13403 — with the examples gate off, the doctor and the continue door are exactly what they are
// today (milestone 134 / story 04, ADR-006 §3).
//
// Covers EVERY @executable scenario in
//   tasks/03_off-is-today.feature
//
// The gate has three code readers — the snapshot probe, the lane and the continue door — and this
// control holds all three at once over the worst map a story could carry, so a reader that forgets
// to ask the resolver is caught here rather than by a project whose stream turns red the day it
// upgrades. The fixture is story 04's (`test/examples/doctor-examples-lane.test.mjs`): a project
// in a fresh temp directory with its own global home and Claude config directory. Its red probe is
// recorded in the milestone `VERIFICATION.md` fitness register.
//
// FF-19202 (milestone 193 / ADR-002 §5) — OFF IS STILL TODAY, for the research document too. With
// the gate off, no story row carries its text, the lane judges no citation and the door refuses on
// none. One judgement (`readWithGateOff`) is run over the real readers and over three planted ones
// that read the document before asking the gate, so the control is shown to have teeth.
//
// FF-19204 (milestone 193 / ADR-006 §2, §8) — OFF RENDERS NONE OF IT. A project with discovery on
// and the operator-aware switch off (or `false`) is given exactly what the same project is given by
// a bundle with the `operator-aware` practice and its members removed: refine for Claude and for
// Codex, the PO, architect and researcher briefs for both, and the two installed templates. Equality
// with that render cannot see prose planted in core, which both renders would carry, so the same
// judgement also refuses any sentence only an operator-aware fragment holds, and any slot marker a
// render leaves behind. Four planted leaks show it has teeth.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadBundle, readDescriptor, renderBundleTemplateOutputs } from "../../../packages/core/src/work/bundle.mjs";
import { packageAssetClass, readAssetText } from "../../../packages/core/src/asset-base.mjs";
import { createExamplesBuildDoor } from "@aof/specification-by-example/build-door";
import { createDoctorExamples } from "@aof/specification-by-example/doctor-lane";
import { EXAMPLES_DOC } from "@aof/specification-by-example/map";
import { createExamplesStoryProbe, researchDocOf } from "@aof/specification-by-example/story-probe";
import { ABSENT, E, F, Q, QUESTIONS, R, mapOf, pinMtimes, researchDoc, snapshotOf, withCited, withExamplesProject, writeTasks } from "../../examples/doctor-examples-lane.test.mjs";
import { featureText, rule, scenario } from "../../../packages/specification-by-example/test/example-trace.suite.mjs";

const doctorWork = _aofApplication.work.doctor.doctorWork;
const EXAMPLE_LANE_CODES = _aofApplication.work.doctorExamples.EXAMPLE_LANE_CODES;

const NOW = Date.parse("2026-09-25T09:00:00.000Z");
// Noon of the day 134/04's date-only `updated` names (2026-09-24), in local time.
const NOON = new Date(2026, 8, 24, 12, 0, 0);

// The worst map a story could carry, 60 lines: an open business question, a `[confirmed]` example
// no answer stands behind, a malformed line, a rule with no example and five rules. Since 135/04 it
// rides with WORST_CONTRACT, a contract formulated from the map that carries none of its examples,
// so the trace's `example-untraced` is held off by the gate too.
const WORST_CONTRACT = { "tasks/00_worst.feature": featureText("worst", rule("R1 · rule 1", scenario("an example with no id"))) };
const WORST = (() => {
  const body = [
    ...R(1, E(1, "[confirmed]")),
    ...R(2, E(2), "- E3 · x [confirmd]"),
    ...R(3, E(4)),
    ...R(4, E(5)),
    ...R(5),
    ...QUESTIONS(Q(1, "business", "open")),
  ];
  const padding = Array.from({ length: 60 - 1 - body.length }, (_, index) => `<!-- padding ${index + 1} -->`);
  return mapOf(body, padding);
})();

const OFF = [
  ["absent", undefined],
  ["false", { enabled: false }],
  ["a string", { enabled: "yes" }],
  ["a misspelt key", { enable: true }],
  ["not an object", true],
];

// ── FF-19202 ──────────────────────────────────────────────────────────────────────────────────────
// What, with the gate off, a reader took from the research document: the row's text, a citation the
// lane judged, a refusal the door made. Empty is today.
function readWithGateOff({ row = null, findings = [], refusal = null }) {
  const read = [];
  if (row?.extensions?.examples?.research != null) read.push(`the story row ${row.ref} carries the research document's text`);
  for (const finding of findings.filter((entry) => entry.code === "example-research-unanchored")) read.push(`the lane judged a citation — ${finding.message}`);
  if (refusal?.code === "examples-question-open") read.push(`the door refused on the map — ${refusal.message.split("\n").slice(1).join(" ").trim()}`);
  return read;
}
// The fixture: 193/01's map cites F3, and the milestone's research document holds only F1 — so a
// reader that reached the document would both carry its text and find the citation unresolved.
const CITES_F3 = mapOf(R(1, E(1, "[researched F3]")));
const HOLDS_F1 = researchDoc(F(1));
const gate = (config) => config?.work?.examples?.enabled === true;
const fileState = async (target) => {
  const text = await readFile(target, "utf8").catch(() => null);
  return { present: text != null, nonEmpty: Boolean(text?.trim()), lines: text?.split("\n").length ?? 0, text };
};
const doorRefusal = async (door, fx, config) => {
  try {
    await door.refuseOpenExamples({ workspace: { config, projectRoot: fx.project } }, { ref: fx.s04.ref, type: "story", dir: fx.s04.dir, status: "in-progress" });
    return null;
  } catch (error) {
    return error;
  }
};

// ── FF-19204 ──────────────────────────────────────────────────────────────────────────────────────
const PRACTICE = packageAssetClass("@aof/specification-by-example");
const FRAGMENTS = fileURLToPath(new URL("../../../packages/specification-by-example/assets/fragments/", import.meta.url));
const flat = (text) => text.replace(/\s+/gu, " ");
// The practice's descriptor with `operator-aware` and every member of it removed. A member is the
// practice's by the file it ships under `operator-aware/`, not by the practice it names, so a member
// relabelled into another practice is still removed and its prose is still seen.
const shipsOperatorAware = (member) => [member.file, member.variants?.codex?.file].some((file) => /(?:^|\/)operator-aware\//u.test(file ?? ""));
const withoutOperatorAware = (text) => {
  const descriptor = JSON.parse(text);
  return JSON.stringify({
    ...descriptor,
    practices: descriptor.practices.filter((practice) => practice.id !== "operator-aware"),
    members: descriptor.members.filter((member) => member.practice !== "operator-aware" && !shipsOperatorAware(member)),
  });
};
// The artefacts FF-19204 holds, by name, as one render gives them.
function artefactsOf(bundle) {
  const out = {};
  for (const id of ["refine", "aof-product-owner", "aof-architect", "aof-researcher"]) {
    const resource = bundle.resources.find((entry) => entry.id === id);
    out[`${id} (claude)`] = resource.body;
    const codex = resource.runtimeVariants.codex;
    out[`${id} (codex)`] = [codex.body, ...(codex.associatedFiles ?? []).map((file) => file.content ?? file.body ?? "")].join("\n");
  }
  for (const output of renderBundleTemplateOutputs(bundle)) {
    if (/\/(?:story\/EXAMPLES|milestone\/RESEARCH)\.md$/u.test(output.path)) out[output.path] = output.content;
  }
  return out;
}
// The sentences only an operator-aware fragment holds: none of discovery's bodies says them.
const sentencesOf = (text) => flat(text).split(/(?<=[.:;])\s+/u).filter((sentence) => sentence.length > 50);
function operatorAwareOnly() {
  const read = (dir) => readdirSync(path.join(FRAGMENTS, dir)).map((name) => readFileSync(path.join(FRAGMENTS, dir, name), "utf8").replace(/<!-- fragment:[^>]+ -->/gu, ""));
  const discovery = flat(read("discovery").join("\n"));
  return [...new Set(read("operator-aware").flatMap(sentencesOf))].filter((sentence) => !discovery.includes(sentence));
}
// THE JUDGEMENT: what, in a render for `config`, is not today. `readText` plants a leak, and is read
// by the render under test and by the stripped render alike.
// The package descriptors are read apart from the members' texts, so each render is handed its own.
function notToday(config, readText = readAssetText) {
  const describe = (edit) => readDescriptor({ readFragment: (assetClass) => JSON.parse(edit(assetClass, readText(assetClass, "bundle.json"))) });
  const render = artefactsOf(loadBundle({ config, readText, descriptor: describe((_, text) => text) }));
  const stripped = artefactsOf(loadBundle({ config, readText, descriptor: describe((assetClass, text) => (assetClass === PRACTICE ? withoutOperatorAware(text) : text)) }));
  const only = operatorAwareOnly();
  const found = [];
  for (const [name, text] of Object.entries(render)) {
    if (text !== stripped[name]) found.push(`${name}: differs from a render without the operator-aware practice`);
    const leaked = only.find((sentence) => flat(text).includes(sentence));
    if (leaked) found.push(`${name}: holds operator-aware prose — ${leaked.slice(0, 80)}`);
    if (text.includes("<!-- slot:")) found.push(`${name}: leaves a slot marker behind`);
  }
  return found;
}
const CLASSIC_CONFIGS = [["{ enabled: true }", { enabled: true }], ["{ enabled: true, operatorAware: false }", { enabled: true, operatorAware: false }]];
const editing = (match, edit) => (assetClass, file) => (match(assetClass, file) ? edit(readAssetText(assetClass, file)) : readAssetText(assetClass, file));
const inPractice = (name) => (assetClass, file) => assetClass === PRACTICE && file === name;
const inCore = (name) => (assetClass, file) => assetClass !== PRACTICE && file === name;
const renaming = (id, practice) => (text) => {
  const descriptor = JSON.parse(text);
  return JSON.stringify({ ...descriptor, members: descriptor.members.map((member) => (member.id === id ? { ...member, practice } : member)) });
};

const exampleCodes = (findings) => findings.filter((finding) => finding.code.startsWith("example-"));
const overBudgetMaps = (findings) => findings.filter((finding) => finding.code === "doc-over-budget" && finding.path.endsWith(EXAMPLES_DOC));

export const archTests = [
  {
    name: "arch/193 FF-19204: off renders none of it (outline: 2 configs)",
    run: () => {
      for (const [label, examples] of CLASSIC_CONFIGS) {
        assert.deepEqual(notToday({ work: { examples } }), [], label);
      }
      // Non-vacuity: with the switch on, the same judgement finds the practice's prose.
      const on = notToday({ work: { examples: { enabled: true, operatorAware: true } } });
      for (const name of ["refine (claude)", "refine (codex)", "aof-product-owner (claude)", "aof-researcher (codex)"]) {
        assert.ok(on.some((entry) => entry.startsWith(`${name}: differs`)), `the switch on changes ${name}`);
      }
      assert.ok(operatorAwareOnly().length > 20, "the practice holds sentences of its own to look for");
    },
  },
  {
    name: "arch/193 FF-19204: each planted leak turns the control red (outline: 4 plants)",
    run: () => {
      const config = { work: { examples: { enabled: true } } };
      const plants = [
        ["an operator-aware fragment that names the discovery practice", editing(inPractice("bundle.json"), renaming("operator-aware-refine-beat", "discovery")), "refine (claude)"],
        ["a sentence of the operator-aware beat written into core's refine source", editing(inCore("commands/refine.md"), (text) => `${text}\nA question the PO cannot place is \`domain\`, so it is looked up before anyone is asked.\n`), "refine (claude)"],
        ["a template variant installed without asking the switch", editing(inPractice("bundle.json"), renaming("operator-aware-examples", "discovery")), ".aof/templates/work/story/EXAMPLES.md"],
        ["a slot that leaves a marker line behind when nothing fills it", editing(inCore("agents/aof-researcher.md"), (text) => text.replace("<!-- slot:ownership.research -->\n", "<!-- slot:ownership.research -->\n<!-- slot:ownership.notes --> \n")), "aof-researcher (claude)"],
      ];
      for (const [label, readText, artefact] of plants) {
        const found = notToday(config, readText);
        assert.ok(found.some((entry) => entry.startsWith(`${artefact}:`)), `${label}: the control names ${artefact} — ${JSON.stringify(found)}`);
      }
    },
  },
  {
    name: "arch/134 FF-13403: the gate off yields no example finding, no map on the row and no refusal (outline: 5 configs)",
    run: async () => {
      for (const [label, examples] of OFF) {
        await withExamplesProject(examples === undefined ? {} : { examples }, async (fx) => {
          await fx.writeMap(fx.s04, WORST);
          await writeTasks(fx, WORST_CONTRACT);
          const findings = await doctorWork(fx.workDir, fx.config, undefined, { now: NOW, projectRoot: fx.project, projectsDir: fx.projectsDir });
          assert.deepEqual(exampleCodes(findings), [], `${label}: no example-* finding`);
          assert.deepEqual(overBudgetMaps(findings), [], `${label}: no doc-over-budget names EXAMPLES.md`);
          const row = (await snapshotOf(fx)).items.find((item) => item.ref === "134/04");
          assert.equal(row.extensions?.examples ?? null, null, label);
          assert.equal(EXAMPLES_DOC in row.docSizes, false, label);
          const door = fx.cli("work", "continue", "134/04", "--json");
          assert.equal(door.json?.ok, true, `${label}: the continue is not refused — ${door.stdout || door.stderr}`);
        }).catch((error) => { error.message = `${label}: ${error.message}`; throw error; });
      }
    },
  },
  {
    name: "arch/134 FF-13403: the same fixture with the gate on is caught, so the control is not vacuous",
    run: () => withExamplesProject({ examples: { enabled: true } }, async (fx) => {
      await fx.writeMap(fx.s04, WORST);
      await writeTasks(fx, WORST_CONTRACT);
      const findings = await doctorWork(fx.workDir, fx.config, undefined, { now: NOW, projectRoot: fx.project, projectsDir: fx.projectsDir });
      const codes = new Set(exampleCodes(findings).filter((finding) => finding.message.startsWith("134/04:")).map((finding) => finding.code));
      // WORST cites no finding, and stays as 134 wrote it: 193/01's code is held by FF-19202's own
      // fixture below, so this control keeps proving what it proved.
      const cited = ["example-research-unanchored"];
      assert.deepEqual([...codes].sort(), EXAMPLE_LANE_CODES.filter((code) => !cited.includes(code)).sort(), "every example-* code is reported for 134/04");
      assert.equal(overBudgetMaps(findings).length, 1, "one doc-over-budget names EXAMPLES.md");
      const door = fx.cli("work", "continue", "134/04", "--json");
      assert.equal(door.json?.code, "examples-question-open", door.stdout || door.stderr);
    }),
  },
  {
    name: "arch/134 FF-13403: the gate off leaves the doctor's findings exactly those of a stream with no map",
    run: () => withExamplesProject({}, async (fx) => {
      const run = async () => {
        await pinMtimes(fx.s04.dir, NOON);
        return doctorWork(fx.workDir, fx.config, undefined, { now: NOW, projectRoot: fx.project, projectsDir: fx.projectsDir });
      };
      await fx.writeMap(fx.s04, WORST);
      const withMap = await run();
      await rm(path.join(fx.s04.dir, EXAMPLES_DOC));
      const withoutMap = await run();
      assert.ok(withMap.length > 0, "non-vacuity: the stream has findings to compare");
      assert.deepEqual(withMap, withoutMap);
    }),
  },

  // ══ 193/01 · 03_a-story-is-not-built-on-a-fact-nobody-cited.feature ══
  {
    name: "arch/193 FF-19202: off is still today (outline: 2 configs)",
    run: async () => {
      for (const [label, examples] of [["absent", undefined], ["false", { enabled: false }]]) {
        await withCited({ examples: examples === undefined ? ABSENT : examples, map: CITES_F3, research: HOLDS_F1 }, async (fx) => {
          const row = (await snapshotOf(fx)).items.find((item) => item.ref === "193/01");
          const findings = await doctorWork(fx.workDir, fx.config, undefined, { now: NOW, projectRoot: fx.project, projectsDir: fx.projectsDir });
          const door = fx.cli("work", "continue", "193/01", "--json");
          const refusal = door.json?.code === "examples-question-open" ? { code: door.json.code, message: door.json.error } : null;
          assert.deepEqual(readWithGateOff({ row, findings, refusal }), [], label);
          assert.equal(door.json?.ok, true, `${label}: the continue is not refused — ${door.stdout || door.stderr}`);
        }).catch((error) => { error.message = `${label}: ${error.message}`; throw error; });
      }
      // Non-vacuity: the same fixture with the gate on is caught by all three readers.
      await withCited({ map: CITES_F3, research: HOLDS_F1 }, async (fx) => {
        const row = (await snapshotOf(fx)).items.find((item) => item.ref === "193/01");
        const findings = await doctorWork(fx.workDir, fx.config, undefined, { now: NOW, projectRoot: fx.project, projectsDir: fx.projectsDir });
        const door = fx.cli("work", "continue", "193/01", "--json");
        assert.equal(readWithGateOff({ row, findings, refusal: { code: door.json?.code, message: door.json?.error ?? "" } }).length, 3);
      });
    },
  },
  {
    name: "arch/193 FF-19202: each planted read turns the control red (outline: 3 readers)",
    run: () => withCited({ examples: { enabled: false }, map: CITES_F3, research: HOLDS_F1 }, async (fx) => {
      const off = fx.config;
      const item = { ref: fx.s04.ref, type: "story", dir: fx.s04.dir };
      const { examplesFindings, examplesGroup } = createDoctorExamples({ examplesEnabledFromConfig: gate });
      const collectAnswers = async () => [];
      // The literal row a probe that reached the disk would hand the lane.
      const carried = { ...item, meta: { status: "in-progress" }, extensions: { examples: { text: CITES_F3, answers: [], research: HOLDS_F1 } } };

      // The real readers, gate off: nothing read.
      const { storyProbe } = createExamplesStoryProbe({ examplesEnabledFromConfig: gate, collectAnswers });
      assert.deepEqual(readWithGateOff({ row: { ...item, extensions: (await storyProbe(item, { config: off, fileState }))?.extensions ?? null } }), [], "the real probe");
      assert.deepEqual(readWithGateOff({ findings: examplesGroup({ items: [carried] }, { config: off }) }), [], "the real lane");
      assert.deepEqual(readWithGateOff({ refusal: await doorRefusal(createExamplesBuildDoor({ examplesEnabledFromConfig: gate, examplesFindings, collectAnswers }), fx, off) }), [], "the real door");

      // 1. A story probe that reads the research document unconditionally.
      const plantedProbe = async (story, { config, fileState: state }) => {
        const research = await state(researchDocOf(story).path);
        if (!gate(config)) return { extensions: { examples: { text: null, answers: [], research: research.text } } };
        return storyProbe(story, { config, fileState: state });
      };
      const probed = readWithGateOff({ row: { ...item, extensions: (await plantedProbe(item, { config: off, fileState })).extensions } });
      assert.deepEqual(probed, ["the story row 193/01 carries the research document's text"], "a probe that reads unconditionally");

      // 2. A lane that judges citations before it asks the gate.
      const plantedLane = (snapshot, ctx) => [
        ...snapshot.items.flatMap((row) => examplesFindings({ ref: row.ref, status: row.meta.status, dir: row.dir, text: row.extensions.examples.text, answers: [], research: row.extensions.examples.research })
          .filter((finding) => finding.code === "example-research-unanchored")),
        ...examplesGroup(snapshot, ctx),
      ];
      const judged = readWithGateOff({ findings: plantedLane({ items: [carried] }, { config: off }) });
      assert.equal(judged.length, 1, "a lane that judges before the gate");
      assert.ok(judged[0].includes("E1 (EXAMPLES.md line 3) is researched F3"), judged[0]);

      // 3. A door that reads the research document before it asks the gate.
      const plantedDoor = createExamplesBuildDoor({ examplesEnabledFromConfig: () => true, examplesFindings, collectAnswers });
      const refused = readWithGateOff({ refusal: await doorRefusal(plantedDoor, fx, off) });
      assert.equal(refused.length, 1, "a door that reads before the gate");
      assert.ok(refused[0].includes("example-research-unanchored"), refused[0]);
    }),
  },
];
