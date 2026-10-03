import { defaultApplication as _aofApplication } from "aof/default-application";
// Traceability wiring for milestone 134 / story 05 — the discovery beat.
//
// Covers EVERY @executable scenario in
//   tasks/00_refine-opens-the-story-contract-with-a-discovery-beat-when-the-gate-is-on.feature
//   tasks/01_autonomous-brings-every-open-business-question-to-its-one-stop-as-a-question.feature
//   tasks/02_the-po-brief-learns-the-map-and-the-architect-brief-learns-the-classification-review.feature
//   tasks/03_the-examples-template-is-a-legal-map-the-bundle-installs.feature
//   tasks/04_the-acceptance-criteria-guide-names-discovery-above-the-three-zoom-levels.feature
//
// It reads the bundle SOURCES and their rendered copies from this checkout and pins CONTENT, not
// wording (133/05's precedent). Byte-identity with a fresh render is read from
// `aof work update --dry-run --json`, which answers `skip` for a copy that is exactly what the
// current source renders. The contract names the sources under `src/bundle/`; since 142 they are
// `packages/core/assets/`. The map's grammar and token are read through story 02's module, and
// nothing is imported from story 04: the doctor codes here are row data.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseExampleMap, readMapToken } from "@aof/specification-by-example/map";

const getCommand = _aofApplication.getCommand;
const parseSpecArgv = _aofApplication.cli.parseSpecArgv;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");
const read = (rel) => readFile(path.join(repoRoot, rel), "utf8").then((text) => text.replace(/\r\n/g, "\n"));
const flat = (text) => text.replace(/\s+/g, " ");

