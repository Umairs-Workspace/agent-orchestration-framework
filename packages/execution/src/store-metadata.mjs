// Authored file facts and the domain implementation permitted to write them.
export const FILE_STORE_CLASSIFICATION = Object.freeze({
  "run-records": Object.freeze({
    class: "fact",
    writers: Object.freeze(["packages/execution/src/runs.mjs"]),
    reconcile: "packages/execution/src/reconcile.mjs (reconcileRunRecords — d5)"
  })
});
