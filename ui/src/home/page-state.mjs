// THE TERMINALS HOME'S OWN PAGE STATES (milestone 49 / story 04 / task 01; DESIGN §S1 and
// DG-49-1; ADR-001's "every DECISION lives in a `.mjs` plain `node` can import").
//
// ONE selector, total over every payload the fleet face can serve, and it never throws. The
// precedent it copies is deliberate and is named rather than reinvented: `pageState(ctx)` in
// ui/src/fleet/scope.mjs is the fleet's ONE state selector, a pure function of
// `{ loading, error, status }` whose own comment says the state names are shared between the
// render code and the tests. This is the SAME SHAPE — and it is a COPY rather than an import,
// because ADR-001 rules that `ui/src/home/` imports nothing from `ui/src/fleet/`
// (`acd-terminal-control-boundary`'s `home →` baseline is EMPTY and shrink-only from zero).
//
// ── WHY THERE ARE TWO EMPTY STATES AND NOT ONE (DG-49-1, and it is the premise of the page) ──
// A presence session record is written only through `aof session start|ping|end`, which fires
// only where the workspace's own hook config wires it — and the shipped bundle wires those
// hooks for CODEX only. Measured on the live three-node fleet at this milestone's refine: all
// three nodes report an empty index while two of them report a non-empty `activeRuns`. So the
// first thing most operators meet here is an empty grid WHILE AGENTS ARE DEMONSTRABLY WORKING,
// and a bare "no live sessions" would be true of the array and false about the world. E1 says
// nothing is running; E2 says work IS running and no session is reporting a terminal, and names
// why. One sentence, two very different facts.
//
// ── EVERY MALFORMED SHAPE FAILS TOWARD E1, NEVER TOWARD E2 ──────────────────────────────────
// E2 makes a POSITIVE claim ("there are runs in flight"). A claim built on a shape we could not
// parse is exactly the lie-by-omission this page exists to refuse, so an unreadable `sessions`,
// an absent `nodes` key or an `activeRuns` that is not an array all answer E1 — which asserts
// only an absence.
//
// ── AND AN ABSENT PAYLOAD IS "STILL ASKING", NOT "NOTHING IS RUNNING" ───────────────────────
// `status` absent or null answers `loading`, exactly as the fleet's `isEmptyStatus(null)` already
// treats a null payload as not-yet-known and its `pageState` reads `loading` first. Answering E1
// there would assert "nothing is running" about a fleet nobody has heard from.
//
// NO BROWSER GLOBAL IS READ HERE, and none is reachable: the payload, the loading flag and the
// failure arrive as arguments (`acd-home-layout-is-a-filter` sweeps this whole directory for
// them). The fetch, the poll and the retry are the component's — see ui/src/home/Home.tsx.
import { ROUTES } from "../app/routes.mjs";

// ────────────────────────────────────────────────── the five states DESIGN §S1 fixes ────
//
// They are the PAGE's states — which of loading / failed / empty / populated the whole content
// region is in — and they are a different axis from a PANE's connection state (m46's frozen
// ramp: `idle · connecting · waiting · streaming · ended · error · unavailable`). One page has
// one of these; a page in the populated state holds N panes each with one of those. The two
// vocabularies are composed, never merged, which is ADR-003's whole subject one level up — and
// it is why `acd-home-pane-truth`'s ramp-word clause is SCOPED to pane composition: this module
// declares no axis, no composer and imports no ramp, so it is on the other axis entirely.
export const HOME_PAGE_STATE_LOADING = "loading";
export const HOME_PAGE_STATE_ERROR = "error";
// The two emptinesses, named by DESIGN rather than by this module: E1 is "nothing is running",
// E2 is "runs in flight, nothing reporting". They are separate STATES and not one state with a
// flag, because they carry different sentences, and a flag on one state is how the second
// sentence goes missing.
export const HOME_PAGE_STATE_E1 = "E1";
export const HOME_PAGE_STATE_E2 = "E2";
export const HOME_PAGE_STATE_POPULATED = "populated";

// The CLOSED set, exposed as a value so a consumer can prove it is closed — and so "exactly one
// of the five treatments is on screen" is checkable against the list rather than against five
// hand-typed names at the assertion site.
export const HOME_PAGE_STATE_LIST = Object.freeze([
  HOME_PAGE_STATE_LOADING,
  HOME_PAGE_STATE_ERROR,
  HOME_PAGE_STATE_E1,
  HOME_PAGE_STATE_E2,
  HOME_PAGE_STATE_POPULATED,
]);

