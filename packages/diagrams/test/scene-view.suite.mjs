// The scene, seen as Mermaid (milestone 170, ADR-010): an Excalidraw scene — boxes, frames, arrows,
// library item insertions and free drawing — projected into the aof Mermaid profile the architect
// reads, with every Mermaid id traced back to the elements that show it.
import assert from "node:assert/strict";
import { parseProfile } from "@aof/diagrams/mermaid-profile";
import { assignAliases, projectScene, sceneView, selectionIds } from "@aof/diagrams/scene-view";

const box = (id, extra = {}) => ({ id, type: "rectangle", x: 0, y: 0, width: 100, height: 60, strokeColor: "#1e1e1e", backgroundColor: "transparent", ...extra });
const text = (id, containerId, value, extra = {}) => ({ id, type: "text", x: 0, y: 0, width: 40, height: 20, containerId, text: value, originalText: value, strokeColor: "#1e1e1e", ...extra });
const arrow = (id, from, to, extra = {}) => ({ id, type: "arrow", x: 0, y: 0, width: 10, height: 0, points: [[0, 0], [10, 0]], startBinding: { elementId: from }, endBinding: { elementId: to }, strokeStyle: "solid", strokeWidth: 2, endArrowhead: "arrow", ...extra });
const tagged = (element, id) => ({ ...element, customData: { aof: { id } } });

// A scene a person and the architect have both drawn on.
const SCENE = [
  { id: "f1", type: "frame", x: -20, y: -40, width: 400, height: 200, name: "Core", customData: { aof: { id: "core" } } },
  tagged(box("e-api", { x: 10, y: 20, frameId: "f1", backgroundColor: "#dbe7f3" }), "API"),
  text("t-api", "e-api", "Orders API"),
  tagged(box("e-db", { type: "ellipse", x: 300, y: 20, frameId: "f1" }), "DB"),
  text("t-db", "e-db", "Orders DB"),
  arrow("a1", "e-api", "e-db", { strokeStyle: "dashed" }),
  text("t-a1", "a1", "writes"),
  arrow("a2", "e-api", "e-db"),
  // one insertion of a library item: three elements in one group, tagged as the library loaded them
  { id: "l1", type: "line", x: 600, y: 0, width: 50, height: 50, groupIds: ["grp-9"], customData: { aof: { id: "Fn", lib: { library: "azure", item: "Function App" } } } },
  { id: "l2", type: "freedraw", x: 610, y: 10, width: 30, height: 30, groupIds: ["grp-9"], customData: { aof: { id: "Fn", lib: { library: "azure", item: "Function App" } } } },
  { id: "l3", type: "rectangle", x: 600, y: 0, width: 50, height: 50, groupIds: ["grp-9"], strokeColor: "transparent", customData: { aof: { id: "Fn", lib: { library: "azure", item: "Function App" }, anchor: true } } },
  arrow("a3", "e-db", "l3"),
  // what Mermaid cannot express
  { id: "pen", type: "freedraw", x: 900, y: 0, width: 20, height: 20, customData: { aof: { id: "s1" } } },
  { id: "loose", type: "text", x: 900, y: 80, width: 20, height: 20, text: "todo", originalText: "todo", customData: { aof: { id: "s2" } } },
  arrow("half", "e-api", null, { endBinding: null, customData: { aof: { id: "s3" } } }),
  { id: "gone", type: "rectangle", x: 0, y: 0, width: 1, height: 1, isDeleted: true },
];

