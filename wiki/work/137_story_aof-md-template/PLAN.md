# 137 · AOF.md has a template like every other record doc — build plan

## Mechanism

The template is a plain file in the bundle's `milestone` template member — `bundle.json` declares
the member as a directory, so adding the file is the whole install change; regenerate the shipped
manifest with `node scripts/generate-bundle-manifest.mjs`.

One new leaf module, `src/work/digest-template.mjs`, owns the contract. It reads the shipped
template once through `readAssetText("bundle", "templates/milestone/AOF.md")` and parses it into
`{ keys: [{ name, optional }], sections: [...] }`: frontmatter keys line by line (`optional` = the
line carries `# OMIT`), sections from `^##\s+\S` exactly as `parseAof` splits them. It also owns the
one render: frontmatter in template order (drop an OMIT key whose value is absent; fill
`<schema-version>` / `<aof-version>` the way `stampVersion` in `insert-shared.mjs` does), the h1, the
template's top comment, then each template section whose recovered body is non-empty, in template
order. Keep it a leaf — node builtins and `asset-base.mjs` only — so `work.mjs` can import it
without a cycle.

In `materialize.mjs`, `renderDigest` becomes the single caller of that render; `digestFrontmatter`
and `renderColocatedDigest` are deleted, and `writeColocatedDigest` and `planMaterialize` both hand
their section bodies, keyed by template section name, to `renderDigest`. Keep today's empty-title
heading fallback (`# Imported milestone NN — Digest`).

In `work.mjs`, the existing `meta.doc === "digest"` branch gains the key and section checks from the
contract module. The branch sees only `meta` today; the headings need the doc text, so read it where
the record doc is already loaded rather than re-walking the tree.

Follow the OUTCOME precedent (`test/run/outcome-template-shared-home.test.mjs`) for task 00: the
real descriptor, the real bundle root, the real shipped manifest.

## Verification

- Focused lanes, isolated: `AOF_GLOBAL_HOME=$(mktemp -d) node scripts/test.mjs --only <the new and
  touched test files>` — never the full suite on this machine.
- `aof work validate` from the repo root stays green, including the archived 42 digest.
- End to end: `aof import` a milestone from a scratch copy of a legacy source whose milestone sits
  in a stream folder, then `aof work validate` there — the fresh AOF.md draws no finding (no stale
  schema, no key or section finding).
- Run `aof work update` here so `.aof/templates/work/milestone/AOF.md` lands (task 00's @manual).

## Out of scope

Deleting the superseded separate-store writer; changing the digest's headings or prose shape;
teaching the import's recovery to produce new halves.
