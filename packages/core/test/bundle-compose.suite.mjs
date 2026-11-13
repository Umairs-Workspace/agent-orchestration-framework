// Traceability wiring for milestone 192 / story 00 — a command is composed from slots and fragments.
//
// Covers the @executable scenarios of
//   tasks/00_a-slot-holds-what-is-on-and-leaves-nothing-behind.feature   (R1, E1–E3)
//   tasks/01_fragments-keep-a-declared-order-and-one-can-replace-another.feature (R2, E4–E6)
//   tasks/02_each-runtime-gets-the-body-written-for-it.feature           (R3, E7–E8)
//   tasks/04_a-contribution-that-cannot-land-is-refused-at-load.feature
//   tasks/05_the-reference-says-how-to-write-a-slot-and-a-fragment.feature
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
import { loadBundle, readDescriptor, renderBundleOutputs } from "../src/work/bundle.mjs";
import { generateBundleManifest, readShippedManifest, serializeBundleManifest } from "../src/work/bundle-manifest.mjs";
import { composeText, practiceStates, slotOnLine } from "../src/work/bundle-compose.mjs";

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
      // 192/02 — the shipped bundle declares its two practices: core's build brief, then discovery.
      assert.deepEqual(shipped.practices.map((practice) => [practice.id, practice.contributor]), [["build-brief", "core"], ["discovery", "@aof/specification-by-example"]]);
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
        for (const twin of twins.keys()) assert.match(resource(loaded, twin).body, /Specimen body\./u, `the specimen fills ${twin}`);
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

export const bundleComposeTests = [...slotTests, ...orderTests, ...runtimeTests, ...refusalTests, ...referenceTests];
