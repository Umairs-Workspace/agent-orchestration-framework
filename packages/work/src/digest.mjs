// Digest parsing, rendering and validation over an explicitly supplied template contract.
const TEMPLATE_PATH = "templates/milestone/AOF.md";
const KEY_LINE_RE = /^([A-Za-z0-9_-]+):\s*(.*)$/;
const SECTION_RE = /^##\s+\S/;
// A frontmatter line's trailing `# …` comment, and the word in it that marks the key optional.
const COMMENT_RE = /\s+#.*$/;
const OMIT_RE = /\bOMIT\b/;

export function parseDigestTemplate(text) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  if (lines[0] !== "---") throw new Error(`the AOF.md template (${TEMPLATE_PATH}) opens on no frontmatter fence`);
  const close = lines.indexOf("---", 1);
  const keys = [];
  for (const line of lines.slice(1, close)) {
    const kv = line.match(KEY_LINE_RE);
    if (!kv) continue;
    const comment = kv[2].match(COMMENT_RE)?.[0] ?? "";
    keys.push({ name: kv[1], optional: OMIT_RE.test(comment), value: kv[2].replace(COMMENT_RE, "").trim() });
  }
  const body = lines.slice(close + 1);
  const firstSection = body.findIndex((line) => SECTION_RE.test(line));
  const preamble = firstSection === -1 ? body : body.slice(0, firstSection);
  const heading = preamble.find((line) => /^#\s/.test(line)) ?? "";
  const comment = preamble.filter((line) => line.trim().length > 0 && line !== heading).join("\n");
  const sections = body.filter((line) => SECTION_RE.test(line)).map(sectionName);
  return Object.freeze({
    keys: Object.freeze(keys.map((key) => Object.freeze(key))),
    requiredKeys: Object.freeze(keys.filter((key) => !key.optional).map((key) => key.name)),
    optionalKeys: Object.freeze(keys.filter((key) => key.optional).map((key) => key.name)),
    sections: Object.freeze(sections),
    heading,
    comment,
  });
}

function sectionName(line) {
  return line.replace(/^##\s+/, "").trim();
}

function stamp(text, schemaVersion, aofVersion) {
  return text.replace(/<schema-version>/g, String(schemaVersion)).replace(/<aof-version>/g, aofVersion);
}

const absent = (value) => value == null || value === "";

// Render one digest. `values` fills the frontmatter by key — a double-quoted template value is
// emitted quoted — and a key the caller does not fill takes the template's own value, stamped
// (`doc`, `imported`, `importedBy`, `schema`, `aofVersion`). An OMIT key the caller leaves absent is
// dropped. `sections` maps a template section name to its recovered body; a section whose body is
// empty is not emitted (absence is information — a "not recoverable" section would index as a junk
// `summary` record), and the template's order wins over the caller's.
export function renderDigestDocument({ milestoneRef, values = {}, sections = {} }, { schemaVersion, aofVersion, contract }) {
  const frontmatter = ["---"];
  for (const key of contract.keys) {
    const supplied = values[key.name];
    if (key.optional && absent(supplied)) continue;
    // A required key the caller filled with "" keeps it (`title: ""`, never the placeholder).
    if (supplied == null) {
      frontmatter.push(`${key.name}: ${stamp(key.value, schemaVersion, aofVersion)}`);
    } else {
      const quoted = key.value.startsWith('"');
      frontmatter.push(`${key.name}: ${quoted ? JSON.stringify(String(supplied)) : supplied}`);
    }
  }
  frontmatter.push("---");
  const title = values.title;
  const heading = absent(title)
    ? `# Imported milestone ${milestoneRef} — Digest`
    : contract.heading.replace(/\bNN\b/, () => milestoneRef).replace("<Milestone Title>", () => title);
  const lines = [...frontmatter, heading, "", contract.comment, ""];
  for (const name of contract.sections) {
    const body = sections[name];
    if (absent(body?.trim?.())) continue;
    lines.push(`## ${name}`, "", body.trim(), "");
  }
  return lines.join("\n");
}

// Hold a parsed digest to the template, closed on both axes: a missing required key, a key the
// template does not declare, and a `## ` section that is unknown, repeated or out of the
// template's order. An absent OMIT key is not a finding, and neither is an absent section.
export function digestFindings(meta, text, contract) {
  const problems = [];
  for (const name of contract.requiredKeys) {
    if (!Object.hasOwn(meta, name)) problems.push(`digest frontmatter is missing "${name}" (the AOF.md template requires it)`);
  }
  const declared = new Set(contract.keys.map((key) => key.name));
  for (const name of Object.keys(meta)) {
    if (!declared.has(name)) problems.push(`digest frontmatter key "${name}" is not in the AOF.md template`);
  }
  const order = contract.sections.join(", ");
  const seen = new Set();
  let last = -1;
  for (const line of String(text).split(/\r?\n/)) {
    if (!SECTION_RE.test(line)) continue;
    const name = sectionName(line);
    const at = contract.sections.indexOf(name);
    if (at === -1) {
      problems.push(`digest section "${name}" is not in the AOF.md template (${order})`);
    } else if (seen.has(name)) {
      problems.push(`digest section "${name}" appears more than once`);
    } else if (at < last) {
      problems.push(`digest section "${name}" is out of the AOF.md template's order (${order})`);
    } else {
      last = at;
    }
    seen.add(name);
  }
  return problems;
}
