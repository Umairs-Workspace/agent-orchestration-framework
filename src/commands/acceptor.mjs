// Compatibility entry; construction belongs to core application assembly.
import { commandsAcceptor } from "../application/default.mjs";
export const {
  DWELL_UNCOUNTED,
  REFUSAL_REMOVALS,
  RULING_REFUSAL_ORDER,
  YIELD_BOUND,
  acceptorCommand,
  buildAcceptorReport,
  reversionDecision,
  withdrawalOnHarm,
} = commandsAcceptor;
