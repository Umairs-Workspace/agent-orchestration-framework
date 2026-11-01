import assert from "node:assert/strict";
import { teachMode } from "../src/mode.mjs";

export const modeTests = [
  {
    name: "179/01 the mode descriptor is the door's input, and nothing more",
    run: () => {
      assert.ok(Object.isFrozen(teachMode), "teachMode is frozen");
      assert.deepEqual(Object.keys(teachMode).sort(), ["command", "description", "flag"]);
      assert.equal(teachMode.flag, "teach");
      assert.equal(teachMode.command, "teach");
      assert.equal(typeof teachMode.description, "string");
      assert.ok(teachMode.description.trim() !== "", "the description is non-empty");
    },
  },
];
