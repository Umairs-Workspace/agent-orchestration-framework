// Compiling a proposal into the stored scene (milestone 170, ADR-012), headlessly: the SDK's element
// factory is faked (it measures text as 10 px a character), and the property that matters is checked
// directly — the scene a proposal compiles to READS BACK, through the projection, as the proposal.
import assert from "node:assert/strict";
import { diffModels, parseProfile } from "@aof/diagrams/mermaid-profile";
import { assignAliases, projectScene } from "@aof/diagrams/scene-view";
import { boundsOf, compileProposal, firstDraftSkeletons, libraryItemsFor, operationsFor, straightArrow } from "@aof/diagrams-ui/compile";

let counter = 0;
const newId = () => `new${++counter}`;
// What `convertToExcalidrawElements` hands back, closely enough: a shape with a label gets a bound
// text; text is 10 px a character; an arrow's label is bound to it.
function toElements(skeletons) {
  const out = [];
  for (const s of skeletons) {
    const id = s.id ?? newId();
    if (s.type === "text") { out.push({ strokeColor: "#1e1e1e", fontSize: 20, ...s, id, width: String(s.text).length * 10, height: 25, originalText: s.text }); continue; }
    const { label, start, end, children, ...rest } = s;
    const element = { strokeColor: "#1e1e1e", backgroundColor: "transparent", width: 100, height: 60, groupIds: [], ...rest, id, boundElements: null };
    if (s.type === "arrow") { element.width = Math.abs(s.points?.[1]?.[0] ?? 100); element.height = Math.abs(s.points?.[1]?.[1] ?? 0); }
    if (label) {
      if (s.type !== "arrow" && s.width === undefined) element.width = Math.max(100, label.text.length * 10 + 40);
      const text = { id: `${id}-label`, type: "text", x: element.x, y: element.y, width: label.text.length * 10, height: 25, fontSize: 20, text: label.text, originalText: label.text, containerId: id, strokeColor: label.strokeColor ?? "#1e1e1e" };
      element.boundElements = [{ id: text.id, type: "text" }];
      if (start && end) { element.startBinding = { elementId: start.id }; element.endBinding = { elementId: end.id }; }
      out.push(element, text);
    } else {
      if (start && end) { element.startBinding = { elementId: start.id }; element.endBinding = { elementId: end.id }; }
      out.push(element);
    }
  }
  return out;
}
const box = (id, aofId, x, label, extra = {}) => [
  { id, type: "rectangle", x, y: 0, width: 100, height: 60, strokeColor: "#1e1e1e", backgroundColor: "transparent", boundElements: [{ id: `t-${id}`, type: "text" }], customData: { aof: { id: aofId } }, ...extra },
  { id: `t-${id}`, type: "text", x, y: 20, width: label.length * 10, height: 25, fontSize: 20, text: label, originalText: label, containerId: id, strokeColor: "#1e1e1e" },
];
const SCENE = () => [
  ...box("e-api", "API", 0, "API", { boundElements: [{ id: "t-e-api", type: "text" }, { id: "a1", type: "arrow" }] }),
  ...box("e-db", "DB", 300, "DB", { boundElements: [{ id: "t-e-db", type: "text" }, { id: "a1", type: "arrow" }] }),
  { id: "a1", type: "arrow", x: 100, y: 30, width: 200, height: 0, points: [[0, 0], [200, 0]], startBinding: { elementId: "e-api" }, endBinding: { elementId: "e-db" }, strokeStyle: "solid", strokeWidth: 2, endArrowhead: "arrow" },
  { id: "pen", type: "freedraw", x: 900, y: 0, width: 10, height: 10, customData: { aof: { id: "s1" } } },
];
const viewOf = (elements) => projectScene(elements).model;
const changesOf = (elements, text) => diffModels(viewOf(elements), parseProfile(text)).filter(({ key, change }) => !key.startsWith("path:") && key !== "direction" && !(change === "removed" && (key.startsWith("layout:") || key.startsWith("lib:"))));
const run = (elements, text, extra = {}) => compileProposal({ elements, changes: changesOf(elements, text), proposed: parseProfile(text), toElements, newId, ...extra });

