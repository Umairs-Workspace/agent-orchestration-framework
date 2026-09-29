// Transitional core composition for messaging-owned services.
import { createMessagingSecrets } from "@aof/messaging/secret";
import { defaultGlobalWorkspaceDir } from "../paths.mjs";


export const { messagingStoreDir, messagingSecretPath, readMessagingSecret, messagingSecretPresent, writeMessagingSecret } = createMessagingSecrets({ defaultGlobalWorkspaceDir });
