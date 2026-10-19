// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createTerminalRelayBridge } from "@aof/mesh/terminal-relay-bridge";

export function assembleMeshTerminalRelayBridge({ degradeServices }) {
  // Core composition for mesh-owned relay services.

  const { reportDegrade } = degradeServices;

  const { TERMINAL_FRAME_KIND, TERMINAL_INPUT_KIND, TERMINAL_RESUME_KIND, TERMINAL_INGRESS_TOKEN_HEADER, loopbackRelayUrl, buildTerminalFrameEnvelope, buildTerminalEndEnvelope, buildTerminalInputEnvelope, buildTerminalResumeEnvelope, createTerminalRelayPushTransport, routeIngressMessage, startTerminalIngress, openTerminalIngressClient } = createTerminalRelayBridge({ reportDegrade });

  return { TERMINAL_FRAME_KIND, TERMINAL_INPUT_KIND, TERMINAL_RESUME_KIND, TERMINAL_INGRESS_TOKEN_HEADER, loopbackRelayUrl, buildTerminalFrameEnvelope, buildTerminalEndEnvelope, buildTerminalInputEnvelope, buildTerminalResumeEnvelope, createTerminalRelayPushTransport, routeIngressMessage, startTerminalIngress, openTerminalIngressClient };
}
