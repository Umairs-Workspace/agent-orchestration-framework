import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { listCommands } from "../../../src/command-core.mjs";
import { FIELD_KINDS, loadLoops } from "../../../src/work/loops.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function declaredHere(source, symbol) {
  const name = escape(symbol);
  if (new RegExp(`export\\s+(?:async\\s+)?(?:function|const|let|class)\\s+${name}\\b`).test(source)) return true;
  const declaration = new RegExp(`(?:async\\s+)?(?:function|const|let|class)\\s+${name}\\b`).test(source);
  if (!declaration) return false;
  return [...source.matchAll(/export\s*\{([^}]*)\}\s*;/g)].some((match) =>
    match[1].split(",").some((part) => part.trim().split(/\s+as\s+/).at(-1) === symbol));
}

function fieldEntries(node) {
  return Object.values(node.fields).flatMap((value) => Array.isArray(value) ? value : [value]);
}

export const archTests = [
  {
    name: "arch/52 FF-5204: the real nine-record registry parses without error and no loop is aspirational",
    run: async () => {
      const model = await loadLoops(path.join(root, ".aof"));
      assert.equal(model.present, true);
      // A FLOOR, NOT AN EQUALITY. The rule is "the real registry parses and no loop is
      // aspirational" — a TENTH legitimate record is a milestone 53/55 deliverable, not a defect,
      // and an exact count would redden this gate for authoring a record. The non-vacuity the
      // count was standing in for is asserted directly: the sweep ran over a populated registry
      // carrying both kinds (01_vocabulary-and-records.feature:170-174).
      assert.ok(model.nodes.length >= 9, `the real registry resolved at least its nine records: ${model.nodes.length}`);
      assert.ok(model.nodes.some((n) => n.kind === "loop"));
      assert.ok(model.nodes.some((n) => n.kind === "actor"));
      assert.deepEqual(model.findings.filter((f) => f.severity === "error"), []);
      for (const node of model.nodes) {
        assert.equal(node.id, `${node.kind}:${path.basename(node.path, ".md")}`);
        for (const entry of fieldEntries(node)) assert.ok(FIELD_KINDS.has(entry.kind), `${node.id}/${entry.key}: typed field`);
        if (node.kind !== "loop") continue;
        for (const key of ["reference", "measurement", "actuator", "ceiling"]) assert.ok(Array.isArray(node.fields[key]) && node.fields[key].length > 0, `${node.id}/${key}`);
        for (const key of ["controlled", "reference", "measurement", "actuator"]) {
          const entries = Array.isArray(node.fields[key]) ? node.fields[key] : [node.fields[key]];
          assert.ok(entries.every((entry) => ["pointer", "prose", "phrase"].includes(entry.kind)));
        }
      }

      // THE LOADER NORMALISES — and this is the PREMISE FF-5205's purity claim rests on, so it is
      // asserted here rather than assumed. ADR-011 §7: "`periodic:15s` reaches the checks as
      // `{kind:"periodic", ms:15000}`", which is what lets the checks parse nothing at all
      // (01_vocabulary-and-records.feature:212). Unasserted, a `UNIT_MS.s = 1` slip or a dropped
      // `ms` is SILENT: `checkTimescale` would compute `NaN < 3 === false` and emit nothing, so
      // the timescale check would go quietly dead while every gate stayed green.
      let periodic = 0;
      for (const node of model.nodes) {
        const cadence = node.fields?.cadence;
        if (cadence?.kind !== "periodic") continue;
        periodic += 1;
        assert.ok(
          Number.isSafeInteger(cadence.ms) && cadence.ms > 0,
          `${node.id}: a periodic cadence arrives as a resolved positive-integer millisecond value, never a raw string for a consumer to parse (got ${JSON.stringify(cadence.ms)})`,
        );
      }
      assert.ok(periodic > 0, "at least one real record declares a periodic cadence, so the normalisation sweep is non-vacuous");
      // One EXACT value, against a real record, so the unit table itself is pinned and not just
      // the shape: `.aof/loops/mesh-assignment-reclaim.md` declares `periodic:15s` and is the
      // registry's sole periodic loop.
      const reclaim = model.nodes.find((node) => node.id === "loop:mesh-assignment-reclaim");
      assert.ok(reclaim, "the registry's sole periodic loop is present, so the exact-value pin below is not skipped");
      assert.equal(reclaim.fields.cadence.raw, "periodic:15s");
      assert.equal(reclaim.fields.cadence.ms, 15_000, "the `s` unit resolves to 1000 ms — the exact conversion, not merely an integer");
    },
  },
  {
    name: "arch/52 FF-5204: every real pointer resolves to a registered command or a symbol declared in its named module",
    run: async () => {
      const model = await loadLoops(path.join(root, ".aof"));
      const commands = new Set(listCommands().map((command) => command.id));
      let pointers = 0;
      for (const node of model.nodes) for (const entry of fieldEntries(node)) {
        if (entry.kind !== "pointer") continue;
        pointers += 1;
        if (entry.pointer.scheme === "command") assert.ok(commands.has(entry.pointer.operand), entry.raw);
        if (entry.pointer.scheme === "module") {
          const source = await readFile(path.join(root, entry.pointer.operand), "utf8");
          assert.ok(declaredHere(source, entry.pointer.symbol), `${entry.raw}: target declares symbol`);
        }
      }
      assert.ok(pointers > 10, "real pointer sweep is non-vacuous");
      assert.equal(declaredHere(await readFile(path.join(root, "src/terminal-providers.mjs"), "utf8"), "CliProvider"), true);
      assert.equal(declaredHere(await readFile(path.join(root, "src/command-core.mjs"), "utf8"), "loadWorkspace"), false);
      assert.equal(declaredHere(await readFile(path.join(root, "src/graphify.mjs"), "utf8"), "readGraph"), false);
    },
  },
];
