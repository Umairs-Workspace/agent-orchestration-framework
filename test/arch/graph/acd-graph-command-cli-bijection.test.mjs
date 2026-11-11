
import { defaultApplication as _aofApplication } from "aof/default-application";
// Fitness function for milestone 09 / ADR-006 inv. 1 (the 08 bijection, extended
// to graph:*):
// "`graph:build`/`graph:query`/`graph:triage` are in the SAME `listCommands()`
//  registry, each with a non-null `cli` adapter (`cli.argv`/`cli.render`
//  functions) AND a reachable `aof graph <verb>` dispatch branch — no graph
//  command the CLI cannot run."
//
// Three proofs, mirroring 08's acd-work-command-cli-bijection idiom applied to
// the graph surface:
//   (a) import the registry; assert each of the three graph:* commands is present
//       and carries a `cli` adapter with `argv`/`render` functions;
//   (b) each verb is CLI-reachable through EITHER door (m42 wave (d) leg d1,
//       wave 3): a registry-derived route-table entry (`cli.route` — the
//       migrated form) OR a `subcommand === "<verb>"` dispatch branch isolated
//       to the graphCommand body (the legacy ladder form);
//   (c) CLI spawn-and-parse: run `aof graph {build,query,triage} --json` against a
//       temp fixture repo (no graphify binary, no built graph) and assert each
//       emits a SINGLE parseable JSON envelope — a success projection OR the
//       structured `{ ok:false, error, code }` error envelope (both parse). This
//       proves the verb is dispatched even when its live preconditions are absent.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
const listCommands = _aofApplication.listCommands;
const deriveRouteTable = _aofApplication.cli.deriveRouteTable;
import { spawnCliSync } from "../../support/cli-spawn.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const cliPath = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");
const CLI_MJS = path.join(repoRoot, "packages", "core", "src", "cli.mjs");

// The graph verbs, each backed by a graph:<verb> command. `impact` is the
// milestone-11/ADR-007 deterministic edge-based coupling command (the running agents'
// primary grounding signal) — covered here so its argv/render/dispatch are CI-locked
// like the others (gap caught at the ADR-007 structural review).
// `export` / `import` carry the graph between clones (166) — each refuses a missing path with the
// structured envelope, which is what the spawn-and-parse proof below reads.
// `fetch` / `publish` / `prune` share the graph through the project's own remote (174) — in the
// fixture (no git on PATH, no graph) each answers its structured refusal envelope.
const GRAPH_VERBS = ["build", "query", "triage", "impact", "export", "import", "fetch", "publish", "prune"];
const GRAPH_COMMAND_IDS = GRAPH_VERBS.map((verb) => `graph:${verb}`);

function stripComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

// Isolate the `graphCommand` function body so the dispatch grep cannot be
// satisfied by a `subcommand === "<verb>"` belonging to some OTHER dispatcher.
function graphCommandBody(source) {
  const start = source.search(/(?:async\s+)?function\s+graphCommand\s*\(/);
  if (start === -1) return "";
  const re = /\n(?:export\s+)?(?:async\s+)?function\s/g;
  re.lastIndex = start + 1;
  const next = re.exec(source);
  return source.slice(start, next ? next.index : source.length);
}

// --- the CLI fixture repo: a minimal aof project, NO graphify binary, NO graph -

async function buildFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-graph-bijection-"));
  const aofDir = path.join(root, ".aof");
  await mkdir(aofDir, { recursive: true });
  await mkdir(path.join(root, "wiki", "work"), { recursive: true });
  await writeFile(
    path.join(aofDir, "aof.config.json"),
    `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" } }, null, 2)}\n`,
    "utf8"
  );
  return root;
}

