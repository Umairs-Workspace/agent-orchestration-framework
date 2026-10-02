// The `work` namespace a workspace exposes (core's `assembleWork`, packages/core/src/application/bindings/work.mjs),
// rebuilt from @aof/work's own modules so a work suite reaches its subject without the assembled workspace.
//
// What the binding adds beyond re-exporting @aof/work is two pieces of glue:
//   - `validateWork` closes over the digest-template collaborator (`getDigestContract`). Core owns the shipped
//     AOF.md template that contract is parsed from, so here it is a stand-in: fail-on-use unless a suite supplies
//     one. A suite that validates an AOF.md digest against the SHIPPED template is a work<->core integration and
//     stays in root test/.
//   - `loadWorkspace` / `healIdentitySidecar` read the per-install identity through @aof/mesh and core's path
//     policy. @aof/work does not depend on @aof/mesh, so they are not offered here.
import { validateWork as validateRecords } from "@aof/work/validation";
import * as records from "@aof/work/records";
import * as identity from "@aof/work/identity";
import * as discovery from "@aof/work/discovery";
import * as dependencies from "@aof/work/dependencies";
import * as readiness from "@aof/work/readiness";

const refuseDigestContract = () => {
  throw new Error("the digest-template contract must not be reached: this suite validates no AOF.md digest");
};

export function createWorkServices({ digestContract = refuseDigestContract } = {}) {
  function validateWork(workDir, config, scopeRef) {
    return validateRecords(workDir, config, scopeRef, { getDigestContract: digestContract });
  }
  return Object.freeze({
    recordDoc: records.recordDoc,
    typeHasRecordDoc: records.typeHasRecordDoc,
    parseFrontmatter: records.parseFrontmatter,
    WORK_ITEM_SCHEMA_VERSION: records.WORK_ITEM_SCHEMA_VERSION,
    readItemSchema: records.readItemSchema,
    readItemVersion: records.readItemVersion,
    rollbackItemStatus: records.rollbackItemStatus,
    setItemStatus: records.setItemStatus,
    applyItemFrontmatter: records.applyItemFrontmatter,
    ITEM_RE: identity.ITEM_RE,
    BACKLOG_ITEM_RE: identity.BACKLOG_ITEM_RE,
    BACKLOG_ROOT: identity.BACKLOG_ROOT,
    ARCHIVE_ROOT: identity.ARCHIVE_ROOT,
    parseStorySpan: identity.parseStorySpan,
    listItems: discovery.listItems,
    isLiveStreamRow: discovery.isLiveStreamRow,
    findWork: discovery.findWork,
    listStream: discovery.listStream,
    isDependTarget: dependencies.isDependTarget,
    siblingDependencyNumber: dependencies.siblingDependencyNumber,
    siblingGate: dependencies.siblingGate,
    isDependNumber: dependencies.isDependNumber,
    rewriteRefEntry: dependencies.rewriteRefEntry,
    rewriteDependsEntries: dependencies.rewriteDependsEntries,
    nextWork: readiness.nextWork,
    validateWork,
  });
}

export const work = createWorkServices();