const REFINE = "packages/core/assets/commands/refine.md";
const PO = "packages/core/assets/agents/aof-product-owner.md";
const ARCHITECT = "packages/core/assets/agents/aof-architect.md";
const TEMPLATE = "packages/core/assets/templates/story/EXAMPLES.md";
const INSTALLED = ".aof/templates/work/story/EXAMPLES.md";
const GUIDE = "wiki/acceptance-criteria.md";
const REFINE_COPIES = [".claude/commands/aof/refine.md", ".codex/skills/aof-refine/SKILL.md", ".opencode/commands/aof/refine.md"];
const PO_COPIES = [".claude/agents/aof-product-owner.md", ".codex/agents/aof-product-owner.md", ".opencode/agents/aof-product-owner.md"];
const ARCHITECT_COPIES = [".claude/agents/aof-architect.md", ".codex/agents/aof-architect.md", ".opencode/agents/aof-architect.md"];
const MAP_LINE = /^\s*(## R|- E|- Q)\d/m;

// ── the slices the rulings name ─────────────────────────────────────────────────────────────────
// The story Contract: its bullet to the `--autonomous` block's bold lead (task 00, developer 1).
function contractOf(refine) {
  const start = refine.indexOf("- **story — Contract (Three Amigos):**");
  const end = refine.indexOf("**`--autonomous` — cascade");
  assert.ok(start >= 0 && end > start, "the story Contract section is found");
  return refine.slice(start, end);
}
// The passage: its paragraph naming the gate, to the section's next bold-led paragraph.
function passageOf(refine) {
  const contract = contractOf(refine);
  const gate = contract.indexOf("`work.examples.enabled`");
  assert.ok(gate >= 0, "the Contract names the gate");
  const start = contract.lastIndexOf("\n\n", gate) + 2;
  const next = /\n\n\s*\*\*/.exec(contract.slice(gate));
  const end = next ? gate + next.index : contract.length;
  return { contract, passage: contract.slice(start, end), start, end };
}
// The `--autonomous` block: its bold lead to `<amendment_ratification>` (task 01, developer 1).
function autonomousOf(refine) {
  const start = refine.indexOf("**`--autonomous` — cascade");
  const end = refine.indexOf("<amendment_ratification>");
  assert.ok(start >= 0 && end > start, "the --autonomous block is found");
  return refine.slice(start, end);
}
const milestoneBulletOf = (block) => block.slice(block.indexOf("- **milestone** →"), block.indexOf("\n- **story** →"));
const outputOf = (refine) => refine.slice(refine.indexOf("<output>"), refine.indexOf("</output>"));
const ownershipOf = (brief) => brief.slice(brief.indexOf("<ownership>"), brief.indexOf("</ownership>"));
// The map bullet of the PO brief (with its sub-bullets), and the architect's review bullet.
const poMapOf = (brief) => {
  const own = ownershipOf(brief);
  const start = own.indexOf("- A story's `EXAMPLES.md`");
  const after = own.slice(start + 1).search(/\n- /);
  return own.slice(start, after === -1 ? own.length : start + 1 + after);
};
const reviewOf = (brief) => {
  const own = ownershipOf(brief);
  const start = own.indexOf("- **The classification review**");
  return own.slice(start, own.indexOf("\n", start));
};
const workedTokens = (text) => [...text.matchAll(/`(\d+(?:\/\d+)? [QE][1-9]\d* · [^`]+)`/g)].map((match) => match[1]);

let dryRun = null;
function freshRenderActions() {
  if (dryRun) return dryRun;
  const result = spawnSync(process.execPath, [cliPath, "work", "update", "--dry-run", "--json"], { cwd: repoRoot, encoding: "utf8", env: { ...process.env, NODE_NO_WARNINGS: "1" } });
  assert.equal(result.status, 0, result.stderr);
  dryRun = new Map(JSON.parse(result.stdout).actions.map((action) => [action.path, action.action]));
  return dryRun;
}

export const refineDiscoveryBeatTests = [
  // ══ 00_refine-opens-the-story-contract-with-a-discovery-beat-when-the-gate-is-on.feature ══
  {
    name: "examples/134-05 00 the beat opens the story Contract, before the headline Scenarios are written",
    run: async () => {
      const { contract, passage, start, end } = passageOf(await read(REFINE));
      assert.ok(passage.includes("`work.examples.enabled`") && passage.includes("`EXAMPLES.md`"), "one passage names the gate and the map");
      for (const name of ["work.examples.enabled", "EXAMPLES.md"]) {
        for (let at = contract.indexOf(name); at !== -1; at = contract.indexOf(name, at + 1)) {
          assert.ok(at >= start && at < end, `every mention of ${name} in the Contract is in the one passage`);
        }
      }
      assert.ok(contract.indexOf("PO writes the headline Scenarios") > end, "the passage comes before the PO writes the headline Scenarios");
    },
  },
  {
    name: "examples/134-05 00 with the gate off or absent, the beat does not run and refine writes what it writes today",
    run: async () => {
      const text = flat(passageOf(await read(REFINE)).passage);
      assert.match(text, /defaults to \*\*off\*\*/);
      assert.match(text, /absent, `false` or any other value .* is off/);
      assert.match(text, /When it is off, write no `EXAMPLES\.md`, ask no question/);
      assert.match(text, /nothing else in the Contract changes/);
    },
  },
  {
    name: "examples/134-05 00 the beat runs only when the gate is the boolean true (outline: 4 values)",
    run: async () => {
      const text = flat(passageOf(await read(REFINE)).passage);
      // The gate sentence, read as the rule it states.
      assert.match(text, /only the boolean `true` turns it on/);
      assert.match(text, /\(the string `"true"` included\) is off/);
      const runs = (value) => value === true;
      for (const [value, expected] of [[undefined, false], [false, false], ["true", false], [true, true]]) {
        assert.equal(runs(value), expected, JSON.stringify(value));
      }
    },
  },
  {
    name: "examples/134-05 00 the PO drafts the map from the user story and the SPEC",
    run: async () => {
      const text = flat(passageOf(await read(REFINE)).passage);
      assert.match(text, /before any `\.feature` exists/);
      assert.match(text, /The PO drafts the example map\*\* — one `EXAMPLES\.md` in the story's own folder, from the story's user story and the milestone SPEC/);
      assert.match(text, /the rules, two or three key examples per rule with real values including the awkward edge, and every question the PO cannot answer from the record/);
      assert.match(text, /Every example the PO writes is `proposed`, and only a person's recorded answer makes one `confirmed` or `stated`/);
      assert.match(text, /Its form is the template at/);
      assert.match(text, /no rule a person owns declares the map not applicable in one line/);
    },
  },
  {
    name: "examples/134-05 00 the passage teaches the map by its template, and restates no line of the grammar",
    run: async () => {
      const { passage } = passageOf(await read(REFINE));
      assert.ok(passage.includes("`.aof/templates/work/story/EXAMPLES.md`"));
      assert.equal(MAP_LINE.test(passage), false, "no line opens as a map line does");
    },
  },
  {
    name: "examples/134-05 00 the passage names the answer that licenses each label a person stands behind (outline: 3 labels)",
    run: async () => {
      const text = flat(passageOf(await read(REFINE)).passage);
      assert.match(text, /An example's `confirmed` is written only after the person's recorded answer to the example's own token, `<story ref> E<n>`/);
      assert.match(text, /An example's `stated Q<n>` and a question's `answered` are written only after the person's recorded answer to the question's token, `<story ref> Q<n>`/);
    },
  },
  {
    name: "examples/134-05 00 the architect reviews every technical label before any question is asked",
    run: async () => {
      const { passage } = passageOf(await read(REFINE));
      const text = flat(passage);
      assert.match(text, /The architect reviews every question the PO labelled `technical`\*\*, and relabels one that is really policy as `business`/);
      assert.match(text, /A technical question may take a documented default, recorded as `defaulted <pointer>`; a business question never does/);
      assert.ok(passage.indexOf("The architect reviews") < passage.indexOf("The main session asks"), "the review precedes the asking");
    },
  },
  {
    name: "examples/134-05 00 the main session asks each business question through AskUserQuestion, with its map token at the head",
    run: async () => {
      const text = flat(passageOf(await read(REFINE)).passage);
      assert.match(text, /The main session asks\*\* each business question through `AskUserQuestion`, in solo and in orchestrated mode alike/);
      assert.match(text, /Each question opens with its token — `<story ref> Q<n>`, or `<story ref> E<n>` when a proposed example is put to the person to confirm/);
      assert.match(text, /The agent writes the answer into the map, but it is the harness's record of the answer, not the map, that makes the label hold/);
    },
  },
  {
    name: "examples/134-05 00 the token the passage teaches is one the reader reads back (outline: 2 forms)",
    run: async () => {
      const worked = workedTokens(passageOf(await read(REFINE)).passage);
      for (const letter of ["Q", "E"]) {
        const text = worked.find((candidate) => readMapToken(candidate)?.id.startsWith(letter));
        assert.ok(text, `a worked question opens with a ${letter} token: ${JSON.stringify(worked)}`);
        assert.match(readMapToken(text).storyRef, /^\d+(\/\d+)?$/);
      }
    },
  },
  {
    name: "examples/134-05 00 the stage stops on doctor's error before the first headline Scenario",
    run: async () => {
      const text = flat(passageOf(await read(REFINE)).passage);
      assert.match(text, /Once the questions are asked, run `aof work doctor <story> --json`/);
      assert.match(text, /Any error-severity `example-\*` finding stops the Contract stage before the first headline Scenario, and no `tasks\/` is written/);
    },
  },
  {
    name: "examples/134-05 00 the stop is read by severity, not by code (outline: 5 codes)",
    run: async () => {
      const text = flat(passageOf(await read(REFINE)).passage);
      const stopsOnError = /Any error-severity `example-\*` finding stops the Contract stage/.test(text);
      const warnGoesOn = /A warn does not stop the stage/.test(text);
      assert.ok(stopsOnError && warnGoesOn, "both halves of the stop sentence are stated");
      const outcome = (code, severity) => (code.startsWith("example-") && severity === "error" && stopsOnError) ? "stops" : (severity === "warn" && warnGoesOn ? "goes on" : "unknown");
      for (const [code, severity, expected] of [
        ["example-question-open", "error", "stops"],
        ["example-provenance-unanchored", "error", "stops"],
        ["example-map-malformed", "error", "stops"],
        ["example-rule-no-example", "warn", "goes on"],
        ["example-map-too-many-rules", "warn", "goes on"],
      ]) assert.equal(outcome(code, severity), expected, code);
    },
  },
  {
    name: "examples/134-05 00 the doctor command the beat names is a command that exists",
    run: () => {
      const command = getCommand("work:doctor");
      assert.ok(command, "work:doctor is registered");
      assert.deepEqual(command.cli.route, ["work", "doctor"]);
      assert.doesNotThrow(() => parseSpecArgv(["7/2", "--json"], command.cli.spec, "work:doctor"));
    },
  },
  {
    name: "examples/134-05 00 every rendered copy of refine carries the beat and matches a fresh render (outline: 3 copies)",
    run: async () => {
      const key = flat(passageOf(await read(REFINE)).passage).slice(0, 400);
      const actions = freshRenderActions();
      for (const copy of REFINE_COPIES) {
        assert.ok(flat(await read(copy)).includes(key), `${copy} carries the passage`);
        assert.equal(actions.get(copy), "skip", `${copy} is what a fresh render writes`);
      }
    },
  },

  // ══ 01_autonomous-brings-every-open-business-question-to-its-one-stop-as-a-question.feature ══
  {
    name: "examples/134-05 01 the rule sits beside the documented-default sentence and excepts business questions from it",
    run: async () => {
      const bullet = flat(milestoneBulletOf(autonomousOf(await read(REFINE))));
      assert.match(bullet, /\*\*documented default decisions\*\* for non-critical open questions/);
      assert.match(bullet, /a business-rule question from a story's example map never takes a default/);
    },
  },
  {
    name: "examples/134-05 01 the cascade runs discovery for every story and authors only the contracts no open question blocks",
    run: async () => {
      const block = flat(autonomousOf(await read(REFINE)));
      assert.match(block, /When `work\.examples\.enabled` is on, .*The cascade runs the discovery beat for every story/);
      assert.match(block, /authors a story's Contract only when its map has no open business question/);
    },
  },
  {
    name: "examples/134-05 01 the open business questions are asked at the one end review, through AskUserQuestion, with their tokens",
    run: async () => {
      const block = flat(autonomousOf(await read(REFINE)));
      assert.match(block, /Every open business question from every story is asked at the single end review, through `AskUserQuestion`, as a question and never as a default/);
      assert.match(block, /each carrying its map token/);
      assert.match(block, /the contracts the answers unblock are authored inside that same stop/);
    },
  },
  {
    name: "examples/134-05 01 the one stop settles each story by what became of its question (outline: 3 responses)",
    run: async () => {
      const block = flat(autonomousOf(await read(REFINE)));
      const gate = /leaves its story at the Contract gate with no `tasks\/` written/;
      const rows = [
        ["answered", [/An answered question is written into its story's map/, /each once its story passes the beat's doctor stop/]],
        ["deferred by the person", [/deferred by the person/, gate]],
        ["refused by the harness", [/refused by the harness/, gate]],
      ];
      for (const [response, rules] of rows) for (const rule of rules) assert.match(block, rule, response);
      // The second story, whose question was answered, is authored inside the stop either way.
      assert.match(block, /the other stories go on/);
      assert.match(block, /the contracts the answers unblock are authored inside that same stop/);
    },
  },
  {
    name: "examples/134-05 01 a question the person defers leaves its story at the gate",
    run: async () => {
      assert.match(flat(autonomousOf(await read(REFINE))), /A question the person does not answer — deferred by the person, or refused by the harness — leaves its story at the Contract gate with no `tasks\/` written/);
    },
  },
  {
    name: "examples/134-05 01 the autonomous review surface lists the questions asked apart from the defaults taken",
    run: async () => {
      assert.match(flat(outputOf(await read(REFINE))), /lists the business questions asked and their answers apart from the default decisions taken/);
    },
  },
  {
    name: "examples/134-05 01 with the gate off, the autonomous block reads as it does today",
    run: async () => {
      const blocks = autonomousOf(await read(REFINE)).split(/\n(?=- )|\n\s*\n/);
      const rule = blocks.filter((block) => /business(-rule)? question|AskUserQuestion/.test(block));
      assert.ok(rule.length > 0, "non-vacuity: the rule's sentences were found");
      for (const block of rule) assert.ok(block.includes("`work.examples.enabled`"), `conditional: ${flat(block).slice(0, 120)}`);
    },
  },

  // ══ 02_the-po-brief-learns-the-map-and-the-architect-brief-learns-the-classification-review.feature ══
  {
    name: "examples/134-05 02 the PO brief owns the example map",
    run: async () => {
      const text = flat(poMapOf(await read(PO)));
      assert.match(text, /`EXAMPLES\.md` — its \*\*example map\*\*, drafted only when `work\.examples\.enabled` is on/);
      assert.match(text, /its rules, two or three key examples per rule with real values including the awkward edge, and its questions/);
      assert.match(text, /Label every question `business` or `technical`; a question you cannot place is `business`/);
    },
  },
  {
    name: "examples/134-05 02 the PO brief says the PO proposes, and never asks or writes a person's label",
    run: async () => {
      const text = flat(poMapOf(await read(PO)));
      assert.match(text, /Every example you write is `proposed`/);
      assert.match(text, /you never write `confirmed` or `stated` without a person's recorded answer for that token/);
      assert.match(text, /You do not ask the map's questions yourself\. Return them, .* and the main session asks them/);
    },
  },
  {
    name: "examples/134-05 02 the PO brief names the token whose answer licenses each person's label (outline: 3 labels)",
    run: async () => {
      const text = flat(poMapOf(await read(PO)));
      assert.match(text, /An example's `confirmed` waits on the answer to its own token, `<story ref> E<n>`/);
      assert.match(text, /an example's `stated Q<n>` and a question's `answered` wait on the answer to the question's token, `<story ref> Q<n>`/);
    },
  },
  {
    name: "examples/134-05 02 the PO brief carries the token's shape",
    run: async () => {
      assert.match(flat(poMapOf(await read(PO))), /`<story ref> Q<n>` for a question, `<story ref> E<n>` for a proposed example put to a person/);
    },
  },
  {
    name: "examples/134-05 02 the token the PO brief teaches is one the reader reads back (outline: 2 forms)",
    run: async () => {
      const worked = workedTokens(poMapOf(await read(PO)));
      for (const letter of ["Q", "E"]) {
        const text = worked.find((candidate) => readMapToken(candidate)?.id.startsWith(letter));
        assert.ok(text, `a worked question opens with a ${letter} token: ${JSON.stringify(worked)}`);
      }
    },
  },
  {
    name: "examples/134-05 02 the architect brief owns the classification review",
    run: async () => {
      const text = flat(reviewOf(await read(ARCHITECT)));
      assert.match(text, /review every `technical` label on the map and relabel one that is really policy as `business`/);
      assert.match(text, /A technical question may take a documented default, recorded as `defaulted <pointer>`/);
      assert.match(text, /an ADR never settles a business question/);
    },
  },
  {
    name: "examples/134-05 02 every rendered copy of the two briefs carries its half and matches a fresh render (outline: 6 copies)",
    run: async () => {
      const actions = freshRenderActions();
      const halves = [[flat(poMapOf(await read(PO))), PO_COPIES], [flat(reviewOf(await read(ARCHITECT))), ARCHITECT_COPIES]];
      for (const [half, copies] of halves) {
        for (const copy of copies) {
          assert.ok(flat(await read(copy)).includes(half), `${copy} carries the same passage as its source`);
          assert.equal(actions.get(copy), "skip", `${copy} is what a fresh render writes`);
        }
      }
    },
  },

  // ══ 03_the-examples-template-is-a-legal-map-the-bundle-installs.feature ══
  {
    name: "examples/134-05 03 the template shows every form the grammar admits",
    run: async () => {
      const template = await read(TEMPLATE);
      assert.match(template, /^## R1 · /m, "a rule heading");
      for (const label of ["[proposed]", "[confirmed]", "[stated Q"]) assert.ok(template.includes(label), label);
      assert.match(template, /^## Questions$/m);
      assert.match(template, /^- Q\d+ · business · /m);
      assert.match(template, /^- Q\d+ · technical · /m);
      assert.match(template, /^Not applicable: \S/m, "the one-line not-applicable form");
    },
  },
  {
    name: "examples/134-05 03 the template's live lines hold each form, as the parser reads them (outline: 10 forms)",
    run: async () => {
      const map = parseExampleMap(await read(INSTALLED));
      const examples = map.rules.flatMap((rule) => rule.examples);
      const answered = new Set(map.questions.filter((question) => question.state === "answered").map((question) => question.id));
      const rows = [
        ["a rule", map.rules.some((rule) => rule.examples.length > 0)],
        ["proposed", examples.some((example) => example.provenance === "proposed")],
        ["confirmed", examples.some((example) => example.provenance === "confirmed")],
        ["stated Q<n>", examples.some((example) => example.provenance === "stated" && answered.has(example.question))],
        ["business", map.questions.some((question) => question.class === "business")],
        ["technical", map.questions.some((question) => question.class === "technical" && question.state === "defaulted" && question.pointer)],
        ["open", map.questions.some((question) => question.class === "business" && question.state === "open")],
        ["asked", map.questions.some((question) => question.state === "asked")],
        ["answered", answered.size > 0],
        ["defaulted", !map.questions.some((question) => question.class === "business" && question.state === "defaulted")],
      ];
      for (const [form, holds] of rows) assert.ok(holds, form);
    },
  },
  {
    name: "examples/134-05 03 the not-applicable form sits in a comment, and parses when it stands alone",
    run: async () => {
      const installed = await read(INSTALLED);
      const line = installed.split("\n").find((text) => text.startsWith("Not applicable: "));
      assert.ok(line, "the line is in the installed template");
      const open = installed.lastIndexOf("<!--", installed.indexOf(line));
      const close = installed.indexOf("-->", open);
      assert.ok(open >= 0 && close > installed.indexOf(line), "it sits inside a comment");
      const alone = parseExampleMap(line);
      assert.ok(typeof alone.notApplicable === "string" && alone.notApplicable.length > 0);
      assert.deepEqual(alone.malformed, []);
    },
  },
  {
    name: "examples/134-05 03 the template carries no frontmatter",
    run: async () => {
      assert.equal((await read(TEMPLATE)).split("\n").includes("---"), false);
    },
  },
  {
    name: "examples/134-05 03 the template parses with no malformed line (outline: installed and source)",
    run: async () => {
      for (const rel of [INSTALLED, TEMPLATE]) {
        const map = parseExampleMap(await read(rel));
        assert.deepEqual(map.malformed, [], rel);
        assert.equal(map.notApplicable, null, rel);
      }
      assert.ok((await read(INSTALLED)).startsWith("<!--"), "the installed copy carries the marker at its head");
    },
  },
  {
    name: "examples/134-05 03 a verbatim copy of the installed template fits the map's one-screen budget",
    run: async () => {
      const lines = (await read(INSTALLED)).split("\n");
      if (lines.at(-1) === "") lines.pop();
      assert.ok(lines.length <= 50, `${lines.length} lines`);
    },
  },
  {
    name: "examples/134-05 03 the installed template is refreshed by aof work update and catalogued in the manifest",
    run: async () => {
      assert.equal(freshRenderActions().get(INSTALLED), "skip", "byte-identical to a fresh render");
      const manifest = JSON.parse(await read("packages/core/assets/manifest.json"));
      const entries = (manifest.files ?? manifest.entries ?? Object.values(manifest).find(Array.isArray) ?? []);
      const entry = entries.find((candidate) => candidate.path === INSTALLED);
      assert.ok(entry, "the manifest lists the installed template");
      assert.deepEqual(entry.resource, { id: "story", kind: "template" });
    },
  },

  // ══ 04_the-acceptance-criteria-guide-names-discovery-above-the-three-zoom-levels.feature ══
  {
    name: "examples/134-05 04 the guide places discovery above the three zoom levels",
    run: async () => {
      const guide = await read(GUIDE);
      const heading = guide.search(/^## .*example map/im);
      const zoom = guide.indexOf("## Three zoom levels from one source");
      assert.ok(heading >= 0 && heading < zoom, "the example-map heading comes first");
      const text = flat(guide.slice(heading, zoom));
      assert.match(text, /before any Scenario is written/);
      assert.match(text, /key examples are agreed with a person rather than enumerated/);
    },
  },
  {
    name: "examples/134-05 04 the guide says who decides a business rule",
    run: async () => {
      const guide = await read(GUIDE);
      const text = flat(guide.slice(guide.search(/^## .*example map/im), guide.indexOf("## Three zoom levels from one source")));
      assert.match(text, /A business-rule question goes to a person/);
      assert.match(text, /A technical question may take a documented default/);
      assert.match(text, /An example is `proposed` until a person's recorded answer makes it `confirmed` or `stated`/);
    },
  },
  {
    name: "examples/134-05 04 the guide says the map is conditional and points at its home",
    run: async () => {
      const guide = await read(GUIDE);
      const text = flat(guide.slice(guide.search(/^## .*example map/im), guide.indexOf("## Three zoom levels from one source")));
      assert.match(text, /When a project turns on `work\.examples\.enabled`/);
      assert.match(text, /the story's `EXAMPLES\.md`, whose form is defined by its template/);
    },
  },
  {
    name: "examples/134-05 04 the guide points at the template by a path that resolves, and restates no line of the grammar",
    run: async () => {
      const guide = await read(GUIDE);
      const passage = guide.slice(guide.search(/^## .*example map/im), guide.indexOf("## Three zoom levels from one source"));
      const named = [...passage.matchAll(/`([^`]*templates[^`]*EXAMPLES\.md)`/g)].map((match) => match[1]);
      assert.ok(named.length > 0, "a template path is named");
      for (const rel of named) assert.ok(existsSync(path.join(repoRoot, rel)), `${rel} exists in this checkout`);
      assert.equal(MAP_LINE.test(passage), false, "no line opens as a map line does");
    },
  },
];
