// The design-system practice and the extract command, at the render (milestone 198 / story 01,
// 198/ADR-005 §1, ADR-008, 192/ADR-003).
//
// Covers the render-level scenarios of
//   tasks/00_the-design-system-practice-is-registered.feature — E1, E2, the "only true" outline, the
//     registry and workspace scenario, and the packaged binary's assets
//   tasks/01_the-extract-command-is-claude-only-and-always-installed.feature — E3, the "installed
//     whether on or off" outline, E4 and the verbs as rendered, and the shipped manifest and this
//     repository's render
// The package-seam halves (the bundle's own declarations, the command's source) are the package's
// suite, packages/design-system/test/practice.suite.mjs.
//
// Scratch projects are initialised from this checkout's bundle for Claude, Codex and opencode, each
// under its own `AOF_GLOBAL_HOME`, given a `work.ui` block, and updated (`practiceFixtureRoot`).
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

// The body's one sentence no other command carries.
const BODY_MARK = "Resolve the title before publishing";

export const archTests = [
  {
    name: "198/01 00 E1 · the practice list names design-system on its key, off with no block and on with one, and holds no runtimes",
    run: () => {
      const off = practicesAfterUpdate(project("DS_ABSENT")).find((practice) => practice.id === "design-system");
      assert.deepEqual([off.keys, off.on], [["work.ui.designSystem.enabled"], false]);
      assert.equal(Object.hasOwn(off, "runtimes"), false, "its JSON entry holds no runtimes");
      const on = practicesAfterUpdate(project("DS_ON")).find((practice) => practice.id === "design-system");
      assert.equal(on.on, true);
    },
  },
  {
    name: "198/01 00 E2 · turning the practice on changes no rendered file, for claude, codex and opencode",
    run: () => {
      const runtimes = Object.keys(RUNTIMES);
      assert.deepEqual([...runtimes].sort(), ["claude", "codex", "opencode"]);
      const render = (config) => new Map(renderBundleOutputs(loadBundle({ config }), { runtimes }).map((output) => [posix(output.path), output.content]));
      const off = render({ work: {} });
      const on = render({ work: { ui: { designSystem: ON } } });
      assert.deepEqual([...on.keys()], [...off.keys()], "the same files");
      for (const [file, text] of off) assert.equal(on.get(file), text, `${file} is byte-identical`);
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
];
