// Traceability wiring for milestone 192 / story 00 — a command is composed from slots and fragments.
//
// Covers the @executable scenarios of
//   tasks/00_a-slot-holds-what-is-on-and-leaves-nothing-behind.feature   (R1, E1–E3)
//   tasks/01_fragments-keep-a-declared-order-and-one-can-replace-another.feature (R2, E4–E6)
//   tasks/02_each-runtime-gets-the-body-written-for-it.feature           (R3, E7–E8)
//   tasks/04_a-contribution-that-cannot-land-is-refused-at-load.feature
//   tasks/05_the-reference-says-how-to-write-a-slot-and-a-fragment.feature
// and, for milestone 192 / story 01 — a practice ships a variant of a template —
//   tasks/00_a-practice-that-is-on-installs-its-variant.feature (the shipped-bundle case; the rest
//     runs through `aof work update` in `work-update.suite.mjs`, on the fixture exported below)
//   tasks/01_a-variant-that-cannot-be-installed-is-refused.feature (the load refusals; E4 and the
//     dry run are wired in `work-update.suite.mjs`)
//   tasks/02_the-reference-says-how-to-ship-a-variant.feature
// Task 03 (the project's own config) is wired in `work-update.suite.mjs`; the FF-19205/06/07
// controls live in `test/arch/practices/` and import the fixture below.
//
// Every case runs on fixture packages handed to `readDescriptor` through `readFragment`, with their
// texts handed to `loadBundle` through `readText`: the shipped bundle declares no practice yet.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readAssetText } from "../src/asset-base.mjs";
import { loadBundle, readDescriptor, renderBundleOutputs, renderBundleTemplateOutputs } from "../src/work/bundle.mjs";
import { generateBundleManifest, readShippedManifest, serializeBundleManifest } from "../src/work/bundle-manifest.mjs";
import { composeText, practiceStates, slotOnLine } from "../src/work/bundle-compose.mjs";
import { resolveBundleVariant } from "../src/work/bundle-runtime.mjs";
import { DEFAULT_DELEGATION_MODEL, applyDelegationModelToResources } from "../src/work/delegation.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// --- the fixture ------------------------------------------------------------------------------

export const FIRST = "@aof/fixture-first";
export const SECOND = "@aof/fixture-second";
export const PLANTED = "@aof/planted-practice";
const classOf = (name) => `package:${name}`;
export const contribution = (name) => Object.freeze({ id: name.split("/").pop(), name, assets: Object.freeze({ package: name }) });

// The command "demo": a block slot in its common source and in its Codex procedure, an entry with
// a slot only Codex carries. "inline": an inline slot. "aof-demo": an agent brief with a slot.
export const DEMO_SOURCE = "---\ndescription: Demo\n---\nBefore.\n\n<!-- slot:demo.notes -->\n\nAfter.\n";
export const INLINE_SOURCE = "---\ndescription: Inline\n---\nBefore.\n<!-- slot:inline.notes -->\nAfter.\n";
export const AGENT_SOURCE = "---\nname: aof-demo\ndescription: Demo role\n---\nYou own the demo.\n\n<!-- slot:ownership.notes -->\n\nNothing else.\n";
export const CODEX_VARIANTS = [
  "<!-- variant:demo -->",
  "Run the demo procedure.",
  "",
  "<!-- slot:entry.rules -->",
  "<!-- variant:procedure-demo -->",
  "Before.",
  "",
  "<!-- slot:demo.notes -->",
  "",
  "After.",
  "<!-- variant:aof-demo -->",
  "You own the demo, in Codex.",
  "",
  "<!-- slot:ownership.notes -->",
  "",
  "Nothing else.",
  "",
].join("\n");

export const demoMember = (extra = {}) => ({
  id: "demo", kind: "command", file: "commands/demo.md", runtimes: ["claude", "opencode"], commandNamespace: "aof",
  variants: { claude: null, opencode: null, codex: { file: "variants/codex.md", section: "demo",
    associatedFiles: [{ path: "procedure.md", file: "variants/codex.md", section: "procedure-demo" }] } },
  ...extra,
});
export const inlineMember = () => ({ id: "inline", kind: "command", file: "commands/inline.md", runtimes: ["claude"], commandNamespace: "aof", mapped: false });
export const agentMember = () => ({
  id: "aof-demo", kind: "agent", file: "agents/aof-demo.md", runtimes: ["claude", "codex", "opencode"],
  variants: { claude: null, opencode: null, codex: { file: "variants/codex.md", section: "aof-demo", model: null, tools: null } },
});

export const notesPractice = (keys = ["work.notes.enabled"], id = "notes") => ({ id, title: "Notes", summary: "Adds notes to the demo.", keys });
export const fragment = (id, practice, slot, files, extra = {}) => ({ id, kind: "fragment", practice, target: "command:demo", slot, ...files, ...extra });

// The base fixture: one package that contributes the members, the practice "notes" and its
// fragments; codex bodies under `fragments/notes/demo.codex.md`.
export const BASE_FILES = {
  "commands/demo.md": DEMO_SOURCE,
  "commands/inline.md": INLINE_SOURCE,
  "agents/aof-demo.md": AGENT_SOURCE,
  "variants/codex.md": CODEX_VARIANTS,
  "fragments/notes/demo.md": "<!-- fragment:demo.notes -->\nNote one.\nNote two.\n<!-- fragment:inline.notes -->\nNote one.\nNote two.\n<!-- fragment:ownership.notes -->\nAsk with AskUserQuestion.\n",
  "fragments/notes/demo.codex.md": "<!-- fragment:demo.notes -->\nAsk with the native question tool.\n<!-- fragment:entry.rules -->\nCodex entry rule.\n<!-- fragment:ownership.notes -->\nCodex \"quoted\" \\ back\nslash line.\n",
};

export function baseFragment() {
  return {
    practices: [notesPractice()],
    members: [
      demoMember(), inlineMember(), agentMember(),
      fragment("notes-demo", "notes", "demo.notes", { file: "fragments/notes/demo.md", variants: { codex: { file: "fragments/notes/demo.codex.md" } } }),
      fragment("notes-inline", "notes", "inline.notes", { file: "fragments/notes/demo.md" }, { target: "command:inline" }),
      fragment("notes-entry", "notes", "entry.rules", { variants: { codex: { file: "fragments/notes/demo.codex.md" } } }),
      fragment("notes-agent", "notes", "ownership.notes", { file: "fragments/notes/demo.md", variants: { codex: { file: "fragments/notes/demo.codex.md" } } }, { target: "agent:aof-demo" }),
    ],
  };
}

// packages: [{ name, fragment, files }] in registration order. Returns the arguments a load takes.
export function fixtureLoad(packages) {
  const byClass = new Map(packages.map((entry) => [classOf(entry.name), entry]));
  const readFragment = (assetClass) => structuredClone(byClass.get(assetClass).fragment);
  const readText = (assetClass, file) => {
    const entry = byClass.get(assetClass);
    if (!entry) return readAssetText(assetClass, file);
    if (!Object.hasOwn(entry.files, file)) throw Object.assign(new Error(`ENOENT: ${file}`), { code: "ENOENT" });
    return entry.files[file];
  };
  const descriptor = () => readDescriptor({ integrations: [], practices: packages.map((entry) => contribution(entry.name)), readFragment });
  return { descriptor, readText, load: (config = {}) => loadBundle({ descriptor: descriptor(), config, readText }) };
}

export const baseFixture = (overrides = {}) => fixtureLoad([{ name: FIRST, fragment: baseFragment(), files: { ...BASE_FILES }, ...overrides }]);

