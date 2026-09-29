// Transitional core composition for mesh-owned relay services.
import { createMeshRelay } from "@aof/mesh/relay";
import {
  isControlNode,
  readRegistry,
  writeRegistry,
  admitNode,
  consumePendingInvite,
  isInviteConsumed,
  isInviteExpired,
  verifyCredential,
} from "./registry.mjs";
import { publishNodeRecord, readNodeRecord } from "./store.mjs";
import { reportDegrade } from "../degrade.mjs";

export const { RELAY_PATH, DEFAULT_MAX_FRAME_BYTES, resolveMaxFrameBytes, DEFAULT_CODE_TTL_SECONDS, DEFAULT_MAX_ATTEMPTS, resolveCodeTtlSeconds, resolveMaxAttempts, sha256Hex, createEnrollmentHttpHandler, serveRelay, relayMode, relayStatus } = createMeshRelay({ isControlNode, readRegistry, writeRegistry, admitNode, consumePendingInvite, isInviteConsumed, isInviteExpired, verifyCredential, publishNodeRecord, readNodeRecord, reportDegrade });
