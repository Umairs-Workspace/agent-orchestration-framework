// Compatibility entry; construction belongs to core application assembly.
import { defaultWorkspace } from "./application/default-workspace.mjs";
export const recordDoc = defaultWorkspace.work.recordDoc;
export const typeHasRecordDoc = defaultWorkspace.work.typeHasRecordDoc;
export const parseFrontmatter = defaultWorkspace.work.parseFrontmatter;
export const WORK_ITEM_SCHEMA_VERSION = defaultWorkspace.work.WORK_ITEM_SCHEMA_VERSION;
export const readItemSchema = defaultWorkspace.work.readItemSchema;
export const readItemVersion = defaultWorkspace.work.readItemVersion;
export const rollbackItemStatus = defaultWorkspace.work.rollbackItemStatus;
export const setItemStatus = defaultWorkspace.work.setItemStatus;
export const applyItemFrontmatter = defaultWorkspace.work.applyItemFrontmatter;




export const parseStorySpan = defaultWorkspace.work.parseStorySpan;
export const listItems = defaultWorkspace.work.listItems;
export const isLiveStreamRow = defaultWorkspace.work.isLiveStreamRow;
export const findWork = defaultWorkspace.work.findWork;
export const listStream = defaultWorkspace.work.listStream;
export const isDependTarget = defaultWorkspace.work.isDependTarget;
export const siblingDependencyNumber = defaultWorkspace.work.siblingDependencyNumber;
export const siblingGate = defaultWorkspace.work.siblingGate;
export const isDependNumber = defaultWorkspace.work.isDependNumber;
export const rewriteRefEntry = defaultWorkspace.work.rewriteRefEntry;
export const rewriteDependsEntries = defaultWorkspace.work.rewriteDependsEntries;
export const nextWork = defaultWorkspace.work.nextWork;
export const validateWork = defaultWorkspace.work.validateWork;
export const loadWorkspace = defaultWorkspace.work.loadWorkspace;
export const healIdentitySidecar = defaultWorkspace.work.healIdentitySidecar;

export { ITEM_RE, BACKLOG_ITEM_RE, BACKLOG_ROOT, ARCHIVE_ROOT } from "@aof/work/identity";
