---
type: story
number: 137
slug: aof-md-template
title: "AOF.md has a template like every other record doc"
status: done
owner: product-owner
created: 2026-09-23
updated: 2026-09-23
schema: 1
aofVersion: 0.1.0
reads:
  - wiki/work/137_story_aof-md-template/PLAN.md
  - src/commands/import-milestone.mjs
  - src/commands/insert-shared.mjs
  - src/work/bundle.mjs
  - src/work/bundle-manifest.mjs
  - src/asset-base.mjs
  - src/memory/local-indexing.mjs
  - src/bundle/bundle.json
  - src/bundle/templates/milestone/SPEC.md
  - src/bundle/templates/shared/OUTCOME.md
  - test/run/outcome-template-shared-home.test.mjs
  - test/work/gate/work-validate-staleness.test.mjs
  - wiki/work/archive/42_milestone_structural-overhaul/AOF.md
files:
  - src/bundle/templates/milestone/AOF.md
  - src/bundle/manifest.json
  - src/work/digest-template.mjs
  - src/import/materialize.mjs
  - src/work.mjs
  - test/bundle/digest-template-ships.test.mjs
  - test/bundle/index.mjs
  - test/memory/import-digest-template.test.mjs
  - test/memory/import-digest.test.mjs
  - test/memory/index.mjs
  - test/arch/memory/acd-import-digest-recallable.test.mjs
  - test/work/gate/work-validate-digest-template.test.mjs
  - test/work/gate/work-validate.test.mjs
  - test/work/gate/index.mjs
  - .aof/templates/work/milestone/AOF.md
  - .aof/templates/work/milestone/ARCHITECTURE.md
  - .aof/templates/work/milestone/COMPLIANCE.md
  - .aof/templates/work/milestone/DESIGN.md
  - .aof/templates/work/milestone/RESEARCH.md
  - .aof/templates/work/milestone/SECURITY.md
  - .aof/templates/work/milestone/SPEC.md
  - .aof/templates/work/milestone/STATE.md
  - .aof/templates/work/milestone/UAT.md
  - .aof/templates/work/milestone/VERIFICATION.md
  - .aof/aof.lock.json
---
# 137 · AOF.md has a template like every other record doc

## User story

As an operator importing a foreign milestone (and the agents that later recall it),
I want `AOF.md` to be scaffolded from a shipped template (`.aof/templates/work/…/AOF.md`) with a
fixed frontmatter schema and a fixed set of `## ` sections, the way SPEC / STATE / STORY / OUTCOME are,
so that every imported digest has the same shape whichever LLM recovered it — validate can check it,
recall gets comparable `summary` records across imports, and the document's contract lives in one
reviewable file instead of being whatever the recovering model chose to write.

## Tasks

- [x] [00 · the digest template ships with the set](tasks/00_the-digest-template-ships-with-the-set.feature)
- [x] [01 · the import renders through the template](tasks/01_the-import-renders-through-the-template.feature)
- [x] [02 · validate holds a digest to the template](tasks/02_validate-holds-a-digest-to-the-template.feature)

## Notes

- Today the shape is implicit in code: `src/import/materialize.mjs` hand-builds the frontmatter
  (`digestFrontmatter`, `renderColocatedDigest` — two near-duplicate renderers) and the body is
  `Intent`/`Scope` (verbatim LLM-recovered prose) plus optional folded `Decisions`/`Lessons`.
  There is no template under `.aof/templates/work/` and no schema validate can hold it to.
- `AOF.md` legitimizes an imported milestone (validate resolves it as the record doc when present),
  so its frontmatter is identity — the template should pin it, not leave it to the renderer.
- Extend the existing surfaces (the template set + the renderer), don't add a sibling path; the
  import writes co-located into the source folder — that rule is unchanged.

### Decisions (refine, 2026-09-23)

- **Filed under `milestone`, not `shared`.** A digest is only valid as a milestone's record doc
  (validate already refuses `doc: digest` on any other type), so the member id names that scope.
  `DOCS_BY_TYPE` is explicit (`SPEC.md`, `STATE.md`), so no native scaffold picks it up.
- **The contract is read from the SHIPPED template**, not the project's installed copy: the import
  writes into a foreign folder and validate must not depend on whether `aof work update` has run,
  so the renderer and validate both parse `src/bundle/templates/milestone/AOF.md` through one module.
- **The template carries today's shape, not a new one.** Keys and order are what
  `renderColocatedDigest` writes now, plus `schema`/`aofVersion`; sections are Intent, Scope,
  Decisions, Lessons. `source` and `importedAt` carry a `# OMIT` annotation (the STORY template's
  `parent:` idiom): the renderer already omits them when absent, and older imports lack `source`.
- **Absent halves stay absent.** A section is emitted only when its half was recovered — a
  "not recoverable" section would index as a junk `summary` record (absence is information).
- **Fresh imports are born-stamped.** Measured: `renderColocatedDigest` writes no `schema:`, so a
  new digest in a stream validates as `schema 0 is behind`. The template's `<schema-version>` /
  `<aof-version>` placeholders fix it the way `stampVersion` does for native scaffolds.
- **Validate is closed on both axes** — a missing required key, an unknown key, and an unknown,
  duplicated or out-of-order `## ` section are errors. Every digest measured in the wild (this repo's
  archived 42; 24 in a downstream repo) is Intent/Scope with in-set keys, so none reds. The
  un-numbered `archive/.gsd-archive/AOF.md` is not a stream item and is never validated.
- **Out of scope:** the separate-store `materializeImport` path is superseded by the co-located rule
  and reached only by tests; it keeps working (through the one renderer) and is not deleted here.
