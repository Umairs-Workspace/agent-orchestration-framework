// The pure fleet SCOPE helpers (milestone 34 / story 03; ARCHITECTURE ADR-006;
// DESIGN.md's Global/Local checklist). One framework-free ESM module Fleet.tsx
// imports and node:test exercises headlessly — no React, no DOM, no IO, no clock
// of its own — mirroring the house pattern (ui/src/board/runs.mjs, action.mjs):
// render-logic node:test must exercise belongs in a plain .mjs helper the .tsx
// wires up, never inline JSX-only logic.
//
// Covers task 02 (fleet-ui-scope-rendering) and task 03
// (empty-error-and-health-states)'s @executable render-decision surface: which
// scope is active, which region/state the page shows for a given status payload,
// local-filtering a global-shaped payload client-side, the URL scope round-trip,
// and the credential-field guard (ADR-005 — descriptors never render secrets).
//
// finding F9 (aof:verify 38) — also carries `nodeCurrentWork`, the ONE
// current-work-line derivation the ACTUALLY-rendered global node panel calls
// (mesh-ui-serve.mjs serves both scopes from queryGlobalMeshStatus, so the
// global-shaped panel is what production always mounts). A thin wrapper over
// ./runs.mjs's fleetCurrentWorkLines, kept here (not inline in the .tsx) so
// node:test can exercise it directly, mirroring this file's own pattern.
import { fleetCurrentWorkLines } from "./runs.mjs";

// ----------------------------------------------------- scope + URL -----------

export const VALID_SCOPES = ["global", "local"];

// The scope label the scope control renders as ACTIVE — "Global" or "Local"
// (DESIGN: "shows Global as the active scope" / "shows Local as active"). Falls
// back to "Global" for an absent/unrecognized scope (the safer, more-visible
// default — never silently render neither as active).
export function scopeLabel(scope) {
  return scope === "local" ? "Local" : "Global";
}

// Whether a scope string is one of the two recognised scopes.
export function isValidScope(scope) {
  return VALID_SCOPES.includes(scope);
}

// Build the URL scope-param string for a scope switch (task 02: "switching scope
// updates the URL"). PURE — the caller wires this into history.pushState/
// replaceState; this module touches no `window`/`location` itself (headless-testable).
export function withScopeParam(search, scope) {
  const params = new URLSearchParams(search ?? "");
  params.set("scope", scope);
  return `?${params.toString()}`;
}

// Read the scope param out of a location.search-shaped string, defaulting to
// "global" when absent/invalid (mirrors the server's own default — task 01).
export function scopeFromSearch(search) {
  const params = new URLSearchParams(search ?? "");
  const raw = params.get("scope");
  return isValidScope(raw) ? raw : "global";
}

// ------------------------------------------------------ the repo filter -------

// milestone 47 / story 02 (ARCHITECTURE ADR-001 + ADR-003) — the `?repo=<workspaceId>`
// URL contract, in the SAME one home and the SAME pure shape as the scope pair above.
// ADR-001: the filter EXTENDS this module; there is no sibling filter module and no
// module outside this one names the `repo` query key (the router and the shell nav
// carry it through by NOT KNOWING it — routes.mjs's copy-and-delete builder and
// shell-nav.mjs:161-169's positional href rule, both un-edited by m47).
//
// The value is the STABLE OPAQUE `workspaceId`, never the mutable `name` (nullable and
// renameable — a deep link built on it breaks silently and at a distance) and never the
// machine-local `projectRoot`. The legibility that costs is repaid on screen by ADR-007's
// chip, which resolves the id to a name from the payload the page already holds.
//
// TWO EXPORTS AND NO THIRD: clearing is `withRepoParam(search, null)`. A `clearRepoParam`
// would pass every fitness function and give the URL WRITE two doors — the duplicated-home
// shape ADR-001 exists to refuse, one function down.

// A `location.search`-shaped string, tolerated from a caller that read `location.search`
// too early or handed in something that is not a string at all. `location.search` is
// always a string in a browser, so every other shape is a caller mistake — and the answer
// to a caller mistake ON THE RENDER PATH is an answer, never a throw. This runs before any
// payload has landed, so an exception here is not a caught error state; it is the fleet
// failing to mount at all, on an address the operator can neither read nor recover from.
function repoSearchParams(search) {
  return new URLSearchParams(typeof search === "string" ? search : "");
}

// Whether a filter value is BLANK — absent, empty, or whitespace-only. ADR-003: "a blank
// value is an operator artifact (a cleared control, a hand-edited URL); answering it with
// an error state on a page that has data is worse than showing the data."
//
// ONE rule, read by BOTH sides of the contract: the READ side answers `null` for a blank
// value, and the WRITE side CLEARS rather than being able to create one. Two sides of one
// contract reading blankness by two rules would disagree about the same address, and the
// disagreement would only show up as a filter that reads "off" while the address says on.
//
// AND BLANKNESS STOPS AT THIS BOUNDARY (architect F1). These two URL functions are its
// ONLY readers. Everything downstream — `filterToWorkspace`, `isEmptyView`, the copy —
// asks ONE question, `repo == null`, and a blank string is therefore A FILTER THAT MATCHES
// NOTHING rather than no filter. Task 01 scenario 7 row 3 rules exactly that for the
// narrowing, and a module that answered differently in two of its own functions would hold
// two definitions of "no filter" with neither written down. This is the one written down.
function isBlankRepo(repo) {
  return typeof repo !== "string" || repo.trim().length === 0;
}