const ON = { work: { notes: { enabled: true } } };
export const resource = (bundle, id) => bundle.resources.find((entry) => entry.id === id);
// The bundle cut down to the named members, so a render plans only what the case is about.
export const only = (bundle, ...ids) => ({ ...bundle, resources: bundle.resources.filter((entry) => ids.includes(entry.id)), templates: [], assets: [], hooks: [] });
export const renderOf = (bundle, runtimes, ...ids) => new Map(renderBundleOutputs(only(bundle, ...ids), { runtimes }).map((output) => [output.path.replaceAll("\\", "/"), output.content]));
const lines = (...parts) => `${parts.join("\n")}\n`;
const noMarker = (text, where) => assert.doesNotMatch(text, /<!-- slot:/u, `${where} holds no slot marker`);
const demoBody = (config) => resource(baseFixture().load(config), "demo").body;

// Two packages, alpha (registered first) and beta, each with one fragment in demo.notes.
function orderedFixture({ alphaMembers = [], alphaPractices = [] } = {}) {
  const first = {
    practices: [notesPractice(["work.alpha.enabled"], "alpha"), ...alphaPractices],
    members: [demoMember(), fragment("alpha", "alpha", "demo.notes", { file: "alpha.md", variants: { codex: { file: "alpha.md" } } }), ...alphaMembers],
  };
  const second = {
    practices: [notesPractice(["work.beta.enabled"], "beta")],
    members: [fragment("beta", "beta", "demo.notes", { file: "beta.md", variants: { codex: { file: "beta.md" } } })],
  };
  const firstFiles = { "commands/demo.md": DEMO_SOURCE, "variants/codex.md": CODEX_VARIANTS, "alpha.md": "Alpha.\n", "alpha-two.md": "Alpha two.\n", "alpha-plus.md": "Alpha plus.\n" };
  return fixtureLoad([{ name: FIRST, fragment: first, files: firstFiles }, { name: SECOND, fragment: second, files: { "beta.md": "Beta.\n" } }]);
}
const slotOf = (body) => body.split("\n").slice(2, -3);

// --- task 00 ------------------------------------------------------------------------------------

