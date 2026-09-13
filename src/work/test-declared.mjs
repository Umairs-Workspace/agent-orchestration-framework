// THE DECLARED CHANGED SET — milestone 96 / story 03, ADR-007 §1, §2, §4. FF-9604 is its control.
//
// Milestone 72 shipped the selector and ONE changed-set producer: `src/work/test-changed.mjs`,
// which reads the set from git. This module is a SECOND PRODUCER beside it, never a second
// selector — `selectSuites` is called unchanged, and ADR-007 §1 is explicit that what 96/03 adds
// is an input. A second selection authority is the failure 72's module exists to prevent, rebuilt
// beside it: two authorities agree until the day the assembly changes and only one notices, and
// the agent holding the wrong subset has been told a falsehood in the shape of an answer.
//
// THE INPUT IS THE STORY'S OWN `files:`, AND IT IS THE RIGHT ONE BECAUSE IT ALREADY PAYS TWICE.
// It is machine-readable, `validate` already holds it to account, and `ready-wave.mjs` already
// consumes it to partition a wave. This makes it pay a third time. It must not come from prose,
// and it must not be enumerated at refine: the architect cannot name the test files the developer
// is about to write, which is exactly why §3's widening invariant is what makes this safe.
//
// IT IS READ THROUGH THE SHIPPED PARSER AND THROUGH NOTHING ELSE. `storyContractList` +
// `resolveStoryContractPath` decide what an entry means — a block list, an inline list, a trailing
// YAML comment, an anchored citation, a backslash path. There are three homes for that declaration
// today and a fourth READER is how they start to disagree about a comment on an entry. So this
// module contains no regex over frontmatter and no parse of its own; every quirk below is
// INHERITED rather than re-decided.
//
// THE RESOLVER IS INJECTED (72/01's idiom, and the layer gate's requirement). Turning a ref into an
// item is `src/commands/resolve.mjs`'s job, and the command layer cannot be imported upward from
// here. The caller hands in `resolve`; this module never guesses at a ref, and the EXACT resolver
// is what the caller must supply — a slug fallback would run a near-miss story's suites, which is
// the silent-wrong-answer species the whole selection family refuses.
//
// FIVE REFUSALS, FIVE DIFFERENT REPAIRS. None of them is a widening reason — nothing about the
// tree became known — and none of them is an empty changed set handed on, because an answer that
// selected nothing must never be mistaken for an answer that found nothing affected.
import { readFile } from "node:fs/promises";
import path from "node:path";

import { namesBackslashPath, resolveStoryContractPath, storyContractList } from "../story-contract.mjs";

// The ref named no item at all — a typo, a deleted story, or a near-miss for a real story's slug.
// It is a refusal naming the ref, never an empty changed set: an empty set renders as "nothing
// affected" and selects nothing, which is the maximal silent narrowing.
export const STORY_REF_UNRESOLVABLE = "story-ref-unresolvable";
// The ref resolved, but not to a story. Only a story declares `files:`; a milestone, chore, spike
// or uat has no write set to read, and answering "empty" for one would report a well-formed item
// as an empty declaration.
export const STORY_REF_NOT_A_STORY = "story-ref-not-a-story";
// The story resolved but its record is not on this node, or could not be read. Distinct from an
// empty declaration: the repair is to fetch or fix the record, not to write a declaration.
export const STORY_RECORD_UNREADABLE = "story-record-unreadable";
// The story declares no write set, or declares an empty one. The repair is to declare it. Kept
// APART from the selector's own `changed-set-empty` so "this story declares nothing" is never read
// as "nothing has changed" — three words apart, two completely different repairs.
export const DECLARED_SET_EMPTY = "declared-set-empty";
// The declaration is present but does not parse, or an entry does not resolve to a project file.
// The parser's own rule is carried in the message rather than restated: a second wording for one
// situation is a second vocabulary.
export const DECLARED_SET_MALFORMED = "declared-set-malformed";

export const DECLARED_REFUSAL_CODES = Object.freeze([
  STORY_REF_UNRESOLVABLE,
  STORY_REF_NOT_A_STORY,
  STORY_RECORD_UNREADABLE,
  DECLARED_SET_EMPTY,
  DECLARED_SET_MALFORMED,
]);

// A story's record document. A `--story` ref that resolves to anything else is refused above, so
// this is the only record this module ever reads.
const STORY_RECORD = "STORY.md";

const refusal = (code, message, detail = null) => Object.freeze({ ok: false, code, message, detail });

