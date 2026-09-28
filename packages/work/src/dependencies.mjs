// Pure dependency rules and text transforms shared by validation and readiness.
import { sameNumber as sameNum } from "./identity.mjs";

// Top-level "drivers" of the stream — items that sit at the root, carry
// `depends`, and participate in ordering/gating (milestones and uat sessions,
// and — milestone 37 / ADR-001 — spike and chore: same shape, they group no
// stories and are themselves the actionable unit).
export const isDriver = (item) =>
  item.type === "milestone" || item.type === "uat" || item.type === "spike" || item.type === "chore";

// …and the set a `depends:` NUMBER may name, which is deliberately WIDER: a parentless story
// is a first-class top-level item, so `depends: [79]` naming one is a real edge. Written once
// and SHARED by every reader of that question — `validate` and the readiness walk disagreeing
// about which numbers resolve is how one reports a satisfied edge the other scores unmet.
// Separate from `isDriver` (which gates readiness and scheduling) on purpose: what a number
// can NAME and what drives a PHASE are different questions.
//
// EXPORTED (chore 104) because "written once and SHARED" was not reachable while it was a
// module-local `const`. `validate` and the readiness walk originally shared a file and adopted it;
// doctor's coherence lane — the THIRD reader of the same question — could not share it even had
// it known to, so it kept asking `isDriver` and scored milestone 78's already-satisfied edge on
// the parentless story 79 as unmet. The doctor family takes it through the spine's re-export
// (`work-doctor.mjs`), which is how those lanes already receive item identity.
export const isDependTarget = (item) => isDriver(item) || (item.type === "story" && item.parent == null);

export const asList = (value) => (Array.isArray(value) ? value : value == null || value === "" ? [] : [value]);

// ───────────────────────── milestone 65 / story 00 — A STORY'S `depends` IS DATA ────
//
// THE PROBLEM IT CURES, measured (65/RESEARCH.md). `depends` used to be built and
// validated only `if (isDriver(item))`, so a story's `depends` parsed and was discarded
// by BOTH readers. Story independence therefore lived only as italic prose in a
// milestone SPEC (`*(depends 00, 01)*`) and as ARCHITECTURE.md partition sections —
// nothing a command could read. With nothing recording what may safely run at once,
// one-at-a-time was the only SAFE order available, and vista-app-web's milestone 352
// paid 10h11m of a 25h12m span for it (six developer builds at 1.00× concurrency).
//
// A STORY'S `depends` NAMES A SIBLING — a story under the SAME parent — never a driver.
// Two spellings are accepted, and both mean the same edge:
//   · the bare two-digit sibling number, `depends: [00]`;
//   · the full ref, `depends: [40/01]`, whose milestone part MUST equal this story's
//     own parent. This spelling is not a concession: it is what every one of the twenty
//     story records already in this repo authors (`43/06 → [43/02, 43/03, 43/04]`), so
//     reading only the bare form would have flagged twenty correct records as dangling.
// A full ref naming ANOTHER milestone resolves to null — the edge is keyed WITHIN the
// parent, so a sibling number can never collide with a driver number.
//
// Returns the sibling's NUMBER (as authored text, compared with `sameNum`), or null when
// the text names something that is not a sibling of `parentNumber`. What each reader then
// DOES with a null is the whole design, and the two answers differ deliberately (the
// `next`/`item-lock` idiom, src/commands/next.mjs:8-14): `nextWork` IGNORES it, because a
// typo must never strand a milestone; `validateWork` REPORTS it, because a bad edge that
// nothing surfaces is how the typo survives. One rule, two renderings.
export function siblingDependencyNumber(dep, parentNumber) {
  const raw = String(dep ?? "").trim();
  if (raw === "") return null;
  const pair = raw.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (pair) return sameNum(pair[1], parentNumber) ? pair[2] : null;
  return /^\d+$/.test(raw) ? raw : null;
}

// siblingGate(depends, story, siblings, statusOf) — one story's sibling edges, split into
// the two facts the two readers need: `unmet` (edges that resolve to a sibling that is not
// `done` — this story WAITS) and `unresolved` (edges that name no sibling at all).
// `statusOf(siblingItem)` is injected so `nextWork` can feed it the cache-overlaid status
// it already read, and `validateWork` — which only needs resolution — can ignore it.
export function siblingGate(depends, story, siblings, statusOf = () => null) {
  const unmet = [];
  const unresolved = [];
  for (const dep of asList(depends)) {
    const number = siblingDependencyNumber(dep, story.parent);
    const sibling = number == null ? null : siblings.find((candidate) => sameNum(candidate.number, number));
    if (sibling == null) {
      unresolved.push(String(dep));
      continue;
    }
    if (statusOf(sibling) !== "done") unmet.push(sibling.ref);
  }
  return { unmet, unresolved };
}

