// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshRelay } from "@aof/mesh/relay";

export function assembleMeshRelay({ meshRegistryServices, meshStoreServices, degradeServices }) {
  // Core composition for mesh-owned relay services.

  const { isControlNode } = meshRegistryServices;
  const { readRegistry } = meshRegistryServices;
  const { writeRegistry } = meshRegistryServices;
  const { admitNode } = meshRegistryServices;
  const { consumePendingInvite } = meshRegistryServices;
  const { isInviteConsumed } = meshRegistryServices;
  const { isInviteExpired } = meshRegistryServices;
  const { verifyCredential } = meshRegistryServices;
  const { publishNodeRecord } = meshStoreServices;
  const { readNodeRecord } = meshStoreServices;
  const { reportDegrade } = degradeServices;

  const { RELAY_PATH, DEFAULT_MAX_FRAME_BYTES, resolveMaxFrameBytes, DEFAULT_CODE_TTL_SECONDS, DEFAULT_MAX_ATTEMPTS, resolveCodeTtlSeconds, resolveMaxAttempts, sha256Hex, createEnrollmentHttpHandler, serveRelay, relayMode, relayStatus } = createMeshRelay({ isControlNode, readRegistry, writeRegistry, admitNode, consumePendingInvite, isInviteConsumed, isInviteExpired, verifyCredential, publishNodeRecord, readNodeRecord, reportDegrade });

  return { RELAY_PATH, DEFAULT_MAX_FRAME_BYTES, resolveMaxFrameBytes, DEFAULT_CODE_TTL_SECONDS, DEFAULT_MAX_ATTEMPTS, resolveCodeTtlSeconds, resolveMaxAttempts, sha256Hex, createEnrollmentHttpHandler, serveRelay, relayMode, relayStatus };
}
