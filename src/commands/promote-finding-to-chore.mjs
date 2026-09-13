// work:promote-finding — milestone 71 / story 01 (ADR-003 + ADR-004).
//
// The second face on the one promotion engine. A review finding the loop declines to chase becomes a
// top-level chore seeded from the finding's own remedy, carrying a back-reference to the reviewed
// item, the round and the finding, appended without renumbering, and idempotent on the pair
// (reviewed ref + finding title).
//
// SINCE 123 NOTHING ROUTES HERE. `routeFinding` no longer answers `chore` for any input: a
// chore-shaped remedy is fixed at the close when question 2 finds it cheap enough, and otherwise
// handed back as a story shape the operator refines. This face therefore survives as an
// OPERATOR-reachable verb only — the same standing `work:promote-gap` has always had — and is kept
// rather than deleted because a person scheduling chore-shaped work off a review finding is a real
// act, and it is the one that carries the back-reference and the idempotence key. Every bound below
// stays load-bearing for exactly that caller.
//
// NO `/aof:` BUNDLE WRAPPER, by decision (ADR-004). A door would be a second entry point to an act
// whose whole discipline is ADR-003's ordered questions (five since 118/00), and the rule is the
// only thing between this milestone and the backlog `STATE.md` warns about. The verb stays
// reachable to a human who wants it; it is simply not advertised as a phase. `work:promote-gap`
// shipping without one is the precedent.
//
// THE LOOP NEVER CHOOSES A POSITION (ADR-009 §1). This face accepts no `at` and no `type`: the
// declared schema carries neither, and `run` REFUSES any input outside that set rather than ignoring
// it — the schema alone would not have done it, because `invoke` treats input schemas as advisory.
// So the position always resolves through the engine's append default and `shifted` is zero on the
// path the loop takes; a renumber mid-walk would invalidate every ref in flight. The OPERATOR's own
// `work:promote-gap --at <P>` is a delivered flag and keeps working — the two seams are separated
// here, where the claim is actually true.
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
//   milestone 71 / story 01 (ADR-003/ADR-004) — work:promote-finding is the SECOND face on the one
//   promotion engine (`src/work-promote/`): a review finding the loop declines to chase becomes a
//   top-level chore seeded from its own remedy. Deliberately NO `/aof:` bundle wrapper — a door would
//   be a second entry point to an act whose whole discipline is ADR-003's four ordered questions.
import { commandError } from "../command-error.mjs";
import { findingBackReference, NO_REGRESSION_ITEM } from "../work-promote/chore-seed.mjs";
// milestone 127 / ADR-003 §4/§5 — ONE IMPORT LINE MOVED, nothing else. `runInsertTopLevel` went with
// the mint to `promote.mjs`; this face keeps appending through `appendPosition` (71/ADR-003), and its
// `PROMOTED_TYPE` literal, its seed and its idempotence scan are untouched.
import { runInsertTopLevel } from "./promote.mjs";
import {
  appendPosition,
  findPromotedChore,
  PROMOTED_TYPE,
  promotionKey,
  seedPromotedChore,
  slugifyTitle,
} from "../work-promote/promotion.mjs";
import { listItemsCacheFirst } from "../work/read.mjs";

const required = (value) => typeof value === "string" && value.trim() !== "";

// The only inputs this face accepts, DERIVED from the declared schema below rather than listed
// twice: a property added there is accepted and one removed is refused, with nothing to keep in step
// by hand. (Assigned after the command literal, which is where the schema lives.)
const ACCEPTED_INPUTS = new Set();

