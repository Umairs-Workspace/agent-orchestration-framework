// Fitness function: acd-mesh-ui-single-data-command (milestone 25 / ADR-002/ADR-003)
// — the fleet web UI and the `aof mesh status` CLI mirror share ONE data command
// (`mesh:status`); there is NO second fleet-data path. This is the mesh-face mirror of
// the 08/ADR-004 inv.3 "the registry is the only door" discipline, applied to the
// fleet aggregate.
//
// The fleet aggregate = nodes (readNodeRecords) + presence/staleness + the group
// registry (readRegistry — the roster of registered boards, milestone 24) + per-board
// active runs. ADR-002 requires that ONE registered command (`mesh:status`, hosted in
// src/commands/mesh-identity.mjs) is the SOLE place the registry roster is joined to
// the node/presence reads, so the CLI mirror and the web face cannot diverge.
//
// TWO PHASES, both absence-tolerant so the whole test is GREEN on the current tree
// (before milestone 25's code lands) and TIGHTENS automatically as the code appears:
//
//   Phase 1 (always runs): among the registered mesh:* command modules
//   (src/commands/mesh-*.mjs), the ONLY module that reads the group registry
//   (`readRegistry`) alongside the node roster is the one that hosts `mesh:status`
//   (mesh-identity.mjs). A SECOND module co-reading readRegistry + readNodeRecords
//   would be a second fleet-data path. Vacuously true today: readRegistry is imported
//   nowhere yet (src/mesh/registry.mjs is authored by milestone 24; the boards
//   projection by milestone 25 story 02) — so the "at most one such module" bound
//   holds with zero such modules. It tightens to "exactly mesh-identity.mjs" once the
//   boards projection lands.
//
//   Phase 2 (guarded by existsSync of the fleet serve-face): when
//   src/mesh/ui-serve.mjs exists (milestone 25 story 03), assert its ONLY reach to
//   fleet data is queryGlobalMeshStatus(…) through ./command-core.mjs — it imports NO
//   mesh-store / mesh-presence / mesh-registry / commands/* module directly (a second
//   data path). Skipped (a pinned green) while the module is absent — the
//   absence-tolerant idiom (acd-mesh-command-cli-bijection's RED-until-commands
//   posture), NEVER a hard-fail on the not-yet-existing module.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { importSpecifiers } from "../../support/module-family.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const COMMANDS_DIR = path.join(repoRoot, "src", "commands");
const MESH_UI_SERVE = path.join(repoRoot, "src", "mesh", "ui-serve.mjs");

// The mesh:status host, by MODULE rather than by spelling: `mesh-identity.mjs` while the directory
// was flat, `mesh/identity.mjs` since 119/02 gave it an interior. One pattern, both spellings, so
// the assertion below moves with the subject set the walk derives instead of trailing it.
const MESH_STATUS_HOST = /^mesh[-/]identity\.mjs$/u;

function stripComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

// THE SUBJECT IS DERIVED FROM THE TREE, RECURSIVELY (119/ADR-003 §4). A non-recursive `readdir`
// filtered by the `mesh-` prefix is a claim that survives only while `src/commands/` stays flat:
// 119/02 gives it an interior, and the day `src/commands/mesh-*.mjs` becomes `src/commands/mesh/*`
// the old walk returned nothing and this control asserted 25/ADR-002 over the empty set forever.
// A mesh command module is one whose PATH names the mesh family — the flat `mesh-…​.mjs` spelling
// or the `mesh/` directory the interior gives it — so both spellings resolve to the same subject.
async function readMeshCommandModules(dir, prefix = "") {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) found.push(...(await readMeshCommandModules(path.join(dir, entry.name), rel)));
    else if (entry.name.endsWith(".mjs") && (rel.startsWith("mesh-") || rel.startsWith("mesh/"))) found.push(rel);
  }
  return found;
}

// A module "reads the fleet aggregate" when it both imports readRegistry (the group
// registry roster, m24) AND a node/presence roster read (readNodeRecords /
// readPresenceRecord) — i.e. it JOINS the two sources into a fleet view.
function readsFleetAggregate(source) {
  const clean = stripComments(source);
  const readsRegistry = /\breadRegistry\b/.test(clean);
  const readsRoster = /\breadNodeRecords\b/.test(clean) || /\breadPresenceRecord\b/.test(clean);
  return readsRegistry && readsRoster;
}

