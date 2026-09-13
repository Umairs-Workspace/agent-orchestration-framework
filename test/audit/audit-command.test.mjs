// milestone 59 / story 04 — THE AUDIT FACE, behaviourally.
//
// Contracts: `wiki/work/59_milestone_audit-loops/stories/04_story_the-audit-face/tasks/
// {00_one-command-over-the-instruments, 01_bad-news-does-not-travel-through-the-culprit,
//  02_the-escalation-bypass, 03_the-day-one-auditor}.feature`.
//
// WHAT THIS SUITE DRIVES, AND WHAT IT DELIBERATELY DOES NOT. The subject is the FACE — one command
// over three lanes, the shape of its report, the exit decision, and the addressing. The two impure
// lanes (the census and the evidence re-run) each start a bounded child process per unit of work;
// a suite that drove them for real would be this repository re-running its own test tree inside its
// own test tree, so they are INJECTED at the seam `runAudit` already exposes for the purpose. The
// lanes' own behaviour is 59/01's and 59/02's suites, and their assembly is proved here.
//
// THE REGISTRY FIXTURES ARE AUTHORED AS RECORD TEXT, never as parsed objects: the addressing rules
// are claims about what the REGISTRY says, and a hand-built model would let this suite agree with
// itself about a grammar the loader might refuse.
import assert from "node:assert/strict";
import path from "node:path";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { auditCommand, anchorWindowFromConfig, resolveRoleRouting, DEFAULT_ANCHOR_STALE_DAYS } from "../../src/commands/audit.mjs";
import { AOF_HOOK_MARKER } from "../../src/claude-settings.mjs";
import { runHookWiring } from "../../src/work-audit/hook-wiring.mjs";
import { runDeclaredBounds } from "../../src/work-audit/declared-bounds.mjs";
import { getCommand, listCommands } from "../../src/command-core.mjs";
import { deriveRouteTable } from "../../src/spine/face.mjs";
import { loadLoops } from "../../src/work/loops.mjs";
import {
  AUDITABLE_CODES,
  AUDIT_ENVELOPE_KEYS,
  AUDIT_FACE_CODES,
  ESCALATING_CODES,
  REPORT_LANES,
  addresseesFor,
  auditorsOf,
  canReceive,
  escalates,
  escalationActorOf,
  instrumentFor,
  ownersOfInstrument,
  referenceSettersOf,
  resolveAddressees,
  runAudit,
} from "../../src/work-audit/report.mjs";
import { CENSUS_SWEEPS, sweepLimits } from "../../src/work-audit/census.mjs";
import { LIMIT_KEYS, limitRecord } from "../../src/work-audit/reads.mjs";
import { withLoopRegistry } from "../support/loop-registry-fixture.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BUNDLE = path.join(repoRoot, "src", "bundle");
// Named explicitly so FF-5809's sweep SEES this file and classifies it (lane 3 — it loads the
// registry in place and copies nothing into a temp fixture).
const SHIPPED_LOOPS = path.join(repoRoot, "src", "bundle", "loops");
const NOW = Date.UTC(2026, 7, 30);
const WINDOW = 90 * 86_400_000;

// ── THE FIXTURE REGISTRY ─────────────────────────────────────────────────────────────────────
//
// `actor:steward` is the escalation actor; `actor:chief` sets `loop:gauged`'s reference, so a
// finding about `loop:gauged`'s instruments has a reference-owner that is NOT the loop. `loop:lone`
// has an instrument of its own and nobody sets its reference, which is the second escalation path.
const record = (lines) => `---\n${lines.join("\n")}\n---\n# fixture\n`;

const REGISTRY = Object.freeze({
  "steward.md": record(["id: actor:steward", "kind: actor", "title: Steward", "ground: exogenous"]),
  "chief.md": record(["id: actor:chief", "kind: actor", "title: Chief", "ground: exogenous", "target-setting: [loop:gauged]"]),
  "gauged.md": record([
    "id: loop:gauged", "kind: loop", "title: Gauged",
    "controlled: throughput",
    "reference: [command:work:next]",
    "measurement: [module:src/run-store.mjs#attempts]",
    "actuator: [command:work:run-start]",
    "cadence: event:per-item",
    "ceiling: [config:work.autonomous.maxAttempts]",
    "owner: actor:chief",
    "optimizing: false",
    "layer: operational",
  ]),
  "lone.md": record([
    "id: loop:lone", "kind: loop", "title: Lone",
    "controlled: drift",
    "reference: [command:work:next]",
    "measurement: [module:src/run-store.mjs#isStale]",
    "actuator: [command:work:run-complete]",
    "cadence: event:per-item",
    "ceiling: none",
    "owner: unknown",
    "optimizing: false",
    "layer: operational",
  ]),
  "probe.md": record([
    "id: auditor:probe", "kind: auditor", "title: Probe auditor",
    "audits: [module:src/run-store.mjs#attempts, loop:gauged, loop:lone]",
    "measurement: [command:work:audit]",
    "cadence: event:per-milestone",
    "escalation: actor:steward",
    "reporting: [actor:steward]",
  ]),
});

const withRegistry = (run) => withLoopRegistry(REGISTRY, async (fixture) => {
  const model = await loadLoops(fixture.workDir);
  assert.deepEqual(model.findings.filter((finding) => finding.severity === "error"), [], "the fixture registry itself is clean");
  return run(model, fixture);
});

// ── INJECTED LANES ───────────────────────────────────────────────────────────────────────────
//
// Each returns exactly the shape the real lane does: findings, a complete read record, and (for
// the census) the registered set the face joins into the evidence lane.
const read = (sweep, count, floor = 1) => ({ sweep, root: "test", what: `the ${sweep} population`, basis: "disk", count, floor });

const censusLane = (findings = []) => async () => ({ findings, reads: [read("suite-population", 9, 1)], registered: [] });
const evidenceLane = (findings = [], seen = []) => async ({ items, scope }) => {
  seen.push({ items: items.map((item) => item.ref), scope });
  return { findings, reads: [read("register-rows", Math.max(items.length, 1), 1)], limits: [] };
};
const checksLane = (findings = []) => () => ({ findings, reads: [read("anchor-freshness", 4, 1)] });

// MILESTONE 77's four, stubbed on the same terms and for the same reason: the subject of this suite
// is the FACE's composition — which lanes ran, how a finding is addressed, what `--strict` changes —
// and a lane that really read this repository would make every count in it a fact about the tree.
// Each lane's own behaviour is driven in its own story's suite.
const promptLayerLane = (findings = []) => async () => ({ findings, reads: [read("prompt-capability", 7, 1)], limits: [] });
const hookWiringLane = (findings = []) => () => ({ findings, reads: [read("hook-entries", 3, 1)], limits: [] });
const seamLivenessLane = (findings = []) => async () => ({ findings, reads: [read("seam-source", 12, 1)], limits: [] });
const declaredBoundsLane = (findings = []) => () => ({ findings, reads: [read("declared-bound-loops", 5, 1)], limits: [] });

const finding = (code, severity, anchor) => ({ code, severity, path: anchor, message: `${code} was raised about ${anchor} by a probe lane` });

const audit = (model, overrides = {}) => runAudit({
  repoRoot,
  model,
  items: [],
  now: NOW,
  anchorWindowMs: WINDOW,
  census: censusLane(),
  evidence: evidenceLane(),
  checks: checksLane(),
  promptLayer: promptLayerLane(),
  hookWiring: hookWiringLane(),
  seamLiveness: seamLivenessLane(),
  declaredBounds: declaredBoundsLane(),
  ...overrides,
});

// The face's own adapters, driven exactly as the generic CLI face drives them.
const renderOf = (result) => auditCommand.cli.render(result, {});
const jsonOf = (result, strict = false) => auditCommand.cli.json(result, { options: { strict } });
const exitOf = (result, strict = false) => auditCommand.cli.exit(result, { options: { strict } });

// Every `severity: code — …` line the human face emits, as codes. The human report is prose plus
// per-finding lines, so the codes are cut off the lines that carry a severity prefix.
const renderedCodes = (text) => text
  .split("\n")
  .map((line) => line.match(/^(?:warn|error): ([a-z-]+) — /u))
  .filter(Boolean)
  .map((match) => match[1]);

