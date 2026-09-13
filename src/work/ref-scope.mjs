// THE SUBTREE-SCOPE RULE (story 80 / task 02) — one home for "does this item's ref
// belong to the scope someone typed?".
//
// ZERO IMPORTS, DELIBERATELY, and for the same reason `declared-id.mjs` is a leaf: this
// is a RULE, not a reader. It touches no filesystem, spawns nothing, reads no clock —
// which is the only shape that lets `src/memory/local-retrieval.mjs` (declared PURE: a
// function of records/query/scope that "never touches disk or argv") share it with
// `src/work/doctor.mjs` and `src/work.mjs`.
//
// WHY IT EXISTS. The rule had TWO copies before this story — `inScope` in
// `work-doctor.mjs` and an identical closure inside `validateWork` (`work.mjs`), whose
// own comment says it holds "the SAME semantics as validateWork". Story 80 needed a
// THIRD reader: once a nested story's memory records carry the ref `39/02` rather than
// the bare number `02`, a `--item 39` recall must still see its own stories' deliveries
// or the aggregation the outcome index exists for is broken by the very fix that makes
// its citations true. A third copy of a rule that already had two was not an option.
//
// THE SPLIT IS DELIBERATE. `refInScope` answers from a REF ALONE, because a memory
// record carries only `item: "39/02"` — no parent, no slug, no folder. `itemInScope`
// adds the two things only an ITEM can answer: a parent-derived driver (a story knows
// its own parent without parsing its ref) and the free-text SLUG branch, which no ref
// can serve. Both share one numeric/pair rule, so the doctor, validate and memory can
// never disagree about what `39` means.

// The driver a ref belongs to: `"39"` -> "39", `"39/02"` -> "39". Anything else -> null.
function driverOf(ref) {
  const text = String(ref ?? "").trim();
  if (/^\d+$/.test(text)) return text;
  const pair = text.match(/^(\d+)\/(\d+)$/);
  return pair ? pair[1] : null;
}

const sameNumber = (a, b) => Number.parseInt(a, 10) === Number.parseInt(b, 10);

// Does `ref` fall inside `scopeRef`?
//
//   scope "39"     -> the driver 39 AND every item under it ("39", "39/00", "39/01", …)
//   scope "39/02"  -> that exact story alone
//   empty scope    -> everything (an unscoped read narrows nothing)
//
// An UNRESOLVED scope simply matches nothing — never a throw. That is the contract
// `validateWork` and `doctorWork` have always applied, and it is why a
// `recall --item 999` answers with an empty block and exit 0 rather than an error.
// A NON-NUMERIC scope (a slug) returns `null`: a bare ref cannot answer it, and the
// caller must decide — `itemInScope` matches it against the item's slug; a ref-only
// caller treats it as no match.
export function refInScope(ref, scopeRef) {
  if (scopeRef == null) return true;
  const scope = String(scopeRef).trim();
  if (scope === "") return true;

  if (/^\d+$/.test(scope)) {
    const driver = driverOf(ref);
    return driver != null && sameNumber(driver, scope);
  }

  const pair = scope.match(/^(\d+)\/(\d+)$/);
  if (pair) {
    const text = String(ref ?? "").trim();
    return text === `${pair[1]}/${pair[2]}` || text === scope;
  }

  return null; // not answerable from a ref — the caller decides (slug branch)
}

// The ITEM-shaped face of the same rule. Adds exactly the two things a ref cannot
// answer: the driver comes from the item's own `parent` (never re-parsed out of its
// ref), and a free-text scope falls through to a slug substring match.
export function itemInScope(item, scopeRef) {
  if (!scopeRef) return true;
  const scope = String(scopeRef).trim();
  if (scope === "") return true;

  if (/^\d+$/.test(scope)) return sameNumber(item.parent ?? item.number, scope);

  const byRef = refInScope(item.ref, scope);
  if (byRef !== null) return byRef;

  return String(item.slug ?? "").includes(scope);
}