// Read the repo filter out of a location.search-shaped string. Returns the filter, or
// `null` for NO FILTER — never `""`, and that is load-bearing rather than stylistic:
// `new URLSearchParams("?repo=").get("repo")` is `""`, and `filterToWorkspace`'s no-op
// branch tests `workspaceId == null`, which `""` does not satisfy — so handing the raw
// `.get()` result on would turn `/fleet?repo=` (which ADR-003 rules is ABSENT: no filter,
// no error) into a page whose every region is empty.
export function repoFromSearch(search) {
  // `.get()` returns the FIRST occurrence — ADR-003's "a repeat takes the first", the same
  // rule routes.mjs:133 already applies to a repeated `mode`, so this app has one rule for
  // repeated keys and not two. TWO RULES, APPLIED IN THAT ORDER: first-wins, and THEN
  // blank-is-absent applied to THAT value. Never one merged rule that searches for the
  // first USABLE value — `?repo=&repo=b` is ambiguous by construction, and answering "no
  // filter" shows the operator everything rather than guessing which half they meant.
  const raw = repoSearchParams(search).get("repo");
  if (isBlankRepo(raw)) return null;
  // The id is OPAQUE: never validated, never normalised, never case-folded. `workspaceIdFor`
  // is a hash, so there is no shape to check, and a helper that lower-cased "to be forgiving"
  // would make a wrong link look like a working one. Whether the value NAMES anything is
  // decided against the PAYLOAD (filterToWorkspace), which is the only honest question.
  return raw;
}

// Build the URL search string for a filter change — COPY-AND-SET (ADR-003). Each control
// writes only its OWN key onto a copy of the incoming search, so writing the filter can
// never drop `scope`, a repeated key, or a parameter this codebase has never heard of;
// that is m45/ADR-006's preserve-by-default mechanism one layer down, and it is what makes
// ADR-005's composition work without either control knowing the other exists.
//
// A BLANK `repo` (null, undefined, "" or whitespace-only) CLEARS: `delete` removes EVERY
// copy of the key, so the address bar never carries a naked `?repo=`. PURE — the caller
// wires this into history.pushState (ADR-003, matching onScopeChange); this module touches
// no `window`/`location`/`history` itself.
export function withRepoParam(search, repo) {
  const params = repoSearchParams(search);
  // `set` on an existing key replaces IN PLACE and collapses repeats to one, so the key
  // does not move to the end every time the operator changes the filter (a rebuild would
  // reshuffle the address they are watching).
  if (isBlankRepo(repo)) params.delete("repo");
  else params.set("repo", repo);
  // An emptied query is the EMPTY STRING and never a bare "?" — the same discipline
  // routes.mjs:105-108's `toSearchString` applies one layer up. `withScopeParam`'s
  // unconditional `?${…}` prefix (:45) is safe only because it always SETS; the clear form
  // can empty the query, and a naked `?` is a second spelling of the same address.
  const query = params.toString();
  return query.length > 0 ? `?${query}` : "";
}

// ------------------------------------------------- region/state selection -----

// The four required page states (DESIGN.md "Required states": Empty / Loading /
// Error / Populated). PURE over the load outcome — no React state machine here;
// Fleet.tsx's own loading/error/status booleans map onto this one selector so the
// state names are shared between the render code and the tests.
//
//   ctx = { loading, error, status } — status is the parsed MeshStatus payload
//   (or null/undefined before the first successful load).
//
// milestone 47 / story 02 (ADR-009) — ctx gains `repo`, the ACTIVE NARROWING, and stays
// THE ONE STATE SELECTOR. It does not gain a sibling: a second selector beside it would
// be m45/ADR-002's "two selectors" failure one surface down, and every region already
// keys off this one. `repo` absent ⇒ the unfiltered question, byte-for-byte as before.
// The status it is handed is the NARROWED one (ADR-004's seam runs first).
export function pageState(ctx) {
  if (ctx.loading) return "loading";
  if (ctx.error) return "error";
  if (isEmptyView(ctx.status, ctx.repo)) return "empty";
  return "populated";
}

// errorPathFor(error, status) — review fix P0.5: the ERROR-STATE path the page
// renders (task 03 scenario 2's "the error state includes the global mesh path").
// Prefers the THROWN error's own `path` (api.ts's safeError attaches it from the
// coded 503 body — the ONLY source on a first-load failure, since `status` is still
// null then); falls back to a path already carried on a stale `status` payload
// (e.g. a silent re-poll failure after a prior successful load). Never throws on a
// null/shapeless input; absent either way ⇒ null (no path row rendered).
export function errorPathFor(error, status) {
  const fromError = error && typeof error === "object" ? error.path : null;
  if (typeof fromError === "string" && fromError.length > 0) return fromError;
  const fromStatus = status && typeof status === "object" ? status.path : null;
  return typeof fromStatus === "string" && fromStatus.length > 0 ? fromStatus : null;
}

