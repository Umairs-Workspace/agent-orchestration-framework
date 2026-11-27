// The design-system practice and the extract command, at the render (milestone 198 / story 01,
// 198/ADR-005 §1, ADR-008, 192/ADR-003).
//
// Covers the render-level scenarios of
//   tasks/00_the-design-system-practice-is-registered.feature — E1, E2, the "only true" outline, the
//     registry and workspace scenario, and the packaged binary's assets
//   tasks/01_the-extract-command-is-claude-only-and-always-installed.feature — E3, the "installed
//     whether on or off" outline, E4 and the verbs as rendered, and the shipped manifest and this
//     repository's render
// and, from milestone 198 / story 02,
//   tasks/00_the-practice-prose-lands-on-claude-alone.feature — E1, the "not on" outline, E2, the
//     Codex and OpenCode renders, and the three prose scenarios (FF-19802 and FF-19803 are their
//     own files)
// and, from milestone 198 / story 03,
//   tasks/00_the-design-template-records-design-system-changes.feature — E1, E2, E3, the "not on"
//     outline and "the sections say what each mode writes"
//   tasks/02_verify-re-syncs-an-owned-system-at-accept.feature — E17's "slot:" leg (its byte-for-byte
//     leg is the work-init golden lane), E18, E15, E16, E10–E14 and "never writes to the code"
// The package-seam halves (the bundle's own declarations, the command's source) are the package's
// suite, packages/design-system/test/practice.suite.mjs.
//
// Scratch projects are initialised from this checkout's bundle for Claude, Codex and opencode, each
// under its own `AOF_GLOBAL_HOME`, given a `work.ui` block, and updated (`practiceFixtureRoot`).
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
import { practiceFixtureRoot, spawnCliSync } from "../../support/cli-spawn.mjs";
import { loadBundle, readDescriptor, renderBundleOutputs } from "../../../packages/core/src/work/bundle.mjs";
import { practiceStates } from "../../../packages/core/src/work/bundle-compose.mjs";
import { generateBundleManifest } from "../../../packages/core/src/work/bundle-manifest.mjs";
import { PRACTICES } from "../../../packages/core/src/practices.mjs";
import { RUNTIMES } from "../../../packages/core/src/model.mjs";
import { generatePackageAssetManifest } from "../../../scripts/sea-asset-manifest.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const COMMAND = ".claude/commands/aof/design-system.md";
const ON = Object.freeze({ enabled: true, name: "AOF", mode: "owned", source: ["apps/ui/src/index.css"] });
const BLOCKS = Object.freeze({ DS_ABSENT: undefined, DS_OFF: { enabled: false }, DS_ON: ON });
const project = (name) => practiceFixtureRoot(repoRoot, name, BLOCKS[name] === undefined ? {} : { ui: { designSystem: BLOCKS[name] } });
const posix = (value) => value.replaceAll("\\", "/");