// `aof graph <verb> --json` args. build needs a positional folder; query needs a
// question; triage takes no positional. All run with NO graphify + NO built
// graph, so each resolves to the structured error envelope (graphify-missing /
// no-graph) — which still parses as a single JSON document.
function argsFor(verb) {
  switch (verb) {
    // m42 wave (d) leg d1 (wave-3 tail) — graph:serve rides the launcher seam:
    // --json is the NON-BLOCKING probe by FACE POLICY (--json never launches),
    // so the spawn returns with the MCP surface document — never the stdio loop.
    case "serve": return ["graph", "serve", "--json"];
    case "build": return ["graph", "build", ".", "--json"];
    case "query": return ["graph", "query", "what calls main", "--json"];
    case "triage": return ["graph", "triage", "--json"];
    // impact takes a path positional; against the fixture (no built graph) it resolves
    // to the structured no-graph error envelope — which still parses as one JSON doc.
    case "impact": return ["graph", "impact", "packages/core/src/cli.mjs", "--json"];
    // export/import with no path resolve to their no-path envelope — one JSON document each.
    case "export": return ["graph", "export", "--json"];
    case "import": return ["graph", "import", "--json"];
    case "fetch": return ["graph", "fetch", "--json"];
    case "publish": return ["graph", "publish", "--json"];
    case "prune": return ["graph", "prune", "--json"];
    default: throw new Error(`unmapped graph verb ${verb}`);
  }
}

