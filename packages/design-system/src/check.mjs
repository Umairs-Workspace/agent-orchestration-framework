// packages/design-system/src/check.mjs — a system's tokens against the code's (198/ADR-003 §1, ADR-007).
//
// `tokenFaults(system)` says why a tokens.json is not one this check can read; `compareTokens(system,
// code)` answers the drift between a system's tokens and the tokens `readTokens` printed from the
// code. Both are pure: the verb layer reads the files.
//
// What counts as drift (198/01 Q8): a value that differs in any theme, compared as text with its
// whitespace collapsed, and a token only one side holds. Usage notes, `meta`, `name` and `version`
// are the system's own, never compared, so a re-sync keeps them.

// The families compared, each with the list it holds its tokens in.
const LIST_FAMILIES = Object.freeze(["color", "spacing", "radius", "shadow"]);
// A type style's fields that are values, and so are compared.
const STYLE_FIELDS = Object.freeze(["fontSize", "lineHeight", "letterSpacing", "fontWeight"]);

const isPlainObject = (value) => value != null && typeof value === "object" && !Array.isArray(value);
const collapse = (value) => (value == null ? null : String(value).replace(/\s+/g, " ").trim());

/**
 * Why a parsed tokens.json cannot be compared, as messages; empty when it can. A family the file
 * holds must keep its tokens in a list of `{ name, ... }` entries: a DTCG name-to-value map is valid
 * JSON the Design System cannot read either.
 */
export function tokenFaults(system) {
  if (!isPlainObject(system)) return ["it is not a JSON object"];
  const faults = [];
  const listAt = (label, list) => {
    if (!Array.isArray(list)) faults.push(`the family "${label}" is not a list of {name, value, usage} entries`);
    else if (list.some((token) => !isPlainObject(token) || typeof token.name !== "string")) faults.push(`the family "${label}" holds an entry with no "name"`);
  };
  for (const family of LIST_FAMILIES) {
    if (system[family] !== undefined) listAt(family, isPlainObject(system[family]) ? system[family].tokens : undefined);
  }
  if (system.type !== undefined) {
    if (!isPlainObject(system.type)) faults.push(`the family "type" is not a list of {name, value, usage} entries`);
    else {
      // The type's shape (198 F-02): a map of family key to font stack, as the page reads it.
      if (system.type.families !== undefined && !(isPlainObject(system.type.families) && Object.values(system.type.families).every((stack) => typeof stack === "string"))) {
        faults.push(`the family "type.families" is not a map of family keys to font stacks`);
      }
      if (system.type.groups !== undefined) {
        if (!Array.isArray(system.type.groups)) faults.push(`the family "type.groups" is not a list of groups`);
        else system.type.groups.forEach((group, index) => listAt(`type.groups[${index}].styles`, isPlainObject(group) ? group.styles : undefined));
      }
    }
  }
  return faults;
}

// Every comparable value of a token set, keyed `<family>/<name>` → { family, name, values: Map<at, v> }.
// `at` is a colour's theme, a type style's field, or "value". A colour written as a bare string is
// read as the first theme's value.
function entriesOf(tokens) {
  const entries = new Map();
  const add = (family, name, at, value) => {
    const key = `${family}/${name}`;
    const entry = entries.get(key) ?? { family, name, values: new Map() };
    if (at != null) entry.values.set(at, collapse(value));
    entries.set(key, entry);
  };
  const firstTheme = tokens?.color?.themes?.[0]?.id ?? "light";
  for (const token of tokens?.color?.tokens ?? []) {
    if (isPlainObject(token.value)) {
      add("color", token.name, null);
      for (const [theme, value] of Object.entries(token.value)) add("color", token.name, theme, value);
    } else add("color", token.name, firstTheme, token.value);
  }
  for (const family of ["spacing", "radius", "shadow"]) {
    for (const token of tokens?.[family]?.tokens ?? []) add(family, token.name, "value", token.value);
  }
  for (const [key, stack] of Object.entries(isPlainObject(tokens?.type?.families) ? tokens.type.families : {})) add("type.families", key, "value", stack);
  for (const group of tokens?.type?.groups ?? []) {
    for (const style of group?.styles ?? []) {
      add("type.styles", style.name, null);
      for (const field of STYLE_FIELDS) if (style[field] !== undefined) add("type.styles", style.name, field, style[field]);
    }
  }
  return entries;
}

/**
 * The drift between a system's tokens and the code's: `{ changed, added, missing, drift }`.
 * `changed` holds `{ family, name, theme | field, system, code }` — a value one side lacks is null;
 * `added` the tokens only the code holds, `missing` those only the system holds, each `{ family, name }`.
 */
export function compareTokens(system, code) {
  const ours = entriesOf(system);
  const theirs = entriesOf(code);
  const changed = [];
  const added = [];
  const missing = [];
  for (const [key, entry] of ours) {
    const other = theirs.get(key);
    if (!other) { missing.push({ family: entry.family, name: entry.name }); continue; }
    const ats = [...new Set([...other.values.keys(), ...entry.values.keys()])];
    for (const at of ats) {
      const mine = entry.values.get(at) ?? null;
      const yours = other.values.get(at) ?? null;
      if (mine === yours) continue;
      const where = entry.family === "color" ? { theme: at } : entry.family === "type.styles" ? { field: at } : {};
      changed.push({ family: entry.family, name: entry.name, ...where, system: mine, code: yours });
    }
  }
  for (const [key, entry] of theirs) {
    if (!ours.has(key)) added.push({ family: entry.family, name: entry.name });
  }
  return { changed, added, missing, drift: changed.length + added.length + missing.length > 0 };
}
