// Facts are authored/durable reports; projections may be rebuilt; meta is storage bookkeeping.
// Writer paths identify SQL implementations. refRemap assigns the permitted rewrite locus.
export const TABLE_CLASSIFICATION = Object.freeze({
  aof_schema: Object.freeze({
    class: "meta"
  }),
  projection_metadata: Object.freeze({
    class: "meta"
  }),
  workspaces: Object.freeze({
    class: "projection",
    rebuiltBy: "publishWorkspaceSnapshot"
  }),
  work_items: Object.freeze({
    class: "fact",
    writers: Object.freeze(["packages/mesh/src/projection-store.mjs"])
  }),
  projection_errors: Object.freeze({
    class: "projection",
    rebuiltBy: "publishWorkspaceSnapshot"
  }),
  global_nodes: Object.freeze({
    class: "projection",
    rebuiltBy: "node descriptor publish"
  }),
  global_workspace_descriptors: Object.freeze({
    class: "projection",
    rebuiltBy: "workspace descriptor publish"
  }),
  global_node_workspaces: Object.freeze({
    class: "projection",
    rebuiltBy: "membership publish"
  }),
  global_assignments: Object.freeze({
    class: "fact",
    writers: Object.freeze(["packages/mesh/src/assignment-record.mjs", "packages/mesh/src/projection-store.mjs"]),
    refRemap: Object.freeze({
      column: "item_ref",
      locus: "control-store"
    })
  }),
  global_assignment_directives: Object.freeze({
    class: "fact",
    writers: Object.freeze(["packages/mesh/src/assignment-directive.mjs"])
  }),
  global_item_branches: Object.freeze({
    class: "fact",
    writers: Object.freeze(["packages/mesh/src/assignment-directive.mjs", "packages/mesh/src/projection-store.mjs"]),
    refRemap: Object.freeze({
      column: "item_ref",
      locus: "control-store"
    })
  }),
  global_recovery_pushes: Object.freeze({
    class: "fact",
    writers: Object.freeze(["packages/mesh/src/recovery-push.mjs"])
  }),
  global_resync_requests: Object.freeze({
    class: "fact",
    writers: Object.freeze(["packages/mesh/src/resync.mjs"])
  }),
  work_item_docs: Object.freeze({
    class: "fact",
    writers: Object.freeze(["packages/mesh/src/projection-store.mjs"]),
    refRemap: Object.freeze({
      column: "ref",
      locus: "local"
    })
  }),
  work_item_runs: Object.freeze({
    class: "fact",
    writers: Object.freeze(["packages/mesh/src/projection-store.mjs"]),
    refRemap: Object.freeze({
      column: "ref",
      locus: "local"
    })
  }),
  node_logs: Object.freeze({
    class: "fact",
    writers: Object.freeze(["packages/mesh/src/projection-store.mjs"])
  })
});
