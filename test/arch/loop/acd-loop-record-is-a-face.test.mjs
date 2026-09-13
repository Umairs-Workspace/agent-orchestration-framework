// FF-7805 (78/ADR-002) — THE RECORD IS A FACE, NEVER A SECOND TRUTH.
//
// `SPEC.md` binds this record to the milestone-08 spine: it is derived from a registered `work:*`
// command with a stable `--json` contract and is *"never a second source of truth"*. The failure
// this gate exists to catch is the ordinary one for a committed generated document: something starts
// reading it back. The moment any code path recovers an execution fact from `EXECUTION.md`, the
// document IS a store — it can be stale, it can be edited, and the run records stop being the
// authority.
//
// THE ONE READ THAT IS SANCTIONED, and it is the exception that proves the rule: the writer reads the
// document's SIGN-OFF block. That is the one part of the file no input can re-derive (ADR-002), so it
// is the one part that must come back off disk. Nothing else may.
//
// Asserted three ways, because each catches a different way of getting this wrong:
//   1. STRUCTURALLY — the basename appears in `src/` in exactly one module, and in that module the
//      only thing parsed out of the text is the sign-off table.
//   2. BY THE DEPENDENCY DIRECTION — the execution model is COMPUTED (`projectExecution`) by every
//      consumer that has one, and the renderer is only ever written to, never parsed.
//   3. BEHAVIOURALLY — a record on disk whose fact lines have been tampered with does not move the
//      command's answer by one field. A structural check alone would miss a parse spelled some way
//      the pattern did not anticipate.
import assert from "node:assert/strict";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { EXECUTION_RECORD_BASENAME, loopRecordCommand } from "../../../src/commands/loop-record.mjs";
import { functionBody, stripComments } from "../../support/source-slice.mjs";
import { ITEM_REF, ctxFor, withRepo } from "../../loop/loop-record-command.test.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// THE MODULES PERMITTED TO NAME THE DOCUMENT, and each is here for a stated reason rather than
// because it happened to need naming:
//
//   · the WRITER (78/02) — it emits the document and reads its sign-off block back.
//   · the CHECKER (78/03) — `work:doctor`'s loop-record lane, which reads the sign-off block to say
//     whether a human has signed it. It holds its OWN copy of the frozen shape rather than importing
//     the writer's, deliberately: an instrument that imported the writer's opinion of the shape could
//     never report the writer changing it, and importing that module would drag `run-store`,
//     `work-loops` and `fs` into the import closure of a lane whose contract is purity (52/FF-5202
//     forbids the second outright). FF-7809 holds the two copies byte-equal.
// Doctor's ENGINE (`src/work/doctor.mjs`) performs the snapshot read at its one impure edge and is
// deliberately NOT here: it names the checker's exported constant rather than the literal, so the
// basename still has two homes and not three. FF-7808 holds the other half of that — the engine reads
// the record and renders no verdict about it.
//
// Every member is held below to the SAME rule that makes this gate mean something: it may read the
// SIGN-OFF, and it may not recover an execution FACT from the document. That is why widening this
// list is safe only alongside the per-module assertion in the next entry — the list is not the claim.
const ALLOWED_READERS = [
  "src/commands/loop-record.mjs",
  "src/work/doctor-loop-record.mjs",
];

// The derived section headings the renderer emits. A module that named one of them would be locating
// a fact in the document's prose — the exact shape this gate refuses.
const DERIVED_HEADINGS = ["## Coverage", "## What ran", "## The graph", "Ran, undeclared", "Declared, never ran", "Authority unresolved"];

async function sourceFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await sourceFiles(full));
    else if (entry.name.endsWith(".mjs")) out.push(full);
  }
  return out;
}