// THE DECLARED CHANGED SET. Returns `{ ok: true, changed, ref }` or a coded refusal.
//
//   projectRoot — the repository root every declared path is relative to
//   ref         — the story ref, resolved EXACTLY by the injected resolver and never by slug
//   resolve     — `(ref) => item | null`, the caller's exact resolver (see the header)
//   read        — the record read, injected so every row of the contract drives without a repo
//
// NO GIT IS INVOKED on this path, and that is the point: the declaration is already on disk and
// already checked, so the set costs one file read rather than two bounded children.
export async function declaredChangedFiles({ projectRoot, ref, resolve, read = readFile } = {}) {
  const named = typeof ref === "string" ? ref.trim() : "";
  if (named === "") {
    return refusal(STORY_REF_UNRESOLVABLE, "no story ref was given, so there is no declaration to read.");
  }

  const item = await resolve(named);
  if (item == null) {
    return refusal(
      STORY_REF_UNRESOLVABLE,
      `"${named}" does not resolve to an item, so there is no declared write set to select from. This is a refusal rather than an empty changed set: an empty set selects nothing and would render as "nothing affected", and a ref is resolved EXACTLY here — a near-miss for another story's slug runs no story's suites.`,
    );
  }

  if (item.type !== "story") {
    return refusal(
      STORY_REF_NOT_A_STORY,
      `"${named}" resolves to a ${item.type ?? "item"}, and only a story declares a write set. Name the story whose \`files:\` should scope the run.`,
    );
  }

  if (typeof item.dir !== "string" || item.dir.length === 0) {
    return refusal(
      STORY_RECORD_UNREADABLE,
      `"${named}" has no local checkout on this node — it resolves from the mesh cache, so its record is not here to read. Run this where the story lives, or bring it home first.`,
    );
  }

  let text;
  try {
    text = await read(path.join(item.dir, STORY_RECORD), "utf8");
  } catch (error) {
    return refusal(
      STORY_RECORD_UNREADABLE,
      `"${named}" resolves to ${item.dir}, but its ${STORY_RECORD} could not be read, so its declaration is unknown — and an unknown declaration is not an empty one.`,
      error?.message ?? null,
    );
  }

  // THE PARSER, NOT A PARSE. Everything the declaration's shape can mean is decided here, once,
  // by the module `validate` and `ready-wave` already read it with.
  const declaration = storyContractList(text, "files");

  if (declaration.malformed) {
    return refusal(
      DECLARED_SET_MALFORMED,
      `story ${item.ref ?? named} declares a \`files:\` set that does not parse — an inline list that never closes, or a block entry that is not a \`- \` member. Fix the declaration; \`aof work validate ${item.ref ?? named}\` names the line.`,
    );
  }

  if (!declaration.present || declaration.values.length === 0) {
    return refusal(
      DECLARED_SET_EMPTY,
      `story ${item.ref ?? named} declares no write set${declaration.present ? " (its `files:` is empty)" : ""}, so there is nothing to select from. A story that writes no project file has no impacted suites to derive; declare the set, or ask for \`--scope all\`.`,
    );
  }

  const changed = new Set();
  for (const entry of declaration.values) {
    // NAMED BEFORE THE RESOLVER, exactly as `validate` names it — a backslash path resolves on
    // Windows and names one impossible file everywhere else, so the same story would select here
    // and red on the Mac or the WSL node. The rule and its wording are the parser's.
    if (namesBackslashPath(entry)) {
      return refusal(
        DECLARED_SET_MALFORMED,
        `story ${item.ref ?? named} entry "${entry}" must use forward slashes so it resolves on every node.`,
      );
    }
    const resolved = resolveStoryContractPath(entry, { storyDir: item.dir, projectRoot });
    if (resolved == null) {
      return refusal(
        DECLARED_SET_MALFORMED,
        `story ${item.ref ?? named} entry "${entry}" does not resolve to a file inside this project, so it cannot name a changed file.`,
      );
    }
    // AN ANCHORED ENTRY NAMES A SECTION, NOT A FILE — the parser's own distinction, and `validate`
    // treats an anchored WRITE as that story's finding rather than a path. A `files:` set should
    // carry none; one that does is a declaration problem, not a file to hand the selector.
    if (resolved.anchor != null) {
      return refusal(
        DECLARED_SET_MALFORMED,
        `story ${item.ref ?? named} entry "${entry}" names a document section rather than a file, and a write set names files.`,
      );
    }
    changed.add(resolved.projectPath);
  }

  return Object.freeze({ ok: true, changed: Object.freeze([...changed].sort()), ref: item.ref ?? named });
}