export async function runPromoteFindingToChore(ctx, { ref, round, finding, yes, today } = {}) {
  const reviewedRef = typeof ref === "string" ? ref.trim() : "";
  const title = finding?.title;
  const remedy = finding?.remedy ?? "";
  const location = finding?.location ?? "";

  if (!required(reviewedRef)) {
    throw commandError("A reviewed item ref is required to promote a finding.", "promote-finding-invalid-ref", 400);
  }
  if (!required(title)) {
    throw commandError("A finding title is required to promote.", "promote-finding-invalid-title", 400);
  }
  if (!required(remedy)) {
    // The remedy IS the Definition of Done. Without one the chore is born with an empty `- [ ] ` box
    // — work scheduled with no close criterion — which is the same defect the gap face refuses a
    // blank `--discharge` for.
    throw commandError("A remedy is required to seed the chore's Definition of Done.", "promote-finding-invalid-remedy", 400);
  }
  if (!slugifyTitle(title)) {
    throw commandError(`finding title "${title}" does not yield a valid slug.`, "promote-finding-invalid-title", 400);
  }

  // The ref must RESOLVE. A back-reference naming an item that does not exist is a dangling citation
  // in the one record whose purpose is the trace back.
  //
  // ADR-005 (a) — CONTROL-SIDE. Classified at chore 110, which found this read in NEITHER of the
  // boundary gate's lists, and migrated it with the classification. The other two reads this
  // promotion makes are structural (c) and stay on disk, so the category is a property of the READ,
  // not of the promotion family:
  //   · `appendPosition` reaches through each row's `number` to place a folder it then creates HERE;
  //   · `findPromotedChore` reaches through each row's `dir` to read a real `CHORE.md` off this disk.
  // This read reaches through NEITHER. It asks two item-STATE questions — does the ref resolve, and
  // is it itself a chore (the depth bound below) — and `cacheOnlyItem` carries `type`, so both are
  // answerable for a ref this node's disk has never seen. Answering them from disk alone is the
  // false-finding class ADR-005 names: a finding raised reviewing a worker-authored item would be
  // refused on control as "does not resolve", and the depth bound would never get to state its own
  // reason. And it costs nothing on the path the loop actually takes — `isMeshWorktree` already pins
  // a materialised worktree to its own checkout, so there the cache-first read IS the disk read.
  const workDir = ctx.workspace.workDir;
  const items = await listItemsCacheFirst(ctx.workspace, {
    globalWorkStoreOptions: ctx.globalWorkStoreOptions ?? {},
  });
  const reviewed = items.find((item) => item.ref === reviewedRef);
  if (!reviewed) {
    throw commandError(`reviewed item "${reviewedRef}" does not resolve.`, "promote-finding-unknown-ref", 400);
  }

  // THE DEPTH BOUND (118/01). A chore is itself a reviewable driver, so a chore's own review pass
  // ran this same triage and emitted the next chore, with nothing capping the depth. Measured on
  // this repository 2026-09-05, six of the stream's chores — 110, 112, 113, 114, 115 and 117 — were
  // minted while reviewing another chore, and every one of them arrived through THIS verb.
  //
  // THE SECOND GATE, because the verb is reachable by hand. `routeFinding` is what the loop
  // consults, but a decider binds nobody who types the command, and the prose layer already failed
  // once. Two layers is the right number here for exactly that reason.
  //
  // IT DECIDES BEFORE THE IDEMPOTENCE SCAN, deliberately: a bound that can be crossed by having
  // already crossed it once is not a bound, and every one of the six would otherwise answer "already
  // promoted" and pass. 71/01's delivered idempotence criterion is untouched — it says a second
  // promotion of the same finding CREATES NOTHING, and a refusal creates nothing.
  //
  // THE LOOP'S FACE ONLY. `work:promote-gap` keeps its delivered `--at` and is not bound here
  // (71/ADR-009 §1): a person who wants the chore anyway types the gap face, exactly as today.
  //
  // The type it refuses is `PROMOTED_TYPE` itself, not a second spelling: the one type the loop may
  // CREATE is the one type it may not be promoted FROM, and both readings come from that constant.
  if (reviewed.type === PROMOTED_TYPE) {
    throw commandError(
      `reviewed item "${reviewedRef}" is itself a chore — a chore's review mints no chore. Fold the remedy into ${reviewedRef}'s own \`## Definition of Done\`, or hand it back to the operator, who can schedule it with \`aof work promote-gap\`.`,
      "promote-finding-reviewing-a-chore",
      400,
    );
  }

  // Idempotence on (reviewed ref + finding title), normalized for case and whitespace. A second
  // promotion of one finding creates nothing and reports the chore that already schedules it —
  // including when that chore has since been closed, because the work was already scheduled.
  const key = promotionKey(reviewedRef, title);
  const existing = await findPromotedChore(workDir, key);
  if (existing) {
    return { promoted: false, reason: "finding is already promoted", ref: reviewedRef, finding: { title }, chore: existing, shifted: 0 };
  }

  // No caller-chosen position ever reaches the insert engine from this face: the append position is
  // resolved here, from the stream itself, so `shifted` is zero on the path the loop takes.
  const at = await appendPosition(workDir);
  const insertResult = await runInsertTopLevel(ctx, { type: PROMOTED_TYPE, slug: slugifyTitle(title), at, yes: Boolean(yes), today });
  await seedPromotedChore(insertResult.created.dir, {
    definitionOfDone: [remedy, NO_REGRESSION_ITEM],
    backReference: findingBackReference({ ref: reviewedRef, round, title, location, key }),
  });

  return {
    promoted: true,
    ref: reviewedRef,
    round: round ?? null,
    finding: { title, location },
    chore: { ref: insertResult.created.ref, slug: insertResult.created.slug ?? slugifyTitle(title), dir: insertResult.created.dir },
    shifted: insertResult.shifted,
  };
}