// A status payload is EMPTY when it carries no workspaces, no work items, and no
// nodes — the global "no mesh-enabled workspaces have published yet" state (task
// 03) is a DIFFERENT state from an error; this predicate is scope-agnostic (it
// reads workspaces/items/nodes on the global shape, or nodes/boards on the local
// mesh:status shape — either way, all-empty renders the same calm empty state).
export function isEmptyStatus(status) {
  if (status == null) return true;
  const workspaces = status.workspaces ?? [];
  const items = status.items ?? [];
  const nodes = status.nodes ?? [];
  const boards = status.boards ?? [];
  return workspaces.length === 0 && items.length === 0 && nodes.length === 0 && boards.length === 0;
}

// milestone 47 / story 02 (ARCHITECTURE ADR-009) — "EMPTY" IS TWO QUESTIONS, NOT ONE, and
// this is the second one. `isEmptyStatus` above answers *has the mesh published anything?*
// — a question about the SOURCE of data, whose copy names publishing and whose remedy is
// `config.mesh.enabled`. This answers *is there anything for the operator to look at in
// THIS VIEW?* — a question about the VIEW, whose copy names the narrowing and whose remedy
// is to clear the filter. Different questions, different copy, different remedies; they
// were sharing one function, and no filter-blind predicate can answer both.
//
// THE MEASUREMENT THAT SETTLES IT: the green lane pinned at test/ui/fleet-scope.test.mjs:
// 102-108 — ADR-009 cites it at its own `:100-105`, where it sat when the ADR was written;
// that citation is immutable, this one tracks the file, and the LANE ITSELF is
// byte-identical to the day it was pinned. It asserts that
// `{ workspaces: [one row], items: [], nodes: [] }` is POPULATED — and
// that fixture is byte-identical to the narrowed shape of a repo that is on the mesh and
// quiet. The SAME payload must read populated unfiltered and empty filtered, so the
// narrowing has to be part of the question. It is taken as an EXPLICIT argument rather than
// sniffed off the payload ("exactly one workspace ⇒ filtered" would render the filtered copy
// on every fresh single-workspace install, naming a filter nobody set).
//
// THE RULE. Under a filter the surviving `workspaces` row is NOT CONTENT — it is the
// filter's own SUBJECT. `items` and `nodes` are the fleet's content; `workspaces` is its
// INDEX, and narrowing to one repo leaves exactly one index row BY CONSTRUCTION. Counting
// it as content makes "empty" unreachable for every known repo, which is the observed bug.
//   - UNFILTERED: empty ⇔ isEmptyStatus, unchanged (that predicate is NOT touched; dropping
//     `workspaces` from it is REJECTED BY NAME in ADR-009 — it would make the unfiltered
//     fleet lie about a mesh that has demonstrably published).
//   - FILTERED: empty ⇔ the narrowed payload carries no items and no nodes.
// (`boards` is the LOCAL mesh:status shape's collection and carries no workspace identity;
// a repo filter only ever applies to the global payload, so it is not part of this rule.)
export function isEmptyView(status, repo) {
  if (repo == null) return isEmptyStatus(status);
  if (status == null) return true;
  const items = status.items ?? [];
  const nodes = status.nodes ?? [];
  return items.length === 0 && nodes.length === 0;
}

// The three-valued resolution of a repo filter against the payload, read off the NARROWED
// status (ADR-009: the surviving `workspaces` row is the discriminator — the fact that made
// emptiness undecidable is exactly the fact that tells the two empties apart):
//
//   undefined — NOT YET KNOWN. No payload has landed, so the filter is UNRESOLVED, never
//               unknown. "A loading state that accuses a valid filter of being unknown is a
//               defect" (DESIGN, DG-47-3) — a boolean here would collapse this case into
//               the next one for as long as the first fetch takes.
//   null      — KNOWN NOT TO BE THERE. A payload landed and carries no row for this id.
//   a string  — the workspace's display name (`name ?? workspaceId`), i.e. KNOWN and quiet.
//
// Unknown is decided against the PAYLOAD, never against a validator: there is no id format
// to check, and "do any of the workspaces I was served carry this id" is the same question
// the regions ask.
export function resolvedRepoName(status, repo) {
  if (status == null) return undefined;
  if (repo == null) return null;
  const row = (status.workspaces ?? []).find((workspace) => workspace?.workspaceId === repo);
  if (row == null) return null;
  return row.name ?? row.workspaceId;
}