function runCli(root, args) {
  // A scrubbed PATH so the fixture run cannot accidentally find a real graphify
  // binary on the developer machine — the error envelope must be deterministic.
  const result = spawnCliSync(process.execPath, [cliPath, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1", PATH: "", Path: "" },
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

// ── FF-17903 (179/ADR-002, amending this control) ─────────────────────────────────────────────
// `graph:build` and `graph:impact` are faces over the knowledge-engine port: neither imports the
// graph's readers nor the graphify driver, and with the binary or the graph absent each answers the
// port's code. The check is exported so the red probe runs it over a planted face.
const PORT_FACES = ["packages/knowledge/src/commands/graph-build.mjs", "packages/knowledge/src/commands/graph-impact.mjs"];
const GRAPH_READERS = ["readGraph", "normalizeGraph", "computeImpact"];
// The modules that ARE the graph's readers or its driver; a face importing any of them by path reads
// the artifact itself whatever names it takes.
const READER_MODULES = /(^|\/)(graphify|graph-normalize|graph-impact)\.mjs$/u;

export function faceReadFailures(rel, source) {
  const failures = [];
  for (const { specifier } of importSpecifiers(source)) {
    if (READER_MODULES.test(specifier)) failures.push(`${rel} imports the graph reader module ${specifier}`);
  }
  for (const match of stripComments(source).matchAll(/\bimport\s*\{([^}]*)\}\s*from/gu)) {
    for (const binding of match[1].split(",").map((entry) => entry.trim().split(/\s+as\s+/u)[0]).filter(Boolean)) {
      if (GRAPH_READERS.includes(binding)) failures.push(`${rel} imports ${binding}`);
    }
  }
  return failures;
}

// Every graph verb, `serve` included, as the registry lists it.
const ALL_GRAPH_IDS = ["graph:build", "graph:query", "graph:triage", "graph:impact", "graph:serve", "graph:export", "graph:import", "graph:fetch", "graph:publish", "graph:prune"];

export const archTests = [
  {
    name: "arch/ADR-006 inv.1: the three graph:* commands are in listCommands() with a non-null cli adapter (argv + render functions)",
    run: async () => {
      const commands = listCommands();
      const byId = new Map(commands.map((command) => [command.id, command]));
      for (const id of GRAPH_COMMAND_IDS) {
        const command = byId.get(id);
        assert.ok(command != null, `${id} is registered in listCommands()`);
        assert.ok(command.cli != null, `${id} carries a non-null cli adapter`);
        assert.equal(typeof command.cli.argv, "function", `${id} cli.argv is a function`);
        assert.equal(typeof command.cli.render, "function", `${id} cli.render is a function`);
      }
    },
  },
  {
    name: "arch/ADR-006 inv.1: every graph verb is CLI-reachable — a route-table entry OR a graphCommand dispatch branch",
    run: async () => {
      const body = graphCommandBody(stripComments(await readFile(CLI_MJS, "utf8")));
      assert.ok(body.length > 0, "graphCommand is defined in cli.mjs (serve + the unknown-verb shim)");
      const routes = deriveRouteTable(listCommands());
      for (const verb of GRAPH_VERBS) {
        const routed = routes.has(`graph ${verb}`);
        const laddered = new RegExp(`subcommand\\s*===\\s*["']${verb}["']`).test(body);
        assert.ok(
          routed || laddered,
          `graph ${verb} is reachable via the route table or a graphCommand branch (no graph command the CLI cannot run)`
        );
      }
    },
  },
  {
    name: "arch/ADR-006 inv.1: aof graph <verb> --json emits a single parseable JSON envelope for every verb (success OR structured error)",
    run: async () => {
      const root = await buildFixture();
      try {
        for (const verb of GRAPH_VERBS) {
          const args = argsFor(verb);
          const result = runCli(root, args);
          // With no binary + no graph, the verb routes to the structured error
          // envelope (exit 1) — but it must NEVER crash (a null status from a
          // thrown, unhandled error) and must emit exactly one JSON document.
          assert.notEqual(result.status, null, `aof ${args.join(" ")} did not crash (stderr: ${result.stderr})`);
          assert.ok([0, 1].includes(result.status), `aof ${args.join(" ")} exits 0/1 (got ${result.status}; stderr: ${result.stderr})`);
          let parsed;
          assert.doesNotThrow(
            () => { parsed = JSON.parse(result.stdout); },
            `aof ${args.join(" ")} emits a single parseable JSON envelope (stdout: ${result.stdout.slice(0, 200)})`
          );
          assert.ok(parsed !== undefined, `aof ${args.join(" ")} produced a JSON value`);
          // The envelope is either a success projection or the structured error
          // { ok:false, error, code } — both are valid; neither is an unparsed
          // crash dump.
          if (parsed && parsed.ok === false) {
            assert.equal(typeof parsed.error, "string", `${verb} error envelope carries an error message`);
            assert.ok("code" in parsed, `${verb} error envelope carries a code`);
          }
        }
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/179/02 FF-17903 outline: the graph faces import none of the graph's readers — graph-build.mjs and graph-impact.mjs",
    run: async () => {
      for (const rel of PORT_FACES) {
        assert.deepEqual(faceReadFailures(rel, await readFile(path.join(repoRoot, rel), "utf8")), [], `${rel} reaches the graph only through the port`);
      }
    },
  },
  {
    name: "arch/179/02 FF-17903 outline: the amended bijection pins each face's miss to the port's code — build . → graphify-missing, impact → no-graph",
    run: async () => {
      const root = await buildFixture();
      try {
        for (const [verb, code] of [["build", "graphify-missing"], ["impact", "no-graph"]]) {
          const result = runCli(root, argsFor(verb));
          assert.equal(JSON.parse(result.stdout).code, code, `aof graph ${verb} --json answers ${code} (stdout: ${result.stdout.slice(0, 200)})`);
        }
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/179/02: every graph verb is still registered with a CLI adapter and a route",
    run: () => {
      const byId = new Map(listCommands().map((command) => [command.id, command]));
      const routes = deriveRouteTable(listCommands());
      for (const id of ALL_GRAPH_IDS) {
        const command = byId.get(id);
        assert.ok(command, `${id} is registered`);
        assert.ok(routes.has(id.replace(":", " ")), `${id} has a route`);
        assert.equal(typeof command.cli?.argv, "function", `${id} has an argv function`);
        assert.equal(typeof command.cli?.render, "function", `${id} has a render function`);
      }
    },
  },
  {
    name: "arch/179/02 FF-17903 red probe: a graph-impact face that imports computeImpact fails, naming the module and the symbol",
    run: async () => {
      const rel = "packages/knowledge/src/commands/graph-impact.mjs";
      const planted = `import { computeImpact } from "../graph-impact.mjs";\n${await readFile(path.join(repoRoot, rel), "utf8")}`;
      const failures = faceReadFailures(rel, planted);
      assert.ok(failures.includes(`${rel} imports computeImpact`), failures.join("; "));
      assert.ok(failures.some((failure) => failure.includes("commands/graph-impact.mjs") && failure.includes("graph-impact.mjs")), "…and names the reader module it reached");
    },
  },
];
