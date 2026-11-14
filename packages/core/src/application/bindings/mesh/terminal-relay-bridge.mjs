// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createTerminalRelayBridge } from "@aof/mesh/terminal-relay-bridge";

export function assembleMeshTerminalRelayBridge({ degradeServices, meshRegistryServices }) {
  // Core composition for mesh-owned relay services.

  const { reportDegrade } = degradeServices;
  // 191/ADR-001 amendment 2026-11-14 §2 — the nomination predicate a relay-less control derives
  // its loopback relay from.
  const { isControlNode } = meshRegistryServices;

  const { TERMINAL_FRAME_KIND, TERMINAL_INPUT_KIND, TERMINAL_RESUME_KIND, TERMINAL_INGRESS_TOKEN_HEADER, loopbackRelayUrl, buildTerminalFrameEnvelope, buildTerminalEndEnvelope, buildTerminalInputEnvelope, buildTerminalResumeEnvelope, createTerminalRelayPushTransport, routeIngressMessage, startTerminalIngress, openTerminalIngressClient } = createTerminalRelayBridge({ reportDegrade, isControlNode });

  return { TERMINAL_FRAME_KIND, TERMINAL_INPUT_KIND, TERMINAL_RESUME_KIND, TERMINAL_INGRESS_TOKEN_HEADER, loopbackRelayUrl, buildTerminalFrameEnvelope, buildTerminalEndEnvelope, buildTerminalInputEnvelope, buildTerminalResumeEnvelope, createTerminalRelayPushTransport, routeIngressMessage, startTerminalIngress, openTerminalIngressClient };
}
