// FF-6908 (ADR-006 + ADR-007): slots are counts over existing assignment rows,
// parking uses the existing needs-input code, and milestone 69 does not reshape
// run-store's keys, states, or transitions.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { functionBody, stripComments } from "../../support/source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const RUN_RECORD_KEYS_AT_M68 = [
  "runId", "itemRef", "state", "attempt", "outcome", "sessionId", "brief",
  "createdAt", "updatedAt", "failureReason", "heartbeatAt", "retryOf",
  "reclaimedAt", "node", "resumeAfter", "spend",
];
// 131/ADR-003 §3 supersedes the m68 freeze by the SAME additive discipline 68/ADR-001 used: ONE key,
// `asks`, appended last — the questions the run's session asked a human, written only by the run's
// owner. It is not a slot, a lease or a claim, which is what this control exists to keep off the
// record; every other later claim still rides the opaque brief.
const RUN_RECORD_KEYS_AT_M131 = [...RUN_RECORD_KEYS_AT_M68, "asks"];
const dispatchFiles = [
  "src/work/dispatch.mjs",
  "src/commands/dispatch.mjs",
  "src/mesh/assignment-reclaim.mjs",
  "src/commands/mesh/terminal-resume.mjs",
  "src/assignment-record.mjs",
];

async function sourceModules(dir = path.join(root, "src")) {
  const modules = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) modules.push(...await sourceModules(target));
    else if (entry.name.endsWith(".mjs")) modules.push(target);
  }
  return modules;
}

function persistenceProblems(units) {
  const problems = [];
  const patterns = [
    [/(?:mesh|slot)[_-]?(?:lease|claim)/iu, "a mesh/slot lease or claim symbol"],
    [/CREATE\s+TABLE[^;\n]*(?:lease|claim|slot)/iu, "a lease/claim/slot table"],
    [/(?:readFile|writeFile|appendFile|open|mkdir)\s*\([^;\n]*(?:lease|claim|slot)/iu, "a lease/claim/slot file"],
    [/(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+[`"']?[A-Za-z0-9_]*(?:lease|claim|slot)/iu, "a persisted lease/claim/slot row"],
  ];
  for (const { rel, source } of units) {
    const code = stripComments(String(source ?? ""));
    for (const [pattern, label] of patterns) {
      if (pattern.test(code)) problems.push(`${rel}: ${label}`);
    }
  }
  return problems;
}

export const archTests = [
  {
    name: "arch/69 FF-6908: dispatch derives slots from assignment rows without persistence writes",
    run: async () => {
      const listing = await Promise.all(dispatchFiles.map(async (rel) => ({
        rel,
        source: await readFile(path.join(root, rel), "utf8"),
      })));
      assert.deepEqual(persistenceProblems(listing), []);

      const mesh = stripComments(listing.find((entry) => entry.rel.endsWith("mesh/assignment-reclaim.mjs")).source);
      assert.match(mesh, /countDispatchSlotsByTarget\(rows\)/, "the slot derives from global assignment rows already read by the tick");
      const dispatchBody = functionBody(mesh, "export async function runControlDispatchReclaimTick");
      assert.ok(dispatchBody != null, "the production dispatch/reclaim function is structurally readable");
      assert.doesNotMatch(dispatchBody, /\b(?:INSERT|UPDATE|CREATE|writeFile|appendFile)\b/iu, "admission adds no persistence write");
    },
  },
  {
    name: "arch/69 FF-6908: the run record's top-level schema is milestone 68's plus 131's asks, appended last; later claims ride brief",
    run: async () => {
      const source = (await readFile(path.join(root, "src", "run-store.mjs"), "utf8")).replaceAll("\r\n", "\n");
      const body = functionBody(stripComments(source), "function buildRecord");
      assert.ok(body != null, "the record constructor remains structurally readable");
      const keys = [...body.matchAll(/^\s+([A-Za-z][A-Za-z0-9]*)(?=[:,])/gm)].map((match) => match[1]);
      assert.deepEqual(keys.slice(0, RUN_RECORD_KEYS_AT_M68.length), RUN_RECORD_KEYS_AT_M68, "the sixteen m68 keys keep their names and order");
      assert.deepEqual(keys, RUN_RECORD_KEYS_AT_M131, "no later story reshapes the frozen top-level run record beyond 131's asks");
      assert.doesNotMatch(body, /provenance|anchorReadings/, "claim additions ride the opaque brief rather than widening the run record");

      const planted = body.replace("    failureReason: null,", "    failureReason: null,\n    slotLease: null,");
      assert.notEqual(planted, body, "the run-record-key plant changed the constructor");
      const plantedKeys = [...planted.matchAll(/^\s+([A-Za-z][A-Za-z0-9]*)(?=[:,])/gm)].map((match) => match[1]);
      assert.notDeepEqual(plantedKeys, RUN_RECORD_KEYS_AT_M131, "a planted top-level key trips the schema control");
    },
  },
  {
    name: "arch/69 FF-6908: no source module introduces mesh slot lease, claim, or per-slot persistence",
    run: async () => {
      const units = [];
      for (const file of await sourceModules()) {
        units.push({ rel: path.relative(root, file).replaceAll("\\", "/"), source: await readFile(file, "utf8") });
      }
      assert.deepEqual(persistenceProblems(units), [], "a slot is a count over assignment rows, never a persisted lease or claim");
    },
  },
  {
    name: "arch/69 FF-6908 self-check: planted lease symbols, tables, files, and rows are rejected",
    run: () => {
      const plants = [
        "const meshLease = {};",
        "db.exec('CREATE TABLE slot_leases (id TEXT)');",
        "await writeFile(slotClaimPath, value);",
        "db.prepare('INSERT INTO slot_claims (id) VALUES (?)');",
      ];
      for (const [index, source] of plants.entries()) {
        assert.ok(persistenceProblems([{ rel: `plant-${index}.mjs`, source }]).length > 0, `plant ${index + 1} trips the real-tree detector`);
      }
      assert.deepEqual(persistenceProblems([{ rel: "comments.mjs", source: "// const meshLease = {};" }]), [], "comments do not create persistence");
      assert.deepEqual(persistenceProblems([{ rel: "good.mjs", source: "countDispatchSlotsByTarget(rows);" }]), []);
    },
  },
];
