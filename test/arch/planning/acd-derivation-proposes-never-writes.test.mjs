// FF-9602 (96/ADR-004) — DERIVATION PROPOSES, READS A GRAPH IT NEVER BUILDS, AND THE PARSER IT
// SITS BESIDE KEEPS ITS ZERO IMPORTS.
//
// The failure this milestone exists to cure is a systematically SHORT declaration: 63/R4 records
// read- and write-set escapes across four consecutive stories, and a downstream retrospective
// records `files:` short of the test lane three stories running. A tool that silently narrowed an
// author's set would manufacture that same defect faster than hand-authoring did, and with the
// author's confidence attached — which is worse than the problem. So "it proposes" is asserted
// structurally rather than promised in a header.
//
// FIVE CLAIMS, each failing for its own reason:
//
//   1. THE PARSER KEEPS ITS ZERO IMPORTS. `src/story-contract.mjs` imports no project module — the
//      property ADR-004 §1 protects by putting the derivation BESIDE it. `validate.mjs` and
//      `ready-wave.mjs` both depend on that parser; a graph reader inside it would hand each of
//      them a transitive dependency on an artifact reader they have no concern with.
//   2. NO WRITE PATH. The derivation holds no write of an item document and imports no write seam,
//      so "the author subtracts" is a property of the module rather than a convention.
//   3. THE GRAPH IS READ, NEVER BUILT. It reaches the artifact only through the shipped
//      `readGraph`/`normalizeGraph`/`computeImpact` — no second parse of a graph path, no `graph
//      build` of any form, no child process, and no dynamic import (72/FF-7204's own shape, over a
//      different subject).
//   4. THE REASONS ARE A CLOSED EXPORTED SET. Every entry carries one, and a further source is an
//      edit with an ADR behind it rather than a string somebody passed.
//   5. AN UNUSABLE GRAPH IS AN ANSWER. Absent and unreadable are each DRIVEN over a real artifact
//      on disk and required to yield a citation-only proposal that SAYS the coupling was
//      unavailable — never an empty one, because "no coupling found" and "I could not learn the
//      coupling" rendering identically is the falsehood-shaped-as-an-answer this family refuses.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stripComments } from "../../support/source-slice.mjs";
import { PROPOSAL_REASONS, deriveStoryContract } from "../../../src/story-contract-derive.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const DERIVE = "src/story-contract-derive.mjs";
const PARSER = "src/story-contract.mjs";

const source = async (rel) => stripComments(await readFile(path.join(repoRoot, rel), "utf8"));

// Every static import specifier in a module, in source order.
const importsOf = (text) => importSpecifiers(text).map((entry) => entry.specifier);

