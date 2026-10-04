import path from "node:path";
import { readFile } from "node:fs/promises";

// milestone 124 / story 00 (ADR-003 §1/§3) — THE SHARED HOME, adopted. The resolution of a
// declared key (its `present`/`malformed` answer, the untouched-scaffold rule and the
// unresolvable-entry poison) and the coverage question both live on the pure leaf now; this
// module holds neither a second copy. What it keeps is the one rule that is genuinely ITS
// OWN — `collisionKey` below.
import { contractSetCovers, resolveDeclaredSet } from "./story-contract.mjs";
import { nextWork } from "./readiness.mjs";
import { listItems } from "./discovery.mjs";
import { readItemMeta } from "./records.mjs";
import { siblingGate, storiesByParent } from "./dependencies.mjs";

function collisionKey(projectPath) {
  // A false overlap only serialises work; a missed case-only overlap can corrupt it on a
  // case-insensitive checkout. Case-folding is therefore the safe cross-node rule.
  //
  // AND IT STAYS HERE rather than moving into the shared predicate (ADR-003 §3). The census
  // that now shares that predicate is reporting on DECLARATIONS and wants them compared as
  // written; this module is protecting a DISK from two writers, where a case-only difference
  // is the same file on win32 and macOS. One rule, folded at the one call site that needs it.
  return projectPath.replaceAll("\\", "/").toLowerCase();
}

async function declaredWriteSet(member, { projectRoot, readText }) {
  if (member?.type !== "story" || typeof member.path !== "string") return null;
  const storyDir = path.resolve(member.path);
  let text;
  try {
    text = await readText(path.join(storyDir, "STORY.md"), "utf8");
  } catch {
    return null;
  }

  // `entries: null` is the shared resolver's UNKNOWN — an absent key, a malformed one, an
  // untouched scaffold, or a single entry nothing could resolve. Every one of those reaches
  // the conservative branch below exactly as it did before this adoption.
  const declared = resolveDeclaredSet(text, "files", { storyDir, projectRoot });
  if (declared.entries == null) return null;
  // The authored directory intent rides through the fold, because it is what the coverage
  // predicate reads; only the PATH is case-folded.
  return declared.entries.map((entry) => ({ path: collisionKey(entry.path), directory: entry.directory }));
}

// Greedy, stable partition over nextWork's already-deterministic readySet. The earliest
// member wins each collision. Unknown write sets are conservative: first runs alone;
// otherwise they are held. The original readySet is never reordered or reduced.
//
// 145 — WHY each member was held rides beside the two sets as `heldReasons`, recorded where each
// hold is decided: `files-overlap` (naming the wave members it collides with), `write-set-unknown`
// (its own `files:` is unknown), or `after-unknown` (a member with an unknown write set took the
// wave). `work:next` reads only `wave` and `heldSet`, so its answer is unchanged; the loop plan
// below is the reader the reasons exist for.
export async function partitionReadySetByDeclaredFiles(readySet, options = {}) {
  const candidates = Array.isArray(readySet) ? readySet : [];
  const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
  const readText = options.readText ?? readFile;
  const wave = [];
  const heldSet = [];
  // The claimed entries of every member already in the wave, kept as RESOLVED ENTRIES rather
  // than as a `Set` of strings: a `Set` can only answer equality, and equality is the exact
  // reading that let a story declaring `files: [src/commands/]` and a sibling declaring
  // `src/commands/test.mjs` into one wave, where they collide on disk (ADR-003's live defect).
  const occupied = [];
  // Each wave member's own claims, so a `files-overlap` hold can name who it collides with.
  const claims = [];
  const heldReasons = [];
  const hold = (member, reason, overlaps) => {
    heldSet.push(member);
    heldReasons.push({ ref: member?.ref ?? null, reason, ...(overlaps ? { overlaps } : {}) });
  };
  let unknownSelected = false;
  const writeSets = await Promise.all(
    candidates.map((member) => declaredWriteSet(member, { projectRoot, readText })),
  );

  for (let index = 0; index < candidates.length; index += 1) {
    const member = candidates[index];
    const writes = writeSets[index];
    if (writes == null) {
      if (wave.length === 0) {
        wave.push(member);
        unknownSelected = true;
      } else {
        hold(member, "write-set-unknown");
      }
      continue;
    }

    // THE COLLISION TEST IS THE SHARED PREDICATE, ASKED BOTH WAYS. Coverage is directional —
    // an authored directory covers what sits beneath it, and a file covers no directory — but
    // a write/write collision is not: whichever side authored the directory, two builders are
    // pointed at one path. Two calls to ONE predicate, never a second rule.
    const collides = (claimed) => writes.some((entry) => contractSetCovers(claimed, entry))
      || claimed.some((entry) => contractSetCovers(writes, entry));
    if (unknownSelected) {
      hold(member, "after-unknown");
      continue;
    }
    if (collides(occupied)) {
      hold(member, "files-overlap", claims.filter((claim) => collides(claim.writes)).map((claim) => claim.ref));
      continue;
    }
    wave.push(member);
    claims.push({ ref: member?.ref ?? null, writes });
    for (const entry of writes) occupied.push(entry);
  }

  return { wave, heldSet, heldReasons };
}

