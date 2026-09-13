// Fitness function: acd-strict-is-two-policies (milestone 59, FF-5911; 59/ADR-002 §2a, 15/ADR-002).
//
//   `--strict` means two DIFFERENT things on `aof work doctor` and `aof work audit`, and that is a
//   decision rather than a drift.
//
// The two commands are siblings on one command core and 59/ADR-002 §2 says the audit reuses
// doctor's contract WHOLESALE — the finding envelope, the basis-neutral path, scope-as-filter,
// `--json`, and `--strict` as a face concern. The exit POLICY is the one thing it does not reuse:
//
//   · `work:doctor` (15/ADR-002)      an error ALWAYS gates; `--strict` promotes WARNINGS.
//   · `work:audit`  (59/ADR-002 §2a)  an error gates ONLY under `--strict`; `--strict` promotes
//                                     NOTHING — a warn-only run exits 0 even under `--strict`.
//
// WHY THIS NEEDS A CONTROL AND NOT A PARAGRAPH. 15/ADR-002 CONSIDERED the audit's policy and
// REJECTED it ("Make `error` advisory too (only `--strict` ever gates anything). Rejected"), for
// doctor. So the next reader who finds the two tables side by side has a recorded rejection in one
// hand and a divergent implementation in the other, and the cheapest move — "harmonise them" —
// silently puts `aof work audit` on the gate path, which is exactly the sixth rung of 54/FF-5409's
// FROZEN five-row cost ladder that 59/ADR-007 §1 refuses to add by the back door. Milestone 77
// extends this same command (59/ADR-002 §4) and would inherit the paragraph; it now inherits a gate.
//
// The per-command BEHAVIOUR is task-`.feature` material and is contracted there
// (`59/04/00_one-command-over-the-instruments.feature`, three scenarios). The CROSS-COMMAND
// invariant — that the two tables differ, in exactly these two cells, in this direction — belongs to
// no single feature, which is why it is a fitness function.
//
// SIX LEGS, each driven through the REAL registered faces rather than over source text:
//   (a) doctor's table, all six cells;
//   (b) the audit's table, all six cells;
//   (c) the DIFFERENCE is exactly two named cells — a harmonisation in EITHER direction fails here;
//   (d) `--strict` is a face concern on both and changes no finding set (the half of 15/ADR-002 the
//       divergence does not touch);
//   (e) `--json`'s `healthy` agrees with the exit code on both, so a CI step reading the envelope
//       and one reading `$?` cannot reach opposite verdicts;
//   (f) the RATCHET — the set of core commands carrying a `--strict` flag is closed, so an eighth
//       cannot ship without somebody saying which of the two policies it follows.
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getCommand, listCommands } from "../../../src/command-core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// The six cells of the exit table: a population crossed with the flag. `clean` is in the sweep
// because "neither command gates on nothing" is half of what makes the divergence bounded.
const CELLS = Object.freeze(["clean/plain", "clean/strict", "warn/plain", "warn/strict", "error/plain", "error/strict"]);

// 15/ADR-002, verbatim: `failed = errors.length > 0 || (options.strict && warns.length > 0)`.
const DOCTOR_POLICY = Object.freeze({
  "clean/plain": 0, "clean/strict": 0,
  "warn/plain": 0, "warn/strict": 1,
  "error/plain": 1, "error/strict": 1,
});

// 59/ADR-002 §2a: advisory even on an error; `--strict` is the door into the gate and promotes
// nothing on its way through.
const AUDIT_POLICY = Object.freeze({
  "clean/plain": 0, "clean/strict": 0,
  "warn/plain": 0, "warn/strict": 0,
  "error/plain": 0, "error/strict": 1,
});

// The two cells where the tables differ, frozen. This list IS the invariant: shrink it (harmonise)
// or grow it (a third policy arrives) and this gate reports before CI does.
const DIVERGENT_CELLS = Object.freeze(["error/plain", "warn/strict"]);

// Every command on the core that declares a `--strict` flag. Six follow doctor's family (an error
// always gates); `work:audit` is the ONE exception and the reason this file exists. An eighth
// arrival fails leg (f) until it is classified here.
const STRICT_COMMANDS = Object.freeze([
  "assets:apply",
  "assets:validate",
  "packages:validate",
  "project:doctor",
  "project:validate",
  "work:audit",
  "work:doctor",
]);

