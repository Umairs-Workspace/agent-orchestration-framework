// FF-6308 — the pass over THIS REPOSITORY'S OWN declaration says something, and says it
// completely (63/ADR-001 §4, ADR-009 §3).
//
// A trigger vocabulary with no member that resolves is a declaration nobody can act on. It passes
// every test written over a fixture, reads as armed to anyone who opens it, and wakes nothing —
// which is the species this repository indicts by name everywhere else, arriving in the one
// milestone whose whole subject is waking something. So the claim is made over the file this
// repository actually ships and installs, with this workspace's real gate readings, and green
// tests over planted declarations do not discharge it.
//
// THIS IS THE MILESTONE'S ONE HOME FOR THAT CONDITION. Four stage-1 controls each holding a
// fragment of it would have been four partial claims nobody read together, and none of them could
// have been evaluated before the face existed to compose the family.
//
// IT HOLDS NO EXPECTED FIGURE. A stored count goes stale on the next edit to the very file this
// control reads, leaving a control that fails for a reason unrelated to what it was written to
// catch — so every expectation below is DERIVED from the declaration and from the registry, and
// each failure NAMES what was missing rather than reporting a count. "3 of 4 sources resolve"
// tells the person reading this at accept nothing about which one to go and fix.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stripComments } from "../../support/source-slice.mjs";

import { getCommand, invoke, listCommands } from "../../../src/command-core.mjs";
import { loadWorkspace } from "../../../src/work.mjs";
import { buildTriggerReport, triggerCommand, RESOLVED_TRIGGER_KEYS } from "../../../src/commands/trigger.mjs";
import { TRIGGER_SOURCES, bundledTriggerDeclaration, readTriggerDeclaration, triggerDeclarationPath } from "../../../src/work-trigger/declaration.mjs";
import { resolveTriggerLevel } from "../../../src/work-trigger/level.mjs";
import { LOOP_LEVELS, decideLoopScope } from "../../../src/work/loop.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const LOOP_ID = "work:loop";

// ONE pass over the real thing, shared by every leg, so each leg reads the same run an operator
// would get from `aof work trigger --json` in this repository.
async function realRun() {
  const workspace = await loadWorkspace(root);
  const report = await buildTriggerReport({}, { workspace, trigger: { registry: { getCommand, invoke } } });
  return { workspace, report };
}

// The readings the run actually obtained, in the shape the gate reads them under — empty when no
// declared trigger asked for a level the gate governs, which is itself a fact about the shipped
// declaration rather than a default.
function readingsOf(report) {
  return Object.fromEntries(
    (report.gate.readings ?? [])
      .filter((reading) => reading.present === true)
      .map((reading) => [reading.fact, reading.reading]),
  );
}

