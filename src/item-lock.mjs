// Compatibility entry; construction belongs to core application assembly.
import { itemLock } from "./application/default.mjs";
export const {
  ITEM_LOCKED_CODE,
  ITEM_LOCK_UNDETERMINABLE_CODE,
  ITEM_LOCK_CONTEXT_MISSING_CODE,
  itemLockPayload,
  itemLockMessage,
  itemLockedError,
  lockContextFor,
  openLockableStore,
  inspectItemLock,
  guardItemLock,
  readHeldScopes,
} = itemLock;