// The empty-state copy (task 03: "explain the next action without implying failure" /
// "does not call the mesh broken or failed"; m47/ADR-007: "the empty state names EVERY
// narrowing that produced it", in the order they were applied — scope, then repo).
//
// milestone 47 / story 02 — it returns `{ heading, body }` rather than a bare body. The
// heading used to be inline JSX in Fleet.tsx and DESIGN pins a heading AND a body per
// filtered state, so the shape had to grow; ADR-007 forecloses a sibling export and a
// polymorphic return alike (either would leave the heading inline for the unfiltered cases
// and re-homed for the filtered ones — two homes for one fact). The two UNFILTERED bodies
// and the two unfiltered headings are byte-identical to the shipped strings.
//
//   narrowings = {
//     scope,       "global" | "local" — the scope that produced the PAYLOAD, read off the
//                  payload's own `scope` scalar and never re-derived from the URL. A
//                  `--local`-started server narrows with no `?scope=` in the URL at all
//                  (mesh-ui-serve.mjs:556), so the URL's scope and the payload's can differ.
//     workspaceId, the SERVED narrowing (ADR-010 clause 5) — the workspace the SERVER
//                  narrowed to, `null` when it did not narrow. It rides the payload
//                  (global-mesh-query.mjs:271 ← mesh-ui-serve.mjs:557, typed at
//                  api.ts:210). ADR-004 clause 4 rules it a SCALAR the narrowing must not
//                  touch, and that stands: a scalar may be an input to the COPY without
//                  becoming an input to the NARROWING.
//     repo,        the RAW requested value, or null when no filter is in force.
//     resolved,    `resolvedRepoName` above — absent/undefined = not yet known, null =
//                  known not to be there, a string = the name to show.
//   }
//
// WHY THE SERVED NARROWING IS AN INPUT (ADR-010 clause 5, correcting a measured defect).
// *"Nothing on this mesh publishes as X"* is a claim about the MESH, and a client served
// ONE WORKSPACE was not served the mesh. ADR-009 made the surviving `workspaces` row the
// KNOWN/UNKNOWN discriminator, which is sound on a GLOBAL payload — there only the repo
// filter can remove a row. Under `?scope=local` the SERVER already removed every other
// row, so "zero survived" collapses *the scope excluded it* and *the mesh does not have
// it*, and the page ended up asserting that a demonstrably-publishing workspace publishes
// nowhere. So `resolved == null` means UNKNOWN **only when `workspaceId == null`**;
// otherwise it means OUT OF SCOPE. `resolvedRepoName` keeps its three values and its exact
// meaning — what changed is that the copy stopped over-reading it.
//
// THE STRINGS ARE DESIGN'S, NOT THIS MODULE'S. Every combination this function can reach
// is enumerated in DESIGN §Surface 2's E1–E7 table (amended 2026-08-11) and is quoted
// below verbatim, with its row id. DESIGN's own composition rule, honoured rather than
// re-derived here: A BODY VARIES BY CASE, NEVER BY NARROWING — six bodies for seven
// headings; where the scope is part of the fact the body names it (E2, E5), where it is
// not the body is identical across scopes and the scope is carried by the heading.
// THE HEADINGS ARE ENUMERATED, NOT DERIVED: "no exact rule turns `No repo matches this
// filter` into `Nothing matches Local scope and this repo` — they are different sentences
// about different facts, not a stem and a suffix."
export function emptyStateCopy(narrowings) {
  const record = narrowings != null && typeof narrowings === "object" ? narrowings : {};
  const scope = record.scope === "local" ? "local" : "global";
  const label = scopeLabel(scope);
  // ONE DEFINITION OF "NO FILTER" IN THIS MODULE, and it is `repo == null` — the same test
  // `isEmptyView` and `filterToWorkspace` apply (architect F1). BLANKNESS IS A URL-BOUNDARY
  // CONCEPT, owned entirely by `repoFromSearch` (which answers `null`, never `""`) and
  // `withRepoParam` (whose clear form is a blank value). Downstream of that boundary a
  // blank string is A FILTER THAT MATCHES NOTHING, exactly as `filterToWorkspace` treats
  // it. Teaching this function a second, softer rule is what task 01 scenario 7 row 3 rules
  // against in terms — "a second copy of one rule, in the module ADR-001 exists to keep
  // single, and it would mask a genuinely broken caller" — and it measurably produced
  // ADR-009's own defect class here: `repo = ""` over a populated payload narrowed to
  // nothing, `pageState` "empty", and this function answering "No mesh-enabled workspaces
  // have published yet" — a false statement about the mesh, produced by a filter.
  const repo = record.repo ?? null;
  // The served narrowing. `?? null` so an absent key and an explicit null are one case.
  const served = record.workspaceId ?? null;

  if (repo == null) {
    // E1 / E2 — the two shipped strings, byte-for-byte, re-homed and not re-worded.
    // `scope: "global"` IS NOT A NARROWING — it is the default (m34/ADR-006), and a heading
    // announcing it would be announcing the ABSENCE of a narrowing.
    return scope === "local"
      ? {
          heading: "No nodes in the group yet",
          body: "No nodes in the group yet. Enrol a machine to bring it onto the mesh.",
          value: null,
        }
      : {
          heading: "No mesh-enabled workspaces yet",
          body: "No mesh-enabled workspaces have published yet. Enable mesh on a workspace (config.mesh.enabled) and it will appear here.",
          value: null,
        };
  }

  if (record.resolved === undefined) {
    // E3 — NOT YET KNOWN is not NOT FOUND, and E3 IS THE ONE HEADING THAT COMPOSES WITH
    // NOTHING (DESIGN composition rule 4): neither narrowing produced this nothing — the
    // absence of a payload did — and both the scope label and the served narrowing are read
    // OFF THE PAYLOAD, so with no payload a composed heading could only be built from the
    // URL's guess. A guess dressed as a fact.
    return {
      heading: "Nothing from the mesh yet",
      body: `Nothing has arrived from the mesh yet, so whether it carries ${repo} is not yet known.`,
      value: repo,
    };
  }

  if (record.resolved === null) {
    // E4 — and it is available ONLY here, where the payload saw the whole mesh.
    if (served == null) {
      return {
        heading: "No repo matches this filter",
        body: `Nothing on this mesh publishes as ${repo}. It may not have published yet, or the id may belong to another mesh.`,
        value: repo,
      };
    }
    // E5 — OUT OF SCOPE, never unknown. The body names BOTH narrowings and says the
    // INTERSECTION is what is empty, which is also what keeps it from being E4's body
    // wearing a second coat (ADR-010 clause 6).
    return {
      heading: `Nothing matches ${label} scope and this repo`,
      body: `${label} scope narrowed this view to one workspace, and ${repo} is not it. The two narrowings have nothing in common, and a view of one workspace cannot say what the rest of the mesh holds.`,
      value: repo,
    };
  }

  // E6 / E7 — one body, two headings. The value is carried VERBATIM: never truncated,
  // escaped or ellipsised.
  //
  // `value: null` HERE AND NOWHERE ELSE AMONG THE FILTERED STATES, and the distinction is the
  // whole of the `value` field (F-47-V-5, DESIGN §E-table as amended 2026-08-11). E3/E4/E5 put
  // the operator's own RAW INPUT in the sentence, and the `mono` face is what marks it as their
  // string rather than the product's prose — the one thing they need to spot their own typo.
  // E6/E7 put a resolved NAME there, which is the product speaking, and a name dressed as an
  // identifier would be a lie about where it came from. `body` stays byte-identical in every
  // branch: this field is a POINTER INTO the sentence, never a second copy of it, so the strings
  // DESIGN pins and the lanes assert are untouched by the presentation decision.
  return {
    heading: scope === "local" ? `Nothing published in ${label} scope for this repo yet` : "Nothing published for this repo yet",
    body: `${record.resolved} is on the mesh but has published no milestones and no nodes. The rest of the fleet is still there.`,
    value: null,
  };
}

