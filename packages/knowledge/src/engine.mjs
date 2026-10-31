// The knowledge-engine PORT (milestone 179, ADR-001). One contract with four verbs in front of
// every knowledge backend, so `aof memory` and `aof graph` stop each driving graphify on their own,
// and a later engine plugs in as one module that declares what it holds.
//
// A backend exports `corpora`: a map from a corpus in KNOWLEDGE_CORPORA to the verbs it serves for
// that corpus. Construction validates every declaration once and builds a frozen route table keyed
// "<corpus>:<verb>"; a declaration the port cannot honour is refused by name, here, rather than
// surfacing as a misroute the first time someone asks (FF-17901).
//
// TWO BACKEND SHAPES, ONE DECLARATION. A record backend keeps 05/ADR-003's method names and
// signatures — `recall(query, scope, opts, ctx)`, `reindex(only, ctx)`, `status(ctx)` — and its
// `ingest` is its `reindex`, called as `reindex(input?.only ?? null, ctx)`. An engine backend names
// its methods by the port's verbs and takes the port's arguments. A backend is a record backend
// when it has `reindex` and no `ingest`; that one mapping lives here and nowhere else.
//
// AN UNSERVED PAIR IS A VALUE. Asking a verb of a corpus no backend declared answers the frozen
// miss `{ served: false, code: "corpus-unserved", corpus, verb, backends }` and calls nothing. It is
// never a throw and never a fallback to a backend that did not offer the pair — `graph impact`'s
// `present: false` posture, one level up.
//
// The port is a pure router: it imports nothing, reads no config and touches no disk. Faces compose
// it over the backends they hold (`packages/core/src/application/bindings/knowledge-engine.mjs`).

export const KNOWLEDGE_CORPORA = Object.freeze(["work", "code", "operator", "imports"]);
export const ENGINE_VERBS = Object.freeze(["ingest", "recall", "relations", "status"]);

// The declaration every record backend serves, and every in-process record stub spreads: defined
// once, here, so 03's backends and their harnesses cannot drift apart.
const RECORD_VERBS = Object.freeze(["ingest", "recall", "status"]);
export const RECORD_CORPORA = Object.freeze({ work: RECORD_VERBS, operator: RECORD_VERBS, imports: RECORD_VERBS });

// `recall` asks the record corpora and `relations` the code corpus; neither verb names one itself.
const RECALL_CORPUS = "work";
const RELATIONS_CORPUS = "code";

const isRecordBackend = (backend) => typeof backend.reindex === "function" && typeof backend.ingest !== "function";

function refuse(name, message) {
  return new TypeError(`knowledge engine: backend ${JSON.stringify(name)} ${message}`);
}

// The callable behind one declared verb, adapted to the port's argument order, or null when the
// backend has no method for it.
function methodFor(backend, verb) {
  const record = isRecordBackend(backend);
  if (verb === "ingest" && record) return (_corpus, input, ctx) => backend.reindex(input?.only ?? null, ctx);
  if (typeof backend[verb] !== "function") return null;
  if (verb === "status" && record) return (_corpus, ctx) => backend.status(ctx);
  return (...args) => backend[verb](...args);
}

function routeTable(backends) {
  const routes = new Map();
  for (const backend of backends) {
    const name = backend?.name;
    if (typeof name !== "string" || name === "") throw new TypeError("knowledge engine: every backend needs a string name");
    const declared = backend.corpora;
    if (declared === null || typeof declared !== "object" || Array.isArray(declared)) {
      throw refuse(name, 'exports no "corpora" declaration');
    }
    for (const [corpus, verbs] of Object.entries(declared)) {
      if (!KNOWLEDGE_CORPORA.includes(corpus)) {
        throw refuse(name, `declares unknown corpus ${JSON.stringify(corpus)}; the corpora are ${KNOWLEDGE_CORPORA.join(", ")}`);
      }
      if (!Array.isArray(verbs)) throw refuse(name, `declares ${JSON.stringify(corpus)} with no verb list`);
      for (const verb of verbs) {
        if (!ENGINE_VERBS.includes(verb)) {
          throw refuse(name, `declares unknown verb ${JSON.stringify(verb)} for ${JSON.stringify(corpus)}; the verbs are ${ENGINE_VERBS.join(", ")}`);
        }
        const call = methodFor(backend, verb);
        if (!call) throw refuse(name, `declares ${JSON.stringify(verb)} for ${JSON.stringify(corpus)} but has no ${JSON.stringify(verb)} method`);
        const key = `${corpus}:${verb}`;
        const holder = routes.get(key);
        if (holder) throw refuse(name, `declares ${JSON.stringify(key)}, which backend ${JSON.stringify(holder.name)} already serves`);
        routes.set(key, Object.freeze({ name, backend, call }));
      }
    }
  }
  return routes;
}

export function createKnowledgeEngine({ backends = [] } = {}) {
  const routes = routeTable(backends);
  const names = Object.freeze(backends.map((backend) => backend.name));
  const miss = (corpus, verb) => Object.freeze({ served: false, code: "corpus-unserved", corpus, verb, backends: names });
  const route = (corpus, verb) => routes.get(`${corpus}:${verb}`) ?? null;

  async function ingest(corpus, input, ctx) {
    const hit = route(corpus, "ingest");
    return hit ? hit.call(corpus, input, ctx) : miss(corpus, "ingest");
  }

  async function recall(query, scope, opts, ctx) {
    const hit = route(RECALL_CORPUS, "recall");
    return hit ? hit.call(query, scope, opts, ctx) : miss(RECALL_CORPUS, "recall");
  }

  async function relations(paths, ctx) {
    const hit = route(RELATIONS_CORPUS, "relations");
    return hit ? hit.call(paths, ctx) : miss(RELATIONS_CORPUS, "relations");
  }

  // With a corpus, that corpus's status. Without one, every declared corpus keyed by name; a record
  // backend's `status(ctx)` takes no corpus, so it is asked once and its answer shared by its corpora.
  async function status(corpus, ctx) {
    if (corpus != null) {
      const hit = route(corpus, "status");
      return hit ? hit.call(corpus, ctx) : miss(corpus, "status");
    }
    const asked = new Map();
    const answer = {};
    for (const each of KNOWLEDGE_CORPORA) {
      const hit = route(each, "status");
      if (!hit) continue;
      const key = isRecordBackend(hit.backend) ? hit.backend : each;
      if (!asked.has(key)) asked.set(key, hit.call(each, ctx));
      answer[each] = await asked.get(key);
    }
    return answer;
  }

  return Object.freeze({ ingest, recall, relations, status });
}
