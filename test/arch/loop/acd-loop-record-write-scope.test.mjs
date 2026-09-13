// FF-7810 (78/ADR-001, ADR-009, m52/FF-5201) — THE WRITE SCOPE, AND THE NAME THE GATE FORCES.
//
// Three claims, and they are one claim seen from three sides: this milestone adds a WRITER to a
// domain whose defining law is that it does not write, and it must be provably outside that law
// without weakening it.
//
//   1. WRITE SCOPE (ADR-001) — the writer creates or modifies exactly one file, `EXECUTION.md`, in
//      the ITEM'S OWN folder. No file under the loop registry directory (52/FF-5201 forbids it
//      outright, and since 53/07 the registry ships in the bundle, so a generated file there would
//      be overwritten by the next `aof work update`), no file under any OTHER work item, and nothing
//      at all outside that one folder.
//
//   2. THE NAME IS FORCED (ADR-009) — 52/FF-5201 DISCOVERS loop modules from disk by two patterns
//      (`src/work-loops*.mjs`, `src/commands/loops-*.mjs`), asserts the discovered set equals its
//      expected six, and holds every discovered module free of write call forms; its own comment
//      names "a future writer `src/commands/loops-init.mjs`" as the case it exists to catch. So this
//      milestone's modules take the EXECUTION family's name, FF-5201's expected list is UNCHANGED,
//      and its sweep is neither widened nor weakened. Asserted here INDEPENDENTLY of FF-5201 itself:
//      a gate that only re-ran the other gate would prove nothing about this milestone.
//
//   3. ONE WRITE DOOR — the filesystem is reached through the shared atomic `writeText` and nowhere
//      else. A second spelling of a write in a module that carries a human signature is a second
//      atomicity story, and the failure mode is a half-written record with the signature gone.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadWorkspace } from "../../../src/command-core.mjs";
import { EXECUTION_RECORD_BASENAME, loopRecordCommand } from "../../../src/commands/loop-record.mjs";
import { loopsGraphCommand } from "../../../src/commands/loops-graph.mjs";
import { loopsShowCommand } from "../../../src/commands/loops-show.mjs";
import { loopsValidateCommand } from "../../../src/commands/loops-validate.mjs";
import { createLoopsGroundednessCommand } from "../../../src/commands/loops-groundedness.mjs";
import { snapshot } from "../../support/loop-document-fixture.mjs";
import { stripComments } from "../../support/source-slice.mjs";
import { ITEM_REF, ctxFor, withRepo } from "../../loop/loop-record-command.test.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// The modules milestone 78 adds. Named here so claim 2 is about THIS MILESTONE's files rather than
// about whatever happens to be on disk.
const ADDED_MODULES = ["src/loop-record.mjs", "src/loop-record-render.mjs", "src/commands/loop-record.mjs"];

// FF-5201's two discovery patterns and its expected set, restated here ON PURPOSE. Reading them out
// of that gate's source would make this gate green whenever that one was edited, which is the
// opposite of an independent assertion.
// 119/01 — the first pattern was `^src/work-loops.*\.mjs$` and the family now lives in
// `src/work/`. Restated here on purpose, as the comment above says, so the re-point is an
// independent edit rather than one this gate inherits from the gate it is checking.
const REGISTRY_FAMILY_PATTERNS = [/^src\/work\/loops.*\.mjs$/, /^src\/commands\/loops-.*\.mjs$/];
const FF_5201_EXPECTED = [
  "src/work/loops.mjs", "src/work/loops-checks.mjs", "src/commands/loops-show.mjs",
  "src/commands/loops-graph.mjs", "src/commands/loops-groundedness.mjs", "src/commands/loops-validate.mjs",
];

