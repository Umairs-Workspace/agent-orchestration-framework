// FF-5410 (milestone 54 / ADR-007 §2) — THE DOCTOR GATE'S ADMITTED SCOPE, SEVERITY AND CODE
// SET ARE EXACTLY THE RULED ONES.
//
// This is the rung that CHANGES BEHAVIOUR — it can halt a loop where no doctor gate existed
// — so it is the one that must not be able to drift. Four properties, each closing a way the
// gate could go wrong, and each measured into existence rather than asserted from taste:
//
//   1. It is invoked with the DRIVEN ITEM'S OWN SCOPE and never stream-wide. Without that,
//      one un-authored register anywhere under `wiki/work` stops every loop in the repo —
//      `70/ADR-007`'s inherited-red pathology, by name.
//   2. It admits `severity === "error"` ONLY. Stream-wide the doctor returns 397 findings and
//      396 are `warn`; a gate that read warns would block every loop here on a numbering
//      artefact.
//   3. It never reads `loopReady`. `53/ADR-007` already rules the score never gates below L3.
//   4. Its admitted codes are DERIVED BY FILTER from `CONTROL_FINDING_CODES`, never restated
//      as a literal — so neither `verification-*` code can enter the gate, and a ninth
//      control code cannot silently join it.
//
// `severityFor` is neither re-derived nor modified: the gate reads the severity the doctor
// already reported, which is what makes `66/ADR-002`'s horizon the single authority.
//
// `m45/R5`: a fitness function must check what its name claims. Every property below is read
// off the running gate or its structurally-cut body — never off a comment.
import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { admittedDoctorFindings, DOCTOR_GATE_CODES } from "../../../src/commands/loop.mjs";
import { CONTROL_FINDING_CODES } from "../../../src/work/doctor-controls.mjs";
import { stripComments, functionBody } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const ladderBody = async () => {
  const source = stripComments(await readFile(path.join(repoRoot, "src", "commands", "loop.mjs"), "utf8"));
  const body = functionBody(source, "async function invokeGateLadder(");
  assert.ok(body != null, "the gate ladder's body was found structurally — a moved declaration fails HERE, loudly, rather than asserting over the wrong region");
  return body;
};

