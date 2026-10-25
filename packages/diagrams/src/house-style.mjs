// THE HOUSE STYLE (milestone 171 / ADR-004) — pure: the project's diagram style guide, read into a
// palette. The style guide (`work.diagrams.style`) is the one source: its "Semantic roles" table gives
// each role (`paper`, `ink`, `muted`, `link`, `accent`, …) a light value, and nothing copies those
// colours into config (170 RETROSPECTIVE R5). A guide with no such table, or without the two roles a
// node needs (`paper` and `ink`), is no palette — and then nothing is filled and Excalidraw's own
// defaults hold. Only the light column is read: the editor draws on a light canvas.

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/iu;
const RGBA = /^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(?:,\s*[\d.]+\s*)?\)$/iu;
const cells = (line) => line.trim().replace(/^\||\|$/gu, "").split("|").map((cell) => cell.trim().replace(/^`|`$/gu, "").trim());

// role → colour, from the table under the "Semantic roles" heading; null when it is not a palette.
export function readPalette(text) {
  const lines = String(text ?? "").split(/\r?\n/u);
  const heading = lines.findIndex((line) => /^#{1,6}\s+semantic roles\s*$/iu.test(line.trim()));
  if (heading < 0) return null;
  const start = lines.findIndex((line, index) => index > heading && line.trim().startsWith("|"));
  if (start < 0 || lines.slice(heading + 1, start).some((line) => /^#{1,6}\s/u.test(line.trim()))) return null;
  const header = cells(lines[start]).map((cell) => cell.toLowerCase());
  const roleAt = Math.max(0, header.indexOf("role"));
  const lightAt = header.indexOf("light") >= 0 ? header.indexOf("light") : 2;
  const palette = {};
  for (const line of lines.slice(start + 1)) {
    if (!line.trim().startsWith("|")) break;
    const row = cells(line);
    if (row.every((cell) => /^:?-+:?$/u.test(cell))) continue;
    const role = row[roleAt];
    const value = row[lightAt];
    if (role && value && (HEX.test(value) || RGBA.test(value))) palette[role] = value;
  }
  return palette.paper && palette.ink ? palette : null;
}

// The style an added node is filled in with: paper fill, ink stroke, ink text. The aof Mermaid
// profile's `style` takes hex colours, so a guide whose paper or ink is not one fills nothing.
export function defaultNodeStyle(palette) {
  if (!palette || !HEX.test(palette.paper ?? "") || !HEX.test(palette.ink ?? "")) return null;
  return { fill: palette.paper, stroke: palette.ink, color: palette.ink };
}

// The canvas's defaults for a shape drawn by hand (the SDK's `currentItem*` app state); none with no palette.
export function canvasDefaults(palette) {
  if (!palette) return {};
  return { currentItemStrokeColor: palette.ink, currentItemBackgroundColor: palette.paper, currentItemFillStyle: "solid" };
}
