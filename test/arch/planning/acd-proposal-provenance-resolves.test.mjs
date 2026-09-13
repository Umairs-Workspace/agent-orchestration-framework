import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import {
  controlPathsIn,
  fitnessDeclarations,
  isControlFileName,
  normalizeCitedPath,
  pathCitationsIn,
  splitPathLocator,
} from "../../../src/work/doctor-controls.mjs";
import { QUALIFIED_REF, qualifiedRefsIn } from "../../../src/declared-id.mjs";
import { emitProposals, extractProvenanceCitations } from "../../../src/work-tune/provenance.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function filesBelow(root, accept) {
  const found = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) found.push(...filesBelow(absolute, accept));
    else if (accept(absolute)) found.push(absolute);
  }
  return found;
}

function makeResolutionFixture() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "aof-ff6204-"));
  const itemDir = path.join(rootDir, "wiki", "work", "62_milestone_fixture");
  fs.mkdirSync(itemDir, { recursive: true });
  fs.mkdirSync(path.join(rootDir, "evidence"));
  fs.writeFileSync(path.join(itemDir, "ARCHITECTURE.md"), "## ADR-001: planted\n");
  fs.writeFileSync(path.join(itemDir, "DESIGN.md"), "## ADR-002: planted elsewhere\n");
  fs.writeFileSync(path.join(rootDir, "evidence", "one.md"), "one\ntwo\n");
  fs.writeFileSync(path.join(rootDir, "evidence", "two.md"), "other\n");
  return rootDir;
}

function copiedReader(mutator) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "aof-grammar-copy-"));
  const srcDir = path.join(rootDir, "src");
  const tuneDir = path.join(srcDir, "work-tune");
  fs.cpSync(path.join(repoRoot, "src"), srcDir, { recursive: true });
  mutator?.(rootDir);
  return {
    rootDir,
    load: () => import(`${pathToFileURL(path.join(tuneDir, "provenance.mjs")).href}?copy=${Date.now()}-${Math.random()}`),
  };
}

function rewrite(file, change) {
  const before = fs.readFileSync(file, "utf8");
  const after = change(before);
  assert.notEqual(after, before, `mutation must change ${file}`);
  fs.writeFileSync(file, after);
}