// ------------------------------------------------------- milestone list -------

// The global mesh read model intentionally carries the COMPLETE work stream
// (milestones, stories, tasks). The fleet UI's top-level global list is a
// milestone list, so it projects that complete payload down to milestone rows at
// render time instead of asking the store to forget lower-level items.
export function milestoneListItems(items) {
  return (items ?? []).filter((item) => item?.type === "milestone");
}

function sameMilestoneParent(parent, milestoneRef) {
  if (parent == null) return false;
  if (parent === milestoneRef) return true;
  const a = Number.parseInt(parent, 10);
  const b = Number.parseInt(milestoneRef, 10);
  return Number.isFinite(a) && Number.isFinite(b) && a === b;
}

export function milestoneCardModels(items) {
  const all = items ?? [];
  return milestoneListItems(all).map((item) => {
    const stories = all.filter(
      (candidate) =>
        candidate?.type === "story" &&
        candidate.workspaceId === item.workspaceId &&
        sameMilestoneParent(candidate.parent, item.ref)
    );
    const tally = (status) => stories.filter((story) => story.status === status).length;
    return {
      item,
      num: item.ref,
      stories,
      total: stories.length,
      done: tally("done"),
      inReview: tally("in-review"),
      inProgress: tally("in-progress"),
      blocked: tally("blocked"),
      notStarted: tally("not-started"),
    };
  });
}

// ------------------------------------------------------- local filtering ------

