# 165/02 · The pinned planner is packaged for Cowork — example map

## R1 · Planner packages are built only from the pinned commit
- E1 · Tag `v2.0.0` resolves to `5042ff6169e0df49086c846f69bf7b6cdb67a6de`, and the clone's `HEAD` is that commit: packages are produced for pm-execution, pm-product-discovery and pm-product-strategy [proposed]
- E2 · The tag resolved to `5042ff61…`, but the clone's `HEAD` is `9f1c…` because the tag moved in between: refused, no package produced, and the message names both commits [proposed]
- E3 · The clone fails (offline, or GitHub refuses): refused, no package produced, and the message says the clone failed [proposed]
- E4 · The resolved ref is `main` rather than a 40-hex commit: refused before any clone [proposed]

## R2 · The recommended set, and never pm-ai-shipping
- E5 · `--with-optional`: pm-market-research is packaged as a fourth plugin [proposed]
- E6 · `--with-optional`: pm-ai-shipping is still not packaged, though the tag contains it [proposed]

## R3 · Every package can stand alone
- E7 · Each package holds the plugin folder's own `.claude-plugin/plugin.json`, its `skills/` and `commands/` as they are at the commit, and the repository's root `LICENSE` [proposed]
- E8 · A package holds nothing from a sibling plugin folder or from the repository root other than `LICENSE` [proposed]

## R4 · The clone leaves nothing behind
- E9 · Packaging succeeds: the temporary clone directory no longer exists afterwards [proposed]
- E10 · Packaging is refused for a moved tag: the temporary clone directory still no longer exists afterwards [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#adr-003 · Should the planner come from Cowork's own Add marketplace? No: it cannot pin a ref, and the SPEC forbids a floating ref.
- Q2 · technical · defaulted ARCHITECTURE.md#adr-003 · Where does the planner come from? A shallow HTTPS clone at the tag, checked against the resolved commit.
