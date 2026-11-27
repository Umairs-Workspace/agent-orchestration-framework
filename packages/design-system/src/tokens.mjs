// packages/design-system/src/tokens.mjs — the code's tokens, in the shape a Design System reads
// (198/ADR-003 §1, RESEARCH R3).
//
// `readTokens(files)` takes CSS text (`[{ file, text }]`, the verb layer reads the disk) and answers
// the token lists the Design System type's page reads: every family a LIST of `{ name, value, usage }`,
// a colour's value one entry per theme. It is a small declaration scanner, not a CSS library: it
// tracks the selector context (`@theme`, `:root`, a theme selector, anything else) and takes every
// `--x: v;` declaration. A value the type would drop is listed in `unplaced` with its file, line and
// reason, never silently lost.
//
// `mockOnly(tokens, mocks)` takes the exported mocks' text and lists every colour a mock paints that
// no code token holds, compared after both sides are normalised to RGBA (ADR-004 §2: code beats
// mocks, and a mock-only value is the operator's to accept or drop).
//
// `mergeTokens(system, code, { ref, paths })` is the Design System type's re-sync, as a function
// (198/03, ADR-007, RESEARCH R3): the code's values win, everything the page owns is kept, a token
// the code no longer declares is listed and then dropped, and the code's new tokens are appended in
// declaration order. Values compare as `check` compares them, whitespace collapsed, so a merged
// system checks clean against the code it came from.
//
// Pure: no file, no network (FF-19804). The rules each choice follows are 198/01's example map,
// Q1–Q5.

const FIRST_THEME = "light";

// ── the scanner ────────────────────────────────────────────────────────────────────────────────

// The text with every comment blanked to spaces, newlines kept, so a line number still counts.
function blankComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "));
}

// Every custom-property declaration in the text, each with the stack of block preludes it sits in
// (outermost first) and its 1-based line. Quotes and parentheses are tracked so a `;` or brace
// inside a string or a function never ends a statement.
function declarations(text) {
  const source = blankComments(text);
  const found = [];
  const stack = [];
  let start = 0;
  let depth = 0;
  let quote = null;
  const newlines = [];
  for (let at = source.indexOf("\n"); at !== -1; at = source.indexOf("\n", at + 1)) newlines.push(at);
  const lineAt = (index) => {
    let line = 1;
    while (line - 1 < newlines.length && newlines[line - 1] < index) line += 1;
    return line;
  };
  const statement = (from, to) => {
    const raw = source.slice(from, to);
    const match = /^\s*(--[^\s:]+)\s*:([\s\S]*)$/.exec(raw);
    if (!match) return;
    const offset = from + raw.indexOf(match[1]);
    found.push({ property: match[1], value: match[2].trim(), context: [...stack], line: lineAt(offset) });
  };
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "\"" || char === "'") { quote = char; continue; }
    if (char === "(") { depth += 1; continue; }
    if (char === ")") { depth = Math.max(0, depth - 1); continue; }
    if (depth > 0) continue;
    if (char === "{") {
      stack.push(source.slice(start, index).trim());
      start = index + 1;
    } else if (char === "}") {
      statement(start, index);
      stack.pop();
      start = index + 1;
    } else if (char === ";") {
      if (stack.length > 0) statement(start, index);
      start = index + 1;
    }
  }
  return found;
}

// ── themes and families ────────────────────────────────────────────────────────────────────────

const titleCase = (id) => id.split(/[-_]/).filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");