// Client-side filter of a GLOBAL-shaped status payload down to one workspace id —
// the pure counterpart to the server's own `?scope=local` narrowing (task 02:
// "no workspace or work item from beta is rendered"; task 01's deep-link
// semantics). Used when the UI already holds a global payload and the operator
// flips the scope control without a full remount/re-fetch having landed yet, and
// exercised directly by node:test for the filtering CONTRACT independent of the
// network. Non-mutating; absent workspaceId ⇒ the payload is returned unchanged.
//
// milestone 47 / story 02 (ARCHITECTURE ADR-002 + ADR-004) — promoted from a tested-but-
// uncalled export to THE ONE PRODUCTION NARROWING, and it now carries ADR-004's
// COMPLETENESS RULE, because "a filter that narrows one region and not another is worse
// than none" (SPEC) and this function SPREADS its input, so a collection added to the
// payload is silently exempt on the day it is added:
//   1. a collection whose rows carry a workspace identity is NARROWED by it —
//      `workspaces`, `items`, `sessions`, and `diagnostics.skippedWorkspaces`/`.projectionErrors`;
//   2. a collection whose rows carry a MEMBERSHIP list is narrowed by membership —
//      `nodes` (`workspaceIds`). This DIVERGES from the server's `?scope=local`, where the
//      roster deliberately stays machine-wide (global-node-registry.mjs:170-172, pinned by
//      acd-mesh-ui-local-filter-preserves-status) — "local" asks about the DAEMON's
//      workspace and a roster is a machine fact, while a repo filter asks WHICH MACHINES
//      ARE WORKING ON THIS REPO, and answering with every machine is not a filter. Two
//      narrowings, one store column, two correct answers: neither may be "fixed" to match
//      the other. Liveness is never part of the question — a stale or never-beat MEMBER is
//      exactly the machine an operator filtering for it is looking for.
//   3. a collection carrying NEITHER is DECLARED machine-wide, never silently passed
//      through (`diagnostics.descriptorErrors`, whose rows carry a descriptor `path` and a
//      node id — projection health has no per-repo meaning). The region says which of its
//      numbers are filtered; the declaration is ratcheted by
//      test/arch/ui/acd-fleet-filter-every-region.test.mjs against the WIRE TYPE.
//   4. SCALARS ARE NOT COLLECTIONS. `scope`, `workspaceId`, `stalenessSeconds`,
//      `diagnostics.projectedAt`/`.generatedAt`/`.databasePath` ride through unchanged —
//      they describe the RESPONSE, not its rows. `scope` matters most: the empty state and
//      the banner both name every narrowing in force and read that label, so a client-side
//      filter that relabelled it would leave the page unable to say which two narrowings
//      produced the nothing it is showing.
//
// `""` IS NOT "NO FILTER" and must never become one: the no-op branch tests
// `workspaceId == null`, so `""` narrows every collection to zero. That boundary is fixed
// at the READ side (`repoFromSearch` answers `null`, never `""`); teaching it here too
// would be a second copy of one rule, and would mask a genuinely broken caller.
export function filterToWorkspace(status, workspaceId) {
  if (status == null || workspaceId == null) return status;
  const diagnostics = status.diagnostics;
  return {
    ...status,
    workspaces: (status.workspaces ?? []).filter((w) => w.workspaceId === workspaceId),
    items: (status.items ?? []).filter((item) => item.workspaceId === workspaceId),
    nodes: (status.nodes ?? []).filter((node) => (node.workspaceIds ?? []).includes(workspaceId)),
    // milestone 48's SESSION INDEX, classified on the day it reached this wire — which is
    // ADR-004's whole point, since nothing in m47 added it and its author had no reason to know
    // this rule exists. It is CASE 1, narrowed by rule 1: its rows carry `workspaceId`
    // (`api.ts:222`, and m48/ADR-006 rules the entry SELF-SUFFICIENT — `{ nodeId, sessionId,
    // workspaceId, repo, assistant, lastPingAt, workspaceHasRun, workItem }` — so the identity is
    // ON the row and no join back into `nodes[].presence` is needed to find it). It therefore
    // takes the SAME one-line rule `workspaces` and `items` take, and the machine-wide exemption
    // list is NOT widened: that list has exactly one earned entry (`descriptorErrors`, whose rows
    // carry a descriptor `path`), and widening it to reach green is the defect the ratchet exists
    // to catch (STATE, 2026-08-11, ruled by the product-owner).
    //
    // THE VOCABULARY TRAP, named here because two DIFFERENT facts share one word on this wire: a
    // session row also carries `repo`, and that is NOT this milestone's `repo`. m47's `repo` is
    // the URL key naming a WORKSPACE, translated once to a `workspaceId` at the URL boundary
    // above; `MeshSession.repo` is a field ON a session row. The narrowing reads `workspaceId`
    // and never that field — a filter keyed on it would be answering a different question.
    sessions: (status.sessions ?? []).filter((session) => session?.workspaceId === workspaceId),
    // The one COMPOUND collection on this wire (ADR-004's Diagnostics ruling; DESIGN
    // §Surface 2 amended to agree). The block itself always survives — a filtered view is
    // never left unable to say whether its own data is fresh — and only the two members
    // whose rows carry `workspaceId` narrow. Spread FIRST so every machine-wide scalar and
    // `descriptorErrors` ride through byte-identically.
    ...(diagnostics != null && typeof diagnostics === "object"
      ? {
          diagnostics: {
            ...diagnostics,
            skippedWorkspaces: (diagnostics.skippedWorkspaces ?? []).filter((row) => row?.workspaceId === workspaceId),
            projectionErrors: (diagnostics.projectionErrors ?? []).filter((row) => row?.workspaceId === workspaceId),
          },
        }
      : {}),
  };
}

