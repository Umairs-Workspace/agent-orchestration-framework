// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createTerminalMirroring } from "@aof/mesh/terminal-mirror";

export function assembleMeshTerminalMirror({ meshRelayServices, meshTerminalRelayBridgeServices, workerStreamClientServices, degradeServices }) {
  // Core composition for mesh-owned relay services.

  const { DEFAULT_MAX_FRAME_BYTES } = meshRelayServices;
  const { resolveMaxFrameBytes } = meshRelayServices;
  const { TERMINAL_FRAME_KIND } = meshTerminalRelayBridgeServices;
  const { loopbackRelayUrl } = meshTerminalRelayBridgeServices;
  const { backoffDelaySeconds } = workerStreamClientServices;
  const { reportDegrade } = degradeServices;

  const { MAX_TAIL_BYTES_PER_KEY, MAX_TAIL_KEYS, createTerminalMirror, parseInboundTerminalFrame, startTerminalMirrorSubscriber, createTerminalMirrorSubscriberTransport } = createTerminalMirroring({ DEFAULT_MAX_FRAME_BYTES, resolveMaxFrameBytes, TERMINAL_FRAME_KIND, loopbackRelayUrl, backoffDelaySeconds, reportDegrade });

  return { resolveMaxFrameBytes, MAX_TAIL_BYTES_PER_KEY, MAX_TAIL_KEYS, createTerminalMirror, parseInboundTerminalFrame, startTerminalMirrorSubscriber, createTerminalMirrorSubscriberTransport };
}
