// FF-17102 (milestone 171 / ADR-001) — ONLY `canvas-anchor.mjs` CONVERTS SCENE COORDINATES TO THE
// SCREEN IN `packages/diagrams-ui/src`.
//
// "Only `canvas-anchor.mjs` converts scene coordinates to viewport coordinates in
//  `packages/diagrams-ui/src`."
//
// Why it matters: everything aof puts on the canvas lives in one overlay, and where a thing sits is
// computed in one pure module that the headless suite drives. A second home — a component calling
// the SDK's `sceneCoordsToViewportCoords`, or spelling `(x + scrollX) * zoom` itself — is a second
// positioning scheme the suite never sees, and the first pan or zoom that two schemes answer
// differently puts a pin beside the wrong shape. Story 05's pins join the same overlay; this keeps
// them on the same anchor.
//
// The detector reads comment-stripped source, so a comment naming the transform is not a use.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SRC = "packages/diagrams-ui/src";
const HOME = "canvas-anchor.mjs";

// What, in one source, converts between scene and screen: the SDK's converters by name, or the
// scroll-and-zoom transform spelled out — `(sceneX + scrollX) * zoom` in any of its spellings.
const CONVERTER = /\b(?:sceneCoordsToViewportCoords|viewportCoordsToSceneCoords)\b/u;
const TRANSFORM = /\(\s*[\w.?[\]]+\s*\+\s*[\w.?]*scroll[XY]\b[^)]*\)\s*\*\s*[\w.?]*zoom/iu;
function conversions(text) {
  const code = stripComments(text);
  const hits = [];
  if (CONVERTER.test(code)) hits.push(`names ${CONVERTER.exec(code)[0]}`);
  if (TRANSFORM.test(code)) hits.push(`spells the scroll-and-zoom transform: ${TRANSFORM.exec(code)[0]}`);
  return hits;
}

async function sources() {
  const names = (await readdir(path.join(repoRoot, SRC))).filter((name) => /\.(?:mjs|tsx?|jsx?)$/u.test(name) && !name.endsWith(".d.mts"));
  assert.ok(names.includes(HOME) && names.length >= 5, `the ${SRC} sources were enumerated (${names.join(", ")})`);
  return Promise.all(names.map(async (name) => ({ name, text: await readFile(path.join(repoRoot, SRC, name), "utf8") })));
}

export const archTests = [
  {
    name: "arch/171 FF-17102: no source in packages/diagrams-ui/src but canvas-anchor.mjs converts scene coordinates to the screen",
    run: async () => {
      const offenders = [];
      for (const { name, text } of await sources()) {
        if (name === HOME) continue;
        for (const hit of conversions(text)) offenders.push(`${SRC}/${name}: ${hit}`);
      }
      assert.deepEqual(offenders, []);
    },
  },
  {
    name: "arch/171 FF-17102: canvas-anchor.mjs is the home — it holds the transform, and the overlay imports it",
    run: async () => {
      const all = await sources();
      const home = all.find(({ name }) => name === HOME);
      assert.ok(conversions(home.text).some((hit) => hit.startsWith("spells")), "the anchor module spells the transform the rest may not");
      const overlay = all.find(({ name }) => name === "CanvasOverlay.tsx");
      assert.ok(overlay, "the overlay exists");
      assert.match(stripComments(overlay.text), /from "\.\/canvas-anchor\.mjs"/u, "the overlay places what it draws through the anchor module");
    },
  },
  {
    name: "arch/171 FF-17102 red probe: the detector fires on each planted conversion, and not on a comment or a field name",
    run: () => {
      const planted = [
        'import { sceneCoordsToViewportCoords } from "@excalidraw/excalidraw";',
        "const at = viewportCoordsToSceneCoords({ clientX, clientY }, appState);",
        "const left = (x1 + appState.scrollX) * appState.zoom.value;",
        "const top = (bounds[1] + scrollY) * zoom;",
        "const y = (sceneY + state?.scrollY) * state?.zoom?.value + offsetTop;",
      ];
      for (const text of planted) assert.equal(conversions(text).length, 1, text);
      assert.deepEqual(conversions("// the SDK's sceneCoordsToViewportCoords is (x + scrollX) * zoom\nconst a = 1;"), [], "a comment is not a conversion");
      assert.deepEqual(conversions('const WATCHED = ["scrollX", "scrollY", "zoom"];\nconst z = appState.zoom?.value ?? 1;'), [], "reading the fields converts nothing");
    },
  },
];
