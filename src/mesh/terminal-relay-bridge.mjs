// Transitional core composition for mesh-owned relay services.
import { createTerminalRelayBridge } from "@aof/mesh/terminal-relay-bridge";
import { reportDegrade } from "../degrade.mjs";

export const { TERMINAL_FRAME_KIND, TERMINAL_INPUT_KIND, TERMINAL_RESUME_KIND, loopbackRelayUrl, buildTerminalFrameEnvelope, buildTerminalEndEnvelope, buildTerminalInputEnvelope, buildTerminalResumeEnvelope, createTerminalRelayPushTransport } = createTerminalRelayBridge({ reportDegrade });
