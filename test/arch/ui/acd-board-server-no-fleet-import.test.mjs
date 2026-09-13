// Fitness function for milestone 46 / story 02 / ADR-004 (the CYCLE PROHIBITION):
//
//   "`src/board-serve.mjs` and `src/setup-ui.mjs` MUST NOT import
//    `src/mesh/ui-serve.mjs`. The standalone fleet-origin fallback is resolved in the
//    COMMAND layer, which is the layer already allowed to know both faces."
//
// WHY THIS GATE EXISTS AT ALL. ADR-004 states the prohibition in terms and NOTHING
// caught it — checked at source at HEAD before this file was written:
//   - `acd-command-layer-imports-downward` inverts and forbids `src/*.mjs` →
//     `src/commands/*` edges and cycles THROUGH the command boundary. A
//     `board-serve.mjs` → `mesh-ui-serve.mjs` edge is src-root to src-root; that gate
//     never looks at it.
//   - `acd-work-ui-no-core-import`'s setup-ui clause forbids `./work.mjs`,
//     `./feature-parse.mjs`, `./command-core.mjs` and `./commands/*` — green, useful,
//     and silent about `./mesh-ui-serve.mjs`. It also never reads `board-serve.mjs`.
//   - `acd-terminal-origin-not-port` (story 46/03) is scoped to socket-URL construction
//     under `ui/src`, deliberately, so it can never fight the other origin gate over an
//     exemption list. It does not reach `src/`.
// A prohibition honoured only by memory is not a prohibition. It lands in its OWN file
// rather than folded into `acd-work-ui-no-core-import` because it is a different ADR
// over a different subject set (that gate never reads `board-serve.mjs`), and burying a
// cycle prohibition under a name that says "no core import" is how a reviewer fails to
// find it.
//
// WHY THE EDGE MATTERS, measured on the codebase graph at this milestone's refine:
// `src/mesh/ui-serve.mjs → src/board-serve.mjs` is a REAL edge (the fleet launches the
// per-workspace board), so the reverse import closes a cycle — and it would drag the
// fleet server, and `ws`, into `aof work ui --json`'s probe path, whose entire contract
// is "never launches".
//
// EXPECTATION AT ARRIVAL: GREEN. It preserves a property that is true today and was
// unguarded — the same class as `acd-terminal-mirror-geometry-pinned`. A deny-list gate
// with nothing to deny reads green while asserting nothing, so its non-vacuity is proved
// FOUR ways: a hand-written plant per import mechanism that the detector must catch; a
// STRIPPER CANARY on every policed file (both absence clauses would pass over a source
// the comment-stripper had eaten — TECH_DEBT 24(b), and the stripper is measurably
// defeatable by a block comment whose closing `*/` shares a line with a `//` URL); an
// assertion that the forbidden edge is the REVERSE of a live one; and a positive
// assertion that the resolution really does live in the command layer. Clause 5 — the
// largest assertion in this file — then proves the ring is not merely legal on paper: it
// imports each ring member in a FRESH PROCESS, because an in-process import is answered
// from a module cache another suite already warmed, and that warming is exactly what
// masked the module-scope-dereference defect this gate now catches.
//
// SCOPE, so the next reviewer does not over-read it: this gate reads DIRECT specifiers
// in the policed files. A one-hop re-export shim (`board-serve → some-shim → mesh-ui-serve`)
// is outside its edge by construction; clause 5's fresh-process load is what would catch
// the consequence of such a shim if it ever closed the ring at module-evaluation time.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSyncHardened } from "../../support/cli-spawn.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const BOARD_SERVE = path.join(repoRoot, "src", "board-serve.mjs");
const SETUP_UI = path.join(repoRoot, "src", "setup-ui.mjs");
const BOARD_UI = path.join(repoRoot, "src", "board-ui.mjs");
const MESH_UI_SERVE = path.join(repoRoot, "src", "mesh", "ui-serve.mjs");
const WORK_UI_COMMAND = path.join(repoRoot, "src", "commands", "work-ui.mjs");