// ─────────────────────────────────────────────────────────── reading the payload ────
//
// THE INDEX. `status.sessions[]` is m48's top-level session index and it is the ONLY source of
// rows this surface has (ADR-002: an assignment is not a session and is never enumerated as
// one). A row is ADDRESSABLE when it carries the WHOLE routing tuple — `buildSessionIndex` skips
// anonymous sessions, so a half-tuple should be unreachable on the wire, and this still refuses
// one rather than counting it: a row that cannot be addressed is not a pane.
//
// BOTH HALVES OF THE TUPLE ARE CHECKED, AND SO IS EMPTINESS, because an unreachable shape is one
// nobody drives and an unchecked guard is absent rather than merely untested. The same predicate
// feeds the G0 summary story 05 wires to real counts, so counting a half-tuple would put a number
// on screen for a session no socket can ever reach.
function addressableSessions(status) {
  const rows = status == null || typeof status !== "object" ? null : status.sessions;
  if (!Array.isArray(rows)) return [];
  return rows.filter(
    (row) =>
      row != null
      && typeof row === "object"
      && typeof row.nodeId === "string"
      && row.nodeId.length > 0
      && typeof row.sessionId === "string"
      && row.sessionId.length > 0,
  );
}

// THE E1/E2 DISCRIMINATOR, and it is the one join this module makes. `buildSessionIndex` never
// reads `activeRuns` (its node gate is `node.freshness !== "live"`), so the "agents are working"
// half of DG-49-1 has to be read off the nodes here.
//
// LIVE NODES ONLY, and that is a ruling rather than an oversight. A stale node's presence file
// is FROZEN ON DISK with its runs inside it — the exact hazard the index itself gates on — so
// counting those runs would make this page assert "3 runs in flight" about a machine we cannot
// see, which is the species of lie the whole design gap exists to refuse. It also keeps both
// halves of one sentence derived from ONE liveness rule: a build that gated sessions on
// freshness and runs on nothing could say "2 runs in flight" and "no session is reporting"
// about a machine that has been off for a day.
export function activeRunCount(status) {
  const nodes = status == null || typeof status !== "object" ? null : status.nodes;
  if (!Array.isArray(nodes)) return 0;
  let total = 0;
  for (const node of nodes) {
    if (node == null || typeof node !== "object") continue;
    if (node.freshness !== "live") continue;
    const presence = node.presence;
    if (presence == null || typeof presence !== "object") continue;
    const runs = presence.activeRuns;
    // Not an array ⇒ nothing countable. Failing toward zero fails toward E1, which is the
    // direction the whole module fails in.
    if (!Array.isArray(runs)) continue;
    total += runs.length;
  }
  return total;
}

// homePageState({ loading, error, status }) — the ONE selector, and the precedence is stated
// here rather than discovered at a render site:
//   loading wins over everything, including a stale error still held from a previous attempt;
//   a failure wins over any payload, empty or populated, because a payload in hand beside a
//   fresh failure is a payload we cannot vouch for;
//   no payload at all is STILL ASKING;
//   then the index decides populated vs empty, and the NODES decide which emptiness.
export function homePageState(context) {
  const source = context == null || typeof context !== "object" ? {} : context;
  if (source.loading) return HOME_PAGE_STATE_LOADING;
  if (source.error) return HOME_PAGE_STATE_ERROR;

  const status = source.status;
  if (status == null || typeof status !== "object") return HOME_PAGE_STATE_LOADING;

  if (addressableSessions(status).length > 0) return HOME_PAGE_STATE_POPULATED;
  return activeRunCount(status) > 0 ? HOME_PAGE_STATE_E2 : HOME_PAGE_STATE_E1;
}

// The addressable row count, exported beside the selector because the surface-slot summary
// counts the same population the selector reads. Two counts over one array is a fact with two
// homes, and this page has exactly one array.
export function addressableSessionCount(status) {
  return addressableSessions(status).length;
}

// ───────────────────────────────────────────────────────────────── the one exit ────
//
// `/fleet` is the page that renders the runs this page cannot, which is the whole reason DESIGN
// picks it. It is READ OFF THE ROUTE TABLE rather than typed here: `acd-no-surface-mode-url-literal`
// refuses a route path minted anywhere outside its eight declared producers, and the
// behavioural neighbour (a rendered href carrying no `mode=` selector) is what a literal would
// satisfy structurally while still being a second home for the address. `ui/src/app/shell-nav.mjs`
// derives every nav href the same way and for the same reason.
const FLEET_ROUTE = ROUTES.find((route) => route.id === "fleet");

