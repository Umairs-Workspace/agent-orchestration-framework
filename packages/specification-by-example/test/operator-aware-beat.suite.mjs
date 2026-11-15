// Traceability wiring for milestone 193 / story 04 — discovery researches before it asks.
//
// Covers EVERY @executable scenario in
//   tasks/00_the-beat-tells-a-fact-from-a-decision.feature
//   tasks/01_a-fact-is-researched-before-anyone-is-asked.feature
//   tasks/02_what-research-settles-comes-back-as-one-batch.feature
//   tasks/03_every-question-comes-with-a-recommendation.feature
//   tasks/04_on-renders-it-and-off-renders-none-of-it.feature
// except FF-19204's two, which are `test/arch/examples/acd-examples-off-is-today.test.mjs`.
//
// THE TEXTS UNDER TEST ARE RENDERS. A fixture project is written with its `work.examples` and
// rendered by the CLI (`aof work init --runtime claude,codex`) under its own `AOF_GLOBAL_HOME`, in a
// subprocess: a package suite imports nothing of core. ON, CLASSIC and NONE are rendered once each
// and read into memory; the scenarios that change a project's config render their own. The checks
// pin content, not wording, as 134/05's suite does.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseExampleMap, readFindings, readMapToken } from "@aof/specification-by-example/map";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const cliPath = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");
const ON = Object.freeze({ enabled: true, operatorAware: true });
const CLASSIC = Object.freeze({ enabled: true });
const ABSENT = Symbol("absent");

const FILES = Object.freeze({
  refine: ".claude/commands/aof/refine.md",
  po: ".claude/agents/aof-product-owner.md",
  architect: ".claude/agents/aof-architect.md",
  researcher: ".claude/agents/aof-researcher.md",
  codexSkill: ".agents/skills/aof-refine/SKILL.md",
  codexProcedure: ".agents/skills/aof-refine/procedure.md",
  codexPo: ".codex/agents/aof-product-owner.toml",
  codexArchitect: ".codex/agents/aof-architect.toml",
  codexResearcher: ".codex/agents/aof-researcher.toml",
  examples: ".aof/templates/work/story/EXAMPLES.md",
  research: ".aof/templates/work/milestone/RESEARCH.md",
});

// A scratch project `P` whose `work.examples` is `examples`, with its own global home.
function scratch(examples, extra = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), "aof-operator-aware-"));
  const project = path.join(root, "P");
  const home = path.join(root, "home");
  mkdirSync(path.join(project, ".aof"), { recursive: true });
  mkdirSync(path.join(project, "wiki", "work"), { recursive: true });
  mkdirSync(home, { recursive: true });
  const work = { dir: "./wiki/work", ...(examples === ABSENT ? {} : { examples }), ...extra };
  writeFileSync(path.join(project, ".aof", "aof.config.json"), `${JSON.stringify({ name: "fixture", resources: [], work }, null, 2)}\n`, "utf8");
  const env = { ...process.env, AOF_GLOBAL_HOME: home, NODE_NO_WARNINGS: "1" };
  const cli = (...args) => {
    const result = spawnSync(process.execPath, [cliPath, ...args], { cwd: project, encoding: "utf8", env });
    let json = null;
    try { json = JSON.parse(result.stdout); } catch { json = null; }
    return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "", json };
  };
  const read = (rel) => readFileSync(path.join(project, rel), "utf8").replace(/\r\n/gu, "\n");
  const config = () => JSON.parse(read(".aof/aof.config.json"));
  const setConfig = (value) => writeFileSync(path.join(project, ".aof", "aof.config.json"), `${JSON.stringify(value, null, 2)}\n`, "utf8");
  const render = () => {
    const rendered = cli("work", "init", "--runtime", "claude,codex");
    assert.equal(rendered.status, 0, rendered.stdout || rendered.stderr);
  };
  return { root, project, cli, read, config, setConfig, render, done: () => rmSync(root, { recursive: true, force: true }) };
}
const withScratch = (examples, body, extra) => {
  const fx = scratch(examples, extra);
  try {
    return body(fx);
  } finally {
    fx.done();
  }
};

// ON, CLASSIC and NONE, each rendered once and read into memory.
const renders = new Map();
function renderOf(name) {
  if (!renders.has(name)) {
    const examples = { ON, CLASSIC, NONE: ABSENT }[name];
    renders.set(name, withScratch(examples, (fx) => {
      fx.render();
      return Object.fromEntries(Object.entries(FILES).map(([key, rel]) => [key, fx.read(rel)]));
    }));
  }
  return renders.get(name);
}

