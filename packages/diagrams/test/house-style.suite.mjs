// Milestone 171 / story 03 — the house style read from the style guide (ADR-004), driven headlessly:
// the semantic-roles table read into a palette (or none), the style an added node is filled in with,
// and the canvas's defaults for a shape drawn by hand. The command's use of it — `read`, `context` and
// `propose` — is in test/diagrams/diagram-scene-{command,review}.test.mjs. node:assert/strict,
// `{ name, run }` shape.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canvasDefaults, defaultNodeStyle, readPalette } from "@aof/diagrams/house-style";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const guide = (rows, heading = "### Semantic roles") => [
  "# Style", "", heading, "", "Refer to a token by role.", "",
  "| Role | Purpose | Light | Dark | Console token (light) |", "|---|---|---|---|---|",
  ...rows.map(([role, light, dark = "#000000"]) => `| \`${role}\` | a purpose | \`${light}\` | \`${dark}\` | a token |`),
  "", "### Next section", "", "| Not | Roles |", "|---|---|", "| `paper` | `#ffffff` |",
].join("\n");
const BOTH = [["paper", "#f3f5f7", "#1b1f27"], ["ink", "#1b1f27", "#f3f5f7"]];

export const houseStyleTests = [
  { name: "171/03 E1 · this repository's style guide gives the console's colours", run: async () => {
    const palette = readPalette(await readFile(path.join(repoRoot, ".aof/diagrams/style.md"), "utf8"));
    assert.deepEqual({ paper: palette.paper, ink: palette.ink, muted: palette.muted, link: palette.link, accent: palette.accent },
      { paper: "#f3f5f7", ink: "#1b1f27", muted: "#585f6a", link: "#13766d", accent: "#ba2646" });
  } },
  { name: "171/03 E3 · a style guide with no \"Semantic roles\" table gives no palette", run: () => {
    assert.equal(readPalette(guide(BOTH, "### Colours")), null);
    assert.equal(readPalette("# Style\n\nNo tables here.\n"), null);
    assert.equal(readPalette(""), null);
  } },
  { name: "171/03 · a \"Semantic roles\" table with no \"paper\" row gives no palette", run: () => {
    assert.equal(readPalette(guide([["ink", "#1b1f27"]])), null);
  } },
  { name: "171/03 · a \"Semantic roles\" table with no \"ink\" row gives no palette", run: () => {
    assert.equal(readPalette(guide([["paper", "#f3f5f7"]])), null);
  } },
  { name: "171/03 · a guide naming \"paper\" as \"not-a-colour\" gives no palette", run: () => {
    assert.equal(readPalette(guide([["paper", "not-a-colour"], ["ink", "#1b1f27"]])), null);
  } },
  { name: "171/03 · a role whose light value is an rgba colour is read as written", run: () => {
    assert.equal(readPalette(guide([...BOTH, ["accent-tint", "rgba(186,38,70,0.08)"]]))["accent-tint"], "rgba(186,38,70,0.08)");
  } },
  { name: "171/03 · only the light column is read", run: () => {
    const palette = readPalette(guide(BOTH));
    assert.equal(palette.paper, "#f3f5f7");
    assert.equal(palette.ink, "#1b1f27");
    assert.equal(Object.keys(palette).length, 2, "and nothing from the table after it");
  } },
  { name: "171/03 · an added node is filled with paper, stroked and lettered in ink — and only from hex", run: () => {
    assert.deepEqual(defaultNodeStyle(readPalette(guide(BOTH))), { fill: "#f3f5f7", stroke: "#1b1f27", color: "#1b1f27" });
    assert.equal(defaultNodeStyle(null), null);
    assert.equal(defaultNodeStyle({ paper: "rgba(0,0,0,0.1)", ink: "#000" }), null, "the profile's style takes hex colours");
  } },
  // ── R3 · A shape the operator draws by hand starts in the house style ───────────────────────
  { name: "171/03 E9 · the canvas's defaults come from the palette", run: () => {
    assert.deepEqual(canvasDefaults({ paper: "#f3f5f7", ink: "#1b1f27" }), { currentItemStrokeColor: "#1b1f27", currentItemBackgroundColor: "#f3f5f7", currentItemFillStyle: "solid" });
  } },
  { name: "171/03 E10 · a stored scene's own colours are never overridden by the defaults", run: async () => {
    // The defaults are only the SDK's `currentItem*` app state, which seeds a NEW element; the editor
    // passes the stored elements through untouched beside them.
    assert.ok(Object.keys(canvasDefaults({ paper: "#f3f5f7", ink: "#1b1f27" })).every((key) => key.startsWith("currentItem")));
    const editor = await readFile(path.join(repoRoot, "packages/diagrams-ui/src/ExcalidrawEditor.tsx"), "utf8");
    assert.match(editor, /initialData=\{\{ elements: loaded\.scene\.elements as never, appState: \{[^}]*\.\.\.canvasDefaults\(loaded\.palette as never\) \}/u);
  } },
  { name: "171/03 E11 · with no palette the canvas keeps Excalidraw's own defaults", run: () => {
    assert.deepEqual(canvasDefaults(null), {});
  } },
];
