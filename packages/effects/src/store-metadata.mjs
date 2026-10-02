// Facts are authored/durable reports; projections may be rebuilt; meta is storage bookkeeping.
// Writer paths identify SQL implementations. refRemap assigns the permitted rewrite locus.
export const TABLE_CLASSIFICATION = Object.freeze({
  aof_schema: Object.freeze({
    class: "meta"
  }),
  events: Object.freeze({
    class: "fact",
    writers: Object.freeze(["packages/effects/src/journal.mjs"])
  }),
  effect_steps: Object.freeze({
    class: "fact",
    writers: Object.freeze(["packages/effects/src/journal.mjs"])
  })
});