// The BOARD-SERVER surface. ADR-004 names two modules by hand; `board-ui.mjs` is the
// THIRD and belongs here for two measured reasons. Structurally, the graph carries
// `setup-ui → board-ui → command-core`, so a `board-ui → mesh-ui-serve` edge closes the
// SAME ring the other two would. Behaviourally, it is the single most likely place the
// forbidden import gets added, because ADR-004's own text names `board-ui.mjs:52` as the
// fleet-origin route's home — a future reader following the ADR literally lands exactly
// there, wants the port, and reaches for the fleet server.
//
// Each entry carries a CANARY: a code marker that must survive comment-stripping. Both
// clauses over this list are ABSENCE assertions, so a stripper that ate a file would
// turn them green while asserting nothing — and the stripper below is measurably
// defeatable (a block comment whose closing `*/` sits on a line containing a `//` URL
// swallows everything after it). TECH_DEBT 24 recommendation (b).
const BOARD_SERVER_SURFACE = [
  ["board-serve.mjs", BOARD_SERVE, "export async function serveBoard"],
  ["setup-ui.mjs", SETUP_UI, "export async function serveSetupUi"],
  ["board-ui.mjs", BOARD_UI, "export async function handleWorkApi"],
];

// Discount `// …` and `/* … */` so a comment NAMING the forbidden module (all three
// files carry one, deliberately — the prohibition is explained where it binds) is not a
// match.
function stripComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

// Read a policed file and prove the stripper did not eat it before any absence claim is
// made over the result.
async function strippedSourceOf(label, file, canary) {
  const stripped = stripComments(await readFile(file, "utf8"));
  assert.ok(
    stripped.includes(canary),
    `${label}: the comment-stripper left real code behind (canary ${JSON.stringify(canary)} survives) — an absence assertion over an eaten source is vacuously green`
  );
  return stripped;
}

// Every module specifier this source reaches for, by any mechanism a cycle could hide
// behind: a static `import … from "x"`, a bare `import "x"`, a dynamic `import("x")`,
// an `export … from "x"`, and CommonJS `require("x")` (reachable in ESM through
// `createRequire`). All three quote forms including BACKTICKS — a template literal with
// no substitution is a perfectly ordinary dynamic-import specifier and was invisible to
// an earlier draft of this detector. Comment-stripped first.
const QUOTED = "[\"'`]([^\"'`]+)[\"'`]";

function specifiersOf(source) {
  const text = stripComments(source);
  const out = [];
  for (const pattern of [
    `(?:import|export)\\s[^;]*?\\sfrom\\s*${QUOTED}`,
    `import\\s*${QUOTED}`,
    `import\\s*\\(\\s*${QUOTED}\\s*\\)`,
    `require\\s*\\(\\s*${QUOTED}\\s*\\)`,
  ]) {
    for (const match of text.matchAll(new RegExp(pattern, "g"))) out.push(match[1]);
  }
  return out;
}

// A specifier NAMES the fleet server if its path ends at that module — with or without a
// cache-busting query or a fragment, which resolve to the same module and would
// otherwise walk straight past an `$`-anchored test.
function namesModule(specifier, basename) {
  return new RegExp(`(^|/)${basename.replace(/\./g, "\\.")}([?#].*)?$`).test(specifier);
}

function namesMeshUiServe(specifier) {
  return namesModule(specifier, "mesh/ui-serve.mjs");
}

