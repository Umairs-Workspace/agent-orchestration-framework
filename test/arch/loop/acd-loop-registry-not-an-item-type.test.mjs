import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadLoops } from "../../../src/work/loops.mjs";
import { loopsShowCommand } from "../../../src/commands/loops-show.mjs";
import { loopsGraphCommand } from "../../../src/commands/loops-graph.mjs";
import { createLoopsGroundednessCommand } from "../../../src/commands/loops-groundedness.mjs";
import { loopsValidateCommand } from "../../../src/commands/loops-validate.mjs";
import { matchedBraceBody, stripComments } from "../../support/source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const six = ["milestone", "story", "task", "uat", "spike", "chore"];
const expectedLoopModules = [
  "src/work/loops.mjs", "src/work/loops-checks.mjs", "src/commands/loops-show.mjs",
  "src/commands/loops-graph.mjs", "src/commands/loops-groundedness.mjs", "src/commands/loops-validate.mjs",
];

// DISCOVERED FROM DISK, then compared with the expected five — never iterated as a literal.
// A hardcoded list asserted against itself (`assert.equal(list.length, 5)`) cannot fail, and it
// leaves a SIXTH loop module — a future `src/work-loops-anchors.mjs`, or a writer
// `src/commands/loops-init.mjs` — scanned by neither this gate nor FF-5202's import-seam leg.
// The equality is what makes a new module a RED here (add it to the list, deliberately) instead
// of a silent hole in the read-only sweep below.
async function discoverLoopModules() {
  const found = [];
  // 119/01 — the family moved to `src/work/`, so the sweep walks its new home and matches the
  // leaf as it now reads. It was `src/` + /^work-loops.*\.mjs$/, which after the move swept a
  // directory the family had left and would have gone empty; the `deepEqual` against the
  // expected set below is what turned that into a RED rather than a silent pass (ADR-003 §4).
  for (const name of await readdir(path.join(root, "src/work"))) {
    if (/^loops.*\.mjs$/.test(name)) found.push(`src/work/${name}`);
  }
  for (const name of await readdir(path.join(root, "src/commands"))) {
    if (/^loops-.*\.mjs$/.test(name)) found.push(`src/commands/${name}`);
  }
  return found.sort();
}

function itemTypes(source, label) {
  const match = stripComments(source).match(/ITEM_RE\s*=\s*\/\^\(\\d\+\)_\(([^)]+)\)/);
  assert.ok(match, `${label}: ITEM_RE alternation was found`);
  return match[1].split("|");
}

async function snapshot(dir) {
  const names = (await readdir(dir)).sort();
  return { names, bytes: Object.fromEntries(await Promise.all(names.map(async (name) => [name, (await readFile(path.join(dir, name))).toString("hex")]))) };
}

export const archTests = [
  {
    name: "arch/52 FF-5201: loop records are not work items and loop modules expose no writer call form",
    run: async () => {
      // ONE home (milestone 127/01, 127/ADR-001 §5). This list used to name three files — the
      // enumerator plus the two private copies `src/work/doctor.mjs` and
      // `src/commands/migrate-folder.mjs` carried — and so enshrined the very duplication the
      // vocabulary had to be edited three times for. Both copies now import `ITEM_RE` from
      // `src/work.mjs` (FF-12701 holds that a second definition cannot return), so the closed
      // six-type vocabulary is read where it is defined and nowhere else.
      for (const rel of ["src/work.mjs"]) {
        assert.deepEqual(itemTypes(await readFile(path.join(root, rel), "utf8"), rel), six, `${rel}: closed six-type item vocabulary`);
      }
      // The union is matched INSIDE the `WorkItem` declaration, cut on the language's own braces
      // (the one home, `test/support/source-slice.mjs`). A whole-file `match` takes the FIRST
      // `type: "…"|"…";` union in the file, so any earlier string-union property — on a wrapper,
      // an envelope, a future `type: "run" | "session"` — silently re-aims this gate at a
      // different declaration while it keeps reporting on the item vocabulary.
      const board = stripComments(await readFile(path.join(root, "ui/src/board/api.ts"), "utf8"));
      const declaredAt = board.indexOf("export type WorkItem = {");
      assert.ok(declaredAt >= 0, "ui/src/board/api.ts: `export type WorkItem = {` NOT FOUND — the cut could not be made, so nothing below was measured");
      const workItem = matchedBraceBody(board, declaredAt);
      assert.ok(workItem, "ui/src/board/api.ts: the WorkItem body did not close — the cut could not be made");
      const union = workItem.match(/\btype:\s*((?:"[^"]+"\s*\|\s*)*"[^"]+")\s*;/);
      assert.ok(union, "board WorkItem type union was found inside the WorkItem declaration itself");
      assert.deepEqual([...union[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]), six);

      const loopModules = await discoverLoopModules();
      assert.deepEqual(loopModules, [...expectedLoopModules].sort(), "the loop modules on disk are exactly those this gate scans — a new one is a RED here, not a hole");
      for (const rel of loopModules) {
        const source = stripComments(await readFile(path.join(root, rel), "utf8"));
        assert.doesNotMatch(source, /\b(?:writeFile|appendFile|mkdir|rm|rename)\s*\(|\bopen\s*\([^,\n]+,\s*["']w/, `${rel}: no write call form`);
      }
    },
  },
  {
    name: "arch/52 FF-5201: loader and every loop command leave a fixture registry byte-identical",
    run: async () => {
      const temp = await mkdtemp(path.join(os.tmpdir(), "aof-loop-read-only-"));
      try {
        const workDir = path.join(temp, "work");
        const dir = path.join(workDir, "loops");
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, "operator.md"), "---\nid: actor:operator\nkind: actor\ntitle: Operator\nground: exogenous\n---\n# Operator\n");
        const before = await snapshot(dir);
        const workspace = { workDir, aofDir: workDir };
        await loadLoops(workDir);
        await loopsShowCommand.run({}, { workspace });
        await loopsGraphCommand.run({}, { workspace });
        await loopsValidateCommand.run({}, { workspace });
        await createLoopsGroundednessCommand().run({}, { workspace });
        assert.deepEqual(await snapshot(dir), before);
      } finally {
        await rm(temp, { recursive: true, force: true });
      }
    },
  },
];