const slotTests = [
  {
    name: "192/00 E1 · a practice that is on fills its slot",
    run: () => {
      const bundle = baseFixture().load(ON);
      assert.equal(resource(bundle, "demo").body, lines("Before.", "", "Note one.", "Note two.", "", "After."));
      const rendered = renderOf(bundle, ["claude"], "demo").get(".claude/commands/aof/demo.md");
      assert.ok(rendered.includes(lines("Before.", "", "Note one.", "Note two.", "", "After.")), "the rendered command holds the fragment where the marker stood");
      noMarker(rendered, "the rendered command");
    },
  },
  {
    name: "192/00 E2 · a slot with nothing on leaves nothing behind",
    run: () => {
      const body = demoBody({});
      assert.equal(body, lines("Before.", "", "After."));
      noMarker(body, "the body");
      assert.doesNotMatch(body, /\n\n\n/u, "no doubled blank line");
      assert.doesNotMatch(body, /^#+\s*$/mu, "no empty heading");
    },
  },
  ...[
    ["true", true, true], ["false", false, false], ["\"true\"", "true", false], ["1", 1, false], ["null", null, false], ["{ \"on\": true }", { on: true }, false],
  ].map(([label, value, present]) => ({
    name: `192/00 E3 · only the boolean true turns a key on — ${label} renders the fragment ${present ? "present" : "absent"}`,
    run: () => {
      const body = demoBody({ work: { notes: { enabled: value } } });
      assert.equal(body.includes("Note one."), present);
      if (!present) assert.equal(body, demoBody({}), "an off value renders as with the key absent");
    },
  })),
  ...[
    [true, true, true], [true, undefined, false], [undefined, true, false], [true, false, false],
  ].map(([first, second, present]) => ({
    name: `192/00 a practice with two keys is on only when both are — ${first ?? "absent"}, ${second ?? "absent"} renders ${present ? "present" : "absent"}`,
    run: () => {
      const files = { ...BASE_FILES };
      const base = baseFragment();
      base.practices = [notesPractice(["work.notes.enabled", "work.notes.strict"], "strict")];
      base.members = base.members.map((member) => member.kind === "fragment" ? { ...member, practice: "strict" } : member);
      const notes = {};
      if (first !== undefined) notes.enabled = first;
      if (second !== undefined) notes.strict = second;
      const body = resource(fixtureLoad([{ name: FIRST, fragment: base, files }]).load({ work: { notes } }), "demo").body;
      assert.equal(body.includes("Note one."), present);
    },
  })),
  ...[
    ["true", ON, lines("Before.", "Note one.", "Note two.", "After.")],
    ["absent", {}, lines("Before.", "After.")],
  ].map(([label, config, expected]) => ({
    name: `192/00 an inline slot joins the text around it — ${label}`,
    run: () => assert.equal(resource(baseFixture().load(config), "inline").body, expected),
  })),
  {
    name: "192/00 a fragment's own indentation is kept",
    run: () => {
      const files = { ...BASE_FILES, "fragments/notes/demo.md": BASE_FILES["fragments/notes/demo.md"].replace("Note one.\nNote two.\n<!-- fragment:inline", "  Note one.\n  Note two.\n<!-- fragment:inline") };
      const body = resource(baseFixture({ files }).load(ON), "demo").body;
      assert.equal(body, lines("Before.", "", "  Note one.", "  Note two.", "", "After."));
    },
  },
  {
    name: "192/00 a source with no slot renders as it did before",
    run: () => {
      const shipped = readShippedManifest();
      const regenerated = generateBundleManifest(loadBundle({ config: {} }), { bundleVersion: shipped.bundleVersion });
      assert.equal(serializeBundleManifest(regenerated), serializeBundleManifest(shipped), "every rendered file has the hash the shipped manifest records");
    },
  },
  {
    name: "192/00 the marker grammar: a slot line, its leading spaces, and nothing else",
    run: () => {
      assert.equal(slotOnLine("<!-- slot:demo.notes -->"), "demo.notes");
      assert.equal(slotOnLine("   <!-- slot:contract.discovery-beat -->"), "contract.discovery-beat");
      assert.equal(slotOnLine("<!-- slot:demo.notes -->\r"), "demo.notes");
      assert.equal(composeText("<!-- slot:a -->\nAfter.\n"), "After.\n", "a first-line block slot leaves the text below it");
      assert.equal(composeText("A\n\n<!-- slot:a -->\n", () => ["x", "y"]), "A\n\nx\n\ny\n", "block fragments are joined by one blank line");
      assert.deepEqual([...practiceStates([{ id: "p", keys: ["a.b"] }], { a: { b: true } })], [["p", true]]);
    },
  },
];

// --- task 01 ------------------------------------------------------------------------------------

const BOTH = { work: { alpha: { enabled: true }, beta: { enabled: true } } };
const orderTests = [
  {
    name: "192/00 E4 · the contributor registered first comes first",
    run: () => assert.deepEqual(slotOf(resource(orderedFixture().load(BOTH), "demo").body), ["Alpha.", "", "Beta."]),
  },
  {
    name: "192/00 within one contributor, the order is the order of its members",
    run: () => {
      const fixture = orderedFixture({ alphaMembers: [fragment("alpha-two", "alpha", "demo.notes", { file: "alpha-two.md", variants: { codex: { file: "alpha-two.md" } } })] });
      assert.deepEqual(slotOf(resource(fixture.load(BOTH), "demo").body), ["Alpha.", "", "Alpha two.", "", "Beta."]);
    },
  },
  {
    name: "192/00 the order does not follow the order of the keys in the config",
    run: () => {
      const reversed = { work: { beta: { enabled: true }, alpha: { enabled: true } } };
      assert.deepEqual(slotOf(resource(orderedFixture().load(reversed), "demo").body), ["Alpha.", "", "Beta."]);
    },
  },
  ...(() => {
    const plus = () => orderedFixture({
      alphaPractices: [notesPractice(["work.alpha.enabled", "work.alpha.plus"], "alpha-plus")],
      alphaMembers: [fragment("alpha-plus", "alpha-plus", "demo.notes", { file: "alpha-plus.md", variants: { codex: { file: "alpha-plus.md" } } }, { replaces: "alpha" })],
    });
    return [
      {
        name: "192/00 E5 · a fragment that replaces another is rendered in its place",
        run: () => {
          const body = resource(plus().load({ work: { alpha: { enabled: true, plus: true } } }), "demo").body;
          assert.ok(body.includes("Alpha plus."));
          assert.ok(!body.includes("Alpha.\n"), "the replaced fragment is not rendered");
        },
      },
      {
        name: "192/00 E6 · with the replacement off, the original renders",
        run: () => {
          const body = resource(plus().load({ work: { alpha: { enabled: true } } }), "demo").body;
          assert.ok(body.includes("Alpha.\n"));
          assert.ok(!body.includes("Alpha plus."));
        },
      },
      {
        name: "192/00 a replacement leaves the other fragments of the slot alone",
        run: () => {
          const body = resource(plus().load({ work: { alpha: { enabled: true, plus: true }, beta: { enabled: true } } }), "demo").body;
          assert.deepEqual(slotOf(body), ["Alpha plus.", "", "Beta."]);
        },
      },
    ];
  })(),
  ...["for the same project directory", "for two project directories at other paths"].map((how, index) => ({
    name: `192/00 the same input renders the same bytes — ${how}`,
    run: () => {
      const fixture = orderedFixture();
      const render = (dir) => renderBundleOutputs(only(fixture.load(BOTH), "demo"), { runtimes: ["claude", "codex"], targetDir: dir }).map((output) => [output.path, output.content]);
      const a = render(path.join(repoRoot, "fixture-a"));
      const b = render(path.join(repoRoot, index === 0 ? "fixture-a" : "elsewhere", "fixture-b"));
      assert.deepEqual(a, b);
    },
  })),
];

// --- task 02 ------------------------------------------------------------------------------------

// The TOML the Codex agent render writes: one `key = <basic string>` per line. JSON's escapes are
// TOML's basic-string escapes, so a line that JSON.parse accepts is a well-formed TOML string.
function parseFlatToml(text) {
  const table = {};
  for (const line of text.split("\n")) {
    if (line === "" || line.startsWith("#")) continue;
    const match = /^([A-Za-z0-9_-]+) = (.*)$/u.exec(line);
    assert.ok(match, `a TOML key/value line: ${line}`);
    table[match[1]] = JSON.parse(match[2]);
  }
  return table;
}

const runtimeTests = [
  ...[
    ["claude", ".claude/commands/aof/demo.md", "Ask with AskUserQuestion."],
    ["opencode", ".opencode/commands/aof/demo.md", "Ask with AskUserQuestion."],
    ["codex", ".agents/skills/aof-demo/procedure.md", "Ask with the native question tool."],
  ].map(([runtime, file, line]) => ({
    name: `192/00 E7 · a command's slot is filled for each runtime — ${runtime}`,
    run: () => {
      const files = { ...BASE_FILES, "fragments/notes/demo.md": BASE_FILES["fragments/notes/demo.md"].replace("Note one.\nNote two.\n<!-- fragment:inline", "Ask with AskUserQuestion.\n<!-- fragment:inline") };
      const rendered = renderOf(baseFixture({ files }).load(ON), [runtime], "demo");
      assert.ok(rendered.has(file), `${file} is rendered`);
      assert.ok(rendered.get(file).includes(line), `${file} holds "${line}"`);
      noMarker(rendered.get(file), file);
    },
  })),
  {
    name: "192/00 the Codex skill never holds the Claude wording",
    run: () => {
      const files = { ...BASE_FILES, "fragments/notes/demo.md": BASE_FILES["fragments/notes/demo.md"].replace("Note one.\nNote two.\n<!-- fragment:inline", "Ask with AskUserQuestion.\n<!-- fragment:inline") };
      const rendered = renderOf(baseFixture({ files }).load(ON), ["codex"], "demo");
      for (const file of [".agents/skills/aof-demo/SKILL.md", ".agents/skills/aof-demo/procedure.md"]) {
        assert.ok(rendered.has(file), `${file} is rendered`);
        assert.doesNotMatch(rendered.get(file), /AskUserQuestion/u, `${file} holds no Claude wording`);
      }
    },
  },
  ...[
    ["claude", ".claude/agents/aof-demo.md", "Ask with AskUserQuestion."],
    ["opencode", ".opencode/agents/aof-demo.md", "Ask with AskUserQuestion."],
    ["codex", ".codex/agents/aof-demo.toml", "Codex \"quoted\" \\ back\nslash line."],
  ].map(([runtime, file, body]) => ({
    name: `192/00 E8 · an agent brief's slot is filled for each runtime — ${runtime}`,
    run: () => {
      const rendered = renderOf(baseFixture().load(ON), [runtime], "aof-demo");
      assert.ok(rendered.has(file), `${file} is rendered`);
      const text = runtime === "codex" ? parseFlatToml(rendered.get(file)).developer_instructions : rendered.get(file);
      assert.ok(text.includes(body), `${file} holds the ${runtime === "codex" ? "Codex" : "common"} body`);
      noMarker(text, file);
    },
  })),
  {
    name: "192/00 a Codex brief stays a valid TOML document when its slot is filled",
    run: () => {
      const toml = renderOf(baseFixture().load(ON), ["codex"], "aof-demo").get(".codex/agents/aof-demo.toml");
      const table = parseFlatToml(toml);
      assert.equal(table.developer_instructions, "You own the demo, in Codex.\n\nCodex \"quoted\" \\ back\nslash line.\n\nNothing else.");
    },
  },
  {
    name: "192/00 a slot that only the Codex entry carries is filled for Codex alone",
    run: () => {
      const on = baseFixture().load(ON);
      const codex = renderOf(on, ["codex"], "demo").get(".agents/skills/aof-demo/SKILL.md");
      assert.ok(codex.includes("Codex entry rule."), "the Codex skill's entry holds the body");
      const claudeOn = renderOf(on, ["claude"], "demo").get(".claude/commands/aof/demo.md");
      assert.ok(!claudeOn.includes("Codex entry rule."), "the Claude command is unchanged by it");
      const files = { ...BASE_FILES, "fragments/notes/demo.codex.md": BASE_FILES["fragments/notes/demo.codex.md"].replace("Codex entry rule.", "Codex entry rule, changed.") };
      assert.equal(renderOf(baseFixture({ files }).load(ON), ["claude"], "demo").get(".claude/commands/aof/demo.md"), claudeOn, "the Claude render does not move with the Codex-only body");
    },
  },
  {
    name: "192/00 a runtime that was not selected is not rendered",
    run: () => {
      const planned = [...renderOf(baseFixture().load(ON), ["claude"], "demo", "aof-demo", "inline").keys()];
      assert.ok(planned.length > 0);
      assert.deepEqual(planned.filter((file) => file.startsWith(".agents/") || file.startsWith(".codex/")), []);
    },
  },
];

// --- task 04 ------------------------------------------------------------------------------------

// One sound bundle fragment from @aof/planted-practice, and a planter for each fault.
function plantedLoad(plant) {
  const fragmentDoc = baseFragment();
  const files = { ...BASE_FILES };
  const others = [];
  plant({ fragment: fragmentDoc, files, others, find: (id) => fragmentDoc.members.find((member) => member.id === id) });
  return () => fixtureLoad([...others.filter((entry) => entry.before), { name: PLANTED, fragment: fragmentDoc, files }, ...others.filter((entry) => !entry.before)]).load();
}

const FAULTS = [
  ["a fragment names a practice no bundle declares", ({ find }) => { find("notes-demo").practice = "ghost"; }, ["notes-demo", "ghost"]],
  ["a fragment names a target no bundle declares", ({ find }) => { find("notes-demo").target = "command:ghost"; }, ["notes-demo", "command:ghost"]],
  ["a fragment names a slot no text of its target carries", ({ find }) => { find("notes-demo").slot = "demo.ghost"; }, ["notes-demo", "demo.ghost"]],
  ["a slot is carried by the Codex procedure and the fragment has no Codex body", ({ find }) => { delete find("notes-demo").variants; }, ["notes-demo", "codex"]],
  ["a fragment has a Codex body for a slot the Codex texts do not carry", ({ find }) => { find("notes-inline").variants = { codex: { file: "fragments/notes/demo.codex.md" } }; }, ["notes-inline", "codex"]],
  ["a fragment's body file is missing", ({ find }) => { find("notes-demo").file = "fragments/notes/gone.md"; }, ["notes-demo", "fragments/notes/gone.md"]],
  ["a fragment's body file holds no section for its slot", ({ find }) => { find("notes-demo").section = "demo.elsewhere"; }, ["notes-demo", "demo.elsewhere"]],
  ["a fragment replaces a fragment contributed by another package", ({ find, others }) => {
    others.push({ before: true, name: FIRST, files: { "x.md": "X.\n", "x.codex.md": "X.\n" }, fragment: { members: [fragment("foreign", "notes", "demo.notes", { file: "x.md", variants: { codex: { file: "x.codex.md" } } })] } });
    find("notes-demo").replaces = "foreign";
  }, ["notes-demo", "foreign"]],
  ["a fragment replaces a fragment of another slot", ({ find }) => { find("notes-demo").replaces = "notes-entry"; }, ["notes-demo", "notes-entry"]],
  ["a fragment replaces a fragment that does not exist", ({ find }) => { find("notes-demo").replaces = "notes-ghost"; }, ["notes-demo", "notes-ghost"]],
  ["a practice is declared with an empty list of keys", ({ fragment: doc }) => { doc.practices[0].keys = []; }, ["\"notes\""]],
  ["a practice id is already declared by another contributor", ({ others }) => {
    others.push({ before: true, name: FIRST, files: {}, fragment: { practices: [notesPractice()] } });
  }, ["\"notes\"", PLANTED, FIRST]],
  ["a fragment's id is already declared by another member", ({ others }) => {
    others.push({ before: true, name: FIRST, files: { "x.md": "X.\n" }, fragment: { members: [{ id: "notes-demo", kind: "command", file: "x.md", runtimes: ["claude"] }] } });
  }, ["notes-demo", PLANTED, FIRST]],
];

const refusalTests = [
  ...FAULTS.map(([fault, plant, named]) => ({
    name: `192/00 a faulty contribution is refused, naming the member and its package — ${fault}`,
    run: () => {
      const load = plantedLoad(plant);
      assert.throws(load, (error) => {
        for (const name of [...named, PLANTED]) assert.ok(error.message.includes(name), `the refusal names ${name}: ${error.message}`);
        return true;
      });
    },
  })),
  {
    name: "192/00 a slot name repeated in one source is refused",
    run: () => {
      const load = plantedLoad(({ files }) => { files["commands/demo.md"] = DEMO_SOURCE.replace("After.", "After.\n\n<!-- slot:demo.notes -->"); });
      assert.throws(load, (error) => error.message.includes("\"command:demo\"") && error.message.includes("\"demo.notes\""));
    },
  },
  ...["<!-- slot: -->", "<!-- slot:Demo.Notes -->", "text before <!-- slot:demo.notes --> it", "<!-- a comment that mentions a slot -->"].map((line) => ({
    name: `192/00 a line that is not a well-formed marker is ordinary text — ${line}`,
    run: () => {
      const bundle = plantedLoad(({ files }) => { files["commands/inline.md"] = INLINE_SOURCE.replace("After.", `After.\n${line}`); })();
      const rendered = renderOf(bundle, ["claude"], "inline").get(".claude/commands/aof/inline.md");
      assert.ok(rendered.includes(`\n${line}\n`), "the line is rendered as written");
    },
  })),
  {
    name: "192/00 a sound contribution loads, and the shipped bundle still loads",
    run: () => {
      const bundle = plantedLoad(() => {})();
      assert.ok(resource(bundle, "demo"), "the fixture loads");
      // Core's own bundle.json declares `build-brief` (192/ADR-005 §1), so it stands first in every load.
      assert.deepEqual(bundle.practices.map((practice) => [practice.id, practice.contributor]), [["build-brief", "core"], ["notes", PLANTED]]);
      const shipped = loadBundle();
      assert.ok(shipped.resources.length > 40, "the shipped bundle loads");
      // 192/02 — the shipped bundle declares core's build brief, then discovery; 193/04 adds operator-aware discovery.
      assert.deepEqual(shipped.practices.map((practice) => [practice.id, practice.contributor]), [["build-brief", "core"], ["discovery", "@aof/specification-by-example"], ["operator-aware", "@aof/specification-by-example"]]);
    },
  },
];

// --- task 05 ------------------------------------------------------------------------------------

const PAGE = "wiki/reference/practice-prose.md";
const page = () => readFileSync(path.join(repoRoot, PAGE), "utf8");
const QUESTIONS = [
  ["what a slot marker looks like, with one written out", /<!-- slot:[a-z.-]+ -->/u],
  ["that a block slot has a blank line above it and an inline slot does not, and what each leaves when empty", /block slot[\s\S]*blank line[\s\S]*inline slot/iu],
  ["that a slot added to a command goes into its Codex text too", /Codex[^\n]*(?:too|as well|also)|(?:also|too)[^\n]*Codex/iu],
  ["how a bundle fragment declares a practice and its keys, with one written out", /"practices"\s*:\s*\[[\s\S]*"keys"/u],
  ["how a fragment member names its practice, target and slot, with one written out", /"kind"\s*:\s*"fragment"[\s\S]*"practice"[\s\S]*"target"[\s\S]*"slot"/u],
  ["where a fragment's body lives, and how one file holds several slots' bodies", /<!-- fragment:[a-z.-]+ -->/u],
  ["that a Codex body is written by hand, in that runtime's wording", /Codex body[^\n]*(?:by hand|in its own wording|its own words)/iu],
  ["what decides the order of two fragments in one slot", /order/iu],
  ["how a fragment replaces another, and that it may replace only its own package's", /"replaces"[\s\S]*own package/iu],
  ["that only the boolean true in the project's own config file turns a key on", /boolean `?true`?[\s\S]*project's own/iu],
  ["that the project runs \"aof work update\" after changing a key", /aof work update/u],
];

// A config with every key of every named practice set to true.
export function practiceOn(practices) {
  const config = {};
  for (const key of practices.flatMap((practice) => practice.keys ?? [])) {
    const parts = key.split(".");
    let node = config;
    for (const part of parts.slice(0, -1)) node = node[part] ??= {};
    node[parts.at(-1)] = true;
  }
  return config;
}

// Each JSON code block on the page that declares practices or members.
function specimens(text) {
  return [...text.matchAll(/```json\n([\s\S]*?)```/gu)].map((match) => JSON.parse(match[1])).filter((doc) => doc.practices || doc.members);
}

const referenceTests = [
  {
    name: "192/00 the page exists and says what it is for",
    run: () => {
      const opening = page().split("\n## ")[0];
      assert.match(opening, /practice[\s\S]*(?:command|role brief)[\s\S]*slot[\s\S]*fragment/iu);
      assert.match(opening, /only when[\s\S]*turned[\s\S]*on/iu);
    },
  },
  ...QUESTIONS.map(([answer, pattern]) => ({
    name: `192/00 the page answers each question an author has — ${answer}`,
    run: () => assert.match(page(), pattern),
  })),
  {
    name: "192/00 every specimen on the page is one the loader accepts",
    run: () => {
      const found = specimens(page());
      assert.ok(found.length > 0, "the page holds a bundle fragment specimen");
      for (const specimen of found) {
        // Each fragment's target is stood in for by a fixture twin (`<kind>:specimen-<id>`) that
        // carries the slot in its common source and, when the fragment has a Codex body, in its
        // Codex text, so a specimen that names a shipped command never collides with it.
        const files = {};
        const twins = new Map();
        const members = (specimen.members ?? []).map((member) => {
          if (member.kind === "template-variant") files[member.file] = "Specimen variant.\n";
          if (member.kind !== "fragment") return member;
          const [kind, id] = member.target.split(":");
          const twin = `specimen-${id}`;
          const codex = Boolean(member.variants?.codex);
          files[`specimen/${twin}.md`] = `---\ndescription: Specimen\n---\nText.\n\n<!-- slot:${member.slot} -->\n`;
          if (codex) files[`specimen/${twin}.codex.md`] = `<!-- variant:${twin} -->\nText.\n\n<!-- slot:${member.slot} -->\n`;
          twins.set(twin, { id: twin, kind, file: `specimen/${twin}.md`, runtimes: ["claude"], ...(kind === "command" ? { commandNamespace: "aof" } : {}),
            variants: { claude: null, ...(codex ? { codex: { file: `specimen/${twin}.codex.md`, section: twin } } : {}) } });
          for (const body of [member.file, ...Object.values(member.variants ?? {}).map((variant) => variant.file)].filter(Boolean)) files[body] = "Specimen body.\n";
          return { ...member, target: `${kind}:${twin}` };
        });
        const doc = { practices: specimen.practices ?? [], members: [...twins.values(), ...members] };
        const loaded = fixtureLoad([{ name: PLANTED, fragment: doc, files }]).load(practiceOn(doc.practices));
        // Resolved for Claude, the runtime every twin renders: a runtime-scoped specimen (198/00) fills
        // only its own runtimes' text, so the body no runtime resolved holds none of it.
        for (const twin of twins.keys()) assert.match(resolveBundleVariant(resource(loaded, twin), "claude").body, /Specimen body\./u, `the specimen fills ${twin}`);
      }
    },
  },
  {
    name: "192/00 the page restates no decision's reasoning",
    run: () => {
      const text = page();
      assert.ok(text.split("\n").length <= 150, `at most 150 lines (has ${text.split("\n").length})`);
      assert.match(text, /192_milestone_buildable-commands\/ARCHITECTURE\.md/u, "it points at the milestone's ARCHITECTURE for why");
      assert.doesNotMatch(text, /^#+\s*Alternatives/imu, "no Alternatives section");
    },
  },
];

// --- 192/01 — a practice ships a variant of a template ------------------------------------------

// The fixture of 192/01: the shipped story template, and the practice "notes" (keyed on
// "work.notes.enabled") with a variant of its "EXAMPLES.md" whose text is "# Variant map". With
// `memos`, a second package adds the practice "memos" (keyed on "work.memos.enabled") with its own
// variant of the same file. `plant` may change the notes package before it is loaded.
export const VARIANT_TEXT = "# Variant map\n";
export const MEMO_TEXT = "# Memo map\n";
export const EXAMPLES_REL = ".aof/templates/work/story/EXAMPLES.md";
export const variantMember = (practice = "notes", extra = {}) => ({
  id: `${practice}-examples`, kind: "template-variant", practice, template: "story", name: "EXAMPLES.md", file: `templates/${practice}/EXAMPLES.md`, ...extra,
});
export function variantFixture({ memos = false, plant = () => {}, name = FIRST } = {}) {
  const doc = { practices: [notesPractice()], members: [variantMember()] };
  const files = { "templates/notes/EXAMPLES.md": VARIANT_TEXT };
  const others = [];
  plant({ fragment: doc, files, others, variant: doc.members[0] });
  const packages = [...others, { name, fragment: doc, files }];
  if (memos) packages.push({ name: SECOND, fragment: { practices: [notesPractice(["work.memos.enabled"], "memos")], members: [variantMember("memos")] }, files: { "templates/memos/EXAMPLES.md": MEMO_TEXT } });
  return fixtureLoad(packages);
}
// The bundle cut down to its templates, so an install plans only what a template case is about.
export const templatesOnly = (bundle) => ({ ...bundle, resources: [], assets: [], hooks: [], workflows: [] });
const installedTemplate = (bundle, rel = EXAMPLES_REL) => renderBundleTemplateOutputs(bundle).find((output) => output.path === rel)?.content;

const VARIANT_FAULTS = [
  ["a variant names a template no bundle declares", ({ variant }) => { variant.template = "ghost"; }, ["notes-examples", "\"ghost\""]],
  ["a variant names a practice no bundle declares", ({ variant }) => { variant.practice = "ghost"; }, ["notes-examples", "\"ghost\""]],
  ["a variant's own file is missing", ({ variant }) => { variant.file = "templates/notes/gone.md"; }, ["notes-examples", "templates/notes/gone.md"]],
  ["a variant's id is already declared by another member", ({ others }) => {
    others.push({ name: FIRST, files: { "x.md": "X.\n" }, fragment: { members: [{ id: "notes-examples", kind: "command", file: "x.md", runtimes: ["claude"] }] } });
  }, ["notes-examples", FIRST]],
  ["a variant's file name holds a path separator", ({ variant }) => { variant.name = "nested/EXAMPLES.md"; }, ["notes-examples", "nested/EXAMPLES.md"]],
];

const variantTests = [
  {
    name: "192/01 the shipped bundle installs the templates it installs today",
    run: () => {
      const shipped = new Map(readShippedManifest().entries.filter((entry) => entry.resource?.kind === "template").map((entry) => [entry.path, entry.hash]));
      const rendered = renderBundleOutputs(loadBundle({ config: {} })).filter((output) => output.resource.kind === "template");
      assert.ok(rendered.length > 0 && rendered.length === shipped.size, `the shipped manifest records every template file (${rendered.length} rendered, ${shipped.size} recorded)`);
      for (const output of rendered) assert.equal(output.hash, shipped.get(output.path), `${output.path} has the hash the shipped manifest records`);
    },
  },
  {
    name: "192/01 a variant that is on stands in for the file at its own path, and the others are the default",
    run: () => {
      const on = renderBundleTemplateOutputs(templatesOnly(variantFixture().load(ON)));
      const off = renderBundleTemplateOutputs(templatesOnly(loadBundle()));
      assert.deepEqual(on.map((output) => output.path), off.map((output) => output.path), "the same paths, the variant at the default's");
      for (const [index, output] of on.entries()) {
        if (output.path === EXAMPLES_REL) assert.equal(output.content, `<!-- aof-generated: bundle -->\n\n${VARIANT_TEXT}`);
        else assert.equal(output.content, off[index].content, `${output.path} is the default`);
      }
    },
  },
  {
    name: "192/01 E5 · a variant of a file the template does not hold is refused at load",
    run: () => {
      const load = () => variantFixture({ name: PLANTED, plant: ({ variant }) => { variant.name = "NOTES.md"; } }).load();
      assert.throws(load, (error) => {
        for (const name of ["notes-examples", "NOTES.md", PLANTED]) assert.ok(error.message.includes(name), `the refusal names ${name}: ${error.message}`);
        return true;
      });
    },
  },
  ...VARIANT_FAULTS.map(([fault, plant, named]) => ({
    name: `192/01 a faulty variant is refused at load — ${fault}`,
    run: () => {
      const load = () => variantFixture({ name: PLANTED, plant }).load();
      assert.throws(load, (error) => {
        for (const name of [...named, PLANTED]) assert.ok(error.message.includes(name), `the refusal names ${name}: ${error.message}`);
        return true;
      });
    },
  })),
  {
    name: "192/01 two variants of one file that are both on are refused when the bundle is loaded for that config",
    run: () => {
      const fixture = variantFixture({ memos: true });
      assert.throws(() => fixture.load({ work: { notes: { enabled: true }, memos: { enabled: true } } }), (error) => {
        for (const name of ["notes-examples", "memos-examples", FIRST, SECOND, EXAMPLES_REL]) assert.ok(error.message.includes(name), `the refusal names ${name}: ${error.message}`);
        return true;
      });
      assert.equal(installedTemplate(fixture.load({ work: { memos: { enabled: true } } })), `<!-- aof-generated: bundle -->\n\n${MEMO_TEXT}`, "with one on, its variant is installed");
    },
  },
];

// --- 192/01 task 02 — the reference says how to ship a variant ---------------------------------

const variantSection = () => {
  const text = page();
  const start = text.search(/^## .*template variant/imu);
  assert.ok(start !== -1, "the page has a section on template variants");
  const rest = text.slice(start + 3);
  const end = rest.search(/^## /mu);
  return end === -1 ? rest : rest.slice(0, end);
};
const VARIANT_QUESTIONS = [
  ["how a variant member names its practice, the template and the file, with one written out", /"kind"\s*:\s*"template-variant"[\s\S]*"practice"[\s\S]*"template"[\s\S]*"name"[\s\S]*"file"/u],
  ["that the variant is installed at the default's own path when the practice is on", /\.aof\/templates\/work\/<template>\/<name>[\s\S]*on|on[\s\S]*\.aof\/templates\/work\/<template>\/<name>/u],
  ["that the default is installed when the practice is off", /off[^\n]*\n?[^\n]*default|default[^\n]*\n?[^\n]*off/iu],
  ["that two variants of one file cannot both be on", /two\s+variants\s+of\s+(?:one|the\s+same)\s+file[\s\S]*(?:refused|cannot)/iu],
  ["that a person's edit to an installed template is kept, as for any managed file", /edit[\s\S]*drift\s+warning[\s\S]*(?:kept|left)/iu],
];

const variantReferenceTests = [
  ...VARIANT_QUESTIONS.map(([answer, pattern]) => ({
    name: `192/01 the page answers each question about a template variant — ${answer}`,
    run: () => assert.match(variantSection(), pattern),
  })),
  {
    name: "192/01 the specimen on the page is one the loader accepts",
    run: () => {
      const found = specimens(variantSection()).filter((doc) => (doc.members ?? []).some((member) => member.kind === "template-variant"));
      assert.ok(found.length > 0, "the section holds a template variant specimen");
      for (const specimen of found) {
        const variants = specimen.members.filter((member) => member.kind === "template-variant");
        const practices = specimen.practices ?? [...new Set(variants.map((member) => member.practice))].map((id) => notesPractice([`work.${id}.enabled`], id));
        const files = Object.fromEntries(variants.map((member) => [member.file, `Specimen ${member.id}.\n`]));
        const bundle = fixtureLoad([{ name: PLANTED, fragment: { practices, members: specimen.members }, files }]).load(practiceOn(practices));
        for (const member of variants) {
          const template = bundle.templates.find((entry) => entry.id === member.template);
          assert.ok(template, `the specimen names the shipped template "${member.template}"`);
          assert.equal(template.variantTexts?.[member.name], `Specimen ${member.id}.\n`, `the specimen stands in for ${member.template}/${member.name}`);
        }
      }
    },
  },
  {
    name: "192/01 the page stays one page",
    run: () => {
      const count = page().split("\n").length;
      assert.ok(count <= 150, `at most 150 lines (has ${count})`);
    },
  },
];

// --- 198/00 — a fragment names the runtimes it is for --------------------------------------------
//
// Covers the @executable scenarios of milestone 198 / story 00's
//   tasks/00_a-fragment-names-the-runtimes-it-is-for.feature   (R1; FF-19801 is in test/arch/practices)
//   tasks/01_a-scoped-fragment-lands-only-where-it-is-for.feature (R2, R3; FF-19802 likewise)
//   tasks/03_the-reference-says-how-to-scope-a-fragment.feature
// on 192/00's fixture, where "the Claude-only fragment" is "notes-demo" declared with
// "runtimes": ["claude"], a common body "Use the Artifact tool." and no Codex body.

export const ARTIFACT = "Use the Artifact tool.";
export const SCOPED_FILES = {
  ...BASE_FILES,
  "fragments/notes/claude.md": `${ARTIFACT}\n`,
  "fragments/notes/claude.codex.md": `${ARTIFACT}\n`,
  "one.md": "Note one.\n",
  "alpha.md": "Alpha.\n",
  "alpha-plus.md": "Alpha plus.\n",
};

// The base fixture with "notes-demo" made the Claude-only fragment. `plant(doc, notesDemo)` edits the
// package's descriptor before it is handed in; `files` adds to or replaces its texts.
export function scopedFixture(plant = () => {}, files = {}) {
  const doc = baseFragment();
  const notes = doc.members.find((member) => member.id === "notes-demo");
  notes.runtimes = ["claude"];
  notes.file = "fragments/notes/claude.md";
  delete notes.variants;
  plant(doc, notes);
  return fixtureLoad([{ name: FIRST, fragment: doc, files: { ...SCOPED_FILES, ...files } }]);
}
// The same fixture with the Claude-only fragment deleted from its descriptor.
export const withoutScoped = () => scopedFixture((doc) => { doc.members = doc.members.filter((member) => member.id !== "notes-demo"); });

const ALL = ["claude", "opencode", "codex"];
const NOTES_ON = { work: { notes: { enabled: true } } };
const RENDERED = Object.freeze({
  claudeCommand: ".claude/commands/aof/demo.md",
  opencodeCommand: ".opencode/commands/aof/demo.md",
  claudeAgent: ".claude/agents/aof-demo.md",
  opencodeAgent: ".opencode/agents/aof-demo.md",
  codexAgent: ".codex/agents/aof-demo.toml",
});
const codexSkillFiles = (rendered) => [...rendered].filter(([file]) => file.startsWith(".agents/skills/aof-demo/"));
function refusal(load) {
  try {
    load();
  } catch (error) {
    return error.message;
  }
  return assert.fail("the load is refused");
}
const assertNames = (message, ...names) => { for (const name of names) assert.ok(message.includes(name), `the refusal names ${name}: ${message}`); };
const t198 = (task, name, run) => ({ name: `198/00 task ${task} · ${name}`, run });

// ── task 00 — the field and its load rule ────────────────────────────────────────────────────

const scopedLoadTests = [
  t198("00", "E1 · a Claude-only fragment needs no Codex body", () => {
    assert.ok(CODEX_VARIANTS.includes("<!-- variant:procedure-demo -->\nBefore.\n\n<!-- slot:demo.notes -->"), "the Codex procedure of demo carries the slot");
    const bundle = scopedFixture().load(NOTES_ON);
    assert.ok(resource(bundle, "demo"), "the load succeeds");
  }),
  t198("00", "E2 · a body for a runtime the fragment does not name is refused", () => {
    const message = refusal(() => scopedFixture((doc, notes) => { notes.variants = { codex: { file: "fragments/notes/claude.codex.md" } }; }).load());
    assertNames(message, '"notes-demo"', FIRST, "codex", '"demo.notes"', 'does not name "codex" in its runtimes');
  }),
  t198("00", "E3 · a runtime name outside the capability matrix is refused", () => {
    const message = refusal(() => scopedFixture((doc, notes) => { notes.runtimes = ["claud"]; }).load());
    assertNames(message, '"notes-demo"', '"claud"', '"claude", "codex", "opencode"');
  }),
  ...[
    ['"runtimes": []', [], {}, "names no runtime"],
    ['"runtimes": "claude"', "claude", {}, "which is not a list"],
    ['"runtimes": ["codex"]', ["codex"], { variants: { codex: { file: "fragments/notes/claude.codex.md" } } }, "has a common body for the slot \"demo.notes\", which no runtime it names renders"],
  ].map(([label, runtimes, bodies, named]) => t198("00", `each list that contradicts the fragment's bodies or slot is refused — ${label}`, () => {
    const message = refusal(() => scopedFixture((doc, notes) => Object.assign(notes, { runtimes }, bodies)).load());
    assertNames(message, '"notes-demo"', named);
  })),
  t198("00", "a scoped fragment whose named runtimes carry none of its slot is refused", () => {
    const message = refusal(() => scopedFixture((doc) => {
      const entry = doc.members.find((member) => member.id === "notes-entry");
      Object.assign(entry, { runtimes: ["claude"], file: "fragments/notes/claude.md" });
      delete entry.variants;
    }).load());
    assertNames(message, '"notes-entry"', '"entry.rules"', "no text claude renders of command:demo carries the slot");
  }),
  t198("00", "a scoped fragment still needs a body for each runtime it names whose text carries the slot", () => {
    const message = refusal(() => scopedFixture((doc, notes) => { notes.runtimes = ["claude", "codex"]; }).load());
    assertNames(message, '"notes-demo"', "has no codex body", '"demo.notes"');
  }),
  t198("00", "a runtime it names that renders from the common source takes the common body", () => {
    const bundle = scopedFixture((doc, notes) => { notes.runtimes = ["opencode"]; }).load(NOTES_ON);
    assert.ok(renderOf(bundle, ["opencode"], "demo").get(RENDERED.opencodeCommand).includes(ARTIFACT), "OpenCode's command holds the common body");
  }),
  t198("00", "an unscoped fragment is held to 192's rule, unchanged", () => {
    const message = refusal(() => scopedFixture((doc, notes) => { delete notes.runtimes; }).load());
    assertNames(message, `Fragment "notes-demo" contributed by ${FIRST} has no codex body for the slot "demo.notes", which the codex text of command:demo carries.`);
  }),
  t198("00", "the rule that a common slot is in every authored variant is unchanged", () => {
    const message = refusal(() => scopedFixture((doc) => {
      doc.members.push(fragment("notes-extra", "notes", "demo.extra", { file: "fragments/notes/claude.md" }, { runtimes: ["claude"] }));
    }, { "commands/demo.md": DEMO_SOURCE.replace("After.", "After.\n\n<!-- slot:demo.extra -->") }).load());
    assertNames(message, '"command:demo"', '"demo.extra"', "not in its codex text");
  }),
];

// ── task 01 — a scoped fragment lands only where it is for ───────────────────────────────────

const noMarkerIn = (rendered) => { for (const [file, content] of rendered) noMarker(content, file); };

const scopedRenderTests = [
  t198("01", "E4 · Claude's command holds the prose, and OpenCode's and Codex's do not", () => {
    const rendered = renderOf(scopedFixture().load(NOTES_ON), ALL, "demo");
    assert.ok(rendered.get(RENDERED.claudeCommand).includes(ARTIFACT), "the Claude command holds it");
    assert.ok(!rendered.get(RENDERED.opencodeCommand).includes(ARTIFACT), "the OpenCode command does not");
    const skill = codexSkillFiles(rendered);
    assert.ok(skill.length > 0, "the Codex skill is rendered");
    for (const [file, content] of skill) assert.ok(!content.includes(ARTIFACT), `${file} does not hold it`);
    noMarkerIn(rendered);
  }),
  t198("01", "E5 · a scoped and an unscoped fragment share one slot", () => {
    const bundle = scopedFixture((doc) => {
      const at = doc.members.findIndex((member) => member.id === "notes-demo");
      doc.members.splice(at, 0, fragment("notes-one", "notes", "demo.notes", { file: "one.md", variants: { codex: { file: "one.md" } } }));
    }).load(NOTES_ON);
    const rendered = renderOf(bundle, ["claude", "opencode"], "demo");
    assert.ok(rendered.get(RENDERED.claudeCommand).includes(`Note one.\n\n${ARTIFACT}`), rendered.get(RENDERED.claudeCommand));
    const opencode = rendered.get(RENDERED.opencodeCommand);
    assert.ok(opencode.includes("Before.\n\nNote one.\n\nAfter."), opencode);
    assert.ok(!opencode.includes(ARTIFACT), opencode);
  }),
  t198("01", "E6 · a scoped replacer replaces only in its own runtimes", () => {
    const bundle = scopedFixture((doc) => {
      doc.practices.push(notesPractice(["work.plus.enabled"], "plus"));
      doc.members = doc.members.filter((member) => member.id !== "notes-demo");
      doc.members.push(
        fragment("alpha", "notes", "demo.notes", { file: "alpha.md", variants: { codex: { file: "alpha.md" } } }),
        fragment("alpha-plus", "plus", "demo.notes", { file: "alpha-plus.md" }, { runtimes: ["claude"], replaces: "alpha" }),
      );
    }).load({ work: { notes: { enabled: true }, plus: { enabled: true } } });
    const rendered = renderOf(bundle, ALL, "demo");
    const claude = rendered.get(RENDERED.claudeCommand);
    assert.ok(claude.includes("Alpha plus.") && !claude.includes("Alpha.\n"), claude);
    const procedure = rendered.get(".agents/skills/aof-demo/procedure.md");
    for (const [where, text] of [["OpenCode", rendered.get(RENDERED.opencodeCommand)], ["Codex", procedure]]) {
      assert.ok(text.includes("Alpha.") && !text.includes("Alpha plus."), `${where}: ${text}`);
    }
  }),
  ...[
    [["claude"], [RENDERED.claudeAgent], [RENDERED.opencodeAgent, RENDERED.codexAgent]],
    [["opencode"], [RENDERED.opencodeAgent], [RENDERED.claudeAgent, RENDERED.codexAgent]],
    [["codex"], [RENDERED.codexAgent], [RENDERED.claudeAgent, RENDERED.opencodeAgent]],
    [["claude", "codex"], [RENDERED.claudeAgent, RENDERED.codexAgent], [RENDERED.opencodeAgent]],
  ].map(([runtimes, holds, lacks]) => t198("01", `an agent brief's scoped prose lands on its own runtimes alone — "runtimes": ${JSON.stringify(runtimes)}`, () => {
    const bundle = scopedFixture((doc) => {
      const agent = doc.members.find((member) => member.id === "notes-agent");
      agent.runtimes = runtimes;
      delete agent.file;
      delete agent.variants;
      if (runtimes.some((runtime) => runtime !== "codex")) agent.file = "fragments/notes/claude.md";
      if (runtimes.includes("codex")) agent.variants = { codex: { file: "fragments/notes/claude.codex.md" } };
    }).load(NOTES_ON);
    const rendered = renderOf(bundle, ALL, "aof-demo");
    for (const file of holds) assert.ok(rendered.get(file).includes(ARTIFACT), `${file} holds the body`);
    for (const file of lacks) assert.ok(!rendered.get(file).includes(ARTIFACT), `${file} does not hold the body`);
  })),
  t198("01", "an inline slot the Claude-only fragment does not fill for OpenCode removes only its own line there", () => {
    const inline = "---\ndescription: Demo\n---\nBefore.\n<!-- slot:demo.notes -->\nAfter.\n";
    const rendered = renderOf(scopedFixture(() => {}, { "commands/demo.md": inline }).load(NOTES_ON), ["claude", "opencode"], "demo");
    assert.ok(rendered.get(RENDERED.opencodeCommand).includes("Before.\nAfter.\n"), rendered.get(RENDERED.opencodeCommand));
    assert.ok(rendered.get(RENDERED.claudeCommand).includes(`Before.\n${ARTIFACT}\nAfter.\n`), rendered.get(RENDERED.claudeCommand));
  }),
  t198("01", "a rendered Codex skill is unchanged by a Claude-only fragment", () => {
    const withIt = renderOf(scopedFixture().load(NOTES_ON), ["codex"], "demo", "aof-demo");
    const without = renderOf(withoutScoped().load(NOTES_ON), ["codex"], "demo", "aof-demo");
    assert.deepEqual([...withIt], [...without]);
  }),
  t198("01", "the bundle a reader loads carries no runtime's prose into another's", () => {
    const bundle = scopedFixture().load(NOTES_ON);
    assert.ok(resource(bundle, "demo").commonBodies, "the demo command's common body differs by runtime, so the case is not vacuous");
    assert.ok(!resource(bundle, "demo").body.includes(ARTIFACT), "the body no runtime resolved holds none of it");
    for (const entry of bundle.resources) {
      if (entry.runtimeVariants && !Object.hasOwn(entry.runtimeVariants, "opencode")) continue;
      const resolved = resolveBundleVariant(entry, "opencode");
      for (const text of [resolved.body, ...(resolved.associatedFiles ?? []).map((attachment) => attachment.content)]) {
        assert.ok(!String(text).includes(ARTIFACT), `${entry.kind}:${entry.id} resolved for opencode holds no Claude-only prose`);
      }
    }
  }),
  t198("01", "a configured delegation model reaches each runtime's own common body", () => {
    const source = DEMO_SOURCE.replace("After.", `Delegate with -m ${DEFAULT_DELEGATION_MODEL}.`);
    const [demo] = applyDelegationModelToResources(only(scopedFixture(() => {}, { "commands/demo.md": source }).load(NOTES_ON), "demo").resources, "gpt-other");
    assert.ok(demo.commonBodies, "the case has a per-runtime common body");
    for (const runtime of ["claude", "opencode"]) {
      const body = resolveBundleVariant(demo, runtime).body;
      assert.ok(body.includes("-m gpt-other.") && !body.includes(DEFAULT_DELEGATION_MODEL), `${runtime}: ${body}`);
    }
  }),
  t198("01", "E7 · a scoped fragment that is off renders as if it were not declared", () => {
    const members = ["demo", "inline", "aof-demo"];
    const off = renderOf(scopedFixture().load({}), ALL, ...members);
    const deleted = renderOf(withoutScoped().load({}), ALL, ...members);
    assert.deepEqual([...off], [...deleted]);
  }),
  t198("01", "E8 · the shipped bundle renders one body for Claude and OpenCode, as it does today", () => {
    const bundle = loadBundle({ config: { work: { examples: { enabled: true }, plan: { enabled: true } } } });
    assert.deepEqual(bundle.resources.filter((entry) => entry.commonBodies).map((entry) => entry.id), [], "no shipped resource has a per-runtime common body");
    for (const [kind, id] of [["command", "refine"], ["command", "verify"], ["agent", "aof-designer"]]) {
      const shipped = bundle.resources.find((entry) => entry.kind === kind && entry.id === id);
      assert.equal(resolveBundleVariant(shipped, "claude").body, resolveBundleVariant(shipped, "opencode").body, `${kind}:${id}`);
    }
  }),
  ...[["on", NOTES_ON, lines("Before.", "", "Note one.", "Note two.", "", "After.")], ["off", {}, lines("Before.", "", "After.")]].map(([state, config, composed]) => t198("01", `unscoped fragments still compose one common body for every runtime that renders it — ${state}`, () => {
    const demo = resource(baseFixture().load(config), "demo");
    assert.equal(demo.commonBodies, undefined);
    assert.equal(resolveBundleVariant(demo, "claude").body, resolveBundleVariant(demo, "opencode").body);
    assert.equal(demo.body, composed, "the body 192's composer renders for the same fixture");
  })),
];

// ── task 03 — the reference says how to scope a fragment ─────────────────────────────────────

const flat = () => page().replace(/\s+/gu, " ");
const SCOPED_QUESTIONS = [
  ['how a fragment names its runtimes with "runtimes", with one written out', /"kind": "fragment"[^}]*"runtimes": \["claude"\]/u],
  ['that leaving "runtimes" out means every runtime, as before', /Leaving `runtimes` out means every runtime, as before/u],
  ["that a scoped fragment needs a body only for the runtimes it names, and that a body for any other is refused", /needs a body only for the runtimes it names; a body for any other is refused/u],
  ["that a runtime it names takes the common body when that runtime renders the member's common source", /A runtime it names takes the common body \(`file`\) when it renders the member's common source/u],
  ["that OpenCode and Claude Code are given different texts when a scoped fragment is on for only one of them", /Claude Code and OpenCode, which share one common source, are given different texts while a scoped fragment is on for only one of them/u],
  ["that a scoped replacer replaces only in its own runtimes", /scoped replacer replaces only in its own runtimes/u],
  ["that the practice list names the runtimes of a practice whose fragments are all scoped", /`aof work update` names the runtimes of a practice whose fragments are all scoped/u],
];
const refusedSection = () => {
  const text = page();
  const start = text.search(/^## .*refused at load/mu);
  assert.ok(start !== -1, "the page has a section on what is refused at load");
  const rest = text.slice(start + 3);
  return rest.slice(0, rest.search(/^## /mu)).replace(/\s+/gu, " ");
};

const scopedReferenceTests = [
  ...SCOPED_QUESTIONS.map(([answer, pattern]) => t198("03", `the page answers each question about a scoped fragment — ${answer}`, () => assert.match(flat(), pattern))),
  t198("03", "the page's refusals list names the scoped fragment's refusals", () => {
    const section = refusedSection();
    for (const pattern of [/a runtime outside the capability matrix/u, /an empty list/u, /a body for a runtime it does not name/u]) assert.match(section, pattern);
  }),
  t198("03", "the scoped specimen on the page is one the loader accepts", () => {
    const found = specimens(page()).filter((doc) => (doc.members ?? []).some((member) => member.runtimes));
    assert.ok(found.length > 0, "the page holds a scoped fragment specimen");
    for (const specimen of found) {
      const files = {};
      const twins = [];
      const members = specimen.members.filter((member) => member.kind === "fragment").map((member) => {
        const twin = `specimen-${member.target.split(":")[1]}`;
        files[`specimen/${twin}.md`] = `---\ndescription: Specimen\n---\nText.\n\n<!-- slot:${member.slot} -->\n`;
        for (const body of [member.file, ...Object.values(member.variants ?? {}).map((variant) => variant.file)].filter(Boolean)) files[body] = "Specimen body.\n";
        twins.push({ id: twin, kind: "command", file: `specimen/${twin}.md`, runtimes: ["claude", "opencode"], commandNamespace: "aof" });
        return { ...member, target: `command:${twin}` };
      });
      const doc = { practices: specimen.practices, members: [...twins, ...members] };
      const bundle = fixtureLoad([{ name: PLANTED, fragment: doc, files }]).load(practiceOn(doc.practices));
      for (const [index, twin] of twins.entries()) {
        const rendered = renderOf(bundle, ALL, twin.id);
        const paths = { claude: `.claude/commands/aof/${twin.id}.md`, opencode: `.opencode/commands/aof/${twin.id}.md`, codex: `.agents/skills/aof-${twin.id}/SKILL.md` };
        for (const runtime of ALL) {
          const holds = rendered.get(paths[runtime]).includes("Specimen body.");
          assert.equal(holds, members[index].runtimes.includes(runtime), `${runtime}'s render ${holds ? "holds" : "lacks"} the specimen's body`);
        }
      }
    }
  }),
  t198("03", "the page stays within its budget", () => {
    const count = page().split("\n").length;
    assert.ok(count <= 150, `at most 150 lines (has ${count})`);
    assert.doesNotMatch(page(), /^#+\s*Alternatives/imu, "no Alternatives section");
  }),
];

export const bundleComposeTests = [...slotTests, ...orderTests, ...runtimeTests, ...refusalTests, ...referenceTests, ...variantTests, ...variantReferenceTests, ...scopedLoadTests, ...scopedRenderTests, ...scopedReferenceTests];
