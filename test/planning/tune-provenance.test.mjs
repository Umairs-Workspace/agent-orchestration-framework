import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  canonicalDocumentIdentity,
  citationForRecord,
  emitProposals,
  extractProvenanceCitations,
  pathIsWithinRoot,
  resolveCitationAtEmit,
  resolveProvenanceAtEmit,
} from "../../src/work-tune/provenance.mjs";

function fixture() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "aof-provenance-"));
  const itemDir = path.join(rootDir, "wiki", "work", "62_milestone_fixture");
  fs.mkdirSync(path.join(itemDir, "stories", "02_story_nested"), { recursive: true });
  fs.mkdirSync(path.join(rootDir, "evidence"), { recursive: true });
  fs.mkdirSync(path.join(rootDir, "notes"), { recursive: true });
  fs.writeFileSync(path.join(rootDir, "evidence", "one.md"), "one\ntwo\nthree\n");
  fs.writeFileSync(path.join(rootDir, "evidence", "two.md"), "other\n");
  fs.writeFileSync(path.join(rootDir, "evidence", "empty.md"), "");
  fs.writeFileSync(path.join(rootDir, "notes", "source.md"), "source\n");
  fs.writeFileSync(
    path.join(itemDir, "ARCHITECTURE.md"),
    "## ADR-001: declared here\n\n## Fitness functions\n\n| id | invariant | enforced by |\n|---|---|---|\n| **FF-6204** | resolves | `test/arch/control.test.mjs` |\n",
  );
  fs.writeFileSync(path.join(itemDir, "DESIGN.md"), "## ADR-002: declared elsewhere\n");
  fs.writeFileSync(
    path.join(itemDir, "VERIFICATION.md"),
    "## Fitness functions\n\n| id | result |\n|---|---|\n| **FF-9999-CITED** | GREEN |\n",
  );
  fs.writeFileSync(path.join(itemDir, "stories", "02_story_nested", "STORY.md"), "## ADR-003: nested declaration\n");
  return { rootDir, itemDir };
}

function removeFixture(rootDir) {
  fs.rmSync(rootDir, { recursive: true, force: true });
}

