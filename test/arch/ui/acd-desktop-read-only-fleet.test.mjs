// Fitness function: acd-desktop-read-only-fleet (milestone 36 / ADR-004, fitness #3) —
// "The desktop app is strictly READ-ONLY over the fleet. It NEVER invokes a mesh
//  mutation — no `aof mesh assign`, no `aof mesh issue`, no `aof mesh revoke`, no
//  `aof mesh invite`/`join`. The only writes it performs are LOCAL process supervision
//  (spawning `aof mesh serve`/`aof mesh ui` on THIS machine). Assignment stays CLI-only
//  (`aof mesh assign`, milestone 35), never dispatched from this surface."
//
// GUARD-IF-PRESENT (refine, pre-build): a clean no-op while `app/desktop/` is absent;
// a hard assertion the moment the crate lands. Green now, RED-if-violated once built.
//
// Proof, over every `app/desktop/**/*.rs` (Rust comments stripped): NO mesh-MUTATING
// verb is ever spawned. The allow-list of spawnable `aof mesh` verbs is EXACTLY
// {status (read), serve (supervise), ui (supervise)}. A spawn of assign/issue/revoke/
// invite/join is a read-only violation.
//   Self-check (m03 non-vacuous): a planted `["mesh","assign", ...]` argv trips the
//   SAME detector; the allowed status/serve/ui spawns do NOT.
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { matchedBraceBody } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const DESKTOP_DIR = path.join(repoRoot, "app", "desktop");

// The fleet-MUTATING mesh verbs the read-only app must NEVER spawn — argv-array form
// (`["mesh","assign"`) and joined-string form (`mesh assign`).
const FORBIDDEN_MUTATION_VERBS = ["assign", "issue", "revoke", "invite", "join"];

function stripRustComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function detectMutation(source) {
  const stripped = stripRustComments(source);
  const hits = [];
  for (const verb of FORBIDDEN_MUTATION_VERBS) {
    const argvForm = new RegExp(`["']mesh["']\\s*,\\s*["']${verb}["']`);
    const strForm = new RegExp(`\\bmesh\\s+${verb}\\b`);
    if (argvForm.test(stripped) || strForm.test(stripped)) hits.push(`mesh ${verb}`);
  }
  return hits;
}

async function dirExists(dir) {
  try { return (await stat(dir)).isDirectory(); } catch { return false; }
}

async function collectRustFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "target") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await collectRustFiles(full)));
    else if (entry.isFile() && entry.name.endsWith(".rs")) out.push(full);
  }
  return out;
}

// ── milestone 126 / ADR-006 §8 — THE DENY-LIST BECOMES AN ALLOW-LIST, in this control's
// own file and never a sibling (FF-12606). 36/ADR-004 §3 always SAID the allow-list of
// spawnable verbs was `{status, serve, ui}`, but this control only ever implemented a
// deny-list of five mutation verbs — so a `["work","loop",…]` spawn passed by silence
// rather than by decision. That is not good enough for a spawn that drives agents and
// writes files, so the roster is named: `mesh status`, `mesh serve`, `mesh ui` and
// `work loop`, with `work loop` admitted HERE, in writing, as local process supervision
// on this machine.
//
// The deny-list legs above are UNTOUCHED — their claim is "this string never appears",
// which no fixture needs, and they keep sweeping both the argv-array and joined-string
// forms over the whole file.
//
// THE ROSTER LEG SWEEPS THE ARGV-ARRAY FORM ONLY, and depends on
// `acd-desktop-trusted-spawn` rather than restating it: that control forbids any
// shell-string spawn (`Command::new("cmd"|"sh"|"powershell") …`), so every spawn's verbs
// reach the source as a discrete argv literal. An allow-list over free text would red on
// the app's own UI copy — `"aof mesh desktop"` is a window tooltip and `"mesh
// unreachable"` a tray label, and neither is a spawn.
//
// IT SWEEPS PRODUCTION SOURCE, NOT `#[cfg(test)]` FIXTURES, for the same reason: the
// runtime gate's own tests plant a `["work","tune","62"]` ROW precisely to prove the
// parse DROPS it (126/03 task 00), and a fixture naming a verb is not the app spawning
// it. The strip is self-checking — each file is asserted to carry at most one
// `#[cfg(test)]` and to end with it.
const SPAWN_ROSTER = ["mesh status", "mesh serve", "mesh ui", "work loop"];

