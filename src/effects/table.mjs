// Compatibility entry; construction belongs to core application assembly.
import { effectsTable } from "../application/default.mjs";
export const {
  EVENT_NOT_DECLARED,
  UndeclaredEventError,
  KNOWN_LOCI,
  isKnownLocus,
  EFFECTS,
  effectsFor,
  knownEvents,
  applicableReactors,
} = effectsTable;
