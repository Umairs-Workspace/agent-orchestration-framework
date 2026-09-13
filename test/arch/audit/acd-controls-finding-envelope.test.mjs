// FF-6606 (milestone 66 / ADR-003 §5) — THE FINDING ENVELOPE AND CODE SET ARE FROZEN
// AND EXHAUSTIVELY REACHABLE.
//
// "Every finding is exactly `{code, severity, path, message}` with a non-empty
//  raw-absolute `path`; the exported code array is exactly the eight of ADR-003 §5;
//  each of the eight is produced by a fixture — an unreachable code is as much a
//  defect as an unfrozen one."
//
// ─────────────────────────────────────────────────────────────────────────────
// THE SECOND HALF IS THE ONE WITH TEETH, AND IT IS THIS MILESTONE'S OWN LESSON.
// Freezing a code set is cheap and unfalsifiable on its own: an array literal compared
// with an array literal passes whether or not any code can ever be emitted. So every
// one of the eight is DRIVEN OUT OF A FIXTURE here. Four of the five guard defects the
// finding measured shared exactly one property — nobody had ever seen the assertion
// fail — and a frozen-but-unreachable code is the same defect wearing a contract's
// clothes.
//
// THE FIXTURE IS THE BEHAVIOURAL SUITE'S, IMPORTED RATHER THAN COPIED. `allEightFixture`
// is exported from `test/work/record/work-doctor-controls.test.mjs` because a second copy of a
// fixture engineered to fire all eight codes is a second thing to drift; when a code's
// trigger changes, one edit must move both this gate and the traceability suite or
// neither.
import assert from "node:assert/strict";
import path from "node:path";
import { CONTROL_FINDING_CODES, controlsLane, registerGroup, verificationGroup, controlGroup } from "../../../src/work/doctor-controls.mjs";
import { allEightFixture } from "../../work/record/work-doctor-controls.test.mjs";

// ADR-003 §5's three lanes, spelled out here so the gate compares the SHIPPED array
// against the DECIDED one rather than against itself. A change to either side without
// the other is what this lane refuses.
const ADR_CODES = {
  "register lane": ["register-duplicate-id", "register-dangling-citation"],
  "verification lane": ["verification-register-missing", "verification-missing-red-probe"],
  "control lane": ["control-unresolved", "control-unregistered", "control-runner-unchecked", "staged-control"],
};
const ADR_CODE_SET = Object.values(ADR_CODES).flat();

// The whole envelope, from m52/ADR-007 by way of ADR-003 §5. Four keys, no more.
const ENVELOPE_KEYS = ["code", "message", "path", "severity"];
const SEVERITY_DOMAIN = ["error", "warn"];

// Every finding the lane can emit from the all-eight fixture, in both leg-B states:
// with a runner list configured (seven codes) and without one (the eighth, which
// reports that leg B did not run and therefore cannot coexist with a configured list).
function allFindings() {
  const configured = allEightFixture();
  return [...controlsLane(configured, {}), ...controlsLane({ ...configured, runnerTexts: null }, {})];
}