export const compileTests = [
  {
    name: "compile: a rename rewrites the bound text, grows the box about its centre to fit, centres the text, re-routes its arrows, and reads back as the proposal",
    run: () => {
      const scene = SCENE();
      const text = 'flowchart LR\n  API["Orders gateway service"]\n  DB["DB"]\n  API --> DB\n';
      const { elements, touched, unresolved } = run(scene, text);
      assert.deepEqual(unresolved, []);
      assert.deepEqual([...touched].sort(), ["a1", "e-api", "t-e-api"]);
      const label = elements.find((e) => e.id === "t-e-api");
      const grown = elements.find((e) => e.id === "e-api");
      assert.equal(label.text, "Orders gateway service");
      assert.ok(grown.width >= 220 + 30 && grown.x + grown.width / 2 === 50, "the box grows to fit its new label, about its centre");
      assert.equal(label.x, grown.x + (grown.width - label.width) / 2, "the text is centred in the grown box");
      assert.ok(elements.find((e) => e.id === "a1").x >= grown.x + grown.width, "the arrow leaves from the grown box's edge, not from inside it");
      const fits = run(SCENE(), text.replace("Orders gateway service", "Api"));
      assert.deepEqual([...fits.touched], ["t-e-api"], "a label that fits leaves the box and its arrows alone");
      assert.deepEqual(viewOf(elements).nodes.map((n) => [n.id, n.label]), [["API", "Orders gateway service"], ["DB", "DB"]]);
      assert.deepEqual(Object.keys(viewOf(elements).sketches), ["s1"], "the sketch is untouched");
    },
  },
  {
    name: "compile: a node added beside an existing one is placed by the converter's hint, aligned on a shared node, and an edge to it is bound at both ends",
    run: () => {
      const scene = SCENE();
      const text = 'flowchart LR\n  API["API"]\n  DB["DB"]\n  Cache{"Cache?"}\n  API --> DB\n  API -.->|"miss"| Cache\n';
      const hints = new Map([["API", { x: 10, y: 10, w: 60, h: 40 }], ["Cache", { x: 10, y: 200, w: 120, h: 120 }]]);
      const { elements, unresolved } = run(scene, text, { hints });
      assert.deepEqual(unresolved, []);
      const model = viewOf(assignAliases(elements).elements);
      assert.deepEqual(model.nodes.map((n) => [n.id, n.shape]), [["API", "rect"], ["DB", "rect"], ["Cache", "diamond"]]);
      assert.deepEqual(model.edges.map((e) => [e.key, e.kind, e.label]), [["API->DB#1", "arrow", null], ["API->Cache#1", "dotted", "miss"]]);
      const cache = elements.find((e) => e.customData?.aof?.id === "Cache");
      assert.deepEqual([cache.x, cache.y], [0, 190], "the converter's place, moved by the shared node's offset (API: hint 10,10 → canvas 0,0)");
      const api = elements.find((e) => e.id === "e-api");
      const arrow = elements.find((e) => e.type === "arrow" && e.endBinding?.elementId === cache.id);
      assert.ok(api.boundElements.some((b) => b.id === arrow.id) && cache.boundElements.some((b) => b.id === arrow.id), "both boxes list the new arrow");
    },
  },
  {
    name: "compile: a removed node takes its arrows with it and unbinds the box at the far end",
    run: () => {
      const { elements, touched } = run(SCENE(), 'flowchart LR\n  DB["DB"]\n');
      for (const id of ["e-api", "t-e-api", "a1"]) assert.equal(elements.find((e) => e.id === id).isDeleted, true, id);
      assert.deepEqual(elements.find((e) => e.id === "e-db").boundElements.map((b) => b.id), ["t-e-db"]);
      assert.ok(touched.has("e-db"));
      assert.deepEqual(viewOf(elements).nodes.map((n) => n.id), ["DB"]);
    },
  },
  {
    name: "compile: a move translates the node and its label and redraws its arrows straight between the boxes",
    run: () => {
      const { elements } = run(SCENE(), 'flowchart LR\n  API["API"]\n  DB["DB"]\n  API --> DB\n  %% aof:node API x=0 y=300\n');
      assert.deepEqual([elements.find((e) => e.id === "e-api").y, elements.find((e) => e.id === "t-e-api").y], [300, 320]);
      const arrow = elements.find((e) => e.id === "a1");
      assert.deepEqual({ x: arrow.x, y: arrow.y, points: arrow.points }, straightArrow({ x: 0, y: 300, w: 100, h: 60 }, { x: 300, y: 0, w: 100, h: 60 }));
      assert.deepEqual(viewOf(elements).layout.API, { x: 0, y: 300 });
    },
  },
  {
    name: "compile: an edge's kind or label changing redraws it; a style recolours the box",
    run: () => {
      const { elements } = run(SCENE(), 'flowchart LR\n  API["API"]\n  DB["DB"]\n  API ==>|"writes"| DB\n  style DB fill:#ffd6d6,stroke:#c00\n');
      assert.equal(elements.find((e) => e.id === "a1").isDeleted, true, "the old arrow goes");
      const model = viewOf(elements);
      assert.deepEqual(model.edges.map((e) => [e.kind, e.label]), [["thick", "writes"]]);
      assert.deepEqual(model.styles.DB, { fill: "#ffd6d6", stroke: "#c00" });
    },
  },
  {
    name: "compile: a library item is cloned from the project library — new ids, one group, tagged, anchored for arrows and labelled",
    run: () => {
      const libraries = [{ library: "azure", item: "Function App", elements: [
        { id: "L1", type: "line", x: 500, y: 500, width: 40, height: 40, groupIds: ["G"] },
        { id: "L2", type: "freedraw", x: 510, y: 510, width: 20, height: 20, groupIds: ["G"] },
      ] }];
      const text = 'flowchart LR\n  API["API"]\n  DB["DB"]\n  Fn["Orders worker"]\n  API --> DB\n  DB --> Fn\n  %% aof:node Fn x=600 y=0\n  %% aof:lib Fn azure/"Function App"\n';
      const { elements, unresolved } = run(SCENE(), text, { libraries });
      assert.deepEqual(unresolved, []);
      const instance = elements.filter((e) => e.customData?.aof?.lib);
      assert.equal(instance.length, 4, "two library elements, the anchor and the label");
      assert.ok(instance.every((e) => e.customData.aof.id === "Fn" && !["L1", "L2"].includes(e.id)), "fresh ids, all tagged with the node");
      const outer = new Set(instance.map((e) => e.groupIds.at(-1)));
      assert.equal(outer.size, 1, "one insertion is one group");
      assert.deepEqual([instance[0].x, instance[0].y], [600, 0], "placed where the proposal says");
      const model = viewOf(elements);
      assert.deepEqual(model.libs, { Fn: { library: "azure", item: "Function App" } });
      assert.deepEqual(model.nodes.find((n) => n.id === "Fn").label, "Orders worker");
      const caption = instance.find((e) => e.customData.aof.label);
      assert.deepEqual([caption.x, caption.y], [600 + (40 - 130) / 2, 40 + 8], "the label is centred under the item");
      assert.deepEqual(model.edges.map((e) => e.key), ["API->DB#1", "DB->Fn#1"], "an arrow to a library item binds to its anchor");
      const missing = run(SCENE(), text.replace("Function App", "Nope"), { libraries });
      assert.match(missing.unresolved[0], /Fn: azure\/"Nope" is not in the project libraries/);
    },
  },
  {
    name: "compile: a subgraph becomes a frame its members join, fitted around them",
    run: () => {
      const text = 'flowchart LR\n  subgraph core["Core"]\n    API["API"]\n    DB["DB"]\n  end\n  API --> DB\n';
      const { elements } = run(SCENE(), text);
      const frame = elements.find((e) => e.type === "frame");
      assert.equal(frame.name, "Core");
      assert.ok(["e-api", "e-db", "t-e-api", "t-e-db"].every((id) => elements.find((e) => e.id === id).frameId === frame.id));
      assert.ok(frame.x < 0 && frame.x + frame.width > 400, "the frame encloses its members");
      assert.deepEqual(viewOf(elements).nodes.map((n) => n.parent), ["core", "core"]);
    },
  },
  {
    name: "compile: the first draft takes the converter's whole layout — frames for subgraphs, tagged nodes, arrows remapped to the new ids",
    run: () => {
      const proposed = parseProfile('flowchart LR\n  subgraph core["Core"]\n    API["API"]\n  end\n  DB[("DB")]\n  API -->|"writes"| DB\n  API --> DB\n');
      const converted = [
        { id: "core", type: "rectangle", x: 0, y: 0, width: 200, height: 120, label: { text: "Core" }, groupIds: ["subgraph_group_core"] },
        { id: "API", type: "rectangle", x: 20, y: 40, width: 60, height: 44, label: { text: "API" }, groupIds: ["subgraph_group_core"] },
        { id: "DB", type: "rectangle", x: 300, y: 40, width: 70, height: 70, label: { text: "DB" } },
        { id: "API_DB", type: "arrow", x: 80, y: 60, start: { id: "API" }, end: { id: "DB" }, label: { text: "writes" } },
        { id: "API_DB", type: "arrow", x: 80, y: 70, start: { id: "API" }, end: { id: "DB" } },
      ];
      const { skeletons, frameOf } = firstDraftSkeletons(converted, proposed, { newId });
      const frame = skeletons.find((s) => s.type === "frame");
      assert.equal(frame.name, "Core"); assert.deepEqual(frame.customData, { aof: { id: "core" } });
      const api = skeletons.find((s) => s.customData?.aof?.id === "API");
      assert.equal(frameOf("API"), frame.id); assert.equal(frameOf("DB"), null);
      const arrows = skeletons.filter((s) => s.type === "arrow");
      assert.deepEqual(arrows.map((a) => [a.start.id === api.id, a.label?.text ?? null]), [[true, "writes"], [true, null]]);
      assert.ok(skeletons.every((s) => s.id !== "API" && s.id !== "API_DB"), "element ids are fresh, never Mermaid ids");
    },
  },
  {
    name: "compile: library items for the panel carry their origin, and an item of several loose elements is given one group",
    run: () => {
      const [loose, grouped] = libraryItemsFor([
        { library: "azure", item: "App Service", id: "i1", elements: [{ id: "a", type: "line" }, { id: "b", type: "freedraw" }] },
        { library: "azure", item: "SQL", id: "i2", elements: [{ id: "c", type: "line", groupIds: ["G"] }, { id: "d", type: "line", groupIds: ["G"] }] },
      ]);
      assert.equal(loose.name, "azure/App Service");
      assert.ok(loose.elements.every((e) => e.customData.aof.lib.item === "App Service" && e.groupIds.length === 1));
      assert.deepEqual(grouped.elements.map((e) => e.groupIds), [["G"], ["G"]], "an item already grouped keeps its group");
    },
  },
  {
    name: "compile: operations are the touched elements — new ones added, the rest updated whole",
    run: () => {
      const scene = SCENE();
      const result = run(scene, 'flowchart LR\n  API["API"]\n  DB["DB"]\n  N["New"]\n  API --> DB\n');
      const operations = operationsFor(scene, result.elements, result.touched);
      assert.ok(operations.every((o) => o.op === "add" || o.op === "update"));
      assert.equal(operations.filter((o) => o.op === "add").length, 2, "the new box and its label");
      assert.deepEqual(boundsOf([]), null);
    },
  },
];
