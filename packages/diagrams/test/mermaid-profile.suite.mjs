// The aof Mermaid profile (milestone 200, ADR-006): the one format of an ADR diagram. Pure over text,
// driven headlessly: parse, the canonical form, every refusal, diff, and the three-way merge rules.
import assert from "node:assert/strict";
import {
  canonicalize, changedIds, decodeLabel, diffModels, emptyProfile, encodeLabel, parseProfile, serializeProfile, validateModel,
} from "@aof/diagrams/mermaid-profile";

const DIAGRAM = `flowchart LR
  %% the scene seam
  subgraph core["Core"]
    API["API service"]
    Store[("Store")]
  end
  Client(["Client"])
  Client -->|"calls (https)"| API
  API -->|"writes"| Store
  API -.-> Store
  style API fill:#dbe7f3,stroke:#1f3a5f
  %% aof:node API x=10 y=20 w=160 h=80
  %% aof:edge API->Store#1 x=170 y=60 points=0,0;120,0
`;
const refusal = (text) => { try { parseProfile(text); return null; } catch (error) { return { code: error.code, line: error.line ?? null, message: error.message }; } };
const model = (text) => parseProfile(text);

export const mermaidProfileTests = [
  {
    name: "profile: a diagram parses to nodes, subgraphs, keyed edges, styles, layout and paths",
    run: () => {
      const m = model(DIAGRAM);
      assert.equal(m.direction, "LR");
      assert.deepEqual(m.header, ["the scene seam"]);
      assert.deepEqual(m.subgraphs, [{ id: "core", label: "Core", parent: null }]);
      assert.deepEqual(m.nodes, [
        { id: "API", label: "API service", shape: "rect", parent: "core" },
        { id: "Store", label: "Store", shape: "cylinder", parent: "core" },
        { id: "Client", label: "Client", shape: "stadium", parent: null },
      ]);
      assert.deepEqual(m.edges.map((e) => [e.key, e.kind, e.label]), [["Client->API#1", "arrow", "calls (https)"], ["API->Store#1", "arrow", "writes"], ["API->Store#2", "dotted", null]], "parallel edges are told apart by their order");
      assert.deepEqual(m.styles, { API: { fill: "#dbe7f3", stroke: "#1f3a5f" } });
      assert.deepEqual(m.layout, { API: { x: 10, y: 20, w: 160, h: 80 } });
      assert.deepEqual(m.paths, { "API->Store#1": { x: 170, y: 60, points: [[0, 0], [120, 0]] } });
    },
  },
  {
    name: "profile: the canonical form is a fixed point, stays valid Mermaid, and round-trips the model",
    run: () => {
      const text = canonicalize(DIAGRAM);
      assert.equal(canonicalize(text), text, "canonicalizing twice changes nothing");
      assert.deepEqual(parseProfile(text), model(DIAGRAM));
      assert.match(text, /^flowchart LR\n  %% aof:profile 1\n  %% the scene seam\n  subgraph core\["Core"\]\n    API\["API service"\]\n    Store\[\("Store"\)\]\n  end\n  Client\(\["Client"\]\)\n/);
      assert.match(text, /  Client -->\|"calls \(https\)"\| API\n  API -->\|"writes"\| Store\n  API -\.-> Store\n  style API fill:#dbe7f3,stroke:#1f3a5f\n  %% aof:node API x=10 y=20 w=160 h=80\n  %% aof:edge API->Store#1 x=170 y=60 points=0,0;120,0\n$/);
      assert.equal(emptyProfile(), "flowchart LR\n  %% aof:profile 1\n");
      assert.deepEqual(model(emptyProfile()).nodes, []);
    },
  },
  {
    name: "profile: the forms models write by hand are read — chains, inline shapes, bare ids, unquoted labels, `graph`, `;`",
    run: () => {
      const m = model("graph TD\n  A[API] --> B[(Store)] -.->|miss| C{Cache?};\n  D\n  B --> D\n");
      assert.equal(m.direction, "TD");
      assert.deepEqual(m.nodes.map((n) => [n.id, n.shape, n.label]), [["A", "rect", "API"], ["B", "cylinder", "Store"], ["C", "diamond", "Cache?"], ["D", "rect", "D"]]);
      assert.deepEqual(m.edges.map((e) => e.key), ["A->B#1", "B->C#1", "B->D#1"]);
      assert.equal(m.edges[1].label, "miss");
      for (const [shape, text] of [["round", 'R("x")'], ["subroutine", 'S[["x"]]'], ["circle", 'O(("x"))'], ["hexagon", 'H{{"x"}}'], ["asymmetric", 'F>"x"]']]) {
        assert.equal(model(`flowchart LR\n  ${text}\n`).nodes[0].shape, shape, text);
      }
    },
  },
  {
    name: "profile: a node's place is x and y; its size is written only when a person chose one",
    run: () => {
      const m = model('flowchart LR\n  A["A"]\n  B["B"]\n  %% aof:node A x=10 y=20\n  %% aof:node B x=300 y=20 w=200 h=90\n');
      assert.deepEqual(m.layout, { A: { x: 10, y: 20 }, B: { x: 300, y: 20, w: 200, h: 90 } });
      assert.match(serializeProfile(m), /%% aof:node A x=10 y=20\n  %% aof:node B x=300 y=20 w=200 h=90\n$/);
    },
  },
  {
    name: "profile: labels survive quotes, backticks, entity look-alikes and newlines",
    run: () => {
      const label = 'a "quoted" `tick` C#1; and\nline two';
      const text = serializeProfile({ direction: "LR", header: [], subgraphs: [], nodes: [{ id: "A", label, shape: "rect", parent: null }], edges: [], styles: {}, layout: {}, paths: {} });
      assert.equal(model(text).nodes[0].label, label);
      assert.equal(encodeLabel('x"y\nz'), "x#quot;y<br/>z");
      assert.equal(decodeLabel("a#quot;b<br>c#35;d#lt;"), 'a"b\nc#d<');
    },
  },
  {
    name: "profile: what the profile does not admit is refused with a code and the line it is on",
    run: () => {
      const rows = [
        ["sequenceDiagram\n  A->>B: hi", "diagram-mermaid-unsupported", 1],
        ["flowchart LR\n  A[unclosed", "diagram-mermaid-invalid", 2],
        ["flowchart LR\n  classDef hot fill:#f00", "diagram-mermaid-unsupported", 2],
        ["flowchart LR\n  A:::hot", "diagram-mermaid-unsupported", 2],
        ["flowchart LR\n  A & B --> C", "diagram-mermaid-unsupported", 2],
        ["flowchart LR\n  A -- text --> B", "diagram-mermaid-unsupported", 2],
        ["flowchart LR\n  %%{init: {}}%%", "diagram-mermaid-unsupported", 2],
        ["flowchart LR\n  end", "diagram-mermaid-invalid", 2],
        ["flowchart LR\n  subgraph s\n  A", null, null],
        ["flowchart LR\n  style A fill:#f00", null, null],
        ["flowchart LR\n  style A font-size:12px\n  A", "diagram-mermaid-unsupported", 2],
        ["flowchart LR\n  end1 --> 9x", "diagram-mermaid-invalid", 2],
        ["flowchart LR\n  A\n  %% aof:node A x=1 y=2 w=3", "diagram-mermaid-invalid", 3],
        ["flowchart LR\n  A\n  %% aof:node A x=1", "diagram-mermaid-invalid", 3],
        ["flowchart LR\n  A\n  %% aof:node B x=1 y=2 w=3 h=4", null, null],
        ["flowchart LR\n  %% aof:profile 2", "diagram-mermaid-unsupported", 2],
        ["flowchart LR\n  %% aof:paint A", "diagram-mermaid-unsupported", 2],
        ["flowchart LR\n  subgraph A\n  end\n  A --> B", "diagram-mermaid-invalid", 4],
      ];
      for (const [text, code, line] of rows) {
        const found = refusal(text);
        assert.ok(found, `refused: ${JSON.stringify(text)}`);
        if (code) assert.equal(found.code, code, `${JSON.stringify(text)} → ${found.message}`);
        if (line) assert.equal(found.line, line, `${JSON.stringify(text)} names line ${line}: ${found.message}`);
      }
      assert.equal(refusal("x".repeat(600 * 1024))?.code, "diagram-mermaid-too-large");
    },
  },
  {
    name: "profile: a diff names every keyed fact that was added, changed or removed, layout and paths included",
    run: () => {
      const before = model(DIAGRAM);
      const after = model(DIAGRAM.replace('API["API service"]', 'API["API gateway"]').replace("%% aof:node API x=10", "%% aof:node API x=50").replace("  API -.-> Store\n", "  Store --> Cache\n"));
      const changes = diffModels(before, after);
      assert.deepEqual(changes.map((c) => `${c.change} ${c.key}`).sort(), ["added edge:Store->Cache#1", "added node:Cache", "changed layout:API", "changed node:API", "removed edge:API->Store#2"].sort());
      assert.deepEqual(changedIds(changes).sort(), ["API", "API->Store#2", "Cache", "Store->Cache#1"].sort());
      assert.deepEqual(diffModels(before, before), []);
    },
  },
  {
    name: "profile: library items and sketches are named in the view — a lib is a fact a proposal can set, a sketch is read-only",
    run: () => {
      const text = 'flowchart LR\n  API["Orders API"]\n  Note["x"]\n  %% aof:lib API azure/"App Service"\n  %% aof:sketch s1 "freedraw ×3, text #quot;todo#quot;"\n';
      const m = model(text);
      assert.deepEqual(m.libs, { API: { library: "azure", item: "App Service" } });
      assert.deepEqual(m.sketches, { s1: 'freedraw ×3, text "todo"' });
      assert.match(serializeProfile(m), /%% aof:lib API azure\/"App Service"\n  %% aof:sketch s1 "freedraw ×3, text #quot;todo#quot;"\n$/);
      const changes = diffModels(m, model(text.replace('azure/"App Service"', 'azure/"Function App"').replace('"freedraw ×3', '"freedraw ×9')));
      assert.deepEqual(changes, [{ key: "lib:API", change: "changed" }], "a sketch never changes through a proposal");
      assert.equal(refusal('flowchart LR\n  A\n  %% aof:lib A azure').code, "diagram-mermaid-invalid");
      assert.ok(refusal('flowchart LR\n  A\n  %% aof:lib B azure/"X"'), "a lib must name a node");
      assert.ok(refusal('flowchart LR\n  A\n  %% aof:sketch A "x"'), "a sketch cannot reuse a node id");
    },
  },
];
