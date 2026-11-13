// Composition of a member's texts from slots and practice fragments (milestone 192 / story 00).
//
// ADR-001 §6 — the ONE home of the slot grammar, the decision of what is on, the selection of a
// slot's fragments and the composition of one text. It is pure: it imports nothing and reads no
// file, no environment and no home directory (FF-19207). The loader (`bundle.mjs`) reads every
// text through the asset seam and hands this module strings.
//
// ADR-001 §1 — a slot is the line `<!-- slot:<name> -->`, alone on its line (leading spaces are
// allowed and mean nothing). A name is lower-case words joined by dots and hyphens. Any other line,
// however close to that shape, is ordinary text.
// ADR-001 §3 — a BLOCK slot (blank line above it, or first line) joins its fragments by one blank
// line and, with nothing on, takes the blank line above it with it; an INLINE slot (text above it)
// joins them by a newline and, with nothing on, removes only its own line.
// ADR-002 §3 — a fragment file may hold several bodies, each under `<!-- fragment:<slot> -->`; only
// blank lines at either end of a body are dropped, never a line's indentation.
// ADR-002 §4, §5 — order is declared position; a fragment may replace one of its own contributor's
// fragments in the same target and slot.
// ADR-003 §1, §3 — a practice is on when every key it names holds the boolean `true` in the
// config handed in; `practiceStates` is the one resolver.

const SLOT_LINE = /^ *<!-- slot:([a-z][a-z0-9]*(?:[.-][a-z][a-z0-9]*)*) -->$/u;
const FRAGMENT_LINE = /^<!-- fragment:([^\s>]+) -->$/u;

// The runtime key a member's common source is filed under, beside the runtimes of its authored
// variants. It is not a runtime name, so it can never collide with one.
export const COMMON = "common";

const stripCr = (line) => line.replace(/\r$/u, "");

// The slot named on one line, or null when the line is not a well-formed marker.
export function slotOnLine(line) {
  return SLOT_LINE.exec(stripCr(line))?.[1] ?? null;
}

// Every slot a text carries, in order of appearance (a repeat is listed twice).
export function slotsOf(text) {
  const source = String(text);
  if (!source.includes("<!-- slot:")) return [];
  return source.split("\n").map(slotOnLine).filter(Boolean);
}

// The names a text carries more than once (ADR-002 §6: refused at load).
export function repeatedSlots(text) {
  const seen = new Set();
  const repeated = new Set();
  for (const name of slotsOf(text)) (seen.has(name) ? repeated : seen).add(name);
  return [...repeated];
}

// Compose one text: each marker line is replaced by `bodiesFor(name)` (an array of strings), in
// the shape the line above it decides. Nothing else in the text changes.
export function composeText(text, bodiesFor = () => []) {
  const source = String(text);
  if (!source.includes("<!-- slot:")) return source;
  const lines = source.split("\n");
  const out = [];
  lines.forEach((line, index) => {
    const name = slotOnLine(line);
    if (name == null) {
      out.push(line);
      return;
    }
    const block = index === 0 || stripCr(lines[index - 1]).trim() === "";
    const bodies = (bodiesFor(name) ?? []).filter((body) => body !== "");
    if (bodies.length === 0) {
      if (block && index > 0) out.pop();
      return;
    }
    out.push(...bodies.join(block ? "\n\n" : "\n").split("\n"));
  });
  return out.join("\n");
}

// Drop blank lines at either end of a body; keep every other character, indentation included.
function trimBlankLines(lines) {
  let start = 0;
  let end = lines.length;
  while (start < end && stripCr(lines[start]).trim() === "") start += 1;
  while (end > start && stripCr(lines[end - 1]).trim() === "") end -= 1;
  return lines.slice(start, end).join("\n");
}

// The body a fragment file holds for one section. A file with no `<!-- fragment:… -->` line is one
// body; a file with them holds one body per line, and a missing section answers null.
export function fragmentSection(text, section) {
  const lines = String(text).split("\n");
  const heads = lines.map((line, index) => [FRAGMENT_LINE.exec(stripCr(line))?.[1], index]).filter(([name]) => name);
  if (heads.length === 0) return trimBlankLines(lines);
  const found = heads.findIndex(([name]) => name === section);
  if (found === -1) return null;
  const from = heads[found][1] + 1;
  const to = found + 1 < heads.length ? heads[found + 1][1] : lines.length;
  return trimBlankLines(lines.slice(from, to));
}

function valueAt(config, dotted) {
  let value = config;
  for (const key of String(dotted).split(".")) {
    if (value == null || typeof value !== "object" || !Object.hasOwn(value, key)) return undefined;
    value = value[key];
  }
  return value;
}

