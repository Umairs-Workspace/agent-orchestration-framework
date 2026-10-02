// Read-only readiness over discovered items and caller-supplied metadata/candidacy views.
import { VALID_STATUS } from "./lifecycle.mjs";
import { parseStorySpan } from "./identity.mjs";
import { listItems, isLiveStreamRow } from "./discovery.mjs";
import { readItemMeta as readMeta } from "./records.mjs";
import { isDriver, isDependTarget, asList, storiesByParent, siblingGate } from "./dependencies.mjs";

// Preserve the declared lifecycle order without spelling a second vocabulary.
const [, , , IN_REVIEW, DONE] = [...VALID_STATUS];

// Work errors carry `.code`/`.status` (the command error contract) so a face maps
// them uniformly — matching src/command-error.mjs.
function workError(message, code, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

// STORY_GRAINED_RE — the shape that CLAIMS to be story-grained: a leading `NN/`. It is the
// refusal's reach in `inRange`, and it is deliberately narrower than "anything unparsed".
//
// The fall-through it guards is load-bearing for FREE-TEXT scopes (a slug), so refusing every
// string this module cannot parse would refuse legal scopes — the m59/R7 near-miss, where a
// refusal keyed on characters refused legal paths and would have failed every run rather than
// one. A slug is `[a-z0-9-]+` and carries no `/`, so nothing legal is inside this reach.
const STORY_GRAINED_RE = /^\d+\//;

// The admitted forms, named in the refusal so the operator can see what they typed instead of.
const ADMITTED_SCOPE_FORMS = "NN (a driver), NN-MM (a driver range), NN/SS (one story), NN/MM-PP (a story span), or a free-text slug";

// ----------------------------------------------------------------- next ----

function inRange(scopeRef) {
  if (!scopeRef) return () => true;
  const range = scopeRef.match(/^(\d+)-(\d+)$/);
  if (range) {
    const lo = Number.parseInt(range[1], 10);
    const hi = Number.parseInt(range[2], 10);
    return (num) => num >= lo && num <= hi;
  }
  if (/^\d+$/.test(scopeRef)) {
    const only = Number.parseInt(scopeRef, 10);
    return (num) => num === only;
  }
  // A STORY SPAN narrows the walk to the one driver it names; `inSpan` narrows its stories.
  // Placed AFTER the numeric forms so neither changes meaning: `44-46` is still a driver
  // range, `44` still one driver.
  const span = parseStorySpan(scopeRef);
  if (span) return (num) => num === span.driver;
  // A SCOPE THAT IS IGNORED WITHOUT SAYING SO IS WORSE THAN ONE THAT IS REFUSED (story 86,
  // TECH_DEBT item 49). The trailing fall-through below is the unscoped decision, and it used
  // to admit story-grained shapes it could not parse: `44/01-03x`, `44/`, and the en-dashed
  // `44/01–02` a document's auto-correct produces each walked the WHOLE STREAM and answered
  // with other milestones' stories, with no signal the scope had been dropped. `findWork`
  // answers `[]` for the same strings, so the two surfaces disagreed about what a
  // story-grained ref means — invisible until work had been done against the wrong one, and
  // the lane that consumes this answer dispatches worktrees and spawns developers.
  //
  // The refusal reaches EXACTLY the shapes claiming to be story-grained; a free-text scope
  // still falls through (see STORY_GRAINED_RE).
  if (STORY_GRAINED_RE.test(String(scopeRef).trim())) {
    throw workError(
      `scope "${scopeRef}" claims to be story-grained but is not a story ref or span — admitted forms: ${ADMITTED_SCOPE_FORMS}`,
      "invalid-scope",
      400,
    );
  }
  return () => true;
}

// The story half of a span scope: which of a driver's stories the walk may OFFER. Any other
// scope admits every story, so an unscoped/driver-scoped walk is byte-identical to before.
function inSpan(scopeRef) {
  const span = parseStorySpan(scopeRef);
  if (!span) return () => true;
  return (num) => num >= span.lo && num <= span.hi;
}

const ready = (item, status) => ({
  state: "ready",
  ref: item.ref,
  type: item.type,
  slug: item.slug,
  status: status ?? null,
  path: item.dir,
});

// The next actionable item, respecting `depends`: the first not-`done`
// top-level driver (milestone, uat session, spike, or chore) whose
// dependencies are all `done`. A milestone is drilled into its first not-`done`
// story; a uat session, spike, or chore is itself the actionable item (each
// groups no stories — running/resolving/ticking it IS the work; milestone 37 /
// ADR-001 treats spike/chore the uat way). Returns
// { state: "ready" | "blocked" | "done", ... }.
//
// The OPTIONAL third argument (milestone 26 / ADR-005, WIDENED milestone 27 /
// ADR-004 — mesh-aware next, INJECTED): `candidacyView` is a pre-computed,
// PLAIN-DATA view built OUTSIDE this module (the command layer composes it under
// its config gate, unifying the m26 lease view with the m27 routing verdict; this
// module imports NO mesh module) — a Map keyed by item ref, value
// { state?: "leased-live" | "leased-stale", holder?, routed?: "elsewhere" }; a ref
// absent from the map (or an absent map) is unleased/untargeted. ABSENT ⇒
// behaviour is byte-identical to the two-argument call (the mergePresence(disk,
// null) === disk idiom applied to next).
//
// THE PER-REF GUARD (ADR-004.2 — routing runs FIRST, the lease then arbitrates):
//   routed === "elsewhere"  ⇒ skipped (another node's work — never surfaced
//                              reclaimable here, short-circuits before the lease);
//   state === "leased-live" ⇒ skipped exactly as not-actionable (being worked, not
//                              here — the following candidate is offered);
//   state === "leased-stale"⇒ returned ready + { reclaimable: true, leasedBy }
//                              (next is a READ — the claim path reclaims, never next);
//   otherwise                ⇒ offered in its normal walk position (byte-identical
//                              to the pre-fold-in behaviour when no entry exists).
// A milestone whose every not-done story is skipped (routed-elsewhere OR
// lease-live) is NOT offered as ready-for-acceptance — the walk falls through to
// the honest nothing-actionable shape.
//
// milestone 27 / ADR-004.3 (the m26/ADR-007 fold-in) — the SAME guard now applies
// at EVERY ready-return: the uat driver return, the zero-story needs-break-down
// driver return, AND the story-loop returns (already candidacy-aware in m26). The
// milestone-ACCEPT fallthrough (all stories done) stays deliberately
// candidacy-BLIND — a genuinely-done milestone is not a claimable work ref, so a
// lease/directive entry for it is ignored (the carve-out).
export async function nextWork(workDir, scopeRef, { candidacyView, view, throughReview = false } = {}) {
  const items = await listItems(workDir, { view });
  // milestone 127 / ADR-002 §2 — THE WALK IS OVER LIVE ROWS. `next` answers "what is next",
  // and neither a backlog row (un-numbered, waiting for `promote`) nor an archived one (done
  // and moved out, whatever its status says) is ever proposed. The rule is the ONE predicate,
  // applied here rather than re-spelled: a status test standing in for it would be wrong —
  // an archived row is invisible to `next` regardless of its status.
  const drivers = items
    .filter(isLiveStreamRow)
    .filter(isDriver)
    .sort((a, b) => Number.parseInt(a.number, 10) - Number.parseInt(b.number, 10));

  // A `depends:` edge resolves over the DEPEND-TARGET set, never the driver set. Milestone 78
  // declares `depends: [52, 53, 79]`, and 79 is the parentless story `79_story_committed-loop-graph`:
  // resolving over `drivers` alone missed it, read its status as null, and scored an edge that was
  // already satisfied as unmet — blocking 78 on a story that was done. `validate` had been widened
  // for this exact pair and the walk had not, so the two answered differently about one edge.
  //
  // Deliberately NOT filtered through the predicate (127/ADR-002 §3): an archived dependency is
  // `done` and satisfies the edge it is named in — the archive is a location, not a status, and
  // the target's own status is what gates. Only a backlog row is excluded, and only because it
  // has no number for an edge to name.
  const dependTargets = items.filter((item) => item.number != null && isDependTarget(item));
  const statusCache = new Map();
  const dependTargetStatus = async (num) => {
    if (statusCache.has(num)) return statusCache.get(num);
    const item = dependTargets.find((d) => Number.parseInt(d.number, 10) === num);
    const status = item ? (await readMeta(item, view)).status ?? null : null;
    statusCache.set(num, status);
    return status;
  };

  const within = inRange(scopeRef);
  const scoped = drivers.filter((d) => within(Number.parseInt(d.number, 10)));
  // A span narrows WHICH STORIES may be offered and suppresses every driver-grained offer
  // below (accept, needs-break-down, item-is-the-work): it names a slice, not a milestone.
  const storyWithin = inSpan(scopeRef);
  const spanScoped = parseStorySpan(scopeRef) !== null;
  const siblingIndex = storiesByParent(items);
  let blocked = null;

  // m65/01 — THE READY SET. The walk no longer RETURNS at its first offer; it records
  // every offer it would have made and keeps walking. The head of `readySet` is therefore
  // BY CONSTRUCTION the item the pre-change walk returned (same order, same guards, same
  // annotations), and the answer stays that item's own keys with the set beside them —
  // additive, so a caller reading `result.ref` reads the same ref as before.
  const readySet = [];
  const offer = (answer) => { readySet.push(answer); };
  // …and the other half: what the walk STEPPED OVER, in the same five-key vocabulary the
  // command's held-scope report uses (ADR-010/R1.5), so the two merge into one `skipped`
  // list rather than two competing ones. Reported per MEMBER, not just for the head —
  // otherwise a set-shaped answer would silently drop everything it passed over.
  const skipped = [];
  const passOver = (ref, candidacy) => {
    skipped.push(candidacy?.routed === "elsewhere"
      ? { ref, state: "routed-elsewhere" }
      : { ref, state: "leased-live", holderNode: candidacy?.holder ?? null });
  };

  for (const driver of scoped) {
    const meta = await readMeta(driver, view);
    statusCache.set(Number.parseInt(driver.number, 10), meta.status ?? null);
    if (meta.status === "done") continue;

    const unmet = [];
    for (const dep of asList(meta.depends)) {
      if ((await dependTargetStatus(Number.parseInt(dep, 10))) !== "done") unmet.push(String(dep));
    }
    if (unmet.length > 0) {
      blocked ??= { state: "blocked", ref: driver.ref, type: driver.type, slug: driver.slug, status: meta.status ?? null, path: driver.dir, waitingOn: unmet };
      continue;
    }

    if (driver.type === "uat" || driver.type === "spike" || driver.type === "chore") {
      // A SPAN NAMES STORIES, so a driver grouping none admits nothing from one — otherwise
      // `32/01-03` offers driver 32 itself. Inside this branch, not beside it, so the
      // driver-type list stays written once.
      if (spanScoped) continue;
      // milestone 27 / ADR-004.3 — the uat driver return is now candidacy-aware
      // (before m27 this return was candidacy-BLIND — a peer's next double-offered
      // a live-leased/targeted-elsewhere uat ref). milestone 37 / ADR-001 (FF-3705,
      // honouring 26/ADR-007) — spike/chore are routed through this SAME
      // candidacy-guarded, item-is-the-work return, NOT a fresh unguarded one: they
      // group no stories, so the milestone drill-down path below would mis-classify
      // them as "needs break-down".
      const uatCandidacy = candidacyView?.get?.(driver.ref);
      if (uatCandidacy?.routed === "elsewhere" || uatCandidacy?.state === "leased-live") {
        passOver(driver.ref, uatCandidacy);
        continue; // another node's work, or being worked live — pass over, keep walking
      }
      if (uatCandidacy?.state === "leased-stale") {
        offer({ ...ready(driver, meta.status), reclaimable: true, leasedBy: uatCandidacy.holder });
        continue;
      }
      offer(ready(driver, meta.status)); // run the session
      continue;
    }

    // Live stories only — a live milestone's stories are live by construction, and the filter
    // is what keeps an archived story whose milestone happens to share this driver's number
    // (a `duplicate-driver-number` fault doctor reports) out of this walk.
    const stories = items
      .filter((item) => isLiveStreamRow(item) && item.type === "story" && item.parent === driver.number)
      .sort((a, b) => Number.parseInt(a.number, 10) - Number.parseInt(b.number, 10));

    if (stories.length === 0) {
      // Same rule as the guard above: a span asked for stories, so an un-broken-down
      // milestone answers with nothing rather than its own ref.
      if (spanScoped) continue;
      // milestone 27 / ADR-004.3 — the zero-story (needs-break-down) driver return
      // is now candidacy-aware (the SAME guard, applied at the SAME driver.ref key).
      const zeroStoryCandidacy = candidacyView?.get?.(driver.ref);
      if (zeroStoryCandidacy?.routed === "elsewhere" || zeroStoryCandidacy?.state === "leased-live") {
        passOver(driver.ref, zeroStoryCandidacy);
        continue;
      }
      if (zeroStoryCandidacy?.state === "leased-stale") {
        offer({ ...ready(driver, meta.status), reclaimable: true, leasedBy: zeroStoryCandidacy.holder });
        continue;
      }
      offer(ready(driver, meta.status)); // needs break-down
      continue;
    }

    // Every sibling's status, read ONCE up front — the m65/00 gate needs a story's
    // siblings' statuses, not just its own, and re-reading a record doc per edge would
    // turn an O(n) walk into an O(n²) one on a wide milestone.
    const storyMetas = new Map();
    for (const story of stories) storyMetas.set(story.ref, await readMeta(story, view));
    const siblings = siblingIndex.get(String(Number.parseInt(driver.number, 10))) ?? stories;
    // A continue walk ends at the Review gate, not acceptance. In that mode an
    // in-review sibling has completed the build contract: do not offer it again,
    // and let dependants build without waiting for the later verify/accept pass.
    const storyComplete = (status) => status === DONE || (throughReview && status === IN_REVIEW);
    const statusOf = (item) => {
      const status = storyMetas.get(item.ref)?.status ?? null;
      return storyComplete(status) ? "done" : status;
    };

    let candidacySkipped = false;
    let offeredHere = false;
    let firstWaiting = null;
    for (const story of stories) {
      // OUT OF SPAN — stepped over before any gate, so neither offered nor reported waiting.
      // What is deliberately NOT narrowed: `siblings`/`statusOf` above still see EVERY story,
      // so an in-span story depending on an out-of-span sibling still waits on it and is
      // still reported blocked naming it — the span picks what to build, never what the
      // milestone's `depends` edges mean.
      if (!storyWithin(Number.parseInt(story.number, 10))) continue;
      const storyMeta = storyMetas.get(story.ref);
      if (!storyComplete(storyMeta.status)) {
        // m65/00 — THE SIBLING GATE, and the IGNORING half of the split: an edge that
        // names no sibling (a typo, a renumber, a copied ref) resolves to nothing and is
        // stepped straight past, so it can never strand a milestone. `validate` reports
        // exactly that edge. An edge that DOES resolve to an unfinished sibling makes
        // this story wait — it is not offered, and it does not count as done.
        const gate = siblingGate(storyMeta.depends, story, siblings, statusOf);
        if (gate.unmet.length > 0) {
          firstWaiting ??= { story, meta: storyMeta, unmet: gate.unmet };
          continue;
        }
        const candidacy = candidacyView?.get?.(story.ref);
        if (candidacy?.routed === "elsewhere") {
          // Targeted at (or claimed to advertise) another node's capability — not
          // this node's work at all; short-circuits BEFORE the lease is even
          // consulted (never surfaced reclaimable here).
          candidacySkipped = true;
          passOver(story.ref, candidacy);
          continue;
        }
        if (candidacy?.state === "leased-live") {
          // Leased by a live peer — being worked, just not here: passed over exactly
          // as not-actionable; the flag guards the milestone-accept fallthrough below.
          candidacySkipped = true;
          passOver(story.ref, candidacy);
          continue;
        }
        if (candidacy?.state === "leased-stale") {
          // A stale peer's item is OFFERED in its normal walk position, annotated so
          // the caller knows a claim-path reclaim stands between it and the work.
          offer({ ...ready(story, storyMeta.status), reclaimable: true, leasedBy: candidacy.holder });
          offeredHere = true;
          continue;
        }
        offer(ready(story, storyMeta.status));
        offeredHere = true;
      }
    }
    // Any story offered here ⇒ the milestone is being worked, not accepted.
    if (offeredHere) continue;
    // m65/00 — A MUTUAL WAIT IS REPORTED, NEVER SILENTLY ACCEPTED. Every remaining story
    // waiting on a sibling (the degenerate case being a cycle) must NOT fall through to
    // the accept return: "everything here is waiting" and "everything here is done" are
    // different facts, and reporting the second over the first is how a cycle reads as a
    // finished milestone. It is `blocked`, at the STORY grain, naming the siblings.
    if (firstWaiting) {
      blocked ??= {
        state: "blocked",
        ref: firstWaiting.story.ref,
        type: "story",
        slug: firstWaiting.story.slug,
        status: firstWaiting.meta.status ?? null,
        path: firstWaiting.story.dir,
        waitingOn: firstWaiting.unmet,
      };
      continue;
    }
    // The false-accept guard: a candidacy-skipped story is NOT done — a milestone
    // whose remaining stories are all skipped (routed-elsewhere or leased) must not
    // be offered for acceptance.
    if (candidacySkipped) continue;
    // `--through-review` is the build-loop view. All stories reaching in-review
    // means this scoped walk is complete; offering the milestone here would cross
    // into acceptance, which belongs to `aof:verify`.
    if (throughReview) continue;
    // A SPAN NEVER ACCEPTS. In-span stories all done means the SLICE is finished, not the
    // milestone — stories outside it were never looked at, so offering the driver here would
    // send an operator to accept a milestone with unbuilt stories.
    if (spanScoped) continue;
    // The milestone-ACCEPT fallthrough (ADR-004.3 carve-out) stays candidacy-BLIND —
    // a genuinely-done milestone is not a claimable work ref; no lookup here.
    offer(ready(driver, meta.status)); // all stories done -- milestone needs accepting
  }

  // THE ANSWER IS ADDITIVE. The head's own keys are exactly what this function returned
  // before m65/01; `readySet`/`skipped` arrive beside them. `blocked` carries an EMPTY
  // set, so "blocked" can never be misread as "one thing is ready". `done` keeps its bare
  // `{ state: "done" }` shape verbatim — it is deep-equalled by m27's candidacy contract
  // (packages/work/test/mesh-candidacy-every-return.suite.mjs), and there is nothing to act on anyway;
  // the command face normalises the two keys onto every state it emits.
  if (readySet.length > 0) return { ...readySet[0], readySet, skipped };
  if (blocked) return { ...blocked, readySet: [], skipped };
  return { state: "done" };
}
