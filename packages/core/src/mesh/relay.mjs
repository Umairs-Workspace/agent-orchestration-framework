// Compatibility entry; construction belongs to core application assembly.
import { meshRelay } from "../application/default.mjs";
export const {
  RELAY_PATH,
  DEFAULT_MAX_FRAME_BYTES,
  resolveMaxFrameBytes,
  DEFAULT_CODE_TTL_SECONDS,
  DEFAULT_MAX_ATTEMPTS,
  resolveCodeTtlSeconds,
  resolveMaxAttempts,
  sha256Hex,
  createEnrollmentHttpHandler,
  serveRelay,
  relayMode,
  relayStatus,
} = meshRelay;
