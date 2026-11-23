// FF-20501: the same case data must be consumable by a different fixture adapter.
import assert from "node:assert/strict";
import { makeLane } from "../../golden/work-stream.lane.mjs";

const clean = { id: "probe", title: "A portable case", argv: ["list"], mode: "read" };
export const workStreamBoundaryTests = [
  { name: "arch/205 FF-20501 accepts portable public work argv", run() {
    assert.equal(makeLane("trial", [clean]).scenarios.length, 2);
    const write = { ...clean, mode: "write", argv: ["archive", "19"], observe: ["find 19", "list"] };
    assert.equal(makeLane("trial", [write]).scenarios.length, 1);
    assert.throws(() => makeLane("trial", [{ ...write, observe: ["find ../private"] }]), /expected a public list or find observation/);
  } },
  ...[
    [{ variation: { path: "wiki/work/CHORE.md" } }, "unknown fixture field path"],
    [{ argv: ["setItemStatus"] }, "expected public work argv"],
    [{ callback: () => true }, "unknown case field callback"],
    [{ argv: ["sh", "-c", "exit"] }, "expected public work argv"],
  ].map(([mutation, diagnostic]) => ({
    name: `arch/205 FF-20501 rejects ${diagnostic}: ${Object.keys(mutation)} ${mutation.argv?.[0] ?? ""}`,
    run() { assert.throws(() => makeLane("trial", [{ ...clean, ...mutation }]), { message: "trial/probe: " + diagnostic }); },
  })),
];