// ------------------------------------------- the THIRD narrowing: work status ----
//
// Operator request (2026-09-11): the fleet lists every milestone that ever existed — 158 on the
// live mesh, most of them `done` — so the page reads as history rather than as "what is live".
// The fix is a narrowing over the milestone rows by STATUS, defaulting to OPEN work, with a
// control to widen it. It lives HERE, in the one home (m47/ADR-001: `scope.mjs` owns "what is
// this view narrowed to"), takes the same URL round-trip shape the other two narrowings take,
// and is applied ONCE at the same seam in `Fleet.tsx` (ADR-004).
//
// It reaches ONE region. A status is a fact about a WORK ITEM; nodes, workspaces and diagnostics
// carry none, so unlike the repo narrowing this one leaves every other collection standing —
// which is why it filters `items` and nothing else. And it removes MILESTONE rows only: the
// stories stay, because `milestoneCardModels` tallies a card's `2 / 5 stories done` off the
// same flat array, and dropping a done story would misreport every open milestone's progress.
//
// THE DEFAULT IS NOT SPELLED IN THE ADDRESS. `open` is the view, `?status=` absent; only a
// widening or a different single status writes the key. So a link that carries no `?status=`
// keeps meaning "open work" if the default ever changes, and a pasted `?status=done` keeps
// meaning what it said.

export const DEFAULT_WORK_STATUS_FILTER = "open";
export const WORK_STATUS_FILTERS = Object.freeze([
  "open",
  "all",
  "not-started",
  "in-progress",
  "in-review",
  "blocked",
  "done",
]);

const WORK_STATUS_FILTER_LABELS = Object.freeze({
  open: "Open",
  all: "All",
  "not-started": "Not started",
  "in-progress": "In progress",
  "in-review": "In review",
  blocked: "Blocked",
  done: "Done",
});

export function isValidWorkStatusFilter(filter) {
  return typeof filter === "string" && WORK_STATUS_FILTERS.includes(filter);
}

export function workStatusFilterLabel(filter) {
  return WORK_STATUS_FILTER_LABELS[isValidWorkStatusFilter(filter) ? filter : DEFAULT_WORK_STATUS_FILTER];
}

// Read the address. An absent, blank or unknown value is the DEFAULT — never `null`, because
// unlike the repo narrowing there is no "no filter" state to distinguish from "not set": `all`
// is a value, and the absence of the key is `open`.
export function workStatusFromSearch(search) {
  const raw = repoSearchParams(search).get("status");
  return isValidWorkStatusFilter(raw) ? raw : DEFAULT_WORK_STATUS_FILTER;
}

// Write the address. The DEFAULT deletes the key (the copy-and-set discipline `withRepoParam`
// keeps: each control writes only its own key onto a copy of the incoming search, and the
// address never carries a value that means "nothing to say").
export function withWorkStatusParam(search, filter) {
  const params = repoSearchParams(search);
  if (!isValidWorkStatusFilter(filter) || filter === DEFAULT_WORK_STATUS_FILTER) params.delete("status");
  else params.set("status", filter);
  const query = params.toString();
  return query.length > 0 ? `?${query}` : "";
}

// Does this filter admit a row in this status? `open` is everything that is not `done` — an
// item with NO status (a malformed record) is open work by that rule, which is the honest
// reading: it is not finished, and hiding it would hide the record that most needs a look.
export function workStatusAdmits(filter, status) {
  if (filter === "all") return true;
  if (filter === "open" || !isValidWorkStatusFilter(filter)) return status !== "done";
  return status === filter;
}

// The narrowing. Total over a raw payload, like `filterToWorkspace`: a null status rides
// through, and every collection but `items` is spread through byte-identically.
export function filterToWorkStatus(status, filter) {
  if (status == null || filter === "all") return status;
  return {
    ...status,
    items: (status.items ?? []).filter((item) => item?.type !== "milestone" || workStatusAdmits(filter, item?.status ?? null)),
  };
}

// How many milestone rows the status narrowing REMOVED from an already repo-narrowed payload —
// the number the region header owes the operator when the default view hides something. Read
// off the two payloads either side of the one seam, never re-derived from the URL.
export function hiddenMilestoneCount(before, after) {
  return milestoneListItems(before?.items).length - milestoneListItems(after?.items).length;
}

// The region header's TAIL under this narrowing. Empty when nothing is hidden, so the accepted
// `6 milestones` / `2 of 6 milestones` heads (47/03 task 00) are byte-identical whenever the
// status view removes nothing — the tail is the statement of what it removed, and only then.
export function workStatusSummaryTail(filter, hidden) {
  if (!Number.isInteger(hidden) || hidden <= 0) return "";
  if (filter === "open" || !isValidWorkStatusFilter(filter)) return ` · ${hidden} done hidden`;
  return ` · ${hidden} hidden, ${workStatusFilterLabel(filter).toLowerCase()} only`;
}

// ---------------------------------------------------- the credential guard ----

// The field-name pattern that must NEVER reach a rendered node/workspace panel
// (ADR-005 — "sensitive credentials are never copied into the global
// descriptor"; task 02's "the UI does not expose credential-like descriptor
// fields"). Mirrors global-node-registry.mjs's own SECRET_KEY_PATTERN so the UI
// guard and the descriptor redaction agree on one vocabulary — belt AND braces:
// the descriptor is already redacted server-side, and the UI never renders a
// field matching this pattern even if one slipped through.
const CREDENTIAL_FIELD_PATTERN = /(token|secret|credential|auth|invite|hash|relayAuth)/i;

