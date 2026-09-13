// Fitness function: acd-day-one-audit-complete (milestone 59 / story 04, FF-5910;
// ADR-001, ADR-006, ADR-007 §1).
//
//   "A grammar nobody writes in is a grammar nobody has tested."
//
// Every previous widening of this registry shipped the records that use it in the same milestone,
// and this one does the same: ONE auditor, declared in the framework's own bundle, installed into
// every project that runs aof. Its declaration is where the milestone's rules stop being prose:
// it names the instruments it reads and none of them is a work item; it names HOW it reads them
// and that reading is a command rather than a document; it names its cadence, so "how often" is a
// fact rather than a habit; it names the actor it can reach directly; and it declares no edge back
// to anything in its own subject list, because an auditor that reported to the thing it audits
// would be the arrangement this milestone exists to replace.
//
// SIX LEGS, and each asserts its floor before its claim (ADR-004 §1 applied to this gate itself —
// a sweep over a renamed directory reads zero records and every claim below becomes vacuous):
//   (a) exactly one `kind: auditor` record ships, and the whole registry loads with no error;
//   (b) every `audits:` pointer resolves to a FILE, a REGISTERED COMMAND or a DECLARED NODE, and
//       none of them is a work item;
//   (c) the measurement is a registered command and cites no document as its authority;
//   (d) `escalation:` names a declared actor whose ground is exogenous;
//   (e) `reporting:` and `audits:` are disjoint;
//   (f) the shipped registry produces ZERO findings in `GATING_CODES`, and `aof work audit` is
//       registered on the command core with a derived route — a CLI↔registry bijection, so the
//       verb an operator types and the registry cannot disagree.
//   (g) the cadence is declared AND the audit is runnable with no scheduler in existence:
//       `work:audit` is deliberately absent from the frozen five-row cost ladder (ADR-007 §1).
import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getCommand, listCommands } from "../../../src/command-core.mjs";
import { deriveRouteTable } from "../../../src/spine/face.mjs";
import { GATE_ORDER } from "../../../src/work/loop.mjs";
import { loadLoops } from "../../../src/work/loops.mjs";
import {
  GATING_CODES,
  checkActuatorArbitration,
  checkAnchorGrounding,
  checkGrounding,
  checkPairing,
  checkReferenceOwnership,
  checkTimescale,
} from "../../../src/work/loops-checks.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const BUNDLE = path.join(root, "src", "bundle");
const LOOPS_DIR = path.join(BUNDLE, "loops");

const CHECKS = Object.freeze([
  checkGrounding,
  checkAnchorGrounding,
  checkPairing,
  checkReferenceOwnership,
  checkActuatorArbitration,
  checkTimescale,
]);

const shipped = () => loadLoops(BUNDLE);

async function theAuditor() {
  const model = await shipped();
  const auditors = model.nodes.filter((node) => node.kind === "auditor");
  assert.equal(auditors.length, 1, `exactly one shipped record declares the auditor kind (found ${auditors.length})`);
  return { model, auditor: auditors[0] };
}

const rawsOf = (field) => (Array.isArray(field) ? field : field == null ? [] : [field]).map((entry) => entry.raw);

// A `module:` pointer's file half, and its symbol half. The grammar already refused a `module:`
// with no `#symbol`, so both halves are present by the time this runs.
function moduleParts(raw) {
  const rest = raw.slice("module:".length);
  const hash = rest.indexOf("#");
  return { file: rest.slice(0, hash), symbol: rest.slice(hash + 1) };
}

// The loader's own export test, restated here rather than imported because it is private to the
// loader — and because this gate asserting a DIFFERENT reading of the same file is the point: the
// pointer must name a symbol the file really exports, not merely a file that exists.
function exportsSymbol(source, symbol) {
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`^[\\t ]*export[\\t ]+(?:async[\\t ]+)?(?:function|class|const|let|var)[\\t ]+${escaped}\\b`, "mu").test(source)) return true;
  for (const match of source.matchAll(/^[\t ]*export[\t ]*\{([^}]*)\}/gmu)) {
    for (const entry of match[1].split(",")) {
      const parts = entry.trim().split(/\s+as\s+/u);
      if ((parts[1] ?? parts[0]) === symbol) return true;
    }
  }
  return false;
}

