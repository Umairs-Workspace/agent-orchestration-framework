// Compatibility entry; construction belongs to core application assembly.
import { meshTerminalRelayBridge } from "../application/default.mjs";
export const {
  TERMINAL_FRAME_KIND,
  TERMINAL_INPUT_KIND,
  TERMINAL_RESUME_KIND,
  loopbackRelayUrl,
  buildTerminalFrameEnvelope,
  buildTerminalEndEnvelope,
  buildTerminalInputEnvelope,
  buildTerminalResumeEnvelope,
  createTerminalRelayPushTransport,
} = meshTerminalRelayBridge;
