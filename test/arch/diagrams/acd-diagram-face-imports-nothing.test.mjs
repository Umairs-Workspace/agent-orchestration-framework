// FF-17101 (milestone 171 / ADR-003) — THE BOARD FACE'S DIAGRAM ROUTES, THE EVENTS STREAM INCLUDED,
// IMPORT NOTHING OF `@aof/diagrams` AND INVOKE ONLY `diagram:*` COMMAND IDS.
//
// "The board face's diagram routes, the events stream included, import nothing of `@aof/diagrams`
//  and invoke only `diagram:*` command ids."
//
// Why it matters: m170/ADR-001 made diagramming a package core composes and can leave out, and the
// board face reaches it by command id alone — a build without the package answers `absent` for the
// capability and 404 for the stream, and nothing else changes. The stream is the first diagram route
// that WATCHES files, which is the strongest pull yet toward the face knowing the store: importing
// `layout.mjs` to build the review folder, or spelling `diagrams/<stem>.review` itself. Either would
// make the face a second home of the diagram layout (FF-13302) and tie the server to the package.
// So the watch directories come from `diagram:scene --action stamp`, and this control holds the line.
//
// The import detector reads the syntax tree (`moduleReferences`, the workspace boundary check's own
// parser), so a specifier in a comment or a string is not an import and a dynamic `import()` is.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { moduleReferences } from "../../../scripts/workspace-boundaries.mjs";
import { functionBody, stripComments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const FACE = "packages/server/src/board-ui.mjs";
// 172/ADR-002 — the conversation route joins them: it learns what to type from `diagram:scene --action session`.
const ROUTES = ["async function handleDiagramApi(", "async function streamDiagramEvents(", "async function deliverConversation("];

// What, in the face, reaches the package: by name, or by a path into its sources.
function packageReferences(file, text) {
  const hits = [];
  for (const reference of moduleReferences(text, file).references) {
    const specifier = reference.specifier ?? "";
    if (specifier === "@aof/diagrams" || specifier.startsWith("@aof/diagrams/")) hits.push(`imports ${specifier}`);
    if (/(?:^|\/)diagrams(?:-ui)?\/src\//u.test(specifier)) hits.push(`reaches the package by path: ${specifier}`);
  }
  return hits;
}
// Every string and template literal's content, read left to right so each quote closes its own.
const literals = (code) => [...code.matchAll(/(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/gu)].map((match) => match[2]);
// What, in one diagram route's body, is not a `diagram:*` invocation or spells the store's layout.
function routeViolations(body) {
  const hits = [];
  for (const match of body.matchAll(/\binvoke\(\s*(["'`])([^"'`]*)\1/gu)) if (!match[2].startsWith("diagram:")) hits.push(`invokes ${match[2]}`);
  for (const match of body.matchAll(/\binvoke\((?!\s*["'`])/gu)) hits.push(`invokes a computed id at ${match.index}`);
  const spelled = literals(body);
  if (spelled.some((value) => /\.review\b/u.test(value))) hits.push("spells the review folder");
  if (spelled.some((value) => /\.excalidraw$/u.test(value))) hits.push("spells a scene file");
  return hits;
}

export const archTests = [
  {
    name: "arch/171 FF-17101: the board face imports nothing of @aof/diagrams",
    run: async () => {
      const text = await readFile(path.join(repoRoot, FACE), "utf8");
      assert.deepEqual(packageReferences(FACE, text), []);
    },
  },
  {
    name: "arch/171 FF-17101: the face's diagram routes, the events stream included, invoke only diagram:* ids and spell no store path",
    run: async () => {
      const code = stripComments(await readFile(path.join(repoRoot, FACE), "utf8"));
      for (const header of ROUTES) {
        const body = functionBody(code, header);
        assert.ok(body, `${header} is found in ${FACE}`);
        assert.ok(/\binvoke\(\s*"diagram:scene"/u.test(body), `${header} invokes the scene command (non-vacuity)`);
        assert.deepEqual(routeViolations(body), [], header);
      }
      assert.match(functionBody(code, ROUTES[1]), /action: "stamp"/u, "the stream learns what to watch from the stamp");
      assert.match(functionBody(code, ROUTES[2]), /action: "session"/u, "the conversation route learns what to type from the session action");
      assert.doesNotMatch(functionBody(code, ROUTES[2]), /\/aof:/u, "and spells no slash command of its own");
    },
  },
  {
    name: "arch/171 FF-17101 red probe: the detectors fire on each planted reach into the package, and not on a comment or the package's own command ids",
    run: () => {
      for (const [source, hit] of [
        ['import { diagramReviewPaths } from "@aof/diagrams/layout";', "imports @aof/diagrams/layout"],
        ['const { diagramsDir } = await import("@aof/diagrams/layout");', "imports @aof/diagrams/layout"],
        ['import { x } from "../../diagrams/src/layout.mjs";', "reaches the package by path: ../../diagrams/src/layout.mjs"],
      ]) assert.ok(packageReferences(FACE, source).includes(hit), `${source} → ${hit}`);
      assert.deepEqual(packageReferences(FACE, '// see @aof/diagrams/layout for the folders\nconst a = 1;'), [], "a comment is not an import");
      assert.deepEqual(routeViolations('await invoke("work:list", {}, ctx);'), ["invokes work:list"]);
      assert.equal(routeViolations("await invoke(id, input, ctx);").length, 1, "a computed id cannot be checked, so it is refused");
      assert.deepEqual(routeViolations('const dir = path.join(item, `${stem}.review`);'), ["spells the review folder"]);
      assert.deepEqual(routeViolations('const file = "ADR-003-push.excalidraw";'), ["spells a scene file"]);
      assert.deepEqual(routeViolations('await invoke("diagram:scene", { ...target, action: "stamp" }, ctx);'), []);
    },
  },
];