export const promoteFindingToChoreCommand = {
  id: "work:promote-finding",
  input: {
    type: "object",
    properties: {
      ref: { type: "string" },
      title: { type: "string" },
      remedy: { type: "string" },
      location: { type: "string" },
      round: { type: ["number", "string"] },
      yes: { type: "boolean" },
      today: { type: "string" },
    },
    required: ["ref", "title", "remedy"],
    // No `type`, and no `at`: there is no property through which another item type or a caller-chosen
    // position could arrive, and an unknown one is refused rather than ignored (ADR-003's bounds).
    additionalProperties: false,
  },

  async run(input, ctx) {
    // THE CLOSED INPUT SET IS ENFORCED HERE, not left to the schema. `invoke` treats the input
    // schema as ADVISORY — it does not enforce `required`, and it does not enforce
    // `additionalProperties: false` either (the gap face's own `--discharge` guard exists for the
    // same reason). Without this, `{ type: "milestone" }` or `{ under: "71" }` would be silently
    // IGNORED and a chore created anyway, which is a weaker claim than ADR-003's: the loop must be
    // unable to be ASKED for another type or a parent, not merely unable to deliver one.
    const unknown = Object.keys(input ?? {}).filter((key) => !ACCEPTED_INPUTS.has(key));
    if (unknown.length > 0) {
      throw commandError(
        `unknown input(s) for work:promote-finding: ${unknown.join(", ")} — this verb creates a top-level chore and takes no type, parent or position.`,
        "promote-finding-unknown-input",
        400,
      );
    }
    const round = Number.parseInt(input.round, 10);
    return await runPromoteFindingToChore(ctx, {
      ref: input.ref,
      round: Number.isSafeInteger(round) ? round : null,
      finding: { title: input.title, remedy: input.remedy, location: input.location },
      yes: Boolean(input.yes),
      today: input.today,
    });
  },

  cli: {
    route: ["work", "promote-finding"],
    spec: {
      usage: 'aof work promote-finding <ref> "<finding title>" --remedy "…" [--location file:line] [--round N] [--yes] [--json]',
      flags: {
        remedy: { type: "string", description: "the remedy that becomes the chore's Definition of Done" },
        location: { type: "string", description: "the finding's file:line" },
        round: { type: "string", description: "the review round that raised it" },
        yes: { type: "boolean", description: "confirm without prompting" },
      },
    },
    argv: (positionals, options) => ({
      ref: positionals[0],
      title: positionals[1],
      remedy: options.remedy,
      location: options.location,
      round: options.round,
      yes: Boolean(options.yes || options.force),
    }),

    render(result) {
      if (!result.promoted) {
        return `Finding "${result.finding.title}" on ${result.ref} is already promoted — chore ${result.chore.ref} ("${result.chore.slug}").`;
      }
      return `Promoted finding "${result.finding.title}" on ${result.ref} to chore "${result.chore.slug}" at ${result.chore.ref} (shifted ${result.shifted} item(s)).`;
    },

    json: (result) => result,
  },
};

for (const key of Object.keys(promoteFindingToChoreCommand.input.properties)) ACCEPTED_INPUTS.add(key);