export const archTests = [
  {
    name: "arch/FF-6606: the exported code array is SET-EQUAL to ADR-003 §5's eight, and it is frozen",
    run: () => {
      assert.deepEqual([...CONTROL_FINDING_CODES].sort(), [...ADR_CODE_SET].sort(), "the code set is exactly ADR-003 §5's — adding a ninth is an ADR-level act, not an edit to a call site");
      assert.equal(CONTROL_FINDING_CODES.length, 8, "eight, with no duplicates");
      assert.equal(new Set(CONTROL_FINDING_CODES).size, 8);
      assert.equal(Object.isFrozen(CONTROL_FINDING_CODES), true, "and the array itself cannot be pushed to at run time");
      // The lane split is asserted too, so a code moving between lanes is visible.
      assert.deepEqual(CONTROL_FINDING_CODES.slice(0, 2), ADR_CODES["register lane"]);
      assert.deepEqual(CONTROL_FINDING_CODES.slice(2, 4), ADR_CODES["verification lane"]);
      assert.deepEqual(CONTROL_FINDING_CODES.slice(4), ADR_CODES["control lane"]);
    },
  },
  {
    name: "arch/FF-6606: EVERY ONE of the eight is produced by a fixture — an unreachable code is as much a defect as an unfrozen one",
    run: () => {
      const emitted = new Set(allFindings().map((finding) => finding.code));
      assert.deepEqual([...emitted].sort(), [...ADR_CODE_SET].sort(), `every frozen code is reachable; missing: ${ADR_CODE_SET.filter((code) => !emitted.has(code)).join(", ") || "none"}`);
      // …and each lane's own group really emits its own codes, so a code is not
      // reachable only because some OTHER group happens to produce it.
      const fixture = allEightFixture();
      const byGroup = {
        registerGroup: new Set(registerGroup(fixture, {}).map((finding) => finding.code)),
        verificationGroup: new Set(verificationGroup(fixture, {}).map((finding) => finding.code)),
        controlGroup: new Set([...controlGroup(fixture, {}), ...controlGroup({ ...fixture, runnerTexts: null }, {})].map((finding) => finding.code)),
      };
      assert.deepEqual([...byGroup.registerGroup].sort(), [...ADR_CODES["register lane"]].sort());
      assert.deepEqual([...byGroup.verificationGroup].sort(), [...ADR_CODES["verification lane"]].sort());
      assert.deepEqual([...byGroup.controlGroup].sort(), [...ADR_CODES["control lane"]].sort());
    },
  },
  {
    name: "arch/FF-6606: no code OUTSIDE the frozen eight ever reaches a reader",
    run: () => {
      const findings = allFindings();
      assert.ok(findings.length >= 8, `non-vacuity: the fixture produced ${findings.length} findings`);
      const outside = findings.filter((finding) => !CONTROL_FINDING_CODES.includes(finding.code));
      assert.deepEqual(outside, [], "the set the lane emitted is exactly the eight, with nothing added");
    },
  },
  {
    name: "arch/FF-6606: the envelope is exactly {code, severity, path, message}, the severity domain is two words, and the path is a raw absolute",
    run: () => {
      const findings = allFindings();
      for (const finding of findings) {
        assert.deepEqual(Object.keys(finding).sort(), ENVELOPE_KEYS, `keys: ${JSON.stringify(finding)}`);
        assert.equal(typeof finding.code, "string");
        assert.ok(SEVERITY_DOMAIN.includes(finding.severity), `severity ${finding.severity} is outside {error, warn}`);
        assert.equal(typeof finding.path, "string");
        assert.ok(finding.path.length > 0, "the path is non-empty");
        assert.equal(path.isAbsolute(finding.path), true, `${finding.path} is a RAW ABSOLUTE in OS-native form — relativising is the face's job (the 08/ADR-002 keystone)`);
        assert.equal(typeof finding.message, "string");
        assert.ok(finding.message.trim().length > 0, "the message is non-empty");
      }
      // The path is OS-NATIVE, never slashed for display: on win32 it carries `\`.
      if (path.sep === "\\") {
        assert.ok(findings.every((finding) => finding.path.includes("\\")), "on win32 the raw path is backslashed — no face projection has happened");
      }
    },
  },
  {
    name: "arch/FF-6606: NON-VACUITY — the envelope check detects a fifth key, a third severity, a relative path and a ninth code",
    run: () => {
      // The gate's own assertions, driven over FABRICATED findings, so "the lane is
      // clean" is distinguishable from "the check cannot see anything". Each planted
      // defect is checked with the SAME expression the lanes above use.
      const keysOf = (finding) => Object.keys(finding).sort();
      assert.notDeepEqual(keysOf({ code: "x", severity: "warn", path: "/a", message: "m", line: 3 }), ENVELOPE_KEYS, "a fifth key is a different envelope");
      assert.notDeepEqual(keysOf({ code: "x", severity: "warn", path: "/a" }), ENVELOPE_KEYS, "…and so is a missing one");
      assert.equal(SEVERITY_DOMAIN.includes("info"), false, "a third severity is outside the domain");
      assert.equal(path.isAbsolute("wiki/work/66/ARCHITECTURE.md"), false, "a relativised path is detected");
      assert.equal(CONTROL_FINDING_CODES.includes("control-stale-pending"), false, "a ninth code — the one ADR-009/J explicitly refused — is not in the set");
      // …and the shipped shapes still pass the same expressions, so the lane is not
      // simply refusing everything.
      assert.deepEqual(keysOf({ code: "x", severity: "warn", path: "/a", message: "m" }), ENVELOPE_KEYS);
      assert.equal(path.isAbsolute(path.join(path.sep === "\\" ? "C:\\r" : "/r", "a")), true);
    },
  },
  {
    name: "arch/FF-6606: the codes are STABLE STRINGS — kebab-case, no whitespace, and each names the fact rather than the lane",
    run: () => {
      for (const code of CONTROL_FINDING_CODES) {
        assert.match(code, /^[a-z]+(?:-[a-z]+)+$/, `${code} is a stable kebab-case machine code`);
        assert.equal(code.trim(), code);
      }
      // A consumed contract: the eight are asserted verbatim, so a rename is visible as
      // a diff on this line rather than as a silently-changed downstream filter.
      assert.deepEqual(
        [...CONTROL_FINDING_CODES],
        [
          "register-duplicate-id",
          "register-dangling-citation",
          "verification-register-missing",
          "verification-missing-red-probe",
          "control-unresolved",
          "control-unregistered",
          "control-runner-unchecked",
          "staged-control",
        ],
      );
    },
  },
];
