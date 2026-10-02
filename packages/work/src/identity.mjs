// Work item identity and reference grammar. Pure: no filesystem, configuration or runtime imports.
// `uat` is a top-level acceptance session: like a milestone it sits in the
// stream, carries `depends`, and gates downstream work — but it groups no
// stories (it references existing scenarios, it delivers no new behaviour).
// `spike` and `chore` (milestone 37 / ADR-001) are two more top-level DRIVERS,
// admitted the SAME way: they sit at the stream root, carry `depends`, group
// no stories, and are themselves the actionable unit — see `isDriver` and the
// `nextWork` item-is-the-work branch below.
// Exported (milestone 41 / ADR-001) — the ONE minimal touch of this god-node
// the whole 41 milestone requires: src/work/reindex.mjs consumes this SAME
// identity regex (never a re-derived copy) so a renamed folder it produces is
// guaranteed parseable by every one of work.mjs's 36 dependents. The value is
// unchanged; only the export keyword is added.
export const ITEM_RE = /^(\d+)_(milestone|story|task|uat|spike|chore)_([a-z0-9-]+)$/;
// milestone 127 / ADR-001 §2 — THE BACKLOG LEAF GRAMMAR, the second shape beside the item
// grammar and in the same home. An un-numbered driver under `backlog/**`: `<type>_<slug>`,
// identified by its slug (`findWork`'s free-text branch already admits it). `task` is
// deliberately absent — a task is never a backlog driver — and there is no number group, which
// is what keeps a numbered folder under `backlog/` a GROUP rather than an item (the walk below
// never consults ITEM_RE there). Exported for the same reason ITEM_RE is: doctor's orphan lane
// and the promote verb match against this binding, never a re-derived copy.
export const BACKLOG_ITEM_RE = /^(milestone|story|chore|spike|uat)_([a-z0-9-]+)$/;
// The two extra roots (127/ADR-001 §1), spelled ONCE. Neither name matches ITEM_RE, which is the
// whole of the compat story (§6): a pre-127 reader ignores both exactly as it ignores
// `TECH_DEBT.md` at the root today. Every other module that needs a root's name imports it —
// doctor's orphan lane, provenance's synchronous resolver — so a rename is one edit and the
// sweep in FF-12701 can hold "no other module carries the string".
export const BACKLOG_ROOT = "backlog";
export const ARCHIVE_ROOT = "archive";
export const sameNumber = (a, b) => Number.parseInt(a, 10) === Number.parseInt(b, 10);

// THE STORY-GRAINED SCOPE — `NN/MM-PP`, the stories MM..PP (inclusive) of driver NN, and
// `NN/SS`, the one-story span `NN/SS-SS`. One parser, shared by the three surfaces that admit
// it: `findWork` (the ref an operator typed — which resolves `NN/SS` through its own earlier
// pair branch, so this parser never sees it there), `inRange`/`inSpan` (scoping `nextWork`'s
// walk) and `skippedEntries` (`src/commands/next.mjs`, resolving a scope to the ONE driver it
// names). Returns `{ driver, lo, hi }`, else null; a descending span parses and admits
// nothing, as `decideLoopScope` treats `53-52`.
//
// EXPORTED (story 86) so the command face shares this predicate rather than growing a fifth
// scope vocabulary of its own. An export costs `work.mjs` no new import, so the ADR-015 §5
// reach ceiling the module already sits at is untouched, and `parseStorySpan` is none of the
// four DISK READER symbols `acd-cache-read-surface-boundary` keeps off the control side.
//
// `NN/SS` IS A SPAN, admitted here at story 86: before it, `inRange` could not parse it and
// fell through to "no scope at all", so `aof work next 44/01` walked the WHOLE STREAM and
// answered with another milestone's stories. A bare story ref is the span of exactly itself —
// one rule, not a second narrowing beside the span's.
//
// NOT in `work-ref-scope.mjs` (the subtree-scope leaf) for two reasons: this module cannot
// import it — see `validateWork`'s comment on the ADR-015 §5 reach ceiling, which currently
// MEASURES its maximum — and that leaf serves validate/doctor/memory, whose scope vocabulary
// is deliberately not this one. A span is an EXECUTION scope; `work loop`'s own frozen guard
// (`LOOP_SCOPE_FORMS`) refuses story refs outright for the matching reason. The full argument
// is in `test/work/record/work-story-span-scope.test.mjs`.
export function parseStorySpan(ref) {
  const span = String(ref ?? "").trim().match(/^(\d+)\/(\d+)(?:-(\d+))?$/);
  if (!span) return null;
  const lo = Number.parseInt(span[2], 10);
  return {
    driver: Number.parseInt(span[1], 10),
    lo,
    hi: span[3] === undefined ? lo : Number.parseInt(span[3], 10),
  };
}
