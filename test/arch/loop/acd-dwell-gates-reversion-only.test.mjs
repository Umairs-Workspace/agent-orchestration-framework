import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

import { acceptorCommand, reversionDecision, withdrawalOnHarm } from "../../../src/commands/acceptor.mjs";
import { functionBody } from "../../support/source-slice.mjs";
import { codeOnly } from "../run/acd-progress-ledger-consumed.test.mjs";

export const archTests = [
  {
    name: "arch/61 FF-6113 · dwell is recorded without an expiry and is unreachable from withdrawal-on-harm",
    run: async () => {
      const record = { key: "k", from: 1, to: 2, dwell: "cycles:2", dwellFrom: "61" };
      assert.equal(reversionDecision(record).expiry, null);
      const short = withdrawalOnHarm(record, { measured: true, direction: "worse" });
      const long = withdrawalOnHarm({ ...record, dwell: "cycles:1000", dwellFrom: "01" }, { measured: true, direction: "worse" });
      assert.deepEqual(short, long, "changing dwell cannot change the harm path's answer");
      assert.equal(short.consultedDwell, false);
      const source = await readFile(new URL("../../../src/commands/acceptor.mjs", import.meta.url), "utf8");
      const harmBody = functionBody(source, "export function withdrawalOnHarm(");
      assert.notEqual(harmBody, null, "the withdrawal-on-harm function body is found structurally");
      assert.ok(!harmBody.includes(".dwell"), "the harm path cannot read the dwell declaration");
      assert.ok(!harmBody.includes("expiry"), "the harm path derives no expiry");
      assert.ok(harmBody.includes("movement?.measured") && harmBody.includes('movement?.direction === "worse"'), "only the measured counter-metric degradation drives withdrawal");

      const revertBody = functionBody(source, "export function reversionDecision(");
      assert.notEqual(revertBody, null, "the reversion function body is found structurally");
      assert.ok(revertBody.includes("DWELL_UNCOUNTED"));
      assert.ok(revertBody.includes("no counter exists for cycles of the receiving loop"), "the refusal names the missing counter rather than fabricating an expiry");

      const dwellBody = functionBody(source, "function dwellFrom(");
      assert.notEqual(dwellBody, null, "the dwell reader is found structurally");
      assert.ok(dwellBody.includes("fields?.dwell?.raw"), "the recorded value comes from the arbiter declaration");
      assert.ok(!source.includes('"cycles:2"') && !source.includes('"cycles:10"'), "the acceptor production module spells no dwell value literal");

      const acceptorDir = new URL("../../../src/work-acceptor/", import.meta.url);
      const production = [source];
      for (const name of await readdir(acceptorDir)) {
        if (name.endsWith(".mjs")) production.push(await readFile(new URL(name, acceptorDir), "utf8"));
      }
      assert.ok(production.every((body) => !/\bdwellExpiry\b/u.test(codeOnly(body))), "no acceptor code derives a dwell expiry");
      assert.deepEqual(Object.keys(acceptorCommand.cli.spec.flags), ["commit"], "no command option delays or waives harm withdrawal");
    },
  },
];