// 198/03 — `aof work update --json` in a fixture, after setting its `work.ui` block: the whole answer.
function updateWith(root, ui) {
  const configPath = path.join(root, ".aof", "aof.config.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  config.work = { ...config.work };
  if (ui === undefined) delete config.work.ui;
  else config.work.ui = ui;
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  const result = spawnCliSync(process.execPath, [path.join(repoRoot, "packages/core/bin/aof.mjs"), "work", "update", "--json"], {
    cwd: root, encoding: "utf8", windowsHide: true,
    env: { ...process.env, AOF_GLOBAL_HOME: path.join(path.dirname(root), "home"), NODE_NO_WARNINGS: "1" },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}
const actionOn = (answer, file) => answer.actions.find((action) => posix(action.path ?? "") === file || posix(action.path ?? "").endsWith(`/${file}`))?.action;

// `aof work update --json` in a fixture, answering its practice list.
function practicesAfterUpdate(root) {
  const result = spawnCliSync(process.execPath, [path.join(repoRoot, "packages/core/bin/aof.mjs"), "work", "update", "--json"], {
    cwd: root, encoding: "utf8", windowsHide: true,
    env: { ...process.env, AOF_GLOBAL_HOME: path.join(path.dirname(root), "home"), NODE_NO_WARNINGS: "1" },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout).practices;
}

function filesUnder(root, rel) {
  const dir = path.join(root, rel);
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile()) out.push(posix(path.relative(root, path.join(entry.parentPath ?? entry.path, entry.name))));
  }
  return out;
}

// Every runtime's render of the bundle for one config, by path.
const renderAll = (config) => new Map(renderBundleOutputs(loadBundle({ config }), { runtimes: Object.keys(RUNTIMES) }).map((output) => [posix(output.path), output.content]));

// 198/02 — the practice's three Claude texts, and each one's twins in the other runtimes.
const CLAUDE_TEXTS = Object.freeze([".claude/commands/aof/refine.md", ".claude/commands/aof/verify.md", ".claude/agents/aof-designer.md"]);
const OTHER_TEXTS = (files) => files.filter((file) => /^\.opencode\/(commands\/aof\/(refine|verify)\.md|agents\/aof-designer\.md)$/u.test(file) || /^\.agents\/skills\/aof-(refine|verify)\//u.test(file) || file === ".codex/agents/aof-designer.toml");
// Each fragment's body, as the package ships it.
const FRAGMENT_DIR = path.join(repoRoot, "packages/design-system/assets/fragments/design-system");
const fragmentBody = (file, slot) => {
  const text = readFileSync(path.join(FRAGMENT_DIR, file), "utf8").replace(/\r\n/gu, "\n");
  const rest = text.slice(text.indexOf(`<!-- fragment:${slot} -->`) + `<!-- fragment:${slot} -->`.length);
  const end = rest.indexOf("\n<!-- fragment:");
  return (end < 0 ? rest : rest.slice(0, end)).replace(/^\n+|\n+$/gu, "");
};
const BODIES = Object.freeze({
  ".claude/commands/aof/refine.md": fragmentBody("refine.md", "decide.designer"),
  ".claude/commands/aof/verify.md": fragmentBody("verify.md", "conformance.baseline"),
  ".claude/agents/aof-designer.md": fragmentBody("aof-designer.md", "ownership.design-system"),
});
// 198/03 — the milestone DESIGN.md template, and core's own copy of it.
const DESIGN_TEMPLATE = ".aof/templates/work/milestone/DESIGN.md";
// "Today's" is core's template AS RENDERED (it gains the generated header), so it is read from a
// render with no work.ui block, never from the source file.
const todaysDesign = () => renderAll({ work: {} }).get(DESIGN_TEMPLATE);
// A text with the two design-system sections taken out: each runs from its heading to the next.
const withoutSections = (text) => text.replace(/## Design-system (?:changes|gaps)\n[\s\S]*?(?=\n## )\n/gu, "");
const RESYNC = fragmentBody("verify.md", "checks.design-system");
// A rendered text read as prose: one line, whitespace collapsed, so a phrase may wrap.
const flat = (text) => text.replace(/\s+/gu, " ");

// The body's one sentence no other command carries.
const BODY_MARK = "Resolve the title before publishing";

export const archTests = [
  {
    // Amended by 198/02 and 198/03: 02's fragments are all Claude-only, but 03's template variant
    // reaches every runtime, so the entry names no runtimes (198/ADR-001 §5).
    name: "198/01 00 E1 (amended 198/03) · the practice list names design-system on its key, off with no block and on with one, and holds no runtimes",
    run: () => {
      const off = practicesAfterUpdate(project("DS_ABSENT")).find((practice) => practice.id === "design-system");
      assert.deepEqual([off.keys, off.on], [["work.ui.designSystem.enabled"], false]);
      assert.equal(Object.hasOwn(off, "runtimes"), false, "its JSON entry holds no runtimes: the DESIGN.md variant reaches every runtime");
      const on = practicesAfterUpdate(project("DS_ON")).find((practice) => practice.id === "design-system");
      assert.equal(on.on, true);
    },
  },
  {
    // Amended by 198/02: at 01 the practice had no prose, so turning it on changed nothing. It now
    // changes exactly Claude's three texts its fragments fill, and no other file.
    name: "198/01 00 E2 (amended 198/02, 198/03) · turning the practice on changes only Claude's refine, verify and aof-designer, and the milestone DESIGN.md template, for claude, codex and opencode",
    run: () => {
      assert.deepEqual([...Object.keys(RUNTIMES)].sort(), ["claude", "codex", "opencode"]);
      const off = renderAll({ work: {} });
      const on = renderAll({ work: { ui: { designSystem: ON } } });
      assert.deepEqual([...on.keys()], [...off.keys()], "the same files");
      assert.deepEqual([...off.keys()].filter((file) => on.get(file) !== off.get(file)).sort(), [...CLAUDE_TEXTS, DESIGN_TEMPLATE].sort());
    },
  },
  {
    name: "198/01 00 outline · only the boolean true turns the practice on (4 rows)",
    run: () => {
      const { practices } = readDescriptor();
      const state = (config) => practiceStates(practices, config).get("design-system");
      assert.equal(state({ work: { ui: { designSystem: { enabled: true } } } }), true);
      assert.equal(state({ work: { ui: { designSystem: { enabled: false } } } }), false);
      assert.equal(state({ work: { ui: { designSystem: { enabled: "true" } } } }), false);
      assert.equal(state({ work: {} }), false);
    },
  },
  {
    name: "198/01 00 the package is a workspace package that core's practice registry names, after specification by example",
    run: () => {
      const names = PRACTICES.map((practice) => practice.name);
      assert.ok(names.indexOf("@aof/design-system") > names.indexOf("@aof/specification-by-example"), names.join(", "));
      for (const manifest of ["package.json", "packages/core/package.json"]) {
        const declared = JSON.parse(readFileSync(path.join(repoRoot, manifest), "utf8"));
        assert.equal({ ...declared.dependencies, ...declared.devDependencies }["@aof/design-system"], "workspace:*", manifest);
      }
      const lock = readFileSync(path.join(repoRoot, "yarn.lock"), "utf8");
      assert.match(lock, /^"@aof\/design-system@workspace:\*, @aof\/design-system@workspace:packages\/design-system":$/mu);
      const runner = readFileSync(path.join(repoRoot, "scripts/test.mjs"), "utf8");
      const imported = /import \{ tests as (\w+) \} from "\.\.\/packages\/design-system\/test\/index\.mjs";/u.exec(runner);
      assert.ok(imported, "scripts/test.mjs imports the package's index");
      assert.ok(runner.includes(`...${imported[1]},`), "and spreads it");
    },
  },
  {
    name: "198/01 00 the packaged binary carries the package's assets",
    run: () => {
      const entry = generatePackageAssetManifest(repoRoot).find((candidate) => candidate.name === "@aof/design-system");
      assert.ok(entry, "the package asset manifest lists the package");
      const listed = entry.files.map((file) => posix(String(file.rel ?? file)));
      for (const file of ["bundle.json", "commands/design-system.md"]) assert.ok(listed.includes(file), `${file} rides the payload`);
    },
  },
  {
    name: "198/01 01 E3 · the command is rendered for Claude and for no other runtime",
    run: () => {
      const root = project("DS_ABSENT");
      assert.ok(existsSync(path.join(root, COMMAND)), `${COMMAND} exists`);
      const others = [...filesUnder(root, ".agents/skills"), ...filesUnder(root, ".opencode/commands")];
      assert.ok(others.length > 0, "codex and opencode rendered their own files");
      assert.deepEqual(others.filter((file) => file.includes("design-system")), [], "no file is named for design-system");
      const codex = [...filesUnder(root, ".agents/skills"), ...filesUnder(root, ".codex")];
      assert.deepEqual(codex.filter((file) => readFileSync(path.join(root, file), "utf8").includes(BODY_MARK)), [], "no Codex skill's text holds the command's body");
    },
  },
  {
    name: "198/01 01 outline · the practice's state does not decide whether the command is installed (3 rows)",
    run: () => {
      for (const name of Object.keys(BLOCKS)) assert.ok(existsSync(path.join(project(name), COMMAND)), `${name}: ${COMMAND} exists`);
    },
  },
  {
    name: "198/01 01 E4 + the verbs · the rendered command reads from-code.md from the type at run time and calls the three verbs",
    run: () => {
      const text = readFileSync(path.join(project("DS_ABSENT"), COMMAND), "utf8");
      assert.match(text, /from-code\.md` \*\*from the type, now, at run time\*\*/);
      for (const verb of ["aof design-system tokens", "aof design-system check", "aof design-system use"]) assert.ok(text.includes(verb), verb);
      assert.ok(text.includes(BODY_MARK));
    },
  },
  {
    name: "198/01 01 the shipped manifest and this repository's render carry the command",
    run: () => {
      const shipped = JSON.parse(readFileSync(path.join(repoRoot, "packages/acd/assets/manifest.json"), "utf8"));
      const entry = shipped.entries.find((candidate) => candidate.path === COMMAND);
      assert.ok(entry, "the shipped manifest lists the command");
      assert.equal(entry.hash, generateBundleManifest().entries.find((candidate) => candidate.path === COMMAND).hash, "at the bundle's own hash");
      assert.deepEqual(shipped.entries.filter((candidate) => candidate.path.includes("design-system")).map((candidate) => candidate.runtime), ["claude"]);
      const rendered = renderBundleOutputs(loadBundle({ config: {} }), { runtimes: ["claude"] }).find((output) => posix(output.path) === COMMAND).content;
      assert.equal(readFileSync(path.join(repoRoot, COMMAND), "utf8").replace(/\r\n/gu, "\n"), rendered.replace(/\r\n/gu, "\n"), "this repository's render is current");
    },
  },
  {
    name: "198/02 00 E1 · with no work.ui block, no rendered file holds \"slot:\", for claude, codex and opencode",
    run: () => {
      const off = renderAll({ work: {} });
      assert.ok(CLAUDE_TEXTS.every((file) => off.has(file)), "the three Claude texts are rendered");
      assert.deepEqual([...off].filter(([, text]) => text.includes("slot:")).map(([file]) => file), []);
      // Byte-for-byte against the committed baselines is the work-init golden lane's (test/golden).
    },
  },
  {
    name: "198/02 00 outline · a block that is not on changes no render (2 rows)",
    run: () => {
      const none = renderAll({ work: {} });
      for (const block of [{ enabled: false, name: "AOF", mode: "reference" }, { enabled: "true", name: "AOF", mode: "reference" }]) {
        const render = renderAll({ work: { ui: { designSystem: block } } });
        assert.deepEqual([...render.keys()], [...none.keys()], JSON.stringify(block));
        for (const [file, text] of none) assert.equal(render.get(file), text, `${JSON.stringify(block)}: ${file}`);
      }
    },
  },
  {
    name: "198/02 00 E2 · with the practice on, Claude's three texts hold its prose and the others hold none, and no file holds \"slot:\"",
    run: () => {
      const on = renderAll({ work: { ui: { designSystem: ON } } });
      for (const file of CLAUDE_TEXTS) assert.ok(on.get(file).includes(BODIES[file]), `${file} holds its fragment's body`);
      const others = OTHER_TEXTS([...on.keys()]);
      assert.ok(others.length >= 6, `the twins are rendered: ${others.join(", ")}`);
      for (const file of others) for (const body of Object.values(BODIES)) assert.equal(on.get(file).includes(body), false, `${file} holds none of the bodies`);
      assert.deepEqual([...on].filter(([, text]) => text.includes("slot:")).map(([file]) => file), []);
    },
  },
  {
    // Amended by 198/03: the milestone DESIGN.md template is the practice's variant for every runtime.
    name: "198/02 00 · the Codex and OpenCode renders are unchanged when the practice is on, the DESIGN.md template aside (198/03)",
    run: () => {
      const runtimes = ["codex", "opencode"];
      const render = (config) => renderBundleOutputs(loadBundle({ config }), { runtimes }).map((output) => [posix(output.path), output.content]).filter(([file]) => file !== DESIGN_TEMPLATE);
      assert.deepEqual(render({ work: { ui: { designSystem: ON } } }), render({ work: {} }));
    },
  },
  {
    name: "198/02 00 · Claude's refine says how a canvas is drawn and approved",
    run: () => {
      const text = flat(renderAll({ work: { ui: { designSystem: ON } } }).get(".claude/commands/aof/refine.md"));
      for (const phrase of [
        "offer to draw the milestone's mocks as a canvas",
        "Turning the offer down",
        "falls through to the elicitation above",
        "list the Design System artifacts the operator can open",
        "No match, or more than one, is a stop",
        "every candidate's title and link",
        "one question that carries the canvas link",
        "**Approve**, **Revise**",
        "**Later**",
        "one question per ask",
        "only an approved canvas becomes a baseline.",
        "aof design-system mocks import",
        "aof design-system mocks capture",
        "Nothing is ever published to the system",
      ]) assert.ok(text.includes(phrase), phrase);
    },
  },
  {
    name: "198/02 00 · Claude's verify pulls back an approved canvas before the judge",
    run: () => {
      const text = flat(renderAll({ work: { ui: { designSystem: ON } } }).get(".claude/commands/aof/verify.md"));
      for (const phrase of [
        "**awaiting approval**",
        "before the fidelity judge runs",
        "aof design-system mocks import",
        "aof design-system mocks capture",
        "Those frames are the baseline handed to the judge.",
        "the binding checklist stays the baseline",
      ]) assert.ok(text.includes(phrase), phrase);
      assert.ok(text.indexOf("An approved canvas first") < text.indexOf("Renderability precondition"), "the pull-back stands before the renderability precondition");
    },
  },
  {
    name: "198/02 00 · Claude's designer brief relates a mock to the system",
    run: () => {
      const text = flat(renderAll({ work: { ui: { designSystem: ON } } }).get(".claude/agents/aof-designer.md"));
      for (const phrase of [
        "drawn with that system's tokens and components",
        "In `reference` mode",
        "named under `## Design-system gaps` in `DESIGN.md`",
        "drawn with the system's existing tokens",
        "You never ask for the system itself to be changed",
      ]) assert.ok(text.includes(phrase), phrase);
      const ownership = /<ownership>([\s\S]*?)<\/ownership>/u.exec(text)?.[1] ?? "";
      assert.ok(ownership.includes("Mocks on the project's design system"), "the rule stands inside the designer's ownership");
    },
  },
  // ── 198/03 task 00 · the DESIGN.md template ────────────────────────────────────────────────
  {
    name: "198/03 00 E1 · with no work.ui block the template is today's",
    run: () => assert.equal(readFileSync(path.join(project("DS_ABSENT"), DESIGN_TEMPLATE), "utf8"), todaysDesign()),
  },
  {
    name: "198/03 00 E2 · with the practice on the template carries the two sections, and without them it is today's",
    run: () => {
      const text = readFileSync(path.join(project("DS_ON"), DESIGN_TEMPLATE), "utf8");
      const at = (heading) => text.indexOf(`\n${heading}\n`);
      assert.ok(at("## Design-system changes") > 0 && at("## Design-system changes") < at("## Design-system gaps") && at("## Design-system gaps") < at("## Behavioural outcomes (cross-reference)"), "changes, then gaps, just before the behavioural outcomes");
      assert.equal(withoutSections(text), todaysDesign());
    },
  },
  {
    name: "198/03 00 E3 · turning the practice off restores today's template, and a person's edit is kept",
    run: () => {
      const toggled = practiceFixtureRoot(repoRoot, "DS_TOGGLE", { ui: { designSystem: ON } });
      assert.notEqual(readFileSync(path.join(toggled, DESIGN_TEMPLATE), "utf8"), todaysDesign(), "the variant was rendered");
      const off = updateWith(toggled, undefined);
      assert.equal(actionOn(off, DESIGN_TEMPLATE), "update");
      assert.equal(readFileSync(path.join(toggled, DESIGN_TEMPLATE), "utf8"), todaysDesign());

      const edited = practiceFixtureRoot(repoRoot, "DS_EDITED", { ui: { designSystem: ON } });
      const mine = `${readFileSync(path.join(edited, DESIGN_TEMPLATE), "utf8")}\nOur own house rule.\n`;
      writeFileSync(path.join(edited, DESIGN_TEMPLATE), mine);
      const kept = updateWith(edited, undefined);
      assert.equal(actionOn(kept, DESIGN_TEMPLATE), "drift-warning");
      assert.equal(readFileSync(path.join(edited, DESIGN_TEMPLATE), "utf8"), mine, "left as it was");
    },
  },
  {
    name: "198/03 00 outline · a block that is not on keeps today's template (2 rows)",
    run: () => {
      for (const block of [{ enabled: false, name: "AOF", mode: "owned", source: ["apps/ui/src/index.css"] }, { enabled: "true", name: "AOF", mode: "reference" }]) {
        const rendered = renderAll({ work: { ui: { designSystem: block } } }).get(DESIGN_TEMPLATE);
        assert.equal(rendered, renderAll({ work: {} }).get(DESIGN_TEMPLATE), JSON.stringify(block));
      }
    },
  },
  {
    name: "198/03 00 · the sections say what each mode writes",
    run: () => {
      const text = flat(readFileSync(path.join(project("DS_ON"), DESIGN_TEMPLATE), "utf8"));
      const changes = /## Design-system changes([\s\S]*?)## Design-system gaps/u.exec(text)?.[1] ?? "";
      for (const phrase of ['"owned" mode', "a token, with its new value", "a component, with what changed", "`None.`", "verify re-syncs the system from the code"]) assert.ok(changes.includes(phrase), phrase);
      const gaps = /## Design-system gaps([\s\S]*?)## Behavioural outcomes/u.exec(text)?.[1] ?? "";
      for (const phrase of ['"reference" mode', "that the system lacks", "for the system's owner", "draws the gap with the system's existing tokens"]) assert.ok(gaps.includes(phrase), phrase);
    },
  },
  // ── 198/03 task 02 · verify's re-sync ──────────────────────────────────────────────────────────
  {
    name: "198/03 02 E17 · with no work.ui block no rendered file holds \"slot:\" (byte for byte is the work-init golden lane)",
    run: () => {
      const off = renderAll({ work: {} });
      assert.deepEqual([...off].filter(([, text]) => text.includes("slot:")).map(([file]) => file), []);
      assert.equal(off.get(".claude/commands/aof/verify.md").includes(RESYNC), false);
    },
  },
  {
    name: "198/03 02 E18 · with the practice on, owned, only Claude's verify holds the re-sync, after the design-conformance review and before the findings step",
    run: () => {
      const on = renderAll({ work: { ui: { designSystem: ON } } });
      const verify = on.get(".claude/commands/aof/verify.md");
      const at = verify.indexOf(RESYNC);
      assert.ok(at > 0, "Claude's verify holds the body");
      assert.ok(verify.indexOf("**Design conformance (UI items)") < at, "after the design-conformance review");
      assert.ok(at < verify.indexOf("\n2. **Human acceptance"), "at the end of step 1, before the steps that follow it");
      const others = [...on.keys()].filter((file) => /^\.agents\/skills\/aof-verify\//u.test(file) || file.startsWith(".codex/aof/workflows/") || file === ".opencode/commands/aof/verify.md");
      assert.ok(others.length >= 3, others.join(", "));
      for (const file of others) assert.equal(on.get(file).includes(RESYNC), false, `${file} holds none of it`);
      assert.deepEqual([...on].filter(([, text]) => text.includes("slot:")).map(([file]) => file), []);
    },
  },
  {
    name: "198/03 02 E15, E16 and the code · Claude's verify re-syncs only an owned system, only at a milestone's accept, and never writes to the code",
    run: () => {
      const text = flat(renderAll({ work: { ui: { designSystem: ON } } }).get(".claude/commands/aof/verify.md"));
      for (const phrase of [
        'With `"mode": "reference"` nothing is re-synced and nothing is published to the system',
        "a milestone's accept only",
        "It does not run when a story is accepted",
        "Nothing is ever written from the system back to the code.",
      ]) assert.ok(text.includes(phrase), phrase);
    },
  },
  {
    name: "198/03 02 E10 · Claude's verify says how the re-sync runs, in order, and that drift before it is not a finding",
    run: () => {
      const text = flat(renderAll({ work: { ui: { designSystem: ON } } }).get(".claude/commands/aof/verify.md"));
      const steps = [
        "**Resolve the system (ADR-005 §4).** An `artifact` link is the system. A `name` is the one Design System you can open",
        "`aof design-system check --tokens <it> --json` against the configured `source`",
        "`aof design-system tokens --merge <it> --out <file> --ref <the accepted commit> --json`",
        "under `## Design-system re-sync` in `VERIFICATION.md`: the system's link and its version, and what the merge changed, added and removed",
        "**Publish the merged tokens** to the system, with the type's own procedure, keeping `\"editing\": \"code\"`",
        "**Read the tokens back and run `aof design-system check` again,** recording the new version",
      ];
      const at = steps.map((step) => text.indexOf(step));
      assert.ok(at.every((index) => index > 0), steps.filter((_, index) => at[index] < 0).join(" | "));
      assert.deepEqual([...at].sort((a, b) => a - b), at, "in this order");
      assert.ok(text.includes("Drift before the re-sync is the expected input, and is not a finding"));
    },
  },
  {
    name: "198/03 02 E11–E14 · nothing drifted, a changed component, drift that survives, and a name that does not resolve",
    run: () => {
      const text = flat(renderAll({ work: { ui: { designSystem: ON } } }).get(".claude/commands/aof/verify.md"));
      for (const phrase of [
        "When the first check exits 0 and `## Design-system changes` names no component, nothing is published: `VERIFICATION.md` records the system as in sync at its version.",
        "has its README and preview updated from the milestone's committed mocks, and is published with the tokens",
        "Drift this second check still reports is logged under `## Findings` with the check's report, and triaged in the findings step like any other finding.",
        "No match, or more than one, stops verify before anything is published: name `name`, and every candidate's title and link.",
      ]) assert.ok(text.includes(phrase), phrase);
    },
  },
];