// storiesByParent(items) — the sibling index both readers resolve edges against, built
// once from the item set. Keyed by the parent's NUMERIC value (so "03" and "3" are one
// milestone), which is what makes "keyed within the parent" a property of the index
// rather than a rule each caller re-spells.
export function storiesByParent(items) {
  const byParent = new Map();
  for (const item of items) {
    if (item.type !== "story" || item.parent == null || item.parent === "") continue;
    const key = String(Number.parseInt(item.parent, 10));
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(item);
  }
  for (const siblings of byParent.values()) {
    siblings.sort((a, b) => Number.parseInt(a.number, 10) - Number.parseInt(b.number, 10));
  }
  return byParent;
}

// ------------------------------------------------------ depends entries --

// THE ONE NUMBER/SLUG SPLIT (story 139). A `depends:` entry, as `parseFrontmatter` hands it
// (quotes and surrounding spaces stripped), is a NUMBER iff it is all digits; anything else is a
// slug. Three readers ask the question — the shift's rewriter (`src/work/reindex.mjs`), promote's
// classifier and validate's numbered path below — and they asked it two ways until a backlog
// held slug edges: `/^\d+$/` in promote, `Number.parseInt` in the other two, which reads
// `10x-faster` as 10. One predicate, so a digit-led slug is a slug everywhere.
export const isDependNumber = (entry) => /^\d+$/.test(String(entry ?? ""));

// rewriteRefEntry(token, map) — ONE ref entry (of an inline `depends:` list, or the `parent:` scalar), rewritten
// through the caller's `map(core) -> replacement | null`, where `core` is the entry with its
// surrounding spacing and one quote pair stripped. `null` leaves the entry byte-identical. A
// rewritten entry keeps its own spacing and quotes, and a zero-padded NUMBER keeps its ORIGINAL
// width (`010` → `011`, never `11`). Only a number has a width to keep: a slug may start `0<digit>`
// too (`007-bond`), and its replacement is the minted ref as spelled, never padded to the slug's
// length. No arithmetic happens here: the mapping is the caller's — the shift's `old → old + 1`,
// promote's `slug → minted ref`.
export function rewriteRefEntry(token, map) {
  const leading = (token.match(/^\s*/) ?? [""])[0];
  const trailing = (token.match(/\s*$/) ?? [""])[0];
  const core = token.slice(leading.length, token.length - trailing.length);
  const quoted = core.match(/^(["'])([\s\S]*)\1$/);
  const quote = quoted ? quoted[1] : "";
  const raw = quoted ? quoted[2] : core;
  const replacement = map(raw);
  if (replacement == null) return { text: token, changed: false };
  const value = String(replacement);
  const padded = isDependNumber(raw) && /^0\d/.test(raw) && isDependNumber(value) ? value.padStart(raw.length, "0") : value;
  return { text: `${leading}${quote}${padded}${quote}${trailing}`, changed: true };
}

// rewriteDependsEntries(text, map) — the SURGICAL `depends: [a, b]` rewrite of one record doc's
// text, per entry through `rewriteRefEntry`: only the entries the map answers for change, and
// every other byte — the other entries, the line's own spacing, every other frontmatter line, the
// body, the line endings — is reassembled untouched (41/ADR-001, 18/ADR-007: no `parseFrontmatter`
// round-trip). Only the inline-list form is rewritten, as the shift always has. Returns the text
// unchanged (the same string) when nothing matched, so `=== text` is the "wrote nothing" test.
export function rewriteDependsEntries(text, map) {
  const block = String(text ?? "").match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (!block) return text;
  const rewritten = block[2].replace(/^(depends:[ \t]*\[)([^\]]*)(\].*)$/m, (whole, prefix, inner, suffix) => {
    let changed = false;
    const parts = inner.split(",").map((part) => {
      const entry = rewriteRefEntry(part, map);
      if (entry.changed) changed = true;
      return entry.text;
    });
    return changed ? `${prefix}${parts.join(",")}${suffix}` : whole;
  });
  if (rewritten === block[2]) return text;
  return block[1] + rewritten + block[3] + text.slice(block[0].length);
}
