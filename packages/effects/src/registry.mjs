// Explicit effect contributions. Domain handlers and diagnostic policy are supplied by the owner.
// The declared-name refusal's code, and it is a CONSTRUCTION refusal: it is thrown,
// which means no event was produced at all. It is deliberately disjoint from the
// journal's storage faults (`invalid-event`, `event-id-conflict`, `sqlite-unavailable`)
// — "nobody knows that name" and "the event could not be stored" are different answers
// and a caller must be able to branch on which it got.
export const EVENT_NOT_DECLARED = "event-not-declared";

export class UndeclaredEventError extends Error {
  constructor(offered, declared) {
    const shown = typeof offered === "string"
      ? JSON.stringify(offered)
      : `a ${offered === null ? "null" : typeof offered} value`;
    super(
      `Refusing to raise ${shown}: the effects vocabulary does not declare that name, so nothing could be owed for it and nothing would ever say so. `
      + `Declared: ${declared.join(", ")}.`,
    );
    this.name = "UndeclaredEventError";
    this.code = EVENT_NOT_DECLARED;
    this.status = 400;
    // The name AS GIVEN, so a caller reporting the refusal can show the misspelling
    // rather than a normalised guess at what was meant.
    this.event = offered;
    this.declared = declared;
  }
}

// `Object.hasOwn`, never `in` or a bare index: `EFFECTS["toString"]` inherits a FUNCTION
// off the prototype, so an index test would read an inherited member as a declaration and
// hand back something that is not a reactor list at all.
function isDeclared(effects, name) {
  return typeof name === "string" && Object.hasOwn(effects, name);
}

export function createReactorRegistry(contributions, { reportDegrade, isKnownLocus = locus => typeof locus === 'string' && locus.trim().length > 0 } = {}) {
  if (!Array.isArray(contributions) || typeof reportDegrade !== 'function' || typeof isKnownLocus !== 'function') {
    throw new TypeError('Reactor registry requires contributions, diagnostics and a locus validator.');
  }
  const events = new Map(), owners = new Map();
  for (const contribution of contributions) {
    if (!contribution || typeof contribution.name !== 'string' || !contribution.name.trim() ||
        !contribution.events || typeof contribution.events !== 'object' || Array.isArray(contribution.events)) {
      throw new TypeError('A reactor contribution needs a name and an events object.');
    }
    for (const [event, reactors] of Object.entries(contribution.events)) {
      if (!event.trim() || !Array.isArray(reactors)) throw new TypeError('Each event needs a name and a reactor array.');
      if (!events.has(event)) { events.set(event, []); owners.set(event, new Map()); }
      for (const reactor of reactors) {
        if (!reactor || typeof reactor.key !== 'string' || !reactor.key.trim() || !isKnownLocus(reactor.locus) ||
            typeof reactor.apply !== 'function' || (reactor.applies !== undefined && typeof reactor.applies !== 'function')) {
          throw new TypeError(`Invalid reactor for "${event}" contributed by "${contribution.name}".`);
        }
        const claimed = owners.get(event);
        if (claimed.has(reactor.key)) {
          throw new Error(`Reactor collision: "${event}/${reactor.key}" is claimed by both "${claimed.get(reactor.key)}" and "${contribution.name}".`);
        }
        claimed.set(reactor.key, contribution.name);
        events.get(event).push(reactor);
      }
    }
  }
  const table = Object.freeze(Object.fromEntries([...events].map(([event, reactors]) => [event, Object.freeze(reactors)])));
  // applicableReactors(name, payload, ctx) — the append-time resolution every
  // transition seam uses (m42 wave (d) leg d4, port 4): the declared reactors,
  // minus any whose applicability predicate says this consequence can never apply
  // to this event's workspace. Evaluated ONCE, before the append — a step that
  // reaches the journal is owed, and the drain never re-litigates it. An
  // unanswerable predicate (the config read threw) resolves NOT OWED, loudly: the
  // alternative — owing a step in a workspace that may never drain its locus — is
  // the permanent-leak class this machinery exists to close, while a wrongly
  // skipped optional sync is recoverable by running the verb.
  //
  // ── AND AN UNDECLARED NAME IS REFUSED HERE (61/ADR-007 §4) ─────────────────
  //
  // The distinction the old silent `?? []` destroyed: "no consequence applies
  // here" and "nobody knows that name" are DIFFERENT ANSWERS. A workspace with no
  // external integration configured genuinely owes nothing for an event only that
  // integration reacts to, and that stays a clean resolution to the empty list — a
  // declared name with nothing to do is not an error. A typo owes nothing for an
  // entirely different reason, and gets a coded refusal its caller can act on.
  //
  // The refusal is against the SUPPLIED table, which is what makes it true of a
  // vocabulary that has moved: a name a past version declared and this one does not
  // is refused by the table it is actually offered to.
  //
  // It comes BEFORE anything is stored, structurally rather than by convention:
  // every seam resolves through here and appends afterwards, so a refused name
  // leaves no event, no partially owed step and nothing for a later pass to find.
  async function applicableReactors(name, payload, ctx = {}, effects = table) {
    if (!isDeclared(effects, name)) throw new UndeclaredEventError(name, Object.keys(effects));
    const declared = effects[name];
    const owed = [];
    for (const reactor of declared) {
      if (typeof reactor.applies !== "function") {
        owed.push(reactor);
        continue;
      }
      try {
        if (await reactor.applies(payload, ctx)) owed.push(reactor);
      } catch (error) {
        reportDegrade("effect-applies", error, { path: `${name}/${reactor.key}` });
      }
    }
    return owed;
  }


  return Object.freeze({
    table,
    effectsFor: name => isDeclared(table, name) ? table[name] : null,
    knownEvents: () => Object.keys(table),
    ownerOf: (event, key) => owners.get(event)?.get(key),
    applicableReactors,
  });
}