export const archTests = [
  {
    name: "arch/FF-5410: the admitted set is CONTROL_FINDING_CODES minus its two verification members and control-runner-unchecked — derived, never restated",
    run: async () => {
      const expected = CONTROL_FINDING_CODES.filter((code) => !code.startsWith("verification-") && code !== "control-runner-unchecked");
      assert.deepEqual([...DOCTOR_GATE_CODES], expected);
      assert.deepEqual(
        [...DOCTOR_GATE_CODES],
        ["register-duplicate-id", "register-dangling-citation", "control-unresolved", "control-unregistered", "staged-control"],
        "five codes, each a fact about the item's own CODE",
      );
      assert.equal(Object.isFrozen(DOCTOR_GATE_CODES), true);

      // A NINTH CONTROL CODE CANNOT SILENTLY JOIN OR LEAVE THE GATE. Proven on the source,
      // because the property is precisely that there is no second list to fall out of step:
      // no admitted code appears as a literal anywhere in the module.
      const source = stripComments(await readFile(path.join(repoRoot, "src", "commands", "loop.mjs"), "utf8"));
      assert.match(source, /DOCTOR_GATE_CODES\s*=\s*Object\.freeze\(\s*CONTROL_FINDING_CODES\.filter/u, "the set is a filter over the frozen array");
      for (const code of expected) {
        assert.ok(!source.includes(`"${code}"`), `no admitted code is restated as a literal (found "${code}")`);
      }
      // The two EXCLUSIONS are expressed as rules, not as a denylist of names either.
      assert.ok(!source.includes('"verification-register-missing"'), "the verification exclusion is a rule, not a name list");
      assert.ok(!source.includes('"verification-missing-red-probe"'), "…both of them");
    },
  },

  {
    name: "arch/FF-5410: neither verification code can enter the gate, at any severity",
    run: () => {
      // `verify.md:130-132` makes the red-probe register an artefact THE VERIFY PHASE ITSELF
      // AUTHORS, and this gate sits at the entry to verify. Gating entry to verify on
      // verify's own output is circular and unsatisfiable for every milestone, forever.
      for (const code of ["verification-register-missing", "verification-missing-red-probe"]) {
        for (const severity of ["error", "warn"]) {
          assert.deepEqual(admittedDoctorFindings([{ code, severity }]), [], `${code} @ ${severity} never gates`);
        }
      }
      // NON-VACUITY: the filter is not simply refusing everything.
      assert.equal(admittedDoctorFindings([{ code: "control-unresolved", severity: "error" }]).length, 1, "an admitted code at error does gate");
    },
  },

  {
    name: "arch/FF-5410: the gate admits severity === \"error\" only, and computes no severity of its own",
    run: async () => {
      for (const code of DOCTOR_GATE_CODES) {
        assert.equal(admittedDoctorFindings([{ code, severity: "error" }]).length, 1, `${code} @ error gates`);
        for (const severity of ["warn", "info", null, undefined, "ERROR"]) {
          assert.deepEqual(admittedDoctorFindings([{ code, severity }]), [], `${code} @ ${String(severity)} does not gate`);
        }
      }
      // `severityFor` IS NEITHER RE-DERIVED NOR MODIFIED. The gate takes the severity the
      // doctor already reported; the horizon stays the single authority (`66/ADR-002`).
      const source = stripComments(await readFile(path.join(repoRoot, "src", "commands", "loop.mjs"), "utf8"));
      assert.ok(!source.includes("severityFor"), "the loop shell neither calls nor re-implements severityFor");
      assert.ok(!source.includes("acceptance-horizon"), "…and does not import the horizon to second-guess it");
    },
  },

  {
    name: "arch/FF-5410: the rung is invoked at the driven item's own scope, never stream-wide, and never reads loopReady",
    run: async () => {
      const body = await ladderBody();
      // EVERY registry invocation inside the ladder passes the driven ref as its scope. A
      // bare `{}` — the stream-wide call — is what `70/ADR-007` refuses by name.
      const invocations = [...body.matchAll(/invokeRegistered\(\s*"([^"]+)"\s*,\s*([^,]+),/gu)];
      assert.ok(invocations.length >= 2, `the ladder makes its gate invocations here (found ${invocations.length})`);
      for (const [, id, argument] of invocations) {
        assert.match(argument, /\{\s*scope:\s*ref\s*\}/u, `${id} is invoked with the driven item's own scope`);
      }
      assert.deepEqual(invocations.map(([, id]) => id), ["work:validate", "work:doctor"], "…in the ladder's own order");

      // NEVER READS THE LOOP-READY SCORE (`53/ADR-007`). The doctor's result carries one, so
      // this is an absence over something that was there to read.
      assert.ok(!/\bloopReady\b/u.test(body), "the ladder reads loopReady nowhere");
    },
  },

  {
    name: "arch/FF-5410: NON-VACUITY — a planted stream-wide invocation and a planted loopReady read are each detected",
    run: async () => {
      // The instrument is driven against planted defects rather than trusted, because a
      // structural cut that silently found the wrong region reports green over everything.
      const planted = (text) => {
        const invocations = [...text.matchAll(/invokeRegistered\(\s*"([^"]+)"\s*,\s*([^,]+),/gu)];
        return {
          streamWide: invocations.some(([, , argument]) => !/\{\s*scope:\s*ref\s*\}/u.test(argument)),
          readsScore: /\bloopReady\b/u.test(text),
        };
      };
      assert.deepEqual(
        planted('const doctor = await invokeRegistered("work:doctor", {}, ctx);'),
        { streamWide: true, readsScore: false },
        "a stream-wide invocation is detected",
      );
      assert.deepEqual(
        planted('const ready = doctor?.loopReady;'),
        { streamWide: false, readsScore: true },
        "a loopReady read is detected",
      );
      assert.deepEqual(planted(await ladderBody()), { streamWide: false, readsScore: false }, "…and the real ladder carries neither");
    },
  },
];