const flat = (text) => text.replace(/\s+/gu, " ");
const between = (text, from, to, what) => {
  const start = text.indexOf(from);
  const end = to == null ? text.length : text.indexOf(to, start + 1);
  assert.ok(start >= 0 && end > start, `${what} is found`);
  return text.slice(start, end);
};
// The story Contract, its discovery passage (the paragraph naming the gate, to the section's next
// bold-led paragraph), and the regions the scenarios name, for either runtime's refine text.
const contractOf = (refine) => between(refine, "- **story — Contract (Three Amigos):**", "**`--autonomous` — cascade", "the story Contract");
function passageOf(refine) {
  const contract = contractOf(refine);
  const gate = contract.indexOf("`work.examples.enabled`");
  assert.ok(gate >= 0, "the Contract names the gate");
  const start = contract.lastIndexOf("\n\n", gate) + 2;
  const next = /\n\n\s*\*\*/u.exec(contract.slice(gate));
  return contract.slice(start, next ? gate + next.index : contract.length);
}
const bulletOf = (passage, lead) => {
  const start = passage.indexOf(`  - **${lead}`);
  assert.ok(start >= 0, `the bullet "${lead}" is found`);
  const next = passage.indexOf("\n  - ", start + 1);
  return passage.slice(start, next === -1 ? passage.length : next);
};
const formulationOf = (refine) => between(contractOf(refine), "**With an applicable example map, formulate from it.**", "**Under orchestrated mode", "the formulation");
const autonomousOf = (refine) => between(refine, "**`--autonomous` — cascade", "<amendment_ratification>", "the --autonomous block");
const outputOf = (refine) => between(refine, "<output>", "</output>", "the output section");
const rolesOf = (refine) => between(refine, "you are the architect, the QA and the developer in turn.", "\n\n", "the roles sentence");
const ownershipOf = (brief) => between(brief, "<ownership>", "</ownership>", "the ownership block");
const claudeRefine = () => renderOf("ON").refine;
const codexRefine = () => `${renderOf("ON").codexSkill}\n${renderOf("ON").codexProcedure}`;
const passage = () => passageOf(claudeRefine());
const says = (text, patterns, what) => {
  const body = flat(text);
  for (const pattern of patterns) assert.match(body, pattern, `${what} says ${pattern}`);
};
// A region that refers to a question as a `business` (or business-rule) question.
const BUSINESS_QUESTION = /\bbusiness(?:-rule)?`? questions?\b|`business` question|label(?:s|led)? (?:a |every )?question `?business/iu;

