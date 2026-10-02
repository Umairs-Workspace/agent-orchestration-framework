// Review fix (milestone 39): `aof work memory recall`'s scope dimensions are a
// deliberately duplicated two-file seam — `memory.mjs`'s SCOPE_FLAGS (which
// argv flags PARSE into `scope`) and `local-retrieval.mjs`'s SCOPE_FIELDS (which
// fields `applyScope` actually FILTERS on). The duplication itself is a noted
// boundary (not refactored here); this test guards it: a future scope dimension
// added to only ONE of the two lists must fail LOUDLY (a flag that parses but
// never filters, or a filterable field with no flag to set it) rather than
// half-working silently.
//
// Both lists are owned by @aof/knowledge, so this builds the memory module directly: the two
// backend loaders are fail-on-use stubs, because reading SCOPE_FLAGS never selects a backend.
import assert from "node:assert/strict";
import { createMemory } from "@aof/knowledge/memory";
import { SCOPE_FIELDS } from "@aof/knowledge/memory/local-retrieval";

const refuseBackend = (name) => () => { throw new Error(`reading SCOPE_FLAGS must not load the ${name} backend`); };
const { SCOPE_FLAGS } = createMemory({ loadLocalBackend: refuseBackend("local"), loadGraphifyBackend: refuseBackend("graphify") });

export const scopeFlagsFieldsAgreeTests = [
  {
    name: "scope-flags-fields-agree: work-memory.mjs's SCOPE_FLAGS and local-retrieval.mjs's SCOPE_FIELDS are the SAME set",
    run: () => {
      const flags = new Set(SCOPE_FLAGS);
      const fields = new Set(SCOPE_FIELDS);
      assert.deepEqual(
        [...flags].sort(),
        [...fields].sort(),
        `SCOPE_FLAGS ${JSON.stringify([...flags].sort())} must equal SCOPE_FIELDS ${JSON.stringify([...fields].sort())}`,
      );
    },
  },
];