export const archTests = [
  {
    name: "arch/78/02 FF-7805 only the writer and the checker name the record, and neither reads a fact out of it",
    run: async () => {
      const files = await sourceFiles(path.join(repoRoot, "src"));
      assert.ok(files.length > 100, "the src/ sweep is non-vacuous");
      const naming = [];
      for (const file of files) {
        if (stripComments(await readFile(file, "utf8")).includes(EXECUTION_RECORD_BASENAME)) {
          naming.push(path.relative(repoRoot, file).split(path.sep).join("/"));
        }
      }
      assert.deepEqual(naming.sort(), [...ALLOWED_READERS].sort(), "the record's basename is named in exactly the sanctioned modules");

      // AND NO SANCTIONED READER RECOVERS A FACT FROM IT — the rule the allowlist exists to carry. A
      // module that named one of the renderer's derived section headings would be locating a fact in
      // the document's prose, which is the shape this gate refuses whoever writes it.
      for (const rel of ALLOWED_READERS) {
        const source = stripComments(await readFile(path.join(repoRoot, rel), "utf8"));
        for (const heading of DERIVED_HEADINGS) {
          assert.ok(!source.includes(heading), `${rel} never names the derived section "${heading}"`);
        }
      }
    },
  },
  {
    name: "arch/78/02 FF-7805 the writer parses the sign-off and nothing else out of the document",
    run: async () => {
      const source = stripComments(await readFile(path.join(repoRoot, "src/commands/loop-record.mjs"), "utf8"));

      // ONE read of the file, and its result goes straight into the sign-off parse. A second
      // `readFile` of the record, or a use of `existing` for anything but the parse and the
      // changed-comparison, would be a fact coming back off disk.
      assert.equal((source.match(/\breadFile\s*\(/g) ?? []).length, 1, "the document is read exactly once");
      assert.match(source, /parseSignoffRows\(existing, displayPath\(target\)\)/, "and that read feeds the sign-off parse");

      // The parse itself is anchored at the frozen heading and walks only the table beneath it. The
      // region is cut by the LANGUAGE's own braces (`functionBody`, the one home for a structural
      // cut — F-47-04-ARCH-2), never by a second `indexOf` sentinel whose declaration order nothing
      // pins.
      const parser = functionBody(source, "export function parseSignoffRows(");
      assert.ok(parser, "parseSignoffRows is the document's one parser (cut not found — has it been renamed?)");
      assert.match(parser, /SIGNOFF_HEADING/, "the parse is anchored at the frozen sign-off heading");
      for (const heading of DERIVED_HEADINGS) {
        assert.ok(!source.includes(heading), `the writer never names the derived section "${heading}" — it cannot be reading a fact out of it`);
      }
      // And the facts it reports are the MODEL's, field for field — not values recovered from text.
      assert.match(source, /coverage: model\.coverage/);
      assert.match(source, /engagements: model\.engagements/);
      assert.match(source, /gaps: model\.gaps/);
    },
  },
  {
    name: "arch/78/02 FF-7805 every consumer of an execution fact computes the model; the renderer is written to, never parsed",
    run: async () => {
      const files = await sourceFiles(path.join(repoRoot, "src"));
      const importers = { projection: [], renderer: [] };
      for (const file of files) {
        const rel = path.relative(repoRoot, file).split(path.sep).join("/");
        const source = stripComments(await readFile(file, "utf8"));
        // The SPECIFIERS, resolved against the importing file, so `./commands/loop-record.mjs` (the
        // command core's import of the COMMAND) is never mistaken for an import of the projection.
        const specifiers = [...source.matchAll(/from\s+["'](\.[^"']+)["']/g)]
          .map((match) => path.relative(repoRoot, path.resolve(path.dirname(file), match[1])).split(path.sep).join("/"));
        if (specifiers.includes("src/loop-record.mjs")) importers.projection.push(rel);
        if (specifiers.includes("src/loop-record-render.mjs")) importers.renderer.push(rel);
      }
      // THE DEPENDENCY DIRECTION IS THE CLAIM. Both consumers of an execution fact COMPUTE it through
      // 78/00's projection, from the run records — neither reads it back out of the document:
      //   · the command, for the model it emits and renders;
      //   · doctor's snapshot boundary, for the engagement list its lane compares the record against.
      // That second one is FF-7805 satisfied at its sharpest: the staleness check could have been
      // written by parsing the record's own `## What ran` bullets, which would have made the document
      // the authority on what ran. It projects instead.
      assert.deepEqual(
        importers.projection.sort(),
        ["src/commands/loop-record.mjs", "src/work/doctor.mjs"],
        "the execution model is COMPUTED from the run records by every consumer that has one",
      );
      // The RENDERER has exactly one consumer, and it only ever composes bytes — nothing imports it to
      // parse a document back into facts.
      assert.deepEqual(importers.renderer, ["src/commands/loop-record.mjs"], "and the renderer's bytes are composed in one place");

      // The stable contract is the command's `--json`, so the model reaches a consumer through the
      // registry. Asserted on the command itself rather than on prose about it.
      assert.equal(loopRecordCommand.id, "work:loop-record");
      assert.equal(typeof loopRecordCommand.cli.json, "function", "the command has a machine face");
    },
  },
  {
    name: "arch/78/02 FF-7805 a tampered record does not move the command's answer by one field",
    run: async () => {
      await withRepo({}, async (repo) => {
        const ctx = await ctxFor(repo);
        const honest = await loopRecordCommand.run({ ref: ITEM_REF, write: true }, ctx);

        // Every fact-bearing line rewritten to a lie, and the sign-off block left alone so the parse
        // still succeeds — which is the interesting case: the document is READABLE and wrong.
        const tampered = (await readFile(repo.recordPath, "utf8"))
          .replace(/^- \d+ runs found.*$/m, "- 41 runs found for this item, 41 carrying a loop declaration (100%).")
          .replace(/^- \*\*loop:build-to-green\*\*.*$/m, "- **loop:build-to-green** (`lr-a`) — 41 cycles against a declared ceiling of 3, over the bound; 41 attempts; ended `failed` — cap-exhausted.")
          .replace(/^- \*\*loop:review-fix\*\*.*$/m, "- **loop:invented** (`lr-z`) — 7 cycles, ceiling `none` — terminates by construction; 7 attempts; in flight.");
        await writeFile(repo.recordPath, tampered, "utf8");

        const after = await loopRecordCommand.run({ ref: ITEM_REF }, ctx);
        assert.deepEqual(after.coverage, honest.coverage, "the coverage comes from the run records");
        assert.deepEqual(after.engagements, honest.engagements, "so do the engagements, field for field");
        assert.deepEqual(after.gaps, honest.gaps, "and the gaps");
        assert.equal(after.text, honest.text, "and a regeneration re-derives every tampered line away");
      });
    },
  },
];