/** The href the empty states' one link carries. Null only if the route table lost `/fleet`. */
export const HOME_EXIT_HREF = FLEET_ROUTE?.path ?? null;

/** Its label. One exit, one wording, in both empty states — they differ in words, never in exits. */
export const HOME_EXIT_LABEL = "Open the fleet →";

// ─────────────────────────────────── the count rule, and it is the SURFACE'S ────
//
// EVERY INTERPOLATED COUNT ON THIS SURFACE AGREES WITH ITS OWN VALUE (designer's GAP-6, ruled
// 2026-08-13). The rule is stated ONCE, here, and applied through ONE function — because the
// finding was not `1 runs in flight`, it was the SHAPE of the previous fix: GAP-3 was closed in
// `homeSlotSummary` and DG-49-3's correction was written *"every count in THE SUMMARY pluralises
// by its own value"*, scoped to one component, when the defect is a property of every
// interpolated count this surface renders. K3 sat on the same screen and was never in that fix's
// blast radius. Patching a third string leaves the fourth: a rule applied per site is a rule that
// gets missed at the next site.
//
// THE INTERPOLATIONS, ENUMERATED so the sweep is checkable rather than remembered:
//   K3       `<N> run(s) in flight · …`                        `homeEmptyCopy`, below
//   G0       `<N> session(s) · <M> live · <K> need(s) input`    `homeSlotSummary`, below
//   K8       `not streaming — <N> live pane(s) already · …`     ui/src/home/session-mount.mjs
//   DG-49-7  `<K> pane(s) need(s) input`                        ui/src/home/grid.mjs
//   K12      `working · <repo> ×<n> (session)`                  ui/src/fleet/runs.mjs — ANOTHER
//            surface, and immune BY CONSTRUCTION: `×1` is never written. The pattern the others
//            should envy, and the one shape that needs no rule at all.
// `<M> live` is the same immunity one line down: `live` is an adjective with ONE form, so it
// agrees at every value without a branch. It is listed rather than silently skipped, because a
// site nobody wrote down is a site nobody sweeps.
// K8's SINGULAR IS UNREACHABLE at `MAX_LIVE_PANES` = 16 and becomes reachable the day the cap is
// configured to 1. The rule covers it anyway — no rendered string changes today, and the string
// that would change is written correctly before it can be read wrongly.
//
// IT TAKES THE WHOLE AGREEING PHRASE, not a stem plus `"s"`, and that is exactly what the fleet's
// own `plural(n, word)` (ui/src/fleet/runs.mjs) cannot express: two of these four phrases agree a
// VERB — `1 needs input` / `4 need input`, `1 pane needs input` / `3 panes need input` — where the
// plural is not the singular plus a letter. That helper is also UNIMPORTABLE here (ADR-001: the
// `home →` baseline is EMPTY and shrink-only from zero), so this is a second helper by rule as
// well as by shape, and the divergence is named rather than discovered.
//
// AND IT LIVES IN THIS MODULE rather than in one of its own. `ui/src/home/` is AT its 15-file
// ceiling with a DECLARED ALLOWANCE OF 0 (`test/arch/testing/acd-ui-directory-budget.test.mjs`), so a
// 16th file is an ADR rather than a diff — and a copy rule belongs beside the copy it governs.
// The two pane modules import it; this module imports nothing of theirs, which is what keeps
// `page-state.mjs` off `acd-home-pane-truth`'s participant list and the PAGE's five state words
// on their own axis.
function wholeCount(value) {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

/**
 * `countedPhrase(n, singular, plural)` — the count, a space, and the form that agrees with it.
 * Zero and every other non-one value take the plural, which is what English does.
 */
export function countedPhrase(count, singular, plural) {
  const whole = wholeCount(count);
  return `${whole} ${whole === 1 ? singular : plural}`;
}

// ───────────────────────────────────────────────────────────────────── the copy ────
//
// EVERY SENTENCE IS DESIGN'S, VERBATIM. E2's second line in particular is quoted rather than
// paraphrased: it is the one sentence on this surface that explains a producer-side fact an
// operator cannot otherwise discover, and a paraphrase would quietly change what it claims.
export const HOME_E1_LINES = Object.freeze(["Nothing is running.", "Assign work from the fleet."]);

// REPLACED 2026-08-13 (coordinator's ruling): the previous sentence named Codex as the only
// runtime the bundle wires session hooks for, and STORY 07 SHIPPED exactly those hooks for Claude —
// the live production capture shows a Claude session reported. A true statement about the tree,
// frozen into copy, outliving its truth: the milestone's own recurring defect. The replacement
// keeps DESIGN's no-command restraint and states the fact that is still true — a workspace reports
// a session only where its bundle carries the hooks that do the reporting.
export const HOME_E2_WHY =
  "A session appears here only when its workspace reports one — the bundle wires the session hooks "
  + "that report it. A run in a workspace whose bundle has not been updated will not appear here.";

// NO COMMAND IS PRINTED, and the restraint is the point rather than an omission. WHICH command
// wires Claude's session hooks into a workspace is a producer-side decision the architect still
// owns, and a refusal that names the wrong command is worse than one that names none. The
// house's own `EmptyFleet` prints three different commands in this very slot, so the nearest
// precedent is exactly the thing not to reach for. When that decision lands, E2 gains its
// command line in DESIGN first and here second — in one change, in that order.
export function homeEmptyCopy(state, runCount = 0) {
  const runs = wholeCount(runCount);
  const lines =
    state === HOME_PAGE_STATE_E2
      // K3, THROUGH THE SURFACE'S COUNT RULE (designer's GAP-6). `1 runs in flight` was on the
      // LIVE PRODUCTION SCREEN — this is the first sentence an operator reads on this milestone's
      // own surface, and it was the identical defect GAP-3 had just been fixed for one region up.
      ? [`${countedPhrase(runs, "run in flight", "runs in flight")} · no session is reporting a terminal.`, HOME_E2_WHY]
      : [HOME_E1_LINES[0], HOME_E1_LINES[1]];
  return Object.freeze({
    state: state === HOME_PAGE_STATE_E2 ? HOME_PAGE_STATE_E2 : HOME_PAGE_STATE_E1,
    lines: Object.freeze(lines),
    // The count the copy NAMES — null in E1, which names none. A zero here would read as a
    // count of zero rather than as "this state does not make a count claim".
    runCount: state === HOME_PAGE_STATE_E2 ? runs : null,
    link: Object.freeze({ label: HOME_EXIT_LABEL, href: HOME_EXIT_HREF }),
  });
}

// WHICH FAULT THE FAILED STATE NAMES. DESIGN rules the message names the fault rather than
// saying "something went wrong", so the SERVER's own coded sentence wins when it sent one — the
// fleet face answers `{ ok:false, error, code, path }` on every refusal, and that sentence is
// the only thing that tells an operator which fault this is. A refusal whose body will not parse
// falls back to the status, which still names something; a throw carrying nothing at all falls
// back to the last-resort wording, which is spelled HERE and nowhere else. The decision lives in
// this module rather than in the component because it IS a decision; the awaiting is the
// component's, and the component ASKS for the last-resort sentence rather than retyping it.
export function homeFaultMessage(body, httpStatus) {
  const named = body != null && typeof body === "object" && typeof body.error === "string" ? body.error : "";
  if (named.length > 0) return named;
  return Number.isFinite(httpStatus) ? `Request failed (${httpStatus})` : "Failed to load";
}

/** DESIGN §S1's loading treatment: a muted centred LINE in the same card. Never a shimmer. */
export const HOME_LOADING_LINE = "Loading sessions…";

// The house's dashed empty primitive, verbatim from ui/src/fleet/Fleet.tsx. Copied rather than
// imported for ADR-001's boundary reason, and pinned as a constant rather than retyped in JSX so
// "the card is the house's own card" is a fact a headless lane can hold the component to.
// …AND IT IS BOUNDED (designer's GAP-5, ruled 2026-08-13). The house primitive itself is verbatim;
// what is added is the MEASURE, because at the content region's full 1214px E2's why-line renders
// as a single ~150-character line — unreadable as a paragraph and nothing like the card the rest of
// the product draws. 520px is BASELINE's own value, adopted; its 13px MONO headline is NOT, because
// mono would fork the light shell's type ramp for one string (DESIGN's "no new value on this
// surface" rail).
export const HOME_EMPTY_CARD_CLASS = "mx-auto w-full max-w-[520px] rounded-lg border border-dashed border-border bg-card/40 p-6 text-sm text-muted-foreground";

/** The page's ONE heading, carried across from the deleted ui/src/app/Landing.tsx. */
export const HOME_HEADING = "Live terminals";

// ────────────────────────────────────────────────────── the surface-slot summary ────
//
// DESIGN §S1 G0: one line, muted, `<N> sessions · <M> live`, plus `· <K> need input` ONLY when
// K > 0 — a badge that says "we don't know" on most tiles trains the eye to ignore the badge
// that matters (DG-49-3). It is a SUMMARY and never a control.
//
// ── RULE R-3: G0 RENDERS COUNTS ONLY WHEN IT HOLDS A PAYLOAD (designer's GAP-7) ───────────────
// `0 sessions · 0 live` rendered in the chrome 90px above `Could not load the mesh`, and again
// above `Loading sessions…` — a count asserted before the first fetch has returned. The page said
// it did not know; the chrome said the answer was zero. `0` IS NOT A NEUTRAL PLACEHOLDER HERE:
// "0 sessions" is E1's whole message, so rendering it from an ABSENCE of data is the exact
// species of lie DG-49-1 exists to refuse, one region up. Before the first fetch and while the
// last fetch failed, this answers `null` — NOTHING AT ALL, not `0`, not `—`, not a skeleton.
// Nothing is the honest form: the slot is a summary and never a control, so an empty slot costs
// the operator nothing where a wrong count costs them a search.
//
// THE SUBJECT IS THE PAGE STATE, NOT `status != null`, AND THE TWO AGREE TODAY — stated plainly
// because the honest argument for the choice is not the one it is tempting to write. `Home.tsx`
// runs a non-silent load in exactly two places, the first fetch and a Retry, and BOTH run with
// `status` already null, so no reachable frame today puts a held payload behind `loading` or
// `error`. The reason to ask the STATE is therefore not that it catches a case the other spelling
// misses; it is that it is the question the rule asks, answered by the surface's ONE selector.
// The five states already encode it: `loading` is "still asking", `error` is "a payload we cannot
// vouch for", and the other three are, by the selector's own construction, the states this page
// reaches only WITH a payload in hand. A second predicate over `status` would be a second
// authority on "do we hold a payload" — it agrees now and stops agreeing the day a non-silent
// reload runs over held content (`load()` never clears `status` on a refusal), which is precisely
// the two-answers-to-one-question defect this milestone keeps finding.
//
// AND IT IS NOT THE SILENT RE-POLL (F-49-04-b, ruled separately and ruled CORRECT AS BUILT). A
// poll that fails while last-known content is on screen sets no `failure` and clears no `status`,
// so the page state stays E1/E2/populated and this summary KEEPS RENDERING its last-known counts
// — which it should, because it does hold a payload. The two cases are one rule in one place and
// they must not be collapsed into one behaviour.
export const HOME_PAGE_STATES_WITH_PAYLOAD = Object.freeze(
  HOME_PAGE_STATE_LIST.filter((state) => state !== HOME_PAGE_STATE_LOADING && state !== HOME_PAGE_STATE_ERROR),
);

/** `null` when this state holds no payload — see R-3 above. Total; it never throws. */
export function homeSlotSummary(state, counts) {
  if (!HOME_PAGE_STATES_WITH_PAYLOAD.includes(state)) return null;
  const source = counts == null || typeof counts !== "object" ? {} : counts;
  // PLURALISED PER COUNT (designer's GAP-3, ruled 2026-08-13), THROUGH THE SURFACE'S ONE COUNT
  // RULE (GAP-6, which is what the per-component version of this fix cost). `1 sessions` and
  // `1 need input` were both on the live build, and the second is the one that mattered:
  // DG-49-7's own live region already said `1 pane needs input`, so the chrome and the
  // announcement were two spellings of one fact. DESIGN's G0 template (`<K> need input`) is what
  // was wrong; the verb agrees with the NUMBER, which is what an operator reads.
  // `<M> live` takes no branch — `live` is an adjective with one form (see the count rule above).
  const live = wholeCount(source.live);
  const needInput = wholeCount(source.needInput);
  const summary = `${countedPhrase(source.sessions, "session", "sessions")} · ${live} live`;
  if (needInput === 0) return summary;
  return `${summary} · ${countedPhrase(needInput, "needs input", "need input")}`;
}

// ────────────────────────────────────────────────────────────────── the cadence ────
//
// The fleet re-polls every 5s (`POLL_MS` in ui/src/fleet/assign-affordance.mjs, consumed at
// Fleet.tsx). The home polls the SAME route on the SAME cadence and declares the number here
// rather than importing it, because ADR-001's boundary forbids the import — the duplication is
// named so a later reader meets the decision instead of the coincidence.
//
// A LATER POLL NEVER RE-ENTERS `loading`, and that rule is stated on a page with nothing in it
// yet because this is the cheapest place to get it right: story 05 inherits the harder half
// (a grid of live terminals must not be torn down and rebuilt every five seconds), and blanking
// a screen of live terminals on a cadence is a worse failure than a five-second-old count.
export const HOME_POLL_MS = 5000;

/** The one route this surface reads. A GET poll of the fleet face's single status route. */
export const HOME_STATUS_PATH = "/api/mesh/status";
