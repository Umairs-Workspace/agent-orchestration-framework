import assert from "node:assert/strict";
import {
  LOOP_SCOPE_FORMS,
  decideLoop,
  decideLoopScope,
  loopScopeIncludes,
} from "../../src/work/loop.mjs";
import { workLoopStoryFixturesFor } from "../support/work-loop-story-fixtures.mjs";

export const workLoopScopeGuardTests = [
  {
    name: "loop scope guard — the shared story fixtures stay executable",
    run() {
      for (const { name, args, expected } of workLoopStoryFixturesFor("scope-guard")) {
        assert.deepEqual(decideLoopScope(...args), expected, name);
      }
    },
  },
  {
    name: "loop scope guard — frozen forms admit drivers and non-empty ranges verbatim",
    run() {
      assert.equal(Object.isFrozen(LOOP_SCOPE_FORMS), true);
      assert.deepEqual(LOOP_SCOPE_FORMS.map(({ id }) => id), ["driver", "range"]);
      for (const [scope, form] of [["53", "driver"], ["007", "driver"], ["0", "driver"], ["50-53", "range"], ["53-53", "range"]]) {
        assert.deepEqual(decideLoopScope(scope), { admitted: true, form, scope });
      }
    },
  },
  {
    name: "loop scope guard — every unsupported shape is a coded zero-act refusal",
    run() {
      const values = [
        "53/02", "53/2", "53/02/00", "loop-artifact", "53_loop-artifact", "", "   ", "\t",
        "53 ", " 53", "5 3", "53-", "-53", "-", "53--54", "53-52", "100-1", "53-54-55",
        "53.0", "+53", "1e2", "0x35", "٥٣", "NaN", "*", "all", 53, null, undefined, true,
        ["53"], { scope: "53" },
      ];
      for (const scope of values) {
        const result = decideLoopScope(scope);
        assert.equal(result.code, "loop-scope-unsupported", String(scope));
        assert.deepEqual(result.scope, scope);
        assert.deepEqual(result.admits.map(({ id }) => id), ["driver", "range"]);
        assert.equal(result.alternative, "aof work drive <phase> <ref>");
        assert.equal("act" in result, false);
        assert.equal("ref" in result, false);
        assert.equal("phase" in result, false);
      }
      assert.match(decideLoopScope("53-52").reason, /lo is greater than hi/);

      const objectScope = { z: [1], a: "bad" };
      const first = decideLoopScope(objectScope);
      const second = decideLoopScope(objectScope);
      assert.notEqual(first.scope, objectScope);
      assert.notEqual(first.scope, second.scope);
      first.scope.z.push(2);
      assert.deepEqual(objectScope, { z: [1], a: "bad" });
      assert.deepEqual(second.scope, { a: "bad", z: [1] });
    },
  },
  {
    name: "loop scope guard — level vocabulary resolution precedes scope and scope inclusion is arithmetic",
    run() {
      assert.equal(decideLoop({ scope: "53/02", level: "L3" }).code, "loop-scope-unsupported");
      assert.equal(loopScopeIncludes("53", "53/02"), true);
      assert.equal(loopScopeIncludes("53", "54/01"), false);
      assert.equal(loopScopeIncludes("50-53", "50"), true);
      assert.equal(loopScopeIncludes("50-53", "53/99"), true);
      assert.equal(loopScopeIncludes("50-53", "54"), false);
      assert.equal(loopScopeIncludes("53-52", "53"), false);
      assert.equal(loopScopeIncludes("007", "7/01"), true);
      assert.equal(loopScopeIncludes("007", "007/01"), true);
      assert.equal(loopScopeIncludes("007", "8/01"), false);
    },
  },
];