export const archTests = [
  {
    name: "arch/25 ADR-002: at most ONE mesh command module joins the group registry to the node roster (mesh:status is the sole fleet-data path)",
    run: async () => {
      // A MOVE REDS THIS CONTROL; IT NEVER EMPTIES IT (119/ADR-003 §4). The readdir used to sit in
      // a try/catch that substituted `[]`, and the filter used to be the only thing selecting the
      // subject — so once `src/commands/mesh-*.mjs` moves into `src/commands/mesh/`, `joiners` would
      // be `[]` and `joiners.length <= 1` would assert 25/ADR-002's "at most one fleet-data path"
      // over the empty set, permanently, with no message anywhere. That is the SILENT species, and
      // this file is the specimen 119/ADR-003 names. The walk is now recursive, so the interior
      // stories 119/02 gives `src/commands/` do not disarm it, and its own non-vacuity is asserted
      // before anything is asserted over the set.
      const files = (await readMeshCommandModules(COMMANDS_DIR)).sort();
      assert.ok(
        files.length > 0,
        `the mesh command modules were really read (non-vacuous): walked ${COMMANDS_DIR} and found no mesh command module. `
          + "A control whose subject set empties must FAIL naming the directory it walked, never pass over nothing.",
      );
      const joiners = [];
      for (const name of files) {
        const source = await readFile(path.join(COMMANDS_DIR, name), "utf8");
        if (readsFleetAggregate(source)) joiners.push(name);
      }
      // Absence-tolerant: readRegistry is imported nowhere yet, so joiners is [] today
      // (vacuously ≤ 1). Once milestone 25 story 02 lands the boards projection, the
      // sole joiner MUST be mesh-identity.mjs (the mesh:status host) — no second module.
      assert.ok(
        joiners.length <= 1,
        `at most ONE mesh command module joins readRegistry to the node roster — got {${joiners.join(", ")}} (a second is a second fleet-data path, 25/ADR-002)`
      );
      if (joiners.length === 1) {
        // THE SOLE JOINER IS NAMED BY ITS MODULE, NOT BY ONE OF ITS SPELLINGS. The walk above
        // already resolves both — the flat `mesh-identity.mjs` and the `mesh/identity.mjs` the
        // interior 119/02 gives this directory — so an equality against ONE of them would re-point
        // the subject set and leave the token that reads it behind. That is 119/01's round-2
        // Blocker, and repeating it here would red this control on a move it is meant to survive.
        assert.ok(
          MESH_STATUS_HOST.test(joiners[0]),
          `the sole fleet-data joiner is the mesh:status host module (mesh-identity.mjs, or mesh/identity.mjs after the interior) — got ${joiners[0]}. `
            + "The CLI mirror and the web face share this ONE command"
        );
      }
    },
  },
  {
    name: "arch/34 ADR-006: when the fleet serve-face exists, it reaches fleet data ONLY via global-mesh-query (no second data path)",
    run: async () => {
      if (!existsSync(MESH_UI_SERVE)) {
        // Absence-tolerant pinned green: the fleet serve-face is authored by story 03.
        // Do NOT hard-fail on the not-yet-existing module (suite hygiene) — assert the
        // deliberate skip so this is a conscious green, not an accidental one.
        assert.ok(true, "src/mesh/ui-serve.mjs not present yet (milestone 25 story 03 authors it) — phase-2 skipped");
        return;
      }
      const source = stripComments(await readFile(MESH_UI_SERVE, "utf8"));
      // The door IS present — the face reaches fleet data through the command registry.
      const specifiers = importSpecifiers(source).map((i) => i.specifier);
      assert.ok(
        specifiers.includes("../global-mesh-query.mjs"),
        "mesh-ui-serve.mjs imports the global query surface (./global-mesh-query.mjs) — the only door to fleet data"
      );
      // No OTHER fleet-data-bearing import: mesh-store / mesh-presence / mesh-registry /
      // mesh-sync / commands/* would each be a second data path bypassing mesh:status —
      // EXCEPT milestone 38 / story 04's ONE sanctioned WRITE-verb door (ADR-012):
      // ./commands/mesh-assign.mjs, the read-only face's first and only mutation
      // carve-out (POST /api/mesh/assign, wrapping assignWork verbatim — armed by the
      // dedicated acd-fleet-face-single-mutation-route fitness, not duplicated here).
      const secondPath = importSpecifiers(source).filter((i) => {
        const spec = i.specifier;
        if (!spec.startsWith(".")) return false;
        if (spec === "./global-mesh-query.mjs") return false; // the read door
        if (spec === "./commands/mesh/assign.mjs") return false; // the ONE sanctioned write door (38/ADR-012)
        return /\.\/mesh-(store|presence|registry|sync)\.mjs$/.test(spec) || /\.\/global-(work-store|node-registry)\.mjs$/.test(spec) || spec.startsWith("./commands/");
      });
      assert.deepEqual(
        secondPath.map((i) => i.specifier),
        [],
        "mesh-ui-serve.mjs imports no fleet-data module except ./global-mesh-query.mjs (and the one sanctioned ./commands/mesh/assign.mjs write door) — it never opens stores or imports another command body directly"
      );
      // Positive: it reaches the fleet data by invoking mesh:status (call-form grep,
      // comments already discounted) — the ONE registered command (ADR-002).
      assert.ok(
        /queryGlobalMeshStatus\s*\(/.test(source),
        "mesh-ui-serve.mjs reaches the fleet aggregate via invoke(\"mesh:status\", …) — the single data command"
      );
    },
  },
];