// ADR-003 §1, §3 — `Map<practiceId, boolean>`: on when every key holds the boolean true.
export function practiceStates(practices, config) {
  return new Map((practices ?? []).map((practice) => [
    practice.id,
    Array.isArray(practice.keys) && practice.keys.length > 0 && practice.keys.every((key) => valueAt(config ?? {}, key) === true),
  ]));
}

// The fragments that fill one slot of one target, in declared order, with every replaced fragment
// dropped while its replacer is on (ADR-002 §4, §5). `fragments` is already in declared order.
export function selectFragments(fragments, states, { target, slot }) {
  const on = fragments.filter((fragment) => fragment.target === target && fragment.slot === slot && states.get(fragment.practice) === true);
  const replaced = new Set(on.map((fragment) => fragment.replaces).filter(Boolean));
  return on.filter((fragment) => !replaced.has(fragment.id));
}

// The faults that stop a load (ADR-002 §6, §7). `practices` carry their `contributor`;
// `members` map `<kind>:<id>` to `{ contributor, texts: Map<runtimeKey, string[]> }`; `fragments`
// carry `contributor` and `bodies: Map<runtimeKey, string | null>` (null: the file or section is
// missing, with `problems` saying which). Every fault names what failed and the package it came from.
export function contributionFaults({ practices = [], members = new Map(), fragments = [] }) {
  const faults = [];
  const practiceIds = new Set();
  for (const practice of practices) {
    if (!Array.isArray(practice.keys) || practice.keys.length === 0) {
      faults.push(`Practice "${practice.id}" contributed by ${practice.contributor} declares no keys.`);
    }
    practiceIds.add(practice.id);
  }
  for (const [target, member] of members) {
    for (const [runtime, texts] of member.texts) {
      for (const text of texts) {
        for (const slot of repeatedSlots(text)) {
          faults.push(`Bundle member "${target}" contributed by ${member.contributor} carries the slot "${slot}" more than once in its ${runtime} text.`);
        }
      }
    }
    faults.push(...memberSlotGaps(target, member));
  }
  const byId = new Map(fragments.map((fragment) => [fragment.id, fragment]));
  for (const fragment of fragments) {
    const label = `Fragment "${fragment.id}" contributed by ${fragment.contributor}`;
    if (!practiceIds.has(fragment.practice)) faults.push(`${label} names the practice "${fragment.practice}", which no bundle declares.`);
    const member = members.get(fragment.target);
    if (!member) {
      faults.push(`${label} names the target "${fragment.target}", which no bundle declares.`);
      continue;
    }
    const carriers = runtimesCarrying(member, fragment.slot);
    if (carriers.length === 0) {
      faults.push(`${label} names the slot "${fragment.slot}", which no text of ${fragment.target} carries.`);
      continue;
    }
    for (const runtime of carriers) {
      if (!fragment.bodies.has(runtime)) faults.push(`${label} has no ${runtime} body for the slot "${fragment.slot}", which the ${runtime} text of ${fragment.target} carries.`);
    }
    for (const [runtime, body] of fragment.bodies) {
      if (!carriers.includes(runtime)) {
        faults.push(`${label} has a ${runtime} body for the slot "${fragment.slot}", which no ${runtime} text of ${fragment.target} carries.`);
      } else if (body == null) {
        faults.push(`${label}: ${fragment.problems?.get(runtime) ?? `its ${runtime} body cannot be read`}.`);
      }
    }
    if (fragment.replaces != null) {
      const other = byId.get(fragment.replaces);
      if (!other) faults.push(`${label} replaces "${fragment.replaces}", which is not a declared fragment.`);
      else if (other.contributor !== fragment.contributor) faults.push(`${label} replaces "${other.id}", contributed by ${other.contributor}: a fragment may replace only its own package's.`);
      else if (other.target !== fragment.target || other.slot !== fragment.slot) faults.push(`${label} replaces "${other.id}", which fills ${other.target} slot "${other.slot}", not ${fragment.target} slot "${fragment.slot}".`);
    }
  }
  return faults;
}

// The runtime keys whose texts carry a slot.
export function runtimesCarrying(member, slot) {
  return [...member.texts].filter(([, texts]) => texts.some((text) => slotsOf(text).includes(slot))).map(([runtime]) => runtime);
}

// ADR-002 §7 — every slot of a member's common source is in each authored variant's texts.
export function memberSlotGaps(target, member) {
  const common = member.texts.get(COMMON) ?? [];
  const slots = new Set(common.flatMap(slotsOf));
  const gaps = [];
  for (const [runtime, texts] of member.texts) {
    if (runtime === COMMON) continue;
    const carried = new Set(texts.flatMap(slotsOf));
    for (const slot of slots) {
      if (!carried.has(slot)) gaps.push(`Bundle member "${target}" contributed by ${member.contributor} carries the slot "${slot}" in its common source but not in its ${runtime} text.`);
    }
  }
  return gaps;
}