export const sceneViewTests = [
  {
    name: "scene view: boxes, frames, arrows, library insertions and free drawing project to nodes, subgraphs, edges, libs and sketches",
    run: () => {
      const { model } = projectScene(SCENE);
      assert.deepEqual(model.subgraphs, [{ id: "core", label: "Core", parent: null }]);
      assert.deepEqual(model.nodes.map((n) => [n.id, n.label, n.shape, n.parent]), [["API", "Orders API", "rect", "core"], ["DB", "Orders DB", "circle", "core"], ["Fn", "Function App", "rect", null]]);
      assert.deepEqual(model.edges.map((e) => [e.key, e.kind, e.label]), [["API->DB#1", "dotted", "writes"], ["API->DB#2", "arrow", null], ["DB->Fn#1", "arrow", null]], "an arrow bound to a library item's anchor joins that node");
      assert.deepEqual(model.libs, { Fn: { library: "azure", item: "Function App" } });
      assert.deepEqual(model.styles, { API: { fill: "#dbe7f3" } });
      assert.deepEqual(model.layout.API, { x: 10, y: 20 }, "the view carries places, not sizes");
      assert.deepEqual(Object.keys(model.sketches).sort(), ["s1", "s2", "s3"], "free drawing, loose text and a half-joined arrow are sketches; a deleted element is nothing");
      assert.match(model.sketches.s2, /text "todo"/);
    },
  },
  {
    name: "scene view: the projection is valid profile Mermaid the architect can read and edit",
    run: () => {
      const view = sceneView(SCENE);
      assert.match(view, /^flowchart LR\n  %% aof:profile 1\n  subgraph core\["Core"\]\n    API\["Orders API"\]\n    DB\(\("Orders DB"\)\)\n  end\n  Fn\["Function App"\]\n/);
      assert.match(view, /  API -\.->\|"writes"\| DB\n  API --> DB\n  DB --> Fn\n/);
      assert.match(view, /%% aof:lib Fn azure\/"Function App"/);
      assert.match(view, /%% aof:sketch s1 "freedraw"/);
      const reparsed = parseProfile(view);
      assert.deepEqual(reparsed.nodes, projectScene(SCENE).model.nodes);
      assert.deepEqual(reparsed.libs, projectScene(SCENE).model.libs);
    },
  },
  {
    name: "scene view: every Mermaid id traces to the elements that show it, and each node to its arrows",
    run: () => {
      const { index } = projectScene(SCENE);
      assert.deepEqual(index.API, { kind: "node", elementIds: ["e-api", "t-api"], container: "e-api", label: "t-api", arrows: ["API->DB#1", "API->DB#2"] });
      assert.deepEqual(index["API->DB#1"].elementIds, ["a1", "t-a1"]);
      assert.deepEqual(index.Fn.elementIds, ["l1", "l2", "l3"]); assert.equal(index.Fn.container, "l3"); assert.equal(index.Fn.lib, true);
      assert.deepEqual(index.core, { kind: "subgraph", elementIds: ["f1"], container: "f1" });
      assert.deepEqual(index.s3.elementIds, ["half"]);
    },
  },
  {
    name: "scene view: aliases are given to what a person drew, kept where claimed, and fresh for a copy",
    run: () => {
      const drawn = [
        tagged(box("e-a"), "A"),
        box("e-new"), text("t-new", "e-new", "New box"),
        { ...tagged(box("e-copy", { x: 300 }), "A") },
        { id: "fr", type: "frame", x: 0, y: 0, width: 10, height: 10, name: "Zone" },
        { id: "p1", type: "freedraw", x: 0, y: 0, width: 5, height: 5, groupIds: ["g"] },
        { id: "p2", type: "line", x: 0, y: 0, width: 5, height: 5, groupIds: ["g"] },
      ];
      const { elements, assigned } = assignAliases(drawn);
      assert.deepEqual(assigned, { "e-new": "n1", "e-copy": "n2", fr: "g1", p1: "s1", p2: "s1" });
      assert.equal(elements.find((e) => e.id === "t-new").customData, undefined, "a label belongs to its box and carries no id");
      assert.deepEqual(elements.find((e) => e.id === "e-new").customData, { aof: { id: "n1" } });
      assert.deepEqual(projectScene(elements).model.nodes.map((n) => n.id), ["A", "n1", "n2"]);
      assert.deepEqual(assignAliases(elements).assigned, {}, "aliasing an aliased scene changes nothing");
    },
  },
  {
    name: "scene view: a selection names Mermaid ids — a label selects its box, an arrow its edge, a stroke its sketch",
    run: () => {
      assert.deepEqual(selectionIds(SCENE, { "t-api": true, a1: true, l2: true, pen: true, nothing: true, "e-db": false }).sort(), ["API", "API->DB#1", "Fn", "s1"].sort());
    },
  },
];
