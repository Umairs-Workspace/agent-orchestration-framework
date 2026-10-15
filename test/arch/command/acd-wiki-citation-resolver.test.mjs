// FF-16101 — "The wiki probe uses the shared citation grammar/resolver and stays at the impure
// command boundary; no second rename reader or executed cited source." 161/ADR-001.
//
// WHAT WOULD QUIETLY UNDO THIS: a probe that re-derives the rename chain (a second rename reader —
// 119/ADR-003's species, at the scale of every wiki page); a probe that spawns git for itself rather
// than taking the map the command edge read once; a probe that imports the module it is checking
// (cited source is existence-checked, never executed); a probe pulled into the pure item engine; and
// a command edge that stops calling it, which leaves a green module nobody runs.
//
// Each claim is a pure function of source text, so the negative probe below can mutate the text and
// observe the failure the control exists to produce. The shipped sources are held to the same
// functions, and the sweep refuses to pass by reading nothing.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stripComments } from "../../support/source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const PROBE = "packages/work/src/wiki-citations.mjs";
const EDGE = "packages/work/src/commands/doctor.mjs";
const SPINE = "packages/work/src/doctor/index.mjs";

// The probe's violations, each named. Empty means the probe honours FF-16101.
export function probeViolations(source) {
  const code = stripComments(source);
  const found = [];
  if (!/import \{[^}]*\bresolveCitedPath\b[^}]*\} from "\.\/cited-path-resolve\.mjs"/u.test(code)) found.push("does not import the shared resolver");
  if (!/\bresolveCitedPath\(/u.test(code)) found.push("never calls the shared resolver");
  if (!/import \{[^}]*\bpathCitationsIn\b[^}]*\} from "\.\/audit\/controls\.mjs"/u.test(code)) found.push("does not use the shared citation grammar");
  // A second rename reader: its own parse, map, chain walk or git read.
  for (const rival of ["parseRenameRecords", "buildRenameMap", "resolveThroughRenames", "RENAME_LOG_ARGS", "RENAME_LEDGER_PATH", "rename-ledger"]) {
    if (code.includes(rival)) found.push(`reads renames itself (${rival})`);
  }
  if (/while\s*\([^)]{0,120}\.has\(/u.test(code)) found.push("walks a rename chain of its own");
  if (/rename\w*\??\.(?:get|has)\(/iu.test(code)) found.push("looks a citation up in a rename map directly");
  // Nothing cited is run, and nothing is spawned: the map arrives as data.
  for (const door of ["child_process", "execFile", "spawn", "execSync", "import(", "require(", "eval(", "new Function"]) {
    if (code.includes(door)) found.push(`names an execution door (${door})`);
  }
  return found;
}

// The command edge's violations: the probe must be called, with the snapshot's map.
export function edgeViolations(source) {
  const code = stripComments(source);
  const found = [];
  if (!/import \{[^}]*\bprobeWikiCitations\b[^}]*\} from "\.\.\/wiki-citations\.mjs"/u.test(code)) found.push("does not import the probe");
  // 160/ADR-007 — the edge probes over the map the snapshot loaded, and loads the SAME history only on a miss.
  if (!/probeWikiCitations\(\{[^}]*renameMap[^}]*\}\)/u.test(code) || !code.includes("snapshot.renameMap") || !code.includes("history.load()")) found.push("does not call the probe with the history read for the snapshot");
  if ((code.match(/readRenameMap\(/gu) ?? []).length !== 2) found.push("reads history more than once for one doctor run");
  return found;
}

export function spineViolations(source) {
  return /wiki-citations|probeWikiCitations/u.test(stripComments(source)) ? ["the pure item engine names the impure probe"] : [];
}

const read = (rel) => readFile(path.join(root, rel), "utf8");

export const archTests = [
  {
    name: "arch/161 FF-16101: the wiki probe uses the shared grammar and resolver, with no second rename reader and no executed source",
    run: async () => {
      const source = await read(PROBE);
      assert.ok(stripComments(source).length > 500, "the probe source was actually read");
      assert.deepEqual(probeViolations(source), []);
    },
  },
  {
    name: "arch/161 FF-16101: the probe stays at the impure command boundary, called once with the shared history",
    run: async () => {
      const edge = await read(EDGE);
      assert.deepEqual(edgeViolations(edge), []);
      const spine = await read(SPINE);
      assert.ok(stripComments(spine).length > 500, "the item engine source was actually read");
      assert.deepEqual(spineViolations(spine), []);
    },
  },
  {
    name: "arch/161 FF-16101: the RED PROBES — a resolver bypass and a severed command call are each detected",
    run: async () => {
      const probe = await read(PROBE);
      const edge = await read(EDGE);

      // Mutation 1 — bypass the resolver: answer from a hand-walked rename map instead.
      const bypass = probe.replace(/resolveCitedPath\(normalized, \{[^}]*\}\)\.resolved/u, "(renameMap.get(normalized) !== undefined)").replace(/import \{ resolveCitedPath \} from "\.\/cited-path-resolve\.mjs";/u, "");
      assert.notEqual(bypass, probe, "the mutation changed the probe");
      const bypassed = probeViolations(bypass);
      assert.ok(bypassed.includes("does not import the shared resolver") && bypassed.includes("never calls the shared resolver"), `a resolver bypass is red: ${bypassed.join("; ")}`);

      // Mutation 2 — a second rename reader in the probe.
      const rival = `${probe}\nimport { parseRenameRecords } from "./cited-path-resolve.mjs";\n`;
      assert.ok(probeViolations(rival).some((v) => v.includes("parseRenameRecords")), "a second rename reader is red");

      // Mutation 3 — execute the cited source.
      const executes = `${probe}\nawait import(path.join(projectRoot, "src/x.mjs"));\n`;
      assert.ok(probeViolations(executes).some((v) => v.includes("import(")), "executing cited source is red");

      // Mutation 4 — sever the command call.
      const severed = edge.replace(/if \(history != null\) \{[\s\S]*?findings\.push\(\.\.\.cited\);\s*\}/u, "");
      assert.notEqual(severed, edge, "the mutation removed the call");
      assert.ok(edgeViolations(severed).includes("does not call the probe with the history read for the snapshot"), "a disconnected command call is red");

      // Mutation 5 — a second history read at the edge.
      const twice = edge.replace("await history.load()", "await readRenameMap(ctx.workspace.projectRoot).load()");
      assert.notEqual(twice, edge, "the mutation added a read");
      assert.ok(edgeViolations(twice).includes("reads history more than once for one doctor run"), "a second history read is red");

      // The pristine sources are green, so the red above is the mutation's own.
      assert.deepEqual(probeViolations(probe), []);
      assert.deepEqual(edgeViolations(edge), []);
    },
  },
];