export const auditCommandTests = [
  // ───────────────────────────────────────────────────────────────────────────────────────────
  // 00_one-command-over-the-instruments.feature
  // ───────────────────────────────────────────────────────────────────────────────────────────
  {
    name: "59/04 00.1: the command runs every registered lane, and the report says which lanes ran",
    run: async () => {
      await withRegistry(async (model) => {
        const report = await audit(model);
        assert.equal(report.lanes.length, REPORT_LANES.length, `every registered lane is in the report (${REPORT_LANES.length})`);
        assert.deepEqual(report.lanes.map((lane) => lane.id), REPORT_LANES.map((lane) => lane.id), "…in the registry's own order");
        for (const lane of report.lanes) {
          assert.equal(lane.ran, true, `${lane.id}: ran`);
          assert.equal(lane.why, null, `${lane.id}: has no reason for not running`);
          assert.ok(lane.reads.length >= 1, `${lane.id}: contributed a read record — a clean lane still says how much it read`);
        }
        assert.equal(report.summary.lanes, REPORT_LANES.length, "the summary counts the lanes that ran");
        // …AND THE REPORT NAMES THEM IN THE HUMAN FACE TOO, which is where an operator reads it.
        const rendered = renderOf(report);
        for (const lane of REPORT_LANES) assert.match(rendered, new RegExp(`lane ${lane.id} — ran`, "u"), `${lane.id} is named in the render`);
      });
    },
  },
  {
    name: "59/04 00.2: a finding carries the shape the health command's findings carry — a code, a severity, a path and a message",
    run: async () => {
      await withRegistry(async (model) => {
        const report = await audit(model, { census: censusLane([finding("audit-suite-unregistered", "error", "test/arch/probe.test.mjs")]) });
        assert.equal(report.findings.length, 1, "the probe lane produced one finding");
        const [raised] = report.findings;
        for (const key of ["code", "severity", "path", "message"]) {
          assert.equal(typeof raised[key], "string", `${key} is present and is a string — doctor's envelope, reused unchanged (15/ADR-001)`);
          assert.ok(raised[key].length > 0, `${key} is not empty`);
        }
        assert.ok(["warn", "error"].includes(raised.severity), "exactly doctor's two severities — there is no ok/info row");
        assert.equal(path.isAbsolute(raised.path), true, "the path is the RAW ABSOLUTE, basis-neutral: no projection inside run (08/ADR-002)");
        assert.equal(raised.path, path.join(repoRoot, "test", "arch", "probe.test.mjs"), "…resolved against the repository root");
        // The CLI face is what relativises, and it is the only place that does.
        assert.equal(jsonOf(report).findings[0].path, path.relative(process.cwd(), raised.path));
      });
    },
  },
  {
    name: "59/04 00.3: a scope narrows what is audited, and the report names the scope it applied",
    run: async () => {
      await withRegistry(async (model) => {
        const seen = [];
        // Each carries a register text, because a scoped run over items that declare none is a
        // DIFFERENT case (covered by 00.3b) and would legitimately skip the item lane.
        const withRegister = (ref) => ({ ref, dir: `/w/${ref}`, docTexts: { "ARCHITECTURE.md": "# a register document" } });
        const items = [withRegister("03"), withRegister("04")];
        const report = await audit(model, { items, scope: "03", evidence: evidenceLane([], seen) });

        assert.deepEqual(report.scope.matched, ["03"], "only the scoped item is in the population");
        assert.deepEqual(seen, [{ items: ["03"], scope: "03" }], "…and the item lane was handed that item alone");
        // ONLY THAT ITEM'S INSTRUMENTS. A repository-wide lane audits instruments no single item
        // owns, so it does not run under an item scope — and it SAYS so rather than being absent.
        for (const lane of report.lanes) {
          assert.equal(lane.ran, lane.scoped, `${lane.id}: ran only if it is an item-scoped lane`);
          if (!lane.ran) assert.match(lane.why, /audits that item's instruments and no others/u, `${lane.id}: says why`);
        }
        assert.equal(report.scope.requested, "03", "the report names the scope it applied");
        assert.equal(report.scope.applied, true);
        assert.match(renderOf(report), /Audit scoped to "03"/u, "…in the human face too");
      });
    },
  },
  {
    name: "59/04 00.4: a scope that matches nothing reports that nothing matched, and does not fail",
    run: async () => {
      await withRegistry(async (model) => {
        const report = await audit(model, { items: [{ ref: "03", dir: "/w/03" }], scope: "99" });
        assert.deepEqual([...report.findings], [], "an empty report rather than an error");
        assert.equal(report.scope.nothingMatched, true, "…and it says nothing matched");
        assert.deepEqual([...report.scope.matched], []);
        for (const lane of report.lanes) {
          assert.equal(lane.ran, false, `${lane.id}: nothing ran`);
          assert.match(lane.why, /matched no item/u);
        }
        // NOT `audit-ran-on-nothing`. A scope that matches nothing is the operator's typo; a lane
        // that read nothing is the instrument going blind. Reporting the first as the second is
        // exactly the substitution ADR-004 §1 exists to forbid, one level up.
        assert.deepEqual(report.findings.filter((entry) => entry.code === "audit-ran-on-nothing"), []);
        assert.equal(exitOf(report, false), 0, "it does not fail");
        assert.equal(exitOf(report, true), 0, "…not even under strict, because there is nothing to gate on");
        assert.match(renderOf(report), /Nothing matched "99"/u);
      });
    },
  },
  {
    name: "59/04 00.5: the machine-readable face carries every finding the human one does, and no other",
    run: async () => {
      await withRegistry(async (model) => {
        const report = await audit(model, {
          census: censusLane([finding("audit-suite-unregistered", "error", "test/arch/a.test.mjs")]),
          evidence: evidenceLane([finding("evidence-still-failing", "warn", "wiki/work/03/ARCHITECTURE.md")]),
          checks: checksLane([finding("anchor-stale", "warn", "does-not-matter.md")]),
        });
        assert.equal(report.findings.length, 3, "three lanes, three findings");
        const human = renderedCodes(renderOf(report)).sort();
        const machine = jsonOf(report).findings.map((entry) => entry.code).sort();
        assert.deepEqual(machine, human, "every finding in the human output is present in the machine one, and no finding is present that the human output omits");
        assert.equal(human.length, 3, "non-vacuous: both faces really carried three");
      });
    },
  },
  {
    name: "59/04 00.6: the exit decision lives on the face — an error finding is REPORTED and exits successfully",
    run: async () => {
      await withRegistry(async (model) => {
        const report = await audit(model, { census: censusLane([finding("audit-suite-unregistered", "error", "test/arch/a.test.mjs")]) });
        assert.equal(report.summary.error, 1, "an error-severity finding was produced");
        assert.ok(renderedCodes(renderOf(report)).includes("audit-suite-unregistered"), "it reports the finding");
        assert.equal(exitOf(report, false), 0, "…and exits successfully without being asked to be strict");
        assert.equal(jsonOf(report, false).healthy, true, "…which the machine face agrees with");
      });
    },
  },
  {
    name: "59/04 00.7: strict mode fails on an error finding, and reports identically to a non-strict run",
    run: async () => {
      await withRegistry(async (model) => {
        const report = await audit(model, { census: censusLane([finding("audit-suite-unregistered", "error", "test/arch/a.test.mjs")]) });
        assert.equal(exitOf(report, true), 1, "strict exits unsuccessfully");
        assert.deepEqual(
          jsonOf(report, true).findings, jsonOf(report, false).findings,
          "the findings it reports are identical to the ones it reports without strict mode — `--strict` is a gate, never a mutation of the result (15/ADR-002)",
        );
        assert.equal(jsonOf(report, true).healthy, false);
        assert.equal(jsonOf(report, true).strict, true);
      });
    },
  },
  {
    name: "59/04 00.8: strict mode does not fail on a warning",
    run: async () => {
      await withRegistry(async (model) => {
        const report = await audit(model, {
          checks: checksLane([finding("anchor-stale", "warn", "a.md"), finding("loop-unconsulted", "warn", "b.md")]),
        });
        assert.equal(report.summary.error, 0, "every finding is a warning");
        assert.equal(report.summary.warn, 2);
        assert.equal(exitOf(report, true), 0, "strict promotes nothing — warnings are advisory on both sides of the flag");
        assert.equal(jsonOf(report, true).healthy, true);
      });
    },
  },
  {
    name: "59/04 00.9: the command is registered where every other command is registered, and the verb resolves to it",
    run: async () => {
      const command = getCommand("work:audit");
      assert.ok(command != null, "the audit command is a member of the registry");
      assert.equal(command, auditCommand, "…and it is this module's command, not a second copy");
      assert.ok(listCommands().includes(auditCommand), "…listed by the same door every face reads");
      assert.deepEqual(command.cli.route, ["work", "audit"]);
      assert.equal(deriveRouteTable(listCommands()).get("work audit"), command, "the verb the operator types resolves to it");
      // The face's own knobs, since a registered command with no adapter is not reachable.
      for (const key of ["argv", "render", "json", "exit"]) {
        assert.equal(typeof command.cli[key], "function", `cli.${key} is a function`);
      }
      assert.deepEqual(command.cli.argv(["59"]), { scope: "59" }, "the positional is the scope");
      assert.deepEqual(command.cli.argv([]), {}, "…and it is optional");
      // The window the impure edge supplies, since the checks leaf may hold no duration literal.
      assert.equal(anchorWindowFromConfig({}), DEFAULT_ANCHOR_STALE_DAYS * 86_400_000);
      assert.equal(anchorWindowFromConfig({ work: { audit: { anchorStaleDays: 30 } } }), 30 * 86_400_000);
    },
  },

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // 01_bad-news-does-not-travel-through-the-culprit.feature
  // ───────────────────────────────────────────────────────────────────────────────────────────
  {
    name: "59/04 01.1: a finding names the instrument it concerns",
    run: async () => {
      await withRegistry(async (model, fixture) => {
        const report = await audit(model, {
          checks: checksLane([finding("anchor-stale", "warn", fixture.pathOf("gauged.md"))]),
          census: censusLane([finding("audit-suite-unregistered", "error", "test/arch/a.test.mjs")]),
        });
        const byCode = new Map(report.findings.map((entry) => [entry.code, entry]));
        assert.equal(byCode.get("anchor-stale").about, "loop:gauged", "a finding anchored on a declared record names that record as its instrument");
        assert.equal(byCode.get("audit-suite-unregistered").about, "file:test/arch/a.test.mjs", "…and a finding about a gate no record mentions still names the gate");
        for (const entry of report.findings) {
          assert.ok(typeof entry.about === "string" && entry.about.length > 0, `${entry.code}: names something`);
        }
      });
    },
  },
  {
    name: "59/04 01.2: a finding is addressed to the reference-owner of the loop that owns the instrument",
    run: async () => {
      await withRegistry(async (model) => {
        // The instrument is owned by `loop:gauged` (it is that loop's measurement) and that loop's
        // reference is set by another node — read off the registry, not asserted about it.
        const instrument = "module:src/run-store.mjs#attempts";
        assert.deepEqual([...ownersOfInstrument(instrument, model)], ["loop:gauged"], "the loop that owns the instrument");
        const setters = referenceSettersOf("loop:gauged", model);
        assert.equal(setters.length, 1, "…whose reference is set by exactly one other node");

        const resolved = resolveAddressees(instrument, model, escalationActorOf(model));
        assert.deepEqual([...resolved.to], [...setters], "the finding is addressed to that other node");
        assert.equal(resolved.via, "reference-owner");
        assert.equal(resolved.to.includes("loop:gauged"), false, "and never to the loop it is about");
      });
    },
  },
  {
    name: "59/04 01.3: over the loop records this framework ships, no finding is addressed to the loop that owns the instrument it concerns",
    run: async () => {
      const model = await loadLoops(BUNDLE);
      assert.ok(model.nodes.length >= 16, `non-vacuous: ${model.nodes.length} shipped records`);
      // THE BRANCH THE RULE LIVES ON IS PINNED, not hoped for. Measured at review: this case's
      // findings all resolved through the ESCALATION branch (0 owners, or an owner nobody sets),
      // so the culprit-subtraction was never reached and deleting it left the case green. This
      // instrument is owned by two loops whose reference is set by a third — read off the shipped
      // records here so the pin fails if the registry stops having that shape.
      const OWNED = "prose:src/bundle/commands/continue.md";
      const owners = ownersOfInstrument(OWNED, model);
      assert.ok(owners.length >= 2, `non-vacuous: ${OWNED} is owned by ${owners.length} loops`);
      const audience = resolveAddressees(OWNED, model, escalationActorOf(model));
      assert.equal(audience.via, "reference-owner", "…and it really does resolve through a reference-owner, which is the branch the rule lives on");
      const report = await runAudit({
        repoRoot,
        model,
        items: [],
        now: NOW,
        anchorWindowMs: WINDOW,
        // The registry-checks lane is REAL here — the findings are the ones the shipped records
        // actually produce, so the claim is about this framework and not about a fixture. The
        // census lane's two findings are anchored deliberately: one on a file no record mentions
        // (the escalation branch) and one on the file `OWNED` names (the reference-owner branch).
        census: censusLane([
          finding("audit-suite-unregistered", "error", "test/arch/a.test.mjs"),
          // A NON-escalating census code, so the addressee set this leg compares is the pure
          // reference-owner resolution and not one the bypass has already widened.
          finding("audit-baseline-unreasoned", "error", "src/bundle/commands/continue.md"),
        ]),
        evidence: evidenceLane([]),
      });
      assert.ok(report.findings.length >= 3, `non-vacuous: ${report.findings.length} findings were addressed`);
      // BOTH BRANCHES ARE PRESENT in what this case actually addressed, so the leg below is a
      // decision about the subtraction and not about the escalation path alone.
      const viaOwner = report.findings.filter((entry) => resolveAddressees(entry.about, model, report.escalation).via === "reference-owner");
      assert.ok(viaOwner.length >= 1, "at least one finding resolved through a reference-owner");
      assert.deepEqual(
        viaOwner.map((entry) => [entry.about, [...entry.to]]).filter(([about]) => about === OWNED),
        [[OWNED, [...audience.to]]],
        "…and it is the pinned one, addressed to the node that sets its owners' reference",
      );
      for (const entry of report.findings) {
        const owners = ownersOfInstrument(entry.about, model);
        assert.deepEqual(
          entry.to.filter((addressee) => owners.includes(addressee)), [],
          `${entry.code} about ${entry.about}: addressed to [${entry.to.join(", ")}] and owned by [${owners.join(", ")}]`,
        );
        assert.ok(entry.to.length > 0, `${entry.code}: somebody hears it`);
      }
    },
  },
  {
    name: "59/04 01.4: an instrument that no loop declares escalates rather than disappearing",
    run: async () => {
      await withRegistry(async (model) => {
        const actor = escalationActorOf(model);
        const orphan = "module:src/nothing-declares-this.mjs#symbol";
        assert.deepEqual([...ownersOfInstrument(orphan, model)], [], "no loop declares it");
        const resolved = resolveAddressees(orphan, model, actor);
        assert.deepEqual([...resolved.to], [actor], "the finding is addressed to the declared escalation actor");
        assert.equal(resolved.via, "escalation-unowned", "…and the report says which absence sent it there");
        assert.notDeepEqual([...resolved.to], [], "it is not dropped");
      });
    },
  },
  {
    name: "59/04 01.5: a loop whose reference nobody sets escalates rather than disappearing",
    run: async () => {
      await withRegistry(async (model) => {
        const actor = escalationActorOf(model);
        const instrument = "module:src/run-store.mjs#isStale";
        assert.deepEqual([...ownersOfInstrument(instrument, model)], ["loop:lone"], "owned by a loop");
        assert.deepEqual([...referenceSettersOf("loop:lone", model)], [], "…whose reference no node sets");
        const resolved = resolveAddressees(instrument, model, actor);
        assert.deepEqual([...resolved.to], [actor], "the finding is addressed to the declared escalation actor");
        assert.equal(resolved.via, "escalation-no-reference-owner", "…and for a different stated reason than an unowned instrument");
      });
    },
  },
  // THE EXAMPLES ROWS, DRIVEN THROUGH `runAudit` AT THE SEVERITY THE ROW NAMES.
  //
  // Raised at review and it was the Blocker: these rows used to call `addresseesFor`, which takes
  // NO severity — the row's value only picked a code — so both rows executed an identical body and
  // neither could fail for the reason the row states. Re-routing every `warn` finding to the
  // escalation actor at the ONE site where both facts are in scope (`runAudit`'s finding
  // construction) left the whole suite green. The rows now put a finding of the row's severity,
  // about an OWNED instrument, through that exact site, and assert the addressee is the
  // reference-owner — so a severity-dependent re-route reds the warn row and not the error row.
  ...[["warning", "warn", "anchor-stale"], ["error", "error", "evidence-unrunnable"]].map(([row, severity, code]) => ({
    name: `59/04 01.6: addressing does not vary with severity — a ${row}-severity finding reaches the same node`,
    run: async () => {
      await withRegistry(async (model, fixture) => {
        const expected = referenceSettersOf("loop:gauged", model);
        assert.ok(expected.length >= 1, "non-vacuous: the loop's reference is set by another node");
        assert.equal(escalates(code), false, `${code}: a non-escalating code, so this reads the addressing and not the bypass`);

        // The finding is anchored on the OWNED loop's own record, so `about` resolves to that loop
        // and the audience is whoever sets its reference — the branch the rule lives on.
        const report = await audit(model, {
          checks: checksLane([finding(code, severity, fixture.pathOf("gauged.md"))]),
        });
        const raised = report.findings.filter((entry) => entry.code === code);
        assert.equal(raised.length, 1, `${row}: exactly one finding of this severity was addressed`);
        assert.equal(raised[0].severity, severity, `${row}: and it really carries that severity`);
        assert.equal(raised[0].about, "loop:gauged", `${row}: about the owned instrument`);
        assert.deepEqual([...raised[0].to], [...expected], `${row}: the finding is addressed to that other node`);
        assert.equal(raised[0].to.includes("loop:gauged"), false, `${row}: and never to the loop it is about`);
      });
    },
  })),
  {
    name: "59/04 01.6b: the SAME finding at warn and at error is addressed identically, through the one site where both axes are in scope",
    run: async () => {
      await withRegistry(async (model, fixture) => {
        // ONE INSTRUMENT, ONE CODE, TWO SEVERITIES, through `runAudit`. This is the leg that
        // detects a re-route keyed on severity, because it is the only place a severity and an
        // addressee are ever in scope together.
        const at = async (severity) => {
          const report = await audit(model, { checks: checksLane([finding("anchor-stale", severity, fixture.pathOf("gauged.md"))]) });
          return report.findings[0];
        };
        const warned = await at("warn");
        const errored = await at("error");
        assert.notEqual(warned.severity, errored.severity, "non-vacuous: the two runs really did differ in severity");
        assert.equal(warned.about, errored.about, "…and agree about the instrument");
        assert.deepEqual([...warned.to], [...errored.to], "addressing does not vary with severity");
        assert.ok(warned.to.length > 0 && !warned.to.includes("loop:gauged"), "…and both go to the reference-owner rather than the culprit");
      });
    },
  },
  {
    name: "59/04 01.7: every addressee was resolved from the instrument it concerns, and none was stated as a fixed value",
    run: async () => {
      await withRegistry(async (model) => {
        const actor = escalationActorOf(model);
        const report = await audit(model, {
          checks: checksLane([finding("anchor-stale", "warn", "unmatched.md")]),
          census: censusLane([finding("audit-suite-unregistered", "error", "test/arch/a.test.mjs")]),
        });
        assert.ok(report.findings.length >= 2, "non-vacuous");
        for (const entry of report.findings) {
          // RE-DERIVED FROM `about` ALONE. If any addressee had been written on the finding by
          // hand, the independent resolution would disagree with it.
          assert.deepEqual(
            [...entry.to], [...addresseesFor(entry.code, entry.about, model, actor).to],
            `${entry.code}: its addressees are exactly what the instrument resolves to`,
          );
        }

        // …AND NONE IS FIXED: move the reference-setting edge and the addressee moves with it.
        const moved = { ...REGISTRY, "chief.md": record(["id: actor:chief", "kind: actor", "title: Chief", "ground: exogenous", "target-setting: [loop:lone]"]) };
        await withLoopRegistry(moved, async (fixture) => {
          const shifted = await loadLoops(fixture.workDir);
          const before = resolveAddressees("module:src/run-store.mjs#attempts", model, actor);
          const after = resolveAddressees("module:src/run-store.mjs#attempts", shifted, escalationActorOf(shifted));
          assert.notDeepEqual([...after.to], [...before.to], "the same instrument addresses differently once the registry says something different");
          assert.deepEqual([...after.to], [actor], "…and with no reference-owner left it escalates");
        });
      });
    },
  },
  {
    name: "59/04 01.8: the finding envelope holds exactly its declared keys, including what it is about and who it is addressed to",
    run: async () => {
      await withRegistry(async (model) => {
        const report = await audit(model, { census: censusLane([finding("audit-suite-unregistered", "error", "test/arch/a.test.mjs")]) });
        const [entry] = report.findings;
        assert.deepEqual(Object.keys(entry).sort(), [...AUDIT_ENVELOPE_KEYS].sort(), "exactly the keys the envelope declares");
        assert.ok(AUDIT_ENVELOPE_KEYS.includes("about") && AUDIT_ENVELOPE_KEYS.includes("to"), "…and they include both what the finding is about and who it is addressed to");
        // Doctor's four are a strict SUBSET, which is what "the shape the health command's
        // findings carry" means when a superset is deliberate (ADR-002 §2).
        for (const key of ["code", "severity", "path", "message"]) {
          assert.ok(AUDIT_ENVELOPE_KEYS.includes(key), `${key}: doctor's envelope survives intact`);
        }
      });
    },
  },

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // 02_the-escalation-bypass.feature
  // ───────────────────────────────────────────────────────────────────────────────────────────
  {
    name: "59/04 02.1: a finding whose code is in the escalating set reaches the declared actor",
    run: async () => {
      await withRegistry(async (model) => {
        const actor = escalationActorOf(model);
        assert.ok(actor != null, "the fixture auditor declares one");
        for (const code of ESCALATING_CODES) {
          const addressing = addresseesFor(code, "module:src/run-store.mjs#attempts", model, actor);
          assert.ok(addressing.to.includes(actor), `${code}: reaches the declared escalation actor`);
        }
      });
    },
  },
  {
    name: "59/04 02.2: the owner still receives the escalating finding — the actor's copy is a SECOND one",
    run: async () => {
      await withRegistry(async (model) => {
        const actor = escalationActorOf(model);
        const instrument = "module:src/run-store.mjs#attempts";
        const owner = referenceSettersOf("loop:gauged", model);
        assert.ok(owner.length >= 1 && !owner.includes(actor), "non-vacuous: the instrument's loop has a reference-owner that is not the actor");

        const addressing = addresseesFor("audit-suite-unregistered", instrument, model, actor);
        for (const node of owner) assert.ok(addressing.to.includes(node), `${node}: the reference-owner still hears it`);
        assert.ok(addressing.to.includes(actor), "…and it is ALSO addressed to the escalation actor");
        assert.equal(addressing.to.length, owner.length + 1, "additive — a second copy, never a re-route");
      });
    },
  },
  {
    name: "59/04 02.3: a non-escalating finding is addressed to the reference-owner only",
    run: async () => {
      await withRegistry(async (model) => {
        const actor = escalationActorOf(model);
        const instrument = "module:src/run-store.mjs#attempts";
        const owner = referenceSettersOf("loop:gauged", model);
        const addressing = addresseesFor("anchor-stale", instrument, model, actor);
        assert.equal(escalates("anchor-stale"), false, "the code is outside the set");
        assert.deepEqual([...addressing.to], [...owner], "addressed to the reference-owner only");
        assert.equal(addressing.to.includes(actor), false, "…and it does not reach the actor");
      });
    },
  },
  {
    name: "59/04 02.4: whether a finding escalates is decided by its code, not by its severity",
    run: async () => {
      await withRegistry(async (model) => {
        const actor = escalationActorOf(model);
        const instrument = "module:src/run-store.mjs#attempts";
        // TWO CODES OF THE SAME SEVERITY. Both are error-severity findings the evidence and census
        // lanes really raise; only one of them is in the escalating table.
        const escalating = addresseesFor("evidence-contradicted", instrument, model, actor);
        const quiet = addresseesFor("evidence-unrunnable", instrument, model, actor);
        assert.equal(escalating.to.includes(actor), true, "one of them reaches the escalation actor");
        assert.equal(quiet.to.includes(actor), false, "…and the other does not");
        // THE DIFFERENCE IS ATTRIBUTABLE TO THE CODE. Same instrument, same resolution, same
        // severity — the only thing that changed is the code, and the table is what read it.
        assert.deepEqual([...escalating.owners], [...quiet.owners], "the instrument resolution is identical");
        assert.equal(escalates("evidence-contradicted"), true);
        assert.equal(escalates("evidence-unrunnable"), false);
      });
    },
  },
  {
    name: "59/04 02.5: the escalating set has one home, and no finding decides its own escalation where it is raised",
    run: async () => {
      assert.ok(ESCALATING_CODES.length >= 5, `non-vacuous: ${ESCALATING_CODES.length} codes`);
      assert.equal(Object.isFrozen(ESCALATING_CODES), true, "a single declared table, frozen");
      for (const code of ESCALATING_CODES) assert.equal(escalates(code), true, `${code}: read back off the table`);
      assert.equal(escalates("not-a-declared-code"), false, "…and the predicate refuses anything else");
      // THE RAISING SITE CANNOT DECIDE IT, asserted over a REAL lane rather than over this file's
      // own fixture constructor (which is what it did before review, and proved nothing). Every
      // finding the checks leaf raises carries doctor's four keys and no escalation flag, so there
      // is no field at the raising site through which a lane could elect its own bypass.
      const { assessAnchorFreshness } = await import("../../src/work/loops-checks.mjs");
      const stale = assessAnchorFreshness(
        { source: "/probe/loops", present: true, findings: [], nodes: [{
          id: "anchor:probe", kind: "anchor", title: "probe", path: "/probe/loops/probe.md",
          fields: { ground: { kind: "enum", value: "live-soak" }, checked: { kind: "date", raw: "2020-01-01", ms: Date.UTC(2020, 0, 1) } }, edges: {},
        }] },
        { now: NOW, window: WINDOW },
      );
      assert.ok(stale.findings.length >= 1, "non-vacuous: a real lane raised a real finding");
      for (const entry of stale.findings) {
        assert.deepEqual(Object.keys(entry).sort(), ["code", "message", "path", "severity"], "a lane's finding carries no escalation field to set");
      }
      // …and the table is bound to the vocabularies the lanes actually declare, so a transposed
      // letter in a member cannot silently disable the bypass for that whole class.
      for (const code of ESCALATING_CODES) {
        assert.ok(AUDITABLE_CODES.includes(code), `${code}: is a code some lane can really emit`);
      }
    },
  },
  {
    name: "59/04 02.6: the bypass terminates at a declared actor and does not name a loop",
    run: async () => {
      await withRegistry(async (model) => {
        const endpoint = escalationActorOf(model);
        assert.ok(endpoint.startsWith("actor:"), `${endpoint}: an actor scheme`);
        const node = model.nodes.find((entry) => entry.id === endpoint);
        assert.ok(node != null, "…resolving to a declared node");
        assert.equal(node.kind, "actor", "…of kind actor");
        assert.notEqual(node.kind, "loop", "it does not name a loop — a bypass terminating inside the machinery is one more hop through it");
        assert.equal(node.fields?.ground?.value, "exogenous", "…and it is grounded outside the system");
      });
    },
  },

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // 03_the-day-one-auditor.feature — driven over the records this framework really ships.
  // ───────────────────────────────────────────────────────────────────────────────────────────
  {
    name: "59/04 00.3b: a scope naming a real item that declares no register is NOT the same fact as a typo",
    run: async () => {
      await withRegistry(async (model) => {
        // MEASURED AT REVIEW. The population was narrowed BEFORE the scope resolved, so a real
        // story with no ARCHITECTURE.md rendered byte-identically to a nonsense reference — down
        // to "that is not a failure" — in the command whose subject is not conflating two facts.
        const population = [{ ref: "03", dir: "/w/03" }, { ref: "03/01", dir: "/w/03/01" }];
        const registered = [{ ref: "03", dir: "/w/03", docTexts: { "ARCHITECTURE.md": "# a register document" } }];

        const real = await audit(model, { items: registered, population, scope: "03/01" });
        assert.equal(real.scope.nothingMatched, false, "the item exists, so the scope matched");
        assert.deepEqual([...real.scope.matched], ["03/01"], "…and the report names what it matched");
        assert.deepEqual([...real.scope.audited], [], "…while nothing in it carries a register");
        const itemLane = real.lanes.find((lane) => lane.scoped);
        assert.equal(itemLane.ran, false, "so the item lane did not run");
        assert.match(itemLane.why, /declare no fitness register/u, "…and says THAT, not that the scope matched nothing");
        // AND NOT `audit-ran-on-nothing`: the operator named the population and it is legitimately
        // empty. An UNSCOPED empty population is the instrument going blind and does report it.
        assert.deepEqual(real.findings.filter((entry) => entry.code === "audit-ran-on-nothing"), []);

        const typo = await audit(model, { items: registered, population, scope: "zzz" });
        assert.equal(typo.scope.nothingMatched, true, "a reference nothing carries matches nothing");
        assert.notDeepEqual(
          real.lanes.map((lane) => lane.why), typo.lanes.map((lane) => lane.why),
          "the two runs no longer render identically",
        );
        // …and the human face states two different sentences, which is where an operator reads it.
        assert.notEqual(renderOf(real).split("\n")[0], renderOf(typo).split("\n")[0]);
      });
    },
  },
  {
    name: "59/04 00.10: a registered lane the registry cannot execute fails loudly, and never falls through to another lane's result",
    run: async () => {
      await withRegistry(async (model) => {
        // WHAT MILESTONE 77 INHERITS (ADR-002 §4). Dispatch used to be a ternary chain whose final
        // `else` was the checks lane, so a fourth entry appended by 77 would have re-run the
        // registry checks under its own name and duplicated every finding with no test red.
        const rogue = Object.freeze({
          id: "harness-seams",
          what: "a lane a later milestone appends",
          scoped: false,
          instrument: "module:scripts/test.mjs#tests",
          whyUnscoped: "n/a",
          population: null,
        });
        await assert.rejects(
          () => audit(model, { lanes: [rogue] }),
          /the "harness-seams" lane declares no runner/u,
          "an entry with no runner is refused rather than silently served by another lane",
        );
        // …and a lane that DOES declare one is executed as its own lane, by its own runner.
        const wired = Object.freeze({ ...rogue, run: () => ({ findings: [finding("audit-baseline-stale", "warn", "a.md")], reads: [read("harness", 3, 1)] }) });
        const report = await audit(model, { lanes: [wired] });
        assert.deepEqual(report.lanes.map((lane) => lane.id), ["harness-seams"]);
        assert.deepEqual(report.findings.map((entry) => entry.code), ["audit-baseline-stale"], "its own findings, not another lane's");
      });
    },
  },
  {
    name: "59/04 00.11: a lane below its floor that reports nothing itself is reported BY THE REGISTRY",
    run: async () => {
      await withRegistry(async (model) => {
        // FF-5908's declared invariant is that the emission is DRIVEN FROM THE LANE REGISTRY, so a
        // lane added without one fails CI rather than passing silently over nothing. All three
        // shipped lanes emit their own, so this is a backstop — and it is the leg that makes the
        // invariant true of a FOURTH lane rather than of the three that happen to behave.
        const blind = Object.freeze({ ...REPORT_LANES[0], id: "blind-lane", run: () => ({ findings: [], reads: [read("blind-sweep", 0, 1)] }) });
        const report = await audit(model, { lanes: [blind] });
        const raised = report.findings.filter((entry) => entry.code === "audit-ran-on-nothing");
        assert.equal(raised.length, 1, "the registry raised it even though the lane said nothing");
        assert.equal(raised[0].severity, "error");
        assert.match(raised[0].message, /"blind-sweep" sweep read 0 of a required 1/u, "…naming the sweep, the count and the floor");
        assert.equal(report.lanes[0].findings, 1, "…and the lane's finding count includes it");

        // NOT DOUBLED for a lane that already reported it — one fact, one finding.
        const honest = Object.freeze({ ...blind, id: "honest-lane", run: () => {
          const r = read("honest-sweep", 0, 1);
          return { findings: [{ code: "audit-ran-on-nothing", severity: "error", path: r.root, message: `the "${r.sweep}" sweep read ${r.count} of a required ${r.floor} while walking ${r.root} — it ran on nothing, or on so little that a clean result would mean nothing. ${r.what}` }], reads: [r] };
        } });
        const once = await audit(model, { lanes: [honest] });
        assert.equal(once.findings.filter((entry) => entry.code === "audit-ran-on-nothing").length, 1, "one fact, one finding");
      });
    },
  },
  {
    name: "59/04 01.9: an audience that cannot RECEIVE escalates as well, and the declared authority stays on the record",
    run: async () => {
      // 58/ADR-001 admits three owners of a reference and only two are an audience. Measured on the
      // SHIPPED registry at review: six instruments of `loop:run-resilience` resolved solely to
      // `anchor:run-lifecycle-policy` — a frozen rule that can neither read a report nor forward
      // one — so a non-escalating finding about any of them was addressed and thereby dropped.
      const model = await loadLoops(BUNDLE);
      const actor = escalationActorOf(model);
      const instrument = "command:work:run-start";
      const owners = ownersOfInstrument(instrument, model);
      assert.ok(owners.length >= 1, "non-vacuous: the instrument is owned");
      const setters = owners.flatMap((owner) => [...referenceSettersOf(owner, model)]);
      assert.ok(setters.length >= 1, "…and its owner's reference IS set by somebody");
      assert.deepEqual(setters.filter((id) => canReceive(id, model)), [], "…none of whom can receive a report");

      const resolved = resolveAddressees(instrument, model, actor);
      assert.equal(resolved.via, "escalation-no-receiver", "so it escalates, and says which absence sent it there");
      assert.ok(resolved.to.includes(actor), "the actor is added…");
      for (const setter of setters) assert.ok(resolved.to.includes(setter), `…beside ${setter}, which stays on the record as the declared authority`);
      assert.ok(resolved.to.some((id) => canReceive(id, model)), "and somebody in the audience can act on it");
    },
  },
  {
    name: "59/04 01.10: a file the registry names with SEVERAL instruments is addressed as the file, never as an arbitrary one of them",
    run: async () => {
      // Measured at review: the first match came out of an unordered `Set`, so a record edit could
      // move a finding's addressee without anything changing about the finding. Two loops naming
      // two symbols in ONE file is a real shape — `src/run-store.mjs` carries six on the shipped
      // registry — and choosing one attributes the finding to the owner of a DIFFERENT symbol.
      const ambiguous = {
        ...REGISTRY,
        "alpha.md": record([
          "id: loop:alpha", "kind: loop", "title: Alpha", "controlled: one",
          "reference: [command:work:next]", "measurement: [module:src/run-store.mjs#one]",
          "actuator: [command:work:run-start]", "cadence: event:per-item", "ceiling: none",
          "owner: unknown", "optimizing: false", "layer: operational",
        ]),
        "beta.md": record([
          "id: loop:beta", "kind: loop", "title: Beta", "controlled: two",
          "reference: [command:work:next]", "measurement: [module:src/run-store.mjs#two]",
          "actuator: [command:work:run-complete]", "cadence: event:per-item", "ceiling: none",
          "owner: unknown", "optimizing: false", "layer: operational",
          "target-setting: [loop:alpha]",
        ]),
      };
      await withLoopRegistry(ambiguous, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        assert.deepEqual(model.findings.filter((f) => f.severity === "error"), [], "the fixture is clean");
        const about = instrumentFor({ path: path.join(repoRoot, "src", "run-store.mjs") }, { model, repoRoot });
        assert.equal(about, "file:src/run-store.mjs", "the finding is about the FILE the registry names twice");
        assert.deepEqual([...ownersOfInstrument(about, model)], [], "…which no loop declares, so it escalates");
        const resolved = resolveAddressees(about, model, escalationActorOf(model));
        assert.equal(resolved.via, "escalation-unowned");
        assert.equal(resolved.to.includes("loop:beta"), false, "and never to the owner of some OTHER symbol in that file");

        // …WHILE A FILE THE REGISTRY NAMES ONCE still resolves to that pointer, which is what lets
        // an owner be found at all — the ambiguity rule is a refusal, not a blanket fallback.
        const single = instrumentFor({ path: path.join(repoRoot, "src", "bundle", "commands", "continue.md") }, { model: await loadLoops(BUNDLE), repoRoot });
        assert.equal(single, "prose:src/bundle/commands/continue.md");
      });
    },
  },
  {
    name: "59/04 02.7: a registry with more than one auditor is REPORTED, and unanimity still resolves the bypass",
    run: async () => {
      // A project that runs `aof work update` receives the framework auditor and may declare its
      // own — which is what 59/00's grammar exists for. Measured at review: two auditors made
      // `escalationActorOf` return null, every escalating finding got `to: []`, and the face said
      // "the registry ships no auditor" about a registry that ships two. Both halves are fixed:
      // agreement resolves the endpoint, and the plurality is a finding either way.
      const second = (id, actor) => record([
        `id: auditor:${id}`, "kind: auditor", `title: ${id}`,
        "audits: [command:work:audit]", "measurement: [command:work:audit]",
        "cadence: event:per-milestone", `escalation: ${actor}`,
      ]);

      await withLoopRegistry({ ...REGISTRY, "agree.md": second("agree", "actor:steward") }, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        assert.deepEqual(model.findings.filter((f) => f.severity === "error"), [], "the fixture loads clean, so this is a real registry and not a malformed one");
        assert.equal(auditorsOf(model).length, 2, "two records declare the auditor kind");
        assert.equal(escalationActorOf(model), "actor:steward", "…naming ONE actor between them, so the bypass still resolves");

        const report = await audit(model, { census: censusLane([finding("audit-suite-unregistered", "error", "test/arch/a.test.mjs")]) });
        const escalating = report.findings.filter((entry) => entry.code === "audit-suite-unregistered");
        assert.equal(escalating.length, 1);
        assert.deepEqual([...escalating[0].to], ["actor:steward"], "the escalating finding is NOT dropped");
        const plural = report.findings.filter((entry) => entry.code === "audit-auditor-not-unique");
        assert.equal(plural.length, 1, "…and the plurality is reported rather than absorbed");
        assert.match(plural[0].message, /auditor:agree/u, "naming the records that declare the kind");
        assert.deepEqual([...report.auditors], ["auditor:agree", "auditor:probe"], "the report carries the set it computed the endpoint from");
        assert.match(renderOf(report), /Escalation: actor:steward/u, "and the face states the endpoint it really resolved");
      });

      await withLoopRegistry({ ...REGISTRY, "differ.md": second("differ", "actor:chief") }, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        assert.equal(escalationActorOf(model), null, "two auditors naming DIFFERENT actors resolve no single endpoint");
        const report = await audit(model);
        const codes = report.findings.map((entry) => entry.code).sort();
        assert.deepEqual(codes, ["audit-auditor-not-unique", "audit-escalation-undeclared"], "both facts are reported, and neither is silence");
        assert.equal(renderOf(report).includes("the registry ships no auditor"), false, "the face no longer states a falsehood about a registry that ships two");
        assert.match(renderOf(report), /unresolved — 2 records declare the auditor kind/u);
      });
    },
  },
  {
    name: "59/04 03.1: the framework ships exactly one auditor",
    run: async () => {
      const model = await loadLoops(BUNDLE);
      const onDisk = (await readdir(SHIPPED_LOOPS)).filter((name) => name.endsWith(".md"));
      assert.ok(onDisk.length > 0, `the sweep of ${SHIPPED_LOOPS} found no .md record — a walk whose subject set empties must FAIL naming the directory (119/ADR-003 §4)`);
      assert.equal(model.nodes.length, onDisk.length, `non-vacuous: all ${onDisk.length} records in src/bundle/loops/ were loaded`);
      const auditors = model.nodes.filter((node) => node.kind === "auditor");
      assert.equal(auditors.length, 1, "exactly one of the shipped records declares the auditor kind");
      assert.equal(auditors[0].id, "auditor:instrument-audit");
    },
  },
  {
    name: "59/04 03.2: everything the shipped auditor says it reads resolves, and 03.3: none of it is a work item",
    run: async () => {
      const model = await loadLoops(BUNDLE);
      const auditor = model.nodes.find((node) => node.kind === "auditor");
      const declared = new Set(model.nodes.map((node) => node.id));
      const registered = new Set(listCommands().map((command) => command.id));
      const audits = auditor.fields.audits.map((entry) => entry.raw);
      assert.ok(audits.length >= 8, `non-vacuous: ${audits.length} instruments`);
      for (const raw of audits) {
        const resolves = raw.startsWith("module:")
          || (raw.startsWith("command:") && registered.has(raw.slice("command:".length)))
          || declared.has(raw);
        assert.equal(resolves, true, `${raw}: resolves to a file, a registered command or a declared node`);
        assert.equal(raw.startsWith("item:"), false, `${raw}: no entry names a work item`);
      }
      // The grammar itself refuses `item:` on this key, so the assertion above is belt to a brace.
      assert.equal(audits.some((raw) => /^\d+(\/\d+)?$/u.test(raw)), false, "no bare work-item reference either");
    },
  },
  {
    name: "59/04 03.4: the shipped auditor's reading is a registered command, not a document",
    run: async () => {
      const model = await loadLoops(BUNDLE);
      const auditor = model.nodes.find((node) => node.kind === "auditor");
      const registered = new Set(listCommands().map((command) => command.id));
      const measurement = auditor.fields.measurement.map((entry) => entry.raw);
      assert.ok(measurement.length >= 1);
      for (const raw of measurement) {
        assert.ok(raw.startsWith("command:"), `${raw}: names a command`);
        assert.ok(registered.has(raw.slice("command:".length)), `${raw}: …and it is registered`);
        assert.equal(raw.startsWith("prose:"), false, "…and it does not cite a document as its authority");
      }
    },
  },
  {
    name: "59/04 03.5: the shipped auditor declares where it can go directly — an actor grounded outside this system",
    run: async () => {
      const model = await loadLoops(BUNDLE);
      const auditor = model.nodes.find((node) => node.kind === "auditor");
      const endpoint = auditor.fields.escalation.raw;
      const actor = model.nodes.find((node) => node.id === endpoint);
      assert.ok(actor != null, `${endpoint}: a declared node`);
      assert.equal(actor.kind, "actor");
      assert.equal(actor.fields.ground.value, "exogenous", "grounded outside this system");
    },
  },
  {
    name: "59/04 03.6: the shipped auditor does not report to anything it audits",
    run: async () => {
      const model = await loadLoops(BUNDLE);
      const auditor = model.nodes.find((node) => node.kind === "auditor");
      const reporting = (auditor.edges?.reporting ?? []).map((endpoint) => endpoint.raw);
      const audits = new Set(auditor.fields.audits.map((entry) => entry.raw));
      assert.ok(reporting.length >= 1, `non-vacuous: ${reporting.length} reporting edge(s)`);
      assert.deepEqual(reporting.filter((endpoint) => audits.has(endpoint)), [], "no node appears in both");
    },
  },
  {
    name: "59/04 03.7: the shipped registry, the auditor included, still produces no gating finding",
    run: async () => {
      const { GATING_CODES, checkActuatorArbitration, checkAnchorGrounding, checkGrounding, checkPairing, checkReferenceOwnership, checkTimescale } =
        await import("../../src/work/loops-checks.mjs");
      const model = await loadLoops(BUNDLE);
      const findings = [checkGrounding, checkAnchorGrounding, checkPairing, checkReferenceOwnership, checkActuatorArbitration, checkTimescale]
        .flatMap((check) => check(model));
      assert.ok(findings.length >= 1, `non-vacuous: ${findings.length} advisory finding(s) were produced`);
      assert.deepEqual(findings.filter((entry) => GATING_CODES.has(entry.code)), [], "no finding is raised whose code stops the run");
      assert.deepEqual(model.findings.filter((entry) => entry.severity === "error"), [], "…and the loader raises no error either");
    },
  },
  {
    name: "59/04 03.8: the cadence is declared even though nothing schedules it yet, and the audit is runnable on demand",
    run: async () => {
      const { GATE_ORDER } = await import("../../src/work/loop.mjs");
      const model = await loadLoops(BUNDLE);
      const auditor = model.nodes.find((node) => node.kind === "auditor");
      assert.ok(auditor.fields.cadence != null, "it declares one");
      assert.notEqual(auditor.fields.cadence.kind, "unknown", "…and it is a fact, not an admitted gap");
      // NO SCHEDULER EXISTS, by decision (ADR-007 §1): the frozen five-row cost ladder is a
      // DELIVERED acceptance criterion and gains no `work:audit` rung here.
      assert.equal(GATE_ORDER.some((rung) => rung.command === "work:audit"), false, "nothing schedules it");
      // …and it is runnable anyway, through the registered command, over a real registry.
      const report = await audit(model);
      assert.equal(report.summary.lanes, REPORT_LANES.length, "the audit ran on demand with no scheduler in existence");
    },
  },

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // 04_the-limits-are-stated-in-one-shape.feature  (D-59-3, raised at `aof:verify 59`)
  //
  // The limits are driven through the SHIPPED `sweepLimits(CENSUS_SWEEPS)` rather than through a
  // hand-built fixture, because the defect was precisely that a real lane's real limits were
  // unrenderable while a fixture's were fine — `test/audit/audit-command.test.mjs` passed `limits: []`
  // for the evidence lane and declared none for the other two, so nothing here ever rendered one.
  // ───────────────────────────────────────────────────────────────────────────────────────────
  {
    name: "59/04 04.1: every limit a lane declares is rendered with its own text, and no rendered limit line contains an absent value",
    run: async () => {
      await withRegistry(async (model) => {
        const shipped = sweepLimits(CENSUS_SWEEPS);
        assert.ok(shipped.length >= 2, `non-vacuity: the shipped census declares ${shipped.length} limits`);
        const result = await audit(model, {
          census: async () => ({ findings: [], reads: [read("suite-population", 9, 1)], registered: [], limits: shipped }),
        });

        const text = renderOf(result);
        const limitLines = text.split("\n").filter((line) => line.trimStart().startsWith("limit ("));
        assert.equal(limitLines.length, shipped.length, "one line per declared limit");
        for (const line of limitLines) {
          assert.doesNotMatch(line, /undefined|\[object Object\]/u, `a limit line renders its own text, not an absent value: ${line}`);
        }
        for (const limit of shipped) {
          assert.ok(text.includes(limit.question), `the limit's question is rendered: ${limit.question}`);
          assert.ok(text.includes(limit.consequence), "…and so is what follows from it");
          assert.ok(limitLines.some((line) => line.includes(`(instrument-census/${limit.sweep})`)), "…attributed to the lane and the sweep it qualifies");
          if (limit.authority != null) assert.ok(text.includes(`authority: ${limit.authority}`), "…and the gate that decides it where one exists");
        }
      });
    },
  },
  {
    name: "59/04 04.2: the two faces carry the same limits — every limit in the envelope is in the human report, and none is in the human report alone",
    run: async () => {
      await withRegistry(async (model) => {
        const shipped = sweepLimits(CENSUS_SWEEPS);
        const result = await audit(model, {
          census: async () => ({ findings: [], reads: [read("suite-population", 9, 1)], registered: [], limits: shipped }),
        });

        const text = renderOf(result);
        const envelope = jsonOf(result);
        assert.equal(envelope.limits.length, shipped.length, "the envelope carries them all");
        for (const limit of envelope.limits) {
          assert.deepEqual(Object.keys(limit).sort(), ["lane", ...LIMIT_KEYS].sort(), "each in the one shape, plus the lane the face attributes it to");
          assert.ok(text.includes(limit.question) && text.includes(limit.consequence), `present in the human face too: ${limit.question}`);
        }
        const rendered = text.split("\n").filter((line) => line.trimStart().startsWith("limit ("));
        assert.equal(rendered.length, envelope.limits.length, "and the human face invents none the envelope omits");
      });
    },
  },
  {
    name: "59/04 04.3: a lane that read its population and found nothing still states its limit — the clean case is the one the limit exists for",
    run: async () => {
      await withRegistry(async (model) => {
        const shipped = sweepLimits(CENSUS_SWEEPS);
        const result = await audit(model, {
          census: async () => ({ findings: [], reads: [read("suite-population", 9, 1)], registered: [], limits: shipped }),
          evidence: async ({ items }) => ({ findings: [], reads: [read("register-rows", Math.max(items.length, 1), 1)], limits: [] }),
          checks: () => ({ findings: [], reads: [read("anchor-freshness", 4, 1)] }),
        });

        assert.deepEqual([...result.findings], [], "the run is clean — nothing was found");
        const text = renderOf(result);
        assert.match(text, /healthy/u, "…and the face says so");
        for (const limit of shipped) {
          assert.ok(text.includes(limit.consequence), "…while still saying what it could not see");
        }
      });
    },
  },
  {
    name: "59/04 04.4: a lane whose limit does not carry the keys the face renders is REFUSED, naming the lane and the keys — never rendered blank",
    run: async () => {
      await withRegistry(async (model) => {
        // THE EXACT DEFECT, as a fixture: the census's pre-D-59-3 vocabulary.
        const oldShape = [{ sweep: "runner-bindings", basis: "text", claim: "what the runner imports", limit: "a text-level claim", authority: null }];
        await assert.rejects(
          () => audit(model, { census: async () => ({ findings: [], reads: [read("suite-population", 9, 1)], registered: [], limits: oldShape }) }),
          (error) => {
            assert.match(error.message, /"instrument-census" lane returned an unrenderable limit/u, "the refusal names the lane");
            assert.match(error.message, /`question`/u, "…and the keys the face renders");
            assert.match(error.message, /`consequence`/u, "…both of them");
            return true;
          },
          "a limit the face would print blank stops the run instead",
        );

        // A lane that states NO limit is not the same thing, and is accepted.
        const none = await audit(model, { census: async () => ({ findings: [], reads: [read("suite-population", 9, 1)], registered: [], limits: [] }) });
        assert.ok(Array.isArray(none.limits), "declaring none is an honest answer, not a refusal");

        // …and a complete limit built through the one constructor is accepted, so the refusal above
        // is a decision about the SHAPE rather than a lane that can never state a limit at all.
        const good = await audit(model, {
          census: async () => ({
            findings: [],
            reads: [read("suite-population", 9, 1)],
            registered: [],
            limits: [limitRecord({ sweep: "runner-bindings", basis: "text", question: "q?", consequence: "c." })],
          }),
        });
        assert.equal(good.limits.length, 1, "the complete shape passes the same gate");
        assert.equal(good.limits[0].lane, "instrument-census", "…attributed to the lane that returned it");
      });
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // milestone 77 / story 05 — THE LANES ARE REGISTERED
  //
  //   tasks/00_four-lanes-join-the-registry-and-each-executes-as-itself.feature
  //   tasks/02_the-face-injects-what-the-family-may-not-import.feature
  //
  // The registry's own refusals, the read-record and limit obligations, the child-process absence
  // and the `--strict` exit rule are FF-7708's, driven from the registry in
  // `test/arch/audit/acd-audit-lane-registry-complete.test.mjs`. The code space's derivation and its
  // disjointness are FF-7707's, in `acd-controls-never-execute`. Each of the seven codes' SEVERITY
  // is driven row by row in the suite of the story that emits it — 77/00 for the capability gap at
  // both rungs and the duplication warn, 77/01 for the hook error, 77/02 for the seam warn, 77/03
  // for the three bound codes. What is left, and what is genuinely this story's, is the COMPOSED
  // claim: that the four lanes run as themselves under one command, that what the face injects is
  // what they answer to, and that every error leg measures zero in this repository on arrival.
  // ═══════════════════════════════════════════════════════════════════════════════════════════
  {
    name: "77/05 00.1 (Scenario Outline, all four rows): every registered lane runs, and every finding it raises is attributed to it",
    run: async () => {
      await withRegistry(async (model) => {
        const rows = [
          ["prompt-layer", "promptLayer", ["audit-agent-capability-gap", "audit-instruction-duplicated"], "the installed prompt layer"],
          ["hook-wiring", "hookWiring", ["audit-hook-duplicated"], "the audited hook wiring"],
          ["seam-liveness", "seamLiveness", ["audit-seam-unwired"], "the audited tree's exported seams"],
          ["declared-bounds", "declaredBounds", ["audit-bound-undeclared", "audit-bound-off-reference", "audit-reference-stale"], "the audited project's declared bounds"],
        ];
        for (const [laneId, key, codes, subject] of rows) {
          const raised = codes.map((code) => finding(code, "warn", `probe/${code}`));
          const report = await audit(model, {
            [key]: () => ({ findings: raised, reads: [read(`${laneId}-sweep`, 5, 1)], limits: [] }),
          });
          const lane = report.lanes.find((entry) => entry.id === laneId);
          assert.notEqual(lane, undefined, `the lane over ${subject} is registered`);
          assert.equal(lane.ran, true, `${laneId}: reported as having run`);
          assert.equal(lane.reads[0].count, 5, `${laneId}: with the size of what it read`);
          assert.equal(lane.findings, codes.length, `${laneId}: raising ${codes.length} finding(s)`);
          assert.deepEqual(report.findings.map((entry) => entry.code).sort(), [...codes].sort(), `${laneId}: every code it raised is its own`);
          // …AND NONE BELONGING TO ANOTHER LANE: no other lane contributed a finding to this run.
          for (const other of report.lanes.filter((entry) => entry.id !== laneId)) {
            assert.equal(other.findings, 0, `${laneId}: ${other.id} raised nothing`);
          }
        }
      });
    },
  },
  {
    name: "77/05 00.2: with every lane green the command closes clean, says what each one swept, and exits zero",
    run: async () => {
      await withRegistry(async (model) => {
        const report = await audit(model);
        assert.equal(report.findings.length, 0, "no registered lane found anything to report");
        assert.equal(report.lanes.length, REPORT_LANES.length, `every registered lane is in the report (${REPORT_LANES.length})`);
        for (const lane of report.lanes) {
          assert.equal(lane.ran, true, `${lane.id}: ran`);
          for (const record of lane.reads) {
            assert.ok(record.count >= record.floor, `${lane.id}: reports ${record.count} read against a floor of ${record.floor}`);
            assert.ok(record.floor > 0, `${lane.id}: …and the floor is above zero`);
          }
        }
        const rendered = renderOf(report);
        assert.match(rendered, /0 error\(s\), 0 warning\(s\)/u, "the result states that what it read is healthy, rather than saying nothing at all");
        for (const lane of REPORT_LANES) assert.match(rendered, new RegExp(`lane ${lane.id} — ran`, "u"), `${lane.id} is named in the render`);
        assert.equal(exitOf(report, true), 0, "and the exit status is zero, strict or not");
        assert.equal(exitOf(report, false), 0, "…either way");
      });
    },
  },
  {
    name: "77/05 00.3: with a well-formed registry each entry runs under its own name, and no two report the same findings",
    run: async () => {
      await withRegistry(async (model) => {
        const report = await audit(model, {
          promptLayer: () => ({ findings: [finding("audit-agent-capability-gap", "warn", "a")], reads: [read("prompt-capability", 2, 1)], limits: [] }),
          hookWiring: () => ({ findings: [finding("audit-hook-duplicated", "error", "b")], reads: [read("hook-entries", 2, 1)], limits: [] }),
          seamLiveness: () => ({ findings: [finding("audit-seam-unwired", "warn", "c")], reads: [read("seam-source", 2, 1)], limits: [] }),
          declaredBounds: () => ({ findings: [finding("audit-reference-stale", "warn", "d")], reads: [read("declared-bound-loops", 2, 1)], limits: [] }),
        });
        const ids = report.lanes.map((lane) => lane.id);
        assert.equal(new Set(ids).size, ids.length, "each entry is reported once, under its own name");
        const paths = report.findings.map((entry) => entry.path);
        assert.equal(new Set(paths).size, paths.length, "no two entries report the same findings as each other");
        assert.equal(report.findings.length, 4, "all four lanes' findings reached the report");
        // …AND THROUGH THE MACHINE FACE, in doctor's envelope plus the audit's two addressing keys.
        const machine = jsonOf(report);
        for (const entry of machine.findings) {
          assert.deepEqual(Object.keys(entry).sort(), [...AUDIT_ENVELOPE_KEYS].sort(), `${entry.code} carries the six keys and no key outside them`);
          assert.ok(AUDITABLE_CODES.includes(entry.code), `${entry.code}: is a code some registered lane can really emit`);
        }
      });
    },
  },
  {
    name: "77/05 02.1 (Scenario Outline, all four rows): each fact the family may not read for itself arrives with the injected context",
    run: async () => {
      await withRegistry(async (model) => {
        // A PROBE RUNNER that records the ARGUMENT OBJECT its lane was handed — which is the shape
        // that matters: a fact reaching `ctx` and not reaching the lane is a fact the lane cannot
        // answer to. Each row probes the lane that actually consumes the fact.
        const seen = [];
        const probe = (given) => {
          seen.push(given);
          return { findings: [], reads: [read("probe", 1, 1)], limits: [] };
        };
        const rows = [
          ["the marker key saying which hook entries the framework authored", "hookWiring", { markerKey: "aof" }, { markerKey: "someone-elses-marker" }, (given) => given.markerKey],
          ["the audited project's resolved role routing", "promptLayer", { roleRouting: {} }, { roleRouting: { "aof-product-owner": "agent" } }, (given) => JSON.stringify(given.roleRouting)],
          ["the subject root the audit is running over", "promptLayer", { repoRoot: "/one" }, { repoRoot: "/another" }, (given) => given.root],
          ["the instant the run is happening at", "declaredBounds", { now: 1 }, { now: 2 }, (given) => given.now],
        ];
        for (const [what, key, first, second, reader] of rows) {
          seen.length = 0;
          await audit(model, { [key]: probe, ...first });
          await audit(model, { [key]: probe, ...second });
          assert.equal(seen.length, 2, `${what}: the lane was handed its arguments twice`);
          assert.notEqual(reader(seen[0]), reader(seen[1]), `${what}: the answer changes with it`);
          assert.equal(reader(seen[1]), reader(seen[1]), `${what}: …following what was handed in`);
        }
      });
    },
  },
  {
    name: "77/05 02.2: the role routing is the AUDITED project's decision, and this repository routes the product owner inline",
    run: async () => {
      // The two routings, both driven through the face's own resolver.
      assert.deepEqual(
        resolveRoleRouting({ work: { agents: { mode: "orchestrated", productOwner: "agent" } } }),
        { "aof-product-owner": "agent" },
        "a project that would SPAWN the product owner routes it to an agent — the error rung",
      );
      assert.deepEqual(
        resolveRoleRouting({ work: { agents: { mode: "orchestrated", productOwner: "inline" } } }),
        {},
        "a project that routes it inline declares no spawn — the warn rung",
      );
      assert.deepEqual(
        resolveRoleRouting({ work: { agents: { mode: "solo", productOwner: "agent" } } }),
        {},
        "solo mode routes every role inline by definition, whatever else the configuration says",
      );
      assert.deepEqual(resolveRoleRouting({}), {}, "a project declaring no agents configuration has not declared that it spawns anything");
      assert.deepEqual(
        resolveRoleRouting({ work: { agents: { mode: "orchestrated", "aof-architect": "agent" } } }),
        { "aof-architect": "agent" },
        "…and a role named by its agent id is read too",
      );

      // THIS REPOSITORY, read from its own configuration file rather than described.
      const config = JSON.parse(await readFile(path.join(repoRoot, ".aof", "aof.config.json"), "utf8"));
      assert.equal(config.work.agents.productOwner, "inline", "this repository routes the product owner inline");
      assert.deepEqual(resolveRoleRouting(config), {}, "…so no role resolves to a spawn, and its live capability gap is a warning");
    },
  },
  {
    name: "77/05 02.3 (Scenario Outline, all three rows): every error-severity leg measures zero in this repository on arrival",
    run: async () => {
      // (a) A DUPLICATE HOOK PAIR — the pairs this repository carried were deleted at 72/03.
      const settings = JSON.parse(await readFile(path.join(repoRoot, ".claude", "settings.json"), "utf8"));
      const hooks = runHookWiring({ settings, markerKey: AOF_HOOK_MARKER, settingsPath: ".claude/settings.json" });
      assert.equal(hooks.findings.filter((entry) => entry.severity === "error").length, 0, "no duplicate hook pair is reported here");
      assert.ok(hooks.reads[0].count > 0, `…over a real population (${hooks.reads[0].count} entries), so the zero is a measurement`);

      // (b) AN UNCAPPED OR UNKNOWN LOOP CEILING — held at zero by an existing gate over this
      // repository's own registry.
      const framework = await loadLoops({ aofDir: path.join(repoRoot, "src", "bundle"), projectRoot: repoRoot });
      const bounds = runDeclaredBounds({ model: framework, declaredBounds: {}, now: Date.parse("2026-09-03T00:00:00.000Z") });
      assert.equal(bounds.findings.filter((entry) => entry.severity === "error").length, 0, "no loop declares an uncapped or unknown ceiling here");
      assert.ok(bounds.reads[0].count > 0, `…over a real registry (${bounds.reads[0].count} loops)`);

      // (c) A CAPABILITY GAP IN A PROJECT THAT WOULD SPAWN THE ROLE — this one routes inline, so
      // the error rung is unreachable here, and that is a property of the configuration rather than
      // of what the prompt layer happens to contain today.
      const config = JSON.parse(await readFile(path.join(repoRoot, ".aof", "aof.config.json"), "utf8"));
      assert.deepEqual(Object.values(resolveRoleRouting(config)), [], "no role in this repository is declared as spawned");
    },
  },
  {
    name: "77/05 02.4: the lanes are clock-free, so one process gives one answer twice",
    run: async () => {
      const now = Date.parse("2026-09-03T00:00:00.000Z");
      const settings = JSON.parse(await readFile(path.join(repoRoot, ".claude", "settings.json"), "utf8"));
      const first = runHookWiring({ settings, markerKey: AOF_HOOK_MARKER, settingsPath: ".claude/settings.json", now });
      const framework = await loadLoops({ aofDir: path.join(repoRoot, "src", "bundle"), projectRoot: repoRoot });
      const firstBounds = runDeclaredBounds({ model: framework, declaredBounds: {}, now });
      // Time passes between the two runs, and nothing about the answer may follow it.
      await new Promise((resolve) => { setTimeout(resolve, 5); });
      const second = runHookWiring({ settings, markerKey: AOF_HOOK_MARKER, settingsPath: ".claude/settings.json", now });
      const secondBounds = runDeclaredBounds({ model: framework, declaredBounds: {}, now });
      assert.deepEqual(second.findings, first.findings, "the hook lane reports the same findings, each at the same severity");
      assert.deepEqual(secondBounds.findings, firstBounds.findings, "…and so does the bounds lane");
      for (const entry of [...secondBounds.findings, ...second.findings]) {
        assert.equal(/20\d\d-\d\d-\d\dT/u.test(entry.message), false, `no finding is reported against an instant later than the one handed in: ${entry.message}`);
      }
    },
  },
];