export const archTests = [
  {
    name: "arch/96/01 FF-9602 (1) THE PARSER KEEPS ITS ZERO IMPORTS — src/story-contract.mjs imports no project module, which is why the derivation sits beside it",
    run: async () => {
      const parser = await source(PARSER);
      const specifiers = importsOf(parser);
      const project = specifiers.filter((specifier) => !specifier.startsWith("node:"));
      assert.deepEqual(project, [], `the parser imports only node builtins (found: ${project.join(", ")})`);
      // …and it has not grown a graph concern by another route.
      for (const token of ["graphJsonPath", "normalizeGraph", "computeImpact", "readGraph", "graphify-out"]) {
        assert.ok(!parser.includes(token), `the parser names "${token}" — the derivation belongs BESIDE it, not inside it (ADR-004 §1)`);
      }
    },
  },
  {
    name: "arch/96/01 FF-9602 (2) NO WRITE PATH — the derivation writes no story document and imports no write seam",
    run: async () => {
      const derive = await source(DERIVE);
      // Matched on WORD BOUNDARIES, not substrings: `norm(` contains `rm(`, and a control that
      // fired on that would be a confident red about a rule the tree honours.
      for (const write of [/\bwriteFile\b/, /\bwriteFileSync\b/, /\bwriteText\b/, /\bappendFile\b/, /\bmkdir\b/, /\brename\b/, /\bunlink\b/, /(?<![A-Za-z0-9_$])rm\(/]) {
        assert.doesNotMatch(derive, write, `the derivation reaches ${write} — it proposes; the author subtracts (ADR-004 §5)`);
      }
      for (const specifier of importsOf(derive)) {
        assert.notEqual(specifier, "./fs.mjs", "the derivation imports the repository's write seam");
        assert.notEqual(specifier, "node:fs/promises", "the derivation takes the async fs surface the write seam is built on");
      }
      // No flag could add one later without deleting this claim: the module names no apply verb.
      for (const verb of ["--apply", "--write", "applyProposal", "writeProposal", "STORY.md"]) {
        assert.ok(!derive.includes(verb), `the derivation names "${verb}" — a write path with a convenience label`);
      }
    },
  },
  {
    name: "arch/96/01 FF-9602 (3) THE GRAPH IS READ, NEVER BUILT — the shipped reader and impact core only, with no second parse, no build and no child process",
    run: async () => {
      const derive = await source(DERIVE);
      const specifiers = importsOf(derive);
      assert.ok(specifiers.includes("./graph-normalize.mjs"), "it reaches the artifact through the shipped normaliser");
      assert.ok(specifiers.includes("./graph-impact.mjs"), "…and the shipped impact reader");
      assert.ok(!derive.includes("JSON.parse"), "it holds no second parse of a graph artifact — readGraph owns that");
      for (const build of ["graph build", "graph:build", "buildGraph", "graphify "]) {
        assert.ok(!derive.includes(build), `it invokes a graph build ("${build}") — a build is minutes, and a proposal that costs minutes is one nobody runs`);
      }
      for (const spawn of ["child_process", "spawn", "execFile", "execSync", "await import("]) {
        assert.ok(!derive.includes(spawn), `it starts a child process or dynamic import ("${spawn}") — 72/FF-7204's shape, over this subject`);
      }
    },
  },
  {
    name: "arch/96/01 FF-9602 (3b) ONE SPELLING OF A SUITE, AND NO CONFIG READ — suite membership is the shipped predicate's, and the roots arrive as parameters",
    run: async () => {
      const derive = await source(DERIVE);
      // A second definition of "what is a suite" is two answers that agree until the day someone
      // changes one — the species 72/FF-7203 already names one module over.
      assert.ok(importsOf(derive).includes("./work/test-select.mjs"), "suite membership is decided through the shipped path predicate");
      assert.ok(derive.includes("isSuiteFile("), "…and it is actually called");
      assert.doesNotMatch(derive, /function\s+isSuiteFile\b/, "the derivation holds no second definition of a suite file");
      assert.doesNotMatch(derive, /\.test\.mjs["'`]\s*\)/, "…and no second inline spelling of the suffix as a membership test");

      // The roots are HANDED IN. A module that read them from config would answer differently for
      // two projects with the same inputs, which is the thing 72/FF-7201 keeps to one module.
      for (const config of ["aof.config.json", "loadWorkspace", "work.test", "workspace.config", "config?.work", "config-inspect"]) {
        assert.ok(!derive.includes(config), `the derivation reads project configuration ("${config}") — the roots are parameters`);
      }
    },
  },
  {
    name: "arch/96/01 FF-9602 (4) THE REASONS ARE A CLOSED EXPORTED SET — every entry carries one, and a further source cannot arrive as a free string",
    run: async () => {
      assert.ok(Object.isFrozen(PROPOSAL_REASONS), "the reason set is frozen");
      assert.throws(() => PROPOSAL_REASONS.push("invented"), "a further source is an edit with an ADR behind it, not a push");
      assert.equal(new Set(PROPOSAL_REASONS).size, PROPOSAL_REASONS.length, "the set carries no duplicate spelling of one source");

      const root = await mkdtemp(path.join(os.tmpdir(), "aof-ff9602-"));
      try {
        await mkdir(path.join(root, "graphify-out"), { recursive: true });
        await writeFile(
          path.join(root, "graphify-out", "graph.json"),
          JSON.stringify({
            nodes: [
              { id: "x", source_file: "src/x.mjs" },
              { id: "a", source_file: "src/a.mjs" },
            ],
            links: [{ source: "a", target: "x", relation: "IMPORTS", confidence: "EXPLICIT" }],
          }),
          "utf8",
        );
        const proposal = deriveStoryContract({
          projectRoot: root,
          subjects: ["src/x.mjs"],
          declaredFiles: ["src/x.mjs"],
          documents: [{ path: "SPEC.md", text: "`src/cited.mjs:9`" }],
        });
        const entries = [...proposal.reads, ...proposal.files];
        assert.ok(entries.length >= 4, "the drive produced entries from more than one source");
        for (const entry of entries) {
          assert.ok(PROPOSAL_REASONS.includes(entry.reason), `every proposed entry carries a reason from the closed set (saw "${entry.reason}")`);
          assert.equal(typeof entry.declared, "boolean", "…and states whether it is already the author's");
        }
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/96/01 FF-9602 (5) AN UNUSABLE GRAPH IS AN ANSWER — absent and unreadable each yield a citation-only proposal that says so, never an empty one",
    run: async () => {
      const rows = [
        { artifact: "absent", text: null, unavailable: "absent" },
        { artifact: "present but unreadable", text: "{ not json", unavailable: "unreadable" },
        // A third shape the normaliser itself refuses: `edges` where NetworkX writes `links`. It is
        // present and parses, and is still not a graph this build can read — reported as such
        // rather than as an empty edge set, which is the defect graph-normalize already forbids.
        { artifact: "a refused node_link_data shape", text: JSON.stringify({ nodes: [], edges: [] }), unavailable: "unreadable" },
      ];
      for (const row of rows) {
        const root = await mkdtemp(path.join(os.tmpdir(), "aof-ff9602-"));
        try {
          if (row.text != null) {
            await mkdir(path.join(root, "graphify-out"), { recursive: true });
            await writeFile(path.join(root, "graphify-out", "graph.json"), row.text, "utf8");
          }
          const proposal = deriveStoryContract({
            projectRoot: root,
            subjects: ["src/x.mjs"],
            documents: [{ path: "SPEC.md", text: "`src/cited.mjs:9`" }],
          });
          assert.equal(proposal.graph.available, false, `${row.artifact}: the proposal says the coupling was unavailable`);
          assert.equal(proposal.graph.unavailable, row.unavailable, `${row.artifact}: …and which way, because the repairs differ`);
          assert.equal(proposal.complete, false, `${row.artifact}: it is not a complete proposal`);
          assert.deepEqual(
            proposal.reads.map((entry) => entry.path),
            ["src/cited.mjs"],
            `${row.artifact}: the citation-derived entries are still proposed — never an empty answer`,
          );
        } finally {
          await rm(root, { recursive: true, force: true });
        }
      }
    },
  },
];