// ───────────────────────────────────────────────────────── the loop plan (145) ────
//
// THE PLAN IS REPLAYED, NEVER RE-DERIVED. Under `refine_first` the loop builds a milestone by
// asking `nextWork(…, { throughReview: true })` and partitioning each `readySet` above. The plan
// asks the SAME two functions over a `view` overlay — the driver in progress with its own
// `depends:` met, every story not started — and marks each wave's members `in-review` before the
// next ask, until nothing is ready. No readiness or collision rule is spelled here.
//
// A story's REAL status decides only whether it is shown as built (145 Q1: the whole milestone,
// built work shaded). The lane bound is the loop's own, handed in; a member past it waits for a
// lane. Read-only: nothing here writes.
export const LOOP_PLAN_ASSUMPTION = "The live loop asks again as each lane finishes, not once per wave: these waves are the order only if every lane in a wave finishes together.";

// Built for the plan's shading: the build contract is met at the Review gate (the loop's own
// `throughReview` reading), so an in-review story is drawn as built beside a done one.
const isBuilt = (status) => status === "in-review" || status === "done";

export async function planLoopWaves(workDir, driverRef, { projectRoot, bound = null, readText } = {}) {
  // The walk is over live rows (`isLiveStreamRow`, the one reader of the archive flag), so an
  // archived milestone plans no wave: its stories come back `unplanned`.
  const items = await listItems(workDir);
  const sameNumber = (a, b) => a != null && b != null && Number.parseInt(a, 10) === Number.parseInt(b, 10);
  const driver = items.find((item) => item.parent == null && item.number != null && String(item.ref) === String(driverRef));
  if (driver == null) return null;
  const isMember = (item) => item.type === "story" && item.number != null && sameNumber(item.parent, driver.number);
  const stories = items.filter(isMember).sort((a, b) => Number.parseInt(a.number, 10) - Number.parseInt(b.number, 10));
  const byRef = new Map(stories.map((story) => [story.ref, story]));

  const real = new Map();
  for (const story of stories) real.set(story.ref, await readItemMeta(story));
  const meta = new Map([[driver.ref, { status: "in-progress", depends: [] }]]);
  for (const story of stories) meta.set(story.ref, { status: "not-started" });
  const view = { items, meta };
  const scope = String(Number.parseInt(driver.number, 10));

  const memberOf = (story, index) => {
    const status = real.get(story.ref)?.status ?? null;
    return {
      ref: story.ref,
      slug: story.slug,
      status,
      built: isBuilt(status),
      ...(Number.isInteger(bound) && index >= bound ? { waitsForLane: true } : {}),
    };
  };

  const waves = [];
  // The wave each story was planned into, by ref.
  const planned = new Map();
  for (;;) {
    const answer = await nextWork(workDir, scope, { view, throughReview: true });
    const readySet = (answer.readySet ?? []).filter((member) => byRef.has(member.ref) && !planned.has(member.ref));
    if (readySet.length === 0) break;
    const { wave, heldReasons } = await partitionReadySetByDeclaredFiles(readySet, { projectRoot, readText });
    // A wave that adds nothing cannot advance the replay; stop rather than ask forever.
    if (wave.length === 0) break;
    waves.push({ wave: waves.length + 1, members: wave.map((member, index) => memberOf(byRef.get(member.ref), index)), held: heldReasons });
    for (const member of wave) {
      planned.set(member.ref, waves.length);
      meta.set(member.ref, { status: "in-review" });
    }
  }

  const siblings = storiesByParent(items).get(scope) ?? stories;
  const edges = [];
  for (const story of stories) {
    for (const from of siblingGate(real.get(story.ref)?.depends, story, siblings).unmet) edges.push({ from, to: story.ref });
  }

  return {
    item: driver.ref,
    bound: Number.isInteger(bound) ? bound : null,
    assumption: LOOP_PLAN_ASSUMPTION,
    waves,
    edges,
    // A story the replay never reached — a `depends:` cycle — is reported, never dropped.
    unplanned: stories.filter((story) => !planned.has(story.ref)).map((story) => story.ref),
  };
}