// Strip any credential-shaped key from a plain object (shallow — descriptor
// fields are flat by construction; a nested object, if ever present, is dropped
// wholesale rather than risking a partial redaction). Non-mutating.
export function withoutCredentialFields(record) {
  if (record == null || typeof record !== "object") return record;
  const out = {};
  for (const [key, value] of Object.entries(record)) {
    if (CREDENTIAL_FIELD_PATTERN.test(key)) continue;
    out[key] = value;
  }
  return out;
}

// Whether a field NAME looks credential-shaped (the guard NodeCard/renderers call
// before printing an arbitrary descriptor key — never render a key this matches).
export function isCredentialField(key) {
  return CREDENTIAL_FIELD_PATTERN.test(String(key ?? ""));
}

// ------------------------------------------------------- node panel facts -----

// The node panel's rendered facts for one node record, spanning BOTH the local
// mesh:status shape (nodeId/host/os/runtimes/skills/presence) and the global
// registry shape (nodeId/role/host/fabric.address/lastSeenAt/runtimes/skills) —
// DESIGN "node panel: shows control and worker nodes, last seen, roles/
// capabilities, and fabric address when known". PURE projection; never mutates
// the input, and never carries a credential-shaped field through (belt-and-braces
// with withoutCredentialFields above).
export function nodePanelFacts(node) {
  const safe = withoutCredentialFields(node ?? {});
  return {
    nodeId: safe.nodeId ?? null,
    role: safe.role ?? (safe.local ? "this node" : null),
    host: safe.host ?? null,
    lastSeenAt: safe.lastSeenAt ?? safe.presence?.heartbeatAt ?? null,
    capabilities: [...(safe.runtimes ?? []), ...(safe.skills ?? [])],
    fabricAddress: safe.fabric?.address ?? null,
    freshness: safe.freshness ?? (safe.presence ? (safe.stale ? "stale" : "live") : "unknown"),
  };
}

// ------------------------------------------------- current-work line (F9) -----

// nodeCurrentWork(node) — the row-3 current-work-line derivation (DESIGN
// §Surface 1: `idle` / `running N runs` / `working · <repo>[ ×<count>][,
// <repo>[ ×<count>]…] (session)` — every DISTINCT surviving repo said ONCE,
// counted where it holds more than one live session, m49/ADR-010), a thin
// pass-through to fleetCurrentWorkLines (./runs.mjs) over
// `node.presence` — no forked/duplicated collapse rule, and no liveness or
// run/session subsumption re-derived here (both are already-applied facts on
// the presence record by the time it reaches this projection, upstream at the
// publisher). Absent presence (a never-beat node) degrades to `{}`, which
// fleetCurrentWorkLines already renders as the single `idle` line — never a
// thrown error. Spans BOTH node shapes (global registry / local mesh:status)
// exactly as nodePanelFacts does, since both carry `presence` the same way.
export function nodeCurrentWork(node) {
  return fleetCurrentWorkLines(node?.presence ?? {});
}

// ---------------------------------------------- assign-to-node affordance -----

// assignableNodeOptions(nodes) — milestone 38 / story 04 (ARCHITECTURE ADR-012;
// ADR-008's producer-fed conformance) — the worker-node picker's options,
// derived from the REAL GET /api/mesh/status roster (task 03's Outline: empty /
// one / live+stale). PURE pass-through: every node the roster carries becomes
// an option — no invented placeholder, no liveness/eligibility filter (a
// stale-but-known node stays an option; the verb's node-known gate keys on a
// global_nodes row, NOT on liveness, so the picker must not drop a target the
// verb would accept). Repo-eligibility (membership + publish) is enforced by
// the verb AT ASSIGN TIME (task 01) — a coded refusal on the response, never a
// hidden picker filter here. Non-mutating; an absent/empty roster yields [].
export function assignableNodeOptions(nodes) {
  return (nodes ?? [])
    .map((node) => node?.nodeId)
    .filter((nodeId) => typeof nodeId === "string" && nodeId.length > 0);
}

// --------------------------------------------------------- diagnostics --------

// The health/diagnostics region's rendered summary (DESIGN "shows projection
// freshness, disabled/non-propagating workspaces, and store errors"; task 03
// "health diagnostics expose projection freshness and skipped workspace
// counts"). PURE over the global payload's `diagnostics` block (absent on the
// local shape ⇒ every count reads 0 / null, never throws).
export function diagnosticsSummary(status) {
  const diagnostics = status?.diagnostics ?? {};
  return {
    projectedAt: diagnostics.projectedAt ?? null,
    skippedWorkspaceCount: (diagnostics.skippedWorkspaces ?? []).length,
    descriptorErrorCount: (diagnostics.descriptorErrors ?? []).length,
    projectionErrorCount: (diagnostics.projectionErrors ?? []).length,
  };
}
