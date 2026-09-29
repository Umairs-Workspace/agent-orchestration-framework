// Transitional core composition for mesh-owned relay services.
import { createTerminalMirroring } from "@aof/mesh/terminal-mirror";
import { DEFAULT_MAX_FRAME_BYTES, resolveMaxFrameBytes } from "./relay.mjs";
import { TERMINAL_FRAME_KIND, loopbackRelayUrl } from "./terminal-relay-bridge.mjs";
import { backoffDelaySeconds } from "../worker-stream-client.mjs";
import { reportDegrade } from "../degrade.mjs";

export { resolveMaxFrameBytes };
export const { MAX_TAIL_BYTES_PER_KEY, MAX_TAIL_KEYS, createTerminalMirror, parseInboundTerminalFrame, startTerminalMirrorSubscriber, createTerminalMirrorSubscriberTransport } = createTerminalMirroring({ DEFAULT_MAX_FRAME_BYTES, resolveMaxFrameBytes, TERMINAL_FRAME_KIND, loopbackRelayUrl, backoffDelaySeconds, reportDegrade });