export const archTests = [
  {
    name: "acd-proposal-provenance-resolves: both owning grammars are imported and no private grammar is authored",
    run: () => {
      assert.equal(typeof pathCitationsIn, "function");
      assert.equal(typeof splitPathLocator, "function");
      assert.equal(typeof qualifiedRefsIn, "function");
      assert.equal(QUALIFIED_REF instanceof RegExp, true);
      const source = fs.readFileSync(path.join(repoRoot, "src", "work-tune", "provenance.mjs"), "utf8");
      assert.match(source, /import[\s\S]*pathCitationsIn[\s\S]*splitPathLocator[\s\S]*from "\.\.\/work\/doctor-controls\.mjs"/);
      assert.match(source, /import[\s\S]*QUALIFIED_REF[\s\S]*qualifiedRefsIn[\s\S]*from "\.\.\/declared-id\.mjs"/);
      assert.match(source, /import \{ ITEM_RE \} from "\.\.\/work\.mjs"/);
      assert.doesNotMatch(source, /CITED_PATH|LOCATOR_SUFFIX|\\d\{1,4\}.*item|#L\\d|A-Za-z0-9_@\.\*-/);
      assert.doesNotMatch(source, /bareId|bareRefsIn|declaredIdOn\(.*provenance/i);
      assert.doesNotMatch(source, /ACCEPTANCE_EVIDENCE_TO_COMMIT|options\.proposalEvidenceFloor/);
      assert.match(source, /options\.workDir/);
      assert.deepEqual(
        extractProvenanceCitations("evidence/999/ADR-001.md m62/ADR-001").citations,
        [
          { kind: "document", citation: "evidence/999/ADR-001.md" },
          { kind: "id", citation: "m62/ADR-001", item: "62", id: "ADR-001" },
        ],
      );
    },
  },
  {
    name: "acd-proposal-provenance-resolves: the control extractor remains the same exact composition over the corpus",
    run: () => {
      const architectures = filesBelow(path.join(repoRoot, "wiki", "work"), (file) => path.basename(file) === "ARCHITECTURE.md");
      let compared = 0;
      for (const file of architectures) {
        const text = fs.readFileSync(file, "utf8");
        for (const declaration of fitnessDeclarations(text, "ARCHITECTURE.md")) {
          if (declaration.enforcedBy == null) continue;
          const before = pathCitationsIn(declaration.enforcedBy)
            .map(normalizeCitedPath)
            .filter(isControlFileName)
            .filter((value, index, all) => all.indexOf(value) === index);
          assert.deepEqual(controlPathsIn(declaration.enforcedBy), before, `${file}:${declaration.line}`);
          compared += 1;
        }
      }
      assert.ok(compared > 0, "the self-comparison must exercise the live fitness-register corpus");
      assert.deepEqual(controlPathsIn("wiki/work/x/RETROSPECTIVE.md:2 test/a.test.mjs:4"), ["test/a.test.mjs"]);
    },
  },
  {
    name: "acd-proposal-provenance-resolves: planted candidates resolve, demote, stay disjoint, and count documents",
    run: () => {
      const rootDir = makeResolutionFixture();
      try {
        const report = emitProposals(
          [
            { id: "same-document", provenance: ["m62/ADR-001", "wiki/work/62_milestone_fixture/ARCHITECTURE.md:1"] },
            { id: "two-documents", provenance: ["m62/ADR-001", "m62/ADR-002"] },
            { id: "bad", provenance: ["evidence/one.md:2", "evidence/missing.md:1"] },
            { id: "zero", provenance: [] },
          ],
          { rootDir },
        );
        assert.deepEqual(report.proposals.map((entry) => entry.id), ["two-documents"]);
        assert.equal(report.findings.find((entry) => entry.id === "same-document").code, "below-evidence-floor");
        assert.equal(report.findings.find((entry) => entry.id === "same-document").distinctSourceDocumentCount, 1);
        assert.equal(report.findings.find((entry) => entry.id === "bad").code, "unresolvable-provenance");
        assert.match(report.findings.find((entry) => entry.id === "bad").message, /evidence\/missing\.md:1/);
        assert.equal(report.findings.find((entry) => entry.id === "zero").code, "below-evidence-floor");
        assert.equal(new Set([...report.proposals, ...report.findings].map((entry) => entry.id)).size, report.considered);
      } finally {
        fs.rmSync(rootDir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "acd-proposal-provenance-resolves: changes to each owning grammar move the copied reader",
    run: async () => {
      const idCopy = copiedReader((copyRoot) => {
        const file = path.join(copyRoot, "src", "declared-id.mjs");
        rewrite(file, (source) => source.replace("m?(\\\\d{1,4}", "(\\\\d{1,4}"));
      });
      try {
        const reader = await idCopy.load();
        assert.equal(reader.extractProvenanceCitations("m62/ADR-001").citations.length, 0);
        assert.equal(reader.extractProvenanceCitations("62/ADR-001").citations.length, 1);
      } finally {
        fs.rmSync(idCopy.rootDir, { recursive: true, force: true });
      }

      const nestedCopy = copiedReader((copyRoot) => {
        const file = path.join(copyRoot, "src", "declared-id.mjs");
        rewrite(file, (source) => source
          .replace("(?:/\\\\d{1,3})*", "")
          .replace("(?<![-\\\\w.])", "(?<![-\\\\w./])"));
      });
      try {
        const reader = await nestedCopy.load();
        assert.equal(reader.extractProvenanceCitations("m62/02/ADR-001").citations.length, 0);
      } finally {
        fs.rmSync(nestedCopy.rootDir, { recursive: true, force: true });
      }

      const formCopy = copiedReader((copyRoot) => {
        const file = path.join(copyRoot, "src", "declared-id.mjs");
        rewrite(file, (source) => source.replace(
          '  Object.freeze({ name: "R", scope: "document", id: "R\\\\d+", terminator: "\\\\b", separator: SEPARATOR_CLASS }),',
          '  Object.freeze({ name: "X", scope: "document", id: "X-\\\\d+", terminator: "", separator: SEPARATOR_CLASS }),\n  Object.freeze({ name: "R", scope: "document", id: "R\\\\d+", terminator: "\\\\b", separator: SEPARATOR_CLASS }),',
        ));
      });
      try {
        const itemDir = path.join(formCopy.rootDir, "wiki", "work", "62_milestone_fixture");
        fs.mkdirSync(itemDir, { recursive: true });
        fs.writeFileSync(path.join(itemDir, "ARCHITECTURE.md"), "## X-1: added in the owner\n");
        const reader = await formCopy.load();
        assert.equal(reader.resolveCitationAtEmit("m62/X-1", { rootDir: formCopy.rootDir }).ok, true);
      } finally {
        fs.rmSync(formCopy.rootDir, { recursive: true, force: true });
      }

      const droppedFormCopy = copiedReader((copyRoot) => {
        const file = path.join(copyRoot, "src", "declared-id.mjs");
        rewrite(file, (source) => source.replace(
          '  Object.freeze({ name: "ADR", scope: "document", id: "ADR-\\\\d+", terminator: "", separator: SEPARATOR_CLASS }),',
          "",
        ));
      });
      try {
        const reader = await droppedFormCopy.load();
        assert.equal(reader.extractProvenanceCitations("m62/ADR-001").citations.length, 0);
      } finally {
        fs.rmSync(droppedFormCopy.rootDir, { recursive: true, force: true });
      }

      const pathCopy = copiedReader((copyRoot) => {
        const file = path.join(copyRoot, "src", "work", "doctor-controls.mjs");
        rewrite(file, (source) => source
          .replace("|:\\d+(?:-\\d+)?)?/g", "|:\\d+(?:-\\d+)?|%\\d+)?/g")
          .replace("|:\\d+(?:-\\d+)?)$/", "|:\\d+(?:-\\d+)?|%\\d+)$/"));
      });
      try {
        fs.mkdirSync(path.join(pathCopy.rootDir, "evidence"), { recursive: true });
        fs.writeFileSync(path.join(pathCopy.rootDir, "evidence", "one.md"), "one\ntwo\n");
        const itemDir = path.join(pathCopy.rootDir, "wiki", "work", "62_milestone_fixture");
        fs.mkdirSync(itemDir, { recursive: true });
        fs.writeFileSync(path.join(itemDir, "ARCHITECTURE.md"), "## ADR-001: unchanged id grammar\n");
        const reader = await pathCopy.load();
        const answer = reader.resolveCitationAtEmit("evidence/one.md%3", { rootDir: pathCopy.rootDir });
        assert.equal(answer.failure.code, "line-absent");
        assert.equal(reader.resolveCitationAtEmit("m62/ADR-001", { rootDir: pathCopy.rootDir }).ok, true);
      } finally {
        fs.rmSync(pathCopy.rootDir, { recursive: true, force: true });
      }

      const noLocatorCopy = copiedReader((copyRoot) => {
        const file = path.join(copyRoot, "src", "work", "doctor-controls.mjs");
        rewrite(file, (source) => source.replace("(?:#L\\d+(?:-L?\\d+)?|:\\d+(?:-\\d+)?)?", ""));
      });
      try {
        fs.mkdirSync(path.join(noLocatorCopy.rootDir, "evidence"), { recursive: true });
        fs.writeFileSync(path.join(noLocatorCopy.rootDir, "evidence", "one.md"), "one\n");
        const reader = await noLocatorCopy.load();
        const answer = reader.resolveCitationAtEmit("evidence/one.md:9", { rootDir: noLocatorCopy.rootDir });
        assert.equal(answer.ok, true);
        assert.equal(answer.resolved.line, null);
      } finally {
        fs.rmSync(noLocatorCopy.rootDir, { recursive: true, force: true });
      }

      const bothCopy = copiedReader((copyRoot) => {
        rewrite(path.join(copyRoot, "src", "declared-id.mjs"), (source) => source.replace("m?(\\\\d{1,4}", "(\\\\d{1,4}"));
        rewrite(path.join(copyRoot, "src", "work", "doctor-controls.mjs"), (source) => source
          .replace("|:\\d+(?:-\\d+)?)?/g", "|:\\d+(?:-\\d+)?|%\\d+)?/g")
          .replace("|:\\d+(?:-\\d+)?)$/", "|:\\d+(?:-\\d+)?|%\\d+)$/"));
      });
      try {
        const reader = await bothCopy.load();
        assert.equal(reader.extractProvenanceCitations("m62/ADR-001").citations.length, 0);
        assert.deepEqual(reader.extractProvenanceCitations("evidence/one.md%2").citations, [
          { kind: "document", citation: "evidence/one.md%2" },
        ]);
      } finally {
        fs.rmSync(bothCopy.rootDir, { recursive: true, force: true });
      }
    },
  },
];
