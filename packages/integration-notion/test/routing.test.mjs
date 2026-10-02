import assert from "node:assert/strict";
import test from "node:test";
import { createNotionRouting, RoutingError, isPageId, asBoardsRegistry } from "@aof/integration-notion/routing";

test("Notion routing uses committed descriptor input and one shared error class", () => {
  const board = { dataSourceId: "source", parents: { chosen: "parent-id" } };
  const { resolveNotionRouting } = createNotionRouting({ readRouting: () => ({ notion: { board: "ops", parent: "chosen" }, unrelated: {} }) });
  assert.deepEqual(resolveNotionRouting({}, { boards: { ops: board } }), { board, parentPageId: "parent-id" });
  assert.throws(() => resolveNotionRouting({}, { boards: {} }), error => error instanceof RoutingError && error.code === "unknown-board-key");
  const second = createNotionRouting({ readRouting: () => ({}) });
  assert.throws(() => second.resolveNotionRouting({}, { default: "missing", boards: {} }), error => error instanceof RoutingError && error.code === "unknown-default-board");
  assert.equal(isPageId("a".repeat(32)), true);
  assert.equal(isPageId("a".repeat(31)), false);
  assert.equal(asBoardsRegistry({ dataSourceId: "flat" }).boards.default.dataSourceId, "flat");
});