// An argv literal's first two elements, tolerating the `"mesh".to_string(), "serve"`
// form the owned `SupervisedChild` requires.
const ARGV_PAIR = /["'](mesh|work)["'](?:\.to_string\(\))?\s*,\s*["']([\w-]+)["']/g;

function productionSource(source) {
  const stripped = stripRustComments(source);
  const i = stripped.indexOf("#[cfg(test)]");
  return i < 0 ? stripped : stripped.slice(0, i);
}

function spawnedVerbPairs(source) {
  const pairs = new Set();
  const production = productionSource(source);
  for (const match of production.matchAll(ARGV_PAIR)) pairs.add(`${match[1]} ${match[2]}`);
  return [...pairs];
}

export const rosterTests = [
  {
    name: "arch/126 ADR-006 §8 (acd-desktop-read-only-fleet, EXTENDED): the spawnable-verb roster is an ALLOW-LIST of exactly four — mesh status, mesh serve, mesh ui, work loop — and nothing else",
    run: async () => {
      if (!(await dirExists(DESKTOP_DIR))) {
        assert.equal(await dirExists(DESKTOP_DIR), false, "app/desktop/ absent (pre-build)");
        return;
      }
      const files = await collectRustFiles(DESKTOP_DIR);
      assert.ok(files.length > 0, "the Rust subtree exists and was scanned (non-vacuous)");

      const offenders = [];
      const observed = new Set();
      for (const file of files) {
        const source = await readFile(file, "utf8");
        // The `#[cfg(test)]` strip is only sound while the test module is the file's
        // last item — asserted rather than assumed.
        const stripped = stripRustComments(source);
        const first = stripped.indexOf("#[cfg(test)]");
        if (first >= 0) {
          const where = path.relative(repoRoot, file);
          assert.equal(
            stripped.indexOf("#[cfg(test)]", first + 1),
            -1,
            `${where} carries one #[cfg(test)] item, so stripping from it drops only tests`
          );
          assert.match(
            stripped,
            /#\[cfg\(test\)\]\s*mod tests \{/,
            `${where}'s #[cfg(test)] item opens a test module`
          );
          // …and that module is the file's LAST item, so the strip drops tests and nothing
          // else. Cut by MATCHED BRACE through the one home (47/F-47-04-ARCH-2), never by a
          // fixed character window: a window measures the length of the region rather than
          // the region, and this repo has six instruments that were wrong about a tree for
          // exactly that reason.
          const body = matchedBraceBody(stripped, first);
          assert.notEqual(body, null, `${where}'s test module closes — the region to strip was found`);
          assert.equal(
            stripped.slice(stripped.indexOf(body) + body.length).trim(),
            "}",
            `${where}'s test module is its trailing item, so stripping from #[cfg(test)] drops no production code`
          );
        }
        for (const pair of spawnedVerbPairs(source)) {
          observed.add(pair);
          if (!SPAWN_ROSTER.includes(pair)) offenders.push({ file: path.relative(repoRoot, file), pair });
        }
      }

      assert.deepEqual(offenders, [], `every spawned verb is on the roster, got: ${JSON.stringify(offenders)}`);
      // Non-vacuous in BOTH directions: all four admitted verbs are actually present in
      // the tree, so the roster is a description of what is spawned and not an
      // aspiration that would pass over an empty sweep.
      assert.deepEqual(
        [...observed].sort(),
        [...SPAWN_ROSTER].sort(),
        "the roster admits exactly `mesh status`, `mesh serve`, `mesh ui` and `work loop` — all four observed, none surplus"
      );
    },
  },
  {
    name: "arch/126 ADR-006 §8 (acd-desktop-read-only-fleet, EXTENDED): self-check — a planted `[\"work\",\"tune\"]` spawn trips the roster; the four admitted verbs do NOT; the five mutation verbs still trip the deny-list (non-vacuous)",
    run: async () => {
      const admitted = [
        'args(["mesh","status","--json"]);\n',
        'vec!["mesh".to_string(), "serve".to_string(), "--serve".to_string()]\n',
        'vec!["mesh".to_string(), "ui".to_string()]\n',
        'pub const DECLARATION_ARGV_PREFIX: [&str; 2] = ["work", "loop"];\n',
      ];
      for (const source of admitted) {
        assert.deepEqual(
          spawnedVerbPairs(source).filter((pair) => !SPAWN_ROSTER.includes(pair)),
          [],
          `an admitted spawn is clean: ${source.trim()}`
        );
      }

      // The planted violation the roster exists to catch — and which the DENY-list is
      // structurally blind to, since `tune` is not a mesh mutation verb.
      const planted = 'args(["work","tune","62"]);\n';
      assert.deepEqual(spawnedVerbPairs(planted), ["work tune"], "a planted `work tune` spawn is seen");
      assert.ok(
        spawnedVerbPairs(planted).some((pair) => !SPAWN_ROSTER.includes(pair)),
        "a planted `[\"work\",\"tune\"]` spawn trips the roster"
      );
      assert.deepEqual(detectMutation(planted), [], "and the deny-list alone would have passed it by silence — which is why the roster exists");

      // The five forbidden mutation verbs still trip the deny-list, unchanged.
      for (const verb of FORBIDDEN_MUTATION_VERBS) {
        assert.ok(
          detectMutation(`args(["mesh","${verb}","35/00"]);\n`).length > 0,
          `a planted \`mesh ${verb}\` spawn still trips the deny-list`
        );
      }

      // A `#[cfg(test)]` fixture naming an unadmitted verb is NOT a spawn.
      const fixture = 'pub fn f() {}\n#[cfg(test)]\nmod tests {\n  const ROW: &str = "{\\"argv\\":[\\"work\\",\\"tune\\",\\"62\\"]}";\n}\n';
      assert.deepEqual(spawnedVerbPairs(fixture), [], "a dropped-row fixture inside the test module is not a spawn site");
    },
  },
];

export const archTests = [
  {
    name: "arch/36 ADR-004 (acd-desktop-read-only-fleet): the app NEVER spawns a mesh-mutating verb (assign/issue/revoke/invite/join) — read-only over the fleet (guard-if-present)",
    run: async () => {
      if (!(await dirExists(DESKTOP_DIR))) {
        assert.equal(await dirExists(DESKTOP_DIR), false, "app/desktop/ absent (pre-build); armed at build by story 00");
        return;
      }
      const files = await collectRustFiles(DESKTOP_DIR);
      assert.ok(files.length > 0, "the Rust subtree exists and was scanned (non-vacuous)");
      const offenders = [];
      for (const file of files) {
        const hits = detectMutation(await readFile(file, "utf8"));
        if (hits.length > 0) offenders.push({ file: path.relative(repoRoot, file), hits });
      }
      assert.deepEqual(offenders, [], `no mesh-mutating verb is spawned (read-only over the fleet), got: ${JSON.stringify(offenders)}`);
    },
  },
  {
    name: "arch/36 ADR-004 (acd-desktop-read-only-fleet): self-check — a planted `mesh assign`/`mesh issue` spawn trips the SAME detector; status/serve/ui do NOT (non-vacuous)",
    run: async () => {
      // The allowed spawns (read + local supervision) are clean.
      assert.deepEqual(detectMutation('args(["mesh","status","--json"]);\n'), [], "mesh status (read) is allowed");
      assert.deepEqual(detectMutation('args(["mesh","serve","--serve"]);\n'), [], "mesh serve (local supervision) is allowed");
      assert.deepEqual(detectMutation('args(["mesh","ui"]);\n'), [], "mesh ui (local supervision) is allowed");

      // The mutations are caught, both argv and string form.
      assert.ok(detectMutation('args(["mesh","assign","35/00","--to","worker-a"]);\n').length > 0, "a planted `mesh assign` spawn trips the detector");
      assert.ok(detectMutation('args(["mesh","issue","35/00"]);\n').length > 0, "a planted `mesh issue` spawn trips the detector");
      assert.ok(detectMutation('let cmd = format!("aof mesh revoke {}", node);\n').length > 0, "a planted string-form `mesh revoke` trips the detector");
    },
  },
];