const WRITE_CALL_FORM = /\b(?:writeFile|appendFile|mkdir|rm|rename)\s*\(|\bopen\s*\([^,\n]+,\s*["']w/;

async function discoverRegistryFamily() {
  const found = [];
  for (const name of await readdir(path.join(repoRoot, "src/work"))) {
    if (REGISTRY_FAMILY_PATTERNS[0].test(`src/work/${name}`)) found.push(`src/work/${name}`);
  }
  for (const name of await readdir(path.join(repoRoot, "src/commands"))) {
    if (REGISTRY_FAMILY_PATTERNS[1].test(`src/commands/${name}`)) found.push(`src/commands/${name}`);
  }
  return found.sort();
}

const write = async (repo) => await loopRecordCommand.run({ ref: ITEM_REF, write: true }, await ctxFor(repo));

export const archTests = [
  {
    name: "arch/78/02 FF-7810 the writer creates or modifies exactly one file, in the item's own folder",
    run: async () => {
      await withRepo({}, async (repo) => {
        const before = await snapshot(repo.root);
        await write(repo);
        const after = await snapshot(repo.root);

        const moved = Object.keys(after).filter((key) => after[key] !== before[key]).sort();
        const removed = Object.keys(before).filter((key) => !(key in after));
        assert.deepEqual(moved, [`wiki/work/03_milestone_board/${EXECUTION_RECORD_BASENAME}`], "exactly one file is created or modified");
        assert.deepEqual(removed, [], "and none is removed");
        assert.ok(!moved.some((key) => key.startsWith(".aof/")), "no file under .aof/ — the loop registry included — is written");
        assert.ok(!moved.some((key) => key === "wiki/work/ROADMAP.md"), "and nothing at the work-directory root");

        // A SECOND run, over a tree that now HAS the record — where an append bug or a stray backup
        // beside the atomic rename would show itself.
        const settled = await snapshot(repo.root);
        await write(repo);
        assert.deepEqual(await snapshot(repo.root), settled, "and a regeneration over unchanged inputs moves nothing at all");
      });
    },
  },
  {
    name: "arch/78/02 FF-7810 the record's home is derived from the item, and no caller can redirect it",
    run: async () => {
      // ONE HOME (ADR-001), and `additionalProperties: false` is what makes that a refusal rather
      // than a convention: there is no `--out`, no path input, and a schema that admits neither.
      assert.deepEqual(Object.keys(loopRecordCommand.input.properties).sort(), ["ref", "write"]);
      assert.equal(loopRecordCommand.input.additionalProperties, false);
      const source = stripComments(await readFile(path.join(repoRoot, "src/commands/loop-record.mjs"), "utf8"));
      assert.match(source, /path\.join\(item\.dir, EXECUTION_RECORD_BASENAME\)/, "the target is derived from the item's own folder");
      assert.equal((source.match(/writeText\(/g) ?? []).length, 1, "and there is exactly one write, to exactly that target");

      // …and it follows the CONFIGURED work directory, measured rather than assumed.
      await withRepo({ workDir: "./docs/stream" }, async (repo) => {
        const result = await write(repo);
        assert.equal(result.path, path.join(repo.root, "docs", "stream", "03_milestone_board", EXECUTION_RECORD_BASENAME));
        assert.equal(await readFile(result.path, "utf8"), result.text, "the record lands under THAT directory");
      });
    },
  },
  {
    name: "arch/78/02 FF-7810 no module this milestone adds matches FF-5201's discovery patterns, and its expected list is unchanged",
    run: async () => {
      for (const rel of ADDED_MODULES) {
        for (const pattern of REGISTRY_FAMILY_PATTERNS) {
          assert.doesNotMatch(rel, pattern, `${rel} sits outside the registry family's discovery patterns`);
        }
        assert.ok(!FF_5201_EXPECTED.includes(rel), `${rel} is not a member of FF-5201's expected module list`);
      }
      assert.deepEqual(
        await discoverRegistryFamily(),
        [...FF_5201_EXPECTED].sort(),
        "the registry family on disk is still exactly FF-5201's six — this milestone neither joined it nor grew it",
      );

      // AND FF-5201'S OWN EXPECTED LIST IS UNCHANGED — the clause task 02 states in as many words.
      // Read out of that gate's source and compared to the copy restated above, so the two claims
      // are independent: if this milestone had widened FF-5201's list to admit a writer, the
      // discovery assertion above would still pass and only this one would red.
      const gate = stripComments(await readFile(path.join(repoRoot, "test/arch/loop/acd-loop-registry-not-an-item-type.test.mjs"), "utf8"));
      const at = gate.indexOf("expectedLoopModules");
      assert.ok(at > 0, "FF-5201 declares its expected module list");
      const open = gate.indexOf("[", at);
      const close = gate.indexOf("]", open);
      const declared = gate.slice(open + 1, close).split(",").map((entry) => entry.trim().replace(/^["']|["']$/gu, "")).filter(Boolean);
      assert.deepEqual([...declared].sort(), [...FF_5201_EXPECTED].sort(), "FF-5201's expected module list is unchanged by this milestone");
    },
  },
  {
    name: "arch/78/02 FF-7810 FF-5201's read-only sweep over the registry family is neither widened nor weakened",
    run: async () => {
      // Every discovered member is STILL free of a write call form — measured here rather than
      // assumed, because the whole risk this milestone carries is that a writer ends up inside the
      // family the sweep covers.
      for (const rel of await discoverRegistryFamily()) {
        const source = stripComments(await readFile(path.join(repoRoot, rel), "utf8"));
        assert.doesNotMatch(source, WRITE_CALL_FORM, `${rel}: no write call form`);
      }
      // And the frozen renderer in particular: no write form and no output-path input. An `--out` on
      // `work:loops-graph` would have been red twice over — once for writing, once for changing the
      // shape of a frozen command — which is exactly why this record is a separate module.
      assert.deepEqual(Object.keys(loopsGraphCommand.input.properties), ["format"], "the frozen renderer declares no output-path input");
      assert.equal(loopsGraphCommand.input.additionalProperties, false);
    },
  },
  {
    name: "arch/78/02 FF-7810 the four registry commands and this writer all leave a fixture registry byte-identical",
    run: async () => {
      await withRepo({}, async (repo) => {
        const workspace = await loadWorkspace(repo.root);
        const registry = path.join(repo.aofDir, "loops");
        const before = await snapshot(registry);
        assert.ok(Object.keys(before).length > 0, "the fixture registry is non-vacuous");

        for (const command of [loopsShowCommand, loopsGraphCommand, loopsValidateCommand, createLoopsGroundednessCommand()]) {
          await command.run({}, { workspace });
        }
        await loopRecordCommand.run({ ref: ITEM_REF, write: true }, { workspace });
        assert.deepEqual(await snapshot(registry), before, "every file in the registry directory is byte-identical to before");
      });
    },
  },
  {
    name: "arch/78/02 FF-7810 the filesystem is reached through the ONE shared atomic writer",
    run: async () => {
      const source = stripComments(await readFile(path.join(repoRoot, "src/commands/loop-record.mjs"), "utf8"));
      assert.match(source, /import\s*\{\s*writeText\s*\}\s*from\s*["']\.\.\/fs\.mjs["']/, "the command writes through the shared atomic writer");
      // `writeText` is temp + rename with the temp reclaimed on the failure path (m42/F26), so a
      // write that cannot complete leaves the previous record — signature and all — intact. A second
      // spelling here would be a second atomicity story with a worse failure mode.
      assert.doesNotMatch(source, /\b(?:writeFile|appendFile|rm|rename|mkdir)\s*\(/, "and reaches no other write form of its own");

      // The two pure leaves stay pure — belt and braces beside FF-7801/FF-7802, and the reason the
      // naming above is not a way to hold a writer somewhere no sweep can see it.
      for (const rel of ["src/loop-record.mjs", "src/loop-record-render.mjs"]) {
        assert.doesNotMatch(stripComments(await readFile(path.join(repoRoot, rel), "utf8")), WRITE_CALL_FORM, `${rel}: no write call form`);
      }
    },
  },
];