export const archTests = [
  {
    name: "architecture: FF-6308 the run is over the INSTALLED declaration this repository ships, not a fixture",
    async run() {
      const { report } = await realRun();
      const installed = triggerDeclarationPath(root);
      assert.equal(report.declaration.path, installed, `the answer names the declaration it read (${installed})`);
      // …and what it read is the installed copy a consumer of this tool would get: byte-identical
      // members to the bundled source `aof work update` installs from.
      // The bundled source is read through the module that OWNS its banner grammar, not by a
      // second copy of the strip. A JSONC affordance spelled twice is two readers of one file, and
      // the milestone this control belongs to indicts that shape by name.
      const declaration = await readTriggerDeclaration(root);
      const bundled = bundledTriggerDeclaration();
      assert.deepEqual(declaration.members, bundled.members, "the installed declaration is the one this tool ships");
      assert.deepEqual(report.declaration.declared, declaration.members.map((member) => member.id), "and every member it declares is what the run read");
      assert.ok(report.declaration.declared.length > 0, "the shipped declaration declares at least one trigger");
    },
  },
  {
    name: "architecture: FF-6308 every declared source has at least one declared trigger, and at least one under each RESOLVES",
    async run() {
      const { report } = await realRun();
      // Each gap is NAMED. A source with no trigger and a source whose triggers all refuse are
      // different failures and are reported as different sentences, never as one count.
      const undeclared = TRIGGER_SOURCES.filter((source) => !report.sources.some((row) => row.source === source && row.declared.length > 0));
      assert.deepEqual(undeclared, [], `every declared source has at least one declared trigger — missing: ${undeclared.join(", ")}`);
      const unresolved = report.sources.filter((row) => row.resolved.length === 0).map((row) => `${row.source} (${row.refused.map((entry) => `${entry.id}: ${entry.code}`).join("; ") || "nothing declared"})`);
      assert.deepEqual(unresolved, [], `at least one trigger under each declared source resolves — standing in the way: ${unresolved.join(" | ")}`);
      // The non-vacuity clause itself: the run resolved something, named.
      assert.ok(report.resolved.length > 0, "the shipped declaration resolves something rather than reading as armed and waking nothing");
      for (const row of report.resolved) {
        assert.ok(TRIGGER_SOURCES.includes(row.trigger.source), `${row.trigger.id} is named with the source it was declared under`);
      }
    },
  },
  {
    name: "architecture: FF-6308 every declared trigger resolves or refuses, and none does neither",
    async run() {
      const { report } = await realRun();
      const resolved = report.resolved.map((row) => row.trigger.id);
      const refused = report.refused.map((row) => row.trigger?.id ?? `(no trigger: ${row.code})`);
      const neither = report.declaration.declared.filter((id) => !resolved.includes(id) && !refused.includes(id));
      assert.deepEqual(neither, [], `every declared trigger is answered for — neither resolved nor refused: ${neither.join(", ")}`);
      const both = report.declaration.declared.filter((id) => resolved.includes(id) && refused.includes(id));
      assert.deepEqual(both, [], `and none is answered for twice — both: ${both.join(", ")}`);
      // Every refusal carries a code, and a refusal of a DECLARED level names the failing half.
      const codeless = report.refused.filter((row) => typeof row.code !== "string").map((row) => row.trigger?.id ?? "(no trigger)");
      assert.deepEqual(codeless, [], `every refusal carries a code — carrying none: ${codeless.join(", ")}`);
      const unnamed = report.refused
        .filter((row) => row.code === "loop-level-gate" && !(Array.isArray(row.failingHalves) && row.failingHalves.length > 0))
        .map((row) => row.trigger?.id);
      assert.deepEqual(unnamed, [], `every level refusal names the failing half of its gate — naming none: ${unnamed.join(", ")}`);
    },
  },
  {
    name: "architecture: FF-6308 every resolved scope resolves through LOOP_SCOPE_FORMS and every resolved argv names a REGISTERED command",
    async run() {
      const { report } = await realRun();
      const route = getCommand(LOOP_ID).cli.route;
      const badScopes = report.resolved.filter((row) => decideLoopScope(row.scope).admitted !== true).map((row) => `${row.trigger.id} (${row.scope})`);
      assert.deepEqual(badScopes, [], `every resolved scope resolves through the loop's own forms — not admitted: ${badScopes.join(", ")}`);
      for (const row of report.resolved) {
        assert.deepEqual(row.argv.slice(0, route.length), [...route], `${row.trigger.id}: its argv begins with the loop's own route`);
        // Resolved through the registry rather than spelled: the leading tokens are looked back up
        // as a route, and the command they name must be one the registry answers for.
        const named = listCommands().find((command) => (command.cli?.route ?? []).join(" ") === row.argv.slice(0, route.length).join(" "));
        assert.ok(named != null, `${row.trigger.id}: the command its argv names (${row.argv.slice(0, route.length).join(" ")}) is one the registry answers for`);
        assert.ok(getCommand(named.id) != null, `${row.trigger.id}: and getCommand resolves it`);
        for (const token of row.argv) assert.equal(typeof token, "string", `${row.trigger.id}: every argv token is a token`);
      }
    },
  },
  {
    name: "architecture: FF-6308 no resolved trigger carries a level this workspace's current gate would refuse, and none carries an admission",
    async run() {
      const { report } = await realRun();
      const facts = readingsOf(report);
      for (const row of report.resolved) {
        assert.ok(LOOP_LEVELS.includes(row.level), `${row.trigger.id}: its level is one the loop's own vocabulary carries`);
        // Put back to the one gate home, over the readings this run actually obtained.
        const again = resolveTriggerLevel({ id: row.trigger.id, level: row.level }, facts);
        assert.equal(again.resolved, true, `${row.trigger.id}: its level is one this workspace's gate would not refuse (${JSON.stringify(again)})`);
        assert.deepEqual(Object.keys(row).sort(), [...RESOLVED_TRIGGER_KEYS].sort(), `${row.trigger.id}: it carries no admission that the run may proceed`);
      }
      assert.equal(report.preflight.isAdmission, false, "and the run says once, for itself, that it admits nothing");
      assert.equal(report.preflight.gatedAgainAt, LOOP_ID, "naming the command that resolves the gate again when it fires");
    },
  },
  {
    name: "architecture: FF-6308 the run over this repository answers cleanly, and this control holds no expected figure",
    async run() {
      const { report } = await realRun();
      assert.equal(report.failure, undefined, `the run over the shipped declaration produced an answer (${JSON.stringify(report.failure ?? null)})`);
      assert.equal(triggerCommand.cli.exit(report), 0, "and exits successfully");
      assert.deepEqual(report.gaps, [], `the shipped declaration carries no named gap — ${report.gaps.map((gap) => gap.message).join(" | ")}`);
      // NO STORED FIGURE. Every expectation in this file is derived from the declaration, from
      // `TRIGGER_SOURCES` and from the registry, so adding a fifth trigger to `.aof/triggers.jsonc`
      // changes nothing here. Asserted over this control's own source, because a count that crept
      // back in is exactly the defect that would make it fail for the wrong reason.
      // Comment-stripped through the ONE home (TECH_DEBT 24 and 57): a stripper written beside
      // that one is a second home whose output agrees today and diverges the first time either is
      // fixed — and this file's two sibling controls already read it from there.
      const own = await readFile(new URL(import.meta.url), "utf8");
      const body = stripComments(own);
      // An EMPTINESS test (`… === 0`, `… > 0`) is a claim about whether a set has members and
      // survives any edit to the declaration; a NON-ZERO expected count is the thing that goes
      // stale, so that is what is banned.
      const figures = [...body.matchAll(/(?:length|size|count)\s*(?:===|==|>=|<=|>|<)\s*([1-9]\d*)/gu)].map((match) => match[0]);
      assert.deepEqual(figures, [], `this control stores no expected count — found: ${figures.join(", ")}`);
      assert.match(body, /length\s*(?:===|>)\s*0/u, "the detector is over source that really does hold emptiness tests, so its silence is a reading rather than an empty search");
    },
  },
];
