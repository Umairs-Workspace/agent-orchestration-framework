// Compatibility entry; construction belongs to core application assembly.
import { notifySecret } from "../application/default.mjs";
export const {
  messagingStoreDir,
  messagingSecretPath,
  readMessagingSecret,
  messagingSecretPresent,
  writeMessagingSecret,
} = notifySecret;