// The theme one selector names, or null when it names none (Q3).
function themeOfSelector(selector) {
  const text = selector.trim();
  if (/^@theme\b/.test(text) || text === ":root") return FIRST_THEME;
  if (text === ".dark") return "dark";
  const attribute = /^\[data-theme\s*=\s*(["']?)([\w-]+)\1\s*\]$/.exec(text);
  if (attribute) return attribute[2];
  const named = /^\.theme-([\w-]+)$/.exec(text);
  if (named) return named[1];
  return null;
}

// The theme a declaration sits in: its innermost block's, when every selector of that block's list
// names a theme (the first one named wins); null when the block is not a theme. Only `@layer` may
// wrap a theme: a `:root` inside `@media (prefers-color-scheme: dark)` or `@supports` holds values
// for a condition, and reading it as the light theme would overwrite the light values silently.
function themeOf(context) {
  const innermost = context.at(-1);
  if (innermost == null) return null;
  if (!context.slice(0, -1).every((outer) => /^@layer\b/.test(outer))) return null;
  if (/^@theme\b/.test(innermost)) return FIRST_THEME;
  const themes = innermost.split(",").map(themeOfSelector);
  return themes.length > 0 && themes.every((theme) => theme != null) ? themes[0] : null;
}

const TEXT_PARTS = Object.freeze({ "line-height": "lineHeight", "letter-spacing": "letterSpacing", "font-weight": "fontWeight" });

const VAR_ONLY = /^var\(\s*--([\w-]+)\s*\)$/;
// A value that is one colour and nothing else: a hex, or one colour function with no function inside.
const COLOUR_VALUE = /^(?:#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^()]*\))$/i;
// The name hints the Design System type's from-code step reads a length by.
const LENGTH_HINTS = Object.freeze([
  [/(?:^|-)(?:space|spacing|gap|pad|padding)(?:-|$)/, "spacing"],
  [/(?:^|-)(?:radius|rounded)(?:-|$)/, "radius"],
  [/(?:^|-)shadow(?:-|$)/, "shadow"],
]);

// The family a property belongs to (Q2, amended by 198 F-03), or null. Tailwind's namespaces place
// first, so `--color-*` and `--text-*` read as they always have; `--text-*` holding a colour is a
// colour. Any other name is read as the type's from-code step reads it: a colour by its value, a
// length by its name, and a bare `var()` as a colour alias that placement keeps only if it resolves.
function familyOf(property, value) {
  const name = property.slice(2);
  if (name.startsWith("color-")) return { family: "color", name };
  if (name === "radius" || name.startsWith("radius-")) return { family: "radius", name };
  if (name === "spacing" || name.startsWith("spacing-")) return { family: "spacing", name };
  if (name.startsWith("shadow-")) return { family: "shadow", name };
  if (name.startsWith("font-")) return { family: "font", name: name.slice("font-".length) };
  if (name.startsWith("text-") && !COLOUR_VALUE.test(value)) {
    const [style, part] = name.slice("text-".length).split("--");
    if (part === undefined) return { family: "text", name: style, field: "fontSize" };
    if (Object.hasOwn(TEXT_PARTS, part)) return { family: "text", name: style, field: TEXT_PARTS[part] };
    return null;
  }
  if (COLOUR_VALUE.test(value)) return { family: "color", name };
  for (const [hint, family] of LENGTH_HINTS) if (hint.test(name)) return { family, name };
  if (VAR_ONLY.test(value)) return { family: "color", name };
  return null;
}

const NAMED_COLOUR = /^[a-z]+$/i;

/**
 * The code's tokens. `files` is `[{ file, text }]`; `file` is how the unplaced list names it.
 * Answers `{ color: { themes, tokens }, type: { families, groups }, spacing, radius, shadow, unplaced }`.
 */
export function readTokens(files) {
  const themes = [];
  const unplaced = [];
  // name → { family, values: Map<theme, raw> | raw, at } in first-declaration order, per family.
  const placed = { color: new Map(), radius: new Map(), spacing: new Map(), shadow: new Map(), font: new Map(), text: new Map() };
  const declared = [];
  const drop = (entry, reason) => unplaced.push({ property: entry.property, value: entry.value, file: entry.file, line: entry.line, reason });

  for (const { file, text } of files) {
    for (const entry of declarations(text)) {
      const located = { ...entry, file };
      if (entry.property.includes("*")) { drop(located, "a namespace reset, which declares no token"); continue; }
      const family = familyOf(entry.property, entry.value);
      if (family == null) { drop(located, "it has no family the Design System reads"); continue; }
      const theme = themeOf(entry.context);
      if (theme == null) { drop(located, `it is declared under no theme: "${entry.context.join(" ") || "no rule"}" is not a theme selector`); continue; }
      if (family.family !== "color" && theme !== FIRST_THEME) { drop(located, `only colours carry themes, and it is declared for the theme "${theme}"`); continue; }
      if (!themes.includes(theme)) themes.push(theme);
      declared.push({ ...located, ...family, theme });
    }
  }

  // The colours that place: every one with a literal value, then every alias of one, to a fixed
  // point, so an alias may name a colour declared later in the file, or another alias.
  const literalColour = (value) => !/\bcolor-mix\(/i.test(value) && !/\bvar\(/i.test(value) && !NAMED_COLOUR.test(value);
  const colourNames = new Set(declared.filter((entry) => entry.family === "color" && literalColour(entry.value)).map((entry) => entry.name));
  for (let grew = true; grew;) {
    grew = false;
    for (const entry of declared) {
      const alias = entry.family === "color" ? VAR_ONLY.exec(entry.value) : null;
      if (alias && colourNames.has(alias[1]) && !colourNames.has(entry.name)) { colourNames.add(entry.name); grew = true; }
    }
  }
  for (const entry of declared) {
    const value = entry.value;
    if (/\bcolor-mix\(/i.test(value)) { drop(entry, "color-mix() is dropped by the Design System"); continue; }
    const alias = VAR_ONLY.exec(value);
    if (entry.family === "color") {
      if (alias) {
        if (!colourNames.has(alias[1])) { drop(entry, `var(--${alias[1]}) names no placed colour`); continue; }
      } else if (/\bvar\(/i.test(value)) {
        drop(entry, "a var() the Design System cannot read"); continue;
      } else if (NAMED_COLOUR.test(value)) {
        drop(entry, `the named colour "${value}" is dropped by the Design System`); continue;
      }
      const token = placed.color.get(entry.name) ?? { name: entry.name, values: new Map() };
      token.values.set(entry.theme, alias ? `{${alias[1]}}` : value);
      placed.color.set(entry.name, token);
      continue;
    }
    if (/\bvar\(/i.test(value)) {
      const sameFamily = alias && entry.family !== "text" && declared.some((other) => other.family === entry.family && other.property === `--${alias[1]}`);
      if (!sameFamily) { drop(entry, "a var() the Design System cannot read"); continue; }
    }
    const written = alias && entry.family !== "text" ? `{${alias[1]}}` : value;
    if (entry.family === "text") {
      const style = placed.text.get(entry.name) ?? { name: entry.name };
      style[entry.field] = written;
      placed.text.set(entry.name, style);
    } else {
      placed[entry.family].set(entry.name, { name: entry.name, value: written });
    }
  }

  const ordered = (values) => Object.fromEntries(themes.filter((theme) => values.has(theme)).map((theme) => [theme, values.get(theme)]));
  const list = (map) => [...map.values()].map((token) => ({ name: token.name, value: token.value, usage: "" }));
  const styles = [...placed.text.values()].map((style) => ({
    name: style.name,
    ...(style.fontSize !== undefined ? { fontSize: style.fontSize } : {}),
    ...(style.lineHeight !== undefined ? { lineHeight: style.lineHeight } : {}),
    ...(style.letterSpacing !== undefined ? { letterSpacing: style.letterSpacing } : {}),
    ...(style.fontWeight !== undefined ? { fontWeight: style.fontWeight } : {}),
    usage: "",
  }));
  const fileRank = new Map(files.map(({ file }, index) => [file, index]));
  unplaced.sort((a, b) => fileRank.get(a.file) - fileRank.get(b.file) || a.line - b.line);
  return {
    color: {
      themes: themes.map((id) => ({ id, name: titleCase(id) })),
      tokens: [...placed.color.values()].map((token) => ({ name: token.name, value: ordered(token.values), usage: "" })),
    },
    type: {
      // The type's shape: a map of family key to font stack (198 F-02), never a token list.
      families: Object.fromEntries(list(placed.font).map((token) => [token.name, token.value])),
      groups: styles.length > 0 ? [{ name: "Text", styles }] : [],
    },
    spacing: { tokens: list(placed.spacing) },
    radius: { tokens: list(placed.radius) },
    shadow: { tokens: list(placed.shadow) },
    unplaced,
  };
}

// ── colours as RGBA ────────────────────────────────────────────────────────────────────────────

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

function channel(text, scale) {
  const value = text.trim();
  if (value.endsWith("%")) return (Number.parseFloat(value) / 100) * scale;
  return Number.parseFloat(value);
}

function alphaOf(text) {
  if (text == null) return 1;
  const value = text.trim();
  return value.endsWith("%") ? Number.parseFloat(value) / 100 : Number.parseFloat(value);
}

// The arguments of an rgb()/hsl() call, in either the space or the comma syntax, with its alpha.
function argumentsOf(inner) {
  const [main, slashAlpha] = inner.split("/");
  const parts = main.includes(",") ? main.split(",") : main.trim().split(/\s+/);
  const alpha = slashAlpha ?? (parts.length === 4 ? parts.pop() : undefined);
  return { parts: parts.map((part) => part.trim()), alpha };
}

function hslToRgb(hue, saturation, lightness) {
  const h = (((hue % 360) + 360) % 360) / 360;
  const s = clamp(saturation, 0, 1);
  const l = clamp(lightness, 0, 1);
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const toChannel = (t) => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };
  return [toChannel(h + 1 / 3), toChannel(h), toChannel(h - 1 / 3)];
}

/**
 * A colour as one comparable RGBA key ("r,g,b,a", channels 0–255, alpha to 3 places), or null for
 * anything that is not a hex, rgb() or hsl() literal.
 */
export function rgbaKey(value) {
  const text = String(value).trim().toLowerCase();
  let rgb = null;
  let alpha = 1;
  const hex = /^#([0-9a-f]{3,8})$/.exec(text);
  if (hex && [3, 4, 6, 8].includes(hex[1].length)) {
    const digits = hex[1].length <= 4 ? [...hex[1]].map((digit) => digit + digit) : hex[1].match(/../g);
    rgb = digits.slice(0, 3).map((pair) => Number.parseInt(pair, 16));
    if (digits.length === 4) alpha = Number.parseInt(digits[3], 16) / 255;
  }
  const rgbCall = /^rgba?\(([^)]*)\)$/.exec(text);
  if (rgbCall) {
    const { parts, alpha: a } = argumentsOf(rgbCall[1]);
    if (parts.length !== 3) return null;
    rgb = parts.map((part) => channel(part, 255));
    alpha = alphaOf(a);
  }
  const hslCall = /^hsla?\(([^)]*)\)$/.exec(text);
  if (hslCall) {
    const { parts, alpha: a } = argumentsOf(hslCall[1]);
    if (parts.length !== 3) return null;
    const hue = Number.parseFloat(parts[0]);
    rgb = hslToRgb(hue, channel(parts[1], 1), channel(parts[2], 1)).map((unit) => unit * 255);
    alpha = alphaOf(a);
  }
  if (rgb == null || rgb.some((part) => !Number.isFinite(part)) || !Number.isFinite(alpha)) return null;
  return [...rgb.map((part) => Math.round(clamp(part, 0, 255))), Math.round(clamp(alpha, 0, 1) * 1000) / 1000].join(",");
}

// Every colour literal a mock's text paints: hex, rgb()/rgba() and hsl()/hsla(), as written.
const COLOUR_LITERAL = /(?<![\w&#-])#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\([^()]*\)/g;

export function colourLiterals(text) {
  return [...String(text).matchAll(COLOUR_LITERAL)].map((match) => match[0]).filter((literal) => rgbaKey(literal) != null);
}

/**
 * The colours the mocks paint that no code token holds. `mocks` is `[{ file, text }]`. Answers
 * `[{ value, files }]` in first-seen order: one entry per distinct RGBA colour, `value` as first
 * written, `files` every mock it appears in.
 */
export function mockOnly(tokens, mocks) {
  const code = new Set();
  for (const token of tokens?.color?.tokens ?? []) {
    for (const value of Object.values(token.value ?? {})) {
      const key = rgbaKey(value);
      if (key != null) code.add(key);
    }
  }
  const found = new Map();
  for (const { file, text } of mocks) {
    for (const literal of colourLiterals(text)) {
      const key = rgbaKey(literal);
      if (code.has(key)) continue;
      const entry = found.get(key) ?? { value: literal, files: [] };
      if (!entry.files.includes(file)) entry.files.push(file);
      found.set(key, entry);
    }
  }
  return [...found.values()];
}

// ── the re-sync ────────────────────────────────────────────────────────────────────────────────

// The single-value families, each with where its list lives on a token set.
const VALUE_FAMILIES = Object.freeze([
  ["spacing", (set) => set?.spacing?.tokens],
  ["radius", (set) => set?.radius?.tokens],
  ["shadow", (set) => set?.shadow?.tokens],
  // The type keeps families as a map of key to stack; the merge reads it as a list and writes it back.
  ["type.families", (set) => (isObject(set?.type?.families) ? Object.entries(set.type.families).map(([name, value]) => ({ name, value })) : undefined)],
]);
const STYLE_FIELDS = Object.freeze(["fontSize", "lineHeight", "letterSpacing", "fontWeight"]);
const isObject = (value) => value != null && typeof value === "object" && !Array.isArray(value);
const same = (a, b) => String(a).replace(/\s+/g, " ").trim() === String(b).replace(/\s+/g, " ").trim();

/**
 * Re-sync a system's tokens from the code's. `system` is a parsed tokens.json in the type's shape;
 * `code` is what `readTokens` answered. Answers `{ document, changed, added, removed, unplaced }`:
 * `changed` holds `{ family, name, theme | field, system, code }`, `added` `{ family, name, theme? }`
 * and `removed` `{ family, name, theme?, value, usage? }`. The system is never mutated.
 */
export function mergeTokens(system, code, { ref, paths } = {}) {
  const document = structuredClone(system);
  const changed = [];
  const added = [];
  const removed = [];

  // Colours: per theme. A bare string is the first theme's value, as `check` reads it.
  const firstTheme = document.color?.themes?.[0]?.id ?? code.color.themes[0]?.id ?? FIRST_THEME;
  if (code.color.tokens.length > 0 || document.color !== undefined) {
    document.color ??= {};
    document.color.themes ??= [];
    for (const theme of code.color.themes) {
      if (!document.color.themes.some((entry) => entry.id === theme.id)) document.color.themes.push({ ...theme });
    }
    const codeByName = new Map(code.color.tokens.map((token) => [token.name, token]));
    const kept = [];
    for (const token of document.color.tokens ?? []) {
      const theirs = codeByName.get(token.name);
      if (!theirs) {
        removed.push({ family: "color", name: token.name, value: token.value, ...(token.usage !== undefined ? { usage: token.usage } : {}) });
        continue;
      }
      const ours = isObject(token.value) ? token.value : { [firstTheme]: token.value };
      const next = {};
      let moved = false;
      for (const [theme, value] of Object.entries(ours)) {
        if (!(theme in theirs.value)) { removed.push({ family: "color", name: token.name, theme, value }); moved = true; continue; }
        if (same(value, theirs.value[theme])) next[theme] = value;
        else { next[theme] = theirs.value[theme]; changed.push({ family: "color", name: token.name, theme, system: value, code: theirs.value[theme] }); moved = true; }
      }
      for (const [theme, value] of Object.entries(theirs.value)) {
        if (theme in ours) continue;
        next[theme] = value;
        added.push({ family: "color", name: token.name, theme });
        moved = true;
      }
      kept.push(moved ? { ...token, value: next } : token);
    }
    const known = new Set(kept.map((token) => token.name).concat(removed.filter((entry) => entry.family === "color" && entry.theme === undefined).map((entry) => entry.name)));
    for (const token of code.color.tokens) {
      if (known.has(token.name)) continue;
      kept.push({ name: token.name, value: { ...token.value }, usage: "" });
      added.push({ family: "color", name: token.name });
    }
    document.color.tokens = kept;
  }

  // The single-value families.
  for (const [family, listOf] of VALUE_FAMILIES) {
    const theirs = listOf(code) ?? [];
    const ours = listOf(document);
    if (ours === undefined && theirs.length === 0) continue;
    const codeByName = new Map(theirs.map((token) => [token.name, token]));
    const kept = [];
    for (const token of ours ?? []) {
      const other = codeByName.get(token.name);
      if (!other) { removed.push({ family, name: token.name, value: token.value, ...(token.usage !== undefined ? { usage: token.usage } : {}) }); continue; }
      if (same(token.value, other.value)) kept.push(token);
      else { kept.push({ ...token, value: other.value }); changed.push({ family, name: token.name, system: token.value, code: other.value }); }
    }
    const known = new Set((ours ?? []).map((token) => token.name));
    for (const token of theirs) {
      if (known.has(token.name)) continue;
      kept.push({ name: token.name, value: token.value, usage: "" });
      added.push({ family, name: token.name });
    }
    if (family === "type.families") { document.type ??= {}; document.type.families = Object.fromEntries(kept.map((token) => [token.name, token.value])); }
    else document[family] = { ...(isObject(document[family]) ? document[family] : {}), tokens: kept };
  }

  // Type styles: per field, across the system's groups; a new style joins the code's group.
  const codeStyles = new Map(code.type.groups.flatMap((group) => group.styles.map((style) => [style.name, { group: group.name, style }])));
  if (codeStyles.size > 0 || document.type?.groups !== undefined) {
    document.type ??= {};
    const groups = (document.type.groups ?? []).map((group) => ({ ...group, styles: [] }));
    const known = new Set();
    (document.type.groups ?? []).forEach((group, index) => {
      for (const style of group.styles ?? []) {
        known.add(style.name);
        const other = codeStyles.get(style.name)?.style;
        if (!other) { removed.push({ family: "type.styles", name: style.name, value: style, ...(style.usage !== undefined ? { usage: style.usage } : {}) }); continue; }
        const next = { ...style };
        for (const field of STYLE_FIELDS) {
          if (style[field] === undefined && other[field] === undefined) continue;
          if (other[field] === undefined) { delete next[field]; removed.push({ family: "type.styles", name: style.name, field, value: style[field] }); continue; }
          if (style[field] === undefined) { next[field] = other[field]; added.push({ family: "type.styles", name: style.name, field }); continue; }
          if (!same(style[field], other[field])) { next[field] = other[field]; changed.push({ family: "type.styles", name: style.name, field, system: style[field], code: other[field] }); }
        }
        groups[index].styles.push(next);
      }
    });
    for (const [name, { group, style }] of codeStyles) {
      if (known.has(name)) continue;
      let home = groups.find((candidate) => candidate.name === group);
      if (!home) { home = { name: group, styles: [] }; groups.push(home); }
      home.styles.push({ ...style });
      added.push({ family: "type.styles", name });
    }
    document.type.groups = groups;
  }

  // The provenance: the ref and the paths are the code's; the rest of `meta` is the page's.
  if (ref !== undefined || paths !== undefined) {
    document.meta = isObject(document.meta) ? { ...document.meta } : {};
    document.meta.source = {
      ...(isObject(document.meta.source) ? document.meta.source : {}),
      ...(ref !== undefined ? { ref } : {}),
      ...(paths !== undefined ? { paths: [...paths] } : {}),
    };
  }
  return { document, changed, added, removed, unplaced: code.unplaced };
}
