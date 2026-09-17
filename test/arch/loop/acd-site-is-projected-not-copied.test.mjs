// Fitness function for story 125 / task 01 — THE PLACEMENT CONTROL.
//
//   "The published graph page is projected from the committed artefact, and the builder that
//    projects it lives where the delivered reader-set control does not walk."
//
// WHY THIS EXISTS. Story 79's drift check (`acd-loop-document-current.test.mjs`, beside this file)
// walks `src/` for `loopDocumentPath`, `LOOP_DOCUMENT_BASENAME` or a literal `loops.md` and asserts
// the reader set is exactly its own two modules — "read by its own two modules and by no lifecycle,
// doctor or acceptor door". A site builder placed in `src/` reds that delivered control on arrival.
// The walk is over `src/` only, so a builder under `scripts/` may import the seam freely, which is
// also where this repository already keeps its build and release steps. That is the whole placement
// argument, and it is a control rather than a note because the alternative reads as an arbitrary
// preference until somebody moves the file and 79's suite reds for a reason nothing states.
//
// THE READER-SET ASSERTION IS 79's, RUN — NOT RESTATED. Entry 1 imports 79's `archTests` and runs
// its reader-set row (the way `acd-work-memory-routed` runs the README control's row), so there is
// one walk and one predicate deciding who reads the document. What this file keeps is ONE local
// copy of the predicate, for a question 79 does not ask — "would the builder match, were it inside
// the walk?" — and that copy is held BYTE-EQUAL to the regex literal read from 79's source, so the
// two spellings cannot drift apart. Why 79's copy is not simply exported and imported: task 01's own
// criterion is that "story 79's control passes UNEDITED", so its predicate cannot be lifted into a
// shared home without an edit to the control that criterion protects. The drift check is the
// substitute for a shared home until 79 is next opened.
//
// THREE CLAIMS, each by consequence rather than by reading:
//   1. 79's reader-set row passes at the tip, and the builder — which the predicate DOES match — is
//      outside the walk. (79's row passing unedited is what the story's focused set holds too; this
//      entry says why it passes.)
//   2. The builder REACHES the one home: it imports `loopDocumentPath` from `src/loop-document.mjs`,
//      spells no basename of the document, and composes no part of it — not one line of the
//      committed document appears in the builder's source.
//   3. Nothing under `docs/` carries the graph document's committed bytes or is the builder's
//      output. The shell is committed; the content is staged.
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loopDocumentPath } from "../../../src/loop-document.mjs";
import { loadWorkspace } from "../../../src/work.mjs";
import { SHELL_DIR, buildSite, carriesProvenanceEnvelope } from "../../../scripts/site/build-site.mjs";
import { snapshot } from "../../support/loop-document-fixture.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";
import { stripComments } from "../../support/source-slice.mjs";
import { archTests as loopDocumentCurrentTests } from "./acd-loop-document-current.test.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const BUILDER = "scripts/site/build-site.mjs";
const DELIVERED_CONTROL = "test/arch/loop/acd-loop-document-current.test.mjs";
// The delivered control's predicate — ONE local copy, held byte-equal to 79's literal in entry 1.
const READER = /loopDocumentPath|LOOP_DOCUMENT_BASENAME|["'`]loops\.md["'`]/;

// The regex literal 79's reader walk applies, read from its SOURCE: the one `.test(` whose literal
// names the basename constant. Null when 79 no longer spells it that way — which entry 1 reports
// rather than passing over.
async function deliveredReaderLiteral() {
  const source = stripComments(await readFile(path.join(repoRoot, DELIVERED_CONTROL), "utf8"));
  const line = source.split("\n").find((candidate) => candidate.includes("LOOP_DOCUMENT_BASENAME") && candidate.includes(".test("));
  if (!line) return null;
  return /(\/(?:\\.|[^/\n])+\/[a-z]*)\.test\(/.exec(line)?.[1] ?? null;
}

export const archTests = [
  {
    name: "arch/125/01 (acd-site-is-projected-not-copied): the builder is reachable from no path the delivered reader-set control walks — 79's reader-set row passes at the tip, its predicate matches the builder, and the builder sits outside the walk",
    run: async () => {
      // 79's OWN row, run: the walk over src/ and the exactly-two assertion are its, not a restatement.
      const readerSetRow = loopDocumentCurrentTests.find((entry) => /the check gates the suite and nothing in the work lifecycle/.test(entry.name));
      assert.ok(readerSetRow, "story 79's control still carries its reader-set row");
      await readerSetRow.run();

      // ONE PREDICATE, TWO SPELLINGS, HELD EQUAL. The local copy exists only to ask what 79 does not.
      const literal = await deliveredReaderLiteral();
      assert.ok(literal, `${DELIVERED_CONTROL} still applies its reader predicate as a regex literal`);
      assert.equal(READER.toString(), literal, "this file's copy of the reader predicate is byte-equal to the delivered control's — the two cannot drift apart");

      // NON-VACUOUS: the predicate DOES match the builder. What keeps 79's row green is the walk's
      // scope, not a builder that happens to spell nothing the predicate recognises.
      const builder = stripComments(await readFile(path.join(repoRoot, BUILDER), "utf8"));
      assert.match(builder, READER, "the reader predicate matches the builder — it is a reader of the seam");
      assert.ok(path.relative(path.join(repoRoot, "src"), path.join(repoRoot, BUILDER)).startsWith(".."), "and the builder's path resolves outside src/, which is why the walk never reaches it");
    },
  },
  {
    name: "arch/125/01 (acd-site-is-projected-not-copied): the builder takes the document's path from its one home — it imports loopDocumentPath, spells no basename of the document, and composes no part of it",
    run: async () => {
      const source = stripComments(await readFile(path.join(repoRoot, BUILDER), "utf8"));

      // Asserted on the IMPORT BINDINGS, as 79's own control does: a whole-file grep for the
      // symbol would be satisfied by the string that spells it. The SPECIFIER comes from the one
      // extractor home (119/FF-11901 · 121 — no control spells its own); the clause is then read
      // off the statement that carries that specifier, which is a claim about the builder's import
      // clause rather than a second extractor (aof:verify 127).
      const documentSpecifiers = importSpecifiers(source)
        .filter((entry) => !entry.dynamic && entry.specifier.endsWith("/loop-document.mjs") && !entry.specifier.includes("/commands/"))
        .map((entry) => entry.specifier);
      assert.ok(documentSpecifiers.length >= 1, "the builder imports the one loop-document home");
      const bindings = documentSpecifiers.flatMap((specifier) => {
        const statement = source.split(";").find((text) => text.includes(`"${specifier}"`) || text.includes(`'${specifier}'`)) ?? "";
        // The clause is MATCHED, not cut positionally (47/F-47-04-ARCH-2): the braces bound it.
        const clause = /\{([^}]*)\}/u.exec(statement)?.[1] ?? "";
        return clause.split(",").map((name) => name.trim()).filter(Boolean);
      });
      assert.ok(bindings.includes("loopDocumentPath"), `the builder obtains the document's path from loopDocumentPath (bindings: ${bindings.join(", ")})`);
      assert.ok(!bindings.includes("composeLoopDocument"), "and imports no composer");
      assert.ok(!bindings.includes("LOOP_DOCUMENT_BASENAME"), "and does not take the basename to spell a second path with it");

      // No basename of its own — the one home derives it.
      assert.doesNotMatch(source, /["'`]loops\.md["'`]/, "the builder spells no basename of the document");
      assert.doesNotMatch(source, /loops\.md/, "not in any string at all");

      // COMPOSES NOTHING: not one line of the committed document appears in the builder. The
      // document's lines are read from the artefact itself, so this file holds no list of the
      // document's shape to drift from the composer's.
      const workspace = await loadWorkspace(repoRoot);
      const document = await readFile(loopDocumentPath(workspace), "utf8");
      const lines = [...new Set(document.split("\n").map((line) => line.trim()).filter((line) => line.length >= 6))];
      assert.ok(lines.length >= 40, `the committed document is non-trivial (${lines.length} distinct lines)`);
      for (const line of lines) assert.ok(!source.includes(line), `the builder composes no part of the document (found: ${line})`);
    },
  },
  {
    name: "arch/125/01 (acd-site-is-projected-not-copied): no copy of the graph document is committed — nothing under docs/ carries its bytes, and nothing there is the builder's output",
    run: async () => {
      const shell = path.join(repoRoot, SHELL_DIR);
      const files = Object.keys(await snapshot(shell));
      assert.ok(files.length >= 3, `docs/ holds the shell (${files.length} files)`);

      const workspace = await loadWorkspace(repoRoot);
      const document = await readFile(loopDocumentPath(workspace), "utf8");
      // The diagram is the part a hand copy would carry: the first fenced block's text.
      const diagram = /```mermaid\n([\s\S]*?)\n```/.exec(document)?.[1];
      assert.ok(diagram && diagram.length > 200, "the committed document carries a Mermaid diagram to be copied");

      for (const file of files) {
        const text = await readFile(path.join(shell, file), "utf8");
        assert.notEqual(text, document, `${file} is not the graph document`);
        assert.ok(!text.includes(diagram), `${file} does not carry the graph document's diagram`);
        assert.ok(!carriesProvenanceEnvelope(text), `${file} is not a page the builder produced`);
      }

      // NON-VACUOUS: a page the builder DOES produce matches the envelope the loop above refuses,
      // and carries the diagram the loop above looks for.
      const out = await mkdtemp(path.join(os.tmpdir(), "aof-site-control-"));
      try {
        const result = await buildSite({ root: repoRoot, out });
        const generated = result.pages.find((page) => page.kind === "generated");
        assert.ok(generated, "the build stages the generated page");
        const staged = await readFile(path.join(out, generated.page), "utf8");
        assert.ok(carriesProvenanceEnvelope(staged), "the builder's output carries the envelope this control refuses under docs/");
        assert.ok(staged.includes(diagram), "and the diagram this control refuses under docs/");
      } finally {
        await rm(out, { recursive: true, force: true });
      }
    },
  },
];
