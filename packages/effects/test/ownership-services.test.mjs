import assert from "node:assert/strict";
import test from "node:test";
import { createJournalOpener, mintEventId } from "@aof/effects/journal-open";
import { createStoreClassification } from "@aof/effects/stores";

test("journal opening preserves the runtime refusal before touching storage", async () => {
  let loaded = 0;
  const { openEffectsJournal } = createJournalOpener({ effectsJournalPath: () => "/unused/journal.sqlite", importSqliteRuntime: async () => { loaded++; throw new Error("missing runtime"); }, storage: { initializeJournal: () => assert.fail("must not initialize") } });
  await assert.rejects(openEffectsJournal(), { code: "sqlite-unavailable", status: 501 });
  assert.equal(loaded, 1);
  assert.match(mintEventId("2026-09-29T12:34:56.000Z"), /^20260929T123456000Z-[a-f0-9]{8}$/);
});

test("classification queries preserve locus separation and unknown-table refusal", () => {
  const registry = createStoreClassification({ tables: { local: { class: "fact", refRemap: { column: "ref", locus: "local" } }, remote: { class: "fact", refRemap: { column: "item_ref", locus: "control-store" } } }, fileStores: {} });
  assert.equal(registry.tableClass("missing"), null);
  assert.deepEqual(registry.refRemapTables("local"), [{ table: "local", column: "ref" }]);
  assert.deepEqual(registry.refRemapTables("control-store"), [{ table: "remote", column: "item_ref" }]);
  assert.ok(Object.isFrozen(registry.TABLE_CLASSIFICATION));
});