// A finding in each command's shared envelope (15/ADR-001 plus 59/ADR-006's two addressing keys).
// The path is a raw absolute, because both faces relativise on the way out and a non-path would
// make the `--json` legs fail for the wrong reason.
function finding(severity) {
  return Object.freeze({
    code: severity === "error" ? "audit-ran-on-nothing" : "loop-unconsulted",
    severity,
    path: root,
    message: `a ${severity}-severity probe finding`,
    about: "module:src/work-audit/report.mjs",
    to: [],
  });
}

function findingsFor(population) {
  return population === "clean" ? [] : [finding(population)];
}

const doctorResult = (findings) => ({ findings });

// The audit's face reads more of the envelope than doctor's does, so the fixture carries the whole
// of it — a partial one would throw inside `json()` and look like a policy failure.
const auditResult = (findings) => ({
  findings,
  summary: {
    error: findings.filter((entry) => entry.severity === "error").length,
    warn: findings.filter((entry) => entry.severity === "warn").length,
    lanes: 1,
  },
  scope: { requested: null, applied: false, nothingMatched: false, matched: [], audited: [] },
  lanes: [],
  reads: [],
  limits: [],
  escalation: null,
  auditors: [],
  registry: { source: null },
});

function faces() {
  const doctor = getCommand("work:doctor");
  const audit = getCommand("work:audit");
  // THE FLOOR, BEFORE ANY CLAIM. A table driven over a command that does not resolve, or whose face
  // carries no `exit`, is six comparisons of undefined with undefined (ADR-004 §1 applied to this
  // gate itself).
  for (const [id, command] of [["work:doctor", doctor], ["work:audit", audit]]) {
    assert.ok(command != null, `${id} resolves from the command registry`);
    assert.equal(typeof command.cli?.exit, "function", `${id} carries an exit face — the gate is a FACE concern on both`);
    assert.equal(typeof command.cli?.json, "function", `${id} carries a --json face`);
  }
  assert.equal(CELLS.length, 6, "the table is the full population × flag cross-product");
  return { doctor, audit };
}

function tableFor(command, resultFor) {
  const table = {};
  for (const cell of CELLS) {
    const [population, mode] = cell.split("/");
    table[cell] = command.cli.exit(resultFor(findingsFor(population)), { options: { strict: mode === "strict" } });
  }
  return table;
}