export const tuneProvenanceTests = [
  {
    name: "62/02 provenance: document resolution checks the file and the last line of a locator at emit",
    run: () => {
      const { rootDir } = fixture();
      try {
        assert.equal(resolveCitationAtEmit("evidence/one.md", { rootDir }).ok, true);
        assert.equal(resolveCitationAtEmit("evidence/one.md:3", { rootDir }).ok, true);
        assert.equal(resolveCitationAtEmit("evidence/one.md#L2-L3", { rootDir }).ok, true);
        assert.equal(resolveCitationAtEmit("evidence/one.md:4", { rootDir }).failure.code, "line-absent");
        assert.equal(resolveCitationAtEmit("evidence/one.md#L2-L4", { rootDir }).failure.code, "line-absent");
        assert.equal(resolveCitationAtEmit("evidence/one.md:0", { rootDir }).failure.code, "line-absent");
        assert.equal(resolveCitationAtEmit("evidence/empty.md:1", { rootDir }).failure.code, "line-absent");
        assert.equal(resolveCitationAtEmit("evidence/missing.md", { rootDir }).failure.code, "file-absent");
        const relative = resolveCitationAtEmit("../evidence/one.md:2", {
          rootDir,
          sourceDocument: "notes/source.md",
        });
        assert.equal(relative.ok, true);
        assert.equal(relative.resolved.document, "evidence/one.md");
      } finally {
        removeFixture(rootDir);
      }
    },
  },
  {
    name: "62/02 provenance: qualified ids resolve an on-disk item and a declaration, never a citing row",
    run: () => {
      const { rootDir } = fixture();
      try {
        const prefixed = resolveCitationAtEmit("m62/ADR-001", { rootDir });
        const plain = resolveCitationAtEmit("62/ADR-001", { rootDir });
        assert.equal(prefixed.ok, true);
        assert.equal(plain.ok, true);
        assert.equal(prefixed.resolved.document, plain.resolved.document);
        assert.equal(resolveCitationAtEmit("m999/ADR-001", { rootDir }).failure.code, "item-absent");
        assert.equal(resolveCitationAtEmit("m62/ADR-999", { rootDir }).failure.code, "declaration-absent");
        assert.equal(resolveCitationAtEmit("m62/FF-9999-CITED", { rootDir }).failure.code, "declaration-absent");
        assert.equal(resolveCitationAtEmit("m62/02/ADR-003", { rootDir }).ok, true);
      } finally {
        removeFixture(rootDir);
      }
    },
  },
  {
    name: "62/02 provenance: an integer-prefixed garbage directory is not a managed item",
    run: () => {
      const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "aof-provenance-garbage-"));
      try {
        const garbage = path.join(rootDir, "wiki", "work", "62_garbage");
        fs.mkdirSync(garbage, { recursive: true });
        fs.writeFileSync(path.join(garbage, "ARCHITECTURE.md"), "## ADR-001: not managed\n");
        assert.equal(resolveCitationAtEmit("m62/ADR-001", { rootDir }).failure.code, "item-absent");
      } finally {
        removeFixture(rootDir);
      }
    },
  },
  {
    name: "62/02 provenance: a canonical parentless story is an addressable top-level item",
    run: () => {
      const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "aof-provenance-story-"));
      try {
        const story = path.join(rootDir, "wiki", "work", "62_story_standalone");
        fs.mkdirSync(story, { recursive: true });
        fs.writeFileSync(path.join(story, "STORY.md"), "## ADR-001: parentless story declaration\n");
        const answer = resolveCitationAtEmit("m62/ADR-001", { rootDir });
        assert.equal(answer.ok, true);
        assert.equal(answer.resolved.document, "wiki/work/62_story_standalone/STORY.md");
      } finally {
        removeFixture(rootDir);
      }
    },
  },
  {
    name: "62/02 provenance: declared-id resolution uses the configured work directory",
    run: () => {
      const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "aof-provenance-workdir-"));
      try {
        const itemDir = path.join(rootDir, "planning", "62_milestone_configured");
        fs.mkdirSync(itemDir, { recursive: true });
        fs.writeFileSync(path.join(itemDir, "ARCHITECTURE.md"), "## ADR-001: configured\n");
        assert.equal(resolveCitationAtEmit("m62/ADR-001", { rootDir }).failure.code, "item-absent");
        const configured = resolveCitationAtEmit("m62/ADR-001", { rootDir, workDir: "planning" });
        assert.equal(configured.ok, true);
        assert.equal(configured.resolved.document, "planning/62_milestone_configured/ARCHITECTURE.md");
        const report = emitProposals(
          [{ id: "configured", provenance: ["m62/ADR-001", "evidence/two.md"] }],
          { rootDir, workDir: "planning", acceptanceEvidenceToCommit: 8 },
        );
        assert.equal(report.findings[0].failures[0].code, "file-absent");
        assert.equal(report.findings[0].resolvedCitations[0].citation, "m62/ADR-001");
      } finally {
        removeFixture(rootDir);
      }
    },
  },
  {
    name: "62/02 provenance: unreadable text fails and bare ids are not manufactured from source prose",
    run: () => {
      const extracted = extractProvenanceCitations("ADR-001 and a.test.mjs and test/family-*.test.mjs");
      assert.deepEqual(extracted.citations, []);
      assert.equal(extracted.unreadable.length, 1);
      assert.equal(extracted.unreadable[0].code, "citation-unreadable");
      assert.equal(citationForRecord({ itemRef: "62", id: "ADR-001" }), "m62/ADR-001");
      assert.equal(citationForRecord({ itemRef: "62", id: "ADR-001" }, { prefix: false }), "62/ADR-001");
      assert.equal(citationForRecord({ id: "ADR-001" }), null);
    },
  },
  {
    name: "62/02 provenance: an id-shaped substring inside a document path is not manufactured as a second citation",
    run: () => {
      const extracted = extractProvenanceCitations("evidence/999/ADR-001.md and m62/ADR-002");
      assert.deepEqual(extracted.citations, [
        { kind: "document", citation: "evidence/999/ADR-001.md" },
        { kind: "id", citation: "m62/ADR-002", item: "62", id: "ADR-002" },
      ]);
    },
  },
  {
    name: "62/02 provenance: document path occurrences are consumed once without rediscovering suffix paths",
    run: () => {
      const short = "evidence/999/ADR-001.md";
      const long = "archive/evidence/999/ADR-001.md";
      const exact = extractProvenanceCitations(`${short}, ${long}, ${short}`);
      assert.deepEqual(exact.citations, [
        { kind: "document", citation: short },
        { kind: "document", citation: long },
        { kind: "document", citation: short },
      ]);

      const nested = "deep/archive/evidence/999/ADR-001.md";
      const variants = extractProvenanceCitations(`${nested} then ${long} then ${nested} then m62/ADR-002`);
      assert.deepEqual(variants.citations, [
        { kind: "document", citation: nested },
        { kind: "document", citation: long },
        { kind: "document", citation: nested },
        { kind: "id", citation: "m62/ADR-002", item: "62", id: "ADR-002" },
      ]);
    },
  },
  {
    name: "62/02 provenance: qualified-ref occurrences are consumed once in authored order",
    run: () => {
      const authored = Array.from({ length: 9 }, (_, index) => (index % 2 === 0 ? "62/ADR-001" : "m62/ADR-001"));
      const extracted = extractProvenanceCitations(authored.join(" and "));
      assert.equal(extracted.citations.length, 9);
      assert.deepEqual(extracted.citations.map((citation) => citation.citation), authored);
      const paths = extractProvenanceCitations(
        "evidence/999/ADR-001.md then evidence/998/ADR-002.md then m62/ADR-003",
      );
      assert.deepEqual(paths.citations, [
        { kind: "document", citation: "evidence/999/ADR-001.md" },
        { kind: "document", citation: "evidence/998/ADR-002.md" },
        { kind: "id", citation: "m62/ADR-003", item: "62", id: "ADR-003" },
      ]);
    },
  },
  {
    name: "62/02 provenance: every candidate lands exactly once and bad citations demote as one actionable finding",
    run: () => {
      const { rootDir } = fixture();
      try {
        const candidates = [
          { id: "good", provenance: ["evidence/one.md:1", "evidence/two.md:1"] },
          { id: "mixed", provenance: ["evidence/one.md:2", "evidence/missing.md:1", "m999/ADR-001"] },
          { id: "thin", provenance: ["evidence/one.md:1"] },
          { id: "empty", provenance: [] },
        ];
        const report = emitProposals(candidates, { rootDir });
        assert.equal(report.considered, 4);
        assert.deepEqual(report.proposals.map((record) => record.id), ["good"]);
        assert.deepEqual(report.findings.map((record) => record.id), ["mixed", "thin", "empty"]);
        assert.equal(new Set([...report.proposals, ...report.findings].map((record) => record.id)).size, 4);
        const mixed = report.findings.find((record) => record.id === "mixed");
        assert.equal(mixed.code, "unresolvable-provenance");
        assert.deepEqual(mixed.failures.map((item) => item.code), ["file-absent", "item-absent"]);
        assert.deepEqual(mixed.failures.map((item) => item.question), ["file", "item"]);
        assert.deepEqual(mixed.resolvedCitations.map((item) => item.citation), ["evidence/one.md:2"]);
        assert.equal(report.findings.filter((record) => record.id === "mixed").length, 1);
        assert.equal(report.declinedBelowEvidenceFloor, 2);
      } finally {
        removeFixture(rootDir);
      }
    },
  },
  {
    name: "62/02 provenance: a repaired target restores the same proposal without changing the candidate",
    run: () => {
      const { rootDir } = fixture();
      try {
        const candidate = { id: "repairable", provenance: ["evidence/one.md:4", "evidence/two.md:1"] };
        const before = emitProposals([candidate], { rootDir });
        assert.equal(before.findings[0].code, "unresolvable-provenance");
        fs.appendFileSync(path.join(rootDir, "evidence", "one.md"), "four\n");
        const after = emitProposals([candidate], { rootDir });
        assert.deepEqual(after.proposals.map((record) => record.id), ["repairable"]);
        assert.deepEqual(after.findings, []);
      } finally {
        removeFixture(rootDir);
      }
    },
  },
  {
    name: "62/02 provenance: evidence is a set of documents, including id and path aliases",
    run: () => {
      const { rootDir } = fixture();
      try {
        const same = resolveProvenanceAtEmit(["m62/ADR-001", "wiki/work/62_milestone_fixture/ARCHITECTURE.md:1"], { rootDir });
        assert.equal(same.citationCount, 2);
        assert.equal(same.distinctSourceDocumentCount, 1);
        const repeated = resolveProvenanceAtEmit(["evidence/one.md:1", "evidence/one.md:2", "evidence/one.md:3"], { rootDir });
        assert.equal(repeated.citationCount, 3);
        assert.equal(repeated.distinctSourceDocumentCount, 1);
        const two = resolveProvenanceAtEmit(["m62/ADR-001", "m62/ADR-002"], { rootDir });
        assert.equal(two.distinctSourceDocumentCount, 2);
      } finally {
        removeFixture(rootDir);
      }
    },
  },
  {
    name: "62/02 provenance: the proposal floor and acceptance evidence remain independently named inputs",
    run: () => {
      const { rootDir } = fixture();
      try {
        const candidates = [
          { id: "at-floor", provenance: ["evidence/one.md:1", "evidence/two.md:1"] },
          { id: "below", provenance: ["evidence/one.md:2"] },
        ];
        const first = emitProposals(candidates, { rootDir, acceptanceEvidenceToCommit: 8 });
        const second = emitProposals(candidates, { rootDir, acceptanceEvidenceToCommit: 80 });
        const attemptedOverride = emitProposals([{ id: "zero", provenance: [] }], {
          rootDir,
          proposalEvidenceFloor: 0,
          acceptanceEvidenceToCommit: 8,
        });
        assert.equal(first.proposalEvidenceFloor, 2);
        assert.equal(first.acceptanceEvidenceToCommit, 8);
        assert.equal(second.acceptanceEvidenceToCommit, 80);
        assert.deepEqual(first.proposals.map((record) => record.id), second.proposals.map((record) => record.id));
        assert.deepEqual(first.findings.map((record) => record.id), second.findings.map((record) => record.id));
        assert.equal(first.proposals[0].provenanceResolution.distinctSourceDocumentCount, 2);
        assert.equal(first.findings[0].provenanceResolution.distinctSourceDocumentCount, 1);
        assert.equal(attemptedOverride.proposalEvidenceFloor, 2);
        assert.equal(attemptedOverride.proposals.length, 0);
        assert.equal(attemptedOverride.findings[0].code, "below-evidence-floor");
        assert.equal(emitProposals([], { rootDir }).acceptanceEvidenceToCommit, null);
      } finally {
        removeFixture(rootDir);
      }
    },
  },
  {
    name: "62/02 provenance: document identity case-folds only under Windows semantics",
    run: () => {
      const mixed = path.join(process.cwd(), "Evidence", "One.md");
      const lower = path.join(process.cwd(), "evidence", "one.md");
      assert.equal(canonicalDocumentIdentity(mixed, "win32"), canonicalDocumentIdentity(lower, "win32"));
      assert.notEqual(canonicalDocumentIdentity(mixed, "linux"), canonicalDocumentIdentity(lower, "linux"));
    },
  },
  {
    name: "62/02 provenance: root containment follows platform case semantics",
    run: () => {
      const parent = fs.mkdtempSync(path.join(os.tmpdir(), "aof-provenance-boundary-"));
      try {
        const rootDir = path.join(parent, "aof");
        const caseSibling = path.join(parent, "AOF", "evidence", "one.md");
        const sourceDocument = path.join(rootDir, "notes", "source.md");
        fs.mkdirSync(path.dirname(caseSibling), { recursive: true });
        fs.mkdirSync(path.dirname(sourceDocument), { recursive: true });
        fs.writeFileSync(caseSibling, "outside under POSIX semantics\n");
        fs.writeFileSync(sourceDocument, "source\n");
        assert.equal(pathIsWithinRoot(rootDir, caseSibling, "linux"), false);
        assert.equal(pathIsWithinRoot(rootDir, caseSibling, "win32"), true);
        assert.equal(pathIsWithinRoot(rootDir, path.join(rootDir, "evidence", "one.md"), "linux"), true);
        const citation = "../../AOF/evidence/one.md";
        assert.equal(
          resolveCitationAtEmit(citation, { rootDir, sourceDocument, platform: "linux" }).failure.code,
          "file-absent",
        );
        assert.equal(resolveCitationAtEmit(citation, { rootDir, sourceDocument, platform: "win32" }).ok, true);
      } finally {
        removeFixture(parent);
      }
    },
  },
];
