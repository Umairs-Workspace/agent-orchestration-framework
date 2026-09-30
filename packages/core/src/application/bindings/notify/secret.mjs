// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMessagingSecrets } from "@aof/messaging/secret";
import { defaultGlobalWorkspaceDir } from "../../../paths.mjs";

export function assembleNotifySecret({  } = {}) {
  // Core composition for messaging-owned services.

  const { messagingStoreDir, messagingSecretPath, readMessagingSecret, messagingSecretPresent, writeMessagingSecret } = createMessagingSecrets({ defaultGlobalWorkspaceDir });

  return { messagingStoreDir, messagingSecretPath, readMessagingSecret, messagingSecretPresent, writeMessagingSecret };
}