export const archTests = [
  {
    name: "arch/46 ADR-004: no module in the board-server surface (board-serve, setup-ui, board-ui) imports mesh-ui-serve.mjs — the reverse edge would close a cycle",
    run: async () => {
      for (const [label, file, canary] of BOARD_SERVER_SURFACE) {
        const stripped = await strippedSourceOf(label, file, canary);
        const specifiers = specifiersOf(stripped);
        assert.deepEqual(
          specifiers.filter(namesMeshUiServe),
          [],
          `${label} reaches for nothing named mesh-ui-serve.mjs — the fleet server is the board server's LAUNCHER, never its dependency (got: ${JSON.stringify(specifiers)})`
        );
      }
    },
  },
  {
    // NON-VACUITY, half one: the detector is shown to fire on a hand-written plant of
    // each mechanism, and each plant is asserted to have LANDED (it names the module)
    // before the detector's verdict is asserted. Never a string-replace on a real file.
    name: "arch/46 ADR-004 (non-vacuity): the detector catches every import mechanism a cycle could hide behind",
    run: async () => {
      const plants = [
        ["a static named import", 'import { DEFAULT_MESH_UI_PORT } from "./mesh/ui-serve.mjs";'],
        ["a bare side-effect import", 'import "./mesh/ui-serve.mjs";'],
        ["a dynamic import", 'const { DEFAULT_MESH_UI_PORT } = await import("./mesh/ui-serve.mjs");'],
        ["a re-export", 'export { DEFAULT_MESH_UI_PORT } from "./mesh/ui-serve.mjs";'],
        ["a createRequire hatch", 'const fleet = require("./mesh/ui-serve.mjs");'],
        // The three spellings an `["']`-only quote class and a `$`-anchored path test
        // walked straight past. Each is a real, working import in Node.
        ["a backtick dynamic import", "const fleet = await import(`./mesh/ui-serve.mjs`);"],
        ["a backtick require", "const fleet = require(`./mesh/ui-serve.mjs`);"],
        ["a cache-busting query", 'const fleet = await import("./mesh/ui-serve.mjs?v=2");'],
      ];
      for (const [label, plant] of plants) {
        assert.ok(plant.includes("mesh/ui-serve.mjs"), `${label}: the plant names the forbidden module (it landed)`);
        assert.ok(
          specifiersOf(plant).some(namesMeshUiServe),
          `${label}: the detector sees it`
        );
      }
      // And the CLEAN baseline is not a false positive: a comment naming the module,
      // which all three production files legitimately carry, must not trip it.
      const comment = '// board-serve.mjs must never import ./mesh/ui-serve.mjs — ADR-004.\nimport path from "node:path";';
      assert.deepEqual(specifiersOf(comment).filter(namesMeshUiServe), [], "a comment naming the module is not an import");

      // THE CANARY'S OWN NON-VACUITY. The stripper is defeatable — measured, not feared:
      // a block comment whose closing `*/` shares a line with a `//` URL loses that `*/`
      // to the line-comment pass, so the block runs on until some LATER `*/` and eats
      // everything between. Both absence clauses would then be green over an empty
      // string. The canary catches it because the marker is swallowed by the same bite.
      const defeated = [
        "/* note",
        "// see https://x/y */",
        'import { X } from "./mesh/ui-serve.mjs";',
        "export async function serveBoard() {}",
        "/* later */",
      ].join("\n");
      const eaten = stripComments(defeated);
      assert.ok(!eaten.includes("mesh-ui-serve"), "the stripper IS defeatable — the forbidden import vanishes from the stripped source");
      assert.ok(
        !eaten.includes("export async function serveBoard"),
        "…and it takes the canary with it, which is exactly what makes the canary a guard rather than decoration"
      );
    },
  },
  {
    // NON-VACUITY, half two: the edge really does exist in the OTHER direction, which
    // is what makes the reverse import a CYCLE rather than a tidy-looking shortcut. If
    // this ever goes red the prohibition has lost its reason and this file should be
    // re-argued, not silently relaxed.
    name: "arch/46 ADR-004 (non-vacuity): mesh-ui-serve.mjs DOES import board-serve.mjs — the forbidden edge is the reverse of a live one",
    run: async () => {
      const specifiers = specifiersOf(await readFile(MESH_UI_SERVE, "utf8"));
      assert.ok(
        specifiers.some((specifier) => namesModule(specifier, "board-serve.mjs")),
        "mesh-ui-serve.mjs imports board-serve.mjs (the fleet launches the per-workspace board)"
      );
    },
  },
  {
    // The POSITIVE half. A deny-list alone is satisfied by nobody resolving the origin
    // at all — which would be the same operator-visible failure (a terminal surface with
    // nothing to build a URL from) reached by a different route. ADR-004 names the home:
    // the command layer.
    name: "arch/46 ADR-004 (positive): the standalone fleet origin IS resolved in the command layer, from DEFAULT_MESH_UI_PORT's one home",
    run: async () => {
      const source = stripComments(await readFile(WORK_UI_COMMAND, "utf8"));
      assert.ok(
        /import\s*\{[^}]*\bDEFAULT_MESH_UI_PORT\b[^}]*\}\s*from\s*["']\.\.\/mesh\/ui-serve\.mjs["']/.test(source),
        "src/commands/work-ui.mjs imports DEFAULT_MESH_UI_PORT from ../mesh/ui-serve.mjs — the layer allowed to know both faces"
      );
      assert.ok(
        /\bserveBoard\s*\(\s*\{[^}]*\bfleetOrigin\b/.test(source),
        "…and hands it to serveBoard as the same additive option the fleet launcher passes"
      );
    },
  },
  {
    // THE LOAD-ORDER GUARD, and it exists because this exact defect shipped and was
    // MASKED for a whole build. ADR-004 sanctions the command layer knowing both faces,
    // which puts `src/commands/work-ui.mjs` on a real import ring:
    //   mesh-ui-serve → board-serve → setup-ui → board-ui → command-core → work-ui →
    //   mesh-ui-serve
    // A ring is legal in ESM; DEREFERENCING ACROSS IT DURING MODULE EVALUATION is not.
    // Reading `DEFAULT_MESH_UI_PORT` at module scope in work-ui.mjs threw
    // `Cannot access 'DEFAULT_MESH_UI_PORT' before initialization` for anyone who
    // ENTERED the graph at `mesh-ui-serve.mjs` — while `import("./src/cli.mjs")` stayed
    // green, because the CLI's load order happens to evaluate the constant first. Every
    // assembled suite entered through the green door, so 121 tests passed over a server
    // module that could not be imported on its own.
    //
    // The only honest detector is therefore a FRESH PROCESS per module: an in-process
    // import would be answered from a module cache another suite already warmed, which
    // is the masking itself. `spawnSyncHardened` is the house spawn (it retries a
    // Windows never-ran CreateProcess, never a real exit).
    //
    // THE LIST IS THE MODULES A FRESH ENTRY IS A REAL SCENARIO FOR — the two servers,
    // the two faces they mount, the registry and the CLI entry. `src/commands/*.mjs` is
    // DELIBERATELY EXCLUDED and the exclusion is measured, not assumed: at HEAD, before
    // this milestone, `import("./src/commands/mesh-ui.mjs")` and
    // `import("./src/commands/work-ui.mjs")` BOTH already threw
    // `Cannot access '<theirOwnCommand>' before initialization` — a registered command
    // that imports a server re-enters `command-core`, which reads that command's own
    // export at module scope. That is a pre-existing property of the registry ring, is
    // nobody's regression, and pinning it here would arrive red for a reason this ADR
    // has no claim over. It is filed as a finding rather than smuggled in as a row.
    name: "arch/46 ADR-004: every server/face module on the import ring loads cleanly as its OWN entry point — a legal cycle, never a module-scope dereference across it",
    run: async () => {
      const entryPoints = [
        "src/mesh/ui-serve.mjs",
        "src/board-serve.mjs",
        "src/setup-ui.mjs",
        "src/board-ui.mjs",
        "src/command-core.mjs",
        "src/cli.mjs",
      ];
      for (const entry of entryPoints) {
        const result = spawnSyncHardened(
          process.execPath,
          ["-e", `import(${JSON.stringify("./" + entry)}).then(() => process.exit(0), (error) => { console.error(error && error.message); process.exit(1); })`],
          { cwd: repoRoot, encoding: "utf8", timeout: 60000 }
        );
        assert.equal(
          result.status,
          0,
          `${entry} imports cleanly in a FRESH process (got exit ${result.status}: ${String(result.stderr ?? "").trim()})`
        );
      }
    },
  },
  {
    // THE OTHER WAY TO DODGE THE IMPORT, and the one TECH_DEBT 25 warns about: re-type
    // the number. `DEFAULT_MESH_UI_PORT` already has four neighbours in a port map with
    // four homes; ADR-004 refuses to add a fifth, and a bare `4181` inside the board
    // server surface would be exactly that — invisible to the import gate above.
    name: "arch/46 ADR-004: the board server surface names no fleet port literal — the number is not re-typed to avoid the import",
    run: async () => {
      for (const [label, file, canary] of BOARD_SERVER_SURFACE) {
        const source = await strippedSourceOf(label, file, canary);
        assert.ok(
          !/\b4181\b/.test(source),
          `${label} contains no 4181 literal — the fleet's port has ONE home and the board server is not a fifth`
        );
      }
    },
  },
];