export const archTests = [
  {
    name: "arch/59 FF-5910: the framework ships exactly one auditor, and the whole registry still loads with no error",
    run: async () => {
      const names = (await readdir(LOOPS_DIR)).filter((name) => name.endsWith(".md"));
      assert.ok(names.length >= 16, `non-vacuous: ${names.length} records ship in src/bundle/loops/`);

      const { model, auditor } = await theAuditor();
      assert.equal(model.nodes.length, names.length, "every shipped record parsed into a node");
      assert.deepEqual(
        model.findings.filter((finding) => finding.severity === "error"), [],
        "the shipped registry loads with zero error-severity findings, the auditor included",
      );
      assert.deepEqual(
        model.findings.filter((finding) => finding.path === auditor.path), [],
        "…and the auditor's own record earns no finding at all, not even an honesty warn",
      );
      // THE FOUR REQUIRED DECLARATIONS (ADR-001 §1), each closing a way the audit could quietly
      // become something else.
      for (const key of ["audits", "measurement", "cadence", "escalation"]) {
        assert.ok(auditor.fields?.[key] != null, `${auditor.id}: declares ${key}`);
      }
    },
  },
  {
    name: "arch/59 FF-5910: everything the auditor says it reads resolves to a file, a registered command or a declared node — and none of it is a work item",
    run: async () => {
      const { model, auditor } = await theAuditor();
      const declared = new Set(model.nodes.map((node) => node.id));
      const registered = new Set(listCommands().map((command) => command.id));
      const audits = rawsOf(auditor.fields.audits);
      assert.ok(audits.length >= 8, `non-vacuous: the auditor names ${audits.length} instruments`);

      let files = 0;
      let commands = 0;
      let nodes = 0;
      for (const raw of audits) {
        assert.equal(raw.startsWith("item:"), false, `${raw}: a work item is not an instrument — the audit does not review the work (ADR-007 §6)`);
        assert.equal(raw.startsWith("prose:"), false, `${raw}: a paragraph is not an instrument`);
        if (raw.startsWith("module:")) {
          const { file, symbol } = moduleParts(raw);
          await access(path.join(root, file));
          const source = await readFile(path.join(root, file), "utf8");
          assert.equal(exportsSymbol(source, symbol), true, `${raw}: ${file} really exports ${symbol}`);
          files += 1;
        } else if (raw.startsWith("command:")) {
          const id = raw.slice("command:".length);
          assert.ok(registered.has(id), `${raw}: names a command REGISTERED on the core, not a verb somebody hopes exists`);
          commands += 1;
        } else {
          assert.ok(declared.has(raw), `${raw}: names a declared node of this registry`);
          nodes += 1;
        }
      }
      // ALL THREE ADMISSIBLE FORMS ARE EXERCISED, so the leg is a decision about each of them.
      assert.ok(files >= 3, `non-vacuous: ${files} module pointers`);
      assert.ok(commands >= 1, `non-vacuous: ${commands} command pointers`);
      assert.ok(nodes >= 3, `non-vacuous: ${nodes} declared-node references`);
    },
  },
  {
    name: "arch/59 FF-5910: the auditor's reading is a registered command, and it cites no document as its authority",
    run: async () => {
      const { auditor } = await theAuditor();
      const registered = new Set(listCommands().map((command) => command.id));
      const measurement = rawsOf(auditor.fields.measurement);
      assert.ok(measurement.length >= 1, `non-vacuous: ${measurement.length} measurement pointer(s)`);
      for (const raw of measurement) {
        assert.ok(raw.startsWith("command:"), `${raw}: a command, never a document — an auditor's measurement admits no prose pointer at all (ADR-001 §1)`);
        assert.ok(registered.has(raw.slice("command:".length)), `${raw}: and the command is registered`);
      }
      assert.ok(measurement.includes("command:work:audit"), "the auditor reads its instruments through the command this story ships");
      // The kind's refusal is upstream of this record and is what makes the assertion structural
      // rather than a convention about one file: a `prose:` measurement on a `kind: auditor` is
      // `loop-bad-value` at ERROR severity, which leg (a)'s zero-error assertion already covers.
      for (const field of ["measurement", "audits"]) {
        for (const raw of rawsOf(auditor.fields[field])) {
          assert.equal(raw.startsWith("prose:"), false, `${field}: ${raw} is not a paragraph`);
        }
      }
    },
  },
  {
    name: "arch/59 FF-5910: the auditor declares where it can go directly — a declared actor grounded outside this system",
    run: async () => {
      const { model, auditor } = await theAuditor();
      const raw = auditor.fields.escalation.raw;
      assert.ok(raw.startsWith("actor:"), `${raw}: an actor, because a bypass terminating at another loop would be one more hop through the machinery (ADR-006 §3)`);
      const actor = model.nodes.find((node) => node.id === raw);
      assert.ok(actor != null, `${raw}: names a DECLARED node`);
      assert.equal(actor.kind, "actor", `${raw}: of kind actor`);
      assert.equal(actor.fields?.ground?.value, "exogenous", `${raw}: grounded OUTSIDE this system — the registry's exogenous contact with reality`);
    },
  },
  {
    name: "arch/59 FF-5910: the auditor does not report to anything it audits, and it declares no edge the kind refuses",
    run: async () => {
      const { auditor } = await theAuditor();
      const reporting = (auditor.edges?.reporting ?? []).map((endpoint) => endpoint.raw);
      const audits = new Set(rawsOf(auditor.fields.audits));
      assert.ok(reporting.length >= 1, `non-vacuous: the auditor declares ${reporting.length} reporting edge(s)`);
      assert.ok(audits.size >= 8, `non-vacuous: it audits ${audits.size} instruments`);

      const both = reporting.filter((endpoint) => audits.has(endpoint));
      assert.deepEqual(both, [], "no node appears in both its reporting edges and its subject list");

      // ADR-001 §5a — `data-feed` and `reporting` ALONE. The other four are refused at the
      // ENDPOINT by the loader, so a declared one would be an error-severity `loop-bad-value`;
      // this asserts the record does not even try, and names why `monitoring` is the sharp one:
      // `checkPairing` reads the EDGE, not the source's kind, so an auditor monitoring a loop
      // would clear that loop's GATING `loop-unpaired-optimizer` by auditing it.
      for (const refused of ["target-setting", "veto", "parameter-tuning", "monitoring"]) {
        assert.equal(auditor.edges?.[refused] == null, true, `${auditor.id}: declares no ${refused} edge`);
      }
    },
  },
  {
    name: "arch/59 FF-5910: the shipped registry produces zero gating findings, and work:audit is registered with a derived route",
    run: async () => {
      const model = await shipped();
      const findings = CHECKS.flatMap((check) => check(model));
      assert.ok(findings.length >= 1, `non-vacuous: the checks ran and produced ${findings.length} advisory finding(s)`);
      assert.ok(GATING_CODES.size >= 13, `non-vacuous: ${GATING_CODES.size} codes gate`);
      assert.deepEqual(
        findings.filter((finding) => GATING_CODES.has(finding.code)),
        [],
        "the shipped registry, the auditor included, raises no finding whose code stops the run",
      );

      // THE CLI↔REGISTRY BIJECTION for this verb: it is a member of the registry, it carries a
      // route, and that route resolves back to this same command. A verb the operator types and a
      // registry entry that disagree is the failure this leg exists to make impossible.
      const command = getCommand("work:audit");
      assert.ok(command != null, "work:audit is a member of the command registry");
      assert.equal(typeof command.run, "function", "…with a run");
      assert.equal(typeof command.cli?.argv, "function", "…and a cli adapter");
      assert.deepEqual(command.cli.route, ["work", "audit"], "…carrying the route an operator types");
      const table = deriveRouteTable(listCommands());
      assert.equal(table.get("work audit"), command, "…and the DERIVED route table resolves that verb back to this exact command");
      assert.equal(listCommands().filter((entry) => entry.id === "work:audit").length, 1, "…exactly once");
    },
  },
  {
    name: "arch/59 FF-5910: the cadence is declared, and the audit is runnable on demand with no scheduler in existence",
    run: async () => {
      const { auditor } = await theAuditor();
      const cadence = auditor.fields.cadence;
      assert.ok(cadence != null, "a cadence is declared");
      assert.notEqual(cadence.kind, "unknown", "…and it is a fact rather than an admitted gap");
      assert.ok(
        cadence.kind === "event" || cadence.kind === "periodic",
        `the cadence is usable (${cadence.raw}) — "how often" is a fact on the record, not a habit`,
      );

      // NOTHING SCHEDULES IT, AND THAT IS THE DECISION (ADR-007 §1). 54/FF-5409 froze the
      // five-row cost ladder as a DELIVERED acceptance criterion; adding a `work:audit` rung would
      // edit a shipped contract. The trigger that honours the cadence is milestone 63's.
      const ladder = GATE_ORDER.map((rung) => rung.command ?? `${rung.act}:${rung.phase}`);
      assert.equal(GATE_ORDER.length, 5, `the cost ladder is still five rungs (${ladder.join(" → ")})`);
      assert.equal(ladder.includes("work:audit"), false, "work:audit is NOT a rung — the audit is declared, not scheduled");
      // …and it is runnable anyway, which is what makes the refusal above a design and not a gap.
      assert.equal(typeof getCommand("work:audit").run, "function", "the verb exists and can be run on demand");
    },
  },
];