// ══ 00_the-beat-tells-a-fact-from-a-decision.feature ══
const labelTests = [
  {
    name: "examples/193-04 00 E1 · a question the PO cannot place is labelled a fact",
    run: () => says(passage(), [
      /labels every question `domain`, `policy` or `technical`/u,
      /A `domain` question is a fact about the world/u,
      /A `policy` question is a choice only the operator or their client can make/u,
      /A question the PO cannot place is `domain`/u,
    ], "the passage"),
  },
  {
    name: "examples/193-04 00 E2 · a decision is asked, and never defaulted",
    run: () => says(passage(), [
      /`policy` question is asked of a person and never takes a default/u,
      /`technical` question may still take a documented default, recorded as `defaulted <pointer>`/u,
    ], "the passage"),
  },
  {
    name: "examples/193-04 00 E3 · the architect relabels a fact as a fact",
    run: () => {
      const brief = ownershipOf(renderOf("ON").architect);
      for (const [what, text] of [["the passage", passage()], ["the architect brief", brief]]) {
        says(text, [/reviews? every (?:question the PO labelled )?`technical`/u, /really a fact about the world as `domain`/u, /really a choice as `policy`/u], what);
      }
    },
  },
  {
    name: "examples/193-04 00 the PO brief carries the three labels and the new default",
    run: () => says(ownershipOf(renderOf("ON").po), [
      /Label every question `domain`, `policy` or `technical`/u,
      /A question you cannot place is `domain`/u,
      /never write `researched` without a finding that names its source/u,
    ], "the PO brief"),
  },
  {
    name: "examples/193-04 00 with the switch on, nothing teaches the old label",
    run: () => {
      const { po, architect } = renderOf("ON");
      for (const [what, text] of [["the passage", passage()], ["the PO brief", ownershipOf(po)], ["the architect brief", ownershipOf(architect)]]) {
        assert.doesNotMatch(flat(text), BUSINESS_QUESTION, `${what} teaches no business label`);
      }
      says(passage(), [/A map written with `business` still reads, as `policy`/u], "the passage");
      const classic = passageOf(renderOf("CLASSIC").refine);
      const sentences = flat(classic).split(/(?<=[.:])\s+/u).filter((sentence) => sentence.length > 60);
      const shared = sentences.filter((sentence) => /\bbusiness\b/u.test(sentence) && flat(passage()).includes(sentence));
      assert.deepEqual(shared, [], "no sentence of the classic beat that labels a question stands beside the new one");
    },
  },
  {
    name: "examples/193-04 00 striking is unchanged",
    run: () => says(passage(), [
      /strike every one the record already answers/u,
      /Before any question reaches a person/u,
      /A map with no `policy` question left is a good outcome/u,
    ], "the passage"),
  },
  {
    name: "examples/193-04 00 the label specimens the passage teaches are ones the parser reads (outline: 3 labels)",
    run: () => {
      for (const label of ["domain", "policy", "technical"]) {
        assert.ok(passage().includes(`\`${label}\``), `the passage teaches \`${label}\``);
        const map = parseExampleMap(`## R1 · a rule\n- E1 · an example [proposed]\n\n## Questions\n- Q1 · ${label} · open · a question?\n`);
        assert.deepEqual([map.questions[0]?.class, map.malformed], [label, []], label);
      }
    },
  },
  {
    name: "examples/193-04 00 the passage still restates no line of the grammar",
    run: () => {
      assert.ok(passage().includes("`.aof/templates/work/story/EXAMPLES.md`"), "it points at the story template");
      assert.doesNotMatch(passage(), /^\s*(## R|- E|- Q)\d/mu, "it holds no rule heading, example line or question line");
      const classes = parseExampleMap(renderOf("ON").examples).questions.map((question) => question.class);
      assert.ok(classes.includes("domain") && classes.includes("policy"), `the template shows a domain and a policy question: ${classes}`);
    },
  },
];

// ══ 01_a-fact-is-researched-before-anyone-is-asked.feature ══
const researchStep = () => bulletOf(passage(), "Research a fact before anyone is asked.");
const readStep = () => bulletOf(passage(), "Read who is being asked.");
const researchTests = [
  {
    name: "examples/193-04 01 E4 · below expert, a fact goes to research and is not asked",
    run: () => says(researchStep(), [
      /a `domain` question whose domain the operator knows at `working` or `new` goes to the researcher before any person is asked/u,
      /makes it `researched F<n>`, and the examples it supports are labelled with the same finding/u,
      /not put to the operator as a question of its own/u,
    ], "the research step"),
  },
  {
    name: "examples/193-04 01 E5 · an expert is asked directly",
    run: () => says(researchStep(), [/at `expert` it is asked directly, with no research — asked of the operator by its token/u], "the research step"),
  },
  {
    name: "examples/193-04 01 E6 · a fact research cannot settle becomes a decision",
    run: () => says(researchStep(), [
      /A question no source settles, or whose sources disagree, or that the finding shows to be a choice, is relabelled `policy`/u,
      /asked with the finding as its background and a recommendation/u,
    ], "the research step"),
  },
  {
    name: "examples/193-04 01 E7 · with no profile, every domain is new and the hand-back says so",
    run: () => {
      says(readStep(), [/An undeclared profile makes every domain `new`/u], "the passage");
      says(outputOf(claudeRefine()), [/when the operator's profile is undeclared, names that gap and the `aof work init-config --operator-role` command that closes it, in one line/u], "the output");
    },
  },
  {
    name: "examples/193-04 01 the session reads the profile and the domains once",
    run: () => {
      says(readStep(), [
        /Read the operator's profile once per refine, from `aof project show --json`/u,
        /Read the item's domains from `domains:` in the record doc's frontmatter/u,
        /When the record doc names none, the PO adds `domains:` to its frontmatter, reusing the profile's own domain names where one fits/u,
        /subject areas the operator may or may not know, not the feature-area tags of `work\.tags\.domains`/u,
      ], "the read step");
      assert.ok(!passage().includes("~/.aof/aof.config.json"), "it does not send the session to the global config file");
    },
  },
  {
    name: "examples/193-04 01 the level decides what happens to a fact (outline: 4 levels)",
    run: () => says(researchStep(), [
      /at `expert` it is asked directly, with no research/u,
      /at `working` it is researched, then confirmed in the batch, briefly/u,
      /at `new`, or in a domain not listed, it is researched, then put in the batch with background first/u,
    ], "the research step"),
  },
  {
    name: "examples/193-04 01 a question takes the level of its domain",
    run: () => says(readStep(), [
      /The PO attributes each `domain` question to one of the item's domains/u,
      /one it cannot attribute takes the lowest level among them, and `new` when the item names none/u,
    ], "the read step"),
  },
  {
    name: "examples/193-04 01 one researcher pass, and one writer of the research document",
    run: () => says(researchStep(), [
      /The domain questions of every story being refined go to the researcher together, in one pass/u,
      /in orchestrated mode that is one `aof-researcher`, never one per story/u,
      /in solo mode the session plays the researcher itself/u,
      /Only that pass writes findings into the research document/u,
    ], "the research step"),
  },
  {
    name: "examples/193-04 01 the researcher brief owns the finding",
    run: () => {
      const brief = renderOf("ON").researcher;
      says(ownershipOf(brief), [
        /Each domain question gets one finding, in the research template's form/u,
        /a URL, or a named document and its section, for a fact about the world; `path:line` for a fact in the repository/u,
        /What the model recalls is not a source/u,
        /reported as not settled, with what was consulted, and never guessed/u,
      ], "the researcher brief");
      says(brief, [/You REPORT; you do NOT decide/u], "the researcher brief");
    },
  },
  {
    name: "examples/193-04 01 the role reaches every PO and researcher prompt, the Decide stage's included",
    run: () => says(rolesOf(claudeRefine()), [
      /every PO and researcher prompt the session writes opens with the operator's role/u,
      /the Decide stage's researcher included/u,
      /a solo session holds the role while it plays those roles/u,
      /`aof project show --json`/u,
      /profile is declared/u,
    ], "the roles sentence"),
  },
  {
    name: "examples/193-04 01 the briefs pitch their work at the role and the level they were given",
    run: () => {
      const { po, researcher } = renderOf("ON");
      says(ownershipOf(po), [/Your prompt may open with the operator's role: write for that reader/u, /Pitch each question at the level given for its domain/u], "the PO brief");
      says(ownershipOf(researcher), [/Your prompt may open with the operator's role/u, /write each finding for that reader/u], "the researcher brief");
    },
  },
  {
    name: "examples/193-04 01 a decision is still never defaulted, and a finding is not a default",
    run: () => {
      says(passage(), [/`policy` question is asked of a person and never takes a default/u, /A finding with no source settles nothing/u], "the passage");
      says(autonomousOf(claudeRefine()), [/a `policy` question from a story's example map never takes a default/u], "the --autonomous block");
    },
  },
];

// ══ 02_what-research-settles-comes-back-as-one-batch.feature ══
const batch = () => bulletOf(passage(), "What research settled comes back as one batch.");
const batchTests = [
  {
    name: "examples/193-04 02 E8 · a story's researched examples are one question",
    run: () => says(batch(), [
      /researched examples are put to the operator as one question, never one question each/u,
      /lists each example with its finding and that finding's source/u,
      /answers that they have no objection, or names what is wrong/u,
    ], "the batch paragraph"),
  },
  {
    name: "examples/193-04 02 E9 · an objection reopens the example as a decision",
    run: () => says(batch(), [
      /An example the operator objects to goes back to `proposed`/u,
      /its question is relabelled `policy` and asked by its own token/u,
      /the other examples in the batch stand/u,
    ], "the batch paragraph"),
  },
  {
    name: "examples/193-04 02 E10 · a driven session asks the batch once per story, and waits",
    run: () => says(batch(), [
      /`AOF_RUN_ID`, the batch is one ask per story/u,
      /asked after that story's `policy` questions/u,
      /a batch left unanswered leaves the story at the Contract gate, with no `tasks\/` written/u,
    ], "the batch paragraph"),
  },
  {
    name: "examples/193-04 02 the batch carries no map token",
    run: () => says(batch(), [/opens with the story ref and names itself the researched examples/u, /carries no `Q<n>` or `E<n>` token/u], "the batch paragraph"),
  },
  {
    name: "examples/193-04 02 the batch's specimen question anchors nothing",
    run: () => {
      const specimens = [...batch().matchAll(/`(\d+\/\d+ · [^`]+)`/gu)].map((match) => match[1]);
      assert.equal(specimens.length, 1, `one specimen: ${specimens}`);
      assert.equal(readMapToken(specimens[0]), null);
    },
  },
  {
    name: "examples/193-04 02 the batch is pitched at the level (outline: 2 levels)",
    run: () => says(batch(), [/at `working` each example comes as one line with its source/u, /at `new` each comes after a background line for its rule/u], "the batch paragraph"),
  },
  {
    name: "examples/193-04 02 a story with nothing researched has no batch",
    run: () => says(batch(), [/A story whose map holds no researched example is asked no batch/u], "the batch paragraph"),
  },
  {
    name: "examples/193-04 02 the cascade asks the batch at its one stop",
    run: () => says(autonomousOf(claudeRefine()), [
      /each story's batch of researched examples is asked at that same end review, with that story's other questions/u,
      /The review surface lists what research settled, apart from the questions asked and the defaults taken/u,
    ], "the --autonomous block"),
  },
  {
    name: "examples/193-04 02 the doctor is still asked after the answers",
    run: () => says(bulletOf(passage(), "Then ask the doctor."), [
      /run `aof work doctor <story> --json`/u,
      /Any error-severity `example-\*` finding stops the Contract stage before the first headline Scenario/u,
    ], "the passage"),
  },
];

// ══ 03_every-question-comes-with-a-recommendation.feature ══
const asking = () => bulletOf(passage(), "The main session asks");
const driven = () => bulletOf(passage(), "In a driven session, one question per ask.");
const recommendationTests = [
  {
    name: "examples/193-04 03 E11 · below expert, a question carries background and then the pick",
    run: () => says(asking(), [
      /Every question carries a line that begins `I would pick:`, naming one of the question's own options and why/u,
      /the tool's first option is that pick/u,
      /Below `expert`, a line that begins `Background:` comes before it/u,
    ], "the asking bullet"),
  },
  {
    name: "examples/193-04 03 E12 · an expert gets the pick and no background",
    run: () => says(asking(), [/A question in a domain the operator knows at `expert` carries no `Background:` line, and still carries `I would pick:`/u], "the asking bullet"),
  },
  {
    name: "examples/193-04 03 E13 · a driven ask carries background inside its length",
    run: () => {
      const text = flat(driven());
      says(text, [/a line that begins `Background:` comes after that first line and before `Decision needed:`/u, /the whole, background included, stays under 1,500 characters/u], "the driven paragraph");
      const order = ["`Decision needed:`", "`Options:`", "`I would pick:`", "`What the answer changes:`"].map((label) => text.lastIndexOf(label));
      assert.ok(order.every((at) => at >= 0) && order.every((at, index) => index === 0 || at > order[index - 1]), `the four labels, in order: ${order}`);
    },
  },
  {
    name: "examples/193-04 03 background says three things, with a source",
    run: () => says(asking(), [
      /what the term means, why it matters to this build, and what is normal in the industry/u,
      /naming its source, and the finding when research ran/u,
    ], "the asking bullet"),
  },
  {
    name: "examples/193-04 03 the recommendation is on every kind of question discovery asks (outline: 3 kinds)",
    run: () => says(asking(), [/a question asked by its `Q<n>` token, a proposed example put to a person by its `E<n>` token, and the batch of researched examples/u], "the asking bullet"),
  },
  {
    name: "examples/193-04 03 the question asks the operator to confirm or override",
    run: () => says(asking(), [/so the operator can confirm the pick or override it/u, /each option still says what it costs/u], "the asking bullet"),
  },
  {
    name: "examples/193-04 03 a question takes the level of the domain it bears on",
    run: () => says(asking(), [/A `policy` question takes the level of the domain it bears on/u, /a question in a domain the profile does not list is treated as `new`/u], "the asking bullet"),
  },
  {
    name: "examples/193-04 03 the token still opens the question",
    run: () => {
      says(asking(), [/Each question opens with its token/u], "the asking bullet");
      says(driven(), [/The question opens with its token/u], "the driven paragraph");
      const specimens = [...`${asking()}\n${driven()}`.matchAll(/`(\d+\/\d+ [QE][1-9]\d* · [^`]+)`/gu)].map((match) => match[1]);
      assert.ok(specimens.length >= 3, `the worked tokens: ${specimens}`);
      for (const specimen of specimens) {
        const [ref, id] = specimen.split(" ");
        assert.deepEqual(readMapToken(specimen), { storyRef: ref, id }, specimen);
      }
    },
  },
  {
    name: "examples/193-04 03 the PO brief writes questions this way",
    run: () => says(ownershipOf(renderOf("ON").po), [
      /Each question you return carries its recommendation: a line that begins `I would pick:`/u,
      /Below `expert`, its background comes first/u,
      /You do not ask the map's questions yourself\. Return them/u,
    ], "the PO brief"),
  },
  {
    name: "examples/193-04 03 the loop's general instruction is left as it is",
    run: () => {
      const driver = readFileSync(path.join(repoRoot, "packages", "execution", "src", "session-driver.mjs"), "utf8");
      const at = driver.indexOf("\"Decision needed:\", \"Options:\", \"I would pick:\" and \"What the answer changes:\"");
      assert.ok(at >= 0, "the instruction names the four labels");
      assert.ok(!driver.includes("Background:"), "and no Background: line");
    },
  },
];

// ══ 04_on-renders-it-and-off-renders-none-of-it.feature ══
const REGIONS = Object.freeze({
  "discovery passage": passageOf,
  "formulation paragraph": formulationOf,
  "\"--autonomous\" block": autonomousOf,
  "output section": outputOf,
});
const HALVES = Object.freeze([
  ["refine", [/`domain`, `policy` or `technical`/u, /Research a fact before anyone is asked/u, /comes back as one batch/u, /`I would pick:`/u, /`Background:`/u]],
  ["po", [/`domain`, `policy` or `technical`/u, /A question you cannot place is `domain`/u, /`I would pick:`/u]],
  ["researcher", [/Each domain question gets one finding/u, /names its source/u]],
  ["architect", [/really a fact about the world as `domain`/u]],
]);
const updateOf = (fx) => {
  const updated = fx.cli("work", "update");
  assert.equal(updated.status, 0, updated.stdout || updated.stderr);
};

const renderTests = [
  {
    name: "examples/193-04 04 a project with the switch on is given the operator-aware beat, in place of the classic one",
    run: () => {
      assert.ok(passage().includes("**Research a fact before anyone is asked.**"), "the beat is there");
      assert.equal(claudeRefine().split("**Research a fact before anyone is asked.**").length - 1, 1, "once");
      assert.ok(!claudeRefine().includes("relabels one that is\n    really policy as `business`"), "the classic labelling sentence is not");
      assert.ok(!flat(claudeRefine()).includes("Label every question `business` or `technical`"));
    },
  },
  {
    name: "examples/193-04 04 the practice is declared with both keys, and the update lists it",
    run: () => {
      for (const [examples, on] of [[ON, true], [CLASSIC, false]]) {
        withScratch(examples, (fx) => {
          fx.render();
          const practices = fx.cli("work", "update", "--json").json?.practices ?? [];
          const operatorAware = practices.find((practice) => practice.id === "operator-aware");
          assert.deepEqual(operatorAware?.keys, ["work.examples.enabled", "work.examples.operatorAware"]);
          assert.equal(operatorAware.on, on);
          assert.equal(practices.find((practice) => practice.id === "discovery")?.on, true);
        });
      }
    },
  },
  {
    name: "examples/193-04 04 with the switch on, no rendered region still says \"business\" (outline: 9 regions)",
    run: () => {
      for (const [runtime, refine] of [["claude", claudeRefine()], ["codex", codexRefine()]]) {
        for (const [region, of] of Object.entries(REGIONS)) {
          assert.doesNotMatch(flat(of(refine)), BUSINESS_QUESTION, `${runtime} ${region}`);
        }
      }
      const rules = renderOf("ON").codexSkill;
      const entry = rules.split("\n").find((line) => line.includes("require actual answers"));
      assert.ok(entry, "the Codex skill's entry rules are found");
      assert.doesNotMatch(entry, /business/iu, "codex skill entry's rules");
      assert.match(entry, /^Policy questions require actual answers/u);
    },
  },
  {
    name: "examples/193-04 04 the formulation carries a researched example as it carries an agreed one",
    run: () => says(formulationOf(claudeRefine()), [/Every `confirmed`, `stated` or `researched` example must be carried this way, under its own rule/u, /`example-untraced`/u], "the formulation"),
  },
  {
    name: "examples/193-04 04 each runtime's render carries its half (outline: 8 artefacts)",
    run: () => {
      const on = renderOf("ON");
      const texts = { claude: { refine: on.refine, po: on.po, researcher: on.researcher, architect: on.architect }, codex: { refine: codexRefine(), po: on.codexPo, researcher: on.codexResearcher, architect: on.codexArchitect } };
      for (const runtime of ["claude", "codex"]) {
        for (const [artefact, patterns] of HALVES) says(texts[runtime][artefact], patterns, `${runtime} ${artefact}`);
      }
    },
  },
  {
    name: "examples/193-04 04 the Codex beat asks through its own question tool",
    run: () => {
      const codex = passageOf(codexRefine());
      for (const lead of ["Research a fact before anyone is asked.", "What research settled comes back as one batch."]) {
        assert.match(flat(bulletOf(codex, lead)), /the native question tool/u, lead);
      }
      assert.ok(!codex.includes("AskUserQuestion"), "no sentence of the Codex beat names AskUserQuestion");
      assert.match(flat(codex), /structured `needs_input` phase result/u);
    },
  },
  {
    name: "examples/193-04 04 a project with the switch off is given the beat it has today",
    run: () => {
      // Byte-for-byte against a render without the practice is FF-19204's; here, nothing of it leaks.
      const classic = renderOf("CLASSIC");
      for (const key of ["refine", "po", "researcher", "architect", "codexSkill", "codexProcedure", "codexPo", "codexResearcher", "codexArchitect"]) {
        for (const leak of ["researched", "Background:", "work.operator"]) assert.ok(!classic[key].includes(leak), `${key} holds no ${leak}`);
      }
      assert.ok(passageOf(classic.refine).includes("`business`"), "it is the classic beat");
    },
  },
  {
    name: "examples/193-04 04 a project with discovery off is given no discovery prose at all",
    run: () => {
      const refine = flat(renderOf("NONE").refine);
      for (const phrase of ["example map", "EXAMPLES.md", "operator's profile", "operator's role", "operator.role", "aof project show"]) {
        assert.ok(!refine.includes(phrase), `NONE's refine names no ${phrase}`);
      }
    },
  },
  {
    name: "examples/193-04 04 this checkout, which has not turned the switch on, does not change",
    run: () => {
      const home = mkdtempSync(path.join(os.tmpdir(), "aof-operator-aware-home-"));
      try {
        const result = spawnSync(process.execPath, [cliPath, "work", "update", "--dry-run", "--json"], { cwd: repoRoot, encoding: "utf8", env: { ...process.env, AOF_GLOBAL_HOME: home, NODE_NO_WARNINGS: "1" } });
        assert.equal(result.status, 0, result.stderr);
        const planned = JSON.parse(result.stdout).actions.filter((action) => action.action !== "skip");
        assert.deepEqual(planned, [], "no rendered command, agent or installed template changes");
      } finally {
        rmSync(home, { recursive: true, force: true });
      }
    },
  },
  {
    name: "examples/193-04 04 turning the switch on is one update away",
    run: () => withScratch(CLASSIC, (fx) => {
      fx.render();
      const before = Object.fromEntries(Object.entries(FILES).map(([key, rel]) => [key, fx.read(rel)]));
      assert.equal(fx.cli("work", "init-config", "--operator-aware", "on").status, 0);
      updateOf(fx);
      assert.ok(fx.read(FILES.refine).includes("**Research a fact before anyone is asked.**"), "the beat is rendered");
      assert.equal(fx.cli("work", "init-config", "--operator-aware", "off").status, 0);
      updateOf(fx);
      for (const [key, rel] of Object.entries(FILES)) assert.equal(fx.read(rel), before[key], `${rel} is CLASSIC's again`);
    }),
  },
  {
    name: "examples/193-04 04 turning the switch on and not updating is a stale render",
    run: () => withScratch(CLASSIC, (fx) => {
      fx.render();
      const config = fx.config();
      config.work.examples.operatorAware = true;
      fx.setConfig(config);
      const stale = (fx.cli("work", "doctor", "--json").json?.findings ?? []).filter((finding) => finding.code === "practice-render-stale");
      assert.equal(stale.length, 1, JSON.stringify(stale));
      assert.equal(stale[0].severity, "error");
      assert.ok(stale[0].message.includes("work.examples.operatorAware"), stale[0].message);
      updateOf(fx);
      assert.deepEqual((fx.cli("work", "doctor", "--json").json?.findings ?? []).filter((finding) => finding.code === "practice-render-stale"), []);
    }),
  },
  {
    name: "examples/193-04 04 the switch on installs the template variants that teach the new forms",
    run: () => {
      const text = renderOf("ON").examples;
      const map = parseExampleMap(text);
      assert.deepEqual(map.malformed, []);
      const classes = map.questions.map((question) => question.class);
      for (const label of ["domain", "policy", "technical"]) assert.ok(classes.includes(label), label);
      assert.ok(!classes.includes("business"));
      const provenance = map.rules.flatMap((rule) => rule.examples.map((example) => example.provenance));
      for (const label of ["proposed", "confirmed", "stated", "researched"]) assert.ok(provenance.includes(label), label);
      const comment = flat(text.split("<!--").find((block) => block.includes("example map:")).split("-->")[0]);
      assert.match(comment, /One you cannot place is `domain`/u);
      assert.match(comment, /Only `answered` closes a `policy` question/u);
      assert.ok(text.trimEnd().split("\n").length <= 50, "at most 50 lines");
    },
  },
  {
    name: "examples/193-04 04 the research template variant shows a finding, and a copy of it cites nothing",
    run: () => {
      const text = renderOf("ON").research;
      assert.match(text, /^## F1 · /mu);
      assert.match(text, /^- \*\*Finding:\*\* /mu);
      assert.match(text, /^- \*\*Source:\*\* /mu);
      assert.deepEqual(readFindings(text).findings, [], "a copy of it cites nothing");
      const specimen = text.split("<!--").find((block) => block.includes("## F1 · ")).split("-->")[0];
      const { findings } = readFindings(specimen);
      assert.deepEqual(findings.map(({ id, sourced }) => [id, sourced]), [["F1", true]], "the specimen reads as one sourced finding");
    },
  },
  {
    name: "examples/193-04 04 with the switch off, the default templates are installed, unchanged",
    run: () => {
      const classic = renderOf("CLASSIC");
      for (const [key, source] of [["examples", "story/EXAMPLES.md"], ["research", "milestone/RESEARCH.md"]]) {
        const original = readFileSync(path.join(repoRoot, "packages", "core", "assets", "templates", source), "utf8").replace(/\r\n/gu, "\n");
        assert.ok(classic[key].endsWith(original), `${key} is the default template`);
        assert.equal(classic[key], renderOf("NONE")[key], `${key} is what a project with discovery off is given`);
      }
    },
  },
  {
    name: "examples/193-04 04 a record doc with domains still reads as a work item",
    run: () => withScratch(ON, (fx) => {
      const dir = path.join(fx.project, "wiki", "work", "01_milestone_lettings");
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, "SPEC.md"), "---\ntype: milestone\nnumber: 01\nslug: lettings\ntitle: Lettings\ndomains: [tenancy-law, property-management]\nstatus: not-started\ncreated: 2026-11-15\nupdated: 2026-11-15\nschema: 1\n---\n# 01 · Lettings\n", "utf8");
      const found = fx.cli("work", "find", "01", "--json").json;
      assert.deepEqual([found?.[0]?.status, found?.[0]?.title], ["not-started", "Lettings"]);
      const validated = fx.cli("work", "validate", "01");
      assert.equal(validated.status, 0, validated.stdout || validated.stderr);
      assert.ok(!validated.stdout.includes("domains"), validated.stdout);
    }),
  },
  {
    name: "examples/193-04 04 the guide says who decides what, and that it is a choice",
    run: () => {
      const guide = readFileSync(path.join(repoRoot, "wiki", "acceptance-criteria.md"), "utf8");
      const section = between(guide, "## Before the zoom levels: the example map (discovery)", "### Above the matrix", "the discovery section");
      says(section, [
        /off unless a project turns on `work\.examples\.operatorAware`/u,
        /A fact about the world is researched first, and closed by a finding that names its source/u,
        /A decision goes to a person, and the build waits for the answer/u,
        /The operator's profile, `work\.operator`, decides how a fact is handled/u,
      ], "the guide");
      assert.doesNotMatch(section, /^\s*(## R|- E|- Q)\d/mu, "it restates no line of the grammar");
    },
  },
  {
    name: "examples/193-04 04 the practice's README says what it ships and what turns it on",
    run: () => says(readFileSync(path.join(repoRoot, "packages", "specification-by-example", "README.md"), "utf8"), [
      /practice, `operator-aware`/u,
      /`work\.examples\.enabled` and `work\.examples\.operatorAware` together/u,
      /`assets\/fragments\/operator-aware\/`/u,
      /template variants \(`assets\/templates\/operator-aware\/`\)/u,
    ], "the README"),
  },
];

export const operatorAwareBeatTests = [...labelTests, ...researchTests, ...batchTests, ...recommendationTests, ...renderTests];
