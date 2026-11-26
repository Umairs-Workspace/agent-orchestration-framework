// Traceability wiring for milestone 198 / story 01 — "aof design-system tokens".
//
// Covers EVERY @executable scenario in
//   tasks/02_tokens-reads-the-system-from-the-code.feature
// except the two FF-19804 scenarios, which are test/arch/practices/acd-design-system-verbs-offline.test.mjs.
//
// The verb is built from the package's own factory with a stand-in for core's `commandError`, and run over a
// project in a fresh temp directory: the repository's real `apps/ui/src/index.css` is copied in, and
// the mocks are written there. node:assert/strict, `{ name, run }`, Scenario Outline rows folded.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDesignSystemCommands } from "@aof/design-system/commands";
import { readTokens } from "@aof/design-system/tokens";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const INDEX_CSS = "apps/ui/src/index.css";

// Core's injected error shape: a message, a code and a status.
export const commandError = (message, code, status) => Object.assign(new Error(message), { code, status });
const { tokensCommand } = createDesignSystemCommands({ commandError });

// A project in a temp dir holding `files` (relative path → text), and the verb run in it.
async function withProject(files, body) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-ds-tokens-"));
  try {
    for (const [relative, text] of Object.entries(files)) {
      await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
      await writeFile(path.join(root, relative), text, "utf8");
    }
    const ctx = { workspace: { projectRoot: root, config: {} } };
    const tokens = (argv, options = {}) => tokensCommand.run(tokensCommand.cli.argv(argv, options), ctx);
    return await body({ root, tokens });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const indexCss = () => readFile(path.join(REPO, INDEX_CSS), "utf8");
const tokenOf = (result, name) => result.color.tokens.find((token) => token.name === name);
const over = (css) => readTokens([{ file: "x.css", text: css }]);
const unplacedOf = (result, property) => result.unplaced.find((entry) => entry.property === property);

export const tokensTests = [
  {
    name: "198/01 02 E5 · AOF's own tokens: 20 colours in one light theme, one radius, nothing unplaced",
    run: async () => withProject({ [INDEX_CSS]: await indexCss() }, async ({ tokens }) => {
      const result = await tokens([INDEX_CSS]);
      assert.deepEqual(result.color.themes, [{ id: "light", name: "Light" }]);
      assert.equal(result.color.tokens.length, 20);
      assert.deepEqual(tokenOf(result, "color-primary"), { name: "color-primary", value: { light: "hsl(174 72% 27%)" }, usage: "" });
      assert.equal(result.color.tokens[0].name, "color-background", "declaration order");
      assert.equal(result.color.tokens.at(-1).name, "color-ring", "declaration order");
      assert.deepEqual(result.radius.tokens, [{ name: "radius", value: "0.5rem", usage: "" }]);
      assert.deepEqual(result.unplaced, []);
      const every = [...result.color.tokens, ...result.radius.tokens, ...result.spacing.tokens, ...result.shadow.tokens, ...result.type.families];
      assert.ok(every.every((token) => token.usage === ""), "every token carries an empty usage for the session to fill");
      assert.equal(result.mockOnly, undefined, "no --mocks, no mock-only list");
    }),
  },
  {
    name: "198/01 02 E6 · a theme selector adds a theme to the same token",
    run: async () => {
      const result = over("@theme {\n  --color-primary: hsl(174 72% 27%);\n}\n.dark {\n  --color-primary: hsl(174 60% 40%);\n}\n");
      assert.deepEqual(result.color.themes.map((theme) => theme.id), ["light", "dark"]);
      assert.deepEqual(tokenOf(result, "color-primary").value, { light: "hsl(174 72% 27%)", dark: "hsl(174 60% 40%)" });
    },
  },
  {
    name: "198/01 02 E7 · a var() of a placed colour becomes an alias, and what the type drops is listed with its file, line and reason",
    run: async () => {
      const css = "@theme {\n  --color-primary: hsl(174 72% 27%);\n  --color-ring: var(--color-primary);\n  --color-scrim: color-mix(in srgb, black 40%, transparent);\n  --color-none: transparent;\n}\n";
      const result = over(css);
      assert.deepEqual(tokenOf(result, "color-ring").value, { light: "{color-primary}" });
      const scrim = unplacedOf(result, "--color-scrim");
      const none = unplacedOf(result, "--color-none");
      assert.deepEqual([scrim.file, scrim.line], ["x.css", 4]);
      assert.deepEqual([none.file, none.line], ["x.css", 5]);
      assert.match(scrim.reason, /color-mix/);
      assert.match(none.reason, /named colour/);
      assert.equal(tokenOf(result, "color-scrim"), undefined);
      assert.equal(tokenOf(result, "color-none"), undefined);
    },
  },
  {
    name: "198/01 02 E8 · a value only a mock paints is listed as mock-only, with every file it appears in",
    run: async () => withProject({
      [INDEX_CSS]: await indexCss(),
      "wiki/work/1_milestone_a/mocks/a.dc.html": "<div style=\"color:#b3261e;background:hsl(174 72% 27%)\"></div>",
      "wiki/work/2_milestone_b/mocks/b.html": "<style>.x { border-color: #b3261e; }</style>",
    }, async ({ tokens }) => {
      const result = await tokens([INDEX_CSS], { mocks: ["wiki/work"] });
      assert.deepEqual(result.mockOnly, [{ value: "#b3261e", files: ["wiki/work/1_milestone_a/mocks/a.dc.html", "wiki/work/2_milestone_b/mocks/b.html"] }]);
      assert.ok(!result.mockOnly.some((entry) => entry.value === "hsl(174 72% 27%)"));
    }),
  },
  {
    name: "198/01 02 outline · each property goes to its family, or is unplaced with its reason (7 rows)",
    run: async () => {
      const inTheme = (...lines) => over(`@theme {\n${lines.map((line) => `  ${line};`).join("\n")}\n}\n`);
      assert.deepEqual(inTheme("--spacing: 0.25rem").spacing.tokens, [{ name: "spacing", value: "0.25rem", usage: "" }]);
      assert.deepEqual(inTheme("--radius-lg: 0.75rem").radius.tokens, [{ name: "radius-lg", value: "0.75rem", usage: "" }]);
      assert.deepEqual(inTheme("--shadow-card: 0 1px 2px hsl(0 0% 0% / 0.1)").shadow.tokens.map((token) => token.name), ["shadow-card"]);
      assert.deepEqual(inTheme("--font-mono: \"JetBrains Mono\", monospace").type.families, [{ name: "mono", value: "\"JetBrains Mono\", monospace", usage: "" }]);
      const text = inTheme("--text-sm: 0.875rem", "--text-sm--line-height: 1.25rem").type.groups;
      assert.deepEqual(text, [{ name: "Text", styles: [{ name: "sm", fontSize: "0.875rem", lineHeight: "1.25rem", usage: "" }] }]);
      assert.match(unplacedOf(inTheme("--animate-spin: spin 1s linear infinite"), "--animate-spin").reason, /no family/);
      assert.match(unplacedOf(inTheme("--color-x: var(--undeclared)"), "--color-x").reason, /names no placed colour/);
    },
  },
  {
    name: "198/01 02 outline · which selectors are themes (4 rows)",
    run: async () => {
      const under = (selector) => over(`${selector} {\n  --color-primary: hsl(174 72% 27%);\n}\n`);
      assert.deepEqual(tokenOf(under(":root"), "color-primary").value, { light: "hsl(174 72% 27%)" });
      assert.deepEqual(under("[data-theme=contrast]").color.themes.map((theme) => theme.id), ["contrast"]);
      assert.deepEqual(under(".theme-sepia").color.themes.map((theme) => theme.id), ["sepia"]);
      const card = under(".card");
      assert.deepEqual(card.color.tokens, []);
      assert.match(unplacedOf(card, "--color-primary").reason, /declared under no theme/);
      // Only @layer may wrap a theme: a conditional :root is never read as the light theme.
      assert.deepEqual(tokenOf(over("@layer base {\n  :root {\n    --color-primary: #fff;\n  }\n}\n"), "color-primary").value, { light: "#fff" });
      const conditional = over(":root {\n  --color-primary: #fff;\n}\n@media (prefers-color-scheme: dark) {\n  :root {\n    --color-primary: #000;\n  }\n}\n");
      assert.deepEqual(tokenOf(conditional, "color-primary").value, { light: "#fff" }, "the light value is not overwritten");
      assert.match(unplacedOf(conditional, "--color-primary").reason, /declared under no theme/);
    },
  },
  {
    name: "198/01 02 outline · a mock colour equal to a code token in another notation is not mock-only (3 rows)",
    run: async () => {
      for (const [value, listed] of [["#ffffff", false], ["rgb(255 255 255)", false], ["#fefefe", true]]) {
        await withProject({
          "apps/ui/src/index.css": "@theme {\n  --color-card: hsl(0 0% 100%);\n}\n",
          "wiki/work/1_milestone_a/mocks/a.dc.html": `<div style="background: ${value}"></div>`,
        }, async ({ tokens }) => {
          const result = await tokens([INDEX_CSS], { mocks: ["wiki/work"] });
          assert.deepEqual(result.mockOnly.map((entry) => entry.value), listed ? [value] : [], value);
        });
      }
    },
  },
  {
    name: "198/01 02 a file it cannot read is refused by name",
    run: async () => withProject({}, async ({ tokens }) => {
      await assert.rejects(tokens(["apps/ui/src/missing.css"]), (error) => {
        assert.equal(error.code, "design-system-unreadable");
        assert.match(error.message, /apps\/ui\/src\/missing\.css/);
        return true;
      });
    }),
  },
  {
    name: "198/01 02 without --json it prints a table per family and the unplaced list last",
    run: async () => withProject({ [INDEX_CSS]: await indexCss() }, async ({ tokens }) => {
      const text = tokensCommand.cli.render(await tokens([INDEX_CSS]));
      const headings = text.split("\n").filter((line) => /^\S.*:$/.test(line));
      assert.deepEqual(headings.map((line) => line.replace(/ \(.*$/, "")), ["Colour", "Type families", "Type styles", "Spacing", "Radius", "Shadow", "Not placed"]);
      assert.match(text, /^ {2}color-primary {2}hsl\(174 72% 27%\)$/m, "each token's name and value");
      assert.match(text, /^ {2}radius {2}0\.5rem$/m);
      assert.match(text, /Not placed \(0\):\n {2}\(none\)$/, "the last section, empty here");
    }),
  },
];
