// Traceability wiring for milestone 198 / story 01 — "aof design-system check".
//
// Covers EVERY @executable scenario in
//   tasks/03_check-reports-drift-between-a-system-and-the-code.feature
//
// The verb is built from the package's own factory and run over a project in a fresh temp directory
// holding the repository's real `apps/ui/src/index.css`. "The system's tokens" is a tokens.json the
// `tokens` verb printed, edited per case. The exit code is the verb's own `cli.exit` adapter, the one
// the CLI face applies. node:assert/strict, `{ name, run }`, Scenario Outline rows folded.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDesignSystemCommands } from "@aof/design-system/commands";
import { commandError } from "./tokens.suite.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const INDEX_CSS = "apps/ui/src/index.css";
const { tokensCommand, checkCommand } = createDesignSystemCommands({ commandError });

// A project holding index.css (and `extra` files), with `config` as its loaded config.
async function withProject({ config = {}, extra = {} } = {}, body) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-ds-check-"));
  try {
    const files = { [INDEX_CSS]: await readFile(path.join(REPO, INDEX_CSS), "utf8"), ...extra };
    for (const [relative, text] of Object.entries(files)) {
      await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
      await writeFile(path.join(root, relative), text, "utf8");
    }
    const ctx = { workspace: { projectRoot: root, config } };
    const printed = async (sources = [INDEX_CSS]) => structuredClone(await tokensCommand.run({ files: sources }, ctx));
    const saveSystem = async (system, file = "tokens.json") => {
      await writeFile(path.join(root, file), typeof system === "string" ? system : `${JSON.stringify(system, null, 2)}\n`, "utf8");
      return file;
    };
    const check = async (options) => {
      const result = await checkCommand.run(checkCommand.cli.argv([], options), ctx);
      return { result, exit: checkCommand.cli.exit(result) };
    };
    return await body({ root, printed, saveSystem, check });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const colour = (system, name) => system.color.tokens.find((token) => token.name === name);

export const checkTests = [
  {
    name: "198/01 03 E9 · a system built from the code has no drift, usage notes, meta, name and version notwithstanding",
    run: () => withProject({}, async ({ printed, saveSystem, check }) => {
      const system = await printed();
      for (const token of [...system.color.tokens, ...system.radius.tokens]) token.usage = `when to use ${token.name}`;
      Object.assign(system, { name: "AOF", version: 3, meta: { source: { kind: "github", repo: "aof", ref: "abc123", paths: [INDEX_CSS] } } });
      const { result, exit } = await check({ tokens: await saveSystem(system), source: [INDEX_CSS] });
      assert.deepEqual([result.changed, result.added, result.missing], [[], [], []]);
      assert.equal(exit, 0);
    }),
  },
  {
    name: "198/01 03 E10 · a changed value is drift, with both values and the theme",
    run: () => withProject({}, async ({ printed, saveSystem, check }) => {
      const system = await printed();
      colour(system, "color-primary").value = { light: "hsl(174 72% 30%)" };
      const { result, exit } = await check({ tokens: await saveSystem(system), source: [INDEX_CSS] });
      assert.deepEqual(result.changed, [{ family: "color", name: "color-primary", theme: "light", system: "hsl(174 72% 30%)", code: "hsl(174 72% 27%)" }]);
      assert.equal(exit, 1);
    }),
  },
  {
    name: "198/01 03 E11 · a token on one side only is drift: added and missing",
    run: () => withProject({}, async ({ root, printed, saveSystem, check }) => {
      const system = await printed();
      system.color.tokens.push({ name: "color-legacy", value: { light: "#123456" }, usage: "" });
      const css = await readFile(path.join(root, INDEX_CSS), "utf8");
      await writeFile(path.join(root, INDEX_CSS), css.replace("  --radius: 0.5rem;", "  --color-warning: hsl(38 92% 50%);\n  --radius: 0.5rem;"), "utf8");
      const { result, exit } = await check({ tokens: await saveSystem(system), source: [INDEX_CSS] });
      assert.deepEqual(result.added, [{ family: "color", name: "color-warning" }]);
      assert.deepEqual(result.missing, [{ family: "color", name: "color-legacy" }]);
      assert.equal(exit, 1);
    }),
  },
  {
    name: "198/01 03 E12 · with no source to compare against it is refused, naming both ways to give one",
    run: () => withProject({}, async ({ printed, saveSystem, check }) => {
      const tokens = await saveSystem(await printed());
      await assert.rejects(check({ tokens }), (error) => {
        assert.equal(error.code, "design-system-no-source");
        assert.match(error.message, /--source/);
        assert.match(error.message, /work\.ui\.designSystem\.source/);
        return true;
      });
    }),
  },
  {
    name: "198/01 03 outline · what is and is not drift (6 rows)",
    run: () => withProject({}, async ({ printed, saveSystem, check }) => {
      const base = await printed();
      const exitWith = async (edit, css = null) => {
        const system = structuredClone(base);
        edit(system);
        return (await check({ tokens: await saveSystem(system), source: [css ?? INDEX_CSS] })).exit;
      };
      assert.equal(await exitWith((system) => { colour(system, "color-primary").usage = "the brand"; }), 0, "a usage note");
      assert.equal(await exitWith((system) => { Object.assign(system, { meta: { x: 1 }, name: "AOF", version: 2 }); }), 0, "meta, name, version");
      assert.equal(await exitWith((system) => { colour(system, "color-primary").value = { light: "hsl(174  72% 27%)" }; }), 0, "whitespace inside a value");
      assert.equal(await exitWith((system) => { colour(system, "color-primary").value.dark = "hsl(174 60% 40%)"; }), 1, "a dark value only the system holds");
      assert.equal(await exitWith((system) => { system.radius.tokens[0].value = "8px"; }), 1, "the radius");
      // A type style's lineHeight: the code declares one, the system holds another.
      const typed = await withStyle(saveSystem, check);
      assert.equal(typed, 1, "a type style's lineHeight");
    }),
  },
  {
    name: "198/01 03 with no --source it compares against the configured source",
    run: () => withProject({ config: { work: { ui: { designSystem: { enabled: true, name: "AOF", mode: "owned", source: [INDEX_CSS] } } } } }, async ({ printed, saveSystem, check }) => {
      const { result, exit } = await check({ tokens: await saveSystem(await printed()) });
      assert.deepEqual(result.source, [INDEX_CSS]);
      assert.equal(exit, 0);
    }),
  },
  {
    name: "198/01 03 --source wins over the configured source",
    run: () => withProject({
      config: { work: { ui: { designSystem: { enabled: true, name: "AOF", mode: "owned", source: ["apps/ui/src/other.css"] } } } },
      extra: { "apps/ui/src/other.css": "@theme {\n  --color-other: #000;\n}\n" },
    }, async ({ printed, saveSystem, check }) => {
      const { result, exit } = await check({ tokens: await saveSystem(await printed()), source: [INDEX_CSS] });
      assert.deepEqual(result.source, [INDEX_CSS], "index.css alone");
      assert.equal(exit, 0);
    }),
  },
  {
    name: "198/01 03 outline · a tokens file it cannot use is refused, naming the file and the reason (3 rows)",
    run: () => withProject({}, async ({ saveSystem, check }) => {
      const refusedWith = async (tokens, pattern) => assert.rejects(check({ tokens, source: [INDEX_CSS] }), (error) => {
        assert.ok(error.message.includes(tokens), `${error.message} names ${tokens}`);
        assert.match(error.message, pattern);
        return true;
      });
      await refusedWith("absent.json", /cannot be read/);
      await refusedWith(await saveSystem("{ not json", "broken.json"), /is not JSON/);
      await refusedWith(await saveSystem({ color: { brand: { $value: "#f00" } } }, "dtcg.json"), /family "color" is not a list/);
    }),
  },
  {
    name: "198/01 03 without --json it prints the drift as three sections",
    run: () => withProject({}, async ({ root, printed, saveSystem, check }) => {
      const system = await printed();
      colour(system, "color-primary").value = { light: "hsl(174 72% 30%)" };
      system.color.tokens.push({ name: "color-legacy", value: { light: "#123456" }, usage: "" });
      const css = await readFile(path.join(root, INDEX_CSS), "utf8");
      await writeFile(path.join(root, INDEX_CSS), css.replace("  --radius: 0.5rem;", "  --color-warning: hsl(38 92% 50%);\n  --radius: 0.5rem;"), "utf8");
      const { result } = await check({ tokens: await saveSystem(system), source: [INDEX_CSS] });
      const text = checkCommand.cli.render(result);
      assert.match(text, /^Changed \(1\):\n.*color-primary \[light\].*hsl\(174 72% 30%\).*hsl\(174 72% 27%\)/m);
      assert.match(text, /^Added \(1\):\n.*color-warning/m);
      assert.match(text, /^Missing \(1\):\n.*color-legacy/m);
    }),
  },
];

// A system and a code that differ only in a type style's lineHeight; answers the check's exit.
async function withStyle(saveSystem, check) {
  const css = "@theme {\n  --text-sm: 0.875rem;\n  --text-sm--line-height: 1.25rem;\n}\n";
  const system = { type: { families: [], groups: [{ name: "Text", styles: [{ name: "sm", fontSize: "0.875rem", lineHeight: "1.5rem", usage: "" }] }] } };
  await saveSystem(css, "type.css");
  return (await check({ tokens: await saveSystem(system, "type.json"), source: ["type.css"] })).exit;
}
