// Compatibility entry; construction belongs to core application assembly.
import { meshTerminalMirror } from "../application/default.mjs";
export const {
  resolveMaxFrameBytes,
  MAX_TAIL_BYTES_PER_KEY,
  MAX_TAIL_KEYS,
  createTerminalMirror,
  parseInboundTerminalFrame,
  startTerminalMirrorSubscriber,
  createTerminalMirrorSubscriberTransport,
} = meshTerminalMirror;
