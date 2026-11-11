
// The `none` memory backend — a total no-op satisfying the frozen backend
// interface (milestone 05, ADR-003). It lets ACD run unchanged when no memory is
// configured (or `memory.backend` is "none"): every verb succeeds and returns the
// empty/zero shape the interface specifies, never erroring.
//
// The frozen interface is exactly { name, corpora, recall, reindex, status } (05/ADR-003 as
// amended by 179/ADR-003). `corpora` declares the shared record corpora, so memory off is
// "served, empty" through the knowledge-engine port, never `corpus-unserved`. `ingest` is a
// seam-level alias of reindex — NOT an interface method — so this module exposes no such method.
import { RECORD_CORPORA } from "../engine.mjs";

// Render an empty RecallResult's human text view. The structured `records` array
// is the contract (ADR-004); this text is a projection of it.
function renderEmpty(query) {
  const q = query ? `"${query}"` : "";
  return `recall ${q}  →  0 hit(s)  (memory backend: none)\n`;
}

export default {
  name: "none",
  corpora: RECORD_CORPORA,

  // READ. Returns an empty RecallResult: { query, scope, records: [], text }.
  async recall(query, scope, _opts, _ctx) {
    return {
      query: query ?? "",
      scope: scope ?? {},
      records: [],
      text: renderEmpty(query)
    };
  },

  // WRITE / BUILD. A no-op: there is no store to rebuild.
  async reindex(_only, _ctx) {
    return { recordCount: 0 };
  },

  // INTROSPECT. Names the backend and reports zero records; never throws.
  async status(_ctx) {
    return { backend: "none", recordCount: 0 };
  }
};