export const archTests = [
  {
    name: "arch/59 FF-5911: `work:doctor`'s --strict gates on an error either way and promotes a warning (15/ADR-002)",
    run: () => {
      const { doctor } = faces();
      const table = tableFor(doctor, doctorResult);
      assert.deepEqual(table, DOCTOR_POLICY,
        "doctor's exit policy is 15/ADR-002's: `errors > 0 || (strict && warns > 0)` — an error is already a failure and --strict promotes WARNINGS");
      // Non-vacuity: a face that returned 0 for everything would satisfy nothing above by accident.
      assert.ok(Object.values(table).some((code) => code === 1), "doctor really gates in at least one cell");
    },
  },

  {
    name: "arch/59 FF-5911: `work:audit`'s --strict is the door INTO the gate, and promotes nothing on the way through (59/ADR-002 §2a)",
    run: () => {
      const { audit } = faces();
      const table = tableFor(audit, auditResult);
      assert.deepEqual(table, AUDIT_POLICY,
        "the audit's exit policy is `strict && errors > 0` — an error alone is advisory, and a warn-only run exits 0 EVEN under --strict");
      // The two sentences that make it a decision rather than an omission, asserted by name.
      assert.equal(table["error/plain"], 0,
        "an error-severity audit finding is REPORTED and exits 0: the audit is deliberately off 54/FF-5409's frozen five-row cost ladder (59/ADR-007 §1), so a bare `aof work audit` may not redden a build that merely ran it");
      assert.equal(table["warn/strict"], 0,
        "--strict promotes NOTHING here: it turns the error report into a gate and leaves warnings advisory");
      assert.ok(Object.values(table).some((code) => code === 1), "…and --strict really is a gate: the audit fails in at least one cell");
    },
  },

  {
    name: "arch/59 FF-5911: the two policies differ in EXACTLY two named cells, and a harmonisation in either direction fails here",
    run: () => {
      const { doctor, audit } = faces();
      const doctorTable = tableFor(doctor, doctorResult);
      const auditTable = tableFor(audit, auditResult);

      const diverged = CELLS.filter((cell) => doctorTable[cell] !== auditTable[cell]).sort();
      assert.deepEqual(diverged, [...DIVERGENT_CELLS].sort(),
        "`--strict` means two things on two sibling commands, and this is the whole of it.\n"
        + `  work:doctor  ${JSON.stringify(doctorTable)}\n`
        + `  work:audit   ${JSON.stringify(auditTable)}\n`
        + "A SHRUNK list means somebody harmonised the two — most likely by making the audit gate on a\n"
        + "bare error, which adds a sixth rung to 54/FF-5409's FROZEN cost ladder by the back door\n"
        + "(59/ADR-007 §1). A GROWN list means a third policy arrived. Either way the divergence is a\n"
        + "recorded decision (59/ADR-002 §2a) and moving it is an ADR, not a patch.");

      // The direction, not just the fact: it is always the audit that is the LOOSER of the two, and
      // never the reverse. A future "fix" that made doctor advisory would keep the diff at two cells
      // while inverting the meaning of both.
      for (const cell of DIVERGENT_CELLS) {
        assert.equal(doctorTable[cell], 1, `${cell}: doctor gates`);
        assert.equal(auditTable[cell], 0, `${cell}: the audit reports`);
      }
    },
  },

  {
    name: "arch/59 FF-5911: on BOTH commands --strict is a face concern that changes no finding set — the half of 15/ADR-002 the divergence does not touch",
    run: () => {
      const { doctor, audit } = faces();
      for (const [id, command, resultFor] of [["work:doctor", doctor, doctorResult], ["work:audit", audit, auditResult]]) {
        const properties = command.input?.properties ?? {};
        assert.equal(Object.prototype.hasOwnProperty.call(properties, "strict"), false,
          `${id}: \`strict\` is not part of \`input\` — \`run\` returns the full advisory set and the gate lives on the face (15/ADR-002)`);
        assert.equal(command.input?.additionalProperties, false,
          `${id}: the input schema is closed, so \`strict\` cannot arrive as an extra property`);

        const result = resultFor([finding("warn"), finding("error")]);
        const plain = command.cli.json(result, { options: {} });
        const strict = command.cli.json(result, { options: { strict: true } });
        assert.ok(plain.findings.length > 0, `${id}: the --json probe is non-vacuous`);
        assert.deepEqual(strict.findings, plain.findings,
          `${id}: the finding SET is identical with and without --strict — only the verdict moves`);
        assert.equal(plain.strict, false, `${id}: --json reports the flag it was given`);
        assert.equal(strict.strict, true, `${id}: --json reports the flag it was given`);
      }
    },
  },

  {
    name: "arch/59 FF-5911: on BOTH commands --json's `healthy` agrees with the exit code, so the envelope and `$?` cannot disagree",
    run: () => {
      const { doctor, audit } = faces();
      for (const [id, command, resultFor] of [["work:doctor", doctor, doctorResult], ["work:audit", audit, auditResult]]) {
        for (const cell of CELLS) {
          const [population, mode] = cell.split("/");
          const result = resultFor(findingsFor(population));
          const faceCtx = { options: { strict: mode === "strict" } };
          const code = command.cli.exit(result, faceCtx);
          const envelope = command.cli.json(result, faceCtx);
          assert.equal(envelope.healthy, code === 0,
            `${id} @ ${cell}: a CI step reading \`healthy\` and one reading the exit code reach the SAME verdict — two commands with two --strict policies is already enough for an operator to hold`);
        }
      }
    },
  },

  {
    name: "arch/59 FF-5911: the set of core commands carrying --strict is closed — an eighth must declare which of the two policies it follows",
    run: () => {
      const declared = listCommands()
        .filter((command) => Object.prototype.hasOwnProperty.call(command?.cli?.spec?.flags ?? {}, "strict"))
        .map((command) => command.id)
        .sort();
      assert.ok(declared.length > 1, `the sweep really found the --strict commands (${declared.length})`);
      assert.deepEqual(declared, [...STRICT_COMMANDS].sort(),
        "a command carrying `--strict` arrived or left. `--strict` already means two different things\n"
        + "on this core (15/ADR-002 for doctor, 59/ADR-002 §2a for the audit); a THIRD reading that\n"
        + "nobody wrote down is how an operator's CI step starts lying. Classify the new command here —\n"
        + "does an error gate without the flag, or does the flag open the gate? — and drive its table.");
      // The one exception is the audit, and it is named rather than counted.
      assert.ok(declared.includes("work:audit") && declared.includes("work:doctor"),
        "the two commands this gate drives are both still on the core");
    },
  },
];
