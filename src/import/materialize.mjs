// Compatibility entry; construction belongs to core application assembly.
import { importMaterialize } from "../application/default.mjs";
export const {
  SPEC_FILE,
  ARCHITECTURE_FILE,
  RETROSPECTIVE_FILE,
  AOF_FILE,
  INTENT_NOT_RECOVERABLE,
  renderSpec,
  renderArchitecture,
  renderRetrospective,
  renderDigest,
  writeColocatedDigest,
  planMaterialize,
  materializeImport,
} = importMaterialize;
